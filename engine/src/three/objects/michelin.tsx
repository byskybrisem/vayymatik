// Michelin hikâyesi için özgün low-poly nesneler: lastik, eski otomobil, rehber kitabı, yıldız, restoran, kır yolu, masa.
// Hepsi koddan; marka logosu/yazısı yok (kurgusal, özgün tasarım).
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {CHROME, GOLD, mat} from '../core/materials';
import {num, NumKey, rng} from '../core/math';

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

const tireGeo = new THREE.TorusGeometry(0.5, 0.2, 10, 28);
const hubGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 16);

/** Lastik: tam tur (torus) + jant. Çap ~1.4 m, ayakta (z ekseni dönüş). spin = radyan */
export const Tire: React.FC<{spin?: number | NumKey[]; rim?: string; star?: number | NumKey[]}> = ({spin = 0, rim = '#c9d2dc', star = 0}) => {
	const f = useCurrentFrame();
	const s = num(f, spin, 0);
	const st = num(f, star, 0);
	return (
		<group rotation={[0, 0, s]}>
			<mesh geometry={tireGeo} material={mat({color: '#2a2c33', rough: 0.65})} castShadow receiveShadow />
			<mesh geometry={hubGeo} material={mat({color: rim, rough: 0.25, metal: 0.8})} rotation={[Math.PI / 2, 0, 0]} castShadow />
			{[...Array(8)].map((_, i) => (
				<mesh key={i} geometry={box(0.05, 0.3, 0.08)} material={mat({color: '#e8eaee', rough: 0.3, metal: 0.7})} rotation={[0, 0, (i / 8) * Math.PI * 2]} position={[0, 0, 0.12]} />
			))}
			{st > 0 ? <group position={[0, 0, 0.16]} scale={st}><StarMesh /></group> : null}
		</group>
	);
};

const starGeo = (() => {
	const s = new THREE.Shape();
	for (let i = 0; i < 10; i++) {
		const r = i % 2 ? 0.2 : 0.46;
		const a = Math.PI / 2 + (i / 10) * Math.PI * 2;
		const x = Math.cos(a) * r;
		const y = Math.sin(a) * r;
		if (i === 0) s.moveTo(x, y);
		else s.lineTo(x, y);
	}
	const g = new THREE.ExtrudeGeometry(s, {depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1});
	g.translate(0, 0, -0.05);
	return g;
})();
const StarMesh: React.FC = () => <mesh geometry={starGeo} material={new THREE.MeshStandardMaterial({color: '#ffcf4a', emissive: '#ff9a1a', emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.6})} castShadow />;

/** Parlayan yıldız (kendi ekseninde döner) */
export const Star: React.FC<{spinRate?: number; size?: number}> = ({spinRate = 0.05, size = 1}) => {
	const f = useCurrentFrame();
	return (
		<group scale={size} rotation={[0, f * spinRate, 0]}>
			<StarMesh />
		</group>
	);
};

