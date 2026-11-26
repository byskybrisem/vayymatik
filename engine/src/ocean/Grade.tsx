// Sinematik renk/ışık katmanı (ucuz 2D): vinyet, lamba sıcak noktası, ton, hafif ışık sızıntısı.
import React from 'react';
import {AbsoluteFill} from 'remotion';

export type GradeSpec = {vignette?: number; tint?: string; tintOpacity?: number; hotspot?: number; letterbox?: number};

export const Grade: React.FC<{spec?: GradeSpec; lamp?: number}> = ({spec, lamp = 0}) => {
	const v = spec?.vignette ?? 0.62;
	const hot = (spec?.hotspot ?? 0.02) * lamp;
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{hot > 0 ? <AbsoluteFill style={{background: `radial-gradient(ellipse 42% 38% at 50% 54%, rgba(210,235,255,${hot}) 0%, rgba(120,180,220,${hot * 0.35}) 45%, rgba(0,0,0,0) 75%)`, mixBlendMode: 'screen'}} /> : null}
			{spec?.tint ? <AbsoluteFill style={{background: spec.tint, opacity: spec.tintOpacity ?? 0.12, mixBlendMode: 'soft-light'}} /> : null}
			<AbsoluteFill style={{background: `radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,${v}) 100%)`}} />
			{spec?.letterbox ? (
				<>
					<div style={{position: 'absolute', left: 0, right: 0, top: 0, height: `${spec.letterbox}%`, background: '#000'}} />
					<div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: `${spec.letterbox}%`, background: '#000'}} />
				</>
			) : null}
		</AbsoluteFill>
	);
};
