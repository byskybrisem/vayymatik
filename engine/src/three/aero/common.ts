// Havacılık nesneleri için ortak yardımcılar: PBR malzeme (yumuşak gölgeli), boya dokusu, loft geometri.
import * as THREE from 'three';
import {rng} from '../core/math';

type PbrOpts = {rough?: number; metal?: number; emissive?: string; ei?: number; map?: THREE.Texture | null; transparent?: boolean; opacity?: number; side?: THREE.Side; env?: number};

const cache = new Map<string, THREE.MeshStandardMaterial>();
/** Düzgün gölgelendirmeli (flatShading kapalı) PBR malzeme, önbellekli. */
export const pbr = (color: string, o: PbrOpts = {}) => {
	const key = color + JSON.stringify({...o, map: o.map ? o.map.uuid : null});
	let m = cache.get(key);
	if (!m) {
		m = new THREE.MeshStandardMaterial({
			color,
			roughness: o.rough ?? 0.5,
			metalness: o.metal ?? 0,
			emissive: o.emissive ?? '#000000',
			emissiveIntensity: o.ei ?? 1,
			map: o.map ?? null,
			transparent: o.transparent ?? false,
			opacity: o.opacity ?? 1,
			side: o.side ?? THREE.FrontSide,
			envMapIntensity: o.env ?? 1,
		});
		cache.set(key, m);
	}
	return m;
};

const texMemo = new Map<string, THREE.Texture>();
const canvas = (w: number, h: number) => {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	return [c, c.getContext('2d') as CanvasRenderingContext2D] as const;
};

