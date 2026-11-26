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
import {DeepScene} from '../ocean/DeepScene';
import {OceanScene} from '../ocean/OceanScene';
import {LabScene} from '../ocean/LabScene';
import {SignalScene} from '../ocean/SignalScene';
import {NewsScene} from '../ocean/NewsScene';
import {InfoScene} from '../ocean/InfoScene';
import {ChoiceScene} from '../ocean/ChoiceScene';

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
	deep3d: DeepScene, // derin deniz: su altı şehri, ROV, varlık, bacalar (engine/src/ocean)
	ocean: OceanScene, // GLSL okyanus: fırtına/gemi (storm) ve iniş/açık su (water)
	lab: LabScene, // kontrol odası ekranları: spektrogram, osiloskop, sonar, batimetri, liste, sayaç
	signal: SignalScene, // sinyal matematiği: asal sayılar, elek, π, glif, son mesaj
	news: NewsScene, // KURGUSAL haber, sosyal medya, varsayımsal piyasalar, toplantı
	info: InfoScene, // bilimsel infografikler (ışık, bölgeler, basınç, küre, SOFAR, hukuk)
	choice: ChoiceScene, // üç yol ve 'Sen olsaydın?'
};
