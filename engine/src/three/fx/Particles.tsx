// Parçacık sistemleri (instanced, deterministik): toz zerreleri, yükselen banknot girdabı, altın tozu.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp01} from '../../lib/anim';
import {num, NumKey, rng, V3} from '../core/math';
import {banknoteTexture, glowTexture} from '../core/textures';

/** Işık hüzmesinde süzülen toz / altın zerreleri (additive nokta bulutu, kameraya her açıdan bakar) */
export const Dust: React.FC<{count?: number; size?: V3; color?: string; opacity?: number | NumKey[]; seed?: number; scale?: number; rise?: number}> = ({count = 160, size = [3, 2, 3], color = '#ffd9a0', opacity = 0.6, seed = 11, scale = 0.025, rise = 0.05}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const o = num(frame, opacity, 0.6);
	const pts = useMemo(() => {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
		const m = new THREE.PointsMaterial({map: glowTexture(), color, size: scale, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false});
		const p = new THREE.Points(g, m);
		p.frustumCulled = false;
		return p;
	}, [count, color, scale]);
	(pts.material as THREE.PointsMaterial).opacity = o;
	const arr = (pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
	const r = rng(seed);
	const t = frame / fps;
	for (let i = 0; i < count; i++) {
		const bx = (r() - 0.5) * size[0];
		const by = r() * size[1];
		const bz = (r() - 0.5) * size[2];
		const ph = r() * 10;
		const sp = 0.5 + r();
		const y = (((by + t * rise * sp) % size[1]) + size[1]) % size[1];
		arr[i * 3] = bx + Math.sin(t * 0.7 + ph) * 0.06;
		arr[i * 3 + 1] = y;
		arr[i * 3 + 2] = bz + Math.cos(t * 0.5 + ph) * 0.06;
	}
	pts.geometry.attributes.position.needsUpdate = true;
	return <primitive object={pts} />;
};

/** Banknot girdabı: merkez etrafında sarmal yükselen, çırpınan banknotlar. from/dur kare. */
export const MoneySwirl: React.FC<{count?: number; from?: number; dur?: number; radius?: [number, number]; height?: number; seed?: number; turns?: number}> = ({count = 70, from = 0, dur = 90, radius = [0.6, 2.4], height = 4, seed = 21, turns = 1.4}) => {
	const frame = useCurrentFrame();
	const im = useMemo(() => {
		const tex = banknoteTexture('#2F8F6B');
		const m = new THREE.MeshStandardMaterial({map: tex, side: THREE.DoubleSide, roughness: 0.7});
		const g = new THREE.PlaneGeometry(0.156, 0.07, 3, 1);
		const mesh = new THREE.InstancedMesh(g, m, count);
		mesh.castShadow = true;
		mesh.frustumCulled = false;
		return mesh;
	}, [count]);
	const r = rng(seed);
	const d = new THREE.Object3D();
	for (let i = 0; i < count; i++) {
		const delay = r() * 0.45;
		const a0 = r() * Math.PI * 2;
		const sp = 0.7 + r() * 0.6;
		const fl = r() * 10;
		const k = clamp01(((frame - from) / Math.max(1, dur) - delay) / (1 - delay * 0.6));
		const kk = k * k * (3 - 2 * k) * 0.35 + k * 0.65;
		const a = a0 + kk * Math.PI * 2 * turns * sp;
		const rad = radius[0] + (radius[1] - radius[0]) * Math.min(1, kk * 1.3);
		const y = 0.8 + kk * height * sp;
		d.position.set(Math.cos(a) * rad, k <= 0 ? -100 : y, Math.sin(a) * rad);
		d.rotation.set(Math.sin(frame * 0.3 + fl) * 1.2 + fl, -a, Math.cos(frame * 0.23 + fl) * 0.8);
		d.scale.setScalar(k <= 0 ? 0.0001 : 1.6);
		d.updateMatrix();
		im.setMatrixAt(i, d.matrix);
	}
	im.instanceMatrix.needsUpdate = true;
	return <primitive object={im} />;
};

/** Hacimsel ışık konisi (lamba/pencere hüzmesi) — sahte volumetrik, ucuz */
export const LightCone: React.FC<{len?: number; radius?: number; color?: string; opacity?: number | NumKey[]}> = ({len = 1.2, radius = 0.6, color = '#ffcf8a', opacity = 0.12}) => {
	const frame = useCurrentFrame();
	const o = num(frame, opacity, 0.12);
	const m = useMemo(() => new THREE.MeshBasicMaterial({color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false}), [color]);
	m.opacity = o;
	return (
		<mesh material={m} position={[0, -len / 2, 0]}>
			<coneGeometry args={[radius, len, 24, 1, true]} />
		</mesh>
	);
};
