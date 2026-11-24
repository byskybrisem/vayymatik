"""Temel DSP araçları (numpy/scipy). Tüm sinyaller float32, 48 kHz."""
from __future__ import annotations

import numpy as np
from scipy import signal

SR = 48000


def secs(n: int) -> float:
    return n / SR


def n_of(t: float) -> int:
    return int(round(t * SR))


def rng(seed: int) -> np.random.Generator:
    return np.random.default_rng(seed)


def tvec(n: int) -> np.ndarray:
    return np.arange(n, dtype=np.float64) / SR


# ---------- osilatörler ----------
def phase_from_freq(freq: np.ndarray | float, n: int, phase0: float = 0.0) -> np.ndarray:
    f = np.broadcast_to(np.asarray(freq, dtype=np.float64), (n,))
    return phase0 + 2 * np.pi * np.cumsum(f) / SR


def sine(freq, n, phase0=0.0) -> np.ndarray:
    return np.sin(phase_from_freq(freq, n, phase0)).astype(np.float32)


def saw(freq, n, phase0=0.0) -> np.ndarray:
    """PolyBLEP testere (örtüşmesiz)."""
    f = np.broadcast_to(np.asarray(freq, dtype=np.float64), (n,))
    dt = f / SR
    ph = (phase0 / (2 * np.pi) + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    # polyBLEP düzeltmesi
    m1 = ph < dt
    t1 = ph[m1] / dt[m1]
    y[m1] -= t1 + t1 - t1 * t1 - 1
    m2 = ph > 1 - dt
    t2 = (ph[m2] - 1) / dt[m2]
    y[m2] -= t2 * t2 + t2 + t2 + 1
    return y.astype(np.float32)


def square(freq, n, phase0=0.0) -> np.ndarray:
    a = saw(freq, n, phase0)
    b = saw(freq, n, phase0 + np.pi)
    return (a - b) * 0.5


def tri(freq, n, phase0=0.0) -> np.ndarray:
    ph = phase_from_freq(freq, n, phase0) / (2 * np.pi)
    return (2 * np.abs(2 * (ph % 1.0) - 1) - 1).astype(np.float32)


def noise(n, seed=0) -> np.ndarray:
    return rng(seed).standard_normal(n).astype(np.float32)


def pink(n, seed=0) -> np.ndarray:
    w = np.fft.rfft(rng(seed).standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = f[1]
    y = np.fft.irfft(w / np.sqrt(f), n)
    return (y / (np.abs(y).max() + 1e-9)).astype(np.float32)


# ---------- zarflar ----------
def adsr(n, a=0.01, d=0.1, s=0.7, r=0.2, hold=None) -> np.ndarray:
    """n örneklik nota; 'hold' sn sonra release başlar (varsayılan: n - r)."""
    env = np.zeros(n, dtype=np.float32)
    na, nd, nr = n_of(a), n_of(d), n_of(r)
    nh = n_of(hold) if hold is not None else max(0, n - nr)
    i = 0
    seg = min(na, n)
    env[:seg] = np.linspace(0, 1, max(1, seg), endpoint=False)[:seg]
    i = seg
    seg = min(nd, max(0, nh - i))
    if seg > 0:
        env[i:i + seg] = np.linspace(1, s, seg, endpoint=False)
        i += seg
    if nh > i:
        env[i:nh] = s
        i = nh
    if i < n:
        start = env[i - 1] if i > 0 else s
        env[i:] = start * np.exp(-np.arange(n - i) / max(1, nr) * 5.0)
    return env


def expdec(n, tau) -> np.ndarray:
    return np.exp(-tvec(n) / max(1e-4, tau)).astype(np.float32)


def fade(x: np.ndarray, fin=0.005, fout=0.01) -> np.ndarray:
    y = x.copy()
    a, b = n_of(fin), n_of(fout)
    if a:
        y[:a] *= np.linspace(0, 1, a)[(...,) + (None,) * (y.ndim - 1)]
    if b:
        y[-b:] *= np.linspace(1, 0, b)[(...,) + (None,) * (y.ndim - 1)]
    return y


# ---------- filtreler ----------
def _sos(kind, f, order=2, q=None):
    f = np.clip(np.asarray(f, dtype=float), 10, SR / 2 * 0.95)
    if kind == "bp":
        return signal.butter(order, f, btype="bandpass", fs=SR, output="sos")
    return signal.butter(order, f, btype={"lp": "lowpass", "hp": "highpass"}[kind], fs=SR, output="sos")


def lp(x, f, order=2):
    return signal.sosfilt(_sos("lp", f, order), x, axis=0).astype(np.float32)


def hp(x, f, order=2):
    return signal.sosfilt(_sos("hp", f, order), x, axis=0).astype(np.float32)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(_sos("bp", [lo, hi], order), x, axis=0).astype(np.float32)


def sweep_lp(x: np.ndarray, f_curve: np.ndarray, block=256, order=2) -> np.ndarray:
    """Zamanla değişen alçak geçiren (blok blok, durum taşınarak)."""
    y = np.zeros_like(x)
    zi = None
    for i in range(0, len(x), block):
        f = float(np.mean(f_curve[i:i + block]))
        sos = _sos("lp", f, order)
        if zi is None or zi.shape[0] != sos.shape[0]:
            zi = np.zeros((sos.shape[0], 2) + x.shape[1:])
        y[i:i + block], zi = signal.sosfilt(sos, x[i:i + block], axis=0, zi=zi)
    return y.astype(np.float32)


def sweep_bp(x: np.ndarray, f_curve: np.ndarray, q=1.5, block=256) -> np.ndarray:
    y = np.zeros_like(x)
    zi = None
    for i in range(0, len(x), block):
        fc = float(np.mean(f_curve[i:i + block]))
        lo, hi = fc / (1 + 0.5 / q), fc * (1 + 0.5 / q)
        sos = _sos("bp", [max(20, lo), min(SR / 2 * 0.9, hi)], 1)
        if zi is None:
            zi = np.zeros((sos.shape[0], 2) + x.shape[1:])
        y[i:i + block], zi = signal.sosfilt(sos, x[i:i + block], axis=0, zi=zi)
    return y.astype(np.float32)


def peak_eq(x, f0, gain_db, q=1.0):
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    alpha = np.sin(w0) / (2 * q)
    b = [1 + alpha * A, -2 * np.cos(w0), 1 - alpha * A]
    a = [1 + alpha / A, -2 * np.cos(w0), 1 - alpha / A]
    return signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0).astype(np.float32)


def shelf(x, f0, gain_db, high=True):
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    alpha = np.sin(w0) / 2 * np.sqrt(2)
    c = np.cos(w0)
    sA = 2 * np.sqrt(A) * alpha
    if high:
        b = [A * ((A + 1) + (A - 1) * c + sA), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sA)]
        a = [(A + 1) - (A - 1) * c + sA, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sA]
    else:
        b = [A * ((A + 1) - (A - 1) * c + sA), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sA)]
        a = [(A + 1) + (A - 1) * c + sA, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sA]
    return signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0).astype(np.float32)


