// Fizik düşünce deneyi için nesneler: Shape (genel şekil), Rod (çelik çubuk), SpringChain (bağlı yaylar),
// AtomLattice (mikroskobik kesit: atom kafesi + boyuna dalga), Debris (derinlik/parallax için uzay döküntüsü).
// Tüm hareket useCurrentFrame ile; rastgelelik rng(seed). Zaman anahtarları (from/dur/t) JSON'da saniye yazılır.
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {num, NumKey, rng, smooth} from '../core/math';
import {glowTexture} from '../core/textures';

type N = number | NumKey[];
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// ---------- Shape ----------
export const Shape: React.FC<{
	shape?: 'box' | 'sphere' | 'cyl' | 'torus' | 'cone' | 'ico' | 'glow';
	size?: number[];
	color?: string;
	emissive?: string;
	ei?: N;
	opacity?: N;
	rough?: number;
	metal?: number;
	additive?: boolean;
	seg?: number;
	cast?: boolean;
	receive?: boolean;
}> = ({shape = 'box', size = [1, 1, 1], color = '#888', emissive, ei = 1, opacity = 1, rough = 0.6, metal = 0.1, additive = false, seg = 12, cast = false, receive = false}) => {
	const frame = useCurrentFrame();
	const o = num(frame, opacity, 1);
	const e = num(frame, ei, 1);
	const geo = useMemo(() => {
		const s = size;
		switch (shape) {
			case 'sphere': return new THREE.SphereGeometry(s[0], seg, Math.max(6, seg / 2 | 0));
			case 'cyl': return new THREE.CylinderGeometry(s[0], s[0], s[1], seg);
			case 'torus': return new THREE.TorusGeometry(s[0], s[1], 8, Math.max(16, seg * 3));
			case 'cone': return new THREE.ConeGeometry(s[0], s[1], seg);
			case 'ico': return new THREE.IcosahedronGeometry(s[0], 1);
			default: return new THREE.BoxGeometry(s[0], s[1] ?? s[0], s[2] ?? s[0]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shape, seg, size.join(',')]);
	const material = useMemo(() => {
		if (shape === 'glow') return new THREE.SpriteMaterial({map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false});
		return new THREE.MeshStandardMaterial({
			color, roughness: rough, metalness: metal, flatShading: true, emissive: emissive ?? '#000', transparent: true,
			depthWrite: !additive, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
		});
	}, [shape, color, emissive, rough, metal, additive]);
	material.opacity = o;
	if (!(material instanceof THREE.SpriteMaterial)) (material as THREE.MeshStandardMaterial).emissiveIntensity = e;
	if (shape === 'glow') return <sprite material={material as THREE.SpriteMaterial} scale={[size[0], size[0], 1]} />;
	return <mesh geometry={geo} material={material} castShadow={cast} receiveShadow={receive} />;
};

// ---------- Rod ----------
/** Çelik çubuk: x ekseninde 0 → length. bands: her `every` metrede parlak halka (mesafe hissi). */
export const Rod: React.FC<{
	length?: number; radius?: number; color?: string; bands?: {every: number; color?: string; glow?: number}; capColor?: string; cast?: boolean;
}> = ({length = 100, radius = 0.12, color = '#aab4c2', bands, capColor = '#e9eef5', cast = true}) => {
	const bandCount = bands ? Math.floor(length / bands.every) : 0;
	const ref = useRef<THREE.InstancedMesh>(null);
	useLayoutEffect(() => {
		if (!ref.current || !bands) return;
		const m = new THREE.Matrix4();
		const q90 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
		for (let i = 0; i < bandCount; i++) {
			m.compose(new THREE.Vector3((i + 1) * bands.every, 0, 0), q90, new THREE.Vector3(1, 1, 1));
			ref.current.setMatrixAt(i, m);
		}
		ref.current.instanceMatrix.needsUpdate = true;
	}, [bandCount, bands]);
	const steel = useMemo(() => new THREE.MeshStandardMaterial({color, roughness: 0.32, metalness: 0.75, flatShading: true, emissive: '#2a5a8a', emissiveIntensity: 0.4}), [color]);
	const bandMat = useMemo(() => new THREE.MeshStandardMaterial({color: bands?.color ?? '#5ad2ff', emissive: bands?.color ?? '#5ad2ff', emissiveIntensity: bands?.glow ?? 1.4, roughness: 0.4, toneMapped: false}), [bands?.color, bands?.glow]);
	const cap = useMemo(() => new THREE.MeshStandardMaterial({color: capColor, roughness: 0.2, metalness: 0.9, flatShading: true}), [capColor]);
	return (
		<group>
			<mesh position={[length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={steel} castShadow={cast} receiveShadow>
				<cylinderGeometry args={[radius, radius, length, 10]} />
			</mesh>
			<mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={cap} castShadow={cast}>
				<cylinderGeometry args={[radius * 1.25, radius * 1.25, radius * 1.2, 10]} />
			</mesh>
			<mesh position={[length, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={cap}>
				<cylinderGeometry args={[radius * 1.25, radius * 1.25, radius * 1.2, 10]} />
			</mesh>
			{bands ? (
				<instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, bandCount)]} material={bandMat} frustumCulled={false}>
					<torusGeometry args={[radius * 9, radius * 0.55, 6, 24]} />
				</instancedMesh>
			) : null}
		</group>
	);
};

// ---------- SpringChain ----------
const helix = (turns: number, r: number, rest: number) => {
	const pts: THREE.Vector3[] = [];
	const n = turns * 12;
	for (let i = 0; i <= n; i++) {
		const u = i / n;
		const a = u * turns * Math.PI * 2;
		pts.push(new THREE.Vector3(u * rest, Math.sin(a) * r, Math.cos(a) * r));
	}
	return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, r * 0.22, 5, false);
};

/** Birbirine bağlı kütle-yay zinciri (x ekseni). Hareket sırayla iletilir: i. kütle `delay` kare geç tepki verir. */
export const SpringChain: React.FC<{
	n?: number; spacing?: number; massR?: number; coilR?: number; turns?: number; from?: number; dur?: number; delay?: number; amp?: number;
	color?: string; hot?: string; springColor?: string;
}> = ({n = 14, spacing = 1, massR = 0.22, coilR = 0.2, turns = 6, from = 0, dur = 10, delay = 7, amp = -0.35, color = '#8fa3bd', hot = '#ffb347', springColor = '#cfd8e3'}) => {
	const frame = useCurrentFrame();
	const rest = spacing - massR * 2;
	const geo = useMemo(() => helix(turns, coilR, rest), [turns, coilR, rest]);
	const massGeo = useMemo(() => new THREE.IcosahedronGeometry(massR, 1), [massR]);
	const mats = useMemo(() => Array.from({length: n}, () => new THREE.MeshStandardMaterial({color, roughness: 0.35, metalness: 0.6, flatShading: true, emissive: hot, emissiveIntensity: 0})), [n, color, hot]);
	const smats = useMemo(() => Array.from({length: n}, () => new THREE.MeshStandardMaterial({color: springColor, roughness: 0.3, metalness: 0.8, flatShading: true, emissive: hot, emissiveIntensity: 0})), [n, springColor, hot]);
	const disp: number[] = [];
	const act: number[] = [];
	for (let i = 0; i < n; i++) {
		const u = (frame - from - i * delay) / Math.max(1, dur);
		const r = u <= 0 ? 0 : u >= 1 ? 1 + 0.1 * Math.exp(-4 * (u - 1)) * Math.sin(9 * (u - 1)) : smooth(u);
		disp.push(amp * r);
		act.push(u > 0 && u < 1.6 ? Math.sin(Math.PI * clamp(u / 1.6)) : 0);
	}
	const xs = disp.map((d, i) => i * spacing + d);
	return (
		<group>
			{xs.map((x, i) => {
				mats[i].emissiveIntensity = act[i] * 1.6;
				return <mesh key={`m${i}`} geometry={massGeo} material={mats[i]} position={[x, 0, 0]} castShadow />;
			})}
			{xs.slice(0, -1).map((x, i) => {
				const len = Math.max(0.05, xs[i + 1] - x - massR * 2);
				smats[i].emissiveIntensity = Math.max(act[i], act[i + 1]) * 1.1;
				return <mesh key={`s${i}`} geometry={geo} material={smats[i]} position={[x + massR, 0, 0]} scale={[len / rest, 1, 1]} castShadow />;
			})}
		</group>
	);
};

// ---------- AtomLattice ----------
/** Mikroskobik kesit: atom kafesi (cols×rows×layers) + bağlar. Sıkışma dalgası x yönünde `speed` (birim/kare) ilerler. */
export const AtomLattice: React.FC<{
	cols?: number; rows?: number; layers?: number; spacing?: number; atomR?: number; from?: number; speed?: number; width?: number; amp?: number;
	color?: string; hot?: string; x0?: number;
}> = ({cols = 26, rows = 11, layers = 3, spacing = 0.42, atomR = 0.075, from = 0, speed = 0.05, width = 1.1, amp = 0.16, color = '#7fb2ff', hot = '#ffb347', x0 = -1}) => {
	const frame = useCurrentFrame();
	const total = cols * rows * layers;
	const atoms = useRef<THREE.InstancedMesh>(null);
	const bondsX = useRef<THREE.InstancedMesh>(null);
	const bondsY = useRef<THREE.InstancedMesh>(null);
	const base = useMemo(() => {
		const r = rng(5);
		const a: {x: number; y: number; z: number; ph: number}[] = [];
		for (let l = 0; l < layers; l++)
			for (let j = 0; j < rows; j++)
				for (let i = 0; i < cols; i++)
					a.push({x: (i - cols / 2) * spacing, y: (j - rows / 2) * spacing, z: -l * spacing * 0.9, ph: r() * 6.28});
		return a;
	}, [cols, rows, layers, spacing]);
	const front = x0 * spacing * 0 + (-cols / 2) * spacing - 0.6 + speed * (frame - from) * (frame >= from ? 1 : 0);
	const pos = base.map((a) => {
		const s = a.x - front;
		const g = Math.exp(-(s * s) / (width * width));
		const w = 0.012 * Math.sin(frame * 0.35 + a.ph);
		return {x: a.x + amp * g + w, y: a.y + 0.012 * Math.cos(frame * 0.3 + a.ph), z: a.z, g};
	});
	useLayoutEffect(() => {
		if (!atoms.current || !bondsX.current || !bondsY.current) return;
		const m = new THREE.Matrix4();
		const q = new THREE.Quaternion();
		const sc = new THREE.Vector3(1, 1, 1);
		const c = new THREE.Color();
		const cold = new THREE.Color(color);
		const hotc = new THREE.Color(hot);
		for (let k = 0; k < total; k++) {
			const p = pos[k];
			m.compose(new THREE.Vector3(p.x, p.y, p.z), q, sc.set(1 + p.g * 0.35, 1 + p.g * 0.35, 1 + p.g * 0.35));
			atoms.current.setMatrixAt(k, m);
			atoms.current.setColorAt(k, c.copy(cold).lerp(hotc, clamp(p.g * 1.3)));
		}
		let bx = 0;
		let by = 0;
		for (let l = 0; l < layers; l++)
			for (let j = 0; j < rows; j++)
				for (let i = 0; i < cols; i++) {
					const k = l * rows * cols + j * cols + i;
					if (i < cols - 1) {
						const a = pos[k];
						const b = pos[k + 1];
						const len = Math.max(0.01, b.x - a.x - atomR);
						m.compose(new THREE.Vector3((a.x + b.x) / 2, a.y, a.z), q, new THREE.Vector3(len, 1, 1));
						bondsX.current.setMatrixAt(bx++, m);
					}
					if (j < rows - 1) {
						const a = pos[k];
						const b = pos[k + cols];
						const len = Math.max(0.01, b.y - a.y - atomR);
						m.compose(new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, a.z), q, new THREE.Vector3(1, len, 1));
						bondsY.current.setMatrixAt(by++, m);
					}
				}
		atoms.current.instanceMatrix.needsUpdate = true;
		if (atoms.current.instanceColor) atoms.current.instanceColor.needsUpdate = true;
		bondsX.current.instanceMatrix.needsUpdate = true;
		bondsY.current.instanceMatrix.needsUpdate = true;
	});
	const nbx = (cols - 1) * rows * layers;
	const nby = cols * (rows - 1) * layers;
	const bondMat = useMemo(() => new THREE.MeshStandardMaterial({color: '#cfe0ff', roughness: 0.5, metalness: 0.3, emissive: '#3a5a9a', emissiveIntensity: 0.5}), []);
	return (
		<group>
			<instancedMesh ref={atoms} args={[undefined, undefined, total]} frustumCulled={false} castShadow>
				<icosahedronGeometry args={[atomR, 1]} />
				<meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.5} flatShading emissive="#1a2f66" emissiveIntensity={0.7} />
			</instancedMesh>
			<instancedMesh ref={bondsX} args={[undefined, undefined, nbx]} frustumCulled={false} material={bondMat}>
				<boxGeometry args={[1, atomR * 0.28, atomR * 0.28]} />
			</instancedMesh>
			<instancedMesh ref={bondsY} args={[undefined, undefined, nby]} frustumCulled={false} material={bondMat}>
				<boxGeometry args={[atomR * 0.28, 1, atomR * 0.28]} />
			</instancedMesh>
		</group>
	);
};

