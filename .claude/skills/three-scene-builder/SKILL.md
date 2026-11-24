---
name: three-scene-builder
description: Use automatically for cinematic 3D video scenes, character animation, camera, lighting, props and world3d JSON in VAYYMATIK.
---

# 3D scene builder
- Read engine/src/three/README.md and the relevant existing topic. Prefer registered objects and keyframes in world3d JSON. Extend registry only for genuinely missing assets.
- Establish a clear focal subject, depth, silhouette, lighting contrast, original stylized design and story-driven camera movement. Reference images guide mood only; do not copy text, logos or characters.
- Motion derives solely from useCurrentFrame and seeded rng; never use R3F useFrame or wall clock. Maintain stable light count, at most two shadow lights, reusable geometries and GPU-less swangle compatibility.
- Check pose/contact, camera clipping, shadows, text safe areas, and visual continuity using selected stills. Use stage.scale for low-cost previews, restore final quality.
- For implementation details consult remotion-video-creation/rules/3d.md and timing.md only as needed.
