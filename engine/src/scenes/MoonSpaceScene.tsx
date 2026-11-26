import React, {useMemo} from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {GLCanvas} from '../gl/GLCanvas';
import {MOONSPACE_FRAG} from '../gl/moonspace.frag';
import {ease, hash, Key, keyed, lerp, clamp01} from '../lib/anim';
import {Titles, TitleSpec} from '../components/Titles';

type V3 = [number, number, number];
type CamKey = {t: number; pos: V3; tgt: V3; fov?: number; roll?: number; e?: keyof typeof ease | 'linear'};
type Track = Key<number>[];

export type MoonSpaceProps = {
	keys: CamKey[]; // kamera (Dünya yarıçapı biriminde)
	sun?: V3;
	moonDist?: Track; // Ay'ın Dünya merkezine uzaklığı
	moonAng?: Track; // yörünge açısı (derece, xy düzlemi)
	moonR?: number; // görsel Ay yarıçapı
	moonOn?: Track; // 1: bütün Ay görünür
	stretch?: Track; // gelgit uzaması
	crack?: Track; // parlayan çatlaklar
	shatter?: Track; // parçaların dağılma ilerlemesi 0..1
	ring?: Track;
	ringSpread?: Track; // halkanın doldurduğu yay oranı 0..1
	rain?: Track;
	devast?: Track;
	heat?: Track;
	flash?: Track;
	shake?: Track;
	impact?: {at: number; dir: V3};
	chunk?: {from: number; at: number; start: V3; rad: number};
	earthRot?: Track;
	exposure?: number;
	stars?: number;
	titles?: TitleSpec[];
};

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3): V3 => {
	const l = Math.hypot(...a) || 1;
	return [a[0] / l, a[1] / l, a[2] / l];
};
const kv = (frame: number, tr: Track | undefined, def: number) => (tr && tr.length ? keyed(frame, tr) : def);

const easeFn = (e?: CamKey['e']) => (e === 'linear' ? (x: number) => x : ease[e ?? 'inOut']);

const camAt = (frame: number, keys: CamKey[]) => {
	const fill = (k: CamKey) => ({pos: k.pos, tgt: k.tgt, fov: k.fov ?? 40, roll: k.roll ?? 0});
	if (frame <= keys[0].t) return fill(keys[0]);
	for (let i = 0; i < keys.length - 1; i++) {
		const a = fill(keys[i]);
		const bk = keys[i + 1];
		const b = fill(bk);
		if (frame <= bk.t) {
			const p = easeFn(bk.e)(clamp01((frame - keys[i].t) / Math.max(1e-6, bk.t - keys[i].t)));
			return {
				pos: a.pos.map((v, j) => lerp(v, b.pos[j], p)) as V3,
				tgt: a.tgt.map((v, j) => lerp(v, b.tgt[j], p)) as V3,
				fov: lerp(a.fov, b.fov, p),
				roll: lerp(a.roll, b.roll, p),
			};
		}
	}
	return fill(keys[keys.length - 1]);
};

const NF = 20;
// Parça tohumları: Ay yüzeyindeki başlangıç yönü + yörüngede dağılma hızı
const SEEDS = Array.from({length: NF}, (_, i) => {
	const a = hash(i * 3.1) * Math.PI * 2;
	const b = (hash(i * 7.7) - 0.5) * 1.6;
	return {
		dir: norm([Math.cos(a) * Math.cos(b), Math.sin(a) * Math.cos(b), Math.sin(b)] as V3),
		rad: 0.16 + 0.2 * hash(i * 5.3),
		dth: (hash(i * 11.9) - 0.5) * 2.0, // yörünge boyunca dağılma (rad)
		dr: (hash(i * 2.2) - 0.5) * 0.9, // yarıçap farkı
		dz: (hash(i * 9.4) - 0.5) * 0.16,
	};
});

