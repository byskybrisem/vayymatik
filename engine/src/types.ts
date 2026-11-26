// Python hattı (vayy/timeline.py) ile paylaşılan zaman çizelgesi şeması.
export type WordStyle = 'accent' | 'gold' | 'white' | 'plain';

export type CaptionWord = {
	text: string; // ekranda görünen (Türkçe, büyük harfe motor çevirir)
	from: number; // kare (mutlak)
	to: number;
	style: WordStyle;
};

export type CaptionPage = {
	from: number;
	to: number;
	words: CaptionWord[];
};

export type TransitionSpec = {
	type: 'cut' | 'fade' | 'whip' | 'zoom' | 'flash' | 'glitch' | 'blur';
	dur: number; // kare
	dir?: 'left' | 'right' | 'up' | 'down';
};

export type SceneSpec = {
	id: string;
	type: string;
	from: number; // kare (mutlak)
	dur: number; // kare
	transitionIn?: TransitionSpec;
	props: Record<string, unknown>;
};

export type BrandSpec = {
	name: string;
	colors: Record<string, string>;
	safe: {top: number; bottom: number; left: number; right: number};
	captions: {
		centerY: number;
		maxWidth: number;
		fontSize: number;
		uppercase: boolean;
	};
	watermark: {text: string; show: boolean};
};

export type Timeline = {
	topic: string;
	fps: number;
	width: number;
	height: number;
	durationInFrames: number;
	brand: BrandSpec;
	audioSrc?: string | null;
	scenes: SceneSpec[];
	captions: CaptionPage[];
	language?: string;
	disclaimer?: {text: string; from: number; to: number}[];
	foreignWords?: string[];
};

export type ShortProps = {
	topic: string;
	timeline?: Timeline | null;
	audit?: boolean;
};
