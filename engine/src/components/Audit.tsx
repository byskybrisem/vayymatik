import React, {useLayoutEffect} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {useBrand} from '../lib/theme';

// QA: her karede data-safe öğelerin güvenli alan/kadraj içinde kaldığını ve metnin taşmadığını denetler.
// Sorunları "[OVERFLOW] {json}" olarak konsola yazar (render.mjs → render_log.json).
export const Audit: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const b = useBrand();
	useLayoutEffect(() => {
		const els = Array.from(document.querySelectorAll<HTMLElement>('[data-safe]'));
		for (const el of els) {
			const r = el.getBoundingClientRect();
			if (r.width === 0 || r.height === 0) continue;
			const op = parseFloat(getComputedStyle(el).opacity || '1');
			if (op < 0.2) continue;
			const kind = el.dataset.safe;
			// güvenli alan: altyazı ve başlıklar için sıkı, etiketler için kadraj
			const m = kind === 'tag' ? {l: 0, r: width, t: 0, b: height} : {l: b.safe.left - 24, r: width - b.safe.right + 70, t: b.safe.top - 70, b: height - b.safe.bottom + 40};
			const issues: string[] = [];
			if (r.left < m.l) issues.push(`sol ${Math.round(r.left)}<${m.l}`);
			if (r.right > m.r) issues.push(`sağ ${Math.round(r.right)}>${m.r}`);
			if (r.top < m.t) issues.push(`üst ${Math.round(r.top)}<${m.t}`);
			if (r.bottom > m.b) issues.push(`alt ${Math.round(r.bottom)}>${m.b}`);
			if (el.scrollWidth > el.clientWidth + 2) issues.push(`metin taşması ${el.scrollWidth}>${el.clientWidth}`);
			if (issues.length) {
				console.warn('[OVERFLOW] ' + JSON.stringify({frame, kind, issues, text: (el.innerText || '').slice(0, 60)}));
			}
		}
	});
	return null;
};
