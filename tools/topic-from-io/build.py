#!/usr/bin/env python3
"""Random Topic Summary แบบข้อความ (kind: 'html') จาก Round I/O ใน repo ac-mdcu — เนื้อหาเดียวกับ Round I/O เป๊ะ
ใช้: python3 tools/topic-from-io/build.py <ac-mdcu checkout> <topic id>
- อ่าน <ac>/<ward dir>/io.js → doc ตาม CONF → docs/topics/<id>/data.json + รูปใน docs/topics/<id>/img/
- html ของแต่ละหน้าคงเดิมทุกตัวอักษร เปลี่ยนแค่: คลาส → si-*, {{IMG:k}} → <img>, {{R:n}} → [n] ที่กดไปรายการอ้างอิงได้, id ของกล่อง
- กล่อง (div.box ชั้นบนสุด) = หน่วยเนื้อหา ใช้ให้ AI ออกโจทย์ + ค้น + ห้องฝึกใน Claude (cols[0].boxes เหมือนหัวข้อแบบภาพ)
แก้เนื้อหาที่ Round I/O แล้วรันใหม่ + เพิ่ม v ใน docs/data/topics.js"""
import json, os, re, shutil, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CONF = {
    'breast': {
        'ward': 'sx', 'dir': 'data', 'code': 'L11',
        'groups': [('เนื้อหาบท L11 (Round I/O เดิม + ส่วนเพิ่ม 12 พ.ย.)', range(1, 14)),
                   ('หน้าใหม่ · Classification (Repro II) · Radiotherapy (Nuc)', range(14, 16)),
                   ('High-yield · เคสแบบนี้ → manage ยังไง', range(16, 19))],
    }
}
SITE = 'https://bankypp.github.io/ac-mdcu/'

AC, TID = sys.argv[1], sys.argv[2]
C = CONF[TID]
js = "global.W={};require(process.argv[1]);process.stdout.write(JSON.stringify(W.IO))"
IO = json.loads(subprocess.check_output(['node', '-e', js, os.path.join(AC, C['dir'], 'io.js')]))
D = [d for d in IO['docs'] if d['code'] == C['code']][0]

OUT = os.path.join(ROOT, 'docs', 'topics', TID)
shutil.rmtree(os.path.join(OUT, 'img'), ignore_errors=True)
os.makedirs(os.path.join(OUT, 'img'))

KNOWN = {'iointro', 'imp', 'box', 'ref', 'flow', 'n', 'ar', 'fig', 'cap', 'warn', 'chip', 'd', 'mn', 'k', 'r', 'hw', 'vflow',
         'clash', 'x', 'mut', 'fx', 's', 'e', 'g', 'b', 'p', 'o', 'star', 'hl', 'two', 'sub2', 'cr', 'c-h', 'st'}


def pre(h):
    def f(m):
        cs = m.group(1).split()
        bad = [c for c in cs if c not in KNOWN]
        if bad: raise SystemExit('คลาสใหม่ที่ยังไม่มีสไตล์: %s' % bad)
        return 'class="' + ' '.join('si-' + c for c in cs) + '"'
    return re.sub(r'class="([^"]*)"', f, h)


def text(h):
    h = re.sub(r'<span class="si-ref">.*?</span>', '', h, flags=re.S)
    h = re.sub(r'<sup class="si-cite">.*?</sup>', '', h, flags=re.S)
    h = re.sub(r'<(br|/tr|/li|/p|/h3|/div)\b[^>]*>', '\n', h)
    h = re.sub(r'</t[dh]>', ' | ', h)
    h = re.sub(r'<[^>]+>', '', h)
    for a, b in (('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>'), ('&quot;', '"'), ('&nbsp;', ' ')): h = h.replace(a, b)
    h = re.sub(r'[ \t]+', ' ', h)
    return re.sub(r'\s*\n\s*', '\n', h).strip()


def top_divs(h):
    """ช่วง [start,end) ของ <div> ชั้นบนสุด"""
    out, depth, start = [], 0, None
    for m in re.finditer(r'<(/?)div\b[^>]*>', h):
        if not m.group(1):
            if depth == 0: start = m.start()
            depth += 1
        else:
            depth -= 1
            if depth == 0: out.append((start, m.end()))
    assert depth == 0
    return out


imgs = {f.rsplit('.', 1)[0]: f for f in os.listdir(os.path.join(AC, 'img'))}
pages, nimg, nref = [], 0, 0
for n, p in enumerate(D['pages'], 1):
    h = pre(p['html'])

    def img(m):
        global nimg
        f = imgs[m.group(1)]
        shutil.copyfile(os.path.join(AC, 'img', f), os.path.join(OUT, 'img', f))
        nimg += 1
        return '<img src="topics/%s/img/%s" alt="ภาพจากไฟล์ต้นฉบับ" loading="lazy">' % (TID, f)
    h = re.sub(r'\{\{IMG:([\w-]+)\}\}', img, h)

    def cite(m):
        out = []
        for k in [x.strip() for x in m.group(1).split(',') if x.strip()]:
            assert int(k) <= len(p.get('refs') or []), (p['id'], k)
            out.append('<sup class="si-cite"><a href="#" data-tref="%s">[%s]</a></sup>' % (k, k))
        return ''.join(out)
    h = re.sub(r'\{\{R:([\d,\s]+)\}\}', cite, h)
    assert '{{' not in h, p['id']

    boxes, parts, last, bi = [], [], 0, 0
    for s, e in top_divs(h):
        blk = h[s:e]
        m = re.match(r'<div class="(si-box[^"]*)">', blk)
        if m:
            key = '%d-0-%d' % (n, bi)
            blk = '<div class="%s" id="u%s">' % (m.group(1), key) + blk[m.end():]
            hm = re.search(r'<h3>(.*?)</h3>', blk, re.S)
            title = text(hm.group(1)) if hm else p['title']
            body = text(blk[hm.end():] if hm else blk)
            boxes.append({'t': title, 'x': body})
            bi += 1
        parts.append(h[last:s] + blk)
        last = e
    parts.append(h[last:])
    h = ''.join(parts)
    refs = []
    for r in p.get('refs') or []:
        u = r.get('u') or ''
        if u.startswith('#/'): u = SITE + u
        refs.append({'t': r['t'], 'u': u} if u else {'t': r['t']})
    nref += len(refs)
    pages.append({'n': n, 't': p['title'], 'id': p['id'], 'html': h, 'refs': refs, 'io': SITE + '#/' + C['ward'] + '/io/p/' + p['id'],
                  'cols': [{'h': '', 'boxes': boxes}]})

groups = [{'t': t, 'pages': list(r)} for t, r in C['groups']]
assert sorted(sum((g['pages'] for g in groups), [])) == list(range(1, len(pages) + 1))
data = {'kind': 'html', 'src': D['src'], 'legend': pre(D.get('legend') or ''), 'upd': D.get('upd', ''), 'groups': groups, 'pages': pages}
with open(os.path.join(OUT, 'data.json'), 'w', encoding='utf8') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
print('pages', len(pages), 'boxes', sum(len(p['cols'][0]['boxes']) for p in pages), 'img', nimg, 'refs', nref,
      'bytes', os.path.getsize(os.path.join(OUT, 'data.json')))
