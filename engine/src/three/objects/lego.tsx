// Fotogerçekçi plastik tuğla nesneleri (özgün prosedürel geometri; marka logosu yok).
// Kare bazlı, deterministik: yalnızca useCurrentFrame + tohumlu rng. Tüm zamanlar KARE cinsinden (Python hattı saniyeyi çevirir).
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {clamp01} from '../../lib/anim';
import {easeFn, num, NumKey, rng} from '../core/math';

const U = 0.1; // stud aralığı
const H = 0.12; // tuğla gövde yüksekliği
export const BRICK_COLORS = ['#C91A09', '#F2CD37', '#0055BF', '#F2F3F2', '#237841', '#FE8A18', '#05131D'];

const geoCache = new Map<string, THREE.BufferGeometry>();
const brickGeo = (nx: number, nz: number, h = H, seg = 12): THREE.BufferGeometry => {
	const key = `${nx}x${nz}x${h}x${seg}`;
	const hit = geoCache.get(key);
	if (hit) return hit;
	const parts: THREE.BufferGeometry[] = [];
	const body = new RoundedBoxGeometry(nx * U - 0.004, h, nz * U - 0.004, 2, 0.007);
	body.translate(0, h / 2, 0);
	parts.push(body.toNonIndexed());
	for (let i = 0; i < nx; i++) {
		for (let j = 0; j < nz; j++) {
			const s = new THREE.CylinderGeometry(0.03, 0.03, 0.019, seg);
			s.translate((i - (nx - 1) / 2) * U, h + 0.0095, (j - (nz - 1) / 2) * U);
			parts.push(s.toNonIndexed());
		}
	}
	const g = mergeGeometries(parts, false)!;
	geoCache.set(key, g);
	return g;
};

// ---------- yerleşim üreteçleri ----------
type B = {x: number; y: number; z: number; ry: number; t: 0 | 1; c: number; g: number; lv: number; bar?: number};

const pinwheel = (out: B[], cx: number, cz: number, y0: number, layers: number, g: number, col: (l: number) => number, size = 1) => {
	const k = size;
	for (let l = 0; l < layers; l++) {
		const m = l % 2 ? -1 : 1;
		const y = y0 + l * H;
		const c = col(l);
		const P: [number, number, number][] = [
			[-0.1 * k, -0.2 * k, 0],
			[0.2 * k, -0.1 * k, Math.PI / 2],
			[0.1 * k, 0.2 * k, 0],
			[-0.2 * k, 0.1 * k, Math.PI / 2],
		];
		for (const [px, pz, r] of P) out.push({x: cx + px * m, y, z: cz + pz, ry: r, t: 0, c, g, lv: l});
	}
};

const wallRun = (out: B[], x0: number, z0: number, dx: number, dz: number, n: number, layers: number, y0: number, g: number, col: (l: number) => number) => {
	const ry = dx !== 0 ? 0 : Math.PI / 2;
	for (let l = 0; l < layers; l++) {
		const off = l % 2 ? 0.2 : 0;
		for (let k = 0; k < n; k++) {
			if (l % 2 && k === n - 1) continue;
			const d = off + k * 0.4;
			out.push({x: x0 + dx * d, y: y0 + l * H, z: z0 + dz * d, ry, t: 0, c: col(l), g, lv: l});
		}
	}
};

const pick = (r: () => number, n = BRICK_COLORS.length) => Math.min(n - 1, Math.floor(r() * n));

const genTower = (layers: number, seed: number, mode: string): B[] => {
	const r = rng(seed);
	const out: B[] = [];
	const bands = [0, 1, 2, 3, 0, 4, 1, 5];
	pinwheel(out, 0, 0, 0, layers, 0, (l) => (mode === 'mono' ? 0 : bands[Math.floor(l / 4) % bands.length]) ?? pick(r));
	return out;
};

