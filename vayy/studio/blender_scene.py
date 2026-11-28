"""Headless Cycles renderer. Invocation is owned by vayy.studio."""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mechanical import alloy, ring

job = json.loads(sys.argv[sys.argv.index("--") + 1])
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = job["samples"]
scene.cycles.seed = job["seed"]
scene.cycles.use_denoising = False
scene.render.resolution_x, scene.render.resolution_y = job["size"]
scene.render.resolution_percentage = 100
scene.frame_end = job["frames"]
scene.render.fps = job["fps"]


brass = alloy("Satin brass", (.54, .28, .065), .8, .26)
steel = alloy("Machined steel", (.33, .41, .48), .91, .23)
slate = alloy("Graphite", (.025, .044, .058), .35, .38)


events = []
if job["template"] == "underground-section":
    from underground import build
    build()
elif job["template"] == "factory-bay":
    from factory import build
    build(job["bays"])
elif job["template"] == "fracture":
    from experiment import fracture
    events = fracture(scene, brass)
elif job["template"] in ("water-baffle", "fire-plume"):
    from experiment import fluid
    events = fluid(scene, job, job["template"] == "water-baffle", alloy("Water", (.03,.30,.51),.08,.16))
else:
    ring("Sectioned housing", 1.36, 1.18, .87, .12, slate, arc=math.pi*1.23)
    ring("Lower bearing", 1.22, .31, .13, .06, steel)
    for index in range(3):
        z = .24 + index * .22
        rotor = ring("Rotor %d" % index, 1.02, .41, .14, z, brass if index%2==0 else steel, job["teeth"])
        rotor.rotation_euler.z = index * .13
        rotor.keyframe_insert(data_path="rotation_euler", frame=1)
        rotor.keyframe_insert(data_path="location", frame=1)
        rotor.location.z += index * .31
        rotor.rotation_euler.z += (index + 1) * .38
        rotor.keyframe_insert(data_path="rotation_euler", frame=scene.frame_end)
        rotor.keyframe_insert(data_path="location", frame=scene.frame_end)
    ring("Hollow shaft", .39, .24, 1.45, .07, steel)
Path(job["prefix"]).with_suffix(".json").write_text(json.dumps(events))
scene.frame_set(1)
bpy.ops.mesh.primitive_plane_add(size=200)
bpy.context.object.data.materials.append(slate)


def aim(obj, point):
    obj.rotation_euler = (Vector(point)-obj.location).to_track_quat("-Z", "Y").to_euler()


for loc, energy, color, size in [((1,-4,6),570,(1,.78,.55),4),((-4,1,3),410,(.38,.68,1),3),((2,3,4),720,(1,.94,.8),2)]:
    bpy.ops.object.light_add(type="AREA", location=loc)
    light = bpy.context.object
    light.data.energy, light.data.color, light.data.size = energy, color, size
    aim(light,(0,0,.5))
bpy.ops.object.camera_add()
cam = scene.camera = bpy.context.object
cam.data.lens = 47
if job.get("cameraProfile") == "original":
    for frame, loc in [(1, (3,-5,3.3)), (scene.frame_end, (2,-5,3.5))]:
        cam.location = Vector(loc) * max(1, job["size"][1]/job["size"][0])
        aim(cam, (0,0,.73))
        cam.keyframe_insert(data_path="location", frame=frame)
        cam.keyframe_insert(data_path="rotation_euler", frame=frame)
else:
    from cinematography import place
    place(scene, cam, job)
scene.render.filepath = job["prefix"]
scene.render.image_settings.file_format = "PNG"
bpy.ops.render.render(animation=True)
