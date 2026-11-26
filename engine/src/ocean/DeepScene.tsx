// "deep3d" sahne türü: 8.000 m derinlikte kurgusal su altı şehri, ROV, bilinmeyen varlık, hidrotermal bacalar.
// Tamamen koddan üretilir (özgün tasarım). Işık/su modeli: ocean/deep/glsl.ts. Hareket yalnızca kareye bağlı.
import React, {useMemo} from 'react';
import {Chapter, ChapterSpec} from './Chapter';
import {Tag} from './ui';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries as mergeRaw} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {Stage3D} from '../three/core/Stage3D';
import {CameraRig, CameraSpec} from '../three/camera/CameraRig';
import {num, vec, NumKey, VecKey, V3, rng} from '../three/core/math';
import {Titles, TitleSpec} from '../components/Titles';
import {bgMat, glowMat, makeShared, rockMat, Shared, snowMat, structMat} from './deep/materials';
import {BEING_FRAG, FISH_FRAG, LIGHTS_FRAG, LIGHTS_VERT, SMOKE_FRAG, STRUCT_VERT, SWAY_VERT, GLOW_VERT} from './deep/glsl';
import {Hud, HudSpec} from './Hud';
import {Grade, GradeSpec} from './Grade';

type N = number | NumKey[];
type V = V3 | VecKey[];

export type DeepProps = {
	stage?: {scale?: number; exposure?: number};
	camera: CameraSpec;
	water?: {sigma?: V; color?: string; amb?: string; surface?: N; surfCol?: string};
	lamps?: {mode?: 'cam' | 'rov' | 'off'; i?: N; spread?: number; beams?: N};
	city?: {show?: boolean; power?: N; seed?: number; beats?: number[]; period?: number; glow?: string};
	rov?: {show?: boolean; pos?: V; yaw?: N; pitch?: N; tether?: boolean};
	being?: {vis?: N; pos?: V; yaw?: N; scale?: number};
	seabed?: {show?: boolean; base?: string};
	vents?: {show?: boolean; pos?: V3};
	basalt?: {show?: boolean; pos?: V3};
	fish?: {show?: boolean; pos?: V; yaw?: N};
	snow?: {n?: number; size?: number};
	hud?: HudSpec;
	grade?: GradeSpec;
	titles?: TitleSpec[];
	chapter?: ChapterSpec;
	tag?: string;
	tagColor?: string;
};

// Karışık (indeksli/indekssiz) geometrileri güvenle birleştir
const mergeGeometries = (gs: THREE.BufferGeometry[]) => {
	const out = mergeRaw(gs.map((g) => (g.index ? g.toNonIndexed() : g)));
	if (!out) throw new Error('mergeGeometries başarısız');
	return out;
};

// ---------- Şehir yerleşimi (tohumlu) ----------
type Dome = {x: number; z: number; r: number; flat: number; spire: boolean};
type CityLayout = {domes: Dome[]; tunnels: THREE.CatmullRomCurve3[]; pods: {x: number; z: number; r: number}[]};

export const cityLayout = (seed = 7): CityLayout => {
	const R = rng(seed);
	const domes: Dome[] = [];
	const ring = (count: number, rad: number, rMin: number, rMax: number, off: number) => {
		for (let i = 0; i < count; i++) {
			const a = off + (i / count) * Math.PI * 2 + (R() - 0.5) * 0.25;
			const rr = rad + (R() - 0.5) * rad * 0.16;
			domes.push({x: Math.cos(a) * rr, z: Math.sin(a) * rr, r: rMin + R() * (rMax - rMin), flat: 0.72 + R() * 0.22, spire: R() > 0.55});
		}
	};
	ring(6, 250, 52, 82, 0.3);
	ring(9, 540, 34, 62, 0.1);
	ring(5, 860, 40, 70, 0.7);
	const tunnels: THREE.CatmullRomCurve3[] = [];
	const edge = (d: Dome, tx: number, tz: number) => {
		const a = Math.atan2(tz - d.z, tx - d.x);
		return new THREE.Vector3(d.x + Math.cos(a) * d.r * 0.92, 7, d.z + Math.sin(a) * d.r * 0.92);
	};
	const link = (a: THREE.Vector3, b: THREE.Vector3) => {
		const m = a.clone().add(b).multiplyScalar(0.5);
		m.y += 14 + a.distanceTo(b) * 0.04;
		tunnels.push(new THREE.CatmullRomCurve3([a, m, b]));
	};
	const inner = domes.slice(0, 6);
	const outer = domes.slice(6, 15);
	const far = domes.slice(15);
	inner.forEach((d, i) => {
		link(edge(d, 0, 0), new THREE.Vector3((d.x / Math.hypot(d.x, d.z)) * 102, 10, (d.z / Math.hypot(d.x, d.z)) * 102));
		const n = inner[(i + 1) % inner.length];
		link(edge(d, n.x, n.z), edge(n, d.x, d.z));
	});
	[...outer, ...far].forEach((d) => {
		const pool = far.includes(d) ? outer : inner;
		const best = pool.reduce((p, c) => (Math.hypot(c.x - d.x, c.z - d.z) < Math.hypot(p.x - d.x, p.z - d.z) ? c : p));
		link(edge(d, best.x, best.z), edge(best, d.x, d.z));
	});
	const pods: CityLayout['pods'] = [];
	for (let i = 0; pods.length < 46 && i < 400; i++) {
		const a = R() * Math.PI * 2;
		const rr = 120 + R() * 900;
		const x = Math.cos(a) * rr;
		const z = Math.sin(a) * rr;
		const r = 5 + R() * 11;
		if (domes.some((d) => Math.hypot(d.x - x, d.z - z) < d.r + r + 12)) continue;
		pods.push({x, z, r});
	}
	return {domes, tunnels, pods};
};