const genCastle = (seed: number): B[] => {
	const r = rng(seed);
	const out: B[] = [];
	const L = 5;
	const R = 6; // kenar başına tuğla
	const half = (R * 0.4) / 2;
	const wcol = (l: number) => (l % 2 ? 3 : 3);
	const sides: [number, number, number, number][] = [
		[-half, -half, 1, 0],
		[half, -half, 0, 1],
		[half, half, -1, 0],
		[-half, half, 0, -1],
	];
	sides.forEach(([x0, z0, dx, dz], si) => {
		const ry = dx !== 0 ? 0 : Math.PI / 2;
		for (let l = 0; l < L; l++) {
			const off = l % 2 ? 0.2 : 0;
			for (let k = 0; k < R; k++) {
				if (l % 2 && k === R - 1) continue;
				const d = off + k * 0.4 + 0.2;
				const x = x0 + dx * d;
				const z = z0 + dz * d;
				if (si === 2 && Math.abs(x) < 0.45 && l < 3) continue; // kapı
				if (l === L - 1 && k % 2 === 1) continue; // mazgal
				out.push({x, y: l * H, z, ry, t: 0, c: l === L - 1 ? 0 : wcol(l), g: 0, lv: l});
			}
		}
	});
	const cols = [0, 1, 2, 5];
	[[-half, -half], [half, -half], [half, half], [-half, half]].forEach(([cx, cz], i) => {
		pinwheel(out, cx, cz, 0, 9, 1 + i, (l) => (l >= 7 ? 0 : cols[i % 4]), 1);
		for (let l = 0; l < 3; l++) out.push({x: cx, y: (9 + l) * H, z: cz, ry: 0, t: 1, c: l === 2 ? 1 : 0, g: 1 + i, lv: 9 + l});
	});
	for (let l = 0; l < 5; l++) out.push({x: 0, y: l * H, z: 0, ry: 0, t: 1, c: pick(r, 6), g: 5, lv: l});
	return out;
};

const genSprawl = (seed: number, count: number): B[] => {
	const r = rng(seed);
	const out: B[] = [];
	for (let s = 0; s < count; s++) {
		const a = (s / count) * Math.PI * 2 + (r() - 0.5) * 0.6;
		const rad = 1.7 + r() * 3.3;
		const cx = Math.cos(a) * rad;
		const cz = Math.sin(a) * rad;
		const kind = s % 3;
		const base = pick(r, 6);
		if (kind === 0) pinwheel(out, cx, cz, 0, 6 + Math.floor(r() * 16), s, (l) => (l % 5 === 4 ? (base + 1) % 6 : base));
		else if (kind === 1) {
			const dir = r() < 0.5;
			wallRun(out, cx, cz, dir ? 1 : 0, dir ? 0 : 1, 3 + Math.floor(r() * 4), 3 + Math.floor(r() * 4), 0, s, (l) => (l % 2 ? (base + 2) % 6 : base));
		} else {
			// kemer: iki sütun + lento
			for (let l = 0; l < 6; l++) {
				out.push({x: cx - 0.3, y: l * H, z: cz, ry: 0, t: 1, c: base, g: s, lv: l});
				out.push({x: cx + 0.3, y: l * H, z: cz, ry: 0, t: 1, c: base, g: s, lv: l});
			}
			for (let k = 0; k < 2; k++) out.push({x: cx - 0.1 + k * 0.2, y: 6 * H, z: cz, ry: 0, t: 0, c: (base + 1) % 6, g: s, lv: 6});
		}
	}
	return out;
};

const genEmpire = (seed: number): B[] => {
	const r = rng(seed);
	const out: B[] = [];
	// merkez: kademeli tabanlı yüksek kule (sade, odaklı)
	pinwheel(out, 0, 0, 0, 46, 0, (l) => (l < 30 ? (l % 12 < 6 ? 0 : 3) : l < 40 ? 1 : 0), 1);
	for (let l = 0; l < 6; l++) out.push({x: 0, y: (46 + l) * H, z: 0, ry: 0, t: 1, c: l % 2 ? 3 : 1, g: 0, lv: 46 + l});
	const tiers: [number, number][] = [[1.1, 8], [1.8, 5]];
	tiers.forEach(([rad, layers], ti) => {
		const n = 8 + ti * 4;
		for (let i = 0; i < n; i++) {
			const a = (i / n) * Math.PI * 2 + ti * 0.3;
			const cx = Math.cos(a) * rad;
			const cz = Math.sin(a) * rad;
			pinwheel(out, cx, cz, 0, layers + Math.floor(r() * 6) + (ti === 0 ? 8 : 0), 1 + ti, () => [0, 1, 2, 3, 4, 5][i % 6]);
		}
	});
	return out;
};

