"""Modular factory bays with I-section columns, roof ties and process pipes."""
import math
import bpy
from mechanical import alloy
from experiment import box


def build(bays):
    beam = alloy("Painted structural steel", (.075,.15,.18), .65, .38)
    floor = alloy("Cast concrete", (.23,.22,.20), .05, .84)
    pipe = alloy("Copper supply line", (.39,.16,.06), .72, .31)

    def member(name, size, xyz, mat):
        part = box(name, size, xyz)
        part.data.materials.append(mat)
        edge = part.modifiers.new("Rolled edges", "BEVEL")
        edge.width, edge.segments = .006, 2

    width = bays * .8
    member("Foundation", (width+.35,1.48,.12), (0,0,.06), floor)
    for i in range(bays+1):
        x = .8*i-width/2
        for y in (-.62,.62):
            member("Column web", (.045,.12,1.47), (x,y,.85), beam)
            for side in (-1,1):
                member("Column flange", (.13,.022,1.47), (x,y+side*.065,.85), beam)
        member("Rafter", (.08,1.47,.11), (x,0,1.58), beam)
    for y in (-.40,-.22,.30):
        bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.057,depth=width+.22,
                                             location=(0,y,1.41),rotation=(0,math.pi/2,0))
        bpy.context.object.data.materials.append(pipe)
