"""Teslim dosyaları: Script.txt, Title.txt, Description.txt, Hashtags.txt, Sources.md, Thumbnail.png."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from .paths import ENGINE, build_dir, deliver_dir


def _ts(t: float) -> str:
    m, s = divmod(max(0.0, t), 60)
    return f"{int(m):02d}:{s:05.2f}"


def deliver(topic_id: str, thumbnail: bool = True) -> None:
    from .build import load_topic

    topic, brand = load_topic(topic_id)
    bdir, ddir = build_dir(topic_id), deliver_dir(topic_id)
    meta = json.loads((bdir / "build_meta.json").read_text(encoding="utf-8"))
    tl = json.loads((bdir / "timeline.json").read_text(encoding="utf-8"))
    md = topic["metadata"]
    fps = tl["fps"]

    # Script.txt
    scenes = tl["scenes"]
    notes = {s["id"]: s.get("note", "") for s in topic["scenes"]}
    out = [
        f"{md['title']}",
        f"VAYYMATİK · Türkçe · {tl['width']}×{tl['height']} · {fps} fps · {meta['total']:.1f} sn",
        "",
        "SENARYO (zaman kodlu, seslendirme ile birebir)",
        "=" * 60,
    ]
    for ln in meta["lines"]:
        sc = [s for s in scenes if s["from"] / fps <= ln["start"] + 0.05 < (s["from"] + s["dur"]) / fps]
        sid = sc[-1]["id"] if sc else "-"
        out.append(f"[{_ts(ln['start'])} – {_ts(ln['end'])}]  {ln['text']}")
        out.append(f"      sahne: {sid}" + (f" — {notes.get(sid)}" if notes.get(sid) else ""))
        if ln["tts"].lower() != ln["text"].lower():
            out.append(f"      okunuş (TTS): {ln['tts']}")
    out += ["", "SAHNE LİSTESİ", "=" * 60]
    for s in scenes:
        out.append(f"{_ts(s['from'] / fps)} – {_ts((s['from'] + s['dur']) / fps)}  {s['id']:<15} [{s['type']}]  geçiş: {s['transitionIn'].get('type')}  {notes.get(s['id'], '')}")
    v = topic["voice"]
    narrator = (v.get("name", "external") if v.get("provider") == "external" else
                f"Piper TTS · {v['model']} · length {v['length_scale']} · noise {v['noise_scale']} · noise_w {v['noise_w']}")
    out += ["", "SES", "=" * 60,
            f"Anlatıcı: {narrator}",
            f"Müzik: özgün prosedürel kompozisyon · {topic['music'].get('bpm', 120)} BPM · Re minör",
            f"Miks: {json.dumps(meta['audio'], ensure_ascii=False)}"]
    (ddir / "Script.txt").write_text("\n".join(out) + "\n", encoding="utf-8")

    (ddir / "Title.txt").write_text(md["title"] + "\n\nAlternatifler:\n" + "\n".join("- " + t for t in md.get("title_alternatives", [])) + "\n", encoding="utf-8")
    desc = "\n".join(md["description"]) + "\n\n" + " ".join(md["hashtags"]) + "\n"
    (ddir / "Description.txt").write_text(desc, encoding="utf-8")
    (ddir / "Hashtags.txt").write_text(" ".join(md["hashtags"]) + "\n", encoding="utf-8")

    src = ["# Kaynaklar ve doğrulama — " + md["title"], "",
           "Tüm sayısal ve tarihsel iddialar aşağıdaki kaynaklardan doğrulanmıştır (erişim tarihleri belirtilmiştir).", "",
           "| # | Videodaki bilgi | Kaynak | Erişim |", "|---|---|---|---|"]
    for i, s in enumerate(topic.get("sources", []), 1):
        src.append(f"| {i} | {s['claim']} | [{s['title']}]({s['url']}) | {s['accessed']} |")
    if topic["id"] == "redbull":
        src += ["", "## Notlar", "",
                "- **Ciro ≠ kâr:** 12,196 milyar € Red Bull'un 2025 *grup cirosudur (gelir)*; net kâr olarak sunulmamıştır. Videoda bu açıkça yazılıdır.",
                "- **\"8 milyondan fazla\":** YouTube resmî blogu zirvede *\"more than 8 million concurrent livestreams\"* ifadesini kullanır; videoda \"eş zamanlı canlı yayın akışı\" olarak aktarılmıştır.",
                "- **\"Yaklaşık 14 milyar kutu\":** seslendirmede 13,969 milyar yuvarlanmıştır; ekranda kesin değer (13,969 milyar) gösterilir.",
                "- **\"≈ saniyede 443 kutu\":** 13,969 milyar ÷ (365 × 86.400 sn) ile hesaplanmış türetilmiş ortalamadır.",
                "- **\"Uzayın sınırı\":** Stratos atlayışı ~39 km (stratosfer) yüksekliktedir; ifade YouTube blogundaki \"edge of space\" kullanımına dayanır.",
                "- Futbol kulüplerinin yılları Red Bull'un kulüple ilişkisinin başladığı / kulübün Red Bull kimliğiyle kurulduğu yılları gösterir.",
                ]
    src += ["", "## Görsel, ses ve yazı tipi lisansları", ""]
    src += ["- " + c for c in topic.get("assets_credits", [])]
    if topic["id"] == "redbull":
        src += ["", "Temsili sahneler (stratosfer POV, kapsül, F1 pisti, otoyol, ürün kutusu, spor siluetleri, izleyici noktaları) videoda **\"TEMSİLİ\"** etiketiyle işaretlenmiştir; gerçek arşiv görüntüsü olarak sunulmamıştır. Red Bull logosu veya ticari görselleri kullanılmamıştır.", ""]
    (ddir / "Sources.md").write_text("\n".join(src), encoding="utf-8")

    import shutil
    manifest_file = bdir / "scene-manifest.json"
    if manifest_file.exists():
        shutil.copyfile(manifest_file, ddir / "Scene-manifest.json")

    if meta.get("event_sync"):
        from .captions import event_vtt
        (ddir / "Event-captions.vtt").write_text(
            event_vtt(meta["event_sync"], fps, meta["total"]), encoding="utf-8")

    if thumbnail:
        props = {"topic": "current", "thumb": md.get("thumbnail")}
        pf = bdir / "thumb_props.json"
        pf.write_text(json.dumps(props, ensure_ascii=False), encoding="utf-8")
        subprocess.run(["node", "still.mjs", "--comp", "Thumbnail", "--frames", "0", "--out", str(ddir / "Thumbnail.png"), "--props", str(pf)], cwd=ENGINE, check=True)
    print(f"[teslim] {ddir}")