const genBars = (nBars: number, levels: number, seed: number): B[] => {
	const r = rng(seed);
	const out: B[] = [];
	for (let b = 0; b < nBars; b++) {
		for (let l = 0; l < levels; l++) {
			const x = (b - (nBars - 1) / 2) * 0.62;
			for (let k = 0; k < 2; k++) out.push({x: x, y: l * H, z: (k - 0.5) * 0.2, ry: 0, t: 0, c: b, g: b, lv: l, bar: b});
			void r;
		}
	}
	return out;
};

// ---------- animasyon durumları ----------
type Anim = {
	delay: number;
	vel: [number, number, number];
	spin: [number, number, number];
	scat: [number, number, number];
	scatRot: [number, number, number];
};

export type BricksProps = {
	layout?: 'tower' | 'castle' | 'sprawl' | 'empire' | 'bars';
	seed?: number;
	layers?: number;
	count?: number;
	mode?: string;
	/** Sıralı inşa: bottom→top tuğla düşer */
	build?: {from: number; dur: number; drop?: number};
	/** Çöküş: patlayarak dağılır */
	collapse?: {at: number; dur?: number; power?: number; spread?: number};
	/** Dağınık havadan birleşme */
	assemble?: {from: number; dur: number; radius?: number};
	/** Gruba göre çıkış (g indeksine kare listesi) */
	groupOut?: number[];
	/** Toplu çıkış */
	out?: {from: number; dur: number};
	/** Çubuk grafik: her çubuğun değeri 0..1 (anahtar kare) */
	bars?: {color: number; v: number | NumKey[]}[];
	levels?: number;
	colors?: string[];
	clear?: number;
};

const empty = new THREE.Object3D();

