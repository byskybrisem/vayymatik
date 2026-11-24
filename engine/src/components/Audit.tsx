import React, {useLayoutEffect} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import type {SceneSpec} from '../types';
import {useBrand} from '../lib/theme';

// QA: yerleşmiş (animasyonu bitmiş) karelerde metnin güvenli alan / kadraj içinde kaldığını denetler.
// Ölçüm metin düğümlerinin gerçek kutularıyla yapılır (dekoratif arka planlar hariç).
// Sorunlar "[OVERFLOW] {json}" olarak konsola yazılır (render.mjs → render_log.json).
const textRects = (el: HTMLElement) => {
	// yalnızca metin düğümleri (dekoratif arka plan/plakalar ölçüme girmez)
	const rects: DOMRect[] = [];
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	let node = walker.nextNode();
	while (node) {
		if ((node.textContent ?? '').trim()) {
			const r = document.createRange();
			r.selectNodeContents(node);
			rects.push(...Array.from(r.getClientRects()).filter((x) => x.width > 0.5 && x.height > 0.5));
		}
		node = walker.nextNode();
	}
	if (!rects.length) return null;
	return {
		left: Math.min(...rects.map((x) => x.left)),
		right: Math.max(...rects.map((x) => x.right)),
		top: Math.min(...rects.map((x) => x.top)),
		bottom: Math.max(...rects.map((x) => x.bottom)),
	};
};

const settled = (el: HTMLElement): boolean => {
	// öğe veya ataları ölçek/bulanıklık animasyonundaysa (giriş/çıkış) atla
	let n: HTMLElement | null = el;
	while (n && n !== document.body) {
		const cs = getComputedStyle(n);
		if (parseFloat(cs.opacity || '1') < 0.95) return false;
		if (cs.filter && cs.filter.includes('blur(') && !/blur\(0px\)/.test(cs.filter)) return false;
		if (cs.transform && cs.transform !== 'none') {
			const m = cs.transform.match(/matrix\(([^)]+)\)/);
			if (m) {
				const [a, b] = m[1].split(',').map(Number);
				if (Math.abs(Math.hypot(a, b) - 1) > 0.02) return false;
			}
		}
		n = n.parentElement;
	}
	return true;
};

export const Audit: React.FC<{scenes: SceneSpec[]}> = ({scenes}) => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const b = useBrand();
	const inTransition = scenes.some((s) => s.transitionIn && s.transitionIn.type !== 'cut' && frame >= s.from && frame < s.from + s.transitionIn.dur + 2);
	useLayoutEffect(() => {
		if (inTransition) return;
		const els = Array.from(document.querySelectorAll<HTMLElement>('[data-safe]'));
		for (const el of els) {
			if (!settled(el)) continue;
			const r = textRects(el);
			if (!r || Math.abs(r.top) > 5000) continue;
			const kind = el.dataset.safe;
			const m = kind === 'tag' ? {l: 0, r: width, t: 0, b: height} : {l: b.safe.left - 24, r: width - b.safe.right + 70, t: b.safe.top - 70, b: height - b.safe.bottom + 40};
			const issues: string[] = [];
			if (r.left < m.l) issues.push(`sol ${Math.round(r.left)}<${m.l}`);
			if (r.right > m.r) issues.push(`sağ ${Math.round(r.right)}>${m.r}`);
			if (r.top < m.t) issues.push(`üst ${Math.round(r.top)}<${m.t}`);
			if (r.bottom > m.b) issues.push(`alt ${Math.round(r.bottom)}>${m.b}`);
			const box = el.getBoundingClientRect();
			if (r.right - r.left > box.width + 4 && kind !== 'tag') issues.push(`metin kutudan geniş ${Math.round(r.right - r.left)}>${Math.round(box.width)}`);
			if (issues.length) console.warn('[OVERFLOW] ' + JSON.stringify({frame, kind, issues, text: (el.innerText || '').slice(0, 60)}));
		}
	});
	return null;
};
