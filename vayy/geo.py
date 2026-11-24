"""Natural Earth (kamu malı) sınırlarından küre shader'ı için maske dokusu üretir.

Çıktı (RGB, eşdikdörtgen projeksiyon):
  R = kara (≈0.3) / vurgulu ülke A (1.0)
  G = vurgulu ülke B (1.0)
  B = ülke sınır çizgileri (kenar yumuşatmalı)
"""
from __future__ import annotations

import io
import zipfile
from pathlib import Path

from .paths import ASSETS

NE_ZIP = ASSETS / "geo" / "ne_50m_admin_0_countries.zip"


def _shapes():
    import shapefile  # pyshp

    z = zipfile.ZipFile(NE_ZIP)
    names = {Path(n).suffix: n for n in z.namelist() if Path(n).stem == "ne_50m_admin_0_countries"}
    r = shapefile.Reader(
        shp=io.BytesIO(z.read(names[".shp"])),
        shx=io.BytesIO(z.read(names[".shx"])),
        dbf=io.BytesIO(z.read(names[".dbf"])),
        encoding="utf-8",
    )
    fields = [f[0] for f in r.fields[1:]]
    for sr in r.iterShapeRecords():
        rec = dict(zip(fields, sr.record))
        iso = rec.get("ADM0_A3") or rec.get("ISO_A3")
        parts = list(sr.shape.parts) + [len(sr.shape.points)]
        rings = [sr.shape.points[parts[i]:parts[i + 1]] for i in range(len(parts) - 1)]
        yield iso, rings


def make_mask(out: Path, highlight_a: str | None, highlight_b: str | None, width: int = 4096) -> Path:
    from PIL import Image, ImageChops, ImageDraw, ImageFilter

    ss = 2
    W, H = width * ss, width // 2 * ss

    def xy(pt):
        lon, lat = pt
        return ((lon + 180.0) / 360.0 * W, (90.0 - lat) / 180.0 * H)

    land = Image.new("L", (W, H), 0)
    ha = Image.new("L", (W, H), 0)
    hb = Image.new("L", (W, H), 0)
    borders = Image.new("L", (W, H), 0)
    dl, da, db, dbo = (ImageDraw.Draw(i) for i in (land, ha, hb, borders))
    for iso, rings in _shapes():
        for ring in rings:
            pts = [xy(p) for p in ring]
            if len(pts) < 3:
                continue
            # Natural Earth halkaları: dış halka saat yönünde; delikler ters. Basit yaklaşım: hepsini doldur.
            dl.polygon(pts, fill=255)
            if iso == highlight_a:
                da.polygon(pts, fill=255)
            if iso == highlight_b:
                db.polygon(pts, fill=255)
            dbo.line(pts + [pts[0]], fill=255, width=max(1, int(1.2 * ss)))
    small = lambda im: im.resize((width, width // 2), Image.LANCZOS)
    land, ha, hb, borders = map(small, (land, ha, hb, borders))
    r = ImageChops.lighter(land.point(lambda v: int(v * 0.3)), ha)
    img = Image.merge("RGB", (r, hb, borders.filter(ImageFilter.GaussianBlur(0.4))))
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, optimize=True)
    return out
