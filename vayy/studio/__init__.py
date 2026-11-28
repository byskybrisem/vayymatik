"""Content-addressed Cycles shots for the existing Remotion timeline."""
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from ..paths import CACHE

SCRIPT = Path(__file__).with_name("blender_scene.py")
CATALOG = SCRIPT.with_name("assets.json")


def asset_catalog():
    return json.loads(CATALOG.read_text(encoding="utf-8"))


def check_clip(path, job):
    raw = subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_streams",
        "-of", "json", str(path)])
    stream = json.loads(raw)["streams"][0]
    from fractions import Fraction
    if ([stream["width"], stream["height"]] != job["size"]
        or int(stream["nb_frames"]) != job["frames"]
        or Fraction(stream["avg_frame_rate"]) != job["fps"]):
        raise ValueError("Blender klip boyutu, FPS veya kare sayısı hatalı")
    subprocess.run(["ffmpeg", "-v", "error", "-xerror", "-i", str(path),
                    "-f", "null", "-"], check=True)


def render(props, width, height, fps, frames):
    if props.get("template") != "rotor-section":
        raise ValueError("Desteklenen Blender şablonu: rotor-section")
    blender = shutil.which("blender")
    if not blender:
        raise RuntimeError("Bu sahne Blender gerektiriyor. Ortamda blender bulunamadı.")
    version = subprocess.check_output([blender, "-v"], text=True).splitlines()[0]
    job = dict(size=[width, height], fps=fps, frames=frames,
               samples=int(props.get("samples", 16)), seed=int(props.get("seed", 7)))
    if min(width, height, frames, fps, job["samples"]) < 1 or width % 2 or height % 2:
        raise ValueError("Boyutlar pozitif ve çift, örnek ve kare sayıları pozitif olmalı")
    limits = asset_catalog()[props["template"]]["parameters"]["teeth"]
    teeth = props.get("teeth", limits["default"])
    if type(teeth) is not int or not limits["min"] <= teeth <= limits["max"]:
        raise ValueError(f"Rotor diş sayısı {limits['min']}–{limits['max']} arasında bir tam sayı olmalı")
    job["teeth"] = teeth
    sources = SCRIPT.read_bytes() + SCRIPT.with_name("mechanical.py").read_bytes()
    key = hashlib.sha256(sources + CATALOG.read_bytes() + version.encode() +
                         json.dumps(job, sort_keys=True).encode()).hexdigest()
    cache = CACHE / "cinema"
    cache.mkdir(parents=True, exist_ok=True)
    clip = cache / (key + ".mp4")
    if clip.exists():
        try:
            check_clip(clip, job)
            return clip
        except (ValueError, KeyError, IndexError, subprocess.CalledProcessError):
            pass
    with tempfile.TemporaryDirectory(dir=cache) as tmp:
        root = Path(tmp)
        job["prefix"] = str(root / "frame")
        with (root / "render.log").open("w+") as log:
            proc = subprocess.run([blender, "-b", "--factory-startup", "--python-exit-code", "1",
                                   "--python", str(SCRIPT), "--", json.dumps(job)],
                                  stdout=log, stderr=subprocess.STDOUT)
            if proc.returncode:
                log.seek(0)
                from collections import deque
                raise RuntimeError("".join(deque(log, maxlen=14)))
        out = root / "clip.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-framerate", str(fps), "-start_number", "1",
                        "-i", str(root / "frame%04d.png"), "-c:v", "libx264", "-crf", "17",
                        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)], check=True)
        check_clip(out, job)
        out.replace(clip)
    return clip


def prepare(timeline, current):
    for scene in timeline["scenes"]:
        if scene["type"] == "cinematic":
            props = scene["props"]
            scale = props.get("renderScale", 1)
            if not isinstance(scale, (int, float)) or isinstance(scale, bool) or not 0.25 <= scale <= 1:
                raise ValueError("Blender renderScale, 0.25–1 arasında olmalı")
            width = 2 * round(timeline["width"] * scale / 2)
            height = 2 * round(timeline["height"] * scale / 2)
            clip = render(props, width, height, timeline["fps"], scene["dur"])
            props["sourceSize"] = [width, height]
            shutil.copyfile(clip, current / clip.name)
            scene["props"]["src"] = "current/" + clip.name
