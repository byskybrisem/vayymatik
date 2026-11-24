// 3D motor ortak matematik: deterministik RNG, anahtar kare (sayı / vektör / durum), spline.
import {ease, EaseName, clamp01, lerp} from '../../lib/anim';

export type V3 = [number, number, number];

/** Tohumlu, deterministik rastgele sayı üreteci (mulberry32). Aynı tohum → her makinede aynı sahne. */
export const rng = (seed: number) => {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

export const easeFn = (e?: EaseName | string): ((x: number) => number) => {
	if (!e || e === 'linear') return e === 'linear' ? (x) => x : ease.inOut;
	return (ease as Record<string, (x: number) => number>)[e] ?? ease.inOut;
};

export const smooth = (x: number) => x * x * (3 - 2 * x);

/** 0→1 ilerleme: [from, from+dur] aralığı */
export const p01 = (frame: number, from: number, dur: number, e: EaseName | string = 'inOut') =>
	easeFn(e)(clamp01((frame - from) / Math.max(1, dur)));

export type NumKey = {t: number; v: number; e?: EaseName};
export type VecKey = {t: number; v: V3; e?: EaseName};

/** Sayı veya anahtar kare dizisi kabul eder (JSON'da ikisi de yazılabilir). */
export const num = (frame: number, x: number | NumKey[] | undefined, def = 0): number => {
	if (x === undefined || x === null) return def;
	if (typeof x === 'number') return x;
	if (!x.length) return def;
	if (frame <= x[0].t) return x[0].v;
	for (let i = 0; i < x.length - 1; i++) {
		const a = x[i];
		const b = x[i + 1];
		if (frame <= b.t) return lerp(a.v, b.v, easeFn(b.e)(clamp01((frame - a.t) / Math.max(1e-6, b.t - a.t))));
	}
	return x[x.length - 1].v;
};

export const vec = (frame: number, x: V3 | VecKey[] | undefined, def: V3 = [0, 0, 0]): V3 => {
	if (!x) return def;
	if (typeof x[0] === 'number') return x as V3;
	const k = x as VecKey[];
	if (frame <= k[0].t) return k[0].v;
	for (let i = 0; i < k.length - 1; i++) {
		const a = k[i];
		const b = k[i + 1];
		if (frame <= b.t) {
			const p = easeFn(b.e)(clamp01((frame - a.t) / Math.max(1e-6, b.t - a.t)));
			return [lerp(a.v[0], b.v[0], p), lerp(a.v[1], b.v[1], p), lerp(a.v[2], b.v[2], p)];
		}
	}
	return k[k.length - 1].v;
};

/** Ad verilmiş durumlar arasında harmanlama ağırlıkları: [{t, v:'smile'}] → {smile: 0.7, neutral: 0.3} */
export type StateKey = {t: number; v: string; dur?: number; e?: EaseName};
export const stateWeights = (frame: number, keys: StateKey[] | string | undefined, def: string, blend = 8): Record<string, number> => {
	if (!keys) return {[def]: 1};
	if (typeof keys === 'string') return {[keys]: 1};
	let w: Record<string, number> = {[keys[0]?.v ?? def]: 1};
	for (let i = 1; i < keys.length; i++) {
		const k = keys[i];
		if (frame < k.t) break;
		const p = easeFn(k.e ?? 'inOut')(clamp01((frame - k.t) / Math.max(1, k.dur ?? blend)));
		const nw: Record<string, number> = {};
		for (const [n, x] of Object.entries(w)) nw[n] = x * (1 - p);
		nw[k.v] = (nw[k.v] ?? 0) + p;
		w = nw;
	}
	return w;
};

/** Merkezcil Catmull-Rom (kamera yolları için akıcı, aşırı salınımsız) */
export const catmull = (p0: V3, p1: V3, p2: V3, p3: V3, t: number): V3 => {
	const t2 = t * t;
	const t3 = t2 * t;
	const o: V3 = [0, 0, 0];
	for (let i = 0; i < 3; i++) {
		o[i] = 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3);
	}
	return o;
};

export const hexToRgb = (hex: string): V3 => {
	const n = parseInt(hex.replace('#', ''), 16);
	return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
