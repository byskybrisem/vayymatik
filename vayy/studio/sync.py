"""Measure Foley placement in the delivered audio stream against baked visual beats."""
import subprocess

import numpy as np
from scipy.signal import correlate, sosfilt, butter

from ..audio.sfx import SFX, SR


def measure(video, events, fps):
    data = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(video), "-map", "0:a:0",
                                    "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
    band = butter(3, [750, 4000], btype="bandpass", fs=SR, output="sos")
    audio = sosfilt(band, np.frombuffer(data, dtype="<f4"))
    rows = []
    for ev in events:
        frame = ev["visual_frame"]
        center = round(frame * SR / fps)
        reference = SFX[ev.get("type", "ball_contact")](**ev.get("parameters", {})).mean(axis=1)
        reference = sosfilt(band, reference)[:round(.032 * SR)]
        start = max(0, center - round(.10 * SR))
        end = min(len(audio), center + round(.10 * SR) + len(reference))
        window = audio[start:end]
        offset, score = None, 0.
        if len(window) >= len(reference):
            corr = correlate(window, reference, mode="valid", method="fft")
            power = np.r_[0., np.cumsum(window**2)]
            norm = np.sqrt(np.maximum(0, power[len(reference):] - power[:-len(reference)]))
            corr /= np.maximum(1e-12, np.linalg.norm(reference) * norm)
            pos = int(np.argmax(corr))
            score = float(corr[pos])
            if score >= .32:
                offset = round((start + pos - center) * 1000 / SR, 2)
        rows.append(dict(type=ev.get("type", "ball_contact"), visual_frame=frame,
                         offset_ms=offset, correlation=round(score, 3)))
    return rows
