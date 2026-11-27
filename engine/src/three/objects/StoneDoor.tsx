// Yuvarlak taş kapı (Derinkuyu tipi): ortası delikli, kenarı yontulmuş disk. z ekseninde yuvarlanır; dönüş açısı = yol / yarıçap
// (kayma yok → fiziksel olarak tutarlı). z: anahtar kareli konum (nişten geçide). Çarpma sonrası hafif geri tepme JSON anahtarlarıyla verilir.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useCurrentFrame} from 'remotion';
import {NumKey, num} from '../core/math';
import {fbm} from '../core/noise';

const buildDisc = (R: number, thick: number) => {
	const shape = new THREE.Shape();
	shape.absarc(0, 0, R, 0, Math.PI * 2, false);
	const hole = new THREE.Path();
	hole.absarc(0, 0, R * 0.13, 0, Math.PI * 2, true);
	shape.holes.push(hole);
	const g = new THREE.ExtrudeGeometry(shape, {depth: thick, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 30});
	g.translate(0, 0, -thick / 2);
	g.rotateY(Math.PI / 2); // çıkıntı ekseni x'e
	const p = g.getAttribute('position');
	const cols = new Float32Array(p.count * 3);
	const c = new THREE.Color();
	for (let i = 0; i < p.count; i++) {
		const y = p.getY(i);
		const z = p.getZ(i);
		const r = Math.hypot(y, z);
		const n = fbm(y * 3.3, z * 3.3, 91, 3);
		c.set('#b8a78f').multiplyScalar(0.7 + n * 0.55);
		if (r > R * 0.95) c.multiplyScalar(0.8);
		cols[i * 3] = c.r;
		cols[i * 3 + 1] = c.g;
		cols[i * 3 + 2] = c.b;
		// kenar pürüzü
		if (r > R * 0.9) {
			const k = 1 + (fbm(Math.atan2(z, y) * 3, 4, 17, 2) - 0.5) * 0.05;
			p.setY(i, y * k);
			p.setZ(i, z * k);
		}
	}
	g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
	g.computeVertexNormals();
	return g;
};

export const StoneDoor: React.FC<{r?: number; thick?: number; x?: number; y?: number; z?: number | NumKey[]}> = ({r = 0.88, thick = 0.5, x = 0, y, z = 0}) => {
	const frame = useCurrentFrame();
	const geo = useMemo(() => buildDisc(r, thick), [r, thick]);
	const m = useMemo(() => new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.95, flatShading: true}), []);
	const ring = useMemo(() => new THREE.TorusGeometry(r * 0.7, 0.025, 5, 40), [r]);
	const rm = useMemo(() => new THREE.MeshStandardMaterial({color: '#6d5d4c', roughness: 1, flatShading: true}), []);
	const zz = num(frame, z as number | NumKey[], 0);
	const ang = zz / r; // yuvarlanma: açı = yol / yarıçap
	return (
		<group position={[x, y ?? r + 0.02, zz]} rotation={[ang, 0, 0]}>
			<mesh geometry={geo} material={m} castShadow receiveShadow />
			{[-1, 1].map((s) => (
				<mesh key={s} geometry={ring} material={rm} position={[s * (thick / 2 + 0.03), 0, 0]} rotation={[0, Math.PI / 2, 0]} />
			))}
		</group>
	);
};
