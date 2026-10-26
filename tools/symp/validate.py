#!/usr/bin/env python3
"""ตรวจไฟล์บท /home/claude/symp/out/chNN.json
ใช้:  python3 -I /home/claude/symp/tools/validate.py 8 23      (ตรวจบท 8 และ 23)
"""
import json, os, re, sys
from html.parser import HTMLParser

OUT = '/home/claude/symp/out'
ALLOWED = {'p', 'ul', 'ol', 'li', 'b', 'i', 'u', 'sub', 'sup', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
           'figure', 'img', 'figcaption', 'div', 'span', 'h4', 'h5', 'small', 'mark', 'a'}
VOID = {'br', 'img'}
DIV_CLASSES = {'flow', 'box', 'pearl', 'warn', 'tbl'}
SPAN_CLASSES = {'en', 'hi', 'tag', 'up', 'down', 'muted'}
KINDS = {'start', 'q', 'act', 'dx', 'note', 'stop'}


class Chk(HTMLParser):
    def __init__(self, where, errs, flows_used, imgs):
        super().__init__(); self.where = where; self.errs = errs; self.stack = []; self.flows_used = flows_used; self.imgs = imgs

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag not in ALLOWED:
            self.errs.append('%s: แท็ก <%s> ไม่อนุญาต' % (self.where, tag))
        if tag == 'div':
            cls = a.get('class', '')
            if cls not in DIV_CLASSES:
                self.errs.append('%s: <div class="%s"> ไม่อนุญาต (ใช้ได้: %s)' % (self.where, cls, ', '.join(sorted(DIV_CLASSES))))
            if cls == 'flow':
                if not a.get('data-flow'): self.errs.append('%s: div.flow ต้องมี data-flow' % self.where)
                else: self.flows_used.append(a['data-flow'])
        if tag == 'span' and a.get('class', '') not in SPAN_CLASSES:
            self.errs.append('%s: <span class="%s"> ไม่อนุญาต' % (self.where, a.get('class', '')))
        if tag == 'img':
            src = a.get('src', '')
            m = re.match(r'^symp/img/([\w-]+\.webp)$', src)
            if not m: self.errs.append('%s: img src ต้องเป็น symp/img/<name>.webp (%s)' % (self.where, src))
            elif not os.path.exists(os.path.join(OUT, 'img', m.group(1))): self.errs.append('%s: ไม่พบไฟล์รูป %s' % (self.where, m.group(1)))
            else: self.imgs.append(m.group(1))
            if not a.get('alt'): self.errs.append('%s: img ต้องมี alt' % self.where)
        if 'style' in a: self.errs.append('%s: ห้ามใช้ style= (<%s>)' % (self.where, tag))
        if tag not in VOID: self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in VOID: return
        if not self.stack or self.stack[-1] != tag:
            self.errs.append('%s: ปิดแท็ก </%s> ไม่ตรง (เปิดค้าง: %s)' % (self.where, tag, self.stack[-3:]))
            if tag in self.stack:
                while self.stack and self.stack.pop() != tag: pass
        else: self.stack.pop()

    def close_check(self):
        if self.stack: self.errs.append('%s: แท็กไม่ได้ปิด %s' % (self.where, self.stack))


def textlen(h):
    return len(re.sub(r'<[^>]+>', '', h or ''))