/** Eski (1900'ler) otomobil: yüksek kasa, açık üst, ince büyük tekerlekler, gaz lambası farlar. Yön: +z ileri */
export const OldCar: React.FC<{color?: string; spin?: number | NumKey[]; lights?: number}> = ({color = '#7a1420', spin = 0, lights = 1}) => {
	const f = useCurrentFrame();
	const s = num(f, spin, 0);
	const paint = mat({color, rough: 0.35, metal: 0.4});
	const dark = mat({color: '#2a211a', rough: 0.8});
	const brass = mat({color: '#c9983a', rough: 0.3, metal: 0.8});
	const seat = mat({color: '#3a2418', rough: 0.9});
	const wheel = useMemo(() => new THREE.TorusGeometry(0.42, 0.06, 6, 16), []);
	const wheelTire = useMemo(() => new THREE.TorusGeometry(0.42, 0.075, 6, 16), []);
	const head = useMemo(() => new THREE.MeshBasicMaterial({color: '#fff1c8'}), []);
	head.color.set('#3a3220').lerp(new THREE.Color('#fff1c8').multiplyScalar(2), lights);
	return (
		<group>
			<mesh geometry={box(1.1, 0.5, 1.5)} material={paint} position={[0, 0.78, -0.35]} castShadow receiveShadow />
			<mesh geometry={box(0.9, 0.42, 1.0)} material={paint} position={[0, 0.92, 0.95]} castShadow />
			<mesh geometry={box(0.5, 0.3, 0.12)} material={brass} position={[0, 0.9, 1.5]} castShadow />
			<mesh geometry={box(0.95, 0.12, 0.9)} material={seat} position={[0, 1.08, -0.6]} />
			<mesh geometry={box(0.95, 0.5, 0.12)} material={seat} position={[0, 1.35, -1.12]} />
			<mesh geometry={box(0.05, 0.5, 0.05)} material={dark} position={[0.38, 1.45, 0.3]} rotation={[0.3, 0, 0]} />
			<mesh geometry={box(0.78, 0.04, 0.05)} material={dark} position={[0, 1.7, 0.2]} />
			{[0.52, -0.52].map((x) => (
				<group key={x}>
					<mesh geometry={box(0.14, 0.14, 0.14)} material={head} position={[x, 1.1, 1.18]} />
					<mesh geometry={box(0.18, 0.05, 0.9)} material={dark} position={[x * 1.15, 0.55, 0.4]} />
					{[[0.5, 0.95], [-0.5, -0.85]].map(([r, z], i) => (
						<group key={i} position={[x * 1.12, r === 0.5 ? 0.45 : 0.55, z]} rotation={[s, 0, 0]} scale={r === 0.5 ? 1 : 1.3}>
							<group rotation={[0, Math.PI / 2, 0]}>
								<mesh geometry={wheelTire} material={dark} castShadow />
								<mesh geometry={wheel} material={brass} scale={0.82} />
								{[0, 1, 2, 3].map((k) => (
									<mesh key={k} geometry={box(0.03, 0.8, 0.03)} material={brass} rotation={[0, 0, (k / 4) * Math.PI]} />
								))}
							</group>
						</group>
					))}
				</group>
			))}
		</group>
	);
};

/** Kırmızı rehber kitabı (kurgusal, yazısız). open: 0 kapalı → 1 açık */
export const GuideBook: React.FC<{open?: number | NumKey[]; cover?: string}> = ({open = 0, cover = '#b0121f'}) => {
	const f = useCurrentFrame();
	const o = num(f, open, 0);
	const pages = mat({color: '#f1e6cf', rough: 0.9});
	const cov = mat({color: cover, rough: 0.55});
	const g = box(0.5, 0.05, 0.7);
	return (
		<group>
			<mesh geometry={g} material={cov} position={[0.25, 0, 0]} castShadow />
			<mesh geometry={box(0.46, 0.035, 0.66)} material={pages} position={[0.25, 0.04, 0]} />
			<group rotation={[0, 0, -o * 2.7]} position={[0, 0.045, 0]}>
				<mesh geometry={g} material={cov} position={[0.25, 0.0, 0]} castShadow />
				<mesh geometry={box(0.46, 0.03, 0.66)} material={pages} position={[0.25, -0.035, 0]} />
			</group>
			<mesh geometry={box(0.2, 0.012, 0.2)} material={GOLD()} position={[0.25, 0.062, 0]} visible={o < 0.05} />
		</group>
	);
};

/** Küçük harita iğnesi (konik) */
export const Pin: React.FC<{color?: string}> = ({color = '#E8112D'}) => (
	<group>
		<mesh position={[0, 0.2, 0]} rotation={[Math.PI, 0, 0]} material={mat({color, rough: 0.4})} castShadow>
			<coneGeometry args={[0.1, 0.25, 8]} />
		</mesh>
		<mesh position={[0, 0.34, 0]} material={mat({color, rough: 0.4})} castShadow>
			<sphereGeometry args={[0.1, 10, 8]} />
		</mesh>
	</group>
);

