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
