// Fırtınalı / şafak okyanus yüzeyi + kurgusal araştırma gemisi "Meridyen" (SDF), A-çerçevesinde ROV,
// yağmur, şimşek, güverte ışıkları. Dalgalar: yönü dönen sivri tepeli dalga toplamı (özgün).
export const STORM_FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uCam;
uniform float uYaw, uPitch, uRoll, uFov;
uniform float uAmp;        // dalga genliği (m)
uniform float uStorm;      // 0..1 fırtına (bulut, köpük, pus)
uniform float uDawn;       // 0 gece fırtına .. 1 şafak
uniform float uRain;
uniform float uFlash;      // şimşek parlaklığı
uniform float uBoltX;      // şimşek ekran x (-0.8..0.8)
uniform float uBoltSeed;
uniform float uShip;       // 0/1
uniform vec3 uShipPos;
uniform vec3 uShipR0;      // dünya→gemi dönüşüm satırları
uniform vec3 uShipR1;
uniform vec3 uShipR2;
uniform float uRovY;       // ROV yüksekliği (gemi yerel), <-50: gizli
uniform float uExposure;

float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+7.7; a*=.5; } return s; }

float seaH(vec2 p, int oct){
  float h = 0.0, a = uAmp, f = 0.042;
  vec2 dir = vec2(0.91, 0.41);
  for (int i = 0; i < 7; i++){
    if (i >= oct) break;
    float ph = dot(p, dir) * f - uTime * sqrt(9.81 * f) + vn(p * f * 0.55 + float(i) * 3.1) * 2.6;
    float w = 1.0 - abs(sin(ph));
    h += a * (w * w - 0.42);
    dir = mat2(0.8, -0.6, 0.6, 0.8) * dir;
    a *= 0.47; f *= 2.07;
  }
  return h;
}

vec3 skyCol(vec3 rd){
  float y = max(rd.y, 0.0);
  vec3 night = mix(vec3(0.035, 0.045, 0.06), vec3(0.008, 0.01, 0.016), pow(y, 0.5));
  vec3 dawn = mix(vec3(0.62, 0.52, 0.46), vec3(0.18, 0.26, 0.36), pow(y, 0.45));
  vec3 c = mix(night, dawn, uDawn);
  vec2 cp = rd.xz / max(rd.y, 0.04) * 0.55 + vec2(uTime * 0.012, uTime * 0.006);
  float cl = fbm(cp);
  float cl2 = fbm(cp * 2.3 + 4.0);
  float cover = smoothstep(0.35 - uStorm * 0.25, 0.85, cl) * smoothstep(0.03, 0.22, rd.y);   // ufukta bulut dokusu gerilir: sönümle
  vec3 cloud = mix(vec3(0.02, 0.025, 0.032), vec3(0.32, 0.31, 0.32), uDawn) * (0.6 + 0.6 * cl2);
  c = mix(c, cloud, cover * (0.55 + 0.45 * uStorm));
  // güneş parıltısı (şafak)
  vec3 sd = normalize(vec3(0.75, 0.08, -0.65));
  c += uDawn * vec3(1.0, 0.72, 0.45) * (pow(max(dot(rd, sd), 0.0), 24.0) * 0.6 + pow(max(dot(rd, sd), 0.0), 3.0) * 0.12) * (1.0 - cover * 0.7);
  // şimşek: bulutların içini aydınlatır
  c += uFlash * vec3(0.55, 0.6, 0.85) * (0.25 + cover * 0.9) * (0.4 + cl2);
  return c;
}

float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }

