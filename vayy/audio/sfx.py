"""Prosedürel ses efektleri kütüphanesi (özgün sentez). Her fonksiyon stereo dizi döndürür."""
from __future__ import annotations

import numpy as np

from . import dsp
from .dsp import SR, n_of


def whoosh(dur=0.7, up=True, seed=1, bright=1.0):
    n = n_of(dur)
    p = np.linspace(0, 1, n)
    env = np.sin(np.pi * p ** (0.7 if up else 1.4)) ** 2
    fc = (300 + 4500 * bright * (p if up else 1 - p) ** 1.5)
    x = dsp.sweep_bp(dsp.noise(n, seed), fc, q=1.2) * env * 1.6
    pan = np.linspace(-0.7, 0.7, n) if up else np.linspace(0.7, -0.7, n)
    return dsp.reverb(dsp.pan(x, pan), wet=0.2, decay=0.9, seed=seed)


def impact(size=1.0, seed=2):
    n = n_of(2.2 * size)
    boom = dsp.sine(30 + 80 * np.exp(-dsp.tvec(n) / 0.06), n) * dsp.expdec(n, 0.5 * size)
    crack = dsp.bp(dsp.noise(n, seed), 150, 6000) * dsp.expdec(n, 0.035) * 0.7
    return dsp.reverb(dsp.saturate((boom + crack) * 0.9, 2.0), wet=0.35, decay=2.5 * size, seed=seed)


def riser(dur=1.5, seed=3):
    n = n_of(dur)
    p = np.linspace(0, 1, n) ** 2
    x = dsp.sweep_bp(dsp.noise(n, seed), 300 + 8000 * p, q=2.5) * p ** 1.3
    return dsp.reverb(dsp.stereo(x), wet=0.25, decay=1.2, seed=seed)


def wind(dur=4.0, intensity=None, seed=4, roar=1.0):
    """Yüksek irtifa / serbest düşüş rüzgârı. intensity: 0..1 eğrisi (n uzunluğunda) ya da None."""
    n = n_of(dur)
    base = dsp.pink(n, seed)
    if intensity is None:
        intensity = np.ones(n)
    mod = 0.7 + 0.3 * np.sin(2 * np.pi * 0.35 * dsp.tvec(n) + 1.3) * np.sin(2 * np.pi * 0.11 * dsp.tvec(n))
    low = dsp.lp(base, 380 + 600 * float(np.mean(intensity)), 2) * 2.2 * roar
    gust = dsp.sweep_bp(dsp.noise(n, seed + 1), 500 + 1800 * intensity * mod, q=0.9) * 0.5
    whistle = dsp.sweep_bp(dsp.noise(n, seed + 2), 1800 + 2500 * intensity, q=8.0) * 0.25
    x = (low + gust + whistle) * intensity * mod
    L = x
    R = np.roll(x, n_of(0.013)) * 0.95
    return np.stack([L, R], -1).astype(np.float32) * 0.6


def engine_flyby(dur=2.6, seed=5, rpm0=9000, rpm1=12500):
    """Hibrit V6 benzeri motor geçişi + Doppler (özgün sentez)."""
    n = n_of(dur)
    t = dsp.tvec(n)
    p = t / dur
    rpm = rpm0 + (rpm1 - rpm0) * np.clip(p * 1.4, 0, 1)
    f0 = rpm / 60 * 3  # V6, 4 zamanlı: devir başına 3 ateşleme
    # Doppler: yaklaşırken yüksek, geçerken düşer
    x_pos = (p - 0.55) * 140  # metre
    v = 85.0  # m/s
    dop = 1 / (1 + np.clip(np.gradient(np.sqrt(x_pos ** 2 + 6 ** 2)) * SR / 340.0, -0.5, 0.5))
    f = f0 * dop
    sig = np.zeros(n, np.float32)
    for k, a in ((1, 1.0), (2, 0.55), (3, 0.38), (4, 0.22), (6, 0.12), (0.5, 0.35)):
        sig += dsp.saw(f * k, n) * a if k != 0.5 else dsp.sine(f * k, n) * a
    sig = dsp.saturate(sig * 0.35, 2.5)
    sig += dsp.sine(f * 7.5, n) * 0.05  # turbo ıslığı
    dist = np.sqrt(x_pos ** 2 + 6 ** 2)
    amp = (8 / dist) ** 1.2
    amp = amp / amp.max()
    x = dsp.lp(sig * amp, 6000, 2)
    panv = np.clip(x_pos / 40, -1, 1)
    return dsp.reverb(dsp.pan(x, panv), wet=0.15, decay=1.0, seed=seed) * 0.9


