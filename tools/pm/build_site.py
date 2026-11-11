"""pmout (from extract.py) -> docs/pm/*.json, docs/pm/img, docs/pm/search.json, docs/data/pm.js"""
import json, os, re, sys, shutil, html, time
SRC, DOCS = sys.argv[1], sys.argv[2]
CH = [  # (book chapter, id, title, th, system id)
    ('CARDIOLOGY', 'cardio', 'Cardiology', 'หัวใจและหลอดเลือด', 'cvs'),
    ('PULMONARY', 'pulm', 'Pulmonary', 'ปอด + ICU', 'resp'),
    ('GASTROENTEROLOGY', 'gi', 'Gastroenterology', 'ทางเดินอาหารและตับ', 'gi'),
    ('NEPHROLOGY', 'neph', 'Nephrology', 'ไต กรด-ด่าง เกลือแร่', 'renal'),
    ('HEMATOLOGY-ONCOLOGY', 'heme', 'Hematology-Oncology', 'เลือดและมะเร็ง', 'heme'),
    ('INFECTIOUS DISEASES', 'id', 'Infectious Diseases', 'โรคติดเชื้อ', 'id'),
    ('ENDOCRINOLOGY', 'endo', 'Endocrinology', 'ต่อมไร้ท่อ', 'endo'),
    ('RHEUMATOLOGY', 'rheum', 'Rheumatology', 'รูมาติก', 'msk'),
    ('NEUROLOGY', 'neuro', 'Neurology', 'ประสาท', 'neuro'),
    ('CONSULTS', 'consult', 'Consults', 'ศัลย์ · สูติ-นรี · จักษุ', 'other'),
    ('APPENDIX', 'appx', 'Appendix', 'ยา ICU · ยาปฏิชีวนะ · สูตร · ACLS', 'other'),
    ('ABBREVIATIONS', 'abbr', 'Abbreviations', 'ตัวย่อทั้งเล่ม', 'other'),
]
SYSC = {'cvs': '#A33A3A', 'resp': '#3E7CA6', 'gi': '#C9952E', 'renal': '#3C4A7A', 'neuro': '#4A5560', 'endo': '#5C7F3A',
        'heme': '#9B4F2E', 'id': '#2F7466', 'msk': '#7A5C3E', 'other': '#8A8F86'}


def plain(h):
    return html.unescape(re.sub(r'<[^>]+>', '', h.replace('<span class="gap"></span>', '  ')))


topics = json.load(open(os.path.join(SRC, '_topics.json')))
out = os.path.join(DOCS, 'pm'); os.makedirs(os.path.join(out, 'img'), exist_ok=True)
for f in os.listdir(os.path.join(SRC, 'img')):
    shutil.copyfile(os.path.join(SRC, 'img', f), os.path.join(out, 'img', f))
search = []; chapters = {c[1]: {'id': c[1], 't': c[2], 'th': c[3], 'sys': c[4], 'c': SYSC[c[4]], 'topics': []} for c in CH}
bych = {c[0]: c[1] for c in CH}
for t in topics:
    T = json.load(open(os.path.join(SRC, t['id'] + '.json')))
    secs = [{'h': '', 'n': 0}]; nimg = 0
    for b in T['b']:
        if b[0] == 'h2': secs.append({'h': b[1], 'n': 0}); continue
        secs[-1]['n'] += 1
        if b[0] == 'img': nimg += 1
    # search: one row per section — section 0 = before the first h2 (intro), k = k-th h2 (same numbering as the client)
    si = 0; rows = [{'c': t['id'], 's': 0, 'h': '', 'x': []}]
    for b in T['b']:
        if b[0] == 'h2': si += 1; rows.append({'c': t['id'], 's': si, 'h': plain(b[1]).strip(), 'x': []}); continue
        cur = rows[-1]
        if b[0] == 'h3': cur['x'].append('## ' + plain(b[1]).strip())
        elif b[0] == 'p': cur['x'].append(plain(b[1]).strip())
        elif b[0] == 'img' and b[4]: cur['x'].append('[ตาราง/รูป] ' + b[4])
    search.extend(r for r in rows if r['h'] or r['x'])
    T['v'] = 1
    json.dump(T, open(os.path.join(out, t['id'] + '.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    heads = [plain(s['h']).strip() for s in secs if s['h']]
    chapters[bych[t['ch']]]['topics'].append({'id': t['id'], 't': t['t'], 'p': [t['p'][0], t['p'][1]], 'h': heads, 'i': nimg})
for r in search: r['x'] = '\n'.join(r['x'])
json.dump(search, open(os.path.join(out, 'search.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
v = int(time.time()) // 60
data = {'v': v, 'book': {'title': 'Pocket Medicine', 'ed': '8th edition (2022)', 'by': 'Marc S. Sabatine · Massachusetts General Hospital',
                         'pages': 705}, 'chapters': [chapters[c[1]] for c in CH]}
open(os.path.join(DOCS, 'data', 'pm.js'), 'w').write(
    '/* Pocket Medicine 8e — สร้างอัตโนมัติจาก tools/pm/build_site.py (อย่าแก้มือ) · เนื้อหาแต่ละเรื่องอยู่ใน pm/<id>.json */\nwindow.POY_PM = ' +
    json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('topics', len(topics), 'search rows', len(search), 'v', v)
