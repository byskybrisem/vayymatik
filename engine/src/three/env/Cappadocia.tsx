// Kapadokya yüzeyi (temsili): tüf tepeler, peri bacası konileri, bodur çalılar, bacaların taş ağızları ve kuyu ağzı.
// Yüz (z=0) boyunca kesit ile birleşir: arazi y=0'da başlar, uzağa doğru yükselir.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from '../core/math';
import {fbm, smoothstep} from '../core/noise';
import {mat} from '../core/materials';

const SEED = 77;

const terrainHeight = (x: number, z: number) => {
	const d = -z; // yüzden uzaklık
	const rise = smoothstep(2, 60, d);
	const hills = (fbm(x * 0.012 + 5, z * 0.012, SEED, 4) - 0.35) * 46;
	const ripple = (fbm(x * 0.07, z * 0.07, SEED + 3, 3) - 0.5) * 3.2;
	const valley = -Math.exp(-Math.pow((x - 10) / 38, 2)) * 5 * smoothstep(30, 90, d);
	return (hills + ripple + valley) * rise;
};

const buildTerrain = () => {
	const x0 = -170;
	const x1 = 170;
	const z0 = -420;
	const z1 = 0;
	const st = 3;
	const nx = Math.round((x1 - x0) / st);
	const nz = Math.round((z1 - z0) / st);
	const pos = new Float32Array((nx + 1) * (nz + 1) * 3);
	const col = new Float32Array((nx + 1) * (nz + 1) * 3);
	const c = new THREE.Color();
	const A = new THREE.Color('#c9a874');
	const B = new THREE.Color('#b98c6a');
	const Gc = new THREE.Color('#9c9a62');
	const Wc = new THREE.Color('#d9c29a');
	let k = 0;
	for (let j = 0; j <= nz; j++) {
		const z = z0 + (j / nz) * (z1 - z0);
		for (let i = 0; i <= nx; i++) {
			const x = x0 + (i / nx) * (x1 - x0);
			const y = terrainHeight(x, z);
			pos[k] = x;
			pos[k + 1] = y;
			pos[k + 2] = z;
			const n = fbm(x * 0.05, z * 0.05, SEED + 8, 3);
			c.copy(A).lerp(B, n);
			c.lerp(Gc, smoothstep(0.55, 0.8, fbm(x * 0.03 + 9, z * 0.03, SEED + 12, 3)) * 0.6);
			c.lerp(Wc, smoothstep(10, 30, y) * 0.5);
			c.multiplyScalar(0.84 + fbm(x * 0.5, z * 0.5, SEED + 14, 2) * 0.28);
			col[k] = c.r;
			col[k + 1] = c.g;
			col[k + 2] = c.b;
			k += 3;
		}
	}
	const idx: number[] = [];
	for (let j = 0; j < nz; j++) {
		for (let i = 0; i < nx; i++) {
			const a = j * (nx + 1) + i;
			idx.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setAttribute('color', new THREE.BufferAttribute(col, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
};

const chimneyG = new THREE.ConeGeometry(1, 1, 9, 3);
const capG = new THREE.CylinderGeometry(0.62, 1, 1, 9);

export const Cappadocia: React.FC<{count?: number; seed?: number}> = ({count = 62, seed = 5}) => {
	const terrain = useMemo(() => buildTerrain(), []);
	const tMat = useMemo(() => new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, flatShading: true}), []);
	const chimneys = useMemo(() => {
		const body = new THREE.InstancedMesh(chimneyG, new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 1, flatShading: true}), count);
		const caps = new THREE.InstancedMesh(capG, new THREE.MeshStandardMaterial({color: '#6e5546', roughness: 1, flatShading: true}), count);
		const r = rng(seed);
		const d = new THREE.Object3D();
		const c = new THREE.Color();
		for (let i = 0; i < count; i++) {
			const z = -(14 + Math.pow(r(), 0.8) * 230);
			let x = (r() - 0.5) * 300;
			if (z > -60 && Math.abs(x) < 26) x += x < 0 ? -40 : 40; // yüzün önünü açık bırak
			const base = 2 + r() * 5.5;
			const h = base * (1.8 + r() * 2.6);
			const y = terrainHeight(x, z);
			d.position.set(x, y + h / 2 - 0.4, z);
			d.rotation.set((r() - 0.5) * 0.08, r() * 6, (r() - 0.5) * 0.08);
			d.scale.set(base, h, base);
			d.updateMatrix();
			body.setMatrixAt(i, d.matrix);
			c.set(['#d4b48a', '#c9a07c', '#dcc09a', '#c6a58a'][Math.floor(r() * 4)]).multiplyScalar(0.85 + r() * 0.25);
			body.setColorAt(i, c);
			const capH = h * 0.1 + 0.4;
			d.position.set(x, y + h - 0.4 + capH * 0.25, z);
			d.scale.set(base * 0.42, capH, base * 0.42);
			d.updateMatrix();
			caps.setMatrixAt(i, d.matrix);
		}
		body.instanceMatrix.needsUpdate = true;
		if (body.instanceColor) body.instanceColor.needsUpdate = true;
		caps.instanceMatrix.needsUpdate = true;
		body.castShadow = true;
		caps.castShadow = true;
		body.frustumCulled = false;
		caps.frustumCulled = false;
		return [body, caps];
	}, [count, seed]);
	const shrubs = useMemo(() => {
		const n = 90;
		const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({color: '#ffffff', roughness: 1, flatShading: true}), n);
		const r = rng(seed + 100);
		const d = new THREE.Object3D();
		const c = new THREE.Color();
		for (let i = 0; i < n; i++) {
			const x = (r() - 0.5) * 220;
			const z = -(6 + r() * 150);
			const s = 0.6 + r() * 1.3;
			d.position.set(x, terrainHeight(x, z) + s * 0.25, z);
			d.scale.set(s * 1.3, s * 0.7, s * 1.3);
			d.rotation.set(0, r() * 6, 0);
			d.updateMatrix();
			im.setMatrixAt(i, d.matrix);
			c.set(['#6f7a45', '#7f8650', '#8a7a46'][Math.floor(r() * 3)]);
			im.setColorAt(i, c);
		}
		im.instanceMatrix.needsUpdate = true;
		if (im.instanceColor) im.instanceColor.needsUpdate = true;
		im.frustumCulled = false;
		return im;
	}, [seed]);
	const stone = mat({color: '#8f7a64', rough: 1});
	const dark = mat({color: '#06080c', rough: 1});
	const wood = mat({color: '#5b3a26', rough: 0.9});
	return (
		<group>
			<mesh geometry={terrain} material={tMat} receiveShadow />
			{/* yüzün iki yanı: düz kaya duvar (kesit dışı) */}
			<mesh position={[-34 - 70, -48, 0]} material={mat({color: '#8f7860', rough: 1})}>
				<boxGeometry args={[140, 96, 2]} />
			</mesh>
			<mesh position={[34 + 70, -48, 0]} material={mat({color: '#8f7860', rough: 1})}>
				<boxGeometry args={[140, 96, 2]} />
			</mesh>
			{chimneys.map((o, i) => (
				<primitive key={i} object={o} />
			))}
			<primitive object={shrubs} />
			{/* baca ağızları (yüzeyde taş halka + karanlık ağız) */}
			{[-11, 11.2].map((x) => (
				<group key={x} position={[x, 0, -1.25]}>
					<mesh material={stone} position={[0, 0.25, 0]} castShadow>
						<cylinderGeometry args={[0.95, 1.15, 0.5, 8]} />
					</mesh>
					<mesh material={dark} position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
						<circleGeometry args={[0.62, 12]} />
					</mesh>
				</group>
			))}
			{/* kuyu ağzı + basit makara çerçevesi */}
			<group position={[0, 0, -1.1]}>
				<mesh material={stone} position={[0, 0.35, 0]} castShadow>
					<cylinderGeometry args={[1.7, 1.95, 0.7, 10]} />
				</mesh>
				<mesh material={dark} position={[0, 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
					<circleGeometry args={[1.15, 14]} />
				</mesh>
				<mesh material={wood} position={[-1.5, 1.4, 0]}>
					<boxGeometry args={[0.18, 2.2, 0.18]} />
				</mesh>
				<mesh material={wood} position={[1.5, 1.4, 0]}>
					<boxGeometry args={[0.18, 2.2, 0.18]} />
				</mesh>
				<mesh material={wood} position={[0, 2.45, 0]}>
					<boxGeometry args={[3.3, 0.16, 0.16]} />
				</mesh>
			</group>
		</group>
	);
};
