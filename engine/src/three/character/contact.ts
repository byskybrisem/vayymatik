// Two-link sagittal IK. Positive z is forward, positive drop is down.
export function solve(drop: number, forward: number, upper: number, lower: number, bend: number) {
	const cosine = (drop * drop + forward * forward - upper * upper - lower * lower) / (2 * upper * lower);
	const elbow = bend * Math.min(2.55, Math.acos(Math.max(-1, Math.min(1, cosine))));
	const shoulder = Math.atan2(-forward, drop) - Math.atan2(lower * Math.sin(elbow), upper + lower * Math.cos(elbow));
	return [shoulder, elbow];
}
export function gait(t: number, steps: number, stepTime: number, stride: number) {
	const phase = Math.max(0, Math.min(steps, t / stepTime));
	const count = Math.floor(phase);
	const u = phase - count;
	function foot(side: number) {
		const swinging = count % 2 === side;
		const previous = Math.max(0, count - (swinging ? 1 : 0)) * stride;
		const next = Math.min(steps, count + 1) * stride;
		const ease = u * u * (3 - 2 * u);
		return [previous + (swinging ? (next - previous) * ease : 0),
			swinging ? .095 * Math.sin(u * Math.PI) ** 2 : 0];
	}
	const feet = [foot(0), foot(1)];
	const root = (feet[0][0] + feet[1][0]) / 2;
	return {feet, root};
}
