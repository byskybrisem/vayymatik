# VAYYMATİK — Shorts Üretim Merkezi

VAYYMATİK YouTube kanalı için **tek komutla**, yüklemeye hazır dikey video (YouTube Shorts / TikTok / Instagram Reels) üreten modüler sistem.
Konu bir JSON dosyasıdır. Sistem seslendirmeyi, kelime düzeyinde senkron altyazıyı, özgün müziği ve efektleri, sinematik WebGL sahnelerini, render'ı ve kalite kontrolünü otomatik yapar.

```bash
./scripts/setup.sh                 # bir kez kurulum
python3 -m vayy build redbull      # ses → müzik → render → QA → teslim dosyaları
```

Çıktılar `deliverables/<konu>/` klasörüne yazılır:

| Dosya | İçerik |
|---|---|
| `RedBull_VAYYMATIK_Shorts.mp4` | 1080×1920, 30 fps, H.264 + AAC 320k, −14 LUFS (git'e girmez; Actions artifact) |
| `Thumbnail.png` | 9:16 kapak görseli |
| `Script.txt` | Zaman kodlu senaryo, sahne listesi ve ses ayarları |
| `Subtitles.srt` | Platformlara yüklenecek altyazı (kelime zamanlarından) |
| `Title.txt` · `Description.txt` · `Hashtags.txt` | Yayın metinleri |
| `Sources.md` | İddia–kaynak tablosu, lisanslar, doğrulama notları |
| `Video-QA.json` | Otomatik kalite kontrol raporu |

---

## Mimari

```
topics/<konu>/topic.json ─┐                         brand/brand.json (marka kimliği)
                          ▼
  vayy (Python)  ── 1 Seslendirme ── Piper TTS (tr_TR-fahrettin-medium, CC0, çevrimdışı)
                 │                   ONNX grafiğinden fonem süreleri → örnek doğruluğunda kelime zamanları
                 ├─ 2 Zaman çizelgesi ─ "@satır.word:kelime+0.2" referansları → kare numaraları
                 ├─ 3 Müzik ──────────── prosedürel, özgün (anlatı bölümlerine göre: hook→köken→yükseliş→doruk→çözülüş)
                 ├─ 4 Efektler ───────── rüzgâr, motor geçişi (Doppler), whoosh, darbe, sayaç, tabela, kalabalık…
                 ├─ 5 Miks ───────────── ses zinciri (EQ/kompresör), müziği sese göre kısma, −14 LUFS / ≤ −1,5 dBTP
                 ├─ 6 Motor girdileri ── engine/public/current/{timeline.json, mix.wav, geo_mask.png}
                 ├─ 7 Render ─────────── engine/ (Remotion + WebGL2 shader'lar, SwiftShader ile GPU'suz)
                 ├─ 8 Mux ────────────── FFmpeg (görüntü kopyalanır, AAC 320k, faststart)
                 └─ QA + teslim ──────── vayy/qa.py · vayy/deliver.py
```

### Klasörler

| Yol | Açıklama |
|---|---|
| `vayy/` | Python hattı: `tts.py` (Piper + süre çıkışı), `markup.py`, `textnorm.py` (Türkçe sayı okuma), `voice.py`, `timeline.py`, `captions.py` (sayfa + SRT), `audio/` (dsp, music, sfx, mix), `geo.py`, `build.py`, `qa.py`, `deliver.py`, `cli.py` |
| `engine/` | Remotion render motoru: `src/scenes` (sahne türleri), `src/components` (altyazı, başlıklar, efektler, geçişler), `src/gl` (Dünya ve pist shader'ları) |
| `topics/` | Konu bazlı JSON yapılandırmaları |
| `brand/brand.json` | VAYYMATİK renkleri, güvenli alanlar, altyazı stili, ses ve miks hedefleri |
| `assets/` | NASA Blue Marble dokuları (kamu malı), Natural Earth sınırları (kamu malı) |
| `deliverables/` | Teslim dosyaları (MP4 hariç git'te) |
| `.github/workflows/render.yml` | Bulutta render + indirilebilir artifact |

## Kurulum

Gereksinimler: Python 3.11+, Node.js 20+, FFmpeg. GPU gerekmez.

```bash
./scripts/setup.sh
```

Betik; Python paketlerini (`requirements.txt`), Remotion bağımlılıklarını (`engine/package-lock.json`) kurar, ses modelini Hugging Face'ten indirip **SHA-256** ile doğrular.
Chrome headless shell: Playwright'ın `/opt/pw-browsers` kurulumu varsa kullanılır; yoksa `cd engine && npx remotion browser ensure`.

## Komutlar

```bash
python3 -m vayy build <konu>              # tam üretim + QA + teslim
python3 -m vayy audio <konu>              # yalnızca ses/zaman çizelgesi (hızlı deneme)
python3 -m vayy stills <konu> 0,150,900   # seçili kareleri PNG olarak üret (build/<konu>/stills)
python3 -m vayy qa <konu>                 # mevcut MP4 için kalite kontrol
python3 -m vayy deliver <konu>            # metin teslimleri + kapak
cd engine && npm run studio               # Remotion Studio'da canlı önizleme (public/current)
```

## Yeni konu eklemek

`topics/<yeni>/topic.json` oluşturun (örnek: `topics/redbull/topic.json`). Temel alanlar:

```jsonc
{
  "id": "yeni", "output_name": "Konu_VAYYMATIK_Shorts",
  "lines":  [ {"id": "hook", "text": "…{vurgu} {g:1987'de} {Dietrich|Ditrih}…", "pause_after": 0.4} ],
  "scenes": [ {"id": "s1", "type": "earth", "start": "@start", "end": "@origin.start", "props": {…}} ],
  "disclaimers": [ {"text": "Temsili canlandırma", "start": "@start", "end": "@origin.start"} ],
  "music": {"bpm": 120, "sections": {"hook": "@start", "origin": "…", …, "end": "@end"}, "hits": [], "risers": []},
  "sfx": [ {"type": "whoosh", "at": "@origin.start-0.1", "gain": -4} ],
  "metadata": {"title": "…", "description": ["…"], "hashtags": ["…"], "thumbnail": {…}},
  "sources": [ {"claim": "…", "title": "…", "url": "…", "accessed": "YYYY-MM-DD"} ]
}
```

**Senaryo işaretleme:** `{metin}` kırmızı vurgu · `{g:metin}` altın (sayılar) · `{w:metin}` beyaz vurgu · `{metin|okunuş}` özel telaffuz.
Sayılar otomatik okunur (`1987'de` → "bin dokuz yüz seksen yedide", `12,2` → "on iki virgül iki").

**Zaman referansları:** `@satır.start`, `@satır.end`, `@satır.word:önek`, `@satır.word:önek>end`, `@satır.w3`, `@end`, `@start` (+/− saniye eklenebilir).
Sahne `props` içindeki `t/from/to/dur/at/start/end` sayıları sahne başına göre **saniyedir**; motor bunları kareye çevirir. Böylece tüm kurgu seslendirmeye kilitlenir: metin değişince sahneler kendiliğinden yeniden hizalanır.

### 3D motor — `world3d` (Remotion + Three.js)

`engine/src/three/`: JSON'dan sinematik low-poly 3D sahneler — eklemli karakter (poz, yürüyüş, el jestleri, yüz ifadeleri,
dudak senkronu), oda/ofis ve prosedürel şehir, para/altın/otomobil/bina nesneleri, anahtar kareli sinematik kamera,
dinamik ışık ve gölgeler, 3D finans grafiği, parçacıklar. Ayrıntı ve şema: [`engine/src/three/README.md`](engine/src/three/README.md).
Örnek: `topics/zirve/topic.json` → `python3 -m vayy build zirve` (8 sn, 1080×1920, 30 fps).

### Sahne türleri (`engine/src/scenes`)

| Tür | Kullanım |
|---|---|
| `earth` | NASA dokulu 3B Dünya: stratosfer POV (balıkgözü), küre uçuşları, ülke vurgusu, büyük çember rotası, etiketler, canlı izleyici noktaları, kapsül kapısı, kamera sarsıntısı |
| `road` | Gece F1 pisti / otoyol shader'ı, start ışıkları, hız çizgileri, trafik ışıkları |
| `title` | Stüdyo fonu + kinetik tipografi, metalik kutu, kırılan tüplü TV |
| `cards` | Hızlı etkinlik kartları (özgün vektör siluetler) |
| `flap` | Bölmeli (split-flap) tabela |
| `media` | Ekran duvarı (perspektifli geri çekilme) |
| `kpi` | Finans sayaçları, büyüme rozetleri, yıllık çubuk grafikler |
| `world3d` | Three.js 3D sahne (karakter, şehir, oda, nesneler, kamera, ışık) — JSON ile |

Başlık türleri: `slam`, `rise`, `type`, `stamp`, `count` (sayı animasyonu), `words` (seslendirmeye kelime kelime senkron).
Geçişler: `cut`, `fade`, `blur`, `zoom`, `whip`, `flash`, `glitch`.

## Marka kimliği (`brand/brand.json`)

Kırmızı `#E8112D` · lacivert `#0A1A3A` · metalik gümüş `#C9D2DC` · altın `#FFC83D`. Başlıklar Anton, altyazılar Montserrat 900 (Türkçe glifler `latin-ext`).
Güvenli alan: üst 250 px, alt 520 px, sol 80 px, sağ 150 px (TikTok/Shorts/Reels arayüzleri). Altyazı merkezi y=1235.
Türkçe büyük harf kuralı (`i→İ`) uygulanır; yabancı özel adlar (Dietrich, Leipzig, YouTube…) için standart büyütme kullanılır (`foreign_words`).

## Seslendirme

Kanal sabit anlatıcısı **Piper `tr_TR-fahrettin-medium`** (CC0 veri seti, ticari kullanıma uygun, çevrimdışı, ücretsiz). Ayarlar `brand.json → voice` (length 1.0, noise 0.667, noise_w 0.8, cümle arası 0,25 sn).
Model grafiğine fonem süresi çıkışı eklenir ve gürültü düğümleri tohumlanır: aynı metin her makinede aynı sesi ve aynı kelime zamanlarını üretir.

## Kalite kontrol (`Video-QA.json`)

Tam çözme, çözünürlük/süre/fps/codec, siyah kare, donma, hareket profili (statik slayt tespiti), görsel değişim aralığı (≤ 4 sn),
EBU R128 loudness ve gerçek tepe, müzik/ses farkı, **ASR (faster-whisper) ile altyazı–ses senkronu ve anlaşılırlık**, her karede güvenli alan/taşma denetimi,
ilk–son kare döngü benzerliği, kaynaklı bilgi listesi. Kare örnekleri: `build/<konu>/qa_frames.png`.
Taşma denetimi `engine/audit.mjs` ile WebGL çizilmeden her 3. kare taranarak yapılır (≈5 dk); metin düğümlerinin gerçek kutuları güvenli alanla karşılaştırılır.

## GitHub Actions

`.github/workflows/render.yml`: konu/motor değiştiğinde (ya da *Run workflow* ile) videoyu bulutta üretir ve `deliverables/<konu>/` klasörünü
**indirilebilir artifact** olarak yükler (Actions → çalıştırma → *Artifacts*). Büyük video dosyaları git geçmişine eklenmez.

## Lisanslar ve haklar

- Remotion: bireyler ve 3 kişiye kadar şirketler için ücretsiz lisans (`licenseKey: 'free-license'`); daha büyük ekipler için remotion.pro lisansı gerekir.
- Görseller: NASA Blue Marble (kamu malı), Natural Earth (kamu malı), diğer tüm görseller koddan üretilen özgün canlandırmalardır. Marka logoları kullanılmaz; temsili sahneler videoda etiketlenir.
- Müzik ve efektler prosedürel olarak üretilen özgün içeriktir (telif talebi riski yoktur).
- Yazı tipleri SIL Open Font License.

## Sorun giderme

- **WebGL2 yok / siyah sahne:** `chromiumOptions.gl` `swangle` olmalı (varsayılan). GPU'lu makinede `--gl angle` daha hızlıdır: `node engine/render.mjs --gl angle …`
- **Render yavaş:** `--concurrency` çekirdek sayısı kadar; Dünya sahneleri en pahalı kısımdır (`GLCanvas scale` 0.75).
- **Telaffuz hatası:** satırda `{kelime|okunuş}` kullanın; değişiklik yalnızca o satırın sesini yeniden üretir (önbellek).
