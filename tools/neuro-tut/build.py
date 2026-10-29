#!/usr/bin/env python3
"""CNS & PNS Comprehensive Tutorial 2026 (B03) → docs/gdoc/neuro-tut.json

แขวนใต้แท็บ Neuro ของ Doc โพยหมอ ผ่าน extras ใน docs/data/gdoc.js (ไม่แตะ Google Doc)
ที่มา:
  src/p1.html … p8.html  ไฟล์สรุป 10 หน้า (หน้า 1–8) — ดึงทีละกล่อง (div.box) ตามชื่อหัวกล่อง
  src/extra.html         กล่องเสริมจากไฟล์ต้นฉบับที่ไม่ได้อยู่ในไฟล์สรุป (data-tab = แท็บปลายทาง)
  src/qa.py              คำถาม–เฉลย 145 ข้อ (หน้า 9–10)
  docs/gdoc/img/neuro-tut/pNN.webp  ภาพสไลด์ต้นฉบับ 76 หน้า · sNN.webp ไฟล์สรุป 10 หน้า · fig-*.webp รูปที่ตัดมา
รัน:  python3 tools/neuro-tut/build.py   (แล้วเพิ่ม POY_GDOC_V ใน docs/data/gdoc.js)
"""
import json, re, os, sys, datetime
from bs4 import BeautifulSoup

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(HERE, 'src')
OUT = os.path.join(ROOT, 'docs', 'gdoc', 'neuro-tut.json')
KEY = 'neuro-tut'
IMG = 'gdoc/img/neuro-tut/'
PDF = 'gdoc/files/neuro-cnspns-summary.pdf'
NPAGES = 76
FROM = 'CNS & PNS Comprehensive Tutorial 2026 (B03, Thanakit P. / Sekh T., rev. 22 Jan 2026) + สรุป 10 หน้า'
HUB = 'CNS & PNS Tutorial 2026'

