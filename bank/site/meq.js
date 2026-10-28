/* ================= MEQ (modified essay question) =================
   โครงสร้าง: ข้อ (case) → parts[] = ชุด part ที่เปิดพร้อมกัน (มีข้อมูลใหม่คั่น = เปิดทีละชุด) → subs[] = Part (คำถามย่อย)
   สไตล์ 1 = case-based (มีเคส + Part ต่อเนื่อง) · สไตล์ 2 = short answer (q.sa: ข้อเดียวจบ ไม่มี part)
   ไฟล์นี้ต่อหน้า app.js ใน <script> เดียวกัน — ใช้ของใน app.js ได้เฉพาะตอนเรียกฟังก์ชัน (ห้ามอ้างที่ top level)
   ความคืบหน้า: P.meq = {a1:{uid:rec}, a2:{uid:rec}, star:{uid:[on,ts]}, v:{…มุมมองปัจจุบัน}} · rec = {t,g,gm,c,cs,kg,ai,ps,sd,reo,pz,pt,time,sub,ts} */
var MQT=null,MQTi=null,MQsaveT=null;var MQAI={busy:{},err:{}};
/* OSCE uses this same engine: stations = W.OS (osce_b*.js, one Part — every sub-question opens together), progress = P.osce (MEQ = W.MQ / P.meq).
   Which one is in use follows the ward's exam-type tab (P.type), or an explicit kind ("MEQ" | "OSCE"). */
function mqKind(wid){wid=wid||ward;const P=wid&&st.w&&st.w[wid];return P&&P.type==="OSCE"?"OSCE":"MEQ";}
const mqKN=()=>mqKind();
const mqIsOS=()=>mqKind()==="OSCE";
function mqL(wid,kind){wid=wid||ward;const W=WARDS[wid];if(!W)return [];kind=kind||mqKind(wid);const OS=kind==="OSCE",L=OS?(W.OS||(W.OS=[])):(W.MQ||(W.MQ=[]));
  if(!L._ok){L._ok=1;const seen={};L.forEach((q,n)=>{if(!Array.isArray(q.parts)||!q.parts.length)q.parts=[{subs:q.subs||[]}];q.subs=[];
    q.parts.forEach((p,pi)=>{p.i=pi;p.subs=p.subs||[];p.subs.forEach((s,k)=>{s._p=pi;s._k=k;s._i=q.subs.length;if(OS&&!(s.tags||[]).length&&q.topic)s.tags=[q.topic];q.subs.push(s);});});
    let u=(OS?"OS|":"MQ|")+q.set+"|"+q.file+"|"+q.page+"|"+q.orig;if(seen[u])u+="#"+(++seen[u]);else seen[u]=1;q.uid=u;q.n=n;})
    /* files are loaded meq_b1, b2, b3 … — keep each set together in the order its first file appears (ไฟล์ดำ p1–5, p6–15 …, then short ans …) */
    const so=[...new Set(L.map(q=>q.set))];L.sort((a,b)=>so.indexOf(a.set)-so.indexOf(b.set)||a.n-b.n);L.forEach((q,i)=>{q.n=i;});}
  return L;}
function mqInitP(P,kind){const K=(kind||(P&&P.type==="OSCE"?"OSCE":"MEQ"))==="OSCE"?"osce":"meq";const m=P[K]=P[K]||{};m.a1=m.a1||{};m.a2=m.a2||{};m.star=m.star||{};m.v=m.v||{};const v=m.v;
  v.set=v.set||"all";v.sec=v.sec||"all";v.status=v.status||"all";v.style=v.style||"all";v.tags=Array.isArray(v.tags)?v.tags:[];v.gl=Array.isArray(v.gl)?v.gl:[];return m;}
function mqS(){return mqInitP(P_());}
function mqA(){return mqS()["a"+ph()];}
function mqRec(q){return mqA()[q.uid];}
function mqEns(q){const A=mqA();return A[q.uid]||(A[q.uid]={t:{},g:{},gm:{},c:{},cs:{},ps:0,sd:{},ts:now()});}
function mqTouch(q){const r=mqRec(q);if(r)r.ts=now();}
function mqSave(q){if(q)mqTouch(q);clearTimeout(MQsaveT);save();}
function mqVset(o){const v=mqS().v;Object.assign(v,o);v.ts=now();}
const MQ_STY=[["all","ทุกแบบ"],["case","Case (สไตล์ 1)"],["sa","Short answer (สไตล์ 2)"]];
function mqStyOk(q,sty){sty=sty||mqS().v.style;if(mqIsOS())return sty==="all"||!["ex","noex"].includes(sty)||(sty==="ex"?!!q.ex:!q.ex);return sty==="all"||(sty==="sa"?!!q.sa:!q.sa);}
const OS_STY=[["all","ทุกข้อ"],["noex","ไม่มีอาจารย์"],["ex","มีอาจารย์"]];
const mqSTY=()=>mqIsOS()?OS_STY:MQ_STY;
function mqNum(q){return String(q.orig||q.n+1).replace(/^ข้อ\s*/,"");}
function mqTitle(q){return q.title||plain(q.gray||"").replace(/^\d+(\.\d+)?\.?\s*/,"")||plain(q.stem).slice(0,70);}
function mqGL(q,pi){if(mqIsOS())return "ทุกข้อย่อย";const S=q.parts[pi].subs;if(!S.length)return "Part";const a=S[0]._i+1,b=S[S.length-1]._i+1;return a===b?"Part "+a:"Part "+a+"–"+b;}
function mqReo(r,i){return !!(r&&r.reo&&r.reo[i]);}
function mqPs(q,r){r=r||mqRec(q);if(!r)return 0;let p=r.ps||0;while(p<q.parts.length&&q.parts[p].subs.every(s=>r.sd&&r.sd[s._i]&&!mqReo(r,s._i)))p++;return p;}
function mqSubDone(q,s,r){r=r||mqRec(q);if(!r||mqReo(r,s._i))return false;return s._p<(r.ps||0)||!!(r.sd&&r.sd[s._i]);}
function mqCaseDone(q,r){r=r||mqRec(q);return !!(r&&(r.sub||mqPs(q,r)>=q.parts.length));}
function mqAnyDone(q){const r=mqRec(q);return !!r&&q.subs.some(s=>mqSubDone(q,s,r));}
function mqMk(s){return +s.marks||1;}
/* score of one sub as 0–1: MEQ = self grade 2/1/0 · OSCE = share of checklist points ticked (OSCE key = ต้องมีคำนี้ / ต้องได้ n จาก m) unless the grade was picked by hand */
function mqFrac(s,r){const i=s._i,g=r&&r.g&&r.g[i];if(g===undefined||g===null)return null;
  if(mqIsOS()&&!(r.gm&&r.gm[i])&&(s.points||[]).length){const c=mqTicks(s,r);if(c.length){const sc=mqPtsScore(s,c);if(sc.tot)return sc.got/sc.tot;}}return g/2;}
function mqScoreOf(subs,r){let tot=0,got=0,graded=0,full=0;subs.forEach(s=>{const m=mqMk(s);tot+=m;const f=mqFrac(s,r);if(f!==null){graded++;got+=m*f;if(f>=1)full++;}});
  return {tot,got,graded,full,n:subs.length,all:graded===subs.length,perfect:full===subs.length};}
