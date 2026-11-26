// "signal" sahne türü: sinyalin matematiği — asal sayı atımları, Eratosthenes eleği, doğal/yapay karşılaştırma,
// okyanus ses kaynakları, π, yanıt deseni (glif), çözümleme ve son mesaj. Zamanlar kare.
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONTS} from '../lib/theme';
import {ease, hash} from '../lib/anim';
import {appear, Backdrop, C, Drift, Grain, Label, Tag, Title} from './ui';

export type SignalProps = {
	mode: 'primes' | 'sieve' | 'compare' | 'sources' | 'pi' | 'glyph' | 'message' | 'send';
	groups?: {at: number; n: number}[];
	at?: number;
	title?: string;
	sub?: string;
	text?: string;
	decode?: {from: number; dur: number};
	color?: string;
	tag?: string;
	digits?: string;
};

const PrimesV: React.FC<{p: SignalProps}> = ({p}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const groups = p.groups ?? [];
	const col = p.color ?? C.cyan;
	// aktif grup ve önceki gruplar sola kayar
	let active = -1;
	groups.forEach((g, i) => {
		if (frame >= g.at) active = i;
	});
	const slot = Math.min(W * 0.16, 300);
	const center = W / 2;
	const shift = active >= 0 ? interpolate(frame - groups[active].at, [0, 10], [active - 1, active], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.out}) : 0;
	const wave: string[] = [];
	const N = 300;
	for (let i = 0; i <= N; i++) {
		const x = (i / N) * W;
		let v = (hash(i * 0.73 + Math.floor(frame / 2) * 0.11) - 0.5) * 6;
		groups.forEach((g, gi) => {
			if (frame < g.at) return;
			for (let k = 0; k < g.n; k++) {
				const t = g.at + k * 3;
				const dt = frame - t;
				if (dt < 0 || dt > 24) continue;
				const gx = center + (gi - shift) * slot + (k - (g.n - 1) / 2) * Math.min(26, slot / (g.n + 1));
				v += Math.exp(-Math.pow((x - gx) / 10, 2)) * 60 * Math.exp(-dt / 7);
			}
		});
		wave.push(`${x.toFixed(1)},${(H * 0.72 - v).toFixed(1)}`);
	}
	return (
		<>
			<svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
				<polyline points={wave.join(' ')} fill="none" stroke={col} strokeWidth={2} opacity={0.7} style={{filter: `drop-shadow(0 0 6px ${col})`}} />
			</svg>
			{groups.map((g, gi) => {
				if (frame < g.at - 2) return null;
				const x = center + (gi - shift) * slot;
				const dim = gi < active ? 0.45 : 1;
				const sp = Math.min(26, slot / (g.n + 1));
				return (
					<div key={gi} style={{position: 'absolute', left: x, top: H * 0.34, transform: 'translateX(-50%)', opacity: dim * appear(frame, g.at, 6), textAlign: 'center'}}>
						<div style={{fontFamily: FONTS.display, fontSize: 150, color: gi === active ? C.gold : C.white, textShadow: '0 0 40px rgba(255,200,61,0.35)', lineHeight: 1}}>{g.n}</div>
						<div style={{position: 'relative', height: 30, width: sp * g.n, margin: '18px auto 0'}}>
							{Array.from({length: g.n}, (_, k) => {
								const on = frame >= g.at + k * 3;
								return <div key={k} style={{position: 'absolute', left: k * sp, top: 6, width: 16, height: 16, borderRadius: 99, background: on ? col : 'transparent', boxShadow: on ? `0 0 16px ${col}` : 'none', border: `1.5px solid ${col}`}} />;
							})}
						</div>
					</div>
				);
			})}
		</>
	);
};

const isPrime = (n: number) => {
	if (n < 2) return false;
	for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
	return true;
};