def engine_idle(dur=1.5, seed=6, rpm=4500):
    n = n_of(dur)
    f = rpm / 60 * 3 * (1 + 0.01 * np.sin(2 * np.pi * 7 * dsp.tvec(n)))
    x = dsp.saturate((dsp.saw(f, n) + dsp.saw(f * 2, n) * 0.4) * 0.3, 2.0)
    x = dsp.lp(x, 2500) * dsp.adsr(n, 0.05, 0.1, 0.9, 0.2)
    return dsp.stereo(x * 0.5)


def light_clunk(seed=7):
    """Start ışığı yanışı: elektrik 'tunk' + kısa düşük bip."""
    n = n_of(0.35)
    thump = dsp.sine(95 * np.ones(n), n) * dsp.expdec(n, 0.05)
    beep = dsp.sine(420 * np.ones(n), n) * dsp.adsr(n, 0.003, 0.05, 0.6, 0.05, hold=0.12) * 0.25
    click = dsp.hp(dsp.noise(n_of(0.004), seed), 3000)
    x = thump + beep
    x[: len(click)] += click * 0.6
    return dsp.reverb(dsp.stereo(x * 0.8), wet=0.15, decay=0.6, seed=seed)


def tick(seed=8, pitch=1.0):
    n = n_of(0.03)
    x = dsp.bp(dsp.noise(n, seed), 2500 * pitch, 7000 * pitch) * dsp.expdec(n, 0.004)
    return dsp.stereo(x * 0.6)


def ticks(dur=1.0, rate0=30, rate1=6, seed=9):
    """Sayaç tıkırtısı: hızlı başlayıp yavaşlayan."""
    n = n_of(dur)
    out = np.zeros((n, 2), np.float32)
    t = 0.0
    i = 0
    while t < dur:
        r = rate0 + (rate1 - rate0) * (t / dur)
        dsp.place(out, tick(seed + i, 1.0 + 0.1 * (i % 3)), t, -2)
        t += 1.0 / max(1.0, r)
        i += 1
    return out


def flap_clicks(count=8, spacing=0.045, seed=10):
    n = n_of(count * spacing + 0.1)
    out = np.zeros((n, 2), np.float32)
    for i in range(count):
        m = n_of(0.02)
        x = dsp.bp(dsp.noise(m, seed + i), 1500, 6000) * dsp.expdec(m, 0.003)
        x += dsp.sine(900 * np.ones(m), m) * dsp.expdec(m, 0.004) * 0.3
        dsp.place(out, dsp.pan(x, -0.2 + 0.4 * (i % 2)), i * spacing)
    return out * 0.7


def shutter(seed=11):
    n = n_of(0.12)
    x = dsp.bp(dsp.noise(n, seed), 1000, 8000) * (dsp.expdec(n, 0.006) + np.roll(dsp.expdec(n, 0.01), n_of(0.05)) * 0.6)
    return dsp.stereo(x * 0.5)


def ui_pop(seed=12, pitch=1.0):
    n = n_of(0.18)
    f = 600 * pitch * (1 + 1.5 * np.exp(-dsp.tvec(n) / 0.02))
    x = dsp.sine(f, n) * dsp.expdec(n, 0.05) * 0.35
    return dsp.reverb(dsp.stereo(x), wet=0.2, decay=0.5, seed=seed)


def heartbeat(seed=13):
    n = n_of(0.7)
    out = np.zeros(n, np.float32)
    for d, a in ((0.0, 1.0), (0.22, 0.7)):
        m = n_of(0.25)
        x = dsp.sine(48 + 30 * np.exp(-dsp.tvec(m) / 0.02), m) * dsp.expdec(m, 0.07) * a
        out[n_of(d): n_of(d) + m] += x[: n - n_of(d)]
    return dsp.stereo(dsp.lp(out, 200) * 1.2)


def crowd(dur=3.0, seed=14, swell=True):
    """Stadyum uğultusu: çok sayıda formant süzgeçli gürültü kaynağı (özgün sentez)."""
    n = n_of(dur)
    r = dsp.rng(seed)
    acc = np.zeros((n, 2), np.float32)
    for k in range(10):
        f1 = r.uniform(500, 900)
        src = dsp.bp(dsp.noise(n, seed + k), f1 * 0.8, f1 * 1.25, 1)
        src += dsp.bp(dsp.noise(n, seed + 50 + k), 1800, 2800, 1) * 0.3
        mod = 0.6 + 0.4 * np.sin(2 * np.pi * r.uniform(0.2, 1.2) * dsp.tvec(n) + r.uniform(0, 6))
        acc += dsp.pan(src * mod, r.uniform(-0.8, 0.8))
    env = np.linspace(0.5, 1.0, n) if swell else np.ones(n)
    env *= dsp.adsr(n, 0.4, 0.1, 1.0, 0.6)
    return dsp.reverb(acc * env[:, None] * 0.35, wet=0.4, decay=2.5, seed=seed)