function mqScore(q){const r=mqRec(q);if(!r||!mqCaseDone(q,r))return null;return mqScoreOf(q.subs,r);}
function mqStar(q){const s=mqS().star[q.uid];return !!(s&&s[0]);}
const mqPct=p=>p>=80?"var(--right)":p>=50?"var(--warn)":"var(--wrong)";
const mqFmt=sec=>{sec=Math.max(0,Math.round(sec||0));return Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0");};
const mqNl=s=>esc(s).replace(/\n/g,"<br>");
function mqImg(k){return IMGS[k]?`<figure>${imgHTML(k,"ภาพจากไฟล์ต้นฉบับ",1)}<figcaption>จากไฟล์ต้นฉบับ</figcaption></figure>`:"";}
function mqRich(s){return String(s||"").replace(/\{\{IMG:(\w+)\}\}/g,(m,k)=>mqImg(k));}
function mqImgs(x,note){if(!x)return note?`<div class="img-missing">🖼 ${note}</div>`:"";const L=[].concat(x).filter(k=>IMGS[k]);return L.length?`<div class="stem-img">${L.map(k=>imgHTML(k,"ภาพประกอบโจทย์",1)).join("")}${note?`<div class="img-note">${note}</div>`:""}</div>`:"";}
function mqTopics(){const W=W_(),T=((mqIsOS()?W.cfg.osceTopics:W.cfg.meqTopics)||[]).map(t=>Array.isArray(t)?t:[t.id,t.name]),have=new Set();mqL().forEach(q=>q.subs.forEach(s=>(s.tags||[]).forEach(t=>have.add(t))));
  const o=T.filter(([k])=>have.has(k));have.forEach(k=>{if(!o.some(x=>x[0]===k))o.push([k,k]);});return o;}
const mqTN=k=>(mqTopics().find(x=>x[0]===k)||[k,k])[1];
/* ---- topic context (Unit round): only Parts tagged with a chosen topic ---- */
const mqTM=()=>mqS().v.ctx==="topic";
const mqTmatch=s=>(s.tags||[]).some(t=>mqS().v.tags.includes(t));
const mqTsubs=(q,pi)=>q.parts[pi].subs.filter(mqTmatch);
function mqTDone(q,pi){const r=mqRec(q);return !!r&&mqTsubs(q,pi).every(s=>mqSubDone(q,s,r));}
function mqTParts(q){return q.parts.filter(p=>p.subs.some(mqTmatch)).map(p=>p.i);}
function mqFirstT(q){const ps=mqTParts(q);const f=ps.find(pi=>!mqTDone(q,pi));return f!==undefined?f:(ps[0]||0);}
function mqViewable(q,pi){if(pi<0||pi>=q.parts.length)return false;return mqTM()?q.parts[pi].subs.some(mqTmatch):pi<=mqPs(q);}
function mqDefPart(q){return mqTM()?mqFirstT(q):Math.min(mqPs(q),q.parts.length-1);}
function mqReoIds(q,pi){const r=mqRec(q);return r?(mqTM()?mqTsubs(q,pi):q.parts[pi].subs).filter(s=>mqReo(r,s._i)).map(s=>s._i):[];}
function mqCur(){const v=mqS().v,q=mqL().find(x=>x.uid===v.u);if(!q)return null;let pi=+v.pi||0;if(!mqViewable(q,pi))pi=v.pi=mqDefPart(q);return {q,pi};}
function mqPDone(q,pi){return mqTM()?mqTDone(q,pi):pi<mqPs(q);}
function mqAnswering(){if(view!=="mq")return false;const c=mqCur();if(!c)return false;const {q,pi}=c;return !mqPDone(q,pi)||mqReoIds(q,pi).length>0;}
function mqPaused(){const c=mqCur(),r=c&&mqRec(c.q);return !!(r&&r.pz&&r.pz[c.pi]);}
/* ---- count-up timer (every MEQ question; pauses when the page is hidden or you leave) ---- */
function mqTStart(){if(mqIsOS()||!mqAnswering()||mqPaused())return;const c=mqCur();if(!MQT)MQT={u:c.q.uid,pi:c.pi,p:ph(),w:ward,k:mqKind()==="OSCE"?"osce":"meq",t0:now()};clearInterval(MQTi);MQTi=setInterval(mqTPaint,1000);mqTPaint();}
function mqTStop(){clearInterval(MQTi);MQTi=null;if(MQT){const x=MQT;MQT=null;const P=st.w&&st.w[x.w];const M=P&&P[x.k||"meq"],r=M&&M["a"+x.p]&&M["a"+x.p][x.u];
  if(r){const dt=Math.max(0,(now()-x.t0)/1000);r.time=(r.time||0)+dt;r.pt=r.pt||{};r.pt[x.pi]=(r.pt[x.pi]||0)+dt;r.ts=now();persist();cloudPush();}}}
function mqElapsed(q,pi){const r=mqRec(q)||{},live=MQT&&MQT.u===q.uid?(now()-MQT.t0)/1000:0;return {all:(r.time||0)+live,part:((r.pt&&r.pt[pi])||0)+(MQT&&MQT.u===q.uid&&MQT.pi===pi?live:0)};}
function mqTPaint(){const el=$("mqTimer");if(!el){if(view!=="mq")mqTStop();return;}const c=mqCur();if(!c)return;const e=mqElapsed(c.q,c.pi),multi=c.q.parts.length>1;
  el.classList.toggle("paused",mqPaused());el.textContent=(mqPaused()?"⏸ ":"⏱ ")+(multi?`${mqGL(c.q,c.pi)} ${mqFmt(e.part)} · ทั้งข้อ ${mqFmt(e.all)}`:mqFmt(e.all));}
document.addEventListener("visibilitychange",()=>{try{if(document.visibilityState==="hidden")mqTStop();else if(view==="mq")mqTStart();}catch(e){}});
function mqTogglePause(){const c=mqCur();if(!c||!mqAnswering())return;const x=mqEns(c.q);x.pz=x.pz||{};if(x.pz[c.pi]){delete x.pz[c.pi];mqSave(c.q);mqView();}else{mqTStop();x.pz[c.pi]=1;mqSave(c.q);mqView();}}
function mqTReset(){const c=mqCur();if(!c||!mqAnswering())return;mqTStop();const x=mqEns(c.q);x.pt=x.pt||{};x.time=Math.max(0,(x.time||0)-(x.pt[c.pi]||0));x.pt[c.pi]=0;mqSave(c.q);mqView();}
/* ---- checklist + keyword suggestion (works on the website with no AI, unlimited) ---- */
function mqSig(s){const t=JSON.stringify(s.points||[]);let h=5381;for(let i=0;i<t.length;i++)h=((h<<5)+h+t.charCodeAt(i))|0;return (h>>>0).toString(36);}
function mqTicks(s,r){const i=s._i;return (r&&r.c&&r.c[i]&&r.cs&&r.cs[i]===mqSig(s))?r.c[i]:[];}
function mqPtsScore(s,c){let tot=0,got=0;(s.points||[]).forEach((p,j)=>{if(typeof p==="string"){tot++;if(c[j]===true)got++;}else{const n=p.need||1,v=Array.isArray(c[j])?c[j].filter(Boolean).length:0;tot+=n;got+=Math.min(n,v);}});return {tot,got};}
function mqRx(p,t){try{return new RegExp(p,"i").test(t);}catch(e){return false;}}
function mqKwTicks(s,t){const K=s.kw||[];return (s.points||[]).map((p,j)=>{const k=K[j];if(typeof p==="string")return !!(k&&k.some(x=>mqRx(x,t)));return p.any.map((a,m)=>!!(k&&k[m]&&k[m].some(x=>mqRx(x,t))));});}
function mqAutoFull(s,t){if(!s.auto||!t)return false;if((s.auto.all||[]).some(r=>!mqRx(r,t)))return false;const A=s.auto.any||[];return A.filter(r=>mqRx(r,t)).length>=(A.length?(s.auto.need||1):0);}
function mqKwGrade(s,t){if(!t)return null;if(mqAutoFull(s,t))return {grade:2,auto:1};if(!s.kw||!(s.points||[]).length)return null;const c=mqKwTicks(s,t),sc=mqPtsScore(s,c);return {grade:sc.got>=sc.tot?2:sc.got>0?1:0,got:sc.got,tot:sc.tot,c};}
function mqKwFill(q,subs){const x=mqEns(q);x.kg=x.kg||{};x.c=x.c||{};x.cs=x.cs||{};x.g=x.g||{};x.gm=x.gm||{};
  subs.forEach(s=>{const i=s._i,t=((x.t&&x.t[i])||"").trim();delete x.kg[i];if(!t)return;const k=mqKwGrade(s,t);if(!k)return;
    x.kg[i]={grade:k.grade,got:k.got,tot:k.tot,auto:k.auto||0};if(k.c){x.c[i]=k.c;x.cs[i]=mqSig(s);}if(!x.gm[i])x.g[i]=k.grade;});}
const MQ_GOOD="ตอบถูกตามที่โจทย์ถาม ตรงกับเกณฑ์ \"ได้\" ของข้อนี้ — รายละเอียดอื่นในเฉลยเป็นความรู้เสริม";
function mqSug(s,r){const t=((r&&r.t&&r.t[s._i])||"").trim();if(!t)return null;const ai=r.ai&&r.ai[s._i];
  if(mqAutoFull(s,t))return {grade:2,why:(ai&&ai.grade===2&&ai.why)||"คำตอบมีคำสำคัญตรงเกณฑ์ \"ได้\" ของข้อนี้"};
  if(ai&&ai.grade!=null)return {grade:ai.grade,why:ai.why||"",src:"ai"};
  const k=r.kg&&r.kg[s._i];if(k)return {grade:k.grade,why:k.tot?`เจอคำสำคัญ ${k.got}/${k.tot} ประเด็น`:"",src:"kw"};return null;}
/* ---- Claude / own-key grading (sample capability inside claude.ai) ---- */
function mqAiPrompt(q,pi,subs,r){const P=q.parts,part=P[pi],W=W_();
  let t=`คุณคืออาจารย์แพทย์ผู้ตรวจข้อสอบ ${mqKN()} วอร์ด ${W.cfg.name} ของนักศึกษาแพทย์ไทยชั้นปีที่ 4
หน้าที่: อ่านคำตอบของนักศึกษาในแต่ละ Part ด้านล่าง แล้วประเมินเทียบกับโจทย์ เคส เฉลย เกณฑ์ และเฉลยในไฟล์ (ของรุ่นพี่)
ขั้นตอนตรวจแต่ละ Part:
1) อ่าน "เกณฑ์ให้คะแนน" ก่อน — เกณฑ์เป็นตัวตัดสินหลักเสมอ
2) ตัดสินว่าตรงกับเกณฑ์ระดับใด: "ได้" / "บางส่วน" / "ไม่ได้" ใส่ level และ grade ให้ตรงกัน (ได้ = 2, บางส่วน = 1, ไม่ได้ = 0)
3) ถ้าตรงเกณฑ์ "ได้" ต้องให้ "ได้" แม้ตอบสั้น — คำอธิบายเฉลยเป็นความรู้ประกอบ ห้ามหักเพราะไม่ได้อธิบายสิ่งที่โจทย์ไม่ได้ถาม
4) โจทย์ให้ตอบ N อย่าง ตอบถูก N อย่าง = ได้ ไม่ต้องครบทุกอย่างในเฉลย; ตอบเกินไม่หัก เว้นแต่มีอันที่ผิดชัดเจน
5) "บางส่วน" เมื่อถูกไม่ครบตามที่ถาม หรือขาดรายละเอียดที่โจทย์สั่งตรง ๆ (เช่น สั่งให้บอกขนาดยา)
6) คำต่างแต่ความหมายถูกถือว่าถูก สะกดผิดเล็กน้อย/ไทยปนอังกฤษไม่หัก · ข้อมูลผิดที่อันตรายให้หัก · ประเมินเฉพาะที่เขียนจริง
ตอบเป็น JSON object เท่านั้น ภาษาไทยปนศัพท์แพทย์อังกฤษ:
{"results":[{"id": <id>, "level": "ได้", "grade": 2, "assess": "ประเมิน 2–4 ประโยค ว่าถูก/ผิด/ครบตรงไหน", "missing": "สิ่งที่ขาดตามเกณฑ์ (ว่างได้)", "why": "อ้างเกณฑ์ที่ตรงกับคำตอบ 1 ประโยค"}]}

=== ${q.sa?"โจทย์":"เคส"} ===
${plain(q.stem)}
${q.sp?"\n=== บทผู้ป่วยจำลอง / ผลตรวจที่ผู้คุมบอก ===\n"+plain(q.sp)+"\n":""}`;
  P.slice(0,pi).forEach(p=>{if(p.info)t+=`\n=== ข้อมูลที่ได้ใน ${mqGL(q,p.i)} ===\n${plain(p.info)}\n`;});
  if(part.info)t+=`\n=== ข้อมูลใหม่ก่อน ${mqGL(q,pi)} ===\n${plain(part.info)}\n`;
  subs.forEach(s=>{t+=`
--- Part id=${s._i} (${mqMk(s)} คะแนน) ---
คำถาม: ${plain(s.q||q.stem)}
${s.qx?"โจทย์ต้องการ: "+plain(s.qx)+"\n":""}${s.rubric?"เกณฑ์ให้คะแนน: "+plain(s.rubric)+"\n":""}${(s.points||[]).length?"ประเด็นที่ควรมี: "+mqPtsText(s)+"\n":""}เฉลย: ${plain(s.ans)}
คำอธิบายเฉลย: ${plain(s.exp).slice(0,1600)}
${s.key?"เฉลยในไฟล์: "+plain(s.key).slice(0,1100)+"\n":""}คำตอบของนักศึกษา:
"""
${String(r.t[s._i]).slice(0,3000)}
"""
`;});return t;}
function mqPtsText(s){return (s.points||[]).map(p=>typeof p==="string"?plain(p):`${plain(p.label||"")} — ตอบ ${p.need||1} อย่างจาก: ${p.any.map(plain).join(" | ")}`).join(" ; ");}
async function mqAiRun(q,pi,force){const k=q.uid+"#"+pi;if(MQAI.busy[k])return;const r=mqRec(q);if(!r)return;
  const subs=(mqTM()?mqTsubs(q,pi):q.parts[pi].subs).filter(s=>!mqReo(r,s._i)&&mqSubDone(q,s,r)&&((r.t&&r.t[s._i])||"").trim()&&(force||!(r.ai&&r.ai[s._i])));
  if(!subs.length)return;let mode="";try{mode=await aiMode();}catch(e){}if(!mode){MQAI.off=1;return;}
  MQAI.busy[k]=1;delete MQAI.err[k];const rer=()=>{const c=view==="mq"&&mqCur();if(c&&c.q===q&&c.pi===pi){const y=scrollY;mqView();scrollTo(0,y);}};rer();
  try{const out=await aiJSON(mqAiPrompt(q,pi,subs,r),3000);const arr=Array.isArray(out)?out:(out&&Array.isArray(out.results)?out.results:[]);
    const x=mqEns(q);x.ai=x.ai||{};x.g=x.g||{};x.gm=x.gm||{};let n=0;const byOrder=arr.length===subs.length&&!arr.every(o=>subs.some(s=>s._i===+o.id));
    arr.forEach((o,j)=>{const id=byOrder?subs[j]._i:+o.id;if(!subs.some(s=>s._i===id))return;const LV={"ได้":2,"ได้เต็ม":2,"บางส่วน":1,"ไม่ได้":0};
      let g=LV[String(o.level||"").trim()];if(g===undefined){g=Math.round(+o.grade);if(!(g===0||g===1||g===2))g=null;}
      if(g!==2&&mqAutoFull(q.subs[id],(x.t&&x.t[id])||"")){g=2;o.why="คำตอบตรงกับเกณฑ์ \"ได้\" ของข้อนี้";o.missing="";o.assess=MQ_GOOD;}
      x.ai[id]={grade:g,assess:String(o.assess||"").slice(0,1500),missing:g===2?"":String(o.missing||"").slice(0,800),why:String(o.why||"").slice(0,400),at:now()};
      if(g!=null&&!x.gm[id])x.g[id]=g;n++;});
    if(!n)MQAI.err[k]="AI ตอบกลับในรูปแบบที่อ่านไม่ได้";mqSave(q);}
  catch(e){const c=e&&e.code;if(["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed","no_ai"].includes(c))MQAI.off=1;
    else MQAI.err[k]=c==="rate_limited"?"ใช้ AI ถี่เกินไป ลองใหม่อีกสักครู่":c==="invalid_json"?"AI ตอบกลับในรูปแบบที่อ่านไม่ได้":c==="cancelled"?"":"เชื่อมต่อ AI ไม่สำเร็จ";}
  finally{delete MQAI.busy[k];rer();}}
const mqAiAvail=()=>!MQAI.off&&(HAS_CLAUDE()||!!aiCfg().key);
/* ---- rounds ---- */
const MQ_ROUNDS=[
  {k:"grand",n:"Grand round",d:"สุ่ม MEQ จากทั้งคลังทีละข้อ ยำรวมทุกแบบ (case + short answer) ไม่สนชุดหรือหัวข้อ"},
  {k:"service",n:"Service round",d:"ทำ MEQ ตามชุดข้อสอบ เลือกชุดและแบบ (case / short answer) ได้ · เคสเปิด Part ทีละช่วงเหมือนสอบจริง พิมพ์ตอบแล้วดูเฉลย + คะแนนแนะนำ"},
  {k:"morning",n:"Morning round",d:"",soon:1,off:1,note:"ปิดไว้ก่อน — ยังไม่เปิดใน MEQ / OSCE"},
  {k:"legend",n:"Legendary round",d:"",soon:1,off:1,note:"ปิดไว้ก่อน — ยังไม่เปิดใน MEQ / OSCE"},
  {k:"staff",n:"Ward staff round",d:"ทวนข้อ MEQ ที่ทำแล้วแต่ยังมี Part ที่ไม่ได้เต็ม"},
  {k:"teach",n:"Teaching round",d:"ใบเหลือง · CTA · Flashcard · Oral (ใช้ร่วมกับ MCQ / OSCE)"},
  {k:"advisor",n:"Advisor round",d:"อ่านเฉลยข้อ MEQ ที่ทำแล้ว เรียงจากคะแนนน้อยสุดก่อน"},
  {k:"unit",n:"Unit round",d:"ทำ MEQ ตามหัวข้อ เลือกได้หลายหัวข้อ — เปิดเฉพาะ Part ที่ตรงหัวข้อ"},
  {k:"quality",n:"Quality round",d:"",soon:1,note:"จับเวลาแบบใหม่สำหรับ MEQ — รอรายละเอียด"},
  {k:"admission",n:"Admission round",d:"",soon:1,note:"AI ออกโจทย์ให้ตอบแบบ short answer / short essay — กำลังทำ"},
  {k:"specialty",n:"Specialty round",d:"เปิด Specialty round ของ MCQ — โจทย์ใหม่ที่ AI สร้างทีละข้อจากไฟล์ของวอร์ดนี้เท่านั้น เลือกเรื่อง / R / N ได้ (ใช้ร่วมกับ MCQ)"},
  {k:"io",n:"Round I/O",d:"อ่านสรุปเนื้อหาจาก Lecture (L) · Resource (R) · โน้ตวอร์ด (N) และรวมตามเรื่อง ที่ Claude สรุปให้ · ใช้ร่วมกับ MCQ / OSCE"},
  {k:"longcase",n:"Long case",d:"AI ให้ chief complaint มา แล้วดำเนินเคสเองทีละขั้นแบบสอบ long case เฉลยทีละขั้นสไตล์ MEQ (ใช้ร่วมกับ MCQ / OSCE)"}
];
const MQ_RN=k=>(MQ_ROUNDS.find(r=>r.k===k)||{n:"MEQ"}).n;
/* the round boxes of the MEQ / OSCE tab (OSCE: Legendary round is open — site/osce.js) */
function mqRounds(type){if(type!=="OSCE")return MQ_ROUNDS.map(r=>r.k==="legend"||r.k==="morning"?Object.assign({},r,{note:"ปิดไว้ก่อน — ยังไม่เปิดใน MEQ"}):r);
  return MQ_ROUNDS.map(r=>{const o=Object.assign({},r);
    if(r.k==="legend"){o.soon=0;o.off=0;o.d="จำลองสอบจริง จำนวนข้อและเวลาเท่าสอบจริงของวอร์ด · IRL (มีผู้คุมจริง) หรือ SIM (พิมพ์ตอบ) · เลือกหัวข้อ วิธีเรียงข้อ ข้อพัก · เพิ่มโจทย์ใหม่จาก AI ได้ · หมดเวลาเปลี่ยนข้อเอง";}
    else if(r.k==="grand")o.d="สุ่มจากข้อสอบเก่า (AC) ทั้งคลังทีละข้อ ไม่สนปีหรือหัวข้อ · ไม่จับเวลา";
    else if(r.k==="service")o.d="เลือกปีและ rotation ที่อยากทำ ทำทีละข้อ ไม่จับเวลา เน้นฝึกตอบ · ข้อย่อยขึ้นพร้อมกัน พิมพ์ตอบแล้วดูเฉลยแบบ checklist + คะแนน";
    else if(r.k==="quality"){o.soon=0;o.d="ข้อสอบเก่าแบบจับเวลาทีละข้อ หมดเวลาเปลี่ยนข้อเอง · เลือกปีที่จะทำ หรือสุ่มจากทั้งคลัง · กำหนดเวลาต่อข้อเอง";}
    else if(r.k==="staff")o.d="ทวนข้อ OSCE ที่ทำแล้วแต่ยังมีข้อย่อยที่ไม่ได้เต็ม";
    else if(r.k==="advisor")o.d="อ่านเฉลยข้อ OSCE ที่ทำแล้ว เรียงจากคะแนนน้อยสุดก่อน";
    else if(r.k==="unit")o.d="ทำ OSCE ตามหัวข้อ (Lab, Imaging, EKG, History taking …) เลือกได้หลายหัวข้อ";
    else if(r.k==="morning")o.note="ปิดไว้ก่อน — ยังไม่เปิดใน OSCE";
    else if(r.k==="admission")o.note="AI ออกสถานี OSCE ใหม่ — รอรายละเอียด";
    else if(["io","teach","longcase"].includes(r.k))o.d=r.d.replace(/MCQ \/ OSCE/,"MCQ / MEQ");
    return o;});}
function mqStaffL(){return mqL().filter(q=>{const r=mqRec(q);return r&&q.subs.some(s=>mqSubDone(q,s,r)&&!(r.g&&r.g[s._i]===2));});}
function mqAdvL(){return mqL().filter(mqAnyDone).map(q=>{const r=mqRec(q),S=q.subs.filter(s=>mqSubDone(q,s,r)),sc=mqScoreOf(S,r);return [q,sc.tot?sc.got/sc.tot:1];}).sort((a,b)=>a[1]-b[1]||a[0].n-b[0].n).map(x=>x[0]);}
function mqPass(q,f){if(f==="todo")return !mqCaseDone(q);if(f==="notfull"){const sc=mqScore(q);return !!sc&&!sc.perfect;}if(f==="star")return mqStar(q);return true;}
function mqTPass(q,f){const ps=mqTParts(q);if(!ps.length)return false;if(f==="todo")return ps.some(pi=>!mqTDone(q,pi));
  if(f==="notfull"){const r=mqRec(q);return ps.some(pi=>mqTDone(q,pi)&&mqTsubs(q,pi).some(s=>!(r&&r.g&&r.g[s._i]===2)));}if(f==="star")return mqStar(q);return true;}
const mqSK=q=>q.ro?q.set+" "+q.ro:q.set;   /* chip key of a MEQ set (rotation kept apart) */
/* พาร์ทในไฟล์ รวมชื่อเดียวกันทุกปี: "Part 1: MEQ" / "Part I: MEQ" / "MEQ OB" → MEQ · Recall / Short answer → Recall · Long case */
const mqSecG=q=>{const s=String(q.sec||"").replace(/^Part\s+[\dIVX]+\s*[:.\-–]\s*/i,"").trim();if(!s)return "";if(/long\s*case/i.test(s))return "Long case";if(/recall|short\s*answer/i.test(s))return "Recall / Short answer";if(/^MEQ\b/i.test(s))return "MEQ";return s;};
const MQ_SECO=["MEQ","Recall / Short answer","Long case"];
const mqSecs=L=>{const a=[...new Set(L.map(mqSecG).filter(Boolean))];return a.sort((x,y)=>{const i=MQ_SECO.indexOf(x),j=MQ_SECO.indexOf(y);return (i<0?99:i)-(j<0?99:j);});};
const mqSecOk=q=>{const v=mqS().v;return !v.sec||v.sec==="all"||v.sec.split("|").includes(mqSecG(q));};
function mqList(rk){const v=mqS().v,L=mqL(),setOk=q=>v.set==="all"||v.set.split("|").includes(mqSK(q));rk=rk||v.r;
  if(rk==="staff")return mqStaffL().filter(q=>mqStyOk(q));
  if(rk==="advisor")return mqAdvL().filter(q=>mqStyOk(q));
  if(rk==="unit")return v.tags.length?L.filter(q=>setOk(q)&&mqSecOk(q)&&mqStyOk(q)&&mqTPass(q,v.status)):[];
  if(rk==="grand")return v.gl.map(u=>L.find(q=>q.uid===u)).filter(Boolean);
  return L.filter(q=>setOk(q)&&mqSecOk(q)&&mqStyOk(q)&&mqPass(q,v.status));}
/* ---- ward home (MEQ tab) ---- */
function mqHomeHTML(type){type=type||"MEQ";const P=P_(),p=ph(),L=mqL(ward,type),W=W_(),done=L.filter(q=>mqCaseDone(q)),scs=done.map(mqScore).filter(s=>s&&s.all);
  const avg=scs.length?Math.round(scs.reduce((a,s)=>a+s.got/s.tot,0)/scs.length*100):null,nC=L.filter(q=>!q.sa).length,nS=L.length-nC,sl=mqStaffL().length;
  let h=type==="OSCE"?osHomeTop(L):"";
  if(!L.length)h+=`<div class="card"><h3>ยังไม่มีข้อสอบ ${type} ในคลัง</h3><span class="rd" style="margin:0">ส่งไฟล์ข้อสอบเก่า ${type} (PDF/รูป/เอกสาร) ให้ Claude แล้วให้เพิ่มเข้าเว็บ ปุ่ม round ด้านล่างจะใช้ได้เมื่อมีข้อสอบ (Round I/O, Teaching และ Long case ใช้ได้เลย)</span></div>`;
  h+=`<p class="statline">คลังมี <b>${L.length}</b> ข้อ${type==="OSCE"&&L.length?` (ไม่มีอาจารย์ ${L.filter(q=>!q.ex).length} · มีอาจารย์ ${L.filter(q=>q.ex).length})`:""} · ข้อสอบเก่า <b>${L.length}</b> ข้อ${type==="MEQ"&&L.length?` (case ${nC} · short answer ${nS})`:""} · Phase ${p} ทำแล้ว <b>${done.length}</b> ข้อ · คะแนนเฉลี่ย <b>${avg==null?"–":avg+"%"}</b></p>`;
  const v=mqS().v,cq=v.u&&L.find(q=>q.uid===v.u);
  if(cq&&!mqCaseDone(cq)&&mqAnyDone(cq))h+=`<button class="resume" id="mqResume"><span>ทำต่อ: <b>${type} ข้อ ${esc(mqNum(cq))}</b><span class="rd">${esc(cq.set)} · ${esc(mqTitle(cq))}</span></span><span class="go">→</span></button>`;
  if(p===2&&L.length){h+=`<div class="card"><h3>ทบทวน ${type} ก่อนสอบ</h3><span class="rd">สรุปจากข้อสอบ ${type} เก่าเท่านั้น และทวนเฉพาะข้อที่ยังไม่ได้เต็ม</span><div class="tools">
    <button class="tool" data-go="mqhy">📘 สรุป High-yield ${type}${(n=>n?`<span class="n" title="ข้อใหม่ที่ Claude ยังไม่ได้สรุป">🆕 ${n}</span>`:"")(hsPendingN(type))}</button>
    <button class="tool" data-mqp2="notfull">◐ ข้อที่ยังไม่ได้เต็ม<span class="n">${L.filter(q=>mqPass(q,"notfull")).length}</span></button>
    <button class="tool" data-mqp2="star">★ ข้อที่ติดดาว<span class="n">${L.filter(mqStar).length}</span></button>
    <button class="tool" data-mqp2="todo">○ ยังไม่ได้ทำใน Phase 2<span class="n">${L.filter(q=>!mqCaseDone(q)).length}</span></button></div></div>`;}
  if(mqClOK()&&L.length){const need=L.filter(q=>mqNeedAI(q)).length;h+=`<div class="card"><h3>🤖 ให้ Claude ตรวจ ${type}</h3><span class="rd">บนเว็บแนะนำคะแนนจากคำสำคัญ (ไม่จำกัด) · อยากได้คำประเมินละเอียด ส่งไปให้ Claude ตรวจได้ แล้วส่งผลกลับเว็บ</span>
    <div class="chips"><button class="chip" type="button" data-mqask="1" aria-pressed="${v.ask!==false}">ถามทุกครั้งหลังส่งคำตอบ</button><button class="chip" type="button" data-mqask="0" aria-pressed="${v.ask===false}">ไม่ต้องถาม (ใช้คำสำคัญอย่างเดียว)</button></div>
    <button class="btn" type="button" id="mqAllCl" style="margin-top:8px" ${need?"":"disabled"}>ส่งข้อที่ยังไม่ได้ให้ Claude ตรวจ (${need} ข้อ)</button></div>`;}
  if(HAS_CLAUDE()&&L.length)h+=`<button class="resume" id="mqInGo"><span><b>📋 ตรวจคำตอบ MEQ / OSCE จากเว็บ</b><span class="rd">วางรหัสที่คัดลอกจากเว็บ แล้วให้ Claude ประเมิน</span></span><span class="go">→</span></button>`;
  const cnt=k=>{const t=k==="service"?`มี <b>${L.length}</b> ข้อ · ${L.reduce((a,q)=>a+q.subs.length,0)} ${type==="OSCE"?"ข้อย่อย":"Part"}`:k==="staff"?`มีข้อให้ทวน <b>${sl}</b> ข้อ`:k==="advisor"?`อ่านเฉลยได้ <b>${L.filter(mqAnyDone).length}</b> ข้อ`:k==="unit"?`มี <b>${mqTopics().length}</b> หัวข้อ`:"";return t?`<span class="rcnt">${t}</span>`:"";};
  const RS=mqRounds(type),osRun=type==="OSCE"&&typeof osRunCur==="function"&&osRunCur();
  h+=`<div class="rounds">${RS.map((r,i)=>`<button class="round" data-mqround="${r.k}" aria-disabled="${!!r.soon}">${r.soon?`<span class="soon">${r.off?"ปิดไว้":"เร็ว ๆ นี้"}</span>`:r.k==="staff"&&sl?`<span class="badge">${sl}</span>`:r.k==="legend"&&osRun?`<span class="badge">กำลังสอบ</span>`:""}<span class="rn">${String(i+1).padStart(2,"0")}</span><b>${r.k==="io"?ioDot(ioAnyNew()):""}${r.n}</b><span class="rd">${r.soon?(r.note||"รายละเอียดจะเพิ่มภายหลัง"):r.d}</span>${(r.k==="legend"||r.k==="quality")&&type==="OSCE"?osLegCnt(r.k):L.length?cnt(r.k):""}</button>`).join("")}</div>`;
  return h;}
function mqBindHome(type){type=type||"MEQ";
  document.querySelectorAll("[data-mqround]").forEach(b=>b.onclick=()=>{const k=b.dataset.mqround,R=mqRounds(type).find(r=>r.k===k);if(R.soon){toast(R.note||"โหมดนี้จะเพิ่มภายหลัง");return;}
    if(k==="io")return go(ward+"/io");if(k==="teach")return go(ward+"/teach");if(k==="longcase")return go(ward+"/lcase");if(k==="specialty")return go(ward+"/spc");if(k==="legend"&&type==="OSCE")return go(ward+"/osl");if(k==="quality"&&type==="OSCE")return go(ward+"/osq");if(!mqL().length){toast(`ยังไม่มีข้อสอบ ${type} ในคลัง`);return;}if(k==="grand")return mqGrandNext(true);
    mqVset({r:k,status:k==="service"||k==="unit"?mqS().v.status:"all"});save();go(ward+"/mqr");});
  document.querySelectorAll("[data-mqp2]").forEach(b=>b.onclick=()=>{mqVset({r:"service",set:"all",style:"all",status:b.dataset.mqp2});save();go(ward+"/mqr");});
  const rs=$("mqResume");if(rs)rs.onclick=()=>go(ward+"/mq");
  {const b=$("osHomeRes");if(b)b.onclick=()=>go(ward+"/osx");}
  document.querySelectorAll("[data-mqask]").forEach(b=>b.onclick=()=>{mqVset({ask:b.dataset.mqask==="1"});save();rHome();});
  {const b=$("mqAllCl");if(b)b.onclick=()=>mqToClaude(mqL().filter(q=>mqNeedAI(q)));}
  {const b=$("mqInGo");if(b)b.onclick=()=>go(ward+"/mqin");}}
/* ---- round list page ---- */
function mqBubbles(q,subs,r){return subs.map(s=>{let c="b";if(r&&mqSubDone(q,s,r)){const g=r.g?r.g[s._i]:undefined;c+=" f"+(g===2?" ok":g===1?" half":g===0?" no":"");}return `<span class="${c}">${s._i+1}</span>`;}).join("");}
/* MEQ search: case stem, recall text, title and the questions of parts already opened; answers/explanations only for parts already submitted */
let mqQ="";
function mqSearchText(q){const r=mqRec(q),ps=mqPs(q,r);let t=[q.title,q.stem,q.gray,q.set,q.ro,q.orig].map(flatTxt).join(" ");
  q.parts.forEach((p,pi)=>{if(pi>ps&&!q.sa)return;t+=" "+[p.info,p.igray,p.gray].map(flatTxt).join(" ");
    p.subs.forEach(sb=>{t+=" "+[sb.q,sb.gray,sb.tags].map(flatTxt).join(" ");if(mqSubDone(q,sb,r))t+=" "+["key","ans","exp","rubric","points","flag"].map(k=>flatTxt(sb[k])).join(" ");});});
  if(mqCaseDone(q))t+=" "+["interp","summary","approach","trap","mnemonic","notes"].map(k=>flatTxt(q[k])).join(" ");
  return t;}
/* one row of the MEQ answer list: case number + a chip per Part with a bubble per sub (shared by the list page and the answer-sheet overlay; cur = {u,pi} highlights where you are) */
function mqRowHTML(q,rk,cur){const v=mqS().v,tm=rk==="unit",r=mqRec(q)||null,sc=mqScore(q),isC=cur&&cur.u===q.uid;
      const gs=tm?q.parts.filter(p=>p.subs.some(s=>(s.tags||[]).some(t=>v.tags.includes(t)))).map(p=>p.i):q.parts.map(p=>p.i),ps=mqPs(q,r);
      const chips=q.sa?`<button class="pchip${isC?" cur":""}" type="button" data-mgo="${esc(q.uid)}" data-p="0"><span class="pl">${mqCaseDone(q)?"✓ ":""}ตอบ</span><span class="bs">${mqBubbles(q,q.subs,r)}</span>${r&&r.time?`<span class="ptm">${mqFmt(r.time)}</span>`:""}</button>`
        :gs.map(pi=>{const S=tm?q.parts[pi].subs.filter(s=>(s.tags||[]).some(t=>v.tags.includes(t))):q.parts[pi].subs,lock=!tm&&pi>ps;
          return `<button class="pchip${lock?" lock":""}${isC&&cur.pi===pi?" cur":""}" type="button" data-mgo="${esc(q.uid)}" data-p="${pi}" ${lock?'aria-disabled="true"':""}><span class="pl">${lock?"🔒 ":pi<ps?"✓ ":""}${mqGL(q,pi)}</span><span class="bs">${mqBubbles(q,S,r)}</span>${r&&r.pt&&r.pt[pi]?`<span class="ptm">${mqFmt(r.pt[pi])}</span>`:""}</button>`;}).join("");
      return `<div class="crow${isC?" cur":""}"><button class="cn" type="button" data-mgo="${esc(q.uid)}"><span class="cl">ข้อ</span>${esc(mqNum(q))}</button><div style="min-width:0"><div class="cq">${esc(mqTitle(q))}</div><div class="cparts">${chips}</div></div><div class="cmeta">${esc(q.set)}${q.ro?" · "+esc(q.ro):""}${q.sec?" · "+esc(q.sec):""} · ${mqIsOS()?esc(mqTN(q.topic||"")||"OSCE")+(q.ex?" · มีอาจารย์":""):q.sa?"short answer":"case"}${sc&&sc.all?` · <b style="color:${mqPct(Math.round(sc.got/sc.tot*100))}">${+sc.got.toFixed(1)}/${sc.tot}</b>`:""}${mqStar(q)?' · <span class="st">★</span>':""}</div></div>`;}
function mqRList(){const v=mqS().v,rk=v.r||"service",L=mqL(),T=mqTopics();
  let h=`<div class="mqv"><div class="whead"><h1 class="h2">${esc(MQ_RN(rk))} · ${mqKN()}</h1><a href="#/${esc(ward)}">กลับหน้าวอร์ด</a></div><p class="sub" style="margin:0 0 10px">${esc((mqRounds(mqKN()).find(r=>r.k===rk)||{}).d||"")}</p>`;
  if(rk==="unit"){const cnt={};L.forEach(q=>q.subs.forEach(s=>(s.tags||[]).forEach(t=>{cnt[t]=(cnt[t]||0)+1;})));
    h+=`<div class="tl-h">เลือกหัวข้อ (เลือกได้หลายหัวข้อ)</div><div class="chips tchips">${T.length?T.map(([k,n])=>`<button class="chip" type="button" data-mtag="${esc(k)}" aria-pressed="${v.tags.includes(k)}">${esc(n)}<span class="cnt">${cnt[k]||0}</span></button>`).join(""):`<span class="hint">ยังไม่ได้ติดหัวข้อให้ข้อ ${mqKN()} ในวอร์ดนี้</span>`}</div>`;}
  h+=`<div class="tl-h">${mqIsOS()?"ประเภทข้อ":"แบบข้อสอบ"}</div><div class="chips">${mqSTY().map(([k,n])=>`<button class="chip" type="button" data-msty="${k}" aria-pressed="${v.style===k}">${n}</button>`).join("")}</div>`;
  if(rk==="service"||rk==="unit"){const sets=[...new Set(L.map(mqSK))],sel=v.set==="all"?[]:v.set.split("|");
    h+=`<div class="tl-h">ชุดข้อสอบ</div><div class="chips scroll">${[["all",v.set==="all"?"ทุกชุด":`ทุกชุด (เลือก ${sel.length})`]].concat(sets.map(x=>[x,x])).map(([k,n])=>`<button class="chip" type="button" data-mset="${esc(k)}" aria-pressed="${k==="all"?v.set==="all":sel.includes(k)}">${esc(n)}<span class="cnt">${k==="all"?"":L.filter(q=>mqSK(q)===k).length}</span></button>`).join("")}</div>`;
    /* พาร์ทตามไฟล์ (MEQ / Long case / Recall …) of the selected sets — pick some to see only those; none = every part in file order */
    {const inS=L.filter(q=>v.set==="all"||sel.includes(mqSK(q))),secs=mqSecs(inS),ss=v.sec==="all"?[]:v.sec.split("|").filter(x=>secs.includes(x));
      if(secs.length)h+=`<div class="tl-h">พาร์ทในไฟล์ <span class="hint">ไม่เลือก = ทุกพาร์ท เรียงตามไฟล์</span></div><div class="chips scroll">${[["all",v.sec==="all"?"ทุกพาร์ท":`ทุกพาร์ท (เลือก ${ss.length})`]].concat(secs.map(x=>[x,x])).map(([k,n])=>`<button class="chip" type="button" data-msec="${esc(k)}" aria-pressed="${k==="all"?v.sec==="all":ss.includes(k)}">${esc(n)}<span class="cnt">${k==="all"?"":inS.filter(q=>mqSecG(q)===k).length}</span></button>`).join("")}</div>`;}
    h+=`<div class="chips">${[["all","ทั้งหมด"],["todo","ยังไม่ทำ"],["notfull","ยังไม่ได้เต็ม"],["star","★ ติดดาว"]].map(([k,n])=>`<button class="chip" type="button" data-mst="${k}" aria-pressed="${v.status===k}">${n}</button>`).join("")}</div>`;}
  h+=`<div class="ssearch"><input type="search" id="mqQ" placeholder="🔍 ค้นหาคำ / หัวข้อ" autocomplete="off" value="${esc(mqQ)}" aria-label="ค้นหาข้อ"><span id="mqQn"></span></div>`;
  const Q0=mqList(rk),QT=srchTerms(mqQ),Q=QT.length?Q0.filter(q=>srchHit(mqSearchText(q),QT)):Q0;
  if(rk==="unit"&&!v.tags.length)h+=`<div class="empty">เลือกหัวข้ออย่างน้อย 1 หัวข้อ — Part ที่ติดหัวข้อนั้นจะแสดงที่นี่</div>`;
  else if(!Q.length&&QT.length)h+=`<div class="empty">ไม่พบข้อที่มีคำว่า “${esc(mqQ.trim())}”</div>`;
  else if(!Q.length)h+=`<div class="empty">${rk==="staff"?"ยังไม่มีข้อที่ต้องทวน — ทุก Part ที่ทำแล้วได้เต็ม":rk==="advisor"?`ยังไม่ได้ทำข้อ ${mqKN()} ใน Phase นี้`:"ไม่มีข้อในเงื่อนไขที่เลือก"}</div>`;
  else{if(rk==="service"){const nx=mqNextTodo(Q0);h+=nx?`<button class="resume" type="button" id="mqNext" style="margin:0 0 10px"><span>▶ ไปข้อถัดไปที่ยังไม่ได้ทำ: <b>${mqKN()} ข้อ ${esc(mqNum(nx))}</b><span class="rd">${esc(nx.set)}${nx.ro?" · "+esc(nx.ro):""} · ${esc(mqTitle(nx))}</span></span><span class="go">→</span></button>`:`<p class="hint" style="margin:0 0 10px">✓ ทำครบทุกข้อในชุดที่เลือกแล้ว (Phase ${ph()})</p>`;}
    h+=`<div class="tsum">${Q.length} ข้อ · แตะเลขข้อหรือ Part เพื่อเริ่มทำ</div><div class="trows">`+Q.map(q=>mqRowHTML(q,rk)).join("")+`</div>`;}
  h+=`</div>`;$("main").innerHTML=h;
  {const nb=$("mqNext");if(nb)nb.onclick=()=>{const nx=mqNextTodo(Q0);if(nx)mqOpen(nx.uid,undefined,"service");};}
  {const qi=$("mqQ"),qn=$("mqQn");if(qn)qn.textContent=QT.length?`พบ ${Q.length}/${Q0.length} ข้อ`:"";
    if(qi){let tm=0;qi.addEventListener("input",()=>{clearTimeout(tm);tm=setTimeout(()=>{mqQ=qi.value;const p0=qi.selectionStart;mqRList();const n=$("mqQ");if(n){n.focus();try{n.setSelectionRange(p0,p0);}catch(e){}}},160);});}}
  document.querySelectorAll("[data-mtag]").forEach(b=>b.onclick=()=>{const k=b.dataset.mtag,a=v.tags;const i=a.indexOf(k);if(i>=0)a.splice(i,1);else a.push(k);mqVset({});save();mqRList();});
  document.querySelectorAll("[data-msty]").forEach(b=>b.onclick=()=>{mqVset({style:b.dataset.msty});save();mqRList();});
  document.querySelectorAll("[data-mset]").forEach(b=>b.onclick=()=>{const k=b.dataset.mset;let sel=v.set==="all"?[]:v.set.split("|");if(k==="all")sel=[];else if(sel.includes(k))sel=sel.filter(x=>x!==k);else sel.push(k);mqVset({set:sel.length?sel.join("|"):"all"});save();mqRList();});
  document.querySelectorAll("[data-mst]").forEach(b=>b.onclick=()=>{mqVset({status:b.dataset.mst});save();mqRList();});
  document.querySelectorAll("[data-msec]").forEach(b=>b.onclick=()=>{const k=b.dataset.msec;let sel=v.sec==="all"?[]:v.sec.split("|");if(k==="all")sel=[];else if(sel.includes(k))sel=sel.filter(x=>x!==k);else sel.push(k);mqVset({sec:sel.length?sel.join("|"):"all"});save();mqRList();});
  document.querySelectorAll("[data-mgo]").forEach(b=>b.onclick=()=>{if(b.getAttribute("aria-disabled")==="true"){toast("ส่งคำตอบ Part ก่อนหน้าก่อน");return;}mqOpen(b.dataset.mgo,b.dataset.p===undefined?undefined:+b.dataset.p,rk);});}
/* answer-sheet overlay on the MEQ question page (header button "กระดาษคำตอบ"), like Prevent Med: sets, parts, status, search, every case with its Part chips */
function mqSheet(){const v=mqS().v,rk=v.r||"service",L=mqL(),c=mqCur(),cur=c?{u:c.q.uid,pi:c.pi}:null,SV=rk==="service"||rk==="unit";
  statLabels(["ทำแล้ว","ได้เต็ม","คะแนนเฉลี่ย"]);$("sheetTitle").textContent=`กระดาษคำตอบ · ${MQ_RN(rk)} · ${mqKN()}`;
  const sc=$("setChips"),cc=$("chChips"),stc=$("statusChips");sc.innerHTML="";stc.innerHTML="";if(cc){cc.innerHTML="";cc.hidden=true;}
  if(SV){const sets=[...new Set(L.map(mqSK))],sel=v.set==="all"?[]:v.set.split("|");
    sc.innerHTML=[["all",v.set==="all"?"ทุกชุด":`ทุกชุด (เลือก ${sel.length})`]].concat(sets.map(x=>[x,x])).map(([k,n])=>`<button class="chip" type="button" data-sms="${esc(k)}" aria-pressed="${k==="all"?v.set==="all":sel.includes(k)}">${esc(n)}</button>`).join("");
    const inS=L.filter(q=>v.set==="all"||sel.includes(mqSK(q))),secs=mqSecs(inS),ss=v.sec==="all"?[]:v.sec.split("|").filter(x=>secs.includes(x));
    if(cc&&secs.length){cc.innerHTML=[["all",ss.length?`ทุกพาร์ท (เลือก ${ss.length})`:"ทุกพาร์ท"]].concat(secs.map(x=>[x,x])).map(([k,n])=>`<button class="chip" type="button" data-smp="${esc(k)}" aria-pressed="${k==="all"?!ss.length:ss.includes(k)}">${esc(n)}<span class="cnt">${k==="all"?"":inS.filter(q=>mqSecG(q)===k).length}</span></button>`).join("");cc.hidden=false;}
    stc.innerHTML=[["all","ทั้งหมด"],["todo","ยังไม่ทำ"],["notfull","ยังไม่ได้เต็ม"],["star","★ ติดดาว"]].map(([k,n])=>`<button class="chip" type="button" data-smt="${k}" aria-pressed="${v.status===k}">${n}</button>`).join("");}
  const Q0=rk==="grand"?v.gl.map(u=>L.find(x=>x.uid===u)).filter(Boolean):mqList(rk),T=srchTerms(sheetQ),Q=T.length?Q0.filter(q=>srchHit(mqSearchText(q),T)):Q0;sheetQPaint(Q.length,Q0.length);
  {const D=Q0.filter(q=>mqCaseDone(q)),S=D.map(mqScore).filter(x=>x&&x.tot),full=S.filter(x=>x.perfect).length,avg=S.length?Math.round(S.reduce((a,x)=>a+x.got/x.tot,0)/S.length*100):null;
    $("sDone").textContent=`${D.length}/${Q0.length}`;$("sRight").textContent=full;$("sPct").textContent=avg===null?"–":avg+"%";}
  $("rows").innerHTML=Q.length?`<div class="mqv"><div class="trows mqrows">`+Q.map(q=>mqRowHTML(q,rk,cur)).join("")+`</div></div>`:`<div class="empty">${T.length?`ไม่พบข้อที่มีคำว่า “${esc(sheetQ.trim())}”`:rk==="grand"?"ยังไม่ได้สุ่มข้อในรอบนี้":"ไม่มีข้อในเงื่อนไขที่เลือก"}</div>`;
  $("sheetFoot").innerHTML=`<span class="hint">แตะเลขข้อเพื่อไปที่ข้อ · แตะ Part เพื่อเปิด Part นั้น (🔒 = ต้องส่ง Part ก่อนหน้าก่อน) · วงกลม = ข้อย่อย: เขียว ได้เต็ม · เหลือง บางส่วน · แดง ไม่ได้ · ทึบ ส่งแล้วยังไม่ให้คะแนน${SV?" · แตะชุด/พาร์ทเลือกได้หลายอัน":""}</span><span class="spacer"></span><span class="hint" id="syncNote" style="flex-basis:100%"></span>`;
  const tog=(cur,k)=>{let a=cur==="all"?[]:cur.split("|");if(k==="all")a=[];else if(a.includes(k))a=a.filter(x=>x!==k);else a.push(k);return a.length?a.join("|"):"all";};
  sc.querySelectorAll("[data-sms]").forEach(b=>b.onclick=()=>{mqVset({set:tog(v.set,b.dataset.sms)});save();mqSheet();});
  if(cc)cc.querySelectorAll("[data-smp]").forEach(b=>b.onclick=()=>{mqVset({sec:tog(v.sec,b.dataset.smp)});save();mqSheet();});
  stc.querySelectorAll("[data-smt]").forEach(b=>b.onclick=()=>{mqVset({status:b.dataset.smt});save();mqSheet();});
  $("rows").querySelectorAll("[data-mgo]").forEach(b=>b.onclick=()=>{if(b.getAttribute("aria-disabled")==="true"){toast("ส่งคำตอบ Part ก่อนหน้าก่อน");return;}closeS(true);mqOpen(b.dataset.mgo,b.dataset.p===undefined?undefined:+b.dataset.p,rk);});
  if(typeof paintSync==="function")paintSync();}
/* Service round: the next case not yet finished in the chosen sets/parts — counting on from the case you were last on (it counts if still unfinished), else from the first — wrapping round; opens at its first Part not yet sent */
function mqNextTodo(Q){if(!Q||!Q.length)return null;const u=mqS().v.u,i0=Math.max(0,Q.findIndex(q=>q.uid===u));
  for(let j=0;j<Q.length;j++){const q=Q[(i0+j)%Q.length];if(!mqCaseDone(q))return q;}return null;}
function mqOpen(u,pi,rk){const v=mqS().v;rk=rk||v.r||"service";const q=mqL().find(x=>x.uid===u);if(!q)return;
  mqVset({u,r:rk,ctx:rk==="unit"?"topic":"set"});if(pi===undefined||!mqViewable(q,pi))pi=mqDefPart(q);v.pi=pi;save();if(view==="mq"){mqTStop();mqView();scrollTo(0,0);}else go(ward+"/mq");}
function mqGrandNext(fromHome){const v=mqS().v,L=mqL();if(!L.length){toast("ยังไม่มีข้อ MEQ");return;}const cur=v.r==="grand"?v.u:null;
  let pool=L.filter(q=>!mqCaseDone(q)&&q.uid!==cur);if(!pool.length)pool=L.filter(q=>q.uid!==cur);if(!pool.length)pool=L;
  const q=pool[Math.floor(Math.random()*pool.length)];v.gl=(fromHome?[]:v.gl).filter(u=>u!==q.uid).concat(q.uid).slice(-60);mqOpen(q.uid,undefined,"grand");}
function mqStep(d){const c=mqCur();if(!c)return;const {q,pi}=c,v=mqS().v;
  if(mqTM()){const TP=mqTParts(q),k=TP.indexOf(pi);if(d>0&&k>=0&&k<TP.length-1)return mqOpen(q.uid,TP[k+1],"unit");if(d<0&&k>0)return mqOpen(q.uid,TP[k-1],"unit");}
  else{if(d>0&&pi<q.parts.length-1&&pi<mqPs(q))return mqOpen(q.uid,pi+1,v.r);if(d<0&&pi>0)return mqOpen(q.uid,pi-1,v.r);}
  if(v.r==="grand"){if(d>0)return mqGrandNext(false);const i=v.gl.indexOf(q.uid);if(i>0)return mqOpen(v.gl[i-1],undefined,"grand");return;}
  const Q=mqList(),i=Q.indexOf(q);let t;if(i>=0)t=Q[i+d];else t=d>0?Q.find(x=>x.n>q.n):[...Q].reverse().find(x=>x.n<q.n);
  if(!t){toast(d>0?"ข้อสุดท้ายในรายการแล้ว":"ข้อแรกในรายการแล้ว");return;}mqOpen(t.uid,d<0&&!mqTM()?mqDefPart(t):undefined,v.r);}
/* ---- case view ---- */
function mqView(){const c=mqCur();if(!c){go(ward);return;}const {q}=c;let pi=c.pi;const v=mqS().v,r=mqRec(q)||{},NP=q.parts.length,ps=mqPs(q),tm=mqTM();
  const part=q.parts[pi],pDone=mqPDone(q,pi),SUBS=tm?mqTsubs(q,pi):part.subs,TP=tm?mqTParts(q):null,ans=mqAnswering(),gl=mqGL(q,pi);
  const Q=v.r==="grand"?v.gl.map(u=>mqL().find(x=>x.uid===u)).filter(Boolean):mqList(),k=Q.indexOf(q);
  let h=`<div class="mqv"><div class="mtbar"><a class="back" href="#/${esc(ward)}${v.r==="grand"?"":"/mqr"}">← ${v.r==="grand"?"หน้าวอร์ด":"รายการข้อ"}</a><span class="tsel">${esc(MQ_RN(v.r))}${tm?" · หัวข้อ: "+esc(v.tags.map(mqTN).join(", ")):""}</span><span class="tcnt">${k>=0?`${k+1}/${Q.length}`:""}</span></div>`;
  h+=`<div class="qhead"><div class="qnum"><small>ข้อ</small>${esc(mqNum(q))}</div><div class="fields"><span class="field"><b>${esc(CFG.setLabel||"ชุด")}</b>${esc(q.set)}</span>${q.ro?`<span class="field"><b>${esc(CFG.roLabel||"Ro")}</b>${esc(q.ro)}</span>`:""}<span class="field case-tag"><b>${mqKN()}</b>${mqIsOS()?`${esc(mqTN(q.topic||"")||"")} · ${q.proc?"หัตถการ (มีอาจารย์)":q.ex?"มีอาจารย์":"ไม่มีอาจารย์"} · ${q.subs.length} ข้อย่อย`:q.sa?"short answer":`case · ${q.subs.length} Part`}</span></div>`;
  h+=`<div class="qtools">${(!mqCaseDone(q)||ans)&&!mqIsOS()?`<span class="timer" id="mqTimer"></span>`:""}${ans&&!mqIsOS()?`<button class="tbtn${mqPaused()?" on":""}" id="mqPause" type="button">${mqPaused()?"▶ เดินต่อ":"⏸ หยุดเวลา"}</button><button class="tbtn" id="mqTRes" type="button">↺ เริ่มจับเวลาใหม่</button>`:""}<button class="starbtn" id="mqStar" aria-pressed="${mqStar(q)}" title="ติดดาวไว้ทบทวน">${mqStar(q)?"★":"☆"}</button></div></div>`;
  if(tm){if(TP.length>1)h+=`<div class="psteps">${TP.map(j=>{const d=mqTDone(q,j);return `<button class="pstep ${d?"done":"open"}${j===pi?" on":""}" data-mpart="${j}">${d?"✓ ":""}${mqGL(q,j)}</button>`;}).join("")}</div>`;}
  else if(NP>1)h+=`<div class="psteps">${q.parts.map((p,j)=>{const lock=j>ps;return `<button class="pstep ${j<ps?"done":j===ps?"open":"lock"}${j===pi?" on":""}" data-mpart="${j}" ${lock?'disabled title="ส่งคำตอบ Part ก่อนหน้าก่อน"':""}>${lock?"🔒 ":j<ps?"✓ ":""}${mqGL(q,j)}</button>`;}).join("")}</div>`;
  if(mqCaseDone(q))h+=myNoteTop(q);   /* 📝 my after-answer note above the question — only once the whole case has been answered (user 28 Oct 2026) */
  if(!q.sa){h+=`<section class="case${pi>0?" old":""}"><div class="case-lab">ข้อ ${esc(mqNum(q))}${pi>0?' <span class="oldtag">ข้อมูลเดิม</span>':""}</div><div class="stem">${q.stem}</div>${mqImgs(q.img,q.imgNote)}${q.gray&&!(mqIsOS()&&!mqCaseDone(q))?`<p class="gray">${esc(q.gray)}</p>`:""}</section>`;
    const prev=q.parts.slice(0,pi).filter(p=>p.info||p.img);
    if(prev.length)h+=`<details class="prev old" open><summary>ข้อมูลเพิ่มเติมจาก Part ก่อนหน้า <span class="oldtag">ข้อมูลเดิม</span></summary>${prev.map(p=>`<div class="pinfo"><span class="pn">${esc(mqGL(q,p.i).replace("Part ","P"))}</span><div>${p.info?`<div>${p.info}</div>`:""}${p.info&&(p.igray||p.gray)?`<p class="gray">${esc(p.igray||p.gray)}</p>`:""}${mqImgs(p.img,p.imgNote)}</div></div>`).join("")}</details>`;}
  const pm=SUBS.reduce((a,s)=>a+mqMk(s),0);
  h+=`<section class="part"><div class="part-h"><span class="pnum">${q.sa?"คำถาม":mqIsOS()?"ข้อย่อย":esc(gl)}</span><span class="mk">${pm} คะแนน</span>${pDone&&!mqReoIds(q,pi).length&&r.pt&&r.pt[pi]?`<span class="ptime">⏱ ใช้เวลา ${mqFmt(r.pt[pi])}</span>`:""}</div>`;
  /* Thai wording from the AC file sits under the English text it translates, like the case box: igray under the new information, sub gray under each Part's question (an old-style part.gray goes under the info, or under the first question) */
  const pg=part.igray||(part.info?part.gray:"");
  if(part.info)h+=`<div class="pinfo-cur"><span class="newtag">ข้อมูลใหม่</span>${part.info}${pg?`<p class="gray">${esc(pg)}</p>`:""}</div>`;
  h+=mqImgs(part.img,part.imgNote);
  SUBS.forEach(s=>{const i=s._i,sn=q.sa||mqIsOS()?"":"Part "+(i+1),t=(r.t&&r.t[i])||"";
    h+=`<div class="subq" id="mqs${i}"><div class="sh">${sn?`<span class="sn">${sn}</span>`:""}<div class="sq">${q.sa?q.stem:s.q}</div><span class="mk">${mqMk(s)} คะแนน</span></div>`;
    if(tm&&(s.tags||[]).length)h+=`<div class="ttags">${s.tags.map(x=>`<span class="ttag${v.tags.includes(x)?" on":""}">${esc(mqTN(x))}</span>`).join("")}</div>`;
    h+=mqImgs(s.img,s.imgNote);{const sg=q.sa?q.gray:(s.gray||(!part.info&&part.gray&&s===SUBS[0]?part.gray:""));if(sg)h+=`<p class="gray sgray">${esc(sg)}</p>`;}
    if(!mqSubDone(q,s,r)){h+=`<textarea class="ans" id="mqa${i}" data-i="${i}" rows="3" placeholder="พิมพ์คำตอบ${sn?" "+sn:""} (ไม่บังคับ)">${esc(t)}</textarea>`;
      if(mqReo(r,i))h+=`<div class="actions sact"><button class="btn primary" type="button" data-mssub="${i}">ส่งคำตอบ & ดูเฉลย${sn?" "+sn:""}</button><span class="hint">กำลังทำข้อนี้ใหม่</span></div>`;}
    else h+=mqDoneSub(q,pi,s,r,t);
    h+=`</div>`;});
  if(!pDone)h+=`<div class="actions"><button class="btn primary" id="mqSubmit" type="button">ส่งคำตอบ & ดูเฉลย${q.sa?"":" "+esc(gl)}</button><span class="hint">พิมพ์หรือไม่พิมพ์ก็ได้ · Ctrl/⌘+Enter${!tm&&pi<NP-1?` · ส่งแล้วจึงเปิด ${esc(mqGL(q,pi+1))}`:""}</span></div>`;
  else{const sc=mqScoreOf(SUBS,r);h+=`<div class="pverdict">`;
    if(sc.all){const p=Math.round(sc.got/sc.tot*100);h+=`<span class="pscore" style="color:${mqPct(p)}">${q.sa?"ได้":esc(gl)+":"} ${+sc.got.toFixed(1)}/${sc.tot} คะแนน</span>`;}else h+=`<span class="hint">ให้คะแนนตัวเองแล้ว ${sc.graded}/${sc.n} Part</span>`;
    const RI=mqReoIds(q,pi);if(RI.length>1)h+=`<button class="btn primary" id="mqSubReo" type="button">ส่งคำตอบข้อที่ทำใหม่ทั้งหมด (${RI.length})</button>`;
    h+=`<button class="link predo" id="mqRedoPart" type="button">↺ ทำ${q.sa?"ข้อนี้":" "+esc(gl)} ใหม่</button>`;
    const typed=SUBS.filter(x=>!mqReo(r,x._i)&&((r.t&&r.t[x._i])||"").trim());if(typed.length&&mqAiAvail()){const kk=q.uid+"#"+pi;h+=MQAI.busy[kk]?`<span class="hint">⏳ AI กำลังอ่านคำตอบ…</span>`:`<button class="link ailink" id="mqAi" type="button">🤖 ${typed.every(x=>r.ai&&r.ai[x._i])?"ให้ AI ประเมินใหม่":"ให้ AI ประเมินคำตอบ"}</button>`;}
    if(mqClOK()&&typed.length)h+=`<button class="link ailink" id="mqToCl" type="button">🤖 ให้ Claude ตรวจ (เปิดใน Claude ↗)</button>`;
    if(HAS_CLAUDE()&&CFG.siteUrl&&typed.some(x=>r.ai&&r.ai[x._i]))h+=`<button class="link ailink" id="mqToWeb" type="button">ส่งผลตรวจกลับเว็บ ↗</button>`;
    if(tm){const ix=TP.indexOf(pi);if(ix<TP.length-1)h+=`<button class="btn primary nextpart" id="mqNextPart" type="button">ไป ${esc(mqGL(q,TP[ix+1]))} →</button>`;}
    else if(pi<NP-1)h+=`<button class="btn primary nextpart" id="mqNextPart" type="button">ไป ${esc(mqGL(q,pi+1))} →</button>`;
    h+=`</div>`;
    if(tm?pi===TP[TP.length-1]:pi===NP-1)h+=mqExplain(q,r);}
  h+=`</section></div>`;
  {const done=Q.filter(x=>mqCaseDone(x)).length;$("pos").textContent=k>=0?`${k+1} / ${Q.length}`:"";$("count").textContent=`${done}/${Q.length}`;$("prog").style.width=(Q.length?done/Q.length*100:0)+"%";
    $("prev").textContent="ก่อนหน้า";$("next").textContent=v.r==="grand"?"สุ่มข้อถัดไป":"ถัดไป";$("prev").disabled=false;$("next").disabled=false;$("next").classList.toggle("primary",pDone);$("next").classList.toggle("ghost",!pDone);}
  $("main").innerHTML=h;mqBindView(q,pi);mqTStart();mqTPaint();
  if(pDone&&mqAiAvail()&&HAS_CLAUDE()){const kk=q.uid+"#"+pi;if(!MQAI.auto)MQAI.auto={};if(!MQAI.auto[kk]&&SUBS.some(x=>!mqReo(r,x._i)&&((r.t&&r.t[x._i])||"").trim()&&!(r.ai&&r.ai[x._i]))){MQAI.auto[kk]=1;setTimeout(()=>mqAiRun(q,pi,false),0);}}}
function mqDoneSub(q,pi,s,r,t){const i=s._i,typed=!!t.trim(),ai=(r.ai&&r.ai[i])||null,kk=q.uid+"#"+pi,sg=mqSug(s,r);let h="";
  h+=`<div class="mmine-lab">คำตอบของฉัน <span>· ส่งแล้ว</span></div><textarea class="ans ro" readonly rows="3" placeholder="— ไม่ได้พิมพ์คำตอบ —">${esc(t)}</textarea><div class="sbody">`;
  if(s.ctx)h+=`<div class="sblk"><span class="lab">① เคสส่วนที่เกี่ยวกับข้อนี้</span><div>${s.ctx}</div></div>`;
  if(s.qx)h+=`<div class="sblk"><span class="lab">② โจทย์ข้อนี้ถามอะไร</span><div>${s.qx}</div></div>`;
  h+=`<div class="sblk aibox"><span class="lab">③ คำตอบของฉันเป็นอย่างไร</span>`;
  if(!typed)h+=`<div class="muted">ไม่ได้พิมพ์คำตอบ — เทียบกับเฉลยและเกณฑ์ด้านล่าง แล้วให้คะแนนตัวเอง</div>`;
  else{if(ai)h+=`<div><b>🤖 AI:</b> ${mqNl(sg&&sg.grade===2&&ai.grade!==2?MQ_GOOD:ai.assess)}</div>${ai.missing&&!(sg&&sg.grade===2)?`<div class="aimiss"><b>ขาด / ควรเพิ่ม:</b> ${mqNl(ai.missing)}</div>`:""}`;
    else if(MQAI.busy[kk])h+=`<div class="muted">⏳ AI กำลังอ่านคำตอบ… (ครั้งแรกใน Claude จะมีหน้าต่างขออนุญาต)</div>`;
    const kg=r.kg&&r.kg[i];
    if(kg&&!ai){const miss=(s.points||[]).map((p,j)=>{const c=mqTicks(s,r)[j];return typeof p==="string"?(c===true?null:p):(Array.isArray(c)&&c.filter(Boolean).length>=(p.need||1)?null:(p.label||p.any.join(" / ")));}).filter(Boolean);
      h+=`<div>🔎 <b>เทียบคำสำคัญ</b>${kg.auto?" — มีคำตอบหลักตรงเกณฑ์ \"ได้\"":kg.tot?` — เจอ <b>${kg.got}/${kg.tot}</b> ประเด็น (ติ๊กให้ในข้อ ④ แล้ว)`:""}</div>${miss.length&&!kg.auto?`<div class="aimiss"><b>ยังไม่เจอในคำตอบ:</b> ${miss.map(x=>plain(x)).map(esc).join(" · ")}</div>`:""}<div class="muted">ระบบจับคำสำคัญแบบคร่าว ๆ (ไม่ใช้ AI ใช้ได้ไม่จำกัด) — ถ้าเขียนด้วยคำอื่นอาจจับไม่ได้ ตรวจและแก้ติ๊กเองได้</div>`;}
    else if(!ai&&!MQAI.busy[kk])h+=`<div class="muted">ข้อนี้ไม่มีคำสำคัญให้เทียบ — เทียบกับเฉลยและเกณฑ์ด้านล่างเอง</div>`;
    if(MQAI.err[kk])h+=`<div class="muted">${esc(MQAI.err[kk])}</div>`;
    if(!ai&&mqClOK())h+=`<div class="muted">อยากได้คำประเมินละเอียด → กด “🤖 ให้ Claude ตรวจ” ท้ายส่วนนี้</div>`;
    if(!ai&&!MQAI.busy[kk]&&mqAiAvail())h+=`<div><button class="link ailink" type="button" data-mairun="1">🤖 ให้ AI ประเมินคำตอบ</button></div>`;}
  h+=`</div><div class="model"><span class="lab">④ เฉลยและสิ่งที่ควรตอบ</span><div class="a">${s.ans||""}</div>${s.exp?`<div class="mexp">${mqRich(s.exp)}</div>`:""}`;
  if((s.points||[]).length){const c=mqTicks(s,r);h+=`<ul class="pts"><li class="ph">ประเด็นที่ควรมีในคำตอบ (ติ๊กข้อที่ตอบได้)</li>${s.points.map((p,j)=>{
    if(typeof p==="string")return `<li><label><input type="checkbox" data-ms="${i}" data-mp="${j}" ${c[j]===true?"checked":""}><span>${p}</span></label></li>`;
    const vv=Array.isArray(c[j])?c[j]:[],need=p.need||1;
    return `<li class="pgrp"><div class="pgl">${p.label?p.label+" ":""}<span class="alt">${need===1?"เลือกอย่างใดอย่างหนึ่งก็ถูก":`ตอบ ${need} อย่างจากนี้ก็ได้เต็ม`}</span></div><ul>${p.any.map((a,m)=>`<li><label><input type="checkbox" data-ms="${i}" data-mp="${j}" data-mk="${m}" ${vv[m]?"checked":""}><span>${a}</span></label></li>`).join("")}</ul></li>`;}).join("")}</ul>`;
    if(mqIsOS()){const f=mqFrac(s,r),sc=mqPtsScore(s,c.length?c:[]);h+=`<div class="oschk">Checklist ได้ <b>${sc.got}/${sc.tot}</b> ประเด็น${f!==null?` · ข้อย่อยนี้ได้ <b>${+(mqMk(s)*f).toFixed(1)}/${mqMk(s)}</b> คะแนน${r.gm&&r.gm[i]?" (เลือกคะแนนเอง)":""}`:""}</div>`;}}
  h+=`</div>`;
  const KL=[].concat(s.kimg||[]).filter(x=>IMGS[x]);
  if(s.key||KL.length)h+=`<div class="filekey"><span class="lab">เฉลยในไฟล์ (ของรุ่นพี่)</span>${s.key?`<div class="fk">${s.key}</div>`:""}${KL.length?`<div class="kimg">${KL.map(x=>imgHTML(x,"เฉลยจากไฟล์",1)).join("")}</div>`:""}</div>`;
  if(s.flag)h+=`<div class="sub-meta"><span class="tag warn">${esc(s.flag)}</span></div>`;
  h+=`<div class="sblk sugbox"><span class="lab">⑤ คะแนนที่แนะนำ</span>${sg?`<div class="sugline"><span class="sug g${sg.grade}">${MQ_GL[sg.grade]}</span> ${mqNl(sg.why||"")}</div><div class="muted">เป็นคำแนะนำ${sg.src==="kw"?"จากคำสำคัญ":sg.src==="ai"?"จาก AI":""}เท่านั้น — กดเลือกคะแนนเองด้านล่างได้</div>`:typed?`<div class="muted">ยังไม่มีคำแนะนำ</div>`:""}${s.rubric?`<div class="rubric"><b>เกณฑ์:</b> ${s.rubric}</div>`:""}</div>`;
  const g=r.g?r.g[i]:undefined;
  h+=`<div class="grade"><span class="gl">ให้คะแนนตัวเอง${r.gm&&r.gm[i]?"":g!==undefined?" (ตอนนี้ใช้คะแนนแนะนำ — กดเลือกเองได้)":""}:</span>${[[2,"✓ ได้"],[1,"◐ บางส่วน"],[0,"✗ ไม่ได้"]].map(([x,tx])=>`<button class="mgbtn g${x}" data-ms="${i}" data-mg="${x}" aria-pressed="${g===x}">${tx}${sg&&sg.grade===x?' <span class="sm">แนะนำ</span>':""}</button>`).join("")}<button class="link sredo" type="button" data-msredo="${i}">↺ ทำข้อนี้ใหม่</button></div></div>`;
  return h;}
const MQ_GL={2:"✓ ได้",1:"◐ บางส่วน",0:"✗ ไม่ได้"};
function mqExplain(q,r){const tm=mqTM(),S=tm?q.subs.filter(s=>mqTmatch(s)&&mqSubDone(q,s,r)):q.subs,sc=mqScoreOf(S,r);
  let h=`<section class="exp"><div class="exp-h">สรุปข้อ ${esc(mqNum(q))}</div><div class="verdict">`;
  if(sc.all){const p=Math.round(sc.got/sc.tot*100);h+=`<span class="mscore" style="color:${mqPct(p)}">${+sc.got.toFixed(1)}/${sc.tot} คะแนน (${p}%)</span>`;}
  else h+=`<span class="ans">ให้คะแนนตัวเองแล้ว ${sc.graded}/${sc.n} Part — ติ๊กประเด็นหรือกด ได้/บางส่วน/ไม่ได้ ในแต่ละ Part</span>`;
  if(r.time)h+=`<span class="tag">⏱ ใช้เวลาทั้งข้อ ${mqFmt(r.time)}</span>`;h+=`</div>`;
  if(q.parts.length>1&&!tm)h+=`<div class="tagline">${q.parts.map(p=>{const s=mqScoreOf(p.subs,r);return `<span class="tag">${esc(mqGL(q,p.i))}: ${s.all?`${+s.got.toFixed(1)}/${s.tot}`:"ยังให้คะแนนไม่ครบ"}</span>`;}).join("")}</div>`;
  const FN=CFG.files||{};h+=`<div class="tagline">${q.rep?`<span class="tag rep">repeated x${q.rep}</span>`:""}${q.seen?`<span class="tag rep">เคยออก ${esc(q.seen)}</span>`:""}<span class="tag">ไฟล์ ${esc(FN[q.file]||q.file)} หน้า ${esc(q.page)} · ข้อ ${esc(mqNum(q))} ในต้นฉบับ</span><button class="link redo" id="mqRedoCase" type="button">ทำข้อนี้ใหม่ทั้งข้อ</button>${q.flag?`<span class="tag warn">${esc(typeof q.flag==="string"?q.flag:"⚠ เฉลยในไฟล์ไม่ชัวร์")}</span>`:""}</div>`;
  const sec=(t,b,cls)=>b?`<div class="sec ${cls||""}"><h3>${t}</h3>${b}</div>`:"";
  h+=sec("ประเด็นสำคัญของข้อนี้",q.interp?`<p>${q.interp}</p>`:"");
  h+=sec("แนวคิด / ลำดับการคิดทั้งเคส",q.approach?`<div>${mqRich(q.approach)}</div>`:"");
  h+=sec("ข้อความในไฟล์ (recall)",mqIsOS()&&q.gray?`<div class="box">${esc(q.gray)}</div>`:"","notes");
  h+=sec("บทผู้ป่วยจำลอง / ผลตรวจที่ผู้คุมบอก",q.sp?`<div class="box">${q.sp}</div>`:"","notes");
  h+=sec("ระวังกับดัก",q.trap?`<div class="box">${q.trap}</div>`:"","trap");
  h+=sec("สรุปความรู้จากข้อนี้",(q.summary||[]).length?`<ul>${q.summary.map(s=>`<li>${s}</li>`).join("")}</ul>`:"");
  h+=sec("สิ่งที่เขียนไว้ในไฟล์",q.notes?`<div class="box">${mqRich(q.notes)}</div>`:"","notes");
  {const KL=[].concat(q.kimg||[]).filter(x=>IMGS[x]);if(KL.length)h+=sec("หน้า/รูปอ้างอิงจากไฟล์เฉลย",`<div class="kimg">${KL.map(x=>imgHTML(x,"หน้าเฉลยจากไฟล์",1)).join("")}</div>`);}
  h+=sec("ช่วยจำ",q.mnemonic?`<p>${q.mnemonic}</p>`:"");
  h+=sec("ความเห็นของผม",q.opinion?`<div class="box">${q.opinion}</div>`:"","opinion");
  h+=sec("คำถามต่อยอดที่อาจออก",(q.variants||[]).length?`<ul>${q.variants.map(s=>`<li>${s}</li>`).join("")}</ul>`:"");
  h+=myNoteSec(q);   /* same note store as MCQ (P.post, shared by both Phases) */
  return h+`</section>`;}
function mqRe(){const y=scrollY;mqView();scrollTo(0,y);}
function mqClearSub(x,i){["t","g","gm","c","cs","ai","kg"].forEach(k=>{if(x[k])delete x[k][i];});}
function mqSubmit(){const c=mqCur();if(!c)return;const {q,pi}=c;if(mqPDone(q,pi))return;mqTStop();const x=mqEns(q);if(x.pz)delete x.pz[pi];
  const subs=mqTM()?mqTsubs(q,pi):q.parts[pi].subs;
  if(mqTM()){x.sd=x.sd||{};subs.forEach(s=>{if(!mqSubDone(q,s,x)){x.sd[s._i]=1;if(x.reo)delete x.reo[s._i];}});}
  else{if(pi!==mqPs(q))return;x.ps=pi+1;subs.forEach(s=>{if(x.reo)delete x.reo[s._i];});}
  if(mqPs(q,x)>=q.parts.length){x.sub=1;x.at=now();}
  mqKwFill(q,subs);
  mqSave(q);mqView();const e=$("mqs"+subs[0]._i);if(e)setTimeout(()=>e.scrollIntoView({block:"start"}),60);if(HAS_CLAUDE())mqAiRun(q,pi,false);else if(mqClOK()&&mqS().v.ask!==false&&mqTyped(q,x))setTimeout(()=>mqAskAfter(q),450);}
function mqSubmitReo(q,pi,ids){if(!ids.length)return;mqTStop();const x=mqEns(q);ids.forEach(i=>{if(x.reo)delete x.reo[i];});if(x.pz&&!mqReoIds(q,pi).length)delete x.pz[pi];
  mqKwFill(q,ids.map(i=>q.subs[i]));mqSave(q);mqView();const e=$("mqs"+ids[0]);if(e)setTimeout(()=>e.scrollIntoView({block:"start"}),60);if(HAS_CLAUDE())mqAiRun(q,pi,false);}
async function mqRedoSub(q,pi,i){if(!await uiAsk("ทำข้อนี้ใหม่? คำตอบ ติ๊ก และคะแนนของข้อนี้จะถูกล้าง (ข้ออื่นไม่เปลี่ยน)"))return;mqTStop();const x=mqEns(q);mqClearSub(x,i);x.reo=x.reo||{};x.reo[i]=1;x.sub=0;mqSave(q);mqView();
  const ta=$("mqa"+i);if(ta){ta.scrollIntoView({block:"center"});ta.focus({preventScroll:true});}}
async function mqRedoPart(q,pi){if(!await uiAsk("ทำส่วนนี้ใหม่ทั้งหน้า? คำตอบ ติ๊ก คะแนน และเวลาของส่วนนี้จะถูกล้าง (ส่วนอื่นไม่เปลี่ยน)"))return;mqTStop();const x=mqEns(q);if(x.pz)delete x.pz[pi];x.reo=x.reo||{};
  (mqTM()?mqTsubs(q,pi):q.parts[pi].subs).forEach(s=>{const was=mqSubDone(q,s,x);mqClearSub(x,s._i);if(was)x.reo[s._i]=1;});x.sub=0;x.pt=x.pt||{};x.time=Math.max(0,(x.time||0)-(x.pt[pi]||0));x.pt[pi]=0;mqSave(q);mqView();scrollTo(0,0);}
async function mqRedoCase(q){if(!await uiAsk(mqTM()?"ล้างคำตอบและคะแนนของ Part ที่ตรงหัวข้อที่เลือกในข้อนี้ เพื่อทำใหม่?":"ล้างคำตอบ คะแนน และเวลาของข้อนี้ทั้งข้อ เพื่อทำใหม่?"))return;mqTStop();const A=mqA();
  if(mqTM()){const x=mqEns(q);x.reo=x.reo||{};q.subs.filter(mqTmatch).forEach(s=>{const was=mqSubDone(q,s,x);mqClearSub(x,s._i);if(x.sd)delete x.sd[s._i];if(was&&s._p<(x.ps||0))x.reo[s._i]=1;});x.sub=0;x.ts=now();}
  else A[q.uid]={t:{},g:{},gm:{},c:{},cs:{},ps:0,sd:{},ts:now()};mqS().v.pi=mqDefPart(q);save();mqView();scrollTo(0,0);}
function mqBindView(q,pi){const r=()=>mqRec(q)||{};
  mountNotes(document);
  {const b=$("mqPause");if(b)b.onclick=mqTogglePause;}{const b=$("mqTRes");if(b)b.onclick=mqTReset;}
  $("mqStar").onclick=()=>{const S=mqS().star;S[q.uid]=[mqStar(q)?0:1,now()];save();mqRe();};
  document.querySelectorAll("[data-mpart]").forEach(b=>b.onclick=()=>mqOpen(q.uid,+b.dataset.mpart,mqS().v.r));
  document.querySelectorAll("textarea.ans:not(.ro)").forEach(el=>{const fit=()=>{el.style.height="auto";el.style.height=Math.max(84,el.scrollHeight+4)+"px";};fit();
    el.addEventListener("input",()=>{const x=mqEns(q);x.t[el.dataset.i]=el.value;x.ts=now();fit();clearTimeout(MQsaveT);MQsaveT=setTimeout(save,700);});});
  document.querySelectorAll("textarea.ans.ro").forEach(el=>{el.style.height="auto";el.style.height=Math.max(60,el.scrollHeight+4)+"px";});
  {const b=$("mqSubmit");if(b)b.onclick=mqSubmit;}
  {const b=$("mqSubReo");if(b)b.onclick=()=>mqSubmitReo(q,pi,mqReoIds(q,pi));}
  document.querySelectorAll("[data-mssub]").forEach(b=>b.onclick=()=>mqSubmitReo(q,pi,[+b.dataset.mssub]));
  document.querySelectorAll("[data-msredo]").forEach(b=>b.onclick=()=>mqRedoSub(q,pi,+b.dataset.msredo));
  {const b=$("mqRedoPart");if(b)b.onclick=()=>mqRedoPart(q,pi);}{const b=$("mqRedoCase");if(b)b.onclick=()=>mqRedoCase(q);}
  {const b=$("mqAi");if(b)b.onclick=()=>mqAiRun(q,pi,true);}document.querySelectorAll("[data-mairun]").forEach(b=>b.onclick=()=>mqAiRun(q,pi,true));
  {const b=$("mqNextPart");if(b)b.onclick=()=>mqStep(1);}
  {const b=$("mqToCl");if(b)b.onclick=()=>mqToClaude([q]);}{const b=$("mqToWeb");if(b)b.onclick=()=>mqToWeb([q.uid]);}

  document.querySelectorAll(".pts input").forEach(el=>el.onchange=()=>{const x=mqEns(q),i=+el.dataset.ms,j=+el.dataset.mp,s=q.subs[i],sig=mqSig(s);
    x.c=x.c||{};x.cs=x.cs||{};if(x.cs[i]!==sig){x.c[i]=[];x.cs[i]=sig;}x.c[i]=x.c[i]||[];
    if(el.dataset.mk!==undefined){const m=+el.dataset.mk;if(!Array.isArray(x.c[i][j]))x.c[i][j]=[];x.c[i][j][m]=el.checked;}else x.c[i][j]=el.checked;
    x.gm=x.gm||{};x.g=x.g||{};if(!x.gm[i]){const sc=mqPtsScore(s,x.c[i]);x.g[i]=sc.got>=sc.tot?2:sc.got>0?1:0;}mqSave(q);mqRe();});
  document.querySelectorAll(".mgbtn").forEach(el=>el.onclick=()=>{const x=mqEns(q),i=+el.dataset.ms,v=+el.dataset.mg;x.g=x.g||{};x.gm=x.gm||{};
    if(x.g[i]===v&&x.gm[i]){delete x.g[i];delete x.gm[i];const k=x.kg&&x.kg[i];if(k&&!(x.ai&&x.ai[i]))x.g[i]=k.grade;else if(x.ai&&x.ai[i]&&x.ai[i].grade!=null)x.g[i]=x.ai[i].grade;}else{x.g[i]=v;x.gm[i]=1;}mqSave(q);mqRe();});}
document.addEventListener("keydown",e=>{try{if(view!=="mq")return;if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){const b=$("mqSubmit")||$("mqSubReo")||document.querySelector("[data-mssub]");if(b){e.preventDefault();b.click();}}}catch(x){}});
/* ---- Phase 2: high-yield toggles from MEQ old exams only ---- */
function mqHY(){rHySum(mqKN());}   /* site/hysum.js */
/* ---- ส่งคำตอบ MEQ จากเว็บไปให้ Claude ตรวจ แล้วส่งผลกลับเว็บ ----
   claude.ai ไม่ส่งข้อมูลจากลิงก์เข้า artifact และเก็บความคืบหน้าแยกจากเว็บ จึงใช้ "รหัส" (คัดลอก → วางใน Claude) ขาไป และลิงก์ #meq= ขากลับ
   v.ask (ต่อวอร์ด): true = หลังกดส่งคำตอบบนเว็บ ถามทุกครั้งว่าจะส่งให้ Claude ตรวจไหม · false = ตรวจด้วยคำสำคัญอย่างเดียว (ยังกดส่งเองได้ทุกข้อ) */
