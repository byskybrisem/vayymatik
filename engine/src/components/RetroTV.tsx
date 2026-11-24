import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {hash} from '../lib/anim';
import {FONTS} from '../lib/theme';
import {trUpper} from '../lib/tr';

// Klasik reklam metaforu: eski tüplü TV; breakAt anında ekran kırılır, parçalar dağılır.
export const RetroTV: React.FC<{from: number; breakAt: number; text: string; sub?: string}> = ({from, breakAt, text, sub}) => {
	const frame = useCurrentFrame();
	const f = frame - from;
	if (f < 0) return null;
	const appear = interpolate(f, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
	const br = frame - breakAt;
	const broken = br >= 0;
	const roll = (frame * 7) % 1920;
	const jitter = noise2D('tv', frame * 0.8, 0) * 4;
	const screen = (
		<div style={{position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 40, background: '#0d1a2b'}}>
			<div style={{position: 'absolute', inset: 0, display: 'flex', height: '100%'}}>
				{['#d9d9d9', '#d6d23a', '#3ad6d0', '#3ad648', '#d63ac9', '#d63a3a', '#3a46d6'].map((c, i) => (
					<div key={i} style={{flex: 1, background: c, opacity: 0.35}} />
				))}
			</div>
			<div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `translateX(${jitter}px)`}}>
				<div style={{fontFamily: FONTS.display, fontSize: 150, color: '#fff', letterSpacing: 6, textShadow: '4px 0 #f00, -4px 0 #0ff'}}>{trUpper(text)}</div>
				{sub ? <div style={{fontFamily: FONTS.sans, fontWeight: 800, fontSize: 40, color: '#fff', opacity: 0.9}}>{trUpper(sub)}</div> : null}
			</div>
			<div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0 3px, transparent 3px 6px)'}} />
			<div style={{position: 'absolute', left: 0, right: 0, top: roll % 700 - 100, height: 80, background: 'linear-gradient(transparent, rgba(255,255,255,0.12), transparent)'}} />
			<div style={{position: 'absolute', inset: 0, boxShadow: 'inset 0 0 120px 40px rgba(0,0,0,0.85)'}} />
		</div>
	);
	// kırılma: 9 parça dışa savrulur
	const shards = [];
	if (broken) {
		for (let i = 0; i < 9; i++) {
			const gx = i % 3;
			const gy = Math.floor(i / 3);
			const ang = (hash(i * 3.7) - 0.5) * 90;
			const dx = (gx - 1) * br * (14 + hash(i) * 10);
			const dy = (gy - 1) * br * (12 + hash(i * 2) * 10) + br * br * 0.6;
			shards.push(
				<div
					key={i}
					style={{
						position: 'absolute',
						left: `${gx * 33.33}%`,
						top: `${gy * 33.33}%`,
						width: '33.4%',
						height: '33.4%',
						overflow: 'hidden',
						transform: `translate(${dx}px, ${dy}px) rotate(${(ang * br) / 20}deg)`,
						opacity: interpolate(br, [0, 18], [1, 0], {extrapolateRight: 'clamp'}),
					}}
				>
					<div style={{position: 'absolute', width: '300%', height: '300%', left: `${-gx * 100}%`, top: `${-gy * 100}%`}}>{screen}</div>
				</div>,
			);
		}
	}
	const flash = broken ? interpolate(br, [0, 3, 12], [0, 1, 0], {extrapolateRight: 'clamp'}) : 0;
	return (
		<AbsoluteFill style={{opacity: appear}}>
			<div style={{position: 'absolute', left: 110, top: 430, width: 860, height: 700}}>
				<div style={{position: 'absolute', inset: -40, borderRadius: 70, background: 'linear-gradient(160deg, #3a3f47, #15181d)', boxShadow: '0 40px 90px rgba(0,0,0,0.8)', opacity: broken ? interpolate(br, [0, 14], [1, 0], {extrapolateRight: 'clamp'}) : 1}} />
				<div style={{position: 'absolute', inset: 0}}>{broken ? shards : screen}</div>
			</div>
			<AbsoluteFill style={{background: '#fff', opacity: flash * 0.85, mixBlendMode: 'screen'}} />
		</AbsoluteFill>
	);
};
