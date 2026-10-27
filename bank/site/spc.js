/* ---------------- Specialty round (MCQ; the MEQ / OSCE boxes link here) ----------------
   Same engine as Admission round (AM="spc": state P.spc, bank "spc|<ward>|<uid>", uid "SPC|…", q.adm=1 + q.spc=1)
   but every question is built ONLY from the ward's own files: Round I/O pages of kind R and N (+ L when the switch is on)
   and resources.js entries (R) that have no I/O pages.
   Choose by topic (the "รวมตามเรื่อง" topics of Round I/O), by R file / page, by N page — any mix — or random from all.
   Pages are drawn like a bag (every chosen page once before any repeats); the last points asked from a page go into the
   prompt so the AI does not ask them again. */
function spcInitP(A){A.sel=A.sel||{all:0,T:[],U:[],L:0};["T","U"].forEach(k=>{if(!Array.isArray(A.sel[k]))A.sel[k]=[];});
  A.on=A.on||0;A.bag=A.bag||{sig:"",list:[]};A.pts=A.pts||{};A.done=A.done||{};if(A.run===undefined)A.run=null;}
const spcA=wid=>PWof(st,wid||ward).spc;
const ioPlain=h=>String(h||"").replace(/<span class="iowas">[\s\S]*?<\/span>/g,"").replace(/\{\{[^}]*\}\}/g,"").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
const SPC_KN={R:"Resource (R)",N:"โน้ตวอร์ด (N)",L:"Lecture (L)"};
/* every page of the ward that can be a source — {key,kind,code,doc,title,id?,topics,rev,text} */
function spcUnits(wid){wid=wid||ward;const W=WARDS[wid],o=[],ioR=new Set();
  ((W&&W.IO&&W.IO.docs)||[]).forEach(d=>{if(!["R","N","L"].includes(d.kind))return;if(d.kind==="R")ioR.add(d.code);
    (d.pages||[]).forEach(p=>{const t=ioPlain(p.html);if(!t)return;
      o.push({key:"p:"+p.id,id:p.id,kind:d.kind,code:d.kind==="N"?"N":d.code,doc:d.kind==="N"?"โน้ตวอร์ด":d.title,title:p.title,topics:(p.topics&&p.topics.length)?p.topics:["อื่น ๆ"],rev:+p.rev||1,text:t.slice(0,9000)});});});
  resOf(W).forEach(r=>{if(!resPts(r).length||(r.code&&ioR.has(r.code)))return;
    const tp=[].concat(r.tags||[]);if(r.topic&&!tp.includes(r.topic))tp.push(r.topic);
    o.push({key:"r:"+(r.code||r.title),kind:"R",code:r.code||"R",doc:r.title,title:r.title,topics:tp.length?tp:["อื่น ๆ"],rev:1,text:"- "+resPts(r).join("\n- ")});});
  return o;}
const spcLabel=u=>u.kind==="N"?`N · โน้ตวอร์ด — ${u.title}`:u.doc===u.title?`${u.code} ${u.title}`:`${u.code} ${u.doc} — ${u.title}`;
function spcAvail(wid){const A=spcA(wid);return spcUnits(wid).filter(u=>u.kind!=="L"||A.sel.L);}
function spcPool(wid){const A=spcA(wid),S=A.sel,us=spcAvail(wid);if(S.all)return us;
  return us.filter(u=>S.U.includes(u.key)||u.topics.some(t=>S.T.includes(t)));}
const spcSig=L=>L.map(u=>u.key).sort().join("|");
/* bag draw: every chosen page once (random order) before any page comes again; never the same page twice in a row */
function spcPick(wid){const A=spcA(wid),pool=spcPool(wid);if(!pool.length)return null;const sig=spcSig(pool),by={};pool.forEach(u=>by[u.key]=u);
  let L_=(A.bag.sig===sig?A.bag.list:[]).filter(k=>by[k]);
  if(!L_.length){L_=shuffle(pool.map(u=>u.key));if(L_.length>1&&L_[0]===A.bag.last)L_.push(L_.shift());}
  const k=L_.shift();A.bag={sig,list:L_,last:k};save();return by[k];}
