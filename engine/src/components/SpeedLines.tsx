import React from 'react';
import {useCurrentFrame} from 'remotion';
import {hash} from '../lib/anim';

// Merkezden dışa hız çizgileri (deterministik)
export const SpeedLines: React.FC<{amount: number}> = ({amount}) => {
	const frame = useCurrentFrame();
	if (amount <= 0.01) return null;
	const lines = [];
	for (let i = 0; i < 46; i++) {
		const a = hash(i * 3.1) * Math.PI * 2;
		const ph = (hash(i * 7.7) + frame * (0.05 + hash(i) * 0.05)) % 1;
		const r0 = 260 + ph * 900;
		const r1 = r0 + 120 + hash(i * 1.3) * 260 * amount;
		const cx = 540;
		const cy = 900;
		lines.push(
			<line
				key={i}
				x1={cx + Math.cos(a) * r0}
				y1={cy + Math.sin(a) * r0}
				x2={cx + Math.cos(a) * r1}
				y2={cy + Math.sin(a) * r1}
				stroke="white"
				strokeOpacity={0.12 + 0.25 * hash(i * 2.2) * amount}
				strokeWidth={1.5 + hash(i * 5.5) * 2.5}
			/>,
		);
	}
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, mixBlendMode: 'screen'}}>
			{lines}
		</svg>
	);
};
