// İç mekân: platform zemin, panjurlu pencereli duvarlar, halı. open (0→1) ile duvarlar dışa doğru devrilir
// (dönüşüm/ortam değişimi). Ofis, çalışma odası vb. için renk ve boyut parametreleri.
import React from 'react';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {clamp01} from '../../lib/anim';
import {easeFn, num, NumKey} from '../core/math';
import {mat} from '../core/materials';

export type RoomSpec = {
	w?: number;
	d?: number;
	h?: number;
	wall?: string;
	floor?: string;
	/** 0 = kapalı oda, 1 = duvarlar devrildi */
	open?: number | NumKey[];
	/** duvarların devrilme sırası gecikmesi (0–1 ilerleme payı) */
	stagger?: number;
	window?: boolean;
	rug?: string;
};

const fall = (k: number) => {
	// yerçekimi hissi + küçük sekme
	if (k < 0.85) return easeFn('in')(k / 0.85);
	const b = (k - 0.85) / 0.15;
	return 1 - Math.sin(b * Math.PI) * 0.04;
};

export const Room: React.FC<RoomSpec> = ({w = 7, d = 6, h = 3.2, wall = '#2a2f3a', floor = '#2b2420', open = 0, stagger = 0.18, window: win = true, rug = '#5a1620'}) => {
	const frame = useCurrentFrame();
	const o = num(frame, open, 0);
	const wk = (i: number) => fall(clamp01((o - i * stagger) / (1 - 2 * stagger)));
	const wallM = mat({color: wall, rough: 0.92});
	const trimM = mat({color: '#1a1d24', rough: 0.6});
	const floorM = mat({color: floor, rough: 0.55, metal: 0.05});
	const slatM = mat({color: '#c9c3b5', rough: 0.6});
	const t = 0.12;
	// arka duvar: pencere boşluğu (x: 0.4..2.2, y: 1.0..2.5)
	const wx0 = 0.4;
	const wx1 = 2.2;
	const wy0 = 1.0;
	const wy1 = 2.5;
	const back = (
		<group>
			<mesh material={wallM} position={[(-w / 2 + wx0) / 2, h / 2, 0]} castShadow receiveShadow>
				<boxGeometry args={[wx0 + w / 2, h, t]} />
			</mesh>
			<mesh material={wallM} position={[(wx1 + w / 2) / 2, h / 2, 0]} castShadow receiveShadow>
				<boxGeometry args={[w / 2 - wx1, h, t]} />
			</mesh>
			<mesh material={wallM} position={[(wx0 + wx1) / 2, wy0 / 2, 0]} castShadow receiveShadow>
				<boxGeometry args={[wx1 - wx0, wy0, t]} />
			</mesh>
			<mesh material={wallM} position={[(wx0 + wx1) / 2, (wy1 + h) / 2, 0]} castShadow receiveShadow>
				<boxGeometry args={[wx1 - wx0, h - wy1, t]} />
			</mesh>
			{win
				? Array.from({length: 13}, (_, i) => (
						<mesh key={i} material={slatM} position={[(wx0 + wx1) / 2, wy0 + 0.06 + i * 0.112, 0.08]} rotation={[0.75, 0, 0]} castShadow>
							<boxGeometry args={[wx1 - wx0, 0.07, 0.006]} />
						</mesh>
				  ))
				: null}
			<mesh material={trimM} position={[(wx0 + wx1) / 2, wy0 - 0.03, 0.06]}>
				<boxGeometry args={[wx1 - wx0 + 0.1, 0.05, 0.14]} />
			</mesh>
			<mesh material={trimM} position={[0, 0.06, 0.07]}>
				<boxGeometry args={[w, 0.12, 0.03]} />
			</mesh>
		</group>
	);
	const side = (
		<group>
			<mesh material={wallM} position={[0, h / 2, 0]} castShadow receiveShadow>
				<boxGeometry args={[t, h, d]} />
			</mesh>
		</group>
	);
	return (
		<group>
			{/* zemin platformu */}
			<mesh material={floorM} position={[0, -0.175, 0]} receiveShadow castShadow>
				<boxGeometry args={[w + 1, 0.35, d + 2]} />
			</mesh>
			{rug ? (
				<mesh material={mat({color: rug, rough: 1})} position={[0, 0.006, 0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
					<planeGeometry args={[3.2, 2.4]} />
				</mesh>
			) : null}
			{/* arka duvar: z = -d/2, -z yönüne devrilir */}
			<group position={[0, 0, -d / 2]} rotation={[(-Math.PI / 2) * wk(0), 0, 0]}>
				{back}
			</group>
			{/* sol duvar */}
			<group position={[-w / 2, 0, 0]} rotation={[0, 0, (Math.PI / 2) * wk(1)]}>
				{side}
			</group>
			{/* sağ duvar */}
			<group position={[w / 2, 0, 0]} rotation={[0, 0, (-Math.PI / 2) * wk(2)]}>
				{side}
			</group>
		</group>
	);
};
