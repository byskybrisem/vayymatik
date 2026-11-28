# Varlıklar — kaynak ve lisans

| Dosya | Kaynak | Lisans | SHA-256 |
|---|---|---|---|
| `textures/bmng_200407_topo_bathy_5400x2700.jpg` | NASA Earth Observatory, Blue Marble Next Generation w/ Topography & Bathymetry, Temmuz 2004 — `assets.science.nasa.gov/.../july/world.topo.bathy.200407.3x5400x2700.jpg` | Kamu malı (NASA) | `4f4240673a3a1b173d61b92ca4b07bac5fd17059ea5f725ba6da5a9c5386b7ba` |
| `textures/bmng_200407_newmexico_240ppd.jpg` | Aynı veri setinin 500 m çözünürlüklü A1 karosundan (21600×21600) kesit: 41°K–26°K, 114°B–96°B (Stratos bölgesi) | Kamu malı (NASA) | `7f55645e6853badfeabf8674b94ce47553d1d0fc2a0f8bcf493c199882383f05` |
| `geo/ne_50m_admin_0_countries.zip` | Natural Earth 1:50m Cultural Vectors — Admin 0 Countries (`naciscdn.org`) | Kamu malı | — |

NASA görselleri NASA'nın onayını ima edecek şekilde kullanılmaz. Shader içinde dokular yalnızca canlandırma zemini olarak kullanılır; sahneler videoda "TEMSİLİ" etiketiyle işaretlenir.
Ses modeli (`tr_TR-fahrettin-medium`, CC0 veri seti) depoya eklenmez; `vayy/assets.py` Hugging Face'ten indirip SHA-256 ile doğrular.

## Seslendirme modeli — lisans notu (2026-11-24 doğrulandı)
`tr_TR-fahrettin-medium` model kartı (huggingface.co/rhasspy/piper-voices, v1.0.0): veri seti NabuCasa voice-datasets, **CC0**;
model, ABD İngilizcesi **lessac** sesinden ince ayarlanmıştır (lessac veri seti: Blizzard Challenge 2013 lisansı, cstr.ed.ac.uk).
Piper yazılımı açık kaynaktır; üretilen ses dosyaları için ayrıca telif talep edilmez. Türkçe veri CC0 olduğu için ticari kullanım
yaygın kabul görür; ancak taban modelin lessac verisinden türemesi nedeniyle **tam hukuki kesinlik isteyen ticari projelerde**
bu durum değerlendirilmelidir. Alternatifler: `tr_TR-fettah-medium` (aynı lisans durumu), `tr_TR-dfki-medium` (CC BY-NC-SA — ticari
kullanıma **uygun değil**), espeak-ng (GPL yazılım, çıktı serbest; robotik ses), kendi kaydınız.

## 3D motor varlıkları
`engine/src/three` altındaki tüm geometri, karakter, şehir, banknot ("VAYY" kurgusal tasarım) ve dokular koddan üretilir; dış görsel/model dosyası yoktur.
Three.js (MIT), @react-three/fiber (MIT), @remotion/three (Remotion lisansı: bireyler/≤3 kişilik şirketler ücretsiz).

Atölye karakter hareketleri, top ve tezgâh, kırılma/su/yanma örnekleri, tünel, fabrika, ses efektleri ve kamera hareketleri depo koduyla prosedürel üretilir. Referans videolardan görsel veya ses alınmaz.
