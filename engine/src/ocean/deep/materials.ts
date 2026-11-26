// Derin deniz malzemeleri: tek bir paylaşılan uniform nesnesi (sahne başına) + önbellekli ShaderMaterial'lar.
import * as THREE from 'three';
import {BG_FRAG, GLOW_FRAG, GLOW_VERT, ROCK_FRAG, SNOW_FRAG, SNOW_VERT, STRUCT_FRAG, STRUCT_VERT} from './glsl';

export type Shared = {
	uSigma: {value: THREE.Vector3};
	uWater: {value: THREE.Color};
	uAmb: {value: THREE.Color};
	uLampPos: {value: THREE.Vector3[]};
	uLampDir: {value: THREE.Vector3[]};
	uLampI: {value: number};
	uLampCos: {value: number};
	uPtPos: {value: THREE.Vector3[]};
	uPtCol: {value: THREE.Vector3[]};
	uTime: {value: number};
	uPulse: {value: number};
	uPower: {value: number};
	uSurface: {value: number};
	uCore: {value: THREE.Vector3};
	uCoreCol: {value: THREE.Color};
	uSurfCol: {value: THREE.Color};
};

export const makeShared = (): Shared => ({
	uSigma: {value: new THREE.Vector3(0.11, 0.045, 0.032)},
	uWater: {value: new THREE.Color(0.003, 0.012, 0.02)},
	uAmb: {value: new THREE.Color(0.01, 0.02, 0.03)},
	uLampPos: {value: [new THREE.Vector3(), new THREE.Vector3()]},
	uLampDir: {value: [new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -1)]},
	uLampI: {value: 6},
	uLampCos: {value: Math.cos(0.42)},
	uPtPos: {value: [0, 1, 2, 3].map(() => new THREE.Vector3(0, -1e4, 0))},
	uPtCol: {value: [0, 1, 2, 3].map(() => new THREE.Vector3())},
	uTime: {value: 0},
	uPulse: {value: 0},
	uPower: {value: 1},
	uSurface: {value: 0},
	uCore: {value: new THREE.Vector3(0, 200, 0)},
	uCoreCol: {value: new THREE.Color(0.02, 0.1, 0.11)},
	uSurfCol: {value: new THREE.Color('#1a5a8c')},
});

const withShared = (shared: Shared, extra: Record<string, THREE.IUniform>) => ({...shared, ...extra}) as Record<string, THREE.IUniform>;

export const structMat = (
	shared: Shared,
	o: {base?: string; glow?: string; hex?: number; veins?: number; glowAmt?: number; mode?: number; seed?: number; side?: THREE.Side; spec?: number} = {},
) =>
	new THREE.ShaderMaterial({
		uniforms: withShared(shared, {
			uBase: {value: new THREE.Color(o.base ?? '#3a4654')},
			uGlow: {value: new THREE.Color(o.glow ?? '#35f2e0')},
			uHexScale: {value: o.hex ?? 0.35},
			uVeins: {value: o.veins ?? 0.35},
			uGlowAmt: {value: o.glowAmt ?? 1},
			uMode: {value: o.mode ?? 1},
			uSeedM: {value: o.seed ?? 1},
			uSpec: {value: o.spec ?? 0.22},
		}),
		vertexShader: STRUCT_VERT,
		fragmentShader: STRUCT_FRAG,
		side: o.side ?? THREE.FrontSide,
	});

export const rockMat = (shared: Shared, o: {base?: string; rough?: number} = {}) =>
	new THREE.ShaderMaterial({
		uniforms: withShared(shared, {uBase: {value: new THREE.Color(o.base ?? '#6a645a')}, uRough: {value: o.rough ?? 0.35}}),
		vertexShader: STRUCT_VERT,
		fragmentShader: ROCK_FRAG,
	});

export const glowMat = (shared: Shared, o: {color?: string; i?: number; kind?: number; side?: THREE.Side} = {}) =>
	new THREE.ShaderMaterial({
		uniforms: withShared(shared, {
			uColor: {value: new THREE.Color(o.color ?? '#3ff5e6')},
			uI: {value: o.i ?? 1},
			uKind: {value: o.kind ?? 0},
		}),
		vertexShader: GLOW_VERT,
		fragmentShader: GLOW_FRAG,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		side: o.side ?? THREE.DoubleSide,
	});

export const bgMat = (shared: Shared) =>
	new THREE.ShaderMaterial({
		uniforms: withShared(shared, {
			uGlowDir: {value: new THREE.Vector3(0, -0.2, -1)},
			uGlowCol: {value: new THREE.Color(0.02, 0.12, 0.13)},
			uGlowPow: {value: 18},
		}),
		vertexShader: GLOW_VERT,
		fragmentShader: BG_FRAG,
		side: THREE.BackSide,
		depthWrite: false,
	});

export const snowMat = (shared: Shared) =>
	new THREE.ShaderMaterial({
		uniforms: withShared(shared, {
			uBox: {value: new THREE.Vector3(36, 26, 36)},
			uDrift: {value: new THREE.Vector3(0.05, -0.06, 0.02)},
			uSize: {value: 0.045},
			uPxScale: {value: 900},
		}),
		vertexShader: SNOW_VERT,
		fragmentShader: SNOW_FRAG,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	});
