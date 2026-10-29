/**
 * โพยหมอ → ไฟล์ Google ที่ชื่อขึ้นต้น "[AI]"  (Google Apps Script — Web app)
 *
 * เว็บโพยหมอส่ง "สิ่งที่แก้ในเว็บ" มาที่นี่ แล้วสคริปต์ลอกเข้าไฟล์ให้ตรงตัวอักษร
 *  - รับเฉพาะบัญชีใน ALLOW (ตรวจจาก token ของ Firebase ที่เว็บแนบมา — ปลอมไม่ได้)
 *  - แตะเฉพาะไฟล์ที่ชื่อขึ้นต้น "[AI]" ตอนที่ส่งมา (เปลี่ยนชื่อไฟล์ออก = สคริปต์เลิกแตะทันที)
 *
 * ตั้งครั้งเดียว:
 *  1) เข้า https://script.google.com ด้วยบัญชี Google ที่แก้ไฟล์ [AI] ได้ → New project → วางไฟล์นี้ทับ Code.gs ทั้งหมด
 *     ⚙ Project Settings → ติ๊ก "Show appsscript.json manifest file in editor" → เปิด appsscript.json วางไฟล์ appsscript.json ที่ให้ไปทับ → Save
 *  2) Deploy → New deployment → Select type: Web app
 *       Execute as: Me · Who has access: Anyone → Deploy → อนุญาตสิทธิ์ (Advanced → Go to … → Allow)
 *  3) คัดลอก Web app URL (ลงท้าย /exec) ส่งให้ Claude ใส่ใน docs/data/config.js → aiSync.url
 *  แก้สคริปต์ทีหลัง: Deploy → Manage deployments → ✎ → Version: New version → Deploy (URL เดิม)
 */

/* ใครเขียนเข้าไฟล์ได้: ['*'] = ทุกคนที่เข้าสู่ระบบในเว็บโพยหมอ · หรือใส่เป็นรายชื่ออีเมล เช่น ['pongsaran.phol@gmail.com'] */
var ALLOW = ['*'];
var FIREBASE_API_KEY = 'AIzaSyDIzd81Qw7shAOj3uiGU1T8tm90HXtF4yg';

