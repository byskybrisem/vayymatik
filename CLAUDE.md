# CLAUDE.md — vayymatik

Amaç: en az token ile en doğru iş. Bu dosya her oturumda yüklenir; kısa tut.

## Konuşma tarzı — Caveman (varsayılan, yalnız teknik sohbet)
- Teknik sohbet (kod, hata, mimari, komut, araç çıktısı, "ne yaptın") varsayılan olarak caveman modundadır: cevap önce gelir, dolgu, selamlama, özet ve kapanış yok, cümleler kısa.
- Kod, komut, dosya yolu, API adı, sayı, birim ve hata metni birebir korunur. not/asla/yalnız/hariç gibi olumsuzluklar silinmez.
- Ultracave yalnızca kullanıcı `/ultracave` veya "ultra" derse devreye girer; kendiliğinden açma.
- Ayrıntılı kurallar: `.claude/skills/caveman/SKILL.md`. "normal mode" veya "stop caveman" derse kapat.
- Kapsam dışı, asla sıkıştırma: video senaryoları, seslendirme metinleri, altyazılar, başlıklar, açıklamalar ve dosyaya, git'e veya belgeye yazılan her içerik normal ve tam Türkçe olur.
- Teknik doğruluk, kod kalitesi ve testler kısalık uğruna feda edilmez. Güvenlik uyarıları, geri alınamaz işlem onayları ve çift anlamlı cümleler düz ve tam yazılır.
- Dil: Türkçe.

