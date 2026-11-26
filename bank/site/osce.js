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
/* หัวข้อเล็ก OSCE (ผู้ใช้สั่ง 3 พ.ย. 2026 ทุกเว็บรวมโพยหมอ): เรื่องเดียวกันออกได้ไม่เกิน 2 ข้อต่อชุด เช่น PBS, CXR — ต่างโรคกันก็ยังนับเรื่องเดียวกัน
   ใช้ q.sub ถ้ามี ไม่มีให้เดาจากชื่อข้อ แล้วค่อยโจทย์ + recall · เดาไม่ได้ = "" (ไม่นับลิมิต) */
/* เว็บที่ตั้ง config osceSubLim:0 = ยังไม่จำกัด (SI — ผู้ใช้สั่ง 3 พ.ย. 2026: จำนวนข้อเยอะ ยังไงก็ต้องซ้ำ) */
const OS_SUBLIM=(typeof CONFIG!=="undefined"&&CONFIG&&CONFIG.osceSubLim===0)?1e6:2,OS_SUBON=OS_SUBLIM<1e6;
const OS_SUBT={
 micro:[["PBS",/blood smear|peripheral smear|\bpbs\b|blood film|สเมียร์เลือด/i],["Malaria",/malaria|plasmodium|มาลาเรีย/i],["UA",/urin|\bua\b|sediment|ปัสสาวะ/i],["AFB",/\bafb\b|acid.?fast|modified acid/i],["KOH",/\bkoh\b|wet smear|tzanck/i],["Gram stain",/gram|csf stain/i],["Stool exam",/stool|อุจจาระ/i]],
 img:[["CXR",/\bcxr\b|chest.?(x|film|radio)|ฟิล์มปอด/i],["CT brain",/ct (brain|head)|brain ct/i],["Thyroid scan",/thyroid (scan|raiu)|raiu|sestamibi|nuclear/i],["Acute abdomen film",/acute abdomen|abdominal (series|film)|plain abd|\bkub\b/i],["Bone/joint film",/film.*(hand|knee|hip|spine|joint)|(hand|knee|hip|spine|joint|bone).*film|x-?ray of the (hand|knee|hip|spine)|ฟิล์มมือ/i],["Skull film",/skull/i]],
 lab:[["ABG",/\babg\b|acid.?base|blood gas/i],["Electrolyte",/hypokal|hyperkal|hyponat|ttkg|electrolyte|anion gap/i],["Hb typing",/thalass|hb typing|hemoglobin typing/i],["Viral hepatitis serology",/hepatitis serolog|anti-?hb|hbsag|anti-?hcv/i],["LFT",/\blft\b|liver (panel|enzyme|function)/i],["Pancreatic enzyme",/amylase|lipase|pancrea/i],["Ascites",/ascit/i],["Pleural fluid",/pleural/i],["CSF",/\bcsf\b/i],["Synovial fluid",/synovial/i],["Thyroid function",/thyroid|\btsh\b|ft4/i],["Coagulation",/coagul|\bpt\b.*aptt|aptt/i],["Urine/Hemolysis",/red.?(brown )?urine|red urine|hemolysis/i],["CBC",/\bcbc\b/i],["Iron study",/ferritin|iron stud|\btibc\b/i],["Autoimmune serology",/\bana\b|anti-?dsdna|autoimmune/i],["Glucose/HbA1c",/hba1c|glucose|\bdka\b/i],["Fetal test",/biophysical|\bnst\b/i]],
 ekg:[["STEMI/ischemia",/stemi|infarct|ischemi|st elevation|chest (pain|tight)|แน่นหน้าอก/i],["Bradyarrhythmia/AV block",/heart block|av block|av dissociation|bradycard|without a fixed relation/i],["Electrolyte EKG",/hyperkal|hypokal|\bckd\b|peaked t/i],["Tachyarrhythmia",/atrial (fib|flut)|\baf\b|\bsvt\b|\bvt\b|tachycard|palpitat|ใจสั่น/i]],
 skin:[["Fungal skin",/\bkoh\b|tinea|fungal|dermatophyt|versicolor|candid/i],["Papulosquamous",/psoria|nail|pityriasis|oval scaly|lichen/i],["Herpes/Zoster",/zoster|herpes|dermatome|burning (red |facial )?rash/i],["Infectious exanthem",/sore throat.*rash|measles|rubella|syphilis|multiple sexual|oral lesion/i],["Drug eruption",/drug|stevens|\bsjs\b|\bdress\b/i],["Bullous",/bullous|pemphi/i],["Eczema",/eczema|dermatitis/i],["Skin infection",/cellulit|impetigo|abscess|leprosy/i]],
 pefind:[["Oropharynx",/oropharyn|throat|tonsil/i],["Eye/Thyroid sign",/exophthal|proptosis|lid|ตาโปน|eye/i],["Hand/Nail",/hand|nail|clubbing|finger/i],["Neck/Face",/neck|face|facial/i],["Abdomen sign",/abdom|caput|ascit/i],["Leg/Foot",/leg|foot|ankle/i]],
 hx:[["Jaundice",/jaundice|เหลือง/i],["Hematuria",/hematuria|ฉี่แดง|ปัสสาวะเป็นเลือด|ปัสสาวะแดง/i],["Anemia",/anemi|pallor|pale|fatigue|ซีด|easy bruis|gum bleed/i],["GI bleeding",/hematochez|hematemesis|melena|blood per rectum|gi bleed/i],["Abdominal pain",/abdominal pain|epigastric|ปวดท้อง/i],["Syncope",/syncope|loss of consciousness|\bloc\b|หมดสติ/i],["Chest pain",/chest pain|เจ็บหน้าอก/i],["Dyspnea",/dyspnea|เหนื่อย/i],["Hemoptysis",/hemoptysis/i],["Chronic cough",/cough|ไอ/i],["Fever",/fever|ไข้/i],["Joint pain",/knee|joint|arthr|ปวดเข่า|ปวดข้อ/i],["Polyuria",/polyuria|polydipsia/i],["Weakness/Numbness",/weakness|numb|hemipar|อ่อนแรง/i],["Edema",/edema|บวม/i],["Headache",/headache|ปวดหัว/i],["Diarrhea",/diarrhea|ท้องเสีย/i],["Weight loss",/weight loss|น้ำหนักลด/i]],
 pe:[["Thyroid",/thyroid|hyperthyroid|palpitation, increased appetite/i],["Chronic liver sign",/chronic liver|cirrhosis|chronic hepatitis|alcohol|เหล้า/i],["Abdomen",/abdom|ascit|ท้อง/i],["Neuro",/cerebell|neuro|hemipar|motor|sensory|monofilament/i],["Eye/Visual",/visual|cannot see|eye|fundoscop|ตา/i],["Chest",/lung|chest|wheez|ปอด/i],["Precordium",/precord|heart|murmur|\bcvs\b|หัวใจ/i],["Pulse/BP",/hypertension in the young|pulse|blood pressure|\bbp\b|cuff/i],["Joint",/knee|joint|ankle|ข้อ/i],["Leg swelling",/leg swelling|edema/i]],
 proc:[["Blood transfusion",/transfus|ให้เลือด/i],["ABG",/\babg\b|arterial/i],["BLS/CPR",/\bbls\b|\bcpr\b/i],["Oxygen",/oxygen|\bfio2\b|\bo2\b/i],["NG tube",/\bng\b|nasogastric/i],["Foley",/foley|urinary cathet/i],["Blood culture",/blood culture|hemoculture/i],["Venipuncture",/venipuncture|เจาะเลือด/i],["BP measurement",/blood pressure/i]],
 advice:[["BP measurement",/blood pressure/i],["Weight reduction",/weight|snor|sleep apn/i],["Diabetes",/diabet/i],["Osteoarthritis",/osteoarthr/i]]
};
function osSubOf(q){if(!q)return "";if(q.sub)return q.sub;if(q._sub!==undefined)return q._sub;const T=OS_SUBT[q.topic]||[],tx=s=>String(s||"").replace(/<[^>]+>/g," ");let r="";
  for(const src of [q.title,tx(q.stem)+" "+tx(q.gray)]){const e=T.find(x=>x[1].test(src));if(e){r=e[0];break;}}
  if(!r&&q.topic==="ekg"){const a=(q.parts||[]).flatMap(p=>p.subs||[]).map(s=>tx(s.ans)).join(" ");const e=T.find(x=>x[1].test(a));r=e?e[0]:"Other EKG";}
  return q._sub=r;}
