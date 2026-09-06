import bpy
import bmesh
import math
import os
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'blender')
TEX = os.path.join(ROOT, 'public', 'assets', 'textures')
os.makedirs(OUT, exist_ok=True)

# Silo 47 is a habitation silo: seven residential levels and a secure unit at
# the top, built around an open light well. Nobody in it knows why the world
# ended. Same authoring convention as the other generators — Y is up, +Z is
# depth, a cylinder's own axis is local Z so a vertical one needs UP.
# Visual rebuild revision 10: a protected top stair head, family-sized homes,
# solid furniture layouts and front-facing signage, on top of the watertight
# gallery and exact stair connections from revision nine.
ORIENTATION_MARKER = 'LS_ORIENT_YUP'
UP = (math.pi / 2, 0, 0)

# --- Silo dimensions, shared with the runtime -------------------------------
# Seven residential levels and a secure unit above them, around an open shaft.
# Every level is an unbroken circular walkway — nothing stands on it — and the
# outer wall of that walkway is nothing but front doors.
SHELL_RADIUS = 30.8      # the concrete shell, behind the back wall of the homes
WELL_RADIUS = 13.0       # the open shaft the walkways look down into
DECK_OUTER = 19.6        # 6.6 m of clear walkway, all the way round
LEVEL_HEIGHT = 4.0
LEVELS = 7               # residential levels
SEGMENTS = 12            # 11 family homes + one service bay per level:
                         # 77 homes in all, averaging 3.9 residents
STAIR_RADIUS = 5.4       # the great stair spirals down the middle of the shaft
STAIR_COLUMN = 1.2       # a slim service core, not a drum filling the well
STAIR_STEPS = 36         # a full turn per level, so every landing is above the last
APARTMENT_BACK = 29.6    # rear wall of every home: ten metres deep
DOOR_HALF = .84          # 1.68 m clear opening; comfortable for a player capsule
# The tunnel's own front wall — haunches plus spandrel — is this wide either
# side of the bay's centre line. The bay is 5.31 m, so the ring has to fill the
# rest of it: without that the player is looking through a two-metre slot at
# the concrete shell twelve metres behind the wall, on all eight levels.
TUNNEL_WALL_HALF = 3.44
TUNNEL_WALL_DEPTH = .30

TUNNEL_BAY = 6           # the bay whose facade is left out of the level ring,
                         # so the arched tunnel has an opening to stand in. The
                         # ring is one mesh placed on every level, so this has
                         # to be the same bearing on all of them — which is what
                         # you want from a landmark anyway. Bay 0 is the stair
                         # landing, so the tunnel faces it across the well.
LANDING_HALF = 1.8       # half-width of the stair landing, and of the gap it
                         # needs in the gallery railing to reach the floor
