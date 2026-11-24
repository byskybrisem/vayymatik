// Karakter iskeleti: eklem pozları, yüz ifadeleri, yürüyüş döngüsü, konuşma (ağız) ve göz kırpma.
// Pozlar radyan cinsinden eklem açılarıdır; ad verilmiş pozlar ağırlıklarla harmanlanır.
import {noise2D} from '@remotion/noise';

export const JOINTS = [
	'rootY', 'spineX', 'spineY', 'chestX', 'chestY', 'neckX', 'headX', 'headY', 'headZ',
	'shLX', 'shLY', 'shLZ', 'elLX', 'elLY', 'wrLX', 'wrLZ', 'fingerL', 'pointL',
	'shRX', 'shRY', 'shRZ', 'elRX', 'elRY', 'wrRX', 'wrRZ', 'fingerR', 'pointR',
	'hipLX', 'hipLZ', 'knLX', 'ankLX', 'hipRX', 'hipRZ', 'knRX', 'ankRX',
] as const;
export type Joint = (typeof JOINTS)[number];
export type Pose = Partial<Record<Joint, number>>;

const STAND: Pose = {rootY: 0.98, shLZ: 0.1, shRZ: -0.1, elLX: -0.18, elRX: -0.18, fingerL: 0.45, fingerR: 0.45, wrLZ: -0.1, wrRZ: 0.1};
const SIT: Pose = {
	rootY: 0.6, spineX: 0.14, chestX: 0.1, headX: 0.32, neckX: 0.05,
	hipLX: -1.52, hipRX: -1.52, knLX: 1.5, knRX: 1.5, hipLZ: 0.06, hipRZ: -0.06,
	shLX: -0.55, shLZ: 0.2, elLX: -1.05, elLY: 0.35, wrLX: 0.25, fingerL: 0.35,
	shRX: -0.55, shRZ: -0.2, elRX: -1.05, elRY: -0.35, wrRX: 0.25, fingerR: 0.35,
};

/** Hazır pozlar. Yeni poz eklemek: buraya bir nesne ekleyin (STAND/SIT'ten türetmek yeterli). */
export const POSES: Record<string, Pose> = {
	stand: STAND,
	sit: SIT,
	// oturur, düşünceli: çene eline yaslı
	sitThink: {...SIT, headX: 0.12, spineX: 0.2, shRX: -1.05, shRZ: 0.12, elRX: -2.35, elRY: -0.2, wrRX: 0.5, fingerR: 0.9},
	// karar anı: sağ yumruk yukarıda (masaya vurmadan önce)
	sitRaise: {...SIT, headX: 0.0, spineX: 0.05, shRX: -1.25, shRZ: -0.25, elRX: -1.5, fingerR: 1.0},
	sitUp: {...SIT, headX: -0.02, spineX: 0.02, chestX: 0.0, fingerR: 1.0},
	// konuşurken açık el jesti
	talkOpen: {...STAND, shRX: -0.75, shRZ: -0.2, elRX: -1.0, elRY: -0.6, wrRX: -0.2, fingerR: 0.1, shLZ: 0.16, elLX: -0.3, chestX: 0.05},
	// izleyiciyi işaret et
	point: {...STAND, shRX: -1.42, shRZ: 0.12, shRY: 0.0, elRX: -0.12, fingerR: 1.0, pointR: 1, chestY: -0.15, headY: 0.05, shLZ: 0.14, elLX: -0.35},
	// kollar açık: zirvede sakin güç
	open: {...STAND, shLX: -0.25, shLZ: 0.75, shRX: -0.25, shRZ: -0.75, elLX: -0.25, elRX: -0.25, fingerL: 0.15, fingerR: 0.15, chestX: -0.06, headX: -0.08},
	triumph: {...STAND, shLZ: 2.55, shRZ: -2.55, shLX: -0.2, shRX: -0.2, elLX: -0.35, elRX: -0.35, fingerL: 1.0, fingerR: 1.0, headX: -0.18, chestX: -0.1},
	handsHips: {...STAND, shLZ: 0.55, shRZ: -0.55, shLY: 0.5, shRY: -0.5, elLX: -1.6, elRX: -1.6, elLY: 0.5, elRY: -0.5, fingerL: 0.6, fingerR: 0.6, chestX: -0.04},
};

