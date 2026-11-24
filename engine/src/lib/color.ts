export const hexToRgb01 = (hex: string): [number, number, number] => {
	const h = hex.replace('#', '');
	const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
	return [parseInt(v.slice(0, 2), 16) / 255, parseInt(v.slice(2, 4), 16) / 255, parseInt(v.slice(4, 6), 16) / 255];
};
