// ROV kamera arayüzü (telemetri): derinlik, basınç (≈1 atm / 10 m, NOAA), sıcaklık, yön, kayıt; parazit ve sinyal kaybı.
import React from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {num, NumKey} from '../three/core/math';
import {FONTS} from '../lib/theme';
import {hash} from '../lib/anim';

type N = number | NumKey[];
export type HudSpec = {
	label?: string;
	depth?: N;
	temp?: N;
	heading?: N;
	alt?: N;
	rec?: boolean;
	glitch?: N;
	lost?: N;
	note?: string;
	clock?: number; // saat ofseti (sn): kayıt zaman kodu
	minimal?: boolean;
};

const fmt = (n: number, d = 0) => n.toLocaleString('tr-TR', {minimumFractionDigits: d, maximumFractionDigits: d});

export const Hud: React.FC<{spec: HudSpec}> = ({spec}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const portrait = height > width;
	const S = portrait ? 1.25 : 1;
	const depth = num(frame, spec.depth, 0);
	const atm = 1 + depth / 10.06;
	const temp = num(frame, spec.temp, depth > 1000 ? 2.1 : 24 - depth * 0.02);
	const hdg = ((num(frame, spec.heading, 214) % 360) + 360) % 360;
	const glitch = num(frame, spec.glitch, 0);
	const lost = num(frame, spec.lost, 0);
	const t = (spec.clock ?? 11532) + frame / fps;
	const tc = `${String(Math.floor(t / 3600) % 24).padStart(2, '0')}:${String(Math.floor(t / 60) % 60).padStart(2, '0')}:${String(Math.floor(t) % 60).padStart(2, '0')}:${String(frame % fps).padStart(2, '0')}`;
	const flick = glitch > 0 && hash(frame * 3.1) < glitch * 0.35 ? 0.25 : 1;
	const pad = portrait ? {x: 70, top: 300, bottom: 560} : {x: 64, top: 46, bottom: 150};
	const txt: React.CSSProperties = {fontFamily: FONTS.mono, fontSize: 21 * S, letterSpacing: 1.5, color: 'rgba(225,245,255,0.92)', textShadow: '0 0 6px rgba(80,220,255,0.35), 0 1px 2px rgba(0,0,0,0.9)', whiteSpace: 'nowrap'};
	const corner = (pos: React.CSSProperties, rot: number) => (
		<div style={{position: 'absolute', width: 46 * S, height: 46 * S, borderTop: '2px solid rgba(200,240,255,0.55)', borderLeft: '2px solid rgba(200,240,255,0.55)', transform: `rotate(${rot}deg)`, ...pos}} />
	);
	const bars =
		glitch > 0
			? Array.from({length: 7}, (_, i) => {
					const on = hash(frame * 0.37 + i * 7.1) < glitch * 0.8;
					if (!on) return null;
					const top = hash(frame * 1.3 + i) * 100;
					const h = 0.6 + hash(frame + i * 3.3) * 6 * glitch;
					return (
						<div
							key={i}
							style={{
								position: 'absolute',
								left: 0,
								right: 0,
								top: `${top}%`,
								height: `${h}%`,
								backgroundImage: `url(${staticFile('shared/grain.png')})`,
								backgroundSize: '128px 128px',
								backgroundPosition: `${Math.floor(hash(frame + i) * 256)}px 0`,
								opacity: 0.55,
								mixBlendMode: 'screen',
								transform: `translateX(${(hash(frame * 2 + i) - 0.5) * 120 * glitch}px)`,
							}}
						/>
					);
				})
			: null;
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{bars}
			{glitch > 0.05 ? (
				<AbsoluteFill style={{backgroundImage: `url(${staticFile('shared/grain.png')})`, backgroundSize: '256px 256px', backgroundPosition: `${Math.floor(hash(frame) * 256)}px ${Math.floor(hash(frame + 5) * 256)}px`, opacity: glitch * 0.35, mixBlendMode: 'overlay'}} />
			) : null}
			<AbsoluteFill style={{opacity: flick * (1 - lost)}}>
				{corner({left: pad.x - 20, top: pad.top - 16}, 0)}
				{corner({right: pad.x - 20, top: pad.top - 16}, 90)}
				{corner({right: pad.x - 20, bottom: pad.bottom - 30}, 180)}
				{corner({left: pad.x - 20, bottom: pad.bottom - 30}, 270)}
				<div style={{...txt, position: 'absolute', left: pad.x + 18, top: pad.top + 4}}>
					{spec.rec !== false ? <span style={{display: 'inline-block', width: 13 * S, height: 13 * S, borderRadius: 99, background: frame % 30 < 18 ? '#ff3b3b' : 'transparent', marginRight: 10, boxShadow: '0 0 8px #ff3b3b'}} /> : null}
					{spec.label ?? 'YANKI · KAMERA 1'}
					<div style={{opacity: 0.75, marginTop: 6}}>{tc}</div>
				</div>
				{!spec.minimal ? (
					<div style={{...txt, position: 'absolute', right: pad.x + 18, top: pad.top + 4, textAlign: 'right', lineHeight: 1.45}}>
						<div>
							DERİNLİK <b style={{fontSize: 30 * S, color: '#fff'}}>{fmt(depth)}</b> m
						</div>
						<div>BASINÇ ≈ {fmt(atm)} atm</div>
						<div>SICAKLIK {fmt(temp, 1)} °C</div>
					</div>
				) : null}
				{!spec.minimal ? (
					<div style={{...txt, position: 'absolute', left: pad.x + 18, bottom: pad.bottom - 14, opacity: 0.85}}>
						YÖN {String(Math.round(hdg)).padStart(3, '0')}°{spec.alt !== undefined ? `   ·   ZEMİNE ${fmt(num(frame, spec.alt, 0), 1)} m` : ''}
						{spec.note ? <div style={{marginTop: 6, color: glitch > 0.2 ? '#ffb347' : 'rgba(225,245,255,0.8)'}}>{spec.note}</div> : null}
					</div>
				) : null}
				<div style={{position: 'absolute', left: '50%', top: '50%', width: 34, height: 34, transform: 'translate(-50%,-50%)', opacity: 0.4}}>
					<div style={{position: 'absolute', left: 16, top: 0, width: 2, height: 10, background: '#dff'}} />
					<div style={{position: 'absolute', left: 16, bottom: 0, width: 2, height: 10, background: '#dff'}} />
					<div style={{position: 'absolute', top: 16, left: 0, height: 2, width: 10, background: '#dff'}} />
					<div style={{position: 'absolute', top: 16, right: 0, height: 2, width: 10, background: '#dff'}} />
				</div>
			</AbsoluteFill>
			{lost > 0 ? (
				<AbsoluteFill style={{opacity: lost, background: '#010203', alignItems: 'center', justifyContent: 'center'}}>
					<AbsoluteFill style={{backgroundImage: `url(${staticFile('shared/grain.png')})`, backgroundSize: '200px 200px', backgroundPosition: `${Math.floor(hash(frame) * 200)}px ${Math.floor(hash(frame + 1) * 200)}px`, opacity: 0.2}} />
					<div style={{...txt, fontSize: 44 * S, letterSpacing: 8, color: '#ff7a68', textShadow: '0 0 22px rgba(255,90,70,0.8)', opacity: frame % 24 < 16 ? 1 : 0.35}}>SİNYAL KAYBI</div>
					<div style={{...txt, marginTop: 18, opacity: 0.7}}>YANKI · BAĞLANTI YOK · YENİDEN DENENİYOR</div>
				</AbsoluteFill>
			) : null}
		</AbsoluteFill>
	);
};
