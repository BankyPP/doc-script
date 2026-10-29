#!/usr/bin/env python3
"""สร้าง snapshot ของ Google Doc สำหรับโพยหมอ
ใช้ (แบบดึงเองจาก Doc สาธารณะ — ใช้ใน GitHub Actions, ได้ชั้นของแท็บจริงด้วย):
    python3 tools/gdoc/build.py --public <docId> poymor --hide "homework (?)" --min-tabs 20
  ต้องแชร์ Doc เป็น Anyone with the link · ชื่อ/ชั้นของแท็บอ่านจากหน้า /edit, เนื้อหาแต่ละแท็บจาก export?format=html&tab=<id>
ใช้ (จาก zip ที่ export ไว้แล้ว): python3 tools/gdoc/build.py <โฟลเดอร์ที่แตก zip export ของ Doc (มี .html + images/)> <ชื่อ เช่น poymor> [--prefix g] [--hide "ชื่อแท็บ" ...]
  --hide ชื่อแท็บที่ห้ามขึ้นเว็บ (เช่น "homework (?)") — ตัดทิ้งตั้งแต่ตอนสร้าง ไม่อยู่ในไฟล์ที่เผยแพร่
  --min-tabs N  ถ้าได้แท็บน้อยกว่า N ให้ล้ม (กันกรณี Google ส่งหน้า login มาแทน Doc)
  ถ้าเนื้อหาเหมือนไฟล์เดิมทุกแท็บ จะไม่เขียนไฟล์ใหม่ (เวลาที่ดึงไม่เปลี่ยน → ไม่มี commit เปล่า)
  ตัวแปร PW_CHANNEL=chrome = ใช้ Chrome ที่ติดตั้งในเครื่องแทน Chromium ของ Playwright (ใช้ใน GitHub Actions)
ได้: docs/gdoc/<ชื่อ>.json  ({ at, tabs:[{title, html, heads}] }) และรูปที่ docs/gdoc/img/<ชื่อ>-<ไฟล์>
ตัวแปลงคือ docs/gdoc.js (ไฟล์เดียวกับที่หน้าเว็บใช้ตอนดึง Doc สด) รันใน Chromium ผ่าน Playwright"""
import sys, os, json, glob, shutil, datetime, re, hashlib, base64, time, urllib.request
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOCS = os.path.join(ROOT, 'docs')

UA = {'User-Agent': 'Mozilla/5.0 (poymor-sync)'}

def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(2 + 3 * i)

def public_tabs(doc_id):
    """[(tabId, title, depth)] ตามลำดับใน Doc — อ่านจาก DOCS_modelChunk ในหน้า /edit"""
    e = get('https://docs.google.com/document/d/%s/edit' % doc_id).decode('utf-8', 'replace')
    out = []
    m = re.search(r'\{"ty":"mkch","d":\[\[1,("(?:[^"\\]|\\.)*")\]', e)
    if m: out.append(('t.0', json.loads(m.group(1)), 0))
    for tid, title, path in re.findall(r'\{"ty":"ac","d":\["(t\.[a-z0-9]+)",\[1,("(?:[^"\\]|\\.)*")\],\[([\d,]*)\]\]\}', e):
        out.append((tid, json.loads(title), len(path.split(',')) - 1))
    return out

def save_imgs(html, name, imgs):
    """รูปในแท็บ (data: URI หรือ URL) → ไฟล์ใน docs/gdoc/img/ ตั้งชื่อตามเนื้อไฟล์ (ไม่เปลี่ยนถ้ารูปเดิม)"""
    def rep(m):
        src = m.group(1)
        try:
            if src.startswith('data:'):
                head, data = src.split(',', 1)
                raw = base64.b64decode(data); ext = re.search(r'image/(\w+)', head).group(1)
            else:
                raw = get(src.replace('&amp;', '&')); ext = 'png'
        except Exception as x:
            print('  รูปโหลดไม่ได้', str(x)[:80]); return m.group(0)
        ext = {'jpeg': 'jpg', 'svg+xml': 'svg'}.get(ext, ext)
        fn = 'gdoc/img/%s-%s.%s' % (name, hashlib.sha1(raw).hexdigest()[:14], ext)
        imgs[fn] = raw
        return 'src="%s"' % fn
    return re.sub(r'src="(data:image/[^"]+|https://[^"]+googleusercontent[^"]+)"', rep, html)