/* อ่านสด (ให้เว็บเห็นที่แก้ใน Doc ทันที ไม่ต้องรอ GitHub) — อ่านได้เฉพาะไฟล์ที่ชื่อขึ้นต้น [AI]
   ?op=tree&id=<docId>              → รายชื่อแท็บ { id, title, d (ชั้น) } ตามลำดับใน Doc
   ?op=tab&id=<docId>&tab=<tabId>   → HTML ของแท็บนั้น (แบบเดียวกับ export ของ Google) */
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (!p.op) return out_({ ok: true, hello: 'poymor ai-sync' });
    var doc = DocumentApp.openById(p.id);
    if (doc.getName().indexOf('[AI]') !== 0) return out_({ ok: false, notai: true });
    if (p.op === 'tree') {
      var tabs = [];
      (function walk(list, d) { list.forEach(function (t) { tabs.push({ id: t.getId(), title: t.getTitle(), d: d }); walk(t.getChildTabs(), d + 1); }); })(doc.getTabs(), 0);
      return out_({ ok: true, tabs: tabs, at: new Date().toISOString() });
    }
    if (p.op === 'tab') {
      /* อ่านจากตัว Doc โดยตรง (DocumentApp = ฉบับล่าสุดเสมอ) — export ของ Google มีแคชฉบับเก่า */
      var tab = findById_(doc.getTabs(), p.tab);
      if (!tab) return out_({ ok: false, error: 'ไม่พบแท็บ ' + p.tab });
      var body = tab.asDocumentTab().getBody();
      /* export ของ Google สวยกว่า (มี dropdown/ชิป สีครบ) แต่บางทีค้างฉบับเก่า → ใช้ export เฉพาะเมื่อข้อความตรงกับตัว Doc ทุกย่อหน้า */
      try {
        var url = 'https://docs.google.com/document/d/' + encodeURIComponent(p.id) + '/export?format=html&tab=' + encodeURIComponent(p.tab);
        var ex = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
        if (ex.getResponseCode() === 200) {
          var eh = ex.getContentText(), et = squash_(eh.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '')), pos = 0, fresh = true;
          paras_(body).forEach(function (pp) { if (!fresh) return; var t = squash_(pp.getText()); if (!t) return; var k = et.indexOf(t, pos); if (k < 0) fresh = false; else pos = k + t.length; });
          if (fresh) return out_({ ok: true, fmt: 'export', html: eh, at: new Date().toISOString() });
        }
      } catch (x) { }
      var r = tabHtml_(body);
      return out_({ ok: true, fmt: 'dom', html: r.html, heads: r.heads, at: new Date().toISOString() });
    }
    return out_({ ok: false, error: 'op?' });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var req = JSON.parse(e.postData.contents);
    var who = whoIs_(req.token);
    if (!who) return out_({ ok: false, error: 'ยืนยันตัวตนไม่ผ่าน — เข้าสู่ระบบในเว็บใหม่' });
    if (ALLOW.indexOf('*') < 0 && ALLOW.indexOf(who.toLowerCase()) < 0) return out_({ ok: false, error: 'บัญชี ' + who + ' ไม่ได้รับอนุญาตให้เขียนไฟล์' });
    var tg = req.target || {}, name = tg.kind === 'sheet' ? SpreadsheetApp.openById(tg.id).getName() : DocumentApp.openById(tg.id).getName();
    if (name.indexOf('[AI]') !== 0) return out_({ ok: false, notai: true, name: name });
    var res = tg.kind === 'sheet' ? sheet_(tg, req.ops || []) : doc_(tg, req.ops || []);
    res.ok = !res.manual; res.name = name;
    return out_(res);
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) { }
  }
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function whoIs_(token) {
  if (!token) return '';
  var r = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: token }), muteHttpExceptions: true
  });
  if (r.getResponseCode() !== 200) return '';
  var u = (JSON.parse(r.getContentText()).users || [])[0];
  return u && u.email ? String(u.email) : '';
}

/* ---------- Google Sheet: แก้ช่อง / เพิ่มแถว ---------- */
function sheet_(tg, ops) {
  var ss = SpreadsheetApp.openById(tg.id), sh = null;
  ss.getSheets().forEach(function (s) { if (String(s.getSheetId()) === String(tg.gid || '0')) sh = s; });
  if (!sh) sh = ss.getSheets()[0];
  var n = 0;
  var miss = [];
  ops.forEach(function (op) {
    if (op.t === 'cell') { sh.getRange(tg.row, op.col + 1).setValue(op.value); n++; }
    else if (op.t === 'append') {
      var name = String(op.values[op.nameCol] || '').trim().toLowerCase();
      var have = sh.getRange(1, op.nameCol + 1, Math.max(1, sh.getLastRow()), 1).getValues().some(function (r) { return String(r[0]).trim().toLowerCase() === name; });
      if (!have) sh.appendRow(op.values);   /* มีชื่อนี้แล้ว = เพิ่มไปแล้ว ไม่เพิ่มซ้ำ */
      n++;
    } else if (op.t === 'delrow') {
      /* ลบเฉพาะเมื่อชื่อในแถวนั้นตรง (แถวขยับ → หาแถวที่ชื่อตรง) */
      var col = sh.getRange(1, op.nameCol + 1, Math.max(1, sh.getLastRow()), 1).getValues(), row = 0, want = String(op.name).trim().toLowerCase();
      if (op.row && col[op.row - 1] && String(col[op.row - 1][0]).trim().toLowerCase() === want) row = op.row;
      else for (var i = 0; i < col.length; i++) if (String(col[i][0]).trim().toLowerCase() === want) { row = i + 1; break; }
      if (row) { sh.deleteRow(row); n++; } else n++;   /* ไม่มีแล้ว = ลบไปแล้ว */
    }
  });
  return { applied: n, miss: miss };
}

