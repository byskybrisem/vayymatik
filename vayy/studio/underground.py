"""Cutaway of three sediment layers surrounding a bored and lined tunnel."""
import math
import bpy
from mechanical import alloy, ring


def build():
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=.39, depth=4,
                                        rotation=(math.pi/2,0,0), location=(0,0,.74))
    cutter = bpy.context.object
    for i,(color,height,bottom) in enumerate([
        ((.18,.072,.038),.58,0), ((.41,.22,.095),.65,.58), ((.14,.085,.042),.25,1.23)]):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0,0,bottom+height/2))
        layer = bpy.context.object
        layer.name = f"Sediment layer {i+1}"
        layer.dimensions = (2.95,1.7,height)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        layer.data.materials.append(alloy(layer.name,color,0,.89))
        bore = layer.modifiers.new("Tunnel bore","BOOLEAN")
        bore.operation = "DIFFERENCE"
        bore.object = cutter
        bpy.ops.object.modifier_apply(modifier=bore.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
    concrete = alloy("Precast lining",(.40,.39,.35),0,.85)
    for i in range(12):
        lining = ring(f"Lining {i+1}",.39,.345,.134,.74,concrete)
        lining.rotation_euler.x = math.pi/2
        lining.location.y = -.74 + i*.14
    bpy.ops.object.light_add(type="POINT",location=(0,-.35,.84))
    lamp = bpy.context.object.data
    lamp.energy, lamp.color, lamp.shadow_soft_size = 8,(1,.64,.31),.08
