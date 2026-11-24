"""Miks: seslendirme zinciri, müziği sese göre kısma (sidechain), master ve loudness.

Hedefler (VAYYMATİK0 seslendirme becerisi): ses −16 LUFS referans, master −14 LUFS,
gerçek tepe ≤ −1,5 dBTP, müzik konuşma altında en az 8 dB kısık.
"""
from __future__ import annotations

import numpy as np
import pyloudnorm as pyln
from scipy import signal

from . import dsp
from .dsp import SR


def lufs(x: np.ndarray) -> float:
    meter = pyln.Meter(SR)
    v = meter.integrated_loudness(dsp.stereo(x).astype(np.float64))
    return float(v)


def gain_to_lufs(x: np.ndarray, target: float) -> np.ndarray:
    cur = lufs(x)
    if not np.isfinite(cur):
        return x
    return (x * 10 ** ((target - cur) / 20)).astype(np.float32)


def true_peak_db(x: np.ndarray) -> float:
    up = signal.resample_poly(dsp.stereo(x), 4, 1, axis=0)
    return float(dsp.db(np.abs(up).max()))


def voice_chain(v: np.ndarray) -> np.ndarray:
    x = dsp.hp(v, 75, 2)
    x = dsp.shelf(x, 180, 1.5, high=False)
    x = dsp.peak_eq(x, 330, -2.0, q=1.1)
    x = dsp.peak_eq(x, 3200, 2.5, q=0.9)
    x = dsp.peak_eq(x, 6800, -1.5, q=2.0)  # hafif de-ess
    # hafif harmonik parlaklık (22 kHz kaynak bandını canlandırır)
    exc = dsp.hp(dsp.saturate(dsp.hp(x, 2500, 2) * 3.0, 2.0), 5000, 2) * 0.05
    x = x + exc
    x = dsp.compress(x, thr_db=-22, ratio=3.0, attack=0.004, release=0.12, makeup_db=3)
    room = dsp.reverb(x, wet=1.0, decay=0.45, predelay=0.012, damp=5000, seed=21)
    st = dsp.stereo(x) * 0.94 + room * 0.06
    return st.astype(np.float32)


def duck_curve(voice: np.ndarray, depth_db: float = 10.0, attack=0.06, release=0.45) -> np.ndarray:
    env = dsp.env_follow(voice, attack=attack, release=release)
    ref = np.percentile(env[env > 1e-4], 90) if np.any(env > 1e-4) else 1.0
    e = np.clip(env / (ref + 1e-9), 0, 1) ** 0.6
    # yumuşat
    k = np.exp(-1 / (0.08 * SR))
    e = signal.lfilter([1 - k], [1, -k], e)
    return (10 ** (-depth_db * e / 20)).astype(np.float32)


def master(voice_mono: np.ndarray, music: np.ndarray, sfx: np.ndarray, cfg: dict | None = None) -> tuple[np.ndarray, dict]:
    cfg = cfg or {}
    n = max(len(voice_mono), len(music), len(sfx))

    def fit(a):
        a = dsp.stereo(a)
        if len(a) < n:
            a = np.concatenate([a, np.zeros((n - len(a), 2), np.float32)])
        return a[:n]

    v = fit(voice_chain(voice_mono))
    v = gain_to_lufs(v, cfg.get("voice_lufs", -16.0))
    m = fit(music)
    m = gain_to_lufs(m, cfg.get("music_lufs", -21.5))
    # müziğin konuşma bandını biraz aç (1–4 kHz oyuk)
    m = dsp.peak_eq(m, 2200, -3.0, q=0.8)
    duck = duck_curve(voice_mono if len(voice_mono) >= n else np.pad(voice_mono, (0, n - len(voice_mono))), cfg.get("duck_db", 10.0))
    m_ducked = m * duck[:n, None]
    s = fit(sfx)
    s = gain_to_lufs(s, cfg.get("sfx_lufs", -24.0)) if np.abs(s).max() > 0 else s
    s = s * (0.55 + 0.45 * duck[:n, None])  # efektler de konuşmada hafif geri çekilir
    mix = v + m_ducked + s
    mix = dsp.compress(mix, thr_db=-16, ratio=1.8, attack=0.015, release=0.25, makeup_db=0)
    mix = gain_to_lufs(mix, cfg.get("target_lufs", -14.0))
    mix = dsp.limiter(mix, ceiling_db=cfg.get("ceiling_db", -2.0), release=0.06)
    # limiter sonrası hedefi yeniden yakala (en fazla +1 dB)
    cur = lufs(mix)
    adj = float(np.clip(cfg.get("target_lufs", -14.0) - cur, -3, 1.0))
    mix = dsp.limiter(mix * 10 ** (adj / 20), ceiling_db=cfg.get("ceiling_db", -2.0), release=0.06)
    stats = {
        "integrated_lufs": round(lufs(mix), 2),
        "true_peak_dbtp": round(true_peak_db(mix), 2),
        "voice_lufs": round(lufs(v), 2),
        "music_under_voice_db": None,
    }
    # konuşma anlarında müzik/ses farkı
    speech = duck < 10 ** (-0.6 * cfg.get("duck_db", 10.0) / 20)
    if speech.any():
        vr = np.sqrt(np.mean(v[speech[:n]] ** 2))
        mr = np.sqrt(np.mean(m_ducked[speech[:n]] ** 2))
        stats["music_under_voice_db"] = round(float(dsp.db(vr) - dsp.db(mr)), 1)
    return mix.astype(np.float32), stats
