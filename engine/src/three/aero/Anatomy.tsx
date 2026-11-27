// Yarı saydam anatomik model (oturan pilot): kaskı ve vücut hatları hayalet kabuk, içinde iskelet (kafatası, omurga, kaburgalar, pelvis, uzuvlar).
// Omurga basıncı: `load` (0–1) ve `wave` (0 pelvis → 1 boyun, ivme dalgası) ile omurlar kemik rengi → turuncu → kırmızıya geçer.
// Kan / yaralanma görüntüsü YOK; yalnızca olası baskı bölgelerinin renkli vurgusu. Yerel eksenler Pilot ile aynı (pelvis orijin, yüz +Z).
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {num, NumKey} from '../core/math';
import {glowTexture} from '../core/textures';
import {pbr} from './common';

type K = number | NumKey[];
export type AnatomyProps = {
	load?: K;
	wave?: K;
	/** iskelet görünürlüğü 0–1 */
	bones?: K;
	/** hayalet gövde kabuğu opaklığı */
	shell?: K;
	/** boyun/baş vurgusu 0–1 (rüzgâr riski sahnesi) */
	neck?: K;
	/** eklem/uzuv vurgusu 0–1 */
	limbs?: K;
};

const BONE = new THREE.Color('#ece6d6');
const ORANGE = new THREE.Color('#ff8a1f');
const RED = new THREE.Color('#ff2a14');

const spineAt = (u: number): [number, number] => {
	// u: 0 (sakrum) → 1 (kafatası tabanı). [y, z] — lordoz/kifoz/lordoz eğrileri
	const y = 0.06 + u * 0.68;
	let z = 0;
	if (u < 0.3) z = 0.03 * Math.sin((Math.PI * u) / 0.3);
	else if (u < 0.75) z = -0.05 * Math.sin((Math.PI * (u - 0.3)) / 0.45);
	else z = 0.028 * Math.sin((Math.PI * (u - 0.75)) / 0.25);
	return [y, z - 0.06];
};

const G = {
	vertL: new THREE.CylinderGeometry(0.04, 0.045, 0.034, 14),
	vertT: new THREE.CylinderGeometry(0.03, 0.034, 0.028, 12),
	vertC: new THREE.CylinderGeometry(0.02, 0.023, 0.02, 10),
	spin: new THREE.BoxGeometry(0.014, 0.022, 0.05),
	disc: new THREE.CylinderGeometry(0.035, 0.035, 0.012, 12),
	skull: new THREE.SphereGeometry(0.095, 20, 14),
	jaw: new THREE.SphereGeometry(0.06, 14, 10),
	sternum: new THREE.BoxGeometry(0.035, 0.2, 0.012),
	pelvis: new THREE.SphereGeometry(0.1, 16, 12),
	bone: new THREE.CylinderGeometry(0.018, 0.022, 1, 10),
	joint: new THREE.SphereGeometry(0.03, 12, 8),
	clav: new THREE.CylinderGeometry(0.009, 0.009, 0.2, 8),
	scap: new THREE.SphereGeometry(0.06, 12, 8),
	capsule: new THREE.CapsuleGeometry(0.17, 0.32, 8, 18),
	head: new THREE.SphereGeometry(0.155, 22, 16),
	limb: new THREE.CapsuleGeometry(0.06, 1, 6, 14),
};
G.pelvis.scale(1.3, 0.75, 0.9);
G.scap.scale(1, 1.2, 0.3);
G.skull.scale(0.95, 1.05, 1.15);
G.jaw.scale(1.05, 0.55, 0.9);
G.capsule.scale(1.1, 1, 0.78);

const ribGeo = (R: number) => {
	const g = new THREE.TorusGeometry(R, 0.0075, 5, 26, 4.5);
	g.rotateZ(Math.PI / 2 - 2.25);
	g.rotateX(Math.PI / 2);
	return g;
};
const RIBS = Array.from({length: 11}, (_, i) => {
	const u = 0.62 - i * 0.034;
	const R = 0.11 + Math.sin((i / 10) * Math.PI * 0.85 + 0.2) * 0.07;
	return {u, R, g: ribGeo(R)};
});

const lerpC = (heat: number) => {
	const c = BONE.clone();
	if (heat < 0.5) c.lerp(ORANGE, heat / 0.5);
	else c.copy(ORANGE).lerp(RED, (heat - 0.5) / 0.5);
	return c;
};

const Limb: React.FC<{a: [number, number, number]; b: [number, number, number]; mat: THREE.Material; w?: number}> = ({a, b, mat, w = 1}) => {
	const A = new THREE.Vector3(...a);
	const B = new THREE.Vector3(...b);
	const mid = A.clone().add(B).multiplyScalar(0.5);
	const len = A.distanceTo(B);
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
	return <mesh geometry={G.bone} material={mat} position={mid} quaternion={q} scale={[w, len, w]} />;
};

