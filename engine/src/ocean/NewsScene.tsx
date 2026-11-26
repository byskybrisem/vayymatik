// "news" sahne türü: KURGUSAL haber yayını, sosyal medya telefonları, varsayımsal piyasalar, bölünen dünya,
// acil durum toplantı odası. Gerçek kanal/marka/kişi YOK; her karede "KURGUSAL CANLANDIRMA" etiketi.
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONTS} from '../lib/theme';
import {hash} from '../lib/anim';
import {appear, Backdrop, C, Drift, Feed, fmtTR, Grain, Label, Tag, Title} from './ui';
import {Chapter, ChapterSpec} from './Chapter';

export type NewsProps = {
	mode: 'broadcast' | 'phones' | 'markets' | 'split' | 'council';
	headline?: string;
	sub?: string;
	src?: string;
	ticker?: string[];
	posts?: {user: string; text: string}[];
	left?: string[];
	right?: string[];
	at?: number;
	tag?: string;
	chapter?: ChapterSpec;
};

const Broadcast: React.FC<{p: NewsProps}> = ({p}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const land = W > H;
	const tick = (p.ticker ?? ['Pasifik’te 8.000 metrede ışıklı yapılar görüntülendi', 'Bilim insanları: “Saldırganlık kanıtı yok”', 'Görüntüler bağımsız ekiplerce inceleniyor']).join('   ◆   ');
	const tx = -((frame * 4) % (tick.length * 14 + W));
	return (
		<>
			<Backdrop tint="#0a1730" grid={false} />
			<Feed src={p.src ?? 'gizli/city_wide.jpg'} label="CANLI · YANKI KAMERA 1" style={land ? {left: 80, top: 150, width: W * 0.62, height: H * 0.62} : {left: 60, top: 310, width: W - 120, height: 520}} />
			<div style={{position: 'absolute', ...(land ? {left: W * 0.62 + 120, top: 170, width: W * 0.3} : {left: 70, top: 855, width: W - 140})}}>
				<div style={{display: 'inline-block', background: C.red, color: '#fff', fontFamily: FONTS.sans, fontWeight: 900, fontSize: 30, padding: '6px 16px', letterSpacing: 2, opacity: frame % 40 < 30 ? 1 : 0.75}}>SON DAKİKA</div>
				<Title size={land ? 48 : 46} style={{marginTop: land ? 22 : 14}}>{p.headline ?? 'Okyanusun 8.000 metre altında ışıklı yapılar'}</Title>
				{land ? <Label size={20} style={{marginTop: 16, whiteSpace: 'normal', lineHeight: 1.5}}>{p.sub ?? 'Pasifik · insansız denizaltı görüntüleri'}</Label> : null}
				<div style={{marginTop: 36, display: land ? 'flex' : 'none', gap: 30}}>
					{[
						['İZLENME', fmtTR(Math.floor(interpolate(frame, [0, 240], [120e6, 2.4e9], {extrapolateRight: 'clamp'})))],
						['ÜLKE', String(Math.min(194, Math.floor(40 + frame * 0.9)))],
					].map(([k, v]) => (
						<div key={k}>
							<Label size={16}>{k}</Label>
							<div style={{fontFamily: FONTS.mono, fontWeight: 700, fontSize: 34, color: C.cyan}}>{v}</div>
						</div>
					))}
				</div>
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, bottom: land ? 120 : 790, height: 58, background: 'rgba(5,12,24,0.92)', borderTop: `2px solid ${C.red}`, overflow: 'hidden'}}>
				<div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 210, background: C.red, color: '#fff', fontFamily: FONTS.sans, fontWeight: 900, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2}}>OKYANUS HABER</div>
				<div style={{position: 'absolute', left: 230 + tx + W, top: 12, whiteSpace: 'nowrap', fontFamily: FONTS.ui, fontSize: 28, color: C.white}}>{tick}</div>
			</div>
		</>
	);
};

