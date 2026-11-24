import {Easing, interpolate} from 'remotion';

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const ease = {
	out: Easing.bezier(0.16, 1, 0.3, 1),
	inOut: Easing.bezier(0.65, 0, 0.35, 1),
	in: Easing.bezier(0.7, 0, 0.84, 0),
	cine: Easing.bezier(0.45, 0, 0.1, 1), // yavaş başlayıp yumuşak oturan sinematik eğri
	back: Easing.bezier(0.34, 1.56, 0.64, 1),
};

// t anındaki değer, [from, to] aralığında 0→1 ilerleme (eğrili)
export const prog = (frame: number, from: number, dur: number, easing = ease.out) =>
	interpolate(frame, [from, from + Math.max(1, dur)], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing,
	});

// Anahtar kare dizisi: [{t, v}] -> değer (her segmentte ayrı eğri)
export type EaseName = 'out' | 'inOut' | 'in' | 'cine' | 'back' | 'linear';
export type Key<T> = {t: number; v: T; e?: ((x: number) => number) | EaseName};

const toEase = (e: Key<number>['e']): ((x: number) => number) => {
	if (typeof e === 'function') return e;
	if (e === 'linear') return (x) => x;
	if (e && e in ease) return ease[e as keyof typeof ease];
	return ease.inOut;
};

export const keyed = (frame: number, keys: Key<number>[]): number => {
	if (keys.length === 0) return 0;
	if (frame <= keys[0].t) return keys[0].v;
	for (let i = 0; i < keys.length - 1; i++) {
		const a = keys[i];
		const b = keys[i + 1];
		if (frame <= b.t) {
			const p = clamp01((frame - a.t) / Math.max(1e-6, b.t - a.t));
			return lerp(a.v, b.v, toEase(b.e)(p));
		}
	}
	return keys[keys.length - 1].v;
};

// Deterministik sözde rastgele
export const hash = (n: number) => {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
	return x - Math.floor(x);
};