/* ---------- Google Doc: แก้ / ลบ / เพิ่มย่อหน้า ในแท็บที่ตรงกับชื่อ ---------- */
function norm_(t) { return String(t || '').replace(/[ ​ ]/g, ' ').replace(/\s+/g, ' ').trim(); }

function findTab_(tabs, path) {
  if (!path || !path.length) return tabs[0] || null;   /* ไม่ระบุแท็บ = แท็บแรก */
  if (path.length === 1) {                                   /* ชื่อเดียว → หาทุกชั้น */
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getTitle() === path[0]) return tabs[i];
      var c = findTab_(tabs[i].getChildTabs(), path);
      if (c) return c;
    }
    return null;
  }
  for (var j = 0; j < tabs.length; j++) if (tabs[j].getTitle() === path[0]) return findTab_(tabs[j].getChildTabs(), path.slice(1)) || null;
  return null;
}

function paras_(body) {
  var out = [];
  (function walk(el) {
    var t = el.getType();
    if (t === DocumentApp.ElementType.PARAGRAPH || t === DocumentApp.ElementType.LIST_ITEM) { out.push(el); return; }
    if (el.getNumChildren) for (var i = 0; i < el.getNumChildren(); i++) walk(el.getChild(i));
  })(body);
  return out;
}

/* ---------- แท็บ: สร้าง / เปลี่ยนชื่อ / ลบ (ผ่าน Google Docs API — ต้องเปิด Docs ใน appsscript.json) ---------- */
function tabOps_(doc, tg, ops) {
  var reqs = [], note = [];
  ops.forEach(function (op) {
    if (op.t === 'addtab') {
      var parent = op.path && op.path.length ? findTab_(doc.getTabs(), op.path) : null;
      if (op.path && op.path.length && !parent) { note.push('ไม่พบแท็บแม่ ' + op.path.join(' › ')); return; }
      var sibs = parent ? parent.getChildTabs() : doc.getTabs();
      if (sibs.some(function (t) { return t.getTitle() === op.title; })) return;   /* มีแล้ว */
      var p = { title: op.title }; if (parent) p.parentTabId = parent.getId();
      reqs.push({ addDocumentTab: { tabProperties: p } });
    } else if (op.t === 'rentab' || op.t === 'deltab') {
      var tab = findTab_(doc.getTabs(), op.path);
      if (!tab) return;   /* ไม่มีแล้ว / เปลี่ยนไปแล้ว */
      if (op.t === 'deltab') reqs.push({ deleteTab: { tabId: tab.getId() } });
      else reqs.push({ updateDocumentTabProperties: { tabProperties: { tabId: tab.getId(), title: op.title }, fields: 'title' } });
    }
  });
  if (note.length) return { manual: true, note: note.join(' · '), miss: [] };
  if (!reqs.length) return { applied: 0, miss: [] };
  try {
    Docs.Documents.batchUpdate({ requests: reqs }, tg.id);
    return { applied: reqs.length, miss: [] };
  } catch (err) {
    return { manual: true, note: 'Google ไม่ยอมให้สคริปต์จัดการแท็บ: ' + (err && err.message || err), miss: [] };
  }
}

