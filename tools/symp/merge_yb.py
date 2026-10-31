#!/usr/bin/env python3
"""รวมตำราศิริราช + เล่มเหลือง (+ ส่วนที่ Claude เพิ่ม) เป็นบทของ Symptomatology & Approach

ใช้:  python3 tools/symp/merge_yb.py [โฟลเดอร์ผลลัพธ์ = /home/claude/symp/out]
      แล้ว  python3 tools/symp/build.py <โฟลเดอร์เดียวกัน>

ต้นทาง (อยู่ใน repo ทั้งหมด จึงรันซ้ำได้เสมอ):
  tools/symp/si/chNN.json   ตำราศิริราช 44 บท ฉบับเดิม (อย่าแก้ — แก้เนื้อหาศิริราชที่นี่ได้ถ้าจำเป็น)
  tools/symp/yb/yb-*.json   เล่มเหลือง หนึ่งไฟล์ต่อหัวข้อ (+ รูป yb/img/) — รูปแบบใน /home/claude/yb/BRIEF.md
  tools/symp/ai/*.json      เนื้อหาที่ Claude เขียนเพิ่ม (รูปแบบเดียวกับไฟล์เล่มเหลือง + "book": "ai")
  รูปของศิริราชเอาจาก docs/symp/img/ (ชื่อ chNN-fK.webp)

ผล: <out>/chNN.json + <out>/img/
  - หัวข้อที่มีเนื้อหาหลายเล่ม: เนื้อหาแต่ละเล่มห่อใน <div class="sb si|yb|ai"> (เว็บติดป้ายที่มาให้ทุกก้อน)
  - ทุก section/sub มี "src" = ที่มาของทุกอย่างในหัวข้อนั้น (รวมหัวข้อย่อย) · ทุก flow มี "book"
  - บทมี "b": {si:{no,pages}, yb:[{k,o,p}], ai:1} และ "g" (กลุ่มระบบ)
"""
import json, os, re, shutil, sys, copy

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
T = os.path.join(ROOT, 'tools', 'symp')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/symp/out'
SI_IMG = os.path.join(ROOT, 'docs', 'symp', 'img')
ORDER = ['si', 'yb', 'ai']


def key_order(k):
    """ลำดับหัวข้อในเล่มเหลือง: 0, 1-1 … 9-4-2 … 10-2, abd อยู่ต้นหมวด 3, abbr ท้ายเล่ม"""
    if k == 'abd': return (3, 0)
    if k == 'abbr': return (99,)
    if k == '0': return (0,)
    try: return tuple(int(x) for x in k.split('-'))
    except ValueError: return (98, k)


def load(folder, book):
    L = []
    if not os.path.isdir(folder): return L
    for f in sorted(os.listdir(folder)):
        if not f.endswith('.json'): continue
        d = json.load(open(os.path.join(folder, f), encoding='utf-8'))
        d['_book'] = d.get('book', book); d['_f'] = f
        L.append(d)
    return L


def wrap(h, b):
    return '<div class="sb %s">%s</div>' % (b, h)


def own_src(s, default):
    return s.get('_own') or [default]


def finalize(secs, default):
    """คำนวณ src (รวมหัวข้อย่อย) + ห่อเนื้อหาของตัวเองเมื่อหัวข้อนั้นมีหลายเล่ม"""
    for s in secs:
        own = s.pop('_own', None) or [default]
        kids = finalize(s.get('sub') or [], default)   # หัวข้อย่อยเดิมเป็นของเล่มต้นทางของบท · หัวข้อย่อยที่เพิ่มใหม่ถูก mark ไว้แล้ว
        allb = sorted(set(own) | set(kids), key=ORDER.index)
        h = s.get('html') or ''
        if h and len(allb) > 1 and not h.startswith('<div class="sb '):
            s['html'] = wrap(h, own[0])
        s['src'] = allb
    return sorted({b for s in secs for b in s['src']}, key=ORDER.index)


def mark(secs, b):
    for s in secs:
        s['_own'] = [b]
        mark(s.get('sub') or [], b)


def find(secs, sid):
    for s in secs:
        if s['id'] == sid: return s
        r = find(s.get('sub') or [], sid)
        if r: return r
    return None


