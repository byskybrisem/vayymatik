// Bölüm başlığı katmanı (sol alt, ince çizgi + harf aralıklı başlık); slayt değil, sahnenin üstünde.
import React from 'react';
import {getInputProps, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONTS} from '../lib/theme';
import {ease} from '../lib/anim';

export type ChapterSpec = {n: string; title: string; at?: number; dur?: number};

const CLEAN = (() => {
	try {
		return Boolean((getInputProps() as {clean?: boolean}).clean);
	} catch {
		return false;
	}
})();

export const Chapter: React.FC<{spec: ChapterSpec}> = ({spec}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H, fps} = useVideoConfig();
	if (CLEAN) return null;
	const at = spec.at ?? 6;
	const dur = spec.dur ?? 4.2 * fps;
	const a = interpolate(frame, [at, at + 14, at + dur - 14, at + dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	if (a <= 0) return null;
	const w = interpolate(frame, [at, at + 24], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.out});
	const land = W > H;
	return (
		<div style={{position: 'absolute', left: land ? 96 : 70, top: land ? H * 0.64 : H * 0.2, opacity: a}}>
			<div style={{fontFamily: FONTS.mono, fontSize: land ? 22 : 26, letterSpacing: 8, color: '#62F0E4'}}>{spec.n}</div>
			<div style={{width: (land ? 420 : 380) * w, height: 2, background: 'linear-gradient(90deg, #62F0E4, rgba(98,240,228,0))', margin: '12px 0 14px'}} />
			<div style={{fontFamily: FONTS.display, fontSize: land ? 76 : 84, letterSpacing: 4, color: '#fff', textShadow: '0 4px 40px rgba(0,0,0,0.85)', clipPath: `inset(0 ${(1 - w) * 100}% 0 0)`}}>{spec.title}</div>
		</div>
	);
};
