#!/usr/bin/env python3
"""Build the website: template.html (look) + site/ (app) + config.json + each ward's data → docs/index.html (+ docs/img/).
python3 build_site.py [outdir]   (default: docs)
python3 build_site.py --inst si [outdir]   → a second website from the same code: si/config.json + si/<ward dir>/ → docs/si/ (default)
Every <dir>/config.json with an "inst" block is an institution; each site's CONFIG.insts lists all of them (link + gate hash) for the institution switch on the account page.
Each ward in config.json "wards" has "dir": its data folder holding data_b*.js (one file per set) optional unit_*.js (Unit round banks) and optional highyield.js
(sets W.HY = {topics:[{title, points:[…], refs:[rid…], rep}], keywords:[{k, v, refs:[rid…]}]})."""
import glob, hashlib, json, os, shutil, html, sys, re
ROOT=os.path.dirname(os.path.abspath(__file__)); os.chdir(ROOT)
AV=sys.argv[1:];INST=''
for i,a in enumerate(AV):
    if a.startswith('--inst='):INST=a.split('=',1)[1]
    elif a=='--inst' and i+1<len(AV):INST=AV[i+1];AV[i+1]='--'
if INST in ('mdcu','.'):INST=''
ARGS=[a for a in AV if not a.startswith('--')]
IDIR=INST                                                          # '' = MDCU (repo root) · 'si' = Siriraj (si/)
J=lambda *p:os.path.join(IDIR,*p) if IDIR else os.path.join(*p)
PACK='--pack' in sys.argv      # Claude artifact build: an artifact version holds at most ~510 files, so images are stacked into a few sprite sheets per prefix
OUT=ARGS[0] if ARGS else os.path.join(ROOT,'docs',*([IDIR] if IDIR else []))
SPLIT=PACK or not ARGS   # the website build (default outdir) keeps exam data in data_<ward>*.js next to the page, not inline: 44MB of inline script text made browser extensions that scan the page on every DOM change freeze each page switch 10-20 s (found 4 Nov 2026) · an explicit outdir without --pack stays one self-contained file
if SPLIT and not PACK:
    for f in glob.glob(os.path.join(OUT,'data_*.js'))+glob.glob(os.path.join(OUT,'data_*.json')): os.remove(f)   # a ward can shrink to fewer chunks, or be removed
tpl=open('template.html',encoding='utf-8').read()
cfg=json.load(open(J('config.json'),encoding='utf-8'))
def _inst(d):
    c=json.load(open(os.path.join(d,'config.json') if d else 'config.json',encoding='utf-8'));I=c.get('inst')
    if not I:return None
    g=c.get('gate') or {}
    return {'id':I.get('id'),'name':I.get('name'),'th':I.get('th',''),'url':c.get('siteUrl',''),'art':c.get('artifactUrl',''),'sk':c.get('storageKey',''),'gate':({'salt':g.get('salt',''),'h':g['h'],'r':int(g.get('r',0) or 0)} if g.get('h') else None)}
_ins=[x for x in [_inst('')]+[_inst(os.path.dirname(f)) for f in sorted(glob.glob('*/config.json'))] if x]
if len(_ins)>1:cfg['insts']=_ins
head=tpl[:tpl.index('</style>')]                                   # doctype … platform CSS
body=open('site/body.html',encoding='utf-8').read()
title=cfg.get('siteName') or cfg.get('title','คลังข้อสอบเก่า')
imgs={os.path.splitext(os.path.basename(f))[0]:'img/'+os.path.basename(f) for f in sorted(glob.glob(J('img','*.jpg'))+glob.glob(J('img','*.png')))}
def num(f):
    b=os.path.basename(f)[6:-3]
    return int(b) if b.isdigit() else 10**9
packs={}
WEBSPR=SPLIT and not PACK and '--no-sprites' not in sys.argv   # website: images stacked into sprite sheets too (10 Nov 2026: ~6.2k files made the GitHub Pages deploy hit its 10-min syncing_files timeout) · sheets ≤ 8000 px tall for phones · ?v=<hash> so the service worker never shows a stale sheet
if PACK or WEBSPR:
    from PIL import Image
    groups={}
    for k in imgs: groups.setdefault(re.sub(r'_[^_]*$','',k),[]).append(k)
    os.makedirs(os.path.join(OUT,'img'),exist_ok=True)
    if WEBSPR:
        for f in glob.glob(os.path.join(OUT,'img','*')): os.remove(f)   # drop single images / old sheets
    for g,ks in sorted(groups.items()):
        ims=[(k,Image.open(J(imgs[k])).convert('RGB')) for k in ks]
        sheets=[[]];h=0
        for k,im in ims:
            if h+im.height>(30000 if PACK else 8000) and sheets[-1]: sheets.append([]);h=0
            sheets[-1].append((k,im));h+=im.height
        for si,sh in enumerate(sheets):
            W=max(im.width for _,im in sh);H=sum(im.height for _,im in sh)
            c=Image.new('RGB',(W,H),'white');y=0;fn='img/pk_%s_%d.jpg'%(g,si)
            for k,im in sh:
                c.paste(im,(0,y));packs[k]={'p':fn,'w':im.width,'h':im.height,'W':W,'H':H,'y':y};y+=im.height
            c.save(os.path.join(OUT,fn),quality=82,optimize=True,progressive=True)
            if WEBSPR:
                v=hashlib.md5(open(os.path.join(OUT,fn),'rb').read()).hexdigest()[:8]
                for k,_ in sh: packs[k]['p']=fn+'?v='+v
    imgs={k:packs[k] for k in imgs}
