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

### Hibrit doğrulama
- PR #8 üzerindeki ilk Shorts render CI çalışması başarılı (46085533360).
- Codex ortamında Blender 4.3.2, FFmpeg 7.1.5, Chromium 156, Python 3.12.14,
  Node 24.22.3, cgroup 2 CPU / 8 GiB. Cycles yalnız CPU aygıtı bildirdi.
- Rotor animasyonu 384×216, 15 FPS, 30 kare. Üç kare görsel olarak incelendi.
  Önbellek isabeti sonrası kopya MP4 bayt düzeyinde eşleşti.
- Rotor klibi Remotion üzerinden 30 kare işlendi ve mevcut Piper miksinin ilk
  iki saniyesi AAC olarak birleştirildi. FFmpeg baştan sona çözdü. Bu smoke testi
  sahneyle ilgili yeni anlatım/Foley veya semantik A/V senkronu doğrulamaz.
- `python -m vayy.studio.doctor` ortam envanteri verir. Claude çalışma ortamında
  yeniden çalıştırılmalı. GitHub release ek dosyası yüklemesi HTTP 401 verdi.
- Sonraki aşama: sürümlü parametrik asset kütüphanesi ve tekrar üretilebilir
  benchmark konusu. Referans kanalları ve diğer kabul sahneleri henüz incelenmedi.

### Parametrik mekanik varlık
- `vayy/studio/mechanical.py` kapalı halka/dişli mesh ve PBR malzeme üretimini sahneden ayırır.
- `assets.json` sürümü, boyutları, malzemeleri ve diş sayısı sınırlarını saklar.
  Sahne, model kaynakları ve katalog değişiklikleri klip önbelleğini geçersiz kılar.
- `python -m vayy.studio rotor-section rotor.mp4 --teeth 32 --frames 6 --fps 6` ile
  Blender 4.3.2 CPU üzerinde gerçek 384×216 kesit üretildi. Baş ve son kare
  görsel olarak incelendi. FFmpeg çözme testi ve önbellek bayt karşılaştırması
  başarılı. Aralık dışı 7 diş reddedildi.
- Önceki PR commit'inin Shorts render CI koşusu başarılı (46110377280).
- Sonraki aşama: tekrar üretilebilir sesli benchmark konusu ve ek varlık aileleri.

### Sesli rotor benchmark'ı
- `python -m vayy build rotor-benchmark --concurrency 2` standart giriş noktasından
  150 kare Blender Cycles, Remotion altyazı, Piper miks ve FFmpeg MP4 üretir.
- Düşük maliyetli teknik test 270×480 kaynak, 1080×1920 teslim ve 30 FPS kullanır.
  Yerel örnek karede model ve altyazı okunaklı. Gren görünür.
- GitHub Actions 46119209382: QA 22/22, ASR 9/9 eşleşme, medyan ofset 18 ms.
  Çıktı: https://github.com/byskybrisem/vayymatik/actions/runs/46119209382/artifacts/15253245662
- Sonraki aşama: rotor dışında parametrik çevre varlığı ve rig/IK.

### Atölye kabul videosu (çalışma sürüyor)
Önceki rotor artifact'i ve CI başarısı doğrulandı. Yeni konu: atolye, 23 saniye,
30 FPS, ThreeCanvas ölçeği 1. Yürüyüşte ayak hedefleri ve iki kemikli IK,
topu tutma, kaldırma, bırakma ve masaya dönme aynı rig'i kullanır. Dikey serbest
düşme + esnek olmayan sekme metre/saniye birimleriyle bake edilir. İzole Foley
başlangıç kayması QA'ya kaydedilir. Bu kayıt final miks üzerinden ölçüm değildir.
Kabul için ayrı workflow_dispatch sonucu ve gerçek kare incelemesi gerekir.

### Atölye, doğrulanmış ilk dikey teslim
- CI 46121917786, commit 857aabf. İndirilen MP4 23,00 saniye, 1080×1920, 30 FPS, H.264 + AAC. Gerçek render ölçeği 1. QA 23/23. ASR 32/34 kelime, medyan mutlak fark 22 ms, p90 73,4 ms. Aynı commit'in mevcut konu regresyonu da geçti. [MP4 ve QA paketi](https://github.com/byskybrisem/vayymatik/actions/runs/46121917786/artifacts/15254119854)
- Yerelde özgün çözünürlükte 90, 268, 377. kareler incelendi. Karakter stilize ve köşeli. Düşüş yakın planında tezgâh ve bacak topu kısmen örtüyor. Fotogerçekçilik doğrulanmadı.
- Sonraki sürüm, 120 karelik doğrulanmış parçaları içerik özetiyle korur. Gerçek FFmpeg regresyonunda soğuk/ılık/bozuk parça için çağrı sırası 0,3,6,3. Yeni QA, ayak/top temas dalga biçimini teslim AAC’sinde arar. 'python -m vayy build atolye@wide' aynı planla yatay paket oluşturur.
- Yer altı şablonu için 1080×1920 üç kare, kırılma ve su engeli için 288×384 36 kare, 30 FPS Cycles CPU testleri üretildi. Blender 4.3.2 Debian Mantaflow ile çöktü; su bake'i resmi Blender 4.2.5 LTS ile çalıştı. Ateş/duman henüz doğrulanmadı.

