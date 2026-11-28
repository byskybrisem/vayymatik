// Özgün, stilize low-poly 3D karakter (VAYYMATİK). Basit kutu değil: yüzlü kafa, sakal, saç, kaş/göz/ağız,
// eklemli kollar, parmaklar, ceket + gömlek + kravat. Poz/ifade/konuşma/yürüyüş JSON anahtar kareleriyle sürülür.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {mat, PALETTE} from '../core/materials';
import {StateKey, stateWeights, VecKey, vec, NumKey, num} from '../core/math';
import {applyWalk, blendExpr, blendPose, blink, talkAmount, TalkWord, WalkSpec} from './rig';

import {gait, solve} from './contact';

export type ContactMotion = {steps: number; stepTime: number; stride: number; hand: VecKey[]; grip?: NumKey[]};
export type Outfit = {skin?: string; hair?: string; suit?: string; shirt?: string; tie?: string; pants?: string; shoes?: string; beard?: boolean};

export type CharacterProps = {
	pose?: StateKey[] | string;
	expr?: StateKey[] | string;
	talk?: TalkWord[];
	walk?: WalkSpec;
	contact?: ContactMotion;
	/** Bakış ofseti [pitch, yaw, roll] (radyan) anahtar kareleri */
	look?: VecKey[];
	outfit?: Outfit;
	seed?: number;
	/** Nefes/ağırlık aktarımı gibi boşta hareketler */
	idle?: number;
};

const G = {
	head: new THREE.IcosahedronGeometry(0.135, 1),
	chin: new THREE.IcosahedronGeometry(0.085, 1),
	hair: new THREE.SphereGeometry(0.148, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.46),
	quiff: new THREE.IcosahedronGeometry(0.07, 0),
	beard: new THREE.SphereGeometry(0.142, 12, 6, 0, Math.PI, Math.PI * 0.5, Math.PI * 0.36),
	eye: new THREE.SphereGeometry(0.02, 10, 8),
	iris: new THREE.SphereGeometry(0.0125, 8, 6),
	brow: new THREE.BoxGeometry(0.058, 0.013, 0.016),
	nose: new THREE.ConeGeometry(0.021, 0.055, 4),
	mouth: new THREE.SphereGeometry(0.03, 10, 6),
	lip: new THREE.TorusGeometry(0.032, 0.0055, 4, 10, Math.PI * 0.75),
	ear: new THREE.IcosahedronGeometry(0.03, 0),
	neck: new THREE.CylinderGeometry(0.052, 0.058, 0.11, 7),
	collar: new THREE.CylinderGeometry(0.068, 0.074, 0.05, 8, 1, true),
	chest: new THREE.CylinderGeometry(0.215, 0.165, 0.32, 8),
	belly: new THREE.CylinderGeometry(0.17, 0.165, 0.2, 8),
	pelvis: new THREE.CylinderGeometry(0.168, 0.15, 0.16, 8),
	shirtV: new THREE.ConeGeometry(0.075, 0.2, 3),
	tie: new THREE.ConeGeometry(0.03, 0.2, 4),
	knot: new THREE.OctahedronGeometry(0.022, 0),
	lapel: new THREE.BoxGeometry(0.06, 0.2, 0.02),
	shoulder: new THREE.IcosahedronGeometry(0.078, 1),
	upperArm: new THREE.CylinderGeometry(0.066, 0.056, 0.29, 7),
	elbow: new THREE.IcosahedronGeometry(0.057, 0),
	forearm: new THREE.CylinderGeometry(0.055, 0.045, 0.25, 7),
	cuff: new THREE.CylinderGeometry(0.047, 0.047, 0.03, 7),
	palm: new THREE.BoxGeometry(0.078, 0.09, 0.034),
	finger: new THREE.BoxGeometry(0.017, 0.062, 0.019),
	thumb: new THREE.BoxGeometry(0.02, 0.05, 0.02),
	thigh: new THREE.CylinderGeometry(0.084, 0.068, 0.44, 7),
	knee: new THREE.IcosahedronGeometry(0.068, 0),
	shin: new THREE.CylinderGeometry(0.064, 0.05, 0.42, 7),
	shoe: new THREE.BoxGeometry(0.1, 0.075, 0.26),
	toe: new THREE.CylinderGeometry(0.05, 0.05, 0.1, 7, 1, false, 0, Math.PI),
};
G.chest.scale(1, 1, 0.64);
G.belly.scale(1, 1, 0.68);
G.pelvis.scale(1, 1, 0.7);
G.head.scale(0.92, 1.08, 0.98);
G.chin.scale(1.05, 0.8, 1);
G.lip.rotateZ(Math.PI + Math.PI * 0.125);

