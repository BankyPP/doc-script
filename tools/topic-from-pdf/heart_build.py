# สร้าง docs/topics/heart/ : data.json + ภาพหน้า + ภาพตัดแต่ละกล่อง/ช่อง
import json, os, sys, shutil
import numpy as np
from PIL import Image
WORK, OUT, SRC = sys.argv[1], sys.argv[2], sys.argv[3]
ext = json.load(open(os.path.join(WORK, 'ext.json')))
os.makedirs(os.path.join(OUT, 'c'), exist_ok=True)
shutil.copy(SRC, os.path.join(OUT, os.path.basename(SRC)))
R = lambda v: round(v, 5)
def nb(bb, W, H): return [R(bb[0] / W), R(bb[1] / H), R((bb[2] - bb[0]) / W), R((bb[3] - bb[1]) / H)]
def save(im, name, q=82): im.save(os.path.join(OUT, 'c', name + '.webp'), 'WEBP', quality=q, method=6)

TITLES = {1: 'Heart sounds · S1–S4 · Split S2 · Loud P2/A2 · Extra sounds', 2: 'Heart murmurs · systolic · diastolic · continuous · rub',
          3: 'Master Key of All Diseases (โปสเตอร์)'}
FULL = {1: 'HEART SOUNDS — S1 · S2 · S3 · S4 · Splitting of S2 · Loud P2/A2 · Gallops · Extra sounds (one-page table)',
        2: 'HEART MURMURS — Systolic · diastolic · continuous · eponymous murmurs · pericardial rub (one-page table)',
        3: 'MASTER KEY OF ALL DISEASES — JVP · arterial pulses · precordial impulses · cardiac & pulmonary auscultation (ภาพถ่ายโปสเตอร์)'}
pages = []
for P in ext:
    n = P['n']; W, H = P['W'], P['H']
    im = Image.open(os.path.join(WORK, 'p-%d.png' % n)).convert('RGB'); IW, IH = im.size
    im.save(os.path.join(OUT, 'p%02d.webp' % n), 'WEBP', quality=84, method=6)
    sx, sy = IW / W, IH / H
    def cut(bb, pad=3):
        return im.crop((max(0, int(bb[0] * sx) - pad), max(0, int(bb[1] * sy) - pad), min(IW, int(bb[2] * sx) + pad + 1), min(IH, int(bb[3] * sy) + pad + 1)))
    q = {'n': n, 't': TITLES[n], 'full': FULL[n], 'img': [IW, IH], 'heads': P['heads'], 'hcol': P['hcol'], 'cols': []}
    for ci, C in enumerate(P['cols']):
        c = {'h': C['h'], 'boxes': []}
        if C.get('c'): c['c'] = C['c']
        xs = [b['bb'] for b in C['boxes']]
        c['bb'] = nb((min(b[0] for b in xs), min(b[1] for b in xs), max(b[2] for b in xs), max(b[3] for b in xs)), W, H)
        for bi, B in enumerate(C['boxes']):
            key = '%d-%d-%d' % (n, ci, bi)
            sub = B.get('sub') or ''
            t = B['title'] + ((' ' if sub[:1] in '=(' else ' · ') + sub if sub else '')
            b = {'t': t, 'bb': nb(B['bb'], W, H), 'x': B['text']}
            if B.get('cells'):
                b['cells'] = [nb(cb, W, H) for cb in B['cells']]
                for k, cb in enumerate(B['cells']): save(cut(cb, 2), key + '-' + str(k))
            else:
                save(cut(B['bb']), key)
            c['boxes'].append(b)
        q['cols'].append(c)
    pages.append(q)

# ---------- หน้า 3: ภาพถ่ายโปสเตอร์ ----------
ph = Image.open(os.path.join(WORK, 'ph-000.jpg')).convert('RGB'); PW, PH = ph.size
S3 = 2000 / PW
ph.resize((2000, round(PH * S3)), Image.LANCZOS).save(os.path.join(OUT, 'p03.webp'), 'WEBP', quality=82, method=6)
RW, RH = 2800, 3330
src = [(62, 318), (2965, 165), (2920, 3580), (163, 3628)]
dst = [(0, 0), (RW, 0), (RW, RH), (0, RH)]
def coeffs(pa, pb):
    A = []; Bv = []
    for (x, y), (X, Y) in zip(pa, pb):
        A.append([x, y, 1, 0, 0, 0, -X * x, -X * y]); A.append([0, 0, 0, x, y, 1, -Y * x, -Y * y]); Bv += [X, Y]
    return np.linalg.solve(np.array(A, float), np.array(Bv, float))
