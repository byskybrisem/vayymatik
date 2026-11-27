// Teknik görünüm yardımcıları: dönen halkalar + ızgara zemini (anatomi/kesit sahneleri), yukarı akan ivme okları.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {num, NumKey, V3} from '../core/math';

type K = number | NumKey[];

export const HudRings: React.FC<{y?: number; color?: string; opacity?: K; radius?: number; grid?: boolean}> = ({y = -0.5, color = '#3fd0ff', opacity = 0.6, radius = 1.4, grid = true}) => {
	const frame = useCurrentFrame();
	const op = num(frame, opacity, 0.6);
	const mat = useMemo(() => new THREE.MeshBasicMaterial({color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide}), [color]);
	const gmat = useMemo(() => new THREE.LineBasicMaterial({color, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false}), [color]);
	const gh = useMemo(() => new THREE.GridHelper(8, 32, color, color), [color]);
	mat.opacity = op;
	(gh.material as THREE.LineBasicMaterial).opacity = 0.18 * op;
	(gh.material as THREE.LineBasicMaterial).transparent = true;
	(gh.material as THREE.LineBasicMaterial).depthWrite = false;
	void gmat;
	const a = frame * 0.018;
	return (
		<group position={[0, y, 0]}>
			<mesh rotation={[-Math.PI / 2, 0, a]} material={mat}>
				<ringGeometry args={[radius, radius + 0.012, 96, 1, 0, Math.PI * 1.6]} />
			</mesh>
			<mesh rotation={[-Math.PI / 2, 0, -a * 1.4]} material={mat}>
				<ringGeometry args={[radius * 1.25, radius * 1.25 + 0.008, 96, 1, 0, Math.PI * 1.1]} />
			</mesh>
			<mesh rotation={[-Math.PI / 2, 0, a * 0.6]} material={mat}>
				<ringGeometry args={[radius * 0.72, radius * 0.72 + 0.01, 96, 1, 0, Math.PI * 0.7]} />
			</mesh>
			{grid ? <primitive object={gh} position={[0, -0.01, 0]} /> : null}
		</group>
	);
};

/** Yukarı doğru akan ivme okları (chevron), koltuğun altında/içinde. Renk turuncu → ivme vurgusu. */
export const Chevrons: React.FC<{count?: number; spacing?: number; speed?: number; color?: string; opacity?: K; size?: number; pos?: V3}> = ({count = 6, spacing = 0.42, speed = 1.6, color = '#ff8a2a', opacity = 0.8, size = 0.34}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const op = num(frame, opacity, 0.8);
	const geo = useMemo(() => {
		const s = new THREE.Shape();
		s.moveTo(-1, -0.35);
		s.lineTo(0, 0.55);
		s.lineTo(1, -0.35);
		s.lineTo(1, -0.8);
		s.lineTo(0, 0.1);
		s.lineTo(-1, -0.8);
		s.closePath();
		return new THREE.ShapeGeometry(s);
	}, []);
	const mat = useMemo(() => new THREE.MeshBasicMaterial({color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide}), [color]);
	const t = (frame / fps) * speed;
	return (
		<group>
			{Array.from({length: count}, (_, i) => {
				const ph = (((i / count + t * 0.35) % 1) + 1) % 1;
				const m = mat.clone();
				m.opacity = op * Math.sin(ph * Math.PI) * 0.9;
				return <mesh key={i} geometry={geo} material={m} position={[0, -ph * count * spacing, 0]} scale={[size, size, size]} />;
			})}
		</group>
	);
};
