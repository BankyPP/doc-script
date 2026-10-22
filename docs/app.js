/* โพยหมอ — single-page app (hash routes)
   #/ · #/preclinic[/sys[/doc]] · #/clinic[/approach] · #/diseases?s=&q=&f=&v= · #/disease/<no> · #/exam?t=&src= */
(function () {
  'use strict';
  var C = window.POY_CONFIG, SYS = window.POY_SYSTEMS, OTHER = window.POY_OTHER;
  var PRE = window.POY_PRECLINIC, CLI = window.POY_CLINIC;
  var app = document.getElementById('app');

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return ('000' + n).slice(-4); }
  /* ค่าที่ซิงก์เข้าบัญชี (API key ไม่ซิงก์ — อยู่ในเบราว์เซอร์นั้นเท่านั้น) */
  var SYNC_KEYS = ['recent', 'quiz', 'level', 'count', 'engine', 'model'];
  function rawGet(k, d) { try { var v = localStorage.getItem('poy-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function rawSet(k, v) { try { localStorage.setItem('poy-' + k, JSON.stringify(v)); } catch (e) { } }
  var LS = {
    get: rawGet,
    set: function (k, v) {
      rawSet(k, v);
      if (SYNC_KEYS.indexOf(k) >= 0) { var ts = rawGet('ts', {}); ts[k] = Date.now(); rawSet('ts', ts); schedulePush(); }
    },
    del: function (k) { try { localStorage.removeItem('poy-' + k); } catch (e) { } }
  };

  /* ---------- บัญชี (Firebase — ใช้โปรเจกต์เดียวกับคลังข้อสอบเก่า MDCU) ---------- */
  var FB = null, fbFail = false, syncState = 'local', authErr = '';
  function fbOn() { return !!(window.POY_CONFIG.firebase && window.POY_CONFIG.firebase.apiKey); }
  /* ---------- รหัสเข้าเว็บ (soft lock เหมือนคลังข้อสอบเก่า) ---------- */
  var gateOk = false;
  function devTrusted() {
    var keys = ['poy-trusted'].concat((window.POY_CONFIG.gate && window.POY_CONFIG.gate.trustKeys) || []);
    try { return keys.some(function (k) { return localStorage.getItem(k) === '1'; }); } catch (e) { return false; }
  }
  function markTrusted() { try { localStorage.setItem('poy-trusted', '1'); } catch (e) { } }
  function gateOn() { var g = window.POY_CONFIG.gate; return !!(g && g.on && g.h) && !gateOk && !devTrusted() && !(FB && FB.user); }
  function gateHash(t) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode((window.POY_CONFIG.gate.salt || '') + t)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function renderGate() {
    document.body.classList.add('gated');
    document.title = window.POY_CONFIG.title;
    app.innerHTML = '<form class="gate" id="gateF" autocomplete="off"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5A6258" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>' +
      '<input class="field" type="password" id="gateIn" placeholder="รหัสผ่าน" aria-label="รหัสผ่าน" autocomplete="off"><button class="btn" type="submit">เข้าเว็บ</button><p class="warn" id="gateErr" hidden>รหัสไม่ถูกต้อง</p></form>';
    var i = document.getElementById('gateIn'); setTimeout(function () { i.focus(); }, 50);
    document.getElementById('gateF').addEventListener('submit', function (e) {
      e.preventDefault();
      gateHash(i.value).then(function (h) { return h === window.POY_CONFIG.gate.h; }, function () { return false; }).then(function (ok) {
        if (ok) { gateOk = true; render(false); } else { document.getElementById('gateErr').hidden = false; i.value = ''; i.focus(); }
      });
    });
  }

  function fbRef() { return FB.fs.doc(FB.db, 'poymor', FB.user.uid, 'data', 'state'); }
  function who(u) {
    var dom = window.POY_CONFIG.userDomain || '', e = (u && u.email) || '';
    return dom && e.slice(-dom.length) === dom ? e.slice(0, -dom.length) : (e || (u && u.displayName) || '');
  }
  function toEmail(x) {
    x = String(x || '').trim(); if (x.indexOf('@') >= 0) return x;
    var n = x.toLowerCase(); if (!/^[a-z0-9._-]{3,30}$/.test(n)) throw { code: 'bad-username' };
    return n + window.POY_CONFIG.userDomain;
  }
  function errMsg(e) {
    var c = (e && e.code) || '';
    return ({
      'bad-username': 'ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, 0-9, จุด, ขีด ยาว 3–30 ตัว',
      'auth/invalid-email': 'ชื่อผู้ใช้หรืออีเมลไม่ถูกต้อง', 'auth/missing-password': 'กรุณาใส่รหัสผ่าน',
      'auth/weak-password': 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว',
      'auth/email-already-in-use': 'ชื่อผู้ใช้/อีเมลนี้มีคนใช้แล้ว ถ้าเป็นของคุณให้กดเข้าสู่ระบบ',
      'auth/invalid-credential': 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง', 'auth/wrong-password': 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง',
      'auth/user-not-found': 'ยังไม่มีบัญชีนี้ ให้กดสมัครใหม่', 'auth/too-many-requests': 'ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่',
      'auth/popup-closed-by-user': 'ปิดหน้าต่าง Google ก่อนเข้าสู่ระบบเสร็จ', 'auth/network-request-failed': 'เชื่อมต่ออินเทอร์เน็ตไม่ได้',
      'auth/unauthorized-domain': 'โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase (Authentication → Settings → Authorized domains)',
      'permission-denied': 'Firestore ไม่อนุญาต — ตรวจ rules ของ poymor'
    })[c] || ((e && e.message) || 'เกิดข้อผิดพลาด');
  }
  function paintAcct() {
    var b = document.getElementById('acct'); if (!b) return;
    if (!fbOn()) { b.hidden = true; return; }
    b.hidden = false;
    var u = FB && FB.user;
    var dot = !u ? 'var(--rule-3)' : syncState === 'error' ? 'var(--sienna)' : syncState === 'saving' ? 'var(--ochre, #C9952E)' : 'var(--moss)';
    b.innerHTML = '<span class="dot" style="background:' + dot + '"></span>' + (u ? esc(who(u) || 'บัญชีของฉัน') : 'เข้าสู่ระบบ');
    b.title = !u ? 'บันทึกในเบราว์เซอร์นี้ — เข้าสู่ระบบเพื่อใช้หลายเครื่อง' : syncState === 'error' ? 'ซิงก์ไม่สำเร็จ — ยังบันทึกในเครื่องนี้' : syncState === 'saving' ? 'กำลังบันทึก…' : 'บันทึกในบัญชีแล้ว';
    if (route().name === 'account') render(true);
  }
  function mergeRemote(data) {
    var lts = rawGet('ts', {}), rts = (data && data.ts) || {}, v = (data && data.v) || {}, changed = [], needPush = false;
    SYNC_KEYS.forEach(function (k) {
      var r = rts[k] || 0, l = lts[k] || 0, hasLocal = localStorage.getItem('poy-' + k) != null;
      if (r > l && v[k] != null) { try { rawSet(k, JSON.parse(v[k])); lts[k] = r; changed.push(k); } catch (e) { } }
      else if (hasLocal && (l > r || !v.hasOwnProperty(k))) { if (!l) lts[k] = 1; needPush = true; }
    });
    rawSet('ts', lts);
    if (changed.length) {
      var n = route().name;
      if ((n === '' && changed.indexOf('recent') >= 0) || n === 'exam') render(true);
    }
    return needPush;
  }
  var pushT = null;
  function schedulePush() {
    if (!FB || !FB.user) return;
    clearTimeout(pushT); syncState = 'saving'; paintAcct();
    pushT = setTimeout(pushNow, 1200);
  }
  function pushNow() {
    clearTimeout(pushT);
    if (!FB || !FB.user) return Promise.resolve();
    var v = {}; SYNC_KEYS.forEach(function (k) { var s = localStorage.getItem('poy-' + k); if (s != null) v[k] = s; });
    syncState = 'saving'; paintAcct();
    return FB.fs.setDoc(fbRef(), { v: v, ts: rawGet('ts', {}), u: FB.fs.serverTimestamp() }).then(function () { syncState = 'cloud'; paintAcct(); })
      .catch(function (e) { console.warn(e); syncState = 'error'; authErr = errMsg(e); paintAcct(); });
  }
  var unsub = null;
  function initFB() {
    if (!fbOn()) { paintAcct(); return; }
    var b = 'https://www.gstatic.com/firebasejs/10.12.2/';
    Promise.all([import(b + 'firebase-app.js'), import(b + 'firebase-auth.js'), import(b + 'firebase-firestore.js')]).then(function (m) {
      var fapp = m[0].initializeApp(window.POY_CONFIG.firebase);
      FB = { au: m[1], fs: m[2], auth: m[1].getAuth(fapp), db: m[2].getFirestore(fapp), user: null };
      m[1].setPersistence(FB.auth, m[1].browserLocalPersistence).catch(function () { });
      m[1].getRedirectResult(FB.auth).catch(function (e) { authErr = errMsg(e); paintAcct(); });
      m[1].onAuthStateChanged(FB.auth, function (u) {
        FB.user = u; if (unsub) { unsub(); unsub = null; }
        if (!u) { syncState = 'local'; paintAcct(); return; }
        markTrusted(); if (document.body.classList.contains('gated')) { gateOk = true; render(false); }
        authErr = ''; syncState = 'saving'; paintAcct();
        FB.fs.getDoc(fbRef()).then(function (snap) {
          var need = mergeRemote(snap.exists() ? snap.data() : null);
          syncState = 'cloud'; paintAcct();
          if (need) pushNow();
          unsub = FB.fs.onSnapshot(fbRef(), function (s) { if (s.exists() && !s.metadata.hasPendingWrites) mergeRemote(s.data()); });
        }).catch(function (e) { console.warn(e); syncState = 'error'; authErr = errMsg(e); paintAcct(); });
      });
    }).catch(function (e) { console.warn('firebase', e); fbFail = true; paintAcct(); });
  }
  window.addEventListener('pagehide', function () { if (pushT) pushNow(); });
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function fmtTime(d) {
    if (!d) return '';
    d = new Date(d);
    return d.toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  function brush(c, w) {
    return '<svg width="' + (w || 150) + '" height="26" viewBox="0 0 180 28" aria-hidden="true"><path d="M4 15 C22 6 64 4 122 8 C150 10 168 12 176 16 C160 23 110 25 62 23 C30 22 10 21 4 15Z" fill="' + c + '" opacity=".88"/></svg>';
  }
  function rich(v) {
    var lines = String(v || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    var out = '', ul = false;
    lines.forEach(function (l) {
      var m = l.match(/^[-•*·]\s*(.*)$/);
      if (m) { if (!ul) { out += '<ul>'; ul = true; } out += '<li>' + esc(m[1]) + '</li>'; }
      else { if (ul) { out += '</ul>'; ul = false; } out += '<p>' + esc(l) + '</p>'; }
    });
    if (ul) out += '</ul>';
    return out;
  }
  function plain(v) { return String(v || '').replace(/\s*\n\s*[-•*·]?\s*/g, ' · ').replace(/^[-•*·]\s*/, ''); }
  var ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx'];
  function roman(i) { return (ROMAN[i] || String(i + 1)) + '.'; }

  /* ---------- recent ---------- */
  function remember(item) {
    var r = LS.get('recent', []).filter(function (x) { return x.href !== item.href; });
    r.unshift(item); LS.set('recent', r.slice(0, 6));
  }

  /* ---------- CSV ---------- */
  function parseCSV(text) {
    var rows = [], row = [], f = '', q = false, i, ch;
    for (i = 0; i < text.length; i++) {
      ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(f); f = ''; }
      else if (ch === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
      else if (ch !== '\r') f += ch;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows;
  }

  /* ---------- systems ---------- */
  function sysOf(v) {
    var s = String(v || '').toLowerCase().trim();
    if (!s) return OTHER;
    var i, j, m;
    for (i = 0; i < SYS.length; i++) if (s === SYS[i].name.toLowerCase() || s === SYS[i].id) return SYS[i];
    for (i = 0; i < SYS.length; i++) for (j = 0; j < SYS[i].match.length; j++) {
      m = SYS[i].match[j];
      if (m.length <= 3 && /^[a-z]+$/.test(m)) { if (new RegExp('(^|[^a-z])' + m + '([^a-z]|$)').test(s)) return SYS[i]; }
      else if (s.indexOf(m) >= 0) return SYS[i];
    }
    return OTHER;
  }
  function sysById(id) { if (id === 'other') return OTHER; for (var i = 0; i < SYS.length; i++) if (SYS[i].id === id) return SYS[i]; return null; }

  /* ---------- diseases: build from rows (sheet or sample) ---------- */
  function build(rows) {
    rows = rows.filter(function (r) { return r.some(function (c) { return String(c).trim(); }); });
    if (!rows.length) return [];
    var H = rows[0].map(function (h) { return String(h).trim(); });
    function find(re, not) { for (var i = 0; i < H.length; i++) if (re.test(H[i]) && !(not && not.test(H[i]))) return i; return -1; }
    var iTh = find(/ไทย|thai/i);
    var iName = find(/^(ชื่อโรค|โรค|disease|name|ชื่อ)/i, /ไทย|thai/i); if (iName < 0) iName = 0;
    var iSys = find(/ระบบ|system|หมวด|กลุ่มโรค|specialty/i);
    var iNo = find(/^(no\.?|ลำดับ|เลขที่|#|id)$/i);
    var skip = {}; [iTh, iName, iSys, iNo].forEach(function (i) { if (i >= 0) skip[i] = 1; });
    var out = [], seen = {};
    rows.slice(1).forEach(function (r, k) {
      var name = String(r[iName] || '').trim(); if (!name) return;
      var fields = [];
      H.forEach(function (h, j) { if (!skip[j]) fields.push({ label: h || ('คอลัมน์ ' + (j + 1)), value: String(r[j] == null ? '' : r[j]).trim() }); });
      var no = iNo >= 0 && String(r[iNo] || '').trim() ? String(r[iNo]).trim() : pad(k + 1);
      if (seen[no]) no = no + '-' + (k + 1); seen[no] = 1;
      var sysRaw = iSys >= 0 ? String(r[iSys] || '').trim() : '';
      out.push({
        no: no, row: k + 2, name: name, th: iTh >= 0 ? String(r[iTh] || '').trim() : '',
        sysRaw: sysRaw, sys: sysOf(sysRaw), fields: fields,
        filled: fields.filter(function (f) { return f.value; }).length
      });
    });
    return out;
  }

  var D = { list: [], src: 'sample', at: null, err: null, loading: false };
  function hasSheet() { return !!(C.sheet && (C.sheet.id || C.sheet.csvUrl)); }
  function sheetUrl() {
    if (C.sheet.csvUrl) return C.sheet.csvUrl + (C.sheet.csvUrl.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now();
    return 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(C.sheet.id) + '/gviz/tq?tqx=out:csv&headers=1&gid=' + encodeURIComponent(C.sheet.gid || '0') + '&_=' + Date.now();
  }
  function initDiseases() {
    if (!hasSheet()) { D.list = build(window.POY_SAMPLE || []); D.src = 'sample'; return; }
    var cache = LS.get('dcache', null);
    if (cache && cache.id === (C.sheet.id || C.sheet.csvUrl) && cache.rows) { D.list = build(cache.rows); D.src = 'cache'; D.at = cache.at; }
    loadSheet();
  }
  function loadSheet() {
    if (!hasSheet() || D.loading) return;
    D.loading = true; D.err = null; refreshLive();
    fetch(sheetUrl(), { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function (txt) {
      if (/^\s*</.test(txt)) throw new Error('ชีตยังไม่ได้เปิดแชร์ให้ทุกคนที่มีลิงก์ดูได้');
      var rows = parseCSV(txt);
      D.list = build(rows); D.src = 'sheet'; D.at = Date.now();
      LS.set('dcache', { id: C.sheet.id || C.sheet.csvUrl, at: D.at, rows: rows });
    }).catch(function (e) {
      D.err = e.message || String(e);
      if (!D.list.length) { D.list = build(window.POY_SAMPLE || []); D.src = 'sample'; }
    }).then(function () {
      D.loading = false;
      var r = route();
      if (['', 'diseases', 'disease', 'exam'].indexOf(r.name) >= 0) render(true); else refreshLive();
    });
  }
  function liveHTML() {
    if (D.loading) return '<span class="live off" data-live><i></i>กำลังดึงข้อมูลจาก Google Sheet…</span>';
    if (D.err) return '<span class="live err" data-live><i></i>ดึงจาก Google Sheet ไม่สำเร็จ: ' + esc(D.err) + (D.src === 'cache' ? ' · แสดงข้อมูลที่ดึงไว้ล่าสุด' : ' · แสดงข้อมูลตัวอย่าง') + '</span>';
    if (D.src === 'sheet') return '<span class="live" data-live><i></i>ซิงก์กับ Google Sheet · ดึงล่าสุด ' + esc(fmtTime(D.at)) + '</span>';
    if (D.src === 'cache') return '<span class="live" data-live><i></i>ข้อมูลจาก Google Sheet · ' + esc(fmtTime(D.at)) + '</span>';
    return '<span class="live off" data-live><i></i>ข้อมูลตัวอย่าง · ยังไม่ได้เชื่อม Google Sheet</span>';
  }
  function refreshLive() { var el = document.querySelector('[data-live]'); if (el) el.outerHTML = liveHTML(); }
  function findDisease(key) {
    key = String(key || '').toLowerCase();
    for (var i = 0; i < D.list.length; i++) if (D.list[i].no.toLowerCase() === key) return D.list[i];
    for (i = 0; i < D.list.length; i++) if (D.list[i].name.toLowerCase() === key) return D.list[i];
    return null;
  }
  function dLink(name) {
    var d = findDisease(name);
    return d ? '#/disease/' + encodeURIComponent(d.no) : '#/diseases?q=' + encodeURIComponent(name);
  }

  /* ---------- router ---------- */
  function route() {
    var h = location.hash.replace(/^#\/?/, '');
    var qi = h.indexOf('?'), path = qi >= 0 ? h.slice(0, qi) : h, qs = qi >= 0 ? h.slice(qi + 1) : '';
    var parts = path.split('/').filter(Boolean).map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    return { name: parts[0] || '', args: parts.slice(1), q: new URLSearchParams(qs) };
  }
  var PAGES = {};
  var lastPath = null;
  function render(keepScroll) {
    if (gateOn()) { renderGate(); return; }
    document.body.classList.remove('gated');
    var r = route();
    var page = PAGES[r.name] || PAGES._404;
    document.querySelectorAll('.nav a').forEach(function (a) {
      var on = a.getAttribute('data-r') === r.name || (r.name === 'disease' && a.getAttribute('data-r') === 'diseases');
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var res = page(r);
    app.innerHTML = res.html;
    document.title = (res.title ? res.title + ' — ' : '') + C.title;
    if (res.after) res.after();
    var path = r.name + '/' + r.args.join('/');
    var to = r.q.get('to'), tel = to && document.getElementById(to);
    if (tel) tel.scrollIntoView();
    else if (!keepScroll && path !== lastPath) window.scrollTo(0, 0);
    lastPath = path;
  }
  window.addEventListener('hashchange', function () { render(false); });
  function setQuery(r, patch) {
    var q = new URLSearchParams(r.q.toString());
    Object.keys(patch).forEach(function (k) { if (patch[k] == null || patch[k] === '') q.delete(k); else q.set(k, patch[k]); });
    var s = q.toString();
    history.replaceState(null, '', '#/' + [r.name].concat(r.args.map(encodeURIComponent)).join('/') + (s ? '?' + s : ''));
  }

  /* ---------- header search ---------- */
  document.getElementById('gsearch').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = this.querySelector('input').value.trim();
    location.hash = '#/diseases' + (v ? '?q=' + encodeURIComponent(v) : '');
  });

  /* =========================================================
     HOME
     ========================================================= */
  var PLANT = '<svg viewBox="0 0 540 560" width="100%" role="img" aria-label="ภาพร่างต้นไม้: รากคือ preclinic ลำต้นและใบคือ clinic ดอกคือการสอบ NL และ Compre">' +
    '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M40 330 C150 323 360 337 500 328" stroke="#1E2620" stroke-width="1.6"/>' +
    '<path d="M60 338 C70 336 84 340 96 337 M420 336 C436 333 452 337 470 334" stroke="#1E2620" stroke-width="1" opacity=".5"/>' +
    '<g stroke="#7A5C3E" stroke-width="1.8"><path d="M250 330 C248 380 256 420 246 474"/><path d="M249 360 C230 380 210 388 186 410 C176 420 170 428 162 444"/><path d="M251 372 C272 392 292 398 320 424 C330 434 336 446 338 458"/><path d="M248 412 C234 432 220 452 216 490"/><path d="M252 432 C266 450 282 462 290 496"/></g>' +
    '<g stroke="#7A5C3E" stroke-width="1" opacity=".7"><path d="M186 410 C178 404 170 404 160 406"/><path d="M320 424 C330 418 340 418 352 420"/><path d="M216 470 C208 474 200 482 196 494"/><path d="M246 474 C244 490 246 500 242 514"/><path d="M290 480 C298 486 304 494 306 506"/></g>' +
    '<path d="M250 330 C246 270 258 210 250 150 C246 118 252 96 250 82" stroke="#355A3A" stroke-width="2.6"/>' +
    '<path d="M249 272 C220 264 196 246 184 214 C216 218 240 238 249 272Z" fill="#355A3A" fill-opacity=".16" stroke="#355A3A" stroke-width="1.6"/><path d="M249 272 C228 252 206 232 186 216" stroke="#355A3A" stroke-width="1"/>' +
    '<path d="M252 226 C282 214 306 192 314 160 C284 166 260 190 252 226Z" fill="#355A3A" fill-opacity=".16" stroke="#355A3A" stroke-width="1.6"/><path d="M252 226 C272 206 292 184 312 162" stroke="#355A3A" stroke-width="1"/>' +
    '<path d="M250 182 C228 174 214 160 208 138 C228 142 244 156 250 182Z" fill="#355A3A" fill-opacity=".16" stroke="#355A3A" stroke-width="1.6"/>' +
    '<g transform="translate(250 64)" stroke="#A44A2A" stroke-width="1.5" fill="#A44A2A" fill-opacity=".2"><ellipse cx="0" cy="-17" rx="10" ry="18"/><ellipse cx="0" cy="-17" rx="10" ry="18" transform="rotate(72)"/><ellipse cx="0" cy="-17" rx="10" ry="18" transform="rotate(144)"/><ellipse cx="0" cy="-17" rx="10" ry="18" transform="rotate(216)"/><ellipse cx="0" cy="-17" rx="10" ry="18" transform="rotate(288)"/><circle cx="0" cy="0" r="7" fill="#C9952E" fill-opacity="1" stroke="#7A5C3E"/></g>' +
    '<g stroke="#1E2620" stroke-width="1" opacity=".75"><path d="M276 52 L352 40"/><path d="M314 168 L360 176"/><path d="M338 452 L372 466"/><path d="M246 250 L150 250"/></g></g>' +
    '<circle cx="248" cy="250" r="6" fill="#A44A2A"/>' +
    '<g font-family="Sarabun, sans-serif" font-size="15" fill="#1E2620">' +
    '<text x="358" y="36"><tspan font-family="Kanit, sans-serif" font-weight="600">ดอก</tspan><tspan x="358" dy="20" fill="#5A6258">Compre · NL · License</tspan></text>' +
    '<text x="366" y="172"><tspan font-family="Kanit, sans-serif" font-weight="600">ลำต้นและใบ</tspan><tspan x="366" dy="20" fill="#5A6258">Clinic ปี 4–6</tspan><tspan x="366" dy="20" fill="#5A6258">1000 โรค</tspan></text>' +
    '<text x="378" y="466"><tspan font-family="Kanit, sans-serif" font-weight="600">ราก</tspan><tspan x="378" dy="20" fill="#5A6258">Preclinic ปี 1–3</tspan></text>' +
    '<text x="142" y="246" text-anchor="end"><tspan font-family="Kanit, sans-serif" font-weight="600" fill="#A44A2A">ตอนนี้</tspan><tspan x="142" dy="20" fill="#5A6258">ปี ' + esc(C.currentYear) + '</tspan></text>' +
    '<text x="40" y="548" font-style="italic" fill="#5A6258" font-size="14">Fig. 1 — Medicus studens, ปี 1 → License</text></g></svg>';

  PAGES[''] = function () {
    var n = D.src === 'sample' ? 0 : D.list.length;
    var pct = Math.min(100, n / 10);
    var plots = [
      ['#/preclinic', '#3E7CA6', '01 · ราก', 'Preclinic แยกตาม system', 'สรุปปี 1–3 จัดตาม 12 ระบบ อ่านต่อกันได้ตั้งแต่ anatomy ไปจนถึง pharmacology', '<span class="muted">ดึงจาก Google Docs</span>'],
      ['#/clinic', '#5C7F3A', '02 · ลำต้น', 'Clinic', 'สมุดวอร์ดของแต่ละ rotation และ approach ตามอาการนำ ที่กดต่อไปหาโรคได้ทันที', '<span class="muted">เขียนในเว็บ + คลังข้อสอบเก่า</span>'],
      ['#/diseases', '#9B4F2E', '03 · พรรณไม้', '1000 โรค', 'หนึ่งโรค หนึ่งแผ่นตัวอย่าง — diag, lab, initial management ครบในหน้าเดียว',
        '<span class="live' + (D.src === 'sample' ? ' off' : '') + '"><i></i>' + (D.src === 'sample' ? 'ยังไม่ได้เชื่อม Google Sheet' : 'ซิงก์จาก Google Sheet') + '</span>',
        '<div style="display:flex;flex-direction:column;gap:6px"><div style="height:6px;background:#E4DDCB;border-radius:3px"><div style="width:' + pct + '%;height:6px;background:#9B4F2E;border-radius:3px"></div></div><span class="muted" style="font-size:14px">เก็บแล้ว ' + n + ' / 1000</span></div>'],
      ['#/exam', '#C9952E', '04 · ห้องสอบ', 'ข้อสอบจาก AI', 'เลือกโรค ระบบ หรือเอกสาร แล้วให้ AI ออกข้อสอบ case-based พร้อมเฉลย', '<span class="muted">ใช้ Claude หรือ API key</span>'],
      ['#/exam?t=mock', '#A33A3A', '05 · เก็งข้อสอบ', 'Mock exam ตาม blueprint', 'จัดชุดตาม blueprint ของ Compre และ NL กำหนดระดับความยากได้ 5 ระดับ', '<span class="muted">รอ blueprint และนิยามความยาก</span>']
    ];
    var rot = [-2.5, 2, -4, 1, -1.5];
    var plotsHTML = plots.map(function (p, i) {
      return '<a class="sheet plot" href="' + p[0] + '"><div class="tape" style="transform:rotate(' + rot[i] + 'deg)"></div>' + brush(p[1]) +
        '<span class="label">' + p[2] + '</span><h3>' + p[3] + '</h3><p class="muted">' + p[4] + '</p>' + (p[6] || '') +
        '<div class="foot">' + p[5] + '<span class="k" style="font-size:20px" aria-hidden="true">→</span></div></a>';
    }).join('') +
      '<a class="plot soon" href="#/?to=nl">' + brush('#4A5560') + '<span class="label">06 · ยอดเขา</span><h3>ติว NL &amp; Compre</h3><p class="muted">กำลังเตรียมแปลง — รายละเอียดจะมาเพิ่มทีหลัง</p><div class="foot"><span class="muted">เร็ว ๆ นี้</span></div></a>';

    var recent = LS.get('recent', []);
    var recentHTML = recent.length ? recent.slice(0, 4).map(function (x) {
      return '<a class="row" href="' + esc(x.href) + '"><span class="sw" style="background:' + esc(x.c || '#8A8F86') + '"></span><span style="flex:1;min-width:0"><span class="muted" style="font-size:14px;display:block">' + esc(x.crumb) + '</span><span class="k" style="font-size:18px;font-weight:500">' + esc(x.title) + '</span></span></a>';
    }).join('') : '<p class="muted" style="padding:14px 0">ยังไม่มี — เปิดหน้าไหนไว้ จะมาขึ้นตรงนี้</p>';

    var newest = D.list.slice(-4).reverse();
    var newHTML = newest.map(function (d) {
      return '<a class="row" href="#/disease/' + encodeURIComponent(d.no) + '"><span class="muted" style="font-style:italic;font-size:14px;width:74px;flex:none">No. ' + esc(d.no) + '</span><span class="k" style="flex:1;min-width:0;font-size:18px;font-weight:500">' + esc(d.name) + '</span><span class="muted" style="display:inline-flex;align-items:center;gap:8px;font-size:14px"><span class="sw" style="background:' + d.sys.c + '"></span>' + esc(d.sys.name) + '</span></a>';
    }).join('');

    var tl = '';
    for (var y = 1; y <= 6; y++) {
      var cur = y === C.currentYear, past = y < C.currentYear;
      var dot = cur ? '<span class="n now"></span>' : '<span class="n" style="' + (past ? 'background:' + (y <= 3 ? '#3E7CA6' : '#5C7F3A') : 'border:2px solid ' + (y <= 3 ? '#3E7CA6' : '#5C7F3A') + ';background:var(--paper)') + '"></span>';
      tl += '<div>' + dot + '<span class="k" style="font-size:18px' + (cur ? ';color:var(--sienna)' : '') + '">ปี ' + y + (cur ? ' · ตอนนี้' : '') + '</span><span class="muted" style="font-size:14px">' + (y <= 3 ? 'Preclinic' : y === 6 ? 'Extern' : 'Clinic') + '</span></div>';
    }
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var exams = (C.exams || []).map(function (e) {
      var sub = 'วันสอบ — ยังไม่ได้ใส่';
      if (e.date) {
        var d = new Date(e.date + 'T00:00:00'), days = Math.round((d - today) / 864e5);
        sub = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + (days > 0 ? 'อีก ' + days + ' วัน' : days === 0 ? 'วันนี้' : 'ผ่านไปแล้ว');
      }
      return '<div class="sheet" style="padding:22px;display:flex;flex-direction:column;gap:6px"><span class="label">ปลายทาง</span><span class="k" style="font-size:22px">' + esc(e.name) + '</span><span class="muted" style="font-size:15px">' + esc(sub) + '</span></div>';
    }).join('');

    return {
      title: '', html:
        '<section class="wrap hero"><div style="flex:1 1 480px;min-width:0;display:flex;flex-direction:column;gap:26px"><span class="label">สมุดสนามของหมอ · เล่มที่ 1</span>' +
        '<h1>ทุกอย่างที่เคยเรียน<br>เก็บไว้ในเล่มเดียว</h1>' +
        '<p style="font-size:19px;max-width:560px;color:var(--ink-2)">คลังความรู้ตั้งแต่ปี 1 จนถึงวันสอบใบประกอบวิชาชีพ — สรุป preclinic, clinic, 1000 โรคที่ต้องรู้จัก และห้องสอบที่ให้ AI ช่วยออกข้อสอบจากสิ่งที่เราเก็บไว้เอง</p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:12px"><a class="btn" href="#/diseases">เปิดหอพรรณไม้ 1000 โรค</a><a class="btn ghost" href="#/exam">เข้าห้องสอบ AI</a></div></div>' +
        '<figure style="flex:1 1 420px;max-width:560px;min-width:0">' + PLANT + '</figure></section>' +
        '<section style="border-top:1px solid var(--rule);padding:56px 0 72px"><div class="wrap" style="display:flex;flex-direction:column;gap:32px">' +
        '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:12px 32px"><div style="display:flex;flex-direction:column;gap:8px"><span class="label">เมนู</span><h2 style="font-size:38px">วันนี้จะเดินแปลงไหน</h2></div>' +
        '<p class="muted" style="max-width:460px">แต่ละแปลงคือหนึ่งส่วนของเว็บ ข้อมูลบางส่วนดึงมาจาก Google Docs และ Google Sheet ที่เขียนอยู่แล้ว</p></div>' +
        '<div class="plots">' + plotsHTML + '</div></div></section>' +
        '<section class="band" style="padding:56px 0 64px"><div class="wrap" style="display:flex;flex-wrap:wrap;gap:40px 64px">' +
        '<div style="flex:1 1 440px;min-width:0;display:flex;flex-direction:column;gap:6px"><span class="label">ที่ค้างไว้</span><h2 style="font-size:30px;margin-bottom:8px">อ่านต่อจากครั้งก่อน</h2>' + recentHTML + '</div>' +
        '<div style="flex:1 1 440px;min-width:0;display:flex;flex-direction:column;gap:6px"><span class="label">' + (D.src === 'sample' ? 'ข้อมูลตัวอย่าง' : 'เพิ่งเก็บเข้าหอพรรณไม้ · จาก Google Sheet') + '</span><h2 style="font-size:30px;margin-bottom:8px">ตัวอย่างล่าสุด</h2>' + newHTML + '</div>' +
        '</div></section>' +
        '<section id="nl" style="padding:64px 0 72px"><div class="wrap" style="display:flex;flex-direction:column;gap:36px">' +
        '<div style="display:flex;flex-direction:column;gap:8px"><span class="label">เส้นทาง</span><h2 style="font-size:38px">จากปี 1 ถึงใบประกอบวิชาชีพ</h2></div>' +
        '<div style="overflow-x:auto;padding-bottom:8px"><div class="timeline"><svg viewBox="0 0 1000 40" preserveAspectRatio="none" style="position:absolute;left:0;top:14px;width:100%;height:40px" aria-hidden="true"><path d="M20 20 C180 8 320 32 500 18 C680 6 820 30 980 18" fill="none" stroke="#7A5C3E" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round"/></svg>' + tl + '</div></div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px">' + exams + '</div>' +
        '<p class="muted">ติว NL &amp; Compre — รายละเอียดจะมาเพิ่มทีหลัง · วันสอบแก้ได้ใน data/config.js</p></div></section>'
    };
  };

  /* =========================================================
     1000 โรค — list
     ========================================================= */
  function filterDiseases(st) {
    var q = (st.q || '').toLowerCase();
    return D.list.filter(function (d) {
      if (st.s && d.sys.id !== st.s) return false;
      if (st.f === 'full' && d.filled < d.fields.length) return false;
      if (st.f === 'part' && d.filled >= d.fields.length) return false;
      if (q) {
        var hay = (d.name + ' ' + d.th + ' ' + d.sysRaw + ' ' + d.fields.map(function (f) { return f.value; }).join(' ')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }
  function specCard(d, i) {
    var sum = d.fields.filter(function (f) { return f.value; }).slice(0, 2);
    var dots = d.fields.slice(0, 12).map(function (f) { return '<span class="dot" style="background:' + (f.value ? d.sys.c : 'var(--empty)') + '"></span>'; }).join('');
    var rot = ((i * 37) % 13 - 6) / 10;
    return '<a class="sheet spec" href="#/disease/' + encodeURIComponent(d.no) + '" style="transform:rotate(' + rot + 'deg)"><div class="tape"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span class="muted" style="font-style:italic;font-size:14px">No. ' + esc(d.no) + '</span>' +
      '<span class="muted" style="display:inline-flex;align-items:center;gap:6px;font-size:13px"><span class="sw" style="background:' + d.sys.c + '"></span>' + esc(d.sys === OTHER && d.sysRaw ? d.sysRaw : d.sys.name) + '</span></div>' +
      '<div style="display:flex;flex-direction:column;gap:2px"><h3>' + esc(d.name) + '</h3>' + (d.th ? '<span class="muted" style="font-size:15px">' + esc(d.th) + '</span>' : '') + '</div>' +
      (sum.length ? '<dl>' + sum.map(function (f) { return '<div><dt>' + esc(f.label) + '</dt><dd>' + esc(plain(f.value)) + '</dd></div>'; }).join('') + '</dl>' : '') +
      '<div class="bottom"><span style="display:inline-flex;flex-wrap:wrap;gap:5px" aria-hidden="true">' + dots + '</span><span class="muted" style="font-size:13px;white-space:nowrap">กรอกแล้ว ' + d.filled + '/' + d.fields.length + ' ช่อง</span></div></a>';
  }
  function diseasesBody(st) {
    var counts = {}; D.list.forEach(function (d) { counts[d.sys.id] = (counts[d.sys.id] || 0) + 1; });
    var pal = SYS.concat(counts.other ? [OTHER] : []);
    var wells = '<button class="well' + (!st.s ? ' on' : '') + '" type="button" data-sys=""><span class="blob" style="background:conic-gradient(#A33A3A,#C9952E,#5C7F3A,#2F7466,#3E7CA6,#5E4A7E,#A33A3A)"></span><span class="k" style="font-size:14px;font-weight:500">ทุกระบบ</span><span class="muted" style="font-size:12px">' + D.list.length + ' โรค</span></button>' +
      pal.map(function (s) {
        return '<button class="well' + (st.s === s.id ? ' on' : '') + '" type="button" data-sys="' + s.id + '"><span class="blob" style="background:' + s.c + '"></span><span class="k" style="font-size:14px;font-weight:500">' + esc(s.name) + '</span><span class="muted" style="font-size:12px;font-style:italic;line-height:1.1">' + esc(s.pig) + ' · ' + (counts[s.id] || 0) + '</span></button>';
      }).join('');
    var list = filterDiseases(st);
    var body;
    if (!list.length) body = '<div class="empty"><p class="k" style="font-size:20px">ไม่พบโรคที่ตรงกับตัวกรอง</p><p class="muted">ลองล้างคำค้นหรือเลือกทุกระบบ</p></div>';
    else if (st.v === 'table') {
      var H = D.list[0] ? D.list[0].fields.map(function (f) { return f.label; }) : [];
      body = '<div class="tbl"><table><thead><tr><th>No.</th><th>โรค</th><th>ระบบ</th>' + H.slice(0, 4).map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '<th>กรอกแล้ว</th></tr></thead><tbody>' +
        list.map(function (d) {
          return '<tr><td class="muted" style="font-style:italic">' + esc(d.no) + '</td><td><a href="#/disease/' + encodeURIComponent(d.no) + '">' + esc(d.name) + '</a>' + (d.th ? '<div class="muted" style="font-size:14px">' + esc(d.th) + '</div>' : '') + '</td><td style="white-space:nowrap"><span class="sw" style="background:' + d.sys.c + ';vertical-align:-2px"></span> ' + esc(d.sys.name) + '</td>' +
            d.fields.slice(0, 4).map(function (f) { return '<td>' + esc(plain(f.value).slice(0, 140)) + '</td>'; }).join('') + '<td class="muted">' + d.filled + '/' + d.fields.length + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    } else body = '<div class="specs">' + list.map(specCard).join('') + '</div>';
    return '<section class="wrap" style="display:flex;flex-direction:column;gap:14px;padding-bottom:24px"><span class="label">จานสี · กรองตามระบบ</span><div class="wells">' + wells + '</div></section>' +
      '<section class="wrap" style="display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px;padding-bottom:32px">' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
      [['', 'ทั้งหมด'], ['full', 'กรอกครบทุกช่อง'], ['part', 'ยังไม่ครบ']].map(function (x) { return '<button class="chip' + ((st.f || '') === x[0] ? ' on' : '') + '" type="button" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') +
      '</div><span class="muted" style="font-size:15px">' + list.length + ' จาก ' + D.list.length + ' โรค</span>' +
      '<div role="group" aria-label="มุมมอง" style="display:flex;border:1px solid var(--rule-3);border-radius:999px;padding:3px;margin-left:auto">' +
      '<button class="chip' + (st.v !== 'table' ? ' on' : '') + '" type="button" data-v="" style="border:0;min-height:38px">แผ่นตัวอย่าง</button><button class="chip' + (st.v === 'table' ? ' on' : '') + '" type="button" data-v="table" style="border:0;min-height:38px">ตาราง</button></div>' +
      '</section><section class="wrap" style="padding-bottom:72px">' + body + '</section>';
  }
  PAGES.diseases = function (r) {
    var st = { s: r.q.get('s') || '', q: r.q.get('q') || '', f: r.q.get('f') || '', v: r.q.get('v') || '' };
    var n = D.src === 'sample' ? 0 : D.list.length;
    var ticks = '';
    for (var i = 1; i < 10; i++) ticks += 'M' + (1 + i * 37.8).toFixed(1) + ' 23v' + (i === 5 ? -12 : i % 2 ? -6 : -10);
    return {
      title: '1000 โรค', html:
        '<section class="wrap phead"><div style="flex:1 1 520px;min-width:0;display:flex;flex-direction:column;gap:16px"><span class="label">03 · พรรณไม้</span><h1>1000 โรค</h1>' +
        '<p class="lede">หอพรรณไม้ของโรค — แต่ละโรคคือหนึ่งแผ่นตัวอย่าง รู้จักให้พอจะ diag ได้ รู้ว่าต้องส่ง lab อะไร และเริ่ม initial management ได้</p>' +
        '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px">' + liveHTML() + (hasSheet() ? '<button class="chip" type="button" id="reload" style="min-height:40px">ดึงใหม่</button>' : '') + '</div></div>' +
        '<div style="flex:0 1 380px;min-width:260px;display:flex;flex-direction:column;gap:10px"><div style="display:flex;align-items:baseline;gap:10px"><span class="k" style="font-size:64px;line-height:1">' + n + '</span><span class="muted" style="font-size:18px">/ 1000 แผ่นตัวอย่าง</span></div>' +
        '<svg viewBox="0 0 380 34" width="100%" aria-hidden="true"><rect x="1" y="1" width="378" height="22" rx="3" fill="#FBF9F3" stroke="#BDB39B"/><rect x="1" y="1" width="' + Math.max(0, Math.min(378, n * 0.378)) + '" height="22" rx="3" fill="#9B4F2E" opacity=".85"/><path d="' + ticks + '" stroke="#7A6E58" stroke-width="1"/><g font-family="Sarabun, sans-serif" font-size="10" fill="#5A6258"><text x="2" y="33">0</text><text x="182" y="33">500</text><text x="358" y="33">1000</text></g></svg></div></section>' +
        '<section class="wrap" style="padding-bottom:20px"><label class="search" style="max-width:560px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A6258" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span class="sr">ค้นใน 1000 โรค</span><input type="search" id="dq" placeholder="ค้นชื่อโรค อาการ หรือ lab ที่นึกถึง…" value="' + esc(st.q) + '"></label></section>' +
        '<div id="dbody">' + diseasesBody(st) + '</div>',
      after: function () {
        var body = document.getElementById('dbody');
        function upd(patch) { Object.keys(patch).forEach(function (k) { st[k] = patch[k]; }); setQuery(route(), patch); body.innerHTML = diseasesBody(st); }
        document.getElementById('dq').addEventListener('input', function () { upd({ q: this.value.trim() }); });
        body.addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b) return;
          if (b.hasAttribute('data-sys')) upd({ s: b.getAttribute('data-sys') });
          else if (b.hasAttribute('data-f')) upd({ f: b.getAttribute('data-f') });
          else if (b.hasAttribute('data-v')) upd({ v: b.getAttribute('data-v') });
        });
        var rl = document.getElementById('reload'); if (rl) rl.addEventListener('click', loadSheet);
      }
    };
  };

  /* =========================================================
     แผ่นตัวอย่างโรค
     ========================================================= */
  PAGES.disease = function (r) {
    var d = findDisease(r.args[0]);
    if (!d) return {
      title: 'ไม่พบโรค', html: '<section class="wrap phead"><div style="display:flex;flex-direction:column;gap:14px"><span class="label">1000 โรค</span><h1 style="font-size:44px">ไม่พบแผ่นตัวอย่างนี้</h1><p class="muted">' + (D.loading ? 'กำลังดึงข้อมูลจาก Google Sheet…' : 'อาจถูกลบหรือเปลี่ยนเลขในชีต') + '</p><a class="btn ghost" href="#/diseases" style="align-self:flex-start">กลับไปหอพรรณไม้</a></div></section>'
    };
    remember({ href: '#/disease/' + encodeURIComponent(d.no), title: d.name, crumb: '1000 โรค › ' + d.sys.name, c: d.sys.c });
    var rel = D.list.filter(function (x) { return x !== d && x.sys === d.sys; }).slice(0, 6);
    var sheetLink = C.sheet && C.sheet.id ? 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(C.sheet.id) + '/edit#gid=' + encodeURIComponent(C.sheet.gid || '0') + '&range=A' + d.row : '';
    var entries = d.fields.map(function (f, i) {
      return '<section class="entry' + (f.value ? '' : ' blank') + '"><span class="num">' + roman(i) + '</span><div><h2>' + esc(f.label) + '</h2><div class="val">' + (f.value ? rich(f.value) : '<p>ยังไม่ได้กรอกช่องนี้ในชีต</p>') + '</div></div></section>';
    }).join('');
    return {
      title: d.name, html:
        '<div class="wrap" style="padding-top:28px;padding-bottom:80px"><nav aria-label="ตำแหน่ง" style="font-size:15px;margin-bottom:28px"><a href="#/diseases">1000 โรค</a><span class="muted"> › </span><a href="#/diseases?s=' + d.sys.id + '">' + esc(d.sys.name) + '</a><span class="muted"> › </span><span>' + esc(d.name) + '</span></nav>' +
        '<div class="dsheet"><aside>' +
        '<div class="sheet" style="position:relative;padding:34px 24px 24px;display:flex;flex-direction:column;gap:16px;align-items:flex-start"><div class="tape" style="left:28px;margin-left:0;transform:rotate(-6deg)"></div>' +
        brush(d.sys.c, 220) + '<span class="k" style="font-size:30px">' + esc(d.name) + '</span>' + (d.th ? '<span class="muted">' + esc(d.th) + '</span>' : '') +
        '<span class="muted" style="font-size:13px;font-style:italic">สีประจำระบบ: ' + esc(d.sys.pig) + '</span></div>' +
        '<div class="hlabel"><div class="t">หอพรรณไม้โพยหมอ · HERBARIUM MEDICUM</div><dl>' +
        '<div><dt>เลขตัวอย่าง</dt><dd>No. ' + esc(d.no) + '</dd></div><div><dt>วงศ์ (ระบบ)</dt><dd>' + esc(d.sysRaw || d.sys.name) + '</dd></div>' +
        '<div><dt>กรอกแล้ว</dt><dd>' + d.filled + ' / ' + d.fields.length + ' ช่อง</dd></div><div><dt>แหล่งข้อมูล</dt><dd>' + (D.src === 'sample' ? 'ข้อมูลตัวอย่าง' : 'Google Sheet แถว ' + d.row) + '</dd></div>' +
        '</dl></div>' +
        '<div style="display:flex;flex-direction:column;gap:10px"><a class="btn" href="#/exam?src=' + encodeURIComponent('d:' + d.no) + '">สร้างข้อสอบจากโรคนี้</a>' +
        (sheetLink ? '<a class="btn ghost" href="' + sheetLink + '" target="_blank" rel="noopener">แก้ข้อมูลใน Google Sheet ↗</a>' : '') + '</div></aside>' +
        '<article><div style="display:flex;flex-direction:column;gap:14px;padding-bottom:24px"><span class="label">No. ' + esc(d.no) + ' · ' + esc(d.sys.name.toUpperCase()) + '</span>' +
        '<h1 style="font-size:clamp(40px,5vw,66px)">' + esc(d.name) + '</h1>' + (d.th ? '<p class="muted" style="font-size:20px">' + esc(d.th) + '</p>' : '') +
        '<div style="display:flex;flex-wrap:wrap;gap:8px"><span class="pill"><span class="sw" style="background:' + d.sys.c + '"></span>' + esc(d.sys.name) + '</span><span class="pill">กรอก ' + d.filled + '/' + d.fields.length + ' ช่อง</span></div></div>' +
        entries +
        (rel.length ? '<section style="border-top:1px solid var(--empty);padding-top:28px;display:flex;flex-direction:column;gap:10px"><span class="label">ตัวอย่างในวงศ์เดียวกัน</span><div style="display:flex;flex-wrap:wrap;gap:8px">' +
          rel.map(function (x) { return '<a class="pill" href="#/disease/' + encodeURIComponent(x.no) + '"><span class="sw" style="background:' + x.sys.c + '"></span>' + esc(x.name) + '</a>'; }).join('') + '</div></section>' : '') +
        '<section style="margin-top:28px" class="sheet"><div style="padding:18px 20px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px"><div><div class="k" style="font-size:17px;font-weight:500">ข้อสอบเก่าที่เกี่ยวกับโรคนี้</div><p class="muted" style="font-size:15px">เปิดคลังข้อสอบเก่า MDCU แล้วค้นชื่อโรค</p></div><a class="btn ghost" href="' + esc(C.acUrl) + '" target="_blank" rel="noopener">เปิดคลังข้อสอบเก่า ↗</a></div></section>' +
        '</article></div></div>'
    };
  };

  /* =========================================================
     PRECLINIC
     ========================================================= */
  PAGES.preclinic = function (r) {
    var sysId = r.args[0] || 'cvs', docId = r.args[1];
    var sys = PRE.filter(function (s) { return s.id === sysId; })[0] || PRE[1];
    var docs = []; sys.groups.forEach(function (g) { g.docs.forEach(function (d) { docs.push(d); }); });
    var doc = docs.filter(function (d) { return d.id === docId; })[0] || docs.filter(function (d) { return d.html; })[0] || docs[0];
    var cards = PRE.map(function (s) {
      var n = 0, m = 0; s.groups.forEach(function (g) { g.docs.forEach(function (d) { m++; if (d.html) n++; }); });
      return '<a class="sheet sys' + (s === sys ? ' on' : '') + '" href="#/preclinic/' + s.id + '">' +
        '<svg width="100%" height="30" viewBox="0 0 240 34" preserveAspectRatio="none" aria-hidden="true"><path d="M3 18 C30 6 90 4 160 9 C200 12 228 14 237 19 C214 28 150 31 86 29 C44 28 12 25 3 18Z" fill="' + s.c + '" opacity=".88"/></svg>' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><h3 style="font-size:20px">' + esc(s.name) + '</h3><span class="muted" style="font-size:12px;font-style:italic;white-space:nowrap">' + esc(s.pig) + '</span></div>' +
        '<span class="muted" style="font-size:15px">' + esc(s.th) + '</span><span style="font-size:14px;margin-top:auto;border-top:1px dashed var(--rule);padding-top:10px">' + esc(s.subj) + '</span>' +
        '<span class="muted" style="font-size:13px">' + (m ? n + ' / ' + m + ' เอกสารมีเนื้อหา' : 'ยังไม่มีเอกสาร') + '</span></a>';
    }).join('');
    var reader;
    if (!docs.length) reader = '<div class="empty" style="flex:1"><p class="k" style="font-size:22px">' + esc(sys.name) + ' ยังไม่มีเอกสาร</p><p class="muted">ส่งลิงก์หรือไฟล์ Google Docs ของระบบนี้มา แล้ว Claude จะแปลงเป็นหน้าเว็บให้</p></div>';
    else {
      if (doc) remember({ href: '#/preclinic/' + sys.id + '/' + doc.id, title: doc.title, crumb: 'Preclinic › ' + sys.name, c: sys.c });
      var idx = docs.indexOf(doc), prev = docs[idx - 1], next = docs[idx + 1];
      reader = '<nav class="tree" aria-label="เอกสารใน ' + esc(sys.name) + '"><div style="display:flex;align-items:center;gap:10px;padding:0 12px 10px"><span class="sw" style="background:' + sys.c + ';width:18px;height:18px"></span><span class="k" style="font-size:20px">' + esc(sys.name) + '</span></div>' +
        sys.groups.map(function (g) {
          return '<div class="grp">' + esc(g.name) + '</div>' + g.docs.map(function (d) { return '<a href="#/preclinic/' + sys.id + '/' + d.id + '"' + (d === doc ? ' class="on" aria-current="page"' : '') + '>' + esc(d.title) + (d.html ? '' : ' <span style="opacity:.6;margin-left:6px;font-size:12px">· ว่าง</span>') + '</a>'; }).join('');
        }).join('') + '</nav>' +
        '<article class="sheet doc"><div style="display:flex;flex-direction:column;gap:10px"><span class="muted" style="font-size:14px">Preclinic › ' + esc(sys.name) + '</span><h2>' + esc(doc.title) + '</h2>' +
        '<span class="muted" style="font-size:14px">' + (doc.html ? esc(doc.source || 'จาก Google Docs') : 'ยังไม่ได้ดึงเนื้อหาจาก Google Docs') + '</span></div>' +
        (doc.html || '<div class="empty"><p class="muted">เอกสารนี้ยังว่าง — ส่ง Google Docs ของหัวข้อนี้มาให้ Claude ได้เลย</p></div>') +
        (doc.related && doc.related.length ? '<div style="border-top:1px dashed var(--rule);padding-top:18px;display:flex;flex-direction:column;gap:10px"><span class="label">ต่อไปยังคลินิก</span><div style="display:flex;flex-wrap:wrap;gap:8px">' +
          doc.related.map(function (n) { return '<a class="pill" href="' + dLink(n) + '"><span class="sw" style="background:' + sys.c + '"></span>' + esc(n) + '</a>'; }).join('') + '</div></div>' : '') +
        '<nav aria-label="เอกสารก่อนหน้าและถัดไป" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-top:1px solid var(--empty);padding-top:18px">' +
        (prev ? '<a href="#/preclinic/' + sys.id + '/' + prev.id + '" style="display:flex;flex-direction:column;text-decoration:none;min-height:44px"><span class="muted" style="font-size:13px">← ก่อนหน้า</span><span class="k" style="font-size:17px;font-weight:500">' + esc(prev.title) + '</span></a>' : '<span></span>') +
        (next ? '<a href="#/preclinic/' + sys.id + '/' + next.id + '" style="display:flex;flex-direction:column;align-items:flex-end;text-decoration:none;min-height:44px"><span class="muted" style="font-size:13px">ถัดไป →</span><span class="k" style="font-size:17px;font-weight:500">' + esc(next.title) + '</span></a>' : '') +
        '</nav></article>';
    }
    return {
      title: 'Preclinic', html:
        '<section class="wrap phead"><div style="flex:1 1 520px;min-width:0;display:flex;flex-direction:column;gap:16px"><span class="label">01 · ราก · ปี 1–3</span><h1>Preclinic</h1>' +
        '<p class="lede">สรุปที่เขียนไว้ใน Google Docs ดึงมาจัดหน้าใหม่ให้อ่านง่าย และกดต่อไปหาโรคที่เกี่ยวข้องใน 1000 โรคได้</p></div></section>' +
        '<section class="wrap" style="padding-bottom:56px"><div class="syss">' + cards + '</div></section>' +
        '<section id="read" class="band" style="padding:48px 0 80px"><div class="wrap reader">' + reader + '</div></section>'
    };
  };

  /* =========================================================
     CLINIC
     ========================================================= */
  PAGES.clinic = function (r) {
    var ap = CLI.approaches.filter(function (a) { return a.id === r.args[0]; })[0] || CLI.approaches[0];
    remember({ href: '#/clinic/' + ap.id, title: ap.title, crumb: 'Clinic › ตามอาการนำ', c: '#5C7F3A' });
    var books = CLI.wards.map(function (w, i) {
      var h = [200, 200, 186, 194, 204][i % 5];
      return '<a class="book" href="' + esc(C.acUrl) + '" target="_blank" rel="noopener" style="background:' + w.c + ';height:' + h + 'px"><span class="k" style="font-size:22px">' + esc(w.name) + '</span><span style="font-size:13px;opacity:.9">' + esc(w.full) + '</span></a>';
    }).join('') + '<span class="book add" style="height:180px"><span class="k" style="font-size:20px;color:var(--ink)">+ วอร์ดถัดไป</span><span style="font-size:13px">ปี 5–6</span></span>';
    var steps = ap.steps.map(function (s, i) {
      var last = i === ap.steps.length - 1;
      var inner = s.links ? '<div style="display:flex;flex-direction:column">' + s.links.map(function (l) {
        var d = findDisease(l[1]);
        return '<a class="go" href="' + dLink(l[1]) + '"><span style="flex:1 1 200px">' + esc(l[0]) + '</span><span class="muted" aria-hidden="true">→</span><span class="k" style="flex:0 0 190px;font-weight:500;display:inline-flex;align-items:center;gap:8px"><span class="sw" style="background:' + (d ? d.sys.c : '#2F7466') + '"></span>' + esc(l[1]) + '</span></a>';
      }).join('') + '</div>' : s.html;
      return '<div class="st"><div class="mk"><b>' + (i + 1) + '</b>' + (last ? '' : '<i></i>') + '</div><div style="padding-bottom:' + (last ? 0 : 28) + 'px"><h3>' + esc(s.title) + '</h3>' + inner + '</div></div>';
    }).join('');
    return {
      title: 'Clinic', html:
        '<section class="wrap phead" style="padding-bottom:28px"><div style="display:flex;flex-direction:column;gap:16px"><span class="label">02 · ลำต้น · ปี 4–6</span><h1>Clinic</h1>' +
        '<p class="lede">เข้าได้สามทาง: ตามวอร์ดที่วนอยู่ ตามอาการนำของคนไข้ หรือตามงานที่ต้องทำบนวอร์ด — ทุกทางกดต่อไปหาแผ่นตัวอย่างใน 1000 โรคได้</p></div></section>' +
        '<section style="padding-bottom:48px"><div class="wrap" style="display:flex;flex-direction:column;gap:14px"><span class="label">ชั้นหนังสือ · สมุดวอร์ด</span><div style="overflow-x:auto;padding:12px 2px 0"><div class="shelf">' + books + '</div></div>' +
        '<p class="muted" style="font-size:15px">ตอนนี้แต่ละเล่มเปิดไปคลังข้อสอบเก่า MDCU · เนื้อหาในสมุดวอร์ดจะทยอยเพิ่ม</p></div></section>' +
        '<section class="band" style="padding:40px 0 80px"><div class="wrap" style="display:flex;flex-wrap:wrap;gap:40px 48px;align-items:flex-start">' +
        '<article class="sheet" style="flex:999 1 600px;min-width:0;padding:clamp(22px,4vw,44px);display:flex;flex-direction:column;gap:26px"><div style="display:flex;flex-direction:column;gap:10px"><span class="muted" style="font-size:14px">Clinic › ตามอาการนำ › ' + esc(ap.group) + '</span><h2 style="font-size:36px">' + esc(ap.title) + '</h2><p class="muted">' + esc(ap.sub) + '</p></div><div style="display:flex;flex-direction:column">' + steps + '</div></article>' +
        '<aside style="flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:16px"><span class="label">อาการนำอื่น · ยังไม่มีเนื้อหา</span><div style="display:flex;flex-wrap:wrap;gap:8px">' +
        CLI.more.map(function (m) { return '<span class="chip" style="cursor:default;opacity:.75">' + esc(m) + '</span>'; }).join('') + '</div>' +
        '<span class="label" style="margin-top:12px">ทักษะบนวอร์ด</span><div class="sheet" style="display:flex;flex-direction:column">' +
        CLI.tools.map(function (t, i) { return '<div class="tool"' + (i < CLI.tools.length - 1 ? ' style="border-bottom:1px dashed var(--rule)"' : '') + '><span class="k" style="font-size:17px;font-weight:500">' + esc(t[0]) + '</span><span class="muted" style="font-size:14px">' + esc(t[1]) + '</span></div>'; }).join('') + '</div>' +
        '<a class="sheet tool" href="' + esc(C.acUrl) + '" target="_blank" rel="noopener" style="margin-top:8px;border:1.5px solid var(--ink)"><span class="label">เชื่อมกับ</span><span class="k" style="font-size:18px;font-weight:500">คลังข้อสอบเก่า MDCU ↗</span></a>' +
        '</aside></div></section>'
    };
  };

  /* =========================================================
     ห้องสอบ AI
     ========================================================= */
  var LEVELS = [
    ['ต้นกล้า', 'recall ข้อเท็จจริงตรง ๆ จากเนื้อหา', '<path d="M12 22V13"/><path d="M12 15C8 15 6 12 6 9C9 9 12 11 12 15Z"/><path d="M12 13C15 13 18 11 18 8C15 8 12 10 12 13Z"/><path d="M7 22h10"/>'],
    ['ไม้พุ่ม', 'เข้าใจและประยุกต์ขั้นเดียว เคสสั้น', '<circle cx="8" cy="15" r="4.5"/><circle cx="16" cy="15" r="4.5"/><circle cx="12" cy="10" r="4.5"/><path d="M12 19.5V22M6 22h12"/>'],
    ['ไม้ใหญ่', 'เคสเต็ม ต้องวินิจฉัยก่อนแล้วเลือก investigation หรือ management', '<circle cx="12" cy="9" r="6.5"/><path d="M12 15.5V22M12 18l-3-2M12 17l3-2.5M7 22h10"/>'],
    ['ป่าดิบ', 'เคสซับซ้อน มีโรคร่วมหรือข้อมูลรบกวน ตัวลวงใกล้เคียงกันมาก', '<path d="M7 3L2 15h10Z"/><path d="M17 6l-5 12h10Z"/><path d="M7 15v6M17 18v4M2 22h20"/>'],
    ['ยอดเขา', 'หลายขั้นตอน รายละเอียดระดับ guideline แยกแยะข้อยกเว้น', '<path d="M2 21L9 7l4 6 3-4 6 12Z"/><path d="M7.2 10.6L9 12l1.6-1.6"/>']
  ];
  function sourceOptions(sel) {
    var o = '<optgroup label="1000 โรค"><option value="all">สุ่มจากทุกโรค</option>';
    var used = {}; D.list.forEach(function (d) { used[d.sys.id] = d.sys; });
    Object.keys(used).forEach(function (k) { o += '<option value="s:' + k + '">สุ่มจากระบบ ' + esc(used[k].name) + '</option>'; });
    o += '</optgroup><optgroup label="1000 โรค · รายโรค">' + D.list.map(function (d) { return '<option value="d:' + esc(d.no) + '">' + esc(d.name) + '</option>'; }).join('') + '</optgroup>';
    var pre = []; PRE.forEach(function (s) { s.groups.forEach(function (g) { g.docs.forEach(function (d) { if (d.html) pre.push([s, d]); }); }); });
    if (pre.length) o += '<optgroup label="Preclinic">' + pre.map(function (x) { return '<option value="p:' + x[0].id + '/' + x[1].id + '">' + esc(x[0].name + ' › ' + x[1].title) + '</option>'; }).join('') + '</optgroup>';
    o += '<optgroup label="Clinic">' + CLI.approaches.map(function (a) { return '<option value="c:' + a.id + '">' + esc('Approach › ' + a.title) + '</option>'; }).join('') + '</optgroup>';
    if (sel) o = o.replace('value="' + esc(sel) + '"', 'value="' + esc(sel) + '" selected');
    return o;
  }
  function htmlText(h) { var div = document.createElement('div'); div.innerHTML = h; return div.textContent.replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ').trim(); }
  function diseaseText(d) { return '## ' + d.name + (d.th ? ' (' + d.th + ')' : '') + ' — ระบบ ' + d.sys.name + '\n' + d.fields.filter(function (f) { return f.value; }).map(function (f) { return f.label + ': ' + f.value; }).join('\n'); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function gatherSource(src, n, limit) {
    var label = '', text = '';
    if (src.indexOf('d:') === 0) { var d = findDisease(src.slice(2)); if (d) { label = d.name; text = diseaseText(d); } }
    else if (src.indexOf('p:') === 0) {
      var p = src.slice(2).split('/'); PRE.forEach(function (s) { if (s.id === p[0]) s.groups.forEach(function (g) { g.docs.forEach(function (doc) { if (doc.id === p[1]) { label = s.name + ' › ' + doc.title; text = '## ' + label + '\n' + htmlText(doc.html); } }); }); });
    } else if (src.indexOf('c:') === 0) {
      var a = CLI.approaches.filter(function (x) { return x.id === src.slice(2); })[0];
      if (a) { label = 'Approach ' + a.title; text = '## ' + a.title + '\n' + a.steps.map(function (s, i) { return (i + 1) + '. ' + s.title + ': ' + (s.links ? s.links.map(function (l) { return l[0] + ' → ' + l[1]; }).join('; ') : htmlText(s.html)); }).join('\n'); }
    } else {
      var pool = src === 'all' ? D.list : D.list.filter(function (x) { return 's:' + x.sys.id === src; });
      pool = shuffle(pool.filter(function (x) { return x.filled; })).slice(0, Math.max(n, 3));
      label = src === 'all' ? 'สุ่มจากทุกโรค' : 'สุ่มจากระบบ ' + (pool[0] ? pool[0].sys.name : '');
      text = pool.map(diseaseText).join('\n\n');
    }
    if (text.length > limit) text = text.slice(0, limit) + '\n…(ตัดเนื้อหาส่วนที่เหลือ)';
    return { label: label, text: text };
  }
  function buildPrompt(o, forClaude) {
    var lv = LEVELS[o.level - 1];
    return 'คุณเป็นอาจารย์แพทย์ที่ออกข้อสอบ MCQ สำหรับนักศึกษาแพทย์ไทยชั้นปีที่ ' + C.currentYear + ' (เตรียม Compre และ NL)\n' +
      'สร้างข้อสอบ ' + o.n + ' ข้อ จากเนื้อหาด้านล่าง ถ้าต้องใช้ความรู้นอกเนื้อหาเพื่อให้ข้อสมบูรณ์ ให้ใช้ความรู้มาตรฐานที่ถูกต้องเท่านั้น และบอกไว้ในคำอธิบาย ห้ามแต่งข้อมูลที่ไม่มีหลักฐาน\n\n' +
      'กติกา\n- โจทย์เป็น clinical vignette (case-based) ภาษาอังกฤษแบบข้อสอบทางการ ตัวเลือก 5 ข้อ A–E เป็นภาษาอังกฤษ คำตอบถูกข้อเดียว\n' +
      '- ห้ามใบ้คำตอบในโจทย์ (เช่นใส่ชื่อโรคในวงเล็บหลังค่าแลป) ตัวเลือกที่ถูกต้องห้ามยาวหรือละเอียดกว่าตัวเลือกอื่น\n' +
      '- ระดับความยาก ' + o.level + '/5 (' + lv[0] + '): ' + lv[1] + '\n' +
      '- คำอธิบายเป็นภาษาไทย: ทำไมข้อถูกถึงถูก และทำไมแต่ละตัวเลือกที่เหลือผิด\n' +
      (forClaude ? '- แสดงทีละข้อ รอฉันตอบก่อนแล้วค่อยเฉลยและไปข้อต่อไป สรุปคะแนนตอนจบ\n' :
        '\nตอบเป็น JSON อย่างเดียว ไม่มีข้อความอื่น รูปแบบ:\n{"questions":[{"stem":"...","options":["...","...","...","...","..."],"answer":"A","explanation":"...","topic":"..."}]}\n') +
      '\nเนื้อหา (' + o.src.label + ')\n<<<\n' + o.src.text + '\n>>>';
  }
  function extractJSON(s) {
    var a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b < a) throw new Error('AI ไม่ได้ตอบเป็น JSON');
    return JSON.parse(s.slice(a, b + 1));
  }
  function quizHTML(quiz) {
    if (!quiz) return '';
    var L = 'ABCDE';
    return '<div style="display:flex;flex-direction:column;gap:6px"><span class="label">ชุดล่าสุด · ' + esc(quiz.label) + ' · ระดับ ' + quiz.level + ' ' + esc(LEVELS[quiz.level - 1][0]) + '</span>' +
      '<p class="muted" style="font-size:14px">สร้างเมื่อ ' + esc(fmtTime(quiz.at)) + ' · ' + esc(quiz.model) + ' · ตอบแล้ว ' + quiz.qs.filter(function (q) { return q.pick != null; }).length + '/' + quiz.qs.length + ' · ถูก ' + quiz.qs.filter(function (q) { return q.pick != null && L[q.pick] === q.answer; }).length + '</p></div>' +
      quiz.qs.map(function (q, i) {
        var done = q.pick != null, ans = L.indexOf(String(q.answer || '').trim().toUpperCase().charAt(0));
        return '<article class="sheet q" data-qi="' + i + '">' + (i === 0 ? '<div class="tape" style="left:26px;margin-left:0;transform:rotate(-4deg)"></div>' : '') +
          '<div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 12px"><span class="k" style="font-size:28px">' + (i + 1) + '</span><span class="muted" style="font-size:14px">/ ' + quiz.qs.length + (q.topic ? ' · ' + esc(q.topic) : '') + '</span></div>' +
          '<p lang="en">' + esc(q.stem) + '</p><div style="display:flex;flex-direction:column;gap:2px" lang="en">' +
          (q.options || []).map(function (op, j) {
            var cls = done ? (j === ans ? ' ok' : j === q.pick ? ' bad' : '') : '';
            return '<button class="choice' + cls + '" type="button" data-pick="' + j + '"' + (done ? ' disabled' : '') + '><b>' + L[j] + '</b><span>' + esc(String(op).replace(/^[A-E][.)]\s*/, '')) + '</span></button>';
          }).join('') + '</div>' +
          (done ? '<div class="explain"><p class="k" style="font-weight:500;color:' + (q.pick === ans ? 'var(--moss)' : 'var(--sienna-dk)') + '">' + (q.pick === ans ? 'ถูก' : 'ยังไม่ถูก') + ' · เฉลย ' + esc(L[ans] || q.answer) + '</p>' + rich(q.explanation) + '</div>' : '') +
          '</article>';
      }).join('');
  }

  PAGES.exam = function (r) {
    var t = r.q.get('t') || 'gen';
    var src = r.q.get('src') || 'all';
    var key = LS.get('apikey', ''), model = LS.get('model', C.ai.models[0].id), eng = LS.get('engine', key ? 'api' : 'claude');
    var lvl = LS.get('level', 3), cnt = LS.get('count', 5);
    var tabs = [['gen', 'สร้างข้อสอบ'], ['mock', 'Mock exam ตาม blueprint'], ['guess', 'เก็งข้อสอบ']].map(function (x) {
      return '<a class="chip' + (t === x[0] ? ' on' : '') + '" role="tab" aria-selected="' + (t === x[0]) + '" href="#/exam?t=' + x[0] + '">' + x[1] + '</a>';
    }).join('');
    var levelHTML = LEVELS.map(function (l, i) {
      return '<label class="lv"><input type="radio" name="lv" value="' + (i + 1) + '"' + (lvl === i + 1 ? ' checked' : '') + '><span><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#355A3A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + l[2] + '</svg><b class="k" style="font-weight:500">' + (i + 1) + ' · ' + l[0] + '</b></span></label>';
    }).join('');
    var head = '<section class="wrap phead" style="padding-bottom:24px"><div style="display:flex;flex-direction:column;gap:16px"><span class="label">04–05 · ห้องสอบ</span><h1 style="font-size:clamp(38px,5vw,66px);max-width:900px">ให้ AI ออกข้อสอบจากสิ่งที่เราเก็บไว้</h1>' +
      '<p class="lede">สร้างข้อสอบจากโรค ระบบ หรือเอกสารที่เลือก หรือจัด mock exam ทั้งชุดตาม blueprint ของ Compre และ NL</p>' +
      '<div role="tablist" aria-label="โหมดห้องสอบ" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">' + tabs + '</div></div></section>';

    if (t === 'guess') return {
      title: 'เก็งข้อสอบ', html: head + '<section class="wrap" style="padding-bottom:80px"><div class="empty"><p class="k" style="font-size:22px">เก็งข้อสอบ — กำลังเตรียม</p><p class="muted" style="max-width:560px;margin:8px auto 0">AI จะอ่านข้อสอบเก่า blueprint และสิ่งที่เก็บไว้ในโพยหมอ แล้วจัดหัวข้อที่น่าจะออกพร้อมเหตุผล — รอ blueprint และข้อสอบเก่าที่จะเชื่อมจากคลังข้อสอบเก่า</p></div></section>'
    };
    if (t === 'mock') return {
      title: 'Mock exam', html: head + '<section class="wrap" style="padding-bottom:80px;display:flex;flex-wrap:wrap;gap:32px 48px;align-items:flex-start">' +
        '<div class="sheet" style="flex:1 1 540px;min-width:0;padding:clamp(22px,3.5vw,40px)">' +
        '<div class="step"><span class="n">1</span><fieldset><legend class="h">สนามสอบ</legend><div style="display:flex;flex-wrap:wrap;gap:8px"><label class="opt"><input type="radio" name="field" checked><span>Comprehensive</span></label><label class="opt"><input type="radio" name="field"><span>NL1</span></label><label class="opt"><input type="radio" name="field"><span>NL2</span></label></div></fieldset></div>' +
        '<div class="step"><span class="n">2</span><div><span class="h">Blueprint</span><div class="empty" style="padding:22px"><p class="muted">ยังไม่มี blueprint — ส่ง blueprint ของ Compre / NL มา แล้ว Claude จะใส่สัดส่วนแต่ละหมวดให้</p></div></div></div>' +
        '<div class="step"><span class="n">3</span><fieldset><legend class="h">ระดับความยาก</legend><div style="display:flex;flex-wrap:wrap;gap:8px">' + levelHTML + '</div><p class="note" style="margin-top:10px">นิยามแต่ละระดับตอนนี้เป็นแบบชั่วคราว รอกำหนดใหม่</p></fieldset></div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:12px;border-top:1px solid var(--empty);padding-top:24px"><button class="btn" type="button" disabled>เริ่ม Mock exam</button><span class="note" style="align-self:center">เปิดใช้เมื่อมี blueprint</span></div></div>' +
        '<aside style="flex:1 1 360px;min-width:0" class="info">ระหว่างรอ blueprint ใช้แท็บ “สร้างข้อสอบ” ทำชุดสั้นจากระบบหรือโรคที่อยากซ้อมได้เลย</aside></section>'
    };

    var quiz = LS.get('quiz', null);
    var models = C.ai.models.map(function (m) { return '<option value="' + esc(m.id) + '"' + (m.id === model ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('');
    return {
      title: 'ห้องสอบ AI', html: head +
        '<section class="wrap" style="display:flex;flex-wrap:wrap;gap:40px 48px;align-items:flex-start;padding-bottom:80px">' +
        '<form id="gen" class="sheet" style="flex:1 1 480px;min-width:0;padding:clamp(22px,3.5vw,40px)">' +
        '<div class="step"><span class="n">1</span><div><label class="h" for="src">ออกข้อสอบจาก</label><select id="src" class="field">' + sourceOptions(src) + '</select>' +
        (D.src === 'sample' ? '<p class="note" style="margin-top:8px">ตอนนี้ 1000 โรคยังเป็นข้อมูลตัวอย่าง (เต็มแค่ Melioidosis)</p>' : '') + '</div></div>' +
        '<div class="step"><span class="n">2</span><fieldset><legend class="h">จำนวนข้อ</legend><div style="display:flex;flex-wrap:wrap;gap:8px">' +
        [5, 10, 20].map(function (n) { return '<label class="opt"><input type="radio" name="cnt" value="' + n + '"' + (cnt === n ? ' checked' : '') + '><span>' + n + ' ข้อ</span></label>'; }).join('') + '</div></fieldset></div>' +
        '<div class="step"><span class="n">3</span><fieldset><legend class="h">ระดับความยาก</legend><div style="display:flex;flex-wrap:wrap;gap:8px">' + levelHTML + '</div><p class="note" style="margin-top:10px" id="lvdesc"></p></fieldset></div>' +
        '<div class="step"><span class="n">4</span><fieldset><legend class="h">ใช้ AI ผ่าน</legend><div style="display:flex;flex-direction:column;gap:10px">' +
        '<label class="eng"><input type="radio" name="eng" value="claude"' + (eng === 'claude' ? ' checked' : '') + '><span><b class="k" style="font-weight:500;font-size:17px">Claude</b><br><span class="muted" style="font-size:15px">เปิดแชทใหม่ใน claude.ai ด้วยบัญชีของคุณ ไม่ต้องใส่ key — ทำข้อสอบในแชท</span></span></label>' +
        '<label class="eng"><input type="radio" name="eng" value="api"' + (eng === 'api' ? ' checked' : '') + '><span style="flex:1;min-width:0"><b class="k" style="font-weight:500;font-size:17px">Anthropic API key</b><br><span class="muted" style="font-size:15px">ทำข้อสอบในหน้านี้เลย · key เก็บไว้ในเบราว์เซอร์นี้เท่านั้น</span>' +
        '<input id="key" type="password" class="field" style="margin-top:10px" placeholder="sk-ant-…" autocomplete="off" aria-label="Anthropic API key" value="' + esc(key) + '">' +
        '<select id="model" class="field" style="margin-top:8px" aria-label="รุ่นของ Claude">' + models + '</select>' +
        (key ? '<button type="button" class="chip" id="forget" style="margin-top:8px;min-height:38px">ลบ key ออกจากเบราว์เซอร์นี้</button>' : '') + '</span></label></div></fieldset></div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;border-top:1px solid var(--empty);padding-top:24px"><button class="btn" type="submit" id="go">สร้างข้อสอบ</button><span id="status" class="note" role="status"></span></div>' +
        '</form>' +
        '<div id="quiz" style="flex:1 1 440px;min-width:0;display:flex;flex-direction:column;gap:22px">' +
        (quiz ? quizHTML(quiz) : '<div class="empty"><p class="k" style="font-size:20px">ยังไม่มีข้อสอบ</p><p class="muted">เลือกแหล่งเนื้อหาแล้วกด “สร้างข้อสอบ” — ถ้าใช้ API key ข้อสอบจะขึ้นตรงนี้</p></div>') +
        '</div></section>',
      after: function () {
        var form = document.getElementById('gen'), st = document.getElementById('status');
        function lvNow() { var c = form.querySelector('input[name=lv]:checked'); return c ? +c.value : 3; }
        function showLv() { var l = LEVELS[lvNow() - 1]; document.getElementById('lvdesc').textContent = 'ระดับ ' + lvNow() + ' ' + l[0] + ': ' + l[1] + ' (นิยามชั่วคราว)'; }
        showLv();
        form.addEventListener('change', function (e) {
          if (e.target.name === 'lv') { LS.set('level', lvNow()); showLv(); }
          if (e.target.name === 'cnt') LS.set('count', +e.target.value);
          if (e.target.name === 'eng') LS.set('engine', e.target.value);
          if (e.target.id === 'model') LS.set('model', e.target.value);
          if (e.target.id === 'src') setQuery(route(), { src: e.target.value });
        });
        var fg = document.getElementById('forget');
        if (fg) fg.addEventListener('click', function () { LS.del('apikey'); document.getElementById('key').value = ''; fg.remove(); toast('ลบ key แล้ว'); });
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var o = { n: +(form.querySelector('input[name=cnt]:checked') || { value: 5 }).value, level: lvNow() };
          var engine = (form.querySelector('input[name=eng]:checked') || { value: 'claude' }).value;
          var srcVal = document.getElementById('src').value;
          if (engine === 'claude') {
            o.src = gatherSource(srcVal, o.n, 4500);
            if (!o.src.text) { st.textContent = 'ไม่มีเนื้อหาในแหล่งที่เลือก'; return; }
            var p = buildPrompt(o, true);
            try { navigator.clipboard.writeText(p); } catch (err) { }
            window.open('https://claude.ai/new?q=' + encodeURIComponent(p), '_blank', 'noopener');
            st.textContent = 'เปิด Claude ในแท็บใหม่แล้ว · คัดลอกคำสั่งไว้ให้ด้วย ถ้าแชทไม่ขึ้นข้อความให้วางเอง';
            return;
          }
          var k = document.getElementById('key').value.trim();
          if (!k) { st.textContent = 'ใส่ API key ก่อน'; document.getElementById('key').focus(); return; }
          LS.set('apikey', k);
          var mdl = document.getElementById('model').value;
          o.src = gatherSource(srcVal, o.n, 40000);
          if (!o.src.text) { st.textContent = 'ไม่มีเนื้อหาในแหล่งที่เลือก'; return; }
          var btn = document.getElementById('go'); btn.disabled = true;
          st.innerHTML = '<span class="spin" aria-hidden="true"></span> กำลังให้ AI ออกข้อสอบ ' + o.n + ' ข้อ…';
          fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
            body: JSON.stringify({ model: mdl, max_tokens: Math.min(16000, 1200 * o.n + 1000), messages: [{ role: 'user', content: buildPrompt(o, false) }] })
          }).then(function (res) {
            return res.json().then(function (j) { if (!res.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + res.status)); return j; });
          }).then(function (j) {
            var txt = (j.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('');
            var data = extractJSON(txt);
            var qs = (data.questions || []).filter(function (q) { return q && q.stem && q.options && q.options.length; });
            if (!qs.length) throw new Error('ไม่ได้ข้อสอบกลับมา');
            var qz = { at: Date.now(), label: o.src.label, level: o.level, model: mdl, qs: qs.map(function (q) { return { stem: q.stem, options: q.options.slice(0, 5), answer: q.answer, explanation: q.explanation, topic: q.topic }; }) };
            LS.set('quiz', qz);
            document.getElementById('quiz').innerHTML = quizHTML(qz);
            st.textContent = 'ได้ข้อสอบ ' + qs.length + ' ข้อ';
          }).catch(function (err) {
            st.innerHTML = '<span class="warn" style="display:inline-block">สร้างไม่สำเร็จ: ' + esc(err.message || err) + '</span>';
          }).then(function () { btn.disabled = false; });
        });
        document.getElementById('quiz').addEventListener('click', function (e) {
          var b = e.target.closest('[data-pick]'); if (!b || b.disabled) return;
          var art = b.closest('[data-qi]'), qi = +art.getAttribute('data-qi');
          var qz = LS.get('quiz', null); if (!qz || !qz.qs[qi]) return;
          qz.qs[qi].pick = +b.getAttribute('data-pick');
          LS.set('quiz', qz);
          var y = window.scrollY;
          document.getElementById('quiz').innerHTML = quizHTML(qz);
          window.scrollTo(0, y);
        });
      }
    };
  };

  PAGES._404 = function () {
    return { title: 'ไม่พบหน้า', html: '<section class="wrap phead"><div style="display:flex;flex-direction:column;gap:14px"><h1 style="font-size:44px">ไม่พบหน้านี้</h1><a class="btn ghost" href="#/" style="align-self:flex-start">กลับหน้าแรก</a></div></section>' };
  };

  /* =========================================================
     บัญชีของฉัน
     ========================================================= */
  PAGES.account = function () {
    var head = '<section class="wrap phead" style="padding-bottom:24px"><div style="display:flex;flex-direction:column;gap:14px"><span class="label">บัญชี</span><h1 style="font-size:clamp(38px,5vw,60px)">บัญชีของฉัน</h1></div></section>';
    var box = function (inner) { return head + '<section class="wrap" style="padding-bottom:80px"><div class="sheet" style="max-width:560px;padding:clamp(22px,4vw,36px);display:flex;flex-direction:column;gap:16px">' + inner + '</div></section>'; };
    if (!fbOn()) return { title: 'บัญชี', html: box('<p>ยังไม่ได้ตั้งค่า Firebase — ข้อมูลบันทึกในเบราว์เซอร์นี้อย่างเดียว</p>') };
    if (!FB) return { title: 'บัญชี', html: box(fbFail ? '<p>เชื่อมต่อระบบบัญชีไม่ได้ ตรวจอินเทอร์เน็ตแล้วรีเฟรชหน้า ระหว่างนี้ใช้งานได้ตามปกติ (บันทึกในเครื่อง)</p>' : '<p class="muted"><span class="spin" aria-hidden="true"></span> กำลังเชื่อมต่อระบบบัญชี…</p>') };
    var syncList = '<ul class="muted" style="font-size:15px"><li>หน้าที่อ่านค้าง</li><li>ข้อสอบ AI ชุดล่าสุดและคำตอบ</li><li>ค่าที่เลือกในห้องสอบ (ระดับ จำนวนข้อ วิธีใช้ AI รุ่น)</li></ul><p class="note">API key ไม่ซิงก์ — อยู่ในเบราว์เซอร์ที่ใส่ไว้เท่านั้น</p>';
    if (FB.user) {
      var st = syncState === 'error' ? '<p class="warn">ซิงก์ไม่สำเร็จ: ' + esc(authErr) + ' — ข้อมูลยังบันทึกในเครื่องนี้</p>'
        : syncState === 'saving' ? '<p class="info"><span class="spin" aria-hidden="true"></span> กำลังบันทึก…</p>' : '<p class="info">บันทึกในบัญชีแล้ว · เปิดจากเครื่องไหนก็ได้</p>';
      return {
        title: 'บัญชี', html: box('<div><span class="label">เข้าสู่ระบบเป็น</span><p class="k" style="font-size:24px;margin-top:4px">' + esc(who(FB.user)) + '</p></div>' + st +
          '<div><span class="label">สิ่งที่ซิงก์ข้ามเครื่อง</span>' + syncList + '</div>' +
          '<label class="ck"><input type="checkbox" id="wipe"><span>ลบข้อมูลออกจากเครื่องนี้ด้วยตอนออกจากระบบ <span class="muted">(แนะนำถ้าเป็นเครื่องคนอื่น — ข้อมูลยังอยู่ในบัญชี)</span></span></label>' +
          '<div style="display:flex;flex-wrap:wrap;gap:10px"><a class="btn" href="#/">กลับหน้าแรก</a><button class="btn ghost" type="button" id="out">ออกจากระบบ</button></div>'),
        after: function () {
          document.getElementById('out').addEventListener('click', function () {
            var wipe = document.getElementById('wipe').checked;
            pushNow().then(function () { return FB.au.signOut(FB.auth); }).then(function () {
              if (wipe) { SYNC_KEYS.concat(['ts', 'apikey']).forEach(function (k) { LS.del(k); }); }
              toast('ออกจากระบบแล้ว'); location.hash = '#/';
            });
          });
        }
      };
    }
    return {
      title: 'เข้าสู่ระบบ', html: box(
        '<p>ไม่บังคับ — เข้าสู่ระบบเพื่อบันทึกในบัญชี แล้วใช้ได้หลายเครื่อง สิ่งที่ทำไว้ในเครื่องนี้จะรวมเข้าบัญชีให้</p>' +
        '<p class="info">ใช้บัญชีเดียวกับคลังข้อสอบเก่า MDCU ได้เลย</p>' +
        '<button class="btn" type="button" id="gIn">เข้าสู่ระบบด้วย Google</button>' +
        '<p class="note">ถ้าเปิดจากในแอป LINE/IG แล้วกด Google ไม่ได้ ให้เปิดลิงก์ใน Safari/Chrome หรือใช้ชื่อผู้ใช้ด้านล่าง</p>' +
        '<div class="label" style="border-top:1px dashed var(--rule);padding-top:16px">หรือใช้ชื่อผู้ใช้ / อีเมล</div>' +
        '<label class="sr" for="em">ชื่อผู้ใช้หรืออีเมล</label><input class="field" id="em" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="ชื่อผู้ใช้ (a-z, 0-9) หรืออีเมล">' +
        '<label class="sr" for="pw">รหัสผ่าน</label><input class="field" id="pw" type="password" autocomplete="current-password" placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)">' +
        '<p class="warn" id="err"' + (authErr ? '' : ' hidden') + '>' + esc(authErr) + '</p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><button class="btn" type="button" id="eIn">เข้าสู่ระบบ</button><button class="btn ghost" type="button" id="eUp">สมัครใหม่</button><button class="chip" type="button" id="eReset" style="margin-left:auto">ลืมรหัสผ่าน</button></div>' +
        '<a class="chip" href="#/" style="align-self:flex-start">ใช้งานโดยไม่เข้าสู่ระบบ</a>'),
      after: function () {
        var A = FB.au, el = function (id) { return document.getElementById(id); };
        function err(m) { authErr = m; el('err').textContent = m; el('err').hidden = !m; }
        function cred(fn) { err(''); var e; try { e = toEmail(el('em').value); } catch (x) { err(errMsg(x)); return; } fn(FB.auth, e, el('pw').value).catch(function (x) { err(errMsg(x)); }); }
        el('gIn').addEventListener('click', function () {
          err(''); var p = new A.GoogleAuthProvider();
          A.signInWithPopup(FB.auth, p).catch(function (e) {
            if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].indexOf(e.code) >= 0) A.signInWithRedirect(FB.auth, p).catch(function (e2) { err(errMsg(e2)); });
            else err(errMsg(e));
          });
        });
        el('eIn').addEventListener('click', function () { cred(A.signInWithEmailAndPassword); });
        el('eUp').addEventListener('click', function () { cred(A.createUserWithEmailAndPassword); });
        el('eReset').addEventListener('click', function () {
          var v = el('em').value.trim();
          if (v.indexOf('@') < 0) { err('รีเซ็ตรหัสได้เฉพาะบัญชีที่สมัครด้วยอีเมล — ใส่อีเมลแล้วกดอีกครั้ง'); return; }
          A.sendPasswordResetEmail(FB.auth, v).then(function () { err('ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว'); }).catch(function (e) { err(errMsg(e)); });
        });
      }
    };
  };

  /* ---------- boot ---------- */
  var lm = new Date(document.lastModified);
  document.getElementById('built').textContent = isNaN(lm) ? '' : 'อัปเดตเว็บล่าสุด ' + fmtTime(lm);
  initDiseases();
  render(false);
  initFB();
})();
