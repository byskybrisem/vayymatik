// "lab" sahne türü: araştırma gemisinin kontrol odası ekranları (hidrofon spektrogramı, osiloskop, sonar,
// batimetri, kontrol listesi, sayaç, günlük, görüntü, ilerleme çubukları, 37 dakikalık döngü).
// Paneller yüzde koordinatlarla yerleşir; tüm zamanlar kare.
import React, {useEffect, useRef} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONTS} from '../lib/theme';
import {hash} from '../lib/anim';
import {appear, Backdrop, C, Drift, Feed, fmtTR, Frame, Grain, Label, Screen, Tag, Title} from './ui';

type Base = {x: number; y: number; w: number; h: number; title?: string; at?: number};
type Spectro = Base & {kind: 'spectro'; beats?: number[]; window?: number; band?: [number, number]; noise?: number; hot?: number; whale?: boolean; ship?: boolean};
type Scope = Base & {kind: 'scope'; beats?: number[]; groups?: {at: number; n: number}[]; window?: number};
type Sonar = Base & {kind: 'sonar'; contact?: number; range?: number};
type Bathy = Base & {kind: 'bathy'; from?: number; dur?: number};
type Check = Base & {kind: 'check'; items: {text: string; at: number; status?: 'ok' | 'no' | 'wait'}[]};
type Counter = Base & {kind: 'counter'; a: number; b: number; from: number; to: number; unit?: string; label?: string; decimals?: number; color?: string};
type Log = Base & {kind: 'log'; lines: string[]; rate?: number; color?: string};
type FeedP = Base & {kind: 'feed'; src: string; label?: string};
type Bars = Base & {kind: 'bars'; items: {text: string; from: number; dur: number; color?: string}[]};
type Cycle = Base & {kind: 'cycle'; period?: number; count?: number};
type TextP = Base & {kind: 'text'; text: string; sub?: string; size?: number; color?: string};
export type Panel = Spectro | Scope | Sonar | Bathy | Check | Counter | Log | FeedP | Bars | Cycle | TextP;

export type LabProps = {panels: Panel[]; title?: string; sub?: string; tag?: string; push?: number; tint?: string};

const px = (p: Base, W: number, H: number): React.CSSProperties => ({left: (p.x / 100) * W, top: (p.y / 100) * H, width: (p.w / 100) * W, height: (p.h / 100) * H});

// renk haritası: siyah → lacivert → camgöbeği → sarı → beyaz
const cmap = (v: number): [number, number, number] => {
	const s = Math.max(0, Math.min(1, v));
	const stops: [number, number, number, number][] = [
		[0, 2, 6, 14],
		[0.35, 10, 40, 90],
		[0.6, 30, 170, 200],
		[0.82, 250, 220, 90],
		[1, 255, 255, 245],
	];
	for (let i = 0; i < stops.length - 1; i++) {
		const a = stops[i];
		const b = stops[i + 1];
		if (s <= b[0]) {
			const t = (s - a[0]) / (b[0] - a[0]);
			return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
		}
	}
	return [255, 255, 245];
};