const SieveV: React.FC<{p: SignalProps}> = ({p}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const cell = Math.min(W, H) * 0.062;
	const at = p.at ?? 10;
	return (
		<div style={{position: 'absolute', left: W / 2 - cell * 5, top: H / 2 - cell * 5 + (W > H ? 0 : 30), width: cell * 10, height: cell * 10}}>
			{Array.from({length: 100}, (_, i) => {
				const n = i + 1;
				const r = Math.floor(i / 10);
				const c = i % 10;
				const pr = isPrime(n);
				const t = at + (pr ? n * 0.55 : 6 + (n % 17) * 0.8);
				const k = appear(frame, t, 8);
				const op = pr ? 0.35 + 0.65 * k : 0.35 - 0.25 * k;
				return (
					<div
						key={n}
						style={{
							position: 'absolute',
							left: c * cell,
							top: r * cell,
							width: cell - 6,
							height: cell - 6,
							borderRadius: 8,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontFamily: FONTS.mono,
							fontWeight: 700,
							fontSize: cell * 0.36,
							color: pr ? (k > 0.5 ? '#04121a' : C.white) : C.dim,
							background: pr ? `rgba(98,240,228,${0.9 * k})` : 'rgba(255,255,255,0.03)',
							border: `1px solid ${pr ? C.cyan : C.line}`,
							opacity: op,
							boxShadow: pr && k > 0.5 ? `0 0 18px ${C.cyan}88` : 'none',
						}}
					>
						{n}
					</div>
				);
			})}
		</div>
	);
};

const waveLine = (frame: number, W: number, y: number, kind: 'noise' | 'prime', seed: number) => {
	const pts: string[] = [];
	const N = 260;
	const seq = [2, 3, 5, 7, 11, 13];
	for (let i = 0; i <= N; i++) {
		const t = i + frame * 1.6;
		let v = 0;
		if (kind === 'noise') {
			v = (hash(Math.floor(t * 0.8) * 1.3 + seed) - 0.5) * 30 + (hash(Math.floor(t * 0.13) + seed) > 0.86 ? (hash(t) - 0.3) * 120 : 0);
		} else {
			const cyc = t % 520;
			let acc = 0;
			for (const n of seq) {
				for (let k = 0; k < n; k++) {
					const pos = acc + k * 6;
					v += Math.exp(-Math.pow(cyc - pos, 2) / 3) * 70;
				}
				acc += n * 6 + 22;
			}
			v += (hash(t * 0.37 + seed) - 0.5) * 8;
		}
		pts.push(`${((i / N) * W).toFixed(1)},${(y - v).toFixed(1)}`);
	}
	return pts.join(' ');
};

const CompareV: React.FC = () => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	return (
		<>
			<div style={{position: 'absolute', left: 120, top: H * 0.24}}>
				<Label size={22} color={C.dim}>Doğal süreçler · gürültü</Label>
			</div>
			<div style={{position: 'absolute', left: 120, top: H * 0.58, opacity: appear(frame, 20, 12)}}>
				<Label size={22} color={C.cyan}>8.000 m sinyali · düzen</Label>
			</div>
			<svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
				<polyline points={waveLine(frame, W - 240, H * 0.42, 'noise', 3)} transform="translate(120,0)" fill="none" stroke="rgba(200,215,230,0.6)" strokeWidth={2} />
				<polyline points={waveLine(frame, W - 240, H * 0.77, 'prime', 5)} transform="translate(120,0)" fill="none" stroke={C.cyan} strokeWidth={2.4} opacity={appear(frame, 20, 12)} style={{filter: `drop-shadow(0 0 6px ${C.cyan})`}} />
			</svg>
		</>
	);
};

