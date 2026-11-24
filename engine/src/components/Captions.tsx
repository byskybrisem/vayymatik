import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CaptionPage, CaptionWord} from '../types';
import {colorOf, FONTS, useBrand} from '../lib/theme';
import {trUpper} from '../lib/tr';

const STYLE_COLOR: Record<string, string> = {accent: 'red', gold: 'gold', white: 'white', plain: 'white'};

const Word: React.FC<{w: CaptionWord; pageFrom: number}> = ({w, pageFrom}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const brand = useBrand();
	const active = frame >= w.from && frame < w.to;
	const spoken = frame >= w.from;
	const pop = spring({frame: frame - w.from, fps, config: {damping: 14, stiffness: 260, mass: 0.6}});
	const appear = spring({frame: frame - Math.min(w.from, pageFrom + 2), fps, config: {damping: 20, stiffness: 200}});
	const emph = w.style === 'accent' || w.style === 'gold';
	const scale = (spoken ? interpolate(pop, [0, 1], [0.86, 1]) : 0.9) * (active && emph ? 1.08 : 1);
	const baseColor = emph ? colorOf(brand, STYLE_COLOR[w.style]) : '#FFFFFF';
	const color = spoken ? baseColor : 'rgba(255,255,255,0.93)';
	return (
		<span
			style={{
				display: 'inline-block',
				margin: '0 0.16em',
				transform: `translateY(${interpolate(appear, [0, 1], [18, 0])}px) scale(${scale})`,
				opacity: interpolate(appear, [0, 1], [0, 1]),
				color,
				position: 'relative',
			}}
		>
			{active ? (
				<span
					style={{
						position: 'absolute',
						inset: '-0.02em -0.14em -0.06em',
						background: emph ? 'rgba(10,26,58,0.92)' : brand.colors.red,
						borderRadius: 12,
						zIndex: -1,
						boxShadow: emph ? `0 0 0 4px ${baseColor}` : '0 6px 20px rgba(232,17,45,0.45)',
					}}
				/>
			) : null}
			{trUpper(w.text)}
		</span>
	);
};

export const Captions: React.FC<{pages: CaptionPage[]}> = ({pages}) => {
	const frame = useCurrentFrame();
	const brand = useBrand();
	const page = pages.find((p) => frame >= p.from && frame < p.to);
	if (!page) return null;
	const cfg = brand.captions;
	const outP = interpolate(frame, [page.to - 4, page.to], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<div
			data-safe="caption"
			style={{
				position: 'absolute',
				left: '50%',
				top: cfg.centerY,
				width: cfg.maxWidth,
				transform: 'translate(-50%, -50%)',
				textAlign: 'center',
				fontFamily: FONTS.sans,
				fontWeight: 900,
				fontSize: cfg.fontSize,
				lineHeight: 1.18,
				letterSpacing: -0.5,
				opacity: outP,
				WebkitTextStroke: '3px rgba(0,0,0,0.9)',
				paintOrder: 'stroke fill',
				textShadow: '0 5px 0 rgba(0,0,0,0.55), 0 10px 30px rgba(0,0,0,0.75)',
				isolation: 'isolate',
			}}
		>
			<div style={{position: 'absolute', inset: '-46px -70px', background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.46) 0%, rgba(0,0,0,0.22) 45%, rgba(0,0,0,0) 72%)', zIndex: -2, filter: 'blur(6px)'}} />
			{page.words.map((w, i) => (
				<Word key={i} w={w} pageFrom={page.from} />
			))}
		</div>
	);
};
