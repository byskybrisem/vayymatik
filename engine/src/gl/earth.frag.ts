// Fiziksel ilhamlı tek saçılımlı atmosfer + NASA Blue Marble dokulu Dünya.
// Birimler: km. Koordinatlar ECEF (x: 0°/0°, y: 0°/90°D, z: Kuzey Kutbu).
export const EARTH_FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform vec3 uPos, uFwd, uRight, uUp;
uniform float uTanHalf, uFovHalf, uFisheye;
uniform vec3 uSun;
uniform sampler2D uEarth;
uniform sampler2D uEarth2;
uniform float uDrain;
uniform sampler2D uMask;
uniform sampler2D uDetailTex;
uniform vec4 uDetailBounds; // lat0(üst), lat1(alt), lon0(sol), lon1(sağ)
uniform float uDetailOn;
uniform float uTime;
uniform float uHlA, uHlB, uBorders, uClouds, uCloudOct, uDots, uExposure, uStars, uSat, uDetail, uSunGlare, uHaze, uDotDensity;
uniform vec3 uHlColA, uHlColB, uTint;

const float PI = 3.14159265359;
const float R = 6371.0;
const float RA = 6371.0 + 100.0;
const float HR = 8.0;
const float HM = 1.4;
const vec3 BR = vec3(5.8e-3, 13.5e-3, 33.1e-3);
const float BM = 2.2e-3;

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3){ p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }

float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  float n000 = hash13(i), n100 = hash13(i+vec3(1,0,0)), n010 = hash13(i+vec3(0,1,0)), n110 = hash13(i+vec3(1,1,0));
  float n001 = hash13(i+vec3(0,0,1)), n101 = hash13(i+vec3(1,0,1)), n011 = hash13(i+vec3(0,1,1)), n111 = hash13(i+vec3(1,1,1));
  return mix(mix(mix(n000,n100,f.x), mix(n010,n110,f.x), f.y), mix(mix(n001,n101,f.x), mix(n011,n111,f.x), f.y), f.z);
}
float fbm(vec3 p, float oct){
  float a = 0.5, s = 0.0, n = 0.0;
  for (int i = 0; i < 10; i++){
    if (float(i) >= oct) break;
    s += a * vnoise(p); n += a; p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5;
  }
  return s / max(n, 1e-4);
}

vec2 raySphere(vec3 ro, vec3 rd, float r){
  float b = dot(ro, rd);
  vec3 q = ro - b * rd;
  float h = r*r - dot(q, q);
  if (h < 0.0) return vec2(1e9, -1e9);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}

float airmass(float mu){
  float z = degrees(acos(clamp(mu, -0.1, 1.0)));
  z = min(z, 95.0);
  return 1.0 / (cos(radians(z)) + 0.50572 * pow(96.07995 - z, -1.6364));
}

vec3 rayDir(vec2 fc){
  vec2 p = 2.0 * fc / uRes - 1.0;
  p.x *= uRes.x / uRes.y;
  vec3 dR = normalize(uFwd + p.x * uTanHalf * uRight + p.y * uTanHalf * uUp);
  float r = length(p);
  vec3 dF = uFwd;
  if (r > 1e-5){ float th = r * uFovHalf; dF = cos(th) * uFwd + sin(th) * (p.x / r * uRight + p.y / r * uUp); }
  return normalize(mix(dR, dF, uFisheye));
}

vec2 dirToUV(vec3 n){
  float lon = atan(n.y, n.x);
  float lat = asin(clamp(n.z, -1.0, 1.0));
  return vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
}

vec4 sampleEq(sampler2D t, vec2 uv){
  vec2 uv2 = vec2(fract(uv.x + 0.5) - 0.5, uv.y);
  vec2 dx = dFdx(uv), dy = dFdy(uv), dx2 = dFdx(uv2), dy2 = dFdy(uv2);
  if (dot(dx,dx) + dot(dy,dy) > dot(dx2,dx2) + dot(dy2,dy2)) { dx = dx2; dy = dy2; }
  return textureGrad(t, uv, dx, dy);
}

