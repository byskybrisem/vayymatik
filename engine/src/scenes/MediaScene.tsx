import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {ease, hash, prog} from '../lib/anim';
import {FONTS, useBrand} from '../lib/theme';
import {trUpper} from '../lib/tr';
import {Titles, TitleSpec} from '../components/Titles';

const TILE_BG = [
	'linear-gradient(135deg,#0b2a5b,#e8112d)',
	'linear-gradient(160deg,#1a1a1a,#ffc83d)',
	'linear-gradient(135deg,#043a2a,#18c08a)',
	'linear-gradient(135deg,#2b0b3d,#ff4fa3)',
	'linear-gradient(135deg,#0a0f1e,#3a7bff)',
	'linear-gradient(135deg,#3a1004,#ff8a3d)',
];

const Tile: React.FC<{i: number; label: string; f: number}> = ({i, label, f}) => {
	const b = useBrand();
	const live = i % 4 === 1;
	const bars = Array.from({length: 7}).map((_, k) => 20 + 60 * Math.abs(Math.sin(f * 0.12 + k * 0.9 + i)));
	return (
		<div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 18, overflow: 'hidden', background: TILE_BG[i % TILE_BG.length], boxShadow: '0 0 0 3px rgba(255,255,255,0.08), 0 20px 40px rgba(0,0,0,0.6)'}}>
			<div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at ${30 + 40 * hash(i)}% ${30 + 30 * hash(i * 2)}%, rgba(255,255,255,0.35), transparent 55%)`, transform: `translateX(${Math.sin(f * 0.05 + i) * 20}px)`}} />
			<div style={{position: 'absolute', left: 16, right: 16, bottom: 16, display: 'flex', alignItems: 'flex-end', gap: 5, height: 70, opacity: 0.55}}>
				{bars.map((h, k) => (
					<div key={k} style={{flex: 1, height: `${h}%`, background: 'rgba(255,255,255,0.8)', borderRadius: 3}} />
				))}
			</div>
			<div style={{position: 'absolute', left: 18, top: 16, fontFamily: FONTS.ui, fontWeight: 700, fontSize: 24, letterSpacing: 2, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.6)'}}>{trUpper(label)}</div>
			{live ? <div style={{position: 'absolute', right: 14, top: 14, background: b.colors.red, color: '#fff', fontFamily: FONTS.ui, fontWeight: 700, fontSize: 20, padding: '3px 10px', borderRadius: 6}}>CANLI</div> : null}
			<div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 5px)'}} />
		</div>
	);
};

export const MediaScene: React.FC<{labels: string[]; titles?: TitleSpec[]; pullback?: {from: number; dur: number}}> = ({labels, titles, pullback}) => {
	const frame = useCurrentFrame();
	const p = pullback ? prog(frame, pullback.from, pullback.dur, ease.cine) : 1;
	const scale = interpolate(p, [0, 1], [3.1, 1]);
	const rotY = interpolate(p, [0, 1], [0, -14]);
	const cols = 3;
	const rows = 5;
	return (
		<AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 60% at 50% 45%, #0d1b38, #02040a 80%)', overflow: 'hidden'}}>
			<AbsoluteFill style={{perspective: 1600}}>
				<div
					style={{
						position: 'absolute',
						left: 40,
						top: 260,
						width: 1000,
						height: 1400,
						display: 'grid',
						gridTemplateColumns: `repeat(${cols}, 1fr)`,
						gridTemplateRows: `repeat(${rows}, 1fr)`,
						gap: 22,
						transform: `rotateY(${rotY}deg) rotateX(6deg) scale(${scale})`,
						transformOrigin: '50% 30%',
					}}
				>
					{Array.from({length: cols * rows}).map((_, i) => {
						const on = interpolate(frame, [i * 1.2, i * 1.2 + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
						return (
							<div key={i} style={{opacity: 0.25 + 0.75 * on}}>
								<Tile i={i} label={labels[i % labels.length]} f={frame} />
							</div>
						);
					})}
				</div>
			</AbsoluteFill>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(2,4,10,0.85) 0%, rgba(2,4,10,0.2) 25%, rgba(2,4,10,0.25) 60%, rgba(2,4,10,0.9) 100%)'}} />
			{titles ? <Titles titles={titles} /> : null}
		</AbsoluteFill>
	);
};
