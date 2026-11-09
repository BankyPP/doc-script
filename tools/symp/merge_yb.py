#!/usr/bin/env python3
"""รวมตำราศิริราช + เล่มเหลือง (+ ส่วนที่ Claude เพิ่ม) เป็นบทของ Symptomatology & Approach

ใช้:  python3 tools/symp/merge_yb.py [โฟลเดอร์ผลลัพธ์ = /home/claude/symp/out]
      แล้ว  python3 tools/symp/build.py <โฟลเดอร์เดียวกัน>

ต้นทาง (อยู่ใน repo ทั้งหมด จึงรันซ้ำได้เสมอ):
  tools/symp/si/chNN.json   ตำราศิริราช 44 บท ฉบับเดิม (อย่าแก้ — แก้เนื้อหาศิริราชที่นี่ได้ถ้าจำเป็น)
  tools/symp/yb/yb-*.json   เล่มเหลือง หนึ่งไฟล์ต่อหัวข้อ (+ รูป yb/img/) — รูปแบบใน /home/claude/yb/BRIEF.md
  tools/symp/bb/bb-NNN.json Blackbook หนึ่งไฟล์ต่อ presentation (+ รูป bb/img/) — target เป็น id บท (string) ได้ · รูปแบบใน tools/symp/bb-tools/BRIEF.md
  tools/symp/tn/*.json      เอกสารคำสอนของอาจารย์ หนึ่งไฟล์ต่อเรื่อง (+ รูป tn/img/) — รูปแบบเดียวกับไฟล์เล่มเหลือง + "ref" = ชื่ออ้างอิง
  tools/symp/ts/*.json      เอกสารคำสอน Dysnatremia (สุชาย ศรีทิพยวรรณ) — รูปแบบเดียวกับ tn (+ รูป ts/img/) · เอกสารของอาจารย์อีกคน = เพิ่ม book key ใหม่แบบเดียวกัน
  tools/symp/ai/*.json      เนื้อหาที่ Claude เขียนเพิ่ม (รูปแบบเดียวกับไฟล์เล่มเหลือง + "book": "ai")
  รูปของศิริราชเอาจาก docs/symp/img/ (ชื่อ chNN-fK.webp)

ผล: <out>/chNN.json + <out>/img/
  - หัวข้อที่มีเนื้อหาหลายเล่ม: เนื้อหาแต่ละเล่มห่อใน <div class="sb si|yb|ai"> (เว็บติดป้ายที่มาให้ทุกก้อน)
  - ทุก section/sub มี "src" = ที่มาของทุกอย่างในหัวข้อนั้น (รวมหัวข้อย่อย) · ทุก flow มี "book"
  - บทมี "b": {si:{no,pages}, yb:[{k,o,p}], ai:1} และ "g" (กลุ่มระบบ)
"""
import json, os, re, shutil, sys, copy, html

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
T = os.path.join(ROOT, 'tools', 'symp')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/symp/out'
SI_IMG = os.path.join(ROOT, 'docs', 'symp', 'img')
ORDER = ['si', 'yb', 'bb', 'tn', 'ts', 'ai']
TEACH = ('tn', 'ts')   # เอกสารคำสอน (แต่ละอาจารย์ = book key ของตัวเอง)
BOOK_RANK = {'yb': 0, 'bb': 1, 'tn': 2, 'ts': 3, 'ai': 4}


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
        if re.match(r'ch\d{2,3}\.json$', f): os.remove(os.path.join(OUT, f))
    for im in os.listdir(SI_IMG):
        if im.startswith('ch'): shutil.copy2(os.path.join(SI_IMG, im), os.path.join(OUT, 'img', im))
    for im in os.listdir(os.path.join(T, 'yb', 'img')):
        shutil.copy2(os.path.join(T, 'yb', 'img', im), os.path.join(OUT, 'img', im))
    if os.path.isdir(os.path.join(T, 'bb', 'img')):
        for im in os.listdir(os.path.join(T, 'bb', 'img')): shutil.copy2(os.path.join(T, 'bb', 'img', im), os.path.join(OUT, 'img', im))
    for k in TEACH + ('ai',):
        if os.path.isdir(os.path.join(T, k, 'img')):
            for im in os.listdir(os.path.join(T, k, 'img')): shutil.copy2(os.path.join(T, k, 'img', im), os.path.join(OUT, 'img', im))

    chaps = {}
    for f in sorted(os.listdir(os.path.join(T, 'si'))):
        m = re.match(r'ch(\d\d)\.json$', f)
        if not m: continue
        d = json.load(open(os.path.join(T, 'si', f), encoding='utf-8'))
        d['b'] = {'si': {'no': d['no'], 'pages': d['pages']}}
        for fl in d.get('flows', []): fl.setdefault('book', 'si')
        chaps[d['no']] = d

    tops = load(os.path.join(T, 'yb'), 'yb') + load(os.path.join(T, 'bb'), 'bb') + sum((load(os.path.join(T, k), k) for k in TEACH), []) + load(os.path.join(T, 'ai'), 'ai')
    tops.sort(key=lambda t: (BOOK_RANK[t['_book']], key_order(t['key'])))
    byid = {d['id']: d for d in chaps.values()}
    bb_order = {t['key']: i + 1 for i, t in enumerate(x for x in tops if x['_book'] == 'bb')}
    nxt = max(chaps) + 1
    yb_order = {t['key']: i + 1 for i, t in enumerate(x for x in tops if x['_book'] == 'yb')}
    newc = {}
    added = {}
    for t in tops:
        b = t['_book']
        flows = copy.deepcopy(t.get('flows', []))
        for fl in flows:
            fl['book'] = b
            for e in fl.get('edges', []):   # ป้ายลูกศรเว็บ escape เอง → เก็บเป็นข้อความดิบ (กัน &lt; ซ้อน)
                if e.get('l'): e['l'] = html.unescape(e['l'])
        if b == 'bb':
            ref = {'k': 'หน้า ' + str(t.get('bookpg') or int(t['key'])), 'o': bb_order.get(t['key'], 0), 'p': t.get('pdf', '')}
        elif b in TEACH:
            ref = {'k': t.get('ref') or t['en'], 'o': 0, 'p': t.get('pdf', '')}
        else:
            ref = {'k': t['key'].replace('-', '.') if t['key'] not in ('abd', 'abbr', '0') else {'abd': 'หน้าแทรก abdominal pain', 'abbr': 'ภาคผนวก', '0': 'ปก/สารบัญ'}[t['key']],
                   'o': yb_order.get(t['key'], 0), 'p': t.get('pdf', '')}
        tg = t.get('target')
        if not tg and t.get('new') and t['new']['id'] in byid:   # บทใหม่ id ซ้ำกับบทที่มีแล้ว → ต่อท้ายบทนั้น
            tg = t['new']['id']; t = dict(t, ops=[dict(op='sec', after=None, **{k: v for k, v in s.items()}) for s in t['sections']])
        if tg:
            d = byid[tg] if isinstance(tg, str) else chaps[tg]
            if b in ('yb', 'bb') + TEACH: d['b'].setdefault(b, []).append(ref)
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
                    else:   # วางหลัง a — ถ้ามีหัวข้อที่เพิ่มไว้หลัง a แล้ว ให้ต่อท้ายกลุ่มนั้น (คงลำดับเล่มเหลือง)
                        ids = [x['id'] for x in d['sections']]
                        i = ids.index(a) + 1
                        while i < len(ids) and ids[i] in added.get(d['id'], ()): i += 1
                        d['sections'].insert(i, n)
                    added.setdefault(d['id'], set()).add(n['id'])
        else:
            n = t['new']
            secs = copy.deepcopy(t['sections']); mark(secs, b)
            d = {'no': nxt, 'id': n['id'], 'th': n['th'], 'en': n['en'], 'pages': '', 'g': n['g'],
                 'b': {b: [ref]} if b in ('yb', 'bb') + TEACH else {'ai': 1}, 'sections': secs, 'flows': flows}
            chaps[nxt] = d; byid[d['id']] = d; newc[nxt] = t['_f']; nxt += 1
    for no, d in chaps.items():
        finalize(d['sections'], [k for k in ORDER if k in d['b']][0])
        with open(os.path.join(OUT, 'ch%02d.json' % no), 'w', encoding='utf-8') as w:
            json.dump(d, w, ensure_ascii=False, indent=1)
    print('บท', len(chaps), '· บทใหม่', len(newc), '· หัวข้อเล่มเหลือง', sum(1 for t in tops if t['_book'] == 'yb'), '· Blackbook', sum(1 for t in tops if t['_book'] == 'bb'), '· ส่วน Claude', sum(1 for t in tops if t['_book'] == 'ai'))
    for no, f in newc.items(): print('  ch%02d ← %s' % (no, f))


if __name__ == '__main__':
    main()
