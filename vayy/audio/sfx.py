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


# ---------------- Derinkuyu: yeraltı ortam sesleri (özgün sentez) ----------------
def surface_air(dur=3.4, seed=31):
    """Yeryüzü: hafif rüzgâr + seyrek uzak kuş cıvıltısı."""
    n = n_of(dur)
    t = dsp.tvec(n)
    base = dsp.lp(dsp.pink(n, seed), 650, 2)
    mod = 0.55 + 0.45 * np.sin(2 * np.pi * 0.23 * t + 0.8) * np.sin(2 * np.pi * 0.07 * t + 2.0)
    x = base * mod * 1.6 + dsp.bp(dsp.noise(n, seed + 1), 900, 2400, 1) * 0.12 * mod
    r = dsp.rng(seed)
    for _ in range(5):
        tt = r.uniform(0.2, max(0.3, dur - 0.5))
        m = n_of(0.11)
        f = r.uniform(3200, 4600)
        ch = np.sin(2 * np.pi * (f * (1 + 0.25 * np.linspace(0, 1, m) ** 0.7)) * dsp.tvec(m)) * dsp.expdec(m, 0.035) * 0.05
        i = n_of(tt)
        x[i:i + m] += ch[: len(x) - i]
    env = dsp.adsr(n, 0.5, 0.2, 1.0, 0.8)
    return dsp.reverb(dsp.pan(x * env, np.linspace(-0.4, 0.4, n)), wet=0.25, decay=1.6, seed=seed)


def descent(dur=2.8, seed=32):
    """Yeraltına iniş: derin sinematik geçiş (inen sinüs + düşen filtreli gürültü + alt uğultu)."""
    n = n_of(dur)
    p = np.linspace(0, 1, n)
    f = 95 * np.exp(-p * 1.25) + 24
    sub = np.sin(dsp.phase_from_freq(f, n)) * (np.sin(np.pi * p ** 0.8) ** 1.2) * 0.9
    air = dsp.sweep_bp(dsp.noise(n, seed), 4200 * (1 - p) ** 1.6 + 160, q=1.1) * np.sin(np.pi * p ** 0.6) ** 2 * 0.9
    rum = dsp.lp(dsp.pink(n, seed + 1), 120, 2) * p ** 0.6 * 2.2
    return dsp.reverb(dsp.stereo((sub + air + rum) * 0.6), wet=0.32, decay=2.4, seed=seed)


def rock_crumble(dur=1.6, seed=33, density=26.0):
    """Toprak/kaya ufalanması: rastgele kırıntı darbeleri + alçak sürtünme."""
    n = n_of(dur)
    r = dsp.rng(seed)
    out = np.zeros(n, np.float32)
    for _ in range(int(dur * density)):
        t0 = r.uniform(0, dur * 0.92)
        m = n_of(r.uniform(0.02, 0.09))
        f = r.uniform(250, 2600)
        b = dsp.bp(dsp.noise(m, int(r.integers(0, 10_000))), f * 0.6, f * 1.5, 1) * dsp.expdec(m, r.uniform(0.01, 0.035)) * r.uniform(0.2, 1.0)
        i = n_of(t0)
        out[i:i + m] += b[: n - i]
    env = np.sin(np.pi * np.linspace(0, 1, n) ** 0.7) ** 0.8
    low = dsp.lp(dsp.pink(n, seed + 3), 230, 2) * env * 1.2
    return dsp.reverb(dsp.stereo((out * 1.6 + low) * 0.7), wet=0.3, decay=1.5, seed=seed)


def stone_roll(dur=2.0, seed=34, thump_rate0=0.9, thump_rate1=3.2):
    """Yuvarlanan ağır taş kapı: alçak sürtünme + derin mekanik gürültü + her turda artan tok darbeler."""
    n = n_of(dur)
    t = dsp.tvec(n)
    p = np.linspace(0, 1, n)
    env = dsp.adsr(n, 0.25, 0.1, 1.0, 0.18)
    grind = dsp.sweep_lp(dsp.pink(n, seed), 260 + 380 * p) * (0.7 + 0.3 * np.sin(2 * np.pi * (6 + 10 * p) * t)) * 2.4
    grit = dsp.bp(dsp.noise(n, seed + 1), 600, 3200, 1) * (0.25 + 0.4 * p) * (0.5 + 0.5 * np.sin(2 * np.pi * (14 + 22 * p) * t + 1.3)) * 0.45
    mech = np.sin(dsp.phase_from_freq(38 + 16 * p, n)) * 0.55 * (0.6 + 0.4 * np.sin(2 * np.pi * 3.1 * t))
    x = (grind + grit + mech) * env
    ph = 0.0
    thump = np.zeros(n, np.float32)
    k = 0
    while True:
        rate = thump_rate0 + (thump_rate1 - thump_rate0) * (ph / max(dur, 1e-6))
        ph += 1.0 / rate
        if ph >= dur - 0.05:
            break
        m = n_of(0.22)
        i = n_of(ph)
        th = np.sin(dsp.phase_from_freq(70 * np.exp(-dsp.tvec(m) / 0.09) + 34, m)) * dsp.expdec(m, 0.09) * (0.5 + 0.5 * ph / dur)
        thump[i:i + m] += th[: n - i]
        k += 1
    return dsp.reverb(dsp.stereo(dsp.saturate((x + thump * 1.3) * 0.6, 1.5)), wet=0.28, decay=1.4, seed=seed)


