"""Harici (ElevenLabs) ses parçalarını satırlara böl: python3 -m vayy extvoice <konu>

topics/<konu>/chunks.json → [{id, lines: [satır_id…], text}] ve topics/<konu>/voice/raw/<id>.mp3.
Her parça Whisper ile hizalanır; satırlar build/<konu>/extlines/<satır>.wav + .json olarak yazılır.
"""
from __future__ import annotations

import hashlib
import json

from .align import load_audio, split_chunk, transcribe, align
from .markup import parse_line
from .paths import BUILD, TOPICS


def prepare(topic_id: str, force: bool = False, log=print) -> dict:
    tdir = TOPICS / topic_id
    chunks = json.loads((tdir / "chunks.json").read_text(encoding="utf-8"))
    topic = json.loads((tdir / "topic.json").read_text(encoding="utf-8"))
    texts = {l["id"]: l["text"] for l in topic["lines"]}
    texts.update(topic.get("extra_lines", {}))
    out = BUILD / topic_id / "extlines"
    out.mkdir(parents=True, exist_ok=True)
    done = {}
    for c in chunks:
        mp3 = tdir / "voice" / "raw" / f"{c['id']}.mp3"
        if not mp3.exists():
            log(f"  [extvoice] {c['id']}: kayıt yok, atlandı")
            continue
        spoken = [(lid, parse_line(texts[lid]).spoken) for lid in c["lines"]]
        key = hashlib.sha1((mp3.read_bytes()[:4096].hex() + str(mp3.stat().st_size) + json.dumps(spoken, ensure_ascii=False)).encode()).hexdigest()[:12]
        stamp = out / f"_{c['id']}.key"
        if not force and stamp.exists() and stamp.read_text() == key and all((out / f"{l}.wav").exists() for l in c["lines"]):
            continue
        x = load_audio(mp3)
        asr = transcribe(x)
        exp = [w for _, ws in spoken for w in ws]
        times = align(exp, asr)
        rep = split_chunk(x, spoken, times, out)
        stamp.write_text(key)
        done.update(rep)
        log(f"  [extvoice] {c['id']}: {len(asr)} ASR / {len(exp)} beklenen kelime → {', '.join(f'{k} {v:.1f}s' for k, v in rep.items())}")
    return done


if __name__ == "__main__":
    import sys
    prepare(sys.argv[1], force="--force" in sys.argv)