export const MoonSpaceScene: React.FC<MoonSpaceProps> = (p) => {
	const frame = useCurrentFrame();
	const {width, height, fps} = useVideoConfig();
	const t = frame / fps;
	const cam = camAt(frame, p.keys);
	const sh = kv(frame, p.shake, 0);
	const pos: V3 = sh ? [cam.pos[0] + noise2D('x', frame * 0.07, 1) * sh * 0.03, cam.pos[1] + noise2D('y', frame * 0.07, 2) * sh * 0.03, cam.pos[2] + noise2D('z', frame * 0.07, 3) * sh * 0.03] : cam.pos;
	const fwd = norm(sub(cam.tgt, pos));
	let right = norm(cross(fwd, [0, 0, 1]));
	if (Math.hypot(...right) < 1e-4) right = [1, 0, 0];
	let up = cross(right, fwd);
	const roll = ((cam.roll + (sh ? noise2D('r', frame * 0.06, 5) * sh * 0.8 : 0)) * Math.PI) / 180;
	const r2: V3 = [0, 0, 0];
	const u2: V3 = [0, 0, 0];
	for (let i = 0; i < 3; i++) {
		r2[i] = right[i] * Math.cos(roll) + up[i] * Math.sin(roll);
		u2[i] = -right[i] * Math.sin(roll) + up[i] * Math.cos(roll);
	}
	right = r2;
	up = u2;

	const dist = kv(frame, p.moonDist, 9);
	const ang = (kv(frame, p.moonAng, 0) * Math.PI) / 180;
	const moonR = p.moonR ?? 0.4;
	const moonC: V3 = [dist * Math.cos(ang), dist * Math.sin(ang), 0];
	const shat = kv(frame, p.shatter, 0);
	const stretch = kv(frame, p.stretch, 0);
	const moonOn = kv(frame, p.moonOn, 1);

	// Parça dizisi
	const arr: number[] = [];
	let nFrag = 0;
	if (shat > 0) {
		for (let i = 0; i < NF - 1; i++) {
			const s = SEEDS[i];
			const spread = ease.out(clamp01(shat));
			const th = ang + s.dth * spread * 1.6;
			const rr = dist * (1 + s.dr * 0.55 * spread) + s.dir[0] * moonR * 0.8 * (1 - spread);
			const x = rr * Math.cos(th) + s.dir[1] * moonR * 0.8 * (1 - spread * 0.7);
			const y = rr * Math.sin(th) + s.dir[2] * moonR * 0.8 * (1 - spread * 0.7);
			const z = s.dz * spread * 3 + s.dir[2] * moonR * 0.6 * (1 - spread);
			arr.push(x, y, z, moonR * s.rad * 1.5 * (1.1 - 0.4 * spread));
			nFrag++;
		}
	}
	// Büyük parça: Dünya'ya çarpan (impact dizisi)
	let impT = -1;
	let impDir: V3 = p.impact?.dir ?? [0.2, -0.9, 0.35];
	impDir = norm(impDir);
	if (p.chunk) {
		const c = p.chunk;
		const k = clamp01((frame - c.from) / Math.max(1, c.at - c.from));
		if (frame >= c.from && frame < c.at + 1) {
			const q = k * k * (1.0 + 0.6 * k) / 1.6;
			const target: V3 = [impDir[0] * 1.0, impDir[1] * 1.0, impDir[2] * 1.0];
			const P: V3 = [lerp(c.start[0], target[0], q), lerp(c.start[1], target[1], q), lerp(c.start[2], target[2], q)];
			while (arr.length < (NF - 1) * 4) arr.push(0, 0, 0, 0);
			arr.length = (NF - 1) * 4;
			arr.push(P[0], P[1], P[2], c.rad * (1 - 0.35 * k));
			nFrag = NF;
		}
	}
	if (p.impact && frame >= p.impact.at) impT = (frame - p.impact.at) / fps;
	while (arr.length < NF * 4) arr.push(0, 0, 0, 0);
	const glow = nFrag > 0 ? clamp01(0.35 + shat * 1.1) * (p.chunk && frame >= p.chunk.from ? 1 : 0.8) : 0;

	const uniforms = {
		uPos: pos,
		uFwd: fwd,
		uRight: right,
		uUp: up,
		uTanHalf: Math.tan(((cam.fov * Math.PI) / 180) / 2),
		uSun: norm(p.sun ?? [0.8, -0.55, 0.28]),
		uTime: t,
		uExposure: p.exposure ?? 1.1,
		uStars: p.stars ?? 1,
		uEarthRot: ((kv(frame, p.earthRot, 0) + t * 0.6) * Math.PI) / 180,
		uMoonC: moonC,
		uMoonR: moonR,
		uStretch: stretch,
		uMoonOn: moonOn > 0.5 && shat < 0.02 ? 1 : 0,
		uCrack: kv(frame, p.crack, 0),
		uF: arr,
		uFragN: nFrag,
		uFragGlow: glow,
		uRing: kv(frame, p.ring, 0),
		uRingSpread: kv(frame, p.ringSpread, 0),
		uRingAng: ang,
		uRain: kv(frame, p.rain, 0),
		uDevast: kv(frame, p.devast, 0),
		uHeat: kv(frame, p.heat, 0),
		uFlash: kv(frame, p.flash, 0),
		uImpDir: impDir,
		uImpT: impT,
	};
	const textures = useMemo(
		() => [
			{name: 'uEarth', src: staticFile('shared/earth_bmng_5400.jpg'), repeatX: true},
			{name: 'uMoon', src: staticFile('shared/moon_lroc_2k.jpg'), repeatX: true},
		],
		[],
	);
	return (
		<AbsoluteFill style={{backgroundColor: '#000'}}>
			<GLCanvas frag={MOONSPACE_FRAG} uniforms={uniforms} textures={textures} width={width} height={height} />
			<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 66%, rgba(0,0,0,0.35) 100%)'}} />
			{p.titles ? <Titles titles={p.titles} /> : null}
		</AbsoluteFill>
	);
};
