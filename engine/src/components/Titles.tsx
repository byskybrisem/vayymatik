import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {fitText} from '@remotion/layout-utils';
import {ease, prog} from '../lib/anim';
import {colorOf, FONTS, useBrand} from '../lib/theme';
import {trNumber, trUpper} from '../lib/tr';

export type TitleSpec = {
	text: string;
	sub?: string;
	kicker?: string;
	from: number;
	dur: number;
	kind?: 'slam' | 'rise' | 'type' | 'stamp' | 'count' | 'words';
	words?: {text: string; at: number; style?: string}[]; // 'words': kelime kelime (seslendirmeye senkron)
	y?: number;
	size?: number;
	color?: string;
	subColor?: string;
	font?: 'display' | 'sans';
	metallic?: boolean;
	count?: {v0: number; v1: number; decimals?: number; prefix?: string; suffix?: string; dur?: number; accel?: boolean};
	maxWidth?: number;
	upper?: boolean;
	plate?: boolean; // parlak zeminde okunurluk için koyu yarı saydam panel
};

const SAFE_W = 820;

const Title: React.FC<{t: TitleSpec}> = ({t}) => {
	const frame = useCurrentFrame();
	const brand = useBrand();
	const f = frame - t.from;
	if (f < 0 || f > t.dur) return null;
	const kind = t.kind ?? 'rise';
	const inP = prog(f, 0, kind === 'slam' || kind === 'stamp' ? 7 : 12, kind === 'slam' ? ease.out : ease.out);
	const outP = prog(f, t.dur - 7, 7, ease.in);
	const upper = t.upper !== false;
	let text = upper ? trUpper(t.text) : t.text;
	if (t.count) {
		const cp = prog(f, 0, t.count.dur ?? Math.min(t.dur - 6, 40), t.count.accel ? ease.in : ease.cine);
		const v = t.count.v0 + (t.count.v1 - t.count.v0) * cp;
		text = `${t.count.prefix ?? ''}${trNumber(v, t.count.decimals ?? 0)}${t.count.suffix ?? ''}`;
	}
	const fontFamily = t.font === 'sans' ? FONTS.sans : FONTS.display;
	const fontWeight = t.font === 'sans' ? 900 : 400;
	const maxW = t.maxWidth ?? SAFE_W;
	const lines = text.split('\n');
	const longest = lines.reduce((a, b) => (b.length > a.length ? b : a), '');
	let size = t.size ?? 150;
	try {
		const fit = fitText({text: longest, withinWidth: maxW, fontFamily, fontWeight: String(fontWeight)}).fontSize;
		size = Math.min(size, fit * 0.95); // harf aralığı ve gölge payı
	} catch {
		size = Math.min(size, maxW / Math.max(4, longest.length * 0.52));
	}
	let scale = 1;
	let blur = 0;
	let ty = 0;
	let rot = 0;
	let shakeX = 0;
	if (kind === 'slam' || kind === 'stamp') {
		scale = interpolate(inP, [0, 1], [1.5, 1]);
		blur = interpolate(inP, [0, 1], [14, 0]);
		const imp = Math.max(0, 1 - f / 10);
		shakeX = noise2D('s', f * 0.9, 1) * 10 * imp;
		rot = kind === 'stamp' ? -3 : 0;
	} else {
		ty = interpolate(inP, [0, 1], [46, 0]);
		blur = interpolate(inP, [0, 1], [10, 0]);
	}
	const opacity = Math.min(inP * 1.3, 1) * (1 - outP);
	blur += outP * 10;
	const col = colorOf(brand, t.color ?? 'white');
	if (kind === 'words' && t.words) {
		const wsize = t.size ?? 110;
		return (
			<div data-safe="title" style={{position: 'absolute', left: '50%', top: t.y ?? 620, width: maxW, transform: 'translate(-50%, -50%)', textAlign: 'center', opacity: 1 - outP, filter: `blur(${outP * 10}px)`}}>
				<div style={{fontFamily, fontWeight, fontSize: wsize, lineHeight: 1.06, letterSpacing: 1, whiteSpace: 'normal', filter: 'drop-shadow(0 6px 22px rgba(0,0,0,0.85)) drop-shadow(0 0 40px rgba(0,0,0,0.6))'}}>
					{t.words.map((w, i) => {
						const wf = f - (w.at - t.from);
						const a = interpolate(wf, [0, 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
						const c = colorOf(brand, w.style === 'accent' ? 'red' : w.style === 'gold' ? 'gold' : 'white');
						return (
							<span key={i} style={{display: 'inline-block', margin: '0 0.14em', opacity: a, color: c, transform: `translateY(${(1 - a) * 30}px) scale(${0.9 + 0.1 * a})`, filter: `blur(${(1 - a) * 8}px)`}}>
								{upper ? trUpper(w.text) : w.text}
							</span>
						);
					})}
				</div>
			</div>
		);
	}
	const visibleText = kind === 'type' ? text.slice(0, Math.round(text.length * prog(f, 0, Math.max(8, text.length * 1.2), (x) => x))) : text;
	const fillStyle: React.CSSProperties = t.metallic
		? {
				backgroundImage: `linear-gradient(180deg, #ffffff 0%, ${brand.colors.silver} 45%, ${brand.colors.steel} 55%, #f4f7fb 100%)`,
				WebkitBackgroundClip: 'text',
				backgroundClip: 'text',
				color: 'transparent',
				WebkitTextStroke: '0px',
			}
		: {color: col};
	return (
		<div
			data-safe="title"
			style={{
				position: 'absolute',
				left: '50%',
				top: t.y ?? 620,
				width: maxW,
				transform: `translate(-50%, -50%) translate(${shakeX}px, ${ty}px) scale(${scale}) rotate(${rot}deg)`,
				textAlign: 'center',
				opacity,
				filter: `blur(${blur}px)`,
				...(t.plate ? {background: 'rgba(4,8,18,0.62)', borderRadius: 26, padding: '22px 18px 26px', boxShadow: '0 20px 60px rgba(0,0,0,0.45)', border: '1.5px solid rgba(255,255,255,0.12)'} : {}),
			}}
		>
			{t.kicker ? (
				<div
					style={{
						fontFamily: FONTS.ui,
						fontWeight: 700,
						fontSize: 34,
						letterSpacing: 6,
						color: brand.colors.gold,
						marginBottom: 14,
						textShadow: '0 2px 12px rgba(0,0,0,0.8)',
					}}
				>
					{trUpper(t.kicker)}
				</div>
			) : null}
			<div
				style={{
					fontFamily,
					fontWeight,
					fontSize: size,
					lineHeight: 1.02,
					letterSpacing: t.font === 'sans' ? -1 : 1,
					whiteSpace: 'pre',
					filter: 'drop-shadow(0 6px 22px rgba(0,0,0,0.7)) drop-shadow(0 0 36px rgba(0,0,0,0.55))',
					...(kind === 'stamp'
						? {background: brand.colors.red, padding: '6px 26px 10px', display: 'inline-block', color: '#fff'}
						: fillStyle),
				}}
			>
				{visibleText}
			</div>
			{t.sub ? (
				<div
					style={{
						fontFamily: FONTS.sans,
						fontWeight: 800,
						fontSize: Math.max(34, Math.min(52, size * 0.32)),
						color: colorOf(brand, t.subColor ?? 'silver'),
						marginTop: 16,
						letterSpacing: 1,
						textShadow: '0 3px 14px rgba(0,0,0,0.85)',
					}}
				>
					{upper ? trUpper(t.sub) : t.sub}
				</div>
			) : null}
		</div>
	);
};

export const Titles: React.FC<{titles: TitleSpec[]}> = ({titles}) => (
	<>
		{titles.map((t, i) => (
			<Title key={i} t={t} />
		))}
	</>
);
