"""CPU contact sheet for the geometry exported by inspect-motion.mjs.
This is an asset inspection render, not a screenshot of the WebGL renderer.
python scripts/render-motion.py /absolute/inspection/directory
"""
import sys,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw

p=Path(sys.argv[1]);scenes=json.loads((p/'scenes.json').read_text());W,H=320,450
sheet=Image.new('RGB',(W*4,H*((len(scenes)+3)//4)),(27,32,34))
eye=np.array([2.1,1.85,5.2]);target=np.array([0,.9,0]);f=target-eye;f/=np.linalg.norm(f)
right=np.cross(f,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,f);scale=H/2.2
for n,s in enumerate(scenes):
    v=np.fromfile(p/s['file'],dtype=np.float32).reshape(-1,3)
    ids=np.fromfile(p/(s['id']+'-index.bin'),dtype=np.uint32).reshape(-1,3)
    uv=np.fromfile(p/(s['id']+'-uv.bin'),dtype=np.float32).reshape(-1,2)
    tex=np.asarray(Image.open(p/(s['id']+'.jpg')).convert('RGB'))
    rel=v-target;pts=np.column_stack([rel@right*scale+W/2,H*.51-rel@up*scale]);z=rel@f
    tri=v[ids];norm=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);norm/=np.maximum(np.linalg.norm(norm,axis=1,keepdims=True),1e-8)
    light=np.array([-2,4,5],dtype=float);light/=np.linalg.norm(light);strength=.45+.55*np.maximum(norm@light,0)
    coloruv=uv[ids].mean(axis=1);tx=np.clip((coloruv[:,0]*tex.shape[1]).astype(int),0,tex.shape[1]-1);ty=np.clip((coloruv[:,1]*tex.shape[0]).astype(int),0,tex.shape[0]-1)
    colors=np.clip(tex[ty,tx]*strength[:,None],0,255).astype(np.uint8)
    im=Image.new('RGB',(W,H),(39,45,47));d=ImageDraw.Draw(im);ground=np.array([0,0,0])-target;gy=int(H*.51-ground@up*scale)
    d.ellipse((W//2-56,gy-12,W//2+56,gy+13),fill=(25,29,29))
    order=np.argsort(-z[ids].mean(axis=1));front=norm@(eye-target)>0
    for j in order:
        if not front[j]:continue
        xy=pts[ids[j]]
        if xy.max(axis=0)[0]<0 or xy.min(axis=0)[0]>W:continue
        d.polygon([tuple(x) for x in xy],fill=tuple(colors[j]))
    d.text((12,12),s['id'].title()+' / '+s['label'],fill=(225,218,192));sheet.paste(im,((n%4)*W,(n//4)*H))
sheet.save(p/'motion-sheet.jpg',quality=94);print(p/'motion-sheet.jpg')
