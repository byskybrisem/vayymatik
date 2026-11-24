// "world3d" sahne türü: tamamen JSON ile tanımlanan 3D sahne (ortam + karakterler + nesneler + kamera + ışık).
// topic.json → scenes[].props:
// { "stage": {...}, "fog": {...}, "camera": {...}, "lights": [...], "objects": [ {"kind": "character", "pos": [...], ...} ],
//   "titles": [...], "grade": {...} }
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Stage3D, StageProps} from './core/Stage3D';
import {CameraRig, CameraSpec} from './camera/CameraRig';
import {LightRig, LightSpec} from './lighting/LightRig';
import {Animated, Transform} from './objects/Animated';
import {OBJECTS} from './registry';
import {num, NumKey} from './core/math';
import {Titles, TitleSpec} from '../components/Titles';

export type ObjectSpec = Transform & {kind: string; id?: string; children?: ObjectSpec[]; [k: string]: unknown};
export type ColorKey = {t: number; v: string};

export type World3DProps = {
	stage?: Omit<StageProps, 'children'>;
	fog?: {color: string | ColorKey[]; near: number | NumKey[]; far: number | NumKey[]};
	camera: CameraSpec;
	lights?: LightSpec[];
	objects?: ObjectSpec[];
	titles?: TitleSpec[];
	/** Renk düzenleme + ışık sızıntısı (2D katman, ucuz) */
	grade?: {saturate?: number; contrast?: number; leak?: string; leakOpacity?: number | NumKey[]; flash?: NumKey[]};
};

const color = (frame: number, c: string | ColorKey[]) => {
	if (typeof c === 'string') return new THREE.Color(c);
	if (frame <= c[0].t) return new THREE.Color(c[0].v);
	for (let i = 0; i < c.length - 1; i++) {
		if (frame <= c[i + 1].t) {
			const p = (frame - c[i].t) / Math.max(1, c[i + 1].t - c[i].t);
			return new THREE.Color(c[i].v).lerp(new THREE.Color(c[i + 1].v), p);
		}
	}
	return new THREE.Color(c[c.length - 1].v);
};

const FogRig: React.FC<{fog: NonNullable<World3DProps['fog']>}> = ({fog}) => {
	const frame = useCurrentFrame();
	const scene = useThree((s) => s.scene);
	const f = useMemo(() => new THREE.Fog('#000', 1, 100), []);
	scene.fog = f;
	f.color.copy(color(frame, fog.color));
	f.near = num(frame, fog.near, 10);
	f.far = num(frame, fog.far, 100);
	return null;
};

const RESERVED = new Set(['kind', 'id', 'children', 'pos', 'rot', 'scale', 'show']);

const Obj: React.FC<{o: ObjectSpec}> = ({o}) => {
	const C = o.kind === 'group' ? null : OBJECTS[o.kind];
	if (o.kind !== 'group' && !C) throw new Error(`Bilinmeyen 3D nesne türü: ${o.kind}`);
	const props = Object.fromEntries(Object.entries(o).filter(([k]) => !RESERVED.has(k)));
	return (
		<Animated pos={o.pos} rot={o.rot} scale={o.scale} show={o.show}>
			{C ? <C {...props} /> : null}
			{o.children?.map((c, i) => <Obj key={c.id ?? i} o={c} />)}
		</Animated>
	);
};

export const World3DScene: React.FC<World3DProps> = ({stage, fog, camera, lights = [], objects = [], titles, grade}) => {
	const frame = useCurrentFrame();
	const leak = grade?.leak;
	const flash = grade?.flash ? num(frame, grade.flash, 0) : 0;
	return (
		<AbsoluteFill style={{background: stage?.bg ?? '#05070D'}}>
			<AbsoluteFill style={{filter: `saturate(${grade?.saturate ?? 1.08}) contrast(${grade?.contrast ?? 1.06})`}}>
				<Stage3D {...stage}>
					{fog ? <FogRig fog={fog} /> : null}
					<CameraRig spec={camera} />
					<LightRig lights={lights} />
					{objects.map((o, i) => (
						<Obj key={o.id ?? i} o={o} />
					))}
				</Stage3D>
			</AbsoluteFill>
			{leak ? (
				<AbsoluteFill
					style={{
						background: `radial-gradient(ellipse 90% 55% at 70% 18%, ${leak}, rgba(0,0,0,0) 70%)`,
						mixBlendMode: 'screen',
						opacity: num(frame, grade?.leakOpacity, 0.35),
						pointerEvents: 'none',
					}}
				/>
			) : null}
			{flash > 0 ? <AbsoluteFill style={{background: '#fff6e0', opacity: flash, pointerEvents: 'none'}} /> : null}
			{titles ? <Titles titles={titles} /> : null}
		</AbsoluteFill>
	);
};
