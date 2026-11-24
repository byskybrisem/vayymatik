import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BrandCtx, DEFAULT_BRAND, FONTS} from './lib/theme';
import {EarthScene} from './scenes/EarthScene';
import {trUpper} from './lib/tr';
import type {ShortProps} from './types';
import './lib/fonts';

// Kapak görseli (9:16): hook sahnesinin kapsül POV'u + iri başlık. Metinler konu JSON'undan gelir.
export const Thumbnail: React.FC<ShortProps & {thumb?: {kicker: string; line1: string; line2: string; badge?: string}}> = ({timeline, thumb}) => {
	const brand = {...DEFAULT_BRAND, ...(timeline?.brand ?? {})};
	const hook = timeline?.scenes.find((s) => s.type === 'earth');
	const t = thumb ?? {kicker: 'Red Bull', line1: 'Neden', line2: 'Atlattı?'};
	return (
		<BrandCtx.Provider value={brand}>
			<AbsoluteFill style={{background: '#000'}}>
				{hook ? <EarthScene {...(hook.props as object)} keys={[{t: 0, lat: 33.4, lon: -104.5, alt: 39, heading: 75, pitch: 20, roll: -4, fov: 100, fisheye: 0.85}]} titles={[]} labels={[]} /> : null}
				<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.0) 45%, rgba(0,0,0,0.0) 60%, rgba(0,0,0,0.8) 100%)'}} />
				<div style={{position: 'absolute', left: 80, right: 80, top: 300, textAlign: 'center'}}>
					<div style={{display: 'inline-block', background: brand.colors.red, color: '#fff', fontFamily: FONTS.ui, fontWeight: 700, fontSize: 44, letterSpacing: 8, padding: '8px 22px', borderRadius: 10}}>{trUpper(t.kicker)}</div>
					<div style={{fontFamily: FONTS.display, fontSize: 210, lineHeight: 0.98, color: '#fff', marginTop: 26, filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.8))'}}>{trUpper(t.line1)}</div>
					<div style={{fontFamily: FONTS.display, fontSize: 210, lineHeight: 0.98, color: brand.colors.gold, filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.8))'}}>{trUpper(t.line2)}</div>
				</div>
				{t.badge ? (
					<div style={{position: 'absolute', left: 80, right: 150, bottom: 560, textAlign: 'center'}}>
						<span style={{fontFamily: FONTS.sans, fontWeight: 900, fontSize: 64, color: '#fff', background: 'rgba(5,8,16,0.78)', border: `4px solid ${brand.colors.gold}`, borderRadius: 18, padding: '10px 28px'}}>{trUpper(t.badge)}</span>
					</div>
				) : null}
				<div style={{position: 'absolute', left: 80, top: 210, display: 'flex', alignItems: 'center', gap: 12}}>
					<div style={{width: 12, height: 40, background: brand.colors.red, borderRadius: 3}} />
					<div style={{fontFamily: FONTS.display, fontSize: 42, letterSpacing: 5, color: '#fff'}}>{brand.watermark.text}</div>
				</div>
			</AbsoluteFill>
		</BrandCtx.Provider>
	);
};
