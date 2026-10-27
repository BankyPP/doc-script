#!/usr/bin/env python3
"""สร้างห้องฝึกโพยหมอใน Claude (artifact) จากหัวข้อ Random Topic Summary ทั้งหมด
ใช้: python3 tools/claude-room/build.py <ไฟล์ html ที่จะ publish>
อ่าน docs/data/topics.js + docs/topics/<id>/data.json (ข้อความของทุกกล่อง) + ระดับความยากจาก app.js + config.js
แล้วฝังเป็น JSON ใน room.html — เพิ่มหัวข้อใหม่บนเว็บเมื่อไร ให้รันใหม่แล้ว publish ทับ artifact เดิม (URL เดิม)"""
import json, os, re, subprocess, sys, datetime
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DOCS = os.path.join(ROOT, 'docs')
js = r'''
global.window={};require(process.argv[1]+'/data/topics.js');require(process.argv[1]+'/data/config.js');
process.stdout.write(JSON.stringify({topics:window.POY_TOPICS,def:window.POY_TOPIC_DEFAULTS,cfg:{year:window.POY_CONFIG.currentYear,site:window.POY_CONFIG.siteUrl||''}}));'''
meta = json.loads(subprocess.check_output(['node', '-e', js, DOCS]))
app = open(os.path.join(DOCS, 'app.js'), encoding='utf8').read()
lv = re.search(r"var LEVELS = \[(.*?)\n  \];", app, re.S).group(1)
levels = [[a, b] for a, b in re.findall(r"\['([^']+)', '([^']+)'", lv)]
assert len(levels) == 5, levels
topics = []
for t in meta['topics']:
    d = json.load(open(os.path.join(DOCS, t['dir'], 'data.json'), encoding='utf8'))
    units = []
    for p in d['pages']:
        for ci, c in enumerate(p['cols']):
            if c['boxes']:
                for bi, b in enumerate(c['boxes']):
                    units.append({'k': '%d-%d-%d' % (p['n'], ci, bi), 'p': p['n'], 'pt': p['t'], 'h': c.get('h', ''), 't': b.get('t') or c.get('h') or 'คอลัมน์ %d' % (ci + 1), 'x': b.get('x', '')})
            else:
                units.append({'k': '%d-%d' % (p['n'], ci), 'p': p['n'], 'pt': p['t'], 'h': c.get('h', ''), 't': c.get('h') or 'คอลัมน์ %d' % (ci + 1), 'x': c.get('x', '')})
    topics.append({k: t.get(k) for k in ('id', 'title', 'th', 'c', 'source', 'mix', 'testPages', 'focusPh') if t.get(k) is not None} | {'groups': d['groups'], 'units': units})
site = meta['cfg']['site'] or 'https://bankypp.github.io/doc-script/'
data = {'topics': topics, 'mix': (meta['def'] or {}).get('mix'), 'levels': levels, 'year': meta['cfg']['year'], 'site': site, 'maxLink': 40,
        'built': datetime.date.today().strftime('%d/%m/%Y')}
blob = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
tpl = open(os.path.join(os.path.dirname(__file__), 'room.html'), encoding='utf8').read()
out = tpl.replace('/*DATA*/', blob)
open(sys.argv[1], 'w', encoding='utf8').write(out)
print('topics', [t['id'] for t in topics], 'units', sum(len(t['units']) for t in topics), 'bytes', len(out.encode()))
