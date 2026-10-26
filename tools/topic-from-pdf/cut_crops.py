# ตัดภาพแต่ละกล่อง/คอลัมน์ จาก PNG ของแต่ละหน้า (pdftoppm -r 170 -png file.pdf png/p) → docs/topics/<id>/c/<key>.webp
import json,os,sys
from PIL import Image
topic_dir,png_dir=sys.argv[1],sys.argv[2]
d=json.load(open(os.path.join(topic_dir,'data.json'))); os.makedirs(os.path.join(topic_dir,'c'),exist_ok=True)
for p in d['pages']:
    im=Image.open(os.path.join(png_dir,'p-%02d.png'%p['n'])).convert('RGB'); W,H=im.size
    def cut(key,bb):
        box=(max(0,int(bb[0]*W)-3),max(0,int(bb[1]*H)-3),min(W,int((bb[0]+bb[2])*W)+4),min(H,int((bb[1]+bb[3])*H)+4))
        im.crop(box).save(os.path.join(topic_dir,'c',key+'.webp'),'WEBP',quality=82,method=6)
    for ci,c in enumerate(p['cols']):
        if c['boxes']:
            for bi,b in enumerate(c['boxes']): cut('%d-%d-%d'%(p['n'],ci,bi),b['bb'])
        else: cut('%d-%d'%(p['n'],ci),c['bb'])
