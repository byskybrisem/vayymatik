"""Render an isolated preview without invoking narration."""
import argparse
import shutil
from . import render

p = argparse.ArgumentParser()
p.add_argument("template", choices=["rotor-section"])
p.add_argument("output")
p.add_argument("--width", type=int, default=384)
p.add_argument("--height", type=int, default=216)
p.add_argument("--frames", type=int, default=30)
p.add_argument("--fps", type=int, default=15)
p.add_argument("--samples", type=int, default=8)
args = p.parse_args()
clip = render({"template": args.template, "samples": args.samples}, args.width,
              args.height, args.fps, args.frames)
shutil.copyfile(clip, args.output)
