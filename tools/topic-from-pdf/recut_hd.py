# ตัดภาพกล่อง/ช่องของ Random Topic Summary ใหม่ให้คมบนมือถือ (1 พ.ย. 2026)
# ใช้กรอบเดิมใน data.json (ไม่แก้ data.json ไม่แก้เนื้อหา) แค่ render PDF ต้นฉบับละเอียดขึ้น:
#   ภาพตัด c/*.webp  = 425 dpi (2.5 เท่าของเดิม 170 dpi) — หน้าเว็บกำหนดขนาดแสดงจาก width/height เดิม จึงได้ภาพคมขึ้นบนจอ 2x–3x
#   ภาพทั้งหน้า pNN.webp = กว้าง 4096 px (ไม่เกิน ~12 MP เพื่อให้ Safari บน iPhone วาดได้)
# หน้าที่เป็นภาพถ่าย (lay:'strip' หรือมี sz) ข้าม — ต้นฉบับเป็นรูปถ่าย ละเอียดกว่านี้ไม่ได้
# ใช้: python3 tools/topic-from-pdf/recut_hd.py docs/topics/<id>   แล้วเพิ่ม v ของหัวข้อใน docs/data/topics.js
import glob, json, os, subprocess, sys, tempfile
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
DPI, BASE, PAGE_W = 425, 170, 4096
S = DPI / BASE
tdir = sys.argv[1]
d = json.load(open(os.path.join(tdir, 'data.json')))
pdf = glob.glob(os.path.join(tdir, '*.pdf'))[0]
tmp = tempfile.mkdtemp()
pad = lambda p: int(round(p * S))
for p in d['pages']:
    n = p['n']
    if p.get('lay') == 'strip' or any(b.get('sz') for c in p['cols'] for b in c['boxes']):
        print('ข้ามหน้า', n, '(ภาพถ่าย)'); continue
    subprocess.run(['pdftoppm', '-r', str(DPI), '-f', str(n), '-l', str(n), '-singlefile', '-png', pdf, os.path.join(tmp, 'p')], check=True)
    im = Image.open(os.path.join(tmp, 'p.png')).convert('RGB'); W, H = im.size

    def save(img, name, q=80): img.save(os.path.join(tdir, 'c', name + '.webp'), 'WEBP', quality=q, method=6)
    def cut_a(bb, a, b):   # แบบ cut_crops.py: (x0-a, y0-a, x1+b, y1+b) ที่ 170 dpi
        return im.crop((max(0, int(bb[0] * W) - pad(a)), max(0, int(bb[1] * H) - pad(a)), min(W, int((bb[0] + bb[2]) * W) + pad(b)), min(H, int((bb[1] + bb[3]) * H) + pad(b))))
    for ci, c in enumerate(p['cols']):
        if not c['boxes']:
            save(cut_a(c['bb'], 3, 4), '%d-%d' % (n, ci)); continue
        for bi, b in enumerate(c['boxes']):
            key = '%d-%d-%d' % (n, ci, bi)
            if b.get('cells'):   # ตาราง (heart_build.py: pad 2, +1)
                for k, cb in enumerate(b['cells']): save(cut_a(cb, 2, 3), key + '-' + str(k))
            elif p.get('img'):   # heart_build.py: pad 3, +1
                save(cut_a(b['bb'], 3, 4), key)
            else:
                save(cut_a(b['bb'], 3, 4), key)
    pw = im.resize((PAGE_W, round(H * PAGE_W / W)), Image.LANCZOS)
    pw.save(os.path.join(tdir, 'p%02d.webp' % n), 'WEBP', quality=82, method=6)
    print('หน้า', n, 'เสร็จ', W, H)
