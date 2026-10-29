#!/usr/bin/env python3
"""Build the NL & Compre old-exam banks of โพยหมอ with the old-exam engine (bank/build_site.py + bank/site/, copied from BankyPP/ac-mdcu by sync_engine.py).
python3 bank/build.py            → docs/bank/nl/  +  docs/bank/compre/   (+ docs/bank/stats.js for the โพยหมอ exam pages)
python3 bank/build.py --pack D   → Claude artifact builds in D/nl and D/compre (the engine's --pack)
Only these things differ from the old-exam websites (all applied here, the engine files stay untouched):
  · theme: Kanit + Sarabun and the โพยหมอ palette (bank/poy.css)
  · password gate: same password as every site; trusted device / typed-this-tab = โพยหมอ's own keys (poy-trusted / poy-pass),
    so a device trusted on โพยหมอ is trusted here too (signing in on the old-exam sites does not count)
  · no institution switch (NL & Compre are not institutions) · back link to โพยหมอ + link card to each exam page (bank/poy.js)"""
import io, json, os, re, sys, glob, contextlib
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HERE)
PACK = None
if '--pack' in sys.argv: PACK = sys.argv[sys.argv.index('--pack') + 1]
SRC = open(os.path.join(HERE, 'build_site.py'), encoding='utf-8').read()
old = re.search(r"^_ins=\[.*$", SRC, re.M)
assert old, 'engine build_site.py changed: _ins line not found'
SRC = SRC.replace(old.group(0), '_ins=[]')
FONT_OLD = re.compile(r'<link href="https://fonts.googleapis.com/css2\?family=Chakra[^"]*" rel="stylesheet">')
FONT_NEW = '<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700&family=Sarabun:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">'
JS_PATCH = [('const GKEY=KEY+"-trusted";', 'const GKEY="poy-trusted";'),
            ('sessionStorage.getItem(KEY+"-pass")', 'sessionStorage.getItem("poy-pass")'),
            ('sessionStorage.setItem(KEY+"-pass",', 'sessionStorage.setItem("poy-pass",')]

def build(inst):
    out = os.path.join(PACK, inst) if PACK else os.path.join(REPO, 'docs', 'bank', inst)
    argv = ['build_site.py', '--inst', inst, out] + (['--pack'] if PACK else [])
    old_argv, old_cwd = sys.argv, os.getcwd(); sys.argv = argv
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(SRC, os.path.join(HERE, 'build_site.py'), 'exec'), {'__file__': os.path.join(HERE, 'build_site.py'), '__name__': '__main__'})
    finally:
        sys.argv = old_argv; os.chdir(old_cwd)
    p = os.path.join(out, 'index.html'); h = open(p, encoding='utf-8').read()
    h, n = FONT_OLD.subn(FONT_NEW, h); assert n == 1, 'font link not found'
    for a, b in JS_PATCH:
        assert h.count(a) == 1, 'engine changed: ' + a
        h = h.replace(a, b)
    css = open(os.path.join(HERE, 'poy.css'), encoding='utf-8').read(); js = open(os.path.join(HERE, 'poy.js'), encoding='utf-8').read()
    h = h.replace('</head>', '<style>\n' + css + '</style>\n<meta name="theme-color" content="#F3EFE5">\n</head>', 1)
    i = h.rindex('</body>'); h = h[:i] + '<script>\n' + js + '</script>\n' + h[i:]
    open(p, 'w', encoding='utf-8').write(h)
    print(inst, '→', p, len(h.encode()), 'bytes ·', buf.getvalue().strip().split(',', 1)[-1].strip())

def stats():
    """per exam: old questions per blueprint tag (W.TAGS) and per source — read by the โพยหมอ exam pages (#/nl/x/<id>)"""
    import subprocess
    js = r"""
const fs=require('fs'),path=require('path'),vm=require('vm');const out={};
for(const inst of ['nl','compre']){const cfg=JSON.parse(fs.readFileSync(path.join(process.argv[1],inst,'config.json'),'utf8'));
 for(const w of cfg.wards){const W={QB:[],TAGS:{},TOPIC:{}};const d=path.join(process.argv[1],inst,w.dir);
  const files=fs.existsSync(d)?fs.readdirSync(d):[];
  files.filter(f=>/^data_b\d+\.js$/.test(f)).sort((a,b)=>parseInt(a.slice(6))-parseInt(b.slice(6))).forEach(f=>vm.runInNewContext(fs.readFileSync(path.join(d,f),'utf8'),{QB:W.QB,console}));
  ['tags.js','topics.js'].forEach(f=>{if(files.includes(f))vm.runInNewContext(fs.readFileSync(path.join(d,f),'utf8'),{W,console});});
  const tag={},src={},sets={};W.QB.forEach(q=>{const k=q.set+'|'+q.ro+'|'+q.orig;(W.TAGS[k]||[]).forEach(t=>{tag[t]=(tag[t]||0)+1;});
   const s=q.inst||'';src[s]=(src[s]||0)+1;sets[q.set+' · '+q.ro]=(sets[q.set+' · '+q.ro]||0)+1;});
  out[w.id]={n:W.QB.length,tag,src,sets};}}
process.stdout.write(JSON.stringify(out));"""
    r = subprocess.run(['node', '-e', js, HERE], capture_output=True, text=True)
    if r.returncode: print(r.stderr); raise SystemExit('stats failed')
    p = os.path.join(REPO, 'docs', 'bank', 'stats.js')
    open(p, 'w', encoding='utf-8').write('/* สร้างโดย bank/build.py — จำนวนข้อสอบเก่าในคลัง NL & Compre ต่อแท็ก blueprint */\nwindow.POY_BANKSTAT=' + r.stdout + ';\n')
    print('stats →', p, r.stdout[:200])

def qindex():
    """ข้อสอบเก่าทุกข้อแบบย่อ — ให้ช่องค้นบนสุดของโพยหมอค้นเจอ (ค้นตามคำ + แท็กสถาบัน จุฬาฯ/ศิริราช)"""
    import subprocess
    js = r"""
const fs=require('fs'),path=require('path'),vm=require('vm');const out=[];
for(const inst of ['nl','compre']){const cfg=JSON.parse(fs.readFileSync(path.join(process.argv[1],inst,'config.json'),'utf8'));
 for(const w of cfg.wards){const QB=[];const d=path.join(process.argv[1],inst,w.dir);
  const files=fs.existsSync(d)?fs.readdirSync(d):[];
  files.filter(f=>/^data_b\d+\.js$/.test(f)).forEach(f=>vm.runInNewContext(fs.readFileSync(path.join(d,f),'utf8'),{QB,console}));
  QB.forEach((q,i)=>out.push({b:inst,w:w.id,wn:w.name||w.id,set:q.set||'',ro:q.ro||'',inst:q.inst||'',stem:q.stem||'',opts:(q.opts||[]).join(' · '),key:q.key||q.ans||'',why:String(q.summary||q.why||'').replace(/<[^>]+>/g,' ').slice(0,600)}));}}
process.stdout.write(JSON.stringify(out));"""
    r = subprocess.run(['node', '-e', js, HERE], capture_output=True, text=True)
    if r.returncode: print(r.stderr); raise SystemExit('qindex failed')
    p = os.path.join(REPO, 'docs', 'bank', 'qs.json')
    open(p, 'w', encoding='utf-8').write(r.stdout)
    print('qs →', p, len(r.stdout), 'bytes')

for inst in ('nl', 'compre'): build(inst)
if not PACK: stats(); qindex()
