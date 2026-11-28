import React from 'react';
import {useCurrentFrame} from 'remotion';
import {vec, VecKey} from '../core/math';

export const DropBench: React.FC<{track: VecKey[]}> = ({track}) => {
	const frame = useCurrentFrame();
	return <group>
		<mesh position={[.215, .91, 1.8]} castShadow receiveShadow>
			<boxGeometry args={[.72, .075, .46]}/><meshStandardMaterial color="#a36c43" roughness={.53}/>
		</mesh>
		{[-.09,.52].flatMap(x => [1.62,1.98].map(z =>
			<mesh key={x+':'+z} position={[x,.445,z]} castShadow><boxGeometry args={[.055,.89,.055]}/><meshStandardMaterial color="#243e48"/></mesh>))}
		<mesh position={vec(frame, track, [.215,1.025,1.68])} castShadow>
			<sphereGeometry args={[.078,24,16]}/><meshStandardMaterial color="#ff7133" roughness={.36}/>
		</mesh>
	</group>;
};