def main():
    if sys.argv[1] == '--public':
        return main_public()
    src, name = sys.argv[1], sys.argv[2]
    prefix = sys.argv[sys.argv.index('--prefix') + 1] if '--prefix' in sys.argv else 'g'
    hide = [sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == '--hide']
    min_tabs = int(sys.argv[sys.argv.index('--min-tabs') + 1]) if '--min-tabs' in sys.argv else 0
    html_file = [f for f in glob.glob(os.path.join(src, '*.html'))][0]
    html = open(html_file, encoding='utf-8').read()
    os.makedirs(os.path.join(DOCS, 'gdoc', 'img'), exist_ok=True)
    imgmap = {}
    for f in glob.glob(os.path.join(src, 'images', '*')):
        b = os.path.basename(f)
        imgmap['images/' + b] = 'gdoc/img/' + name + '-' + b
    lib = open(os.path.join(DOCS, 'gdoc.js'), encoding='utf-8').read()
    with sync_playwright() as p:
        ch = os.environ.get('PW_CHANNEL')
        b = p.chromium.launch(channel=ch) if ch else p.chromium.launch()
        pg = b.new_page()
        pg.set_content('<!doctype html><meta charset="utf-8"><body></body>')
        pg.add_script_tag(content=lib)
        out = pg.evaluate('([h, m, pre]) => POY_GDOC_LIB.parse(h, { prefix: pre, img: s => m[s] || s })', [html, imgmap, prefix])
        b.close()
    out['tabs'] = [t for t in out['tabs'] if t['title'] not in hide]
    if len(out['tabs']) < min_tabs:
        sys.exit('ได้แค่ %d แท็บ (น้อยกว่า %d) — Doc อาจยังไม่ได้แชร์ Anyone with the link' % (len(out['tabs']), min_tabs))
    path = os.path.join(DOCS, 'gdoc', name + '.json')
    try:
        old = json.load(open(path, encoding='utf-8'))
    except Exception:
        old = None
    used = json.dumps(out, ensure_ascii=False)
    imgs_same = all(os.path.exists(os.path.join(DOCS, v)) and open(os.path.join(src, k), 'rb').read() == open(os.path.join(DOCS, v), 'rb').read() for k, v in imgmap.items() if v in used)
    if old and old.get('tabs') == out['tabs'] and imgs_same:
        print('ไม่มีอะไรเปลี่ยน —', len(out['tabs']), 'แท็บ'); return
    for k, v in imgmap.items():
        if v in used: shutil.copy(os.path.join(src, k), os.path.join(DOCS, v))
    out['at'] = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).strftime('%Y-%m-%d %H:%M')
    json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(path, os.path.getsize(path), 'bytes,', len(out['tabs']), 'tabs')
    for t in out['tabs']:
        print('  -', t['title'] or '(ไม่มีชื่อ)', len(t['html']), 'chars,', len(t['heads']), 'heads')

