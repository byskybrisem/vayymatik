// "Ay düşerse" — uzaydan görünüm: NASA Blue Marble Dünya + NASA LRO Ay dokusu,
// gelgit uzaması, çatlak/parçalanma, enkaz halkası, meteor yağmuru, çarpma ve yıkılmış Dünya.
// Birim: Dünya yarıçapı (=1). Dünya orijinde, kuzey +z, yörünge düzlemi xy.
export const MOONSPACE_FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform vec3 uPos, uFwd, uRight, uUp;
uniform float uTanHalf;
uniform vec3 uSun;
uniform sampler2D uEarth;
uniform sampler2D uMoon;
uniform float uTime, uExposure, uStars, uEarthRot;
uniform vec3 uMoonC;
uniform float uMoonR, uStretch, uMoonOn, uCrack;
uniform vec4 uF[20];
uniform float uFragN, uFragGlow;
uniform float uRing, uRingSpread, uRingAng, uRain, uDevast, uHeat, uFlash;
uniform vec3 uImpDir;
uniform float uImpT;

const float PI = 3.14159265359;

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3){ p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec3 hash33(vec3 p3){ p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }

float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  float n000 = hash13(i), n100 = hash13(i+vec3(1,0,0)), n010 = hash13(i+vec3(0,1,0)), n110 = hash13(i+vec3(1,1,0));
  float n001 = hash13(i+vec3(0,0,1)), n101 = hash13(i+vec3(1,0,1)), n011 = hash13(i+vec3(0,1,1)), n111 = hash13(i+vec3(1,1,1));
  return mix(mix(mix(n000,n100,f.x), mix(n010,n110,f.x), f.y), mix(mix(n001,n101,f.x), mix(n011,n111,f.x), f.y), f.z);
}
float fbm(vec3 p, int oct){
  float a = 0.5, s = 0.0, n = 0.0;
  for (int i = 0; i < 7; i++){
    if (i >= oct) break;
    s += a * vnoise(p); n += a; p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5;
  }
  return s / max(n, 1e-4);
}
// 3B Voronoi: x = F1, y = F2 (çatlak kenarı = F2 - F1)
vec2 voronoi(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = hash33(i + g);
    vec3 r = g + o - f;
    float d = dot(r, r);
    if (d < d1){ d2 = d1; d1 = d; } else if (d < d2){ d2 = d; }
  }
  return vec2(sqrt(d1), sqrt(d2));
}

vec2 raySphere(vec3 ro, vec3 rd, float r){
  float b = dot(ro, rd);
  vec3 q = ro - b * rd;
  float h = r*r - dot(q, q);
  if (h < 0.0) return vec2(1e9, -1e9);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

vec4 sampleEq(sampler2D t, vec2 uv){
  vec2 uv2 = vec2(fract(uv.x + 0.5) - 0.5, uv.y);
  vec2 dx = dFdx(uv), dy = dFdy(uv), dx2 = dFdx(uv2), dy2 = dFdy(uv2);
  if (dot(dx,dx) + dot(dy,dy) > dot(dx2,dx2) + dot(dy2,dy2)) { dx = dx2; dy = dy2; }
  return textureGrad(t, uv, dx, dy);
}
vec2 dirToUV(vec3 n, float rot){
  float lon = atan(n.y, n.x) + rot;
  float lat = asin(clamp(n.z, -1.0, 1.0));
  return vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
}

// ışının uç noktaya yaklaşma mesafesi (parlama için); t = ışın üzerindeki konum
float rayPointD2(vec3 ro, vec3 rd, vec3 P, out float t){
  vec3 w = P - ro;
  t = dot(w, rd);
  return dot(w, w) - t * t;
}
// ışın - doğru parçası en kısa mesafe (meteor izi)
float raySegDist(vec3 ro, vec3 rd, vec3 A, vec3 B, out float tr, out float along){
  vec3 v = B - A, w0 = ro - A;
  float b = dot(rd, v), c = dot(v, v), d = dot(rd, w0), e = dot(v, w0);
  float D = c - b * b;
  float tc = D < 1e-7 ? 0.0 : clamp((e - b * d) / D, 0.0, 1.0);
  along = tc;
  vec3 Q = A + v * tc;
  tr = max(dot(Q - ro, rd), 0.0);
  return length(Q - (ro + rd * tr));
}

vec3 starField(vec3 rd){
  vec2 st = vec2(atan(rd.y, rd.x), asin(clamp(rd.z, -1.0, 1.0))) * 300.0;
  vec2 id = floor(st);
  float h = hash12(id);
  vec2 f = fract(st) - 0.5 - (vec2(hash12(id + 1.3), hash12(id + 2.7)) - 0.5) * 0.6;
  float tw = 0.75 + 0.25 * sin(uTime * (1.5 + 3.0 * h) + h * 40.0);
  float star = step(0.9955, h) * smoothstep(0.2, 0.0, length(f)) * (0.35 + 0.65 * hash12(id + 9.1)) * tw;
  vec3 tint = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.88, 0.7), hash12(id + 5.5));
  // soluk Samanyolu bandı
  float band = exp(-pow(dot(rd, normalize(vec3(0.3, -0.5, 0.8))) * 3.2, 2.0));
  float mw = band * (0.25 + 0.75 * fbm(rd * 4.0, 4)) * 0.05;
  return tint * star * 1.6 + vec3(0.55, 0.62, 0.85) * mw;
}