const SourcesV: React.FC = () => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const items = [
		{t: 'Balina şarkısı', d: 'organik, kayan frekans'},
		{t: 'Buzul çatlaması', d: 'ani, geniş bant'},
		{t: 'Denizaltı yanardağı', d: 'düşük, sürekli uğultu'},
		{t: 'Gemi pervanesi', d: 'düzenli harmonikler'},
	];
	const tw = (W - 300) / 4;
	return (
		<>
			{items.map((it, i) => {
				const a = appear(frame, 6 + i * 14, 12);
				const x0 = 150 + i * tw;
				const pts: string[] = [];
				for (let k = 0; k <= 80; k++) {
					const u = k / 80;
					const t = u * 6 + frame * 0.04;
					let y = 0;
					if (i === 0) y = Math.sin(t * 1.4) * 40 * Math.sin(u * Math.PI);
					if (i === 1) y = hash(Math.floor(t * 9)) > 0.78 ? (hash(t) - 0.5) * 140 : (hash(t * 3) - 0.5) * 10;
					if (i === 2) y = Math.sin(t * 0.6) * 18 + (hash(Math.floor(t * 20)) - 0.5) * 16;
					if (i === 3) y = Math.sin(t * 6.0) * 26 + Math.sin(t * 12) * 10;
					pts.push(`${(u * (tw - 40)).toFixed(1)},${(y + 100).toFixed(1)}`);
				}
				return (
					<div key={i} style={{position: 'absolute', left: x0, top: H * 0.33, width: tw - 40, opacity: a, transform: `translateY(${(1 - a) * 30}px)`}}>
						<svg width={tw - 40} height={200}>
							<rect x={0} y={0} width={tw - 40} height={200} rx={12} fill="rgba(3,12,22,0.85)" stroke={C.line} />
							<polyline points={pts.join(' ')} fill="none" stroke={i === 3 ? C.amber : C.cyan} strokeWidth={2.2} />
						</svg>
						<div style={{fontFamily: FONTS.sans, fontWeight: 800, fontSize: 30, color: C.white, marginTop: 18}}>{it.t}</div>
						<Label size={17} style={{marginTop: 6}}>{it.d}</Label>
					</div>
				);
			})}
		</>
	);
};

