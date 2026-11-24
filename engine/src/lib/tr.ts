// Türkçe büyük/küçük harf: i→İ, ı→I. Yabancı özel adlar (Dietrich, Leipzig, YouTube…) için
// standart büyütme uygulanır: "DIETRICH", "LEIPZIG'E". Liste konu JSON'u ile genişletilebilir.
const FOREIGN = new Set<string>([
	'dietrich', 'mateschitz', 'yoovidhya', 'chaleo', 'krating', 'daeng', 'leipzig', 'felix', 'baumgartner',
	'media', 'house', 'cliff', 'diving', 'air', 'race', 'racing', 'rampage', 'flugtag', 'bragantino', 'servustv',
	'terra', 'mater', 'records', 'bulletin', 'red', 'bull', 'youtube', 'stratos', 'fuschl', 'see', 'new', 'york', 'the', 'tv',
	'pharmaceutical', 'utah', 'mexico', 'formula',
]);

export const registerForeignWords = (words: string[] = []) => words.forEach((w) => FOREIGN.add(w.toLowerCase()));

const basicTrUpper = (s: string): string => s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();

export const trUpper = (s: string): string =>
	s
		.split(/(\s+)/)
		.map((tok) => {
			if (!tok.trim()) return tok;
			const m = tok.match(/^([^'’]+)(['’].*)?$/);
			if (!m) return basicTrUpper(tok);
			const base = m[1];
			const rest = m[2] ?? '';
			const core = base.replace(/[^\p{L}]/gu, '').toLowerCase();
			return (FOREIGN.has(core) ? base.toUpperCase() : basicTrUpper(base)) + basicTrUpper(rest);
		})
		.join('');

export const trLower = (s: string): string => s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();

// Türkçe sayı biçimi: 13969000000 -> "13.969.000.000"; ondalık ayırıcı virgül.
export const trNumber = (n: number, decimals = 0): string => {
	const fixed = n.toFixed(decimals);
	const [whole, frac] = fixed.split('.');
	const w = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	return frac ? `${w},${frac}` : w;
};
