import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {GLCanvas} from '../gl/GLCanvas';
import {ROAD_FRAG} from '../gl/road.frag';
import {keyed, Key} from '../lib/anim';
import {Titles, TitleSpec} from '../components/Titles';
import {StartLights} from '../components/StartLights';
import {SpeedLines} from '../components/SpeedLines';

export type RoadProps = {
	variant?: 'f1' | 'highway';
	speed?: {t: number; v: number}[]; // m/s
	curve?: {t: number; v: number}[];
	lights?: {on: number[]; out: number} | null; // kare (sahneye göre)
	titles?: TitleSpec[];
	shake?: number;
	speedLines?: {t: number; v: number}[];
	traffic?: number;
	exposure?: number;
};

export const RoadScene: React.FC<RoadProps> = (p) => {
	const frame = useCurrentFrame();
	const {width, height, fps} = useVideoConfig();
	const spK = (p.speed ?? [{t: 0, v: 60}]) as Key<number>[];
	// konum = hızın integrali (deterministik: kareye kadar topla)
	let dist = 0;
	for (let f = 0; f < frame; f++) dist += keyed(f, spK) / fps;
	const speed = keyed(frame, spK);
	const curve = keyed(frame, (p.curve ?? [{t: 0, v: 0.6}]) as Key<number>[]);
	const sh = (p.shake ?? 0.004) * Math.min(1, speed / 60);
	const variant = p.variant === 'highway' ? 1 : 0;
	const uniforms = {
		uTime: frame / fps,
		uDist: dist,
		uSpeed: speed,
		uCurve: curve,
		uCamH: variant ? 2.2 : 0.75,
		uTanHalf: Math.tan(((variant ? 62 : 72) * Math.PI) / 360),
		uPitch: 0.05 + noise2D('rp', frame * 0.5, 0) * sh,
		uRoll: noise2D('rr', frame * 0.4, 2) * sh * 2,
		uVariant: variant,
		uExposure: p.exposure ?? (variant ? 1.2 : 1.05),
		uShake: sh,
		uLightsOn: 1,
		uTraffic: p.traffic ?? (variant ? 1 : 0),
		uTint: [1, 1, 1],
	};
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<GLCanvas frag={ROAD_FRAG} uniforms={uniforms} width={width} height={height} />
			{p.speedLines ? <SpeedLines amount={keyed(frame, p.speedLines as Key<number>[])} /> : null}
			{p.lights ? <StartLights on={p.lights.on} out={p.lights.out} /> : null}
			{p.titles ? <Titles titles={p.titles} /> : null}
		</AbsoluteFill>
	);
};
