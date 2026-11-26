// "Ay düşerse" — yer seviyesi: gece şehri/liman, NASA LRO Ay dokusuyla dev Ay, gelgit dalgaları.
// Kamera: pitch/yaw/roll/fov; ufuk çizgisi, gökyüzü, katmanlı gökdelenler, su yüzeyi ve ön plan siluetleri.
export const MOONSKY_FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform sampler2D uMoon;
uniform float uTime, uPitch, uYaw, uRoll, uFov, uExposure;
uniform float uMoonRad, uMoonEl, uMoonAz, uPhase;
uniform float uCamY, uWater, uWave, uBlackout, uPeople, uFlash, uSpray, uPanic;

const float PI = 3.14159265359;

float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 x){
  vec2 i = floor(x); vec2 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), f.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p, int oct){
  float a = 0.5, s = 0.0, n = 0.0;
  for (int i = 0; i < 6; i++){
    if (i >= oct) break;
    s += a * vnoise(p); n += a; p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5;
  }
  return s / max(n, 1e-4);
}
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

vec3 mdir(){
  float ce = cos(uMoonEl);
  return vec3(sin(uMoonAz) * ce, sin(uMoonEl), cos(uMoonAz) * ce);
}

// Ay diski: rd yönü için renk (disk + hale); alpha ayrıca döner
vec4 moonDisc(vec3 rd){
  vec3 md = mdir();
  vec3 mr = normalize(cross(vec3(0.0, 1.0, 0.0), md));
  vec3 mu = cross(md, mr);
  float c = dot(rd, md);
  if (c < 0.05) return vec4(0.0);
  float tr = tan(uMoonRad);
  vec2 q = vec2(dot(rd, mr), dot(rd, mu)) / c / tr;
  float r = length(q);
  vec3 col = vec3(0.0);
  float a = 0.0;
  if (r < 1.0){
    float z = sqrt(1.0 - r * r);
    vec3 n = vec3(q, z);
    float lon = atan(n.x, n.z);
    float lat = asin(clamp(n.y, -1.0, 1.0));
    vec2 uv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
    vec3 tex = texture(uMoon, uv).rgb;
    vec3 alb = pow(tex, vec3(2.2)) * 1.15;
    float d = fbm(q * 55.0, 4);
    alb *= 0.8 + 0.4 * d;
    vec3 L = normalize(vec3(sin(uPhase), 0.22, cos(uPhase)));
    float nl = max(dot(n, L), 0.0);
    float lit = 0.03 + 1.9 * mix(pow(nl, 0.55), 1.0, 0.12) * smoothstep(-0.15, 0.25, dot(n, L));
    col = alb * lit * vec3(1.0, 0.97, 0.93);
    a = smoothstep(1.0, 0.985, r);
  }
  // hale (sınırın dışında)
  float h = exp(-max(r - 1.0, 0.0) * 2.4) * 0.3 + exp(-max(r - 1.0, 0.0) * 0.5) * 0.05;
  vec3 halo = vec3(0.62, 0.74, 1.0) * h * smoothstep(0.05, 0.3, c);
  return vec4(col * a + halo * (1.0 - a), 1.0);
}