def main_public():
    doc_id, name = sys.argv[2], sys.argv[3]
    hide = [sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == '--hide']
    min_tabs = int(sys.argv[sys.argv.index('--min-tabs') + 1]) if '--min-tabs' in sys.argv else 0
    prefix = sys.argv[sys.argv.index('--prefix') + 1] if '--prefix' in sys.argv else 'g'
    ai = os.environ.get('AISYNC_URL', '')   # Apps Script (tools/ai-sync) — อ่านด้วยสิทธิ์เจ้าของ ได้ฉบับล่าสุดจริง (export แบบไม่ล็อกอินของ Google ค้างฉบับเก่าได้เป็นวัน)
    if ai:
        try: tree = json.loads(get(ai + '?op=tree&id=' + doc_id).decode('utf-8'))
        except Exception as x: tree = {'error': str(x)}
        if tree.get('ok') and 'tabs' in tree: tabs = [(t['id'], t['title'], t['d']) for t in tree['tabs']]
        else: print('Apps Script ใช้ไม่ได้ (' + str(tree.get('error') or 'ยังไม่ได้อัปเดตสคริปต์') + ') — ดึงแบบสาธารณะแทน'); ai = ''
    if not ai:
        tabs = public_tabs(doc_id)
    print('พบ', len(tabs), 'แท็บใน Doc', '(ผ่าน Apps Script)' if ai else '')
    if len(tabs) < min_tabs:
        sys.exit('ได้แค่ %d แท็บ (น้อยกว่า %d) — Doc อาจยังไม่ได้แชร์ Anyone with the link' % (len(tabs), min_tabs))
    keep, skip_depth = [], None
    for tid, title, d in tabs:   # ซ่อนแท็บใน --hide พร้อมแท็บย่อยทั้งหมดของมัน
        if skip_depth is not None and d > skip_depth: continue
        skip_depth = d if title in hide else None
        if skip_depth is None: keep.append((tid, title, d))
    lib = open(os.path.join(DOCS, 'gdoc.js'), encoding='utf-8').read()
    imgs, out = {}, {'tabs': []}
    with sync_playwright() as p:
        ch = os.environ.get('PW_CHANNEL')
        b = p.chromium.launch(channel=ch) if ch else p.chromium.launch()
        pg = b.new_page()
        pg.set_content('<!doctype html><meta charset="utf-8"><body></body>')
        pg.add_script_tag(content=lib)
        for tid, title, d in keep:
            if ai:
                j = json.loads(get(ai + '?op=tab&id=' + doc_id + '&tab=' + tid).decode('utf-8'))
                if not j.get('ok'): sys.exit('Apps Script แท็บ %s: %s' % (title, j.get('error')))
                h = j['html']
                if j.get('fmt') == 'dom':   # สคริปต์สร้าง HTML จากตัว Doc ให้แล้ว ไม่ต้องแปลงอีก
                    out['tabs'].append({'title': title, 'html': save_imgs(h, name, imgs), 'heads': j.get('heads') or [], 'd': d})
                    continue
            else:
                h = get('https://docs.google.com/document/d/%s/export?format=html&tab=%s' % (doc_id, tid)).decode('utf-8', 'replace')
            h = save_imgs(h, name, imgs)
            r = pg.evaluate('([h, pre]) => POY_GDOC_LIB.parse(h, { prefix: pre })', [h, prefix])
            html = ''.join(t['html'] for t in r['tabs']); heads = [x for t in r['tabs'] for x in t['heads']]
            out['tabs'].append({'title': title, 'html': html, 'heads': heads, 'd': d})
        b.close()
    path = os.path.join(DOCS, 'gdoc', name + '.json')
    try: old = json.load(open(path, encoding='utf-8'))
    except Exception: old = None
    if old and old.get('tabs') == out['tabs']:
        print('ไม่มีอะไรเปลี่ยน —', len(out['tabs']), 'แท็บ'); return
    os.makedirs(os.path.join(DOCS, 'gdoc', 'img'), exist_ok=True)
    for fn, raw in imgs.items():
        open(os.path.join(DOCS, fn), 'wb').write(raw)
    for f in glob.glob(os.path.join(DOCS, 'gdoc', 'img', name + '-*')):   # รูปที่ไม่ใช้แล้ว
        if 'gdoc/img/' + os.path.basename(f) not in imgs: os.remove(f)
    out['at'] = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).strftime('%Y-%m-%d %H:%M')
    json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(path, os.path.getsize(path), 'bytes,', len(out['tabs']), 'แท็บ,', len(imgs), 'รูป')

if __name__ == '__main__':
    main()
