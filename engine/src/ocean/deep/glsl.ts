// Derin deniz 3D sahnesi için ortak GLSL parçaları (özgün). Işık modeli:
// - Su: kanal başına Beer–Lambert sönümü (kırmızı en hızlı kaybolur) + saçılan ortam rengi
// - ROV lambaları: 2 spot (koni, mesafe, su sönümü), şehir: 4 nokta ışık
// - Tüm hareket uTime/uPulse ile kareye bağlı (deterministik)

export const COMMON = /* glsl */ `
uniform vec3 uSigma;        // su sönüm katsayıları (1/m) — r,g,b
uniform vec3 uWater;        // saçılan ortam (uzak su) rengi
uniform vec3 uAmb;          // yüzeylere gelen zayıf ortam ışığı
uniform vec3 uLampPos[2];
uniform vec3 uLampDir[2];
uniform float uLampI;
uniform float uLampCos;
uniform vec3 uPtPos[4];
uniform vec3 uPtCol[4];
uniform float uTime;
uniform float uPulse;       // sinyal ritmi (0..1 tepe)
uniform float uPower;       // şehir enerji seviyesi 0..1
uniform float uSurface;     // sığ su (yüzey ışığı) 0..1
uniform vec3 uCore;         // şehir çekirdeği (parıltı kaynağı)
uniform vec3 uCoreCol;      // çekirdeğin suda saçılan rengi
uniform vec3 uSurfCol;      // yukarıdan gelen yüzey ışığının rengi

float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), u.x), mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i=0;i<5;i++){ s += a*vnoise(p); p = p*2.03 + 17.1; a *= .5; } return s; }

vec3 waterAtten(vec3 col, float d){ vec3 T = exp(-uSigma * d); return col * T + uWater * (1.0 - T); }
vec3 inscatter(vec3 dir){
  vec3 toC = uCore - cameraPosition;
  float dc = length(toC);
  float g = max(dot(dir, toC / max(dc, 1.0)), 0.0);
  float near = 1.0 / (1.0 + dc * 0.0015);
  return uWater + uCoreCol * (pow(g, 14.0) * 0.9 + pow(g, 3.0) * 0.22 + 0.05) * uPower * near;
}
vec3 waterAttenP(vec3 col, vec3 P){
  vec3 v = P - cameraPosition; float d = max(length(v), 1e-3);
  vec3 T = exp(-uSigma * d);
  return col * T + inscatter(v / d) * (1.0 - T);
}

// Lamba + şehir ışıkları altında yüzey aydınlatması (Blinn–Phong, su içinde)
vec3 lightSurface(vec3 P, vec3 N, vec3 V, vec3 albedo, float spec, float rough){
  vec3 col = uAmb * albedo * (0.55 + 0.45 * N.y);
  for (int i = 0; i < 2; i++){
    vec3 d = P - uLampPos[i];
    float dist = max(length(d), 0.05);
    vec3 l = d / dist;
    float c = dot(l, uLampDir[i]);
    float cone = smoothstep(uLampCos, mix(uLampCos, 1.0, 0.55), c);
    float ndl = max(dot(N, -l), 0.0);
    vec3 att = exp(-uSigma * dist) / (1.0 + 0.045 * dist * dist);
    vec3 H = normalize(-l + V);
    float sp = pow(max(dot(N, H), 0.0), mix(90.0, 12.0, rough)) * spec;
    col += uLampI * cone * att * (albedo * ndl + sp);
  }
  for (int i = 0; i < 4; i++){
    vec3 d = uPtPos[i] - P;
    float dist = max(length(d), 0.5);
    vec3 l = d / dist;
    float ndl = max(dot(N, l), 0.0) * 0.85 + 0.15;
    float fall = i == 0 ? 0.000012 : 0.0006;
    vec3 att = exp(-uSigma * dist * (i == 0 ? 0.3 : 0.6)) / (1.0 + fall * dist * dist);
    vec3 H = normalize(l + V);
    float sp = pow(max(dot(N, H), 0.0), 40.0) * spec * 0.5;
    col += uPtCol[i] * att * (albedo * ndl + sp);
  }
  // yukarıdan süzülen zayıf yüzey ışığı (sığ sahneler)
  col += uSurface * albedo * uSurfCol * (0.35 + 0.65 * max(N.y, 0.0));
  return col;
}

// Altıgen ızgara: (kenar mesafesi, hücre kimliği)
vec3 hexGrid(vec2 p){
  const vec2 s = vec2(1.0, 1.7320508);
  vec4 hc = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
  vec4 h = vec4(p - hc.xy * s, p - (hc.zw + 0.5) * s);
  vec4 r = dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hc.xy) : vec4(h.zw, hc.zw + 0.5);
  vec2 q = abs(r.xy);
  float edge = 0.5 - max(dot(q, s * 0.5), q.x);
  return vec3(edge, r.zw.x * 13.1 + r.zw.y * 7.7, 0.0);
}

vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
`;

