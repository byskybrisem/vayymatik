import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {useBrand} from '../lib/theme';

// Özgün, logosuz metalik içecek kutusu (temsili): silindirik ışık, dönen elmas desen,
// kenar ışığı, zemin yansıması ve arka hale.
export const MetalCan: React.FC<{from: number; y: number; scale: number}> = ({from, y, scale}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const b = useBrand();
	const f = frame - from;
	if (f < 0) return null;
	const s = spring({frame: f, fps, config: {damping: 18, stiffness: 110}});
	const W = 320 * scale;
	const H = 600 * scale;
	const shift = (f * 3.2) % 120;
	const rise = interpolate(s, [0, 1], [220, 0]);
	const tilt = interpolate(s, [0, 1], [-8, 0]) + Math.sin(f * 0.05) * 1.2;
	const can = (id: string) => (
		<svg width={W} height={H} viewBox="0 0 320 600" style={{display: 'block'}}>
			<defs>
				<linearGradient id={`${id}cyl`} x1="0" x2="1">
					<stop offset="0" stopColor="#000" stopOpacity="0.85" />
					<stop offset="0.12" stopColor="#000" stopOpacity="0.35" />
					<stop offset="0.27" stopColor="#fff" stopOpacity="0.7" />
					<stop offset="0.33" stopColor="#fff" stopOpacity="0.12" />
					<stop offset="0.62" stopColor="#000" stopOpacity="0.1" />
					<stop offset="0.86" stopColor="#000" stopOpacity="0.55" />
					<stop offset="0.95" stopColor="#fff" stopOpacity="0.35" />
					<stop offset="1" stopColor="#000" stopOpacity="0.9" />
				</linearGradient>
				<pattern id={`${id}dia`} width="120" height="120" patternUnits="userSpaceOnUse" x={-shift}>
					<rect width="120" height="120" fill="#cfd6df" />
					<path d="M0,0 L60,0 L0,60 Z M60,0 L120,0 L120,60 L60,120 L0,120 L0,60 Z" fill={b.colors.navy} />
				</pattern>
				<linearGradient id={`${id}top`} x1="0" x2="0" y1="0" y2="1">
					<stop offset="0" stopColor="#f4f7fb" />
					<stop offset="1" stopColor="#7f8a99" />
				</linearGradient>
				<clipPath id={`${id}body`}>
					<path d="M18,62 Q18,36 44,30 L276,30 Q302,36 302,62 L302,548 Q302,572 276,578 L44,578 Q18,572 18,548 Z" />
				</clipPath>
			</defs>
			<g clipPath={`url(#${id}body)`}>
				<rect x="0" y="30" width="320" height="560" fill={`url(#${id}dia)`} />
				<rect x="0" y="320" width="320" height="258" fill="#c9d1db" />
				<rect x="0" y="300" width="320" height="34" fill={b.colors.red} />
				<rect x="0" y="334" width="320" height="6" fill="#ffffff" opacity="0.7" />
				<rect x="0" y="30" width="320" height="560" fill={`url(#${id}cyl)`} />
			</g>
			<ellipse cx="160" cy="34" rx="142" ry="20" fill={`url(#${id}top)`} />
			<ellipse cx="160" cy="34" rx="118" ry="13" fill="#9aa5b4" />
			<ellipse cx="190" cy="32" rx="30" ry="6" fill="#5d6876" />
			<path d="M20,556 Q160,600 300,556 L300,566 Q160,612 20,566 Z" fill="#4c5563" />
		</svg>
	);
	return (
		<div style={{position: 'absolute', left: 540 - W / 2, top: y - H / 2 + rise, width: W, height: H * 1.6, opacity: s}}>
			<div style={{position: 'absolute', left: -W * 0.6, top: -H * 0.2, width: W * 2.2, height: H * 1.3, background: `radial-gradient(ellipse at center, ${b.colors.red}55 0%, transparent 62%)`, filter: 'blur(20px)'}} />
			<div style={{transform: `rotate(${tilt}deg)`, transformOrigin: '50% 90%', filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.75))'}}>{can('c')}</div>
			<div style={{transform: `scaleY(-1) rotate(${-tilt}deg)`, transformOrigin: '50% 0%', opacity: 0.22, marginTop: 4, maskImage: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent 45%)', WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent 45%)', filter: 'blur(2px)'}}>
				{can('r')}
			</div>
		</div>
	);
};
