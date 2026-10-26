import json,re,sys
pages=json.load(open(sys.argv[1])); st=json.load(open(sys.argv[2])); out=sys.argv[3]
SHORT={1:'พื้นฐาน · Microbiology · Resistance · Bug → Drug',2:'Cell wall & envelope agents · Anti-anaerobe · ADR map',3:'Protein synthesis · DNA/Folate · UTI · GI · Parasites · STI · Respiratory',
4:'PK/PD · Dosing · Allergy · ADR · DI · Stewardship',5:'Resistance · MDR Rx · New agents · Clinical micro',6:'Antifungal · Antiviral · Anti-TB · Antimalarial · Prophylaxis',
7:'CNS · Eye · ENT · Respiratory',8:'GI · Hepatobiliary · GU/STI · Skin · Bone',9:'Sepsis · Neutropenia · IE · Tropical fever · Host/Exposure',
10:'Gram-positive · Gram-negative',11:'Anaerobe · Atypical · Spirochete · Mycobacteria · Fungi · Parasite · Virus',12:'Pediatrics & Neonates',13:'Surgery · Ortho · Trauma',
14:'Obstetrics & Gynecology',15:'Famous doses (adult + pediatric)',16:'ต้องจำก่อนสอบ (ฉบับเติม)',17:'Keyword bank',18:'Self-test ข้อ 1–66',19:'Self-test ข้อ 67–132',20:'Self-test ข้อ 133–198'}
GROUPS=[('basic','พื้นฐาน · ยาแต่ละกลุ่ม',[1,2,3]),('adv','Advanced (resident → fellow)',[4,5]),('other','Anti-infectives อื่น',[6]),
('syn','Syndrome → Bug → Drug',[7,8,9]),('bug','Bug → Drug',[10,11]),('ward','ตามวอร์ด: Peds · Sx · OB-GYN',[12,13,14]),
('dose','Famous doses',[15]),('hy','High-yield · Keyword bank',[16,17]),('test','Self-test 198 ข้อ',[18,19,20])]
def tj(t):  # join Thai across line breaks
    t=re.sub(r'(?<=[ก-๛])\n(?=[ก-๛])','',t)
    return t
P=[]
for p in pages:
    full=(p['title']+' '+p['sub']).strip()
    q={'n':p['n'],'t':SHORT[p['n']],'full':full,'cols':[]}
    for C in p['cols']:
        c={'h':C['head'],'bb':[round(x,5) for x in C['bb']],'boxes':[]}
        for B in C['boxes']:
            c['boxes'].append({'t':B['title'],'bb':[round(x,5) for x in B['bb']],'x':tj(B['text'])})
        if not C['boxes']: c['x']=tj(C.get('text',''))
        q['cols'].append(c)
    P.append(q)
for qq in st['qs']:
    for k in ('stem','explanation'): qq[k]=re.sub(r'(?<=[ก-๛]) (?=[ก-๛])','',qq[k]) if False else qq[k]
json.dump({'groups':[{'id':a,'t':b,'pages':c} for a,b,c in GROUPS],'pages':P},open(out+'/data.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(st,open(out+'/selftest.json','w'),ensure_ascii=False,separators=(',',':'))
