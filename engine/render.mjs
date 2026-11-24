// Kullanım: node render.mjs --out ../build/x/video.mp4 [--crf 16] [--concurrency 4] [--frames 0-299] [--log log.json]
import {renderMedia} from '@remotion/renderer';
import fs from 'node:fs';
import {parseArgs, prepare} from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const out = args.out ?? 'out/video.mp4';
const {serveUrl, browserExecutable, chromiumOptions, composition} = await prepare({gl: args.gl ?? 'swangle'});
const logs = [];
let last = 0;
const t0 = Date.now();
await renderMedia({
	composition,
	serveUrl,
	codec: 'h264',
	outputLocation: out,
	browserExecutable,
	chromiumOptions,
	muted: true,
	imageFormat: 'jpeg',
	jpegQuality: 94,
	crf: Number(args.crf ?? 18),
	encodingMaxRate: args.maxrate ?? '16M',
	encodingBufferSize: args.bufsize ?? '32M',
	x264Preset: args.preset ?? 'slow',
	pixelFormat: 'yuv420p',
	colorSpace: 'bt709',
	concurrency: Number(args.concurrency ?? 4),
	frameRange: args.frames ? args.frames.split('-').map(Number) : null,
	licenseKey: 'free-license',
	timeoutInMilliseconds: 120000,
	onBrowserLog: (l) => {
		if (l.type === 'error' || l.type === 'warning' || /\[(OVERFLOW|QA)\]/.test(l.text)) logs.push({type: l.type, text: l.text});
	},
	onProgress: ({progress, renderedFrames}) => {
		const now = Date.now();
		if (now - last > 15000 || progress === 1) {
			last = now;
			console.log(`[render] %${(progress * 100).toFixed(0)} · ${renderedFrames} kare · ${((now - t0) / 1000).toFixed(0)} sn`);
		}
	},
});
if (args.log) fs.writeFileSync(args.log, JSON.stringify(logs, null, 2));
console.log(`[render] bitti: ${out} (${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
