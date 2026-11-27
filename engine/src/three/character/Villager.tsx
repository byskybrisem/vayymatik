// Tarihsel canlandırma figürü (köylü): tunik, başörtüsü/takke, sade kollar-bacaklar. Hareketler kareye bağlı sinüslerle sürülür.
// action: stand | stir (karıştır) | sit | carry (yük taşı) | walk | weave (dokuma/el işi) | torch (meşale tutar, yürür) | tend (hayvan/eşya bakımı) | push (it)
import React from 'react';
import * as THREE from 'three';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {mat} from '../core/materials';
import {Flame} from '../fx/Flame';

const G = {
	head: new THREE.IcosahedronGeometry(0.115, 1),
	cap: new THREE.SphereGeometry(0.128, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
	scarfTail: new THREE.BoxGeometry(0.2, 0.2, 0.05),
	nose: new THREE.ConeGeometry(0.018, 0.045, 4),
	neck: new THREE.CylinderGeometry(0.045, 0.05, 0.08, 6),
	torso: new THREE.CylinderGeometry(0.17, 0.23, 0.62, 8),
	skirt: new THREE.CylinderGeometry(0.23, 0.29, 0.34, 8),
	belt: new THREE.CylinderGeometry(0.235, 0.235, 0.05, 8),
	arm: new THREE.CylinderGeometry(0.046, 0.04, 0.34, 6),
	fore: new THREE.CylinderGeometry(0.04, 0.034, 0.3, 6),
	hand: new THREE.IcosahedronGeometry(0.04, 0),
	leg: new THREE.CylinderGeometry(0.07, 0.055, 0.5, 6),
	shin: new THREE.CylinderGeometry(0.055, 0.045, 0.46, 6),
	foot: new THREE.BoxGeometry(0.09, 0.06, 0.2),
	sack: new THREE.IcosahedronGeometry(0.2, 0),
	bowl: new THREE.CylinderGeometry(0.1, 0.06, 0.07, 8),
	spoon: new THREE.CylinderGeometry(0.012, 0.012, 0.5, 5),
};

export type VillagerProps = {
	action?: string;
	tunic?: string;
	scarf?: string;
	phase?: number;
	scale?: number;
	/** yürüyüş/koşu döngü hızı (adım/sn); action walk|torch|carry yürüyorsa */
	speed?: number;
	/** aralık dışında dururken (kare) hareket etmez */
	from?: number;
	to?: number;
};

export const Villager: React.FC<VillagerProps> = ({action = 'stand', tunic = '#8c4a3a', scarf = '#d8c7a6', phase = 0, scale = 1, speed = 1.7, from, to}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const moving = from === undefined || (frame >= from && frame <= (to ?? 1e9));
	const t = frame / fps + phase;
	const walking = moving && (action === 'walk' || action === 'torch' || action === 'carry' || action === 'push');
	const w = walking ? Math.sin(t * speed * Math.PI) : 0;
	const breathe = Math.sin(t * 1.9) * 0.008;
	const sit = action === 'sit';
	const rootY = (sit ? 0.34 : 0.98) + breathe + (walking ? -Math.abs(Math.cos(t * speed * Math.PI)) * 0.03 : 0);
	let shL: [number, number, number] = [0.15, 0, 0.1];
	let shR: [number, number, number] = [0.15, 0, -0.1];
	let elL = -0.2;
	let elR = -0.2;
	let torso = 0;
	let headX = 0;
	let carry = false;
	let torch = false;
	let stir = false;
	if (walking) {
		shL = [w * 0.6, 0, 0.1];
		shR = [-w * 0.6, 0, -0.1];
		torso = 0.04 * w;
	}
	switch (action) {
		case 'stir': {
			stir = true;
			const s = Math.sin(t * 3.2);
			const c = Math.cos(t * 3.2);
			shR = [-1.0 + c * 0.12, 0.2 + s * 0.2, -0.15];
			elR = -0.9 + s * 0.12;
			shL = [-0.7, -0.15, 0.2];
			elL = -0.8;
			torso = 0.16;
			headX = 0.25;
			break;
		}
		case 'carry':
			carry = true;
			shL = [-1.05, 0.15, 0.1];
			shR = [-1.05, -0.15, -0.1];
			elL = -0.85;
			elR = -0.85;
			torso = -0.05 + (walking ? 0.03 * w : 0);
			break;
		case 'sit':
			shL = [-0.55, 0.1, 0.12];
			shR = [-0.55, -0.1, -0.12];
			elL = -1.0;
			elR = -1.0;
			headX = 0.12 + Math.sin(t * 0.8) * 0.04;
			break;
		case 'weave': {
			const s = Math.sin(t * 4.1);
			shL = [-0.85 + s * 0.12, 0.2, 0.15];
			shR = [-0.85 - s * 0.12, -0.2, -0.15];
			elL = -1.0 + s * 0.15;
			elR = -1.0 - s * 0.15;
			torso = 0.12;
			headX = 0.3;
			break;
		}
		case 'torch':
			torch = true;
			shR = [-2.55 + Math.sin(t * 1.3) * 0.05, 0, -0.2];
			elR = -0.3;
			break;
		case 'tend': {
			const s = Math.sin(t * 1.5);
			shR = [-0.7 + s * 0.35, 0, -0.2];
			elR = -0.9;
			shL = [-0.45, 0, 0.2];
			elL = -0.6;
			torso = 0.22 + s * 0.04;
			headX = 0.2;
			break;
		}
		case 'push':
			shL = [-1.45, 0.1, 0.12];
			shR = [-1.45, -0.1, -0.12];
			elL = -0.2;
			elR = -0.2;
			torso = 0.3;
			break;
		default:
			break;
	}
	const skin = '#b98660';
	const tunicM = mat({color: tunic, rough: 0.9});
	const scarfM = mat({color: scarf, rough: 0.85});
	const skinM = mat({color: skin, rough: 0.8});
	const darkM = mat({color: '#2f2118', rough: 0.9});
	const Arm: React.FC<{side: 1 | -1; sh: [number, number, number]; el: number}> = ({side, sh, el}) => (
		<group position={[side * 0.235, 0.52, 0]} rotation={[sh[0], sh[1], sh[2]]}>
			<mesh geometry={G.arm} material={tunicM} position={[0, -0.17, 0]} />
			<group position={[0, -0.34, 0]} rotation={[el, 0, 0]}>
				<mesh geometry={G.fore} material={skinM} position={[0, -0.15, 0]} />
				<mesh geometry={G.hand} material={skinM} position={[0, -0.32, 0]} />
				{side === 1 && stir ? <mesh geometry={G.spoon} material={darkM} position={[0, -0.3, 0.05]} rotation={[0.4, 0, 0]} /> : null}
				{side === 1 && torch ? (
					<group position={[0, -0.36, 0.02]} rotation={[Math.PI * 0.0, 0, 0]}>
						<Flame size={0.62} stick glow={0.9} seed={Math.floor(phase * 10)} />
					</group>
				) : null}
			</group>
		</group>
	);
	return (
		<group scale={scale}>
			<group position={[0, rootY, 0]}>
				<group rotation={[torso, 0, 0]}>
					<mesh geometry={G.torso} material={tunicM} position={[0, 0.26, 0]} />
					<mesh geometry={G.belt} material={mat({color: '#3a2a1c'})} position={[0, 0.02, 0]} />
					<mesh geometry={G.skirt} material={tunicM} position={[0, -0.12, 0]} />
					<mesh geometry={G.neck} material={skinM} position={[0, 0.62, 0]} />
					<group position={[0, 0.74, 0]} rotation={[headX, Math.sin(t * 0.6) * 0.18, 0]}>
						<mesh geometry={G.head} material={skinM} />
						<mesh geometry={G.cap} material={scarfM} position={[0, 0.015, -0.005]} />
						<mesh geometry={G.scarfTail} material={scarfM} position={[0, -0.05, -0.1]} rotation={[0.3, 0, 0]} />
						<mesh geometry={G.nose} material={skinM} position={[0, -0.01, 0.12]} rotation={[Math.PI / 2, 0, 0]} />
					</group>
					<Arm side={-1} sh={shL} el={elL} />
					<Arm side={1} sh={shR} el={elR} />
					{carry ? <mesh geometry={G.sack} material={mat({color: '#a68a5a', rough: 0.95})} position={[0, 0.2, 0.36]} scale={[1, 0.8, 0.9]} /> : null}
					{stir ? <mesh geometry={G.bowl} material={mat({color: '#6b4a34'})} position={[-0.04, 0.12, 0.34]} /> : null}
				</group>
				{/* bacaklar */}
				{sit ? (
					<>
						<group position={[-0.1, -0.05, 0]} rotation={[-1.45, 0, 0.1]}>
							<mesh geometry={G.leg} material={tunicM} position={[0, -0.25, 0]} />
							<group position={[0, -0.5, 0]} rotation={[1.4, 0, 0]}>
								<mesh geometry={G.shin} material={darkM} position={[0, -0.23, 0]} />
							</group>
						</group>
						<group position={[0.1, -0.05, 0]} rotation={[-1.45, 0, -0.1]}>
							<mesh geometry={G.leg} material={tunicM} position={[0, -0.25, 0]} />
							<group position={[0, -0.5, 0]} rotation={[1.4, 0, 0]}>
								<mesh geometry={G.shin} material={darkM} position={[0, -0.23, 0]} />
							</group>
						</group>
					</>
				) : (
					<>
						<group position={[-0.1, -0.05, 0]} rotation={[-w * 0.55, 0, 0]}>
							<mesh geometry={G.leg} material={tunicM} position={[0, -0.25, 0]} />
							<group position={[0, -0.5, 0]} rotation={[Math.max(0, w) * 0.7, 0, 0]}>
								<mesh geometry={G.shin} material={darkM} position={[0, -0.23, 0]} />
								<mesh geometry={G.foot} material={darkM} position={[0, -0.48, 0.05]} />
							</group>
						</group>
						<group position={[0.1, -0.05, 0]} rotation={[w * 0.55, 0, 0]}>
							<mesh geometry={G.leg} material={tunicM} position={[0, -0.25, 0]} />
							<group position={[0, -0.5, 0]} rotation={[Math.max(0, -w) * 0.7, 0, 0]}>
								<mesh geometry={G.shin} material={darkM} position={[0, -0.23, 0]} />
								<mesh geometry={G.foot} material={darkM} position={[0, -0.48, 0.05]} />
							</group>
						</group>
					</>
				)}
			</group>
		</group>
	);
};
