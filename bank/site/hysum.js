/* ================= สรุป High-yield (Phase 2) — รูปแบบเดียวกับแท็บ "สรุปแนวข้อสอบ" ของคลัง MEQ Prevent Med =================
   ผู้ใช้สั่ง 20 ต.ค. 2026: ทุกวอร์ด ทุกชนิดข้อสอบ (MCQ / MEQ / OSCE เนื้อหาแยกกัน) ทั้งเว็บ MDCU และ SI
   ข้อมูล: <dir>/sum_<mcq|meq|osce>_<slug>.js → SUMM.push({tag, style?, title, intro, groups:[{title, sections:[{id, title, trend, asked[], flow[], pattern[], kw[], ddx[], pearls[], members[]}]}]})
     MEQ แยก Case / Short answer (ผู้ใช้สั่ง 20 ต.ค. 2026): style:"case" | "sa" — ไฟล์ sum_meq_case_<slug>.js / sum_meq_sa_<slug>.js · หน้าเว็บมีปุ่มสลับ (entry ที่ไม่มี style ใช้ได้ทั้งสองแบบ)
     flow = เคส/สถานีดำเนินไปอย่างไร (ข้อมูลที่ให้เพิ่ม → ถามอะไรต่อ) · kw = คำสำคัญที่ต้องเขียนถึงจะได้คะแนน · ddx = โรคที่ต้องแยก
     tag = แท็กหัวข้อ (MCQ = ชื่อแท็กใน tags.js เช่น "Hernia" · MEQ/OSCE = id ใน config meqTopics/osceTopics เช่น "gyn")
     members: MCQ "set|ro|orig" · MEQ/OSCE "set|ro|orig#k" (k = ข้อย่อยที่ k ของข้อนั้น นับ 1, 2, 3 … ทั้งข้อ)
   นับเฉพาะข้อใน Service round (ข้อสอบเก่าจริง ทั้งที่จดครบและที่ AI เติมแต่อยู่ในชุดข้อสอบเก่า) · rotation = ชุด (set + ro) ที่ไม่ซ้ำกัน
   ป้าย: ≥5 rotation 🔥 ออกบ่อยมาก · 3–4 ออกบ่อย · 2 ออกซ้ำ · 1 ออก 1 rotation
   real time: ตัวเลข/ป้าย/rotation คำนวณจาก members ตอนเปิดหน้า · ข้อที่ยังไม่อยู่ในเรื่องไหนของหัวข้อนั้น ขึ้นเองในกลุ่ม "ข้อใหม่ที่ยังไม่ได้สรุป"
   · หัวข้อที่ยังไม่มีไฟล์สรุป ขึ้นเป็นรายการข้อให้ก่อน */
const HS_LV=n=>n>=5?["hot","🔥 ออกบ่อยมาก"]:n>=3?["warm","ออกบ่อย"]:n===2?["rep","ออกซ้ำ 2 rotation"]:["one","ออก 1 rotation"];
const HS_ICON={todo:"○",ok:"✓",half:"◐",no:"✗",done:"●"};
const HS_STN={todo:"ยังไม่ทำ",ok:"ถูก / ได้เต็ม",half:"ได้บางส่วน",no:"ผิด / ไม่ได้",done:"ส่งแล้ว ยังไม่ให้คะแนน"};
function hsRot(q){return (String(q.set||"")+" "+String(q.ro||"")).trim();}
function hsShortRot(q){return hsRot(q).replace(/^(MDCU|SI)(\d+)/,"$2").replace(/\bRo/,"");}
/* base key set|ro|orig; shared by two questions → "@p<page>", further tie "~n" (same as tools/sumlib.js) */
function hsKeys(L){const c={};L.forEach(q=>{const b=q.set+"|"+(q.ro||"")+"|"+q.orig;c[b]=(c[b]||0)+1;});
  const m=new Map(),seen={};L.forEach(q=>{let b=q.set+"|"+(q.ro||"")+"|"+q.orig;if(c[b]>1)b+="@p"+q.page;if(seen[b])b+="~"+(++seen[b]);else seen[b]=1;m.set(q,b);});return m;}