// Kule profili (döner gövde)
const towerGeo = () => {
	const pts: [number, number][] = [
		[52, 0], [50, 6], [41, 14], [33, 30], [27, 52], [24, 78], [27, 96], [21, 112], [17, 132], [19, 146], [13, 170], [9, 196], [6, 222], [3, 248], [1.2, 272], [0.2, 286],
	];
	return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 72);
};

// ---------- Ortak yardımcılar ----------
const useSharedUniforms = () => useMemo(() => makeShared(), []);

const Billboard: React.FC<{pos: V3; size: number; mat: THREE.ShaderMaterial}> = ({pos, size, mat}) => {
	const camera = useThree((s) => s.camera);
	const geo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
	return <mesh geometry={geo} material={mat} position={pos} scale={[size, size, size]} quaternion={camera.quaternion.clone()} renderOrder={5} />;
};

// ---------- Şehir ----------
const City: React.FC<{sh: Shared; layout: CityLayout; glow: string; frame: number; fps: number}> = ({sh, layout, glow, frame, fps}) => {
	const mats = useMemo(
		() => ({
			dome: structMat(sh, {base: '#7d8890', glow, hex: 0.25, veins: 0.06, mode: 0, seed: 3}),
			center: structMat(sh, {base: '#727d86', glow, hex: 0.2, veins: 0.1, mode: 0, seed: 4, glowAmt: 1.2}),
			tower: structMat(sh, {base: '#5f6a74', glow, hex: 0.22, veins: 0.18, mode: 1, seed: 9, glowAmt: 1.3}),
			tube: structMat(sh, {base: '#5a656e', glow, hex: 1.0, veins: 0.03, mode: 2, seed: 5}),
			base: structMat(sh, {base: '#4a535b', glow, hex: 0.3, veins: 0.05, mode: 1, seed: 2}),
			pod: structMat(sh, {base: '#7a848c', glow, hex: 0.45, veins: 0.05, mode: 0, seed: 8}),
			band: glowMat(sh, {color: glow, i: 0.8, kind: 2}),
			core: glowMat(sh, {color: '#9ffcf4', i: 2.0, kind: 2}),
			ringC: glowMat(sh, {color: glow, i: 0.45, kind: 2}),
			halo: glowMat(sh, {color: glow, i: 1.1, kind: 0}),
			haloBig: glowMat(sh, {color: glow, i: 0.75, kind: 0}),
			beam: glowMat(sh, {color: glow, i: 0.07, kind: 1}),
		}),
		[sh, glow],
	);
	const geos = useMemo(() => {
		const hemi = new THREE.SphereGeometry(1, 72, 28, 0, Math.PI * 2, 0, Math.PI / 2);
		const baseRing = new THREE.CylinderGeometry(1.04, 1.1, 1, 72, 1);
		const bandRing = new THREE.TorusGeometry(1, 0.012, 6, 96);
		const spire = new THREE.CylinderGeometry(0.15, 1.6, 1, 10);
		const tubes = mergeGeometries(layout.tunnels.map((c) => new THREE.TubeGeometry(c, 72, 5.5, 14, false)));
		const legs = mergeGeometries(
			[0, 1, 2].map((i) => {
				const a = (i / 3) * Math.PI * 2 + 0.5;
				const c = new THREE.CatmullRomCurve3([
					new THREE.Vector3(Math.cos(a) * 58, 168, Math.sin(a) * 18),
					new THREE.Vector3(Math.cos(a) * 96, 104, Math.sin(a) * 58),
					new THREE.Vector3(Math.cos(a) * 92, 36, Math.sin(a) * 74),
				]);
				return new THREE.TubeGeometry(c, 64, 3.6, 12, false);
			}),
		);
		const column = new THREE.CylinderGeometry(6, 13, 160, 32, 8).translate(0, 110, 0);
		const ringA = new THREE.TorusGeometry(64, 4.2, 18, 180).translate(0, 200, 0);
		const ringB = new THREE.TorusGeometry(50, 2.4, 12, 160).rotateY(Math.PI / 2).translate(0, 200, 0);
		const ringC = new THREE.TorusGeometry(80, 1.2, 8, 180).rotateX(Math.PI / 2).translate(0, 200, 0);
		return {hemi, baseRing, bandRing, spire, tubes, legs, column, rings: mergeGeometries([ringA, ringB]), ringC, core: new THREE.SphereGeometry(17, 48, 24), beam: new THREE.CylinderGeometry(4, 30, 520, 32, 1, true).translate(0, 460, 0)};
	}, [layout]);
	// tünel kapsülleri (ışık noktaları, eğri boyunca hareket)
	const pods = useMemo(() => {
		const n = layout.tunnels.length * 3;
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
		g.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(n).map((_, i) => (i * 0.137) % 1), 1));
		g.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(n * 3).map((_, i) => [1.6, 2.2, 2.2][i % 3]), 3));
		const m = new THREE.ShaderMaterial({
			uniforms: {...sh, uSize: {value: 5.5}, uPxScale: {value: 900}} as unknown as Record<string, THREE.IUniform>,
			vertexShader: LIGHTS_VERT,
			fragmentShader: LIGHTS_FRAG,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		});
		return {g, m, n};
	}, [layout, sh]);
	const t = frame / fps;
	const pos = pods.g.getAttribute('position') as THREE.BufferAttribute;
	for (let i = 0; i < pods.n; i++) {
		const c = layout.tunnels[Math.floor(i / 3)];
		const u = (t * (0.025 + (i % 5) * 0.004) + (i % 3) / 3 + Math.floor(i / 3) * 0.17) % 1;
		const p = c.getPointAt(i % 2 ? u : 1 - u);
		pos.setXYZ(i, p.x, p.y, p.z);
	}
	pos.needsUpdate = true;
	// pencere ışıkları (kubbe yüzeyinde)
	const lights = useMemo(() => {
		const R = rng(91);
		const P: number[] = [];
		const C: number[] = [];
		const S: number[] = [];
		const glowC = new THREE.Color(glow);
		layout.domes.forEach((d) => {
			const n = Math.round(d.r * 2.2);
			for (let i = 0; i < n; i++) {
				const a = R() * Math.PI * 2;
				const el = 0.05 + R() * 0.55;
				const cy = Math.sin(el) * d.r * d.flat - d.r * 0.12;
				const cr = Math.cos(el) * d.r * 1.01;
				P.push(d.x + Math.cos(a) * cr, Math.max(1.5, cy), d.z + Math.sin(a) * cr);
				const warm = R() > 0.85;
				const k = 0.7 + R() * 1.3;
				C.push(warm ? 1.4 * k : glowC.r * 2.2 * k, warm ? 1.2 * k : glowC.g * 2.2 * k, warm ? 0.9 * k : glowC.b * 2.2 * k);
				S.push(R());
			}
		});
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
		g.setAttribute('aCol', new THREE.Float32BufferAttribute(C, 3));
		g.setAttribute('aSeed', new THREE.Float32BufferAttribute(S, 1));
		const m = new THREE.ShaderMaterial({
			uniforms: {...sh, uSize: {value: 2.4}, uPxScale: {value: 900}} as unknown as Record<string, THREE.IUniform>,
			vertexShader: LIGHTS_VERT,
			fragmentShader: LIGHTS_FRAG,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		});
		return {g, m};
	}, [layout, sh, glow]);
	return (
		<group>
			{layout.domes.map((d, i) => (
				<group key={i} position={[d.x, 0, d.z]}>
					<mesh geometry={geos.hemi} material={mats.dome} position={[0, -d.r * 0.12, 0]} scale={[d.r, d.r * d.flat, d.r]} />
					<mesh geometry={geos.baseRing} material={mats.base} position={[0, 2.5, 0]} scale={[d.r, 5, d.r]} />
					<mesh geometry={geos.bandRing} material={mats.band} position={[0, d.r * d.flat * 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[d.r * 0.985, d.r * 0.985, d.r]} />
					{d.spire ? <mesh geometry={geos.spire} material={mats.tower} position={[0, d.r * d.flat * 0.88 + 16, 0]} scale={[1, 36, 1]} /> : null}
				</group>
			))}
			{layout.pods.map((p, i) => (
				<mesh key={i} geometry={geos.hemi} material={mats.pod} position={[p.x, -p.r * 0.15, p.z]} scale={[p.r, p.r * 0.8, p.r]} />
			))}
			<mesh geometry={geos.tubes} material={mats.tube} />
			<mesh geometry={geos.hemi} material={mats.center} position={[0, -6, 0]} scale={[108, 56, 108]} />
			<mesh geometry={geos.bandRing} material={mats.band} position={[0, 12, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[106, 106, 106]} />
			<mesh geometry={geos.column} material={mats.tower} />
			<mesh geometry={geos.legs} material={mats.tower} />
			<mesh geometry={geos.rings} material={mats.tower} rotation={[0, frame * 0.0006, 0]} />
			<mesh geometry={geos.ringC} material={mats.ringC} />
			<mesh geometry={geos.core} material={mats.core} position={[0, 200, 0]} />
			<Billboard pos={[0, 200, 0]} size={150} mat={mats.haloBig} />
			<mesh geometry={geos.beam} material={mats.beam} />
			<points geometry={lights.g} material={lights.m} />
			<points geometry={pods.g} material={pods.m} />
		</group>
	);
};

// ---------- Deniz tabanı ----------
const Seabed: React.FC<{sh: Shared; base: string}> = ({sh, base}) => {
	const geo = useMemo(() => {
		const g = new THREE.PlaneGeometry(7000, 7000, 220, 220);
		g.rotateX(-Math.PI / 2);
		const p = g.getAttribute('position') as THREE.BufferAttribute;
		const n2 = (x: number, z: number) => Math.sin(x * 0.0031 + Math.sin(z * 0.0021) * 1.7) * Math.cos(z * 0.0027 + Math.sin(x * 0.0017) * 1.3);
		for (let i = 0; i < p.count; i++) {
			const x = p.getX(i);
			const z = p.getZ(i);
			const r = Math.hypot(x, z);
			const flat = THREE.MathUtils.smoothstep(r, 1050, 1700);
			const h = n2(x, z) * 28 + Math.sin(x * 0.013) * Math.cos(z * 0.011) * 5 + (r > 2200 ? (r - 2200) * 0.08 : 0);
			p.setY(i, -1.5 + h * flat + (1 - flat) * Math.sin(x * 0.02) * Math.cos(z * 0.017) * 0.8);
		}
		g.computeVertexNormals();
		return g;
	}, []);
	const mat = useMemo(() => rockMat(sh, {base, rough: 0.4}), [sh, base]);
	return <mesh geometry={geo} material={mat} />;
};

// ---------- ROV "YANKI" ----------
export const rovGeos = () => {
	const foam = new RoundedBoxGeometry(2.7, 0.62, 1.7, 3, 0.12).translate(0, 0.85, 0);
	const frameParts = [
		new THREE.BoxGeometry(2.6, 0.08, 0.08).translate(0, -0.45, 0.78),
		new THREE.BoxGeometry(2.6, 0.08, 0.08).translate(0, -0.45, -0.78),
		new THREE.BoxGeometry(0.08, 1.2, 0.08).translate(1.25, 0.1, 0.78),
		new THREE.BoxGeometry(0.08, 1.2, 0.08).translate(-1.25, 0.1, 0.78),
		new THREE.BoxGeometry(0.08, 1.2, 0.08).translate(1.25, 0.1, -0.78),
		new THREE.BoxGeometry(0.08, 1.2, 0.08).translate(-1.25, 0.1, -0.78),
		new THREE.BoxGeometry(0.08, 0.08, 1.6).translate(1.25, -0.45, 0),
		new THREE.BoxGeometry(0.08, 0.08, 1.6).translate(-1.25, -0.45, 0),
		new RoundedBoxGeometry(1.6, 0.5, 0.9, 2, 0.08).translate(-0.1, 0.1, 0), // elektronik gövde
	];
	const thr: THREE.BufferGeometry[] = [];
	[[1.05, 0.35], [-1.05, 0.35], [1.05, -0.35], [-1.05, -0.35]].forEach(([x, s]) => {
		const duct = new THREE.CylinderGeometry(0.2, 0.2, 0.28, 18, 1, true).rotateZ(Math.PI / 2).rotateY(s > 0 ? 0.6 : -0.6).translate(x, 0.05, Math.sign(s) * 0.62);
		thr.push(duct);
	});
	thr.push(new THREE.CylinderGeometry(0.18, 0.18, 0.25, 18, 1, true).translate(0.45, 1.25, 0), new THREE.CylinderGeometry(0.18, 0.18, 0.25, 18, 1, true).translate(-0.45, 1.25, 0));
	const lampHousing = [
		new THREE.CylinderGeometry(0.11, 0.13, 0.26, 16).rotateZ(Math.PI / 2).translate(1.42, 0.45, 0.55),
		new THREE.CylinderGeometry(0.11, 0.13, 0.26, 16).rotateZ(Math.PI / 2).translate(1.42, 0.45, -0.55),
		new THREE.SphereGeometry(0.2, 20, 12, 0, Math.PI).rotateY(Math.PI / 2).translate(1.36, -0.05, 0), // kamera kubbesi
	];
	const arm = [
		new THREE.BoxGeometry(0.7, 0.09, 0.09).rotateZ(-0.4).translate(1.5, -0.35, 0.3),
		new THREE.BoxGeometry(0.5, 0.08, 0.08).rotateZ(0.5).translate(1.9, -0.42, 0.3),
		new THREE.BoxGeometry(0.16, 0.1, 0.05).translate(2.12, -0.32, 0.32),
	];
	const lampFace = mergeGeometries([
		new THREE.CircleGeometry(0.1, 16).rotateY(Math.PI / 2).translate(1.56, 0.45, 0.55),
		new THREE.CircleGeometry(0.1, 16).rotateY(Math.PI / 2).translate(1.56, 0.45, -0.55),
	]);
	return {foam, frame: mergeGeometries(frameParts), thr: mergeGeometries(thr), dark: mergeGeometries([...lampHousing, ...arm]), lampFace};
};

const Rov: React.FC<{sh: Shared; pos: V3; yaw: number; pitch: number; beams: number; spread: number; tether: boolean}> = ({sh, pos, yaw, pitch, beams, spread, tether}) => {
	const g = useMemo(() => rovGeos(), []);
	const m = useMemo(
		() => ({
			foam: structMat(sh, {base: '#d9a21b', glow: '#000000', hex: 0.0001, veins: 0, mode: 1, glowAmt: 0}),
			frame: structMat(sh, {base: '#8d969e', glow: '#000000', hex: 0.0001, veins: 0, mode: 1, glowAmt: 0}),
			dark: structMat(sh, {base: '#1d2228', glow: '#000000', hex: 0.0001, veins: 0, mode: 1, glowAmt: 0}),
			face: glowMat(sh, {color: '#fff6e8', i: 4, kind: 2}),
			beam: glowMat(sh, {color: '#e8f4ff', i: 0.5, kind: 1}),
			halo: glowMat(sh, {color: '#fff2dc', i: 1.2, kind: 0}),
			cable: structMat(sh, {base: '#c9c2b0', glow: '#000000', hex: 0.0001, veins: 0, mode: 1, glowAmt: 0}),
		}),
		[sh],
	);
	const L = 26;
	const coneR = Math.tan(spread) * L;
	const beamGeo = useMemo(() => new THREE.CylinderGeometry(0.06, coneR, L, 28, 1, true).translate(0, -L / 2, 0).rotateZ(Math.PI / 2), [coneR]);
	const cableGeo = useMemo(() => new THREE.CylinderGeometry(0.02, 0.02, 60, 6).translate(0, 31, 0), []);
	return (
		<group position={pos} rotation={[0, yaw, pitch]}>
			<mesh geometry={g.foam} material={m.foam} />
			<mesh geometry={g.frame} material={m.frame} />
			<mesh geometry={g.thr} material={m.dark} />
			<mesh geometry={g.dark} material={m.dark} />
			<mesh geometry={g.lampFace} material={m.face} />
			{beams > 0.01 ? (
				<>
					<mesh geometry={beamGeo} material={m.beam} position={[1.56, 0.45, 0.55]} rotation={[0, 0.06, 0]} scale={[1, 1, 1]} />
					<mesh geometry={beamGeo} material={m.beam} position={[1.56, 0.45, -0.55]} rotation={[0, -0.06, 0]} />
				</>
			) : null}
			{tether ? <mesh geometry={cableGeo} material={m.cable} position={[-0.2, 1.1, 0]} /> : null}
		</group>
	);
};

// ---------- Bilinmeyen varlık (tam gösterilmez; siluet + ışık deseni) ----------
const Being: React.FC<{sh: Shared; vis: number; pos: V3; yaw: number; scale: number; frame: number; fps: number}> = ({sh, vis, pos, yaw, scale, frame, fps}) => {
	const geos = useMemo(() => {
		const prof: [number, number][] = [
			[0.1, 34], [1.6, 32.5], [2.6, 30], [3.1, 27], [4.6, 24], [5.6, 20], [5.2, 15], [4.0, 10], [3.0, 6], [2.0, 2], [1.0, -2], [0.2, -5],
		];
		const body = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 48);
		const limbs: THREE.BufferGeometry[] = [];
		for (let i = 0; i < 6; i++) {
			const a = (i / 6) * Math.PI * 2;
			const c = new THREE.CatmullRomCurve3([
				new THREE.Vector3(Math.cos(a) * 3.5, 14, Math.sin(a) * 3.5),
				new THREE.Vector3(Math.cos(a) * 7, 2, Math.sin(a) * 7),
				new THREE.Vector3(Math.cos(a + 0.3) * 9, -14, Math.sin(a + 0.3) * 9),
				new THREE.Vector3(Math.cos(a + 0.5) * 8, -30, Math.sin(a + 0.5) * 8),
			]);
			limbs.push(new THREE.TubeGeometry(c, 48, 0.55 - (i % 2) * 0.15, 8, false));
		}
		return {body, limbs: mergeGeometries(limbs)};
	}, []);
	const mats = useMemo(() => {
		const u = {...sh, uVis: {value: 1}, uGlow: {value: new THREE.Color('#5ff7ff')}} as unknown as Record<string, THREE.IUniform>;
		const body = new THREE.ShaderMaterial({uniforms: u, vertexShader: STRUCT_VERT, fragmentShader: BEING_FRAG});
		const limbU = {...u, uAmp: {value: 2.2}, uFreq: {value: 0.7}, uAxis: {value: 1}} as Record<string, THREE.IUniform>;
		const limb = new THREE.ShaderMaterial({uniforms: limbU, vertexShader: SWAY_VERT, fragmentShader: BEING_FRAG});
		return {body, limb};
	}, [sh]);
	if (vis <= 0.001) return null;
	const bob = Math.sin((frame / fps) * 0.4) * 0.8;
	return (
		<group position={[pos[0], pos[1] + bob, pos[2]]} rotation={[0, yaw, 0.05]} scale={scale * (0.97 + 0.03 * vis)}>
			<mesh geometry={geos.body} material={mats.body} />
			<mesh geometry={geos.limbs} material={mats.limb} />
		</group>
	);
};

