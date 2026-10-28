/* ================= OSCE: Legendary round (= สอบจริง) + Quality round (จับเวลา) =================
   ผู้ใช้สั่ง 19 ต.ค. 2026 — ใช้ทุกวอร์ดที่มี OSCE ของทั้ง MDCU และ SI · สิ่งที่ต่างกันต่อวอร์ดมีแค่ หัวข้อ (config wards[].osceTopics) และจำนวนข้อ/เวลาต่อข้อ
   (config wards[].exam.OSCE = {n, min} · แก้ในหน้า Admit · ICU · Discharge → st.wcfg[ward].examOS) · แต่ละ round ล้อแบบ MCQ:
   - Legendary: จำนวนข้อและเวลาต่อข้อ = สอบจริงเสมอ · IRL (โชว์แค่โจทย์ ผู้คุมคนจริงใช้ checklist ใต้โจทย์) / SIM (พิมพ์ตอบ ข้อที่ต้องพูดก็พิมพ์สิ่งที่จะพูด) · เวลาข้อพัก (ค่าเริ่ม 30 วิ) · หัวข้อ · วิธีเรียง
     · ข้อสอบเก่าเท่านั้น หรือเพิ่มโจทย์ใหม่จาก AI (เหมือนโจทย์ AI ใน Legendary MCQ) — ข้อ AI ที่ต้องใช้รูป บอกว่าต้องใช้รูปอะไร แล้วผู้ใช้ใส่รูปเอง (เก็บในเครื่อง IndexedDB "os-img")
     · วิธีเรียง: block = ข้อไม่มีอาจารย์ก่อน แล้วข้อมีอาจารย์อยู่ติดกันท้ายสุด · random = สุ่มปนกัน · custom = ผู้ใช้วางเองทีละข้อ
     · ข้อพัก (block, random): หลังข้อมีอาจารย์ทุกข้อ ยกเว้นหัตถการ · และทุก 3–5 ข้อไม่มีอาจารย์ (สุ่ม) · 1 เลขข้อ · แก้ตำแหน่งเองได้ในหน้าเตรียมสอบ
     · สุ่มข้อเริ่ม (ห้ามเป็นข้อพัก) แล้วทำไล่ไปจนครบวงเหมือนวงสอบจริง · เปิดทีละข้อใหญ่ ข้อย่อยขึ้นพร้อมกัน · หมดเวลาเปลี่ยนข้อเอง
   - Quality: เหมือน Quality MCQ — เลือกปี (เรียงตามไฟล์) หรือสุ่มจากทั้งคลัง · กำหนดเวลาต่อข้อเอง · พักระหว่างข้อได้ (0 = ไม่พัก) · หมดเวลาเปลี่ยนข้อเอง
   ความคืบหน้า: P.osRun = ชุดที่กำลังเตรียม/สอบ (kind "legend" | "quality") · P.osHist = ผลสอบย้อนหลัง (โจทย์ AI เก็บใน gen ของชุดนั้น) */
var OST=null,OSAI={busy:0,err:"",msg:""};
const OS_REST=30;
const osRunCur=()=>{const P=W_()&&P_();return P&&P.osRun&&P.osRun.stage==="run"?P.osRun:null;};
const osPrep=()=>{const P=W_()&&P_();return P&&P.osRun&&P.osRun.stage==="prep"?P.osRun:null;};
function osLastRes(){const P=W_()&&P_();if(!P)return null;const H=P.osHist||[];return H.find(x=>x.id===P.osSel)||H[H.length-1]||null;}
function osExamCfg(){const w=W_().cfg,o=wOv(w.id),m=Object.assign({},(w.exam||{}).OSCE,o&&o.examOS);return m.n&&m.min?m:null;}
const osKindN=k=>k==="quality"?"Quality round":"Legendary round";
function osHistOf(kind){return (P_().osHist||[]).filter(x=>(x.kind||"legend")===kind);}
function osLegCnt(kind){const H=osHistOf(kind||"legend");return H.length?`<span class="rcnt">ทำไปแล้ว <b>${H.length}</b> ครั้ง</span>`:"";}
/* topics of this ward: config osceTopics [{id,name,ex,proc}] + any topic used by stations not in the list */
function osTopics(){const w=W_().cfg,T=(w.osceTopics||[]).map(t=>Array.isArray(t)?{id:t[0],name:t[1]}:Object.assign({},t)),L=mqL(ward,"OSCE");
  L.forEach(q=>{if(q.topic&&!T.some(t=>t.id===q.topic))T.push({id:q.topic,name:q.topic,ex:q.ex?1:0,proc:q.proc?1:0});});return T;}
