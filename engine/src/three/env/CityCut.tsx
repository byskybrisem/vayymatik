// Derinkuyu AÇIKLAYICI yeraltı kesiti: kaya yüzü yükseklik alanıdır (gerçek 3D oyuklar, kuyu, bacalar, merdivenler),
// kaya katmanları + pişirilmiş (vertex) ışık/AO; odalarda küp, ocak, hayvan, köylü ve meşale. Doğrulanmış kat planı DEĞİLDİR.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {easeFn, NumKey, num, rng} from '../core/math';
import {fbm, smoothstep} from '../core/noise';
import {mat} from '../core/materials';
import {glowTexture} from '../core/textures';
import {Villager} from '../character/Villager';
import {Flame} from '../fx/Flame';
import {DONKEYS, FACE, JAR_FIELDS, ROOMS, SEGS, TORCHES, VILLAGERS} from './cityLayout';

const STEP = 0.42;
const SEED = 41;

const sdRoom = (x: number, y: number, r: (typeof ROOMS)[number]) => {
	const cx = (r.x0 + r.x1) / 2;
	const cy = (r.y0 + r.y1) / 2;
	const hx = (r.x1 - r.x0) / 2;
	const hy = (r.y1 - r.y0) / 2;
	const rad = Math.min(1.8, hx * 0.5, hy * 0.6);
	const qx = Math.abs(x - cx) - hx + rad;
	const qy = Math.abs(y - cy) - hy + rad;
	return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad;
};
const sdSeg = (x: number, y: number, s: (typeof SEGS)[number]) => {
	const [ax, ay] = s.a;
	const [bx, by] = s.b;
	const abx = bx - ax;
	const aby = by - ay;
	const t = Math.min(1, Math.max(0, ((x - ax) * abx + (y - ay) * aby) / (abx * abx + aby * aby)));
	return Math.hypot(x - (ax + abx * t), y - (ay + aby * t)) - s.w / 2;
};

const TUFF = ['#c3a47e', '#b98f76', '#caa86a', '#a89683', '#b79c78'].map((c) => new THREE.Color(c));
const rockColor = (x: number, y: number, c: THREE.Color) => {
	const band = fbm(x * 0.045 + 3, y * 0.22, SEED + 5, 3) * 3.2 + y * 0.06;
	const i = Math.floor(((band % 5) + 5) % 5);
	const f = band - Math.floor(band);
	c.copy(TUFF[i]).lerp(TUFF[(i + 1) % 5], f);
	const n = fbm(x * 0.38, y * 0.38, SEED + 9, 3);
	c.multiplyScalar(0.7 + n * 0.5);
	const deep = Math.min(1, Math.max(0, -y / 100));
	c.multiplyScalar(1 - deep * 0.38);
	c.lerp(new THREE.Color('#5d6475'), deep * 0.22);
	return c;
};

type Built = {geo: THREE.BufferGeometry; glowGeo: THREE.BufferGeometry};

