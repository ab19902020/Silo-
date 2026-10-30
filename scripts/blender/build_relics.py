"""Author the small Silo relics in Blender, export GLB and retain editable sources.
Run: blender -b --python scripts/blender/build_relics.py -- /path/to/silo-game
No downloaded meshes, textures, fonts or likenesses are used.
"""
import bpy, math, sys, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else Path.cwd()
OUT=ROOT/'dist/assets/relics'; SOURCE=ROOT/'models/relics'
OUT.mkdir(parents=True,exist_ok=True); SOURCE.mkdir(parents=True,exist_ok=True)

def material(name,color,metal=0,rough=.5):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 return m
ivory=material('Aged ivory plastic',(.81,.73,.50),0,.42)
yellow=material('Worn duck yellow',(.93,.62,.045),0,.4)
red=material('Faded red sleeve',(.55,.055,.022),0,.49)
orange=material('Orange bill',(.78,.25,.025),0,.38)
black=material('Carbon',(.012,.018,.015),.05,.44)
steel=material('Brushed steel',(.30,.34,.31),.88,.3)
brass=material('Old brass',(.40,.25,.095),.82,.3)
leather=material('Cracked brown leather',(.075,.026,.014),0,.83)
paper=material('Warm paper',(.69,.64,.46),0,.86)
cover=material('Clothbound blue',(.035,.14,.19),0,.88)
gold=material('Faded cover gold',(.72,.51,.22),.15,.63)
ink=material('Printed ink',(.025,.065,.078),0,.8)

def finish(obj,name,mat):
 obj.name=name;obj.data.materials.append(mat);return obj

def box(name,p,size,mat,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Soft worn edges','BEVEL');mod.width=bevel;mod.segments=3
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
  mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,name,mat)

def sphere(name,p,size,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=p);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for f in o.data.polygons:f.use_smooth=True
 return finish(o,name,mat)

def cylinder(name,p,r,depth,mat,vertices=64):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=p);return finish(bpy.context.object,name,mat)

def torus(name,p,r,t,mat):
 bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=8,location=p,major_radius=r,minor_radius=t);o=bpy.context.object
 for f in o.data.polygons:f.use_smooth=True
 return finish(o,name,mat)

def text(name,value,p,size,mat,rotation=(0,0,0),depth=0):
 curve=bpy.data.curves.new(name,'FONT');curve.body=value;curve.align_x='CENTER';curve.align_y='CENTER';curve.size=size;curve.extrude=depth;curve.resolution_u=3
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.location=p;o.rotation_euler=rotation;o.data.materials.append(mat)
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o

def line(name,points,width,mat):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=1;curve.bevel_depth=width;curve.bevel_resolution=2
 poly=curve.splines.new('POLY');poly.points.add(len(points)-1)
 for q,p in zip(poly.points,points):q.co=(*p,1)
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o

def reset():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def pez():
 box('Flared standing foot',(0,0,.003),(.032,.024,.006),red,.002)
 box('Injection moulded sleeve',(0,0,.048),(.023,.018,.087),red,.0015)
 box('Sliding candy rail',(0,0,.056),(.017,.015,.084),ivory,.001)
 box('Front face',(0,-.0093,.047),(.024,.002,.079),red,.0006)
 for x in [-.009,.009]:box('Mould seam',(x,-.0105,.047),(.0006,.0005,.072),ivory,.0001)
 text('PEZ emboss','PEZ',(0,-.0107,.054),.012,ivory,(math.pi/2,0,0),.00035)
 cylinder('Head hinge',(0,0,.092),.007,.012,steel,24)
 sphere('Duck head',(0,0,.111),(.018,.017,.02),yellow)
 sphere('Cheeks',(0,-.009,.104),(.019,.016,.011),yellow)
 sphere('Upper bill',(0,-.021,.104),(.015,.013,.004),orange)
 sphere('Lower bill',(0,-.020,.099),(.012,.011,.0025),orange)
 for x in [-.009,.009]:
  sphere('Ivory eye',(x,-.014,.117),(.005,.003,.006),ivory)
  sphere('Pupil',(x,-.0168,.117),(.002,.0015,.0033),black)
 text('Rear maker stamp','1 4 4',(0,.0098,.045),.0055,ivory,(math.pi/2,0,math.pi))