/* every Service-round item of a type: {key, q, s, tags, rot} */
function hsItems(type){const W=W_();if(!W)return [];
  if(type==="MCQ"){const K=hsKeys([...W.QB].sort((a,b)=>a.rid-b.rid));return W.QB.map(q=>{let t=qTags(q);if(!t.length){const tp=topicOf(W,q);t=tp&&tp!=="Others"?[tp]:[];}return {key:K.get(q),q,s:null,tags:t,rot:hsRot(q),sty:""};});}
  const L=mqL(ward,type),out=[],K=hsKeys(L);
  L.forEach(q=>q.subs.forEach(s=>{let t=(s.tags||[]).slice();if(!t.length&&q.topic)t=[q.topic];out.push({key:K.get(q)+"#"+(s._i+1),q,s,tags:t,rot:hsRot(q),sty:q.sa?"sa":"case"});}));
  return out;}
function hsTopicNames(type){const W=W_();if(type==="MCQ")return null;const T=((type==="OSCE"?W.cfg.osceTopics:W.cfg.meqTopics)||[]).map(t=>Array.isArray(t)?t:[t.id,t.name]);return T;}
function hsStatus(type,it){const P=P_(),p=ph();
  if(type==="MCQ"){const a=lastA(P,p,it.q.uid);return !a?"todo":a[0]===it.q.ans?"ok":"no";}
  const K=type==="OSCE"?"osce":"meq",A=(P[K]&&P[K]["a"+p])||{},r=A[it.q.uid];
  if(!r||!mqSubDone(it.q,it.s,r))return "todo";const g=r.g?r.g[it.s._i]:undefined;return g===2?"ok":g===1?"half":g===0?"no":"done";}
function hsProg(type,its){let d=0,w=0;its.forEach(o=>{const t=hsStatus(type,o);if(t!=="todo")d++;if(t==="half"||t==="no")w++;});return {d,w,n:its.length};}
const hsProgTxt=p=>`<span class="sprog${p.n&&p.d===p.n&&!p.w?" full":""}">ทำแล้ว ${p.d}/${p.n}${p.w?` · <b class="sw">ไม่แม่น ${p.w}</b>`:""}</span>`;
function hsRef(type,o){const ss=hsStatus(type,o),q=o.q,lab=type==="MCQ"?"ข้อ "+q.id:esc(mqNum(q))+"."+(o.s._i+1);
  return `<button class="ref s-${ss}" type="button" data-hsu="${esc(q.uid)}" data-hsp="${o.s?o.s._p:""}" title="${esc(hsRot(q))} — ${HS_STN[ss]}"><span class="si">${HS_ICON[ss]}</span>${lab}<small>${esc(hsShortRot(q))}</small></button>`;}
function hsOpenRef(type,u,pi){if(type==="MCQ")return openQ(u);
  const P=P_();P.type=type;mqVset({r:"service",set:"all",style:"all",status:"all"});mqOpen(u,pi===""||pi==null?undefined:+pi,"service");}
/* how many Service-round items are not yet in any summary section (shown on the Phase 2 button) */
function hsPendingN(type){const W=W_();if(!W)return 0;const its=hsItems(type);if(!its.length)return 0;const S=(W.SUMM||{})[type]||[],m=new Set();
  S.forEach(t=>t.groups.forEach(g=>g.sections.forEach(x=>(x.members||[]).forEach(k=>m.add(k)))));return its.filter(o=>!m.has(o.key)).length;}
