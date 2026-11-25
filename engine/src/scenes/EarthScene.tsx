import React, {useMemo} from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {GLCanvas} from '../gl/GLCanvas';
import {EARTH_FRAG} from '../gl/earth.frag';
import {camBasis, EarthCam, projectLatLon, R_EARTH, slerpLatLon, sunDir} from '../gl/earthMath';
import {clamp01, ease, keyed, Key, lerp, prog} from '../lib/anim';
import {hexToRgb01} from '../lib/color';
import {Titles, TitleSpec} from '../components/Titles';
import {CapsuleFrame} from '../components/CapsuleFrame';
import {GeoLabel} from '../components/GeoLabel';
import {LiveBadge} from '../components/LiveBadge';

type CamKey = Partial<EarthCam> & {t: number; e?: keyof typeof ease | 'linear'};

export type EarthProps = {
	keys: CamKey[];
	sun?: [number, number];
	sunFollow?: [number, number]; // güneş kamerayı izler (dLat, dLon): küre uçuşlarında hep aydınlık taraf
	clouds?: number;
	cloudKeys?: {t: number; v: number}[];
	drain?: {t: number; v: number}[]; // 0=okyanus var, 1=kurumuş
	tex2?: string;
	cloudOct?: number;
	detail?: number;
	stars?: number;
	exposure?: number;
	sat?: number;
	sunGlare?: number;
	tint?: [number, number, number];
	hlA?: {from: number; to?: number; color?: string};
	hlB?: {from: number; to?: number; color?: string};
	borders?: {t: number; v: number}[];
	dots?: {from: number; dur: number; density?: number};
	haze?: number;
	detailTex?: {src: string; bounds: [number, number, number, number]};
	labels?: {text: string; sub?: string; lat: number; lon: number; from: number; to?: number; color?: string}[];
	route?: {from: [number, number]; to: [number, number]; start: number; dur: number; color?: string; arcKm?: number};
	capsule?: {t: number; v: number}[];
	titles?: TitleSpec[];
	shake?: {t: number; v: number}[];
	live?: {from: number; to?: number; text?: string};
};

const DEF: EarthCam = {lat: 33.4, lon: -104.5, alt: 39, heading: 0, pitch: 0, roll: 0, fov: 60, fisheye: 0};

const easeFn = (e?: CamKey['e']) => (e === 'linear' ? (x: number) => x : ease[e ?? 'inOut']);

const camAt = (frame: number, keys: CamKey[]): EarthCam => {
	const full: EarthCam[] = [];
	let prev = DEF;
	for (const k of keys) {
		prev = {...prev, ...k};
		full.push(prev);
	}
	if (frame <= keys[0].t) return full[0];
	for (let i = 0; i < keys.length - 1; i++) {
		const a = keys[i];
		const b = keys[i + 1];
		if (frame <= b.t) {
			const p = easeFn(b.e)(clamp01((frame - a.t) / Math.max(1e-6, b.t - a.t)));
			const A = full[i];
			const B = full[i + 1];
			const [lat, lon] = slerpLatLon([A.lat, A.lon], [B.lat, B.lon], p);
			return {
				lat,
				lon,
				alt: Math.exp(lerp(Math.log(A.alt), Math.log(B.alt), p)),
				heading: lerp(A.heading, B.heading, p),
				pitch: lerp(A.pitch, B.pitch, p),
				roll: lerp(A.roll, B.roll, p),
				fov: lerp(A.fov, B.fov, p),
				fisheye: lerp(A.fisheye, B.fisheye, p),
			};
		}
	}
	return full[full.length - 1];
};

const keyv = (frame: number, ks: {t: number; v: number}[] | undefined, def = 0) =>
	ks && ks.length ? keyed(frame, ks as Key<number>[]) : def;

