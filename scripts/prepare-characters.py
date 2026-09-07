"""Reproducible Blender 4.5 preparation of the four user-supplied GLBs.
blender -b --factory-startup --python scripts/prepare-characters.py -- INPUT OUTPUT QA
Source meshes/textures are preserved in optimized derivatives; +Y up, +Z forward.
"""
import bpy,sys,math,json,hashlib,os
from pathlib import Path
from mathutils import Vector,Quaternion
src,out,qa=map(Path,sys.argv[sys.argv.index('--')+1:][:3]);out.mkdir(parents=True,exist_ok=True);qa.mkdir(parents=True,exist_ok=True)
people=[('juliette','8e2e4c15',1.73,.397),('bernard','8fd09df0',1.87,.413),('sims','f9c26c81',1.83,.456)]
def reset():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for a in list(bpy.data.actions):bpy.data.actions.remove(a)
 for img in list(bpy.data.images):
  if img.name not in ['Render Result','Viewer Node']:bpy.data.images.remove(img)
def active(o):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
def point(x,y,z=0):return Vector((x,-z,y))
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def render(name,frame):
 sc=bpy.context.scene;sc.frame_set(frame);sc.render.engine='CYCLES';sc.cycles.samples=16;sc.cycles.use_denoising=False;sc.render.resolution_x=640;sc.render.resolution_y=820;sc.render.resolution_percentage=100;sc.world.color=(.18,.18,.18)
 data=bpy.data.cameras.new('Inspection');cam=bpy.data.objects.new('Inspection',data);sc.collection.objects.link(cam);sc.camera=cam;cam.location=(2.2,-5.2,1.8);cam.rotation_euler=(Vector((0,0,.94))-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=2.28;lamps=[]
 for loc,energy,size in [((2,-3,4),500,4),((-3,-1,2),300,3),((1,2,3),400,2)]:
  d=bpy.data.lights.new('Softbox','AREA');d.energy=energy;d.size=size;o=bpy.data.objects.new('Softbox',d);sc.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler();lamps.append(o)
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.014));plane=bpy.context.object;m=bpy.data.materials.new('Inspection floor');m.diffuse_color=(.09,.1,.11,1);plane.data.materials.append(m)
 sc.render.image_settings.file_format='JPEG';sc.render.image_settings.quality=90;sc.render.filepath=str(qa/f'{name}.jpg');bpy.ops.render.render(write_still=True)
 for o in [plane,cam,*lamps]:bpy.data.objects.remove(o,do_unlink=True)
 sc.camera=None
