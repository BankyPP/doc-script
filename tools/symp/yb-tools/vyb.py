#!/usr/bin/env python3
"""ตรวจไฟล์หัวข้อเล่มเหลือง /home/claude/yb/out/yb-<key>.json
ใช้:  python3 -I /home/claude/yb/tools/vyb.py 1-1 1-2      (ไม่ใส่ = ตรวจทุกไฟล์)
"""
import json, os, re, sys
from html.parser import HTMLParser

OUT = '/home/claude/yb/out'
SI = '/home/claude/yb/si'
ALLOWED = {'p', 'ul', 'ol', 'li', 'b', 'i', 'u', 'sub', 'sup', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
           'figure', 'img', 'figcaption', 'div', 'span', 'h4', 'h5', 'small', 'mark', 'a'}
VOID = {'br', 'img'}
DIV_CLASSES = {'flow', 'box', 'pearl', 'warn', 'tbl'}
SPAN_CLASSES = {'en', 'hi', 'tag', 'up', 'down', 'muted', 'hw'}
KINDS = {'start', 'q', 'act', 'dx', 'note', 'stop'}
GROUPS = {'base', 'gen', 'neuro', 'cvr', 'gi', 'heme', 'kub', 'msk', 'endo'}


class Chk(HTMLParser):
    def __init__(self, where, errs, flows_used, imgs):
        super().__init__(); self.where = where; self.errs = errs; self.stack = []; self.flows_used = flows_used; self.imgs = imgs

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag not in ALLOWED: self.errs.append('%s: แท็ก <%s> ไม่อนุญาต' % (self.where, tag))
        if tag == 'div':
            cls = a.get('class', '')
            if cls not in DIV_CLASSES: self.errs.append('%s: <div class="%s"> ไม่อนุญาต' % (self.where, cls))
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


def feed(h, where, errs, fu, imgs):
    c = Chk(where, errs, fu, imgs); c.feed(h or ''); c.close(); c.close_check()


def si_ids(no):
    d = json.load(open(os.path.join(SI, 'ch%02d.json' % no), encoding='utf-8'))
    ids = {}

    def walk(ss, dep):
        for s in ss:
            ids[s['id']] = dep; walk(s.get('sub') or [], dep + 1)
    walk(d['sections'], 0)
    return ids


