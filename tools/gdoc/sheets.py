#!/usr/bin/env python3
"""สร้าง snapshot ของ Google Sheet สำหรับโพยหมอ (ทีละชีต ตามลำดับเดิม)
ใช้: python3 tools/gdoc/sheets.py <โฟลเดอร์ที่แตก zip export ของ Sheet (ไฟล์ <ชื่อชีต>.html)> <ชื่อ> "<ชื่อชีต 1>" "<ชื่อชีต 2>" ...
     (ใส่ชื่อชีตเรียงตามลำดับในไฟล์ — export zip ไม่บอกลำดับ)
ได้: docs/gdoc/<ชื่อ>.json  { at, sheets:[{ title, css, html }] }
- ตัดแถว/คอลัมน์ว่างท้ายตาราง (ช่องว่างที่มีสีพื้นนับว่าไม่ว่าง เช่นชีตที่วาดแผนภาพด้วยช่อง)
- คงสี เส้นขอบ การรวมช่อง และความกว้างคอลัมน์ตามต้นฉบับ · CSS ถูกจำกัดให้อยู่ใน .gs-<ชื่อ>-<ลำดับ>"""
import sys, os, json, datetime
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOCS = os.path.join(ROOT, 'docs')

JS = r'''
([html, scope]) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let css = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join('\n');
  // ช่องที่ "มีอะไร" แม้ไม่มีตัวอักษร = มีสีพื้นที่ไม่ใช่ขาว หรือมีเส้นขอบ
  const deco = {};
  css.replace(/\.ritz \.waffle \.(s\d+)\{([^}]*)\}/g, (m, k, body) => {
    const bg = /background-color:([^;]+)/.exec(body);
    const b = bg && !/^#fff(fff)?$/i.test(bg[1].trim()) && !/transparent/.test(bg[1]);
    deco[k] = !!b;  // เส้นขอบอย่างเดียวไม่นับ (หลายชีตตีเส้นคอลัมน์ไว้ถึงแถว 1000)
    return m;
  });
  css = css.replace(/\.ritz \.waffle a \{[^}]*\}/g, '').replace(/\.ritz \.waffle \./g, '.' + scope + ' .');
  const table = doc.querySelector('table.waffle');
  if (!table) return null;
  const widths = Array.from(table.querySelectorAll('thead th')).slice(1).map(th => parseInt((th.getAttribute('style') || '').replace(/.*width:\s*(\d+)px.*/, '$1')) || 100);
  const rows = Array.from(table.querySelectorAll('tbody > tr'));
  // grid occupancy เพื่อรู้ตำแหน่งคอลัมน์จริงของแต่ละช่อง (มี rowspan/colspan)
  const occ = [];
  let lastRow = -1, lastCol = -1;
  const cellsPos = [];
  rows.forEach((tr, r) => {
    occ[r] = occ[r] || [];
    let c = 0;
    const list = [];
    Array.from(tr.children).forEach(td => {
      if (td.tagName !== 'TD') return;
      while (occ[r][c]) c++;
      const cs = +td.getAttribute('colspan') || 1, rs = +td.getAttribute('rowspan') || 1;
      for (let i = 0; i < rs; i++) { occ[r + i] = occ[r + i] || []; for (let j = 0; j < cs; j++) occ[r + i][c + j] = 1; }
      const txt = (td.textContent || '').trim();
      const has = txt || td.querySelector('img') || (td.className || '').split(/\s+/).some(k => deco[k]);
      if (has) { lastRow = Math.max(lastRow, r + rs - 1); lastCol = Math.max(lastCol, c + cs - 1); }
      list.push({ td, c, cs });
      c += cs;
    });
    cellsPos.push(list);
  });
  if (lastRow < 0) return { css: '', html: '', rows: 0, cols: 0 };
  let out = '<table class="waffle gs-t" cellspacing="0" cellpadding="0"><colgroup>' +
    widths.slice(0, lastCol + 1).map(w => '<col style="width:' + w + 'px">').join('') + '</colgroup><tbody>';
  for (let r = 0; r <= lastRow; r++) {
    const tr = rows[r];
    const h = (tr.getAttribute('style') || '').match(/height:\s*\d+px/);
    out += '<tr' + (h ? ' style="' + h[0] + '"' : '') + '>';
    cellsPos[r].forEach(({ td, c, cs }) => {
      if (c > lastCol) return;
      if (c + cs - 1 > lastCol) td.setAttribute('colspan', lastCol - c + 1);
      td.removeAttribute('dir');
      out += td.outerHTML;
    });
    out += '</tr>';
  }
  out += '</tbody></table>';
  // ลิงก์ในเซลล์: เปิดแท็บใหม่ + แกะลิงก์ google.com/url
  out = out.replace(/<a href="https:\/\/www\.google\.com\/url\?q=([^&"]+)[^"]*"/g, (m, u) => '<a href="' + decodeURIComponent(u) + '"').replace(/<a href=/g, '<a target="_blank" rel="noopener" href=');
  return { css, html: out, rows: lastRow + 1, cols: lastCol + 1 };
}
'''

def main():
    src, name, titles = sys.argv[1], sys.argv[2], sys.argv[3:]
    out = {'sheets': []}
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        for i, t in enumerate(titles):
            f = os.path.join(src, t + '.html')
            if not os.path.exists(f):
                print('ไม่พบไฟล์ของชีต', t); continue
            scope = 'gs-%s-%d' % (name, i)
            r = pg.evaluate(JS, [open(f, encoding='utf-8').read(), scope])
            if not r or not r['html']:
                print('  -', t, '(ว่าง)'); out['sheets'].append({'title': t, 'css': '', 'html': '', 'scope': scope}); continue
            out['sheets'].append({'title': t, 'css': r['css'], 'html': r['html'], 'scope': scope})
            print('  -', t, r['rows'], 'x', r['cols'], len(r['html']) + len(r['css']), 'chars')
        b.close()
    out['at'] = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).strftime('%Y-%m-%d %H:%M')
    os.makedirs(os.path.join(DOCS, 'gdoc'), exist_ok=True)
    path = os.path.join(DOCS, 'gdoc', name + '.json')
    json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(path, os.path.getsize(path), 'bytes')

if __name__ == '__main__':
    main()
