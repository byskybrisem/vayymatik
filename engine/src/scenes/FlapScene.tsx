import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {hash} from '../lib/anim';
import {FONTS, useBrand} from '../lib/theme';
import {trUpper} from '../lib/tr';

const CHARSET = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789';

const FlapChar: React.FC<{ch: string; settle: number; seed: number}> = ({ch, settle, seed}) => {
	const frame = useCurrentFrame();
	const done = frame >= settle;
	const show = done ? ch : CHARSET[Math.floor(hash(seed + frame * 0.37) * CHARSET.length)];
	const flip = done ? interpolate(frame - settle, [0, 3], [1, 0], {extrapolateRight: 'clamp'}) : 0.5;
	return (
		<div
			style={{
				width: 58,
				height: 84,
				margin: '0 3px',
				background: 'linear-gradient(180deg, #1c2230 0%, #121722 49%, #05070b 50%, #141a26 100%)',
				borderRadius: 8,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontFamily: FONTS.mono,
				fontWeight: 700,
				fontSize: 56,
				color: ch === ' ' ? 'transparent' : '#f4f6fa',
				boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
				transform: `scaleY(${1 - flip * 0.25})`,
				position: 'relative',
			}}
		>
			{ch === ' ' ? '' : show}
			<div style={{position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: 'rgba(0,0,0,0.7)'}} />
		</div>
	);
};

export const FlapScene: React.FC<{title: string; rows: {left: string; right: string; at: number; accent?: boolean}[]}> = ({title, rows}) => {
	const frame = useCurrentFrame();
	const b = useBrand();
	const camY = noise2D('fy', frame * 0.02, 0) * 10;
	return (
		<AbsoluteFill style={{background: '#02040a', overflow: 'hidden'}}>
			{/* stadyum: projektör bokeh + saha şeritleri */}
			<AbsoluteFill style={{background: 'linear-gradient(180deg, #050914 0%, #0a1530 45%, #0d3a1c 46%, #08240f 100%)'}} />
			<AbsoluteFill
				style={{
					top: '46%',
					backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 120px, rgba(0,0,0,0.06) 120px 240px)',
					transform: 'perspective(600px) rotateX(58deg)',
					transformOrigin: '50% 0%',
				}}
			/>
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				{Array.from({length: 18}).map((_, i) => {
					const x = 40 + i * 60 + (i % 2) * 20;
					const y = 760 + (i % 3) * 22;
					const fl = 0.8 + 0.2 * Math.sin(frame * 0.3 + i);
					return <circle key={i} cx={x} cy={y} r={26} fill="#fff7e6" opacity={0.35 * fl} filter="blur(8px)" />;
				})}
				<ellipse cx={540} cy={880} rx={700} ry={110} fill="rgba(255,240,210,0.12)" filter="blur(30px)" />
			</svg>
			<div style={{position: 'absolute', left: 60, right: 60, top: 300 + camY, padding: '34px 26px 40px', background: 'rgba(5,8,16,0.86)', borderRadius: 28, border: '2px solid rgba(255,255,255,0.12)', boxShadow: '0 40px 90px rgba(0,0,0,0.75)'}}>
				<div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24}}>
					<div style={{width: 14, height: 46, background: b.colors.red, borderRadius: 4}} />
					<div style={{fontFamily: FONTS.display, fontSize: 60, color: '#fff', letterSpacing: 3}}>{trUpper(title)}</div>
				</div>
				{rows.map((r, i) => {
					const vis = interpolate(frame, [r.at - 2, r.at + 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
					const left = trUpper(r.left).padEnd(10, ' ').slice(0, 10);
					return (
						<div key={i} style={{display: 'flex', alignItems: 'center', marginBottom: 18, opacity: vis}}>
							<div style={{display: 'flex'}}>
								{left.split('').map((ch, j) => (
									<FlapChar key={j} ch={ch} settle={r.at + 4 + j * 2} seed={i * 40 + j} />
								))}
							</div>
							<div style={{marginLeft: 'auto', display: 'flex'}}>
								{r.right.split('').map((ch, j) => (
									<div key={j} style={{color: r.accent ? b.colors.gold : b.colors.gold}}>
										<FlapChar ch={ch} settle={r.at + 10 + j * 2} seed={i * 70 + j + 500} />
									</div>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
