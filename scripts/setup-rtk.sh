#!/usr/bin/env bash
# RTK (rtk-ai/rtk) kurulumu — yalnızca bu proje için.
# - Sürüm sabit (RTK_VERSION, varsayılan v1.2.1), kaynak etiketinden --locked derlenir.
# - Apache-2.0 edition (--no-default-features); BUSL-1.1 motoru kurulmaz.
# - Global hook (`rtk init -g`) KURULMAZ; ~/.claude/settings.json'a dokunulmaz.
# - Telemetri kapatılır (varsayılan zaten kapalı).
# Kullanım: ./scripts/setup-rtk.sh            (RTK_INSTALL_ROOT=/tmp/x ile farklı kök)
set -euo pipefail

RTK_VERSION="${RTK_VERSION:-v1.2.1}"
RTK_ROOT="${RTK_INSTALL_ROOT:-$HOME/.local}"
WANT="${RTK_VERSION#v}"
export PATH="$RTK_ROOT/bin:$PATH"

installed_ok() {
  command -v rtk >/dev/null 2>&1 && [ "$(rtk --version 2>/dev/null | awk '{print $2}')" = "$WANT" ]
}

if installed_ok; then
  echo "rtk $WANT zaten kurulu: $(command -v rtk)"
else
  command -v cargo >/dev/null 2>&1 || { echo "HATA: cargo gerekli (rustup ile kurun)." >&2; exit 1; }
  cargo install --git https://github.com/rtk-ai/rtk --tag "$RTK_VERSION" \
    --locked --no-default-features --root "$RTK_ROOT" rtk
fi

installed_ok || { echo "HATA: rtk $WANT doğrulanamadı." >&2; exit 1; }

rtk telemetry disable </dev/null >/dev/null
rtk gain >/dev/null
echo "OK: $(rtk --version) — $(command -v rtk)"
echo "Not: proje bazlı talimatlar CLAUDE.md ve .rtk/filters.toml içinde; global hook kurulmadı."
