import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {cancelRender, continueRender, delayRender} from 'remotion';

export type Uniforms = Record<string, number | number[]>;
export type TexSpec = {name: string; src: string; repeatX?: boolean; mipmap?: boolean};

const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

const imageCache = new Map<string, Promise<HTMLImageElement>>();
const loadImage = (src: string) => {
	let p = imageCache.get(src);
	if (!p) {
		p = new Promise<HTMLImageElement>((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => resolve(img);
			img.onerror = () => reject(new Error(`Doku yüklenemedi: ${src}`));
			img.src = src;
		});
		imageCache.set(src, p);
	}
	return p;
};

type GLState = {
	gl: WebGL2RenderingContext;
	prog: WebGLProgram;
	locs: Map<string, WebGLUniformLocation | null>;
};

const compile = (gl: WebGL2RenderingContext, type: number, src: string) => {
	const s = gl.createShader(type)!;
	gl.shaderSource(s, src);
	gl.compileShader(s);
	if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
		throw new Error('Shader derleme hatası: ' + gl.getShaderInfoLog(s));
	}
	return s;
};

/**
 * Tam ekran fragment shader çalıştırıcı. Remotion her kare için uniform'ları
 * günceller; çizim useLayoutEffect içinde eşzamanlı yapılır (ekran görüntüsünden önce).
 */
export const GLCanvas: React.FC<{
	frag: string;
	uniforms: Uniforms;
	textures?: TexSpec[];
	width: number;
	height: number;
	scale?: number; // iç çizim çözünürlüğü (WebGL) — CSS ile tam boyuta büyütülür
	style?: React.CSSProperties;
}> = ({frag, uniforms, textures = [], width: outW, height: outH, scale = 0.75, style}) => {
	const width = Math.round(outW * scale);
	const height = Math.round(outH * scale);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const stateRef = useRef<GLState | null>(null);
	const [handle] = useState(() => delayRender('GLCanvas: doku ve shader'));
	const [ready, setReady] = useState(false);
	const doneRef = useRef(false);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const canvas = canvasRef.current!;
				const gl = canvas.getContext('webgl2', {
					preserveDrawingBuffer: true,
					antialias: false,
					alpha: false,
					premultipliedAlpha: false,
				});
				if (!gl) throw new Error('WebGL2 yok');
				const prog = gl.createProgram()!;
				gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
				gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, frag));
				gl.linkProgram(prog);
				if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('Link hatası: ' + gl.getProgramInfoLog(prog));
				gl.useProgram(prog);
				const buf = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, buf);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
				const loc = gl.getAttribLocation(prog, 'aPos');
				gl.enableVertexAttribArray(loc);
				gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
				const imgs = await Promise.all(textures.map((t) => loadImage(t.src)));
				if (cancelled) return;
				gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
				gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
				gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
				textures.forEach((t, i) => {
					const tex = gl.createTexture();
					gl.activeTexture(gl.TEXTURE0 + i);
					gl.bindTexture(gl.TEXTURE_2D, tex);
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[i]);
					const mip = t.mipmap !== false;
					if (mip) gl.generateMipmap(gl.TEXTURE_2D);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, t.repeatX ? gl.REPEAT : gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					const ext = gl.getExtension('EXT_texture_filter_anisotropic');
					if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);
					gl.uniform1i(gl.getUniformLocation(prog, t.name), i);
				});
				stateRef.current = {gl, prog, locs: new Map()};
				setReady(true);
			} catch (e) {
				cancelRender(e as Error);
			}
		})();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useLayoutEffect(() => {
		const st = stateRef.current;
		if (!ready || !st) return;
		const {gl, prog, locs} = st;
		gl.viewport(0, 0, width, height);
		const u = {uRes: [width, height], ...uniforms};
		for (const [k, v] of Object.entries(u)) {
			if (!locs.has(k)) locs.set(k, gl.getUniformLocation(prog, k));
			const l = locs.get(k);
			if (!l) continue;
			if (typeof v === 'number') gl.uniform1f(l, v);
			else if (v.length === 2) gl.uniform2fv(l, v);
			else if (v.length === 3) gl.uniform3fv(l, v);
			else if (v.length === 4) gl.uniform4fv(l, v);
		}
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		gl.finish();
		if (!doneRef.current) {
			doneRef.current = true;
			continueRender(handle);
		}
	});

	return <canvas ref={canvasRef} width={width} height={height} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', ...style}} />;
};
