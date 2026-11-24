import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

// F1 tarzı start ışıkları (özgün çizim): 5 sütun × 2 kırmızı LED; 'out' anında söner.
export const StartLights: React.FC<{on: number[]; out: number; y?: number}> = ({on, out, y = 470}) => {
	const frame = useCurrentFrame();
	const gone = frame >= out;
	const fadeOut = interpolate(frame, [out + 10, out + 22], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	if (fadeOut <= 0) return null;
	const colW = 150;
	const x0 = 540 - colW * 2;
	return (
		<div style={{position: 'absolute', left: 0, top: y - 210, width: 1080, height: 420, opacity: fadeOut}}>
			<svg width={1080} height={420}>
				<defs>
					<radialGradient id="led" cx="0.5" cy="0.45" r="0.55">
						<stop offset="0" stopColor="#fff2f0" />
						<stop offset="0.25" stopColor="#ff3b30" />
						<stop offset="1" stopColor="#7a0008" />
					</radialGradient>
					<radialGradient id="ledoff" cx="0.5" cy="0.4" r="0.6">
						<stop offset="0" stopColor="#3a3d44" />
						<stop offset="1" stopColor="#111317" />
					</radialGradient>
					<filter id="ledglow" x="-100%" y="-100%" width="300%" height="300%">
						<feGaussianBlur stdDeviation="16" result="b" />
						<feMerge>
							<feMergeNode in="b" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>
				<rect x={x0 - 90} y={40} width={colW * 4 + 180} height={22} rx={6} fill="#1b1e24" />
				{[0, 1, 2, 3, 4].map((i) => {
					const lit = !gone && frame >= on[i];
					const pop = lit ? interpolate(frame - on[i], [0, 4], [1.25, 1], {extrapolateRight: 'clamp'}) : 1;
					const cx = x0 + i * colW;
					return (
						<g key={i}>
							<rect x={cx - 52} y={70} width={104} height={300} rx={22} fill="#0c0e12" stroke="#2c3038" strokeWidth={4} />
							{[150, 285].map((cy) => (
								<circle
									key={cy}
									cx={cx}
									cy={cy}
									r={44 * pop}
									fill={lit ? 'url(#led)' : 'url(#ledoff)'}
									filter={lit ? 'url(#ledglow)' : undefined}
								/>
							))}
						</g>
					);
				})}
			</svg>
		</div>
	);
};
