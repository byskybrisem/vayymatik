import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {ease, hash, prog} from '../lib/anim';
import {FONTS} from '../lib/theme';
import {trNumber, trUpper} from '../lib/tr';
import {Titles, TitleSpec} from '../components/Titles';

// Ekonomi simülasyonu sahneleri (VAYYMATİK): telefon/banka arayüzü, şehir, mağaza kalabalığı, fiyat/stok sayaçları, finale.
// Tamamen kare bazlı (useCurrentFrame), dış görsel yok. Bu bir ÖRNEK simülasyondur; sayılar tahmin değildir.

type Mode = 'phone' | 'wave' | 'shops' | 'prices' | 'labor' | 'power' | 'finale';
const GOLD = '#FFC83D';
const GREEN = '#2fd27a';
const RED = '#ff4458';

const fmt = (v: number, d = 0) => trNumber(v, d);

// ---------- ortak parçalar ----------
const Skyline: React.FC<{f: number; seed?: number; lit?: number; h?: number; tint?: string}> = ({f, seed = 1, lit = 0.6, h = 760, tint = '#0b1630'}) => {
	const cols = 22;
	return (
		<svg width={1080} height={h} viewBox={`0 0 1080 ${h}`} style={{position: 'absolute', left: 0, bottom: 0}}>
			{Array.from({length: cols}).map((_, i) => {
				const bw = 40 + hash(i * 3 + seed) * 70;
				const bh = 180 + hash(i * 7 + seed) * (h - 260);
				const x = (i / cols) * 1120 - 20;
				const rows = Math.floor(bh / 26);
				return (
					<g key={i}>
						<rect x={x} y={h - bh} width={bw} height={bh} fill={tint} />
						<rect x={x} y={h - bh} width={bw} height={3} fill="rgba(140,180,255,0.35)" />
						{Array.from({length: rows * 3}).map((_, k) => {
							const rx = k % 3;
							const ry = Math.floor(k / 3);
							const on = hash(i * 131 + k * 17 + seed) < lit && hash(k * 3.3 + i + Math.floor(f / 24)) > 0.04;
							return on ? <rect key={k} x={x + 6 + rx * (bw / 3)} y={h - bh + 10 + ry * 26} width={bw / 3 - 8} height={13} fill={hash(k + i) > 0.7 ? '#9fd0ff' : '#ffd9a0'} opacity={0.55 + 0.4 * hash(k * i)} /> : null;
						})}
					</g>
				);
			})}
		</svg>
	);
};

const Person: React.FC<{x: number; y: number; s: number; c: string; bob?: number; arm?: boolean}> = ({x, y, s, c, bob = 0, arm}) => (
	<g transform={`translate(${x},${y + bob}) scale(${s})`}>
		<circle cx={0} cy={-62} r={15} fill={c} />
		<path d="M-30 0 C-30 -34 -18 -46 0 -46 C18 -46 30 -34 30 0 Z" fill={c} />
		{arm ? <rect x={14} y={-70} width={9} height={34} rx={4} fill={c} transform="rotate(25 18 -70)" /> : null}
	</g>
);

const Crowd: React.FC<{f: number; rows?: number; per?: number; w?: number; h?: number; seed?: number; arms?: boolean}> = ({f, rows = 3, per = 9, w = 1080, h = 360, seed = 3, arms}) => (
	<svg width={w} height={h} style={{position: 'absolute', left: 0, bottom: 0}}>
		{Array.from({length: rows}).map((_, r) =>
			Array.from({length: per + r}).map((_, i) => {
				const k = r * 50 + i;
				const sh = 18 + 20 * hash(k + seed);
				return <Person key={k} x={(i + 0.5 + hash(k) * 0.5) * (w / (per + r))} y={h - 20 - (rows - 1 - r) * 62 + 40} s={1.15 + r * 0.38} c={`hsl(${215 + hash(k) * 30},${14 + sh}%,${5 + (rows - r) * 3 + hash(k + 9) * 5}%)`} bob={Math.sin(f * 0.25 + k) * (3 + r * 2)} arm={arms && hash(k + 4) > 0.65} />;
			})
		)}
	</svg>
);