function doc_(tg, ops) {
  var doc = DocumentApp.openById(tg.id);
  if (ops.length && /tab$/.test(ops[0].t)) return tabOps_(doc, tg, ops);
  var tab = findTab_(doc.getTabs(), tg.path);
  if (!tab) throw new Error('ไม่พบแท็บ "' + (tg.path || []).join(' › ') + '" ในไฟล์');
  var body = tab.asDocumentTab().getBody(), P = paras_(body);
  var T = P.map(function (p) { return squash_(p.getText()); });
  function find(ref) {
    if (!ref) return null;
    var hits = [];
    var want = squash_(ref.old), pv = ref.prev != null ? squash_(ref.prev) : null, nx = ref.next != null ? squash_(ref.next) : null;
    for (var i = 0; i < T.length; i++) if (T[i] === want) hits.push(i);
    if (!hits.length) return null;
    /* ข้อความซ้ำหลายที่ → เลือกที่ย่อหน้าก่อน/หลังตรงกัน ก่อนใช้ลำดับที่ */
    if (hits.length > 1 && (pv != null || nx != null)) {
      var best = null, bs = -1;
      hits.forEach(function (h) { var sc = (pv != null && T[h - 1] === pv ? 1 : 0) + (nx != null && T[h + 1] === nx ? 1 : 0); if (sc > bs) { bs = sc; best = h; } });
      if (bs > 0) return P[best];
    }
    return P[hits[Math.min(ref.n || 0, hits.length - 1)]];
  }
  /* หาตำแหน่งให้ครบก่อน แล้วค่อยแก้ (แก้แล้วข้อความเปลี่ยน จะหาไม่เจอ) */
  var jobs = [], miss = [];
  ops.forEach(function (op) {
    if (op.t === 'mod' || op.t === 'del') {
      var p = find(op.at);
      if (p) jobs.push({ op: op, p: p });
      else if (op.t === 'mod' && T.indexOf(squash_(op.text)) >= 0) { /* แก้ไว้แล้ว */ }
      else miss.push(op.at.old.slice(0, 40));
    } else if (op.t === 'ins') {
      var a = find(op.after), b = a ? null : find(op.before);
      if (a || b || (!op.after && !op.before)) jobs.push({ op: op, p: a, b: b });
      else miss.push((op.after || op.before).old.slice(0, 40));
    }
  });
  var n = 0;
  jobs.forEach(function (j) {
    var op = j.op;
    if (op.t === 'mod') { setText_(j.p, op.text); n++; }
    else if (op.t === 'del') {
      var par = j.p.getParent();
      if (par.getNumChildren() > 1) j.p.removeFromParent(); else j.p.setText('');
      n++;
    } else if (op.t === 'ins') {
      var prev = j.p;
      op.items.forEach(function (it, k) {
        var el;
        if (prev) el = insertAfter_(prev, it);
        else if (j.b) { var pa = j.b.getParent(); el = insertAt_(pa, pa.getChildIndex(j.b), it, j.b); }
        else el = body.appendParagraph(it.text);
        prev = el; n++;
      });
    }
  });
  /* ตรวจซ้ำว่าเขียนลงจริง — ไม่เจอ = แจ้งว่าไม่สำเร็จ (ไม่ขึ้น "ส่งแล้ว" ทั้งที่ไฟล์ไม่เปลี่ยน) */
  var T2 = paras_(body).map(function (p) { return squash_(p.getText()); }), all = T2.join('\n');
  ops.forEach(function (op) {
    if (op.t === 'mod' && squash_(op.text) && T2.indexOf(squash_(op.text)) < 0) miss.push('เขียนแล้วแต่ไม่พบ: ' + op.text.slice(0, 40));
    if (op.t === 'ins') op.items.forEach(function (it) { if (squash_(it.text) && all.indexOf(squash_(it.text)) < 0) miss.push('เพิ่มแล้วแต่ไม่พบ: ' + it.text.slice(0, 40)); });
  });
  return { applied: n, miss: miss, tab: tab.getTitle() };
}

