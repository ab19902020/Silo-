"""Build compact, looped gait measurements from the CMU/cgspeed BVH recordings.

Usage: python scripts/prepare-captured-gaits.py INPUT_DIR OUTPUT_JS
Requires numpy and scipy for this offline preparation step, not in the game.
The original recordings are credited in docs/character-performance.md.
"""
import json, re, sys, hashlib
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation
from scipy.signal import find_peaks

def read_bvh(path):
    tokens=re.findall(r'[^\s{}]+|[{}]',path.read_text());cursor=1;bones=[];channels=0
    def take():
        nonlocal cursor
        value=tokens[cursor];cursor+=1;return value
    def joint(parent):
        nonlocal channels
        kind=take();name=take();name=bones[parent]['name']+'End' if kind=='End' else name
        assert take()=='{';b={'name':name,'parent':parent,'offset':None,'channels':[],'start':channels};i=len(bones);bones.append(b)
        while tokens[cursor]!='}':
            if tokens[cursor]=='OFFSET':take();b['offset']=np.array([float(take()) for _ in range(3)])
            elif tokens[cursor]=='CHANNELS':take();n=int(take());b['channels']=[take() for _ in range(n)];channels+=n
            else:joint(i)
        take()
    joint(-1);assert take()=='MOTION';assert take()=='Frames:';frames=int(take());assert take()=='Frame';assert take()=='Time:';dt=float(take())
    values=np.array([float(x) for x in tokens[cursor:]]).reshape(frames,channels)
    rotations=np.empty((frames,len(bones),3,3));positions=np.empty((frames,len(bones),3))
    for i,b in enumerate(bones):
        offset=np.broadcast_to(b['offset'],(frames,3)).copy();angles=[];axes=''
        for j,channel in enumerate(b['channels']):
            v=values[:,b['start']+j]
            if channel.endswith('position'):offset[:,'XYZ'.index(channel[0])]+=v
            else:axes+=channel[0];angles.append(v)
        local=Rotation.from_euler(axes,np.array(angles).T,degrees=True).as_matrix() if angles else np.broadcast_to(np.eye(3),(frames,3,3))
        if b['parent']<0:rotations[:,i]=local;positions[:,i]=offset
        else:
            rotations[:,i]=rotations[:,b['parent']]@local
            positions[:,i]=positions[:,b['parent']]+np.einsum('fij,fj->fi',rotations[:,b['parent']],offset)
    return bones,positions,rotations,dt

def build(path,kind):
    bones,positions,rotations,dt=read_bvh(path);names={b['name']:i for i,b in enumerate(bones)}
    p=lambda name:positions[:,names[name]]
    root=p('Hips');velocity=(root[-15]-root[15]);velocity[1]=0;velocity/=np.linalg.norm(velocity)
    heading=np.arctan2(velocity[0],velocity[2]);align=Rotation.from_euler('y',-heading).as_matrix()
    local=np.einsum('ij,fbj->fbi',align,positions-root[:,None,:])
    root_aligned=root@align.T
    q=lambda name:local[:,names[name]]
    length=np.mean([np.linalg.norm(p(s+'UpLeg')[1]-p(s+'Leg')[1])+np.linalg.norm(p(s+'Leg')[1]-p(s+'Foot')[1]) for s in ['Left','Right']])
    left=q('LeftFoot')[:,2]
    peaks,_=find_peaks(left[1:],distance=int((.4 if kind=='run' else .65)/dt),prominence=length*.15);peaks+=1
    valid=[(a,b) for a,b in zip(peaks[:-1],peaks[1:]) if a>10 and b<len(root)-8]
    if not valid:raise ValueError(f'{path}: no complete gait cycle: {peaks}')
    start,end=min(valid,key=lambda ab:abs((ab[0]+ab[1])/2-len(root)/2))
    # Peak extension precedes actual contact slightly. Keep both clips aligned
    # at the same physical event before blending a walk into a run.
    start+=2;end+=2;count=end-start;phase=np.linspace(start,end,49)
    def loop(values):
        v=np.stack([np.interp(phase,np.arange(len(values)),values[:,j]) for j in range(values.shape[1])],axis=1)
        # Remove the small drift between successive measured cycles, with a
        # symmetric correction that leaves the middle of the performance alone.
        mismatch=v[-1]-v[0];u=np.linspace(0,1,len(v));v-=((u-.5)**3*4+.5)[:,None]*mismatch
        v[-1]=v[0];return np.round(v,5).tolist()
    out={'source':path.name,'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'frames':[int(start),int(end)],'duration':round(count*dt,5),'stride':round(np.linalg.norm(root[end,[0,2]]-root[start,[0,2]])/length,5),'samples':49,'joints':{}}
    path_x=root_aligned[start,0]+(root_aligned[end,0]-root_aligned[start,0])*(np.arange(len(root))-start)/count
    out['pelvis']=loop(np.column_stack([root_aligned[:,0]-path_x,root[:,1]-np.mean(root[start:end,1]),np.zeros(len(root))])/length)
    hips=q('LeftUpLeg')-q('RightUpLeg');shoulders=q('LeftArm')-q('RightArm');spine=q('Neck1')-q('Spine')
    out['body']=loop(np.column_stack([-np.arctan2(hips[:,2],hips[:,0]),np.arctan2(hips[:,1],np.linalg.norm(hips[:,[0,2]],axis=1)),-np.arctan2(shoulders[:,2],shoulders[:,0]),np.arctan2(spine[:,2],spine[:,1])]))
    for side,tag in [('Left','L'),('Right','R')]:
        foot=q(side+'Foot').copy()/length
        floor=np.percentile(p(side+'Foot')[start:end,1],5)
        foot[:,1]=np.maximum(0,(p(side+'Foot')[:,1]-floor)/length)
        out['joints']['foot'+tag]=loop(foot)
        for part,a,b in [('upper','Arm','ForeArm'),('fore','ForeArm','Hand')]:
            d=q(side+b)-q(side+a);d/=np.linalg.norm(d,axis=1)[:,None]
            out['joints'][part+tag]=loop(d)
        toes=q(side+'ToeBase')-q(side+'Foot');roll=-np.arctan2(toes[:,1],np.linalg.norm(toes[:,[0,2]],axis=1))
        offset=int(count*.5) if tag=='R' else 0;mid=(start+offset+int(count*.3))%len(roll)
        roll-=np.median(roll[max(1,mid-4):mid+5]);out['joints']['roll'+tag]=loop(roll[:,None])
    # Upper body orientation is captured too; keep anatomical joint aims so
    # retargeting is independent of Blender's bone roll and the relaxed bind.
    for label,a,b in [('spine','Spine','Neck1'),('head','Neck1','Head')]:
        d=q(b)-q(a);d/=np.linalg.norm(d,axis=1)[:,None];out['joints'][label]=loop(d)
    print(path.name,'cycle',start,end,'seconds',out['duration'],'stride / leg',out['stride'])
    return out

if __name__=='__main__':
    src=Path(sys.argv[1]);out=Path(sys.argv[2])
    data={key:build(src/file,kind) for key,file,kind in [('engineer','07_01.bvh','walk'),('security','07_03.bvh','walk'),('measured','07_04.bvh','walk'),('run','35_17.bvh','run')]}
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text('// Derived from CMU motion capture; preparation and credit: docs/character-performance.md.\nexport const CAPTURED_GAITS='+json.dumps(data,separators=(',',':'))+';\n')
