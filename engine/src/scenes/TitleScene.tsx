import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {Backdrop} from '../components/Backdrop';
import {Titles, TitleSpec} from '../components/Titles';
import {MetalCan} from '../components/MetalCan';
import {RetroTV} from '../components/RetroTV';
import {keyed, Key} from '../lib/anim';

export type TitleSceneProps = {
	bg?: 'navy' | 'red' | 'gold' | 'steel';
	titles?: TitleSpec[];
	can?: {from: number; y?: number; scale?: number} | null;
	tv?: {from: number; breakAt: number; text?: string; sub?: string} | null;
	zoom?: {t: number; v: number}[];
	grid?: boolean;
};

export const TitleScene: React.FC<TitleSceneProps> = (p) => {
	const frame = useCurrentFrame();
	const z = p.zoom ? keyed(frame, p.zoom as Key<number>[]) : 1 + frame * 0.0009;
	const dx = noise2D('tsx', frame * 0.02, 0) * 8;
	const dy = noise2D('tsy', frame * 0.02, 5) * 8;
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<AbsoluteFill style={{transform: `scale(${z}) translate(${dx}px, ${dy}px)`}}>
				<Backdrop hue={p.bg ?? 'navy'} grid={p.grid} />
				{p.can ? <MetalCan from={p.can.from} y={p.can.y ?? 760} scale={p.can.scale ?? 1} /> : null}
				{p.tv ? <RetroTV from={p.tv.from} breakAt={p.tv.breakAt} text={p.tv.text ?? 'REKLAM'} sub={p.tv.sub} /> : null}
			</AbsoluteFill>
			{p.titles ? <Titles titles={p.titles} /> : null}
			<AbsoluteFill
				style={{
					background: 'radial-gradient(ellipse 60% 40% at 50% 40%, rgba(255,255,255,0.06), transparent 70%)',
					opacity: interpolate(frame % 90, [0, 45, 90], [0.6, 1, 0.6]),
					mixBlendMode: 'screen',
				}}
			/>
		</AbsoluteFill>
	);
};
