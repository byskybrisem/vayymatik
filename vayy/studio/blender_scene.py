"""Headless Cycles renderer. Invocation is owned by vayy.studio."""
import json
import math
import sys

import bpy
from mathutils import Vector

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


def alloy(name, color, metal, rough):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    shader = tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = rough
    noise = tree.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 180
    bump = tree.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = .15
    bump.inputs["Distance"].default_value = .001
    tree.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    tree.links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    return mat


brass = alloy("Satin brass", (.54, .28, .065), .8, .26)
steel = alloy("Machined steel", (.33, .41, .48), .91, .23)
slate = alloy("Graphite", (.025, .044, .058), .35, .38)


def ring(name, outer, inner, height, z, material, teeth=0, arc=math.tau):
    """Closed annular mesh with radial tooth profile and capped section ends."""
    steps = teeth * 4 if teeth else 96
    vertices, faces = [], []
    closed = arc == math.tau
    for i in range(steps if closed else steps + 1):
        a = i * arc / steps
        r = outer + (.09 if teeth and i % 4 in (1, 2) else 0)
        for radius, level in ((r, 0), (r, height), (inner, height), (inner, 0)):
            vertices.append((radius * math.cos(a), radius * math.sin(a), level))
    for i in range(steps):
        for k in range(4):
            a = 4 * i
            b = 4 * ((i + 1) % (len(vertices) // 4))
            n = (k + 1) % 4
            faces.append((a+k, b+k, b+n, a+n))
    if not closed:
        faces.extend([(0, 1, 2, 3), tuple(reversed(range(len(vertices)-4, len(vertices))))])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj.location.z = z
    obj.data.materials.append(material)
    bevel = obj.modifiers.new("Edge highlights", "BEVEL")
    bevel.width, bevel.segments = .016, 3
    obj.modifiers.new("Machined normals", "WEIGHTED_NORMAL")
    return obj


ring("Sectioned housing", 1.36, 1.18, .87, .12, slate, arc=math.pi*1.23)
ring("Lower bearing", 1.22, .31, .13, .06, steel)
for index in range(3):
    z = .24 + index * .22
    rotor = ring("Rotor %d" % index, 1.02, .41, .14, z, brass if index%2==0 else steel, 24)
    rotor.rotation_euler.z = index * .13
    rotor.keyframe_insert(data_path="rotation_euler", frame=1)
    rotor.keyframe_insert(data_path="location", frame=1)
    rotor.location.z += index * .31
    rotor.rotation_euler.z += (index + 1) * .38
    rotor.keyframe_insert(data_path="rotation_euler", frame=scene.frame_end)
    rotor.keyframe_insert(data_path="location", frame=scene.frame_end)
ring("Hollow shaft", .39, .24, 1.45, .07, steel)
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
for frame, loc in [(1,(3,-5,3.3)),(scene.frame_end,(2,-5,3.5))]:
    cam.location = Vector(loc) * max(1, job["size"][1]/job["size"][0])
    aim(cam,(0,0,.73))
    cam.keyframe_insert(data_path="location",frame=frame)
    cam.keyframe_insert(data_path="rotation_euler",frame=frame)
scene.render.filepath = job["prefix"]
scene.render.image_settings.file_format = "PNG"
bpy.ops.render.render(animation=True)