LANDING_INNER = STAIR_COLUMN + .18
# The stair guard follows a circle, while the landing opening has straight
# sides. Their exact meeting angle is therefore asin(width / radius). Clipping
# the first and last guard panels to this bearing avoids both an unsafe metre-
# wide void and a rail intruding across the accessible route.
STAIR_GUARD_RADIUS = STAIR_RADIUS + .16
LANDING_OPENING_ANGLE = math.asin(LANDING_HALF / STAIR_GUARD_RADIUS)


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def mat(name, color, metallic=0.0, roughness=0.7, emission=None, strength=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        for key in ('Emission Color', 'Emission'):
            if key in bsdf.inputs:
                bsdf.inputs[key].default_value = (*emission, 1.0)
        if 'Emission Strength' in bsdf.inputs:
            bsdf.inputs['Emission Strength'].default_value = strength
    return m


def image_pbr(name, color_file, normal_file, rough_file, tint=(1, 1, 1, 1), metallic=0.0,
              normal_strength=.7, roughness_range=None):
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = tint
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = .82

    def image_node(filename, noncolor=False):
        path = os.path.join(TEX, filename)
        if not os.path.exists(path):
            return None
        node = nt.nodes.new('ShaderNodeTexImage')
        node.image = bpy.data.images.load(path, check_existing=True)
        if noncolor:
            node.image.colorspace_settings.name = 'Non-Color'
        return node

    c = image_node(color_file)
    n = image_node(normal_file, True)
    r = image_node(rough_file, True)
    if c:
        nt.links.new(c.outputs['Color'], bsdf.inputs['Base Color'])
    if r:
        if roughness_range:
            ramp = nt.nodes.new('ShaderNodeValToRGB')
            ramp.color_ramp.elements[0].color = (*([roughness_range[0]] * 3), 1.0)
            ramp.color_ramp.elements[1].color = (*([roughness_range[1]] * 3), 1.0)
            nt.links.new(r.outputs['Color'], ramp.inputs['Fac'])
            nt.links.new(ramp.outputs['Color'], bsdf.inputs['Roughness'])
        else:
            nt.links.new(r.outputs['Color'], bsdf.inputs['Roughness'])
    if n:
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nm.inputs['Strength'].default_value = normal_strength
        nt.links.new(n.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def has_image(material):
    if not material or not material.use_nodes:
        return False
    return any(n.type == 'TEX_IMAGE' for n in material.node_tree.nodes)


def world_uv(o, tile=2.2):
    """Project UVs from world coordinates: correct density and aspect at source."""
    if o.type != 'MESH' or not any(has_image(m) for m in o.data.materials):
        return o
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.cube_project(cube_size=tile, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    return o


def bevel(o, width=.025, segments=2):
    if o.type != 'MESH' or not width:
        return o
    mod = o.modifiers.new('LS_Bevel', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def cube(name, loc, half, material, rotation=(0, 0, 0), edge=.025):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rotation)
    o = bpy.context.object
    o.name = name
    o.scale = half
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    return world_uv(bevel(o, edge))


def cyl(name, loc, radius, depth, material, rotation=(0, 0, 0), verts=18, edge=.008):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth,
                                        location=loc, rotation=rotation)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(material)
    # Cylinders need the same world-scale projection as boxes. Without UVs an
    # image material samples one texel, which is how the stair's column came to
    # be a black cylinder in the middle of the silo.
    return world_uv(bevel(o, edge))


def sphere(name, loc, radius, material, scale=(1, 1, 1), segments=14):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=loc,
                                         segments=segments, ring_count=segments // 2)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def loft(name, rings, material, sides=10, subdiv=1, cap_start=True, cap_end=True):
    """Build a tapering tube through a stack of horizontal cross-sections.

    A ring is ((x, y, z), radius_x, radius_z). Consecutive rings are bridged
    with quads and the result is subdivision-smoothed, which is how you get a
    shoulder, a calf or a jawline out of a script — a stack of cylinders and
    boxes never reads as a person no matter how many pieces you use.
    """
    bm = bmesh.new()
    loops = []
    for (cx, cy, cz), rx, rz in rings:
        loop = []
        for i in range(sides):
            t = i * math.tau / sides
            loop.append(bm.verts.new((cx + math.cos(t) * rx, cy, cz + math.sin(t) * rz)))
        loops.append(loop)
    for lower, upper in zip(loops, loops[1:]):
        for i in range(sides):
            j = (i + 1) % sides
            bm.faces.new((lower[i], lower[j], upper[j], upper[i]))
    if cap_start:
        bm.faces.new(loops[0])
    if cap_end:
        bm.faces.new(loops[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(material)
    if subdiv:
        bpy.context.view_layer.objects.active = o
        mod = o.modifiers.new('LS_Subsurf', 'SUBSURF')
        mod.levels = subdiv
        mod.render_levels = subdiv
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for poly in o.data.polygons:
        poly.use_smooth = True
    return o


def parent_to(child, parent):
    """Nest one part under another, keeping it where it is.

    Exported as a glTF node hierarchy, so a shin swings from the knee of the
    thigh that carries it rather than from the figure's origin.
    """
    # The pivots are set immediately before this, and an object's matrix_world
    # is only recomputed when the view layer is evaluated. Reading it stale
    # bakes the wrong offset into the parent inverse and scatters the limbs.
    bpy.context.view_layer.update()
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()
    return child


def text_obj(name, text, loc, size, material, rotation=(0, math.pi, 0), extrude=.005):
    bpy.ops.object.text_add(location=loc, rotation=rotation)
    o = bpy.context.object
    o.name = name
    o.data.body = text
    o.data.align_x = 'CENTER'
    o.data.align_y = 'CENTER'
    o.data.size = size
    o.data.extrude = extrude
    o.data.materials.append(material)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    return o


def set_pivot(o, pivot):
    """Move an object's origin without moving its geometry, so limbs hinge."""
    offset = o.location - Vector(pivot)
    o.data.transform(Matrix.Translation(offset))
    o.location = Vector(pivot)
    bpy.context.view_layer.update()
    return o


def limb(name, pivot, half, material, edge=.014):
    centre = (pivot[0], pivot[1] - half[1], pivot[2])
    return set_pivot(cube(name, centre, half, material, edge=edge), pivot)


def join_all(name):
    """Weld a whole assembly into one mesh.

    A residential level is well over a hundred pieces, and the silo instances
    twelve of them plus a stair per level. Joining each assembly keeps that to a
    handful of draw calls instead of thousands.
    """
    bpy.ops.object.select_all(action='DESELECT')
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        return None
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = name
    return joined


def add_orientation_marker():
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    o = bpy.context.object
    o.name = ORIENTATION_MARKER
    o.empty_display_size = .01
    return o


def export(name):
    path = os.path.join(OUT, name)
    add_orientation_marker()
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=False,
                              export_keep_originals=True)
    print('EXPORT', path)


CONCRETE = image_pbr('HabConcrete', 'concrete__Concrete034_1K_Color.jpg',
                     'concrete__Concrete034_1K_NormalGL.jpg',
                     'concrete__Concrete034_1K_Roughness.jpg')
DECKPLATE = image_pbr('HabDeck', 'metal_floor_plate__DiamondPlate008C_1K_Color.jpg',
                      'metal_floor_plate__DiamondPlate008C_1K_NormalGL.jpg',
                      'metal_floor_plate__DiamondPlate008C_1K_Roughness.jpg', metallic=.20,
                      normal_strength=.36, roughness_range=(.62, .92))
STEEL = mat('HabSteel', (.21, .23, .22), .78, .36)
BRUSHED = mat('HabBrushed', (.35, .37, .35), .72, .32)
DARK = mat('HabDarkSteel', (.06, .065, .062), .74, .42)
# A non-metallic near-black used where geometry represents an opening rather
# than a surface. Metallic DARK caught the shelter lights and made the hatch
# throat read as a bright steel plate when the lid lifted.
VOID = mat('HabVoid', (.002, .002, .002), 0, .98)
PAINT = mat('HabPaint', (.19, .24, .22), .10, .62)
# The gallery wall is the same warm plaster the homes are finished in, not
# a cold grey-green. It is most of what you look at walking the silo.
FACADE = mat('HabFacade', (.23, .22, .19), 0, .88)
DOORPAINT = mat('HabDoorPaint', (.10, .22, .22), .16, .62)
WARM = mat('HabWarmWood', (.30, .19, .11), 0, .68)
# Lit from inside: a wall of these is what makes the silo read as lived in.
WARMWINDOW = mat('HabWarmWindow', (.26, .18, .10), 0, .46, (1.0, .64, .30), .58)
CLOTH = mat('HabCloth', (.22, .24, .21), 0, .86)
BONE = mat('HabBone', (.68, .66, .60), 0, .88)
INNER = mat('HabInnerWall', (.39, .38, .34), 0, .89)
# The homes are furnished warm: rust carpet, cream plaster, a glazed tile band
# round the walls at waist height, orange upholstery and brass fittings, lit by
# pendants with blown orange glass.
CARPET = mat('HabCarpet', (.33, .11, .07), 0, .93)
CREAM = mat('HabCream', (.47, .44, .38), 0, .88)
TILEBAND = mat('HabTileBand', (.31, .11, .075), .03, .54)
ORANGE = mat('HabOrange', (.44, .17, .065), 0, .82)
BRASS = mat('HabBrass', (.58, .42, .17), .85, .30)
PENDANT = mat('HabPendantGlass', (.62, .24, .05), 0, .26, (1.0, .40, .07), 1.1)
POTTERY = mat('HabPottery', (.34, .25, .17), 0, .80)
JACKET = mat('HabJacket', (.25, .28, .30), 0, .82)
TROUSER = mat('HabTrouser', (.17, .18, .21), 0, .86)
SKIN = mat('HabSkin', (.52, .38, .30), 0, .62)
HAIR = mat('HabHair', (.09, .07, .06), 0, .70)
EYEWHITE = mat('HabEyeWhite', (.72, .70, .65), 0, .48)
IRIS = mat('HabIris', (.055, .075, .070), 0, .38)
LIP = mat('HabLip', (.27, .105, .085), 0, .68)
GLASS = mat('HabGlass', (.05, .07, .08), .10, .10)
LEAF = mat('HabLeaf', (.10, .32, .12), 0, .64)
AMBER = mat('HabAmber', (.5, .33, .07), 0, .3, (1.0, .66, .16), 4.0)
GREENLIGHT = mat('HabGreenLight', (.10, .5, .24), 0, .3, (.20, 1.0, .48), 4.0)
REDLIGHT = mat('HabRedLight', (.5, .07, .05), 0, .3, (1.0, .14, .09), 4.0)
GROWLIGHT = mat('HabGrowLight', (.42, .18, .46), 0, .3, (.95, .35, 1.0), 6.0)
WHITELIGHT = mat('HabWhiteLight', (.40, .41, .39), 0, .42, (1.0, .94, .82), .62)
# Domestic light: warmer and softer than the strip lights on the walkways.
WARMLAMP = mat('HabWarmLamp', (.42, .34, .24), 0, .42, (1.0, .78, .50), .62)


def build_shell():
    """The outer concrete shell, and the ring beams that stiffen it."""
    clear_scene()
    height = LEVELS * LEVEL_HEIGHT + LEVEL_HEIGHT * 2
    panels = SEGMENTS * 2
    for i in range(panels):
        a = i * math.tau / panels
        wide = math.pi * (SHELL_RADIUS + .6) / panels * 1.08
        # Radial thickness .6, tangential width `wide`. Sized the other way
        # round this was a ring of fins rather than a wall.
        cube(f'Shell_Panel_{i}', (math.cos(a) * (SHELL_RADIUS + .6), height / 2,
                                  math.sin(a) * (SHELL_RADIUS + .6)),
             (.6, height / 2, wide), CONCRETE, rotation=(0, -a, 0), edge=.07)
        rib = a + math.tau / (panels * 2)
        cube(f'Shell_Rib_{i}', (math.cos(rib) * SHELL_RADIUS, height / 2, math.sin(rib) * SHELL_RADIUS),
             (.26, height / 2, .20), DARK, rotation=(0, -rib, 0), edge=.03)
        # A ring beam at every floor line, so the shell is banded the way a
        # poured structure is rather than being one unbroken tube.
        for level in range(LEVELS + 2):
            y = level * LEVEL_HEIGHT
            cube(f'Shell_Ring_{i}_{level}', (math.cos(a) * (SHELL_RADIUS + .18), y,
                                             math.sin(a) * (SHELL_RADIUS + .18)),
                 (.22, .34, wide), CONCRETE, rotation=(0, -a, 0), edge=.04)

    cube('Shell_Base', (0, -.5, 0), (SHELL_RADIUS + 1.4, .5, SHELL_RADIUS + 1.4), CONCRETE, edge=.1)
    cube('Shell_Cap', (0, height + .7, 0), (SHELL_RADIUS + 1.4, .7, SHELL_RADIUS + 1.4), CONCRETE, edge=.1)
    join_all('HabShell')
    export('hab_shell_v4.glb')


def arc_half(radius, overlap=1.06):
    """Half-width of one bay at a given radius.

    Every piece in the ring is a flat slab standing at its own radius, so they
    each need their own width. Sizing them all from one radius leaves metre-wide
    gaps between the outer apartment fronts and overlaps at the railing.
    """
    return math.pi * radius / SEGMENTS * overlap


def ring_piece(name, angle, radius, offset, y, radial, half_y, tangential, material, edge=.025):
    """A slab standing in the ring at `angle`, `offset` along the bay's chord.

    Sizes are given the way you think about the thing: how deep it is from the
    wall, how tall, how wide along the walkway. A piece rotated into the ring
    has its local X along the radius and its local Z along the tangent, which
    is the opposite of what you get placing a whole asset at runtime — and
    getting them the wrong way round turns a handrail into a row of spikes
    across the walkway and a facade into a row of fins.
    """
    x = math.cos(angle) * radius + math.sin(angle) * offset
    z = math.sin(angle) * radius - math.cos(angle) * offset
    return cube(name, (x, y, z), (radial, half_y, tangential), material,
                rotation=(0, -angle, 0), edge=edge)


def ring_band(name, radius, half_radial, y, half_y, material, segs=48, edge=.02):
    """A ring of material at a radius: an annulus, laid out as short boxes.

    There are no booleans here, so a "void" cylinder inside a solid one does not
    cut a hole — it fills the middle in. A band has to be built as a band.
    """
    for i in range(segs):
        a = i * math.tau / segs
        ring_piece(f'{name}_{i}', a, radius, 0, y, half_radial, half_y,
                   math.pi * radius / segs * 1.08, material, edge=edge)


def annular_slab(name, inner, outer, top, thickness, material, segs=72, edge=.015):
    """Build one closed annulus with no overlapping or duplicate top faces.

    The old gallery deck was eighteen broad boxes enlarged by six percent so
    their chord ends would meet. That put pairs of coplanar top faces over one
    another at every bay boundary: as a mobile camera moved, the depth buffer
    alternated between them and the whole floor appeared to flash. This mesh
    shares vertices at every boundary, so every visible point is drawn once.
    """
    bottom = top - thickness
    verts = []
    for i in range(segs):
        a = i * math.tau / segs
        c, s = math.cos(a), math.sin(a)
        verts.extend([
            (c * inner, top, s * inner),
            (c * outer, top, s * outer),
            (c * inner, bottom, s * inner),
            (c * outer, bottom, s * outer),
        ])

    faces = []
    for i in range(segs):
        n = (i + 1) % segs
        it, ot, ib, ob = i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 3
        nit, not_, nib, nob = n * 4, n * 4 + 1, n * 4 + 2, n * 4 + 3
        faces.extend([
            (it, nit, not_, ot),       # top
            (ib, ob, nob, nib),        # underside
            (ot, not_, nob, ob),       # outer fascia
            (it, ib, nib, nit),        # inner fascia
        ])

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(material)
    return world_uv(bevel(o, edge))


def build_level():
    """One residential level: a walkway ring carried on the wall it hangs off.

    Built so the structure holds itself up and reads that way from the level
    below: a checker-plate deck on a concrete slab, the slab spanning between
    haunched radial beams that cantilever off the wall, the beams landing on a
    ring beam at the well edge, and the whole floor bearing on columns that run
    the full height of the silo. The wall between the doors is a wall — flat,
    three hundred millimetres thick — not a fin sticking out into the walkway.
    """
    clear_scene()
    step = math.tau / SEGMENTS
    mid = (DECK_OUTER + WELL_RADIUS) / 2
    depth = (DECK_OUTER - WELL_RADIUS) / 2
    wall_mid = DECK_OUTER - .30      # centre of the 300 mm wall
    face = DECK_OUTER - .45          # the side of it you see from the walkway.
                                     # This was on the far side, which buried
                                     # every window, meter and vent inside the
                                     # wall and left a blank panel.
    edge_r = WELL_RADIUS + .26       # centre of the ring beam at the well edge

    # One watertight annulus replaces the overlapping box per bay. The concrete
    # carrier is continuous too, and meets the deck underside without sharing a
    # coplanar face. Raised dark joints retain readable bay rhythm without ever
    # competing with the walking surface in the depth buffer.
    annular_slab('Gallery_Deck', WELL_RADIUS, DECK_OUTER, 0, .11,
                 DECKPLATE, segs=SEGMENTS * 4, edge=.012)
    annular_slab('Gallery_Slab', WELL_RADIUS, DECK_OUTER, -.11, .25,
                 CONCRETE, segs=SEGMENTS * 4, edge=.018)
    for i in range(SEGMENTS):
        joint = (i + .5) * step
        ring_piece(f'DeckJoint_{i}', joint, mid, 0, .009, depth - .06, .006, .028,
                   DARK, edge=.004)

    for i in range(SEGMENTS):
        a = i * step
        ca = a + step / 2            # bay boundary: where the columns and beams go
        bay = arc_half(mid)
        front_half = arc_half(face)

        # Radial beams on every bay boundary, haunched: deep where they take
        # the moment at the wall, shallow where they reach the well.
        outer_run = depth * .45
        ring_piece(f'Haunch_{i}', ca, DECK_OUTER - outer_run, 0, -.62, outer_run, .28, .17,
                   CONCRETE, edge=.03)
        ring_piece(f'Rib_{i}', ca, WELL_RADIUS + (depth * 2 - outer_run) / 2, 0, -.47,
                   (depth * 2 - outer_run) / 2, .13, .15, CONCRETE, edge=.025)

        # The ring beam the radial beams land on, running the whole circle.
        ring_piece(f'EdgeBeam_{i}', a, edge_r, 0, -.52, .26, .29, arc_half(edge_r),
                   CONCRETE, edge=.03)
        ring_piece(f'EdgeNose_{i}', a, WELL_RADIUS + .02, 0, -.30, .06, .18, arc_half(WELL_RADIUS),
                   DARK, edge=.02)

        # Services run under the walkway between the beams, clipped to the slab.
        for r, rad in enumerate((WELL_RADIUS + 1.5, WELL_RADIUS + 3.4)):
            ring_piece(f'Conduit_{i}_{r}', a, rad, 0, -.46, .07, .07, arc_half(rad),
                       BRUSHED, edge=.012)

        # --- The wall between the doors ---------------------------------------
        # ...except at the tunnel bay, which carries its own arched wall. Two
        # walls in the same plane means the facade draws straight across the
        # mouth of the arch, dado band and all.
        if i == TUNNEL_BAY:
            # Only the façade steps aside. The old early continue also deleted
            # this bay's shaft parapet, structural column and ceiling lights,
            # leaving an unguarded fall opposite the landmark arch.
            ring_piece(f'Column_{i}', ca, DECK_OUTER - .52, 0,
                       LEVEL_HEIGHT / 2 - .45, .26, LEVEL_HEIGHT / 2 + .45,
                       .30, CONCRETE, edge=.04)
            for cy in (-.62, LEVEL_HEIGHT - .60):
                ring_piece(f'Collar_{i}_{cy:.1f}', ca, DECK_OUTER - .52, 0, cy,
                           .31, .10, .35, BRUSHED, edge=.02)
            rail_half = arc_half(WELL_RADIUS)
            ring_piece(f'Parapet_{i}', a, WELL_RADIUS + .10, 0, .52,
                       .17, .52, rail_half, CONCRETE, edge=.03)
            ring_piece(f'ParapetFoot_{i}', a, WELL_RADIUS + .10, 0, .10,
                       .21, .10, rail_half, CONCRETE, edge=.03)
            ring_piece(f'ParapetReveal_{i}', a, WELL_RADIUS - .05, 0, .86,
                       .04, .05, rail_half, DARK, edge=.006)
            ring_piece(f'ParapetCap_{i}', a, WELL_RADIUS + .10, 0, 1.06,
                       .23, .06, rail_half, BRUSHED, edge=.02)
            ring_piece(f'ParapetGrip_{i}', a, WELL_RADIUS - .10, 0, 1.15,
                       .05, .045, rail_half, BRUSHED, edge=.012)
            for si, rad in enumerate((DECK_OUTER - 1.65, WELL_RADIUS + 1.75)):
                span = arc_half(rad) * .42
                ring_piece(f'Strip_{i}_{si}', a, rad, 0, LEVEL_HEIGHT - .44,
                           .16, .05, span, WHITELIGHT, edge=.015)
                ring_piece(f'StripHood_{i}_{si}', a, rad, 0, LEVEL_HEIGHT - .33,
                           .22, .08, span + .10, DARK, edge=.02)

            # Close the bay either side of the arch. The tunnel kit's own wall
            # only reaches 3.44 m from the centre line and the bay is 5.31, so
            # this used to be a two-metre-wide slot straight through to the
            # shell — the "walls you can see through to the floor". Same chord
            # plane and same depth as the tunnel's wall, so they butt.
            fill_half = (arc_half(face) - TUNNEL_WALL_HALF) / 2
            for k in (-1, 1):
                offset = k * (TUNNEL_WALL_HALF + fill_half)
                ring_piece(f'TunnelFill_{i}_{k}', a, wall_mid, offset, LEVEL_HEIGHT / 2,
                           TUNNEL_WALL_DEPTH, LEVEL_HEIGHT / 2, fill_half + .16,
                           CONCRETE, edge=.03)
                # The service bay is plant, not a home front, so it gets the
                # dado band and a louvre rather than windows and a doorway.
                ring_piece(f'TunnelDado_{i}_{k}', a, wall_mid - TUNNEL_WALL_DEPTH - .02,
                           offset, 1.20, .02, .17, fill_half, TILEBAND, edge=.008)
                ring_piece(f'TunnelDadoCap_{i}_{k}', a, wall_mid - TUNNEL_WALL_DEPTH - .04,
                           offset, 1.38, .04, .022, fill_half, BRASS, edge=.008)
                ring_piece(f'TunnelSkirt_{i}_{k}', a, wall_mid - TUNNEL_WALL_DEPTH - .05,
                           offset, .09, .05, .09, fill_half, DARK, edge=.01)
                ring_piece(f'TunnelLouvre_{i}_{k}', a, wall_mid - TUNNEL_WALL_DEPTH - .07,
                           offset, 2.30, .07, .34, fill_half * .52, DARK, edge=.015)
                for b in range(6):
                    ring_piece(f'TunnelLouvreBar_{i}_{k}_{b}',
                               a, wall_mid - TUNNEL_WALL_DEPTH - .12, offset,
                               2.06 + b * .10, .04, .022, fill_half * .46,
                               BRUSHED, edge=.004)
            continue
        panel_half = (front_half - DOOR_HALF - .12) / 2
        for k in (-1, 1):
            offset = k * (DOOR_HALF + .12 + panel_half)
            ring_piece(f'Front_{i}_{k}', a, wall_mid, offset, LEVEL_HEIGHT / 2,
                       .15, LEVEL_HEIGHT / 2, panel_half, FACADE, edge=.03)
        # Head of the wall over the opening.
        ring_piece(f'Lintel_{i}', a, wall_mid, 0, (LEVEL_HEIGHT + 2.24) / 2,
                   .15, (LEVEL_HEIGHT - 2.24) / 2, DOOR_HALF + .12, FACADE, edge=.03)
        # A frame around the opening rather than a block filling it: jambs
        # either side and a head, with the doorway itself left open.
        for k in (-1, 1):
            ring_piece(f'Jamb_{i}_{k}', a, wall_mid, k * (DOOR_HALF + .06), 1.12,
                       .19, 1.12, .06, DARK, edge=.015)
        ring_piece(f'DoorHead_{i}', a, wall_mid, 0, 2.30, .19, .06, DOOR_HALF + .12,
                   DARK, edge=.015)
        ring_piece(f'Threshold_{i}', a, wall_mid, 0, .02, .19, .02, DOOR_HALF + .06,
                   BRUSHED, edge=.008)

        # Finish bands stop at the jambs. These used to be four paper-thin
        # slabs drawn straight across every opening: collision said "open"
        # while the player saw a painted wall in the doorway.
        for k in (-1, 1):
            finish_offset = k * (DOOR_HALF + .12 + panel_half)
            ring_piece(f'Dado_{i}_{k}', a, face - .02, finish_offset, 1.20,
                       .02, .17, panel_half, TILEBAND, edge=.008)
            ring_piece(f'DadoCap_{i}_{k}', a, face - .04, finish_offset, 1.38,
                       .04, .022, panel_half, BRASS, edge=.008)
            ring_piece(f'Plinth_{i}_{k}', a, face - .03, finish_offset, .50,
                       .03, .50, panel_half, PAINT, edge=.008)
            ring_piece(f'Skirting_{i}_{k}', a, face - .05, finish_offset, .09,
                       .05, .09, panel_half, DARK, edge=.01)

        # A deep lintel/canopy throws a real shadow across the threshold and
        # stops the façade reading as a texture on one flat cylinder.
        ring_piece(f'DoorCanopy_{i}', a, face - .20, 0, 2.72, .20, .10,
                   DOOR_HALF + .20, DARK, edge=.025)
        for k in (-1, 1):
            ring_piece(f'DoorReveal_{i}_{k}', a, face - .16,
                       k * (DOOR_HALF + .075), 1.14, .16, 1.14, .075,
                       BRUSHED, edge=.012)

        # Fanlight over the door, and the unit's number plate beside it.
        ring_piece(f'Fanlight_{i}', a, face - .04, 0, 2.52, .04, .13, DOOR_HALF * .84,
                   WARMWINDOW, edge=.012)
        ring_piece(f'Plate_{i}', a, face - .02, DOOR_HALF + .34, 1.94, .02, .09, .13,
                   AMBER, edge=.006)

        # A window either side, warm from inside, on a sill.
        for k in (-1, 1):
            wo = k * (DOOR_HALF + .12 + panel_half)
            ring_piece(f'WinFrame_{i}_{k}', a, face - .03, wo, 1.55, .05, .58, .62,
                       DARK, edge=.012)
            # Not every family has every front-room lamp on. Alternating dark
            # and warm panes breaks the repeating wall of luminous rectangles.
            window_material = WARMWINDOW if (i + (0 if k < 0 else 2)) % 4 < 2 else GLASS
            ring_piece(f'Win_{i}_{k}', a, face - .06, wo, 1.55, .03, .50, .54,
                       window_material, edge=.008)
            for m in (-1, 1):
                ring_piece(f'WinBar_{i}_{k}_{m}', a, face - .07, wo + m * .18, 1.55,
                           .03, .50, .022, DARK, edge=.004)
            ring_piece(f'WinSill_{i}_{k}', a, face - .09, wo, .94, .11, .05, .70,
                       BRUSHED, edge=.012)

        # Service greeble, flat against the wall where it belongs.
        ring_piece(f'Meter_{i}', a, face - .09, -(front_half * .74), 1.66, .09, .26, .20,
                   BRUSHED, edge=.02)
        ring_piece(f'MeterFace_{i}', a, face - .17, -(front_half * .74), 1.66, .02, .18, .14,
                   DARK, edge=.01)
        ring_piece(f'Vent_{i}', a, face - .07, front_half * .70, LEVEL_HEIGHT - .70,
                   .07, .22, .42, DARK, edge=.015)
        for b in range(5):
            ring_piece(f'VentBar_{i}_{b}', a, face - .12, front_half * .70,
                       LEVEL_HEIGHT - .82 + b * .06, .04, .015, .38, BRUSHED, edge=.004)

        # Risers climb the wall between the bays, banded at each floor.
        for pi, po in enumerate((-.90, -.82)):
            px = math.cos(a) * (face - .10) + math.sin(a) * (front_half * po)
            pz = math.sin(a) * (face - .10) - math.cos(a) * (front_half * po)
            cyl(f'Riser_{i}_{pi}', (px, LEVEL_HEIGHT / 2, pz), .055, LEVEL_HEIGHT, BRUSHED,
                rotation=UP, verts=10)
            ring_piece(f'RiserClamp_{i}_{pi}', a, face - .10, front_half * po, .55,
                       .10, .05, .10, DARK, edge=.008)
        # Cable tray runs the ring under the ceiling.
        ring_piece(f'CableTray_{i}', a, face - .26, 0, LEVEL_HEIGHT - .52, .13, .05,
                   arc_half(face - .26), DARK, edge=.015)

        # --- Structure --------------------------------------------------------
        # The column at every bay boundary runs the full height of the silo and
        # carries the floor. It passes through the deck, so the levels stack
        # into one continuous column rather than a stack of separate stubs.
        ring_piece(f'Column_{i}', ca, DECK_OUTER - .52, 0, LEVEL_HEIGHT / 2 - .45,
                   .26, LEVEL_HEIGHT / 2 + .45, .30, CONCRETE, edge=.04)
        for cy in (-.62, LEVEL_HEIGHT - .60):
            ring_piece(f'Collar_{i}_{cy:.1f}', ca, DECK_OUTER - .52, 0, cy,
                       .31, .10, .35, BRUSHED, edge=.02)

        # --- Gallery railing --------------------------------------------------
        # Circumferential, following the well edge. This used to be sized the
        # other way round, which put a two-metre bar across the walkway on
        # every bay.
        #
        # Bay 0 is where the stair's landing arrives, on every level, because
        # the flight turns a full circle per storey. The railing opens there:
        # an unbroken ring runs straight across the mouth of the landing and
        # there is then no way to step off the stair onto the floor.
        rail_half = arc_half(WELL_RADIUS)
        gate = (i == 0)
        if gate:
            # Solid returns either side of the opening match the rest of the
            # gallery parapet. The earlier pair of thin horizontal bars made
            # this whole bay look missing even though the centre had to remain
            # open for the landing.
            for k in (-1, 1):
                return_half = (rail_half - LANDING_HALF) / 2
                return_offset = k * (LANDING_HALF + return_half)
                ring_piece(f'GateParapet_{i}_{k}', a, WELL_RADIUS + .10,
                           return_offset, .52, .17, .52, return_half,
                           CONCRETE, edge=.03)
                ring_piece(f'GateFoot_{i}_{k}', a, WELL_RADIUS + .10,
                           return_offset, .10, .21, .10, return_half,
                           CONCRETE, edge=.03)
                ring_piece(f'GateReveal_{i}_{k}', a, WELL_RADIUS - .05,
                           return_offset, .86, .04, .05, return_half,
                           DARK, edge=.006)
                ring_piece(f'GateCap_{i}_{k}', a, WELL_RADIUS + .10,
                           return_offset, 1.06, .23, .06, return_half,
                           BRUSHED, edge=.02)
                ring_piece(f'GateGrip_{i}_{k}', a, WELL_RADIUS - .10,
                           return_offset, 1.15, .05, .045, return_half,
                           BRUSHED, edge=.012)
                # A newel post on the edge of the opening, and a stub of rail
                # turned back along the landing so the corner is never open.
                nx = math.cos(a) * (WELL_RADIUS + .04) + math.sin(a) * (k * LANDING_HALF)
                nz = math.sin(a) * (WELL_RADIUS + .04) - math.cos(a) * (k * LANDING_HALF)
                cube(f'RailNewel_{i}_{k}', (nx, .58, nz), (.055, .58, .055), BRUSHED, edge=.01)
                ring_piece(f'RailTurn_{i}_{k}', a, WELL_RADIUS - .34, k * LANDING_HALF, 1.06,
                           .38, .045, .045, BRUSHED, edge=.012)
        else:
            # A solid cast parapet with a steel capping rail, not a handrail on
            # posts. It is what the silo is built of, it is what you see across
            # the well from every other gallery, and it is what stops the shaft
            # reading as scaffolding.
            ring_piece(f'Parapet_{i}', a, WELL_RADIUS + .10, 0, .52, .17, .52, rail_half,
                       CONCRETE, edge=.03)
            ring_piece(f'ParapetFoot_{i}', a, WELL_RADIUS + .10, 0, .10, .21, .10, rail_half,
                       CONCRETE, edge=.03)
            # A shadow gap under the capping, so the parapet is not one slab.
            ring_piece(f'ParapetReveal_{i}', a, WELL_RADIUS - .05, 0, .86, .04, .05, rail_half,
                       DARK, edge=.006)
            ring_piece(f'ParapetCap_{i}', a, WELL_RADIUS + .10, 0, 1.06, .23, .06, rail_half,
                       BRUSHED, edge=.02)
            ring_piece(f'ParapetGrip_{i}', a, WELL_RADIUS - .10, 0, 1.15, .05, .045, rail_half,
                       BRUSHED, edge=.012)
            # Form-tie marks down the face, the way board-formed concrete has.
            for k in range(3):
                offset = (k / 2 - .5) * 1.5 * rail_half
                px = math.cos(a) * (WELL_RADIUS - .08) + math.sin(a) * offset
                pz = math.sin(a) * (WELL_RADIUS - .08) - math.cos(a) * offset
                cube(f'ParapetTie_{i}_{k}', (px, .58, pz), (.035, .035, .035), DARK, edge=.008)

        # --- Lighting ---------------------------------------------------------
        # Two compact practicals per bay. Three long luminous bars repeated 18
        # times became the dominant shape in every mobile frame and clipped to
        # white; the darker gaps now let the structure and door recesses read.
        for si, rad in enumerate((DECK_OUTER - 1.65, WELL_RADIUS + 1.75)):
            span = arc_half(rad) * (.38 if i % 2 else .46)
            ring_piece(f'Strip_{i}_{si}', a, rad, 0, LEVEL_HEIGHT - .44, .16, .05, span,
                       WHITELIGHT, edge=.015)
            ring_piece(f'StripHood_{i}_{si}', a, rad, 0, LEVEL_HEIGHT - .33, .22, .08,
                       span + .10, DARK, edge=.02)
            for k in (-1, 1):
                cube(f'StripStem_{i}_{si}_{k}',
                     (math.cos(a) * rad + math.sin(a) * (k * span * .8), LEVEL_HEIGHT - .22,
                      math.sin(a) * rad - math.cos(a) * (k * span * .8)),
                     (.018, .16, .018), BRUSHED, edge=.004)

    join_all('HabLevel')
    export('hab_level_v4.glb')


def build_stair():
    """One flight of the great stair, a full turn for a single level.

    A monumental spiral: four metres of tread from a slim service core out to a
    solid balustrade, wide enough for a crowd going both ways. A whole turn per
    level means every flight starts and finishes on the same bearing, so the
    landings stack one above the next and the stair is the same walk on every
    floor rather than a helix you have to hunt around.
    """
    clear_scene()
    turn = math.tau / STAIR_STEPS
    rise = LEVEL_HEIGHT / STAIR_STEPS
    inner, outer = STAIR_COLUMN, STAIR_RADIUS
    band = (outer - inner) / 2              # radial half-depth of one tread
    mid = inner + band
    going = turn * outer / 2 * 1.06         # tangential half-width, sized at the
                                            # outer edge so the wedges close up

    for i in range(STAIR_STEPS):
        a = i * turn
        x, z = math.cos(a) * mid, math.sin(a) * mid
        cube(f'Tread_{i}', (x, i * rise, z), (band, .085, going), CONCRETE,
             rotation=(0, -a, 0), edge=.02)
        cube(f'Riser_{i}', (x, i * rise - rise / 2, z), (band, rise / 2, .05), CONCRETE,
             rotation=(0, -a, 0), edge=.01)
        cube(f'Nose_{i}', (x, i * rise + .02, z), (band, .03, going * 1.02), DARK,
             rotation=(0, -a, 0), edge=.008)
        # The underside. Without it a four-metre tread is a slat cantilevered
        # off a slim core with daylight between it and the next one; with it the
        # flight is a solid helical ramp of concrete, stepped the way a cast
        # soffit is.
        cube(f'Soffit_{i}', (x, i * rise - .30, z), (band, .18, going * 1.04), CONCRETE,
             rotation=(0, -a, 0), edge=.03)
        # Stringers: the beams the treads span between. The outer one carries
        # the balustrade, the inner one ties the flight back to the core.
        sx, sz = math.cos(a) * (outer - .10), math.sin(a) * (outer - .10)
        cube(f'StringerOut_{i}', (sx, i * rise - .40, sz), (.18, .40, going * 1.06), CONCRETE,
             rotation=(0, -a, 0), edge=.025)
        ix2, iz2 = math.cos(a) * (inner + .16), math.sin(a) * (inner + .16)
        cube(f'StringerIn_{i}', (ix2, i * rise - .34, iz2), (.16, .30, going * 1.06), CONCRETE,
             rotation=(0, -a, 0), edge=.025)

        # The solid outer balustrade is clipped to the exact two bearings where
        # the straight landing sides meet its circle. Whole missing tread panels
        # previously left a roughly six-metre ragged void around every landing.
        panel_start = a - turn / 2
        panel_end = a + turn / 2
        guard_start = max(panel_start, LANDING_OPENING_ANGLE)
        guard_end = min(panel_end, math.tau - LANDING_OPENING_ANGLE)
        if guard_end > guard_start:
            guard_angle = (guard_start + guard_end) / 2
            guard_going = (guard_end - guard_start) * STAIR_GUARD_RADIUS / 2 * 1.015
            ox = math.cos(guard_angle) * STAIR_GUARD_RADIUS
            oz = math.sin(guard_angle) * STAIR_GUARD_RADIUS
            cube(f'Balustrade_{i}', (ox, i * rise + .50, oz), (.16, .50, guard_going), CONCRETE,
                 rotation=(0, -guard_angle, 0), edge=.03)
            cube(f'Handrail_{i}', (ox, i * rise + 1.06, oz), (.11, .05, guard_going * 1.02), BRUSHED,
                 rotation=(0, -guard_angle, 0), edge=.015)

            # Newels sit on the mathematically exact edges of the opening and
            # overlap the landing's inner returns, so neither corner can show
            # daylight as the camera approaches it.
            for suffix, boundary in (('start', guard_start), ('end', guard_end)):
                if abs(boundary - LANDING_OPENING_ANGLE) > 1e-5 and \
                   abs(boundary - (math.tau - LANDING_OPENING_ANGLE)) > 1e-5:
                    continue
                nx = math.cos(boundary) * STAIR_GUARD_RADIUS
                nz = math.sin(boundary) * STAIR_GUARD_RADIUS
                cube(f'ExitNewel_{i}_{suffix}', (nx, i * rise + .62, nz),
                     (.20, .62, .20), CONCRETE, edge=.03)
        # ...and a rail on the core side, because the inside of a four-metre
        # tread is as long a drop as the outside.
        ix, iz = math.cos(a) * (inner + .12), math.sin(a) * (inner + .12)
        cube(f'InnerRail_{i}', (ix, i * rise + .98, iz), (.07, .045, going * 1.06), BRUSHED,
             rotation=(0, -a, 0), edge=.012)
        if i % 4 == 0:
            cube(f'InnerPost_{i}', (ix, i * rise + .50, iz), (.045, .50, .045), BRUSHED, edge=.01)
        if i % 9 == 0:
            lx, lz = math.cos(a) * (inner + .02), math.sin(a) * (inner + .02)
            cube(f'StairLamp_{i}', (lx, i * rise + 1.62, lz), (.07, .17, .10), WHITELIGHT,
                 rotation=(0, -a, 0), edge=.012)
            cube(f'StairLampHood_{i}', (lx, i * rise + 1.72, lz), (.10, .07, .16), DARK,
                 rotation=(0, -a, 0), edge=.015)

    # The service core the helix wraps: a slim shaft carrying the silo's risers,
    # the way the reference does it, rather than a drum that fills the well.
    cyl('StairCore', (0, LEVEL_HEIGHT / 2, 0), inner - .18, LEVEL_HEIGHT, CONCRETE,
        rotation=UP, verts=24, edge=.03)
    for i in range(7):
        a = i * math.tau / 7 + .35
        cyl(f'CorePipe_{i}', (math.cos(a) * (inner - .11), LEVEL_HEIGHT / 2, math.sin(a) * (inner - .11)),
            .048, LEVEL_HEIGHT, BRUSHED, rotation=UP, verts=8)
        for band_y in (.7, LEVEL_HEIGHT - .7):
            cube(f'PipeClamp_{i}_{band_y:.1f}',
                 (math.cos(a) * (inner - .11), band_y, math.sin(a) * (inner - .11)),
                 (.07, .04, .07), DARK, rotation=(0, -a, 0), edge=.008)
    for band_y in (.45, LEVEL_HEIGHT - .45):
        cyl(f'CoreBand_{band_y:.1f}', (0, band_y, 0), inner - .12, .18, BRUSHED,
            rotation=UP, verts=24, edge=.02)
    # A lit band at head height on every flight. Emissive costs nothing per
    # frame and stops the core reading as a hole punched in the silo.
    cyl('CoreGlow', (0, LEVEL_HEIGHT * .62, 0), inner - .15, .08, WHITELIGHT,
        rotation=UP, verts=24, edge=.01)
    join_all('HabStair')
    export('hab_stair_v4.glb')


def build_landing(top=False):
    """The platform where the stair meets a floor.

    Not a catwalk: it is as wide as the stair is, so stepping off the bottom
    tread puts you on a proper landing that carries you out to the walkway.
    The head of the final flight gets its own U-shaped adult-height parapet:
    no next flight continues through it, so leaving the inner deck edge open
    there is a genuine fall rather than a stair opening.
    """
    clear_scene()
    # Runtime places the asset using the original stair-edge-to-gallery centre.
    # Extend the deck asymmetrically back toward the core so the final tread
    # always discharges onto floor, including at the secure top level where no
    # next flight exists to mask the missing four metres.
    span = (WELL_RADIUS + .3 - STAIR_RADIUS) / 2
    asset_origin = STAIR_RADIUS + span
    inner = LANDING_INNER - asset_origin
    outer = WELL_RADIUS + .3 - asset_origin
    deck_mid = (inner + outer) / 2
    deck_span = (outer - inner) / 2
    half = 1.8
    # Ten millimetres below the walkway it laps onto. Flush, the two decks are
    # coplanar over the overlap and the floor flickers as you cross onto it.
    cube('Landing_Deck', (0, -.10, deck_mid), (half, .09, deck_span), DECKPLATE, edge=.02)
    cube('Landing_Plate', (0, -.24, deck_mid), (half * .97, .07, deck_span * .99), STEEL, edge=.02)
    # Muted tactile joints identify both joins without the blown emissive strip
    # that looked like another barrier across the player's path on mobile.
    for suffix, z in (('inner', inner + .14), ('outer', outer - .14)):
        cube(f'Landing_Joint_{suffix}', (0, .004, z),
             (half - .14, .008, .065), DARK, edge=.006)
    # Two deep girders down the long sides carry the span from the stair's
    # stringer to the walkway's ring beam; cross ribs between them stop the
    # deck reading as a plank laid over nothing.
    for side in (-1, 1):
        cube(f'Landing_Girder_{side}', (side * (half - .16), -.52, deck_mid),
             (.15, .38, deck_span),
             DARK, edge=.03)
        for k in range(5):
            cube(f'Landing_Web_{side}_{k}', (side * (half - .16), -.52,
                 deck_mid + (k / 4 - .5) * 1.7 * deck_span),
                 (.19, .30, .05), BRUSHED, edge=.01)
    for r in range(6):
        cube(f'Landing_Rib_{r}', (0, -.42,
             deck_mid + (r / 5 - .5) * 1.82 * deck_span), (half * .92, .11, .07),
             DARK, edge=.02)
    gallery_inset = .18
    # Ordinary floors leave the tread envelope clear on both sides: the flight
    # below arrives through one long edge and the flight above departs through
    # the other. The head platform has no departing flight, so only that edge
    # is closed all the way back to the core, and a third parapet shuts the
    # otherwise lethal inner edge.
    #
    # Local +X is the edge the arriving flight comes up through — the landing
    # is placed rotated a quarter turn, so local +X is the world -Z side the
    # helix descends into. Running a parapet across it walls the player off the
    # only stair they can walk down, which is exactly what this used to do.
    guard_outer = outer - gallery_inset
    for side in (-1, 1):
        seal = top and side < 0
        guard_inner = (LANDING_INNER if seal else STAIR_GUARD_RADIUS) - asset_origin
        guard_span = (guard_outer - guard_inner) / 2
        guard_mid = (guard_outer + guard_inner) / 2
        # Cast parapets, matching the galleries the landing runs out to. They
        # overlap the exact stair newels without crossing the tread envelope.
        # At the outer end they terminate flush in the gallery's solid returns,
        # making one continuous safety line.
        cube(f'Landing_Parapet_{side}', (side * half, .55, guard_mid),
             (.15, .52, guard_span), CONCRETE, edge=.03)
        cube(f'Landing_Foot_{side}', (side * half, .10, guard_mid),
             (.19, .10, guard_span), CONCRETE, edge=.03)
        cube(f'Landing_Cap_{side}', (side * half, 1.10, guard_mid),
             (.21, .06, guard_span), BRUSHED, edge=.02)
        cube(f'Landing_Reveal_{side}', (side * (half - .16), .86, guard_mid),
             (.04, .05, guard_span), DARK, edge=.006)
        cube(f'Landing_InnerNewel_{side}', (side * half, .62, guard_inner + .06),
             (.20, .62, .20), CONCRETE, edge=.03)
        cube(f'Landing_OuterNewel_{side}', (side * half, .62, guard_outer - .06),
             (.18, .62, .18), CONCRETE, edge=.03)
        for k in range(4):
            cube(f'Landing_Tie_{side}_{k}', (side * (half - .16), .58,
                 guard_mid + (k / 3 - .5) * 1.7 * guard_span),
                 (.03, .03, .03), DARK, edge=.006)
    if top:
        # A poured knee wall with a continuous steel handrail. It sits just
        # inside the deck edge, inboard of the treads' inner radius, and ties
        # the sealed side's newel to the stair's own balustrade so there is no
        # child-sized or capsule-sized escape gap over the shaft.
        cube('TopLanding_InnerParapet', (0, .55, inner + .15),
             (half, .52, .15), CONCRETE, edge=.035)
        cube('TopLanding_InnerFoot', (0, .10, inner + .15),
             (half + .04, .10, .19), CONCRETE, edge=.025)
        cube('TopLanding_InnerCap', (0, 1.10, inner + .15),
             (half + .06, .06, .21), BRUSHED, edge=.02)
        for x in (-1.20, -.60, 0, .60, 1.20):
            cube(f'TopLanding_InnerTie_{x:.1f}', (x, .62, inner + .31),
                 (.025, .38, .025), DARK, edge=.006)
    join_all('HabTopLanding' if top else 'HabLanding')
    export('hab_top_landing_v1.glb' if top else 'hab_landing_v4.glb')


def arch_head(name, xc, zc, half, spring, material, across=True, thick=.10, steps=6):
    """Fill the wall above an arched opening.

    The homes use rounded portals rather than square lintels, so above the
    springing line the wall has to follow a curve. Each band adds the sliver
    between the arc and the full width of the opening.
    """
    for k in range(steps):
        y0 = spring + half * k / steps
        y1 = spring + half * (k + 1) / steps
        f = (k + 1) / steps
        void = half * math.sqrt(max(0.0, 1 - f * f))
        if half - void < .012:
            continue
        for side in (-1, 1):
            c = side * (void + (half - void) / 2)
            w = (half - void) / 2
            if across:
                cube(f'{name}_{k}_{side}', (xc + c, (y0 + y1) / 2, zc),
                     (w, (y1 - y0) / 2, thick), material, edge=.012)
            else:
                cube(f'{name}_{k}_{side}', (xc, (y0 + y1) / 2, zc + c),
                     (thick, (y1 - y0) / 2, w), material, edge=.012)


def arched_ring(name, xc, zc, inner, spring, band, depth, material,
                steps=32, edge=.012):
    """A genuinely curved, extruded half-ring in the X/Y plane.

    The first tunnel was assembled from rotated boxes. At player height those
    boxes read as a voxel arch, and the repeated stepped `arch_head` ribs made
    the whole passage shimmer as the camera moved. This mesh has continuous
    inner/outer curves and only the deliberate structural seams authored on
    top of it.
    """
    verts = []
    for z_offset in (-depth, depth):
        for radius in (inner, inner + band):
            for i in range(steps + 1):
                angle = math.pi * i / steps
                verts.append((xc + math.cos(angle) * radius,
                              spring + math.sin(angle) * radius,
                              zc + z_offset))

    stride = steps + 1

    def idx(z_layer, radial, i):
        return z_layer * stride * 2 + radial * stride + i

    faces = []
    for i in range(steps):
        # Front/back annular faces.
        faces.append((idx(0, 0, i), idx(0, 0, i + 1),
                      idx(0, 1, i + 1), idx(0, 1, i)))
        faces.append((idx(1, 0, i), idx(1, 1, i),
                      idx(1, 1, i + 1), idx(1, 0, i + 1)))
        # The curved soffit and outer shoulder.
        faces.append((idx(0, 0, i), idx(1, 0, i),
                      idx(1, 0, i + 1), idx(0, 0, i + 1)))
        faces.append((idx(0, 1, i), idx(0, 1, i + 1),
                      idx(1, 1, i + 1), idx(1, 1, i)))
    for i in (0, steps):
        faces.append((idx(0, 0, i), idx(0, 1, i),
                      idx(1, 1, i), idx(1, 0, i)))

    mesh = bpy.data.meshes.new(f'{name}_Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(material)
    return world_uv(bevel(o, edge, segments=3))


def pendant(name, x, z, ceiling, drop, radius):
    """A pendant lamp: brass rose, a flex, and a blown glass dome."""
    cyl(f'{name}_Rod', (x, ceiling - drop / 2, z), .011, drop, DARK, rotation=UP, verts=6)
    cube(f'{name}_Rose', (x, ceiling - .045, z), (.075, .045, .075), BRASS, edge=.02)
    base = ceiling - drop
    loft(f'{name}_Dome', [
        ((x, base + radius * 1.32, z), radius * .26, radius * .26),
        ((x, base + radius * 1.06, z), radius * .70, radius * .70),
        ((x, base + radius * .70, z), radius * 1.00, radius * 1.00),
        ((x, base + radius * .26, z), radius * .95, radius * .95),
        ((x, base + radius * .02, z), radius * .68, radius * .68),
    ], PENDANT, sides=12, subdiv=1)


def pouf(name, x, z, r=.42, h=.40, material=POTTERY):
    """A floor cushion. Every room in the reference has a couple."""
    return loft(name, [
        ((x, .02, z), r * .84, r * .84),
        ((x, h * .42, z), r, r),
        ((x, h * .84, z), r * .90, r * .90),
        ((x, h, z), r * .58, r * .58),
    ], material, sides=14, subdiv=1)


def tub_chair(name, x, z, facing):
    """A low tub chair on a chrome pedestal, the way the reference does them."""
    cyl(f'{name}_Foot', (x, .025, z), .30, .05, STEEL, rotation=UP, verts=16, edge=.012)
    cyl(f'{name}_Stem', (x, .21, z), .055, .34, STEEL, rotation=UP, verts=12)
    loft(f'{name}_Seat', [
        ((x, .36, z), .40, .40),
        ((x, .44, z), .46, .46),
        ((x, .52, z), .40, .40),
    ], ORANGE, sides=14, subdiv=1)
    for k in range(5):
        t = facing + math.pi + (k - 2) * .38
        cube(f'{name}_Back_{k}', (x + math.cos(t) * .40, .72, z + math.sin(t) * .40),
             (.11, .24, .14), ORANGE, rotation=(0, -t, 0), edge=.06)


def house_plant(name, x, z, scale=1.0):
    """A big leafy plant in a glazed pot."""
    loft(f'{name}_Pot', [
        ((x, .01, z), .18 * scale, .18 * scale),
        ((x, .16 * scale, z), .26 * scale, .26 * scale),
        ((x, .34 * scale, z), .23 * scale, .23 * scale),
        ((x, .40 * scale, z), .25 * scale, .25 * scale),
    ], POTTERY, sides=12, subdiv=1)
    # Many narrow blades rather than a handful of broad flat cards: nine big
    # rectangles crossing each other reads as cardboard, however you angle it.
    for k in range(15):
        t = k * math.tau / 15 * 2.1 + .4
        tier = k % 4
        lean = (.10 + tier * .055) * scale
        y = (.62 + tier * .13) * scale
        tilt = (.22 + tier * .13) * (1 if k % 2 else -1)
        cube(f'{name}_Leaf_{k}',
             (x + math.cos(t) * lean, y, z + math.sin(t) * lean),
             (.045 * scale, (.40 - tier * .05) * scale, .009 * scale), LEAF,
             rotation=(0, -t, tilt), edge=.02)


def build_apartment():
    """A home: a two-bedroom flat, one behind every door in the silo.

    Not one open room, and not a bunker. A hall inside the front door, a galley
    kitchen off it, a living room the family eats in, and two bedrooms behind
    their own doors. Furnished the way the silo's living spaces are meant to
    read: rust carpet, cream plaster, a glazed tile band round the walls at
    waist height under a brass bead, slim dark mullions dividing the panels,
    rounded portals rather than square doorways, low orange furniture, and
    pendants with blown orange glass hanging on flexes from a coved ceiling.

    Built centred on the origin facing -Z toward its own front door, so the
    runtime rotates a copy into every bay and authors collision to match.
    """
    clear_scene()
    width = 2 * arc_half(DECK_OUTER, overlap=1.0) - .3
    depth = APARTMENT_BACK - DECK_OUTER
    height = LEVEL_HEIGHT - .5
    half_w = width / 2
    half_d = depth / 2

    # Room plan, in metres from the middle of the home. src/silo.js builds the
    # collision from the same numbers — keep the two in step.
    HALL_BACK = -2.75
    KITCHEN_X = -1.40
    KITCHEN_BACK = -.35
    BED_FRONT = 1.25
    DOOR_W = .62            # 1.24 m clear bedroom and kitchen portals
    # The front door used to face a solid partition only 1.8 m inside the
    # apartment. Its two off-centre arches made the open home look barricaded
    # from the gallery and forced the player to turn sharply in a tiny hall.
    # A broad central arch now opens the entrance directly into the living room.
    WIDE_W = 1.80           # 3.6 m opening into the family living room
    SPRING = 1.72           # springing line of every arch
    T = .10

    walls = []          # every partition, for the layout check at the end

    def part_z(name, zc, x0, x1, y0=0.0, y1=height, material=CREAM):
        if x1 - x0 < .02:
            return None
        walls.append((name, x0, x1, zc - T, zc + T, y0, y1))
        return cube(name, ((x0 + x1) / 2, (y0 + y1) / 2, zc),
                    ((x1 - x0) / 2, (y1 - y0) / 2, T), material, edge=.02)

    def part_x(name, xc, z0, z1, y0=0.0, y1=height, material=CREAM):
        walls.append((name, xc - T, xc + T, z0, z1, y0, y1))
        return cube(name, (xc, (y0 + y1) / 2, (z0 + z1) / 2),
                    (T, (y1 - y0) / 2, (z1 - z0) / 2), material, edge=.02)

    def check_layout():
        """Fail the build if a piece of furniture is standing inside a wall.

        The rooms are laid out by hand in metres and the furniture is placed by
        hand in metres, so it is entirely possible — and it happened — to put
        the sofa half inside the bedroom partition and the wardrobe through the
        bed. Cheap to check, and impossible to see from a screenshot taken from
        the wrong side of the room.
        """
        skip = ('Apt_P1', 'Apt_P2', 'Apt_P3', 'Apt_P4', 'Apt_Portal', 'Apt_Band',
                'Apt_Mul', 'Apt_Front', 'Apt_Back', 'Apt_Side', 'Apt_Ceiling',
                'Apt_Cove', 'Apt_Floor', 'Apt_Carpet', 'Apt_Down', 'Apt_Hatch',
                'Apt_Art', 'Apt_Hook', 'Apt_Splashback', 'Apt_Skirting')
        bad = []
        for o in list(bpy.context.scene.objects):
            if o.type != 'MESH' or any(o.name.startswith(k) for k in skip):
                continue
            corners = [o.matrix_world @ Vector(c) for c in o.bound_box]
            ox0, ox1 = min(c.x for c in corners), max(c.x for c in corners)
            oz0, oz1 = min(c.z for c in corners), max(c.z for c in corners)
            oy0, oy1 = min(c.y for c in corners), max(c.y for c in corners)
            for wname, wx0, wx1, wz0, wz1, wy0, wy1 in walls:
                ox = min(ox1, wx1) - max(ox0, wx0)
                oz = min(oz1, wz1) - max(oz0, wz0)
                oy = min(oy1, wy1) - max(oy0, wy0)
                if ox > .06 and oz > .06 and oy > .06:
                    bad.append(f'{o.name} is {min(ox, oz):.2f} m inside {wname}')
                    break
        # ...and furniture standing inside other furniture. A wardrobe through
        # a bed and a desk through the bunks both survived a screenshot.
        def group(n):
            return '_'.join(n.split('_')[:2])

        # Things that belong inside other things.
        NESTED = (('Apt_Books', 'Apt_Shelf'), ('Apt_Jar', 'Apt_Shelf'),
                  ('Apt_Vessel', 'Apt_Console'), ('Apt_Pot_', 'Apt_Coffee'),
                  ('Apt_Bowl', 'Apt_Table'), ('Apt_Key', 'Apt_Desk'),
                  ('Apt_Pillow', 'Apt_Bunk'), ('Apt_Blanket', 'Apt_Bunk'),
                  ('Apt_Mattress', 'Apt_Bunk'), ('Apt_Pillow', 'Apt_BedA'),
                  ('Apt_Blanket', 'Apt_BedA'), ('Apt_Mattress', 'Apt_BedA'),
                  ('Apt_Cushion', 'Apt_Sofa'), ('Apt_Ladder', 'Apt_Bunk'),
                  ('Apt_WardrobeDoor', 'Apt_Wardrobe'),
                  ('Apt_WardrobeKnob', 'Apt_Wardrobe'),
                  ('Apt_Coat', 'Apt_Hook'), ('Apt_Ring', 'Apt_Hob'),
                  ('Apt_Sink', 'Apt_Counter'), ('Apt_Hob', 'Apt_Counter'),
                  ('Apt_Drawer', 'Apt_Counter'), ('Apt_Tap', 'Apt_Counter'),
                  ('Apt_LarderHandle', 'Apt_Larder'),
                  ('Apt_Leaf', 'Apt_'), ('Apt_Stem', 'Apt_'))

        def _nested(n1, n2):
            for inner, outer in NESTED:
                if (n1.startswith(inner) and n2.startswith(outer)) or \
                   (n2.startswith(inner) and n1.startswith(outer)):
                    return True
            return False
        pieces = []
        for o in list(bpy.context.scene.objects):
            if o.type != 'MESH' or any(o.name.startswith(k) for k in skip):
                continue
            corners = [o.matrix_world @ Vector(c) for c in o.bound_box]
            pieces.append((o.name, group(o.name),
                           min(c.x for c in corners), max(c.x for c in corners),
                           min(c.y for c in corners), max(c.y for c in corners),
                           min(c.z for c in corners), max(c.z for c in corners)))
        for i in range(len(pieces)):
            for j in range(i + 1, len(pieces)):
                a, b = pieces[i], pieces[j]
                if a[1] == b[1] or _nested(a[0], b[0]):
                    continue
                ox = min(a[3], b[3]) - max(a[2], b[2])
                oy = min(a[5], b[5]) - max(a[4], b[4])
                oz = min(a[7], b[7]) - max(a[6], b[6])
                if ox > .15 and oy > .15 and oz > .15:
                    bad.append(f'{a[0]} and {b[0]} are {min(ox, oy, oz):.2f} m inside each other')
        if bad:
            print('LAYOUT FAULTS: %d' % len(bad))
            for b in bad:
                print('  -', b)
            raise SystemExit('apartment layout has furniture inside walls')
        print('LAYOUT OK: %d walls, no furniture inside one' % len(walls))

    def portal(name, xc, zc, half):
        """An arched opening in a cross partition: reveal, arch, wall above."""
        arch_head(f'{name}_arch', xc, zc, half, SPRING, CREAM, across=True, thick=T)
        part_z(f'{name}_over', zc, xc - half, xc + half, SPRING + half, height)
        for k in (-1, 1):
            cube(f'{name}_reveal_{k}', (xc + k * (half + .035), (SPRING + half) / 2, zc),
                 (.035, (SPRING + half) / 2, T + .015), BRASS, edge=.01)

    def band(name, x0, x1, zc, across=True, facing=1):
        """The glazed tile band and its brass capping bead."""
        if across:
            cube(f'{name}_tile', ((x0 + x1) / 2, 1.22, zc + facing * (T + .012)),
                 ((x1 - x0) / 2, .17, .012), TILEBAND, edge=.006)
            cube(f'{name}_cap', ((x0 + x1) / 2, 1.40, zc + facing * (T + .016)),
                 ((x1 - x0) / 2, .020, .016), BRASS, edge=.006)
        else:
            cube(f'{name}_tile', (zc + facing * (T + .012), 1.22, (x0 + x1) / 2),
                 (.012, .17, (x1 - x0) / 2), TILEBAND, edge=.006)
            cube(f'{name}_cap', (zc + facing * (T + .016), 1.40, (x0 + x1) / 2),
                 (.016, .020, (x1 - x0) / 2), BRASS, edge=.006)

    def mullions(name, x0, x1, zc, spacing=.90):
        """Slim dark rods dividing the wall panels, floor to ceiling."""
        n = max(1, int((x1 - x0) / spacing))
        for k in range(1, n):
            cube(f'{name}_{k}', (x0 + (x1 - x0) * k / n, height / 2, zc),
                 (.018, height / 2, .022), DARK, edge=.005)

    # --- Shell ---------------------------------------------------------------
    cube('Apt_Carpet', (0, -.02, 0), (half_w, .02, half_d), CARPET, edge=.01)
    cube('Apt_Floor', (0, -.12, 0), (half_w, .10, half_d), WARM, edge=.02)
    cube('Apt_Back', (0, height / 2, half_d), (half_w, height / 2, .18), CREAM, edge=.04)
    for side in (-1, 1):
        cube(f'Apt_Side_{side}', (side * half_w, height / 2, 0), (.18, height / 2, half_d),
             CREAM, edge=.04)
    # No front wall here. The level ring already builds the wall of front doors
    # at this radius, and a second one in the same place is two coplanar
    # surfaces fighting over every pixel of the doorway.

    # Coved ceiling: a stepped tray with the light washing the recess, and
    # small downlights in the flat.
    cube('Apt_Ceiling', (0, height + .10, 0), (half_w, .10, half_d), CREAM, edge=.03)
    for k, (inset, drop) in enumerate(((0.0, .00), (.55, .10), (1.05, .18))):
        cube(f'Apt_Cove_{k}', (0, height - drop / 2 - .01, 0),
             (half_w - inset, max(.02, drop / 2), half_d - inset), CREAM, edge=.02)
    for dz in (-1.9, .4, 2.7):
        for dx in (-3.3, 0, 3.3):
            cyl(f'Apt_Down_{dx}_{dz}', (dx, height - .22, dz), .075, .03, WARMLAMP,
                rotation=UP, verts=12, edge=.006)

    # Tile band and mullions round the outside walls.
    band('Apt_BandBack', -half_w + .3, half_w - .3, half_d - .18, across=True, facing=-1)
    mullions('Apt_MulBack', -half_w + .5, half_w - .5, half_d - .20)
    for side in (-1, 1):
        band(f'Apt_BandSide_{side}', -half_d + .3, half_d - .3, side * (half_w - .18),
             across=False, facing=-side)

    # --- Partitions ----------------------------------------------------------
    kitchen_door, living_gap = -3.10, 0.0
    hall_spans = (
        (-half_w, kitchen_door - DOOR_W),
        (kitchen_door + DOOR_W, living_gap - WIDE_W),
        (living_gap + WIDE_W, half_w),
    )
    for index, (x0, x1) in enumerate(hall_spans):
        part_z(f'Apt_P1_{index}', HALL_BACK, x0, x1)
        # Finish only the solid wall. The old full-width tile band crossed both
        # arched openings at waist height and looked exactly like a wooden
        # barrier across every open apartment.
        if x1 - x0 > .08:
            band(f'Apt_BandHall_{index}', x0, x1, HALL_BACK, across=True, facing=-1)
    portal('Apt_Portal_K', kitchen_door, HALL_BACK, DOOR_W)
    portal('Apt_Portal_L', living_gap, HALL_BACK, WIDE_W)

    part_x('Apt_P2_low', KITCHEN_X, HALL_BACK, KITCHEN_BACK, 0, 1.02)
    part_x('Apt_P2_high', KITCHEN_X, HALL_BACK, -2.10, 1.02, height)
    part_x('Apt_P2_head', KITCHEN_X, -2.10, KITCHEN_BACK, 2.20, height)
    cube('Apt_HatchSill', (KITCHEN_X, 1.06, -1.35), (T + .05, .04, .70), BRASS, edge=.01)

    bed_a, bed_b = -2.50, 2.50
    bed_spans = (
        (-half_w, bed_a - DOOR_W),
        (bed_a + DOOR_W, bed_b - DOOR_W),
        (bed_b + DOOR_W, half_w),
    )
    for index, (x0, x1) in enumerate(bed_spans):
        part_z(f'Apt_P3_{index}', BED_FRONT, x0, x1)
        if x1 - x0 > .08:
            band(f'Apt_BandBed_{index}', x0, x1, BED_FRONT, across=True, facing=1)
    for xc in (bed_a, bed_b):
        portal(f'Apt_Portal_B{xc:.1f}', xc, BED_FRONT, DOOR_W)
    part_x('Apt_P4', 0, BED_FRONT, half_d)

    # --- Hall ----------------------------------------------------------------
    hall_z = (-half_d + HALL_BACK) / 2
    pendant('Apt_HallPend', 0, hall_z, height, .52, .17)
    cube('Apt_Hook_Rail', (DOOR_HALF + .9, 1.86, -half_d + .26), (.62, .035, .05), BRASS, edge=.01)
    for c, cx in enumerate((-.36, .06, .48)):
        cube(f'Apt_Coat_{c}', (DOOR_HALF + .9 + cx, 1.40, -half_d + .34), (.16, .42, .09),
             CLOTH if c % 2 else ORANGE, edge=.03)
    for bx in (DOOR_HALF + .38, DOOR_HALF + .66):
        cube(f'Apt_Boot_{bx:.2f}', (bx, .09, -half_d + .58), (.10, .09, .17), DARK, edge=.02)
    cube('Apt_Art', (-DOOR_HALF - .70, 1.80, -half_d + .19), (.40, .30, .02), TILEBAND, edge=.008)
    cube('Apt_ArtFrame', (-DOOR_HALF - .70, 1.80, -half_d + .17), (.44, .34, .015), BRASS, edge=.008)
    # A console table against the hall wall, with a couple of brass vessels.
    cube('Apt_Console', (-half_w + .62, .78, hall_z), (.42, .04, .52), CREAM, edge=.02)
    for k in (-1, 1):
        cube(f'Apt_ConsoleLeg_{k}', (-half_w + .62, .38, hall_z + k * .40),
             (.36, .38, .05), CREAM, edge=.02)
    for i, oz in enumerate((-.24, .04, .28)):
        loft(f'Apt_Vessel_{i}', [
            ((-half_w + .62, .82, hall_z + oz), .05, .05),
            ((-half_w + .62, .90, hall_z + oz), .085, .085),
            ((-half_w + .62, .99, hall_z + oz), .06, .06),
        ], BRASS if i % 2 else POTTERY, sides=10, subdiv=1)
    house_plant('Apt_HallPlant', half_w - .60, hall_z + .40, .9)

    # --- Kitchen -------------------------------------------------------------
    kx = -half_w + .55
    kz = (HALL_BACK + KITCHEN_BACK) / 2
    cube('Apt_Counter', (kx, .96, kz), (.42, .06, 1.10), BRASS, edge=.02)
    cube('Apt_CounterBody', (kx, .47, kz), (.40, .47, 1.06), TILEBAND, edge=.03)
    for d in range(3):
        cube(f'Apt_Drawer_{d}', (kx - .40, .42 + d * .30, kz - .48 + d * .06), (.02, .12, .40),
             BRASS, edge=.01)
    cube('Apt_Sink', (kx, .99, kz + .58), (.30, .05, .34), STEEL, edge=.015)
    cyl('Apt_Tap', (kx + .24, 1.16, kz + .58), .022, .34, BRASS, rotation=UP, verts=10)
    cube('Apt_Hob', (kx, 1.03, kz - .60), (.28, .03, .30), DARK, edge=.01)
    for r in range(2):
        for c in range(2):
            cyl(f'Apt_Ring_{r}_{c}', (kx - .14 + c * .28, 1.05, kz - .74 + r * .28),
                .085, .02, STEEL, rotation=UP, verts=14)
    cube('Apt_Splashback', (-half_w + .20, 1.34, kz), (.03, .34, 1.06), TILEBAND, edge=.01)
    for shelf in range(2):
        cube(f'Apt_Shelf_{shelf}', (kx - .10, 2.02 + shelf * .40, kz), (.28, .035, 1.00),
             WARM, edge=.012)
        for j in range(4):
            cyl(f'Apt_Jar_{shelf}_{j}', (kx - .10, 2.16 + shelf * .40, kz - .78 + j * .52),
                .062, .22, GLASS if j % 2 else BRASS, rotation=UP, verts=10)
    cube('Apt_Larder', (-2.12, 1.05, -2.20), (.38, 1.05, .38), WARM, edge=.03)
    cube('Apt_LarderHandle', (-2.12, 1.20, -2.60), (.10, .12, .02), BRASS, edge=.006)
    cube('Apt_KitchenLight', (kx + .10, 1.94, kz), (.26, .035, .90), WARMLAMP, edge=.012)

    # --- Living room ---------------------------------------------------------
    # Keep a full capsule-width circulation lane from the front arch to the
    # bedroom corridor; the former centred table turned solid furniture into
    # a new barrier as soon as proper collision was added.
    lx, lz = 1.00, -1.45
    pendant('Apt_LivPend', lx, lz, height, .80, .24)
    pendant('Apt_LivPend2', 2.60, .35, height, 1.05, .19)
    cube('Apt_Table', (lx, .74, lz), (.96, .05, .58), WARM, edge=.03)
    for tx in (-.78, .78):
        for tz in (-.42, .42):
            cube(f'Apt_TableLeg_{tx}_{tz}', (lx + tx, .36, lz + tz), (.055, .36, .055), BRASS, edge=.012)
    for side, sz in ((-1, -.88), (1, .88)):
        cube(f'Apt_Bench_{side}', (lx, .43, lz + sz), (.92, .05, .20), WARM, edge=.02)
        for bx in (-.68, .68):
            cube(f'Apt_BenchLeg_{side}_{bx}', (lx + bx, .21, lz + sz), (.05, .21, .16), BRASS, edge=.01)
    for i, ox in enumerate((-.50, -.02, .44)):
        cyl(f'Apt_Bowl_{i}', (lx + ox, .80, lz + (i % 2) * .20), .10, .06, BRASS,
            rotation=UP, verts=14)

    # The sitting end: a low sofa, a round table, poufs and a tub chair.
    cube('Apt_Sofa_Base', (2.60, .30, .28), (.86, .30, .42), ORANGE, edge=.10)
    cube('Apt_Sofa_Back', (2.60, .66, .64), (1.02, .34, .14), ORANGE, edge=.12)
    for k in (-1, 1):
        loft(f'Apt_Sofa_End_{k}', [
            ((2.60 + k * .90, .02, .28), .19, .42),
            ((2.60 + k * .90, .34, .28), .22, .45),
            ((2.60 + k * .90, .58, .28), .18, .38),
        ], ORANGE, sides=12, subdiv=1)
    for cx in (-.52, .52):
        cube(f'Apt_Cushion_{cx}', (2.60 + cx, .64, .22), (.40, .09, .34), CLOTH, edge=.06)
    loft('Apt_CoffeeTop', [
        ((2.60, .34, -.70), .44, .44),
        ((2.60, .40, -.70), .46, .46),
        ((2.60, .44, -.70), .42, .42),
    ], BRASS, sides=16, subdiv=1)
    cyl('Apt_CoffeeStem', (2.60, .17, -.70), .07, .34, STEEL, rotation=UP, verts=12)
    for i, (ox, oz) in enumerate(((-.16, -.10), (.10, .12), (.20, -.14))):
        loft(f'Apt_Pot_{i}', [
            ((2.60 + ox, .45, -.70 + oz), .045, .045),
            ((2.60 + ox, .53, -.70 + oz), .075, .075),
            ((2.60 + ox, .60, -.70 + oz), .05, .05),
        ], BRASS if i % 2 else POTTERY, sides=10, subdiv=1)
    pouf('Apt_Pouf_1', .65, .55, .40, .38, POTTERY)
    pouf('Apt_Pouf_2', 4.15, .60, .36, .34, TILEBAND)
    tub_chair('Apt_Tub', 4.05, -.75, 2.2)
    cube('Apt_Rug', (2.60, .01, -.20), (1.55, .01, 1.18), TILEBAND, edge=.01)
    cube('Apt_Shelf_Tall', (half_w - .55, 1.30, -1.85), (.22, 1.30, .62), WARM, edge=.03)
    for b in range(4):
        cube(f'Apt_Books_{b}', (half_w - .55, .38 + b * .62, -1.85 + (b % 2) * .18),
             (.16, .16, .40), ORANGE if b % 2 else AMBER, edge=.01)
    house_plant('Apt_LivPlant', -.55, .48, 1.05)

    # --- Bedroom A: the parents' room ----------------------------------------
    ax, az = -2.55, BED_FRONT + 1.90
    cube('Apt_BedA_Frame', (ax, .30, az), (.98, .18, 1.05), WARM, edge=.04)
    cube('Apt_BedA_Mattress', (ax, .54, az), (.94, .12, 1.00), CLOTH, edge=.07)
    cube('Apt_BedA_Blanket', (ax, .58, az + .25), (.95, .09, .74), ORANGE, edge=.07)
    for k in (-1, 1):
        cube(f'Apt_BedA_Pillow_{k}', (ax + k * .44, .68, az - .78), (.40, .09, .24), BONE, edge=.05)
    cube('Apt_BedA_Head', (ax, .86, az - 1.08), (.98, .56, .06), TILEBAND, edge=.03)
    cube('Apt_BedA_Table', (-1.18, .32, az - .88), (.24, .32, .24), WARM, edge=.03)
    pendant('Apt_BedA_Pend', -1.18, az - .88, height, 1.60, .13)
    cube('Apt_Wardrobe', (-4.25, 1.10, half_d - .48), (.46, 1.10, .34), WARM, edge=.04)
    for k in (-1, 1):
        cube(f'Apt_WardrobeDoor_{k}', (-4.25 + k * .23, 1.10, half_d - .83),
             (.21, 1.02, .02), TILEBAND, edge=.012)
        cube(f'Apt_WardrobeKnob_{k}', (-4.25 + k * .05, 1.06, half_d - .86),
             (.03, .03, .02), BRASS, edge=.006)
    cube('Apt_BedA_Light', (ax, height - .16, az), (.22, .04, .22), WARMLAMP, edge=.015)
    pouf('Apt_BedA_Pouf', -4.05, BED_FRONT + .70, .32, .30, ORANGE)

    # --- Bedroom B: the children's room --------------------------------------
    bx2, bz = 2.25, BED_FRONT + 1.95
    for bunk in range(2):
        y = .48 + bunk * 1.12
        cube(f'Apt_BunkFrame_{bunk}', (bx2, y, bz), (.95, .07, 1.02), WARM, edge=.03)
        cube(f'Apt_Mattress_{bunk}', (bx2, y + .13, bz), (.88, .10, .96), CLOTH, edge=.05)
        cube(f'Apt_Pillow_{bunk}', (bx2, y + .23, bz - .74), (.38, .09, .22), BONE, edge=.04)
        cube(f'Apt_Blanket_{bunk}', (bx2, y + .21, bz + .28), (.86, .06, .62), ORANGE, edge=.04)
    for px in (bx2 - .92, bx2 + .92):
        for pz in (bz - 1.0, bz + 1.0):
            cube(f'Apt_BunkPost_{px:.1f}_{pz:.1f}', (px, 1.15, pz), (.05, 1.15, .05), BRASS, edge=.012)
    cube('Apt_Ladder_Rail', (bx2 - .84, .95, bz - 1.1), (.04, .95, .04), BRASS, edge=.01)
    for r in range(3):
        cube(f'Apt_Ladder_Rung_{r}', (bx2 - .50, .50 + r * .40, bz - 1.1), (.34, .03, .03),
             BRASS, edge=.008)
    cube('Apt_Desk', (4.25, .72, half_d - 1.30), (.34, .04, .55), WARM, edge=.02)
    for dz in (-.46, .46):
        cube(f'Apt_DeskLeg_{dz}', (4.25, .36, half_d - 1.30 + dz), (.30, .36, .04),
             BRASS, edge=.01)
    cube('Apt_DeskLamp', (4.25, .92, half_d - 1.70), (.09, .15, .09), WARMLAMP, edge=.02)
    cube('Apt_ToyCrate', (.55, .22, half_d - .45), (.32, .22, .26), ORANGE, edge=.04)
    cube('Apt_BedB_Light', (bx2, height - .16, bz), (.22, .04, .22), WARMLAMP, edge=.015)

    check_layout()
    join_all('HabApartment')
    export('hab_apartment_v4.glb')


def build_door():
    """A single front door leaf, placed per bay so it can stand open.

    Built with its origin on the hinge rather than in the middle of the leaf,
    so an open door swings on its jamb instead of pivoting about its centre.
    """
    clear_scene()
    leaf = DOOR_HALF - .04
    cube('Door_Leaf', (leaf, 1.05, 0), (leaf, 1.05, .05), DOORPAINT, edge=.02)
    cube('Door_Kick', (leaf, .18, -.01), (leaf, .18, .06), BRUSHED, edge=.015)
    cube('Door_Rail', (leaf, 1.55, -.02), (leaf - .06, .05, .05), BRUSHED, edge=.01)
    cyl('Door_Handle', (leaf * 1.72, 1.05, -.10), .032, .20, BRUSHED, rotation=UP, verts=10)
    cube('Door_Plate', (leaf * 1.72, 1.30, -.06), (.07, .11, .02), BRUSHED, edge=.006)
    cube('Door_Hinge_lo', (.03, .55, .02), (.04, .09, .07), DARK, edge=.01)
    cube('Door_Hinge_hi', (.03, 1.65, .02), (.04, .09, .07), DARK, edge=.01)
    join_all('HabDoor')
    export('hab_door_v4.glb')


def build_crown():
    """The head of the shaft.

    Looking up used to end on a blank disc, which is the single most obviously
    unfinished thing in the silo. This is what a poured concrete silo actually
    does at the top: a coffered slab on radial ribs and ring beams, a great
    petalled oculus in the middle of it with the light behind, extract grilles
    between the ribs, and a ring of downlights over the top gallery.

    Authored at y = 0 on the ceiling plane, with everything hanging below it.
    """
    clear_scene()
    R = WELL_RADIUS + 1.4
    RIBS = 16

    cyl('Crown_Slab', (0, .55, 0), R + .3, 1.1, CONCRETE, rotation=UP, verts=48, edge=.08)
    # Ring beams: three concentric downstands, deepest at the outside.
    for i, (rr, drop, thick) in enumerate(((R - .2, .46, .30), (R * .70, .38, .26),
                                           (R * .44, .30, .22))):
        ring_band(f'Crown_Ring_{i}', rr, thick / 2, -drop / 2, drop / 2, CONCRETE,
                  segs=40, edge=.03)
    # Radial ribs between them, so the slab reads as coffered rather than flat.
    for i in range(RIBS):
        a = i * math.tau / RIBS
        cube(f'Crown_Rib_{i}', (math.cos(a) * R * .58, -.20, math.sin(a) * R * .58),
             (R * .46, .20, .16), CONCRETE, rotation=(0, -a, 0), edge=.03)
        # An extract grille in every other coffer.
        if i % 2 == 0:
            gx, gz = math.cos(a + .10) * R * .80, math.sin(a + .10) * R * .80
            cube(f'Crown_Vent_{i}', (gx, -.13, gz), (.44, .06, .30), DARK,
                 rotation=(0, -a, 0), edge=.02)
            for b in range(4):
                cube(f'Crown_VentBar_{i}_{b}', (gx, -.18, gz), (.40, .014, .05), BRUSHED,
                     rotation=(0, -a, 0), edge=.004)
        else:
            # ...and a downlight in the others, over the top gallery.
            lx, lz = math.cos(a + .10) * R * .86, math.sin(a + .10) * R * .86
            cyl(f'Crown_Down_{i}', (lx, -.16, lz), .17, .07, DARK, rotation=UP, verts=16, edge=.02)
            cyl(f'Crown_DownGlow_{i}', (lx, -.21, lz), .135, .03, WHITELIGHT,
                rotation=UP, verts=16, edge=.006)

    # The oculus: a lit disc with petal ribs across it. Kept small — a ten-metre
    # emissive disc is not a skylight, it is a white sky.
    OC = R * .20
    cyl('Crown_OculusGlass', (0, -.10, 0), OC, .08, WARMLAMP, rotation=UP, verts=36, edge=.01)
    ring_band('Crown_OculusRim', OC + .14, .16, -.16, .18, BRUSHED, segs=32, edge=.02)
    for i in range(12):
        a = i * math.tau / 12
        cube(f'Crown_Petal_{i}', (math.cos(a) * OC * .55, -.15, math.sin(a) * OC * .55),
             (OC * .58, .04, .055), CONCRETE, rotation=(0, -a, 0), edge=.015)
    cyl('Crown_OculusBoss', (0, -.18, 0), OC * .20, .14, CONCRETE, rotation=UP, verts=20, edge=.03)

    # Cable trays and a conduit run crossing the coffers, because a ceiling in a
    # working building is never clean.
    for i in range(3):
        a = i * math.tau / 3 + .4
        cube(f'Crown_Tray_{i}', (0, -.34, 0), (R * .92, .04, .13), DARK,
             rotation=(0, -a, 0), edge=.015)
        for k in range(5):
            t = -R * .8 + k * R * .4
            cube(f'Crown_TrayHang_{i}_{k}', (math.cos(a) * t, -.24, math.sin(a) * t),
                 (.03, .12, .03), BRUSHED, edge=.008)
    join_all('HabCrown')
    export('hab_crown_v5.glb')


def build_sump():
    """The bottom of the shaft.

    Looking down used to end on a blank disc too. The floor of a silo is where
    the water goes: a stepped drain in concentric gratings around a bolted sump
    cover, hazard bands, the risers coming down out of the wall into it, and the
    stores that end up at the bottom of anywhere.

    Authored at y = 0 on the floor plane.
    """
    clear_scene()
    R = WELL_RADIUS

    cyl('Sump_Slab', (0, -.16, 0), R + .4, .32, CONCRETE, rotation=UP, verts=48, edge=.05)
    # Stepped fall toward the middle, in three rings.
    for i, (rr, drop) in enumerate(((R * .82, .10), (R * .58, .20), (R * .34, .30))):
        cyl(f'Sump_Step_{i}', (0, -drop / 2, 0), rr, drop, CONCRETE,
            rotation=UP, verts=40, edge=.03)
    # Grating over the channels: concentric bars and radial bearers.
    for i, rr in enumerate((R * .86, R * .62, R * .38)):
        ring_band(f'Sump_Grate_{i}', rr, .17, -.02, .025, DARK, segs=44, edge=.008)
    for i in range(28):
        a = i * math.tau / 28
        cube(f'Sump_Bearer_{i}', (math.cos(a) * R * .60, -.015, math.sin(a) * R * .60),
             (R * .30, .04, .03), BRUSHED, rotation=(0, -a, 0), edge=.006)

    # The sump cover itself, bolted, with a lifting ring.
    cyl('Sump_Cover', (0, -.02, 0), R * .17, .12, BRUSHED, rotation=UP, verts=28, edge=.02)
    cyl('Sump_CoverInner', (0, .03, 0), R * .13, .04, DARK, rotation=UP, verts=28, edge=.01)
    for i in range(10):
        a = i * math.tau / 10
        cyl(f'Sump_Bolt_{i}', (math.cos(a) * R * .15, .05, math.sin(a) * R * .15),
            .028, .04, DARK, rotation=UP, verts=8, edge=.006)
    bpy.ops.mesh.primitive_torus_add(location=(0, .09, 0), rotation=UP,
                                     major_radius=.24, minor_radius=.035,
                                     major_segments=24, minor_segments=8)
    ring = bpy.context.object
    ring.name = 'Sump_LiftRing'
    ring.data.materials.append(BRUSHED)
    for poly in ring.data.polygons:
        poly.use_smooth = True

    # Hazard banding round the drain, and painted keep-clear chevrons.
    for i in range(24):
        a = i * math.tau / 24
        cube(f'Sump_Hazard_{i}', (math.cos(a) * R * .27, .01, math.sin(a) * R * .27),
             (.20, .012, .10), AMBER if i % 2 == 0 else DARK, rotation=(0, -a, 0), edge=.004)

    # Risers coming down the wall into the floor, with valves and a gauge.
    for i in range(5):
        a = i * math.tau / 5 + .35
        px, pz = math.cos(a) * (R - .55), math.sin(a) * (R - .55)
        cyl(f'Sump_Riser_{i}', (px, 1.3, pz), .085, 2.6, BRUSHED, rotation=UP, verts=12)
        cyl(f'Sump_Elbow_{i}', (px, .10, pz), .10, .22, BRUSHED, rotation=UP, verts=12, edge=.02)
        cyl(f'Sump_Valve_{i}', (px, .92, pz), .15, .10, REDLIGHT, rotation=UP, verts=16, edge=.02)
        cube(f'Sump_Clamp_{i}', (px, 1.85, pz), (.14, .05, .14), DARK, rotation=(0, -a, 0), edge=.01)

    # Stores that end up at the bottom of anywhere, and a work lamp on a stand.
    for i, (a, n) in enumerate(((.9, 3), (2.7, 2), (4.6, 3))):
        bx, bz = math.cos(a) * (R - 2.2), math.sin(a) * (R - 2.2)
        for k in range(n):
            cube(f'Sump_Crate_{i}_{k}', (bx + k * .06, .28 + k * .56, bz - k * .05),
                 (.42, .28, .34), PAINT if k % 2 else STEEL, rotation=(0, -a + k * .12, 0), edge=.03)
    for i, a in enumerate((1.9, 5.1)):
        lx, lz = math.cos(a) * (R - 3.4), math.sin(a) * (R - 3.4)
        for k in range(3):
            t = a + k * math.tau / 3
            cube(f'Sump_LampLeg_{i}_{k}', (lx + math.cos(t) * .22, .32, lz + math.sin(t) * .22),
                 (.03, .32, .03), DARK, rotation=(0, -t, .12), edge=.008)
        cyl(f'Sump_LampMast_{i}', (lx, 1.0, lz), .035, 1.4, DARK, rotation=UP, verts=8)
        cube(f'Sump_LampHead_{i}', (lx, 1.72, lz), (.24, .16, .12), DARK,
             rotation=(0, -a, .18), edge=.02)
        cube(f'Sump_LampGlow_{i}', (lx, 1.72, lz + .10), (.20, .12, .03), WHITELIGHT,
             rotation=(0, -a, .18), edge=.008)
    join_all('HabSump')
    export('hab_sump_v5.glb')


def build_tunnel():
    """Smooth arched passage and playable maintenance room behind its bulkhead."""
    clear_scene()
    SPAN = 1.80          # half-width of the landmark arch
    # SPAN + haunch + spandrel has to equal TUNNEL_WALL_HALF, or the ring's
    # filler panels and this wall stop meeting.
    assert abs((SPAN + 1.64) - TUNNEL_WALL_HALF) < 1e-6, 'tunnel wall width drifted'
    SPRING = 1.95        # springing line
    DEPTH = 3.20         # ribbed passage before the bulkhead
    DOOR_Z = 3.72        # shared with src/silo.js
    BULKHEAD_HALF = .98
    ROOM_HALF = 2.72
    ROOM_BACK = 9.45
    HEAD = SPRING + SPAN

    # The wall the arch is cut through, built as the two haunches and the
    # spandrel above, so the opening is a real hole rather than a painted one.
    for k in (-1, 1):
        cube(f'Tun_Haunch_{k}', (k * (SPAN + .82), HEAD / 2, 0), (.82, HEAD / 2, .30),
             CONCRETE, edge=.04)
    cube('Tun_Spandrel', (0, (HEAD + LEVEL_HEIGHT) / 2, 0),
         (SPAN + 1.64, (LEVEL_HEIGHT - HEAD) / 2, .30), CONCRETE, edge=.04)
    arch_head('Tun_Arch', 0, 0, SPAN, SPRING, CONCRETE,
              across=True, thick=.30, steps=32)

    # One continuous weathered-steel collar replaces the toy-like stack of
    # rotated voussoir boxes. Small recessed fasteners retain the bunker-built
    # character without turning the silhouette back into a staircase.
    arched_ring('Tun_EntryCollar', 0, -.34, SPAN, SPRING, .22, .10,
                BRUSHED, steps=40, edge=.015)
    for k in (-1, 1):
        cube(f'Tun_EntryLeg_{k}', (k * (SPAN + .11), SPRING / 2, -.34),
             (.11, SPRING / 2, .10), BRUSHED, edge=.018)
    for i in range(13):
        t = math.pi * (i + .5) / 13
        r = SPAN + .11
        cyl(f'Tun_CollarBolt_{i}', (math.cos(t) * r,
             SPRING + math.sin(t) * r, -.455), .035, .025,
             DARK, verts=12, edge=.004)
    # Impost bands where the arch springs from the haunches.
    for k in (-1, 1):
        cube(f'Tun_Impost_{k}', (k * (SPAN + .22), SPRING - .06, -.03),
             (.42, .09, .38), BRUSHED, edge=.02)

    # A continuous concrete barrel and wall pair forms the passage. Five slim
    # inset steel ribs then articulate its depth; they project by centimetres,
    # not by whole block courses, so camera motion stays visually stable.
    arched_ring('Tun_Vault', 0, DEPTH / 2, SPAN, SPRING, .16,
                DEPTH / 2, CONCRETE, steps=40, edge=.010)
    for k in (-1, 1):
        cube(f'Tun_PassageWall_{k}', (k * (SPAN + .08), SPRING / 2, DEPTH / 2),
             (.08, SPRING / 2, DEPTH / 2), CONCRETE, edge=.025)
    for i in range(5):
        z = .42 + i * ((DEPTH - .78) / 4)
        arched_ring(f'Tun_RibArch_{i}', 0, z, SPAN - .045, SPRING,
                    .13, .055, DARK, steps=32, edge=.009)
        for k in (-1, 1):
            cube(f'Tun_RibLeg_{i}_{k}', (k * (SPAN + .02), SPRING / 2, z),
                 (.065, SPRING / 2, .055), DARK, edge=.010)
        if i % 2 == 0:
            cube(f'Tun_Soffit_{i}', (0, SPRING + SPAN - .12, z + .14),
                 (.28, .035, .15), WARMLAMP, edge=.010)
            cube(f'Tun_SoffitHood_{i}', (0, SPRING + SPAN - .04, z + .14),
                 (.36, .055, .20), DARK, edge=.016)
    cube('Tun_PassageFloor', (0, .03, DOOR_Z / 2),
         (SPAN, .03, DOOR_Z / 2), DECKPLATE, edge=.01)
    for k in (-1, 1):
        cube(f'Tun_Skirt_{k}', (k * (SPAN - .10), .16, DOOR_Z / 2),
             (.08, .16, DOOR_Z / 2), DARK, edge=.012)

    # Bulkhead frame, with a genuinely empty doorway in it. The moving leaf is
    # a separate GLB so runtime animation and collision share one state.
    frame_half = (SPAN - BULKHEAD_HALF) / 2
    for k in (-1, 1):
        cube(f'Tun_BulkheadReturn_{k}',
             (k * (BULKHEAD_HALF + frame_half), 1.18, DOOR_Z),
             (frame_half, 1.18, .20), DARK, edge=.035)
        cube(f'Tun_BulkheadBoltLine_{k}',
             (k * (BULKHEAD_HALF + .10), 1.18, DOOR_Z - .22),
             (.045, 1.02, .035), BRUSHED, edge=.009)
    cube('Tun_BulkheadHead', (0, 3.10, DOOR_Z),
         (SPAN, .72, .20), DARK, edge=.035)
    cube('Tun_BulkheadLamp', (0, 2.62, DOOR_Z - .23),
         (.20, .08, .06), GREENLIGHT, edge=.012)

    # Beyond the leaf is a complete maintenance room rather than a black cap.
    room_depth = ROOM_BACK - DOOR_Z
    room_mid = (ROOM_BACK + DOOR_Z) / 2
    cube('Service_Floor', (0, .03, room_mid), (ROOM_HALF, .03, room_depth / 2),
         DECKPLATE, edge=.012)
    cube('Service_Ceiling', (0, 3.52, room_mid), (ROOM_HALF, .12, room_depth / 2),
         CONCRETE, edge=.035)
    for k in (-1, 1):
        cube(f'Service_Side_{k}', (k * ROOM_HALF, 1.78, room_mid),
             (.16, 1.78, room_depth / 2), CONCRETE, edge=.045)
        cube(f'Service_Raceway_{k}', (k * (ROOM_HALF - .18), 2.78, room_mid),
             (.12, .16, room_depth / 2 - .25), DARK, edge=.018)
    cube('Service_Back', (0, 1.78, ROOM_BACK), (ROOM_HALF, 1.78, .20),
         CONCRETE, edge=.05)

    # Raised threshold and hazard inserts make the open state legible from the
    # gallery without putting anything high enough to snag the player capsule.
    for i in range(8):
        x = -BULKHEAD_HALF + (i + .5) * BULKHEAD_HALF * 2 / 8
        cube(f'Service_Hazard_{i}', (x, .055, DOOR_Z + .18),
             (BULKHEAD_HALF / 8, .025, .16), AMBER if i % 2 == 0 else DARK,
             rotation=(0, 0, -.22 if i % 2 else .22), edge=.004)

    # Equipment with depth, rounded tanks, readable controls and cable runs.
    for k in (-1, 1):
        x = k * 1.72
        cube(f'Service_Bench_{k}', (x, .62, 6.45), (.72, .08, 1.12), STEEL, edge=.045)
        cube(f'Service_Cabinet_{k}', (x, 1.12, 7.20), (.68, .92, .32), PAINT, edge=.055)
        cube(f'Service_Panel_{k}', (x, 1.38, 6.84), (.50, .38, .035), DARK, edge=.018)
        for row in range(2):
            for col in range(3):
                lamp_mat = GREENLIGHT if (row + col + (1 if k > 0 else 0)) % 3 else AMBER
                cyl(f'Service_Indicator_{k}_{row}_{col}',
                    (x - .28 + col * .28, 1.18 + row * .28, 6.79),
                    .035, .025, lamp_mat, rotation=(0, 0, 0), verts=12, edge=.004)
    for i, x in enumerate((-1.62, 0, 1.62)):
        cyl(f'Service_Tank_{i}', (x, 1.00, 8.65), .48, 1.85,
            PAINT if i % 2 else BRUSHED, rotation=UP, verts=28, edge=.028)
        cyl(f'Service_TankBand_{i}', (x, 1.18, 8.65), .51, .10,
            DARK, rotation=UP, verts=28, edge=.012)
    for i, x in enumerate((-1.30, 0, 1.30)):
        cube(f'Service_LightHood_{i}', (x, 3.34, 6.35), (.42, .08, .22), DARK, edge=.018)
        cube(f'Service_Light_{i}', (x, 3.25, 6.35), (.34, .035, .15), WARMLAMP, edge=.01)
    for i, x in enumerate((-2.30, 2.30)):
        cyl(f'Service_Pipe_{i}', (x, 2.90, room_mid), .065, room_depth - .5,
            BRUSHED, rotation=(0, math.pi / 2, 0), verts=12, edge=.012)

    join_all('HabTunnel')
    export('hab_tunnel_v6.glb')


def build_bulkhead_door():
    """Animated service leaf authored around a hinge at local x=0."""
    clear_scene()
    half = .98
    cube('Bulkhead_Leaf', (half, 1.15, 0), (half, 1.15, .11),
         DOORPAINT, edge=.045)
    for x in (.22, .72, 1.24, 1.74):
        cube(f'Bulkhead_Rib_{x:.2f}', (x, 1.15, -.13), (.075, 1.02, .045),
             BRUSHED, edge=.014)
    for y in (.34, 1.14, 1.94):
        cube(f'Bulkhead_Cross_{y:.2f}', (half, y, -.14), (half - .10, .055, .05),
             DARK, edge=.012)
    bpy.ops.mesh.primitive_torus_add(location=(1.38, 1.18, -.22),
                                     major_radius=.31, minor_radius=.045,
                                     major_segments=30, minor_segments=10)
    wheel = bpy.context.object
    wheel.name = 'Bulkhead_Wheel'
    wheel.data.materials.append(BRUSHED)
    for poly in wheel.data.polygons:
        poly.use_smooth = True
    for i in range(5):
        a = i * math.tau / 5
        cube(f'Bulkhead_Spoke_{i}',
             (1.38 + math.cos(a) * .15, 1.18 + math.sin(a) * .15, -.22),
             (.15, .026, .026), BRUSHED, rotation=(0, 0, a), edge=.006)
    cube('Bulkhead_WarningPlate', (.55, 1.78, -.23), (.32, .14, .025),
         AMBER, edge=.008)
    cube('Bulkhead_Handle', (1.70, .72, -.23), (.14, .045, .04),
         DARK, rotation=(0, 0, -.22), edge=.01)
    cube('Bulkhead_HingeLow', (.04, .48, .02), (.06, .16, .16), DARK, edge=.018)
    cube('Bulkhead_HingeHigh', (.04, 1.82, .02), (.06, .16, .16), DARK, edge=.018)
    join_all('HabBulkheadDoor')
    export('hab_bulkhead_door_v6.glb')


def build_hydroponics():
    """A grow rack. Three hundred people have to eat something."""
    clear_scene()
    cube('Hydro_Frame_L', (-1.15, .95, 0), (.06, .95, .55), BRUSHED, edge=.02)
    cube('Hydro_Frame_R', (1.15, .95, 0), (.06, .95, .55), BRUSHED, edge=.02)
    for tier in range(3):
        y = .42 + tier * .62
        cube(f'Hydro_Tray_{tier}', (0, y, 0), (1.15, .07, .52), STEEL, edge=.02)
        cube(f'Hydro_Water_{tier}', (0, y + .07, 0), (1.05, .015, .44), GLASS, edge=.005)
        for i in range(9):
            x = -.95 + i * .24
            sphere(f'Hydro_Plant_{tier}_{i}', (x, y + .22, 0), .13, LEAF, scale=(1, .85, .9))
            cube(f'Hydro_Stem_{tier}_{i}', (x, y + .12, 0), (.015, .09, .015), LEAF, edge=.004)
        if tier < 2:
            cube(f'Hydro_Lamp_{tier}', (0, y + .52, 0), (1.05, .035, .13), GROWLIGHT, edge=.01)
            cube(f'Hydro_LampHood_{tier}', (0, y + .58, 0), (1.10, .05, .18), DARK, edge=.015)
    cyl('Hydro_Pipe', (0, .95, -.5), .05, 1.9, BRUSHED, rotation=UP, verts=10)
    join_all('HabHydroponics')
    export('hab_hydroponics_v4.glb')


def build_commons():
    """Mess tables on the wide levels, where the silo actually feels inhabited."""
    clear_scene()
    cube('Commons_Table', (0, .74, 0), (1.6, .05, .55), WARM, edge=.02)
    for x in (-1.4, 1.4):
        cube(f'Commons_Leg_{x}', (x, .37, 0), (.07, .37, .45), STEEL, edge=.015)
    for side in (-1, 1):
        cube(f'Commons_Bench_{side}', (0, .43, side * .95), (1.55, .045, .22), WARM, edge=.015)
        for x in (-1.25, 1.25):
            cube(f'Commons_BenchLeg_{side}_{x}', (x, .21, side * .95), (.05, .21, .18), STEEL, edge=.01)
    for i, x in enumerate((-1.0, -.2, .7)):
        cyl(f'Commons_Mug_{i}', (x, .82, -.15 + i * .12), .055, .11, BRUSHED, rotation=UP, verts=12)
    cube('Commons_Tray', (.6, .78, .1), (.28, .02, .2), BRUSHED, edge=.008)
    join_all('HabCommons')
    export('hab_commons_v4.glb')


def build_secure_door():
    """The entrance to the secure unit at the top of the silo."""
    clear_scene()
    cube('Secure_Surround', (0, 1.75, 0), (2.1, 1.75, .32), CONCRETE, edge=.06)
    cube('Secure_Door', (0, 1.42, -.30), (1.25, 1.42, .12), STEEL, edge=.04)
    for i in range(7):
        cube(f'Secure_Rib_{i}', (0, .32 + i * .40, -.42), (1.20, .07, .04), DARK, edge=.012)
    cube('Secure_Jamb_L', (-1.42, 1.55, -.34), (.16, 1.55, .10), DARK, edge=.02)
    cube('Secure_Jamb_R', (1.42, 1.55, -.34), (.16, 1.55, .10), DARK, edge=.02)
    cube('Secure_Lintel', (0, 3.05, -.34), (1.58, .18, .10), DARK, edge=.02)
    cube('Secure_Reader', (1.72, 1.30, -.36), (.16, .24, .06), BRUSHED, edge=.015)
    cyl('Secure_ReaderLamp', (1.72, 1.44, -.43), .04, .03, REDLIGHT, verts=12)
    cube('Secure_Window', (0, 2.35, -.43), (.44, .20, .03), GLASS, edge=.008)
    cube('Secure_WindowFrame', (0, 2.35, -.42), (.52, .28, .02), DARK, edge=.01)
    text_obj('Secure_Sign', 'SECURE UNIT', (0, 3.42, -.36), .26, AMBER, extrude=.01)
    text_obj('Secure_Notice', 'AUTHORISED PERSONNEL', (0, .78, -.44), .11, DARK,
             extrude=.004)
    for i in range(9):
        a = i * math.tau / 9
        cube(f'Secure_Hazard_{i}', (-2.0 + i * .5, .06, -.55), (.22, .05, .16),
             AMBER if i % 2 == 0 else DARK, edge=.008)
    export('hab_secure_door_v4.glb')


def build_directory():
    """A level board, so a silo of twelve identical galleries is navigable."""
    clear_scene()
    cube('Directory_Board', (0, 1.35, 0), (.95, .70, .07), DARK, edge=.03)
    cube('Directory_Face', (0, 1.35, -.08), (.86, .62, .02), STEEL, edge=.01)
    text_obj('Directory_Title', 'SILO 47', (0, 1.82, -.11), .17, AMBER, extrude=.006)
    text_obj('Directory_Body', 'RESIDENCE', (0, 1.48, -.11), .12, GREENLIGHT, extrude=.004)
    text_obj('Directory_Count', 'POP 300', (0, 1.20, -.11), .12, GREENLIGHT, extrude=.004)
    text_obj('Directory_Note', 'SECURE UNIT: TOP', (0, .95, -.11), .085, AMBER, extrude=.003)
    cube('Directory_Post', (0, .48, .04), (.09, .48, .09), BRUSHED, edge=.02)
    cube('Directory_Foot', (0, .04, .04), (.30, .04, .30), DARK, edge=.01)
    join_all('HabDirectory')
    export('hab_directory_v4.glb')


# --- People ------------------------------------------------------------------
# The residents are the thing you stand closest to and look at longest, so they
# are lofted rather than assembled from primitives, and they are built from a
# spec rather than once: twenty identical figures walking one silo is the most
# obviously artificial thing in a game. Height, build, shoulder width, what
# they are wearing, what they carry and what they have done with their hair all
# come from the spec, and the runtime recolours cloth, hair and skin on top.

RESIDENT_SPECS = [
    dict(key='a', height=1.00, build=1.00, shoulders=1.00, dress='jacket',
         hair='short', extras=('badge',)),
    dict(key='b', height=1.06, build=0.90, shoulders=1.06, dress='overalls',
         hair='tied', extras=('toolbelt',)),
    dict(key='c', height=0.94, build=1.14, shoulders=0.96, dress='coat',
         hair='short', extras=('scarf',), beard=True),
    dict(key='d', height=1.02, build=0.94, shoulders=0.98, dress='vest',
         hair='bald', extras=('satchel',)),
    dict(key='e', height=0.96, build=1.02, shoulders=0.94, dress='apron',
         hair='long', extras=('badge',)),
    dict(key='f', height=1.04, build=1.08, shoulders=1.04, dress='jacket',
         hair='cap', extras=('toolbelt', 'glasses'), beard=True),
]


def _fit(sections, spec, girth=1.0):
    """Scale a ring table to a body: height up the Y, build across the rest."""
    h, b = spec['height'], spec['build'] * girth
    return [((x * b, y * h, z * b), rx * b, rz * b) for (x, y, z), rx, rz in sections]


def _leg(prefix, side, jointed, spec):
    # Every part runs past its joint and into the next one. Subdivision pulls a
    # capped tube's ends inward, so parts that merely met at the knee left a
    # visible gap there; overlapping them means the shrink happens inside the
    # neighbouring limb where nobody sees it.
    hip_x = side * .105
    trouser = TROUSER if spec['dress'] != 'overalls' else JACKET
    thigh = loft(f'{prefix}_Leg_{side}', _fit([
        ((hip_x, 1.04, 0), .112, .120),
        ((hip_x, .94, 0), .122, .132),
        ((hip_x, .84, 0), .114, .124),
        ((hip_x, .68, .004), .096, .106),
        ((hip_x, .56, .006), .080, .089),
        ((hip_x, .47, .006), .075, .084),
    ], spec), trouser, sides=12)
    shin = loft(f'{prefix}_Shin_{side}', _fit([
        ((hip_x, .63, .004), .074, .083),
        ((hip_x, .52, .002), .079, .088),
        ((hip_x, .43, -.008), .083, .095),
        ((hip_x, .30, .002), .060, .070),
        ((hip_x, .18, .010), .049, .057),
        ((hip_x, .11, .012), .046, .054),
    ], spec), trouser, sides=12)
    boot = loft(f'{prefix}_Boot_{side}', _fit([
        ((hip_x, .26, .008), .054, .060),
        ((hip_x, .16, .012), .062, .072),
        ((hip_x, .085, .028), .072, .112),
        ((hip_x, .035, .048), .074, .150),
        ((hip_x, .006, .052), .066, .148),
    ], spec), DARK, sides=12)
    sole = cube(f'{prefix}_BootSole_{side}',
                (hip_x * spec['build'], .018 * spec['height'], .060 * spec['build']),
                (.078 * spec['build'], .018 * spec['height'], .154 * spec['build']),
                DARK, edge=.008)
    lace = cube(f'{prefix}_BootLace_{side}',
                (hip_x * spec['build'], .092 * spec['height'], .092 * spec['build']),
                (.055 * spec['build'], .010 * spec['height'], .045 * spec['build']),
                BRUSHED, edge=.004)
    if jointed:
        set_pivot(thigh, (hip_x * spec['build'], .94 * spec['height'], 0))
        set_pivot(shin, (hip_x * spec['build'], .54 * spec['height'], 0))
        parent_to(sole, shin)
        parent_to(lace, shin)
        parent_to(boot, shin)
        parent_to(shin, thigh)
    return thigh


def _arm(prefix, side, jointed, spec):
    sx = side * .205 * spec['shoulders'] / spec['build']
    sleeve = SKIN if spec['dress'] == 'vest' else JACKET
    upper = loft(f'{prefix}_Arm_{side}', _fit([
        ((sx * .92, 1.51, 0), .060, .064),
        ((sx, 1.44, 0), .072, .076),
        ((sx * 1.03, 1.34, 0), .065, .067),
        ((sx * 1.06, 1.20, .004), .056, .058),
        ((sx * 1.08, 1.10, .006), .051, .053),
        ((sx * 1.09, 1.03, .006), .049, .051),
    ], spec), sleeve, sides=12)
    fore = loft(f'{prefix}_Forearm_{side}', _fit([
        ((sx * 1.07, 1.17, .006), .049, .051),
        ((sx * 1.08, 1.09, .006), .053, .055),
        ((sx * 1.09, 1.00, .002), .048, .050),
        ((sx * 1.10, .90, .004), .039, .041),
        ((sx * 1.10, .82, .006), .034, .036),
    ], spec), SKIN, sides=12)
    hand = loft(f'{prefix}_Hand_{side}', _fit([
        ((sx * 1.10, .88, .006), .034, .036),
        ((sx * 1.10, .79, .012), .039, .053),
        ((sx * 1.10, .71, .014), .036, .051),
        ((sx * 1.10, .655, .008), .020, .032),
    ], spec), SKIN, sides=12)
    thumb = loft(f'{prefix}_Thumb_{side}', _fit([
        ((sx * 1.10 - side * .012, .80, .028), .020, .026),
        ((sx * 1.10 - side * .032, .75, .044), .018, .024),
        ((sx * 1.10 - side * .040, .71, .048), .013, .018),
    ], spec), SKIN, sides=8)
    extra = []
    if spec['dress'] != 'vest':
        extra.append(loft(f'{prefix}_Cuff_{side}', _fit([
            ((sx * 1.08, 1.14, .006), .058, .060),
            ((sx * 1.09, 1.02, .004), .054, .056),
        ], spec), sleeve, sides=8, subdiv=0))
    if jointed:
        set_pivot(upper, (sx * spec['build'], 1.44 * spec['height'], 0))
        set_pivot(fore, (sx * 1.08 * spec['build'], 1.10 * spec['height'], 0))
        parent_to(thumb, hand)
        parent_to(hand, fore)
        for e in extra:
            parent_to(e, fore)
        parent_to(fore, upper)
    return upper


def _head(prefix, jointed, spec):
    h, b = spec['height'], spec['build']
    head = loft(f'{prefix}_Head', _fit([
        ((0, 1.455, 0), .062, .066),
        ((0, 1.520, 0), .066, .070),
        ((0, 1.560, .004), .076, .086),
        ((0, 1.600, .008), .088, .101),
        ((0, 1.648, .005), .098, .110),
        ((0, 1.698, 0), .099, .108),
        ((0, 1.740, -.005), .082, .092),
        ((0, 1.768, -.008), .046, .053),
    ], spec, girth=.96), SKIN, sides=18)
    parts = []
    style = spec['hair']
    if style == 'cap':
        parts.append(loft(f'{prefix}_Cap', _fit([
            ((0, 1.690, -.010), .104, .114),
            ((0, 1.735, -.010), .102, .112),
            ((0, 1.772, -.012), .070, .078),
        ], spec, girth=.96), DARK, sides=18))
        parts.append(cube(f'{prefix}_Peak', (0, 1.690 * h, .118 * b),
                          (.086 * b, .012 * h, .062 * b), DARK, edge=.01))
    elif style != 'bald':
        crown = [
            ((0, 1.618, -.020), .104, .116),
            ((0, 1.660, -.016), .109, .120),
            ((0, 1.702, -.013), .108, .117),
            ((0, 1.744, -.014), .088, .098),
            ((0, 1.776, -.016), .050, .058),
        ]
        parts.append(loft(f'{prefix}_Hair', _fit(crown, spec, girth=.96), HAIR, sides=18))
        if style == 'long':
            parts.append(loft(f'{prefix}_HairFall', _fit([
                ((0, 1.640, -.070), .095, .050),
                ((0, 1.520, -.085), .105, .055),
                ((0, 1.400, -.090), .098, .050),
                ((0, 1.330, -.088), .060, .032),
            ], spec, girth=.96), HAIR, sides=10))
        elif style == 'tied':
            parts.append(loft(f'{prefix}_HairTie', _fit([
                ((0, 1.660, -.105), .052, .046),
                ((0, 1.615, -.130), .062, .056),
                ((0, 1.570, -.128), .040, .036),
            ], spec, girth=.96), HAIR, sides=10))
    # Separate brows, ears, sclera and irises make the face read as a face at
    # conversation distance. The previous single dark eye bead and full-width
    # brow read like a mask under the silo's warm practical lights.
    for side in (-1, 1):
        parts.append(sphere(f'{prefix}_Ear_{side}',
                            (side * .103 * b, 1.650 * h, -.004 * b),
                            .028 * b, SKIN, scale=(.42, 1.0, .62), segments=10))
        parts.append(cube(f'{prefix}_Brow_{side}',
                          (side * .039 * b, 1.675 * h, .096 * b),
                          (.031 * b, .0065 * h, .007 * b), HAIR,
                          rotation=(0, 0, -side * .08), edge=.004))
    if spec.get('beard'):
        parts.append(loft(f'{prefix}_Beard', _fit([
            ((0, 1.612, .052), .078, .085),
            ((0, 1.575, .046), .070, .080),
            ((0, 1.545, .036), .046, .052),
        ], spec, girth=.96), HAIR, sides=10))
    for side in (-1, 1):
        parts.append(sphere(f'{prefix}_EyeWhite_{side}',
                            (side * .037 * b, 1.642 * h, .096 * b),
                            .018 * b, EYEWHITE, scale=(1.25, .70, .55), segments=12))
        parts.append(sphere(f'{prefix}_Iris_{side}',
                            (side * .037 * b, 1.642 * h, .108 * b),
                            .0085 * b, IRIS, scale=(1, 1, .48), segments=10))
    parts.append(loft(f'{prefix}_Nose', _fit([
        ((0, 1.646, .086), .017, .022),
        ((0, 1.619, .099), .021, .029),
        ((0, 1.601, .090), .016, .020),
    ], spec, girth=.96), SKIN, sides=10))
    parts.append(cube(f'{prefix}_Mouth', (0, 1.565 * h, .099 * b),
                      (.034 * b, .0045 * h, .006 * b), LIP, edge=.003))
    parts.append(loft(f'{prefix}_LowerLip', _fit([
        ((0, 1.554, .092), .034, .012),
        ((0, 1.545, .087), .025, .010),
    ], spec, girth=.96), LIP, sides=10, subdiv=0))
    if 'glasses' in spec['extras']:
        for k in (-1, 1):
            parts.append(cube(f'{prefix}_Lens_{k}', (k * .036 * b, 1.641 * h, .098 * b),
                              (.030 * b, .024 * h, .006 * b), DARK, edge=.008))
        parts.append(cube(f'{prefix}_Bridge', (0, 1.641 * h, .100 * b),
                          (.012 * b, .006 * h, .005 * b), DARK, edge=.003))
    if jointed:
        set_pivot(head, (0, 1.50 * h, 0))
        for part in parts:
            parent_to(part, head)
    return head


def humanoid(prefix, jointed, spec):
    """One person, built to a spec so no two in the silo are the same."""
    h, b = spec['height'], spec['build']
    body = [
        ((0, .80, 0), .150, .114),
        ((0, .88, 0), .168, .126),
        ((0, .99, 0), .157, .117),
        ((0, 1.10, -.002), .148, .107),
        ((0, 1.22, .004), .170, .120),
        ((0, 1.33, .006), .194, .131),
        ((0, 1.405, .002), .213 * spec['shoulders'], .126),
        ((0, 1.455, 0), .158, .112),
        ((0, 1.500, 0), .080, .082),
        ((0, 1.545, 0), .066, .068),
    ]
    torso = loft(f'{prefix}_Torso', _fit(body, spec),
                 TROUSER if spec['dress'] == 'overalls' else JACKET, sides=16)
    parts = []

    if spec['dress'] == 'coat':
        # A long coat: the skirt hangs past the hip and swings free of the legs.
        parts.append(loft(f'{prefix}_CoatSkirt', _fit([
            ((0, 1.08, 0), .162, .120),
            ((0, .92, 0), .190, .140),
            ((0, .74, 0), .205, .150),
            ((0, .60, 0), .200, .146),
        ], spec), JACKET, sides=12))
    if spec['dress'] == 'overalls':
        for k in (-1, 1):
            parts.append(cube(f'{prefix}_Strap_{k}', (k * .085 * b, 1.35 * h, .112 * b),
                              (.038 * b, .16 * h, .022 * b), TROUSER, edge=.01))
    if spec['dress'] == 'apron':
        parts.append(cube(f'{prefix}_Apron', (0, 1.05 * h, .118 * b),
                          (.155 * b, .30 * h, .015 * b), CLOTH, edge=.02))
        parts.append(cube(f'{prefix}_ApronBib', (0, 1.32 * h, .126 * b),
                          (.095 * b, .12 * h, .012 * b), CLOTH, edge=.015))
    if spec['dress'] != 'vest':
        parts.append(loft(f'{prefix}_Collar', _fit([
            ((0, 1.455, 0), .120, .095),
            ((0, 1.515, 0), .085, .080),
        ], spec), DARK, sides=12, subdiv=0))

    parts.append(loft(f'{prefix}_Belt', _fit([
        ((0, 1.055, -.002), .148, .108),
        ((0, 1.125, -.002), .150, .110),
    ], spec), DARK, sides=12, subdiv=0))

    if 'badge' in spec['extras']:
        parts.append(cube(f'{prefix}_Badge', (.125 * b, 1.30 * h, .120 * b),
                          (.038 * b, .052 * h, .008 * b), AMBER, edge=.006))
    if 'toolbelt' in spec['extras']:
        for i, k in enumerate((-1, 1)):
            parts.append(cube(f'{prefix}_Pouch_{i}', (k * .125 * b, 1.05 * h, .075 * b),
                              (.050 * b, .062 * h, .038 * b), DARK, edge=.014))
        parts.append(cyl(f'{prefix}_Spanner', (.16 * b, 1.02 * h, -.02 * b),
                         .012 * b, .20 * h, BRUSHED, rotation=UP, verts=8))
    if 'satchel' in spec['extras']:
        parts.append(loft(f'{prefix}_Satchel', _fit([
            ((.20, 1.06, -.08), .085, .060),
            ((.21, .94, -.09), .105, .072),
            ((.21, .84, -.09), .095, .064),
        ], spec), CLOTH, sides=10))
        parts.append(cube(f'{prefix}_SatchelStrap', (0, 1.26 * h, .010 * b),
                          (.170 * b, .030 * h, .140 * b), CLOTH, rotation=(0, 0, .58), edge=.012))
    if 'scarf' in spec['extras']:
        parts.append(loft(f'{prefix}_Scarf', _fit([
            ((0, 1.470, 0), .118, .100),
            ((0, 1.530, 0), .108, .092),
            ((0, 1.570, 0), .086, .076),
        ], spec), CLOTH, sides=12))

    head = _head(prefix, jointed, spec)
    arms = [_arm(prefix, side, jointed, spec) for side in (-1, 1)]
    legs = [_leg(prefix, side, jointed, spec) for side in (-1, 1)]

    if jointed:
        set_pivot(torso, (0, .92 * h, 0))
        for part in (*parts, head, *arms):
            parent_to(part, torso)
    return torso, legs


def build_residents():
    """Six higher-detail builds, jointed for walkers and joined for the crowd.

    Revision six adds readable eyes, brows, ears, mouth forms, thumbs, footwear
    and denser curved silhouettes while keeping the same light runtime rig.
    """
    for spec in RESIDENT_SPECS:
        clear_scene()
        humanoid('Resident', True, spec)
        export(f"resident_{spec['key']}_v6.glb")
        clear_scene()
        humanoid('Still', False, spec)
        join_all('HabResidentStill')
        export(f"resident_still_{spec['key']}_v6.glb")


def build_access_hatch():
    """The hatch in the shelter floor, onto the silo's top landing."""
    clear_scene()
    cube('Hatch_Frame', (0, .06, 0), (1.05, .06, 1.05), DARK, edge=.03)
    cyl('Hatch_Ring', (0, .10, 0), .92, .10, BRUSHED, rotation=UP, verts=32, edge=.015)
    # A dark throat beneath the moving lid keeps an opened hatch from revealing
    # the shelter floor mesh underneath it.
    # Keep the cap clearly above the ring's .15 m top face. Putting it just
    # above the frame still left the solid reflective ring across the opening,
    # so the raised lid revealed a grey plate instead of a dark shaft.
    cyl('Hatch_Void', (0, .165, 0), .77, .025, VOID, rotation=UP, verts=32, edge=.01)
    cyl('Hatch_Lid', (0, .17, 0), .84, .10, STEEL, rotation=UP, verts=32, edge=.02)
    for i in range(8):
        a = i * math.tau / 8
        cyl(f'Hatch_Bolt_{i}', (math.cos(a) * .70, .23, math.sin(a) * .70), .05, .05, DARK,
            rotation=UP, verts=10, edge=.006)
    bpy.ops.mesh.primitive_torus_add(location=(0, .30, 0), rotation=UP,
                                     major_radius=.34, minor_radius=.045,
                                     major_segments=28, minor_segments=10)
    wheel = bpy.context.object
    wheel.name = 'Hatch_Wheel'
    wheel.data.materials.append(REDLIGHT)
    for p in wheel.data.polygons:
        p.use_smooth = True
    for i in range(4):
        a = i * math.tau / 4
        cube(f'Hatch_Spoke_{i}', (math.cos(a) * .17, .30, math.sin(a) * .17), (.17, .025, .025),
             REDLIGHT, rotation=(0, -a, 0), edge=.006)
    cyl('Hatch_Hub', (0, .31, 0), .09, .09, DARK, rotation=UP, verts=16, edge=.006)
    for i in range(12):
        a = i * math.tau / 12
        cube(f'Hatch_Hazard_{i}', (math.cos(a) * .99, .13, math.sin(a) * .99), (.14, .03, .07),
             AMBER if i % 2 == 0 else DARK, rotation=(0, -a, 0), edge=.005)
    text_obj('Hatch_Label', 'SILO 47 ACCESS', (0, .13, -1.30), .15, AMBER,
             rotation=(-math.pi / 2, 0, 0), extrude=.004)
    export('access_hatch_v3.glb')


def build_supply_cache():
    clear_scene()
    cube('Cache_Pallet', (0, .07, 0), (.85, .07, .60), DARK, edge=.02)
    for i in range(4):
        cube(f'Cache_AmmoBox_{i}', (-.5 + (i % 2) * .55, .30 + (i // 2) * .34, -.16 + (i // 2) * .1),
             (.26, .16, .19), PAINT, edge=.03)
    for i in range(3):
        cube(f'Cache_RationBox_{i}', (.45, .22 + i * .28, .28), (.30, .14, .24), BRUSHED, edge=.025)
    cyl('Cache_Drum', (-.62, .38, .30), .26, .74, REDLIGHT, rotation=UP, verts=20, edge=.02)
    text_obj('Cache_Stencil', 'SILO STORES', (0, .62, -.61), .10, AMBER, extrude=.003)
    join_all('HabCache')
    export('silo_cache_v3.glb')


build_shell()
build_level()
build_stair()
build_landing()
build_landing(top=True)
build_apartment()
build_door()
build_crown()
build_sump()
build_tunnel()
build_bulkhead_door()
build_hydroponics()
build_commons()
build_secure_door()
build_directory()
build_residents()
build_access_hatch()
build_supply_cache()
print('HABITAT DONE')
