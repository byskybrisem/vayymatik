// Okyanus belgeseli arayüz kiti: bilimsel konsol estetiği (koyu lacivert, ince çizgiler, mono etiketler).
// Tüm hareket kareye bağlıdır; zamanlar (at/from/dur) pipeline tarafından kareye çevrilir.
import React from 'react';
import {AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {FONTS} from '../lib/theme';
import {ease, hash} from '../lib/anim';

export const C = {
	bg0: '#02060c',
	bg1: '#061422',
	line: 'rgba(140,215,255,0.22)',
	lineHi: 'rgba(160,235,255,0.55)',
	cyan: '#62F0E4',
	blue: '#4DA8FF',
	amber: '#FFB347',
	red: '#FF5A4A',
	green: '#5BE38A',
	white: '#EAF6FF',
	dim: 'rgba(200,225,240,0.55)',
	gold: '#FFC83D',
};

export const appear = (frame: number, at = 0, dur = 12, e = ease.out) =>
	interpolate(frame, [at, at + Math.max(1, dur)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e});

export const fmtTR = (n: number, d = 0) => n.toLocaleString('tr-TR', {minimumFractionDigits: d, maximumFractionDigits: d});

/** Yavaş kamera kayması + itme: UI sahnelerini statik slayttan ayıran sürekli hareket */
export const Drift: React.FC<{children: React.ReactNode; push?: number; amp?: number; seed?: string}> = ({children, push = 0.05, amp = 10, seed = 'd'}) => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	const p = frame / Math.max(1, durationInFrames);
	const x = noise2D(seed + 'x', frame * 0.006, 0) * amp;
	const y = noise2D(seed + 'y', frame * 0.006, 4) * amp * 0.6;
	const r = noise2D(seed + 'r', frame * 0.004, 9) * 0.25;
	return <AbsoluteFill style={{transform: `translate(${x}px, ${y}px) scale(${1.02 + push * p}) rotate(${r}deg)`}}>{children}</AbsoluteFill>;
};

export const Backdrop: React.FC<{tint?: string; grid?: boolean}> = ({tint = C.bg1, grid = true}) => {
	const frame = useCurrentFrame();
	return (
		<AbsoluteFill style={{background: `radial-gradient(ellipse 90% 80% at 50% 45%, ${tint} 0%, ${C.bg0} 70%)`}}>
			{grid ? (
				<AbsoluteFill
					style={{
						backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
						backgroundSize: '64px 64px',
						backgroundPosition: `${(frame * 0.15) % 64}px ${(frame * 0.08) % 64}px`,
						opacity: 0.18,
						maskImage: 'radial-gradient(ellipse 75% 70% at 50% 50%, #000 30%, transparent 85%)',
						WebkitMaskImage: 'radial-gradient(ellipse 75% 70% at 50% 50%, #000 30%, transparent 85%)',
					}}
				/>
			) : null}
		</AbsoluteFill>
	);
};

/** Monitör yüzeyi: tarama çizgileri, hafif titreme, cam parlaması */
export const Screen: React.FC<{children?: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => {
	const frame = useCurrentFrame();
	const flick = 0.97 + 0.03 * Math.sin(frame * 1.7) * Math.sin(frame * 0.37);
	return (
		<div style={{position: 'absolute', overflow: 'hidden', borderRadius: 14, background: 'rgba(3,12,22,0.92)', border: `1px solid ${C.line}`, boxShadow: '0 0 60px rgba(40,170,220,0.10), inset 0 0 80px rgba(0,0,0,0.6)', ...style}}>
			<div style={{position: 'absolute', inset: 0, opacity: flick}}>{children}</div>
			<div style={{position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 3px)', pointerEvents: 'none'}} />
			<div style={{position: 'absolute', inset: 0, background: 'linear-gradient(125deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 35%)', pointerEvents: 'none'}} />
		</div>
	);
};

export const Label: React.FC<{children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties}> = ({children, color = C.dim, size = 18, style}) => (
	<div style={{fontFamily: FONTS.mono, fontSize: size, letterSpacing: 2, color, textTransform: 'uppercase', whiteSpace: 'nowrap', ...style}}>{children}</div>
);

export const Title: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties}> = ({children, size = 64, color = C.white, style}) => (
	<div style={{fontFamily: FONTS.sans, fontWeight: 800, fontSize: size, lineHeight: 1.08, color, letterSpacing: -0.5, textShadow: '0 4px 30px rgba(0,0,0,0.6)', ...style}}>{children}</div>
);

/** Köşe çentikli çerçeve */
export const Frame: React.FC<{style?: React.CSSProperties; color?: string}> = ({style, color = C.lineHi}) => {
	const s = 22;
	const b = `2px solid ${color}`;
	return (
		<div style={{position: 'absolute', pointerEvents: 'none', ...style}}>
			<div style={{position: 'absolute', left: 0, top: 0, width: s, height: s, borderLeft: b, borderTop: b}} />
			<div style={{position: 'absolute', right: 0, top: 0, width: s, height: s, borderRight: b, borderTop: b}} />
			<div style={{position: 'absolute', left: 0, bottom: 0, width: s, height: s, borderLeft: b, borderBottom: b}} />
			<div style={{position: 'absolute', right: 0, bottom: 0, width: s, height: s, borderRight: b, borderBottom: b}} />
		</div>
	);
};

/** Kurgu/şeffaflık etiketi (KURGUSAL CANLANDIRMA, VARSAYIMSAL vb.) */
export const Tag: React.FC<{text: string; color?: string; style?: React.CSSProperties}> = ({text, color = C.amber, style}) => (
	<div style={{position: 'absolute', fontFamily: FONTS.mono, fontSize: 18, letterSpacing: 3, color, border: `1.5px solid ${color}`, borderRadius: 6, padding: '5px 12px', background: 'rgba(0,0,0,0.45)', ...style}}>{text}</div>
);

/** Deterministik gürültü dokusu katmanı */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.06}) => {
	const frame = useCurrentFrame();
	return (
		<AbsoluteFill
			style={{
				backgroundImage: `url(${staticFile('shared/grain.png')})`,
				backgroundSize: '256px 256px',
				backgroundPosition: `${Math.floor(hash(frame) * 256)}px ${Math.floor(hash(frame + 7) * 256)}px`,
				mixBlendMode: 'overlay',
				opacity,
				pointerEvents: 'none',
			}}
		/>
	);
};

/** Görüntü karesi (önceden render edilmiş sahne) + zaman kodu + tarama */
export const Feed: React.FC<{src: string; label?: string; style?: React.CSSProperties; zoom?: number}> = ({src, label, style, zoom = 0.08}) => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	const z = 1 + zoom * (frame / Math.max(1, durationInFrames));
	return (
		<Screen style={style}>
			<img src={staticFile(src)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`}} />
			{label ? (
				<div style={{position: 'absolute', left: 16, top: 12, fontFamily: FONTS.mono, fontSize: 16, color: C.white, letterSpacing: 2, textShadow: '0 1px 4px #000'}}>
					<span style={{color: frame % 30 < 18 ? C.red : 'transparent'}}>● </span>
					{label}
				</div>
			) : null}
		</Screen>
	);
};

export const seeded = (i: number, k = 0) => hash(i * 13.37 + k * 7.31);
