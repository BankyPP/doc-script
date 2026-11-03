#!/usr/bin/env python3
"""EKG (Random Topic Summary) — เล่ม 1 Field Manual + เล่ม 2 Deep Dive → docs/topics/ekg/
ใช้: python3 tools/topic-from-pdf/ekg_build.py <EKG1.pdf> <EKG2.pdf>
- การ์ดสีขาวบนหน้า = กล่อง (ภาพตัดตามต้นฉบับ ไม่แก้เนื้อหา)
- ข้อความให้ AI: ซ่อม glyph ไทยที่ ToUnicode หาย (CID map ด้านล่าง) + สัญลักษณ์ที่เป็น vector (ekg_glyphs.json)
- ผลตรวจข้อมูล (chk) อยู่ใน ekg_checks.json แสดงใต้กล่อง ภาพไม่ถูกแก้"""
import sys, os, re, json, subprocess, shutil, tempfile
import pdfminer.converter as cv
SARA = {89:'ั',91:'่',92:'่',94:'้',95:'้',98:'๊',102:'์',105:'็',108:'ิ',110:'ี',112:'ึ',114:'ื',116:'่ํ',117:'้ํ',56:'ฬ'}
PROMPT = {89:'ั',91:'่',93:'้',94:'้',104:'็',111:'ึ',125:'่'}
_o = cv.PDFLayoutAnalyzer.render_char
def _rc(self, matrix, font, fontsize, scaling, rise, cid, ncs, gs):
    adv = _o(self, matrix, font, fontsize, scaling, rise, cid, ncs, gs)
    try:
        it = self.cur_item._objs[-1]
        if it.get_text() == '\x00':
            m = (PROMPT if 'Prompt' in it.fontname else SARA if 'Sarabun' in it.fontname else {}).get(cid)
            it._text = m or ''
    except Exception: pass
    return adv
cv.PDFLayoutAnalyzer.render_char = _rc
import pdfplumber
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'topics', 'ekg')
GL = json.load(open(os.path.join(HERE, 'ekg_glyphs.json'), encoding='utf8'))
CHK = json.load(open(os.path.join(HERE, 'ekg_checks.json'), encoding='utf8')) if os.path.exists(os.path.join(HERE, 'ekg_checks.json')) else {}
DPI = 180
MK = 'ัิ-ฺ็-๎'
def clean(t):
    t = t.replace('\x00', '')
    t = re.sub(r'(?<=[%s])[ \t]+(?=[ก-๛])' % MK, '', t)
    t = re.sub(r'(?<=[ก-๛])[ \t]+(?=[%sะาำๅ])' % MK, '', t)
    t = t.replace('ํา', 'ำ')
    t = re.sub(r'([่-๋])ํ', 'ํ\\1', t).replace('ํ่า', '่ำ').replace('ํ้า', '้ำ')
    t = re.sub(r'(?<=[ก-ฮ])[ \t]+(?=[ก-ฮ]?[ุู])', '', t)
    t = re.sub(r'[ \t]{2,}', ' ', t)
    t = re.sub(r'\s*\n?([₂₃₄⁺])\n?', r'\1', t)
    return '\n'.join(l.strip() for l in t.split('\n') if l.strip())
def sig(c):
    w = max(c['x1'] - c['x0'], .01); h = max(c['bottom'] - c['top'], .01); pts = c['pts']
    return repr((len(pts), round(w / h, 1)) + tuple((round((x - c['x0']) / w, 1), round((y - c['top']) / h, 1)) for x, y in pts[:24]))
