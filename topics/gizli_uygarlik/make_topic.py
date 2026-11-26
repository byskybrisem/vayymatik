"""topic.json üretici: anlatım (script.py) + sahne planı (scenes.py). Kullanım: python3 make_topic.py"""
import json, sys
from pathlib import Path
HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from script import CHAPTERS, SHORTS_NEW

def lines():
    out = []
    for cid, _, ls in CHAPTERS:
        for lid, text in ls:
            out.append({"id": lid, "text": text, "chapter": cid})
    return out

def build():
    try:
        from scenes import SCENES, SFX, MUSIC, PAUSES, DISCLAIMERS
    except ImportError:
        SCENES, SFX, MUSIC, PAUSES, DISCLAIMERS = [], [], None, {}, []
    L = lines()
    for l in L:
        if l["id"] in PAUSES:
            l["pause_after"] = PAUSES[l["id"]]
    topic = {
        "id": "gizli_uygarlik",
        "output_name": "VAYYMATIK0_Gizli_Uygarlik",
        "language": "tr",
        "render": {"width": 1920, "height": 1080, "crf": 19},
        "brand": {
            "safe": {"top": 60, "bottom": 70, "left": 80, "right": 80},
            "captions": {"style": "doc", "centerY": 968, "maxWidth": 1480, "fontSize": 42, "uppercase": False},
            "colors": {"accentDoc": "#6FF2E6"},
        },
        "caption_pages": {"max_words": 10, "max_chars": 60},
        "voice": {"provider": "external", "name": "ElevenLabs · Furkan - Bilingual Turkish Narrator (Dzgub2SzfGvifooR4JMV) · eleven_v4",
                  "lead_in": 0.9, "tail": 4.0, "gap_chunk": 0.5},
        "extra_lines": SHORTS_NEW,
        "lines": L,
        "scenes": SCENES or [{"id": "tmp", "type": "ocean", "start": "@start", "props": {"mode": "water", "depth": 1000}}],
        "disclaimers": DISCLAIMERS,
        "music": MUSIC or {"style": "rise", "sections": {"dark": "@start", "build": 5, "peak": 10, "end": "@end"}},
        "sfx": SFX,
        "qa": {"max_visual_gap": 14.0},
        "foreign_words": ["SOFAR"],
        "metadata": {
            "title": "Okyanusun Altında Gizli Bir Uygarlık Bulunsaydı? | Bilimkurgu Senaryo",
            "description": [],
            "hashtags": [],
        },
    }
    (HERE / "topic.json").write_text(json.dumps(topic, ensure_ascii=False, indent=1), encoding="utf-8")
    print("topic.json:", len(L), "satır,", len(topic["scenes"]), "sahne")

if __name__ == "__main__":
    build()
