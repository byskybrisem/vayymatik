// Pilot: uçuş tulumu, can yeleği, kask + siperlik + oksijen maskesi, eldiven, bot. Yüzü görünmez (siperlik) → inandırıcı ve güvenli.
// Yerel eksenler: pelvis orijin, yüz +Z, yukarı +Y. Oturuş pozu varsayılan.
// `flail` (0–1): rüzgâr darbesiyle kol/bacak savrulması (olası uzuv riski) · `headBack` (0–1): baş geriye · `hang` (0–1): paraşütte asılı poz.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {num, NumKey} from '../core/math';
import {pbr} from './common';

const G = {
	pelvis: new THREE.SphereGeometry(0.19, 20, 14),
	torso: new THREE.CapsuleGeometry(0.17, 0.3, 8, 18),
	vest: new THREE.CapsuleGeometry(0.182, 0.16, 8, 18),
	neck: new THREE.CylinderGeometry(0.058, 0.065, 0.12, 12),
	helmet: new THREE.SphereGeometry(0.138, 28, 20),
	visor: new THREE.SphereGeometry(0.143, 28, 14, Math.PI / 2 - 1.15, 2.3, 0.95, 1.05),
	mask: new THREE.BoxGeometry(0.1, 0.075, 0.07),
	cup: new THREE.CylinderGeometry(0.05, 0.05, 0.04, 14),
	hose: new THREE.TorusGeometry(0.12, 0.012, 6, 16, Math.PI * 0.8),
	shoulder: new THREE.SphereGeometry(0.066, 14, 10),
	upper: new THREE.CapsuleGeometry(0.052, 0.2, 6, 12),
	fore: new THREE.CapsuleGeometry(0.045, 0.2, 6, 12),
	glove: new THREE.SphereGeometry(0.055, 12, 10),
	thigh: new THREE.CapsuleGeometry(0.078, 0.3, 6, 14),
	shin: new THREE.CapsuleGeometry(0.06, 0.32, 6, 14),
	boot: new THREE.BoxGeometry(0.11, 0.09, 0.27),
	stripe: new THREE.TorusGeometry(0.14, 0.011, 6, 28),
};
G.vest.scale(1.0, 1, 0.78);
G.torso.scale(1.0, 1, 0.74);
G.helmet.scale(0.96, 1.04, 1.14);
G.boot.translate(0, -0.03, 0.06);

export type PilotProps = {
	flail?: number | NumKey[];
	headBack?: number | NumKey[];
	hang?: number | NumKey[];
	seed?: number;
	/** kask rengi */
	helmet?: string;
};

