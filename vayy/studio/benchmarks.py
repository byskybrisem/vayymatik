"""Render short native Cycles clips, mux simulation-driven Foley, verify and package."""
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import soundfile as sf

from ..audio.sfx import render_sfx, SR
from ..paths import deliver_dir
from . import render, check_clip
from .doctor import inventory
from .sync import measure


def package():
    out = deliver_dir("studio-benchmarks")
    (out / "Environment.json").write_text(json.dumps(inventory(), indent=2))
    shots = [("fracture", "short-orbit"), ("water-baffle", "dolly"),
             ("fire-plume", "handheld"), ("underground-section", "dolly"),
             ("factory-bay", "short-orbit"), ("rotor-section", "short-orbit")]
    report = {}
    for name, camera in shots:
        fps, frames, size = 30, 36, [384, 512]
        raw = render(dict(template=name, samples=10, cameraProfile=camera), *size, fps, frames)
        beats = json.loads(raw.with_suffix(".json").read_text())
        if name in {"fracture", "water-baffle", "fire-plume"} and not beats:
            raise ValueError(f"{name}: bake produced no observable event")
        final = out / (name + ".mp4")
        measured = []
        if beats:
            events = [dict(type=b["type"], t=b["frame"]/fps, seed=b["frame"]+42, gain=-8)
                      for b in beats]
            audio = render_sfx(events, frames / fps)
            with tempfile.TemporaryDirectory() as temp:
                wav = Path(temp) / "events.wav"
                sf.write(wav, audio, SR, subtype="PCM_24")
                subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-i", str(wav),
                                "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac",
                                "-b:a", "256k", "-movflags", "+faststart", str(final)], check=True)
            measured = measure(final, [dict(type=b["type"], visual_frame=b["frame"],
                                         parameters={"seed":b["frame"]+42}) for b in beats], fps)
        else:
            shutil.copyfile(raw, final)
        check_clip(final, dict(frames=frames, size=size, fps=fps))
        report[name] = dict(frames=frames, fps=fps, size=size, camera=camera, beats=beats,
                            measured_aac=measured, cache=raw.stem)
        (out / "Benchmark-QA.json").write_text(json.dumps(report, indent=2))
        if any(b["offset_ms"] is None or abs(b["offset_ms"]) > 1000/fps for b in measured):
            raise ValueError(f"{name}: AAC contact sync failed")
        print(name, beats, flush=True)


if __name__ == "__main__":
    package()