const HS_STY=[["case","Case"],["sa","Short answer"]];
function rHySum(type){
  const W=W_(),P=P_(),ALL=hsItems(type);
  P.hyOpen=P.hyOpen||{};const OPEN=P.hyOpen[type]=P.hyOpen[type]||{};
  const STY=type==="MEQ"&&ALL.some(o=>o.sty==="sa")&&ALL.some(o=>o.sty==="case"),sty=STY?(OPEN._sty==="sa"?"sa":"case"):"";
  const its=STY?ALL.filter(o=>o.sty===sty):ALL,byKey={};its.forEach(o=>{byKey[o.key]=o;});
  const SU=((W.SUMM||{})[type]||[]).filter(x=>!STY||!x.style||x.style===sty),nm=hsTopicNames(type),nameOf=t=>{const s=SU.find(x=>x.tag===t);if(s&&s.title)return s.title;const c=nm&&nm.find(x=>x[0]===t);return c?c[1]:t;};
  const unitW=type==="MCQ"?"ข้อ":"ข้อย่อย",caseW=type==="OSCE"?"สถานี":"ข้อ";
  /* topics: every tag used in the bank (+ summary files whose tag has items) */
  const tagN={};its.forEach(o=>(o.tags.length?o.tags:["_none"]).forEach(t=>{tagN[t]=(tagN[t]||0)+1;}));
  let tags=Object.keys(tagN);
  if(nm){const ord=nm.map(x=>x[0]);tags.sort((a,b)=>(a==="_none")-(b==="_none")||((ord.indexOf(a)+1||999)-(ord.indexOf(b)+1||999))||tagN[b]-tagN[a]);}
  else tags.sort((a,b)=>(a==="_none")-(b==="_none")||(a==="Misc")-(b==="Misc")||tagN[b]-tagN[a]||a.localeCompare(b));
  const secStat=x=>{const subs=[],qs=new Set(),rots=new Set();(x.members||[]).forEach(m=>{const o=byKey[m];if(!o||subs.includes(o))return;subs.push(o);qs.add(o.q.uid);rots.add(o.rot);});
    const ro=[...rots].sort();return {subs,nc:qs.size,rots:ro,nr:ro.length};};
  const TOP=tags.map(tag=>{const SS=SU.filter(x=>x.tag===tag),S=SS.find(x=>x.style)||SS[0],mine=its.filter(o=>tag==="_none"?!o.tags.length:o.tags.includes(tag));
    const groups=S?SS.filter(x=>x===S||!x.style&&!S.style).flatMap(x=>x.groups).map(g=>({title:g.title,sections:g.sections.map(x=>({x,z:secStat(x)})).filter(e=>e.z.subs.length)})).filter(g=>g.sections.length):[];
    const inSec=new Set();groups.forEach(g=>g.sections.forEach(e=>e.z.subs.forEach(o=>inSec.add(o))));
    const left=mine.filter(o=>!inSec.has(o));
    if(left.length){const x={id:"new-"+tag.replace(/\W+/g,"_"),title:S?"ข้อที่เพิ่มเข้ามาใหม่ (Claude ยังไม่ได้สรุป)":"ข้อทั้งหมดในหัวข้อนี้ (Claude ยังไม่ได้สรุป)",auto:1,members:left.map(o=>o.key)};
      groups.push({title:S?"🆕 ข้อใหม่ที่ยังไม่ได้สรุป":"ข้อที่เคยออก",sections:[{x,z:secStat(x)}]});}
    return {tag,title:tag==="_none"?"อื่น ๆ (ยังไม่ติดแท็ก)":nameOf(tag),intro:S&&S.intro,mine,groups};}).filter(t=>t.mine.length);
  const all=[];TOP.forEach(t=>t.groups.forEach(g=>g.sections.forEach(e=>{if(!e.x.auto)all.push({t,g,x:e.x,z:e.z});})));
  const top=[];[...all].sort((a,b)=>b.z.nr-a.z.nr||b.z.subs.length-a.z.subs.length).forEach(o=>{if(top.length>=15)return;const A=new Set(o.x.members||[]);
    if(top.some(t2=>{if(t2.t===o.t)return false;const B=t2.x.members||[];const n=B.filter(m=>A.has(m)).length;return n/(A.size+B.length-n)>0.6;}))return;top.push(o);});
  const nQ=new Set(its.map(o=>o.q.uid)).size,nR=new Set(its.map(o=>o.rot)).size,nSec=all.length;
  const TN=type+(STY?" · "+(sty==="sa"?"Short answer":"Case"):"");
  let h=`<div class="mqv hysum"><div class="whead"><h1 class="h2">สรุป High-yield · ${TN}</h1><a href="#/${esc(ward)}">กลับหน้าวอร์ด</a></div>`;
  if(!its.length){h+=`<div class="empty">ยังไม่มีข้อสอบ ${type} ในวอร์ดนี้ — สรุปจะขึ้นเองเมื่อเพิ่มข้อสอบเก่าเข้า Service round</div></div>`;$("main").innerHTML=h;return;}
  h+=`<div class="sum-head"><div class="tl-h">สรุปแนวข้อสอบ ${TN} จากคลังทั้งหมด</div><p class="hint">รวบรวมทุกเรื่องที่เคยออกใน ${nQ} ${caseW}${type==="MCQ"?"":` ${its.length} ข้อย่อย`} จาก ${nR} rotation (เฉพาะข้อสอบเก่าใน Service round) แยกตาม ${TOP.length} หัวข้อ → กลุ่ม → เรื่อง${nSec?` (${nSec} เรื่อง)`:""} · rotation = ชุดข้อสอบ (รุ่น + rotation) ที่เรื่องนั้นเคยออก · สถานะข้อเป็นของ Phase ${ph()} · แตะเลขข้อเพื่อไปทำข้อนั้น</p>
    <p class="hint slegend">สถานะข้อ: <span class="ref s-todo"><span class="si">○</span>ยังไม่ทำ</span> <span class="ref s-ok"><span class="si">✓</span>${type==="MCQ"?"ถูก":"ได้เต็ม"}</span>${type==="MCQ"?"":` <span class="ref s-half"><span class="si">◐</span>บางส่วน</span>`} <span class="ref s-no"><span class="si">✗</span>${type==="MCQ"?"ผิด":"ไม่ได้"}</span>${type==="MCQ"?"":` <span class="ref s-done"><span class="si">●</span>ยังไม่ให้คะแนน</span>`}</p>
    ${STY?`<div class="chips hssty">${HS_STY.map(([k,n])=>`<button class="chip" type="button" data-hssty="${k}" aria-pressed="${sty===k}">${n} <span class="cnt">${ALL.filter(o=>o.sty===k).length} ข้อย่อย</span></button>`).join("")}</div>`:""}
    <div class="sum-tools"><button class="chip" type="button" id="hsOpenAll">เปิดทั้งหมด</button><button class="chip" type="button" id="hsCloseAll">ปิดทั้งหมด</button></div></div>`;
  if(top.length)h+=`<details class="sumt sumtop" data-k="top" ${OPEN.top!==false?"open":""}><summary><span class="st-name">🔥 เรื่องที่ออกบ่อยที่สุด</span><span class="st-meta">top ${top.length}</span></summary><ol class="toplist">${top.map(o=>{const L=HS_LV(o.z.nr);return `<li><button class="link toplink" type="button" data-hsjump="${esc(o.t.tag+"::"+o.x.id)}">${esc(o.x.title)}</button> <span class="ttag">${esc(o.t.title)}</span> <span class="lv ${L[0]}">${L[1]}</span> <span class="nums">${o.z.nr} rotation · ${o.z.subs.length} ${unitW}</span> ${hsProgTxt(hsProg(type,o.z.subs))}</li>`;}).join("")}</ol></details>`;
  else h+=`<div class="card"><span class="rd">Claude ยังไม่ได้เขียนสรุปของ ${type} วอร์ดนี้ ระหว่างนี้ด้านล่างคือรายการข้อทั้งหมดแยกตามหัวข้อ</span></div>`;
  TOP.forEach(t=>{const ns=t.groups.reduce((a,g)=>a+g.sections.filter(e=>!e.x.auto).length,0);
    h+=`<details class="sumt" data-k="t:${esc(t.tag)}" ${OPEN["t:"+t.tag]?"open":""}><summary><span class="st-name">${esc(t.title)}</span><span class="st-meta">${t.mine.length} ${unitW}${ns?` · ${ns} เรื่อง`:""} · ${hsProgTxt(hsProg(type,t.mine))}</span></summary>`;
    if(t.intro)h+=`<div class="sum-intro">${W.R?W.R(t.intro):t.intro}</div>`;
    {const ov=[];t.groups.forEach(g=>g.sections.forEach(({x,z})=>{if(!x.auto)ov.push(`<button class="link hsov" type="button" data-hsjump="${esc(t.tag+"::"+x.id)}">${esc(x.title)}</button><small>${z.nr}</small>`);}));
      if(ov.length)h+=`<div class="hs-ov"><b>${type==="OSCE"?"เรื่องที่เคยออกในสถานีแบบนี้":"เรื่อง / โรคที่เคยออก"}</b> (${ov.length}) · ${ov.join(" · ")}</div>`;}
    t.groups.forEach(g=>{h+=`<div class="sumg"><div class="sumg-h">${esc(g.title)}</div>`;
      g.sections.forEach(({x,z})=>{const L=HS_LV(z.nr),k="s:"+t.tag+"::"+x.id;
        h+=`<details class="sums${x.auto?" hsnew":""}" id="${esc("hs-"+t.tag+"::"+x.id)}" data-k="${esc(k)}" ${OPEN[k]?"open":""}><summary><span class="ss-name">${esc(x.title)}</span><span class="lv ${L[0]}">${L[1]}</span><span class="nums">${z.subs.length} ${unitW}${type==="MCQ"?"":` · ${z.nc} ${caseW}`}</span>${hsProgTxt(hsProg(type,z.subs))}</summary><div class="sums-b">`;
        h+=`<p class="trend">📈 เคยออก ${z.nr} rotation: ${esc(z.rots.join(", "))}${x.trend?` — ${x.trend}`:""}</p>`;
        if(x.asked&&x.asked.length)h+=`<div class="sb-h">แนวคำถามที่เคยออก</div><ul>${x.asked.map(a=>`<li>${a}</li>`).join("")}</ul>`;
        if(x.flow&&x.flow.length)h+=`<div class="sb-h">${type==="OSCE"?"ในสถานีต้องทำ / ตอบอะไรตามลำดับ":"เคสดำเนินไปอย่างไร (ข้อมูลที่ให้ → ถามอะไร)"}</div><ol class="flow">${x.flow.map(a=>`<li>${a}</li>`).join("")}</ol>`;
        if(x.pattern&&x.pattern.length)h+=`<div class="sb-h">${type==="MCQ"?"Pattern การตอบ / high yield":"ต้องตอบอะไร (pattern ที่ได้คะแนน)"}</div><ul class="pat">${x.pattern.map(a=>`<li>${a}</li>`).join("")}</ul>`;
        if(x.kw&&x.kw.length)h+=`<div class="sb-h">คำสำคัญที่ต้องมีในคำตอบ</div><div class="hskw">${x.kw.map(a=>`<span>${a}</span>`).join("")}</div>`;
        if(x.ddx&&x.ddx.length)h+=`<div class="sb-h">DDx / โรคที่ต้องแยก</div><ul>${x.ddx.map(a=>`<li>${a}</li>`).join("")}</ul>`;
        if(x.pearls&&x.pearls.length)h+=`<div class="sb-h warn">ระวัง / กับดัก</div><ul class="pearl">${x.pearls.map(a=>`<li>${a}</li>`).join("")}</ul>`;
        if(x.auto)h+=`<p class="hint" style="margin:6px 0 0">ข้อเหล่านี้เข้าคลังแล้ว แต่ Claude ยังไม่ได้ใส่ในสรุป — ขอให้ Claude อัปเดตสรุป High-yield ได้</p>`;
        h+=`<div class="sb-h">ข้อที่เคยออก (แตะเพื่อไปทำ) ${hsProgTxt(hsProg(type,z.subs))}</div><div class="refs">${z.subs.map(o=>hsRef(type,o)).join("")}</div>`;
        h+=`</div></details>`;});
      h+=`</div>`;});
    h+=`</details>`;});
  h+=`</div>`;$("main").innerHTML=h;
  const keep=()=>{P.hyOpen[type]=OPEN;save();};
  document.querySelectorAll(".hysum details[data-k]").forEach(d=>d.addEventListener("toggle",()=>{if(!!OPEN[d.dataset.k]===d.open&&d.dataset.k!=="top")return;OPEN[d.dataset.k]=d.open;keep();}));
  $("hsOpenAll").onclick=()=>{document.querySelectorAll(".hysum details[data-k]").forEach(d=>{d.open=true;OPEN[d.dataset.k]=true;});keep();};
  $("hsCloseAll").onclick=()=>{document.querySelectorAll(".hysum details[data-k]").forEach(d=>{if(d.dataset.k==="top")return;d.open=false;OPEN[d.dataset.k]=false;});keep();};
  document.querySelectorAll("[data-hsjump]").forEach(b=>b.onclick=()=>{const el=document.getElementById("hs-"+b.dataset.hsjump);if(!el)return;let p=el.parentElement;
    while(p&&p!==document.body){if(p.tagName==="DETAILS"){p.open=true;if(p.dataset.k)OPEN[p.dataset.k]=true;}p=p.parentElement;}el.open=true;OPEN[el.dataset.k]=true;keep();el.scrollIntoView({block:"start"});scrollBy(0,-110);});
  document.querySelectorAll("[data-hsu]").forEach(b=>b.onclick=()=>hsOpenRef(type,b.dataset.hsu,b.dataset.hsp));
  document.querySelectorAll("[data-hssty]").forEach(b=>b.onclick=()=>{OPEN._sty=b.dataset.hssty;keep();rHySum(type);scrollTo(0,0);});
}