/** Yemek masası: örtü, tabak, şamdan (mum alevi parıltısı), kadeh. Üst yüzey y=0.75 */
export const DinnerTable: React.FC<{plate?: boolean; candles?: number}> = ({plate = true, candles = 2}) => {
	const f = useCurrentFrame();
	const cloth = mat({color: '#efe8da', rough: 0.95});
	const flame = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffd27a'}), []);
	return (
		<group>
			<mesh geometry={new THREE.CylinderGeometry(0.9, 0.9, 0.06, 28)} material={mat({color: '#4a2d1c', rough: 0.5})} position={[0, 0.72, 0]} castShadow receiveShadow />
			<mesh geometry={new THREE.CylinderGeometry(0.98, 1.05, 0.04, 28)} material={cloth} position={[0, 0.755, 0]} receiveShadow />
			<mesh geometry={new THREE.CylinderGeometry(0.1, 0.18, 0.7, 10)} material={mat({color: '#2a1a10'})} position={[0, 0.35, 0]} castShadow />
			{plate ? (
				<group position={[0, 0.78, 0]}>
					<mesh geometry={new THREE.CylinderGeometry(0.42, 0.34, 0.04, 28)} material={mat({color: '#f7f7f4', rough: 0.2})} castShadow receiveShadow />
					<mesh geometry={new THREE.CylinderGeometry(0.27, 0.27, 0.045, 28)} material={mat({color: '#e5e3dc', rough: 0.25})} position={[0, 0.005, 0]} />
				</group>
			) : null}
			{[...Array(candles)].map((_, i) => {
				const a = (i / Math.max(1, candles)) * Math.PI * 2 + 0.6;
				const x = Math.cos(a) * 0.72;
				const z = Math.sin(a) * 0.72;
				return (
					<group key={i} position={[x, 0.78, z]}>
						<mesh geometry={new THREE.CylinderGeometry(0.03, 0.035, 0.34, 8)} material={mat({color: '#f4ecd8'})} position={[0, 0.17, 0]} />
						<mesh material={flame} position={[0, 0.38 + Math.sin(f * 0.5 + i) * 0.006, 0]} scale={[1, 1.5, 1]}>
							<sphereGeometry args={[0.032, 8, 6]} />
						</mesh>
					</group>
				);
			})}
			{[0.3, -0.5].map((a, i) => (
				<mesh key={i} geometry={new THREE.CylinderGeometry(0.05, 0.03, 0.2, 8)} material={mat({color: '#cfe4ee', rough: 0.05, metal: 0.1, transparent: true, opacity: 0.55})} position={[Math.cos(a + 2.2) * 0.55, 0.87, Math.sin(a + 2.2) * 0.55]} />
			))}
		</group>
	);
};

/** Küçük lokanta binası: taş gövde, kırmızı tente, sıcak pencereler, tabela direği. +z cephe. glow: pencere ışığı 0..1 */
export const Restaurant: React.FC<{w?: number; glow?: number | NumKey[]; awning?: string; stars?: number}> = ({w = 5, glow = 1, awning = '#8a1420', stars = 0}) => {
	const f = useCurrentFrame();
	const g = num(f, glow, 1);
	const win = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffcf80'}), []);
	win.color.set('#2a2a38').lerp(new THREE.Color('#ffc46b').multiplyScalar(1.6), g);
	const wall = mat({color: '#cdbba0', rough: 0.9});
	const roof = mat({color: '#5a2a24', rough: 0.8});
	return (
		<group>
			<mesh geometry={box(w, 3, 3.4)} material={wall} position={[0, 1.5, 0]} castShadow receiveShadow />
			<mesh geometry={box(w + 0.4, 0.3, 3.8)} material={roof} position={[0, 3.15, 0]} castShadow />
			<mesh geometry={box(w * 0.7, 0.6, 3.2)} material={roof} position={[0, 3.6, 0]} rotation={[0, 0, 0]} castShadow />
			<mesh geometry={box(w + 0.2, 0.08, 1.3)} material={mat({color: awning, rough: 0.8})} position={[0, 2.3, 2.0]} rotation={[0.28, 0, 0]} castShadow />
			{[-1, 1].map((s) => (
				<mesh key={s} geometry={box(1.1, 1.2, 0.06)} material={win} position={[s * (w / 2 - 1.1), 1.3, 1.73]} />
			))}
			<mesh geometry={box(0.9, 1.8, 0.07)} material={mat({color: '#3a2418'})} position={[0, 0.9, 1.72]} />
			{stars > 0 ? (
				<group position={[0, 5.0, 0.6]}>
					{[...Array(stars)].map((_, i) => (
						<group key={i} position={[(i - (stars - 1) / 2) * 1.15, 0, 0]} rotation={[0, f * 0.05, 0]}>
							<StarMesh />
						</group>
					))}
				</group>
			) : null}
		</group>
	);
};

