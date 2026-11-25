"""Harici (ör. ElevenLabs) seslendirme: tek uzun kayıt + kelime zamanları -> satır başına WAV + words JSON.

topics/<konu>/voice/source.json: {file, tempo, segments:[{id,start,end,words:[[kelime,bas,son],…]}]}
Çıktı: topics/<konu>/voice/lines/<id>.wav + <id>.json (sözcük başına zaman, konuşulan-kelime sayısına eşlenmiş).
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf

from .markup import parse_line
from .paths import TOPICS


def _map_words(src_words: list[list], spoken: list[str], t0: float) -> list[dict]:
    """Kaynak kelime zamanlarını konuşulan kelime sayısına eşler (sayı farkında karakter oranıyla böler)."""
    if len(src_words) == len(spoken):
        return [{"text": w, "start": round(s - t0, 4), "end": round(e - t0, 4)} for w, (_, s, e) in zip(spoken, src_words)]
    a, b = src_words[0][1], src_words[-1][2]
    lens = np.array([max(1, len(w)) for w in spoken], dtype=float)
    cum = np.concatenate([[0], np.cumsum(lens)]) / lens.sum()
    return [{"text": w, "start": round(a + cum[i] * (b - a) - t0, 4), "end": round(a + cum[i + 1] * (b - a) - t0, 4)} for i, w in enumerate(spoken)]


def split_external(topic: dict) -> Path:
    vdir = TOPICS / topic["id"] / "voice"
    out = vdir / "lines"
    out.mkdir(parents=True, exist_ok=True)
    src = json.loads((vdir / "source.json").read_text(encoding="utf-8"))
    tempo = float(src.get("tempo", 1.0))
    tmp = out / "_full.wav"
    af = f"atempo={tempo}" if tempo != 1.0 else "anull"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(vdir / src["file"]), "-af", af, "-ar", "48000", "-ac", "1", str(tmp)], check=True)
    audio, sr = sf.read(tmp, dtype="float32")
    dur = len(audio) / sr
    segs = src["segments"]
    by_id = {l["id"]: l for l in topic["lines"]}
    for i, sg in enumerate(segs):
        sc = lambda x: x / tempo
        s, e = sc(sg["start"]), sc(sg["end"])
        prev_e = sc(segs[i - 1]["end"]) if i else 0.0
        nxt_s = sc(segs[i + 1]["start"]) if i + 1 < len(segs) else dur
        c0 = max(0.0, max(prev_e + (s - prev_e) * 0.5, s - 0.14))
        c1 = min(dur, min(e + 0.28, e + (nxt_s - e) * 0.5))
        seg = audio[int(c0 * sr): int(c1 * sr)].copy()
        fi, fo = int(0.012 * sr), int(0.03 * sr)
        seg[:fi] *= np.linspace(0, 1, fi)
        seg[-fo:] *= np.linspace(1, 0, fo)
        parsed = parse_line(by_id[sg["id"]]["text"])
        sw = [[w, sc(a), sc(b)] for w, a, b in sg["words"]]
        words = _map_words(sw, parsed.spoken, c0)
        sf.write(out / f"{sg['id']}.wav", seg, sr, subtype="FLOAT")
        (out / f"{sg['id']}.json").write_text(json.dumps({"words": words}, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.unlink(missing_ok=True)
    return out
