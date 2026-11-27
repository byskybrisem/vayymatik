// Derinkuyu AÇIKLAYICI kesit düzeni: kat planı DEĞİLDİR (doğrulanmış ölçü yok). Yalnızca anlatıyı görselleştiren temsili yerleşim.
// Koordinatlar metre: x yatay, y düşey (yüzey = 0, aşağısı negatif), yüz z = 0; oyuklar z < 0 yönünde derinleşir.
export type Room = {id: string; x0: number; x1: number; y0: number; y1: number; d: number};
export type Seg = {id: string; a: [number, number]; b: [number, number]; w: number; d: number};

export const FACE = {x0: -34, x1: 34, y0: -96, y1: 0.0};

export const ROOMS: Room[] = [
	// 1. seviye
	{id: 'kitchen', x0: -16.5, x1: -5.5, y0: -13, y1: -7.2, d: 5.6},
	{id: 'pantry', x0: 4.5, x1: 16, y0: -13, y1: -7.4, d: 5.6},
	{id: 'pass1', x0: -5.6, x1: 4.6, y0: -13, y1: -10.7, d: 3.2},
	// 2. seviye
	{id: 'stable', x0: -17, x1: -4.5, y0: -27, y1: -21, d: 6.2},
	{id: 'livingA', x0: 4, x1: 10, y0: -27, y1: -21.2, d: 5.6},
	{id: 'livingB', x0: 10.7, x1: 16.8, y0: -27, y1: -21.4, d: 5.6},
	{id: 'pass2', x0: -4.6, x1: 4.1, y0: -27, y1: -24.8, d: 3.2},
	// 3. seviye
	{id: 'store2', x0: -16, x1: -6, y0: -43, y1: -37, d: 5.6},
	{id: 'hall', x0: 5, x1: 16.5, y0: -43, y1: -36.8, d: 6},
	{id: 'pass3', x0: -6.1, x1: 5.1, y0: -43, y1: -40.7, d: 3.2},
	// 4. seviye: dar geçit (taş kapı seviyesi)
	{id: 'corridor', x0: -17, x1: 17, y0: -59, y1: -55.4, d: 3.4},
	// 5. seviye
	{id: 'rooms5a', x0: -15, x1: -4, y0: -73, y1: -67.6, d: 5.4},
	{id: 'rooms5b', x0: 4, x1: 15, y0: -73, y1: -67.6, d: 5.4},
	{id: 'pass5', x0: -4.1, x1: 4.1, y0: -73, y1: -70.6, d: 3.2},
];

export const SEGS: Seg[] = [
	// merdiven tünelleri (eğik)
	{id: 'stA', a: [-5.2, -12.3], b: [-8.6, -24.2], w: 1.7, d: 2.8},
	{id: 'stB', a: [6, -12.3], b: [11, -24.2], w: 1.7, d: 2.8},
	{id: 'stC', a: [-5, -26.3], b: [-9.5, -40], w: 1.7, d: 2.8},
	{id: 'stD', a: [5.5, -26.3], b: [9.5, -39.5], w: 1.7, d: 2.8},
	{id: 'stE', a: [-4, -42.3], b: [-6.4, -57.4], w: 1.7, d: 2.8},
	{id: 'stF', a: [6, -42.3], b: [8.2, -57.4], w: 1.7, d: 2.8},
	{id: 'stG', a: [-3, -58.3], b: [-8, -70.3], w: 1.7, d: 2.8},
	{id: 'stH', a: [12, -58.3], b: [9.5, -69.8], w: 1.7, d: 2.8},
	// kuyu (yüzeyden dibe) — su kuyusu
	{id: 'well', a: [0, 1.5], b: [0, -84.5], w: 2.8, d: 4.2},
	// havalandırma bacaları (yüzeye uzanır)
	{id: 'ventA', a: [-11, 1.5], b: [-11, -7.4], w: 1.25, d: 2.5},
	{id: 'ventB', a: [11.2, 1.5], b: [11.2, -7.6], w: 1.25, d: 2.5},
	{id: 'ventC', a: [-14.4, -21.2], b: [-14.4, -13.2], w: 1.1, d: 2.3},
	{id: 'ventD', a: [13.6, -21.4], b: [13.6, -13.2], w: 1.1, d: 2.3},
];