inv = coeffs(dst, src)          # rect → photo
rect = ph.transform((RW, RH), Image.PERSPECTIVE, tuple(inv), Image.BICUBIC)
def to_photo(x, y):
    a = inv; d = a[6] * x + a[7] * y + 1
    return ((a[0] * x + a[1] * y + a[2]) / d, (a[3] * x + a[4] * y + a[5]) / d)
LINES = [311, 412, 512, 611, 710, 809, 908, 1006, 1105, 1204, 1303, 1402, 1500, 1599, 1697, 1796, 1896, 1995, 2096, 2196, 2296, 2396, 2497, 2597, 2697, 2797, 2897, 3000, 3103, 3208, 3313]
CH = [(0, 826), (826, 1615), (1615, RW)]
HEAD = (14, 311)
ROWS = [  # ชื่อโรค, code, JVP mean, BP, pulmonary auscultation (ตามโปสเตอร์)
 ('Introductory Program', 44, 3, '120/80', 'Normal vesicular breath sounds'),
 ('Normal', 46, 4, '120/70', 'Normal vesicular breath sounds'),
 ('Innocent Murmur', 22, 3, '110/70', 'Normal vesicular breath sounds'),
 ('Aortic Valve Sclerosis', 49, 3, '165/80', 'Normal vesicular breath sounds'),
 ('Hypertension', 36, 5, '170/110', 'Normal vesicular breath sounds'),
 ('Angina Pectoris', 39, 4, '150/100', 'Normal vesicular breath sounds'),
 ('Acute Inferior Myocardial Infarction', 43, 3, '90/60', 'Normal vesicular breath sounds'),
 ('Acute Anterior Myocardial Infarction', 40, 6, '120/95', 'Lower posterior bilateral inspiratory crackles'),
 ('Ventricular Aneurysm', 48, 7, '150/90', 'Inspiratory and expiratory crackles'),
 ('Mitral Valve Prolapse', 9, 3, '120/70', 'Normal vesicular breath sounds'),
 ('Mitral Valve Prolapse, isolated click & murmur', 10, 3, '120/70', 'Normal vesicular breath sounds'),
 ('Mitral Regurgitation, chronic', 7, 7, '130/80', 'Normal vesicular breath sounds'),
 ('Mitral Regurgitation, mild', 8, 4, '120/70', 'Normal vesicular breath sounds'),
 ('Mitral Regurgitation, acute', 6, 5, '140/80', 'Inspiratory and expiratory crackles'),
 ('Mitral Stenosis with severe tricuspid regurgitation', 4, 12, '90/70', 'Inspiratory crackles and expiratory wheezes'),
 ('Mitral Stenosis with mild tricuspid regurgitation', 5, 12, '90/70', 'Inspiratory crackles and expiratory wheezes'),
 ('Mitral Stenosis and Regurgitation', 3, 11, '120/80', 'Lower bilateral inspiratory crackles and expiratory wheezes'),
 ('Aortic Regurgitation, chronic', 17, 7, '160/35', 'Normal vesicular breath sounds'),
 ('Aortic Regurgitation, acute', 37, 6, '130/50', 'Lower bilateral inspiratory and expiratory crackles'),
 ('Aortic Stenosis', 13, 3, '100/80', 'Normal vesicular breath sounds'),
 ('Hypertrophic Obstructive Cardiomyopathy', 1, 5, '120/80', 'Normal vesicular breath sounds'),
 ('Cardiomyopathy', 42, 12, '110/90', 'Lower right posterior absent breath sounds, and lower left posterior inspiratory crackles'),
 ('Acute Pericarditis', 30, 5, '130/85', 'Lower left pleural rub'),
 ('Primary Pulmonary Hypertension', 11, 12, '90/70', 'Normal vesicular breath sounds'),
 ('Atrial Septal Defect', 23, 6, '120/80', 'Normal vesicular breath sounds'),
 ('Ventricular Septal Defect', 25, 3, '100/60', 'Normal vesicular breath sounds'),
 ('Patent Ductus Arteriosus', 28, 7, '150/50', 'Normal vesicular breath sounds'),
 ('Pulmonary Stenosis', 20, 10, '110/80', 'Normal vesicular breath sounds'),
 ('Coarctation of the Aorta', 33, 4, '170/100', 'Normal vesicular breath sounds'),
 ('Tetralogy of Fallot', 27, 6, '90/60', 'Normal vesicular breath sounds'),
]
assert len(ROWS) == len(LINES) - 1
SC, GAP = 0.75, 18
from scipy.ndimage import map_coordinates
GR = json.load(open(os.path.join(WORK, 'grid.json')))
GX = np.array(GR['xs'], float) + 4; GY = np.array(GR['ys'])
RA = np.asarray(rect).astype(float)
def yline(j): return np.interp(np.arange(RW), GX, GY[:, j])
def strip(j, pad_top, pad_bot, j2=None):
    # ตัดแถบโค้งให้ตรง: บน = เส้น j + pad_top, ล่าง = เส้น j2 (หรือ j) + pad_bot
    top = yline(j) + pad_top; bot = (yline(j2) if j2 is not None else yline(j)) + pad_bot
    h = int(round(np.median(bot - top)))
    v = np.arange(h)[:, None] / max(1, h - 1)
    ys = top[None, :] + v * (bot - top)[None, :]; xs = np.broadcast_to(np.arange(RW)[None, :], ys.shape)
    out = np.stack([map_coordinates(RA[:, :, c], [ys, xs], order=1) for c in range(3)], -1)
    return Image.fromarray(np.clip(out, 0, 255).astype('uint8'))