# ---------- efektler ----------
def saturate(x, drive=2.0):
    return (np.tanh(x * drive) / np.tanh(drive)).astype(np.float32)


def pan(mono: np.ndarray, p: float | np.ndarray = 0.0) -> np.ndarray:
    """-1 sol … +1 sağ, eşit güç."""
    th = (np.asarray(p) + 1) * np.pi / 4
    return np.stack([mono * np.cos(th), mono * np.sin(th)], axis=-1).astype(np.float32)


def stereo(x):
    return x if x.ndim == 2 else np.stack([x, x], axis=-1)


_IR_CACHE: dict = {}


def reverb_ir(decay=2.2, predelay=0.02, damp=6000.0, seed=11, width=1.0) -> np.ndarray:
    key = (round(decay, 3), round(predelay, 3), round(damp), seed, width)
    if key in _IR_CACHE:
        return _IR_CACHE[key]
    n = n_of(decay * 1.4 + predelay)
    r = rng(seed)
    ir = r.standard_normal((n, 2)).astype(np.float32)
    ir[:, 1] = ir[:, 1] * width + ir[:, 0] * (1 - width)
    t = tvec(n)[:, None]
    ir *= np.exp(-t * 6.9 / decay)
    # yüksek frekanslar daha hızlı sönsün
    lo = lp(ir, damp, 1)
    ir = lo * 0.75 + ir * 0.25 * np.exp(-t * 18)
    ir[: n_of(predelay)] = 0
    ir /= np.sqrt((ir ** 2).sum(axis=0, keepdims=True)) + 1e-9
    _IR_CACHE[key] = ir
    return ir


