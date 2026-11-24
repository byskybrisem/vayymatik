# CLAUDE.md — vayymatik

Amaç: en az token ile en doğru iş. Bu dosya her oturumda yüklenir; kısa tut.

## Kod arama → önce Graphify
- Depo kimliği: `byskybrisem/vayymatik` (graphify `repository_id`).
- Yapı soruları için grep/dosya okuma yerine Graphify kullan:
  - tanım nerede → `graphify_find`
  - nasıl çalışıyor / nerede ele alınıyor → `query_graph`
  - kim çağırıyor → `graphify_callers`; sembol + komşular → `graphify_node`
  - değişiklik etkisi → `graphify_impact` (`include_risk=true`)
  - ilgili testler → `graphify_tests_for`; dosya bağımlılıkları → `graphify_file_neighbors`
- Sonuçtaki `commitSha` == `git rev-parse HEAD` ise sonuca güven, tekrar grep yapma.
  Farklıysa yalnızca o commit'ten sonra değişen dosyaları oku.
- Depo Graphify'da yoksa / indeks hazır değilse: `Grep`/`Glob` ile hedefli ara,
  dosyanın tamamını değil ilgili satır aralığını (`offset`/`limit`) oku.
- Düz metin, config değeri, indekslenmemiş dosya → `Grep`.

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