q3 = {'n': 3, 't': TITLES[3], 'full': FULL[3], 'img': [2000, round(PH * S3)], 'lay': 'strip', 'cols': []}
col = {'h': 'MASTER KEY OF ALL DISEASES — ทีละโรค', 'boxes': []}
note = 'ภาพถ่ายโปสเตอร์ — แต่ละแถวตัดมาพร้อมหัวตาราง ดัดภาพให้ตรงเท่านั้น ไม่ได้แก้เนื้อหา · แตะภาพเพื่อดูบนภาพต้นฉบับ'
for i, (name, code, jvp, bp, lung) in enumerate(ROWS):
    a, b = LINES[i] - 4, LINES[i + 1] + 4
    parts = []
    hd_full = strip(0, -297, -2); rw_full = strip(i, -4, 4, i + 1)
    for x0, x1 in CH:
        parts.append((hd_full.crop((x0, 0, x1, hd_full.height)), rw_full.crop((x0, 0, x1, rw_full.height))))
    cw = max(x1 - x0 for x0, x1 in CH)
    th = sum(hd.height + rw.height for hd, rw in parts) + GAP * (len(parts) - 1)
    comp = Image.new('RGB', (cw, th), (255, 255, 255)); y = 0
    for k, (hd, rw) in enumerate(parts):
        comp.paste(hd, (0, y)); y += hd.height; comp.paste(rw, (0, y)); y += rw.height
        if k < len(parts) - 1:
            y += GAP
    comp = comp.resize((round(cw * SC), round(th * SC)), Image.LANCZOS)
    key = '3-0-%d' % i
    save(comp, key, 80)
    ya, yb = yline(i), yline(i + 1)
    corners = [to_photo(x, y) for x, y in ((0, ya[0]), (RW - 1, ya[-1]), (RW - 1, yb[-1]), (0, yb[0]), (RW // 2, ya[RW // 2]), (RW // 2, yb[RW // 2]))]
    xs = [p[0] for p in corners]; ys = [p[1] for p in corners]
    bb = [R(max(0, min(xs)) / PW), R(max(0, min(ys)) / PH), R((min(PW, max(xs)) - max(0, min(xs))) / PW), R((min(PH, max(ys)) - max(0, min(ys))) / PH)]
    x = ('Disease state: %s\nCode number: %d\nJugular venous mean pressure: %d\nBlood pressure: %s\nPulmonary auscultation: %s\n'
         '(JVP waveform, arterial pulse contours, precordial impulses และ cardiac auscultation ทั้ง 4 area เป็นภาพในโปสเตอร์)') % (name, code, jvp, bp, lung)
    col['boxes'].append({'t': name, 'bb': bb, 'x': x, 'sz': list(comp.size)})
col['bb'] = [0, 0, 1, 1]
q3['note'] = note
q3['cols'].append(col)
pages.append(q3)
GROUPS = [{'id': 'sounds', 't': 'Heart sounds', 'pages': [1]}, {'id': 'murmurs', 't': 'Heart murmurs', 'pages': [2]}, {'id': 'poster', 't': 'Master Key (โปสเตอร์)', 'pages': [3]}]
json.dump({'groups': GROUPS, 'pages': pages}, open(os.path.join(OUT, 'data.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('ok', sum(len(c['boxes']) for p in pages for c in p['cols']), 'units')
