# ตารางหน้า 1–2 (Heart sounds / Murmurs): แถว = หัวข้อย่อย, ช่อง = cells
import pdfplumber, json, re, sys
SRC, OUT = sys.argv[1], sys.argv[2]
pdf = pdfplumber.open(SRC)
def clean(t):
    t = (t or '').replace('\x00', '')
    t = re.sub(r'[ \t]{2,}', ' ', t)
    return '\n'.join(l.strip() for l in t.split('\n') if l.strip())
def txt(p, bb):
    W, H = float(p.width), float(p.height)
    c = p.crop((max(0, bb[0] - 2), max(0, bb[1] - 4), min(W, bb[2] + 2), min(H, bb[3] + 4)))
    c = c.filter(lambda o: o.get('object_type') != 'char' or (bb[0] <= (o['x0'] + o['x1']) / 2 <= bb[2] and bb[1] <= (o['top'] + o['bottom']) / 2 <= bb[3]))
    return clean(c.extract_text(x_tolerance=1.5))
def hexc(c): return '#%02X%02X%02X' % tuple(int(round(v * 255)) for v in c[:3])
pages = []
for p in pdf.pages[:2]:
    W, H = float(p.width), float(p.height)
    xs = sorted({round(l['x0'], 1) for l in p.lines if abs(l['x0'] - l['x1']) < 1 and l['bottom'] - l['top'] > 5 and l['top'] > 100})
    hs = sorted({round(l['top'], 1) for l in p.lines if abs(l['top'] - l['bottom']) < 1 and l['x0'] < 20})
    # แถบหัวคอลัมน์ = rect เล็กเรียงตาม xs ที่อยู่บนสุดของตาราง
    bar0 = min(r['top'] for r in p.rects if r['x1'] - r['x0'] > 1000 and r['top'] > 100)
    hrects = sorted([r for r in p.rects if 90 < r['top'] and r['bottom'] <= bar0 + .6 and r['x1'] - r['x0'] < 300 and r['bottom'] - r['top'] > 10], key=lambda r: r['x0'])
    thead = (17.0, hrects[0]['top'], 1173.5, hrects[0]['bottom'])
    heads = [txt(p, (r['x0'], r['top'], r['x1'], r['bottom'])).replace('\n', ' ') for r in hrects]
    hcol = [hexc(r['non_stroking_color']) for r in hrects]
    bars = sorted([r for r in p.rects if r['x1'] - r['x0'] > 1000 and r['top'] > 100], key=lambda r: r['top'])
    # กรอบโค้งด้านบน/ล่าง
    fr = sorted({(round(c['x0'], 1), round(c['top'], 1), round(c['x1'], 1), round(c['bottom'], 1)) for c in p.curves if c['x1'] - c['x0'] > 200 and c['bottom'] - c['top'] > 20})
    outer = [f for f in fr if not any(g != f and g[0] <= f[0] + .5 and g[1] <= f[1] + .5 and g[2] >= f[2] - .5 and g[3] >= f[3] - .5 for g in fr)]
    topf = sorted([f for f in outer if f[3] < 120], key=lambda f: f[0])
    botf = sorted([f for f in outer if f[1] > 700], key=lambda f: f[0])
    titleb = [r for r in p.rects if r['top'] < 20 and r['x0'] < 18 and r['x1'] - r['x0'] > 200][0]
    P = {'n': p.page_number, 'W': W, 'H': H, 'heads': heads, 'hcol': hcol, 'thead': thead, 'cols': []}
    top = {'h': 'ภาพรวม', 'boxes': []}
    tb = (titleb['x0'], titleb['top'], titleb['x1'], titleb['bottom'])
    top['boxes'].append({'title': txt(p, (tb[0], tb[1], tb[2], tb[1] + 30)).split('\n')[0], 'bb': tb, 'text': txt(p, tb)})
    for f in topf:
        top['boxes'].append({'title': txt(p, (f[0], f[1], f[2], f[1] + 14)).split('\n')[0], 'bb': f, 'text': txt(p, f)})
    P['cols'].append(top)
    for bi, bar in enumerate(bars):
        y0 = bar['bottom']; y1 = bars[bi + 1]['top'] if bi + 1 < len(bars) else max(hs)
        lines = [y for y in hs if y0 - .6 <= y <= y1 + .6]
        C = {'h': txt(p, (bar['x0'], bar['top'], bar['x1'], bar['bottom'])).replace('\n', ' '), 'c': hexc(bar['non_stroking_color']), 'boxes': []}
        for a, b in zip(lines, lines[1:]):
            cells = [(xs[i], a, xs[i + 1], b) for i in range(len(xs) - 1)]
            ct = [txt(p, c) for c in cells]
            ins = lambda o, k: cells[0][0] <= (o['x0'] + o['x1']) / 2 <= cells[0][2] and cells[0][1] <= (o['top'] + o['bottom']) / 2 <= cells[0][3] and (('Kanit' in o['fontname']) == k)
            title = clean(p.filter(lambda o: o.get('object_type') == 'char' and ins(o, True)).extract_text(x_tolerance=1.5)).replace('\n', ' ')
            sub = clean(p.filter(lambda o: o.get('object_type') == 'char' and ins(o, False)).extract_text(x_tolerance=1.5)).replace('\n', ' ')
            text = '\n'.join(('%s: %s' % (heads[i], ct[i].replace('\n', ' '))) for i in range(len(cells)) if ct[i])
            C['boxes'].append({'title': title, 'sub': sub, 'bb': (17.0, a, 1173.5, b), 'cells': cells, 'text': text})
        P['cols'].append(C)
    foot = {'h': 'สรุปท้ายหน้า', 'boxes': []}
    for f in botf:
        foot['boxes'].append({'title': txt(p, (f[0], f[1], f[2], f[1] + 13)).split('\n')[0], 'bb': f, 'text': txt(p, f)})
    P['cols'].append(foot)
    pages.append(P)
json.dump(pages, open(OUT, 'w'), ensure_ascii=False, indent=1)
for P in pages:
    print('PAGE', P['n'], P['heads'], P['hcol'])
    for C in P['cols']:
        print('  [%s]' % C['h'], [(B['title'], B.get('sub', '')) for B in C['boxes']])