// ---------- Hidrotermal baca alanı (gerçek doğa olgusu) ----------
const Vents: React.FC<{sh: Shared; pos: V3}> = ({sh, pos}) => {
	const data = useMemo(() => {
		const R = rng(5);
		const chim: THREE.BufferGeometry[] = [];
		const stacks: {x: number; z: number; h: number}[] = [];
		for (let i = 0; i < 5; i++) {
			const x = (R() - 0.5) * 16;
			const z = (R() - 0.5) * 12;
			const h = 6 + R() * 9;
			stacks.push({x, z, h});
			const g = new THREE.CylinderGeometry(0.5 + R() * 0.4, 1.6 + R(), h, 14, 10);
			const p = g.getAttribute('position') as THREE.BufferAttribute;
			for (let k = 0; k < p.count; k++) {
				const y = p.getY(k);
				const s = 1 + 0.22 * Math.sin(y * 2.3 + k * 0.7) + 0.12 * Math.sin(k * 1.31);
				p.setX(k, p.getX(k) * s);
				p.setZ(k, p.getZ(k) * s);
			}
			g.computeVertexNormals();
			chim.push(g.translate(x, h / 2, z));
		}
		const mound = new THREE.SphereGeometry(14, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.25, 0.8);
		// tüp solucanları: beyaz tüp + kırmızı uç
		const tubes: THREE.BufferGeometry[] = [];
		const tips: THREE.BufferGeometry[] = [];
		for (let i = 0; i < 160; i++) {
			const s = stacks[i % stacks.length];
			const a = R() * Math.PI * 2;
			const rr = 1.6 + R() * 3.2;
			const h = 0.6 + R() * 1.6;
			const x = s.x + Math.cos(a) * rr;
			const z = s.z + Math.sin(a) * rr;
			const tilt = (R() - 0.5) * 0.5;
			tubes.push(new THREE.CylinderGeometry(0.045, 0.06, h, 6).rotateZ(tilt).translate(x, h / 2 + 0.3, z));
			tips.push(new THREE.SphereGeometry(0.09, 8, 6).scale(1, 1.6, 1).translate(x - Math.sin(tilt) * h * 0.5, h + 0.35, z));
		}
		return {chim: mergeGeometries(chim), mound, tubes: mergeGeometries(tubes), tips: mergeGeometries(tips), stacks};
	}, []);
	const mats = useMemo(() => {
		const smoke = (seed: number) =>
			new THREE.ShaderMaterial({
				uniforms: {...sh, uSeedS: {value: seed}} as unknown as Record<string, THREE.IUniform>,
				vertexShader: GLOW_VERT,
				fragmentShader: SMOKE_FRAG,
				transparent: true,
				depthWrite: false,
				side: THREE.DoubleSide,
			});
		return {
			chim: rockMat(sh, {base: '#3a312b', rough: 1.0}),
			mound: rockMat(sh, {base: '#4a3f38', rough: 0.6}),
			tube: rockMat(sh, {base: '#d9d6cf', rough: 0.2}),
			tip: rockMat(sh, {base: '#c2202a', rough: 0.2}),
			smokes: [0, 1, 2, 3, 4].map((i) => smoke(i * 3.7)),
		};
	}, [sh]);
	const camera = useThree((s) => s.camera);
	const plane = useMemo(() => new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), []);
	return (
		<group position={pos}>
			<mesh geometry={data.mound} material={mats.mound} />
			<mesh geometry={data.chim} material={mats.chim} />
			<mesh geometry={data.tubes} material={mats.tube} />
			<mesh geometry={data.tips} material={mats.tip} />
			{data.stacks.map((s, i) => {
				const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(camera.position.x - (pos[0] + s.x), camera.position.z - (pos[2] + s.z)), 0));
				return <mesh key={i} geometry={plane} material={mats.smokes[i]} position={[s.x, s.h - 0.2, s.z]} quaternion={q} scale={[7, 30, 7]} renderOrder={6} />;
			})}
		</group>
	);
};

