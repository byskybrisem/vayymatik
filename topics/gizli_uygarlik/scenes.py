"""Gizli Uygarlık — sahne planı (ana video, 16:9). Zamanlar anlatıma kilitli: "@satır.start", "@satır.wN" (N. görünen kelime).
Dünya koordinatları (deep3d): şehir merkezi (0,0,0), çekirdek (0,200,0); kubbe d6 (547,62) r53, d0 (229,41) r81, d2 (-163,171) r75 …
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from script import CHAPTERS  # noqa: E402
from vayy.markup import parse_line  # noqa: E402
from vayy.textnorm import tr_lower  # noqa: E402

TEXT = {lid: t for _, _, ls in CHAPTERS for lid, t in ls}


def W(lid: str, word: str, nth: int = 1, off: float = 0.0, end: bool = False) -> str:
    """Satırdaki n. görünen kelimenin başlangıç (veya bitiş) zamanı referansı."""
    disp = parse_line(TEXT[lid]).display
    k = 0
    for i, dw in enumerate(disp):
        if tr_lower(dw.text).strip("“”\"'.,!?…:;").startswith(tr_lower(word)):
            k += 1
            if k == nth:
                r = f"@{lid}.{'we' if end else 'w'}{i}"
                return r + (f"{off:+.2f}" if off else "")
    raise KeyError(f"{lid}: '{word}' ({nth}) bulunamadı")


def S(lid: str, off: float = 0.0) -> str:
    return f"@{lid}.start" + (f"{off:+.2f}" if off else "")


def E(lid: str, off: float = 0.0) -> str:
    return f"@{lid}.end" + (f"{off:+.2f}" if off else "")


def sc(i, typ, start, props, tr=("cut", 0), end=None):
    d = {"id": i, "type": typ, "start": start, "props": props, "transition": {"type": tr[0], "dur": tr[1]}}
    if end:
        d["end"] = end
    return d


def K(t, pos, target, fov=40):
    return {"t": t, "pos": pos, "target": target, "fov": fov}


CLOSE = [0.11, 0.045, 0.032]
MIDC = [0.05, 0.02, 0.015]
MID = [0.025, 0.01, 0.0075]
WIDE = [0.008, 0.0034, 0.0027]
FAR = [0.0042, 0.0018, 0.0015]
GLOW = "#45d8d0"


def deep(keys, *, sigma=MID, lamps=None, power=1.0, city=True, hud=None, **kw):
    p = {"camera": {"keys": keys, "shake": kw.pop("shake", 0.02)}, "water": {"sigma": sigma}, "city": {"power": power, "glow": GLOW} if city else {"show": False}}
    p["lamps"] = lamps or {"mode": "cam", "i": 4}
    if hud:
        p["hud"] = hud
    if "beats" in kw:
        p["city"]["beats"] = kw.pop("beats")
    if "period" in kw:
        p["city"]["period"] = kw.pop("period")
    if "veins" in kw:
        p["city"]["veins"] = kw.pop("veins")
    if "micro" in kw:
        p["city"]["micro"] = kw.pop("micro")
    p.update(kw)
    return p


def storm(cam, yaw, pitch, fov=40, **kw):
    p = {"mode": "storm", "cam": {"pos": cam, "yaw": yaw, "pitch": pitch, "fov": fov}, "ship": {"pos": [0, 0, 0], "yaw": 0.0}}
    p.update(kw)
    return p


def water(depth, **kw):
    p = {"mode": "water", "depth": depth}
    p.update(kw)
    return p


def hud(depth, **kw):
    h = {"depth": depth}
    h.update(kw)
    return h


def ch(n, title, at=0.4, dur=4.6):
    return {"n": n, "title": title, "at": at, "dur": dur}


# Hook kubbe yüzeyi (d6): yüzey noktası P, normal N, teğet T
P6 = [598.5, 3.9, 68.2]
P6b = [595.1, 5.6, 80.5]

SCENES = [
    # ===================== BÖLÜM 1 · KARANLIKTAKİ SİNYAL =====================
    sc("hook_wall", "deep3d", "@start", deep(
        [K(0, [593.69, 25.38, 61.65], [589.97, 22.61, 63.31], 46), K(9, [592.75, 25.38, 71.61], [589.04, 22.61, 73.27], 44)],
        sigma=CLOSE, lamps={"mode": "cam", "i": 0.9}, power=1.25, beats=[W("hook", "başka", off=-0.1), W("hook", "farkında", off=-0.1)],
        hud=hud(8034, label="YANKI · KAMERA 1", alt=4.2), grade={"vignette": 0.75})),
    sc("yil_storm", "ocean", S("yil", -0.25), storm(
        [{"t": 0, "v": [-140, 16, 80]}, {"t": 9, "v": [-126, 17, 71]}], 1.051, -0.06, 40,
        flashes=[W("yil", "2027", off=0.15), W("yil", "Meridyen", off=0.4)], chapter=ch("BÖLÜM 1", "KARANLIKTAKİ SİNYAL", at=1.4)), ("fade", 0.35)),
    sc("gorev_map", "lab", S("gorev", -0.1), {"title": "Okyanus tabanı haritalanıyor", "panels": [
        {"kind": "bathy", "x": 5, "y": 22, "w": 58, "h": 66, "title": "ÇOK IŞINLI SONAR · BATİMETRİ", "from": 0, "dur": 9},
        {"kind": "counter", "x": 66, "y": 22, "w": 29, "h": 32, "a": 0, "b": 27.3, "from": W("gorev", "Çünkü", off=-0.4), "to": W("gorev", "dörtte", off=0.6), "decimals": 1, "unit": "%", "label": "Ayrıntılı haritalanan taban", "at": 8},
        {"kind": "text", "x": 66, "y": 58, "w": 29, "h": 30, "text": "Seabed 2030", "sub": "Haziran 2025 verisi · modern standartlarda haritalanan okyanus tabanı", "size": 40, "at": 18}]}, ("fade", 0.25)),
    sc("sinyal_storm", "ocean", S("sinyal", -0.15), storm(
        [{"t": 0, "v": [-120, 9, 75]}, {"t": 4, "v": [-112, 9.5, 70]}], 1.012, -0.02, 32, flashes=[W("sinyal", "gece", off=0.1)], rain=1.2), ("cut", 0)),
    sc("sinyal_spectro", "lab", W("sinyal", "tuhaf", off=-0.15), {"title": "Hidrofon kaydı · 8.000 m", "panels": [
        {"kind": "spectro", "x": 5, "y": 21, "w": 62, "h": 68, "title": "SPEKTROGRAM · 0–200 Hz", "beats": [0.5, 1.7, 2.9, 4.1, 5.3, 6.5, 7.7, 8.9, 10.1, 11.3, 12.5, 13.7, 14.9, 16.1], "window": 10},
        {"kind": "sonar", "x": 69, "y": 21, "w": 27, "h": 46, "title": "SONAR", "contact": 8000, "range": 10000},
        {"kind": "log", "x": 69, "y": 70, "w": 27, "h": 19, "lines": ["> KAYNAK: 8.012 m ±40", "> PERİYOT: DÜZENLİ", "> TEKRAR: EVET", "> DOĞAL? …"], "rate": 14}]}),
    sc("jeoloji_lab", "lab", S("jeoloji", -0.1), {"title": "Olası doğal açıklamalar", "panels": [
        {"kind": "check", "x": 5, "y": 22, "w": 46, "h": 62, "title": "HİPOTEZLER", "items": [
            {"text": "Yer kabuğunda çatlak", "at": W("jeoloji", "yer"), "status": "wait"},
            {"text": "Gaz kabarcıkları", "at": W("jeoloji", "gaz"), "status": "wait"},
            {"text": "Uzak bir depremin yankısı", "at": W("jeoloji", "uzak"), "status": "wait"}]},
        {"kind": "scope", "x": 54, "y": 22, "w": 41, "h": 62, "title": "SİSMİK KANAL", "beats": [0.4, 2.8, 3.1, 6.9], "window": 8}]}, ("fade", 0.25)),
    sc("ses_sources", "signal", S("okyanus_ses", -0.1), {"mode": "sources", "title": "Okyanus aslında gürültülü", "sub": "Doğal ve insan kaynaklı sesler"}, ("fade", 0.25)),
    sc("fark_scope", "lab", S("fark", -0.1), {"title": "Atım grupları işaretleniyor", "panels": [
        {"kind": "scope", "x": 5, "y": 22, "w": 90, "h": 46, "title": "ATIM DİZİSİ · ZAMAN", "beats": [0.3, 0.45, 1.4, 1.55, 1.7, 2.6, 2.75, 2.9, 3.05, 3.2, 4.3], "window": 6},
        {"kind": "log", "x": 5, "y": 72, "w": 90, "h": 19, "lines": ["> grup uzunlukları ölçülüyor…", "> 2 · 3 · 5 · 7 · 11 · 13 …"], "rate": 40}]}),
    sc("asal_primes", "signal", S("asal", -0.1), {"mode": "primes", "title": "Atımlar rastgele değil", "groups": [
        {"at": W("asal", "İki"), "n": 2}, {"at": W("asal", "Üç"), "n": 3}, {"at": W("asal", "beş"), "n": 5},
        {"at": W("asal", "yedi"), "n": 7}, {"at": W("asal", "on", 1), "n": 11}, {"at": W("asal", "on", 2), "n": 13}]}, ("cut", 0)),
    sc("asal_sieve", "signal", S("asal2", -0.1), {"mode": "sieve", "title": "Asal sayılar", "sub": "Yalnızca 1'e ve kendisine bölünebilen sayılar", "at": 0.3}, ("fade", 0.2)),
    sc("doga_compare", "signal", S("doga", -0.1), {"mode": "compare", "title": "Doğa asal sayı sayamaz"}, ("fade", 0.2)),
    sc("tekrar_cycle", "lab", S("tekrar", -0.1), {"title": "Her 37 dakikada bir, baştan", "panels": [
        {"kind": "cycle", "x": 5, "y": 26, "w": 90, "h": 34, "title": "SİNYAL DÖNGÜSÜ", "period": 37, "count": 5},
        {"kind": "counter", "x": 30, "y": 64, "w": 40, "h": 26, "a": 0, "b": 37, "from": 0.4, "to": W("tekrar", "dakikada", off=0.4), "unit": "dk", "label": "Tekrar aralığı"}]}),
    sc("soru_storm", "ocean", S("soru", -0.2), storm(
        [{"t": 0, "v": [-50, 70, 90]}, {"t": 8, "v": [-44, 60, 80]}], 0.507, -0.6, 45, flashes=[W("soru", "sesleniyor", off=-0.3)], rain=1.1), ("fade", 0.3)),
    sc("rov_dawn", "ocean", S("rov", -0.15), storm(
        [{"t": 0, "v": [-180, 7, -60]}, {"t": 8, "v": [-170, 8, -56]}], 1.893, 0.0, 34, amp=1.0, storm=0.2, dawn=1, rain=0,
        ship={"pos": [0, 0, 0], "yaw": 0.0, "rovY": 9.5, "motion": 0.4}), ("fade", 0.6)),

    # ===================== BÖLÜM 2 · BİLİNMEYENE İNİŞ =====================
    sc("yanki_hero", "deep3d", S("yanki", -0.6), deep(
        [K(0, [5.5, 601.6, 4.2], [0, 600.2, 0], 38), K(9, [1.5, 602.4, 6.8], [0, 600.3, 0], 36)],
        sigma=[0.06, 0.022, 0.015], city=False, lamps={"mode": "rov", "i": 6, "beams": 1}, rov={"show": True, "pos": [0, 600, 0], "yaw": 0.6},
        water={"sigma": [0.05, 0.02, 0.014], "color": "#06233a", "amb": "#0e3050", "surface": 1.0, "surfCol": "#8fb4c4"}, seabed={"show": False},
        chapter=ch("BÖLÜM 2", "BİLİNMEYENE İNİŞ", at=0.8)), ("fade", 0.8)),
    sc("suya_dawn", "ocean", S("suya", -0.1), storm(
        [{"t": 0, "v": [-110, 3, 40]}, {"t": 5, "v": [-106, 3, 38]}], 1.107, 0.05, 30, amp=0.9, storm=0.2, dawn=1, rain=0,
        ship={"pos": [0, 0, 0], "yaw": 0.0, "rovY": [{"t": 0, "v": 10}, {"t": 4.2, "v": -1}], "motion": 0.35})),
    sc("m100_water", "ocean", S("m100", -0.15), water([{"t": 0, "v": 40}, {"t": 4, "v": 100}], cam={"pitch": 0.38, "fov": 62}, lamp=0, snow=0.45, descent=2.2,
        hud=hud([{"t": 0, "v": 40}, {"t": 4, "v": 100}], minimal=True)), ("fade", 0.4)),
    sc("m100_spectrum", "info", W("m100", "Önce", off=-0.35), {"mode": "spectrum", "title": "Işık suda renk renk kaybolur", "sub": "Yaklaşık penetrasyon derinlikleri · açık okyanus", "source": "NOAA Ocean Exploration"}, ("fade", 0.25)),
    sc("m200_water", "ocean", S("m200", -0.15), water(200, cam={"pitch": 0.25, "fov": 58}, lamp=0, snow=0.55, descent=1.6, hud=hud([{"t": 0, "v": 190}, {"t": 4, "v": 210}])), ("fade", 0.3)),
    sc("m1000_water", "ocean", S("m1000", -0.15), water(1000, cam={"pitch": -0.05, "fov": 55}, lamp=0, bio=0.25, snow=0.15, descent=0.9, hud=hud([{"t": 0, "v": 990}, {"t": 3, "v": 1010}]))),
    sc("m1000_zones", "info", W("m1000", "Burası", off=-0.2), {"mode": "zones", "depth": 1000, "source": "NOAA · okyanus ışık bölgeleri"}, ("fade", 0.25)),
    sc("biyo_water", "ocean", S("biyo", -0.15), water(1100, cam={"pitch": 0.0, "fov": 56}, lamp=0.45, bio=1, jelly=1, snow=0.35, descent=0.5,
        hud=hud(1104), tag="GERÇEK · MBARI 2017: ~%76", tagColor="#5BE38A"), ("fade", 0.3)),
    sc("m4000_rov", "deep3d", S("m4000", -0.15), deep(
        [K(0, [5.5, 301.2, 5.8], [0, 300.0, 0], 44), K(8, [5.2, 294.2, 5.5], [0, 293.0, 0], 44)], sigma=[0.05, 0.02, 0.015], city=False, seabed={"show": False},
        lamps={"mode": "rov", "i": 7, "beams": 1}, rov={"show": True, "pos": [{"t": 0, "v": [0, 300, 0]}, {"t": 8, "v": [0, 293, 0], "e": "cine"}], "yaw": 0.5, "pitch": -0.25},
        water={"sigma": [0.05, 0.02, 0.015], "color": "#010409", "amb": "#0a141a", "surface": 0.5, "surfCol": "#3a5662"}, tag="4.000 m · 1,6 °C", tagColor="#62F0E4"), ("fade", 0.3)),
    sc("parazit_water", "ocean", S("parazit", -0.1), water(4200, cam={"pitch": -0.1, "fov": 55}, lamp=1, snow=0.7, descent=0.8,
        glitch=[{"t": 0, "v": 0}, {"t": 1.4, "v": 0.45}, {"t": 3.0, "v": 0.2}, {"t": 4.5, "v": 0.5}],
        hud=hud(4230, glitch=[{"t": 0, "v": 0}, {"t": 1.4, "v": 0.45}, {"t": 3.0, "v": 0.2}, {"t": 4.5, "v": 0.5}], note="VERİ KAYBI · YENİDEN İLETİLİYOR"))),
    sc("kablo_tether", "info", S("kablo", -0.1), {"mode": "tether", "title": "Tek bağlantı: kablo", "noise": 0.0}, ("fade", 0.25)),
    sc("kablo_tether2", "info", W("kablo", "Ve", nth=1, off=-0.1), {"mode": "tether", "title": "Kabloda açıklanamayan gürültü", "noise": 0.8}),
    sc("m6000_zones", "info", S("m6000", -0.1), {"mode": "zones", "depth": 6000, "source": "NOAA · hadal bölge (6.000–11.000 m)"}, ("fade", 0.25)),
    sc("m8000_water", "ocean", S("m8000", -0.1), water(8000, cam={"pitch": -0.2, "fov": 54}, lamp=1, snow=0.55, descent=0.5, hud=hud([{"t": 0, "v": 7980}, {"t": 3, "v": 8003}], temp=1.9))),
    sc("basinc_info", "info", W("m8000", "Basınç", off=-0.2), {"mode": "pressure", "source": "NOAA · ≈1 atm / 10 m"}, ("fade", 0.25)),
    sc("balik_fish", "deep3d", S("balik", -0.15), deep(
        [K(0, [-1000, 2.2, -500], [-1004, 1.4, -507], 44), K(8, [-999.6, 2.1, -500.6], [-1003.5, 1.4, -507.5], 42)],
        sigma=MIDC, lamps={"mode": "cam", "i": 0.9}, power=0.5, fish={"show": True, "pos": [{"t": 0, "v": [-1002.1, 1.95, -501.7]}, {"t": 8, "v": [-1000.4, 2.0, -502.6]}], "yaw": -2.646},
        hud=hud(8031, alt=2.0), tag="TEMSİLİ · SALYANGOZ BALIĞI (8.336 m, 2022)", tagColor="#62F0E4"), ("fade", 0.3)),
    sc("carpma_wall", "deep3d", S("carpma", -0.1), deep(
        [K(0, [611.93, 24.53, 69.69], [594.33, 15.25, 67.69], 50), K(5.5, [598.38, 17.38, 68.15], [594.33, 15.25, 67.69], 48)],
        sigma=CLOSE, lamps={"mode": "cam", "i": 1.6}, power=0.0, hud=hud([{"t": 0, "v": 8040}, {"t": 5, "v": 8046}], alt=[{"t": 0, "v": 9.0}, {"t": 5, "v": 3.4}]))),

    # ===================== BÖLÜM 3 · İLK KEŞİF =====================
    sc("kaya_wall", "deep3d", S("kaya", -0.4), deep(
        [K(0, [591.0, 23.2, 77.97], [588.07, 21.2, 77.92], 52), K(7, [590.11, 23.2, 80.3], [587.64, 21.2, 79.04], 50)],
        sigma=CLOSE, lamps={"mode": "cam", "i": 1.0}, power=0.35, hud=hud(8046, alt=3.1),
        chapter=ch("BÖLÜM 3", "İLK KEŞİF", at=0.6)), ("cut", 0)),
    sc("desen_macro", "deep3d", S("desen", -0.1), deep(
        [K(0, [585.76, 26.39, 78.03], [583.22, 25.32, 80.71], 56), K(7, [584.92, 26.39, 79.85], [582.59, 25.32, 82.07], 56)],
        sigma=CLOSE, lamps={"mode": "cam", "i": 0.9}, power=0.55, hud=hud(8046, alt=2.6))),
    sc("dogal_basalt", "deep3d", S("dogal", -0.1), deep(
        [K(0, [913, 7.5, 461], [900, 3.5, 450], 44), K(7, [909, 6.5, 463], [899, 3.5, 450], 42)],
        sigma=MIDC, lamps={"mode": "cam", "i": 4.5}, power=0.5, basalt={"show": True, "pos": [900, -0.5, 450]},
        hud=hud(7920, alt=5.2), tag="DOĞAL ÖRNEK · BAZALT SÜTUNLARI (TEMSİLİ)", tagColor="#62F0E4"), ("fade", 0.3)),
    sc("nabiz_wall", "deep3d", W("dogal", "Ama", off=-0.15), deep(
        [K(0, [596.57, 20.5, 59.95], [592.94, 18.28, 61.83], 48), K(9, [596.31, 20.5, 67.95], [592.67, 18.28, 69.83], 47)],
        sigma=CLOSE, lamps={"mode": "cam", "i": 0.12}, power=1.6, veins=0.0, micro=1.4, beats=[W("nabiz", "turkuaz"), W("nabiz", "Yavaşça"), W("nabiz", "nabız")],
        hud=hud(8046, alt=3.0))),
    sc("geri_pullback", "deep3d", S("geri", -0.1), deep(
        [K(0, [598.38, 17.38, 68.15], [594.33, 15.25, 67.69], 50), K(7.5, [655.93, 57.73, 74.69], [540, 22, 60], 46)],
        sigma=[{"t": 0, "v": CLOSE}, {"t": 7.5, "v": [0.014, 0.006, 0.0048]}], lamps={"mode": "cam", "i": [{"t": 0, "v": 2.0}, {"t": 5, "v": 0.6}]}, power=1.0,
        hud=hud(8046, alt=[{"t": 0, "v": 3.0}, {"t": 7.5, "v": 58}]))),
    sc("sehir_reveal", "deep3d", S("sehir", -0.2), deep(
        [K(0, [720, 42, -120], [0, 110, 0], 44), K(12, [712, 96, -118], [0, 140, 0], 44)],
        sigma=[{"t": 0, "v": WIDE}, {"t": 10, "v": FAR}], lamps={"mode": "rov", "i": 6, "beams": 1}, power=[{"t": 0, "v": 0.85}, {"t": 4, "v": 1.15}],
        rov={"show": True, "pos": [{"t": 0, "v": [708.9, 44.0, -120.2]}, {"t": 12, "v": [700.9, 97.7, -118.2], "e": "cine"}], "yaw": -2.977}, grade={"vignette": 0.6}), ("fade", 0.5)),
    sc("olcek_domes", "deep3d", S("olcek", -0.1), deep(
        [K(0, [330, 170, 270], [140, 10, 120], 46), K(3, [318, 162, 262], [135, 10, 118], 46)], sigma=WIDE, lamps={"mode": "off"}, power=1.1)),
    sc("olcek_tunnels", "deep3d", W("olcek", "Kilometrelerce", off=-0.1), deep(
        [K(0, [198, 20, 86], [120, 24, 168], 42), K(4, [190, 22, 94], [112, 24, 176], 42)], sigma=[0.012, 0.005, 0.004], lamps={"mode": "off"}, power=1.1)),
    sc("olcek_heart", "deep3d", W("olcek", "Ve", off=-0.1), deep(
        [K(0, [170, 26, 160], [0, 175, 0], 46), K(5, [150, 30, 140], [0, 185, 0], 46)], sigma=WIDE, lamps={"mode": "off"}, power=1.2)),
    sc("kure_info", "info", S("kure", -0.1), {"mode": "sphere", "title": "Basınca en iyi dayanan şekil: küre", "source": "Derin dalış araçlarının mürettebat küreleri bu ilkeyle tasarlanır"}, ("fade", 0.25)),
    sc("ulasim_pods", "deep3d", S("ulasim", -0.1), deep(
        [K(0, [100, 48, 196], [150, 22, 130], 46), K(6, [104, 47, 190], [152, 22, 128], 46)], sigma=[0.02, 0.008, 0.006], lamps={"mode": "off"}, power=1.2)),
    sc("sessiz_lab", "lab", S("sessiz", -0.1), {"title": "Meridyen · kontrol odası", "panels": [
        {"kind": "feed", "x": 4, "y": 20, "w": 56, "h": 70, "src": "gizli/city_wide.jpg", "label": "YANKI · KAYIT"},
        {"kind": "bars", "x": 62, "y": 20, "w": 34, "h": 44, "title": "VERİ", "items": [
            {"text": "KAYDEDİLİYOR", "from": W("sessiz", "Görüntüler"), "dur": 2.2},
            {"text": "KOPYALANIYOR", "from": W("sessiz", "kopyalanıyor"), "dur": 2.0},
            {"text": "ŞİFRELENİYOR", "from": W("sessiz", "şifreleniyor"), "dur": 2.4, "color": "#FFB347"}]},
        {"kind": "log", "x": 62, "y": 67, "w": 34, "h": 23, "lines": ["SHA-256 9f2c…a71e", "SHA-256 41bb…09d3", "ARŞİV-01 ✓", "ARŞİV-02 ✓", "YEDEK: 3 KOPYA"], "rate": 18}]}),
    sc("eskisi_far", "deep3d", S("eskisi", -0.15), deep(
        [K(0, [-900, 250, 700], [0, 80, 0], 40), K(10, [-860, 232, 668], [0, 90, 0], 40)], sigma=FAR, lamps={"mode": "off"}, power=1.15, period=3.0), ("fade", 0.4)),

    # ===================== BÖLÜM 4 · DÜNYA GERÇEĞİ ÖĞRENİYOR =====================
    sc("sizinti_phones", "news", S("sizinti", -0.3), {"mode": "phones", "chapter": ch("BÖLÜM 4", "DÜNYA GERÇEĞİ ÖĞRENİYOR", at=0.4)}, ("fade", 0.4)),
    sc("sahte_verify", "lab", S("sahte", -0.1), {"title": "Yapay zekâ sahtesi mi?", "sub": "BAĞIMSIZ DOĞRULAMA", "tag": "KURGUSAL CANLANDIRMA", "panels": [
        {"kind": "feed", "x": 4, "y": 21, "w": 50, "h": 68, "src": "gizli/wall.jpg", "label": "KARE ANALİZİ"},
        {"kind": "check", "x": 57, "y": 21, "w": 39, "h": 68, "title": "DOĞRULAMA", "items": [
            {"text": "Sonar verisiyle tutarlı", "at": W("sahte", "Ama"), "status": "ok"},
            {"text": "Hidrofon kaydıyla tutarlı", "at": W("sahte", "bağımsız"), "status": "ok"},
            {"text": "3 bağımsız ekip", "at": W("sahte", "veriyi"), "status": "ok"},
            {"text": "Meta veri bütün", "at": W("sahte", "doğruluyor"), "status": "ok"}]}]}),
    sc("ikiye_split", "news", S("ikiye", -0.1), {"mode": "split", "at": 0.2}, ("whip", 0.3)),
    sc("piyasa_markets", "news", S("piyasa", -0.1), {"mode": "markets", "headline": "Piyasalarda sert dalgalanma", "tag": "VARSAYIMSAL SENARYO"}, ("fade", 0.25)),
    sc("toplanti_council", "news", S("toplanti", -0.1), {"mode": "council", "src": "gizli/city_wide.jpg"}, ("fade", 0.3)),
    sc("hukuk_law", "info", S("hukuk", -0.1), {"mode": "law", "source": "BM Deniz Hukuku Sözleşmesi (UNCLOS), Madde 136"}, ("fade", 0.3)),
    sc("miras_city", "deep3d", S("miras", -0.1), deep(
        [K(0, [-330, 24, 280], [0, 120, 0], 38), K(8, [-318, 30, 270], [0, 125, 0], 38)], sigma=WIDE, lamps={"mode": "off"}, power=1.0), ("fade", 0.3)),
    sc("kanit_lab", "lab", S("kanit", -0.1), {"title": "Bilim insanlarının ortak değerlendirmesi", "tag": "KURGUSAL CANLANDIRMA", "panels": [
        {"kind": "check", "x": 6, "y": 22, "w": 56, "h": 64, "title": "DURUM", "items": [
            {"text": "Saldırgan davranış: gözlenmedi", "at": W("kanit", "hiçbir", off=-0.4), "status": "ok"},
            {"text": "Robota müdahale: yok", "at": W("kanit", "hiçbir", off=0.3), "status": "ok"},
            {"text": "Niyet: bilinmiyor", "at": W("kanit", "yok", off=0.2), "status": "wait"}]},
        {"kind": "sonar", "x": 65, "y": 22, "w": 30, "h": 64, "title": "SONAR", "contact": 8034, "range": 10000}]}),
    sc("bekliyor_rov", "deep3d", S("bekliyor", -0.1), deep(
        [K(0, [552, 40, -46], [430, 62, -24], 40), K(8, [546, 41, -44], [420, 64, -22], 40)], sigma=WIDE,
        lamps={"mode": "rov", "i": 6, "beams": 1}, rov={"show": True, "pos": [524, 32, -40], "yaw": -2.97}, power=1.0), ("fade", 0.3)),

    # ===================== BÖLÜM 5 · İLK TEMAS =====================
    sc("ilerle_track", "deep3d", S("ilerle", -0.4), deep(
        [K(0, [392, 120, -58], [300, 112, -50], 44), K(9, [262, 125, -38], [170, 118, -30], 44)], sigma=WIDE,
        lamps={"mode": "rov", "i": 6, "beams": 1}, rov={"show": True, "pos": [{"t": 0, "v": [378, 116, -56]}, {"t": 9, "v": [248, 121, -36]}], "yaw": -2.99}, power=1.1,
        chapter=ch("BÖLÜM 5", "İLK TEMAS", at=0.6)), ("fade", 0.5)),
    sc("degisim_spectro", "lab", S("degisim", -0.1), {"title": "Sinyal değişti", "panels": [
        {"kind": "spectro", "x": 5, "y": 21, "w": 90, "h": 68, "title": "SPEKTROGRAM · CANLI", "window": 8,
         "beats": [0.2, 0.5, 0.8, 1.1, 1.4, 2.0, 2.2, 2.35, 2.5, 2.6, 2.7, 2.85, 3.0, 3.1, 3.3, 3.45, 3.6, 3.7, 3.85, 4.0, 4.1, 4.3, 4.4, 4.55, 4.7, 4.85, 5.0, 5.1, 5.3, 5.4, 5.55, 5.7, 5.85, 6.0, 6.1, 6.25, 6.4, 6.5, 6.7], "band": [0.35, 0.78], "hot": 0.9}]}),
    sc("dil_lab", "lab", S("dil", -0.1), {"title": "Ama hangi dille?", "panels": [
        {"kind": "log", "x": 6, "y": 24, "w": 88, "h": 62, "title": "YANIT PROTOKOLÜ", "lines": ["> dil? bilinmiyor", "> ortak zemin: matematik", "> asal sayılar · geometri · fizik sabitleri", "> ilk mesaj: sayma dizisi", "> iletim: ROV hoparlörü, 20–200 Hz"], "rate": 16}]}),
    sc("mat_pi", "signal", S("mat", -0.1), {"mode": "pi", "title": "Evrensel olabilecek tek dil", "at": W("mat", "Bir", off=-0.3)}, ("fade", 0.25)),
    sc("gonder_send", "signal", S("gonder", -0.1), {"mode": "send", "title": "Biz de saymayı biliyoruz", "sub": "Yankı → şehir", "groups": [
        {"at": W("gonder", "Bir", 2), "n": 1}, {"at": W("gonder", "iki"), "n": 2}, {"at": W("gonder", "üç"), "n": 3},
        {"at": W("gonder", "beş"), "n": 5}, {"at": W("gonder", "yedi"), "n": 7}]}, ("fade", 0.2)),
    sc("bekle_wait", "lab", S("bekle", -0.2), {"title": "Bekleniyor…", "panels": [
        {"kind": "counter", "x": 18, "y": 24, "w": 64, "h": 34, "a": 0, "b": 6, "from": 0.2, "to": 2.6, "unit": "saat", "label": "Yanıtsız geçen süre"},
        {"kind": "scope", "x": 18, "y": 62, "w": 64, "h": 28, "title": "GELEN KANAL", "window": 6}]}),
    sc("yanit_city", "deep3d", S("yanit", -0.1), deep(
        [K(0, [552, 40, -46], [430, 62, -24], 40), K(6, [540, 42, -42], [415, 66, -20], 38)], sigma=WIDE,
        lamps={"mode": "rov", "i": 6, "beams": 1}, rov={"show": True, "pos": [524, 32, -40], "yaw": -2.97}, power=1.15,
        beats=[W("yanit", "yanıt", off=-0.1), W("yanit", "veriyor"), W("yanit", "Dizinin")], tag="ŞEHİR YANIT VERİYOR", tagColor="#62F0E4"), ("fade", 0.3)),
    sc("yanit_primes", "signal", W("yanit", "on", 1, -0.45), {"mode": "primes", "title": "Şehir yanıt veriyor", "groups": [
        {"at": W("yanit", "on", 1), "n": 11}, {"at": W("yanit", "on", 2), "n": 13}, {"at": W("yanit", "on", 3), "n": 17}]}, ("fade", 0.2)),
    sc("yanit_glyph", "signal", W("yanit", "ardından", off=-0.2), {"mode": "glyph", "title": "Çok daha karmaşık bir desen", "at": 0.1, "decode": {"from": E("pi", -2.0), "dur": 2.5}}, ("zoom", 0.35)),
    sc("hareket_pov", "deep3d", S("hareket", -0.1), deep(
        [K(0, [524, 38, -150], [420, 60, -120], 44), K(5, [522, 38, -149], [430, 52, -128], 44)], sigma=[0.02, 0.008, 0.006],
        lamps={"mode": "cam", "i": 5}, power=0.95, being={"vis": 0.35, "pos": [477, 12, -138], "yaw": 0.3},
        hud=hud(8034, alt=31, note="HAREKET ALGILANDI", glitch=0.05))),
    sc("siluet_being", "deep3d", S("siluet", -0.1), deep(
        [K(0, [522, 40, -150], [477, 30, -138], 42), K(9, [518, 40, -149], [477, 30, -138], 40)], sigma=[0.02, 0.008, 0.006],
        lamps={"mode": "cam", "i": 4}, power=1.0, being={"vis": 0.9, "pos": [477, 12, -138], "yaw": 0.3},
        hud=hud(8034, alt=31, glitch=0.03))),
    sc("belirsiz_being", "deep3d", S("belirsiz", -0.1), deep(
        [K(0, [497, 32, -146], [477, 38, -138], 34), K(9, [494, 30, -147], [477, 34, -138], 34)], sigma=[0.026, 0.01, 0.0075],
        lamps={"mode": "cam", "i": 4}, power=1.0, being={"vis": 1.0, "pos": [477, 12, -138], "yaw": 0.3}, hud=hud(8034, alt=31, glitch=0.04))),
    sc("ritim_being", "deep3d", S("ritim", -0.1), deep(
        [K(0, [510, 36, -150], [477, 32, -138], 38), K(5, [508, 36, -150], [477, 32, -138], 38)], sigma=[0.022, 0.009, 0.007],
        lamps={"mode": "cam", "i": 3.5}, power=1.0, being={"vis": 1.0, "pos": [477, 12, -138], "yaw": 0.3},
        beats=[W("ritim", "ışıklar"), W("ritim", "sinyalle"), W("ritim", "aynı"), W("ritim", "ritimde"), W("ritim", "yanıp"), W("ritim", "sönüyor")],
        hud=hud(8034, alt=31, glitch=0.06))),
    sc("kopus_lost", "deep3d", S("kopus", -0.1), deep(
        [K(0, [510, 36, -150], [477, 32, -138], 38), K(5, [509, 36, -150], [477, 32, -138], 38)], sigma=[0.022, 0.009, 0.007],
        lamps={"mode": "cam", "i": 3.5}, power=1.0, being={"vis": 1.0, "pos": [477, 12, -138], "yaw": 0.3},
        hud=hud(8034, alt=31, glitch=[{"t": 0, "v": 0.1}, {"t": 1.2, "v": 0.9}], lost=[{"t": 0, "v": 0}, {"t": 1.6, "v": 0}, {"t": 1.75, "v": 1}]))),

    # ===================== BÖLÜM 6 · TEKNOLOJİK UÇURUM =====================
    sc("donus_pov", "deep3d", S("donus", -0.5), deep(
        [K(0, [510, 36, -150], [477, 32, -138], 38), K(7, [506, 37, -149], [470, 34, -136], 38)], sigma=[0.022, 0.009, 0.007],
        lamps={"mode": "cam", "i": 3.5}, power=1.0, hud=hud(8034, alt=31, glitch=[{"t": 0, "v": 0.7}, {"t": 1.5, "v": 0.0}], note="BAĞLANTI YENİDEN KURULDU · HASAR YOK"),
        chapter=ch("BÖLÜM 6", "TEKNOLOJİK UÇURUM", at=2.0))),
    sc("nasil_facts", "info", S("nasil", -0.1), {"mode": "facts", "title": "Gerçek bilim ve kurgu", "rows": [
        {"real": "Hidrotermal bacalar ve kimyasal enerji", "fic": "Şehir ölçeğinde jeotermal güç", "at": W("nasil", "Burada")},
        {"real": "Basınca dayanıklı moleküller, kendini onaran malzemeler", "fic": "800 atm'de yüzyıllık şehir", "at": W("nasil", "gerçek")},
        {"real": "Biyolüminesans · SOFAR ses kanalı", "fic": "Canlı ışıkla aydınlanan, okyanuslar arası konuşan uygarlık", "at": W("nasil", "kurguyu")}]}, ("fade", 0.3)),
    sc("baca_vents", "deep3d", S("baca", -0.1), deep(
        [K(0, [-936, 7, 316], [-950, 7, 300], 46), K(9, [-940, 6.5, 313], [-950, 7.5, 300], 44)], sigma=[0.06, 0.025, 0.018], city=False,
        lamps={"mode": "cam", "i": 6}, vents={"show": True, "pos": [-950, 0, 300]}, hud=hud(2510, label="TEMSİLİ · HİDROTERMAL BACA"),
        tag="GERÇEK · İLK KEŞİF 1977 (WHOI)", tagColor="#5BE38A"), ("fade", 0.3)),
    sc("ekosistem_worms", "deep3d", S("ekosistem", -0.1), deep(
        [K(0, [-939.5, 4.6, 313], [-950, 1.6, 300], 42), K(7, [-940.5, 4.4, 312], [-950, 1.6, 300.5], 42)], sigma=[0.06, 0.025, 0.018], city=False,
        lamps={"mode": "cam", "i": 5}, vents={"show": True, "pos": [-950, 0, 300]}, hud=hud(2510, label="TEMSİLİ · TÜP SOLUCANLARI"),
        tag="GERÇEK · KİMYASAL ENERJİYLE YAŞAM", tagColor="#5BE38A")),
    sc("enerji_kurgu_heart", "deep3d", S("enerji_kurgu", -0.1), deep(
        [K(0, [260, 165, -220], [0, 195, 0], 40), K(6, [240, 170, -200], [0, 197, 0], 40)], sigma=WIDE, lamps={"mode": "off"}, power=1.3,
        tag="KURGU · ŞEHİR ÖLÇEĞİNDE ENERJİ", tagColor="#FFB347"), ("fade", 0.3)),
    sc("yapi_fish", "deep3d", S("yapi", -0.1), deep(
        [K(0, [-1001, 2.3, -501], [-1004.5, 1.6, -507], 40), K(6, [-1000.6, 2.2, -501.4], [-1004, 1.6, -507.5], 40)], sigma=MIDC,
        lamps={"mode": "cam", "i": 1.3}, power=0.4, fish={"show": True, "pos": [{"t": 0, "v": [-1000.3, 2.05, -503.4]}, {"t": 6, "v": [-1002.0, 2.0, -502.5]}], "yaw": 0.5},
        tag="GERÇEK · BASINCA KARŞI KORUYUCU MOLEKÜLLER", tagColor="#5BE38A"), ("fade", 0.3)),
    sc("yapi_wall", "deep3d", W("yapi", "Kendini", off=-0.15), deep(
        [K(0, [585.83, 26.46, 78.06], [583.22, 25.32, 80.71], 54), K(5, [584.99, 26.46, 79.88], [582.59, 25.32, 82.07], 54)], sigma=CLOSE,
        lamps={"mode": "cam", "i": 1.5}, power=0.7, tag="GERÇEK · KENDİNİ ONARAN MALZEMELER (LABORATUVAR)", tagColor="#5BE38A")),
    sc("yapi_kurgu_dome", "deep3d", S("yapi_kurgu", -0.1), deep(
        [K(0, [-20, 60, 330], [-163, 30, 171], 44), K(5, [-10, 64, 322], [-160, 32, 168], 44)], sigma=[0.012, 0.005, 0.004], lamps={"mode": "off"}, power=1.05,
        tag="KURGU · 800 ATM'DE YÜZYILLIK ŞEHİR", tagColor="#FFB347"), ("fade", 0.25)),
    sc("isik_bio", "ocean", S("isik", -0.1), water(1300, cam={"pitch": 0.05, "fov": 56}, lamp=0.3, bio=1.2, jelly=1.0, snow=0.3, descent=0.3, hud=hud(1300, minimal=True),
        tag="GERÇEK · BİYOLÜMİNESANS", tagColor="#5BE38A"), ("fade", 0.3)),
    sc("isik_city", "deep3d", W("isik", "Bütün", off=-0.15), deep(
        [K(0, [380, 60, 420], [100, 40, 150], 40), K(6, [370, 62, 410], [96, 42, 146], 40)], sigma=[0.01, 0.0042, 0.0034], lamps={"mode": "off"}, power=1.25,
        tag="KURGU · CANLI IŞIKLA AYDINLANAN ŞEHİR", tagColor="#FFB347"), ("fade", 0.25)),
    sc("sofar_info", "info", S("sofar", -0.1), {"mode": "sofar", "title": "Okyanusun doğal ses kanalı", "source": "NOAA · SOFAR kanalı"}, ("fade", 0.3)),
    sc("fisilti_earth", "earth", S("fisilti", -0.2), {
        "clouds": 0.45, "stars": 0.7, "exposure": 1.1, "sat": 1.05, "sunFollow": [-10, 35],
        "keys": [{"t": 0, "lat": 5, "lon": -150, "alt": 13500, "heading": 0, "pitch": 90, "fov": 46}, {"t": 8, "lat": 0, "lon": -120, "alt": 15500, "e": "linear"}],
        "arcs": [{"from": [-30.5, -177.0], "to": [19.8, -66.0], "start": 0.6, "dur": 2.4}, {"from": [-30.5, -177.0], "to": [-10.3, 110.0], "start": 1.6, "dur": 2.8}]}, ("fade", 0.4)),
    sc("ucurum_gap", "info", S("ucurum", -0.1), {"mode": "gap", "title": "Aradaki fark: yüzyıllar mı, binlerce yıl mı?"}, ("fade", 0.3)),
    sc("ekonomi_lab", "lab", S("ekonomi", -0.1), {"title": "Tek bir teknoloji, bütün bir sektör", "tag": "VARSAYIMSAL SENARYO", "panels": [
        {"kind": "counter", "x": 5, "y": 22, "w": 40, "h": 40, "a": 100, "b": 31, "from": W("ekonomi", "petrolden"), "to": W("ekonomi", "altüst", off=0.6), "label": "Enerji endeksi (varsayımsal)", "color": "#FF5A4A"},
        {"kind": "log", "x": 48, "y": 22, "w": 47, "h": 66, "title": "ETKİLENEN SEKTÖRLER", "lines": ["• Petrol ve doğal gaz", "• Elektrik üretimi", "• Malzeme bilimi", "• Savunma sanayi", "• Deniz taşımacılığı", "• Patent ve lisans hukuku"], "rate": 10},
        {"kind": "text", "x": 5, "y": 66, "w": 40, "h": 22, "text": "Tek bir patent…", "size": 44, "at": W("ekonomi", "Tek", nth=2)}]}, ("fade", 0.25)),
    sc("tur_city", "deep3d", S("tur", -0.1), deep(
        [K(0, [690, 66, 214], [0, 120, 0], 40), K(8, [700, 72, 220], [0, 125, 0], 39)], sigma=WIDE,
        lamps={"mode": "rov", "i": 5, "beams": 1}, rov={"show": True, "pos": [672, 60, 206], "yaw": -2.84}, power=1.05), ("fade", 0.4)),

    # ===================== BÖLÜM 7 · İNSANLIĞIN EN ZOR KARARI =====================
    sc("karar_choice", "choice", S("karar", -0.4), {"title": "İnsanlığın en zor kararı", "chapter": ch("BÖLÜM 7", "İNSANLIĞIN EN ZOR KARARI", at=0.3)}, ("fade", 0.5)),
    sc("yol1_choice", "choice", S("yol1", -0.1), {"focus": [{"at": 0, "i": 0}]}),
    sc("risk1_being", "deep3d", S("risk1", -0.1), deep(
        [K(0, [560, 42, -172], [477, 28, -138], 30), K(5, [556, 42, -170], [477, 28, -138], 30)], sigma=[0.03, 0.012, 0.009],
        lamps={"mode": "off"}, power=0.9, being={"vis": 0.55, "pos": [477, 12, -138], "yaw": 0.3}), ("fade", 0.3)),
    sc("yol2_choice", "choice", S("yol2", -0.1), {"focus": [{"at": 0, "i": 1}], "risks": [{"at": 0, "i": 0, "text": "Niyetleri bilinmiyor"}]}, ("fade", 0.25)),
    sc("risk2_storm", "ocean", S("risk2", -0.1), storm(
        [{"t": 0, "v": [-240, 10, 120]}, {"t": 6, "v": [-250, 11, 124]}], 1.1, -0.02, 30, amp=1.6, storm=0.5, dawn=0.35, rain=0.3,
        ship={"pos": [0, 0, 0], "yaw": 0.4, "motion": 0.6}), ("fade", 0.3)),
    sc("yol3_choice", "choice", S("yol3", -0.1), {"focus": [{"at": 0, "i": 2}], "risks": [{"at": 0, "i": 0, "text": "Niyetleri bilinmiyor"}, {"at": 0, "i": 1, "text": "Görmezden gelmek de risk"}]}, ("fade", 0.25)),
    sc("risk3_heart", "deep3d", S("risk3", -0.1), deep(
        [K(0, [120, 205, 140], [0, 200, 0], 38), K(6, [104, 208, 126], [0, 200, 0], 38)], sigma=[0.01, 0.0042, 0.0034], lamps={"mode": "off"}, power=1.3,
        tag="GÜÇ DENGESİ?", tagColor="#FF5A4A"), ("fade", 0.3)),
    sc("devletler_council", "news", S("devletler", -0.1), {"mode": "council", "src": "gizli/heart.jpg", "sub": "ULUSLARARASI ACİL TOPLANTI · GÖRÜŞ AYRILIĞI"}, ("fade", 0.3)),
    sc("zarar_lab", "lab", S("zarar", -0.1), {"title": "“İlk hamle korku olmamalı”", "tag": "KURGUSAL CANLANDIRMA", "panels": [
        {"kind": "check", "x": 6, "y": 22, "w": 56, "h": 64, "title": "YANKI · DURUM RAPORU", "items": [
            {"text": "Gövde hasarı: yok", "at": W("zarar", "Onlar"), "status": "ok"},
            {"text": "Temas: gözlenmedi", "at": W("zarar", "Robota"), "status": "ok"},
            {"text": "Saldırı belirtisi: yok", "at": W("zarar", "İlk"), "status": "ok"}]},
        {"kind": "feed", "x": 65, "y": 22, "w": 30, "h": 64, "src": "gizli/rov.jpg", "label": "YANKI"}]}, ("fade", 0.25)),
    sc("sen_choice", "choice", S("sen", -0.1), {"focus": [{"at": 0, "i": 3}], "prompt": {"at": E("sen", 0.2), "text": "SEN OLSAYDIN?"}}, ("fade", 0.3)),
    sc("haber_decrypt", "lab", S("haber", -0.1), {"title": "Şifre çözme ekibi", "panels": [
        {"kind": "bars", "x": 6, "y": 24, "w": 50, "h": 50, "title": "ÇÖZÜMLEME", "items": [
            {"text": "DESEN EŞLEŞTİRME", "from": 0.2, "dur": 3.0}, {"text": "SÖZDİZİMİ", "from": 0.8, "dur": 3.4, "color": "#FFB347"}]},
        {"kind": "log", "x": 59, "y": 24, "w": 36, "h": 62, "lines": ["> blok 1/48 ✓", "> blok 2/48 ✓", "> blok 7/48 ✓", "> ANLAMLI YAPI BULUNDU", "> harita?"], "rate": 12}]}, ("fade", 0.25)),

    # ===================== BÖLÜM 8 · BÜYÜK FİNAL =====================
    sc("cozum_glyph", "signal", S("cozum", -0.4), {"mode": "glyph", "title": "Sinyalin bir bölümü çözüldü", "at": 0.0, "decode": {"from": 0.3, "dur": 5.0},
                                                  "chapter": ch("BÖLÜM 8", "BÜYÜK FİNAL", at=0.4)}, ("fade", 0.5)),
    sc("harita_earth", "earth", S("harita", -0.1), {
        "clouds": 0.4, "stars": 0.8, "exposure": 1.1, "sat": 1.05, "sunFollow": [-8, 30],
        "keys": [
            {"t": 0, "lat": 10, "lon": -150, "alt": 26000, "heading": 0, "pitch": 90, "fov": 46},
            {"t": W("pasifik", "Pasifik", off=-0.2), "lat": -20, "lon": -172, "alt": 9000, "e": "inOut"},
            {"t": W("atlantik", "Atlantik", off=-0.2), "lat": 18, "lon": -60, "alt": 9500, "e": "inOut"},
            {"t": W("hint", "Hint", off=-0.2), "lat": -12, "lon": 100, "alt": 9500, "e": "inOut"},
            {"t": E("tek", 0.6), "lat": 0, "lon": 30, "alt": 30000, "e": "inOut"}],
        "lights": [
            {"lat": -30.5, "lon": -177.0, "from": W("harita", "noktalar", off=-0.3), "label": "PASİFİK"},
            {"lat": 19.8, "lon": -66.0, "from": W("harita", "beliriyor"), "label": "ATLANTİK"},
            {"lat": -10.3, "lon": 110.0, "from": W("harita", "beliriyor", off=0.4), "label": "HİNT OKYANUSU"},
            {"lat": 11.3, "lon": 142.2, "from": S("tek", 0.2), "size": 0.7}, {"lat": 37.0, "lon": 143.5, "from": S("tek", 0.4), "size": 0.7},
            {"lat": -23.0, "lon": -71.5, "from": S("tek", 0.6), "size": 0.7}, {"lat": 51.0, "lon": -175.0, "from": S("tek", 0.8), "size": 0.7},
            {"lat": -56.0, "lon": -25.0, "from": S("tek", 1.0), "size": 0.7}, {"lat": 10.5, "lon": 127.0, "from": S("tek", 1.2), "size": 0.7}]}, ("zoom", 0.4)),
    sc("kayit_archive", "lab", S("kayit", -0.1), {"title": "Eski kayıtlar yeniden inceleniyor", "sub": "OKYANUS DİNLEME İSTASYONLARI · ARŞİV", "tag": "KURGUSAL CANLANDIRMA", "panels": [
        {"kind": "spectro", "x": 4, "y": 22, "w": 30, "h": 66, "title": "ARŞİV · 2019", "beats": [1.0, 3.4, 5.8, 8.2], "window": 9, "hot": 0.55},
        {"kind": "spectro", "x": 35, "y": 22, "w": 30, "h": 66, "title": "ARŞİV · 2022", "beats": [0.6, 3.0, 5.4, 7.8, 10.2], "window": 9, "hot": 0.6, "at": 6},
        {"kind": "spectro", "x": 66, "y": 22, "w": 30, "h": 66, "title": "ARŞİV · 2025", "beats": [1.4, 3.8, 6.2, 8.6, 11.0], "window": 9, "hot": 0.7, "at": 12}]}, ("fade", 0.3)),
    sc("son_glyph", "signal", S("son", -0.1), {"mode": "glyph", "title": "Mesajın son kısmı", "at": 0.0, "decode": {"from": 0.0, "dur": 3.4}, "digits": "ÇEVİRİ: %100"}, ("fade", 0.25)),
    sc("mesaj_text", "signal", S("mesaj", -0.25), {"mode": "message", "text": "BİZ SİZİ UZUN ZAMANDIR İZLİYORUZ.", "at": 0.1}, ("glitch", 0.35)),
    sc("yukari_ascent", "ocean", S("yukari", -0.3), water([{"t": 0, "v": 6000}, {"t": 3.2, "v": 60}], cam={"pitch": 0.55, "fov": 62}, lamp=[{"t": 0, "v": 0.6}, {"t": 2.5, "v": 0}],
        snow=0.6, descent=-9, hud=hud([{"t": 0, "v": 6000}, {"t": 3.2, "v": 60}], minimal=True)), ("fade", 0.4)),
    sc("yukari_surface", "ocean", W("yukari", "gökyüzüne", off=-0.6), storm(
        [{"t": 0, "v": [0, 2.5, 0]}, {"t": 5, "v": [0, 150, 0], "e": "cine"}], 0.86, [{"t": 0, "v": 0.035}, {"t": 5, "v": -0.12}], 52,
        amp=1.0, storm=0.3, dawn=0.85, rain=0, exposure=0.5, ship={"show": False}), ("fade", 0.3)),
    sc("uzay_earth", "earth", S("uzay", -0.4), {
        "clouds": 0.5, "stars": 0.9, "exposure": 1.05, "sat": 1.05, "sunFollow": [-20, 60],
        "keys": [{"t": 0, "lat": 5, "lon": -150, "alt": 8000, "heading": 0, "pitch": 90, "fov": 46}, {"t": 14, "lat": 0, "lon": -100, "alt": 17500, "e": "inOut"}],
        "lights": [{"lat": la, "lon": lo, "from": 0.4 + k * 0.25, "size": 0.85} for k, (la, lo) in enumerate([
            (-30.5, -177.0), (19.8, -66.0), (-10.3, 110.0), (11.3, 142.2), (37.0, 143.5), (-23.0, -71.5), (51.0, -175.0), (-56.0, -25.0), (10.5, 127.0), (-8.0, -152.0), (25.0, -40.0), (-40.0, 60.0)])]}, ("fade", 0.6)),
]

PAUSES = {"hook": 0.7, "rov": 2.2, "carpma": 2.4, "sehir": 3.2, "eskisi": 2.0, "bekliyor": 1.6, "kopus": 2.6, "tur": 1.6, "haber": 1.4,
          "pasifik": 0.7, "atlantik": 0.7, "hint": 0.8, "tek": 1.4, "son": 0.6, "mesaj": 2.4, "uzay": 0.8, "final": 1.2}

DISCLAIMERS = [{"text": "Varsayımsal bilimkurgu senaryosu", "start": "@start", "end": "@gorev.start"}]

SFX = []
MUSIC = None

# ===================== MÜZİK (belgesel düzeni) =====================
MUSIC = {
    "style": "doc", "seed": 11, "bpm": 92,
    "sections": {
        "mystery#1": "@start", "storm#1": S("yil", -0.3), "signal#1": S("fark", -0.2), "storm#2": S("soru", -0.3), "wonder#1": S("rov", -0.2),
        "descent#1": S("yanki", -0.6), "deep#1": S("m1000", -0.2), "contact#1": S("parazit", -0.2), "deep#2": S("m6000", -0.2),
        "suspense#1": S("carpma", -0.3), "lost#1": E("carpma", 0.05), "mystery#2": S("kaya", -0.5), "build#1": S("geri", -0.1),
        "reveal#1": S("sehir", -0.25), "wonder#2": S("kure", -0.2), "deep#3": S("sessiz", -0.2), "news#1": S("sizinti", -0.4),
        "somber#1": S("hukuk", -0.2), "contact#2": S("ilerle", -0.5), "signal#2": S("gonder", -0.2), "suspense#2": S("hareket", -0.2),
        "lost#2": E("kopus", 0.05), "tech#1": S("nasil", -0.2), "wonder#3": S("tur", -0.3), "decision#1": S("karar", -0.5),
        "signal#3": S("cozum", -0.5), "finale#1": S("harita", -0.2), "lost#3": S("mesaj", -0.4), "finale#2": S("yukari", -0.4),
        "outro#1": S("final", -0.3), "end": "@end",
    },
    "hits": [{"at": E("carpma", 0.02), "kind": "impact"}, {"at": E("kopus", 0.0), "kind": "impact"}, {"at": S("mesaj", -0.05), "kind": "braam"},
             {"at": S("harita", -0.1), "kind": "swell"}],
    "risers": [{"to": S("sehir", -0.25), "dur": 3.5}, {"to": S("mesaj", -0.3), "dur": 3.0}, {"to": S("yukari", -0.4), "dur": 2.0}],
}

# ===================== SES EFEKTLERİ =====================
def _fx(kind, at, gain=0.0, **kw):
    d = {"type": kind, "at": at, "gain": gain}
    d.update(kw)
    return d


SFX = [
    _fx("underwater", "@start", -8, dur=8.5, depth=1.0),
    _fx("pulse", W("hook", "başka", off=-0.1), -6), _fx("pulse", W("hook", "farkında", off=-0.1), -6),
    _fx("rain", S("yil", -0.3), -9, dur=20.0, heavy=1.0),
    _fx("thunder", W("yil", "2027", off=0.2), -6), _fx("thunder", W("yil", "Meridyen", off=0.45), -9, size=0.8),
    _fx("rain", S("sinyal", -0.2), -10, dur=4.5, heavy=1.2), _fx("thunder", W("sinyal", "gece", off=0.15), -7),
    _fx("ping", W("sinyal", "tuhaf", off=0.1), -6),
    *[_fx("pulse", W("sinyal", "tuhaf", off=0.5 + 1.2 * k), -15) for k in range(12)],
    _fx("ping", S("jeoloji", 0.3), -14, pitch=0.8),
    *[_fx("pulse", W("asal", w, nth=n), -9) for w, n in [("İki", 1), ("Üç", 1), ("beş", 1), ("yedi", 1), ("on", 1), ("on", 2)]],
    *[_fx("tick", W("asal", w, nth=n, off=k * 0.1), -12) for w, n, c in [("İki", 1, 2), ("Üç", 1, 3), ("beş", 1, 5), ("yedi", 1, 7), ("on", 1, 11), ("on", 2, 13)] for k in range(c)],
    _fx("ticks", S("asal2", 0.3), -14, dur=2.5), _fx("whoosh", S("tekrar", -0.1), -14),
    _fx("rain", S("soru", -0.3), -9, dur=8.0, heavy=1.1), _fx("thunder", W("soru", "sesleniyor", off=-0.25), -5, size=1.2),
    _fx("splash", S("suya", 3.6), -4),
    _fx("whoosh", S("m100", -0.1), -10, up=False), _fx("underwater", S("m100", -0.2), -9, dur=95.0, depth=0.6),
    _fx("creak", S("m4000", 1.0), -8), _fx("creak", S("m8000", 0.6), -6, pitch=0.85),
    _fx("static", S("parazit", 1.4), -10), _fx("glitch", S("parazit", 4.4), -10), _fx("static", W("kablo", "Ve", off=0.1), -9, dur=0.6),
    _fx("boom", E("carpma", 0.0), -2),
    _fx("underwater", S("kaya", -0.4), -9, dur=80.0, depth=1.0),
    *[_fx("pulse", W("nabiz", w), -8) for w in ("turkuaz", "Yavaşça", "nabız")],
    _fx("blips", S("sessiz", 0.2), -10, dur=6.0),
    *[_fx("pop", S("sizinti", -0.1 + k * 0.23), -11) for k in range(6)],
    _fx("blips", S("sahte", 0.6), -12, dur=4.0), _fx("whoosh", S("ikiye", -0.05), -9), _fx("ticks", S("piyasa", 0.2), -14, dur=3.0),
    _fx("underwater", S("miras", -0.2), -10, dur=8.0), _fx("underwater", S("ilerle", -0.5), -9, dur=72.0, depth=1.0),
    *[_fx("pulse", S("degisim", 0.2 + 0.15 * k), -16) for k in range(30)],
    *[_fx("ping", W("gonder", w, nth=n), -7, pitch=p) for (w, n, p) in [("Bir", 2, 1.0), ("iki", 1, 1.06), ("üç", 1, 1.12), ("beş", 1, 1.19), ("yedi", 1, 1.26)]],
    *[_fx("tick", S("bekle", 0.2 + 0.7 * k), -14) for k in range(4)],
    *[_fx("pulse", W("yanit", "on", nth=n), -6) for n in (1, 2, 3)],
    _fx("glitch", W("yanit", "ardından", off=-0.1), -10),
    _fx("heartbeat", S("siluet", 0.2), -8), _fx("heartbeat", S("siluet", 1.1), -9), _fx("heartbeat", S("belirsiz", 0.4), -9),
    *[_fx("pulse", W("ritim", w), -7) for w in ("ışıklar", "sinyalle", "aynı", "ritimde", "yanıp", "sönüyor")],
    _fx("glitch", S("kopus", 0.9), -6), _fx("static", S("kopus", 1.5), -5, dur=0.3), _fx("tv", E("kopus", 0.1), -12, dur=1.6),
    _fx("static", S("donus", -0.4), -9, dur=0.5), _fx("blips", S("donus", 0.8), -12, dur=2.0),
    _fx("underwater", S("baca", -0.1), -9, dur=17.0, depth=0.8),
    *[_fx("ping", S("fisilti", 0.6 + k), -12, pitch=0.6) for k in range(2)],
    _fx("ticks", S("ekonomi", 0.4), -13, dur=3.5),
    *[_fx("whoosh", S(l, -0.1), -12) for l in ("yol1", "yol2", "yol3")],
    _fx("rain", S("risk2", -0.1), -14, dur=6.0, heavy=0.4), _fx("thunder", S("risk2", 1.5), -15, size=0.7),
    _fx("heartbeat", S("sen", 0.2), -9), _fx("heartbeat", S("sen", 1.0), -10),
    _fx("blips", S("haber", 0.3), -11, dur=3.0), _fx("glitch", S("cozum", 0.2), -11),
    *[_fx("ping", t, -8, pitch=p) for t, p in [(W("harita", "noktalar", off=-0.3), 0.9), (W("harita", "beliriyor"), 1.0), (W("harita", "beliriyor", off=0.4), 1.1)]],
    *[_fx("pulse", W(l, w), -7) for l, w in [("pasifik", "Pasifik"), ("atlantik", "Atlantik"), ("hint", "Hint")]],
    _fx("blips", S("kayit", 0.4), -12, dur=4.0), _fx("glitch", S("mesaj", -0.2), -6), _fx("boom", S("mesaj", 0.2), -5),
    _fx("whoosh", S("yukari", -0.2), -9), _fx("splash", W("yukari", "gökyüzüne", off=-0.5), -6),
]