// ---- Ay yüzeyi (NASA LRO dokusu + ince kraterler) ----
vec3 moonSurface(vec3 pl, vec3 nW, float crack, float tm, vec3 e1, vec3 e2, vec3 e3){
  // pl: yerel birim küre noktası (e1 Dünya'ya bakan taraf)
  vec3 q = vec3(dot(pl, e1), dot(pl, e2), dot(pl, e3));
  vec2 uv = vec2(atan(q.y, q.x) / (2.0 * PI) + 0.5, 0.5 - asin(clamp(q.z, -1.0, 1.0)) / PI);
  vec3 tex = sampleEq(uMoon, uv).rgb;
  float lum = dot(tex, vec3(0.3, 0.59, 0.11));
  vec3 alb = pow(tex, vec3(2.2)) * 1.55;
  float g = fbm(q * 38.0, 4);
  alb *= 0.78 + 0.5 * g;
  // yüksek frekanslı krater izleri
  vec2 vc = voronoi(q * 26.0);
  float crater = smoothstep(0.30, 0.22, vc.x) * 0.0 + smoothstep(0.0, 0.07, vc.y - vc.x);
  alb *= 0.86 + 0.18 * crater;
  float ndl = dot(nW, uSun);
  float diff = smoothstep(-0.05, 0.9, ndl);
  vec3 lit = alb * (0.045 + 2.2 * diff);
  // Dünya ışığı (gece tarafı)
  lit += alb * vec3(0.35, 0.5, 0.9) * 0.05;
  if (crack > 0.0){
    vec2 cv = voronoi(q * 3.0 + 0.5 * vec3(fbm(q * 3.0, 3), fbm(q * 3.0 + 4.0, 3), fbm(q * 3.0 + 8.0, 3)));
    float edge = cv.y - cv.x;
    float line = smoothstep(0.045, 0.0, edge) * smoothstep(0.35, 0.6, fbm(q * 4.0, 3));
    float pulse = 0.75 + 0.25 * sin(tm * 9.0 + cv.x * 20.0);
    vec3 hot = mix(vec3(1.0, 0.28, 0.05), vec3(1.0, 0.85, 0.5), line * line);
    lit += hot * line * crack * 6.0 * pulse;
    lit = mix(lit, lit * vec3(1.2, 0.8, 0.6), crack * 0.35);
  }
  return lit;
}

