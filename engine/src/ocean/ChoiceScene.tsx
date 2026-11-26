// "choice" sahne türü: insanlığın üç yolu (iletişim / koruma / araştırma), riskler ve "Sen olsaydın?" sorusu.
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONTS} from '../lib/theme';
import {appear, Backdrop, C, Drift, Grain, Label, Title} from './ui';

export type ChoiceProps = {
	title?: string;
	focus?: {at: number; i: number}[];
	risks?: {at: number; i: number; text: string}[];
	prompt?: {at: number; text: string};
	src?: string;
};

const OPTS = [
	{t: 'İletişim kur', s: 'Matematikle başlayan diyaloğu sürdürmek', c: C.cyan},
	{t: 'Koru ve bekle', s: 'Bölgeyi kapatmak, teması sınırlamak', c: C.green},
	{t: 'Araştır', s: 'Şehri ve teknolojisini incelemek', c: C.amber},
];

const Icon: React.FC<{i: number; c: string; f: number}> = ({i, c, f}) => (
	<svg width={120} height={120} viewBox="0 0 120 120">
		{i === 0 ? (
			<>
				{[0, 1, 2].map((k) => (
					<path key={k} d={`M${30 + k * 14},${40 - k * 10} Q${70 + k * 14},60 ${30 + k * 14},${80 + k * 10}`} stroke={c} strokeWidth={5} fill="none" opacity={0.4 + 0.6 * ((Math.sin(f * 0.15 - k) + 1) / 2)} transform="translate(10,0)" />
				))}
				<circle cx={28} cy={60} r={9} fill={c} />
			</>
		) : i === 1 ? (
			<path d="M60,14 L100,30 L96,66 Q90,96 60,108 Q30,96 24,66 L20,30 Z" stroke={c} strokeWidth={5} fill={`${c}22`} />
		) : (
			<>
				<circle cx={52} cy={52} r={28} stroke={c} strokeWidth={6} fill="none" />
				<line x1={72} y1={72} x2={102} y2={102} stroke={c} strokeWidth={8} strokeLinecap="round" />
			</>
		)}
	</svg>
);

export const ChoiceScene: React.FC<ChoiceProps> = (p) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const land = W > H;
	let cur = -1;
	for (const f of p.focus ?? []) if (frame >= f.at) cur = f.i;
	const cw = land ? (W - 360) / 3 : W - 160;
	const chh = land ? H * 0.5 : H * 0.17;
	const promptA = p.prompt ? appear(frame, p.prompt.at, 14) : 0;
	return (
		<AbsoluteFill style={{background: C.bg0}}>
			<Drift push={0.03} amp={5} seed="choice">
				<Backdrop tint="#081a28" />
				{OPTS.map((o, i) => {
					const a = appear(frame, 6 + i * 8, 14);
					const on = cur === i || cur === 3;
					const dim = cur >= 0 && !on ? 0.4 : 1;
					const x = land ? 120 + i * (cw + 60) : 80;
					const y = land ? H * 0.24 : 330 + i * (chh + 40);
					const risk = (p.risks ?? []).filter((r) => r.i === i && frame >= r.at).pop();
					return (
						<div key={i} style={{position: 'absolute', left: x, top: y, width: cw, height: chh, opacity: a * dim * (1 - promptA * 0.6), transform: `translateY(${(1 - a) * 30}px) scale(${on ? 1.03 : 1})`, borderRadius: 18, background: on ? `linear-gradient(180deg, ${o.c}1f, rgba(3,12,22,0.92))` : 'rgba(3,12,22,0.85)', border: `2px solid ${on ? o.c : C.line}`, boxShadow: on ? `0 0 50px ${o.c}33` : 'none', padding: land ? 36 : 26, display: 'flex', flexDirection: land ? 'column' : 'row', gap: 24, alignItems: land ? 'flex-start' : 'center'}}>
							<Icon i={i} c={o.c} f={frame} />
							<div>
								<Label size={18} color={o.c}>{['1. yol', '2. yol', '3. yol'][i]}</Label>
								<div style={{fontFamily: FONTS.sans, fontWeight: 900, fontSize: land ? 48 : 46, color: C.white, marginTop: 6}}>{o.t}</div>
								<div style={{fontFamily: FONTS.ui, fontSize: land ? 26 : 26, color: C.dim, marginTop: 10, lineHeight: 1.35}}>{o.s}</div>
								{risk ? (
									<div style={{marginTop: 22, fontFamily: FONTS.ui, fontSize: land ? 25 : 24, color: C.red, lineHeight: 1.35, opacity: appear(frame, risk.at, 10)}}>
										⚠ {risk.text}
									</div>
								) : null}
							</div>
						</div>
					);
				})}
				{p.title ? (
					<div style={{position: 'absolute', left: land ? 120 : 80, top: land ? 70 : 200, opacity: appear(frame, 0, 12)}}>
						<Title size={land ? 50 : 56}>{p.title}</Title>
					</div>
				) : null}
				{p.prompt ? (
					<div style={{position: 'absolute', left: 0, right: 0, top: land ? H * 0.4 : H * 0.42, textAlign: 'center', opacity: promptA, transform: `scale(${0.9 + 0.1 * promptA})`}}>
						<div style={{fontFamily: FONTS.display, fontSize: land ? 120 : 110, color: C.white, letterSpacing: 3, textShadow: '0 0 50px rgba(98,240,228,0.35)'}}>{p.prompt.text}</div>
					</div>
				) : null}
			</Drift>
			<Grain opacity={0.07} />
		</AbsoluteFill>
	);
};