/** Uçak boyası: gri taban + ton lekeleri + panel çizgileri + perçin dizileri. Tekrarlanabilir. */
export const paintTexture = (base = '#8a939b', seed = 3) => {
	const key = 'paint' + base + seed;
	let t = texMemo.get(key);
	if (t) return t;
	const [c, g] = canvas(512, 512);
	const r = rng(seed);
	g.fillStyle = base;
	g.fillRect(0, 0, 512, 512);
	for (let i = 0; i < 70; i++) {
		const a = r() * 0.1;
		g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.8})`;
		g.beginPath();
		g.ellipse(r() * 512, r() * 512, 20 + r() * 90, 10 + r() * 50, r() * 3, 0, Math.PI * 2);
		g.fill();
	}
	// panel çizgileri
	g.strokeStyle = 'rgba(20,24,30,0.55)';
	g.lineWidth = 2;
	g.strokeRect(1, 1, 510, 510);
	g.beginPath();
	g.moveTo(0, 256);
	g.lineTo(512, 256);
	g.moveTo(300, 0);
	g.lineTo(300, 256);
	g.moveTo(130, 256);
	g.lineTo(130, 512);
	g.stroke();
	// perçinler
	g.fillStyle = 'rgba(15,18,24,0.5)';
	for (let x = 12; x < 512; x += 22) {
		g.fillRect(x, 8, 2.5, 2.5);
		g.fillRect(x, 252, 2.5, 2.5);
		g.fillRect(x, 502, 2.5, 2.5);
	}
	// ince kir / egzoz izleri
	for (let i = 0; i < 18; i++) {
		g.strokeStyle = `rgba(30,28,26,${0.04 + r() * 0.07})`;
		g.lineWidth = 3 + r() * 6;
		g.beginPath();
		const y = r() * 512;
		g.moveTo(0, y);
		g.lineTo(512, y + (r() - 0.5) * 40);
		g.stroke();
	}
	t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.anisotropy = 8;
	texMemo.set(key, t);
	return t;
};

export const tiled = (t: THREE.Texture, rx: number, ry: number) => {
	const k = `${t.uuid}-${rx}-${ry}`;
	let c = texMemo.get(k);
	if (!c) {
		c = t.clone();
		c.repeat.set(rx, ry);
		c.needsUpdate = true;
		texMemo.set(k, c);
	}
	return c;
};

/** Yumuşak bulut kabarcığı dokusu (alfa): tepesi aydınlık, altı gölgeli */
export const cloudPuffTexture = (variant: number) => {
	const key = 'puff' + variant;
	let t = texMemo.get(key);
	if (t) return t;
	const [c, g] = canvas(256, 256);
	const r = rng(900 + variant * 17);
	for (let i = 0; i < 46; i++) {
		const ang = r() * Math.PI * 2;
		const d = Math.pow(r(), 0.7);
		const x = 128 + Math.cos(ang) * d * 78;
		const y = 138 + Math.sin(ang) * d * 40 - (1 - d) * 8;
		const rad = 24 + r() * 34 * (1 - d * 0.45);
		const shade = Math.min(1, Math.max(0, (y - 70) / 120));
		const R = Math.round(255 - shade * 62);
		const G = Math.round(255 - shade * 52);
		const B = Math.round(255 - shade * 30);
		const grd = g.createRadialGradient(x, y, 0, x, y, rad);
		grd.addColorStop(0, `rgba(${R},${G},${B},0.62)`);
		grd.addColorStop(0.55, `rgba(${R},${G},${B},0.3)`);
		grd.addColorStop(1, `rgba(${R},${G},${B},0)`);
		g.fillStyle = grd;
		g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
	}
	t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	texMemo.set(key, t);
	return t;
};

/** Kesit (cross-section) halkalarından yumuşak gövde: her istasyon {z, w, ht, hb, yc}; süper-elips kesit. */
export type Station = {z: number; w: number; ht: number; hb: number; yc?: number; n?: number};

const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
	0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);

export const loft = (st: Station[], rings = 56, seg = 30): THREE.BufferGeometry => {
	const pos: number[] = [];
	const uv: number[] = [];
	const idx: number[] = [];
	const zmin = st[0].z;
	const zmax = st[st.length - 1].z;
	const at = (k: keyof Station, z: number) => {
		let i = 0;
		while (i < st.length - 2 && z > st[i + 1].z) i++;
		const a = st[i];
		const b = st[i + 1];
		const p0 = st[Math.max(0, i - 1)];
		const p3 = st[Math.min(st.length - 1, i + 2)];
		const u = Math.min(1, Math.max(0, (z - a.z) / (b.z - a.z)));
		const g = (s: Station) => (s[k] as number | undefined) ?? 0;
		return cr(g(p0), g(a), g(b), g(p3), u);
	};
	for (let i = 0; i <= rings; i++) {
		const z = zmin + ((zmax - zmin) * i) / rings;
		const w = Math.max(0.001, at('w', z));
		const ht = Math.max(0.001, at('ht', z));
		const hb = Math.max(0.001, at('hb', z));
		const yc = at('yc', z);
		const n = 2.6;
		for (let j = 0; j <= seg; j++) {
			const a = (j / seg) * Math.PI * 2;
			const cs = Math.cos(a);
			const sn = Math.sin(a);
			const x = w * Math.sign(cs) * Math.pow(Math.abs(cs), 2 / n);
			const y = yc + (sn >= 0 ? ht : hb) * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
			pos.push(x, y, z);
			uv.push(j / seg, z * 0.12);
		}
	}
	for (let i = 0; i < rings; i++) {
		for (let j = 0; j < seg; j++) {
			const a = i * (seg + 1) + j;
			const b = a + seg + 1;
			idx.push(a, a + 1, b, a + 1, b + 1, b);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
};

/** 2B çokgenden (x,z düzleminde) ince kanat/kuyruk paneli: yukarı = +y, kalınlık t, yuvarlatılmış kenar */
export const panel = (pts: [number, number][], t: number, tex = true) => {
	const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
	const g = new THREE.ExtrudeGeometry(s, {depth: t, bevelEnabled: true, bevelThickness: t * 0.35, bevelSize: t * 0.35, bevelSegments: 2, curveSegments: 4});
	g.rotateX(Math.PI / 2); // şekil y → z; kalınlık z → -y
	g.translate(0, t * 0.5, 0);
	if (!tex) return g;
	return g;
};

/** Dikey panel (XY düzleminde çokgen, kalınlık z'de ortalı): dikey kuyruk için */
export const vpanel = (pts: [number, number][], t: number) => {
	const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
	const g = new THREE.ExtrudeGeometry(s, {depth: t, bevelEnabled: true, bevelThickness: t * 0.35, bevelSize: t * 0.35, bevelSegments: 2, curveSegments: 4});
	g.translate(0, 0, -t / 2);
	return g;
};
