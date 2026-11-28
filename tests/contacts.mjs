// Forward kinematics verifies the positions actually produced by the two-link solver.
import assert from 'node:assert/strict';
import {gait, solve} from '../engine/src/three/character/contact.ts';

let worstSlip = 0;
let worstTargetError = 0;
for (let frame = 0; frame < 90; frame++) {
  const seconds = frame / 30;
  const {feet, root} = gait(seconds, 6, .5, .24);
  const next = gait((frame + 1) / 30, 6, .5, .24);
  const support = 1 - Math.floor(seconds / .5) % 2;
  worstSlip = Math.max(worstSlip, Math.abs(feet[support][0] - next.feet[support][0]));
  assert.equal(feet[support][1], 0);
  for (const [z, lift] of feet) {
    const drop = .935 - .04 - .0575 - lift;
    const [hip, knee] = solve(drop, z - root, .44, .44, 1);
    assert(knee >= 0 && knee <= 2.55);
    const height = .44 * Math.cos(hip) + .44 * Math.cos(hip + knee);
    const forward = -.44 * Math.sin(hip) - .44 * Math.sin(hip + knee) + root;
    worstTargetError = Math.max(worstTargetError, Math.hypot(height - drop, forward - z));
  }
}
assert(worstSlip < 1e-8 && worstTargetError < 1e-8);
console.log({frames: 90, worstSlip, worstTargetError});
