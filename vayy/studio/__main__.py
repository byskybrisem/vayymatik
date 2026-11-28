"""Render an isolated preview without invoking narration."""
import argparse
import shutil
from . import asset_catalog, render

p = argparse.ArgumentParser()
p.add_argument("template", choices=sorted(asset_catalog()))
p.add_argument("output")
p.add_argument("--width", type=int, default=384)
p.add_argument("--height", type=int, default=216)
p.add_argument("--frames", type=int, default=30)
p.add_argument("--fps", type=int, default=30)
p.add_argument("--samples", type=int, default=8)
p.add_argument("--teeth", type=int, default=24)
p.add_argument("--camera", choices=("original","short-orbit","dolly","handheld"), default="original")
args = p.parse_args()
clip = render({"template": args.template, "cameraProfile": args.camera, "samples": args.samples, "teeth": args.teeth}, args.width,
              args.height, args.fps, args.frames)
shutil.copyfile(clip, args.output)
from pathlib import Path
shutil.copyfile(clip.with_suffix(".json"), Path(args.output).with_suffix(".beats.json"))
