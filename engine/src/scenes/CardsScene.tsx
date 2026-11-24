import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {ease, hash, prog} from '../lib/anim';
import {FONTS, useBrand} from '../lib/theme';
import {trUpper} from '../lib/tr';

type Card = {title: string; year?: string; place?: string; env: 'sky' | 'cliff' | 'air' | 'desert' | 'snow'; at: number};

// Özgün vektör siluetler (temsili)
const Silhouette: React.FC<{env: Card['env']; f: number}> = ({env, f}) => {
	const fill = '#06080d';
	if (env === 'sky') {
		// el yapımı uçan makine: kanat + gövde, hafif süzülme
		const y = 980 + Math.sin(f * 0.12) * 14 + f * 1.2;
		return (
			<g transform={`translate(${380 + f * 6}, ${y}) rotate(${6 + Math.sin(f * 0.1) * 3})`}>
				<path d="M-260,0 Q0,-70 260,0 L250,18 Q0,-40 -250,18 Z" fill={fill} />
				<rect x={-18} y={10} width={36} height={120} rx={14} fill={fill} />
				<circle cx={0} cy={0} r={22} fill={fill} />
				<path d="M-60,130 L60,130 L0,190 Z" fill={fill} />
			</g>
		);
	}
	if (env === 'cliff') {
		const dy = f * 9;
		return (
			<g>
				<path d="M0,760 L330,760 L360,820 L300,1920 L0,1920 Z" fill={fill} />
				<g transform={`translate(${470 + f * 2.2}, ${820 + dy}) rotate(${160 + f * 1.5})`}>
					<ellipse cx={0} cy={-62} rx={20} ry={22} fill={fill} />
					<rect x={-17} y={-40} width={34} height={110} rx={15} fill={fill} />
					<rect x={-28} y={-120} width={14} height={90} rx={7} fill={fill} transform="rotate(-8)" />
					<rect x={14} y={-120} width={14} height={90} rx={7} fill={fill} transform="rotate(8)" />
					<rect x={-16} y={66} width={14} height={110} rx={7} fill={fill} />
					<rect x={2} y={66} width={14} height={110} rx={7} fill={fill} />
				</g>
			</g>
		);
	}
	if (env === 'air') {
		const x = -200 + f * 34;
		const y = 1040 - f * 6;
		return (
			<g>
				{[300, 760].map((px, i) => (
					<g key={i}>
						<path d={`M${px - 26},1500 Q${px - 40},1080 ${px - 18},700 L${px + 18},700 Q${px + 40},1080 ${px + 26},1500 Z`} fill={i ? '#e8112d' : '#f2f2f2'} opacity={0.92} />
					</g>
				))}
				<path d={`M${x - 900},${y + 40} Q${x - 450},${y + 90} ${x - 40},${y + 8}`} stroke="rgba(255,255,255,0.75)" strokeWidth={26} fill="none" strokeLinecap="round" />
				<g transform={`translate(${x}, ${y}) rotate(-6)`}>
					<path d="M-120,0 L110,-6 Q150,0 110,8 L-120,12 Z" fill={fill} />
					<path d="M-10,-6 L40,-120 L70,-120 L40,0 Z" fill={fill} />
					<path d="M-10,8 L40,120 L70,120 L40,8 Z" fill={fill} />
					<path d="M-120,0 L-150,-50 L-128,-50 L-100,0 Z" fill={fill} />
				</g>
			</g>
		);
	}
	if (env === 'desert') {
		const jx = 220 + f * 16;
		const jy = 1180 - Math.sin(Math.min(1, f / 26) * Math.PI) * 360;
		return (
			<g>
				<path d="M0,1250 L180,1120 L330,1200 L520,1010 L700,1160 L860,1060 L1080,1180 L1080,1920 L0,1920 Z" fill="#2a0f08" />
				<path d="M0,1420 L260,1300 L480,1380 L760,1260 L1080,1360 L1080,1920 L0,1920 Z" fill={fill} />
				<g transform={`translate(${jx}, ${jy}) rotate(${-18 + f * 0.8})`}>
					<circle cx={-70} cy={40} r={44} fill="none" stroke={fill} strokeWidth={14} />
					<circle cx={70} cy={40} r={44} fill="none" stroke={fill} strokeWidth={14} />
					<path d="M-70,40 L-10,-10 L70,40 M-10,-10 L40,-30" stroke={fill} strokeWidth={12} fill="none" />
					<circle cx={-6} cy={-92} r={20} fill={fill} />
					<path d="M-10,-72 L-20,-20 L20,-30 Z" fill={fill} />
				</g>
			</g>
		);
	}
	return null;
};

