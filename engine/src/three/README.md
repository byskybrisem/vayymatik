# VAYYMATİK 3D motoru (`engine/src/three`)

Remotion + Three.js (`@remotion/three`, `@react-three/fiber`) ile **JSON'dan** sinematik low-poly 3D sahneler.
Sahne türü: `world3d` (`engine/src/scenes/registry.ts`). Örnek: `topics/zirve/topic.json`.

Kurallar: animasyon yalnızca `useCurrentFrame()` ile (R3F `useFrame` YASAK) → kare bazlı, deterministik.
Rastgelelik yalnızca `core/math.ts → rng(seed)`. Dokular koddan (`core/textures.ts`), dış görsel yok.

## Klasörler
| Yol | İçerik |
|---|---|
| `core/Stage3D.tsx` | ThreeCanvas, ACES tone mapping, PCF yumuşak gölge, sRGB, `scale` (önizleme çözünürlüğü) |
| `core/math.ts` | `rng`, `num`/`vec` (sayı **veya** anahtar kare), `stateWeights` (ad verilmiş durum harmanı), Catmull-Rom |
| `core/materials.ts` | Palet + önbellekli flat-shaded malzemeler (`mat`, `GOLD`, `CHROME`) |
| `core/textures.ts` | Banknot (kurgusal "VAYY"), bina pencereleri, parıltı |
| `camera/CameraRig.tsx` | Anahtar kare yolu (pos/target/fov/roll), global hız eğrisi, el kamerası titreşimi |
| `lighting/LightRig.tsx` | ambient/hemi/dir/point/spot; yoğunluk/konum anahtar kareli, titreşim, gölge |
| `character/rig.ts` | Pozlar (`POSES`), ifadeler (`EXPRESSIONS`), yürüyüş, konuşma (dudak), göz kırpma |
| `character/Character.tsx` | Eklemli low-poly karakter, kıyafet renkleri (`outfit`) |
| `objects/props.tsx` | desk, chair, lamp, laptop, banknote, cash, coin(s), goldBar, goldPile, car, glow |
| `objects/Animated.tsx` | Her nesnede: `pos`/`rot`/`scale` (anahtar kare) + `show` giriş/çıkış (pop/rise/drop/grow/spin) |
| `env/Room.tsx` | İç mekân (panjurlu pencere); `open` 0→1 duvarları devirir |
| `env/City.tsx` | Prosedürel şehir (tek draw call), trafik, ikaz ışıkları, kule; `baseY` anahtar kare → yükseliş |
| `env/Sky.tsx` | Gradyan gökyüzü shader'ı (güneş, yıldız, opaklık) |
| `fx/Particles.tsx` | `dust` (nokta bulutu), `moneySwirl` (banknot girdabı), `lightCone` (sahte hacimsel ışık) |
| `charts/GrowthChart3D.tsx` | Yükselen çubuklar + trend oku |
| `registry.tsx` | `kind` → bileşen eşlemesi |
| `World3DScene.tsx` | Sahne: stage, fog, camera, lights, objects (iç içe `group`), titles, grade |

## JSON şeması (scene.props)
```jsonc
{
  "stage": {"bg": "#04060b", "exposure": 1.05, "shadows": true, "scale": 1},
  "fog": {"color": "#000" | [{"t":0,"v":"#000"}], "near": 30 | [...], "far": 240 | [...]},
  "camera": {"ease": "cine|linear|inOut", "shake": 0.01, "keys": [{"t": 0, "pos": [x,y,z], "target": [x,y,z], "fov": 32}]},
  "lights": [{"type": "spot", "pos": [..], "target": [..], "intensity": 9 | [{"t":0,"v":9}], "castShadow": true}],
  "objects": [
    {"kind": "character", "pos": [0,0,-0.66], "rot": [{"t":0,"v":[0,0,0]}],
     "pose": [{"t":0,"v":"sit"}, {"t":"@satır.word:kelime","v":"stand","dur":0.5}],
     "expr": [{"t":0,"v":"focused"}], "talkFromLine": "satır_id", "walk": {"from":1,"to":3},
     "look": [{"t":0,"v":[pitch,yaw,roll]}], "outfit": {"suit":"#1C2B4A","tie":"#E8112D"}},
    {"kind": "group", "pos": [..], "children": [{"kind": "banknote"}]},
    {"kind": "goldPile", "show": {"from": 2.9, "dur": 0.45, "in": "pop", "to": 6, "out": 0.3}}
  ],
  "titles": [/* components/Titles.tsx TitleSpec */],
  "grade": {"saturate": 1.1, "contrast": 1.08, "leak": "rgba(255,170,80,.5)", "leakOpacity": 0.4, "flash": [..]}
}
```
Zaman anahtarları (`t, from, to, dur, at, start, end, out`) **saniye** ya da `@satır.word:kelime±s` yazılır;
Python hattı (`vayy/timeline.py`) bunları sahne başına göre **kareye** çevirir. `talkFromLine` → `talk` (Piper kelime zamanları).

## Genişletme
- **Yeni nesne:** bileşeni `objects/` (veya `env/`, `fx/`) içine yaz → `registry.tsx`'e bir satır ekle. Props JSON'dan gelir.
- **Yeni poz/ifade:** `character/rig.ts → POSES / EXPRESSIONS` içine nesne ekle (radyan; `STAND`/`SIT`'ten türet).
- **Yeni ortam (fabrika, ofis katı…):** `env/` içinde `Room`/`City` desenini izle (tohumlu, birleştirilmiş geometri, `num()` ile anahtar kare).
- Işık sayısını kare içinde değiştirme (shader yeniden derlenir); ışığı 0 yoğunlukta tut.

## Performans (GPU'suz, SwiftShader `swangle`)
1080×1920, 4 çekirdek: ≈ 3–5 sn/kare (önizleme kareleri). Hızlı deneme: `stage.scale: 0.5` veya `python3 -m vayy stills <konu> 0,90`.
Gölge: en fazla 2 gölgeli ışık (spot 1024, dir 2048). Şehir tek mesh/varyant, trafik ve parçacıklar instanced.
