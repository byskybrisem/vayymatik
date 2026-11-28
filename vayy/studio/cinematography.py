"""Small repeatable camera paths for headless Cycles shots, in metres."""
import math
from mathutils import Vector


def place(scene, camera, job):
    profile = job.get("cameraProfile", "short-orbit")
    scale = max(1, job["size"][1] / job["size"][0])
    target = Vector((0, 0, .73))
    for frame in range(1, scene.frame_end + 1):
        t = (frame - 1) / max(1, scene.frame_end - 1)
        u = t * t * (3 - 2 * t)
        angle = -.99 - (.23 * u if profile == "short-orbit" else 0)
        distance = 5.55 - (.90 * u if profile == "dolly" else 0)
        offset = Vector((distance * math.cos(angle), distance * math.sin(angle), 2.58))
        if profile == "handheld":
            seconds = (frame - 1) / scene.render.fps
            offset.x += .018 * math.sin(2.8 * seconds)
            offset.z += .012 * math.sin(2.2 * seconds)
        camera.location = target + scale * offset
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        camera.keyframe_insert(data_path="location", frame=frame)
        camera.keyframe_insert(data_path="rotation_euler", frame=frame)
