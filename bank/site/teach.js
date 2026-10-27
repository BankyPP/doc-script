/* ================= Teaching round tools (all wards) =================
   History taking · Physical examination · CTA · Case library  (+ History taker / Physical examinator on the ward home)
   Templates are shared by every ward: bank "tch|all|hx" · "tch|all|pe" · "tch|all|cta"  {rows:[{id,h,c,k,w,tag,off:{ward:bool}}], procs:[…] (CTA)}
   Real-patient cases: bank "case|<ward>|<id>" {title,hx:{rowId:{h,v}},pe:{…},out:{sum,yellow},opt,del}
   Practice results: bank "tlog|<ward>|<id>" {tool,mode,rows:[{h,pct,…}],pct} */
const TK={hx:{n:"History taking",kc:"Key concept",ico:"🗣️"},pe:{n:"Physical examination",kc:"Key concept",ico:"🩺"},cta:{n:"CTA",kc:"Keyword",ico:"🧤"}};
const tId=()=>now().toString(36)+Math.random().toString(36).slice(2,6);
const tAI=()=>HAS_CLAUDE()||!!aiCfg().key;
function tSan(h){return String(h||"").replace(/<\s*(script|style|iframe|object|embed|link|meta)[\s\S]*?(<\/\s*\1\s*>|$)/gi,"").replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,"").replace(/javascript:/gi,"");}
function tchDef(tool){if(tool==="cta")return [];const D=(typeof TCH_DEF!=="undefined"&&TCH_DEF[tool])||[];return D.map(r=>({id:r.id,h:r.h,c:r.c,k:"",tag:r.tag||""}));}
function tchGet(tool){const o=bank["tch|all|"+tool];if(o&&(Array.isArray(o.rows)||Array.isArray(o.procs)))return {rows:(o.rows||[]).map(r=>Object.assign({},r)),procs:JSON.parse(JSON.stringify(o.procs||[]))};return {rows:tchDef(tool),procs:[]};}
function tchPut(tool,o){bankPut("tch|all|"+tool,{rows:o.rows,procs:o.procs||[]});}
/* a row is on in this ward unless switched off here; pediatric rows start off outside Pediatrics, OB rows outside OB-GYN */
function tOn(r,wid){wid=wid||ward;if(r.off&&Object.prototype.hasOwnProperty.call(r.off,wid))return !r.off[wid];if(r.tag==="ped")return /ped/i.test(wid);if(r.tag==="ob")return /ob/i.test(wid);return true;}
let TV={tab:{},ctaP:"",prac:null};
const tT=()=>$("tPrac")||$("tBody");

/* ---------- Teaching round menu ---------- */
const TEACH=[
  {k:"hx",n:"History taking",d:"ตารางซักประวัติครบทุกหัวข้อ (แก้ได้ทุกช่อง เปิด/ปิดหัวข้อรายวอร์ด) · ใส่ key concept · ฝึกพิมพ์ซักประวัติแล้วให้ AI ตรวจเป็น %"},
  {k:"pe",n:"Physical examination",d:"ทุกการตรวจที่ปี 4 ต้องรู้ พร้อมขั้นตอน (แก้ได้ทุกช่อง) · ใส่ key concept · ฝึกแล้วให้ AI ตรวจเป็น %"},
  {k:"cta",n:"CTA",d:"ฝึกหัตถการ: เนื้อหาตามไฟล์ · keyword ที่ต้องมีเป๊ะ ๆ · wording ของตัวเอง · ฝึกพิมพ์แล้วตรวจ keyword"},
  {k:"case",n:"Case",d:"คลังเคสจริงจาก History taker / Physical examinator · สรุปเคสไว้พรีเซนต์ · ร่างใบเหลือง"},
  {k:"yellow",n:"ใบเหลือง",d:"ร่าง case report with discussion แบบ SOAP จากเคสในคลัง (เลือกเคสในหน้า Case)"},
  {k:"flash",n:"Flashcard",d:"ฝึก keyword และความรู้จำเพาะสั้น ๆ แบบถามตอบเร็ว",soon:1},
  {k:"oral",n:"Oral",d:"ฝึกสอบปากเปล่าจาก flashcard",soon:1}];
function rTeach(){
  const nC=bankItems("case",ward).filter(x=>!x.del).length;
  let h=`<h1 class="h2">Teaching round</h1><p class="sub">${esc(W_().cfg.name)} · เลือกเครื่องมือ · ตาราง History / PE / CTA ใช้ร่วมกันทุกวอร์ด (เปิด/ปิดหัวข้อแยกรายวอร์ด)</p>`;
  h+=`<div class="rounds">${TEACH.map((t,i)=>`<button class="round" data-teach="${t.k}" aria-disabled="${!!t.soon}">${t.soon?'<span class="soon">เร็ว ๆ นี้</span>':t.k==="case"&&nC?`<span class="badge">${nC}</span>`:""}<span class="rn">${String(i+1).padStart(2,"0")}</span><b>${t.n}</b><span class="rd">${t.d}${t.k==="cta"?(()=>{const x=((W_().cfg.teach||{}).cta);return Array.isArray(x)&&x.length?" · "+x.map(esc).join(", "):"";})():""}</span></button>`).join("")}</div>`;
  h+=`<div class="stack" style="margin-top:14px"><button class="btn ghost" id="tBack" type="button">กลับหน้าวอร์ด</button></div>`;
  $("main").innerHTML=h;
  document.querySelectorAll("[data-teach]").forEach(b=>b.onclick=()=>{const k=b.dataset.teach,T=TEACH.find(t=>t.k===k);if(T.soon){toast(`${T.n} จะเพิ่มภายหลัง`);return;}
    if(k==="case"||k==="yellow")return go(ward+"/case");go(ward+"/tch/"+k);});
  $("tBack").onclick=()=>go(ward);
}