def symbols(p):
    """วางสัญลักษณ์ vector กลับเข้าลำดับตัวอักษร"""
    chars = p.chars
    for c in p.curves:
        w = c['x1'] - c['x0']; h = c['bottom'] - c['top']
        if w > 26 or h > 26: continue
        s = GL.get(sig(c))
        if not s: continue
        cy = (c['top'] + c['bottom']) / 2; best = None; nxt = None
        for k, ch in enumerate(chars):
            if abs((ch['top'] + ch['bottom']) / 2 - cy) < 5:
                if ch['x1'] <= c['x0'] + 1.5 and c['x0'] - ch['x1'] < 16 and (best is None or ch['x1'] > chars[best]['x1']): best = k
                if ch['x0'] >= c['x1'] - 1.5 and ch['x0'] - c['x1'] < 16 and (nxt is None or ch['x0'] < chars[nxt]['x0']): nxt = k
        base = best if best is not None else nxt
        if base is None: continue
        f = dict(chars[base])
        f.update(text=s, x0=c['x0'], x1=c['x1'], top=c['top'], bottom=c['bottom'], y0=p.height - c['bottom'], y1=p.height - c['top'], width=w, height=h)
        chars.insert(base + 1 if best is not None else base, f)
def cards(p):
    fr = []
    for o in p.curves:
        if o.get('fill') and o['x1'] - o['x0'] > 100 and o['bottom'] - o['top'] > 30 and o['top'] > 60:
            b = (o['x0'], o['top'], o['x1'], o['bottom'])
            if b not in fr: fr.append(b)
    fr = [b for b in fr if not any(b != g and b[0] >= g[0] - 1 and b[1] >= g[1] - 1 and b[2] <= g[2] + 1 and b[3] <= g[3] + 1 for g in fr)]
    rows = sorted(fr, key=lambda b: (round(b[1] / 8), b[0]))
    return rows
def txt(p, b):
    c = p.within_bbox((max(0, b[0]), max(0, b[1]), min(float(p.width), b[2]), min(float(p.height), b[3])), strict=False)
    return clean(c.extract_text(use_text_flow=True, x_tolerance=1.5) or '')
def card_title(p, b):
    c = p.within_bbox((b[0], b[1], b[2], min(b[1] + 48, b[3])), strict=False)
    big = c.filter(lambda o: o.get('object_type') != 'char' or ('Prompt' in o.get('fontname', '') and o.get('size', 0) >= 9.5))
    t = clean(big.extract_text(use_text_flow=True, x_tolerance=1.5) or '').replace('\n', ' ').strip()
    tag = c.filter(lambda o: o.get('object_type') != 'char' or ('Prompt' in o.get('fontname', '') and o.get('size', 0) < 9.5))
    g = clean(tag.extract_text(use_text_flow=True, x_tolerance=3) or '').split('\n')[0].strip()
    return t, re.sub(r'(?<=[A-Z0-9·&/+-]) (?=[A-Z0-9·&/+-])', '', g) if g else ''
def head_title(p):
    h = p.within_bbox((0, 0, float(p.width), 92), strict=False)
    sz = sorted({round(c['size'], 1) for c in h.chars if 'Prompt' in c['fontname'] and not c['text'].isdigit()}, reverse=True)
    big = h.filter(lambda o: o.get('object_type') != 'char' or (round(o.get('size', 0), 1) == sz[0] and 'Prompt' in o.get('fontname', '')))
    return re.sub(r'\s+', ' ', clean(big.extract_text(use_text_flow=True, x_tolerance=1.5) or '').replace('\n', ' ')).strip()
