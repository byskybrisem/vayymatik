#!/usr/bin/env bash
# Kullanım: get.sh <parça_id> <kredi> <url>  — ElevenLabs çıktısını indirir, deftere yazar
set -euo pipefail
D="$(dirname "$0")/raw"
curl -sS -o "$D/$1.mp3" "$3"
python3 - "$D/ledger.json" "$1" "$2" <<'PY'
import json,sys
p,k,c=sys.argv[1:]; d=json.load(open(p)); d["done"][k]=int(c); json.dump(d,open(p,"w"))
print(k, "ok", sum(d["done"].values()), "kredi toplam")
PY
ffprobe -v error -show_entries format=duration -of csv=p=0 "$D/$1.mp3"
