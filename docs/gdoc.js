/* โพยหมอ — แปลงไฟล์ export HTML ของ Google Docs เป็นแท็บที่อ่านง่าย
   ใช้ทั้งในหน้าเว็บ (ตอนดึง Doc สด) และตอนสร้าง snapshot (tools/gdoc/build.py รันไฟล์นี้ใน Chromium)
   POY_GDOC_LIB.parse(html, opts) → { tabs: [{ title, html, heads: [{ id, l, t }] }] }
     opts.img(src) → src ใหม่ของรูป (เช่น images/image1.png → gdoc/img/poymor-image1.png)
     opts.prefix  → คำนำหน้า id ของหัวข้อ */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sty(el) {
    var o = {}, s = el.getAttribute && el.getAttribute('style');
    if (!s) return o;
    s.split(';').forEach(function (d) { var i = d.indexOf(':'); if (i > 0) o[d.slice(0, i).trim().toLowerCase()] = d.slice(i + 1).trim(); });
    return o;
  }
  function isBlack(c) { c = String(c || '').toLowerCase().replace(/\s/g, ''); return !c || c === '#000000' || c === '#000' || c === 'black' || c === 'inherit' || c === 'rgb(0,0,0)'; }
  function isBlankBg(c) { c = String(c || '').toLowerCase().replace(/\s/g, ''); return !c || c === 'transparent' || c === '#ffffff' || c === '#fff' || c === 'white' || c === 'inherit' || c === 'rgba(0,0,0,0)'; }
  function safeColor(c) { c = String(c || '').trim(); return /^(#[0-9a-f]{3,8}|rgba?\([\d.,\s%]+\))$/i.test(c) ? c : ''; }
  /* ลิงก์ของ Google ที่ห่อด้วย google.com/url?q= */
  function unwrap(href) {
    var m = /^https?:\/\/www\.google\.com\/url\?q=([^&]+)/.exec(href || '');
    if (m) { try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } }
    return href || '';
  }
  /* แท็บ = ย่อหน้า class="title" ที่ Google ใส่ชื่อแท็บไว้ (style ขึ้นต้น padding:0;margin:0)
     ย่อหน้า Title ที่เขียนเองในเนื้อหามี padding-top/padding-bottom แยก → ไม่ใช่ชื่อแท็บ */
  function isTabTitle(el) {
    if (el.tagName !== 'P' || !el.classList.contains('title')) return false;
    var s = (el.getAttribute('style') || '').replace(/\s/g, '');
    return /^padding:0;margin:0;/.test(s);
  }
  function textOf(el) { return (el.textContent || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim(); }
  function hasMedia(el) { return !!(el.querySelector && el.querySelector('img,hr')); }

  function parse(html, opts) {
    opts = opts || {};
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var body = doc.body;
    /* เลขลำดับ list: Google ใช้ counter ใน CSS — อ่านชนิดของแต่ละระดับจาก <style> */
    var css = Array.prototype.map.call(doc.querySelectorAll('style'), function (s) { return s.textContent; }).join('\n');
    var olType = {};
    css.replace(/\.(lst-kix_[a-z0-9]+-\d+)\s*>\s*li:before\s*\{\s*content:\s*"[^"]*"\s*counter\([^,]+,\s*([a-z-]+)\)/g, function (m, k, t) { olType[k] = t; return m; });
    var tabs = [], cur = null, hn = 0;
    function newTab(title) { cur = { title: title, parts: [], heads: [] }; tabs.push(cur); }

    function inline(node) {
      if (node.nodeType === 3) return esc(node.nodeValue.replace(/ /g, ' '));
      if (node.nodeType !== 1) return '';
      var t = node.tagName;
      if (t === 'BR') return '<br>';
      if (t === 'IMG') return img(node);
      if (t === 'HR') return '';
      var inner = Array.prototype.map.call(node.childNodes, inline).join('');
      if (t === 'A') {
        var href = node.getAttribute('href') || '';
        if (/^#cmnt/.test(href) || /^#ftnt_ref/.test(href)) return '';
        if (!inner.replace(/<[^>]+>/g, '').trim() && !/<img/.test(inner)) return inner;
        if (/^#h\./.test(href)) return '<a href="javascript:void 0" data-anchor="' + esc((opts.prefix || 'g') + '-' + href.slice(3).replace(/[^a-zA-Z0-9_-]/g, '')) + '">' + inner + '</a>';
        if (/^#/.test(href)) return inner;
        href = unwrap(href);
        if (!/^(https?:|mailto:)/i.test(href)) return inner;
        return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + inner + '</a>';
      }
      if (t === 'SUP') return '<sup>' + inner + '</sup>';
      if (t === 'SUB') return '<sub>' + inner + '</sub>';
      if (t === 'SPAN' || t === 'B' || t === 'I' || t === 'U' || t === 'S' || t === 'EM' || t === 'STRONG') {
        if (!inner) return '';
        var s = sty(node), out = inner;
        var plainText = !/\S/.test(inner.replace(/<br>/g, ''));
        if (plainText) return inner;
        if (/^(700|800|900|bold)$/.test(s['font-weight'] || '') || t === 'B' || t === 'STRONG') out = '<b>' + out + '</b>';
        if (s['font-style'] === 'italic' || t === 'I' || t === 'EM') out = '<i>' + out + '</i>';
        var td = s['text-decoration'] || '';
        if (/underline/.test(td) || t === 'U') out = '<u>' + out + '</u>';
        if (/line-through/.test(td) || t === 'S') out = '<s>' + out + '</s>';
        if (s['vertical-align'] === 'super') out = '<sup>' + out + '</sup>';
        else if (s['vertical-align'] === 'sub') out = '<sub>' + out + '</sub>';
        var css2 = [];
        var col = safeColor(s.color); if (col && !isBlack(col)) css2.push('color:' + col);
        var bg = safeColor(s['background-color']); if (bg && !isBlankBg(bg)) css2.push('background-color:' + bg);
        if (css2.length) out = '<span class="gc" style="' + css2.join(';') + '">' + out + '</span>';
        return out;
      }
      return inner;
    }
    function img(node) {
      var src = node.getAttribute('src') || '';
      if (opts.img) src = opts.img(src);
      if (!src) return '';
      var s = sty(node), w = parseFloat(s.width) || 0, h = parseFloat(s.height) || 0;
      return '<img src="' + esc(src) + '" alt="' + esc(node.getAttribute('alt') || '') + '"' + (w ? ' width="' + Math.round(w) + '"' : '') + (h ? ' height="' + Math.round(h) + '"' : '') + ' loading="lazy" decoding="async">';
    }
    function align(el) { var a = sty(el)['text-align']; return a === 'center' || a === 'right' || a === 'justify' ? a : ''; }
    function para(el, tag, cls) {
      var h = Array.prototype.map.call(el.childNodes, inline).join('').replace(/^(\s|<br>)+|(\s|<br>)+$/g, '');
      if (!h.replace(/<(?!img)[^>]+>/g, '').trim()) return '';
      var a = align(el), c = [cls, a ? 'ga-' + a : ''].filter(Boolean).join(' ');
      return '<' + tag + (c ? ' class="' + c + '"' : '') + '>' + h + '</' + tag + '>';
    }
    function heading(el) {
      var lv = +el.tagName.charAt(1), t = textOf(el);
      var h = para(el, 'h' + Math.min(lv + 2, 6), 'gh gh' + lv);
      if (!h) return '';
      /* ใช้ id เดิมของ Google (h.xxxx) → ไม่เปลี่ยนเมื่อแก้ Doc และลิงก์ภายใน Doc ยังชี้ถูก */
      var id = (opts.prefix || 'g') + '-' + (el.id ? el.id.replace(/^h\./, '').replace(/[^a-zA-Z0-9_-]/g, '') : 'n' + (++hn));
      cur.heads.push({ id: id, l: lv, t: t });
      return h.replace(/^<h(\d)/, '<h$1 id="' + id + '"');
    }
    function listLevel(el) { var m = /lst-kix_[a-z0-9]+-(\d+)/.exec(el.className || ''); return m ? +m[1] : 0; }
    function listKey(el) { var m = /(lst-kix_[a-z0-9]+-\d+)/.exec(el.className || ''); return m ? m[1] : ''; }
    function list(el) {
      var t = el.tagName.toLowerCase(), lv = listLevel(el), items = '';
      Array.prototype.forEach.call(el.children, function (li) {
        if (li.tagName !== 'LI') return;
        var h = Array.prototype.map.call(li.childNodes, inline).join('').replace(/^(\s|<br>)+|(\s|<br>)+$/g, '');
        items += '<li>' + (h || '&nbsp;') + '</li>';
      });
      if (!items) return '';
      var attrs = ' class="gl" style="--l:' + lv + '"';
      if (t === 'ol') {
        var st = parseInt(el.getAttribute('start') || '1', 10), ty = olType[listKey(el)] || ['decimal', 'lower-alpha', 'lower-roman'][lv % 3];
        attrs += ' data-t="' + esc(ty) + '"' + (st > 1 ? ' start="' + st + '"' : '');
      }
      return '<' + t + attrs + '>' + items + '</' + t + '>';
    }
    function cellBlocks(td) {
      var out = '';
      Array.prototype.forEach.call(td.children, function (c) { out += block(c, true); });
      return out || '&nbsp;';
    }
    function table(el) {
      var rows = '';
      el.querySelectorAll(':scope > tbody > tr, :scope > tr, :scope > thead > tr').forEach(function (tr) {
        var cells = '';
        Array.prototype.forEach.call(tr.children, function (td) {
          var s = sty(td), a = [];
          var cs = +td.getAttribute('colspan') || 1, rs = +td.getAttribute('rowspan') || 1;
          if (cs > 1) a.push(' colspan="' + cs + '"');
          if (rs > 1) a.push(' rowspan="' + rs + '"');
          var bg = safeColor(s['background-color']);
          var st = [];
          if (bg && !isBlankBg(bg)) st.push('background-color:' + bg);
          if (s['vertical-align'] === 'middle' || s['vertical-align'] === 'bottom') st.push('vertical-align:' + s['vertical-align']);
          var w = parseFloat(s.width); if (w) a.push(' data-w="' + Math.round(w) + '"');
          cells += '<td' + a.join('') + (st.length ? ' style="' + st.join(';') + '"' : '') + '>' + cellBlocks(td) + '</td>';
        });
        rows += '<tr>' + cells + '</tr>';
      });
      return rows ? '<div class="gtw"><table class="gt">' + rows + '</table></div>' : '';
    }
    function block(el, inCell) {
      if (el.nodeType !== 1) return '';
      var t = el.tagName;
      if (/^H[1-6]$/.test(t)) return inCell ? para(el, 'p', 'gb') : heading(el);
      if (t === 'P') {
        if (el.classList.contains('title')) return para(el, 'p', 'gti');
        if (el.classList.contains('subtitle')) return para(el, 'p', 'gst');
        if (hasMedia(el) && !textOf(el)) {
          var ims = Array.prototype.map.call(el.querySelectorAll('img'), img).join('');
          return (el.querySelector('hr') ? '<hr>' : '') + (ims ? '<figure class="gf">' + ims + '</figure>' : '');
        }
        return para(el, 'p', '');
      }
      if (t === 'UL' || t === 'OL') return list(el);
      if (t === 'TABLE') return table(el);
      if (t === 'HR') return '<hr>';
      if (t === 'DIV') {
        if (el.querySelector('a[href^="#cmnt_ref"]') || /^cmnt/.test(el.id || '')) return '';
        return Array.prototype.map.call(el.children, function (c) { return block(c, inCell); }).join('');
      }
      return para(el, 'p', '');
    }

    Array.prototype.forEach.call(body.children, function (el) {
      if (isTabTitle(el)) { newTab(textOf(el)); return; }
      if (!cur) newTab('');
      var h = block(el, false);
      if (h) cur.parts.push(h);
    });
    /* แท็บแรกที่ไม่มีชื่อ (Doc ที่ไม่มีแท็บ) ถ้าว่างก็ทิ้ง */
    tabs = tabs.filter(function (x, i) { return x.title || x.parts.length || i > 0; });
    return {
      tabs: tabs.map(function (x) {
        return { title: x.title, html: x.parts.join('').replace(/(<hr>){2,}/g, '<hr>'), heads: x.heads };
      })
    };
  }
  var root = typeof window !== 'undefined' ? window : this;
  root.POY_GDOC_LIB = { parse: parse, unwrap: unwrap };
})();