const Phones: React.FC<{p: NewsProps}> = ({p}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const land = W > H;
	const posts = p.posts ?? [
		{user: '@derinmavi', text: 'Bu gerçek mi?! Okyanusun dibinde ışıklar…'},
		{user: '@ocean_watch', text: 'If this is real, everything changes.'},
		{user: '@marina.ciencia', text: '¿Una ciudad bajo el Pacífico?'},
		{user: '@tiefsee_fan', text: 'Das kann kein Fake sein. Die Daten…'},
		{user: '@bilimkurgu_degil', text: 'Bağımsız ekipler doğruluyor 😳'},
		{user: '@lumiere.abyssale', text: 'Nous ne sommes peut-être pas seuls.'},
	];
	const cols = land ? 3 : 2;
	const pw = land ? 300 : 420;
	const ph = pw * 2.0;
	const gap = land ? 60 : 40;
	const total = cols * pw + (cols - 1) * gap;
	return (
		<>
			<Backdrop tint="#0b1a2c" grid={false} />
			{posts.slice(0, land ? 6 : 4).map((post, i) => {
				const c = i % cols;
				const r = Math.floor(i / cols);
				const a = appear(frame, (p.at ?? 0) + i * 7, 12);
				const x = (W - total) / 2 + c * (pw + gap);
				const y = (land ? 120 : 360) + r * (land ? ph * 0.47 : ph * 0.62) + (c % 2) * 60 - (land ? r * 0 : 0);
				const views = Math.floor(interpolate(frame, [i * 7, 300], [1200 + i * 800, 18e6 + i * 4e6], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
				return (
					<div key={i} style={{position: 'absolute', left: x, top: y, width: pw, height: ph * (land ? 0.42 : 0.56), opacity: a, transform: `translateY(${(1 - a) * 50}px) rotate(${(c - 1) * 2.5}deg)`, borderRadius: 28, background: '#0e141c', border: '2px solid rgba(255,255,255,0.12)', boxShadow: '0 30px 60px rgba(0,0,0,0.6)', overflow: 'hidden'}}>
						<div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px'}}>
							<div style={{width: 40, height: 40, borderRadius: 99, background: `hsl(${(i * 67) % 360},55%,45%)`}} />
							<div style={{fontFamily: FONTS.ui, fontWeight: 700, fontSize: 20, color: '#fff'}}>{post.user}</div>
						</div>
						<div style={{padding: '0 18px', fontFamily: FONTS.ui, fontSize: 21, color: '#e8eef4', lineHeight: 1.35, height: 58, overflow: 'hidden'}}>{post.text}</div>
						<div style={{position: 'absolute', left: 14, right: 14, top: 140, bottom: 52, borderRadius: 14, overflow: 'hidden'}}>
							<Feed src={i % 2 ? 'gizli/city_wide.jpg' : 'gizli/wall.jpg'} style={{inset: 0, borderRadius: 14}} zoom={0.12} />
						</div>
						<div style={{position: 'absolute', left: 18, bottom: 14, fontFamily: FONTS.mono, fontSize: 18, color: C.dim}}>▶ {fmtTR(views)} · ♥ {fmtTR(Math.floor(views * 0.08))}</div>
					</div>
				);
			})}
		</>
	);
};

const Markets: React.FC<{p: NewsProps}> = ({p}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const land = W > H;
	const series = [
		{n: 'ENERJİ', d: -0.32, s: 1},
		{n: 'SAVUNMA', d: 0.24, s: 2},
		{n: 'DENİZ TAŞIMACILIĞI', d: -0.21, s: 3},
		{n: 'MALZEME TEKNOLOJİSİ', d: 0.37, s: 4},
	];
	const cw = land ? (W - 260) / 2 : (W - 160) / 2;
	const chh = land ? (H - 380) / 2 : 230;
	return (
		<>
			<Backdrop tint="#081624" />
			{series.map((s, i) => {
				const c = i % 2;
				const r = Math.floor(i / 2);
				const x0 = (land ? 110 : 70) + c * (cw + (land ? 40 : 20));
				const y0 = (land ? 200 : 470) + r * (chh + (land ? 40 : 20));
				const N = 90;
				const prog = Math.min(1, frame / 150);
				const pts: string[] = [];
				let v = 0;
				for (let k = 0; k <= N * prog; k++) {
					const u = k / N;
					const shock = u > 0.45 ? s.d * Math.min(1, (u - 0.45) * 4) : 0;
					v = (hash(k * 0.37 + s.s) - 0.5) * 0.05 + shock + Math.sin(u * 9 + s.s) * 0.02;
					pts.push(`${(u * cw).toFixed(1)},${(chh * 0.5 - v * chh * 1.1).toFixed(1)}`);
				}
				const col = s.d < 0 ? C.red : C.green;
				const pct = (v * 100).toFixed(1).replace('.', ',');
				return (
					<div key={i} style={{position: 'absolute', left: x0, top: y0, width: cw, height: chh, opacity: appear(frame, i * 6, 12)}}>
						<div style={{position: 'absolute', inset: 0, borderRadius: 12, background: 'rgba(3,12,22,0.88)', border: `1px solid ${C.line}`}} />
						<Label size={18} color={C.white} style={{position: 'absolute', left: 18, top: 14}}>{s.n} ENDEKSİ</Label>
						<div style={{position: 'absolute', right: 18, top: 10, fontFamily: FONTS.mono, fontWeight: 700, fontSize: 30, color: col}}>{v >= 0 ? '+' : ''}{pct}%</div>
						<svg width={cw} height={chh} style={{position: 'absolute', left: 0, top: 0}}>
							<line x1={0} x2={cw} y1={chh / 2} y2={chh / 2} stroke={C.line} strokeDasharray="6 6" />
							<polyline points={pts.join(' ')} fill="none" stroke={col} strokeWidth={3} style={{filter: `drop-shadow(0 0 6px ${col})`}} />
						</svg>
					</div>
				);
			})}
			<div style={{position: 'absolute', left: land ? 110 : 70, top: land ? 90 : 300, maxWidth: W - 140}}>
				<Title size={land ? 46 : 52}>{p.headline ?? 'Piyasalarda sert dalgalanma'}</Title>
			</div>
		</>
	);
};

const Split: React.FC<{p: NewsProps}> = ({p}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const land = W > H;
	const k = appear(frame, p.at ?? 0, 24);
	const L = p.left ?? ['Tarihin en büyük keşfi', 'Yalnız değiliz', 'Bilim için yeni çağ'];
	const R = p.right ?? ['Bir tehdit mi?', 'Bizi izliyorlar mı?', 'Kim kontrol edecek?'];
	const cut = land ? `polygon(0 0, ${50 + 4 * k}% 0, ${50 - 4 * k}% 100%, 0 100%)` : `polygon(0 0, 100% 0, 100% ${50 - 3 * k}%, 0 ${50 + 3 * k}%)`;
	return (
		<>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 30% 40%, #0f3a4a 0%, #04111a 70%)'}} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 70% 60%, #4a1218 0%, #14060a 70%)', clipPath: cut === '' ? undefined : `polygon(${land ? `${50 + 4 * k}% 0, 100% 0, 100% 100%, ${50 - 4 * k}% 100%` : `0 ${50 + 3 * k}%, 100% ${50 - 3 * k}%, 100% 100%, 0 100%`})`}} />
			{L.map((t, i) => (
				<div key={`l${i}`} style={{position: 'absolute', left: land ? 120 : 70, top: (land ? 260 : 420) + i * (land ? 130 : 120), opacity: appear(frame, 10 + i * 12, 12), fontFamily: FONTS.sans, fontWeight: 800, fontSize: land ? 52 : 52, color: '#bff8f2', textShadow: '0 0 30px rgba(98,240,228,0.35)'}}>{t}</div>
			))}
			{R.map((t, i) => (
				<div key={`r${i}`} style={{position: 'absolute', right: land ? 120 : 70, top: (land ? 320 : 1100) + i * (land ? 130 : 120), textAlign: 'right', opacity: appear(frame, 18 + i * 12, 12), fontFamily: FONTS.sans, fontWeight: 800, fontSize: land ? 52 : 52, color: '#ffb3ad', textShadow: '0 0 30px rgba(255,90,74,0.35)'}}>{t}</div>
			))}
			<Label size={22} color={C.cyan} style={{position: 'absolute', left: land ? 120 : 70, top: land ? 180 : 340}}>UMUT</Label>
			<Label size={22} color={C.red} style={{position: 'absolute', right: land ? 120 : 70, top: land ? 240 : 1020}}>KORKU</Label>
		</>
	);
};

const Council: React.FC<{p: NewsProps}> = ({p}) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	const land = W > H;
	const sw = land ? W * 0.66 : W * 0.86;
	const sh = sw * 0.5;
	const heads = land ? 9 : 5;
	return (
		<>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, #050b14 0%, #08121e 60%, #020407 100%)'}} />
			<Feed src={p.src ?? 'gizli/city_wide.jpg'} label="DERİN DENİZ CANLI AKIŞ" style={{left: (W - sw) / 2, top: land ? 90 : 360, width: sw, height: sh}} />
			<div style={{position: 'absolute', left: (W - sw) / 2 - 40, top: (land ? 90 : 360) + sh + 10, width: sw + 80, height: 40, background: 'radial-gradient(ellipse at 50% 0%, rgba(80,200,230,0.22), rgba(0,0,0,0) 70%)'}} />
			{Array.from({length: heads}, (_, i) => {
				const x = (i + 0.5) * (W / heads) + (hash(i) - 0.5) * 40;
				const s = 0.85 + hash(i * 3) * 0.3;
				const y = H - (land ? 40 : 300);
				const bob = Math.sin(frame * 0.03 + i) * 2;
				return (
					<svg key={i} width={260 * s} height={300 * s} style={{position: 'absolute', left: x - 130 * s, top: y - 300 * s + bob}} viewBox="0 0 260 300">
						<ellipse cx={130} cy={92} rx={46} ry={56} fill="#020406" />
						<path d="M20,300 C24,200 70,160 130,160 C190,160 236,200 240,300 Z" fill="#020406" />
						<path d="M86,70 C96,40 164,40 174,70" stroke="rgba(120,210,230,0.25)" strokeWidth={3} fill="none" />
					</svg>
				);
			})}
			<div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: land ? 70 : 320, background: 'linear-gradient(180deg, rgba(10,20,30,0.95), #030608)', borderTop: '1px solid rgba(120,200,230,0.2)'}} />
			{Array.from({length: land ? 12 : 6}, (_, i) => (
				<div key={i} style={{position: 'absolute', bottom: land ? 28 : 270, left: ((i + 0.5) / (land ? 12 : 6)) * W - 6, width: 12, height: 12, borderRadius: 99, background: [C.green, C.amber, C.red][Math.floor(hash(i * 5.1 + Math.floor(frame / 45)) * 3)], boxShadow: '0 0 10px currentColor', opacity: appear(frame, 20 + i * 4, 8)}} />
			))}
			<div style={{position: 'absolute', left: land ? 80 : 60, top: land ? 30 : 300}}>
				<Label size={20} color={C.amber}>{p.sub ?? 'ULUSLARARASI ACİL TOPLANTI'}</Label>
			</div>
		</>
	);
};

export const NewsScene: React.FC<NewsProps> = (p) => {
	const {width: W, height: H} = useVideoConfig();
	return (
	<AbsoluteFill style={{background: C.bg0}}>
		<Drift push={0.035} amp={5} seed={p.mode}>
			{p.mode === 'broadcast' ? <Broadcast p={p} /> : null}
			{p.mode === 'phones' ? <Phones p={p} /> : null}
			{p.mode === 'markets' ? <Markets p={p} /> : null}
			{p.mode === 'split' ? <Split p={p} /> : null}
			{p.mode === 'council' ? <Council p={p} /> : null}
		</Drift>
		<Tag text={p.tag ?? 'KURGUSAL CANLANDIRMA'} style={{right: 80, top: W > H ? 54 : 262}} />
		{p.chapter ? <Chapter spec={p.chapter} /> : null}
		<Grain opacity={0.07} />
	</AbsoluteFill>
	);
};
