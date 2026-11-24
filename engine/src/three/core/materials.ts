// Ortak malzeme kütüphanesi: stilize low-poly görünüm (flatShading) + VAYYMATİK paleti.
// Malzemeler önbelleklenir: aynı renk/parametre → tek nesne (bellek ve shader derleme tasarrufu).
import * as THREE from 'three';

export const PALETTE = {
	red: '#E8112D',
	redDeep: '#9E0B1F',
	navy: '#0A1A3A',
	navyDeep: '#050C1E',
	gold: '#FFC83D',
	goldDeep: '#C9881A',
	silver: '#C9D2DC',
	ink: '#05070D',
	skin: '#C98E68',
	skinShadow: '#A86F50',
	hair: '#2A1C16',
	suit: '#1C2B4A',
	shirt: '#E9EEF3',
	wood: '#5B3A26',
	woodDark: '#3A2418',
	concrete: '#3B4250',
	money: '#2F8F6B',
};

type MatOpts = {
	color: string;
	rough?: number;
	metal?: number;
	emissive?: string;
	emissiveIntensity?: number;
	flat?: boolean;
	transparent?: boolean;
	opacity?: number;
	side?: THREE.Side;
};

const cache = new Map<string, THREE.MeshStandardMaterial>();

export const mat = (o: MatOpts | string): THREE.MeshStandardMaterial => {
	const m: MatOpts = typeof o === 'string' ? {color: o} : o;
	const key = JSON.stringify(m);
	let r = cache.get(key);
	if (!r) {
		r = new THREE.MeshStandardMaterial({
			color: m.color,
			roughness: m.rough ?? 0.72,
			metalness: m.metal ?? 0,
			flatShading: m.flat ?? true,
			emissive: m.emissive ?? '#000000',
			emissiveIntensity: m.emissiveIntensity ?? 1,
			transparent: m.transparent ?? false,
			opacity: m.opacity ?? 1,
			side: m.side ?? THREE.FrontSide,
		});
		cache.set(key, r);
	}
	return r;
};

export const GOLD = () => mat({color: PALETTE.gold, rough: 0.28, metal: 1, emissive: '#5a3a00', emissiveIntensity: 0.35});
export const CHROME = () => mat({color: '#dfe6ee', rough: 0.18, metal: 1});
