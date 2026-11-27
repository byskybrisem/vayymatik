// Fırlatma koltuğu (özgün, genel tasarım). Pilot koltuğa +Z yönüne bakacak şekilde oturur (pelvis ≈ orijin).
// Parçalar: gövde/kabuk, kafalık, ana kemer + omuz askıları, bacak tutucuları, roket motoru, paraşüt kabı, stabilizasyon kolları.
// `ghost` (0–1): kabuğu yarı saydam yapar (kesit görünümü) · `hl` parça parlaması · `fire` roket alevi · `fins` stabilizasyon kollarını açar.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {num, NumKey} from '../core/math';
import {pbr} from './common';

type K = number | NumKey[];
export type SeatProps = {
	ghost?: K;
	fire?: K;
	fins?: K;
	/** parça parlaması: {rocket, harness, chute, fins} */
	hl?: {rocket?: K; harness?: K; chute?: K; fins?: K};
	/** dilimleme düzlemi parıltısı 0–1 (kesit animasyonu) */
	scan?: K;
};

const G = {
	pan: new THREE.BoxGeometry(0.46, 0.07, 0.5),
	back: new THREE.BoxGeometry(0.4, 0.82, 0.1),
	head: new THREE.BoxGeometry(0.3, 0.22, 0.14),
	rail: new THREE.CylinderGeometry(0.018, 0.018, 1.5, 10),
	motor: new THREE.CylinderGeometry(0.075, 0.075, 0.62, 18),
	nozzle: new THREE.CylinderGeometry(0.06, 0.1, 0.12, 18, 1, true),
	chute: new THREE.BoxGeometry(0.3, 0.28, 0.17),
	strap: new THREE.BoxGeometry(0.055, 0.62, 0.012),
	lap: new THREE.BoxGeometry(0.5, 0.05, 0.012),
	buckle: new THREE.BoxGeometry(0.07, 0.07, 0.02),
	handle: new THREE.BoxGeometry(0.2, 0.035, 0.035),
	boom: new THREE.CylinderGeometry(0.014, 0.014, 1, 8),
	drogue: new THREE.CylinderGeometry(0.14, 0.14, 0.015, 20),
	flame: new THREE.ConeGeometry(0.1, 1, 14, 1, true),
	reel: new THREE.CylinderGeometry(0.06, 0.06, 0.08, 14),
	garter: new THREE.TorusGeometry(0.085, 0.012, 6, 14),
	scan: new THREE.PlaneGeometry(1.5, 1.7),
};
G.flame.rotateX(Math.PI);
G.back.translate(0, 0.475, 0);
G.rail.translate(0, 0.6, 0);

