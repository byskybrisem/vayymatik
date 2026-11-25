import React, {useMemo} from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {ease, hash, keyed, Key, prog} from '../lib/anim';
import {Titles, TitleSpec} from '../components/Titles';

type CamKey = {t: number; fx: number; fy: number; z: number; rot?: number; e?: Key<number>['e']};
type NK = {t: number; v: number; e?: Key<number>['e']};

export type PhotoProps = {
	src: string; // engine/public/current/img/<ad>
	keys: CamKey[]; // fx,fy: görüntü merkezi (0-1), z: yakınlaştırma (1 = tam yükseklik)
	sat?: NK[];
	bright?: NK[];
	contrast?: number;
	warm?: NK[]; // 0..1 sıcak/turuncu ton
	cool?: NK[]; // 0..1 soğuk ton
	dust?: number; // havada toz parçacıkları (0..1)
	haze?: NK[]; // alt/üst sis
	shake?: NK[];
	flash?: NK[];
	black?: NK[]; // siyaha çıkış/giriş
	titles?: TitleSpec[];
};

const K = (frame: number, ks: NK[] | undefined, def: number) => (ks && ks.length ? keyed(frame, ks as Key<number>[]) : def);

export const PhotoScene: React.FC<PhotoProps> = (p) => {
	const frame = useCurrentFrame();
	const {width: W, height: H} = useVideoConfig();
	// kamera
	const ks = p.keys;
	const camAt = () => {
		const f = (sel: (k: CamKey) => number) => keyed(frame, ks.map((k) => ({t: k.t, v: sel(k), e: k.e ?? 'cine'})) as Key<number>[]);
		return {fx: f((k) => k.fx), fy: f((k) => k.fy), z: f((k) => k.z), rot: f((k) => k.rot ?? 0)};
	};
	const c = camAt();
	const sh = K(frame, p.shake, 0);
	const imgH = H * c.z;
	const imgW = imgH * (16 / 9);
	let left = W / 2 - c.fx * imgW + noise2D('px', frame * 0.11, 1) * sh * 40;
	let top = H / 2 - c.fy * imgH + noise2D('py', frame * 0.11, 9) * sh * 40;
	left = Math.min(0, Math.max(W - imgW, left));
	top = Math.min(0, Math.max(H - imgH, top));
	const sat = K(frame, p.sat, 1.05);
	const bright = K(frame, p.bright, 1.15);
	const warm = K(frame, p.warm, 0);
	const cool = K(frame, p.cool, 0);
	const black = K(frame, p.black, 0);
	const flash = K(frame, p.flash, 0);
	const hz = K(frame, p.haze, 0);
	const motes = useMemo(() => Array.from({length: 46}).map((_, i) => ({x: hash(i) * 1080, y: hash(i + 99) * 1920, s: 1.5 + hash(i + 7) * 3.5, v: 0.4 + hash(i + 3) * 1.4, ph: hash(i + 55) * 6})), []);
	return (
		<AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
			<div style={{position: 'absolute', left: 0, top: 0, width: imgW, height: imgH, transformOrigin: '0 0', transform: `translate(${left}px, ${top}px) rotate(${c.rot}deg)`, filter: `saturate(${sat}) brightness(${bright}) contrast(${p.contrast ?? 1.04})`}}>
				<Img src={staticFile(`current/img/${p.src}`)} style={{width: imgW, height: imgH, display: 'block'}} />
			</div>
			<AbsoluteFill style={{background: `linear-gradient(180deg, rgba(255,150,60,${0.22 * warm}), rgba(255,120,40,${0.12 * warm}) 60%, rgba(0,0,0,0))`, mixBlendMode: 'soft-light'}} />
			<AbsoluteFill style={{background: `rgba(40,110,200,${0.28 * cool})`, mixBlendMode: 'soft-light'}} />
			{hz > 0 ? <AbsoluteFill style={{background: `linear-gradient(0deg, rgba(210,180,140,${hz * 0.5}) 0%, rgba(210,180,140,0) 45%)`}} /> : null}
			{(p.dust ?? 0) > 0 ? (
				<AbsoluteFill style={{pointerEvents: 'none'}}>
					{motes.map((m, i) => {
						const x = (m.x + frame * m.v * 3 + Math.sin(frame * 0.03 + m.ph) * 30) % 1180 - 50;
						const y = (m.y - frame * m.v * 0.6 + 1920 * 4) % 1920;
						return <div key={i} style={{position: 'absolute', left: x, top: y, width: m.s, height: m.s, borderRadius: '50%', background: 'rgba(255,230,190,0.55)', opacity: (p.dust ?? 0) * (0.35 + 0.65 * Math.abs(Math.sin(frame * 0.05 + m.ph))), filter: 'blur(0.6px)'}} />;
					})}
				</AbsoluteFill>
			) : null}
			<AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 62% at 50% 46%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.38) 100%)'}} />
			<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.42) 100%)'}} />
			<Img src={staticFile('shared/grain.png')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'overlay', opacity: 0.07, transform: `translate(${(frame * 37) % 90}px, ${(frame * 53) % 70}px) scale(1.2)`}} />
			{flash > 0 ? <AbsoluteFill style={{background: '#fff', opacity: flash}} /> : null}
			{black > 0 ? <AbsoluteFill style={{background: '#000', opacity: black}} /> : null}
			{p.titles ? <Titles titles={p.titles} /> : null}
		</AbsoluteFill>
	);
};
