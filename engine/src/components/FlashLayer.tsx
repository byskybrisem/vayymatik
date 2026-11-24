import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {SceneSpec} from '../types';

// 'flash' geçişleri: tüm katmanların (altyazı dahil) üstünde kısa beyaz parlama
export const FlashLayer: React.FC<{scenes: SceneSpec[]}> = ({scenes}) => {
	const frame = useCurrentFrame();
	const s = scenes.find((x) => x.transitionIn?.type === 'flash' && frame >= x.from && frame < x.from + (x.transitionIn?.dur ?? 0));
	if (!s || !s.transitionIn) return null;
	const o = interpolate(frame - s.from, [0, s.transitionIn.dur], [0.92, 0], {extrapolateRight: 'clamp'});
	return <AbsoluteFill style={{background: '#fff', opacity: o, pointerEvents: 'none'}} />;
};
