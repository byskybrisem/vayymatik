"""Blender mesh builders for machined parts."""
import math

import bpy


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
    bpy.context.scene.collection.objects.link(obj)
    obj.location.z = z
    obj.data.materials.append(material)
    bevel = obj.modifiers.new("Edge highlights", "BEVEL")
    bevel.width, bevel.segments = .016, 3
    obj.modifiers.new("Machined normals", "WEIGHTED_NORMAL")
    return obj


