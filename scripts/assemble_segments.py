#!/usr/bin/env python3
"""Parçalı render edilmiş görüntüyü (ana parçalar + kare aralığı yamaları) tek geçişte birleştirir ve sesi ekler.

Kullanım:
  python3 scripts/assemble_segments.py <konu> --out <mp4> --audio <wav> \
      --seg build/<konu>/seg_a.mp4:0 --seg build/<konu>/seg_b.mp4:8405 \
      --patch build/<konu>/patch_x.mp4:2746 ...

`--seg DOSYA:İLK_KARE` ve `--patch DOSYA:İLK_KARE`: dosyanın ilk karesinin mutlak kare numarası. Yamalar parçaların üstüne yazılır.
Kare doğruluğu: trim=start_frame + concat filtresi + tek geçişte yeniden kodlama (kopya/atlanan kare yok). Toplam kare sayısı `--frames` ile doğrulanır.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

FPS = 30


def nframes(path: str) -> int:
    r = subprocess.run(["ffprobe", "-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", path],
                       capture_output=True, text=True, check=True)
    return int(r.stdout.strip().rstrip(","))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("topic")
    ap.add_argument("--out", required=True)
    ap.add_argument("--audio", required=True)
    ap.add_argument("--seg", action="append", default=[])
    ap.add_argument("--patch", action="append", default=[])
    ap.add_argument("--frames", type=int, required=True, help="beklenen toplam kare")
    ap.add_argument("--crf", type=int, default=17)
    ap.add_argument("--title", default="")
    a = ap.parse_args()

    def parse(items):
        out = []
        for it in items:
            f, s = it.rsplit(":", 1)
            n = nframes(f)
            out.append((f, int(s), int(s) + n - 1))
        return out

    segs, patches = parse(a.seg), parse(a.patch)
    owner: list[tuple[str, int] | None] = [None] * a.frames  # kare -> (dosya, dosya içi indeks)
    for f, s, e in segs:
        for k in range(s, min(e, a.frames - 1) + 1):
            owner[k] = (f, k - s)
    for f, s, e in patches:
        for k in range(s, min(e, a.frames - 1) + 1):
            owner[k] = (f, k - s)
    missing = [k for k, o in enumerate(owner) if o is None]
    if missing:
        print(f"HATA: {len(missing)} kare kaynaksız (ilk: {missing[0]})", file=sys.stderr)
        return 1
    runs: list[tuple[str, int, int]] = []
    for k, (f, i) in enumerate(owner):  # type: ignore[misc]
        if runs and runs[-1][0] == f and runs[-1][2] + 1 == i:
            runs[-1] = (f, runs[-1][1], i)
        else:
            runs.append((f, i, i))
    print(f"{len(runs)} parça, {a.frames} kare ({a.frames / FPS:.1f} sn)")
    # Kare indeksine göre kesme (trim=start_frame) + concat filtresi: zaman damgalarından bağımsız, kare doğruluğunda.
    inputs: list[str] = []
    chains: list[str] = []
    for n, (f, i0, i1) in enumerate(runs):
        inputs += ["-i", str(Path(f).resolve())]
        chains.append(f"[{n}:v]trim=start_frame={i0}:end_frame={i1 + 1},setpts=PTS-STARTPTS[v{n}]")
    labels = "".join(f"[v{n}]" for n in range(len(runs)))
    fc = ";".join(chains) + f";{labels}concat=n={len(runs)}:v=1:a=0[vc];[vc]setpts=N/({FPS}*TB)[vout]"
    audio_idx = len(runs)
    cmd = [
        "ffmpeg", "-y", "-v", "error", "-stats", *inputs, "-i", a.audio, "-filter_complex", fc,
        "-map", "[vout]", "-map", f"{audio_idx}:a:0", "-r", str(FPS), "-fps_mode", "cfr",
        "-c:v", "libx264", "-preset", "medium", "-crf", str(a.crf), "-maxrate", "20M", "-bufsize", "40M",
        "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
        "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-shortest", "-movflags", "+faststart",
        "-metadata", f"title={a.title}", "-metadata", "artist=VAYYMATİK", a.out,
    ]
    subprocess.run(cmd, check=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
