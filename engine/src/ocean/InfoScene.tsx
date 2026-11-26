// "info" sahne türü: bilimsel infografikler (gerçek bilgiler; kaynaklar topic.json → sources).
// spectrum: ışığın renk renk sönmesi · zones: okyanus bölgeleri (NOAA) · tether: kablo ve radyo dalgası
// pressure: 800 atm · sphere: küre ve basınç · sofar: ses kanalı · law: BM Deniz Hukuku (Madde 136)
// facts: GERÇEK / KURGU ayrımı · gap: teknolojik uçurum zaman çizgisi
import React from 'react';
import {AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONTS} from '../lib/theme';
import {ease, hash} from '../lib/anim';
import {appear, Backdrop, C, Drift, fmtTR, Grain, Label, Tag, Title} from './ui';

export type InfoProps = {
	mode: 'spectrum' | 'zones' | 'tether' | 'pressure' | 'sphere' | 'sofar' | 'law' | 'facts' | 'gap';
	title?: string;
	sub?: string;
	source?: string;
	depth?: number;
	at?: number;
	rows?: {real: string; fic: string; at: number}[];
	noise?: number;
	tag?: string;
};

const Spectrum: React.FC = () => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const top = H * 0.24;
	const bot = H * 0.86;
	const maxD = 200;
	const d = interpolate(frame, [20, 200], [0, maxD], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});
	const bands = [
		{n: 'Kırmızı', c: '#ff3b30', z: 10},
		{n: 'Turuncu', c: '#ff9500', z: 30},
		{n: 'Sarı', c: '#ffd60a', z: 50},
		{n: 'Yeşil', c: '#34c759', z: 100},
		{n: 'Mavi', c: '#2f8cff', z: 200},
	];
	const y = (z: number) => top + (z / maxD) * (bot - top);
	const x0 = W * 0.3;
	const bw = (W * 0.5) / bands.length;
	return (
		<svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
			{[0, 50, 100, 150, 200].map((z) => (
				<g key={z}>
					<line x1={x0 - 30} x2={x0 + W * 0.52} y1={y(z)} y2={y(z)} stroke={C.line} />
					<text x={x0 - 44} y={y(z) + 8} fill={C.dim} fontFamily={FONTS.mono} fontSize={22} textAnchor="end">
						{z} m
					</text>
				</g>
			))}
			{bands.map((b, i) => {
				const vis = Math.min(d, b.z);
				const on = d < b.z ? 1 : Math.max(0.25, 1 - (d - b.z) / 30);
				return (
					<g key={i}>
						<rect x={x0 + i * bw + 10} y={top} width={bw - 20} height={Math.max(2, y(vis) - top)} fill={b.c} opacity={0.85 * on} rx={6} style={{filter: `drop-shadow(0 0 10px ${b.c})`}} />
						<text x={x0 + i * bw + bw / 2} y={top - 18} fill={b.c} fontFamily={FONTS.sans} fontWeight={800} fontSize={26} textAnchor="middle" opacity={on}>
							{b.n}
						</text>
					</g>
				);
			})}
			<line x1={x0 - 30} x2={x0 + W * 0.52} y1={y(d)} y2={y(d)} stroke={C.white} strokeWidth={3} />
			<text x={x0 + W * 0.53} y={y(d) + 8} fill={C.white} fontFamily={FONTS.mono} fontSize={26}>
				{Math.round(d)} m
			</text>
		</svg>
	);
};

