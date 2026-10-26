#!/usr/bin/env python3
"""รวมผลแปลงตำราอาการวิทยา → เว็บโพยหมอ

ใช้:  python3 tools/symp/build.py [โฟลเดอร์ผลลัพธ์ = /home/claude/symp/out]
  - คัดลอก chNN.json (ย่อขนาด) → docs/symp/chNN.json
  - คัดลอกรูปที่ใช้จริง → docs/symp/img/
  - สร้าง docs/data/symp.js (รายการบท + กลุ่มระบบ) และ docs/symp/search.json (ค้นทุกบท)
"""
import json, os, re, shutil, sys, time, html

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/symp/out'
DOCS = os.path.join(ROOT, 'docs')
OUT = os.path.join(DOCS, 'symp')

BOOK = {
    'title': 'ตำราอายุรศาสตร์ อาการวิทยา',
    'by': 'ภาควิชาอายุรศาสตร์ คณะแพทยศาสตร์ศิริราชพยาบาล',
    'ed': 'พิมพ์ครั้งที่ 3 (ฉบับปรับปรุงใหม่) พ.ศ. 2559',
    'inst': 'si'
}
GROUPS = [
    ('base', 'พื้นฐานการดูแลผู้ป่วย', '#7A5C3E', [1, 2]),
    ('gen', 'อาการทั่วไป · ภาวะเร่งด่วน', '#A44A2A', [7, 10, 39, 40, 44]),
    ('neuro', 'ระบบประสาท · ความคิด · การนอน', '#3C4A7A', [3, 4, 6, 31, 32, 33, 34, 35, 36, 37, 38]),
    ('cvr', 'หัวใจ · ทรวงอก · การหายใจ', '#9B3B4A', [5, 12, 13, 14, 15, 16]),
    ('gi', 'ทางเดินอาหาร · ตับ', '#5C7F3A', [9, 17, 18, 19, 20, 21, 22, 23]),
    ('heme', 'เลือด · ต่อมน้ำเหลือง', '#8A3D22', [8, 11, 24]),
    ('kub', 'ไต · ทางเดินปัสสาวะ · อวัยวะเพศ', '#2F7466', [25, 26, 27, 28, 42, 43]),
    ('msk', 'กระดูก · ข้อ · ผิวหนัง', '#C9952E', [29, 30, 41]),
]
GOF = {n: g[0] for g in GROUPS for n in g[3]}


def strip(h):
    t = re.sub(r'<br\s*/?>|</(p|li|tr|h4|h5|div|figcaption)>', '\n', h or '')
    t = re.sub(r'</t[dh]>', ' · ', t)
    t = re.sub(r'<[^>]+>', '', t)
    t = html.unescape(t)
    return re.sub(r'[ \t]+', ' ', re.sub(r'\n\s*\n+', '\n', t)).strip()


def main():
    os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)
    chapters, search, used = [], [], set()
    for f in sorted(os.listdir(SRC)):
        m = re.match(r'ch(\d\d)\.json$', f)
        if not m: continue
        d = json.load(open(os.path.join(SRC, f), encoding='utf-8'))
        no = d['no']
        raw = json.dumps(d, ensure_ascii=False)
        imgs = sorted(set(re.findall(r'symp/img/([\w-]+\.webp)', raw)) | {fl['img'] for fl in d.get('flows', []) if fl.get('img')})
        for im in imgs:
            shutil.copy2(os.path.join(SRC, 'img', im), os.path.join(OUT, 'img', im)); used.add(im)
        with open(os.path.join(OUT, f), 'w', encoding='utf-8') as w:
            json.dump(d, w, ensure_ascii=False, separators=(',', ':'))
        n = 0

        def walk(secs, path):
            nonlocal n
            for s in secs:
                n += 1
                search.append({'c': no, 's': s['id'], 'h': ' › '.join(path + [s['h']]), 'x': strip(s.get('html', ''))})
                walk(s.get('sub') or [], path + [s['h']])
        walk(d['sections'], [])
        for fl in d.get('flows', []):
            search.append({'c': no, 's': '', 'f': fl['id'], 'h': 'Algorithm › ' + fl['title'],
                           'x': ' · '.join(strip(x.get('t', '')) + (' ' + strip(x['d']) if x.get('d') else '') for x in fl['nodes'])})
        chapters.append({'no': no, 'id': d['id'], 'th': d['th'], 'en': d['en'], 'pages': d['pages'], 'g': GOF.get(no, 'gen'),
                         'file': f, 'n': n, 'f': len(d.get('flows', [])), 'i': len(imgs),
                         'kb': round(os.path.getsize(os.path.join(OUT, f)) / 1024)})
    # ลบรูปเก่าที่ไม่ได้ใช้แล้ว
    for im in os.listdir(os.path.join(OUT, 'img')):
        if im not in used: os.remove(os.path.join(OUT, 'img', im))
    chapters.sort(key=lambda c: c['no'])
    v = int(time.time())
    meta = {'v': v, 'book': BOOK, 'total': 44,
            'groups': [{'id': g[0], 't': g[1], 'c': g[2], 'ch': g[3]} for g in GROUPS], 'chapters': chapters}
    with open(os.path.join(DOCS, 'data', 'symp.js'), 'w', encoding='utf-8') as w:
        w.write('/* Clinic › Symptomatology & Approach — สร้างอัตโนมัติด้วย tools/symp/build.py (อย่าแก้ด้วยมือ)\n'
                '   เนื้อหาแต่ละบทอยู่ใน docs/symp/chNN.json · รูปใน docs/symp/img/ */\n')
        w.write('window.POY_SYMP = ' + json.dumps(meta, ensure_ascii=False, indent=1) + ';\n')
    with open(os.path.join(OUT, 'search.json'), 'w', encoding='utf-8') as w:
        json.dump(search, w, ensure_ascii=False, separators=(',', ':'))
    ih = os.path.join(DOCS, 'index.html'); h = open(ih, encoding='utf-8').read()
    h2 = re.sub(r'data/symp\.js\?v=\d+', 'data/symp.js?v=%d' % v, h)
    if h2 != h: open(ih, 'w', encoding='utf-8').write(h2)
    print('บท', len(chapters), '· รูป', len(used), '· search', round(os.path.getsize(os.path.join(OUT, 'search.json')) / 1024), 'KB · v', v)


if __name__ == '__main__':
    main()
