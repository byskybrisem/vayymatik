// Asansör sistemi (özgün, koddan): kabin, çoklu çelik halat, karşı ağırlık, raylar, çekiş kasnağı, hız regülatörü,
// güvenlik freni (kama), tampon, kıvılcım ve parlama efektleri. Her şey useCurrentFrame ile sürülür.
// JSON: {"kind":"elevator","cabY":[{t,v}],"cut":{"at":1.9,"ropes":[0,1,2,3,4,5]},"brake":{"at":3,"dur":0.4},"walls":0.2,...}
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp01} from '../../lib/anim';
import {glowTexture} from '../core/textures';
import {num, NumKey, rng, smooth, V3} from '../core/math';

const R = 0.9; // çekiş kasnağı yarıçapı → kabin x=0, karşı ağırlık x=2R
const CAB_ATTACH = 2.64; // kabin tabanından halat bağlantısına yükseklik
const CW_ATTACH = 3.45;
const ROPE_Z = (i: number, n: number) => (n === 1 ? 0 : (i / (n - 1) - 0.5) * 1.0);

const geo = new Map<string, THREE.BufferGeometry>();
const G = (key: string, make: () => THREE.BufferGeometry) => {
	let g = geo.get(key);
	if (!g) {
		g = make();
		geo.set(key, g);
	}
	return g;
};
const box = (w: number, h: number, d: number) => G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (r: number, h: number, s = 16) => G(`c${r},${h},${s}`, () => new THREE.CylinderGeometry(r, r, h, s));

const M = (color: string, rough = 0.45, metal = 0.55, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
	const k = JSON.stringify([color, rough, metal, extra]);
	let m = mats.get(k);
	if (!m) {
		m = new THREE.MeshStandardMaterial({color, roughness: rough, metalness: metal, flatShading: false, ...extra});
		mats.set(k, m);
	}
	return m;
};
const mats = new Map<string, THREE.MeshStandardMaterial>();
const glowMat = (color: string, k = 1) => {
	const key = `g${color}${k}`;
	let m = glows.get(key);
	if (!m) {
		m = new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(k), toneMapped: false});
		glows.set(key, m);
	}
	return m;
};
const glows = new Map<string, THREE.MeshBasicMaterial>();

const STEEL = '#8d99a8';
const DARK = '#1c222c';
const ACC = '#37d0ff';

const plaqueTex = (n: number) => {
	const c = document.createElement('canvas');
	c.width = 128;
	c.height = 128;
	const x = c.getContext('2d') as CanvasRenderingContext2D;
	x.fillStyle = '#0b1522';
	x.fillRect(0, 0, 128, 128);
	x.strokeStyle = '#37d0ff';
	x.lineWidth = 6;
	x.strokeRect(6, 6, 116, 116);
	x.fillStyle = '#d8f4ff';
	x.font = '900 78px Montserrat, Arial, sans-serif';
	x.textAlign = 'center';
	x.textBaseline = 'middle';
	x.fillText(String(n), 64, 70);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
};
const plaques = new Map<number, THREE.MeshBasicMaterial>();
const plaque = (n: number) => {
	let m = plaques.get(n);
	if (!m) {
		m = new THREE.MeshBasicMaterial({map: plaqueTex(n), toneMapped: false});
		plaques.set(n, m);
	}
	return m;
};

export type ElevatorProps = {
	/** Kabin tabanı yüksekliği (m) */
	cabY?: number | NumKey[];
	/** Karşı ağırlık tabanı (varsayılan 24 - cabY) */
	cwY?: number | NumKey[];
	/** Çekiş kasnağı ekseni yüksekliği */
	H?: number;
	ropes?: number;
	/** Halat titreşimi 0–1 */
	tension?: number | NumKey[];
	/** Halat kopması: at (sn→kare), ropes: kopan halat indeksleri (varsayılan hepsi) */
	cut?: {at: number; ropes?: number[]};
	/** Güvenlik freni: at, dur */
	brake?: {at: number; dur?: number};
	/** Vurgulanan (kırmızı) halatlar */
	hi?: number[];
	/** Duvar opaklığı 0–1 (kesit görünümü için düşük) */
	walls?: number | NumKey[];
	/** Kabin iç ışığı 0–1.5 */
	light?: number | NumKey[];
	/** Kırmızı alarm vurgusu 0–1 */
	alert?: number | NumKey[];
	/** Vurgu rengi (kabin şeritleri) */
	accent?: string;
	/** Kabini gizle/göster */
	showCab?: boolean;
	/** Rayları vurgula 0–1 */
	railGlow?: number | NumKey[];
	/** Halatları sırayla vurgula (yük paylaşımı) */
	chase?: boolean;
	/** Karşı ağırlık vurgusu 0–1 */
	cwGlow?: number | NumKey[];
};