const ZONES = [
	{n: 'Güneşli bölge', a: 0, b: 200, c: '#2f9bff'},
	{n: 'Alacakaranlık bölgesi', a: 200, b: 1000, c: '#1d5fb0'},
	{n: 'Gece yarısı bölgesi', a: 1000, b: 4000, c: '#123a73'},
	{n: 'Abisal bölge', a: 4000, b: 6000, c: '#0b2148'},
	{n: 'Hadal bölge', a: 6000, b: 11000, c: '#06112a'},
];
const Zones: React.FC<{depth: number}> = ({depth}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const land = W > H;
	const top = land ? H * 0.12 : H * 0.18;
	const bot = land ? H * 0.9 : H * 0.72;
	const x0 = land ? W * 0.42 : W * 0.3;
	const cw = land ? W * 0.16 : W * 0.24;
	// doğrusal olmayan ölçek (sığ bölgeler okunur kalsın)
	const f = (z: number) => Math.pow(z / 11000, 0.5);
	const y = (z: number) => top + f(z) * (bot - top);
	const cur = interpolate(frame, [0, 40], [Math.max(0, depth * 0.6), depth], {extrapolateRight: 'clamp', easing: ease.out});
	return (
		<svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
			{ZONES.map((z, i) => {
				const active = cur >= z.a && cur < z.b + 1;
				return (
					<g key={i} opacity={appear(frame, i * 5, 10)}>
						<rect x={x0} y={y(z.a)} width={cw} height={y(z.b) - y(z.a)} fill={z.c} stroke={active ? C.cyan : 'rgba(255,255,255,0.08)'} strokeWidth={active ? 3 : 1} />
						<text x={x0 + cw + 30} y={(y(z.a) + y(z.b)) / 2 + 10} fill={active ? C.white : C.dim} fontFamily={FONTS.sans} fontWeight={active ? 800 : 600} fontSize={active ? 34 : 26}>
							{z.n}
						</text>
						<text x={x0 - 20} y={y(z.a) + 8} fill={C.dim} fontFamily={FONTS.mono} fontSize={20} textAnchor="end">
							{fmtTR(z.a)} m
						</text>
					</g>
				);
			})}
			<text x={x0 - 20} y={y(11000) + 8} fill={C.dim} fontFamily={FONTS.mono} fontSize={20} textAnchor="end">
				11.000 m
			</text>
			<g transform={`translate(${x0 + cw / 2}, ${y(cur)})`}>
				<circle r={12} fill={C.amber} style={{filter: `drop-shadow(0 0 12px ${C.amber})`}} />
				<line x1={-cw / 2 - 10} x2={cw / 2 + 10} y1={0} y2={0} stroke={C.amber} strokeWidth={2} />
				<text x={-cw / 2 - 30} y={-14} fill={C.amber} fontFamily={FONTS.mono} fontSize={26} textAnchor="end">
					YANKI · {fmtTR(Math.round(cur))} m
				</text>
			</g>
		</svg>
	);
};

const Tether: React.FC<{noise: number}> = ({noise}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const land = W > H;
	const sx = land ? W * 0.5 : W * 0.5;
	const sy = H * 0.2;
	const ry = H * 0.82;
	const wave: string[] = [];
	for (let i = 0; i <= 80; i++) wave.push(`${(i / 80) * W},${sy + Math.sin(i * 0.5 + frame * 0.1) * 6}`);
	return (
		<svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
			<rect x={0} y={sy} width={W} height={H - sy} fill="url(#wg)" />
			<defs>
				<linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#0b3a66" />
					<stop offset="100%" stopColor="#01060d" />
				</linearGradient>
			</defs>
			<polyline points={wave.join(' ')} fill="none" stroke="#7fd4ff" strokeWidth={3} />
			<path d={`M${sx - 120},${sy - 6} L${sx + 120},${sy - 6} L${sx + 95},${sy + 22} L${sx - 100},${sy + 22} Z`} fill="#dfe6ec" />
			<rect x={sx - 30} y={sy - 46} width={70} height={40} fill="#dfe6ec" />
			{[0, 1, 2].map((k) => {
				const r = ((frame + k * 20) % 60) * 2.2;
				return <circle key={k} cx={sx + 120} cy={sy - 60} r={r} fill="none" stroke={C.amber} strokeWidth={3} opacity={Math.max(0, 1 - r / 130)} />;
			})}
			<text x={sx + 160} y={sy - 90} fill={C.amber} fontFamily={FONTS.mono} fontSize={22}>
				radyo dalgaları suda hızla sönümlenir
			</text>
			<line x1={sx} y1={sy + 22} x2={sx} y2={ry - 30} stroke="#d9d1bd" strokeWidth={3} strokeDasharray="1 0" />
			{Array.from({length: 6}, (_, k) => {
				const yy = sy + 22 + (((frame * 6 + k * 90) % (ry - sy - 52)) as number);
				const jitter = noise > 0 ? (hash(k + Math.floor(frame / 2)) - 0.5) * 30 * noise : 0;
				return <circle key={k} cx={sx + jitter} cy={yy} r={7} fill={noise > 0.4 && hash(k * 3 + Math.floor(frame / 3)) < noise * 0.6 ? C.red : C.cyan} style={{filter: `drop-shadow(0 0 8px ${C.cyan})`}} />;
			})}
			<rect x={sx - 45} y={ry - 30} width={90} height={50} rx={6} fill="#d9a21b" />
			<text x={sx + 70} y={ry + 6} fill={C.white} fontFamily={FONTS.mono} fontSize={24}>
				YANKI · fiber optik kablo
			</text>
			{noise > 0 ? (
				<text x={sx + 70} y={(sy + ry) / 2} fill={C.red} fontFamily={FONTS.mono} fontSize={26} opacity={frame % 16 < 10 ? 1 : 0.4}>
					AÇIKLANAMAYAN GÜRÜLTÜ
				</text>
			) : null}
		</svg>
	);
};