// Gemi (yerel: x pruva, y yukarı, z sancak). m: 0 karina, 1 üst yapı, 2 donanım, 3 ROV
float shipD(vec3 p, out float m){
  vec3 q = p;
  float bow = clamp((q.x - 14.0) / 18.0, 0.0, 1.0);
  q.z /= max(0.08, 1.0 - 0.9 * bow * bow);
  q.y -= bow * bow * 2.5;
  float hull = sdBox(q - vec3(0.0, 1.0, 0.0), vec3(31.0, 4.2, 7.0)) - 0.4;
  float d = hull; m = 0.0;
  float sup = min(sdBox(p - vec3(6.0, 8.0, 0.0), vec3(10.5, 3.0, 5.6)), sdBox(p - vec3(10.0, 12.4, 0.0), vec3(5.5, 1.6, 6.3)));
  sup = min(sup, sdBox(p - vec3(-6.0, 6.6, 0.0), vec3(3.5, 1.6, 4.0)));
  if (sup < d) { d = sup; m = 1.0; }
  float eq = sdBox(p - vec3(8.0, 17.5, 0.0), vec3(0.3, 4.5, 0.3));
  eq = min(eq, sdBox(p - vec3(8.0, 20.0, 0.0), vec3(0.2, 0.18, 3.2)));
  eq = min(eq, sdBox(p - vec3(-29.5, 9.0, 3.6), vec3(0.28, 3.6, 0.28)));
  eq = min(eq, sdBox(p - vec3(-29.5, 9.0, -3.6), vec3(0.28, 3.6, 0.28)));
  eq = min(eq, sdBox(p - vec3(-29.5, 12.6, 0.0), vec3(0.32, 0.32, 3.9)));
  eq = min(eq, sdBox(p - vec3(-15.0, 6.4, 3.0), vec3(3.0, 1.3, 1.3)));
  eq = min(eq, sdBox(p - vec3(-15.0, 6.4, -3.0), vec3(3.0, 1.3, 1.3)));
  if (eq < d) { d = eq; m = 2.0; }
  if (uRovY > -50.0) {
    float rov = sdBox(p - vec3(-33.0, uRovY, 0.0), vec3(1.35, 0.85, 0.8)) - 0.08;
    float cable = sdBox(p - vec3(-31.5, (uRovY + 12.6) * 0.5 + 0.5, 0.0), vec3(0.05, max(0.1, (12.6 - uRovY) * 0.5 - 0.5), 0.05));
    if (rov < d) { d = rov; m = 3.0; }
    if (cable < d) { d = cable; m = 2.0; }
  }
  return d;
}
vec3 toShip(vec3 p){ vec3 v = p - uShipPos; return vec3(dot(uShipR0, v), dot(uShipR1, v), dot(uShipR2, v)); }
vec3 fromShipDir(vec3 v){ return uShipR0 * v.x + uShipR1 * v.y + uShipR2 * v.z; }

mat3 camMat(){
  float cy = cos(uYaw), sy = sin(uYaw), cp = cos(uPitch), sp = sin(uPitch), cr = cos(uRoll), sr = sin(uRoll);
  vec3 f = vec3(sy * cp, sp, -cy * cp);
  vec3 r = normalize(vec3(cy, 0.0, sy));
  vec3 u = cross(r, f);
  return mat3(r * cr + u * sr, u * cr - r * sr, f);
}

