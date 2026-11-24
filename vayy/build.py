"""Tek komutla Shorts üretimi: konu JSON → ses → zaman çizelgesi → müzik/SFX → miks → render → mux → QA → teslim."""
from __future__ import annotations

import copy
import json
import shutil
import subprocess
import time
from pathlib import Path

import numpy as np
import soundfile as sf

from . import captions as cap
from .assets import ensure_public
from .audio import mix as mixmod
from .audio.music import compose
from .audio.sfx import render_sfx
from .geo import make_mask
from .paths import BRAND, ENGINE, ENGINE_PUBLIC, TOPICS, build_dir, deliver_dir
from .timeline import Resolver, build_scenes, visual_events, _convert
from .voice import SR_OUT, layout, render_voice_track, synth_lines


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def load_topic(topic_id: str) -> tuple[dict, dict]:
    topic = json.loads((TOPICS / topic_id / "topic.json").read_text(encoding="utf-8"))
    brand = json.loads((BRAND / "brand.json").read_text(encoding="utf-8"))
    v = dict(brand["voice"])
    v.update(topic.get("voice", {}))
    topic["voice"] = v
    return topic, brand


def _subst_detail(obj, topic):
    if isinstance(obj, dict):
        return {k: _subst_detail(v, topic) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_subst_detail(v, topic) for v in obj]
    if isinstance(obj, str) and obj.startswith("$detail."):
        return topic["detail_textures"][obj.split(".", 1)[1]]
    return obj


def _abs_durations(obj, res: Resolver, scene_start: float):
    """'dur': '@ref' -> saniye cinsinden süre (aynı sözlükteki 'from'a göre)."""
    if isinstance(obj, dict):
        if isinstance(obj.get("dur"), str) and obj["dur"].startswith("@"):
            fr = obj.get("from", 0)
            a = res.abs(fr) if isinstance(fr, str) else scene_start + float(fr)
            obj["dur"] = res.abs(obj["dur"]) - a
        for v in obj.values():
            _abs_durations(v, res, scene_start)
    elif isinstance(obj, list):
        for v in obj:
            _abs_durations(v, res, scene_start)


def _inject_words(scenes_src: list[dict], lines_by_id: dict, res: Resolver):
    for s in scenes_src:
        for t in s.get("props", {}).get("titles", []):
            lid = t.pop("wordsFromLine", None)
            if not lid:
                continue
            la = lines_by_id[lid]
            words = []
            for dw in la.parsed.display:
                w0 = la.words[dw.spoken[0]]
                words.append({"text": dw.text, "at": la.start + w0["start"] - 0.06, "style": dw.style})
            t["text"] = la.parsed.plain_text
            t["words"] = words  # mutlak saniye; aşağıda karelere çevrilir


