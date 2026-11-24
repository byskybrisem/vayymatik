import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {ease, prog} from '../lib/anim';
import {FONTS, useBrand} from '../lib/theme';
import {trNumber, trUpper} from '../lib/tr';

type Kpi = {
	label: string;
	value: number;
	decimals: number;
	unit: string;
	at: number;
	dur?: number;
	note?: string;
	bars?: {label: string; value: number; display: string}[];
	delta?: string;
};

const KpiBlock: React.FC<{k: Kpi; y: number}> = ({k, y}) => {
	const frame = useCurrentFrame();
	const b = useBrand();
	const f = frame - k.at;
	if (f < -2) return null;
	const inP = prog(f, 0, 10, ease.out);
	const cnt = prog(f, 2, k.dur ?? 30, ease.cine);
	const v = k.value * cnt;
	const max = Math.max(...(k.bars ?? [{value: 1}]).map((x) => x.value));
	return (
		<div data-safe="kpi" style={{position: 'absolute', left: 90, right: 150, top: y, opacity: inP, transform: `translateY(${(1 - inP) * 40}px)`}}>
			<div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 30, letterSpacing: 5, color: b.colors.silver}}>{trUpper(k.label)}</div>
			<div style={{display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 6}}>
				<div style={{fontFamily: FONTS.display, fontSize: 150, lineHeight: 1, color: b.colors.gold, fontVariantNumeric: 'tabular-nums', textShadow: '0 0 40px rgba(255,200,61,0.35)'}}>
					{trNumber(v, k.decimals)}
				</div>
				<div style={{fontFamily: FONTS.display, fontSize: 64, color: '#fff'}}>{trUpper(k.unit)}</div>
			</div>
			{k.delta ? (
				<div style={{display: 'inline-block', marginTop: 8, background: 'rgba(24,192,138,0.18)', border: '2px solid #18c08a', color: '#5ff0b8', fontFamily: FONTS.ui, fontWeight: 700, fontSize: 30, padding: '4px 14px', borderRadius: 8, opacity: prog(f, 18, 8)}}>
					▲ {k.delta}
				</div>
			) : null}
			{k.bars ? (
				<div style={{marginTop: 18}}>
					{k.bars.map((bar, i) => {
						const w = prog(f, 8 + i * 8, 18, ease.out) * (bar.value / max) * 100;
						const last = i === k.bars!.length - 1;
						return (
							<div key={i} style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10}}>
								<div style={{width: 92, fontFamily: FONTS.mono, fontWeight: 700, fontSize: 28, color: b.colors.silver}}>{bar.label}</div>
								<div style={{flex: 1, height: 38, background: 'rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden'}}>
									<div style={{width: `${w}%`, height: '100%', borderRadius: 8, background: last ? `linear-gradient(90deg, ${b.colors.redDeep}, ${b.colors.red})` : 'linear-gradient(90deg, #3a4a66, #7d8b9c)'}} />
								</div>
								<div style={{width: 150, textAlign: 'right', fontFamily: FONTS.mono, fontWeight: 700, fontSize: 28, color: '#fff', opacity: prog(f, 16 + i * 8, 6)}}>{bar.display}</div>
							</div>
						);
					})}
				</div>
			) : null}
			{k.note ? <div style={{marginTop: 6, fontFamily: FONTS.ui, fontWeight: 500, fontSize: 24, color: 'rgba(255,255,255,0.7)'}}>{k.note}</div> : null}
		</div>
	);
};

export const KpiScene: React.FC<{kpis: Kpi[]; header?: string; footer?: {text: string; at: number}}> = ({kpis, header, footer}) => {
	const frame = useCurrentFrame();
	const b = useBrand();
	return (
		<AbsoluteFill>
			<Backdrop hue="navy" grid particles={20} beams={false} />
			{header ? (
				<div style={{position: 'absolute', left: 90, top: 270, fontFamily: FONTS.display, fontSize: 52, color: '#fff', letterSpacing: 3, opacity: prog(frame, 0, 8)}}>
					<span style={{color: b.colors.red}}>■ </span>
					{trUpper(header)}
				</div>
			) : null}
			{(() => {
				// blok yükseklikleri içeriğe göre: çubuk grafik ve not satırı yer kaplar
				let y = 360;
				return kpis.map((k, i) => {
					const el = <KpiBlock key={i} k={k} y={y} />;
					y += 250 + (k.bars ? 125 : 0) + (k.note ? 36 : 0) + 34;
					return el;
				});
			})()}
			{footer && frame >= footer.at ? (
				<div style={{position: 'absolute', left: 90, right: 150, top: 1085, fontFamily: FONTS.ui, fontWeight: 700, fontSize: 30, color: b.colors.silver, opacity: interpolate(frame - footer.at, [0, 8], [0, 1], {extrapolateRight: 'clamp'})}}>
					{footer.text}
				</div>
			) : null}
		</AbsoluteFill>
	);
};
