/* โพยหมอ — single-page app (hash routes)
   #/ · #/preclinic[/<แท็บ>?to=] · #/clinic[/approach|/skills|/ward|/doc/<แท็บ>|/symp[/<บท>?to=]] · #/diseases?q=&ward=&sys=&type=&gen=&onset=&prog=&seen=&e= · #/disease/<id> · #/exam?t=&src= · #/nl[/board|notes|exams|settings] · #/topics[/<id>/sum/<หน้า>|/<id>/practice?m=] · #/account */
(function () {
  'use strict';
  var C = window.POY_CONFIG, SYS = window.POY_SYSTEMS, OTHER = window.POY_OTHER;
  var CLI = window.POY_CLINIC, NLD = window.POY_NL || { notes: [] };
  var app = document.getElementById('app');

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return ('000' + n).slice(-4); }
  /* ค่าที่ซิงก์เข้าบัญชี (API key ไม่ซิงก์ — อยู่ในเบราว์เซอร์นั้นเท่านั้น) */
  var SYNC_KEYS = ['recent', 'quiz', 'level', 'count', 'engine', 'model', 'nlset', 'topicset', 'topicq', 'topicst', 'maiok'];
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
  function bold(h) { return h.replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>'); }
  function rich(v) {
    var lines = String(v || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    var out = '', ul = false;
    lines.forEach(function (l) {
      var m = l.match(/^[-•*·]\s*(.*)$/);
      if (m) { if (!ul) { out += '<ul>'; ul = true; } out += '<li>' + bold(esc(m[1])) + '</li>'; }
      else { if (ul) { out += '</ul>'; ul = false; } out += '<p>' + bold(esc(l)) + '</p>'; }
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
  var MAI = window.POY_MAI || { cols: {}, multi: [], filters: [], sysColors: {}, order: {}, short: {}, typeColors: {}, softWords: [] };
  function slug(s) { return String(s || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x'; }
  function isTrue(v) { return /^(true|yes|✓|✔|1|y)$/i.test(String(v || '').trim()); }
  function splitMulti(v) { return String(v || '').split(/\s*,\s*/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function blankDisease(o) {
    o.systems = o.systems || []; o.prog = o.prog || []; o.seen = o.seen || []; o.aliases = o.aliases || [];
    o.ward = o.ward || ''; o.type = o.type || ''; o.gen = o.gen || ''; o.onset = o.onset || ''; o.icd = o.icd || ''; o.brief = o.brief || '';
    o.total = o.fields.length;
    o.groups = o.groups || [{ label: '', cols: o.fields.map(function (f) { return { label: f.label, sub: '', value: f.value }; }) }];
    return o;
  }
  /* ชีตแบบเดิม (หัวตารางแถวเดียว) — ใช้กับข้อมูลตัวอย่าง */
  function buildSimple(rows) {
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
      out.push(blankDisease({
        no: no, id: no, row: k + 2, name: name, th: iTh >= 0 ? String(r[iTh] || '').trim() : '',
        sysRaw: sysRaw, sys: sysOf(sysRaw), systems: sysRaw ? [sysRaw] : [], fields: fields,
        filled: fields.filter(function (f) { return f.value; }).length
      }));
    });
    return out;
  }
  /* ชีต "1000 โรค": แถวหัว = หมวด, แถวถัดไป = หมวดย่อย (ช่องที่ merge ไว้ใช้หมวดจากช่องซ้าย) */
  function build(rows) {
    var hi = -1, i, j;
    for (i = 0; i < Math.min(rows.length, 6); i++) if (rows[i].some(function (c) { return MAI.cols.name && MAI.cols.name.test(String(c).trim()); })) { hi = i; break; }
    if (hi < 0) return buildSimple(rows);
    var H1 = rows[hi], H2 = rows[hi + 1] || [], W = Math.max(H1.length, H2.length);
    var iNm = H1.map(function (c) { return String(c).trim(); }).findIndex(function (c) { return MAI.cols.name.test(c); });
    var hasSub = !String(H2[iNm] || '').trim() && H2.some(function (c) { return String(c).trim(); });
    if (!hasSub) H2 = [];
    var cols = [], cur = '';
    for (j = 0; j < W; j++) {
      var g = String(H1[j] || '').replace(/\s*\n\s*/g, ' ').trim(), s = String(H2[j] || '').replace(/\s*\n\s*/g, ' ').trim();
      if (g) cur = g; else if (s) g = cur; else continue;
      cols.push({ j: j, group: g, sub: g === s ? '' : s, label: s && g !== s ? g + ' › ' + s : g, role: '' });
    }
    var role = {};
    Object.keys(MAI.cols).forEach(function (k) {
      cols.forEach(function (c) {
        if (c.role || !MAI.cols[k].test(c.label)) return;
        if (k === 'seen') { c.role = 'seen'; (role.seen = role.seen || []).push(c); }
        else if (!role[k]) { c.role = k; role[k] = c; }
      });
    });
    var content = cols.filter(function (c) { return !c.role || c.role === 'alias' || c.role === 'brief' || c.role === 'onset' || c.role === 'prog'; });
    function val(r, c) { return c ? String(r[c.j] == null ? '' : r[c.j]).trim() : ''; }
    var out = [], ids = {}, lastNo = 0, exact = {};
    rows.slice(hi + (hasSub ? 2 : 1)).forEach(function (r, k) {
      var name = val(r, role.name); if (!name) return;
      var rowNo = hi + (hasSub ? 2 : 1) + k + 1;
      /* เลขในช่อง # — ถ้าเป็น * หรือว่าง ให้นับต่อจากเลขก่อนหน้าเอง (ซ้ำหรือไม่ เว็บตรวจเอง) */
      var noRaw = val(r, role.no), no = /^\d+$/.test(noRaw) ? noRaw : String(lastNo + 1); lastNo = +no;
      var ek = name.trim().toLowerCase(); (exact[ek] = exact[ek] || []).push(out.length);
      var id = slug(name); if (ids[id]) id = id + '-' + rowNo; ids[id] = 1;
      var systems = splitMulti(val(r, role.sys));
      var groups = [], gmap = {}, fields = [], filled = 0;
      content.forEach(function (c) {
        var v = val(r, c);
        if (!gmap[c.group]) { gmap[c.group] = { label: c.group, cols: [] }; groups.push(gmap[c.group]); }
        gmap[c.group].cols.push({ label: c.label, sub: c.sub, value: v, role: c.role });
        fields.push({ label: c.label, value: v });
        if (v && c.role !== 'onset' && c.role !== 'prog') filled++;
      });
      var total = content.filter(function (c) { return c.role !== 'onset' && c.role !== 'prog'; }).length;
      var aliases = [];
      name.replace(/\([^)]*\)/g, function (m) { return m.replace(/\//g, '\u0000'); }).split('/').forEach(function (p) { p = p.replace(/\u0000/g, '/').trim(); if (p && p !== name) aliases.push(p); });
      val(r, role.alias).split(/\r?\n/).forEach(function (l) { l = l.replace(/^[-•*·]\s*/, '').trim(); if (l) aliases.push(l); });
      out.push({
        no: no, star: false, id: id, row: rowNo, name: name, th: '',
        systems: systems, sysRaw: systems.join(', '), sys: sysOf(systems[0] || ''),
        ward: val(r, role.ward), type: val(r, role.type), gen: val(r, role.gen), onset: val(r, role.onset), prog: splitMulti(val(r, role.prog)),
        seen: (role.seen || []).filter(function (c) { return isTrue(val(r, c)); }).map(function (c) { return c.sub || c.group; }),
        icd: val(r, role.icd), brief: val(r, role.brief), aliases: aliases,
        groups: groups, fields: fields, filled: filled, total: total
      });
    });
    Object.keys(exact).forEach(function (k) { if (exact[k].length > 1) exact[k].forEach(function (i) { out[i].star = true; }); });
    D.people = (role.seen || []).map(function (c) { return c.sub || c.group; });
    return out;
  }

  var D = { list: [], src: 'sample', at: null, err: null, loading: false, people: [] };
  function hasSheet() { return !!(C.sheet && (C.sheet.id || C.sheet.csvUrl)); }
  /* export?format=csv ได้ข้อความตรงตามชีต · gviz เป็นทางสำรอง (อาจทิ้งค่าที่ชนิดไม่ตรงกับทั้งคอลัมน์ เช่น * ในช่อง #) */
  function sheetUrls() {
    var t = '_=' + Date.now();
    if (C.sheet.csvUrl) return [C.sheet.csvUrl + (C.sheet.csvUrl.indexOf('?') >= 0 ? '&' : '?') + t];
    var base = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(C.sheet.id), gid = encodeURIComponent(C.sheet.gid || '0');
    return [base + '/export?format=csv&gid=' + gid + '&' + t, base + '/gviz/tq?tqx=out:csv&headers=0&gid=' + gid + '&' + t];
  }
  function trimRows(rows) {
    var n = rows.length; while (n && !rows[n - 1].some(function (c) { return String(c).trim(); })) n--;
    return rows.slice(0, n).map(function (r) { var m = r.length; while (m && !String(r[m - 1]).trim()) m--; return r.slice(0, m); });
  }
  function initDiseases() {
    if (!hasSheet()) { D.list = build(window.POY_SAMPLE || []); D.src = 'sample'; return; }
    var cache = LS.get('dcache', null);
    if (cache && cache.id === (C.sheet.id || C.sheet.csvUrl) && cache.rows) { D.list = build(cache.rows); D.src = 'cache'; D.at = cache.at; }
    loadSheet();
    /* กลับมาที่แท็บหลังไปแก้ชีต → ดึงใหม่ (ห่างครั้งก่อนเกิน 30 วิ) */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && !D.loading && (!D.at || Date.now() - D.at > 30000)) loadSheet();
    });
  }
  function fetchCSV(urls) {
    var u = urls[0];
    return fetch(u, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function (txt) {
      if (/^\s*</.test(txt)) throw new Error('ชีตยังไม่ได้เปิดแชร์ให้ทุกคนที่มีลิงก์ดูได้');
      return txt;
    }).catch(function (e) { if (urls.length > 1) return fetchCSV(urls.slice(1)); throw e; });
  }
  function loadSheet() {
    if (!hasSheet() || D.loading) return;
    D.loading = true; D.err = null; refreshLive();
    fetchCSV(sheetUrls()).then(function (txt) {
      var rows = trimRows(parseCSV(txt));
      D.list = build(rows); D.src = 'sheet'; D.at = Date.now();
      LS.set('dcache', { id: C.sheet.id || C.sheet.csvUrl, at: D.at, rows: rows });
    }).catch(function (e) {
      D.err = e.message || String(e);
      if (!D.list.length) { D.list = build(window.POY_SAMPLE || []); D.src = 'sample'; }
    }).then(function () {
      D.loading = false; DUPS = null;
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
    if (!key) return null;
    var i;
    for (i = 0; i < D.list.length; i++) if (String(D.list[i].id).toLowerCase() === key) return D.list[i];
    for (i = 0; i < D.list.length; i++) if (D.list[i].no.toLowerCase() === key) return D.list[i];
    for (i = 0; i < D.list.length; i++) if (D.list[i].name.toLowerCase() === key) return D.list[i];
    var s = slug(key);
    for (i = 0; i < D.list.length; i++) if (slug(D.list[i].name) === s) return D.list[i];
    return null;
  }
  function dHref(d) { return '#/disease/' + encodeURIComponent(d.id); }
  function dLink(name) {
    var d = findDisease(name);
    return d ? dHref(d) : '#/diseases?q=' + encodeURIComponent(name);
  }

  /* ---------- 1000 MAI: โรคที่น่าจะซ้ำ ---------- */
  var DUPS = null;
  function nKey(s) { return String(s || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/['’`]s\b/g, 's').replace(/[^a-z0-9ก-๙]+/g, ' ').trim(); }
  function softKey(s) { return nKey(s).split(' ').filter(function (w) { return MAI.softWords.indexOf(w) < 0; }).join(' '); }
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    var p = [], q, i, j;
    for (j = 0; j <= b.length; j++) p[j] = j;
    for (i = 1; i <= a.length; i++) {
      q = [i];
      for (j = 1; j <= b.length; j++) q[j] = Math.min(p[j] + 1, q[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      p = q;
    }
    return p[b.length];
  }
  function typoPair(a, b) {
    var x = nKey(a).split(' '), y = nKey(b).split(' ');
    if (x.length !== y.length) return false;
    var diff = [];
    for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) diff.push([x[i], y[i]]);
    if (diff.length !== 1) return false;
    var u = diff[0][0], v = diff[0][1];
    if (u.length < 5 || v.length < 5) return false;
    if (/^hyper/.test(u) && /^hypo/.test(v) || /^hypo/.test(u) && /^hyper/.test(v)) return false;
    var d = lev(u, v);
    return d >= 1 && d <= (Math.min(u.length, v.length) >= 10 ? 2 : 1);
  }
  function findDups() {
    if (DUPS) return DUPS;
    var L = D.list, pairs = [], seenPair = {};
    function add(a, b, why) {
      if (a === b) return;
      var k = [a.id, b.id].sort().join('|'); if (seenPair[k]) return;
      seenPair[k] = 1; pairs.push({ a: a.row < b.row ? a : b, b: a.row < b.row ? b : a, why: why, key: k });
    }
    var byExact = {}, byKey = {}, bySoft = {};
    L.forEach(function (d) {
      var e = d.name.trim().toLowerCase(), k = nKey(d.name).replace(/ /g, ''), s = softKey(d.name).replace(/ /g, '');
      (byExact[e] = byExact[e] || []).push(d);
      if (k) (byKey[k] = byKey[k] || []).push(d);
      if (s) (bySoft[s] = bySoft[s] || []).push(d);
    });
    function each(map, why) { Object.keys(map).forEach(function (k) { var g = map[k]; for (var i = 0; i < g.length; i++) for (var j = i + 1; j < g.length; j++) add(g[i], g[j], why); }); }
    each(byExact, 'ชื่อตรงกันทุกตัวอักษร');
    each(byKey, 'ชื่อเหมือนกันถ้าไม่นับวงเล็บ ตัวพิมพ์ หรือเครื่องหมาย');
    each(bySoft, 'ต่างกันแค่คำทั่วไป เช่น acute / disease / syndrome');
    /* ชื่ออื่น (คั่นด้วย / ในชื่อโรค หรือช่อง Other names) ตรงกับชื่อโรคอีกแถว */
    L.forEach(function (d) {
      d.aliases.forEach(function (al) {
        var k = nKey(al).replace(/ /g, ''), s = softKey(al).replace(/ /g, '');
        if (k.length < 5) return;
        (byKey[k] || []).concat(bySoft[s] || []).forEach(function (x) { add(d, x, 'ชื่ออื่น "' + al + '" ของโรคนี้ ตรงกับอีกแถว'); });
      });
    });
    /* สะกดต่างกันนิดเดียว */
    for (var i = 0; i < L.length; i++) for (var j = i + 1; j < L.length; j++) if (typoPair(L[i].name, L[j].name)) add(L[i], L[j], 'สะกดต่างกัน 1–2 ตัวอักษร — อาจพิมพ์ผิด');
    pairs.sort(function (p, q) { return p.a.row - q.a.row || p.b.row - q.b.row; });
    DUPS = pairs;
    return pairs;
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
    var here = r.name === 'disease' ? 'diseases' : r.name, sub = (r.name === 'nl' || r.name === 'topics' || (r.name === 'clinic' && (r.args[0] === 'symp' || r.args[0] === 'skills'))) && r.args[0] ? r.name + '/' + r.args[0] : '';
    if (r.name === 'clinic' && (r.args[0] === 'ward' || r.args[0] === 'doc')) { var gn = r.args[0] === 'doc' && G.by[r.args[1]]; sub = 'clinic/' + (gn && gn.ck && gn.ck !== 'ward' ? gn.ck : 'ward'); }
    if (r.name === 'preclinic' && r.args[0] && G.by[r.args[0]]) sub = 'preclinic/' + (G.by[r.args[0]].topN || G.by[r.args[0]]).slug;
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
      ['#/preclinic', '#3E7CA6', '01 · ราก', 'Preclinic แยกตาม system', 'สรุปปี 1–3 จาก Google Doc โพยหมอ แยกตามแท็บเดิมทุกแท็บ' + (G.st === 'ready' ? ' — ' + G.top.pre.length + ' หมวด' : ''), G.st === 'ready' ? gLiveHTML() : '<span class="muted">ดึงจาก Google Docs</span>'],
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
      return '<a class="row" href="' + dHref(d) + '"><span class="muted" style="font-style:italic;font-size:14px;width:74px;flex:none">No. ' + esc(d.no) + '</span><span class="k" style="flex:1;min-width:0;font-size:18px;font-weight:500">' + esc(d.name) + '</span>' + (d.systems[0] ? '<span class="mtag" style="background:' + sysCol(d.systems[0])[0] + ';color:' + sysCol(d.systems[0])[1] + '">' + esc(d.systems[0]) + '</span>' : '') + '</a>';
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
  var FKEYS = MAI.filters.map(function (f) { return f.key; });
  function dVals(d, k) {
    var v = k === 'sys' ? d.systems : k === 'prog' ? d.prog : k === 'seen' ? d.seen : [d[k]];
    return (v || []).filter(Boolean);
  }
  function sysCol(name) { return MAI.sysColors[name] || ['#E4DDCB', '#3A423B']; }
  function shortOf(k, v) { return (MAI.short[k] && MAI.short[k][v]) || v; }
  function tagHTML(k, v) {
    var c;
    if (k === 'sys') { c = sysCol(v); return '<span class="mtag" style="background:' + c[0] + ';color:' + c[1] + '">' + esc(v) + '</span>'; }
    if (k === 'type' && MAI.typeColors[v]) { c = MAI.typeColors[v]; return '<span class="mtag" style="background:' + c[0] + ';color:' + c[1] + '">' + esc(v) + '</span>'; }
    if (k === 'seen') return '<span class="mtag seen">✓ ' + esc(v) + '</span>';
    if (k === 'onset' || k === 'prog') return '<span class="mtag soft">' + esc(v) + '</span>';
    return '<span class="mtag o">' + esc(shortOf(k, v)) + '</span>';
  }
  function tagsHTML(d) {
    var h = d.star ? '<span class="mtag dup">ซ้ำ</span>' : '';
    ['sys', 'ward', 'type', 'gen', 'onset', 'prog'].forEach(function (k) { dVals(d, k).forEach(function (v) { h += tagHTML(k, v); }); });
    return h;
  }
  function selOf(st, k) { return st[k] ? st[k].split('|') : []; }
  function passes(d, st, skip) {
    for (var i = 0; i < FKEYS.length; i++) {
      var k = FKEYS[i]; if (k === skip) continue;
      var S = selOf(st, k); if (!S.length) continue;
      var dv = dVals(d, k);
      if (!(S.indexOf('~') >= 0 && !dv.length) && !dv.some(function (v) { return S.indexOf(v) >= 0; })) return false;
    }
    return true;
  }
  function textHit(d, q) {
    if (!q) return true;
    if (!d._hay) d._hay = (d.name + ' ' + d.aliases.join(' ') + ' ' + d.icd + ' ' + d.systems.join(' ') + ' ' + d.fields.map(function (f) { return f.value; }).join(' ')).toLowerCase();
    return q.split(/\s+/).every(function (w) { return d._hay.indexOf(w) >= 0; });
  }
  function filterDiseases(st) {
    var q = (st.q || '').toLowerCase().trim();
    return D.list.filter(function (d) { return textHit(d, q) && (st.e !== '1' || d.filled) && passes(d, st, null); });
  }
  function optsOf(k) {
    var seen = {}, out = [];
    function push(v) { if (v && !seen[v]) { seen[v] = 1; out.push(v); } }
    if (k === 'sys') Object.keys(MAI.sysColors).forEach(push);
    else if (k === 'seen') (D.people || []).forEach(push);
    else (MAI.order[k] || []).forEach(push);
    D.list.forEach(function (d) { dVals(d, k).forEach(push); });
    return out;
  }
  /* คู่ที่กด "ไม่ซ้ำ" เก็บใน maiok (ซิงก์เข้าบัญชี) — ซ่อนถาวรจนกว่าจะกดเอากลับ
     คู่ที่ไม่ถูกจับว่าน่าซ้ำแล้ว (แก้ชื่อ/ลบแถวในชีต) จะถูกล้างออกจาก maiok เอง */
  function dupBox(st) {
    var all = findDups(), ok = LS.get('maiok', []);
    if (D.src === 'sheet') {
      var live = ok.filter(function (k) { return all.some(function (p) { return p.key === k; }); });
      if (live.length !== ok.length) { ok = live; LS.set('maiok', ok); }
    }
    var vis = all.filter(function (p) { return ok.indexOf(p.key) < 0; }), hid = all.filter(function (p) { return ok.indexOf(p.key) >= 0; });
    if (!vis.length && !hid.length) return '';
    function one(d) { return '<a href="' + dHref(d) + '"><span class="muted">No. ' + esc(d.no) + '</span> ' + esc(d.name) + '</a>'; }
    function li(p, back) {
      return '<li' + (back ? ' class="hid"' : '') + '><div class="pair">' + one(p.a) + '<span class="muted" aria-label="กับ">↔</span>' + one(p.b) + '</div><div class="why">' + esc(p.why) + '</div>' +
        (back ? '<button class="chip sm" type="button" data-unok="' + esc(p.key) + '">เอากลับ</button>' : '<button class="chip sm" type="button" data-ok="' + esc(p.key) + '">ไม่ซ้ำ</button>') + '</li>';
    }
    var hidPart = hid.length ? '<button class="linkbtn" type="button" data-showhid aria-expanded="' + !!st.hid + '">' + (st.hid ? 'ซ่อนรายการ' : 'ดู') + 'คู่ที่กดว่าไม่ซ้ำไว้ (' + hid.length + ')</button>' +
      (st.hid ? '<ul class="mai-hidlist">' + hid.map(function (p) { return li(p, true); }).join('') + '</ul>' : '') : '';
    if (!vis.length) return '<section class="wrap" style="padding-bottom:16px"><div class="mai-dupok"><span class="muted">✓ ไม่มีโรคที่น่าซ้ำค้างอยู่</span>' + hidPart + '</div></section>';
    return '<section class="wrap" style="padding-bottom:22px"><details class="mai-dup"' + (vis.length <= 2 || window.innerWidth >= 760 ? ' open' : '') + '><summary><span class="bang" aria-hidden="true">!</span><span style="display:flex;flex-direction:column;gap:2px;min-width:0"><span class="k" style="font-size:18px">อาจเป็นโรคซ้ำ ' + vis.length + ' คู่</span><span class="muted" style="font-size:14px">พิมพ์ผิด ชื่อเดียวกันคนละแบบ หรือโรคเดียวกันคนละชื่อ — แก้ในชีต หรือกด “ไม่ซ้ำ” เพื่อซ่อน</span></span></summary><ul>' +
      vis.map(function (p) { return li(p, false); }).join('') + '</ul>' + (hidPart ? '<div class="mai-dupfoot">' + hidPart + '</div>' : '') + '</details></section>';
  }
  function letterOf(d) { var c = d.name.trim().charAt(0); c = ({ 'α': 'A', 'β': 'B', 'γ': 'G', 'δ': 'D' })[c] || c.toUpperCase(); return /[A-Z]/.test(c) ? c : '#'; }
  function rowHTML(d) {
    var ck = (D.people || []).map(function (p) { var on = d.seen.indexOf(p) >= 0; return '<span class="mai-cb' + (on ? ' on' : '') + '" role="img" aria-label="' + esc(p) + (on ? ' เคยดูคนไข้แล้ว' : ' ยังไม่เคยดู') + '">' + (on ? '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2 5 8.6 9.6 3.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '') + '</span>'; }).join('');
    return '<a class="mai-row' + (d.filled ? '' : ' blank') + '" href="' + dHref(d) + '">' + (ck ? '<span class="mai-ck">' + ck + '</span>' : '') + '<span class="mai-no">' + esc(d.no) + '</span><span class="mai-main"><span class="mai-name">' + esc(d.name) + '</span>' +
      '<span class="mai-tags">' + tagsHTML(d) + '</span></span>' + (d.filled ? '' : '<span class="sr">ยังไม่ได้เขียนรายละเอียด</span>') + '</a>';
  }
  function diseasesView(st) {
    var q = (st.q || '').toLowerCase().trim();
    var base = D.list.filter(function (d) { return textHit(d, q) && (st.e !== '1' || d.filled); });
    var list = base.filter(function (d) { return passes(d, st, null); });
    var nSel = 0;
    var bar = MAI.filters.map(function (f) {
      var n = selOf(st, f.key).length; nSel += n;
      return '<button class="chip mai-fb' + (n ? ' on' : '') + (st.open === f.key ? ' open' : '') + '" type="button" data-open="' + f.key + '" aria-expanded="' + (st.open === f.key) + '" aria-controls="maiPanel">' + esc(f.label) + (n ? ' <b>' + n + '</b>' : '') + '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>';
    }).join('');
    var panel = '';
    if (st.open && FKEYS.indexOf(st.open) >= 0) {
      var k = st.open, S = selOf(st, k), pool = base.filter(function (d) { return passes(d, st, k); });
      var cnt = {}, none = 0;
      pool.forEach(function (d) { var v = dVals(d, k); if (!v.length) none++; v.forEach(function (x) { cnt[x] = (cnt[x] || 0) + 1; }); });
      var f = MAI.filters.filter(function (x) { return x.key === k; })[0];
      panel = '<div class="mai-panel sheet" id="maiPanel" role="group" aria-label="' + esc(f.label) + '">' +
        optsOf(k).map(function (v) {
          var on = S.indexOf(v) >= 0, n = cnt[v] || 0, c = k === 'sys' ? sysCol(v) : null;
          return '<button class="mopt' + (on ? ' on' : '') + '" type="button" data-k="' + k + '" data-v="' + esc(v) + '" aria-pressed="' + on + '"' + (!n && !on ? ' disabled' : '') + '>' +
            (c ? '<span class="sw" style="background:' + c[0] + ';border:1px solid rgba(30,38,32,.18)"></span>' : '') + esc(k === 'gen' ? shortOf(k, v) : v) + '<span class="oc">' + n + '</span></button>';
        }).join('') +
        '<button class="mopt' + (S.indexOf('~') >= 0 ? ' on' : '') + '" type="button" data-k="' + k + '" data-v="~" aria-pressed="' + (S.indexOf('~') >= 0) + '"' + (!none && S.indexOf('~') < 0 ? ' disabled' : '') + '><i>' + (k === 'seen' ? 'ยังไม่มีใครดู' : 'ยังไม่ระบุ') + '</i><span class="oc">' + none + '</span></button></div>';
    }
    var act = '';
    FKEYS.forEach(function (k) {
      selOf(st, k).forEach(function (v) {
        act += '<button class="pill mai-x" type="button" data-k="' + k + '" data-v="' + esc(v) + '" aria-label="เอาตัวกรอง ' + esc(v) + ' ออก">' + esc(v === '~' ? (k === 'seen' ? 'ยังไม่มีใครดู' : MAI.filters.filter(function (f) { return f.key === k; })[0].label + ': ยังไม่ระบุ') : k === 'gen' ? shortOf(k, v) : v) + ' <span aria-hidden="true">×</span></button>';
      });
    });
    var groups = [], cur = null;
    var gm = {};
    list.forEach(function (d) { var L = letterOf(d); if (!gm[L]) { gm[L] = { L: L, items: [] }; groups.push(gm[L]); } gm[L].items.push(d); });
    groups.sort(function (x, y) { return x.L === '#' ? 1 : y.L === '#' ? -1 : x.L < y.L ? -1 : 1; });
    var az = groups.length > 3 ? '<nav class="mai-az" aria-label="ไปที่ตัวอักษร">' + groups.map(function (g) { return '<button type="button" data-jump="' + g.L + '">' + g.L + '</button>'; }).join('') + '</nav>' : '';
    var body = !list.length ? '<div class="empty"><p class="k" style="font-size:20px">ไม่พบโรคที่ตรงกับตัวกรอง</p><p class="muted">ลองล้างคำค้นหรือตัวกรอง</p></div>' :
      ((D.people || []).length ? '<div class="mai-ckhead" aria-hidden="true">' + D.people.map(function (p) { return '<span>' + esc(p) + '</span>'; }).join('') + '</div>' : '') +
      groups.map(function (g) { return '<h2 class="mai-letter" id="mai-L-' + (g.L === '#' ? 'x' : g.L) + '">' + g.L + '</h2>' + g.items.map(rowHTML).join(''); }).join('');
    var nBlank = list.filter(function (d) { return !d.filled; }).length;
    return { top: dupBox(st) +
      '<section class="wrap mai-tools"><div class="mai-fbar">' + bar + (nSel ? '<button class="linkbtn" type="button" data-clear>ล้างตัวกรอง</button>' : '') + '</div>' + panel +
      (act ? '<div class="mai-act">' + act + '</div>' : '') +
      '<div class="mai-count"><span class="muted">' + list.length + ' จาก ' + D.list.length + ' โรค' + (nBlank && st.e !== '1' ? ' · ยังว่าง ' + nBlank : '') + '</span>' +
      '<button class="chip sm' + (st.e === '1' ? ' on' : '') + '" type="button" data-e aria-pressed="' + (st.e === '1') + '">เฉพาะที่เขียนแล้ว</button></div>' + az + '</section>',
      list: '<section class="wrap mai-list" style="padding-bottom:80px">' + body + '</section>' };
  }
  PAGES.diseases = function (r) {
    var st = { q: r.q.get('q') || '', e: r.q.get('e') || '', open: '', hid: false };
    var v0 = diseasesView(st);
    FKEYS.forEach(function (k) { st[k] = r.q.get(k) || ''; });
    var n = D.src === 'sample' ? 0 : D.list.length;
    var ticks = '';
    for (var i = 1; i < 10; i++) ticks += 'M' + (1 + i * 37.8).toFixed(1) + ' 23v' + (i === 5 ? -12 : i % 2 ? -6 : -10);
    return {
      title: '1000 MAI', html:
        '<section class="wrap phead" style="padding-bottom:28px"><div style="flex:1 1 520px;min-width:0;display:flex;flex-direction:column;gap:16px"><span class="label">04 · พรรณไม้</span><h1>1000 MAI</h1>' +
        '<p class="lede">หอพรรณไม้ของโรค — รู้จักให้พอจะ diag ได้ รู้ว่าต้องส่ง lab อะไร และเริ่ม initial management ได้</p>' +
        '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px">' + liveHTML() + (hasSheet() ? '<button class="chip" type="button" id="reload" style="min-height:40px">ดึงใหม่</button>' : '') + '</div></div>' +
        '<div style="flex:0 1 380px;min-width:240px;display:flex;flex-direction:column;gap:10px"><div style="display:flex;align-items:baseline;gap:10px"><span class="k" style="font-size:64px;line-height:1">' + n + '</span><span class="muted" style="font-size:18px">/ 1000 โรค</span></div>' +
        '<svg viewBox="0 0 380 34" width="100%" aria-hidden="true"><rect x="1" y="1" width="378" height="22" rx="3" fill="#FBF9F3" stroke="#BDB39B"/><rect x="1" y="1" width="' + Math.max(0, Math.min(378, n * 0.378)) + '" height="22" rx="3" fill="#9B4F2E" opacity=".85"/><path d="' + ticks + '" stroke="#7A6E58" stroke-width="1"/><g font-family="Sarabun, sans-serif" font-size="10" fill="#5A6258"><text x="2" y="33">0</text><text x="182" y="33">500</text><text x="358" y="33">1000</text></g></svg></div></section>' +
        '<div id="dwrap"><div id="dtop">' + v0.top + '</div>' +
        '<section class="wrap mai-search"><label class="search" style="max-width:560px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A6258" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span class="sr">ค้นใน 1000 MAI</span><input type="search" id="dq" placeholder="ค้นชื่อโรค อาการ หรือ lab ที่นึกถึง…" value="' + esc(st.q) + '"></label></section>' +
        '<div id="dlist">' + v0.list + '</div></div>',
      after: function () {
        var body = document.getElementById('dwrap'), top = document.getElementById('dtop'), lst = document.getElementById('dlist');
        function paint() { var v = diseasesView(st); top.innerHTML = v.top; lst.innerHTML = v.list; }
        function upd(patch) { Object.keys(patch).forEach(function (k) { st[k] = patch[k]; }); var p = {}; Object.keys(patch).forEach(function (k) { if (k !== 'open') p[k] = patch[k]; }); setQuery(route(), p); paint(); }
        document.getElementById('dq').addEventListener('input', function () { upd({ q: this.value.trim() }); });
        body.addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b) return;
          if (b.hasAttribute('data-open')) { var k = b.getAttribute('data-open'); st.open = st.open === k ? '' : k; paint(); var fb = body.querySelector('[data-open="' + k + '"]'); if (fb) fb.focus(); }
          else if (b.hasAttribute('data-k')) {
            var key = b.getAttribute('data-k'), v = b.getAttribute('data-v'), S = selOf(st, key), at = S.indexOf(v);
            if (at >= 0) S.splice(at, 1); else S.push(v);
            var patch = {}; patch[key] = S.join('|'); upd(patch);
            var same = body.querySelector('.mopt[data-k="' + key + '"][data-v="' + (window.CSS && CSS.escape ? CSS.escape(v) : v) + '"]'); if (same) same.focus();
          }
          else if (b.hasAttribute('data-clear')) { var c = { open: '' }; FKEYS.forEach(function (k) { c[k] = ''; }); upd(c); }
          else if (b.hasAttribute('data-e')) upd({ e: st.e === '1' ? '' : '1' });
          else if (b.hasAttribute('data-jump')) { var L = b.getAttribute('data-jump'), t = document.getElementById('mai-L-' + (L === '#' ? 'x' : L)); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
          else if (b.hasAttribute('data-ok')) { var ok = LS.get('maiok', []); ok.push(b.getAttribute('data-ok')); LS.set('maiok', ok); paint(); toast('ซ่อนแล้ว — ดูหรือเอากลับได้ที่ “คู่ที่กดว่าไม่ซ้ำไว้”'); }
          else if (b.hasAttribute('data-unok')) { var k2 = b.getAttribute('data-unok'); LS.set('maiok', LS.get('maiok', []).filter(function (x) { return x !== k2; })); paint(); }
          else if (b.hasAttribute('data-showhid')) { st.hid = !st.hid; paint(); }
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
      title: 'ไม่พบโรค', html: '<section class="wrap phead"><div style="display:flex;flex-direction:column;gap:14px"><span class="label">1000 MAI</span><h1 style="font-size:44px">ไม่พบโรคนี้</h1><p class="muted">' + (D.loading ? 'กำลังดึงข้อมูลจาก Google Sheet…' : 'อาจถูกลบหรือเปลี่ยนชื่อในชีต') + '</p><a class="btn ghost" href="#/diseases" style="align-self:flex-start">กลับไป 1000 MAI</a></div></section>'
    };
    var s0 = d.systems[0] || '', col = s0 ? sysCol(s0) : [d.sys.c, '#fff'];
    remember({ href: dHref(d), title: d.name, crumb: '1000 MAI' + (s0 ? ' › ' + s0 : ''), c: col[0] });
    var idx = D.list.indexOf(d), prev = D.list[idx - 1], next = D.list[idx + 1];
    var rel = s0 ? D.list.filter(function (x) { return x !== d && x.systems.indexOf(s0) >= 0; }).sort(function (a, b) { return (b.filled ? 1 : 0) - (a.filled ? 1 : 0); }).slice(0, 8) : [];
    var sheetLink = C.sheet && C.sheet.id ? 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(C.sheet.id) + '/edit#gid=' + encodeURIComponent(C.sheet.gid || '0') + '&range=B' + d.row : '';
    var shown = [], empty = [], num = 0;
    d.groups.forEach(function (g) {
      var cols = g.cols.filter(function (c) { return c.role !== 'brief' && c.role !== 'alias'; });
      if (!cols.length) return;
      var full = cols.filter(function (c) { return c.value; });
      cols.forEach(function (c) { if (!c.value && c.role !== 'onset' && c.role !== 'prog') empty.push(c.sub ? g.label + ' › ' + c.sub : g.label); });
      if (!full.length) return;
      var one = cols.length === 1 && !cols[0].sub;
      shown.push('<section class="entry"><span class="num">' + roman(num++) + '</span><div><h2>' + esc(g.label) + '</h2>' +
        (one ? '<div class="val">' + rich(full[0].value) + '</div>' :
          full.map(function (c) {
            var v = c.role === 'onset' ? [c.value] : c.role === 'prog' ? splitMulti(c.value) : null;
            return '<div class="mai-sub"><h3>' + esc(c.sub || g.label) + '</h3>' + (v ? '<div class="mai-tags">' + v.map(function (x) { return tagHTML(c.role, x); }).join('') + '</div>' : '<div class="val">' + rich(c.value) + '</div>') + '</div>';
          }).join('')) + '</div></section>');
    });
    function lbl(k, v) { return v ? '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>' : ''; }
    var tags = tagsHTML(d);
    return {
      title: d.name, html:
        '<div class="wrap" style="padding-top:28px;padding-bottom:80px"><nav aria-label="ตำแหน่ง" style="font-size:15px;margin-bottom:28px"><a href="#/diseases">1000 MAI</a>' +
        (s0 ? '<span class="muted"> › </span><a href="#/diseases?sys=' + encodeURIComponent(s0) + '">' + esc(s0) + '</a>' : '') + '<span class="muted"> › </span><span>' + esc(d.name) + '</span></nav>' +
        '<div class="dsheet mai-d"><aside>' +
        '<div class="sheet mai-card" style="position:relative;padding:34px 24px 24px;display:flex;flex-direction:column;gap:14px;align-items:flex-start"><div class="tape" style="left:28px;margin-left:0;transform:rotate(-6deg)"></div>' +
        brush(col[0], 220) + '<span class="k" style="font-size:28px">' + esc(d.name) + '</span>' +
        (d.aliases.length ? '<span class="muted" style="font-size:15px">ชื่ออื่น: ' + d.aliases.map(esc).join(' · ') + '</span>' : '') + '</div>' +
        '<div class="hlabel"><div class="t">หอพรรณไม้โพยหมอ · HERBARIUM MEDICUM</div><dl>' +
        lbl('เลขในชีต', 'No. ' + esc(d.no)) + lbl('Ward', esc(d.ward)) +
        (d.systems.length ? '<div class="full"><dt>ระบบ</dt><dd class="mai-tags" style="padding-top:4px">' + d.systems.map(function (v) { return tagHTML('sys', v); }).join('') + '</dd></div>' : '') +
        lbl('ประเภท', esc(d.type)) + lbl('Genetic', esc(d.gen)) + lbl('ICD-10', esc(d.icd)) + lbl('เคยดูคนไข้', esc(d.seen.join(', '))) +
        lbl('เขียนแล้ว', d.filled + ' / ' + d.total + ' ช่อง') + lbl('แหล่งข้อมูล', D.src === 'sample' ? 'ข้อมูลตัวอย่าง' : 'Google Sheet แถว ' + d.row) +
        '</dl></div>' +
        '<div style="display:flex;flex-direction:column;gap:10px">' + (d.filled ? '<a class="btn" href="#/exam?src=' + encodeURIComponent('d:' + d.id) + '">สร้างข้อสอบจากโรคนี้</a>' : '') +
        (sheetLink ? '<a class="btn ghost" href="' + sheetLink + '" target="_blank" rel="noopener">แก้ข้อมูลใน Google Sheet ↗</a>' : '') + '</div></aside>' +
        '<article><div style="display:flex;flex-direction:column;gap:14px;padding-bottom:24px"><span class="label">No. ' + esc(d.no) + (d.ward ? ' · ' + esc(d.ward) : '') + '</span>' +
        '<h1 style="font-size:clamp(34px,5vw,60px)">' + esc(d.name) + '</h1>' +
        (tags ? '<div class="mai-tags">' + tags + '</div>' : '') +
        (d.brief ? '<div class="lede mai-brief">' + rich(d.brief) + '</div>' : '') + '</div>' +
        (shown.length ? shown.join('') : '<div class="empty" style="margin:8px 0 24px"><p class="k" style="font-size:20px">ยังไม่ได้เขียนรายละเอียดของโรคนี้</p><p class="muted">เพิ่มในชีตแล้วกลับมาหน้านี้ เว็บจะดึงให้เอง</p></div>') +
        (shown.length && empty.length ? '<details class="mai-empty"><summary class="muted">ช่องที่ยังไม่ได้เขียน (' + empty.length + ')</summary><div>' + empty.map(function (x) { return '<span class="pill">' + esc(x) + '</span>'; }).join('') + '</div></details>' : '') +
        (rel.length ? '<section style="border-top:1px solid var(--empty);padding-top:28px;margin-top:12px;display:flex;flex-direction:column;gap:10px"><span class="label">ระบบเดียวกัน · ' + esc(s0) + '</span><div style="display:flex;flex-wrap:wrap;gap:8px">' +
          rel.map(function (x) { return '<a class="pill' + (x.filled ? '' : ' mai-dim') + '" href="' + dHref(x) + '">' + esc(x.name) + '</a>'; }).join('') + '</div></section>' : '') +
        '<nav class="mai-pn" aria-label="โรคก่อนหน้าและถัดไป">' +
        (prev ? '<a href="' + dHref(prev) + '"><span class="muted" style="font-size:13px">← ก่อนหน้า</span><span class="k">' + esc(prev.name) + '</span></a>' : '<span></span>') +
        (next ? '<a href="' + dHref(next) + '" style="align-items:flex-end;text-align:right"><span class="muted" style="font-size:13px">ถัดไป →</span><span class="k">' + esc(next.name) + '</span></a>' : '') + '</nav>' +
        '<section style="margin-top:28px" class="sheet"><div style="padding:18px 20px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px"><div><div class="k" style="font-size:17px;font-weight:500">ข้อสอบเก่าที่เกี่ยวกับโรคนี้</div><p class="muted" style="font-size:15px">เปิดคลังข้อสอบเก่า MDCU แล้วค้นชื่อโรค</p></div><a class="btn ghost" href="' + esc(C.acUrl) + '" target="_blank" rel="noopener">เปิดคลังข้อสอบเก่า ↗</a></div></section>' +
        '</article></div></div>'
    };
  };

  /* =========================================================
     GOOGLE DOC "โพยหมอ" → Preclinic + Clinic
     ข้อมูลตั้งค่า: data/gdoc.js · ตัวแปลง HTML: gdoc.js · ฉบับเก็บ: gdoc/*.json
     โหลดฉบับเก็บก่อน (เร็ว) แล้วดึง Doc สดจาก Google มาแทนเมื่อสำเร็จ
     ========================================================= */
  var GD = window.POY_GDOC || null, GLIB = window.POY_GDOC_LIB;
  var G = { st: 'idle', err: '', live: 'off', liveAt: 0, snapAt: '', main: null, ex: {}, nodes: [], by: {}, byHead: {}, top: { pre: [], clinic: [] } };
  function gslug(s) { return String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'x'; }
  function gSpec() {
    var m = {};
    ((GD && GD.tree) || []).forEach(function (l, i) { var t = l.replace(/^\s+/, ''); m[t] = { d: Math.floor((l.length - t.length) / 2), i: i }; });
    return m;
  }
  function gFetchJSON(u) { return fetch(u + (u.indexOf('?') < 0 ? '?' : '&') + 'v=' + (window.POY_GDOC_V || 1)).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); }
  function gBuild() {
    var spec = gSpec(), hide = (GD.main.hide || []), nodes = [], by = {}, byHead = {}, used = {};
    function uniq(s) { var k = s, n = 2; while (used[k]) k = s + '-' + (n++); used[k] = 1; return k; }
    function add(n) { n.slug = uniq(n.slug); nodes.push(n); by[n.slug] = n; (n.heads || []).forEach(function (h) { byHead[h.id] = n; }); return n; }
    var tops = [], stack = [], prevDepth = 0;
    ((G.main && G.main.tabs) || []).forEach(function (t) {
      if (hide.indexOf(t.title) >= 0) return;
      var sp = spec[t.title], d = sp ? sp.d : prevDepth;
      d = Math.min(d, stack.length);
      var n = add({ title: t.title || '(แท็บไม่มีชื่อ)', html: t.html, heads: t.heads || [], kids: [], depth: d, kind: 'doc', src: 'main', slug: gslug(t.title) });
      stack.length = d;
      if (d === 0) tops.push(n); else { n.parent = stack[d - 1]; n.parent.kids.push(n); }
      stack.push(n); prevDepth = d;
    });
    function findTitle(title, pref) {
      var hit = null;
      if (pref) nodes.forEach(function (n) { if (!hit && n.src === pref && n.title === title) hit = n; });
      nodes.forEach(function (n) { if (!hit && n.src === 'main' && n.title === title) hit = n; });
      return hit;
    }
    (GD.extras || []).forEach(function (e) {
      var data = G.ex[e.snap], key = e.snap.replace(/^.*\/|\.json$/g, '');
      if (e.kind === 'sheet') {
        var parent = findTitle(e.under);
        if (!parent) return;
        var g = add({ title: e.title, html: '', heads: [], kids: [], kind: 'sheets', src: key, from: e.from, at: data ? data.at : '', pending: !data, snap: e.snap, slug: key });
        g.parent = parent; parent.kids.push(g);
        if (data) data.sheets.forEach(function (s) {
          var c = add({ title: s.title, html: s.html, css: s.css, scope: s.scope, heads: [], kids: [], kind: 'sheet', src: key, from: e.from, at: data.at, slug: key + '-' + gslug(s.title) });
          c.parent = g; g.kids.push(c);
        });
      } else if (data) {
        (e.tabs || []).forEach(function (m) {
          var t = data.tabs.filter(function (x) { return x.title === m.tab; })[0];
          var parent = findTitle(m.under, key);
          if (!t || !parent) return;
          var n = add({ title: t.title, html: t.html, heads: t.heads || [], kids: [], kind: 'doc', src: key, from: e.from, at: data.at, slug: key + '-' + gslug(t.title) });
          n.parent = parent; parent.kids.push(n);
        });
      }
    });
    function fill(n, area, ck, top, d) { n.area = area; n.ck = ck; n.topN = top; n.depth = d; n.kids.forEach(function (k) { fill(k, area, ck, top, d + 1); }); }
    var T = { pre: [], clinic: [] };
    tops.forEach(function (n) { var ck = (GD.clinic || {})[n.title] || ''; fill(n, ck ? 'clinic' : 'pre', ck, n, 0); T[ck ? 'clinic' : 'pre'].push(n); });
    G.nodes = nodes; G.by = by; G.byHead = byHead; G.top = T;
    gPaintDrawer();
  }
  function gLook(n) { var t = n.topN || n, l = (GD.look || {})[t.title]; return l ? { c: l[0], pig: l[1], th: l[2] } : { c: '#5A6258', pig: '', th: '' }; }
  function gHref(n, to) { return (n.area === 'clinic' ? '#/clinic/doc/' : '#/preclinic/') + encodeURIComponent(n.slug) + (to ? '?to=' + encodeURIComponent(to) : ''); }
  function gFull(n) { return !!(n.html && n.html.replace(/<[^>]+>/g, '').trim()) || (n.kind === 'sheet' && n.html); }
  function gCount(n) { var a = 0, b = 0; (function w(x) { b++; if (gFull(x)) a++; x.kids.forEach(w); })(n); return [a, b]; }
  function gFlat(n) { var o = []; (function w(x) { o.push(x); x.kids.forEach(w); })(n); return o; }
  function gPath(n) { var p = []; while (n) { p.unshift(n); n = n.parent; } return p; }
  function gRefresh(liveOnly) {
    var r = route();
    if (r.name === 'preclinic' || r.name === 'clinic' || r.name === '' || (!liveOnly && r.name === 'exam')) render(true);
  }
  function gLoad() {
    if (!GD || G.st !== 'idle') return;
    G.st = 'loading';
    var docExtras = (GD.extras || []).filter(function (e) { return e.kind !== 'sheet'; });
    Promise.all([gFetchJSON(GD.main.snap)].concat(docExtras.map(function (e) { return gFetchJSON(e.snap).then(function (j) { G.ex[e.snap] = j; }, function (x) { console.warn('gdoc extra', e.snap, x); }); })))
      .then(function (res) { G.main = res[0]; G.snapAt = res[0].at || ''; G.st = 'ready'; gBuild(); })
      .catch(function (e) { G.st = 'err'; G.err = e.message || String(e); })
      .then(function () { gRefresh(false); gLive(); });
  }
  /* ดึง Doc สด — export HTML ของ Google (Doc ต้องแชร์ Anyone with the link) */
  function gLive() {
    if (!GD || !GD.main.live || !GD.main.id || !GLIB || G.live === 'loading') return;
    G.live = 'loading';
    fetch('https://docs.google.com/document/d/' + GD.main.id + '/export?format=html&t=' + Date.now(), { cache: 'no-store', credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (h) {
        var o = GLIB.parse(h, {});
        if (!o.tabs.length || !o.tabs.some(function (t) { return t.title; })) throw new Error('ไม่พบแท็บใน Doc (อาจยังไม่ได้แชร์ Anyone with the link)');
        G.main = { tabs: o.tabs, at: '' }; G.live = 'ok'; G.liveAt = Date.now(); G.liveErr = '';
        if (G.st !== 'ready') G.st = 'ready';
        gBuild(); gRefresh(true);
      })
      .catch(function (e) { console.warn('gdoc live', e); G.live = 'fail'; G.liveErr = e.message || String(e); G.liveAt = Date.now(); gPaintLive(); });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && G.st === 'ready' && G.live !== 'loading' && Date.now() - G.liveAt > 10 * 60 * 1000) gLive();
  });
  /* ชีตโหลดเมื่อจำเป็น (ไฟล์ใหญ่) */
  function gNeedSheets(nodes) {
    var need = [];
    nodes.forEach(function (n) { if (n.kind === 'sheets' && n.pending && !n.loading) need.push(n); });
    need.forEach(function (n) {
      n.loading = true;
      gFetchJSON(n.snap).then(function (j) { G.ex[n.snap] = j; gBuild(); gRefresh(true); }, function (e) { n.loading = false; n.err = e.message || String(e); gRefresh(true); });
    });
  }
  /* ลิงก์ตรงไปชีตที่ยังไม่ได้โหลด → โหลดตารางทั้งหมดที่ค้างก่อน */
  function gPendingSheets() {
    var p = G.nodes.filter(function (n) { return n.kind === 'sheets' && n.pending && !n.err; });
    gNeedSheets(p);
    return p.length > 0;
  }
  function gLiveHTML() {
    if (!GD || !GD.main.live) return '<span class="live off" data-glive><i></i>ฉบับวันที่ ' + esc(G.snapAt) + '</span>';
    if (G.live === 'ok') return '<span class="live" data-glive><i></i>ดึงสดจาก Google Doc · ' + esc(fmtTime(new Date(G.liveAt))) + '</span>';
    if (G.live === 'fail') return '<span class="live err" data-glive title="' + esc(G.liveErr || '') + '"><i></i>ดึง Doc สดไม่ได้ · ใช้ฉบับวันที่ ' + esc(G.snapAt) + '</span>';
    return '<span class="live off" data-glive><i></i>กำลังดึง Doc สด… (ระหว่างนี้ใช้ฉบับวันที่ ' + esc(G.snapAt) + ')</span>';
  }
  function gPaintLive() { document.querySelectorAll('[data-glive]').forEach(function (el) { el.outerHTML = gLiveHTML(); }); }
  function gSrcLine(n) {
    if (n.src === 'main') return gLiveHTML();
    return '<span class="muted" style="font-size:14px">จาก ' + esc(n.from || '') + ' · ดึงไว้เมื่อ ' + esc(n.at || '') + ' (ไม่อัปเดตเอง)</span>';
  }
  function gPaintDrawer() {
    var box = document.getElementById('dsub-preclinic');
    if (!box) return;
    box.innerHTML = G.top.pre.map(function (n) { return '<a href="' + gHref(n) + '" data-r="preclinic/' + esc(n.slug) + '">' + esc(n.title) + '</a>'; }).join('');
  }
  function gText(n) {
    if (n._t != null) return n._t;
    var h = String(n.html || '').replace(/<\/(p|h\d|li|tr|figure)>/g, '$&\n').replace(/<br>/g, '\n').replace(/<\/td>/g, ' | ');
    var div = document.createElement('div'); div.innerHTML = h.replace(/<style[\s\S]*?<\/style>/g, '');
    n._t = div.textContent.replace(/[ \t ]+/g, ' ').replace(/ ?\| ?\n/g, '\n').replace(/\n\s*\n+/g, '\n').trim();
    return n._t;
  }
  function gWaiting(area) {
    var msg = G.st === 'err' ? '<p class="warn">โหลดสรุปจาก Google Doc ไม่สำเร็จ: ' + esc(G.err) + '</p>' : '<p class="muted"><span class="spin" aria-hidden="true"></span> กำลังเปิดสรุปจาก Google Doc…</p>';
    return '<section class="wrap" style="padding:24px 32px 80px"><div class="empty" style="text-align:left">' + msg + '</div></section>';
  }
  /* ---------- หน้าของแต่ละแท็บ ---------- */
  function gTreeNav(top, cur) {
    var path = gPath(cur);
    function item(n) {
      var on = n === cur, open = path.indexOf(n) >= 0;
      var s = '<a href="' + gHref(n) + '" class="gti-a' + (on ? ' on' : '') + (gFull(n) || n.kind === 'sheets' ? '' : ' gempty') + '" style="--d:' + (n.depth - top.depth) + '"' + (on ? ' aria-current="page"' : '') + '>' +
        (n.kind === 'sheets' ? '<span class="gico" aria-hidden="true">▦</span>' : n.kind === 'sheet' ? '<span class="gico" aria-hidden="true">▤</span>' : '') + '<span>' + esc(n.title) + '</span>' + (n.src !== 'main' && n.kind === 'doc' ? '<span class="gsrc">DocQ</span>' : '') + '</a>';
      if (on && n.heads && n.heads.length) {
        var hs = n.heads.filter(function (h) { return h.l <= 2 && h.t; }).slice(0, 80);
        if (hs.length) s += '<div class="gtoc" style="--d:' + (n.depth - top.depth) + '">' + hs.map(function (h) { return '<a href="' + gHref(n, h.id) + '" class="l' + h.l + '">' + esc(h.t) + '</a>'; }).join('') + '</div>';
      }
      if (n.kids.length && (open || n.depth - top.depth < 1 || n.kind !== 'sheets')) s += n.kids.map(item).join('');
      return s;
    }
    var lk = gLook(top);
    return '<details class="gtree" open><summary><span class="sw" style="background:' + lk.c + ';width:18px;height:18px"></span><span class="k" style="font-size:19px">' + esc(top.title) + '</span>' + (top.kids.length ? '<span class="muted gtc">' + top.kids.length + ' หัวข้อย่อย</span>' : '') + '<span class="gchev" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 9.5l5.5 5.5 5.5-5.5"/></svg></span><span class="sr">สารบัญ</span></summary>' +
      '<nav class="tree" aria-label="แท็บใน ' + esc(top.title) + '">' + item(top) + '</nav></details>';
  }
  function gKidCards(n) {
    if (!n.kids.length) return '';
    return '<div class="gkids">' + n.kids.map(function (k) {
      var c = gCount(k);
      return '<a class="sheet gkid" href="' + gHref(k) + '"><span class="k" style="font-size:17px;font-weight:500">' + (k.kind === 'sheets' ? '▦ ' : k.kind === 'sheet' ? '▤ ' : '') + esc(k.title) + '</span>' +
        '<span class="muted" style="font-size:13px">' + (k.kind === 'sheets' ? (k.kids.length ? k.kids.length + ' ชีต' : 'ตาราง') : k.kind === 'sheet' ? 'ชีต' : (gFull(k) ? 'มีเนื้อหา' : 'ยังว่าง') + (c[1] > 1 ? ' · ' + (c[1] - 1) + ' แท็บย่อย' : '')) + (k.src !== 'main' && k.kind === 'doc' ? ' · DocQ' : '') + '</span></a>';
    }).join('') + '</div>';
  }
  function gSheetBody(n) {
    var sibs = n.parent ? n.parent.kids : [n];
    return '<div class="gsheets"><nav class="gstabs" aria-label="ชีต">' + sibs.map(function (s) { return '<a class="chip' + (s === n ? ' on" aria-current="page' : '') + '" href="' + gHref(s) + '">' + esc(s.title) + '</a>'; }).join('') + '</nav>' +
      (n.html ? '<style>' + n.css + '</style><div class="gsheet ' + esc(n.scope) + '"><div class="gsw">' + n.html + '</div></div>' : '<div class="empty"><p class="muted">ชีตนี้ว่าง</p></div>') + '</div>';
  }
  function gNodePage(n, r) {
    var top = n.topN || n, lk = gLook(top), path = gPath(n);
    gNeedSheets(gFlat(top));
    remember({ href: gHref(n), title: n.title, crumb: (n.area === 'clinic' ? 'Clinic › ' : 'Preclinic › ') + path.slice(0, -1).map(function (x) { return x.title; }).join(' › '), c: lk.c });
    var flat = gFlat(top).filter(function (x) { return x.kind !== 'sheets' || true; }), i = flat.indexOf(n), prev = flat[i - 1], next = flat[i + 1];
    var crumb = path.map(function (x, k) { return k === path.length - 1 ? '<span>' + esc(x.title) + '</span>' : '<a href="' + gHref(x) + '">' + esc(x.title) + '</a>'; }).join('<span class="muted"> › </span>');
    var body;
    if (n.kind === 'sheet') body = gSheetBody(n);
    else if (n.kind === 'sheets') body = n.pending ? (n.err ? '<p class="warn">โหลดตารางไม่สำเร็จ: ' + esc(n.err) + '</p>' : '<p class="muted"><span class="spin" aria-hidden="true"></span> กำลังเปิดตาราง…</p>') :
      '<p class="muted">แยกตามชีตเหมือนในไฟล์เดิม — เลือกชีตด้านล่าง</p>' + gKidCards(n);
    else body = (gFull(n) ? '<div class="gdoc">' + n.html + '</div>' : '<div class="empty" style="text-align:left"><p class="muted">แท็บนี้ยังไม่มีเนื้อหาใน Doc' + (n.kids.length ? ' — มีแท็บย่อยด้านล่าง' : '') + '</p></div>') +
      (n.kids.length ? '<div class="gsub"><span class="label">แท็บย่อยใน ' + esc(n.title) + '</span>' + gKidCards(n) + '</div>' : '');
    var tools = (gFull(n) ? '<a class="chip" href="#/exam?src=' + encodeURIComponent('g:' + n.slug) + '">สร้างข้อสอบจากหน้านี้</a>' : '') +
      (n.src === 'main' ? '<a class="chip" href="https://docs.google.com/document/d/' + esc(GD.main.id) + '/edit" target="_blank" rel="noopener">เปิด Doc ต้นฉบับ ↗</a>' : '');
    var art = '<article class="sheet doc gdocart"><div style="display:flex;flex-direction:column;gap:10px"><nav class="muted" aria-label="ตำแหน่ง" style="font-size:14px">' + (n.area === 'clinic' ? '<a href="#/clinic">Clinic</a>' : '<a href="#/preclinic">Preclinic</a>') + '<span class="muted"> › </span>' + crumb + '</nav>' +
      '<h2 style="overflow-wrap:anywhere">' + esc(n.title) + '</h2>' + gSrcLine(n) + (tools ? '<div style="display:flex;flex-wrap:wrap;gap:8px">' + tools + '</div>' : '') + '</div>' + body +
      '<nav aria-label="หน้าก่อนหน้าและถัดไป" class="gpn">' +
      (prev ? '<a href="' + gHref(prev) + '"><span class="muted" style="font-size:13px">← ก่อนหน้า</span><span class="k" style="font-size:17px;font-weight:500">' + esc(prev.title) + '</span></a>' : '<span></span>') +
      (next ? '<a href="' + gHref(next) + '" style="align-items:flex-end;text-align:right"><span class="muted" style="font-size:13px">ถัดไป →</span><span class="k" style="font-size:17px;font-weight:500">' + esc(next.title) + '</span></a>' : '') + '</nav></article>';
    return {
      title: n.title,
      html: '<div class="wrap reader greader">' + gTreeNav(top, n) + art + '</div>',
      after: gAfter
    };
  }
  function gAfter() {
    var t = document.querySelector('.gtree');
    if (t && window.matchMedia('(max-width: 899px)').matches) t.open = false;
    document.querySelectorAll('.gdoc [data-anchor]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var id = a.getAttribute('data-anchor'), el = document.getElementById(id);
        if (el) { el.scrollIntoView(); return; }
        var n = G.byHead[id]; if (n) location.hash = gHref(n, id);
      });
    });
    document.querySelectorAll('.gdoc img').forEach(function (im) { im.addEventListener('error', function () { im.alt = 'โหลดรูปไม่ได้'; im.classList.add('gbad'); }); });
  }
  /* ---------- ค้นในสรุป ---------- */
  function gSearchHTML(q, area) {
    var ql = q.toLowerCase(), hits = [];
    G.nodes.forEach(function (n) {
      if (area && n.area !== area) return;
      var t = gText(n), i = t.toLowerCase().indexOf(ql), ti = n.title.toLowerCase().indexOf(ql) >= 0;
      if (i < 0 && !ti) return;
      var snip = '';
      if (i >= 0) { var a = Math.max(0, i - 50); snip = (a ? '…' : '') + esc(t.slice(a, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length, i + q.length + 70)) + '…'; }
      hits.push('<a href="' + gHref(n) + '"><span class="pn"><span class="sw" style="background:' + gLook(n).c + '"></span></span><span><b>' + esc(gPath(n).map(function (x) { return x.title; }).join(' › ')) + '</b>' + (snip ? '<small>' + snip.replace(/\n/g, ' ') + '</small>' : '') + '</span></a>');
    });
    return '<span class="label">พบ ' + hits.length + ' หน้า' + (hits.length > 80 ? ' · แสดง 80 แรก' : '') + '</span>' + hits.slice(0, 80).join('');
  }
  function gSearchBar(area, ph) {
    return '<div class="sxbar"><form class="search sxsearch" id="gsf" role="search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A6258" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
      '<label class="sr" for="gq3">ค้นในสรุป</label><input id="gq3" type="search" placeholder="' + esc(ph) + '" data-area="' + area + '"></form>' + gLiveHTML() + '</div><div id="gres" class="sxres" hidden></div>';
  }
  function gSearchAfter() {
    var inp = document.getElementById('gq3'), res = document.getElementById('gres'), t = null;
    if (!inp) return;
    function run() {
      var v = inp.value.trim();
      if (v.length < 2) { res.hidden = true; res.innerHTML = ''; return; }
      res.hidden = false; res.innerHTML = gSearchHTML(v, inp.getAttribute('data-area'));
    }
    inp.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 220); });
    document.getElementById('gsf').addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(t); run(); });
  }
  function gTopCard(n) {
    var lk = gLook(n), c = gCount(n);
    return '<a class="sheet sys" href="' + gHref(n) + '">' +
      '<svg width="100%" height="30" viewBox="0 0 240 34" preserveAspectRatio="none" aria-hidden="true"><path d="M3 18 C30 6 90 4 160 9 C200 12 228 14 237 19 C214 28 150 31 86 29 C44 28 12 25 3 18Z" fill="' + lk.c + '" opacity=".88"/></svg>' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><h3 style="font-size:20px;overflow-wrap:anywhere">' + esc(n.title) + '</h3>' + (lk.pig ? '<span class="muted" style="font-size:12px;font-style:italic;white-space:nowrap">' + esc(lk.pig) + '</span>' : '') + '</div>' +
      (lk.th ? '<span class="muted" style="font-size:15px">' + esc(lk.th) + '</span>' : '') +
      '<span style="font-size:14px;margin-top:auto;border-top:1px dashed var(--rule);padding-top:10px">' + (n.kids.length ? esc(n.kids.slice(0, 4).map(function (k) { return k.title; }).join(' · ')) + (n.kids.length > 4 ? ' …' : '') : 'แท็บเดียว') + '</span>' +
      '<span class="muted" style="font-size:13px">' + c[0] + ' / ' + c[1] + ' หน้ามีเนื้อหา</span></a>';
  }

  /* =========================================================
     PRECLINIC
     ========================================================= */
  PAGES.preclinic = function (r) {
    gLoad();
    var head = '<section class="wrap phead"><div style="flex:1 1 520px;min-width:0;display:flex;flex-direction:column;gap:16px"><span class="label">01 · ราก · ปี 1–3</span><h1>Preclinic</h1>' +
      '<p class="lede">สรุปจาก Google Doc <b>' + esc(GD ? GD.main.name : '') + '</b> — แยกตามแท็บเดิมของ Doc ทุกแท็บ แก้ใน Doc แล้วหน้านี้เปลี่ยนตามเอง</p></div></section>';
    if (G.st !== 'ready') return { title: 'Preclinic', html: head + gWaiting('pre') };
    if (r.args[0]) {
      var n = G.by[r.args[0]];
      if (n && n.area === 'clinic') { location.replace(gHref(n)); return { title: n.title, html: '' }; }
      if (n) return gNodePage(n, r);
      if (gPendingSheets()) return { title: 'Preclinic', html: head + gWaiting('pre') };
    }
    remember({ href: '#/preclinic', title: 'Preclinic', crumb: 'หน้าหลัก', c: '#3E7CA6' });
    return {
      title: 'Preclinic', html: head +
        '<section class="wrap" style="padding-bottom:22px;display:flex;flex-direction:column;gap:14px">' + (r.args[0] ? '<p class="warn">ไม่พบแท็บนี้ใน Doc แล้ว — อาจถูกเปลี่ยนชื่อ</p>' : '') + gSearchBar('pre', 'ค้นในสรุป preclinic ทุกแท็บ…') + '</section>' +
        '<section class="wrap" style="padding-bottom:72px"><div class="syss">' + G.top.pre.map(gTopCard).join('') + '</div></section>',
      after: gSearchAfter
    };
  };

  /* =========================================================
     CLINIC
     ========================================================= */
  PAGES.clinic = function (r) {
    if (r.args[0] === 'symp') return sympPage(r);
    if (r.args[0] === 'skills') return skillsPage(r);
    if (r.args[0] === 'doc' || r.args[0] === 'ward') return gClinicDoc(r);
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
        '<p class="lede">เข้าได้สามทาง: ตามวอร์ดที่วนอยู่ ตามอาการนำของคนไข้ หรือตามงานที่ต้องทำบนวอร์ด — ทุกทางกดต่อไปหาแผ่นตัวอย่างใน 1000 MAIได้</p>' + clinicTabs('') + '</div></section>' +
        '<section style="padding-bottom:48px"><div class="wrap" style="display:flex;flex-direction:column;gap:14px"><span class="label">ชั้นหนังสือ · สมุดวอร์ด</span><div style="overflow-x:auto;padding:12px 2px 0"><div class="shelf">' + books + '</div></div>' +
        '<p class="muted" style="font-size:15px">ตอนนี้แต่ละเล่มเปิดไปคลังข้อสอบเก่า MDCU · เนื้อหาในสมุดวอร์ดจะทยอยเพิ่ม</p></div></section>' +
        '<section class="band" style="padding:40px 0 80px"><div class="wrap" style="display:flex;flex-wrap:wrap;gap:40px 48px;align-items:flex-start">' +
        '<article class="sheet" style="flex:999 1 600px;min-width:0;padding:clamp(22px,4vw,44px);display:flex;flex-direction:column;gap:26px"><div style="display:flex;flex-direction:column;gap:10px"><span class="muted" style="font-size:14px">Clinic › ตามอาการนำ › ' + esc(ap.group) + '</span><h2 style="font-size:36px">' + esc(ap.title) + '</h2><p class="muted">' + esc(ap.sub) + '</p></div><div style="display:flex;flex-direction:column">' + steps + '</div></article>' +
        '<aside style="flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:16px"><span class="label">อาการนำอื่น · Symptomatology &amp; Approach</span><div style="display:flex;flex-wrap:wrap;gap:8px">' +
        (SY.chapters.length ? SY.chapters.filter(function (c) { return c.g !== 'base'; }).map(function (c) { return '<a class="pill" href="#/clinic/symp/' + c.id + '"><span class="sw" style="background:' + syGroup(c).c + '"></span>' + esc(c.th) + '</a>'; }).join('') :
          CLI.more.map(function (m) { return '<span class="chip" style="cursor:default;opacity:.75">' + esc(m) + '</span>'; }).join('')) + '</div>' +
        '<a class="chip" href="#/clinic/symp" style="align-self:flex-start">ดูทุกบท →</a>' +
        '<span class="label" style="margin-top:12px">ทักษะบนวอร์ด</span><div class="sheet" style="display:flex;flex-direction:column">' +
        CLI.tools.map(function (t, i) { return '<div class="tool"' + (i < CLI.tools.length - 1 ? ' style="border-bottom:1px dashed var(--rule)"' : '') + '><span class="k" style="font-size:17px;font-weight:500">' + esc(t[0]) + '</span><span class="muted" style="font-size:14px">' + esc(t[1]) + '</span></div>'; }).join('') + '</div>' +
        '<a class="sheet tool" href="' + esc(C.acUrl) + '" target="_blank" rel="noopener" style="margin-top:8px;border:1.5px solid var(--ink)"><span class="label">เชื่อมกับ</span><span class="k" style="font-size:18px;font-weight:500">คลังข้อสอบเก่า MDCU ↗</span></a>' +
        '</aside></div></section>'
    };
  };

  /* =========================================================
     CLINIC › Clinical skills · Symptomatology & Approach
     ตำราอายุรศาสตร์ อาการวิทยา (ศิริราช) — เนื้อหาแต่ละบทอยู่ใน docs/symp/chNN.json
     ========================================================= */
  var SY = window.POY_SYMP || { v: 1, groups: [], chapters: [], book: {} };
  var SYD = {}, SYS_SEARCH = { d: null, L: false, E: '' };
  function syCh(key) { key = String(key || ''); return SY.chapters.filter(function (c) { return c.id === key || String(c.no) === key; })[0] || null; }
  function syGroup(c) { return SY.groups.filter(function (g) { return g.id === c.g; })[0] || { c: '#5C7F3A', t: '' }; }
  function syLoad(c) {
    var s = SYD[c.no] || (SYD[c.no] = {});
    if (s.d || s.L || s.E) return s.d || null;
    s.L = true;
    fetch('symp/' + c.file + '?v=' + SY.v).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { s.d = j; }).catch(function (e) { s.E = e.message || String(e); }).then(function () {
        s.L = false; var r = route(); if (r.name === 'clinic' && r.args[0] === 'symp' && r.args[1] === c.id) render(true);
      });
    return null;
  }
  function sySearchLoad(cb) {
    if (SYS_SEARCH.d) return cb();
    if (SYS_SEARCH.L) return;
    SYS_SEARCH.L = true;
    fetch('symp/search.json?v=' + SY.v).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { SYS_SEARCH.d = j; }).catch(function (e) { SYS_SEARCH.E = e.message || String(e); }).then(function () { SYS_SEARCH.L = false; cb(); });
  }
  function clinicTabs(cur) {
    return '<div class="subtabs" aria-label="ส่วนของ Clinic">' + [['', 'ภาพรวม · สมุดวอร์ด'], ['skills', 'Clinical skills'], ['symp', 'Symptomatology & Approach'], ['ward', 'สรุปวอร์ด']].map(function (x) {
      return '<a class="chip' + (x[0] === cur ? ' on" aria-current="page' : '') + '" href="#/clinic' + (x[0] ? '/' + x[0] : '') + '">' + x[1] + '</a>';
    }).join('') + '</div>';
  }
  function clinicHead(cur, crumb, h1, lede) {
    return '<section class="wrap phead" style="padding-bottom:24px"><div style="display:flex;flex-direction:column;gap:14px;min-width:0;max-width:100%">' +
      (crumb ? '<nav aria-label="ตำแหน่ง" style="font-size:15px">' + crumb + '</nav>' : '<span class="label">02 · ลำต้น · ปี 4–6</span>') +
      '<h1 style="font-size:clamp(36px,5vw,64px);overflow-wrap:anywhere">' + h1 + '</h1>' + (lede ? '<p class="lede">' + lede + '</p>' : '') + clinicTabs(cur) + '</div></section>';
  }
  var SY_SRC = '<span class="src si">ศิริราช</span>';
  function syBookLine() { return esc(SY.book.title || '') + ' · ' + esc(SY.book.by || '') + ' · ' + esc(SY.book.ed || ''); }

  /* ---------- Clinical skills ---------- */
  /* แท็บหลักของ Doc โพยหมอที่อยู่ฝั่ง Clinic (ตั้งใน data/gdoc.js → clinic) */
  function gClinicTops(ck) { return G.top.clinic.filter(function (n) { return n.ck === ck; }); }
  function gClinicBlock(ck, label) {
    if (G.st !== 'ready') return gWaiting('clinic').replace('<section class="wrap" style="padding:24px 32px 80px">', '<div>').replace(/<\/section>$/, '</div>');
    var tops = gClinicTops(ck);
    if (!tops.length) return '';
    return '<div style="display:flex;flex-direction:column;gap:12px"><span class="label">' + label + '</span>' +
      '<div class="syss">' + tops.map(gTopCard).join('') + '</div></div>';
  }
  function skillsPage() {
    gLoad();
    remember({ href: '#/clinic/skills', title: 'Clinical skills', crumb: 'Clinic', c: '#5C7F3A' });
    var rel = SY.chapters.filter(function (c) { return c.g === 'base'; });
    return {
      title: 'Clinical skills', html: clinicHead('skills', '<a href="#/clinic">Clinic</a><span class="muted"> › </span><span>Clinical skills</span>', 'Clinical skills',
        'ทักษะทางคลินิก — ซักประวัติ ตรวจร่างกาย หัตถการ จาก Google Doc ' + esc(GD ? GD.main.name : '') + ' (แยกตามแท็บเดิม อัปเดตเองเมื่อแก้ Doc)') +
        '<section class="wrap" style="padding-bottom:80px;display:flex;flex-direction:column;gap:28px">' +
        (G.st === 'ready' ? gSearchBar('clinic', 'ค้นในสรุปฝั่ง clinic…') : '') +
        gClinicBlock('skills', 'จาก Google Doc ' + esc(GD ? GD.main.name : '')) +
        (rel.length ? '<div style="display:flex;flex-direction:column;gap:12px"><span class="label">ที่เกี่ยวข้องใน Symptomatology &amp; Approach</span><div class="sxcards">' + rel.map(syCard).join('') + '</div></div>' : '') +
        '</section>',
      after: gSearchAfter
    };
  }
  /* #/clinic/ward = แท็บ Clinic ของ Doc · #/clinic/doc/<แท็บ> = แท็บใดก็ได้ฝั่ง clinic */
  function gClinicDoc(r) {
    gLoad();
    var crumb = '<a href="#/clinic">Clinic</a><span class="muted"> › </span><span>สรุปวอร์ด</span>';
    if (G.st !== 'ready') return { title: 'Clinic', html: clinicHead(r.args[0] === 'ward' ? 'ward' : '', crumb, 'สรุปวอร์ด', '') + gWaiting('clinic') };
    var n = r.args[0] === 'ward' ? gClinicTops('ward')[0] : G.by[r.args[1]];
    if (!n && gPendingSheets()) return { title: 'Clinic', html: clinicHead('', crumb, 'สรุปวอร์ด', '') + gWaiting('clinic') };
    if (n && n.area === 'pre') { location.replace(gHref(n)); return { title: n.title, html: '' }; }
    if (!n) return { title: 'ไม่พบแท็บ', html: clinicHead('', crumb, 'ไม่พบแท็บนี้', 'อาจถูกเปลี่ยนชื่อใน Doc แล้ว — <a href="#/clinic/skills">ไป Clinical skills</a>') };
    var res = gNodePage(n, r);
    var cur = n.ck === 'skills' ? 'skills' : n.ck === 'symp' ? 'symp' : 'ward';
    res.html = '<div style="padding-top:8px">' + '<div class="wrap" style="padding-top:20px;padding-bottom:18px">' + clinicTabs(cur) + '</div>' + res.html + '</div>';
    return res;
  }

  /* ---------- หน้ารวมบท ---------- */
  function syCard(c) {
    var g = syGroup(c);
    return '<a class="sheet sxcard" href="#/clinic/symp/' + c.id + '" style="--g:' + g.c + '"><span class="sxno">บทที่ ' + c.no + '</span><h3>' + esc(c.th) + '</h3><span class="sxen">' + esc(c.en) + '</span>' +
      '<span class="sxmeta">' + c.n + ' หัวข้อ' + (c.f ? ' · ' + c.f + ' algorithm' : '') + (c.i ? ' · ' + c.i + ' รูป' : '') + '</span></a>';
  }
  function gSympCard() {
    gLoad();
    if (G.st !== 'ready') return '';
    var n = gClinicTops('symp')[0];
    if (!n) return '';
    var lk = gLook(n), c = gCount(n);
    return '<a class="sheet gsymp" href="' + gHref(n) + '" style="--g:' + lk.c + '"><span class="label">สรุปของฉัน · Google Doc ' + esc(GD.main.name) + '</span><span class="k" style="font-size:22px">' + esc(n.title) + '</span>' +
      '<span class="muted" style="font-size:14px">' + esc((n.heads || []).filter(function (h) { return h.l === 1 && h.t; }).slice(0, 12).map(function (h) { return h.t; }).join(' · ')) + '</span><span class="muted" style="font-size:13px">' + c[0] + ' / ' + c[1] + ' หน้ามีเนื้อหา · อัปเดตเองเมื่อแก้ Doc</span></a>';
  }
  function sympHub(r) {
    remember({ href: '#/clinic/symp', title: 'Symptomatology & Approach', crumb: 'Clinic', c: '#5C7F3A' });
    var view = r.q.get('v') === 'book' ? 'book' : 'sys', qq = (r.q.get('q') || '').trim();
    var body;
    if (!SY.chapters.length) body = '<div class="empty"><p class="muted">ยังไม่มีบท</p></div>';
    else if (view === 'book') body = '<div class="sxcards">' + SY.chapters.map(syCard).join('') + '</div>';
    else body = SY.groups.map(function (g) {
      var cs = SY.chapters.filter(function (c) { return c.g === g.id; });
      if (!cs.length) return '';
      return '<section class="sxgrp"><div class="sxgh"><span class="sw" style="background:' + g.c + '"></span><h2>' + esc(g.t) + '</h2><span class="muted">' + cs.length + ' บท</span></div><div class="sxcards">' + cs.map(syCard).join('') + '</div></section>';
    }).join('');
    var nf = 0, ni = 0; SY.chapters.forEach(function (c) { nf += c.f; ni += c.i; });
    var hq = function (v) { return '#/clinic/symp' + (v === 'book' ? '?v=book' : ''); };
    return {
      title: 'Symptomatology & Approach', html: clinicHead('symp', '<a href="#/clinic">Clinic</a><span class="muted"> › </span><span>Symptomatology &amp; Approach</span>', 'Symptomatology &amp; Approach',
        'สรุป' + esc(SY.book.title || '') + ' ' + SY_SRC + ' ครบทุกบท — กดเปิดทีละหัวข้อ · algorithm กดดูทีละกล่องหรือเดินทีละขั้น<br><span class="muted" style="font-size:15px">' + esc(SY.book.by || '') + ' · ' + esc(SY.book.ed || '') + '</span>') +
        '<section class="wrap" style="padding-bottom:80px;display:flex;flex-direction:column;gap:26px">' +
        '<div class="sxbar"><form class="search sxsearch" id="sxsf" role="search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A6258" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><label class="sr" for="sxq">ค้นทุกบท</label><input id="sxq" type="search" placeholder="ค้นทุกบท เช่น MCV, Rockall, eschar" value="' + esc(qq) + '" autocomplete="off"></form>' +
        '<div class="filters" role="group" aria-label="เรียงบท"><a class="chip' + (view === 'sys' ? ' on' : '') + '" href="' + hq('sys') + '">ตามระบบ</a><a class="chip' + (view === 'book' ? ' on' : '') + '" href="' + hq('book') + '">ตามเล่ม</a></div>' +
        '<span class="muted" style="font-size:14px">' + SY.chapters.length + ' / ' + (SY.total || SY.chapters.length) + ' บท · ' + nf + ' algorithm · ' + ni + ' รูป</span></div>' +
        '<div id="sxres" class="sxres" hidden></div>' + gSympCard() + body + '</section>',
      after: function () {
        var inp = document.getElementById('sxq'), res = document.getElementById('sxres'), t = null;
        function run() {
          var v = inp.value.trim(); setQuery(route(), { q: v });
          if (v.length < 2) { res.hidden = true; res.innerHTML = ''; return; }
          res.hidden = false;
          if (!SYS_SEARCH.d) { res.innerHTML = SYS_SEARCH.E ? '<p class="warn">โหลดดัชนีค้นหาไม่สำเร็จ: ' + esc(SYS_SEARCH.E) + '</p>' : '<p class="muted"><span class="spin" aria-hidden="true"></span> กำลังโหลดดัชนีค้นหา…</p>'; sySearchLoad(run); return; }
          var ql = v.toLowerCase(), hits = SYS_SEARCH.d.filter(function (x) { return (x.h + ' ' + x.x).toLowerCase().indexOf(ql) >= 0; });
          res.innerHTML = '<span class="label">พบ ' + hits.length + ' หัวข้อ' + (hits.length > 80 ? ' · แสดง 80 แรก' : '') + '</span>' + hits.slice(0, 80).map(function (x) {
            var c = syCh(x.c); if (!c) return '';
            var i = x.x.toLowerCase().indexOf(ql), snip = '';
            if (i >= 0) { var a = Math.max(0, i - 50); snip = (a ? '…' : '') + esc(x.x.slice(a, i)) + '<mark>' + esc(x.x.slice(i, i + v.length)) + '</mark>' + esc(x.x.slice(i + v.length, i + v.length + 70)) + '…'; }
            return '<a href="#/clinic/symp/' + c.id + '?to=' + (x.f ? 'f-' + x.f : 's-' + x.s) + '"><span class="pn">' + c.no + '</span><span><b>' + esc(c.th) + ' › ' + esc(x.h) + '</b>' + (snip ? '<small>' + snip.replace(/\n/g, ' ') + '</small>' : '') + '</span></a>';
          }).join('');
        }
        inp.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 220); });
        document.getElementById('sxsf').addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(t); run(); });
        if (qq) run();
      }
    };
  }

  /* ---------- อ่านบท ---------- */
  function syOpen(id, v) {
    var all = LS.get('sxopen', {}) || {};
    if (v === undefined) return all[id] || [];
    all[id] = v; LS.set('sxopen', all);
  }
  function syFix(h) { return String(h || '').replace(/<img /g, '<img loading="lazy" decoding="async" ').replace(/<table/g, '<table') ; }
  var CHEV = '<svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 9.5l5.5 5.5 5.5-5.5"/></svg>';
  function syIsWide(h) {
    if (/class="flow"/.test(h)) return true;
    var m = h.match(/<tr[\s\S]*?<\/tr>/g) || [], mx = 0;
    m.forEach(function (tr) { var n = (tr.match(/<t[hd][\s>]/g) || []).length; if (n > mx) mx = n; });
    return mx >= 3;
  }
  function syBox(b, opened) {
    var inner = syFix(b.html) + (b.sub || []).map(function (x) { return '<div class="sxs2" id="s-' + x.id + '"><h4>' + esc(x.h) + '</h4>' + syFix(x.html) + '</div>'; }).join('');
    var open = opened.indexOf(b.id) < 0 ? ' open' : '';   /* กล่องย่อยเปิดไว้เป็นค่าเริ่มต้น · จำเฉพาะกล่องที่ปิด */
    return '<details class="sxbox' + (syIsWide(inner) ? ' wide' : '') + '" id="s-' + b.id + '" data-sid="' + b.id + '" data-def="open"' + open + '><summary><h3>' + esc(b.h) + '</h3>' + CHEV + '</summary><div class="sxbb">' + inner + '</div></details>';
  }
  function sySec(s, i, st) {
    var open = st.indexOf(s.id) >= 0 ? ' open' : '';
    return '<details class="sxsec" id="s-' + s.id + '" data-sid="' + s.id + '"' + open + '><summary><span class="sxn">' + (i + 1) + '</span><h2>' + esc(s.h) + '</h2>' + (s.pg ? '<span class="sxpg">หน้า ' + s.pg + '</span>' : '') + CHEV + '</summary>' +
      '<div class="sxbody">' + (s.html ? '<div class="sxlead">' + syFix(s.html) + '</div>' : '') + (s.sub && s.sub.length ? '<div class="sxgrid">' + s.sub.map(function (b) { return syBox(b, st); }).join('') + '</div>' : '') + '</div></details>';
  }
  function sympChapter(c, r) {
    var g = syGroup(c), d = syLoad(c), s = SYD[c.no];
    var crumb = '<a href="#/clinic">Clinic</a><span class="muted"> › </span><a href="#/clinic/symp">Symptomatology &amp; Approach</a><span class="muted"> › </span><span>บทที่ ' + c.no + '</span>';
    var head = clinicHead('symp', crumb, esc(c.th) + ' <span class="sxh1en">' + esc(c.en) + '</span>', 'บทที่ ' + c.no + ' · หน้า ' + esc(c.pages) + ' ในตำรา · ' + SY_SRC);
    if (!d) return { title: c.th, html: head + '<section class="wrap" style="padding-bottom:80px">' + (s && s.E ? '<p class="warn">เปิดบทไม่สำเร็จ: ' + esc(s.E) + ' — ลองรีเฟรชหน้า</p>' : '<p class="muted"><span class="spin" aria-hidden="true"></span> กำลังเปิดบท…</p>') + '</section>' };
    remember({ href: '#/clinic/symp/' + c.id, title: c.th + ' · ' + c.en, crumb: 'Clinic › Symptomatology', c: g.c });
    var st = syOpen(c.id), flows = d.flows || [], FM = {};
    flows.forEach(function (f) { FM[f.id] = f; });
    var secs = d.sections.map(function (x, i) { return sySec(x, i, st); }).join('').replace(/<div class="flow" data-flow="([\w-]+)"><\/div>/g, function (m, id) { return FM[id] ? flowShell(FM[id]) : ''; });
    var toc = d.sections.map(function (x, i) { return '<a href="#/clinic/symp/' + c.id + '?to=s-' + x.id + '" data-go="s-' + x.id + '"><span class="pn">' + (i + 1) + '</span><span>' + esc(x.h) + '</span></a>'; }).join('');
    var ftoc = flows.length ? '<div class="grp">Algorithm ในบทนี้</div>' + flows.map(function (f) { return '<a href="#/clinic/symp/' + c.id + '?to=f-' + f.id + '" data-go="f-' + f.id + '"><span class="pn fi">⇣</span><span>' + esc(f.title) + '</span></a>'; }).join('') : '';
    var i = SY.chapters.indexOf(c), prev = SY.chapters[i - 1], next = SY.chapters[i + 1];
    var nav = '<nav aria-label="บทก่อนหน้าและถัดไป" class="pnav">' +
      (prev ? '<a href="#/clinic/symp/' + prev.id + '"><span class="muted" style="font-size:13px">← บทที่ ' + prev.no + '</span><span class="k" style="font-size:17px;font-weight:500">' + esc(prev.th) + '</span></a>' : '<span></span>') +
      (next ? '<a href="#/clinic/symp/' + next.id + '" style="align-items:flex-end;text-align:right"><span class="muted" style="font-size:13px">บทที่ ' + next.no + ' →</span><span class="k" style="font-size:17px;font-weight:500">' + esc(next.th) + '</span></a>' : '') + '</nav>';
    return {
      title: c.th + ' · ' + c.en, html: head +
        '<section class="band" style="padding:30px 0 80px"><div class="wrap reader sxreader" id="sxr" style="--g:' + g.c + '">' +
        '<details class="ttree sxtoc" id="sxtoc" open><summary class="k">หัวข้อในบท <span class="muted" style="font-weight:400;font-size:14px">· ' + d.sections.length + ' หัวข้อ</span></summary><nav class="tree" aria-label="หัวข้อในบท ' + esc(c.th) + '">' + toc + ftoc + '</nav></details>' +
        '<article class="sheet doc sxdoc sx"><div class="sxtools"><button type="button" class="chip" data-all="1">เปิดทั้งหมด</button><button type="button" class="chip" data-all="0">ปิดทั้งหมด</button><a class="chip" href="#/exam?src=' + encodeURIComponent('y:' + c.id) + '">ออกข้อสอบจากบทนี้</a>' +
        (flows.length ? '<span class="muted" style="font-size:14px">' + flows.length + ' algorithm — กดกล่องเพื่อดูรายละเอียด หรือเลือก "ทีละขั้น"</span>' : '') + '</div>' +
        secs + nav + '</article></div></section>',
      after: function () {
        var root = document.getElementById('sxr');
        if (window.innerWidth < 900) { var tt = document.getElementById('sxtoc'); if (tt) tt.open = false; }
        function save() {
          var o = [], closed = [];
          root.querySelectorAll('details.sxsec').forEach(function (x) { if (x.open) o.push(x.getAttribute('data-sid')); });
          root.querySelectorAll('details.sxbox').forEach(function (x) { if (!x.open) closed.push(x.getAttribute('data-sid')); });
          syOpen(c.id, o.concat(closed));
        }
        function mountIn(el) { el.querySelectorAll('.fbox').forEach(function (fb) { if (fb.offsetParent !== null) flowMount(fb, FM[fb.getAttribute('data-f')]); }); }
        root.querySelectorAll('details.sxsec,details.sxbox').forEach(function (x) {
          x.addEventListener('toggle', function () { if (x.open) mountIn(x); if (!x._q) save(); });
        });
        root.querySelectorAll('details.sxsec[open]').forEach(mountIn);
        root.querySelector('.sxtools').addEventListener('click', function (e) {
          var b = e.target.closest('[data-all]'); if (!b) return;
          var on = b.getAttribute('data-all') === '1';
          root.querySelectorAll('details.sxsec,details.sxbox').forEach(function (x) { x._q = true; x.open = on; x._q = false; });
          save(); if (on) mountIn(root);
        });
        function go(id, smooth) {
          var el = document.getElementById(id); if (!el) return;
          for (var p = el; p && p !== root; p = p.parentElement) if (p.tagName === 'DETAILS' && !p.open) { p._q = true; p.open = true; p._q = false; }
          save(); mountIn(root);
          el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
          el.classList.remove('hl'); void el.offsetWidth; el.classList.add('hl');
        }
        root.addEventListener('click', function (e) {
          var a = e.target.closest('[data-go]'); if (!a) return;
          e.preventDefault(); setQuery(route(), { to: a.getAttribute('data-go') });
          if (window.innerWidth < 900) { var tt = document.getElementById('sxtoc'); if (tt) tt.open = false; }
          go(a.getAttribute('data-go'), true);
        });
        bindLightbox(root);
        var to = r.q.get('to'); if (to) setTimeout(function () { go(to, false); }, 30);
      }
    };
  }
  function sympPage(r) {
    if (!r.args[1]) return sympHub(r);
    var c = syCh(r.args[1]);
    if (!c) return { title: 'ไม่พบบท', html: clinicHead('symp', '', 'ไม่พบบทนี้', '<a href="#/clinic/symp">กลับไปหน้ารวมบท</a>') };
    return sympChapter(c, r);
  }

  /* ---------- ภาพขยาย ---------- */
  function bindLightbox(root) {
    root.addEventListener('click', function (e) {
      var im = e.target.closest('.sx figure img, .forig img'); if (!im) return;
      var cap = im.closest('figure') && im.closest('figure').querySelector('figcaption');
      var ov = document.createElement('div'); ov.className = 'lbox'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'ภาพขยาย');
      ov.innerHTML = '<button type="button" class="burger lbx" aria-label="ปิดภาพ"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 6.3L18 17.6M18 6.2L6.2 17.8"/></svg></button><img src="' + im.getAttribute('src') + '" alt="' + esc(im.getAttribute('alt') || '') + '">' + (cap ? '<p>' + cap.innerHTML + '</p>' : '');
      document.body.appendChild(ov); document.body.classList.add('lbopen');
      function close() { ov.remove(); document.body.classList.remove('lbopen'); document.removeEventListener('keydown', k); im.focus && im.focus(); }
      function k(ev) { if (ev.key === 'Escape') close(); }
      ov.addEventListener('click', function (ev) { if (ev.target === ov || ev.target.closest('.lbx')) close(); });
      document.addEventListener('keydown', k);
      ov.querySelector('.lbx').focus();
    });
  }

  /* =========================================================
     FLOW — algorithm กดโต้ตอบได้ (จัดวางเองแบบ layered, ไม่ใช้ไลบรารีนอก)
     ========================================================= */
  var FK = { start: 'จุดเริ่ม', q: 'คำถาม / จุดตัดสินใจ', act: 'สิ่งที่ทำ', dx: 'การวินิจฉัย / ผลลัพธ์', stop: 'เร่งด่วน / ส่งต่อ', note: 'หมายเหตุ' };
  function flowShell(f) {
    return '<div class="fbox" id="f-' + f.id + '" data-f="' + f.id + '"><div class="fhd"><div class="fti"><span class="label">ALGORITHM' + (f.src === 'fig' ? ' · จากรูปในหนังสือ' : ' · สร้างจากเนื้อหาในบท') + '</span><b class="k">' + esc(f.title) + '</b>' + (f.note ? '<small>' + esc(f.note) + '</small>' : '') + '</div>' +
      '<div class="ftools"><div class="seg" role="group" aria-label="มุมมอง"><button type="button" data-m="map" aria-pressed="true">แผนภาพ</button><button type="button" data-m="walk" aria-pressed="false">ทีละขั้น</button></div>' +
      '<span class="fz"><button type="button" data-a="out" aria-label="ย่อ">−</button><button type="button" data-a="fit" aria-label="พอดีกรอบ">พอดี</button><button type="button" data-a="in" aria-label="ขยาย">+</button></span>' +
      (f.img ? '<button type="button" class="fbtn" data-a="img" aria-pressed="false">รูปต้นฉบับ</button>' : '') +
      '<button type="button" class="fbtn" data-a="full" aria-label="เต็มจอ" aria-pressed="false"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button></div></div>' +
      '<div class="fcan"><div class="fsize"><div class="fstage"></div></div></div><div class="fwalk" hidden></div><div class="finfo" aria-live="polite"><p class="muted">กดกล่องเพื่อไฮไลต์เส้นทางและดูรายละเอียด</p></div>' +
      (f.img ? '<figure class="forig" hidden><img src="symp/img/' + f.img + '" alt="รูปต้นฉบับ: ' + esc(f.title) + '" loading="lazy"></figure>' : '') + '</div>';
  }

  function flowLayout(N, E) {
    /* N: [{id,w,h}] · E: [{f,t,lw}] → {nodes:{id:{x,y,w,h}}, edges:[{pts,lab:{x,y}}], W, H} */
    var GAP = 22, RS = 60, PAD = 16, id2 = {}, out = {}, inn = {};
    N.forEach(function (n) { id2[n.id] = n; out[n.id] = []; inn[n.id] = []; });
    E.forEach(function (e, i) { e.i = i; out[e.f].push(e); inn[e.t].push(e); });
    /* rank = longest path from roots */
    var rank = {}, indeg = {}, q = [], order = [];
    N.forEach(function (n) { indeg[n.id] = inn[n.id].length; if (!indeg[n.id]) q.push(n.id); });
    while (q.length) { var v = q.shift(); order.push(v); out[v].forEach(function (e) { if (--indeg[e.t] === 0) q.push(e.t); }); }
    N.forEach(function (n) { if (order.indexOf(n.id) < 0) order.push(n.id); });   /* วนวน: กันพัง */
    order.forEach(function (v) { rank[v] = inn[v].reduce(function (m, e) { return Math.max(m, rank[e.f] == null ? 0 : rank[e.f] + 1); }, 0); });
    /* ดึง root ที่ไม่ใช่ตัวหลัก (เช่น note) ลงมาใกล้ลูก */
    order.slice().reverse().forEach(function (v) { if (!inn[v].length && out[v].length && rank[v] === 0) { var m = Math.min.apply(null, out[v].map(function (e) { return rank[e.t]; })); if (m - 1 > 0) rank[v] = m - 1; } });
    /* dummy nodes */
    var nodes = N.map(function (n) { return { id: n.id, w: n.w, h: n.h, r: rank[n.id], up: [], dn: [] }; }), NB = {};
    nodes.forEach(function (n) { NB[n.id] = n; });
    var chains = [];
    E.forEach(function (e) {
      var a = NB[e.f], b = NB[e.t], ch = [a], k = 0;
      for (var r = a.r + 1; r < b.r; r++) { var dmy = { id: '_' + e.i + '_' + (k++), w: 10, h: 0, r: r, up: [], dn: [], dummy: true }; nodes.push(dmy); NB[dmy.id] = dmy; ch.push(dmy); }
      ch.push(b);
      for (var j = 0; j < ch.length - 1; j++) { ch[j].dn.push(ch[j + 1]); ch[j + 1].up.push(ch[j]); }
      if (e.lw) b.lw = Math.max(b.lw || 0, e.lw);
      chains.push(ch);
    });
    var L = [], maxR = 0; nodes.forEach(function (n) { maxR = Math.max(maxR, n.r); });
    for (var r = 0; r <= maxR; r++) L.push([]);
    /* ลำดับเริ่มต้นแบบ DFS */
    var seen = {};
    function dfs(n) { if (seen[n.id]) return; seen[n.id] = 1; L[n.r].push(n); n.dn.forEach(dfs); }
    nodes.filter(function (n) { return !n.up.length; }).forEach(dfs); nodes.forEach(dfs);
    function idx() { L.forEach(function (l) { l.forEach(function (n, i) { n.o = i; }); }); }
    idx();
    function bary(n, dir) { var nb = dir ? n.up : n.dn; if (!nb.length) return n.o; return nb.reduce(function (s, x) { return s + x.o; }, 0) / nb.length; }
    for (var it = 0; it < 16; it++) {
      var down = it % 2 === 0;
      for (var li = down ? 1 : L.length - 2; down ? li < L.length : li >= 0; li += down ? 1 : -1) {
        L[li].forEach(function (n) { n.b = bary(n, down); });
        L[li].sort(function (a, b) { return a.b - b.b || a.o - b.o; });
        L[li].forEach(function (n, i) { n.o = i; });
      }
    }
    /* พิกัด x */
    function ww(n) { return Math.max(n.w, n.lw || 0); }
    function pack(l, want) {
      var a = [], b = [], i;
      for (i = 0; i < l.length; i++) { a[i] = want[i]; if (i) a[i] = Math.max(a[i], a[i - 1] + (ww(l[i - 1]) + ww(l[i])) / 2 + GAP); }
      for (i = l.length - 1; i >= 0; i--) { b[i] = want[i]; if (i < l.length - 1) b[i] = Math.min(b[i], b[i + 1] - (ww(l[i + 1]) + ww(l[i])) / 2 - GAP); }
      var c = a.map(function (x, k) { return (x + b[k]) / 2; });
      for (i = 1; i < l.length; i++) c[i] = Math.max(c[i], c[i - 1] + (ww(l[i - 1]) + ww(l[i])) / 2 + GAP);
      l.forEach(function (n, k) { n.x = c[k]; });
    }
    L.forEach(function (l) { var x = 0; l.forEach(function (n) { n.x = x + ww(n) / 2; x += ww(n) + GAP; }); });
    for (it = 0; it < 24; it++) {
      var dn = it % 2 === 0;
      for (li = dn ? 1 : L.length - 2; dn ? li < L.length : li >= 0; li += dn ? 1 : -1) {
        pack(L[li], L[li].map(function (n) { var nb = dn ? n.up : n.dn; if (!nb.length) nb = dn ? n.dn : n.up; return nb.length ? nb.reduce(function (s, x) { return s + x.x; }, 0) / nb.length : n.x; }));
      }
    }
    var minX = Infinity, maxX = -Infinity;
    nodes.forEach(function (n) { minX = Math.min(minX, n.x - ww(n) / 2); maxX = Math.max(maxX, n.x + ww(n) / 2); });
    nodes.forEach(function (n) { n.x += PAD - minX; });
    /* พิกัด y */
    var y = PAD, LH = [];
    L.forEach(function (l, k) { var h = l.reduce(function (m, n) { return Math.max(m, n.h); }, 0); LH[k] = { y: y, h: h }; y += h + RS; });
    nodes.forEach(function (n) { var b = LH[n.r]; n.y = b.y + (b.h - n.h) / 2; });
    var res = { nodes: {}, edges: [], W: maxX - minX + PAD * 2, H: y - RS + PAD };
    N.forEach(function (n) { var m = NB[n.id]; res.nodes[n.id] = { x: m.x - m.w / 2, y: m.y, w: m.w, h: m.h, cx: m.x }; });
    chains.forEach(function (ch, i) {
      var pts = ch.map(function (n, k) { return k === 0 ? [n.x, n.y + n.h] : k === ch.length - 1 ? [n.x, n.y] : [n.x, n.y]; });
      var p = pts[pts.length - 2], t = pts[pts.length - 1], e = E[i], many = inn[e.t].filter(function (x) { return x.lw; }).length > 1;
      /* ป้ายเงื่อนไขวางเหนือกล่องปลายทาง (กล่องถูกเว้นระยะตามความกว้างป้ายแล้ว จึงไม่ทับกัน) · ถ้าปลายทางมีหลายป้ายเข้า (เส้นรวม) วางใต้กล่องต้นทางแทน */
      var s0 = pts[0], s1 = pts[1];
      res.edges[i] = { pts: pts, lab: many ? { x: s0[0] + (s1[0] - s0[0]) * 0.3, y: s0[1] + 6 + (e.lh || 20) / 2 } : { x: t[0], y: t[1] - 6 - (e.lh || 20) / 2 } };
    });
    return res;
  }
  function flowPath(pts) {
    var d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], my = (b[1] - a[1]) / 2;
      d += ' C' + a[0] + ' ' + (a[1] + my) + ' ' + b[0] + ' ' + (b[1] - my) + ' ' + b[0] + ' ' + (b[1] - 6);
      if (i < pts.length - 1) d += ' L' + b[0] + ' ' + b[1];
    }
    return d;
  }
  function flowMount(box, f) {
    if (!f || box._m) return; box._m = true;
    var stage = box.querySelector('.fstage'), size = box.querySelector('.fsize'), can = box.querySelector('.fcan'), info = box.querySelector('.finfo'), walk = box.querySelector('.fwalk');
    var NM = {}, OUT = {}, IN = {};
    f.nodes.forEach(function (n) { NM[n.id] = n; OUT[n.id] = []; IN[n.id] = []; });
    f.edges.forEach(function (e, i) { e._i = i; if (OUT[e.f] && IN[e.t]) { OUT[e.f].push(e); IN[e.t].push(e); } });
    var roots = f.nodes.filter(function (n) { return !IN[n.id].length; });
    stage.innerHTML = f.nodes.map(function (n) {
      return '<button type="button" class="fn k-' + (n.k || 'act') + (n.d ? ' more' : '') + '" data-id="' + esc(n.id) + '"><span>' + n.t + '</span>' + (n.d ? '<i aria-hidden="true">+</i>' : '') + '</button>';
    }).join('') + f.edges.map(function (e, i) { return e.l ? '<span class="fel" data-e="' + i + '">' + esc(e.l) + '</span>' : ''; }).join('');
    var scale = 1, lay = null;
    function measure() {
      stage.style.transform = 'none'; stage.style.width = '4000px';
      var N = f.nodes.map(function (n) { var el = stage.querySelector('.fn[data-id="' + cssq(n.id) + '"]'); var bb = el.getBoundingClientRect(); return { id: n.id, w: Math.ceil(bb.width) + 2, h: Math.ceil(bb.height) }; });
      var E = f.edges.filter(function (e) { return NM[e.f] && NM[e.t]; }).map(function (e) { var el = stage.querySelector('.fel[data-e="' + e._i + '"]'); return { f: e.f, t: e.t, lw: el ? el.offsetWidth + 8 : 0, lh: el ? el.offsetHeight : 0, _i: e._i }; });
      lay = flowLayout(N, E);
      f.nodes.forEach(function (n) { var p = lay.nodes[n.id], el = stage.querySelector('.fn[data-id="' + cssq(n.id) + '"]'); el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.style.width = p.w + 'px'; });
      var svg = '<svg class="fsvg" width="' + lay.W + '" height="' + lay.H + '" aria-hidden="true"><defs><marker id="ah-' + f.id + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>';
      E.forEach(function (e, k) {
        var g = lay.edges[k];
        svg += '<path class="fe" data-e="' + e._i + '" d="' + flowPath(g.pts) + '" marker-end="url(#ah-' + f.id + ')"/>';
        var lb = stage.querySelector('.fel[data-e="' + e._i + '"]');
        if (lb) { lb.style.left = (g.lab.x - lb.offsetWidth / 2) + 'px'; lb.style.top = (g.lab.y - lb.offsetHeight / 2) + 'px'; }
      });
      var old = stage.querySelector('svg'); if (old) old.remove();
      stage.insertAdjacentHTML('afterbegin', svg + '</svg>');
      stage.style.width = lay.W + 'px'; stage.style.height = lay.H + 'px';
      fit();
    }
    function apply() { stage.style.transform = 'scale(' + scale + ')'; size.style.width = Math.ceil(lay.W * scale) + 'px'; size.style.height = Math.ceil(lay.H * scale) + 'px'; }
    function fit() { var w = can.clientWidth - 4; scale = Math.max(window.innerWidth < 700 ? 0.74 : 0.45, Math.min(1, w / lay.W)); apply(); var r0 = roots[0] && lay.nodes[roots[0].id]; can.scrollLeft = r0 ? Math.max(0, r0.cx * scale - can.clientWidth / 2) : 0; }
    var sel = null;
    function anc(id) { var s = {}, st = [id]; while (st.length) { var x = st.pop(); if (s[x]) continue; s[x] = 1; IN[x].forEach(function (e) { st.push(e.f); }); } return s; }
    function select(id, scroll) {
      sel = id;
      var A = id ? anc(id) : null, kids = {};
      if (id) OUT[id].forEach(function (e) { kids[e.t] = 1; });
      stage.querySelectorAll('.fn').forEach(function (el) {
        var k = el.getAttribute('data-id');
        el.classList.toggle('sel', k === id); el.classList.toggle('dim', !!id && !A[k] && !kids[k]); el.classList.toggle('path', !!id && !!A[k] && k !== id);
        el.setAttribute('aria-pressed', String(k === id));
      });
      stage.querySelectorAll('.fe,.fel').forEach(function (el) {
        var e = f.edges[+el.getAttribute('data-e')], hot = id && A[e.t] && A[e.f], nx = id && e.f === id;
        el.classList.toggle('hot', !!hot); el.classList.toggle('nx', !!nx); el.classList.toggle('dim', !!id && !hot && !nx);
      });
      if (!id) { info.innerHTML = '<p class="muted">กดกล่องเพื่อไฮไลต์เส้นทางและดูรายละเอียด</p>'; return; }
      var n = NM[id];
      info.innerHTML = '<div class="fih"><span class="fk k-' + (n.k || 'act') + '">' + FK[n.k || 'act'] + '</span><b>' + n.t + '</b></div>' + (n.d ? '<div class="fid">' + n.d + '</div>' : '') +
        (IN[id].length ? '<div class="fopt"><span class="label">มาจาก</span>' + IN[id].map(function (e) { return '<button type="button" class="chip" data-to="' + esc(e.f) + '">← ' + strip(NM[e.f].t) + (e.l ? ' <small>(' + esc(e.l) + ')</small>' : '') + '</button>'; }).join('') + '</div>' : '') +
        (OUT[id].length ? '<div class="fopt"><span class="label">ไปต่อ</span>' + OUT[id].map(function (e) { return '<button type="button" class="chip" data-to="' + esc(e.t) + '">' + (e.l ? '<b>' + esc(e.l) + '</b> → ' : '→ ') + strip(NM[e.t].t) + '</button>'; }).join('') + '</div>' : '<p class="note">ปลายทางของเส้นนี้</p>') +
        '<button type="button" class="chip" data-to="">ล้างการเลือก</button>';
      if (scroll) { var el = stage.querySelector('.fn[data-id="' + cssq(id) + '"]'); if (el) { var p = lay.nodes[id]; can.scrollTo({ left: Math.max(0, (p.cx) * scale - can.clientWidth / 2), behavior: 'smooth' }); } }
    }
    function strip(h) { var d = document.createElement('div'); d.innerHTML = h; return esc(d.textContent); }
    stage.addEventListener('click', function (e) { var b = e.target.closest('.fn'); if (!b) return; var id = b.getAttribute('data-id'); select(sel === id ? null : id); });
    info.addEventListener('click', function (e) { var b = e.target.closest('[data-to]'); if (!b) return; select(b.getAttribute('data-to') || null, true); });
    /* ทีละขั้น */
    var trail = [];
    function paintWalk() {
      if (!trail.length) {
        if (roots.length === 1) trail = [roots[0].id];
        else { walk.innerHTML = '<p class="label">เริ่มจาก</p><div class="fopt">' + roots.map(function (n) { return '<button type="button" class="fchoice" data-w="' + esc(n.id) + '">' + n.t + '</button>'; }).join('') + '</div>'; return; }
      }
      var cur = NM[trail[trail.length - 1]], opts = OUT[cur.id];
      walk.innerHTML = '<ol class="ftrail">' + trail.map(function (id, i) { return '<li><button type="button" data-back="' + i + '"' + (i === trail.length - 1 ? ' aria-current="step"' : '') + '>' + strip(NM[id].t) + '</button></li>'; }).join('') + '</ol>' +
        '<div class="fcard k-' + (cur.k || 'act') + '"><span class="fk k-' + (cur.k || 'act') + '">' + FK[cur.k || 'act'] + '</span><p class="fct">' + cur.t + '</p>' + (cur.d ? '<div class="fid">' + cur.d + '</div>' : '') + '</div>' +
        (opts.length ? '<div class="fopts">' + opts.map(function (e) { return '<button type="button" class="fchoice" data-w="' + esc(e.t) + '">' + (e.l ? '<b>' + esc(e.l) + '</b>' : '<b>ต่อไป</b>') + '<span>' + NM[e.t].t + '</span></button>'; }).join('') + '</div>' : '<p class="note">จบเส้นทาง</p>') +
        '<div class="filters" style="margin-top:6px">' + (trail.length > 1 ? '<button type="button" class="chip" data-back="' + (trail.length - 2) + '">← ย้อนกลับ</button>' : '') + '<button type="button" class="chip" data-reset="1">เริ่มใหม่</button></div>';
    }
    walk.addEventListener('click', function (e) {
      var b = e.target.closest('[data-w],[data-back],[data-reset]'); if (!b) return;
      if (b.hasAttribute('data-w')) trail.push(b.getAttribute('data-w'));
      else if (b.hasAttribute('data-back')) trail = trail.slice(0, +b.getAttribute('data-back') + 1);
      else trail = [];
      paintWalk();
      var top = walk.getBoundingClientRect().top; if (top < 70) window.scrollBy({ top: top - 90, behavior: 'smooth' });
    });
    box.querySelector('.ftools').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var m = b.getAttribute('data-m'), a = b.getAttribute('data-a');
      if (m) {
        box.querySelectorAll('[data-m]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        var w = m === 'walk'; walk.hidden = !w; can.hidden = w; info.hidden = w; box.querySelector('.fz').hidden = w; box.classList.toggle('walking', w);
        if (w) paintWalk(); else fit();
      } else if (a === 'in') { scale = Math.min(1.8, scale * 1.2); apply(); }
      else if (a === 'out') { scale = Math.max(0.3, scale / 1.2); apply(); }
      else if (a === 'fit') fit();
      else if (a === 'img') { var fg = box.querySelector('.forig'), on = fg.hidden; fg.hidden = !on; b.setAttribute('aria-pressed', String(on)); }
      else if (a === 'full') {
        var full = !box.classList.contains('full'); box.classList.toggle('full', full); document.body.classList.toggle('fopen', full); b.setAttribute('aria-pressed', String(full));
        if (!can.hidden) fit();
      }
    });
    box.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.classList.contains('full')) box.querySelector('[data-a="full"]').click(); });
    var rt = null;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (document.body.contains(box) && lay && !can.hidden) fit(); }, 200); });
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(measure);
  }
  function cssq(s) { return String(s).replace(/["\\]/g, '\\$&'); }

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
    o += '</optgroup><optgroup label="1000 MAI · รายโรค">' + D.list.map(function (d) { return '<option value="d:' + esc(d.id) + '">' + esc(d.name) + '</option>'; }).join('') + '</optgroup>';
    if (G.st === 'ready') ['pre', 'clinic'].forEach(function (ar) {
      var opts = G.nodes.filter(function (n) { return n.area === ar && (gFull(n) || (n.kids.length && gCount(n)[0])); });
      if (opts.length) o += '<optgroup label="' + (ar === 'pre' ? 'Preclinic' : 'Clinic') + ' · สรุปจาก Google Doc">' + opts.map(function (n) {
        return '<option value="g:' + esc(n.slug) + '">' + esc(gPath(n).map(function (x) { return x.title; }).join(' › ') + (n.kids.length ? ' (รวมแท็บย่อย)' : '')) + '</option>';
      }).join('') + '</optgroup>';
    });
    o += '<optgroup label="Clinic">' + CLI.approaches.map(function (a) { return '<option value="c:' + a.id + '">' + esc('Approach › ' + a.title) + '</option>'; }).join('') + '</optgroup>';
    if (SY.chapters.length) o += '<optgroup label="Symptomatology &amp; Approach (ศิริราช)">' + SY.chapters.map(function (c) { return '<option value="y:' + c.id + '">' + esc('บทที่ ' + c.no + ' ' + c.th + ' · ' + c.en) + '</option>'; }).join('') + '</optgroup>';
    if (sel) o = o.replace('value="' + esc(sel) + '"', 'value="' + esc(sel) + '" selected');
    return o;
  }
  function htmlText(h) { var div = document.createElement('div'); div.innerHTML = h; return div.textContent.replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ').trim(); }
  function diseaseText(d) { return '## ' + d.name + (d.th ? ' (' + d.th + ')' : '') + ' — ระบบ ' + d.sys.name + '\n' + d.fields.filter(function (f) { return f.value; }).map(function (f) { return f.label + ': ' + f.value; }).join('\n'); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function gatherSource(src, n, limit) {
    var label = '', text = '';
    if (src.indexOf('d:') === 0) { var d = findDisease(src.slice(2)); if (d) { label = d.name; text = diseaseText(d); } }
    else if (src.indexOf('g:') === 0) {
      var gn = G.by[src.slice(2)];
      if (gn) {
        gNeedSheets(gFlat(gn));
        label = gPath(gn).map(function (x) { return x.title; }).join(' › ');
        text = gFlat(gn).filter(gFull).map(function (x) { return '## ' + gPath(x).map(function (y) { return y.title; }).join(' › ') + '\n' + gText(x); }).join('\n\n');
      }
    } else if (src.indexOf('c:') === 0) {
      var a = CLI.approaches.filter(function (x) { return x.id === src.slice(2); })[0];
      if (a) { label = 'Approach ' + a.title; text = '## ' + a.title + '\n' + a.steps.map(function (s, i) { return (i + 1) + '. ' + s.title + ': ' + (s.links ? s.links.map(function (l) { return l[0] + ' → ' + l[1]; }).join('; ') : htmlText(s.html)); }).join('\n'); }
    } else if (src.indexOf('y:') === 0) {
      var yc = syCh(src.slice(2)), yd = yc && syLoad(yc);
      if (yd) {
        label = 'ตำราอาการวิทยา (ศิริราช) บทที่ ' + yc.no + ' ' + yc.th + ' · ' + yc.en;
        var tx = [];
        (function walk(ss, dep) { ss.forEach(function (x) { tx.push(new Array(dep + 3).join('#') + ' ' + x.h); if (x.html) tx.push(htmlText(x.html)); walk(x.sub || [], dep + 1); }); })(yd.sections, 0);
        (yd.flows || []).forEach(function (f) { tx.push('## Algorithm: ' + f.title); f.edges.forEach(function (e) { var a = f.nodes.filter(function (x) { return x.id === e.f; })[0], b = f.nodes.filter(function (x) { return x.id === e.t; })[0]; if (a && b) tx.push(htmlText(a.t) + (e.l ? ' —[' + e.l + ']→ ' : ' → ') + htmlText(b.t)); }); });
        text = '## ' + label + '\n' + tx.join('\n');
      }
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
        (function () { var sv = document.getElementById('src').value; if (sv.indexOf('y:') === 0 && syCh(sv.slice(2))) syLoad(syCh(sv.slice(2))); })();
        form.addEventListener('change', function (e) {
          if (e.target.name === 'lv') { LS.set('level', lvNow()); showLv(); }
          if (e.target.name === 'cnt') LS.set('count', +e.target.value);
          if (e.target.name === 'eng') LS.set('engine', e.target.value);
          if (e.target.id === 'model') LS.set('model', e.target.value);
          if (e.target.id === 'src') { setQuery(route(), { src: e.target.value }); if (e.target.value.indexOf('y:') === 0 && syCh(e.target.value.slice(2))) syLoad(syCh(e.target.value.slice(2))); }
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
            if (!o.src.text) { st.textContent = srcVal.indexOf('y:') === 0 ? 'กำลังโหลดเนื้อหาบทนี้ — รอสักครู่แล้วกดอีกครั้ง' : 'ไม่มีเนื้อหาในแหล่งที่เลือก'; return; }
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
          if (!o.src.text) { st.textContent = srcVal.indexOf('y:') === 0 ? 'กำลังโหลดเนื้อหาบทนี้ — รอสักครู่แล้วกดอีกครั้ง' : 'ไม่มีเนื้อหาในแหล่งที่เลือก'; return; }
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
  /* สัดส่วนเรื่องที่ออก — ค่าเริ่มต้นทุกหัวข้อ: POY_TOPIC_DEFAULTS.mix (หัวข้อไหนใส่ mix เองจะใช้ของหัวข้อนั้น) — สุ่มทีละข้อ */
  function aiMix(t, forChat) {
    var m = t.mix || (window.POY_TOPIC_DEFAULTS || {}).mix; if (!m) return '';
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
  gLoad();
  render(false);
  initFB();
})();
