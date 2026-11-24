// Kullanım: node still.mjs --frames 0,45,90 --dir ../build/x/stills [--scale 0.5]
import {renderStill} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs, prepare} from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const dir = args.dir ?? 'out/stills';
fs.mkdirSync(dir, {recursive: true});
const inputProps = args.props ? JSON.parse(fs.readFileSync(args.props, 'utf8')) : {};
const {serveUrl, browserExecutable, chromiumOptions, composition} = await prepare({gl: args.gl ?? 'swangle', id: args.comp ?? 'Short', inputProps});
const frames = (args.frames ?? '0').split(',').map(Number);
for (const f of frames) {
	const t = Date.now();
	const output = args.out ?? path.join(dir, `f${String(f).padStart(5, '0')}.png`);
	await renderStill({
		composition,
		serveUrl,
		frame: f,
		output,
		inputProps: composition.props,
		browserExecutable,
		chromiumOptions,
		scale: Number(args.scale ?? 1),
		licenseKey: 'free-license',
		timeoutInMilliseconds: 120000,
		onBrowserLog: (l) => {
			if (l.type === 'error' || /\[(OVERFLOW|QA)\]/.test(l.text)) console.log('[browser]', l.type, l.text);
		},
	});
	console.log(`[still] ${output} (${((Date.now() - t) / 1000).toFixed(1)} sn)`);
}