def run(src1, src2):
    if os.path.isdir(OUT):
        for n in os.listdir(OUT):
            q = os.path.join(OUT, n); shutil.rmtree(q) if os.path.isdir(q) else os.remove(q)
    os.makedirs(os.path.join(OUT, 'c'), exist_ok=True)
    tmp = tempfile.mkdtemp()
    pages = []; n = 0; ranges = {}
    qr = json.load(open(os.path.join(HERE, 'ekg_qr.json'), encoding='utf8')) if os.path.exists(os.path.join(HERE, 'ekg_qr.json')) else {}
    for vol, src in ((1, src1), (2, src2)):
        shutil.copy(src, OUT)
        subprocess.run(['pdftoppm', '-r', str(DPI), '-png', src, os.path.join(tmp, 'v%d' % vol)], check=True)
        pngs = sorted(f for f in os.listdir(tmp) if f.startswith('v%d-' % vol))
        with pdfplumber.open(src) as pdf:
            for pi, p in enumerate(pdf.pages):
                n += 1; symbols(p); W, H = float(p.width), float(p.height)
                im = Image.open(os.path.join(tmp, pngs[pi])).convert('RGB'); IW, IH = im.size
                im.save(os.path.join(OUT, 'p%02d.webp' % n), 'WEBP', quality=72, method=6)
                ttl = head_title(p); boxes = []
                for bi, b in enumerate(cards(p)):
                    t, tag = card_title(p, b)
                    x = txt(p, b)
                    key = '%d-%d' % (vol, pi + 1) + ':' + str(bi)
                    bx = {'t': t or tag or 'กล่อง %d' % (bi + 1), 'bb': [round(b[0] / W, 5), round(b[1] / H, 5), round((b[2] - b[0]) / W, 5), round((b[3] - b[1]) / H, 5)],
                          'sz': [round((b[2] - b[0]) * 1.55), round((b[3] - b[1]) * 1.55)], 'x': x}
                    if tag: bx['tag'] = tag
                    ls = qr.get('%d-%d' % (vol, pi + 1), [])
                    lk = [q for q in ls if b[0] <= q['x'] <= b[2] and b[1] <= q['y'] <= b[3]]
                    if lk: bx['links'] = [{'t': q['t'], 'u': q['u']} for q in lk]
                    boxes.append(bx)
                    box = (max(0, int(b[0] / W * IW) - 2), max(0, int(b[1] / H * IH) - 2), min(IW, int(b[2] / W * IW) + 3), min(IH, int(b[3] / H * IH) + 3))
                    im.crop(box).save(os.path.join(OUT, 'c', '%d-0-%d.webp' % (n, bi)), 'WEBP', quality=72, method=6)
                for ck in CHK.get('%d-%d' % (vol, pi + 1), []):
                    bx = next((q for q in boxes if ck['find'] in q['x'] or ck['find'] in q['t']), None)
                    if not bx: raise SystemExit('check not placed: ' + ck['find'])
                    bx.setdefault('chk', []).append({k: ck[k] for k in ('lv', 'tx', 'src') if k in ck})
                    bx['x'] += '\n[หมายเหตุจากการตรวจข้อมูล: ' + ck['tx'] + ']'
                outside = [c for c in p.chars if 92 < c['top'] < H - 42 and not any(b[0] - 1 <= c['x0'] and c['x1'] <= b[2] + 1 and b[1] - 1 <= c['top'] and c['bottom'] <= b[3] + 1 for b in cards(p))]
                if outside: print('! outside cards', vol, pi + 1, len(outside), ''.join(c['text'] for c in outside)[:80])
                pages.append({'n': n, 't': 'เล่ม %d หน้า %d · %s' % (vol, pi + 1, ttl), 'full': ttl, 'img': [IW, IH], 'lay': 1,
                              'note': 'เลขหน้าที่อ้างในเนื้อหาคือเลขหน้าในเล่มนั้น · ภาพ ECG ในเล่มเป็นภาพจำลอง (25 mm/s · 10 mm/mV)',
                              'cols': [{'h': '', 'boxes': boxes}]})
                print(n, ttl, '|', len(boxes), [q['t'][:28] for q in boxes][:12])
    n1 = 9
    groups = [{'id': 'v1', 't': 'เล่ม 1 · Field Manual (พื้นฐาน → บนวอร์ด)', 'pages': list(range(1, n1 + 1)), 'fold': 1},
              {'id': 'v2', 't': 'เล่ม 2 · Deep Dive (เชิงลึก)', 'pages': list(range(n1 + 1, n - 1)), 'fold': 1},
              {'id': 'test', 't': 'Self-test · 16 strips + 10 คำถามเร็ว', 'pages': [n - 1, n], 'fold': 1}]
    json.dump({'groups': groups, 'pages': pages}, open(os.path.join(OUT, 'data.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    shutil.rmtree(tmp)
run(sys.argv[1], sys.argv[2])
