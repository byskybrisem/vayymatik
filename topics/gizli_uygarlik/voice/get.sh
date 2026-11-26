#!/usr/bin/env bash
# Kullanım: get.sh <parça_id> <kredi> <url>  — ElevenLabs çıktısını indirir, MP3 bütünlüğünü doğrular, deftere yazar.
# Bozuk/süresi dolmuş bağlantıda dosya silinir ve defter DEĞİŞMEZ (çıkış kodu 1).
set -uo pipefail
D="$(dirname "$0")/raw"
curl -sS -o "$D/$1.mp3" "$3"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$D/$1.mp3" 2>/dev/null)
if [ -z "$DUR" ] || ! awk -v d="$DUR" 'BEGIN{exit !(d>1.0)}'; then
  echo "HATA: $1 bozuk veya süresi dolmuş bağlantı; yeni imzalı URL al (creative_get_flow_run_status)." >&2
  rm -f "$D/$1.mp3"; exit 1
fi
python3 - "$D/ledger.json" "$1" "$2" <<'PY'
import json,sys
p,k,c=sys.argv[1:]; d=json.load(open(p)); d["done"][k]=int(c); json.dump(d,open(p,"w"))
print(k, "ok", sum(d["done"].values()), "kredi toplam")
PY
echo "$DUR sn"