def check(no):
    path = os.path.join(OUT, 'ch%02d.json' % no)
    errs = []
    if not os.path.exists(path): return ['ไม่พบ ' + path], {}
    try: d = json.load(open(path, encoding='utf-8'))
    except Exception as e: return ['JSON ผิด: %s' % e], {}
    for k in ('no', 'id', 'th', 'en', 'pages', 'sections', 'flows'):
        if k not in d: errs.append('ขาด key ' + k)
    if d.get('no') != no: errs.append('no ต้องเป็น %d' % no)
    if not re.match(r'^[a-z0-9-]+$', d.get('id', '')): errs.append('id ต้องเป็น a-z0-9-')
    ids = set(); flows_used = []; imgs = []; chars = 0; nsec = 0

    def walk(secs, where, depth):
        nonlocal chars, nsec
        if not isinstance(secs, list): errs.append(where + ': sections/sub ต้องเป็น list'); return
        for i, s in enumerate(secs):
            w = '%s[%d]' % (where, i)
            if not isinstance(s, dict) or 'h' not in s: errs.append(w + ': ต้องมี h'); continue
            sid = s.get('id')
            if not sid or not re.match(r'^[a-z0-9-]+$', sid): errs.append(w + ': id ต้องเป็น a-z0-9- (%r)' % sid)
            elif sid in ids: errs.append(w + ': id ซ้ำ ' + sid)
            ids.add(sid); nsec += 1
            extra = set(s) - {'id', 'h', 'html', 'sub', 'pg'}
            if extra: errs.append(w + ': key เกิน %s' % extra)
            if s.get('html'):
                c = Chk(w + ' "' + s['h'][:30] + '"', errs, flows_used, imgs); c.feed(s['html']); c.close(); c.close_check()
                chars += textlen(s['html'])
            if s.get('sub'):
                if depth >= 2: errs.append(w + ': ซ้อนได้ไม่เกิน 3 ชั้น (section → sub → sub)')
                walk(s['sub'], w + '.sub', depth + 1)
            if not s.get('html') and not s.get('sub'): errs.append(w + ': ว่าง (ไม่มี html และ sub)')
    walk(d.get('sections', []), 'sections', 0)

    fids = set()
    for j, f in enumerate(d.get('flows', [])):
        w = 'flows[%d]' % j
        fid = f.get('id')
        if not fid: errs.append(w + ': ขาด id'); continue
        if fid in fids: errs.append(w + ': id ซ้ำ'); fids.add(fid)
        fids.add(fid)
        for k in ('title', 'src', 'nodes', 'edges'):
            if k not in f: errs.append('%s (%s): ขาด %s' % (w, fid, k))
        if f.get('src') not in ('fig', 'text'): errs.append('%s: src ต้องเป็น fig หรือ text' % w)
        if f.get('img'):
            if not os.path.exists(os.path.join(OUT, 'img', f['img'])): errs.append('%s: ไม่พบรูป %s' % (w, f['img']))
            else: imgs.append(f['img'])
        nids = {}
        for n in f.get('nodes', []):
            if not n.get('id') or not n.get('t'): errs.append('%s: node ต้องมี id และ t (%s)' % (w, n)); continue
            if n['id'] in nids: errs.append('%s: node id ซ้ำ %s' % (w, n['id']))
            nids[n['id']] = n
            if n.get('k', 'act') not in KINDS: errs.append('%s: node %s k=%s ไม่รู้จัก' % (w, n['id'], n.get('k')))
            for fld in ('t', 'd'):
                if n.get(fld):
                    c = Chk('%s.%s.%s' % (fid, n['id'], fld), errs, [], []); c.feed(n[fld]); c.close(); c.close_check()
            extra = set(n) - {'id', 't', 'k', 'd'}
            if extra: errs.append('%s: node %s key เกิน %s' % (w, n['id'], extra))
        indeg = {k: 0 for k in nids}
        adj = {k: [] for k in nids}
        for e in f.get('edges', []):
            a, b = e.get('f'), e.get('t')
            if a not in nids or b not in nids: errs.append('%s: edge %s→%s อ้าง node ที่ไม่มี' % (w, a, b)); continue
            indeg[b] += 1; adj[a].append(b)
            extra = set(e) - {'f', 't', 'l'}
            if extra: errs.append('%s: edge key เกิน %s' % (w, extra))
        roots = [k for k, v in indeg.items() if v == 0]
        if not roots: errs.append('%s: ไม่มี node เริ่มต้น (ทุก node มีลูกศรเข้า)' % w)
        seen = set(); st = list(roots)
        while st:
            x = st.pop()
            if x in seen: continue
            seen.add(x); st.extend(adj[x])
        lone = [k for k in nids if k not in seen]
        if lone: errs.append('%s: node ที่ไปไม่ถึง %s' % (w, lone))
        iso = [k for k in nids if indeg[k] == 0 and not adj[k] and len(nids) > 1]
        if iso: errs.append('%s: node ลอย ไม่มีเส้นเชื่อม %s' % (w, iso))
        if len(nids) > 60: errs.append('%s: node เยอะเกิน (%d) — แยกเป็นหลาย flow' % (w, len(nids)))
    for u in flows_used:
        if u not in fids: errs.append('div.flow data-flow="%s" ไม่มีใน flows' % u)
    for fid in fids:
        if fid not in flows_used: errs.append('flow %s ไม่ได้วางไว้ใน html ส่วนไหนเลย (ต้องมี <div class="flow" data-flow="%s"></div>)' % (fid, fid))
    stats = {'sections': nsec, 'chars': chars, 'flows': len(fids), 'imgs': len(set(imgs))}
    return errs, stats


if __name__ == '__main__':
    nums = [int(x) for x in sys.argv[1:]] or [int(f[2:4]) for f in sorted(os.listdir(OUT)) if re.match(r'ch\d\d\.json$', f)]
    bad = 0
    for n in nums:
        e, s = check(n)
        print('บท %d: %s %s' % (n, 'ผ่าน' if not e else 'ผิด %d จุด' % len(e), s))
        for x in e[:60]: print('   -', x)
        bad += bool(e)
    sys.exit(1 if bad else 0)
