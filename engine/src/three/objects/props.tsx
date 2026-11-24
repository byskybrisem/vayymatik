// Tekrar kullanılabilir 3D nesneler: ofis mobilyası, para, altın, otomobil. Hepsi koddan, low-poly, gölgeli.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {CHROME, GOLD, mat, PALETTE} from '../core/materials';
import {banknoteTexture, glowTexture} from '../core/textures';
import {num, NumKey, rng} from '../core/math';

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

/** Masa (üst tabla + ayaklar + çekmece bloğu). Üst yüzey y = 0.76 */
export const Desk: React.FC<{w?: number; d?: number}> = ({w = 1.7, d = 0.85}) => {
	const top = mat({color: PALETTE.wood, rough: 0.45});
	const dark = mat({color: PALETTE.woodDark, rough: 0.6});
	const metal = mat({color: '#20242c', rough: 0.35, metal: 0.8});
	return (
		<group>
			<mesh geometry={box(w, 0.05, d)} material={top} position={[0, 0.735, 0]} castShadow receiveShadow />
			<mesh geometry={box(w - 0.06, 0.03, d - 0.06)} material={dark} position={[0, 0.7, 0]} castShadow />
			{[-1, 1].map((sx) => (
				<group key={sx}>
					<mesh geometry={box(0.05, 0.7, 0.05)} material={metal} position={[sx * (w / 2 - 0.08), 0.35, d / 2 - 0.08]} castShadow />
					<mesh geometry={box(0.05, 0.7, 0.05)} material={metal} position={[sx * (w / 2 - 0.08), 0.35, -d / 2 + 0.08]} castShadow />
				</group>
			))}
			<mesh geometry={box(0.42, 0.5, d - 0.12)} material={dark} position={[w / 2 - 0.3, 0.42, 0]} castShadow receiveShadow />
			{[0.55, 0.38].map((y) => (
				<mesh key={y} geometry={box(0.36, 0.012, 0.02)} material={metal} position={[w / 2 - 0.3, y, d / 2 - 0.05]} />
			))}
			{/* ön panel (modesty panel) */}
			<mesh geometry={box(w - 0.2, 0.36, 0.025)} material={dark} position={[0, 0.5, d / 2 - 0.1]} castShadow receiveShadow />
		</group>
	);
};

export const Chair: React.FC = () => {
	const fabric = mat({color: '#1a1d24', rough: 0.85});
	const metal = mat({color: '#2b2f38', rough: 0.3, metal: 0.8});
	return (
		<group>
			<mesh geometry={box(0.5, 0.08, 0.48)} material={fabric} position={[0, 0.46, 0]} castShadow receiveShadow />
			<mesh geometry={box(0.48, 0.62, 0.07)} material={fabric} position={[0, 0.82, -0.24]} rotation={[-0.12, 0, 0]} castShadow />
			<mesh geometry={new THREE.CylinderGeometry(0.03, 0.03, 0.36, 6)} material={metal} position={[0, 0.25, 0]} castShadow />
			{[0, 1, 2, 3, 4].map((i) => {
				const a = (i / 5) * Math.PI * 2;
				return <mesh key={i} geometry={box(0.04, 0.03, 0.3)} material={metal} position={[Math.sin(a) * 0.14, 0.06, Math.cos(a) * 0.14]} rotation={[0, a, 0]} castShadow />;
			})}
		</group>
	);
};

/** Masa lambası: gövde + abajur + parlayan ampul (ışığı LightRig'de 'spot' olarak tanımlayın) */
export const DeskLamp: React.FC<{on?: number | NumKey[]}> = ({on = 1}) => {
	const frame = useCurrentFrame();
	const k = num(frame, on, 1);
	const metal = mat({color: '#1b1e24', rough: 0.35, metal: 0.7});
	const bulb = useMemo(() => new THREE.MeshBasicMaterial({color: new THREE.Color('#ffd9a0').multiplyScalar(1.5)}), []);
	bulb.color.set('#ffd9a0').multiplyScalar(0.2 + 1.6 * k);
	return (
		<group>
			<mesh geometry={new THREE.CylinderGeometry(0.09, 0.11, 0.025, 10)} material={metal} position={[0, 0.0125, 0]} castShadow />
			<mesh geometry={new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6)} material={metal} position={[0.02, 0.21, 0]} rotation={[0, 0, -0.1]} castShadow />
			<mesh geometry={new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6)} material={metal} position={[0.12, 0.45, 0]} rotation={[0, 0, -1.0]} castShadow />
			<group position={[0.25, 0.48, 0]} rotation={[0, 0, -2.3]}>
				<mesh geometry={new THREE.ConeGeometry(0.11, 0.16, 10, 1, true)} material={mat({color: '#16181d', rough: 0.4, metal: 0.6, side: THREE.DoubleSide})} castShadow />
				<mesh geometry={new THREE.SphereGeometry(0.04, 10, 8)} material={bulb} position={[0, -0.04, 0]} />
			</group>
		</group>
	);
};

