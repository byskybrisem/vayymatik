"""6 Shorts (1080×1920) üretici: ana videonun Furkan kayıtlarını ve sahnelerini dikey kompozisyonla yeniden kullanır.
Yalnız yeni hook satırları (s1_hook…s6_hook) ve kapanış (s_cta) ek kayıttır. Kullanım: python3 make_shorts.py
Çıktı: topics/gizli_s1 … gizli_s6/topic.json
"""
import copy
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1]))
from script import CHAPTERS, SHORTS_NEW  # noqa: E402
import scenes as M  # noqa: E402

TEXT = {lid: t for _, _, ls in CHAPTERS for lid, t in ls}
TEXT.update(SHORTS_NEW)
MAIN = {s["id"]: s for s in M.SCENES}
CHUNK_OF = {}
for c in json.loads((HERE / "chunks.json").read_text(encoding="utf-8")):
    for i, l in enumerate(c["lines"]):
        CHUNK_OF[l] = (c["id"], i)


def W(lid, word, nth=1, off=0.0):
    """Satır metni ana senaryoda değilse (hook) SHORTS_NEW'dan bulur."""
    M.TEXT.setdefault(lid, TEXT[lid])
    return M.W(lid, word, nth, off)


def S(lid, off=0.0):
    return M.S(lid, off)


def vert(scene_id, start, over=None, tr=("cut", 0)):
    """Ana sahneyi dikeye uyarla: FOV genişlet, bölüm başlığını kaldır, isteğe bağlı prop geçersiz kılma."""
    src = copy.deepcopy(MAIN[scene_id])
    p = src["props"]
    p.pop("chapter", None)
    if src["type"] == "deep3d":
        for k in p["camera"]["keys"]:
            k["fov"] = min(78, round(k.get("fov", 40) * 1.45, 1))
    if src["type"] == "ocean" and isinstance(p.get("cam", {}).get("fov"), (int, float)):
        p["cam"]["fov"] = min(82, round(p["cam"]["fov"] * 1.4, 1))
    for k, v in (over or {}).items():
        if v is None:
            p.pop(k, None)
        else:
            p[k] = v
    return {"id": f"{scene_id}__{abs(hash(str(start))) % 9999}", "type": src["type"], "start": start, "props": p, "transition": {"type": tr[0], "dur": tr[1]}}


def stack(panels, top=15.5, bottom=57.0, gap=1.6):
    """Dikey kadraj: panelleri altyazı ve platform arayüzünden uzak, üst-orta bölgede üst üste diz."""
    n = len(panels)
    h = (bottom - top - gap * (n - 1)) / n
    out = []
    for i, pnl in enumerate(panels):
        q = dict(pnl)
        q.update({"x": 5, "w": 90, "y": round(top + i * (h + gap), 2), "h": round(h, 2)})
        out.append(q)
    return out


def lab_panels(scene_id, keep=None):
    ps = MAIN[scene_id]["props"]["panels"]
    if keep is not None:
        ps = [ps[i] for i in keep]
    return stack(ps)


