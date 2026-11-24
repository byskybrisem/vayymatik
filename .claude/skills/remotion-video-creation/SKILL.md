---
name: remotion-video-creation
description: Use automatically for Remotion video composition, React/Three.js animation, timing, transitions and captions. Reuse the VAYYMATIK engine.
---

# Remotion video creation — selected ECC rules
Adapted index for VAYYMATİK. The five linked rule files are copied from ECC commit 4adeee6732a12d1540f49a4d50a38ce8c97f9a53; see LICENSE and SOURCE.md.
- Start with the existing topic JSON, not a new composition. Read AGENTS.md and engine/src/three/README.md for the project contract.
- Only read the relevant reference when touching implementation: [3d](rules/3d.md), [animations](rules/animations.md), [timing](rules/timing.md), [transitions](rules/transitions.md), [display-captions](rules/display-captions.md).
- The project already has its own transition, caption and audio implementations. Reference examples are optional, not install instructions. Do not add packages or replace existing systems unless necessary and justified.
- Drive motion by frame, use existing timing helpers, respect current pinned package versions and check changed APIs via Context7 if available.
- Preview selected frames before full render; use existing CLI.
