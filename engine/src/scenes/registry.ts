import type React from 'react';
import {EarthScene} from './EarthScene';
import {RoadScene} from './RoadScene';
import {TitleScene} from './TitleScene';
import {CardsScene} from './CardsScene';
import {FlapScene} from './FlapScene';
import {MediaScene} from './MediaScene';
import {KpiScene} from './KpiScene';
import {EconScene} from './EconScene';
import {World3DScene} from '../three/World3DScene';

// Sahne türü -> bileşen. Yeni sahne türü eklemek için buraya kaydedin.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SCENES: Record<string, React.FC<any>> = {
	earth: EarthScene,
	road: RoadScene,
	title: TitleScene,
	cards: CardsScene,
	flap: FlapScene,
	media: MediaScene,
	kpi: KpiScene,
	econ: EconScene, // ekonomi simülasyonu (telefon/banka/fiyat/finale)
	world3d: World3DScene, // Three.js 3D motoru (engine/src/three)
};