const Grade: React.FC<{leak?: string}> = ({leak}) => (
	<>
		<AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 70% at 50% 45%, transparent 55%, rgba(0,0,0,0.65) 100%)'}} />
		{leak ? <AbsoluteFill style={{background: leak, mixBlendMode: 'screen', opacity: 0.35}} /> : null}
		<AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0 2px, transparent 2px 4px)', opacity: 0.5}} />
	</>
);

const Bokeh: React.FC<{f: number; n?: number; hue?: number; seed?: number}> = ({f, n = 16, hue = 205, seed = 5}) => (
	<AbsoluteFill>
		{Array.from({length: n}).map((_, i) => {
			const s = 80 + hash(i + seed) * 180;
			return <div key={i} style={{position: 'absolute', left: hash(i * 2 + seed) * 1080, top: hash(i * 5 + seed) * 1500 + Math.sin(f * 0.02 + i) * 16, width: s, height: s, borderRadius: '50%', background: `radial-gradient(circle, hsla(${hue + hash(i) * 40},90%,65%,0.38), transparent 68%)`, filter: 'blur(14px)'}} />;
		})}
	</AbsoluteFill>
);

// ---------- Telefon + banka arayüzü ----------
const Phone: React.FC<{f: number; w?: number; mode: 'lock' | 'app'; t: number}> = ({f, w = 470, mode, t}) => {
	const h = w * 2.05;
	const s = w / 470;
	const bal = 12480.25 + 1000000 * prog(f, t, 26, ease.cine);
	const flash = interpolate(f, [t, t + 6, t + 30], [0, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<div style={{width: w, height: h, borderRadius: 74 * s, background: 'linear-gradient(145deg,#2b2d33,#0a0a0c 55%,#1c1d22)', padding: 11 * s, boxShadow: `0 40px 120px rgba(0,0,0,0.8), 0 0 ${120 + flash * 160}px rgba(80,160,255,${0.35 + flash * 0.35}), inset 0 0 0 2px rgba(255,255,255,0.08)`}}>
			<div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 64 * s, overflow: 'hidden', background: mode === 'lock' ? 'linear-gradient(170deg,#1b2a52 0%,#0c1226 60%,#2a1536 100%)' : 'linear-gradient(180deg,#0c1424,#0a1020)', fontFamily: FONTS.ui, color: '#fff'}}>
				<div style={{position: 'absolute', left: '50%', top: 14 * s, width: 128 * s, height: 36 * s, marginLeft: -64 * s, borderRadius: 20 * s, background: '#000'}} />
				{mode === 'lock' ? (
					<>
						<div style={{position: 'absolute', top: 120 * s, width: '100%', textAlign: 'center'}}>
							<div style={{fontSize: 30 * s, opacity: 0.75, fontWeight: 600}}>Salı</div>
							<div style={{fontSize: 150 * s, fontWeight: 300, letterSpacing: -4, lineHeight: 1}}>07:42</div>
						</div>
						{[0, 1].map((i) => {
							const p = prog(f, t + i * 14, 12, ease.back);
							return (
								<div key={i} style={{position: 'absolute', left: 22 * s, right: 22 * s, top: (470 + i * 150) * s, transform: `translateY(${(1 - p) * -60}px) scale(${0.9 + 0.1 * p})`, opacity: p, borderRadius: 30 * s, padding: 22 * s, background: 'rgba(235,240,255,0.2)', backdropFilter: 'blur(24px)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)'}}>
									<div style={{display: 'flex', alignItems: 'center', gap: 14 * s}}>
										<div style={{width: 48 * s, height: 48 * s, borderRadius: 13 * s, background: 'linear-gradient(135deg,#19d3a2,#0a6bff)', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 28 * s}}>V</div>
										<div style={{fontSize: 24 * s, fontWeight: 700, opacity: 0.9}}>VAYY BANK</div>
										<div style={{marginLeft: 'auto', fontSize: 21 * s, opacity: 0.6}}>şimdi</div>
									</div>
									<div style={{marginTop: 12 * s, fontSize: 28 * s, fontWeight: 700}}>{i === 0 ? 'Hesabınıza havale geldi' : 'Hesap hareketi'}</div>
									<div style={{fontSize: 30 * s, fontWeight: 800, color: '#7dffbd'}}>+1.000.000,00 TL</div>
								</div>
							);
						})}
					</>
				) : (
					<>
						<div style={{position: 'absolute', top: 92 * s, left: 36 * s, right: 36 * s}}>
							<div style={{display: 'flex', alignItems: 'center', gap: 14 * s}}>
								<div style={{width: 52 * s, height: 52 * s, borderRadius: '50%', background: 'linear-gradient(135deg,#19d3a2,#0a6bff)'}} />
								<div style={{fontSize: 28 * s, fontWeight: 700}}>Hesaplarım</div>
								<div style={{marginLeft: 'auto', fontSize: 24 * s, opacity: 0.55}}>● ● ●</div>
							</div>
							<div style={{marginTop: 54 * s, fontSize: 26 * s, opacity: 0.6, fontWeight: 600}}>Toplam bakiye</div>
							<div style={{fontSize: 56 * s, fontWeight: 800, letterSpacing: -1, whiteSpace: 'nowrap', textShadow: `0 0 ${40 * flash}px ${GREEN}`, color: flash > 0.2 ? '#bdffd9' : '#fff'}}>{fmt(bal, 2).replace('.', ',')}<span style={{fontSize: 36 * s, opacity: 0.7}}> TL</span></div>
							<div style={{marginTop: 10 * s, display: 'inline-block', padding: `${6 * s}px ${16 * s}px`, borderRadius: 40 * s, background: 'rgba(47,210,122,0.18)', color: GREEN, fontWeight: 700, fontSize: 24 * s, opacity: prog(f, t + 4, 10)}}>▲ +1.000.000,00 TL</div>
							<div style={{marginTop: 50 * s, borderRadius: 30 * s, padding: 26 * s, background: 'linear-gradient(135deg,#0a6bff,#6a2cff)', boxShadow: '0 20px 50px rgba(10,107,255,0.4)'}}>
								<div style={{fontSize: 22 * s, opacity: 0.8}}>Vadesiz TL</div>
								<div style={{fontSize: 38 * s, fontWeight: 700, marginTop: 6 * s}}>TR12 3456 ···· 8890</div>
							</div>
							{[['Gelen havale', '+1.000.000,00', GREEN], ['Market', '-312,50', '#fff'], ['Ulaşım', '-45,00', '#fff']].map(([a, b, c], i) => (
								<div key={i} style={{marginTop: 22 * s, display: 'flex', alignItems: 'center', opacity: prog(f, t + 10 + i * 5, 10)}}>
									<div style={{width: 46 * s, height: 46 * s, borderRadius: 14 * s, background: 'rgba(255,255,255,0.1)'}} />
									<div style={{marginLeft: 16 * s, fontSize: 26 * s, fontWeight: 600}}>{a}</div>
									<div style={{marginLeft: 'auto', fontSize: 26 * s, fontWeight: 700, color: c as string}}>{b}</div>
								</div>
							))}
						</div>
					</>
				)}
				<div style={{position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,0.1) 0%, transparent 28%)'}} />
			</div>
		</div>
	);
};