SH = [
    {  # 1 · 8.000 METREDEN GELEN SİNYAL
        "n": 1, "title": "8.000 metreden gelen sinyal",
        "lines": ["s1_hook", "sinyal", "asal", "doga", "rov", "m8000", "carpma", "s_cta"],
        "scenes": [
            vert("yil_storm", "@start", {"flashes": [0.15, 1.5]}),
            {"id": "s1_sonar", "type": "lab", "start": W("s1_hook", "8.000", off=-0.15), "transition": {"type": "flash", "dur": 0.2},
             "props": {"panels": stack([{"kind": "sonar", "title": "SONAR", "contact": 8000, "range": 10000}])}},
            vert("sinyal_storm", S("sinyal", -0.1)),
            {"id": "s1_spectro", "type": "lab", "start": W("sinyal", "tuhaf", off=-0.15), "props": {"panels": lab_panels("sinyal_spectro", [0])}},
            vert("asal_primes", S("asal", -0.1), {"title": None}),
            vert("doga_compare", S("doga", -0.1), {"title": None}, ("fade", 0.2)),
            vert("rov_dawn", S("rov", -0.15), None, ("fade", 0.3)),
            vert("m8000_water", S("m8000", -0.1)),
            vert("basinc_info", W("m8000", "Basınç", off=-0.2), {"source": None}, ("fade", 0.2)),
            vert("carpma_wall", S("carpma", -0.1)),
            vert("sehir_reveal", S("s_cta", -0.3), None, ("fade", 0.4)),
        ],
        "music": {"mystery#1": "@start", "signal#1": S("asal", -0.3), "descent#1": S("rov", -0.3), "suspense#1": S("carpma", -0.2), "reveal#1": S("s_cta", -0.3), "end": "@end"},
    },
    {  # 2 · OKYANUSUN ALTINDA BİR ŞEHİR
        "n": 2, "title": "Okyanusun altında bir şehir",
        "lines": ["s2_hook", "kaya", "geri", "sehir", "olcek", "ulasim", "s_cta"],
        "scenes": [
            vert("eskisi_far", "@start"),
            vert("risk3_heart", W("s2_hook", "devasa", off=-0.2), {"tag": None}, ("flash", 0.2)),
            vert("kaya_wall", S("kaya", -0.2)),
            vert("desen_macro", W("kaya", "Kenarları", off=-0.1)),
            vert("geri_pullback", S("geri", -0.1)),
            vert("sehir_reveal", S("sehir", -0.2), None, ("fade", 0.3)),
            vert("olcek_domes", S("olcek", -0.1)),
            vert("olcek_tunnels", W("olcek", "Kilometrelerce", off=-0.1)),
            vert("olcek_heart", W("olcek", "Ve", off=-0.1)),
            vert("ulasim_pods", S("ulasim", -0.1)),
            vert("risk1_being", S("s_cta", -0.3), None, ("fade", 0.4)),
        ],
        "music": {"mystery#1": "@start", "build#1": S("geri", -0.2), "reveal#1": S("sehir", -0.2), "contact#1": S("s_cta", -0.3), "end": "@end"},
    },
    {  # 3 · BİZDEN DAHA GELİŞMİŞ BİR UYGARLIK
        "n": 3, "title": "Bizden daha gelişmiş bir uygarlık",
        "lines": ["s3_hook", "baca", "enerji_kurgu", "sofar", "fisilti", "ucurum", "s_cta"],
        "scenes": [
            vert("olcek_heart", "@start"),
            vert("sehir_reveal", W("s3_hook", "insanlar", off=-0.2), None, ("flash", 0.2)),
            vert("baca_vents", S("baca", -0.1), None, ("fade", 0.3)),
            vert("ekosistem_worms", W("baca", "İlk", off=-0.2)),
            vert("enerji_kurgu_heart", S("enerji_kurgu", -0.1), None, ("fade", 0.3)),
            vert("sofar_info", S("sofar", -0.1), {"source": None}, ("fade", 0.3)),
            vert("fisilti_earth", S("fisilti", -0.2), None, ("fade", 0.3)),
            vert("ucurum_gap", S("ucurum", -0.1), None, ("fade", 0.3)),
            vert("tur_city", S("s_cta", -0.3), None, ("fade", 0.4)),
        ],
        "music": {"wonder#1": "@start", "tech#1": S("baca", -0.2), "contact#1": S("sofar", -0.2), "finale#1": S("ucurum", -0.2), "end": "@end"},
    },
    {  # 4 · İLK TEMAS
        "n": 4, "title": "İlk temas",
        "lines": ["s4_hook", "gonder", "yanit", "siluet", "ritim", "kopus", "s_cta"],
        "scenes": [
            vert("hareket_pov", "@start"),
            vert("degisim_spectro", W("s4_hook", "mesaj", off=-0.2), {"panels": lab_panels("degisim_spectro"), "title": None}, ("flash", 0.2)),
            vert("gonder_send", S("gonder", -0.1), {"title": None}, ("fade", 0.2)),
            vert("yanit_city", S("yanit", -0.1), None, ("fade", 0.2)),
            vert("yanit_primes", W("yanit", "on", 1, -0.45), {"title": None}),
            vert("yanit_glyph", W("yanit", "ardından", off=-0.2), {"title": None, "decode": {"from": 0.8, "dur": 2.6}}, ("zoom", 0.35)),
            vert("siluet_being", S("siluet", -0.1), None, ("fade", 0.3)),
            vert("ritim_being", S("ritim", -0.1)),
            vert("kopus_lost", S("kopus", -0.1)),
            vert("eskisi_far", S("s_cta", -0.2), None, ("fade", 0.4)),
        ],
        "music": {"contact#1": "@start", "signal#1": S("gonder", -0.2), "suspense#1": S("siluet", -0.2), "lost#1": S("s_cta", -0.6), "end": "@end"},
    },
    {  # 5 · DÜNYA'NIN EN BÜYÜK KEŞFİ
        "n": 5, "title": "Dünyanın en büyük keşfi",
        "lines": ["s5_hook", "sizinti", "piyasa", "ekonomi", "hukuk", "miras", "s_cta"],
        "scenes": [
            {"id": "s5_broadcast", "type": "news", "start": "@start", "props": {"mode": "broadcast", "src": "gizli/city_wide.jpg", "headline": "Okyanusun altında bir uygarlık mı?"}},
            vert("sizinti_phones", S("sizinti", -0.2), None, ("whip", 0.3)),
            vert("piyasa_markets", S("piyasa", -0.1), None, ("fade", 0.25)),
            vert("ekonomi_lab", S("ekonomi", -0.1), {"panels": stack([MAIN["ekonomi_lab"]["props"]["panels"][0], MAIN["ekonomi_lab"]["props"]["panels"][1]]), "title": None}, ("fade", 0.25)),
            vert("hukuk_law", S("hukuk", -0.1), {"source": None}, ("fade", 0.3)),
            vert("miras_city", S("miras", -0.1), None, ("fade", 0.3)),
            vert("toplanti_council", S("s_cta", -0.3), None, ("fade", 0.3)),
        ],
        "music": {"news#1": "@start", "somber#1": S("hukuk", -0.2), "reveal#1": S("miras", -0.2), "end": "@end"},
    },
    {  # 6 · BİZİ ZATEN TANIYORLARDI
        "n": 6, "title": "Bizi zaten tanıyorlardı",
        "lines": ["s6_hook", "cozum", "harita", "pasifik", "atlantik", "hint", "tek", "kayit", "mesaj", "cta", "s_cta"],
        "scenes": [
            vert("sehir_reveal", "@start"),
            vert("cozum_glyph", S("cozum", -0.3), {"title": None}, ("fade", 0.3)),
            vert("harita_earth", S("harita", -0.1), None, ("zoom", 0.35)),
            vert("kayit_archive", S("kayit", -0.1), {"panels": stack([dict(MAIN["kayit_archive"]["props"]["panels"][0], at=0), dict(MAIN["kayit_archive"]["props"]["panels"][1], at=18)], bottom=60), "title": None, "sub": None}, ("fade", 0.3)),
            vert("mesaj_text", S("mesaj", -0.25), None, ("glitch", 0.35)),
            {"id": "s6_sen", "type": "choice", "start": S("cta", -0.2), "transition": {"type": "fade", "dur": 0.3},
             "props": {"focus": [{"at": 0, "i": 3}], "prompt": {"at": 0.3, "text": "SEN OLSAYDIN?"}}},
            vert("eskisi_far", S("s_cta", -0.2), None, ("fade", 0.3)),
        ],
        "music": {"signal#1": "@start", "finale#1": S("harita", -0.2), "lost#1": S("mesaj", -0.4), "outro#1": S("cta", -0.3), "end": "@end"},
    },
]