export const Elevator: React.FC<ElevatorProps> = ({cabY = 6, cwY, H = 30, ropes = 6, tension = 0.4, cut, brake, hi = [], walls = 0.35, light = 1, alert = 0, accent = ACC, showCab = true, railGlow = 0, chase = false, cwGlow = 0}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const cab = num(frame, cabY, 6);
	const cabPrev = num(frame - 1, cabY, 6);
	const speed = Math.max(0, (cabPrev - cab) * fps); // aşağı hız (m/s)
	const lightK = num(frame, light, 1);
	const alertK = num(frame, alert, 0);
	const wallK = num(frame, walls, 0.35);
	const rg = num(frame, railGlow, 0);
	const tens = num(frame, tension, 0.4);
	const cwG = num(frame, cwGlow, 0);
	const hiIdx = chase ? [Math.floor(frame / 5) % ropes] : hi;
	const cutF = cut?.at ?? Infinity;
	const cutSet = useMemo(() => new Set(cut?.ropes ?? Array.from({length: ropes}, (_, i) => i)), [cut, ropes]);
	// tüm halatlar koptuysa karşı ağırlık kopma anındaki yerinde kalır
	const cwBase = cwY === undefined ? 24 - num(cutSet.size >= ropes ? Math.min(frame, cutF) : frame, cabY, 6) : num(frame, cwY, 24 - cab);
	const brakeK = brake ? clamp01((frame - brake.at) / Math.max(1, brake.dur ?? 10)) : 0;
	const pulse = 0.5 + 0.5 * Math.sin(frame * 0.5);
	const top = H + R + 1.0; // tavan
	const floors = Math.floor(top / 3);

	// --- halatlar (instanced silindir parçaları) ---
	const ropeMeshes = useMemo(() => {
		const g = cyl(0.014, 1, 6);
		const normal = new THREE.InstancedMesh(g, M('#aab4c0', 0.35, 0.8), ropes * 34);
		const hot = new THREE.InstancedMesh(g, M('#ff4a3a', 0.4, 0.3, {emissive: '#ff1a10', emissiveIntensity: 0.9}), ropes * 34);
		normal.frustumCulled = false;
		hot.frustumCulled = false;
		normal.castShadow = true;
		return {normal, hot};
	}, [ropes]);
	const {normal, hot} = ropeMeshes;
	(hot.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + 0.9 * pulse;
	const dummy = useMemo(() => new THREE.Object3D(), []);
	const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
	const va = useMemo(() => new THREE.Vector3(), []);
	const vb = useMemo(() => new THREE.Vector3(), []);
	const dir = useMemo(() => new THREE.Vector3(), []);
	let nN = 0;
	let nH = 0;
	const pushPoly = (pts: V3[], isHot: boolean) => {
		const mesh = isHot ? hot : normal;
		for (let j = 0; j < pts.length - 1; j++) {
			va.set(...pts[j]);
			vb.set(...pts[j + 1]);
			dir.subVectors(vb, va);
			const len = dir.length();
			if (len < 1e-5) continue;
			dummy.position.copy(va).addScaledVector(dir, 0.5);
			dummy.quaternion.setFromUnitVectors(up, dir.normalize());
			dummy.scale.set(1, len, 1);
			dummy.updateMatrix();
			mesh.setMatrixAt(isHot ? nH++ : nN++, dummy.matrix);
		}
	};
	const yc = cab + CAB_ATTACH;
	const yw = cwBase + CW_ATTACH;
	const tc = Math.max(0, (frame - cutF) / fps);
	const yCutWorld = Number.isFinite(cutF) ? num(cutF, cabY, 6) + CAB_ATTACH + 1.1 : yc;
	for (let i = 0; i < ropes; i++) {
		const z = ROPE_Z(i, ropes);
		const isCut = frame >= cutF && cutSet.has(i);
		const h = hiIdx.includes(i);
		const wob = (y: number, amp: number) => amp * Math.sin(frame * 1.3 + i * 1.7 + y * 0.35);
		const arc: V3[] = [];
		for (let k = 0; k <= 10; k++) {
			const a = Math.PI - (k / 10) * Math.PI;
			arc.push([R + R * Math.cos(a), H + R * Math.sin(a), z]);
		}
		const vert = (x: number, y0: number, y1: number, n: number, amp: number, free = false, tt = 0): V3[] => {
			const o: V3[] = [];
			for (let k = 0; k <= n; k++) {
				const s = k / n;
				const y = y0 + (y1 - y0) * s;
				let dx = wob(y, amp * 0.012 * Math.sin(Math.PI * s));
				let dz = 0;
				if (free) {
					const u = 1 - s; // serbest uca doğru
					const A = 0.42 * Math.exp(-1.1 * tt) * u * u;
					dx += A * Math.sin(7 * tt - 3.2 * u + i);
					dz += A * 0.6 * Math.cos(6 * tt - 2.5 * u + i * 2);
				}
				o.push([x + dx, y, z + dz]);
			}
			return o;
		};
		if (!isCut) {
			pushPoly([...vert(0, yc, H, 6, tens), ...arc, ...vert(2 * R, H, yw, 6, tens)], h);
		} else {
			// karşı ağırlık tarafı + kasnak + kabin tarafında serbest sarkan uç
			pushPoly([...vert(2 * R, yw, H, 6, tens * 0.3), ...arc.slice().reverse(), ...vert(0, H, yCutWorld, 8, 0, true, tc)], h);
			// kabin üstünde kalan kısa kopuk uç (kabinle birlikte çırpınır)
			const tail: V3[] = [];
			for (let k = 0; k <= 8; k++) {
				const s = k / 8;
				const amp = (0.1 + Math.min(0.5, speed * 0.02)) * Math.pow(s, 1.4);
				tail.push([amp * Math.sin(frame * 0.85 - 4 * s + i * 1.3), yc + s * 1.1, z + amp * 0.7 * Math.cos(frame * 0.7 - 3 * s + i)]);
			}
			pushPoly(tail, h);
		}
	}
	normal.count = nN;
	hot.count = nH;
	normal.instanceMatrix.needsUpdate = true;
	hot.instanceMatrix.needsUpdate = true;

	// --- şeffaf duvar malzemeleri ---
	const wallMat = useMemo(() => new THREE.MeshStandardMaterial({color: '#18202c', roughness: 0.85, metalness: 0.1, transparent: true, depthWrite: false}), []);
	wallMat.opacity = wallK;
	wallMat.visible = wallK > 0.01;
	const backMat = useMemo(() => new THREE.MeshStandardMaterial({color: '#202a38', roughness: 0.9, metalness: 0.05, transparent: true}), []);
	backMat.opacity = Math.min(1, wallK * 1.8);

	// --- kasnak / regülatör dönüşü ---
	const sheaveAng = -cab / R;
	const lockF = brake ? brake.at : Infinity;
	const govAng = -num(Math.min(frame, lockF), cabY, 6) / 0.3;
	const flyR = 0.1 + 0.11 * clamp01(speed / 7) + 0.03 * brakeK;
	const cabEmis = 0.6 * lightK;

	return (
		<group>
			{/* ---- kabuk: şaft duvarları ---- */}
			<mesh geometry={box(0.1, top + 1.4, 2.5)} material={wallMat} position={[-1.55, (top - 1.4) / 2, 0]} />
			<mesh geometry={box(0.1, top + 1.4, 2.5)} material={wallMat} position={[3.15, (top - 1.4) / 2, 0]} />
			<mesh geometry={box(4.8, top + 1.4, 0.1)} material={backMat} position={[0.8, (top - 1.4) / 2, -1.25]} receiveShadow />
			<mesh geometry={box(4.8, 0.2, 2.6)} material={M('#10151d', 0.8, 0.2)} position={[0.8, -1.3, 0]} receiveShadow />
			<mesh geometry={box(4.8, 0.18, 2.6)} material={M('#10151d', 0.8, 0.2)} position={[0.8, top, 0]} />
			{/* kat plakaları + numaralar */}
			{Array.from({length: floors}, (_, k) => (
				<group key={k} position={[0, k * 3, 0]}>
					<mesh geometry={box(4.6, 0.025, 0.04)} material={glowMat(accent, 0.55)} position={[0.8, 0, -1.19]} />
					<mesh geometry={box(0.34, 0.34, 0.02)} material={plaque(k)} position={[2.75, 0.5, -1.18]} />
				</group>
			))}

			{/* ---- raylar (kabin + karşı ağırlık) ---- */}
			{[-0.98, 0.98, 2 * R - 0.42, 2 * R + 0.42].map((x, i) => (
				<group key={i} position={[x, (top - 1.3) / 2, 0]}>
					<mesh geometry={box(0.075, top + 1.3, 0.12)} material={M('#aeb8c4', 0.3, 0.75, rg > 0 ? {emissive: accent, emissiveIntensity: rg * 0.9} : {})} castShadow />
					<mesh geometry={box(0.035, top + 1.3, 0.06)} material={M('#d9e1ea', 0.25, 0.8, rg > 0 ? {emissive: accent, emissiveIntensity: rg * 1.4} : {})} position={[0, 0, 0.07]} />
				</group>
			))}
			{/* ray braketleri */}
			{Array.from({length: Math.floor(top / 2.5)}, (_, k) => (
				<group key={k} position={[0, k * 2.5 + 0.8, -0.58]}>
					<mesh geometry={box(0.7, 0.05, 0.05)} material={M(DARK, 0.5, 0.6)} position={[-1.3, 0, 0]} />
					<mesh geometry={box(0.7, 0.05, 0.05)} material={M(DARK, 0.5, 0.6)} position={[1.3, 0, 0]} />
				</group>
			))}

			{/* ---- çekiş kasnağı, motor, regülatör ---- */}
			<group position={[R, H, 0]}>
				<mesh geometry={cyl(R, 1.25, 40)} material={M('#2c343f', 0.4, 0.7)} rotation={[Math.PI / 2, 0, 0]} castShadow />
				{Array.from({length: ropes}, (_, i) => (
					<mesh key={i} geometry={cyl(R + 0.025, 0.05, 40)} material={M('#cfd8e2', 0.3, 0.85)} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, ROPE_Z(i, ropes)]} />
				))}
				<group rotation={[0, 0, sheaveAng]}>
					{[0, 1, 2, 3, 4, 5].map((k) => (
						<mesh key={k} geometry={box(0.09, R * 1.7, 0.03)} material={M('#ff9a2e', 0.4, 0.5, {emissive: '#ff6a00', emissiveIntensity: 0.35})} position={[0, 0, 0.64]} rotation={[0, 0, (k * Math.PI) / 6]} />
					))}
				</group>
				<mesh geometry={cyl(0.12, 1.6, 12)} material={M('#aeb8c4', 0.3, 0.8)} rotation={[Math.PI / 2, 0, 0]} />
				<mesh geometry={cyl(0.38, 0.55, 20)} material={M('#252c36', 0.5, 0.6)} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -1.0]} />
				<mesh geometry={box(1.9, 0.12, 0.2)} material={M(DARK, 0.5, 0.6)} position={[0, -R - 0.05, -0.62]} />
			</group>
			{/* hız regülatörü */}
			<group position={[-1.12, H + 0.25, 0.9]}>
				<mesh geometry={cyl(0.3, 0.1, 28)} material={M('#2c343f', 0.4, 0.7)} rotation={[Math.PI / 2, 0, 0]} />
				<mesh geometry={G('govrim', () => new THREE.TorusGeometry(0.3, 0.03, 8, 36))} material={M('#e5ebf2', 0.25, 0.85)} position={[0, 0, 0.0]} />
				<mesh geometry={cyl(0.07, 0.2, 12)} material={M('#cfd8e2', 0.3, 0.8)} rotation={[Math.PI / 2, 0, 0]} />
				<group rotation={[0, 0, govAng]}>
					{[0, 1, 2].map((k) => (
						<mesh key={k} geometry={box(0.6, 0.025, 0.02)} material={M('#8d99a8', 0.4, 0.7)} position={[0, 0, 0.056]} rotation={[0, 0, (k * Math.PI) / 3]} />
					))}
					{[0, 1].map((k) => (
						<group key={k} rotation={[0, 0, k * Math.PI]}>
							<mesh geometry={box(flyR, 0.03, 0.04)} material={M('#cfd8e2', 0.3, 0.8)} position={[flyR / 2, 0, 0.07]} />
							<mesh geometry={new THREE.SphereGeometry(0.055, 12, 10)} material={M(brakeK > 0 ? '#ff5a2a' : '#ffc83d', 0.35, 0.5, {emissive: brakeK > 0 ? '#ff2a00' : '#664400', emissiveIntensity: 0.6})} position={[flyR, 0, 0.07]} />
						</group>
					))}
				</group>
				<mesh geometry={box(0.2, 0.14, 0.1)} material={glowMat(brakeK > 0 ? '#ff2a1a' : '#26d07c', 1.4)} position={[0, 0.5, 0.04]} />
				<mesh geometry={box(0.26, 0.2, 0.08)} material={M('#10151d', 0.5, 0.5)} position={[0, 0.5, 0.0]} />
				<mesh geometry={cyl(0.012, H + 1.2, 6)} material={M('#8f9aa7', 0.4, 0.8)} position={[0.3, -(H + 0.25) / 2 + 0.1, 0]} scale={[1, 1, 1]} />
				<mesh geometry={cyl(0.012, H + 1.2, 6)} material={M('#8f9aa7', 0.4, 0.8)} position={[-0.3, -(H + 0.25) / 2 + 0.1, 0]} />
			</group>

			{/* ---- ropes ---- */}
			<primitive object={normal} />
			<primitive object={hot} />

			{/* ---- karşı ağırlık ---- */}
			<group position={[2 * R, cwBase, 0]}>
				{Array.from({length: 13}, (_, k) => (
					<mesh key={k} geometry={box(0.62, 0.2, 1.1)} material={M(k % 2 ? '#4a525e' : '#555e6b', 0.7, 0.35, cwG > 0 ? {emissive: accent, emissiveIntensity: cwG * 0.04} : {})} position={[0, 0.15 + k * 0.215, 0]} castShadow receiveShadow />
				))}
				{[-0.36, 0.36].map((x) => (
					<mesh key={x} geometry={box(0.06, 3.2, 1.25)} material={M('#3b4350', 0.4, 0.7, cwG > 0 ? {emissive: accent, emissiveIntensity: cwG * 1.2} : {})} position={[x, 1.6, 0]} castShadow />
				))}
				<mesh geometry={box(0.9, 0.12, 1.3)} material={M('#cfd8e2', 0.3, 0.75)} position={[0, 3.25, 0]} castShadow />
				<mesh geometry={box(0.9, 0.1, 1.3)} material={M('#cfd8e2', 0.3, 0.75)} position={[0, 0.0, 0]} />
				<mesh geometry={box(0.5, 0.35, 0.02)} material={M('#ffc83d', 0.5, 0.3, {emissive: '#6a4a00', emissiveIntensity: 0.4})} position={[0, 1.6, 0.64]} />
			</group>

			{/* ---- kabin ---- */}
			{showCab ? (
				<group position={[0, cab, 0]}>
					{/* taban + emniyet kirişi */}
					<mesh geometry={box(1.5, 0.12, 1.6)} material={M('#222a35', 0.45, 0.6)} position={[0, 0.06, 0]} castShadow receiveShadow />
					<mesh geometry={box(1.95, 0.2, 0.34)} material={M('#2a323e', 0.4, 0.7)} position={[0, -0.14, 0]} castShadow />
					<mesh geometry={box(1.96, 0.04, 0.35)} material={M('#ffc83d', 0.5, 0.3, {emissive: '#7a5600', emissiveIntensity: 0.5})} position={[0, -0.01, 0]} />
					{/* yan + arka paneller */}
					<mesh geometry={box(0.05, 2.3, 1.6)} material={M('#aeb8c4', 0.35, 0.6, {emissive: accent, emissiveIntensity: 0.05})} position={[-0.74, 1.2, 0]} castShadow />
					<mesh geometry={box(0.05, 2.3, 1.6)} material={M('#aeb8c4', 0.35, 0.6, {emissive: accent, emissiveIntensity: 0.05})} position={[0.74, 1.2, 0]} castShadow />
					<mesh geometry={box(1.5, 2.3, 0.05)} material={M('#c7ced6', 0.4, 0.5, {emissive: '#ffe6b8', emissiveIntensity: cabEmis * 0.35})} position={[0, 1.2, -0.78]} />
					{/* tavan + aydınlatma */}
					<mesh geometry={box(1.5, 0.08, 1.6)} material={M('#aeb8c4', 0.4, 0.6)} position={[0, 2.36, 0]} />
					<mesh geometry={box(1.1, 0.01, 1.15)} material={glowMat('#fff2d8', 0.2 + 1.3 * lightK)} position={[0, 2.31, 0.02]} />
					{/* ön cam kapı */}
					<mesh geometry={box(1.42, 2.25, 0.02)} material={M('#9fd4ff', 0.05, 0.1, {transparent: true, opacity: 0.2, depthWrite: false})} position={[0, 1.2, 0.8]} />
					<mesh geometry={box(0.03, 2.25, 0.04)} material={M('#cfd8e2', 0.3, 0.8)} position={[0, 1.2, 0.81]} />
					<mesh geometry={box(1.5, 0.05, 0.05)} material={M('#cfd8e2', 0.3, 0.8)} position={[0, 0.2, 0.81]} />
					<mesh geometry={box(1.5, 0.05, 0.05)} material={M('#cfd8e2', 0.3, 0.8)} position={[0, 2.32, 0.81]} />
					{/* iç: tutamak + kat göstergesi */}
					<mesh geometry={box(1.3, 0.04, 0.04)} material={M('#e5ebf2', 0.2, 0.9)} position={[0, 0.95, -0.7]} />
					<mesh geometry={box(0.3, 0.1, 0.02)} material={glowMat(alertK > 0.2 ? '#ff2a1a' : accent, 1.3)} position={[0, 2.18, 0.76]} />
					{/* köşe direkleri + vurgu şeritleri */}
					{[-1, 1].map((sx) =>
						[-1, 1].map((sz) => (
							<mesh key={`${sx}${sz}`} geometry={box(0.07, 2.8, 0.07)} material={M('#313a47', 0.4, 0.7)} position={[sx * 0.83, 1.25, sz * 0.86]} castShadow />
						)),
					)}
					{[-1, 1].map((sx) => (
						<mesh key={sx} geometry={box(0.02, 2.2, 0.02)} material={glowMat(alertK > 0.2 ? '#ff3a28' : accent, 0.5 + 0.9 * (alertK > 0.2 ? pulse : 1))} position={[sx * 0.865, 1.2, 0.9]} />
					))}
					{/* tepe: çapraz kiriş + halat bağlantıları */}
					<mesh geometry={box(1.8, 0.14, 1.9)} material={M('#313a47', 0.4, 0.7)} position={[0, 2.5, 0]} castShadow />
					<mesh geometry={box(1.3, 0.1, 0.62)} material={M('#cfd8e2', 0.3, 0.8)} position={[0, 2.6, 0]} />
					{Array.from({length: ropes}, (_, i) => (
						<mesh key={i} geometry={cyl(0.04, 0.12, 8)} material={M('#ffc83d', 0.4, 0.5)} position={[0, 2.62, ROPE_Z(i, ropes)]} />
					))}
					{/* güvenlik freni: gövde + sıkıştıran kamalar */}
					{[-1, 1].map((sx) => (
						<group key={sx} position={[sx * 0.98, 0.0, 0]}>
							<mesh geometry={box(0.34, 0.26, 0.22)} material={M('#2a323e', 0.45, 0.7)} position={[0, -0.14, 0]} castShadow />
							{[-1, 1].map((s2) => (
								<mesh
									key={s2}
									geometry={box(0.075, 0.56, 0.34)}
									material={M(brakeK > 0 ? '#ff8a30' : '#c7ced6', 0.35, 0.7, {emissive: brakeK > 0 ? '#ff5a00' : '#000000', emissiveIntensity: brakeK * 2.2})}
									position={[s2 * (0.062 + 0.06 * (1 - brakeK)), 0.04, 0.02]}
									castShadow
								/>
							))}
							{brakeK > 0 ? <mesh geometry={box(0.3, 0.05, 0.4)} material={glowMat('#ff9a40', 1.1 + 0.8 * pulse)} position={[0, 0.34, 0.02]} /> : null}
						</group>
					))}
				</group>
			) : null}

			{/* ---- çukur: tamponlar ---- */}
			{[0, 2 * R].map((x) => (
				<group key={x} position={[x, -1.2, 0]}>
					<mesh geometry={cyl(0.22, 0.55, 14)} material={M('#ffc83d', 0.5, 0.4)} position={[0, 0.3, 0.35]} />
					<mesh geometry={cyl(0.22, 0.55, 14)} material={M('#ffc83d', 0.5, 0.4)} position={[0, 0.3, -0.35]} />
					<mesh geometry={cyl(0.08, 0.7, 10)} material={M('#aeb8c4', 0.3, 0.8)} position={[0, 0.35, 0.35]} />
					<mesh geometry={cyl(0.08, 0.7, 10)} material={M('#aeb8c4', 0.3, 0.8)} position={[0, 0.35, -0.35]} />
				</group>
			))}
			{/* alarm ışığı efekti */}
			{alertK > 0.01 ? <mesh geometry={box(4.4, top, 0.02)} material={new THREE.MeshBasicMaterial({color: '#ff1a10', transparent: true, opacity: alertK * 0.09 * (0.6 + 0.4 * pulse), depthWrite: false, toneMapped: false})} position={[0.8, top / 2, 1.2]} /> : null}
		</group>
	);
};

