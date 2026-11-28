#!/usr/bin/env bash
# Run on the GitHub-hosted Linux x86_64 runner; no workstation installation required.
set -euo pipefail
dir="${RUNNER_TEMP:?}"
archive=blender-4.2.5-linux-x64.tar.xz
curl --fail --location --retry 2 --silent --show-error "https://mirrors.ocf.berkeley.edu/blender/release/Blender4.2/$archive" -o "$dir/$archive"
(cd "$dir" && echo "cd28ab8164d88237c0c45a188ef7e4974bcb8c651de15fcbc3635166e584e4b3  $archive" | sha256sum --check && tar -xf "$archive")
echo "$dir/blender-4.2.5-linux-x64" >> "${GITHUB_PATH:?}"
