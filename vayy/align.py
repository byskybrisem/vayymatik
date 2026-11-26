"""Harici ses (ör. ElevenLabs) için kelime hizalama ve satırlara bölme.

Bir parça (birkaç satırlık tek kayıt) faster-whisper ile kelime zamanlı yazıya dökülür,
beklenen (konuşulan) kelimelerle dinamik programlama ile eşlenir; satırlar konuşma
aralarındaki en sessiz noktadan kesilir. Çıktı: <satır>.wav (48 kHz mono) + <satır>.json
(kelime zamanları, satır dosyasının başına göre). vayy.voice bu dosyaları doğrudan kullanır.
"""
from __future__ import annotations

import json
import re
import subprocess
import tempfile
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 48000
_TR = str.maketrans({"ı": "i", "İ": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g", "ü": "u", "Ü": "u",
                     "ö": "o", "Ö": "o", "ç": "c", "Ç": "c", "â": "a", "Â": "a", "î": "i", "û": "u"})


def norm(w: str) -> str:
    return re.sub(r"[^a-z0-9]", "", w.translate(_TR).lower())


def load_audio(path: Path, sr: int = SR) -> np.ndarray:
    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / "x.wav"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), str(wav)], check=True)
        x, _ = sf.read(wav, dtype="float32")
    return x


_MODEL = {}


def transcribe(x48: np.ndarray, prompt: str | None = None, model_size: str = "medium") -> list[dict]:
    from faster_whisper import WhisperModel
    from scipy.signal import resample_poly

    x = resample_poly(x48, 1, 3).astype(np.float32)  # 48k → 16k
    if model_size not in _MODEL:
        _MODEL[model_size] = WhisperModel(model_size, device="cpu", compute_type="int8", cpu_threads=4)
    segs, _ = _MODEL[model_size].transcribe(x, language="tr", word_timestamps=True, beam_size=5, vad_filter=False,
                                            condition_on_previous_text=False, initial_prompt=prompt)
    out = []
    for s in segs:
        for w in s.words or []:
            if norm(w.word):
                out.append({"w": w.word.strip(), "start": float(w.start), "end": float(w.end)})
    return out


def align(expected: list[str], asr: list[dict]) -> list[tuple[float, float] | None]:
    """Needleman–Wunsch: beklenen kelime ↔ ASR kelimesi. Benzerlik: karakter oranı."""
    E = [norm(w) for w in expected]
    A = [norm(a["w"]) for a in asr]
    n, m = len(E), len(A)
    gap = 0.7
    D = np.zeros((n + 1, m + 1), np.float32)
    D[:, 0] = np.arange(n + 1) * gap
    D[0, :] = np.arange(m + 1) * gap
    B = np.zeros((n + 1, m + 1), np.int8)
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            sim = SequenceMatcher(None, E[i - 1], A[j - 1]).ratio() if E[i - 1] and A[j - 1] else 0.0
            c = [D[i - 1, j - 1] + (1.0 - sim) * 1.2, D[i - 1, j] + gap, D[i, j - 1] + gap]
            k = int(np.argmin(c))
            D[i, j], B[i, j] = c[k], k
    match: list[list[int]] = [[] for _ in range(n)]
    i, j = n, m
    while i > 0 and j > 0:
        k = B[i, j]
        if k == 0:
            match[i - 1].append(j - 1); i -= 1; j -= 1
        elif k == 1:
            i -= 1
        else:
            # ASR fazladan kelime böldüyse (ör. "on bir" → "onbir") komşu beklenen kelimeye iliştir
            if i - 1 < n and i > 0:
                match[i - 1].append(j - 1)
            j -= 1
    out: list[tuple[float, float] | None] = []
    for i in range(n):
        js = sorted(match[i])
        out.append((asr[js[0]]["start"], asr[js[-1]]["end"]) if js else None)
    # eşleşmeyenleri komşular arasında doğrusal dağıt
    k = 0
    while k < n:
        if out[k] is not None:
            k += 1
            continue
        a = k
        while k < n and out[k] is None:
            k += 1
        t0 = out[a - 1][1] if a > 0 else (out[k][0] - 0.3 * (k - a) if k < n else 0.0)
        t1 = out[k][0] if k < n else t0 + 0.3 * (k - a)
        step = (t1 - t0) / (k - a)
        for q in range(a, k):
            out[q] = (t0 + step * (q - a), t0 + step * (q - a + 1))
    # monotonluk
    for q in range(1, n):
        s, e = out[q]
        ps, pe = out[q - 1]
        if s < pe:
            s = pe
        out[q] = (s, max(s + 0.04, e))
    return out


def _quietest(x: np.ndarray, a: float, b: float) -> float:
    """[a,b] aralığında en düşük enerjili nokta (sn)."""
    ia, ib = int(a * SR), int(b * SR)
    if ib - ia < int(0.02 * SR):
        return (a + b) / 2
    seg = np.abs(x[ia:ib])
    win = max(1, int(0.01 * SR))
    e = np.convolve(seg, np.ones(win) / win, mode="same")
    # uçlardan uzak dur (kelime kuyruğu/nefes)
    pad = min(len(e) // 4, int(0.03 * SR))
    k = pad + int(np.argmin(e[pad: len(e) - pad])) if len(e) > 2 * pad + 1 else len(e) // 2
    return (ia + k) / SR


def split_chunk(x: np.ndarray, lines: list[tuple[str, list[str]]], times: list[tuple[float, float]],
                out_dir: Path, head: float = 0.06, tail: float = 0.35) -> dict:
    """lines: [(satır_id, konuşulan kelimeler)], times: tüm parça için kelime (start,end)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    spans, k = [], 0
    for lid, words in lines:
        spans.append((lid, k, k + len(words)))
        k += len(words)
    dur = len(x) / SR
    cuts = []
    for q in range(len(spans) - 1):
        end_prev = times[spans[q][2] - 1][1]
        start_next = times[spans[q + 1][1]][0]
        cuts.append(_quietest(x, end_prev, max(end_prev + 0.02, start_next)))
    report = {}
    for q, (lid, a, b) in enumerate(spans):
        s0 = 0.0 if q == 0 else cuts[q - 1]
        s1 = dur if q == len(spans) - 1 else cuts[q]
        s0 = max(s0, times[a][0] - (head if q == 0 else 10.0))  # ilk satırın başındaki boşluğu kırp
        if q == len(spans) - 1:
            s1 = min(s1, times[b - 1][1] + tail)
        seg = x[int(s0 * SR): int(s1 * SR)].copy()
        fi, fo = int(0.004 * SR), int(0.012 * SR)
        seg[:fi] *= np.linspace(0, 1, fi)
        seg[-fo:] *= np.linspace(1, 0, fo)
        words = [{"start": round(times[i][0] - s0, 4), "end": round(times[i][1] - s0, 4)} for i in range(a, b)]
        sf.write(out_dir / f"{lid}.wav", seg, SR, subtype="FLOAT")
        (out_dir / f"{lid}.json").write_text(json.dumps({"words": words}, ensure_ascii=False), encoding="utf-8")
        report[lid] = round(len(seg) / SR, 3)
    return report
