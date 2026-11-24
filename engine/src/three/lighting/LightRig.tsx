// JSON ile tanımlanan dinamik ışıklar: yoğunluk/renk/konum anahtar karelerle değişir, gölge seçimi ışık başına.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {num, NumKey, vec, V3, VecKey} from '../core/math';

export type LightSpec = {
	type: 'ambient' | 'hemi' | 'dir' | 'point' | 'spot';
	color?: string;
	ground?: string; // hemi
	intensity: number | NumKey[];
	pos?: V3 | VecKey[];
	target?: V3;
	castShadow?: boolean;
	shadowSize?: number; // dir: gölge kamerası yarı genişliği
	mapSize?: number;
	distance?: number;
	decay?: number;
	angle?: number;
	penumbra?: number;
	/** Titreşim (lamba/ateş): 0–1 */
	flicker?: number;
	bias?: number;
};

const Spot: React.FC<{l: LightSpec; i: number; p: V3; idx: number}> = ({l, i, p, idx}) => {
	const target = useMemo(() => new THREE.Object3D(), []);
	const t = l.target ?? [0, 0, 0];
	target.position.set(t[0], t[1], t[2]);
	target.updateMatrixWorld();
	return (
		<>
			<primitive object={target} />
			<spotLight
				position={p}
				color={l.color ?? '#ffffff'}
				intensity={i}
				distance={l.distance ?? 0}
				decay={l.decay ?? 2}
				angle={l.angle ?? 0.6}
				penumbra={l.penumbra ?? 0.6}
				target={target}
				castShadow={l.castShadow}
				shadow-mapSize={[l.mapSize ?? 1024, l.mapSize ?? 1024]}
				shadow-bias={l.bias ?? -0.0004}
				shadow-normalBias={0.02}
				key={idx}
			/>
		</>
	);
};

const Dir: React.FC<{l: LightSpec; i: number; p: V3}> = ({l, i, p}) => {
	const target = useMemo(() => new THREE.Object3D(), []);
	const t = l.target ?? [0, 0, 0];
	target.position.set(t[0], t[1], t[2]);
	target.updateMatrixWorld();
	const s = l.shadowSize ?? 8;
	return (
		<>
			<primitive object={target} />
			<directionalLight
				position={p}
				color={l.color ?? '#ffffff'}
				intensity={i}
				target={target}
				castShadow={l.castShadow}
				shadow-mapSize={[l.mapSize ?? 2048, l.mapSize ?? 2048]}
				shadow-bias={l.bias ?? -0.0003}
				shadow-normalBias={0.03}
				shadow-camera-left={-s}
				shadow-camera-right={s}
				shadow-camera-top={s}
				shadow-camera-bottom={-s}
				shadow-camera-near={0.5}
				shadow-camera-far={200}
			/>
		</>
	);
};

export const LightRig: React.FC<{lights: LightSpec[]}> = ({lights}) => {
	const frame = useCurrentFrame();
	return (
		<>
			{lights.map((l, idx) => {
				let i = num(frame, l.intensity, 1);
				if (l.flicker) i *= 1 + noise2D('fl' + idx, frame * 0.4, 0) * l.flicker * 0.5;
				// Işık sayısı sabit tutulur (0 yoğunlukta bile) → shader yeniden derlenmez
				const p = vec(frame, l.pos, [0, 5, 0]);
				switch (l.type) {
					case 'ambient':
						return <ambientLight key={idx} color={l.color} intensity={i} />;
					case 'hemi':
						return <hemisphereLight key={idx} args={[l.color ?? '#ffffff', l.ground ?? '#202020', i]} />;
					case 'dir':
						return <Dir key={idx} l={l} i={i} p={p} />;
					case 'point':
						return (
							<pointLight key={idx} position={p} color={l.color} intensity={i} distance={l.distance ?? 0} decay={l.decay ?? 2} castShadow={l.castShadow} shadow-mapSize={[l.mapSize ?? 512, l.mapSize ?? 512]} shadow-bias={l.bias ?? -0.001} />
						);
					case 'spot':
						return <Spot key={idx} idx={idx} l={l} i={i} p={p} />;
					default:
						return null;
				}
			})}
		</>
	);
};