var MQIN=null,MQPEND=null;
const mqClOK=()=>!HAS_CLAUDE()&&!!CFG.artifactUrl;
function mqPack(r,full){const o={t:r.t||{},ps:r.ps||0,sd:r.sd||{},sub:r.sub||0,time:r.time||0,pt:r.pt||{},ts:r.ts||now()};if(full)["g","gm","c","cs","kg","ai","reo"].forEach(k=>{if(r[k])o[k]=r[k];});return o;}
function mqTyped(q,r){return !!r&&q.subs.some(s=>mqSubDone(q,s,r)&&((r.t&&r.t[s._i])||"").trim());}
function mqNeedAI(q,r){r=r||mqRec(q);return !!r&&q.subs.some(s=>mqSubDone(q,s,r)&&((r.t&&r.t[s._i])||"").trim()&&!(r.ai&&r.ai[s._i]));}
function mqDlg(html,bind){let d=$("mqDlg");if(!d){d=document.createElement("div");d.id="mqDlg";d.className="mqdlg";document.body.appendChild(d);}
  d.innerHTML=`<div class="mqdlg-box">${html}</div>`;d.hidden=false;const close=()=>{d.hidden=true;d.innerHTML="";};d.onclick=e=>{if(e.target===d)close();};d.querySelectorAll("[data-mqx]").forEach(b=>b.onclick=close);if(bind)bind(d,close);}
