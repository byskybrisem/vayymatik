#!/usr/bin/env bash
# VAYYMATİK üretim merkezi — kurulum (Ubuntu/Debian/macOS). Tekrar çalıştırmak güvenlidir.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v ffmpeg >/dev/null || { echo "ffmpeg gerekli (apt install ffmpeg / brew install ffmpeg)"; exit 1; }
command -v node >/dev/null || { echo "Node.js 20+ gerekli"; exit 1; }
command -v python3 >/dev/null || { echo "Python 3.11+ gerekli"; exit 1; }

python3 -m pip install -r requirements.txt
(cd engine && npm ci --no-audit --no-fund)
# Ses modelini indir ve SHA-256 ile doğrula
python3 -c "from vayy.assets import ensure_voice, ensure_public; ensure_voice('tr_TR-fahrettin-medium'); ensure_public(); print('ses modeli ve dokular hazır')"
echo "Kurulum tamam. Video üretmek için: python3 -m vayy build redbull"