const SpectroW: React.FC<{p: Spectro; W: number; H: number}> = ({p, W, H}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const ref = useRef<HTMLCanvasElement>(null);
	const cw = Math.round(((p.w / 100) * W) / 2);
	const ch = Math.round(((p.h / 100) * H - 40) / 2);
	useEffect(() => {
		const cv = ref.current;
		if (!cv) return;
		const ctx = cv.getContext('2d')!;
		const img = ctx.createImageData(cw, ch);
		const win = (p.window ?? 10) * fps;
		const [b0, b1] = p.band ?? [0.62, 0.74];
		const noise = p.noise ?? 0.32;
		const pulses = p.beats ?? [];
		for (let x = 0; x < cw; x++) {
			const tf = frame - win * (1 - x / cw);
			const ti = Math.floor(tf / 2);
			let pulse = 0;
			for (const q of pulses) {
				const d = Math.abs(tf - q);
				if (d < 0.18 * fps) pulse = Math.max(pulse, 1 - d / (0.18 * fps));
			}
			for (let y = 0; y < ch; y++) {
				const fy = y / ch; // 0 üst (yüksek frekans) → 1 alt (düşük)
				let v = noise * (0.35 + 0.65 * hash(ti * 0.71 + y * 13.1)) * (0.45 + 0.55 * fy);
				v += 0.12 * Math.sin(fy * 40 + ti * 0.05) * 0.5;
				if (p.ship) v += 0.35 * Math.exp(-Math.pow((fy - 0.86) * 30, 2)) + 0.18 * Math.exp(-Math.pow(((fy * 7) % 1) - 0.5, 2) * 60) * fy;
				if (p.whale) {
					const ph = ((tf / fps) % 4.2) / 4.2;
					const cy = 0.55 - 0.25 * Math.sin(ph * Math.PI);
					v += ph < 0.6 ? 0.8 * Math.exp(-Math.pow((fy - cy) * 45, 2)) : 0;
				}
				if (pulse > 0 && fy > b0 && fy < b1) v += pulse * (p.hot ?? 1.1) * (1 - Math.abs((fy - (b0 + b1) / 2) / ((b1 - b0) / 2)) * 0.5);
				const [r, g, b] = cmap(v);
				const k = (y * cw + x) * 4;
				img.data[k] = r;
				img.data[k + 1] = g;
				img.data[k + 2] = b;
				img.data[k + 3] = 255;
			}
		}
		ctx.putImageData(img, 0, 0);
	}, [frame, cw, ch, p, fps]);
	return (
		<>
			<canvas ref={ref} width={cw} height={ch} style={{position: 'absolute', left: 0, top: 36, width: '100%', height: 'calc(100% - 40px)', imageRendering: 'auto'}} />
			<Label size={14} style={{position: 'absolute', right: 12, top: 40, color: C.dim}}>
				200 Hz
			</Label>
			<Label size={14} style={{position: 'absolute', right: 12, bottom: 8, color: C.dim}}>
				0 Hz
			</Label>
			<div style={{position: 'absolute', right: 0, top: 36, width: 2, bottom: 4, background: C.cyan, opacity: 0.6, boxShadow: `0 0 12px ${C.cyan}`}} />
		</>
	);
};

const ScopeW: React.FC<{p: Scope; W: number; H: number}> = ({p, W, H}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const w = (p.w / 100) * W;
	const h = (p.h / 100) * H - 40;
	const win = (p.window ?? 8) * fps;
	const pts: string[] = [];
	const N = 420;
	const pulses = p.beats ?? [];
	for (let i = 0; i <= N; i++) {
		const tf = frame - win * (1 - i / N);
		let v = (hash(Math.floor(tf * 3) * 0.37 + i * 0.01) - 0.5) * 0.08;
		for (const q of pulses) {
			const d = tf - q;
			if (d >= 0 && d < 0.35 * fps) v += Math.sin(d * 2.2) * Math.exp(-d / (0.08 * fps)) * 0.9;
		}
		pts.push(`${((i / N) * w).toFixed(1)},${(h / 2 - v * h * 0.42).toFixed(1)}`);
	}
	return (
		<svg width={w} height={h + 40} style={{position: 'absolute', left: 0, top: 0}}>
			{Array.from({length: 9}, (_, i) => (
				<line key={i} x1={(i / 8) * w} x2={(i / 8) * w} y1={36} y2={h + 36} stroke={C.line} strokeWidth={1} />
			))}
			<line x1={0} x2={w} y1={h / 2 + 36} y2={h / 2 + 36} stroke={C.line} strokeWidth={1} />
			<polyline points={pts.join(' ')} transform="translate(0,36)" fill="none" stroke={C.cyan} strokeWidth={2.2} style={{filter: `drop-shadow(0 0 6px ${C.cyan})`}} />
			{(p.groups ?? []).map((g, i) => {
				const x = w * (1 - (frame - g.at) / win);
				if (frame < g.at || x < -60) return null;
				return (
					<g key={i} opacity={appear(frame, g.at, 6)}>
						<text x={x} y={h + 30} fill={C.gold} fontFamily={FONTS.mono} fontSize={34} fontWeight={700} textAnchor="middle">
							{g.n}
						</text>
					</g>
				);
			})}
		</svg>
	);
};