/* แก้ข้อความทั้งย่อหน้า โดยแตะเฉพาะช่วงที่ต่าง — ตัวหนา/สีของส่วนที่ไม่เปลี่ยนอยู่เหมือนเดิม */
function setText_(p, txt) {
  var t = p.editAsText(), old = t.getText();
  if (old === txt) return;
  if (!old.length) { t.setText(txt); return; }
  var eq = function (a, b) { return a === b || (/[\u00a0 ]/.test(a) && /[\u00a0 ]/.test(b)) || (/[\u000b\r\n]/.test(a) && /[\u000b\r\n]/.test(b)); };
  var s = 0; while (s < old.length && s < txt.length && eq(old[s], txt[s])) s++;
  var eo = old.length, en = txt.length;
  while (eo > s && en > s && eq(old[eo - 1], txt[en - 1])) { eo--; en--; }
  if (eo > s) t.deleteText(s, eo - 1);
  if (en > s) {
    if (s < t.getText().length) t.insertText(s, txt.slice(s, en));
    else t.appendText(txt.slice(s, en));
  }
}

var HEAD_ = { h1: 'HEADING1', h2: 'HEADING2', h3: 'HEADING3', h4: 'HEADING4', h5: 'HEADING5', h6: 'HEADING6' };
function insertAt_(parent, idx, it, like) {
  var el;
  if (like && like.getType() === DocumentApp.ElementType.LIST_ITEM && it.k === 'li') {
    el = parent.insertListItem(idx, it.text); el.setListId(like); el.setNestingLevel(like.getNestingLevel()); el.setGlyphType(like.getGlyphType());
  } else {
    el = parent.insertParagraph(idx, it.text);
    if (HEAD_[it.k]) el.setHeading(DocumentApp.ParagraphHeading[HEAD_[it.k]]);
    else if (like && like.getType() === DocumentApp.ElementType.PARAGRAPH) el.setHeading(DocumentApp.ParagraphHeading.NORMAL);
  }
  return el;
}
function insertAfter_(prev, it) {
  var parent = prev.getParent();
  return insertAt_(parent, parent.getChildIndex(prev) + 1, it, prev);
}

