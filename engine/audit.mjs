// Yerleşim denetimi: WebGL çizilmeden (lite) her N. kareyi tarar, [OVERFLOW] kayıtlarını JSON'a yazar.
// Kullanım: node audit.mjs --step 3 --out ../build/x/audit_log.json
import {renderStill} from '@remotion/renderer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseArgs, prepare} from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const step = Number(args.step ?? 3);
const {serveUrl, browserExecutable, chromiumOptions, composition} = await prepare({inputProps: {lite: true}});
const logs = [];
const tmp = path.join(os.tmpdir(), 'vayy-audit.png');
const t0 = Date.now();
let n = 0;
for (let f = 0; f < composition.durationInFrames; f += step) {
	await renderStill({
		composition,
		serveUrl,
		frame: f,
		output: tmp,
		scale: 0.25,
		browserExecutable,
		chromiumOptions,
		inputProps: {...composition.props, lite: true},
		licenseKey: 'free-license',
		onBrowserLog: (l) => {
			if (l.text.includes('[OVERFLOW]')) logs.push({type: l.type, text: l.text});
		},
	});
	n++;
}
fs.writeFileSync(args.out ?? 'audit_log.json', JSON.stringify({frames_checked: n, step, logs}, null, 1));
console.log(`[audit] ${n} kare tarandı, ${logs.length} bulgu (${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