export const Bricks: React.FC<BricksProps> = ({layout = 'tower', seed = 1, layers = 40, count = 6, mode, build, collapse, assemble, groupOut, out, bars, levels = 14, colors = BRICK_COLORS}) => {
	const frame = useCurrentFrame();
	const data = useMemo(() => {
		let bricks: B[];
		if (layout === 'castle') bricks = genCastle(seed);
		else if (layout === 'sprawl') bricks = genSprawl(seed, count);
		else if (layout === 'empire') bricks = genEmpire(seed);
		else if (layout === 'bars') bricks = genBars(bars?.length ?? count, levels, seed);
		else bricks = genTower(layers, seed, mode ?? '');
		const r = rng(seed * 7 + 3);
		const N = bricks.length;
		const anim: Anim[] = bricks.map((b, i) => {
			const a = Math.atan2(b.z, b.x) + (r() - 0.5) * 1.4;
			const sp = 0.6 + r() * 2.2;
			const sr = 4 + r() * 8;
			const th = r() * Math.PI * 2;
			const ph = Math.acos(2 * r() - 1);
			return {
				delay: r() * 0.25 + Math.min(1, b.lv / Math.max(1, layers)) * 0.3,
				vel: [Math.cos(a) * sp, 0.4 + r() * 2.0, Math.sin(a) * sp],
				spin: [(r() - 0.5) * 14, (r() - 0.5) * 8, (r() - 0.5) * 14],
				scat: [Math.sin(ph) * Math.cos(th) * sr, 1.5 + Math.abs(Math.cos(ph)) * sr * 0.6, Math.sin(ph) * Math.sin(th) * sr],
				scatRot: [r() * 6.28, r() * 6.28, r() * 6.28],
			};
		});
		const order = bricks.map((_, i) => i).sort((a, b) => bricks[a].y - bricks[b].y);
		const rank = new Array<number>(N);
		order.forEach((idx, k) => (rank[idx] = k / Math.max(1, N - 1)));
		const idx0: number[] = [];
		const idx1: number[] = [];
		bricks.forEach((b, i) => (b.t === 0 ? idx0 : idx1).push(i));
		return {bricks, anim, rank, idx0, idx1};
	}, [layout, seed, layers, count, mode, levels, bars?.length]);

	const m0 = useRef<THREE.InstancedMesh>(null);
	const m1 = useRef<THREE.InstancedMesh>(null);
	const g0 = useMemo(() => brickGeo(4, 2), []);
	const g1 = useMemo(() => brickGeo(2, 2), []);
	const material = useMemo(() => new THREE.MeshPhysicalMaterial({color: '#ffffff', roughness: 0.3, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.18, envMapIntensity: 1.1}), []);
	const tmp = useMemo(() => new THREE.Object3D(), []);
	const col = useMemo(() => new THREE.Color(), []);

	useLayoutEffect(() => {
		const {bricks, anim, rank} = data;
		const FPS = 30;
		const write = (mesh: THREE.InstancedMesh | null, ids: number[]) => {
			if (!mesh) return;
			ids.forEach((bi, slot) => {
				const b = bricks[bi];
				const a = anim[bi];
				let x = b.x;
				let y = b.y;
				let z = b.z;
				let rx = 0;
				let ry = b.ry;
				let rz = 0;
				let s = 1;
				if (b.bar !== undefined && bars) {
					const v = clamp01(num(frame, bars[b.bar].v, 0));
					s = clamp01(v * levels - b.lv);
					if (s <= 0) s = 0.0001;
				}
				if (build) {
					const st = build.from + build.dur * rank[bi];
					const k = clamp01((frame - st) / 7);
					if (frame < st) s = 0.0001;
					else {
						y += (1 - easeFn('in')(k)) * (build.drop ?? 1.6);
						s = Math.max(s, 0.0001);
					}
				}
				if (assemble) {
					const st = assemble.from + a.delay * assemble.dur * 0.6;
					const k = easeFn('out')(clamp01((frame - st) / (assemble.dur * 0.45)));
					const rad = assemble.radius ?? 1;
					x = a.scat[0] * rad + (b.x - a.scat[0] * rad) * k;
					y = a.scat[1] * rad + (b.y - a.scat[1] * rad) * k;
					z = a.scat[2] * rad + (b.z - a.scat[2] * rad) * k;
					rx = a.scatRot[0] * (1 - k);
					ry = b.ry + a.scatRot[1] * (1 - k);
					rz = a.scatRot[2] * (1 - k);
					if (frame < assemble.from) s = 0.0001;
				}
				if (collapse && frame >= collapse.at) {
					const tau = Math.max(0, (frame - collapse.at) / FPS - a.delay * (collapse.dur ?? 20) / FPS);
					const pw = collapse.power ?? 1;
					const sp = collapse.spread ?? 1;
					const vy = a.vel[1] * pw;
					const tl = (vy + Math.sqrt(vy * vy + 19.6 * Math.max(0, b.y))) / 9.8;
					const te = Math.min(tau, tl + 0.3);
					x += a.vel[0] * sp * te * pw;
					z += a.vel[2] * sp * te * pw;
					y = Math.max(0, b.y + vy * Math.min(tau, tl) - 4.9 * Math.min(tau, tl) ** 2);
					const flat = easeFn('out')(clamp01((tau - tl) / 0.4));
					rx = a.spin[0] * Math.min(tau, tl) * (1 - flat) * pw;
					rz = a.spin[2] * Math.min(tau, tl) * (1 - flat) * pw;
					ry = b.ry + a.spin[1] * te * 0.5;
				}
				if (groupOut) {
					const o = groupOut[b.g];
					if (o !== undefined && frame >= o) {
						const k = clamp01((frame - o - a.delay * 10) / 14);
						s *= Math.max(0.0001, 1 - easeFn('in')(k));
						y += k * 0.8;
					}
				}
				if (out && frame >= out.from) {
					const k = clamp01((frame - out.from - a.delay * out.dur * 0.5) / (out.dur * 0.5));
					s *= Math.max(0.0001, 1 - easeFn('in')(k));
					y += k * 1.2;
				}
				tmp.position.set(x, y, z);
				tmp.rotation.set(rx, ry, rz);
				tmp.scale.setScalar(s);
				tmp.updateMatrix();
				mesh.setMatrixAt(slot, tmp.matrix);
				const ci = bars && b.bar !== undefined ? bars[b.bar].color : b.c;
				col.set(colors[ci % colors.length]);
				mesh.setColorAt(slot, col);
			});
			mesh.instanceMatrix.needsUpdate = true;
			if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
			mesh.computeBoundingSphere();
		};
		write(m0.current, data.idx0);
		write(m1.current, data.idx1);
		void empty;
	});

	return (
		<group>
			<instancedMesh key={`a${data.idx0.length}`} ref={m0} args={[g0, material, Math.max(1, data.idx0.length)]} castShadow receiveShadow frustumCulled={false} />
			{data.idx1.length ? <instancedMesh key={`b${data.idx1.length}`} ref={m1} args={[g1, material, data.idx1.length]} castShadow receiveShadow frustumCulled={false} /> : null}
		</group>
	);
};

