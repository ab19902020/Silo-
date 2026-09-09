import ctypes as c, json, os, sys
os.environ['EGL_PLATFORM']='surfaceless'
e=c.CDLL('libEGL.so.1');P=c.c_void_p;I=c.c_int;U=c.c_uint
for name,ret,args in [('eglGetDisplay',P,[P]),('eglInitialize',U,[P,c.POINTER(I),c.POINTER(I)]),('eglChooseConfig',U,[P,c.POINTER(I),c.POINTER(P),I,c.POINTER(I)]),('eglBindAPI',U,[U]),('eglCreateContext',P,[P,P,P,c.POINTER(I)]),('eglCreatePbufferSurface',P,[P,P,c.POINTER(I)]),('eglMakeCurrent',U,[P,P,P,P]),('eglGetProcAddress',P,[c.c_char_p])]:
 f=getattr(e,name);f.restype=ret;f.argtypes=args
d=e.eglGetDisplay(None);a=I();b=I();assert e.eglInitialize(d,c.byref(a),c.byref(b));assert e.eglBindAPI(0x30A0)
attrs=(I*9)(0x3033,1,0x3040,0x40,0x3024,8,0x3025,8,0x3038);config=P();count=I();assert e.eglChooseConfig(d,attrs,c.byref(config),1,c.byref(count)) and count.value
ctx=e.eglCreateContext(d,config,None,(I*3)(0x3098,3,0x3038));assert ctx
surf=e.eglCreatePbufferSurface(d,config,(I*5)(0x3057,1,0x3056,1,0x3038));assert e.eglMakeCurrent(d,surf,surf,ctx)
def gl(name,ret,*args):return c.CFUNCTYPE(ret,*args)(e.eglGetProcAddress(name.encode()))
create=gl('glCreateShader',U,U);source=gl('glShaderSource',None,U,I,c.POINTER(c.c_char_p),P);compile=gl('glCompileShader',None,U);get=gl('glGetShaderiv',None,U,U,c.POINTER(I));log=gl('glGetShaderInfoLog',None,U,I,P,c.c_char_p)
program=gl('glCreateProgram',U);attach=gl('glAttachShader',None,U,U);link=gl('glLinkProgram',None,U);getprogram=gl('glGetProgramiv',None,U,U,c.POINTER(I));programlog=gl('glGetProgramInfoLog',None,U,I,P,c.c_char_p)
failures=[]
for record in json.load(open(sys.argv[1] if len(sys.argv)>1 else 'qa-output/shaders.json')):
 handles=[]
 for key,kind in [('vertex',0x8B31),('fragment',0x8B30)]:
  sh=create(kind);data=c.c_char_p(record[key].encode());source(sh,1,c.byref(data),None);compile(sh);ok=I();get(sh,0x8B81,c.byref(ok));handles.append(sh)
  if not ok.value:
   buf=c.create_string_buffer(8192);log(sh,8192,None,buf);failures.append(record['name']+' '+key+': '+buf.value.decode())
 p=program()
 for sh in handles:attach(p,sh)
 link(p);ok=I();getprogram(p,0x8B82,c.byref(ok))
 if not ok.value:
  buf=c.create_string_buffer(8192);programlog(p,8192,None,buf);failures.append(record['name']+' link: '+buf.value.decode())
 else:print(record['name']+': compiled and linked')
for failure in failures:print(failure)
assert not failures
