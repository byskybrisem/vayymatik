import '@fontsource/anton/400.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/800.css';
import '@fontsource/montserrat/900.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/700.css';
import {continueRender, delayRender} from 'remotion';

// Fontlar yüklenmeden kare alınmasın (Türkçe glifler latin-ext alt kümesinde).
const SAMPLE = 'ĞÜŞİÖÇğüşıöç 0123456789 €';
const specs = ['400 40px Anton', '600 40px Montserrat', '800 40px Montserrat', '900 40px Montserrat', '500 40px Inter', '700 40px Inter', '700 40px "JetBrains Mono"'];

if (typeof document !== 'undefined') {
	const h = delayRender('Fontlar yükleniyor');
	Promise.all(specs.map((s) => document.fonts.load(s, SAMPLE)))
		.then(() => document.fonts.ready)
		.then(() => continueRender(h))
		.catch((e) => {
			console.error('Font yükleme hatası', e);
			continueRender(h);
		});
}
