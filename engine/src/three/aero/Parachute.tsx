// Paraşüt: turuncu/beyaz dilimli kubbe, askı halatları, açılış animasyonu (`open` 0→1), hafif salınım.
// Kubbe merkezi orijin; halatlar aşağıda `drop` metre altındaki bağlantı noktasında birleşir (pilot orada asılı).
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {num, NumKey} from '../core/math';
import {pbr} from './common';

export type ParachuteProps = {open?: number | NumKey[]; radius?: number; drop?: number; colors?: [string, string]; lines?: number};

export const Parachute: React.FC<ParachuteProps> = ({open = 1, radius = 3.4, drop = 6.6, colors = ['#ff6a14', '#f4f1ea'], lines = 24}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const o = num(frame, open, 1);
	const geo = useMemo(() => {
		let g: THREE.BufferGeometry = new THREE.SphereGeometry(1, 72, 20, 0, Math.PI * 2, 0, Math.PI * 0.5);
		const pos = g.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < pos.count; i++) {
			// dikişler arası hafif şişkinlik
			const ang = Math.atan2(pos.getZ(i), pos.getX(i)) + Math.PI;
			const within = ((ang / (Math.PI * 2)) * lines) % 1;
			const bulge = 1 + Math.sin(within * Math.PI) * 0.035;
			pos.setXYZ(i, pos.getX(i) * bulge, pos.getY(i), pos.getZ(i) * bulge);
		}
		g.computeVertexNormals();
		g = g.toNonIndexed();
		const p2 = g.attributes.position as THREE.BufferAttribute;
		const col = new Float32Array(p2.count * 3);
		const ca = new THREE.Color(colors[0]);
		const cb = new THREE.Color(colors[1]);
		for (let f = 0; f < p2.count; f += 3) {
			const cx = (p2.getX(f) + p2.getX(f + 1) + p2.getX(f + 2)) / 3;
			const cz = (p2.getZ(f) + p2.getZ(f + 1) + p2.getZ(f + 2)) / 3;
			const gore = Math.floor(((Math.atan2(cz, cx) + Math.PI) / (Math.PI * 2)) * lines);
			const c = gore % 2 === 0 ? ca : cb;
			for (let k = 0; k < 3; k++) {
				col[(f + k) * 3] = c.r;
				col[(f + k) * 3 + 1] = c.g;
				col[(f + k) * 3 + 2] = c.b;
			}
		}
		g.setAttribute('color', new THREE.BufferAttribute(col, 3));
		return g;
	}, [colors, lines]);
	const mat = useMemo(() => new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.62, metalness: 0, side: THREE.DoubleSide}), []);
	const cordMat = useMemo(() => pbr('#d8d4c8', {rough: 0.7}), []);
	const t = frame / fps;
	// açılış: önce uzun dar (akıştaki torba), sonra şişip yayılır, hafif aşırı atış
	const e = Math.min(1, Math.max(0, o));
	const infl = 1 - Math.pow(1 - e, 3);
	const over = Math.sin(Math.min(1, e) * Math.PI) * 0.1 * (e > 0.4 ? 1 : 0);
	const rr = radius * (0.12 + 0.88 * infl) * (1 + over * 0.6);
	const hh = radius * (0.95 + (1 - infl) * 1.1);
	const sway = noise2D('sw', frame * 0.012, 0) * 0.05 + Math.sin(t * 0.9) * 0.025;
	const rimY = -0.02 * radius;
	const attachY = rimY - drop;

	// halat örnekleri
	const cords = Array.from({length: lines}, (_, i) => {
		const a = (i / lines) * Math.PI * 2 + Math.PI / lines;
		const A = new THREE.Vector3(Math.cos(a) * rr, rimY, Math.sin(a) * rr);
		const B = new THREE.Vector3(Math.cos(a) * 0.14, attachY, Math.sin(a) * 0.1);
		const mid = A.clone().add(B).multiplyScalar(0.5);
		const dir = B.clone().sub(A);
		const len = dir.length();
		const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
		return {mid, len, q};
	});
	const cordGeo = useMemo(() => new THREE.CylinderGeometry(0.008, 0.008, 1, 5), []);

	return (
		<group rotation={[sway, 0, sway * 0.6]}>
			<mesh geometry={geo} material={mat} scale={[rr, hh * (0.62 + 0.38 * infl) * 0.78, rr]} castShadow receiveShadow />
			{cords.map((c, i) => (
				<mesh key={i} geometry={cordGeo} material={cordMat} position={c.mid} quaternion={c.q} scale={[1, c.len, 1]} />
			))}
		</group>
	);
};
