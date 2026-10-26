import json,re,sys
pages=json.load(open(sys.argv[1]))
txt='\n'.join(C.get('text','') for P in pages[17:20] for C in P['cols'])
HDR=[r'[①②③④⑤⑥⑦]?\s*ชุดเดิม \(self-test 20 ข้อ — ย่อคำอธิบาย\)',r'[①②③④⑤⑥⑦]?\s*Pharmacology · spectrum · ADR · DI · resistance',r'[①②③④⑤⑥⑦]?\s*Medicine · ER · Infectious diseases',
     r'[①②③④⑤⑥⑦]?\s*Pediatrics & Neonate',r'[①②③④⑤⑥⑦]?\s*Surgery · Ortho · Trauma',r'[①②③④⑤⑥⑦]?\s*OB-GYN',r'[①②③④⑤⑥⑦]?\s*Micro · resistance · guideline \(mixed\)']
SECS=[('ชุดเดิม (self-test 20 ข้อ)',1,20),('Pharmacology · spectrum · ADR · DI · resistance',21,65),('Medicine · ER · Infectious diseases',66,132),('Pediatrics & Neonate',133,153),('Surgery · Ortho · Trauma',154,166),('OB-GYN',167,187),('Micro · resistance · guideline (mixed)',188,198)]
def J(x): return re.sub(r'(?<=[\u0e01-\u0e5b])\n(?=[\u0e01-\u0e5b])','',x).replace('\n',' ')
parts=re.split(r'(?m)^(\d{1,3})\.\s',txt)
qs=[]
for i in range(1,len(parts),2):
    n=int(parts[i]); body=parts[i+1]
    m=re.search(r'(?s)^(.*?)\nตอบ\s+([A-E])\s*[—-]\s*(.*)$',body)
    q,ans,exp=m.groups()
    om=re.search(r'(?s)^(.*)(?:^|\s)A\.\s(.*?)\sB\.\s(.*?)\sC\.\s(.*?)\sD\.\s(.*?)\sE\.\s(.*)$',J(q))
    stem=om.group(1).strip(); opts=[x.strip() for x in om.groups()[1:]]
    exp=J(exp).strip()
    for h in HDR: exp=re.sub(r'\s*'+h+r'\s*$','',exp)
    sec=[k for k,(t,a,b) in enumerate(SECS) if a<=n<=b][0]
    qs.append({'n':n,'s':sec,'stem':stem,'options':opts,'answer':ans,'explanation':exp})
assert [q['n'] for q in qs]==list(range(1,199)),'order'
json.dump({'sections':[t for t,a,b in SECS],'qs':qs},open(sys.argv[2],'w'),ensure_ascii=False)
for n in (1,3,43,65,132,166,198): print(json.dumps(qs[n-1],ensure_ascii=False)[:400])
