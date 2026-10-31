#!/usr/bin/env python3
"""ซูมดูส่วนหนึ่งของหน้าให้ชัดขึ้น (ไว้อ่านตัวเล็ก ตาราง เชิงอรรถ) — ไม่ได้ใช้ในเว็บ
ใช้:  python3 -I /home/claude/yb/tools/zoom.py PAGE X0 Y0 X1 Y1
  ขอบเป็นสัดส่วน 0–1 ของหน้า (หรือ pixel ของภาพ 1275x1761 (ค่าพิกเซลถือว่าภาพสูง 1761 — หน้าที่สูงต่างนี้ให้ใช้สัดส่วน 0–1))
ผลลัพธ์: /home/claude/yb/zoom/z<PAGE>-<x0>-<y0>.jpg → Read ไฟล์นั้น
"""
import subprocess, sys, os, tempfile
from PIL import Image

SRC = '/home/claude/yb/src.pdf'
page = int(sys.argv[1]); box = [float(v) for v in sys.argv[2:6]]
if any(v > 1.0 for v in box):
    box = [box[0] / 1275, box[1] / 1761, box[2] / 1275, box[3] / 1761]
with tempfile.TemporaryDirectory() as td:
    subprocess.run(['pdftoppm', '-r', '250', '-f', str(page), '-l', str(page), '-png', SRC, td + '/p'], check=True, stderr=subprocess.DEVNULL)
    f = [x for x in os.listdir(td) if x.endswith('.png')][0]
    im = Image.open(os.path.join(td, f)).convert('RGB')
W, H = im.size
c = im.crop((int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H)))
c.thumbnail((1500, 1500))
os.makedirs('/home/claude/yb/zoom', exist_ok=True)
out = '/home/claude/yb/zoom/z%d-%d-%d.jpg' % (page, int(box[0] * 100), int(box[1] * 100))
c.save(out, quality=85)
print(out)