export const Pilot: React.FC<PilotProps> = ({flail = 0, headBack = 0, hang = 0, seed = 1, helmet = '#dfe3e6'}) => {
	const frame = useCurrentFrame();
	const m = useMemo(
		() => ({
			suit: pbr('#59614f', {rough: 0.82}),
			suitDark: pbr('#464d3f', {rough: 0.85}),
			vest: pbr('#e5701f', {rough: 0.7}),
			helmet: pbr(helmet, {rough: 0.22, metal: 0.1, env: 1.2}),
			visor: pbr('#2a2318', {rough: 0.03, metal: 1, env: 2.6}),
			mask: pbr('#2a2f2b', {rough: 0.6}),
			glove: pbr('#27282b', {rough: 0.7}),
			boot: pbr('#17171a', {rough: 0.45, metal: 0.1}),
			band: pbr('#E8112D', {rough: 0.4}),
			hose: pbr('#1a1c1a', {rough: 0.6}),
		}),
		[helmet],
	);
	const f = num(frame, flail, 0);
	const hb = num(frame, headBack, 0);
	const hg = num(frame, hang, 0);
	const n = (a: string, sp: number, o = 0) => noise2D(a + seed, frame * sp, o);
	const j = f; // salınım genliği
	const L = (a: number, b: number) => a + (b - a) * hg;

	// kollar: oturuşta dizlere/yan tutamağa; savrulmada geri-yukarı ve dışa; asılı: yukarıda
	const arm = (s: 1 | -1) => {
		const sx = L(-0.55 + j * (1.35 + n('a' + s, 0.3) * 0.5), -2.7);
		const sz = L(s * (0.18 + j * (0.6 + n('b' + s, 0.37, 2) * 0.35)), s * 0.28);
		const ex = L(-1.0 + j * (0.7 + n('c' + s, 0.45, 4) * 0.7), -0.5);
		return {sx, sz: -sz, ex};
	};
	// bacaklar: savrulmada uzayıp açılır
	const leg = (s: 1 | -1) => {
		const hx = L(-1.45 + j * (0.95 + n('d' + s, 0.28, 6) * 0.45), -0.2);
		const hz = L(s * (0.04 + j * (0.38 + n('e' + s, 0.33, 8) * 0.18)), s * 0.06);
		const kx = L(1.45 - j * (0.8 + n('f' + s, 0.4, 10) * 0.4), 0.45);
		return {hx, hz: -hz, kx};
	};
	const lean = -0.04 - hb * 0.16 + hg * 0.04;
	const headX = -hb * 0.55 + n('h', 0.5, 12) * 0.08 * j;

	return (
		<group>
			<mesh geometry={G.pelvis} material={m.suit} scale={[1.2, 0.8, 1.0]} castShadow receiveShadow />
			<group position={[0, 0.06, -0.01]} rotation={[lean, 0, 0]}>
				<mesh geometry={G.torso} material={m.suit} position={[0, 0.3, 0]} castShadow receiveShadow />
				{/* can yeleği */}
				<mesh geometry={G.vest} material={m.vest} position={[0, 0.36, 0.015]} castShadow />
				{/* boyun + kafa */}
				<group position={[0, 0.66, 0.01]} rotation={[headX * 0.4, 0, 0]}>
					<mesh geometry={G.neck} material={m.suit} position={[0, 0.0, 0]} />
					<group position={[0, 0.13, 0.015]} rotation={[headX * 0.6, n('hy', 0.3, 14) * 0.12 * j, 0]}>
						<mesh geometry={G.helmet} material={m.helmet} castShadow receiveShadow />
						<mesh geometry={G.visor} material={m.visor} />
						<mesh geometry={G.stripe} material={m.band} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.07, 0]} scale={[0.96, 1.14, 0.98]} />
						<mesh geometry={G.mask} material={m.mask} position={[0, -0.075, 0.145]} />
						<mesh geometry={G.cup} material={m.mask} position={[0.145, -0.01, 0.0]} rotation={[0, 0, Math.PI / 2]} />
						<mesh geometry={G.cup} material={m.mask} position={[-0.145, -0.01, 0.0]} rotation={[0, 0, Math.PI / 2]} />
						<mesh geometry={G.hose} material={m.hose} position={[0.0, -0.12, 0.12]} rotation={[0.2, 0, Math.PI]} />
					</group>
				</group>
				{/* kollar */}
				{([1, -1] as const).map((s) => {
					const a = arm(s);
					return (
						<group key={s} position={[0.215 * s, 0.52, 0]} rotation={[a.sx, s * 0.05, a.sz]}>
							<mesh geometry={G.shoulder} material={m.suit} castShadow />
							<mesh geometry={G.upper} material={m.suit} position={[0, -0.16, 0]} castShadow />
							<group position={[0, -0.3, 0]} rotation={[a.ex, 0, 0]}>
								<mesh geometry={G.fore} material={m.suit} position={[0, -0.15, 0]} castShadow />
								<mesh geometry={G.glove} material={m.glove} position={[0, -0.33, 0]} scale={[1, 1.1, 0.9]} castShadow />
							</group>
						</group>
					);
				})}
			</group>
			{/* bacaklar */}
			{([1, -1] as const).map((s) => {
				const l = leg(s);
				return (
					<group key={s} position={[0.1 * s, -0.01, 0.02]} rotation={[l.hx, 0, l.hz]}>
						<mesh geometry={G.thigh} material={m.suitDark} position={[0, -0.24, 0]} castShadow receiveShadow />
						<group position={[0, -0.47, 0]} rotation={[l.kx, 0, 0]}>
							<mesh geometry={G.shin} material={m.suitDark} position={[0, -0.22, 0]} castShadow />
							<mesh geometry={G.boot} material={m.boot} position={[0, -0.47, 0]} castShadow />
						</group>
					</group>
				);
			})}
		</group>
	);
};
