"""Türkçe metin normalizasyonu: sayıları yazıya çevirme, Türkçe büyük/küçük harf.

TTS'e giden metinde rakam kalmaz; ekran/altyazı metni olduğu gibi korunur.
"""
from __future__ import annotations

import re

_ONES = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"]
_TENS = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"]
_SCALES = [(10**12, "trilyon"), (10**9, "milyar"), (10**6, "milyon"), (10**3, "bin")]


def _below_thousand(n: int) -> list[str]:
    words: list[str] = []
    h, rest = divmod(n, 100)
    if h:
        if h > 1:
            words.append(_ONES[h])
        words.append("yüz")
    t, o = divmod(rest, 10)
    if t:
        words.append(_TENS[t])
    if o:
        words.append(_ONES[o])
    return words


def int_to_words(n: int) -> str:
    """1987 -> 'bin dokuz yüz seksen yedi'"""
    if n == 0:
        return "sıfır"
    if n < 0:
        return "eksi " + int_to_words(-n)
    words: list[str] = []
    for value, name in _SCALES:
        q, n = divmod(n, value)
        if q:
            if name == "bin" and q == 1:
                words.append("bin")
            else:
                words.extend(_below_thousand(q))
                words.append(name)
    words.extend(_below_thousand(n))
    return " ".join(w for w in words if w)


def number_to_words(token: str) -> str:
    """'12,2' -> 'on iki virgül iki'; '8.000.000' -> 'sekiz milyon'."""
    token = token.strip()
    if re.fullmatch(r"\d{1,3}(\.\d{3})+(,\d+)?", token):
        token = token.replace(".", "")
    if "," in token:
        whole, frac = token.split(",", 1)
        frac_words = int_to_words(int(frac)) if frac.lstrip("0") else "sıfır"
        # baştaki sıfırlar: 0,05 -> sıfır virgül sıfır beş
        lead = len(frac) - len(frac.lstrip("0"))
        return f"{int_to_words(int(whole or 0))} virgül {'sıfır ' * lead}{frac_words}".strip()
    return int_to_words(int(token))


_NUM_RE = re.compile(r"(?<![\w])(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)(?:'([a-zçğıöşü]+))?", re.I)


def expand_numbers(text: str) -> str:
    """'1987'de' -> 'bin dokuz yüz seksen yedide' (ek, kesme işareti olmadan eklenir)."""

    def repl(m: re.Match[str]) -> str:
        words = number_to_words(m.group(1))
        suffix = m.group(2) or ""
        return words + suffix

    return _NUM_RE.sub(repl, text)


def tr_upper(s: str) -> str:
    return s.replace("i", "İ").replace("ı", "I").upper()


def tr_lower(s: str) -> str:
    return s.replace("İ", "i").replace("I", "ı").lower()


def normalize_for_tts(text: str) -> str:
    """TTS için: sayıları aç, kesme işaretlerini kaldır, boşlukları sadeleştir."""
    text = expand_numbers(text)
    text = text.replace("’", "'").replace("'", "")
    text = text.replace("—", ", ").replace("–", ", ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()