// Yapı malzemesi: koyu seramik-metal, altıgen panel, turkuaz enerji damarları ve nabız
export const STRUCT_VERT = /* glsl */ `
varying vec3 vW; varying vec3 vN; varying vec3 vO; varying vec2 vUv; varying float vScale;
void main(){
  mat4 M = modelMatrix;
  #ifdef USE_INSTANCING
  M = modelMatrix * instanceMatrix;
  #endif
  vec4 w = M * vec4(position, 1.0);
  vW = w.xyz; vO = position; vUv = uv;
  vScale = length(M[0].xyz);
  vN = normalize(mat3(M) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const STRUCT_FRAG = /* glsl */ `
${COMMON}
uniform vec3 uBase;        // taban renk
uniform vec3 uGlow;        // enerji rengi
uniform float uHexScale;   // altıgen yoğunluğu (1/m)
uniform float uVeins;      // damar yoğunluğu 0..1
uniform float uGlowAmt;    // emisyon çarpanı
uniform float uMode;       // 0: kubbe (küresel uv), 1: üçdüzlem, 2: boru (uv)
uniform float uSeedM;
uniform float uSpec;
varying vec3 vW; varying vec3 vN; varying vec3 vO; varying vec2 vUv; varying float vScale;
void main(){
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vW);
  vec2 p;
  if (uMode < 0.5) {
    vec3 o = normalize(vO);
    float th = atan(o.z, o.x); float ph = acos(clamp(o.y, -1., 1.));
    p = vec2(th, ph) * vScale * uHexScale;
  } else if (uMode < 1.5) {
    vec3 a = abs(N);
    p = (a.y > max(a.x, a.z) ? vW.xz : (a.x > a.z ? vW.zy : vW.xy)) * uHexScale;
  } else {
    p = vec2(vUv.x * 40.0, vUv.y * 6.0) * uHexScale;
  }
  vec3 hx = hexGrid(p);
  float edge = hx.x;
  float cell = fract(sin(hx.y + uSeedM) * 43758.5);
  // panel kabartması: kenarlarda hafif oluk
  float groove = smoothstep(0.0, 0.035, edge);
  vec3 albedo = uBase * (0.86 + 0.14 * cell) * mix(0.62, 1.0, groove);
  float grain = fbm(vW.xz * 0.35 + vW.y * 0.2);
  albedo *= 0.82 + 0.3 * grain;
  // yukarı bakan yüzeylerde tortu birikimi (gerçek deniz tabanı gibi)
  float dust = smoothstep(0.45, 0.95, N.y) * (0.45 + 0.55 * fbm(vW.xz * 0.6 + 3.0));
  albedo = mix(albedo, vec3(0.36, 0.34, 0.3), dust * 0.55);
  // yakın planda görünen ince altıgen/halka işleme (uzakta soluklaşır: moire yok)
  vec2 pm = p * 9.0;
  vec3 hm = hexGrid(pm);
  float fw = fwidth(pm.x) + fwidth(pm.y);
  float micro = 1.0 - smoothstep(0.12, 0.55, fw);
  float mline = (1.0 - smoothstep(0.0, 0.05, hm.x)) * micro;
  float ringsel = step(0.82, fract(cell * 3.7));
  float rings = (1.0 - smoothstep(0.0, 0.08, abs(fract(length(fract(p) - 0.5) * 7.0) - 0.5))) * ringsel * micro;
  albedo *= 1.0 - 0.45 * mline - 0.3 * rings;
  vec3 col = lightSurface(vW, normalize(N + 0.25 * (1.0 - groove) * vec3(sin(p.x), 0.0, cos(p.y))), V, albedo, uSpec * (1.0 - dust * 0.8), 0.55);
  // enerji damarları: altıgen kenarlarının bir kısmı, yukarı akan nabızlar
  float veinSel = step(1.0 - uVeins, fract(cell * 7.31));
  float line = (exp(-edge * 90.0) + 0.35 * exp(-edge * 18.0)) * veinSel;
  float flow = 0.5 + 0.5 * sin(vW.y * 0.08 - uTime * 1.6 + cell * 6.28);
  float pulse = 0.55 + 0.45 * uPulse;
  vec3 glow = uGlow * line * (0.35 + 0.65 * flow) * pulse * uPower * uGlowAmt;
  float mflow = smoothstep(0.75, 1.0, sin(dot(vW, vec3(0.31, 0.47, 0.22)) * 0.9 - uTime * 2.4) * 0.5 + 0.5);
  float msel = step(0.62, fract(cell * 5.3));
  glow += uGlow * (mline * 0.1 * msel + rings * 0.35) * (0.2 + 0.8 * mflow) * (0.4 + 0.6 * uPulse) * uPower * uGlowAmt;
  // pencere benzeri hücre ışıkları
  float win = (uMode < 0.5 ? step(0.985, fract(cell * 91.7)) : 0.0) * smoothstep(0.08, 0.2, edge) * uPower;
  glow += mix(uGlow, vec3(1.0, 0.95, 0.85), 0.35) * win * 0.9 * uGlowAmt;
  if (uMode > 1.5) {   // boru: iki ince ışık şeridi + akan kapsül ışığı
    float band = exp(-abs(fract(vUv.y * 2.0) - 0.5) * 120.0);
    float run = smoothstep(0.92, 1.0, sin(vUv.x * 60.0 - uTime * 3.0) * 0.5 + 0.5);
    glow += uGlow * band * (0.35 + 1.2 * run) * uPower * uGlowAmt;
  }
  // kenar yansıması: arkadaki parıltıya karşı silüet
  float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += inscatter(-V) * 1.6 * fr;
  col += glow;
  col = waterAttenP(col, vW);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Deniz tabanı / kaya: tortu, çakıl, ince dalgalanma
