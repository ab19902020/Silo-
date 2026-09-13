"""Prepare CC0 MakeHuman head topology and an eight-person face atlas.
Usage: python scripts/prepare-resident-head.py base.obj SKIN_PACK_DIR
Only the head/neck is retained. Credits and source URLs: docs/character-performance.md.
"""
import io,json,sys,zipfile
from pathlib import Path
import numpy as np
from PIL import Image
src=Path(sys.argv[1]);packs=Path(sys.argv[2]);v=[];uv=[];faces=[];group=''
for line in src.read_text().splitlines():
 a=line.split()
 if not a:continue
 if a[0]=='v':v.append(list(map(float,a[1:4])))
 elif a[0]=='vt':uv.append(list(map(float,a[1:3])))
 elif a[0]=='g':group=' '.join(a[1:])
 elif a[0]=='f' and group=='body':faces.append([tuple(int(t)-1 for t in s.split('/')[:2]) for s in a[1:]])
v=np.array(v);uv=np.array(uv);faces=[f for f in faces if min(v[t[0],1] for t in f)>5.8]
verts=[];tex=[];index=[];lookup={}
for face in faces:
 ids=[]
 for vi,ti in face:
  key=(vi,ti)
  if key not in lookup:
   lookup[key]=len(verts);p=v[vi]*.11;p[1]+=1.455-5.8*.11;p[2]-=.052;verts.append(p);tex.append(uv[ti])
  ids.append(lookup[key])
 for j in range(1,len(ids)-1):index.extend([ids[0],ids[j],ids[j+1]])
verts=np.array(verts);tex=np.array(tex)
# Head islands occupy the right-hand side of the source layout. Neck/chest
# islands receive the same skin vertex colour; no body texture is shipped.
u0,u1,v0,v1=.61,1.,.13,.85
entries=[('skins02','toigo_light_skin_male_bronze'),('skins02','onlytheghosts_old_eurasian_male'),('skins02','mindfront_skin_male_african_middleage'),('skins02','jartur69_middleage_slavic_male_with_genitals_and_beard'),('skins01','onlytheghosts_young_eurasian_female'),('skins01','onlytheghosts_old_eurasian_female'),('skins01','cutoff3d_indian_female_skin'),('skins01','onlytheghosts_middle_aged_eurasian_female')]
atlas=Image.new('RGB',(2048,2048));means=[]
for i,(pack,name) in enumerate(entries):
 with zipfile.ZipFile(packs/(pack+'.zip')) as z:
  mat='skins/'+name+'/'+name+'.mhmat';txt=z.read(mat).decode('utf-8-sig');diff=next(l.split(maxsplit=1)[1].strip() for l in txt.splitlines() if l.startswith('diffuseTexture '));path=str(Path(mat).parent/diff)
  if path not in z.namelist():path=next(n for n in z.namelist() if n.startswith(str(Path(mat).parent)+'/') and Path(n).name==Path(diff).name)
  im=Image.open(io.BytesIO(z.read(path))).convert('RGB');w,h=im.size
  # Colour calibration samples the cheeks, below the eye and outside the nose.
  cheek=(abs(verts[:,0])>.027)&(abs(verts[:,0])<.054)&(verts[:,1]>1.576)&(verts[:,1]<1.607)&(verts[:,2]>.075)&(tex[:,0]>.61)
  pix=np.array(im)/255.;samples=pix[np.clip(((1-tex[cheek,1])*h).astype(int),0,h-1),np.clip((tex[cheek,0]*w).astype(int),0,w-1)]
  linear=np.where(samples<=.04045,samples/12.92,((samples+.055)/1.055)**2.4);means.append(np.median(linear,axis=0).round(5).tolist())
  crop=im.crop((round(u0*w),round((1-v1)*h),w,round((1-v0)*h))).resize((512,1024),Image.Resampling.LANCZOS)
  atlas.paste(crop,((i%4)*512,(i//4)*1024));print(i,name,means[-1])
out=Path('dist/assets/characters');out.mkdir(parents=True,exist_ok=True);atlas.save(out/'resident-faces.jpg',quality=91,optimize=True)
data={'positions':np.round(verts,6).flatten().tolist(),'uv':np.round(tex,6).flatten().tolist(),'indices':index,'means':means,'crop':[u0,u1,v0,v1]}
Path('dist/src/resident-head-data.js').write_text('// CC0 MakeHuman head. Rebuild with scripts/prepare-resident-head.py; credits in docs/character-performance.md.\nexport const RESIDENT_HEAD='+json.dumps(data,separators=(',',':'))+';\n')
