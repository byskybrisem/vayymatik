"""Headless Blender benchmark scenes. SI scale, illustrative material constants."""
import math
from pathlib import Path
import bpy
from mathutils import Vector


def box(name, size, location):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def rigid(obj, passive=False):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.rigidbody.object_add()
    obj.rigid_body.type = "PASSIVE" if passive else "ACTIVE"
    obj.rigid_body.collision_shape = "BOX"
    obj.rigid_body.friction = .48


def fracture(scene, material):
    """Pre-scored tile assembled from solids linked by breakable fixed joints."""
    floor = box("Impact slab", (4,3,.12), (0,0,-.06))
    rigid(floor, True)
    pieces = {}
    for row in range(3):
        for col in range(4):
            local_x = (col-1.5)*.25
            obj = box("Ceramic segment", (.248,.27,.12),
                      (local_x*math.cos(.32),(row-1)*.272,1.35-local_x*math.sin(.32)))
            obj.rotation_euler.y = .32
            obj.data.materials.append(material)
            rigid(obj)
            obj.rigid_body.mass = .14
            obj.rigid_body.collision_margin = .001
            obj.rigid_body.use_margin = True
            pieces[row,col] = obj
            for key in [(row-1,col),(row,col-1)]:
                if key not in pieces:
                    continue
                neighbor = pieces[key]
                bpy.ops.object.empty_add(location=(neighbor.location+obj.location)/2)
                bpy.ops.rigidbody.constraint_add()
                joint = bpy.context.object.rigid_body_constraint
                joint.type = "FIXED"
                joint.object1, joint.object2 = neighbor, obj
                joint.use_breaking, joint.breaking_threshold = True, .05
    scene.rigidbody_world.point_cache.frame_end = scene.frame_end
    bpy.ops.ptcache.bake_all(bake=True)
    if not scene.rigidbody_world.point_cache.is_baked:
        raise RuntimeError("Rigid body bake incomplete")
    for frame in range(1, scene.frame_end + 1):
        scene.frame_set(frame)
        if any(min((obj.matrix_world @ Vector(v)).z for v in obj.bound_box) < .01
               for obj in pieces.values()):
            return [{"frame": frame - 1, "type": "tile_impact"}]
    return []


def fluid(scene, job, liquid, material):
    """Mantaflow grid solve with either a liquid obstacle or a fire/smoke inflow."""
    if liquid:
        obstacle = box("Baffle", (.22,1.3,.55), (.15,0,.275))
        mod = obstacle.modifiers.new("Obstacle","FLUID")
        mod.fluid_type = "EFFECTOR"
        source = box("Water column", (.85,1.22,1.4), (-.86,0,.76))
    else:
        mat = bpy.data.materials.new("Hot smoke")
        mat.use_nodes = True
        tree = mat.node_tree
        output = tree.nodes.get("Material Output")
        tree.nodes.remove(tree.nodes.get("Principled BSDF"))
        volume = tree.nodes.new("ShaderNodeVolumePrincipled")
        volume.inputs["Density"].default_value = 2
        volume.inputs["Blackbody Intensity"].default_value = 1
        tree.links.new(volume.outputs["Volume"], output.inputs["Volume"])
        source = box("Burner", (.46,.44,.18), (0,0,.19))
    source.hide_render = True
    flow = source.modifiers.new("Source", "FLUID")
    flow.fluid_type = "FLOW"
    flow.flow_settings.flow_type = "LIQUID" if liquid else "BOTH"
    flow.flow_settings.flow_behavior = "GEOMETRY" if liquid else "INFLOW"
    domain = box("Simulation domain", (2.8,1.5,2.3), (0,0,1.15))
    modifier = domain.modifiers.new("Mantaflow","FLUID")
    modifier.fluid_type = "DOMAIN"
    settings = modifier.domain_settings
    settings.domain_type = "LIQUID" if liquid else "GAS"
    settings.resolution_max = 40
    settings.cache_directory = str(Path(job['prefix']).parent / 'fluid-cache')
    settings.cache_frame_end = scene.frame_end
    settings.cache_type = "ALL"
    if liquid:
        settings.use_mesh = True
    domain.data.materials.append(material if liquid else mat)
    scene.frame_set(1)
    bpy.context.view_layer.objects.active = domain
    result = bpy.ops.fluid.bake_all()
    if 'FINISHED' not in result or not settings.has_cache_baked_data:
        raise RuntimeError("Mantaflow bake did not finish")
    for frame in range(1, scene.frame_end + 1):
        scene.frame_set(frame)
        evaluated = domain.evaluated_get(bpy.context.evaluated_depsgraph_get())
        if liquid:
            vertices = evaluated.data.vertices
            # Baffle upstream face is x=.04; allow half a simulation grid cell.
            active = len(vertices) > 8 and any(
                (evaluated.matrix_world @ v.co).x >= .04 - .5 * 2.8 / settings.resolution_max
                for v in vertices)
        else:
            field = evaluated.modifiers["Mantaflow"].domain_settings.flame_grid
            active = any(value > .02 for value in field)
        if active:
            return [{"frame": frame - 1, "type": "water_baffle" if liquid else "ignition"}]
    return []