async function mqToClaude(qs){const A=mqA(),recs={};qs.forEach(q=>{const r=A[q.uid];if(mqTyped(q,r))recs[q.uid]=mqPack(r);});const n=Object.keys(recs).length;
  if(!n){toast("ยังไม่มีคำตอบที่พิมพ์และส่งแล้ว");return;}
  let code="";try{code="MQ."+await packStr(JSON.stringify({w:ward,p:ph(),k:mqKN(),r:recs}));}catch(e){toast("สร้างรหัสไม่สำเร็จ");return;}
  let copied=false;try{await navigator.clipboard.writeText(code);copied=true;}catch(e){}
  mqDlg(`<h3>ให้ Claude ตรวจ ${n} ข้อ</h3><ol class="mqsteps"><li>${copied?"<b>คัดลอกรหัสแล้ว</b> ✓":"กดคัดลอกรหัสด้านล่าง"}</li><li>กดเปิด Claude แล้วเลือก <b>“ตรวจคำตอบ MEQ จากเว็บ”</b></li><li>กด <b>วางรหัส</b> — Claude จะประเมินทุก Part ให้ แล้วกด <b>ส่งผลกลับเว็บ</b> ได้</li></ol>
    <textarea class="mqcode" readonly>${esc(code)}</textarea><div class="dlg-act"><button class="btn ghost" type="button" data-mqx="1">ปิด</button><button class="btn" type="button" id="mqCopy">คัดลอกรหัส</button><a class="btn primary" href="${esc(artLink(ward+"/mqin"))}" target="_blank" rel="noopener" id="mqGoCl">เปิด Claude ↗</a></div><p class="hint" style="margin:8px 0 0">ใน Claude ใช้โควตาของบัญชี Claude ของคุณ · ถ้าไม่ส่ง เว็บก็ยังแนะนำคะแนนจากคำสำคัญได้ไม่จำกัด</p>`,
    (d,close)=>{d.querySelector("#mqCopy").onclick=async()=>{try{await navigator.clipboard.writeText(code);toast("คัดลอกรหัสแล้ว");}catch(e){const t=d.querySelector(".mqcode");t.focus();t.select();toast("กด Ctrl/⌘+C เพื่อคัดลอก");}};d.querySelector("#mqGoCl").addEventListener("click",()=>setTimeout(close,300));});}