export type Expr = {browY: number; browTilt: number; eyeOpen: number; smile: number; mouthW: number; jaw: number};
/** Yüz ifadeleri (kaş yüksekliği/eğimi, göz açıklığı, gülümseme, ağız genişliği, çene) */
export const EXPRESSIONS: Record<string, Expr> = {
	neutral: {browY: 0, browTilt: 0, eyeOpen: 1, smile: 0.1, mouthW: 1, jaw: 0},
	focused: {browY: -0.008, browTilt: -0.28, eyeOpen: 0.78, smile: -0.1, mouthW: 0.9, jaw: 0},
	tired: {browY: 0.004, browTilt: 0.25, eyeOpen: 0.6, smile: -0.3, mouthW: 0.95, jaw: 0},
	determined: {browY: -0.01, browTilt: -0.38, eyeOpen: 0.92, smile: 0.3, mouthW: 1.05, jaw: 0},
	smile: {browY: 0.006, browTilt: 0.12, eyeOpen: 0.82, smile: 1, mouthW: 1.15, jaw: 0.05},
	confident: {browY: 0.0, browTilt: -0.12, eyeOpen: 0.9, smile: 0.6, mouthW: 1.08, jaw: 0},
	surprised: {browY: 0.022, browTilt: 0.2, eyeOpen: 1.25, smile: 0, mouthW: 0.85, jaw: 0.45},
};

export const blendPose = (w: Record<string, number>): Required<Pose> => {
	const out = Object.fromEntries(JOINTS.map((j) => [j, 0])) as Required<Pose>;
	let total = 0;
	for (const [name, k] of Object.entries(w)) {
		const p = POSES[name] ?? STAND;
		total += k;
		for (const j of JOINTS) out[j] += (p[j] ?? (j === 'rootY' ? STAND.rootY! : 0)) * k;
	}
	if (total > 0 && Math.abs(total - 1) > 1e-6) for (const j of JOINTS) out[j] /= total;
	return out;
};

export const blendExpr = (w: Record<string, number>): Expr => {
	const out: Expr = {browY: 0, browTilt: 0, eyeOpen: 0, smile: 0, mouthW: 0, jaw: 0};
	let total = 0;
	for (const [name, k] of Object.entries(w)) {
		const e = EXPRESSIONS[name] ?? EXPRESSIONS.neutral;
		total += k;
		(Object.keys(out) as (keyof Expr)[]).forEach((key) => (out[key] += e[key] * k));
	}
	if (total > 0) (Object.keys(out) as (keyof Expr)[]).forEach((key) => (out[key] /= total));
	return out;
};

export type WalkSpec = {from: number; to: number; speed?: number; stride?: number};
/** Yürüyüş döngüsü: pozun üstüne eklenir. speed = adım/saniye (kare başına fps ile çevrilir) */
export const applyWalk = (p: Required<Pose>, frame: number, fps: number, walk?: WalkSpec) => {
	if (!walk || frame < walk.from || frame > walk.to) return p;
	const fade = Math.min(1, (frame - walk.from) / 6, (walk.to - frame) / 6);
	const ph = ((frame - walk.from) / fps) * (walk.speed ?? 1.8) * Math.PI;
	const s = (walk.stride ?? 1) * fade;
	const sin = Math.sin(ph);
	p.hipLX += -0.5 * sin * s;
	p.hipRX += 0.5 * sin * s;
	p.knLX += Math.max(0, Math.sin(ph + 1.2)) * 0.8 * s;
	p.knRX += Math.max(0, Math.sin(ph + Math.PI + 1.2)) * 0.8 * s;
	p.ankLX += -0.15 * Math.sin(ph + 0.6) * s;
	p.ankRX += 0.15 * Math.sin(ph + 0.6) * s;
	p.shLX += 0.38 * sin * s;
	p.shRX += -0.38 * sin * s;
	p.elLX += -0.15 * s;
	p.elRX += -0.15 * s;
	p.chestY += 0.07 * sin * s;
	p.rootY += -Math.abs(Math.cos(ph)) * 0.035 * s + 0.015 * s;
	return p;
};

export type TalkWord = {from: number; to: number};
/** Konuşma: kelime aralıklarında hece ritminde ağız açıklığı (0–1), ayrıca kafa ve kaş vurguları */
export const talkAmount = (frame: number, words?: TalkWord[]) => {
	if (!words || !words.length) return {open: 0, accent: 0};
	let open = 0;
	let accent = 0;
	for (const w of words) {
		if (frame < w.from - 2 || frame > w.to + 3) continue;
		const env = Math.min(1, (frame - w.from + 2) / 2, (w.to + 3 - frame) / 3);
		const syl = 0.5 + 0.5 * Math.sin((frame - w.from) * 1.35 + w.from);
		const n = 0.5 + 0.5 * noise2D('mouth', frame * 0.6, w.from);
		open = Math.max(open, env * (0.25 + 0.75 * (0.6 * syl + 0.4 * n)));
		accent = Math.max(accent, env * Math.max(0, 1 - (frame - w.from) / 8));
	}
	return {open: Math.min(1, open), accent};
};

/** Deterministik göz kırpma: ~3,5 sn'de bir, 5 karelik */
export const blink = (frame: number, seed = 0) => {
	const period = 105;
	const off = Math.floor(((Math.sin(seed * 12.9898) + 1) / 2) * 60);
	const local = (frame + off) % period;
	if (local > 5) return 1;
	return Math.abs(local - 2.5) / 2.5;
};