export const EarthScene: React.FC<EarthProps> = (p) => {
	const frame = useCurrentFrame();
	const {width, height, fps} = useVideoConfig();
	const cam0 = camAt(frame, p.keys);
	const shakeAmt = keyv(frame, p.shake, 0);
	const cam: EarthCam = shakeAmt
		? {
				...cam0,
				heading: cam0.heading + noise2D('h', frame * 0.09, 0) * shakeAmt,
				pitch: cam0.pitch + noise2D('p', frame * 0.09, 3) * shakeAmt,
				roll: cam0.roll + noise2D('r', frame * 0.07, 7) * shakeAmt * 0.6,
			}
		: cam0;
	const b = camBasis(cam);
	const t = frame / fps;
	const hl = (h: EarthProps['hlA']) => (h ? prog(frame, h.from, 12) * (h.to !== undefined ? 1 - prog(frame, h.to, 12) : 1) : 0);
	const dots = p.dots ? prog(frame, p.dots.from, p.dots.dur, ease.inOut) : 0;
	const sun = p.sunFollow ? sunDir(cam0.lat + p.sunFollow[0], cam0.lon + p.sunFollow[1]) : sunDir(...(p.sun ?? [10, -60]));
	const uniforms = {
		uPos: b.pos,
		uFwd: b.fwd,
		uRight: b.right,
		uUp: b.up,
		uTanHalf: Math.tan(((cam.fov * Math.PI) / 180) / 2),
		uFovHalf: ((cam.fov * Math.PI) / 180) / 2,
		uFisheye: cam.fisheye,
		uSun: sun,
		uTime: t,
		uHlA: hl(p.hlA),
		uHlB: hl(p.hlB),
		uHlColA: hexToRgb01(p.hlA?.color ?? '#ff1e3c'),
		uHlColB: hexToRgb01(p.hlB?.color ?? '#ff1e3c'),
		uBorders: keyv(frame, p.borders, 0),
		uClouds: p.cloudKeys ? keyv(frame, p.cloudKeys, 0.6) : p.clouds ?? 0.6,
		uDrain: keyv(frame, p.drain, 0),
		uCloudOct: p.cloudOct ?? 6,
		uDetail: p.detail ?? 0,
		uDots: dots,
		uExposure: p.exposure ?? 1.15,
		uStars: p.stars ?? 0.6,
		uSat: p.sat ?? 1.05,
		uTint: p.tint ?? [1, 1, 1],
		uSunGlare: p.sunGlare ?? 1,
		uHaze: p.haze ?? 0.55,
		uDotDensity: p.dots?.density ?? 0.3,
		uDetailBounds: p.detailTex?.bounds ?? [0, 0, 0, 1],
		uDetailOn: p.detailTex ? 1 : 0,
	};
	const textures = useMemo(
		() => [
			{name: 'uEarth', src: staticFile('shared/earth_bmng_5400.jpg'), repeatX: true},
			{name: 'uEarth2', src: staticFile(p.tex2 ?? 'shared/earth_dry_5400.jpg'), repeatX: true},
			{name: 'uMask', src: staticFile('current/geo_mask.png'), repeatX: true},
			{name: 'uDetailTex', src: staticFile(p.detailTex?.src ?? 'current/geo_mask.png'), repeatX: false},
		],
		[p.detailTex?.src],
	);

	// Rota yayı (büyük çember, irtifa kavisli)
	let routePath = '';
	let head: {x: number; y: number} | null = null;
	if (p.route) {
		const pr = prog(frame, p.route.start, p.route.dur, ease.inOut);
		const N = 72;
		const pts: string[] = [];
		const nVis = Math.max(2, Math.round(N * pr));
		for (let i = 0; i <= nVis; i++) {
			const s = (i / N);
			const [la, lo] = slerpLatLon(p.route.from, p.route.to, s);
			const arc = Math.sin(Math.PI * s) * (p.route.arcKm ?? 900);
			const q = projectLatLon(la, lo, b, cam, width, height, arc);
			pts.push(`${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`);
			if (i === nVis) head = {x: q.x, y: q.y};
		}
		routePath = pr > 0 ? pts.join(' ') : '';
	}
	const routeColor = p.route?.color ?? '#ff2a45';
	const capsuleOpacity = keyv(frame, p.capsule, 0);

	return (
		<AbsoluteFill style={{backgroundColor: '#000'}}>
			<GLCanvas frag={EARTH_FRAG} uniforms={uniforms} textures={textures} width={width} height={height} />
			<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 34%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.3) 100%)'}} />
			{routePath ? (
				<svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
					<defs>
						<filter id="rglow" x="-50%" y="-50%" width="200%" height="200%">
							<feGaussianBlur stdDeviation="7" result="b" />
							<feMerge>
								<feMergeNode in="b" />
								<feMergeNode in="SourceGraphic" />
							</feMerge>
						</filter>
					</defs>
					<path d={routePath} stroke={routeColor} strokeWidth={7} fill="none" strokeLinecap="round" filter="url(#rglow)" />
					<path d={routePath} stroke="#fff" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.85} />
					{head ? <circle cx={(head as {x: number}).x} cy={(head as {y: number}).y} r={13} fill="#fff" filter="url(#rglow)" /> : null}
				</svg>
			) : null}
			{(p.labels ?? []).map((l, i) => {
				const q = projectLatLon(l.lat, l.lon, b, cam, width, height, 0);
				const a = prog(frame, l.from, 10) * (l.to !== undefined ? 1 - prog(frame, l.to, 8) : 1);
				if (!q.visible || a <= 0) return null;
				return <GeoLabel key={i} x={q.x} y={q.y} text={l.text} sub={l.sub} color={l.color} appear={a} frame={frame - l.from} />;
			})}
			{capsuleOpacity > 0 ? <CapsuleFrame opacity={capsuleOpacity} frame={frame} /> : null}
			{p.live && frame >= p.live.from && (p.live.to === undefined || frame < p.live.to) ? <LiveBadge f={frame - p.live.from} text={p.live.text} /> : null}
			{p.titles ? <Titles titles={p.titles} /> : null}
		</AbsoluteFill>
	);
};

export const earthRadius = R_EARTH;
