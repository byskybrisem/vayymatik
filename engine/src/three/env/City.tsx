// Prosedürel şehir: tohumlu bina yerleşimi (tek çizim çağrısına birleştirilmiş geometri), ışıklı pencereler,
// sokak trafiği (far/stop ışıkları), uçak ikaz ışıkları ve merkezde "kahraman kule". baseY anahtar karelenirse
// şehir aşağı/yukarı kayar → asansör/yükseliş hissi (platform sabit, dünya hareket eder).
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {num, NumKey, rng} from '../core/math';
import {mat, PALETTE} from '../core/materials';
import {windowsTexture} from '../core/textures';

export type CitySpec = {
	seed?: number;
	/** Hücre sayısı (yarıçap): 10 → 21×21 blok */
	radius?: number;
	cell?: number;
	/** Şehrin zemin yüksekliği (platforma göre). Anahtar karelenebilir. */
	baseY?: number | NumKey[];
	/** Merkezdeki kule: platformun altında baseY'ye kadar uzanır */
	tower?: boolean;
	towerSize?: number;
	maxHeight?: number;
	/** bina yükseklik tavanı (ör. kahraman kulenin biraz altı) */
	cap?: number;
	lit?: number;
	traffic?: number;
	/** pencere ışık yoğunluğu (emissive) anahtar kareleri */
	glow?: number | NumKey[];
	/** merkez boş alan yarıçapı (hücre) */
	clear?: number;
};

type B = {x: number; z: number; w: number; d: number; h: number; v: number};

const layout = (seed: number, radius: number, cell: number, maxH: number, clear: number, cap: number): B[] => {
	const r = rng(seed);
	const out: B[] = [];
	for (let gx = -radius; gx <= radius; gx++) {
		for (let gz = -radius; gz <= radius; gz++) {
			const dist = Math.hypot(gx, gz);
			if (dist <= clear) continue;
			const lots = r() < 0.55 ? 1 : 4;
			const cx = gx * cell;
			const cz = gz * cell;
			const blk = cell * 0.7;
			// merkezden uzaklaştıkça alçalan siluet + rastgele kuleler
			const falloff = Math.max(0.35, 1 - dist / (radius * 1.4));
			for (let i = 0; i < lots; i++) {
				const w = lots === 1 ? blk * (0.75 + r() * 0.25) : blk * 0.46 * (0.7 + r() * 0.3);
				const d = lots === 1 ? blk * (0.75 + r() * 0.25) : blk * 0.46 * (0.7 + r() * 0.3);
				const ox = lots === 1 ? 0 : (i % 2 ? 1 : -1) * blk * 0.25;
				const oz = lots === 1 ? 0 : (i < 2 ? 1 : -1) * blk * 0.25;
				const tall = r() < 0.12 ? 1.8 : 1;
				const h = Math.min(cap, Math.max(8, maxH * falloff * (0.25 + r() * 0.75) * tall));
				out.push({x: cx + ox, z: cz + oz, w, d, h, v: Math.floor(r() * 3)});
			}
		}
	}
	return out;
};

const buildingGeo = (b: B) => {
	const g = new THREE.BoxGeometry(b.w, b.h, b.d);
	const uv = g.attributes.uv as THREE.BufferAttribute;
	// yüz sırası: +x,-x,+y,-y,+z,-z (her biri 4 köşe)
	for (let f = 0; f < 6; f++) {
		for (let k = 0; k < 4; k++) {
			const i = f * 4 + k;
			if (f === 2 || f === 3) {
				uv.setXY(i, 0.005, 0.002); // çatı: koyu
			} else {
				const span = f < 2 ? b.d : b.w;
				uv.setXY(i, uv.getX(i) * (span / 24), uv.getY(i) * (b.h / 100) + b.v * 0.37);
			}
		}
	}
	g.translate(b.x, b.h / 2, b.z);
	return g;
};

