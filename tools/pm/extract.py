"""Pocket Medicine 8e PDF -> per-topic JSON blocks + crops for tables/figures.

Usage: python3 -I extract.py <pdf> <outdir> [pages a-b for debug]
The PDF's text has no usable ToUnicode: Helvetica GIDs 3..97 = ASCII-29; others mapped below.
Arrows, check marks, sex symbols etc. are vector drawings -> matched by path signature.
"""
import sys, os, json, re, html, collections
import pymupdf
from PIL import Image

PDF, OUT = sys.argv[1], sys.argv[2]
RANGE = None
if len(sys.argv) > 3:
    a, b = sys.argv[3].split('-'); RANGE = (int(a), int(b))

GH = {135: '•', 192: 'fi', 178: '–', 193: 'fl', 183: '’', 149: '≥', 147: '±', 181: '”', 180: '“', 240: '×',
      131: '°', 1115: 'β', 1091: 'Δ', 148: '≤', 172: ' ', 1114: 'α', 668: '≈', 151: 'µ', 168: 'Δ', 124: 'ö',
      244: '½', 1125: 'μ', 145: 'Ø', 574: '′', 1370: '∇', 112: 'é', 179: '—', 111: 'ç', 1116: 'γ', 658: '≠',
      1117: 'δ', 1118: 'ε', 245: '¼', 158: '°', 171: '…', 243: '³', 139: '©', 246: '¾', 242: '²', 1134: 'φ',
      583: '″', 1136: 'ψ', 115: 'ë', 103: 'Ö', 1111: 'Ω', 221: '°', 129: 'ü', 1110: 'Ψ', 184: '÷', 161: 'ø',
      239: '−', 1123: 'κ', 182: '‘', 130: '†', 119: 'ï', 113: 'è', 1124: 'λ', 106: 'à'}
GA = {647: '⊕', 648: '⊖', 550: '∴', 1822: '∝', 824: '↑', 503: '∅', 826: '↓'}  # AppleSymbols
GL = {928: '↓', 926: '↑', 927: '→', 464: 'φ'}  # LucidaGrande
DRAWN = {0: '↑', 1: '↓', 2: '→', 4: '✓', 5: '♂', 6: '♀', 7: 'Φ', 8: '⅓', 11: '⅔', 13: '⅙', 14: '↔', 16: '⊕', 19: '∴', 20: '↓'}
# draws.json = รูปร่างสัญลักษณ์ที่วาดเป็นเส้น (เรียงตามความถี่ทั้งเล่ม) → index ใน DRAWN
_items = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'draws.json')))
DSIG = {(k[0], k[1], tuple(tuple(p) for p in k[2])): DRAWN.get(i, '') for i, (k, n) in enumerate(_items)}


def gchar(font, g):
    if font.startswith('Helvetica'):
        if 3 <= g <= 97: return chr(g + 29)
        return GH.get(g, '')
    if font.startswith('AppleSymbols'): return GA.get(g, '')
    if font.startswith('LucidaGrande'): return GL.get(g, '')
    return ''


def dsig(d):
    r = d['rect']; w = max(r.width, 0.01); h = max(r.height, 0.01); pts = []
    for it in d['items']:
        for p in it[1:]:
            if isinstance(p, pymupdf.Point): pts.append((round((p.x - r.x0) / w * 4), round((p.y - r.y0) / h * 4)))
    return (len(d['items']), round(w / h, 1), tuple(pts[:12]))


def colr(c):
    if not c: return 'k'
    r, g, b = c[:3]
    if r > 0.9 and g > 0.9 and b > 0.9: return 'w'
    if g > 0.3 and r < 0.25 and g > r + 0.15: return 'g'
    return 'k'