// Görüş ışını boyunca tek saçılım (Rayleigh + Mie) — 10 örnek
vec3 atmosphere(vec3 ro, vec3 rd, float tMax, out vec3 transmit){
  transmit = vec3(1.0);
  vec2 ta = raySphere(ro, rd, RA);
  float t0 = max(ta.x, 0.0), t1 = min(ta.y, tMax);
  if (t1 <= t0) return vec3(0.0);
  const int N = 8;
  float ds = (t1 - t0) / float(N);
  vec3 sumR = vec3(0.0), sumM = vec3(0.0);
  float odR = 0.0, odM = 0.0;
  for (int i = 0; i < N; i++){
    vec3 p = ro + rd * (t0 + (float(i) + 0.5) * ds);
    float r = length(p);
    float h = max(r - R, 0.0);
    float dR = exp(-h / HR) * ds, dM = exp(-h / HM) * ds;
    odR += dR; odM += dM;
    float mu = dot(p / r, uSun);
    float perp = r * sqrt(max(0.0, 1.0 - mu * mu));
    float lit = mu > 0.0 ? 1.0 : smoothstep(R - 25.0, R + 10.0, perp);
    float am = airmass(mu);
    vec3 tau = BR * (odR + exp(-h / HR) * HR * am) + BM * 1.1 * (odM + exp(-h / HM) * HM * am);
    vec3 att = exp(-tau) * lit;
    sumR += dR * att; sumM += dM * att;
  }
  float mu = dot(rd, uSun);
  float phR = 3.0 / (16.0 * PI) * (1.0 + mu * mu);
  float g = 0.72;
  float phM = 3.0 / (8.0 * PI) * ((1.0 - g*g) * (1.0 + mu*mu)) / ((2.0 + g*g) * pow(max(1.0 + g*g - 2.0*g*mu, 1e-4), 1.5));
  transmit = exp(-(BR * odR + BM * 1.1 * odM));
  return 20.0 * (sumR * BR * phR + sumM * BM * phM);
}

vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec3 ro = uPos;
  vec3 rd = rayDir(fc);
  vec2 tp = raySphere(ro, rd, R);
  bool hit = tp.x > 0.0 && tp.x < 1e8;
  float tg = hit ? tp.x : 1e9;

  // Yüzey noktası (ıskalayan ışınlarda en yakın yaklaşma noktası: türevler sürekli kalsın)
  float bc = max(-dot(ro, rd), 0.0);
  vec3 sp = hit ? (ro + rd * tg) : (ro + rd * bc);
  vec3 n = normalize(sp);
  vec2 uv = dirToUV(n);
  vec3 tex = sampleEq(uEarth, uv).rgb;
  float drainLocal = 0.0;
  if (uDrain > 0.0){
    // okyanus düzensiz bir cephe halinde çekilir (gürültülü eşik)
    float dn = fbm(n * 3.2 + vec3(1.7, 0.4, 2.9), 4.0);
    drainLocal = smoothstep(0.0, 0.22, uDrain * 1.25 - dn * 0.55);
    tex = mix(tex, sampleEq(uEarth2, uv).rgb, drainLocal);
  }
  // bölgesel yüksek çözünürlüklü doku (ör. Stratos bölgesi, 500 m/piksel)
  float latD = degrees(asin(clamp(n.z, -1.0, 1.0)));
  float lonD = degrees(atan(n.y, n.x));
  vec2 duv = vec2((lonD - uDetailBounds.z) / (uDetailBounds.w - uDetailBounds.z), (uDetailBounds.x - latD) / (uDetailBounds.x - uDetailBounds.y));
  vec3 dtex = texture(uDetailTex, clamp(duv, 0.0, 1.0)).rgb;
  float din = uDetailOn * smoothstep(0.0, 0.06, duv.x) * smoothstep(1.0, 0.94, duv.x) * smoothstep(0.0, 0.06, duv.y) * smoothstep(1.0, 0.94, duv.y);
  tex = mix(tex, dtex, din);
  vec3 msk = sampleEq(uMask, uv).rgb;

  vec3 trans;
  vec3 inscatter = atmosphere(ro, rd, tg, trans);
  vec3 col = vec3(0.0);
  float hlAv = 0.0, hlBv = 0.0, bordv = 0.0;
  vec3 dotsCol = vec3(0.0);

  float altKm = length(ro) - R;
  if (hit){
    vec3 albedo = pow(tex, vec3(2.2));
    float land = smoothstep(0.06, 0.2, msk.r);
    // yakın planda doku ayrıntısı
    if (uDetail > 0.0){
      float d = fbm(n * 2600.0, 3.0);
      albedo *= mix(1.0, 0.75 + 0.5 * d, uDetail * land);
    }
    float ndl = dot(n, uSun);
    vec3 sunT = exp(-(BR * HR + BM * HM) * airmass(ndl));
    float diff = max(ndl, 0.0);
    vec3 lit = albedo * sunT * diff * 2.6;
    // okyanus parlaması
    vec3 hv = normalize(uSun - rd);
    float spec = pow(max(dot(n, hv), 0.0), 90.0) * (1.0 - land) * (1.0 - drainLocal);
    lit += sunT * spec * 0.9 * step(0.0, ndl);
    // bulutlar
    if (uClouds > 0.0){
      float c = fbm(n * 7.0 + vec3(uTime * 0.004, 0.0, uTime * 0.002), uCloudOct);
      float cov = smoothstep(0.55, 0.74, c) * uClouds;
      vec3 cloudCol = vec3(0.92, 0.94, 0.97) * sunT * (0.06 + 1.25 * max(ndl, 0.0));
      lit = mix(lit * (1.0 - 0.3 * cov), cloudCol, cov * 0.85);
    }
    // gece tarafı: çok hafif mavi ortam
    lit += albedo * vec3(0.004, 0.006, 0.012);
    col = lit * trans + inscatter * uHaze;

    // vurgu katmanları ton eşlemeden sonra (ekran uzayında) uygulanır: doygun kırmızı
    hlAv = smoothstep(0.55, 0.92, msk.r) * uHlA;
    hlBv = smoothstep(0.45, 0.9, msk.g) * uHlB;
    bordv = msk.b;

    // canlı izleyici noktaları
    if (uDots > 0.0){
      vec2 g = uv * vec2(540.0, 270.0);
      vec2 id = floor(g);
      vec2 f = fract(g) - 0.5;
      float h1 = hash12(id + 7.0), h2 = hash12(id + 91.0);
      vec2 cellUV = (id + 0.5) / vec2(540.0, 270.0);
      float landC = smoothstep(0.06, 0.2, textureLod(uMask, cellUV, 0.0).r);
      float on = step(h1, uDotDensity) * landC * step(h2, uDots * 1.02);
      float px = max(fwidth(g.x), fwidth(g.y));
      float rad = clamp(2.6 * px, 0.08, 0.42);
      float dd = length(f - (vec2(hash12(id + 3.0), hash12(id + 5.0)) - 0.5) * 0.5);
      float core = smoothstep(rad, rad * 0.35, dd);
      float glow = smoothstep(rad * 3.5, 0.0, dd) * 0.35;
      float tw = 0.75 + 0.25 * sin(uTime * (3.0 + 4.0 * h1) + h2 * 40.0);
      dotsCol = on * (core + glow) * tw * mix(vec3(1.0, 0.18, 0.22), vec3(1.0, 0.97, 0.92), core);
    }
  } else {
    col = inscatter * mix(1.0, uHaze, 0.5);
    // yıldızlar
    if (uStars > 0.0){
      vec3 sd = rd;
      vec2 st = vec2(atan(sd.y, sd.x), asin(clamp(sd.z, -1.0, 1.0))) * vec2(260.0, 260.0);
      vec2 id = floor(st);
      float h = hash12(id);
      vec2 f = fract(st) - 0.5 - (vec2(hash12(id + 1.3), hash12(id + 2.7)) - 0.5) * 0.6;
      float star = step(0.9965, h) * smoothstep(0.16, 0.0, length(f)) * (0.4 + 0.6 * hash12(id + 9.1));
      col += vec3(star) * uStars * dot(trans, vec3(0.333)) * 0.8;
    }
    // güneş diski + parlama
    float sdot = dot(rd, uSun);
    col += trans * (smoothstep(0.99996, 0.999985, sdot) * 40.0 + pow(max(sdot, 0.0), 1800.0) * 6.0) * uSunGlare;
  }
  // geniş güneş halesi (lens)
  float sd2 = max(dot(rd, uSun), 0.0);
  col += vec3(1.0, 0.85, 0.7) * (pow(sd2, 40.0) * 0.22 + pow(sd2, 6.0) * 0.05) * uSunGlare;

  col *= uExposure;
  col = aces(col);
  col = pow(col, vec3(1.0 / 2.2));
  // ekran uzayı katmanları
  float pulse = 0.9 + 0.1 * sin(uTime * 5.0);
  col = mix(col, uHlColA * pulse, hlAv * 0.66);
  col = mix(col, uHlColB * pulse, hlBv * 0.66);
  col = mix(col, vec3(1.0), clamp(bordv * uBorders * 0.75 + bordv * (hlAv + hlBv) * 0.9, 0.0, 1.0));
  col += dotsCol;
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSat) * uTint;
  // ince film grenini kare bazlı ekle (banding'i kırar)
  col += (hash12(fc + fract(uTime) * 100.0) - 0.5) / 255.0 * 2.0;
  fragColor = vec4(col, 1.0);
}
`;
