import React, {useMemo} from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {GLCanvas} from '../gl/GLCanvas';
import {MOONSKY_FRAG} from '../gl/moonsky.frag';
import {ease, Key, keyed, lerp, clamp01} from '../lib/anim';
import {Titles, TitleSpec} from '../components/Titles';

type Track = Key<number>[];
type CamKey = {t: number; pitch: number; yaw?: number; fov?: number; roll?: number; e?: keyof typeof ease | 'linear'};

export type MoonSkyProps = {
	keys: CamKey[]; // kamera (derece)
	moonRad: Track; // Ay'ın açısal yarıçapı (derece)
	moonEl?: Track; // Ay yüksekliği (derece)
	moonAz?: Track;
	phase?: number;
	camY?: Track; // kamera yüksekliği (m)
	water?: Track; // su seviyesi (m); verilmezse su yok
	wave?: Track; // dalga şiddeti
	blackout?: Track; // 0..1 sönen pencereler
	people?: Track; // ön plan insanlar
	spray?: Track;
	panic?: Track;
	flash?: Track;
	shake?: Track;
	exposure?: number;
	titles?: TitleSpec[];
};

const kv = (frame: number, tr: Track | undefined, def: number) => (tr && tr.length ? keyed(frame, tr) : def);
const easeFn = (e?: CamKey['e']) => (e === 'linear' ? (x: number) => x : ease[e ?? 'inOut']);

const camAt = (frame: number, keys: CamKey[]) => {
	const fill = (k: CamKey) => ({pitch: k.pitch, yaw: k.yaw ?? 0, fov: k.fov ?? 60, roll: k.roll ?? 0});
	if (frame <= keys[0].t) return fill(keys[0]);
	for (let i = 0; i < keys.length - 1; i++) {
		const a = fill(keys[i]);
		const bk = keys[i + 1];
		const b = fill(bk);
		if (frame <= bk.t) {
			const p = easeFn(bk.e)(clamp01((frame - keys[i].t) / Math.max(1e-6, bk.t - keys[i].t)));
			return {pitch: lerp(a.pitch, b.pitch, p), yaw: lerp(a.yaw, b.yaw, p), fov: lerp(a.fov, b.fov, p), roll: lerp(a.roll, b.roll, p)};
		}
	}
	return fill(keys[keys.length - 1]);
};

const rad = (d: number) => (d * Math.PI) / 180;

export const MoonSkyScene: React.FC<MoonSkyProps> = (p) => {
	const frame = useCurrentFrame();
	const {width, height, fps} = useVideoConfig();
	const cam = camAt(frame, p.keys);
	const sh = kv(frame, p.shake, 0);
	const n = (s: string, k: number) => (sh ? noise2D(s, frame * 0.08, k) * sh : 0);
	const uniforms = {
		uTime: frame / fps,
		uPitch: rad(cam.pitch + n('p', 1) * 1.2),
		uYaw: rad(cam.yaw + n('y', 2) * 1.2),
		uRoll: rad(cam.roll + n('r', 3) * 1.6),
		uFov: rad(cam.fov),
		uExposure: p.exposure ?? 1.15,
		uMoonRad: rad(kv(frame, p.moonRad, 5)),
		uMoonEl: rad(kv(frame, p.moonEl, 28)),
		uMoonAz: rad(kv(frame, p.moonAz, 0)),
		uPhase: p.phase ?? 0.5,
		uCamY: kv(frame, p.camY, 90),
		uWater: p.water ? kv(frame, p.water, 0) : -1000,
		uWave: kv(frame, p.wave, 0),
		uBlackout: kv(frame, p.blackout, 0),
		uPeople: kv(frame, p.people, 0),
		uFlash: kv(frame, p.flash, 0),
		uSpray: kv(frame, p.spray, 0),
		uPanic: kv(frame, p.panic, 0),
	};
	const textures = useMemo(() => [{name: 'uMoon', src: staticFile('shared/moon_lroc_2k.jpg'), repeatX: true}], []);
	return (
		<AbsoluteFill style={{backgroundColor: '#000'}}>
			<GLCanvas frag={MOONSKY_FRAG} uniforms={uniforms} textures={textures} width={width} height={height} />
			<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 66%, rgba(0,0,0,0.35) 100%)'}} />
			{p.titles ? <Titles titles={p.titles} /> : null}
		</AbsoluteFill>
	);
};
