// "ocean" sahne türü: GLSL tam ekran okyanus — mode "storm" (yüzey, gemi, şimşek) veya "water" (iniş/açık su).
import React from 'react';
import {Chapter, ChapterSpec} from './Chapter';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {GLCanvas} from '../gl/GLCanvas';
import {num, vec, NumKey, VecKey, V3} from '../three/core/math';
import {hash} from '../lib/anim';
import {Titles, TitleSpec} from '../components/Titles';
import {STORM_FRAG} from './storm.frag';
import {WATER_FRAG} from './water.frag';
import {Hud, HudSpec} from './Hud';
import {Grade, GradeSpec} from './Grade';

type N = number | NumKey[];
export type OceanProps = {
	mode: 'storm' | 'water';
	scale?: number;
	cam?: {pos?: V3 | VecKey[]; yaw?: N; pitch?: N; roll?: N; fov?: N; shake?: number};
	depth?: N;
	descent?: N;
	lamp?: N;
	snow?: N;
	bio?: N;
	jelly?: N;
	glitch?: N;
	exposure?: N;
	amp?: N;
	storm?: N;
	dawn?: N;
	rain?: N;
	flashes?: number[];
	ship?: {show?: boolean; pos?: V3; yaw?: number; rovY?: N; motion?: number};
	hud?: HudSpec;
	grade?: GradeSpec;
	titles?: TitleSpec[];
	chapter?: ChapterSpec;
};

const flashAt = (frame: number, fps: number, list: number[] = []) => {
	let I = 0;
	let x = 0;
	let seed = 0;
	for (const f0 of list) {
		const dt = (frame - f0) / fps;
		if (dt < 0 || dt > 1.2) continue;
		const v = Math.exp(-dt / 0.06) + (dt >= 0.12 ? 0.85 * Math.exp(-(dt - 0.12) / 0.1) : 0) + (dt >= 0.32 ? 0.45 * Math.exp(-(dt - 0.32) / 0.22) : 0);
		if (v > I) {
			I = v;
			x = (hash(f0 * 1.7) - 0.5) * 1.3;
			seed = Math.floor(hash(f0 * 3.3) * 97);
		}
	}
	return {I, x, seed};
};

export const OceanScene: React.FC<OceanProps> = (p) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const t = frame / fps;
	const shake = p.cam?.shake ?? (p.mode === 'storm' ? 0.012 : 0.004);
	const yaw = num(frame, p.cam?.yaw, 0) + Math.sin(t * 0.9) * shake * 0.6;
	const pitch = num(frame, p.cam?.pitch, 0) + Math.sin(t * 1.3 + 1.0) * shake;
	const roll = num(frame, p.cam?.roll, 0) + Math.sin(t * 0.7 + 2.0) * shake * 1.4;
	const fov = num(frame, p.cam?.fov, 50);
	const exposure = num(frame, p.exposure, 1);
	let uniforms: Record<string, number | number[]> = {uTime: t, uYaw: yaw, uPitch: pitch, uRoll: roll, uFov: fov, uExposure: exposure};
	if (p.mode === 'storm') {
		const cam = vec(frame, p.cam?.pos, [-110, 12, 60]);
		const fl = flashAt(frame, fps, p.flashes);
		const ship = p.ship ?? {};
		const motion = (ship.motion ?? 1) * (0.4 + num(frame, p.storm, 1) * 0.6);
		const heave = Math.sin(t * 0.72) * 0.9 * motion;
		const r = Math.sin(t * 0.55) * 0.07 * motion; // yalpa
		const pz = Math.sin(t * 0.81 + 1.0) * 0.035 * motion; // baş-kıç
		const y0 = ship.yaw ?? 0;
		// dünya→gemi: (Ry(yaw)·Rx(roll)·Rz(pitch))ᵀ
		const cy = Math.cos(y0), sy = Math.sin(y0), cr = Math.cos(r), sr = Math.sin(r), cp = Math.cos(pz), sp = Math.sin(pz);
		// M = Ry * Rx * Rz
		const Rz = [[cp, -sp, 0], [sp, cp, 0], [0, 0, 1]];
		const Rx = [[1, 0, 0], [0, cr, -sr], [0, sr, cr]];
		const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
		const mul = (A: number[][], B: number[][]) => A.map((row) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
		const M = mul(mul(Ry, Rx), Rz);
		// Mᵀ satırları = M sütunları
		const r0 = [M[0][0], M[1][0], M[2][0]];
		const r1 = [M[0][1], M[1][1], M[2][1]];
		const r2 = [M[0][2], M[1][2], M[2][2]];
		const sp0 = ship.pos ?? [0, 0, 0];
		uniforms = {
			...uniforms,
			uCam: cam,
			uAmp: num(frame, p.amp, 2.6),
			uStorm: num(frame, p.storm, 1),
			uDawn: num(frame, p.dawn, 0),
			uRain: num(frame, p.rain, 1),
			uFlash: fl.I,
			uBoltX: fl.x,
			uBoltSeed: fl.seed,
			uShip: ship.show === false ? 0 : 1,
			uShipPos: [sp0[0], sp0[1] + heave - 1.2, sp0[2]],
			uShipR0: r0,
			uShipR1: r1,
			uShipR2: r2,
			uRovY: num(frame, ship.rovY, -100),
		};
	} else {
		uniforms = {
			...uniforms,
			uDepth: num(frame, p.depth, 1000),
			uDescent: num(frame, p.descent, 0.6),
			uLamp: num(frame, p.lamp, 1),
			uSnow: num(frame, p.snow, 0.7),
			uBio: num(frame, p.bio, 0),
			uJelly: num(frame, p.jelly, 0),
			uGlitch: num(frame, p.glitch, 0),
			uSeed: 3.0,
		};
	}
	const scale = p.scale ?? (p.mode === 'storm' ? 0.55 : 0.6);
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<GLCanvas frag={p.mode === 'storm' ? STORM_FRAG : WATER_FRAG} uniforms={uniforms} width={width} height={height} scale={scale} />
			<Grade spec={p.grade} lamp={p.mode === 'water' ? Math.min(1, num(frame, p.lamp, 1)) : 0} />
			{p.hud ? <Hud spec={p.hud} /> : null}
			{p.chapter ? <Chapter spec={p.chapter} /> : null}
			{p.titles ? <Titles titles={p.titles} /> : null}
		</AbsoluteFill>
	);
};