/* ---------- History taking / PE / CTA pages ---------- */
function tSeg(){return (location.hash||"").replace(/^#\/?/,"").split("/").slice(2).map(x=>{try{return decodeURIComponent(x);}catch(e){return x;}});}
function rTch(){const a=tSeg(),tool=TK[a[0]]?a[0]:"hx";if(TV.prac&&TV.prac.tool!==tool)TV.prac=null;
  let cp=null;
  if(tool==="cta"){const O0=tchGet("cta");if(!a[1])return tCtaList(O0);cp=O0.procs.find(p=>p.id===a[1]);if(!cp){go(ward+"/tch/cta");return;}TV.ctaP=cp.id;}
  const tabs=tool==="cta"?[["full","เนื้อหา"],["key","Keyword"],["mine","Wording ของฉัน"],["prac","ฝึก"]]:[["full","ฉบับเต็ม"],["key","Key concept"],["prac","ฝึก"]];
  const tab=TV.tab[tool]&&tabs.some(t=>t[0]===TV.tab[tool])?TV.tab[tool]:"full";
  let h=cp?`<div class="tchv"><a class="ioback" href="#/${esc(ward)}/tch/cta">← CTA</a><div class="whead"><h1 class="h2">${TK.cta.ico} ${esc(cp.name)}</h1></div>`
    :`<div class="tchv"><div class="whead"><h1 class="h2">${TK[tool].ico} ${TK[tool].n}</h1><a href="#/${esc(ward)}/teach">Teaching round</a></div>`;
  h+=`<div class="tabs ttabs" role="tablist">${tabs.map(([k,n])=>`<button class="tab" role="tab" aria-selected="${k===tab}" data-ttab="${k}">${n}</button>`).join("")}</div><div id="tBody"></div></div>`;
  $("main").innerHTML=h;
  document.querySelectorAll("[data-ttab]").forEach(b=>b.onclick=()=>{TV.tab[tool]=b.dataset.ttab;rTch();});
  const O=tchGet(tool);
  if(tool==="cta")return tCta(O,tab,O.procs.find(p=>p.id===cp.id));
  if(tab==="prac")return tPrac(tool,O.rows);
  tTable(tool,O,tab);}
/* drag ☰ up or down to move a row (mouse, finger or pen); the new order is saved when the row is let go */
function tDrag(box,onDrop){if(!box)return;
  box.querySelectorAll("[data-grip]").forEach(g=>{const r=g.closest(".trow");
    g.onpointerdown=e=>{e.preventDefault();r.classList.add("drag");let lastY=e.clientY;
      /* listen on the window: moving the row in the page drops pointer capture on the grip */
      const move=y=>{const rows=[...box.querySelectorAll(".trow")].filter(x=>x!==r);let before=null;for(const x of rows){const b=x.getBoundingClientRect();if(y<b.top+b.height/2){before=x;break;}}
        if(before){if(before!==r.nextElementSibling)box.insertBefore(r,before);}else if(r!==box.lastElementChild)box.appendChild(r);};
      const tick=setInterval(()=>{const h=window.innerHeight,sy=lastY<70?-14:lastY>h-70?14:0;if(sy){window.scrollBy(0,sy);move(lastY);}},30);
      const pm=ev=>{if(ev.pointerId!==e.pointerId)return;ev.preventDefault();lastY=ev.clientY;move(ev.clientY);};
      const pu=ev=>{if(ev.pointerId!==e.pointerId)return;clearInterval(tick);window.removeEventListener("pointermove",pm);window.removeEventListener("pointerup",pu);window.removeEventListener("pointercancel",pu);r.classList.remove("drag");
        const ord=[...box.querySelectorAll(".trow")].map(x=>+x.dataset.i);if(ord.some((v,k)=>v!==k))onDrop(ord);};
      window.addEventListener("pointermove",pm,{passive:false});window.addEventListener("pointerup",pu);window.addEventListener("pointercancel",pu);};});}
function tSaveLater(tool,O){clearTimeout(tSaveLater._t);tSaveLater._t=setTimeout(()=>tchPut(tool,O),500);}
/* editable table: tab "full" = on/off · heading · content ; tab "key" = heading · content (read only) · key concept */
function tTable(tool,O,tab){const R=O.rows,wn=esc(W_().cfg.short||W_().cfg.name);
  let h=tab==="full"?`<p class="hint">แตะช่องเพื่อแก้ (บันทึกเอง) · ☰ กดค้างแล้วลากขึ้น-ลงเพื่อย้ายช่อง · × ลบช่อง · ☑ = ใช้ในวอร์ด ${wn} (ปิด = สีเทา ไม่ใช้ตอนฝึก / History taker แต่ยังเก็บไว้ครบ) · หัวข้อเด็ก/สูติ ปิดไว้ก่อนในวอร์ดอื่น</p>`
    :`<p class="hint">ใส่ ${TK[tool].kc} ของแต่ละหัวข้อในช่องขวา — ใช้ตรวจตอนฝึก (ถ้าช่องว่าง AI จะตรวจเทียบกับเนื้อหาในช่องกลางแทน)</p>`;
  h+=`<div class="ttable ${tab}">${R.map((r,i)=>{const on=tOn(r);return `<div class="trow${on?"":" off"}" data-i="${i}">${tab==="full"?`<label class="ton" title="ใช้ในวอร์ดนี้"><input type="checkbox" data-on="${i}"${on?" checked":""}></label>`:""}
      <div class="th" ${tab==="full"?`contenteditable="true" data-f="h"`:""}>${esc(r.h)}</div>
      <div class="tc${tab==="key"?" ro":""}" ${tab==="full"?`contenteditable="true" data-f="c"`:""}>${tSan(r.c)}</div>
      ${tab==="key"?`<div class="tk" contenteditable="true" data-f="k" data-ph="พิมพ์ ${TK[tool].kc}…">${tSan(r.k)}</div>`:`<div class="tact"><span class="tgrip" data-grip title="กดค้างแล้วลากขึ้น-ลงเพื่อย้าย" aria-label="ลากเพื่อย้าย">☰</span><button class="tdel" type="button" data-del="${i}" title="ลบช่องนี้" aria-label="ลบช่องนี้">×</button></div>`}</div>`;}).join("")}</div>`;
  if(tab==="full")h+=`<div class="stack" style="margin-top:10px"><button class="btn" id="tAdd" type="button">+ เพิ่มช่องใหม่</button>${bank["tch|all|"+tool]?`<button class="link" id="tReset" type="button">คืนค่าตั้งต้นของตาราง</button>`:""}</div>`;
  $("tBody").innerHTML=h;
  if(tab==="full")tDrag(document.querySelector("#tBody .ttable"),ord=>{const c=R.slice();R.splice(0,R.length,...ord.map(i=>c[i]));tchPut(tool,O);rTch();});
  document.querySelectorAll("#tBody [contenteditable][data-f]").forEach(el=>el.addEventListener("input",()=>{const i=+el.closest(".trow").dataset.i,f=el.dataset.f;R[i][f]=f==="h"?el.textContent.trim():tSan(el.innerHTML);tSaveLater(tool,O);}));
  document.querySelectorAll("[data-on]").forEach(c=>c.onchange=()=>{const r=R[+c.dataset.on];r.off=r.off||{};r.off[ward]=!c.checked;tchPut(tool,O);c.closest(".trow").classList.toggle("off",!c.checked);});
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{const i=+b.dataset.del;if(!await uiAsk(`ลบช่อง “${R[i].h||"ไม่มีชื่อ"}” ออกจากตาราง? (ทุกวอร์ด)`))return;R.splice(i,1);tchPut(tool,O);rTch();});
  {const b=$("tAdd");if(b)b.onclick=()=>{R.push({id:tId(),h:"หัวข้อใหม่",c:"",k:"",tag:""});tchPut(tool,O);rTch();setTimeout(()=>{const el=document.querySelector(".trow:last-child .th");if(el){el.focus();el.scrollIntoView({block:"center"});}},50);};}
  {const b=$("tReset");if(b)b.onclick=async()=>{if(!await uiAsk("คืนตารางเป็นค่าตั้งต้น? ข้อความที่แก้และ key concept ทั้งหมดจะหาย"))return;tchPut(tool,{rows:tchDef(tool)});rTch();};}
}
/* ---------- practice (History / PE: AI grading against key concepts) ---------- */
function tPrac(tool,R){const P=TV.prac;
  if(P&&P.tool===tool&&!P.res)return tPracRun(tool);
  if(P&&P.tool===tool&&P.res)return tPracRes(tool);
  const on=R.filter(r=>tOn(r)),nk=on.filter(r=>String(r.k||"").replace(/<[^>]+>/g,"").trim()).length,opt=st.tprac||{};
  let h=`<div class="card"><h3>ฝึก${tool==="pe"?"ตรวจร่างกาย":"ซักประวัติ"}แบบพิมพ์</h3><span class="rd">ไม่สนเวลา ไม่สนคำพูด — ตรวจว่าที่พิมพ์ครบและสอดคล้องกับ ${TK[tool].kc} ใน tab ที่ 2 แค่ไหน แล้วให้ % รวม และ % ของแต่ละหัวข้อ · ใช้หัวข้อที่เปิดในวอร์ดนี้ ${on.length} หัวข้อ (มี ${TK[tool].kc} แล้ว ${nk})</span>
    <div class="tl-h">แบบฝึก</div><div class="chips"><button class="chip" type="button" data-pm="one" aria-pressed="${opt.mode!=="full"}">สุ่มหัวข้อใหญ่ 1 หัวข้อ (OSCE style)</button><button class="chip" type="button" data-pm="full" aria-pressed="${opt.mode==="full"}">ตารางเปล่า ทำทั้งหมด (full course)</button></div>
    <div class="tl-h">เวลา</div><div class="chips"><button class="chip" type="button" data-pt="0" aria-pressed="${!opt.min}">ไม่จับเวลา</button><button class="chip" type="button" data-pt="1" aria-pressed="${!!opt.min}">จับเวลา</button>${opt.min?`<label class="tmin"><input type="number" id="tMin" min="1" max="180" value="${opt.min}"> นาที</label>`:""}</div>
    ${tAI()?"":`<p class="hint" style="color:var(--wrong)">การตรวจใช้ AI — เปิดหน้านี้ใน Claude หรือใส่ API key ที่ Admission round ก่อน (ฝึกพิมพ์ได้ แต่จะยังไม่ได้คะแนน)</p>`}
    <div class="row2"><span class="spacer"></span><button class="btn primary" id="tGo" type="button" ${on.length?"":"disabled"}>เริ่ม</button></div></div>`;
  h+=tLogHTML(tool);
  $("tBody").innerHTML=h;
  const sv=x=>{st.tprac=Object.assign({},st.tprac||{},x);save();tPrac(tool,R);};
  document.querySelectorAll("[data-pm]").forEach(b=>b.onclick=()=>sv({mode:b.dataset.pm}));
  document.querySelectorAll("[data-pt]").forEach(b=>b.onclick=()=>sv({min:b.dataset.pt==="1"?((st.tprac||{}).min||(opt.mode==="full"?20:7)):0}));
  {const m=$("tMin");if(m)m.onchange=()=>{st.tprac=Object.assign({},st.tprac||{},{min:Math.max(1,+m.value||1)});save();};}
  $("tGo").onclick=()=>{const o=st.tprac||{},rows=o.mode==="full"?on:[on[Math.floor(Math.random()*on.length)]];
    TV.prac={tool,mode:o.mode==="full"?"full":"one",rows:rows.map(r=>({id:r.id,h:r.h,c:r.c,k:r.k})),ans:{},t0:now(),end:o.min?now()+o.min*60000:0};tPracRun(tool);};
  tLogBind(tool);}
function tPracRun(tool){const P=TV.prac;
  let h=`<div class="card tprun"><div class="row2"><b>${P.mode==="full"?"ทำทั้งหมด":"สุ่มได้หัวข้อ"}</b><span class="spacer"></span>${P.end?`<span class="ttimer" id="tTimer"></span>`:""}</div>
    ${P.rows.map((r,i)=>`<div class="tpq"><div class="tpq-h">${P.mode==="full"?`<span class="n">${i+1}</span>`:""}${esc(r.h)}</div><textarea data-pa="${esc(r.id)}" rows="${P.mode==="full"?4:9}" placeholder="พิมพ์สิ่งที่จะ${tool==="pe"?"ตรวจ (และขั้นตอน)":tool==="cta"?"พูด/ทำ":"ซัก"}…">${esc(P.ans[r.id]||"")}</textarea></div>`).join("")}
    <div class="row2"><button class="btn ghost" id="tQuit" type="button">ยกเลิก</button><span class="spacer"></span><button class="btn primary" id="tSub" type="button">ส่งตรวจ</button></div></div>`;
  tT().innerHTML=h;
  document.querySelectorAll("[data-pa]").forEach(t=>t.oninput=()=>{P.ans[t.dataset.pa]=t.value;});
  $("tQuit").onclick=async()=>{if(await uiAsk("ยกเลิกการฝึกครั้งนี้?")){TV.prac=null;rTch();}};
  $("tSub").onclick=()=>tGrade(tool);
  if(P.end){const tick=()=>{const el=$("tTimer");if(!el){clearInterval(show._t);return;}const l=P.end-now();el.textContent=l>0?hms(l).replace(/^00:/,""):"หมดเวลา";el.classList.toggle("late",l<=60000);if(l<=0){clearInterval(show._t);if(!P.res&&!P.busy)tGrade(tool);}};tick();clearInterval(show._t);show._t=setInterval(tick,1000);}
  const f=document.querySelector("[data-pa]");if(f)f.focus();}
/* keyword list: one per line or separated by , ; — "คำ (word)" = either form counts */
function tKws(k){return String(k||"").replace(/<br\s*\/?>/gi,"\n").replace(/<(div|p|li)\b[^>]*>/gi,"\n").replace(/<\/(p|div|li)>/gi,"\n").replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ").split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean).map(s=>{const alts=[];const m=s.replace(/\(([^)]*)\)/g,(_,a)=>{alts.push(a.trim());return "";}).trim();return {label:s,alts:[m].concat(alts).filter(Boolean)};});}
const tNorm=s=>String(s||"").toLowerCase().replace(/\s+/g," ").trim();
async function tGrade(tool){const P=TV.prac;if(P.busy)return;clearInterval(show._t);
  if(tool==="cta"){P.res={rows:P.rows.map(r=>{const K=tKws(r.k),a=tNorm(P.ans[r.id]),hit=[],miss=[];K.forEach(x=>(x.alts.some(t=>a.includes(tNorm(t)))?hit:miss).push(x.label));return {id:r.id,h:r.h,pct:K.length?Math.round(hit.length/K.length*100):null,hit,miss,note:K.length?"":"ยังไม่ได้ใส่ keyword ของช่องนี้"};})};}
  else{if(!tAI()){toast("ต้องใช้ AI ตรวจ — เปิดใน Claude หรือใส่ API key ก่อน");return;}
    P.busy=1;tT().innerHTML=`<div class="card"><b>กำลังตรวจ…</b><span class="rd">AI กำลังเทียบคำตอบกับ ${TK[tool].kc}</span></div>`;
    try{const o=await aiJSON(tGradePrompt(tool,P),6000),L_=Array.isArray(o&&o.rows)?o.rows:[];
      P.res={rows:P.rows.map((r,i)=>{const x=L_.find(y=>y&&y.id===r.id)||L_[i]||{};return {id:r.id,h:r.h,pct:Math.max(0,Math.min(100,Math.round(+x.pct||0))),hit:[].concat(x.hit||[]),miss:[].concat(x.miss||[]),wrong:[].concat(x.wrong||[]),note:x.note||""};}),fb:o&&o.overall_feedback||""};}
    catch(e){P.busy=0;toast("ตรวจไม่สำเร็จ "+(admMsg(e)||"ลองใหม่อีกครั้ง"));tPracRun(tool);return;}P.busy=0;}
  const S=P.res.rows.filter(r=>r.pct!=null);P.res.pct=S.length?Math.round(S.reduce((a,r)=>a+r.pct,0)/S.length):null;
  bankPut("tlog|"+ward+"|"+tId(),{tool,mode:P.mode,proc:P.procName||"",rows:P.res.rows.map(r=>({h:r.h,pct:r.pct})),pct:P.res.pct,ans:P.ans,t:now()});
  tPracRes(tool);}
function tGradePrompt(tool,P){const plain=s=>String(s||"").replace(/<br\s*\/?>/gi,"\n").replace(/<\/(li|p|div)>/gi,"\n").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/[ \t]+/g," ").trim();
  return `You are grading a Thai 4th-year medical student's typed ${tool==="pe"?"physical examination (what they would examine and how)":"history taking (what they would ask the patient)"} practice. Grade ONLY by coverage and correctness against the reference key concepts below — ignore time, wording, language (Thai or English both fine), spelling and order. A point counts as covered if the student's text clearly includes that idea in any wording.

For each section give: pct (0–100, share of the reference key concepts covered correctly), hit (key concepts covered, short), miss (key concepts missing, short), wrong (anything stated that is incorrect or unsafe, may be empty), note (one short Thai tip). Write hit/miss/wrong/note in Thai mixed with English medical terms.

Sections:
${P.rows.map(r=>{const k=plain(r.k);return `--- id: ${r.id}
Section: ${r.h}
Reference key concepts${k?"":" (no key concepts written yet — use this full reference content instead)"}:
${k||plain(r.c)}
Student's answer:
${plain(P.ans[r.id])||"(blank)"}`;}).join("\n")}

Reply with only JSON: {"rows":[{"id":"…","pct":0,"hit":["…"],"miss":["…"],"wrong":["…"],"note":"…"}], "overall_feedback":"2–3 Thai sentences"}`;}
function tPracRes(tool){const P=TV.prac,R=P.res,col=p=>p==null?"var(--muted)":p>=80?"var(--right)":p>=50?"#C98A00":"var(--wrong)";
  const O=tchGet(tool),mine=id=>{if(tool!=="cta")return "";const pr=(O.procs||[]).find(x=>x.id===P.proc),r=pr&&pr.rows.find(x=>x.id===id);return r&&r.w?r.w:"";};
  let h=`<div class="card"><div class="tpct" style="color:${col(R.pct)}">${R.pct==null?"–":R.pct+"%"}</div><span class="rd" style="text-align:center">${P.mode==="full"?"รวมทุกหัวข้อ":"หัวข้อ "+esc(P.rows[0].h)}${R.fb?" · "+esc(R.fb):""}</span></div>`;
  h+=R.rows.map(r=>`<div class="card tres"><div class="row2"><b>${esc(r.h)}</b><span class="spacer"></span><b style="color:${col(r.pct)}">${r.pct==null?"–":r.pct+"%"}</b></div>
    ${r.hit&&r.hit.length?`<div class="tl-h">✓ ครบแล้ว</div><ul class="ok">${r.hit.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
    ${r.miss&&r.miss.length?`<div class="tl-h">✗ ยังขาด</div><ul class="no">${r.miss.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
    ${r.wrong&&r.wrong.length?`<div class="tl-h">⚠ ไม่ถูกต้อง</div><ul class="no">${r.wrong.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
    ${r.note?`<p class="hint">${esc(r.note)}</p>`:""}
    <details><summary>คำตอบของฉัน</summary><p class="tans">${esc(P.ans[r.id]||"(ว่าง)")}</p></details>
    ${mine(r.id)?`<details open><summary>Wording ของฉัน (ไว้ทวน)</summary><div class="tans">${tSan(mine(r.id))}</div></details>`:""}</div>`).join("");
  h+=`<div class="stack"><button class="btn primary" id="tAgain" type="button">ฝึกอีกครั้ง</button></div>`+tLogHTML(tool);
  tT().innerHTML=h;$("tAgain").onclick=()=>{TV.prac=null;rTch();};tLogBind(tool);}
function tLogHTML(tool){const L_=bankItems("tlog",ward).filter(x=>x.tool===tool).reverse().slice(0,8);if(!L_.length)return "";
  return `<h2 class="h2" style="font-size:17px;margin-top:18px">ผลฝึกล่าสุด</h2><div class="card" style="padding:6px">${L_.map(x=>`<div class="srow" style="cursor:default"><span class="meta" style="flex:1">${fmtDT(x.t||x.c)} · ${x.mode==="full"?"ทั้งหมด":esc((x.rows[0]||{}).h||"")}${x.proc?" · "+esc(x.proc):""}</span><b>${x.pct==null?"–":x.pct+"%"}</b></div>`).join("")}</div>`;}
function tLogBind(){}

/* ---------- CTA: list page (drag ☰ to reorder · tap to open) + one page per procedure ---------- */
const tCtaHref=id=>"#/"+ward+"/tch/cta"+(id?"/"+encodeURIComponent(id):"");
const tTxt=h=>String(h||"").replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ").trim();
/* a procedure tagged with a ward (p.ward) shows only in that ward; untagged ones (older) show in every ward */
const tCtaVis=(p,w)=>!p.ward||p.ward===(w||ward);
function tCtaList(O){const IX=O.procs.map((p,i)=>tCtaVis(p)?i:-1).filter(i=>i>=0),PR=IX.map(i=>O.procs[i]);TV.prac=null;
  let h=`<div class="tchv"><div class="whead"><h1 class="h2">${TK.cta.ico} CTA</h1><a href="#/${esc(ward)}/teach">Teaching round</a></div>
    <p class="sub" style="margin:0 0 12px">หัตถการของบัญชีนี้ในวอร์ดนี้ (หัตถการที่เพิ่มในวอร์ดไหนขึ้นเฉพาะวอร์ดนั้น) · แตะเพื่อเปิด · ☰ กดค้างแล้วลากขึ้น-ลงเพื่อจัดลำดับ (บันทึกเอง)</p>`;
  h+=PR.length?`<div class="ctalist">${PR.map((p,i)=>{const R=p.rows||[],n=R.filter(r=>tTxt(r.c)).length,nk=R.filter(r=>tKws(r.k).length).length;
      return `<div class="trow ctarow" data-i="${i}"><span class="tgrip" data-grip title="กดค้างแล้วลากขึ้น-ลงเพื่อย้าย" aria-label="ลากเพื่อย้าย">☰</span><a class="iorow" href="${tCtaHref(p.id)}"><span class="iocode">${i+1}</span><span class="iot"><b>${esc(p.name)}</b><span class="rd">${n} ช่อง · keyword ${nk}/${R.length}${p.src?` · ${esc(p.src)}`:""}</span></span><span class="go">→</span></a></div>`;}).join("")}</div>`
    :`<div class="empty">ยังไม่มีหัตถการ — กด “📄 ใส่ไฟล์ CTA” ให้เว็บเติมเนื้อหาตามไฟล์ทุกคำ หรือ “+ เพิ่มหัตถการ” แล้วพิมพ์เอง</div>`;
  h+=`<div class="stack" style="margin-top:12px"><button class="btn primary" id="tcImp" type="button">📄 ใส่ไฟล์ CTA</button><button class="btn" id="cpAdd" type="button">+ เพิ่มหัตถการ</button></div></div>`;
  $("main").innerHTML=h;tCtaBind(O,null);$("tcImp").onclick=()=>tCtaImport(O,null);
  tDrag(document.querySelector(".ctalist"),ord=>{const c=O.procs.slice(),nv=ord.map(i=>c[IX[i]]);IX.forEach((j,k)=>{c[j]=nv[k];});O.procs=c;tchPut("cta",O);tCtaList(O);});}
function tCta(O,tab,cur){let h="";
  if(tab==="prac"){TV.ctaP=cur.id;h+=`<div id="tPrac"></div>`;$("tBody").innerHTML=h;
    if(TV.prac&&(TV.prac.tool!=="cta"||TV.prac.proc!==cur.id))TV.prac=null;
    if(TV.prac&&!TV.prac.res)return tPracRun("cta");if(TV.prac&&TV.prac.res)return tPracRes("cta");
    return tPracCta(cur,cur.rows.map((r,i)=>({id:r.id,h:"ช่องที่ "+(i+1),c:r.c,k:r.k})));}
  h+=`<div class="row2" style="margin:8px 0"><span class="spacer"></span>${tab==="full"?`<button class="link" id="tcImp" type="button">📄 ใส่ไฟล์</button>`:""}${tab==="full"&&HAS_CLAUDE()&&CFG.siteUrl?`<button class="link" id="tcWeb" type="button">🌐 ส่ง CTA ไปเว็บ</button>`:""}<button class="link" id="cpRen" type="button">เปลี่ยนชื่อ</button><button class="link" id="cpDel" type="button">ลบหัตถการ</button></div>`;
  h+=tab==="full"?`<p class="hint">${cur.src?`จากไฟล์ ${esc(cur.src)} · `:""}เนื้อหาตามไฟล์ทุกคำ (ลายมือในไฟล์ = <span class="hw">สีน้ำเงิน</span>) · แตะช่องเพื่อแก้ · บันทึกเอง · ☰ ลากขึ้น-ลงเพื่อย้าย · × ลบช่อง</p>`:tab==="key"?`<p class="hint">Keyword ที่ต้องมี “เป๊ะ ๆ” จึงได้คะแนน — 1 คำต่อบรรทัด (หรือคั่นด้วย , ) · คำในวงเล็บ = ใช้แทนคำข้างหน้าได้ เช่น <b>ล้างมือ (hand hygiene)</b></p>`:`<p class="hint">เขียนสิ่งที่ตัวเองจะพูดจริง — จะโชว์ให้ทวนตอนเฉลยในแท็บฝึก</p>`;
  h+=`<div class="ttable cta ${tab}">${cur.rows.map((r,i)=>`<div class="trow" data-i="${i}">${tab==="full"?`<div class="tc" contenteditable="true" data-f="c">${tSan(r.c)}</div><div class="tact"><span class="tgrip" data-grip title="กดค้างแล้วลากขึ้น-ลงเพื่อย้าย" aria-label="ลากเพื่อย้าย">☰</span><button class="tdel" type="button" data-del="${i}" title="ลบช่องนี้" aria-label="ลบช่องนี้">×</button></div>`
      :`<div class="tc ro">${tSan(r.c)}</div><div class="tk" contenteditable="true" data-f="${tab==="key"?"k":"w"}" data-ph="${tab==="key"?"keyword…":"wording ของฉัน…"}">${tSan(tab==="key"?r.k:r.w)}</div>`}</div>`).join("")}</div>`;
  if(tab==="full")h+=`<div class="stack" style="margin-top:10px"><button class="btn" id="tAdd" type="button">+ เพิ่มช่อง</button></div><div id="tcNote" class="rd" style="margin-top:8px"></div><div id="tcOrig" class="tcorig" hidden></div>`;
  $("tBody").innerHTML=h;if(tab==="full"){tDrag(document.querySelector("#tBody .ttable"),ord=>{const c=cur.rows.slice();cur.rows=ord.map(i=>c[i]);tchPut("cta",O);rTch();});$("tcImp").onclick=()=>tCtaImport(O,cur);tCtaOrig(cur.id);const w=$("tcWeb");if(w)w.onclick=()=>{tchPut("cta",O);sendWeb(["tch|all|cta"],"tcNote");};}
  document.querySelectorAll("#tBody [contenteditable][data-f]").forEach(el=>el.addEventListener("input",()=>{const i=+el.closest(".trow").dataset.i;cur.rows[i][el.dataset.f]=tSan(el.innerHTML);tSaveLater("cta",O);}));
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{if(!await uiAsk("ลบช่องนี้?"))return;cur.rows.splice(+b.dataset.del,1);tchPut("cta",O);rTch();});
  {const b=$("tAdd");if(b)b.onclick=()=>{cur.rows.push({id:tId(),c:"",k:"",w:""});tchPut("cta",O);rTch();};}
  {const b=$("cpRen");if(b)b.onclick=async()=>{const n=await uiInput("ชื่อหัตถการ",cur.name);if(n&&n.trim()){cur.name=n.trim();tchPut("cta",O);rTch();}};}
  {const b=$("cpDel");if(b)b.onclick=async()=>{if(!await uiAsk(`ลบหัตถการ “${cur.name}” ทั้งหมด?`))return;O.procs=O.procs.filter(p=>p!==cur);tFileDel(cur.id);TV.ctaP="";TV.prac=null;tchPut("cta",O);go(ward+"/tch/cta");};}}
function tCtaLabel(r){const t=String(r.c||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();return t.length>70?t.slice(0,70)+"…":t||"(ช่องว่าง)";}
function tCtaBind(O){const b=$("cpAdd");if(!b)return;
  b.onclick=async()=>{const n=await uiInput("ชื่อหัตถการ (เช่น NG tube insertion)");if(!n||!n.trim())return;const p={id:tId(),name:n.trim(),ward,rows:[{id:tId(),c:"",k:"",w:""}]};O.procs.push(p);TV.ctaP=p.id;TV.tab.cta="full";tchPut("cta",O);go(ward+"/tch/cta/"+encodeURIComponent(p.id));};}
function tPracCta(cur,R){const box=tT();
  const nk=R.filter(r=>tKws(r.k).length).length;
  box.innerHTML=(`<div class="card"><h3>ฝึก ${esc(cur.name)}</h3><span class="rd">พิมพ์ตอบทุกช่อง (หรือสุ่ม 1 ช่อง) แล้วตรวจว่ามี keyword ครบเป๊ะ ๆ ตาม tab Keyword ไหม — ไม่ใช้ AI · มี keyword แล้ว ${nk}/${R.length} ช่อง</span>
    <div class="chips"><button class="chip" type="button" id="cpFull">ทำทุกช่อง</button><button class="chip" type="button" id="cpOne">สุ่ม 1 ช่อง</button></div>
    <div class="tl-h">เวลา</div><div class="chips"><button class="chip" type="button" data-ctm="0" aria-pressed="${!(st.tprac||{}).cmin}">ไม่จับเวลา</button><button class="chip" type="button" data-ctm="1" aria-pressed="${!!(st.tprac||{}).cmin}">จับเวลา</button>${(st.tprac||{}).cmin?`<label class="tmin"><input type="number" id="ctMin" min="1" max="120" value="${st.tprac.cmin}"> นาที</label>`:""}</div></div>`+tLogHTML("cta"));
  const start=mode=>{const on=R.filter(r=>tKws(r.k).length||String(r.c||"").replace(/<[^>]+>/g,"").trim());if(!on.length){toast("หัตถการนี้ยังไม่มีเนื้อหา");return;}const rows=mode==="full"?on:[on[Math.floor(Math.random()*on.length)]],m=(st.tprac||{}).cmin||0;
    TV.prac={tool:"cta",proc:cur.id,procName:cur.name,mode,rows,ans:{},t0:now(),end:m?now()+m*60000:0};rTch();};
  $("cpFull").onclick=()=>start("full");$("cpOne").onclick=()=>start("one");
  document.querySelectorAll("[data-ctm]").forEach(b=>b.onclick=()=>{st.tprac=Object.assign({},st.tprac||{},{cmin:b.dataset.ctm==="1"?((st.tprac||{}).cmin||10):0});save();rTch();});
  {const m=$("ctMin");if(m)m.onchange=()=>{st.tprac=Object.assign({},st.tprac||{},{cmin:Math.max(1,+m.value||1)});save();};}}

/* ---------- ward home: History taker / Physical examinator ---------- */
function tkHomeCard(){const n=bankItems("case",ward).filter(x=>!x.del).length;
  return `<div class="tkcard"><button class="tkb" type="button" data-go="taker/hx"><span class="i">🗣️</span><b>History taker</b><span class="rd">บันทึกประวัติคนไข้จริง</span></button><button class="tkb" type="button" data-go="taker/pe"><span class="i">🩺</span><b>Physical examinator</b><span class="rd">บันทึกการตรวจร่างกายจริง</span></button><button class="tkb sm" type="button" data-go="case"><span class="i">📁</span><b>Case</b><span class="rd">${n?`${n} เคส`:"คลังเคส"}</span></button></div>`;}
const tCases=()=>bankItems("case",ward).filter(x=>!x.del).sort((a,b)=>(b.ts||0)-(a.ts||0));
function rTaker(){const a=tSeg(),tool=a[0]==="pe"?"pe":"hx",cid=a[1]||"",C=cid&&bank[cid]&&!bank[cid].del?bank[cid]:null,R=tchGet(tool).rows.filter(r=>tOn(r)),D=(C&&C[tool])||{},cs=tCases();
  let h=`<div class="tchv"><div class="whead"><h1 class="h2">${tool==="pe"?"🩺 Physical examinator":"🗣️ History taker"}</h1><a href="#/${esc(ward)}">กลับหน้าวอร์ด</a></div>
    <p class="sub">${tool==="pe"?"ใส่สิ่งที่ตรวจพบจากคนไข้จริง":"ใส่ข้อมูลที่ซักจากคนไข้จริง"} ตามหัวข้อในตาราง ${TK[tool].n} (หัวข้อที่เปิดในวอร์ดนี้) · ไม่ต้องใส่ชื่อ-นามสกุลหรือ HN จริงของคนไข้</p>
    <div class="card"><div class="dtrow"><label style="flex:1">เคส<select id="tkCase"><option value="">+ เคสใหม่</option>${cs.map(x=>`<option value="${esc(x.key)}"${x.key===cid?" selected":""}>${esc(x.title||"เคสไม่มีชื่อ")} · ${fmtDT(x.c)}</option>`).join("")}</select></label></div>
    <label class="tkt">ชื่อเคส (สั้น ๆ)<input type="text" id="tkTitle" value="${esc(C?C.title:"")}" placeholder="เช่น ชาย 60 ปี ปวดท้องขวาบน 2 วัน"></label></div>
    <div class="ttable taker">${R.map(r=>`<div class="trow"><div class="th">${esc(r.h)}${String(r.k||"").replace(/<[^>]+>/g,"").trim()?`<details class="tkk"><summary>key concept</summary>${tSan(r.k)}</details>`:""}</div><textarea data-tk="${esc(r.id)}" rows="3" placeholder="…">${esc((D[r.id]||{}).v||"")}</textarea></div>`).join("")}</div>
    <div class="stack" style="margin-top:12px"><button class="btn primary" id="tkSave" type="button">บันทึก</button></div></div>`;
  $("main").innerHTML=h;
  $("tkCase").onchange=e=>go(ward+"/taker/"+tool+(e.target.value?"/"+encodeURIComponent(e.target.value):""));
  $("tkSave").onclick=()=>{const key=C?cid:"case|"+ward+"|"+tId(),o=Object.assign({},C||{});o.title=$("tkTitle").value.trim()||o.title||(tool==="pe"?"เคสตรวจร่างกาย":"เคสใหม่")+" "+fmtDT(now());
    const d={};document.querySelectorAll("[data-tk]").forEach(t=>{const r=R.find(x=>x.id===t.dataset.tk);if(t.value.trim())d[t.dataset.tk]={h:r?r.h:"",v:t.value};});o[tool]=Object.assign({},o[tool]||{},d);
    Object.keys(o[tool]).forEach(k=>{if(!d[k]&&R.some(r=>r.id===k))delete o[tool][k];});
    bankPut(key,o);tAfterSave(key);};}
function tAfterSave(key){const ped=/ped/i.test(ward),dlg=document.createElement("div");dlg.className="mqdlg";
  dlg.innerHTML=`<div class="mqdlg-box"><h3>บันทึกเข้าคลังเคสแล้ว ✓</h3><span class="rd">เปิดดูได้จาก “Case” ใน Teaching round · ทำอะไรต่อ?</span>
    <div class="stack" style="margin-top:10px"><button class="btn" data-ta="sum" type="button">สรุปเคสไว้พรีเซนต์ (AI)</button><button class="btn" data-ta="yellow" type="button">ร่างใบเหลือง (AI)</button></div>
    <label class="ck"><input type="checkbox" id="taHol"> รวม holistic discussion</label><label class="ck"><input type="checkbox" id="taRes"> รวม RES discussion</label>${ped?`<p class="hint">วอร์ดเด็ก: ใบเหลืองมี off-service note / discharge summary ด้วย</p>`:""}
    <div class="stack"><button class="btn ghost" data-ta="none" type="button">เก็บไว้ในคลังอย่างเดียว</button></div></div>`;
  document.body.appendChild(dlg);
  dlg.querySelectorAll("[data-ta]").forEach(b=>b.onclick=()=>{const k=b.dataset.ta,opt={hol:$("taHol").checked,res:$("taRes").checked};dlg.remove();go(ward+"/case/"+encodeURIComponent(key));if(k!=="none")setTimeout(()=>tCaseAI(key,k,opt),80);});}
function rCase(){const a=tSeg(),cid=a[0]||"";
  if(cid&&bank[cid]&&!bank[cid].del)return tCasePage(cid);
  const L_=tCases();
  let h=`<div class="tchv"><div class="whead"><h1 class="h2">📁 Case</h1><a href="#/${esc(ward)}/teach">Teaching round</a></div><p class="sub">เคสจริงจาก History taker / Physical examinator ของวอร์ดนี้ · แตะเพื่อดู สรุปเคส หรือร่างใบเหลือง</p>
    <div class="stack" style="margin-bottom:10px"><button class="btn" data-go2="taker/hx" type="button">🗣️ History taker</button><button class="btn" data-go2="taker/pe" type="button">🩺 Physical examinator</button></div>`;
  h+=L_.length?`<div class="card" style="padding:6px">${L_.map(x=>`<button class="srow" data-case="${esc(x.key)}"><span class="meta" style="flex:1"><b>${esc(x.title||"เคสไม่มีชื่อ")}</b> · ${fmtDT(x.c)}</span><span class="tch-chips">${x.hx&&Object.keys(x.hx).length?"<i>Hx</i>":""}${x.pe&&Object.keys(x.pe).length?"<i>PE</i>":""}${x.out&&x.out.sum?"<i>สรุป</i>":""}${x.out&&x.out.yellow?"<i>ใบเหลือง</i>":""}</span></button>`).join("")}</div>`:`<div class="empty">ยังไม่มีเคส — เริ่มจาก History taker หรือ Physical examinator</div>`;
  $("main").innerHTML=h+`</div>`;
  document.querySelectorAll("[data-case]").forEach(b=>b.onclick=()=>go(ward+"/case/"+encodeURIComponent(b.dataset.case)));
  document.querySelectorAll("[data-go2]").forEach(b=>b.onclick=()=>go(ward+"/"+b.dataset.go2));}
function tCasePage(cid){const C=bank[cid],sec=(tool,n)=>{const d=C[tool]||{},ks=Object.keys(d);return `<div class="card"><div class="row2"><h3 style="margin:0">${n}</h3><span class="spacer"></span><button class="link" data-ed="${tool}" type="button">แก้</button></div>${ks.length?`<div class="ttable view">${ks.map(k=>`<div class="trow"><div class="th">${esc(d[k].h)}</div><div class="tc">${esc(d[k].v).replace(/\n/g,"<br>")}</div></div>`).join("")}</div>`:`<p class="hint">ยังไม่ได้บันทึก</p>`}</div>`;},O=C.out||{},busy=TV.aiBusy===cid;
  let h=`<div class="tchv"><div class="whead"><h1 class="h2">${esc(C.title||"เคส")}</h1><a href="#/${esc(ward)}/case">คลังเคส</a></div><p class="sub">${fmtDT(C.c)}${C.ts&&C.ts!==C.c?" · แก้ล่าสุด "+fmtDT(C.ts):""}</p>`;
  h+=sec("hx","History")+sec("pe","Physical examination");
  h+=`<div class="card"><h3>ประมวลผลด้วย AI</h3>${busy?`<p><b>กำลังเขียน…</b> (อาจใช้เวลา 1–2 นาที)</p>`:""}<div class="stack"><button class="btn" id="cSum" type="button" ${busy?"disabled":""}>${O.sum?"สรุปเคสใหม่":"สรุปเคสไว้พรีเซนต์"}</button><button class="btn" id="cYel" type="button" ${busy?"disabled":""}>${O.yellow?"ร่างใบเหลืองใหม่":"ร่างใบเหลือง (SOAP)"}</button></div>
    <label class="ck"><input type="checkbox" id="cHol"${(C.opt||{}).hol?" checked":""}> รวม holistic discussion</label><label class="ck"><input type="checkbox" id="cRes"${(C.opt||{}).res?" checked":""}> รวม RES discussion</label>${tAI()?"":`<p class="hint" style="color:var(--wrong)">ต้องเปิดใน Claude หรือใส่ API key ที่ Admission round ก่อน</p>`}</div>`;
  if(O.sum)h+=`<div class="card tout"><div class="row2"><h3 style="margin:0">สรุปเคส (พรีเซนต์)</h3><span class="spacer"></span><button class="link" data-cp="sum" type="button">คัดลอก</button></div><div class="tdoc" id="oSum">${tSan(O.sum)}</div></div>`;
  if(O.yellow)h+=`<div class="card tout"><div class="row2"><h3 style="margin:0">ใบเหลือง (ร่าง)</h3><span class="spacer"></span><button class="link" data-cp="yellow" type="button">คัดลอก</button></div><div class="tdoc" id="oYellow">${tSan(O.yellow)}</div></div>`;
  h+=`<div class="stack"><button class="link" id="cDel" type="button" style="color:var(--wrong)">ลบเคสนี้</button></div></div>`;
  $("main").innerHTML=h;
  document.querySelectorAll("[data-ed]").forEach(b=>b.onclick=()=>go(ward+"/taker/"+b.dataset.ed+"/"+encodeURIComponent(cid)));
  const opt=()=>({hol:$("cHol").checked,res:$("cRes").checked});
  $("cSum").onclick=()=>tCaseAI(cid,"sum",opt());$("cYel").onclick=()=>tCaseAI(cid,"yellow",opt());
  document.querySelectorAll("[data-cp]").forEach(b=>b.onclick=()=>{const el=$(b.dataset.cp==="sum"?"oSum":"oYellow");try{navigator.clipboard.writeText(el.innerText);toast("คัดลอกแล้ว");}catch(e){toast("คัดลอกไม่ได้");}});
  $("cDel").onclick=async()=>{if(!await uiAsk("ลบเคสนี้?"))return;bankPut(cid,Object.assign({},C,{del:true}));go(ward+"/case");};}
async function tCaseAI(cid,kind,opt){const C=bank[cid];if(!C)return;if(!tAI()){toast("ต้องเปิดใน Claude หรือใส่ API key ก่อน");return;}
  TV.aiBusy=cid;bankPut(cid,Object.assign({},C,{opt}));if(view==="case")tCasePage(cid);
  try{const o=await aiJSON(tCasePrompt(C,kind,opt),9000),html=o&&(o.html||o.text)||"";if(!html)throw {code:"invalid_json"};
    const C2=bank[cid];C2.out=Object.assign({},C2.out||{},{[kind]:tSan(html)});bankPut(cid,C2);toast(kind==="sum"?"สรุปเคสเสร็จแล้ว":"ร่างใบเหลืองเสร็จแล้ว");}
  catch(e){toast("ทำไม่สำเร็จ "+(admMsg(e)||"ลองใหม่อีกครั้ง"));}
  TV.aiBusy=null;if(view==="case"&&(location.hash||"").includes(encodeURIComponent(cid)))tCasePage(cid);}
function tCasePrompt(C,kind,opt){const w=W_().cfg,y=yrN(),ped=/ped/i.test(ward),sec=t=>Object.values(C[t]||{}).map(x=>`${x.h}: ${x.v}`).join("\n")||"(not recorded)";
  const base=`Real patient data typed by a ${y?ord(y)+"-year":"clinical-year"} Thai medical student at ${INST.enShort} on the ${w.name} ward (Thai/English shorthand as typed):

HISTORY
${sec("hx")}

PHYSICAL EXAMINATION
${sec("pe")}

Rules: use ONLY the information given — never invent findings, lab results or history; where something important is missing write "ยังไม่ได้ซัก/ยังไม่ได้ตรวจ — ควรถาม/ตรวจ: …". Write in Thai mixed with English medical terms, the way Thai ward notes are written. Output HTML using only <h3>, <h4>, <p>, <ul>, <ol>, <li>, <b>, <i>, <table>, <tr>, <th>, <td>, <br>.`;
  if(kind==="sum")return base+`

Task: prepare a concise CASE PRESENTATION the student can present on ward rounds: patient profile, chief complaint, present illness (organized timeline), pertinent past/personal/family history, pertinent review of systems, physical examination (pertinent positive and negative), problem list, differential diagnoses with supporting/opposing points, initial investigations and management plan, and 3–5 questions staff are likely to ask with short model answers.
Reply with only JSON: {"html":"…"}`;
  return base+`

Task: draft a CASE REPORT WITH DISCUSSION (ใบเหลือง) in this order: 1) History (full, organized), 2) Physical examination, 3) Problem list, 4) Discussion in SOAP format for each problem (S, O, A with differential diagnosis and reasoning citing current standard guidelines, P with diagnostic, therapeutic and educational plans), 5) Suggested progress notes for the first days of admission — for each day what to document and what to discuss/explain to the patient and family${ped?", 6) Off-service note and discharge summary (pediatric ward)":""}${opt&&opt.hol?`, then a HOLISTIC DISCUSSION (bio-psycho-social: illness experience — feelings, ideas, function, expectation; family and social context; continuity and prevention)`:""}${opt&&opt.res?`, then a RES DISCUSSION (an evidence-based discussion of one focused clinical question arising from this case: question in PICO form, key evidence or guideline with year, appraisal in brief, and how it applies to this patient)`:""}. Mark clearly any part that needs data the student has not recorded.
Reply with only JSON: {"html":"…"}`;}

/* ---------- CTA: import a file (PDF / image / Word / text) → fill the content column ----------
   Each account keeps its own CTA (bank "tch|all|cta" syncs with that account only).
   With AI (Claude in the artifact, or an API key on the web): pages are read as images → printed text word for word + handwriting in <span class="hw">.
   Without AI: printed text only (PDF text layer / .docx / .txt) — exact, no handwriting.
   Page images of the original file stay in this browser (IndexedDB "tcta-files"), keyed by procedure id. */
const T_PDFJS="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
const tLoadJS=src=>new Promise((ok,no)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=()=>no({code:"lib"});document.head.appendChild(s);});
async function tPdfLib(){if(window.pdfjsLib)return window.pdfjsLib;
  /* worker first: pdf.js then runs it on the main thread (no cross-origin Worker needed) */
  if(!window.pdfjsWorker)await tLoadJS(T_PDFJS+"pdf.worker.min.js");await tLoadJS(T_PDFJS+"pdf.min.js");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc=T_PDFJS+"pdf.worker.min.js";return window.pdfjsLib;}
/* tiny IndexedDB store for the original pages */
function tIDB(){return new Promise((ok,no)=>{try{const r=indexedDB.open("tcta-files",1);r.onupgradeneeded=()=>r.result.createObjectStore("f");r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);}catch(e){no(e);}});}
async function tFileSave(pid,pages){try{const db=await tIDB();await new Promise((ok,no)=>{const t=db.transaction("f","readwrite");t.objectStore("f").put(pages,pid);t.oncomplete=ok;t.onerror=()=>no(t.error);});}catch(e){console.warn("idb",e);}}
async function tFileGet(pid){try{const db=await tIDB();return await new Promise(ok=>{const q=db.transaction("f").objectStore("f").get(pid);q.onsuccess=()=>ok(q.result||null);q.onerror=()=>ok(null);});}catch(e){return null;}}
async function tFileDel(pid){try{const db=await tIDB();db.transaction("f","readwrite").objectStore("f").delete(pid);}catch(e){}}
const tCanvasBlob=(cv,q)=>new Promise(ok=>cv.toBlob(b=>ok(b),"image/jpeg",q));
async function tImgBlob(file,maxW){/* re-encode any image as JPEG ≤ maxW px wide */
  const url=URL.createObjectURL(file);try{const im=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url;});
    const s=Math.min(1,maxW/im.naturalWidth),cv=document.createElement("canvas");cv.width=Math.round(im.naturalWidth*s);cv.height=Math.round(im.naturalHeight*s);
    const g=cv.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,cv.width,cv.height);g.drawImage(im,0,0,cv.width,cv.height);return await tCanvasBlob(cv,.85);}finally{URL.revokeObjectURL(url);}}
/* printed lines → rows: a new row at a numbered / bulleted line or after a clear gap */
const T_ROWSTART=/^\s*(\d{1,3}\s*[\.\)]|\(\d{1,3}\)|[-•●○◦▪■□✓*]|[ก-ฮ]\s*[\.\)]|[A-Za-z]\s*[\.\)]\s)/;
function tLinesToRows(lines){const rows=[];let cur=null;
  lines.forEach(L=>{const t=L.t.replace(/\s+$/,"");if(!t.trim()){cur=null;return;}
    const sub=cur&&L.x!=null&&cur.x!=null&&L.x>cur.x+6;/* indented sub-items (a., b., •) stay with their step */
    if(!cur||L.gap||(!sub&&T_ROWSTART.test(t))||L.head){cur={c:esc(t.trim()),x:L.x};rows.push(cur);}else cur.c+="<br>"+esc(t.trim());});
  rows.forEach(r=>delete r.x);
  return rows;}
async function tPdfPages(file,onP){const lib=await tPdfLib(),doc=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise,out=[];
  for(let n=1;n<=doc.numPages;n++){onP&&onP(`อ่าน ${esc(file.name)} หน้า ${n}/${doc.numPages}`);const pg=await doc.getPage(n);
    const v1=pg.getViewport({scale:1}),sc=Math.min(2.2,1500/v1.width),vp=pg.getViewport({scale:sc}),cv=document.createElement("canvas");cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);
    const g=cv.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,cv.width,cv.height);await pg.render({canvasContext:g,viewport:vp}).promise;
    const tc=await pg.getTextContent(),items=tc.items.filter(i=>i.str!==undefined),lines=[];
    /* group text items into lines by y (top-down), keep x order inside a line */
    const rowsY=[];items.forEach(i=>{const y=i.transform[5],h=Math.abs(i.transform[3])||10;let L=rowsY.find(r=>Math.abs(r.y-y)<h*.5);if(!L){L={y,h,it:[]};rowsY.push(L);}L.it.push(i);});
    rowsY.sort((a,b)=>b.y-a.y);let py=null,ph=0;
    rowsY.forEach(L=>{L.it.sort((a,b)=>a.transform[4]-b.transform[4]);let s="";L.it.forEach((i,k)=>{if(k){const p=L.it[k-1],gx=i.transform[4]-(p.transform[4]+(p.width||0));if(gx>L.h*.25&&!/\s$/.test(s)&&!/^\s/.test(i.str))s+=" ";}s+=i.str;});
      lines.push({t:s,x:L.it[0].transform[4],gap:py!==null&&(py-L.y)>Math.max(ph,L.h)*1.9});py=L.y;ph=L.h;});
    out.push({img:await tCanvasBlob(cv,.82),text:lines.map(l=>l.t).join("\n"),lines});pg.cleanup&&pg.cleanup();}
  return out;}
/* .docx = zip → word/document.xml → paragraphs (bold / underline kept) — no library needed */
async function tUnzip(buf,name){const u=new Uint8Array(buf),dv=new DataView(buf);let e=-1;for(let i=u.length-22;i>=Math.max(0,u.length-70000);i--)if(dv.getUint32(i,true)===0x06054b50){e=i;break;}
  if(e<0)throw {code:"docx"};let p=dv.getUint32(e+16,true);const n=dv.getUint16(e+10,true);
  for(let k=0;k<n;k++){const m=dv.getUint16(p+10,true),cs=dv.getUint32(p+20,true),fl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lo=dv.getUint32(p+42,true),fn=new TextDecoder().decode(u.subarray(p+46,p+46+fl));
    if(fn===name){const lfl=dv.getUint16(lo+26,true),lxl=dv.getUint16(lo+28,true),d=u.subarray(lo+30+lfl+lxl,lo+30+lfl+lxl+cs);
      if(m===0)return new TextDecoder().decode(d);const s=new Blob([d]).stream().pipeThrough(new DecompressionStream("deflate-raw"));return await new Response(s).text();}
    p+=46+fl+xl+cl;}throw {code:"docx"};}
async function tDocxRows(file){const buf=await file.arrayBuffer(),x=await tUnzip(buf,"word/document.xml"),W="http://schemas.openxmlformats.org/wordprocessingml/2006/main",X=t=>new DOMParser().parseFromString(t,"application/xml"),D=X(x),rows=[];
  const at=(el,n)=>el?el.getAttributeNS(W,"val")||el.getAttribute("w:val")||"":"",kid=(el,n)=>el?el.getElementsByTagNameNS(W,n)[0]:null;
  /* numbering formats (numId → ilvl → {fmt,text,start}) and list styles, so auto numbers like "1." are kept */
  const NUM={},ABS={},SNUM={};let NX=null,SX=null;try{NX=X(await tUnzip(buf,"word/numbering.xml"));}catch(e){}try{SX=X(await tUnzip(buf,"word/styles.xml"));}catch(e){}
  if(NX){[...NX.getElementsByTagNameNS(W,"abstractNum")].forEach(a=>{const L={};[...a.getElementsByTagNameNS(W,"lvl")].forEach(l=>{L[l.getAttributeNS(W,"ilvl")||l.getAttribute("w:ilvl")||"0"]={fmt:at(kid(l,"numFmt")),text:at(kid(l,"lvlText")),start:+at(kid(l,"start"))||1};});ABS[a.getAttributeNS(W,"abstractNumId")||a.getAttribute("w:abstractNumId")]=L;});
    [...NX.getElementsByTagNameNS(W,"num")].forEach(n=>{NUM[n.getAttributeNS(W,"numId")||n.getAttribute("w:numId")]=ABS[at(kid(n,"abstractNumId"))]||{};});}
  if(SX)[...SX.getElementsByTagNameNS(W,"style")].forEach(st=>{const np=kid(st,"numPr");if(np)SNUM[st.getAttributeNS(W,"styleId")||st.getAttribute("w:styleId")]={id:at(kid(np,"numId")),lv:at(kid(np,"ilvl"))||"0"};});
  const cnt={},roman=n=>{const v=[[1000,"m"],[900,"cm"],[500,"d"],[400,"cd"],[100,"c"],[90,"xc"],[50,"l"],[40,"xl"],[10,"x"],[9,"ix"],[5,"v"],[4,"iv"],[1,"i"]];let s="";v.forEach(([k,r])=>{while(n>=k){s+=r;n-=k;}});return s;};
  const fmtN=(f,n)=>f==="lowerLetter"?String.fromCharCode(96+((n-1)%26+1)):f==="upperLetter"?String.fromCharCode(64+((n-1)%26+1)):f==="lowerRoman"?roman(n):f==="upperRoman"?roman(n).toUpperCase():f==="thaiNumbers"?String(n).replace(/\d/g,d=>"๐๑๒๓๔๕๖๗๘๙"[d]):f==="thaiLetters"?"กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ"[(n-1)%44]:String(n);
  [...D.getElementsByTagNameNS(W,"p")].forEach(p=>{let h="";[...p.getElementsByTagNameNS(W,"r")].forEach(r=>{let t="";[...r.childNodes].forEach(c=>{if(c.localName==="t")t+=c.textContent;else if(c.localName==="tab")t+=" ";else if(c.localName==="br")t+="\n";});if(!t)return;
      const pr=kid(r,"rPr"),bo=pr&&kid(pr,"b")&&at(kid(pr,"b"))!=="0",un=pr&&kid(pr,"u")&&at(kid(pr,"u"))!=="none",hl=pr&&kid(pr,"highlight"),sk=pr&&kid(pr,"strike");let s=esc(t).replace(/\n/g,"<br>");if(bo)s="<b>"+s+"</b>";if(un)s="<u>"+s+"</u>";if(sk)s="<s>"+s+"</s>";if(hl)s="<mark>"+s+"</mark>";h+=s;});
    if(!h.replace(/<[^>]+>/g,"").trim())return;
    const pp=kid(p,"pPr"),np=pp&&kid(pp,"numPr"),sty=at(pp&&kid(pp,"pStyle"));let ref=np?{id:at(kid(np,"numId")),lv:at(kid(np,"ilvl"))||"0"}:SNUM[sty]||null,pre="";
    if(ref&&ref.id&&ref.id!=="0"){const L=(NUM[ref.id]||{})[ref.lv]||{fmt:/Bullet/i.test(sty)?"bullet":"decimal",text:"%1.",start:1},k=ref.id+"|"+ref.lv;
      Object.keys(cnt).forEach(c=>{const [i,l]=c.split("|");if(i===ref.id&&+l>+ref.lv)delete cnt[c];});cnt[k]=(cnt[k]||L.start-1)+1;
      pre=L.fmt==="bullet"||L.fmt==="none"?(L.fmt==="none"?"":"• "):(L.text||"%1.").replace(/%(\d)/g,(_,d)=>{const lv=String(+d-1),c=cnt[ref.id+"|"+lv]||1,f=((NUM[ref.id]||{})[lv]||{}).fmt||"decimal";return fmtN(f,c);})+" ";}
    rows.push({c:esc(pre)+h});});
  return rows;}
async function tTxtRows(file){const t=await file.text();return tLinesToRows(t.split(/\r?\n/).map(s=>({t:s})));}
/* AI reads page images (+ the printed text layer as a spelling guide) */
async function tAIVis(pr,imgs,maxTok){const mode=await aiMode();if(!mode)throw {code:"no_ai"};
  if(mode==="claude"){const smp=await window.claude.use("sample"),lim=await smp.limits().catch(()=>null);if(!lim||!lim.images)throw {code:"no_img"};return await smp.json(pr,{images:imgs,modelTier:"default",cache:false});}
  const c=aiCfg(),b64=await Promise.all(imgs.map(b=>new Promise(ok=>{const f=new FileReader();f.onload=()=>ok(String(f.result).split(",")[1]);f.readAsDataURL(b);})));let r;
  try{r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":c.key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:c.model||"claude-sonnet-5-5",max_tokens:maxTok||8000,messages:[{role:"user",content:b64.map(d=>({type:"image",source:{type:"base64",media_type:"image/jpeg",data:d}})).concat([{type:"text",text:pr}])}]})});}
  catch(e){throw {code:"network"};}
  const j=await r.json().catch(()=>null);if(!r.ok)throw {code:"api",status:r.status,message:j&&j.error&&j.error.message||""};
  const t=((j&&j.content)||[]).filter(x=>x.type==="text").map(x=>x.text).join(""),a=t.indexOf("{"),z=t.lastIndexOf("}");if(a<0||z<a)throw {code:"invalid_json"};try{return JSON.parse(t.slice(a,z+1));}catch(e){throw {code:"invalid_json"};}}
function tVisPrompt(pages,first){const tx=pages.map((p,i)=>p.text&&p.text.trim()?`--- รูปที่ ${i+1}: ข้อความตัวพิมพ์ที่ดึงจาก text layer ของ PDF (ใช้ตัวสะกดนี้สำหรับตัวพิมพ์) ---\n${p.text.slice(0,6000)}`:`--- รูปที่ ${i+1}: ไม่มี text layer (อ่านจากรูปเท่านั้น) ---`).join("\n");
  return `You are transcribing a Thai medical school CTA (clinical skill / procedure) handout so a student can study it in a one-column table. The ${pages.length} attached image(s) are consecutive pages, in order.
Rules — transcription, NOT summary:
- Copy EVERY word exactly as written, in the original language(s) (Thai and English mixed). Do not translate, paraphrase, correct, shorten, reorder or add anything. Keep numbering, bullets, symbols, units and punctuation as on the page.
- Printed text: use the spelling from the text layer below whenever it is given (it is exact); the images decide the order and the layout.
- Handwriting (pen notes, ticks with words, arrows with words, circled notes): put it exactly where it belongs in the flow, wrapped in <span class="hw">…</span>. If a handwritten word is truly unreadable write <span class="hw">[อ่านไม่ออก]</span>.
- Keep emphasis: bold → <b>, printed bold blue → <b class="must">, printed red → <span class="red">, underline → <u>, pen underline → <u class="pen">, yellow highlighter → <mark>, pink highlighter → <mark class="pk">, blue highlighter → <mark class="bl">, crossed out → <s>. Red-pen handwriting → <span class="hw r">, pink-pen → <span class="hw p">. Line breaks inside a cell → <br>. No other tags, no markdown.
- Pictures/diagrams: one short placeholder in Thai in the right place, e.g. [รูป: ท่าจับเข็ม]. Tables: one row of the table per cell, columns joined with " | ".
- Split into cells the way the page is organised: one cell per step / numbered item / heading with its lines. Sub-items of a step (a., b., indented bullets, notes under it) stay in that step's cell, each on a new line with <br>. Page headers, footers and page numbers are skipped.
- ${first?"title = the procedure name as written on the first page (or \"\").":"title = \"\"."} cont = true only if the first cell of these pages continues a sentence or step cut off at the end of the previous page.
Return ONLY JSON: {"title":"…","cont":false,"rows":[{"c":"…"}]}
${tx}`;}
async function tCtaRead(files,useAI,onP){const pages=[],rows=[];let title="";
  for(const f of files){const nm=(f.name||"").toLowerCase(),tp=f.type||"";
    if(tp==="application/pdf"||/\.pdf$/.test(nm)){(await tPdfPages(f,onP)).forEach(p=>pages.push(p));}
    else if(/^image\//.test(tp)||/\.(jpe?g|png|webp|gif|heic)$/.test(nm)){onP&&onP("เตรียมรูป "+esc(f.name));pages.push({img:await tImgBlob(f,1500),text:"",lines:[]});}
    else if(/\.docx$/.test(nm)){onP&&onP("อ่าน "+esc(f.name));(await tDocxRows(f)).forEach(r=>rows.push(r));if(!title)title=f.name.replace(/\.[^.]+$/,"");}
    else if(/\.(txt|md)$/.test(nm)||/^text\//.test(tp)){(await tTxtRows(f)).forEach(r=>rows.push(r));if(!title)title=f.name.replace(/\.[^.]+$/,"");}
    else throw {code:"type",name:f.name};}
  if(pages.length&&useAI){const per=await (async()=>{if(await aiMode()==="claude"){try{const l=await (await window.claude.use("sample")).limits();return Math.max(1,Math.min(2,(l.images||{}).maxCount||2));}catch(e){return 2;}}return 2;})();
    for(let i=0;i<pages.length;i+=per){const ch=pages.slice(i,i+per);onP&&onP(`AI อ่านหน้า ${i+1}${ch.length>1?"–"+(i+ch.length):""} จาก ${pages.length} (ตัวพิมพ์ + ลายมือ)…`);
      const o=await tAIVis(tVisPrompt(ch,i===0),ch.map(p=>p.img),8000),R=(o&&Array.isArray(o.rows)?o.rows:[]).map(r=>({c:tSan(String(r&&r.c||""))})).filter(r=>r.c.replace(/<[^>]+>/g,"").trim());
      if(i===0&&o&&o.title)title=String(o.title).trim();
      if(o&&o.cont&&rows.length&&R.length){rows[rows.length-1].c+=" "+R.shift().c;}R.forEach(r=>rows.push(r));}}
  else if(pages.length){const L=[];pages.forEach((p,i)=>{if(i)L.push({t:""});p.lines.forEach(x=>L.push(x));});const R=tLinesToRows(L);
    if(!R.length)throw {code:"no_text"};R.forEach(r=>rows.push(r));
    if(!title){const t0=R[0].c.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").trim();if(t0.length<=70&&!T_ROWSTART.test(t0)&&!/<br>/.test(R[0].c))title=t0;}}
  return {title,rows,pages:pages.map(p=>p.img)};}
function tCtaImport(O,cur){const ai=tAI(),dlg=document.createElement("div");dlg.className="mqdlg";
  dlg.innerHTML=`<div class="mqdlg-box tcimp"><h3>📄 ใส่ไฟล์ CTA</h3>
    <p>เลือกไฟล์ PDF / รูปถ่าย / Word (.docx) / .txt (หลายไฟล์ได้ — เรียงตามชื่อไฟล์) แล้วเว็บจะเติมช่อง “เนื้อหา” ให้ตามไฟล์ทุกคำ · CTA เป็นของบัญชีนี้เท่านั้น</p>
    <label class="ck"><input type="radio" name="tcm" value="ai"${ai?" checked":""}> <span>ให้ AI อ่าน — ได้ทั้งตัวพิมพ์และ<span class="hw">ลายมือ (สีน้ำเงิน)</span>${ai?"":`<span class="rd">เว็บนี้ยังไม่ได้เชื่อม AI — เปิดใน Claude (ฟรี) หรือใส่ API key</span>`}</span></label>
    <label class="ck"><input type="radio" name="tcm" value="txt"${ai?"":" checked"}> <span>ดึงเฉพาะตัวพิมพ์ (ไม่ใช้ AI · ตรงตามไฟล์ 100% · ไม่ได้ลายมือ · รูปถ่ายอ่านไม่ได้)</span></label>
    <div id="tcNoAI" class="tcnoai" hidden><b>เว็บนี้ยังไม่ได้เชื่อม AI</b><span class="rd">เลือกได้ 2 ทาง:</span>
      ${CFG.artifactUrl?`<a class="btn primary" href="${esc(artLink(ward+"/tch/cta"))}" target="_blank" rel="noopener">เปิด CTA ใน Claude ↗ (ฟรี ใช้บัญชี Claude)</a><span class="rd">ในหน้าที่เปิด กด “📄 ใส่ไฟล์” แล้วเลือกไฟล์อีกครั้ง · ใส่เสร็จกด “🌐 ส่ง CTA ไปเว็บ” เพื่อให้ CTA มาอยู่ในบัญชีเว็บนี้ด้วย (ใน Claude กับเว็บเก็บแยกกัน)</span>`:""}
      <a class="btn" href="#/${esc(ward)}/adm">ใส่ API key (ที่หน้า Admission round)</a></div>
    <input type="file" id="tcFile" multiple accept=".pdf,application/pdf,image/*,.docx,.txt,.md" style="margin:10px 0">
    <div id="tcProg" class="rd" aria-live="polite"></div><div id="tcOut"></div>
    <div class="dlg-act" style="margin-top:10px"><button class="btn ghost" id="tcX" type="button">ปิด</button></div></div>`;
  document.body.appendChild(dlg);const close=()=>dlg.remove();$("tcX").onclick=close;
  const mode=()=>{const want=(dlg.querySelector("[name=tcm]:checked")||{}).value==="ai",blk=want&&!ai;$("tcNoAI").hidden=!blk;$("tcFile").hidden=blk;};
  dlg.querySelectorAll("[name=tcm]").forEach(r=>r.onchange=mode);dlg.querySelectorAll("#tcNoAI a").forEach(a=>a.addEventListener("click",()=>{if(!a.target)close();}));mode();
  $("tcFile").onchange=async e=>{const fs=[...e.target.files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));if(!fs.length)return;
    const useAI=(dlg.querySelector("[name=tcm]:checked")||{}).value==="ai",pg=$("tcProg");$("tcOut").innerHTML="";e.target.disabled=true;
    let res;try{res=await tCtaRead(fs,useAI,t=>{pg.innerHTML=t;});}
    catch(er){e.target.disabled=false;const c=er&&er.code;pg.innerHTML=`<span style="color:var(--wrong)">${c==="lib"?"โหลดตัวอ่าน PDF ไม่ได้ (ต้องต่อเน็ต)":c==="type"?"ไฟล์ "+esc(er.name)+" ไม่รองรับ — ใช้ PDF / รูป / .docx / .txt":c==="no_text"?"ไฟล์นี้ไม่มีตัวพิมพ์ให้ดึง (อาจเป็นภาพสแกน) — เลือก “ให้ AI อ่าน”":c==="no_img"?"Claude ในหน้านี้ยังส่งรูปไม่ได้ — ลองเปิดหน้าใหม่แล้วอนุญาตให้ส่งรูป":c==="docx"?"อ่านไฟล์ Word ไม่ได้":(admMsg(er)||"อ่านไฟล์ไม่สำเร็จ")}</span>`;return;}
    e.target.disabled=false;pg.innerHTML=`ได้ ${res.rows.length} ช่อง${res.pages.length?` จาก ${res.pages.length} หน้า`:""} — ตรวจแล้วเลือกที่ใส่`;
    const nm=res.title||fs[0].name.replace(/\.[^.]+$/,"");
    $("tcOut").innerHTML=`<div class="tcprev">${res.rows.map((r,i)=>`<div class="tcpr"><span class="tcpn">${i+1}</span><div>${r.c}</div></div>`).join("")}</div>
      <label class="ck"><input type="radio" name="tcw" value="new" checked> หัตถการใหม่ ชื่อ <input type="text" id="tcName" value="${esc(nm)}"></label>
      ${cur?`<label class="ck"><input type="radio" name="tcw" value="app"> ต่อท้ายใน “${esc(cur.name)}”</label><label class="ck"><input type="radio" name="tcw" value="rep"> แทนที่เนื้อหาทั้งหมดของ “${esc(cur.name)}” (keyword / wording เดิมหายด้วย)</label>`:""}
      <div class="dlg-act" style="margin-top:8px"><button class="btn primary" id="tcOk" type="button">ใส่ลงตาราง</button></div>`;
    $("tcOk").onclick=async()=>{const w=(dlg.querySelector("[name=tcw]:checked")||{}).value,R=res.rows.map(r=>({id:tId(),c:r.c,k:"",w:""}));let p;
      if(w==="new"){const n=($("tcName").value||"").trim()||nm||"หัตถการใหม่";p={id:tId(),name:n,ward,rows:R,src:fs.map(f=>f.name).join(", ")};O.procs.push(p);}
      else{p=cur;if(w==="rep"){if(!await uiAsk(`แทนที่เนื้อหาทั้งหมดของ “${cur.name}”?`))return;p.rows=R;}else p.rows=p.rows.filter(r=>String(r.c||"").replace(/<[^>]+>/g,"").trim()||r.k||r.w).concat(R);p.src=fs.map(f=>f.name).join(", ");}
      if(res.pages.length){const old=w==="app"?((await tFileGet(p.id))||[]):[];await tFileSave(p.id,old.concat(res.pages));}
      TV.ctaP=p.id;TV.tab.cta="full";TV.prac=null;tchPut("cta",O);close();go(ward+"/tch/cta/"+encodeURIComponent(p.id));toast("ใส่เนื้อหาแล้ว — ตรวจทานกับไฟล์ต้นฉบับได้ที่ “ดูไฟล์ต้นฉบับ”");};};}
/* original pages (this browser only) under the content table */
async function tCtaOrig(pid){const box=$("tcOrig");if(!box)return;const P=await tFileGet(pid);if(!P||!P.length){box.hidden=true;return;}
  box.hidden=false;box.innerHTML=`<details><summary>📄 ดูไฟล์ต้นฉบับ (${P.length} หน้า · เก็บในเครื่องนี้)</summary><div class="tcpages">${P.map((b,i)=>`<img alt="หน้า ${i+1}" data-pi="${i}">`).join("")}</div><button class="link" id="tcODel" type="button">ลบไฟล์ต้นฉบับจากเครื่องนี้</button></details>`;
  box.querySelectorAll("img[data-pi]").forEach(im=>{im.src=URL.createObjectURL(P[+im.dataset.pi]);});
  $("tcODel").onclick=async()=>{if(!await uiAsk("ลบรูปไฟล์ต้นฉบับจากเครื่องนี้? (เนื้อหาในตารางยังอยู่)"))return;await tFileDel(pid);box.hidden=true;};}
