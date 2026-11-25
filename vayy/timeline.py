"""Konu JSON'unu (saniye + '@referans') Remotion zaman çizelgesine (kare) çevirir.

Zaman referansları:
  @<satır>.start | .end          satırın konuşma başı / sonu
  @<satır>.w<N> | .we<N>          N. ekran kelimesinin başı / sonu (0 tabanlı)
  @<satır>.word:<önek>            öneki eşleşen ilk kelimenin başı (…:önek>end = sonu)
  @end  @start                    video sonu / 0
  sonuna +0.2 veya -0.15 eklenebilir (saniye)
Sahne props içinde TIME_KEYS anahtarlarındaki sayılar sahne başına göre saniyedir.
"""
from __future__ import annotations

import copy
import re

from .voice import LineAudio

TIME_KEYS = {"t", "from", "to", "dur", "start", "end", "at", "out", "breakAt"}
LIST_TIME_KEYS = {"beats", "on", "groupOut"}
_REF = re.compile(r"^@(?P<base>[^+\-]+?)(?P<off>[+\-]\d+(?:\.\d+)?)?$")


class Resolver:
    def __init__(self, lines: list[LineAudio], total: float):
        self.lines = {l.id: l for l in lines}
        self.total = total

    def abs(self, ref: str | float | int) -> float:
        if isinstance(ref, (int, float)):
            return float(ref)
        m = _REF.match(ref.strip())
        if not m:
            raise ValueError(f"Geçersiz zaman referansı: {ref}")
        base, off = m.group("base"), float(m.group("off") or 0)
        if base == "end":
            return self.total + off
        if base == "start":
            return off
        lid, _, what = base.partition(".")
        la = self.lines.get(lid)
        if la is None:
            raise ValueError(f"Bilinmeyen satır: {lid} ({ref})")
        if what == "start":
            t = la.speech_start
        elif what == "end":
            t = la.speech_end
        elif what.startswith("word:"):
            key = what[5:]
            want_end = key.endswith(">end")
            key = key[:-4] if want_end else key
            from .textnorm import tr_lower

            for dw in la.parsed.display:
                if tr_lower(dw.text).startswith(tr_lower(key)) and dw.spoken:
                    w0, w1 = la.words[dw.spoken[0]], la.words[dw.spoken[-1]]
                    t = la.start + (w1["end"] if want_end else w0["start"])
                    break
            else:
                raise ValueError(f"Kelime bulunamadı: {ref}")
        elif re.fullmatch(r"we?\d+", what):
            idx = int(what.lstrip("we"))
            dw = la.parsed.display[idx]
            w = la.words[dw.spoken[-1] if what.startswith("we") else dw.spoken[0]]
            t = la.start + (w["end"] if what.startswith("we") else w["start"])
        else:
            raise ValueError(f"Bilinmeyen referans türü: {ref}")
        return t + off


def _convert(obj, res: Resolver, scene_start: float, fps: int, key: str | None = None):
    if isinstance(obj, dict):
        return {k: _convert(v, res, scene_start, fps, k) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_convert(v, res, scene_start, fps, key if key in LIST_TIME_KEYS else None) for v in obj]
    if key in TIME_KEYS or key in LIST_TIME_KEYS:
        if isinstance(obj, str) and obj.startswith("@"):
            return int(round((res.abs(obj) - scene_start) * fps))
        if isinstance(obj, (int, float)) and not isinstance(obj, bool):
            return int(round(obj * fps))
    return obj


def build_scenes(topic: dict, res: Resolver, fps: int) -> list[dict]:
    specs = topic["scenes"]
    starts = [res.abs(s["start"]) for s in specs]
    out = []
    for i, s in enumerate(specs):
        start = max(0.0, starts[i])
        end = res.abs(s["end"]) if "end" in s else (starts[i + 1] if i + 1 < len(specs) else res.total)
        tr = copy.deepcopy(s.get("transition", {"type": "cut", "dur": 0}))
        tr["dur"] = int(round(float(tr.get("dur", 0)) * fps))
        out.append({
            "id": s["id"],
            "type": s["type"],
            "from": int(round(start * fps)),
            "dur": max(1, int(round(end * fps)) - int(round(start * fps))),
            "transitionIn": tr,
            "props": _convert(copy.deepcopy(s.get("props", {})), res, start, fps),
        })
    # geçiş sırasında önceki sahne alttan görünmeye devam etsin
    for a, b in zip(out, out[1:]):
        need = b["from"] + max(0, b["transitionIn"]["dur"]) - a["from"]
        a["dur"] = max(a["dur"], need)
    total_f = int(round(res.total * fps))
    if out:
        out[-1]["dur"] = max(out[-1]["dur"], total_f - out[-1]["from"])
    return out


def visual_events(scenes: list[dict], fps: int) -> list[float]:
    """QA için anlamlı görsel değişim anları (sahne başları + sahne içi işaretler)."""
    ev = set()
    for s in scenes:
        ev.add(s["from"] / fps)
        for k in s["props"].get("beats", []):
            ev.add((s["from"] + k) / fps)
        for t in s["props"].get("titles", []):
            ev.add((s["from"] + t["from"]) / fps)
        keys = s["props"].get("keys", [])
        for k in keys[1:]:
            ev.add((s["from"] + k["t"]) / fps)
        pr = s["props"]
        for coll, key in (("kpis", "at"), ("cards", "at"), ("rows", "at"), ("labels", "from")):
            for it in pr.get(coll, []) or []:
                if isinstance(it, dict) and isinstance(it.get(key), (int, float)):
                    ev.add((s["from"] + it[key]) / fps)
        if isinstance(pr.get("lights"), dict):
            ev.add((s["from"] + pr["lights"]["out"]) / fps)
            for t in pr["lights"].get("on", []):
                ev.add((s["from"] + t) / fps)
        for one in ("route", "dots", "live", "pullback", "can", "tv", "footer"):
            it = pr.get(one)
            if isinstance(it, dict):
                for key in ("start", "from", "at", "breakAt"):
                    if isinstance(it.get(key), (int, float)):
                        ev.add((s["from"] + it[key]) / fps)
        # world3d: kamera anahtar kareleri, nesne girişleri, karakter poz değişimleri
        for k in (pr.get("camera") or {}).get("keys", []) if isinstance(pr.get("camera"), dict) else []:
            if isinstance(k.get("t"), (int, float)):
                ev.add((s["from"] + k["t"]) / fps)
        for o in pr.get("objects", []) or []:
            if not isinstance(o, dict):
                continue
            sh = o.get("show")
            if isinstance(sh, dict) and isinstance(sh.get("from"), (int, float)):
                ev.add((s["from"] + sh["from"]) / fps)
            if isinstance(o.get("pose"), list):
                for k in o["pose"]:
                    if isinstance(k, dict) and isinstance(k.get("t"), (int, float)):
                        ev.add((s["from"] + k["t"]) / fps)
    return sorted(e for e in ev if e >= 0)
