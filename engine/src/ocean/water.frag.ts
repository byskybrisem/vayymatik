// Açık su / iniş (ROV bakış açısı): derinliğe bağlı güneş ışığı (kanal başına sönüm), yüzeyden ışık
// huzmeleri, alttan görülen yüzey (Snell penceresi), ROV lambalarının hacimsel saçılması, deniz karı,
// biyolüminesans (kıvılcım + denizanası + zincir) ve sinyal paraziti. Tamamen özgün, kareye bağlı.
export const WATER_FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uTime;
uniform float uYaw, uPitch, uRoll, uFov;
uniform float uDepth;      // metre
uniform float uDescent;    // m/sn (parçacıklar yukarı akar)
uniform float uLamp;       // ROV lambaları
uniform float uSnow;       // deniz karı yoğunluğu
uniform float uBio;        // biyolüminesans
uniform float uJelly;      // denizanası/zincir varlığı
uniform float uGlitch;     // parazit
uniform float uExposure;
uniform float uSeed;

float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), u.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.07+9.3; a*=.5; } return s; }

const vec3 K = vec3(0.42, 0.075, 0.036);   // güneş ışığının su içindeki sönümü (1/m) — kırmızı ilk kaybolur

mat3 camMat(){
  float cy = cos(uYaw), sy = sin(uYaw), cp = cos(uPitch), sp = sin(uPitch), cr = cos(uRoll), sr = sin(uRoll);
  vec3 f = vec3(sy * cp, sp, -cy * cp);
  vec3 r = normalize(vec3(cy, 0.0, sy));
  vec3 u = cross(r, f);
  vec3 r2 = r * cr + u * sr; vec3 u2 = u * cr - r * sr;
  return mat3(r2, u2, f);
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  // parazit: yatay bant kayması
  if (uGlitch > 0.0) {
    float band = floor(frag.y / uRes.y * 38.0);
    float on = step(1.0 - uGlitch * 0.6, h11(band * 7.1 + floor(uTime * 24.0)));
    frag.x += (h11(band + floor(uTime * 30.0)) - 0.5) * uRes.x * 0.12 * on * uGlitch;
  }
  vec2 uv = (frag - 0.5 * uRes) / uRes.y;
  // hafif varil bozulması (kamera kubbesi)
  uv *= 1.0 + 0.06 * dot(uv, uv);
  float foc = 0.5 / tan(radians(uFov) * 0.5);
  mat3 C = camMat();
  vec3 dir = normalize(C * vec3(uv, foc));
  float d = uDepth;
  vec3 sun = exp(-K * d);
  float up = dir.y;
  // su gövdesi parlaklığı: yukarı bakınca daha aydınlık
  vec3 col = sun * vec3(0.12, 0.42, 0.62) * (0.18 + 0.82 * smoothstep(-0.35, 1.0, up)) * (0.35 + 0.65 * exp(-d * 0.004)) * (1.0 + 3.0 * exp(-d * 0.018));
  col += vec3(0.0015, 0.004, 0.007);
  // alttan görülen yüzey + Snell penceresi (~48,6°)
  if (up > 0.0 && d < 90.0) {
    float t = d / up;
    vec2 hp = dir.xz * t + vec2(uTime * 0.4, uTime * 0.15);
    float rip = fbm(hp * 0.35) * 0.6 + fbm(hp * 1.4 + 3.0) * 0.4;
    float win = smoothstep(cos(radians(50.0)), cos(radians(46.0)), up);
    vec3 sky = mix(vec3(0.55, 0.78, 0.95), vec3(1.0), pow(rip, 3.0)) * (0.7 + 0.6 * rip);
    vec3 tir = vec3(0.05, 0.2, 0.3) * (0.6 + 0.4 * rip);
    vec3 surf = mix(tir, sky, win) * exp(-K * t * 0.6);
    col = mix(col, surf, smoothstep(0.0, 0.25, up) * exp(-d * 0.05));
  }
  // yüzeyden süzülen ışık huzmeleri (sığ)
  if (d < 280.0) {
    float acc = 0.0;
    for (int i = 0; i < 8; i++) {
      float t = 2.0 + float(i) * 6.5;
      vec3 p = dir * t + vec3(0.0, -d, 0.0);
      vec2 q = p.xz + p.y * vec2(0.18, 0.05);     // huzmeler hafif eğik
      float s = fbm(q * 0.22 + vec2(uTime * 0.05, -uTime * 0.03));
      s = pow(smoothstep(0.45, 0.85, s), 2.0);
      acc += s * exp(-t * 0.06);
    }
    col += sun * vec3(0.5, 0.85, 1.0) * acc * 0.32 * smoothstep(-0.4, 0.6, up) * exp(-d * 0.01);
  }
  // ROV lambaları: kameranın iki yanından ileri; hacimsel saçılma
  vec3 lampAcc = vec3(0.0);
  if (uLamp > 0.0) {
    vec3 R = C[0], U = C[1], F = C[2];
    for (int k = 0; k < 2; k++) {
      vec3 lp = R * (k == 0 ? 0.8 : -0.8) - U * 0.35;
      vec3 ld = normalize(F - R * (k == 0 ? 0.03 : -0.03) - U * 0.05);
      for (int i = 0; i < 10; i++) {
        float t = 0.4 + float(i) * float(i) * 0.22 + h21(frag + float(i)) * 0.3;
        vec3 p = dir * t;
        vec3 v = p - lp; float dl = length(v);
        float cone = smoothstep(0.88, 0.97, dot(v / dl, ld));
        float dens = 0.65 + 0.7 * vn(p.xy * 0.8 + p.z * 0.3 + uTime * 0.2);
        lampAcc += vec3(0.85, 0.92, 1.0) * cone * dens * exp(-(t + dl) * vec3(0.16, 0.07, 0.055)) / (1.0 + dl * dl * 0.06);
      }
    }
    col += lampAcc * uLamp * 0.055;
  }
  // deniz karı: derinlik katmanları; yakınlar odak dışı ve iri, lamba konisinde parlak
  float lampCone = uLamp * smoothstep(0.62, 0.0, length(uv - vec2(0.0, -0.04)));
  for (int L = 0; L < 9; L++) {
    float z = 0.7 + float(L) * float(L) * 0.32;
    float dens = 7.0 + float(L) * 1.5;
    vec2 q = uv * z * dens / foc;
    q.y -= uTime * (uDescent * 0.9 + 0.06) / z * dens * 0.25;
    q.x += uTime * 0.02 * dens + sin(uTime * 0.3 + float(L)) * 0.1;
    vec2 id = floor(q); vec2 f = fract(q) - 0.5;
    vec2 o = h22(id + float(L) * 17.0 + uSeed) - 0.5;
    float keep = step(1.0 - uSnow * (0.55 + 0.4 * h21(id + 3.1)), h21(id * 1.7 + float(L)));
    float r = length(f - o * 0.8);
    float coc = clamp(abs(z - 3.0) * 0.12, 0.0, 0.45);
    float size = (0.05 + 0.04 * h21(id + 9.0)) * (1.0 + coc * 4.0);
    float a = smoothstep(size, size * (0.25 + coc), r) * keep / (1.0 + coc * 8.0);
    float lit = 0.05 + lampCone * 1.6 * exp(-z * 0.12) + sun.b * 1.4;
    col += vec3(0.8, 0.9, 1.0) * a * lit * 0.55;
  }
  // biyolüminesans kıvılcımları (kısa, mavi-yeşil parlamalar)
  if (uBio > 0.0) {
    for (int L = 0; L < 6; L++) {
      float z = 2.0 + float(L) * 3.0;
      vec2 q = uv * z * 3.2 / foc;
      q.y -= uTime * uDescent * 0.4 / z * 3.2;
      vec2 id = floor(q); vec2 f = fract(q) - 0.5;
      vec2 o = (h22(id + float(L) * 31.0) - 0.5) * 0.8;
      float ph = h21(id + 5.0) * 6.2832;
      float flash = pow(max(0.0, sin(uTime * (0.7 + h21(id) * 1.6) + ph)), 18.0);
      float r = length(f - o);
      float a = exp(-r * r * 260.0) * 1.2 + exp(-r * 22.0) * 0.18;
      vec3 bc = mix(vec3(0.15, 0.65, 1.0), vec3(0.2, 1.0, 0.75), h21(id + 2.0));
      col += bc * a * flash * uBio * 1.6 / (1.0 + z * 0.15) * step(0.45, h21(id * 3.3));
    }
  }
  // denizanaları ve sifonofor zinciri (yarı saydam, kenarı parlayan)
  if (uJelly > 0.0) {
    for (int j = 0; j < 4; j++) {
      float fj = float(j);
      vec2 c = vec2(-0.55 + fj * 0.38 + 0.08 * sin(uTime * 0.21 + fj), 0.28 - 0.3 * h11(fj + 1.0) + 0.05 * sin(uTime * 0.33 + fj * 2.0));
      c.y += mod(uTime * uDescent * 0.012 + fj * 0.3, 1.6) - 0.6;
      float sz = 0.06 + 0.05 * h11(fj + 7.0);
      vec2 p = (uv - c) / sz;
      float pulse = 1.0 + 0.12 * sin(uTime * 2.2 + fj * 1.7);
      p.x /= pulse;
      float bell = length(vec2(p.x, max(p.y, 0.0) * 1.25)) ;
      float body = smoothstep(1.05, 0.95, bell) * step(-0.12, p.y);
      float rim = exp(-abs(bell - 1.0) * 14.0) * step(-0.15, p.y);
      float tent = 0.0;
      for (int k = 0; k < 5; k++) {
        float x0 = -0.7 + float(k) * 0.35;
        float yy = -p.y;
        float xx = p.x - x0 - 0.15 * sin(yy * 2.4 - uTime * 1.6 + float(k));
        tent += exp(-abs(xx) * 34.0) * smoothstep(3.2, 0.0, yy) * step(0.0, yy) * 0.5;
      }
      vec3 jc = mix(vec3(0.3, 0.8, 1.0), vec3(0.75, 0.5, 1.0), h11(fj + 3.0));
      col += jc * (body * 0.05 + rim * 0.35 + tent * 0.12) * uJelly * (0.6 + 0.4 * sin(uTime * 2.2 + fj * 1.7));
    }
    // sifonofor: ışıklı boncuk zinciri
    for (int k = 0; k < 26; k++) {
      float fk = float(k);
      vec2 bp = vec2(0.62 - fk * 0.035, -0.18 + 0.06 * sin(fk * 0.45 + uTime * 0.7));
      float r = length(uv - bp);
      float tw = 0.5 + 0.5 * sin(uTime * 3.0 - fk * 0.6);
      col += vec3(0.25, 0.9, 1.0) * exp(-r * r * 9000.0) * (0.4 + tw) * uJelly * 0.6;
    }
  }
  // parazit: statik + renk kaybı
  if (uGlitch > 0.0) {
    float n = h21(frag * 0.5 + floor(uTime * 30.0));
    col = mix(col, vec3(dot(col, vec3(0.33))), uGlitch * 0.5);
    col += (n - 0.5) * 0.12 * uGlitch;
    float bar = step(0.985 - uGlitch * 0.05, h11(floor(frag.y * 0.25) + floor(uTime * 12.0)));
    col += bar * 0.25 * uGlitch;
  }
  col *= uExposure;
  col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), 0.0, 1.0);
  col = pow(col, vec3(1.0 / 2.2));
  // ince sensör gürültüsü
  col += (h21(frag + fract(uTime) * 100.0) - 0.5) * 0.012;
  fragColor = vec4(col, 1.0);
}`;
