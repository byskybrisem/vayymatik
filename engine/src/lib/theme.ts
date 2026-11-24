import {createContext, useContext} from 'react';
import type {BrandSpec} from '../types';

export const DEFAULT_BRAND: BrandSpec = {
	name: 'VAYYMATİK',
	colors: {
		red: '#E8112D',
		redDeep: '#9E0B1F',
		navy: '#0A1A3A',
		navyDeep: '#050C1E',
		silver: '#C9D2DC',
		steel: '#7D8B9C',
		gold: '#FFC83D',
		white: '#FFFFFF',
		ink: '#05070D',
	},
	safe: {top: 250, bottom: 520, left: 80, right: 150},
	captions: {centerY: 1235, maxWidth: 800, fontSize: 76, uppercase: true},
	watermark: {text: 'VAYYMATİK', show: true},
};

export const BrandCtx = createContext<BrandSpec>(DEFAULT_BRAND);
export const useBrand = () => useContext(BrandCtx);

export const FONTS = {
	display: '"Anton", "Impact", sans-serif',
	sans: '"Montserrat", "Inter", sans-serif',
	ui: '"Inter", "Montserrat", sans-serif',
	mono: '"JetBrains Mono", monospace',
};

export const colorOf = (b: BrandSpec, c?: string): string => {
	if (!c) return b.colors.white;
	if (c.startsWith('#') || c.startsWith('rgb')) return c;
	return b.colors[c] ?? c;
};