/* question rules = Unit round (user, 27 Oct 2026 — Project doc kit/กติกาสร้างโจทย์จาก-lecture-resource.md): ~85–90% of questions answerable from the
   source alone, ~10–15% may go slightly beyond it (still needing the source, same topic, outside knowledge only supplementing, explanation says what is
   beyond); cover the whole source weighted by its emphasis; printed text / figures : handwritten notes ≈ 80 : 20 */
const SPC_BEYOND=0.125;
function spcPrompt(src,A){const pts=(A.pts[src.key]||[]).slice(-12),ob=/^obgyn/.test(ward),beyond=Math.random()<SPC_BEYOND;
  return `
CONTENT RULE (Specialty round, same rules as the Unit round): this question is built on the source below, which comes from this ward's own files (${SPC_KN[src.kind]||"file"} ${spcLabel(src)}).
${beyond?`- THIS question (about 1 in 8) may go slightly beyond the source: it must still require knowledge from the source, stay within a topic the source covers, and use outside knowledge (newest guideline / textbook) only as a small supplement. In "why" say plainly which part goes beyond the source ("นอกไฟล์: …").`
:`- The key fact tested and the correct answer MUST be stated in, or follow directly from, the source (answerable from the source alone). Do not test anything the source does not cover.`}
- Over many questions, cover every part of the source, weighting what it emphasises (stars, must-know marks, repeated points); never the parts it marks as nice-to-know / not needed.
- If the source separates handwritten notes from printed slide text or figures, base about 80% of questions on the printed text / figures and about 20% on the handwritten notes.
- Normal anatomy / physiology may be tested as a case; if the source has formulas, numbers, scores or staging, a calculation question is fine (explain step by step).
- The case details and the distractors may use general medical knowledge, but every distractor must be clearly wrong for this case according to the source or standard knowledge.
- Where the source marks a correction, use the corrected statement.
- If the source disagrees with the newest guideline or textbook${ob?" (for this OB-GYN ward: RTCOG, ACOG and Williams, newest editions, rank first)":""}, still test what is correct per that guideline, and explain the difference in "conflict".
- Already asked from this same source, so DO NOT test these points again — pick another fact, or the same topic from a different angle (diagnosis, investigation, management, mechanism, complication): ${pts.length?pts.join("; "):"none yet"}.

Source:
${src.text}
`;}
/* after the AI answers: where the question came from + the passage that answers it; remember the point so it is not asked again */
function spcStamp(q,o,src,wid){const A=spcA(wid);
  q.srcKey=src.key;q.srcRes=spcLabel(src);if(src.id)q.srcPage=src.id;q.spcT=src.topics.slice(0,4);
  q.point=String(o.point||"").slice(0,160);q.quote=san(String(o.quote||"").slice(0,900));q.conflict=san(String(o.conflict||"").slice(0,900));
  A.pts[src.key]=(A.pts[src.key]||[]).concat(q.point||q.topic||[]).slice(-12);A.done[src.key]=src.rev;save();}
function spcScore(A,q,i){const R_=A.run||(A.run={n:0,r:0,byT:{},t0:now()}),ok=i===q.ans?1:0;R_.n++;R_.r+=ok;
  (q.spcT||[]).forEach(t=>{const x=R_.byT[t]||(R_.byT[t]=[0,0]);x[0]++;x[1]+=ok;});}
/* shared Specialty questions that match the current choice (by the page they came from, else by topic) */
function spcSharedSel(L_){const A=spcA(),S=A.sel;if(S.all)return L_;const keys=new Set(spcPool().map(u=>u.key));if(!keys.size)return [];
  return L_.filter(x=>keys.has(x.q.srcKey)||(x.q.spcT||[]).some(t=>S.T.includes(t)));}