// ---------- Bazalt sütunları (doğal geometri karşılaştırması) ----------
const Basalt: React.FC<{sh: Shared; pos: V3}> = ({sh, pos}) => {
	const geo = useMemo(() => {
		const R = rng(12);
		const gs: THREE.BufferGeometry[] = [];
		for (let i = -6; i <= 6; i++)
			for (let j = -4; j <= 4; j++) {
				const x = i * 1.55 + (j % 2) * 0.78 + (R() - 0.5) * 0.25;
				const z = j * 1.35 + (R() - 0.5) * 0.25;
				const h = 2 + R() * 3 + Math.max(0, 4 - Math.hypot(i, j)) * 0.8;
				const sides = R() > 0.75 ? 5 : R() > 0.9 ? 7 : 6;
				gs.push(new THREE.CylinderGeometry(0.72 + R() * 0.12, 0.8, h, sides).rotateY(R()).rotateZ((R() - 0.5) * 0.08).translate(x, h / 2, z));
			}
		return mergeGeometries(gs.map((g) => g.toNonIndexed()));
	}, []);
	const mat = useMemo(() => rockMat(sh, {base: '#45464a', rough: 0.7}), [sh]);
	return <mesh geometry={geo} material={mat} position={pos} />;
};

// ---------- Salyangoz balığı (bilinen en derin balık ailesi; temsili) ----------
const Fish: React.FC<{sh: Shared; pos: V3; yaw: number}> = ({sh, pos, yaw}) => {
	const geo = useMemo(() => {
		const prof: [number, number][] = [[0, 0.16], [0.03, 0.15], [0.05, 0.1], [0.052, 0.04], [0.045, -0.04], [0.03, -0.12], [0.012, -0.2], [0.001, -0.26]];
		const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 24).rotateZ(Math.PI / 2);
		const tail = new THREE.PlaneGeometry(0.12, 0.08, 6, 2).translate(-0.3, 0, 0);
		return mergeGeometries([g.toNonIndexed(), tail.toNonIndexed()]);
	}, []);
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				uniforms: {...sh, uAmp: {value: 0.035}, uFreq: {value: 6}, uAxis: {value: 0}} as unknown as Record<string, THREE.IUniform>,
				vertexShader: SWAY_VERT,
				fragmentShader: FISH_FRAG,
				side: THREE.DoubleSide,
			}),
		[sh],
	);
	return <mesh geometry={geo} material={mat} position={pos} rotation={[0, yaw, 0]} scale={2.2} />;
};