export const Anatomy: React.FC<AnatomyProps> = ({load = 0, wave = 0, bones = 1, shell = 0.16, neck = 0, limbs = 0}) => {
	const frame = useCurrentFrame();
	const ld = num(frame, load, 0);
	const wv = num(frame, wave, 0);
	const bn = num(frame, bones, 1);
	const sh = num(frame, shell, 0.16);
	const nk = num(frame, neck, 0);
	const lm = num(frame, limbs, 0);

	const mats = useMemo(() => {
		const verts = Array.from({length: 24}, () => new THREE.MeshStandardMaterial({color: BONE, roughness: 0.45, metalness: 0.05, transparent: true}));
		return {
			verts,
			bone: new THREE.MeshStandardMaterial({color: BONE, roughness: 0.5, metalness: 0.05, transparent: true}),
			disc: new THREE.MeshStandardMaterial({color: '#7fb4d8', roughness: 0.4, transparent: true, opacity: 0.55}),
			shell: new THREE.MeshStandardMaterial({color: '#6cc8ff', roughness: 0.2, metalness: 0.1, emissive: '#1c86c9', emissiveIntensity: 0.9, transparent: true, depthWrite: false}),
			rim: new THREE.MeshBasicMaterial({color: '#5fd0ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, toneMapped: false}),
			glow: new THREE.SpriteMaterial({map: glowTexture(), color: '#ff5a1a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false}),
			skull: new THREE.MeshStandardMaterial({color: BONE, roughness: 0.45, transparent: true}),
		};
	}, []);

	// kemik malzemesi opaklığı
	mats.bone.opacity = bn;
	mats.skull.opacity = bn;
	mats.disc.opacity = 0.5 * bn;
	mats.shell.opacity = sh;
	mats.rim.opacity = sh * 0.9;

	// boyun / uzuv vurgusu (sarı-turuncu)
	const neckC = BONE.clone().lerp(new THREE.Color('#ffb02e'), Math.min(1, nk));
	const limbC = BONE.clone().lerp(new THREE.Color('#ffb02e'), Math.min(1, lm));

	// omurlar
	const verts: {u: number; y: number; z: number; kind: 'L' | 'T' | 'C'; heat: number}[] = [];
	for (let i = 0; i < 24; i++) {
		const kind = i < 5 ? 'L' : i < 17 ? 'T' : 'C';
		const u = i < 5 ? 0.02 + (i / 4) * 0.26 : i < 17 ? 0.3 + ((i - 5) / 11) * 0.42 : 0.75 + ((i - 17) / 6) * 0.25;
		const [y, z] = spineAt(u);
		// bölgesel ağırlık: bel + alt/orta sırt en çok baskı; ivme dalgası alttan üste
		const zone = u < 0.55 ? 1 : 0.55;
		const wvv = Math.exp(-(((u - wv) / 0.2) ** 2));
		const pulse = 0.88 + 0.12 * Math.sin(frame * 0.55 - u * 6);
		const heat = Math.min(1, ld * (0.3 + 0.7 * wvv) * zone * pulse * 1.15);
		verts.push({u, y, z, kind, heat});
	}
	const comp = 1 - ld * 0.05;

	return (
		<group>
			{/* hayalet gövde: gövde, baş, kollar, bacaklar */}
			<group>
				<mesh geometry={G.capsule} material={mats.shell} position={[0, 0.36, -0.02]} />
				<mesh geometry={G.head} material={mats.shell} position={[0, 0.8, 0.03]} scale={[0.95, 1.04, 1.12]} />
				<mesh geometry={G.capsule} material={mats.rim} position={[0, 0.36, -0.02]} scale={[1.04, 1.02, 1.04]} />
				<mesh geometry={G.head} material={mats.rim} position={[0, 0.8, 0.03]} scale={[1.0, 1.08, 1.17]} />
				{([1, -1] as const).map((s) => (
					<group key={s}>
						<mesh geometry={G.limb} material={mats.shell} position={[0.3 * s, 0.4, 0.13]} rotation={[-0.4, 0, -0.15 * s]} scale={[0.9, 0.5, 0.9]} />
						<mesh geometry={G.limb} material={mats.shell} position={[0.1 * s, -0.02, 0.28]} rotation={[Math.PI / 2, 0, 0]} scale={[1.3, 0.45, 1.3]} />
						<mesh geometry={G.limb} material={mats.shell} position={[0.1 * s, -0.4, 0.5]} rotation={[0, 0, 0]} scale={[1.0, 0.5, 1.0]} />
					</group>
				))}
			</group>
			{/* omurga */}
			{verts.map((v, i) => {
				const m = mats.verts[i];
				m.color.copy(lerpC(v.heat));
				m.emissive.copy(lerpC(v.heat).lerp(new THREE.Color('#000'), 0.0));
				m.emissiveIntensity = v.heat * 1.4;
				m.opacity = Math.max(bn, v.heat > 0.05 ? bn : 0);
				const geo = v.kind === 'L' ? G.vertL : v.kind === 'T' ? G.vertT : G.vertC;
				const y = v.y * comp;
				return (
					<group key={i} position={[0, y, v.z]} rotation={[-0.06 - (v.u - 0.5) * 0.1, 0, 0]}>
						<mesh geometry={geo} material={m} />
						<mesh geometry={G.spin} material={m} position={[0, 0, -(v.kind === 'L' ? 0.05 : v.kind === 'T' ? 0.04 : 0.03)]} scale={v.kind === 'C' ? 0.6 : 1} />
						<mesh geometry={G.disc} material={mats.disc} position={[0, 0.02, 0]} scale={v.kind === 'C' ? 0.55 : v.kind === 'T' ? 0.8 : 1} />
					</group>
				);
			})}
			{/* baskı parıltıları (belde ve sırtta) */}
			{verts
				.filter((v, i) => i % 3 === 1 && v.heat > 0.35)
				.map((v, i) => (
					<sprite key={i} material={mats.glow} position={[0, v.y * comp, v.z - 0.02]} scale={[0.22 + v.heat * 0.22, 0.2 + v.heat * 0.18, 1]} />
				))}
			{/* kafatası + çene */}
			<group position={[0, 0.83, 0.03]}>
				<mesh geometry={G.skull} material={mats.skull} />
				<mesh geometry={G.jaw} material={mats.skull} position={[0, -0.075, 0.045]} />
			</group>
			{/* boyun vurgusu halkası */}
			{nk > 0.02 ? (
				<mesh position={[0, 0.74, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
					<torusGeometry args={[0.06 + nk * 0.03, 0.006, 6, 30]} />
					<meshBasicMaterial color={neckC} transparent opacity={0.9} blending={THREE.AdditiveBlending} toneMapped={false} />
				</mesh>
			) : null}
			{/* kaburgalar + sternum */}
			{RIBS.map((r, i) => {
				const [y, z] = spineAt(r.u);
				return <mesh key={i} geometry={r.g} material={mats.bone} position={[0, y + 0.02, z + r.R * 0.62]} scale={[1, 1, 0.82]} />;
			})}
			<mesh geometry={G.sternum} material={mats.bone} position={[0, 0.45, 0.17]} rotation={[-0.08, 0, 0]} />
			{/* köprücük + kürek */}
			{([1, -1] as const).map((s) => (
				<group key={s}>
					<mesh geometry={G.clav} material={mats.bone} position={[0.1 * s, 0.6, 0.06]} rotation={[0, 0.3 * s, -Math.PI / 2 + 0.12 * s]} />
					<mesh geometry={G.scap} material={mats.bone} position={[0.12 * s, 0.5, -0.12]} />
				</group>
			))}
			{/* pelvis + sakrum */}
			<mesh geometry={G.pelvis} material={mats.bone} position={[0, 0.0, -0.01]} />
			{/* kollar: omuz → dirsek → bilek (otururken diz üstü) */}
			{([1, -1] as const).map((s) => {
				const sx = 0.215 * s;
				return (
					<group key={s}>
						<mesh geometry={G.joint} material={mats.bone} position={[sx, 0.55, 0.0]} />
						<Limb a={[sx, 0.55, 0.0]} b={[sx + 0.03 * s, 0.34, 0.14]} mat={mats.bone} w={0.9} />
						<mesh geometry={G.joint} material={mats.bone} position={[sx + 0.03 * s, 0.34, 0.14]} scale={0.8} />
						<Limb a={[sx + 0.03 * s, 0.34, 0.14]} b={[sx * 0.7, 0.12, 0.34]} mat={mats.bone} w={0.75} />
						{/* bacaklar */}
						<mesh geometry={G.joint} material={mats.bone} position={[0.1 * s, -0.01, 0.02]} />
						<Limb a={[0.1 * s, -0.01, 0.02]} b={[0.1 * s, -0.03, 0.46]} mat={mats.bone} w={1.2} />
						<mesh geometry={G.joint} material={mats.bone} position={[0.1 * s, -0.03, 0.46]} scale={0.95} />
						<Limb a={[0.1 * s, -0.03, 0.46]} b={[0.1 * s, -0.44, 0.5]} mat={mats.bone} w={1.0} />
					</group>
				);
			})}
			{lm > 0.02 ? (
				<>
					{([1, -1] as const).map((s) => (
						<mesh key={s} position={[0.1 * s, -0.03, 0.46]}>
							<sphereGeometry args={[0.055 + lm * 0.02, 14, 10]} />
							<meshBasicMaterial color={limbC} transparent opacity={0.45 * lm} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
						</mesh>
					))}
				</>
			) : null}
		</group>
	);
};