const Silhouette: React.FC<{glow: number}> = ({glow}) => (
	<svg width={1080} height={900} viewBox="0 0 1080 900" style={{position: 'absolute', left: 0, bottom: 0}}>
		<defs>
			<radialGradient id="rim" cx="55%" cy="35%" r="70%">
				<stop offset="0" stopColor={`rgba(120,190,255,${0.5 * glow})`} />
				<stop offset="1" stopColor="#05070d" />
			</radialGradient>
		</defs>
		<ellipse cx={540} cy={380} rx={170} ry={215} fill="url(#rim)" />
		<path d="M120 900 C140 640 330 590 540 590 C750 590 940 640 960 900 Z" fill="url(#rim)" />
	</svg>
);

// ---------- sahneler ----------
const PhoneScene: React.FC<{f: number}> = ({f}) => {
	const zoom = interpolate(f, [0, 150], [1.12, 1.0]);
	const jx = Math.sin(f * 0.7) * 2.2 * prog(f, 40, 6);
	const toApp = prog(f, 56, 8, ease.inOut);
	return (
		<AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 60% at 50% 40%, #12203f, #04060d 75%)'}}>
			<Bokeh f={f} hue={200} n={10} />
			<Silhouette glow={prog(f, 0, 20)} />
			<AbsoluteFill style={{transform: `scale(${zoom}) translateX(${jx}px)`, transformOrigin: '50% 45%'}}>
				<div style={{position: 'absolute', left: 305, top: 240}}>
					<div style={{position: 'relative'}}>
						<div style={{opacity: 1 - toApp}}><Phone f={f} mode="lock" t={10} /></div>
						<div style={{position: 'absolute', inset: 0, opacity: toApp, transform: `scale(${1.02 - 0.02 * toApp})`}}><Phone f={f} mode="app" t={64} /></div>
					</div>
				</div>
			</AbsoluteFill>
			<Grade leak="rgba(40,120,255,0.25)" />
		</AbsoluteFill>
	);
};

