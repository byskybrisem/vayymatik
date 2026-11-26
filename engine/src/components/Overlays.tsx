import React from 'react';
import {AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {hash} from '../lib/anim';
import {FONTS, useBrand} from '../lib/theme';
import {trUpper} from '../lib/tr';

// Film greni + vinyet: tüm sahnelerin üstünde, sinematik doku.
export const GlobalFX: React.FC<{grain?: number; vignette?: number}> = ({grain = 0.055, vignette = 0.55}) => {
	const frame = useCurrentFrame();
	const ox = Math.floor(hash(frame) * 256);
	const oy = Math.floor(hash(frame + 99) * 256);
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<AbsoluteFill
				style={{
					background: `radial-gradient(ellipse 75% 62% at 50% 46%, rgba(0,0,0,0) 55%, rgba(0,0,0,${vignette}) 100%)`,
				}}
			/>
			<AbsoluteFill
				style={{
					backgroundImage: `url(${staticFile('shared/grain.png')})`,
					backgroundPosition: `${ox}px ${oy}px`,
					backgroundSize: '256px 256px',
					mixBlendMode: 'overlay',
					opacity: grain,
				}}
			/>
		</AbsoluteFill>
	);
};

export const Watermark: React.FC = () => {
	const brand = useBrand();
	const {width, height} = useVideoConfig();
	if (!brand.watermark.show) return null;
	if (width > height) {
		// 16:9: sağ altta küçük ve yarı saydam (altyazı ve ROV arayüzüyle çakışmaz)
		return (
			<div style={{position: 'absolute', right: 56, bottom: 38, display: 'flex', alignItems: 'center', gap: 9, opacity: 0.62}}>
				<div style={{width: 7, height: 24, background: brand.colors.red, borderRadius: 2}} />
				<div style={{fontFamily: FONTS.display, fontSize: 24, letterSpacing: 3, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.7)'}}>{brand.watermark.text}</div>
			</div>
		);
	}
	return (
		<div
			style={{
				position: 'absolute',
				left: brand.safe.left,
				top: brand.safe.top - 42,
				display: 'flex',
				alignItems: 'center',
				gap: 12,
				opacity: 0.88,
			}}
		>
			<div style={{width: 10, height: 34, background: brand.colors.red, borderRadius: 3}} />
			<div
				style={{
					fontFamily: FONTS.display,
					fontSize: 34,
					letterSpacing: 4,
					color: '#fff',
					textShadow: '0 2px 10px rgba(0,0,0,0.7)',
				}}
			>
				{brand.watermark.text}
			</div>
		</div>
	);
};

// "TEMSİLİ CANLANDIRMA" gibi şeffaflık etiketleri
export const Disclaimers: React.FC<{items?: {text: string; from: number; to: number}[]}> = ({items}) => {
	const frame = useCurrentFrame();
	const brand = useBrand();
	const {width, height} = useVideoConfig();
	const it = (items ?? []).find((d) => frame >= d.from && frame < d.to);
	if (!it) return null;
	const land = width > height;
	const a = interpolate(frame, [it.from, it.from + 6, it.to - 6, it.to], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<div
			data-safe="tag"
			style={{
				position: 'absolute',
				...(land ? {left: '50%', top: 40, transform: 'translateX(-50%)'} : {right: brand.safe.right + 10, top: brand.safe.top - 40}),
				opacity: a * 0.9,
				fontFamily: FONTS.ui,
				fontWeight: 700,
				fontSize: 22,
				letterSpacing: 3,
				color: 'rgba(255,255,255,0.92)',
				background: 'rgba(0,0,0,0.38)',
				border: '1.5px solid rgba(255,255,255,0.35)',
				borderRadius: 8,
				padding: '6px 12px',
			}}
		>
			{trUpper(it.text)}
		</div>
	);
};
