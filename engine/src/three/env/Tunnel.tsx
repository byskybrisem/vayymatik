// Kayaya oyulmuş dar koridor: x ekseninde uzanan tünel (tabanı y=0, ortası z=0), isteğe bağlı havalandırma bacası (tavandan yukarı),
// yan oyuk (taş kapı girintisi) ve duvar meşaleleri. İçeriden bakılır; tüm geometri kod ile üretilir (deterministik).
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {NumKey, num} from '../core/math';
import {fbm, smoothstep} from '../core/noise';
import {glowTexture} from '../core/textures';
import {Flame} from '../fx/Flame';

export type TunnelProps = {
	length?: number;
	rx?: number;
	h?: number;
	seed?: number;
	shaft?: {x: number; r?: number; height?: number};
	niche?: {x: number; side: 1 | -1; w?: number; depth?: number};
	torches?: {x: number; side: 1 | -1; y?: number}[];
	/** tünel sonu yakınında karanlığa doğru kararma */
	tint?: string;
};

const ROCK = ['#9c8267', '#a98a6a', '#8d7660', '#b09070'].map((c) => new THREE.Color(c));
const rock = (x: number, y: number, seed: number, c: THREE.Color) => {
	const f = fbm(x * 0.35, y * 0.9, seed, 3) * 4;
	const i = Math.floor(f) % 4;
	c.copy(ROCK[i]).lerp(ROCK[(i + 1) % 4], f - Math.floor(f));
	c.multiplyScalar(0.55 + fbm(x * 1.7, y * 1.7, seed + 3, 2) * 0.55);
	return c;
};