vec3 skyColor(vec3 rd, bool withMoon){
  float el = asin(clamp(rd.y, -1.0, 1.0));
  float az = atan(rd.x, rd.z);
  vec3 md = mdir();
  float ang = acos(clamp(dot(rd, md), -1.0, 1.0));
  vec3 zen = vec3(0.004, 0.009, 0.026);
  vec3 hor = vec3(0.022, 0.03, 0.06);
  float t = clamp(el / 1.1, 0.0, 1.0);
  vec3 col = mix(hor, zen, pow(t, 0.55));
  // şehir ışığı kirliliği
  col += vec3(0.30, 0.15, 0.07) * 0.22 * exp(-max(el, 0.0) * 5.5);
  // Ay'ın gökyüzünü aydınlatması
  float sc = uMoonRad * 5.0 + 0.2;
  col += vec3(0.1, 0.16, 0.32) * 0.42 * exp(-ang / (sc * 0.8)) * (0.5 + 0.5 * smoothstep(0.0, 0.6, uMoonRad * 3.0));
  // yıldızlar
  vec2 st = vec2(az * 220.0, el * 220.0);
  vec2 id = floor(st);
  float h = hash12(id);
  vec2 f = fract(st) - 0.5;
  float tw = 0.7 + 0.3 * sin(uTime * (2.0 + 4.0 * h) + h * 50.0);
  float star = step(0.992, h) * smoothstep(0.28, 0.0, length(f)) * tw * (0.3 + 0.7 * hash12(id + 3.3));
  col += vec3(0.85, 0.9, 1.0) * star * 1.2 * smoothstep(0.0, 0.08, el) * exp(-ang / (sc * 0.7));
  // ince bulut perdesi (Ay ışığıyla aydınlanır)
  float cl = smoothstep(0.48, 0.82, fbm(vec2(az * 2.6 + uTime * 0.01, el * 7.0), 5));
  col += vec3(0.2, 0.26, 0.42) * cl * 0.4 * exp(-ang / (sc * 0.9)) + vec3(0.008, 0.01, 0.018) * cl;
  if (withMoon){
    vec4 m = moonDisc(rd);
    col += m.rgb;
  }
  return col;
}

// ---- su yüzeyi ----
float swell(float x, float z, float t){
  float w = 0.0;
  w += sin(x * 0.045 + t * 0.9 + z * 0.01) * 0.5;
  w += sin(x * 0.11 - t * 1.3 + z * 0.03) * 0.28;
  w += sin(x * 0.021 + t * 0.5) * 0.9;
  return w;
}
vec3 waterShade(vec3 rd, vec3 ro, float wy){
  float tw = (wy - ro.y) / rd.y;
  vec3 hit = ro + rd * tw;
  float t = uTime;
  float e = 0.06 + 0.5 * uWave;
  // gerçek normal: sinüsler + ince dalgacık
  vec2 xz = hit.xz;
  float dx = (swell(xz.x + 0.6, xz.y, t) - swell(xz.x - 0.6, xz.y, t)) / 1.2;
  float dz = (swell(xz.x, xz.y + 0.6, t) - swell(xz.x, xz.y - 0.6, t)) / 1.2;
  float rip = fbm(xz * 0.1 + vec2(t * 0.12, -t * 0.07), 4);
  float ripx = fbm(xz * 0.1 + vec2(t * 0.12 + 0.5, -t * 0.07), 4) - rip;
  float ripz = fbm(xz * 0.1 + vec2(t * 0.12, -t * 0.07 + 0.5), 4) - rip;
  vec3 n = normalize(vec3(-dx * uWave * 0.35 - ripx * (0.9 + 2.0 * uWave), 1.0, -dz * uWave * 0.35 - ripz * (0.9 + 2.0 * uWave)));
  vec3 r = reflect(rd, n);
  r.y = abs(r.y) + 0.004;
  float fr = 0.04 + 0.96 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
  vec3 deep = vec3(0.004, 0.016, 0.026);
  vec3 refl = skyColor(normalize(r), true);
  vec3 col = mix(deep, refl, fr);
  vec3 md2 = mdir();
  col += vec3(0.7, 0.8, 1.0) * pow(max(dot(normalize(r), md2), 0.0), 90.0) * (0.6 + rip) * 0.9;
  // köpük (dalga tepeleri)
  float crest = smoothstep(0.55, 0.85, rip + dx * uWave * 0.12);
  col += vec3(0.5, 0.58, 0.66) * crest * uWave * 0.5 * (0.2 + 0.8 * length(refl));
  // şehir ışığı yansıması
  col += vec3(0.5, 0.28, 0.12) * 0.12 * exp(-max(rd.y * -22.0, 0.0)) * (0.4 + rip);
  // uzakta ufka doğru sis
  float dist = tw * length(rd.xz) ;
  col = mix(col, vec3(0.045, 0.06, 0.1), 1.0 - exp(-dist / 1500.0));
  return col;
}

