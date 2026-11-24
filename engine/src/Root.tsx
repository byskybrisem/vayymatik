import React from 'react';
import {CalculateMetadataFunction, Composition, staticFile} from 'remotion';
import {Short} from './Video';
import {Thumbnail} from './Thumbnail';
import type {ShortProps, Timeline} from './types';

const calculateMetadata: CalculateMetadataFunction<ShortProps> = async ({props, abortSignal}) => {
	let timeline = props.timeline ?? null;
	if (!timeline) {
		const res = await fetch(staticFile('current/timeline.json'), {signal: abortSignal});
		timeline = (await res.json()) as Timeline;
	}
	return {
		durationInFrames: timeline.durationInFrames,
		fps: timeline.fps,
		width: timeline.width,
		height: timeline.height,
		props: {...props, timeline},
	};
};

export const RemotionRoot: React.FC = () => {
	return (
		<>
		<Composition
			id="Thumbnail"
			component={Thumbnail}
			durationInFrames={1}
			fps={30}
			width={1080}
			height={1920}
			defaultProps={{topic: 'current', timeline: null} as ShortProps}
			calculateMetadata={async (o) => {
				const m = await calculateMetadata(o);
				return {...m, durationInFrames: 1};
			}}
		/>
		<Composition
			id="Short"
			component={Short}
			durationInFrames={300}
			fps={30}
			width={1080}
			height={1920}
			defaultProps={{topic: 'current', timeline: null} as ShortProps}
			calculateMetadata={calculateMetadata}
		/>
		</>
	);
};
