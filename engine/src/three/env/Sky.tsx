// Gökyüzü kubbesi: zenit → ufuk → güneş halesi geçişli gradyan (shader). Saat/renk anahtar karelerle değişir.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {num, NumKey, V3} from '../core/math';

export type SkySpec = {
	top?: string;
	horizon?: string;
	/** güneşin karşı tarafındaki ufuk rengi (varsayılan: ufuk ile zenit karışımı) */
	horizonFar?: string;
	bottom?: string;
	sun?: string;
	sunDir?: V3;
	sunSize?: number;
	/** 0 = görünmez (siyah), 1 = tam; anahtar karelenebilir */
	opacity?: number | NumKey[];
	stars?: number;
};

const vert = /* glsl */ `
varying vec3 vDir;
void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const frag = /* glsl */ `
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uHorizonFar; uniform vec3 uBottom; uniform vec3 uSun; uniform vec3 uSunDir;
uniform float uSunSize; uniform float uOpacity; uniform float uStars;
varying vec3 vDir;
float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  // ufuk rengi güneşe bakan tarafta sıcak, karşı tarafta soğuk
  vec3 hz = mix(uHorizonFar, uHorizon, pow(dot(d, normalize(uSunDir)) * 0.5 + 0.5, 2.2));
  vec3 col = h > 0.0 ? mix(hz, uTop, pow(clamp(h,0.0,1.0), 0.55)) : mix(hz, uBottom, pow(clamp(-h*3.0,0.0,1.0),0.6));
  col += uSun * (pow(s, 900.0/uSunSize) * 6.0 + pow(s, 40.0/uSunSize) * 0.55 + pow(s, 6.0) * 0.25);
  // yıldızlar (yalnızca karanlık zenitte)
  vec3 q = floor(d * 420.0);
  float st = step(0.9975, hash(q)) * smoothstep(0.15, 0.6, h) * uStars;
  col += vec3(st);
  gl_FragColor = vec4(col * uOpacity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const Sky: React.FC<SkySpec> = (p) => {
	const frame = useCurrentFrame();
	const m = useMemo(
		() =>
			new THREE.ShaderMaterial({
				vertexShader: vert,
				fragmentShader: frag,
				side: THREE.BackSide,
				depthWrite: false,
				fog: false,
				uniforms: {
					uTop: {value: new THREE.Color()},
					uHorizon: {value: new THREE.Color()},
					uHorizonFar: {value: new THREE.Color()},
					uBottom: {value: new THREE.Color()},
					uSun: {value: new THREE.Color()},
					uSunDir: {value: new THREE.Vector3()},
					uSunSize: {value: 1},
					uOpacity: {value: 1},
					uStars: {value: 0},
				},
			}),
		[],
	);
	const u = m.uniforms;
	u.uTop.value.set(p.top ?? '#0b1d44');
	u.uHorizon.value.set(p.horizon ?? '#ff9a4a');
	u.uBottom.value.set(p.bottom ?? '#0a0d18');
	u.uHorizonFar.value.set(p.horizonFar ?? '#000').copy(p.horizonFar ? new THREE.Color(p.horizonFar) : new THREE.Color(p.horizon ?? '#ff9a4a').lerp(new THREE.Color(p.top ?? '#0b1d44'), 0.6));
	u.uSun.value.set(p.sun ?? '#ffd08a');
	const sd = p.sunDir ?? [0.2, 0.08, -1];
	u.uSunDir.value.set(sd[0], sd[1], sd[2]);
	u.uSunSize.value = p.sunSize ?? 1;
	u.uOpacity.value = num(frame, p.opacity, 1);
	u.uStars.value = p.stars ?? 0;
	return (
		<mesh material={m} renderOrder={-10} frustumCulled={false}>
			<sphereGeometry args={[600, 32, 16]} />
		</mesh>
	);
};
