// Ortak: bundle + kompozisyon seçimi (render.mjs ve still.mjs kullanır)
import {bundle} from '@remotion/bundler';
import {selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));

export const findBrowser = () => {
	if (process.env.REMOTION_BROWSER && fs.existsSync(process.env.REMOTION_BROWSER)) return process.env.REMOTION_BROWSER;
	const base = '/opt/pw-browsers';
	if (fs.existsSync(base)) {
		for (const d of fs.readdirSync(base).filter((d) => d.startsWith('chromium_headless_shell')).sort().reverse()) {
			const p = path.join(base, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
			if (fs.existsSync(p)) return p;
		}
	}
	return null; // Remotion kendi chrome-headless-shell'ini indirir
};

export const parseArgs = (argv) => {
	const a = {};
	for (let i = 0; i < argv.length; i++) {
		if (argv[i].startsWith('--')) {
			const k = argv[i].slice(2);
			const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
			a[k] = v;
		}
	}
	return a;
};

export const prepare = async ({gl = 'swangle', id = 'Short', inputProps = {}} = {}) => {
	const t0 = Date.now();
	const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public')});
	const browserExecutable = findBrowser();
	const chromiumOptions = {gl, enableMultiProcessOnLinux: true};
	const composition = await selectComposition({serveUrl, id, inputProps, browserExecutable, chromiumOptions, logLevel: 'error'});
	console.log(`[engine] bundle+compose ${((Date.now() - t0) / 1000).toFixed(1)} sn · ${composition.durationInFrames} kare @${composition.fps}fps · tarayıcı: ${browserExecutable ?? 'remotion'}`);
	return {serveUrl, browserExecutable, chromiumOptions, composition};
};
