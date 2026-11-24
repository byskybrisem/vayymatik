// Sinematik kamera: anahtar karelerden Catmull-Rom yolu, global yumuşatma, odak hedefi, FOV (dolly-zoom),
// yatış (roll) ve el kamerası titreşimi. Tüm değerler kareye bağlı → geri sarılabilir, deterministik.
import React from 'react';
import {useThree} from '@react-three/fiber';
import {useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import * as THREE from 'three';
import {catmull, easeFn, V3} from '../core/math';
import {clamp01, lerp} from '../../lib/anim';

export type CamKey = {t: number; pos: V3; target: V3; fov?: number; roll?: number};
export type CameraSpec = {
	keys: CamKey[];
	/** Tüm yol boyunca hız eğrisi (varsayılan 'cine': yumuşak kalkış/iniş) */
	ease?: string;
	/** El kamerası titreşimi (metre) */
	shake?: number;
	/** Yol ölçeği / ofseti: aynı hareketi başka sahnede yeniden kullanmak için */
	offset?: V3;
};

const sample = (keys: CamKey[], frame: number, e: (x: number) => number) => {
	const n = keys.length;
	if (n === 1) return {pos: keys[0].pos, target: keys[0].target, fov: keys[0].fov ?? 35, roll: keys[0].roll ?? 0};
	const t0 = keys[0].t;
	const t1 = keys[n - 1].t;
	const T = t0 + e(clamp01((frame - t0) / Math.max(1, t1 - t0))) * (t1 - t0);
	let i = 0;
	while (i < n - 2 && T > keys[i + 1].t) i++;
	const a = keys[i];
	const b = keys[i + 1];
	const u = clamp01((T - a.t) / Math.max(1e-6, b.t - a.t));
	const k0 = keys[Math.max(0, i - 1)];
	const k3 = keys[Math.min(n - 1, i + 2)];
	return {
		pos: catmull(k0.pos, a.pos, b.pos, k3.pos, u),
		target: catmull(k0.target, a.target, b.target, k3.target, u),
		fov: lerp(a.fov ?? 35, b.fov ?? 35, u),
		roll: lerp(a.roll ?? 0, b.roll ?? 0, u),
	};
};

export const CameraRig: React.FC<{spec: CameraSpec}> = ({spec}) => {
	const frame = useCurrentFrame();
	const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
	const s = sample(spec.keys, frame, easeFn(spec.ease ?? 'cine'));
	const sh = spec.shake ?? 0.012;
	const o = spec.offset ?? [0, 0, 0];
	const jx = noise2D('camx', frame * 0.035, 0) * sh;
	const jy = noise2D('camy', frame * 0.035, 3) * sh;
	// Render öncesi senkron güncelleme (ThreeCanvas her karede yeniden çizer)
	camera.position.set(s.pos[0] + o[0] + jx, s.pos[1] + o[1] + jy, s.pos[2] + o[2]);
	camera.up.set(Math.sin(s.roll), Math.cos(s.roll), 0);
	camera.lookAt(s.target[0] + o[0] + jx * 0.5, s.target[1] + o[1] + jy * 0.5, s.target[2] + o[2]);
	if (camera.fov !== s.fov) {
		camera.fov = s.fov;
		camera.updateProjectionMatrix();
	}
	return null;
};