export const Laptop: React.FC<{open?: number; screen?: string}> = ({open = 1.85, screen = '#1d3c66'}) => {
	const shell = mat({color: '#9aa3ae', rough: 0.35, metal: 0.8});
	const scr = useMemo(() => new THREE.MeshBasicMaterial({color: new THREE.Color(screen).multiplyScalar(1.2)}), [screen]);
	return (
		<group>
			<mesh geometry={box(0.34, 0.015, 0.23)} material={shell} position={[0, 0.0075, 0]} castShadow receiveShadow />
			<group position={[0, 0.015, -0.115]} rotation={[-(Math.PI - open), 0, 0]}>
				<mesh geometry={box(0.34, 0.22, 0.01)} material={shell} position={[0, 0.11, 0]} castShadow />
				<mesh geometry={new THREE.PlaneGeometry(0.31, 0.19)} material={scr} position={[0, 0.11, 0.0055]} />
			</group>
		</group>
	);
};

const noteGeo = new THREE.BoxGeometry(0.156, 0.0012, 0.07);
/** Tek banknot (özgün kurgusal tasarım). bend: hafif kıvrım için iki parça */
export const Banknote: React.FC<{tint?: string}> = ({tint = PALETTE.money}) => {
	const tex = banknoteTexture(tint);
	const m = useMemo(() => {
		const face = new THREE.MeshStandardMaterial({map: tex, roughness: 0.75, side: THREE.DoubleSide});
		const edge = new THREE.MeshStandardMaterial({color: '#cfe3d6', roughness: 0.9});
		return [edge, edge, face, face, edge, edge];
	}, [tex]);
	return <mesh geometry={noteGeo} material={m} castShadow receiveShadow />;
};

/** Banknot destesi (bantlı) */
export const CashStack: React.FC<{count?: number; seed?: number}> = ({count = 24, seed = 3}) => {
	const r = rng(seed);
	const band = mat({color: '#E6C36A', rough: 0.5});
	const notes = Array.from({length: count}, (_, i) => ({y: i * 0.0016, rx: (r() - 0.5) * 0.006, rz: (r() - 0.5) * 0.04}));
	return (
		<group>
			{notes.map((n, i) => (
				<group key={i} position={[n.rx, n.y, 0]} rotation={[0, n.rz, 0]}>
					<Banknote />
				</group>
			))}
			<mesh geometry={box(0.03, count * 0.0016 + 0.004, 0.072)} material={band} position={[0, (count * 0.0016) / 2, 0]} />
		</group>
	);
};

const coinGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.006, 18);
export const Coin: React.FC = () => <mesh geometry={coinGeo} material={GOLD()} castShadow receiveShadow />;

/** Madeni para kulesi; grow 0→1 ile yükselir */
export const CoinStack: React.FC<{count?: number; grow?: number | NumKey[]; seed?: number}> = ({count = 20, grow = 1, seed = 5}) => {
	const frame = useCurrentFrame();
	const g = num(frame, grow, 1);
	const r = rng(seed);
	const n = Math.round(count * g);
	const offs = Array.from({length: count}, () => [(r() - 0.5) * 0.006, (r() - 0.5) * 0.006] as const);
	return (
		<group>
			{offs.slice(0, n).map((o, i) => (
				<mesh key={i} geometry={coinGeo} material={GOLD()} position={[o[0], 0.003 + i * 0.0062, o[1]]} castShadow receiveShadow />
			))}
		</group>
	);
};

const barGeo = (() => {
	// kesik piramit külçe
	const g = new THREE.CylinderGeometry(0.07, 0.095, 0.05, 4, 1);
	g.rotateY(Math.PI / 4);
	g.scale(1.55, 1, 0.75);
	g.translate(0, 0.025, 0);
	return g;
})();
export const GoldBar: React.FC = () => <mesh geometry={barGeo} material={GOLD()} castShadow receiveShadow />;