/* explanation: the file and the lines that answer this question + a link to that Round I/O page */
function spcSrcBox(q){return `<div class="spcsrc"><div class="spch">📄 ที่มาในไฟล์ของวอร์ด: <b>${esc(q.srcRes||"ไฟล์ของวอร์ด")}</b></div>${q.quote?`<div class="spcq">${q.quote}</div>`:""}${q.conflict?`<div class="spcwarn">⚠ ${q.conflict}</div>`:""}${q.srcPage&&ioAll().some(x=>x.p.id===q.srcPage)?`<a class="linkbtn" href="${ioHref("p",q.srcPage)}">เปิดหน้านี้ใน Round I/O →</a>`:""}</div>`;}
function spcSelTxt(wid){const A=spcA(wid),S=A.sel;if(S.all)return "สุ่มจากทุกเรื่อง"+(S.L?" (รวม L)":"");
  const us=spcAvail(wid).filter(u=>S.U.includes(u.key)),a=S.T.slice(0,3).concat(us.slice(0,3-Math.min(3,S.T.length)).map(u=>u.kind==="N"?u.title:u.code));
  const n=S.T.length+us.length;return n?a.join(", ")+(n>a.length?` และอีก ${n-a.length}`:""):"ยังไม่ได้เลือก";}
/* accuracy per topic from every Specialty question answered (first answer) */
function spcTopicStat(){const o={};bankItems("spc",ward).forEach(x=>{if(!x.q||x.a==null)return;const ok=x.a===x.q.ans?1:0;(x.q.spcT||[]).forEach(t=>{const y=o[t]||(o[t]=[0,0]);y[0]++;y[1]+=ok;});});return o;}
function spcEndRun(){const A=AS();A.on=0;A.ts=now();save();pick=null;$("nav").hidden=true;rSpc();window.scrollTo(0,0);}
function rSpc(){
  const W=W_(),A=spcA(),S=A.sel,all=spcUnits(),hasL=all.some(u=>u.kind==="L"),av=spcAvail(),pool=spcPool(),stat=spcTopicStat(),tab=["T","R","N","L"].includes(st.spcTab)&&(st.spcTab!=="L"||S.L)?st.spcTab:"T";
  $("nav").hidden=true;aiCount();
  let h=`<h1 class="h2">Specialty round</h1><p class="sub">โจทย์ใหม่ที่ AI สร้างทีละข้อแบบ Admission round แต่<b>เนื้อหามาจากไฟล์ของวอร์ดนี้เท่านั้น</b> — เลือกได้ทั้งตามเรื่อง (หัวข้อเดียวกับ “รวมตามเรื่อง” ใน Round I/O) ตามไฟล์ R และตามหน้าโน้ต N เลือกหลายอย่างปนกันได้ หรือสุ่มจากทั้งหมด · สร้างไปเรื่อย ๆ จนกด “จบรอบ” · ทุกข้อเก็บในคลังของคุณ</p>`;
  if(A.run&&A.run.n&&!A.on){const R_=A.run,ts=Object.keys(R_.byT);h+=`<div class="card"><h3>รอบล่าสุด · ${R_.n} ข้อ · ถูก ${R_.r} (${Math.round(R_.r/R_.n*100)}%)</h3>${R_.sel?`<span class="rd">${esc(R_.sel)}</span>`:""}${ts.length?`<div class="spcrun">${ts.map(t=>{const [n,r]=R_.byT[t];return `<span class="tag">${esc(t)} ${r}/${n}</span>`;}).join("")}</div>`:""}</div>`;}
  if(!av.length&&!hasL){h+=`<div class="card"><h3>ยังไม่มี R / N ในวอร์ดนี้</h3><span class="rd" style="margin:0">ส่งไฟล์ resource (R) หรือโน้ตวอร์ด (N) ให้ Claude สรุปเข้า Round I/O ก่อน แล้ว Specialty round จะใช้ได้</span></div>`;}
  else{
    h+=`<div class="tools spcquick"><button class="tool" id="spcAll" aria-pressed="${!!S.all}">🎲 สุ่มทั้งหมด${S.all?" ✓":""}</button><button class="tool" id="spcWeak">⚠ เรื่องที่ผิดบ่อย</button><button class="tool" id="spcNew">🆕 เนื้อหาใหม่<span class="n">${av.filter(u=>(A.done[u.key]||0)<u.rev).length}</span></button><button class="tool" id="spcClr">ล้างที่เลือก</button></div>`;
    if(hasL)h+=`<label class="spcsw"><input type="checkbox" id="spcL" ${S.L?"checked":""}> รวม Lecture (L) ด้วย <span class="hint">— ปกติปิดไว้ เพราะ L มีโจทย์ Unit round อยู่แล้ว</span></label>`;
    const T=new Map();av.forEach(u=>u.topics.forEach(t=>{if(!T.has(t))T.set(t,[]);T.get(t).push(u);}));
    const cnt=k=>k==="T"?T.size:av.filter(u=>u.kind===k).length;
    h+=`<div class="chips spctabs">${[["T","ตามเรื่อง"],["R","R"],["N","N"]].concat(S.L?[["L","L"]]:[]).map(([k,t])=>`<button class="chip" data-sptab="${k}" aria-pressed="${tab===k}">${t} <span class="hint">${cnt(k)}</span></button>`).join("")}</div>`;
    const dim=S.all?` style="opacity:.55"`:"";
    const row=(attr,on,title,meta)=>`<button class="resume qprog" ${attr} aria-pressed="${on}"${dim}><span><b>${esc(title)}</b>${meta?`<span class="rd">${meta}</span>`:""}</span><span class="go">${on?"✓":""}</span></button>`;
    const acc=t=>{const x=stat[t];return x?` · ถูก ${Math.round(x[1]/x[0]*100)}% (${x[0]} ข้อ)`:"";};
    h+=`<div class="stack" style="margin-top:8px">`;
    if(tab==="T"){if(!T.size)h+=`<p class="hint">ยังไม่มีเรื่อง</p>`;
      for(const [t,us] of T){const k=["R","N","L"].map(x=>[x,us.filter(u=>u.kind===x).length]).filter(x=>x[1]).map(x=>`${x[0]} ${x[1]}`).join(" · ");h+=row(`data-sptopic="${esc(t)}"`,S.T.includes(t),t,`${k} หน้า${acc(t)}`);}}
    else{const D=new Map();av.filter(u=>u.kind===tab).forEach(u=>{const c=tab==="N"?u.key:u.code;if(!D.has(c))D.set(c,[]);D.get(c).push(u);});
      if(!D.size)h+=`<p class="hint">${tab==="R"?"ยังไม่มีไฟล์ R ในวอร์ดนี้":tab==="N"?"ยังไม่มีโน้ตวอร์ด N":"ยังไม่มี lecture ใน Round I/O"}</p>`;
      for(const [c,us] of D){const on=us.every(u=>S.U.includes(u.key)),u0=us[0],nw=us.some(u=>(A.done[u.key]||0)<u.rev);
        if(tab==="N"||us.length===1)h+=row(`data-spunit="${esc(u0.key)}"`,on,tab==="N"?u0.title:`${u0.code} ${u0.doc===u0.title?u0.title:u0.doc+" — "+u0.title}`,`${u0.topics.join(", ")}${nw?" · 🆕 ยังไม่เคยออกโจทย์ / มีอัปเดต":""}`);
        else{h+=row(`data-spdoc="${esc(c)}" data-spkind="${tab}"`,on,`${c} ${u0.doc}`,`${us.length} หน้า · ทั้งไฟล์`);
          h+=`<div class="chips spcpages">${us.map(u=>`<button class="chip" data-spunit="${esc(u.key)}" aria-pressed="${S.U.includes(u.key)}"${dim}>${esc(u.title)}</button>`).join("")}</div>`;}}}
    h+=`</div>`;
    const nT=new Set(pool.flatMap(u=>u.topics)).size;
    h+=`<p class="statline" style="margin-top:12px">${S.all?`สุ่มจากทุกหน้า <b>${pool.length}</b> หน้า`:pool.length?`เลือกแล้ว <b>${pool.length}</b> หน้า จาก <b>${nT}</b> เรื่อง`:"ยังไม่ได้เลือก — แตะเรื่อง / ไฟล์ ด้านบน หรือกด 🎲 สุ่มทั้งหมด"}</p>`;
    const cont=A.cur&&A.ans==null&&A.runSig===spcSig(pool);
    h+=`<div class="row2"><span class="spacer"></span><button class="btn primary" id="spcGo" ${pool.length?"":"disabled"}>${cont?"ทำข้อค้างต่อ":"เริ่มสร้างโจทย์"}</button></div>`;}
  {const B=bankItems("spc",ward);if(B.length){const d=B.filter(x=>x.a!=null),r=d.filter(x=>x.a===x.q.ans);h+=`<div class="card"><h3>คลัง Specialty ของฉัน</h3><span class="rd">โจทย์ที่ AI เคยสร้างให้ ${B.length} ข้อ · ตอบแล้ว ${d.length} · ถูก ${r.length} — เปิดดูโจทย์และเฉลยเก่าได้ตลอด แม้ตอนสร้างข้อใหม่ไม่ได้</span><button class="btn" id="admBankBtn">📋 เปิดกระดาษคำตอบ</button></div>`;}}
  h+=sharedAdmCard("spc")+ufaBtn("ufaSpc");
  h+=`<p class="hint">ใช้ร่วมกันทั้ง MCQ / MEQ / OSCE ของวอร์ดนี้ · ต้องมี AI (เปิดใน Claude หรือใส่ API key — ถามตอนกดเริ่ม)</p>`;
  $("main").innerHTML=h;
  const re=()=>{save();rSpc();};
  {const b=$("admBankBtn");if(b)b.onclick=openS;}bindSharedAdm("spc");bindUfa();
  document.querySelectorAll("[data-sptab]").forEach(b=>b.onclick=()=>{st.spcTab=b.dataset.sptab;persist();rSpc();});
  const tg=(arr,v)=>{const i=arr.indexOf(v);if(i<0)arr.push(v);else arr.splice(i,1);};
  document.querySelectorAll("[data-sptopic]").forEach(b=>b.onclick=()=>{S.all=0;tg(S.T,b.dataset.sptopic);re();});
  document.querySelectorAll("[data-spunit]").forEach(b=>b.onclick=()=>{S.all=0;tg(S.U,b.dataset.spunit);re();});
  document.querySelectorAll("[data-spdoc]").forEach(b=>b.onclick=()=>{S.all=0;const us=av.filter(u=>u.kind===b.dataset.spkind&&u.code===b.dataset.spdoc).map(u=>u.key),on=us.every(k=>S.U.includes(k));
    S.U=S.U.filter(k=>!us.includes(k));if(!on)S.U=S.U.concat(us);re();});
  {const b=$("spcAll");if(b)b.onclick=()=>{S.all=S.all?0:1;re();};}
  {const b=$("spcClr");if(b)b.onclick=()=>{S.all=0;S.T=[];S.U=[];re();};}
  {const b=$("spcL");if(b)b.onchange=()=>{S.L=b.checked?1:0;if(!S.L){const lk=new Set(all.filter(u=>u.kind==="L").map(u=>u.key));S.U=S.U.filter(k=>!lk.has(k));}re();};}
  {const b=$("spcWeak");if(b)b.onclick=()=>{const w=Object.keys(stat).filter(t=>stat[t][0]>=2&&stat[t][1]/stat[t][0]<0.6&&av.some(u=>u.topics.includes(t)));
    if(!w.length){toast(Object.keys(stat).length?"ยังไม่มีเรื่องที่ถูกต่ำกว่า 60% (นับเรื่องที่ทำแล้ว ≥ 2 ข้อ)":"ยังไม่มีสถิติ — ทำ Specialty round ก่อน");return;}
    S.all=0;S.T=w;S.U=[];st.spcTab="T";persist();re();toast(`เลือกเรื่องที่ถูกต่ำกว่า 60%: ${w.length} เรื่อง`);};}
  {const b=$("spcNew");if(b)b.onclick=()=>{const nw=av.filter(u=>(A.done[u.key]||0)<u.rev).map(u=>u.key);if(!nw.length){toast("ทุกหน้าเคยออกโจทย์แล้ว และยังไม่มีอัปเดตใหม่");return;}S.all=0;S.T=[];S.U=nw;re();toast(`เลือกหน้าใหม่ / มีอัปเดต ${nw.length} หน้า`);};}
  {const b=$("spcGo");if(b)b.onclick=()=>{const pl=spcPool();if(!pl.length)return;const sig=spcSig(pl);
    if(A.runSig!==sig){A.cur=null;A.next=null;A.ans=null;A.runSig=sig;}   /* another choice: an unanswered question stays in the bank only */
    else if(A.cur&&A.ans!=null){A.cur=A.next||null;A.next=null;A.ans=null;if(A.cur)admBank(ward,A.cur,null);}
    A.on=1;A.run={n:0,r:0,byT:{},t0:now(),sel:spcSelTxt()};A.n=0;A.right=0;A.ts=now();save();admErr="";admSetup=false;rAdm();};}
}
