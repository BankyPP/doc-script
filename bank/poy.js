/* โพยหมอ hooks for the old-exam engine — added around the engine, never inside it:
   1) a back link at the top-left of the bar → โพยหมอ › ติว NL & Compre › ข้อสอบ (#/nl/exams) — user, 7 Nov 2026
   2) on each exam home (#/<ward>) a card linking to that exam's page in โพยหมอ (blueprint · analysis · reading plan) — CONFIG.poy.exams
   3) ward picker shows NL and Compre together, NL all → Compre all (user, 7 Nov 2026): the other bank's exams are added as cards
      linking into that bank (CONFIG.poy.others = {inst, before, wards:[{id,name,short,sub,noExam}]}, counts from ../stats.js) */
(function () {
  var P = (typeof CONFIG !== 'undefined' && CONFIG.poy) || {}, X = P.exams || {}, BASE = '../../';
  var bar = document.querySelector('.bar-in');
  if (bar && !document.querySelector('.poy-back')) {
    var a = document.createElement('a');
    a.className = 'poy-back'; a.href = BASE + '#/nl/exams'; a.title = 'กลับไปโพยหมอ › ติว NL & Compre › ข้อสอบ';
    a.innerHTML = '<svg class="pb-arr" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><svg width="18" height="18" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 33C18 24 17 16 19 5"/><path d="M18 22C12 21 8 17 7 11c6 1 10 5 11 11z"/><path d="M18.5 15c4.5-1 8.5-5 9.5-10-5 1-8.5 4.5-9.5 10z"/></svg><span class="pb-t"><small>โพยหมอ ›</small> ข้อสอบ</span>';
    bar.insertBefore(a, bar.firstChild);
  }
  var NAME = {};
  ((typeof CONFIG !== 'undefined' && CONFIG.wards) || []).forEach(function (w) { NAME[w.id] = w.name; });
  function card() {
    var m = (location.hash || '').match(/^#\/([\w-]+)\/?$/), main = document.getElementById('main');
    if (!m || !X[m[1]] || !main || main.querySelector('.poy-xcard')) return;
    var head = main.querySelector('.whead'); if (!head) return;
    var c = document.createElement('a');
    c.className = 'poy-xcard'; c.href = BASE + X[m[1]];
    c.innerHTML = '<span aria-hidden="true" style="font-size:22px">📐</span><span><b>Blueprint · วิเคราะห์ · แผนอ่าน</b><small>หน้า ' + (NAME[m[1]] || m[1]) + ' ในโพยหมอ — สัดส่วนข้อสอบ ควรอ่านอะไร และความคืบหน้าการอ่าน</small></span><span class="arr" aria-hidden="true">→</span>';
    var sub = head.nextElementSibling && head.nextElementSibling.classList.contains('sub') ? head.nextElementSibling : head;
    sub.parentNode.insertBefore(c, sub.nextSibling);
  }

  /* ward picker: add the other bank's exams (NL all → Compre all) */
  var O = P.others || null, STAT = null;
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function oCard(w) {
    var no = w.noExam || [], c = (STAT && STAT[w.id]) || {}, n = Math.max.apply(null, String(w.short || w.id).split(' ').map(function (x) { return x.length; }));
    var acn = '<span class="acn"><span class="acl">ข้อสอบเก่า AC</span>' + ['MCQ', 'MEQ', 'OSCE'].filter(function (k) { return no.indexOf(k) < 0; }).map(function (k) {
      var v = k === 'MCQ' ? (c.n || 0) : 0; return '<span class="act' + (v ? '' : ' z') + '">' + k + ' <b>' + v + '</b></span>'; }).join('') + '</span>';
    return '<a class="wcard poy-ow" href="../' + O.inst + '/#/' + esc(w.id) + '"><span class="wb" style="font-size:' + (n > 5 ? 11 : n > 4 ? 12.5 : 14) + 'px">' + esc(w.short || w.id) + '</span><span><b>' + esc(w.name) + '</b><span class="rd">' + esc(w.sub || '') + '</span>' + acn + '</span></a>';
  }
  function picker() {
    if (!O || !(O.wards || []).length) return;
    var h = location.hash || '', main = document.getElementById('main');
    if (!(h === '' || h === '#' || h === '#/') || !main || main.querySelector('.poy-ow')) return;
    var cards = main.querySelectorAll('a.wcard'); if (!cards.length) return;
    var h1 = main.querySelector('h1.h1'); if (h1) h1.textContent = 'คลังข้อสอบเก่า NL & Compre';
    var box = document.createElement('div'); box.className = 'poy-owrap';
    box.innerHTML = O.wards.map(oCard).join('');
    if (O.before) cards[0].parentNode.insertBefore(box, cards[0]);
    else { var last = cards[cards.length - 1]; last.parentNode.insertBefore(box, last.nextSibling); }
  }
  if (O) {
    var sc = document.createElement('script'); sc.src = '../stats.js?t=' + Date.now();
    sc.onload = function () { STAT = window.POY_BANKSTAT || null; var b = document.querySelector('.poy-owrap'); if (b) { b.remove(); picker(); } };
    document.head.appendChild(sc);
  }
  function all() { card(); picker(); }
  var main = document.getElementById('main');
  if (main) new MutationObserver(all).observe(main, { childList: true });
  window.addEventListener('hashchange', function () { setTimeout(all, 0); });
  all();
})();
