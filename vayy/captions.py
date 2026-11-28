"""Altyazı: kelime zamanlarından sayfa (ekrana basılan) ve SRT (platform altyazısı) üretimi."""
from __future__ import annotations

from dataclasses import dataclass

from .voice import LineAudio

PUNCT_BREAK = (",", ".", "?", "!", ":", ";", "…")


@dataclass
class CapWord:
    text: str
    start: float
    end: float
    style: str
    line_id: str


def display_words(lines: list[LineAudio]) -> list[CapWord]:
    out: list[CapWord] = []
    for la in lines:
        for dw in la.parsed.display:
            ws = [la.words[i] for i in dw.spoken if i < len(la.words)]
            if not ws:
                continue
            out.append(CapWord(dw.text, la.start + ws[0]["start"], la.start + ws[-1]["end"], dw.style, la.id))
    return out


def pages(words: list[CapWord], max_words: int = 3, max_chars: int = 18) -> list[list[CapWord]]:
    """Kısa, okunur sayfalar: noktalamada ve satır sonunda kır; vurgulu grupları bölme."""
    res: list[list[CapWord]] = []
    cur: list[CapWord] = []
    for i, w in enumerate(words):
        nxt = words[i + 1] if i + 1 < len(words) else None
        if cur:
            chars = sum(len(x.text) + 1 for x in cur) + len(w.text)
            same_group = w.style != "plain" and cur[-1].style == w.style and w.line_id == cur[-1].line_id
            if (len(cur) >= max_words or chars > max_chars) and not (same_group and len(cur) < max_words + 1 and chars <= max_chars + 8):
                res.append(cur)
                cur = []
        cur.append(w)
        end_here = w.text.endswith(PUNCT_BREAK) or nxt is None or nxt.line_id != w.line_id
        if end_here:
            res.append(cur)
            cur = []
    if cur:
        res.append(cur)
    return res


def caption_pages_json(pg: list[list[CapWord]], fps: int, lead: float = 0.08, hold: float = 0.35) -> list[dict]:
    out = []
    for i, p in enumerate(pg):
        start = p[0].start - lead
        nxt = pg[i + 1][0].start - lead if i + 1 < len(pg) else None
        end = p[-1].end + hold
        if nxt is not None:
            end = min(max(end, p[-1].end + 0.05), nxt) if nxt - p[-1].end < 0.6 else min(end, nxt)
        out.append({
            "from": int(round(start * fps)),
            "to": int(round(end * fps)),
            "words": [{"text": w.text, "from": int(round(w.start * fps)), "to": int(round(w.end * fps)), "style": w.style} for w in p],
        })
    # çakışma olmasın
    for a, b in zip(out, out[1:]):
        a["to"] = min(a["to"], b["from"])
    return out


def _ts(t: float) -> str:
    ms = int(round(max(0.0, t) * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def srt(lines: list[LineAudio], max_chars: int = 42) -> str:
    """Platformlara yüklenecek SRT: cümle temelli, en fazla 2×42 karakter."""
    cues = []
    for la in lines:
        words = display_words([la])
        chunk: list[CapWord] = []
        for i, w in enumerate(words):
            chunk.append(w)
            text = " ".join(x.text for x in chunk)
            last = i == len(words) - 1
            if last or len(text) + 1 + len(words[i + 1].text) > max_chars * 2 or (w.text.endswith(PUNCT_BREAK) and len(text) > 28):
                cues.append((chunk[0].start, chunk[-1].end, text))
                chunk = []
    out = []
    for i, (a, b, text) in enumerate(cues, 1):
        nb = cues[i][0] if i < len(cues) else b + 0.6
        b2 = min(b + 0.3, nb - 0.02) if nb > b else b
        if len(text) > max_chars:
            ws = text.split()
            best = min(range(1, len(ws)), key=lambda k: abs(len(" ".join(ws[:k])) - len(" ".join(ws[k:]))))
            text = " ".join(ws[:best]) + "\n" + " ".join(ws[best:])
        out.append(f"{i}\n{_ts(a)} --> {_ts(b2)}\n{text}\n")
    return "\n".join(out)


def event_vtt(events, fps, total):
    """Optional Turkish sound descriptions timed from baked or planted contacts."""
    labels = {"ball_contact": "Top sekiyor", "footstep": "Adım", "water_baffle": "Su engele çarpıyor",
              "ignition": "Alev tutuşuyor", "tile_impact": "Karo zemine çarpıyor"}
    cues = []
    for event in sorted(events, key=lambda e: e["visual_frame"]):
        start = event["visual_frame"] / fps
        label = labels.get(event["type"])
        if not label or start >= total:
            continue
        if cues and label == cues[-1][2] and start <= cues[-1][1]:
            cues[-1][1] = min(total, start + .45)
        else:
            if cues:
                cues[-1][1] = min(cues[-1][1], start)
            cues.append([start, min(total, start + .45), label])

    def stamp(seconds):
        hours, rest = divmod(round(seconds * 1000), 3600000)
        minutes, rest = divmod(rest, 60000)
        sec, ms = divmod(rest, 1000)
        return f"{hours:02}:{minutes:02}:{sec:02}.{ms:03}"

    return "WEBVTT\n\n" + "\n\n".join(f"{stamp(a)} --> {stamp(b)}\n[{label}]"
                                      for a,b,label in cues if b > a) + "\n"