const SonarW: React.FC<{p: Sonar; W: number; H: number}> = ({p, W, H}) => {
	const frame = useCurrentFrame();
	const w = (p.w / 100) * W;
	const h = (p.h / 100) * H - 40;
	const R = Math.min(w, h) * 0.46;
	const cx = w / 2;
	const cy = h / 2 + 36;
	const ang = (frame * 2.4) % 360;
	const range = p.range ?? 10000;
	const cr = ((p.contact ?? 8000) / range) * R;
	const ca = 112;
	const since = ((ang - ca + 360) % 360) / 360;
	const blip = Math.exp(-since * 4);
	return (
		<svg width={w} height={h + 40} style={{position: 'absolute', left: 0, top: 0}}>
			<defs>
				<radialGradient id="sg">
					<stop offset="0%" stopColor="rgba(40,140,120,0.25)" />
					<stop offset="100%" stopColor="rgba(0,20,20,0.0)" />
				</radialGradient>
			</defs>
			<circle cx={cx} cy={cy} r={R} fill="url(#sg)" stroke={C.lineHi} />
			{[0.25, 0.5, 0.75].map((k) => (
				<circle key={k} cx={cx} cy={cy} r={R * k} fill="none" stroke={C.line} />
			))}
			{[0.25, 0.5, 0.75, 1].map((k) => (
				<text key={k} x={cx + 6} y={cy - R * k + 16} fill={C.dim} fontFamily={FONTS.mono} fontSize={13}>
					{fmtTR(range * k)} m
				</text>
			))}
			<g transform={`rotate(${ang} ${cx} ${cy})`}>
				{Array.from({length: 24}, (_, i) => (
					<line key={i} x1={cx} y1={cy} x2={cx + R * Math.cos((-i * 1.5 * Math.PI) / 180)} y2={cy + R * Math.sin((-i * 1.5 * Math.PI) / 180)} stroke={C.cyan} strokeOpacity={0.5 * (1 - i / 24)} strokeWidth={3} />
				))}
			</g>
			{Array.from({length: 40}, (_, i) => {
				const a = hash(i * 3.1) * 360;
				const r = (0.15 + 0.85 * hash(i * 7.7)) * R;
				const s = ((ang - a + 360) % 360) / 360;
				return <circle key={i} cx={cx + r * Math.cos((a * Math.PI) / 180)} cy={cy + r * Math.sin((a * Math.PI) / 180)} r={1.6} fill={C.cyan} opacity={0.6 * Math.exp(-s * 5)} />;
			})}
			<circle cx={cx + cr * Math.cos((ca * Math.PI) / 180)} cy={cy + cr * Math.sin((ca * Math.PI) / 180)} r={7 + blip * 6} fill={C.amber} opacity={0.35 + 0.65 * blip} style={{filter: `drop-shadow(0 0 10px ${C.amber})`}} />
			<text x={cx + cr * Math.cos((ca * Math.PI) / 180) + 16} y={cy + cr * Math.sin((ca * Math.PI) / 180) + 5} fill={C.amber} fontFamily={FONTS.mono} fontSize={16}>
				KAYNAK ≈ {fmtTR(p.contact ?? 8000)} m
			</text>
		</svg>
	);
};

