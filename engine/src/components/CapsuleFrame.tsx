import React from 'react';

// Özgün çizim: basınçlı kapsül kapısı iç görünümü (temsili). Ortadaki açıklıktan Dünya görünür.
export const CapsuleFrame: React.FC<{opacity: number; frame: number}> = ({opacity, frame}) => {
	const W = 1080;
	const H = 1920;
	const x0 = 120;
	const y0 = 330;
	const x1 = 960;
	const y1 = 1540;
	const r = 120;
	const flick = 0.92 + 0.08 * Math.sin(frame * 0.7) * Math.sin(frame * 0.13);
	const hole = `M${x0 + r},${y0} H${x1 - r} Q${x1},${y0} ${x1},${y0 + r} V${y1 - r} Q${x1},${y1} ${x1 - r},${y1} H${x0 + r} Q${x0},${y1} ${x0},${y1 - r} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} Z`;
	const rivets = [];
	for (let i = 0; i < 9; i++) {
		const yy = y0 + 70 + i * ((y1 - y0 - 140) / 8);
		rivets.push(<circle key={'l' + i} cx={x0 - 38} cy={yy} r={7} fill="url(#rivet)" />);
		rivets.push(<circle key={'r' + i} cx={x1 + 38} cy={yy} r={7} fill="url(#rivet)" />);
	}
	return (
		<svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity}}>
			<defs>
				<linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#1b2230" />
					<stop offset="0.45" stopColor="#0b0f17" />
					<stop offset="1" stopColor="#151b26" />
				</linearGradient>
				<linearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="#8a94a3" />
					<stop offset="0.25" stopColor="#f2f5f9" />
					<stop offset="0.5" stopColor="#6d7787" />
					<stop offset="0.8" stopColor="#d9dee6" />
					<stop offset="1" stopColor="#5c6574" />
				</linearGradient>
				<radialGradient id="rivet" cx="0.35" cy="0.35" r="0.7">
					<stop offset="0" stopColor="#ffffff" />
					<stop offset="0.4" stopColor="#9aa3b1" />
					<stop offset="1" stopColor="#2a303b" />
				</radialGradient>
				<linearGradient id="step" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#c9d0da" />
					<stop offset="0.12" stopColor="#7c8696" />
					<stop offset="1" stopColor="#1a1f29" />
				</linearGradient>
				<pattern id="hazard" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
					<rect width="28" height="56" fill="#f2c230" />
					<rect x="28" width="28" height="56" fill="#111" />
				</pattern>
				<radialGradient id="spill" cx="0.5" cy="0.15" r="0.9">
					<stop offset="0" stopColor="rgba(150,190,255,0.25)" />
					<stop offset="1" stopColor="rgba(0,0,0,0)" />
				</radialGradient>
			</defs>
			<path d={`M0,0 H${W} V${H} H0 Z ${hole}`} fill="url(#panel)" fillRule="evenodd" />
			<path d={`M0,0 H${W} V${H} H0 Z ${hole}`} fill="url(#spill)" fillRule="evenodd" opacity={flick} />
			<path d={hole} fill="none" stroke="url(#rim)" strokeWidth={22} />
			<path d={hole} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={3} transform="translate(0,-4)" />
			{rivets}
			{/* basamak */}
			<path d={`M${x0 - 10},${y1 - 40} L${x1 + 10},${y1 - 40} L${x1 + 70},${y1 + 120} L${x0 - 70},${y1 + 120} Z`} fill="url(#step)" />
			<rect x={x0 + 40} y={y1 - 34} width={x1 - x0 - 80} height={26} fill="url(#hazard)" opacity={0.9} />
			<rect x={0} y={y1 + 120} width={W} height={H - y1 - 120} fill="#07090e" />
		</svg>
	);
};
