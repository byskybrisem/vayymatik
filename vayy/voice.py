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


def _external_line(path: Path, spoken: list[str], window: float | None, log=print):
    """Harici (ör. ElevenLabs) satır sesi: 48 kHz mono, baş/son sessizlik kırpılır, pencereye sığmazsa atempo,
    kelime zamanları yerel ASR (faster-whisper) ile; sayı uyuşmazsa harf sayısına göre dağıtılır."""
    import subprocess, tempfile
    from .tts import WordTime, _redistribute

    tmp = Path(tempfile.mkdtemp()) / "x.wav"
    flt = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-ac", "1", "-ar", str(SR_OUT), "-af", flt, str(tmp)], check=True)
    audio, _ = sf.read(tmp, dtype="float32")
    dur = len(audio) / SR_OUT
    if window and dur > window:
        k = min(1.25, dur / window)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp), "-af", f"atempo={k:.4f}", str(tmp.with_name("y.wav"))], check=True)
        audio, _ = sf.read(tmp.with_name("y.wav"), dtype="float32")
        log(f"  [ses] {path.stem}: {dur:.2f} sn → atempo {k:.3f}")
    pad = np.zeros(int(0.08 * SR_OUT), dtype=np.float32)
    audio = np.concatenate([pad, audio, pad])
    wavp = tmp.with_name("z.wav")
    sf.write(wavp, audio, SR_OUT, subtype="FLOAT")
    from .qa import asr_words
    asr = asr_words(wavp, "medium")
    if len(asr) == len(spoken):
        words = [{"text": t, "start": round(a["start"], 4), "end": round(a["end"], 4)} for t, a in zip(spoken, asr)]
    else:
        base = [WordTime(a["word"], a["start"], a["end"]) for a in asr]
        words = [{"text": w.text, "start": round(w.start, 4), "end": round(w.end, 4)} for w in _redistribute(base, spoken)]
    return audio, words


def synth_lines(topic: dict, cache_dir: Path, log=print) -> list[LineAudio]:
    v = topic["voice"]
    if v.get("external_dir"):
        ext = Path(v["external_dir"])
        cache_dir.mkdir(parents=True, exist_ok=True)
        out: list[LineAudio] = []
        for line in topic["lines"]:
            parsed = parse_line(line["text"])
            cache = cache_dir / f"ext-{line['id']}.npz"
            src = next(ext.glob(f"{line['id']}.*"))
            if cache.exists() and cache.stat().st_mtime > src.stat().st_mtime:
                z = np.load(cache, allow_pickle=True)
                audio, words = z["audio"], json.loads(str(z["words"]))
            else:
                audio, words = _external_line(src, parsed.spoken, line.get("window"), log)
                np.savez(cache, audio=audio, words=json.dumps(words))
            la = LineAudio(id=line["id"], parsed=parsed, audio=audio, words=words, pause_after=line.get("pause_after", v.get("gap", 0.25)))
            la.fixed_at = line.get("at")
            out.append(la)
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
        if getattr(la, "fixed_at", None) is not None:
            t = max(t, la.fixed_at)
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
