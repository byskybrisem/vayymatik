import React from 'react';
import {interpolate} from 'remotion';
import {FONTS, useBrand} from '../lib/theme';
import {trUpper} from '../lib/tr';

export const LiveBadge: React.FC<{f: number; text?: string}> = ({f, text}) => {
	const b = useBrand();
	const a = interpolate(f, [0, 6], [0, 1], {extrapolateRight: 'clamp'});
	const blink = Math.floor(f / 12) % 2 === 0 ? 1 : 0.35;
	return (
		<div style={{position: 'absolute', left: '50%', top: 292, transform: `translateX(-50%) scale(${0.8 + 0.2 * a})`, opacity: a, display: 'flex', alignItems: 'center', gap: 14, whiteSpace: 'nowrap', background: 'rgba(5,8,16,0.75)', border: `3px solid ${b.colors.red}`, borderRadius: 12, padding: '10px 22px'}}>
			<div style={{width: 22, height: 22, borderRadius: 11, background: b.colors.red, opacity: blink, boxShadow: `0 0 18px ${b.colors.red}`}} />
			<div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 34, letterSpacing: 5, color: '#fff'}}>{trUpper(text ?? 'Canlı yayın')}</div>
		</div>
	);
};
