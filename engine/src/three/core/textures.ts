// Koddan üretilen dokular (CanvasTexture). Dış görsel dosyası gerekmez, lisans sorunu yoktur, deterministiktir.
import * as THREE from 'three';
import {rng} from './math';

const memo = new Map<string, THREE.Texture>();
const once = (key: string, make: () => THREE.Texture) => {
	let t = memo.get(key);
	if (!t) {
		t = make();
		memo.set(key, t);
	}
	return t;
};

const canvas = (w: number, h: number) => {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	return [c, c.getContext('2d') as CanvasRenderingContext2D] as const;
};

const finish = (c: HTMLCanvasElement, srgb = true) => {
	const t = new THREE.CanvasTexture(c);
	if (srgb) t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 4;
	t.needsUpdate = true;
	return t;
};

/** Özgün kurgusal banknot ("VAYY" — gerçek bir para birimine benzemez). */
export const banknoteTexture = (tint = '#2F8F6B') =>
	once('note' + tint, () => {
		const [c, g] = canvas(512, 240);
		const grd = g.createLinearGradient(0, 0, 512, 240);
		grd.addColorStop(0, tint);
		grd.addColorStop(1, '#16463A');
		g.fillStyle = grd;
		g.fillRect(0, 0, 512, 240);
		// giyoş desen
		g.strokeStyle = 'rgba(255,255,255,0.14)';
		g.lineWidth = 1.2;
		for (let i = 0; i < 26; i++) {
			g.beginPath();
			for (let x = 0; x <= 512; x += 8) {
				const y = 120 + Math.sin(x / 34 + i * 0.5) * (30 + i * 3);
				if (x === 0) g.moveTo(x, y);
				else g.lineTo(x, y);
			}
			g.stroke();
		}
		g.strokeStyle = 'rgba(255,230,160,0.75)';
		g.lineWidth = 6;
		g.strokeRect(10, 10, 492, 220);
		// amblem
		g.fillStyle = 'rgba(255,214,120,0.9)';
		g.beginPath();
		g.arc(400, 120, 64, 0, Math.PI * 2);
		g.fill();
		g.fillStyle = '#1b5a47';
		g.font = '900 86px Anton, Impact, sans-serif';
		g.textAlign = 'center';
		g.textBaseline = 'middle';
		g.fillText('V', 400, 124);
		g.fillStyle = 'rgba(255,255,255,0.92)';
		g.font = '900 64px Anton, Impact, sans-serif';
		g.textAlign = 'left';
		g.fillText('1000', 36, 72);
		g.font = '700 26px Montserrat, sans-serif';
		g.fillText('VAYY', 40, 196);
		return finish(c);
	});

/** Bina cephesi: aydınlık/karanlık pencere ızgarası. map + emissiveMap olarak kullanılır. */
export const windowsTexture = (seed: number, litRatio = 0.35, warm = true) =>
	once(`win${seed}-${litRatio}-${warm}`, () => {
		const [c, g] = canvas(256, 512);
		const r = rng(seed);
		g.fillStyle = '#000';
		g.fillRect(0, 0, 256, 512);
		const cols = 8;
		const rows = 32;
		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				const lit = r() < litRatio;
				const v = 0.55 + r() * 0.45;
				g.fillStyle = lit
					? warm
						? `rgba(255,${Math.floor(190 + r() * 50)},${Math.floor(110 + r() * 60)},${v})`
						: `rgba(170,210,255,${v})`
					: `rgba(20,30,50,1)`;
				g.fillRect(x * 32 + 5, y * 16 + 3, 22, 10);
			}
		}
		const t = finish(c);
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		return t;
	});

/** Yumuşak radyal parıltı (güneş, lamba halesi, parçacıklar) */
export const glowTexture = () =>
	once('glow', () => {
		const [c, g] = canvas(128, 128);
		const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
		grd.addColorStop(0, 'rgba(255,255,255,1)');
		grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
		grd.addColorStop(1, 'rgba(255,255,255,0)');
		g.fillStyle = grd;
		g.fillRect(0, 0, 128, 128);
		return finish(c, false);
	});