const Hand: React.FC<{side: 1 | -1; curl: number; point: number; m: {skin: THREE.Material}}> = ({side, curl, point, m}) => {
	const fingers = [0, 1, 2, 3];
	return (
		<group>
			<mesh geometry={G.palm} material={m.skin} position={[0, -0.05, 0]} castShadow />
			{fingers.map((i) => {
				const c = i === 0 ? curl * (1 - point) : curl;
				return (
					<group key={i} position={[(-0.028 + i * 0.019) * side, -0.093, 0]} rotation={[-c * 1.5, 0, 0]}>
						<mesh geometry={G.finger} material={m.skin} position={[0, -0.028 + (i === 3 ? 0.008 : 0), 0]} scale={[1, i === 3 ? 0.8 : 1, 1]} castShadow />
					</group>
				);
			})}
			<group position={[-0.045 * side, -0.045, 0.012]} rotation={[-0.4 - curl * 0.5, 0, 0.6 * side * -1]}>
				<mesh geometry={G.thumb} material={m.skin} position={[0, -0.022, 0]} castShadow />
			</group>
		</group>
	);
};

export const Character: React.FC<CharacterProps> = ({pose = 'stand', expr = 'neutral', talk, walk, contact, look, outfit = {}, seed = 1, idle = 1}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const m = useMemo(
		() => ({
			skin: mat({color: outfit.skin ?? PALETTE.skin, rough: 0.62}),
			skinDark: mat({color: PALETTE.skinShadow, rough: 0.7}),
			hair: mat({color: outfit.hair ?? PALETTE.hair, rough: 0.85}),
			beard: mat({color: outfit.hair ?? '#3a2a22', rough: 0.95}),
			suit: mat({color: outfit.suit ?? PALETTE.suit, rough: 0.6}),
			pants: mat({color: outfit.pants ?? '#141c2e', rough: 0.7}),
			shirt: mat({color: outfit.shirt ?? PALETTE.shirt, rough: 0.55}),
			tie: mat({color: outfit.tie ?? PALETTE.red, rough: 0.4, metal: 0.1}),
			shoes: mat({color: outfit.shoes ?? '#0c0c10', rough: 0.3, metal: 0.2}),
			eye: mat({color: '#f4f1ea', rough: 0.25, flat: false}),
			iris: mat({color: '#2b1a10', rough: 0.1, flat: false}),
			mouth: mat({color: '#3a1214', rough: 0.9}),
			lip: mat({color: '#8d4a3c', rough: 0.6}),
		}),
		[outfit.skin, outfit.hair, outfit.suit, outfit.pants, outfit.shirt, outfit.tie, outfit.shoes],
	);

	const p = applyWalk(blendPose(stateWeights(frame, pose, 'stand', 10)), frame, fps, walk);
	let advance = 0;
	if (contact) {
		const {feet, root} = gait(frame / fps, contact.steps, contact.stepTime, contact.stride);
		advance = root;
		p.rootY = .935;
		for (const [i, side] of (['L', 'R'] as const).entries()) {
			const [hip, knee] = solve(p.rootY - .04 - .0575 - feet[i][1], feet[i][0] - root, .44, .44, 1);
			p[`hip${side}X`] = hip;
			p[`hip${side}Z`] = 0;
			p[`kn${side}X`] = knee;
			p[`ank${side}X`] = -hip - knee;
		}
		const wrist = vec(frame, contact.hand, [.215, 1.02, .15]);
		[p.shLX, p.elLX] = solve(p.rootY + .54 - wrist[1], wrist[2] - root, .29, .26, -1);
		p.shLZ = p.shLY = p.elLY = p.spineX = p.spineY = p.chestX = p.chestY = 0;
		p.fingerL = num(frame, contact.grip, .72);
		if (contact.grip) {
		    // Keep the palm upright for a grasp or a fingertip contact.
		    p.wrLX = Math.max(-1.4, Math.min(1.4, -p.shLX - p.elLX));
		    p.wrLZ = 0;
		}
	}
	const e = blendExpr(stateWeights(frame, expr, 'neutral', 8));
	const t = talkAmount(frame, talk);
	const bl = blink(frame, seed);
	const lk = vec(frame, look, [0, 0, 0]);

	// boşta hareket: nefes + mikro kafa hareketi
	const breath = Math.sin((frame / fps) * Math.PI * 0.5) * 0.012 * (contact ? 0 : idle);
	const hx = noise2D('hx' + seed, frame * 0.02, 0) * 0.03 * idle + t.accent * 0.05;
	const hy = noise2D('hy' + seed, frame * 0.018, 2) * 0.04 * idle;

	const jaw = Math.max(e.jaw, t.open * 0.55);
	const eyeS = Math.max(0.08, e.eyeOpen * bl);
	const browLift = e.browY + t.accent * 0.006;

	return (
		<group>
			{/* PELVIS (kök) */}
			<group position={[0, p.rootY, advance]}>
				<mesh geometry={G.pelvis} material={m.pants} position={[0, 0, 0]} castShadow receiveShadow />
				{/* GÖVDE */}
				<group position={[0, 0.07, 0]} rotation={[p.spineX, p.spineY, 0]}>
					<mesh geometry={G.belly} material={m.suit} position={[0, 0.1, 0]} castShadow receiveShadow />
					<group position={[0, 0.2, 0]} rotation={[p.chestX - breath, p.chestY, 0]} scale={[1 + breath * 0.6, 1, 1 + breath]}>
						<mesh geometry={G.chest} material={m.suit} position={[0, 0.16, 0]} castShadow receiveShadow />
						{/* gömlek V + kravat + yakalar */}
						<mesh geometry={G.shirtV} material={m.shirt} position={[0, 0.235, 0.088]} rotation={[0.18, 0, Math.PI]} scale={[1, 1, 0.25]} />
						<mesh geometry={G.knot} material={m.tie} position={[0, 0.3, 0.105]} />
						<mesh geometry={G.tie} material={m.tie} position={[0, 0.2, 0.1]} rotation={[0.17, 0, Math.PI]} scale={[1, 1, 0.35]} />
						<mesh geometry={G.lapel} material={m.suit} position={[0.055, 0.22, 0.094]} rotation={[0.16, 0, 0.42]} castShadow />
						<mesh geometry={G.lapel} material={m.suit} position={[-0.055, 0.22, 0.094]} rotation={[0.16, 0, -0.42]} castShadow />
						{/* BOYUN + KAFA */}
						<group position={[0, 0.33, 0]} rotation={[p.neckX, 0, 0]}>
							<mesh geometry={G.collar} material={m.shirt} position={[0, 0.0, 0]} />
							<mesh geometry={G.neck} material={m.skin} position={[0, 0.045, 0]} castShadow />
							<group position={[0, 0.1, 0]} rotation={[p.headX + hx + lk[0], p.headY + hy + lk[1], p.headZ + lk[2]]}>
								<group position={[0, 0.12, 0]}>
									<mesh geometry={G.head} material={m.skin} castShadow receiveShadow />
									<group position={[0, -0.072 - jaw * 0.012, 0.018]}>
										<mesh geometry={G.chin} material={m.skin} castShadow />
									</group>
									{outfit.beard ? <mesh geometry={G.beard} material={m.beard} position={[0, -0.006 - jaw * 0.006, 0.004]} scale={[1.0, 1.05 + jaw * 0.06, 1.02]} /> : null}
									<mesh geometry={G.hair} material={m.hair} position={[0, 0.02, -0.012]} rotation={[-0.42, 0, 0]} scale={[1.02, 1, 1.05]} castShadow />
									<mesh geometry={G.quiff} material={m.hair} position={[0.03, 0.125, 0.06]} rotation={[0.5, 0.3, 0.2]} scale={[1.4, 0.6, 1]} castShadow />
									<mesh geometry={G.ear} material={m.skin} position={[0.128, 0.0, -0.005]} scale={[0.5, 1, 0.8]} />
									<mesh geometry={G.ear} material={m.skin} position={[-0.128, 0.0, -0.005]} scale={[0.5, 1, 0.8]} />
									{/* gözler */}
									{[1, -1].map((s) => (
										<group key={s} position={[0.046 * s, 0.016, 0.104]} scale={[1, eyeS, 1]}>
											<mesh geometry={G.eye} material={m.eye} scale={[1, 1, 0.55]} />
											<mesh geometry={G.iris} material={m.iris} position={[0 + lk[1] * 0.01, -lk[0] * 0.01, 0.011]} scale={[1, 1, 0.5]} />
										</group>
									))}
									{/* kaşlar: yükseklik + iç uç eğimi */}
									{[1, -1].map((s) => (
										<mesh key={s} geometry={G.brow} material={m.hair} position={[0.05 * s, 0.052 + browLift, 0.116]} rotation={[0.1, 0.15 * s, -e.browTilt * s * 0.6]} />
									))}
									<mesh geometry={G.nose} material={m.skinDark} position={[0, -0.012, 0.14]} rotation={[Math.PI / 2 - 0.35, Math.PI / 4, 0]} scale={[1, 1, 0.8]} />
									{/* ağız: iç boşluk (konuşma) + dudak eğrisi (gülümseme) */}
									<group position={[0, -0.058 - jaw * 0.01, 0.118]}>
										<mesh geometry={G.mouth} material={m.mouth} scale={[1.2 * e.mouthW + t.open * 0.15, 0.06 + jaw * 0.85, 0.35]} />
										<mesh geometry={G.lip} material={m.lip} position={[0, 0.012 + e.smile * 0.004, 0.006]} scale={[e.mouthW * (1 + e.smile * 0.1), 0.15 + e.smile * 0.55, 1]} />
									</group>
								</group>
							</group>
						</group>
						{/* KOLLAR */}
						{([1, -1] as const).map((s) => {
							const L = s === 1;
							return (
								<group key={s} position={[0.215 * s, 0.27, 0]} rotation={[L ? p.shLX : p.shRX, L ? p.shLY : p.shRY, L ? p.shLZ : p.shRZ]}>
									<mesh geometry={G.shoulder} material={m.suit} castShadow />
									<mesh geometry={G.upperArm} material={m.suit} position={[0, -0.145, 0]} castShadow />
									<group position={[0, -0.29, 0]} rotation={[L ? p.elLX : p.elRX, L ? p.elLY : p.elRY, 0]}>
										<mesh geometry={G.elbow} material={m.suit} castShadow />
										<mesh geometry={G.forearm} material={m.suit} position={[0, -0.125, 0]} castShadow />
										<mesh geometry={G.cuff} material={m.shirt} position={[0, -0.25, 0]} />
										<group position={[0, -0.26, 0]} rotation={[L ? p.wrLX : p.wrRX, 0, L ? p.wrLZ : p.wrRZ]}>
											<Hand side={s} curl={L ? p.fingerL : p.fingerR} point={L ? p.pointL : p.pointR} m={m} />
										</group>
									</group>
								</group>
							);
						})}
					</group>
				</group>
				{/* BACAKLAR */}
				{([1, -1] as const).map((s) => {
					const L = s === 1;
					return (
						<group key={s} position={[0.092 * s, -0.04, 0]} rotation={[L ? p.hipLX : p.hipRX, 0, L ? p.hipLZ : p.hipRZ]}>
							<mesh geometry={G.thigh} material={m.pants} position={[0, -0.22, 0]} castShadow receiveShadow />
							<group position={[0, -0.44, 0]} rotation={[L ? p.knLX : p.knRX, 0, 0]}>
								<mesh geometry={G.knee} material={m.pants} castShadow />
								<mesh geometry={G.shin} material={m.pants} position={[0, -0.21, 0]} castShadow receiveShadow />
								<group position={[0, -0.44, 0]} rotation={[L ? p.ankLX : p.ankRX, 0, 0]}>
									<mesh geometry={G.shoe} material={m.shoes} position={[0, -0.02, 0.05]} castShadow receiveShadow />
								</group>
							</group>
						</group>
					);
				})}
			</group>
		</group>
	);
};