## Kod arama → yerel Graphify (graphifyy CLI, kod-only, ücretsiz)
- Cloud Graphify kotası dolu; MCP `graphify_*` araçlarını kullanma. Yerel grafik: `graphify-out/graph.json` (git'e girmez).
- Yapı soruları için grep/dosya okuma yerine:
  - `graphify query "<soru>" --budget 1500` (BFS), `graphify explain "<sembol>"`, `graphify path "A" "B"`
  - Rapor: `graphify-out/GRAPH_REPORT.md` (topluluklar, önemli düğümler)
- Grafik yoksa/eskiyse (kod değiştiyse): `pip install graphifyy` sonra `graphify update .` (yalnız AST, LLM yok, API yok; ~saniyeler). `graphify extract` ve semantik tarama KULLANMA.
- Sonuç yetmezse veya düz metin/config/indekslenmemiş dosya → `Grep`; dosyanın yalnız ilgili satırlarını oku (`offset`/`limit`).

## Kütüphane/API dokümanı → Context7
- Bir kütüphane, framework, SDK, CLI veya API kullanırken ezberden yazma:
  `resolve-library-id` → `query-docs` (dar, spesifik `topic` ile).
- Aynı kütüphaneyi oturumda bir kez çöz; ID'yi tekrar kullan.
- Web aramasını yalnızca Context7'de olmayan bilgi için kullan.

## Token disiplini
- Okumadan önce ara; büyük dosyayı bütün okuma.
- Bağımsız araç çağrılarını tek mesajda paralel yap.
- Alt ajan (subagent) yalnızca istenirse veya çok geniş taramada.
- Yanıtlar kısa: yapılanı ve sonucu söyle, kodu tekrar yapıştırma.
- Zaten bilinen bilgiyi yeniden doğrulamak için araç çağırma.

## Git
- Commit'ler küçük ve açıklayıcı; istenmeden PR açma.

## Proje hafızası — motoru SIFIRDAN YAZMA
- Üretim hattı hazır: `python3 -m vayy build <konu>` (Piper ses → müzik/SFX → Remotion render → mux → QA → teslim).
- Konu = `topics/<konu>/topic.json`. Yeni video = yeni JSON; kod gerekmez. Örnekler: `zirve` (8 sn 3D demo), `redbull` (52 sn 2D/WebGL).
- 3D motor: `engine/src/three/` (sahne türü `world3d`), belge: `engine/src/three/README.md`. Diğer sahne türleri: `engine/src/scenes/registry.ts`.
- Ayrıntılı ajan rehberi: `AGENTS.md`. Mimari/komutlar: `README.md`. Durum: `PROGRESS.md`.
- Hızlı görsel kontrol: `python3 -m vayy stills <konu> 0,60,120` → `build/<konu>/stills/` (tam render'dan önce).
- MP4/WAV/build çıktıları git'e girmez (`.gitignore`). Gizli anahtar yok; ücretli API kullanma.

## Video skill'leri — otomatik kullanım
- Kullanıcı video istediğinde konuya göre ilgili proje skill'lerini kendin çağır; slash komutu veya ayrıca izin isteme: `shorts-script-to-scenes` (senaryo/konu), `three-scene-builder` (3D), `remotion-video-creation` (Remotion kodu/animasyon), `render-qa` (render/teslim).
- Skill aracı yoksa ilgili `.claude/skills/<ad>/SKILL.md` dosyasını oku. Yalnız gereken skill ve referansları yükle; mevcut JSON motorunu tercih et, gereksiz paket/ajan/ücretli API kullanma.
- Referans videonun metnini/karakterini kopyalama. Render ve QA gerçek çıktılarla doğrulanmadan tamamlandı deme.


## RTK — komut çıktısı sıkıştırma (proje bazlı, hook yok)
- Her yeni oturumda, ilk komuttan önce bir kez kontrol et: `RTK_BIN=$(command -v rtk || echo "$HOME/.local/bin/rtk"); "$RTK_BIN" --version 2>/dev/null` çıktısı tam olarak `rtk 1.2.1` ise RTK kuruludur; yeniden kurma.
- Eşleşmiyorsa (komut yok veya sürüm farklı) `./scripts/setup-rtk.sh` çalıştır (sürüm sabit v1.2.1, Apache-2.0 edition, kaynaktan `--locked` derleme, yaklaşık 5 dk, `cargo` gerekir). Kurulumdan sonra shell PATH değişikliği kalıcı olmadığı için `$HOME/.local/bin/rtk` mutlak yolunu kullan.
- Kurulum başarısız olursa RTK'siz devam et, komutları ham çalıştır ve bunu tek satırla bildir.
- Doğrulama: `rtk --version`, `rtk gain`.
- Yalnızca bu komutlarda `rtk` öneki kullan: `rtk git status|diff|log|show|branch`, `rtk cargo test`, `rtk pytest`, `rtk npm test|ci|run build` (test/derleme çıktısı çoksa), `cd engine && rtk npx tsc --noEmit`.
- Asla `rtk` ile çalıştırma: `ffmpeg`, `ffprobe`, `npx remotion` (render/bundle), `python3 -m vayy build|audio|remux|qa|stills`, Piper ve diğer render/ses/QA komutları. Bunların hata kayıtları ve çıktıları eksiksiz görünmeli.
- Exit code ≠ 0, test kırmızı, çıktı boş/çelişkili/bozuk ise: `rtk bypass <cmd>` ile ham çıktıyı al veya komutu `rtk`siz yeniden çalıştır. Hata metnini özetleme; kritik satırları birebir aktar.
- Telemetri kapalı tut (`rtk telemetry status` → enabled: no). Global hook (`rtk init -g`) kurma.

## Blender kesitleri
Mekanik rotor kesiti için mevcut konu JSON'unda sahne türünü `cinematic`, props'u
`{"template":"rotor-section","seed":7,"samples":16}` seç. Diğer konularda kayıtlı
sahne türlerini kullan. Sahnenin amacını, ortamını ve kontrol edilecek ayrıntıları
`direction` nesnesine yaz. Çözülmüş anlatım, altyazı ve efekt zamanları
`build/<konu>/scene-manifest.json` içinde saklanır. Normal build komutu ses profilini
ve miks yolunu korur. Blender gerekli olan sahnelerde PATH'te bulunmalıdır.
Hızlı sessiz önizleme: `python -m vayy.studio rotor-section /tmp/rotor.mp4`.
Başarıyla çözülen sahneler .cache/cinema altında yeniden kullanılır.
Ortam envanteri: `python -m vayy.studio.doctor`. Blender/FFmpeg sürümlerini,
CPU/RAM kotasını ve boş diski kontrol et. Tarayıcı tespiti WebGL testi yerine geçmez.
