#!/usr/bin/env bash
# Yeni bulut oturumu için geliştirme araçları (idempotent): RTK (sürüm sabit), Graphify (yerel, AST-only), grafik.
# Kullanım: ./scripts/setup-tools.sh   — Caveman skill ve Context7 depoda/hesapta hazır; burada kurulum gerekmez.
set -uo pipefail
cd "$(dirname "$0")/.."
RTK_BIN="$(command -v rtk || echo "$HOME/.local/bin/rtk")"
if [ "$("$RTK_BIN" --version 2>/dev/null | awk '{print $2}')" != "1.2.1" ]; then ./scripts/setup-rtk.sh || echo "RTK kurulamadı: RTK'siz devam"; else echo "rtk 1.2.1 hazır"; fi
command -v graphify >/dev/null 2>&1 || pip install -q graphifyy || echo "graphifyy kurulamadı: grep ile devam"
command -v graphify >/dev/null 2>&1 && { [ -f graphify-out/graph.json ] || graphify update . >/dev/null 2>&1; echo "graphify $(graphify --version 2>/dev/null | head -1) hazır"; }
[ -f .claude/skills/caveman/SKILL.md ] && echo "caveman skill hazır" || echo "UYARI: .claude/skills/caveman eksik"