// ---------- Debris ----------
/** x ekseni boyunca tüp içinde dağılmış küçük kayalar/yıldız tozu: kamera ilerlerken parallax ve ölçek hissi. */
export const Debris: React.FC<{count?: number; length?: number; rMin?: number; rMax?: number; seed?: number; size?: number; color?: string; glow?: boolean}> = ({
	count = 500, length = 600, rMin = 3, rMax = 40, seed = 3, size = 0.25, color = '#8d96aa', glow = false,
}) => {
	const ref = useRef<THREE.InstancedMesh>(null);
	useLayoutEffect(() => {
		if (!ref.current) return;
		const r = rng(seed);
		const m = new THREE.Matrix4();
		const q = new THREE.Quaternion();
		const e = new THREE.Euler();
		for (let i = 0; i < count; i++) {
			const x = (r() * 1.15 - 0.05) * length;
			const rad = rMin + r() * (rMax - rMin);
			const a = r() * Math.PI * 2;
			const s = size * (0.3 + r() * 1.6);
			e.set(r() * 6, r() * 6, r() * 6);
			q.setFromEuler(e);
			m.compose(new THREE.Vector3(x, Math.sin(a) * rad, Math.cos(a) * rad), q, new THREE.Vector3(s, s * (0.6 + r() * 0.8), s));
			ref.current.setMatrixAt(i, m);
		}
		ref.current.instanceMatrix.needsUpdate = true;
	}, [count, length, rMin, rMax, seed, size]);
	return (
		<instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
			<icosahedronGeometry args={[1, 0]} />
			{glow ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshStandardMaterial color={color} roughness={0.9} flatShading />}
		</instancedMesh>
	);
};