# ---------------- แท็บ: (ชื่อ, แขวนใต้, [หัวกล่องที่ขึ้นต้นด้วย…]) ----------------
TABS = [
  (HUB, 'Neuro', None),
  ('Localization approach', HUB, ['Weakness – possible manifestations', 'Approach: Quadriparesis', 'Pyramidal weakness pattern',
     'Clinical course → etiology', 'Pattern → localization quick map', 'Quiz cases (เฉลยจาก slide)']),
  ('Neuro examination', HUB, ['Brainstem reflexes', 'Facial weakness & tongue', 'Motor examination', 'Rigidity vs Spasticity',
     'Sensory examination', 'Cerebellum – roles & exam', 'Ataxia 3 แบบ', 'Vertigo: Peripheral vs Central',
     'Gait · Cortical signs · Meningeal signs', 'Speech & aphasia']),
  ('High-yield tables', HUB, ['Weakness diseases: PNS', 'Brainstem & vascular syndromes – one-glance', 'Spinal cord syndromes',
     'Plexus / root lesions', 'Eye movement lesions', 'Visual field map', 'Cortical syndromes', 'Pattern → localization quick map',
     'Coma & herniation', 'Bladder & ANS', 'Skull base CN groups', 'Stroke & intracranial hemorrhage', 'CNS infections',
     'Headache & neuralgia', 'Movement disorders', 'Drug high-yield', 'Neurodegenerative / dementia', 'Key numbers to remember']),
  ('Mnemonics & red flags', HUB, ['รวม MNEMONICS ทั้งไฟล์', 'Red flags']),
  ('Quiz 145 ข้อ', HUB, 'QUIZ'),
  ('สไลด์ต้นฉบับ 76 หน้า', HUB, 'SLIDES'),
  ('ไฟล์สรุป 10 หน้า (PDF)', HUB, 'SUMMARY'),

  ('Peripheral nervous system', 'Neuroanatomy', ['PNS anatomy → โรคตามตำแหน่ง', 'Radiculopathy vs Plexopathy', 'Brachial plexus (ต้องจำ!)',
     'Myotome (ใช้ localize root)', 'Dermatome / cutaneous nerves', 'Plexus / root lesions']),
  ('Motor & sensory pathways', 'Neuroanatomy', ['Pyramidal pathway', 'DCML vs Spinothalamic vs Trigeminal']),
  ('Brainstem & cranial nerves', 'Neuroanatomy', ['Rule of 4', 'Skull base & false localizing', 'Skull base CN groups', 'Extraocular muscles']),
  ('Spinal cord', 'Neuroanatomy', ['Cord anatomy & extrinsic vs intrinsic']),
  ('Cerebral cortex & lobes', 'Neuroanatomy', ['Frontal · agnosia', 'Parietal / occipital syndromes', 'Cerebellum (CCAS)', 'Cortical syndromes']),
  ('Cerebral vasculature', 'Neuroanatomy', ['Territories & circle of Willis', 'Stroke syndromes']),
  ('Visual pathway & eye movements', 'Neuroanatomy', ['Visual field defects', 'Visual field map', 'Pupillary light reflex & RAPD',
     'CN3 palsy: pupil-involving vs sparing', 'Horizontal saccade circuit', 'Eye movement lesions']),
  ('Hypothalamus & autonomic', 'Neuroanatomy', ['Hypothalamic nuclei', 'ANS pathways']),

  ('Nerve fibers & action potential', 'Neurophysiology', ['Peripheral nerve fiber types', 'Action potential & conduction']),
  ('Reflex, tone & motor unit', 'Neurophysiology', ['Stretch reflex arc', 'UMN vs LMN', 'Motor unit · Denervation vs Myopathy']),
  ('NMJ transmission', 'Neurophysiology', ['NMJ transmission (7 steps)', 'NMJ – ตำแหน่งโรค']),
  ('Basal ganglia & dopamine', 'Neurophysiology', ['BG circuits', '4 Dopaminergic pathways', 'DA synthesis & PD drugs']),
  ('Pain physiology', 'Neurophysiology', ['Pain types & processing', 'Sensitization terms', 'Pain modulation']),
  ('Consciousness & syncope', 'Neurophysiology', ['Consciousness = Arousal × Awareness', 'Syncope']),
  ('CBF, ICP & autoregulation', 'Neurophysiology', ['CBF autoregulation · Monro–Kellie · CPP']),
  ('Bladder control', 'Neurophysiology', ['Bladder & neurogenic bladder', 'Bladder & ANS']),
  ('Memory & hearing', 'Neurophysiology', ['Tuning fork & hearing loss']),

  ('Peripheral neuropathy & GBS', 'Neuro Disorders', ['Peripheral neuropathy patterns', 'GBS – AIDP', 'DDx polyneuropathy']),
  ('NMJ disorders', 'Neuro Disorders', ['NMJ disorders by site', 'Myasthenia gravis vs LEMS', 'Paraneoplastic neurological syndromes', 'Tetanus vs Botulism']),
  ('Myopathy', 'Neuro Disorders', ['Myopathy classification & clinical', 'Motor unit · Denervation vs Myopathy']),
  ('Motor neuron disease', 'Neuro Disorders', ['ALS (Lou Gehrig', 'UMN vs LMN']),
  ('Weakness: เปรียบเทียบทุกระดับ', 'Neuro Disorders', ['Weakness diseases: PNS', 'Approach: Quadriparesis']),
  ('Ischemic stroke', 'Neuro Disorders', ['Acute stroke overview', 'Penumbra · Time is brain', 'Global ischemia & watershed', 'Etiology & TOAST',
     'SUM: Acute stroke algorithm', 'Reperfusion timeline', 'CT/MRI in ischemic stroke', 'Secondary prevention by etiology', 'Stroke rehabilitation']),
  ('Hemorrhagic stroke & SAH', 'Neuro Disorders', ['Spontaneous ICH & SAH', 'Hemorrhagic stroke – acute']),
  ('↑ICP & herniation', 'Neuro Disorders', ['↑ICP: causes', 'Herniation', 'Coma & herniation']),
  ('Head injury', 'Neuro Disorders', ['EDH vs SDH', 'Canadian CT head rule']),
  ('Brain tumors', 'Neuro Disorders', ['Primary CNS tumors', 'Metastasis & clinical features', 'Paraneoplastic neurological syndromes']),
  ('Brainstem syndromes', 'Neuro Disorders', ['Midbrain & pons', 'Medulla: Wallenberg', 'Brainstem & vascular syndromes – one-glance']),
  ('Spinal cord syndromes', 'Neuro Disorders', ['Cord syndromes', 'Spinal cord syndromes']),
  ('Movement disorders & Parkinson', 'Neuro Disorders', ['Parkinsonism vs Parkinson', 'Abnormal movements', 'Movement disorders']),
  ('Headache & neuralgia', 'Neuro Disorders', ['Classification', 'Migraine phases & pathophysiology', 'Trigeminal neuralgia', 'Headache & neuralgia']),
  ('CNS infections', 'Neuro Disorders', ['Pathogens by age & risk', 'Pathogenesis & clinical', 'Investigations & Rx', 'CNS infection by syndrome',
     'TB meningitis', 'Brain abscess', 'Tetanus vs Botulism', 'Rabies & polio vaccine', 'CNS infections']),
  ('Dementia & memory disorders', 'Neuro Disorders', ['AD pathology & biomarkers', 'Dementia cases & others', 'Neurodegenerative / dementia']),
  ('Altered consciousness & brain death', 'Neuro Disorders', ['GCS (3–15)', 'Eyes in coma', 'Approach: etiology of ↓LOC', 'Brain death', 'Coma & herniation']),
  ('Toxidromes & withdrawal', 'Neuro Disorders', ['Toxidromes', 'Alcohol withdrawal', 'NMS vs Serotonin syndrome']),
  ('Neuropathology: inclusions', 'Neuro Disorders', ['Neuronal inclusions']),

  ('Stroke drugs', 'Neuropharm & Abx', ['Alteplase (rtPA)', 'Antiplatelets', 'Anticoagulants (embolic stroke)', 'Statin', 'SUM: Acute stroke algorithm']),
  ('Antiparkinson & dopaminergic drugs', 'Neuropharm & Abx', ['DA synthesis & PD drugs', 'Psychostimulants', '4 Dopaminergic pathways']),
  ('Antipsychotics & EPS', 'Neuropharm & Abx', ['Typical vs atypical antipsychotics', 'Practical use', 'EPS & DA–ACh balance', 'NMS vs Serotonin syndrome']),
  ('Antidepressants, BZD & sedatives', 'Neuropharm & Abx', ['Antidepressants', 'GABA-A & benzodiazepines', 'Alcohol withdrawal']),
  ('Opioids & analgesics', 'Neuropharm & Abx', ['Opioids']),
  ('Anesthetics', 'Neuropharm & Abx', ['General & local anesthetics']),
  ('Anti-seizure medications', 'Neuropharm & Abx', ['Anti-seizure medications', 'Status epilepticus']),
  ('Migraine drugs', 'Neuropharm & Abx', ['Acute migraine drugs', 'Migraine prophylaxis']),
  ('Anti-vertigo', 'Neuropharm & Abx', ['Anti-vertigo']),
  ('Antibiotics in CNS infection', 'Neuropharm & Abx', ['Investigations & Rx']),
  ('Drug high-yield (ตาราง)', 'Neuropharm & Abx', ['Drug high-yield']),

  ('LP & CSF', 'Neuro Investigation', ['เลือก investigation', 'Lumbar puncture', 'CSF normal & SAH', 'CSF profile in meningitis']),
  ('NCS, EMG & RNS', 'Neuro Investigation', ['Electrodiagnosis ของ PNS']),
  ('EEG', 'Neuro Investigation', ['EEG – benefits']),
  ('Neuroimaging', 'Neuro Investigation', ['Neuroimaging basics', 'Imaging pearls', 'CT/MRI in ischemic stroke']),
  ('Lab, antibodies & biomarkers', 'Neuro Investigation', ['AD pathology & biomarkers']),

  ('Neural tube defects', 'Neuro Congenital Disorders', []),
  ('Neurocutaneous syndromes', 'Neuro Congenital Disorders', ['Neurocutaneous disorders']),
  ('Muscular dystrophy & SMA', 'Neuro Congenital Disorders', []),
]