def watch():
 for side in [-1,1]:
  box('Leather strap',(0,side*.059,.0035),(.018,.078,.005),leather,.0018)
  for x in [-.007,.007]:
   for i in range(12):box('Hand stitching',(x,side*(.023+i*.006),.0062),(.0006,.002,.0005),gold,.0001)
  for x in [-.011,.011]:box('Steel lug',(x,side*.020,.006),(.004,.009,.005),brass,.001)
 for i in range(5):cylinder('Strap hole',(0,.043+i*.009,.0064),.0012,.0004,black,12)
 box('Buckle base',(0,-.099,.004),(.023,.016,.004),brass,.001)
 box('Buckle opening',(0,-.099,.0063),(.016,.010,.0004),black)
 box('Buckle pin',(0,-.099,.007),(.0015,.014,.001),steel,.0002)
 cylinder('Watch case',(0,0,.009),.022,.012,brass)
 cylinder('Dial',(0,0,.0152),.0194,.001,paper)
 torus('Polished bezel',(0,0,.016),.0207,.0015,brass)
 for i in range(60):
  a=i*math.tau/60;r=.0177;o=box('Minute track',(math.sin(a)*r,math.cos(a)*r,.016),(.00045,.0018 if i%5 else .003,.0003),ink);o.rotation_euler.z=-a
 for i,lab in [(0,'12'),(3,'3'),(6,'6'),(9,'9')]:
  a=i*math.pi/6;text('Dial numeral '+lab,lab,(math.sin(a)*.0129,math.cos(a)*.0129,.0162),.0036,ink)
 text('Dial maker','WILKINS',(0,.006,.0162),.0023,ink)
 line('Hour hand',[(0,0,.0168),(-.006,.003,.0168)],.00055,black)
 line('Minute hand',[(0,0,.0172),(.008,.010,.0172)],.00035,black)
 line('Seconds hand',[(-.002,-.003,.0175),(.006,.014,.0175)],.00016,red)
 cylinder('Central pin',(0,0,.0179),.0011,.001,brass,24)
 crown=cylinder('Knurled crown',(.024,0,.010),.0035,.005,brass,24);crown.rotation_euler.y=math.pi/2
 text('Back engraving','G. WILKINS',(0,-.008,.0028),.0032,ink,(math.pi,0,0))
 line('Wave clue',[(-.010+i*.001, .001+math.sin(i*.65)*.0018,.0027) for i in range(21)],.0002,ink)
 line('Arrow clue',[(0,.002,.0027),(0,.010,.0027),(-.003,.007,.0027),(0,.010,.0027),(.003,.007,.0027)],.00023,ink)

def book():
 box('Lower board',(0,0,.002),(.158,.215,.004),cover,.0015)
 box('Page block',(.002,0,.013),(.149,.206,.019),paper,.001)
 for i in range(12):box('Uneven page edge',(.003,0,.004+i*.0015),(.149,.207,.0002),ivory)
 box('Upper cloth board',(0,0,.025),(.158,.215,.004),cover,.0015)
 box('Rounded spine',(-.077,0,.014),(.009,.214,.028),cover,.003)
 text('Cover title','AMAZING\nADVENTURES\nIN GEORGIA',(0,.052,.0272),.012,gold)
 box('Illustration panel',(0,-.029,.0271),(.131,.081,.0002),paper)
 # Original schematic skyline printed on the cover; not a reproduced book cover.
 for i,(x,h,w) in enumerate([(-.05,.018,.011),(-.032,.025,.014),(-.012,.042,.010),(.009,.023,.016),(.028,.033,.009),(.046,.019,.014)]):
  box('Atlanta skyline',(x,-.053+h/2,.0274),(w,h,.00025),ink)
  if i in [2,4]:line('Building spire',[(x,-.053+h,.0276),(x,-.044+h,.0276)],.0005,ink)
 text('City caption','ATLANTA',(0,-.086,.0273),.009,gold)
 box('Folded bookmark',(.035,.101,.016),(.026,.039,.001),red,.0003)
 text('Back imprint','A WORLD\nBEYOND THE HILL',(0,0,-.0001),.009,gold,(math.pi,0,0))

manifest={}
for name,build in [('pez',pez),('watch',watch),('georgia',book)]:
 reset();build()
 # TV palette pass: preserve the authored geometry and use the same colour
 # correction as polish-relic-palettes.mjs before saving the editable source.
 palettes={'pez':{'Faded red sleeve':(.026,.16,.22,1)},'georgia':{'Clothbound blue':(.63,.48,.20,1),'Faded cover gold':(.29,.031,.018,1)}}
 for o in bpy.context.scene.objects:
  if o.type!='MESH':continue
  for slot in o.material_slots:
   if slot.material and slot.material.name in palettes.get(name,{}):
    col=palettes[name][slot.material.name];slot.material=slot.material.copy()
    slot.material.diffuse_color=col;node=slot.material.node_tree.nodes.get('Principled BSDF');node.inputs['Base Color'].default_value=col;node.inputs['Roughness'].default_value=.72
 bpy.ops.object.select_all(action='SELECT')
 # Save the editable Blender document separately from the lean browser asset.
 bpy.context.scene.unit_settings.system='METRIC';bpy.context.scene.unit_settings.scale_length=1
 bpy.context.preferences.filepaths.save_version=0
 bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(name+'.blend')),compress=True)
 # One browser mesh with a primitive per material, not one draw per minute tick.
 bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH')
 bpy.ops.object.join()
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_cameras=False,export_lights=False)
 points=[o.matrix_world@Vector(p) for o in bpy.context.scene.objects if o.type=='MESH' for p in o.bound_box]
 bounds=[[min(p[i] for p in points) for i in range(3)],[max(p[i] for p in points) for i in range(3)]]
 triangles=sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
 manifest[name]={'file':name+'.glb','authoring':'Blender','source':'models/relics/'+name+'.blend','units':'metres','boundsBlender':bounds,'bytes':(OUT/(name+'.glb')).stat().st_size}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('SILO_RELIC_EXPORT',json.dumps(manifest))
