"""ถอดข้อความจาก PDF เล่มเหลือง (ฟอนต์ไทยเข้ารหัสเลื่อน) — ใช้: python3 -I dec.py PAGE
ช่วยพิมพ์เท่านั้น: ตัว ข และบางตัวหายเป็นช่องว่าง ต้องดูภาพประกอบเสมอ"""
import sys,subprocess,re
PDF='/mnt/user-data/uploads/Approach_algorithm_เล_มเหล_อง.pdf'
SPECIAL={0x6e:'่',0x6f:'้',0x70:'๊',0x71:'๋',0x72:'์'}
def shift(s):
    r=[]
    for ch in s:
        o=ord(ch)
        if ch==' ': r.append(' '); continue
        if o in SPECIAL: r.append(SPECIAL[o]); continue
        t=o+29
        if t<0x80: r.append(chr(t)); continue
        if 0xDE<=t<=0xEA: t+=2
        elif t==0xEB: t=0xED
        try: r.append(bytes([t]).decode('tis-620'))
        except Exception: r.append('?')
    return ''.join(r)
pg=sys.argv[1]
t=subprocess.run(['pdftotext','-f',pg,'-l',pg,'-layout',PDF,'-'],capture_output=True,text=True).stdout
for line in t.split('\n'):
    if not line.strip(): continue
    if re.search(r'[ -ÿ]',line) or re.search(r'[A-Z][a-z]?\\|[0-9A-Z]{4}[a-z]{0,2}[A-Z]{3}',line):
        print(re.sub(r' {3,}','   ',shift(line)).replace('ํา','ำ'))
    else: print(re.sub(r' {3,}','   ',line))
