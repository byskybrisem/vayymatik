"""Komut satırı: python -m vayy <komut> <konu>

  build <konu>        Ses + müzik + render + QA + teslim dosyaları (tek komut)
  audio <konu>        Yalnızca ses/zaman çizelgesi (render yok)
  remux <konu>        Sesi yeniden üret, mevcut görüntüyle birleştir (görüntü yeniden render edilmez)
  stills <konu> 0,90  Seçili kareleri PNG olarak üret
  qa <konu>           Var olan MP4 için kalite kontrol
  deliver <konu>      Metin teslimleri + kapak görseli
"""
from __future__ import annotations

import argparse
import sys


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="vayy", description="VAYYMATİK Shorts üretim hattı")
    ap.add_argument("command", choices=["build", "audio", "remux", "stills", "qa", "deliver"])
    ap.add_argument("topic")
    ap.add_argument("frames", nargs="?", default="")
    ap.add_argument("--concurrency", type=int, default=4)
    ap.add_argument("--crf", type=int, default=None)
    ap.add_argument("--no-qa", action="store_true")
    a = ap.parse_args(argv)

    from . import build as b

    if a.command == "audio":
        b.build(a.topic, render=False)
        return 0
    if a.command == "remux":
        b.build(a.topic, render=False)
        b.mux(a.topic)
        return 0
    if a.command == "stills":
        frames = [int(x) for x in a.frames.split(",") if x.strip()] or [0]
        b.build(a.topic, render=False, stills=frames)
        return 0
    if a.command == "build":
        b.build(a.topic, render=True, concurrency=a.concurrency, crf=a.crf)
        if not a.no_qa:
            from .qa import run_qa
            from .deliver import deliver

            deliver(a.topic)
            ok = run_qa(a.topic)
            return 0 if ok else 2
        return 0
    if a.command == "qa":
        from .qa import run_qa

        return 0 if run_qa(a.topic) else 2
    if a.command == "deliver":
        from .deliver import deliver

        deliver(a.topic)
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