class Ch:
    __slots__ = ('c', 'x0', 'y0', 'x1', 'y1', 'oy', 'sz', 'b', 'i', 'col')

    def __init__(s, c, bb, oy, sz, b, i, col):
        s.c = c; s.x0, s.y0, s.x1, s.y1 = bb; s.oy = oy; s.sz = sz; s.b = b; s.i = i; s.col = col


def page_chars(p):
    chars = []
    for s in p.get_texttrace():
        f = s['font']; sz = s['size']; col = colr(s['color'])
        b = 'Bold' in f; it = 'Oblique' in f
        for c in s['chars']:
            ch = gchar(f, c[1])
            if not ch: continue
            bb = c[3]
            if bb[2] - bb[0] <= 0: continue
            chars.append(Ch(ch, bb, c[2][1], sz, b, it, col))
    return chars


def regions_and_inline(p, B):
    """returns (regions[list of Rect], inline drawn chars, title band rect or None)"""
    PR = p.rect
    struct = []; inline = []; band = None
    for d in p.get_drawings():
        r = d['rect']
        if r.width <= 0 and r.height <= 0: continue
        if r.height > PR.height * 1.5 or r.width > PR.width * 1.2: continue  # background
        fill = d.get('fill'); stroke = d.get('color')
        if fill and all(x > 0.97 for x in fill[:3]) and not stroke: continue  # white
        if r.width < 16 and r.height < 16 and fill is not None and r.width > 1 and r.height > 1:
            ch = DSIG.get(dsig(d))
            if ch is not None:
                inline.append((ch, r)); continue
        if fill and colr(fill) == 'g' and r.height > 25 and r.width > 150 and band is None:
            band = r; continue
        struct.append(r)
    # cluster
    rs = [pymupdf.Rect(r) for r in struct]
    clusters = []
    for r in rs:
        rr = pymupdf.Rect(r.x0 - 3, r.y0 - 3, r.x1 + 3, r.y1 + 3)
        hit = [c for c in clusters if c['bb'].intersects(rr)]
        nc = {'bb': pymupdf.Rect(r), 'n': 1}
        for c in hit:
            nc['bb'] |= c['bb']; nc['n'] += c['n']; clusters.remove(c)
        clusters.append(nc)
    # repeat merge until stable
    changed = True
    while changed:
        changed = False
        for i in range(len(clusters)):
            for j in range(i + 1, len(clusters)):
                a, b2 = clusters[i]['bb'], clusters[j]['bb']
                if pymupdf.Rect(a.x0 - 3, a.y0 - 3, a.x1 + 3, a.y1 + 3).intersects(b2):
                    clusters[i]['bb'] |= b2; clusters[i]['n'] += clusters[j]['n']; del clusters[j]; changed = True; break
            if changed: break
    regs = [c['bb'] for c in clusters if c['n'] >= 3 and c['bb'].height > 1.5 * B and c['bb'].width > 40]
    for im in p.get_image_info():
        r = pymupdf.Rect(im['bbox']) & PR
        if r.width > 20 and r.height > 12: regs.append(r)
    return regs, inline, band


def merge_regs(regs):
    regs = [pymupdf.Rect(r) for r in regs]
    changed = True
    while changed:
        changed = False
        for i in range(len(regs)):
            for j in range(i + 1, len(regs)):
                a = regs[i]
                if pymupdf.Rect(a.x0, a.y0 - 2, a.x1, a.y1 + 2).intersects(regs[j]):
                    regs[i] = a | regs[j]; del regs[j]; changed = True; break
            if changed: break
    return regs


