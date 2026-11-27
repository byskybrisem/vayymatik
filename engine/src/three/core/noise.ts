// Deterministik değer gürültüsü (tohumlu) — kaya dokusu, arazi ve renk bantları için. Rastgelelik yalnızca burada/rng'de.
const hash2 = (x: number, y: number, seed: number) => {
	let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647)) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	h ^= h >>> 16;
	return (h >>> 0) / 4294967296;
};

const sm = (t: number) => t * t * (3 - 2 * t);

export const vnoise = (x: number, y: number, seed = 1): number => {
	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	const fx = sm(x - x0);
	const fy = sm(y - y0);
	const a = hash2(x0, y0, seed);
	const b = hash2(x0 + 1, y0, seed);
	const c = hash2(x0, y0 + 1, seed);
	const d = hash2(x0 + 1, y0 + 1, seed);
	return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};

/** 0–1 aralığında fraktal gürültü */
export const fbm = (x: number, y: number, seed = 1, oct = 4): number => {
	let s = 0;
	let amp = 0.5;
	let f = 1;
	let tot = 0;
	for (let i = 0; i < oct; i++) {
		s += vnoise(x * f, y * f, seed + i * 17) * amp;
		tot += amp;
		amp *= 0.5;
		f *= 2.03;
	}
	return s / tot;
};

export const smoothstep = (a: number, b: number, x: number) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1e-6)));
	return t * t * (3 - 2 * t);
};
