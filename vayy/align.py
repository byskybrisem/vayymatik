"""Harici (ElevenLabs) ses için kelime zamanları: Whisper kelime damgaları + karakter düzeyinde eşleme.

`python3 -m vayy align <konu>` her satır MP3'ünün yanına `<satır>.asr.json` yazar (faster-whisper, yerel, ücretsiz).
`voice._external_line` bu dosya varsa kelime sınırlarını buradan alır, yoksa hece ağırlığına döner.
"""
from __future__ import annotations

import json
import re
import subprocess
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np

# Whisper kelime başlangıçları duyulan başlangıçtan ASR ile ölçülen sapmayı ortalamak için ayar (yerleşimde ses de aynı miktarda kaydığından etkisi 2 katıdır)
ASR_LAG = 0.0
_TR = str.maketrans("çğıöşüâîûÇĞİÖŞÜÂÎÛ", "cgiosuaiucgiosuaiu")


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.translate(_TR).lower())


def transcribe(mp3: Path, model_size: str = "medium") -> list[dict]:
    from faster_whisper import WhisperModel

    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp3), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
    audio = np.frombuffer(raw, dtype=np.float32)
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segs, _ = model.transcribe(audio, language="tr", word_timestamps=True, vad_filter=False)
    return [{"w": w.word.strip(), "s": round(float(w.start), 3), "e": round(float(w.end), 3)} for s in segs for w in s.words]


def align_topic(topic_id: str, model_size: str = "medium") -> None:
    from .paths import TOPICS

    vdir = TOPICS / topic_id / "voice"
    for mp3 in sorted(vdir.glob("*.mp3")):
        out = mp3.with_suffix(".asr.json")
        out.write_text(json.dumps(transcribe(mp3, model_size), ensure_ascii=False), encoding="utf-8")
        print("[align]", out.name)


def words_from_asr(spoken: list[str], tokens: list[dict], t0: float, t1: float) -> list[dict] | None:
    """spoken: konuşulan kelimeler; tokens: ASR [{w,s,e}]; [t0,t1]: enerji ile bulunan konuşma aralığı."""
    if not tokens or not spoken:
        return None
    a_chars: list[tuple[float, float]] = []  # her karakterin (başlangıç, bitiş) zamanı
    a_text = ""
    for tk in tokens:
        n = _norm(tk["w"])
        for i in range(len(n)):
            d = (tk["e"] - tk["s"]) / max(1, len(n))
            a_chars.append((tk["s"] + i * d, tk["s"] + (i + 1) * d))
        a_text += n
    if len(a_text) < 3:
        return None
    b_text = "".join(_norm(w) for w in spoken)
    if not b_text:
        return None
    blocks = SequenceMatcher(None, b_text, a_text, autojunk=False).get_matching_blocks()
    if sum(b.size for b in blocks) < 0.6 * len(b_text):
        return None
    xs, ys = [0.0], [0.0]  # b konumu -> a konumu (parça parça doğrusal)
    for b in blocks:
        if b.size == 0:
            continue
        xs += [float(b.a), float(b.a + b.size)]
        ys += [float(b.b), float(b.b + b.size)]
    xs.append(float(len(b_text)))
    ys.append(float(len(a_text)))

    def t_at(bpos: float) -> float:
        ap = float(np.interp(bpos, xs, ys))
        i = min(len(a_chars) - 1, max(0, int(ap)))
        s, e = a_chars[i]
        return s + (e - s) * (ap - int(ap)) if ap < len(a_chars) else a_chars[-1][1]

    pos, raw = 0, []
    for w in spoken:
        n = len(_norm(w))
        raw.append((t_at(pos), t_at(pos + n)))
        pos += n
    # Kelime sınırları doğrudan ASR damgalarından; yalnızca satırın ilk kelimesi enerji başlangıcına (t0) çekilir
    # (yumuşak ünsüz/nefes ön-sesi altyazıyı erkene almasın), son kelime enerji bitişini (t1) aşmaz.
    words = []
    prev = t0
    for k, (w, (s, e)) in enumerate(zip(spoken, raw)):
        s2 = max(prev, s + ASR_LAG, t0 if k == 0 else 0.0)
        e2 = max(s2 + 0.05, e + ASR_LAG)
        if k == len(spoken) - 1:
            e2 = max(s2 + 0.05, min(e2, t1))
        words.append({"text": w, "start": round(s2, 4), "end": round(e2, 4)})
        prev = words[-1]["end"]
    return words