export type Torch = {p: [number, number, number]; size?: number};
export const TORCHES: Torch[] = [
	{p: [-13.4, -11.6, -3.6], size: 1.6}, // ocak
	{p: [-7.2, -9.6, -3.2]},
	{p: [6.2, -9.6, -3.2]},
	{p: [14.3, -9.6, -3.2]},
	{p: [-15.6, -23.4, -4]},
	{p: [-5.4, -23.4, -4]},
	{p: [5.2, -23.2, -3.5]},
	{p: [9.3, -23.2, -3.5], size: 1.2},
	{p: [15.8, -23.2, -3.5]},
	{p: [-14, -39.2, -3.4]},
	{p: [-7.2, -39.2, -3.4]},
	{p: [7, -38.8, -3.6]},
	{p: [15, -38.8, -3.6]},
	{p: [-10, -56.8, -2.2]},
	{p: [-3, -56.8, -2.2]},
	{p: [5, -56.8, -2.2]},
	{p: [12, -56.8, -2.2]},
	{p: [-13, -69.8, -3.2]},
	{p: [-6, -69.8, -3.2]},
	{p: [6, -69.8, -3.2]},
	{p: [13, -69.8, -3.2]},
	{p: [-1.7, -4, -2.0], size: 0.8},
	{p: [-1.7, -34, -2.0], size: 0.8},
	{p: [-1.7, -64, -2.0], size: 0.8},
];

export type Villager = {
	p: [number, number, number];
	ry?: number;
	action: 'stand' | 'stir' | 'sit' | 'carry' | 'walk' | 'weave' | 'torch' | 'tend';
	tunic: string;
	scarf: string;
	phase?: number;
	scale?: number;
};
export const VILLAGERS: Villager[] = [
	// mutfak
	{p: [-12.1, -13, -3.1], ry: 0.5, action: 'stir', tunic: '#8c4a3a', scarf: '#d8c7a6', phase: 0},
	{p: [-9.6, -13, -2.6], ry: -0.6, action: 'carry', tunic: '#4f6b57', scarf: '#b65a3c', phase: 1.3},
	{p: [-15.2, -13, -2.2], ry: 0.3, action: 'weave', tunic: '#6b5a8a', scarf: '#e1c27a', phase: 2},
	// kiler
	{p: [7.8, -13, -2.6], ry: 0.2, action: 'carry', tunic: '#a7743c', scarf: '#d9d2c3', phase: 0.7},
	{p: [13.2, -13, -3.1], ry: -0.4, action: 'tend', tunic: '#5a6e8c', scarf: '#c9553a', phase: 2.2},
	// ahır
	{p: [-8.4, -27, -3.0], ry: 0.5, action: 'tend', tunic: '#7a5a3a', scarf: '#c8b98f', phase: 1.1},
	// yaşam alanları
	{p: [6.5, -27, -3.0], ry: 0.2, action: 'sit', tunic: '#a64a3d', scarf: '#e8dcc0', phase: 0.4},
	{p: [8.2, -27, -3.2], ry: -0.3, action: 'sit', tunic: '#4e6a8a', scarf: '#bf9a4a', phase: 1.6},
	{p: [13.3, -27, -3.0], ry: 0.4, action: 'weave', tunic: '#6e8a56', scarf: '#d8c8a0', phase: 0.9},
	{p: [15.2, -27, -2.4], ry: -0.5, action: 'stand', tunic: '#8f5a7a', scarf: '#d1c1a1', phase: 2.5, scale: 0.72},
	// diğer katlar
	{p: [-11, -43, -3.0], ry: 0.3, action: 'carry', tunic: '#7a6a4a', scarf: '#c7b48a', phase: 0.2},
	{p: [10.5, -43, -3.2], ry: -0.2, action: 'sit', tunic: '#a05a3a', scarf: '#dfd3b5', phase: 1.9},
	{p: [-9, -73, -3.0], ry: 0.2, action: 'sit', tunic: '#4e6a5a', scarf: '#c9a85a', phase: 0.8},
	{p: [9.5, -73, -3.1], ry: -0.3, action: 'stand', tunic: '#8a4e4e', scarf: '#d8cba8', phase: 2.7},
];

export type Donkey = {p: [number, number, number]; ry?: number; phase?: number; color?: string};
export const DONKEYS: Donkey[] = [
	{p: [-12.8, -27, -3.6], ry: 0.1, phase: 0, color: '#6f5e50'},
	{p: [-9.9, -27, -4.4], ry: -0.15, phase: 1.7, color: '#8a7a68'},
	{p: [-15.4, -27, -4.0], ry: 0.2, phase: 3.1, color: '#5c4c40'},
];

export const JAR_FIELDS: {origin: [number, number, number]; cols: number; rows: number; dx: number; dz: number; seed: number}[] = [
	{origin: [6, -13, -4.8], cols: 8, rows: 2, dx: 1.25, dz: 1.0, seed: 3},
	{origin: [-15, -43, -4.6], cols: 7, rows: 2, dx: 1.3, dz: 1.0, seed: 7},
	{origin: [-13.3, -73, -4.5], cols: 6, rows: 2, dx: 1.25, dz: 1.0, seed: 11},
];