function mqAskAfter(q){mqDlg(`<h3>ส่งข้อนี้ให้ Claude ตรวจไหม?</h3><p>เว็บแนะนำคะแนนจากคำสำคัญให้แล้ว (ใช้ได้ไม่จำกัด) — ถ้าอยากได้คำประเมินละเอียดว่าขาดอะไร ให้ Claude ตรวจได้</p>
  <label class="chk"><input type="checkbox" id="mqAskOff"><span>ไม่ต้องถามอีก (เปิดใหม่ได้ที่หน้า MEQ ของวอร์ด)</span></label><div class="dlg-act"><button class="btn ghost" type="button" id="mqNo">ไม่ส่ง</button><button class="btn primary" type="button" id="mqYes">ส่งให้ Claude ตรวจ</button></div>`,
  (d,close)=>{const off=()=>{if(d.querySelector("#mqAskOff").checked){mqVset({ask:false});save();}};d.querySelector("#mqNo").onclick=()=>{off();close();};d.querySelector("#mqYes").onclick=()=>{off();close();mqToClaude([q]);};});}
/* Claude side: paste page */
function mqIn(){const v=W_()?mqS().v:null;let h=`<div class="mqv"><div class="whead"><h1 class="h2">ตรวจคำตอบ ${W_()?mqKN():"MEQ"} จากเว็บ</h1><a href="#/${esc(ward)}">กลับหน้าวอร์ด</a></div>`;
  if(!HAS_CLAUDE())h+=`<div class="card"><h3>หน้านี้ใช้ใน Claude</h3><span class="rd">บนเว็บให้กด “🤖 ให้ Claude ตรวจ” ในข้อ MEQ แล้วเปิด Claude ตามขั้นตอน</span></div>`;
  else{h+=`<p class="sub" style="margin:0 0 10px">วางรหัสที่คัดลอกจากเว็บ — Claude จะนำคำตอบเข้ามา ประเมินทุก Part ให้ แล้วส่งผลกลับเว็บได้</p>
    <div class="row2"><button class="btn primary" type="button" id="mqPasteCb">📋 วางรหัสจากคลิปบอร์ด</button></div><textarea class="mqcode" id="mqCodeIn" placeholder="หรือวางรหัส (ขึ้นต้นด้วย MQ.) ที่นี่"></textarea><button class="btn" type="button" id="mqCodeGo">นำเข้าและให้ Claude ตรวจ</button><p class="hint" id="mqInNote"></p>`;
    if(MQIN&&MQIN.w===ward){const L=mqL();h+=`<div class="tl-h">นำเข้าแล้ว ${MQIN.u.length} ข้อ (Phase ${MQIN.p})</div><div class="trows">`+MQIN.u.map(u=>{const q=L.find(x=>x.uid===u);if(!q)return "";const r=mqRec(q),busy=q.parts.some(p=>MQAI.busy[q.uid+"#"+p.i]),sc=mqScore(q);
        return `<div class="crow"><button class="cn" type="button" data-mgo="${esc(u)}"><span class="cl">ข้อ</span>${esc(mqNum(q))}</button><div style="min-width:0"><div class="cq">${esc(mqTitle(q))}</div><div class="hint">${busy?"⏳ Claude กำลังตรวจ…":mqNeedAI(q,r)?(MQAI.off?"ใช้ Claude ตรวจไม่ได้ในมุมมองนี้":"รอตรวจ"):"✓ ตรวจแล้ว"}${sc&&sc.all?` · ${+sc.got.toFixed(1)}/${sc.tot}`:""}</div></div></div>`;}).join("")+`</div>`;
      if(CFG.siteUrl)h+=`<button class="btn primary" type="button" id="mqBack" style="margin-top:12px">ส่งผลตรวจกลับเว็บ ↗</button><p class="hint" id="mqBackNote"></p>`;}}
  h+=`</div>`;$("main").innerHTML=h;
  const imp=async t=>{const n=$("mqInNote");try{await mqImport(t);}catch(e){if(n)n.textContent="อ่านรหัสไม่ได้ — คัดลอกรหัสจากเว็บใหม่ทั้งหมดแล้ววางอีกครั้ง";}};
  {const b=$("mqPasteCb");if(b)b.onclick=async()=>{let t="";try{t=await navigator.clipboard.readText();}catch(e){}if(!/MQ\./.test(t)){const n=$("mqInNote");if(n)n.textContent="อ่านคลิปบอร์ดไม่ได้ — กดค้างในช่องด้านล่างแล้ววางรหัสเอง";$("mqCodeIn").focus();return;}imp(t);};}
  {const b=$("mqCodeGo");if(b)b.onclick=()=>imp($("mqCodeIn").value);}
  document.querySelectorAll("[data-mgo]").forEach(b=>b.onclick=()=>mqOpen(b.dataset.mgo,undefined,"service"));
  {const b=$("mqBack");if(b)b.onclick=()=>mqToWeb(MQIN.u);}
  if(MQPEND&&MQPEND.w===ward){const o=MQPEND;MQPEND=null;mqApply(o);}}
