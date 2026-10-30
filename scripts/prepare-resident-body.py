"""Retarget the CC0 MakeHuman body and weights to the resident's relaxed rig.
Usage: python scripts/prepare-resident-body.py SOURCE_DIR
See docs/character-performance.md for sources and licensing.
"""
import json,sys
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation
src=Path(sys.argv[1]);v=[];faces=[];group=''
for l in (src/'base.obj').read_text().splitlines():
 a=l.split()
 if not a:continue
 if a[0]=='v':v.append(list(map(float,a[1:4])))
 elif a[0]=='g':group=' '.join(a[1:])
 elif a[0]=='f' and group=='body':faces.append([int(s.split('/')[0])-1 for s in a[1:]])
v=np.array(v);rig=json.loads((src/'default.mhskel').read_text());weights=json.loads((src/'default_weights.mhw').read_text())['weights']
def source(name,end='head'):return np.mean(v[rig['joints'][rig['bones'][name][end]]],axis=0)
def name(b):
 side=b[-1] if b.endswith(('.L','.R')) else ''
 for prefix,to in [('metacarpal','Hand'),('shoulder','UpperArm'),('upperarm','UpperArm'),('lowerarm','Forearm'),('wrist','Hand'),('upperleg','Thigh'),('lowerleg','Shin'),('foot','Foot'),('toe','Foot')]:
  if b.startswith(prefix):return to+side
 if b.startswith('finger'):return ('Hand' if b.startswith('finger1-') else 'FingerTips' if '-3.' in b else 'Fingers')+side
 if b.startswith(('head','neck','special','eye','jaw')):return 'Neck'
 if b.startswith(('clavicle','breast','spine01')):return 'Chest'
 if b in ['spine02','spine03']:return 'Spine'
 return 'Hips'
mapped=[{} for _ in v]
for b,ws in weights.items():
 n=name(b)
 for i,w in ws:mapped[i][n]=mapped[i].get(n,0)+w
joints=['Hips','Spine','Chest','Neck']+[p+s for s in ['L','R'] for p in ['UpperArm','Forearm','Hand','Fingers','FingerTips','Thigh','Shin','Foot']]
transforms={}
for s,sign in [('L',1),('R',-1)]:
 targets={'UpperArm':([sign*.178,1.405,0],[sign*.196,1.118,.011]),'Forearm':([sign*.196,1.118,.011],[sign*.208,.868,.017]),'Hand':([sign*.208,.868,.017],[sign*.208,.743,.028]),'Thigh':([sign*.092,.90,0],[sign*.095,.50,.012]),'Shin':([sign*.095,.50,.012],[sign*.095,.08,.018])}
 sources={'UpperArm':(source('upperarm01.'+s),source('lowerarm01.'+s)),'Forearm':(source('lowerarm01.'+s),source('wrist.'+s)),'Hand':(source('wrist.'+s),source('finger3-3.'+s,'tail')),'Thigh':(source('upperleg01.'+s),source('lowerleg01.'+s)),'Shin':(source('lowerleg01.'+s),source('foot.'+s))}
 for part in targets:
  a,b=np.array(targets[part]);a0,b0=np.array(sources[part])*.105;d0=b0-a0;d=b-a;u=d0/np.linalg.norm(d0);q,_=Rotation.align_vectors([d/np.linalg.norm(d)],[u]);stretch=np.eye(3)+(np.linalg.norm(d)/np.linalg.norm(d0)-1)*np.outer(u,u);M=q.as_matrix()@stretch;transforms[part+s]=(M,a-M@a0)
 transforms['Fingers'+s]=transforms['FingerTips'+s]=transforms['Hand'+s];transforms['Foot'+s]=transforms['Shin'+s]
for n in ['Hips','Spine','Chest','Neck']:transforms[n]=(np.eye(3),np.array([0,.856-.011,.0]))
points=[];skinIndices=[];skinWeights=[];tones=[];old=[];lookup={}
faces=[f for f in faces if max(v[i,1] for i in f)<5.84 and min(v[i,1] for i in f)>-7.20]
for face in faces:
 for i in face:
  if i in lookup:continue
  ws=sorted(mapped[i].items(),key=lambda a:-a[1])[:2] or [('Hips',1)];total=sum(w for n,w in ws);ws=[(n,w/total) for n,w in ws]
  p=sum((transforms[n][0]@(v[i]*.105)+transforms[n][1])*w for n,w in ws)
  lookup[i]=len(points);points.append(p);old.append(i);skinIndices.append([joints.index(ws[0][0]),joints.index(ws[-1][0])]);skinWeights.append(ws[0][1] if len(ws)>1 else 1)
  hand=sum(w for n,w in mapped[i].items() if n.startswith(('Hand','Fingers','FingerTips')))
  tones.append(2 if hand>.45 else 1 if p[1]<.95 and abs(p[0])<.185 else 0)
points=np.array(points)
# A shirt hangs over the chest and waist; it does not reproduce nude anatomy.
profile=[(.84,.173),(.97,.176),(1.12,.159),(1.29,.183),(1.36,.180),(1.42,.147)]
for i,p in enumerate(points):
 torso=sum(w for n,w in mapped[old[i]].items() if n in ['Hips','Spine','Chest'])
 if torso>.65 and .84<p[1]<1.42:
  radius=np.interp(p[1],[a for a,b in profile],[b for a,b in profile])
  angle=np.arctan2(p[2]/.73,p[0]);blend=min(1,(p[1]-.84)/.06,(1.42-p[1])/.06)
  target=np.array([np.cos(angle)*radius,p[1],np.sin(angle)*radius*.73]);points[i]=p*(1-blend)+target*blend
idx=[]
for f in faces:
 f=[lookup[i] for i in f]
 for j in range(1,len(f)-1):idx.extend([f[0],f[j],f[j+1]])
idx=np.array(idx).reshape(-1,3);adj=[set() for _ in points]
for f in idx:
 for i in f:adj[i].update(j for j in f if j!=i)
# Loosen and smooth the cloth envelope. Hands retain their anatomical detail.
for _ in range(4):
 nxt=points.copy()
 for i,p in enumerate(points):
  if tones[i]!=2 and adj[i]:nxt[i]=p*.72+np.mean(points[list(adj[i])],axis=0)*.28
 points=nxt
tri=points[idx];fn=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);normal=np.zeros_like(points)
for j in range(3):np.add.at(normal,idx[:,j],fn)
normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),1e-9)
for i,p in enumerate(points):
 if tones[i]!=2:
  offset=.010 if p[1]>1.04 else .016;points[i]+=normal[i]*offset
# Only clothed geometry ships; the source skin is replaced by fabric colours.
data={'positions':points.round(6).flatten().tolist(),'indices':idx.flatten().tolist(),'joints':joints,'skinIndices':np.array(skinIndices).flatten().tolist(),'skinWeights':np.array(skinWeights).round(5).tolist(),'tones':tones}
Path('dist/src/resident-body-data.js').write_text('// CC0 MakeHuman body, retargeted and clothed; scripts/prepare-resident-body.py and docs/character-performance.md.\nexport const RESIDENT_BODY='+json.dumps(data,separators=(',',':'))+';\n');print(len(points),'vertices',len(idx),'triangles')