// ---------- Deniz karı ----------
const Snow: React.FC<{sh: Shared; n: number; size: number; pxScale: number}> = ({sh, n, size, pxScale}) => {
	const {g, m} = useMemo(() => {
		const R = rng(33);
		const P = new Float32Array(n * 3);
		const S = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			P[i * 3] = (R() - 0.5) * 36;
			P[i * 3 + 1] = (R() - 0.5) * 26;
			P[i * 3 + 2] = (R() - 0.5) * 36;
			S[i] = R();
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
		geo.setAttribute('aSeed', new THREE.BufferAttribute(S, 1));
		geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
		return {g: geo, m: snowMat(sh)};
	}, [sh, n]);
	m.uniforms.uSize.value = size;
	m.uniforms.uPxScale.value = pxScale;
	return <points geometry={g} material={m} frustumCulled={false} />;
};

const Background: React.FC<{sh: Shared; glowDir: THREE.Vector3; glow: string}> = ({sh, glowDir, glow}) => {
	const camera = useThree((s) => s.camera);
	const geo = useMemo(() => new THREE.SphereGeometry(6000, 32, 16), []);
	const mat = useMemo(() => bgMat(sh), [sh]);
	mat.uniforms.uGlowDir.value.copy(glowDir);
	mat.uniforms.uGlowCol.value.set(glow).multiplyScalar(0.16);
	return <mesh geometry={geo} material={mat} position={camera.position.clone()} renderOrder={-10} />;
};