/** Kıvılcım bulutu: from/dur kare; pos başlangıç, followY ile (örn. kabin) yükseklik takibi, g yerçekimi */
export const Sparks: React.FC<{from?: number; dur?: number; count?: number; pos?: V3; followY?: number | NumKey[]; v?: V3; spread?: number; g?: number; life?: number; color?: string; size?: number; seed?: number}> = ({from = 0, dur = 60, count = 90, pos = [0, 0, 0], followY, v = [0.6, -1.2, 0], spread = 1.2, g = 6, life = 0.7, color = '#ffb347', size = 0.07, seed = 5}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const pts = useMemo(() => {
		const geom = new THREE.BufferGeometry();
		geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
		const m = new THREE.PointsMaterial({map: glowTexture(), color, size, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false});
		const p = new THREE.Points(geom, m);
		p.frustumCulled = false;
		return p;
	}, [count, color, size]);
	const arr = (pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
	const r = rng(seed);
	const active = frame >= from && frame <= from + dur + life * fps;
	(pts.material as THREE.PointsMaterial).opacity = active ? 1 : 0;
	for (let i = 0; i < count; i++) {
		const te = from + r() * dur; // doğma karesi
		const sx = (r() - 0.5) * spread;
		const sy = (r() - 0.5) * spread * 0.6;
		const sz = (r() - 0.5) * spread;
		const ag = (frame - te) / fps;
		if (ag < 0 || ag > life) {
			arr[i * 3] = 0;
			arr[i * 3 + 1] = -999;
			arr[i * 3 + 2] = 0;
			continue;
		}
		const base = followY === undefined ? 0 : num(te, followY, 0);
		arr[i * 3] = pos[0] + (v[0] + sx) * ag;
		arr[i * 3 + 1] = pos[1] + base + (v[1] + sy) * ag - 0.5 * g * ag * ag;
		arr[i * 3 + 2] = pos[2] + (v[2] + sz) * ag;
	}
	pts.geometry.attributes.position.needsUpdate = true;
	return <primitive object={pts} />;
};

/** Parlama patlaması (kamera yönüne bakan ışık küresi): from/dur kare */
export const GlowBurst: React.FC<{from?: number; dur?: number; pos?: V3; size?: number; color?: string; followY?: number | NumKey[]}> = ({from = 0, dur = 14, pos = [0, 0, 0], size = 3, color = '#ffd9a0', followY}) => {
	const frame = useCurrentFrame();
	const f = frame - from;
	const mat = useMemo(() => new THREE.SpriteMaterial({map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false}), [color]);
	if (f < 0 || f > dur) return null;
	const k = f / dur;
	mat.opacity = (1 - smooth(k)) * 1.0;
	const s = size * (0.35 + 0.9 * (1 - (1 - k) * (1 - k)));
	const y = pos[1] + (followY === undefined ? 0 : num(from, followY, 0));
	return <sprite material={mat} position={[pos[0], y, pos[2]]} scale={[s, s, s]} />;
};

/** Hız çizgileri: dünyaya sabit dikey çizgiler; kabin hızına göre uzar (düşüşte kamera takibinde "hız" hissi) */
export const SpeedStreaks: React.FC<{cabY: number | NumKey[]; count?: number; height?: number; area?: V3; color?: string; gain?: number; seed?: number}> = ({cabY, count = 120, height = 30, area = [3.6, 0, 1.8], color = '#9fd6ff', gain = 0.075, seed = 9}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const mesh = useMemo(() => {
		const m = new THREE.InstancedMesh(box(0.012, 1, 0.012), new THREE.MeshBasicMaterial({color, transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false}), count);
		m.frustumCulled = false;
		return m;
	}, [count, color]);
	const speed = Math.max(0, (num(frame - 1, cabY, 0) - num(frame, cabY, 0)) * fps);
	const cy = num(frame, cabY, 0);
	const r = rng(seed);
	const d = new THREE.Object3D();
	for (let i = 0; i < count; i++) {
		const x = -1.2 + r() * area[0];
		const z = -1.1 + r() * area[2] * 1.3;
		const y0 = r() * height;
		const len = 0.15 + speed * gain * (0.4 + r());
		// dünyaya sabit; yalnız kabin çevresinde görünür (kamera takibinde hız hissi)
		const near = Math.abs(y0 - cy) < 9;
		d.position.set(x, speed < 1.5 || !near ? -999 : y0, z);
		d.scale.set(1, len, 1);
		d.updateMatrix();
		mesh.setMatrixAt(i, d.matrix);
	}
	mesh.instanceMatrix.needsUpdate = true;
	return <primitive object={mesh} />;
};

/** Billboard metin etiketi (3D sahne içinde, kameraya bakar): canvas dokusu */
const labelTex = new Map<string, THREE.CanvasTexture>();
export const Label3D: React.FC<{text: string; color?: string; w?: number; h?: number; sub?: string}> = ({text, color = '#ffffff', w = 4, h = 1, sub}) => {
	const frame = useCurrentFrame();
	const key = `${text}|${color}|${sub ?? ''}`;
	let tex = labelTex.get(key);
	if (!tex) {
		const c = document.createElement('canvas');
		c.width = 1024;
		c.height = Math.round(1024 * (h / w));
		const x = c.getContext('2d') as CanvasRenderingContext2D;
		x.fillStyle = 'rgba(5,9,18,0.78)';
		const r = 36;
		x.beginPath();
		x.roundRect(8, 8, c.width - 16, c.height - 16, r);
		x.fill();
		x.strokeStyle = color;
		x.lineWidth = 8;
		x.stroke();
		x.fillStyle = color;
		x.font = '900 ' + Math.round(c.height * (sub ? 0.42 : 0.52)) + 'px Anton, Montserrat, Arial, sans-serif';
		x.textAlign = 'center';
		x.textBaseline = 'middle';
		x.fillText(text, c.width / 2, c.height * (sub ? 0.38 : 0.52));
		if (sub) {
			x.fillStyle = '#d8e6f5';
			x.font = '700 ' + Math.round(c.height * 0.2) + 'px Montserrat, Arial, sans-serif';
			x.fillText(sub, c.width / 2, c.height * 0.75);
		}
		tex = new THREE.CanvasTexture(c);
		tex.colorSpace = THREE.SRGBColorSpace;
		labelTex.set(key, tex);
	}
	const m = useMemo(() => new THREE.SpriteMaterial({map: tex, transparent: true, toneMapped: false, depthWrite: false}), [tex]);
	m.opacity = Math.min(1, frame / 6);
	return <sprite material={m} scale={[w, h, 1]} />;
};