// ---------- zemin: parlak koyu stüdyo zemini (+ isteğe bağlı baseplate) ----------
export const StudioFloor: React.FC<{size?: number; color?: string; rough?: number; metal?: number; grid?: boolean; y?: number}> = ({size = 60, color = '#0b0d14', rough = 0.22, metal = 0.35, grid = false, y = 0}) => (
	<group position={[0, y - 0.001, 0]}>
		<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
			<planeGeometry args={[size, size]} />
			<meshPhysicalMaterial color={color} roughness={rough} metalness={metal} envMapIntensity={0.9} clearcoat={0.5} clearcoatRoughness={0.25} />
		</mesh>
		{grid ? <gridHelper args={[size, size * 2, '#2b3550', '#1a2136']} position={[0, 0.002, 0]} /> : null}
	</group>
);

/** Baseplate: studlu düz levha (zemin) */
export const Baseplate: React.FC<{n?: number; color?: string}> = ({n = 24, color = '#3a7a3f'}) => {
	const geo = useMemo(() => {
		const parts: THREE.BufferGeometry[] = [];
		const body = new RoundedBoxGeometry(n * U, 0.05, n * U, 2, 0.008);
		body.translate(0, -0.025, 0);
		parts.push(body.toNonIndexed());
		for (let i = 0; i < n; i++)
			for (let j = 0; j < n; j++) {
				const s = new THREE.CylinderGeometry(0.03, 0.03, 0.019, 10);
				s.translate((i - (n - 1) / 2) * U, 0.0095, (j - (n - 1) / 2) * U);
				parts.push(s.toNonIndexed());
			}
		return mergeGeometries(parts, false)!;
	}, [n]);
	return (
		<mesh geometry={geo} receiveShadow castShadow>
			<meshPhysicalMaterial color={color} roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.2} />
		</mesh>
	);
};

// ---------- oyuncak kutuları: bant üstünde akan / yığılan ----------
export type BoxesProps = {
	mode?: 'belt' | 'pile';
	count?: number;
	seed?: number;
	speed?: number; // m/sn (belt)
	length?: number;
	grow?: number | NumKey[]; // pile: görünen oran 0..1
	scatter?: number;
};

const boxGeo = (() => {
	let g: THREE.BufferGeometry | null = null;
	return () => (g ??= new RoundedBoxGeometry(0.62, 0.46, 0.2, 2, 0.015).translate(0, 0.23, 0));
})();
const windowGeo = (() => {
	let g: THREE.BufferGeometry | null = null;
	return () => (g ??= new THREE.BoxGeometry(0.44, 0.28, 0.01).translate(0, 0.25, 0.101));
})();