const Pressure: React.FC = () => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const land = W > H;
	const v = Math.round(interpolate(frame, [0, 50], [1, 800], {extrapolateRight: 'clamp', easing: ease.out}));
	const k = appear(frame, 60, 16);
	return (
		<>
			<div style={{position: 'absolute', left: land ? 130 : 70, top: land ? H * 0.26 : H * 0.2}}>
				<div style={{fontFamily: FONTS.display, fontSize: land ? 220 : 200, color: C.white, lineHeight: 1}}>
					≈ {fmtTR(v)} <span style={{fontSize: 80, color: C.cyan}}>atm</span>
				</div>
				<Label size={24} style={{marginTop: 14, whiteSpace: 'normal', maxWidth: 760}}>Her 10 metrede yaklaşık 1 atmosfer artar (NOAA) · 8.000 m</Label>
			</div>
			<svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: k}}>
				<g transform={`translate(${land ? W * 0.62 : W * 0.18}, ${land ? H * 0.28 : H * 0.55})`}>
					<rect x={0} y={260} width={110} height={110} rx={10} fill="none" stroke={C.gold} strokeWidth={4} />
					<text x={55} y={330} fill={C.gold} fontFamily={FONTS.mono} fontSize={28} textAnchor="middle">
						1 cm²
					</text>
					{[0, 1, 2, 3, 4].map((i) => (
						<line key={i} x1={10 + i * 22} y1={150 + ((frame * 3 + i * 12) % 90)} x2={10 + i * 22} y2={200 + ((frame * 3 + i * 12) % 90)} stroke={C.cyan} strokeWidth={4} markerEnd="url(#ar)" opacity={0.8} />
					))}
					<defs>
						<marker id="ar" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
							<path d="M0,0 L10,5 L0,10 z" fill={C.cyan} />
						</marker>
					</defs>
					<g transform="translate(170, 70)">
						<path d="M10,120 L30,70 Q40,52 70,50 L190,50 Q225,52 245,80 L285,95 Q300,100 300,120 L300,150 L10,150 Z" fill="none" stroke={C.white} strokeWidth={4} />
						<circle cx={75} cy={155} r={24} fill={C.bg0} stroke={C.white} strokeWidth={4} />
						<circle cx={235} cy={155} r={24} fill={C.bg0} stroke={C.white} strokeWidth={4} />
						<text x={155} y={240} fill={C.white} fontFamily={FONTS.sans} fontWeight={800} fontSize={34} textAnchor="middle">
							≈ 800 kg
						</text>
					</g>
				</g>
			</svg>
		</>
	);
};

