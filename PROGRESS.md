# PROGRESS — VAYYMATİK Shorts üretim merkezi

## [2026-11-24] 3D video motoru (branch `claude/vayymatik-3d-video-engine-4yfwk6`, temel: friendly-mayer)
- [x] `engine/src/three/` (Remotion + Three.js r181, R3F 9.4, @remotion/three 4.0.540): Stage3D, CameraRig, LightRig, Character (+rig),
      props (masa/sandalye/lamba/laptop/banknot/deste/para/altın/otomobil), Room, City (+Tower), Sky, parçacıklar, GrowthChart3D, World3DScene
- [x] Python: `duration` (sabit süre), `talkFromLine` (dudak senkronu), `music.style: "rise"`, QA süre kontrolü konuya göre
- [x] Thumbnail: `metadata.thumbnail.scene/frame` ile herhangi bir sahneden kapak
- [x] `topics/zirve/topic.json` — 8 sn demo "Sıfırdan zirveye"; render ≈ 1,6 sn/kare (4 çekirdek, GPU'suz)
- Sonraki fikirler: fabrika ortamı, yürüme sahnesi, uzun video için sahne şablonları (env/Factory.tsx, POSES'a yeni jestler)


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
- [x] İlk push (4 commit) + yerel commit 3cd26c5 (QA/deliver/thumbnail/müzik dinamiği/CI düzeltme) — push bekliyor
- [x] Render #2 tamam; QA: 21/23 (taşma denetimi yanlış pozitif, ASR p90 eşiği, son kare okuma hatası) → düzeltildi
- [x] Düzeltmeler: küresel flaş katmanı (altyazı plakası lekesi), başlık sığdırma payı, gren 0.055, CRF 18 + 16M tavan, Stratos pozlama/güneş, 'numbers' satırı 'kutu' ile bitiyor (ASR 'ciro'yu zayıf duydu), KPI sırası
- [x] Render #3 tamam: 51,4 sn, 50 MB, QA 22/22 GEÇTİ (deliverables/redbull/Video-QA.json)
- [ ] commit/push → Actions → PR → MP4 SendUserFile
- [ ] push → Actions (run 45444503895 pillow pini yüzünden düştü; düzeltildi) → PR → MP4'ü SendUserFile ile gönder

## Notlar
- CI: requirements pillow==13.0.0 (yerel 13.0.0.post1 PyPI'da yok). Actions checkout@v5, setup-python@v6, setup-node@v5.
- ASR: faster-whisper PyAV sürüm uyumsuzluğu → ses numpy ile 16 kHz yüklenip veriliyor. QA modeli 'medium'.
- Kapak: Thumbnail kompozisyonu (kapsül POV + "NEDEN 39 KM'DEN ATLATTI?" + "12 MİLYAR € CİRO").

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

## V2 geliştirme kontrol noktası • studio/cinematic-v2
Temel sürüm 47bd48b. Mevcut ses sağlayıcısı ve Three/Remotion yolu korunur.
İlk dilim: eski zirve sahnesinin referans kareleri, rotor kesiti, CPU Cycles,
içerik adresli klip önbelleği, Remotion klip bileşeni ve çözülmüş sahne manifestosu.
Saatlik çalışmada önce dal ve açık PR ile devam eden işleri kontrol et. Aşağıdaki
sırayı kullan. Bir aşamayı ancak gerçek çıktı ve test kaydından sonra kapat.

1. Referans videoları örnekle, mimari ve kapasiteleri Claude ortamında da ölç.
2. Hibrit hattın uçtan uca sesli benchmark'ı, sahne yönlendirme ve ortam doktoru.
3. Parametrik asset metadata/kütüphane, ortak çevre, malzemeler ve kamera profilleri.
4. İnsan rig/IK ve nesne etkileşimi; yürüyüş, ayak teması ve anatomik sınırlar.
5. Fizik benchmark'ları: kırılma, engelde su, ateş/duman; bake ve olay zamanları.
6. Yer altı kesiti ve fizik olayına bağlı Foley; mevcut ses profilini koru.
7. Dikey/yatay kurgu ve teslim paketi, referansla karşılaştırmalı görsel/teknik QA.
8. Üç denemeyle sınırlı sahne onarımı, kesinti-resume ve cache regression testi.
9. Claude skill'leri, kısa birleşik demo, erişilebilir çıktılar ve incelenebilir PR.