const PiV: React.FC<{p: SignalProps}> = ({p}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const R = H * 0.17;
	const cx = W * 0.3;
	const cy = H * 0.5;
	const u = interpolate(frame, [(p.at ?? 0) + 10, (p.at ?? 0) + 70], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut});
	const len = Math.PI * 2 * R;
	const lineX0 = W * 0.5;
	const unit = 2 * R; // çap
	const scaleLine = Math.min(1, (W * 0.42) / (Math.PI * unit));
	const digits = '3,14159265358979…';
	const shown = Math.floor(interpolate(frame, [(p.at ?? 0) + 70, (p.at ?? 0) + 120], [0, digits.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
	return (
		<svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
			<circle cx={cx} cy={cy} r={R} fill="none" stroke={C.line} strokeWidth={2} />
			<circle cx={cx} cy={cy} r={R} fill="none" stroke={C.cyan} strokeWidth={5} strokeDasharray={`${len * (1 - u)} ${len}`} transform={`rotate(90 ${cx} ${cy})`} style={{filter: `drop-shadow(0 0 8px ${C.cyan})`}} />
			<line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke={C.gold} strokeWidth={4} />
			<text x={cx} y={cy - 16} fill={C.gold} fontFamily={FONTS.mono} fontSize={26} textAnchor="middle">
				çap = 1
			</text>
			<line x1={lineX0} y1={cy + R + 60} x2={lineX0 + Math.PI * unit * scaleLine * u} y2={cy + R + 60} stroke={C.cyan} strokeWidth={5} style={{filter: `drop-shadow(0 0 8px ${C.cyan})`}} />
			{[0, 1, 2, 3].map((k) => (
				<g key={k} opacity={u > k / Math.PI ? 1 : 0.2}>
					<line x1={lineX0 + k * unit * scaleLine} y1={cy + R + 44} x2={lineX0 + k * unit * scaleLine} y2={cy + R + 76} stroke={C.gold} strokeWidth={3} />
					<text x={lineX0 + k * unit * scaleLine} y={cy + R + 108} fill={C.gold} fontFamily={FONTS.mono} fontSize={24} textAnchor="middle">
						{k}
					</text>
				</g>
			))}
			<text x={lineX0} y={cy - 40} fill={C.white} fontFamily={FONTS.display} fontSize={150}>
				π = {digits.slice(0, shown)}
			</text>
			<text x={lineX0} y={cy + 30} fill={C.dim} fontFamily={FONTS.mono} fontSize={24}>
				ÇEVRE ÷ ÇAP · EVRENİN HER YERİNDE AYNI
			</text>
		</svg>
	);
};

// Yanıt deseni: π basamaklarından türetilmiş halkalar + altıgen çekirdek; çözümleme ilerledikçe parçalar yeşerir
export const GlyphSvg: React.FC<{size: number; decoded: number; rot: number; glow?: string; digits?: string}> = ({size, decoded, rot, glow = C.cyan, digits = '31415926535897932384626433'}) => {
	const R = size / 2;
	const segs: React.ReactNode[] = [];
	let idx = 0;
	for (let ring = 0; ring < 6; ring++) {
		const r = R * (0.32 + ring * 0.12);
		const d = Number(digits[ring % digits.length]) + 3;
		for (let s = 0; s < d; s++) {
			const a0 = (s / d) * Math.PI * 2 + ring * 0.4;
			const a1 = a0 + (Math.PI * 2 * (0.55 + 0.35 * hash(ring * 7 + s))) / d;
			const known = idx / 40 < decoded && hash(idx * 3.3) < 0.55;
			const col = known ? C.green : hash(idx * 1.7) < decoded * 0.6 ? C.amber : glow;
			const x0 = R + r * Math.cos(a0);
			const y0 = R + r * Math.sin(a0);
			const x1 = R + r * Math.cos(a1);
			const y1 = R + r * Math.sin(a1);
			segs.push(<path key={`s${idx}`} d={`M${x0},${y0} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1}`} stroke={col} strokeWidth={ring % 2 ? 3 : 6} fill="none" strokeLinecap="round" opacity={0.85} />);
			if (hash(idx * 5.1) > 0.6) segs.push(<circle key={`c${idx}`} cx={x1} cy={y1} r={5} fill={col} />);
			idx++;
		}
	}
	const hexes: React.ReactNode[] = [];
	for (let q = -2; q <= 2; q++)
		for (let r = -2; r <= 2; r++) {
			if (Math.abs(q + r) > 2) continue;
			const x = R + (q + r / 2) * 30;
			const y = R + r * 26;
			const pts = Array.from({length: 6}, (_, k) => `${x + 14 * Math.cos((k * Math.PI) / 3)},${y + 14 * Math.sin((k * Math.PI) / 3)}`).join(' ');
			hexes.push(<polygon key={`h${q}${r}`} points={pts} fill={hash(q * 3 + r * 7) > 0.6 ? glow + '55' : 'none'} stroke={glow} strokeWidth={1.5} />);
		}
	return (
		<svg width={size} height={size} style={{filter: `drop-shadow(0 0 14px ${glow}88)`}}>
			<g transform={`rotate(${rot} ${R} ${R})`}>
				<circle cx={R} cy={R} r={R * 0.98} fill="none" stroke={glow} strokeOpacity={0.25} strokeWidth={1.5} />
				{segs}
				{hexes}
			</g>
		</svg>
	);
};

const GlyphV: React.FC<{p: SignalProps}> = ({p}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const dec = p.decode ? Math.max(0, Math.min(1, (frame - p.decode.from) / Math.max(1, p.decode.dur))) : 0;
	const size = H * 0.7;
	const build = appear(frame, p.at ?? 0, 30);
	const digits = p.digits ?? '3 · 1 · 4 · 1 · 5 · 9 · 2 · 6';
	return (
		<>
			<div style={{position: 'absolute', left: W * 0.08, top: (H - size) / 2, opacity: build, transform: `scale(${0.85 + 0.15 * build})`}}>
				<GlyphSvg size={size} decoded={dec} rot={frame * 0.12} />
			</div>
			<div style={{position: 'absolute', left: W * 0.55, top: H * 0.3, width: W * 0.38}}>
				<Label size={20} color={C.cyan}>Gelen desen · çözümleme</Label>
				<div style={{fontFamily: FONTS.mono, fontSize: 46, color: C.green, marginTop: 18, opacity: appear(frame, (p.decode?.from ?? 0) + 20, 12)}}>{digits}</div>
				<div style={{fontFamily: FONTS.mono, fontSize: 30, color: C.amber, marginTop: 16, opacity: appear(frame, (p.decode?.from ?? 0) + 40, 12), whiteSpace: 'nowrap'}}>
					{Array.from({length: 14}, (_, i) => (hash(i + Math.floor(frame / 3) * 0.1) > 0.5 ? '?' : '■')).join(' ')}
				</div>
				<div style={{marginTop: 30, height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 5}}>
					<div style={{width: `${Math.round(dec * 17)}%`, height: '100%', background: C.green, borderRadius: 5, boxShadow: `0 0 12px ${C.green}`}} />
				</div>
				<Label size={18} style={{marginTop: 10}}>Çözülen kısım: %{Math.round(dec * 17)} · bilinen kodlamalarla eşleşme yok</Label>
			</div>
		</>
	);
};

const SCR = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789#%&';
const MessageV: React.FC<{p: SignalProps}> = ({p}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const text = p.text ?? 'BİZ SİZİ UZUN ZAMANDIR İZLİYORUZ.';
	const at = p.at ?? 0;
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: H * 0.42, textAlign: 'center', fontFamily: FONTS.display, fontSize: W > H ? 104 : 92, letterSpacing: 4, color: C.white, textShadow: `0 0 40px ${C.cyan}66`, padding: '0 80px', lineHeight: 1.15}}>
			{text.split('').map((ch, i) => {
				const settle = at + 4 + i * 1.6;
				const ok = frame >= settle;
				const shown = frame < at + i * 0.6 ? ' ' : ok || ch === ' ' ? ch : SCR[Math.floor(hash(i * 7 + frame * 0.9) * SCR.length)];
				return (
					<span key={i} style={{color: ok ? C.white : C.cyan, opacity: frame < at + i * 0.6 ? 0 : 1}}>
						{shown}
					</span>
				);
			})}
		</div>
	);
};