def group_lines(chars, B):
    main = sorted([c for c in chars if c.sz >= 0.86 * B or c.col == 'w'], key=lambda c: (round(c.oy, 0), c.x0))
    small = [c for c in chars if not (c.sz >= 0.86 * B or c.col == 'w')]
    lines = []
    for c in sorted(main, key=lambda c: c.oy):
        for L in lines[-4:]:
            if abs(L['oy'] - c.oy) < 0.35 * c.sz:
                L['ch'].append(c); break
        else:
            lines.append({'oy': c.oy, 'ch': [c], 'sz': c.sz})
    for c in sorted(small, key=lambda c: c.oy):
        best = None
        for L in lines:
            d = c.oy - L['oy']
            if -0.75 * L['sz'] < d < 0.55 * L['sz']:
                # must overlap horizontally-ish with line span or be adjacent
                if best is None or abs(d) < abs(best[0]): best = (d, L)
        if best:
            best[1]['ch'].append(c)
        else:
            for L in lines:
                if L.get('smallonly') and abs(L['oy'] - c.oy) < 0.35 * c.sz:
                    L['ch'].append(c); break
            else:
                lines.append({'oy': c.oy, 'ch': [c], 'sz': c.sz, 'smallonly': True})
    for L in lines:
        L['ch'].sort(key=lambda c: c.x0)
        L['x0'] = L['ch'][0].x0; L['x1'] = max(c.x1 for c in L['ch'])
        L['y0'] = min(c.y0 for c in L['ch']); L['y1'] = max(c.y1 for c in L['ch'])
    lines.sort(key=lambda L: L['oy'])
    return lines


def esc(s): return html.escape(s, quote=False)