def static_burst(dur=0.4, seed=15):
    n = n_of(dur)
    x = dsp.bp(dsp.noise(n, seed), 800, 5000) * (0.5 + 0.5 * (dsp.rng(seed).random(n) > 0.6)) * dsp.adsr(n, 0.01, 0.05, 0.8, 0.1)
    return dsp.stereo(x * 0.25)


def glitch(dur=0.35, seed=16):
    n = n_of(dur)
    r = dsp.rng(seed)
    x = np.zeros(n, np.float32)
    i = 0
    while i < n:
        seg = int(r.integers(n_of(0.008), n_of(0.04)))
        kind = r.integers(0, 3)
        if kind == 0:
            x[i:i + seg] = dsp.square(r.uniform(200, 2000), min(seg, n - i)) * 0.3
        elif kind == 1:
            x[i:i + seg] = dsp.noise(min(seg, n - i), int(r.integers(0, 999))) * 0.25
        i += seg
    return dsp.stereo(dsp.hp(x, 150))


def cash(seed=17):
    """Finansal vurgu: kısa metalik 'çing' (yazar kasa değil, soyut)."""
    n = n_of(1.2)
    t = dsp.tvec(n)
    x = np.zeros(n, np.float32)
    for f, a in ((2093, 0.5), (3136, 0.35), (4186, 0.25), (5274, 0.15)):
        x += np.sin(2 * np.pi * f * t).astype(np.float32) * a
    x *= dsp.expdec(n, 0.35) * 0.3
    return dsp.reverb(dsp.stereo(x), wet=0.3, decay=1.2, seed=seed)


def tv_static(dur=0.6, seed=18):
    n = n_of(dur)
    x = dsp.hp(dsp.noise(n, seed), 1200) * dsp.adsr(n, 0.01, 0.1, 0.7, 0.15) * 0.18
    return dsp.stereo(x)


def ball_contact(seed=72):
    n = n_of(.075)
    click = dsp.bp(dsp.noise(n, seed), 400, 3800) * dsp.expdec(n, .008)
    return dsp.stereo(.4 * click + .5 * dsp.sine(155, n) * dsp.expdec(n, .018))


def footstep(seed=20):
    n = n_of(.14)
    sole = dsp.bp(dsp.noise(n, seed), 700, 3000) * dsp.expdec(n, .014)
    heel = dsp.sine(93, n) * dsp.expdec(n, .031)
    return dsp.stereo(.36 * sole + .46 * heel)


def tile_impact(seed=42):
    n = n_of(.25)
    grit = dsp.bp(dsp.noise(n, seed), 600, 6100) * dsp.expdec(n, .024)
    ring = dsp.sine(1840, n) * dsp.expdec(n, .05)
    return dsp.stereo(.45 * grit + .13 * ring)


def water_baffle(seed=42):
    n = n_of(.32)
    water = dsp.bp(dsp.noise(n, seed), 400, 4400) * dsp.expdec(n, .07)
    return dsp.stereo(.38 * water)


def ignition(seed=42):
    n = n_of(.46)
    flame = dsp.bp(dsp.noise(n, seed), 250, 3600)
    return dsp.stereo(.35 * flame * dsp.expdec(n, .10))


SFX = {
    "tile_impact": tile_impact, "water_baffle": water_baffle, "ignition": ignition,
    "footstep": footstep,
    "ball_contact": ball_contact,
    "whoosh": whoosh, "impact": impact, "riser": riser, "wind": wind, "engine": engine_flyby,
    "engine_idle": engine_idle, "light": light_clunk, "tick": tick, "ticks": ticks, "flaps": flap_clicks,
    "shutter": shutter, "pop": ui_pop, "heartbeat": heartbeat, "crowd": crowd, "static": static_burst,
    "glitch": glitch, "cash": cash, "tv": tv_static,
}


def render_sfx(events: list[dict], total: float) -> np.ndarray:
    """events: [{type, t (sn), gain (dB), ...parametreler}]"""
    buf = np.zeros((n_of(total) + SR * 4, 2), np.float32)
    for ev in events:
        ev = dict(ev)
        kind = ev.pop("type")
        t = ev.pop("t")
        gain = ev.pop("gain", 0.0)
        fn = SFX[kind]
        if kind == "wind" and "curve" in ev:
            curve = ev.pop("curve")  # [[t,v],...] sahne içi
            dur = ev.get("dur", 4.0)
            tt = np.linspace(0, dur, n_of(dur))
            ev["intensity"] = np.interp(tt, [c[0] for c in curve], [c[1] for c in curve]).astype(np.float32)
        x = fn(**ev)
        dsp.place(buf, x, t, gain)
    return buf[: n_of(total)]