def reverb(x: np.ndarray, wet=0.25, decay=2.2, predelay=0.02, damp=6000.0, seed=11) -> np.ndarray:
    xs = stereo(x)
    ir = reverb_ir(decay, predelay, damp, seed)
    yl = signal.fftconvolve(xs[:, 0], ir[:, 0])[: len(xs)]
    yr = signal.fftconvolve(xs[:, 1], ir[:, 1])[: len(xs)]
    y = np.stack([yl, yr], axis=-1).astype(np.float32)
    return (xs * (1 - wet * 0.5) + y * wet).astype(np.float32)


def delay(x: np.ndarray, t=0.25, fb=0.35, mix=0.25, pingpong=True) -> np.ndarray:
    xs = stereo(x).copy()
    d = n_of(t)
    out = xs.copy()
    tap = xs * mix
    for k in range(1, 6):
        tap = tap * (fb if k > 1 else 1.0)
        sh = d * k
        if sh >= len(xs):
            break
        seg = tap[: len(xs) - sh]
        if pingpong and k % 2 == 1:
            seg = seg[:, ::-1]
        out[sh:] += seg
    return out.astype(np.float32)


def env_follow(x: np.ndarray, attack=0.005, release=0.12) -> np.ndarray:
    """Tepe zarf izleyici (vektörel, iki yönlü ön-süzgeç)."""
    a = np.abs(stereo(x)).max(axis=1).astype(np.float64)
    ka = np.exp(-1 / (attack * SR))
    kr = np.exp(-1 / (release * SR))
    # hızlı yaklaşım: release süzgeci + attack süzgeci
    y = signal.lfilter([1 - kr], [1, -kr], a)
    y = np.maximum(y, signal.lfilter([1 - ka], [1, -ka], a))
    return y.astype(np.float32)


def compress(x: np.ndarray, thr_db=-18, ratio=3.0, attack=0.005, release=0.15, makeup_db=0.0, knee_db=6.0) -> np.ndarray:
    env = env_follow(x, attack, release)
    lvl = 20 * np.log10(env + 1e-9)
    over = lvl - thr_db
    gr = np.where(over <= -knee_db / 2, 0.0,
                  np.where(over >= knee_db / 2, over * (1 - 1 / ratio),
                           (over + knee_db / 2) ** 2 / (2 * knee_db) * (1 - 1 / ratio)))
    g = 10 ** ((-gr + makeup_db) / 20)
    return (stereo(x) * g[:, None] if x.ndim == 2 else x * g).astype(np.float32)


def limiter(x: np.ndarray, ceiling_db=-1.0, release=0.08, lookahead=0.004) -> np.ndarray:
    xs = stereo(x)
    c = 10 ** (ceiling_db / 20)
    la = n_of(lookahead)
    peak = np.abs(xs).max(axis=1)
    # ileri bakışlı tepe: pencere maksimumu
    from scipy.ndimage import maximum_filter1d
    pk = maximum_filter1d(peak, size=2 * la + 1)
    need = np.minimum(1.0, c / (pk + 1e-9))
    kr = np.exp(-1 / (release * SR))
    # kazancı yumuşat: düşüş anında, toparlanma yavaş
    g = signal.lfilter([1 - kr], [1, -kr], 1 - need)
    g = 1 - np.maximum(1 - need, g)
    y = xs * g[:, None]
    return np.clip(y, -c, c).astype(np.float32)


def place(buf: np.ndarray, x: np.ndarray, t: float, gain_db: float = 0.0) -> None:
    """x'i buf içine t saniyeye ekle (stereo uyumlu)."""
    i = n_of(t)
    xs = stereo(x) if buf.ndim == 2 else x
    if i < 0:
        xs = xs[-i:]
        i = 0
    if i >= len(buf):
        return
    m = min(len(xs), len(buf) - i)
    buf[i:i + m] += xs[:m] * (10 ** (gain_db / 20))


def db(x):
    return 20 * np.log10(np.maximum(1e-9, x))


def midi_hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)