export const ToyBoxes: React.FC<BoxesProps> = ({mode = 'belt', count = 30, seed = 4, speed = 0.8, length = 14, grow = 1, scatter = 1}) => {
	const frame = useCurrentFrame();
	const m0 = useRef<THREE.InstancedMesh>(null);
	const m1 = useRef<THREE.InstancedMesh>(null);
	const items = useMemo(() => {
		const r = rng(seed);
		const arr = [];
		for (let i = 0; i < count; i++) {
			if (mode === 'belt') arr.push({x: (i / count) * length, y: 0.42, z: (r() - 0.5) * 0.5, ry: (r() - 0.5) * 0.25, c: pick(r, 3), lvl: 0});
			else {
				const row = Math.floor(i / 8);
				const colI = i % 8;
				arr.push({x: (colI - 3.5) * 0.7 + (r() - 0.5) * 0.15 * scatter, y: row * 0.46, z: (r() - 0.5) * 0.3 * scatter + (row % 2) * 0.06, ry: (r() - 0.5) * 0.3 * scatter, c: pick(r, 3), lvl: i});
			}
		}
		return arr;
	}, [mode, count, seed, length, scatter]);
	const palette = ['#C91A09', '#F2CD37', '#0055BF'];
	const mat0 = useMemo(() => new THREE.MeshPhysicalMaterial({color: '#fff', roughness: 0.5, clearcoat: 0.3}), []);
	const mat1 = useMemo(() => new THREE.MeshStandardMaterial({color: '#e9f2ff', roughness: 0.1, metalness: 0.0, emissive: '#223455', emissiveIntensity: 0.4}), []);
	const tmp = useMemo(() => new THREE.Object3D(), []);
	const c = useMemo(() => new THREE.Color(), []);
	useLayoutEffect(() => {
		const g = clamp01(num(frame, grow, 1));
		items.forEach((it, i) => {
			let x = it.x;
			let s = 1;
			if (mode === 'belt') {
				x = ((it.x + (speed * frame) / 30) % length) - length / 2;
			} else {
				const st = (it.lvl / Math.max(1, items.length)) * 0.95;
				s = clamp01((g - st) / 0.05);
				if (s <= 0) s = 0.0001;
			}
			tmp.position.set(x, it.y + (mode === 'pile' ? (1 - s) * 1.2 : 0), it.z);
			tmp.rotation.set(0, it.ry, 0);
			tmp.scale.setScalar(s);
			tmp.updateMatrix();
			[m0.current, m1.current].forEach((m) => m?.setMatrixAt(i, tmp.matrix));
			c.set(palette[it.c]);
			m0.current?.setColorAt(i, c);
		});
		[m0.current, m1.current].forEach((m) => {
			if (!m) return;
			m.instanceMatrix.needsUpdate = true;
			m.computeBoundingSphere();
		});
		if (m0.current?.instanceColor) m0.current.instanceColor.needsUpdate = true;
	});
	return (
		<group>
			<instancedMesh key={`bx${count}`} ref={m0} args={[boxGeo(), mat0, count]} castShadow receiveShadow frustumCulled={false} />
			<instancedMesh key={`bw${count}`} ref={m1} args={[windowGeo(), mat1, count]} frustumCulled={false} />
		</group>
	);
};

/** Üretim bandı: gövde + akan kaydırma çıtaları + çelik raylar */
export const Conveyor: React.FC<{length?: number; speed?: number}> = ({length = 16, speed = 0.8}) => {
	const frame = useCurrentFrame();
	const ref = useRef<THREE.InstancedMesh>(null);
	const n = Math.round(length / 0.22);
	const tmp = useMemo(() => new THREE.Object3D(), []);
	useLayoutEffect(() => {
		for (let i = 0; i < n; i++) {
			const x = ((i * 0.22 + (speed * frame) / 30) % length) - length / 2;
			tmp.position.set(x, 0.405, 0);
			tmp.updateMatrix();
			ref.current?.setMatrixAt(i, tmp.matrix);
		}
		if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
	});
	return (
		<group>
			<mesh position={[0, 0.2, 0]} castShadow receiveShadow>
				<boxGeometry args={[length, 0.4, 1.3]} />
				<meshStandardMaterial color="#1a1f2b" roughness={0.6} metalness={0.5} />
			</mesh>
			<instancedMesh ref={ref} args={[undefined, undefined, n]} receiveShadow frustumCulled={false}>
				<boxGeometry args={[0.17, 0.02, 1.2]} />
				<meshStandardMaterial color="#2c3342" roughness={0.45} metalness={0.2} />
			</instancedMesh>
			{[-0.68, 0.68].map((z) => (
				<mesh key={z} position={[0, 0.34, z]} castShadow>
					<boxGeometry args={[length, 0.16, 0.06]} />
					<meshStandardMaterial color="#b9c4d2" roughness={0.2} metalness={1} />
				</mesh>
			))}
		</group>
	);
};

