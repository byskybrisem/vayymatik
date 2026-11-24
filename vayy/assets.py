"""Harici varlıkların indirilmesi ve doğrulanması (ses modeli, dokular)."""
from __future__ import annotations

import hashlib
import shutil
import urllib.request
from pathlib import Path

from .paths import ASSETS, ENGINE_PUBLIC, VOICES

VOICE_SOURCES = {
    "tr_TR-fahrettin-medium": {
        "onnx": "https://huggingface.co/speaches-ai/piper-tr_TR-fahrettin-medium/resolve/main/model.onnx",
        "json": "https://huggingface.co/speaches-ai/piper-tr_TR-fahrettin-medium/resolve/main/config.json",
        "sha256": "39081c47270180e8a0dfac69b07bf329fb6d039fcc1279dbe26c2daf2848b190",
    }
}

SHARED_PUBLIC = {
    "shared/earth_bmng_5400.jpg": ASSETS / "textures" / "bmng_200407_topo_bathy_5400x2700.jpg",
    "shared/detail_newmexico.jpg": ASSETS / "textures" / "bmng_200407_newmexico_240ppd.jpg",
}


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def _download(url: str, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "vayymatik-pipeline/1.0"})
    with urllib.request.urlopen(req, timeout=300) as r, open(dst.with_suffix(dst.suffix + ".part"), "wb") as f:
        shutil.copyfileobj(r, f)
    dst.with_suffix(dst.suffix + ".part").rename(dst)


def ensure_voice(name: str) -> Path:
    src = VOICE_SOURCES[name]
    onnx = VOICES / f"{name}.onnx"
    js = VOICES / f"{name}.onnx.json"
    if not onnx.exists():
        print(f"[varlık] ses modeli indiriliyor: {name}")
        _download(src["onnx"], onnx)
    if not js.exists():
        _download(src["json"], js)
    got = sha256(onnx)
    if got != src["sha256"]:
        onnx.unlink()
        raise RuntimeError(f"SHA-256 uyuşmadı ({name}): {got}")
    return onnx


def ensure_public() -> None:
    """Paylaşılan dokuları ve gren dokusunu engine/public/shared altına koyar."""
    for rel, src in SHARED_PUBLIC.items():
        dst = ENGINE_PUBLIC / rel
        if not dst.exists() or dst.stat().st_size != src.stat().st_size:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
    grain = ENGINE_PUBLIC / "shared" / "grain.png"
    if not grain.exists():
        import numpy as np
        from PIL import Image

        g = np.random.default_rng(7).normal(128, 38, (256, 256)).clip(0, 255).astype("uint8")
        Image.fromarray(g, "L").convert("RGB").save(grain)