async function mqImport(t){const m=/MQ\.([zj]\.[A-Za-z0-9_-]+)/.exec(String(t||""));if(!m)throw 0;const o=JSON.parse(await unpackStr(m[1]));
  if(!o||!WARDS[o.w]||!o.r||typeof o.r!=="object")throw 0;PWof(st,o.w).type=o.k==="OSCE"?"OSCE":"MEQ";if(o.w!==ward){MQPEND=o;go(o.w+"/mqin");return;}mqApply(o);}
function mqApply(o){st.phase=o.p===2?2:1;const L=mqL(o.w),A=mqA(),got=[];mqVset({ctx:"set",r:"service"});
  Object.keys(o.r).forEach(u=>{const q=L.find(x=>x.uid===u),inc=o.r[u];if(!q||!inc)return;const x=A[u]||(A[u]={t:{},g:{},gm:{},c:{},cs:{},ps:0,sd:{},ts:0});
    q.subs.forEach(s=>{const i=s._i,nt=(inc.t||{})[i];if(nt!==undefined&&nt!==(x.t||{})[i]){x.t=x.t||{};x.t[i]=nt;if(x.ai)delete x.ai[i];if(x.gm)delete x.gm[i];}});
    x.ps=Math.max(x.ps||0,inc.ps||0);x.sd=Object.assign({},x.sd||{},inc.sd||{});if(inc.sub)x.sub=1;x.time=Math.max(x.time||0,inc.time||0);x.pt=x.pt||{};for(const k in inc.pt||{})x.pt[k]=Math.max(x.pt[k]||0,inc.pt[k]);
    if(x.reo)q.subs.forEach(s=>{if(inc.sd&&inc.sd[s._i]||s._p<(inc.ps||0))delete x.reo[s._i];});
    mqKwFill(q,q.subs.filter(s=>mqSubDone(q,s,x)&&!(x.ai&&x.ai[s._i])));x.ts=now();got.push(u);});
  MQIN={w:o.w,p:st.phase,u:got};save();toast(`นำเข้าคำตอบ ${got.length} ข้อแล้ว`);mqIn();mqInRun();}
