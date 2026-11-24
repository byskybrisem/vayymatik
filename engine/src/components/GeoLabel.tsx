import React from 'react';
import {FONTS, useBrand} from '../lib/theme';
import {trUpper} from '../lib/tr';

export const GeoLabel: React.FC<{x: number; y: number; text: string; sub?: string; color?: string; appear: number; frame: number}> = ({
	x,
	y,
	text,
	sub,
	color,
	appear,
	frame,
}) => {
	const brand = useBrand();
	const c = color ?? brand.colors.red;
	const ring = (frame % 36) / 36;
	const lx = Math.min(Math.max(x, 260), 820);
	const ly = y - 170;
	return (
		<div style={{position: 'absolute', inset: 0, opacity: appear}}>
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				<circle cx={x} cy={y} r={10 + ring * 46} fill="none" stroke={c} strokeWidth={4} opacity={1 - ring} />
				<circle cx={x} cy={y} r={11} fill="#fff" stroke={c} strokeWidth={5} />
				<line x1={x} y1={y - 12} x2={lx} y2={ly + 52} stroke="#fff" strokeWidth={3} opacity={0.85} />
			</svg>
			<div
				style={{
					position: 'absolute',
					left: lx,
					top: ly,
					transform: `translate(-50%, -100%) translateY(${(1 - appear) * 20}px)`,
					background: 'rgba(5,10,24,0.78)',
					border: `3px solid ${c}`,
					borderRadius: 14,
					padding: '12px 26px 14px',
					textAlign: 'center',
					boxShadow: `0 0 34px ${c}88`,
					whiteSpace: 'nowrap',
				}}
			>
				<div style={{fontFamily: FONTS.display, fontSize: 64, color: '#fff', letterSpacing: 2, lineHeight: 1}}>{trUpper(text)}</div>
				{sub ? <div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 30, color: brand.colors.gold, marginTop: 6, letterSpacing: 3}}>{trUpper(sub)}</div> : null}
			</div>
		</div>
	);
};