// gemi ışıkları (dünya konumu, renk)
vec3 lightPos(int i){
  vec3 lp = i == 0 ? vec3(8.0, 22.2, 0.0) : i == 1 ? vec3(10.0, 14.6, 6.8) : i == 2 ? vec3(10.0, 14.6, -6.8) : i == 3 ? vec3(-24.0, 9.5, 0.0) : vec3(-29.5, 13.4, 0.0);
  return uShipPos + fromShipDir(lp);
}
vec3 lightCol(int i){
  return i == 0 ? vec3(1.0, 0.95, 0.85) * 0.8 : i == 1 ? vec3(0.2, 1.0, 0.3) * 0.6 : i == 2 ? vec3(1.0, 0.15, 0.1) * 0.6 : vec3(1.0, 0.88, 0.7) * 1.6;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float foc = 0.5 / tan(radians(uFov) * 0.5);
  mat3 C = camMat();
  vec3 rd = normalize(C * vec3(uv, foc));
  vec3 ro = uCam;
  // --- okyanus kesişimi ---
  float tSea = 1e9;
  {
    float t = 0.2;
    for (int i = 0; i < 70; i++) {
      vec3 p = ro + rd * t;
      float dy = p.y - seaH(p.xz, 4);
      if (dy < 0.003 * t + 0.01) { tSea = t; break; }
      if (rd.y > 0.0 && p.y > uAmp * 1.4) break;
      t += max(dy * 0.6, 0.04 + t * 0.004);
      if (t > 1500.0) break;
    }
  }
  // --- gemi kesişimi (sınır küresi) ---
  float tShip = 1e9; float sm = 0.0;
  if (uShip > 0.5) {
    vec3 oc = ro - uShipPos - vec3(0.0, 6.0, 0.0);
    float b = dot(oc, rd); float c = dot(oc, oc) - 42.0 * 42.0;
    float disc = b * b - c;
    if (disc > 0.0) {
      float t = max(0.0, -b - sqrt(disc)); float t1 = -b + sqrt(disc);
      for (int i = 0; i < 64; i++) {
        float mm; float dd = shipD(toShip(ro + rd * t), mm);
        if (dd < 0.02 + t * 0.0008) { tShip = t; sm = mm; break; }
        t += dd * 0.9;
        if (t > t1) break;
      }
    }
  }
  vec3 col;
  float tHit = min(tSea, tShip);
  float flashL = uFlash * 1.4;
  if (tShip < tSea) {
    vec3 p = ro + rd * tShip;
    vec3 lp = toShip(p);
    float mm; vec2 e = vec2(0.02, 0.0);
    vec3 nl = normalize(vec3(shipD(lp + e.xyy, mm) - shipD(lp - e.xyy, mm), shipD(lp + e.yxy, mm) - shipD(lp - e.yxy, mm), shipD(lp + e.yyx, mm) - shipD(lp - e.yyx, mm)));
    vec3 n = normalize(fromShipDir(nl));
    vec3 alb = sm < 0.5 ? vec3(0.04, 0.07, 0.14) : sm < 1.5 ? vec3(0.72, 0.74, 0.76) : sm < 2.5 ? vec3(0.32, 0.33, 0.34) : vec3(0.85, 0.6, 0.08);
    if (sm < 0.5 && lp.y > 3.6) alb = vec3(0.7, 0.72, 0.74);          // borda üstü beyaz şerit
    vec3 amb = mix(vec3(0.03, 0.035, 0.045), vec3(0.42, 0.42, 0.45), uDawn);
    col = alb * amb * (0.5 + 0.5 * n.y);
    for (int i = 0; i < 5; i++) {
      vec3 L = lightPos(i) - p; float dl = length(L);
      col += alb * lightCol(i) * max(dot(n, L / dl), 0.0) * 30.0 / (dl * dl + 4.0);
    }
    col += alb * flashL * vec3(0.7, 0.75, 1.0) * max(dot(n, normalize(vec3(-0.3, 1.0, 0.2))), 0.0);
    // pencereler (köprü üstü ve üst yapı)
    if (sm > 0.5 && sm < 1.5) {
      float row = step(0.55, fract(lp.y * 0.7 + 0.2)) * step(0.4, fract(lp.x * 0.9 + lp.z * 0.9));
      float bridge = step(12.2, lp.y) * step(lp.y, 13.4);
      col += vec3(1.0, 0.8, 0.5) * (row * 0.35 + bridge * 0.9) * step(0.3, abs(nl.x) + abs(nl.z)) * (1.0 - uDawn * 0.7);
    }
    // ıslak yüzey parlaması
    vec3 rf = reflect(rd, n);
    col += skyCol(rf) * 0.12 * pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
  } else if (tSea < 1e8) {
    vec3 p = ro + rd * tSea;
    float eps = 0.02 + tSea * 0.0025;
    float h = seaH(p.xz, 7);
    vec3 n = normalize(vec3(h - seaH(p.xz + vec2(eps, 0.0), 7), eps, h - seaH(p.xz + vec2(0.0, eps), 7)));
    float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
    vec3 refl = skyCol(reflect(rd, n));
    vec3 deep = mix(vec3(0.004, 0.012, 0.016), vec3(0.03, 0.09, 0.11), uDawn);
    float crest = smoothstep(-0.1 * uAmp, 0.8 * uAmp, h);
    vec3 sss = mix(vec3(0.0, 0.05, 0.045), vec3(0.06, 0.22, 0.2), uDawn) * crest * (0.4 + 0.6 * max(dot(n, normalize(vec3(0.7, 0.2, -0.6))), 0.0));
    col = mix(deep + sss, refl, fres);
    // köpük: tepelerde ve şeritler halinde
    float fn = fbm(p.xz * 0.35 + vec2(uTime * 0.25, 0.0));
    float foam = smoothstep(0.55 * uAmp, 1.05 * uAmp, h + fn * uAmp * 0.6) * (0.3 + 0.7 * uStorm);
    foam += smoothstep(0.72, 0.9, fbm(p.xz * 0.9 + n.xz * 3.0 + uTime * 0.1)) * 0.35 * uStorm;
    vec3 foamC = mix(vec3(0.16, 0.18, 0.2), vec3(0.78, 0.8, 0.82), uDawn) + flashL * 0.6;
    col = mix(col, foamC, clamp(foam, 0.0, 1.0) * 0.85);
    // gemi ışıklarının su yansıması ve gövdenin yakın su gölgesi
    if (uShip > 0.5) {
      for (int i = 0; i < 5; i++) {
        vec3 L = normalize(lightPos(i) - p);
        float sp = pow(max(dot(reflect(rd, n), L), 0.0), 240.0);
        col += lightCol(i) * sp * 0.9;
      }
    }
    col += flashL * 0.25 * refl;
  } else {
    col = skyCol(rd);
  }
  // pus / serpinti
  float fogAmt = 1.0 - exp(-min(tHit, 3000.0) * (0.0018 + 0.004 * uStorm));
  vec3 fogC = mix(vec3(0.03, 0.04, 0.05), vec3(0.5, 0.47, 0.45), uDawn) + flashL * vec3(0.15, 0.16, 0.22);
  col = mix(col, fogC, fogAmt * (tHit < 1e8 ? 1.0 : 0.0));
  // ışık haleleri (gemi direği ve projektörler)
  if (uShip > 0.5) {
    for (int i = 0; i < 5; i++) {
      vec3 L = lightPos(i) - ro;
      float tl = dot(L, rd);
      if (tl < 0.0) continue;
      float dd = length(L - rd * tl);
      float occ = tl < tHit + 2.0 ? 1.0 : 0.15;
      col += lightCol(i) * (exp(-dd * dd * 18.0 / (1.0 + tl * 0.02)) * 1.2 + exp(-dd * 0.5) * 0.08) * occ;
    }
  }
  // şimşek
  if (uFlash > 0.02) {
    float y = uv.y;
    float x = uBoltX + (vn(vec2(y * 7.0, uBoltSeed)) - 0.5) * 0.18 + (vn(vec2(y * 31.0, uBoltSeed + 4.0)) - 0.5) * 0.05;
    float top = 0.62, bot = 0.02 + 0.05 * h11(uBoltSeed);
    float on = step(bot, y) * step(y, top);
    float dx = abs(uv.x - x);
    col += vec3(0.85, 0.88, 1.0) * on * (exp(-dx * 520.0) * 2.4 + exp(-dx * 45.0) * 0.25) * uFlash;
    // dal
    float x2 = x + (y - 0.35) * 0.35 + (vn(vec2(y * 13.0, uBoltSeed + 9.0)) - 0.5) * 0.06;
    float on2 = step(0.18, y) * step(y, 0.36);
    col += vec3(0.8, 0.85, 1.0) * on2 * exp(-abs(uv.x - x2) * 700.0) * 1.2 * uFlash;
  }
  // yağmur çizgileri (üç katman)
  if (uRain > 0.0) {
    for (int L = 0; L < 3; L++) {
      float s = 1.0 + float(L) * 0.7;
      vec2 q = vec2(uv.x * 70.0 * s + uv.y * 9.0, uv.y * 2.2 * s + uTime * (9.0 + float(L) * 3.0));
      vec2 id = floor(q); vec2 f = fract(q);
      float r = h21(id + float(L) * 13.0);
      float streak = smoothstep(0.06, 0.0, abs(f.x - r)) * smoothstep(0.0, 0.25, f.y) * smoothstep(1.0, 0.55, f.y) * step(0.62, h21(id * 1.3 + 2.0));
      col += streak * (0.035 + flashL * 0.2 + uDawn * 0.03) * uRain / s;
    }
  }
  col *= uExposure;
  col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), 0.0, 1.0);
  col = pow(col, vec3(1.0 / 2.2));
  col += (h21(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.014;
  fragColor = vec4(col, 1.0);
}`;