const WaveScene: React.FC<{f: number}> = ({f}) => {
	const cards = Array.from({length: 26}).map((_, i) => ({x: 30 + hash(i * 3) * 760, y: 260 + hash(i * 5 + 1) * 880, at: 4 + i * 5.2 + hash(i) * 4, s: 0.7 + hash(i * 9) * 0.7}));
	const count = Math.floor(prog(f, 0, 190, ease.cine) * 100);
	return (
		<AbsoluteFill style={{background: 'linear-gradient(180deg,#07102a 0%,#14203f 55%,#2a1f3a 100%)'}}>
			<AbsoluteFill style={{transform: `scale(${1.04 + f * 0.0006})`}}>
				<Skyline f={f} lit={0.25 + 0.6 * prog(f, 0, 170)} h={900} seed={4} />
				<Crowd f={f} rows={3} per={9} h={420} arms />
			</AbsoluteFill>
			{cards.map((c, i) => {
				const p = prog(f, c.at, 10, ease.back);
				if (p <= 0) return null;
				return (
					<div key={i} style={{position: 'absolute', left: c.x, top: c.y - p * 24, width: 300 * c.s, transform: `scale(${p})`, opacity: Math.min(1, p) * (0.5 + 0.5 * c.s / 1.4), borderRadius: 20 * c.s, padding: 14 * c.s, background: 'rgba(235,240,255,0.88)', color: '#0b1226', fontFamily: FONTS.ui, boxShadow: '0 14px 40px rgba(0,0,0,0.5)', filter: c.s < 0.9 ? 'blur(1.5px)' : undefined}}>
						<div style={{fontSize: 15 * c.s, fontWeight: 700, opacity: 0.6}}>VAYY BANK · şimdi</div>
						<div style={{fontSize: 24 * c.s, fontWeight: 900, color: '#0a8f4e'}}>+1.000.000,00 TL</div>
					</div>
				);
			})}
			<div style={{position: 'absolute', top: 270, width: '100%', textAlign: 'center', fontFamily: FONTS.ui}}>
				<div style={{display: 'inline-block', padding: '12px 28px', borderRadius: 60, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.25)', fontWeight: 800, fontSize: 36, letterSpacing: 2}}>HERKESİN HESABINDA <span style={{color: GOLD}}>+1.000.000 TL</span></div>
			</div>
			<Grade leak="rgba(255,150,60,0.3)" />
			<ConfettiMoney f={f} from={90} />
		</AbsoluteFill>
	);
};

const ConfettiMoney: React.FC<{f: number; from: number}> = ({f, from}) => (
	<AbsoluteFill style={{pointerEvents: 'none'}}>
		{Array.from({length: 34}).map((_, i) => {
			const t = f - from - hash(i) * 40;
			if (t < 0) return null;
			return <div key={i} style={{position: 'absolute', left: hash(i * 3) * 1000, top: -80 + t * (7 + hash(i * 7) * 7), width: 70, height: 34, borderRadius: 5, background: 'linear-gradient(135deg,#2fd27a,#0f7a45)', transform: `rotate(${t * (4 + hash(i) * 6)}deg)`, opacity: 0.85, boxShadow: '0 4px 12px rgba(0,0,0,0.4)'}} />;
		})}
	</AbsoluteFill>
);

const Icon: React.FC<{kind: 'car' | 'home' | 'phone'; size?: number; color?: string}> = ({kind, size = 90, color = '#fff'}) => (
	<svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
		{kind === 'car' ? (
			<>
				<path d="M10 62 L16 44 Q18 38 26 38 H70 Q78 38 82 46 L90 62 V74 H10 Z" />
				<circle cx={30} cy={74} r={9} fill="#05070d" />
				<circle cx={72} cy={74} r={9} fill="#05070d" />
				<path d="M26 44 H72" />
			</>
		) : kind === 'home' ? (
			<>
				<path d="M12 48 L50 16 L88 48" />
				<path d="M22 44 V84 H78 V44" />
				<path d="M42 84 V62 H58 V84" />
			</>
		) : (
			<>
				<rect x={28} y={10} width={44} height={80} rx={9} />
				<path d="M44 18 H56" />
			</>
		)}
	</svg>
);

const ShopPanel: React.FC<{f: number; at: number; kind: 'car' | 'home' | 'phone'; label: string; color: string; y: number}> = ({f, at, kind, label, color, y}) => {
	const p = prog(f, at, 14, ease.out);
	const lf = f - at;
	const queue = Math.floor(40 + prog(f, at, 120, ease.inOut) * 960);
	return (
		<div style={{position: 'absolute', left: 36, right: 36, top: y, height: 300, borderRadius: 26, overflow: 'hidden', transform: `translateY(${(1 - p) * 140}px) scale(${0.96 + 0.04 * p})`, opacity: p, background: `linear-gradient(180deg, ${color}, #05070d 85%)`, boxShadow: '0 24px 70px rgba(0,0,0,0.7), inset 0 0 0 2px rgba(255,255,255,0.1)'}}>
			<div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 20%, rgba(255,230,170,0.45), transparent)'}} />
			<div style={{position: 'absolute', top: 22, left: 28, right: 28, display: 'flex', alignItems: 'center', gap: 18, fontFamily: FONTS.sans, fontWeight: 900, color: '#fff'}}>
				<Icon kind={kind} size={72} />
				<div style={{fontSize: 44, letterSpacing: 3, textShadow: '0 0 22px rgba(255,255,255,0.6)'}}>{trUpper(label)}</div>
				<div style={{marginLeft: 'auto', textAlign: 'right', fontSize: 24, fontWeight: 700, opacity: 0.9}}>
					<div style={{color: RED}}>● KUYRUK</div>
					<div style={{fontSize: 38}}>{fmt(queue)}+</div>
				</div>
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 200}}>
				<Crowd f={lf} rows={3} per={8} h={200} seed={Math.round(y)} arms />
			</div>
		</div>
	);
};