const build = (p: Required<Pick<TunnelProps, 'length' | 'rx' | 'h' | 'seed'>> & TunnelProps) => {
	const {length: L, rx, h, seed} = p;
	const hw = Math.min(1.0, h * 0.4);
	// kesit noktaları (z,y)
	const sec: [number, number][] = [];
	for (let i = 0; i <= 3; i++) sec.push([-rx, (hw * i) / 3]); // sol duvar yukarı
	const nd = 14;
	for (let i = 1; i <= nd; i++) {
		const a = Math.PI - (Math.PI * i) / nd;
		sec.push([rx * Math.cos(a), hw + (h - hw) * Math.sin(a)]);
	}
	for (let i = 1; i <= 3; i++) sec.push([rx, hw - (hw * i) / 3]); // sağ duvar aşağı
	for (let i = 1; i < 6; i++) sec.push([rx - (2 * rx * i) / 6, 0]); // taban
	const M = sec.length;
	const seg = Math.round(L / 0.45);
	const pos = new Float32Array((seg + 1) * M * 3);
	const col = new Float32Array((seg + 1) * M * 3);
	const glow = new Float32Array((seg + 1) * M * 3);
	const c = new THREE.Color();
	const warm = new THREE.Color('#ff8a2a');
	const torches = p.torches ?? [];
	for (let s = 0; s <= seg; s++) {
		const x = -L / 2 + (s / seg) * L;
		for (let j = 0; j < M; j++) {
			const [z0, y0] = sec[j];
			const isFloor = j >= M - 5;
			const n = (fbm(x * 0.8, (z0 + y0) * 1.1, seed, 3) - 0.5) * (isFloor ? 0.05 : 0.26);
			// yarı çapsal dışa genişleme
			const cy = h / 2;
			const rz = z0;
			const ry = y0 - cy;
			const rl = Math.hypot(rz, ry) || 1;
			const z = z0 + (rz / rl) * n;
			const y = isFloor ? y0 + n * 0.3 : y0 + (ry / rl) * n;
			const o = (s * M + j) * 3;
			pos[o] = x;
			pos[o + 1] = y;
			pos[o + 2] = z;
			rock(x, y, seed, c);
			if (isFloor) c.lerp(new THREE.Color('#6e5a46'), 0.5);
			// taban köşelerinde AO
			const cornerAO = 1 - 0.35 * (1 - smoothstep(0, 0.5, y)) * (Math.abs(z) > rx * 0.7 ? 1 : 0.3);
			c.multiplyScalar(cornerAO * (0.75 + 0.3 * smoothstep(0, h, y)));
			col[o] = c.r;
			col[o + 1] = c.g;
			col[o + 2] = c.b;
			let g = 0;
			for (const t of torches) {
				const tx = x - t.x;
				const ty = y - (t.y ?? 1.5);
				const tz = z - t.side * (rx - 0.1);
				g += Math.exp(-(tx * tx + ty * ty * 1.2 + tz * tz) / 7.5);
			}
			g = Math.min(1.3, g);
			glow[o] = warm.r * g * 0.3;
			glow[o + 1] = warm.g * g * 0.3;
			glow[o + 2] = warm.b * g * 0.3;
		}
	}
	const sh = p.shaft;
	const ni = p.niche;
	const idx: number[] = [];
	for (let s = 0; s < seg; s++) {
		const xm = -L / 2 + ((s + 0.5) / seg) * L;
		for (let j = 0; j < M; j++) {
			const j2 = (j + 1) % M;
			const zm = (sec[j][0] + sec[j2][0]) / 2;
			const ym = (sec[j][1] + sec[j2][1]) / 2;
			if (sh && Math.abs(xm - sh.x) < (sh.r ?? 0.9) * 0.95 && ym > hw && Math.abs(zm) < (sh.r ?? 0.9) * 0.95) continue;
			if (ni && Math.abs(xm - ni.x) < (ni.w ?? 2.4) / 2 - 0.05 && Math.sign(zm) === ni.side && Math.abs(zm) > rx * 0.82 && ym > 0.05 && ym < Math.min(h * 0.8, 2.2)) continue;
			const a = s * M + j;
			const b = s * M + j2;
			const cc = (s + 1) * M + j;
			const d = (s + 1) * M + j2;
			idx.push(a, cc, b, b, cc, d);
		}
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
	geo.setIndex(idx);
	geo.computeVertexNormals();
	const glowGeo = new THREE.BufferGeometry();
	glowGeo.setAttribute('position', geo.getAttribute('position'));
	glowGeo.setAttribute('color', new THREE.BufferAttribute(glow, 3));
	glowGeo.setIndex(idx);
	return {geo, glowGeo, hw};
};

const buildShaft = (x: number, r: number, base: number, H: number, seed: number) => {
	const N = 16;
	const S = 36;
	const pos = new Float32Array((S + 1) * N * 3);
	const col = new Float32Array((S + 1) * N * 3);
	const glow = new Float32Array((S + 1) * N * 3);
	const c = new THREE.Color();
	for (let s = 0; s <= S; s++) {
		const y = base + (s / S) * H;
		for (let i = 0; i < N; i++) {
			const a = (i / N) * Math.PI * 2;
			const n = (fbm(i * 0.9, y * 0.8, seed + 3, 3) - 0.5) * 0.3;
			const rr = r * (1 + (s / S) * 0.05) + n;
			const o = (s * N + i) * 3;
			pos[o] = x + Math.cos(a) * rr;
			pos[o + 1] = y;
			pos[o + 2] = Math.sin(a) * rr;
			rock(i * 0.6, y, seed + 7, c);
			const k = s / S;
			c.multiplyScalar(0.7);
			col[o] = c.r;
			col[o + 1] = c.g;
			col[o + 2] = c.b;
			const g = Math.pow(k, 3.2);
			glow[o] = 0.3 * g;
			glow[o + 1] = 0.37 * g;
			glow[o + 2] = 0.46 * g;
		}
	}
	const idx: number[] = [];
	for (let s = 0; s < S; s++) {
		for (let i = 0; i < N; i++) {
			const i2 = (i + 1) % N;
			const a = s * N + i;
			const b = s * N + i2;
			const cc = (s + 1) * N + i;
			const d = (s + 1) * N + i2;
			idx.push(a, cc, b, b, cc, d);
		}
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
	geo.setIndex(idx);
	geo.computeVertexNormals();
	const glowGeo = new THREE.BufferGeometry();
	glowGeo.setAttribute('position', geo.getAttribute('position'));
	glowGeo.setAttribute('color', new THREE.BufferAttribute(glow, 3));
	glowGeo.setIndex(idx);
	return {geo, glowGeo};
};

export const Tunnel: React.FC<TunnelProps> = (props) => {
	const {length = 44, rx = 0.95, h = 2.5, seed = 9, shaft, niche, torches = []} = props;
	const t = useMemo(() => build({...props, length, rx, h, seed}), [length, rx, h, seed, JSON.stringify(shaft), JSON.stringify(niche), JSON.stringify(torches)]); // eslint-disable-line react-hooks/exhaustive-deps
	const sh = useMemo(() => (shaft ? buildShaft(shaft.x, shaft.r ?? 0.9, h - 0.05, shaft.height ?? 26, seed) : null), [shaft?.x, shaft?.r, shaft?.height, h, seed]); // eslint-disable-line react-hooks/exhaustive-deps
	const rockMat = useMemo(() => new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide}), []);
	const glowMat = useMemo(
		() => new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1}),
		[],
	);
	const nicheGeo = useMemo(() => {
		if (!niche) return null;
		const w = niche.w ?? 2.4;
		const d = niche.depth ?? 2.6;
		const g = new THREE.BoxGeometry(w, Math.min(h * 0.82, 2.25), d, 5, 3, 5);
		const p = g.getAttribute('position');
		const cols = new Float32Array(p.count * 3);
		const c = new THREE.Color();
		for (let i = 0; i < p.count; i++) {
			const nx = (fbm(i * 0.31, 1, seed + 21, 2) - 0.5) * 0.12;
			p.setXYZ(i, p.getX(i) + nx, p.getY(i), p.getZ(i) + nx);
			rock(p.getX(i) * 2, p.getY(i), seed + 12, c);
			c.multiplyScalar(0.6);
			cols[i * 3] = c.r;
			cols[i * 3 + 1] = c.g;
			cols[i * 3 + 2] = c.b;
		}
		g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
		g.computeVertexNormals();
		return g;
	}, [niche?.w, niche?.depth, h, seed]); // eslint-disable-line react-hooks/exhaustive-deps
	const sky = useMemo(() => new THREE.MeshBasicMaterial({color: '#f4f8ff', toneMapped: false, fog: false}), []);
	const beam = useMemo(() => new THREE.MeshBasicMaterial({color: '#cfe4ff', transparent: true, opacity: 0.045, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false}), []);
	const haloMat = useMemo(() => new THREE.SpriteMaterial({map: glowTexture(), color: '#dff0ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.45, fog: false}), []);
	return (
		<group>
			<mesh geometry={t.geo} material={rockMat} receiveShadow />
			<mesh geometry={t.glowGeo} material={glowMat} renderOrder={2} />
			{niche && nicheGeo ? (
				<mesh geometry={nicheGeo} material={rockMat} position={[niche.x, Math.min(h * 0.82, 2.25) / 2 + 0.02, niche.side * (rx + (niche.depth ?? 2.6) / 2 - 0.05)]} />
			) : null}
			{sh && shaft ? (
				<>
					<mesh geometry={sh.geo} material={rockMat} />
					<mesh geometry={sh.glowGeo} material={glowMat} renderOrder={2} />
					<mesh material={sky} position={[shaft.x, h - 0.05 + (shaft.height ?? 26) + 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
						<circleGeometry args={[(shaft.r ?? 0.9) * 1.04, 20]} />
					</mesh>
					<sprite material={haloMat} scale={[3.4, 3.4, 1]} position={[shaft.x, h - 0.05 + (shaft.height ?? 26) + 0.1, 0]} />
					<mesh material={beam} position={[shaft.x, h * 0.5 + (shaft.height ?? 26) * 0.2, 0]}>
						<cylinderGeometry args={[(shaft.r ?? 0.9) * 0.9, (shaft.r ?? 0.9) * 2.2, (shaft.height ?? 26) * 0.6 + h, 16, 1, true]} />
					</mesh>
				</>
			) : null}
			{torches.map((tt, i) => (
				<group key={i} position={[tt.x, tt.y ?? 1.5, tt.side * (rx - 0.12)]}>
					<Flame size={0.9} stick seed={i + 3} />
				</group>
			))}
		</group>
	);
};

/** Tünel girişi/sonu için sis ve renk perdesi: yalnızca z'de büyük, düz ışık levhası (uzakta parlayan ağız) */
export const FarLight: React.FC<{size?: number; color?: string; opacity?: number | NumKey[]}> = ({size = 3, color = '#fff2d0', opacity = 1}) => {
	const frame = useCurrentFrame();
	const o = num(frame, opacity as number | NumKey[], 1);
	const m = useMemo(() => new THREE.SpriteMaterial({map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false}), [color]);
	m.opacity = o;
	const disc = useMemo(() => new THREE.MeshBasicMaterial({color, toneMapped: false, transparent: true, fog: false}), [color]);
	disc.opacity = Math.min(1, o * 1.2);
	return (
		<group>
			<sprite material={m} scale={[size * 2.6, size * 2.6, 1]} />
			<mesh material={disc} rotation={[0, Math.PI / 2, 0]}>
				<circleGeometry args={[size * 0.5, 22]} />
			</mesh>
		</group>
	);
};