const buildFace = (): Built => {
	const nx = Math.round((FACE.x1 - FACE.x0) / STEP);
	const ny = Math.round((FACE.y1 - FACE.y0) / STEP);
	const pos = new Float32Array((nx + 1) * (ny + 1) * 3);
	const col = new Float32Array((nx + 1) * (ny + 1) * 3);
	const glow = new Float32Array((nx + 1) * (ny + 1) * 3);
	const c = new THREE.Color();
	const warm = new THREE.Color('#ff8a2a');
	let k = 0;
	for (let j = 0; j <= ny; j++) {
		const y = FACE.y1 - (j / ny) * (FACE.y1 - FACE.y0);
		for (let i = 0; i <= nx; i++) {
			const x = FACE.x0 + (i / nx) * (FACE.x1 - FACE.x0);
			// oyuk maskeleri
			let m = 0;
			let zc = 0;
			let dep = 0;
			for (const r of ROOMS) {
				const sd = sdRoom(x, y, r);
				if (sd > 0.6) continue;
				const mm = smoothstep(0.34, -0.2, sd);
				if (mm > 0) {
					zc = Math.min(zc, -r.d * mm);
					m = Math.max(m, mm);
					dep = Math.max(dep, r.d);
				}
			}
			for (const s of SEGS) {
				const sd = sdSeg(x, y, s);
				if (sd > 0.6) continue;
				const mm = smoothstep(0.34, -0.2, sd);
				if (mm > 0) {
					zc = Math.min(zc, -s.d * mm);
					m = Math.max(m, mm);
					dep = Math.max(dep, s.d);
				}
			}
			// dış yüz: kaya çıkıntıları ve katman basamakları
			const bulge = (fbm(x * 0.11, y * 0.11, SEED, 3) - 0.5) * 1.8;
			const ledge = Math.sin(y * 1.1 + fbm(x * 0.2, y * 0.2, SEED + 2, 2) * 6) * 0.14;
			const rough = (fbm(x * 0.55, y * 0.55, SEED + 4, 3) - 0.5) * 0.34;
			const z = zc + (bulge + ledge) * (1 - m) + rough * (1 - m * 0.65);
			pos[k] = x;
			pos[k + 1] = y;
			pos[k + 2] = z;
			rockColor(x, y, c);
			let aoDark = 1;
			if (m > 0.02) {
				const inside = smoothstep(0.55, 1, m);
				aoDark = 1 - inside * 0.62 - (1 - inside) * m * 0.45;
				// tavan isi / kararma: odanın üstüne doğru koyulaşır
				c.multiplyScalar(aoDark);
			}
			// torç ışığı (pişirilmiş): oyuk içi sıcak parıltı
			let g = 0;
			if (m > 0.35) {
				for (const t of TORCHES) {
					const dx = x - t.p[0];
					const dy = y - t.p[1];
					const d2 = dx * dx + dy * dy;
					const R = 5.2 * (t.size ?? 1);
					if (d2 < R * R * 4) g += Math.exp(-d2 / (R * R)) * (t.size ?? 1) * Math.min(1, -zc / 2.4);
				}
			}
			g = Math.min(1.3, g);
			col[k] = c.r;
			col[k + 1] = c.g;
			col[k + 2] = c.b;
			const gi = g * (0.35 + 0.65 * smoothstep(0.35, 1, m));
			glow[k] = warm.r * gi * 0.2;
			glow[k + 1] = warm.g * gi * 0.2;
			glow[k + 2] = warm.b * gi * 0.2;
			k += 3;
		}
	}
	const idx: number[] = [];
	for (let j = 0; j < ny; j++) {
		for (let i = 0; i < nx; i++) {
			const a = j * (nx + 1) + i;
			const b = a + 1;
			const cc = a + nx + 1;
			const d = cc + 1;
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

let FACE_CACHE: Built | null = null;
const getFace = () => (FACE_CACHE ??= buildFace());

// Örtü plakaları: yüzün üstünü kaplayan toprak/kaya katmanları (açılış animasyonu)
const PLATES = [
	{y0: 0.4, y1: -4},
	{y0: -4, y1: -17},
	{y0: -17, y1: -36},
	{y0: -36, y1: -60},
	{y0: -60, y1: -97},
];
const buildPlate = (y0: number, y1: number) => {
	const w = FACE.x1 - FACE.x0;
	const h = y0 - y1;
	const g = new THREE.BoxGeometry(w, h, 1.0, Math.round(w / 0.8), Math.max(2, Math.round(h / 0.8)), 1);
	const p = g.getAttribute('position');
	const cols = new Float32Array(p.count * 3);
	const c = new THREE.Color();
	for (let i = 0; i < p.count; i++) {
		const x = p.getX(i);
		const y = p.getY(i) + (y0 + y1) / 2;
		const z = p.getZ(i);
		rockColor(x, y, c);
		const topFace = z > 0 ? 1 : 0.7;
		c.multiplyScalar(topFace * (0.92 + 0.16 * fbm(x * 0.5, y * 0.5, SEED + 20, 2)));
		cols[i * 3] = c.r;
		cols[i * 3 + 1] = c.g;
		cols[i * 3 + 2] = c.b;
		if (z > 0) p.setZ(i, z + (fbm(x * 0.4, y * 0.4, SEED + 30, 3) - 0.5) * 0.5);
	}
	g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
	g.computeVertexNormals();
	return g;
};

const FloorSlabs: React.FC = () => {
	const items = useMemo(() => ROOMS.map((r) => ({r, g: new THREE.BoxGeometry(r.x1 - r.x0 - 0.5, 0.35, r.d - 0.1)})), []);
	const m = mat({color: '#8a7358', rough: 0.95});
	return (
		<>
			{items.map(({r, g}) => (
				<mesh key={r.id} geometry={g} material={m} position={[(r.x0 + r.x1) / 2, r.y0 - 0.17, -(r.d - 0.1) / 2]} receiveShadow />
			))}
		</>
	);
};

const PITHOS = (() => {
	const pts = [
		[0.001, 0],
		[0.2, 0.02],
		[0.32, 0.18],
		[0.4, 0.42],
		[0.34, 0.72],
		[0.2, 0.86],
		[0.22, 0.96],
		[0.27, 1.0],
		[0.2, 1.02],
	].map(([x, y]) => new THREE.Vector2(x, y));
	return new THREE.LatheGeometry(pts, 10);
})();

const Jars: React.FC = () => {
	const meshes = useMemo(() => {
		return JAR_FIELDS.map((f) => {
			const n = f.cols * f.rows;
			const im = new THREE.InstancedMesh(PITHOS, new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 0.85, flatShading: true}), n);
			const r = rng(f.seed);
			const d = new THREE.Object3D();
			const c = new THREE.Color();
			let q = 0;
			for (let row = 0; row < f.rows; row++) {
				for (let col = 0; col < f.cols; col++) {
					const s = 0.8 + r() * 0.65;
					d.position.set(f.origin[0] + col * f.dx + (r() - 0.5) * 0.15, f.origin[1], f.origin[2] + row * f.dz + (r() - 0.5) * 0.2);
					d.rotation.set(0, r() * 6, 0);
					d.scale.set(s, s * (0.9 + r() * 0.3), s);
					d.updateMatrix();
					im.setMatrixAt(q, d.matrix);
					c.set(['#a86a40', '#9a5c36', '#b9784a', '#8a5a3a'][Math.floor(r() * 4)]);
					im.setColorAt(q, c);
					q++;
				}
			}
			im.instanceMatrix.needsUpdate = true;
			if (im.instanceColor) im.instanceColor.needsUpdate = true;
			im.castShadow = true;
			im.frustumCulled = false;
			return im;
		});
	}, []);
	return (
		<>
			{meshes.map((m, i) => (
				<primitive key={i} object={m} />
			))}
		</>
	);
};

const donkeyG = {
	body: new THREE.BoxGeometry(1.15, 0.58, 0.46),
	neck: new THREE.BoxGeometry(0.22, 0.55, 0.2),
	head: new THREE.BoxGeometry(0.4, 0.22, 0.2),
	ear: new THREE.ConeGeometry(0.05, 0.22, 4),
	leg: new THREE.CylinderGeometry(0.06, 0.045, 0.7, 5),
	tail: new THREE.CylinderGeometry(0.02, 0.04, 0.45, 4),
};
const Donkey: React.FC<{color: string; phase: number}> = ({color, phase}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps + phase;
	const bob = Math.sin(t * 1.1) * 0.12;
	const m = mat({color, rough: 0.95});
	const dark = mat({color: '#2b211b', rough: 0.9});
	return (
		<group>
			<mesh geometry={donkeyG.body} material={m} position={[0, 0.98, 0]} castShadow />
			{[
				[-0.45, -0.15],
				[-0.45, 0.15],
				[0.45, -0.15],
				[0.45, 0.15],
			].map(([x, z], i) => (
				<mesh key={i} geometry={donkeyG.leg} material={m} position={[x, 0.4, z]} />
			))}
			<group position={[0.58, 1.22, 0]} rotation={[0, 0, -0.5 + bob * 0.5]}>
				<mesh geometry={donkeyG.neck} material={m} position={[0, 0.2, 0]} />
				<group position={[0.12, 0.5, 0]} rotation={[0, 0, -0.9 - bob]}>
					<mesh geometry={donkeyG.head} material={m} position={[0.14, 0, 0]} />
					<mesh geometry={donkeyG.ear} material={dark} position={[0.02, 0.18, 0.07]} />
					<mesh geometry={donkeyG.ear} material={dark} position={[0.02, 0.18, -0.07]} />
				</group>
			</group>
			<mesh geometry={donkeyG.tail} material={dark} position={[-0.62, 1.05, 0]} rotation={[0, 0, 0.25 + Math.sin(t * 2) * 0.1]} />
		</group>
	);
};

const Props: React.FC = () => {
	const frame = useCurrentFrame();
	const hay = mat({color: '#c9a64e', rough: 1});
	const rug1 = mat({color: '#8c2f2a', rough: 1});
	const rug2 = mat({color: '#2f5a6c', rough: 1});
	const wood = mat({color: '#5b3a26', rough: 0.9});
	const iron = mat({color: '#2a2622', rough: 0.6, metal: 0.4});
	const water = useMemo(() => new THREE.MeshStandardMaterial({color: '#2a6f95', emissive: '#1b88bf', emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.2}), []);
	const bucketY = -40 + Math.sin(frame / 38) * 38;
	return (
		<>
			{/* mutfak: ocak taşları + kazan */}
			<mesh position={[-13.4, -12.6, -3.6]} castShadow>
				<cylinderGeometry args={[0.9, 1.05, 0.7, 7]} />
				<meshStandardMaterial color="#6e5a48" roughness={1} flatShading />
			</mesh>
			<mesh position={[-13.4, -11.75, -3.6]} castShadow>
				<sphereGeometry args={[0.62, 10, 7, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55]} />
				<meshStandardMaterial color="#2a2622" roughness={0.5} metalness={0.5} flatShading side={THREE.DoubleSide} />
			</mesh>
			{/* mutfak rafları / testiler */}
			{[0, 1, 2, 3, 4].map((i) => (
				<mesh key={'p' + i} position={[-15.6 + i * 0.55, -9.4 + (i % 2) * 0.3, -5.1]} material={mat({color: ['#a86a40', '#8a5a3a', '#b9784a'][i % 3]})}>
					<cylinderGeometry args={[0.18, 0.14, 0.38, 7]} />
				</mesh>
			))}
			<mesh position={[-13, -9.9, -5.25]} material={wood}>
				<boxGeometry args={[5, 0.12, 0.6]} />
			</mesh>
			{/* kiler: çuvallar */}
			{[0, 1, 2, 3].map((i) => (
				<mesh key={'s' + i} position={[14.2 - i * 0.55, -12.6 + (i % 2) * 0.05, -2.2]} scale={[1, 0.9, 0.9]} material={mat({color: '#b39a68', rough: 1})}>
					<icosahedronGeometry args={[0.36, 0]} />
				</mesh>
			))}
			{/* ahır: saman, yalak */}
			{[0, 1, 2].map((i) => (
				<mesh key={'h' + i} position={[-16.2 + i * 0.7, -26.6, -5.3]} material={hay} castShadow>
					<boxGeometry args={[0.7, 0.8, 0.8]} />
				</mesh>
			))}
			<mesh position={[-8, -26.45, -5.4]} material={wood}>
				<boxGeometry args={[3.2, 0.45, 0.55]} />
			</mesh>
			{/* oturma yerleri: kilimler */}
			<mesh position={[7.2, -26.8, -3.4]} material={rug1}>
				<boxGeometry args={[4.6, 0.08, 2.4]} />
			</mesh>
			<mesh position={[13.7, -26.8, -3.2]} material={rug2}>
				<boxGeometry args={[4.2, 0.08, 2.4]} />
			</mesh>
			{/* kuyu: halat + kova + su */}
			<mesh position={[0, (2.4 + bucketY) / 2, -1.1]} scale={[1, 2.4 - bucketY, 1]} material={iron}>
				<cylinderGeometry args={[0.03, 0.03, 1, 4]} />
			</mesh>
			<group position={[0, bucketY, -1.1]}>
				<mesh material={wood} position={[0, -0.25, 0]} castShadow>
					<cylinderGeometry args={[0.28, 0.2, 0.4, 8]} />
				</mesh>
			</group>
			<mesh position={[0, -84.2, -2.2]} rotation={[-Math.PI / 2, 0, 0]} material={water}>
				<circleGeometry args={[1.35, 14]} />
			</mesh>
		</>
	);
};

const TorchFlames: React.FC = () => (
	<>
		{TORCHES.map((t, i) => (
			<group key={i} position={t.p}>
				<Flame size={t.size ?? 1} stick={(t.size ?? 1) <= 1} seed={i} glow={(t.size ?? 1) > 1 ? 1.3 : 1} />
			</group>
		))}
	</>
);

export type CityCutProps = {
	/** Örtü plakalarının açılışı: 0 kapalı → 1 tamamen açık (anahtar kareli) */
	reveal?: number | NumKey[];
	/** Plakaların gösterilip gösterilmeyeceği (açılış sahnesi dışında false) */
	plates?: boolean;
	people?: boolean;
};

export const CityCut: React.FC<CityCutProps> = ({reveal = 1, plates = false, people = true}) => {
	const frame = useCurrentFrame();
	const face = useMemo(() => getFace(), []);
	const plateGeos = useMemo(() => (plates ? PLATES.map((p) => buildPlate(p.y0, p.y1)) : []), [plates]);
	const faceMat = useMemo(() => new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.96, flatShading: true}), []);
	const glowMat = useMemo(
		() => new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1}),
		[],
	);
	const plateMat = useMemo(() => new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.96, flatShading: true}), []);
	const rv = num(frame, reveal as number | NumKey[], 1);
	return (
		<group>
			<mesh geometry={face.geo} material={faceMat} receiveShadow castShadow />
			<mesh geometry={face.glowGeo} material={glowMat} renderOrder={2} />
			{/* arka dolgu: yüzün arkası kapalı görünsün */}
			<mesh position={[0, FACE.y0 / 2, -9]} material={mat({color: '#2b2622', rough: 1})}>
				<boxGeometry args={[FACE.x1 - FACE.x0, -FACE.y0 + 2, 1]} />
			</mesh>
			<FloorSlabs />
			<Jars />
			<Props />
			<TorchFlames />
			{DONKEYS.map((d, i) => (
				<group key={i} position={d.p} rotation={[0, d.ry ?? 0, 0]}>
					<Donkey color={d.color ?? '#6f5e50'} phase={d.phase ?? 0} />
				</group>
			))}
			{people
				? VILLAGERS.map((v, i) => (
						<group key={i} position={v.p} rotation={[0, v.ry ?? 0, 0]}>
							<Villager action={v.action} tunic={v.tunic} scarf={v.scarf} phase={v.phase} scale={v.scale ?? 1} />
						</group>
					))
				: null}
			{plates
				? plateGeos.map((g, i) => {
						const side = i % 2 === 0 ? -1 : 1;
						const delay = i * 0.1;
						const p = easeFn('inOut')(Math.min(1, Math.max(0, (rv - delay) / (1 - delay * 1.6))));
						const cy = (PLATES[i].y0 + PLATES[i].y1) / 2;
						if (p >= 1) return null;
						return (
							<mesh key={i} geometry={g} material={plateMat} position={[side * p * 80, cy - p * p * 3, 0.55 + p * 2]} rotation={[0, side * p * 0.5, side * p * 0.12]} castShadow />
						);
					})
				: null}
		</group>
	);
};