const osTN=k=>{const t=osTopics().find(x=>x.id===k);return t?t.name:(k||"ไม่ระบุหัวข้อ");};
const osTopicEx=k=>{const t=osTopics().find(x=>x.id===k);return t?{ex:!!t.ex,proc:!!t.proc}:{ex:false,proc:false};};
const osRand=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
/* sub-question text renumbered to the exam number (old exam "21.1 …" → "30.1 …"); IRL drops "(type …)" hints */
const osQ=(s,ix,irl)=>{let t=String(s.q||"").replace(/^\s*\d+(\.\d+)?\.?\s*/,"");if(irl)t=t.replace(/\s*\((type|พิมพ์)[^)]*\)/i,"");return `${ix+1}.${s._k+1} ${t}`;};
const osFmt=sec=>{sec=Math.max(0,Math.ceil(sec));return Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0");};
/* station lookup: old-exam station (W.OS) or an AI station kept inside the run */
function osNorm(q){if(q._n)return q;q._n=1;if(!Array.isArray(q.parts)||!q.parts.length)q.parts=[{subs:q.subs||[]}];q.subs=[];
  q.parts.forEach((p,pi)=>{p.i=pi;p.subs=p.subs||[];p.subs.forEach((s,k)=>{s._p=pi;s._k=k;s._i=q.subs.length;if(!(s.tags||[]).length&&q.topic)s.tags=[q.topic];q.subs.push(s);});});return q;}
function osSt(run,u){if(!u)return null;if(run.gen&&run.gen[u]){const g=osNorm(run.gen[u]);if(!g.uid)g.uid=u;return g;}return mqL(ward,"OSCE").find(q=>q.uid===u)||null;}
const osSlotType=(run,sl)=>{if(sl.k==="rest")return "rest";const q=osSt(run,sl.u);const t=q?{ex:!!q.ex,proc:!!q.proc}:osTopicEx(sl.topic);return t.proc?"proc":t.ex?"ex":"noex";};
const OS_TI={noex:"📝",ex:"👨‍⚕️",proc:"🩺",rest:"☕"},OS_TT={noex:"ไม่มีอาจารย์",ex:"มีอาจารย์",proc:"หัตถการ (มีอาจารย์ ไม่มีข้อพักตามหลัง)",rest:"ข้อพัก"};
const osA=()=>mqInitP(P_(),"OSCE")["a"+ph()];
const osDone=q=>{const r=osA()[q.uid];return !!(r&&r.sub);};
/* ---- pictures for AI stations: the user inserts them (kept in this browser only, IndexedDB "os-img") ---- */
const OSIMG={};   /* uid → dataURL | false (looked up, none) */
function osIDB(){return new Promise((res,rej)=>{try{const r=indexedDB.open("os-img",1);r.onupgradeneeded=()=>r.result.createObjectStore("img");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});}
async function osImgPut(k,v){const db=await osIDB();return new Promise((res,rej)=>{const t=db.transaction("img","readwrite"),s=t.objectStore("img");if(v==null)s.delete(k);else s.put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error);});}
async function osImgGet(k){const db=await osIDB();return new Promise(res=>{const t=db.transaction("img").objectStore("img").get(k);t.onsuccess=()=>res(t.result||null);t.onerror=()=>res(null);});}
async function osImgLoad(run,again){const U=Object.keys((run&&run.gen)||{}).filter(u=>OSIMG[u]===undefined);if(!U.length)return;for(const u of U){try{OSIMG[u]=(await osImgGet(u))||false;}catch(e){OSIMG[u]=false;}}if(again)again();}
function osShrink(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=()=>rej(fr.error);fr.onload=()=>{const im=new Image();im.onerror=()=>rej(new Error("img"));im.onload=()=>{const m=1400,k=Math.min(1,m/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",0.85));};im.src=fr.result;};fr.readAsDataURL(file);});}
const osNeedsImg=q=>!!(q&&q.ai&&(q.imgNeed||q.imgAlt));
function osAiImgHTML(q,reveal){if(!osNeedsImg(q))return "";const d=OSIMG[q.uid];
  return (d?`<div class="stem-img"><img src="${d}" alt="รูปประกอบโจทย์ที่ใส่เอง"></div>`:q.imgAlt?`<div class="img-missing">🖼 ไม่ได้ใส่รูป — คำบรรยายแทนรูป: ${q.imgAlt}</div>`:"")+(reveal&&q.imgNeed?`<p class="hint">รูปที่ข้อนี้ต้องใช้: ${q.imgNeed}</p>`:"");}
/* the website has no AI of its own: AI stations need the Claude version of this site (or the viewer's own API key) */
const osAiOK=()=>HAS_CLAUDE()||!!aiCfg().key;
function osAiBtns(){if(osAiOK())return "";const u=typeof artLink==="function"&&artLink(ward+"/osl");
  return `<div class="osaibtn"><p class="rd">เว็บนี้ยังไม่ได้เชื่อม AI — เลือกอย่างใดอย่างหนึ่ง:</p><div class="row2">${u?`<a class="btn primary" href="${esc(u)}" target="_blank" rel="noopener">เปิด Legendary OSCE ใน Claude ↗</a>`:""}<a class="btn" href="#/${esc(ward)}/adm">ใส่ API key (หน้า Admission round)</a></div><p class="hint" style="margin:6px 0 0">ใน Claude: ถ้าขึ้นหน้า "จะไปหน้าไหน?" ให้กด <b>Legendary round · OSCE</b> · ผลสอบที่ทำใน Claude เก็บในบัญชี Claude (แยกจากเว็บ)</p></div>`;}
/* ---- building the paper ---- */
function osPick(topics,n,pref){const L=mqL(ward,"OSCE").filter(q=>!topics.length||topics.includes(q.topic)),by={};L.forEach(q=>{(by[q.topic||"_"]=by[q.topic||"_"]||[]).push(q);});
  Object.keys(by).forEach(k=>{by[k]=shuffle(by[k]);if(pref)by[k].sort((a,b)=>osDone(a)-osDone(b));});
  const keys=shuffle(topics.length?topics.filter(k=>by[k]&&by[k].length):Object.keys(by)),out=[];let guard=0;
  while(out.length<n&&keys.some(k=>by[k].length)&&guard++<999)for(const k of keys){if(out.length>=n)break;const q=by[k].shift();if(q)out.push({k:"st",u:q.uid,topic:q.topic||""});}
  return out;}
/* rest stations (ผู้ใช้สั่ง 19 ต.ค. 2026):
   1) after every examiner station (ex) · 2) a procedure station (proc) has no rest after it — 3) but never more than 2 examiner stations (ex or proc) in a row without a rest
   4) after every 3–5 stations without an examiner (random gap) · any rest resets both counts · the paper is a circle (the last slot is followed by the first) */
function osRests(sts){const out=[];let run=0,exr=0,gap=osRand(3,5);const rest=()=>{out.push({k:"rest"});run=0;exr=0;gap=osRand(3,5);};
  sts.forEach(sl=>{out.push(sl);const t=sl.ty;if(t==="ex")rest();else if(t==="proc"){exr++;if(exr>=2)rest();}else if(t==="noex"){exr=0;run++;if(run>=gap)rest();}});
  if(out.length&&out[out.length-1].k!=="rest"&&osExMax(out,t=>t.ty)>2)out.push({k:"rest"});   /* the run that crosses from the last slot to the first */
  return out;}
/* longest run of examiner stations (ex or proc) with no rest between them, going round the circle */
function osExMax(seq,tyOf){const N=seq.length;if(!N)return 0;const isEx=sl=>sl.k!=="rest"&&["ex","proc"].includes(tyOf(sl));if(seq.every(isEx))return N;
  let best=0,cur=0;for(let k=0;k<2*N;k++){const sl=seq[k%N];if(sl.k==="rest"){cur=0;continue;}if(isEx(sl)){cur++;best=Math.max(best,cur);}else cur=0;}return Math.min(best,N);}
function osStartPick(seq){const ix=seq.map((s,i)=>s.k==="rest"?-1:i).filter(i=>i>=0);return ix.length?ix[Math.floor(Math.random()*ix.length)]:0;}
function osNewRun(o){return Object.assign({id:now().toString(36),ts:now(),stage:"prep",kind:"legend",seq:[],start:0,gen:{},ans:{},tick:{},ut:{},gm:{},ai:{},short:0},o);}
/* Legendary: cfg {mode,n,per,rest,order,topics,nAI} — nAI stations written by AI, the rest old exams (AI also fills any shortage when AI is on) */
function osBuild(cfg){const P=P_(),nAI=Math.max(0,Math.min(cfg.n,cfg.nAI||0));let sts=osPick(cfg.topics,cfg.n-nAI,true);const short=cfg.n-nAI-sts.length;
  const nGen=nAI+(cfg.nAI>0?short:0),tp=shuffle(cfg.topics.length?cfg.topics:osTopics().map(t=>t.id));
  for(let i=0;i<nGen;i++)sts.push({k:"st",src:"ai",topic:tp[i%Math.max(1,tp.length)]||"",u:""});
  const run=osNewRun({mode:cfg.mode,per:cfg.per,rest:cfg.rest,order:cfg.order,topics:cfg.topics,n:cfg.n,nAI,short:cfg.nAI>0?0:Math.max(0,short)});
  sts.forEach(sl=>{sl.ty=osSlotType(run,sl);});
  if(cfg.order!=="custom"){if(cfg.order==="block"){const a=shuffle(sts.filter(s=>s.ty==="noex")),b=shuffle(sts.filter(s=>s.ty!=="noex"));sts=a.concat(b);}else sts=shuffle(sts);
    run.seq=osRests(sts);run.start=osStartPick(run.seq);}
  P.osRun=run;save();return run;}
/* real exam count/time — set here when the ward has none yet (same place as the Admit · ICU · Discharge page) */
function osSetReal(n,min){const id=W_().cfg.id,o=wOv(id);st.wcfg=st.wcfg||{};st.wcfg[id]=Object.assign({},o||{},{examOS:{n:Math.round(n),min:Math.round(min*2)/2},ts:now()});delete st.wcfg[id].reset;save();}
/* ---- Legendary setup page (#/<ward>/osl) ---- */
function osSetup(){const P=P_(),E=osExamCfg(),L=mqL(ward,"OSCE"),T=osTopics(),v=P.osSet=Object.assign({mode:"irl",rest:OS_REST,order:"block",topics:[],aiOn:false,nAI:0},P.osSet||{});
  if(osPrep())return osPrepView();
  const n=E?E.n:0,defAI=Math.max(1,Math.round(n*0.2));if(!(v.nAI>0))v.nAI=defAI;if(n&&v.nAI>n)v.nAI=n;
  let h=`<div class="mqv osv"><div class="whead"><h1 class="h2">Legendary round · OSCE</h1><a href="#/${esc(ward)}">กลับหน้าวอร์ด</a></div>
    <p class="sub" style="margin:0 0 10px">จำลองสอบจริง — จำนวนข้อและเวลาต่อข้อเท่าสอบจริงของวอร์ด · เปิดทีละข้อ ข้อย่อยขึ้นพร้อมกัน หมดเวลาเปลี่ยนข้อเอง · ข้อสอบเก่าในคลัง <b>${L.length}</b> ข้อ</p>`;
  const cur=osRunCur();if(cur)h+=`<button class="resume" id="osResume"><span>กำลังทำอยู่: <b>${osKindN(cur.kind)} · ${cur.mode==="irl"?"IRL":"SIM"}</b><span class="rd">ช่องที่ ${(cur.pos||0)+1}/${cur.seq.length} — กดเพื่อทำต่อ</span></span><span class="go">→</span></button>`;
  h+=`<div class="card"><h3>สอบจริงของวอร์ดนี้</h3>${E?`<p class="osreal"><b>${E.n}</b> ข้อ (ไม่นับข้อพัก) · ข้อละ <b>${E.min}</b> นาที</p><span class="rd">แก้ได้ที่หน้า <a href="#/${esc(ward)}/dates">Admit · ICU · Discharge</a></span>`
    :`<span class="rd">ยังไม่ได้ตั้งจำนวนข้อ/เวลาของ OSCE จริง — ใส่ตรงนี้ (บันทึกที่เดียวกับหน้า <a href="#/${esc(ward)}/dates">Admit · ICU · Discharge</a>)</span><div class="dtrow"><label>จำนวนข้อ (ไม่นับข้อพัก)<input type="number" id="osRN" min="1" max="80" placeholder="เช่น 25"></label><label>เวลาต่อข้อ (นาที)<input type="number" id="osRM" min="0.5" max="60" step="0.5" placeholder="เช่น 5"></label></div><button class="btn" type="button" id="osRSave">บันทึก</button>`}</div>`;
  h+=`<div class="card"><h3>1. แบบการสอบ</h3><div class="seg" role="group"><button data-osm="irl" aria-pressed="${v.mode==="irl"}"><b>IRL</b>มีผู้คุมคนจริง — จอโชว์แค่โจทย์ ผู้คุมดู checklist ใต้โจทย์</button><button data-osm="sim" aria-pressed="${v.mode==="sim"}"><b>SIM</b>จำลองเอง — พิมพ์ตอบทุกข้อย่อย ข้อที่ต้องพูดให้พิมพ์สิ่งที่จะพูด</button></div></div>`;
  const cnt={};L.forEach(q=>{cnt[q.topic]=(cnt[q.topic]||0)+1;});
  h+=`<div class="card"><h3>2. หัวข้อที่อยากสอบ <span class="hint" style="font-weight:400">ไม่เลือก = ทุกหัวข้อ</span></h3>${T.length?`<div class="chips">${T.map(t=>`<button class="chip" type="button" data-ost="${esc(t.id)}" aria-pressed="${v.topics.includes(t.id)}">${OS_TI[t.proc?"proc":t.ex?"ex":"noex"]} ${esc(t.name)}<span class="cnt">${cnt[t.id]||0}</span></button>`).join("")}</div>`:`<span class="rd">วอร์ดนี้ยังไม่มีรายการหัวข้อ OSCE — สุ่มจากทุกข้อในคลัง</span>`}
    <span class="rd" style="margin-top:6px">📝 ไม่มีอาจารย์ · 👨‍⚕️ มีอาจารย์ · 🩺 หัตถการ · ตัวเลข = ข้อสอบเก่าในคลัง</span></div>`;
  const inT=L.filter(q=>!v.topics.length||v.topics.includes(q.topic)).length;
  h+=`<div class="card"><h3>3. โจทย์นอกข้อสอบเก่า</h3><div class="osord">${[["0","ข้อสอบเก่าเท่านั้น","ทุกข้อมาจากข้อสอบเก่าในคลัง"],["1","เพิ่มโจทย์ใหม่จาก AI","เหมือนโจทย์ AI ใน Legendary MCQ — โรค/รูป/โจทย์อื่นนอกข้อสอบเก่า · ข้อที่ต้องใช้รูป AI จะบอกว่าเป็นรูปอะไร แล้วคุณใส่รูปเองก่อนเริ่ม"]].map(([k,nm,d])=>`<button class="osopt" type="button" data-osai="${k}" aria-pressed="${(v.aiOn?"1":"0")===k}"><b>${nm}</b><span>${d}</span></button>`).join("")}</div>
    ${v.aiOn?`<div class="dtrow" style="margin-top:8px"><label>จำนวนข้อที่ให้ AI แต่ง${n?` (จาก ${n} ข้อ)`:""}<input type="number" id="osNAI" min="1" max="${n||80}" value="${esc(v.nAI)}"></label></div>${osAiBtns()}<span class="rd">ต้องเปิดใน Claude หรือใส่ API key · AI ดึงรูปจากอินเทอร์เน็ตไม่ได้ — ข้อที่ต้องใช้รูปมีลิงก์ค้นรูปใน Google ให้ แล้วใส่รูปเองได้ (ไม่ใส่ก็สอบได้ จะขึ้นคำบรรยายแทนรูป)</span>`:""}
    ${n&&!v.aiOn&&inT<n?`<p class="hint" style="margin:8px 0 0">ข้อสอบเก่าในหัวข้อที่เลือกมี ${inT} ข้อ ไม่ครบ ${n} — จะสอบแค่ ${inT} ข้อ หรือเลือก "เพิ่มโจทย์ใหม่จาก AI" ให้ AI เติมส่วนที่ขาด</p>`:""}</div>`;
  h+=`<div class="card"><h3>4. วิธีเรียงข้อและข้อพัก</h3><div class="osord">${[["block","แยกกลุ่ม","ข้อไม่มีอาจารย์อยู่ก่อน (เรียงสุ่ม) แล้วข้อมีอาจารย์อยู่ติดกันท้ายสุด · สุ่มข้อเริ่ม แล้วทำไล่ไปจนครบวง"],["random","สุ่มปนกัน","สุ่มลำดับข้อมีและไม่มีอาจารย์ปนกัน · สุ่มข้อเริ่มเหมือนกัน"],["custom","ออกแบบเอง","วางเองทีละข้อ ว่าข้อไหนหัวข้ออะไร ใช้ข้อสอบเก่าหรือให้ AI แต่งตามที่ต้องการ และใส่ข้อพักตรงไหน"]].map(([k,nm,d])=>`<button class="osopt" type="button" data-oso="${k}" aria-pressed="${v.order===k}"><b>${nm}</b><span>${d}</span></button>`).join("")}</div>
    <div class="dtrow" style="margin-top:8px"><label>ข้อพัก (วินาที)<input type="number" id="osRest" min="5" max="600" step="5" value="${esc(v.rest)}"></label></div>
    ${v.order!=="custom"?`<p class="rd" style="margin:6px 0 0">ข้อพัก: หลังข้อมีอาจารย์ทุกข้อ (ยกเว้นหัตถการ) และทุก 3–5 ข้อไม่มีอาจารย์ (สุ่ม) · นับเป็น 1 เลขข้อ · แก้ตำแหน่งได้ในหน้าถัดไป</p>`:`<p class="rd" style="margin:6px 0 0">ออกแบบเอง: จำนวนข้อตามที่วาง · เวลาต่อข้อตามสอบจริง</p>`}</div>`;
  h+=`<div class="stack"><button class="btn primary" id="osGo" type="button" ${E?"":"disabled"}>${v.order==="custom"?"ไปหน้าออกแบบข้อสอบ →":"สร้างชุดข้อสอบ →"}</button></div>${E?"":`<p class="hint">ใส่จำนวนข้อและเวลาของสอบจริงก่อน</p>`}`;
  h+=`<p class="statline" style="margin-top:16px"><a href="#/${esc(ward)}/osh">📜 ประวัติ Legendary round / Quality round OSCE</a> (${(P.osHist||[]).length} ครั้ง)</p>`;
  h+=osInfoHTML()+`</div>`;$("main").innerHTML=h;
  const upd=o=>{Object.assign(v,o);P.osSet=v;save();osSetup();};
  {const b=$("osResume");if(b)b.onclick=()=>go(ward+"/osx");}
  {const b=$("osRSave");if(b)b.onclick=()=>{const a=+$("osRN").value,m=+$("osRM").value;if(!(a>0&&m>0)){toast("ใส่ทั้งจำนวนข้อและเวลาต่อข้อ");return;}osSetReal(a,m);toast("บันทึกจำนวนข้อและเวลาสอบจริงแล้ว");osSetup();};}
  document.querySelectorAll("[data-osm]").forEach(b=>b.onclick=()=>upd({mode:b.dataset.osm}));
  document.querySelectorAll("[data-oso]").forEach(b=>b.onclick=()=>upd({order:b.dataset.oso}));
  document.querySelectorAll("[data-osai]").forEach(b=>b.onclick=()=>upd({aiOn:b.dataset.osai==="1"}));
  document.querySelectorAll("[data-ost]").forEach(b=>b.onclick=()=>{const k=b.dataset.ost,a=v.topics.slice(),i=a.indexOf(k);if(i>=0)a.splice(i,1);else a.push(k);upd({topics:a});});
  {const e=$("osNAI");if(e)e.onchange=()=>{const x=Math.round(+e.value);if(x>0){v.nAI=x;P.osSet=v;save();}};}
  $("osRest").onchange=()=>{const x=Math.round(+$("osRest").value);if(x>0){v.rest=x;P.osSet=v;save();}};
  $("osGo").onclick=async()=>{if(!E)return;const rest=Math.round(+$("osRest").value);if(!(rest>0)){toast("ใส่เวลาข้อพัก");return;}
    if(cur&&!await uiAsk("มีชุดที่ทำค้างอยู่ — สร้างชุดใหม่แทน? (ชุดเดิมจะถูกยกเลิก ไม่เก็บผล)"))return;
    v.rest=rest;P.osSet=v;osBuild({mode:v.mode,n:E.n,per:E.min*60,rest,order:v.order,topics:v.topics.slice(),nAI:v.aiOn?Math.min(E.n,v.nAI||1):0});osPrepView();};}
function osInfoHTML(){return `<details class="card osinfo"><summary><b>เกณฑ์คะแนนที่เว็บใช้</b></summary><div class="rd">เฉลยแต่ละข้อย่อยเป็น checklist แบบ OSCE จริง: "ต้องมีคำนี้" หรือ "ต้องได้ n จาก m อย่าง" · คะแนนข้อย่อย = สัดส่วน checklist ที่ได้ × คะแนนเต็มข้อย่อย (กดให้คะแนนเองทับได้) · คะแนนแต่ละข้อคิดเป็น % แล้วเฉลี่ยทุกข้อ (ข้อพักไม่นับ) · เกรดเหมือน Legendary MCQ (A ≥ 80 … F &lt; 50) · <b>ผ่านข้อ = ได้ ≥ 60%</b> (สมมติไว้ เกณฑ์จริงของคณะไม่เปิดเผย และมักคิดจากคะแนนทั้งรุ่น)</div></details>`;}
/* ---- Legendary prep page: see the paper, AI stations + their pictures, move / add / remove rest stations, re-roll; custom = design every slot ---- */
function osPrepView(){const run=osPrep();if(!run)return osSetup();const N=run.seq.length,cust=run.order==="custom",T=osTopics(),L=mqL(ward,"OSCE");
  osImgLoad(run,()=>{if(view==="osl"&&osPrep())osPrepView();});
  const pend=run.seq.filter(s=>s.k==="st"&&s.src==="ai"&&!s.u),gen=run.seq.filter(s=>s.k==="st"&&s.u&&run.gen[s.u]).map(s=>run.gen[s.u]),needImg=gen.filter(osNeedsImg);
  let h=`<div class="mqv osv"><div class="whead"><h1 class="h2">เตรียมสอบ · OSCE</h1><a href="#/${esc(ward)}">กลับหน้าวอร์ด</a></div>
    <p class="sub" style="margin:0 0 10px"><b>${run.mode==="irl"?"IRL":"SIM"}</b> · ${run.seq.filter(s=>s.k!=="rest").length} ข้อ + ข้อพัก ${run.seq.filter(s=>s.k==="rest").length} = <b>${N}</b> เลขข้อ · ข้อละ ${osFmt(run.per)} นาที · พัก ${run.rest} วินาที · ${cust?"ออกแบบเอง":run.order==="block"?"แยกกลุ่ม":"สุ่มปนกัน"}</p>`;
  {const m=osExMax(run.seq,sl=>osSlotType(run,sl));if(m>2)h+=`<p class="hint" style="color:var(--wrong)">⚠ มีข้อมีอาจารย์ (รวมหัตถการ) ติดกัน ${m} ข้อโดยไม่มีข้อพัก — กฎคือไม่เกิน 2 ข้อ ใส่ข้อพักเพิ่มด้วย "+ พักหลังข้อนี้"</p>`;}
  if(run.short)h+=`<p class="hint">ข้อสอบเก่าในหัวข้อที่เลือกไม่พอ — ชุดนี้มี ${run.seq.filter(s=>s.k!=="rest").length} ข้อ (ขาด ${run.short})</p>`;
  if(N){h+=`<div class="ostart">เริ่มที่ <b>ข้อ ${run.start+1}</b> <select id="osStartSel" aria-label="เลือกข้อเริ่ม">${run.seq.map((s,i)=>s.k==="rest"?"":`<option value="${i}"${i===run.start?" selected":""}>ข้อ ${i+1}</option>`).join("")}</select> <button class="btn" type="button" id="osReStart">🎲 สุ่มข้อเริ่มใหม่</button></div>`;}
  h+=`<div class="osslots">${run.seq.map((sl,i)=>{const ty=osSlotType(run,sl),q=sl.k==="st"?osSt(run,sl.u):null,isS=i===run.start;
    if(sl.k==="rest")return `<div class="osslot rest"><span class="on">${i+1}</span><span class="oi">☕</span><span class="ot">ข้อพัก <span class="hint">${run.rest} วินาที</span></span><span class="oa"><button class="btn sm" type="button" data-osmv="${i}" data-d="-1" aria-label="เลื่อนขึ้น">↑</button><button class="btn sm" type="button" data-osmv="${i}" data-d="1" aria-label="เลื่อนลง">↓</button><button class="link" type="button" data-osdel="${i}">ลบ</button></span></div>`;
    const src=sl.src==="ai"?`<span class="tag">AI ${sl.u?"แต่งแล้ว":"จะแต่งใหม่"}${sl.brief?" · "+esc(sl.brief.slice(0,40)):""}${q&&osNeedsImg(q)?(OSIMG[q.uid]?" · 🖼 ใส่รูปแล้ว":" · 🖼 ยังไม่มีรูป"):""}</span>`:q?`<span class="tag">ข้อสอบเก่า ${esc(q.set)}${q.ro?" "+esc(q.ro):""}</span>`:"";
    return `<div class="osslot${isS?" start":""}"><span class="on">${i+1}</span><span class="oi" title="${OS_TT[ty]}">${OS_TI[ty]}</span><span class="ot">${esc(osTN(sl.topic||(q&&q.topic)))} ${src}${isS?' <b class="sflag">◀ เริ่มที่นี่</b>':""}</span><span class="oa">${run.seq[i+1]&&run.seq[i+1].k==="rest"?"":`<button class="link" type="button" data-osaddr="${i}">+ พักหลังข้อนี้</button>`}${cust?`<button class="btn sm" type="button" data-osmv="${i}" data-d="-1" aria-label="เลื่อนขึ้น">↑</button><button class="btn sm" type="button" data-osmv="${i}" data-d="1" aria-label="เลื่อนลง">↓</button><button class="link" type="button" data-osdel="${i}">ลบ</button>`:""}</span></div>`;}).join("")||`<p class="hint">ยังไม่มีข้อ — เพิ่มข้อด้านล่าง</p>`}</div>`;
  if(cust){h+=`<div class="card"><h3>+ เพิ่มข้อ</h3><div class="dtrow"><label>หัวข้อ<select id="osCT">${T.map(t=>`<option value="${esc(t.id)}">${OS_TI[t.proc?"proc":t.ex?"ex":"noex"]} ${esc(t.name)}</option>`).join("")||`<option value="">ไม่ระบุ</option>`}</select></label>
      <label>โจทย์จาก<select id="osCS"><option value="ac">ข้อสอบเก่า (สุ่มในหัวข้อนี้)</option><option value="ai">ให้ AI แต่งใหม่</option>${L.length?`<optgroup label="เลือกข้อสอบเก่าเอง">${L.map(q=>`<option value="u:${esc(q.uid)}">${esc(q.set)} ข้อ ${esc(mqNum(q))} · ${esc(osTN(q.topic))}</option>`).join("")}</optgroup>`:""}</select></label></div>
      <label class="osbrief">อยากได้โจทย์แบบไหน (สำหรับ AI · ไม่บังคับ)<input type="text" id="osCB" placeholder="เช่น EKG AF with RVR ถาม dx + tx, ซักประวัติไข้ในผู้ป่วย HIV"></label>
      <div class="row2"><button class="btn" type="button" id="osCAdd">+ เพิ่มข้อนี้</button><button class="btn" type="button" id="osCRest">+ เพิ่มข้อพักท้ายสุด</button></div></div>`;}
  else h+=`<div class="row2" style="margin-top:10px"><button class="btn" type="button" id="osReRest">🎲 สุ่มตำแหน่งข้อพักใหม่</button><button class="btn" type="button" id="osReAll">🎲 สุ่มชุดใหม่ทั้งหมด</button></div>`;
  if(needImg.length){const done=needImg.filter(q=>OSIMG[q.uid]).length;
    h+=`<details class="card osimgs"${run.imgOpen?" open":""}><summary><b>🖼 ข้อ AI ที่ต้องใช้รูป ${done}/${needImg.length}</b> <span class="hint">ข้างในบอกว่าเป็นรูปอะไร — เปิดดูแล้วจะรู้คำตอบบางส่วน (ให้คนอื่นใส่ให้ได้)</span></summary>
      <p class="rd">AI ดึงรูปจากอินเทอร์เน็ตไม่ได้ — กด "ค้นรูป" เปิด Google รูปภาพ บันทึกรูปแล้วกด "ใส่รูป" · รูปเก็บในเครื่องนี้เท่านั้น · ไม่ใส่ก็สอบได้ ข้อนั้นจะขึ้นคำบรรยายแทนรูป</p>
      ${needImg.map(q=>{const ix=run.seq.findIndex(s=>s.u===q.uid),d=OSIMG[q.uid];return `<div class="osimgrow"><div><b>ข้อ ${ix+1}</b> · ${esc(osTN(q.topic))}<div>${q.imgNeed||q.imgAlt}</div></div>${d?`<img class="osthumb" src="${d}" alt="">`:""}<div class="oa"><a class="btn sm" target="_blank" rel="noopener" href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(plain(q.imgNeed||q.imgAlt))}">🔎 ค้นรูป ↗</a><label class="btn sm osup">${d?"เปลี่ยนรูป":"ใส่รูป"}<input type="file" accept="image/*" data-osimg="${esc(q.uid)}" hidden></label>${d?`<button class="link" type="button" data-osimgdel="${esc(q.uid)}">ลบรูป</button>`:""}</div></div>`;}).join("")}</details>`;}
  if(OSAI.busy)h+=`<p class="hint">⏳ ${esc(OSAI.msg||"AI กำลังแต่งโจทย์…")}</p>`;else if(OSAI.err)h+=`<p class="hint" style="color:var(--wrong)">${esc(OSAI.err)}</p>`;
  if(pend.length&&!osAiOK())h+=osAiBtns();
  h+=`<div class="stack"><button class="btn primary" id="osBegin" type="button" ${N&&!OSAI.busy?"":"disabled"}>${pend.length?`ให้ AI แต่งโจทย์ ${pend.length} ข้อ →`:"เริ่มสอบ ▶"}</button><button class="btn" id="osBack" type="button">← กลับไปตั้งค่า</button></div>`;
  h+=`<p class="hint">${pend.length?"แต่งเสร็จแล้วใส่รูปข้อที่ต้องใช้รูป (ถ้ามี) แล้วกดเริ่มสอบ · ":""}ข้อแรกที่เริ่มต้องไม่ใช่ข้อพัก · ระหว่างสอบหมดเวลาแล้วเปลี่ยนข้อเอง มีเสียงเตือนตอนเหลือ 1 นาทีและตอนเปลี่ยนข้อ · ปิดหน้าไประหว่างสอบ เวลาจะหยุดไว้ แล้วเดินต่อเมื่อกลับมา</p></div>`;
  $("main").innerHTML=h;
  const fixStart=()=>{if(!run.seq.length){run.start=0;return;}if(run.start>=run.seq.length)run.start=0;let g=0;while(run.seq[run.start]&&run.seq[run.start].k==="rest"&&g++<run.seq.length)run.start=(run.start+1)%run.seq.length;};
  const re=()=>{fixStart();save();const y=scrollY;osPrepView();scrollTo(0,y);};
  {const s=$("osStartSel");if(s)s.onchange=()=>{run.start=+s.value;re();};}
  {const b=$("osReStart");if(b)b.onclick=()=>{run.start=osStartPick(run.seq);re();};}
  document.querySelectorAll("[data-osmv]").forEach(b=>b.onclick=()=>{const i=+b.dataset.osmv,d=+b.dataset.d,j=i+d;if(j<0||j>=run.seq.length)return;const a=run.seq,st0=a[run.start];[a[i],a[j]]=[a[j],a[i]];
    if(a.some((x,k)=>x.k==="rest"&&a[k+1]&&a[k+1].k==="rest")){[a[i],a[j]]=[a[j],a[i]];toast("ข้อพักติดกัน 2 ข้อไม่ได้");return;}run.start=Math.max(0,a.indexOf(st0));re();});
  document.querySelectorAll("[data-osdel]").forEach(b=>b.onclick=()=>{const i=+b.dataset.osdel,st0=run.seq[run.start];run.seq.splice(i,1);run.start=Math.max(0,run.seq.indexOf(st0));re();});
  document.querySelectorAll("[data-osaddr]").forEach(b=>b.onclick=()=>{const i=+b.dataset.osaddr,st0=run.seq[run.start];run.seq.splice(i+1,0,{k:"rest"});run.start=run.seq.indexOf(st0);re();});
  {const b=$("osReRest");if(b)b.onclick=()=>{const st0=run.seq[run.start];run.seq=osRests(run.seq.filter(s=>s.k!=="rest").map(s=>Object.assign(s,{ty:osSlotType(run,s)})));run.start=Math.max(0,run.seq.indexOf(st0));re();};}
  {const b=$("osReAll");if(b)b.onclick=()=>{osBuild({mode:run.mode,n:run.n,per:run.per,rest:run.rest,order:run.order,topics:run.topics,nAI:run.nAI||0});osPrepView();};}
  {const b=$("osCAdd");if(b)b.onclick=()=>{const t=$("osCT").value,s=$("osCS").value,brief=$("osCB").value.trim();let sl;
    if(s.startsWith("u:")){const q=L.find(x=>x.uid===s.slice(2));if(!q)return;sl={k:"st",u:q.uid,topic:q.topic||""};}
    else if(s==="ac"){const used=new Set(run.seq.map(x=>x.u).filter(Boolean)),pool=shuffle(L.filter(q=>(q.topic||"")===t&&!used.has(q.uid)));if(!pool.length){toast("หัวข้อนี้ไม่มีข้อสอบเก่าที่ยังไม่ได้ใช้ — เลือก \"ให้ AI แต่งใหม่\"");return;}sl={k:"st",u:pool[0].uid,topic:t};}
    else sl={k:"st",src:"ai",topic:t,u:"",brief};
    sl.ty=osSlotType(run,sl);run.seq.push(sl);if(run.seq.length===1)run.start=0;re();};}
  {const b=$("osCRest");if(b)b.onclick=()=>{if(!run.seq.length||run.seq[run.seq.length-1].k==="rest"){toast("ต้องมีข้อสอบก่อนข้อพัก");return;}run.seq.push({k:"rest"});re();};}
  {const d=document.querySelector("details.osimgs");if(d)d.addEventListener("toggle",()=>{run.imgOpen=d.open;persist();});}
  document.querySelectorAll("[data-osimg]").forEach(el=>el.onchange=async()=>{const f=el.files&&el.files[0];if(!f)return;try{const d=await osShrink(f);await osImgPut(el.dataset.osimg,d);OSIMG[el.dataset.osimg]=d;run.imgOpen=true;re();}catch(e){toast("ใส่รูปไม่สำเร็จ — ลองไฟล์ JPG/PNG อื่น");}});
  document.querySelectorAll("[data-osimgdel]").forEach(b=>b.onclick=async()=>{try{await osImgPut(b.dataset.osimgdel,null);}catch(e){}OSIMG[b.dataset.osimgdel]=false;re();});
  $("osBack").onclick=async()=>{if(!await uiAsk("ยกเลิกชุดนี้แล้วกลับไปหน้าตั้งค่า?"))return;P_().osRun=null;save();osSetup();};
  $("osBegin").onclick=()=>osBegin(run);}
async function osBegin(run){if(OSAI.busy)return;OSAI.err="";const need=run.seq.filter(s=>s.k==="st"&&s.src==="ai"&&!s.u);
  if(need.length){let mode="";try{mode=await aiMode();}catch(e){}
    if(!mode){OSAI.err=`ต้องให้ AI แต่ง ${need.length} ข้อ แต่ยังใช้ AI ไม่ได้ — เปิดหน้านี้ใน Claude หรือใส่ API key (หน้า Admission round) หรือกลับไปเลือก "ข้อสอบเก่าเท่านั้น"`;osPrepView();return;}
    OSAI.busy=1;let k=0;
    try{for(const sl of need){k++;OSAI.msg=`AI กำลังแต่งโจทย์ ${k}/${need.length} (${osTN(sl.topic)}) …`;osPrepView();const q=await osGen(run,sl);run.gen[q.uid]=q;OSIMG[q.uid]=false;sl.u=q.uid;sl.ty=osSlotType(run,sl);save();}}
    catch(e){OSAI.busy=0;OSAI.err=(typeof admMsg==="function"&&admMsg(e))||"AI แต่งโจทย์ไม่สำเร็จ — ลองกดใหม่";osPrepView();return;}
    OSAI.busy=0;OSAI.msg="";if(run.seq.some(s=>s.u&&osNeedsImg(run.gen[s.u])))run.imgOpen=false;save();osPrepView();return;}   /* stop on the prep page so pictures can be added */
  if(!run.seq.some(s=>s.k==="st")){toast("ยังไม่มีข้อสอบ");return;}
  if(run.seq[run.start].k==="rest")run.start=run.seq.findIndex(s=>s.k!=="rest");
  osGo(run);}
function osGo(run){run.stage="run";run.pos=0;run.left=run.seq[osOrder(run)[0]].k==="rest"?run.rest:run.per;run.paused=false;run.t0=now();run.at=now();P_().osRun=run;save();go(ward+"/osx");}
/* ---- AI station (old exam of the same topic is the style example) ---- */
function osGenPrompt(run,sl){const w=W_().cfg,tn=osTN(sl.topic),te=osTopicEx(sl.topic),L=mqL(ward,"OSCE"),ex=shuffle(L.filter(q=>q.topic===sl.topic))[0]||shuffle(L)[0];
  const exJ=ex?JSON.stringify({title:ex.title,stem:plain(ex.stem),sp:ex.sp?plain(ex.sp):undefined,subs:ex.subs.map(s=>({q:s.q,marks:s.marks,ans:plain(s.ans),points:s.points,kw:s.kw}))}):"";
  const used=run.seq.map(s=>osSt(run,s.u)).filter(Boolean).map(q=>q.title).join("; ");
  return `Write ONE brand-new OSCE station for Thai ${INST.stu} (medical students) in Year 4 at ${INST.en}, ${w.name} rotation.
Station topic: ${tn}${te.proc?" (procedure station with an examiner)":te.ex?" (station with an examiner: the student talks to a standardized patient or examines one)":" (written station, no examiner: the student reads the material and writes answers)"}. Time: ${osFmt(run.per)} minutes.
${sl.brief?"The student asked for: "+sl.brief+"\n":""}Scope: ${w.scope||w.name}. Level: what a Year-4 student must know. Content from current standard textbooks and guidelines. Prefer a disease, finding or task that is NOT in the old exams of this ward, so the student meets something new.
Avoid these stations already in this exam: ${used||"none"}.
Pictures: the website cannot make pictures — the student will insert one himself. If this station needs a picture (EKG, film, CT, smear, Gram stain, KOH, urine sediment, skin lesion, photo of a physical sign, etc.):
- "imgNeed": exactly which picture to find (e.g. "12-lead EKG: atrial fibrillation with rapid ventricular response") — may name the finding, it is shown only to the person who inserts the picture.
- "imgAlt": a short neutral written description used only if no picture is inserted (measurements, morphology, distribution) WITHOUT naming the diagnosis or the sign the student must identify.
- The stem says the picture "is shown". Otherwise set both to "".
Rules:
- Stem and questions in formal English like a real exam. 1–4 sub-questions (e.g. "1.1 Diagnosis"); stations with an examiner usually have one long task (take a history / examine / perform) plus a short question at the end.
- For an examiner station write "sp": the script for the standardized patient / examiner in Thai (patient details, answers to likely questions, examination findings to give when asked).
- Each sub-question has an OSCE checklist key: "points" = list of items; an item is either a string (must be said) or {"label": "...", "any": ["...", "..."], "need": n} (any n of these). "kw" = for each item, case-insensitive JavaScript regex strings (Thai or English keywords) that detect it in a typed answer: for a string item an array of strings; for an "any" item an array of arrays, one per option.
- "ans": model answer (English with Thai explanation allowed, <b> for emphasis). "exp": short Thai explanation with the key facts.
Reply with only a JSON object:
{"title": "short neutral English title that does not give the answer", "stem": "...", "imgNeed": "", "imgAlt": "", "sp": "Thai script or empty string", "subs": [{"q": "...", "marks": 2, "ans": "...", "exp": "...", "points": [...], "kw": [...]}], "interp": "Thai: what this station tests", "summary": ["3–5 Thai high-yield bullets"]}
${exJ?"Style example (an old exam station of this ward):\n"+exJ:""}`;}
async function osGen(run,sl){const o=await aiJSON(osGenPrompt(run,sl),4096);if(!o||!o.stem||!Array.isArray(o.subs)||!o.subs.length)throw {code:"invalid_json"};
  const te=osTopicEx(sl.topic),uid="OSAI|"+now().toString(36)+Math.random().toString(36).slice(2,6),okRe=x=>{try{new RegExp(x,"i");return true;}catch(e){return false;}};
  const subs=o.subs.slice(0,6).map(s=>{const pts=Array.isArray(s.points)?s.points.filter(p=>typeof p==="string"||(p&&Array.isArray(p.any))):[];let kw=Array.isArray(s.kw)?s.kw:[];
    kw=pts.map((p,j)=>{const k=kw[j];if(typeof p==="string")return (Array.isArray(k)?k:[]).map(String).filter(okRe);return p.any.map((a,m)=>(Array.isArray(k)&&Array.isArray(k[m])?k[m]:[]).map(String).filter(okRe));});
    return {q:san(s.q),marks:Math.max(1,Math.min(10,+s.marks||2)),ans:san(s.ans),exp:san(s.exp),points:pts.map(p=>typeof p==="string"?san(p):{label:san(p.label||""),any:p.any.map(san),need:Math.max(1,Math.min(p.any.length,+p.need||1))}),kw,tags:[sl.topic]};});
  return {uid,ai:1,set:"AI",ro:"",orig:"AI",file:"AI",page:"",topic:sl.topic,ex:te.ex?1:0,proc:te.proc?1:0,title:String(o.title||"").slice(0,90),stem:san(o.stem),imgNeed:san(o.imgNeed||""),imgAlt:san(o.imgAlt||""),sp:san(o.sp||""),parts:[{subs}],interp:san(o.interp||""),summary:(Array.isArray(o.summary)?o.summary:[]).map(san),brief:sl.brief||""};}
/* ---- Quality round (#/<ward>/osq): timed practice like Quality MCQ ---- */
function osQuality(){const P=P_(),L=mqL(ward,"OSCE"),E=osExamCfg(),v=P.osQ=Object.assign({mode:"sim",src:"all",sets:[],fresh:false,n:Math.min(10,L.length||10),per:E?E.min:5,rest:0},P.osQ||{});
  const sets=[...new Set(L.map(mqSK))];v.sets=v.sets.filter(k=>sets.includes(k));
  const base=v.src==="sets"?L.filter(q=>!v.sets.length||v.sets.includes(mqSK(q))):L,pool=v.fresh?base.filter(q=>!osDone(q)):base,cur=osRunCur();
  let h=`<div class="mqv osv"><div class="whead"><h1 class="h2">Quality round · OSCE</h1><a href="#/${esc(ward)}">กลับหน้าวอร์ด</a></div>
    <p class="sub" style="margin:0 0 10px">ทำข้อสอบเก่าแบบจับเวลาทีละข้อ หมดเวลาเปลี่ยนข้อเอง · เลือกปีที่จะทำ หรือสุ่มจากทั้งคลัง · กำหนดเวลาต่อข้อเอง</p>`;
  if(cur)h+=`<button class="resume" id="osResume"><span>กำลังทำอยู่: <b>${osKindN(cur.kind)} · ${cur.mode==="irl"?"IRL":"SIM"}</b><span class="rd">ช่องที่ ${(cur.pos||0)+1}/${cur.seq.length} — กดเพื่อทำต่อ</span></span><span class="go">→</span></button>`;
  h+=`<div class="card"><h3>แบบการทำ</h3><div class="seg" role="group"><button data-oqm="irl" aria-pressed="${v.mode==="irl"}"><b>IRL</b>มีผู้คุม — จอโชว์แค่โจทย์</button><button data-oqm="sim" aria-pressed="${v.mode==="sim"}"><b>SIM</b>พิมพ์ตอบเอง</button></div></div>`;
  h+=`<div class="card"><h3>ข้อสอบที่จะทำ</h3><div class="chips">${[["all","สุ่มจากข้อสอบเก่าทั้งหมด"],["sets","เลือกปีที่จะทำ"]].map(([k,t])=>`<button class="chip" type="button" data-oqs="${k}" aria-pressed="${v.src===k}">${t}</button>`).join("")}</div>
    <p class="hint" style="margin:6px 0 0">${v.src==="all"?"สุ่มลำดับจากข้อสอบเก่าทุกปีในคลัง":"เหมือน Service round แต่จับเวลา — เรียงข้อตามชุดที่เลือก ไม่เลือกเลย = ทุกชุด · ตัวเลข = ทำแล้ว/ทั้งหมด ใน Phase "+ph()}</p>
    ${v.src==="sets"?`<div class="chips">${sets.map(k=>{const qs=L.filter(q=>mqSK(q)===k);return `<button class="chip" type="button" data-oqk="${esc(k)}" aria-pressed="${v.sets.includes(k)}">${esc(k)}<span class="cnt">${qs.filter(osDone).length}/${qs.length}</span></button>`;}).join("")}</div>`:""}
    <label class="chk"><input type="checkbox" id="oqFresh" ${v.fresh?"checked":""}><span>เฉพาะข้อที่ยังไม่เคยทำใน Phase ${ph()}</span></label>
    <div class="dtrow">${v.src==="all"?`<label>จำนวนข้อ<input type="number" id="oqN" min="1" max="${pool.length||1}" value="${esc(Math.min(v.n,pool.length||v.n))}"></label>`:""}<label>เวลาต่อข้อ (นาที)<input type="number" id="oqPer" min="0.5" max="60" step="0.5" value="${esc(v.per)}"></label><label>พักระหว่างข้อ (วินาที · 0 = ไม่พัก)<input type="number" id="oqRest" min="0" max="600" step="5" value="${esc(v.rest)}"></label></div>
    <p class="statline" style="margin-top:8px">รอบนี้มี <b>${v.src==="all"?Math.min(v.n,pool.length):pool.length}</b> ข้อ${E?` · สอบจริงข้อละ ${E.min} นาที`:""}</p></div>`;
  h+=`<div class="stack"><button class="btn primary" id="oqGo" type="button" ${pool.length?"":"disabled"}>Start</button></div><p class="statline" style="margin-top:16px"><a href="#/${esc(ward)}/osh">📜 ประวัติ Legendary round / Quality round OSCE</a></p>${osInfoHTML()}</div>`;
  $("main").innerHTML=h;
  const upd=o=>{Object.assign(v,o);P.osQ=v;save();osQuality();};
  {const b=$("osResume");if(b)b.onclick=()=>go(ward+"/osx");}
  document.querySelectorAll("[data-oqm]").forEach(b=>b.onclick=()=>upd({mode:b.dataset.oqm}));
  document.querySelectorAll("[data-oqs]").forEach(b=>b.onclick=()=>upd({src:b.dataset.oqs}));
  document.querySelectorAll("[data-oqk]").forEach(b=>b.onclick=()=>{const k=b.dataset.oqk,a=v.sets.includes(k)?v.sets.filter(x=>x!==k):v.sets.concat(k);upd({sets:sets.filter(x=>a.includes(x))});});
  $("oqFresh").onchange=e=>upd({fresh:e.target.checked});
  [["oqN","n",1],["oqPer","per",0.5],["oqRest","rest",0]].forEach(([id,k,mn])=>{const e=$(id);if(e)e.onchange=()=>{const x=+e.value;if(x>=mn){v[k]=k==="per"?Math.round(x*2)/2:Math.round(x);P.osQ=v;save();if(k==="n")osQuality();}};});
  $("oqGo").onclick=async()=>{const per=+$("oqPer").value,rest=Math.round(+$("oqRest").value)||0,n=$("oqN")?Math.round(+$("oqN").value):pool.length;if(!(per>0)){toast("ใส่เวลาต่อข้อ");return;}
    if(cur&&!await uiAsk("มีชุดที่ทำค้างอยู่ — เริ่มชุดใหม่แทน? (ชุดเดิมจะถูกยกเลิก ไม่เก็บผล)"))return;
    Object.assign(v,{per:Math.round(per*2)/2,rest});P.osQ=v;
    const list=v.src==="all"?shuffle(pool).slice(0,Math.max(1,n)):pool,seq=[];list.forEach((q,i)=>{seq.push({k:"st",u:q.uid,topic:q.topic||""});if(rest>0&&i<list.length-1)seq.push({k:"rest"});});
    const run=osNewRun({kind:"quality",mode:v.mode,per:v.per*60,rest,order:"seq",topics:[],n:list.length,seq,start:0,label:v.src==="sets"&&v.sets.length?v.sets.join(", "):v.src==="sets"?"ทุกชุด":"สุ่มจากทั้งคลัง"});
    osGo(run);};}
/* ---- exam run (#/<ward>/osx) — Legendary and Quality ---- */
const osOrder=run=>run.seq.map((_,k)=>(run.start+k)%run.seq.length);
function osSlotNow(run){const O=osOrder(run);return run.pos<O.length?O[run.pos]:-1;}
function osRemain(run){return run.paused?run.left:run.left-(now()-run.at)/1000;}
let osBeepCtx=null;
function osBeep(n,hz){try{osBeepCtx=osBeepCtx||new (window.AudioContext||window.webkitAudioContext)();const c=osBeepCtx;for(let i=0;i<(n||1);i++){const o=c.createOscillator(),g=c.createGain();o.frequency.value=hz||880;o.connect(g);g.connect(c.destination);const t=c.currentTime+i*0.32;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.3,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+0.25);o.start(t);o.stop(t+0.27);}}catch(e){}
  try{if(navigator.vibrate)navigator.vibrate(n>1?[180,90,180]:200);}catch(e){}}
function osAdvance(run){const O=osOrder(run);run.pos++;if(run.pos>=O.length)return osFinish(run);const sl=run.seq[O[run.pos]];run.left=sl.k==="rest"?run.rest:run.per;run.at=now();run.warned=0;save();osBeep(2,sl.k==="rest"?660:880);osRunView();window.scrollTo(0,0);}
function osTick(){const run=osRunCur();if(!run||view!=="osx"){clearInterval(OST);OST=null;return;}const r=osRemain(run),el=$("osClock"),isRest=run.seq[osSlotNow(run)].k==="rest";
  if(el){el.textContent=osFmt(r);el.classList.toggle("low",r<=60&&!isRest);}
  if(!run.paused){if(r<=60&&!run.warned&&run.per>90&&!isRest){run.warned=1;osBeep(1,740);}
    if(r<=0)return osAdvance(run);
    if(!osTick.n||now()-osTick.n>4000){osTick.n=now();run.left=r;run.at=now();persist();}}}
document.addEventListener("visibilitychange",()=>{try{const run=osRunCur();if(!run||run.paused)return;if(document.visibilityState==="hidden"){run.left=osRemain(run);run.at=now();persist();}}catch(e){}});
function osRunView(){const run=osRunCur();if(!run)return go(ward+"/osl");if(!run.paused&&now()-run.at>8000)run.at=now();   /* page was closed: the clock waited */
  const ix=osSlotNow(run);if(ix<0)return osFinish(run);const sl=run.seq[ix],O=osOrder(run),N=run.seq.length;
  osImgLoad(run,()=>{if(view==="osx")osRunView();});
  const nx=run.pos+1<O.length?O[run.pos+1]:-1,nsl=nx>=0?run.seq[nx]:null,ty=osSlotType(run,sl),sim=run.mode==="sim";
  let h=`<div class="mqv osv osx"><div class="osbar"><div class="osnum"><small>ข้อ</small>${ix+1}<span class="osof">/${N}</span></div><div class="osmeta"><span class="tag">${OS_TI[ty]} ${OS_TT[ty]}</span><span class="hint">${osKindN(run.kind)} · ช่องที่ ${run.pos+1}/${N}${run.kind!=="quality"?` · เริ่มที่ข้อ ${run.start+1}`:""}${nsl?` · ถัดไป: ข้อ ${nx+1} ${nsl.k==="rest"?"☕ พัก":OS_TI[osSlotType(run,nsl)]}`:" · ข้อสุดท้าย"}</span></div><div class="osclock${run.paused?" paused":""}" id="osClock">${osFmt(osRemain(run))}</div></div>
    <div class="osctl"><button class="btn sm" type="button" id="osPause">${run.paused?"▶ เดินเวลาต่อ":"⏸ หยุดเวลา"}</button><button class="btn sm" type="button" id="osSkip">⏭ ไปข้อถัดไปเลย</button><button class="btn sm" type="button" id="osEnd">■ จบการสอบ</button></div>`;
  if(sl.k==="rest")h+=`<div class="osrest"><div class="big">☕</div><b>ข้อพัก</b><p>${nsl?`ข้อถัดไป: ข้อ ${nx+1} ${nsl.k==="rest"?"":OS_TT[osSlotType(run,nsl)]}`:"ข้อสุดท้ายแล้ว"}</p></div>`;
  else{const q=osSt(run,sl.u);if(!q)h+=`<div class="empty">ไม่พบโจทย์ข้อนี้</div>`;
    else{h+=`<section class="case"><div class="case-lab">ข้อ ${ix+1}</div><div class="stem">${q.stem}</div>${mqImgs(q.img,q.imgNote)}${osAiImgHTML(q,false)}</section><section class="part">`;
      q.subs.forEach(s=>{const i=s._i,t=((run.ans[ix]||{})[i])||"";h+=`<div class="subq"><div class="sh"><div class="sq">${osQ(s,ix,!sim)}</div><span class="mk">${mqMk(s)} คะแนน</span></div>${mqImgs(s.img,s.imgNote)}${sim?`<textarea class="ans" data-osa="${i}" rows="3" placeholder="${q.ex?"พิมพ์สิ่งที่จะถาม / ทำ / พูด":"พิมพ์คำตอบ"}">${esc(t)}</textarea>`:""}</div>`;});
      h+=`</section>`;
      if(!sim)h+=`<details class="card osproc"><summary><b>สำหรับผู้คุม</b> — บทผู้ป่วย และ checklist ให้ติ๊กระหว่างสอบ (ผู้สอบอย่าเปิด)</summary>${q.sp?`<div class="box ossp">${q.sp}</div>`:""}${q.subs.map(s=>osChkHTML(run,ix,q,s)).join("")}</details>`;}}
  h+=`</div>`;$("main").innerHTML=h;
  document.querySelectorAll("[data-osa]").forEach(el=>{const fit=()=>{el.style.height="auto";el.style.height=Math.max(84,el.scrollHeight+4)+"px";};fit();el.addEventListener("input",()=>{(run.ans[ix]=run.ans[ix]||{})[el.dataset.osa]=el.value;fit();persist();clearTimeout(osRunView.t);osRunView.t=setTimeout(save,1500);});});
  osBindChk(run,()=>{});
  $("osPause").onclick=()=>{if(run.paused){run.paused=false;run.at=now();}else{run.left=osRemain(run);run.paused=true;}save();osRunView();};
  $("osSkip").onclick=async()=>{if(!await uiAsk(sl.k==="rest"?"ข้ามข้อพักไปข้อถัดไปเลย?":"ไปข้อถัดไปเลย? (ข้อนี้กลับมาทำไม่ได้ เหมือนสอบจริง)"))return;osAdvance(run);};
  $("osEnd").onclick=async()=>{if(!await uiAsk("จบการสอบตอนนี้? ข้อที่ยังไม่ถึงจะนับเป็นไม่ได้ทำ"))return;osFinish(run);};
  clearInterval(OST);OST=setInterval(osTick,250);}
/* checklist block (IRL proctor during the exam, and the result page) */
function osChkHTML(rs,ix,q,s){const c=osTicks(rs,ix,s);if(!(s.points||[]).length)return `<div class="oschkq"><div class="oq">${osQ(s,ix)}</div><div class="hint">ข้อนี้ไม่มี checklist — ให้คะแนนเอง</div></div>`;
  return `<div class="oschkq"><div class="oq">${osQ(s,ix)} <span class="mk">${mqMk(s)} คะแนน</span></div>${s.key?`<div class="hint">เฉลยในไฟล์: ${s.key}</div>`:""}<ul class="pts">${s.points.map((p,j)=>{
    if(typeof p==="string")return `<li><label><input type="checkbox" data-osc="${ix}" data-ss="${s._i}" data-sp="${j}" ${c[j]===true?"checked":""}><span>${p}</span></label></li>`;
    const vv=Array.isArray(c[j])?c[j]:[],need=p.need||1;
    return `<li class="pgrp"><div class="pgl">${p.label?p.label+" ":""}<span class="alt">${need===1?"อย่างใดอย่างหนึ่ง":`ได้ ${need} อย่างจากนี้ = เต็ม`}</span></div><ul>${p.any.map((a,m)=>`<li><label><input type="checkbox" data-osc="${ix}" data-ss="${s._i}" data-sp="${j}" data-sk="${m}" ${vv[m]?"checked":""}><span>${a}</span></label></li>`).join("")}</ul></li>`;}).join("")}</ul></div>`;}
function osTicks(rs,ix,s){const T=(rs.tick||{})[ix]||{};return T[s._i]||[];}
function osBindChk(rs,after){document.querySelectorAll("[data-osc]").forEach(el=>el.onchange=()=>{const x=+el.dataset.osc,i=+el.dataset.ss,j=+el.dataset.sp;rs.tick=rs.tick||{};rs.ut=rs.ut||{};
  const T=rs.tick[x]=rs.tick[x]||{},c=T[i]=T[i]||[];if(el.dataset.sk!==undefined){const m=+el.dataset.sk;if(!Array.isArray(c[j]))c[j]=[];c[j][m]=el.checked;}else c[j]=el.checked;(rs.ut[x]=rs.ut[x]||{})[i]=1;save();after();});}
/* ---- finish + scoring ---- */
function osFinish(run){clearInterval(OST);OST=null;const P=P_();
  const res=Object.assign({},run,{stage:"done",end:now()});delete res.left;delete res.at;delete res.paused;delete res.warned;delete res.imgOpen;
  /* SIM: tick the checklist from keywords in what was typed (no AI, unlimited) — editable on the result page */
  if(run.mode==="sim")res.seq.forEach((sl,ix)=>{if(sl.k!=="st")return;const q=osSt(res,sl.u),A=(res.ans||{})[ix]||{};if(!q)return;q.subs.forEach(s=>{const t=(A[s._i]||"").trim();if(!t||!s.kw||!(s.points||[]).length)return;((res.tick[ix]=res.tick[ix]||{}))[s._i]=mqKwTicks(s,t);});});
  res.reached=Math.min(run.pos+1,run.seq.length);osToProg(res);
  P.osHist=(P.osHist||[]).concat(res).slice(-40);P.osSel=res.id;P.osRun=null;save();osBeep(3,990);go(ward+"/osr");}
/* old-exam stations answered here count as done (like MCQ answers from any round): copied into the OSCE progress only when that station has no answer there yet */
function osToProg(rs){const A=osA(),O=osOrder(rs);rs.seq.forEach((sl,ix)=>{if(sl.k!=="st"||!sl.u||rs.gen[sl.u]||O.indexOf(ix)>=(rs.reached||O.length))return;const q=osSt(rs,sl.u);if(!q||(A[q.uid]&&A[q.uid].sub))return;
  const x={t:{},g:{},gm:{},c:{},cs:{},ps:1,sd:{},sub:1,at:now(),ts:now(),time:rs.per,from:rs.kind};q.subs.forEach(s=>{const i=s._i,t=(((rs.ans||{})[ix]||{})[i]||"");if(t)x.t[i]=t;const c=osTicks(rs,ix,s);if(c.length){x.c[i]=c;x.cs[i]=mqSig(s);}const f=osSubFrac(rs,ix,s);if(f!==null&&(t||c.length))x.g[i]=f>=1?2:f>0?1:0;});
  A[q.uid]=x;});}
function osSubFrac(rs,ix,s){const i=s._i,gm=((rs.gm||{})[ix]||{})[i];if(gm!==undefined&&gm!==null)return gm/2;
  const ut=((rs.ut||{})[ix]||{})[i],ai=((rs.ai||{})[ix]||{})[i];if(!ut&&ai&&ai.grade!=null)return ai.grade/2;
  const c=osTicks(rs,ix,s);if(!(s.points||[]).length)return null;const sc=mqPtsScore(s,c);return sc.tot?sc.got/sc.tot:0;}
function osStScore(rs,ix){const q=osSt(rs,rs.seq[ix].u);if(!q)return null;let tot=0,got=0;q.subs.forEach(s=>{const m=mqMk(s),f=osSubFrac(rs,ix,s);tot+=m;got+=m*(f||0);});return {tot,got,pct:tot?got/tot*100:0};}
function osTotal(rs){const S=rs.seq.map((sl,ix)=>sl.k==="st"?{ix,sc:osStScore(rs,ix),q:osSt(rs,sl.u)}:null).filter(x=>x&&x.sc);
  const pct=S.length?S.reduce((a,x)=>a+x.sc.pct,0)/S.length:0,pass=S.filter(x=>x.sc.pct>=60).length,byT={};
  S.forEach(x=>{const k=(x.q&&x.q.topic)||"";(byT[k]=byT[k]||[]).push(x.sc.pct);});return {S,pct,pass,byT};}
const osGrade=p=>(GRADES.find(([m])=>p>=m)||[0,"F"])[1];
/* ---- result page (#/<ward>/osr) ---- */
function osResView(){const P=P_(),rs=osLastRes();if(!rs)return go(ward+"/osl");const TT=osTotal(rs),g=osGrade(TT.pct),O=osOrder(rs),Q=rs.kind==="quality";
  osImgLoad(rs,()=>{if(view==="osr")osResView();});
  let h=`<div class="mqv osv"><div class="whead"><h1 class="h2">ผล ${osKindN(rs.kind)} · OSCE</h1><a href="#/${esc(ward)}">กลับหน้าวอร์ด</a></div>
    <p class="sub" style="margin:0 0 10px">${fmtDT(rs.ts)} · <b>${rs.mode==="irl"?"IRL":"SIM"}</b> · ${TT.S.length} ข้อ · ข้อละ ${osFmt(rs.per)} นาที · ${Q?esc(rs.label||""):rs.order==="custom"?"ออกแบบเอง":rs.order==="block"?"แยกกลุ่ม":"สุ่มปนกัน"}${Q?"":` · เริ่มที่ข้อ ${rs.start+1}`}${rs.nAI?` · โจทย์ AI ${rs.nAI} ข้อ`:""}</p>
    <div class="osgrade"><span class="g">${g}</span><span class="p">${TT.pct.toFixed(1)}%</span><span class="hint">ผ่าน (≥ 60%) <b>${TT.pass}/${TT.S.length}</b> ข้อ</span></div>`;
  if(rs.mode==="irl"){const un=TT.S.filter(x=>{const q=x.q;return q&&!q.subs.some(s=>((rs.ut||{})[x.ix]||{})[s._i]||((rs.gm||{})[x.ix]||{})[s._i]!=null);}).length;if(un)h+=`<p class="hint">IRL: ยังไม่ได้ติ๊ก checklist ${un} ข้อ — ข้อที่ไม่ติ๊กนับ 0 คะแนน ติ๊กย้อนหลังด้านล่างได้</p>`;}
  else h+=`<p class="hint">SIM: เว็บติ๊ก checklist ให้จากคำสำคัญในคำตอบ (คร่าว ๆ) — ตรวจและแก้ติ๊กเอง หรือกดให้คะแนนเองได้ทุกข้อย่อย${mqAiAvail()?" · ให้ AI ตรวจได้ทีละข้อ":""}</p>`;
  h+=`<div class="card"><h3>คะแนนตามหัวข้อ</h3><table class="ostab"><tbody>${Object.entries(TT.byT).map(([k,a])=>{const p=a.reduce((x,y)=>x+y,0)/a.length;return `<tr><td>${esc(osTN(k))}</td><td>${a.length} ข้อ</td><td style="color:${mqPct(Math.round(p))}"><b>${p.toFixed(0)}%</b></td></tr>`;}).join("")}</tbody></table></div>`;
  h+=`<div class="tl-h">ทุกข้อ (เรียงตามเลขข้อ)</div><div class="osres">`;
  rs.seq.forEach((sl,ix)=>{if(sl.k==="rest"){h+=`<div class="osslot rest"><span class="on">${ix+1}</span><span class="oi">☕</span><span class="ot">ข้อพัก</span></div>`;return;}
    const q=osSt(rs,sl.u),sc=osStScore(rs,ix),reached=O.indexOf(ix)<(rs.reached||O.length);if(!q)return;
    h+=`<details class="osr"${P.osOpen===ix?" open":""} data-osr="${ix}"><summary><span class="on">${ix+1}</span><span class="oi">${OS_TI[osSlotType(rs,sl)]}</span><span class="ot">${esc(osTN(q.topic))} · ${esc(q.title||"")}${q.ai?' <span class="tag">AI</span>':""}${reached?"":' <span class="tag warn">ไม่ได้ทำ</span>'}</span><b class="osp" style="color:${mqPct(Math.round(sc.pct))}">${sc.pct.toFixed(0)}%</b></summary><div class="osrb">`;
    h+=myNoteTop(q);   /* 📝 my note above the station (result page = answers revealed) */
    h+=`<div class="stem">${q.stem}</div>${mqImgs(q.img,q.imgNote)}${osAiImgHTML(q,true)}`;
    q.subs.forEach(s=>{const i=s._i,t=(((rs.ans||{})[ix]||{})[i]||"").trim(),f=osSubFrac(rs,ix,s),gm=((rs.gm||{})[ix]||{})[i],ai=((rs.ai||{})[ix]||{})[i];
      h+=`<div class="subq"><div class="sh"><div class="sq">${osQ(s,ix)}</div><span class="mk">${f===null?"–":+(mqMk(s)*f).toFixed(1)}/${mqMk(s)}</span></div>`;
      if(rs.mode==="sim")h+=`<div class="mmine-lab">คำตอบของฉัน</div><div class="osmine">${t?mqNl(t):'<span class="muted">— ไม่ได้พิมพ์ —</span>'}</div>`;
      if(ai)h+=`<div class="aibox sblk"><b>🤖 AI:</b> ${mqNl(ai.assess||"")}${ai.missing?`<div class="aimiss"><b>ขาด:</b> ${mqNl(ai.missing)}</div>`:""}</div>`;
      h+=`<div class="model"><span class="lab">เฉลย</span><div class="a">${s.ans||""}</div>${s.exp?`<div class="mexp">${mqRich(s.exp)}</div>`:""}</div>`;
      h+=osChkHTML(rs,ix,q,s);
      if(s.rubric)h+=`<div class="rubric"><b>เกณฑ์:</b> ${s.rubric}</div>`;if(s.flag)h+=`<div class="sub-meta"><span class="tag warn">${esc(s.flag)}</span></div>`;
      h+=`<div class="grade"><span class="gl">ให้คะแนนเอง (ทับ checklist):</span>${[[2,"✓ ได้"],[1,"◐ บางส่วน"],[0,"✗ ไม่ได้"]].map(([x,tx])=>`<button class="mgbtn g${x}" data-osg="${ix}" data-ss="${i}" data-g="${x}" aria-pressed="${gm===x}">${tx}</button>`).join("")}</div></div>`;});
    if(q.sp)h+=`<div class="sec notes"><h3>บทผู้ป่วยจำลอง / ผลตรวจ</h3><div class="box">${q.sp}</div></div>`;
    if(q.interp)h+=`<div class="sec"><h3>ประเด็นของข้อนี้</h3><p>${q.interp}</p></div>`;
    if((q.summary||[]).length)h+=`<div class="sec"><h3>สรุป</h3><ul>${q.summary.map(x=>`<li>${x}</li>`).join("")}</ul></div>`;
    if(q.opinion)h+=`<div class="sec opinion"><h3>ความเห็นของผม</h3><div class="box">${q.opinion}</div></div>`;
    if(q.flag)h+=`<div class="sub-meta"><span class="tag warn">${esc(q.flag)}</span></div>`;
    h+=myNoteSec(q);
    h+=`<div class="row2">${!q.ai?`<button class="link" type="button" data-osgo="${esc(q.uid)}">เปิดข้อนี้ใน Service round ↗</button>`:""}${rs.mode==="sim"&&mqAiAvail()&&q.subs.some(s=>(((rs.ans||{})[ix]||{})[s._i]||"").trim())?(OSAI.busy===ix+1?`<span class="hint">⏳ AI กำลังตรวจ…</span>`:`<button class="link ailink" type="button" data-osai="${ix}">🤖 ให้ AI ตรวจข้อนี้</button>`):""}</div></div></details>`;});
  h+=`</div><div class="stack"><a class="btn primary" href="#/${esc(ward)}/${Q?"osq":"osl"}">ทำใหม่</a><a class="btn" href="#/${esc(ward)}/osh">ประวัติทั้งหมด</a></div></div>`;
  $("main").innerHTML=h;
  const re=()=>{const y=scrollY;osResView();scrollTo(0,y);};
  document.querySelectorAll("details.osr").forEach(d=>d.addEventListener("toggle",()=>{if(d.open)P.osOpen=+d.dataset.osr;}));
  mountNotes(document);document.querySelectorAll("details.osr").forEach(d=>d.addEventListener("toggle",()=>{if(d.open)mountNotes(d);}));
  osBindChk(rs,re);
  document.querySelectorAll("[data-osg]").forEach(b=>b.onclick=()=>{const ix=+b.dataset.osg,i=+b.dataset.ss,x=+b.dataset.g;rs.gm=rs.gm||{};const G=rs.gm[ix]=rs.gm[ix]||{};if(G[i]===x)delete G[i];else G[i]=x;P.osOpen=ix;save();re();});
  document.querySelectorAll("[data-osgo]").forEach(b=>b.onclick=()=>{P_().type="OSCE";mqVset({r:"service",set:"all",style:"all",status:"all"});save();mqOpen(b.dataset.osgo,undefined,"service");});
  document.querySelectorAll("[data-osai]").forEach(b=>b.onclick=()=>osAiGrade(rs,+b.dataset.osai));}
async function osAiGrade(rs,ix){const q=osSt(rs,rs.seq[ix].u);if(!q||OSAI.busy)return;const A=(rs.ans||{})[ix]||{},subs=q.subs.filter(s=>(A[s._i]||"").trim());if(!subs.length)return;
  OSAI.busy=ix+1;P_().osOpen=ix;osResView();
  try{const out=await aiJSON(mqAiPrompt(q,0,subs,{t:A}),3000),arr=Array.isArray(out)?out:(out&&Array.isArray(out.results)?out.results:[]);rs.ai=rs.ai||{};const X=rs.ai[ix]=rs.ai[ix]||{};
    arr.forEach((o,j)=>{const id=subs.some(s=>s._i===+o.id)?+o.id:(subs[j]||{})._i;if(id===undefined)return;const LV={"ได้":2,"บางส่วน":1,"ไม่ได้":0};let g=LV[String(o.level||"").trim()];if(g===undefined){g=Math.round(+o.grade);if(!(g===0||g===1||g===2))g=null;}
      X[id]={grade:g,assess:String(o.assess||"").slice(0,1500),missing:g===2?"":String(o.missing||"").slice(0,800)};if(rs.ut&&rs.ut[ix])delete rs.ut[ix][id];});save();}
  catch(e){toast((typeof admMsg==="function"&&admMsg(e))||"AI ตรวจไม่สำเร็จ");}
  finally{OSAI.busy=0;const y=scrollY;osResView();scrollTo(0,y);}}
/* ---- history (#/<ward>/osh) ---- */
function osHistView(){const P=P_(),H=(P.osHist||[]).slice().reverse();
  let h=`<div class="mqv osv"><div class="whead"><h1 class="h2">ประวัติ Legendary round / Quality round · OSCE</h1><a href="#/${esc(ward)}">กลับหน้าวอร์ด</a></div>`;
  if(!H.length)h+=`<div class="empty">ยังไม่เคยทำ Legendary round หรือ Quality round OSCE ในวอร์ดนี้</div>`;
  else{const L=H.filter(r=>(r.kind||"legend")==="legend"),ps=L.map(r=>osTotal(r).pct);if(ps.length)h+=`<p class="statline">Legendary round <b>${ps.length}</b> ครั้ง · เฉลี่ย <b>${(ps.reduce((a,b)=>a+b,0)/ps.length).toFixed(1)}%</b> · ดีสุด <b>${Math.max(...ps).toFixed(1)}%</b> · ล่าสุด <b>${ps[0].toFixed(1)}%</b></p>`;
    h+=`<div class="trows">`+H.map((r,k)=>{const T=osTotal(r);return `<div class="crow"><button class="cn" type="button" data-osh="${esc(r.id)}"><span class="cl">ครั้ง</span>${H.length-k}</button><div style="min-width:0"><div class="cq">${osKindN(r.kind)} · ${fmtDT(r.ts)} · ${r.mode==="irl"?"IRL":"SIM"} · ${T.S.length} ข้อ</div><div class="hint">เกรด <b>${osGrade(T.pct)}</b> · ${T.pct.toFixed(1)}% · ผ่าน ${T.pass}/${T.S.length} ข้อ${r.label?" · "+esc(r.label):""}</div></div><div class="cmeta"><button class="link" type="button" data-oshdel="${esc(r.id)}">ลบ</button></div></div>`;}).join("")+`</div>`;}
  h+=`</div>`;$("main").innerHTML=h;
  document.querySelectorAll("[data-osh]").forEach(b=>b.onclick=()=>{P.osSel=b.dataset.osh;save();go(ward+"/osr");});
  document.querySelectorAll("[data-oshdel]").forEach(b=>b.onclick=async()=>{if(!await uiAsk("ลบผลครั้งนี้?"))return;P.osHist=P.osHist.filter(x=>x.id!==b.dataset.oshdel);P.osDel=Object.assign(P.osDel||{},{[b.dataset.oshdel]:now()});save();osHistView();});}
/* ---- sync between devices (called from mergeSt) ---- */
function osMerge(l,r){const del=Object.assign({},l.osDel||{},r.osDel||{});l.osDel=del;const m=new Map();(l.osHist||[]).concat(r.osHist||[]).forEach(x=>{if(!x||del[x.id])return;const a=m.get(x.id);if(!a||(x.end||0)>=(a.end||0))m.set(x.id,x);});
  l.osHist=[...m.values()].sort((a,b)=>a.ts-b.ts).slice(-40);
  if(r.osRun&&(!l.osRun||(r.osRun.ts||0)>(l.osRun.ts||0)))l.osRun=r.osRun;if(l.osRun&&l.osHist.some(x=>x.id===l.osRun.id))l.osRun=null;
  if(r.osSet&&!l.osSet)l.osSet=r.osSet;if(r.osQ&&!l.osQ)l.osQ=r.osQ;}
/* ward home top of the OSCE tab */
function osHomeTop(L){const E=osExamCfg(),T=osTopics(),cur=osRunCur();
  let h=`<p class="hint" style="margin:6px 0 10px">${E?`สอบจริง <b>${E.n} ข้อ ข้อละ ${E.min} นาที</b> (<a href="#/${esc(ward)}/dates">แก้</a>)`:`ยังไม่ได้ตั้งจำนวนข้อ/เวลาสอบจริง (<a href="#/${esc(ward)}/dates">ตั้งที่หน้า Admit · ICU · Discharge</a>)`}${T.length?` · หัวข้อ: ${T.map(t=>esc(t.name)).join(", ")}`:""}</p>`;
  if(cur)h+=`<button class="resume" id="osHomeRes"><span>กำลังทำ <b>${osKindN(cur.kind)} OSCE</b><span class="rd">ช่องที่ ${(cur.pos||0)+1}/${cur.seq.length} — กดเพื่อทำต่อ</span></span><span class="go">→</span></button>`;
  return h;}
/* test hook for tools/smoke_site.py-style checks: read the running paper and fast-forward the clock */
window.__os={cur:()=>osRunCur(),ff:s=>{const r=osRunCur();if(r){r.left=s;r.at=now();r.paused=false;}},finish:()=>{const r=osRunCur();if(r)osFinish(r);}};
