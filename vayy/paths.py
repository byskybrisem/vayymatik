"""Depo içi standart yollar."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOPICS = ROOT / "topics"
BRAND = ROOT / "brand"
ENGINE = ROOT / "engine"
ENGINE_PUBLIC = ENGINE / "public"
ASSETS = ROOT / "assets"
CACHE = ROOT / ".cache"
VOICES = CACHE / "voices"
BUILD = ROOT / "build"          # ara çıktılar (git'e girmez)
DELIVER = ROOT / "deliverables"  # metin teslimleri (git'e girer, MP4 hariç)


def build_dir(topic_id: str) -> Path:
    d = BUILD / topic_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def deliver_dir(topic_id: str) -> Path:
    d = DELIVER / topic_id
    d.mkdir(parents=True, exist_ok=True)
    return d