def line_html(L, B):
    """-> (html, plain, firstwordwidth, meta)"""
    chs = L['ch']
    mains = [c for c in chs if c.sz >= 0.86 * L['sz']] or chs
    base = sorted(c.oy for c in mains)[len(mains) // 2]
    msz = max(c.sz for c in mains)
    out = []; plain = []; cur = None; buf = []; prev = None
    def flush():
        if not buf: return
        t = esc(''.join(buf)); st = cur
        if st[2]: t = '<i>' + t + '</i>'
        if st[1]: t = '<b>' + t + '</b>'
        if st[3] == 'g': t = '<span class="g">' + t + '</span>'
        if st[0] in ('sub', 'sup'): t = '<' + st[0] + '>' + t + '</' + st[0] + '>'
        elif st[0] == 'sm': t = '<small>' + t + '</small>'
        out.append(t); buf.clear()
    for c in chs:
        if c.sz < 0.86 * msz and not L.get('smallonly'):
            if c.oy > base + 0.12 * msz: v = 'sub'
            elif c.oy < base - 0.22 * msz: v = 'sup'
            else: v = 'sm'
        elif L.get('smallonly'): v = 'sm'
        else: v = ''
        ch = c.c
        if prev is not None and ch != ' ' and prev.c != ' ':
            gap = c.x0 - prev.x1
            if gap > 1.6 * B:
                flush(); out.append('<span class="gap"></span>'); plain.append('  ')
            elif gap > 0.22 * c.sz and v == '' and not (prev.c in '([/' or ch in ').,;:/'):
                ch = ' ' + ch
        if ch == ' ' and prev is not None and prev.c == ' ': prev = c; continue
        st = (v, c.b and c.col != 'w', c.i, c.col if c.col == 'g' else '')
        if st != cur: flush(); cur = st
        buf.append(ch); plain.append(ch); prev = c
    flush()
    h = ''.join(out)
    for _ in range(3):
        for tg in ('small', 'sub', 'sup', 'span class="g"', 'b', 'i'):
            cl = tg.split()[0]
            h = h.replace('</%s><%s>' % (cl, tg), '')
        h = re.sub(r'</b>(\s+)<b>', r'\1', h); h = re.sub(r'</i>(\s+)<i>', r'\1', h)
    h = h.replace('<b> </b>', ' ').replace('<i> </i>', ' ')
    txt = ''.join(plain)
    # first word width
    fw = 0; first = None
    for c in chs:
        if c.c == ' ' and first is not None: break
        if c.c != ' ':
            if first is None: first = c.x0
            fw = c.x1 - first
    nonsp = [c for c in chs if c.c.strip()]
    meta = {
        'bullet': bool(nonsp) and nonsp[0].c == '•',
        'allg': bool(nonsp) and all(c.col == 'g' for c in nonsp),
        'firstg_b': bool(nonsp) and nonsp[0].col == 'g' and nonsp[0].b,
        'white': bool(nonsp) and all(c.col == 'w' for c in nonsp),
        'upper': sum(1 for c in nonsp if c.c.isupper()) / max(1, sum(1 for c in nonsp if c.c.isalpha())),
        'bold': bool(nonsp) and sum(1 for c in nonsp if c.b) / len(nonsp) > 0.8,
        'textx': next((c.x0 for c in nonsp[1:] if nonsp[0].c == '•'), nonsp[0].x0 if nonsp else L['x0']),
        'bx': nonsp[0].x0 if nonsp else L['x0'],
        'big': msz >= 1.25 * B,
    }
    return h, txt, fw, meta


def main():
    doc = pymupdf.open(PDF)
    os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)
    titles = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'toc.json')))
    tstart = {t['p']: t for t in titles}
    pages = range(RANGE[0], RANGE[1] + 1) if RANGE else range(len(doc))
    topics = []; T = None; prev = None; nimg = collections.Counter()
    for pno in pages:
        if pno in tstart:
            t = tstart[pno]
            T = {'id': t['id'], 'ch': t['ch'], 't': t['t'], 'p': [pno, pno], 'b': []}; topics.append(T); prev = None
        if T is None or T.get('skip'): continue
        if pno > t_end(titles, T): continue
        T['p'][1] = pno
        p = doc[pno]
        chars = page_chars(p)
        if not chars and not p.get_image_info(): continue
        szc = collections.Counter()
        for c in chars: szc[round(c.sz, 1)] += 1
        B = szc.most_common(1)[0][0] if szc else 12
        regs, inline, band = regions_and_inline(p, B)
        for ch, r in inline:
            chars.append(Ch(ch, (r.x0, r.y0, r.x1, r.y1), r.y1 + 0.18 * B, B, False, False, 'k'))
        # expand regions by chars inside
        regs = merge_regs(regs)
        for _ in range(2):
            new = []
            for r in regs:
                rr = pymupdf.Rect(r)
                for c in chars:
                    cx = (c.x0 + c.x1) / 2; cy = (c.y0 + c.y1) / 2
                    if r.x0 - 1 <= cx <= r.x1 + 1 and r.y0 - 1 <= cy <= r.y1 + 1:
                        rr |= pymupdf.Rect(c.x0, c.y0, c.x1, c.y1)
                new.append(rr)
            regs = merge_regs(new)
        inreg = lambda c: any(r.x0 - 1 <= (c.x0 + c.x1) / 2 <= r.x1 + 1 and r.y0 - 1 <= (c.y0 + c.y1) / 2 <= r.y1 + 1 for r in regs)
        rtext = {i: [] for i in range(len(regs))}
        flow = []
        for c in chars:
            hit = None
            for i, r in enumerate(regs):
                if r.x0 - 1 <= (c.x0 + c.x1) / 2 <= r.x1 + 1 and r.y0 - 1 <= (c.y0 + c.y1) / 2 <= r.y1 + 1: hit = i; break
            if hit is None: flow.append(c)
            else: rtext[hit].append(c)
        lines = group_lines(flow, B)
        items = [('L', L['oy'], L) for L in lines] + [('R', r.y0, (i, r)) for i, r in enumerate(regs)]
        items.sort(key=lambda x: x[1])
        body = [L for L in lines if not L.get('smallonly')]
        margin = min((L['x0'] for L in body), default=72)
        right = max((L['x1'] for L in body), default=540)
        first_on_page = True
        for kind, _, obj in items:
            if kind == 'R':
                i, r = obj
                if not rtext[i] and r.height < 30 and not any(pymupdf.Rect(im['bbox']).intersects(r) for im in p.get_image_info()):
                    continue  # leftover table border at a page break
                clip = pymupdf.Rect(r.x0 - 4, r.y0 - 4, r.x1 + 4, r.y1 + 4) & p.rect
                pix = p.get_pixmap(dpi=170, clip=clip)
                nimg[T['id']] += 1
                fn = '%s-%d.webp' % (T['id'], nimg[T['id']])
                im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
                im.save(os.path.join(OUT, 'img', fn), 'WEBP', lossless=True, method=4)
                rl = group_lines(rtext[i], B) if rtext[i] else []
                alt = ' / '.join(line_html(L, B)[1].strip() for L in rl)
                T['b'].append(['img', fn, pix.width, pix.height, alt, round(clip.width / max(1, right - margin), 3)])
                prev = None; first_on_page = False
                continue
            L = obj
            h, txt, fw, m = line_html(L, B)
            if not txt.strip(): continue
            if m['white']:
                continue  # topic title band text (title comes from toc)
            if m['allg'] and m['upper'] > 0.8 and len(txt.strip()) >= 3 and (m['bold'] or m['big']):
                if prev and prev['k'] == 'h2' and L['oy'] - prev['oy'] < 1.6 * B:
                    T['b'][-1][1] += ' ' + h; prev['oy'] = L['oy']; continue
                T['b'].append(['h2', h]); prev = {'k': 'h2', 'oy': L['oy']}; first_on_page = False; continue
            if m['firstg_b'] and not m['bullet']:
                T['b'].append(['h3', h]); prev = {'k': 'h3', 'oy': L['oy'], 'x0': L['x0'], 'x1': L['x1'], 'right': right}; first_on_page = False; continue
            if prev and prev['k'] == 'h3' and m['allg'] and L['x0'] > prev['x0'] + 2 and L['oy'] - prev['oy'] < 1.6 * B:
                T['b'][-1][1] += ' ' + h; prev['oy'] = L['oy']; continue
            cont = False
            if prev and prev['k'] == 'p' and not m['bullet'] and T['id'] != 'abbreviations':
                wrapped = prev['x1'] + 0.35 * B + fw > prev['right'] - 2
                near = first_on_page or (L['oy'] - prev['oy'] < 1.75 * B)
                deeper = (L['x0'] > prev['tx'] + 0.3 * B and L['x0'] <= prev['tx'] + 3.5 * B) or \
                         (not prev['bul'] and prev['ind'] == 0 and abs(L['x0'] - prev['tx']) < 1.5)
                if wrapped and near and deeper: cont = True
            if cont:
                last = T['b'][-1]
                sep = '' if last[1].endswith('-') or last[1].endswith('/') else ' '
                last[1] += sep + h
                prev.update(oy=L['oy'], x1=L['x1'], right=right)
            else:
                if m['bullet']:
                    h = re.sub(r'•\s*', '', h, count=1)
                    ind = (m['bx'] - margin) / B
                else:
                    ind = (L['x0'] - margin) / B
                T['b'].append(['p', h.strip(), round(max(0, ind) * 2) / 2, 1 if m['bullet'] else 0])
                prev = {'k': 'p', 'oy': L['oy'], 'x1': L['x1'], 'right': right, 'tx': m['textx'] if m['bullet'] else L['x0'], 'bul': m['bullet'], 'ind': T['b'][-1][2]}
            first_on_page = False
    for T in topics:
        json.dump(T, open(os.path.join(OUT, T['id'] + '.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    json.dump([{k: T[k] for k in ('id', 'ch', 't', 'p')} for T in topics], open(os.path.join(OUT, '_topics.json'), 'w'), ensure_ascii=False)
    print('topics', len(topics), 'imgs', sum(nimg.values()))


def t_end(titles, T):
    for i, t in enumerate(titles):
        if t['id'] == T['id']:
            return t['end']
    return 10 ** 6


if __name__ == '__main__':
    main()
