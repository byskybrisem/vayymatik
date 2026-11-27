// Hava akışı (parçacık izleri) ve toz patlaması. Konumlar kareye bağlı kapalı formüllerle hesaplanır (deterministik).
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {NumKey, num, rng, V3} from '../core/math';
import {glowTexture} from '../core/textures';

const along = (path: V3[], cum: number[], u: number): V3 => {
	const L = cum[cum.length - 1];
	const d = u * L;
	let i = 1;
	while (i < cum.length - 1 && cum[i] < d) i++;
	const a = path[i - 1];
	const b = path[i];
	const k = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
	return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};

/** Yollar boyunca akan parçacıklar. paths: [[x,y,z],...][]; speed: yol/sn; spread: yanal dağılım (m). */
export const Airflow: React.FC<{paths: V3[][]; count?: number; speed?: number; color?: string; size?: number; opacity?: number | NumKey[]; spread?: number; seed?: number; trail?: number}> = ({
	paths,
	count = 160,
	speed = 0.22,
	color = '#bfe6ff',
	size = 0.22,
	opacity = 0.85,
	spread = 0.25,
	seed = 5,
	trail = 3,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const o = num(frame, opacity as number | NumKey[], 0.85);
	const cums = useMemo(
		() =>
			paths.map((p) => {
				const c = [0];
				for (let i = 1; i < p.length; i++) c.push(c[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]));
				return c;
			}),
		[paths],
	);
	const total = count * trail;
	const pts = useMemo(() => {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
		g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
		const m = new THREE.PointsMaterial({map: glowTexture(), size, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false});
		const p = new THREE.Points(g, m);
		p.frustumCulled = false;
		return p;
	}, [total, size]);
	(pts.material as THREE.PointsMaterial).opacity = o;
	const pa = (pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
	const ca = (pts.geometry.attributes.color as THREE.BufferAttribute).array as Float32Array;
	const base = new THREE.Color(color);
	const r = rng(seed);
	const t = frame / fps;
	for (let i = 0; i < count; i++) {
		const pi = Math.floor(r() * paths.length);
		const ph = r();
		const sp = 0.7 + r() * 0.6;
		const ox = (r() - 0.5) * spread;
		const oy = (r() - 0.5) * spread;
		const oz = (r() - 0.5) * spread;
		const L = cums[pi][cums[pi].length - 1];
		const sU = (speed * sp) / Math.max(1, L / 10);
		for (let k = 0; k < trail; k++) {
			const u = (((ph + t * sU - k * 0.012) % 1) + 1) % 1;
			const q = along(paths[pi], cums[pi], u);
			const w = 0.5 + 0.5 * Math.sin(t * 2 + ph * 20);
			const j = (i * trail + k) * 3;
			pa[j] = q[0] + ox + Math.sin(t * 1.3 + ph * 9) * 0.05 * w;
			pa[j + 1] = q[1] + oy;
			pa[j + 2] = q[2] + oz;
			const f = (1 - k / trail) * Math.min(1, u * 8) * Math.min(1, (1 - u) * 8);
			ca[j] = base.r * f;
			ca[j + 1] = base.g * f;
			ca[j + 2] = base.b * f;
		}
	}
	pts.geometry.attributes.position.needsUpdate = true;
	pts.geometry.attributes.color.needsUpdate = true;
	return <primitive object={pts} />;
};

/** Tek seferlik toz/kırıntı patlaması: from karesinde başlar, life kare sürer. Merkez = nesne konumu. */
export const Burst: React.FC<{from?: number; life?: number; count?: number; speed?: number; color?: string; size?: number; seed?: number; up?: number; spread?: V3}> = ({
	from = 0,
	life = 60,
	count = 90,
	speed = 2.4,
	color = '#cdb894',
	size = 0.5,
	seed = 3,
	up = 0.9,
	spread = [1, 0.5, 1],
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const pts = useMemo(() => {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
		const m = new THREE.PointsMaterial({map: glowTexture(), color, size, sizeAttenuation: true, transparent: true, depthWrite: false, opacity: 0});
		const p = new THREE.Points(g, m);
		p.frustumCulled = false;
		return p;
	}, [count, color, size]);
	const f = frame - from;
	const k = f / life;
	const mat = pts.material as THREE.PointsMaterial;
	if (f < 0 || k > 1) {
		mat.opacity = 0;
		return <primitive object={pts} />;
	}
	mat.opacity = 0.7 * (1 - k) * Math.min(1, f / 3);
	mat.size = size * (0.6 + k * 1.8);
	const arr = (pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
	const r = rng(seed);
	const t = f / fps;
	for (let i = 0; i < count; i++) {
		const a = r() * Math.PI * 2;
		const e = r();
		const sp = speed * (0.35 + r() * 0.9);
		const drag = 3.2;
		const dist = (sp * (1 - Math.exp(-t * drag))) / drag;
		arr[i * 3] = Math.cos(a) * dist * spread[0] * (0.4 + e);
		arr[i * 3 + 1] = Math.abs(Math.sin(a * 2 + e * 7)) * dist * spread[1] + up * (1 - Math.exp(-t * 1.4)) * (0.2 + r() * 0.8) * 0.6;
		arr[i * 3 + 2] = Math.sin(a) * dist * spread[2] * (0.4 + e);
	}
	pts.geometry.attributes.position.needsUpdate = true;
	return <primitive object={pts} />;
};
