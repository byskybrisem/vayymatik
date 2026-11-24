"""Senaryo işaretleme dili.

  {metin}              -> vurgulu (kırmızı)        {g:metin} -> altın (sayılar)
  {w:metin}            -> beyaz vurgu               {metin|okunuş} -> özel telaffuz
Örnek: "{g:1987'de} {Avusturya'da} satışa sundu."  /  "{Dietrich Mateschitz|Ditrih Mateşits}"
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from .textnorm import normalize_for_tts

STYLE = {"": "accent", "a": "accent", "g": "gold", "w": "white"}
_GROUP = re.compile(r"\{(?:(?P<cls>[agw]):)?(?P<disp>[^}|]+)(?:\|(?P<say>[^}]+))?\}")


@dataclass
class DisplayWord:
    text: str
    style: str                      # accent | gold | white | plain
    spoken: list[int] = field(default_factory=list)  # konuşulan kelime indeksleri


@dataclass
class ParsedLine:
    display: list[DisplayWord]
    spoken: list[str]               # TTS'e giden kelimeler (noktalama dahil)

    @property
    def tts_text(self) -> str:
        return " ".join(self.spoken)

    @property
    def plain_text(self) -> str:
        return " ".join(w.text for w in self.display)


def _spoken_words(display_text: str) -> list[str]:
    return normalize_for_tts(display_text).split()


def parse_line(text: str) -> ParsedLine:
    display: list[DisplayWord] = []
    spoken: list[str] = []
    pos = 0
    chunks: list[tuple[str, str | None, str]] = []  # (display, say, style)
    for m in _GROUP.finditer(text):
        before = text[pos:m.start()]
        if before:
            chunks.append((before, None, "plain"))
        chunks.append((m.group("disp"), m.group("say"), STYLE[m.group("cls") or ""]))
        pos = m.end()
    if pos < len(text):
        chunks.append((text[pos:], None, "plain"))

    # Grup sonrası bitişik noktalama ("{Krating Daeng}." gibi) önceki kelimeye eklenir
    for disp, say, style in chunks:
        if style == "plain":
            raw_words = disp.split()
            if raw_words and display and disp and not disp[0].isspace():
                # bitişik noktalama/ek: önceki kelimeye yapıştır
                lead = raw_words.pop(0)
                display[-1].text += lead
                if spoken:
                    spoken[-1] += normalize_for_tts(lead)
            for w in raw_words:
                sw = _spoken_words(w)
                idx = list(range(len(spoken), len(spoken) + len(sw)))
                spoken.extend(sw)
                display.append(DisplayWord(w, "plain", idx))
        else:
            dwords = disp.split()
            if not say:
                for w in dwords:
                    sw = _spoken_words(w)
                    idx = list(range(len(spoken), len(spoken) + len(sw)))
                    spoken.extend(sw)
                    display.append(DisplayWord(w, style, idx))
                continue
            sw = normalize_for_tts(say).split()
            base = len(spoken)
            spoken.extend(sw)
            n, m_ = len(dwords), len(sw)
            for i, w in enumerate(dwords):
                if n == m_:
                    idx = [base + i]
                else:
                    a = round(i * m_ / n)
                    b = max(a + 1, round((i + 1) * m_ / n))
                    idx = list(range(base + a, base + min(b, m_)))
                display.append(DisplayWord(w, style, idx))
    return ParsedLine(display=display, spoken=spoken)