// ---- şehir katmanı ----
vec4 cityLayer(vec3 rd, float D, float seed, float hMin, float hMax, float blk, float camY, float wy, out float hyOut){
  float hl = max(length(rd.xz), 1e-3);
  float hy = camY + D * rd.y / hl;
  hyOut = hy;
  float az = atan(rd.x, rd.z);
  float X = az * D;
  float cid = floor(X / blk);
  float fx = fract(X / blk);
  float h1 = hash11(cid * 1.37 + seed);
  float h2 = hash11(cid * 3.11 + seed * 2.0);
  float H = hMin + (hMax - hMin) * pow(h1, 1.5);
  if (h2 < 0.14) H *= 0.35;
  // üst kademe (setback)
  float tier = step(0.62, h2) * step(abs(fx - 0.5), 0.2) * (0.16 * H);
  float Ht = H + tier;
  float gap = step(0.9, fx) + step(fx, 0.06);
  // su seviyesi: sürekli salınan (dalga yükü)
  float weff = wy + uWave * (swell(X * 1.0, D, uTime) * 1.2 + 1.5);
  if (wy < -100.0) weff = -1.0;
  if (hy < max(0.0, weff) || hy > Ht || gap > 0.5) return vec4(0.0);
  // bina yüzeyi
  vec3 body = vec3(0.006, 0.008, 0.016) * (0.6 + 0.8 * hash11(cid + seed * 5.0)) * (0.6 + 0.6 * smoothstep(0.0, Ht, hy)) + vec3(0.02, 0.012, 0.008) * smoothstep(60.0, 0.0, hy) * 0.5;
  // pencereler
  vec2 wc = vec2(X / 2.9, hy / 3.5);
  vec2 wid = floor(wc);
  vec2 wf = fract(wc);
  float wh = hash12(wid + cid * 7.0 + seed);
  float on = step(0.42 + 0.35 * hash11(cid + 9.0), wh);
  // karartma (sel ilerledikçe ışıklar söner)
  float outage = step(uBlackout * 1.05, hash12(wid * 0.37 + cid + 4.0)) ;
  on *= mix(1.0, outage, step(0.001, uBlackout));
  float win = on * smoothstep(0.2, 0.28, wf.x) * smoothstep(0.8, 0.72, wf.x) * smoothstep(0.26, 0.34, wf.y) * smoothstep(0.74, 0.66, wf.y);
  float flick = 0.85 + 0.15 * sin(uTime * 5.0 + wh * 60.0);
  vec3 wcol = mix(vec3(1.0, 0.78, 0.45), vec3(0.72, 0.85, 1.0), step(0.78, hash12(wid + 33.0)));
  vec3 col = body + wcol * win * flick * (0.45 + 0.9 * (1.0 - D / 1400.0)) * (0.7 + 0.6 * wh);
  // Ay ışığı kenar parlaması (üst kenar + yan kenarlar)
  float rim = smoothstep(Ht - 6.0, Ht, hy) * 0.5 + (smoothstep(0.12, 0.0, fx) + smoothstep(0.88, 1.0, fx)) * 0.12;
  col += vec3(0.2, 0.28, 0.5) * rim * (0.1 + uMoonRad * 2.5);
  // köpük/sıçrama su çizgisi
  if (wy > -100.0) col += vec3(0.55, 0.65, 0.75) * smoothstep(5.0, 0.0, hy - weff) * 0.3;
  // sis
  vec3 fog = vec3(0.03, 0.04, 0.075);
  col = mix(col, fog, 1.0 - exp(-D / 1500.0));
  // kırmızı uyarı ışığı
  float bx = (cid + 0.5) * blk;
  float bl = step(0.8, h1) * exp(-(pow(X - bx, 2.0) + pow(hy - Ht - 2.5, 2.0)) / 14.0) * step(0.5, sin(uTime * 1.6 + h2 * 20.0));
  col += vec3(1.0, 0.1, 0.06) * bl * 2.5;
  return vec4(col, 1.0);
}