/** Fabrika salonu: tavan lambaları, kolonlar, arka duvar pencereleri (emissive) */
export const Hall: React.FC<{lamp?: string; width?: number; depth?: number}> = ({lamp = '#cfe3ff', width = 24, depth = 30}) => {
	const items = useMemo(() => {
		const a: {p: [number, number, number]; s: [number, number, number]; k: 'col' | 'lamp' | 'win'}[] = [];
		for (let i = 0; i < 7; i++) {
			const z = -i * 4.5 + 3;
			a.push({p: [-5.5, 3.5, z], s: [0.5, 7, 0.5], k: 'col'});
			a.push({p: [5.5, 3.5, z], s: [0.5, 7, 0.5], k: 'col'});
			a.push({p: [0, 6.6, z], s: [9, 0.1, 0.35], k: 'lamp'});
		}
		for (let i = 0; i < 7; i++) a.push({p: [-width / 2 + 1 + i * 3.4, 3.2, -depth + 1], s: [2.2, 3.6, 0.08], k: 'win'});
		return a;
	}, [width, depth]);
	return (
		<group>
			{items.map((it, i) => (
				<mesh key={i} position={it.p} castShadow={it.k === 'col'} receiveShadow>
					<boxGeometry args={it.s} />
					{it.k === 'col' ? <meshStandardMaterial color="#232a38" roughness={0.5} metalness={0.7} /> : <meshStandardMaterial color={lamp} emissive={lamp} emissiveIntensity={it.k === 'lamp' ? 2.2 : 0.9} />}
				</mesh>
			))}
			<mesh position={[0, 3.5, -depth]} receiveShadow>
				<boxGeometry args={[width, 7, 0.2]} />
				<meshStandardMaterial color="#0f131c" roughness={0.9} />
			</mesh>
		</group>
	);
};

/** 3D çizgi grafik: nokta listesi, çizim ilerlemesi, parlayan uç */
export const LineGraph: React.FC<{points: [number, number][]; color?: string; width?: number; draw?: number | NumKey[]; grid?: boolean; gridColor?: string; height?: number}> = ({points, color = '#ff2a3a', width = 0.045, draw = 1, grid = true, gridColor = '#3a4560', height = 3}) => {
	const frame = useCurrentFrame();
	const ref = useRef<THREE.Mesh>(null);
	const head = useRef<THREE.Mesh>(null);
	const {geo, curve} = useMemo(() => {
		const c = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'catmullrom', 0.3);
		return {curve: c, geo: new THREE.TubeGeometry(c, 160, width, 8, false)};
	}, [points, width]);
	useLayoutEffect(() => {
		const p = clamp01(num(frame, draw, 1));
		const total = geo.index!.count;
		geo.setDrawRange(0, Math.max(0, Math.floor((p * total) / 3) * 3));
		if (head.current) {
			head.current.visible = p > 0.001;
			head.current.position.copy(curve.getPoint(Math.min(0.999, p)));
		}
	});
	const xs = points.map((p) => p[0]);
	const x0 = Math.min(...xs);
	const x1 = Math.max(...xs);
	return (
		<group>
			{grid
				? Array.from({length: 6}).map((_, i) => (
						<mesh key={i} position={[(x0 + x1) / 2, (i / 5) * height, -0.1]}>
							<boxGeometry args={[x1 - x0 + 0.4, 0.008, 0.005]} />
							<meshBasicMaterial color={gridColor} transparent opacity={0.6} />
						</mesh>
					))
				: null}
			<mesh ref={ref} geometry={geo}>
				<meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} roughness={0.3} />
			</mesh>
			<mesh ref={head}>
				<sphereGeometry args={[width * 2.4, 16, 12]} />
				<meshStandardMaterial color="#fff" emissive={color} emissiveIntensity={3} />
			</mesh>
		</group>
	);
};
