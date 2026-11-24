// Remotion ↔ Three.js sahnesi: ThreeCanvas + sinematik renderer ayarları.
// Animasyonlar YALNIZCA useCurrentFrame() ile sürülür (useFrame yok) → kare bazlı, deterministik.
import React from 'react';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {useVideoConfig} from 'remotion';

export type StageProps = {
	bg?: string;
	fog?: {color: string; near: number; far: number} | null;
	exposure?: number;
	shadows?: boolean;
	/** Çözünürlük ölçeği (GPU'suz hızlı önizleme için 0.5–0.75; final 1) */
	scale?: number;
	children: React.ReactNode;
};

export const Stage3D: React.FC<StageProps> = ({bg = '#05070D', fog, exposure = 1, shadows = true, scale = 1, children}) => {
	const {width, height} = useVideoConfig();
	return (
		<ThreeCanvas
			width={width}
			height={height}
			dpr={scale}
			shadows={shadows ? {type: THREE.PCFSoftShadowMap} : false}
			gl={{antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance'}}
			camera={{fov: 35, near: 0.1, far: 900, position: [0, 1.6, 5]}}
			style={{backgroundColor: bg}}
			onCreated={({gl}) => {
				gl.toneMapping = THREE.ACESFilmicToneMapping;
				gl.toneMappingExposure = exposure;
				gl.outputColorSpace = THREE.SRGBColorSpace;
			}}
		>
			<color attach="background" args={[bg]} />
			{fog ? <fog attach="fog" args={[fog.color, fog.near, fog.far]} /> : null}
			{children}
		</ThreeCanvas>
	);
};