/** Sahnenin zemin altı ışık hüzmesi: yüzeyden kuyuya düşen gün ışığı (additive koni) */
export const ShaftBeam: React.FC<{x?: number; top?: number; bottom?: number; width?: number; opacity?: number | NumKey[]; color?: string}> = ({x = 0, top = 0, bottom = -30, width = 3, opacity = 0.18, color = '#cfe6ff'}) => {
	const frame = useCurrentFrame();
	const o = num(frame, opacity as number | NumKey[], 0.18);
	const m = useMemo(() => new THREE.MeshBasicMaterial({color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false}), [color]);
	m.opacity = o;
	const h = top - bottom;
	return (
		<mesh material={m} position={[x, (top + bottom) / 2, -1.6]}>
			<cylinderGeometry args={[width * 0.45, width * 1.1, h, 14, 1, true]} />
		</mesh>
	);
};

/** Parıltı levhası: bölge vurgusu (ör. ziyarete açık bölüm) — yüzün önünde additive halo */
export const ZoneGlow: React.FC<{rect: [number, number, number, number]; color?: string; opacity?: number | NumKey[]; z?: number}> = ({rect, color = '#ffd58a', opacity = 0.35, z = 0.25}) => {
	const frame = useCurrentFrame();
	const o = num(frame, opacity as number | NumKey[], 0.35);
	const m = useMemo(() => new THREE.MeshBasicMaterial({map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false}), [color]);
	m.opacity = o;
	const [x0, y0, x1, y1] = rect;
	return (
		<mesh material={m} position={[(x0 + x1) / 2, (y0 + y1) / 2, z]}>
			<planeGeometry args={[x1 - x0, y1 - y0]} />
		</mesh>
	);
};