async function mqInRun(){if(!MQIN)return;const L=mqL(MQIN.w);for(const u of MQIN.u){const q=L.find(x=>x.uid===u);if(!q)continue;
  for(const p of q.parts){if(MQAI.off||ward!==MQIN.w)return;if(mqNeedAI(q)){await mqAiRun(q,p.i,false);if(view==="mqin")mqIn();}}}}
/* Claude side → website: #meq=<packed records> */
async function mqToWeb(uids){const A=mqA(),recs={};uids.forEach(u=>{if(A[u])recs[u]=mqPack(A[u],true);});const note=$("mqBackNote");
  try{const url=CFG.siteUrl.replace(/#.*$/,"")+"#meq="+await packStr(JSON.stringify({w:ward,p:ph(),k:mqKN(),r:recs}));
    openOut(url);
    if(note){note.innerHTML=`เปิดเว็บในแท็บใหม่แล้ว — ถ้าไม่เปิด <button class="linkbtn" type="button" id="mqBackCopy">คัดลอกลิงก์</button> ไปเปิดในเบราว์เซอร์เอง`;$("mqBackCopy").onclick=async()=>{try{await navigator.clipboard.writeText(url);toast("คัดลอกลิงก์แล้ว");}catch(e){uiCopy("คัดลอกลิงก์นี้:",url);}};}}
  catch(e){toast("สร้างลิงก์ไม่สำเร็จ");}}
/* website side: receive #meq= */
function mqCheckImport(){const m=/[#&]meq=([zj]\.[A-Za-z0-9_-]+)/.exec(location.hash||"");if(!m)return false;
  try{history.replaceState(null,"",location.pathname+location.search+"#/");}catch(e){location.hash="#/";}
  (async()=>{try{const o=JSON.parse(await unpackStr(m[1]));if(!o||!WARDS[o.w]||!o.r)throw 0;const p=o.p===2?2:1,K=o.k==="OSCE"?"OSCE":"MEQ",PW=PWof(st,o.w);PW.type=K;const A=mqInitP(PW,K)["a"+p],L=mqL(o.w,K);let n=0,last=null;
    for(const u in o.r){const q=L.find(x=>x.uid===u),inc=o.r[u];if(!q||!inc)continue;const x=A[u];
      if(!x||(inc.ts||0)>=(x.ts||0))A[u]=Object.assign({},inc,{ts:now()});else{x.ai=Object.assign({},x.ai||{},inc.ai||{});x.ts=now();}n++;last=u;}
    st.phase=p;save();toast(`รับผลตรวจจาก Claude แล้ว ${n} ข้อ`);
    if(n===1){ward=o.w;mqVset({u:last,ctx:"set",r:"service",pi:0});const q=L.find(x=>x.uid===last);mqS().v.pi=q?q.parts.length-1:0;save();go(o.w+"/mq");}else go(o.w+"/mqr");}
  catch(e){toast("ลิงก์ผลตรวจจาก Claude ใช้ไม่ได้");}})();return true;}
