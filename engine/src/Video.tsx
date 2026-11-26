import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import type {ShortProps} from './types';
import {BrandCtx, DEFAULT_BRAND} from './lib/theme';
import {SCENES} from './scenes/registry';
import {SceneWrap} from './components/SceneWrap';
import {Captions} from './components/Captions';
import {Disclaimers, GlobalFX, Watermark} from './components/Overlays';
import {Audit} from './components/Audit';
import {FlashLayer} from './components/FlashLayer';
import './lib/fonts';
import {registerForeignWords} from './lib/tr';

export const Short: React.FC<ShortProps> = ({timeline, audit, clean}) => {
	if (!timeline) return <AbsoluteFill style={{background: '#000'}} />;
	const brand = {...DEFAULT_BRAND, ...timeline.brand};
	registerForeignWords(timeline.foreignWords);
	return (
		<BrandCtx.Provider value={brand}>
			<AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
				{timeline.scenes.map((s) => {
					const C = SCENES[s.type];
					if (!C) throw new Error(`Bilinmeyen sahne türü: ${s.type}`);
					return (
						<Sequence key={s.id} from={s.from} durationInFrames={s.dur} name={`${s.id} (${s.type})`}>
							<SceneWrap spec={s}>
								<C {...s.props} />
							</SceneWrap>
						</Sequence>
					);
				})}
				<GlobalFX />
				{clean ? null : <Watermark />}
				{clean ? null : <Disclaimers items={timeline.disclaimer} />}
				{clean ? null : <Captions pages={timeline.captions} />}
				<FlashLayer scenes={timeline.scenes} />
				{timeline.audioSrc ? <Audio src={staticFile(timeline.audioSrc)} /> : null}
				{audit !== false && !clean ? <Audit scenes={timeline.scenes} /> : null}
			</AbsoluteFill>
		</BrandCtx.Provider>
	);
};
