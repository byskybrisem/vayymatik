// Meşale / ateş: birkaç yanıp sönen koni + parıltı sprite'ı. Titreşim kareye bağlı gürültüyle (deterministik).
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {glowTexture} from '../core/textures';

const coneG = new THREE.ConeGeometry(0.5, 1, 6, 1, true);
const MATS = {
	core: new THREE.MeshBasicMaterial({color: '#fff1b0', toneMapped: false, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false}),
	mid: new THREE.MeshBasicMaterial({color: '#ffab33', toneMapped: false, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false}),
	out: new THREE.MeshBasicMaterial({color: '#e8501a', toneMapped: false, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false}),
};
const stickG = new THREE.CylinderGeometry(0.028, 0.04, 0.62, 6);
const stickM = new THREE.MeshStandardMaterial({color: '#4a3020', roughness: 0.9, flatShading: true});

/** size: alev boyu çarpanı (1 = meşale). stick: meşale sapı çizilsin mi. glow: halenin gücü. */
export const Flame: React.FC<{size?: number; stick?: boolean; glow?: number; seed?: number}> = ({size = 1, stick = false, glow = 1, seed = 0}) => {
	const frame = useCurrentFrame();
	const n1 = noise2D('fl' + seed, frame * 0.45, 1);
	const n2 = noise2D('fl' + seed, frame * 0.31, 7);
	const n3 = noise2D('fl' + seed, frame * 0.7, 13);
	const h = (0.95 + n1 * 0.22) * size;
	const sway = n2 * 0.06 * size;
	const sm = useMemo(() => new THREE.SpriteMaterial({map: glowTexture(), color: '#ff9a3c', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false}), []);
	sm.opacity = (0.34 + n3 * 0.08) * glow;
	return (
		<group>
			{stick ? <mesh geometry={stickG} material={stickM} position={[0, -0.3, 0]} /> : null}
			<group position={[sway, 0.12 * size, 0]}>
				<mesh geometry={coneG} material={MATS.out} scale={[0.22 * size, h * 0.42, 0.22 * size]} position={[0, h * 0.2, 0]} />
				<mesh geometry={coneG} material={MATS.mid} scale={[0.15 * size, h * 0.32, 0.15 * size]} position={[sway * 0.5, h * 0.17, 0]} />
				<mesh geometry={coneG} material={MATS.core} scale={[0.08 * size, h * 0.2, 0.08 * size]} position={[sway, h * 0.11, 0]} />
			</group>
			<sprite material={sm} scale={[2.0 * size, 2.0 * size, 1]} position={[0, 0.25 * size, 0.05]} />
		</group>
	);
};
