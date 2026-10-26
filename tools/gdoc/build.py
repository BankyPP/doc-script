#!/usr/bin/env python3
"""สร้าง snapshot ของ Google Doc สำหรับโพยหมอ
ใช้: python3 tools/gdoc/build.py <โฟลเดอร์ที่แตก zip export ของ Doc (มี .html + images/)> <ชื่อ เช่น poymor> [--prefix g] [--hide "ชื่อแท็บ" ...]
  --hide ชื่อแท็บที่ห้ามขึ้นเว็บ (เช่น "homework (?)") — ตัดทิ้งตั้งแต่ตอนสร้าง ไม่อยู่ในไฟล์ที่เผยแพร่
  --min-tabs N  ถ้าได้แท็บน้อยกว่า N ให้ล้ม (กันกรณี Google ส่งหน้า login มาแทน Doc)
  ถ้าเนื้อหาเหมือนไฟล์เดิมทุกแท็บ จะไม่เขียนไฟล์ใหม่ (เวลาที่ดึงไม่เปลี่ยน → ไม่มี commit เปล่า)
  ตัวแปร PW_CHANNEL=chrome = ใช้ Chrome ที่ติดตั้งในเครื่องแทน Chromium ของ Playwright (ใช้ใน GitHub Actions)
ได้: docs/gdoc/<ชื่อ>.json  ({ at, tabs:[{title, html, heads}] }) และรูปที่ docs/gdoc/img/<ชื่อ>-<ไฟล์>
ตัวแปลงคือ docs/gdoc.js (ไฟล์เดียวกับที่หน้าเว็บใช้ตอนดึง Doc สด) รันใน Chromium ผ่าน Playwright"""
import sys, os, json, glob, shutil, datetime
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOCS = os.path.join(ROOT, 'docs')

def main():
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

if __name__ == '__main__':
    main()
