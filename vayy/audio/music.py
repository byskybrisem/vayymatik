"""Prosedürel sinematik müzik (özgün; telifsiz). Anlatı bölümlerine göre düzenlenir.

Bölümler: hook → origin → rise → drive → break → climax → resolve
Re minör, i–VI–III–VII (Dm–B♭–F–C). Vuruşlar: zaman çizelgesindeki tam anlara konur.
"""
from __future__ import annotations

import numpy as np

from . import dsp
from .dsp import SR, n_of

# Re minör: akor kökleri (MIDI) ve akor tonları
CHORDS = [  # (kök, [akor tonları])
    (38, [50, 53, 57, 62]),   # Dm
    (34, [50, 53, 58, 62]),   # Bb (Bb-D-F)
    (41, [48, 53, 57, 60]),   # F
    (36, [48, 52, 55, 60]),   # C
]
PENTA = [62, 65, 67, 69, 72, 74, 77, 79]  # D F G A C D F G


class Music:
    def __init__(self, total: float, bpm: float = 120.0, seed: int = 7):
        self.total = total
        self.bpm = bpm
        self.beat = 60.0 / bpm
        self.bar = self.beat * 4
        self.seed = seed
        n = n_of(total) + SR * 4
        self.stems = {k: np.zeros((n, 2), np.float32) for k in ("drums", "bass", "pads", "keys", "fx", "lead")}

    # ---- zaman yardımcıları ----
    def chord_at(self, t: float, bars_per_chord: int = 2):
        idx = int(t // (self.bar * bars_per_chord)) % len(CHORDS)
        return CHORDS[idx]

    def grid(self, a: float, b: float, step: float):
        t0 = np.ceil(a / step - 1e-6) * step
        return [t for t in np.arange(t0, b - 1e-6, step)]

    # ---- enstrümanlar ----
    def kick(self, t, gain=0.0, big=False):
        n = n_of(0.55 if big else 0.4)
        f = 45 + (130 if big else 110) * np.exp(-dsp.tvec(n) / 0.035)
        body = dsp.sine(f, n) * dsp.expdec(n, 0.22 if big else 0.16)
        click = dsp.hp(dsp.noise(n_of(0.006), 3), 2500) * 0.5
        body[: len(click)] += click
        dsp.place(self.stems["drums"], dsp.saturate(body * 0.9, 1.6), t, gain)

    def snare(self, t, gain=0.0):
        n = n_of(0.35)
        nz = dsp.bp(dsp.noise(n, int(t * 100) % 97), 1200, 7000) * dsp.expdec(n, 0.09)
        tone = dsp.sine(185 * np.ones(n), n) * dsp.expdec(n, 0.05) * 0.6
        x = dsp.reverb((nz + tone) * 0.55, wet=0.22, decay=1.1, seed=5)
        dsp.place(self.stems["drums"], x, t, gain)

    def clap(self, t, gain=0.0):
        n = n_of(0.3)
        env = np.zeros(n, np.float32)
        for k, d in enumerate((0.0, 0.011, 0.022, 0.034)):
            i = n_of(d)
            env[i:] += np.exp(-np.arange(n - i) / (SR * (0.006 if k < 3 else 0.07)))
        x = dsp.bp(dsp.noise(n, 21), 900, 6000) * env * 0.45
        dsp.place(self.stems["drums"], dsp.reverb(x, wet=0.3, decay=1.4, seed=6), t, gain)

    def hat(self, t, gain=0.0, open_=False):
        n = n_of(0.22 if open_ else 0.05)
        x = dsp.hp(dsp.noise(n, int(t * 1000) % 991), 7500, 2) * dsp.expdec(n, 0.07 if open_ else 0.012) * 0.35
        dsp.place(self.stems["drums"], dsp.pan(x, 0.25), t, gain)

    def shaker(self, t, gain=0.0):
        n = n_of(0.08)
        env = np.sin(np.linspace(0, np.pi, n)) ** 3
        x = dsp.bp(dsp.noise(n, int(t * 997) % 1013), 6000, 9500) * env * 0.11
        dsp.place(self.stems["drums"], dsp.pan(x, -0.3), t, gain)

    def tom(self, t, gain=0.0, pitch=1.0):
        n = n_of(0.9)
        f = (62 + 70 * np.exp(-dsp.tvec(n) / 0.05)) * pitch
        x = dsp.sine(f, n) * dsp.expdec(n, 0.32)
        x += dsp.lp(dsp.noise(n, 31), 900) * dsp.expdec(n, 0.03) * 0.5
        dsp.place(self.stems["drums"], dsp.reverb(dsp.saturate(x * 0.8, 1.4), wet=0.35, decay=2.4, seed=8), t, gain)

    def sub(self, t, dur, midi, gain=0.0):
        n = n_of(dur)
        x = dsp.sine(dsp.midi_hz(midi), n) * dsp.adsr(n, 0.01, 0.2, 0.85, 0.15)
        x += dsp.sine(dsp.midi_hz(midi + 12), n) * 0.18 * dsp.adsr(n, 0.01, 0.2, 0.7, 0.15)
        dsp.place(self.stems["bass"], dsp.saturate(x * 0.7, 1.3), t, gain)

    def pulse(self, t, dur, midi, gain=0.0, cutoff=900):
        n = n_of(dur)
        f = dsp.midi_hz(midi)
        x = (dsp.saw(f, n) + dsp.saw(f * 1.006, n)) * 0.5
        env = dsp.adsr(n, 0.003, dur * 0.6, 0.25, 0.04)
        fc = cutoff * (0.5 + 1.8 * dsp.expdec(n, dur * 0.35))
        x = dsp.sweep_lp(x * env, fc, block=128)
        dsp.place(self.stems["bass"], dsp.saturate(x * 0.6, 1.5), t, gain)

    def pad(self, t, dur, notes, gain=0.0, bright=1500, attack=0.6):
        n = n_of(dur + 1.2)
        acc = np.zeros(n, np.float32)
        accR = np.zeros(n, np.float32)
        for j, m in enumerate(notes):
            f = dsp.midi_hz(m)
            for k, det in enumerate((-0.11, 0.0, 0.13)):
                ff = f * 2 ** (det / 12) * (1 + 0.0015 * np.sin(2 * np.pi * (0.2 + 0.07 * k) * dsp.tvec(n)))
                v = dsp.saw(ff, n, phase0=(j * 1.7 + k) % 6.28)
                if k % 2 == 0:
                    acc += v
                else:
                    accR += v
        env = dsp.adsr(n, attack, 0.5, 0.85, 1.1, hold=dur)
        lfo = bright * (1 + 0.25 * np.sin(2 * np.pi * 0.15 * dsp.tvec(n)))
        L = dsp.sweep_lp(acc * env, lfo, block=512)
        R = dsp.sweep_lp(accR * env, lfo * 1.07, block=512)
        x = np.stack([L * 0.8 + R * 0.2, R * 0.8 + L * 0.2], -1) * (0.11 / max(1, len(notes)) ** 0.5)
        dsp.place(self.stems["pads"], x, t, gain)

    def pluck(self, t, midi, gain=0.0, decay=0.45, pan_=0.0):
        n = n_of(decay * 2.2)
        f = dsp.midi_hz(midi)
        # FM pluck: parlak saldırı, yumuşak sönüm
        idx = 2.2 * dsp.expdec(n, 0.06)
        mod = np.sin(2 * np.pi * f * 2.0 * dsp.tvec(n)) * idx
        x = np.sin(2 * np.pi * f * dsp.tvec(n) + mod).astype(np.float32) * dsp.expdec(n, decay) * 0.22
        dsp.place(self.stems["keys"], dsp.pan(x, pan_), t, gain)

    def bell(self, t, midi, gain=0.0):
        n = n_of(2.5)
        f = dsp.midi_hz(midi)
        x = (np.sin(2 * np.pi * f * dsp.tvec(n) + 1.6 * dsp.expdec(n, 0.4) * np.sin(2 * np.pi * f * 3.5 * dsp.tvec(n)))).astype(np.float32)
        x *= dsp.expdec(n, 0.9) * 0.16
        dsp.place(self.stems["keys"], x, t, gain)

    def braam(self, t, root_midi=26, gain=0.0, dur=2.6):
        n = n_of(dur)
        acc = np.zeros(n, np.float32)
        for m, a in ((root_midi, 1.0), (root_midi + 12, 0.8), (root_midi + 19, 0.5), (root_midi + 24, 0.35)):
            for det in (-0.08, 0.07):
                acc += dsp.saw(dsp.midi_hz(m) * 2 ** (det / 12), n) * a
        env = dsp.adsr(n, 0.04, 0.6, 0.7, 1.2, hold=dur * 0.45)
        fc = 180 + 2600 * dsp.adsr(n, 0.12, 0.9, 0.25, 1.0, hold=dur * 0.3)
        x = dsp.sweep_lp(acc * env, fc, block=256)
        x = dsp.saturate(x * 0.25, 2.2) * 0.5
        x = dsp.reverb(x, wet=0.35, decay=3.0, seed=4)
        dsp.place(self.stems["fx"], x, t, gain)
        self.sub(t, dur * 0.8, root_midi + 12, gain - 2)

    def impact(self, t, gain=0.0):
        n = n_of(3.0)
        boom = dsp.sine(32 + 70 * np.exp(-dsp.tvec(n) / 0.08), n) * dsp.expdec(n, 0.7)
        crack = dsp.bp(dsp.noise(n, 77), 200, 5000) * dsp.expdec(n, 0.05) * 0.6
        x = dsp.reverb(dsp.saturate((boom + crack) * 0.9, 1.8), wet=0.4, decay=3.2, seed=9)
        dsp.place(self.stems["fx"], x, t, gain)

    def riser(self, t_end, dur, gain=0.0):
        n = n_of(dur)
        p = np.linspace(0, 1, n) ** 2
        nz = dsp.sweep_bp(dsp.noise(n, 55), 400 + 7000 * p, q=2.0)
        tone = dsp.saw(110 * 2 ** (2.5 * p), n) * 0.12
        tone = dsp.sweep_lp(tone, 300 + 5000 * p)
        env = p ** 1.5
        x = (nz * 0.6 + tone) * env
        x = dsp.reverb(x, wet=0.3, decay=1.5, seed=12)
        dsp.place(self.stems["fx"], x, t_end - dur, gain)

    def reverse_swell(self, t_end, dur=1.2, midi=62, gain=0.0):
        n = n_of(dur)
        x = np.zeros(n, np.float32)
        for m in (midi, midi + 7, midi + 12):
            x += dsp.saw(dsp.midi_hz(m), n) * 0.2
        x = dsp.lp(x, 2500) * (np.linspace(0, 1, n) ** 3)
        x = dsp.reverb(x, wet=0.5, decay=2.0, seed=13)[:n]
        dsp.place(self.stems["fx"], x, t_end - dur, gain)

    def choir(self, t, dur, notes, gain=0.0):
        n = n_of(dur + 1.0)
        acc = np.zeros(n, np.float32)
        for m in notes:
            f = dsp.midi_hz(m) * (1 + 0.004 * np.sin(2 * np.pi * 5.2 * dsp.tvec(n)))
            acc += dsp.saw(f, n) + dsp.saw(f * 1.004, n)
        # "aa" formantları
        y = dsp.bp(acc, 650, 1000, 1) * 1.0 + dsp.bp(acc, 1000, 1300, 1) * 0.6 + dsp.bp(acc, 2500, 3100, 1) * 0.25
        y = y * dsp.adsr(n, 0.7, 0.5, 0.9, 1.0, hold=dur) * 0.09
        dsp.place(self.stems["pads"], dsp.reverb(y, wet=0.45, decay=3.0, seed=14), t, gain)

    # ---- düzenleme ----
    def arrange(self, sections: dict[str, float], hits: list[tuple[float, str]], risers: list[tuple[float, float]]):
        """sections: {'hook':0, 'origin':t, 'rise':t, 'drive':t, 'break':t, 'climax':t, 'resolve':t, 'end':t}"""
        S = sections
        B, b = self.bar, self.beat
        order = ["hook", "origin", "rise", "drive", "break", "climax", "resolve", "end"]
        spans = {k: (S[k], S[order[i + 1]]) for i, k in enumerate(order[:-1])}

        # HOOK: drone + kalp atışı + gerilim
        a, e = spans["hook"]
        self.sub(a, e - a + 0.3, 26, -4)
        self.pad(a, e - a, [50, 57, 62], -6, bright=700, attack=0.2)
        for tt in np.arange(a + 0.05, e - 0.3, 1.0):
            self.kick(tt, -9)
            self.kick(tt + 0.28, -14)
        self.choir(a + 0.5, e - a, [74, 75], -14)  # yüksek küme (gerilim)

        # ORIGIN: pentatonik arpej + yumuşak ped + shaker
        a, e = spans["origin"]
        for i, tt in enumerate(self.grid(a, e, b / 2)):
            m = PENTA[[0, 2, 3, 4, 3, 2, 1, 2][i % 8]]
            self.pluck(tt, m, -5, decay=0.35, pan_=-0.4 if i % 2 else 0.4)
        for tt in self.grid(a, e, B * 2):
            root, notes = self.chord_at(tt)
            self.pad(tt, min(B * 2, e - tt), notes, -4, bright=1100)
            self.sub(tt, min(B * 2, e - tt), root, -6)
        for tt in self.grid(a, e, b / 2):
            self.shaker(tt, -14 if int(round(tt / (b / 2))) % 2 else -10)
        for tt in self.grid(a, e, b * 2):
            self.kick(tt, -8)

        # RISE: tomlar, 8'lik nabız bas, el çırpma
        a, e = spans["rise"]
        for tt in self.grid(a, e, b / 2):
            root, _ = self.chord_at(tt)
            self.pulse(tt, b / 2 * 0.9, root + 12, -7, cutoff=700 + 1200 * (tt - a) / max(1e-3, e - a))
        for i, tt in enumerate(self.grid(a, e, b)):
            self.tom(tt, -5, pitch=1.0 if i % 2 == 0 else 1.25)
            if i % 2 == 1:
                self.clap(tt, -6)
        for tt in self.grid(a, e, B * 2):
            _, notes = self.chord_at(tt)
            self.pad(tt, min(B * 2, e - tt), notes, -5, bright=1600)
        for tt in self.grid(a, e, b / 4):
            self.hat(tt, -10)

        # DRIVE: tam ritim
        a, e = spans["drive"]
        for i, tt in enumerate(self.grid(a, e, b)):
            self.kick(tt, -3)
            if i % 2 == 1:
                self.snare(tt, -4)
        for tt in self.grid(a, e, b / 4):
            root, _ = self.chord_at(tt)
            self.pulse(tt, b / 4 * 0.85, root + 12, -8, cutoff=1500)
        for tt in self.grid(a, e, b / 2):
            self.hat(tt, -12, open_=(int(round(tt / (b / 2))) % 4 == 3))
        for tt in self.grid(a, e, B * 2):
            root, notes = self.chord_at(tt)
            self.pad(tt, min(B * 2, e - tt), notes + [notes[-1] + 12], -5, bright=2200)
            self.sub(tt, min(B * 2, e - tt), root, -5)

        # BREAK: kısa boşluk + ters yükselme
        a, e = spans["break"]
        self.sub(a, e - a, 26, -8)
        self.reverse_swell(e, min(1.2, e - a + 0.4), 62, -4)

        # CLIMAX: braam + koro + taiko
        a, e = spans["climax"]
        for tt in self.grid(a - 0.01, e, B * 2):
            root, notes = self.chord_at(tt)
            self.braam(tt, root - 12 if root > 30 else root, -5, dur=min(2.8, e - tt + 0.6))
            self.choir(tt, min(B * 2, e - tt), [n + 12 for n in notes[:3]], -6)
            self.pad(tt, min(B * 2, e - tt), notes, -6, bright=2600)
        for i, tt in enumerate(self.grid(a, e, b)):
            self.kick(tt, -3, big=True)
            if i % 2 == 1:
                self.snare(tt, -4)
            self.tom(tt + b / 2, -9, pitch=1.3)
        for tt in self.grid(a, e, b / 4):
            root, _ = self.chord_at(tt)
            self.pulse(tt, b / 4 * 0.85, root + 24, -12, cutoff=2400)
            self.hat(tt, -11)

        # RESOLVE: davul yok, sıcak akorlar, çan; son akor döngü başına bağlanır
        a, e = spans["resolve"]
        prog_ = [CHORDS[1], CHORDS[3], CHORDS[0]]
        seg = (e - a) / len(prog_)
        for i, (root, notes) in enumerate(prog_):
            tt = a + i * seg
            self.pad(tt, seg + (0.8 if i == len(prog_) - 1 else 0.2), notes + [notes[0] + 12], -3, bright=1800, attack=0.25)
            self.sub(tt, seg, root, -6)
            self.bell(tt, notes[-1] + 12, -8)
        for i, tt in enumerate(self.grid(a, e, b / 2)):
            self.pluck(tt, PENTA[[4, 3, 2, 0][i % 4]] + 12, -12, decay=0.5, pan_=0.3 if i % 2 else -0.3)

        for t, kind in hits:
            if kind == "impact":
                self.impact(t, -2)
            elif kind == "braam":
                self.braam(t, 26, -3)
            elif kind == "boom":
                self.kick(t, -1, big=True)
                self.tom(t, -4, pitch=0.8)
        for t_end, dur in risers:
            self.riser(t_end, dur, -6)
        # bölüm dinamiği: anlatının yükselişini izleyen kazanç eğrisi (dB)
        self.arc = [(S["hook"], -1.5), (S["origin"], -4.0), (S["rise"], -2.0), (S["drive"], 0.0), (S["break"], -3.0), (S["climax"], 1.0), (S["resolve"], -3.0), (S["end"], -3.0)]

    def arrange_rise(self, sections: dict[str, float], hits: list[tuple[float, str]], risers: list[tuple[float, float]]):
        """Kısa sinematik yükseliş (6–15 sn reklam/demo): sections = {'dark', 'build', 'peak', 'end'}.
        dark: dron + kalp atışı + seyrek piyano · build: nabız bas, tomlar, yükselen ped · peak: braam + koro + taiko."""
        S = sections
        B, b = self.bar, self.beat
        a, e = S["dark"], S["build"]
        self.sub(a, e - a + 0.4, 26, -5)
        self.pad(a, e - a + 0.3, [50, 57, 62], -8, bright=600, attack=0.5)
        for tt in np.arange(a + 0.1, e - 0.2, 1.0):
            self.kick(tt, -11)
            self.kick(tt + 0.27, -16)
        for i, tt in enumerate(np.arange(a + 0.35, e - 0.3, b * 1.5)):
            self.pluck(tt, PENTA[[0, 3, 2, 4][i % 4]] - 12, -9, decay=0.9, pan_=-0.25 if i % 2 else 0.25)
        self.reverse_swell(e, min(1.4, e - a), 62, -6)

        a, e = S["build"], S["peak"]
        for tt in self.grid(a, e, b / 2):
            root, _ = self.chord_at(tt - a)
            k = (tt - a) / max(1e-3, e - a)
            self.pulse(tt, b / 2 * 0.9, root + 12, -9 + 3 * k, cutoff=500 + 2200 * k)
        for i, tt in enumerate(self.grid(a, e, b)):
            self.tom(tt, -9 + 5 * (tt - a) / max(1e-3, e - a), pitch=1.0 if i % 2 == 0 else 1.25)
        for tt in self.grid(a + (e - a) / 2, e, b / 4):
            self.hat(tt, -14)
        prog_ = [CHORDS[0], CHORDS[1]]
        seg = (e - a) / len(prog_)
        for i, (root, notes) in enumerate(prog_):
            self.pad(a + i * seg, seg + 0.2, notes, -6, bright=1200 + 900 * i, attack=0.3)
            self.sub(a + i * seg, seg, root, -7)
        self.choir(a + seg, seg, [n + 12 for n in prog_[1][1][:3]], -10)

        a, e = S["peak"], S["end"]
        root, notes = CHORDS[2]  # F majör: aydınlık çözülüş
        self.braam(a, 29, -4, dur=min(3.2, e - a + 0.5))
        self.kick(a, -1, big=True)
        self.choir(a, e - a, [n + 12 for n in notes[:3]], -6)
        self.pad(a, e - a + 0.5, notes + [notes[0] + 12], -4, bright=2600, attack=0.15)
        self.sub(a, e - a, root, -6)
        drum_end = a + (e - a) * 0.62
        for i, tt in enumerate(self.grid(a + b, drum_end, b)):
            self.kick(tt, -6, big=i % 2 == 0)
            self.tom(tt + b / 2, -10, pitch=1.3)
        for i, tt in enumerate(self.grid(a + b / 2, e - 0.4, b)):
            self.bell(tt, [72, 77, 81, 84, 81][i % 5], -11)

        for t, kind in hits:
            if kind == "impact":
                self.impact(t, -3)
            elif kind == "braam":
                self.braam(t, 26, -4)
            elif kind == "boom":
                self.kick(t, -1, big=True)
                self.tom(t, -4, pitch=0.8)
        for t_end, dur in risers:
            self.riser(t_end, dur, -6)
        self.arc = [(S["dark"], -3.0), (S["build"], -2.0), (S["peak"], 1.0), (S["end"] - 0.6, 0.0), (S["end"], -2.0)]

    def mix(self) -> np.ndarray:
        g = {"drums": 0.0, "bass": -1.0, "pads": 0.0, "keys": -1.0, "fx": 0.0, "lead": 0.0}
        out = sum(self.stems[k] * 10 ** (g[k] / 20) for k in self.stems)
        arc = getattr(self, "arc", None)
        if arc:
            tt = np.arange(len(out)) / SR
            ts = [a for a, _ in arc]
            gs = [b for _, b in arc]
            # bölüm geçişlerinde 0,4 sn yumuşak kazanç değişimi
            pts_t, pts_g = [], []
            for i, (t0, g0) in enumerate(arc):
                if i:
                    pts_t.append(max(t0 - 0.4, pts_t[-1] + 1e-3)); pts_g.append(pts_g[-1])
                pts_t.append(t0 if not i else max(t0, pts_t[-1] + 1e-3)); pts_g.append(g0)
            gain_db = np.interp(tt, pts_t, pts_g)
            out = out * (10 ** (gain_db / 20))[:, None]
        out = dsp.compress(out, thr_db=-14, ratio=2.5, attack=0.01, release=0.2, makeup_db=2)
        out = dsp.hp(out, 28, 2)
        return out[: n_of(self.total)].astype(np.float32)


def compose(total: float, sections: dict[str, float], hits, risers, bpm=120.0, seed=7, style: str = "story") -> np.ndarray:
    """style: 'story' (8 bölümlü anlatı, 30–60 sn) · 'rise' (kısa sinematik yükseliş: dark/build/peak/end)."""
    m = Music(total, bpm=bpm, seed=seed)
    (m.arrange_rise if style == "rise" else m.arrange)(sections, hits, risers)
    return m.mix()
