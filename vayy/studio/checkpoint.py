"""Persist validated, muted Remotion chunks; partial files never become checkpoints."""
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

from ..paths import ENGINE
from . import check_clip


def fingerprint(command):
    digest = hashlib.sha256(json.dumps(command).encode())
    for folder in ("src", "public"):
        for path in sorted((ENGINE / folder).rglob("*")):
            if path.is_file():
                digest.update(str(path.relative_to(ENGINE)).encode())
                with path.open("rb") as stream:
                    digest.update(hashlib.file_digest(stream, "sha256").digest())
    for name in ("package-lock.json", "render.mjs", "lib.mjs"):
        digest.update((ENGINE / name).read_bytes())
    return digest.hexdigest()


def render_chunks(command, timeline, directory, output, chunk_size=120):
    folder = directory / fingerprint(command)
    folder.mkdir(parents=True, exist_ok=True)
    chunks = []
    with tempfile.TemporaryDirectory(dir=folder) as temp:
        work = Path(temp)
        for first in range(0, timeline["durationInFrames"], chunk_size):
            count = min(chunk_size, timeline["durationInFrames"] - first)
            clip = folder / f"{first:08d}-{count}.mp4"
            spec = dict(size=[timeline["width"], timeline["height"]], fps=timeline["fps"], frames=count)
            valid = False
            if clip.exists():
                try:
                    check_clip(clip, spec)
                    valid = True
                except (subprocess.CalledProcessError, ValueError, IndexError, KeyError):
                    pass
            if not valid:
                part = work / clip.name
                cmd = command.copy()
                cmd[cmd.index("--out") + 1] = str(part)
                subprocess.run(cmd + ["--frames", f"{first}-{first+count-1}"], cwd=ENGINE, check=True)
                check_clip(part, spec)
                part.replace(clip)
            chunks.append(clip)
        listing = work / "clips.txt"
        listing.write_text("".join(f"file '../{p.name}'\n" for p in chunks))
        joined = work / "joined.mp4"
        subprocess.run(["ffmpeg","-v","error","-f","concat","-safe","0","-i",str(listing),
                        "-c","copy",str(joined)],check=True)
        check_clip(joined, dict(size=[timeline["width"],timeline["height"]],fps=timeline["fps"],
                                frames=timeline["durationInFrames"]))
        joined.replace(output)
