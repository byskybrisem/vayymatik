// Özgün (belirli bir modeli birebir kopyalamayan) çok amaçlı savaş uçağı. Burun +Z, yukarı +Y, kanatlar ±X.
// Kesit halkalarından loft gövde, panel çizgili boya dokusu, cam kanopi (çevre yansımalı), art yakıcı alevi.
// `canopy` 0=kapalı → 1=fırlamış (kanopi uzağa savrulur); `burner` 0–1 art yakıcı; `lights` yanıp sönen seyir ışıkları.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {num, NumKey} from '../core/math';
import {loft, paintTexture, panel, pbr, Station, tiled, vpanel} from './common';

const STATIONS: Station[] = [
	{z: -8.0, w: 0.66, ht: 0.52, hb: 0.5, yc: 0.02},
	{z: -6.6, w: 0.86, ht: 0.62, hb: 0.58, yc: 0.02},
	{z: -4.2, w: 1.0, ht: 0.7, hb: 0.64, yc: 0.0},
	{z: -1.2, w: 1.04, ht: 0.6, hb: 0.7, yc: 0.0},
	{z: 0.8, w: 0.96, ht: 0.46, hb: 0.72, yc: 0.0},
	{z: 3.3, w: 0.78, ht: 0.46, hb: 0.6, yc: 0.0},
	{z: 4.4, w: 0.68, ht: 0.5, hb: 0.5, yc: 0.0},
	{z: 6.0, w: 0.46, ht: 0.36, hb: 0.36, yc: -0.02},
	{z: 7.4, w: 0.24, ht: 0.2, hb: 0.2, yc: -0.04},
	{z: 8.3, w: 0.015, ht: 0.015, hb: 0.015, yc: -0.05},
];

const G = {
	body: loft(STATIONS, 64, 32),
	wing: panel([[0.7, 1.4], [5.1, -1.5], [5.1, -2.9], [1.0, -3.5]], 0.11),
	strake: panel([[0.3, 4.4], [1.1, 0.9], [0.6, 0.9]], 0.05),
	stab: panel([[0.6, -5.2], [3.1, -6.9], [3.1, -7.6], [0.7, -7.7]], 0.085),
	fin: vpanel([[3.6, 0.45], [5.9, 2.7], [6.8, 2.7], [7.0, 0.45]], 0.07),
	canopy: new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
	frameArc: new THREE.TorusGeometry(1, 0.03, 6, 24, Math.PI),
	intake: new THREE.SphereGeometry(1, 24, 16),
	nozzle: new THREE.CylinderGeometry(0.62, 0.5, 1.1, 24, 1, true),
	nozzleIn: new THREE.CylinderGeometry(0.52, 0.52, 0.4, 20),
	flame: new THREE.ConeGeometry(0.5, 1, 18, 1, true),
	nav: new THREE.SphereGeometry(0.06, 8, 6),
	pylon: new THREE.CylinderGeometry(0.06, 0.06, 1.8, 10),
	missile: new THREE.CapsuleGeometry(0.075, 1.5, 4, 10),
};
G.fin.rotateY(Math.PI / 2);
G.canopy.translate(0, 0, 0);
G.flame.rotateX(-Math.PI / 2);

export type JetProps = {canopy?: number | NumKey[]; burner?: number | NumKey[]; paint?: string; seed?: number; gear?: boolean};