const Sphere: React.FC = () => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const land = W > H;
	const cx1 = land ? W * 0.3 : W * 0.5;
	const cy1 = land ? H * 0.55 : H * 0.36;
	const cx2 = land ? W * 0.68 : W * 0.5;
	const cy2 = land ? H * 0.55 : H * 0.64;
	const R = land ? 150 : 140;
	const arrows = (cx: number, cy: number, r: number) =>
		Array.from({length: 16}, (_, i) => {
			const a = (i / 16) * Math.PI * 2;
			const ph = ((frame * 2 + i * 9) % 40) / 40;
			const d0 = r + 90 - ph * 40;
			return <line key={i} x1={cx + Math.cos(a) * d0} y1={cy + Math.sin(a) * d0} x2={cx + Math.cos(a) * (d0 - 34)} y2={cy + Math.sin(a) * (d0 - 34)} stroke={C.cyan} strokeWidth={3} opacity={0.7} />;
		});
	return (
		<svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
			<defs>
				<radialGradient id="sph" cx="38%" cy="35%">
					<stop offset="0%" stopColor="#9fe9ff" />
					<stop offset="100%" stopColor="#123a52" />
				</radialGradient>
			</defs>
			{arrows(cx1, cy1, R)}
			<rect x={cx1 - R * 0.85} y={cy1 - R * 0.85} width={R * 1.7} height={R * 1.7} fill="#16364a" stroke={C.white} strokeWidth={2} />
			{[
				[-1, -1],
				[1, -1],
				[1, 1],
				[-1, 1],
			].map(([sx, sy], i) => (
				<circle key={i} cx={cx1 + sx * R * 0.85} cy={cy1 + sy * R * 0.85} r={18 + 6 * Math.sin(frame * 0.2)} fill={C.red} opacity={0.75} style={{filter: `drop-shadow(0 0 12px ${C.red})`}} />
			))}
			<text x={cx1} y={cy1 + R + 120} fill={C.red} fontFamily={FONTS.sans} fontWeight={800} fontSize={30} textAnchor="middle">
				Köşelerde gerilme birikir
			</text>
			{arrows(cx2, cy2, R)}
			<circle cx={cx2} cy={cy2} r={R} fill="url(#sph)" stroke={C.white} strokeWidth={2} />
			<circle cx={cx2} cy={cy2} r={R} fill="none" stroke={C.green} strokeWidth={6} opacity={0.6 + 0.3 * Math.sin(frame * 0.15)} />
			<text x={cx2} y={cy2 + R + 120} fill={C.green} fontFamily={FONTS.sans} fontWeight={800} fontSize={30} textAnchor="middle">
				Basınç her yöne eşit dağılır
			</text>
		</svg>
	);
};

const Sofar: React.FC = () => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const top = H * 0.2;
	const bot = H * 0.9;
	const axis = top + (bot - top) * 0.3;
	const prog = interpolate(frame, [10, 160], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const rays = [0.6, 1.0, 1.4].map((amp, k) => {
		const pts: string[] = [];
		const N = 200;
		for (let i = 0; i <= N * prog; i++) {
			const u = i / N;
			const x = W * 0.1 + u * W * 0.82;
			const y = axis + Math.sin(u * Math.PI * (7 + k * 2)) * (bot - top) * 0.12 * amp;
			pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
		}
		return pts.join(' ');
	});
	const prof: string[] = [];
	for (let i = 0; i <= 60; i++) {
		const u = i / 60;
		const z = top + u * (bot - top);
		const c = 1 - Math.exp(-Math.pow((u - 0.3) / 0.25, 2)) * 0.9;
		prof.push(`${(W * 0.04 + c * 60).toFixed(1)},${z.toFixed(1)}`);
	}
	return (
		<svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
			<rect x={0} y={top} width={W} height={bot - top} fill="#04162a" />
			<rect x={0} y={axis - 40} width={W} height={80} fill="rgba(98,240,228,0.08)" />
			<line x1={0} x2={W} y1={axis} y2={axis} stroke={C.cyan} strokeDasharray="10 8" opacity={0.6} />
			<polyline points={prof.join(' ')} fill="none" stroke={C.gold} strokeWidth={3} />
			<text x={W * 0.04} y={top - 14} fill={C.gold} fontFamily={FONTS.mono} fontSize={20}>
				ses hızı
			</text>
			{rays.map((r, i) => (
				<polyline key={i} points={r} fill="none" stroke={C.cyan} strokeWidth={2.5} opacity={0.85 - i * 0.2} style={{filter: `drop-shadow(0 0 6px ${C.cyan})`}} />
			))}
			<text x={W * 0.12} y={axis - 56} fill={C.white} fontFamily={FONTS.sans} fontWeight={800} fontSize={34}>
				SOFAR kanalı · ses binlerce kilometre taşınabilir
			</text>
			<text x={W * 0.12} y={axis + 80} fill={C.dim} fontFamily={FONTS.mono} fontSize={22}>
				ses hızının en düşük olduğu derinlik (çoğu bölgede ~1.000 m civarı)
			</text>
		</svg>
	);
};