const osSubKey=(topic,sub)=>sub?(topic||"")+"|"+sub:"";
/* sub-question text renumbered to the exam number (old exam "21.1 …" → "30.1 …"); IRL drops "(type …)" hints */
const osQ=(s,ix,irl)=>{let t=String(s.q||"").replace(/^\s*\d+(\.\d+)?\.?\s*/,"");if(irl)t=t.replace(/\s*\((type|พิมพ์)[^)]*\)/i,"");return `${ix+1}.${s._k+1} ${t}`;};
const osFmt=sec=>{sec=Math.max(0,Math.ceil(sec));return Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0");};
/* station lookup: old-exam station (W.OS) or an AI station kept inside the run */
function osNorm(q){if(q._n)return q;q._n=1;if(!Array.isArray(q.parts)||!q.parts.length)q.parts=[{subs:q.subs||[]}];q.subs=[];
  q.parts.forEach((p,pi)=>{p.i=pi;p.subs=p.subs||[];p.subs.forEach((s,k)=>{s._p=pi;s._k=k;s._i=q.subs.length;if(!(s.tags||[]).length&&q.topic)s.tags=[q.topic];q.subs.push(s);});});return q;}
function osSt(run,u){if(!u)return null;if(run.gen&&run.gen[u]){const g=osNorm(run.gen[u]);if(!g.uid)g.uid=u;return g;}
  if(/^OSU\|/.test(u))return osUnitAll().find(q=>q.uid===u)||null;   /* Unit round stations and the viewer's Specialty stations (file group of Legendary, 22 Nov 2026) */
  return mqL(ward,"OSCE").find(q=>q.uid===u)||osSpcQ(u)||null;}
const osSlotType=(run,sl)=>{if(sl.k==="rest")return "rest";const q=osSt(run,sl.u);const t=q?{ex:!!q.ex,proc:!!q.proc}:osTopicEx(sl.topic);return t.proc?"proc":t.ex?"ex":"noex";};
const OS_TI={noex:"📝",ex:"👨‍⚕️",proc:"🩺",rest:"☕"},OS_TT={noex:"ไม่มีอาจารย์",ex:"มีอาจารย์",proc:"หัตถการ (มีอาจารย์ ไม่มีข้อพักตามหลัง)",rest:"ข้อพัก"};
const osA=()=>mqInitP(P_(),"OSCE")["a"+ph()];
const osDone=q=>{const r=osA()[q.uid];return !!(r&&r.sub);};
/* ---- pictures for AI stations: the user inserts them (kept in this browser only, IndexedDB "os-img") ---- */
const OSIMG={};   /* uid → dataURL | false (looked up, none) */
function osIDB(){return new Promise((res,rej)=>{try{const r=indexedDB.open("os-img",1);r.onupgradeneeded=()=>r.result.createObjectStore("img");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});}
async function osImgPut(k,v){const db=await osIDB();return new Promise((res,rej)=>{const t=db.transaction("img","readwrite"),s=t.objectStore("img");if(v==null)s.delete(k);else s.put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error);});}
async function osImgGet(k){const db=await osIDB();return new Promise(res=>{const t=db.transaction("img").objectStore("img").get(k);t.onsuccess=()=>res(t.result||null);t.onerror=()=>res(null);});}
async function osImgLoad(run,again){const U=[...new Set(Object.keys((run&&run.gen)||{}).concat(((run&&run.seq)||[]).filter(s=>s.k==="st"&&s.u&&!(run.gen||{})[s.u]).map(s=>s.u).filter(u=>osNeedsImg(osSt(run,u)))))].filter(u=>OSIMG[u]===undefined);if(!U.length)return;for(const u of U){try{OSIMG[u]=(await osImgGet(u))||false;}catch(e){OSIMG[u]=false;}}if(again)again();}
function osShrink(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=()=>rej(fr.error);fr.onload=()=>{const im=new Image();im.onerror=()=>rej(new Error("img"));im.onload=()=>{const m=1400,k=Math.min(1,m/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",0.85));};im.src=fr.result;};fr.readAsDataURL(file);});}
/* 22 Nov 2026 (user, ทวทว): every OSCE station that has no picture of its own — AI / Unit / Specialty / Morning / old stations whose file had no picture —
   can take a picture the user finds himself (🔎 ค้นรูป → ใส่รูป, kept in this browser only, IndexedDB "os-img", key = station uid) */
const osHasPic=q=>[].concat((q&&q.img)||[]).some(k=>IMGS[k]);
const osNeedsImg=q=>!!(q&&!osHasPic(q)&&(q.imgNeed||q.imgAlt||q.imgNote));
function osPicQ(q){const t=x=>plain(String(x||"")).trim(),n=t(q.imgNote);return t(q.imgNeed)||(n&&!/ไม่มีรูป/.test(n)?n:"")||t(q.imgAlt)||t(q.title);}
/* picture block of a station: the real picture(s) if any · else the picture the user put in · else the written description of the picture (imgAlt — shown whenever there is no picture, also on old stations whose file had none, user 26 Nov 2026) · else the "no picture" note + (outside the timed exam) tools to add one */
function osPicBlock(q,lock){const real=mqImgs(q.img,q.imgNote);if(!osNeedsImg(q))return real;const d=OSIMG[q.uid];
  let h=d?`<div class="stem-img"><img src="${d}" alt="รูปที่ใส่เอง"><div class="img-note">🖼 รูปที่ใส่เอง — เก็บในเครื่องนี้เท่านั้น</div></div>`:(q.imgAlt&&!String(q.stem||"").includes(q.imgAlt)?`<div class="img-missing">🖼 ${/ไม่มีรูปในไฟล์/.test(q.imgNote||"")?"ไม่มีรูปในไฟล์":"ยังไม่มีรูป"} — คำบรรยายแทนรูป: ${q.imgAlt}</div>`:q.imgNote?real:`<div class="img-missing">🖼 ยังไม่มีรูปในข้อนี้</div>`);
  if(!lock)h+=`<details class="ospic"><summary>${d?"🖼 เปลี่ยน / ลบรูปที่ใส่เอง":"🖼 ใส่รูปเอง"}</summary><p class="hint" style="margin:4px 0 6px">กด “ค้นรูป” แล้วบันทึกรูปลงเครื่อง จากนั้นกด “ใส่รูป” · รูปเก็บในเบราว์เซอร์นี้เท่านั้น (ใช้ได้ทุก round ที่สถานีนี้ออก) · คำค้นอาจบอกคำตอบ</p><div class="row2"><a class="btn sm" target="_blank" rel="noopener" href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(osPicQ(q))}">🔎 ค้นรูป ↗</a><label class="btn sm osup">${d?"เปลี่ยนรูป":"ใส่รูป"}<input type="file" accept="image/*" data-osimg="${esc(q.uid)}" hidden></label>${d?`<button class="link" type="button" data-osimgdel="${esc(q.uid)}">ลบรูป</button>`:""}</div></details>`;
  return h;}
/* load the user's picture of q (once) and wire the add / remove buttons · re = redraw the page */
function osPicWire(q,re){if(!osNeedsImg(q))return;
  if(OSIMG[q.uid]===undefined){OSIMG[q.uid]=false;osImgGet(q.uid).then(d=>{if(d){OSIMG[q.uid]=d;re();}}).catch(()=>{});}
  document.querySelectorAll("[data-osimg]").forEach(el=>el.onchange=async()=>{const f=el.files&&el.files[0];if(!f)return;try{const d=await osShrink(f);await osImgPut(el.dataset.osimg,d);OSIMG[el.dataset.osimg]=d;re();toast("ใส่รูปแล้ว");}catch(e){toast("ใส่รูปไม่สำเร็จ — ลองไฟล์ JPG/PNG อื่น");}});
  document.querySelectorAll("[data-osimgdel]").forEach(b=>b.onclick=async()=>{if(!await uiAsk("ลบรูปที่ใส่เองของข้อนี้?"))return;try{await osImgPut(b.dataset.osimgdel,null);}catch(e){}OSIMG[b.dataset.osimgdel]=false;re();});}
/* the website has no AI of its own: AI stations need the Claude version of this site (or the viewer's own API key) */
const osAiOK=()=>HAS_CLAUDE()||!!aiCfg().key;
function osAiBtns(rt){if(osAiOK())return "";const u=typeof artLink==="function"&&artLink(ward+(rt||"/osl"));
  return `<div class="osaibtn"><p class="rd">เว็บนี้ยังไม่ได้เชื่อม AI — เลือกอย่างใดอย่างหนึ่ง:</p><div class="row2">${u?`<a class="btn primary" href="${esc(u)}" target="_blank" rel="noopener">เปิด ${rt?"Specialty":"Legendary"} OSCE ใน Claude ↗</a>`:""}<a class="btn" href="#/${esc(ward)}/adm">ใส่ API key (หน้า Admission round)</a></div><p class="hint" style="margin:6px 0 0">ใน Claude: ถ้าขึ้นหน้า "จะไปหน้าไหน?" ให้กด <b>Legendary round · OSCE</b> · ผลสอบที่ทำใน Claude เก็บในบัญชี Claude (แยกจากเว็บ)</p></div>`;}
/* ---- building the paper ---- */
/* หัวข้อใหญ่ (ผู้ใช้สั่ง 3 พ.ย. 2026): สุ่มกระจายให้ — ทุกอย่างมาจากการสุ่ม แล้วจัดสัดส่วนให้ไม่เยอะ/น้อยเกินไป · ถ้าจำนวนข้อพอให้ออกครบทุกหัวข้อ · ถ้าไม่พอ 1–2 หัวข้อไม่ออกก็ได้
   น้ำหนัก = ครึ่งหนึ่งจากสัดส่วนที่ออกจริงในข้อสอบเก่า ครึ่งหนึ่งเฉลี่ยเท่ากัน คูณสุ่ม ±25% · เพดานต่อหัวข้อ ≈ 1.8 เท่าของค่าเฉลี่ย */
function osCap(topic){const seen={};let c=0;mqL(ward,"OSCE").forEach(q=>{if((q.topic||"")!==topic)return;const k=osSubKey(q.topic,osSubOf(q));if(!k){c++;return;}seen[k]=(seen[k]||0)+1;if(seen[k]<=OS_SUBLIM)c++;});return c;}
function osQuotaAuto(n,topics,aiOn){const L=mqL(ward,"OSCE"),T1=topics.length?topics:osTopics().map(t=>t.id),T0=T1.length?T1:[""],cap0={},T=T0.filter(t=>{cap0[t]=aiOn?1e6:osCap(t);return cap0[t]>0;}),Q={};if(!T.length||n<=0)return Q;
  const cnt={},sets=new Set();L.forEach(q=>{cnt[q.topic]=(cnt[q.topic]||0)+1;sets.add(q.set+"|"+q.ro);});const nS=Math.max(1,sets.size),even=n/T.length,w={};
  T.forEach(t=>{w[t]=(((cnt[t]||0)/nS)*0.5+even*0.5+0.01)*(0.75+Math.random()*0.5);Q[t]=0;});
  const lim=Math.max(1,Math.ceil(even*1.8));let left=n;
  if(n>=T.length)T.forEach(t=>{Q[t]=1;left--;});
  const pick=ok=>{let b=null,bv=-1;T.forEach(t=>{if(!ok(t))return;const v=w[t]/(Q[t]+1);if(v>bv){bv=v;b=t;}});return b;};
  while(left>0){let t=pick(x=>Q[x]<Math.min(lim,cap0[x]));if(t===null)t=pick(x=>Q[x]<cap0[x]);if(t===null)break;Q[t]++;left--;}
  return Q;}
/* เลือกข้อเก่าตามโควตา · หัวข้อเล็กไม่เกิน OS_SUBLIM ข้อต่อชุด · cnt = ตัวนับหัวข้อเล็กของชุดนี้ */
function osPickOld(Q,cnt,pref){const by={},out=[],short={};mqL(ward,"OSCE").forEach(q=>{(by[q.topic||""]=by[q.topic||""]||[]).push(q);});
  Object.keys(Q).forEach(t=>{let need=Q[t];const a=shuffle(by[t]||[]);if(pref)a.sort((x,y)=>osDone(x)-osDone(y));
    for(const q of a){if(need<=0)break;const k=osSubKey(q.topic,osSubOf(q));if(k&&(cnt[k]||0)>=OS_SUBLIM)continue;if(k)cnt[k]=(cnt[k]||0)+1;out.push({k:"st",u:q.uid,topic:q.topic||""});need--;}
    if(need>0)short[t]=need;});
  return {out,short};}
/* หัวข้อเล็กสำหรับข้อ AI: เลือกเรื่องที่ยังไม่เต็ม เรื่องที่ออกน้อยในชุดก่อน สุ่มในกลุ่มเดียวกัน · ไม่มีรายการ = ให้ AI เลือกเอง */
function osAiSub(topic,cnt){const names=new Set((OS_SUBT[topic]||[]).map(x=>x[0]));mqL(ward,"OSCE").forEach(q=>{if(q.topic===topic){const s=osSubOf(q);if(s)names.add(s);}});
  const L=shuffle([...names]).filter(n=>(cnt[osSubKey(topic,n)]||0)<OS_SUBLIM).sort((a,b)=>(cnt[osSubKey(topic,a)]||0)-(cnt[osSubKey(topic,b)]||0));if(!L.length)return "";const s=L[0],k=osSubKey(topic,s);cnt[k]=(cnt[k]||0)+1;return s;}
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
/* Legendary (22 Nov 2026, user, ทวทว): cfg {mode,n,per,rest,order,topics,quota,mix}
   mix "mix" (default) = old exams 90% : stations from the ward's own files 10% (because the real OSCE repeats old stations a lot)
     file group = Unit round stations + the viewer's Specialty stations + new AI stations built on one L/R/T/N page of the OSCE tab (needs AI) — random mix
     the 10% is n × 0.1 with the fraction rounded up or down at random · anything the file group cannot fill → old exams · old exams short + AI on → AI fills (as before)
   mix "old" = old exams only */
const OS_FILE=0.1;
function osFileN(n){const x=n*OS_FILE,f=Math.floor(x);return f+(Math.random()<x-f?1:0);}
function osBuild(cfg){const P=P_(),mix=cfg.mix!=="old",aiOK=mix&&osAiOK(),auto=!cfg.quota,nF=mix?osFileN(cfg.n):0,nOld=cfg.n-nF;
  let Q=auto?osQuotaAuto(nOld,cfg.topics,aiOK):Object.assign({},cfg.quota);
  if(!auto){let tot=Object.values(Q).reduce((a,b)=>a+b,0);if(tot>nOld){const bag=shuffle(Object.keys(Q).flatMap(t=>Array(Q[t]).fill(t))).slice(0,nOld);Q={};bag.forEach(t=>{Q[t]=(Q[t]||0)+1;});tot=nOld;}
    const left=nOld-tot;if(left>0){const X=osQuotaAuto(left,[],aiOK);Object.keys(X).forEach(t=>{Q[t]=(Q[t]||0)+X[t];});}}
  const cnt={},R=osPickOld(Q,cnt,true);let sts=R.out,short=0;const fillAI=[];Object.keys(R.short).forEach(t=>{for(let i=0;i<R.short[t];i++){if(aiOK)fillAI.push(t);else short++;}});
  /* สุ่มกระจาย + ไม่มี AI: หัวข้อไหนข้อเก่าไม่พอ ย้ายไปหัวข้ออื่นที่ยังเติมได้ */
  if(auto&&short>0){const hasU=new Set(sts.map(x=>x.u)),pool=shuffle(mqL(ward,"OSCE").filter(q=>!hasU.has(q.uid)&&(!cfg.topics.length||cfg.topics.includes(q.topic))));for(const q of pool){if(short<=0)break;const k=osSubKey(q.topic,osSubOf(q));if(k&&(cnt[k]||0)>=OS_SUBLIM)continue;if(k)cnt[k]=(cnt[k]||0)+1;sts.push({k:"st",u:q.uid,topic:q.topic||""});short--;}}
  fillAI.forEach(t=>{sts.push({k:"st",src:"ai",topic:t,u:"",sub:osAiSub(t,cnt)});});
  /* file group */
  let fShort=0;if(nF>0){const inT=q=>!cfg.topics.length||cfg.topics.includes(q.topic),used=new Set(sts.map(x=>x.u)),
      U=shuffle(osUnitAll().filter(q=>inT(q)&&!used.has(q.uid))),S=shuffle(osSpcList().filter(q=>inT(q)&&!used.has(q.uid))),fu=aiOK?spcUnits(ward,"OSCE"):[];
    const c=typeof legMix==="function"?legMix({u:U.length,s:S.length,ai:fu.length?nF:0},nF):{u:Math.min(U.length,nF),s:0,ai:0};
    U.slice(0,c.u||0).forEach(q=>sts.push({k:"st",u:q.uid,topic:q.topic||"",fsrc:"unit"}));S.slice(0,c.s||0).forEach(q=>sts.push({k:"st",u:q.uid,topic:q.topic||"",fsrc:"spc"}));
    for(let i=0;i<(c.ai||0);i++)sts.push({k:"st",src:"ai",fsrc:"file",topic:cfg.topics.length?cfg.topics[i%cfg.topics.length]:"",u:"",sub:""});
    fShort=nF-(c.u||0)-(c.s||0)-(c.ai||0);
    if(fShort>0){const hasU=new Set(sts.map(x=>x.u)),pool=shuffle(mqL(ward,"OSCE").filter(q=>!hasU.has(q.uid)&&inT(q)));for(const q of pool){if(fShort<=0)break;const k=osSubKey(q.topic,osSubOf(q));if(k&&(cnt[k]||0)>=OS_SUBLIM)continue;if(k)cnt[k]=(cnt[k]||0)+1;sts.push({k:"st",u:q.uid,topic:q.topic||""});fShort--;}
      short+=Math.max(0,fShort);}}
  const run=osNewRun({mode:cfg.mode,per:cfg.per,rest:cfg.rest,order:cfg.order,topics:cfg.topics,n:cfg.n,mix:mix?"mix":"old",nF,short:Math.max(0,short),quotaCfg:cfg.quota||null});
  sts.forEach(sl=>{sl.ty=osSlotType(run,sl);});
  if(cfg.order!=="custom"){if(cfg.order==="block"){const a=shuffle(sts.filter(s=>s.ty==="noex")),b=shuffle(sts.filter(s=>s.ty!=="noex"));sts=a.concat(b);}else sts=shuffle(sts);
    run.seq=osOpt("autoRest")===false?sts:osRests(sts);run.start=osStartPick(run.seq);}
  P.osRun=run;save();return run;}
/* real exam count/time — set here when the ward has none yet (same place as the Admit · ICU · Discharge page) */
function osSetReal(n,min){const id=W_().cfg.id,o=wOv(id);st.wcfg=st.wcfg||{};st.wcfg[id]=Object.assign({},o||{},{examOS:{n:Math.round(n),min:Math.round(min*2)/2},ts:now()});delete st.wcfg[id].reset;save();}
/* ---- Legendary setup page (#/<ward>/osl) ---- */
function osSetup(){const P=P_(),E=osExamCfg(),L=mqL(ward,"OSCE"),T=osTopics(),v=P.osSet=Object.assign({mode:"irl",rest:OS_REST,order:"block",topics:[],mix:"mix"},P.osSet||{});if(v.mix!=="old")v.mix="mix";
  if(osPrep())return osPrepView();
  const n=E?E.n:0;
  let h=`<div class="mqv osv"><div class="whead"><h1 class="h2">Legendary round · OSCE</h1><a href="#/${esc(ward)}">กลับหน้าวอร์ด</a></div>
    <p class="sub" style="margin:0 0 10px">จำลองสอบจริง — จำนวนข้อและเวลาต่อข้อเท่าสอบจริงของวอร์ด · เปิดทีละข้อ ข้อย่อยขึ้นพร้อมกัน หมดเวลาเปลี่ยนข้อเอง · ข้อสอบเก่าในคลัง <b>${L.length}</b> ข้อ</p>`;
  const cur=osRunCur();if(cur)h+=rsPage("pg:osrun",Math.max(cur.vt||0,cur.ts||0),`<button class="resume" id="osResume"><span>กำลังทำอยู่: <b>${osKindN(cur.kind)} · ${cur.mode==="irl"?"IRL":"SIM"}</b><span class="rd">ช่องที่ ${(cur.pos||0)+1}/${cur.seq.length} — กดเพื่อทำต่อ</span></span><span class="go">→</span></button>`,`<button class="linkbtn rs2" id="osResume">กำลังทำ ${osKindN(cur.kind)} ค้างอยู่ · ช่องที่ ${(cur.pos||0)+1}/${cur.seq.length} · <b>กลับไปทำต่อ</b> →</button>`);
  h+=`<div class="card"><h3>สอบจริงของวอร์ดนี้</h3>${E?`<p class="osreal"><b>${E.n}</b> ข้อ (ไม่นับข้อพัก) · ข้อละ <b>${E.min}</b> นาที</p><span class="rd">แก้ได้ที่หน้า <a href="#/${esc(ward)}/dates">Admit · ICU · Discharge</a></span>`
    :`<span class="rd">ยังไม่ได้ตั้งจำนวนข้อ/เวลาของ OSCE จริง — ใส่ตรงนี้ (บันทึกที่เดียวกับหน้า <a href="#/${esc(ward)}/dates">Admit · ICU · Discharge</a>)</span><div class="dtrow"><label>จำนวนข้อ (ไม่นับข้อพัก)<input type="number" id="osRN" min="1" max="80" placeholder="เช่น 25"></label><label>เวลาต่อข้อ (นาที)<input type="number" id="osRM" min="0.5" max="60" step="0.5" placeholder="เช่น 5"></label></div><button class="btn" type="button" id="osRSave">บันทึก</button>`}</div>`;
  h+=`<div class="card"><h3>1. แบบการสอบ</h3><div class="seg" role="group"><button data-osm="irl" aria-pressed="${v.mode==="irl"}"><b>IRL</b>มีผู้คุมคนจริง — จอโชว์แค่โจทย์ ผู้คุมดู checklist ใต้โจทย์</button><button data-osm="sim" aria-pressed="${v.mode==="sim"}"><b>SIM</b>จำลองเอง — พิมพ์ตอบทุกข้อย่อย ข้อที่ต้องพูดให้พิมพ์สิ่งที่จะพูด</button></div></div>`;
  const cnt={};L.forEach(q=>{cnt[q.topic]=(cnt[q.topic]||0)+1;});
  const qm=v.qm==="manual"&&T.length?"manual":"auto",qv=v.qv=v.qv||{},qSum=T.reduce((a,t)=>a+(+qv[t.id]||0),0);
  h+=`<div class="card"><h3>2. หัวข้อที่อยากสอบ</h3>${T.length?`<div class="osord" style="margin:6px 0 8px">${[["auto","สุ่มกระจายให้","สุ่มแล้วจัดสัดส่วนให้พอดี ไม่เยอะหรือน้อยเกินไป · ออกครบทุกหัวข้อถ้าจำนวนข้อพอ"],["manual","กำหนดเองว่าหัวข้อละกี่ข้อ","ใส่จำนวนข้อของแต่ละหัวข้อใหญ่ · ส่วนที่เหลือสุ่มกระจายให้"]].map(([k,nm,d])=>`<button class="osopt" type="button" data-osqm="${k}" aria-pressed="${qm===k}"><b>${nm}</b><span>${d}</span></button>`).join("")}</div>`:""}${qm==="manual"?`<div class="osqgrid">${T.map(t=>`<label class="osqrow"><span>${OS_TI[t.proc?"proc":t.ex?"ex":"noex"]} ${esc(t.name)} <span class="hint">คลัง ${cnt[t.id]||0}${OS_SUBON?` · ใช้ได้ ${osCap(t.id)}`:""}</span></span><input type="number" min="0" max="${n||80}" data-osq="${esc(t.id)}" value="${esc(qv[t.id]||"")}" placeholder="0"></label>`).join("")}</div><p class="${n&&qSum>n?"hint osqbad":"hint"}" id="osQSum" style="margin:6px 0 0">รวม <b>${qSum}</b>${n?` จาก ${n} ข้อ${qSum>n?" — เกินจำนวนข้อสอบจริง":qSum<n?` · อีก ${n-qSum} ข้อสุ่มกระจายให้`:""}`:""}</p>`:T.length?`<div class="chips">${saBtn("[data-ost]")}${T.map(t=>`<button class="chip" type="button" data-ost="${esc(t.id)}" aria-pressed="${v.topics.includes(t.id)}">${OS_TI[t.proc?"proc":t.ex?"ex":"noex"]} ${esc(t.name)}<span class="cnt">${cnt[t.id]||0}</span></button>`).join("")}</div><span class="rd" style="margin-top:4px">ไม่เลือก = ทุกหัวข้อ</span>`:`<span class="rd">วอร์ดนี้ยังไม่มีรายการหัวข้อ OSCE — สุ่มจากทุกข้อในคลัง</span>`}
    <span class="rd" style="margin-top:6px">📝 ไม่มีอาจารย์ · 👨‍⚕️ มีอาจารย์ · 🩺 หัตถการ · ตัวเลข = ข้อสอบเก่าในคลัง${OS_SUBON?` · หัวข้อเล็กเรื่องเดียวกัน (เช่น PBS, CXR) ออกไม่เกิน ${OS_SUBLIM} ข้อต่อชุด แม้ต่างโรค`:""}</span></div>`;
  const inT=qm==="manual"?T.reduce((a,t)=>a+osCap(t.id),0):T.filter(t=>!v.topics.length||v.topics.includes(t.id)).reduce((a,t)=>a+osCap(t.id),0)||L.filter(q=>!v.topics.length||v.topics.includes(q.topic)).length;
  {const nU=osUnitAll().length,nS=osSpcList().length,nP=spcUnits(ward,"OSCE").length;
  h+=`<div class="card"><h3>3. สัดส่วนข้อสอบ</h3><div class="osord">${[["mix","ข้อสอบเก่า 90% + จากไฟล์ของวอร์ด 10%","OSCE จริงชอบออกตรงข้อสอบเก่า จึงให้ข้อสอบเก่าเป็นหลัก · อีก 10% สุ่มปนจาก สถานี Unit round · สถานี Specialty ของคุณ · สถานีใหม่ที่ AI แต่งจากไฟล์ L/R/T/N ของวอร์ด (ต้องมี AI) — สุ่มสัดส่วนใหม่ทุกชุด"],["old","ข้อสอบเก่าเท่านั้น","ทุกข้อมาจากข้อสอบเก่าในคลัง"]].map(([k,nm,d])=>`<button data-osmix="${k}" aria-pressed="${v.mix===k}"><b>${nm}</b><span>${d}</span></button>`).join("")}</div>
    ${v.mix==="mix"?`<p class="rd" style="margin:8px 0 0">ตอนนี้มีให้สุ่มในส่วน 10%: Unit round ${nU} สถานี · Specialty ของคุณ ${nS} สถานี · หน้าไฟล์ให้ AI แต่ง ${nP} หน้า${osAiOK()?"":" (ยังไม่มี AI — ใช้ได้แค่ Unit / Specialty ส่วนที่ขาดใช้ข้อสอบเก่าแทน)"}${n?` · ชุด ${n} ข้อ ≈ จากไฟล์ ${Math.floor(n*OS_FILE)}${n*OS_FILE%1?"–"+Math.ceil(n*OS_FILE):""} ข้อ`:""}</p>${osAiBtns()}<span class="rd">AI ดึงรูปจากอินเทอร์เน็ตไม่ได้ — ข้อที่ต้องใช้รูปมีลิงก์ค้นรูปใน Google ให้ แล้วใส่รูปเองได้ (ไม่ใส่ก็สอบได้ จะขึ้นคำบรรยายแทนรูป) · ข้อสอบเก่าไม่พอและมี AI: AI แต่งเติมส่วนที่ขาด</span>`:""}
    ${n&&(v.mix==="old"||!osAiOK())&&inT<n?`<p class="hint" style="margin:8px 0 0">ข้อสอบเก่าในหัวข้อที่เลือกใช้ได้ ${inT} ข้อ${OS_SUBON?` (หลังจำกัดหัวข้อเล็กละ ${OS_SUBLIM} ข้อ)`:""} ไม่ครบ ${n} — ${v.mix==="old"?`จะสอบแค่ ${inT} ข้อ หรือเลือกแบบ 90 : 10 แล้วเปิด AI ให้เติมส่วนที่ขาด`:"ถ้าไม่มี AI จะสอบเท่าที่มี"}</p>`:""}</div>`;}
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
  document.querySelectorAll("[data-osmix]").forEach(b=>b.onclick=()=>upd({mix:b.dataset.osmix}));
  document.querySelectorAll("[data-osqm]").forEach(b=>b.onclick=()=>upd({qm:b.dataset.osqm}));
  document.querySelectorAll("[data-osq]").forEach(e=>e.oninput=()=>{const x=Math.max(0,Math.round(+e.value)||0);if(x)qv[e.dataset.osq]=x;else delete qv[e.dataset.osq];v.qv=qv;P.osSet=v;save();const S=T.reduce((a,t)=>a+(+qv[t.id]||0),0),el=$("osQSum");if(el){el.className=n&&S>n?"hint osqbad":"hint";el.innerHTML=`รวม <b>${S}</b>${n?` จาก ${n} ข้อ${S>n?" — เกินจำนวนข้อสอบจริง":S<n?` · อีก ${n-S} ข้อสุ่มกระจายให้`:""}`:""}`;}});
  document.querySelectorAll("[data-ost]").forEach(b=>b.onclick=()=>{const k=b.dataset.ost,a=v.topics.slice(),i=a.indexOf(k);if(i>=0)a.splice(i,1);else a.push(k);upd({topics:a});});
  $("osRest").onchange=()=>{const x=Math.round(+$("osRest").value);if(x>0){v.rest=x;P.osSet=v;save();}};
  $("osGo").onclick=async()=>{if(!E)return;const rest=Math.round(+$("osRest").value);if(!(rest>0)){toast("ใส่เวลาข้อพัก");return;}
    if(cur&&!await uiAsk("มีชุดที่ทำค้างอยู่ — สร้างชุดใหม่แทน? (ชุดเดิมจะถูกยกเลิก ไม่เก็บผล)"))return;
    {const S=T.reduce((a,t)=>a+(+qv[t.id]||0),0);if(qm==="manual"&&S>E.n){toast(`รวมหัวข้อ ${S} ข้อ เกินจำนวนข้อสอบจริง ${E.n} ข้อ`);return;}}
    v.rest=rest;P.osSet=v;const qc=qm==="manual"&&v.order!=="custom"?Object.assign({},qv):null;osBuild({mode:v.mode,n:E.n,per:E.min*60,rest,order:v.order,topics:qm==="manual"?[]:v.topics.slice(),quota:qc,mix:v.mix});osPrepView();};}
function osInfoHTML(){return `<details class="card osinfo"><summary><b>เกณฑ์คะแนนที่เว็บใช้</b></summary><div class="rd">เฉลยแต่ละข้อย่อยเป็น checklist แบบ OSCE จริง: "ต้องมีคำนี้" หรือ "ต้องได้ n จาก m อย่าง" · คะแนนข้อย่อย = สัดส่วน checklist ที่ได้ × คะแนนเต็มข้อย่อย (กดให้คะแนนเองทับได้) · คะแนนแต่ละข้อคิดเป็น % แล้วเฉลี่ยทุกข้อ (ข้อพักไม่นับ) · เกรดเหมือน Legendary MCQ (A ≥ 80 … F &lt; 50) · <b>ผ่านข้อ = ได้ ≥ 60%</b> (สมมติไว้ เกณฑ์จริงของคณะไม่เปิดเผย และมักคิดจากคะแนนทั้งรุ่น)</div></details>`;}
/* ---- Legendary prep page: see the paper, AI stations + their pictures, move / add / remove rest stations, re-roll; custom = design every slot ---- */
function osPrepView(){const run=osPrep();if(!run)return osSetup();const N=run.seq.length,cust=run.order==="custom",T=osTopics(),L=mqL(ward,"OSCE");
  osImgLoad(run,()=>{if(view==="osl"&&osPrep())osPrepView();});
  const pend=run.seq.filter(s=>s.k==="st"&&s.src==="ai"&&!s.u),gen=run.seq.filter(s=>s.k==="st"&&s.u&&run.gen[s.u]).map(s=>run.gen[s.u]),needImg=gen.filter(osNeedsImg);
  let h=`<div class="mqv osv"><div class="whead"><h1 class="h2">เตรียมสอบ · OSCE</h1><a href="#/${esc(ward)}">กลับหน้าวอร์ด</a></div>
    <p class="sub" style="margin:0 0 10px"><b>${run.mode==="irl"?"IRL":"SIM"}</b> · ${run.seq.filter(s=>s.k!=="rest").length} ข้อ + ข้อพัก ${run.seq.filter(s=>s.k==="rest").length} = <b>${N}</b> เลขข้อ · ข้อละ ${osFmt(run.per)} นาที · พัก ${run.rest} วินาที · ${cust?"ออกแบบเอง":run.order==="block"?"แยกกลุ่ม":"สุ่มปนกัน"}</p>`;
  {const m=osExMax(run.seq,sl=>osSlotType(run,sl));if(m>2)h+=`<p class="hint" style="color:var(--wrong)">⚠ มีข้อมีอาจารย์ (รวมหัตถการ) ติดกัน ${m} ข้อโดยไม่มีข้อพัก — กฎคือไม่เกิน 2 ข้อ ใส่ข้อพักเพิ่มด้วย "+ พักหลังข้อนี้"</p>`;}
  {const c={},nm={};run.seq.forEach(sl=>{if(sl.k!=="st")return;const q=osSt(run,sl.u),sb=q?osSubOf(q):sl.sub,t=q?q.topic:sl.topic,k=osSubKey(t,sb);if(k){c[k]=(c[k]||0)+1;nm[k]=sb;}});const over=Object.keys(c).filter(k=>c[k]>OS_SUBLIM);if(over.length)h+=`<p class="hint" style="color:var(--wrong)">⚠ หัวข้อเล็กเกินกติกา ${OS_SUBLIM} ข้อต่อชุด: ${over.map(k=>esc(nm[k])+" "+c[k]+" ข้อ").join(" · ")}</p>`;
    const qn={};run.seq.forEach(sl=>{if(sl.k==="st"){const q=osSt(run,sl.u),t=(q&&q.topic)||sl.topic||"";qn[t]=(qn[t]||0)+1;}});if(!cust)h+=`<p class="rd" style="margin:0 0 8px">หัวข้อใหญ่ในชุดนี้: ${T.filter(t=>qn[t.id]).map(t=>esc(t.name)+" "+qn[t.id]).join(" · ")}${T.some(t=>!qn[t.id])?` · ไม่ออก: ${T.filter(t=>!qn[t.id]).map(t=>esc(t.name)).join(", ")}`:""}</p>`;}
  if(run.short)h+=`<p class="hint">ข้อสอบเก่าในหัวข้อที่เลือกไม่พอ${OS_SUBON?` (จำกัดหัวข้อเล็กละ ${OS_SUBLIM} ข้อ)`:""} — ชุดนี้มี ${run.seq.filter(s=>s.k!=="rest").length} ข้อ (ขาด ${run.short})</p>`;
  if(N){h+=`<div class="ostart">เริ่มที่ <b>ข้อ ${run.start+1}</b> <select id="osStartSel" aria-label="เลือกข้อเริ่ม">${run.seq.map((s,i)=>s.k==="rest"?"":`<option value="${i}"${i===run.start?" selected":""}>ข้อ ${i+1}</option>`).join("")}</select> <button class="btn" type="button" id="osReStart">🎲 สุ่มข้อเริ่มใหม่</button></div>`;}
  h+=`<div class="osslots">${run.seq.map((sl,i)=>{const ty=osSlotType(run,sl),q=sl.k==="st"?osSt(run,sl.u):null,isS=i===run.start;
    if(sl.k==="rest")return `<div class="osslot rest"><span class="on">${i+1}</span><span class="oi">☕</span><span class="ot">ข้อพัก <span class="hint">${run.rest} วินาที</span></span><span class="oa"><button class="btn sm" type="button" data-osmv="${i}" data-d="-1" aria-label="เลื่อนขึ้น">↑</button><button class="btn sm" type="button" data-osmv="${i}" data-d="1" aria-label="เลื่อนลง">↓</button><button class="link" type="button" data-osdel="${i}">ลบ</button></span></div>`;
    const src=sl.src==="ai"?`<span class="tag">AI ${sl.fsrc==="file"?"จากไฟล์ของวอร์ด ":""}${sl.u?"แต่งแล้ว":"จะแต่งใหม่"}${sl.brief?" · "+esc(sl.brief.slice(0,40)):""}${q&&osNeedsImg(q)?(OSIMG[q.uid]?" · 🖼 ใส่รูปแล้ว":" · 🖼 ยังไม่มีรูป"):""}</span>`:q?(/^OSU\|/.test(q.uid)?`<span class="tag">Unit round</span>`:/^OSAI\|/.test(q.uid)?`<span class="tag">Specialty ของคุณ</span>`:`<span class="tag">ข้อสอบเก่า ${esc(q.set)}${q.ro?" "+esc(q.ro):""}</span>`):"";
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
  {const b=$("osReAll");if(b)b.onclick=()=>{osBuild({mode:run.mode,n:run.n,per:run.per,rest:run.rest,order:run.order,topics:run.topics,quota:run.quotaCfg||null,mix:run.mix||(run.nAI?"mix":"old")});osPrepView();};}
  {const b=$("osCAdd");if(b)b.onclick=()=>{const t=$("osCT").value,s=$("osCS").value,brief=$("osCB").value.trim();let sl;
    if(s.startsWith("u:")){const q=L.find(x=>x.uid===s.slice(2));if(!q)return;sl={k:"st",u:q.uid,topic:q.topic||""};}
    else if(s==="ac"){const used=new Set(run.seq.map(x=>x.u).filter(Boolean)),pool=shuffle(L.filter(q=>(q.topic||"")===t&&!used.has(q.uid)));if(!pool.length){toast("หัวข้อนี้ไม่มีข้อสอบเก่าที่ยังไม่ได้ใช้ — เลือก \"ให้ AI แต่งใหม่\"");return;}sl={k:"st",u:pool[0].uid,topic:t};}
    else{const c={};run.seq.forEach(x=>{if(x.k!=="st")return;const q=osSt(run,x.u),k=osSubKey(q?q.topic:x.topic,q?osSubOf(q):x.sub);if(k)c[k]=(c[k]||0)+1;});sl={k:"st",src:"ai",topic:t,u:"",brief,sub:brief?"":osAiSub(t,c)};}
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
    try{const FU=shuffle(spcUnits(ward,"OSCE"));let fi=0;
      for(const sl of need){k++;OSAI.msg=`AI กำลังแต่งโจทย์ ${k}/${need.length}${sl.fsrc==="file"?" (จากไฟล์ของวอร์ด)":` (${osTN(sl.topic)})`} …`;osPrepView();
        let g=sl,pg=null;if(sl.fsrc==="file"&&FU.length){pg=FU[fi++%FU.length];g=Object.assign({},sl,{src:pg.text.slice(0,9000),srcLabel:spcLabel(pg),only:run.topics&&run.topics.length?run.topics:null,legFile:1,avoidPts:[]});}
        const q=await osGen(run,g);if(pg){sl.topic=g.topic;q.srcRes=spcLabel(pg);q.notes=`📄 ที่มา: ${esc(q.srcRes)}${q.imgNeed?`<br>🖼 รูปที่ควรใช้: ${q.imgNeed}`:""}`;}
        run.gen[q.uid]=q;OSIMG[q.uid]=false;sl.u=q.uid;sl.ty=osSlotType(run,sl);save();}}
    catch(e){OSAI.busy=0;OSAI.err=(typeof admMsg==="function"&&admMsg(e))||"AI แต่งโจทย์ไม่สำเร็จ — ลองกดใหม่";osPrepView();return;}
    OSAI.busy=0;OSAI.msg="";if(run.seq.some(s=>s.u&&osNeedsImg(run.gen[s.u])))run.imgOpen=false;save();osPrepView();return;}   /* stop on the prep page so pictures can be added */
  if(!run.seq.some(s=>s.k==="st")){toast("ยังไม่มีข้อสอบ");return;}
  if(run.seq[run.start].k==="rest")run.start=run.seq.findIndex(s=>s.k!=="rest");
  osGo(run);}
function osGo(run){run.stage="run";run.pos=0;run.left=run.seq[osOrder(run)[0]].k==="rest"?run.rest:run.per;run.paused=false;run.t0=now();run.at=now();P_().osRun=run;save();go(ward+"/osx");}
/* ---- AI station (old exams of the same small topic / topic are the style examples, never to be repeated) ---- */
function osRefFor(topic,sub){const R=(W_().OSREF||[]);return R.filter(x=>x.topic===topic&&(!x.sub||x.sub===sub));}
function osGenPrompt(run,sl){const w=W_().cfg,tn=osTN(sl.topic),te=osTopicEx(sl.topic),L=mqL(ward,"OSCE"),same=L.filter(q=>q.topic===sl.topic),sb=sl.sub||"",sameS=sb?same.filter(q=>osSubOf(q)===sb):[];
  /* ตัวอย่างข้อสอบเก่า (ผู้ใช้สั่ง 3 พ.ย. 2026): ดูว่าออกประมาณไหน — เรื่องเดียวกันก่อน แล้วหัวข้อใหญ่เดียวกัน ถ้ามีเฉลยให้ใช้เป็นแนวทาง */
  const exs=[];new Set(shuffle(sameS).concat(shuffle(same)).concat(shuffle(L))).forEach(q=>{if(exs.length<3)exs.push(q);});
  const exJ=exs.map(ex=>JSON.stringify({title:ex.title,stem:plain(ex.stem).slice(0,700),sp:ex.sp?plain(ex.sp).slice(0,500):undefined,subs:ex.subs.map(s=>({q:s.q,marks:s.marks,fileKey:s.key?plain(s.key).slice(0,250):undefined,ans:plain(s.ans).slice(0,500),points:s.points}))})).join("\n");
  const avoid=(sameS.length?sameS:same).slice(0,30).map(q=>"- "+plain(q.gray||q.title).slice(0,160)).join("\n");
  const used=run.seq.map(s=>osSt(run,s.u)).filter(Boolean).map(q=>q.title+(osSubOf(q)?" ["+osSubOf(q)+"]":"")).join("; ");
  const cn={};run.seq.forEach(x=>{if(x.k!=="st"||x===sl)return;const q=osSt(run,x.u),k=q?osSubOf(q):x.sub,t=q?q.topic:x.topic;if(k&&t===sl.topic)cn[k]=(cn[k]||0)+1;});const full=Object.keys(cn).filter(k=>cn[k]>=OS_SUBLIM);
  const refs=osRefFor(sl.topic,sb).map(x=>"["+x.title+"]\n"+x.text).join("\n\n");
  return `Write ONE brand-new OSCE station for Thai ${INST.stu} (medical students) in Year 4 at ${INST.en}, ${w.name} rotation.
${sl.src?`Station topic: choose the ONE station topic that best fits the source below, from this list (id = name): ${osTopics().filter(t=>!sl.only||sl.only.includes(t.id)).map(t=>t.id+" = "+t.name+(t.proc?" (procedure, examiner)":t.ex?" (examiner)":" (written, no examiner)")).join("; ")}. Put its id in "topic".`:`Station topic: ${tn}${te.proc?" (procedure station with an examiner)":te.ex?" (station with an examiner: the student talks to a standardized patient or examines one)":" (written station, no examiner: the student reads the material and writes answers)"}.`} Time: ${osFmt(run.per)} minutes.
${sb?"Small topic of this station: "+sb+" (write the station on this small topic).\n":""}${sl.brief?"The student asked for: "+sl.brief+"\n":""}Scope: ${w.scope||w.name}. Level: what a Year-4 student must know. Content from current standard textbooks and guidelines.
Old exams of this ward show how the exam is written, so match their level, length and way of asking. But this station must be NEW: never repeat an old station. Change the disease, or change the values/findings/presentation, so it is a different question.
Old stations on this topic (do not reuse as they are):
${avoid||"none"}
Avoid these stations already in this exam: ${used||"none"}.
${full.length?"Do not write on these small topics, they already appear "+OS_SUBLIM+" times in this exam: "+full.join(", ")+".\n":""}${refs?"Reference from the school (use it for the checklist and the model answer; if a newer guideline or textbook disagrees, follow the more reliable source and say so in keyNote):\n"+refs+"\n":""}Answer key: old-exam keys ("fileKey") are written by students and are only a guide. If you disagree with how they answer a similar question, write what you believe is most correct and explain the difference in Thai in "keyNote"; otherwise leave "keyNote" empty.
Pictures: the website cannot make pictures — the student will insert one himself. If this station needs a picture (EKG, film, CT, smear, Gram stain, KOH, urine sediment, skin lesion, photo of a physical sign, etc.):
- "imgNeed": exactly which picture to find (e.g. "12-lead EKG: atrial fibrillation with rapid ventricular response") — may name the finding, it is shown only to the person who inserts the picture.
- "imgAlt": a written description in Thai (medical terms in English) shown in place of the picture until one is inserted: describe what the picture shows (morphology, colour, size, number, distribution, location, key positive and negative findings, measurements) in enough detail that a student who knows the disease can reach the expected answer from the words alone — but WITHOUT naming the diagnosis or the named sign the student must identify. Vary the length from station to station (sometimes one short line, sometimes 2–4 sentences).
- The stem says the picture "is shown". Otherwise set both to "".
Rules:
- Stem and questions in formal English like a real exam. 1–4 sub-questions (e.g. "1.1 Diagnosis"); stations with an examiner usually have one long task (take a history / examine / perform) plus a short question at the end.
- For an examiner station write "sp": the script for the standardized patient / examiner in Thai (patient details, answers to likely questions, examination findings to give when asked).
- Each sub-question has an OSCE checklist key: "points" = list of items; an item is either a string (must be said) or {"label": "...", "any": ["...", "..."], "need": n} (any n of these). "kw" = for each item, case-insensitive JavaScript regex strings (Thai or English keywords) that detect it in a typed answer: for a string item an array of strings; for an "any" item an array of arrays, one per option.
- "ans": model answer (English with Thai explanation allowed, <b> for emphasis). "exp": short Thai explanation with the key facts.
${sl.src?`CONTENT RULE (${sl.legFile?"station from this ward's own files, mixed into a mock exam of old stations":"Specialty round of OSCE"}): build this station ONLY from the source below, which comes from this ward's own Round I/O (${sl.srcLabel||"file"}). Check every fact you take from it against current guidelines and standard textbooks (order of trust: guideline / textbook > lecture > resource > ward note). The key facts tested and the model answers must be stated in, or follow directly from, the source; general knowledge only for case details. If the source disagrees with the newest guideline or textbook, still key what is correct per that guideline and explain the difference in Thai in "keyNote". Do not repeat these points already asked from this source: ${(sl.avoidPts||[]).join("; ")||"none yet"}.
Source:
${sl.src}
`:""}Reply with only a JSON object:
{${sl.src?'"topic": "one id from the list", "point": "the main fact tested, 1 short line", ':""}"title": "short neutral English title that does not give the answer", "sub": "the small topic in 1-3 English words", "stem": "...", "imgNeed": "", "imgAlt": "", "sp": "Thai script or empty string", "subs": [{"q": "...", "marks": 2, "ans": "...", "exp": "...", "points": [...], "kw": [...]}], "keyNote": "", "interp": "Thai: what this station tests", "summary": ["3–5 Thai high-yield bullets"]}
${exJ?"Old exam stations of this ward, as style examples only:\n"+exJ:""}`;}
async function osGen(run,sl){const o=await aiJSON(osGenPrompt(run,sl),4096);if(!o||!o.stem||!Array.isArray(o.subs)||!o.subs.length)throw {code:"invalid_json"};
  if(sl.src){const T=osTopics();sl.topic=(T.find(t=>t.id===o.topic)||T[0]||{id:""}).id;sl.point=String(o.point||"").slice(0,160);}
  const te=osTopicEx(sl.topic),uid="OSAI|"+now().toString(36)+Math.random().toString(36).slice(2,6),okRe=x=>{try{new RegExp(x,"i");return true;}catch(e){return false;}};
  const subs=o.subs.slice(0,6).map(s=>{const pts=Array.isArray(s.points)?s.points.filter(p=>typeof p==="string"||(p&&Array.isArray(p.any))):[];let kw=Array.isArray(s.kw)?s.kw:[];
    kw=pts.map((p,j)=>{const k=kw[j];if(typeof p==="string")return (Array.isArray(k)?k:[]).map(String).filter(okRe);return p.any.map((a,m)=>(Array.isArray(k)&&Array.isArray(k[m])?k[m]:[]).map(String).filter(okRe));});
    return {q:san(s.q),marks:Math.max(1,Math.min(10,+s.marks||2)),ans:san(s.ans),exp:san(s.exp),points:pts.map(p=>typeof p==="string"?san(p):{label:san(p.label||""),any:p.any.map(san),need:Math.max(1,Math.min(p.any.length,+p.need||1))}),kw,tags:[sl.topic]};});
  return {uid,ai:1,set:"AI",ro:"",orig:"AI",file:"AI",page:"",topic:sl.topic,ex:te.ex?1:0,proc:te.proc?1:0,title:String(o.title||"").slice(0,90),sub:String(sl.sub||o.sub||"").slice(0,40),opinion:san(o.keyNote||""),stem:san(o.stem),imgNeed:san(o.imgNeed||""),imgAlt:san(o.imgAlt||""),sp:san(o.sp||""),parts:[{subs}],interp:san(o.interp||""),summary:(Array.isArray(o.summary)?o.summary:[]).map(san),brief:sl.brief||""};}
/* ---- Quality round (#/<ward>/osq): timed practice like Quality MCQ ---- */
function osQuality(){const P=P_(),L=mqL(ward,"OSCE"),E=osExamCfg(),v=P.osQ=Object.assign({mode:"sim",src:"all",sets:[],fresh:false,n:Math.min(10,L.length||10),per:E?E.min:5,rest:0},P.osQ||{});
  const sets=[...new Set(L.map(mqSK))];v.sets=v.sets.filter(k=>sets.includes(k));
  const base=v.src==="sets"?L.filter(q=>!v.sets.length||v.sets.includes(mqSK(q))):L,pool=v.fresh?base.filter(q=>!osDone(q)):base,cur=osRunCur();
  let h=`<div class="mqv osv"><div class="whead"><h1 class="h2">Quality round · OSCE</h1><a href="#/${esc(ward)}">กลับหน้าวอร์ด</a></div>
    <p class="sub" style="margin:0 0 10px">ทำข้อสอบเก่าแบบจับเวลาทีละข้อ หมดเวลาเปลี่ยนข้อเอง · เลือกปีที่จะทำ หรือสุ่มจากทั้งคลัง · กำหนดเวลาต่อข้อเอง</p>`;
  if(cur)h+=rsPage("pg:osrun",Math.max(cur.vt||0,cur.ts||0),`<button class="resume" id="osResume"><span>กำลังทำอยู่: <b>${osKindN(cur.kind)} · ${cur.mode==="irl"?"IRL":"SIM"}</b><span class="rd">ช่องที่ ${(cur.pos||0)+1}/${cur.seq.length} — กดเพื่อทำต่อ</span></span><span class="go">→</span></button>`,`<button class="linkbtn rs2" id="osResume">กำลังทำ ${osKindN(cur.kind)} ค้างอยู่ · ช่องที่ ${(cur.pos||0)+1}/${cur.seq.length} · <b>กลับไปทำต่อ</b> →</button>`);
  h+=`<div class="card"><h3>แบบการทำ</h3><div class="seg" role="group"><button data-oqm="irl" aria-pressed="${v.mode==="irl"}"><b>IRL</b>มีผู้คุม — จอโชว์แค่โจทย์</button><button data-oqm="sim" aria-pressed="${v.mode==="sim"}"><b>SIM</b>พิมพ์ตอบเอง</button></div></div>`;
  h+=`<div class="card"><h3>ข้อสอบที่จะทำ</h3><div class="chips">${[["all","สุ่มจากข้อสอบเก่าทั้งหมด"],["sets","เลือกปีที่จะทำ"]].map(([k,t])=>`<button class="chip" type="button" data-oqs="${k}" aria-pressed="${v.src===k}">${t}</button>`).join("")}</div>
    <p class="hint" style="margin:6px 0 0">${v.src==="all"?"สุ่มลำดับจากข้อสอบเก่าทุกปีในคลัง":"เหมือน Service round แต่จับเวลา — เรียงข้อตามชุดที่เลือก ไม่เลือกเลย = ทุกชุด · แตะชื่อปีเพื่อเลือกทุก Ro ในปีนั้น · ตัวเลข = ทำแล้ว/ทั้งหมด ใน Phase "+ph()}</p>
    ${v.src==="sets"?yrGroupHTML(sets,k=>{const q=L.find(x=>mqSK(x)===k);return q&&q.set?q.set:"";},(k,n)=>{const qs=L.filter(q=>mqSK(q)===k),g=pcChip(qs.filter(osDone).length,qs.length);return `<button class="chip${g.c}" type="button" data-oqk="${esc(k)}" aria-pressed="${v.sets.includes(k)}"${g.s}>${esc(n)}<span class="cnt">${g.t}</span></button>`;}):""}
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
    let list=pool;if(v.src==="all"){const c={},pk=[];for(const q of shuffle(pool)){if(pk.length>=Math.max(1,n))break;const k=osSubKey(q.topic,osSubOf(q));if(k&&(c[k]||0)>=OS_SUBLIM)continue;if(k)c[k]=(c[k]||0)+1;pk.push(q);}list=pk;if(OS_SUBON&&pk.length<n)toast(`ได้ ${pk.length} ข้อ — จำกัดหัวข้อเล็กละไม่เกิน ${OS_SUBLIM} ข้อต่อชุด`);}const seq=[];list.forEach((q,i)=>{seq.push({k:"st",u:q.uid,topic:q.topic||""});if(rest>0&&i<list.length-1)seq.push({k:"rest"});});
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
function osRunView(){const run=osRunCur();if(!run)return go(ward+"/osl");rsVisit(P_(),run,["osrun","pg:osrun"]);if(!run.paused&&now()-run.at>8000)run.at=now();   /* page was closed: the clock waited */
  const ix=osSlotNow(run);if(ix<0)return osFinish(run);const sl=run.seq[ix],O=osOrder(run),N=run.seq.length;
  osImgLoad(run,()=>{if(view==="osx")osRunView();});
  const nx=run.pos+1<O.length?O[run.pos+1]:-1,nsl=nx>=0?run.seq[nx]:null,ty=osSlotType(run,sl),sim=run.mode==="sim";
  let h=`<div class="mqv osv osx"><div class="osbar"><div class="osnum"><small>ข้อ</small>${ix+1}<span class="osof">/${N}</span></div><div class="osmeta"><span class="tag">${OS_TI[ty]} ${OS_TT[ty]}</span><span class="hint">${osKindN(run.kind)} · ช่องที่ ${run.pos+1}/${N}${run.kind!=="quality"?` · เริ่มที่ข้อ ${run.start+1}`:""}${nsl?` · ถัดไป: ข้อ ${nx+1} ${nsl.k==="rest"?"☕ พัก":OS_TI[osSlotType(run,nsl)]}`:" · ข้อสุดท้าย"}</span></div><div class="osclock${run.paused?" paused":""}" id="osClock">${osFmt(osRemain(run))}</div></div>
    <div class="osctl"><button class="btn sm" type="button" id="osPause">${run.paused?"▶ เดินเวลาต่อ":"⏸ หยุดเวลา"}</button><button class="btn sm" type="button" id="osSkip">⏭ ไปข้อถัดไปเลย</button><button class="btn sm" type="button" id="osEnd">■ จบการสอบ</button></div>`;
  if(sl.k==="rest")h+=`<div class="osrest"><div class="big">☕</div><b>ข้อพัก</b><p>${nsl?`ข้อถัดไป: ข้อ ${nx+1} ${nsl.k==="rest"?"":OS_TT[osSlotType(run,nsl)]}`:"ข้อสุดท้ายแล้ว"}</p></div>`;
  else{const q=osSt(run,sl.u);if(!q)h+=`<div class="empty">ไม่พบโจทย์ข้อนี้</div>`;
    else{h+=`<section class="case"><div class="case-lab">ข้อ ${ix+1}</div><div class="stem">${q.stem}</div>${osPicBlock(q,true)}</section><section class="part">`;
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
  return `<div class="oschkq"><div class="oq">${osQ(s,ix)} <span class="mk">${mqMk(s)} คะแนน</span></div>${s.key?`<div class="hint">เฉลยในไฟล์: ${s.key}</div>`:""}<ul class="pts">${s.points.map((p,j)=>{const hd=mqSecHead(s,j,c),ct=mqCritTag(s,j);
    if(typeof p==="string")return hd+`<li><label><input type="checkbox" data-osc="${ix}" data-ss="${s._i}" data-sp="${j}" ${c[j]===true?"checked":""}><span>${p}${ct}</span></label></li>`;
    const vv=Array.isArray(c[j])?c[j]:[],need=p.need||1;
    return hd+`<li class="pgrp"><div class="pgl">${p.label?p.label+" ":""}<span class="alt">${need===1?"อย่างใดอย่างหนึ่ง":`ได้ ${need} อย่างจากนี้ = เต็ม`}</span>${ct}</div><ul>${p.any.map((a,m)=>`<li><label><input type="checkbox" data-osc="${ix}" data-ss="${s._i}" data-sp="${j}" data-sk="${m}" ${vv[m]?"checked":""}><span>${a}</span></label></li>`).join("")}</ul></li>`;}).join("")}</ul>${c.length?mqCritWarn(s,c):""}</div>`;}
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
  const c=osTicks(rs,ix,s);if(!(s.points||[]).length)return null;if(mqCritMiss(s,c).length)return 0;const sc=mqPtsScore(s,c);return sc.tot?mqPtsFrac(s,c):0;}
function osStScore(rs,ix){const q=osSt(rs,rs.seq[ix].u);if(!q)return null;let tot=0,got=0;q.subs.forEach(s=>{const m=mqMk(s),f=osSubFrac(rs,ix,s);tot+=m;got+=m*(f||0);});return {tot,got,pct:tot?got/tot*100:0};}
function osTotal(rs){const S=rs.seq.map((sl,ix)=>sl.k==="st"?{ix,sc:osStScore(rs,ix),q:osSt(rs,sl.u)}:null).filter(x=>x&&x.sc);
  const pct=S.length?S.reduce((a,x)=>a+x.sc.pct,0)/S.length:0,pass=S.filter(x=>x.sc.pct>=60).length,byT={};
  S.forEach(x=>{const k=(x.q&&x.q.topic)||"";(byT[k]=byT[k]||[]).push(x.sc.pct);});return {S,pct,pass,byT};}
const osGrade=p=>(GRADES.find(([m])=>p>=m)||[0,"F"])[1];
const osOpt=k=>{const w=W_().cfg;return ((w.exam||{}).OSCE||{})[k];};   /* Med MDCU (ผู้ใช้สั่ง 1 พ.ย. 2026): grade:false = บอกแค่ % คร่าว ๆ ไม่ตัดเกรด · autoRest:false = ไม่ใส่ข้อพักอัตโนมัติ ผู้ใช้ใส่เอง */
/* ---- result page (#/<ward>/osr) ---- */
function osResView(){const P=P_(),rs=osLastRes();if(!rs)return go(ward+"/osl");const TT=osTotal(rs),g=osGrade(TT.pct),O=osOrder(rs),Q=rs.kind==="quality";
  osImgLoad(rs,()=>{if(view==="osr")osResView();});
  let h=`<div class="mqv osv"><div class="whead"><h1 class="h2">ผล ${osKindN(rs.kind)} · OSCE</h1><a href="#/${esc(ward)}">กลับหน้าวอร์ด</a></div>
    <p class="sub" style="margin:0 0 10px">${fmtDT(rs.ts)} · <b>${rs.mode==="irl"?"IRL":"SIM"}</b> · ${TT.S.length} ข้อ · ข้อละ ${osFmt(rs.per)} นาที · ${Q?esc(rs.label||""):rs.order==="custom"?"ออกแบบเอง":rs.order==="block"?"แยกกลุ่ม":"สุ่มปนกัน"}${Q?"":` · เริ่มที่ข้อ ${rs.start+1}`}${(()=>{const g=Object.keys(rs.gen||{}).length,f=(rs.seq||[]).filter(x=>x.fsrc==="unit"||x.fsrc==="spc").length;return (rs.nAI?` · โจทย์ AI ${rs.nAI} ข้อ`:g?` · โจทย์ AI ${g} ข้อ`:"")+(f?` · Unit/Specialty ${f} ข้อ`:"")+(rs.mix==="mix"?" · สัดส่วน 90 : 10":"");})()}</p>
    <div class="osgrade">${osOpt("grade")===false?`<span class="p">${TT.pct.toFixed(0)}%</span><span class="hint">คะแนนคร่าว ๆ (ไม่ตัดเกรด — เกณฑ์จริงไม่ทราบ)</span>`:`<span class="g">${g}</span><span class="p">${TT.pct.toFixed(1)}%</span><span class="hint">ผ่าน (≥ 60%) <b>${TT.pass}/${TT.S.length}</b> ข้อ</span>`}</div>`;
  if(rs.mode==="irl"){const un=TT.S.filter(x=>{const q=x.q;return q&&!q.subs.some(s=>((rs.ut||{})[x.ix]||{})[s._i]||((rs.gm||{})[x.ix]||{})[s._i]!=null);}).length;if(un)h+=`<p class="hint">IRL: ยังไม่ได้ติ๊ก checklist ${un} ข้อ — ข้อที่ไม่ติ๊กนับ 0 คะแนน ติ๊กย้อนหลังด้านล่างได้</p>`;}
  else h+=`<p class="hint">SIM: เว็บติ๊ก checklist ให้จากคำสำคัญในคำตอบ (คร่าว ๆ) — ตรวจและแก้ติ๊กเอง หรือกดให้คะแนนเองได้ทุกข้อย่อย${mqAiAvail()?" · ให้ AI ตรวจได้ทีละข้อ":""}</p>`;
  h+=`<div class="card"><h3>คะแนนตามหัวข้อ</h3><table class="ostab"><tbody>${Object.entries(TT.byT).map(([k,a])=>{const p=a.reduce((x,y)=>x+y,0)/a.length;return `<tr><td>${esc(osTN(k))}</td><td>${a.length} ข้อ</td><td style="color:${mqPct(Math.round(p))}"><b>${p.toFixed(0)}%</b></td></tr>`;}).join("")}</tbody></table></div>`;
  h+=`<div class="tl-h">ทุกข้อ (เรียงตามเลขข้อ)</div><div class="osres">`;
  rs.seq.forEach((sl,ix)=>{if(sl.k==="rest"){h+=`<div class="osslot rest"><span class="on">${ix+1}</span><span class="oi">☕</span><span class="ot">ข้อพัก</span></div>`;return;}
    const q=osSt(rs,sl.u),sc=osStScore(rs,ix),reached=O.indexOf(ix)<(rs.reached||O.length);if(!q)return;
    h+=`<details class="osr"${P.osOpen===ix?" open":""} data-osr="${ix}"><summary><span class="on">${ix+1}</span><span class="oi">${OS_TI[osSlotType(rs,sl)]}</span><span class="ot">${esc(osTN(q.topic))} · ${esc(q.title||"")}${q.ai?' <span class="tag">AI</span>':""}${reached?"":' <span class="tag warn">ไม่ได้ทำ</span>'}</span><b class="osp" style="color:${mqPct(Math.round(sc.pct))}">${sc.pct.toFixed(0)}%</b></summary><div class="osrb">`;
    h+=myNoteTop(q);   /* 📝 my note above the station (result page = answers revealed) */
    h+=`<div class="stem">${q.stem}</div>${osPicBlock(q,true)}${q.imgNeed&&!osHasPic(q)?`<p class="hint">รูปที่ข้อนี้ต้องใช้: ${q.imgNeed}</p>`:""}`;
    q.subs.forEach(s=>{const i=s._i,t=(((rs.ans||{})[ix]||{})[i]||"").trim(),f=osSubFrac(rs,ix,s),gm=((rs.gm||{})[ix]||{})[i],ai=((rs.ai||{})[ix]||{})[i];
      h+=`<div class="subq"><div class="sh"><div class="sq">${osQ(s,ix)}</div><span class="mk">${f===null?"–":+(mqMk(s)*f).toFixed(1)}/${mqMk(s)}</span></div>`;
      if(rs.mode==="sim")h+=`<div class="mmine-lab">คำตอบของฉัน</div><div class="osmine">${t?mqNl(t):'<span class="muted">— ไม่ได้พิมพ์ —</span>'}</div>`;
      if(ai)h+=`<div class="aibox sblk"><b>🤖 AI:</b> ${mqNl(ai.assess||"")}${ai.missing?`<div class="aimiss"><b>ขาด:</b> ${mqNl(ai.missing)}</div>`:""}</div>`;
      h+=`<div class="model"><span class="lab">เฉลย</span><div class="a">${s.ans||""}</div>${s.exp?`<div class="mexp">${mqRich(s.exp)}</div>`:""}</div>`+mqKeyWarn(s);
      h+=osChkHTML(rs,ix,q,s);
      if(s.rubric)h+=`<div class="rubric"><b>เกณฑ์:</b> ${s.rubric}</div>`;if(s.flag)h+=`<div class="sub-meta"><span class="tag warn">${esc(s.flag)}</span></div>`;
      h+=`<div class="grade"><span class="gl">ให้คะแนนเอง (ทับ checklist):</span>${[[2,"✓ ได้"],[1,"◐ บางส่วน"],[0,"✗ ไม่ได้"]].map(([x,tx])=>`<button class="mgbtn g${x}" data-osg="${ix}" data-ss="${i}" data-g="${x}" aria-pressed="${gm===x}">${tx}</button>`).join("")}</div></div>`;});
    if(q.sp)h+=`<div class="sec notes"><h3>บทผู้ป่วยจำลอง / ผลตรวจ</h3><div class="box">${q.sp}</div></div>`;
    if(q.interp)h+=`<div class="sec"><h3>ประเด็นของข้อนี้</h3><p>${q.interp}</p></div>`;
    if((q.summary||[]).length)h+=`<div class="sec"><h3>สรุป</h3><ul>${q.summary.map(x=>`<li>${x}</li>`).join("")}</ul></div>`;
    {const op=opinionOf(q);if(op)h+=`<div class="sec opinion"><h3>ความเห็นของผม</h3><div class="box">${op}</div></div>`;}
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
  document.querySelectorAll("[data-osgo]").forEach(b=>b.onclick=()=>{P_().type="OSCE";mqVset({r:"service",set:"all",style:"all",status:"all",tg:Object.assign({},mqS().v.tg,{on:false})});save();mqOpen(b.dataset.osgo,undefined,"service");});
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
    h+=`<div class="trows">`+H.map((r,k)=>{const T=osTotal(r);return `<div class="crow"><button class="cn" type="button" data-osh="${esc(r.id)}"><span class="cl">ครั้ง</span>${H.length-k}</button><div style="min-width:0"><div class="cq">${osKindN(r.kind)} · ${fmtDT(r.ts)} · ${r.mode==="irl"?"IRL":"SIM"} · ${T.S.length} ข้อ</div><div class="hint">${osOpt("grade")===false?`${T.pct.toFixed(0)}%`:`เกรด <b>${osGrade(T.pct)}</b> · ${T.pct.toFixed(1)}% · ผ่าน ${T.pass}/${T.S.length} ข้อ`}${r.label?" · "+esc(r.label):""}</div></div><div class="cmeta"><button class="link" type="button" data-oshdel="${esc(r.id)}">ลบ</button></div></div>`;}).join("")+`</div>`;}
  h+=`</div>`;$("main").innerHTML=h;
  document.querySelectorAll("[data-osh]").forEach(b=>b.onclick=()=>{P.osSel=b.dataset.osh;save();go(ward+"/osr");});
  document.querySelectorAll("[data-oshdel]").forEach(b=>b.onclick=async()=>{if(!await uiAsk("ลบผลครั้งนี้?"))return;P.osHist=P.osHist.filter(x=>x.id!==b.dataset.oshdel);P.osDel=Object.assign(P.osDel||{},{[b.dataset.oshdel]:now()});save();osHistView();});}
/* ---- sync between devices (called from mergeSt) ---- */
function osMerge(l,r){const del=Object.assign({},l.osDel||{},r.osDel||{});l.osDel=del;const m=new Map();(l.osHist||[]).concat(r.osHist||[]).forEach(x=>{if(!x||del[x.id])return;const a=m.get(x.id);if(!a||(x.end||0)>=(a.end||0))m.set(x.id,x);});
  l.osHist=[...m.values()].sort((a,b)=>a.ts-b.ts).slice(-40);
  if(r.osRun&&(!l.osRun||(r.osRun.ts||0)>(l.osRun.ts||0)))l.osRun=r.osRun;if(l.osRun&&l.osHist.some(x=>x.id===l.osRun.id))l.osRun=null;
  if(r.osSet&&!l.osSet)l.osSet=r.osSet;if(r.osQ&&!l.osQ)l.osQ=r.osQ;try{osMornMerge(l,r);}catch(e){}}
/* ward home top of the OSCE tab */
function osHomeTop(L){const E=osExamCfg(),T=osTopics(),cur=osRunCur();
  let h=`<p class="hint" style="margin:6px 0 10px">${E?`สอบจริง <b>${E.n} ข้อ ข้อละ ${E.min} นาที</b> (<a href="#/${esc(ward)}/dates">แก้</a>)`:`ยังไม่ได้ตั้งจำนวนข้อ/เวลาสอบจริง (<a href="#/${esc(ward)}/dates">ตั้งที่หน้า Admit · ICU · Discharge</a>)`}${T.length?` · หัวข้อ: ${T.map(t=>esc(t.name)).join(", ")}`:""}</p>`;
  if(cur&&!rsHidden(P_(),"osrun",Math.max(cur.vt||0,cur.ts||0)))h+=rsBox("osrun",`<button class="resume" id="osHomeRes"><span>กำลังทำ <b>${osKindN(cur.kind)} OSCE</b><span class="rd">ช่องที่ ${(cur.pos||0)+1}/${cur.seq.length} — กดเพื่อทำต่อ</span></span><span class="go">→</span></button>`);
  return h;}
/* test hook for tools/smoke_site.py-style checks: read the running paper and fast-forward the clock */
window.__os={cur:()=>osRunCur(),ff:s=>{const r=osRunCur();if(r){r.left=s;r.at=now();r.paused=false;}},finish:()=>{const r=osRunCur();if(r)osFinish(r);}};
/* ================= 14 Nov 2026 (user): Morning round MEQ / OSCE · Unit round OSCE by big topic · Specialty round OSCE =================
   Extra questions the MEQ/OSCE engine can open besides the old-exam banks (mqFindU → mqXFind):
   - Morning MEQ cases (case-style MEQ wards with config "mornMEQ": Med Y4, OB-GYN Y4 MDCU): <ward dir>/morn_meq.js → W.MORN [{day:"YYYY-MM-DD", …case}]
     written ahead by Claude · the case of the day = W.MORN.find(day === mDay()) → the same case for everyone, nothing to generate on the device
     (new day at 07:30 by the device clock) · uid "MORN|<day>" · during the case nothing tells the system / source (like Legendary)
   - Unit round OSCE stations: <ward dir>/osu_<topic>.js → W.OSU (station shape of osce_b*.js + topic) · uid "OSU|<topic>|<id>"
   - Specialty round OSCE: AI stations built only from the Round I/O docs the OSCE tab sees · kept in P.osce.spc.B · uid "OSAI|…" (from osGen)
   Morning OSCE (every ward, every site): 3 stations a day per person, same rules as Morning MCQ = AC 1 (done before first, then not done) : Unit 2 (not met first)
   (short side filled from the other) · never a station that was in any earlier Morning set · state P.osce.morn {day,list,ts} + P.osce.mornH {day:{…}} */
const XQ={};   /* uid → normalized copy */
function mqNormX(q,OS){if(q._nx)return q;q._nx=1;if(!Array.isArray(q.parts)||!q.parts.length)q.parts=[{subs:q.subs||[]}];q.subs=[];
  q.parts.forEach((p,pi)=>{p.i=pi;p.subs=p.subs||[];p.subs.forEach((s,k)=>{s._p=pi;s._k=k;s._i=q.subs.length;if(OS&&!(s.tags||[]).length&&q.topic)s.tags=[q.topic];q.subs.push(s);});});
  if(q.n===undefined)q.n=0;return q;}
const xClone=o=>JSON.parse(JSON.stringify(o));
function mornMQOn(wid){const W=WARDS[wid||ward];return !!(W&&W.cfg&&W.cfg.mornMEQ);}
function mornMQAll(){const W=W_();return (W&&W.MORN||[]).map(c=>{const u="MORN|"+c.day;if(!XQ[u]){const q=mqNormX(Object.assign(xClone(c),{uid:u,set:"Morning round",ro:"",orig:dayTH(c.day),file:"Morning",page:"",title:"เคส Morning round · "+dayTH(c.day)}),false);delete q.day;q.mday=c.day;XQ[u]=q;}return XQ[u];});}
function osUnitAll(){const W=W_(),cnt={};return (W&&W.OSU||[]).map(c=>{const t=c.topic||"";cnt[t]=(cnt[t]||0)+1;const u="OSU|"+t+"|"+(c.id||cnt[t]);
  if(!XQ[u])XQ[u]=mqNormX(Object.assign(xClone(c),{uid:u,set:"Unit round",ro:osTN(t)+(c.sub?" · "+osSubNm(c.sub):""),orig:String(c.id||cnt[t]),file:c.file||"Unit",page:c.page||""}),true);return XQ[u];});}
function osSpcS(){const m=mqInitP(P_(),"OSCE");const S=m.spc=m.spc||{};S.sel=S.sel||{all:0,T:[],U:[]};["T","U"].forEach(k=>{if(!Array.isArray(S.sel[k]))S.sel[k]=[];});
  S.bag=S.bag||{sig:"",list:[]};S.list=Array.isArray(S.list)?S.list:[];S.B=S.B||{};S.pts=S.pts||{};return S;}
function osSpcQ(u){const S=osSpcS(),raw=S.B[u];if(!raw)return null;const k="S"+u;if(!XQ[k])XQ[k]=mqNormX(xClone(raw),true);return XQ[k];}
/* no case today but a later one is ready (e.g. before case 1 starts) → "รอวันจันทร์ 16 พ.ย. 07:30 เริ่มเคสที่ 1" (user 14 Nov 2026) */
function mornMQWait(){const d=mDay(),W=W_(),nx=(W&&W.MORN||[]).filter(c=>c.day>d).sort((a,b)=>a.day<b.day?-1:1)[0];if(!nx)return "ยังไม่มีเคสใหม่ — รอเติมเคส";
  const [y,m,dd]=nx.day.split("-").map(Number),wd=["วันอาทิตย์","วันจันทร์","วันอังคาร","วันพุธ","วันพฤหัสบดี","วันศุกร์","วันเสาร์"][new Date(y,m-1,dd).getDay()];
  return `รอ${wd} ${dd} ${TH_MO[m-1]} 07:30 ${nx.no?`เริ่มเคสที่ ${nx.no}`:"— เคสถัดไป"}`;}
function mqXFind(u){if(!u)return null;if(mqIsOS()){if(/^OSU\|/.test(u))return osUnitAll().find(q=>q.uid===u)||null;return osSpcQ(u);}
  if(/^MORN\|/.test(u))return mornMQAll().find(q=>q.uid===u&&q.mday<=mDay())||null;return null;}
function mqXAll(){if(mqIsOS())return osUnitAll().concat(osSpcS().list.map(osSpcQ).filter(Boolean));return mornMQAll().filter(q=>q.mday<=mDay());}
const mqXAny=()=>mqXAll().length>0;
/* records in either Phase (Morning sets are shared by both Phases, like Morning MCQ) */
function xRecs(q,kind){const m=mqInitP(P_(),kind||mqKind());return [m.a1[q.uid],m.a2[q.uid]].filter(Boolean);}
const xDone=(q,kind)=>xRecs(q,kind).some(r=>mqCaseDone(q,r));
const xTouched=(q,kind)=>xRecs(q,kind).some(r=>q.subs.some(s=>mqSubDone(q,s,r)));
/* ---- Morning round (MEQ / OSCE) ---- */
const OS_MORN_N=3,OS_MORN_AC=1;
let osMornOut=false;
function osMorn(make){const m=mqInitP(P_(),"OSCE"),d=mDay();m.mornH=m.mornH||{};let x=m.morn;
  if(x&&x.day&&x.day!==d){m.mornH[x.day]=x;x=m.morn=null;save();}
  if(x||!make)return x;
  const used=new Set();Object.values(m.mornH).forEach(h=>(h.list||[]).forEach(u=>used.add(u)));
  /* exactly like Morning MCQ (user 14 Nov 2026): old stations already done first, then old stations not done yet · Unit stations not met yet first, then ones met before ·
     1 AC + 2 Unit, a short side topped up from the other — always 3 a day while the ward still has stations never used in Morning */
  const fresh=q=>!used.has(q.uid),A=mqL(ward,"OSCE").filter(fresh),U=osUnitAll().filter(fresh),
    ac=shuffle(A.filter(q=>xTouched(q,"OSCE"))).concat(shuffle(A.filter(q=>!xTouched(q,"OSCE")))),un=shuffle(U.filter(q=>!xRecs(q,"OSCE").length)).concat(shuffle(U.filter(q=>xRecs(q,"OSCE").length)));
  let a=ac.slice(0,OS_MORN_AC),u=un.slice(0,OS_MORN_N-OS_MORN_AC);
  if(u.length<OS_MORN_N-OS_MORN_AC)a=ac.slice(0,OS_MORN_N-u.length);else if(a.length<OS_MORN_AC)u=un.slice(0,OS_MORN_N-a.length);
  const list=shuffle(a.concat(u)).map(q=>q.uid);
  osMornOut=!list.length&&used.size>0;if(!list.length)return null;
  x=m.morn={day:d,list,ts:now()};save();return x;}
/* state of the Morning MEQ case / OSCE set of day d for the current ward, whatever tab is open (P.type switched for the lookup only) */
function mqKindDo(k,fn){const P=P_(),o=P.type;P.type=k;try{return fn();}finally{P.type=o;}}
function mornXState(d){const out={},P=P_(),W=W_();if(!W)return out;
  const pc=(q,r)=>{const s=mqScoreOf(q.subs,r);return s.all&&s.tot?s.got/s.tot:null;},best=a=>{const v=a.filter(x=>x!=null);return v.length?Math.max(...v):null;};
  if((W.MORN||[]).some(c=>c.day===d)){const q=mornMQAll().find(x=>x.mday===d);if(q){const R=xRecs(q,"MEQ").filter(r=>mqCaseDone(q,r));out.meq={done:R.length>0,pct:best(R.map(r=>pc(q,r)))};}}
  const m=P.osce,x=m&&(m.morn&&m.morn.day===d?m.morn:(m.mornH||{})[d]);
  if(x&&(x.list||[]).length){const qs=mqKindDo("OSCE",()=>x.list.map(u=>mqFindU(u)).filter(Boolean)),dn=qs.filter(q=>osMDone(q,x));
    const ps=dn.map(q=>osMPct(q,x));
    out.os={done:qs.length>0&&dn.length>=qs.length,n:dn.length,tot:qs.length,pct:dn.length>=qs.length&&ps.every(v=>v!=null)?ps.reduce((a,b)=>a+b,0)/ps.length:null};}
  return out;}
/* Morning box colours for MEQ / OSCE (per exam type): green = today's case / set done, red = not yet · gold edge = done on time · aura = ≥80% */
function mornXFx(type){const s=mornXState(mDay())[type==="OSCE"?"os":"meq"];if(!s)return [];const c=[s.done?"mgood":"mwarn"];if(s.done)c.push("mgold");if(s.done&&s.pct!=null&&s.pct>=MX_GOOD)c.push("maura");return c;}
/* d = the day of the set being worked on (default today) — a set opened before 07:30 keeps its own list after the day turns (bug 26 Nov 2026: started 07:28 → after 07:30 the station showed 0/0, ← greyed, "ข้อสุดท้าย")
   answers given after the day ended still go into that set, like Morning MCQ, but do not count as ทันวัน */
function osMSet(d){const m=mqInitP(P_(),"OSCE");if(!d||d===mDay())return osMorn(false);return m.morn&&m.morn.day===d?m.morn:(m.mornH||{})[d]||null;}
function mornXList(d){d=d||mDay();if(mqIsOS()){const x=osMSet(d);return x?x.list.map(u=>mqFindU(u)).filter(Boolean):[];}const q=mqXFind("MORN|"+d);return q?[q]:[];}
function mornDayOf(u,pref){const t=mDay();if(mqIsOS()){const has=d=>{const x=osMSet(d);return !!x&&(x.list||[]).includes(u);};return has(t)?t:pref&&has(pref)?pref:null;}
  const m=/^MORN\|(.+)$/.exec(u||"");return m?m[1]:null;}
function mornXBox(type){let clock=`<span class="mclock">${type==="OSCE"?"ชุดใหม่":"เคสใหม่"}ใน <b id="mClock">${hms(mNext()-now())}</b></span>`;let t;
  if(type==="OSCE"){const x=osMorn(false);
    if(!x){const can=mqL(ward,"OSCE").length||osUnitAll().length;t=can?"🎁 ยังไม่ได้เปิดกล่องวันนี้":"🎁 ยังไม่มีสถานีให้เปิดกล่อง — รอข้อสอบเก่า OSCE / สถานี Unit round";}
    else{const L=mornXList(),dn=L.filter(q=>osMDone(q,x)).length;t=!dn&&!L.some(q=>osMTouched(q,x))?"เปิดกล่องแล้ว ยังไม่ได้ทำ — ทำด้วยนะ":dn<L.length?`วันนี้ทำไป ${dn}/${L.length} สถานี`:`✓ ครบ ${dn}/${L.length} สถานีแล้ว`;}}
  else{const P=P_(),m=mqInitP(P,"MEQ"),d=mDay(),q=mqXFind("MORN|"+d),op=m.mopen&&m.mopen[d];
    if(!q)clock="";/* waiting for a later case: the wait text already gives the day + 07:30, the countdown would point at tomorrow */
    t=!q?mornMQWait():!op?"🎁 ยังไม่ได้เปิดกล่องวันนี้":xDone(q,"MEQ")?"✓ ทำเคสวันนี้ครบแล้ว":xTouched(q,"MEQ")?"ทำไปบางส่วน — ทำต่อให้ครบนะ":"เปิดกล่องแล้ว ยังไม่ได้ทำ — ทำด้วยนะ";}
  return `<span class="mtodo${/^✓/.test(t)?" ok":""}">${t}</span>${clock}<span class="mhist" data-mhist="1">📅 ประวัติรายวัน →</span>`;}
function mornXStart(type){
  if(type==="OSCE"){const x=osMorn(true);if(!x){toast(osMornOut?"Morning round ออกครบทุกสถานีในวอร์ดนี้แล้ว — ไม่มีสถานีใหม่ที่ยังไม่เคยออก":"ยังไม่มีสถานีให้ทำ — รอข้อสอบเก่า OSCE / สถานี Unit round");return;}
    const L=mornXList(),q=L.find(z=>!osMDone(z,x))||L[0];if(!q){toast("ไม่พบสถานีของวันนี้");return;}return mqOpen(q.uid,undefined,"morning");}
  const m=mqInitP(P_(),"MEQ"),d=mDay(),q=mqXFind("MORN|"+d);if(!q){toast(mornMQWait());return;}
  m.mopen=m.mopen||{};m.mopen[d]=1;Object.keys(m.mopen).sort().slice(0,-60).forEach(k=>delete m.mopen[k]);save();mqOpen(q.uid,undefined,"morning");}
/* ---- Morning OSCE counts only what is done for THIS day's set (user 26 Nov 2026) ----
   The set draws old stations already done first, so a station's lifetime record cannot say whether it was done this morning:
   done / touched / score = a record submitted (at) or changed (ts) after the set was made (x.ts) · opening a Morning station whose record is older than the set
   starts it fresh (same as "ทำข้อนี้ใหม่" for the whole station, no question asked) so the old answers and key are not shown before answering */
const osMRecs=(q,x)=>xRecs(q,"OSCE").filter(r=>((r.at||r.ts||0)>=((x&&x.ts)||0)));
const osMDone=(q,x)=>osMRecs(q,x).some(r=>mqCaseDone(q,r));
const osMTouched=(q,x)=>xRecs(q,"OSCE").some(r=>(r.ts||0)>=((x&&x.ts)||0)&&q.subs.some(s=>mqSubDone(q,s,r)));
function osMPct(q,x){const v=osMRecs(q,x).filter(r=>mqCaseDone(q,r)).map(r=>{const s=mqScoreOf(q.subs,r);return s.all&&s.tot?s.got/s.tot:null;}).filter(v=>v!=null);return v.length?Math.max(...v):null;}
function osMornFresh(q,d){const x=osMSet(d);if(!x||!(x.list||[]).includes(q.uid))return;const A=mqA(),o=A[q.uid];if(!o||(o.ts||0)>=(x.ts||0))return;
  if(!q.subs.some(s=>mqSubDone(q,s,o))&&!Object.keys(o.t||{}).length)return;
  A[q.uid]={t:{},g:{},gm:{},c:{},cs:{},ps:0,sd:{},ts:now()};}
/* the day's results kept inside the set (x.res {uid:{p,t}}) while that day is still running — the daily history shows them as "ทันวัน" (called from mornXMark on every save) */
function osMornSnap(){const P=P_(),m=P&&P.osce,x=m&&m.morn;if(!x||x.day!==mDay()||!(x.list||[]).length)return;
  mqKindDo("OSCE",()=>x.list.forEach(u=>{const q=mqFindU(u);if(!q||!osMDone(q,x))return;const p=osMPct(q,x),pp=p==null?null:+p.toFixed(3);x.res=x.res||{};const o=x.res[u];
    if(!o)x.res[u]={p:pp,t:now()};else if(pp!=null&&(o.p==null||pp>o.p))o.p=pp;}));}
/* account sync of the Morning OSCE sets (P.osce.morn + mornH) and of the opened Morning MEQ boxes (P.meq.mopen) — before 26 Nov 2026 each device kept its own set
   one set per day on every device: same list → answers joined · different lists → the one with more stations done for it, then the one made first */
function osMornMerge(l,r){const a=mqInitP(l,"OSCE"),c=(r&&r.osce)||{};const D={};
  const prog=x=>(x.list||[]).filter(u=>[a.a1[u],a.a2[u]].some(z=>z&&(z.at||z.ts||0)>=(x.ts||0)&&(z.sub||z.ps))).length+Object.keys(x.res||{}).length;
  const pick=(x,y)=>{if(!x)return y;if(!y)return x;
    if((x.list||[]).join()===(y.list||[]).join()){const res=Object.assign({},y.res||{});for(const u in x.res||{}){const i=x.res[u],j=res[u];res[u]=!j?i:{p:i.p==null?j.p:j.p==null?i.p:Math.max(i.p,j.p),t:Math.min(i.t||9e15,j.t||9e15)};}
      const o=Object.assign({},x,{ts:Math.min(x.ts||9e15,y.ts||9e15)});if(Object.keys(res).length)o.res=res;return o;}
    const px=prog(x),py=prog(y);if(px!==py)return px>py?x:y;return (y.ts||0)<(x.ts||0)?y:x;};
  [a.mornH,c.mornH].forEach(H=>{for(const d in H||{}){const x=H[d];if(x&&x.day)D[x.day]=pick(D[x.day],x);}});
  [a.morn,c.morn].forEach(x=>{if(x&&x.day)D[x.day]=pick(D[x.day],x);});
  const ks=Object.keys(D).sort();if(ks.length){const last=ks[ks.length-1];a.morn=D[last];a.mornH={};ks.slice(0,-1).forEach(d=>{a.mornH[d]=D[d];});}
  const am=mqInitP(l,"MEQ"),cm=(r&&r.meq)||{};if(cm.mopen)am.mopen=Object.assign({},cm.mopen,am.mopen||{});}
/* ---- Morning round daily history of MEQ / OSCE (user 26 Nov 2026, ทวทว: "มันเป็นฟีเจอร์ก็ให้มีทุกที่") ----
   #/<ward>/mhist shows the exam type of the tab it was opened from (P.type); chips switch MCQ · MEQ · OSCE · tapping a station / case of an earlier day
   opens it in round "mhday" (its own list, back to the history) — today's set opens in the Morning round itself */
function mhTypes(){const o=["MCQ"];if(mornMQOn())o.push("MEQ");if(mqL(ward,"OSCE").length||osUnitAll().length)o.push("OSCE");return o;}
function mhTypeBar(t){const T=mhTypes();return T.length<2?"":`<div class="tabs" role="tablist" style="margin:0 0 12px">${T.map(k=>`<button class="tab" role="tab" type="button" aria-selected="${k===t}" data-mht="${k}">Morning ${k}</button>`).join("")}</div>`;}
function mhTypeWire(){document.querySelectorAll("[data-mht]").forEach(b=>b.onclick=()=>{P_().type=b.dataset.mht;save();mhNoJump=true;rMHist();});}
function mhOSSets(){const m=mqInitP(P_(),"OSCE");osMorn(false);const o=Object.assign({},m.mornH||{});if(m.morn&&m.morn.day)o[m.morn.day]=m.morn;return o;}
function mhDayList(d){if(mqIsOS()){const x=mhOSSets()[d];return x?(x.list||[]).map(u=>mqFindU(u)).filter(Boolean):[];}const q=mqXFind("MORN|"+d);return q?[q]:[];}
function mhOpen(d,u){const today=mDay();if(d===today&&(mqIsOS()?(osMorn(false)||{}).day===d:true)){if(!mqIsOS()){const m=mqInitP(P_(),"MEQ");m.mopen=m.mopen||{};m.mopen[d]=1;}return mqOpen(u,undefined,"morning");}
  mqVset({mhday:d});mqOpen(u,undefined,"mhday");}
function rMHistX(type){const OS=type==="OSCE",P=P_(),W=W_(),today=mDay(),rot=wRot(W.cfg),MG=mornGame(),X=P.mornX||{},pc=v=>v==null?"–":Math.round(v*100)+"%";
  P.type=type;
  const SETS=OS?mhOSSets():{},CASES={};if(!OS)(W.MORN||[]).forEach(c=>{CASES[c.day]=c;});
  const keys=Object.keys(OS?SETS:CASES).sort(),first=keys.find(k=>k<=today)||today;
  const start=rot.start||first,end=rot.end||(!OS&&keys.length&&keys[keys.length-1]>today?keys[keys.length-1]:today);
  const days=[];for(let d=start;d<=end&&days.length<400;d=addDay(d,1))days.push(d);keys.forEach(k=>{if(!days.includes(k))days.push(k);});days.sort();
  let full=0,part=0,late=0,miss=0,nDone=0,sumP=0,nP=0;
  const rows=days.map(d=>{const fut=d>today;
    if(OS){const x=SETS[d];if(!x||fut)return {d,fut,st:fut?"future":d===today?"today0":"miss"};
      const qs=mqKindDo("OSCE",()=>(x.list||[]).map(u=>mqFindU(u)).filter(Boolean)),res=x.res||{};
      const it=qs.map(q=>{const r=res[q.uid],on=d===today?osMDone(q,x):!!r,p=r&&r.p!=null?r.p:d===today&&on?osMPct(q,x):null;
        return {q,on,p,lateDone:!on&&osMDone(q,x),touch:!on&&osMTouched(q,x)};});
      const n=it.length,on=it.filter(i=>i.on).length,lt=it.filter(i=>i.lateDone).length,ps=it.filter(i=>i.on&&i.p!=null).map(i=>i.p),avg=ps.length?ps.reduce((a,b)=>a+b,0)/ps.length:null;
      const st=d===today?(n&&on>=n?"full":"today"):on>=n&&n?"full":on||lt?"part":"miss";
      return {d,x,it,n,on,lt,avg,st};}
    const c=CASES[d];if(fut)return {d,fut,st:c?"future":"none"};if(!c)return {d,st:"none"};
    const q=mqXFind("MORN|"+d);if(!q)return {d,st:"none"};const x=X[d]||{},onT=!!x.meq,dn=xDone(q,"MEQ"),tc=xTouched(q,"MEQ");
    let p=onT?(x.meqP||null):null;if(p==null&&dn){const s=mqKindDo("MEQ",()=>{const R=xRecs(q,"MEQ").filter(r=>mqCaseDone(q,r)).map(r=>{const s=mqScoreOf(q.subs,r);return s.all&&s.tot?s.got/s.tot:null;}).filter(v=>v!=null);return R.length?Math.max(...R):null;});p=s;}
    const st=onT?"full":d===today?(dn?"full":"today"):dn?"late":tc?"part":"miss";
    return {d,q,c,onT,dn,tc,p,st};});
  rows.forEach(r=>{if(r.d>today)return;if(r.st==="full")full++;else if(r.st==="part")part++;else if(r.st==="late")late++;else if(r.st==="miss")miss++;
    if(OS&&r.it){nDone+=r.on;r.it.forEach(i=>{if(i.on&&i.p!=null){sumP+=i.p;nP++;}});}else if(!OS&&r.q&&(r.onT||r.dn)){nDone++;if(r.p!=null){sumP+=r.p;nP++;}}});
  const UNIT=OS?"สถานี":"เคส";
  let h=mhTypeBar(type)+`<h1 class="h2">ประวัติ Morning round ${type}</h1><p class="sub">ทุกวันของวอร์ดนี้${rot.start?` (${dayTH(rot.start)} – ${dayTH(rot.end||end)})`:""} · วันนับตั้งแต่ 07:30 ถึง 07:29 ของวันถัดไป · ${OS?"วันละ 3 สถานี · แตะวันที่เพื่อดูสถานีของวันนั้น แล้วแตะสถานีเพื่อเปิดดูคำตอบ/เฉลย":"วันละ 1 เคส · แตะวันที่แล้วแตะเคสเพื่อเปิดดูคำตอบ/เฉลย"} · "ทันวัน" = ทำเสร็จภายในวันนั้น · เรียงจากวันแรกลงมา เปิดหน้ามาจะเลื่อนไปที่วันนี้ให้</p>`;
  h+=`<div class="card mhsum"><div><b>${full}</b><span>${OS?"วันที่ทำครบทันวัน":"เคสที่ทำครบทันวัน"}</span></div><div><b>${OS?part:late}</b><span>${OS?"ทำไม่ครบ":"ทำภายหลัง"}</span></div><div><b class="${miss?"bad":""}">${miss}</b><span>ไม่ได้ทำ</span></div><div><b>${nDone}</b><span>${UNIT}ที่ทำทันวัน</span></div><div><b>${nP?Math.round(sumP/nP*100)+"%":"–"}</b><span>คะแนนเฉลี่ย</span></div><div><b>🔥 ${MG.fire}</b><span>ไฟติดกัน (ใช้ร่วม MCQ · MEQ · OSCE)</span></div><div><b>🏅 ${MG.medals}</b><span>วันที่ได้เหรียญ</span></div></div>`;
  h+=`<p class="hint" style="margin:6px 0 10px">ผ่านมาแล้ว ${rows.filter(r=>r.d<=today).length} จาก ${rows.length} วัน${HAS_CLAUDE()?" · ประวัตินี้เก็บแยกในเว็บกับใน Claude (เข้าสู่ระบบในเว็บเพื่อรวมหลายเครื่อง)":""}</p><div class="mhlist">`;
  rows.forEach(r=>{const d=r.d,isT=d===today;
    const lab=r.st==="future"?`<span class="mhs fut">ยังไม่ถึง</span>`:r.st==="none"?`<span class="mhs fut">ไม่มีเคสวันนี้</span>`:r.st==="miss"?`<span class="mhs miss">${OS&&!r.x?"ไม่ได้เปิดกล่อง":"ไม่ได้ทำ"}</span>`
      :r.st==="today0"?`<span class="mhs part">🎁 ยังไม่ได้เปิดกล่องวันนี้</span>`
      :OS?(r.st==="today"?`<span class="mhs part">${r.on?`วันนี้ทำไป ${r.on}/${r.n} สถานี`:"เปิดกล่องแล้ว ยังไม่ได้ทำ"}</span>`:r.st==="part"?`<span class="mhs part">ทันวัน ${r.on}/${r.n}${r.lt?` · ทำภายหลัง ${r.lt}`:""}</span>`:`<span class="mhs ok">ครบ ${r.on}/${r.n} ทันวัน</span>`)
      :(r.st==="today"?`<span class="mhs part">${r.tc?"ทำไปบางส่วน — ทำต่อให้ครบนะ":(mqInitP(P,"MEQ").mopen||{})[d]?"เปิดกล่องแล้ว ยังไม่ได้ทำ":"🎁 ยังไม่ได้เปิดกล่องวันนี้"}</span>`:r.st==="late"?`<span class="mhs part">ทำภายหลัง (ไม่ทันวัน)</span>`:r.st==="part"?`<span class="mhs part">ทำค้างไว้</span>`:`<span class="mhs ok">✓ ทำครบทันวัน</span>`);
    const sc=OS?(r.it&&r.on?`<span class="mhr">คะแนนเฉลี่ย <b>${pc(r.avg)}</b> (${r.on} สถานีที่ทำทันวัน)</span>`:""):(r.q&&r.dn?`<span class="mhr">คะแนน <b>${pc(r.p)}</b>${r.onT?"":" (ทำภายหลัง)"}</span>`:"");
    const head=`<span class="mhd${isT?" now":""}">${dayTH(d)}</span>${mhFire(d,today,MG)}${lab}${sc}`;
    const fx=d>today||r.st==="none"||r.st==="today0"?[]:OS?(()=>{if(!r.it)return isT?[]:["mred"];const c=[r.on>=r.n&&r.n?"mgood":"mred"];if(r.on>=r.n&&r.n)c.push("mgold");if(r.on>=r.n&&r.avg!=null&&r.avg>=MX_GOOD)c.push("maura");return c;})()
      :(()=>{const c=[r.onT||(isT&&r.dn)?"mgood":"mred"];if(r.onT)c.push("mgold");if(r.onT&&r.p!=null&&r.p>=MX_GOOD)c.push("maura");return c;})();
    const id=(isT?' id="mhToday"':"")+(fx.length?` data-fx="${fx.join(" ")}"`:"")+(fx.includes("maura")?` style="${auraVars(d)}"`:"");const fxc=fx.length?" "+fx.join(" "):"";
    const items=OS?(r.it||[]).map(i=>{const q=i.q,res=i.on?`<span class="mhx ok">✓ ทันวัน · ${pc(i.p)}</span>`:i.lateDone?`<span class="mhx no">ทำภายหลัง</span>`:i.touch?`<span class="mhx no">ทำค้าง</span>`:`<span class="mhx na">ไม่ได้ทำ</span>`;
        const src=/^OSU\|/.test(q.uid)?`Unit · ${esc(q.ro||"")}`:`AC ${esc(q.set)} ${esc(q.ro||"")} · ข้อ ${esc(mqNum(q))} · ${esc(osTN(q.topic||""))}`;
        return `<li><button class="mhopen" type="button" data-mxd="${esc(d)}" data-mxu="${esc(q.uid)}"><span class="mhsrc">${src}</span><span class="mhst">${esc(plain(q.stem||"").slice(0,110))}${plain(q.stem||"").length>110?"…":""}</span>${res}</button></li>`;})
      :(r.q?[(()=>{const q=r.q,res=r.onT?`<span class="mhx ok">✓ ทันวัน · ${pc(r.p)}</span>`:r.dn?`<span class="mhx no">ทำภายหลัง · ${pc(r.p)}</span>`:r.tc?`<span class="mhx no">ทำค้าง</span>`:`<span class="mhx na">ไม่ได้ทำ</span>`;
        return `<li><button class="mhopen" type="button" data-mxd="${esc(d)}" data-mxu="${esc(q.uid)}"><span class="mhsrc">${r.c&&r.c.no?`เคสที่ ${esc(r.c.no)}`:"เคสประจำวัน"} · ${q.parts.length} Part</span><span class="mhst">${esc(plain(q.stem||"").slice(0,110))}${plain(q.stem||"").length>110?"…":""}</span>${res}</button></li>`;})()]:[]);
    if(!items.length){h+=`<div class="mhrow${fxc}"${id}>${head}</div>`;return;}
    h+=`<details class="mhrow${fxc}"${id}${isT?" open":""}><summary>${head}</summary><ol class="mhq">${items.join("")}</ol></details>`;});
  h+=`</div>`;
  $("main").innerHTML=h;mhTypeWire();
  {const t=$("mhToday");if(!mhNoJump&&t&&rows.indexOf(rows.find(r=>r.d===today))>2)setTimeout(()=>t.scrollIntoView({block:"start"}),30);mhNoJump=false;}
  document.querySelectorAll("[data-mxd]").forEach(b=>b.onclick=()=>mhOpen(b.dataset.mxd,b.dataset.mxu));}
/* ---- Unit round OSCE: by big topic ---- */
/* Unit round OSCE works like Unit round MCQ (user 22 Nov 2026, ทวทว): no picking stations from a list — choose big topics (none = all) and small topics (none = all),
   how many to draw (any number), then a random set is drawn every time (repeats across rounds allowed) · v.utops = big topics · v.usubs = small topics · v.un = count · v.ul = this round's stations */
const OS_SUBN={PBS:"Blood smear"};   /* display names of small topics (the data keeps the engine name, e.g. q.sub "PBS") */
const osSubNm=s=>OS_SUBN[s]||s;
function osUnitPool(v){const T=v.utops||[],S=v.usubs||[];return osUnitAll().filter(q=>(!T.length||T.includes(q.topic))&&(!S.length||S.includes(osSubOf(q)||"อื่น ๆ")));}
function osUnitList(v){const A=osUnitAll();return (v.ul||[]).map(u=>A.find(q=>q.uid===u)).filter(Boolean);}
function osUnitCnt(){const A=osUnitAll();return `<span class="rcnt">มี <b>${A.length}</b> สถานี · ${osTopics().length} หัวข้อใหญ่</span>`;}
/* same layout as Unit round MCQ (rUnit): count · stacked topic buttons (multi-select, none = all) · statline · ล้างที่เลือก / เริ่มทำ n */
function osUnitPicker(v){const A=osUnitAll(),T=osTopics(),TS=v.utops||[],SS=v.usubs||[],n=Math.max(1,Math.round(+v.un||10)),seen=L=>L.filter(q=>xRecs(q,"OSCE").length).length;
  if(!A.length)return `<div class="card"><h3>ยังไม่มีสถานี Unit round ในวอร์ดนี้</h3><span class="rd" style="margin:0">ส่งไฟล์ให้ Claude แล้วจะแต่งสถานีให้ตามหัวข้อ OSCE ของวอร์ด</span></div>`;
  const btn=(attr,k,on,title,L)=>`<button class="resume qprog" type="button" ${attr}="${esc(k)}" aria-pressed="${on}"${L.length?"":" disabled"}><span><b>${esc(title)}</b><span class="rd">${L.length?`เคยเจอแล้ว ${seen(L)}/${L.length} สถานี`:"ยังไม่มีสถานี — มีแค่หัวข้อไว้ก่อน"}</span></span><span class="go">${on?"✓":""}</span></button>`;
  let h=nPickHTML("osu",n,"สถานี");
  h+=`<div class="yh" style="font-family:var(--num);font-weight:700;margin:14px 0 6px">หัวข้อใหญ่ <span class="hint" style="font-weight:400">เลือกได้หลายหัวข้อ · ไม่เลือกเลย = สุ่มรวมทุกหัวข้อ · ตัวเลข = เคยเจอแล้ว/ทั้งหมด</span></div><div class="chips" style="margin:0 0 6px">${saBtn("[data-utop]")}</div><div class="stack" style="margin-top:0">${T.map(t=>btn("data-utop",t.id,TS.includes(t.id),t.name,A.filter(q=>q.topic===t.id))).join("")}</div>`;
  const inT=A.filter(q=>!TS.length||TS.includes(q.topic)),by={};inT.forEach(q=>{const k=osSubOf(q)||"อื่น ๆ";(by[k]=by[k]||[]).push(q);});
  const ks=Object.keys(by).sort((x,y)=>by[y].length-by[x].length);
  if(ks.length>1||(ks.length===1&&ks[0]!=="อื่น ๆ"))h+=`<div class="yh" style="font-family:var(--num);font-weight:700;margin:14px 0 6px">หัวข้อเล็ก <span class="hint" style="font-weight:400">เลือกได้หลายหัวข้อ · ไม่เลือกเลย = สุ่มคละทุกหัวข้อเล็ก</span></div><div class="chips" style="margin:0 0 6px">${saBtn("[data-usub]")}</div><div class="stack" style="margin-top:0">${ks.map(k=>btn("data-usub",k,SS.includes(k),osSubNm(k),by[k])).join("")}</div>`;
  const pool=osUnitPool(v),lab=TS.length===1?osTN(TS[0]):TS.length?`จาก ${TS.length} หัวข้อที่เลือก`:"สุ่มรวมทุกหัวข้อ";
  h+=`<p class="statline" style="margin-top:10px">${esc(lab)}${SS.length?" · "+esc(SS.map(osSubNm).join(", ")):""} · มีสถานี ${pool.length} สถานี (เคยเจอแล้ว ${seen(pool)})</p><div class="row2"><button class="btn ghost" id="osUClr" type="button" ${TS.length||SS.length?"":"disabled"}>ล้างที่เลือก</button><span class="spacer"></span><button class="btn primary" id="osUGo" type="button" ${pool.length?"":"disabled"}>เริ่มทำ ${Math.min(n,pool.length)} สถานี</button></div>`;
  return h;}
function osUnitWire(v){
  nPickWire("osu",x=>{mqVset({un:x});save();mqRList();});
  const tog=(a,k)=>a.includes(k)?a.filter(x=>x!==k):a.concat(k);
  document.querySelectorAll("[data-utop]").forEach(b=>b.onclick=()=>{const T=tog(v.utops||[],b.dataset.utop),A=osUnitAll().filter(q=>!T.length||T.includes(q.topic)),ok=new Set(A.map(q=>osSubOf(q)||"อื่น ๆ"));mqVset({utops:T,usubs:(v.usubs||[]).filter(k=>ok.has(k))});save();mqRList();});
  document.querySelectorAll("[data-usub]").forEach(b=>b.onclick=()=>{mqVset({usubs:tog(v.usubs||[],b.dataset.usub)});save();mqRList();});
  {const c=$("osUClr");if(c)c.onclick=()=>{mqVset({utops:[],usubs:[]});save();mqRList();};}
  {const g=$("osUGo");if(g)g.onclick=()=>{const n=Math.max(1,Math.round(+v.un||10)),L=shuffle(osUnitPool(v)).slice(0,n).map(q=>q.uid);if(!L.length)return;mqVset({ul:L});save();mqOpen(L[0],undefined,"unit");};}}
/* ---- Specialty round OSCE (#/<ward>/osspc) ---- */
var OSSPC={busy:0,err:""};
const osSpcUnits=()=>spcUnits(ward,"OSCE");
function osSpcPool(){const S=osSpcS(),us=osSpcUnits();if(S.sel.all)return us;return us.filter(u=>S.sel.U.includes(u.key)||u.topics.some(t=>S.sel.T.includes(t)));}
function osSpcPick(){const S=osSpcS(),pool=osSpcPool();if(!pool.length)return null;const sig=pool.map(u=>u.key).sort().join("|"),by={};pool.forEach(u=>by[u.key]=u);
  let L=(S.bag.sig===sig?S.bag.list:[]).filter(k=>by[k]);if(!L.length){L=shuffle(pool.map(u=>u.key));if(L.length>1&&L[0]===S.bag.last)L.push(L.shift());}
  const k=L.shift();S.bag={sig,list:L,last:k};return by[k];}
function osSpcList(){return osSpcS().list.map(osSpcQ).filter(Boolean);}
async function osSpcNext(){if(OSSPC.busy){toast("กำลังสร้างสถานีอยู่…");return;}if(!osAiOK()){toast("ต้องมี AI — เปิดใน Claude หรือใส่ API key ที่หน้า Specialty round");return go(ward+"/osspc");}
  const src=osSpcPick();if(!src){toast("เลือกเรื่อง / ไฟล์ก่อน");return go(ward+"/osspc");}
  const S=osSpcS();OSSPC.busy=1;OSSPC.err="";if(view==="osspc")osSpcView();else toast("⏳ กำลังสร้างสถานีใหม่…");
  try{const E=osExamCfg(),sl={topic:"*",src:src.text.slice(0,9000),srcLabel:spcLabel(src),avoidPts:(S.pts[src.key]||[]).slice(-12)};
    const q=await osGen({seq:[],per:(E?E.min:5)*60},sl);
    q.set="Specialty";q.ro="";q.orig=String(S.list.length+1);q.srcRes=spcLabel(src);q.srcKey=src.key;
    if(q.imgAlt)q.stem+=`<p class="gray">🖼 รูปที่โจทย์ให้ดู (คำบรรยายแทนรูป): ${q.imgAlt}</p>`;
    q.notes=`📄 ที่มา: ${esc(q.srcRes)}${q.imgNeed?`<br>🖼 รูปที่ควรใช้: ${q.imgNeed}`:""}`;
    S.B[q.uid]=q;S.list.push(q.uid);while(S.list.length>80){const o=S.list.shift();delete S.B[o];}
    S.pts[src.key]=(S.pts[src.key]||[]).concat(sl.point||q.title).slice(-12);S.ts=now();save();OSSPC.busy=0;mqOpen(q.uid,undefined,"spc");}
  catch(e){OSSPC.busy=0;OSSPC.err=e&&e.code==="rate_limited"?"ใช้ AI ถี่เกินไป ลองใหม่อีกสักครู่":e&&e.code==="invalid_json"?"AI ตอบกลับในรูปแบบที่อ่านไม่ได้ ลองใหม่":"สร้างสถานีไม่สำเร็จ ลองใหม่";toast(OSSPC.err);if(view==="osspc")osSpcView();}}
function osSpcView(){const S=osSpcS(),sel=S.sel,us=osSpcUnits(),pool=osSpcPool(),tab=st.osSpcTb==="F"?"F":"TP";$("nav").hidden=true;
  let h=`<div class="whead"><h1 class="h2">Specialty round · OSCE</h1><a href="#/${esc(ward)}">กลับหน้าวอร์ด</a></div><p class="sub">สถานี OSCE ใหม่ที่ AI สร้างทีละสถานี <b>เนื้อหาจาก Round I/O ของแท็บ OSCE เท่านั้น</b> (ไฟล์ของแท็บ OSCE + ไฟล์ที่ใช้ร่วม) · เลือกตามเรื่องหรือตามไฟล์ ปนกันได้ หรือสุ่มทั้งหมด · ทำทีละสถานี ไม่จับเวลา</p>`;
  if(!us.length)h+=`<div class="card"><h3>ยังไม่มีไฟล์ใน Round I/O ของแท็บ OSCE</h3><span class="rd" style="margin:0">ส่งไฟล์ให้ Claude สรุปเข้า Round I/O ก่อน แล้ว Specialty round ของ OSCE จะใช้ได้</span></div>`;
  else{const T=new Map();us.forEach(u=>u.topics.forEach(t=>{if(!T.has(t))T.set(t,[]);T.get(t).push(u);}));
    const dim=sel.all?' style="opacity:.55"':"",row=(attr,on,title,meta)=>`<button class="resume qprog" ${attr} aria-pressed="${on}"${dim}><span><b>${esc(title)}</b>${meta?`<span class="rd">${meta}</span>`:""}</span><span class="go">${on?"✓":""}</span></button>`;
    h+=`<div class="tools spcquick"><button class="tool" id="ospAll" aria-pressed="${!!sel.all}">🎲 สุ่มทั้งหมด${sel.all?" ✓":""}</button><button class="tool" id="ospClr">ล้างที่เลือก</button></div>`;
    h+=`<div class="chips spctabs">${[["TP","ตามเรื่อง",T.size],["F","ตามไฟล์",us.length]].map(([k,n,c])=>`<button class="chip" data-osptab="${k}" aria-pressed="${tab===k}">${n} <span class="hint">${c}</span></button>`).join("")}</div><div class="stack" style="margin-top:8px">`;
    if(tab==="TP")for(const [t,xs] of T)h+=row(`data-osptopic="${esc(t)}"`,sel.T.includes(t),t,`${xs.length} หน้า`);
    else us.forEach(u=>{h+=row(`data-ospunit="${esc(u.key)}"`,sel.U.includes(u.key),spcLabel(u),u.topics.join(", "));});
    h+=`</div><p class="statline" style="margin-top:12px">${sel.all?`สุ่มจากทุกหน้า <b>${pool.length}</b> หน้า`:pool.length?`เลือกแล้ว <b>${pool.length}</b> หน้า`:"ยังไม่ได้เลือก — แตะเรื่อง / ไฟล์ ด้านบน หรือกด 🎲 สุ่มทั้งหมด"}</p>`;
    if(!osAiOK())h+=osAiBtns("/osspc");
    h+=OSSPC.busy?`<p class="hint">⏳ AI กำลังสร้างสถานี…</p>`:`<div class="row2"><span class="spacer"></span><button class="btn primary" id="ospGo" ${pool.length&&osAiOK()?"":"disabled"}>สร้างสถานีใหม่</button></div>`;
    if(OSSPC.err)h+=`<p class="hint">${esc(OSSPC.err)}</p>`;}
  const L=osSpcList();if(L.length){h+=`<div class="card"><h3>สถานี Specialty ของฉัน (${L.length})</h3><span class="rd">เปิดดูโจทย์และเฉลยเก่าได้ตลอด · ล่าสุดอยู่บน</span><div class="trows" style="margin-top:8px">${L.slice().reverse().slice(0,40).map(q=>`<button class="resume" data-ospopen="${esc(q.uid)}"><span><b>${esc(q.title||"สถานี")}</b><span class="rd">${esc(osTN(q.topic))} · ${esc(q.srcRes||"")}${xDone(q,"OSCE")?" · ✓ ทำแล้ว":""}</span></span><span class="go">→</span></button>`).join("")}</div></div>`;}
  $("main").innerHTML=h;
  const re=()=>{S.ts=now();save();osSpcView();},tg=(a,x)=>{const i=a.indexOf(x);if(i<0)a.push(x);else a.splice(i,1);};
  document.querySelectorAll("[data-osptab]").forEach(b=>b.onclick=()=>{st.osSpcTb=b.dataset.osptab;persist();osSpcView();});
  document.querySelectorAll("[data-osptopic]").forEach(b=>b.onclick=()=>{sel.all=0;tg(sel.T,b.dataset.osptopic);re();});
  document.querySelectorAll("[data-ospunit]").forEach(b=>b.onclick=()=>{sel.all=0;tg(sel.U,b.dataset.ospunit);re();});
  document.querySelectorAll("[data-ospopen]").forEach(b=>b.onclick=()=>mqOpen(b.dataset.ospopen,undefined,"spc"));
  {const b=$("ospAll");if(b)b.onclick=()=>{sel.all=sel.all?0:1;re();};}
  {const b=$("ospClr");if(b)b.onclick=()=>{sel.all=0;sel.T=[];sel.U=[];re();};}
  {const b=$("ospGo");if(b)b.onclick=()=>osSpcNext();}}
