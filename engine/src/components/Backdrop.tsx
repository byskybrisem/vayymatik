import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {hash} from '../lib/anim';
import {useBrand} from '../lib/theme';

// Sinematik stüdyo fonu: lacivert degrade, hareketli ışık huzmeleri, toz parçacıkları.
export const Backdrop: React.FC<{hue?: 'navy' | 'red' | 'gold' | 'steel'; beams?: boolean; particles?: number; grid?: boolean}> = ({
	hue = 'navy',
	beams = true,
	particles = 40,
	grid = false,
}) => {
	const frame = useCurrentFrame();
	const b = useBrand();
	const base = {navy: [b.colors.navy, b.colors.navyDeep], red: ['#3a0710', '#0d0205'], gold: ['#2a1d05', '#080502'], steel: ['#1d2533', '#07090d']}[hue];
	const beamCol = hue === 'red' ? 'rgba(255,60,80,0.20)' : hue === 'gold' ? 'rgba(255,200,90,0.18)' : 'rgba(150,190,255,0.16)';
	const dots = [];
	for (let i = 0; i < particles; i++) {
		const x = (hash(i * 1.7) * 1080 + noise2D('px', i, frame * 0.004) * 140 + frame * (0.2 + hash(i) * 0.6)) % 1080;
		const y = (hash(i * 3.3) * 1920 - frame * (0.4 + hash(i * 2) * 1.2) + 1920 * 4) % 1920;
		const s = 1.5 + hash(i * 9.1) * 3.5;
		dots.push(<circle key={i} cx={x} cy={y} r={s} fill="#fff" opacity={0.08 + hash(i * 4.4) * 0.25} />);
	}
	return (
		<AbsoluteFill style={{background: `radial-gradient(ellipse 90% 70% at 50% 35%, ${base[0]} 0%, ${base[1]} 75%)`}}>
			{grid ? (
				<AbsoluteFill
					style={{
						backgroundImage:
							'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
						backgroundSize: '90px 90px',
						backgroundPosition: `0 ${frame * 0.6}px`,
						maskImage: 'radial-gradient(ellipse 80% 60% at 50% 45%, black 30%, transparent 85%)',
					}}
				/>
			) : null}
			{beams
				? [0, 1, 2].map((i) => {
						const ang = -28 + i * 26 + noise2D('beam', i, frame * 0.01) * 10;
						return (
							<AbsoluteFill
								key={i}
								style={{
									background: `linear-gradient(${90 + ang}deg, transparent 42%, ${beamCol} 50%, transparent 58%)`,
									transformOrigin: '50% 0%',
									transform: `translateY(-200px) scaleY(1.4)`,
									filter: 'blur(18px)',
									mixBlendMode: 'screen',
								}}
							/>
						);
					})
				: null}
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				{dots}
			</svg>
		</AbsoluteFill>
	);
};