js=['const IMGS={};const WARDS={};']
if imgs: js.append('Object.assign(IMGS,'+json.dumps(imgs)+');')
js.append('const CONFIG='+json.dumps(cfg,ensure_ascii=False)+';')
import datetime
js.append('const BUILD='+json.dumps(datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).strftime('%d/%m/%Y %H:%M'))+';')
total=0
import subprocess,shutil as _sh
NODE=bool(_sh.which('node'))   # website build needs node to split each ward into JSON (without node: one data_<ward>*.js per ward, loaded whole)
if SPLIT and not PACK and not NODE: print('WARNING: node not found — wards are built as data_<ward>*.js (no explanation/round split)')
wcount={}
wmap={}   # SPLIT website: ward id → its data files, loaded only when the ward is opened (site/app.js loadWard)
wsrc=[]   # SPLIT: each ward's data goes to its own data_<ward>.js next to the page (an artifact page is capped at 16MB)
for w in cfg.get('wards',[]):
    wid=json.dumps(w['id']); d=J(w.get('dir','data'))
    if SPLIT: j0=len(js)
    js.append(f'WARDS[{wid}]={{QB:[],HY:null}};')
    for f in sorted(glob.glob(os.path.join(d,'data_b*.js')),key=num):
        js.append('(function(QB){\n'+open(f,encoding='utf-8').read()+'\n})(WARDS['+wid+'].QB);')
    fx=os.path.join(d,'fixes.js') if d!='data' else 'fixes.js'
    if os.path.exists(fx): js.append('(function(QB){\n'+open(fx,encoding='utf-8').read()+'\n})(WARDS['+wid+'].QB);')
    for f in sorted(glob.glob(os.path.join(d,'unit_*.js'))):     # Unit round banks: W.UNIT.push({id,title,short,src,QB:[…]})
        js.append('(function(W){W.UNIT=W.UNIT||[];\n'+open(f,encoding='utf-8').read()+'\n})(WARDS['+wid+']);')
    for extra in ('topics.js','resources.js','dups.js','tags.js','io.js','chapters.js'):     # W.TOPIC={"set|ro|orig":"topic"} · W.RES=[{topic,title,type,url,note}] (Advisor round)
        fp=os.path.join(d,extra)
        if os.path.exists(fp): js.append('(function(W){\n'+open(fp,encoding='utf-8').read()+'\n})(WARDS['+wid+']);')
    for f in sorted(glob.glob(os.path.join(d,'txt_T*.js'))):     # textbooks (code T), one file per book, after io.js: W.TXT.push({code,title,topic,tags,type,url,note,points}) per chapter + its Round I/O doc kind "T" into W.IO.docs
        js.append('(function(W){W.TXT=W.TXT||[];W.IO=W.IO||{docs:[],merged:{}};W.IO.docs=W.IO.docs||[];\n'+open(f,encoding='utf-8').read()+'\n})(WARDS['+wid+']);')
    js.append(f'WARDS[{wid}].MQ=[];')
    for f in sorted(glob.glob(os.path.join(d,'meq_b*.js')),key=lambda f:int(re.sub(r'\D','',os.path.basename(f)) or 0)):   # MEQ banks: QB.push(case) → W.MQ
        js.append('(function(QB){\n'+open(f,encoding='utf-8').read()+'\n})(WARDS['+wid+'].MQ);')
    mfx=os.path.join(d,'meq_fixes.js')   # MEQ field overrides (OB-GYN reference audit) — keys set|ro|orig[#k], see parts/meqaudit
    if os.path.exists(mfx): js.append('(function(QB){\n'+open(mfx,encoding='utf-8').read()+'\n})(WARDS['+wid+'].MQ);')
    js.append(f'WARDS[{wid}].OS=[];')
    for f in sorted(glob.glob(os.path.join(d,'osce_b*.js')),key=lambda f:int(re.sub(r'\D','',os.path.basename(f)) or 0)):   # OSCE banks: QB.push(station) → W.OS (same shape as a MEQ case, one Part)
        js.append('(function(QB){\n'+open(f,encoding='utf-8').read()+'\n})(WARDS['+wid+'].OS);')
    js.append(f'WARDS[{wid}].OSU=[];')   # Unit round OSCE (14 Nov 2026): osu_<topic>.js → QB.push(station with topic) — by big OSCE topic
    for f in sorted(glob.glob(os.path.join(d,'osu_*.js'))):
        js.append('(function(QB){\n'+open(f,encoding='utf-8').read()+'\n})(WARDS['+wid+'].OSU);')
    js.append(f'WARDS[{wid}].MORN=[];')   # Morning round MEQ (14 Nov 2026): morn_meq*.js → QB.push({day:"YYYY-MM-DD", …case}) — one case a day, the same for everyone
    for f in sorted(glob.glob(os.path.join(d,'morn_meq*.js'))):
        js.append('(function(QB){\n'+open(f,encoding='utf-8').read()+'\n})(WARDS['+wid+'].MORN);')
    orf=os.path.join(d,'osce_ref.js')   # แหล่งอ้างอิงให้ AI แต่ง/ตรวจ OSCE ของวอร์ด: OSREF.push({id,topic,sub,title,text})
    js.append(f'WARDS[{wid}].OSREF=[];')
    if os.path.exists(orf): js.append('(function(OSREF){\n'+open(orf,encoding='utf-8').read()+'\n})(WARDS['+wid+'].OSREF);')
    kx=os.path.join(d,'kimg.js')   # รูปจากไฟล์เฉลยที่ครอปเพิ่มทีหลัง: W.QB/MQ/OS ตาม set|ro|orig (ใส่หน้ารูปเดิม)
    if os.path.exists(kx): js.append('(function(W){\n'+open(kx,encoding='utf-8').read()+'\n})(WARDS['+wid+']);')
    js.append(f'WARDS[{wid}].SUMM={{MCQ:[],MEQ:[],OSCE:[]}};')
    for f in sorted(glob.glob(os.path.join(d,'sum_*.js'))):     # สรุป High-yield Phase 2: sum_<mcq|meq|osce>_<slug>.js → SUMM.push({tag,title,intro,groups})
        T=os.path.basename(f).split('_')[1].upper()
        if T in ('MCQ','MEQ','OSCE'): js.append('(function(SUMM){\n'+open(f,encoding='utf-8').read()+'\n})(WARDS['+wid+'].SUMM.'+T+');')
    hy=os.path.join(d,'highyield.js')
    if os.path.exists(hy): js.append('(function(W){\n'+open(hy,encoding='utf-8').read()+'\n})(WARDS['+wid+']);')
    if SPLIT and not PACK and NODE:
        # website: run the ward's data once in node → data_<ward>.json (ward home) + data_<ward>_x.json (explanations, Round I/O, summaries…) — tools/ward_split.js
        os.makedirs(OUT,exist_ok=True); base='data_'+re.sub(r'\W','',w['id']); tmp=os.path.join(OUT,base+'.tmp.js')
        open(tmp,'w',encoding='utf-8').write('\n'.join(js[j0:])+'\n')
        try:
            o=subprocess.run(['node','tools/ward_split.js',OUT,base,tmp],capture_output=True,text=True,timeout=600)
            if o.returncode!=0: raise SystemExit('ward_split failed for '+w['id']+':\n'+o.stderr[-2000:])
            wcount.update(json.loads(o.stdout.strip().splitlines()[-1]))
        finally: os.remove(tmp)
        wmap[w['id']]={'a':[base+'.json'],'x':[base+'_x.json']}
        del js[j0:]
    elif SPLIT:
        # an artifact text file is capped at 16MB → split a big ward into data_<ward>.js, data_<ward>_2.js … (≤12MB each, loaded in order)
        os.makedirs(OUT,exist_ok=True); base='data_'+re.sub(r'\W','',w['id']); chunks=[[]]; sz=0
        for part in js[j0:]:
            n=len(part.encode())
            if chunks[-1] and sz+n>12*1024*1024: chunks.append([]); sz=0
            chunks[-1].append(part); sz+=n
        for i,ch in enumerate(chunks):
            fn=base+('' if i==0 else '_%d'%(i+1))+'.js'
            open(os.path.join(OUT,fn),'w',encoding='utf-8').write('\n'.join(ch)+'\n'); wsrc.append(fn); wmap.setdefault(w['id'],{'a':[],'x':[]})['a'].append(fn)
        del js[j0:]