### Referans görüntü incelemesi
Zack D. Films kanalının üç erişilebilir arşiv kopyasında iki saniye aralıklı kareler incelendi. Saniyeler yaklaşık; kamera gözlemleri örneklenen karelere dayanır.

| Video | Hareket ve kamera | Atölye ile kurgu farkı |
|---|---|---|
| [Da Vinci köprüsü, 37 sn](https://www.youtube.com/watch?v=0Mg4fjj5nrQ) | İlk 8 sn çubuklar üst üste binerken kamera masanın etrafında açı değiştiriyor. Sonra yükü geniş planda görüyoruz. | Masa modeli, halka ve dış mekân arasında ölçek değişiyor. Atölye tek mekânda kalıyor. |
| [Kalemtıraş, 35 sn](https://www.youtube.com/watch?v=RQ6-QBj-tYE) | İlk 2 sn içinde el ve kalemden iç dişlilere yaklaşıyor. Hareket eden parça çoğunlukla kadrajı dolduruyor. | İç ve dış planlara dönüşler hızlı. Atölyede kavrama birkaç saniye boyunca aynı planda. |
| [Zincir çarkı, 25 sn](https://www.youtube.com/watch?v=OL9V0tvT9UU) | İlk bölümde halka ve makara, ortada baklaya yakın plan, sonda bütünü gösteren yanal açı var. Yön okları dönüşü görünür kılıyor. | Arka plan sabitken ölçek değişiyor. Atölyede top temasını izlemek için bakışı aşağı kaydırmak gerekiyor. |

### Fizik ve Foley kontrol noktası
- Codex üzerinde resmi Blender 4.2.5 LTS SHA-256 doğrulandı. Akış ve engeli domain kurulumundan önce oluşturarak ateş/duman testi üçüncü çalıştırmada render edildi. 36 gerçek karede hacim büyüyor; alev ile duman arasındaki kontrast düşük. Su klibinde sütun yayılıp baffle'ı aşarak duvara çarpıyor. İki klipte başlangıç, orta ve son kare incelendi.
- Bake sonrası su yüzeyinin engele ulaşması (7. kare), gaz alanında alevin ilk görülmesi (0. kare) ve karonun zemin temasından Foley olayları çıkarılıyor. Manifest kayıtları sıfır tabanlıdır. Kareler ve olay JSON'ları cache'de birlikte doğrulanır. Ham Mantaflow alanları geçicidir; kamera değişimi yeniden bake gerektirir.
- Güncellenmiş 23 sn AAC'yi ilk teslimin H.264 görüntüsüyle yerelde mux ettik. Kodlanmış AAC'de 6 adım ve 5 sekme, 11/11 dalga biçimi eşleşmesi; kareye göre en büyük ölçülen kayma 0 ms. Olayın görüntü zamanı bake/rig karesinden gelir, pikselden otomatik hareket takibi yapılmadı.
- Tam yatay/dikey paket ve Blender test paketi CI sonuçları ayrı kaydedilecek. Claude çalışma ortamında doğrudan koşum yapılmadı.

### Karakter temasının son kadrajı
- İlk kadraj incelemesine göre düşüş tarafına geçildi. 210, 375 ve 540. kareler 1080×1920 yerel PNG olarak tekrar incelendi: top avuç yanında, ilk sekme kadrajda görünür, uzanan parmak uçları tabla hizasında. Kavrama/bırakma için parmak kapanışı ve bilek telafisi JSON'a bağlandı. İlk iki saniye yürüyüş sırasında karaktere ayrılıyor.
- 90 yürüyüş karesinde ileri kinematik testi destek ayağında 0 m kayma ve azami 1,6×10⁻¹⁶ m hedef hatası ölçtü. Bu test zemin düz ve hareket tek eksenli iken geçerli. Rig diz/dirsekte 2,55 radyan bükülme sınırı kullanıyor. Omurga temas sırasında dik tutuluyor; genel amaçlı anatomik çözücü bulunmuyor.
- QA kodlanan kare sayısını doğrular. İsteğe bağlı Event-captions.vtt, bake ve adım olaylarından Türkçe ses açıklaması üretir. doctor RAM ve Cycles aygıt envanterini raporlar.
