"""ElevenLabs üretim parçaları: satırları ~420 karakterlik gruplara böl (bölüm sınırını aşmadan)."""
import json, sys
from pathlib import Path
HERE = Path(__file__).parent
sys.path.insert(0, str(HERE)); sys.path.insert(0, str(HERE.parents[1]))
from script import CHAPTERS, SHORTS_NEW
from vayy.markup import parse_line

def chunks(limit=420):
    out = []
    for cid, _, lines in CHAPTERS:
        cur = []
        for lid, t in lines:
            tts = parse_line(t).tts_text
            if cur and sum(len(x[1]) + 1 for x in cur) + len(tts) > limit:
                out.append(cur); cur = []
            cur.append((lid, tts))
        if cur: out.append(cur)
    return out

if __name__ == "__main__":
    cs = chunks()
    for i, c in enumerate(cs):
        txt = " ".join(t for _, t in c)
        print(f"k{i:02d} {len(txt):4d} {[l for l,_ in c]}")
    json.dump([{"id": f"k{i:02d}", "lines": [l for l, _ in c], "text": " ".join(t for _, t in c)} for i, c in enumerate(cs)],
              open(HERE / "chunks.json", "w"), ensure_ascii=False, indent=1)
