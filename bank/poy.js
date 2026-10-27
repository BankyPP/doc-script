/* โพยหมอ hooks for the old-exam engine — added around the engine, never inside it:
   1) a "โพยหมอ" link at the top-left of the bar (back to ติว NL & Compre)
   2) on each exam home (#/<ward>) a card linking to that exam's page in โพยหมอ (blueprint · analysis · reading plan) — CONFIG.poy.exams */
(function () {
  var P = (typeof CONFIG !== 'undefined' && CONFIG.poy) || {}, X = P.exams || {}, BASE = '../../';
  var bar = document.querySelector('.bar-in');
  if (bar && !document.querySelector('.poy-back')) {
    var a = document.createElement('a');
    a.className = 'poy-back'; a.href = BASE + '#/nl'; a.title = 'กลับไปโพยหมอ › ติว NL & Compre';
    a.innerHTML = '<svg width="18" height="18" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 33C18 24 17 16 19 5"/><path d="M18 22C12 21 8 17 7 11c6 1 10 5 11 11z"/><path d="M18.5 15c4.5-1 8.5-5 9.5-10-5 1-8.5 4.5-9.5 10z"/></svg><span>โพยหมอ</span>';
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
  var main = document.getElementById('main');
  if (main) new MutationObserver(card).observe(main, { childList: true });
  window.addEventListener('hashchange', function () { setTimeout(card, 0); });
  card();
})();
