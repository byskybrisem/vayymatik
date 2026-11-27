// Ortam aydınlatması: gökyüzü gradyanından PMREM çevre haritası (metal/cam yansımaları için) + bulut katmanları.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {num, NumKey, rng, V3} from '../core/math';
import {cloudPuffTexture} from './common';

const vert = /* glsl */ `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `;
const frag = /* glsl */ `
uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uGnd; uniform vec3 uSun; uniform vec3 uSunDir; varying vec3 vD;
void main(){
  vec3 d = normalize(vD);
  float h = d.y;
  vec3 c = h > 0.0 ? mix(uHor, uTop, pow(clamp(h,0.0,1.0), 0.5)) : mix(uHor, uGnd, pow(clamp(-h*2.0,0.0,1.0), 0.7));
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  c += uSun * (pow(s, 600.0) * 40.0 + pow(s, 24.0) * 1.4);
  gl_FragColor = vec4(c, 1.0);
}`;

/** Sahne çevre haritası. İki gökyüzü rengi arası gradyan + güneş; PBR metal ve camlar gerçekçi yansıtır. */
export const SkyEnv: React.FC<{top?: string; horizon?: string; ground?: string; sun?: string; sunDir?: V3; intensity?: number | NumKey[]}> = ({top = '#3a78c8', horizon = '#dbe7f5', ground = '#8a9bb0', sun = '#fff1d6', sunDir = [0.4, 0.5, 0.6], intensity = 1}) => {
	const gl = useThree((s) => s.gl);
	const scene = useThree((s) => s.scene);
	const frame = useCurrentFrame();
	const tex = useMemo(() => {
		const sc = new THREE.Scene();
		const m = new THREE.ShaderMaterial({
			vertexShader: vert,
			fragmentShader: frag,
			side: THREE.BackSide,
			uniforms: {
				uTop: {value: new THREE.Color(top)},
				uHor: {value: new THREE.Color(horizon)},
				uGnd: {value: new THREE.Color(ground)},
				uSun: {value: new THREE.Color(sun)},
				uSunDir: {value: new THREE.Vector3(...sunDir)},
			},
		});
		sc.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), m));
		const pm = new THREE.PMREMGenerator(gl);
		const rt = pm.fromScene(sc, 0.03);
		pm.dispose();
		m.dispose();
		return rt.texture;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [gl, top, horizon, ground, sun, sunDir.join(',')]);
	scene.environment = tex;
	scene.environmentIntensity = num(frame, intensity, 1);
	return null;
};

export type CloudSpec = {
	/** Bulut kümesi sayısı (her küme 5–7 sprite) */
	count?: number;
	/** Hacim: [genişlik, yükseklik, derinlik] */
	size?: V3;
	center?: V3;
	seed?: number;
	/** Bulutların -Z yönünde akış hızı (m/sn) — uçağın göreli hızı hissi */
	speed?: number;
	tint?: string;
	opacity?: number | NumKey[];
	/** Sprite boyutu aralığı (m) */
	puff?: [number, number];
	/** Düz bulut denizi gibi yassı dağılım (0=hacim, 1=yassı) */
	flat?: number;
	/** kamera yolunu açık tutmak için: merkezden bu yarıçap (x,y) içinde bulut merkezi bırakma */
	hole?: number;
	/** kameraya bu mesafeden yakın bulutlar solar: [tam görünür mesafe başlangıcı, bitişi] */
	fade?: [number, number];
};

/** Sinematik bulutlar: tohumlu, kare tabanlı, sprite kümeleri (ucuz hacimsel görünüm). */
export const Clouds: React.FC<CloudSpec> = ({count = 24, size = [120, 40, 240], center = [0, 0, 0], seed = 5, speed = 0, tint = '#ffffff', opacity = 1, puff = [14, 30], flat = 0, hole = 0, fade = [16, 60]}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const cam = useThree((s) => s.camera);
	const data = useMemo(() => {
		const r = rng(seed);
		const out: {sprites: THREE.Sprite[]; x: number; y: number; z: number; offs: V3[]; sizes: number[]; rots: number[]}[] = [];
		const group = new THREE.Group();
		for (let i = 0; i < count; i++) {
			const k = 5 + Math.floor(r() * 3);
			const offs: V3[] = [];
			const sizes: number[] = [];
			const rots: number[] = [];
			const sprites: THREE.Sprite[] = [];
			const base = puff[0] + r() * (puff[1] - puff[0]);
			for (let j = 0; j < k; j++) {
				offs.push([(r() - 0.5) * base * 1.6, (r() - 0.35) * base * 0.5, (r() - 0.5) * base * 0.8]);
				sizes.push(base * (0.7 + r() * 0.7));
				rots.push((r() - 0.5) * 0.5);
				const mat = new THREE.SpriteMaterial({map: cloudPuffTexture(Math.floor(r() * 4)), color: tint, transparent: true, depthWrite: false, rotation: (r() - 0.5) * 0.4});
				const s = new THREE.Sprite(mat);
				group.add(s);
				sprites.push(s);
			}
			let cx = (r() - 0.5) * size[0];
			let cy = (r() - 0.5) * size[1] * (1 - flat);
			const dd = Math.hypot(cx, cy);
			if (hole > 0 && dd < hole) {
				const k2 = hole / Math.max(0.01, dd);
				cx = dd < 0.01 ? hole : cx * k2;
				cy *= k2;
			}
			out.push({sprites, x: cx, y: cy, z: r() * size[2], offs, sizes, rots});
		}
		return {out, group};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [count, seed, tint, size.join(','), puff.join(','), flat, hole]);
	const t = frame / fps;
	const op = num(frame, opacity, 1);
	for (const c of data.out) {
		const zz = (((c.z - speed * t) % size[2]) + size[2]) % size[2];
		const edge = Math.min(1, zz / (size[2] * 0.12), (size[2] - zz) / (size[2] * 0.08));
		c.sprites.forEach((s, j) => {
			s.position.set(center[0] + c.x + c.offs[j][0], center[1] + c.y + c.offs[j][1], center[2] + zz - size[2] / 2 + c.offs[j][2]);
			s.scale.set(c.sizes[j], c.sizes[j] * 0.62, 1);
			const dist = s.position.distanceTo(cam.position) - c.sizes[j] * 0.5;
			const nf = Math.min(1, Math.max(0, (dist - fade[0]) / Math.max(1, fade[1] - fade[0])));
			(s.material as THREE.SpriteMaterial).opacity = op * Math.max(0, edge) * 0.92 * nf * nf * (3 - 2 * nf);
		});
	}
	return <primitive object={data.group} />;
};
