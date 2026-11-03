#!/usr/bin/env node
/* เนื้อหา L/R จากคลังข้อสอบเก่า SI (Round I/O ใน repo ac-mdcu) → docs/gdoc/si-<ward>.json + รูปใน docs/gdoc/img/si-<ward>/
   ไม่แตะ Google Doc และไม่แก้เว็บ SI · ไม่ต้องอ่าน PDF ใหม่
   รัน:  node tools/si-import/build.mjs <ac-mdcu checkout>   (แล้วเพิ่ม POY_GDOC_V ใน docs/data/gdoc.js)
   เพิ่มบทใหม่: เพิ่มบรรทัดใน FILES ด้านล่าง (under = ชื่อแท็บ system ใน Medical Soil ที่จะแขวน) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const AC = process.argv[2];
if (!AC || !fs.existsSync(path.join(AC, 'si', 'config.json'))) { console.error('usage: build.mjs <ac-mdcu checkout>'); process.exit(1); }

const WARDS = {
  med: {
    dir: 'data_med', site: 'https://bankypp.github.io/ac-mdcu/si/#/med/io/p/',
    FILES: [
      { code: 'L17', under: 'Hematologic Disorders' },
      { code: 'R01', under: 'Microbio' },
      { code: 'R02', under: 'Endoc Disorders' }
    ]
  }
};
/* คลาสจาก Round I/O → คลาส si-* กันชนกับ .chip .warn .k .flow ของโพยหมอ */
const CLS = new Set(['iointro', 'imp', 'box', 'ref', 'flow', 'n', 'ar', 'fig', 'cap', 'warn', 'chip', 'd', 'mn', 'k', 'r', 'hw', 'vflow', 'clash', 'x']);
const pre = h => String(h || '').replace(/class="([^"]*)"/g, (m, c) => 'class="' + c.trim().split(/\s+/).map(x => {
  if (!CLS.has(x)) throw new Error('คลาสใหม่ที่ยังไม่มีสไตล์: ' + x);
  return 'si-' + x;
}).join(' ') + '"');
const text = h => String(h).replace(/<span class="ref">[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const attr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

for (const [ward, W] of Object.entries(WARDS)) {
  const X = { IO: { docs: [] } };
  new Function('W', fs.readFileSync(path.join(AC, 'si', W.dir, 'io.js'), 'utf8'))(X);
  const imgOut = path.join(ROOT, 'docs', 'gdoc', 'img', 'si-' + ward);
  fs.rmSync(imgOut, { recursive: true, force: true });
  fs.mkdirSync(imgOut, { recursive: true });
  const tabs = [], stat = [];
  const imgFile = k => {
    const f = fs.readdirSync(path.join(AC, 'si', 'img')).find(x => x.replace(/\.[^.]+$/, '') === k);
    if (!f) throw new Error('ไม่พบรูป ' + k);
    fs.copyFileSync(path.join(AC, 'si', 'img', f), path.join(imgOut, f));
    return 'gdoc/img/si-' + ward + '/' + f;
  };
  for (const F of W.FILES) {
    const d = X.IO.docs.find(x => x.code === F.code);
    if (!d) throw new Error('ไม่พบ ' + F.code);
    const hubTitle = F.code + ' ' + d.title, lc = F.code.toLowerCase();
    const from = 'คลังข้อสอบเก่า SI › Internal Medicine Y4 › Summary · ' + d.src;
    const legend = d.legend ? '<div class="si-legend">' + pre(d.legend) + '</div>' : '';
    tabs.push({
      title: hubTitle, slug: 'si-' + lc, under: F.under, code: F.code, ward, from, heads: [],
      html: '<div class="sim"><div class="si-intro"><b>' + (d.kind === 'L' ? 'Lecture' : 'Resource') + ' ' + F.code + '</b> — ' + attr(d.src) + '</div>' + legend + '<p>แบ่งเป็น ' + d.pages.length + ' หน้าย่อยตามเรื่องด้านล่าง</p></div>'
    });
    let imgs = 0, refs = 0;
    for (const p of d.pages) {
      const id = String(p.id).toLowerCase().replace(/[^\w-]/g, '-'), heads = [];
      let i = 0;
      let h = pre(p.html).replace(/<h3>([\s\S]*?)<\/h3>/g, (m, inner) => {
        const hid = 'si-' + id + '-b' + (++i);
        heads.push({ id: hid, l: 1, t: text(inner.replace(/<span class="si-ref">[\s\S]*?<\/span>/g, '')) });
        return '<h3 id="' + hid + '">' + inner + '</h3>';
      });
      h = h.replace(/\{\{IMG:([\w-]+)\}\}/g, (m, k) => { imgs++; return '<img src="' + imgFile(k) + '" alt="ภาพจากไฟล์ต้นฉบับ" loading="lazy">'; });
      h = h.replace(/\{\{R:([\d,\s]+)\}\}/g, (m, ns) => ns.split(',').map(n => n.trim()).filter(Boolean).map(n => {
        if (!(p.refs && p.refs[+n - 1])) throw new Error(p.id + ' อ้าง [' + n + '] แต่ไม่มีในรายการ');
        return '<sup class="si-cite"><a href="#" data-siref="sr-' + id + '-' + n + '">[' + n + ']</a></sup>';
      }).join(''));
      /* กล่องที่มีตาราง ≥ 4 คอลัมน์: กินเต็มความกว้าง อ่านไม่ต้องเลื่อนข้าง */
      h = h.replace(/<div class="si-box">[\s\S]*?(?=<div class="si-box">|$)/g, b => {
        const wide = (b.match(/<tr>[\s\S]*?<\/tr>/g) || []).some(r => (r.match(/<t[hd][ >]/g) || []).length >= 4);
        return wide ? b.replace('<div class="si-box">', '<div class="si-box si-wide">') : b;
      });
      if (/\{\{/.test(h)) throw new Error(p.id + ' มี placeholder ที่แปลงไม่ได้');
      const R = p.refs || [];
      refs += R.length;
      const list = R.length ? '<details class="si-refs"><summary>Reference (' + R.length + ')</summary><ol>' + R.map((r, n) => {
        const u = r.u && r.u.indexOf('#/') === 0 ? 'https://bankypp.github.io/ac-mdcu/si/' + r.u : r.u;
        return '<li id="sr-' + id + '-' + (n + 1) + '">' + r.t + (u ? ' <a href="' + attr(u) + '" target="_blank" rel="noopener">เปิด ↗</a>' : '') + '</li>';
      }).join('') + '</ol></details>' : '';
      tabs.push({ title: p.title, slug: 'si-' + id, under: hubTitle, fcode: F.code, ward, from, heads, html: '<div class="sim">' + legend + h + list + '</div>' });
    }
    stat.push(F.code + ': ' + d.pages.length + ' หน้า, รูป ' + imgs + ', อ้างอิง ' + refs + ' → ' + F.under);
  }
  const at = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  fs.writeFileSync(path.join(ROOT, 'docs', 'gdoc', 'si-' + ward + '.json'), JSON.stringify({ at, tabs }));
  console.log(ward, tabs.length, 'แท็บ'); stat.forEach(s => console.log(' ', s));
}