def check(key):
    path = os.path.join(OUT, 'yb-%s.json' % key)
    errs = []
    try: d = json.load(open(path, encoding='utf-8'))
    except Exception as e: return ['อ่าน JSON ไม่ได้: %s' % e], {}
    pre = 'yb-' + key.replace('.', '-')
    for k in ('key', 'en', 'th', 'pdf', 'target', 'flows'):
        if k not in d: errs.append('ขาด key ' + k)
    fu, imgs, ids = [], [], set()
    if d.get('target'):
        if not os.path.exists(os.path.join(SI, 'ch%02d.json' % d['target'])): errs.append('target บท %s ไม่มี' % d['target']); return errs, {}
        sids = si_ids(d['target'])
        if 'sections' in d: errs.append('มี target แล้วใช้ ops แทน sections')
        for i, op in enumerate(d.get('ops', [])):
            w = 'ops[%d]' % i
            o = op.get('op')
            if o == 'append':
                if op.get('sec') not in sids: errs.append('%s: sec "%s" ไม่มีในบท %s' % (w, op.get('sec'), d['target']))
                if not op.get('html'): errs.append(w + ': ต้องมี html')
                extra = set(op) - {'op', 'sec', 'html'}
            elif o == 'sub':
                if op.get('sec') not in sids: errs.append('%s: sec "%s" ไม่มีในบท' % (w, op.get('sec')))
                elif sids[op['sec']] > 1: errs.append('%s: sub ใต้ sec ชั้นที่ 3 ไม่ได้ (ซ้อนเกิน 3 ชั้น)' % w)
                extra = set(op) - {'op', 'sec', 'id', 'h', 'html', 'sub'}
            elif o == 'sec':
                a = op.get('after')
                if a not in (None, '^') and a not in sids: errs.append('%s: after "%s" ไม่มีในบท' % (w, a))
                if a in sids and sids[a] != 0: errs.append('%s: after ต้องเป็น section ชั้นบนสุด' % w)
                extra = set(op) - {'op', 'after', 'id', 'h', 'html', 'sub'}
            else:
                errs.append(w + ': op ต้องเป็น append / sub / sec'); continue
            if extra: errs.append('%s: key เกิน %s' % (w, extra))
            if o in ('sub', 'sec'):
                if not str(op.get('id', '')).startswith(pre + '-'): errs.append('%s: id ต้องขึ้นต้นด้วย %s-' % (w, pre))
                if not op.get('h'): errs.append(w + ': ต้องมี h')
                walk([op], w, 1 if o == 'sub' else 0, errs, fu, imgs, ids, pre, top=True)
            else:
                feed(op['html'], w, errs, fu, imgs)
        if not d.get('ops'): errs.append('ไม่มี ops')
    else:
        n = d.get('new') or {}
        if not re.match(r'^[a-z0-9-]+$', n.get('id', '')): errs.append('new.id ต้องเป็น a-z0-9-')
        if n.get('g') not in GROUPS: errs.append('new.g ต้องเป็น %s' % sorted(GROUPS))
        for k in ('th', 'en'):
            if not n.get(k): errs.append('new.%s ว่าง' % k)
        if not d.get('sections'): errs.append('บทใหม่ต้องมี sections')
        walk(d.get('sections', []), 'sections', 0, errs, fu, imgs, ids, pre)
    fids = set()
    for j, f in enumerate(d.get('flows', [])):
        w = 'flows[%d]' % j
        fid = f.get('id', '')
        if not re.match(r'^y[0-9a-z]+$', fid) or not fid.startswith('y' + key.replace('.', '').replace('-', '')):
            errs.append('%s: id ต้องเป็น y%s + ตัวอักษร เช่น y%sa (%s)' % (w, key.replace('-', ''), key.replace('-', ''), fid))
        if fid in fids: errs.append(w + ': id ซ้ำ')
        fids.add(fid)
        for k in ('title', 'src', 'nodes', 'edges'):
            if k not in f: errs.append('%s (%s): ขาด %s' % (w, fid, k))
        if f.get('src') not in ('fig', 'text'): errs.append('%s: src ต้องเป็น fig หรือ text' % w)
        if f.get('img'):
            if not os.path.exists(os.path.join(OUT, 'img', f['img'])): errs.append('%s: ไม่พบรูป %s' % (w, f['img']))
            else: imgs.append(f['img'])
        extra = set(f) - {'id', 'title', 'src', 'img', 'note', 'nodes', 'edges'}
        if extra: errs.append('%s: key เกิน %s' % (w, extra))
        nids = {}
        for nd in f.get('nodes', []):
            if not nd.get('id') or not nd.get('t'): errs.append('%s: node ต้องมี id และ t (%s)' % (w, nd)); continue
            if nd['id'] in nids: errs.append('%s: node id ซ้ำ %s' % (w, nd['id']))
            nids[nd['id']] = nd
            if nd.get('k', 'act') not in KINDS: errs.append('%s: node %s k=%s' % (w, nd['id'], nd.get('k')))
            for fld in ('t', 'd'):
                if nd.get(fld): feed(nd[fld], '%s.%s.%s' % (fid, nd['id'], fld), errs, [], [])
            ex = set(nd) - {'id', 't', 'k', 'd'}
            if ex: errs.append('%s: node %s key เกิน %s' % (w, nd['id'], ex))
        indeg = {k: 0 for k in nids}; adj = {k: [] for k in nids}
        for e in f.get('edges', []):
            a, b = e.get('f'), e.get('t')
            if a not in nids or b not in nids: errs.append('%s: edge %s→%s อ้าง node ที่ไม่มี' % (w, a, b)); continue
            indeg[b] += 1; adj[a].append(b)
            ex = set(e) - {'f', 't', 'l'}
            if ex: errs.append('%s: edge key เกิน %s' % (w, ex))
        roots = [k for k, v in indeg.items() if v == 0]
        if not roots: errs.append(w + ': ไม่มี node เริ่มต้น')
        # cycle
        color = {}

        def dfs(u):
            color[u] = 1
            for v in adj[u]:
                if color.get(v) == 1: return True
                if not color.get(v) and dfs(v): return True
            color[u] = 2; return False
        if any(not color.get(k) and dfs(k) for k in nids): errs.append(w + ': มีวงวน (ต้องเป็น DAG)')
        iso = [k for k in nids if indeg[k] == 0 and not adj[k] and len(nids) > 1]
        if iso: errs.append('%s: node ลอย %s' % (w, iso))
        if len(nids) > 60: errs.append('%s: node เกิน 60 (%d)' % (w, len(nids)))
    for u in fu:
        if u not in fids: errs.append('div.flow data-flow="%s" ไม่มีใน flows' % u)
    for fid in fids:
        if fid not in fu: errs.append('flow %s ไม่ได้วางไว้ใน html' % fid)
    return errs, {'flows': len(fids), 'imgs': len(set(imgs)), 'ops': len(d.get('ops', [])), 'secs': len(ids)}


def walk(ss, where, dep, errs, fu, imgs, ids, pre, top=False):
    for i, s in enumerate(ss):
        w = where if top else '%s[%d]' % (where, i)
        sid = s.get('id', '')
        if not re.match(r'^[a-z0-9-]+$', sid) or not sid.startswith(pre + '-'): errs.append('%s: id ต้องเป็น a-z0-9- ขึ้นต้น %s- (%r)' % (w, pre, sid))
        if sid in ids: errs.append(w + ': id ซ้ำ ' + sid)
        ids.add(sid)
        if not s.get('h'): errs.append(w + ': ต้องมี h')
        if not top:
            ex = set(s) - {'id', 'h', 'html', 'sub'}
            if ex: errs.append('%s: key เกิน %s' % (w, ex))
        if s.get('html'): feed(s['html'], w, errs, fu, imgs)
        if s.get('sub'):
            if dep >= 2: errs.append(w + ': ซ้อนเกิน 3 ชั้น')
            walk(s['sub'], w + '.sub', dep + 1, errs, fu, imgs, ids, pre)
        if not s.get('html') and not s.get('sub'): errs.append(w + ': ว่าง')


if __name__ == '__main__':
    keys = sys.argv[1:] or [f[3:-5] for f in sorted(os.listdir(OUT)) if re.match(r'yb-[\w-]+\.json$', f)]
    bad = 0
    for k in keys:
        k = k.replace('.', '-')
        e, s = check(k)
        print('yb-%s: %s %s' % (k, 'ผ่าน' if not e else 'ผิด %d จุด' % len(e), s))
        for x in e[:60]: print('   -', x)
        bad += bool(e)
    sys.exit(1 if bad else 0)
