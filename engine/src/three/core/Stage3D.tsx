// Remotion ↔ Three.js sahnesi: ThreeCanvas + sinematik renderer ayarları.
// Animasyonlar YALNIZCA useCurrentFrame() ile sürülür (useFrame yok) → kare bazlı, deterministik.
import React from 'react';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {useVideoConfig} from 'remotion';
import {useThree} from '@react-three/fiber';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';

export type StageProps = {
	bg?: string;
	fog?: {color: string; near: number; far: number} | null;
	exposure?: number;
	shadows?: boolean;
	/** Çözünürlük ölçeği (GPU'suz hızlı önizleme için 0.5–0.75; final 1) */
	scale?: number;
	/** Prosedürel stüdyo ortam haritası (gerçekçi yansımalar). 0/boş = kapalı */
	env?: number;
	children: React.ReactNode;
};

const EnvMap: React.FC<{intensity: number}> = ({intensity}) => {
	const {gl, scene} = useThree();
	React.useMemo(() => {
		const pm = new THREE.PMREMGenerator(gl);
		const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
		scene.environment = tex;
		scene.environmentIntensity = intensity;
		pm.dispose();
	}, [gl, scene, intensity]);
	return null;
};

export const Stage3D: React.FC<StageProps> = ({bg = '#05070D', fog, exposure = 1, shadows = true, scale = 1, env = 0, children}) => {
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
			{env > 0 ? <EnvMap intensity={env} /> : null}
			{fog ? <fog attach="fog" args={[fog.color, fog.near, fog.far]} /> : null}
			{children}
		</ThreeCanvas>
	);
};
