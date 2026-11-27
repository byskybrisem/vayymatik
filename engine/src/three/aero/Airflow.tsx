// Aerodinamik akış: gövdenin etrafında kıvrılan akış çizgileri (küre etrafı potansiyel akış yaklaşımı) + ince hava/buz zerreleri.
// Akış -Z yönünde ilerler (nesneye +Z'den gelir). Başka yön için bir `group` içinde döndürün.
// Görsel hız (`speed`, m/sn) gerçek hız değildir; 960 km/sa hissini veren sinematik ölçektir.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {num, NumKey, rng, V3} from '../core/math';
import {glowTexture} from '../core/textures';

export type AirflowProps = {
	count?: number;
	/** akış tüpü yarıçapı */
	radius?: number;
	/** engel (pilot gövdesi) merkezi ve yarıçapı */
	center?: V3;
	obstacle?: number;
	/** tüpün Z aralığı [başlangıç(uzak,+), bitiş(arka,-)] */
	span?: [number, number];
	speed?: number | NumKey[];
	/** çizgi uzunluğu (m) */
	len?: number;
	opacity?: number | NumKey[];
	color?: string;
	seed?: number;
	/** türbülans: engelin arkasında dalgalanma */
	turbulence?: number;
	particles?: number;
};

const streakGeo = new THREE.BoxGeometry(1, 1, 1);

export const Airflow: React.FC<AirflowProps> = ({count = 260, radius = 2.2, center = [0, 0.4, 0], obstacle = 0.55, span = [14, -10], speed = 60, len = 3.2, opacity = 0.7, color = '#d9ecff', seed = 7, turbulence = 1, particles = 140}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const sp = num(frame, speed, 60);
	const op = num(frame, opacity, 0.7);
	const data = useMemo(() => {
		const r = rng(seed);
		const items = Array.from({length: count}, () => {
			const a = r() * Math.PI * 2;
			const rr = Math.sqrt(r()) * radius;
			return {x0: Math.cos(a) * rr, y0: Math.sin(a) * rr, ph: r(), w: 0.006 + r() * 0.012, l: 0.5 + r() * 0.9, b: 0.4 + r() * 0.6, sp: 0.75 + r() * 0.5, tp: r() * 20};
		});
		const mat = new THREE.MeshBasicMaterial({color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 1});
		const im = new THREE.InstancedMesh(streakGeo, mat, count);
		im.frustumCulled = false;
		const col = new THREE.Color();
		items.forEach((it, i) => im.setColorAt(i, col.setScalar(it.b)));
		const pts = new THREE.BufferGeometry();
		pts.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particles * 3), 3));
		const pm = new THREE.PointsMaterial({map: glowTexture(), color: '#ffffff', size: 0.07, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false});
		const P = new THREE.Points(pts, pm);
		P.frustumCulled = false;
		const pitems = Array.from({length: particles}, () => {
			const a = r() * Math.PI * 2;
			const rr = Math.sqrt(r()) * radius * 1.4;
			return {x0: Math.cos(a) * rr, y0: Math.sin(a) * rr, ph: r(), sp: 0.6 + r() * 0.8};
		});
		return {items, im, P, pitems, mat, pm};
	}, [count, radius, color, seed, particles]);
	data.mat.opacity = op;
	data.pm.opacity = Math.min(1, op * 0.8);

	const total = span[0] - span[1];
	const d = new THREE.Object3D();
	const R3 = obstacle * obstacle * obstacle;
	// akış çizgisi: ψ sabit → r² (1 − R³/ρ³) = r0²
	const flow = (x0: number, y0: number, z: number): [number, number] => {
		const r0 = Math.hypot(x0, y0);
		if (r0 < 1e-4) return [x0, y0];
		const zz = z - center[2];
		let r = r0;
		for (let k = 0; k < 4; k++) {
			const rho = Math.sqrt(r * r + zz * zz);
			const f = Math.max(0.02, 1 - R3 / Math.max(rho * rho * rho, 1e-4));
			r = r0 / Math.sqrt(f);
		}
		const s = r / r0;
		return [x0 * s, y0 * s];
	};
	for (let i = 0; i < count; i++) {
		const it = data.items[i];
		const prog = (((it.ph - (t * sp * it.sp) / total) % 1) + 1) % 1;
		const z = span[0] - prog * total;
		const [fx, fy] = flow(it.x0, it.y0, z);
		const [gx, gy] = flow(it.x0, it.y0, z - 0.4);
		const wake = z < center[2] - obstacle * 0.5 ? Math.min(1, (center[2] - z) / 4) * turbulence : 0;
		const jx = Math.sin(t * 9 + it.tp) * 0.09 * wake;
		const jy = Math.cos(t * 7.5 + it.tp) * 0.09 * wake;
		const X = center[0] + fx + jx;
		const Y = center[1] + fy + jy;
		d.position.set(X, Y, z);
		d.lookAt(center[0] + gx + jx, center[1] + gy + jy, z - 0.4);
		const l = len * it.l * (0.6 + 0.4 * Math.min(1, sp / 40));
		d.scale.set(it.w, it.w, l);
		// uçlara doğru görünmez (kenarda soluk)
		const fade = Math.min(1, prog / 0.12, (1 - prog) / 0.12);
		if (fade < 1) d.scale.multiplyScalar(Math.max(0.001, fade));
		d.updateMatrix();
		data.im.setMatrixAt(i, d.matrix);
	}
	data.im.instanceMatrix.needsUpdate = true;
	const pos = (data.P.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
	for (let i = 0; i < particles; i++) {
		const it = data.pitems[i];
		const prog = (((it.ph - (t * sp * it.sp * 1.25) / total) % 1) + 1) % 1;
		const z = span[0] - prog * total;
		const [fx, fy] = flow(it.x0, it.y0, z);
		pos[i * 3] = center[0] + fx;
		pos[i * 3 + 1] = center[1] + fy;
		pos[i * 3 + 2] = z;
	}
	data.P.geometry.attributes.position.needsUpdate = true;
	return (
		<>
			<primitive object={data.im} />
			<primitive object={data.P} />
		</>
	);
};
