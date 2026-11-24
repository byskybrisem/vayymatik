# AGENTS.md — VAYYMATİK video üretim merkezi (AI ajanları için)

Bu depo kalıcı bir video motorudur. **Yeniden yazma; genişlet.** Önce oku: `CLAUDE.md` (token kuralları), `README.md` (mimari),
`engine/src/three/README.md` (3D motor + JSON şeması), `PROGRESS.md` (son durum).

## Tek komut
```bash
./scripts/setup.sh                 # bir kez: pip + npm ci + Piper ses modeli (SHA-256 doğrulamalı)
python3 -m vayy build zirve        # 8 sn 3D demo → deliverables/zirve/Zirve_VAYYMATIK_Demo.mp4 + QA
python3 -m vayy stills zirve 0,120 # yalnızca seçili kareler (hızlı)
python3 -m vayy audio zirve        # yalnızca ses + zaman çizelgesi
python3 -m vayy remux zirve        # sesi yeniden üret, görüntüyü yeniden render etme
python3 -m vayy qa zirve           # QA raporu → deliverables/zirve/Video-QA.json
```

## Yeni video üretme (kod yazmadan)
1. `topics/<yeni>/topic.json` oluştur (şablon: `topics/zirve/topic.json` kısa/3D, `topics/redbull/topic.json` uzun/2D).
2. `lines`: seslendirme satırları (`{vurgu}`, `{g:altın}`, `{kelime|okunuş}`). Sabit süre için `"duration": 8.0`; yoksa süre sese göre hesaplanır (Shorts 30–60 sn, uzun YouTube için aynı yapı).
3. `scenes`: her sahne `type` (`world3d`, `earth`, `road`, `title`, `cards`, `flap`, `media`, `kpi`) + `start` (`@satır.word:kelime`) + `transition` (`cut|fade|blur|zoom|whip|flash|glitch`) + `props`.
4. `music`: `style: "rise"` (kısa: dark/build/peak/end) veya `"story"` (8 bölümlü anlatı). `sfx`: whoosh, impact, riser, wind, cash, ticks, pop, heartbeat… (`vayy/audio/sfx.py → SFX`).
5. `python3 -m vayy stills <yeni> …` ile kontrol → `python3 -m vayy build <yeni>`.

## Genişletme noktaları
| Ne | Nerede |
|---|---|
| 3D nesne/ortam/efekt | `engine/src/three/{objects,env,fx,charts}/` + `engine/src/three/registry.tsx` |
| Karakter pozu / yüz ifadesi | `engine/src/three/character/rig.ts` (`POSES`, `EXPRESSIONS`) |
| 2D sahne türü | `engine/src/scenes/` + `engine/src/scenes/registry.ts` |
| Müzik düzeni | `vayy/audio/music.py` (`arrange`, `arrange_rise`) |
| SFX | `vayy/audio/sfx.py` (`SFX` sözlüğü) |
| Zaman referansları | `vayy/timeline.py` (`TIME_KEYS`) |
| QA kontrolleri | `vayy/qa.py` |
| Marka | `brand/brand.json` (renk, güvenli alan, altyazı, ses, miks, render) |

## Kurallar
- Kare bazlı deterministik animasyon: `useCurrentFrame()`; Three.js'te `useFrame` kullanma; rastgelelik `rng(seed)`.
- GPU yok varsay: `gl: swangle`. Gölgeli ışık ≤ 2, ışık sayısı sabit, geometrileri `useMemo`/modül düzeyinde oluştur.
- Ücretli API yok. Görseller koddan veya kamu malı; müzik/SFX prosedürel. Yeni varlık eklersen `assets/LICENSES.md`'ye yaz.
- MP4/WAV/`build/` commit edilmez. `main`'e doğrudan push/merge yok; branch + PR.
- Değişiklikten sonra: `cd engine && npx tsc --noEmit` ve en az birkaç `stills` karesine bak.
