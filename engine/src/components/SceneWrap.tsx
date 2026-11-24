import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import type {SceneSpec} from '../types';
import {ease} from '../lib/anim';

export const SceneWrap: React.FC<{spec: SceneSpec; children: React.ReactNode}> = ({spec, children}) => {
	const frame = useCurrentFrame();
	const tr = spec.transitionIn;
	if (!tr || tr.type === 'cut' || frame >= tr.dur) return <AbsoluteFill>{children}</AbsoluteFill>;
	const p = ease.out(Math.min(1, Math.max(0, frame / tr.dur)));
	let style: React.CSSProperties = {};
	let overlay: React.ReactNode = null;
	switch (tr.type) {
		case 'fade':
			style = {opacity: p};
			break;
		case 'blur':
			style = {opacity: p, filter: `blur(${(1 - p) * 30}px)`};
			break;
		case 'zoom':
			style = {opacity: Math.min(1, p * 1.6), transform: `scale(${interpolate(p, [0, 1], [1.35, 1])})`, filter: `blur(${(1 - p) * 22}px)`};
			break;
		case 'whip': {
			const d = tr.dir === 'left' ? -1 : tr.dir === 'up' || tr.dir === 'down' ? 0 : 1;
			const v = tr.dir === 'up' ? -1 : tr.dir === 'down' ? 1 : 0;
			const off = (1 - p) * 100;
			style = {
				transform: `translate(${d * off}%, ${v * off}%)`,
				filter: `blur(${(1 - p) * 26}px)`,
			};
			break;
		}
		case 'flash':
			overlay = <AbsoluteFill style={{background: '#fff', opacity: interpolate(frame, [0, tr.dur], [0.95, 0], {extrapolateRight: 'clamp'})}} />;
			break;
		case 'glitch': {
			const j = (1 - p) * 40;
			const n = noise2D('g', frame * 2.1, 0);
			style = {transform: `translateX(${n * j}px)`, filter: `saturate(${1 + (1 - p) * 2}) hue-rotate(${n * 40 * (1 - p)}deg)`};
			overlay = (
				<AbsoluteFill
					style={{
						background: `repeating-linear-gradient(0deg, rgba(255,255,255,${0.12 * (1 - p)}) 0 2px, rgba(0,0,0,0) 2px 7px)`,
						mixBlendMode: 'screen',
					}}
				/>
			);
			break;
		}
	}
	return (
		<AbsoluteFill>
			<AbsoluteFill style={style}>{children}</AbsoluteFill>
			{overlay}
		</AbsoluteFill>
	);
};