def main():
    os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)
    for f in os.listdir(OUT):
        if re.match(r'ch\d\d\.json$', f): os.remove(os.path.join(OUT, f))
    for im in os.listdir(SI_IMG):
        if im.startswith('ch'): shutil.copy2(os.path.join(SI_IMG, im), os.path.join(OUT, 'img', im))
    for im in os.listdir(os.path.join(T, 'yb', 'img')):
        shutil.copy2(os.path.join(T, 'yb', 'img', im), os.path.join(OUT, 'img', im))
    if os.path.isdir(os.path.join(T, 'ai', 'img')):
        for im in os.listdir(os.path.join(T, 'ai', 'img')): shutil.copy2(os.path.join(T, 'ai', 'img', im), os.path.join(OUT, 'img', im))

    chaps = {}
    for f in sorted(os.listdir(os.path.join(T, 'si'))):
        m = re.match(r'ch(\d\d)\.json$', f)
        if not m: continue
        d = json.load(open(os.path.join(T, 'si', f), encoding='utf-8'))
        d['b'] = {'si': {'no': d['no'], 'pages': d['pages']}}
        for fl in d.get('flows', []): fl.setdefault('book', 'si')
        chaps[d['no']] = d

    tops = load(os.path.join(T, 'yb'), 'yb') + load(os.path.join(T, 'ai'), 'ai')
    tops.sort(key=lambda t: (t['_book'] != 'yb', key_order(t['key'])))
    nxt = max(chaps) + 1
    yb_order = {t['key']: i + 1 for i, t in enumerate(x for x in tops if x['_book'] == 'yb')}
    newc = {}
    for t in tops:
        b = t['_book']
        flows = copy.deepcopy(t.get('flows', []))
        for fl in flows: fl['book'] = b
        ref = {'k': t['key'].replace('-', '.') if t['key'] not in ('abd', 'abbr', '0') else {'abd': 'หน้าแทรก abdominal pain', 'abbr': 'ภาคผนวก', '0': 'ปก/สารบัญ'}[t['key']],
               'o': yb_order.get(t['key'], 0), 'p': t.get('pdf', '')}
        if t.get('target'):
            d = chaps[t['target']]
            if b == 'yb': d['b'].setdefault('yb', []).append(ref)
            else: d['b']['ai'] = 1
            d['flows'] = d.get('flows', []) + flows
            for op in t['ops']:
                o = op['op']
                if o == 'append':
                    s = find(d['sections'], op['sec'])
                    own = s.get('_own') or ['si']
                    h = s.get('html') or ''
                    if h and not h.startswith('<div class="sb '): h = wrap(h, own[0])
                    s['html'] = h + wrap(op['html'], b)
                    s['_own'] = sorted(set(own) | {b}, key=ORDER.index)
                    if not h: s['_own'] = [b]
                elif o == 'sub':
                    s = find(d['sections'], op['sec'])
                    n = {k: op[k] for k in ('id', 'h', 'html', 'sub') if op.get(k)}
                    mark([n], b)
                    s.setdefault('sub', []).append(n)
                elif o == 'sec':
                    n = {k: op[k] for k in ('id', 'h', 'html', 'sub') if op.get(k)}
                    mark([n], b)
                    a = op.get('after')
                    if a == '^': d['sections'].insert(0, n)
                    elif a is None: d['sections'].append(n)
                    else:
                        i = [x['id'] for x in d['sections']].index(a)
                        d['sections'].insert(i + 1, n)
        else:
            n = t['new']
            secs = copy.deepcopy(t['sections']); mark(secs, b)
            d = {'no': nxt, 'id': n['id'], 'th': n['th'], 'en': n['en'], 'pages': '', 'g': n['g'],
                 'b': {'yb': [ref]} if b == 'yb' else {'ai': 1}, 'sections': secs, 'flows': flows}
            chaps[nxt] = d; newc[nxt] = t['_f']; nxt += 1
    for no, d in chaps.items():
        finalize(d['sections'], 'si' if 'si' in d['b'] else ('yb' if 'yb' in d['b'] else 'ai'))
        with open(os.path.join(OUT, 'ch%02d.json' % no), 'w', encoding='utf-8') as w:
            json.dump(d, w, ensure_ascii=False, indent=1)
    print('บท', len(chaps), '· บทใหม่', len(newc), '· หัวข้อเล่มเหลือง', sum(1 for t in tops if t['_book'] == 'yb'), '· ส่วน Claude', sum(1 for t in tops if t['_book'] == 'ai'))
    for no, f in newc.items(): print('  ch%02d ← %s' % (no, f))


if __name__ == '__main__':
    main()
