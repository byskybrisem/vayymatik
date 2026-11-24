// Animasyonlu 3D finansal grafik: sırayla yükselen çubuklar + tepe noktalarını izleyen parlak trend oku.
// values: göreli yükseklikler; grow: 0→1 anahtar kareleri (ya da from/dur).
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {clamp01} from '../../lib/anim';
import {easeFn, num, NumKey} from '../core/math';
import {GOLD, mat, PALETTE} from '../core/materials';

export type ChartSpec = {
	values?: number[];
	grow?: number | NumKey[];
	barW?: number;
	gap?: number;
	height?: number;
	color?: string;
	accent?: string;
	arrow?: boolean;
	/** son çubuk altın */
	goldLast?: boolean;
};

export const GrowthChart3D: React.FC<ChartSpec> = ({values = [0.18, 0.3, 0.26, 0.45, 0.62, 0.8, 1], grow = 1, barW = 0.32, gap = 0.16, height = 2.4, color = '#2c3b5c', accent = PALETTE.red, arrow = true, goldLast = true}) => {
	const frame = useCurrentFrame();
	const g = num(frame, grow, 1);
	const n = values.length;
	const step = barW + gap;
	const x0 = -((n - 1) * step) / 2;
	const barM = mat({color, rough: 0.35, metal: 0.5});
	const capM = mat({color: accent, emissive: accent, emissiveIntensity: 0.8, rough: 0.4});
	const baseM = mat({color: '#141821', rough: 0.4, metal: 0.6});
	const tubeM = useMemo(() => new THREE.MeshBasicMaterial({color: new THREE.Color('#ffd36b').multiplyScalar(2.2), toneMapped: false}), []);
	const heights = values.map((v, i) => {
		const k = easeFn('out')(clamp01(g * (n + 2) / n - i * (1.6 / n)));
		return Math.max(0.001, v * height * k);
	});
	// trend eğrisi (tepe noktaları üzerinden), ilerlemeye göre kırpılır
	const tube = useMemo(() => {
		const pts = values.map((v, i) => new THREE.Vector3(x0 + i * step, v * height + 0.28, 0.25));
		return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
	}, [values, height, x0, step]);
	const prog = clamp01(g * 1.05 - 0.05);
	const tubeGeo = useMemo(() => {
		const segs = 64;
		const len = Math.max(2, Math.round(segs * prog));
		const pts = Array.from({length: len + 1}, (_, i) => tube.getPoint((i / len) * Math.max(0.001, prog)));
		return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), len * 2, 0.035, 6, false);
	}, [tube, prog]);
	const tip = tube.getPoint(Math.max(0.001, prog));
	const tan = tube.getTangent(Math.max(0.001, Math.min(0.999, prog)));
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
	return (
		<group>
			<mesh material={baseM} position={[0, 0.03, 0]} receiveShadow castShadow>
				<boxGeometry args={[n * step + 0.3, 0.06, 0.9]} />
			</mesh>
			{heights.map((h, i) => {
				const last = goldLast && i === n - 1;
				return (
					<group key={i} position={[x0 + i * step, 0.06, 0]}>
						<mesh material={last ? GOLD() : barM} position={[0, h / 2, 0]} castShadow receiveShadow>
							<boxGeometry args={[barW, h, barW]} />
						</mesh>
						<mesh material={last ? GOLD() : capM} position={[0, h + 0.015, 0]}>
							<boxGeometry args={[barW + 0.02, 0.03, barW + 0.02]} />
						</mesh>
					</group>
				);
			})}
			{arrow && prog > 0.02 ? (
				<>
					<mesh geometry={tubeGeo} material={tubeM} />
					<mesh material={tubeM} position={tip} quaternion={q}>
						<coneGeometry args={[0.11, 0.26, 4]} />
					</mesh>
				</>
			) : null}
		</group>
	);
};
