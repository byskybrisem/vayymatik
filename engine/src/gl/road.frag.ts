// Gece pisti / otoyol: perspektif düzlem, hareket bulanıklığı, ışık direkleri, kerb'ler.
export const ROAD_FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uTime, uDist, uSpeed, uCurve, uCamH, uTanHalf, uPitch, uVariant, uExposure, uShake, uLightsOn, uRoll, uTraffic;
uniform vec3 uTint;

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), f.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), f.x), f.y); }

const float W = 6.5;      // pist yarı genişliği (m)
float center(float dz){ return uCurve * dz * dz / 900.0; }

// kerb şeridi rengi (kutu süzgeçli: hareket bulanıklığı)
float stripe(float v, float period, float blur){
  float s = 0.0;
  for (int k = 0; k < 6; k++){ float vv = v - blur * float(k) / 5.0; s += step(0.5, fract(vv / period)); }
  return s / 6.0;
}

vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = 2.0 * uv - 1.0;
  p.x *= uRes.x / uRes.y;
  float cr = cos(uRoll), sr = sin(uRoll);
  p = mat2(cr, -sr, sr, cr) * p;
  vec3 rd = normalize(vec3(p.x * uTanHalf, p.y * uTanHalf - uPitch, 1.0));
  vec3 col = vec3(0.0);
  float blur = uSpeed / 30.0 * 0.5;   // bir kare boyunca alınan yol (m) * deklanşör
  bool f1 = uVariant < 0.5;
  // gökyüzü
  float hz = rd.y;
  vec3 sky = mix(vec3(0.05, 0.07, 0.14), vec3(0.005, 0.008, 0.02), smoothstep(0.0, 0.5, hz));
  sky += vec3(0.35, 0.28, 0.22) * exp(-abs(hz) * 30.0) * (f1 ? 0.28 : 0.35);  // ufuk ışık kirliliği
  col = sky;
  if (rd.y < -0.0005){
    float t = uCamH / -rd.y;
    vec3 hit = rd * t;
    float dz = hit.z;
    float u = hit.x - center(dz);
    float v = uDist + dz;
    float au = abs(u);
    // asfalt
    float grain = vnoise(vec2(u * 3.0, v * 0.6)) * 0.5 + vnoise(vec2(u * 11.0, v * 2.0)) * 0.5;
    vec3 asphalt = vec3(0.045, 0.047, 0.055) * (0.75 + 0.5 * grain);
    vec3 g = asphalt;
    if (f1){
      // beyaz kenar çizgisi + kerb + çim/çakıl
      float edge = smoothstep(W - 0.35, W - 0.3, au) * (1.0 - smoothstep(W - 0.02, W, au));
      g = mix(g, vec3(0.85), edge);
      float kerb = step(W, au) * (1.0 - step(W + 1.4, au));
      vec3 kc = mix(vec3(0.85, 0.06, 0.08), vec3(0.9), stripe(v, 3.0, blur));
      g = mix(g, kc, kerb);
      vec3 grass = vec3(0.02, 0.05, 0.025) * (0.6 + 0.8 * vnoise(vec2(u * 0.5, v * 0.08)));
      g = mix(g, grass, step(W + 1.4, au));
    } else {
      // otoyol: 3 şerit, kesik çizgiler, sarı kenar
      float lane = 3.6;
      float lw = 0.12;
      float lines = 0.0;
      for (int k = -1; k <= 1; k += 2){
        float lu = abs(u - float(k) * lane * 0.5);
        lines += (1.0 - smoothstep(lw, lw + 0.03, lu)) * stripe(v + 6.0, 12.0, blur);
      }
      g = mix(g, vec3(0.8), clamp(lines, 0.0, 1.0));
      float edge = (1.0 - smoothstep(0.1, 0.13, abs(au - 5.6)));
      g = mix(g, vec3(0.75, 0.6, 0.1), edge);
      g = mix(g, vec3(0.03, 0.03, 0.025), step(5.8, au));
    }
    // ıslak zemin yansıması: direk ışıkları
    float refl = 0.0;
    float spacing = f1 ? 38.0 : 45.0;
    float base = floor(uDist / spacing) * spacing;
    for (int k = 0; k < 14; k++){
      float pz = base + spacing * float(k) - uDist;
      if (pz < 2.0) continue;
      for (int s = -1; s <= 1; s += 2){
        float px = float(s) * (f1 ? W + 7.0 : 7.5) + center(pz);
        float d = length(vec2((hit.x - px) * 1.8, (dz - pz) * 0.12));
        refl += exp(-d * 1.2) * 0.25;
      }
    }
    vec3 lightCol = f1 ? vec3(1.0, 0.96, 0.88) : vec3(1.0, 0.62, 0.25);
    g += lightCol * refl * 0.35 * uLightsOn;
    // genel aydınlatma: uzakta sis
    float fog = 1.0 - exp(-dz * (f1 ? 0.0032 : 0.005));
    g = mix(g * (0.8 + 0.6 * uLightsOn), sky + (f1 ? vec3(0.018, 0.02, 0.03) : vec3(0.05, 0.045, 0.045)), fog);
    col = g;
  }
  // direk ışıkları (ekran uzayında parlama)
  {
    float spacing = f1 ? 38.0 : 45.0;
    float base = floor(uDist / spacing) * spacing;
    vec3 lightCol = f1 ? vec3(1.0, 0.95, 0.85) : vec3(1.0, 0.6, 0.22);
    for (int k = 0; k < 14; k++){
      float pz = base + spacing * float(k) - uDist;
      if (pz < 1.0) continue;
      for (int s = -1; s <= 1; s += 2){
        vec3 lp = vec3(float(s) * (f1 ? W + 7.0 : 7.5) + center(pz), (f1 ? 14.0 : 11.0) - uCamH, pz);
        // izdüşüm
        vec2 sp = vec2(lp.x / lp.z, lp.y / lp.z + uPitch) / uTanHalf;
        vec2 q = vec2(p.x, p.y);
        float d = length((q - sp) * vec2(1.0, 1.0));
        float size = 0.9 / lp.z;
        col += lightCol * (exp(-d / (size * 0.7)) * 1.4 + exp(-d / (size * 6.0)) * 0.18) * uLightsOn;
        // direk gövdesi
        float pole = (1.0 - smoothstep(0.0, 0.25 / lp.z * 2.0, abs(q.x - sp.x))) * step(q.y, sp.y) * step((0.0 - uCamH) / lp.z / uTanHalf + uPitch / uTanHalf, q.y);
        col = mix(col, vec3(0.02), pole * 0.85);
      }
    }
  }
  // otoyol trafiği: önde kırmızı stop lambaları, karşıdan farlar
  if (uVariant > 0.5 && uTraffic > 0.0){
    for (int k = 0; k < 6; k++){
      float fk = float(k);
      float lane = (mod(fk, 2.0) - 0.5) * 3.6;
      float z = mod(18.0 + fk * 37.0 - uTime * 6.0 * (1.0 + 0.2 * fk), 220.0) + 8.0;
      for (int s = -1; s <= 1; s += 2){
        vec3 lp = vec3(lane + float(s) * 0.95 + center(z), 1.1 - uCamH, z);
        vec2 sp = vec2(lp.x / lp.z, lp.y / lp.z + uPitch) / uTanHalf;
        float d = length(p - sp);
        float size = 0.35 / lp.z;
        col += vec3(1.0, 0.08, 0.05) * (exp(-d / (size)) * 1.6 + exp(-d / (size * 7.0)) * 0.15) * uTraffic;
      }
    }
    for (int k = 0; k < 4; k++){
      float fk = float(k);
      float z = mod(240.0 - fk * 61.0 - uTime * 38.0, 240.0) + 6.0;
      for (int s = -1; s <= 1; s += 2){
        vec3 lp = vec3(-8.5 + float(s) * 0.9 + center(z), 0.9 - uCamH, z);
        vec2 sp = vec2(lp.x / lp.z, lp.y / lp.z + uPitch) / uTanHalf;
        float d = length(p - sp);
        float size = 0.5 / lp.z;
        col += vec3(1.0, 0.95, 0.85) * (exp(-d / size) * 1.3 + exp(-d / (size * 9.0)) * 0.2) * uTraffic;
      }
    }
  }
  // hız çizgileri hissi: kenarlarda radyal bulanıklık tonu
  float r = length(p);
  col *= 1.0 - 0.25 * smoothstep(0.6, 1.4, r);
  col *= uExposure;
  col = aces(col);
  col = pow(col, vec3(1.0 / 2.2)) * uTint;
  col += (hash12(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) / 255.0 * 2.0;
  fragColor = vec4(col, 1.0);
}
`;