/** Kır yolu: toprak/çakıl şerit, kesik orta çizgi, kavak ağaçları, kilometre taşları. Yol z ekseninde uzanır. */
export const CountryRoad: React.FC<{length?: number; width?: number; seed?: number; ground?: string; road?: string; trees?: number}> = ({length = 160, width = 4.2, seed = 3, ground = '#4e5a2e', road = '#7d6a4c', trees = 40}) => {
	const treesGeo = useMemo(() => {
		const r = rng(seed);
		const items: {x: number; z: number; h: number}[] = [];
		for (let i = 0; i < trees; i++) {
			const side = i % 2 ? 1 : -1;
			items.push({x: side * (width / 2 + 2.2 + r() * 1.2), z: -length / 2 + (i / trees) * length + r() * 2, h: 5 + r() * 3});
		}
		return items;
	}, [seed, trees, length, width]);
	const trunk = mat({color: '#3a2a1c'});
	const leaf = mat({color: '#556b2a', rough: 0.9});
	const leaf2 = mat({color: '#6a7d34', rough: 0.9});
	const dash = mat({color: '#d9cfb0', rough: 0.9});
	return (
		<group>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow material={mat({color: ground, rough: 1})}>
				<planeGeometry args={[length * 1.2, length]} />
			</mesh>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow material={mat({color: road, rough: 1})}>
				<planeGeometry args={[width, length]} />
			</mesh>
			{[...Array(Math.floor(length / 5))].map((_, i) => (
				<mesh key={i} geometry={box(0.12, 0.01, 2)} material={dash} position={[0, 0.006, -length / 2 + i * 5 + 1]} />
			))}
			{treesGeo.map((t, i) => (
				<group key={i} position={[t.x, 0, t.z]}>
					<mesh geometry={box(0.16, 1.4, 0.16)} material={trunk} position={[0, 0.7, 0]} castShadow />
					<mesh position={[0, 1.4 + t.h / 2, 0]} material={i % 3 ? leaf : leaf2} castShadow>
						<coneGeometry args={[0.7, t.h, 7]} />
					</mesh>
				</group>
			))}
		</group>
	);
};

/** Dönen yıldız ışık hüzmesi için basit zemin diski (podyum) */
export const Podium: React.FC<{r?: number; color?: string}> = ({r = 1.6, color = '#1a1a22'}) => (
	<mesh position={[0, 0.04, 0]} receiveShadow material={mat({color, rough: 0.35, metal: 0.4})}>
		<cylinderGeometry args={[r, r * 1.05, 0.08, 36]} />
	</mesh>
);

/** Basit kutu: size [w,h,d], renk, pürüzlülük, metal, emisyon (harita, çizgi, zemin parçaları için) */
export const Slab: React.FC<{size?: [number, number, number]; color?: string; rough?: number; metal?: number; emissive?: string}> = ({size = [1, 0.1, 1], color = '#888', rough = 0.8, metal = 0, emissive}) => (
	<mesh geometry={box(size[0], size[1], size[2])} material={mat({color, rough, metal, emissive, emissiveIntensity: emissive ? 1 : 0})} castShadow receiveShadow />
);

export const _unused = CHROME;