LOADERR="document.body.insertAdjacentHTML('afterbegin','<p style=&quot;margin:0;padding:12px 16px;background:#b3261e;color:#fff;text-align:center&quot;>โหลดข้อสอบไม่ครบ กรุณารีเฟรชหน้านี้</p>')"
appjs=open('site/app.js',encoding='utf-8').read().replace('"use strict";\n','"use strict";\n'+open('site/meq.js',encoding='utf-8').read()+'\n'+open('site/osce.js',encoding='utf-8').read()+'\n'+open('site/io.js',encoding='utf-8').read()+'\n'+open('site/spc.js',encoding='utf-8').read()+'\n'+open('site/hysum.js',encoding='utf-8').read()+'\n'+(open('site/teach_data.js',encoding='utf-8').read() if os.path.exists('site/teach_data.js') else '')+'\n'+open('site/teach.js',encoding='utf-8').read()+'\n'+open('site/flash_data.js',encoding='utf-8').read()+'\n'+open('site/flash.js',encoding='utf-8').read()+'\n',1)
extra=open('site/extra.css',encoding='utf-8').read()
SRC=lambda fn,text=None:f'{fn}?v={hashlib.md5((text.encode() if text is not None else open(os.path.join(OUT,fn),"rb").read())).hexdigest()[:10]}'
TAG=lambda src:f'<script src="{src}" onerror="{LOADERR}"></script>\n'
wtags=''.join(TAG(SRC(fn)) for fn in wsrc)
if SPLIT and not PACK:   # website: the page holds only its shell, so an extension that scans page text on every DOM change has almost nothing to read (the app code left inline still cost ~2 s per page switch, 4 Nov 2026)
    os.makedirs(OUT,exist_ok=True); k=head.index('<style>')+len('<style>'); css=head[k:]+'\n'+extra
    core='\n'.join(x for x in js if not x.startswith('const BUILD='))+'\n'   # BUILD stays in the page so core_site.js only changes when its content does
    for fn,txt in (('site.css',css),('core_site.js',core),('app_site.js',appjs+'\n')): open(os.path.join(OUT,fn),'w',encoding='utf-8').write(txt)
    build=[x for x in js if x.startswith('const BUILD=')][0]
    # lazy wards (9 Nov 2026): the page loads only core + app; each ward's data_<ward>*.js is fetched when that ward is opened, so the ward list shows at once on phones
    # (all wards together were ~44 MB of script = ~11 MB download + parsing everything before the first screen). WCOUNT = question counts for the ward list, from node if available.
    wsrcj={wid:{k:[{'u':SRC(fn),'s':os.path.getsize(os.path.join(OUT,fn))} for fn in fs_] for k,fs_ in parts.items()} for wid,parts in wmap.items()}
    lazy='const WSRC='+json.dumps(wsrcj)+';const WCOUNT='+json.dumps(wcount)+';'
    # service worker (sw.js next to the page): versioned files (?v=) come from this phone's cache after the first visit; the page itself always asks the network first
    open(os.path.join(OUT,'sw.js'),'w',encoding='utf-8').write(open('site/sw.js',encoding='utf-8').read())
    out=(head[:head.index('<style>')]+f'<link rel="stylesheet" href="{SRC("site.css",css)}">\n</head>\n<body>\n'
         +body.replace('/*TITLE*/',html.escape(title))
         +'\n<script>'+build+lazy+'</script>\n'+TAG(SRC('core_site.js',core))+TAG(SRC('app_site.js',appjs+'\n'))
         +'<script>if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost"))addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));</script>\n'
         +'</body>\n</html>\n')
else:
    out=(head+'</style>\n<style>\n'+extra+'</style>\n</head>\n<body>\n'
         +body.replace('/*TITLE*/',html.escape(title))
         +'\n<script>\n'+'\n'.join(js)+'\n</script>\n'+wtags+'<script>\n'+appjs+'\n</script>\n</body>\n</html>\n')
out=re.sub(r'<title>.*?</title>','<title>'+html.escape(cfg.get('title',title))+'</title>',out,count=1,flags=re.S)
os.makedirs(os.path.join(OUT,'img'),exist_ok=True)
open(os.path.join(OUT,'index.html'),'w',encoding='utf-8').write(out)
open(os.path.join(OUT,'.nojekyll'),'w').close()
if not PACK and not WEBSPR:
    for k,f in imgs.items(): shutil.copy(J(f),os.path.join(OUT,f))
print('built',os.path.join(OUT,'index.html'),len(out.encode()),'bytes,',len(imgs),'images'+(' in %d sprite sheets'%len(set(v['p'] for v in packs.values())) if packs else ''))