export const EjectionSeat: React.FC<SeatProps> = ({ghost = 0, fire = 0, fins = 0, hl = {}, scan = 0}) => {
	const frame = useCurrentFrame();
	const m = useMemo(() => {
		const mk = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({color: c, roughness: 0.45, metalness: 0.55, transparent: true, ...o});
		return {
			shell: mk('#454b55', {roughness: 0.45}),
			shell2: mk('#575e69', {roughness: 0.5}),
			rail: mk('#b9c0c8', {roughness: 0.25, metalness: 0.9}),
			motor: mk('#7a2a18', {roughness: 0.5, emissive: '#000000'}),
			nozzle: mk('#202225', {roughness: 0.4, metalness: 0.9}),
			chute: mk('#c05a12', {roughness: 0.7, metalness: 0.1}),
			strap: mk('#17191b', {roughness: 0.8, metalness: 0.05}),
			buckle: mk('#cfd3d8', {roughness: 0.25, metalness: 0.95}),
			handle: mk('#f2c200', {roughness: 0.5, metalness: 0.1}),
			boom: mk('#aab2bb', {roughness: 0.3, metalness: 0.9}),
			drogue: mk('#e8e8e8', {roughness: 0.7, metalness: 0}),
		};
	}, []);
	const fm = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffb257', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide}), []);
	const fm2 = useMemo(() => new THREE.MeshBasicMaterial({color: '#e9f4ff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide}), []);
	const sm = useMemo(() => new THREE.MeshBasicMaterial({color: '#52d4ff', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide}), []);

	const gh = num(frame, ghost, 0);
	const fr = num(frame, fire, 0);
	const fn = num(frame, fins, 0);
	const sc = num(frame, scan, 0);
	const h = {rocket: num(frame, hl.rocket, 0), harness: num(frame, hl.harness, 0), chute: num(frame, hl.chute, 0), fins: num(frame, hl.fins, 0)};

	// kabuk saydamlığı + parça parlamaları (örnek başına malzeme → önbellek paylaşılmaz)
	const op = 1 - 0.8 * gh;
	m.shell.opacity = op;
	m.shell2.opacity = op;
	m.rail.opacity = 1 - 0.35 * gh;
	const glow = (mm: THREE.MeshStandardMaterial, c: string, v: number) => {
		mm.emissive.set(c);
		mm.emissiveIntensity = v * 2.2;
	};
	glow(m.motor, '#ff7a1c', h.rocket);
	glow(m.nozzle, '#ff7a1c', h.rocket * 0.5);
	glow(m.strap, '#2fd0ff', h.harness);
	glow(m.buckle, '#2fd0ff', h.harness * 0.6);
	glow(m.chute, '#ffb14a', h.chute);
	glow(m.boom, '#2fd0ff', h.fins);
	glow(m.drogue, '#2fd0ff', h.fins * 0.5);

	const flick = 0.9 + noise2D('seatfire', frame * 0.8, 0) * 0.14;
	const boomAng = 0.1 + fn * 0.8;
	const boomLen = 0.15 + fn * 0.95;

	return (
		<group>
			{/* ana kabuk */}
			<mesh geometry={G.pan} material={m.shell} position={[0, -0.1, 0.07]} castShadow receiveShadow />
			<mesh geometry={G.back} material={m.shell} position={[0, -0.05, -0.2]} rotation={[-0.05, 0, 0]} castShadow receiveShadow />
			<mesh geometry={G.head} material={m.shell2} position={[0, 0.98, -0.2]} castShadow />
			<mesh geometry={G.head} material={m.shell2} position={[0, 0.86, -0.25]} scale={[1.1, 0.4, 0.8]} />
			{/* raylar */}
			{[-0.27, 0.27].map((x) => (
				<mesh key={x} geometry={G.rail} material={m.rail} position={[x, -0.4, -0.3]} castShadow />
			))}
			{/* paraşüt kabı (kafalığın arkasında) */}
			<mesh geometry={G.chute} material={m.chute} position={[0, 0.7, -0.33]} castShadow />
			{/* roket motoru */}
			<mesh geometry={G.motor} material={m.motor} position={[0, -0.18, -0.34]} castShadow />
			<mesh geometry={G.nozzle} material={m.nozzle} position={[0, -0.55, -0.34]} />
			<mesh geometry={G.reel} material={m.nozzle} position={[0.2, 0.55, -0.27]} rotation={[0, 0, Math.PI / 2]} />
			<mesh geometry={G.reel} material={m.nozzle} position={[-0.2, 0.55, -0.27]} rotation={[0, 0, Math.PI / 2]} />
			{/* omuz askıları + kemer */}
			{[-1, 1].map((s) => (
				<mesh key={s} geometry={G.strap} material={m.strap} position={[0.1 * s, 0.4, 0.145]} rotation={[0.05, 0, -s * 0.08]} />
			))}
			<mesh geometry={G.lap} material={m.strap} position={[0, 0.07, 0.145]} />
			<mesh geometry={G.buckle} material={m.buckle} position={[0, 0.1, 0.16]} />
			{/* bacak tutucuları */}
			{[-1, 1].map((s) => (
				<mesh key={s} geometry={G.garter} material={m.strap} position={[0.1 * s, -0.04, 0.4]} rotation={[0, Math.PI / 2, 0]} />
			))}
			{/* tutamak */}
			<mesh geometry={G.handle} material={m.handle} position={[0, 0.2, 0.34]} />
			{/* stabilizasyon kolları */}
			{([1, -1] as const).map((s) => (
				<group key={s} position={[0.27 * s, 0.35, -0.3]} rotation={[0, s * boomAng, 0]}>
					<mesh geometry={G.boom} material={m.boom} position={[0, 0, -boomLen / 2]} rotation={[Math.PI / 2, 0, 0]} scale={[1, boomLen, 1]} />
					<mesh geometry={G.drogue} material={m.drogue} position={[0, 0, -boomLen]} rotation={[Math.PI / 2, 0, 0]} scale={[0.5 + fn * 0.5, 1, 0.5 + fn * 0.5]} />
				</group>
			))}
			{/* roket alevi */}
			{fr > 0.02 ? (
				<group position={[0, -0.62, -0.34]}>
					<mesh geometry={G.flame} material={fm} position={[0, -0.55 * fr * flick, 0]} scale={[1.1, 1.1 * fr * flick * 1.6, 1.1]} />
					<mesh geometry={G.flame} material={fm2} position={[0, -0.25 * fr * flick, 0]} scale={[0.55, 0.5 * fr * flick * 1.6, 0.55]} />
				</group>
			) : null}
			{/* kesit tarama düzlemi */}
			{sc > 0.01 && sc < 0.99 ? <mesh geometry={G.scan} material={sm} position={[-0.45 + sc * 0.9, 0.3, 0.0]} rotation={[0, Math.PI / 2, 0]} /> : null}
		</group>
	);
};
