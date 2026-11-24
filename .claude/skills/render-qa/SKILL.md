---
name: render-qa
description: Use automatically for video editing, FFmpeg validation, rendering, audio mixing, subtitles, quality checks or final video delivery in VAYYMATIK.
---

# Render and edit QA
Project-specific workflow; use existing vayy CLI and FFmpeg rather than paid editing/generation services.
- Run setup only if needed. For new or changed scenes preview representative beginning, transitions, middle and end frames with python3 -m vayy stills <slug> <frames>. Check framing, readability, motion continuity and original content.
- If engine code changes, run cd engine && npx tsc --noEmit. For audio-only changes use documented audio/remux commands rather than rerendering picture.
- Render with python3 -m vayy build <slug>; inspect actual Video-QA.json and sample frames, and listen to audio if tools allow. Check duration, dimensions, FPS, H.264/AAC, decode, black/frozen frames, safe areas, voice intelligibility and subtitle sync. Never claim visual/audio checks you could not perform.
- Fix failures at root cause, rerender only needed outputs. Do not suppress checks to get a pass. Report noncritical failures and unresolved blockers.
- Deliver actual MP4 or verified CI artifact plus metadata; never commit large output files or claim an unrendered file exists.