const bathyH = (u: number, v: number) => {
	// sırt + deniz dağları + derin hendek + ince sırtlar (abisal tepeler)
	let h = 0.45 + 0.18 * Math.sin(u * 2.3 + 0.6) * Math.cos(v * 1.7 - 0.4);
	h += 0.12 * Math.exp(-Math.pow((u - 0.25) * 7, 2) - Math.pow((v - 0.3) * 6, 2));
	h += 0.16 * Math.exp(-Math.pow((u - 0.78) * 9, 2) - Math.pow((v - 0.72) * 7, 2));
	h -= 0.42 * Math.exp(-Math.pow((u * 0.8 + v * 0.6 - 0.95) * 9, 2));
	for (let k = 1; k <= 5; k++) h += (0.05 / k) * Math.sin(u * 9 * k + Math.sin(v * 4 * k + k) * 1.5) * Math.cos(v * 7 * k - u * 2);
	return h;
};
const bathyCol = (s: number): [number, number, number] => {
	const st: [number, number, number, number][] = [
		[0, 60, 20, 120], [0.25, 30, 70, 190], [0.45, 40, 160, 210], [0.6, 70, 200, 120], [0.75, 230, 220, 80], [0.9, 240, 120, 40], [1, 220, 50, 40],
	];
	for (let i = 0; i < st.length - 1; i++) {
		const a = st[i];
		const b = st[i + 1];
		if (s <= b[0]) {
			const t = (s - a[0]) / (b[0] - a[0]);
			return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
		}
	}
	return [220, 50, 40];
};

const BathyW: React.FC<{p: Bathy; W: number; H: number}> = ({p, W, H}) => {
	const frame = useCurrentFrame();
	const ref = useRef<HTMLCanvasElement>(null);
	const cw = Math.round(((p.w / 100) * W) / 2.5);
	const ch = Math.round(((p.h / 100) * H - 40) / 2.5);
	useEffect(() => {
		const ctx = ref.current!.getContext('2d')!;
		const img = ctx.createImageData(cw, ch);
		const prog = Math.max(0, Math.min(1, (frame - (p.from ?? 0)) / Math.max(1, p.dur ?? 150)));
		const lanes = 5;
		for (let y = 0; y < ch; y++) {
			for (let x = 0; x < cw; x++) {
				const u = x / cw;
				const v = y / ch;
				const lane = Math.min(lanes - 1, Math.floor(v * lanes));
				const lp = lane % 2 === 0 ? u : 1 - u;
				const edge = Math.abs(((v * lanes) % 1) - 0.5) * 2; // şerit kenarına yakınlık
				const done = (lane + lp) / lanes < prog && edge < 0.97;
				const k = (y * cw + x) * 4;
				if (!done) {
					img.data[k] = 6;
					img.data[k + 1] = 12;
					img.data[k + 2] = 20;
					img.data[k + 3] = 255;
					continue;
				}
				const e = 0.002;
				const h = bathyH(u, v);
				const dx = (bathyH(u + e, v) - h) / e;
				const dy = (bathyH(u, v + e) - h) / e;
				const shade = Math.max(0.25, Math.min(1.25, 0.85 + (-dx * 0.7 + dy * 0.5) * 0.09));
				const [r, g, b] = bathyCol(Math.max(0, Math.min(1, h)));
				const n = 0.94 + 0.06 * hash(x * 0.31 + y * 7.7);
				img.data[k] = Math.min(255, r * shade * n);
				img.data[k + 1] = Math.min(255, g * shade * n);
				img.data[k + 2] = Math.min(255, b * shade * n);
				img.data[k + 3] = 255;
			}
		}
		// gemi konumu (şerit ucu)
		const lane = Math.min(lanes - 1, Math.floor(prog * lanes));
		const lp = prog * lanes - lane;
		const sx = (lane % 2 === 0 ? lp : 1 - lp) * cw;
		const sy2 = ((lane + 0.5) / lanes) * ch;
		ctx.putImageData(img, 0, 0);
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.arc(sx, sy2, 3.5, 0, Math.PI * 2);
		ctx.fill();
	}, [frame, cw, ch, p]);
	return <canvas ref={ref} width={cw} height={ch} style={{position: 'absolute', left: 0, top: 36, width: '100%', height: 'calc(100% - 40px)'}} />;
};

