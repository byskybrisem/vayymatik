import type React from 'react';
import {EarthScene} from './EarthScene';
import {RoadScene} from './RoadScene';
import {TitleScene} from './TitleScene';
import {CardsScene} from './CardsScene';
import {FlapScene} from './FlapScene';
import {MediaScene} from './MediaScene';
import {KpiScene} from './KpiScene';

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
};
