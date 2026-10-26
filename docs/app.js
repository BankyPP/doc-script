/* โพยหมอ — single-page app (hash routes)
   #/ · #/preclinic[/sys[/doc]] · #/clinic[/approach] · #/diseases?s=&q=&f=&v= · #/disease/<no> · #/exam?t=&src= · #/nl[/board|notes|exams|settings] · #/topics[/<id>/sum/<หน้า>|/<id>/practice?m=] · #/account */
(function () {
  'use strict';
  var C = window.POY_CONFIG, SYS = window.POY_SYSTEMS, OTHER = window.POY_OTHER;
  var PRE = window.POY_PRECLINIC, CLI = window.POY_CLINIC, NLD = window.POY_NL || { notes: [] };
  var app = document.getElementById('app');

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return ('000' + n).slice(-4); }
  /* ค่าที่ซิงก์เข้าบัญชี (API key ไม่ซิงก์ — อยู่ในเบราว์เซอร์นั้นเท่านั้น) */
  var SYNC_KEYS = ['recent', 'quiz', 'level', 'count', 'engine', 'model', 'nlset', 'topicset', 'topicq', 'topicst'];
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
  /* เครื่องที่เชื่อถือ = เคยกดเข้าสู่ระบบในโพยหมอเองเท่านั้น (ล็อกอินค้างจากคลังข้อสอบเก่าไม่นับ) */
  /* รอบ reset (gate.r): //toggle pw reset เพิ่มเลขนี้ → เครื่องที่ยืนยันไว้รอบก่อนต้องใส่รหัสใหม่ (ไม่ log out) */
  function gateR() { var g = window.POY_CONFIG.gate; return (g && +g.r) || 0; }
  function devTrusted() { try { var v = localStorage.getItem('poy-trusted'); return v === 'r' + gateR() || (gateR() === 0 && v === '1'); } catch (e) { return false; } }
  function markTrusted() { try { localStorage.setItem('poy-trusted', 'r' + gateR()); } catch (e) { } }
  /* ใส่รหัสแล้วจำไว้จนปิดแท็บ (sessionStorage) */
  function passTok() { var g = window.POY_CONFIG.gate; return g && g.h ? g.h + ':' + gateR() : ''; }
  function gatePassed() { try { return sessionStorage.getItem('poy-pass') === passTok(); } catch (e) { return false; } }
  function markPassed() { try { sessionStorage.setItem('poy-pass', passTok()); } catch (e) { } }
  function gateOn() { var g = window.POY_CONFIG.gate; return !!(g && g.on && g.h) && !gateOk && !gatePassed() && !devTrusted(); }
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
        if (ok) { gateOk = true; markPassed(); render(false); } else { document.getElementById('gateErr').hidden = false; i.value = ''; i.focus(); }
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
      else if (n === 'nl' && changed.indexOf('nlset') >= 0) {
        var ae = document.activeElement;
        if (!(ae && ae.closest && ae.closest('#nlset'))) render(true);
      }
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
      if (onBoard()) render(true);
      m[1].setPersistence(FB.auth, m[1].browserLocalPersistence).catch(function () { });
      m[1].getRedirectResult(FB.auth).then(function (r) { if (r && r.user) markTrusted(); }).catch(function (e) { authErr = errMsg(e); paintAcct(); });
      m[1].onAuthStateChanged(FB.auth, function (u) {
        var was = FB.user ? FB.user.uid : null; FB.user = u; if (unsub) { unsub(); unsub = null; }
        if ((u ? u.uid : null) !== was && onBoard()) render(true);
        if (!u) { syncState = 'local'; paintAcct(); return; }
        authErr = ''; syncState = 'saving'; paintAcct();
        FB.fs.getDoc(fbRef()).then(function (snap) {
          var need = mergeRemote(snap.exists() ? snap.data() : null);
          syncState = 'cloud'; paintAcct();
          if (need) pushNow();
          unsub = FB.fs.onSnapshot(fbRef(), function (s) { if (s.exists() && !s.metadata.hasPendingWrites) mergeRemote(s.data()); });
        }).catch(function (e) { console.warn(e); syncState = 'error'; authErr = errMsg(e); paintAcct(); });
      });
    }).catch(function (e) { console.warn('firebase', e); fbFail = true; paintAcct(); if (onBoard()) render(true); });
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
  var lastPath = null, pageCleanup = null;
  function onBoard() { var r = route(); return r.name === 'nl' && r.args[0] === 'board'; }
  function render(keepScroll) {
    if (gateOn()) { renderGate(); return; }
    document.body.classList.remove('gated');
    var r = route();
    var page = PAGES[r.name] || PAGES._404;
    if (pageCleanup) { try { pageCleanup(); } catch (e) { } pageCleanup = null; }
    var here = r.name === 'disease' ? 'diseases' : r.name, sub = (r.name === 'nl' || r.name === 'topics') && r.args[0] ? r.name + '/' + r.args[0] : '';
    document.querySelectorAll('#drawer [data-r]').forEach(function (a) {
      var k = a.getAttribute('data-r');
      var on = k === here || (k === sub && sub !== '');
      a.classList.toggle('on', on);
      if (on && (k === sub || !sub)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    paintDsub();
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
  ['gsearch', 'dsearch'].forEach(function (id) {
    document.getElementById(id).addEventListener('submit', function (e) {
      e.preventDefault();
      var v = this.querySelector('input').value.trim();
      closeDrawer(false);
      location.hash = '#/diseases' + (v ? '?q=' + encodeURIComponent(v) : '');
    });
  });

  /* ---------- เมนู ☰ (เด้งจากซ้าย) ---------- */
  var drawer = document.getElementById('drawer'), scrim = document.getElementById('scrim'), burger = document.getElementById('burger');
  function openDrawer() {
    document.body.classList.add('dopen'); burger.setAttribute('aria-expanded', 'true');
    var f = drawer.querySelector('a.on[aria-current]') || drawer.querySelector('.dlinks a');
    setTimeout(function () { if (f) f.focus(); }, 60);
  }
  function closeDrawer(focusBack) {
    if (!document.body.classList.contains('dopen')) return;
    document.body.classList.remove('dopen'); burger.setAttribute('aria-expanded', 'false');
    if (focusBack) burger.focus();
  }
  /* เปิด/ปิดหัวข้อย่อยในเมนู — จำค่าที่กดไว้ ถ้ายังไม่เคยกด: เปิดเฉพาะส่วนที่อยู่ตอนนี้ */
  function dsubState(k) { try { var o = JSON.parse(localStorage.getItem('poy-dsub') || '{}'); return o.hasOwnProperty(k) ? !!o[k] : null; } catch (e) { return null; } }
  function paintDsub() {
    var cur = route().name;
    drawer.querySelectorAll('[data-tog]').forEach(function (b) {
      var k = b.getAttribute('data-tog'), s = dsubState(k), open = s === null ? cur === k : s;
      b.setAttribute('aria-expanded', String(open));
      var sub = document.getElementById('dsub-' + k); if (sub) sub.hidden = !open;
    });
  }
  drawer.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tog]'); if (!b) return;
    var k = b.getAttribute('data-tog'), open = b.getAttribute('aria-expanded') !== 'true';
    try { var o = JSON.parse(localStorage.getItem('poy-dsub') || '{}'); o[k] = open; localStorage.setItem('poy-dsub', JSON.stringify(o)); } catch (x) { }
    paintDsub();
  });
  burger.addEventListener('click', function () { if (document.body.classList.contains('dopen')) closeDrawer(true); else openDrawer(); });
  document.getElementById('dclose').addEventListener('click', function () { closeDrawer(true); });
  scrim.addEventListener('click', function () { closeDrawer(true); });
  drawer.addEventListener('click', function (e) { if (e.target.closest('a')) closeDrawer(false); });
  document.addEventListener('keydown', function (e) {
    if (!document.body.classList.contains('dopen')) return;
    if (e.key === 'Escape') { closeDrawer(true); return; }
    if (e.key === 'Tab') {   /* วนโฟกัสในเมนู */
      var f = Array.prototype.filter.call(drawer.querySelectorAll('a,button,input'), function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
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
    '<text x="366" y="172"><tspan font-family="Kanit, sans-serif" font-weight="600">ลำต้นและใบ</tspan><tspan x="366" dy="20" fill="#5A6258">Clinic ปี 4–6</tspan><tspan x="366" dy="20" fill="#5A6258">1000 MAI</tspan></text>' +
    '<text x="378" y="466"><tspan font-family="Kanit, sans-serif" font-weight="600">ราก</tspan><tspan x="378" dy="20" fill="#5A6258">Preclinic ปี 1–3</tspan></text>' +
    '<text x="142" y="246" text-anchor="end"><tspan font-family="Kanit, sans-serif" font-weight="600" fill="#A44A2A">ตอนนี้</tspan><tspan x="142" dy="20" fill="#5A6258">ปี ' + esc(C.currentYear) + '</tspan></text>' +
    '<text x="40" y="548" font-style="italic" fill="#5A6258" font-size="14">Fig. 1 — Medicus studens, ปี 1 → License</text></g></svg>';

  PAGES[''] = function () {
    var n = D.src === 'sample' ? 0 : D.list.length;
    var pct = Math.min(100, n / 10);
    var plots = [
      ['#/preclinic', '#3E7CA6', '01 · ราก', 'Preclinic แยกตาม system', 'สรุปปี 1–3 จัดตาม 12 ระบบ อ่านต่อกันได้ตั้งแต่ anatomy ไปจนถึง pharmacology', '<span class="muted">ดึงจาก Google Docs</span>'],
      ['#/clinic', '#5C7F3A', '02 · ลำต้น', 'Clinic', 'สมุดวอร์ดของแต่ละ rotation และ approach ตามอาการนำ ที่กดต่อไปหาโรคได้ทันที', '<span class="muted">เขียนในเว็บ + คลังข้อสอบเก่า</span>'],
      ['#/diseases', '#9B4F2E', '04 · พรรณไม้', '1000 MAI', 'หนึ่งโรค หนึ่งแผ่นตัวอย่าง — diag, lab, initial management ครบในหน้าเดียว',
        '<span class="live' + (D.src === 'sample' ? ' off' : '') + '"><i></i>' + (D.src === 'sample' ? 'ยังไม่ได้เชื่อม Google Sheet' : 'ซิงก์จาก Google Sheet') + '</span>',
        '<div style="display:flex;flex-direction:column;gap:6px"><div style="height:6px;background:#E4DDCB;border-radius:3px"><div style="width:' + pct + '%;height:6px;background:#9B4F2E;border-radius:3px"></div></div><span class="muted" style="font-size:14px">เก็บแล้ว ' + n + ' / 1000</span></div>'],
      ['#/exam', '#C9952E', '05 · ห้องสอบ', 'ข้อสอบจาก AI', 'เลือกโรค ระบบ หรือเอกสาร แล้วให้ AI ออกข้อสอบ case-based พร้อมเฉลย', '<span class="muted">ใช้ Claude หรือ API key</span>'],
      ['#/exam?t=mock', '#A33A3A', '06 · เก็งข้อสอบ', 'Mock exam ตาม blueprint', 'จัดชุดตาม blueprint ของ Compre และ NL กำหนดระดับความยากได้ 5 ระดับ', '<span class="muted">รอ blueprint และนิยามความยาก</span>']
    ];
    var rot = [-2.5, 2, -4, 1, -1.5];
    var plotsHTML = plots.map(function (p, i) {
      return '<a class="sheet plot" href="' + p[0] + '"><div class="tape" style="transform:rotate(' + rot[i] + 'deg)"></div>' + brush(p[1]) +
        '<span class="label">' + p[2] + '</span><h3>' + p[3] + '</h3><p class="muted">' + p[4] + '</p>' + (p[6] || '') +
        '<div class="foot">' + p[5] + '<span class="k" style="font-size:20px" aria-hidden="true">→</span></div></a>' +
        (i === 1 ? '<a class="sheet plot" href="#/topics"><div class="tape" style="transform:rotate(-1.8deg)"></div>' + brush('#2F7466') + '<span class="label">03 · เมล็ดพันธุ์</span><h3>Random Topic Summary</h3><p class="muted">สรุปแยกเป็นเรื่อง ๆ ตามหัวข้อที่เลือกเอง พร้อมโจทย์ AI ที่ออกทีละข้อจากหัวข้อใหญ่หรือย่อย</p><div class="foot"><span class="muted">' + (window.POY_TOPICS || []).map(function (x) { return esc(x.title); }).join(' · ') + '</span><span class="k" style="font-size:20px" aria-hidden="true">→</span></div></a>' : '');
    }).join('') +
      '<a class="sheet plot" href="#/nl"><div class="tape" style="transform:rotate(2.5deg)"></div>' + brush('#4A5560') + '<span class="label">07 · ยอดเขา</span><h3>ติว NL &amp; Compre</h3><p class="muted">บอร์ดประกาศ สรุปเนื้อหาจากจุฬาฯ และศิริราช ข้อสอบเก่า NL1–2 และ Compre 1–3</p><div class="foot">' + nlNextHTML() + '<span class="k" style="font-size:20px" aria-hidden="true">→</span></div></a>';

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
    return {
      title: '', html:
        '<section class="wrap hero"><div style="flex:1 1 480px;min-width:0;display:flex;flex-direction:column;gap:26px"><span class="label">สมุดสนามของหมอ · เล่มที่ 1</span>' +
        '<h1>ทุกอย่างที่เคยเรียน<br>เก็บไว้ในเล่มเดียว</h1>' +
        '<p style="font-size:19px;max-width:560px;color:var(--ink-2)">คลังความรู้ตั้งแต่ปี 1 จนถึงวันสอบใบประกอบวิชาชีพ — สรุป preclinic, clinic, 1000 โรคที่ต้องรู้จัก และห้องสอบที่ให้ AI ช่วยออกข้อสอบจากสิ่งที่เราเก็บไว้เอง</p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:12px"><a class="btn" href="#/diseases">เปิด 1000 MAI</a><a class="btn ghost" href="#/exam">เข้าห้องสอบ</a></div></div>' +
        '<figure style="flex:1 1 420px;max-width:560px;min-width:0">' + PLANT + '</figure></section>' +
        '<section style="border-top:1px solid var(--rule);padding:56px 0 72px"><div class="wrap" style="display:flex;flex-direction:column;gap:32px">' +
        '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:12px 32px"><div style="display:flex;flex-direction:column;gap:8px"><span class="label">เมนู</span><h2 style="font-size:38px">วันนี้จะเดินแปลงไหน</h2></div>' +
        '<p class="muted" style="max-width:460px">แต่ละแปลงคือหนึ่งส่วนของเว็บ ข้อมูลบางส่วนดึงมาจาก Google Docs และ Google Sheet ที่เขียนอยู่แล้ว</p></div>' +
        '<div class="plots">' + plotsHTML + '</div></div></section>' +
        '<section class="band" style="padding:56px 0 64px"><div class="wrap" style="display:flex;flex-wrap:wrap;gap:40px 64px">' +
        '<div style="flex:1 1 440px;min-width:0;display:flex;flex-direction:column;gap:6px"><span class="label">ที่ค้างไว้</span><h2 style="font-size:30px;margin-bottom:8px">อ่านต่อจากครั้งก่อน</h2>' + recentHTML + '</div>' +
        '<div style="flex:1 1 440px;min-width:0;display:flex;flex-direction:column;gap:6px"><span class="label">' + (D.src === 'sample' ? 'ข้อมูลตัวอย่าง' : 'เพิ่งเก็บเข้าหอพรรณไม้ · จาก Google Sheet') + '</span><h2 style="font-size:30px;margin-bottom:8px">ตัวอย่างล่าสุด</h2>' + newHTML + '</div>' +
        '</div></section>' +
        '<section id="path" style="padding:64px 0 72px"><div class="wrap" style="display:flex;flex-direction:column;gap:36px">' +
        '<div style="display:flex;flex-direction:column;gap:8px"><span class="label">เส้นทาง</span><h2 style="font-size:38px">จากปี 1 ถึงใบประกอบวิชาชีพ</h2></div>' +
        '<div style="overflow-x:auto;padding-bottom:8px"><div class="timeline"><svg viewBox="0 0 1000 40" preserveAspectRatio="none" style="position:absolute;left:0;top:14px;width:100%;height:40px" aria-hidden="true"><path d="M20 20 C180 8 320 32 500 18 C680 6 820 30 980 18" fill="none" stroke="#7A5C3E" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round"/></svg>' + tl + '</div></div>' +
        '</div></section>'
    };
  };

  /* =========================================================
     1000 MAI — list
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
      title: '1000 MAI', html:
        '<section class="wrap phead"><div style="flex:1 1 520px;min-width:0;display:flex;flex-direction:column;gap:16px"><span class="label">04 · พรรณไม้</span><h1>1000 MAI</h1>' +
        '<p class="lede">หอพรรณไม้ของโรค — แต่ละโรคคือหนึ่งแผ่นตัวอย่าง รู้จักให้พอจะ diag ได้ รู้ว่าต้องส่ง lab อะไร และเริ่ม initial management ได้</p>' +
        '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px">' + liveHTML() + (hasSheet() ? '<button class="chip" type="button" id="reload" style="min-height:40px">ดึงใหม่</button>' : '') + '</div></div>' +
        '<div style="flex:0 1 380px;min-width:260px;display:flex;flex-direction:column;gap:10px"><div style="display:flex;align-items:baseline;gap:10px"><span class="k" style="font-size:64px;line-height:1">' + n + '</span><span class="muted" style="font-size:18px">/ 1000 แผ่นตัวอย่าง</span></div>' +
        '<svg viewBox="0 0 380 34" width="100%" aria-hidden="true"><rect x="1" y="1" width="378" height="22" rx="3" fill="#FBF9F3" stroke="#BDB39B"/><rect x="1" y="1" width="' + Math.max(0, Math.min(378, n * 0.378)) + '" height="22" rx="3" fill="#9B4F2E" opacity=".85"/><path d="' + ticks + '" stroke="#7A6E58" stroke-width="1"/><g font-family="Sarabun, sans-serif" font-size="10" fill="#5A6258"><text x="2" y="33">0</text><text x="182" y="33">500</text><text x="358" y="33">1000</text></g></svg></div></section>' +
        '<section class="wrap" style="padding-bottom:20px"><label class="search" style="max-width:560px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A6258" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span class="sr">ค้นใน 1000 MAI</span><input type="search" id="dq" placeholder="ค้นชื่อโรค อาการ หรือ lab ที่นึกถึง…" value="' + esc(st.q) + '"></label></section>' +
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
      title: 'ไม่พบโรค', html: '<section class="wrap phead"><div style="display:flex;flex-direction:column;gap:14px"><span class="label">1000 MAI</span><h1 style="font-size:44px">ไม่พบแผ่นตัวอย่างนี้</h1><p class="muted">' + (D.loading ? 'กำลังดึงข้อมูลจาก Google Sheet…' : 'อาจถูกลบหรือเปลี่ยนเลขในชีต') + '</p><a class="btn ghost" href="#/diseases" style="align-self:flex-start">กลับไปหอพรรณไม้</a></div></section>'
    };
    remember({ href: '#/disease/' + encodeURIComponent(d.no), title: d.name, crumb: '1000 MAI › ' + d.sys.name, c: d.sys.c });
    var rel = D.list.filter(function (x) { return x !== d && x.sys === d.sys; }).slice(0, 6);
    var sheetLink = C.sheet && C.sheet.id ? 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(C.sheet.id) + '/edit#gid=' + encodeURIComponent(C.sheet.gid || '0') + '&range=A' + d.row : '';
    var entries = d.fields.map(function (f, i) {
      return '<section class="entry' + (f.value ? '' : ' blank') + '"><span class="num">' + roman(i) + '</span><div><h2>' + esc(f.label) + '</h2><div class="val">' + (f.value ? rich(f.value) : '<p>ยังไม่ได้กรอกช่องนี้ในชีต</p>') + '</div></div></section>';
    }).join('');
    return {
      title: d.name, html:
        '<div class="wrap" style="padding-top:28px;padding-bottom:80px"><nav aria-label="ตำแหน่ง" style="font-size:15px;margin-bottom:28px"><a href="#/diseases">1000 MAI</a><span class="muted"> › </span><a href="#/diseases?s=' + d.sys.id + '">' + esc(d.sys.name) + '</a><span class="muted"> › </span><span>' + esc(d.name) + '</span></nav>' +
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
        '<p class="lede">สรุปที่เขียนไว้ใน Google Docs ดึงมาจัดหน้าใหม่ให้อ่านง่าย และกดต่อไปหาโรคที่เกี่ยวข้องใน 1000 MAIได้</p></div></section>' +
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
        '<p class="lede">เข้าได้สามทาง: ตามวอร์ดที่วนอยู่ ตามอาการนำของคนไข้ หรือตามงานที่ต้องทำบนวอร์ด — ทุกทางกดต่อไปหาแผ่นตัวอย่างใน 1000 MAIได้</p></div></section>' +
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
     ห้องสอบ
     ========================================================= */
  var LEVELS = [
    ['ต้นกล้า', 'recall ข้อเท็จจริงตรง ๆ จากเนื้อหา', '<path d="M12 22V13"/><path d="M12 15C8 15 6 12 6 9C9 9 12 11 12 15Z"/><path d="M12 13C15 13 18 11 18 8C15 8 12 10 12 13Z"/><path d="M7 22h10"/>'],
    ['ไม้พุ่ม', 'เข้าใจและประยุกต์ขั้นเดียว เคสสั้น', '<circle cx="8" cy="15" r="4.5"/><circle cx="16" cy="15" r="4.5"/><circle cx="12" cy="10" r="4.5"/><path d="M12 19.5V22M6 22h12"/>'],
    ['ไม้ใหญ่', 'เคสเต็ม ต้องวินิจฉัยก่อนแล้วเลือก investigation หรือ management', '<circle cx="12" cy="9" r="6.5"/><path d="M12 15.5V22M12 18l-3-2M12 17l3-2.5M7 22h10"/>'],
    ['ป่าดิบ', 'เคสซับซ้อน มีโรคร่วมหรือข้อมูลรบกวน ตัวลวงใกล้เคียงกันมาก', '<path d="M7 3L2 15h10Z"/><path d="M17 6l-5 12h10Z"/><path d="M7 15v6M17 18v4M2 22h20"/>'],
    ['ยอดเขา', 'หลายขั้นตอน รายละเอียดระดับ guideline แยกแยะข้อยกเว้น', '<path d="M2 21L9 7l4 6 3-4 6 12Z"/><path d="M7.2 10.6L9 12l1.6-1.6"/>']
  ];
  function sourceOptions(sel) {
    var o = '<optgroup label="1000 MAI"><option value="all">สุ่มจากทุกโรค</option>';
    var used = {}; D.list.forEach(function (d) { used[d.sys.id] = d.sys; });
    Object.keys(used).forEach(function (k) { o += '<option value="s:' + k + '">สุ่มจากระบบ ' + esc(used[k].name) + '</option>'; });
    o += '</optgroup><optgroup label="1000 MAI · รายโรค">' + D.list.map(function (d) { return '<option value="d:' + esc(d.no) + '">' + esc(d.name) + '</option>'; }).join('') + '</optgroup>';
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
    var head = '<section class="wrap phead" style="padding-bottom:24px"><div style="display:flex;flex-direction:column;gap:16px"><span class="label">05–06 · ห้องสอบ</span><h1 style="font-size:clamp(38px,5vw,66px);max-width:900px">ให้ AI ออกข้อสอบจากสิ่งที่เราเก็บไว้</h1>' +
      '<p class="lede">สร้างข้อสอบจากโรค ระบบ หรือเอกสารที่เลือก หรือจัด mock exam ทั้งชุดตาม blueprint ของ Compre และ NL</p>' +
      '<div role="tablist" aria-label="โหมดห้องสอบ" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">' + tabs + '</div></div></section>';

    if (t === 'guess') return {
      title: 'เก็งข้อสอบ', html: head + '<section class="wrap" style="padding-bottom:80px"><div class="empty"><p class="k" style="font-size:22px">เก็งข้อสอบ — กำลังเตรียม</p><p class="muted" style="max-width:560px;margin:8px auto 0">AI จะอ่านข้อสอบเก่า blueprint และสิ่งที่เก็บไว้ในโพยหมอ แล้วจัดหัวข้อที่น่าจะออกพร้อมเหตุผล — รอ blueprint และข้อสอบเก่าที่จะเชื่อมจากคลังข้อสอบเก่า</p></div></section>'
    };
    if (t === 'mock') return {
      title: 'Mock exam', html: head + '<section class="wrap" style="padding-bottom:80px;display:flex;flex-wrap:wrap;gap:32px 48px;align-items:flex-start">' +
        '<div class="sheet" style="flex:1 1 540px;min-width:0;padding:clamp(22px,3.5vw,40px)">' +
        '<div class="step"><span class="n">1</span><fieldset><legend class="h">สนามสอบ</legend><div style="display:flex;flex-wrap:wrap;gap:8px">' + NLX().map(function (x, i) { return '<label class="opt"><input type="radio" name="field"' + (i ? '' : ' checked') + '><span>' + esc(x.name) + '</span></label>'; }).join('') + '</div></fieldset></div>' +
        '<div class="step"><span class="n">2</span><div><span class="h">Blueprint</span><div class="empty" style="padding:22px"><p class="muted">ยังไม่มี blueprint — ส่ง blueprint ของ Compre / NL มา แล้ว Claude จะใส่สัดส่วนแต่ละหมวดให้</p></div></div></div>' +
        '<div class="step"><span class="n">3</span><fieldset><legend class="h">ระดับความยาก</legend><div style="display:flex;flex-wrap:wrap;gap:8px">' + levelHTML + '</div><p class="note" style="margin-top:10px">นิยามแต่ละระดับตอนนี้เป็นแบบชั่วคราว รอกำหนดใหม่</p></fieldset></div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:12px;border-top:1px solid var(--empty);padding-top:24px"><button class="btn" type="button" disabled>เริ่ม Mock exam</button><span class="note" style="align-self:center">เปิดใช้เมื่อมี blueprint</span></div></div>' +
        '<aside style="flex:1 1 360px;min-width:0" class="info">ระหว่างรอ blueprint ใช้แท็บ “สร้างข้อสอบ” ทำชุดสั้นจากระบบหรือโรคที่อยากซ้อมได้เลย</aside></section>'
    };

    var quiz = LS.get('quiz', null);
    var models = C.ai.models.map(function (m) { return '<option value="' + esc(m.id) + '"' + (m.id === model ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('');
    return {
      title: 'ห้องสอบ', html: head +
        '<section class="wrap" style="display:flex;flex-wrap:wrap;gap:40px 48px;align-items:flex-start;padding-bottom:80px">' +
        '<form id="gen" class="sheet" style="flex:1 1 480px;min-width:0;padding:clamp(22px,3.5vw,40px)">' +
        '<div class="step"><span class="n">1</span><div><label class="h" for="src">ออกข้อสอบจาก</label><select id="src" class="field">' + sourceOptions(src) + '</select>' +
        (D.src === 'sample' ? '<p class="note" style="margin-top:8px">ตอนนี้ 1000 MAIยังเป็นข้อมูลตัวอย่าง (เต็มแค่ Melioidosis)</p>' : '') + '</div></div>' +
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

  /* =========================================================
     ติว NL & Compre — หน้ารวม + หน้าย่อย (บอร์ดประกาศ · สรุปเนื้อหา · ข้อสอบ · ตั้งค่า)
     ========================================================= */
  var NL_TYPES = ['MCQ', 'MEQ', 'OSCE'];
  var KIND = { nl: 'NL', compre: 'Compre' };
  var SRC = { MDCU: ['mdcu', 'จุฬาฯ'], SI: ['si', 'ศิริราช'] };
  function NLX() { return (C.nl && C.nl.exams) || []; }
  /* ตั้งค่าการสอบ: ค่าที่แก้ในเว็บ (LS nlset, ซิงก์บัญชี) ทับค่าเริ่มต้นใน config.js */
  function nlSet() {
    var saved = LS.get('nlset', {}) || {};
    return NLX().map(function (x) {
      var src = saved[x.id] && saved[x.id].parts ? saved[x.id].parts : (x.parts || []), by = {};
      src.forEach(function (p) { if (p && p.type) by[p.type] = p; });
      return {
        id: x.id, name: x.name, kind: x.kind,
        parts: NL_TYPES.filter(function (t) { return by[t]; }).map(function (t) { var p = by[t]; return { type: t, date: p.date || '', time: p.time || '', n: p.n || '', min: p.min || '' }; })
      };
    });
  }
  function nlSave(list) { var o = {}; list.forEach(function (x) { o[x.id] = { parts: x.parts }; }); LS.set('nlset', o); }
  function dayDiff(ds) { var t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((new Date(ds + 'T00:00:00') - t) / 864e5); }
  function thDate(ds) { return new Date(ds + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function daysText(ds) { var d = dayDiff(ds); return d > 0 ? 'อีก ' + d + ' วัน' : d === 0 ? 'วันนี้' : 'ผ่านไปแล้ว'; }
  function nextPart(x) {
    var b = null; x.parts.forEach(function (p) { if (p.date && dayDiff(p.date) >= 0 && (!b || p.date < b.date)) b = p; }); return b;
  }
  function nlNextHTML() {
    var b = null; nlSet().forEach(function (x) { var p = nextPart(x); if (p && (!b || p.date < b.p.date)) b = { x: x, p: p }; });
    return b ? '<span class="muted">' + esc(b.x.name + ' ' + b.p.type) + ' · ' + daysText(b.p.date) + '</span>' : '<span class="muted">ใส่วันสอบได้ในหน้าตั้งค่า</span>';
  }
  function partLine(p) {
    var bits = [];
    if (p.date) bits.push(thDate(p.date) + (p.time ? ' ' + p.time + ' น.' : ''));
    if (p.n) bits.push(p.n + (p.type === 'OSCE' ? ' สถานี' : ' ข้อ'));
    if (p.min) bits.push(p.min + ' นาที');
    return '<span class="k" style="font-weight:500">' + p.type + '</span> <span class="muted">' + (bits.length ? esc(bits.join(' · ')) : 'ยังไม่ได้ใส่รายละเอียด') + '</span>';
  }
  function srcBadges(arr) { return (arr || []).map(function (k) { var s = SRC[k]; return s ? '<span class="src ' + s[0] + '">' + s[1] + '</span>' : ''; }).join(''); }

  var ICON = {
    board: '<path d="M12 3.2c1.6 0 2.9 1.2 2.9 2.8 0 1.2-.7 2.1-1.7 2.5l.6 5.3H10.2l.6-5.3C9.8 8.1 9.1 7.2 9.1 6c0-1.6 1.3-2.8 2.9-2.8z"/><path d="M12 13.8v7"/><path d="M8.6 13.8c2.2.3 4.6.2 6.8 0"/>',
    notes: '<path d="M5 4.5c2.5-.4 5.6-.2 7 1.4 1.4-1.6 4.5-1.8 7-1.4v14c-2.5-.4-5.6-.2-7 1.4-1.4-1.6-4.5-1.8-7-1.4z"/><path d="M12 5.9v14"/>',
    exams: '<path d="M6 3.8h9l3 3v13.4H6z"/><path d="M9 10.5l1.6 1.6 3.2-3.4"/><path d="M9 16h6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.4M12 18.1v2.4M3.5 12h2.4M18.1 12h2.4M6 6l1.7 1.7M16.3 16.3 18 18M6 18l1.7-1.7M16.3 7.7 18 6"/>'
  };
  function icon(k, c) { return '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="' + (c || '#355A3A') + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>'; }
  var NL_SUB = [
    ['board', 'บอร์ดประกาศ', 'ประกาศเรื่อง NL และ Compre — ใครเข้าสู่ระบบก็มาแปะได้ แยกดูตามเรื่อง', '#A44A2A'],
    ['notes', 'สรุปเนื้อหา', 'เลคเชอร์ สรุป และ resource จากทั้งจุฬาฯ และศิริราช — บอกที่มาทุกเรื่อง', '#355A3A'],
    ['exams', 'ข้อสอบ', 'NL1 · NL2 · Compre 1 · Compre 2 · Compre 3', '#C9952E'],
    ['settings', 'ตั้งค่า', 'วันสอบ รูปแบบ จำนวน และเวลาสอบของแต่ละการสอบ', '#4A5560']
  ];
  function nlHead(cur, h1, lede) {
    var me = NL_SUB.filter(function (x) { return x[0] === cur; })[0];
    var tabs = NL_SUB.map(function (x) { return '<a class="chip' + (x[0] === cur ? ' on" aria-current="page' : '') + '" href="#/nl/' + x[0] + '">' + x[1] + '</a>'; }).join('');
    return '<section class="wrap phead" style="padding-bottom:20px"><div style="display:flex;flex-direction:column;gap:14px;min-width:0">' +
      (me ? '<nav aria-label="ตำแหน่ง" style="font-size:15px"><a href="#/nl">ติว NL &amp; Compre</a><span class="muted"> › </span><span>' + me[1] + '</span></nav>' : '<span class="label">07 · ยอดเขา</span>') +
      '<h1 style="font-size:clamp(38px,5vw,64px)">' + h1 + '</h1>' + (lede ? '<p class="lede">' + lede + '</p>' : '') +
      (me ? '<div class="subtabs" aria-label="หน้าย่อย">' + tabs + '</div>' : '') + '</div></section>';
  }

  PAGES.nl = function (r) {
    var a = r.args[0];
    if (a === 'board') return nlBoard(r);
    if (a === 'notes') return nlNotes(r);
    if (a === 'exams') return nlExams();
    if (a === 'settings') return nlSettings();
    remember({ href: '#/nl', title: 'ติว NL & Compre', crumb: 'ยอดเขา', c: '#4A5560' });
    var cards = NL_SUB.map(function (x, i) {
      return '<a class="sheet plot" href="#/nl/' + x[0] + '"><div class="tape" style="transform:rotate(' + [-2, 2.5, -1.5, 1][i] + 'deg)"></div>' + icon(x[0], x[3]) +
        '<h3>' + x[1] + '</h3><p class="muted">' + x[2] + '</p><div class="foot"><span></span><span class="k" style="font-size:20px" aria-hidden="true">→</span></div></a>';
    }).join('');
    var dest = nlSet().map(function (x) {
      var p = nextPart(x), all = x.parts.filter(function (q) { return q.date; });
      var sub = p ? thDate(p.date) + ' · ' + daysText(p.date) : all.length ? 'ผ่านไปแล้ว' : 'ยังไม่ได้ใส่วันสอบ';
      return '<div class="sheet dest"><span class="label">' + KIND[x.kind] + '</span><span class="k" style="font-size:22px">' + esc(x.name) + '</span><span class="muted" style="font-size:15px">' + esc(sub) + '</span>' +
        (x.parts.length ? '<span class="types">' + x.parts.map(function (q) { return '<span class="pill">' + q.type + '</span>'; }).join('') + '</span>' : '') + '</div>';
    }).join('');
    return {
      title: 'ติว NL & Compre', html: nlHead('', 'ติว NL &amp; Compre', 'รวมของสำหรับสอบใบประกอบ (NL) และ Comprehensive — เนื้อหาจากทั้งจุฬาฯ และศิริราช บอกที่มาทุกเรื่อง') +
        '<section class="wrap" style="padding-bottom:56px"><div class="plots four">' + cards + '</div></section>' +
        '<section class="band" style="padding:48px 0 56px"><div class="wrap" style="display:flex;flex-direction:column;gap:24px">' +
        '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:12px 32px"><div style="display:flex;flex-direction:column;gap:8px"><span class="label">ปลายทาง</span><h2 style="font-size:32px">นับวันถึงสนามสอบ</h2></div><a class="chip" href="#/nl/settings">แก้วันสอบในตั้งค่า</a></div>' +
        '<div class="dests">' + dest + '</div></div></section>'
    };
  };

  /* ---------- ตั้งค่า ---------- */
  function nlSettings() {
    var list = nlSet();
    var html = list.map(function (x) {
      var on = {}; x.parts.forEach(function (p) { on[p.type] = p; });
      var types = NL_TYPES.map(function (t) {
        return '<label class="opt"><input type="checkbox" data-t="' + t + '"' + (on[t] ? ' checked' : '') + '><span>' + t + '</span></label>';
      }).join('');
      var rows = x.parts.map(function (p) {
        var f = function (k, lab, type, attrs) { return '<label class="pf"><span class="label">' + lab + '</span><input class="field" type="' + type + '" data-k="' + k + '" value="' + esc(p[k]) + '"' + (attrs || '') + '></label>'; };
        return '<div class="prow" data-t="' + p.type + '"><span class="k ptype">' + p.type + '</span>' +
          '<label class="pf"><span class="label">วันสอบ</span><input class="field" type="date" data-k="date" value="' + esc(p.date) + '"><span class="note" data-days' + (p.date ? '' : ' hidden') + '>' + (p.date ? daysText(p.date) : '') + '</span></label>' +
          f('time', 'เวลาเริ่ม', 'time') +
          f('n', p.type === 'OSCE' ? 'จำนวนสถานี' : 'จำนวนข้อ', 'number', ' min="0" inputmode="numeric"') +
          f('min', 'เวลาสอบ (นาที)', 'number', ' min="0" inputmode="numeric"') + '</div>';
      }).join('');
      return '<fieldset class="sheet xset" data-x="' + x.id + '"><legend class="sr">' + esc(x.name) + '</legend>' +
        '<div class="xhead"><span class="label">' + KIND[x.kind] + '</span><h2 class="k" style="font-size:26px">' + esc(x.name) + '</h2></div>' +
        '<div><span class="label" style="display:block;margin-bottom:8px">รูปแบบที่มีสอบ</span><div class="types">' + types + '</div></div>' +
        (rows || '<p class="note">เลือกรูปแบบที่การสอบนี้มี แล้วใส่วันสอบ จำนวน และเวลา</p>') + '</fieldset>';
    }).join('');
    return {
      title: 'ตั้งค่า — ติว NL & Compre', html: nlHead('settings', 'ตั้งค่าการสอบ', 'ใส่วันสอบ รูปแบบ จำนวน และเวลาสอบของแต่ละการสอบ — บันทึกให้อัตโนมัติ และซิงก์เข้าบัญชีถ้าเข้าสู่ระบบ') +
        '<section class="wrap" style="padding-bottom:80px"><form id="nlset" class="nlset" onsubmit="return false">' + html + '</form></section>',
      after: function () {
        var form = document.getElementById('nlset'), t = null;
        function find(el) { var fs = el.closest('[data-x]'); return fs ? list.filter(function (x) { return x.id === fs.getAttribute('data-x'); })[0] : null; }
        form.addEventListener('change', function (e) {
          var cb = e.target.closest('input[data-t]'); if (!cb) return;
          var x = find(cb), ty = cb.getAttribute('data-t'); if (!x) return;
          if (cb.checked) { x.parts.push({ type: ty, date: '', time: '', n: '', min: '' }); x.parts.sort(function (a, b) { return NL_TYPES.indexOf(a.type) - NL_TYPES.indexOf(b.type); }); }
          else {
            var p = x.parts.filter(function (q) { return q.type === ty; })[0];
            if (p && (p.date || p.time || p.n || p.min) && !confirm('ลบรายละเอียด ' + ty + ' ของ ' + x.name + '?')) { cb.checked = true; return; }
            x.parts = x.parts.filter(function (q) { return q.type !== ty; });
          }
          clearTimeout(t); nlSave(list); render(true);
          var again = document.querySelector('[data-x="' + x.id + '"] input[data-t="' + ty + '"]'); if (again) again.focus();
        });
        form.addEventListener('input', function (e) {
          var inp = e.target.closest('input[data-k]'); if (!inp) return;
          var x = find(inp), row = inp.closest('[data-t]'); if (!x || !row) return;
          var p = x.parts.filter(function (q) { return q.type === row.getAttribute('data-t'); })[0]; if (!p) return;
          var k = inp.getAttribute('data-k'), v = inp.value.trim();
          if ((k === 'n' || k === 'min') && v) v = String(Math.max(0, Math.round(+v) || 0));
          p[k] = v;
          if (k === 'date') { var dd = row.querySelector('[data-days]'); if (dd) { dd.textContent = v ? daysText(v) : ''; dd.hidden = !v; } }
          clearTimeout(t); t = setTimeout(function () { nlSave(list); }, 400);
        });
        pageCleanup = function () { if (t) { clearTimeout(t); nlSave(list); } };
      }
    };
  }

  /* ---------- ข้อสอบ ---------- */
  function nlExams() {
    var cards = nlSet().map(function (x) {
      return '<div class="sheet xcard"><div class="xhead"><span class="label">' + KIND[x.kind] + '</span><h2 class="k" style="font-size:28px">' + esc(x.name) + '</h2></div>' +
        (x.parts.length ? '<div style="display:flex;flex-direction:column;gap:6px">' + x.parts.map(function (p) { return '<div>' + partLine(p) + '</div>'; }).join('') + '</div>'
          : '<p class="muted">ยังไม่ได้ตั้งรูปแบบ — <a href="#/nl/settings">ไปที่ตั้งค่า</a></p>') +
        '<p class="note" style="border-top:1px dashed var(--rule);padding-top:12px">' + (x.kind === 'compre'
          ? 'ข้อสอบเก่าแยกตามสถาบัน <span class="src mdcu">จุฬาฯ</span> <span class="src si">ศิริราช</span>'
          : 'ข้อสอบเก่ารวมจากทั้งสองฝั่ง กำกับที่มาทุกข้อ <span class="src mdcu">จุฬาฯ</span> <span class="src si">ศิริราช</span>') + '</p>' +
        '<span class="note">หน้าหลักของการสอบนี้ — ยังไม่เปิด</span></div>';
    }).join('');
    return {
      title: 'ข้อสอบ — ติว NL & Compre', html: nlHead('exams', 'ข้อสอบ', 'แต่ละการสอบจะมีหน้าหลักของตัวเอง (MCQ · MEQ · OSCE ตามที่การสอบนั้นมี) — รูปแบบที่แสดงด้านล่างมาจากหน้าตั้งค่า') +
        '<section class="wrap" style="padding-bottom:80px"><div class="xcards">' + cards + '</div></section>'
    };
  }

  /* ---------- สรุปเนื้อหา ---------- */
  function nlNotes(r) {
    var notes = NLD.notes || [], id = r.args[1];
    var note = id && notes.filter(function (n) { return n.id === id; })[0];
    if (note) {
      remember({ href: '#/nl/notes/' + encodeURIComponent(note.id), title: note.title, crumb: 'ติว NL & Compre › สรุปเนื้อหา', c: '#4A5560' });
      return {
        title: note.title, html: nlHead('notes', esc(note.title), '') +
          '<section class="wrap" style="padding-bottom:80px"><article class="sheet doc"><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">' + srcBadges(note.src) +
          (note.exams || []).map(function (k) { return '<span class="pill">' + (KIND[k] || esc(k)) + '</span>'; }).join('') +
          (note.topic ? '<span class="muted" style="font-size:14px">' + esc(note.topic) + '</span>' : '') + '</div>' +
          '<div class="val">' + (note.html || '') + '</div>' +
          ((note.files && note.files.length) || note.updated ? '<p class="note" style="border-top:1px dashed var(--rule);padding-top:12px">' + (note.files && note.files.length ? 'ไฟล์ต้นทาง: ' + esc(note.files.join(', ')) : '') + (note.updated ? ' · อัปเดต ' + esc(note.updated) : '') + '</p>' : '') +
          '</article><p style="margin-top:20px"><a class="btn ghost" href="#/nl/notes">กลับไปสรุปทั้งหมด</a></p></section>'
      };
    }
    var fx = r.q.get('x') || '', fs = r.q.get('s') || '';
    var chip = function (k, v, lab, cur) { return '<a class="chip' + (cur === v ? ' on' : '') + '" href="#/nl/notes?' + (k === 'x' ? 'x=' + v + (fs ? '&s=' + fs : '') : (fx ? 'x=' + fx + '&' : '') + 's=' + v) + '">' + lab + '</a>'; };
    var list = notes.filter(function (n) { return (!fx || (n.exams || []).indexOf(fx) >= 0) && (!fs || (n.src || []).indexOf(fs) >= 0); });
    var groups = {}, order = [];
    list.forEach(function (n) { var g = n.topic || 'อื่น ๆ'; if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(n); });
    var body = !notes.length
      ? '<div class="empty"><p class="k" style="font-size:22px">ยังไม่มีสรุป</p><p class="muted" style="max-width:560px;margin:8px auto 0">ส่งเลคเชอร์ สรุป resource หรือข้อสอบเก่ามาในแชทกับ Claude พร้อมบอกว่ามาจากจุฬาฯ หรือศิริราช แล้วสรุปจะขึ้นที่นี่ ทุกเรื่องกำกับที่มา <span class="src mdcu">จุฬาฯ</span> <span class="src si">ศิริราช</span></p></div>'
      : !list.length ? '<div class="empty"><p class="muted">ไม่มีสรุปที่ตรงกับตัวกรอง</p></div>'
        : order.map(function (g) {
          return '<div class="grp-h label">' + esc(g) + '</div>' + groups[g].map(function (n) {
            return '<a class="row" href="#/nl/notes/' + encodeURIComponent(n.id) + '"><span class="k" style="flex:1;min-width:0;font-size:18px;font-weight:500">' + esc(n.title) + '</span><span style="display:inline-flex;gap:6px;flex-wrap:wrap">' + srcBadges(n.src) + '</span></a>';
          }).join('');
        }).join('');
    return {
      title: 'สรุปเนื้อหา — ติว NL & Compre', html: nlHead('notes', 'สรุปเนื้อหา', 'เนื้อหาจากทั้งจุฬาฯ และศิริราช ไม่มีฝั่งไหนเป็นหลัก — Compre ใช้เนื้อหาเดียวกับ NL') +
        '<section class="wrap" style="padding-bottom:80px;display:flex;flex-direction:column;gap:20px">' +
        (notes.length ? '<div class="filters"><span class="label">การสอบ</span>' + chip('x', '', 'ทั้งหมด', fx) + chip('x', 'nl', 'NL', fx) + chip('x', 'compre', 'Compre', fx) +
          '<span class="label" style="margin-left:12px">ที่มา</span>' + chip('s', '', 'ทั้งหมด', fs) + chip('s', 'MDCU', 'จุฬาฯ', fs) + chip('s', 'SI', 'ศิริราช', fs) + '</div>' : '') +
        '<div>' + body + '</div></section>'
    };
  }

  /* ---------- บอร์ดประกาศ (Firestore — ทุกคนอ่านได้, เข้าสู่ระบบแล้วโพสต์ได้, แก้/ลบได้เฉพาะของตัวเอง) ---------- */
  var BTAG = { nl: 'NL', compre: 'Compre', both: 'NL + Compre' };
  var BOARD = { list: null, err: '', f: '', editing: null, dirty: false };
  function boardCol() { return FB.fs.collection(FB.db, (C.nl && C.nl.board) || 'poymor_board'); }
  function pubName(u) {
    if (!u) return '';
    if (u.displayName) return u.displayName;
    var dom = C.userDomain || '', e = u.email || '';
    return dom && e.slice(-dom.length) === dom ? e.slice(0, -dom.length) : (e.split('@')[0] || '');
  }
  function linkify(t) {
    return esc(t).replace(/https?:\/\/[^\s<]+/g, function (u) {
      var tail = (u.match(/[).,;:!?]+$/) || [''])[0]; u = u.slice(0, u.length - tail.length);
      return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>' + tail;
    });
  }
  function boardText(v) {
    var out = '', ul = false;
    String(v || '').split(/\r?\n/).forEach(function (l) {
      l = l.trim(); if (!l) { if (ul) { out += '</ul>'; ul = false; } return; }
      var m = l.match(/^[-•*·]\s+(.*)$/);
      if (m) { if (!ul) { out += '<ul>'; ul = true; } out += '<li>' + linkify(m[1]) + '</li>'; }
      else { if (ul) { out += '</ul>'; ul = false; } out += '<p>' + linkify(l) + '</p>'; }
    });
    return out + (ul ? '</ul>' : '');
  }
  function pDate(x) { return x && x.toDate ? x.toDate() : x ? new Date(x) : null; }
  function boardErr(e) {
    return e && e.code === 'permission-denied' ? 'บอร์ดยังเปิดไม่ได้ — Firestore ยังไม่อนุญาต (ต้องเพิ่ม rules ของ poymor_board)' : errMsg(e);
  }
  function tagRadios(name, cur) {
    return Object.keys(BTAG).map(function (k) { return '<label class="opt"><input type="radio" name="' + name + '" value="' + k + '"' + (cur === k ? ' checked' : '') + '><span>' + BTAG[k] + '</span></label>'; }).join('');
  }
  function boardFilters() {
    var L = BOARD.list || [], n = function (f) { return L.filter(function (p) { return !f || p.tag === f || p.tag === 'both'; }).length; };
    return [['', 'ทั้งหมด'], ['nl', 'NL'], ['compre', 'Compre']].map(function (x) {
      return '<button class="chip' + (BOARD.f === x[0] ? ' on' : '') + '" type="button" data-bf="' + x[0] + '" aria-pressed="' + (BOARD.f === x[0]) + '">' + x[1] + (BOARD.list ? ' <span style="opacity:.7">' + n(x[0]) + '</span>' : '') + '</button>';
    }).join('');
  }
  function noteHTML(p, i) {
    var mine = FB && FB.user && FB.user.uid === p.uid, at = pDate(p.at), ed = pDate(p.ed);
    var rot = [-.8, .6, -.4, .9, -.6, .3][i % 6];
    return '<article class="sheet bnote" data-id="' + esc(p.id) + '" style="transform:rotate(' + rot + 'deg)">' +
      '<svg class="pin" width="22" height="28" viewBox="0 0 22 28" aria-hidden="true"><circle cx="11" cy="9" r="7" fill="' + (p.tag === 'compre' ? '#A44A2A' : p.tag === 'nl' ? '#355A3A' : '#C9952E') + '"/><circle cx="9" cy="7" r="2" fill="#fff" opacity=".45"/><path d="M11 16v10" stroke="#5A6258" stroke-width="1.4" stroke-linecap="round"/></svg>' +
      '<span class="btag ' + esc(p.tag) + '">' + (BTAG[p.tag] || '') + '</span>' +
      '<h3>' + esc(p.title) + '</h3>' + (p.body ? '<div class="val">' + boardText(p.body) + '</div>' : '') +
      '<div class="bfoot"><span class="muted">' + esc(p.name || 'ไม่ระบุชื่อ') + (at ? ' · ' + esc(fmtTime(at)) : '') + (ed ? ' · แก้ไขแล้ว' : '') + '</span>' +
      (mine ? '<span style="display:inline-flex;gap:6px"><button class="chip" type="button" data-be="' + esc(p.id) + '">แก้ไข</button><button class="chip" type="button" data-bd="' + esc(p.id) + '">ลบ</button></span>' : '') + '</div></article>';
  }
  function boardListHTML() {
    if (BOARD.err) return '<p class="warn">' + esc(BOARD.err) + '</p>';
    if (!BOARD.list) return '<p class="muted"><span class="spin" aria-hidden="true"></span> กำลังโหลดประกาศ…</p>';
    var f = BOARD.f, list = BOARD.list.filter(function (p) { return !f || p.tag === f || p.tag === 'both'; });
    if (!list.length) return '<div class="empty"><p class="k" style="font-size:20px">ยังไม่มีประกาศ' + (f ? 'เรื่อง ' + BTAG[f] : '') + '</p><p class="muted">ประกาศแรกแปะได้จากกล่องด้านบน</p></div>';
    return '<div class="bnotes">' + list.map(noteHTML).join('') + '</div>';
  }
  function paintBoard() {
    if (BOARD.editing) { BOARD.dirty = true; return; }
    var a = document.getElementById('bList'), b = document.getElementById('bFil');
    if (a) a.innerHTML = boardListHTML();
    if (b) b.innerHTML = boardFilters();
  }
  function bDraft(v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem('poy-bdraft') || '{}'); sessionStorage.setItem('poy-bdraft', JSON.stringify(v)); } catch (e) { return {}; } }
  function nlBoard(r) {
    BOARD.f = r.q.get('f') || ''; if (!BTAG[BOARD.f] || BOARD.f === 'both') BOARD.f = '';
    BOARD.editing = null; BOARD.dirty = false;
    var form;
    if (!fbOn() || fbFail) form = '<div class="sheet bform"><p class="muted">' + (fbOn() ? 'เชื่อมต่อระบบบัญชีไม่ได้ — ตรวจอินเทอร์เน็ตแล้วรีเฟรชหน้า' : 'ยังไม่ได้ตั้งค่า Firebase') + '</p></div>';
    else if (!FB) form = '<div class="sheet bform"><p class="muted"><span class="spin" aria-hidden="true"></span> กำลังเชื่อมต่อ…</p></div>';
    else if (!FB.user) form = '<div class="sheet bform"><span class="k" style="font-size:20px">อยากแปะประกาศ?</span><p class="muted">ทุกคนอ่านบอร์ดได้ — เข้าสู่ระบบก่อนถึงจะแปะประกาศได้ (บัญชีเดียวกับคลังข้อสอบเก่า)</p><a class="btn" href="#/account" style="align-self:flex-start">เข้าสู่ระบบ</a></div>';
    else {
      var d = bDraft(), nm = LS.get('bname', '') || pubName(FB.user);
      form = '<form class="sheet bform" id="bForm" autocomplete="off"><span class="k" style="font-size:20px">แปะประกาศใหม่</span>' +
        '<fieldset><legend class="label" style="margin-bottom:8px">เรื่องของ</legend><div class="types">' + tagRadios('btag', d.tag || 'nl') + '</div></fieldset>' +
        '<label class="sr" for="bTitle">หัวข้อ</label><input class="field" id="bTitle" maxlength="120" placeholder="หัวข้อประกาศ" value="' + esc(d.title || '') + '">' +
        '<label class="sr" for="bBody">รายละเอียด</label><textarea class="field" id="bBody" maxlength="4000" rows="5" placeholder="รายละเอียด — ขึ้นบรรทัดด้วย &quot;- &quot; เป็น bullet · ใส่ลิงก์ได้">' + esc(d.body || '') + '</textarea>' +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><label class="sr" for="bName">ชื่อที่แสดง</label><input class="field" id="bName" maxlength="40" placeholder="ชื่อที่แสดง" value="' + esc(nm) + '" style="flex:1 1 200px;width:auto">' +
        '<button class="btn" type="submit" id="bPost">แปะประกาศ</button></div><p class="warn" id="bErr" hidden></p></form>';
    }
    return {
      title: 'บอร์ดประกาศ — ติว NL & Compre', html: nlHead('board', 'บอร์ดประกาศ', 'ประกาศเรื่อง NL และ Compre — ใครเข้าสู่ระบบก็มาแปะได้ ประกาศที่ติดทั้งสองเรื่องจะขึ้นในทั้งสองหมวด') +
        '<section class="wrap" style="padding-bottom:80px;display:flex;flex-direction:column;gap:28px">' + form +
        '<div style="display:flex;flex-direction:column;gap:18px"><div class="filters" id="bFil" role="group" aria-label="แยกตามเรื่อง">' + boardFilters() + '</div><div id="bList" aria-live="polite">' + boardListHTML() + '</div></div></section>',
      after: function () {
        var el = function (id) { return document.getElementById(id); };
        if (FB) {
          BOARD.err = '';
          var q = FB.fs.query(boardCol(), FB.fs.orderBy('at', 'desc'), FB.fs.limit(300));
          var un = FB.fs.onSnapshot(q, function (snap) {
            BOARD.list = snap.docs.map(function (dc) { var v = dc.data({ serverTimestamps: 'estimate' }); v.id = dc.id; return v; });
            BOARD.err = ''; paintBoard();
          }, function (e) { console.warn(e); BOARD.err = boardErr(e); paintBoard(); });
          pageCleanup = function () { un(); BOARD.editing = null; };
        }
        var f = el('bForm');
        if (f) {
          var save = function () { var c = f.querySelector('input[name=btag]:checked'); bDraft({ tag: c ? c.value : 'nl', title: el('bTitle').value, body: el('bBody').value }); };
          f.addEventListener('input', save); f.addEventListener('change', save);
          el('bName').addEventListener('change', function () { LS.set('bname', this.value.trim()); });
          f.addEventListener('submit', function (e) {
            e.preventDefault();
            var c = f.querySelector('input[name=btag]:checked'), title = el('bTitle').value.trim(), body = el('bBody').value.trim(), name = el('bName').value.trim() || pubName(FB.user) || 'ไม่ระบุชื่อ';
            var er = el('bErr'); er.hidden = true;
            if (!title) { er.textContent = 'ใส่หัวข้อก่อน'; er.hidden = false; el('bTitle').focus(); return; }
            var btn = el('bPost'); btn.disabled = true;
            FB.fs.addDoc(boardCol(), { uid: FB.user.uid, name: name.slice(0, 40), tag: c ? c.value : 'nl', title: title.slice(0, 120), body: body.slice(0, 4000), at: FB.fs.serverTimestamp() })
              .then(function () { bDraft({}); el('bTitle').value = ''; el('bBody').value = ''; toast('แปะประกาศแล้ว'); })
              .catch(function (x) { er.textContent = boardErr(x); er.hidden = false; })
              .then(function () { btn.disabled = false; });
          });
        }
        el('bFil').addEventListener('click', function (e) {
          var b = e.target.closest('[data-bf]'); if (!b) return;
          BOARD.f = b.getAttribute('data-bf'); setQuery(route(), { f: BOARD.f }); paintBoard();
        });
        el('bList').addEventListener('click', function (e) {
          var del = e.target.closest('[data-bd]'), edt = e.target.closest('[data-be]');
          if (del) {
            if (!confirm('ลบประกาศนี้?')) return;
            FB.fs.deleteDoc(FB.fs.doc(boardCol(), del.getAttribute('data-bd'))).then(function () { toast('ลบแล้ว'); }).catch(function (x) { toast(boardErr(x)); });
          } else if (edt) {
            var id = edt.getAttribute('data-be'), p = (BOARD.list || []).filter(function (x) { return x.id === id; })[0], art = edt.closest('.bnote');
            if (!p || !art) return;
            BOARD.editing = id; art.style.transform = 'none';
            art.innerHTML = '<form class="bform" data-ef style="padding:0;border:0;background:none"><span class="k" style="font-size:18px">แก้ไขประกาศ</span><div class="types">' + tagRadios('etag-' + id, p.tag) + '</div>' +
              '<input class="field" data-ek="title" maxlength="120" value="' + esc(p.title) + '" aria-label="หัวข้อ"><textarea class="field" data-ek="body" maxlength="4000" rows="5" aria-label="รายละเอียด">' + esc(p.body || '') + '</textarea>' +
              '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="submit">บันทึก</button><button class="btn ghost" type="button" data-ec>ยกเลิก</button></div></form>';
            var ef = art.querySelector('form'); ef.querySelector('[data-ek=title]').focus();
            var done = function () { BOARD.editing = null; if (BOARD.dirty) BOARD.dirty = false; paintBoard(); };
            ef.querySelector('[data-ec]').addEventListener('click', done);
            ef.addEventListener('submit', function (ev) {
              ev.preventDefault();
              var t = ef.querySelector('[data-ek=title]').value.trim(), bd = ef.querySelector('[data-ek=body]').value.trim(), c = ef.querySelector('input[type=radio]:checked');
              if (!t) { ef.querySelector('[data-ek=title]').focus(); return; }
              FB.fs.updateDoc(FB.fs.doc(boardCol(), id), { tag: c ? c.value : p.tag, title: t.slice(0, 120), body: bd.slice(0, 4000), ed: FB.fs.serverTimestamp() })
                .then(function () { toast('บันทึกแล้ว'); done(); }).catch(function (x) { toast(boardErr(x)); });
            });
          }
        });
      }
    };
  }

  /* =========================================================
     Random Topic Summary
     #/topics · #/topics/<id>[/sum[/<หน้า>]] · #/topics/<id>/practice?m=ai|test|flash
     ========================================================= */
  var TOPICS = window.POY_TOPICS || [];
  var TD = {};               /* id → { data, st, ...L (กำลังโหลด), ...E (ผิดพลาด) } */
  var PAGE_R = 1191.12 / 841.92, IMG_W = 2813;
  function topicById(id) { return TOPICS.filter(function (t) { return t.id === id; })[0]; }
  function p2(n) { return ('0' + n).slice(-2); }
  function tImg(t, n) { return t.dir + 'p' + p2(n) + '.webp?v=' + (t.v || 1); }
  function tLoad(t, what) {
    var s = TD[t.id] || (TD[t.id] = {});
    if (s[what] || s[what + 'L'] || s[what + 'E']) return s[what] || null;
    s[what + 'L'] = true;
    fetch(t.dir + (what === 'data' ? 'data.json' : 'selftest.json') + '?v=' + (t.v || 1)).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
    }).then(function (j) { s[what] = j; }).catch(function (e) { s[what + 'E'] = e.message || String(e); }).then(function () {
      s[what + 'L'] = false;
      var r = route(); if (r.name === 'topics' && r.args[0] === t.id) render(true);
    });
    return null;
  }
  /* หน่วยเนื้อหา = กล่องในหน้า (หรือทั้งคอลัมน์ ถ้าคอลัมน์นั้นไม่มีกล่องย่อย) */
  function tUnits(d) {
    var out = [];
    d.pages.forEach(function (p) {
      p.cols.forEach(function (c, ci) {
        if (c.boxes.length) c.boxes.forEach(function (b, bi) { out.push({ key: p.n + '-' + ci + '-' + bi, p: p.n, pt: p.t, head: c.h, title: b.t || c.h || ('คอลัมน์ ' + (ci + 1)), text: b.x, bb: b.bb }); });
        else out.push({ key: p.n + '-' + ci, p: p.n, pt: p.t, head: c.h, title: c.h || ('คอลัมน์ ' + (ci + 1)), text: c.x || '', bb: c.bb });
      });
    });
    return out;
  }
  function tUnitsCached(t, d) { var s = TD[t.id]; if (!s.units) s.units = tUnits(d); return s.units; }
  function uLink(t, u) { return '#/topics/' + t.id + '/sum/' + u.p + '?to=u' + u.key; }
  function groupOf(d, n) { return d.groups.filter(function (g) { return g.pages.indexOf(n) >= 0; })[0]; }
  /* ภาพตัดเฉพาะกล่อง (ใช้ภาพหน้าเดียวกัน แค่เลื่อนกรอบ) */
  function cropHTML(t, u) {
    var bb = u.bb, w = Math.round(bb[2] * IMG_W), h = Math.round(bb[3] * IMG_W / PAGE_R);
    return '<figure class="crop" id="u' + u.key + '"><button type="button" class="cimg" data-zoom="' + u.p + '" data-bb="' + bb.join(',') + '" style="max-width:' + Math.round(w * 1.15) + 'px;min-width:' + Math.round(w * 0.6) + 'px" aria-label="ขยายภาพ: ' + esc(u.title) + '">' +
      '<img src="' + t.dir + 'c/' + u.key + '.webp?v=' + (t.v || 1) + '" width="' + w + '" height="' + h + '" alt="" loading="lazy" decoding="async"></button></figure>';
  }
  /* ดูภาพเต็ม ซูมได้ */
  function openZoom(t, n, bb) {
    var back = document.activeElement, o = document.createElement('div');
    o.className = 'zoom'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'ภาพหน้า ' + n);
    o.innerHTML = '<div class="zbar"><span class="k">หน้า ' + n + ' / ' + t.pages + '</span><span style="flex:1"></span>' +
      '<button class="chip" type="button" data-z="-" aria-label="ย่อ">−</button><button class="chip" type="button" data-z="+" aria-label="ขยาย">+</button><button class="chip" type="button" data-z="x">ปิด</button></div>' +
      '<div class="zsc"><img src="' + tImg(t, n) + '" alt="หน้า ' + n + ' ของสรุป ' + esc(t.title) + '"></div>';
    document.body.appendChild(o); document.body.classList.add('zopen');
    var sc = o.querySelector('.zsc'), img = o.querySelector('img');
    var w = Math.round(Math.min(IMG_W, Math.max(1900, window.innerWidth * 1.6)));
    function setW(nw) {
      var cx = (sc.scrollLeft + sc.clientWidth / 2) / w, cy = (sc.scrollTop + sc.clientHeight / 2) / (w / PAGE_R);
      w = Math.round(Math.max(sc.clientWidth, Math.min(IMG_W * 1.6, nw))); img.style.width = w + 'px'; img.style.height = Math.round(w / PAGE_R) + 'px';
      sc.scrollLeft = cx * w - sc.clientWidth / 2; sc.scrollTop = cy * (w / PAGE_R) - sc.clientHeight / 2;
    }
    img.style.width = w + 'px'; img.style.height = Math.round(w / PAGE_R) + 'px';
    if (bb) { sc.scrollLeft = bb[0] * w - 12; sc.scrollTop = bb[1] * (w / PAGE_R) - 12; }
    function close() { o.remove(); document.body.classList.remove('zopen'); document.removeEventListener('keydown', key); if (back && back.focus) back.focus(); }
    function key(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', key);
    o.querySelector('.zbar').addEventListener('click', function (e) {
      var b = e.target.closest('[data-z]'); if (!b) return;
      var z = b.getAttribute('data-z'); if (z === 'x') close(); else setW(w * (z === '+' ? 1.3 : 1 / 1.3));
    });
    o.querySelector('[data-z="x"]').focus();
  }
  function bindZoom(t, root) {
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-zoom]'); if (!b) return;
      var bb = (b.getAttribute('data-bb') || '').split(',').map(Number);
      openZoom(t, +b.getAttribute('data-zoom'), bb.length === 4 ? bb : null);
    });
  }

  function topicHead(t, cur, extra) {
    var tabs = [['sum', 'สรุป'], ['practice', 'ฝึก']].map(function (x) {
      return '<a class="chip' + (x[0] === cur ? ' on" aria-current="page' : '') + '" href="#/topics/' + t.id + '/' + x[0] + '">' + x[1] + '</a>';
    }).join('');
    return '<section class="wrap phead" style="padding-bottom:20px"><div style="display:flex;flex-direction:column;gap:14px;min-width:0">' +
      '<nav aria-label="ตำแหน่ง" style="font-size:15px"><a href="#/topics">Random Topic Summary</a><span class="muted"> › </span><span>' + esc(t.title) + '</span></nav>' +
      '<h1 style="font-size:clamp(38px,5vw,64px)">' + esc(t.title) + '</h1>' +
      '<p class="lede">' + esc(t.th) + ' · <span class="muted">' + esc(t.source) + '</span></p>' +
      '<div class="subtabs" aria-label="ส่วนของหัวข้อ">' + tabs + (extra || '') + '</div></div></section>';
  }
  function loadingHTML(s, what) {
    return s && s[what + 'E'] ? '<p class="warn">โหลดข้อมูลไม่สำเร็จ: ' + esc(s[what + 'E']) + ' — ลองรีเฟรชหน้า</p>' : '<p class="muted"><span class="spin" aria-hidden="true"></span> กำลังเปิดหัวข้อ…</p>';
  }

  PAGES.topics = function (r) {
    var t = topicById(r.args[0]);
    if (!r.args[0] || !t) return topicsHub();
    if (r.args[1] === 'practice') return topicPractice(t, r);
    return topicSummary(t, r);
  };

  function topicsHub() {
    remember({ href: '#/topics', title: 'Random Topic Summary', crumb: 'เมล็ดพันธุ์', c: '#2F7466' });
    var cards = TOPICS.map(function (t, i) {
      return '<div class="sheet plot tcard"><div class="tape" style="transform:rotate(' + [-2, 2, -1.5][i % 3] + 'deg)"></div>' + brush(t.c) +
        '<span class="label">' + t.pages + ' หน้า · เพิ่มเมื่อ ' + esc(t.added) + '</span><h3>' + esc(t.title) + '</h3><p class="muted">' + esc(t.th) + '</p>' +
        '<p class="note">' + esc(t.source) + '</p>' +
        '<div class="foot" style="gap:10px;justify-content:flex-start"><a class="btn" href="#/topics/' + t.id + '/sum">อ่านสรุป</a><a class="btn ghost" href="#/topics/' + t.id + '/practice">ฝึกโจทย์</a></div></div>';
    }).join('') +
      '<div class="plot soon" style="justify-content:center"><span class="label">หัวข้อถัดไป</span><h3 style="font-size:22px">+ เพิ่มหัวข้อ</h3><p class="muted">ส่งไฟล์สรุปมาในแชทกับ Claude พร้อมบอกชื่อหัวข้อ แล้วจะขึ้นเป็นการ์ดใหม่ที่นี่ แยกส่วนสรุปกับส่วนฝึก</p></div>';
    return {
      title: 'Random Topic Summary', html:
        '<section class="wrap phead"><div style="flex:1 1 520px;min-width:0;display:flex;flex-direction:column;gap:16px"><span class="label">03 · เมล็ดพันธุ์</span><h1 style="font-size:clamp(40px,5.4vw,72px)">Random Topic Summary</h1>' +
        '<p class="lede">สรุปแยกเป็นเรื่อง ๆ ตามหัวข้อที่เลือกเอง — แต่ละหัวข้อมีส่วนสรุป (แบ่งหัวข้อย่อย) และส่วนฝึก: AI ออกโจทย์ทีละข้อต่อเนื่องจากหัวข้อใหญ่หรือย่อยที่เลือก</p></div></section>' +
        '<section class="wrap" style="padding-bottom:80px"><div class="plots">' + cards + '</div></section>'
    };
  }

  /* ---------- สรุป ---------- */
  function topicSummary(t, r) {
    var s = TD[t.id] || {}, d = tLoad(t, 'data');
    var dl = '<a class="chip" href="' + t.dir + encodeURIComponent(t.pdf) + '" download>ไฟล์ต้นฉบับ (PDF)</a>';
    if (!d) return { title: t.title, html: topicHead(t, 'sum', dl) + '<section class="wrap" style="padding-bottom:80px">' + loadingHTML(TD[t.id], 'data') + '</section>' };
    var n = Math.max(1, Math.min(d.pages.length, +r.args[2] || 1)), p = d.pages[n - 1], g = groupOf(d, n);
    var full = r.q.get('v') === 'page', qq = (r.q.get('q') || '').trim();
    remember({ href: '#/topics/' + t.id + '/sum/' + n, title: t.title + ' · หน้า ' + n, crumb: 'Random Topic Summary › ' + p.t, c: t.c });
    var units = tUnitsCached(t, d), mine = units.filter(function (u) { return u.p === n; });
    var tree = d.groups.map(function (gr) {
      return '<div class="grp">' + esc(gr.t) + '</div>' + gr.pages.map(function (pn) {
        var pp = d.pages[pn - 1], on = pn === n;
        return '<a href="#/topics/' + t.id + '/sum/' + pn + '"' + (on ? ' class="on" aria-current="page"' : '') + '><span class="pn">' + pn + '</span><span>' + esc(pp.t) + '</span></a>' +
          (on && !full ? '<div class="tsub">' + mine.map(function (u) { return '<a href="#/topics/' + t.id + '/sum/' + pn + '?to=u' + u.key + '">' + esc(u.title) + '</a>'; }).join('') + '</div>' : '');
      }).join('');
    }).join('');
    var body;
    if (full) body = '<button type="button" class="cimg fullp" data-zoom="' + n + '" aria-label="ขยายภาพหน้า ' + n + '"><img src="' + tImg(t, n) + '" width="' + IMG_W + '" height="' + Math.round(IMG_W / PAGE_R) + '" alt=""></button><p class="note">แตะที่ภาพเพื่อขยาย</p>';
    else {
      var lastHead = null;
      body = '<div class="crops">' + mine.map(function (u) {
        var h = u.head && u.head !== lastHead && !/^\s*$/.test(u.head) ? '<div class="chead label">' + esc(u.head.replace(/\s*\(ต่อ\)\s*$/, '')) + '</div>' : '';
        lastHead = u.head; return h + cropHTML(t, u);
      }).join('') + '</div>';
    }
    var prev = d.pages[n - 2], next = d.pages[n];
    var nav = '<nav aria-label="หน้าก่อนหน้าและถัดไป" class="pnav">' +
      (prev ? '<a href="#/topics/' + t.id + '/sum/' + (n - 1) + '"><span class="muted" style="font-size:13px">← หน้า ' + (n - 1) + '</span><span class="k" style="font-size:17px;font-weight:500">' + esc(prev.t) + '</span></a>' : '<span></span>') +
      (next ? '<a href="#/topics/' + t.id + '/sum/' + (n + 1) + '" style="align-items:flex-end;text-align:right"><span class="muted" style="font-size:13px">หน้า ' + (n + 1) + ' →</span><span class="k" style="font-size:17px;font-weight:500">' + esc(next.t) + '</span></a>' : '') + '</nav>';
    var hits = '';
    if (qq) {
      var ql = qq.toLowerCase(), hs = units.filter(function (u) { return (u.title + ' ' + u.text).toLowerCase().indexOf(ql) >= 0; });
      hits = '<div class="thits"><span class="label">พบ ' + hs.length + ' ส่วน</span>' + hs.slice(0, 40).map(function (u) { return '<a href="' + uLink(t, u) + '&q=' + encodeURIComponent(qq) + '"><span class="pn">' + u.p + '</span><span>' + esc(u.title) + '</span></a>'; }).join('') + '</div>';
    }
    var pageQ = function (v) { return '#/topics/' + t.id + '/sum/' + n + (v ? '?v=page' : ''); };
    return {
      title: t.title + ' · หน้า ' + n, html: topicHead(t, 'sum', dl) +
        '<section class="band" style="padding:36px 0 80px"><div class="wrap reader" id="treader">' +
        '<details class="ttree" id="ttree" open><summary class="k">หัวข้อย่อย <span class="muted" style="font-weight:400;font-size:14px">· หน้า ' + n + ' / ' + d.pages.length + '</span></summary>' +
        '<form class="search tsearch" id="tsrch" role="search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A6258" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><label class="sr" for="tq">ค้นในหัวข้อนี้</label><input id="tq" type="search" placeholder="ค้นในหัวข้อนี้ เช่น CRAB, PID" value="' + esc(qq) + '"></form>' +
        hits + '<nav class="tree" aria-label="หัวข้อย่อยของ ' + esc(t.title) + '">' + tree + '</nav></details>' +
        '<article class="sheet doc tdoc"><div style="display:flex;flex-direction:column;gap:8px"><span class="muted" style="font-size:14px">' + esc(g ? g.t : '') + ' · หน้า ' + n + ' / ' + d.pages.length + '</span><h2 style="font-size:clamp(24px,3vw,32px)">' + esc(p.t) + '</h2>' +
        '<div class="filters" role="group" aria-label="มุมมอง"><a class="chip' + (full ? '' : ' on') + '" href="' + pageQ(false) + '">อ่านทีละกล่อง</a><a class="chip' + (full ? ' on' : '') + '" href="' + pageQ(true) + '">ทั้งหน้า</a>' +
        '<a class="chip" href="#/topics/' + t.id + '/practice?m=ai&p=' + n + '">ฝึกโจทย์หน้านี้</a></div></div>' + body + nav + '</article></div></section>',
      after: function () {
        if (window.innerWidth < 900) { var tt = document.getElementById('ttree'); if (tt && !qq) tt.open = false; }
        bindZoom(t, document.getElementById('treader'));
        document.getElementById('tsrch').addEventListener('submit', function (e) {
          e.preventDefault(); var v = document.getElementById('tq').value.trim();
          location.hash = '#/topics/' + t.id + '/sum/' + n + (v ? '?q=' + encodeURIComponent(v) : '');
        });
        if (r.q.get('to')) { var el = document.getElementById(r.q.get('to')); if (el) el.classList.add('hl'); }
      }
    };
  }

  /* ---------- ฝึก ---------- */
  function tset(id) { var all = LS.get('topicset', {}) || {}; return all[id] || {}; }
  function tsetSave(id, v) { var all = LS.get('topicset', {}) || {}; all[id] = v; LS.set('topicset', all); }
  function tprog(k, id) { var all = LS.get(k, {}) || {}; return all[id] || {}; }
  function tprogSave(k, id, v) { var all = LS.get(k, {}) || {}; all[id] = v; LS.set(k, all); }

  function topicPractice(t, r) {
    var m = r.q.get('m') || 'ai';
    var modes = [['ai', 'AI ออกโจทย์ทีละข้อ']].concat(t.selftest ? [['test', 'ข้อสอบในสรุป']] : []).concat([['flash', 'Flashcard']]);
    var tabs = '<div class="filters" role="tablist" aria-label="วิธีฝึก" style="margin-bottom:6px">' + modes.map(function (x) {
      return '<a class="chip' + (m === x[0] ? ' on' : '') + '" role="tab" aria-selected="' + (m === x[0]) + '" href="#/topics/' + t.id + '/practice?m=' + x[0] + '">' + x[1] + '</a>';
    }).join('') + '</div>';
    var head = topicHead(t, 'practice');
    if (m === 'flash') return flashPage(t, head, tabs);
    var d = tLoad(t, 'data');
    if (!d) return { title: 'ฝึก — ' + t.title, html: head + '<section class="wrap" style="padding-bottom:80px">' + tabs + loadingHTML(TD[t.id], 'data') + '</section>' };
    if (m === 'test') return selfTestPage(t, d, head, tabs);
    return aiPage(t, d, r, head, tabs);
  }

  function flashPage(t, head, tabs) {
    var sets = t.flash || [];
    var body = sets.map(function (f) {
      if (!f.file) return '<div class="empty" style="text-align:left"><span class="label">' + esc(f.note || '') + '</span><p class="k" style="font-size:22px;margin:6px 0">' + esc(f.title) + '</p>' +
        '<p class="muted" style="max-width:640px">ช่องนี้เตรียมไว้แล้ว — รอไฟล์ flashcard (ส่งไฟล์ .html ของ artifact มาในแชท แล้ว Claude จะใส่ให้เล่นได้ตรงนี้ พร้อมลิงก์ไปหน้า ' + (f.pages || []).join('–') + ' ของสรุป)</p>' +
        ((f.pages || []).length ? '<p style="margin-top:12px"><a class="chip" href="#/topics/' + t.id + '/sum/' + f.pages[0] + '">เปิดสรุปหน้า ' + f.pages.join('–') + '</a></p>' : '') + '</div>';
      return '<div class="sheet" style="padding:0;overflow:hidden"><div style="padding:14px 18px;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;border-bottom:1px solid var(--rule-2)"><span class="k" style="font-size:19px">' + esc(f.title) + '</span><span class="muted" style="font-size:14px">' + esc(f.note || '') + '</span><a class="chip" style="margin-left:auto" href="' + t.dir + f.file + '" target="_blank" rel="noopener">เปิดเต็มจอ ↗</a></div>' +
        '<iframe class="flashf" src="' + t.dir + f.file + '" title="' + esc(f.title) + '" loading="lazy"></iframe></div>';
    }).join('');
    return { title: 'Flashcard — ' + t.title, html: head + '<section class="wrap" style="padding-bottom:80px;display:flex;flex-direction:column;gap:22px">' + tabs + (body || '<div class="empty"><p class="muted">ยังไม่มี flashcard ในหัวข้อนี้</p></div>') + '</section>' };
  }

  /* ----- ข้อสอบในสรุป (ตามไฟล์ — ไม่แก้เนื้อหา แค่ทำให้กดตอบได้) ----- */
  var STS = { order: null, key: '' };
  function selfTestPage(t, d, head, tabs) {
    var st = tLoad(t, 'st');
    if (!st) return { title: 'ข้อสอบในสรุป — ' + t.title, html: head + '<section class="wrap" style="padding-bottom:80px">' + tabs + loadingHTML(TD[t.id], 'st') + '</section>' };
    var pr = tprog('topicst', t.id), ans = pr.a || {}, secs = pr.sec || [], ord = pr.ord || 'seq', flt = pr.f || 'all';
    var L = 'ABCDE';
    function build() {
      var list = st.qs.filter(function (q) {
        if (secs.length && secs.indexOf(q.s) < 0) return false;
        var a = ans[q.n];
        if (flt === 'todo' && a != null) return false;
        if (flt === 'wrong' && !(a != null && L[a] !== q.answer)) return false;
        return true;
      }).map(function (q) { return q.n; });
      if (ord === 'rnd') list = shuffle(list);
      return list;
    }
    var key = [secs.join(','), ord, flt].join('|');
    if (!STS.order || STS.key !== t.id + key) { STS.order = build(); STS.key = t.id + key; STS.i = 0; if (pr.cur && STS.order.indexOf(pr.cur) >= 0 && ord === 'seq') STS.i = STS.order.indexOf(pr.cur); }
    var done = st.qs.filter(function (q) { return ans[q.n] != null; }), ok = done.filter(function (q) { return L[ans[q.n]] === q.answer; }).length;
    var chips = function (attr, list, cur, multi) {
      return list.map(function (x) {
        var on = multi ? cur.indexOf(x[0]) >= 0 : cur === x[0];
        return '<button type="button" class="chip' + (on ? ' on' : '') + '" ' + attr + '="' + x[0] + '" aria-pressed="' + on + '">' + x[1] + '</button>';
      }).join('');
    };
    function qHTML() {
      if (!STS.order.length) return '<div class="empty"><p class="k" style="font-size:20px">ไม่มีข้อที่ตรงกับตัวกรอง</p><p class="muted">ลองเปลี่ยนตัวกรองด้านบน</p></div>';
      var qn = STS.order[STS.i], q = st.qs[qn - 1], a = ans[qn], doneQ = a != null, ai = L.indexOf(q.answer);
      return '<article class="sheet q" data-stq="' + qn + '"><div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 12px"><span class="k" style="font-size:28px">ข้อ ' + qn + '</span><span class="muted" style="font-size:14px">' + (STS.i + 1) + ' / ' + STS.order.length + ' · ' + esc(st.sections[q.s]) + '</span></div>' +
        '<p>' + esc(q.stem) + '</p><div style="display:flex;flex-direction:column;gap:2px">' +
        q.options.map(function (op, j) {
          var cls = doneQ ? (j === ai ? ' ok' : j === a ? ' bad' : '') : '';
          return '<button class="choice' + cls + '" type="button" data-sp="' + j + '"' + (doneQ ? ' disabled' : '') + '><b>' + L[j] + '</b><span>' + esc(op) + '</span></button>';
        }).join('') + '</div>' +
        (doneQ ? '<div class="explain"><p class="k" style="font-weight:500;color:' + (a === ai ? 'var(--moss)' : 'var(--sienna-dk)') + '">' + (a === ai ? 'ถูก' : 'ยังไม่ถูก') + ' · ตอบ ' + q.answer + '</p><p>' + esc(q.explanation) + '</p>' +
          '<p style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px"><button class="chip" type="button" data-sredo>ลบคำตอบข้อนี้</button><a class="chip" href="#/topics/' + t.id + '/sum/' + (qn <= 66 ? 18 : qn <= 132 ? 19 : 20) + '?v=page">ดูในหน้าสรุป</a></p></div>' : '') +
        '</article><div class="qnav"><button class="btn ghost" type="button" data-sgo="-1"' + (STS.i ? '' : ' disabled') + '>← ข้อก่อน</button><button class="btn" type="button" data-sgo="1"' + (STS.i < STS.order.length - 1 ? '' : ' disabled') + '>ข้อต่อไป →</button></div>';
    }
    function gridHTML() {
      return st.qs.map(function (q) {
        var a = ans[q.n], cls = a == null ? '' : L[a] === q.answer ? ' ok' : ' bad', inList = STS.order.indexOf(q.n) >= 0;
        return '<button type="button" class="gn' + cls + (STS.order[STS.i] === q.n ? ' cur' : '') + '" data-sj="' + q.n + '"' + (inList ? '' : ' disabled') + ' aria-label="ข้อ ' + q.n + '">' + q.n + '</button>';
      }).join('');
    }
    return {
      title: 'ข้อสอบในสรุป — ' + t.title, html: head + '<section class="wrap" id="stwrap" style="padding-bottom:80px;display:flex;flex-direction:column;gap:20px">' + tabs +
        '<p class="muted" style="max-width:760px">ข้อสอบ ' + st.qs.length + ' ข้อที่อยู่ในไฟล์สรุป (หน้า 18–20) — เนื้อหาตามต้นฉบับ แค่ทำให้กดตอบได้ทีละข้อ · บันทึกคำตอบให้อัตโนมัติ</p>' +
        '<div class="sheet" style="padding:18px 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="filters"><span class="label" style="min-width:64px">หมวด</span><button type="button" class="chip' + (secs.length ? '' : ' on') + '" data-ssec="all">ทุกหมวด</button>' + chips('data-ssec', st.sections.map(function (x, i) { return [i, x]; }), secs, true) + '</div>' +
        '<div class="filters"><span class="label" style="min-width:64px">ลำดับ</span>' + chips('data-sord', [['seq', 'ตามลำดับ'], ['rnd', 'สุ่ม']], ord) +
        '<span class="label" style="margin-left:10px">แสดง</span>' + chips('data-sflt', [['all', 'ทุกข้อ'], ['todo', 'ยังไม่ทำ'], ['wrong', 'ทำผิด']], flt) + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;border-top:1px dashed var(--rule);padding-top:12px"><span>ทำแล้ว <b>' + done.length + '</b> / ' + st.qs.length + ' · ถูก <b>' + ok + '</b>' + (done.length ? ' (' + Math.round(ok / done.length * 100) + '%)' : '') + '</span>' +
        (done.length ? '<button type="button" class="chip" data-sreset style="margin-left:auto">ล้างคำตอบทั้งหมด</button>' : '') + '</div></div>' +
        '<div id="stq">' + qHTML() + '</div>' +
        '<details class="sheet" style="padding:14px 18px"><summary class="k" style="cursor:pointer;min-height:32px">กระโดดไปข้อ…</summary><div class="ggrid" id="sgrid">' + gridHTML() + '</div></details></section>',
      after: function () {
        function save() { tprogSave('topicst', t.id, { a: ans, sec: secs, ord: ord, f: flt, cur: STS.order[STS.i] || null }); }
        function paint() { document.getElementById('stq').innerHTML = qHTML(); document.getElementById('sgrid').innerHTML = gridHTML(); }
        document.getElementById('stwrap').addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b || b.disabled) return;
          if (b.hasAttribute('data-sp')) { ans[STS.order[STS.i]] = +b.getAttribute('data-sp'); save(); var y = window.scrollY; render(true); window.scrollTo(0, y); return; }
          if (b.hasAttribute('data-sgo')) { STS.i = Math.max(0, Math.min(STS.order.length - 1, STS.i + +b.getAttribute('data-sgo'))); save(); paint(); document.getElementById('stq').scrollIntoView({ block: 'start' }); return; }
          if (b.hasAttribute('data-sj')) { STS.i = STS.order.indexOf(+b.getAttribute('data-sj')); save(); paint(); document.getElementById('stq').scrollIntoView({ block: 'start' }); return; }
          if (b.hasAttribute('data-sredo')) { delete ans[STS.order[STS.i]]; save(); render(true); return; }
          if (b.hasAttribute('data-sreset')) { if (!confirm('ล้างคำตอบทั้ง ' + done.length + ' ข้อ?')) return; ans = {}; STS.order = null; save(); render(true); return; }
          var v;
          if ((v = b.getAttribute('data-ssec')) != null) { if (v === 'all') secs = []; else { v = +v; secs = secs.indexOf(v) >= 0 ? secs.filter(function (x) { return x !== v; }) : secs.concat([v]); } }
          else if ((v = b.getAttribute('data-sord')) != null) ord = v;
          else if ((v = b.getAttribute('data-sflt')) != null) flt = v;
          else return;
          STS.order = null; tprogSave('topicst', t.id, { a: ans, sec: secs, ord: ord, f: flt, cur: null }); render(true);
        });
      }
    };
  }

  /* ----- AI ออกโจทย์ทีละข้อ (เหมือน Admission round: ออกต่อไปเรื่อย ๆ) ----- */
  var AIQ = { t: null, cur: null, next: null, busy: false, err: '', units: null, nq: 0, ok: 0 };
  function aiScope(t, d, set) {
    var all = tUnitsCached(t, d), sel = set.units;
    if (!sel || !sel.length) return all.filter(function (u) { return u.p < 18; });   /* ค่าเริ่มต้น: ทุกหน้า ยกเว้นหน้าข้อสอบ */
    return all.filter(function (u) { return sel.indexOf(u.key) >= 0; });
  }
  /* สัดส่วนเรื่องที่ออก (ตั้งต่อหัวข้อใน data/topics.js → mix) — สุ่มทีละข้อ */
  function aiMix(t, forChat) {
    var m = t.mix; if (!m) return '';
    if (forChat) return '- สัดส่วนเรื่อง: ประมาณ ' + Math.round(m.p * 100) + '% ของข้อ ' + m.main + ' · ที่เหลือ ' + m.other + '\n';
    return '- ข้อนี้: ' + (Math.random() < m.p ? m.main + ' (ถ้าเนื้อหาด้านล่างไม่ได้พูดถึงตรง ๆ ให้ใช้เนื้อหานี้เป็นบริบทของเคส แล้วให้คำถามจบที่เชื้อ/ยา)' : m.other) + '\n';
  }
  function aiPrompt(t, u, set, recent, forChat, pool) {
    var lv = LEVELS[(set.level || 3) - 1];
    var rules = 'กติกา\n- โจทย์เป็น clinical vignette (case-based) ภาษาอังกฤษแบบข้อสอบทางการ ตัวเลือก 5 ข้อ A–E เป็นภาษาอังกฤษ คำตอบถูกข้อเดียว\n' +
      '- ใส่ข้อมูลเท่าที่จำเป็นให้ได้คำตอบเดียว ห้ามใบ้คำตอบในโจทย์ (เช่นใส่ชื่อโรคในวงเล็บหลังค่าแลป) ตัวเลือกที่ถูกห้ามยาวหรือละเอียดกว่าตัวเลือกอื่น\n' +
      '- ระดับความยาก ' + (set.level || 3) + '/5 (' + lv[0] + '): ' + lv[1] + '\n' +
      (set.focus ? '- เน้นเรื่อง: ' + set.focus + '\n' : '') + aiMix(t, forChat) +
      '- คำอธิบายเป็นภาษาไทย: ทำไมข้อถูกถึงถูก ทำไมแต่ละตัวเลือกที่เหลือผิด และสรุปความรู้ของข้อนี้ให้ครบในตัว\n' +
      '- เนื้อหาหลักต้องมาจากสรุปด้านล่าง ถ้าต้องใช้ความรู้นอกสรุปให้ใช้ความรู้มาตรฐานที่ถูกต้อง (guideline ล่าสุด) และบอกไว้ในคำอธิบาย ห้ามแต่งข้อมูล\n' +
      '- ข้อความสรุปสกัดมาจาก PDF อาจมีสระ/วรรณยุกต์ไทยเพี้ยนหรือสัญลักษณ์หายบางจุด (เช่น ⊕ ⊖ ★ = ดอกจัน/ออกสอบ) ให้ตีความตามความหมายทางการแพทย์\n';
    var head = 'คุณเป็นอาจารย์แพทย์ที่ออกข้อสอบ MCQ ให้นักศึกษาแพทย์ไทยชั้นปีที่ ' + C.currentYear + ' (เตรียม Compre และ NL) หัวข้อ "' + t.title + '" (' + t.th + ')\n';
    if (forChat) {
      var txt = '', used = [];
      shuffle(pool).forEach(function (x) { var s = '## ' + x.pt + ' › ' + x.title + '\n' + x.text + '\n\n'; if (txt.length + s.length < 3800) { txt += s; used.push(x); } });
      return head + 'ออกข้อสอบทีละข้อ สุ่มหัวข้อย่อยไปเรื่อย ๆ จากหัวข้อย่อยที่ฉันเลือก — แสดงทีละข้อ รอฉันตอบก่อนแล้วค่อยเฉลย แล้วออกข้อต่อไปทันที ต่อเนื่องจนกว่าฉันจะบอกให้หยุด ไม่ต้องสรุปคะแนนจนกว่าจะหยุด\n\n' + rules +
        '\nหัวข้อย่อยที่เลือก (' + pool.length + '): ' + pool.map(function (x) { return x.title; }).join(' · ').slice(0, 1500) +
        '\n\nตัวอย่างเนื้อหาจากสรุป (บางส่วน)\n<<<\n' + txt + '>>>';
    }
    var ctx = u.text;
    if (ctx.length < 450) tUnitsCached(t, TD[t.id].data).forEach(function (x) { if (x.p === u.p && x.head === u.head && x.key !== u.key && ctx.length < 1400) ctx += '\n\n' + x.title + '\n' + x.text; });
    return head + 'ออกข้อสอบ 1 ข้อ จากหัวข้อย่อยด้านล่าง\n\n' + rules +
      (recent.length ? '- ห้ามซ้ำหรือคล้ายข้อที่ออกไปแล้ว:\n' + recent.map(function (s) { return '  · ' + s; }).join('\n') + '\n' : '') +
      '\nตอบเป็น JSON อย่างเดียว ไม่มีข้อความอื่น รูปแบบ:\n{"stem":"...","options":["...","...","...","...","..."],"answer":"A","explanation":"...","tags":["หัวข้อย่อย 1–3 คำ"]}\n' +
      '\nเนื้อหา (' + u.pt + ' › ' + u.title + ')\n<<<\n' + ctx + '\n>>>';
  }
  function callClaude(key, model, prompt, maxTok) {
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: model, max_tokens: maxTok, messages: [{ role: 'user', content: prompt }] })
    }).then(function (res) {
      return res.json().then(function (j) { if (!res.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + res.status)); return j; });
    }).then(function (j) { return (j.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join(''); });
  }
  function aiPick(units, hist) {
    var lastU = (hist || []).slice(-4).map(function (h) { return h.u; });
    var pool = units.filter(function (u) { return lastU.indexOf(u.key) < 0 && u.text.length > 40; });
    if (!pool.length) pool = units;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function aiFetch(t, d) {
    var set = tset(t.id), units = aiScope(t, d, set), pr = tprog('topicq', t.id), hist = pr.h || [];
    var u = aiPick(units, hist);
    var recent = hist.slice(-10).map(function (h) { return h.s; });
    if (AIQ.cur && AIQ.cur.stem) recent.push(AIQ.cur.stem.slice(0, 160));
    var key = LS.get('apikey', ''), mdl = LS.get('model', C.ai.models[0].id);
    return callClaude(key, mdl, aiPrompt(t, u, set, recent, false), 2500).then(function (txt) {
      var q = extractJSON(txt);
      if (!q.stem || !q.options || q.options.length < 2) throw new Error('AI ไม่ได้ส่งข้อสอบกลับมา');
      return { stem: q.stem, options: q.options.slice(0, 5), answer: String(q.answer || '').trim().toUpperCase().charAt(0), explanation: q.explanation || '', tags: q.tags || [], u: u.key, ut: u.title, up: u.p, model: mdl };
    });
  }
  function aiQHTML(t) {
    var q = AIQ.cur, L = 'ABCDE';
    if (AIQ.err && !q) return '<p class="warn">' + esc(AIQ.err) + '</p>';
    if (!q) return '<div class="sheet q"><p class="muted"><span class="spin" aria-hidden="true"></span> AI กำลังออกข้อ ' + (AIQ.nq + 1) + '…</p></div>';
    var done = q.pick != null, ai = L.indexOf(q.answer);
    return '<article class="sheet q"><div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 12px"><span class="k" style="font-size:28px">' + (AIQ.nq + 1) + '</span>' +
      '<span style="display:inline-flex;flex-wrap:wrap;gap:6px">' + [q.ut].concat(q.tags || []).slice(0, 3).map(function (x) { return '<span class="pill">' + esc(x) + '</span>'; }).join('') + '</span></div>' +
      '<p lang="en">' + esc(q.stem) + '</p><div style="display:flex;flex-direction:column;gap:2px" lang="en">' +
      q.options.map(function (op, j) {
        var cls = done ? (j === ai ? ' ok' : j === q.pick ? ' bad' : '') : '';
        return '<button class="choice' + cls + '" type="button" data-ap="' + j + '"' + (done ? ' disabled' : '') + '><b>' + L[j] + '</b><span>' + esc(String(op).replace(/^[A-E][.)]\s*/, '')) + '</span></button>';
      }).join('') + '</div>' +
      (done ? '<div class="explain"><p class="k" style="font-weight:500;color:' + (q.pick === ai ? 'var(--moss)' : 'var(--sienna-dk)') + '">' + (q.pick === ai ? 'ถูก' : 'ยังไม่ถูก') + ' · เฉลย ' + esc(L[ai] || q.answer) + '</p>' + rich(q.explanation) +
        '<p style="margin-top:4px"><a class="chip" href="#/topics/' + t.id + '/sum/' + q.up + '?to=u' + q.u + '">ดูสรุปส่วนนี้ (หน้า ' + q.up + ')</a></p></div>' : '') +
      '</article>' + (done ? '<div class="qnav"><span class="muted" id="aiNx" style="align-self:center;font-size:15px">' + (AIQ.next ? 'ข้อต่อไปพร้อมแล้ว' : '') + '</span><button class="btn" type="button" data-anext>ข้อต่อไป →</button></div>' : '');
  }
  function aiPaint(t) {
    var el = document.getElementById('aiQ'); if (!el || AIQ.t !== t.id) return;
    el.innerHTML = '<p class="note">ทำในรอบนี้ ' + (AIQ.nq + (AIQ.cur && AIQ.cur.pick != null ? 1 : 0)) + ' ข้อ · ถูก ' + AIQ.ok + '</p>' + aiQHTML(t) +
      (AIQ.err && !AIQ.cur ? '<p style="margin-top:10px"><button class="btn ghost" type="button" data-anext>ลองอีกครั้ง</button></p>' : '');
  }
  function aiPrefetch(t, d) {
    var mine = AIQ.run;
    AIQ.next = null;
    AIQ.nextP = aiFetch(t, d).then(function (q) { if (AIQ.run === mine) { AIQ.next = q; var el = document.getElementById('aiNx'); if (el) el.textContent = 'ข้อต่อไปพร้อมแล้ว'; } return q; });
    AIQ.nextP.catch(function () { });
  }
  function aiShowNext(t, d) {
    var mine = AIQ.run;
    AIQ.err = ''; AIQ.cur = null; AIQ.busy = true; aiPaint(t);
    var p = AIQ.next ? Promise.resolve(AIQ.next) : (AIQ.nextP || aiFetch(t, d));
    AIQ.next = null; AIQ.nextP = null;
    p.then(function (q) {
      if (AIQ.run !== mine) return;
      AIQ.cur = q; AIQ.busy = false; aiPaint(t);
      var el = document.getElementById('aiQ'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
      aiPrefetch(t, d);
    }).catch(function (err) { if (AIQ.run !== mine) return; AIQ.busy = false; AIQ.err = 'ออกข้อสอบไม่สำเร็จ: ' + (err.message || err); aiPaint(t); });
  }
  function aiPage(t, d, r, head, tabs) {
    var set = tset(t.id), units = tUnitsCached(t, d);
    if (r.q.get('p')) { var pn = +r.q.get('p'); set = Object.assign({}, set, { units: units.filter(function (u) { return u.p === pn; }).map(function (u) { return u.key; }) }); tsetSave(t.id, set); history.replaceState(null, '', '#/topics/' + t.id + '/practice?m=ai'); }
    var sel = set.units && set.units.length ? set.units : units.filter(function (u) { return u.p < 18; }).map(function (u) { return u.key; });
    var on = function (k) { return sel.indexOf(k) >= 0; };
    var key = LS.get('apikey', ''), model = LS.get('model', C.ai.models[0].id), eng = set.eng || (key ? 'api' : 'claude'), lvl = set.level || 3;
    var scope = d.groups.map(function (g) {
      var gu = units.filter(function (u) { return g.pages.indexOf(u.p) >= 0; }), gn = gu.filter(function (u) { return on(u.key); }).length;
      return '<details class="sg"><summary><label class="ck sgl"><input type="checkbox" data-sg="' + g.id + '"' + (gn === gu.length ? ' checked' : '') + (gn && gn < gu.length ? ' data-mixed' : '') + '><span class="k" style="font-weight:500">' + esc(g.t) + '</span></label><span class="muted" style="font-size:13px;margin-left:auto">' + gn + '/' + gu.length + '</span></summary>' +
        g.pages.map(function (pn) {
          var pu = gu.filter(function (u) { return u.p === pn; }), k = pu.filter(function (u) { return on(u.key); }).length;
          return '<div class="sp"><label class="ck"><input type="checkbox" data-spg="' + pn + '"' + (k === pu.length ? ' checked' : '') + (k && k < pu.length ? ' data-mixed' : '') + '><span>หน้า ' + pn + ' · ' + esc(d.pages[pn - 1].t) + '</span></label>' +
            '<div class="su">' + pu.map(function (u) { return '<label class="ck"><input type="checkbox" data-su="' + u.key + '"' + (on(u.key) ? ' checked' : '') + '><span>' + esc(u.title) + '</span></label>'; }).join('') + '</div></div>';
        }).join('') + '</details>';
    }).join('');
    var levelHTML = LEVELS.map(function (l, i) {
      return '<label class="lv"><input type="radio" name="tlv" value="' + (i + 1) + '"' + (lvl === i + 1 ? ' checked' : '') + '><span><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#355A3A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + l[2] + '</svg><b class="k" style="font-weight:500">' + (i + 1) + ' · ' + l[0] + '</b></span></label>';
    }).join('');
    var models = C.ai.models.map(function (m) { return '<option value="' + esc(m.id) + '"' + (m.id === model ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('');
    var pr = tprog('topicq', t.id), running = AIQ.t === t.id && (AIQ.cur || AIQ.busy);
    return {
      title: 'ฝึก — ' + t.title, html: head + '<section class="wrap" style="padding-bottom:80px;display:flex;flex-direction:column;gap:20px">' + tabs +
        '<p class="muted" style="max-width:780px">AI ออกโจทย์ case-based ทีละข้อต่อไปเรื่อย ๆ จากหัวข้อที่เลือก — เลือกทั้งหัวข้อ เป็นกลุ่ม เป็นหน้า หรือเฉพาะหัวข้อย่อยก็ได้ แต่ละข้อสุ่มหัวข้อย่อยใหม่' +
        (pr.n ? ' · ที่ผ่านมาทำแล้ว ' + pr.n + ' ข้อ ถูก ' + (pr.ok || 0) : '') + '</p>' +
        '<div class="aiwrap"><form id="aiset" class="sheet" style="padding:clamp(20px,3vw,32px)" onsubmit="return false">' +
        '<div class="step"><span class="n">1</span><fieldset><legend class="h">หัวข้อที่จะออก <span class="muted" style="font-size:15px;font-weight:400" id="aiCnt">' + sel.length + ' / ' + units.length + ' หัวข้อย่อย</span></legend>' +
        '<div class="filters" style="margin-bottom:10px"><button type="button" class="chip" data-sall="1">ทั้งหัวข้อ</button><button type="button" class="chip" data-sall="0">ไม่เลือกเลย</button></div><div class="scope">' + scope + '</div>' +
        '<label class="h" for="aiFocus" style="font-size:16px;margin:14px 0 8px">เน้นเรื่อง (ไม่ใส่ก็ได้)</label><input class="field" id="aiFocus" maxlength="120" placeholder="เช่น CRAB, เลือกยาในคนท้อง, dose เด็ก" value="' + esc(set.focus || '') + '"></fieldset></div>' +
        '<div class="step"><span class="n">2</span><fieldset><legend class="h">ระดับความยาก</legend><div style="display:flex;flex-wrap:wrap;gap:8px">' + levelHTML + '</div></fieldset></div>' +
        '<div class="step"><span class="n">3</span><fieldset><legend class="h">ใช้ AI ผ่าน</legend><div style="display:flex;flex-direction:column;gap:10px">' +
        '<label class="eng"><input type="radio" name="teng" value="api"' + (eng === 'api' ? ' checked' : '') + '><span style="flex:1;min-width:0"><b class="k" style="font-weight:500;font-size:17px">Anthropic API key</b><br><span class="muted" style="font-size:15px">ทำในหน้านี้ทีละข้อ ข้อถัดไปเตรียมไว้ระหว่างอ่านเฉลย · key เก็บในเบราว์เซอร์นี้เท่านั้น (ใช้ร่วมกับห้องสอบ)</span>' +
        '<input id="tkey" type="password" class="field" style="margin-top:10px" placeholder="sk-ant-…" autocomplete="off" aria-label="Anthropic API key" value="' + esc(key) + '">' +
        '<select id="tmodel" class="field" style="margin-top:8px" aria-label="รุ่นของ Claude">' + models + '</select></span></label>' +
        '<label class="eng"><input type="radio" name="teng" value="claude"' + (eng === 'claude' ? ' checked' : '') + '><span><b class="k" style="font-weight:500;font-size:17px">Claude</b><br><span class="muted" style="font-size:15px">เปิดแชทใหม่ใน claude.ai ด้วยบัญชีของคุณ — Claude ออกทีละข้อต่อเนื่องในแชท (ส่งเนื้อหาไปได้บางส่วนเพราะลิงก์ยาวจำกัด)</span></span></label></div></fieldset></div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;border-top:1px solid var(--empty);padding-top:22px"><button class="btn" type="button" id="aiGo">' + (running ? 'เริ่มใหม่ด้วยค่านี้' : 'เริ่มฝึก') + '</button><span id="aiSt" class="note" role="status"></span></div></form>' +
        '<div id="aiQ" class="aiq" aria-live="polite">' + (AIQ.t === t.id && (AIQ.cur || AIQ.busy || AIQ.err) ? '<p class="note">ทำในรอบนี้ ' + (AIQ.nq + (AIQ.cur && AIQ.cur.pick != null ? 1 : 0)) + ' ข้อ · ถูก ' + AIQ.ok + '</p>' + aiQHTML(t) : '<div class="empty"><p class="k" style="font-size:20px">ยังไม่ได้เริ่ม</p><p class="muted">เลือกหัวข้อแล้วกด “เริ่มฝึก” — โจทย์จะขึ้นตรงนี้ทีละข้อ</p></div>') + '</div></div></section>',
      after: function () {
        var form = document.getElementById('aiset'), st = document.getElementById('aiSt');
        form.querySelectorAll('input[data-mixed]').forEach(function (x) { x.indeterminate = true; });
        function readSel() { return Array.prototype.map.call(form.querySelectorAll('input[data-su]:checked'), function (x) { return x.getAttribute('data-su'); }); }
        function saveSet() {
          var lv = form.querySelector('input[name=tlv]:checked'), en = form.querySelector('input[name=teng]:checked');
          var s2 = { units: readSel(), focus: document.getElementById('aiFocus').value.trim(), level: lv ? +lv.value : 3, eng: en ? en.value : 'api' };
          tsetSave(t.id, s2); return s2;
        }
        function syncParents() {
          form.querySelectorAll('[data-spg]').forEach(function (pg) {
            var bx = pg.closest('.sp').querySelectorAll('input[data-su]'), k = Array.prototype.filter.call(bx, function (x) { return x.checked; }).length;
            pg.checked = k === bx.length; pg.indeterminate = k > 0 && k < bx.length;
          });
          form.querySelectorAll('[data-sg]').forEach(function (gg) {
            var bx = gg.closest('details').querySelectorAll('input[data-su]'), k = Array.prototype.filter.call(bx, function (x) { return x.checked; }).length;
            gg.checked = k === bx.length; gg.indeterminate = k > 0 && k < bx.length;
            gg.closest('summary').querySelector('.muted').textContent = k + '/' + bx.length;
          });
          document.getElementById('aiCnt').textContent = readSel().length + ' / ' + units.length + ' หัวข้อย่อย';
        }
        form.addEventListener('click', function (e) {
          var b = e.target.closest('[data-sall]'); if (!b) return;
          form.querySelectorAll('input[data-su]').forEach(function (x) { x.checked = b.getAttribute('data-sall') === '1'; });
          syncParents(); saveSet();
        });
        form.addEventListener('change', function (e) {
          var x = e.target;
          if (x.hasAttribute('data-sg')) x.closest('details').querySelectorAll('input[data-su]').forEach(function (y) { y.checked = x.checked; });
          if (x.hasAttribute('data-spg')) x.closest('.sp').querySelectorAll('input[data-su]').forEach(function (y) { y.checked = x.checked; });
          if (x.id === 'tmodel') LS.set('model', x.value);
          syncParents(); saveSet();
        });
        document.getElementById('aiFocus').addEventListener('change', saveSet);
        document.getElementById('tkey').addEventListener('input', function () { var a = form.querySelector('input[name=teng][value=api]'); if (a && !a.checked) { a.checked = true; saveSet(); } });
        /* กดที่ checkbox ใน summary ไม่ให้พับ/กาง */
        form.querySelectorAll('.sgl').forEach(function (l) { l.addEventListener('click', function (e) { e.stopPropagation(); }); });
        var qbox = document.getElementById('aiQ');
        document.getElementById('aiGo').addEventListener('click', function () {
          var s2 = saveSet(), pool = aiScope(t, d, s2);
          if (!s2.units.length) { st.textContent = 'เลือกอย่างน้อย 1 หัวข้อย่อย'; return; }
          if (s2.eng === 'claude') {
            var pmt = aiPrompt(t, null, s2, [], true, pool);
            try { navigator.clipboard.writeText(pmt).catch(function () { }); } catch (er) { }
            window.open('https://claude.ai/new?q=' + encodeURIComponent(pmt), '_blank', 'noopener');
            st.textContent = 'เปิด Claude ในแท็บใหม่แล้ว · คัดลอกคำสั่งไว้ให้ด้วย ถ้าแชทไม่ขึ้นข้อความให้วางเอง'; return;
          }
          var k = document.getElementById('tkey').value.trim();
          if (!k) { st.textContent = 'ใส่ API key ก่อน'; document.getElementById('tkey').focus(); return; }
          LS.set('apikey', k); LS.set('model', document.getElementById('tmodel').value); st.textContent = '';
          AIQ.t = t.id; AIQ.run = Date.now(); AIQ.nq = 0; AIQ.ok = 0; AIQ.next = null; AIQ.nextP = null; AIQ.cur = null;
          aiShowNext(t, d);
        });
        qbox.addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b || b.disabled) return;
          if (b.hasAttribute('data-ap') && AIQ.cur && AIQ.cur.pick == null) {
            var q = AIQ.cur; q.pick = +b.getAttribute('data-ap');
            var good = 'ABCDE'.charAt(q.pick) === q.answer; if (good) AIQ.ok++;
            var pr2 = tprog('topicq', t.id); pr2.n = (pr2.n || 0) + 1; pr2.ok = (pr2.ok || 0) + (good ? 1 : 0);
            pr2.h = (pr2.h || []).concat([{ s: q.stem.slice(0, 160), u: q.u, r: good ? 1 : 0 }]).slice(-40); tprogSave('topicq', t.id, pr2);
            aiPaint(t);
          } else if (b.hasAttribute('data-anext')) { AIQ.nq += AIQ.cur && AIQ.cur.pick != null ? 1 : 0; aiShowNext(t, d); }
        });
      }
    };
  }

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
    var syncList = '<ul class="muted" style="font-size:15px"><li>หน้าที่อ่านค้าง</li><li>ข้อสอบ AI ชุดล่าสุดและคำตอบ</li><li>ค่าที่เลือกในห้องสอบ (ระดับ จำนวนข้อ วิธีใช้ AI รุ่น)</li><li>ตั้งค่าการสอบ NL &amp; Compre (วันสอบ รูปแบบ จำนวน เวลา)</li><li>Random Topic Summary: หัวข้อที่เลือกฝึก คะแนน และคำตอบข้อสอบในสรุป</li></ul><p class="note">API key ไม่ซิงก์ — อยู่ในเบราว์เซอร์ที่ใส่ไว้เท่านั้น</p>';
    if (FB.user) {
      var st = syncState === 'error' ? '<p class="warn">ซิงก์ไม่สำเร็จ: ' + esc(authErr) + ' — ข้อมูลยังบันทึกในเครื่องนี้</p>'
        : syncState === 'saving' ? '<p class="info"><span class="spin" aria-hidden="true"></span> กำลังบันทึก…</p>' : '<p class="info">บันทึกในบัญชีแล้ว · เปิดจากเครื่องไหนก็ได้</p>';
      return {
        title: 'บัญชี', html: box('<div><span class="label">เข้าสู่ระบบเป็น</span><p class="k" style="font-size:24px;margin-top:4px">' + esc(who(FB.user)) + '</p></div>' + st +
          (devTrusted() ? '' : '<div class="sheet" style="padding:16px 18px;display:flex;flex-direction:column;gap:10px"><p>เครื่องนี้ล็อกอินอยู่ แต่ยังไม่ได้ยืนยันในโพยหมอ จึงต้องใส่รหัสทุกครั้งที่เปิดแท็บใหม่</p><button class="btn ghost" type="button" id="trust" style="align-self:flex-start">ยืนยันเข้าสู่ระบบในโพยหมอ (เครื่องนี้ไม่ต้องใส่รหัสอีก)</button></div>') +
          '<div><span class="label">สิ่งที่ซิงก์ข้ามเครื่อง</span>' + syncList + '</div>' +
          '<label class="ck"><input type="checkbox" id="wipe"><span>ลบข้อมูลออกจากเครื่องนี้ด้วยตอนออกจากระบบ <span class="muted">(แนะนำถ้าเป็นเครื่องคนอื่น — ข้อมูลยังอยู่ในบัญชี)</span></span></label>' +
          '<div style="display:flex;flex-wrap:wrap;gap:10px"><a class="btn" href="#/">กลับหน้าแรก</a><button class="btn ghost" type="button" id="out">ออกจากระบบ</button></div>'),
        after: function () {
          var tb = document.getElementById('trust');
          if (tb) tb.addEventListener('click', function () { markTrusted(); toast('จำเครื่องนี้แล้ว ไม่ต้องใส่รหัสอีก'); render(true); });
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
        function cred(fn) { err(''); var e; try { e = toEmail(el('em').value); } catch (x) { err(errMsg(x)); return; } fn(FB.auth, e, el('pw').value).then(markTrusted).catch(function (x) { err(errMsg(x)); }); }
        el('gIn').addEventListener('click', function () {
          err(''); var p = new A.GoogleAuthProvider();
          A.signInWithPopup(FB.auth, p).then(markTrusted).catch(function (e) {
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