// ---------- Sahne içi kontrol (uniform güncellemesi) ----------
const Director: React.FC<{p: DeepProps; sh: Shared; layout: CityLayout | null; frame: number; fps: number}> = ({p, sh, layout, frame, fps}) => {
	const {camera} = useThree();
	const cam = camera as THREE.PerspectiveCamera;
	if (cam.far < 9000) {
		cam.far = 12000;
		cam.near = 0.05;
		cam.updateProjectionMatrix();
	}
	const t = frame / fps;
	sh.uTime.value = t;
	const sig = vec(frame, p.water?.sigma, [0.11, 0.045, 0.032]);
	sh.uSigma.value.set(sig[0], sig[1], sig[2]);
	sh.uWater.value.set(p.water?.color ?? '#01050a');
	sh.uAmb.value.set(p.water?.amb ?? '#040a10');
	sh.uSurface.value = num(frame, p.water?.surface, 0);
	sh.uSurfCol.value.set(p.water?.surfCol ?? '#1a5a8c');
	sh.uPower.value = p.city?.show === false ? 0 : num(frame, p.city?.power, 1);
	// sinyal nabzı: verilen vuruşlarda keskin tepe, yoksa yavaş solunum
	let pulse = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / (p.city?.period ?? 4.2));
	if (p.city?.beats?.length) {
		pulse = 0;
		for (const b of p.city.beats) if (frame >= b) pulse = Math.max(pulse, Math.exp(-(frame - b) / (0.3 * fps)));
	}
	sh.uPulse.value = pulse;
	// lambalar
	const mode = p.lamps?.mode ?? 'cam';
	sh.uLampI.value = mode === 'off' ? 0 : num(frame, p.lamps?.i, 7);
	sh.uLampCos.value = Math.cos(p.lamps?.spread ?? 0.42);
	const fwd = new THREE.Vector3();
	const right = new THREE.Vector3();
	const up = new THREE.Vector3();
	if (mode === 'rov' && p.rov) {
		const rp = vec(frame, p.rov.pos, [0, 20, 0]);
		const yaw = num(frame, p.rov.yaw, 0);
		const pitch = num(frame, p.rov.pitch, 0);
		const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, pitch));
		fwd.set(1, 0, 0).applyQuaternion(q);
		up.set(0, 1, 0).applyQuaternion(q);
		right.set(0, 0, 1).applyQuaternion(q);
		[0.55, -0.55].forEach((s, i) => {
			sh.uLampPos.value[i].set(rp[0], rp[1], rp[2]).addScaledVector(fwd, 1.56).addScaledVector(up, 0.45).addScaledVector(right, s);
			sh.uLampDir.value[i].copy(fwd).addScaledVector(right, -s * 0.11).normalize();
		});
	} else {
		cam.getWorldDirection(fwd);
		right.crossVectors(fwd, cam.up).normalize();
		up.crossVectors(right, fwd).normalize();
		[0.8, -0.8].forEach((s, i) => {
			sh.uLampPos.value[i].copy(cam.position).addScaledVector(right, s).addScaledVector(up, -0.35).addScaledVector(fwd, 0.2);
			sh.uLampDir.value[i].copy(fwd).addScaledVector(right, -s * 0.03).addScaledVector(up, -0.05).normalize();
		});
	}
	// şehir ışıkları → yakındaki yüzeyleri aydınlatan nokta ışıklar
	const glowC = new THREE.Color(p.city?.glow ?? '#35f2e0');
	const pw = sh.uPower.value;
	sh.uCoreCol.value.copy(glowC).multiplyScalar(p.city && p.city.show !== false ? (p.city as {scatter?: number}).scatter ?? 0.13 : 0);
	const pts: [V3, number][] = [[[0, 200, 0], 3200]];
	if (layout) {
		const near = [...layout.domes].sort((a, b) => Math.hypot(a.x - cam.position.x, a.z - cam.position.z) - Math.hypot(b.x - cam.position.x, b.z - cam.position.z)).slice(0, 3);
		near.forEach((d) => pts.push([[d.x, d.r * 0.5, d.z], 260 + d.r * 4]));
	}
	for (let i = 0; i < 4; i++) {
		const pp = pts[i];
		if (!pp || !p.city || p.city.show === false) {
			sh.uPtPos.value[i].set(0, -1e5, 0);
			sh.uPtCol.value[i].set(0, 0, 0);
			continue;
		}
		sh.uPtPos.value[i].set(pp[0][0], pp[0][1], pp[0][2]);
		const k = pp[1] * pw * (0.85 + 0.15 * pulse) * 0.0011;
		sh.uPtCol.value[i].set(glowC.r * k, glowC.g * k, glowC.b * k);
	}
	return null;
};

