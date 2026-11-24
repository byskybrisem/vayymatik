"""Piper TTS modülü — fonem süreleri modelden okunur, kelime zamanları örnek doğruluğundadır.

Kanal sabiti: tr_TR-fahrettin-medium (CC0). Ayarlar brand/brand.json -> voice.
Model ONNX grafiğine `/Ceil_output_0` (fonem başına kare sayısı) çıkışı eklenir ve
gürültü düğümleri tohumlanır; böylece aynı metin her makinede aynı sesi ve aynı
zamanlamayı üretir (yerel + GitHub Actions).
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

HOP = 256  # VITS medium: her çıktı karesi 256 örnek
PUNCT = set(",.;:!?¡¿—…\"()'-")


@dataclass
class WordTime:
    text: str        # TTS'e giden (yazıya çevrilmiş) kelime
    start: float     # sn, satır sesinin başına göre
    end: float


@dataclass
class SynthResult:
    audio: np.ndarray            # float32 mono
    sample_rate: int
    words: list[WordTime] = field(default_factory=list)
    phonemes: str = ""


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def build_timed_model(model: Path, seed: int) -> Path:
    """Süre çıkışı eklenmiş + tohumlanmış model kopyası üretir (önbelleğe alınır)."""
    import onnx
    from onnx import helper, TensorProto

    out = model.with_name(model.stem + f".timed-s{seed}.onnx")
    if out.exists() and out.stat().st_mtime >= model.stat().st_mtime:
        return out
    m = onnx.load(str(model))
    names = {o.name for o in m.graph.output}
    if "/Ceil_output_0" not in names:
        m.graph.output.append(helper.make_tensor_value_info("/Ceil_output_0", TensorProto.FLOAT, None))
    for i, node in enumerate(n for n in m.graph.node if n.op_type in ("RandomNormalLike", "RandomNormal")):
        for a in list(node.attribute):
            if a.name == "seed":
                node.attribute.remove(a)
        node.attribute.append(helper.make_attribute("seed", float(seed + i)))
    onnx.save(m, str(out))
    return out


class TimedPiper:
    def __init__(self, model: Path, config: Path, seed: int = 1987, threads: int = 0):
        from piper import PiperVoice

        self.model = Path(model)
        self.cfg = json.loads(Path(config).read_text(encoding="utf-8"))
        self.sr = int(self.cfg["audio"]["sample_rate"])
        self.seed = seed
        self.threads = threads
        # Fonemleştirme ve id eşlemesi için Piper'ın kendi kodu (espeak-ng gömülü)
        self.voice = PiperVoice.load(str(model), config_path=str(config))

    def _session(self, seed: int):
        import onnxruntime as ort

        path = build_timed_model(self.model, seed)
        so = ort.SessionOptions()
        if self.threads:
            so.intra_op_num_threads = self.threads
        return ort.InferenceSession(str(path), sess_options=so, providers=["CPUExecutionProvider"])

    def phonemize(self, text: str) -> list[str]:
        sentences = self.voice.phonemize(text)
        flat: list[str] = []
        for i, s in enumerate(sentences):
            if i:
                flat.append(" ")
            flat.extend(s)
        return flat

    def synth(
        self,
        text: str,
        length_scale: float = 1.0,
        noise_scale: float = 0.667,
        noise_w: float = 0.8,
        seed: int | None = None,
        expected_words: list[str] | None = None,
    ) -> SynthResult:
        phonemes = self.phonemize(text)
        ids = self.voice.phonemes_to_ids(phonemes)
        sess = self._session(self.seed if seed is None else seed)
        audio, dur = sess.run(
            None,
            {
                "input": np.array([ids], dtype=np.int64),
                "input_lengths": np.array([len(ids)], dtype=np.int64),
                "scales": np.array([noise_scale, length_scale, noise_w], dtype=np.float32),
            },
        )
        audio = audio.squeeze().astype(np.float32)
        dur = dur.squeeze().astype(np.int64)
        assert len(dur) == len(ids), (len(dur), len(ids))
        hop = len(audio) / max(1, int(dur.sum()))
        # ids: [BOS, PAD, p0, PAD, p1, PAD, ..., EOS]; fonem k -> id indeksi 2 + 2k
        cum = np.concatenate([[0], np.cumsum(dur)])
        words: list[WordTime] = []
        cur: list[int] = []   # fonem indeksleri (noktalama hariç)
        chars: list[str] = []

        def flush():
            if cur:
                a = cum[2 + 2 * cur[0]] * hop / self.sr
                # kelimenin son fonemi + ardından gelen PAD'in sonu
                b = cum[2 + 2 * cur[-1] + 2] * hop / self.sr
                words.append(WordTime("".join(chars), float(a), float(b)))
            cur.clear(); chars.clear()

        for k, ph in enumerate(phonemes):
            if ph == " ":
                flush()
            elif ph in PUNCT or ph in ("ˈ", "ˌ"):
                if ph in ("ˈ", "ˌ"):
                    chars.append(ph)
                continue
            else:
                cur.append(k); chars.append(ph)
        flush()

        if expected_words is not None and len(expected_words) != len(words):
            words = _redistribute(words, expected_words)
        elif expected_words is not None:
            for w, t in zip(words, expected_words):
                w.text = t
        return SynthResult(audio=audio, sample_rate=self.sr, words=words, phonemes="".join(phonemes))


def _redistribute(words: list[WordTime], expected: list[str]) -> list[WordTime]:
    """espeak kelime sayısı beklenenden farklıysa: konuşma aralığını harf sayısına göre böl."""
    if not words:
        return []
    t0, t1 = words[0].start, words[-1].end
    weights = np.array([max(1, sum(ch.isalpha() for ch in w)) for w in expected], dtype=float)
    edges = t0 + np.concatenate([[0], np.cumsum(weights)]) / weights.sum() * (t1 - t0)
    return [WordTime(w, float(edges[i]), float(edges[i + 1])) for i, w in enumerate(expected)]