SECTIONS = [  # สไลด์ต้นฉบับ: (ชื่อ, หน้าแรก, หน้าสุดท้าย)
  ('Section 1–2 · Diseases of nerve, NMJ & muscle', 1, 13),
  ('Section 3–4 · Localizing lesion in CNS (thumbnail p.14–17 + slide p.18–31)', 14, 31),
  ('Section 5–6 · Vascular disorders, ICP & head injury, brain tumors', 32, 46),
  ('Section 7 · Essentials in neuropharmacology', 47, 59),
  ('Section 8 · Pain & headache', 59, 67),
  ('Section 9 · Miscellaneous (CSF, hypothalamus, B1, hearing, inclusions, infections)', 68, 73),
  ('Neurology tutorial – ข้อสอบ NLE เก่า (2005–2017)', 74, 76),
]


def gslug(s):
    s = str(s or '').lower().replace('&', ' and ')
    s = re.sub(r'[^a-z0-9ก-๙]+', '-', s).strip('-')[:70]
    return s or 'x'


def slug_of(title):
    return KEY + '-' + gslug(title)


def esc(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def norm(t):
    t = re.sub(r'\s+', ' ', t.replace('★', '')).strip()
    return t


def pages_from(ref):
    out = set()
    for a, b in re.findall(r'(\d+)(?:\s*[–-]\s*(\d+))?', ref or ''):
        a = int(a); b = int(b) if b else a
        if 1 <= a <= NPAGES and a <= b <= NPAGES:
            out.update(range(a, b + 1))
    return out


def load_boxes():
    boxes = []
    for i in range(1, 9):
        soup = BeautifulSoup(open(os.path.join(SRC, f'p{i}.html'), encoding='utf-8').read(), 'html.parser')
        for b in soup.select('div.box'):
            boxes.append(('sum', i, b))
    soup = BeautifulSoup(open(os.path.join(SRC, 'extra.html'), encoding='utf-8').read(), 'html.parser')
    for b in soup.select('div.box'):
        boxes.append(('extra', b.get('data-tab'), b))
    return boxes


def box_title(b):
    h = b.find('h2')
    if not h:
        return '', ''
    ref = h.find('span', class_='ref')
    reft = ref.get_text(' ', strip=True) if ref else ''
    full = h.get_text(' ', strip=True)
    t = norm(full[: len(full) - len(reft)] if reft and full.endswith(reft) else full)
    return t, reft


def render_box(b, bid, src_note):
    b = BeautifulSoup(str(b), 'html.parser').find('div')
    h = b.find('h2')
    h.name = 'h4'; h['class'] = ['nxh']; h['id'] = bid
    for im in b.find_all('img'):
        s = im.get('src', '')
        m = re.match(r'fig/(.+)\.png$', s)
        if m:
            im['src'] = IMG + 'fig-' + m.group(1) + '.webp'
        im['loading'] = 'lazy'
        st = im.get('style', '')
        im['style'] = st
    for a in ['data-tab']:
        if b.has_attr(a):
            del b[a]
    cls = b.get('class', [])
    b['class'] = cls + ['nxb']
    if src_note:
        b.append(BeautifulSoup('<div class="nxsrc">' + esc(src_note) + '</div>', 'html.parser'))
    return str(b)


def mini(html):
    html = re.sub(r'<!--.*?-->', '', html, flags=re.S)
    html = re.sub(r'\s*\n\s*', ' ', html)
    html = re.sub(r'>\s+<', '><', html)
    return html.strip()


def page_figs(pages, cap=None):
    ps = sorted(pages)
    return ''.join(f'<figure class="nxpg"><a href="{IMG}p{p:02d}.webp" target="_blank" rel="noopener"><img loading="lazy" src="{IMG}p{p:02d}.webp" alt="สไลด์ต้นฉบับหน้า {p}"></a><figcaption>หน้า {p} · กดเพื่อเปิดภาพเต็ม</figcaption></figure>' for p in ps)


def main():
    boxes = load_boxes()
    info = []
    for kind, where, b in boxes:
        t, ref = box_title(b)
        info.append({'kind': kind, 'where': where, 'b': b, 't': t, 'ref': ref, 'used': 0})
    tabs_out = []
    tab_titles = [t[0] for t in TABS]
    for kind_, where, b in boxes:
        if kind_ == 'extra' and where not in tab_titles:
            sys.exit('extra.html: ไม่มีแท็บ "%s"' % where)

    def tab_link(title):
        return '#/kb/' + slug_of(title)

    for title, under, keys in TABS:
        tslug = slug_of(title)
        heads, parts, pages = [], [], set()
        if keys == 'QUIZ':
            html, heads = quiz_html(tslug)
        elif keys == 'SLIDES':
            html, heads = slides_html(tslug)
        elif keys == 'SUMMARY':
            html, heads = summary_html(tslug)
        elif keys is None:
            html, heads = hub_html(tab_link)
        else:
            chosen = []
            for k in keys:
                hit = [x for x in info if x['kind'] == 'sum' and x['t'].startswith(norm(k))]
                if not hit:
                    sys.exit('ไม่พบกล่อง "%s" (แท็บ %s)' % (k, title))
                chosen.append(hit[0])
            chosen += [x for x in info if x['kind'] == 'extra' and x['where'] == title]
            for n, x in enumerate(chosen, 1):
                x['used'] += 1
                bid = '%s-b%d' % (tslug, n)
                note = ('จากไฟล์สรุป หน้า %d' % x['where']) if x['kind'] == 'sum' else 'เสริมจากไฟล์ต้นฉบับ (ตัวพิมพ์ + ลายมือ)'
                parts.append(render_box(x['b'], bid, note))
                heads.append({'id': bid, 'l': 1, 't': x['t']})
                pages |= pages_from(x['ref'])
            orig = ''
            if pages:
                orig = ('<details class="nxorig"><summary>ภาพสไลด์ต้นฉบับที่เกี่ยวข้อง (ตัวพิมพ์ + ลายมือครบ) · หน้า ' +
                        ', '.join(str(p) for p in sorted(pages)) + '</summary><div class="nxpages">' + page_figs(pages) + '</div></details>')
            html = ('<div class="nx"><p class="nxlead">แท็บย่อยของ <b>' + esc(under) + '</b> · ' + str(len(chosen)) +
                    ' หัวข้อ · <span class="r">แดง</span> = ดอกจัน/เน้นในสไลด์ · <span class="hw">ตัวเอียงฟ้า</span> = ลายมือ · ป้าย <span class="ref">p.x</span> = หน้าในไฟล์ต้นฉบับ</p>' +
                    '<div class="nxgrid">' + ''.join(parts) + '</div>' + orig + '</div>')
        tabs_out.append({'title': title, 'html': mini(html), 'heads': heads})

    unused = [x['t'] for x in info if not x['used'] and x['kind'] == 'sum']
    if unused:
        print('กล่องที่ยังไม่ได้ใช้:', unused)
    extras_unused = [x['t'] for x in info if not x['used'] and x['kind'] == 'extra']
    if extras_unused:
        print('extra ที่ยังไม่ได้ใช้:', extras_unused)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))
    json.dump({'tabs': tabs_out, 'at': now.strftime('%Y-%m-%d %H:%M')}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
    print('เขียน', OUT, len(tabs_out), 'แท็บ', os.path.getsize(OUT) // 1024, 'KB')
    # รายการสำหรับ data/gdoc.js
    js = ',\n'.join("      { tab: %s, under: %s }" % (json.dumps(t, ensure_ascii=False), json.dumps(u, ensure_ascii=False)) for t, u, _ in TABS)
    open(os.path.join(HERE, 'tabs.js.txt'), 'w', encoding='utf-8').write(js + '\n')


def hub_html(tab_link):
    groups = {}
    order = []
    for title, under, keys in TABS[1:]:
        if under not in groups:
            groups[under] = []; order.append(under)
        groups[under].append(title)
    cards = []
    for g in order:
        gname = 'ภาพรวม · ข้อสอบ · ต้นฉบับ' if g == HUB else g
        cards.append('<div class="box nxb"><h4 class="nxh" id="hub-' + gslug(g) + '">' + esc(gname) + '</h4><ul class="t">' +
                     ''.join('<li><a href="' + tab_link(t) + '">' + esc(t) + '</a></li>' for t in groups[g]) + '</ul></div>')
    heads = [{'id': 'hub-' + gslug(g), 'l': 1, 't': ('ภาพรวม · ข้อสอบ · ต้นฉบับ' if g == HUB else g)} for g in order]
    html = ('<div class="nx"><div class="box nxb nxintro"><h4 class="nxh" id="hub-intro">CNS &amp; PNS Comprehensive Tutorial 2026 (B03)</h4>'
            '<p>Thanakit Pongpitakmetha, M.D., M.Sc. (Pharmacology) · courtesy of Assoc. Prof. Sekh Thanprasertsuk, M.D. (Physiology) · Chula Neuroscience Center · last revision 22 Jan 2026 · 76 หน้า (สไลด์ + ลายมือ)</p>'
            '<p>เนื้อหาทั้งหมดจากไฟล์ต้นฉบับทุกหน้าและไฟล์สรุป 10 หน้า แยกไปไว้ใต้แท็บย่อยของ Neuro ตามเรื่อง: <b>Neuroanatomy · Neurophysiology · Neuro Disorders (pathophysio + clinical) · Neuropharm &amp; Abx · Neuro Investigation (lab) · Neuro Congenital Disorders</b> — แต่ละแท็บแบ่งเป็นกล่องตามหัวข้อย่อย (กดชื่อกล่องในสารบัญด้านซ้ายเพื่อกระโดดไป) และมีภาพสไลด์ต้นฉบับหน้าที่เกี่ยวข้องท้ายแท็บ</p>'
            '<p class="note">Section 1–2 Nerve &amp; muscle · 3–4 Localizing lesion in CNS · 5–6 Vascular &amp; head injury · 7 Neuropharmacology · 8 Pain &amp; headache · 9 Miscellaneous</p></div>'
            '<div class="nxgrid">' + ''.join(cards) + '</div></div>')
    return html, [{'id': 'hub-intro', 'l': 1, 't': 'เกี่ยวกับไฟล์นี้'}] + heads


def slides_html(tslug):
    parts, heads = [], []
    for n, (name, a, b) in enumerate(SECTIONS, 1):
        sid = '%s-s%d' % (tslug, n)
        heads.append({'id': sid, 'l': 1, 't': name + ' (หน้า %d–%d)' % (a, b)})
        parts.append('<h4 class="nxh nxsec" id="' + sid + '">' + esc(name) + ' <span class="ref">p.%d–%d</span></h4><div class="nxpages nxall">' + page_figs(range(a, b + 1)) + '</div>')
    html = ('<div class="nx"><p class="nxlead">ภาพทุกหน้าของไฟล์ต้นฉบับ (สไลด์ + ลายมือ ไม่แก้ไข) · หน้า 14–17 เป็นภาพย่อสไลด์ ใช้ภาพความละเอียดสูง กดเปิดภาพเต็มแล้วซูมได้ · ไฟล์ PDF ต้นฉบับใหญ่ (177 MB) จึงไม่ได้แนบไว้</p>' + ''.join(parts) + '</div>')
    return html, heads


def summary_html(tslug):
    names = ['Section 1–2 · Nerve, NMJ & muscle', 'Section 3 · Localization, exam, investigations & consciousness',
             'Section 3–4 · Cortex, vision, eye movement, brainstem, cord', 'Section 5–6 · Vascular, ICP, head injury, tumors',
             'Section 7 · Neuropharmacology', 'Section 8–9 · Pain, headache, infections, misc', 'High-yield (1/2)', 'High-yield (2/2) + mnemonics',
             'Quiz (1/2) ข้อ 1–68', 'Quiz (2/2) ข้อ 69–145']
    parts, heads = [], []
    for i, nm in enumerate(names, 1):
        sid = '%s-p%d' % (tslug, i)
        heads.append({'id': sid, 'l': 1, 't': 'หน้า %d · %s' % (i, nm)})
        parts.append('<figure class="nxpg nxsum" id="' + sid + '"><figcaption><b>หน้า %d</b> · %s</figcaption><a href="%ss%02d.webp" target="_blank" rel="noopener"><img loading="lazy" src="%ss%02d.webp" alt="ไฟล์สรุปหน้า %d"></a></figure>' % (i, esc(nm), IMG, i, IMG, i, i))
    html = ('<div class="nx"><p class="nxlead">ไฟล์สรุป A3 แนวนอน 10 หน้า (Kanit + Sarabun) — หน้า 1–6 สรุปละเอียด · 7–8 high-yield · 9–10 คำถาม–เฉลย · '
            '<a class="chip" href="' + PDF + '" download>ดาวน์โหลด PDF</a> <a class="chip" href="' + PDF + '" target="_blank" rel="noopener">เปิด PDF ↗</a></p>' + ''.join(parts) + '</div>')
    return html, heads


def quiz_html(tslug):
    ns = {}
    exec(open(os.path.join(SRC, 'qa.py'), encoding='utf-8').read(), ns)
    items = ns['Q'] + ns['Q2']
    parts, heads, n, sec = [], [], 0, 0
    for s, q, a, ref in items:
        if q is None:
            if parts:
                parts.append('</div>')
            sec += 1
            sid = '%s-s%d' % (tslug, sec)
            heads.append({'id': sid, 'l': 1, 't': s})
            parts.append('<h4 class="nxh nxsec" id="' + sid + '">' + esc(s) + '</h4><div class="nxqgrid">')
            continue
        n += 1
        parts.append('<details class="nxq"><summary><span class="nxqn">' + str(n) + '</span><span>' + q + ' <span class="ref">' + esc(ref) + '</span></span></summary><div class="nxqa"><b>เฉลย:</b> ' + a + '</div></details>')
    parts.append('</div>')
    html = ('<div class="nx"><p class="nxlead">' + str(n) + ' ข้อ จากไฟล์สรุปหน้า 9–10 · กดที่คำถามเพื่อดูเฉลย · ป้ายหน้า = ไปทบทวนในสไลด์ต้นฉบับ · อยากได้โจทย์ใหม่ กด “สร้างข้อสอบจากหน้านี้” ที่แท็บเนื้อหา</p>' +
            '<p><button type="button" class="chip nxqall" onclick="var d=this.closest(\'.nx\').querySelectorAll(\'details.nxq\'),o=!d[0].open;d.forEach(function(x){x.open=o})">เปิด/ปิดเฉลยทั้งหมด</button></p>' + ''.join(parts) + '</div>')
    return html, heads


if __name__ == '__main__':
    main()
