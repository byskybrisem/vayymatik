// Her nesne için ortak sarmalayıcı: konum/dönüş/ölçek anahtar kareleri + giriş/çıkış animasyonları.
// JSON: {"pos": [x,y,z] | [{t, v}], "rot": ..., "scale": 1 | [x,y,z], "show": {"from": 1.2, "dur": 0.5, "in": "rise", "to": 4, "out": 0.3, "outFx": "fade"}}
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {clamp01} from '../../lib/anim';
import {easeFn, num, NumKey, vec, V3, VecKey} from '../core/math';

export type ShowSpec = {
	from?: number;
	dur?: number;
	in?: 'pop' | 'rise' | 'drop' | 'grow' | 'spin' | 'none';
	/** Giriş mesafesi (rise/drop) metre */
	dist?: number;
	to?: number;
	out?: number;
	outFx?: 'shrink' | 'sink' | 'none';
};

export type Transform = {
	pos?: V3 | VecKey[];
	rot?: V3 | VecKey[];
	scale?: number | NumKey[] | V3;
	show?: ShowSpec;
};

const enterAmount = (frame: number, s?: ShowSpec) => {
	if (!s) return {k: 1, visible: true};
	const from = s.from ?? 0;
	if (frame < from) return {k: 0, visible: false};
	let k = clamp01((frame - from) / Math.max(1, s.dur ?? 12));
	if (s.to !== undefined && frame >= s.to) {
		const o = clamp01((frame - s.to) / Math.max(1, s.out ?? 8));
		if (o >= 1) return {k: 0, visible: false};
		k = Math.min(k, 1 - o);
	}
	return {k, visible: true};
};

export const Animated: React.FC<Transform & {children: React.ReactNode}> = ({pos, rot, scale, show, children}) => {
	const frame = useCurrentFrame();
	const {k, visible} = enterAmount(frame, show);
	if (!visible) return null;
	const p = vec(frame, pos, [0, 0, 0]);
	const r = vec(frame, rot, [0, 0, 0]);
	const sc: V3 = Array.isArray(scale) && typeof scale[0] === 'number' && scale.length === 3 ? (scale as V3) : (() => {
		const v = num(frame, scale as number | NumKey[] | undefined, 1);
		return [v, v, v] as V3;
	})();
	const mode = show?.in ?? 'pop';
	let s = 1;
	let dy = 0;
	let ry = 0;
	if (show && k < 1) {
		const b = easeFn('back')(k);
		const o = easeFn('out')(k);
		const d = show.dist ?? 0.6;
		switch (mode) {
			case 'pop':
				s = Math.max(0.0001, b);
				break;
			case 'grow':
				s = Math.max(0.0001, o);
				break;
			case 'rise':
				dy = -(1 - o) * d;
				s = Math.max(0.0001, Math.min(1, o * 1.6));
				break;
			case 'drop':
				dy = (1 - easeFn('in')(Math.min(1, k * 1.1))) * d;
				break;
			case 'spin':
				s = Math.max(0.0001, b);
				ry = (1 - o) * Math.PI * 2;
				break;
		}
	}
	if (show?.to !== undefined && frame >= show.to && show.outFx === 'sink') dy -= (1 - k) * (show.dist ?? 0.6);
	return (
		<group position={[p[0], p[1] + dy, p[2]]} rotation={[r[0], r[1] + ry, r[2]]} scale={[sc[0] * s, sc[1] * s, sc[2] * s]}>
			{children}
		</group>
	);
};