// zemin (kuşbakışı şehir ışıkları)
vec3 groundLights(vec3 rd, vec3 ro){
  float tg = -ro.y / rd.y;
  vec3 hit = ro + rd * tg;
  vec2 g = hit.xz / 28.0;
  vec2 id = floor(g);
  vec2 f = fract(g);
  float street = step(f.x, 0.07) + step(f.y, 0.07);
  float lamp = step(0.84, hash12(id)) * smoothstep(0.1, 0.0, length(f - 0.5) - 0.0);
  float car = step(0.9, hash12(id + 7.0)) * step(f.y, 0.07) * step(0.5, fract(hit.x * 0.2 + uTime * 0.35));
  vec3 col = vec3(0.012, 0.014, 0.02) + vec3(0.25, 0.14, 0.07) * 0.1 * street;
  col += vec3(1.0, 0.7, 0.35) * lamp * 0.8 + vec3(1.0, 0.25, 0.12) * car * 0.9;
  float dist = tg;
  return mix(col, vec3(0.05, 0.065, 0.11), 1.0 - exp(-dist / 900.0));
}

float capsule(vec2 p, vec2 a, vec2 b, float r){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
// insan silueti (p: NDC, c: ayak konumu, s: boy)
float person(vec2 p, vec2 c, float s, float armUp, float lean){
  vec2 q = (p - c) / s;
  q.x -= lean * q.y * 0.25;
  float head = length(q - vec2(0.0, 0.84)) - 0.062;
  float neck = capsule(q, vec2(0.0, 0.72), vec2(0.0, 0.78), 0.035);
  float body = min(capsule(q, vec2(0.0, 0.66), vec2(0.0, 0.38), 0.1), capsule(q, vec2(-0.1, 0.68), vec2(0.1, 0.68), 0.045));
  float legs = min(capsule(q, vec2(-0.05, 0.36), vec2(-0.07, 0.0), 0.05), capsule(q, vec2(0.05, 0.36), vec2(0.07, 0.0), 0.05));
  float arm1 = capsule(q, vec2(0.1, 0.62), mix(vec2(0.13, 0.4), vec2(0.28, 0.98), armUp), 0.034);
  float arm2 = capsule(q, vec2(-0.1, 0.62), vec2(-0.14, 0.4), 0.034);
  return min(min(min(head, neck), min(body, legs)), min(arm1, arm2)) * s;
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 p = 2.0 * fc / uRes - 1.0;
  p.x *= uRes.x / uRes.y;
  float th = tan(uFov * 0.5);
  vec2 pr = vec2(p.x * cos(uRoll) - p.y * sin(uRoll), p.x * sin(uRoll) + p.y * cos(uRoll));
  vec3 v = normalize(vec3(pr * th, 1.0));
  // pitch (yukarı +), yaw
  float cp = cos(uPitch), sp = sin(uPitch);
  v = vec3(v.x, v.y * cp + v.z * sp, v.z * cp - v.y * sp);
  float cy = cos(uYaw), sy = sin(uYaw);
  vec3 rd = vec3(v.x * cy + v.z * sy, v.y, v.z * cy - v.x * sy);
  vec3 ro = vec3(0.0, uCamY, 0.0);

  bool hasWater = uWater > -100.0;
  vec3 col;
  if (rd.y >= 0.0){
    col = skyColor(rd, true);
  } else if (hasWater){
    float wyH = uWater + uWave * 0.6;
    col = waterShade(rd, ro, wyH);
  } else {
    col = groundLights(rd, ro);
  }

  // şehir katmanları (uzaktan yakına)
  float hy;
  float wy = hasWater ? uWater : -1000.0;
  vec4 c4;
  c4 = cityLayer(rd, 1500.0, 1.0, 40.0, 260.0, 55.0, uCamY, wy, hy); if (c4.a > 0.5) col = c4.rgb;
  c4 = cityLayer(rd, 950.0, 7.0, 40.0, 340.0, 62.0, uCamY, wy, hy); if (c4.a > 0.5) col = c4.rgb;
  c4 = cityLayer(rd, 560.0, 13.0, 30.0, 300.0, 48.0, uCamY, wy, hy); if (c4.a > 0.5) col = c4.rgb;
  c4 = cityLayer(rd, 300.0, 29.0, 25.0, 220.0, 40.0, uCamY, wy, hy); if (c4.a > 0.5) col = c4.rgb;
  c4 = cityLayer(rd, 170.0, 41.0, 20.0, 150.0, 34.0, uCamY, wy, hy); if (c4.a > 0.5) col = c4.rgb;

  // Ay önde ise (bina arkasında kalan gökyüzü yukarıda zaten çizildi); Ay hâlesi binaların üstüne taşar
  {
    vec3 md = mdir();
    float ang = acos(clamp(dot(rd, md), -1.0, 1.0));
    col += vec3(0.3, 0.4, 0.7) * 0.025 * exp(-ang / (uMoonRad * 2.5 + 0.08));
  }

  // ön plan: insanlar (çatı terası) ve korkuluk
  if (uPeople > 0.001){
    vec3 mlight = vec3(0.45, 0.55, 0.85) * (0.25 + 2.0 * uMoonRad);
    float d = 1e3;
    float shapeMask = 0.0;
    for (int i = 0; i < 9; i++){
      float fi = float(i);
      float h = hash11(fi * 3.7 + 1.0);
      float x = -1.02 + (fi + 0.5 * h) * 0.26 + sin(uTime * 0.7 + fi) * 0.004;
      float sz = 0.30 + 0.1 * hash11(fi * 5.1);
      float yb = -1.02 + 0.1 * hash11(fi * 9.1);
      float arm = step(0.6, hash11(fi * 2.3)) * smoothstep(0.0, 1.0, 0.5 + 0.5 * sin(uTime * 1.3 + fi * 2.0));
      float dd = person(p, vec2(x, yb), sz, arm * 0.9 + 0.1, (hash11(fi * 8.0) - 0.5) * 0.8);
      d = min(d, dd);
    }
    float m = smoothstep(0.004, -0.004, d);
    // korkuluk
    float rail = smoothstep(0.012, 0.0, abs(p.y + 0.9) - 0.012) + smoothstep(0.01, 0.0, abs(p.y + 1.05) - 0.01);
    float post = smoothstep(0.012, 0.0, abs(fract(p.x * 4.0) - 0.5) - 0.495 + 0.488) * step(p.y, -0.9) * step(-1.1, p.y);
    float fg = max(m, max(rail * 0.9, post * 0.6));
    float rimL = smoothstep(0.03, 0.0, d) * (1.0 - m) * 0.0;
    vec3 fgCol = vec3(0.004, 0.005, 0.009) + mlight * 0.05 * smoothstep(-0.3, 0.1, p.y);
    col = mix(col, fgCol, fg * uPeople);
    col += mlight * smoothstep(0.02, 0.0, d) * (1.0 - m) * 0.25 * uPeople;
  }

  // ön plan su serpintisi / yağmur taneleri
  if (uSpray > 0.001){
    float sacc = 0.0;
    for (int k = 0; k < 2; k++){
      vec2 g = vec2(p.x * 26.0 * (1.0 + float(k)), p.y * 16.0 * (1.0 + float(k)) - uTime * (3.0 + 2.0 * float(k)));
      vec2 id = floor(g);
      vec2 f = fract(g) - 0.5;
      float h = hash12(id + float(k) * 40.0);
      sacc += step(0.93, h) * smoothstep(0.18, 0.0, length(f * vec2(1.0, 0.5))) * 0.6;
    }
    col += vec3(0.5, 0.6, 0.72) * sacc * uSpray * smoothstep(0.1, -0.9, p.y);
  }

  // panik: kırmızı uyarı titreşimi
  col += vec3(0.5, 0.04, 0.02) * uPanic * (0.5 + 0.5 * sin(uTime * 8.0)) * 0.12 * smoothstep(-0.2, -1.0, p.y);

  col *= uExposure;
  col = aces(col);
  col = pow(col, vec3(1.0 / 2.2));
  col = mix(col, vec3(1.0, 0.97, 0.92), clamp(uFlash, 0.0, 1.0));
  float vg = 1.0 - 0.42 * pow(length(p * vec2(0.62, 0.45)), 2.0);
  col *= clamp(vg, 0.0, 1.0);
  col += (hash12(fc + fract(uTime) * 100.0) - 0.5) / 255.0 * 2.5;
  fragColor = vec4(col, 1.0);
}
`;
