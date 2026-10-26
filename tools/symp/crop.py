#!/usr/bin/env python3
"""ตัดรูปจากหน้าหนังสือ (ความละเอียดเต็ม 300 dpi)

ใช้:  python3 -I /home/claude/symp/tools/crop.py PAGE X0 Y0 X1 Y1 NAME
  PAGE  = เลขหน้า PDF (ตรงกับชื่อไฟล์ pages/p-NNN.jpg)
  X0..Y1 = ขอบเป็นสัดส่วนของหน้า 0–1 (ซ้าย บน ขวา ล่าง) วัดจากภาพ p-NNN.jpg (กว้าง 852 สูง 1240 px)
           จะใส่เป็น pixel ของภาพ 150dpi ก็ได้ (ถ้าค่า > 1 จะถือเป็น pixel ของภาพ 852x1240)
  NAME  = ชื่อไฟล์ไม่มีนามสกุล เช่น ch08-f1

ผลลัพธ์: /home/claude/symp/out/img/NAME.webp (ใช้ในเว็บเป็น symp/img/NAME.webp)
         /home/claude/symp/out/prev/NAME.jpg  (ภาพย่อไว้ Read ตรวจว่าตัดครบ ไม่ขาด ไม่เกิน)
"""
import subprocess, sys, os, tempfile
from PIL import Image

SRC = '/home/claude/symp/src.pdf'
OUT = '/home/claude/symp/out/img'
PRE = '/home/claude/symp/out/prev'


def main():
    if len(sys.argv) != 7:
        print(__doc__); sys.exit(1)
    page = int(sys.argv[1]); box = [float(v) for v in sys.argv[2:6]]; name = sys.argv[6]
    if any(v > 1.0 for v in box):
        box = [box[0] / 852, box[1] / 1240, box[2] / 852, box[3] / 1240]
    x0, y0, x1, y1 = box
    if not (0 <= x0 < x1 <= 1 and 0 <= y0 < y1 <= 1):
        print('box ผิด: ต้อง 0<=x0<x1<=1, 0<=y0<y1<=1'); sys.exit(1)
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(['pdftoppm', '-r', '300', '-f', str(page), '-l', str(page), '-png', SRC, td + '/p'], check=True, stderr=subprocess.DEVNULL)
        f = [x for x in os.listdir(td) if x.endswith('.png')][0]
        im = Image.open(os.path.join(td, f)).convert('RGB')
    W, H = im.size
    c = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
    if c.width > 1200:
        c = c.resize((1200, round(c.height * 1200 / c.width)), Image.LANCZOS)
    os.makedirs(OUT, exist_ok=True); os.makedirs(PRE, exist_ok=True)
    c.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=74, method=6)
    p = c.copy(); p.thumbnail((900, 900)); p.save(os.path.join(PRE, name + '.jpg'), quality=80)
    print('ok', os.path.join(OUT, name + '.webp'), c.size, '→ ตรวจด้วย Read', os.path.join(PRE, name + '.jpg'))


if __name__ == '__main__':
    main()
