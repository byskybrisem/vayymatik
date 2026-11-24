import {add, cross, deg, dot, mul, norm, sub, V3} from './vec';

export const R_EARTH = 6371; // km

export type EarthCam = {
	lat: number; // derece
	lon: number;
	alt: number; // km
	heading: number; // derece, kuzeyden saat yönünde
	pitch: number; // derece, ufkun altına bakış (+)
	roll: number; // derece
	fov: number; // dikey görüş açısı, derece
	fisheye: number; // 0..1
};

export const ecef = (lat: number, lon: number, r = R_EARTH): V3 => {
	const la = lat * deg;
	const lo = lon * deg;
	return [r * Math.cos(la) * Math.cos(lo), r * Math.cos(la) * Math.sin(lo), r * Math.sin(la)];
};

export const toLatLon = (p: V3): [number, number] => {
	const n = norm(p);
	return [Math.asin(Math.max(-1, Math.min(1, n[2]))) / deg, Math.atan2(n[1], n[0]) / deg];
};

export type CamBasis = {pos: V3; fwd: V3; right: V3; up: V3};

export const camBasis = (c: EarthCam): CamBasis => {
	const pos = ecef(c.lat, c.lon, R_EARTH + c.alt);
	const upL = norm(pos);
	let east = cross([0, 0, 1], upL);
	if (Math.hypot(...east) < 1e-6) east = [0, 1, 0];
	east = norm(east);
	const north = cross(upL, east);
	const h = c.heading * deg;
	const p = c.pitch * deg;
	const horiz = add(mul(east, Math.sin(h)), mul(north, Math.cos(h)));
	const fwd = norm(sub(mul(horiz, Math.cos(p)), mul(upL, Math.sin(p))));
	let right = norm(sub(mul(east, Math.cos(h)), mul(north, Math.sin(h))));
	let up = norm(cross(right, fwd));
	if (c.roll) {
		const r = c.roll * deg;
		const r2 = add(mul(right, Math.cos(r)), mul(up, Math.sin(r)));
		const u2 = sub(mul(up, Math.cos(r)), mul(right, Math.sin(r)));
		right = r2;
		up = u2;
	}
	return {pos, fwd, right, up};
};

// Dünya yüzeyindeki noktayı ekrana izdüşür (yalnızca dikdörtgen/rectilinear kamera).
export const projectLatLon = (
	lat: number,
	lon: number,
	b: CamBasis,
	cam: EarthCam,
	W: number,
	H: number,
	altKm = 0,
): {x: number; y: number; visible: boolean} => {
	const p = ecef(lat, lon, R_EARTH + altKm);
	const v = sub(p, b.pos);
	const z = dot(v, b.fwd);
	const tanHalf = Math.tan((cam.fov * deg) / 2);
	const aspect = W / H;
	const nx = dot(v, b.right) / (z * tanHalf) / aspect;
	const ny = dot(v, b.up) / (z * tanHalf);
	// ufuk testi: noktanın kameraya bakan yarıkürede olması
	const facing = dot(norm(p), sub(b.pos, p)) > 0;
	return {x: ((nx + 1) / 2) * W, y: ((1 - ny) / 2) * H, visible: z > 0 && facing};
};

// İki enlem/boylam arasında büyük çember üzerinde küresel ara değer
export const slerpLatLon = (a: [number, number], b: [number, number], t: number): [number, number] => {
	const pa = norm(ecef(a[0], a[1], 1));
	const pb = norm(ecef(b[0], b[1], 1));
	const om = Math.acos(Math.max(-1, Math.min(1, dot(pa, pb))));
	if (om < 1e-6) return a;
	const s = Math.sin(om);
	const p = add(mul(pa, Math.sin((1 - t) * om) / s), mul(pb, Math.sin(t * om) / s));
	return toLatLon(p);
};

export const sunDir = (lat: number, lon: number): V3 => norm(ecef(lat, lon, 1));
