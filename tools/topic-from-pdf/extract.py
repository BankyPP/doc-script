import sys; sys.path.insert(0,'/home/claude/scripts'); import cidpatch
import pdfplumber, json, re, collections
SRC=sys.argv[1]; OUT=sys.argv[2]
pdf=pdfplumber.open(SRC)
MK='ัิ-ฺ็-๎'
def clean(t):
    t=t.replace('\x00','')
    t=re.sub(r'(?<=[%s])[ \t]+(?=[ก-๛])'%MK,'',t)
    t=re.sub(r'(?<=[ก-๛])[ \t]+(?=[%sะาำๅ])'%MK,'',t)
    t=re.sub(r'(?<=[ก-ฮ])[ \t]+(?=[่-๋])','',t)
    t=t.replace('ํา','ำ')
    t=re.sub(r'([่-๋])ํ','ํ\\1',t).replace('ํ่า','่ำ').replace('ํ้า','้ำ')
    t=re.sub(r'(?<![A-Za-z\u03b2])-lactam','β-lactam',t)
    t=re.sub(r'[ \t]{2,}',' ',t)
    return '\n'.join(l.strip() for l in t.split('\n') if l.strip())
def txt(page,bb,kanit=False):
    W,H=float(page.width),float(page.height)
    bb=(max(0,bb[0]),max(0,bb[1]),min(W,bb[2]),min(H,bb[3]))
    c=page.crop(bb)
    if kanit: c=c.filter(lambda o: o.get('object_type')!='char' or 'Kanit' in o.get('fontname',''))
    return clean(c.extract_text(use_text_flow=True,x_tolerance=1.5) or '')
def inside(a,b): return a!=b and a[0]>=b[0]-1 and a[1]>=b[1]-1 and a[2]<=b[2]+1 and a[3]<=b[3]+1
def icons(p):
    out=[]
    cs=p.curves; ls=p.lines+p.rects
    def sq(o,lo,hi): w=o['x1']-o['x0']; h=o['bottom']-o['top']; return lo<w<hi and lo<h<hi and abs(w-h)<1.5
    circ=[c for c in cs if sq(c,6.8,12.8) and len(c['pts'])<=8]
    def inn(o,c): return o is not c and o['x0']>=c['x0']-.5 and o['x1']<=c['x1']+.5 and o['top']>=c['top']-.5 and o['bottom']<=c['bottom']+.5
    used=set()
    for c in circ:
        inner=[o for o in cs+ls if inn(o,c) and (o['x1']-o['x0'])<c['x1']-c['x0']-1.5]
        if not inner: continue
        for o in inner: used.add(id(o))
        sym='\u2295' if any((o['bottom']-o['top'])>2.5 for o in inner) else '\u2296'
        out.append(((c['x0']+c['x1'])/2,(c['top']+c['bottom'])/2,sym,c))
    for c in cs:
        if id(c) in used or not sq(c,4.5,7.2) or len(c['pts'])!=11: continue
        if any(inn(c,o) for o in circ): continue
        out.append(((c['x0']+c['x1'])/2,(c['top']+c['bottom'])/2,'\u2605',c))
    ded=[]
    for o in out:
        if not any(abs(o[0]-d[0])<3.5 and abs(o[1]-d[1])<3.5 for d in ded): ded.append(o)
    out=ded
    chars=p.chars
    for cx,cy,sym,c in out:
        best=None
        for k,ch in enumerate(chars):
            if abs((ch['top']+ch['bottom'])/2-cy)<4 and ch['x1']<=cx+1 and cx-ch['x1']<14:
                if best is None or ch['x1']>chars[best]['x1']: best=k
        base=chars[best] if best is not None else None
        fake=dict(base) if base else {'fontname':'icon','size':7,'upright':True,'adv':0,'matrix':(1,0,0,1,0,0),'stroking_color':None,'non_stroking_color':None,'page_number':p.page_number,'object_type':'char','doctop':0}
        fake.update({'text':' '+sym if base else sym,'x0':c['x0'],'x1':c['x1'],'top':c['top'],'bottom':c['bottom'],'y0':p.height-c['bottom'],'y1':p.height-c['top'],'width':c['x1']-c['x0'],'height':c['bottom']-c['top'],'fontname':(base or {}).get('fontname','icon')})
        if best is None: continue
        chars.insert(best+1,fake)
pages=[]
for i,p in enumerate(pdf.pages):
    W,H=float(p.width),float(p.height)
    icons(p)
    fr=sorted({(round(c['x0'],1),round(c['top'],1),round(c['x1'],1),round(c['bottom'],1)) for c in p.curves if c['x1']-c['x0']>100 and c['bottom']-c['top']>40})
    top=[f for f in fr if not any(inside(f,g) for g in fr)]
    top.sort(key=lambda f:(f[1]>600, f[0]))
    head_t=txt(p,(0,0,W,46),kanit=True).split('\n')
    title=re.sub(r'^\d+\s*/\s*20\s*','',head_t[0]).strip()
    P={'n':i+1,'title':title,'sub':' '.join(head_t[1:]).strip(),'cols':[]}
    if not top:  # self-test pages: 5 plain columns
        cov=collections.Counter()
        for c in p.chars:
            if c['top']<50: continue
            for x in range(int(c['x0']),int(c['x1'])+1): cov[x]+=1
        gaps=[x for x in range(30,1170) if cov[x]==0 and cov[x-1]>0]
        xs=[18]+[g+4 for g in gaps]+[1173]
        for a,b in zip(xs,xs[1:]):
            P['cols'].append({'head':'','bb':[a/W,48/H,(b-a)/W,(816-48)/H],'boxes':[],'text':txt(p,(a,48,b,820))})
    for col in top:
        kids=[b for b in fr if inside(b,col) and abs(b[0]-col[0]-6.5)<4 and abs(col[2]-b[2]-6.5)<4]
        kids=[b for b in kids if not any(inside(b,k) for k in kids)]
        kids.sort(key=lambda b:b[1])
        tall=col[3]-col[1]>400
        C={'head':txt(p,(col[0],col[1],col[2],col[1]+24)).replace('\n',' ') if tall else '', 'bb':[col[0]/W,col[1]/H,(col[2]-col[0])/W,(col[3]-col[1])/H],'boxes':[]}
        if tall and kids:
            for b in kids:
                C['boxes'].append({'title':txt(p,(b[0],b[1],b[2],b[1]+16),kanit=True).split('\n')[0].strip(),'bb':[b[0]/W,b[1]/H,(b[2]-b[0])/W,(b[3]-b[1])/H],'text':txt(p,b)})
        elif tall:
            C['text']=txt(p,col)
        else:  # standalone small frame = a box
            C['boxes'].append({'title':txt(p,(col[0],col[1],col[2],col[1]+16),kanit=True).split('\n')[0].strip(),'bb':C['bb'],'text':txt(p,col)})
        P['cols'].append(C)
    pages.append(P)
json.dump(pages,open(OUT,'w'),ensure_ascii=False,indent=1)
for P in pages:
    print(P['n'],P['title'],'|',P['sub'])
    for C in P['cols']:
        print('   [',C['head'][:60],']',[B['title'][:40] for B in C['boxes']], len(C.get('text','')))
