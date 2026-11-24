import React from 'react';
import {AbsoluteFill, Freeze} from 'remotion';
import {SCENES} from './scenes/registry';
import {BrandCtx, DEFAULT_BRAND, FONTS} from './lib/theme';
import {EarthScene} from './scenes/EarthScene';
import {trUpper} from './lib/tr';
import type {ShortProps} from './types';
import './lib/fonts';

// Kapak görseli (9:16): hook sahnesinin kapsül POV'u + iri başlık. Metinler konu JSON'undan gelir.
// scene + frame verilirse o sahnenin (ör. world3d) ilgili karesi arka plan olarak dondurulur.
type ThumbSpec = {kicker: string; lines: {text: string; color?: string}[]; badge?: string; pitch?: number; scene?: string; frame?: number};

const t0 = (t?: ThumbSpec) => Boolean(t?.scene);

export const Thumbnail: React.FC<ShortProps & {thumb?: ThumbSpec}> = ({timeline, thumb}) => {
	const brand = {...DEFAULT_BRAND, ...(timeline?.brand ?? {})};
	const bgScene = t0(thumb) && timeline?.scenes.find((s) => s.id === thumb!.scene);
	const hook = bgScene ? undefined : timeline?.scenes.find((s) => s.type === 'earth');
	const BG = bgScene ? SCENES[bgScene.type] : null;
	const t: ThumbSpec = thumb ?? {kicker: 'Red Bull', lines: [{text: 'Neden?'}]};
	return (
		<BrandCtx.Provider value={brand}>
			<AbsoluteFill style={{background: '#000'}}>
				{BG && bgScene ? (
					<Freeze frame={thumb?.frame ?? 0}>
						<BG {...(bgScene.props as object)} titles={[]} />
					</Freeze>
				) : null}
				{hook ? <EarthScene {...(hook.props as object)} keys={[{t: 0, lat: 33.4, lon: -104.5, alt: 39, heading: 75, pitch: t.pitch ?? 6, roll: -4, fov: 100, fisheye: 0.85}]} titles={[]} labels={[]} /> : null}
				<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.0) 45%, rgba(0,0,0,0.0) 60%, rgba(0,0,0,0.8) 100%)'}} />
				<div style={{position: 'absolute', left: 80, right: 80, top: 300, textAlign: 'center'}}>
					<div style={{display: 'inline-block', background: brand.colors.red, color: '#fff', fontFamily: FONTS.ui, fontWeight: 700, fontSize: 44, letterSpacing: 8, padding: '8px 22px', borderRadius: 10}}>{trUpper(t.kicker)}</div>
					<div style={{marginTop: 22}}>
						{t.lines.map((l, i) => (
							<div key={i} style={{fontFamily: FONTS.display, fontSize: 196, lineHeight: 1.0, color: l.color === 'gold' ? brand.colors.gold : l.color === 'red' ? brand.colors.red : '#fff', filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.85)) drop-shadow(0 0 40px rgba(0,0,0,0.5))', whiteSpace: 'nowrap'}}>
								{trUpper(l.text)}
							</div>
						))}
					</div>
				</div>
				{t.badge ? (
					<div style={{position: 'absolute', left: 80, right: 80, bottom: 600, textAlign: 'center'}}>
						<div style={{display: 'inline-block', whiteSpace: 'nowrap', fontFamily: FONTS.sans, fontWeight: 900, fontSize: 60, color: '#fff', background: 'rgba(5,8,16,0.8)', border: `5px solid ${brand.colors.gold}`, borderRadius: 18, padding: '12px 30px'}}>{trUpper(t.badge)}</div>
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