REF = re.compile(r"@([a-z0-9_]+)\.")


def refs(obj):
    if isinstance(obj, dict):
        for v in obj.values():
            yield from refs(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from refs(v)
    elif isinstance(obj, str):
        yield from REF.findall(obj)


def build_short(sh):
    lines = []
    prev = None
    for lid in sh["lines"]:
        ln = {"id": lid, "text": TEXT[lid]}
        c = CHUNK_OF.get(lid)
        # aynı kayıt parçasında ardışık değilse kısa bir ara (Shorts temposu)
        if prev is not None and not (c and prev[0] == c[0] and prev[1] + 1 == c[1]):
            lines[-1]["pause_after"] = 0.15
        lines.append(ln)
        prev = c
    lines[-2]["pause_after"] = 0.35
    ids = set(sh["lines"])
    for s in sh["scenes"]:
        bad = [r for r in refs(s) if r not in ids]
        if bad:
            raise ValueError(f"Shorts {sh['n']}: {s['id']} → bilinmeyen satır referansı {bad}")
    sfx = [e for e in M.SFX if all(r in ids for r in refs(e))]
    n = sh["n"]
    topic = {
        "id": f"gizli_s{n}",
        "output_name": f"VAYYMATIK0_Gizli_Uygarlik_Shorts_0{n}",
        "language": "tr",
        "render": {"width": 1080, "height": 1920, "crf": 19},
        "voice": {"provider": "external", "source_topic": "gizli_uygarlik", "name": "ElevenLabs · Furkan (Dzgub2SzfGvifooR4JMV) · eleven_v4", "lead_in": 0.12, "tail": 0.8, "gap_chunk": 0.15},
        "lines": lines,
        "scenes": sh["scenes"],
        "disclaimers": [{"text": "Varsayımsal bilimkurgu senaryosu", "start": "@start", "end": S(sh["lines"][1], 0.4)}],
        "music": {"style": "doc", "seed": 20 + n, "bpm": 92, "sections": sh["music"], "hits": [], "risers": []},
        "sfx": sfx,
        "foreign_words": ["SOFAR"],
        "metadata": {"title": f"{sh['title']} | Varsayımsal bilimkurgu", "description": [], "hashtags": []},
    }
    d = HERE.parent / f"gizli_s{n}"
    d.mkdir(exist_ok=True)
    (d / "topic.json").write_text(json.dumps(topic, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"gizli_s{n}: {len(lines)} satır, {len(sh['scenes'])} sahne, {len(sfx)} efekt")


if __name__ == "__main__":
    for sh in SH:
        build_short(sh)