manifest=[]
for ident,prefix,height,span in people:
 reset();source=next(src.glob(prefix+'*.glb'));bpy.ops.import_scene.gltf(filepath=str(source));mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH');active(mesh);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 vs=[v.co for v in mesh.data.vertices];bottom=min(v.z for v in vs);top=max(v.z for v in vs);center=Vector(((min(v.x for v in vs)+max(v.x for v in vs))/2,(min(v.y for v in vs)+max(v.y for v in vs))/2,bottom));factor=height/(top-bottom)
 for v in mesh.data.vertices:v.co=(v.co-center)*factor
 dec=mesh.modifiers.new('Runtime budget','DECIMATE');dec.ratio=min(1,90000/len(mesh.data.polygons));dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name)
 for p in mesh.data.polygons:p.use_smooth=True
 for img in bpy.data.images:
  if img.size[0]>2048:img.scale(2048,2048)
  img.pack()
 data=bpy.data.armatures.new(ident+'_skeleton');arm=bpy.data.objects.new(ident+'_rig',data);bpy.context.collection.objects.link(arm);active(arm);bpy.ops.object.mode_set(mode='EDIT');names=[]
 def bone(n,a,b,parent=None):
  eb=data.edit_bones.new(n);eb.head=point(*a)*height;eb.tail=point(*b)*height
  if parent:eb.parent=data.edit_bones[parent]
  names.append(n)
 bone('Hips',(0,.51,0),(0,.6,0));bone('Spine',(0,.6,0),(0,.7,0),'Hips');bone('Chest',(0,.7,0),(0,.79,0),'Spine');bone('Neck',(0,.79,0),(0,.845,0),'Chest');bone('Head',(0,.845,0),(0,.99,0),'Neck')
 for side,s in [('L',1),('R',-1)]:
  bone('Shoulder'+side,(s*.045,.775,0),(s*.108,.777,0),'Chest');bone('UpperArm'+side,(s*.108,.777,0),(s*span*.66,.755,0),'Shoulder'+side);bone('Forearm'+side,(s*span*.66,.755,0),(s*span*.86,.733,0),'UpperArm'+side);bone('Hand'+side,(s*span*.86,.733,0),(s*span,.716,.006),'Forearm'+side)
  bone('Thigh'+side,(s*.075,.51,0),(s*.079,.285,.008),'Hips');bone('Shin'+side,(s*.079,.285,.008),(s*.079,.064,0),'Thigh'+side);bone('Foot'+side,(s*.079,.064,0),(s*.079,.035,.08),'Shin'+side)
  if ident!='juliette':bone('Coat'+side,(s*.08,.52,-.01),(s*.095,.28,-.01),'Hips')
 bpy.ops.object.mode_set(mode='OBJECT');groups={n:mesh.vertex_groups.new(name=n) for n in names}
 def blend(w,a,b,t):
  if t<1:w[a]=w.get(a,0)+1-t
  if t>0:w[b]=w.get(b,0)+t
 for v in mesh.data.vertices:
  x,y,z=v.co.x/height,v.co.z/height,-v.co.y/height;ax=abs(x);side='L' if x>=0 else 'R';w={}
  if y>.64 and ax>.105+max(0,.76-y)*.85:
   armweight=smooth(.10+max(0,.76-y)*.85,.165+max(0,.72-y)*.8,ax)
   if ax<span*.66:w['UpperArm'+side]=1
   elif ax<span*.86:blend(w,'UpperArm'+side,'Forearm'+side,smooth(span*.60,span*.75,ax))
   else:blend(w,'Forearm'+side,'Hand'+side,smooth(span*.81,span*.92,ax))
   w={k:value*armweight for k,value in w.items()};w['Chest']=1-armweight
  elif y>.79:blend(w,'Neck','Head',smooth(.80,.87,y))
  elif y>.59:blend(w,'Spine','Chest',smooth(.60,.74,y))
  elif y>.48:blend(w,'Hips','Spine',smooth(.52,.64,y))
  elif ident!='juliette' and y>.25 and (abs(z)>.047 or ax>.14):blend(w,'CoatR','CoatL',smooth(-.02,.02,x))
  elif y>.28:blend(w,'Thigh'+side,'Hips',smooth(.42,.51,y))
  elif y>.085:blend(w,'Shin'+side,'Thigh'+side,smooth(.23,.33,y))
  else:blend(w,'Foot'+side,'Shin'+side,smooth(.055,.11,y))
  pairs=sorted(((k,v) for k,v in w.items() if v>1e-5),key=lambda p:-p[1])[:4];total=sum(v for _,v in pairs)
  for n,val in pairs:groups[n].add([v.index],val/total,'REPLACE')
 mod=mesh.modifiers.new('Skeleton','ARMATURE');mod.object=arm;mesh.parent=arm;mesh.name=ident+'_body';rest={b.name:b.matrix_local.to_quaternion() for b in data.bones}
 def pose(n,angle,axis=(1,0,0)):arm.pose.bones[n].rotation_quaternion=rest[n].inverted()@Quaternion(Vector(axis),angle)@rest[n]
 for side,s in [('L',1),('R',-1)]:pose('UpperArm'+side,s*math.radians(61),(0,1,0))
 active(mesh);bpy.ops.object.modifier_apply(modifier=mod.name);active(arm);bpy.ops.object.mode_set(mode='POSE');bpy.ops.pose.armature_apply(selected=False);bpy.ops.object.mode_set(mode='OBJECT');mod=mesh.modifiers.new('Skeleton','ARMATURE');mod.object=arm;rest={b.name:b.matrix_local.to_quaternion() for b in data.bones}
 def identity():
  for b in arm.pose.bones:b.rotation_mode='QUATERNION';b.rotation_quaternion=(1,0,0,0);b.location=(0,0,0)
 sc=bpy.context.scene;sc.render.fps=30;clips={}
 for clip,frames,amp in [('Idle',90,0),('Walk',30,.39),('Run',22,.65)]:
  arm.animation_data_create();act=bpy.data.actions.new(clip);arm.animation_data.action=act
  for frame in range(frames+1):
   identity();phase=frame/frames*math.tau;pose('Spine',(-.055 if clip=='Run' else 0)+.006*math.sin(phase));pose('Chest',.009*math.sin(phase),(0,0,1))
   if amp:
    run=clip=='Run';hipdrop=(-.071 if run else -.030)*height;arm.pose.bones['Hips'].location=rest['Hips'].inverted()@Vector((0,0,hipdrop))
    for side,s in [('L',1),('R',-1)]:
     t=(frame/frames+(0 if s==1 else .5))%1;stance=.54 if run else .60;reach=(.23 if run else .15)*height
     if t<stance:forward=reach*(1-2*t/stance);lift=0
     else:u=(t-stance)/(1-stance);forward=reach*(-1+2*(u*u*(3-2*u)));lift=(.12 if run else .065)*height*math.sin(math.pi*u)
     a=math.hypot(.225,.008)*height;b=math.hypot(.221,.008)*height;drop=(.51-.064)*height+hipdrop-lift;distance=min(a+b-.0001,math.hypot(drop,forward));theta=math.atan2(forward,drop);alpha=math.acos(max(-1,min(1,(a*a+distance*distance-b*b)/(2*a*distance))));knee=math.pi-math.acos(max(-1,min(1,(a*a+b*b-distance*distance)/(2*a*b))));thigh=-(theta+alpha-math.atan2(.008,.225));shin=knee-math.atan2(.008,.225)-math.atan2(.008,.221)
     pose('Thigh'+side,thigh);pose('Shin'+side,shin);pose('Foot'+side,-thigh-shin);pose('UpperArm'+side,amp*.70*forward/reach);pose('Forearm'+side,-.65 if run else -.10)
     if ident!='juliette':pose('Coat'+side,thigh*.24)
   else:pose('Head',.015*math.sin(phase),(0,0,1))
   for b in arm.pose.bones:b.keyframe_insert('rotation_quaternion',frame=frame);b.keyframe_insert('location',frame=frame)
  for slot in act.slots:
   for layer in act.layers:
    for strip in layer.strips:
     if hasattr(strip,'channelbag'):
      bag=strip.channelbag(slot)
      if bag:
       for f in bag.fcurves:
        for k in f.keyframe_points:k.interpolation='LINEAR'
  clips[clip]=act;arm.animation_data.action=None;t=arm.animation_data.nla_tracks.new();t.name=clip;t.strips.new(clip,0,act);t.mute=True
 for clip,frame in [('Idle',1),('Walk',7),('Run',5)]:arm.animation_data.action=clips[clip];render(ident+'-'+clip.lower(),frame)
 arm.animation_data.action=None;sc.frame_set(0);identity()
 for t in arm.animation_data.nla_tracks:t.mute=False
 active(arm);mesh.select_set(True);output=out/(ident+'.glb');bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_skins=True,export_all_influences=False,export_yup=True,export_image_format='JPEG',export_jpeg_quality=86)
 manifest.append({'id':ident,'source':source.name,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'file':output.name,'heightMetres':height,'forward':'+Z','up':'+Y','triangles':len(mesh.data.polygons),'bones':len(data.bones),'clips':['Idle','Walk','Run'],'method':'Spatial skin weights, relaxed bind pose and procedural two-bone IK foot planting; not motion capture.'});print('PREPARED',ident,output.stat().st_size,flush=True)
reset();source=next(src.glob('8feac106*.glb'));bpy.ops.import_scene.gltf(filepath=str(source));mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH');active(mesh);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);vs=[v.co for v in mesh.data.vertices];lo=Vector(tuple(min(v[i] for v in vs) for i in range(3)));hi=Vector(tuple(max(v[i] for v in vs) for i in range(3)));center=(lo+hi)/2;factor=.147/max(hi-lo)
for v in mesh.data.vertices:v.co=(v.co-center)*factor
for img in bpy.data.images:
 if img.size[0]>2048:img.scale(2048,2048)
 img.pack()
mesh.name='Hard drive relic';output=out/'hard-drive-relic.glb';bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_image_format='JPEG',export_jpeg_quality=90,export_animations=False);manifest.append({'id':'hard-drive-relic','source':source.name,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'file':output.name,'longestDimensionMetres':.147,'note':'Identity supplied by the user; source shape and texture preserved.'});(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('ALL ASSETS READY',flush=True)
