# PROGRESS — VAYYMATİK Shorts üretim merkezi

> Bağlam sıkıştırılırsa buradan devam et. Tamamlananları tekrarlama.

## Görev
Red Bull pazarlama stratejisi Shorts videosu (1080×1920, 30 fps, 45–55 sn, Türkçe) + kalıcı modüler üretim altyapısı.
Branch: `claude/friendly-mayer-5ninr0`. PR açılacak. MP4 git'e girmez (Actions artifact + kullanıcıya dosya).

## Teknoloji kararları
- **Görüntü:** Remotion 4.0.540 (engine/), WebGL2 shader'lar (SwiftShader `gl: swangle`), tarayıcı `/opt/pw-browsers/chromium_headless_shell-1243/...`, `licenseKey: 'free-license'`.
- **Ses:** Piper `tr_TR-fahrettin-medium` (CC0, SHA-256 39081c47…b190, HF `speaches-ai/piper-tr_TR-fahrettin-medium`), skill ayarları: length 1.0, noise 0.667, noise_w 0.8, cümle arası 0.25 sn.
  ONNX grafiğine `/Ceil_output_0` çıkışı eklendi → fonem süreleri → **örnek doğruluğunda kelime zamanları** (vayy/tts.py). Gürültü düğümleri tohumlu → deterministik.
- **Müzik/SFX:** numpy ile özgün prosedürel sentez (lisans sorunu yok).
- **Görseller:** NASA Blue Marble (kamu malı) `assets/textures/` (Temmuz 2004 5400px + New Mexico 240px/° kesit), Natural Earth 50m (kamu malı) → `vayy/geo.py` maske dokusu.

## Doğrulanmış bilgiler (kaynak: research)
- Red Bull resmi sayfa (2026-11-24 erişim): 2025'te 13,969 milyar kutu (+%10,2), grup cirosu 11,227 → 12,196 milyar € (+%8,6); 21.924 çalışan, 178 ülke; lansman 1 Nisan 1987 Avusturya; 1984–1987 formül/marka çalışması.
- YouTube blog (14.10.2012): "At peak… more than 8 million concurrent livestreams".
- Wikipedia: Krating Daeng 1976, Chaleo Yoovidhya, kamyon şoförleri/işçiler; Mateschitz 1982 Tayland (Blendax), 1984 Red Bull GmbH; RBR Jaguar alımı 15.11.2004, 2005'te piste; 6 takımlar (2010-13, 2022-23), 8 pilotlar (2010-13, 2021-24); Salzburg 2005, NY 2006, Leipzig 19.05.2009, Bragantino 2020; Flugtag 1992 Viyana, Air Race 2003, Cliff Diving WS 2009, Rampage 2001; Stratos 14.10.2012, 38.969 m, 1.357,64 km/sa (Mach 1,25), 4 dk 19 sn.

## Durum
- [x] Araştırma
- [x] Piper TTS + süre çıkışı, Türkçe sayı normalizasyonu, işaretleme ayrıştırıcı (vayy/)
- [x] Remotion motoru iskeleti, GLCanvas, Dünya shader'ı (stratosfer POV + küre + vurgu + rota + noktalar), Titles, Captions, Overlays, SceneWrap
- [x] Python: timeline, captions/SRT, müzik, SFX, mix, render, QA (vayy/qa.py), deliverables (vayy/deliver.py), CLI (`python3 -m vayy build redbull`)
- [x] Sahneler: earth, road (F1/otoyol), title (kutu/TV), cards, flap, media, kpi + Thumbnail kompozisyonu + Audit (taşma denetimi)
- [x] topics/redbull/topic.json, brand/brand.json
- [x] README, requirements.txt, scripts/setup.sh, .github/workflows/render.yml, .gitignore
- [ ] Render #2 sürüyor (build/redbull/build_run2.log) → QA → düzeltme → yeniden render
- [ ] commit, push, PR, MP4'ü kullanıcıya gönder

## Performans notu
Dünya sahnesi ~0,9 sn/kare (GLCanvas scale 0.75, cloudOct 6, atmosfer 8 örnek). Tam video ≈ 25–30 dk (4 çekirdek).
## Yapılan görsel düzeltmeler
Yabancı ad büyük harf (lib/tr.ts FOREIGN), altyazı plakası + okunur sözlenmemiş kelime, Media House başlığı üste, canlı rozet nowrap,
sunFollow (küre uçuşlarında aydınlık taraf), hook başlığı "NEDEN?", rota başlığına koyu panel (plate), yeni metalik kutu.

## Senaryo taslağı (≈52 sn)
1 hook: Bir enerji içeceği şirketi, neden bir insanı uzayın sınırından Dünya'ya atlatır?
2 Hikâye Tayland'da başlıyor. 3 Kamyon şoförleri ve işçiler için bir tonik: Krating Daeng.
4 1982'de Dietrich Mateschitz onu keşfetti. 5 Tarifi Batı'ya uyarladı, 1987'de Avusturya'da satışa sundu.
6 Ama klasik reklamın ötesine geçti. 7 Ekstrem sporlar, kendi etkinlikleri, kendi yıldızları.
8 2005'te kendi Formula 1 takımını kurdu, şampiyonluklar kazandı. 9 Futbolda Salzburg'dan Leipzig'e kulüplerin sahibi oldu.
10 Hatta kendi medya şirketini kurdu. 11 Ve 2012'de bir adamı, 39 kilometreden atlattı.
12 Zirvede, YouTube'da 8 milyondan fazla eş zamanlı canlı yayın izlendi.
13 Sonuç? 2025'te yaklaşık 14 milyar kutu, 12,2 milyar avro ciro.
14 Red Bull sadece bir içecek satmadı. 15 İnsanların izlemek istediği bir dünya kurdu.