const Law: React.FC = () => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const land = W > H;
	return (
		<>
			<div style={{position: 'absolute', left: land ? 120 : 60, top: land ? 160 : 300, width: land ? W * 0.5 : W - 120, height: land ? H * 0.62 : H * 0.3, borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.line}`}}>
				<img src={staticFile('shared/earth_bmng_5400.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.4) brightness(0.55) contrast(1.1)'}} />
				<div style={{position: 'absolute', inset: 0, background: 'rgba(10,60,110,0.25)', mixBlendMode: 'screen'}} />
				<div style={{position: 'absolute', left: '62%', top: '52%', width: 30, height: 30, marginLeft: -15, marginTop: -15, borderRadius: 99, background: C.cyan, boxShadow: `0 0 30px ${C.cyan}`, opacity: 0.6 + 0.4 * Math.sin(frame * 0.15)}} />
			</div>
			<div style={{position: 'absolute', left: land ? W * 0.58 : 60, top: land ? 190 : H * 0.6, width: land ? W * 0.36 : W - 120}}>
				<Label size={20} color={C.cyan}>BM Deniz Hukuku Sözleşmesi · Madde 136</Label>
				<Title size={land ? 50 : 54} style={{marginTop: 14}}>“Bölge ve kaynakları, insanlığın ortak mirasıdır.”</Title>
				<div style={{marginTop: 30, opacity: appear(frame, 30, 12), fontFamily: FONTS.ui, fontSize: 26, color: C.dim, lineHeight: 1.5}}>Bölge: ülkelerin yetki alanı dışında kalan deniz tabanı ve toprak altı.</div>
			</div>
		</>
	);
};

const Facts: React.FC<{rows: NonNullable<InfoProps['rows']>}> = ({rows}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const land = W > H;
	const colW = land ? W * 0.38 : W * 0.42;
	return (
		<>
			<div style={{position: 'absolute', left: land ? W * 0.1 : 50, top: land ? 160 : 330, width: colW}}>
				<div style={{fontFamily: FONTS.sans, fontWeight: 900, fontSize: 40, color: C.green, letterSpacing: 4}}>GERÇEK</div>
			</div>
			<div style={{position: 'absolute', left: land ? W * 0.53 : W * 0.52, top: land ? 160 : 330, width: colW}}>
				<div style={{fontFamily: FONTS.sans, fontWeight: 900, fontSize: 40, color: C.amber, letterSpacing: 4}}>KURGU</div>
			</div>
			{rows.map((r, i) => {
				const a = appear(frame, r.at, 12);
				const y = (land ? 250 : 420) + i * (land ? 150 : 210);
				return (
					<React.Fragment key={i}>
						<div style={{position: 'absolute', left: land ? W * 0.1 : 50, top: y, width: colW, opacity: a, transform: `translateX(${(1 - a) * -30}px)`, borderLeft: `4px solid ${C.green}`, paddingLeft: 20, fontFamily: FONTS.ui, fontSize: land ? 30 : 30, color: C.white, lineHeight: 1.35}}>
							{r.real}
						</div>
						<div style={{position: 'absolute', left: land ? W * 0.53 : W * 0.52, top: y, width: colW, opacity: appear(frame, r.at + 18, 12), transform: `translateX(${(1 - appear(frame, r.at + 18, 12)) * 30}px)`, borderLeft: `4px solid ${C.amber}`, paddingLeft: 20, fontFamily: FONTS.ui, fontSize: 30, color: C.white, lineHeight: 1.35}}>
							{r.fic}
						</div>
					</React.Fragment>
				);
			})}
		</>
	);
};

const Gap: React.FC = () => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const y = H * 0.55;
	const x0 = W * 0.1;
	const x1 = W * 0.9;
	const k = interpolate(frame, [10, 120], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});
	const marks = [
		{t: 'Bugün', u: 0},
		{t: '+100 yıl', u: 0.12},
		{t: '+500 yıl', u: 0.3},
		{t: '+1.000 yıl', u: 0.5},
		{t: '+5.000 yıl', u: 0.78},
	];
	return (
		<svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
			<line x1={x0} x2={x0 + (x1 - x0) * k} y1={y} y2={y} stroke={C.line} strokeWidth={3} />
			{marks.map((m, i) => (
				<g key={i} opacity={k >= m.u ? 1 : 0.15}>
					<circle cx={x0 + (x1 - x0) * m.u} cy={y} r={i === 0 ? 14 : 8} fill={i === 0 ? C.white : C.dim} />
					<text x={x0 + (x1 - x0) * m.u} y={y + 56} fill={i === 0 ? C.white : C.dim} fontFamily={FONTS.mono} fontSize={24} textAnchor="middle">
						{m.t}
					</text>
				</g>
			))}
			<g opacity={appear(frame, 110, 14)}>
				<circle cx={x0 + (x1 - x0) * 0.95} cy={y} r={24 + 6 * Math.sin(frame * 0.2)} fill={C.cyan} style={{filter: `drop-shadow(0 0 24px ${C.cyan})`}} />
				<text x={x0 + (x1 - x0) * 0.95} y={y - 50} fill={C.cyan} fontFamily={FONTS.sans} fontWeight={900} fontSize={40} textAnchor="middle">
					?
				</text>
			</g>
			<text x={x0} y={y - 110} fill={C.white} fontFamily={FONTS.sans} fontWeight={800} fontSize={44}>
				İnsanlık
			</text>
			<text x={x1} y={y - 110} fill={C.cyan} fontFamily={FONTS.sans} fontWeight={800} fontSize={44} textAnchor="end" opacity={appear(frame, 110, 14)}>
				Onlar?
			</text>
		</svg>
	);
};

export const InfoScene: React.FC<InfoProps> = (p) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const land = W > H;
	return (
		<AbsoluteFill style={{background: C.bg0}}>
			<Drift push={0.035} amp={5} seed={p.mode}>
				<Backdrop />
				{p.mode === 'spectrum' ? <Spectrum /> : null}
				{p.mode === 'zones' ? <Zones depth={p.depth ?? 1000} /> : null}
				{p.mode === 'tether' ? <Tether noise={p.noise ?? 0} /> : null}
				{p.mode === 'pressure' ? <Pressure /> : null}
				{p.mode === 'sphere' ? <Sphere /> : null}
				{p.mode === 'sofar' ? <Sofar /> : null}
				{p.mode === 'law' ? <Law /> : null}
				{p.mode === 'facts' ? <Facts rows={p.rows ?? []} /> : null}
				{p.mode === 'gap' ? <Gap /> : null}
				{p.title ? (
					<div style={{position: 'absolute', left: land ? 120 : 60, top: land ? 60 : 200, opacity: appear(frame, 2, 12), maxWidth: W - 240}}>
						{p.sub ? <Label size={18} color={C.cyan}>{p.sub}</Label> : null}
						<Title size={land ? 46 : 54} style={{marginTop: 8}}>{p.title}</Title>
					</div>
				) : null}
				{p.source ? <Label size={16} style={{position: 'absolute', left: land ? 120 : 60, bottom: land ? 130 : 600, opacity: 0.7}}>Kaynak: {p.source}</Label> : null}
			</Drift>
			{p.tag ? <Tag text={p.tag} style={{right: 80, top: 60}} /> : null}
			<Grain opacity={0.07} />
		</AbsoluteFill>
	);
};

void hash;
