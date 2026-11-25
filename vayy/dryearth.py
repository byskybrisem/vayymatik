"""Okyanusları kurumuş Dünya dokusu: NASA Blue Marble + topo/bathy (kamu malı) -> okyanus tabanı renklendirmesi."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

from .paths import ENGINE_PUBLIC, ROOT

OUT = ENGINE_PUBLIC / "shared" / "earth_dry_5400.jpg"


def ensure_dry_earth() -> Path:
    if OUT.exists():
        return OUT
    src = ENGINE_PUBLIC / "shared" / "earth_bmng_5400.jpg"
    bathy = ROOT / "assets" / "textures" / "bmng_200407_topo_bathy_5400x2700.jpg"
    A = np.asarray(Image.open(src).convert("RGB")).astype(np.float32) / 255
    B = np.asarray(Image.open(bathy).convert("RGB").resize((A.shape[1], A.shape[0]))).astype(np.float32) / 255
    r, g, bl = B[..., 0], B[..., 1], B[..., 2]
    oc = gaussian_filter(np.clip((bl - r - 0.02) / 0.10, 0, 1), 1.5)
    lum = gaussian_filter(0.3 * r + 0.59 * g + 0.11 * bl, 1.0)
    d = np.clip((lum - lum[oc > 0.9].min()) / (np.ptp(lum[oc > 0.9]) + 1e-6), 0, 1) ** 0.7
    deep, mid, sh = np.array([0.47, 0.31, 0.19]), np.array([0.66, 0.46, 0.28]), np.array([0.88, 0.74, 0.54])
    t = d[..., None]
    floor = np.where(t < 0.5, deep + (mid - deep) * (t / 0.5), mid + (sh - mid) * ((t - 0.5) / 0.5))
    n = gaussian_filter(np.random.default_rng(3).standard_normal(d.shape), 1.2) * 0.07
    floor = np.clip(floor * (1 + n[..., None]), 0, 1)
    out = A * (1 - oc[..., None]) + floor * oc[..., None]
    Image.fromarray((out * 255).astype(np.uint8)).save(OUT, quality=92)
    return OUT