def door_slam(size=1.0, seed=35):
    """Kapının kapanması: güçlü ama rahatsız etmeyen alçak bas darbesi + kısa taş çatırtısı."""
    n = n_of(3.0 * size)
    t = dsp.tvec(n)
    boom = np.sin(dsp.phase_from_freq(32 + 62 * np.exp(-t / 0.07), n)) * dsp.expdec(n, 0.7 * size)
    body = dsp.lp(dsp.noise(n, seed), 420, 2) * dsp.expdec(n, 0.12) * 1.1
    crack = dsp.bp(dsp.noise(n, seed + 1), 300, 1400, 1) * dsp.expdec(n, 0.03) * 0.5
    tail = dsp.lp(dsp.pink(n, seed + 2), 140, 2) * dsp.expdec(n, 1.2 * size) * 0.9
    x = dsp.saturate((boom * 1.1 + body + crack + tail) * 0.8, 1.7)
    return dsp.reverb(dsp.stereo(x), wet=0.4, decay=2.8 * size, damp=2500, seed=seed)


def footsteps(times=None, seed=36, gain_var=0.25, wet=0.5, decay=1.7, pitch=1.0):
    """Yankılı ayak sesleri: times = başlangıçtan saniye listesi; her adım taş zeminde tok vuruş + yankı."""
    times = times or [0.0, 0.55, 1.1, 1.65]
    dur = max(times) + 0.6
    n = n_of(dur)
    r = dsp.rng(seed)
    out = np.zeros(n, np.float32)
    for k, tt in enumerate(times):
        m = n_of(0.16)
        f = 150 * pitch * r.uniform(0.85, 1.2)
        step = dsp.bp(dsp.noise(m, seed + k), f, f * 5.5, 1) * dsp.expdec(m, 0.03) + np.sin(2 * np.pi * f * 0.5 * dsp.tvec(m)) * dsp.expdec(m, 0.05) * 0.6
        step *= 1 - gain_var * r.uniform(0, 1)
        i = n_of(tt)
        out[i:i + m] += step[: n - i]
    pan = np.where(np.arange(n) % 2 == 0, 0.0, 0.0)
    return dsp.reverb(dsp.stereo(out * 1.2), wet=wet, decay=decay, damp=3500, seed=seed)


def torch_crackle(dur=4.0, seed=37):
    """Meşale: hafif ateş çıtırtısı + yumuşak 'hışırtı'."""
    n = n_of(dur)
    r = dsp.rng(seed)
    out = np.zeros(n, np.float32)
    for _ in range(int(dur * 11)):
        t0 = r.uniform(0, dur - 0.03)
        m = n_of(r.uniform(0.004, 0.02))
        c = dsp.hp(dsp.noise(m, int(r.integers(0, 10_000))), 1800) * dsp.expdec(m, 0.004) * r.uniform(0.3, 1.0)
        i = n_of(t0)
        out[i:i + m] += c[: n - i]
    flick = 0.6 + 0.4 * np.sin(2 * np.pi * 1.7 * dsp.tvec(n) + 0.5) * np.sin(2 * np.pi * 0.5 * dsp.tvec(n))
    hiss = dsp.bp(dsp.noise(n, seed + 5), 700, 2600, 1) * 0.07 * flick
    env = dsp.adsr(n, 0.3, 0.1, 1.0, 0.4)
    return dsp.stereo((out * 0.9 + hiss) * env)