export const DeepScene: React.FC<DeepProps> = (p) => {
	const frame = useCurrentFrame();
	const {fps, height} = useVideoConfig();
	const sh = useSharedUniforms();
	const layout = useMemo(() => (p.city && p.city.show !== false ? cityLayout(p.city.seed ?? 7) : null), [p.city]);
	const scale = p.stage?.scale ?? 0.6;
	const glow = p.city?.glow ?? '#35f2e0';
	const rovPos = vec(frame, p.rov?.pos, [0, 20, 0]);
	const glitch = num(frame, p.hud?.glitch, 0);
	const gx = glitch > 0 ? (Math.sin(frame * 12.9898) * 43758.5453 % 1) * 40 * glitch * (Math.sin(frame * 0.7) > 0.2 ? 1 : 0.15) : 0;
	const glowDir = new THREE.Vector3(0, 200, 0);
	const pxScale = (height * scale) / (2 * Math.tan((((p.camera.keys[0]?.fov ?? 35) * Math.PI) / 180) / 2));
	return (
		<AbsoluteFill style={{background: '#01040a'}}>
			<AbsoluteFill style={glitch > 0 ? {transform: `translateX(${gx}px)`, filter: `saturate(${1 - glitch * 0.5}) contrast(${1 + glitch * 0.4})`} : undefined}>
				<Stage3D bg="#01040a" exposure={p.stage?.exposure ?? 1.0} shadows={false} scale={scale}>
					<CameraRig spec={{shake: 0.02, ...p.camera}} />
					<Director p={p} sh={sh} layout={layout} frame={frame} fps={fps} />
					<GlowDir target={glowDir} />
					<Background sh={sh} glowDir={glowDir} glow={glow} />
					{p.seabed?.show !== false ? <Seabed sh={sh} base={p.seabed?.base ?? '#5c574f'} /> : null}
					{layout ? <City sh={sh} layout={layout} glow={glow} frame={frame} fps={fps} /> : null}
					{p.vents?.show ? <Vents sh={sh} pos={p.vents.pos ?? [0, 0, 0]} /> : null}
					{p.basalt?.show ? <Basalt sh={sh} pos={p.basalt.pos ?? [0, 0, 0]} /> : null}
					{p.fish?.show ? <Fish sh={sh} pos={vec(frame, p.fish.pos, [0, 2, 0])} yaw={num(frame, p.fish.yaw, 0)} /> : null}
					{p.rov?.show ? (
						<Rov
							sh={sh}
							pos={rovPos}
							yaw={num(frame, p.rov.yaw, 0)}
							pitch={num(frame, p.rov.pitch, 0)}
							beams={p.lamps?.mode === 'rov' ? num(frame, p.lamps?.beams, 1) : 0}
							spread={p.lamps?.spread ?? 0.42}
							tether={p.rov.tether ?? true}
						/>
					) : null}
					{p.being ? (
						<Being sh={sh} vis={num(frame, p.being.vis, 1)} pos={vec(frame, p.being.pos, [0, 30, -60])} yaw={num(frame, p.being.yaw, 0)} scale={p.being.scale ?? 1} frame={frame} fps={fps} />
					) : null}
					<Snow sh={sh} n={p.snow?.n ?? 2600} size={p.snow?.size ?? 0.05} pxScale={pxScale} />
				</Stage3D>
			</AbsoluteFill>
			<Grade spec={p.grade} lamp={p.lamps?.mode === 'cam' ? num(frame, p.lamps?.i, 7) / 7 : 0} />
			{p.hud ? <Hud spec={p.hud} /> : null}
			{p.tag ? <Tag text={p.tag} color={p.tagColor} style={{right: 80, top: p.hud ? 150 : 56}} /> : null}
			{p.chapter ? <Chapter spec={p.chapter} /> : null}
			{p.titles ? <Titles titles={p.titles} /> : null}
		</AbsoluteFill>
	);
};

// Parıltı yönü: kameradan kule çekirdeğine
const GlowDir: React.FC<{target: THREE.Vector3}> = ({target}) => {
	const camera = useThree((s) => s.camera);
	const d = new THREE.Vector3(0, 200, 0).sub(camera.position).normalize();
	target.copy(d);
	return null;
};