export const ROCK_FRAG = /* glsl */ `
${COMMON}
uniform vec3 uBase;
uniform float uRough;
varying vec3 vW; varying vec3 vN; varying vec3 vO; varying vec2 vUv;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  float n1 = fbm(vW.xz * 0.12);
  float n2 = fbm(vW.xz * 1.3 + 4.0);
  float pebble = smoothstep(0.62, 0.8, vnoise(vW.xz * 2.6));
  vec3 albedo = uBase * (0.65 + 0.5 * n1) * (0.85 + 0.25 * n2);
  albedo = mix(albedo, uBase * 0.45, pebble * 0.6);
  float ore = smoothstep(0.55, 0.8, fbm(vW.xz * 0.9 + vW.y * 0.7 + 11.0)) * uRough;
  albedo = mix(albedo, vec3(0.32, 0.17, 0.07), ore * 0.7);
  albedo *= 0.75 + 0.5 * fbm(vec2(vW.y * 2.1, vW.x * 1.3 + vW.z));
  // küçük normal sapması
  vec3 Np = normalize(N + uRough * vec3(n2 - 0.5, 0.0, vnoise(vW.zx * 1.7) - 0.5));
  vec3 col = lightSurface(vW, Np, V, albedo, 0.08, 0.9);
  col = waterAttenP(col, vW);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Katkılı parıltı (hale, ışık konisi, kapsül): kenara doğru yumuşak sönüm, mesafeyle su sönümü
export const GLOW_VERT = /* glsl */ `
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main(){
  mat4 M = modelMatrix;
  #ifdef USE_INSTANCING
  M = modelMatrix * instanceMatrix;
  #endif
  vec4 w = M * vec4(position, 1.0);
  vW = w.xyz; vUv = uv; vN = normalize(mat3(M) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const GLOW_FRAG = /* glsl */ `
${COMMON}
uniform vec3 uColor;
uniform float uI;
uniform float uKind;   // 0: hale (uv merkezli disk), 1: koni (uv.y boyunca + fresnel), 2: düz
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main(){
  float a;
  if (uKind < 0.5) {
    float r = length(vUv - 0.5) * 2.0;
    a = exp(-r * r * 4.5) + 0.25 * exp(-r * 9.0);
    a *= smoothstep(1.0, 0.85, r);
  } else if (uKind < 1.5) {
    vec3 V = normalize(cameraPosition - vW);
    float side = abs(dot(normalize(vN), V));
    a = pow(side, 1.6) * pow(1.0 - vUv.y, 1.4) * smoothstep(0.0, 0.08, 1.0 - vUv.y);
    a *= 0.75 + 0.25 * fbm(vec2(vUv.x * 6.0, vUv.y * 3.0 - uTime * 0.25));
  } else {
    a = 1.0;
  }
  float d = length(cameraPosition - vW);
  vec3 T = exp(-uSigma * d * 0.7);
  vec3 col = uColor * uI * a * T;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Arka plan küresi: uzak su + şehir parıltısının saçılması + yukarıdan zayıf ışık
export const BG_FRAG = /* glsl */ `
${COMMON}
uniform vec3 uGlowDir;
uniform vec3 uGlowCol;
uniform float uGlowPow;
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main(){
  vec3 dir = normalize(vW - cameraPosition);
  vec3 col = inscatter(dir) * (0.85 + 0.3 * max(dir.y, 0.0));
  col += uSurface * vec3(0.05, 0.25, 0.45) * pow(max(dir.y, 0.0), 2.0);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Deniz karı: kamerayı saran sarmal hacim; lamba konisinde parlayan (geri saçılma) bulanık noktalar
export const SNOW_VERT = /* glsl */ `
${COMMON}
uniform vec3 uBox;        // hacim boyutu
uniform vec3 uDrift;      // sürüklenme (m/sn)
uniform float uSize;
uniform float uPxScale;
attribute float aSeed;
varying float vB; varying float vSoft;
void main(){
  vec3 p = position + uDrift * uTime;
  vec3 c = cameraPosition;
  p = c + mod(p - c + uBox * 0.5, uBox) - uBox * 0.5;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  // lamba geri saçılması
  float lit = 0.0;
  for (int i = 0; i < 2; i++){
    vec3 d = p - uLampPos[i];
    float dl = length(d);
    float cc = dot(d / max(dl, 1e-3), uLampDir[i]);
    lit += smoothstep(uLampCos, mix(uLampCos, 1.0, 0.4), cc) * exp(-dl * 0.09) * uLampI;
  }
  float amb = 0.06 + uSurface * 0.5 + uPower * 0.12;
  vB = (lit * 0.45 + amb * 0.6) * exp(-dist * 0.06) * (0.35 + 0.65 * hash11(aSeed * 91.7));
  // yakın parçacıklar odak dışı: büyük ve soluk
  float coc = clamp(abs(dist - 4.0) * 0.18, 0.0, 3.0);
  vSoft = coc;
  gl_PointSize = clamp(uSize * uPxScale * (1.0 + coc * 2.2) / max(dist, 0.3), 1.0, 64.0);
  vB /= (1.0 + coc * coc * 1.6);
  gl_Position = projectionMatrix * mv;
}`;

export const SNOW_FRAG = /* glsl */ `
varying float vB; varying float vSoft;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  float r = length(q) * 2.0;
  float a = mix(exp(-r * r * 6.0), smoothstep(1.0, 0.7, r) * 0.8, clamp(vSoft * 0.5, 0.0, 1.0));
  vec3 col = vec3(0.78, 0.9, 1.0) * vB * a;
  gl_FragColor = vec4(col, 1.0);
}`;

// Şehir pencere/ışık noktaları (sabit), su sönümlü
export const LIGHTS_VERT = /* glsl */ `
${COMMON}
uniform float uSize;
uniform float uPxScale;
attribute float aSeed;
attribute vec3 aCol;
varying vec3 vC;
void main(){
  vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.0);
  float dist = -mv.z;
  float tw = 0.75 + 0.25 * sin(uTime * (0.6 + aSeed * 2.0) + aSeed * 40.0);
  vec3 T = exp(-uSigma * dist * 0.8);
  vC = aCol * tw * T * uPower;
  gl_PointSize = clamp(uSize * uPxScale / max(dist, 1.0), 1.0, 28.0);
  gl_Position = projectionMatrix * mv;
}`;
export const LIGHTS_FRAG = /* glsl */ `
varying vec3 vC;
void main(){
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = exp(-r * r * 5.0);
  gl_FragColor = vec4(vC * a, 1.0);
}`;

// Varlık: neredeyse siyah gövde, su rengi kenar parlaması, sinyalle atan biyolüminesan desen
export const BEING_FRAG = /* glsl */ `
${COMMON}
uniform float uVis;
uniform vec3 uGlow;
varying vec3 vW; varying vec3 vN; varying vec3 vO; varying vec2 vUv;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 albedo = vec3(0.025, 0.03, 0.034) * (0.8 + 0.4 * fbm(vO.xy * 0.6));
  vec3 col = lightSurface(vW, N, V, albedo, 0.35, 0.5);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 2.5);
  col += vec3(0.05, 0.22, 0.26) * fr * 0.9;
  // desen: gövde boyunca nokta dizileri
  float ang = atan(vO.z, vO.x);
  float rows = abs(fract(vO.y * 0.55) - 0.5);
  float cols = abs(fract(ang * 3.0 / 6.2832 * 4.0) - 0.5);
  float dots = smoothstep(0.09, 0.0, length(vec2(rows, cols * 0.7)));
  float wave = 0.5 + 0.5 * sin(vO.y * 0.4 - uTime * 2.2);
  col += uGlow * dots * (0.25 + 1.6 * uPulse) * (0.4 + 0.6 * wave);
  col = waterAttenP(col, vW);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Varyantlı vertex: dalgalanan kuyruk (balık) / salınan uzantı
export const SWAY_VERT = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform float uAxis;   // 0: x boyunca (balık), 1: y boyunca (uzantı)
varying vec3 vW; varying vec3 vN; varying vec3 vO; varying vec2 vUv;
void main(){
  vec3 p = position;
  if (uAxis < 0.5) {
    float k = clamp(-p.x / 0.3, 0.0, 1.0);
    p.z += sin(uTime * uFreq - p.x * 18.0) * uAmp * k * k;
  } else {
    float k = clamp(-p.y / 30.0, 0.0, 1.0);
    p.x += sin(uTime * uFreq + p.y * 0.12) * uAmp * k;
    p.z += cos(uTime * uFreq * 0.8 + p.y * 0.1) * uAmp * 0.6 * k;
  }
  vec4 w = modelMatrix * vec4(p, 1.0);
  vW = w.xyz; vO = position; vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const FISH_FRAG = /* glsl */ `
${COMMON}
varying vec3 vW; varying vec3 vN; varying vec3 vO; varying vec2 vUv;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 albedo = vec3(0.92, 0.78, 0.76);
  vec3 col = lightSurface(vW, N, V, albedo, 0.6, 0.3);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 2.0);
  col += vec3(0.9, 0.55, 0.55) * fr * 0.12 * uLampI * 0.1;   // yarı saydam kenar
  col = waterAttenP(col, vW);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Hidrotermal baca dumanı: koyu, türbülanslı, yükselen (alfa harmanlı ilan panosu)
export const SMOKE_FRAG = /* glsl */ `
${COMMON}
uniform float uSeedS;
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main(){
  vec2 uv = vUv;
  float rise = uTime * 0.55;
  float n = fbm(vec2(uv.x * 3.0 + uSeedS, uv.y * 2.2 - rise));
  n += 0.5 * fbm(vec2(uv.x * 7.0 - uSeedS, uv.y * 5.0 - rise * 1.7));
  float width = mix(0.12, 0.42, uv.y);
  float core = 1.0 - smoothstep(width * 0.4, width, abs(uv.x - 0.5 + (n - 0.75) * 0.25 * uv.y));
  float a = core * smoothstep(0.0, 0.05, uv.y) * smoothstep(1.0, 0.55, uv.y) * clamp(n * 1.1, 0.0, 1.0);
  vec3 lit = lightSurface(vW, vec3(0.0, 0.0, 1.0), normalize(cameraPosition - vW), vec3(0.12, 0.11, 0.1), 0.0, 1.0);
  vec3 col = lit * 0.6 + vec3(0.006);
  col = waterAttenP(col, vW);
  gl_FragColor = vec4(col, clamp(a * 1.25, 0.0, 0.97));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