def murmur(dur=6.0, seed=38):
    """Yaşam alanları: uzak ve düşük seviyeli insan ortam sesi (formant süzgeçli, hece ritimli gürültü)."""
    n = n_of(dur)
    t = dsp.tvec(n)
    r = dsp.rng(seed)
    acc = np.zeros((n, 2), np.float32)
    for k in range(7):
        f1 = r.uniform(380, 720)
        f2 = r.uniform(1100, 1900)
        src = dsp.bp(dsp.noise(n, seed + k), f1 * 0.85, f1 * 1.2, 1) + 0.5 * dsp.bp(dsp.noise(n, seed + 20 + k), f2 * 0.85, f2 * 1.2, 1)
        syl = np.clip(np.sin(2 * np.pi * r.uniform(2.6, 4.6) * t + r.uniform(0, 6)), 0, 1) ** 1.4
        gate = np.clip(np.sin(2 * np.pi * r.uniform(0.12, 0.3) * t + r.uniform(0, 6)) + 0.35, 0, 1)
        acc += dsp.pan(src * syl * gate, r.uniform(-0.8, 0.8))
    env = dsp.adsr(n, 0.8, 0.2, 1.0, 0.9)
    return dsp.reverb(dsp.lp(acc, 2200, 2) * env[:, None] * 0.55, wet=0.55, decay=2.2, seed=seed)


def shaft_wind(dur=4.0, intensity=None, seed=39):
    """Havalandırma bacası: hava akışı + alçak rüzgâr uğultusu (boru rezonansı)."""
    n = n_of(dur)
    t = dsp.tvec(n)
    if intensity is None:
        intensity = np.ones(n)
    hum = (np.sin(2 * np.pi * 96 * t + 0.4 * np.sin(2 * np.pi * 0.31 * t)) * 0.5 + np.sin(2 * np.pi * 144 * t) * 0.3 + np.sin(2 * np.pi * 191 * t) * 0.15) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.27 * t))
    air = dsp.sweep_bp(dsp.noise(n, seed), 420 + 900 * intensity, q=1.4) * 0.9
    low = dsp.lp(dsp.pink(n, seed + 1), 280, 2) * 1.8
    x = (hum * 0.55 + air + low) * intensity
    return dsp.reverb(dsp.pan(x * 0.7, np.linspace(-0.3, 0.3, n)), wet=0.35, decay=2.0, seed=seed)


def drip(times=None, seed=40):
    """Su kuyusu: damlayan su + doğal yankı."""
    times = times or [0.0, 1.1, 2.4]
    n = n_of(max(times) + 2.5)
    r = dsp.rng(seed)
    out = np.zeros(n, np.float32)
    for tt in times:
        m = n_of(0.18)
        f = r.uniform(1100, 1700)
        d = np.sin(dsp.phase_from_freq(f * (1 - 0.35 * np.linspace(0, 1, m)), m)) * dsp.expdec(m, 0.035) * 0.5
        i = n_of(tt)
        out[i:i + m] += d[: n - i]
    return dsp.reverb(dsp.delay(dsp.stereo(out), t=0.33, fb=0.4, mix=0.35), wet=0.5, decay=2.6, damp=5000, seed=seed)


def mystery_drone(dur=6.0, seed=41):
    """Final: gizemli yeraltı atmosferi (alçak dron + yavaş vuran detune + hafif parıltı)."""
    n = n_of(dur)
    t = dsp.tvec(n)
    x = np.sin(2 * np.pi * 36.7 * t) * 0.8 + np.sin(2 * np.pi * 73.4 * t * 1.003) * 0.35
    x += dsp.lp(dsp.saw(146.8, n) + dsp.saw(146.8 * 1.007, n), 420, 2) * 0.25
    x += dsp.bp(dsp.noise(n, seed), 2400, 5200, 1) * 0.015 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * t))
    env = dsp.adsr(n, 1.2, 0.2, 1.0, 1.4)
    return dsp.reverb(dsp.stereo(x * env * 0.8), wet=0.5, decay=3.4, seed=seed)


SFX = {
    "whoosh": whoosh, "impact": impact, "riser": riser, "wind": wind, "engine": engine_flyby,
    "engine_idle": engine_idle, "light": light_clunk, "tick": tick, "ticks": ticks, "flaps": flap_clicks,
    "shutter": shutter, "pop": ui_pop, "heartbeat": heartbeat, "crowd": crowd, "static": static_burst,
    "glitch": glitch, "cash": cash, "tv": tv_static,
    "surface_air": surface_air, "descent": descent, "rock_crumble": rock_crumble, "stone_roll": stone_roll, "door_slam": door_slam,
    "footsteps": footsteps, "torch": torch_crackle, "murmur": murmur, "shaft_wind": shaft_wind, "drip": drip, "mystery_drone": mystery_drone,
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
        if kind in ("wind", "shaft_wind") and "curve" in ev:
            curve = ev.pop("curve")  # [[t,v],...] sahne içi
            dur = ev.get("dur", 4.0)
            tt = np.linspace(0, dur, n_of(dur))
            ev["intensity"] = np.interp(tt, [c[0] for c in curve], [c[1] for c in curve]).astype(np.float32)
        x = fn(**ev)
        dsp.place(buf, x, t, gain)
    return buf[: n_of(total)]