const ShopsScene: React.FC<{f: number}> = ({f}) => (
	<AbsoluteFill style={{background: 'linear-gradient(180deg,#0a1226,#1a1030)'}}>
		<Bokeh f={f} hue={30} n={10} seed={11} />
		<AbsoluteFill style={{transform: `scale(${1 + f * 0.0005})`}}>
			<ShopPanel f={f} at={0} kind="car" label="Otomobil bayi" color="#1c3f87" y={250} />
			<ShopPanel f={f} at={70} kind="home" label="Emlak ofisi" color="#7a3a14" y={570} />
			<ShopPanel f={f} at={140} kind="phone" label="Teknoloji mağazası" color="#2b1c6e" y={890} />
		</AbsoluteFill>
		<Grade leak="rgba(255,170,70,0.25)" />
	</AbsoluteFill>
);

const PriceRow: React.FC<{f: number; at: number; kind: 'car' | 'home' | 'phone'; label: string; p0: number; p1: number; y: number; stock0: number}> = ({f, at, kind, label, p0, p1, y, stock0}) => {
	const p = prog(f, at, 12, ease.out);
	const k = prog(f, at + 8, 150, ease.inOut);
	const price = p0 + (p1 - p0) * k;
	const stock = stock0 * (1 - 0.82 * k);
	const flick = Math.sin(f * 0.9) * 0.5 + 0.5;
	return (
		<div style={{position: 'absolute', left: 40, right: 40, top: y, height: 270, opacity: p, transform: `translateX(${(1 - p) * -120}px)`, borderRadius: 28, background: 'linear-gradient(135deg, rgba(20,30,60,0.92), rgba(8,12,26,0.92))', boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(255,255,255,0.1)', fontFamily: FONTS.ui, color: '#fff', padding: 26}}>
			<div style={{display: 'flex', alignItems: 'center', gap: 18}}>
				<Icon kind={kind} size={64} />
				<div style={{fontWeight: 800, fontSize: 36, letterSpacing: 2}}>{trUpper(label)}</div>
				<div style={{marginLeft: 'auto', padding: '10px 22px', borderRadius: 14, background: `linear-gradient(135deg,${RED},#b3122a)`, fontWeight: 900, fontSize: 52, boxShadow: `0 0 ${20 + 24 * flick}px rgba(255,68,88,0.6)`}}>
					{fmt(Math.round(price / 100) * 100)} <span style={{fontSize: 30}}>TL ▲</span>
				</div>
			</div>
			<div style={{marginTop: 26, display: 'flex', alignItems: 'center', gap: 16, fontSize: 24, fontWeight: 700, opacity: 0.9}}>
				<span style={{width: 130}}>STOK</span>
				<div style={{flex: 1, height: 26, borderRadius: 14, background: 'rgba(255,255,255,0.12)', overflow: 'hidden'}}>
					<div style={{width: `${stock}%`, height: '100%', background: `linear-gradient(90deg,${GREEN},${stock < 40 ? RED : GOLD})`}} />
				</div>
				<span style={{width: 80, textAlign: 'right'}}>{Math.round(stock)}%</span>
			</div>
			<div style={{marginTop: 14, height: 56, position: 'relative'}}>
				<svg width="100%" height="56" viewBox="0 0 920 56" preserveAspectRatio="none">
					<polyline fill="none" stroke={RED} strokeWidth={5} strokeLinejoin="round" points={Array.from({length: 24}).map((_, i) => `${(i / 23) * 920 * Math.min(1, k + 0.05)},${50 - (i / 23) * 40 * k - hash(i + at) * 8}`).join(' ')} />
				</svg>
			</div>
		</div>
	);
};

const PricesScene: React.FC<{f: number}> = ({f}) => (
	<AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 60% at 50% 30%, #1b1032, #05070d 80%)'}}>
		<Bokeh f={f} hue={340} n={8} seed={21} />
		<PriceRow f={f} at={0} kind="car" label="Otomobil" p0={1200000} p1={1850000} y={250} stock0={100} />
		<PriceRow f={f} at={26} kind="home" label="Konut" p0={3500000} p1={5400000} y={545} stock0={100} />
		<PriceRow f={f} at={52} kind="phone" label="Telefon" p0={45000} p1={68000} y={840} stock0={100} />
		<div style={{position: 'absolute', left: 0, right: 0, top: 1130, textAlign: 'center', opacity: prog(f, 40, 14)}}>
			<span style={{display: 'inline-block', padding: '10px 26px', borderRadius: 40, background: 'rgba(255,200,61,0.16)', border: `2px solid ${GOLD}`, color: GOLD, fontFamily: FONTS.ui, fontWeight: 900, fontSize: 32, letterSpacing: 3}}>ÖRNEK SİMÜLASYON · TAHMİN DEĞİL</span>
		</div>
		<Grade leak="rgba(255,50,90,0.18)" />
	</AbsoluteFill>
);

const LaborScene: React.FC<{f: number}> = ({f}) => {
	const signs = ['ELEMAN ARANIYOR', 'PERSONEL ALINACAK', 'KAPALI', 'VARDİYA AÇIK'];
	return (
		<AbsoluteFill style={{background: 'linear-gradient(180deg,#14100c,#0a0a10)'}}>
			<Bokeh f={f} hue={35} n={9} seed={31} />
			{signs.map((s, i) => {
				const p = prog(f, i * 28, 14, ease.back);
				const closed = s === 'KAPALI';
				return (
					<div key={i} style={{position: 'absolute', left: i % 2 ? 560 : 40, top: 270 + Math.floor(i / 2) * 250, width: 480, height: 200, opacity: p, transform: `scale(${0.8 + 0.2 * p}) rotate(${(i % 2 ? 1 : -1) * 2}deg)`, borderRadius: 18, background: closed ? 'linear-gradient(135deg,#6a0f1c,#2a0508)' : 'linear-gradient(135deg,#f4f1ea,#cfc8b8)', color: closed ? '#fff' : '#18130d', display: 'grid', placeItems: 'center', textAlign: 'center', fontFamily: FONTS.display, fontSize: 62, lineHeight: 1.05, boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 0 0 4px rgba(0,0,0,0.2)'}}>
						{s}
					</div>
				);
			})}
			<div style={{position: 'absolute', left: 40, right: 40, top: 800, height: 340, borderRadius: 26, background: 'rgba(8,12,24,0.88)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.1)', padding: 28, fontFamily: FONTS.ui, color: '#fff', opacity: prog(f, 50, 14)}}>
				<div style={{fontWeight: 800, fontSize: 32, letterSpacing: 2}}>İŞLETME MALİYETİ <span style={{color: RED}}>▲</span></div>
				<div style={{display: 'flex', alignItems: 'flex-end', gap: 20, height: 170, marginTop: 24}}>
					{Array.from({length: 9}).map((_, i) => {
						const k = prog(f, 60 + i * 6, 30);
						return <div key={i} style={{flex: 1, height: `${(25 + i * 8) * k}%`, borderRadius: 10, background: `linear-gradient(180deg,${RED},#7a1020)`}} />;
					})}
				</div>
				<div style={{marginTop: 22, fontSize: 30, fontWeight: 700, opacity: 0.85 + 0.15 * Math.sin(f * 0.3)}}>? Ekonomik belirsizlik ?</div>
			</div>
			<Grade leak="rgba(255,140,40,0.2)" />
		</AbsoluteFill>
	);
};

const PowerScene: React.FC<{f: number}> = ({f}) => {
	const k = prog(f, 20, 200, ease.inOut);
	const items: ('car' | 'home' | 'phone')[] = ['home', 'car', 'phone', 'car', 'phone', 'home', 'phone', 'car'];
	return (
		<AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 60% at 50% 25%, #1a1a2e, #05070d 80%)'}}>
			<div style={{position: 'absolute', left: 60, right: 60, top: 270, borderRadius: 40, padding: 36, background: 'linear-gradient(135deg,#1b2a52,#0b1226)', boxShadow: `0 30px 90px rgba(0,0,0,0.7), 0 0 80px rgba(255,200,61,0.25), inset 0 0 0 2px rgba(255,255,255,0.12)`, fontFamily: FONTS.ui, color: '#fff'}}>
				<div style={{fontSize: 30, opacity: 0.7, fontWeight: 700, letterSpacing: 2}}>BANKA BAKİYESİ</div>
				<div style={{fontSize: 112, fontWeight: 900, color: GOLD, textShadow: '0 0 40px rgba(255,200,61,0.5)'}}>1.000.000 <span style={{fontSize: 52}}>TL</span></div>
				<div style={{fontSize: 26, color: GREEN, fontWeight: 700}}>● bakiye değişmedi</div>
			</div>
			<div style={{position: 'absolute', left: 60, right: 60, top: 660, fontFamily: FONTS.ui, color: '#fff', fontWeight: 800, fontSize: 30, letterSpacing: 2, opacity: 0.85}}>BU PARAYLA ALINABİLECEK ÜRÜN MİKTARI ▼</div>
			<div style={{position: 'absolute', left: 60, right: 60, top: 730, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18}}>
				{items.map((it, i) => {
					const gone = prog(f, 0, 1) * (hash(i * 5) * 0.85 < k * 1.0 - 0.1 * (i % 4) ? 1 : 0);
					const fade = interpolate(k, [0.25 + hash(i * 5) * 0.55, 0.4 + hash(i * 5) * 0.55], [1, 0.12], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
					return (
						<div key={i} style={{height: 150, borderRadius: 22, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.1)', opacity: fade, transform: `scale(${0.7 + 0.3 * fade})`, filter: gone ? 'grayscale(1)' : undefined}}>
							<Icon kind={it} size={96} color={fade > 0.5 ? '#fff' : '#888'} />
						</div>
					);
				})}
			</div>
			<div style={{position: 'absolute', left: 60, right: 60, top: 1050, fontFamily: FONTS.ui}}>
				<div style={{fontWeight: 800, fontSize: 28, color: '#fff', letterSpacing: 2, marginBottom: 10}}>SATIN ALMA GÜCÜ (örnek gösterim)</div>
				<div style={{height: 28, borderRadius: 16, background: 'rgba(255,255,255,0.12)', overflow: 'hidden'}}>
					<div style={{width: `${100 - 62 * k}%`, height: '100%', background: `linear-gradient(90deg,${RED},${GOLD})`}} />
				</div>
			</div>
			<Grade leak="rgba(255,200,61,0.15)" />
		</AbsoluteFill>
	);
};

const FinaleScene: React.FC<{f: number}> = ({f}) => {
	const a = prog(f, 0, 14, ease.out);
	const b = prog(f, 38, 12, ease.out);
	const sh = Math.sin(f * 0.8) * 3 * Math.max(0, 1 - (f - 38) / 14) * (f > 38 ? 1 : 0);
	return (
		<AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 70% at 50% 40%, #2a1a05 0%, #07050a 70%)'}}>
			<AbsoluteFill style={{transform: `scale(${1 + f * 0.0006})`}}>
				<Skyline f={f} seed={9} lit={0.5} h={1000} tint="#0a0d1a" />
				<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(5,7,13,0.85), rgba(5,7,13,0.15) 55%, rgba(5,7,13,0.8))'}} />
			</AbsoluteFill>
			{Array.from({length: 30}).map((_, i) => {
				const t = f - hash(i) * 50;
				if (t < 0) return null;
				return <div key={i} style={{position: 'absolute', left: hash(i * 3) * 1040, top: -60 + t * (3 + hash(i * 7) * 5), width: 56, height: 28, borderRadius: 4, background: 'linear-gradient(135deg,#ffd978,#b5801c)', transform: `rotate(${t * 3 * (hash(i) - 0.5) * 4}deg)`, opacity: 0.6}} />;
			})}
			<div style={{position: 'absolute', left: 0, right: 0, top: 360, textAlign: 'center', fontFamily: FONTS.display, transform: `translateX(${sh}px)`}}>
				<div style={{fontSize: 156, lineHeight: 1, color: '#fff', letterSpacing: 2, opacity: a, transform: `scale(${1.25 - 0.25 * a})`, textShadow: '0 0 50px rgba(255,200,61,0.7), 0 8px 0 rgba(0,0,0,0.5)'}}>HERKES<br />MİLYONER,</div>
				<div style={{marginTop: 46, fontSize: 104, lineHeight: 1.02, color: GOLD, opacity: b, transform: `scale(${1.3 - 0.3 * b})`, textShadow: '0 0 60px rgba(255,68,88,0.55), 0 6px 0 rgba(0,0,0,0.5)'}}>AMA HERKES<br /><span style={{color: RED}}>ZENGİN DEĞİL!</span></div>
			</div>
			{[3.4 * 30, 5.6 * 30].map((at, i) => (
				<AbsoluteFill key={i} style={{background: 'radial-gradient(ellipse 70% 40% at 50% 30%, rgba(255,210,120,0.55), transparent)', opacity: interpolate(f, [at, at + 6, at + 26], [0, 0.8, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), mixBlendMode: 'screen'}} />
			))}
			<Grade leak="rgba(255,190,80,0.3)" />
		</AbsoluteFill>
	);
};

export const EconScene: React.FC<{mode: Mode; titles?: TitleSpec[]}> = ({mode, titles}) => {
	const f = useCurrentFrame();
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: '#05070d'}}>
			{mode === 'phone' ? <PhoneScene f={f} /> : null}
			{mode === 'wave' ? <WaveScene f={f} /> : null}
			{mode === 'shops' ? <ShopsScene f={f} /> : null}
			{mode === 'prices' ? <PricesScene f={f} /> : null}
			{mode === 'labor' ? <LaborScene f={f} /> : null}
			{mode === 'power' ? <PowerScene f={f} /> : null}
			{mode === 'finale' ? <FinaleScene f={f} /> : null}
			{titles ? <Titles titles={titles} /> : null}
		</AbsoluteFill>
	);
};