/* ---------- Doc → HTML (สำหรับหน้าเว็บ) ---------- */
function findById_(tabs, id) {
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].getId() === id) return tabs[i];
    var c = findById_(tabs[i].getChildTabs(), id); if (c) return c;
  }
  return null;
}
function esc_(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
var ET_ = DocumentApp.ElementType;
function textHtml_(t) {
  var s = t.getText(); if (!s.length) return '';
  var idx = t.getTextAttributeIndices(), out = '';
  for (var i = 0; i < idx.length; i++) {
    var a = idx[i], b = i + 1 < idx.length ? idx[i + 1] : s.length, seg = s.slice(a, b); if (!seg) continue;
    var h = esc_(seg).replace(/\r|\n/g, '<br>').replace(/\u000b/g, '<br>'), st = [];
    var fg = t.getForegroundColor(a), bg = t.getBackgroundColor(a), url = t.getLinkUrl(a);
    if (fg && !/^#0{6}$/i.test(fg)) st.push('color:' + fg);
    if (bg && !/^#f{6}$/i.test(bg)) st.push('background-color:' + bg);
    if (t.isStrikethrough(a)) st.push('text-decoration:line-through');
    if (t.isUnderline(a) && !url) st.push('text-decoration:underline');
    if (t.isBold(a)) h = '<b>' + h + '</b>';
    if (t.isItalic(a)) h = '<i>' + h + '</i>';
    if (st.length) h = '<span style="' + st.join(';') + '">' + h + '</span>';
    if (url) h = '<a href="' + esc_(url) + '" target="_blank" rel="noopener">' + h + '</a>';
    out += h;
  }
  return out;
}
function inlineHtml_(el) {
  var out = '';
  for (var i = 0; i < el.getNumChildren(); i++) {
    var c = el.getChild(i), t = c.getType();
    if (t === ET_.TEXT) out += textHtml_(c.asText());
    else if (t === ET_.INLINE_IMAGE) {
      try { var bl = c.asInlineImage().getBlob(); out += '<img src="data:' + bl.getContentType() + ';base64,' + Utilities.base64Encode(bl.getBytes()) + '" alt="">'; } catch (e) { }
    } else if (t === ET_.HORIZONTAL_RULE) out += '<hr>';
    else if (c.getText) out += esc_(c.getText());
  }
  return out;
}
var HN_ = {};
function tabHtml_(body) {
  var heads = [], n = 0;
  HN_[DocumentApp.ParagraphHeading.HEADING1] = 1; HN_[DocumentApp.ParagraphHeading.HEADING2] = 2; HN_[DocumentApp.ParagraphHeading.HEADING3] = 3;
  HN_[DocumentApp.ParagraphHeading.HEADING4] = 4; HN_[DocumentApp.ParagraphHeading.HEADING5] = 5; HN_[DocumentApp.ParagraphHeading.HEADING6] = 6;
  HN_[DocumentApp.ParagraphHeading.TITLE] = 1; HN_[DocumentApp.ParagraphHeading.SUBTITLE] = 2;
  function block(el) {
    var t = el.getType();
    if (t === ET_.PARAGRAPH) {
      var p = el.asParagraph(), inner = inlineHtml_(p), lv = HN_[p.getHeading()];
      var al = p.getAlignment(), sty = al === DocumentApp.HorizontalAlignment.CENTER ? ' style="text-align:center"' : al === DocumentApp.HorizontalAlignment.RIGHT ? ' style="text-align:right"' : '';
      if (lv) { var id = 'gl-' + (++n), txt = p.getText().trim(); if (txt) heads.push({ id: id, l: lv, t: txt }); return '<h' + lv + ' id="' + id + '"' + sty + '>' + inner + '</h' + lv + '>'; }
      return '<p' + sty + '>' + (inner || '<br>') + '</p>';
    }
    if (t === ET_.TABLE) {
      var tb = el.asTable(), rows = '';
      for (var r = 0; r < tb.getNumRows(); r++) {
        var row = tb.getRow(r), cells = '';
        for (var c = 0; c < row.getNumCells(); c++) {
          var cell = row.getCell(c), bg = cell.getBackgroundColor();
          cells += '<td' + (bg && !/^#f{6}$/i.test(bg) ? ' style="background-color:' + bg + '"' : '') + '>' + container(cell) + '</td>';
        }
        rows += '<tr>' + cells + '</tr>';
      }
      return '<table><tbody>' + rows + '</tbody></table>';
    }
    if (t === ET_.HORIZONTAL_RULE) return '<hr>';
    return '';
  }
  /* รายการ (ListItem) ต่อกัน → ul/ol ซ้อนตามระดับ */
  function container(el) {
    var out = '', stack = [];
    function close(to) { while (stack.length > to) out += '</li></' + stack.pop() + '>'; }
    for (var i = 0; i < el.getNumChildren(); i++) {
      var c = el.getChild(i);
      if (c.getType() === ET_.LIST_ITEM) {
        var li = c.asListItem(), lvl = li.getNestingLevel() + 1, g = li.getGlyphType();
        var tag = (g === DocumentApp.GlyphType.NUMBER || g === DocumentApp.GlyphType.LATIN_LOWER || g === DocumentApp.GlyphType.LATIN_UPPER || g === DocumentApp.GlyphType.ROMAN_LOWER || g === DocumentApp.GlyphType.ROMAN_UPPER) ? 'ol' : 'ul';
        if (stack.length >= lvl) { close(lvl); out += '</li>'; }
        while (stack.length < lvl) { out += '<' + tag + '>'; stack.push(tag); }
        out += '<li>' + inlineHtml_(li);
      } else { close(0); out += block(c); }
    }
    close(0);
    return out;
  }
  return { html: container(body), heads: heads };
}

/* ข้อความไว้เทียบ: ถอด entity, ตัดช่องว่างทุกชนิด */
function squash_(t) {
  return String(t || '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(+d); }).replace(/&#x([0-9a-f]+);/gi, function (m, h) { return String.fromCharCode(parseInt(h, 16)); })
    .replace(/[\s ​ \u000b]+/g, '');
}