export const City: React.FC<CitySpec> = ({seed = 7, radius = 9, cell = 26, baseY = 0, tower = true, towerSize = 15, maxHeight = 130, cap = 1e9, lit = 0.38, traffic = 160, glow = 1, clear = 0.8}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const y = num(frame, baseY, 0);
	const gl = num(frame, glow, 1);

	const {meshes, beacons, roads} = useMemo(() => {
		const all = layout(seed, radius, cell, maxHeight, clear, cap);
		const groups: THREE.BufferGeometry[][] = [[], [], []];
		all.forEach((b) => groups[b.v % 3].push(buildingGeo(b)));
		const meshes = groups.map((gs, i) => {
			const tex = windowsTexture(seed * 10 + i, lit + (i - 1) * 0.08, i !== 2);
			const m = new THREE.MeshStandardMaterial({
				color: ['#5d6b80', '#4a5568', '#6b7486'][i],
				map: tex,
				emissiveMap: tex,
				emissive: new THREE.Color('#ffffff'),
				emissiveIntensity: 1,
				roughness: 0.55,
				metalness: 0.35,
				flatShading: true,
			});
			return {geo: mergeGeometries(gs), m};
		});
		const tall = [...all].sort((a, b) => b.h - a.h).slice(0, 26);
		const beacons = tall.map((b) => new THREE.Vector3(b.x, b.h + 1.2, b.z));
		const roads: number[] = [];
		for (let g = -radius; g <= radius; g++) roads.push((g + 0.5) * cell);
		return {meshes, beacons, roads};
	}, [seed, radius, cell, maxHeight, cap, lit, clear]);

	meshes.forEach((x) => (x.m.emissiveIntensity = gl));

	// trafik: yollar boyunca hareket eden far (beyaz) ve stop (kırmızı) çiftleri
	const trafficMesh = useMemo(() => {
		const geo = new THREE.BoxGeometry(0.9, 0.5, 2.2);
		const m = new THREE.MeshBasicMaterial({color: '#ffffff', toneMapped: false});
		const im = new THREE.InstancedMesh(geo, m, traffic);
		im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		for (let i = 0; i < traffic; i++) im.setColorAt(i, new THREE.Color(i % 2 ? '#ff3b2f' : '#fff1d0').multiplyScalar(i % 2 ? 2.2 : 3));
		return im;
	}, [traffic]);
	const r = rng(seed + 99);
	const span = (radius + 0.5) * cell * 2;
	const dummy = useMemo(() => new THREE.Object3D(), []);
	for (let i = 0; i < traffic; i++) {
		const road = roads[Math.floor(r() * roads.length)];
		const alongX = r() < 0.5;
		const lane = (r() < 0.5 ? -1 : 1) * 2.2;
		const speed = (10 + r() * 10) * (lane > 0 ? 1 : -1);
		const phase = r() * span;
		const s = ((phase + (speed * frame) / fps) % span + span) % span - span / 2;
		dummy.position.set(alongX ? s : road + lane, 0.4, alongX ? road + lane : s);
		dummy.rotation.set(0, alongX ? Math.PI / 2 : 0, 0);
		dummy.updateMatrix();
		trafficMesh.setMatrixAt(i, dummy.matrix);
	}
	trafficMesh.instanceMatrix.needsUpdate = true;

	const beaconMesh = useMemo(() => {
		const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({color: '#ff2020', toneMapped: false}), beacons.length);
		const d = new THREE.Object3D();
		beacons.forEach((b, i) => {
			d.position.copy(b);
			d.updateMatrix();
			im.setMatrixAt(i, d.matrix);
		});
		return im;
	}, [beacons]);
	const blinkOn = Math.floor(frame / (fps * 0.75)) % 2 === 0;
	(beaconMesh.material as THREE.MeshBasicMaterial).color.set(blinkOn ? '#ff2020' : '#3a0606');

	const groundM = mat({color: '#0c1019', rough: 0.95});
	const roadM = mat({color: '#151a24', rough: 0.6, metal: 0.2});
	const towerH = Math.max(0.01, -y);
	return (
		<group>
			<group position={[0, y, 0]}>
				<mesh rotation={[-Math.PI / 2, 0, 0]} material={groundM} receiveShadow>
					<planeGeometry args={[span * 1.6, span * 1.6]} />
				</mesh>
				{roads.map((rd) => (
					<group key={rd}>
						<mesh rotation={[-Math.PI / 2, 0, 0]} position={[rd, 0.02, 0]} material={roadM}>
							<planeGeometry args={[8, span]} />
						</mesh>
						<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, rd]} material={roadM}>
							<planeGeometry args={[span, 8]} />
						</mesh>
					</group>
				))}
				{meshes.map((x, i) => (
					<mesh key={i} geometry={x.geo} material={x.m} receiveShadow castShadow={false} />
				))}
				<primitive object={trafficMesh} />
				<primitive object={beaconMesh} />
			</group>
			{tower ? <Tower size={towerSize} height={towerH} /> : null}
		</group>
	);
};

/** Platformun altındaki kule: tepe y=0, aşağı doğru height kadar uzanır. */
export const Tower: React.FC<{size?: number; height: number; color?: string}> = ({size = 15, height, color = '#2a3346'}) => {
	const tex = windowsTexture(4242, 0.5, true);
	const m = useMemo(() => {
		const t = tex.clone();
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.needsUpdate = true;
		return new THREE.MeshStandardMaterial({color, map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.6, flatShading: true});
	}, [tex, color]);
	(m.map as THREE.Texture).repeat.set(size / 24, height / 100);
	const trim = mat({color: PALETTE.red, emissive: PALETTE.red, emissiveIntensity: 1.6, rough: 0.4});
	return (
		<group>
			<mesh position={[0, -height / 2 - 0.35, 0]} material={m} castShadow receiveShadow>
				<boxGeometry args={[size, height, size]} />
			</mesh>
			{/* çatı kenarı kırmızı ışık şeridi (VAYYMATİK imzası) */}
			<mesh position={[0, -0.5, 0]} material={trim}>
				<boxGeometry args={[size + 0.3, 0.16, size + 0.3]} />
			</mesh>
		</group>
	);
};