const ENV_BG: Record<Card['env'], string> = {
	sky: 'linear-gradient(180deg, #1d6fd1 0%, #69b4f5 60%, #0b3d7a 61%, #052448 100%)',
	cliff: 'linear-gradient(180deg, #ff7a2f 0%, #ffb25c 38%, #6e2a52 70%, #1c1030 100%)',
	air: 'linear-gradient(180deg, #0f4fa8 0%, #4aa3f0 70%, #bfe2ff 100%)',
	desert: 'linear-gradient(180deg, #ff9a4a 0%, #e0582c 45%, #7a2412 75%, #2a0f08 100%)',
	snow: 'linear-gradient(180deg, #8fc6ff 0%, #e9f4ff 70%, #ffffff 100%)',
};

export const CardsScene: React.FC<{cards: Card[]; label?: string}> = ({cards, label}) => {
	const frame = useCurrentFrame();
	const b = useBrand();
	let idx = 0;
	for (let i = 0; i < cards.length; i++) if (frame >= cards[i].at) idx = i;
	const c = cards[idx];
	const f = frame - c.at;
	const next = cards[idx + 1];
	const inP = prog(f, 0, 6, ease.out);
	const slide = interpolate(inP, [0, 1], [idx % 2 ? -1080 : 1080, 0]);
	const blur = (1 - inP) * 30;
	const zoom = 1.06 + f * 0.004;
	const shake = noise2D('cs', frame * 0.6, idx) * 6;
	const endIn = next ? next.at - c.at : 999;
	return (
		<AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
			<AbsoluteFill style={{transform: `translateX(${slide}px) scale(${zoom}) translate(${shake}px, ${-shake}px)`, filter: `blur(${blur}px)`}}>
				<AbsoluteFill style={{background: ENV_BG[c.env]}} />
				{c.env === 'sky' ? <AbsoluteFill style={{background: 'radial-gradient(ellipse 50% 20% at 70% 20%, rgba(255,255,255,0.7), transparent)'}} /> : null}
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					<Silhouette env={c.env} f={f} />
					{Array.from({length: 26}).map((_, i) => (
						<circle key={i} cx={(hash(i + idx * 50) * 1080 + f * (3 + hash(i) * 8)) % 1080} cy={hash(i * 2.3 + idx) * 1920} r={1 + hash(i * 5) * 3} fill="#fff" opacity={0.25} />
					))}
				</svg>
				<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.7) 100%)'}} />
			</AbsoluteFill>
			<div
				data-safe="title"
				style={{
					position: 'absolute',
					left: 90,
					right: 150,
					top: 330,
					transform: `translateY(${(1 - inP) * 40}px)`,
					opacity: inP * (next ? interpolate(frame, [next.at - 3, next.at], [1, 0.0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1),
				}}
			>
				<div style={{display: 'flex', gap: 14, alignItems: 'center'}}>
					<div style={{background: b.colors.red, color: '#fff', fontFamily: FONTS.ui, fontWeight: 700, fontSize: 30, letterSpacing: 4, padding: '6px 14px', borderRadius: 6}}>
						{trUpper(label ?? 'Red Bull etkinliği')}
					</div>
					{c.year ? <div style={{fontFamily: FONTS.mono, fontWeight: 700, fontSize: 36, color: b.colors.gold}}>{c.year}</div> : null}
				</div>
				<div style={{fontFamily: FONTS.display, fontSize: 132, lineHeight: 1, color: '#fff', marginTop: 16, textShadow: '0 8px 30px rgba(0,0,0,0.6)'}}>
					{trUpper(c.title)}
				</div>
				{c.place ? <div style={{fontFamily: FONTS.sans, fontWeight: 800, fontSize: 38, color: 'rgba(255,255,255,0.9)', marginTop: 8}}>{trUpper(c.place)}</div> : null}
			</div>
			{/* kart ilerleme çubukları */}
			<div style={{position: 'absolute', left: 90, right: 150, top: 290, display: 'flex', gap: 10}}>
				{cards.map((_, i) => (
					<div key={i} style={{flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.3)', overflow: 'hidden'}}>
						<div style={{width: `${i < idx ? 100 : i === idx ? Math.min(100, (f / Math.max(1, endIn)) * 100) : 0}%`, height: '100%', background: '#fff'}} />
					</div>
				))}
			</div>
		</AbsoluteFill>
	);
};
