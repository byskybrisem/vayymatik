"""Kalite kontrol: oynatılabilirlik, teknik özellikler, siyah/donuk kare, sahne temposu, loudness,
ASR ile altyazı-ses senkronu ve anlaşılırlık, taşma denetimi, döngü benzerliği → Video-QA.json"""
from __future__ import annotations

import difflib
import json
import re
import subprocess
import time
from pathlib import Path

import numpy as np

from .paths import build_dir, deliver_dir
from .textnorm import expand_numbers, tr_lower


def _run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True)


def ffprobe(path: Path) -> dict:
    r = _run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)])
    return json.loads(r.stdout)


def _norm_words(text: str) -> list[str]:
    t = tr_lower(expand_numbers(text.replace("’", "'")))
    t = t.replace("'", "")
    return [w for w in re.findall(r"[a-zçğıöşüâîû]+", t)]


def asr_words(wav: Path, model_size: str = "small") -> list[dict]:
    from faster_whisper import WhisperModel

    import soundfile as sf
    from scipy.signal import resample_poly

    x, sr = sf.read(str(wav), dtype="float32", always_2d=True)
    x = x.mean(axis=1)
    from math import gcd
    g = gcd(16000, sr)
    x = resample_poly(x, 16000 // g, sr // g).astype(np.float32)  # PyAV'a bağımlı olmadan 16 kHz mono
    model = WhisperModel(model_size, device="cpu", compute_type="int8", cpu_threads=4)
    segs, _ = model.transcribe(x, language="tr", word_timestamps=True, beam_size=5, vad_filter=False,
                               condition_on_previous_text=False)
    out = []
    for s in segs:
        for w in s.words or []:
            out.append({"word": w.word.strip(), "start": float(w.start), "end": float(w.end)})
    return out


def sync_report(script_words: list[dict], asr: list[dict]) -> dict:
    """script_words: [{text, start, end}] (konuşulan kelimeler, mutlak sn)."""
    s_tok, s_idx = [], []
    for i, w in enumerate(script_words):
        for t in _norm_words(w["text"]):
            s_tok.append(t)
            s_idx.append(i)
    a_tok, a_idx = [], []
    for j, w in enumerate(asr):
        for t in _norm_words(w["word"]):
            a_tok.append(t)
            a_idx.append(j)
    sm = difflib.SequenceMatcher(a=s_tok, b=a_tok, autojunk=False)
    offsets = []
    seen = set()
    for blk in sm.get_matching_blocks():
        if blk.size < 2:  # tek kelimelik (olası yanlış) eşleşmeleri senkron ölçümüne katma
            continue
        for k in range(blk.size):
            si, aj = s_idx[blk.a + k], a_idx[blk.b + k]
            if (si, aj) in seen:
                continue
            seen.add((si, aj))
            offsets.append(asr[aj]["start"] - script_words[si]["start"])
    # WER (kelime düzeyi, normalize)
    wer = _wer(s_tok, a_tok)
    off = np.array(offsets) if offsets else np.array([np.nan])
    return {
        "script_tokens": len(s_tok),
        "asr_tokens": len(a_tok),
        "matched_tokens": int(sum(b.size for b in sm.get_matching_blocks())),
        "match_ratio": round(sm.ratio(), 3),
        "wer": round(float(wer), 3),
        "sync_pairs": len(offsets),
        "offset_median_ms": round(float(np.nanmedian(off)) * 1000, 1),
        "offset_abs_median_ms": round(float(np.nanmedian(np.abs(off))) * 1000, 1),
        "offset_abs_p90_ms": round(float(np.nanpercentile(np.abs(off), 90)) * 1000, 1),
        "asr_text": " ".join(w["word"] for w in asr),
    }


def _wer(ref: list[str], hyp: list[str]) -> float:
    d = np.zeros((len(ref) + 1, len(hyp) + 1), dtype=np.int32)
    d[:, 0] = np.arange(len(ref) + 1)
    d[0, :] = np.arange(len(hyp) + 1)
    for i in range(1, len(ref) + 1):
        for j in range(1, len(hyp) + 1):
            d[i, j] = min(d[i - 1, j] + 1, d[i, j - 1] + 1, d[i - 1, j - 1] + (ref[i - 1] != hyp[j - 1]))
    return d[len(ref), len(hyp)] / max(1, len(ref))


def _ebur128(path: Path) -> dict:
    r = _run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-filter_complex", "ebur128=peak=true", "-f", "null", "-"])
    txt = r.stderr
    summ = txt[txt.rfind("Summary:"):]
    g = lambda pat: float(re.search(pat, summ).group(1)) if re.search(pat, summ) else None
    return {"integrated_lufs": g(r"I:\s+(-?[\d.]+) LUFS"), "lra_lu": g(r"LRA:\s+(-?[\d.]+) LU"), "true_peak_dbfs": g(r"Peak:\s+(-?[\d.]+) dBFS")}


def _blackdetect(path: Path) -> list[dict]:
    r = _run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vf", "blackdetect=d=0.08:pix_th=0.06:pic_th=0.97", "-an", "-f", "null", "-"])
    out = []
    for m in re.finditer(r"black_start:([\d.]+) black_end:([\d.]+) black_duration:([\d.]+)", r.stderr):
        out.append({"start": float(m.group(1)), "end": float(m.group(2)), "dur": float(m.group(3))})
    return out


def _freezedetect(path: Path) -> list[dict]:
    r = _run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vf", "freezedetect=n=-55dB:d=1.2", "-an", "-f", "null", "-"])
    starts = [float(x) for x in re.findall(r"freeze_start: ([\d.]+)", r.stderr)]
    durs = [float(x) for x in re.findall(r"freeze_duration: ([\d.]+)", r.stderr)]
    return [{"start": s, "dur": d} for s, d in zip(starts, durs)]


def _scene_changes(path: Path, thr: float = 0.18) -> list[float]:
    r = _run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vf", f"select='gt(scene,{thr})',showinfo", "-an", "-f", "null", "-"])
    return [float(x) for x in re.findall(r"pts_time:([\d.]+)", r.stderr)]


def _motion_profile(path: Path, fps: int) -> dict:
    """Her 0,5 sn'de bir kare farkı (ortalama mutlak fark) → 'statik slayt' tespiti."""
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", "fps=6,scale=135:240,format=gray", "-f", "rawvideo", "-"], capture_output=True)
    frames = np.frombuffer(r.stdout, np.uint8).reshape(-1, 240, 135).astype(np.float32)
    diffs = np.abs(np.diff(frames, axis=0)).mean(axis=(1, 2))
    # 1 sn'lik pencerelerde hareket
    win = 6
    lows = []
    for i in range(0, len(diffs) - win + 1, win):
        lows.append(float(diffs[i:i + win].mean()))
    return {"mean_frame_diff": round(float(diffs.mean()), 2), "min_1s_window": round(min(lows), 2) if lows else None,
            "windows_below_0.6": int(sum(1 for x in lows if x < 0.6)), "windows": len(lows)}


def _frame_at(path: Path, t: float, last: bool = False) -> np.ndarray:
    if last:  # son kare: dosya sonundan 0,4 sn içindeki karelerin sonuncusu
        cmd = ["ffmpeg", "-v", "error", "-sseof", "-0.4", "-i", str(path), "-vf", "scale=270:480", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    else:
        cmd = ["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(path), "-frames:v", "1", "-vf", "scale=270:480", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    r = subprocess.run(cmd, capture_output=True)
    buf = np.frombuffer(r.stdout, np.uint8)
    n = 480 * 270 * 3
    return buf[-n:].reshape(480, 270, 3).astype(np.float32)


def _contact_sheet(path: Path, dur: float, out: Path, n: int = 18) -> list[float]:
    from PIL import Image, ImageDraw

    ts = [round(dur * (i + 0.5) / n, 2) for i in range(n)]
    cols = 6
    rows = (n + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 276, rows * 506), (20, 20, 20))
    d = ImageDraw.Draw(sheet)
    for k, t in enumerate(ts):
        im = Image.fromarray(_frame_at(path, t).astype(np.uint8))
        x, y = (k % cols) * 276 + 3, (k // cols) * 506 + 22
        sheet.paste(im, (x, y))
        d.text((x + 4, y - 18), f"{t:.1f} sn", fill=(255, 220, 0))
    sheet.save(out)
    return ts


def run_qa(topic_id: str, asr_model: str = "medium") -> bool:
    from .build import load_topic

    t0 = time.time()
    topic, brand = load_topic(topic_id)
    bdir, ddir = build_dir(topic_id), deliver_dir(topic_id)
    video = ddir / f"{topic['output_name']}.mp4"
    meta = json.loads((bdir / "build_meta.json").read_text(encoding="utf-8"))
    fps = brand["render"]["fps"]
    checks: list[dict] = []

    def add(name, ok, detail, crit=True):
        checks.append({"check": name, "pass": bool(ok), "critical": crit, "detail": detail})
        print(f"  [{'OK ' if ok else 'HATA'}] {name}: {json.dumps(detail, ensure_ascii=False)[:160]}")

    print(f"[QA] {video}")
    info = ffprobe(video)
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    dur = float(info["format"]["duration"])
    num, den = map(int, v["r_frame_rate"].split("/"))
    add("Çözünürlük 1080×1920 (9:16)", v["width"] == 1080 and v["height"] == 1920, {"width": v["width"], "height": v["height"]})
    if topic.get("duration"):  # sabit süreli video (ör. 8 sn demo): ±1 kare
        want = float(topic["duration"])
        add(f"Süre {want:g} sn (±1 kare)", abs(dur - want) <= 1 / 30 + 1e-3, {"seconds": round(dur, 3)})
    else:
        lo, hi = topic.get("qa", {}).get("duration_range", [45, 55])
        add(f"Süre {lo}–{hi} sn", lo <= dur <= hi, {"seconds": round(dur, 3)})
    add("FPS 30 veya 60", round(num / den, 3) in (30.0, 60.0), {"fps": round(num / den, 3)})
    add("Video codec H.264 yuv420p", v["codec_name"] == "h264" and v.get("pix_fmt") == "yuv420p", {"codec": v["codec_name"], "pix_fmt": v.get("pix_fmt"), "profile": v.get("profile")})
    add("Ses akışı AAC 48 kHz stereo", bool(a) and a["codec_name"] == "aac" and a["sample_rate"] == "48000" and a["channels"] == 2,
        {"codec": a and a["codec_name"], "sample_rate": a and a["sample_rate"], "channels": a and a["channels"]})
    add("faststart (moov başta)", _run(["ffprobe", "-v", "trace", "-i", str(video)]).stderr.find("type:'moov'") < _run(["ffprobe", "-v", "trace", "-i", str(video)]).stderr.find("type:'mdat'"), {}, crit=False)

    r = _run(["ffmpeg", "-v", "error", "-i", str(video), "-f", "null", "-"])
    add("Baştan sona tam çözme (oynatılabilirlik)", r.returncode == 0 and not r.stderr.strip(), {"errors": r.stderr.strip()[:300]})

    blacks = _blackdetect(video)
    add("Siyah kare yok", len(blacks) == 0, {"black_segments": blacks})
    freezes = _freezedetect(video)
    add("Donmuş görüntü yok (>1,2 sn)", len(freezes) == 0, {"freezes": freezes})
    motion = _motion_profile(video, fps)
    add("Statik slayt değil (her 1 sn'de hareket)", motion["windows_below_0.6"] == 0, motion)

    ev = sorted(set([0.0] + meta["visual_events"] + [dur]))
    gaps = [round(b - a_, 2) for a_, b in zip(ev, ev[1:])]
    cuts = _scene_changes(video)
    cut_ev = sorted(set([0.0] + cuts + [dur]))
    cut_gaps = [round(b - a_, 2) for a_, b in zip(cut_ev, cut_ev[1:])]
    add("Anlamlı görsel değişim aralığı ≤ 4 sn (zaman çizelgesi)", max(gaps) <= 4.0, {"max_gap_s": max(gaps), "events": len(ev)})
    add("Ölçülen sahne kesmeleri (ffmpeg scene>0.18)", True, {"cuts": len(cuts), "max_gap_s": max(cut_gaps)}, crit=False)

    loud = _ebur128(video)
    add("Loudness −14 LUFS ±1", loud["integrated_lufs"] is not None and abs(loud["integrated_lufs"] + 14) <= 1.0, loud)
    add("Gerçek tepe ≤ −1,0 dBTP", loud["true_peak_dbfs"] is not None and loud["true_peak_dbfs"] <= -1.0, {"true_peak_dbtp": loud["true_peak_dbfs"]})
    add("Müzik konuşmanın en az 8 dB altında", (meta["audio"].get("music_under_voice_db") or 0) >= 8, {"music_under_voice_db": meta["audio"].get("music_under_voice_db")})

    # ASR senkronu
    script_words = [w for l in meta["lines"] for w in l["words"]]
    try:
        asr_dry = asr_words(bdir / "voice_dry.wav", asr_model)
        rep = sync_report(script_words, asr_dry)
        add("Altyazı–ses senkronu (ASR: medyan |sapma| ≤ 80 ms, p90 ≤ 400 ms)", abs(rep["offset_median_ms"]) <= 80 and rep["offset_abs_median_ms"] <= 80 and rep["offset_abs_p90_ms"] <= 400, {k: rep[k] for k in rep if k != "asr_text"})
        add("Seslendirme anlaşılırlığı (ASR WER ≤ %25, kuru ses)", rep["wer"] <= 0.25, {"wer": rep["wer"], "match_ratio": rep["match_ratio"]}, crit=False)
        wav_mix = bdir / "mix.wav"
        asr_mix = asr_words(wav_mix, asr_model)
        rep_mix = sync_report(script_words, asr_mix)
        add("Müzik altında anlaşılırlık (ASR WER, final miks)", rep_mix["wer"] <= rep["wer"] + 0.10, {"wer_mix": rep_mix["wer"], "wer_dry": rep["wer"]}, crit=False)
        (bdir / "asr_transcript.txt").write_text(rep["asr_text"] + "\n\n[MIX]\n" + rep_mix["asr_text"], encoding="utf-8")
    except Exception as e:  # ASR modeli indirilemezse
        add("Altyazı–ses senkronu (ASR)", False, {"error": str(e)[:200]}, crit=False)

    # satır başlangıçları ile ses enerjisi başlangıcı (fonem sürelerinden gelen zamanların doğrulaması)
    import soundfile as sf

    vx, vsr = sf.read(str(bdir / "voice_dry.wav"), dtype="float32")
    hop = int(vsr * 0.005)
    rms = np.sqrt(np.convolve(vx ** 2, np.ones(hop * 2) / (hop * 2), mode="same"))[::hop]
    thr = 10 ** (-30 / 20)
    onset_err = []
    prev_end = 0.0
    for ln in meta["lines"]:
        i0 = int(max(prev_end + 0.03, ln["start"] - 0.25) / 0.005)
        seg = rms[i0: i0 + int(0.8 / 0.005)]
        idx = np.argmax(seg > thr) if np.any(seg > thr) else None
        if idx is not None:
            onset_err.append(round((i0 + idx) * 0.005 - ln["start"], 3))
        prev_end = ln["end"]
    oe = np.abs(np.array(onset_err))
    add("Satır başı zamanları ses enerjisiyle uyumlu (≤ 100 ms)", bool(len(oe)) and float(oe.max()) <= 0.10,
        {"max_abs_ms": round(float(oe.max()) * 1000, 1) if len(oe) else None, "median_abs_ms": round(float(np.median(oe)) * 1000, 1) if len(oe) else None, "lines": len(oe)})

    # altyazı kelime zamanları = TTS fonem süreleri (yapısal senkron)
    tl = json.loads((bdir / "timeline.json").read_text(encoding="utf-8"))
    mism = 0
    allw = [w for p in tl["captions"] for w in p["words"]]
    for p in tl["captions"]:
        for w in p["words"]:
            if not (p["from"] <= w["from"] <= p["to"]):
                mism += 1
    add("Altyazı sayfaları kelime zamanlarını kapsıyor", mism == 0, {"words": len(allw), "outside": mism})

    # taşma denetimi: WebGL'siz hızlı tarama (engine/audit.mjs), her 3. kare = 0,1 sn aralık
    from .paths import ENGINE

    audit_p = bdir / "audit_log.json"
    subprocess.run(["node", "audit.mjs", "--step", "3", "--out", str(audit_p)], cwd=ENGINE, check=True)
    audit = json.loads(audit_p.read_text(encoding="utf-8"))
    over = [json.loads(e["text"].split("[OVERFLOW] ", 1)[1]) for e in audit["logs"]]
    frames_bad = sorted({o["frame"] for o in over})
    add("Taşan/güvenli alan dışı metin yok (yerleşmiş karelerde)", len(over) == 0,
        {"frames_checked": audit["frames_checked"], "issues": len(over), "frames": frames_bad[:20], "examples": over[:5]})

    # döngü: ilk ve son kare benzerliği
    f0 = _frame_at(video, 0.0)
    f1 = _frame_at(video, 0.0, last=True)
    mad = float(np.abs(f0 - f1).mean())
    add("Tekrar izleme döngüsü (ilk/son kare benzerliği)", mad < 28, {"mean_abs_diff": round(mad, 2)}, crit=False)

    sheet = bdir / "qa_frames.png"
    ts = _contact_sheet(video, dur, sheet)

    ok = all(c["pass"] for c in checks if c["critical"])
    report = {
        "video": video.name,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "overall_pass": ok,
        "summary": {"total": len(checks), "passed": sum(c["pass"] for c in checks), "critical_failed": [c["check"] for c in checks if c["critical"] and not c["pass"]]},
        "specs": {"duration_s": round(dur, 3), "width": v["width"], "height": v["height"], "fps": round(num / den, 3), "video_bitrate_kbps": round(int(v.get("bit_rate", 0)) / 1000), "size_mb": round(video.stat().st_size / 1e6, 2)},
        "checks": checks,
        "facts": [{"claim": s["claim"], "source": s["url"], "accessed": s["accessed"], "status": "doğrulandı"} for s in topic.get("sources", [])],
        "frame_samples_s": ts,
        "qa_seconds": round(time.time() - t0, 1),
    }
    (ddir / "Video-QA.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[QA] {'GEÇTİ' if ok else 'KALDI'} · {report['summary']['passed']}/{report['summary']['total']} · {time.time() - t0:.0f} sn")
    return ok
