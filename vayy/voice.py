"""Seslendirme: satırları sentezle (önbellekli), zaman çizelgesine yerleştir."""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundfile as sf

from .markup import ParsedLine, parse_line
from .paths import VOICES
from .tts import TimedPiper

SR_OUT = 48000


@dataclass
class LineAudio:
    id: str
    parsed: ParsedLine
    audio: np.ndarray        # 48 kHz mono float32 (ham, işlenmemiş)
    words: list[dict]        # [{text, start, end}] satır başına göre (sn), konuşulan kelimeler
    start: float = 0.0       # zaman çizelgesindeki konum (sn) — ses dosyasının başı
    pause_after: float = 0.25

    @property
    def dur(self) -> float:
        return len(self.audio) / SR_OUT

    @property
    def speech_start(self) -> float:
        return self.start + (self.words[0]["start"] if self.words else 0.0)

    @property
    def speech_end(self) -> float:
        return self.start + (self.words[-1]["end"] if self.words else self.dur)


def _resample(x: np.ndarray, sr: int) -> np.ndarray:
    from scipy.signal import resample_poly
    from math import gcd

    g = gcd(SR_OUT, sr)
    return resample_poly(x, SR_OUT // g, sr // g).astype(np.float32)


def _external_line(path: Path, parsed: ParsedLine) -> tuple[np.ndarray, list[dict]]:
    """Harici (ör. ElevenLabs) ses dosyası: 48 kHz'e çevir, baş/son sessizliği bul, kelime
    zamanlarını heceye (ünlü sayısı) + virgül duraklarına göre konuşma aralığına dağıt."""
    import subprocess, tempfile

    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / "x.wav"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR_OUT), str(wav)], check=True)
        audio, _ = sf.read(wav, dtype="float32")
    env = np.abs(audio)
    win = SR_OUT // 100
    e = np.convolve(env, np.ones(win) / win, mode="same")
    on = np.where(e > max(0.02 * e.max(), 1e-4))[0]
    t0, t1 = (on[0] / SR_OUT, on[-1] / SR_OUT) if len(on) else (0.0, len(audio) / SR_OUT)
    weights = []
    for w in parsed.spoken:
        syl = max(1, sum(ch in "aeıioöuüAEIİOÖUÜ" for ch in w))
        weights.append(syl + 0.45)
        if w.rstrip().endswith((",", ";", ":")):
            weights.append(0.0)  # duraklama yeri aşağıda ayrı eklenir
    # duraklama ağırlığı: virgüllü kelimeden sonra ~0.12 sn eşdeğeri
    total_syl_rate = max(1e-6, sum(weights)) / max(0.1, (t1 - t0))
    words, t = [], t0
    span = t1 - t0
    pause = [0.12 if w.rstrip().endswith((",", ";", ":")) else 0.0 for w in parsed.spoken]
    wts = [max(1, sum(ch in "aeıioöuüAEIİOÖUÜ" for ch in w)) + 0.45 for w in parsed.spoken]
    avail = max(0.1, span - sum(pause[:-1]))
    scale = avail / sum(wts)
    for w, wt, pz in zip(parsed.spoken, wts, pause):
        d = wt * scale
        words.append({"text": w, "start": round(t, 4), "end": round(t + d, 4)})
        t += d + pz
    return audio, words


def synth_lines(topic: dict, cache_dir: Path, log=print) -> list[LineAudio]:
    v = topic["voice"]
    if v.get("provider") == "external":
        from .paths import TOPICS
        out = []
        for line in topic["lines"]:
            parsed = parse_line(line["text"])
            src = TOPICS / topic["id"] / "voice" / f"{line['id']}.mp3"
            audio, words = _external_line(src, parsed)
            out.append(LineAudio(id=line["id"], parsed=parsed, audio=audio, words=words, pause_after=line.get("pause_after", v.get("gap", 0.25))))
        log(f"  [ses] harici ses ({v.get('name', 'external')}): {len(out)} satır")
        return out
    model = VOICES / f"{v['model']}.onnx"
    cfgp = VOICES / f"{v['model']}.onnx.json"
    if not model.exists():
        from .assets import ensure_voice
        ensure_voice(v["model"])
    tts: TimedPiper | None = None
    cache_dir.mkdir(parents=True, exist_ok=True)
    out: list[LineAudio] = []
    for line in topic["lines"]:
        parsed = parse_line(line["text"])
        params = {
            "text": parsed.tts_text,
            "length_scale": line.get("length_scale", v.get("length_scale", 1.0)),
            "noise_scale": v.get("noise_scale", 0.667),
            "noise_w": v.get("noise_w", 0.8),
            "seed": line.get("seed", v.get("seed", 1987)),
            "model": v["model"],
        }
        key = hashlib.sha1(json.dumps(params, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]
        wav = cache_dir / f"{line['id']}-{key}.wav"
        meta = wav.with_suffix(".json")
        if wav.exists() and meta.exists():
            audio, _ = sf.read(wav, dtype="float32")
            words = json.loads(meta.read_text(encoding="utf-8"))["words"]
        else:
            if tts is None:
                tts = TimedPiper(model, cfgp, seed=params["seed"])
            r = tts.synth(
                parsed.tts_text,
                length_scale=params["length_scale"],
                noise_scale=params["noise_scale"],
                noise_w=params["noise_w"],
                seed=params["seed"],
                expected_words=parsed.spoken,
            )
            audio = _resample(r.audio, r.sample_rate)
            words = [{"text": w.text, "start": round(w.start, 4), "end": round(w.end, 4)} for w in r.words]
            sf.write(wav, audio, SR_OUT, subtype="FLOAT")
            meta.write_text(json.dumps({"params": params, "phonemes": r.phonemes, "words": words}, ensure_ascii=False, indent=1), encoding="utf-8")
            log(f"  [ses] {line['id']}: {len(audio)/SR_OUT:.2f} sn · {r.phonemes[:70]}…")
        out.append(LineAudio(id=line["id"], parsed=parsed, audio=audio, words=words, pause_after=line.get("pause_after", v.get("gap", 0.25))))
    return out


def layout(lines: list[LineAudio], lead_in: float) -> float:
    """Satırları ardışık yerleştirir; konuşmanın bittiği zamanı döndürür.
    Satır sesindeki baş/son sessizlik kırpılmadan korunur, aralar konuşma sonundan ölçülür."""
    t = lead_in
    for i, la in enumerate(lines):
        head = la.words[0]["start"] if la.words else 0.0
        la.start = t - head  # konuşma tam t'de başlasın
        t = la.speech_end + la.pause_after
    return lines[-1].speech_end


def render_voice_track(lines: list[LineAudio], total: float) -> np.ndarray:
    n = int(round(total * SR_OUT)) + SR_OUT
    track = np.zeros(n, dtype=np.float32)
    for la in lines:
        i = int(round(la.start * SR_OUT))
        a = la.audio
        if i < 0:
            a = a[-i:]
            i = 0
        track[i:i + len(a)] += a[: max(0, n - i)]
    return track[: int(round(total * SR_OUT))]