const SendV: React.FC<{p: SignalProps}> = ({p}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const rings = (p.groups ?? []).flatMap((g) => Array.from({length: g.n}, (_, k) => g.at + k * 3));
	return (
		<>
			<svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
				{rings.map((t, i) => {
					const dt = frame - t;
					if (dt < 0 || dt > 70) return null;
					const r = dt * 14;
					return <ellipse key={i} cx={W / 2} cy={H * 0.2} rx={r * 1.6} ry={r * 0.6} fill="none" stroke={C.amber} strokeWidth={3} opacity={Math.max(0, 1 - dt / 70)} />;
				})}
			</svg>
			<PrimesV p={{...p, color: C.amber}} />
		</>
	);
};

export const SignalScene: React.FC<SignalProps> = (p) => {
	const frame = useCurrentFrame();
	const {width: W} = useVideoConfig();
	return (
		<AbsoluteFill style={{background: C.bg0}}>
			<Drift push={0.04} amp={6} seed={p.mode}>
				<Backdrop tint={p.mode === 'message' ? '#04131c' : C.bg1} grid={p.mode !== 'message'} />
				{p.mode === 'primes' ? <PrimesV p={p} /> : null}
				{p.mode === 'sieve' ? <SieveV p={p} /> : null}
				{p.mode === 'compare' ? <CompareV /> : null}
				{p.mode === 'sources' ? <SourcesV /> : null}
				{p.mode === 'pi' ? <PiV p={p} /> : null}
				{p.mode === 'glyph' ? <GlyphV p={p} /> : null}
				{p.mode === 'message' ? <MessageV p={p} /> : null}
				{p.mode === 'send' ? <SendV p={p} /> : null}
				{p.title ? (
					<div style={{position: 'absolute', left: W > 1200 ? 120 : 70, top: 70, opacity: appear(frame, 2, 12)}}>
						<Label size={18} color={C.cyan}>{p.sub ?? 'Sinyal analizi'}</Label>
						<Title size={W > 1200 ? 50 : 56} style={{marginTop: 8}}>{p.title}</Title>
					</div>
				) : null}
			</Drift>
			{p.tag ? <Tag text={p.tag} style={{right: 80, top: 60}} /> : null}
			<Grain opacity={0.07} />
		</AbsoluteFill>
	);
};
