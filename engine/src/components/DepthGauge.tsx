// Derinlik göstergesi (sol kenar): dikey cetvel + hareketli işaretçi + büyük sayı. Güvenli alan: sol 80 px, alt 520 px (altyazı üstünde).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {num, NumKey} from '../three/core/math';
import {prog, ease} from '../lib/anim';
import {FONTS, useBrand} from '../lib/theme';

export type DepthGaugeSpec = {
	/** metre cinsinden anahtar kareli derinlik */
	depth: number | NumKey[];
	max?: number;
	/** gösterge görünür kareler */
	from?: number;
	to?: number;
	/** son değerde altın vurgu + alt yazı (ör. "kuyular dahil") */
	note?: string;
	/** cetvel üst/alt piksel konumu */
	top?: number;
	bottom?: number;
	at?: number;
};

export const DepthGauge: React.FC<{spec: DepthGaugeSpec}> = ({spec}) => {
	const frame = useCurrentFrame();
	const brand = useBrand();
	const max = spec.max ?? 85;
	const top = spec.top ?? 330;
	const bottom = spec.bottom ?? 1060;
	const from = spec.from ?? 0;
	const to = spec.to ?? 1e9;
	if (frame < from || frame > to) return null;
	const d = Math.max(0, Math.min(max, num(frame, spec.depth, 0)));
	const k = d / max;
	const a = prog(frame, from, 10, ease.out) * (1 - prog(frame, to - 8, 8, ease.in));
	const y = top + (bottom - top) * k;
	const final = d >= max - 0.5;
	const noteP = prog(frame, spec.at ?? to - 30, 10, ease.out);
	const ticks = [];
	for (let m = 0; m <= 80; m += 10) ticks.push(m);
	const gold = brand.colors.gold;
	return (
		<div data-safe="hud" style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, opacity: a, pointerEvents: 'none'}}>
			<div style={{position: 'absolute', left: 96, top, width: 6, height: bottom - top, borderRadius: 3, background: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.12))'}} />
			<div style={{position: 'absolute', left: 96, top, width: 6, height: Math.max(0, y - top), borderRadius: 3, background: final ? gold : '#ffffff', boxShadow: `0 0 18px ${final ? gold : '#ffffff'}`}} />
			{ticks.map((m) => {
				const ty = top + ((bottom - top) * m) / max;
				return (
					<React.Fragment key={m}>
						<div style={{position: 'absolute', left: 84, top: ty - 1, width: 30, height: 2, background: 'rgba(255,255,255,0.7)'}} />
						<div style={{position: 'absolute', left: 126, top: ty - 15, fontFamily: FONTS.ui, fontWeight: 700, fontSize: 26, color: 'rgba(255,255,255,0.82)', textShadow: '0 2px 8px rgba(0,0,0,0.9)'}}>{m}</div>
					</React.Fragment>
				);
			})}
			<div style={{position: 'absolute', left: 84, top: bottom - 1, width: 30, height: 2, background: gold}} />
			<div style={{position: 'absolute', left: 126, top: bottom - 17, fontFamily: FONTS.ui, fontWeight: 900, fontSize: 28, color: gold, textShadow: '0 2px 8px rgba(0,0,0,0.9)'}}>85</div>
			<div style={{position: 'absolute', left: 78, top: y - 14, width: 0, height: 0, borderTop: '14px solid transparent', borderBottom: '14px solid transparent', borderLeft: `22px solid ${final ? gold : '#fff'}`, filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.8))'}} />
			<div style={{position: 'absolute', left: 200, top: Math.max(top - 20, Math.min(bottom - 120, y - 62)), fontFamily: FONTS.display, fontSize: 132, lineHeight: 1, color: final ? gold : '#fff', textShadow: '0 6px 24px rgba(0,0,0,0.85)'}}>
				{Math.round(d)}
				<span style={{fontFamily: FONTS.ui, fontWeight: 900, fontSize: 52, marginLeft: 10}}>m</span>
			</div>
			{spec.note ? (
				<div style={{position: 'absolute', left: 204, top: Math.max(top + 90, Math.min(bottom - 30, y + 60)), opacity: noteP, transform: `translateY(${(1 - noteP) * 14}px)`, fontFamily: FONTS.ui, fontWeight: 800, fontSize: 36, letterSpacing: 1, color: '#fff', background: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: '6px 16px', border: `1.5px solid ${gold}`}}>
					{spec.note}
				</div>
			) : null}
		</div>
	);
};