const CheckW: React.FC<{p: Check}> = ({p}) => {
	const frame = useCurrentFrame();
	return (
		<div style={{position: 'absolute', left: 24, right: 24, top: 56}}>
			{p.items.map((it, i) => {
				const a = appear(frame, it.at, 8);
				const st = it.status ?? 'ok';
				const col = st === 'ok' ? C.green : st === 'no' ? C.red : C.amber;
				return (
					<div key={i} style={{display: 'flex', alignItems: 'center', gap: 18, opacity: a, transform: `translateX(${(1 - a) * -20}px)`, marginBottom: 18, fontFamily: FONTS.ui, fontSize: 30, color: C.white}}>
						<div style={{width: 34, height: 34, borderRadius: 8, border: `2px solid ${col}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: col, fontSize: 24, fontWeight: 800, boxShadow: `0 0 14px ${col}55`}}>
							{st === 'ok' ? '✓' : st === 'no' ? '✕' : '…'}
						</div>
						<div>{it.text}</div>
					</div>
				);
			})}
		</div>
	);
};

const CounterW: React.FC<{p: Counter}> = ({p}) => {
	const frame = useCurrentFrame();
	const v = interpolate(frame, [p.from, p.to], [p.a, p.b], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 20}}>
			<div style={{fontFamily: FONTS.mono, fontWeight: 700, fontSize: 96, color: p.color ?? C.cyan, textShadow: `0 0 30px ${(p.color ?? C.cyan) + '66'}`}}>
				{fmtTR(v, p.decimals ?? 0)}
				<span style={{fontSize: 40, marginLeft: 12, color: C.dim}}>{p.unit ?? ''}</span>
			</div>
			{p.label ? <Label size={20} style={{marginTop: 8}}>{p.label}</Label> : null}
		</div>
	);
};

const LogW: React.FC<{p: Log}> = ({p}) => {
	const frame = useCurrentFrame();
	const rate = p.rate ?? 4;
	const shown = Math.floor(Math.max(0, frame - (p.at ?? 0)) / rate);
	const lines = p.lines.slice(0, shown).slice(-12);
	return (
		<div style={{position: 'absolute', left: 20, right: 20, top: 50, fontFamily: FONTS.mono, fontSize: 18, lineHeight: 1.6, color: p.color ?? 'rgba(180,240,230,0.85)'}}>
			{lines.map((l, i) => (
				<div key={i} style={{opacity: 0.45 + (0.55 * (i + 1)) / lines.length, whiteSpace: 'nowrap', overflow: 'hidden'}}>
					{l}
				</div>
			))}
			<span style={{opacity: frame % 20 < 10 ? 1 : 0}}>▋</span>
		</div>
	);
};

const BarsW: React.FC<{p: Bars}> = ({p}) => {
	const frame = useCurrentFrame();
	return (
		<div style={{position: 'absolute', left: 28, right: 28, top: 64}}>
			{p.items.map((it, i) => {
				const v = Math.max(0, Math.min(1, (frame - it.from) / Math.max(1, it.dur)));
				const col = it.color ?? C.cyan;
				return (
					<div key={i} style={{marginBottom: 26, opacity: appear(frame, it.from - 6, 8)}}>
						<div style={{display: 'flex', justifyContent: 'space-between', fontFamily: FONTS.mono, fontSize: 20, color: C.white, letterSpacing: 1.5}}>
							<span>{it.text}</span>
							<span style={{color: col}}>%{Math.round(v * 100)}</span>
						</div>
						<div style={{height: 10, marginTop: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'hidden'}}>
							<div style={{width: `${v * 100}%`, height: '100%', background: col, boxShadow: `0 0 14px ${col}`}} />
						</div>
					</div>
				);
			})}
		</div>
	);
};

const CycleW: React.FC<{p: Cycle; W: number; H: number}> = ({p, W, H}) => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	const w = (p.w / 100) * W - 60;
	const n = p.count ?? 5;
	const head = Math.min(1, frame / Math.max(1, durationInFrames * 0.85));
	return (
		<div style={{position: 'absolute', left: 30, right: 30, top: 70}}>
			<div style={{position: 'relative', height: 140}}>
				<div style={{position: 'absolute', left: 0, right: 0, top: 60, height: 2, background: C.line}} />
				{Array.from({length: n}, (_, i) => {
					const x = (i / n) * w;
					const a = appear(frame, 6 + i * 10, 10);
					return (
						<div key={i} style={{position: 'absolute', left: x, top: 30, width: w / n - 14, height: 60, borderRadius: 8, border: `1.5px solid ${C.cyan}`, background: 'rgba(98,240,228,0.08)', opacity: a, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONTS.mono, fontSize: 17, color: C.cyan}}>
							2·3·5·7·11·13…
						</div>
					);
				})}
				{Array.from({length: n + 1}, (_, i) => (
					<div key={i} style={{position: 'absolute', left: (i / n) * w - 30, top: 104, width: 60, textAlign: 'center', fontFamily: FONTS.mono, fontSize: 17, color: C.dim}}>
						{i * (p.period ?? 37)} dk
					</div>
				))}
				<div style={{position: 'absolute', left: head * w, top: 18, width: 2, height: 84, background: C.amber, boxShadow: `0 0 12px ${C.amber}`}} />
			</div>
		</div>
	);
};

export const LabScene: React.FC<LabProps> = ({panels, title, sub, tag, push = 0.05, tint}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	return (
		<AbsoluteFill style={{background: C.bg0}}>
			<Drift push={push} seed={title ?? 'lab'}>
				<Backdrop tint={tint} />
				{panels.map((p, i) => {
					const a = appear(frame, p.at ?? i * 5, 14);
					return (
						<div key={i} style={{position: 'absolute', ...px(p, W, H), opacity: a, transform: `translateY(${(1 - a) * 24}px)`}}>
							<Screen style={{inset: 0}}>
								{p.title ? <Label size={16} color={C.cyan} style={{position: 'absolute', left: 18, top: 12}}>{p.title}</Label> : null}
								{p.kind === 'spectro' ? <SpectroW p={p} W={W} H={H} /> : null}
								{p.kind === 'scope' ? <ScopeW p={p} W={W} H={H} /> : null}
								{p.kind === 'sonar' ? <SonarW p={p} W={W} H={H} /> : null}
								{p.kind === 'bathy' ? <BathyW p={p} W={W} H={H} /> : null}
								{p.kind === 'check' ? <CheckW p={p} /> : null}
								{p.kind === 'counter' ? <CounterW p={p} /> : null}
								{p.kind === 'log' ? <LogW p={p} /> : null}
								{p.kind === 'bars' ? <BarsW p={p} /> : null}
								{p.kind === 'cycle' ? <CycleW p={p} W={W} H={H} /> : null}
								{p.kind === 'text' ? (
									<div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 36}}>
										<Title size={p.size ?? 54} color={p.color}>{p.text}</Title>
										{p.sub ? <Label size={20} style={{marginTop: 14, whiteSpace: 'normal'}}>{p.sub}</Label> : null}
									</div>
								) : null}
							</Screen>
							{p.kind === 'feed' ? <Feed src={p.src} label={p.label} style={{inset: 0}} /> : null}
							<Frame style={{inset: -8}} />
						</div>
					);
				})}
				{title ? (
					<div style={{position: 'absolute', left: W > H ? 80 : 60, top: W > H ? 58 : 280, opacity: appear(frame, 4, 14), maxWidth: W - 120}}>
						<Label size={18} color={C.cyan}>{sub ?? 'AR-GE GEMİSİ MERİDYEN · AKUSTİK LABORATUVARI'}</Label>
						<Title size={W > H ? 46 : 54} style={{marginTop: 8}}>{title}</Title>
					</div>
				) : null}
			</Drift>
			{tag ? <Tag text={tag} style={{right: 80, top: W > H ? 60 : 262}} /> : null}
			<Grain opacity={0.07} />
		</AbsoluteFill>
	);
};