export const FighterJet: React.FC<JetProps> = ({canopy = 0, burner = 0.8, paint = '#8d969f', seed = 3}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const m = useMemo(() => {
		const base = paintTexture(paint, seed);
		return {
			body: pbr('#ffffff', {map: tiled(base, 3, 1.4), rough: 0.5, metal: 0.18, env: 0.9}),
			wing: pbr('#ffffff', {map: tiled(base, 0.28, 0.28), rough: 0.52, metal: 0.15, env: 0.9}),
			dark: pbr('#1a1d22', {rough: 0.55, metal: 0.4}),
			darker: pbr('#0b0c0f', {rough: 0.8}),
			glass: pbr('#ffd9a0', {rough: 0.04, metal: 0.95, transparent: true, opacity: 0.32, env: 2.2}),
			frame: pbr('#272b31', {rough: 0.4, metal: 0.6}),
			red: pbr('#E8112D', {rough: 0.4, metal: 0.15, env: 0.9}),
			burn: pbr('#3b2a22', {rough: 0.5, metal: 0.85, emissive: '#661a00', ei: 0.4}),
			cockpit: pbr('#14161a', {rough: 0.9}),
			missile: pbr('#d9dde1', {rough: 0.35, metal: 0.3}),
		};
	}, [paint, seed]);
	const flameMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffb35a', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide}), []);
	const coreMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#cfe6ff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide}), []);
	const redNav = useMemo(() => new THREE.MeshBasicMaterial({color: '#ff2a2a', toneMapped: false}), []);
	const greenNav = useMemo(() => new THREE.MeshBasicMaterial({color: '#32ff7a', toneMapped: false}), []);

	const k = num(frame, canopy, 0);
	const b = num(frame, burner, 0.8);
	const flick = 0.9 + noise2D('burn', frame * 0.9, 0) * 0.12;
	const t = frame / fps;
	const blink = Math.sin(t * 9) > 0.55 ? 1.6 : 0.5;
	const ke = k * k;

	return (
		<group>
			<mesh geometry={G.body} material={m.body} castShadow receiveShadow />
			{/* hava girişi */}
			<mesh geometry={G.intake} material={m.body} position={[0, -0.6, 1.5]} scale={[0.58, 0.46, 1.9]} castShadow />
			<mesh geometry={G.intake} material={m.darker} position={[0, -0.6, 3.35]} scale={[0.5, 0.38, 0.07]} />
			{/* kokpit teknesi (koltuk bölgesi): koyu iç kısım */}
			<mesh material={m.cockpit} position={[0, 0.455, 2.1]} scale={[0.66, 0.04, 2.4]}>
				<boxGeometry args={[1, 1, 1]} />
			</mesh>
			<mesh material={m.dark} position={[0, 0.62, 3.25]} scale={[0.85, 0.2, 0.35]}>
				<boxGeometry args={[1, 1, 1]} />
			</mesh>
			{/* kanatlar */}
			{([1, -1] as const).map((s) => (
				<group key={s} scale={[s, 1, 1]}>
					<mesh geometry={G.wing} material={m.wing} position={[0, -0.15, 0]} rotation={[0, 0, 0.025]} castShadow receiveShadow />
					<mesh geometry={G.strake} material={m.wing} position={[0.1, 0.1, 0]} castShadow />
					<mesh geometry={G.stab} material={m.wing} position={[0, -0.05, 0]} castShadow receiveShadow />
					{/* ikiz dikey kuyruk (dışa eğik) */}
					<group position={[0.82, 0.35, 0]} rotation={[0, 0, -0.2 * s * s]}>
						<mesh geometry={G.fin} material={m.wing} castShadow receiveShadow />
						<mesh material={m.red} position={[0.0, 1.55, -5.9]} scale={[0.14, 0.5, 1.0]}>
							<boxGeometry args={[1, 1, 1]} />
						</mesh>
					</group>
					{/* kanat altı füzeler */}
					<mesh geometry={G.pylon} material={m.dark} position={[2.4, -0.38, -1.5]} rotation={[Math.PI / 2, 0, 0]} scale={[0.5, 0.2, 0.5]} />
					<mesh geometry={G.missile} material={m.missile} position={[2.4, -0.52, -1.5]} rotation={[Math.PI / 2, 0, 0]} castShadow />
					<mesh geometry={G.missile} material={m.missile} position={[5.18, -0.12, -2.2]} rotation={[Math.PI / 2, 0, 0]} scale={[0.75, 0.9, 0.75]} />
					<mesh geometry={G.nav} material={s === 1 ? greenNav : redNav} position={[5.15, -0.13, -1.7]} scale={blink} />
				</group>
			))}
			{/* egzoz */}
			<mesh geometry={G.nozzle} material={m.burn} position={[0, 0.02, -8.3]} rotation={[Math.PI / 2, 0, 0]} />
			<mesh geometry={G.nozzleIn} material={m.darker} position={[0, 0.02, -8.0]} rotation={[Math.PI / 2, 0, 0]} />
			{b > 0.02 ? (
				<group>
					<mesh geometry={G.flame} material={flameMat} position={[0, 0.02, -8.8 - 1.1 * b * flick]} scale={[0.95, 0.95, 2.4 * b * flick]} />
					<mesh geometry={G.flame} material={coreMat} position={[0, 0.02, -8.6 - 0.5 * b * flick]} scale={[0.55, 0.55, 1.1 * b * flick]} />
				</group>
			) : null}
			{/* kanopi: fırlayınca yukarı-geriye savrulur */}
			{ke < 0.98 ? (
				<group position={[0, 0.45 + ke * 7, 2.1 - ke * 14]} rotation={[-ke * 3.2, ke * 0.6, ke * 1.4]}>
					<mesh geometry={G.canopy} material={m.glass} scale={[0.72, 0.62, 1.55]} />
					{[-0.9, 0.0, 0.95].map((z) => (
						<mesh key={z} geometry={G.frameArc} material={m.frame} position={[0, 0, z]} scale={[0.72 * Math.sqrt(1 - Math.min(1, (z / 1.55) ** 2)), 0.62 * Math.sqrt(1 - Math.min(1, (z / 1.55) ** 2)), 1]} />
					))}
					<mesh material={m.frame} position={[0, 0.0, 0]} scale={[1.45, 0.05, 3.05]}>
						<boxGeometry args={[1, 1, 1]} />
					</mesh>
				</group>
			) : null}
		</group>
	);
};