vec3 toL(vec3 v, vec3 ax, vec2 s){ float a = dot(v, ax); return (v - a * ax) / s.y + ax * (a / s.x); }

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 p = 2.0 * fc / uRes - 1.0;
  p.x *= uRes.x / uRes.y;
  vec3 rd = normalize(uFwd + p.x * uTanHalf * uRight + p.y * uTanHalf * uUp);
  vec3 ro = uPos;

  // --- opak nesneler: Dünya, Ay (elipsoit), parçalar ---
  vec2 te = raySphere(ro, rd, 1.0);
  float tE = (te.x > 0.0) ? te.x : 1e9;
  float tM = 1e9; vec3 mpl = vec3(0.0); vec3 mAx = vec3(1.0, 0.0, 0.0); vec2 mS = vec2(1.0);
  if (uMoonOn > 0.5){
    mAx = normalize(uMoonC);
    mS = vec2(uMoonR * (1.0 + uStretch), uMoonR / sqrt(1.0 + uStretch));
    vec3 o = toL(ro - uMoonC, mAx, mS);
    vec3 d = toL(rd, mAx, mS);
    float a = dot(d, d), b = dot(o, d), c = dot(o, o) - 1.0;
    float disc = b * b - a * c;
    if (disc > 0.0){
      float t = (-b - sqrt(disc)) / a;
      if (t > 0.0){ tM = t; mpl = o + d * t; }
    }
  }
  float tF = 1e9; int fi = -1;
  for (int i = 0; i < 20; i++){
    if (float(i) >= uFragN) break;
    vec4 s = uF[i];
    vec3 oc = ro - s.xyz;
    float tcl = -dot(oc, rd);
    vec3 cdir = normalize(oc + rd * tcl + 1e-4);
    float reff = s.w * (0.62 + 0.75 * vnoise(cdir * 2.4 + float(i) * 5.0));
    vec2 r = raySphere(oc, rd, reff);
    if (r.x > 0.0 && r.x < tF){ tF = r.x; fi = i; }
  }
  float tS = min(tE, min(tM, tF));

  vec3 col = starField(rd) * uStars;
  // Güneş parlaması (arka ışık)
  float sd = max(dot(rd, uSun), 0.0);
  col += vec3(1.0, 0.82, 0.62) * (pow(sd, 900.0) * 14.0 + pow(sd, 60.0) * 0.18 + pow(sd, 8.0) * 0.03);

  // Atmosfer rengi (ısınma/yıkım ile turuncu-kahverengiye döner)
  vec3 atmoBlue = vec3(0.26, 0.52, 1.0);
  vec3 atmoHot = vec3(1.0, 0.42, 0.12);

  // --- Dünya ---
  float dvLocal = 0.0;
  if (tE < 1e8 && tE <= tS){
    vec3 sp = ro + rd * tE;
    vec3 n = normalize(sp);
    vec2 uv = dirToUV(n, uEarthRot);
    vec3 tex = sampleEq(uEarth, uv).rgb;
    float land = smoothstep(-0.02, 0.08, (tex.r + tex.g) * 0.5 - tex.b * 0.75);
    vec3 alb = pow(tex, vec3(2.2));
    float ndl = dot(n, uSun);
    float imp = dot(n, uImpDir);
    float ang = acos(clamp(imp, -1.0, 1.0));
    dvLocal = clamp(uDevast * 2.2 - ang * 0.95, 0.0, 1.0);
    vec3 charred = vec3(0.035, 0.028, 0.022) * (0.5 + fbm(n * 14.0, 4));
    vec3 oceanDead = vec3(0.07, 0.06, 0.045) * (0.6 + 0.6 * fbm(n * 9.0, 3));
    vec3 albD = mix(oceanDead, charred, land);
    alb = mix(alb, albD, dvLocal);
    float diff = max(ndl, 0.0);
    vec3 lit = alb * diff * 2.3;
    // okyanus parıltısı
    vec3 hv = normalize(uSun - rd);
    float spec = pow(max(dot(n, hv), 0.0), 420.0) * (1.0 - land) * (1.0 - dvLocal);
    lit += vec3(1.0, 0.95, 0.85) * spec * 0.55 * step(0.0, ndl);
    // bulutlar (yıkımda koyu duman)
    float c = fbm(n * 6.0 + vec3(uTime * 0.01, 0.0, uTime * 0.004), 5);
    float cov = smoothstep(0.52, 0.72, c) * mix(0.8, 0.95, dvLocal);
    vec3 cloudCol = mix(vec3(0.93, 0.95, 0.98), vec3(0.16, 0.115, 0.09), dvLocal) * (0.04 + 1.3 * max(ndl, 0.0));
    lit = mix(lit * (1.0 - 0.25 * cov), cloudCol, cov * 0.85);
    // gece tarafı şehir ışıkları
    float dens = smoothstep(0.55, 0.78, fbm(n * 15.0, 4));
    float pts = smoothstep(0.72, 0.92, vnoise(n * 380.0));
    lit += vec3(1.0, 0.72, 0.38) * dens * pts * land * smoothstep(0.08, -0.2, ndl) * (1.0 - cov) * (1.0 - dvLocal) * 1.6;
    lit += alb * vec3(0.003, 0.005, 0.012);
    // yıkım: lav çatlakları
    if (dvLocal > 0.02){
      vec3 wp = n * 7.0 + 0.45 * vec3(fbm(n * 9.0, 3), fbm(n * 9.0 + 5.0, 3), fbm(n * 9.0 + 9.0, 3));
      vec2 cv = voronoi(wp);
      float line = smoothstep(0.05, 0.0, cv.y - cv.x);
      float pch = smoothstep(0.42, 0.68, fbm(n * 5.0 + 3.0, 4));
      float mag = line * pch * dvLocal * (0.5 + 0.5 * fbm(n * 21.0 + uTime * 0.05, 3));
      lit += mix(vec3(1.0, 0.25, 0.04), vec3(1.0, 0.8, 0.4), mag) * mag * 3.6;
      lit *= 1.0 - 0.45 * pch * dvLocal;
    }
    // çarpma: şok dalgası + ateş topu (yüzey)
    if (uImpT >= 0.0){
      float front = uImpT * 0.62;
      float shock = exp(-pow((ang - front) / 0.07, 2.0)) * exp(-uImpT * 0.35);
      float core = smoothstep(max(front * 0.55, 0.03), 0.0, ang) * exp(-uImpT * 0.3);
      float tur = 0.6 + 0.8 * fbm(n * 26.0 + uImpT * 0.3, 4);
      lit += vec3(1.0, 0.55, 0.2) * shock * 3.2;
      lit += mix(vec3(1.0, 0.3, 0.05), vec3(1.0, 0.9, 0.6), smoothstep(0.0, 0.25, ang)) * core * tur * tur * 1.7;
    }
    // atmosfer kenar parlaması
    float mu = max(dot(n, -rd), 0.0);
    float rim = pow(1.0 - mu, 3.2);
    float side = smoothstep(-0.2, 0.45, ndl);
    vec3 aCol = mix(atmoBlue, atmoHot, clamp(uHeat + dvLocal * 0.85, 0.0, 1.0));
    lit += aCol * rim * side * 1.55;
    lit += aCol * rim * 0.05;
    col = lit;
  } else {
    // limb halesi (Dünya'nın dışında)
    float tcl = max(-dot(ro, rd), 0.0);
    vec3 cp = ro + rd * tcl;
    float b = length(cp);
    float h = b - 1.0;
    if (h < 0.2 && tcl < tS){
      float side = smoothstep(-0.35, 0.5, dot(cp / b, uSun));
      float gl = exp(-max(h, 0.0) / 0.014) * 1.35 + exp(-max(h, 0.0) / 0.06) * 0.22;
      vec3 aCol = mix(atmoBlue, atmoHot, clamp(uHeat + uDevast * 0.9, 0.0, 1.0));
      col += aCol * gl * side * smoothstep(0.0, 0.01, h + 0.02);
    }
  }

  // --- Ay ---
  if (tM < 1e8 && tM <= min(tE, tF)){
    vec3 nW = normalize(toL(mpl, mAx, mS));
    vec3 e1 = -mAx;
    vec3 e3 = vec3(0.0, 0.0, 1.0);
    vec3 e2 = normalize(cross(e3, e1));
    e3 = cross(e1, e2);
    col = moonSurface(normalize(mpl), nW, uCrack, uTime, e1, e2, e3);
  }

  // --- parçalar ---
  if (fi >= 0 && tF <= min(tE, tM)){
    vec4 s = uF[fi];
    vec3 sp = ro + rd * tF;
    vec3 pn = normalize(sp - s.xyz);
    float fid = float(fi);
    vec3 nz = vec3(vnoise(pn * 2.6 + fid * 7.1), vnoise(pn * 2.6 + 19.0 + fid * 3.3), vnoise(pn * 2.6 + 41.0 + fid * 1.7)) - 0.5;
    vec3 n = normalize(pn + 1.5 * nz);
    vec3 e1 = normalize(vec3(cos(fid), sin(fid), 0.3));
    vec3 e2 = normalize(cross(vec3(0.0, 0.0, 1.0), e1));
    vec3 e3 = cross(e1, e2);
    vec3 lit = moonSurface(pn, n, 0.0, uTime, e1, e2, e3) * 0.7;
    float edge = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
    float heat = 0.45 + 0.8 * fbm(pn * 4.0 + fid + uTime * 0.2, 3);
    float crk = smoothstep(0.6, 0.85, fbm(pn * 5.0 + fid, 3));
    lit += mix(vec3(1.0, 0.25, 0.05), vec3(1.0, 0.7, 0.3), crk) * uFragGlow * (0.12 + 0.9 * crk + 0.35 * edge) * heat * 0.9;
    col = lit;
  }

  // --- yarı saydam katmanlar: halka, parça parıltıları, meteorlar ---
  // parça/enkaz parıltıları
  if (uFragGlow > 0.0){
    for (int i = 0; i < 20; i++){
      if (float(i) >= uFragN) break;
      vec4 s = uF[i];
      float tc; float d2 = rayPointD2(ro, rd, s.xyz, tc);
      if (tc > 0.0 && tc < tS){
        float rr = s.w * 1.7;
        col += vec3(1.0, 0.38, 0.1) * uFragGlow * exp(-d2 / (rr * rr)) * 0.05;
      }
    }
  }
  if (uMoonOn > 0.5 && uCrack > 0.0){
    float tc; float d2 = rayPointD2(ro, rd, uMoonC, tc);
    float rr = uMoonR * 1.2;
    if (tc > 0.0 && (tc < tS || tS > 1e8)) col += vec3(1.0, 0.35, 0.1) * uCrack * exp(-d2 / (rr * rr)) * 0.14;
  }

  // halka (z=0 düzlemi, 1.35–3.6)
  if (uRing > 0.001 && abs(rd.z) > 1e-4){
    float tr = -ro.z / rd.z;
    if (tr > 0.0 && tr < tS){
      vec3 q = ro + rd * tr;
      float r = length(q.xy);
      if (r > 1.3 && r < 3.7){
        float th = atan(q.y, q.x);
        float dth = abs(mod(th - uRingAng + PI, 2.0 * PI) - PI);
        float arc = smoothstep(uRingSpread * PI + 0.02, uRingSpread * PI * 0.6, dth);
        float prof = smoothstep(1.3, 1.7, r) * smoothstep(3.7, 3.0, r) * (0.45 + 0.55 * fbm(vec3(r * 5.0, 0.0, 0.0), 3));
        float dens = prof * arc * uRing * smoothstep(0.8, 3.6, tr);
        // Dünya gölgesi
        float sh = 1.0;
        float sdist = dot(q, uSun);
        if (sdist < 0.0){
          float perp = length(q - uSun * sdist);
          sh = smoothstep(0.9, 1.05, perp);
        }
        // toz bandı (halka bantları)
        float bands = 0.72 + 0.28 * sin(r * 61.0 + 9.0 * fbm(vec3(r * 14.0, 1.0, 0.0), 3)) * (0.4 + fbm(vec3(r * 31.0, 2.0, 0.0), 2));
        bands *= 0.35 + 0.9 * smoothstep(0.25, 0.6, fbm(vec3(r * 7.0, 5.0, 0.0), 3));
        float dust = (0.35 + 0.65 * fbm(vec3(q.xy * 6.0, uTime * 0.01), 4)) * bands;
        vec3 dustCol = vec3(0.60, 0.50, 0.42) * dust * dens * 0.7 * sh;
        // kayalar (iki ölçek)
        vec3 rockCol = vec3(0.0);
        float rockMask = 0.0;
        for (int L = 0; L < 2; L++){
          float sc = L == 0 ? 120.0 : 260.0;
          vec2 g = q.xy * sc;
          vec2 id = floor(g);
          float hr = hash12(id + float(L) * 17.0);
          vec2 f = fract(g) - 0.5 - (vec2(hash12(id + 1.7), hash12(id + 5.3)) - 0.5) * 0.7;
          float present = step(1.0 - dens * (L == 0 ? 0.16 : 0.3), hr);
          float sz = 0.06 + 0.2 * pow(hash12(id + 9.9), 2.0);
          float px = length(fwidth(g)) * 0.7;
          float rock = present * smoothstep(sz + px, sz - px, length(f));
          float glint = 0.35 + 1.1 * hash12(id + 3.1);
          rockCol += vec3(0.78, 0.72, 0.66) * glint * rock * sh * 3.0;
          float hotp = step(0.95, hash12(id + 21.0)) * rock * uHeat;
          rockCol += vec3(1.0, 0.45, 0.12) * hotp * 2.6 * sh;
          rockMask = max(rockMask, rock);
        }
        float rock = rockMask;
        col = col * (1.0 - clamp(dens * 0.28 + rock * 0.8, 0.0, 0.9)) + dustCol + rockCol;
      }
    }
  }

  // meteor yağmuru
  if (uRain > 0.001){
    for (int i = 0; i < 26; i++){
      float fi2 = float(i);
      vec3 h = hash33(vec3(fi2, 3.1, 7.7));
      if (h.z > uRain) continue;
      float speed = 0.22 + 0.3 * h.x;
      float pr = fract(uTime * speed + h.y);
      vec3 hd = hash33(vec3(fi2, 11.0, 2.0)) * 2.0 - 1.0;
      vec3 T = normalize(mix(normalize(hd), normalize(uPos), 0.5));
      vec3 O = normalize(vec3(hd.x, hd.y, hd.z * 0.35)) * (2.6 + 1.4 * h.x) + T * 0.2;
      float ph = pow(pr, 1.5);
      vec3 head = mix(O, T * 1.002, ph);
      vec3 tail = mix(O, T * 1.002, max(ph - 0.16, 0.0));
      float trr; float alg; float d = raySegDist(ro, rd, tail, head, trr, alg);
      if (trr < tS || tS > 1e8){
        float nearAtmo = smoothstep(1.35, 1.02, length(head));
        float w = 0.0016 + 0.006 * nearAtmo;
        float I = exp(-d * d / (w * w)) * (0.25 + 1.8 * nearAtmo) * pow(alg, 1.6);
        col += mix(vec3(1.0, 0.82, 0.55), vec3(1.0, 0.4, 0.1), nearAtmo) * I * 2.0;
        // yüzey çarpma parlaması
        if (pr > 0.93){
          float tcP; float dP = rayPointD2(ro, rd, T, tcP);
          float fl = (pr - 0.93) / 0.07;
          if (tcP > 0.0 && tcP < tS + 0.05) col += vec3(1.0, 0.55, 0.2) * exp(-dP / 0.0018) * (1.0 - fl) * 1.4;
        }
      }
    }
  }

  // çarpma: hacimsel ateş topu / ejekta
  if (uImpT >= 0.0){
    for (int k = 0; k < 7; k++){
      float kk = float(k) / 6.0;
      float grow = 1.0 - exp(-uImpT * 0.9);
      vec3 P = uImpDir * (1.0 + kk * 0.5 * grow);
      float rr = (0.03 + 0.11 * grow) * (1.0 - 0.5 * kk);
      float tc; float d2 = rayPointD2(ro, rd, P, tc);
      if (tc > 0.0 && (tc < tE + 0.002 || tE > 1e8)){
        float fall = exp(-uImpT * 0.22);
        col += mix(vec3(1.0, 0.85, 0.5), vec3(1.0, 0.3, 0.06), kk) * exp(-d2 / (rr * rr)) * 1.2 * fall * (1.0 - kk * 0.4);
      }
    }
  }

  col *= uExposure;
  col = aces(col);
  col = pow(col, vec3(1.0 / 2.2));
  // flaş
  col = mix(col, vec3(1.0, 0.95, 0.88), clamp(uFlash, 0.0, 1.0));
  // vinyet + film greni
  float vg = 1.0 - 0.38 * pow(length(p * vec2(0.62, 0.45)), 2.0);
  col *= clamp(vg, 0.0, 1.0);
  col += (hash12(fc + fract(uTime) * 100.0) - 0.5) / 255.0 * 2.5;
  fragColor = vec4(col, 1.0);
}
`;
