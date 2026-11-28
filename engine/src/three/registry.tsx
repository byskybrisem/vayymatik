import {DropBench} from "./objects/DropBench";
// 3D nesne türü kayıt defteri: JSON'daki "kind" → bileşen. Yeni nesne eklemek için buraya bir satır ekleyin.
import type React from 'react';
import {Character} from './character/Character';
import {Banknote, CashStack, Car, Chair, Coin, CoinStack, Desk, DeskLamp, Glow, GoldBar, GoldPile, Laptop} from './objects/props';
import {Room} from './env/Room';
import {City, Tower} from './env/City';
import {Sky} from './env/Sky';
import {Dust, LightCone, MoneySwirl} from './fx/Particles';
import {GrowthChart3D} from './charts/GrowthChart3D';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const OBJECTS: Record<string, React.FC<any>> = {
	dropBench: DropBench,
	character: Character,
	desk: Desk,
	chair: Chair,
	lamp: DeskLamp,
	laptop: Laptop,
	banknote: Banknote,
	cash: CashStack,
	coin: Coin,
	coins: CoinStack,
	goldBar: GoldBar,
	goldPile: GoldPile,
	car: Car,
	glow: Glow,
	room: Room,
	city: City,
	tower: Tower,
	sky: Sky,
	dust: Dust,
	moneySwirl: MoneySwirl,
	lightCone: LightCone,
	chart: GrowthChart3D,
};
