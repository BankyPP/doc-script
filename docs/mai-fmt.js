/* 1000 MAI — ตรวจรูปแบบชื่อโรคตาม "กฎการตั้งชื่อโรค" (ทำในเบราว์เซอร์ ไม่ต้องใช้ AI)
   POY_MAIFMT.check(ข้อความ) → [{ c: รหัสกฎ, m: ข้อความเตือน }]
   รายการข้างล่างแก้/เพิ่มได้ — ตัวย่อที่ตรวจแล้วว่าถูกแต่ตัวอักษรไม่ตรงชื่อเต็มให้ใส่ใน abbrOK */
(function () {
  var CFG = {
    /* คำที่ไม่ต้องขึ้นต้นตัวพิมพ์ใหญ่ (ยกเว้นเป็นคำแรกของชื่อ) */
    small: ['a', 'an', 'the', 'and', 'or', 'nor', 'but', 'with', 'without', 'for', 'of', 'in', 'into', 'to', 'on', 'onto', 'at', 'by', 'from', 'as', 'via', 'vs', 'versus', 'per', 'than', 'upon', 'within'],
    /* ตัวพิมพ์ใหญ่หลายตัวที่อยู่นอกวงเล็บได้ (เป็นชื่อสากลเอง ไม่ใช่ตัวย่อของชื่อเต็มในชื่อนี้) */
    mainOK: ['COVID', 'VACTERL', 'QT', 'ST', 'TORCH', 'CHARGE', 'MELAS', 'MERRF', 'POEMS', 'SAPHO', 'PANDAS', 'HELLP', 'WAGR', 'CREST'],
    /* genus — คำตัวเล็กที่ตามหลัง = ชื่อ species (เขียนตัวเล็กได้ และต้องตัวเล็ก) */
    genus: ['Acanthamoeba', 'Acinetobacter', 'Actinomyces', 'Aggregatibacter', 'Ancylostoma', 'Angiostrongylus', 'Ascaris', 'Aspergillus', 'Babesia', 'Bacillus', 'Bacteroides', 'Bartonella', 'Blastocystis', 'Bordetella', 'Borrelia', 'Brucella', 'Brugia', 'Burkholderia', 'Campylobacter', 'Candida', 'Capnocytophaga', 'Chlamydia', 'Chlamydophila', 'Citrobacter', 'Clonorchis', 'Clostridioides', 'Clostridium', 'Coccidioides', 'Corynebacterium', 'Coxiella', 'Cryptococcus', 'Cryptosporidium', 'Cutibacterium', 'Cyclospora', 'Echinococcus', 'Eikenella', 'Entamoeba', 'Enterobacter', 'Enterobius', 'Enterococcus', 'Epidermophyton', 'Escherichia', 'Fasciola', 'Fonsecaea', 'Francisella', 'Fusobacterium', 'Gardnerella', 'Giardia', 'Gnathostoma', 'Haemophilus', 'Helicobacter', 'Histoplasma', 'Kingella', 'Klebsiella', 'Legionella', 'Leishmania', 'Leptospira', 'Listeria', 'Malassezia', 'Microsporum', 'Moraxella', 'Mucor', 'Mycobacterium', 'Mycoplasma', 'Naegleria', 'Necator', 'Neisseria', 'Nocardia', 'Opisthorchis', 'Orientia', 'Paragonimus', 'Pasteurella', 'Plasmodium', 'Pneumocystis', 'Prevotella', 'Proteus', 'Pseudomonas', 'Rhizopus', 'Rickettsia', 'Salmonella', 'Sarcoptes', 'Schistosoma', 'Serratia', 'Shigella', 'Sporothrix', 'Staphylococcus', 'Stenotrophomonas', 'Streptococcus', 'Strongyloides', 'Taenia', 'Talaromyces', 'Toxocara', 'Toxoplasma', 'Treponema', 'Trichinella', 'Trichomonas', 'Trichophyton', 'Trichuris', 'Tropheryma', 'Trypanosoma', 'Ureaplasma', 'Vibrio', 'Wuchereria', 'Yersinia'],
    /* ตัวย่อที่ตัวพิมพ์เล็ก/ใหญ่แบบสากลไม่ใช่ตัวใหญ่ล้วน (เขียนเป็นตัวใหญ่ล้วนหรือแบบอื่น = เตือน) */
    caseFix: ['hMPV', 'CoA', 'Hb', 'HbH', 'HbE', 'HbS', 'HbC', 'HbA', 'HbF', 'HbH-CS', 'ASyS', 'SeLECTS', 'HyperKPP', 'HypoKPP', 'MDC1A', 'VWD', 'VZV', 'hATTR', 'pSS', 'cSCC', 'nvAMD', 'wAMD', 'dAMD', 'PsA', 'LAMA2', 'MIS-C', 'MIS-A', 'SJS/TEN', 'TE', 'iTTP', 'cTTP', 'aHUS', 'STEC-HUS', 'HFpEF', 'HFrEF', 'HFmrEF', 'NSTEMI', 'STEMI', 'pJIA', 'sJIA', 'oJIA', 'GvHD'],
    /* คู่ [ชื่อเต็ม, ตัวย่อในวงเล็บ] ที่ตรวจแล้วว่าถูก แม้ตัวอักษรไม่ตรงคำในชื่อเต็มทุกคำ */
    abbrOK: [
      ['Merosin-Deficient Congenital Muscular Dystrophy', 'MDC1A'],
      ['Staphylococcal Scalded Skin Syndrome', '4S'],
      ["Hemoglobin Bart's Hydrops Fetalis Syndrome", 'BHFS'],
      ['Arthrogryposis-Renal Dysfunction-Cholestasis Syndrome', 'ARC Syndrome'],
      ['Early-Onset Neonatal Sepsis', 'EONS'],
      ['Early-Onset Neonatal Sepsis', 'EOS'],
      ['Wheezing-Associated Respiratory Illness', 'WARI'],
      ['Pneumocystis Pneumonia', 'PCP Pneumonia'],
      ['Tracheo-Esophageal Fistula', 'TE Fistula'],
      ['Hyperkalemic Periodic Paralysis', 'HyperKPP'],
      ['Hyperkalemic Periodic Paralysis', 'HYPP']
    ],
    /* คำแนะนำเฉพาะชื่อ (ตรวจแล้วว่าผิด) */
    hint: {
      'Acquired Immunodeficiency Syndrome (AIDS / HIV)': 'HIV เป็นตัวย่อของ Human Immunodeficiency Virus ไม่ใช่ของชื่อโรคนี้ — ควรเป็น (AIDS) ส่วน HIV Infection อยู่ใน Other names แล้ว',
      'Acquired Platelet Dysfunction with Eosinophilia (ADPE)': 'ตัวย่อสากลคือ APDE (สลับ D กับ P)'
    },
    /* ชื่อที่ยกเว้นบางกฎ — { 'ชื่อ': ['รหัสกฎ', …] } */
    skip: {
      'Stevens-Johnson Syndrome/Toxic Epidermal Necrolysis (SJS/TEN)': ['slash']
    }
  };

  var SMALL = {}; CFG.small.forEach(function (w) { SMALL[w] = 1; });
  var GENUS = {}; CFG.genus.forEach(function (w) { GENUS[w.toLowerCase()] = 1; });
  var CASE = {}; CFG.caseFix.forEach(function (w) { CASE[w.toUpperCase()] = w; });
  var OKP = {}; CFG.abbrOK.forEach(function (p) { OKP[norm(p[0]) + '|' + p[1]] = 1; });
  var THAI = /[\u0E00-\u0E7F]/;
  var SPEC = /(ii|ae|i|us|um|is|es|ensis|ans|ens|ica|icum|ata|oides)$/i;   /* หน้าตาคำ species ภาษาละติน */

  function norm(s) { return String(s || '').toLowerCase().replace(/['’`]/g, '').replace(/\s+/g, ' ').trim(); }
  function letters(s) { return s.replace(/['’`.,;:"]/g, ''); }
  /* คำที่ดูเป็นตัวย่อ: ตัวใหญ่ ≥ 2 ตัว · ขึ้นต้นตัวเล็กแล้วมีตัวใหญ่ (hMPV) · มีตัวเลขปนตัวอักษร (G6PD, 4S) */
  function isAbbr(w) { return String(w).split('-').some(abbrPiece); }
  function abbrPiece(w) {
    w = letters(w);
    if (CASE[w.toUpperCase()] === w && /[A-Z]/.test(w)) return true;   /* ตัวย่อที่รู้จัก เช่น Hb */
    if (!/[A-Za-z]/.test(w)) return false;
    if (/^[A-Z][a-z]+[A-Z][a-z]{2,}$/.test(w)) return false;   /* DiGeorge, McCune */
    var caps = (w.match(/[A-Z]/g) || []).length;
    return caps >= 2 || /^[a-z]+[A-Z]/.test(w) || /\d/.test(w) && /[A-Z]/.test(w);
  }
  function karyo(w) { return /^\d*,?[XY0O]+$/.test(w); }

  /* แยกเป็นส่วน ๆ ด้วย / ที่อยู่นอกวงเล็บ */
  function splitTop(s) {
    var parts = [], cur = '', dep = 0, slashBad = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === '(') dep++;
      if (ch === ')') dep--;
      if (ch === '/' && dep === 0) {
        if (s[i - 1] !== ' ' || s[i + 1] !== ' ') slashBad = true;
        parts.push(cur); cur = ''; continue;
      }
      cur += ch;
    }
    parts.push(cur);
    return { parts: parts.map(function (p) { return p.trim(); }).filter(Boolean), slashBad: slashBad };
  }

  /* ตรวจตัวพิมพ์ของคำทั่วไป (ไม่ใช่ตัวย่อ) */
  function capCheck(text, out) {
    var toks = text.split(/\s+/).filter(Boolean), prevGenus = false, first = true;
    toks.forEach(function (tok) {
      var t = tok.replace(/^["'“‘(]+|["'”’),.;:]+$/g, '');
      if (!t) return;
      if (THAI.test(t) || /^\d/.test(t) || karyo(t)) { first = false; prevGenus = false; return; }
      var pieces = t.split(/[-\/]/);
      pieces.forEach(function (p, k) {
        p = p.replace(/['’]s$/, '');
        if (abbrPiece(p)) { if (CFG.mainOK.indexOf(letters(p)) < 0) out.abbr.push(p); return; }
        if (/^[A-Z]$/.test(p)) return;
        var c0 = p.charAt(0);
        if (!c0 || /[0-9Ͱ-Ͽ]/.test(c0) || THAI.test(c0)) return;
        var lw = p.toLowerCase(), isLow = c0 !== c0.toUpperCase(), isFirst = first && k === 0;
        if (k === 0 && prevGenus) {   /* species */
          if (!isLow && SPEC.test(p)) out.push({ c: 'species', m: '"' + p + '" เป็นชื่อ species — ตามหลักต้องเป็นตัวเล็กทั้งคำ (' + lw + ')' });
          return;
        }
        if (isLow) {
          if (SMALL[lw] && !isFirst) return;
          if (lw === 'spp' || lw === 'sp') return;
          out.push({ c: k > 0 ? 'hyphen' : 'cap', m: (k > 0 ? 'คำหลังขีด "' + t + '"' : '"' + p + '"') + ' ต้องขึ้นต้นด้วยตัวพิมพ์ใหญ่' });
        } else if (SMALL[lw] && lw.length >= 2 && !isFirst && p === p.charAt(0) + p.slice(1).toLowerCase()) {
          out.push({ c: 'small', m: '"' + p + '" เป็นคำเชื่อม — ไม่ต้องขึ้นต้นตัวพิมพ์ใหญ่ (' + lw + ')' });
        }
      });
      prevGenus = pieces.length === 1 && !!GENUS[t.toLowerCase()];
      first = false;
    });
  }

  /* ตัวย่อตรงกับชื่อเต็มไหม: ทุกคำ (ยกเว้นคำเชื่อม) ต้องให้ตัวอักษร ≥ 1 ตัว และเริ่มจากตัวแรกของคำ
     คืน null = ไม่ตรง หรือ array ตำแหน่งตัวอักษรของตัวย่อที่ตรงกับ "ตัวแรกของคำ" */
  function abbrMatch(abbr, words) {
    var A = abbr.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    var W = words.map(function (w) { return w.replace(/['’`]/g, '').toLowerCase(); }).filter(Boolean);
    if (!A || !W.length) return null;
    var memo = {}, big = [];
    W.forEach(function (x, k) { if (!SMALL[x]) big.push(k); });
    var fw = big[0], lw = big[big.length - 1];
    function go(i, w, sk) {   /* i = ตำแหน่งในตัวย่อ, w = คำถัดไป, sk = ข้ามคำหลักไปแล้วกี่คำ */
      var key = i + ',' + w + ',' + sk; if (key in memo) return memo[key];
      var res = null;
      if (w === W.length) res = i === A.length ? [] : null;
      else {
        if (SMALL[W[w]]) { res = go(i, w + 1, sk); }   /* คำเชื่อมข้ามได้ */
        else if (!sk && w !== fw && w !== lw) { res = go(i, w + 1, 1); }   /* คำหลักกลางชื่อข้ามได้ 1 คำ (เช่น Dysfunction ใน MASH) */
        if (!res && i < A.length && A[i] === W[w][0]) {
          /* คำนี้ให้ A[i..i+n) — เป็น subsequence ของคำ เริ่มที่ตัวแรก */
          var word = W[w], pos = 0;
          for (var n = 1; i + n <= A.length && !res; n++) {
            if (n > 1) { pos = word.indexOf(A[i + n - 1], pos + 1); if (pos < 0) break; }
            var r = go(i + n, w + 1, sk);
            if (r) res = [i].concat(r);
          }
        }
      }
      memo[key] = res; return res;
    }
    return go(0, 0, 0);
  }
  function wordsOf(s) { return s.split(/[\s\-\/]+/).filter(Boolean); }

  function checkParen(main, inner, full, out) {
    var mainW = main.split(/\s+/).filter(Boolean);
    /* ตัวย่อหลายตัวคั่นด้วย , */
    var alts = inner.split(/\s+\/\s+/);
    if (alts.length === 1 && /,/.test(inner)) {
      var cs = inner.split(/\s*,\s*/);
      if (cs.length > 1 && cs.every(function (x) { return x.split(/\s+/).some(isAbbr); })) { out.push({ c: 'comma', m: 'ตัวย่อหลายแบบให้คั่นด้วย " / " (เว้นวรรคหน้าหลัง) ไม่ใช่ ","' }); alts = cs; }
    }
    alts.forEach(function (alt) {
      alt = alt.trim(); if (!alt) return;
      var toks = alt.split(/\s+/), ai = [];
      toks.forEach(function (t, k) { if (isAbbr(t) && !/^COVID-\d+/.test(t)) ai.push(k); });
      if (!ai.length) {   /* ชื่อที่สอง (ไม่มีตัวย่อ) */
        var o2 = []; o2.abbr = []; capCheck(alt, o2); o2.forEach(function (x) { out.push(x); });
        /* คำสั้นที่เป็นตัวย่อของชื่อเต็มแต่เขียนแบบคำธรรมดา เช่น (Rsv Infection) */
        var mwAll = mainW.map(norm);
        toks.forEach(function (t) {
          var L = letters(t);
          if (!/^[A-Za-z]{2,6}$/.test(L) || mwAll.indexOf(L.toLowerCase()) >= 0 || SMALL[L.toLowerCase()]) return;
          for (var a = 0; a < mainW.length; a++) for (var b = a + 2; b <= mainW.length; b++) {
            if (abbrMatch(L, wordsOf(mainW.slice(a, b).join(' ')))) { out.push({ c: 'case', m: '"' + L + '" ดูเป็นตัวย่อ — ต้องเขียนตัวพิมพ์ตามแบบสากล (เช่น ' + (CASE[L.toUpperCase()] || L.toUpperCase()) + ')' }); return; }
          }
        });
        return;
      }
      var coreToks = toks.slice(ai[0], ai[ai.length - 1] + 1);
      if (coreToks.some(function (t) { return t.split('-').some(function (p) { return /^[A-Z][a-z]{2,}/.test(p) && !abbrPiece(p); }); })) {
        var o4 = []; o4.abbr = []; capCheck(alt.replace(/\S*\d\S*/g, ' '), o4); o4.forEach(function (x) { out.push(x); });
        return;   /* ชื่อที่สองที่มีตัวย่อปน เช่น LAMA2-Related Muscular Dystrophy */
      }
      var pre = toks.slice(0, ai[0]), suf = toks.slice(ai[ai.length - 1] + 1), core = toks.slice(ai[0], ai[ai.length - 1] + 1).join(' ');
      var o3 = []; o3.abbr = []; capCheck(pre.concat(suf).join(' '), o3); o3.forEach(function (x) { out.push(x); });
      /* ตัวพิมพ์ของตัวย่อตามแบบสากล */
      toks.slice(ai[0], ai[ai.length - 1] + 1).forEach(function (t) {
        var L = letters(t), canon = CASE[L.toUpperCase()];
        if (canon && canon !== L) out.push({ c: 'case', m: 'ตัวย่อ "' + L + '" — แบบสากลเขียน "' + canon + '"' });
      });
      if (OKP[norm(main) + '|' + alt]) return;
      var pn = pre.map(norm), sn = suf.map(norm), mn = mainW.map(norm);
      var preOK = pn.every(function (w, k) { return mn[k] === w; });
      var sufOK = sn.every(function (w, k) { return mn[mn.length - sn.length + k] === w; });
      if (!preOK || !sufOK || pn.length + sn.length >= mn.length) {
        if (pre.length || suf.length) return;   /* ชื่อที่สองที่มีตัวย่อปน เช่น LAMA2-Related Muscular Dystrophy */
      }
      var mid = mainW.slice(pre.length, mainW.length - suf.length).join(' ');
      var mw = wordsOf(mid);
      var m = abbrMatch(core, mw);
      if (m) {
        if (!CASE[letters(core).toUpperCase()]) {
          var A = core.replace(/[^A-Za-z0-9]/g, '');
          var bad = m.some(function (i) { return /[a-z]/.test(A[i]); });
          if (bad) out.push({ c: 'case', m: 'ตัวย่อ "' + core + '" — ตัวอักษรที่มาจากตัวแรกของคำมักเป็นตัวพิมพ์ใหญ่ ตรวจว่าเขียนตามแบบสากลหรือไม่' });
        }
        return;
      }
      /* คำท้าย (suffix) ในวงเล็บถูกนับในตัวย่อไปแล้ว เช่น (PJP Pneumonia) */
      if (suf.length && abbrMatch(core, wordsOf(mainW.slice(pre.length).join(' ')))) {
        out.push({ c: 'paren-dup', m: '"' + suf.join(' ') + '" อยู่ในตัวย่อ ' + core + ' แล้ว — ควรเป็น (' + pre.concat([core]).join(' ') + ')' });
        return;
      }
      /* ขาดคำที่ไม่ได้ย่อ (หน้า/ท้าย) ในวงเล็บไหม */
      var ms = mid.split(/\s+/), miss = null;
      for (var x = 0; x < ms.length && !miss; x++) for (var y = ms.length; y > x && !miss; y--) {
        if (x === 0 && y === ms.length) continue;
        if (abbrMatch(core, wordsOf(ms.slice(x, y).join(' ')))) miss = [x, y];
      }
      if (miss) out.push({ c: 'paren-words', m: 'ในวงเล็บต้องมีคำที่ไม่ได้ย่อให้ครบ — ควรเป็น (' + pre.concat(ms.slice(0, miss[0]), [core], ms.slice(miss[1]), suf).join(' ') + ')' });
      else out.push({ c: 'abbr', m: 'ตัวย่อ "' + core + '" ไม่ตรงกับชื่อเต็ม "' + mid + '" — ตัวย่ออาจผิด' });
    });
  }

  function check(raw) {
    var s = String(raw || '').trim(), out = [];
    if (!s || THAI.test(s)) return out;
    var skip = CFG.skip[s] || [];
    if (/covid/i.test(s) && !/COVID-\d{2}/.test(s)) out.push({ c: 'covid', m: 'เขียน COVID-19 ตัวพิมพ์ใหญ่และมีขีดเสมอ' });
    var depth = 0, badPar = false;
    for (var i = 0; i < s.length; i++) { if (s[i] === '(') depth++; if (s[i] === ')') depth--; if (depth < 0 || depth > 1) badPar = true; }
    if (depth !== 0) badPar = true;
    if (badPar) { out.push({ c: 'paren', m: 'วงเล็บเปิด–ปิดไม่ครบคู่' }); return out; }
    var sp = skip.indexOf('slash') >= 0 ? { parts: [s], slashBad: false } : splitTop(s);
    if (sp.slashBad && skip.indexOf('slash') < 0) out.push({ c: 'slash', m: 'คั่นชื่อด้วย " / " ต้องเว้นวรรคหน้าและหลังเครื่องหมาย' });
    sp.parts.forEach(function (part) {
      var gs = part.match(/\([^)]*\)/g) || [];
      var endOK = !gs.length || (gs.length === 1 && /\)\s*$/.test(part));
      if (!endOK) {
        var after = part.replace(/^[^(]*\([^)]*\)/, '').trim();
        out.push({ c: 'paren-end', m: 'วงเล็บต้องอยู่ท้ายสุดของชื่อ' + (after ? ' (มี "' + after + '" ตามหลังวงเล็บ)' : '') + ' — คำที่ตามหลังให้ใส่ทั้งในชื่อเต็มและในวงเล็บ' });
      }
      var main = part.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
      var o = []; o.abbr = [];
      capCheck(main, o);
      o.forEach(function (x) { out.push(x); });
      o.abbr.forEach(function (a) { out.push({ c: 'abbr-main', m: '"' + a + '" เป็นตัวย่อ — ต้องเขียนชื่อเต็ม แล้วใส่ตัวย่อในวงเล็บท้ายชื่อ' }); });
      if (endOK && gs.length === 1) checkParen(main, gs[0].slice(1, -1), s, out);
    });
    if (CFG.hint[s]) out.push({ c: 'hint', m: CFG.hint[s] });
    /* ไม่ซ้ำข้อความ */
    var seen = {};
    return out.filter(function (x) { if (seen[x.m]) return false; seen[x.m] = 1; return true; });
  }

  window.POY_MAIFMT = { check: check, cfg: CFG, abbrMatch: abbrMatch };
})();