// ---------- Stars ----------
/** Tüm yönlerde yıldız kabuğu (Sky shader yalnızca zenitte yıldız çizer). */
export const Stars: React.FC<{count?: number; radius?: number; seed?: number; size?: number}> = ({count = 1800, radius = 1500, seed = 1, size = 2.2}) => {
	const pts = useMemo(() => {
		const r = rng(seed);
		const pos = new Float32Array(count * 3);
		const col = new Float32Array(count * 3);
		for (let i = 0; i < count; i++) {
			const u = r() * 2 - 1;
			const a = r() * Math.PI * 2;
			const q = Math.sqrt(1 - u * u);
			pos.set([q * Math.cos(a) * radius, u * radius, q * Math.sin(a) * radius], i * 3);
			const b = 0.35 + r() * 0.65;
			const tint = r();
			col.set([b * (tint > 0.8 ? 1 : 0.85), b * 0.92, b * (tint < 0.3 ? 1 : 0.95)], i * 3);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
		g.setAttribute('color', new THREE.BufferAttribute(col, 3));
		const p = new THREE.Points(g, new THREE.PointsMaterial({size, sizeAttenuation: false, vertexColors: true, fog: false, toneMapped: false, depthWrite: false}));
		p.frustumCulled = false;
		return p;
	}, [count, radius, seed, size]);
	return <primitive object={pts} />;
};