/** Altın külçe piramidi (rows: alt sıra sayısı) */
export const GoldPile: React.FC<{rows?: number}> = ({rows = 3}) => {
	const items: [number, number, number][] = [];
	for (let r = 0; r < rows; r++) {
		const n = rows - r;
		for (let i = 0; i < n; i++) items.push([(i - (n - 1) / 2) * 0.2, r * 0.05, (r % 2) * 0.0]);
	}
	return (
		<group>
			{items.map((p, i) => (
				<group key={i} position={p}>
					<GoldBar />
				</group>
			))}
		</group>
	);
};

/** Low-poly spor otomobil: ekstrüde yan profil + cam + jantlar + far/stop ışıkları */
export const Car: React.FC<{color?: string; lights?: number | NumKey[]; wheelSpin?: number}> = ({color = PALETTE.red, lights = 1, wheelSpin = 0}) => {
	const frame = useCurrentFrame();
	const li = num(frame, lights, 1);
	const body = useMemo(() => {
		const s = new THREE.Shape();
		// yan profil (z ekseni boyunca uzunluk 4.3 m, yükseklik ~1.2)
		s.moveTo(-2.15, 0.3);
		s.lineTo(-2.2, 0.62);
		s.lineTo(-1.9, 0.78);
		s.lineTo(-0.9, 0.85);
		s.lineTo(-0.35, 1.22);
		s.lineTo(0.75, 1.2);
		s.lineTo(1.35, 0.86);
		s.lineTo(2.1, 0.74);
		s.lineTo(2.22, 0.5);
		s.lineTo(2.15, 0.3);
		s.lineTo(-2.15, 0.3);
		const g = new THREE.ExtrudeGeometry(s, {depth: 1.8, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 1});
		g.translate(0, 0, -0.9);
		g.rotateY(-Math.PI / 2);
		return g;
	}, []);
	const glass = useMemo(() => {
		const s = new THREE.Shape();
		s.moveTo(-0.82, 0.88);
		s.lineTo(-0.33, 1.17);
		s.lineTo(0.72, 1.15);
		s.lineTo(1.25, 0.88);
		s.lineTo(-0.82, 0.88);
		const g = new THREE.ExtrudeGeometry(s, {depth: 1.62, bevelEnabled: false});
		g.translate(0, 0.01, -0.81);
		g.rotateY(-Math.PI / 2);
		return g;
	}, []);
	const paint = mat({color, rough: 0.22, metal: 0.55});
	const glassM = mat({color: '#0b0f18', rough: 0.05, metal: 0.9});
	const tire = mat({color: '#0d0d0f', rough: 0.9});
	const head = useMemo(() => new THREE.MeshBasicMaterial({color: '#fff4dc'}), []);
	const tail = useMemo(() => new THREE.MeshBasicMaterial({color: '#ff2a2a'}), []);
	head.color.set('#3a3833').lerp(new THREE.Color('#fff4dc').multiplyScalar(2), li);
	tail.color.set('#300808').lerp(new THREE.Color('#ff2a2a').multiplyScalar(1.6), li);
	const wheel = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 14);
	const rim = new THREE.CylinderGeometry(0.22, 0.22, 0.29, 7);
	return (
		<group>
			<mesh geometry={body} material={paint} castShadow receiveShadow />
			<mesh geometry={glass} material={glassM} />
			{[
				[0.86, 1.35],
				[-0.86, 1.35],
				[0.86, -1.4],
				[-0.86, -1.4],
			].map(([x, z], i) => (
				<group key={i} position={[x, 0.36, z]} rotation={[wheelSpin, 0, Math.PI / 2]}>
					<mesh geometry={wheel} material={tire} castShadow />
					<mesh geometry={rim} material={CHROME()} />
				</group>
			))}
			{[0.6, -0.6].map((x) => (
				<group key={x}>
					<mesh geometry={box(0.36, 0.08, 0.04)} material={head} position={[x, 0.66, 2.22]} />
					<mesh geometry={box(0.42, 0.07, 0.04)} material={tail} position={[x, 0.7, -2.24]} />
				</group>
			))}
		</group>
	);
};

/** Işık halesi (billboard sprite, additive) */
export const Glow: React.FC<{color?: string; size?: number; opacity?: number | NumKey[]}> = ({color = '#ffcf7a', size = 1, opacity = 1}) => {
	const frame = useCurrentFrame();
	const o = num(frame, opacity, 1);
	const m = useMemo(() => new THREE.SpriteMaterial({map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}), [color]);
	m.opacity = o;
	return <sprite material={m} scale={[size, size, 1]} />;
};