def build(topic_id: str, render: bool = True, stills: list[int] | None = None, concurrency: int = 4, crf: int | None = None) -> dict:
    t_start = time.time()
    topic, brand = load_topic(topic_id)
    fps = brand["render"]["fps"]
    W, H = brand["render"]["width"], brand["render"]["height"]
    bdir = build_dir(topic_id)
    ddir = deliver_dir(topic_id)

    # 1) Seslendirme
    log("1/8 Seslendirme (Piper, fonem süreli)")
    lines = synth_lines(topic, bdir / "voice", log=log)
    speech_end = layout(lines, topic["voice"].get("lead_in", 0.25))
    total = round(speech_end + topic["voice"].get("tail", 0.8), 3)
    total = round(np.ceil(total * fps) / fps, 4)
    res = Resolver(lines, total)
    lines_by_id = {l.id: l for l in lines}
    log(f"    süre: {total:.2f} sn ({len(lines)} satır)")

    # 2) Zaman çizelgesi
    log("2/8 Zaman çizelgesi ve altyazılar")
    scenes_src = _subst_detail(copy.deepcopy(topic["scenes"]), topic)
    _inject_words(scenes_src, lines_by_id, res)
    for s in scenes_src:
        st = res.abs(s["start"])
        _abs_durations(s.get("props", {}), res, st)
        # words[].at mutlak saniye -> sahneye göre kare
        for t in s.get("props", {}).get("titles", []):
            if "words" in t:
                for w in t["words"]:
                    w["at"] = w["at"] - st  # saniye (sahneye göre); _convert kareye çevirir
    scenes = build_scenes({"scenes": scenes_src}, res, fps)
    cap_lines = [l for l, src in zip(lines, topic["lines"]) if src.get("captions", True)]
    pages = cap.pages(cap.display_words(cap_lines))
    cap_json = cap.caption_pages_json(pages, fps)
    disclaimers = [{"text": d["text"], "from": int(round(res.abs(d["start"]) * fps)), "to": int(round(res.abs(d["end"]) * fps))} for d in topic.get("disclaimers", [])]
    timeline = {
        "topic": topic_id,
        "fps": fps,
        "width": W,
        "height": H,
        "durationInFrames": int(round(total * fps)),
        "brand": {k: brand[k] for k in ("name", "colors", "safe", "captions", "watermark")},
        "audioSrc": "current/mix.wav",
        "scenes": scenes,
        "captions": cap_json,
        "disclaimer": disclaimers,
        "foreignWords": topic.get("foreign_words", []),
    }

    # 3) Müzik
    log("3/8 Müzik (prosedürel, özgün)")
    m = topic["music"]
    sections = {k: res.abs(v) for k, v in m["sections"].items()}
    hits = [(res.abs(h["at"]), h["kind"]) for h in m.get("hits", [])]
    risers = [(res.abs(r["to"]), r["dur"]) for r in m.get("risers", [])]
    music = compose(total, sections, hits, risers, bpm=m.get("bpm", 120), seed=m.get("seed", 7))

    # 4) Efektler
    log("4/8 Ses efektleri")
    events = []
    for e in topic.get("sfx", []):
        e = dict(e)
        e["t"] = res.abs(e.pop("at"))
        events.append(e)
    sfx = render_sfx(events, total)

    # 5) Miks
    log("5/8 Miks + loudness")
    voice = render_voice_track(lines, total)
    mixed, astats = mixmod.master(voice, music, sfx, brand.get("mix"))
    sf.write(bdir / "mix.wav", mixed, SR_OUT, subtype="PCM_24")
    sf.write(bdir / "voice_dry.wav", voice, SR_OUT, subtype="PCM_24")
    sf.write(bdir / "music.wav", music, SR_OUT, subtype="PCM_16")
    log(f"    {astats}")

    # 6) Motor girdileri
    log("6/8 Motor girdileri (engine/public/current)")
    ensure_public()
    cur = ENGINE_PUBLIC / "current"
    if cur.exists():
        shutil.rmtree(cur)
    cur.mkdir(parents=True)
    geo = topic.get("geo", {})
    make_mask(cur / "geo_mask.png", geo.get("highlight_a"), geo.get("highlight_b"))
    shutil.copy2(bdir / "mix.wav", cur / "mix.wav")
    (cur / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False), encoding="utf-8")
    (bdir / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1), encoding="utf-8")
    meta = {
        "total": total,
        "lines": [{"id": l.id, "start": l.speech_start, "end": l.speech_end, "text": l.parsed.plain_text, "tts": l.parsed.tts_text, "words": [{"text": w["text"], "start": round(l.start + w["start"], 3), "end": round(l.start + w["end"], 3)} for w in l.words]} for l in lines],
        "visual_events": visual_events(scenes, fps),
        "audio": astats,
        "sfx_events": [{"type": e["type"], "t": round(e["t"], 3)} for e in events],
        "sections": sections,
    }
    (bdir / "build_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")

    # Altyazı/metin teslimleri (render'dan bağımsız)
    (ddir / "Subtitles.srt").write_text(cap.srt(lines), encoding="utf-8")

    out = {"total": total, "build": str(bdir), "deliver": str(ddir), "audio": astats}
    if stills:
        log(f"   kareler: {stills}")
        subprocess.run(["node", "still.mjs", "--frames", ",".join(map(str, stills)), "--dir", str(bdir / "stills"), "--scale", "0.5"], cwd=ENGINE, check=True)
    if not render:
        log(f"Bitti (render atlandı) · {time.time() - t_start:.0f} sn")
        return out

    # 7) Render
    log("7/8 Render (Remotion + WebGL)")
    raw = bdir / "video_noaudio.mp4"
    cmd = ["node", "render.mjs", "--out", str(raw), "--concurrency", str(concurrency), "--crf", str(crf or brand["render"]["crf"]), "--preset", brand["render"].get("preset", "slow"), "--log", str(bdir / "render_log.json")]
    subprocess.run(cmd, cwd=ENGINE, check=True)

    # 8) Mux
    out["video"] = str(mux(topic_id))
    log(f"Video: {out['video']} · toplam {time.time() - t_start:.0f} sn")
    return out


def mux(topic_id: str) -> Path:
    """Görüntü akışını kopyalayarak sesi ekler (ses değişince yalnızca bu adım tekrarlanır)."""
    topic, _ = load_topic(topic_id)
    bdir, ddir = build_dir(topic_id), deliver_dir(topic_id)
    raw = bdir / "video_noaudio.mp4"
    log("8/8 Mux (AAC 320k, faststart)")
    final = ddir / f"{topic['output_name']}.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-v", "error", "-i", str(raw), "-i", str(bdir / "mix.wav"),
        "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-ar", "48000",
        "-shortest", "-movflags", "+faststart", "-metadata", "title=" + topic["metadata"]["title"],
        "-metadata", "artist=VAYYMATİK", str(final),
    ], check=True)
    return final
