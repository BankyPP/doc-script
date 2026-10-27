(function(){
"use strict";
/* ============================================================
   AC MCQ website — wards → home (MCQ/MEQ/OSCE · Phase 1/2 · rounds) → quiz
   Question view is the same as the platform (template.html).
   Progress: localStorage per browser; optional Firebase account sync.
   ============================================================ */
const L="ABCDE";
/* an image is either a file path, or (Claude artifact build) a slot in a sprite sheet {p,w,h,W,H,y} drawn with CSS so it scales like an <img> */
function imgHTML(k,alt,lazy){const v=IMGS[k];if(!v)return "";if(typeof v==="string")return `<img ${lazy?'loading="lazy" ':""}src="${v}" alt="${alt}">`;
  const py=v.H>v.h?v.y/(v.H-v.h)*100:0;
  return `<span class="spr" role="img" aria-label="${alt}" style="width:min(100%,${v.w}px);aspect-ratio:${v.w}/${v.h};background-image:url('${v.p}');background-size:${(v.W/v.w*100).toFixed(4)}% auto;background-position:0 ${py.toFixed(5)}%"></span>`;}
const CFG=(typeof CONFIG!=="undefined"&&CONFIG)||{};
/* institution of this website (config "inst"): MDCU = repo root, SI = si/config.json — used in AI prompts */
const INST=Object.assign({id:"mdcu",name:"MDCU",th:"จุฬาฯ",en:"Chulalongkorn University (MDCU)",enShort:"Chulalongkorn University",stu:"นิสิตแพทย์"},CFG.inst||{});
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const plain=s=>{try{return (new DOMParser().parseFromString(String(s==null?"":s),"text/html").body.textContent||"").replace(/\s+/g," ").trim();}catch(e){return String(s||"");}};
const H7=s=>{let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(36).padStart(7,"0");};
const now=()=>Date.now();
const IN_FRAME=(()=>{try{return window.top!==window;}catch(e){return true;}})();   /* true when shown inside claude.ai (artifact) */

/* ---------------- wards & question banks ---------------- */
const WL=(CFG.wards&&CFG.wards.length)?CFG.wards:[{id:"main",name:CFG.brand||"คลังข้อสอบ",brand:CFG.brand||"MCQ",short:"MCQ"}];
/* each ward carries the study year it is taken in (config wards[].year, e.g. "Y4"; a Y5 subject is a new ward with "Y5") — appended to its names */
WL.forEach(w=>{w.year=w.year||CFG.year||"";if(!w.year)return;const y=" "+w.year;if(!String(w.name).endsWith(y))w.name+=y;w.short=(w.short||w.id)+(String(w.short||"").endsWith(y)?"":y);});
const wYear=()=>(ward&&WARDS[ward]&&WARDS[ward].cfg.year)||CFG.year||"";
const YEAR=q=>parseInt(String(q.set).replace(/\D/g,""))||0;
const ROK=r=>{r=String(r||"");let m=/^Ro?([A-Z])(\d*)$/.exec(r);if(m)return [0,m[1].charCodeAt(0),+m[2]||0];m=/^Ro?(\d+)$/.exec(r);if(m)return [1,+m[1],0];return [2,0,0];};
const cmpRo=(a,b)=>{const x=ROK(a.ro),y=ROK(b.ro);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2];};
const setKey=q=>q.set+" "+q.ro;
WL.forEach(w=>{
  const W=WARDS[w.id]||(WARDS[w.id]={QB:[]});W.cfg=w;
  /* q.notice = a "ข้อ 0" page of a set (e.g. YUZU resignation form): shown only in the Service round of that set, never counted, never in other rounds */
  W.NOTE=W.QB.filter(q=>q.notice);W.QB=W.QB.filter(q=>!q.notice);const QB=W.QB;
  QB.forEach((q,i)=>{q.rid=i+1;});
  QB.sort((a,b)=>YEAR(b)-YEAR(a)||cmpRo(a,b)||a.rid-b.rid);
  QB.forEach((q,i)=>{q.id=i+1;});
  W.RID2ID={};W.byRid={};QB.forEach(q=>{W.RID2ID[q.rid]=q.id;W.byRid[q.rid]=q;});
  const seen={};QB.forEach(q=>{let u=[q.set,q.ro,q.file,q.page,q.orig,(q.stem||"").slice(0,48)].join("|");if(seen[u])u+="#"+(++seen[u]);else seen[u]=1;q.uid=u;});
  W.byU={};QB.forEach(q=>{W.byU[q.uid]=q;});
  W.NOTE.forEach(q=>{q.id=0;q.uid="NOTE|"+q.set+"|"+q.ro;q.opts=q.opts||["ปิด"];W.byU[q.uid]=q;});
  /* related questions (data/dups.js: groups of set|ro|orig) → W.REL[uid] = [other uids] */
  {const k2u={};QB.forEach(q=>{k2u[q.set+"|"+q.ro+"|"+q.orig]=q.uid;});W.REL={};(W.DUP||[]).forEach(g=>{const us=g.map(k=>k2u[k]).filter(Boolean);us.forEach(u=>{W.REL[u]=us.filter(x=>x!==u);});});}
  W.sets=[...new Set(QB.map(setKey))];
  W.R=s=>String(s==null?"":s).replace(/(ข้อ(?:ถัดไป)?\s*)(\d[\d,\s]*(?:\([^()]*\)[\d,\s]*)*)/g,(m,p,nums)=>p+nums.replace(/\([^()]*\)|\d+/g,t=>t[0]==="("?W.R(t):((+t>=10&&W.RID2ID[+t])?W.RID2ID[+t]:t)));
  /* Unit round banks (<dir>/unit_*.js → W.UNIT.push({id,title,short,src,QB:[…]})): new case-based questions per lecture, shared by both phases */
  W.UNIT=(W.UNIT||[]).filter(x=>x&&x.id&&Array.isArray(x.QB));W.byLec={};
  W.UNIT.forEach(Lc=>{W.byLec[Lc.id]=Lc;Lc.QB.forEach((q,i)=>{q.unit=Lc.id;q.n=q.n||i+1;q.id="U"+q.n;q.set=Lc.short||Lc.title;q.ro="Unit";q.uid="U|"+Lc.id+"|"+q.n;W.byU[q.uid]=q;});});
});

/* ---------------- state ---------------- */
const KEY=(CFG.storageKey||"mcq-bank")+"-site-v3", IKEY=KEY+"-ink";
const ld=k=>{try{return JSON.parse(localStorage.getItem(k)||"null");}catch(e){return null;}};
let st=ld(KEY)||{};
if(!st.w)st.w={}; if(st.phase!==2)st.phase=1;
let ink=ld(IKEY)||{};
const blankSvc=()=>({set:"all",status:"all",cur:""});
/* Morning round is one set per day for both Phases (user 12 Oct 2026): slot P.morn[1] only — an older per-Phase set in P.morn[2] is folded in (the busier set of the same day stays; the other, if answered, goes to history as "|2") */
function mornOne(P){const b=P.morn&&P.morn[2];if(!b)return;const a=P.morn[1],n=x=>Object.keys((x&&x.ans)||{}).length;let keep=a,other=b;
  if(!a||!a.day||(b.day>a.day)||(b.day===a.day&&n(b)>n(a))){keep=b;other=a;}
  if(other&&other.day&&n(other)){const same=other.day===keep.day,pp=same?2:1;P.mornH[other.day+"|"+pp]=Object.assign({},other,{p:pp});}
  P.morn[1]=keep;delete P.morn[2];}
/* a new ward opens on its first exam type that the ward actually has (MCQ unless config noExam lists it, e.g. SI Prevent Med = MEQ only) */
const firstType=id=>{const w=WL.find(x=>x.id===id),no=(w&&w.noExam)||[];return ["MCQ","MEQ","OSCE"].find(t=>!no.includes(t))||"MCQ";};
function PWof(S,id){
  let P=S.w[id];if(!P)P=S.w[id]={};
  P.att=P.att||{};P.att[1]=P.att[1]||{};P.att[2]=P.att[2]||{};
  P.pre=P.pre||{};P.pre[1]=P.pre[1]||{};P.pre[2]=P.pre[2]||{};
  P.open=P.open||{};P.open[1]=P.open[1]||{};P.open[2]=P.open[2]||{};
  P.svc=P.svc||{};P.svc[1]=P.svc[1]||blankSvc();P.svc[2]=P.svc[2]||blankSvc();
  P.flag=P.flag||{};P.post=P.post||{};P.skeep=P.skeep||{};   /* Ward staff round: questions kept on purpose {uid:[on,ts]} */P.pick=P.pick||[];P.type=P.type||firstType(id);
  if(P.sess===undefined)P.sess=null;
  P.unit=P.unit||{};P.unit.att=P.unit.att||{};        /* Unit round answers (both phases share) */
  P.morn=P.morn||{};                                   /* Morning round: {1|2: {day, list, ans, ts}} */
  P.mornH=P.mornH||{};mornOne(P);                                 /* Morning round history: {"<day>|<phase>": {day, p, list, ans, ts}} — earlier days, archived when a new day's set is made */
  P.adm=P.adm||{cur:null,ans:null,next:null,n:0,right:0,recent:[],ts:0};   /* Admission round */
  P.spc=P.spc||{cur:null,ans:null,next:null,n:0,right:0,recent:[],ts:0};spcInitP(P.spc);   /* Specialty round (site/spc.js) — same engine as Admission, content only from the ward's own files */
  P.seen=P.seen||{};   /* where each question has been shown: {uid: {roundKey: firstTs}} */
  P.reset=P.reset||{};P.reset[1]=P.reset[1]||{};P.reset[2]=P.reset[2]||{};
  mqInitP(P,"MEQ");mqInitP(P,"OSCE");P.osHist=Array.isArray(P.osHist)?P.osHist:[];if(P.osRun===undefined)P.osRun=null;P.ioSeen=P.ioSeen||{};   /* Round I/O: pages already opened {pageId|"T:"+topic: rev} */   /* MEQ progress (site/meq.js): {a1,a2,star,v} */   /* Advisor round "reset to undone": {uid:[cutoffTs, changedTs]} — attempts up to cutoff stop counting as done (history is kept) */
  return P;
}
/* migrate the earlier single-sheet site/artifact format {a:{uid:ans},t} → Phase 1 attempts */
(function(){if(st.migrated)return;const o=ld(CFG.storageKey||"");if(o&&o.a&&typeof o.a==="object"){const P=PWof(st,WL[0].id),t=o.t||now();Object.keys(o.a).forEach(u=>{if(typeof o.a[u]==="number"&&!P.att[1][u])P.att[1][u]=[[o.a[u],t]];});}st.migrated=1;})();
function persist(){try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){toast("พื้นที่เก็บข้อมูลในเบราว์เซอร์เต็ม");}}
function save(){st.t=now();persist();cloudPush();}
/* bank: larger per-user items kept one record each (Admission cases, Legendary papers, Long cases) — key "<kind>|<ward>|<id>" → {…, c:createdTs, ts} · own localStorage key, own cloud docs (a ward doc must stay < 256 KiB) */
const BKEY=KEY+"-bank";let bank=ld(BKEY)||{};const bankDirty=new Set();let bankT=null;
function bankPut(k,v){v.ts=now();if(!v.c)v.c=v.ts;bank[k]=v;try{localStorage.setItem(BKEY,JSON.stringify(bank));}catch(e){toast("พื้นที่เก็บข้อมูลในเบราว์เซอร์เต็ม");}cloudBank(k);}
const bankItems=(kind,w)=>{const pre=kind+"|"+w+"|";return Object.keys(bank).filter(k=>k.startsWith(pre)).map(k=>Object.assign({key:k},bank[k])).sort((a,b)=>(a.c||0)-(b.c||0));};
/* question counts per ward: old exams, Unit round, AI banks (own + shared, by uid) — shown on the ward list, ward home and each round box */
const unitN=wid=>((WARDS[wid]||{}).UNIT||[]).reduce((a,L)=>a+((L&&L.QB)||[]).length,0);
const aiN=(kind,wid)=>{const s=new Set();bankItems(kind,wid).forEach(x=>{if(x.q&&x.q.uid&&Array.isArray(x.q.opts))s.add(x.q.uid);});(typeof SHARED!=="undefined"&&SHARED[wid]||[]).forEach(x=>{if(x.kind===kind&&x.q&&x.q.uid)s.add(x.q.uid);});return s.size;};
const totalN=wid=>((WARDS[wid]||{}).QB||[]).length+unitN(wid)+aiN("adm",wid)+aiN("spc",wid)+aiN("lai",wid);
function bankMerge(o){const ks=[];for(const k in o||{}){if(!bank[k]||(o[k].ts||0)>(bank[k].ts||0)){bank[k]=o[k];ks.push(k);}}try{localStorage.setItem(BKEY,JSON.stringify(bank));}catch(e){}return ks;}
function saveInk(k){if(ink[k])ink[k].ts=now();try{localStorage.setItem(IKEY,JSON.stringify(ink));}catch(e){toast("พื้นที่เก็บข้อมูลในเบราว์เซอร์เต็ม — ลบรูปที่เขียนบางข้อออก");}cloudInk(k);}

let ward=null;               // current ward id
const W_=()=>WARDS[ward];
const P_=()=>PWof(st,ward);
const ph=()=>st.phase===2?2:1;
const rawAtts=(P,p,u)=>P.att[p][u]||[];
const atts=(P,p,u)=>{const a=P.att[p][u]||[],r=P.reset&&P.reset[p]&&P.reset[p][u];return r&&r[0]?a.filter(x=>x[1]>r[0]):a;};
const lastA=(P,p,u)=>{const a=atts(P,p,u);return a.length?a[a.length-1]:null;};
const lockedAns=(P,p,u)=>{const a=lastA(P,p,u);if(!a)return undefined;const o=P.open[p][u];if(o&&o>=a[1])return undefined;return a[0];};
const latestAny=(P,u)=>{const a=lastA(P,1,u),b=lastA(P,2,u);if(!a)return b;if(!b)return a;return a[1]>=b[1]?a:b;};
const streak=(P,p,q)=>{const a=atts(P,p,q.uid);let n=0;for(let i=a.length-1;i>=0&&a[i][0]===q.ans;i--)n++;return n;};
const uAtts=(P,u)=>P.unit.att[u]||[];
const flagged=(P,u)=>!!(P.flag[u]&&P.flag[u][0]);
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};

/* ---------------- toast ---------------- */
let toastT=null;
function toast(m){const t=$("toast");t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true;},2600);}

/* ---------------- password gate (config gate {on, salt, h = sha256(salt+password)}) ----------------
   A device not trusted on this website must type the password (remembered until the tab is closed) before the ward list.
   Signing in on this website, or pressing the confirm button on the account page, marks the device as trusted (localStorage) for the current reset round. Not shown inside Claude (the artifact is private).
   This is a soft lock for a static site — the check runs in the browser. */
const GKEY=KEY+"-trusted";let gateOk=false;
/* reset round (config gate.r): //toggle pw reset bumps it, so every device trusted under an older round must type the password again (accounts stay signed in) */
const GR=()=>(CFG.gate&&+CFG.gate.r)||0;
const devTrusted=()=>{try{const v=localStorage.getItem(GKEY);return v==="r"+GR()||(GR()===0&&v==="1");}catch(e){return false;}};
const markTrusted=()=>{try{localStorage.setItem(GKEY,"r"+GR());}catch(e){}};
/* password typed in this tab (gate, or the institution switch on the other website) → passed until the tab is closed (sessionStorage) */
const passTok=g=>g&&g.h?g.h+":"+((+g.r)||0):"";
const gatePassed=()=>{try{return !!CFG.gate&&sessionStorage.getItem(KEY+"-pass")===passTok(CFG.gate);}catch(e){return false;}};
const markPassed=()=>{try{sessionStorage.setItem(KEY+"-pass",passTok(CFG.gate));}catch(e){}};
/* being signed in is not enough: the device must have signed in on this website after the latest reset, or been confirmed on the account page */
const gateOn=()=>{const g=CFG.gate;return !!(g&&g.on&&g.h)&&!IN_FRAME&&!gateOk&&!gatePassed()&&!devTrusted();};
async function gateHash(t){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode((CFG.gate.salt||"")+t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}
function rGate(){view="gate";document.body.classList.add("gated");$("nav").hidden=true;
  $("main").innerHTML=`<form class="gate" id="gateF" autocomplete="off"><div class="gl" aria-hidden="true">🔒</div><input type="password" id="gateIn" placeholder="รหัสผ่าน" aria-label="รหัสผ่าน" autocomplete="off"><button class="btn primary" type="submit">เข้าเว็บ</button><p class="gerr" id="gateErr" hidden>รหัสไม่ถูกต้อง</p></form>`;
  const i=$("gateIn");setTimeout(()=>i.focus(),50);
  $("gateF").onsubmit=async e=>{e.preventDefault();let ok=false;try{ok=(await gateHash(i.value))===CFG.gate.h;}catch(x){}
    if(ok){gateOk=true;markPassed();document.body.classList.remove("gated");route();}else{$("gateErr").hidden=false;i.value="";i.focus();}};}

/* ---------------- router ---------------- */
let view="wards", pick=null;
function parseHash(){const h=(location.hash||"").replace(/^#\/?/,"");if(/(^|&)(p|all)=/.test(h))return {w:"",v:""};const a=h.split("/");return {w:a[0]||"",v:a[1]||""};}
function go(path){const h="#/"+path;if(location.hash===h)route();else location.hash=h;}
window.addEventListener("hashchange",route);
function route(){
  if(/[#&]meq=/.test(location.hash||"")){mqCheckImport();return;}
  if(gateOn())return rGate();document.body.classList.remove("gated");
  const h=parseHash();closeS(true);pick=null;
  if(h.w==="signin"){ward=null;return show("signin");}
  if(h.w==="grades"){ward=null;return show("grades");}
  if(!h.w||!WARDS[h.w]||!WL.some(x=>x.id===h.w)){if(QR)qStop();ward=null;return show("wards");}
  if(QR&&QR.ward!==h.w)qStop();
  ward=h.w;
  let v=h.v||"home";
  if(v==="sess"&&!validSess())v="home";
  if(v==="result"&&!P_().sess)v="home";
  if(!["home","service","svc","grand","sess","result","hy","kw","unit","quality","qedit","adm","spc","advisor","report","legend","exam","lres","lrev","admq","lcase","staff","launch","lhist","teach","mhist","dates","mqr","mq","mqhy","mqin","io","tch","taker","case","osl","osx","osr","osh","osq"].includes(v))v="home";
  if((v==="mqr"||v==="mq"||v==="mqhy")&&!mqL().length)v="home";
  if(v==="osx"&&!osRunCur())v=osLastRes()?"osr":"osl";if(v==="osr"&&!osLastRes())v="osl";
  if(v==="exam"&&!P_().leg)v="legend";
  if((v==="lres"||v==="lrev")&&!(bank[st.legSel]&&st.legSel.split("|")[1]===ward))v="legend";
  if(v==="admq"&&!(bank[st.admSel]&&st.admSel.split("|")[1]===ward))v=AM==="spc"?"spc":"adm";
  show(v);
}
function validSess(){const P=P_(),s=P.sess;if(!s)return false;s.list=(s.list||[]).filter(u=>qAny(u)||(!sharedT&&fbOn()&&/^(ADM|LAI|SPC)\|/.test(u)));if(!s.list.length){P.sess=null;return false;}if(s.cur>=s.list.length)s.cur=s.list.length-1;if(s.cur<0)s.cur=0;return true;}
function show(v){
  mqTStop();view=v;if(v==="adm")AM="adm";else if(v==="spc")AM="spc";else if(v==="admq")AM=String(st.admSel||"").startsWith("spc|")?"spc":"adm";
  const quiz=["svc","sess","adm","spc","exam","lrev","admq"].includes(v);
  clearInterval(show._t);
  const mqP=v==="mq";   /* MEQ question page: answer sheet button on top + prev/next bar at the bottom, like the MCQ pages */
  $("nav").hidden=!quiz&&!mqP;$("exnav").hidden=v!=="exam";paintLegBan();$("openSheet").hidden=!quiz&&!mqP;if(!mqP){$("next").classList.remove("primary");$("next").classList.add("ghost");}$("homeBtn").hidden=v==="wards";paintQR();
  const w=ward&&W_();const fill=(t,ty)=>String(t).replace(/\{short\}/g,w.cfg.short||w.cfg.id).replace(/\{type\}/g,ty||"");
  $("brand").classList.toggle("long",!!w&&!quiz&&!mqP);
  $("brand").textContent=w?(quiz?fill(CFG.quizBrand||"AC {short} {type}","MCQ"):fill(CFG.homeBrand||w.cfg.brand||w.cfg.name)):(CFG.siteName||CFG.title||"คลังข้อสอบเก่า");
  document.title=CFG.title||"คลังข้อสอบเก่า";
  if(!quiz){$("prog").style.width="0";}
  paintAcct();
  ({wards:rWards,signin:rSignin,grades:rGrades,home:rHome,service:rService,grand:rGrand,svc:rQuiz,sess:rQuiz,result:rResult,hy:rHY,kw:rKW,unit:rUnit,quality:rQuality,qedit:rQEdit,adm:rAdm,spc:rAdm,advisor:rAdvisor,report:rReport,legend:rLegend,exam:rExam,lres:rLRes,lrev:rQuiz,admq:rQuiz,lcase:rLCase,staff:rStaff,launch:rLaunch,lhist:rLHist,teach:rTeach,mhist:rMHist,dates:rDates,mqr:mqRList,mq:mqView,mqhy:mqHY,mqin:mqIn,io:rIO,tch:rTch,taker:rTaker,case:rCase,osl:osSetup,osx:osRunView,osr:osResView,osh:osHistView,osq:osQuality})[v]();
  if(!quiz)window.scrollTo(0,0);
}
/* the AI-case engine serves two rounds: Admission ("adm") and Specialty ("spc", site/spc.js) — AM says which; bank kind = AM */
let AM="adm";
const AS=wid=>PWof(st,wid||ward)[AM];
const isAIV=()=>view==="adm"||view==="spc";
const AMN=m=>(m||AM)==="spc"?"Specialty round":"Admission round";
$("homeBtn").onclick=()=>{if(view==="home"||!ward)go("");else go(ward);};

/* ---------------- wards ---------------- */
/* ward list: old-exam (AC) questions per exam type — MCQ = W.QB, MEQ = W.MQ, OSCE = W.OS (none yet); types the ward has no exam for are skipped */
function acCounts(w){const W=WARDS[w.id]||{},no=w.noExam||[],c={MCQ:(W.QB||[]).length,MEQ:mqL(w.id,"MEQ").length,OSCE:(W.OS||[]).length};
  const t=["MCQ","MEQ","OSCE"].filter(k=>!no.includes(k));return `<span class="acn"><span class="acl">ข้อสอบเก่า AC</span>${t.map(k=>`<span class="act${c[k]?"":" z"}">${k} <b>${c[k]}</b></span>`).join("")}</span>`;}
function rWards(){
  let h=`<h1 class="h1">${esc(CFG.siteName||"คลังข้อสอบเก่า")}</h1><p class="sub">เลือกวอร์ดที่กำลังวนอยู่</p>`;
  if(SUBJ.length)h+=`<button class="grline" id="toGrades" type="button">📊 <b>สรุปเกรด</b>${(()=>{const L_=SUBJ.map(S=>{const G=(st.grades||{})[S.id]||{},g=GPARTS.map(([k])=>G[k]||"–");return g.some(x=>x!=="–")?`${esc(S.name)} ${g.map(esc).join("/")}`:"";}).filter(Boolean);return L_.length?`<span>${L_.join(" · ")}</span>`:`<span>ยังไม่ได้ใส่เกรด</span>`;})()}<span class="go">→</span></button>${SUBJ.some(S=>GPARTS.some(([k])=>((st.grades||{})[S.id]||{})[k]))?`<p class="hint" style="margin:-8px 0 12px">เรียง Theory / Competency / Performance</p>`:""}`;
  h+=WL.map(w=>{const n=(WARDS[w.id]||{QB:[]}).QB.length;const nu=totalN(w.id);return `<a class="wcard" href="#/${esc(w.id)}"><span class="wb" style="font-size:${(()=>{const n=Math.max(...String(w.short||w.id).split(" ").map(x=>x.length));return n>5?11:n>4?12.5:14;})()}px">${esc(w.short||w.id)}</span><span><b>${esc(w.name)}</b><span class="rd">${esc(w.sub||"")}</span>${acCounts(w)}${examDates(w).map(x=>{const c=cdOf(x),sc=x.score&&scoreOf(x.score);return `<span class="wcd${c.hot?" hot":""}${c.done?" done":""}">สอบ${x.part?" "+esc(x.part):""}${x.label?" "+esc(x.label):""} · ${cdHTML(x)}${c.hot?` — ควรเริ่ม Phase 2 ของ ${esc(x.part||"ข้อสอบ")}`:""}${sc?` · คะแนน ${esc(sc)}`:""}</span>`;}).join("")}</span>${(()=>{const S=subjOf(w.id),G=S&&(st.grades||{})[S.id]||{},g=GPARTS.map(([k])=>G[k]);return g.some(Boolean)?`<span class="wgr" title="Theory / Competency / Performance">${g.map(x=>x?`<span class="${gCls(x)}">${esc(x)}</span>`:`<span class="hint">–</span>`).join("")}</span>`:"";})()}</a>`;}).join("");
  {const pend=ld(SPKEY),n=pend?Object.values(pend).reduce((x,a)=>x+a.length,0):0;if(n&&fbOn()&&!(fb&&fb.user))h+=`<div class="card"><h3>🌐 มีโจทย์รอแชร์ให้ทุกคน ${n} ข้อ</h3><span class="rd">เข้าสู่ระบบแล้วระบบจะแชร์ขึ้นคลังรวมให้ทันที</span><button class="btn" data-act="acct" type="button">เข้าสู่ระบบ</button></div>`;}
  h+=acctCard();
  $("main").innerHTML=h;bindAcctCard();{const b=$("toGrades");if(b)b.onclick=()=>go("grades");}
}
function acctCard(){
  if(cl)return `<div class="card"><h3>☁️ บันทึกในบัญชี Claude แล้ว</h3><span class="rd" style="margin:0">ความคืบหน้าบันทึกในบัญชี Claude ของคุณอัตโนมัติ เปิดจากเครื่องไหนก็ได้</span></div>`;
  if(HAS_CLAUDE()&&!fbOn())return "";
  if(fb&&fb.user)return `<div class="card"><h3>☁️ บันทึกในบัญชีแล้ว</h3><span class="rd">${esc(who(fb.user))} · เปิดจากเครื่องไหนก็ได้ความคืบหน้าเดิม</span><button class="linkbtn" data-act="acct">จัดการบัญชี</button></div>`;
  return `<div class="card"><h3>เข้าสู่ระบบ (ไม่บังคับ)</h3><span class="rd">ใช้งานได้เลยโดยไม่ต้องสมัคร ความคืบหน้าจะเก็บในเบราว์เซอร์นี้ ถ้าเข้าสู่ระบบ จะบันทึกในบัญชีและใช้ได้หลายเครื่อง</span><button class="btn primary" data-act="acct">เข้าสู่ระบบ / สมัคร</button></div>`;
}
function bindAcctCard(){document.querySelectorAll('[data-act="acct"]').forEach(b=>b.onclick=()=>go("signin"));}

/* ---------------- home ---------------- */
/* ---------------- exam dates per ward (config wards[].dates: [{part, at:"YYYY-MM-DD[THH:MM]"}], times in Thailand) ---------------- */
const TH_MON=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
/* exam dates and the rotation period can be edited on the website (st.wcfg[ward] = {dates, rotation, ts}, synced with the account); {reset:true} = back to config.json */
const wOv=wid=>{const o=(st.wcfg||{})[wid];return o&&!o.reset?o:null;};
const wDates=w=>{const o=w&&wOv(w.id);return (o&&Array.isArray(o.dates)?o.dates:(w&&w.dates))||[];};
const wRot=w=>{const o=w&&wOv(w.id);return (o&&o.rotation&&o.rotation.start?o.rotation:(w&&w.rotation))||{};};
function examDates(w){return wDates(w).map(x=>{
  if(x.done&&!x.at)return {part:x.part||"",label:"",at:0,hasT:false,score:x.score||"",fixedDone:true};
  const m=/^(\d{4})-(\d\d)-(\d\d)(?:T(\d\d):(\d\d))?/.exec(x.at||"");if(!m)return null;
  const y=+m[1],mo=+m[2],d=+m[3],hasT=!!m[4],at=Date.UTC(y,mo-1,d,hasT?+m[4]:0,hasT?+m[5]:0)-7*3600e3;
  const e=/^(\d\d):(\d\d)$/.exec(x.end||""),dur=hasT&&e?(+e[1]*60+ +e[2])-(+m[4]*60+ +m[5]):(((w.exam||{})[x.part]||{}).min)||0;
  return {part:x.part||"",label:`${d} ${TH_MON[mo-1]} ${String(y+543).slice(2)}${hasT?` ${m[4]}:${m[5]}${e?"–"+x.end:""}`:""}`,at,hasT,dur,score:x.score||""};}).filter(Boolean);}
function rDates(){const w=W_().cfg,o=wOv(w.id),D=wDates(w).map(x=>Object.assign({},x)),rot=wRot(w),parts=["MCQ","MEQ","OSCE"];
  const row=(x,i)=>{const m=/^(\d{4}-\d\d-\d\d)(?:T(\d\d:\d\d))?/.exec(x.at||"")||[];return `<div class="dtrow" data-i="${i}">
    <label>สอบ<select data-f="part">${[...new Set(parts.concat(x.part?[x.part]:[]))].concat([""]).map(p=>`<option value="${esc(p)}"${p===(x.part||"")?" selected":""}>${p||"(ไม่ระบุ)"}</option>`).join("")}</select></label>
    <label>วันที่<input type="date" data-f="d" value="${esc(m[1]||"")}"></label>
    <label>เริ่ม<input type="time" data-f="t" value="${esc(m[2]||"")}"></label>
    <label>จบ<input type="time" data-f="e" value="${esc(x.end||"")}"></label>
    <label class="ck"><input type="checkbox" data-f="done"${x.done&&!x.at?" checked":""}> สอบไปแล้ว (ไม่ต้องใส่วัน)</label>
    <span class="dtmv"><span class="dtgrip" data-grip title="กดค้างแล้วลากเพื่อย้าย" aria-label="ลากเพื่อย้าย">☰ ลาก</span><button class="btn" type="button" data-mv="-1" aria-label="เลื่อนขึ้น">↑ ขึ้น</button><button class="btn" type="button" data-mv="1" aria-label="เลื่อนลง">↓ ลง</button></span>
    <button class="link" type="button" data-del="${i}">ลบ</button></div>`;};
  let h=`<h1 class="h2">Admit · ICU · Discharge — ${esc(w.name)}</h1><p class="sub">แก้แล้วกดบันทึก นับถอยหลัง คำเตือน Phase 2 และหน้าประวัติ Morning round ใช้ค่านี้ทันที · เข้าสู่ระบบไว้จะใช้ค่าเดียวกันทุกเครื่อง${o?` · <b>กำลังใช้ค่าที่แก้เอง</b> (แก้ล่าสุด ${fmtDT(o.ts)})`:" · ตอนนี้ใช้ค่าตั้งต้นของเว็บ"}</p>`;
  h+=`<div class="card"><h3>ICU <span class="hint" style="font-weight:400">(วันสอบ)</span></h3><div id="dtRows">${D.map(row).join("")||`<p class="hint">ยังไม่มี ICU</p>`}</div><button class="btn" id="dtAdd" type="button">+ เพิ่ม ICU</button>
    <p class="hint" style="margin-top:8px">ลำดับในหน้านี้ = ลำดับที่โชว์ในหน้าวอร์ดและหน้าแรก (บนสุด = ซ้ายสุด/ก่อน) — กด ☰ ค้างแล้วลาก หรือกด ↑ ขึ้น / ↓ ลง · ไม่ใส่เวลาเริ่ม = นับถอยหลังเป็นวัน · ใส่เวลาเริ่มและจบ = ระหว่างสอบขึ้น "กำลังสอบ ✍️" · เหลือ ≤14 วันกล่องเป็นสีแดงและเตือนให้เริ่ม Phase 2</p></div>`;
  {const E0=Object.assign({},(w.exam||{}).MCQ,o&&o.exam);h+=`<div class="card"><h3>MCQ สอบจริง <span class="hint" style="font-weight:400">(จำนวนข้อ · เวลา — ใช้กับ Legendary round)</span></h3><div class="dtrow"><label>จำนวนข้อ<input type="number" id="exN" min="1" max="500" value="${esc(E0.n||"")}" placeholder="เช่น 100"></label><label>เวลา (นาที)<input type="number" id="exM" min="1" max="600" value="${esc(E0.min||"")}" placeholder="เช่น 150"></label></div><span class="rd">เว้นว่าง = ใช้ค่าตั้งต้นของเว็บ${(w.exam||{}).MCQ?` (${w.exam.MCQ.n} ข้อ ${w.exam.MCQ.min} นาที)`:" (ยังไม่มี)"} · MEQ ยังไม่มี Legendary round</span></div>`;}
  if(!(w.noExam||[]).includes("OSCE")){const E1=Object.assign({},(w.exam||{}).OSCE,o&&o.examOS);h+=`<div class="card"><h3>OSCE สอบจริง <span class="hint" style="font-weight:400">(จำนวนข้อ · เวลาต่อข้อ — ค่าตั้งต้นของ Legendary round OSCE)</span></h3><div class="dtrow"><label>จำนวนข้อ (ไม่นับข้อพัก)<input type="number" id="osN" min="1" max="80" value="${esc(E1.n||"")}" placeholder="เช่น 25"></label><label>เวลาต่อข้อ (นาที)<input type="number" id="osM" min="1" max="60" step="0.5" value="${esc(E1.min||"")}" placeholder="เช่น 5"></label></div><span class="rd">เว้นว่าง = ใช้ค่าตั้งต้นของเว็บ${(w.exam||{}).OSCE?` (${w.exam.OSCE.n} ข้อ ข้อละ ${w.exam.OSCE.min} นาที)`:" (ยังไม่มี)"} · เปลี่ยนได้อีกตอนเริ่มสอบ</span></div>`;}
  h+=`<div class="card"><h3>Admit &amp; Discharge</h3><span class="rd">วันเริ่มและวันจบวอร์ด — ใช้กับหน้าประวัติ Morning round (เรียงครบทุกวันในช่วงนี้)</span><div class="dtrow"><label>Admit<input type="date" id="rtS" value="${esc(rot.start||"")}"></label><label>Discharge<input type="date" id="rtE" value="${esc(rot.end||"")}"></label></div></div>`;
  h+=`<div class="stack"><button class="btn primary" id="dtSave" type="button">บันทึก</button>${o?`<button class="btn" id="dtReset" type="button">คืนค่าตั้งต้นของเว็บ</button>`:""}<a class="btn" href="#/${esc(ward)}">ยกเลิก</a></div>`;
  $("main").innerHTML=h;
  const read=()=>[...document.querySelectorAll("#dtRows .dtrow")].map(r=>{const g=f=>r.querySelector(`[data-f="${f}"]`),i=+r.dataset.i,old=D[i]||{},part=g("part").value,d=g("d").value,t=g("t").value,e=g("e").value,done=g("done").checked;
    const x={part};if(old.score)x.score=old.score;if(d){x.at=d+(t?"T"+t:"");if(t&&e)x.end=e;}else if(done)x.done=true;else return null;return x;}).filter(Boolean);
  const bindRow=r=>{r.querySelector("[data-del]").onclick=()=>r.remove();
    const g=r.querySelector("[data-grip]");g.onpointerdown=e=>{e.preventDefault();r.classList.add("drag");
      /* window listeners: moving the row drops pointer capture on the grip */
      const pm=ev=>{if(ev.pointerId!==e.pointerId)return;const box=$("dtRows"),rows=[...box.querySelectorAll(".dtrow")].filter(x=>x!==r);let before=null;for(const x of rows){const b=x.getBoundingClientRect();if(ev.clientY<b.top+b.height/2){before=x;break;}}if(before){if(before!==r.nextElementSibling)box.insertBefore(r,before);}else if(r!==box.lastElementChild)box.appendChild(r);};
      const pu=ev=>{if(ev.pointerId!==e.pointerId)return;r.classList.remove("drag");window.removeEventListener("pointermove",pm);window.removeEventListener("pointerup",pu);window.removeEventListener("pointercancel",pu);};
      window.addEventListener("pointermove",pm);window.addEventListener("pointerup",pu);window.addEventListener("pointercancel",pu);};r.querySelectorAll("[data-mv]").forEach(b=>b.onclick=()=>{const d=+b.dataset.mv,o=d<0?r.previousElementSibling:r.nextElementSibling;if(!o)return;if(d<0)o.before(r);else o.after(r);});};
  document.querySelectorAll("#dtRows .dtrow").forEach(bindRow);
  $("dtAdd").onclick=()=>{const box=$("dtRows"),i=D.length;D.push({part:"MCQ"});if(!box.querySelector(".dtrow"))box.innerHTML="";box.insertAdjacentHTML("beforeend",row(D[i],i));bindRow(box.lastElementChild);};
  $("dtSave").onclick=()=>{const dates=read(),s_=$("rtS").value,e_=$("rtE").value;if(s_&&e_&&e_<s_){toast("วัน Discharge ต้องไม่ก่อนวัน Admit");return;}
    const xn=+$("exN").value,xm=+$("exM").value;if((xn||xm)&&!(xn>0&&xm>0)){toast("ใส่ทั้งจำนวนข้อและเวลา (หรือเว้นว่างทั้งคู่)");return;}
    const on=$("osN")?+$("osN").value:0,om=$("osM")?+$("osM").value:0;if((on||om)&&!(on>0&&om>0)){toast("OSCE: ใส่ทั้งจำนวนข้อและเวลาต่อข้อ (หรือเว้นว่างทั้งคู่)");return;}
    st.wcfg=st.wcfg||{};st.wcfg[w.id]={dates,rotation:s_?{start:s_,end:e_||s_}:null,ts:now()};if(xn>0&&xm>0)st.wcfg[w.id].exam={n:Math.round(xn),min:Math.round(xm)};if(on>0&&om>0)st.wcfg[w.id].examOS={n:Math.round(on),min:Math.round(om*2)/2};save();toast("บันทึกวันสอบแล้ว");go(ward);};
  const rs=$("dtReset");if(rs)rs.onclick=async()=>{if(!await uiAsk("กลับไปใช้วันสอบตั้งต้นของเว็บ?"))return;st.wcfg[w.id]={reset:true,ts:now()};save();toast("กลับเป็นค่าตั้งต้นแล้ว");go(ward);};
}
/* countdown, always rounded up from the exam time: "N w N d" → last 14 days "N d" → last 24 h "N h" → last 2 h "1 h N min" → last hour "N min" (0 min at the start) → "Exam done 🎉" for good.
   An exam without a time counts whole days to that date and shows "วันนี้" on the day. */
function cdOf(x){const t=now();
  if(x.fixedDone)return {txt:"Exam done 🎉",done:true,hot:false,k:"done"};
  if(!x.hasT){const td=new Date(t+7*3600e3),today=Date.UTC(td.getUTCFullYear(),td.getUTCMonth(),td.getUTCDate())-7*3600e3,d=Math.round((x.at-today)/864e5);
    if(d<0)return {txt:"Exam done 🎉",done:true,hot:false,k:"done"};
    return {txt:d===0?"วันนี้":d<=14?`${d} d`:`${Math.floor(d/7)} w`+(d%7?` ${d%7} d`:""),done:false,hot:d<=14,days:d,k:d<=14?"hot":"far"};}
  const r=x.at-t;if(r<=0)return x.dur&&-r<x.dur*6e4?{txt:"กำลังสอบ ✍️",done:false,hot:false,k:"live"}:{txt:"Exam done 🎉",done:true,hot:false,k:"done"};
  /* always rounded up: more than 2 days left = "N d"; the second-to-last day "1 d N h"; exactly 24 h left = "24 h"; the last 2 h "N h N min"; the last hour "N min" */
  const d=Math.ceil(r/864e5),hh=Math.ceil(r/36e5),mm=Math.ceil(r/6e4);
  const txt=r>1728e5?(d>14?`${Math.floor(d/7)} w`+(d%7?` ${d%7} d`:""):`${d} d`):r>864e5?`${Math.floor(hh/24)} d`+(hh%24?` ${hh%24} h`:""):r>72e5?`${hh} h`:r>36e5?`${Math.floor(mm/60)} h`+(mm%60?` ${mm%60} min`:""):`${mm} min`;
  return {txt,done:false,hot:d<=14,days:d,k:d<=14?"hot":"far"};}
const cdHTML=x=>{const c=cdOf(x);return `<b data-cdat="${x.at}" data-cdt="${x.hasT?1:0}" data-cdf="${x.fixedDone?1:0}" data-cdd="${x.dur||0}" data-cdk="${c.k}">${esc(c.txt)}</b>`;};
/* the numbers tick on their own; crossing into the last 14 days or the end of the exam redraws the page (warning bar, colours) */
setInterval(()=>{let redo=false;document.querySelectorAll("[data-cdat]").forEach(el=>{const c=cdOf({at:+el.dataset.cdat,hasT:el.dataset.cdt==="1",fixedDone:el.dataset.cdf==="1",dur:+el.dataset.cdd||0});if(el.textContent!==c.txt)el.textContent=c.txt;if(el.dataset.cdk!==c.k)redo=true;});
  if(redo){if(view==="home")rHome();else if(view==="wards")rWards();}},15000);
/* ---------------- grades and scores (config subjects: one subject can span several wards, e.g. Surgery = Gen Sx + Subspe Sx) ---------------- */
const GRADE_OPTS=["A","B+","B","C+","C","D+","D","F"];
const SUBJ=CFG.subjects||[];
const subjOf=wid=>SUBJ.find(s=>(s.wards||[]).includes(wid))||null;
const grS=id=>{st.grades=st.grades||{};return st.grades[id]||(st.grades[id]={});};
const GPARTS=[["theory","Theory in"],["comp","Competency in"],["perf","Performance in"]];
function gradeCard(wid){const S=subjOf(wid);if(!S)return "";const G=(st.grades||{})[S.id]||{};
  return `<div class="card grcard"><h3>เกรด · ${esc(S.name)}</h3>${GPARTS.map(([k,t])=>`<label class="grrow"><span>${t} ${esc(S.name)}</span><select class="field-in grsel" data-gs="${esc(S.id)}" data-gk="${k}"><option value="">—</option>${GRADE_OPTS.map(g=>`<option ${G[k]===g?"selected":""}>${g}</option>`).join("")}</select></label>`).join("")}
    ${(S.scores||[]).map(x=>`<label class="grrow"><span>คะแนน ${esc(x.label)}</span><input class="field-in grin" data-gs="${esc(S.id)}" data-gsc="${esc(x.k)}" value="${esc((G.sc||{})[x.k]||"")}" placeholder="ยังไม่ออก" inputmode="decimal"></label>`).join("")}
    <button class="linkbtn" data-go-grades type="button">ดูเกรดทุกวิชา →</button></div>`;}
function bindGrades(){document.querySelectorAll("[data-gk]").forEach(el=>el.onchange=()=>{const G=grS(el.dataset.gs);G[el.dataset.gk]=el.value;G.ts=now();save();toast("บันทึกเกรดแล้ว");});
  document.querySelectorAll("[data-gsc]").forEach(el=>el.onchange=()=>{const G=grS(el.dataset.gs);G.sc=G.sc||{};G.sc[el.dataset.gsc]=el.value.trim();G.ts=now();save();toast("บันทึกคะแนนแล้ว");});
  document.querySelectorAll("[data-go-grades]").forEach(b=>b.onclick=()=>go("grades"));}
const scoreOf=k=>{for(const S of SUBJ){const v=(((st.grades||{})[S.id]||{}).sc||{})[k];if(v)return v;}return "";};
function rGrades(){
  let h=`<h1 class="h2">สรุปเกรด</h1><p class="sub">เกรดทุกวิชา · ใส่หรือแก้ได้ที่หน้าวอร์ดของวิชานั้น</p>`;
  h+=`<div class="card" style="padding:6px"><table class="grtab"><thead><tr><th></th>${GPARTS.map(([k,t])=>`<th>${t.replace(" in","")}</th>`).join("")}</tr></thead><tbody>${SUBJ.map(S=>{const G=(st.grades||{})[S.id]||{};
    return `<tr data-gw="${esc((S.wards||[])[0]||"")}"><th>${esc(S.name)}${(S.scores||[]).map(x=>(G.sc||{})[x.k]?`<span class="grsc">${esc(x.label)}: ${esc(G.sc[x.k])}</span>`:"").join("")}</th>${GPARTS.map(([k])=>`<td>${G[k]?`<span class="grg ${gCls(G[k])}">${esc(G[k])}</span>`:`<span class="hint">—</span>`}</td>`).join("")}</tr>`;}).join("")}</tbody></table></div>`;
  h+=`<p class="hint">แตะชื่อวิชาเพื่อไปหน้าวอร์ดและใส่เกรด/คะแนน</p><div class="stack" style="margin-top:10px"><button class="btn ghost" id="grBack" type="button">กลับหน้าเลือกวอร์ด</button></div>`;
  $("main").innerHTML=h;
  document.querySelectorAll("[data-gw]").forEach(r=>r.onclick=()=>{if(r.dataset.gw&&WARDS[r.dataset.gw])go(r.dataset.gw);});
  $("grBack").onclick=()=>go("");}
const ROUNDS=[
  {k:"grand",n:"Grand round",d:"สุ่มจากคลังข้อสอบเก่า (AC) ทั้งหมดเท่านั้น ไม่สนว่าปีไหนหรือเรื่องอะไร"},
  {k:"service",n:"Service round",d:"เลือกปีและ rotation ที่อยากทำ ทำแบบกระดาษคำตอบ"},
  {k:"morning",n:"Morning round",d:"วันละ 15 ข้อ: ข้อสอบเก่าที่เคยทำแล้ว 5 ข้อ + โจทย์ Unit round 10 ข้อ ชุดใหม่ทุกวัน 07:30 · ชุดเดียวกันทั้ง 2 Phase"},
  {k:"legend",n:"Legendary round",d:"จำลองสอบจริง จำนวนข้อและเวลาเท่าสอบจริงของวอร์ด ทำรวดเดียว ส่งแล้วได้เกรด · มีโจทย์ใหม่ที่ AI สร้างเฉพาะชุดนั้นปนอยู่บางข้อ"},
  {k:"staff",n:"Ward staff round",d:"ทวนข้อที่เคยทำแล้ว แต่ยังทำถูกติดกันไม่ถึง 2 ครั้ง · เลือกได้ว่าเฉพาะข้อสอบเก่า หรือรวมโจทย์จาก Unit, Admission และ Legendary ด้วย"},
  {k:"teach",n:"Teaching round",d:"ใบเหลือง · CTA · Flashcard · Oral"},
  {k:"advisor",n:"Advisor round",d:"อ่านเฉลยข้อที่เคยทำแล้วแบบเร็ว ๆ ไม่ต้องตอบ พร้อมคำแนะนำเฉพาะช้อยที่เคยเลือก และรายงานว่าผิดเรื่องไหนมากสุด"},
  {k:"unit",n:"Unit round",d:"โจทย์ใหม่แบบ case-based จาก lecture แต่ละบท สุ่มใหม่ทุกครั้งที่เข้า"},
  {k:"quality",n:"Quality round",d:"Speedrun ข้อสอบเก่า จับเวลาเป็นเซต · เลือกปีที่จะทำ หรือสุ่มจากทั้งคลัง ตั้งค่าเองได้ทั้งหมด"},
  {k:"admission",n:"Admission round",d:"เคสใหม่ที่ AI สร้างให้ทีละข้อ เนื้อหาเหมาะกับชั้นปีในวอร์ดนี้ · เก็บทุกข้อไว้ในคลังของคุณ"},
  {k:"specialty",n:"Specialty round",d:"โจทย์ใหม่ที่ AI สร้างทีละข้อแบบ Admission round แต่เนื้อหาเฉพาะไฟล์ของวอร์ดนี้ · เลือกเรื่อง / R / N เอง หรือสุ่มทั้งหมด · ใช้ร่วมกับ MEQ / OSCE"},
  {k:"io",n:"Round I/O",d:"อ่านสรุปเนื้อหาจาก Lecture (L) · Resource (R) · โน้ตวอร์ด (N) และรวมตามเรื่อง ที่ Claude สรุปให้ · ใช้ร่วมกับ MEQ / OSCE"},
  {k:"longcase",n:"Long case",d:"AI ให้ chief complaint มา แล้วดำเนินเคสเองทีละขั้นแบบสอบ long case เฉลยทีละขั้นสไตล์ MEQ"}
];
const yearTxt=()=>{const m=/(\d+)/.exec(wYear());return m?"ปี "+m[1]:"";};
/* ---------------- Morning round: 10 a day, new set at 07:30 (phone's clock) ---------------- */
const MORN_N=15,MORN_AC=5;
const mDay=t=>{const d=new Date((t||now())-7.5*3600e3);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
function mNext(){const d=new Date(),r=new Date(d);r.setHours(7,30,0,0);if(r<=d)r.setDate(r.getDate()+1);return r.getTime();}
const hms=ms=>{const x=Math.max(0,Math.floor(ms/1000));return String(Math.floor(x/3600)).padStart(2,"0")+":"+String(Math.floor(x/60)%60).padStart(2,"0")+":"+String(x%60).padStart(2,"0");};
const acDoneAny=(P,u)=>atts(P,1,u).length||atts(P,2,u).length;
function mPool(P,p){const W=W_();let pool=W.QB.filter(q=>acDoneAny(P,q.uid));W.UNIT.forEach(Lc=>{pool=pool.concat(Lc.QB.filter(q=>!uAtts(P,q.uid).length));});return pool;}
function mUsed(P){const S=new Set();const add=m=>{if(m&&m.list)m.list.forEach(u=>S.add(u));};Object.values(P.mornH||{}).forEach(add);Object.values(P.morn||{}).forEach(add);return S;}
let mOut=0;
function morning(make){const P=P_(),p=1,d=mDay();mornOne(P);let m=P.morn[p];
  if(m&&m.day===d){m.list=m.list.filter(u=>W_().byU[u]);if(!m.ot){m.ot={};for(const u in m.ans){const q=W_().byU[u];if(q&&m.ans[u]>=0)m.ot[u]=m.ans[u]===q.ans?1:0;}}return m;}
  if(!make)return null;
  if(m&&m.day&&m.day!==d)P.mornH[m.day+"|"+p]=Object.assign({p},m);
  /* no repeats across the whole ward: a question that was ever in a Morning set (any day, answered or not) is never drawn again */
  const used=mUsed(P),fresh=q=>!used.has(q.uid);
  /* 5 old-exam questions already done + 10 Unit round questions (not met yet first); a short pool is topped up from the other */
  const W=W_(),acDone=shuffle(W.QB.filter(q=>fresh(q)&&acDoneAny(P,q.uid))),acRest=shuffle(W.QB.filter(q=>fresh(q)&&!acDoneAny(P,q.uid))),U=[].concat(...W.UNIT.map(Lc=>Lc.QB)).filter(fresh),
    uNew=shuffle(U.filter(q=>!uAtts(P,q.uid).length)),uOld=shuffle(U.filter(q=>uAtts(P,q.uid).length)),ac=acDone.concat(acRest),un=uNew.concat(uOld);
  let a=ac.slice(0,MORN_AC),u=un.slice(0,MORN_N-MORN_AC);
  if(u.length<MORN_N-MORN_AC)a=ac.slice(0,MORN_N-u.length);else if(a.length<MORN_AC)u=un.slice(0,MORN_N-a.length);
  mOut=0;if(!a.length&&!u.length){mOut=1;return null;}
  m=P.morn[p]={day:d,list:shuffle(a.concat(u)).map(q=>q.uid),ans:{},ts:now()};save();return m;}
/* a day can hold one set per Phase: only sets with answers count (else the current Phase's set) so an untouched set of the other Phase does not show as a second, unfinished set */
/* Morning round history: every day of the ward's rotation (config wards[].rotation {start,end}; otherwise first recorded day → today) with what was done that day */
const TH_WD=["อา.","จ.","อ.","พ.","พฤ.","ศ.","ส."],TH_MO=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const dayTH=d=>{const [y,m,dd]=d.split("-").map(Number),t=new Date(y,m-1,dd);return `${TH_WD[t.getDay()]} ${dd} ${TH_MO[m-1]} ${String(y+543).slice(2)}`;};
const addDay=(d,n)=>{const [y,m,dd]=d.split("-").map(Number),t=new Date(y,m-1,dd+n);return t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0");};
function mornRecs(){const P=P_(),o={};for(const k in P.mornH){const x=P.mornH[k];if(x&&x.day)(o[x.day]=o[x.day]||[]).push(Object.assign({p:+k.split("|")[1]||1},x));}
  [1,2].forEach(p=>{const m=P.morn[p];if(!m||!m.day)return;const L=o[m.day]=(o[m.day]||[]).filter(x=>x.p!==p);L.push(Object.assign({p},m));});for(const d in o)o[d].sort((a,b)=>a.p-b.p);return o;}
function mornStat(x){const W=W_(),list=(x.list||[]).filter(u=>W.byU[u]),done=list.filter(u=>x.ans[u]!==undefined),qs=list.map(u=>W.byU[u]);
  const ok=u=>x.ans[u]===W.byU[u].ans,ac=qs.filter(q=>!q.unit),un=qs.filter(q=>q.unit);
  const part=a=>({n:a.length,done:a.filter(q=>x.ans[q.uid]!==undefined).length,right:a.filter(q=>ok(q.uid)).length});
  return {list,n:list.length,done:done.length,right:done.filter(ok).length,ac:part(ac),un:part(un)};}
/* Morning round 🔥 fire / 🏅 medal (counted from on-time answers only — x.ot):
   🔥 day counts when ≥10 of that day's questions were answered on time · one missed day keeps the count (dim, number red, last chance), two missed days in a row → 0
   🏅 = number of days with ≥12 right on time (any days) · gold edge = all 15 on time · aura = ≥12 right on time (random pastel per day) */
const MF_LIT=10,MF_MEDAL=12;
function mornGame(){const rec=mornRecs(),today=mDay(),days={};
  for(const d in rec){let n=0,r=0;rec[d].forEach(x=>{const o=x.ot||{};for(const u in o){n++;if(o[u]===1)r++;}});days[d]={n,r,tot:(rec[d].find(x=>x.p===1)||rec[d][0]).list.length};}
  const lit=d=>!!days[d]&&days[d].n>=MF_LIT,ks=Object.keys(days).filter(lit).sort();let fire=0;
  let risk=false;const end={};   /* risk: yesterday was missed (1-day grace) — if today is missed too, the fire drops to 0 tomorrow · end[day] = the fire at the last second of that day (07:29:59 next morning): {f, s:"on"|"frz"|"out"} */
  if(ks.length){let miss=0;for(let d=ks[0];d<today;d=addDay(d,1)){if(lit(d)){fire++;miss=0;}else if(++miss>=2)fire=0;end[d]={f:fire,s:lit(d)?"on":fire>0?"frz":"out"};}risk=miss===1&&fire>0&&!lit(today);if(lit(today))fire++;}
  return {fire,on:lit(today),risk,end,medals:Object.values(days).filter(x=>x.r>=MF_MEDAL).length,days};}
const mornHue=d=>parseInt(H7((ward||"")+"|"+d),36)%360;
const auraVars=d=>{const h=mornHue(d);return `--aura:hsla(${h},90%,84%,.95);--aura2:hsla(${(h+30)%360},90%,87%,.7);--aura3:hsla(${(h+60)%360},90%,91%,.5)`;};
function mornFx(d,G,all,isPast){const x=G.days[d]||{n:0,r:0,tot:15},c=[];c.push(all>=MF_LIT?"mgood":"mred");if(x.n>0&&x.n>=x.tot)c.push("mgold");if(x.r>=MF_MEDAL)c.push("maura");return c;}
const mGameHTML=G=>`<span class="mgame"><span class="mfire${G.on?" on":""}${G.risk?" frz":""}" title="Morning round ติดกัน ${G.fire} วัน${G.risk?" — ไฟกำลังจะดับ (ไฟแข็ง): เมื่อวานทำไม่ถึง 10 ข้อ ถ้าวันนี้ยังไม่ทำให้ได้ ≥10 ข้อ พรุ่งนี้ไฟเหลือ 0":G.on?"":" — วันนี้ยังไม่ติดไฟ (ทำให้ได้ ≥10 ข้อ)"}"><span class="ff">🔥</span><i>${G.fire}</i></span><span class="mmedal" title="วันที่ถูก ≥12 ข้อ (ในวันนั้น)">🏅<i>${G.medals}</i></span></span>`;
/* fire beside each date in the Morning history: past days = the fire at the last second of that day; today = the fire right now (same look as the ward-home box) */
function mhFire(d,today,G){if(d>today)return "";
  if(d===today){const c=G.on?"on":G.risk?"frz":"wait";return `<span class="mhf ${c}" title="${G.on?"วันนี้ไฟติดแล้ว":G.risk?"ไฟแข็ง — เมื่อวานทำไม่ถึง 10 ข้อ ถ้าวันนี้ไม่ทำ พรุ่งนี้ไฟเหลือ 0":"วันนี้ยังไม่ติดไฟ (ทำให้ได้ ≥10 ข้อ)"}"><span class="ff">🔥</span><i>${G.fire}</i><small>ตอนนี้</small></span>`;}
  const e=G.end[d]||{f:0,s:"out"};return `<span class="mhf ${e.s}" title="ไฟตอนจบวัน (07:29 ของวันถัดไป): ${e.s==="on"?"ติด "+e.f+" วัน":e.s==="frz"?"แข็ง (ผ่อนผัน 1 วัน) ยังเหลือ "+e.f:"ดับ"}"><span class="ff">🔥</span><i>${e.f}</i></span>`;}
function rMHist(){const W=W_(),rec=mornRecs(),today=mDay(),rot=wRot(W.cfg);
  const keys=Object.keys(rec).sort(),start=rot.start||keys[0]||today,end=rot.end||(keys.length&&keys[keys.length-1]>today?keys[keys.length-1]:today);
  const days=[];for(let d=start;d<=end&&days.length<400;d=addDay(d,1))days.push(d);keys.forEach(k=>{if(!days.includes(k))days.push(k);});days.sort();
  let full=0,partial=0,miss=0,ans=0,right=0,streak=0,run=0;
  const rows=days.map(d=>{const L0=rec[d]||[],S0=L0.map(mornStat),ix=S0.map((x,i)=>i),act=ix.filter(i=>S0[i].done>0),cur=ix.filter(i=>L0[i].p===1),keep=act.length?act:cur.length?cur:ix,L=keep.map(i=>L0[i]),S=keep.map(i=>S0[i]),dn=S.reduce((a,x)=>a+x.done,0),rt=S.reduce((a,x)=>a+x.right,0);
    /* completeness counts the day's main set (both Phases share it); a leftover set from before the Phases were merged only adds its answers */
    const mi=L.findIndex(x=>x.p===1),M=S[mi<0?0:mi]||{n:0,done:0},n=M.n,mdn=M.done;
    const st_=d>today?"future":d===today?(n&&mdn>=n?"full":"today"):!n||!dn?"miss":mdn>=n?"full":"part";
    if(d<=today){ans+=dn;right+=rt;if(st_==="full")full++;else if(st_==="part")partial++;else if(st_==="miss")miss++;}
    return {d,L,S,n,dn:mdn,all:dn,rt,st:st_};});
  rows.filter(r=>r.d<=today).forEach(r=>{if(r.st==="full")run++;else if(r.st!=="today")run=0;});streak=run;
  const past=rows.filter(r=>r.d<=today).length,MG=mornGame();
  let h=`<h1 class="h2">ประวัติ Morning round</h1><p class="sub">ทุกวันของวอร์ดนี้${rot.start?` (${dayTH(rot.start)} – ${dayTH(rot.end||end)})`:""} · วันนับตั้งแต่ 07:30 ถึง 07:29 ของวันถัดไป · แตะวันที่เพื่อดูทั้ง 15 ข้อและเฉลย · เรียงจากวันแรกลงมา เปิดหน้ามาจะเลื่อนไปที่วันนี้ให้</p>`;
  h+=`<div class="card mhsum"><div><b>${full}</b><span>วันที่ทำครบ</span></div><div><b>${partial}</b><span>ทำไม่ครบ</span></div><div><b class="${miss?"bad":""}">${miss}</b><span>ไม่ได้ทำ</span></div><div><b>${ans}</b><span>ข้อที่ตอบ</span></div><div><b>${ans?Math.round(right/ans*100)+"%":"–"}</b><span>ถูก ${right} ข้อ</span></div><div><b>🔥 ${MG.fire}</b><span>ไฟติดกัน (≥10 ข้อ/วัน)</span></div><div><b>🏅 ${MG.medals}</b><span>วันที่ถูก ≥12 ข้อ</span></div></div>`;
  h+=`<p class="hint" style="margin:6px 0 10px">ผ่านมาแล้ว ${past} จาก ${rows.length} วัน${HAS_CLAUDE()?" · ประวัตินี้เก็บแยกในเว็บกับใน Claude (เข้าสู่ระบบในเว็บเพื่อรวมหลายเครื่อง)":""}</p><div class="mhlist">`;
  rows.forEach(r=>{
    const lab=r.st==="future"?`<span class="mhs fut">ยังไม่ถึง</span>`:r.st==="miss"?`<span class="mhs miss">ไม่ได้ทำ</span>`:r.st==="today"?`<span class="mhs part">${r.dn?`วันนี้ทำไป ${r.dn}/${r.n}`:r.n?"เปิดกล่องแล้ว ยังไม่ได้ทำ":"🎁 ยังไม่ได้เปิดกล่องวันนี้"}</span>`:r.st==="part"?`<span class="mhs part">ทำ ${r.dn}/${r.n}</span>`:`<span class="mhs ok">ครบ ${r.dn}/${r.n}</span>`;
    const sc=r.all?`<span class="mhr">ถูก <b>${r.rt}</b>/${r.all} (${Math.round(r.rt/r.all*100)}%)${r.S.map((x,i)=>` · ${r.S.length>1?(r.L[i].p===1?"ชุดหลัก: ":"ชุดเดิมของ Phase 2: "):""}AC ถูก ${x.ac.right}/${x.ac.done}${x.ac.n>x.ac.done?` (ชุดนี้มี ${x.ac.n})`:""} · Unit ถูก ${x.un.right}/${x.un.done}${x.un.n>x.un.done?` (ชุดนี้มี ${x.un.n})`:""}`).join("")}</span>`:"";
    const head=`<span class="mhd${r.d===today?" now":""}">${dayTH(r.d)}</span>${mhFire(r.d,today,MG)}${lab}${sc}`;
    const id=(r.d===today?' id="mhToday"':"")+(()=>{if(r.d>today)return "";const fx=mornFx(r.d,MG,r.all);return ` data-fx="${fx.join(" ")}"${fx.includes("maura")?` style="${auraVars(r.d)}"`:""}`;})();
    const fxc=r.d>today?"":" "+mornFx(r.d,MG,r.all).join(" ");
    if(!r.n){h+=`<div class="mhrow${fxc}"${id}>${head}</div>`;return;}
    h+=`<details class="mhrow${fxc}"${id}${r.d===today?" open":""}><summary>${head}</summary>`;
    r.L.forEach((x,li)=>{const S=r.S[li];if(r.L.length>1)h+=`<div class="hint">${x.p===1?"ชุดหลัก":"ชุดเดิมของ Phase 2 (ก่อนรวม 2 Phase เป็นชุดเดียว)"}</div>`;
      h+=`<ol class="mhq">${S.list.map((u,i)=>{const q=W.byU[u],a=x.ans[u],res=a===undefined?`<span class="mhx na">ไม่ได้ตอบ</span>`:a<0?`<span class="mhx no">หมดเวลา</span>`:a===q.ans?`<span class="mhx ok">✓ ${L[a]}</span>`:`<span class="mhx no">✗ ${L[a]} · เฉลย ${L[q.ans]}</span>`;
        const src=q.unit?`Unit · ${esc((W.byLec[q.unit]||{}).short||q.set)} ข้อ ${q.n}`:`AC ${esc(q.set)} ${esc(q.ro)} · ข้อ ${q.id}`;
        return `<li><button class="mhopen" type="button" data-md="${esc(r.d)}" data-mp="${x.p}" data-mi="${i}"><span class="mhsrc">${src}</span><span class="mhst">${esc(plain(q.stem).slice(0,110))}${plain(q.stem).length>110?"…":""}</span>${res}</button></li>`;}).join("")}</ol>`;});
    h+=`</details>`;});
  h+=`</div>`;
  $("main").innerHTML=h;
  {const t=$("mhToday");if(t&&rows.indexOf(rows.find(r=>r.d===today))>2)setTimeout(()=>t.scrollIntoView({block:"start"}),30);}
  document.querySelectorAll("[data-md]").forEach(b=>b.onclick=()=>{const d=b.dataset.md,p=+b.dataset.mp,i=+b.dataset.mi,x=(mornRecs()[d]||[]).find(y=>y.p===p);if(!x)return;
    const P=P_();if(d===mDay()&&P.morn[1]&&P.morn[1].day===d&&p===1){qStop();P.sess={kind:"morning",title:"Morning round",ph:ph(),day:d,list:P.morn[1].list.slice(),ans:Object.assign({},P.morn[1].ans),cur:i,ts:now()};save();return go(ward+"/sess");}
    qStop();P.sess={kind:"mday",title:"Morning round · "+dayTH(d),ph:ph(),day:d,mp:p,list:mornStat(x).list,ans:Object.assign({},x.ans),cur:i,ts:now()};save();go(ward+"/sess");});
}
function startMorning(){const m=morning(true);if(!m){toast(mOut?"Morning round ออกครบทุกข้อในวอร์ดนี้แล้ว — ไม่มีข้อใหม่ที่ยังไม่เคยออก":"ยังไม่มีข้อให้ทำ — ยังไม่มีข้อสอบเก่าหรือโจทย์ Unit round ในวอร์ดนี้");return;}
  qStop();const i=m.list.findIndex(u=>m.ans[u]===undefined);
  P_().sess={kind:"morning",title:"Morning round",ph:ph(),day:m.day,list:m.list.slice(),ans:Object.assign({},m.ans),cur:i<0?0:i,ts:now()};save();go(ward+"/sess");}
/* questions outside the old-exam bank: Admission cases (bank "adm") and the AI questions written for one Legendary paper (bank "lai") — both live in the bank; Ward staff round is the only other place they come back */
const extKey=(q,wid)=>(q.lai?"lai|":q.spc?"spc|":"adm|")+(wid||ward)+"|"+q.uid;
const qAny=(u,wid)=>{wid=wid||ward;const W=WARDS[wid];return (W&&W.byU[u])||(bank["adm|"+wid+"|"+u]||{}).q||(bank["lai|"+wid+"|"+u]||{}).q||(bank["spc|"+wid+"|"+u]||{}).q||SHAREDQ[wid+"|"+u]||null;};
/* answers to an Admission case / Legendary AI question: the first answer (a, Admission only) + every later one (h) */
const extAtts=(q,wid)=>{const it=bank[extKey(q,wid)];if(!it)return [];return (q.lai||it.a==null?[]:[[it.a,it.c||0,q.spc?"spc":"adm"]]).concat(it.h||[]);};
function extPush(q,x,wid){const k=extKey(q,wid),it=bank[k];if(!it)return;it.h=(it.h||[]).concat([x]);bankPut(k,it);}
const stk=(a,q)=>{let n=0;for(let i=a.length-1;i>=0&&a[i][0]===q.ans;i--)n++;return n;};
/* Ward staff round: questions already answered but not yet right twice in a row — old exams only (this phase), or also Unit / Admission / Legendary AI questions */
/* Ward staff round membership: latest answers are not yet right twice in a row (a wrong answer resets the run), OR flagged ⚑ ไม่มั่นใจ, OR kept by the user (P.skeep) */
const kept=(P,u)=>!!(P.skeep&&P.skeep[u]&&P.skeep[u][0]);
const qAttsOf=(P,q)=>q.unit?uAtts(P,q.uid):(q.adm||q.lai)?extAtts(q):atts(P,ph(),q.uid);
const inStaff=(P,q,a)=>(a.length&&stk(a,q)<2)||flagged(P,q.uid)||kept(P,q.uid);
function staffPools(){const P=P_(),p=ph(),W=W_(),o={ac:[],unit:[],adm:[],spc:[],lai:[]};
  W.QB.forEach(q=>{if(inStaff(P,q,atts(P,p,q.uid)))o.ac.push(q.uid);});
  W.UNIT.forEach(Lc=>Lc.QB.forEach(q=>{if(inStaff(P,q,uAtts(P,q.uid)))o.unit.push(q.uid);}));
  ["adm","spc","lai"].forEach(kd=>bankItems(kd,ward).forEach(x=>{const q=x.q;if(!q||!q.uid||!Array.isArray(q.opts))return;if(inStaff(P,q,extAtts(q)))o[kd].push(q.uid);}));
  return o;}
const staffAll=()=>!!st.staffAll;
const staffList=all=>{const o=staffPools();return (all==null?staffAll():all)?o.ac.concat(o.unit,o.adm,o.spc,o.lai):o.ac;};
const p2lists=()=>{const P=P_(),QB=W_().QB;return {
  wrong:QB.filter(q=>{const a=latestAny(P,q.uid);return a&&a[0]!==q.ans;}),
  right:QB.filter(q=>{const a=latestAny(P,q.uid);return a&&a[0]===q.ans;}),
  flag:QB.filter(q=>flagged(P,q.uid)),
  nop1:QB.filter(q=>!atts(P,1,q.uid).length)};};
function rHome(){
  const W=W_(),P=P_(),p=ph(),w=W.cfg,QB=W.QB;
  const type=P.type||"MCQ",hasQ=type==="MCQ"&&QB.length>0;
  const ED=examDates(w),soon=ED.filter(x=>cdOf(x).hot).sort((a,b)=>a.at-b.at);
  let h=soon.length&&p===1?`<div class="p2warn"><b>ควรเริ่ม Phase 2 ของ ${soon.map(x=>`${esc(x.part||"ข้อสอบ")} (สอบ ${esc(x.label)} · เหลือ ${esc(cdOf(x).txt)})`).join(" และ ")} ได้แล้ว</b><button class="btn" id="toP2" type="button">ไป Phase 2</button></div>`:"";
  h+=`<div class="whead"><h1 class="h2">${esc(w.name)}</h1><a href="#/">เปลี่ยนวอร์ด</a></div><p class="sub" style="margin:0">${esc(w.sub||"")}</p>`;
  h+=`<div class="exdates">${ED.map(x=>{const c=cdOf(x),sc=x.score&&scoreOf(x.score);return `<span class="exd${c.hot?" hot":""}${c.done?" done":""}"><span class="k">สอบ${x.part?" "+esc(x.part):""}</span>${x.label?`<span class="v">${esc(x.label)}</span>`:""}${cdHTML(x)}${sc?`<span class="v">คะแนน ${esc(sc)}</span>`:""}</span>`;}).join("")}<a class="exedit" href="#/${esc(ward)}/dates">${ED.length?"✎ แก้วันสอบ":"+ ใส่วันสอบ"}</a></div>`;
  h+=tkHomeCard();
  h+=`<div class="tabs" role="tablist">${["MCQ","MEQ","OSCE"].map(t=>`<button class="tab" role="tab" aria-selected="${t===type}" data-type="${t}">${t}</button>`).join("")}</div>`;
  const noEx=(w.noExam||[]).includes(type);
  if(!noEx){h+=`<div class="seg" role="group" aria-label="Phase"><button data-ph="1" aria-pressed="${p===1}"><b>Phase 1</b>ช่วงเรียน</button><button data-ph="2" aria-pressed="${p===2}"><b>Phase 2</b>ช่วงใกล้สอบ</button></div>`;
  h+=`<p class="phase-hint">${p===1?"ทำเพื่อเก็บความรู้ไปใช้บนวอร์ด และดูว่าข้อสอบชอบออกแนวไหน เนื้อหาไหนมีหรือไม่มีในสไลด์":"ทวนข้อสอบเก่ารอบสองก่อนสอบ มีหน้าสรุป high-yield, keyword และทวนเฉพาะข้อที่ยังผิด/ไม่มั่นใจ — ความคืบหน้าแยกจาก Phase 1"}</p>`;}
  if(noEx){
    h+=`<div class="empty" style="padding:44px 10px"><b style="font-family:var(--num);font-size:18px;color:var(--ink)">${esc(w.name)} ไม่มีสอบ ${type}</b><br><span class="hint">วอร์ดนี้สอบเฉพาะ ${["MCQ","MEQ","OSCE"].filter(t=>!(w.noExam||[]).includes(t)).join(" / ")}</span></div>`;
  }else if(type==="MEQ"||type==="OSCE"){h+=mqHomeHTML(type);
  }else if(type!=="MCQ"){
    h+=`<div class="empty" style="padding:40px 10px">ยังไม่มีข้อสอบ ${type} ในวอร์ดนี้<br><span class="hint">ส่งไฟล์ ${type} ให้ Claude แล้วให้เพิ่มเข้าเว็บ</span></div>`+ioCard();
  }else{
    if(!QB.length)h+=`<div class="card"><h3>ยังไม่มีข้อสอบในคลัง</h3><span class="rd" style="margin:0">ส่งไฟล์ข้อสอบเก่า (PDF/รูป/เอกสาร) ให้ Claude แล้วให้เพิ่มเข้าเว็บ ปุ่มด้านล่างจะใช้ได้เมื่อมีข้อสอบ</span></div>`;
    const done=QB.filter(q=>atts(P,p,q.uid).length),right=done.filter(q=>lastA(P,p,q.uid)[0]===q.ans);
    h+=`<p class="statline">คลังมี <b>${totalN(ward)}</b> ข้อ · ข้อสอบเก่า <b>${QB.length}</b> ข้อ · Phase ${p} ทำแล้ว <b>${done.length}</b> ข้อ · ล่าสุดถูก <b>${done.length?Math.round(right.length/done.length*100)+"%":"–"}</b> · <span style="white-space:nowrap">มี lecture <b>${(w.lectures||[]).length}</b> บท</span></p>`;
    const s=P.sess;
    if(s&&s.list&&s.list.length&&s.ph===p){const a=Object.keys(s.ans).length;if(a<s.list.length)h+=`<button class="resume" id="resume"><span>ทำต่อ: <b>${esc(s.title)}</b><span class="rd">ทำไป ${a}/${s.list.length} ข้อ</span></span><span class="go">→</span></button>`;}
    if(p===2){const l=p2lists();
      h+=`<div class="card"><h3>ทบทวนก่อนสอบ</h3><span class="rd">สรุปจากข้อสอบเก่าทุกปี และเลือกทวนเฉพาะกลุ่มข้อ</span><div class="tools">
      <button class="tool" data-go="hy">📘 สรุป High-yield${(n=>n?`<span class="n" title="ข้อใหม่ที่ Claude ยังไม่ได้สรุป">🆕 ${n}</span>`:"")(hsPendingN("MCQ"))}</button><button class="tool" data-go="kw">🔑 Keyword ตอบข้อสอบ</button>
      <button class="tool" data-p2="wrong">✗ ข้อที่ยังผิดอยู่<span class="n">${l.wrong.length}</span></button>
      <button class="tool" data-p2="right">✓ ข้อที่ทำถูกแล้ว<span class="n">${l.right.length}</span></button>
      <button class="tool" data-p2="flag">⚑ ข้อที่ยังไม่มั่นใจ<span class="n">${l.flag.length}</span></button>
      <button class="tool" data-p2="nop1">○ ไม่เคยทำใน Phase 1<span class="n">${l.nop1.length}</span></button></div></div>`;}
    const sc=staffList().length;
    const rCount=k=>{const t=k==="service"?`มี <b>${QB.length}</b> ข้อ`:k==="unit"?`มี <b>${unitN(ward)}</b> ข้อ · ${W.UNIT.length} บท`:k==="admission"?`มี <b>${aiN("adm",ward)}</b> เคส`:k==="specialty"?`มี <b>${aiN("spc",ward)}</b> ข้อ · ไฟล์ ${spcUnits().filter(u=>u.kind!=="L").length} เรื่อง`:k==="staff"?`มีข้อให้ทวน <b>${sc}</b> ข้อ`:k==="advisor"?`อ่านเฉลยได้ <b>${QB.filter(q=>atts(P,1,q.uid).length||atts(P,2,q.uid).length).length}</b> ข้อ`:"";return t?`<span class="rcnt">${t}</span>`:"";};
    const mm=morning(false),ma=mm?mm.list.filter(u=>mm.ans[u]!==undefined).length:0,mr=mm?mm.list.filter(u=>W.byU[u]&&mm.ans[u]===W.byU[u].ans).length:0,MG=mornGame(),mOn=QB.length+unitN(ward)>0,mfx=mOn?mornFx(mDay(),MG,ma):[];
    const badge=r=>r.soon?'<span class="soon">เร็ว ๆ นี้</span>':r.k==="legend"&&P.leg?'<span class="badge">กำลังสอบ</span>':r.k==="staff"&&sc?`<span class="badge">${sc}</span>`:r.k==="morning"&&mm?`<span class="badge">${ma}/${mm.list.length}</span>`:"";
    h+=`<div class="rounds">${ROUNDS.map((r,i)=>`<button class="round${r.k==="morning"?mfx.map(c=>" "+(c==="mred"?"mwarn":c)).join(""):""}" data-round="${r.k}" aria-disabled="${!!r.soon}"${r.k==="morning"&&mfx.includes("maura")?` style="${auraVars(mDay())}"`:""}>${badge(r)}<span class="rn">${String(i+1).padStart(2,"0")}</span><b>${r.k==="io"?ioDot(ioAnyNew()):""}${r.n}${r.k==="morning"&&mOn?mGameHTML(MG):""}</b><span class="rd">${r.soon?"รายละเอียดจะเพิ่มภายหลัง":r.d}</span>${rCount(r.k)}${r.k==="legend"?(()=>{const E=examCfg();return `<span class="lgspec">${E?`<b>${E.n}</b> ข้อ · <b>${E.min}</b> นาที`:"ยังไม่ได้ตั้งจำนวนข้อ/เวลา"}</span>`;})():""}${r.k==="morning"&&mOn?`<span class="mtodo${ma>=MF_LIT?" ok":""}">${!mm?"🎁 ยังไม่ได้เปิดกล่องวันนี้":!ma?"เปิดกล่องแล้ว ยังไม่ได้ทำ — ทำด้วยนะ":ma<MF_LIT?`วันนี้ทำไป ${ma}/${mm.list.length} (ถูก ${mr} ข้อ) — อีก ${MF_LIT-ma} ข้อไฟติด 🔥`:ma<mm.list.length?`🔥 ไฟติดแล้ว · ทำไป ${ma}/${mm.list.length} (ถูก ${mr} ข้อ)`:`✓ ครบ ${ma}/${mm.list.length} ข้อแล้ว (ถูก ${mr} ข้อ)`}</span>`:""}${r.k==="morning"?`<span class="mclock">ชุดใหม่ใน <b id="mClock">${hms(mNext()-now())}</b></span><span class="mhist" data-mhist="1">📅 ประวัติรายวัน →</span>`:""}</button>`).join("")}</div>`;
  }
  h+=gradeCard(ward);
  if(IN_FRAME&&HAS_CLAUDE())h+=clStartCard();
  if(HAS_CLAUDE()&&CFG.siteUrl){const ua=bankItems("adm",ward).concat(bankItems("spc",ward)).filter(unsent).length,ul=bankItems("leg",ward).filter(unsent).length;
    h+=`<div class="card"><h3>ส่งจาก Claude ไปเว็บ</h3><span class="rd">เว็บ (GitHub) กับ Claude เก็บข้อมูลแยกกัน ปุ่มนี้เปิดเว็บพร้อมเคส Admission (โจทย์ เฉลย คำตอบของคุณ) และผลสอบ Legendary (รวมโจทย์ AI) ที่ยังไม่ได้ส่ง เว็บจะเก็บเข้าคลังให้ — ข้อที่ผิดไปขึ้นใน Ward staff round ของเว็บด้วย</span>
      <p class="statline" style="margin:8px 0 0">ยังไม่ได้ส่ง: Admission / Specialty <b>${ua}</b> ข้อ · Legendary <b>${ul}</b> ครั้ง</p>
      <div class="row2"><button class="btn${ua+ul?" primary":""}" id="hSendWeb" type="button" ${ua+ul?"":"disabled"}>ส่งไปเว็บ (เฉพาะของฉัน)</button><button class="btn ghost" id="hSendAll" type="button">ส่งทั้งหมดอีกครั้ง</button></div><p class="hint" id="hSendNote" style="margin:6px 0 0"></p>${ufaBtn("ufaHome")}</div>`;}
  h+=`<div class="card"><h3>ย้ายความคืบหน้า</h3><span class="rd"><b>ลิงก์</b> พาไปได้ทุกวอร์ด ทุก Phase พร้อม ⚑ (ไม่รวมโน้ต) · <b>ไฟล์สำรอง</b> ครบทุกอย่างรวมโน้ตและที่เขียนด้วยมือ</span><div class="tools"><button class="tool" id="hExp">🔗 ส่งลิงก์ความคืบหน้า</button><button class="tool" id="hImp">⤵ นำเข้าลิงก์ / รหัส</button><button class="tool" id="hFile">💾 ดาวน์โหลดไฟล์สำรอง</button><button class="tool" id="hFileIn">📂 นำเข้าไฟล์สำรอง</button></div></div>`;
  h+=`<p class="hint" style="text-align:center;margin-top:18px">อัปเดตเว็บล่าสุด ${typeof BUILD!=="undefined"?BUILD:""}</p>`;
  $("main").innerHTML=h;if((type==="MEQ"||type==="OSCE")&&!noEx)mqBindHome(type);
  document.querySelectorAll("[data-cs]").forEach(b=>b.onclick=()=>{st.clStart=b.dataset.cs;save();rHome();});
  bindUfa();
  {const b=$("hSendAll");if(b)b.onclick=()=>sendWeb(bankItems("adm",ward).concat(bankItems("spc",ward)).map(x=>x.key).concat(bankItems("leg",ward).map(x=>x.key)),"hSendNote");}
  {const b=$("hSendWeb");if(b)b.onclick=()=>sendWeb(bankItems("adm",ward).concat(bankItems("spc",ward)).filter(unsent).map(x=>x.key).concat(bankItems("leg",ward).filter(unsent).map(x=>x.key)),"hSendNote");}
  $("hExp").onclick=exportLink;$("hImp").onclick=importPrompt;$("hFile").onclick=exportFile;$("hFileIn").onclick=importFile;
  document.querySelectorAll("[data-type]").forEach(b=>b.onclick=()=>{P.type=b.dataset.type;save();rHome();});
  document.querySelectorAll("[data-ph]").forEach(b=>b.onclick=()=>{st.phase=+b.dataset.ph;save();rHome();});
  {const b=$("toP2");if(b)b.onclick=()=>{st.phase=2;save();rHome();};}
  bindGrades();
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(ward+"/"+b.dataset.go));
  document.querySelectorAll("[data-p2]").forEach(b=>b.onclick=()=>{const k=b.dataset.p2,l=p2lists()[k];const t={wrong:"ข้อที่ยังผิดอยู่",right:"ข้อที่ทำถูกแล้ว",flag:"ข้อที่ยังไม่มั่นใจ",nop1:"ข้อที่ไม่เคยทำใน Phase 1"}[k];startSess("p2"+k,t,l.map(q=>q.uid));});
  const rs=$("resume");if(rs)rs.onclick=()=>go(ward+"/sess");
  const mc=$("mClock");if(mc){let lastDay=mDay();show._t=setInterval(()=>{if(!document.body.contains(mc)){clearInterval(show._t);return;}mc.textContent=hms(mNext()-now());if(mDay()!==lastDay){lastDay=mDay();rHome();}},1000);}
  document.querySelectorAll("[data-round]").forEach(b=>b.onclick=e=>{if(e&&e.target&&e.target.closest&&e.target.closest("[data-mhist]"))return go(ward+"/mhist");const k=b.dataset.round;const R=ROUNDS.find(r=>r.k===k);if(R.soon){toast("โหมดนี้จะเพิ่มภายหลัง");return;}
    if(k==="io")return go(ward+"/io");if(k==="teach")return go(ward+"/teach");if(k==="unit")return go(ward+"/unit");if(k==="admission")return go(ward+"/adm");if(k==="specialty")return go(ward+"/spc");if(k==="morning")return startMorning();if(k==="longcase")return go(ward+"/lcase");
    if(!QB.length){toast("ยังไม่มีข้อสอบในคลัง");return;}
    if(k==="quality")return go(ward+"/quality");if(k==="advisor")return go(ward+"/advisor");if(k==="legend")return go(ward+"/legend");
    if(k==="grand")go(ward+"/grand");else if(k==="service")go(ward+"/service");
    else if(k==="staff")go(ward+"/staff");
    else toast("โหมดนี้จะเพิ่มภายหลัง");});
}
function startSess(kind,title,uids,extra){
  if(!uids.length){toast("ไม่มีข้อที่เข้าเงื่อนไข");return;}
  if(kind!=="quality")qStop();
  P_().sess=Object.assign({kind,title,ph:ph(),list:uids,ans:{},cur:0,ts:now()},extra||{});save();go(ward+"/sess");
}

/* Teaching round → site/teach.js */

/* ---------------- opening in Claude: one tap to the page you came for ---------------- */
function clStartCard(){const cs=clStart();return `<div class="card"><h3>เปิดเว็บนี้ใน Claude แล้วไปที่</h3><span class="rd">claude.ai ไม่ส่งต่อว่ากดมาจากปุ่มไหนในเว็บ จึงเลือกได้ว่าจะให้ถามทุกครั้ง (กดครั้งเดียว ไม่ต้องเลือกวอร์ด) หรือเปิดหน้าเดิมเสมอ</span><div class="chips">${CLSTART.map(([v,t])=>`<button class="chip" data-cs="${v}" aria-pressed="${cs===v}">${t}</button>`).join("")}</div></div>`;}
function rLaunch(){
  const W=W_(),P=P_(),w=W.cfg,lr=st.lastRoute&&st.lastRoute.split("/")[0]===ward?st.lastRoute.split("/")[1]:"";
  const VN={osl:"Legendary round · OSCE",osx:"Legendary round · OSCE (กำลังสอบ)",osr:"ผล Legendary / Quality round · OSCE",osq:"Quality round · OSCE",osh:"ประวัติ Legendary / Quality round · OSCE",home:"หน้าวอร์ด",adm:"Admission round",spc:"Specialty round",lcase:"Long case",legend:"Legendary round",exam:"Legendary round (กำลังสอบ)",lres:"ผล Legendary round",advisor:"Advisor round",report:"รายงาน Advisor",unit:"Unit round",quality:"Quality round",service:"Service round",grand:"Grand round",hy:"High-yield",kw:"Keyword",staff:"Ward staff round",teach:"Teaching round",tch:"Teaching round (History / PE / CTA)",case:"Case",taker:"History taker / Physical examinator"};
  const it=(v,t,d,b)=>`<button class="resume" data-lv="${v}"><span>${b?`<span class="lbadge">${b}</span>`:""}<b>${t}</b><span class="rd">${d}</span></span><span class="go">→</span></button>`;
  const nAdm=bankItems("adm",ward).length,nLc=bankItems("lc",ward).length;
  let h=`<div class="whead"><h1 class="h2">จะไปหน้าไหน?</h1><a href="#/">เปลี่ยนวอร์ด</a></div><p class="sub" style="margin:0 0 12px">${esc(w.name)} · หน้าที่ต้องใช้ AI เปิดใน Claude ได้เลย</p><div class="stack" style="margin-top:0">`;
  if(WL.some(x=>mqL(x.id).length))h+=it("mqin","ตรวจคำตอบ MEQ จากเว็บ","วางรหัสที่คัดลอกจากเว็บ แล้วให้ Claude ประเมินทุก Part","MEQ");
  h+=it("adm","Admission round",`เคสใหม่ที่ AI สร้างให้ทีละข้อ${nAdm?` · คลังของคุณมี ${nAdm} เคส`:""}`);
  h+=it("spc","Specialty round",`โจทย์ใหม่จากไฟล์ของวอร์ด เลือกเรื่อง / R / N ได้${bankItems("spc",ward).length?` · คลังของคุณมี ${bankItems("spc",ward).length} ข้อ`:""}`);
  h+=it("lcase","Long case",`AI ให้ chief complaint แล้วดำเนินเคสทีละขั้น${nLc?` · ทำไปแล้ว ${nLc} เคส`:""}`);
  h+=it(P.leg?"exam":"legend","Legendary round",P.leg?`กำลังสอบอยู่ใน Claude · เหลือเวลา ${hms(P.leg.end-now())}`:"จำลองสอบจริง พร้อมโจทย์ใหม่จาก AI",P.leg?"กำลังสอบ":"");
  if(!(w.noExam||[]).includes("OSCE")){const oc=typeof osRunCur==="function"&&osRunCur();h+=it(oc?"osx":"osl","Legendary round · OSCE",oc?"กำลังสอบ OSCE อยู่ใน Claude — กดเพื่อสอบต่อ":"จำลองสอบ OSCE จริง พร้อมโจทย์ใหม่จาก AI",oc?"กำลังสอบ":"OSCE");}
  {const C=(bank["tch|all|cta"]||{}).procs||[];h+=it("tch/cta","CTA",`ใส่ไฟล์ให้ AI อ่านเติมเนื้อหา (ตัวพิมพ์ + ลายมือ) · ฝึกพิมพ์ keyword${C.length?` · มี ${C.length} หัตถการ`:""}`);}
  if(lr&&!["adm","spc","lcase","legend","exam","home","osl","osx"].includes(lr))h+=it(lr,"หน้าล่าสุดที่ใช้ใน Claude",VN[lr]||lr);
  h+=it("home","หน้าวอร์ด","round อื่น ๆ ทั้งหมด");
  h+=`</div>`+clStartCard();
  $("main").innerHTML=h;
  document.querySelectorAll("[data-lv]").forEach(b=>b.onclick=()=>go(ward+"/"+b.dataset.lv));
  document.querySelectorAll("[data-cs]").forEach(b=>b.onclick=()=>{st.clStart=b.dataset.cs;save();rLaunch();});
}

/* ---------------- Ward staff round: choose where the questions come from ---------------- */
function rStaff(){
  const P=P_(),p=ph(),o=staffPools(),all=staffAll(),n=all?o.ac.length+o.unit.length+o.adm.length+o.spc.length+o.lai.length:o.ac.length;
  const opt=(v,t,d,c)=>`<button class="resume qprog" data-sa="${v}" aria-pressed="${all===!!v}"><span><b>${t}</b><span class="rd">${d}</span></span><span class="go">${all===!!v?"✓":""}<span class="hint" style="display:block;font-size:13px">${c} ข้อ</span></span></button>`;
  let h=`<h1 class="h2">Ward staff round</h1><p class="sub">ทวนข้อที่เคยทำแล้ว แต่ยังทำถูกติดกันไม่ถึง 2 ครั้ง (ข้อที่ผิดครั้งล่าสุด หรือเพิ่งถูกครั้งเดียวหลังจากเคยผิด) — ทำถูกติดกัน 2 ครั้งเมื่อไหร่ ข้อนั้นจะออกจาก round นี้เอง</p>`;
  h+=`<div class="lbl">ข้อมาจาก</div><div class="stack" style="margin-top:0">`;
  h+=opt(0,"ข้อสอบเก่าเท่านั้น",`ข้อสอบเก่า (AC) ทุกปีในคลัง ที่ทำมาแล้วใน Phase ${p} จาก round ไหนก็ได้ (Service, Grand, Morning, Quality, Legendary ฯลฯ)`,o.ac.length);
  h+=opt(1,"รวมโจทย์ที่ไม่ใช่ข้อสอบเก่าด้วย",`ข้อสอบเก่า ${o.ac.length} · Unit round ${o.unit.length} · Admission round ${o.adm.length} · Specialty round ${o.spc.length} · โจทย์ AI จาก Legendary round ${o.lai.length} — เงื่อนไขเดียวกัน (โจทย์ที่ไม่ใช่ข้อสอบเก่านับรวมทั้ง 2 Phase)`,o.ac.length+o.unit.length+o.adm.length+o.spc.length+o.lai.length);
  h+=`</div>`;
  {const nf=[].concat(o.ac,all?o.unit.concat(o.adm,o.spc,o.lai):[]),f=nf.filter(u=>flagged(P,u)).length,k=nf.filter(u=>kept(P,u)).length;
   h+=`<p class="hint">นับเฉพาะคำตอบล่าสุด — ต้องถูกติดกัน 2 ครั้งล่าสุดถึงจะพ้น ตอบผิดเมื่อไหร่นับใหม่ (ทำจาก round ไหนก็นับ) · ข้อที่ติด ⚑ ไม่มั่นใจ และข้อที่กด 📌 เก็บไว้ จะอยู่ใน round นี้เสมอจนกว่าจะเอาออก${f+k?` (ตอนนี้ ⚑ ${f} ข้อ · 📌 ${k} ข้อ)`:""}</p>`;}
  h+=`<p class="hint">โจทย์ใหม่ที่ AI สร้างใน Legendary round จะไม่ไปโผล่ใน round อื่นเลย นอกจากที่นี่ (เมื่อเลือก “รวมโจทย์ที่ไม่ใช่ข้อสอบเก่าด้วย”)</p>`;
  h+=`<p class="statline" style="margin-top:14px">${n?`มีข้อให้ทวน <b>${n}</b> ข้อ`:Object.keys(P.att[p]).length||o.unit.length+o.adm.length+o.spc.length+o.lai.length?"ไม่มีข้อที่ต้องทวน — ทุกข้อที่ทำแล้วถูกติดกัน 2 ครั้งแล้ว":"ยังไม่มีข้อที่เคยทำใน Phase นี้"}</p>`;
  h+=`<div class="row2"><span class="spacer"></span><button class="btn primary" id="saGo" ${n?"":"disabled"}>เริ่มทวน</button></div>`;
  $("main").innerHTML=h;
  document.querySelectorAll("[data-sa]").forEach(b=>b.onclick=()=>{st.staffAll=b.dataset.sa==="1";save();rStaff();});
  $("saGo").onclick=()=>{const l=staffList();if(!l.length){toast("ไม่มีข้อที่เข้าเงื่อนไข");return;}startSess("staff",all?"Ward staff round · รวมทุกแหล่ง":"Ward staff round",l);};
}

/* ---------------- service round: choose sets ---------------- */
function rService(){
  const W=W_(),P=P_(),p=ph(),QB=W.QB;
  if(!QB.length){$("main").innerHTML=`<div class="empty">ยังไม่มีข้อสอบในคลัง</div>`;return;}
  const sel=new Set(P.pick.filter(k=>W.sets.includes(k)));
  const years=[...new Set(QB.map(q=>q.set))];
  let h=`<h1 class="h2">Service round</h1><p class="sub">เลือกปีและ rotation ที่อยากทำ เลือกได้หลายชุด ไม่เลือกเลย = ทุกชุด</p>`;
  h+=years.map(y=>{const ks=W.sets.filter(k=>k.split(" ")[0]===y);return `<div class="yr"><div class="yh">${esc(y)}</div><div class="chips">${ks.map(k=>{const qs=QB.filter(q=>setKey(q)===k),d=qs.filter(q=>lockedAns(P,p,q.uid)!==undefined).length;const full=d===qs.length,pc=Math.round(d/qs.length*100);return `<button class="chip svchip${full?" done":""}" data-k="${esc(k)}" aria-pressed="${sel.has(k)}" style="--pc:${pc}%">${esc(k.split(" ").slice(1).join(" ").trim()||"ทั้งชุด")}<span class="c">${full?"✓ ครบ ":""}${d}/${qs.length}</span></button>`;}).join("")}</div></div>`;}).join("");
  h+=`<p class="hint">แถบสีในปุ่ม = สัดส่วนที่ทำแล้วใน Phase ${p} · ✓ ครบ = ทำครบทุกข้อในชุดนั้นแล้ว</p>`;
  h+=`<div class="row2"><button class="btn ghost" id="spClear">ล้างที่เลือก</button><span class="spacer"></span><button class="btn primary" id="spGo">เริ่มทำ</button></div>`;
  $("main").innerHTML=h;
  document.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(sel.has(k))sel.delete(k);else sel.add(k);b.setAttribute("aria-pressed",sel.has(k));});
  $("spClear").onclick=()=>{sel.clear();document.querySelectorAll("[data-k]").forEach(b=>b.setAttribute("aria-pressed","false"));};
  $("spGo").onclick=()=>{const order=W.sets;P.pick=[...sel].sort((a,b)=>order.indexOf(a)-order.indexOf(b));const s=P.svc[p];s.set=P.pick.length?P.pick.join("|"):"all";
    {const nx=svcNextTodo();if(nx)s.cur=nx.uid;else{toast("ทำครบทุกข้อในชุดที่เลือกแล้ว");const c=W.byU[s.cur];if(!c||!inSet(c)){const v=svcVisible();s.cur=(svcStart(v)||svcList()[0]).uid;}}}save();go(ward+"/svc");};
}

/* ---------------- grand round setup ---------------- */
function rGrand(){
  const W=W_(),P=P_(),p=ph(),QB=W.QB;
  if(!QB.length){$("main").innerHTML=`<div class="empty">ยังไม่มีข้อสอบในคลัง</div>`;return;}
  let n=st.grandN||20,fresh=!!st.grandFresh;
  const opts=[10,20,40,60,0].filter(x=>!x||x<QB.length);
  const h=`<h1 class="h2">Grand round</h1><p class="sub">สุ่มข้อจากทั้งคลัง (${QB.length} ข้อ) ไม่สนว่าปีไหนหรือเรื่องอะไร</p>
  <div class="yh" style="font-family:var(--num);font-weight:700;margin-bottom:6px">จำนวนข้อ</div>
  <div class="chips" id="gN">${opts.map(x=>`<button class="chip" data-n="${x}" aria-pressed="${x===n||(!opts.includes(n)&&!x)}">${x?x+" ข้อ":"ทั้งหมด"}</button>`).join("")}</div>
  <label style="display:flex;gap:8px;align-items:center;margin-top:14px;font-size:15px"><input type="checkbox" id="gFresh" ${fresh?"checked":""} style="width:20px;height:20px"> เฉพาะข้อที่ยังไม่เคยทำใน Phase ${p}</label>
  <div class="row2"><span class="spacer"></span><button class="btn primary" id="gGo">เริ่มสุ่ม</button></div>`;
  $("main").innerHTML=h;
  document.querySelectorAll("[data-n]").forEach(b=>b.onclick=()=>{n=+b.dataset.n;document.querySelectorAll("[data-n]").forEach(x=>x.setAttribute("aria-pressed",x===b));});
  $("gGo").onclick=()=>{fresh=$("gFresh").checked;st.grandN=n;st.grandFresh=fresh;
    let pool=QB.filter(q=>!fresh||!atts(P,p,q.uid).length);
    if(!pool.length){toast("ทำครบทุกข้อใน Phase นี้แล้ว");return;}
    pool=shuffle(pool);if(n)pool=pool.slice(0,n);startSess("grand","Grand round",pool.map(q=>q.uid));};
}

/* ---------------- quiz (service = persistent sheet · session = a round) ---------------- */
const svcS=()=>P_().svc[ph()];
const selSets=()=>{const s=svcS().set;return s==="all"?[]:String(s).split("|").filter(Boolean);};
/* chapters (W.CHAP[setKey] = {"<บท>":"title"}) — only for a chaptered set the user picked; sv.ch = "all" | "1|22|…" */
const chOf=q=>String(q.orig).split(".")[0];
const chSets=()=>selSets().filter(k=>(W_().CHAP||{})[k]);
const chOk=q=>{const sv=svcS();if(!sv.ch||sv.ch==="all")return true;const k=setKey(q);if(!(W_().CHAP||{})[k]||!selSets().includes(k))return true;return sv.ch.split("|").includes(chOf(q));};
const inSet=q=>svcS().set==="all"||selSets().includes(setKey(q))&&chOk(q);
function svcPass(q){const P=P_(),p=ph(),f=svcS().status,a=lockedAns(P,p,q.uid);
  switch(f){case"todo":return a===undefined;case"wrong":return a!==undefined&&a!==q.ans;case"right":return a!==undefined&&a===q.ans;case"flag":return flagged(P,q.uid);case"nop1":return !atts(P,1,q.uid).length;default:return true;}}
const svcList=()=>W_().QB.filter(inSet);
const svcVisible=()=>noteIns(svcList().filter(svcPass));
/* put each set's notice page ("ข้อ 0") right before that set's first visible question (status filter ทั้งหมด / ยังไม่ทำ only) */
function noteIns(L){const W=W_();if(!W.NOTE||!W.NOTE.length)return L;const f=svcS().status;if(f&&f!=="all"&&f!=="todo")return L;const out=L.slice();
  W.NOTE.filter(inSet).forEach(n=>{const i=out.findIndex(q=>!q.notice&&setKey(q)===setKey(n));if(i>=0)out.splice(i,0,n);});return out;}
const noteSeen=q=>!!(P_().noteSeen&&P_().noteSeen[q.uid]);
const svcStart=v=>v.find(x=>!(x.notice&&noteSeen(x)))||v[0];   /* entering a set: its ข้อ 0 page until it has been answered once */
/* entering the Service round (เริ่มทำ): the next not-yet-answered question of the chosen sets — counting on from where you were if that question is in them, else from the first — wrapping round; a set's unseen ข้อ 0 page comes first when that set still has questions to do */
function svcNextTodo(){const P=P_(),p=ph(),v=svcVisible();if(!v.length)return null;
  const todo=x=>lockedAns(P,p,x.uid)===undefined,left=k=>v.some(y=>!y.notice&&setKey(y)===k&&todo(y));
  const ok=x=>x.notice?!noteSeen(x)&&left(setKey(x)):todo(x);
  const i0=Math.max(0,v.findIndex(x=>x.uid===svcS().cur));
  for(let j=0;j<v.length;j++){const x=v[(i0+j)%v.length];if(ok(x))return x;}return null;}
const ordId=x=>{if(!x.notice)return x.id;const f=W_().QB.find(q=>setKey(q)===setKey(x));return (f?f.id:0)-0.5;};
function svcQ(){const W=W_(),s=svcS();let q=W.byU[s.cur];if(!q||!inSet(q)){q=svcStart(svcVisible())||svcList()[0]||W.QB[0];if(q)s.cur=q.uid;}return q;}
const isSess=()=>view==="sess";
const legPaper=()=>view==="exam"?P_().leg:bank[st.legSel];
const legIdx=()=>view==="exam"?P_().leg.cur:Math.max(0,Math.min((legPaper().list.length-1),st.legIdx||0));
function curQ(){if(isAIV())return AS().cur;if(view==="admq"){const it=bank[st.admSel];return it&&it.q;}if(view==="lrev"||view==="exam"){const X=legPaper();return X?legQ(X.list[legIdx()]):null;}if(isSess()){const s=P_().sess;return qAny(s.list[s.cur]);}return svcQ();}
/* "ทำข้อนี้ใหม่" where answers aren't kept in a session: Legendary review, Admission (current case and bank), Advisor — null = answering again, a number = the new answer */
const REDO={};
function redoKey(q){if(!q)return "";if(view==="lrev")return "lrev|"+st.legSel+"|"+q.uid;if(view==="admq")return "admq|"+st.admSel;if(isAIV())return AM+"|"+q.uid;if(isAdv())return "adv|"+q.uid;return "";}
function doneAns(q){{const k=redoKey(q);if(k&&k in REDO)return REDO[k]===null?undefined:REDO[k];}if(view==="admq"){const it=bank[st.admSel];return it&&it.a!=null?it.a:undefined;}if(view==="lrev"){const a=bank[st.legSel].ans[q.uid];return a==null?-2:a;}if(isAdv()){const h=hist(P_(),q.uid,P_().sess.hp,true);return h.length?h[h.length-1][0]:null;}if(isAIV()){const a=AS().ans;return a==null?undefined:a;}return isSess()?P_().sess.ans[q.uid]:lockedAns(P_(),ph(),q.uid);}

/* ---------------- seen elsewhere: which rounds a question (or a related question) has already appeared in ---------------- */
const RKL={service:"service round",grand:"grand round",morning:"morning round",staff:"ward staff round",quality:"quality round",unit:"unit round",advisor:"advisor round",topic:"advisor round (รายหัวข้อ)",redo:"รอบทำข้อผิดซ้ำ",phase2:"ทบทวนก่อนสอบ (Phase 2)",legend:"legendary round",adm:"admission round",spc:"specialty round",mday:"morning round (ย้อนดู)"};
const RKO=Object.keys(RKL);
function curRK(){if(view==="svc")return "service";if(isAIV()||view==="admq")return AM;if(view==="exam"||view==="lrev")return "legend";
  if(view==="sess"){const k=(P_().sess||{}).kind||"";return k.startsWith("p2")?"phase2":RKL[k]?k:"grand";}return "";}
function markSeen(q,rk){if(!q||!rk)return;const P=P_(),m=P.seen[q.uid]||(P.seen[q.uid]={});if(!m[rk]){m[rk]=now();save();}}
const seenIn=(P,u)=>Object.keys(P.seen[u]||{}).sort((a,b)=>RKO.indexOf(a)-RKO.indexOf(b));
function relSeen(P,W,u){const o=new Set();(W.REL[u]||[]).forEach(x=>seenIn(P,x).forEach(k=>o.add(k)));return RKO.filter(k=>o.has(k));}
const rkNames=ks=>ks.map(k=>RKL[k]||k).join(", ");
/* broad chapter-level tags (never diagnosis names): the ward's own vocabulary from data/tags.js, or the surgery list */
const BROAD0=["Pre-op & post-op","MIS","Hemostasis & transfusion","Fluid & electrolyte","Metabolic response","Nutrition","Surgical infection","Onco","Professionalism & ethics","Surgical safety","Trauma","Burn","Plastic","Transplant","Breast","Thyroid & parathyroid","Esophagus","Stomach & duodenum","Small bowel","Appendix","Acute abdomen","Hernia","Liver","Jaundice","Gallstone","Pancreas","Spleen","Colorectal","Anorectal","Vascular"];
const broadOf=W=>{if(!W)return BROAD0;if(!W._broad){const s=new Set();Object.values(W.TAGS||{}).forEach(a=>a.forEach(t=>s.add(t)));s.delete("Misc");W._broad=s.size?[...s]:BROAD0;}return W._broad;};
const TAGRX=[["Vascular",/aneurysm|\baaa\b|limb isch|claudicat|peripheral arter|\bpad\b|\bdvt\b|thrombo|venous|varicose|embol|carotid|arterial|mesenteric isch/],
  ["Transplant",/transplant|rejection|donor|brain death/],["Breast",/breast|mastitis|nipple|fibroadenoma|phyllodes/],["Thyroid & parathyroid",/thyroid|parathyroid|goit|graves|\bmen ?2/],
  ["Esophagus",/esophag|oesophag|achalasia|barrett|\bgerd\b|boerhaave|caustic/],["Stomach & duodenum",/gastr(?!o?enteritis)|stomach|peptic|duoden|upper gi|pylor|dumping|bariatric|\bgist\b/],
  ["Appendix",/appendic|appendix/],["Hernia",/hernia|hydrocele/],["Anorectal",/\banal\b|anus|hemorrhoid|haemorrhoid|fissure|perianal|anorectal|pilonidal|fistula-in-ano/],
  ["Colorectal",/colon|colorectal|\brectal|rectum|sigmoid|diverticul|crohn|colitis|\bibd\b|lower gi/],["Small bowel",/small bowel|small intestin|\bsbo\b|ileus|meckel|adhesi|intussus|enterocutaneous|short bowel|mesenteric/],
  ["Spleen",/splen/],["Pancrea",/pancrea|whipple|ipmn|insulinoma/],["Gallstone",/gallstone|cholecyst|biliary colic|cholelith|gallbladder|mirizzi/],
  ["Jaundice",/jaundice|choledoch|cholangi|periampull|ampull|bile duct|\bcbd\b|klatskin|obstructive biliary/],["Liver",/liver|hepat|cirrho|portal hyper|varice|\bhcc\b|budd/],
  ["Acute abdomen",/acute abdomen|peritonit|perforat|bowel obstruction|volvulus|strangulat|incarcerat|appendicitis/],
  ["Trauma",/trauma|injur|\bfast\b|laceration|hemoperitoneum|haemoperitoneum|primary survey/],["Burn",/burn/],["Plastic",/wound healing|suture|skin graft|\bflap|scar|keloid|lipoma|epidermoid/],
  ["Fluid & electrolyte",/natremia|kalemia|calcemia|acidosis|alkalosis|acid-base|fluid|electrolyte|dehydrat|shock/],["Metabolic response",/metabolic response|starvation|stress response/],
  ["Nutrition",/nutrition|\btpn\b|parenteral|enteral|refeeding|malnutrition/],["Surgical infection",/infection|abscess|cellulitis|necrotizing|\bssi\b|sepsis|septic|tetanus|antibiotic prophylaxis/],
  ["Hemostasis & transfusion",/transfus|coagul|hemophilia|haemophilia|warfarin|anticoag|heparin|platelet|von willebrand/],["Pre-op & post-op",/preoperat|postoperat|perioperat|\basa\b|post-op|pre-op/],
  ["MIS",/laparoscop|minimally invasive|pneumoperitoneum/],["Professionalism & ethics",/ethic|consent|autonomy|palliative|professional/],
  ["Onco",/cancer|carcinoma|tumou?r|malignan|lymphoma|neoplasm|metasta|sarcoma|\bhcc\b|\bgist\b|insulinoma/]];
function guessTags(W,txt){const v=broadOf(W),t=String(txt||"").toLowerCase(),o=[];TAGRX.forEach(([k,rx])=>{const n=k==="Pancrea"?"Pancreas":k;if(rx.test(t)&&v.includes(n)&&!o.includes(n))o.push(n);});const on=o.indexOf("Onco");if(on>=0){o.splice(on,1);o.push("Onco");}return o.slice(0,4);}
function cleanTags(W,a,txt){const v=broadOf(W),lc=v.map(x=>x.toLowerCase()),o=[];(Array.isArray(a)?a:[]).forEach(x=>{const i=lc.indexOf(String(x).trim().toLowerCase());if(i>=0&&!o.includes(v[i]))o.push(v[i]);});return o.length?o.slice(0,4):guessTags(W,txt);}
/* subject tags (data/tags.js: 1–3 per question, chapter-level) — shown before and after answering in every round; never on the Legendary question page */
function qTags(q){const W=W_();let t=[];
  if(q.adm)t=Array.isArray(q.tags)&&q.tags.length?q.tags:guessTags(W,q.topic||"")||[];else if(q.unit){const Lc=W.byLec[q.unit]||{};t=Array.isArray(q.tags)&&q.tags.length?q.tags:[].concat(Lc.tags||Lc.topic||[]);}
  else t=(W.TAGS&&W.TAGS[q.set+"|"+q.ro+"|"+q.orig])||[];return t;}
/* attached resources outside the lectures (<dir>/resources.js → W.RES=[{code,title,topic,tags,type,url,note,points:[…]}]) */
const resOf=W=>(W&&W.RES||[]).filter(r=>r&&r.title);
function resFor(q){const W=W_(),tg=qTags(q),tp=q.adm||q.unit?"":topicOf(W,q);return resOf(W).filter(r=>(r.tags||[]).some(t=>tg.includes(t))||(tp&&r.topic===tp));}
const resLabel=r=>(r.code?r.code+" ":"")+r.title;
const resPts=(r,n)=>(Array.isArray(r.points)?r.points:[]).slice(0,n||99);
/* where an AI-written question takes its content from: picked uniformly at random among "anywhere" and every attached resource that has content */
function pickSrc(W){const rs=resOf(W).filter(r=>resPts(r).length),o=[null].concat(rs);return o[Math.floor(Math.random()*o.length)];}
/* Admission round may use anything: general knowledge, or any lecture (L) / resource (R) / ward note (N) summary of this ward — one of these 4 groups at random (equal chance), then one page inside it */
const IOKN={L:"lecture summary",R:"resource summary",N:"ward note (checked and corrected)"};
function ioSrcs(W){const o=[];((W&&W.IO&&W.IO.docs)||[]).forEach(d=>(d.pages||[]).forEach(p=>{
  const t=String(p.html||"").replace(/<span class="iowas">[\s\S]*?<\/span>/g,"").replace(/\{\{[^}]*\}\}/g,"").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
  if(t)o.push({io:1,kind:d.kind,code:d.code,title:(d.kind==="N"?"โน้ตวอร์ด":d.title)+" — "+p.title,text:t.slice(0,7000)});}));return o;}
function pickSrcAdm(W){const rs=resOf(W).filter(r=>resPts(r).length),io=ioSrcs(W);
  const G=[[null],io.filter(x=>x.kind==="L"),rs.concat(io.filter(x=>x.kind==="R")),io.filter(x=>x.kind==="N")].filter(g=>g.length);
  const g=G[Math.floor(Math.random()*G.length)];return g[Math.floor(Math.random()*g.length)];}
const srcPrompt=r=>!r?"":r.io?`\nContent source for this question: build it mainly on the ${IOKN[r.kind]||"summary"} below from this ward (you may add standard textbook or guideline knowledge, but the key point tested must come from it; where it marks a correction, use the corrected statement).\nSource ${r.code} ${r.title}:\n${r.text}\n`
  :`\nContent source for this question: build it mainly on the attached resource below (you may add standard textbook or guideline knowledge, but the key point tested must come from it).\nResource ${resLabel(r)}:\n- ${resPts(r).join("\n- ")}\n`;
function tagRow(q){const W=W_();let t=[];
  if(q.adm)t=Array.isArray(q.tags)&&q.tags.length?q.tags:guessTags(W,q.topic||"")||[];else if(q.unit){const Lc=W.byLec[q.unit]||{};t=Array.isArray(q.tags)&&q.tags.length?q.tags:[].concat(Lc.tags||Lc.topic||[]);}
  else t=(W.TAGS&&W.TAGS[q.set+"|"+q.ro+"|"+q.orig])||[];
  if(!t.length)return "";
  const lec=W.TAGLEC||{};   /* future: tag → lecture code */
  return `<div class="ttags"><span class="tl">เรื่อง</span>${t.map(x=>`<span class="tt">${esc(x)}${lec[x]?` <b>${esc(lec[x])}</b>`:""}</span>`).join("")}</div>`;}
function seenFields(q,rk){const P=P_(),W=W_();let h="";
  const a=seenIn(P,q.uid).filter(k=>k!==rk),b=relSeen(P,W,q.uid);
  if(a.length)h+=`<span class="field seen"><b>เคยเจอใน</b>${esc(rkNames(a))}</span>`;
  if(b.length)h+=`<span class="field seen rel"><b>ข้อคล้ายเคยเจอใน</b>${esc(rkNames(b))}</span>`;
  return h;}
/* explanation: the same question's earlier answers in other rounds (correct or not), and the related questions in the bank */
function seenHistHTML(q,rk){const P=P_(),W=W_(),g={},L_=[];
  const add=(x,ph)=>{const r=x[2]||"?";if(r===rk)return;(g[r]=g[r]||[]).push([x[0],x[1],ph]);};
  if(q.unit)(P.unit.att[q.uid]||[]).forEach(x=>add(x,0));else [1,2].forEach(ph=>(P.att[ph][q.uid]||[]).forEach(x=>add(x,ph)));
  RKO.concat(["?"]).forEach(r=>{if(!g[r])return;L_.push(`<span class="hgrp"><b>${r==="?"?"ก่อนหน้านี้ (ไม่ได้บันทึก round)":esc(RKL[r])}</b> ${g[r].map(x=>`<span class="hb ${x[0]===q.ans?"ok":"no"}" title="${x[2]?"Phase "+x[2]+" · ":""}${fmtD(x[1])}">${x[0]>=0?L[x[0]]:"–"}</span>`).join("")}</span>`);});
  const onlySeen=seenIn(P,q.uid).filter(k=>k!==rk&&!g[k]);
  const rel=(W.REL[q.uid]||[]).map(u=>W.byU[u]).filter(Boolean);
  if(!L_.length&&!onlySeen.length&&!rel.length)return "";
  let h=`<div class="seenbox">`;
  if(L_.length)h+=`<div><span class="hint">ข้อนี้เคยตอบใน round อื่น:</span> ${L_.join(" ")}</div>`;
  if(onlySeen.length)h+=`<div><span class="hint">เคยเจอ (ยังไม่ได้ตอบ) ใน:</span> ${esc(rkNames(onlySeen))}</div>`;
  if(rel.length)h+=`<div><span class="hint">ข้อคล้ายกันในคลัง:</span> ${rel.map(x=>`<button class="qref" data-u="${esc(x.uid)}">ข้อ ${x.id}</button> <span class="hint">${esc(x.set)} ${esc(x.ro)}${seenIn(P,x.uid).length?" · เคยเจอใน "+esc(rkNames(seenIn(P,x.uid))):""}</span>`).join(" · ")}</div>`;
  return h+`</div>`;}
function rQuiz(){
  const W=W_(),P=P_(),R=W.R,q=curQ();
  if(!q){$("main").innerHTML=`<div class="empty">ไม่มีข้อในชุดนี้</div>`;return;}
  if(q.notice){rNotice(q);return;}
  const done=doneAns(q);if(done!==undefined)pick=done!=null&&done>=0?done:null;const locked=done!==undefined;
  if(isAdv()){const s=P.sess;if(s.ans[q.uid]===undefined){s.ans[q.uid]=-9;s.ts=now();save();}}   /* advisor: -9 = answer read */
  let h="";
  if(isAIV()){const A=AS();h+=`<div class="sessbar">${AMN()} · ข้อที่ ${A.n+(locked?0:1)} · ถูกแล้ว ${A.right}/${A.n} · ${esc(W.cfg.short||"")}${AM==="spc"?` · <button class="linkbtn" id="spcEnd" style="font-size:13px;padding:0">จบรอบ / เปลี่ยนเรื่อง</button>`:""}</div>`;}
  else if(view==="lrev"){const X=legPaper(),i=legIdx();h+=`<div class="sessbar">Legendary round · เฉลยข้อ ${i+1}/${X.list.length} · ได้เกรด ${esc(gradeOf(X.pct))}${X.star[q.uid]?" · ★ ติดดาวไว้":""}</div>`;}
  else if(view==="admq"){const L_=bankItems(AM,ward),i=L_.findIndex(x=>x.key===st.admSel);h+=`<div class="sessbar">${AMN()} · คลังของฉัน ข้อ ${i+1}/${L_.length} · สร้างเมื่อ ${fmtD(bank[st.admSel].c)}</div>`;}
  else if(isAdv()){const s=P.sess;h+=`<div class="sessbar">${esc(s.title)} · ข้อ ${s.cur+1}/${s.list.length} · อ่านเฉลย · ประวัติ${s.hp==="p"?` Phase ${s.ph}`:"ทั้ง 2 Phase"}</div>`;}
  else if(isSess()){const s=P.sess;h+=`<div class="sessbar">${esc(s.title)} · ข้อ ${s.cur+1}/${s.list.length} · Phase ${s.ph}</div>`;}
  const lab=q.lai?["โจทย์","Legendary"]:q.spc?["เคส","Specialty"]:q.adm?["เคส","Admission"]:q.unit?["Lecture","Unit"]:[CFG.setLabel||"ปี",CFG.roLabel||"Rotation"];
  h+=`<div class="qhead"><div class="qnum">${view==="lrev"?legIdx()+1:q.adm?"A":q.id}.</div><div class="fields"><span class="field"><b>${lab[0]}</b>${esc(q.set)}</span><span class="field"><b>${lab[1]}</b>${esc(q.ro)}</span>${view==="lrev"?legPreFields(legPaper(),q.uid):seenFields(q,curRK())}</div>${q.adm?"":`<button class="flag" id="flagBtn" aria-pressed="${flagged(P,q.uid)}" title="ทำเครื่องหมายข้อที่ยังไม่มั่นใจ">⚑ ไม่มั่นใจ</button>`}</div>`;
  h+=tagRow(q);
  h+=`<p class="stem">${q.stem}</p>`;
  if(!q.img&&q.imgNote)h+=`<div class="img-missing">🖼 ${q.imgNote}</div>`;
  if(q.img){const IL=Array.isArray(q.img)?q.img:[q.img];h+=`<div class="stem-img">${IL.map(k=>imgHTML(k,"ภาพประกอบโจทย์")).join("")}${q.imgNote?`<div class="img-note">${q.imgNote}</div>`:""}</div>`;}
  const gi=(q.gray||"").indexOf(" — "),g1=gi>=0?q.gray.slice(0,gi):q.gray;if(g1)h+=`<p class="gray">${esc(g1)}</p>`;
  h+=`<ul class="opts" role="radiogroup" aria-label="ตัวเลือก">`;
  const everPick=isAdv()?new Set(hist(P,q.uid,P.sess.hp,true).map(x=>x[0])):null;
  q.opts.forEach((o,i)=>{let c="opt";if(pick===i)c+=" sel";if(locked){if(i===q.ans)c+=" correct";else if(i===done||(everPick&&everPick.has(i)))c+=" wrongpick";else c+=" dim";}
    h+=`<li class="${c}" role="radio" tabindex="0" aria-checked="${pick===i}" aria-disabled="${locked}" data-i="${i}"><span class="bub">${L[i]}</span><span class="txt">${esc(o)}</span></li>`;});
  h+=`</ul>`;
  const p=isSess()?P.sess.ph:ph();
  if(!locked){
    h+=`<div class="actions"><button class="btn primary" id="confirm" ${pick===null?"disabled":""}>ยืนยันคำตอบ</button><span class="hint">กด A–E แล้ว Enter ได้</span></div>`;
    const has=noteHas("pre",p,q.uid);
    h+=`<details class="pre" id="preBox" ${has?"open":""}><summary>✎ ทด / จดก่อนตอบ</summary>${noteHTML("pre",p,q)}</details>`;
  }else h+=explain(q,done,R,p);
  $("main").innerHTML=h;
  bindQuiz(q,locked);bindRefs();
  if(view!=="lrev"&&view!=="admq")markSeen(q,curRK());
  paintNav();
}
/* "ข้อ 0" page: only the picture as the question and its buttons as choices; any choice → next not-yet-answered question of that set */
function rNotice(q){const lab=[CFG.setLabel||"ปี",CFG.roLabel||"Rotation"];
  let h=`<div class="qhead"><div class="qnum">0.</div><div class="fields"><span class="field"><b>${lab[0]}</b>${esc(q.set)}</span><span class="field"><b>${lab[1]}</b>${esc(q.ro)}</span></div></div>`;
  if(q.stem)h+=`<p class="stem">${q.stem}</p>`;
  if(q.img)h+=`<div class="stem-img notice-img">${imgHTML(q.img,q.alt||"ภาพ")}</div>`;
  h+=`<ul class="opts" role="radiogroup" aria-label="ตัวเลือก">${q.opts.map((o,i)=>`<li class="opt" role="radio" tabindex="0" aria-checked="false" data-i="${i}"><span class="bub">${L[i]}</span><span class="txt">${esc(o)}</span></li>`).join("")}</ul>`;
  $("main").innerHTML=h;
  document.querySelectorAll(".opt").forEach(el=>{el.addEventListener("click",()=>noteGo(q));el.addEventListener("keydown",e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();noteGo(q);}});});
  paintNav();}
function noteGo(q){const P=P_(),p=ph();P.noteSeen=P.noteSeen||{};P.noteSeen[q.uid]=now();
  const L_=svcList().filter(x=>setKey(x)===setKey(q)),t=L_.find(x=>lockedAns(P,p,x.uid)===undefined)||L_[0];
  if(t)svcS().cur=t.uid;pick=null;save();rQuiz();window.scrollTo(0,0);}
function paintNav(){
  const P=P_();let a=0,n=0;
  if(view==="exam"||view==="lrev"){const X=legPaper(),i=legIdx(),n=X.list.length;$("pos").textContent=`${i+1} / ${n}`;$("prev").disabled=i===0;$("next").disabled=false;
    $("next").textContent=i===n-1?(view==="exam"?"ดูกระดาษคำตอบ":"กลับไปผลสอบ"):"ข้อถัดไป";
    const a=view==="exam"?Object.keys(X.ans).length:X.score;$("count").textContent=`${a}/${n}`;$("prog").style.width=(view==="exam"?a/n*100:(i+1)/n*100)+"%";return;}
  if(view==="admq"){const L_=bankItems(AM,ward),i=L_.findIndex(x=>x.key===st.admSel);$("pos").textContent=`${i+1} / ${L_.length}`;$("prev").disabled=i<=0;$("next").disabled=i>=L_.length-1;$("next").textContent="ข้อถัดไป";
    const d=L_.filter(x=>x.a!=null);$("count").textContent=`${d.length}/${L_.length}`;$("prog").style.width="0";return;}
  if(isAIV()){const B=bankItems(AM,ward);$("count").textContent=`${B.filter(x=>x.a!=null).length}/${B.length}`;const A=AS(),ok=A.ans!=null;$("pos").textContent=`ข้อที่ ${A.n+(ok?0:1)}`;$("prev").disabled=true;$("next").disabled=!ok;$("next").textContent=ok?(A.next?"ข้อต่อไป":admBusy?(admWant?"รอสักครู่…":"ข้อต่อไป (กำลังสร้าง)"):"ข้อต่อไป"):"ข้อต่อไป";$("prog").style.width="0";return;}
  if(isSess()){const s=P.sess;$("pos").textContent=`${s.cur+1} / ${s.list.length}`;$("prev").disabled=s.cur===0||!qNavOK(s.cur-1);$("next").disabled=s.cur<s.list.length-1?!qNavOK(s.cur+1):(qLock()||mLastOpen());$("next").textContent=s.cur===s.list.length-1?"ดูสรุปรอบนี้":"ข้อถัดไป";n=s.list.length;a=Object.keys(s.ans).filter(u=>s.list.includes(u)).length;}
  else{const v=svcVisible(),q=svcQ(),i=v.findIndex(x=>x.uid===(q&&q.uid));$("pos").textContent=`${i>=0?i+1:"–"} / ${v.length}`;$("prev").disabled=v.length<2&&i>=0;$("next").disabled=v.length<2&&i>=0;$("next").textContent="ข้อถัดไป";
    const l=svcList();n=l.length;a=l.filter(x=>lockedAns(P,ph(),x.uid)!==undefined).length;}
  $("count").textContent=`${a}/${n}`;$("prog").style.width=(n?a/n*100:0)+"%";
}
function bindQuiz(q,locked){
  const P=P_();
  document.querySelectorAll(".opt").forEach(el=>{const f=()=>{if(locked)return;pick=+el.dataset.i;rQuiz();};el.addEventListener("click",f);el.addEventListener("keydown",e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();f();}});});
  const c=$("confirm");if(c)c.onclick=confirmAns;
  {const se=$("spcEnd");if(se)se.onclick=spcEndRun;}
  {const kb=$("keepBtn");if(kb)kb.onclick=()=>{const on=!kept(P,q.uid);P.skeep[q.uid]=[on?1:0,now()];save();toast(on?"เก็บข้อนี้ไว้ใน Ward staff round แล้ว":"เอาออกจากที่เก็บไว้แล้ว");rQuiz();};}
  if($("flagBtn"))$("flagBtn").onclick=()=>{const on=!flagged(P,q.uid);P.flag[q.uid]=[on?1:0,now()];save();$("flagBtn").setAttribute("aria-pressed",on);toast(on?"ทำเครื่องหมาย ไม่มั่นใจ แล้ว":"เอาเครื่องหมายออกแล้ว");};
  if(isAdv())bindAdv(q);
  const rb=$("redo");if(rb)rb.onclick=()=>{const rk=redoKey(q);if(rk){REDO[rk]=null;pick=null;rQuiz();window.scrollTo(0,0);return;}if(isSess()){delete P.sess.ans[q.uid];if(P.sess.kind==="morning"&&P.morn[1]&&P.morn[1].day===P.sess.day)delete P.morn[1].ans[q.uid];}else P.open[ph()][q.uid]=now();if(P.sess)P.sess.ts=now();pick=null;save();rQuiz();window.scrollTo(0,0);};
  const pb=$("preBox");if(pb)pb.addEventListener("toggle",()=>{if(pb.open)mountNotes(pb);});
  mountNotes(document);
  bindAsk(q);
}
function confirmAns(){
  if(pick===null)return;const P=P_(),q=curQ(),p=isSess()?P.sess.ph:ph();
  const rdk=redoKey(q),again=rdk&&REDO[rdk]===null;
  if(again&&(isAIV()||view==="admq"||view==="lrev")){const t=now();
    if(view==="admq"){const it=bank[st.admSel];if(it){if(it.a==null)admBank(ward,it.q,pick);else extPush(it.q,[pick,t,AM]);}}
    else if(q.unit)(P.unit.att[q.uid]=P.unit.att[q.uid]||[]).push([pick,t,curRK()]);
    else if(q.adm){if(bank[extKey(q)])extPush(q,[pick,t,curRK()]);else if(q.lai)bankPut(extKey(q),{q,h:[[pick,t,curRK()]]});else admBank(ward,q,pick);}
    else (P.att[ph()][q.uid]=P.att[ph()][q.uid]||[]).push([pick,t,curRK()]);
    REDO[rdk]=pick;save();rQuiz();const e=document.querySelector(".exp");if(e)setTimeout(()=>e.scrollIntoView({behavior:"smooth",block:"start"}),60);return;}
  if(rdk&&rdk.startsWith("adv|"))delete REDO[rdk];
  if(isAIV()){admAnswer(pick);return;}
  if(view==="admq"){const it=bank[st.admSel];if(it){admBank(ward,it.q,pick);}rQuiz();return;}
  const rk=curRK();
  if(q.unit)(P.unit.att[q.uid]=P.unit.att[q.uid]||[]).push([pick,now(),rk]);
  else if(q.adm){if(bank[extKey(q)])extPush(q,[pick,now(),rk]);else if(q.lai)bankPut(extKey(q),{q,h:[[pick,now(),rk]]});else admBank(ward,q,pick);}
  else (P.att[p][q.uid]=P.att[p][q.uid]||[]).push([pick,now(),rk]);
  if(isSess()){const s=P.sess;s.ans[q.uid]=pick;s.ts=now();
    if(s.kind==="morning"){const m=P.morn[1];if(m&&m.day===s.day){m.ans[q.uid]=pick;m.ts=now();
      /* on-time = answered inside that day's 07:30–07:29 window; only these count for 🔥 / 🏅 / gold edge / aura (first answer only) */
      if(mDay()===m.day&&pick>=0){m.ot=m.ot||{};if(!(q.uid in m.ot))m.ot[q.uid]=pick===q.ans?1:0;}}}
    if(s.kind==="mday"){const m1=P.morn[1],mp=s.mp||1,x=m1&&m1.day===s.day&&mp===1?m1:P.mornH[s.day+"|"+mp];if(x){x.ans=x.ans||{};x.ans[q.uid]=pick;x.ts=now();}}}
  else svcS().cur=q.uid;
  save();rQuiz();
  const e=document.querySelector(".exp");if(e)setTimeout(()=>e.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"}),60);
}
function step(d){
  if(view==="mq")return mqStep(d);
  if(isAIV()){if(d>0)admNext();return;}
  if(view==="exam"){const X=P_().leg;if(d>0&&X.cur===X.list.length-1){openS();return;}X.cur=Math.max(0,Math.min(X.list.length-1,X.cur+d));save();rExam();window.scrollTo(0,0);return;}
  if(view==="lrev"){const X=legPaper(),i=legIdx()+d;if(i>=X.list.length){go(ward+"/lres");return;}st.legIdx=Math.max(0,i);persist();pick=null;rQuiz();window.scrollTo(0,0);return;}
  if(view==="admq"){const L_=bankItems(AM,ward),i=L_.findIndex(x=>x.key===st.admSel)+d;if(i<0||i>=L_.length)return;st.admSel=L_[i].key;persist();pick=null;rQuiz();window.scrollTo(0,0);return;}
  if(isSess()){const s=P_().sess;const to=s.cur+d;if(to>=0&&to<s.list.length&&!qNavOK(to)){toast(navMsg());return;}if(d>0&&s.cur===s.list.length-1&&(qLock()||mLastOpen())){toast(navMsg());return;}}
  pick=null;
  if(isSess()){const s=P_().sess;if(d>0&&s.cur===s.list.length-1){go(ward+"/result");return;}s.cur=Math.max(0,Math.min(s.list.length-1,s.cur+d));s.ts=now();save();rQuiz();window.scrollTo(0,0);return;}
  const v=svcVisible();if(!v.length)return;const q=svcQ();
  const nx=d>0?v.find(x=>ordId(x)>ordId(q)):[...v].reverse().find(x=>ordId(x)<ordId(q));
  const t=nx||(d>0?v[0]:v[v.length-1]);if(t.uid!==q.uid){svcS().cur=t.uid;save();rQuiz();window.scrollTo(0,0);}
}
$("prev").onclick=()=>step(-1);$("next").onclick=()=>step(1);$("exSub").onclick=()=>legAskSubmit();
/* while a Legendary exam runs, every other page of that ward shows a bar to go back or submit */
function paintLegBan(){const b=$("legban");if(!b)return;const X=ward&&WARDS[ward]&&st.w[ward]&&st.w[ward].leg;b.hidden=!X||view==="exam";if(!b.hidden)$("legbanT").textContent=hms(X.end-now());}
$("legbanGo").onclick=()=>go(ward+"/exam");$("legbanSub").onclick=()=>legAskSubmit();

function explain(q,done,R,p){
  const ok=done===q.ans,skip=done!=null&&done<0,P=P_(),W=W_(),s=isSess()?P.sess:null,adv=isAdv();
  let h=`<section class="exp" aria-live="polite">`;
  if(q.alert)h+=`<div class="qalert">${q.alert}</div>`;   /* red banner at the very top of the answer (e.g. "YUZU & MDCU78 เฉลยไม่ตรง") */
  if(adv&&done==null)h+=`<div class="verdict"><span class="v new">ยังไม่เคยทำ</span><span class="ans">เฉลย <b>${L[q.ans]}. ${esc(q.opts[q.ans])}</b></span></div>`;
  else if(view==="lrev"&&done===-2)h+=`<div class="verdict"><span class="v new">ไม่ได้ทำ</span><span class="ans">ข้อนี้ไม่ได้ตอบในการสอบ · เฉลย <b>${L[q.ans]}. ${esc(q.opts[q.ans])}</b></span></div>`;
  else h+=`<div class="verdict"><span class="v ${ok?"ok":"no"}">${ok?"ถูก":skip?"หมดเวลา":"ผิด"}</span><span class="ans">${adv?"ครั้งล่าสุด · ":""}${ok?"":skip?"ไม่ได้ตอบ · ":`คุณตอบ ${L[done]} · `}เฉลย <b>${L[q.ans]}. ${esc(q.opts[q.ans])}</b></span></div>`;
  h+=`<div class="tagline">`;
  if(q.rep)h+=`<span class="tag rep">repeated x${q.rep}</span>`;
  if(view==="lrev"){const X=legPaper(),sr=legSrc(X,q.uid);
    h+=`<span class="tag rep">ที่มาของข้อนี้: ${sr==="unit"?`Unit round — ${esc((W.byLec[q.unit]||{}).title||q.set)}`:sr==="adm"?`Admission round — เคสที่ AI เคยสร้างให้คุณ${q.topic?` (${esc(q.topic)})`:""}`:sr==="spc"?`Specialty round — โจทย์ที่ AI เคยสร้างให้คุณจากไฟล์ของวอร์ด${q.srcRes?` (${esc(q.srcRes)})`:""}`:sr==="ai"?`โจทย์ใหม่ที่ AI สร้างขึ้นเฉพาะข้อสอบชุดนี้${q.topic?` (${esc(q.topic)})`:""} — ไม่เคยเจอที่ไหนมาก่อน และจะกลับมาอีกเฉพาะใน Ward staff round`:`ข้อสอบเก่า (AC) ${esc(q.set)} ${esc(q.ro)} · ข้อ ${q.id} ในคลัง${sr==="acd"?" · ตอนสอบเป็นข้อที่คุณเคยทำแล้ว":sr==="acn"?" · ตอนสอบเป็นข้อที่ยังไม่เคยทำ":""}`}</span>`;
    if(X.star[q.uid])h+=`<span class="tag starTag">★ ติดดาวไว้ตอนสอบ</span>`;}
  if(adv)h+=advResetBtn(q);
  h+=`<button class="link redo" id="redo" type="button">ทำข้อนี้ใหม่</button>`;
  if(view!=="exam"&&Array.isArray(q.opts)){const a=qAttsOf(P,q),k=stk(a,q),fl=flagged(P,q.uid),kp=kept(P,q.uid),justNow=!adv&&done===q.ans&&k===2&&a.length&&a[a.length-1][1]>now()-5*60e3;
    /* status always reflects the LATEST answers of this question (any round) — so every place this explanation shows stays up to date */
    if(a.length||fl||kp)h+=`<div class="staffnote${k>=2&&!fl&&!kp?" grad":""}">${justNow?"🎓 ถูก 2 ครั้งติดกันแล้ว — ข้อนี้<b>พ้นจาก Ward staff round</b>":k>=2?`✓ <b>พ้นจาก Ward staff round แล้ว</b> · ถูกติดกัน ${k} ครั้งล่าสุด`:a.length?`อยู่ใน Ward staff round · ถูกติดกันล่าสุด ${k}/2 ครั้ง${a.length&&a[a.length-1][0]!==q.ans?" (ล่าสุดผิด — นับใหม่)":""}`:"ยังไม่เคยตอบข้อนี้"}${k>=2&&fl?" · แต่ยังอยู่ใน Ward staff round เพราะติด ⚑ ไม่มั่นใจไว้":""}${k>=2&&kp?" · แต่ยังอยู่ใน Ward staff round เพราะกด 📌 เก็บไว้":""}
      ${k>=2||kp?`<button class="chip" type="button" id="keepBtn" aria-pressed="${kp}">${kp?"📌 เก็บไว้ใน Ward staff round แล้ว (กดเพื่อเอาออก)":"📌 ยังอยากเก็บไว้ใน Ward staff round"}</button>`:""}</div>`;}
  if(s&&s.kind==="morning")h+=`<span class="tag rep">ที่มา: ${q.unit?`Unit round — ${esc((W.byLec[q.unit]||{}).title||q.set)} (นับว่าเจอข้อนี้แล้ว)`:`ข้อสอบเก่า (AC) ${esc(q.set)} ${esc(q.ro)} · ข้อ ${q.id} ในคลัง`}</span>`;
  if(q.unit){const Lc=W.byLec[q.unit]||{},n=uAtts(P,q.uid).length;h+=`<span class="tag">Unit round · ${esc(Lc.title||q.set)}${Lc.src?` · จาก ${esc(Lc.src)}`:""}</span><span class="tag">เจอข้อนี้มาแล้ว ${n} ครั้ง (รวมครั้งนี้)</span>`;}
  else if(q.lai)h+=`<span class="tag">Legendary round · โจทย์ใหม่ที่ AI สร้างสำหรับข้อสอบวันที่ ${fmtD(q.ts)}${q.topic?` · ${esc(q.topic)}`:""}</span>`;
  else if(q.spc)h+=`<span class="tag">Specialty round · โจทย์ที่ AI สร้างจากไฟล์ของวอร์ด${q.topic?` · ${esc(q.topic)}`:""}</span>`;
  else if(q.adm)h+=`<span class="tag">Admission round · เคสที่ AI สร้างใหม่${q.topic?` · ${esc(q.topic)}`:""}</span>`;
  if(q.adm){if(!q.spc)h+=`<span class="tag">ที่มาของเนื้อหา: ${q.srcRes?`ไฟล์ของวอร์ด — ${esc(q.srcRes)}`:"ความรู้ทั่วไป / ตำรา / guideline ภายนอก (ไม่ได้มาจากไฟล์ของวอร์ด)"}</span>`;}
  else if(q.unit){if(q.src)h+=`<span class="tag">ที่มา: ${esc(q.src)}</span>`;}
  else{const FN=CFG.files||{};const src=`${FN[q.file]||q.file} หน้า ${q.page}`+(q.kfile?` (โจทย์) + ${FN[q.kfile]||q.kfile}`+(q.page2?` หน้า ${q.page2}`:"")+" (เฉลย)":(q.page2?` + หน้า ${q.page2} (เฉลย)`:""));h+=`<span class="tag">ไฟล์ ${esc(src)} · ข้อ ${esc(q.orig)} ในต้นฉบับ</span>`;}
  if(q.guide)h+=`<div class="guide">📘 <b>อ้างอิง${q.adm||q.unit?"":" guideline"}:</b> ${q.adm?esc(q.guide):q.guide}</div>`;
  if(q.flag)h+=`<span class="tag warn">⚠ คีย์ไม่ชัวร์ / โจทย์ต้นฉบับไม่ครบ</span>`;
  h+=`</div>`;
  if(q.spc)h+=spcSrcBox(q);
  if(view==="lrev")h+=legPreHTML(legPaper(),q);else if(!q.adm)h+=seenHistHTML(q,curRK());
  if(q.key)h+=`<div class="tagline"><span class="tag">คีย์ในไฟล์: ${q.key}</span></div>`;
  if(isAIV())h+=`<div class="card" id="admWait" ${admWant?"":"hidden"}><h3>กำลังสร้างข้อต่อไป…</h3><span class="rd" style="margin:0">ประมาณ 20–60 วินาที เสร็จแล้วจะไปข้อต่อไปให้เอง</span><div class="spin" aria-hidden="true"></div></div>`;
  if(q.adm)h+=`<p class="hint" style="margin:4px 0 0">โจทย์และเฉลยข้อนี้ AI สร้างขึ้นใหม่ อาจผิดพลาดได้ ควรเทียบกับตำรา/guideline</p>`;
  if(adv)h+=advBox(q);
  {const gi=(q.gray||"").indexOf(" — ");if(gi>=0)h+=`<div class="tagline"><span class="tag">ส่วนที่เหลือของโจทย์ต้นฉบับ: ${esc(q.gray.slice(gi+3))}</span></div>`;}
  const sec=(t,b,cls="")=>b?`<div class="sec ${cls}"><h3>${t}</h3>${b}</div>`:"";
  const rich=s=>(s||"").replace(/\{\{IMG:(\w+)\}\}/g,(m,k)=>IMGS[k]?`<figure>${imgHTML(k,"ภาพจากไฟล์ต้นฉบับ")}<figcaption>จากไฟล์ต้นฉบับ</figcaption></figure>`:"");
  h+=sec("ตีความโจทย์",`<p>${R(q.interp)}</p>`);
  h+=sec(`ทำไม ${L[q.ans]} ถูก`,`<p>${R(q.why)}</p>`);
  const picked=adv?new Set(hist(P,q.uid,s.hp,true).map(x=>L[x[0]])):new Set();
  let w=`<ul class="wrong-list">`;Object.keys(q.wrong||{}).sort().forEach(k=>{w+=`<li${picked.has(k)?' class="picked"':""}><span class="l">${k}</span><span>${picked.has(k)?`<b class="youpick">คุณเคยเลือกข้อนี้</b> `:""}${R(q.wrong[k])}</span></li>`;});w+=`</ul>`;
  h+=sec("ทำไมข้ออื่นผิด",w);
  h+=sec("ระวังกับดัก",q.trap?`<div class="box">${R(q.trap)}</div>`:"","trap");
  h+=sec("สรุปความรู้จากข้อนี้",`<ul>${(q.summary||[]).map(s=>`<li>${R(s)}</li>`).join("")}</ul>`);
  h+=sec(q.unit?"สไลด์/ลายมือใน lecture เขียนไว้ว่า":"สิ่งที่เขียนไว้ในไฟล์",q.notes?`<div class="box">${rich(q.notes)}</div>`:"","notes");
  if(q.kimg){const KL=Array.isArray(q.kimg)?q.kimg:[q.kimg];h+=sec(q.unit?"สไลด์/รูปอ้างอิงจาก lecture":"สไลด์/รูปอ้างอิงจากไฟล์เฉลย",`<div class="kimg">${KL.map((k,i)=>{const im=imgHTML(k,q.unit?"สไลด์อ้างอิงจาก lecture":"สไลด์อ้างอิงจากไฟล์เฉลย",1);return q.kcap&&q.kcap[i]?`<figure class="kcap"><figcaption>${esc(q.kcap[i])}</figcaption>${im}</figure>`:im;}).join("")}</div>`);}
  h+=sec("ช่วยจำ",q.mnemonic?`<p>${q.mnemonic}</p>`:"");
  {const rs=resFor(q);if(rs.length)h+=sec("อ่านเพิ่มจาก resource ที่แนบไว้",rs.map(r=>`<div class="resitem"><b>${esc(resLabel(r))}</b>${r.url?` · <a href="${esc(r.url)}" target="_blank" rel="noopener">เปิด</a>`:""}${resPts(r,6).length?`<ul>${resPts(r,6).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:r.note?`<p>${esc(r.note)}</p>`:""}</div>`).join(""));}
  h+=sec("ความเห็นของผม",q.opinion?`<div class="box">${R(q.opinion)}</div>`:"","opinion");
  h+=sec("โจทย์แบบใหม่ที่อาจออก",`<ul>${(q.variants||[]).map(s=>`<li>${R(s)}</li>`).join("")}</ul>`);
  h+=`<div class="sec mine"><h3>สรุปของฉันจากข้อนี้</h3><p class="hint" style="margin:0 0 6px">เขียนสรุปด้วยคำของตัวเองช่วยให้จำได้นานกว่าอ่านผ่าน ๆ (บันทึกอัตโนมัติ)</p>${noteHTML("post",0,q)}</div>`;
  h+=`<div class="sec ask"><h3>ถาม Claude เพิ่มเติม</h3>
    <div class="qchips">${ASKQ.map((t,i)=>`<button class="chip" type="button" data-aq="${i}">${t}</button>`).join("")}</div>
    <textarea class="ntext" id="askTxt" placeholder="พิมพ์สิ่งที่อยากถามเกี่ยวกับข้อนี้ เช่น ทำไม C ถึงไม่ใช่คำตอบ"></textarea>
    <div class="row"><button class="btn primary" id="askGo" type="button">เปิดใน Claude ↗</button><span class="hint">เปิดในบัญชี Claude ของคุณเอง พร้อมโจทย์ เฉลย และคำถามนี้</span></div>
    <p class="hint" style="margin-top:6px">AI อาจผิดพลาดได้ ควรเทียบกับ guideline · ถ้า Claude ไม่ขึ้นข้อความ ให้กดวาง (คัดลอกไว้ให้แล้ว)</p></div>`;
  {const has=noteHas("pre",p,q.uid);h+=`<details class="pre" id="preBox" ${has?"open":""}><summary>${has?"✎ ที่ทดไว้ (ทดต่อได้)":"✎ ทด / จดเพิ่ม"}</summary>${noteHTML("pre",p,q)}</details>`;}   /* scratch notes stay open for writing after answering too */
  h+=`</section>`;
  return h;
}

/* ---------------- ask Claude ---------------- */
const ASKQ=["อธิบายแบบง่าย ๆ","ทำไมข้อที่ฉันตอบถึงผิด","สรุปเป็นตารางเปรียบเทียบ","ออกโจทย์แนวนี้ให้อีก 1 ข้อ"];
function askPrompt(q,done,ask,cut){
  const W=W_(),c=n=>s=>{s=plain(s);return s.length>n?s.slice(0,n)+"…":s;};
  const why=c(cut)(q.why),wr=Object.keys(q.wrong||{}).sort().map(k=>k+": "+c(Math.round(cut/4))(q.wrong[k])).join(" / ");
  return [
    `ช่วยอธิบายข้อสอบ MCQ ข้อนี้ให้ฉันหน่อย (ข้อสอบเก่า ${W.cfg.name}${W.cfg.sub?" "+W.cfg.sub:""} · ${q.set} ${q.ro})`,
    "",`โจทย์: ${plain(q.stem)}`,
    `ตัวเลือก: ${q.opts.map((o,i)=>L[i]+". "+plain(o)).join(" | ")}`,
    `เฉลยในคลัง: ${L[q.ans]}`+(done!==undefined?` · ฉันตอบ ${L[done]}${done===q.ans?" (ถูก)":" (ผิด)"}`:""),
    q.guide?`Guideline ที่คลังอ้าง: ${plain(q.guide)}`:"",
    `คำอธิบายในคลัง: ${why}`,
    wr?`ทำไมข้ออื่นผิด: ${wr}`:"",
    (()=>{const rs=resFor(q);if(!rs.length)return "";return "ข้อมูลจาก resource ที่ฉันแนบไว้ (ใช้ประกอบคำตอบได้ ถ้าขัดกับ guideline ให้บอก):\n"+rs.slice(0,3).map(r=>`- ${resLabel(r)}: ${c(Math.round(cut/2))(resPts(r).join(" · ")||r.note||"")}`).join("\n");})(),
    "",`คำถามของฉัน: ${ask||"ช่วยอธิบายเพิ่มให้เข้าใจลึกขึ้น"}`,
    "",`กติกา: ตอบภาษาไทยปนศัพท์แพทย์ภาษาอังกฤษ อธิบายให้เข้าใจง่าย อิงหลักฐานหรือ guideline ล่าสุดที่ระบุชื่อได้ (ถ้าค้นเว็บได้ให้ตรวจ guideline ล่าสุดก่อนตอบ) ถ้าไม่แน่ใจหรือหลักฐานยังไม่ชัดให้บอกตรง ๆ ห้ามแต่งตัวเลข แหล่งอ้างอิง หรือข้อมูลที่ไม่มีจริง ถ้าคิดว่าเฉลยในคลังอาจผิด ให้บอกพร้อมเหตุผล`
  ].filter(x=>x!=="").join("\n").replace(/\n\n+/g,"\n\n");
}
function bindAsk(q){
  const go_=$("askGo");if(!go_)return;const ta=$("askTxt");
  document.querySelectorAll("[data-aq]").forEach(b=>b.onclick=()=>{ta.value=ASKQ[+b.dataset.aq];ta.focus();});
  go_.onclick=()=>{
    const done=doneAns(q),ask=ta.value.trim();
    const full=askPrompt(q,done,ask,1200);
    let cut=700,pr=askPrompt(q,done,ask,cut),url="https://claude.ai/new?q="+encodeURIComponent(pr);
    while(url.length>7000&&cut>80){cut=Math.round(cut*0.7);pr=askPrompt(q,done,ask,cut);url="https://claude.ai/new?q="+encodeURIComponent(pr);}
    try{navigator.clipboard&&navigator.clipboard.writeText(full).catch(()=>{});}catch(e){}
    let w=null;try{w=window.open(url,"_blank","noopener");}catch(e){}if(!w&&!IN_FRAME)location.href=url;else if(!w)toast("คัดลอกคำถามไว้แล้ว — เปิด claude.ai แล้ววาง");
  };
}

/* ---------------- notes: typed + handwriting ---------------- */
const inkK=(kind,p,u)=>`${ward}|${kind==="pre"?"pre"+p:"post"}|${u}`;
const noteStore=(kind,p)=>kind==="pre"?P_().pre[p]:P_().post;
function noteHas(kind,p,u){const t=(noteStore(kind,p)[u]||{}).t,k=ink[inkK(kind,p,u)];return !!((t&&t.trim())||(k&&k.s&&k.s.length));}
function noteHTML(kind,p,q){
  const t=(noteStore(kind,p)[q.uid]||{}).t||"",ik=inkK(kind,p,q.uid),hasInk=!!(ink[ik]&&ink[ik].s&&ink[ik].s.length);
  const m=(hasInk&&!t)?"draw":(t?"type":(st.noteMode||"type"));
  return `<div class="note" data-kind="${kind}" data-ph="${p}" data-u="${esc(q.uid)}" data-m="${m}">
  <div class="ntabs"><button type="button" data-nm="type" aria-pressed="${m==="type"}" class="${t?"has":""}">⌨ พิมพ์</button><button type="button" data-nm="draw" aria-pressed="${m==="draw"}" class="${hasInk?"has":""}">✍ เขียน</button><span class="nsaved"></span></div>
  <textarea class="ntext" ${m==="draw"?"hidden":""} placeholder="${kind==="pre"?"ทดตรงนี้ เช่น ตัดช้อย คิด DDx คำนวณ":"ข้อนี้ได้เรียนรู้อะไร จะจำยังไง เชื่อมกับเคสบนวอร์ดยังไง"}">${esc(t)}</textarea>
  <div class="inkbox" ${m==="type"?"hidden":""}></div></div>`;
}
function mountNotes(root){
  root.querySelectorAll(".note").forEach(n=>{
    if(n.dataset.bound)return;
    if(n.closest("details")&&!n.closest("details").open)return;
    n.dataset.bound=1;
    const kind=n.dataset.kind,p=+n.dataset.ph,u=n.dataset.u,ta=n.querySelector(".ntext"),box=n.querySelector(".inkbox"),saved=n.querySelector(".nsaved");
    let t0=null;const fit=()=>{ta.style.height="auto";ta.style.height=Math.max(96,ta.scrollHeight+4)+"px";};
    ta.addEventListener("input",()=>{fit();saved.textContent="กำลังบันทึก…";clearTimeout(t0);t0=setTimeout(()=>{noteStore(kind,p)[u]={t:ta.value,ts:now()};save();saved.textContent="บันทึกแล้ว";n.querySelector('[data-nm="type"]').classList.toggle("has",!!ta.value.trim());},500);});
    if(!ta.hidden)fit();
    let pad=null;const ensure=()=>{if(!pad)pad=inkPad(box,inkK(kind,p,u),()=>{saved.textContent="บันทึกแล้ว";const k=ink[inkK(kind,p,u)];n.querySelector('[data-nm="draw"]').classList.toggle("has",!!(k&&k.s.length));});};
    if(!box.hidden)ensure();
    n.querySelectorAll("[data-nm]").forEach(b=>b.onclick=()=>{const m=b.dataset.nm;st.noteMode=m;persist();n.dataset.m=m;n.querySelectorAll("[data-nm]").forEach(x=>x.setAttribute("aria-pressed",x===b));ta.hidden=m!=="type";box.hidden=m!=="draw";if(m==="draw")ensure();else fit();});
  });
}
function cssVar(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||"#222";}
function inkPad(box,key,onSave){
  const COLORS={ink:()=>cssVar("--ink"),red:()=>cssVar("--wrong"),blue:()=>"#2F6BD8"};
  box.innerHTML=`<div class="inkbar"><button type="button" data-t="pen" aria-pressed="true">✏️ ปากกา</button><button type="button" data-t="erase" aria-pressed="false">⌫ ยางลบ</button>
    <button type="button" data-c="ink" aria-pressed="true" aria-label="สีดำ"><span class="dot" style="background:var(--ink)"></span></button><button type="button" data-c="red" aria-pressed="false" aria-label="สีแดง"><span class="dot" style="background:var(--wrong)"></span></button><button type="button" data-c="blue" aria-pressed="false" aria-label="สีน้ำเงิน"><span class="dot" style="background:#2F6BD8"></span></button>
    <span class="sep"></span><button type="button" data-a="undo">↶ ย้อน</button><button type="button" data-a="more">＋ พื้นที่</button><button type="button" data-a="clear">ล้าง</button></div><canvas class="ink" aria-label="พื้นที่เขียนด้วยนิ้วหรือปากกา"></canvas>`;
  const cv=box.querySelector("canvas"),ctx=cv.getContext("2d");
  let d=ink[key]?JSON.parse(JSON.stringify(ink[key])):{s:[],h:330};if(!d.h)d.h=330;
  let tool="pen",color="ink",cur=null,hist=[],penSeen=false,Wd=0;
  const H=()=>Math.max(200,Math.round(d.h*Wd/1000));
  function size(){Wd=cv.clientWidth||600;const r=window.devicePixelRatio||1;cv.style.height=H()+"px";cv.width=Math.round(Wd*r);cv.height=Math.round(H()*r);ctx.setTransform(r,0,0,r,0,0);draw();}
  function line(s){const k=Wd/1000;ctx.strokeStyle=(COLORS[s.c]||COLORS.ink)();ctx.lineWidth=Math.max(1,s.w*k);ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();const p=s.p;ctx.moveTo(p[0]*k,p[1]*k);if(p.length===2)ctx.lineTo(p[0]*k+0.1,p[1]*k);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i]*k,p[i+1]*k);ctx.stroke();}
  function draw(){ctx.clearRect(0,0,Wd,H());d.s.forEach(line);if(cur)line(cur);}
  const pt=e=>{const r=cv.getBoundingClientRect();return [Math.round((e.clientX-r.left)*1000/Wd),Math.round((e.clientY-r.top)*1000/Wd)];};
  const snap=()=>{hist.push(JSON.stringify(d.s));if(hist.length>40)hist.shift();};
  function commit(){ink[key]={s:d.s,h:d.h,ts:now()};saveInk(key);onSave&&onSave();}
  function eraseAt(x,y){const r=18;const n0=d.s.length;d.s=d.s.filter(s=>{for(let i=0;i<s.p.length;i+=2){if(Math.abs(s.p[i]-x)<r&&Math.abs(s.p[i+1]-y)<r)return false;}return true;});return n0!==d.s.length;}
  let erased=false;
  cv.addEventListener("pointerdown",e=>{if(e.pointerType==="pen")penSeen=true;if(e.pointerType==="touch"&&penSeen)return;if(e.button>0)return;e.preventDefault();cv.setPointerCapture(e.pointerId);const [x,y]=pt(e);
    if(tool==="erase"){snap();erased=eraseAt(x,y);if(erased)draw();cur={erase:1};return;}
    snap();cur={c:color,w:e.pointerType==="pen"?2.6:3.2,p:[x,y]};draw();});
  cv.addEventListener("pointermove",e=>{if(!cur)return;if(e.pointerType==="touch"&&penSeen)return;e.preventDefault();const evs=e.getCoalescedEvents?e.getCoalescedEvents():[e];
    if(cur.erase){evs.forEach(ev=>{const [x,y]=pt(ev);if(eraseAt(x,y))erased=true;});draw();return;}
    evs.forEach(ev=>{const [x,y]=pt(ev);const p=cur.p,lx=p[p.length-2],ly=p[p.length-1];if(Math.abs(x-lx)+Math.abs(y-ly)>=2)p.push(x,y);});draw();});
  const end=()=>{if(!cur)return;if(cur.erase){if(erased)commit();else hist.pop();}else{d.s.push(cur);commit();}cur=null;erased=false;draw();};
  cv.addEventListener("pointerup",end);cv.addEventListener("pointercancel",end);cv.addEventListener("lostpointercapture",end);
  box.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{tool=b.dataset.t;box.querySelectorAll("[data-t]").forEach(x=>x.setAttribute("aria-pressed",x===b));});
  box.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{color=b.dataset.c;tool="pen";box.querySelectorAll("[data-c]").forEach(x=>x.setAttribute("aria-pressed",x===b));box.querySelectorAll("[data-t]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.t==="pen"));});
  box.querySelector('[data-a="undo"]').onclick=()=>{if(!hist.length)return;d.s=JSON.parse(hist.pop());draw();commit();};
  box.querySelector('[data-a="more"]').onclick=()=>{d.h+=200;size();commit();};
  box.querySelector('[data-a="clear"]').onclick=async()=>{if(!d.s.length||!await uiAsk("ล้างที่เขียนไว้ทั้งหมดในช่องนี้?"))return;snap();d.s=[];d.h=330;size();commit();};
  if(window.ResizeObserver){let lw=0;new ResizeObserver(()=>{if(cv.clientWidth&&cv.clientWidth!==lw){lw=cv.clientWidth;size();}}).observe(cv);}
  size();
  return {size};
}

/* ---------------- Unit round ---------------- */
function rUnit(){
  const W=W_(),P=P_(),Ls=W.UNIT;
  let h=`<h1 class="h2">Unit round</h1><p class="sub">โจทย์ใหม่แบบ case-based ที่สร้างจาก lecture แต่ละบท ครอบคลุมทุกจุดในสไลด์ เก็บไว้ในคลังแล้ว ทำได้ทั้งในเว็บและใน Claude ไม่ต้องสร้างใหม่ · สุ่มใหม่ทุกครั้งที่เริ่ม (เจอข้อซ้ำได้) ใช้ร่วมกันทั้งสอง Phase</p>`;
  if(!Ls.length){h+=`<div class="card"><h3>ยังไม่มีโจทย์ Unit round ในวอร์ดนี้</h3><span class="rd" style="margin:0">ส่งไฟล์ lecture ให้ Claude แล้วจะสร้างโจทย์ case-based ภาษาอังกฤษให้บทละประมาณ 200 ข้อ ครอบคลุมทุกเรื่องในสไลด์</span></div>`;$("main").innerHTML=h;return;}
  const opts=[10,20,40];let n=opts.includes(st.unitN)?st.unitN:10;
  h+=`<div class="yh" style="font-family:var(--num);font-weight:700;margin-bottom:6px">สุ่มครั้งละ</div><div class="chips">${opts.map(x=>`<button class="chip" data-un="${x}" aria-pressed="${x===n}">${x} ข้อ</button>`).join("")}</div>`;
  const all=[].concat(...Ls.map(Lc=>Lc.QB)),seen=a=>a.filter(q=>uAtts(P,q.uid).length).length;
  const sel=new Set((st.unitSel||[]).filter(id=>W.byLec[id]));
  h+=`<div class="yh" style="font-family:var(--num);font-weight:700;margin:14px 0 6px">บท <span class="hint" style="font-weight:400">เลือกได้หลายบท · ไม่เลือกเลย = สุ่มรวมทุกบท · ตัวเลข = เคยเจอแล้ว/ทั้งหมด</span></div>`;
  h+=`<div class="stack" style="margin-top:0">`+Ls.map(Lc=>`<button class="resume qprog" data-lec="${esc(Lc.id)}" aria-pressed="${sel.has(Lc.id)}"><span><b>${esc(Lc.title)}</b><span class="rd">${Lc.QB.length?`เคยเจอแล้ว ${seen(Lc.QB)}/${Lc.QB.length} ข้อ`:"ยังไม่มีโจทย์ — มีแค่หัวข้อบทไว้ก่อน"}</span></span><span class="go">${sel.has(Lc.id)?"✓":""}</span></button>`).join("")+`</div>`;
  const pool=sel.size?[].concat(...Ls.filter(Lc=>sel.has(Lc.id)).map(Lc=>Lc.QB)):all;
  h+=`<p class="statline" style="margin-top:10px">${sel.size?`จาก ${sel.size} บทที่เลือก`:"สุ่มรวมทุกบท"} · มีโจทย์ ${pool.length} ข้อ (เคยเจอแล้ว ${seen(pool)})</p><div class="row2"><button class="btn ghost" id="uClr" type="button" ${sel.size?"":"disabled"}>ล้างที่เลือก</button><span class="spacer"></span><button class="btn primary" id="uGo" type="button" ${pool.length?"":"disabled"}>เริ่มทำ ${Math.min(n,pool.length)} ข้อ</button></div>`;
  $("main").innerHTML=h;
  document.querySelectorAll("[data-un]").forEach(b=>b.onclick=()=>{st.unitN=+b.dataset.un;persist();rUnit();});
  document.querySelectorAll("[data-lec]").forEach(b=>b.onclick=()=>{const id=b.dataset.lec;if(sel.has(id))sel.delete(id);else sel.add(id);st.unitSel=[...sel];persist();rUnit();});
  $("uClr").onclick=()=>{st.unitSel=[];persist();rUnit();};
  $("uGo").onclick=()=>{const t=sel.size===1?W.byLec[[...sel][0]].title:sel.size?sel.size+" บท":"ทุกบท";startSess("unit","Unit round · "+t,shuffle(pool).slice(0,n).map(q=>q.uid));};
}

/* ---------------- sounds: synthesized with Web Audio (no files) ---------------- */
const SOUNDS=[["ding","ding"],["ding2","ding x2"],["ring","ring"],["triple","triple ring"],["alarm","alarm"],["bell","large bell"],["none","ไม่มีเสียง"]];
const SND={ctx:null,
  init(){try{if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;this.ctx=new C();}if(this.ctx.state==="suspended")this.ctx.resume();}catch(e){return null;}return this.ctx;},
  play(k,vol){if(!k||k==="none")return;const c=this.init();if(!c)return;const g=c.createGain();g.gain.value=vol==null?qpS().vol:vol;g.connect(c.destination);sndRender(k,c,g,c.currentTime+0.03);}};
function sndTone(c,d,f,t,dur,type,peak,atk){const o=c.createOscillator(),g=c.createGain();o.type=type||"sine";o.frequency.value=f;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+(atk||0.006));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(d);o.start(t);o.stop(t+dur+0.05);}
/* the four sounds below are re-synthesized from measurements of reference recordings (partial frequencies, levels, decay times, rhythm) — no audio files are copied */
function sndPart(c,d,f,t,a,tau,L){   /* one sine partial: 3 ms attack, exponential decay (time constant tau), faded out at t+L */
  const o=c.createOscillator(),g=c.createGain();o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+.003);g.gain.setTargetAtTime(0,t+.003,tau);
  g.gain.setValueAtTime(a*Math.exp(-(L-.003)/tau),t+L);g.gain.linearRampToValueAtTime(0,t+L+.03);o.connect(g);g.connect(d);o.start(t);o.stop(t+L+.05);}
function sndDing(c,d,t){   /* bright metallic ding, ~0.8 s: high partials die fast, 3.4 k / 1.26 k linger */
  [[1257,.017,1.3],[3397,.035,.5],[6287,.3,.145],[9834,.2,.067],[13977,.13,.012]].forEach(([f,a,u])=>sndPart(c,d,f,t,a,u,.78));}
function sndRing(c,d,t,len){   /* electric bell: high bright partials, clapper ~12 strikes a second */
  const m=c.createGain();m.gain.setValueAtTime(0,t);m.connect(d);
  [[1097,.008],[1900,.024],[2899,.012],[4922,.014],[5200,.072],[7974,.06],[8780,.11],[11219,.056],[14888,.045]].forEach(([f,a])=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=f;g.gain.value=a;o.connect(g);g.connect(m);o.start(t);o.stop(t+len+.4);});
  for(let x=0;x<len;x+=1/12){m.gain.setValueAtTime(1,t+x);m.gain.setTargetAtTime(.72,t+x+.004,.02);}
  m.gain.setValueAtTime(.85,t+len);m.gain.setTargetAtTime(.0001,t+len,.03);}
function sndBell(c,d,t){       /* "bell" = meditation ding: singing-bowl tone ~2 s, shimmer from close partial pairs */
  [[567,.06,3],[578,.06,3],[1587,.08,.7],[1605,.07,.7],[3047,.2,.32],[4867,.04,.087]].forEach(([f,a,u])=>sndPart(c,d,f,t,a,u,2));}
const ALM={f0:51.1,loud:{6:.7,12:.32,13:.65,18:.1,19:.43,24:.28,25:.54,28:.16,30:.06,31:.2,34:.53,36:.08,40:.33,42:.07,45:.17,46:.33,51:.07,52:.24,58:.21},
  soft:{6:1,12:.06,13:.06,19:.27,28:.13,34:.12}};
function almWave(c,k){c.__alm=c.__alm||{};if(!c.__alm[k]){const n=64,re=new Float32Array(n),im=new Float32Array(n);for(const h in ALM[k])im[h]=ALM[k][h];c.__alm[k]=c.createPeriodicWave(re,im);}return c.__alm[k];}
function sndAlarm(c,d,t,n){    /* clock alarm: low buzzy "แอด" 0.33 s (307 Hz family on a 51 Hz grid) + quieter echo 0.32 s, every 0.65 s */
  [["loud",.33,0,.33],["soft",.05,.33,.65]].forEach(([k,a,s0,s1])=>{const o=c.createOscillator(),g=c.createGain();o.setPeriodicWave(almWave(c,k));o.frequency.value=ALM.f0;g.gain.setValueAtTime(0,t);
    for(let p=0;p<n;p++){const s=t+p*.65;g.gain.setValueAtTime(0,s+s0);g.gain.linearRampToValueAtTime(a,s+s0+.004);g.gain.setValueAtTime(a,s+s1-.006);g.gain.linearRampToValueAtTime(0,s+s1);}
    o.connect(g);g.connect(d);o.start(t);o.stop(t+n*.65+.05);});}
function sndRender(k,c,d,t){switch(k){
  case"ding":sndDing(c,d,t);break;case"ding2":sndDing(c,d,t);sndDing(c,d,t+.3);break;
  case"ring":sndRing(c,d,t,1);break;case"triple":sndRing(c,d,t,.3);sndRing(c,d,t+.55,.3);sndRing(c,d,t+1.1,1.9);break;
  case"alarm":sndAlarm(c,d,t,3);break;
  case"bell":sndBell(c,d,t);break;}}
window.__snd={render:sndRender};   /* used by tools/smoke_site.py to check loudness offline */

/* ---------------- Quality round: timed speedrun of never-done questions ---------------- */
const KINDS=[["q","ตอบคำถาม"],["rest","พัก / เปลี่ยนข้อ"],["sol","อ่านเฉลย"],["ready","เตรียมพร้อม"],["free","อื่น ๆ"]];
const QPRESET=[
  {id:"p1",name:"Speedrun AC",warm:{sec:5,sound:"bell"},loops:15,end:"triple",blocks:[
    {name:"Cycle A",rep:4,phases:[{name:"QT",sec:18,sound:"ding2",kind:"q"},{name:"Resting",sec:2,sound:"ding",kind:"rest"}]},
    {name:"Cycle B",rep:1,phases:[{name:"Solution",sec:35,sound:"ring",kind:"sol"},{name:"Ready",sec:5,sound:"ding",kind:"ready"}]}]},
  {id:"p2",name:"Supersonic run AC",warm:{sec:5,sound:"bell"},loops:80,end:"triple",blocks:[
    {name:"Cycle A",rep:1,phases:[{name:"Intense",sec:13,sound:"ding2",kind:"q"},{name:"Resting",sec:2,sound:"ding",kind:"rest"}]}]}];
const clone=o=>JSON.parse(JSON.stringify(o));
function qpS(){const q=st.qp||(st.qp={});q.custom=q.custom||[];q.over=q.over||{};if(!q.sel)q.sel="p1";if(q.vol==null)q.vol=0.8;q.mand=!!q.mand;return q;}
const qProgs=()=>{const q=qpS();return QPRESET.map(p=>Object.assign(clone(q.over[p.id]||p),{id:p.id,builtin:1})).concat(q.custom.map(clone));};
const qProg=id=>qProgs().find(p=>p.id===id)||qProgs()[0];
const mmss=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");};
const nz=(v,m)=>Math.max(m,parseInt(v,10)||m);
const qLen=pg=>{const c=pg.blocks.reduce((a,b)=>a+nz(b.rep,1)*b.phases.reduce((x,f)=>x+nz(f.sec,1),0),0);return {cycle:c,total:c*nz(pg.loops,1)};};
function qDesc(pg){const L=qLen(pg),w=pg.warm&&+pg.warm.sec>0?+pg.warm.sec:0;
  return esc(pg.blocks.map(b=>`${b.name}${nz(b.rep,1)>1?" ×"+nz(b.rep,1):""}: ${b.phases.map(f=>f.name+" "+nz(f.sec,1)+"s").join(" → ")}`).join(" · "))+` · วน ${nz(pg.loops,1)} รอบ = <b>${mmss(L.total)}</b>${w?` (+ warm up ${w} วิ)`:""}`;}
function qSegs(pg){const S=[];let t=0;const add=o=>{o.t0=t;t+=nz(o.sec,1);o.t1=t;S.push(o);};
  if(pg.warm&&+pg.warm.sec>0)add({name:"Warm up",sec:+pg.warm.sec,sound:pg.warm.sound,kind:"warm"});
  for(let l=1;l<=nz(pg.loops,1)&&S.length<20000;l++)pg.blocks.forEach((b,bi)=>{for(let r=1;r<=nz(b.rep,1);r++)b.phases.forEach(f=>add({name:f.name,sec:f.sec,sound:f.sound,kind:f.kind||"free",bi,bname:b.name,rep:r,reps:nz(b.rep,1),loop:l}));});
  return {S,total:t};}
let QR=null;   /* running timer: {pg,mand,S,total,el0,t0,paused,i,front,done,alarm,ward} */
const qOn=()=>!!(QR&&!QR.done&&QR.ward===ward&&P_().sess&&P_().sess.kind==="quality");
const qEl=()=>QR.paused?QR.el0:QR.el0+(performance.now()-QR.t0)/1000;
const qSeg=()=>QR&&QR.i>=0?QR.S[QR.i]:null;
/* mandatory mode: questions change by themselves; only while reading solutions can you page back through questions already done */
function qLock(){if(!qOn()||!QR.mand)return false;const g=qSeg();return !g||(g.kind!=="sol"&&g.kind!=="free");}
/* Morning round: questions open one at a time in order — can go back to answered ones, but not past the first unanswered question */
const mFront=s=>{const i=s.list.findIndex(u=>s.ans[u]===undefined);return i<0?s.list.length:i;};
const mLocked=i=>{if(view!=="sess")return false;const s=P_().sess;return !!(s&&s.kind==="morning"&&i>mFront(s));};
const navMsg=()=>{const s=view==="sess"&&P_().sess;return s&&s.kind==="morning"?"ตอบข้อนี้ก่อน ถึงจะไปข้อถัดไปได้":"ตอนนี้ยังเปลี่ยนข้อไม่ได้ (โหมด mandatory)";};
const mLastOpen=()=>{const s=view==="sess"&&P_().sess;return !!(s&&s.kind==="morning"&&s.ans[s.list[s.cur]]===undefined);};
function qNavOK(i){if(mLocked(i))return false;if(!qOn()||!QR.mand)return true;const g=qSeg();if(!g)return false;if(g.kind==="sol"||g.kind==="free")return i<QR.front;return i===QR.front;}
function qStart(pg,mand){qStop();SND.init();const {S,total}=qSegs(pg);
  QR={pg,mand,S,total,el0:0,t0:performance.now(),paused:false,i:-1,front:0,done:false,alarm:false,ward};
  const s=P_().sess;if(s){const i=s.list.findIndex(u=>s.ans[u]===undefined);QR.front=i<0?s.list.length:i;}
  QR.iv=setInterval(qTick,200);qTick();}
function qStop(){if(QR){clearInterval(QR.iv);QR=null;}paintQR();}
function qTick(){if(!QR)return;if(QR.paused||QR.done){paintQR();return;}
  const el=qEl();
  if(el>=QR.total){if(QR.i>=0)qEnd(QR.S[QR.i]);qFinish("หมดเวลา "+QR.pg.name);return;}
  let i=QR.i;
  while(QR&&!QR.done&&i+1<QR.S.length&&QR.S[i+1].t0<=el){if(i>=0)qEnd(QR.S[i]);if(!QR||QR.done)break;i++;QR.i=i;qBegin(QR.S[i],!(i+1<QR.S.length&&QR.S[i+1].t0<=el));}
  paintQR();if(view==="sess")paintNav();}
function qBegin(g,audible){let snd=g.sound;if(QR.alarm){QR.alarm=false;if(g.kind!=="q")snd="alarm";}
  if(audible)SND.play(snd);
  if(QR.mand&&g.kind==="q")qGoFront();}
function qEnd(g){if(!QR.mand||QR.ward!==ward)return;const s=P_().sess;if(!s||s.kind!=="quality")return;
  if(g.kind==="q"){const u=s.list[QR.front];if(u&&s.ans[u]===undefined){
      if(view==="sess"&&s.cur===QR.front&&pick!==null)confirmAns();
      else{s.ans[u]=-1;s.ts=now();save();QR.alarm=true;if(view==="sess"&&s.cur===QR.front)rQuiz();}}}
  else if(g.kind==="rest"){QR.front++;if(QR.front>=s.list.length)qFinish("ทำครบทุกข้อในรอบนี้แล้ว");}}
function qGoFront(){const s=P_().sess;if(!s||QR.front>=s.list.length)return;if(s.cur!==QR.front){s.cur=QR.front;s.ts=now();save();if(view==="sess"){pick=null;rQuiz();window.scrollTo(0,0);}}}
function qFinish(msg){if(!QR||QR.done)return;QR.done=true;clearInterval(QR.iv);SND.play(QR.pg.end||"triple");toast(msg);paintQR();if(view==="sess")paintNav();}
function qPause(){if(!QR||QR.done)return;if(QR.paused){QR.t0=performance.now();QR.paused=false;SND.init();}else{QR.el0=qEl();QR.paused=true;}paintQR();if(view==="sess")paintNav();}
async function qReset(){if(!QR)return;if(!await uiAsk("เริ่มจับเวลาใหม่ตั้งแต่ต้น (รวม warm up)? ข้อที่ตอบไปแล้วยังเก็บไว้"))return;qStart(QR.pg,QR.mand);if(QR.front>=P_().sess.list.length)qFinish("ทำครบทุกข้อในรอบนี้แล้ว");}
function paintQR(){const b=$("qbar");if(!b)return;
  const on=!!(QR&&ward&&QR.ward===ward&&view==="sess"&&P_().sess&&P_().sess.kind==="quality");
  b.hidden=!on;document.body.classList.toggle("qon",on);if(!on)return;
  const g=qSeg(),el=qEl();let ph="",t="",meta="";
  if(QR.done){ph="จบแล้ว";t="0:00";meta=QR.pg.name;}
  else if(g){ph=g.name;t=mmss(g.t1-el);const w0=QR.S[0].kind==="warm"?QR.S[0].t1:0;
    meta=g.kind==="warm"?`${QR.pg.name} · warm up`:`${g.bname} ${g.rep}/${g.reps} · รอบ ${g.loop}/${nz(QR.pg.loops,1)} · เหลือ ${mmss(QR.total-Math.max(el,w0))}`;}
  $("qbPh").textContent=ph+(QR.paused?" · หยุดอยู่":"");$("qbT").textContent=t;$("qbMeta").textContent=meta+(QR.mand?" · mandatory":"");
  $("qbPause").textContent=QR.paused?"▶ ต่อ":"⏸ พัก";$("qbPause").disabled=QR.done;b.dataset.k=QR.done?"done":g?g.kind:"";
  const v=$("qbVol");if(document.activeElement!==v)v.value=qpS().vol;}
$("qbPause").onclick=qPause;$("qbReset").onclick=qReset;
$("qbStop").onclick=async()=>{if(QR&&!QR.done&&!await uiAsk("หยุดจับเวลาและจบรอบนี้?"))return;qStop();go(ward+"/result");};
$("qbVol").oninput=e=>{qpS().vol=+e.target.value;persist();};
$("qbVol").onchange=()=>{save();SND.play("ding");};

function rQuality(){
  const W=W_(),P=P_(),p=ph(),q=qpS(),PG=qProgs();
  if(q.mode!=="sets")q.mode="all";q.sets=(q.sets||[]).filter(k=>W.sets.includes(k));
  const base=q.mode==="sets"?W.QB.filter(x=>!q.sets.length||q.sets.includes(setKey(x))):W.QB,pool=q.fresh?base.filter(x=>!atts(P,p,x.uid).length):base;
  if(!PG.some(x=>x.id===q.sel))q.sel=PG[0].id;
  let h=`<h1 class="h2">Quality round</h1><p class="sub">Speedrun ข้อสอบเก่า จับเวลาเป็นเซตแบบ OSCE · เลือกชุดจับเวลา แล้วเลือกว่าจะทำปีไหน หรือสุ่มจากทั้งคลัง</p>`;
  if(QR&&!QR.done&&QR.ward===ward)h+=`<button class="resume" id="qBack"><span>กำลังจับเวลา: <b>${esc(QR.pg.name)}</b><span class="rd">กลับไปทำต่อ</span></span><span class="go">→</span></button>`;
  h+=`<div class="yh" style="font-family:var(--num);font-weight:700;margin:14px 0 6px">ชุดจับเวลา</div><div class="stack" style="margin-top:0">`+PG.map(pg=>`<button class="resume qprog" data-pg="${esc(pg.id)}" aria-pressed="${pg.id===q.sel}"><span><b>${esc(pg.name)}</b>${pg.builtin?' <span class="tag">preset</span>':''}<span class="rd">${qDesc(pg)}</span></span><span class="go">${pg.id===q.sel?"✓":""}</span></button>`).join("")+`</div>`;
  {const chips=(id,list,cur)=>`<div class="chips" id="${id}">${list.map(([v,t])=>`<button class="chip" data-v="${esc(v)}" aria-pressed="${String(v)===String(cur)}">${t}</button>`).join("")}</div>`;
    h+=`<div class="yh" style="font-family:var(--num);font-weight:700;margin:14px 0 6px">ข้อสอบที่จะทำ</div>${chips("qMode",[["all","สุ่มจากข้อสอบเก่าทั้งหมด"],["sets","เลือกปีที่จะทำ"]],q.mode)}`;
    h+=`<p class="hint" style="margin:6px 0 0">${q.mode==="all"?"สุ่มลำดับจากข้อสอบเก่าทุกปีในคลัง ไม่ว่าเคยทำแล้วหรือยัง":"เหมือน Service round แต่จับเวลา — เรียงข้อตามชุดที่เลือก ไม่เลือกเลย = ทุกชุด · ตัวเลข = ทำแล้ว/ทั้งหมด ใน Phase "+p}</p>`;
    if(q.mode==="sets"){const sel=new Set(q.sets),years=[...new Set(W.QB.map(x=>x.set))];
      h+=years.map(y=>{const ks=W.sets.filter(k=>k.split(" ")[0]===y);return `<div class="yr"><div class="yh">${esc(y)}</div><div class="chips">${ks.map(k=>{const qs=W.QB.filter(x=>setKey(x)===k),d=qs.filter(x=>atts(P,p,x.uid).length).length;return `<button class="chip" data-qk="${esc(k)}" aria-pressed="${sel.has(k)}">${esc(k.split(" ").slice(1).join(" ").trim()||"ทั้งชุด")}<span class="c">${d}/${qs.length}</span></button>`;}).join("")}</div></div>`;}).join("");}
    h+=`<label class="chk"><input type="checkbox" id="qFresh" ${q.fresh?"checked":""}><span>เฉพาะข้อที่ยังไม่เคยทำใน Phase ${p}</span></label>`;
    h+=`<p class="statline" style="margin-top:10px">รอบนี้มี <b>${pool.length}</b> ข้อ</p>`;}
  h+=`<label class="chk"><input type="checkbox" id="qMand" ${q.mand?"checked":""}><span><b>Mandatory</b> — หมดเวลาแล้วเปลี่ยนหน้าจอให้อัตโนมัติ: หมดเวลาตอบ = ส่งคำตอบที่เลือกไว้ (ไม่ได้เลือก = ข้าม + เสียง alarm) · จบช่วงพัก = ไปข้อต่อไป · ช่วงอ่านเฉลยเลื่อนดูข้อที่ทำไปแล้วได้</span></label>`;
  h+=`<div class="card"><h3>เสียง</h3><div class="qrow"><span>🔊</span><input type="range" id="qVol" min="0" max="1" step="0.05" value="${q.vol}" style="flex:1"></div><div class="chips" style="margin-top:8px">${SOUNDS.filter(x=>x[0]!=="none").map(([k,t])=>`<button class="chip" data-snd="${k}">▶ ${t}</button>`).join("")}</div></div>`;
  h+=`<div class="row2"><button class="btn" id="qEdit">แก้ไขชุดนี้</button><button class="btn" id="qNew">สร้างชุดใหม่</button><span class="spacer"></span><button class="btn primary" id="qGo">Start</button></div>`;
  $("main").innerHTML=h;
  const qb=$("qBack");if(qb)qb.onclick=()=>go(ward+"/sess");
  document.querySelectorAll("[data-pg]").forEach(b=>b.onclick=()=>{q.sel=b.dataset.pg;save();rQuality();});
  $("qMand").onchange=e=>{q.mand=e.target.checked;save();};
  document.querySelectorAll("#qMode [data-v]").forEach(b=>b.onclick=()=>{q.mode=b.dataset.v;save();rQuality();});
  document.querySelectorAll("[data-qk]").forEach(b=>b.onclick=()=>{const k=b.dataset.qk,c=new Set(q.sets);if(c.has(k))c.delete(k);else c.add(k);q.sets=W.sets.filter(x=>c.has(x));save();rQuality();});
  $("qFresh").onchange=e=>{q.fresh=e.target.checked;save();rQuality();};
  $("qVol").oninput=e=>{q.vol=+e.target.value;persist();};$("qVol").onchange=()=>save();
  document.querySelectorAll("[data-snd]").forEach(b=>b.onclick=()=>SND.play(b.dataset.snd));
  $("qEdit").onclick=()=>{QED=clone(qProg(q.sel));go(ward+"/qedit");};
  $("qNew").onclick=()=>{QED={name:"ชุดใหม่",warm:{sec:5,sound:"bell"},loops:10,end:"triple",blocks:[{name:"เซต 1",rep:1,phases:[{name:"ตอบคำถาม",sec:30,sound:"ding2",kind:"q"},{name:"พัก",sec:5,sound:"ding",kind:"rest"}]}]};go(ward+"/qedit");};
  $("qGo").onclick=()=>{if(!pool.length){toast(q.fresh?"ไม่มีข้อที่ยังไม่เคยทำในชุดที่เลือก":"ไม่มีข้อในชุดที่เลือก");return;}const pg=qProg(q.sel);
    const nm=q.mode==="sets"&&q.sets.length?" · "+q.sets.join(", "):"";
    startSess("quality","Quality round · "+pg.name+nm,(q.mode==="sets"?pool:shuffle(pool)).map(x=>x.uid));qStart(pg,q.mand);if(view==="sess")rQuiz();};
}
let QED=null;   /* timer set being edited */
function rQEdit(){
  if(!QED)QED=clone(qProg(qpS().sel));const e=QED;if(!e.warm)e.warm={sec:0,sound:"bell"};
  const sel=(v,list,a)=>`<select class="field-in sel" ${a}>${list.map(([k,t])=>`<option value="${k}" ${k===v?"selected":""}>${t}</option>`).join("")}</select>`;
  const ix=(bi,pi)=>`data-b="${bi}"${pi==null?"":` data-p="${pi}"`}`;
  let h=`<h1 class="h2">${e.id?"แก้ไขชุดจับเวลา":"สร้างชุดจับเวลาใหม่"}</h1><p class="sub">ตั้งชื่อ ตั้งเวลา เรียงลำดับ เพิ่ม/ลบได้ทั้งหมด · กด ▶ เพื่อฟังเสียง</p>`;
  h+=`<label class="fl">ชื่อชุด<input class="field-in" data-f="name" value="${esc(e.name)}"></label>`;
  h+=`<div class="card qe"><h3>Warm up</h3><span class="rd">นับครั้งเดียวหลังกด Start ไม่นับรวมในเวลาทั้งหมด (0 = ไม่มี)</span><div class="qrow"><input class="field-in num" type="number" min="0" inputmode="numeric" data-f="warm.sec" value="${+e.warm.sec||0}"><span>วิ</span>${sel(e.warm.sound,SOUNDS,'data-f="warm.sound"')}<button class="chip" data-play="warm">▶</button></div></div>`;
  e.blocks.forEach((b,bi)=>{
    h+=`<div class="card qe"><div class="qrow"><input class="field-in" data-f="b.name" ${ix(bi)} value="${esc(b.name)}" aria-label="ชื่อเซต"><span>วน</span><input class="field-in num" type="number" min="1" inputmode="numeric" data-f="b.rep" ${ix(bi)} value="${nz(b.rep,1)}"><span>รอบ</span></div>
      <div class="qrow end"><button class="chip" data-a="bup" ${ix(bi)} ${bi?"":"disabled"}>↑</button><button class="chip" data-a="bdn" ${ix(bi)} ${bi<e.blocks.length-1?"":"disabled"}>↓</button><button class="chip" data-a="bdel" ${ix(bi)}>ลบเซตนี้</button></div>`;
    b.phases.forEach((f,pi)=>{h+=`<div class="qphase"><div class="qrow"><input class="field-in" data-f="p.name" ${ix(bi,pi)} value="${esc(f.name)}" aria-label="ชื่อ phase"><input class="field-in num" type="number" min="1" inputmode="numeric" data-f="p.sec" ${ix(bi,pi)} value="${nz(f.sec,1)}"><span>วิ</span></div>
      <div class="qrow">${sel(f.sound,SOUNDS,`data-f="p.sound" ${ix(bi,pi)}`)}<button class="chip" data-play="${bi}.${pi}">▶</button>${sel(f.kind||"free",KINDS,`data-f="p.kind" ${ix(bi,pi)}`)}</div>
      <div class="qrow end"><button class="chip" data-a="pup" ${ix(bi,pi)} ${pi?"":"disabled"}>↑</button><button class="chip" data-a="pdn" ${ix(bi,pi)} ${pi<b.phases.length-1?"":"disabled"}>↓</button><button class="chip" data-a="pdel" ${ix(bi,pi)}>ลบ</button></div></div>`;});
    h+=`<button class="linkbtn" data-a="padd" ${ix(bi)}>+ เพิ่ม phase</button></div>`;});
  h+=`<button class="btn" data-a="badd" style="margin-top:12px">+ เพิ่มเซต</button>`;
  h+=`<div class="card qe"><div class="qrow"><span>วนทุกเซตทั้งหมด</span><input class="field-in num" type="number" min="1" inputmode="numeric" data-f="loops" value="${nz(e.loops,1)}"><span>รอบ</span></div><div class="qrow"><span>เสียงตอนจบ</span>${sel(e.end||"triple",SOUNDS,'data-f="end"')}<button class="chip" data-play="end">▶</button></div><p class="rd" id="qeSum" style="margin:8px 0 0"></p></div>`;
  h+=`<p class="hint">ประเภทของ phase ใช้กับโหมด mandatory — <b>ตอบคำถาม</b>: หมดเวลาแล้วส่งคำตอบ/ข้ามให้ · <b>พัก / เปลี่ยนข้อ</b>: จบแล้วไปข้อต่อไป · <b>อ่านเฉลย</b>: เลื่อนดูข้อที่ทำไปแล้วได้ · <b>เตรียมพร้อม</b>: จบแล้วกลับไปข้อที่ยังไม่ได้ทำ</p>`;
  h+=`<div class="stack">${e.id?`<button class="btn primary" data-a="save">บันทึก</button>`:""}<button class="btn ${e.id?"":"primary"}" data-a="saveas">บันทึกเป็น preset ใหม่</button>${e.builtin&&qpS().over[e.id]?`<button class="btn ghost" data-a="restore">คืนค่าเดิมของ preset นี้</button>`:""}${e.id&&!e.builtin?`<button class="btn ghost" data-a="del">ลบชุดนี้</button>`:""}<button class="btn ghost" data-a="cancel">ยกเลิก</button></div>`;
  $("main").innerHTML=h;qeSum();
  const tgt=el=>{const bi=el.dataset.b==null?null:+el.dataset.b,pi=el.dataset.p==null?null:+el.dataset.p;return {b:bi==null?null:e.blocks[bi],f:pi==null?null:e.blocks[bi].phases[pi],bi,pi};};
  document.querySelectorAll("#main [data-f]").forEach(el=>{const h2=()=>{const k=el.dataset.f,v=el.value,{b,f}=tgt(el);
      if(k==="name")e.name=v;else if(k==="warm.sec")e.warm.sec=Math.max(0,parseInt(v,10)||0);else if(k==="warm.sound")e.warm.sound=v;else if(k==="loops")e.loops=nz(v,1);else if(k==="end")e.end=v;
      else if(k==="b.name")b.name=v;else if(k==="b.rep")b.rep=nz(v,1);else if(k==="p.name")f.name=v;else if(k==="p.sec")f.sec=nz(v,1);else if(k==="p.sound")f.sound=v;else if(k==="p.kind")f.kind=v;qeSum();};
    el.addEventListener("input",h2);el.addEventListener("change",h2);});
  document.querySelectorAll("#main [data-play]").forEach(el=>el.onclick=()=>{const k=el.dataset.play;SND.play(k==="warm"?e.warm.sound:k==="end"?e.end:(()=>{const [bi,pi]=k.split(".").map(Number);return e.blocks[bi].phases[pi].sound;})());});
  const sw=(a,i,j)=>{if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];};
  document.querySelectorAll("#main [data-a]").forEach(el=>el.onclick=async()=>{const a=el.dataset.a,{b,bi,pi}=tgt(el),q=qpS();
    if(a==="bup")sw(e.blocks,bi,bi-1);else if(a==="bdn")sw(e.blocks,bi,bi+1);else if(a==="bdel"){if(e.blocks.length<2){toast("ต้องมีอย่างน้อย 1 เซต");return;}e.blocks.splice(bi,1);}
    else if(a==="pup")sw(b.phases,pi,pi-1);else if(a==="pdn")sw(b.phases,pi,pi+1);else if(a==="pdel"){if(b.phases.length<2){toast("เซตต้องมีอย่างน้อย 1 phase");return;}b.phases.splice(pi,1);}
    else if(a==="padd")b.phases.push({name:"Phase "+(b.phases.length+1),sec:10,sound:"ding",kind:"free"});
    else if(a==="badd")e.blocks.push({name:"เซต "+(e.blocks.length+1),rep:1,phases:[{name:"ตอบคำถาม",sec:20,sound:"ding2",kind:"q"},{name:"พัก",sec:5,sound:"ding",kind:"rest"}]});
    else if(a==="cancel"){QED=null;go(ward+"/quality");return;}
    else if(a==="save"||a==="saveas"||a==="restore"||a==="del"){
      const out=clone(e);delete out.builtin;if(!out.name.trim())out.name="ไม่มีชื่อ";
      if(qSegs(out).S.length>=20000){toast("ชุดนี้ยาวเกินไป ลดจำนวนรอบลง");return;}
      if(a==="save"){if(e.builtin)q.over[e.id]=out;else q.custom=q.custom.map(x=>x.id===e.id?out:x);q.sel=e.id;}
      else if(a==="saveas"){const nm=await uiInput("ตั้งชื่อ preset ใหม่",e.id?e.name+" (ของฉัน)":e.name);if(!nm)return;out.name=nm.trim()||out.name;out.id="c"+now().toString(36);q.custom.push(out);q.sel=out.id;}
      else if(a==="restore"){if(!await uiAsk("คืนค่า preset นี้เป็นแบบเดิม?"))return;delete q.over[e.id];q.sel=e.id;}
      else if(a==="del"){if(!await uiAsk(`ลบชุด "${e.name}"?`))return;q.custom=q.custom.filter(x=>x.id!==e.id);q.sel="p1";}
      QED=null;save();toast("บันทึกแล้ว");go(ward+"/quality");return;}
    rQEdit();});
}
function qeSum(){const el=$("qeSum");if(!el||!QED)return;el.innerHTML=qDesc(QED);}

/* ---------------- Admission round: a new AI-written case each time ---------------- */
/* link into the Claude version of this site at a given page — the page is in both the query (?go=) and the hash, since the host may pass only one of them into the frame */
const artLink=path=>CFG.artifactUrl?CFG.artifactUrl+"?go="+encodeURIComponent(path)+"#/"+path:"";
const AIKEY=KEY+"-ai";                 /* {key, model}: kept only in this browser, never synced */
const aiCfg=()=>ld(AIKEY)||{};
let admBusy=false,admErr="",admSetup=false,admWant=false;
async function aiMode(){if(HAS_CLAUDE()){try{return (await window.claude.use("sample"))?"claude":"";}catch(e){return "";}}return aiCfg().key?"key":"";}
const yrN=()=>{const m=/(\d+)/.exec(wYear());return m?+m[1]:0;};
const ord=n=>n+(n===1?"st":n===2?"nd":n===3?"rd":"th");
let admSrc=null;
function admPrompt(W,m){const w=W.cfg,A=PWof(st,w.id)[m||"adm"],pos=Math.floor(Math.random()*5),y=yrN(),yr=y?ord(y)+"-year":"clinical-year",spc=m==="spc";admSrc=spc?spcPick(w.id):pickSrcAdm(W);if(spc&&!admSrc)throw {code:"spc_empty"};
  return `Write ONE brand-new multiple-choice question for a past-exam practice website used by ${yr} medical students at ${INST.en}, Thailand, during their ${w.name.replace(/\s*Y\d+$/,"")} rotation.

Scope (stay inside it): ${w.scope||w.name}.
Level: what a ${yr} medical student is expected to know and use in real clinical practice. ${spc?"Content: ONLY from the source below (see the strict rule after the question rules).":"Content may come from any reliable source (standard textbooks, current international or Thai guidelines)."} The case may be invented or typical of real practice, common or uncommon.

Question rules:
- Case-based only: the stem MUST present a patient case (age, sex, presentation, relevant history, examination and test results as needed). Ask anything about the case: diagnosis, initial management, definitive treatment, most important or next investigation, pathophysiology, etiology, mechanism of disease or of a drug, pertinent findings, complications, prognosis, and so on.
- Stem and all options in formal English, like a real exam. No hints in the stem: no diagnosis or interpretation in parentheses after lab values, no naming the sign or disease the student must work out, no normal ranges unless essential.
- Exactly 5 options with one single best answer. Options are parallel in style and similar in length; the correct option must not be longer or more specific than the others. No parentheses, no " / ", no "e.g.", no "all of the above" or "none of the above".
- Put the correct answer at position ${"ABCDE"[pos]} (index ${pos}).
- It may be straightforward or contain a plausible trap.
${spc?spcPrompt(admSrc,A):`- Use a different topic from these recent ones: ${(A.recent||[]).slice(-15).join("; ")||"none"}.
${srcPrompt(admSrc)}`}
Explanation: write it for Thai medical students, in Thai mixed with English medical terms, concise but complete. You may use <b>…</b> for emphasis, no other HTML.

Reply with only a JSON object with exactly these keys:
{"topic": "short English topic label",
 "tags": ["1–4 broad chapter-level subjects this case belongs to, chosen ONLY from: ${broadOf(W).join("; ")} — never a diagnosis name"],
 "stem": "the case and question",
 "opts": ["A text","B text","C text","D text","E text"],
 "ans": ${pos},
 "interp": "what the case shows and what is being asked (Thai)",
 "why": "why the answer is correct, with the key facts, criteria or numbers (Thai)",
 "wrong": {"<letter>": "why this option is wrong here and when it would be right (Thai)"} for each of the 4 other letters,
 "trap": "the common trap (Thai), or empty string",
 "summary": ["4–7 Thai bullet points of high-yield knowledge on this topic, each complete on its own"],
 "guide": "guideline or textbook (with year) the answer is based on, or empty string if it is general knowledge",
 "mnemonic": "short memory aid, or empty string",
 "variants": ["2–3 Thai bullets: other ways this topic could be asked"]${spc?`,
 "point": "the one key fact this question tests, short English, at most 15 words",
 "quote": "the part(s) of the source that give the answer, copied or closely condensed in the source's own language, at most 70 words",
 "conflict": "Thai: if the source disagrees with the newest guideline or textbook, say what differs and which you followed; else empty string"`:""}}`;}
const san=s=>esc(String(s==null?"":s)).replace(/&lt;(\/?)(b|i|br)\s*\/?&gt;/gi,"<$1$2>");
function admCheck(o,m){
  if(!o||typeof o!=="object")throw {code:"bad"};const opts=Array.isArray(o.opts)?o.opts.map(x=>String(x).trim()):[];const ans=+o.ans;
  if(opts.length!==5||opts.some(x=>!x)||!o.stem||!(ans>=0&&ans<5))throw {code:"bad"};
  const W0=o.wrong||{},wrong={};let j=0;for(let i=0;i<5;i++){if(i===ans)continue;const k=L[i];wrong[k]=san(Array.isArray(W0)?W0[j]:(W0[k]||W0[k.toLowerCase()]||""));j++;}
  const ts=now(),arr=x=>(Array.isArray(x)?x:[]).map(san).filter(Boolean);
  return {adm:1,...(m==="spc"?{spc:1}:{}),uid:(m==="spc"?"SPC|":"ADM|")+ts.toString(36),set:"Case",ro:wYear(),topic:String(o.topic||"").slice(0,80),tags:cleanTags(W_(),o.tags,(o.topic||"")+" "+(o.stem||"")),stem:san(o.stem),opts,ans,interp:san(o.interp),why:san(o.why),wrong,trap:san(o.trap),summary:arr(o.summary),guide:String(o.guide||"").slice(0,300),mnemonic:san(o.mnemonic),variants:arr(o.variants),ts};}
/* one AI call that must answer with a JSON object — through Claude (inside Claude) or the viewer's own API key */
async function aiJSON(pr,maxTok){
  const mode=await aiMode();if(!mode)throw {code:"no_ai"};
  if(mode==="claude"){const smp=await window.claude.use("sample");return await smp.json(pr,{modelTier:"default",cache:false});}
  const c=aiCfg();let r;
  try{r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":c.key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:c.model||"claude-sonnet-5-5",max_tokens:maxTok||4096,messages:[{role:"user",content:pr}]})});}
  catch(e){throw {code:"network"};}
  const j=await r.json().catch(()=>null);if(!r.ok)throw {code:"api",status:r.status,message:j&&j.error&&j.error.message||""};
  const t=((j&&j.content)||[]).filter(x=>x.type==="text").map(x=>x.text).join(""),a=t.indexOf("{"),b=t.lastIndexOf("}");
  if(a<0||b<a)throw {code:"invalid_json"};try{return JSON.parse(t.slice(a,b+1));}catch(e){throw {code:"invalid_json"};}}
async function admGen(W,m){const pr=admPrompt(W,m),src=admSrc,o=await aiJSON(pr,4096),q=admCheck(o,m);if(m==="spc")spcStamp(q,o,src,W.cfg.id);else if(src)q.srcRes=resLabel(src);return q;}
function admMsg(e){const c=e&&e.code;
  if(c==="no_ai")return "";
  if(c==="spc_empty")return "ยังไม่ได้เลือกเรื่อง / ไฟล์ หรือไฟล์ที่เลือกไม่มีเนื้อหา";
  if(c==="api")return e.status===401?"API key ไม่ถูกต้อง — ตรวจ key แล้วบันทึกใหม่":e.status===404?"ไม่พบโมเดลนี้ — ตรวจชื่อโมเดลในการตั้งค่า":e.status===429?"เรียกใช้ถี่เกินไปหรือเครดิตหมด ลองใหม่ภายหลัง":e.status===529||e.status>=500?"เซิร์ฟเวอร์ AI ไม่ว่างชั่วคราว ลองใหม่อีกครั้ง":"สร้างโจทย์ไม่สำเร็จ ("+e.status+(e.message?": "+e.message:"")+")";
  return ({network:"เชื่อมต่อ AI ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่",not_granted:"ยังไม่ได้อนุญาตให้หน้านี้ใช้ Claude — เปิดหน้านี้ใหม่แล้วกดอนุญาต",sampling_disabled:"บัญชีนี้ใช้ Claude จากหน้านี้ไม่ได้",rate_limited:"ใช้ Claude ถี่เกินไปหรือครบโควตาแล้ว ลองใหม่ภายหลัง",session_expired:"ต้องเข้าสู่ระบบ Claude ใหม่",invalid_json:"AI ตอบกลับมาในรูปแบบที่อ่านไม่ได้ ลองใหม่อีกครั้ง",bad:"โจทย์ที่ได้ไม่ครบ ลองใหม่อีกครั้ง",refused:"AI ไม่ยอมสร้างโจทย์ข้อนี้ ลองใหม่อีกครั้ง",cancelled:"ยกเลิกแล้ว"})[c]||"สร้างโจทย์ไม่สำเร็จ ลองใหม่อีกครั้ง";}
async function admRun(target){
  if(admBusy)return;admBusy=true;admErr="";const wid=ward,m=AM,here=()=>isAIV()&&AM===m&&ward===wid;if(here())(AS().cur?paintNav():rAdm());
  try{const q=await admGen(WARDS[wid],m);const A=PWof(st,wid)[m];if(target==="cur"||!A.cur){A.cur=q;A.ans=null;admBank(wid,q,null);}else A.next=q;A.ts=now();save();}
  catch(e){console.warn(m,e);admErr=admMsg(e);if(e&&e.code==="no_ai")admSetup=true;}
  admBusy=false;if(here()){const A=AS();if(A.cur&&A.ans!=null){if(admWant&&A.next){admWant=false;admNext();return;}admWant=false;paintNav();const e=$("admWait");if(e)e.hidden=true;if(admErr)toast(admErr+" — กด ข้อต่อไป เพื่อลองใหม่");}else rAdm();}else admWant=false;}
/* header "กระดาษคำตอบ a/n" on the Admission / Specialty pages that are not a question (setup, waiting): answered / all in this round's bank */
function aiCount(){const B=bankItems(AM,ward),c=$("count");if(c)c.textContent=`${B.filter(x=>x.a!=null).length}/${B.length}`;$("prog").style.width="0";}
function admBank(wid,q,a){const k=(q.spc?"spc|":"adm|")+wid+"|"+q.uid,o=bank[k],v={q,a,c:o&&o.c};if(o&&o.h)v.h=o.h;if(o&&o.sent)v.sent=o.sent;bankPut(k,v);}
function admAnswer(i){const A=AS();if(!A.cur||A.ans!=null)return;A.ans=i;A.n=(A.n||0)+1;if(i===A.cur.ans)A.right=(A.right||0)+1;admBank(ward,A.cur,i);if(A.cur.spc)spcScore(A,A.cur,i);
  A.recent=(A.recent||[]).concat(A.cur.topic||[]).slice(-25);A.ts=now();save();rQuiz();
  const e=document.querySelector(".exp");if(e)setTimeout(()=>e.scrollIntoView({behavior:"smooth",block:"start"}),60);
  if(!A.next)admRun("next");}
function admNext(){const A=AS();if(A.ans==null)return;
  if(A.next){A.cur=A.next;A.next=null;A.ans=null;A.ts=now();admBank(ward,A.cur,null);save();pick=null;rAdm();window.scrollTo(0,0);}
  else if(admBusy){admWant=true;toast("กำลังสร้างข้อต่อไป — เสร็จแล้วจะไปให้เอง");paintNav();const e=$("admWait");if(e)e.hidden=false;}
  else{A.cur=null;A.ans=null;admErr="";save();rAdm();}}
function rAdm(){
  if(AM==="spc"&&!AS().on)return rSpc();
  const W=W_(),A=AS(),SP=AM==="spc";
  if(!admSetup&&A.cur&&A.ans!=null&&A.next){A.cur=A.next;A.next=null;A.ans=null;A.ts=now();admBank(ward,A.cur,null);save();}   /* came back after answering → the next case */
  if(A.cur&&!bank[AM+"|"+ward+"|"+A.cur.uid])admBank(ward,A.cur,A.ans);   /* cases made before the bank existed */
  if(!admSetup&&A.cur){$("nav").hidden=false;pick=null;rQuiz();if(!HAS_CLAUDE()){const sb=document.querySelector(".sessbar");if(sb)sb.insertAdjacentHTML("beforeend",` · <button class="linkbtn" id="admSet" style="font-size:13px;padding:0">ตั้งค่า AI</button>`);const b=$("admSet");if(b)b.onclick=()=>{admSetup=true;rAdm();};}return;}
  $("nav").hidden=true;aiCount();
  let h=SP?`<h1 class="h2">Specialty round</h1><p class="sub">โจทย์ใหม่ที่ AI สร้างทีละข้อ จากไฟล์ของวอร์ดที่เลือกไว้เท่านั้น (${esc(spcSelTxt())}) · <button class="linkbtn" id="spcBack" style="padding:0">เปลี่ยนเรื่อง</button></p>`:`<h1 class="h2">Admission round</h1><p class="sub">เคสใหม่ที่ AI สร้างขึ้นทีละข้อ เนื้อหา ${esc(W.cfg.name)} เหมาะกับนิสิตแพทย์${yearTxt()} — ข้อเดิมจะอยู่จนกว่าจะตอบ ตอบแล้วสร้างข้อใหม่ให้ทันที · ทุกเคสเก็บไว้ในคลังของคุณ ดูย้อนหลังได้จากกระดาษคำตอบ</p>`;
  if(admBusy){h+=`<div class="card"><h3>กำลังสร้างเคสใหม่…</h3><span class="rd" style="margin:0">ใช้เวลาประมาณ 10–60 วินาที</span><div class="spin" aria-hidden="true"></div></div>`;$("main").innerHTML=h;return;}
  {const B=bankItems(AM,ward);if(B.length){const d=B.filter(x=>x.a!=null),r=d.filter(x=>x.a===x.q.ans);h+=`<div class="card"><h3>คลัง ${SP?"Specialty":"Admission"} ของฉัน</h3><span class="rd">เคสที่ AI เคยสร้างให้ ${B.length} ข้อ · ตอบแล้ว ${d.length} · ถูก ${r.length} — เปิดดูโจทย์และเฉลยเก่าได้ตลอด แม้ตอนสร้างข้อใหม่ไม่ได้</span><button class="btn" id="admBankBtn">📋 เปิดกระดาษคำตอบ</button></div>`;}}
  if(!HAS_CLAUDE()&&fb&&fb.user&&sync==="error")h+=`<p class="hint" style="color:var(--wrong)">⚠ บันทึกขึ้นบัญชีไม่สำเร็จ — ตรวจ Firestore rules หรืออินเทอร์เน็ต</p>`;
  h+=sharedAdmCard(AM)+ufaBtn("ufaAdm");
  h+=`<div id="admBox"><p class="hint">กำลังตรวจการเชื่อมต่อ AI…</p></div>`;$("main").innerHTML=h;{const bb=$("admBankBtn");if(bb)bb.onclick=openS;}{const sb=$("spcBack");if(sb)sb.onclick=spcEndRun;}bindSharedAdm(AM);bindUfa();
  aiMode().then(mode=>{const box=$("admBox");if(!box||!isAIV())return;
    if(mode&&!admSetup&&!admErr){admRun("cur");return;}
    let x="";
    if(admErr)x+=`<div class="card"><h3>สร้างโจทย์ไม่สำเร็จ</h3><span class="rd">${esc(admErr)}</span>${mode?`<button class="btn primary" id="admRetry">ลองใหม่</button>`:""}</div>`;
    if(HAS_CLAUDE()){if(!mode)x+=`<div class="card"><h3>ใช้ Claude จากหน้านี้ไม่ได้</h3><span class="rd" style="margin:0">ล็อกอิน Claude แล้วเปิดหน้านี้ใหม่ แล้วกดอนุญาตเมื่อหน้านี้ขอใช้ Claude (ใช้โควตาบัญชีของคุณเอง)</span></div>`;}
    else{const c=aiCfg();
      x+=`<div class="card"><h3>เชื่อม AI สำหรับ ${AMN()}</h3><span class="rd">เว็บนี้ไม่มี AI ในตัว เลือกได้ 2 ทาง</span>
        ${CFG.artifactUrl?`<a class="btn primary" style="display:block;text-align:center;text-decoration:none;margin-bottom:12px" href="${esc(artLink(ward+"/"+(SP?"spc":"adm")))}" target="_blank" rel="noopener">เปิด ${AMN()} ใน Claude ↗ (ฟรี ใช้บัญชี Claude)</a><span class="rd">ความคืบหน้าในเว็บกับใน Claude แยกกัน ย้ายได้ด้วยปุ่ม "ส่งลิงก์ความคืบหน้า" (คลังเคส Admission / Long case ย้ายด้วย "ไฟล์สำรอง")</span>`:""}
        <div class="or">หรือใส่ Anthropic API key ของตัวเอง</div>
        <input class="field-in" id="aiKey" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" value="${esc(c.key||"")}">
        <input class="field-in" id="aiModel" type="text" autocapitalize="none" spellcheck="false" placeholder="โมเดล (เว้นว่าง = claude-sonnet-5-5)" value="${esc(c.model||"")}" style="margin-top:8px">
        <span class="rd" style="margin-top:6px">key เก็บไว้ในเบราว์เซอร์นี้เท่านั้น (ไม่ซิงก์ ไม่ส่งไปที่อื่นนอกจาก api.anthropic.com) · คิดเงินตามการใช้งานจากบัญชี API ของคุณ ราว ๆ ไม่ถึง 1 บาทต่อข้อ</span>
        <div class="row2" style="margin-top:6px"><button class="btn primary" id="aiSave">บันทึกแล้วเริ่ม</button>${c.key?`<button class="btn ghost" id="aiDel">ลบ key</button>`:""}${A.cur?`<button class="btn ghost" id="aiBack">กลับไปข้อเดิม</button>`:""}</div></div>`;}
    box.innerHTML=x;
    const rt=$("admRetry");if(rt)rt.onclick=()=>{admErr="";admSetup=false;rAdm();};
    const sv=$("aiSave");if(sv)sv.onclick=()=>{const k=$("aiKey").value.trim(),m=$("aiModel").value.trim();if(!/^sk-/.test(k)){toast("key ควรขึ้นต้นด้วย sk-");return;}try{localStorage.setItem(AIKEY,JSON.stringify({key:k,model:m}));}catch(e){}admErr="";admSetup=false;rAdm();};
    const dl=$("aiDel");if(dl)dl.onclick=()=>{try{localStorage.removeItem(AIKEY);}catch(e){}admSetup=true;rAdm();};
    const bk=$("aiBack");if(bk)bk.onclick=()=>{admSetup=false;rAdm();};
  });
}

/* ---------------- Advisor round: read the answers of questions already done (no answering) + personalised advice + topic report ---------------- */
const isAdv=()=>view==="sess"&&!!P_().sess&&P_().sess.kind==="advisor";
const advS=()=>{const a=st.adv||(st.adv={});a.sets=a.sets||[];a.f=a.f||"all";a.ord=a.ord||"bank";if(a.n==null)a.n=0;a.hp=a.hp==="p"?"p":"all";a.undone=!!a.undone;return a;};
const hPh=hp=>hp==="p"?[ph()]:[1,2];
/* answer history of one question [[ans, ts, phase]…] oldest first · raw = include attempts made before a reset */
function hist(P,u,hp,raw){const f=raw?rawAtts:atts;let o=[];hPh(hp).forEach(p=>{o=o.concat(f(P,p,u).map(x=>[x[0],x[1],p]));});return o.sort((x,y)=>x[1]-y[1]);}
const nWrong=(h,q)=>h.filter(x=>x[0]!==q.ans).length;
const topicOf=(W,q)=>(W.TOPIC&&W.TOPIC[q.set+"|"+q.ro+"|"+q.orig])||q.topic||"Others";
const ADVF=[["all","ทุกข้อที่ทำแล้ว"],["w1","ผิด ≥ 1 ครั้ง"],["w2","ผิด ≥ 2 ครั้ง"],["w3","ผิด ≥ 3 ครั้ง"],["last","ล่าสุดยังผิด"],["fixed","เคยผิด แต่ล่าสุดถูก"],["clean","ถูกทุกครั้ง"]];
const ADVO=[["bank","ตามลำดับในคลัง"],["wrong","ผิดบ่อยสุดก่อน"],["topic","จัดตามหัวข้อ"],["rand","สุ่ม"]];
function advPass(f,q,h){const w=nWrong(h,q),l=h[h.length-1];
  switch(f){case"w1":return w>=1;case"w2":return w>=2;case"w3":return w>=3;case"last":return l[0]!==q.ans;case"fixed":return w>=1&&l[0]===q.ans;case"clean":return w===0;default:return true;}}
function advPool(a){const W=W_(),P=P_(),sel=a.sets.filter(k=>W.sets.includes(k)),out=[];
  W.QB.forEach(q=>{if(sel.length&&!sel.includes(setKey(q)))return;const h=hist(P,q.uid,a.hp);if(h.length?advPass(a.f,q,h):a.undone)out.push([q,h]);});return out;}
function advList(a){const W=W_();let l=advPool(a);
  if(a.ord==="rand")l=shuffle(l);
  else if(a.ord==="wrong")l=l.slice().sort((x,y)=>nWrong(y[1],y[0])-nWrong(x[1],x[0])||(y[1].length?1:0)-(x[1].length?1:0)||x[0].id-y[0].id);
  else if(a.ord==="topic")l=l.slice().sort((x,y)=>topicOf(W,x[0]).localeCompare(topicOf(W,y[0]))||x[0].id-y[0].id);
  if(a.n)l=l.slice(0,a.n);return l.map(x=>x[0].uid);}
function rAdvisor(){
  const W=W_(),P=P_(),QB=W.QB,a=advS();
  if(!QB.length){$("main").innerHTML=`<div class="empty">ยังไม่มีข้อสอบในคลัง</div>`;return;}
  const sel=new Set(a.sets.filter(k=>W.sets.includes(k))),years=[...new Set(QB.map(q=>q.set))];
  const chips=(id,list,cur)=>`<div class="chips" id="${id}">${list.map(([v,t])=>`<button class="chip" data-v="${esc(v)}" aria-pressed="${String(v)===String(cur)}">${t}</button>`).join("")}</div>`;
  let h=`<h1 class="h2">Advisor round</h1><p class="sub">อ่านเฉลยข้อที่เคยทำแล้วแบบเร็ว ๆ ไม่ต้องตอบ ทุกข้อมีคำแนะนำเฉพาะช้อยที่คุณเคยเลือก และกดรีเซ็ตให้ข้อไหนกลับเป็นข้อที่ยังไม่ทำได้ เผื่ออยากทำใหม่</p>`;
  h+=`<button class="resume" id="advRep"><span>📊 <b>รายงานจาก Advisor</b><span class="rd">ผิดเรื่องไหนมากสุด · เรื่องไหนสำคัญ ควรอ่านเพิ่ม · แบ่งตามหัวข้อบทเรียน</span></span><span class="go">→</span></button>`;
  h+=`<div class="lbl">ใช้ประวัติการตอบจาก</div>${chips("aHp",[["all","ทั้ง 2 Phase"],["p",`เฉพาะ Phase ${ph()}`]],a.hp)}`;
  h+=`<div class="lbl">ปีและ rotation <span class="hint">ไม่เลือกเลย = ทุกชุด · ตัวเลข = ทำแล้ว/ทั้งหมด</span></div>`;
  h+=years.map(y=>{const ks=W.sets.filter(k=>k.split(" ")[0]===y);return `<div class="yr"><div class="yh">${esc(y)}</div><div class="chips">${ks.map(k=>{const qs=QB.filter(q=>setKey(q)===k),d=qs.filter(q=>hist(P,q.uid,a.hp).length).length;return `<button class="chip" data-k="${esc(k)}" aria-pressed="${sel.has(k)}">${esc(k.split(" ").slice(1).join(" ").trim()||"ทั้งชุด")}<span class="c">${d}/${qs.length}</span></button>`;}).join("")}</div></div>`;}).join("");
  h+=`<div class="lbl">เลือกจากจำนวนครั้งที่ผิด</div>${chips("aF",ADVF,a.f)}`;
  h+=`<label class="chk" style="display:flex;gap:8px;align-items:center;margin-top:12px;font-size:15px"><input type="checkbox" id="aUndone" ${a.undone?"checked":""} style="width:20px;height:20px"> รวมข้อที่ยังไม่เคยทำด้วย</label>`;
  h+=`<div class="lbl">ลำดับ</div>${chips("aO",ADVO,a.ord)}`;
  h+=`<div class="lbl">จำนวนข้อ</div>${chips("aN",[[10,"10 ข้อ"],[20,"20 ข้อ"],[40,"40 ข้อ"],[0,"ทั้งหมด"]],a.n)}`;
  const pool=advPool(a),n=a.n?Math.min(a.n,pool.length):pool.length;
  h+=`<p class="statline" style="margin-top:14px">${pool.length?`จะได้อ่านเฉลย <b>${n}</b> ข้อ${n<pool.length?` (จาก ${pool.length} ข้อที่เข้าเงื่อนไข)`:""}`:Object.keys(P.att[1]).length+Object.keys(P.att[2]).length?"ไม่มีข้อที่เข้าเงื่อนไขนี้":"ยังไม่เคยทำข้อไหนเลย — ติ๊ก “รวมข้อที่ยังไม่เคยทำด้วย” เพื่ออ่านเฉลยข้อใหม่ได้"}</p>`;
  h+=`<div class="row2"><span class="spacer"></span><button class="btn primary" id="aGo" ${pool.length?"":"disabled"}>เริ่มอ่านเฉลย</button></div>`;
  $("main").innerHTML=h;
  const re=()=>{persist();rAdvisor();};
  $("advRep").onclick=()=>go(ward+"/report");
  [["aHp","hp"],["aF","f"],["aO","ord"],["aN","n"]].forEach(([id,k])=>document.querySelectorAll(`#${id} [data-v]`).forEach(b=>b.onclick=()=>{a[k]=k==="n"?+b.dataset.v:b.dataset.v;re();}));
  document.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(sel.has(k))sel.delete(k);else sel.add(k);a.sets=W.sets.filter(x=>sel.has(x));re();});
  $("aUndone").onchange=e=>{a.undone=e.target.checked;re();};
  $("aGo").onclick=()=>{const l=advList(a);if(!l.length){toast("ไม่มีข้อที่เข้าเงื่อนไข");return;}save();startSess("advisor","Advisor round",l,{hp:a.hp});};
}
/* reset = this question counts as not done again (Service sheet, Grand "ยังไม่เคยทำ", Quality, Ward staff, Morning) — the answer history is kept for advice and the report */
const advIsReset=(P,q,hp)=>hist(P,q.uid,hp,true).length>0&&!hist(P,q.uid,hp).length;
function advResetBtn(q){const P=P_(),s=P.sess;if(!hist(P,q.uid,s.hp,true).length)return "";
  return advIsReset(P,q,s.hp)?`<span class="tag">รีเซ็ตแล้ว — นับเป็นข้อที่ยังไม่ทำ</span><button class="link redo" id="advUnreset" type="button">ยกเลิกรีเซ็ต</button>`:`<button class="link redo" id="advReset" type="button">รีเซ็ตให้เป็นข้อที่ยังไม่ทำ</button>`;}
const fmtD=t=>{const d=new Date(t);return d.getDate()+"/"+(d.getMonth()+1)+"/"+String(d.getFullYear()).slice(2);};
function advBox(q){
  const W=W_(),P=P_(),s=P.sess,R=W.R,h=hist(P,q.uid,s.hp,true),w=nWrong(h,q),last=h[h.length-1],tp=topicOf(W,q);
  const cnt={};h.forEach(x=>{if(x[0]!==q.ans)cnt[x[0]]=(cnt[x[0]]||0)+1;});
  const wl=Object.keys(cnt).map(Number).sort((x,y)=>cnt[y]-cnt[x]||x-y);const outs=cnt[-1]||0,picks=wl.filter(x=>x>=0);
  const tq=W.QB.filter(x=>topicOf(W,x)===tp),tlw=tq.filter(x=>{const g=hist(P,x.uid,s.hp,true);return g.length&&g[g.length-1][0]!==x.ans;}).length;
  const tips=[];
  if(!h.length)tips.push("ยังไม่เคยทำข้อนี้ — ลองคิดคำตอบในใจก่อนอ่านเหตุผล จะจำได้ดีกว่าอ่านผ่าน ๆ (อ่านแล้วข้อนี้ยังนับเป็นข้อที่ยังไม่ทำ)");
  else if(!w)tips.push(`ตอบถูกทุกครั้ง (${h.length} ครั้ง) — ข้อนี้เข้าใจแล้ว อ่านแค่ “สรุปความรู้” ทวนก็พอ`+(flagged(P,q.uid)?" แต่ยังติด ⚑ ไม่มั่นใจไว้ อ่าน “ทำไม "+L[q.ans]+" ถูก” ให้ชัดว่าถูกเพราะอะไร ไม่ใช่เดาถูก":""));
  else if(last[0]===q.ans)tips.push(`เคยผิด ${w} ครั้ง แล้วตอบถูกในครั้งล่าสุด — ดีขึ้นแล้ว แต่ข้อที่เคยพลาดมักพลาดซ้ำได้ ทวนจุดที่เคยสับสนด้านล่างอีกรอบ`);
  else{const same=picks.length===1&&cnt[picks[0]]>=2;
    if(same)tips.push(`เลือก ${L[picks[0]]} ซ้ำ ${cnt[picks[0]]} ครั้ง — แปลว่ามีความเข้าใจที่คลาดเคลื่อนเรื่องนี้ ไม่ใช่แค่เดาผิด อ่านเหตุผลว่าทำไม ${L[picks[0]]} ไม่ใช่คำตอบ แล้วเทียบกับ ${L[q.ans]}`);
    else if(picks.length>1)tips.push(`ตอบไม่ซ้ำกันเลย (${picks.map(x=>L[x]).join(", ")}) — น่าจะยังไม่มีหลักในการตัดสินข้อนี้ เริ่มจาก “ตีความโจทย์” แล้วจับกฎใน “ทำไม ${L[q.ans]} ถูก” ให้ได้ก่อน`);
    else if(picks.length)tips.push(`ล่าสุดตอบ ${L[picks[0]]} ซึ่งยังผิด — ดูด้านล่างว่าช้อยนี้ผิดเพราะอะไร และต่างจาก ${L[q.ans]} ตรงไหน`);}
  if(outs)tips.push(`หมดเวลา/ไม่ได้ตอบ ${outs} ครั้ง — ฝึกจับ keyword ในโจทย์ให้เร็วขึ้น ดูใน “ตีความโจทย์”`);
  if(q.flag)tips.push(`ข้อนี้มี ⚠ ${esc(plain(q.flag).replace(/^⚠\s*/,""))}`);
  if(q.opinion&&/⚠/.test(q.opinion))tips.push("คำตอบในคลังข้อนี้ต่างจากคีย์ในไฟล์ หรือยังมีข้อถกเถียง — อ่าน “ความเห็นของผม” ประกอบก่อนจำ");
  let x=`<div class="sec adv"><h3>🧭 คำแนะนำสำหรับคุณ</h3>`;
  if(h.length)x+=`<div class="hrow"><span class="hint">ประวัติการตอบ</span>${h.map(a=>`<span class="hb ${a[0]===q.ans?"ok":"no"}" title="Phase ${a[2]} · ${fmtD(a[1])}">${a[0]>=0?L[a[0]]:"–"}</span>`).join("")}</div>`;
  x+=`<ul>${tips.map(t=>`<li>${t}</li>`).join("")}</ul>`;
  picks.forEach(i=>{const t=(q.wrong||{})[L[i]];x+=`<div class="box"><b>ทำไม ${L[i]} ที่คุณเลือก${cnt[i]>1?` (${cnt[i]} ครั้ง)`:""} ถึงผิด</b><br>${t?R(t):"ดูเหตุผลใน “ทำไม "+L[q.ans]+" ถูก” ด้านล่าง"}</div>`;});
  if(w&&q.trap)x+=`<div class="box trapbox"><b>กับดักที่น่าจะทำให้พลาด</b><br>${R(q.trap)}</div>`;
  x+=`<p class="hint" style="margin:8px 0 0">หัวข้อ <b>${esc(tp)}</b> · ในคลังมี ${tq.length} ข้อ · ล่าสุดยังผิด ${tlw} ข้อ · <button class="linkbtn" id="advToRep" type="button" style="font-size:13px;padding:0">ดูรายงานรายหัวข้อ</button></p>`;
  x+=`<div class="row" style="margin-top:8px"><button class="btn" id="advAI" type="button">✦ ขอคำแนะนำเพิ่มจาก AI</button></div><div id="advAIout" class="aiout">${advAIc[q.uid]?mdLite(advAIc[q.uid]):""}</div>`;
  return x+`</div>`;
}
const advAIc={};let advAIbusy=false;
function bindAdv(q){
  const P=P_(),s=P.sess;
  const set=c=>{hPh(s.hp).forEach(p=>{if(rawAtts(P,p,q.uid).length)P.reset[p][q.uid]=[c,now()];});save();rQuiz();};
  const r=$("advReset");if(r)r.onclick=()=>{set(now());toast("รีเซ็ตแล้ว — ข้อนี้กลับเป็นข้อที่ยังไม่ทำ ไปทำใหม่ได้ใน Service / Grand round");};
  const u=$("advUnreset");if(u)u.onclick=()=>{set(0);toast("ยกเลิกรีเซ็ตแล้ว");};
  const tr=$("advToRep");if(tr)tr.onclick=()=>go(ward+"/report");
  const b=$("advAI");if(b)b.onclick=async()=>{if(advAIbusy)return;const out=$("advAIout");advAIbusy=true;b.disabled=true;out.innerHTML=`<p class="hint">กำลังคิด… (ประมาณ 10–60 วินาที)</p>`;
    try{const t=await aiText(advPrompt(q),t=>{const o=$("advAIout");if(o)o.innerHTML=mdLite(t);});advAIc[q.uid]=t;const o=$("advAIout");if(o)o.innerHTML=mdLite(t);}
    catch(e){console.warn("advisor ai",e);const o=$("advAIout");if(o)o.innerHTML=aiErrHTML(e);}
    advAIbusy=false;const bb=$("advAI");if(bb)bb.disabled=false;};
}
function advPrompt(q){const W=W_(),P=P_(),h=hist(P,q.uid,P.sess.hp,true),c=n=>t=>{t=plain(t);return t.length>n?t.slice(0,n)+"…":t;};
  return [`คุณเป็นอาจารย์ที่ปรึกษา (advisor) ของ${INST.stu}${yearTxt()} ${INST.th} ในวอร์ด ${W.cfg.name} นิสิตกำลังทบทวนข้อสอบเก่าข้อนี้`,
  `โจทย์: ${plain(q.stem)}`,`ตัวเลือก: ${q.opts.map((o,i)=>L[i]+". "+plain(o)).join(" | ")}`,`เฉลยในคลัง: ${L[q.ans]}`,
  `ประวัติการตอบของนิสิต (เก่าไปใหม่): ${h.length?h.map(a=>a[0]>=0?L[a[0]]:"หมดเวลา").join(", "):"ยังไม่เคยทำ"}`,
  q.guide?`Guideline ที่คลังอ้าง: ${plain(q.guide)}`:"",`คำอธิบายในคลัง: ${c(1500)(q.why)}`,
  `ทำไมข้ออื่นผิด: ${Object.keys(q.wrong||{}).sort().map(k=>k+": "+c(300)(q.wrong[k])).join(" / ")}`,q.trap?`กับดัก: ${c(400)(q.trap)}`:"",
  "",`เขียนคำแนะนำเฉพาะตัวสำหรับนิสิตคนนี้ เป็นภาษาไทยปนศัพท์แพทย์ภาษาอังกฤษ สั้นกระชับ 4–7 bullet (ขึ้นต้นด้วย "- ") ได้แก่ ความคิดแบบไหนที่น่าจะทำให้เลือกช้อยที่เคยเลือก (ถ้าเคยผิด) และกฎ/จุดแยกที่ทำให้รู้ว่าเฉลยถูก วิธีจำ และเรื่องที่ควรไปอ่านต่อ ถ้าตอบถูกทุกครั้งให้แนะนำว่าควรต่อยอดเรื่องไหน ห้ามแต่งตัวเลขหรือแหล่งอ้างอิงที่ไม่มีจริง ถ้าคิดว่าเฉลยในคลังอาจผิดให้บอกพร้อมเหตุผล ใช้ **ตัวหนา** ได้ ไม่ต้องมีหัวข้อหรือคำเกริ่น`].filter(Boolean).join("\n");}
async function aiText(pr,onText,maxTok){
  const mode=await aiMode();if(!mode)throw {code:"no_ai"};
  if(mode==="claude"){const smp=await window.claude.use("sample");const r=await smp(pr,{modelTier:"default",onText:onText?(u=>onText(u.text)):undefined});return r.text;}
  const c=aiCfg();let r;
  try{r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":c.key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:c.model||"claude-sonnet-5-5",max_tokens:maxTok||4096,messages:[{role:"user",content:pr}]})});}
  catch(e){throw {code:"network"};}
  const j=await r.json().catch(()=>null);if(!r.ok)throw {code:"api",status:r.status,message:j&&j.error&&j.error.message||""};
  const t=((j&&j.content)||[]).filter(x=>x.type==="text").map(x=>x.text).join("");if(!t.trim())throw {code:"empty"};return t;}
function aiErrHTML(e){
  if(e&&e.code==="no_ai")return HAS_CLAUDE()?`<p class="hint">ใช้ Claude จากหน้านี้ไม่ได้ — ล็อกอิน Claude แล้วเปิดหน้านี้ใหม่ แล้วกดอนุญาตเมื่อหน้านี้ขอใช้ Claude</p>`:`<p class="hint">เว็บนี้ยังไม่ได้เชื่อม AI — ใส่ API key ได้ที่ <a href="#/${esc(ward)}/adm">Admission round</a>${CFG.artifactUrl?` หรือ <a href="${esc(artLink(ward+"/"+(view==="lcase"?"lcase":view==="report"?"report":"adm")))}" target="_blank" rel="noopener">เปิดเว็บนี้ใน Claude ↗</a> (ฟรี ใช้บัญชี Claude)`:""}</p>`;
  return `<p class="hint">${esc((admMsg(e)||"").replace("สร้างโจทย์ไม่สำเร็จ","ขอคำแนะนำไม่สำเร็จ").replace("AI ไม่ยอมสร้างโจทย์ข้อนี้","AI ไม่ตอบคำขอนี้")||"ขอคำแนะนำไม่สำเร็จ ลองใหม่อีกครั้ง")}</p>`;}
function mdLite(t){const out=[];let ul=false;const f=s=>esc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");const cl=()=>{if(ul){out.push("</ul>");ul=false;}};
  String(t||"").split(/\n/).forEach(l=>{const m=/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/.exec(l);
    if(/^\s*#{1,4}\s+/.test(l)){cl();out.push(`<h4>${f(l.replace(/^\s*#+\s+/,""))}</h4>`);}
    else if(m){if(!ul){out.push("<ul>");ul=true;}out.push(`<li>${f(m[1])}</li>`);}
    else{cl();if(l.trim())out.push(`<p>${f(l)}</p>`);}});cl();return out.join("");}
function rAdvResult(W,P,s,qs){
  const seen=qs.filter(q=>s.ans[q.uid]!==undefined).length,A=q=>{const h=hist(P,q.uid,s.hp,true);return h.length?h[h.length-1][0]:undefined;};
  const lw=qs.filter(q=>{const a=A(q);return a!==undefined&&a!==q.ans;}),nd=qs.filter(q=>A(q)===undefined).length,rs=qs.filter(q=>advIsReset(P,q,s.hp)).length;
  let h=`<h1 class="h2">สรุป Advisor round</h1><p class="sub">อ่านเฉลยไป ${seen}/${qs.length} ข้อ</p>
  <p class="statline">ล่าสุดยังผิด <b>${lw.length}</b> ข้อ${nd?` · ยังไม่เคยทำ <b>${nd}</b> ข้อ`:""}${rs?` · รีเซ็ตเป็นยังไม่ทำ <b>${rs}</b> ข้อ`:""}</p>
  <div class="stack"><button class="btn primary" id="rRep">📊 ดูรายงานจาก Advisor</button>${lw.length?`<button class="btn" id="rTry">ลองทำข้อที่ล่าสุดยังผิดอีกครั้ง (${lw.length})</button>`:""}${seen<qs.length?`<button class="btn" id="rBack">อ่านข้อที่ยังไม่ได้อ่านต่อ</button>`:""}<button class="btn ghost" id="rNew">ตั้งค่า Advisor round ใหม่</button><button class="btn ghost" id="rHome">กลับหน้าหลัก</button></div>
  <div class="card" style="padding:6px"><div class="rows" style="padding:0">${qs.map((q,i)=>{const a=A(q);const bs=[0,1,2,3,4].map(j=>{let c="b";if(a===j)c+=" f "+(j===q.ans?"ok":"no");else if(j===q.ans)c+=" k";return `<span class="${c}">${L[j]}</span>`;}).join("");return `<button class="srow" data-i="${i}"><span class="n">${q.id}</span><span class="bs">${bs}</span><span class="meta">${s.ans[q.uid]!==undefined?"อ่านแล้ว · ":""}${esc(q.set)} ${esc(q.ro)}</span></button>`;}).join("")}</div></div>`;
  $("main").innerHTML=h;
  $("rRep").onclick=()=>go(ward+"/report");$("rNew").onclick=()=>go(ward+"/advisor");$("rHome").onclick=()=>go(ward);
  const t=$("rTry");if(t)t.onclick=()=>startSess("redo","Advisor round (ข้อที่ยังผิด)",lw.map(q=>q.uid));
  const rb=$("rBack");if(rb)rb.onclick=()=>{s.cur=Math.max(0,s.list.findIndex(u=>s.ans[u]===undefined));save();go(ward+"/sess");};
  document.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{s.cur=+b.dataset.i;save();go(ward+"/sess");});
}
/* ---------------- Advisor report: weak topics, importance, what to read ---------------- */
function topicStats(hp){const W=W_(),P=P_(),T={};
  W.QB.forEach(q=>{const k=topicOf(W,q),t=T[k]||(T[k]={k,qs:[],done:0,lw:0,wa:0,att:0,sets:new Set(),wrongQ:[],fixedQ:[],todoQ:[],noteQ:[]});t.qs.push(q);t.sets.add(setKey(q));
    const h=hist(P,q.uid,hp,true);
    if(h.length){t.done++;t.att+=h.length;const w=nWrong(h,q);t.wa+=w;if(h[h.length-1][0]!==q.ans){t.lw++;t.wrongQ.push(q);}else if(w)t.fixedQ.push(q);}
    if(!hist(P,q.uid,hp).length)t.todoQ.push(q);
    const n=P.post[q.uid];if(n&&n.t&&n.t.trim())t.noteQ.push(q);});
  const L_=Object.values(T),ns=L_.map(t=>t.qs.length).sort((a,b)=>a-b),med=ns[Math.floor(ns.length/2)]||1,nSets=W.sets.length;
  L_.forEach(t=>{const n=t.qs.length;t.n=n;t.acc=t.done?(t.done-t.lw)/t.done:null;t.cov=t.done/n;t.imp=n/med;
    t.everySet=nSets>1&&t.sets.size>=nSets;
    t.tier=(t.done>=2&&t.acc<0.6)||t.lw>=3?"red":(n>=med&&t.cov<0.5)?"orange":(t.done&&(t.acc<0.8||t.fixedQ.length>=2))?"yellow":(t.done&&t.acc>=0.8&&t.cov>=0.5)?"green":"gray";
    t.score=(t.lw*2+(t.wa-t.lw)*0.5+(1-t.cov)*n*0.4)*Math.sqrt(t.imp);});
  return L_.sort((a,b)=>b.score-a.score||a.k.localeCompare(b.k));}
const TIER={red:["🔴","ต้องอ่านเพิ่มก่อน"],orange:["🟠","ออกสอบบ่อย แต่ยังทำน้อย"],yellow:["🟡","ทวนอีกนิด"],green:["🟢","ทำได้ดี"],gray:["⚪","ยังไม่ค่อยได้ทำ"]};
function topicAdvice(t){const n=t.qs.length,pc=x=>Math.round(x*100)+"%";
  const imp=t.everySet?`ออกทุกชุดที่มีในคลัง (${t.sets.size} ชุด) — เรื่องนี้ออกสอบแน่นอน`:t.imp>=1.5?`มีในคลังถึง ${n} ข้อ (มากกว่าหัวข้ออื่นโดยเฉลี่ย) — เรื่องนี้สำคัญ`:`มีในคลัง ${n} ข้อ จาก ${t.sets.size} ชุด`;
  const st=!t.done?"ยังไม่เคยทำข้อในหัวข้อนี้":`ทำแล้ว ${t.done}/${n} ข้อ · ล่าสุดถูก ${pc(t.acc)} · ผิดสะสม ${t.wa} ครั้ง`;
  const act={red:`ล่าสุดยังผิด ${t.lw} ข้อ ควรกลับไปอ่านเนื้อหาหัวข้อนี้จาก lecture/ตำราให้เป็นระบบ แล้วอ่านเฉลยข้อที่ผิดอีกรอบ`,orange:`ยังทำไปแค่ ${pc(t.cov)} ของข้อในหัวข้อนี้ ลองทำข้อที่เหลืออีก ${t.todoQ.length} ข้อก่อน เพื่อดูว่าเข้าใจจริงไหม`,yellow:`เกือบดีแล้ว ทวนข้อที่ยังผิด${t.fixedQ.length?`และข้อที่เคยผิดแล้วแก้ได้ (${t.fixedQ.length} ข้อ)`:""}อีกรอบ`,green:"ทำได้ดีแล้ว อ่านแค่สรุปความรู้ทวนก่อนสอบก็พอ",gray:`ยังมีข้อให้ทำอีก ${t.todoQ.length} ข้อ`}[t.tier];
  return {imp,st,act};}
let advPlanBusy=false;
function rReport(){
  const W=W_(),P=P_(),a=advS(),R=W.R;
  if(!W.QB.length){$("main").innerHTML=`<div class="empty">ยังไม่มีข้อสอบในคลัง</div>`;return;}
  const T=topicStats(a.hp),all=W.QB.length,done=T.reduce((x,t)=>x+t.done,0),lw=T.reduce((x,t)=>x+t.lw,0),wa=T.reduce((x,t)=>x+t.wa,0);
  let h=`<h1 class="h2">รายงานจาก Advisor</h1><p class="sub">วิเคราะห์จากประวัติการตอบทุกครั้ง (รวมข้อที่รีเซ็ตแล้ว) แบ่งตามหัวข้อบทเรียน · เรียงจากเรื่องที่ควรอ่านก่อน</p>`;
  h+=`<div class="chips" id="rHp">${[["all","ทั้ง 2 Phase"],["p",`เฉพาะ Phase ${ph()}`]].map(([v,t])=>`<button class="chip" data-v="${v}" aria-pressed="${a.hp===v}">${t}</button>`).join("")}</div>`;
  h+=`<p class="statline">เคยทำ <b>${done}</b>/${all} ข้อ · ล่าสุดถูก <b>${done?Math.round((done-lw)/done*100)+"%":"–"}</b> · ล่าสุดยังผิด <b>${lw}</b> ข้อ · ผิดสะสม <b>${wa}</b> ครั้ง</p>`;
  const tw=T.filter(t=>t.done).sort((x,y)=>y.lw-x.lw||y.wa-x.wa||x.k.localeCompare(y.k));
  if(tw.length){const mx=Math.max(1,...tw.map(t=>t.lw));
    h+=`<div class="card"><h3>ผิดเรื่องไหนมากที่สุด</h3><span class="rd">จำนวนข้อที่ครั้งล่าสุดยังตอบผิด ในแต่ละหัวข้อ</span><div class="tbars">${tw.slice(0,10).map(t=>`<div class="tbar"><span class="tn">${esc(t.k)}</span><span class="tt"><i style="width:${t.lw/mx*100}%"></i></span><span class="tv">${t.lw}/${t.done}</span></div>`).join("")}</div></div>`;}
  else h+=`<div class="card"><h3>ยังไม่มีประวัติการตอบ</h3><span class="rd" style="margin:0">ทำข้อสอบใน round ไหนก็ได้ แล้วกลับมาดูรายงาน — ระหว่างนี้ด้านล่างคือหัวข้อที่ออกสอบบ่อยที่สุดในคลัง</span></div>`;
  const plan=P.advPlan;
  h+=`<div class="card"><h3>✦ ให้ AI วางแผนการอ่านจากผลของฉัน</h3><span class="rd">ส่งสถิติรายหัวข้อและข้อที่ยังผิดให้ AI ช่วยจัดลำดับว่าควรอ่านอะไรก่อน เน้นตรงไหน</span><button class="btn" id="planGo" ${advPlanBusy?"disabled":""}>${plan?"วางแผนใหม่":"วางแผนการอ่าน"}</button><div id="planOut" class="aiout">${advPlanBusy?`<p class="hint">กำลังคิด… (ประมาณ 20–90 วินาที)</p>`:plan?mdLite(plan.t)+`<p class="hint">วางแผนเมื่อ ${fmtD(plan.ts)} · AI อาจผิดพลาดได้ ควรเทียบกับ lecture/guideline</p>`:""}</div></div>`;
  h+=`<h2 class="h2" style="font-size:18px;margin-top:22px">คำแนะนำรายหัวข้อ</h2>`;
  const res=W.RES||[],lecs=(W.cfg.lectures||[]);
  h+=T.map((t,i)=>{const ad=topicAdvice(t),tg=TIER[t.tier];
    const rs=res.filter(r=>r.topic===t.k).concat(lecs.filter(l=>l&&l.topic===t.k)),units=W.UNIT.filter(Lc=>Lc.topic===t.k);
    const pts=t.wrongQ.concat(t.fixedQ).slice(0,8).map(q=>{const s=(q.summary||[]).filter(x=>!/^ดูข้อ/.test(plain(x)))[0];return s?`<li><button class="qref" data-u="${esc(q.uid)}">ข้อ ${q.id}</button> ${R(s)}</li>`:"";}).join("");
    return `<details class="grp tcard" ${i<3&&t.tier!=="green"?"open":""}><summary><span>${tg[0]}</span> <b>${esc(t.k)}</b> <span class="tag">${tg[1]}</span></summary>
    <p class="tline">${ad.imp}</p><p class="tline">${ad.st}</p><p class="tline"><b>แนะนำ:</b> ${ad.act}</p>
    <div class="tools">${t.wrongQ.length?`<button class="tool" data-tw="${i}">🧭 อ่านเฉลยข้อที่ยังผิด<span class="n">${t.wrongQ.length}</span></button>`:""}<button class="tool" data-ta="${i}">📖 อ่านเฉลยทั้งหัวข้อ<span class="n">${t.qs.length}</span></button>${t.todoQ.length?`<button class="tool" data-tt="${i}">✎ ทำข้อที่ยังไม่ทำ<span class="n">${t.todoQ.length}</span></button>`:""}</div>
    ${pts?`<div class="tsub">จุดที่เคยพลาดในหัวข้อนี้</div><ul>${pts}</ul>`:""}
    ${t.noteQ.length?`<div class="tsub">โน้ตที่คุณจดไว้ในหัวข้อนี้</div><ul>${t.noteQ.slice(0,6).map(q=>{const n=P.post[q.uid].t.trim();return `<li><button class="qref" data-u="${esc(q.uid)}">ข้อ ${q.id}</button> ${esc(n.length>220?n.slice(0,220)+"…":n)}</li>`;}).join("")}</ul>`:""}
    <div class="tsub">Lecture / resources</div>${rs.length||units.length?`<ul>${rs.map(r=>`<li>${r.url?`<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>`:esc(r.title)}${r.type?` <span class="hint">· ${esc(r.type)}</span>`:""}${r.note?` — ${esc(r.note)}`:""}</li>`).join("")}${units.map(Lc=>`<li>Unit round: <a href="#/${esc(ward)}/unit">${esc(Lc.title)}</a></li>`).join("")}</ul>`:`<p class="hint" style="margin:2px 0 0">ยังไม่มี lecture หรือ resource ของหัวข้อนี้ในวอร์ดนี้ — เมื่ออัปโหลดเพิ่ม จะขึ้นที่นี่อัตโนมัติ</p>`}
    </details>`;}).join("");
  $("main").innerHTML=h;bindRefs();
  document.querySelectorAll("#rHp [data-v]").forEach(b=>b.onclick=()=>{a.hp=b.dataset.v;persist();rReport();});
  const S=(sel,f)=>document.querySelectorAll(sel).forEach(b=>b.onclick=()=>f(T[+Object.values(b.dataset)[0]]));
  S("[data-tw]",t=>startSess("advisor",`Advisor · ${t.k} (ข้อที่ยังผิด)`,t.wrongQ.map(q=>q.uid),{hp:a.hp}));
  S("[data-ta]",t=>startSess("advisor",`Advisor · ${t.k}`,t.qs.map(q=>q.uid),{hp:a.hp}));
  S("[data-tt]",t=>startSess("topic",`หัวข้อ ${t.k}`,t.todoQ.map(q=>q.uid)));
  $("planGo").onclick=async()=>{if(advPlanBusy)return;advPlanBusy=true;const wid=ward;$("planGo").disabled=true;$("planOut").innerHTML=`<p class="hint">กำลังคิด… (ประมาณ 20–90 วินาที)</p>`;
    try{const t=await aiText(planPrompt(T),t=>{const o=$("planOut");if(o&&view==="report")o.innerHTML=mdLite(t);});PWof(st,wid).advPlan={t,ts:now()};save();}
    catch(e){console.warn("plan",e);advPlanBusy=false;const o=$("planOut");if(o&&view==="report"){o.innerHTML=aiErrHTML(e);$("planGo").disabled=false;}return;}
    advPlanBusy=false;if(view==="report"&&ward===wid)rReport();};
}
function planPrompt(T){const W=W_(),c=(s,n)=>{s=plain(s);return s.length>n?s.slice(0,n)+"…":s;};
  const rows=T.map(t=>`- ${t.k}: ในคลัง ${t.qs.length} ข้อ (${t.sets.size} ชุด) · ทำแล้ว ${t.done} · ล่าสุดผิด ${t.lw} · ผิดสะสม ${t.wa} ครั้ง`).join("\n");
  const wq=T.filter(t=>t.wrongQ.length).slice(0,6).map(t=>`[${t.k}]\n`+t.wrongQ.slice(0,5).map(q=>`  • ${c(q.stem,160)} → เฉลย: ${c(q.opts[q.ans],60)} · ประเด็น: ${c((q.summary||[])[0]||"",160)}`).join("\n")).join("\n");
  return `คุณเป็นอาจารย์ที่ปรึกษา (advisor) ของ${INST.stu}${yearTxt()} ${INST.th} วอร์ด ${W.cfg.name} (ขอบเขต: ${W.cfg.scope||W.cfg.name}) นี่คือผลการทำข้อสอบเก่า (AC) ของนิสิต แยกตามหัวข้อ:

${rows}

ตัวอย่างข้อที่ครั้งล่าสุดยังตอบผิด:
${wq||"(ยังไม่มี)"}

เขียนแผนการอ่านเฉพาะตัวเป็นภาษาไทยปนศัพท์แพทย์ภาษาอังกฤษ กระชับ อ่านง่ายบนมือถือ โดยมี:
## จุดอ่อนหลัก — 2–4 หัวข้อที่ควรอ่านก่อน พร้อมเหตุผลจากตัวเลขด้านบน และ concept ที่น่าจะยังไม่เข้าใจจากข้อที่ผิด
## เรื่องสำคัญที่ออกบ่อย — หัวข้อที่มีในคลังเยอะหรือออกหลายชุด ควรเน้นอะไรในแต่ละเรื่อง
## ควรไปอ่านเพิ่ม — เนื้อหา/หัวข้อย่อยที่ควรอ่านจาก lecture, ตำราหรือ guideline มาตรฐาน (ระบุชื่อ guideline ได้ถ้ามั่นใจว่ามีจริง)
## แผนสั้น ๆ — ลำดับการทบทวนที่แนะนำ
ใช้ bullet ขึ้นต้นด้วย "- " และ **ตัวหนา** ได้ ห้ามแต่งตัวเลขหรือแหล่งอ้างอิงที่ไม่มีจริง ไม่ต้องมีคำเกริ่นหรือคำลงท้าย`;}

/* ---------------- Admission bank: answer sheet of every case the AI made ---------------- */
function admSheet(){
  const A=AS(),B=bankItems(AM,ward),f=st.admF||"all";
  $("sheetTitle").textContent="กระดาษคำตอบ · "+AMN();$("setChips").innerHTML="";
  $("statusChips").innerHTML=[["all","ทั้งหมด"],["wrong","ตอบผิด"],["right","ตอบถูก"],["todo","ยังไม่ตอบ"]].map(([v,t])=>`<button class="chip" aria-pressed="${f===v}" data-af="${v}">${t}</button>`).join("");
  document.querySelectorAll("[data-af]").forEach(b=>b.onclick=()=>{st.admF=b.dataset.af;persist();sheet();});
  const d=B.filter(x=>x.a!=null),r=d.filter(x=>x.a===x.q.ans);stats(d.length,B.length,r.length);
  const v=B.map((x,i)=>[x,i]).filter(([x])=>f==="wrong"?x.a!=null&&x.a!==x.q.ans:f==="right"?x.a===x.q.ans:f==="todo"?x.a==null:true);
  rows(v.map(([x,i])=>({q:Object.assign({},x.q,{id:i+1,set:(Array.isArray(x.q.tags)&&x.q.tags.length?x.q.tags:guessTags(W_(),x.q.topic)).join(", ")||"Case",ro:""}),a:x.a==null?undefined:x.a,cur:view==="admq"?x.key===st.admSel:!!(A.cur&&A.cur.uid===x.q.uid),meta:fmtD(x.c)+" · ",
    go:()=>{st.admSel=x.key;persist();pick=null;if(A.cur&&A.cur.uid===x.q.uid&&A.ans==null)go(ward+"/"+AM);else go(ward+"/admq");}})).reverse(),B.length?"ไม่มีข้อที่ตรงกับตัวกรองนี้":`ยังไม่มีข้อในคลัง — เริ่ม ${AMN()} เพื่อให้ AI สร้างข้อแรก`);
  $("sheetFoot").innerHTML=`<span class="hint">เรียงจากเคสล่าสุด · ทุกเคสที่ AI สร้างเก็บไว้ในคลังของคุณ (ย้ายระหว่างเว็บกับ Claude ด้วย “ไฟล์สำรอง” ในหน้าวอร์ด)</span><span class="spacer"></span><span class="hint" id="syncNote" style="flex-basis:100%"></span>${view==="admq"?`<button class="link" id="toAdm">กลับไปข้อปัจจุบัน</button>`:""}${HAS_CLAUDE()&&CFG.siteUrl&&B.length?(()=>{const u=B.filter(unsent).length;return `<span style="flex-basis:100%"></span>${u?`<button class="btn primary" id="admWeb" type="button">ส่งเคสที่ยังไม่ได้ส่งไปเว็บ (${u})</button>`:""}<button class="btn" id="admWebAll" type="button">ส่งทุกเคสไปเว็บ (${B.length})</button><span class="hint" id="admWebNote" style="flex-basis:100%"></span>`;})():""}`;
  const ta=$("toAdm");if(ta)ta.onclick=()=>{closeS(true);go(ward+"/"+AM);};
  {const b=$("admWeb");if(b)b.onclick=()=>sendWeb(B.filter(unsent).map(x=>x.key),"admWebNote");const ba=$("admWebAll");if(ba)ba.onclick=()=>sendWeb(B.map(x=>x.key),"admWebNote");}
  {const f=$("sheetFoot");if(f){f.insertAdjacentHTML("beforeend",ufaBtn("ufaSheet"));bindUfa();}}
  paintSync();
}

/* ---------------- Legendary round: real exam simulation (count + time per ward: config wards[].exam.MCQ = {n, min}) ---------------- */
const examCfg=()=>{const W=W_()||{},e=(W.cfg||{}).exam,o=W.cfg&&wOv(W.cfg.id),m=Object.assign({},e&&e.MCQ,o&&o.exam);return m.n&&m.min?m:null;};   /* config exam.MCQ, overridden by the count/time set on the dates page (st.wcfg[ward].exam) */
const GRADES=[[80,"A"],[75,"B+"],[70,"B"],[65,"C+"],[60,"C"],[55,"D+"],[50,"D"],[-1,"F"]];   /* A ≥80 · B+ 75 · B 70 · C+ 65 · C 60 · D+ 55 · D 50 · F <50 (the grade is always recomputed from the % so older papers follow the current scale) */
const gradeOf=pct=>GRADES.find(g=>pct>=g[0])[1];
const gCls=g=>g==="A"?"ga":g[0]==="B"?"gb":g[0]==="C"?"gc":g[0]==="D"?"gd":"gf";
const fmtDT=t=>{const d=new Date(t);return fmtD(t)+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");};
/* a paper mixes old-exam questions already done / not yet done (this phase), Unit round questions and the viewer's own Admission cases — the share of each is random every time */
const legQw=(wid,u)=>qAny(u,wid)||((bank[st.legSel]||{}).aq||{})[u]||null;
const legQ=u=>legQw(ward,u);
const LSRC={acd:"ข้อสอบเก่า (AC) ที่เคยทำแล้ว",acn:"ข้อสอบเก่า (AC) ที่ยังไม่เคยทำ",unit:"Unit round (โจทย์ที่แต่งจาก lecture)",adm:"Admission round (เคสที่ AI เคยสร้างให้คุณ)",spc:"Specialty round (โจทย์ที่ AI เคยสร้างให้คุณจากไฟล์ของวอร์ด)",ai:"โจทย์ใหม่ที่ AI สร้างขึ้นเฉพาะข้อสอบชุดนี้"};
const LSRS={acd:"AC เคยทำ",acn:"AC ใหม่",unit:"Unit",adm:"Admission",spc:"Specialty",ai:"AI ใหม่"};
function legPools(){const W=W_(),P=P_(),p=ph(),o={acd:[],acn:[],unit:[],adm:[],spc:[]};
  W.QB.forEach(q=>o[atts(P,p,q.uid).length?"acd":"acn"].push(q.uid));
  {const E=examCfg();if(E&&E.ai)return o;}   /* fixed mix (config exam.MCQ.ai, e.g. OB-GYN 70% AC + 30% AI): the rest of the paper is old-exam questions only */
  W.UNIT.forEach(Lc=>Lc.QB.forEach(q=>o.unit.push(q.uid)));
  ["adm","spc"].forEach(kd=>bankItems(kd,ward).forEach(x=>{if(x.q&&x.q.uid&&Array.isArray(x.q.opts))o[kd].push(x.q.uid);}));return o;}
function legDraw(n){const pools=legPools(),ks=Object.keys(pools).filter(k=>pools[k].length),w={};ks.forEach(k=>{w[k]=Math.random();});
  const tot=ks.reduce((a,k)=>a+w[k],0)||1,cnt={};ks.forEach(k=>{cnt[k]=Math.min(pools[k].length,Math.floor(n*w[k]/tot));});
  let sum=ks.reduce((a,k)=>a+cnt[k],0);
  while(sum<n){const av=ks.filter(k=>cnt[k]<pools[k].length);if(!av.length)break;cnt[av[Math.floor(Math.random()*av.length)]]++;sum++;}
  const src={},list=[];ks.forEach(k=>shuffle(pools[k]).slice(0,cnt[k]).forEach(u=>{src[u]=k;list.push(u);}));
  /* every topic of the old-exam bank gets at least one question when possible: swap in an AC question for each missing topic, taking out one from the most crowded topic */
  {const W=W_(),P=P_(),p=ph(),tp=u=>{const q=W.byU[u];return q&&!q.unit?topicOf(W,q):"";},cnt2={};list.forEach(u=>{const t=tp(u);if(t)cnt2[t]=(cnt2[t]||0)+1;});
    const all=[...new Set(W.QB.map(q=>topicOf(W,q)))],inList=new Set(list);
    shuffle(all).forEach(t=>{if(cnt2[t])return;const cand=W.QB.filter(q=>topicOf(W,q)===t&&!inList.has(q.uid));if(!cand.length)return;
      const big=Object.keys(cnt2).sort((a,b)=>cnt2[b]-cnt2[a])[0];if(!big||cnt2[big]<2)return;
      const outs=list.filter(u=>tp(u)===big),out=outs[Math.floor(Math.random()*outs.length)],q=cand[Math.floor(Math.random()*cand.length)];
      list[list.indexOf(out)]=q.uid;delete src[out];inList.delete(out);inList.add(q.uid);src[q.uid]=atts(P,p,q.uid).length?"acd":"acn";cnt2[big]--;cnt2[t]=1;});}
  return {list:shuffle(list),src};}
/* brand-new questions the AI writes for one Legendary paper only: never shown in any other round, except Ward staff round once answered (bank "lai") */
const legAIOK=()=>HAS_CLAUDE()||!!aiCfg().key;
function legAIn(n){const E=examCfg();if(E&&E.ai)return Math.max(1,Math.round(n*E.ai));if(n<10)return Math.max(1,Math.round(n*0.1));const lo=Math.ceil(n*0.05),hi=Math.ceil(n*0.15);return lo+Math.floor(Math.random()*(hi-lo+1));}
function legAIPrompt(W,specs){const w=W.cfg,y=yrN(),yr=y?ord(y)+"-year":"clinical-year";
  return `Write ${specs.length} brand-new multiple-choice questions for a simulated end-of-rotation exam (the real ward MCQ exam) taken by ${yr} medical students at ${INST.en}, Thailand, at the end of their ${w.name.replace(/\s*Y\d+$/,"")} rotation. They are mixed into a paper of past-exam questions, so match the style and difficulty of a real final exam.

Scope (stay inside it): ${w.scope||w.name}.
Level: what a ${yr} medical student is expected to know and use in real clinical practice, from standard textbooks and current international or Thai guidelines. Common and uncommon conditions are both fine.

Write the questions in this order, one per line below (topic to use, and the position of the correct answer):
${specs.map((x,i)=>x.base?`${i+1}. based on PAST-EXAM QUESTION ${i+1} below — correct answer at position ${"ABCDE"[x.pos]} (index ${x.pos})`:`${i+1}. topic: ${x.res?"from attached resource "+(x.res.code||x.res.title):x.topic||"any topic inside the scope"} — correct answer at position ${"ABCDE"[x.pos]} (index ${x.pos})${x.res?" — build it mainly on that resource (listed below); the key point tested must come from it":""}`).join("\n")}
${specs.some(x=>x.base)?`
Past-exam questions (real old exam items of this ward). For each new question N that names PAST-EXAM QUESTION N: test knowledge from the same content area (the same disease, topic or the key points listed), but it MUST NOT duplicate that past question or any other past-exam question — use a different patient scenario AND ask a different point with a different correct answer (for example, if the past question asks the diagnosis, ask the management, investigation, complication, mechanism or a related criterion instead; never just reword it).
${specs.map((x,i)=>x.base?`PAST-EXAM QUESTION ${i+1}: ${pastBrief(x.base)}`:"").filter(Boolean).join("\n")}
`:""}${(()=>{const u=[...new Set(specs.filter(x=>x.res).map(x=>x.res))];return u.length?"\nAttached resources (only for the questions that name them; the others use any reliable source):\n"+u.map(r=>`Resource ${resLabel(r)}:\n- ${resPts(r).join("\n- ")}`).join("\n\n")+"\n":"";})()}

Question rules (every question):
- Case-based only: the stem MUST present a patient case (age, sex, presentation, relevant history, examination and test results as needed). Ask anything about the case: diagnosis, initial management, definitive treatment, most important or next investigation, pathophysiology, etiology, mechanism of disease or of a drug, pertinent findings, complications, prognosis, and so on. Vary what is asked across the questions.
- Stem and all options in formal English, like a real exam. No hints in the stem: no diagnosis or interpretation in parentheses after lab values, no naming the sign or disease the student must work out, no normal ranges unless essential.
- Exactly 5 options with one single best answer. Options are parallel in style and similar in length; the correct option must not be longer or more specific than the others. No parentheses, no " / ", no "e.g.", no "all of the above" or "none of the above".
- Some straightforward, some with a plausible trap.

Explanation: for Thai medical students, in Thai mixed with English medical terms, concise but complete. You may use <b>…</b> for emphasis, no other HTML.

Reply with only a JSON object {"questions": [ … ]} holding ${specs.length} objects in the order above, each with exactly these keys:
{"topic": "short English topic label",
 "tags": ["1–4 broad chapter-level subjects, chosen ONLY from: ${broadOf(W).join("; ")} — never a diagnosis name"],
 "stem": "the case and question",
 "opts": ["A text","B text","C text","D text","E text"],
 "ans": <index of the correct option>,
 "interp": "what the case shows and what is being asked (Thai)",
 "why": "why the answer is correct, with the key facts, criteria or numbers (Thai)",
 "wrong": {"<letter>": "why this option is wrong here and when it would be right (Thai)"} for each of the 4 other letters,
 "trap": "the common trap (Thai), or empty string",
 "summary": ["4–7 Thai bullet points of high-yield knowledge on this topic, each complete on its own"],
 "guide": "guideline or textbook (with year) the answer is based on, or empty string",
 "mnemonic": "short memory aid, or empty string",
 "variants": ["2–3 Thai bullets: other ways this topic could be asked"]}`;}
const pastBrief=q=>{const t=x=>String(x||"").replace(/<[^>]+>/g,"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();return `${t(q.stem).slice(0,420)} | Correct answer: ${t(q.opts[q.ans])}${Array.isArray(q.summary)&&q.summary.length?" | Key points: "+q.summary.slice(0,4).map(t).join("; ").slice(0,500):""}`;};
let LG=null;   /* AI questions being written before a Legendary paper starts: {k,done,wid,stop} */
function paintLG(){const el=$("lgAIn");if(el&&LG)el.textContent=LG.done+"/"+LG.k;}
async function legGenAI(k){
  const W=W_(),tp=shuffle([...new Set(W.QB.map(q=>topicOf(W,q)))].filter(t=>t&&t!=="Others")),specs=[];
  const E=examCfg(),fromAC=!!(E&&E.aiFromAC),base=fromAC?shuffle(W.QB.slice()):[];
  for(let i=0;i<k;i++)specs.push(fromAC&&base.length?{base:base[i%base.length],pos:Math.floor(Math.random()*5)}:{topic:tp.length?tp[i%tp.length]:"",pos:Math.floor(Math.random()*5),res:pickSrc(W)});
  const B=[];for(let i=0;i<specs.length;i+=3)B.push(specs.slice(i,i+3));
  const out=[];let err=null,bi=0,fatal=false;
  const worker=async()=>{while(bi<B.length&&!fatal&&LG&&!LG.halt){const b=B[bi++];
    try{const o=await aiJSON(legAIPrompt(W,b),12000);const L_=Array.isArray(o&&o.questions)?o.questions:Array.isArray(o)?o:[];
      L_.slice(0,b.length).forEach((x,j)=>{try{const q=admCheck(x);if(b[j]&&b[j].res)q.srcRes=resLabel(b[j].res);out.push(q);}catch(e){}});}
    catch(e){err=e;const c=e&&e.code;if(["no_ai","not_granted","sampling_disabled","session_expired"].includes(c)||(c==="api"&&[401,403,404].includes(e.status)))fatal=true;}
    if(LG){LG.done=out.length;paintLG();}}};
  const stop=new Promise(r=>{LG.stop=r;});
  await Promise.race([Promise.all(k>20?[worker(),worker(),worker()]:[worker(),worker()]),stop]);
  return {qs:out.slice(0,k),err};}
async function legBegin(n){
  if(!(st.legAI!==false&&legAIOK())){legStart([]);return;}
  const k=legAIn(n),wid=ward;LG={k,done:0,wid,halt:false};rLegend();
  const r=await legGenAI(k),lg=LG;LG=null;
  if(!lg||lg.halt==="abort"||ward!==wid){if(view==="legend")rLegend();return;}
  if(!r.qs.length&&lg.halt!=="now"){if(!await uiAsk(`สร้างโจทย์ใหม่ด้วย AI ไม่สำเร็จ${r.err?` (${admMsg(r.err)||"ไม่ทราบสาเหตุ"})`:""}\nเริ่มสอบโดยใช้แต่ข้อในคลังเลยไหม?`)){rLegend();return;}}
  else if(r.qs.length<k&&lg.halt!=="now")toast(`AI สร้างโจทย์ใหม่ได้ ${r.qs.length}/${k} ข้อ ที่เหลือใช้ข้อในคลังแทน`);
  legStart(r.qs);}
function legPreFields(X,u){const o=(X&&X.pre||{})[u];if(!o)return `<span class="field seen new"><b>ก่อนสอบ</b>ข้อใหม่ ไม่เคยเจอ</span>`;let h="";
  if(o.s&&o.s.length)h+=`<span class="field seen"><b>ก่อนสอบเคยเจอใน</b>${esc(rkNames(o.s))}</span>`;
  if(o.r&&o.r.length)h+=`<span class="field seen rel"><b>ข้อคล้ายเคยเจอใน</b>${esc(rkNames(o.r))}</span>`;return h;}
function legPreHTML(X,q){const o=(X&&X.pre||{})[q.uid],W=W_(),rel=(W.REL[q.uid]||[]).map(u=>W.byU[u]).filter(Boolean);
  let t=!o?"ข้อนี้เป็นข้อใหม่ ก่อนสอบไม่เคยเจอทั้งข้อนี้และข้อคล้าย":[o.s&&o.s.length?`ซ้ำกับที่เคยเจอใน ${rkNames(o.s)}`:"",o.r&&o.r.length?`มีข้อคล้ายที่เคยเจอใน ${rkNames(o.r)}`:""].filter(Boolean).join(" · ");
  return `<div class="seenbox"><div><span class="hint">ก่อนสอบ:</span> ${esc(t)}</div>${rel.length?`<div><span class="hint">ข้อคล้ายกันในคลัง:</span> ${rel.map(x=>`<button class="qref" data-u="${esc(x.uid)}">ข้อ ${x.id}</button> <span class="hint">${esc(x.set)} ${esc(x.ro)}</span>`).join(" · ")}</div>`:""}</div>`;}
const legSrc=(X,u)=>(X.src&&X.src[u])||(String(u).startsWith("LAI|")?"ai":String(u).startsWith("ADM|")?"adm":String(u).startsWith("SPC|")?"spc":String(u).startsWith("U|")?"unit":"ac");
function rLegend(){
  const W=W_(),P=P_(),E=examCfg(),QB=W.QB;
  let h=`<h1 class="h2">Legendary round</h1><p class="sub">จำลองสอบจริง จำนวนข้อและเวลาเท่ากับสอบจริงของวอร์ดนี้ ทำรวดเดียวโดยไม่เฉลยทีละข้อ ส่งแล้วได้เกรดทันที · หมดเวลาระบบส่งให้เอง ข้อที่ยังไม่ทำนับเป็นไม่ได้คะแนน</p>`;
  if(!E){h+=`<div class="card"><h3>ยังไม่ได้ตั้งค่าการสอบจริงของวอร์ดนี้</h3><span class="rd" style="margin:0">บอก Claude ว่าวอร์ดนี้สอบ MCQ กี่ข้อ กี่นาที แล้วจะเปิด Legendary round ให้</span></div>`;$("main").innerHTML=h;return;}
  const PL=legPools(),avail=PL.acd.length+PL.acn.length+PL.unit.length+PL.adm.length,n=Math.min(E.n,avail),L_=P.leg;
  h+=`<div class="lgbig"><span class="w">สอบจริง ${esc(W.cfg.short||W.cfg.name)}</span><span><b>${E.n}</b> ข้อ</span><span class="dot">·</span><span><b>${E.min}</b> นาที</span></div>`;
  if(L_){const a=Object.keys(L_.ans).length,s=Object.keys(L_.star).filter(u=>L_.star[u]).length;
    h+=`<button class="resume" id="lgResume"><span>กำลังสอบอยู่ · <b>เหลือเวลา <span id="lgLeft">${hms(L_.end-now())}</span></b><span class="rd">ตอบแล้ว ${a}/${L_.list.length} ข้อ${s?` · ★ ${s}`:""} · เวลาเดินต่อแม้ปิดหน้า เหมือนสอบจริง</span></span><span class="go">→</span></button><div class="row2" style="margin-top:0"><span class="spacer"></span><button class="btn primary" id="lgSub" type="button">Submit ส่งข้อสอบเลย</button></div>`;}
  else{
    h+=`<div class="card"><h3>MCQ ${n} ข้อ · ${E.min} นาที</h3><span class="rd">เหมือนสอบจริงของ ${esc(W.cfg.short||W.cfg.name)}${n<E.n?` (มีข้อให้สุ่มทั้งหมด ${avail} ข้อ จึงใช้ทั้งหมด)`:""} · เปลี่ยนคำตอบได้จนหมดเวลา · กด ☆ ติดดาวข้อที่อยากกลับมาดู · ส่งแล้วจะเห็นเกรดก่อน แล้วค่อยเลือกดู Short answer paper หรือ Long explanation</span>
    ${E.ai?`<span class="rd">สัดส่วนตามที่ตั้งไว้: <b>ข้อสอบเก่า (AC) ${Math.round((1-E.ai)*100)}% = ${E.n-Math.round(E.n*E.ai)} ข้อ</b> สุ่มใหม่ทุกครั้ง + <b>โจทย์ใหม่ที่ AI แต่ง ${Math.round(E.ai*100)}% = ${Math.round(E.n*E.ai)} ข้อ</b>${E.aiFromAC?" จากเนื้อหาที่เจอในข้อสอบเก่า แต่ไม่ซ้ำข้อสอบเก่า (สถานการณ์ใหม่ ถามคนละประเด็น)":""} — ถ้า AI สร้างได้ไม่ครบหรือไม่มี AI ใช้ข้อสอบเก่าแทนส่วนที่ขาด · พยายามให้มีครบทุกหัวข้อในชุดเดียว · ระหว่างทำไม่บอกข้อมูลอะไรเลย ตอนเฉลยจึงบอกว่าแต่ละข้อมาจากไหนและเคยเจอมาก่อนหรือไม่</span>`:`<span class="rd">ข้อสอบจริงอาจตรงหรือไม่ตรงกับข้อสอบเก่า จึง<b>สุ่มทุกอย่างใหม่ทุกครั้ง</b> ทั้งจำนวนข้อที่ซ้ำกับที่เคยเจอ ข้อสอบเก่าที่ยังไม่เคยทำ โจทย์ Unit round เคสจาก Admission round ของคุณ และ<b>โจทย์ใหม่ที่ AI สร้างขึ้นเฉพาะชุดนั้น</b> (ไม่เคยเจอที่ไหน และจะกลับมาอีกเฉพาะใน Ward staff round) และพยายามให้มีครบทุกหัวข้อในชุดเดียว — ระหว่างทำไม่บอกข้อมูลอะไรเลย ตอนเฉลยจึงบอกว่าแต่ละข้อมาจากไหนและเคยเจอมาก่อนหรือไม่</span>`}
    <p class="hint" style="margin:0">ตอนนี้มีให้สุ่ม: ข้อสอบเก่า ${PL.acd.length+PL.acn.length} ข้อ (เคยทำใน Phase ${ph()} แล้ว ${PL.acd.length}) · Unit round ${PL.unit.length} · Admission ของคุณ ${PL.adm.length}</p>
    ${LG&&LG.wid===ward?`<div class="lgai"><b>กำลังเตรียมข้อสอบ</b> — AI กำลังเขียนโจทย์ใหม่ <b id="lgAIn">${LG.done}/${LG.k}</b> ข้อ · เวลาสอบยังไม่เริ่มนับ (ใช้เวลาประมาณ ${LG.k>20?Math.ceil(LG.k/9)+"–"+Math.ceil(LG.k/4.5):"1–3"} นาที)<div class="row2" style="margin-top:8px"><button class="btn ghost" id="lgAIx">ยกเลิก</button><span class="spacer"></span><button class="btn" id="lgAInow">เริ่มเลย ไม่ต้องรอ</button></div></div>`
    :`<label class="chk"><input type="checkbox" id="lgAI" ${st.legAI!==false&&legAIOK()?"checked":""} ${legAIOK()?"":"disabled"}><span><b>มีโจทย์ใหม่ที่ AI สร้างปนอยู่${E.ai?` ${Math.round(E.n*E.ai)} ข้อ (${Math.round(E.ai*100)}%)`:"บางข้อ"}</b>${E.ai?"":" — สุ่มจำนวนเองทุกครั้ง"}${legAIOK()?"":HAS_CLAUDE()?"":` · ต้องเปิดใน Claude${CFG.artifactUrl?` (<a href="${esc(artLink(ward+"/legend"))}" target="_blank" rel="noopener">เปิด Legendary round ใน Claude</a>)`:""} หรือใส่ API key ที่ Admission round ก่อน`}</span></label>
    <div class="row2"><span class="spacer"></span><button class="btn primary" id="lgGo">เริ่มสอบ</button></div>`}</div>`;}
  const H=bankItems("leg",ward).reverse();
  h+=`<button class="resume" id="lgHist" style="margin-top:18px"><span>📜 <b>ประวัติการสอบ Legendary round</b><span class="rd">${H.length?`สอบไปแล้ว ${H.length} ครั้ง · ดูผลและเฉลยย้อนหลังได้ทุกครั้ง`:"ยังไม่เคยสอบ"}${HAS_CLAUDE()?" · ส่งผลสอบไปดูในเว็บได้":""}</span></span><span class="go">→</span></button>`;
  if(H.length)h+=`<h2 class="h2" style="font-size:18px;margin-top:18px">ล่าสุด</h2>`+legRows(H.slice(0,3),H.length);
  $("main").innerHTML=h;
  const ls=$("lgSub");if(ls)ls.onclick=legAskSubmit;
  const r=$("lgResume");if(r){r.onclick=()=>go(ward+"/exam");const el=$("lgLeft");show._t=setInterval(()=>{if(!document.body.contains(el)){clearInterval(show._t);return;}el.textContent=hms(P.leg?P.leg.end-now():0);},1000);}
  const g=$("lgGo");if(g)g.onclick=async()=>{const ai=st.legAI!==false&&legAIOK();if(!await uiAsk(`เริ่มสอบ ${ai?E.n:n} ข้อ เวลา ${E.min} นาที?\n${ai?"รอ AI เขียนโจทย์ใหม่ก่อนสักครู่ แล้ว":""}เวลาจะเดินทันทีและเดินต่อแม้ออกจากหน้านี้`))return;legBegin(ai?E.n:n);};
  const ga=$("lgAI");if(ga)ga.onchange=e=>{st.legAI=e.target.checked;save();};
  const gx=$("lgAIx");if(gx)gx.onclick=()=>{if(LG){LG.halt="abort";LG.stop&&LG.stop();}};
  const gn=$("lgAInow");if(gn)gn.onclick=()=>{if(LG){LG.halt="now";LG.stop&&LG.stop();}};
  document.querySelectorAll("[data-lk]").forEach(b=>b.onclick=()=>{st.legSel=b.dataset.lk;st.legMode="grade";persist();go(ward+"/lres");});
  $("lgHist").onclick=()=>go(ward+"/lhist");
}
/* ---------------- shared bank: AI-made questions anyone shared ("Update for all") — Firestore shared/<ward>/items, read by every visitor of the website ---------------- */
const SHARED={},SHAREDQ={};let sharedT=0,sharedErr="";
const SPKEY=KEY+"-sharepend";
const unshared=x=>!x.shared;
function shareItems(wid){const o=[];["adm","spc","lai","lc"].forEach(kd=>bankItems(kd,wid).forEach(x=>{if(!unshared(x))return;if((kd==="lc"&&x.case)||(kd!=="lc"&&x.q&&Array.isArray(x.q.opts)))o.push(x.key);}));return o;}
const shareCount=wid=>shareItems(wid).length;
/* shared pool per ward: shared/<ward> (MDCU) · another institution prefixes its wards (config sharedPrefix, SI = "si_") so SI Med and MDCU Med never mix */
const SHW=id=>(CFG.sharedPrefix||"")+id;
async function loadShared(){if(!fb)return;try{for(const w of WL){const snap=await fb.fs.getDocs(fb.fs.collection(fb.db,"shared",SHW(w.id),"items"));const L_=[];
    snap.forEach(x=>{const d=x.data();if(!d||!d.d)return;try{const v=JSON.parse(d.d);if(d.kind==="lc"){if(v&&v.case)L_.push({id:x.id,kind:"lc",case:v.case,orig:v.orig||"",ts:d.ts||0,by:d.by});}
      else if(v&&v.q&&Array.isArray(v.q.opts)&&v.q.uid){L_.push({id:x.id,kind:d.kind,q:v.q,ts:d.ts||0,by:d.by});SHAREDQ[w.id+"|"+v.q.uid]=v.q;}}catch(e){}});
    SHARED[w.id]=L_.sort((a,b)=>a.ts-b.ts);}
  sharedT=now();sharedErr="";if(["adm","spc","lcase","home","sess"].includes(view))route();}catch(e){console.warn("shared",e);sharedErr=(e&&(e.code||e.message))||"error";sharedT=now();if(view==="adm"||view==="spc")route();}}
/* upload to the shared bank (website, signed in); without sign-in the keys wait in this browser until the next sign-in */
async function shareUpload(wid,keys){keys=keys.filter(k=>bank[k]);if(!keys.length)return 0;
  if(!fb||!fb.user){const pend=ld(SPKEY)||{};pend[wid]=[...new Set((pend[wid]||[]).concat(keys))];try{localStorage.setItem(SPKEY,JSON.stringify(pend));}catch(e){}return -keys.length;}
  let n=0;for(const k of keys){const x=bank[k],kd=k.split("|")[0],v=kd==="lc"?{case:x.case,orig:k}:{q:x.q};
    try{await fb.fs.setDoc(fb.fs.doc(fb.db,"shared",SHW(wid),"items",inkId(k)),{kind:kd,d:JSON.stringify(v),ts:now(),by:fb.user.uid});x.shared=now()+10000;bankPut(k,x);n++;}catch(e){console.warn("share",e);sharedErr=(e&&(e.code||e.message))||"error";}}
  if(!n&&sharedErr)toast("แชร์ไม่สำเร็จ: "+sharedErr+(String(sharedErr).includes("permission")?" — ตรวจ Firestore rules":""));
  if(n)loadShared();return n;}
async function flushSharePend(){const pend=ld(SPKEY);if(!pend||!fb||!fb.user)return;try{localStorage.removeItem(SPKEY);}catch(e){}let n=0;for(const w in pend)n+=Math.max(0,await shareUpload(w,pend[w]||[]));if(n)toast(`แชร์โจทย์ให้ทุกคนแล้ว ${n} ข้อ`);}
/* the "Update for all" button: in Claude it opens the website with the items (website imports them for you and uploads them to the shared bank); on the website it uploads directly */
async function updateForAll(noteId){const keys=shareItems(ward);const note=$(noteId);
  if(!keys.length){toast("ไม่มีโจทย์ใหม่ที่ยังไม่ได้แชร์");return;}
  if(HAS_CLAUDE()){if(!CFG.siteUrl)return;const cut=keys.slice(0,150);
    try{const d=await packStr(JSON.stringify({w:ward,b:legBundle(cut),share:cut})),url=CFG.siteUrl.replace(/#.*$/,"")+"#bank="+d;
      cut.forEach(k=>{const x=bank[k];if(x){x.shared=now()+10000;bankPut(k,x);}});
      openOut(url);
      if(note)note.innerHTML=`เปิดเว็บแล้ว — ในเว็บต้อง<b>เข้าสู่ระบบ</b>จึงจะแชร์ให้ทุกคนได้ (ยังไม่เข้าสู่ระบบ เว็บจะเก็บไว้รอ แล้วแชร์ให้ทันทีที่เข้าสู่ระบบ)${keys.length>cut.length?` · เหลืออีก ${keys.length-cut.length} ข้อ กดอีกครั้ง`:""} · ถ้าแท็บใหม่ไม่เปิด <button class="linkbtn" id="ufaCopy">คัดลอกลิงก์</button>`;
      const c=$("ufaCopy");if(c)c.onclick=async()=>{try{await navigator.clipboard.writeText(url);toast("คัดลอกลิงก์แล้ว");}catch(e){uiCopy("คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์:",url);}};}
    catch(e){console.warn(e);toast("สร้างลิงก์ไม่สำเร็จ");}return;}
  const n=await shareUpload(ward,keys);
  if(n<0){toast("เข้าสู่ระบบก่อน แล้วระบบจะแชร์ให้ทุกคนทันที");go("signin");}else if(n)toast(`แชร์โจทย์ให้ทุกคนแล้ว ${n} ข้อ`);else toast("แชร์ไม่สำเร็จ — ตรวจการเชื่อมต่อ");
  if(view==="adm"||view==="spc"||view==="lcase"||view==="lhist")route();}
const ufaBtn=(id)=>{const n=shareCount(ward);return n&&(HAS_CLAUDE()?CFG.siteUrl:fbOn())?`<div class="ufa"><button class="btn ufab" data-ufa="${id}" type="button">🌐 Update for all (${n})</button><span class="hint">แชร์โจทย์ใหม่ที่ AI สร้าง (Admission · Specialty · Legendary · Long case) ขึ้นเว็บให้ทุกคน ทุกเครื่อง ทุกบัญชี — ไม่รวมคำตอบของคุณ</span><span class="hint" id="${id}"></span></div>`:"";};
const bindUfa=()=>document.querySelectorAll("[data-ufa]").forEach(b=>b.onclick=()=>updateForAll(b.dataset.ufa));
/* shared bank on the Admission page and the Long case page (website) */
const SHK=m=>m==="spc"?["spc"]:["adm","lai"];
const shMine=(x,m)=>SHK(m).concat(m==="spc"?[]:["spc"]).some(kd=>bank[kd+"|"+ward+"|"+x.q.uid]);
function sharedAdmCard(m){const K=SHK(m),L_=(SHARED[ward]||[]).filter(x=>K.includes(x.kind));
  if(!L_.length){if(HAS_CLAUDE()||!fbOn())return "";return `<div class="card"><h3>🌐 คลังรวมจากทุกคน</h3><span class="rd" style="margin:0">${sharedErr?`โหลดคลังรวมไม่ได้ (${esc(sharedErr)})${String(sharedErr).includes("permission")?" — ตรวจ Firestore rules":""}`:sharedT?"ยังไม่มีโจทย์ในคลังรวม — กด 🌐 Update for all ใน Claude เพื่อแชร์โจทย์ที่ AI สร้างขึ้นมาที่นี่":"กำลังโหลดคลังรวม…"}</span></div>`;}
  const todo=L_.filter(x=>!shMine(x,m)),sel=m==="spc"?spcSharedSel(L_):null;
  return `<div class="card"><h3>🌐 คลังรวมจากทุกคน</h3><span class="rd">โจทย์${m==="spc"?" Specialty":""}ที่ AI สร้างและผู้ใช้แชร์ไว้ ${L_.length} ข้อ · ยังไม่เคยทำ ${todo.length} ข้อ — ตอบแล้วจะเก็บเข้าคลังของคุณ${m==="spc"?" (มาจากไฟล์ของวอร์ดนี้ที่แต่ละคนมี)":""}</span><div class="row2"><button class="btn" id="shAll" type="button">ทำทั้งหมด</button><span class="spacer"></span><button class="btn primary" id="shNew" type="button" ${todo.length?"":"disabled"}>ทำข้อที่ยังไม่เคยทำ (${todo.length})</button></div>${sel?`<button class="btn" id="shSel" type="button" style="margin-top:8px;width:100%" ${sel.length?"":"disabled"}>เฉพาะเรื่อง / ไฟล์ที่เลือกไว้ (${sel.length})</button>`:""}</div>`;}
function bindSharedAdm(m){const K=SHK(m),L_=(SHARED[ward]||[]).filter(x=>K.includes(x.kind)),k=m==="spc"?"spc":"adm",t=m==="spc"?"Specialty":"Admission";
  const a=$("shAll");if(a)a.onclick=()=>startSess(k,t+" · คลังรวม",shuffle(L_).map(x=>x.q.uid));
  const b=$("shNew");if(b)b.onclick=()=>startSess(k,t+" · คลังรวม (ข้อใหม่)",shuffle(L_.filter(x=>!shMine(x,m))).map(x=>x.q.uid));
  const c=$("shSel");if(c)c.onclick=()=>startSess(k,t+" · คลังรวม (เรื่องที่เลือก)",shuffle(spcSharedSel(L_)).map(x=>x.q.uid));}
function sharedLcHTML(){const L_=(SHARED[ward]||[]).filter(x=>x.kind==="lc"&&!bank[x.orig]&&!bank["lc|"+ward+"|S"+x.id]);if(!L_.length)return "";
  return `<h2 class="h2" style="font-size:18px;margin-top:22px">🌐 เคสรวมจากทุกคน</h2><div class="card" style="padding:6px">${L_.map(x=>`<button class="srow" data-shlc="${esc(x.id)}"><span class="meta" style="flex:1">${esc(x.case.intro.slice(0,90))}${x.case.intro.length>90?"…":""}</span><span class="go">→</span></button>`).join("")}</div>`;}
function bindSharedLc(){document.querySelectorAll("[data-shlc]").forEach(b=>b.onclick=()=>{const x=(SHARED[ward]||[]).find(y=>y.id===b.dataset.shlc);if(!x)return;const k="lc|"+ward+"|S"+x.id;bankPut(k,{case:x.case,step:0,my:{},shared:now()+10000});P_().lcCur=k;st.lcView="";save();rLCase();window.scrollTo(0,0);});}

/* ---------------- Legendary history: every paper, and sending papers made in Claude to the website ---------------- */
function legRows(H,total){return `<div class="card" style="padding:6px">${H.map((x,i)=>{const nai=Object.values(x.src||{}).filter(v=>v==="ai").length,used=Math.round(((x.t1||0)-(x.t0||0))/1000);
  return `<button class="srow" data-lk="${esc(x.key)}"><span class="lgg ${gCls(gradeOf(x.pct))}">${esc(gradeOf(x.pct))}</span><span class="meta" style="flex:1"><b>ครั้งที่ ${total-i}</b> · ${fmtDT(x.t1)}<br>${x.score}/${x.n} (${(+x.pct||0).toFixed(1)}%) · ${x.auto?"หมดเวลา":"ใช้เวลา "+mmss(used)}${nai?` · โจทย์ AI ${nai}`:""}${x.via==="claude"||nai?" · ทำใน Claude":x.via==="web"?" · ทำในเว็บ":""}</span><span class="go">→</span></button>`;}).join("")}</div>`;}
function rLHist(){
  const H=bankItems("leg",ward).reverse(),n=H.length;
  let h=`<h1 class="h2">ประวัติ Legendary round</h1><p class="sub">ผลสอบทุกครั้ง แตะครั้งไหนก็ได้เพื่อดูเกรด Short answer paper และ Long explanation ของครั้งนั้น (รวมโจทย์ที่ AI สร้างในชุดนั้น)</p>`;
  if(!n){h+=`<div class="empty">ยังไม่เคยสอบ Legendary round${HAS_CLAUDE()?"":" ในเว็บนี้ — ผลสอบที่ทำใน Claude ส่งมาดูที่นี่ได้ด้วยปุ่ม “ส่งไปดูในเว็บ” ในหน้าประวัติของ Claude"}</div>`;}
  else{const ps=H.map(x=>+x.pct||0),best=H.reduce((a,x)=>(+x.pct||0)>(+a.pct||0)?x:a,H[0]),avg=ps.reduce((a,b)=>a+b,0)/n;
    h+=`<div class="card"><div class="lhstat"><span><b>${n}</b>ครั้ง</span><span><b>${avg.toFixed(1)}%</b>เฉลี่ย</span><span><b>${esc(gradeOf(best.pct))}</b>ดีสุด (${(+best.pct).toFixed(1)}%)</span><span><b>${esc(gradeOf(H[0].pct))}</b>ล่าสุด</span></div>
      ${n>1?`<div class="lhtrend" aria-label="เกรดตามลำดับครั้ง">${H.slice().reverse().map((x,i)=>`<span class="lgg ${gCls(gradeOf(x.pct))}" title="ครั้งที่ ${i+1} · ${(+x.pct).toFixed(1)}%">${esc(gradeOf(x.pct))}</span>`).join("")}</div>`:""}</div>`;
    h+=legRows(H,n);}
  if(HAS_CLAUDE()&&n&&CFG.siteUrl){const un=H.filter(unsent).length;
    h+=`<div class="card"><h3>ส่งผลสอบไปดูในเว็บ</h3><span class="rd">เว็บ (GitHub) กับ Claude เก็บข้อมูลแยกกัน ปุ่มนี้เปิดเว็บพร้อมผลสอบและเฉลยครบทุกข้อ รวมโจทย์ที่ AI สร้าง — เปิดแล้วเว็บจะเก็บไว้ในประวัติให้ (ถ้าเข้าสู่ระบบในเว็บ จะเก็บในบัญชีด้วย)</span>
      <div class="row2"><button class="btn${un?" primary":""}" id="lhSend" type="button">${un?`ส่งที่ยังไม่ได้ส่ง (${un} ครั้ง)`:"ส่งทั้งหมดอีกครั้ง"}</button></div><p class="hint" id="lhNote" style="margin:6px 0 0"></p></div>`;}
  h+=ufaBtn("ufaLh");
  h+=`<div class="stack" style="margin-top:14px"><button class="btn ghost" id="lhBack" type="button">กลับ Legendary round</button></div>`;
  $("main").innerHTML=h;
  document.querySelectorAll("[data-lk]").forEach(b=>b.onclick=()=>{st.legSel=b.dataset.lk;st.legMode="grade";persist();go(ward+"/lres");});
  $("lhBack").onclick=()=>go(ward+"/legend");bindUfa();
  const sb=$("lhSend");if(sb)sb.onclick=()=>{const L_=H.filter(unsent);legSendWeb((L_.length?L_:H).map(x=>x.key));};
}
/* papers → link to the website: #legs=<z|j>.<base64url of {w, b:{bankKey: item}}> (deflate when the browser has CompressionStream) */
const b64u=u8=>{let s="";for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");};
const ub64=t=>{t=t.replace(/-/g,"+").replace(/_/g,"/");const s=atob(t),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;};
async function packStr(str){const u=new TextEncoder().encode(str);if(typeof CompressionStream==="function"){try{const b=await new Response(new Blob([u]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer();return "z."+b64u(new Uint8Array(b));}catch(e){}}return "j."+b64u(u);}
async function unpackStr(t){const k=t.slice(0,2),u=ub64(t.slice(2));if(k==="z."){const b=await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer();return new TextDecoder().decode(b);}return new TextDecoder().decode(u);}
function legBundle(keys){const b={};keys.forEach(k=>{const x=bank[k];if(!x)return;b[k]=x;(x.list||[]).forEach(u=>{if(String(u).startsWith("LAI|")){const lk="lai|"+k.split("|")[1]+"|"+u;if(bank[lk])b[lk]=bank[lk];}});});return b;}
/* not sent yet = never sent, or changed after it was sent (an Admission case answered again in Ward staff) */
const unsent=x=>!x.sent||(x.ts||0)>x.sent+5000;
function legSendWeb(keys){return sendWeb(keys,"lhNote");}
/* bank items made in Claude → the website in one link (#bank=); a very large batch goes in parts of ~150 Admission cases */
async function sendWeb(keys,noteId){const note=$(noteId||"lhNote");
  const adm=keys.filter(k=>/^(adm|spc)\|/.test(k)),rest=keys.filter(k=>!/^(adm|spc)\|/.test(k)),cut=adm.slice(0,150),left=adm.length-cut.length;keys=rest.concat(cut);
  try{const d=await packStr(JSON.stringify({w:ward,b:legBundle(keys)})),url=CFG.siteUrl.replace(/#.*$/,"")+"#bank="+d;
    keys.forEach(k=>{const x=bank[k];if(x&&unsent(x)){x.sent=now()+10000;bankPut(k,x);}});
    if(left)toast(`ส่งไป ${cut.length} เคส เหลืออีก ${left} เคส — กดส่งอีกครั้งหลังเว็บเปิดแล้ว`);
    openOut(url);
    if(note)note.innerHTML=`${left?`ส่งไปแล้วบางส่วน เหลืออีก ${left} เคส · `:""}เปิดเว็บในแท็บใหม่แล้ว (ลิงก์ยาว ${Math.round(url.length/1024)} KB) — ถ้าไม่เปิด <button class="linkbtn" id="lhCopy">คัดลอกลิงก์</button> ไปเปิดในเบราว์เซอร์เอง`;
    const c=$("lhCopy");if(c)c.onclick=async()=>{try{await navigator.clipboard.writeText(url);toast("คัดลอกลิงก์แล้ว");}catch(e){uiCopy("คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์:",url);}};
  }catch(e){console.warn(e);toast("สร้างลิงก์ไม่สำเร็จ");}}
/* website side: a #legs= link adds those papers (and their AI questions) to this browser's history */
function checkLegImport(){const m=/[#&](?:legs|bank)=([zj]\.[A-Za-z0-9_-]+)/.exec(location.hash||"");if(!m)return false;
  try{history.replaceState(null,"",location.pathname+location.search+"#/");}catch(e){location.hash="#/";}
  (async()=>{try{const o=JSON.parse(await unpackStr(m[1]));const w=o&&WARDS[o.w]?o.w:null,b=o&&o.b;if(!w||!b||typeof b!=="object")throw 0;
    const keys=Object.keys(b).filter(k=>/^(leg|lai|adm|spc|lc)\|/.test(k)&&k.split("|")[1]===w);let np=0,na=0,nc=0;
    /* CTA from Claude: merge procedures by id (newer copy of the same procedure wins, the website's own procedures stay) */
    {const v=b["tch|all|cta"];if(v&&Array.isArray(v.procs)){const o=bank["tch|all|cta"]||{rows:[],procs:[]},P=(o.procs||[]).slice();
      v.procs.forEach(p=>{if(!p||!p.id||!Array.isArray(p.rows))return;const i=P.findIndex(x=>x.id===p.id);if(i<0)P.push(p);else P[i]=p;nc++;});
      bankPut("tch|all|cta",{rows:o.rows||[],procs:P});}}
    keys.forEach(k=>{const v=b[k];if(!v||typeof v!=="object")return;if(k.startsWith("leg|")){v.imp=v.imp||now();np++;}if(k.startsWith("adm|")||k.startsWith("spc|")){if(!v.q||!Array.isArray(v.q.opts))return;na++;}if(!bank[k]||(v.ts||0)>=(bank[k].ts||0)){bank[k]=v;cloudBank(k);}});
    try{localStorage.setItem(BKEY,JSON.stringify(bank));}catch(e){}
    toast("นำเข้าจาก Claude แล้ว: "+[np?`ผลสอบ Legendary ${np} ครั้ง`:"",na?`โจทย์ Admission / Specialty ${na} ข้อ`:"",nc?`CTA ${nc} หัตถการ`:""].filter(Boolean).join(" · "));
    if(nc&&!np&&!na){go(w+"/tch/cta");return;}
    if(Array.isArray(o.share)&&o.share.length){const sk=o.share.filter(k=>/^(adm|spc|lai|lc)\|/.test(k)&&k.split("|")[1]===w&&b[k]);sk.forEach(k=>{if(!bank[k]&&b[k])bank[k]=b[k];});
      const wait=async()=>{for(let i=0;i<40&&!(fb&&fb.user)&&fbOn();i++)await new Promise(r=>setTimeout(r,250));const n=await shareUpload(w,sk);
        if(n>0)toast(`แชร์โจทย์ให้ทุกคนแล้ว ${n} ข้อ`);else if(n<0){toast("เข้าสู่ระบบเพื่อแชร์โจทย์ให้ทุกคน — เก็บไว้รอแล้ว");}};wait();}
    go(w+"/"+(np?"lhist":keys.some(k=>k.startsWith("spc|"))&&!keys.some(k=>k.startsWith("adm|"))?"spc":"adm"));}
  catch(e){console.warn(e);uiAlert("ลิงก์ผลสอบไม่ถูกต้อง หรือไม่ครบ (ลองคัดลอกลิงก์ใหม่ทั้งหมด)");}})();
  return true;}
function legStart(aiQs){
  aiQs=aiQs||[];const P=P_(),W=W_(),E=examCfg(),p=ph(),t=now(),id=t.toString(36),D=legDraw(Math.max(0,E.n-aiQs.length));if(!D.list.length&&!aiQs.length){toast("ยังไม่มีข้อให้สุ่ม");return;}
  aiQs.forEach((q,i)=>{q.lai=1;q.uid="LAI|"+id+"|"+(i+1);q.set="AI สร้างใหม่";q.ro=fmtD(t);q.ts=t;bankPut("lai|"+ward+"|"+q.uid,{q,h:[],paper:id});D.src[q.uid]="ai";D.list.push(q.uid);});
  if(aiQs.length)D.list=shuffle(D.list);
  const pre={};D.list.forEach(u=>{const a=seenIn(P,u),b=relSeen(P,W,u);if(a.length||b.length)pre[u]={s:a,r:b};});   /* where each question had been seen before this exam */
  P.leg={id,list:D.list,src:D.src,pre,ans:{},star:{},cur:0,t0:t,end:t+E.min*60000,min:E.min,ph:p};qStop();save();go(ward+"/exam");
}
function legPick(i){const X=P_().leg;if(!X)return;const u=X.list[X.cur];if(X.ans[u]===i)delete X.ans[u];else X.ans[u]=i;save();rExam();}
function rExam(){
  const W=W_(),P=P_(),X=P.leg;if(!X){go(ward+"/legend");return;}
  const i=X.cur,q=legQ(X.list[i]);if(!q){$("main").innerHTML=`<div class="empty">ไม่พบข้อนี้ในคลัง</div>`;paintNav();return;}
  const a=X.ans[q.uid],sd=!!X.star[q.uid],nA=Object.keys(X.ans).length,nS=Object.keys(X.star).filter(u=>X.star[u]).length;
  $("exT").textContent=hms(X.end-now());$("exN").innerHTML=`ตอบแล้ว <b>${nA}</b>/${X.list.length}${nS?` · ★ ${nS}`:""}`;
  /* real-exam feel: no source, year or "seen before" tags while answering */
  let h=`<div class="qhead"><div class="qnum">${i+1}.</div><div class="fields"></div><button class="flag star" id="starBtn" aria-pressed="${sd}" title="ติดดาวไว้กลับมาดู">${sd?"★ ติดดาวแล้ว":"☆ ติดดาว"}</button></div>`;
  h+=`<p class="stem">${q.stem}</p>`;
  if(!q.img&&q.imgNote)h+=`<div class="img-missing">🖼 ${q.imgNote}</div>`;
  if(q.img){const IL=Array.isArray(q.img)?q.img:[q.img];h+=`<div class="stem-img">${IL.map(k=>imgHTML(k,"ภาพประกอบโจทย์")).join("")}${q.imgNote?`<div class="img-note">${q.imgNote}</div>`:""}</div>`;}
  /* the original recall text (gray) is left out during the exam — it often carries the note-taker's hints; it shows again in the explanations */
  h+=`<ul class="opts" role="radiogroup" aria-label="ตัวเลือก">${q.opts.map((o,j)=>`<li class="opt${a===j?" sel":""}" role="radio" tabindex="0" aria-checked="${a===j}" data-i="${j}"><span class="bub">${L[j]}</span><span class="txt">${esc(o)}</span></li>`).join("")}</ul>`;
  /* Legendary question page: number, question and choices only — no tags, sources or hints, whatever other rounds show (rule set by the user) */
  {const has=noteHas("pre",X.ph,q.uid);h+=`<details class="pre" id="preBox" ${has?"open":""}><summary>✎ ทด / จด</summary>${noteHTML("pre",X.ph,q)}</details>`;}
  $("main").innerHTML=h;markSeen(q,"legend");
  {const pb=$("preBox");if(pb)pb.addEventListener("toggle",()=>{if(pb.open)mountNotes(pb);});mountNotes(document);}
  document.querySelectorAll(".opt").forEach(el=>{const f=()=>legPick(+el.dataset.i);el.onclick=f;el.onkeydown=e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();f();}};});
  $("starBtn").onclick=()=>{if(X.star[q.uid])delete X.star[q.uid];else X.star[q.uid]=1;save();rExam();};
  paintNav();
}
async function legAskSubmit(){const X=P_().leg;if(!X)return;const n=X.list.length,a=Object.keys(X.ans).length,s=Object.keys(X.star).filter(u=>X.star[u]).length;
  if(!await uiAsk(`Submit ส่งข้อสอบ?\nตอบแล้ว ${a}/${n} ข้อ${n-a?` · ยังไม่ได้ทำ ${n-a} ข้อ`:""}${s?` · ติดดาวไว้ ${s} ข้อ`:""}\nเหลือเวลา ${hms(X.end-now())}`))return;closeS(true);legSubmit(ward,false,true);}
function legSubmit(wid,auto,nav){
  const P=PWof(st,wid),X=P.leg,W=WARDS[wid];if(!X||!W)return;const t=Math.min(now(),X.end);let score=0;
  X.list.forEach(u=>{const q=legQw(wid,u),a=X.ans[u];if(q&&a!=null){if(a===q.ans)score++;const sr=legSrc(X,u);
    if(sr==="unit")(P.unit.att[u]=P.unit.att[u]||[]).push([a,t,"legend"]);else if(sr==="ai")extPush(q,[a,t,"legend"],wid);else if(sr!=="adm"&&sr!=="spc")(P.att[X.ph][u]=P.att[X.ph][u]||[]).push([a,t,"legend"]);}});
  const n=X.list.length,pct=n?score/n*100:0,k="leg|"+wid+"|"+X.id;
  /* Admission cases are copied into the paper so it stays readable even if that case leaves the bank */
  const aq={};X.list.forEach(u=>{const sr0=legSrc(X,u);if(sr0==="adm"||sr0==="spc"||sr0==="ai"){const q=legQw(wid,u);if(q)aq[u]=q;}});
  bankPut(k,{list:X.list,src:X.src||{},pre:X.pre||{},aq,ans:X.ans,star:X.star,n,score,pct,grade:gradeOf(pct),t0:X.t0,t1:t,min:X.min,auto:!!auto,ph:X.ph,via:HAS_CLAUDE()?"claude":"web"});
  P.leg=null;st.legSel=k;st.legMode="grade";save();
  if(ward===wid&&(nav||["exam","legend","lres"].includes(view)))go(wid+"/lres");
  else{toast("หมดเวลา Legendary round — ระบบส่งข้อสอบให้แล้ว ดูผลได้ที่ Legendary round");if(view==="home"&&ward===wid)rHome();}
}
setInterval(()=>{WL.forEach(w=>{const P=st.w[w.id];if(P&&P.leg&&now()>=P.leg.end)legSubmit(w.id,true);});paintLegBan();const el=$("exT");if(el&&view==="exam"&&P_().leg){const left=P_().leg.end-now();el.textContent=hms(left);el.classList.toggle("low",left<5*60e3);}},1000);
function legSheet(){
  const W=W_(),X=legPaper(),ex=view==="exam",f=st.legF||"all";
  $("sheetTitle").textContent=ex?"กระดาษคำตอบ · Legendary round":`กระดาษคำตอบ · เกรด ${gradeOf(X.pct)}`;$("setChips").innerHTML="";
  const FS=ex?[["all","ทั้งหมด"],["todo","ยังไม่ทำ"],["star","★ ติดดาว"]]:[["all","ทั้งหมด"],["wrong","ผิด"],["todo","ไม่ได้ทำ"],["star","★ ติดดาว"]];if(!FS.some(x=>x[0]===f))st.legF="all";
  $("statusChips").innerHTML=FS.map(([v,t])=>`<button class="chip" aria-pressed="${(st.legF||"all")===v}" data-lf="${v}">${t}</button>`).join("");
  document.querySelectorAll("[data-lf]").forEach(b=>b.onclick=()=>{st.legF=b.dataset.lf;persist();sheet();});
  const qs=X.list.map(legQ),nA=Object.keys(X.ans).length,nS=Object.keys(X.star).filter(u=>X.star[u]).length,ff=st.legF||"all";
  if(ex){statLabels(["ตอบแล้ว","ติดดาว","เหลือเวลา"]);$("sDone").textContent=`${nA}/${X.list.length}`;$("sRight").textContent="★ "+nS;$("sPct").textContent=mmss((X.end-now())/1000);}
  else stats(nA,X.list.length,X.score);
  const T=srchTerms(sheetQ),v=qs.map((q,i)=>[q,i]).filter(([q])=>{if(!q)return false;const a=X.ans[q.uid];return ff==="todo"?a==null:ff==="star"?!!X.star[q.uid]:ff==="wrong"?a!=null&&a!==q.ans:true;}).filter(([q])=>!T.length||srchHit(qSearchText(q,!ex,ex),T));
  if(ex)sheetQPaint(v.length);
  const cur=legIdx();
  if(ex){$("rows").innerHTML=!v.length&&T.length?`<div class="empty">ไม่พบข้อที่มีคำว่า “${esc(sheetQ.trim())}”</div>`:v.length?v.map(([q,i])=>{const a=X.ans[q.uid];return `<button class="srow${i===cur?" cur":""}" data-xi="${i}"><span class="n">${i+1}</span><span class="bs">${[0,1,2,3,4].map(j=>`<span class="b${a===j?" f":""}">${L[j]}</span>`).join("")}</span><span class="meta">${X.star[q.uid]?"★":""}${a==null?" ยังไม่ทำ":""}</span></button>`;}).join(""):`<div class="empty">ไม่มีข้อที่ตรงกับตัวกรองนี้</div>`;
    document.querySelectorAll("[data-xi]").forEach(b=>b.onclick=()=>{closeS();X.cur=+b.dataset.xi;save();rExam();window.scrollTo(0,0);});
    $("sheetFoot").innerHTML=`<span class="hint">ยังไม่เฉลยจนกว่าจะส่ง · ★ = ติดดาวไว้</span><span class="spacer"></span><button class="btn primary" id="sheetSub" type="button">Submit ส่งข้อสอบ</button>`;$("sheetSub").onclick=legAskSubmit;return;}
  rows(v.map(([q,i])=>({q:Object.assign({},q,{id:i+1,set:LSRS[legSrc(X,q.uid)]||"AC",ro:""}),rev:true,a:X.ans[q.uid]==null?-2:X.ans[q.uid],cur:i===cur,meta:(X.star[q.uid]?"★ ":"")+(X.ans[q.uid]==null?"ไม่ได้ทำ · ":""),go:()=>{st.legIdx=i;persist();pick=null;rQuiz();window.scrollTo(0,0);}})),"ไม่มีข้อที่ตรงกับตัวกรองนี้");
  $("sheetFoot").innerHTML=`<span class="hint">เส้นเขียวรอบวง = เฉลย · ★ = ติดดาวไว้ตอนสอบ</span><span class="spacer"></span><button class="link" id="toLres">กลับไปผลสอบ</button>`;$("toLres").onclick=()=>{closeS(true);go(ward+"/lres");};
}
function rLRes(){
  const W=W_(),X=bank[st.legSel];if(!X){go(ward+"/legend");return;}const mode=st.legMode==="short"?"short":"grade";
  const qs=X.list.map(legQ).filter(Boolean),nA=qs.filter(q=>X.ans[q.uid]!=null).length,nS=qs.filter(q=>X.star[q.uid]).length,used=Math.round((X.t1-X.t0)/1000);
  let h=`<h1 class="h2">ผล Legendary round</h1><p class="sub">${fmtDT(X.t1)} · MCQ ${X.n} ข้อ · ${X.auto?`หมดเวลา ${X.min} นาที ระบบส่งให้`:`ใช้เวลา ${mmss(used)} จาก ${X.min} นาที`}</p>`;
  const G=gradeOf(X.pct);h+=`<div class="gradebox ${gCls(G)}"><span class="k">เกรด</span><span class="g">${esc(G)}</span></div>`;
  h+=`<div class="row2 center"><button class="btn${mode==="short"?" primary":""}" id="lrShort" type="button">Short answer paper</button><button class="btn" id="lrLong" type="button">Long explanation</button></div>`;
  if(mode==="short"){const f=st.lrF||"all",wr=qs.filter(q=>X.ans[q.uid]!=null&&X.ans[q.uid]!==q.ans).length;
    h+=`<div class="score">${X.score}<span style="font-size:22px;color:var(--muted)"> / ${X.n}</span></div><p class="statline" style="text-align:center"><b>${X.pct.toFixed(1)}%</b> · ถูก ${X.score} · ผิด ${wr} · ไม่ได้ทำ ${X.n-nA}${nS?` · ★ ${nS}`:""}</p>`;
    {const pre=X.pre||{},sn=qs.filter(q=>pre[q.uid]&&pre[q.uid].s&&pre[q.uid].s.length).length,rl=qs.filter(q=>pre[q.uid]&&!(pre[q.uid].s&&pre[q.uid].s.length)&&pre[q.uid].r&&pre[q.uid].r.length).length;
      if(X.pre)h+=`<p class="hint" style="text-align:center">ก่อนสอบ: เคยเจอข้อนั้นมาแล้ว ${sn} ข้อ · มีข้อคล้ายที่เคยเจอ ${rl} ข้อ · ข้อใหม่ ${qs.length-sn-rl} ข้อ</p>`;}
    {const c={};qs.forEach(q=>{const k=legSrc(X,q.uid);c[k]=(c[k]||0)+1;});h+=`<p class="hint" style="text-align:center">ชุดนี้สุ่มได้: ${["acd","acn","ac","unit","adm","spc","ai"].filter(k=>c[k]).map(k=>`${LSRS[k]||"ข้อสอบเก่า (AC)"} ${c[k]}`).join(" · ")}</p>`;}
    h+=`<p class="hint" style="text-align:center">เกณฑ์: A ≥80% · B+ 75 · B 70 · C+ 65 · C 60 · D+ 55 · D 50 · F &lt;50%</p>`;
    h+=`<div class="chips" id="lrF">${[["all","ทั้งหมด"],["wrong","ผิด"],["todo","ไม่ได้ทำ"],["star","★ ติดดาว"]].map(([v,t])=>`<button class="chip" data-v="${v}" aria-pressed="${f===v}">${t}</button>`).join("")}</div>`;
    const v=X.list.map((u,i)=>[legQ(u),i]).filter(([q])=>{if(!q)return false;const a=X.ans[q.uid];return f==="wrong"?a!=null&&a!==q.ans:f==="todo"?a==null:f==="star"?!!X.star[q.uid]:true;});
    h+=`<div class="card" style="padding:6px;margin-top:10px"><div class="rows" style="padding:0">${v.map(([q,i])=>{const a=X.ans[q.uid],nd=a==null;const bs=[0,1,2,3,4].map(j=>{let c="b";if(a===j)c+=" f "+(j===q.ans?"ok":"no");else if(j===q.ans)c+=" k";return `<span class="${c}">${L[j]}</span>`;}).join("");return `<button class="srow" data-li="${i}"><span class="n">${i+1}</span><span class="bs">${bs}</span><span class="meta">${X.star[q.uid]?"★ ":""}${nd?"ไม่ได้ทำ":a===q.ans?"✓":"✗"} · ${LSRS[legSrc(X,q.uid)]||"AC"}</span></button>`;}).join("")||`<div class="empty">ไม่มีข้อที่ตรงกับตัวกรองนี้</div>`}</div></div><p class="hint">แตะข้อไหนก็ได้เพื่อดูเฉลยละเอียดของข้อนั้น</p>`;}
  else h+=`<p class="hint" style="text-align:center">ดูคะแนนและข้อที่ถูก/ผิดใน Short answer paper หรืออ่านเฉลยทีละข้อใน Long explanation</p>`;
  h+=`<div class="stack" style="margin-top:14px">${HAS_CLAUDE()&&CFG.siteUrl?`<button class="btn" id="lrWeb" type="button">ส่งผลสอบครั้งนี้ไปดูในเว็บ</button><p class="hint" id="lhNote" style="margin:0"></p>`:""}<button class="btn ghost" id="lrHist" type="button">ประวัติการสอบทั้งหมด</button><button class="btn ghost" id="lrBack" type="button">กลับ Legendary round</button></div>`;
  $("main").innerHTML=h;
  $("lrShort").onclick=()=>{st.legMode="short";persist();rLRes();};
  $("lrHist").onclick=()=>go(ward+"/lhist");{const b=$("lrWeb");if(b)b.onclick=()=>legSendWeb([st.legSel]);}
  $("lrLong").onclick=()=>{st.legMode="short";st.legIdx=0;persist();go(ward+"/lrev");};
  $("lrBack").onclick=()=>go(ward+"/legend");
  document.querySelectorAll("#lrF [data-v]").forEach(b=>b.onclick=()=>{st.lrF=b.dataset.v;persist();rLRes();});
  document.querySelectorAll("[data-li]").forEach(b=>b.onclick=()=>{st.legIdx=+b.dataset.li;persist();go(ward+"/lrev");});
}

/* ---------------- Long case round: chief complaint → 8 stages, answer then reveal (MEQ style); AI writes the case ---------------- */
const LCS=[["hx","1. History taking","ซักประวัติ present illness, past history และประวัติอื่น ๆ — จะถามอะไรบ้าง เพราะอะไร"],["pe","2. Physical examination","จะตรวจร่างกายอะไรบ้าง มองหาอะไร"],["ddx","3. Differential diagnoses","DDx มีอะไรบ้าง และ most likely diagnosis คืออะไร เพราะอะไร"],["lab","4. Lab investigation","จะส่งตรวจอะไรบ้าง เพื่ออะไร"],["dx","5. Definite diagnosis","วินิจฉัยสุดท้ายคืออะไร (รวม staging/classification ถ้ามี)"],["init","6. Initial management","จะจัดการเบื้องต้นอย่างไร"],["tx","7. Specific, symptomatic, supportive treatment","รักษาจำเพาะ รักษาตามอาการ และ supportive อย่างไร"],["fu","8. Plan follow up","วางแผนติดตามอย่างไร"]];
let lcBusy=false,lcErr="",lcFbBusy=false;
function lcPrompt(W){const w=W.cfg,y=yrN(),yr=y?ord(y)+"-year":"clinical-year",recent=bankItems("lc",ward).slice(-12).map(x=>x.case.topic).join("; ");
  return `Write ONE realistic long-case examination case for ${yr} medical students at ${INST.en}, Thailand, during their ${w.name.replace(/\s*Y\d+$/,"")} rotation.
Scope (stay inside it): ${w.scope||w.name}. Choose a disease commonly seen or important in a Thai teaching hospital. Avoid these recent topics: ${recent||"none"}.
The student will work through the case step by step like a long-case exam; at each stage they write their answer first, then your text for that stage is revealed (MEQ style). Do not reveal the diagnosis before stage 3.

Reply with only a JSON object:
{"topic":"short English topic label (the final diagnosis, hidden from the student until the end)",
 "intro":"English chief complaint ONLY: the main symptom and its duration, e.g. \"Right lower abdominal pain for 1 day\" — no age, sex, history or any other detail (the student takes the history next)",
 "stages":[ exactly 8 objects in this order, each {"k":"<hx|pe|ddx|lab|dx|init|tx|fu>","info":"…","answer":"…"} ],
 "pearls":["4–6 Thai take-home points"],
 "guide":"main guideline or textbook with year, or empty string"}
Stage content:
- hx: info = the full history the patient gives when asked well, starting with patient identification (age, sex, occupation, province), then present illness with timeline, pertinent positives and negatives, past history, drugs, allergy, family, social, systemic review) in English; answer = Thai: what should be asked and why, which findings matter.
- pe: info = vital signs and examination findings in English; answer = Thai: what to examine and how to interpret the findings.
- ddx: info = ""; answer = Thai: 3–5 differential diagnoses with points for and against, then the most likely diagnosis.
- lab: info = investigation results in English (values with units; imaging/pathology reports as text); answer = Thai: which investigations and why, interpretation.
- dx: info = ""; answer = Thai: definite diagnosis with classification, staging or severity.
- init: info = ""; answer = Thai: initial management in order of priority.
- tx: info = ""; answer = Thai: specific, symptomatic and supportive treatment, including operation choice if relevant.
- fu: info = ""; answer = Thai: follow-up plan, monitoring, complications to watch, patient education.
Thai text may mix English medical terms. Use "\\n- " bullets inside answers for lists. No hints of the diagnosis in intro, hx info or pe info beyond what a real patient would show. Do not invent guideline names or numbers you are unsure of.`;}
function lcCheck(o){if(!o||typeof o!=="object"||!Array.isArray(o.stages)||o.stages.length<8||!o.intro)throw {code:"bad"};
  const st_=LCS.map(([k],i)=>{const x=o.stages.find(s=>s&&s.k===k)||o.stages[i]||{};return {k,info:String(x.info||""),answer:String(x.answer||"")};});
  if(st_.some(x=>!x.answer))throw {code:"bad"};
  return {topic:String(o.topic||"").slice(0,80),intro:String(o.intro),stages:st_,pearls:(Array.isArray(o.pearls)?o.pearls:[]).map(String),guide:String(o.guide||"").slice(0,300)};}
async function lcGen(){const mode=await aiMode();if(!mode)throw {code:"no_ai"};const pr=lcPrompt(W_());let o;
  if(mode==="claude"){const smp=await window.claude.use("sample");o=await smp.json(pr,{modelTier:"default",cache:false});}
  else{const t=await aiText(pr,null,12000);const a=t.indexOf("{"),b=t.lastIndexOf("}");if(a<0||b<a)throw {code:"invalid_json"};try{o=JSON.parse(t.slice(a,b+1));}catch(e){throw {code:"invalid_json"};}}
  return lcCheck(o);}
const lcCur=()=>{const k=P_().lcCur;return k&&bank[k]?Object.assign({key:k},bank[k]):null;};
function lcSave(x){const k=x.key;const v=Object.assign({},x);delete v.key;bankPut(k,v);}
function rLCase(){
  const W=W_(),P=P_();let x=st.lcView&&bank[st.lcView]&&st.lcView.split("|")[1]===ward?Object.assign({key:st.lcView},bank[st.lcView]):lcCur();
  let h=`<h1 class="h2">Long case</h1>`;
  if(!x){h+=`<p class="sub">AI ให้ chief complaint (อาการ + ระยะเวลา) มา แล้วคุณดำเนินเคสเองทีละขั้น 8 ขั้นเหมือนสอบ long case — เขียนคำตอบของตัวเองก่อน แล้วกดดูข้อมูลและเฉลยของขั้นนั้น (สไตล์ MEQ) · เนื้อหาตามวอร์ด ${esc(W.cfg.name)}</p>`;
    if(lcBusy)h+=`<div class="card"><h3>กำลังสร้างเคสใหม่…</h3><span class="rd" style="margin:0">ใช้เวลาประมาณ 20–90 วินาที</span><div class="spin" aria-hidden="true"></div></div>`;
    else{if(lcErr&&lcErr.code!=="no_ai")h+=`<div class="card"><h3>สร้างเคสไม่สำเร็จ</h3>${aiErrHTML(lcErr)}</div>`;h+=`<div id="lcBox"><p class="hint">กำลังตรวจการเชื่อมต่อ AI…</p></div>`;}
    const H=bankItems("lc",ward).reverse();
    h+=sharedLcHTML()+ufaBtn("ufaLc");
    if(H.length)h+=`<h2 class="h2" style="font-size:18px;margin-top:22px">เคสที่เคยทำ</h2><div class="card" style="padding:6px">${H.map(c=>`<button class="srow" data-lc="${esc(c.key)}"><span class="meta" style="flex:1"><b>${esc(c.step>=8?c.case.topic:"เคสที่ยังทำไม่จบ")}</b> · ${esc(c.case.intro.slice(0,70))}${c.case.intro.length>70?"…":""}<br>${fmtD(c.c)} · ${Math.min(c.step,8)}/8 ขั้น</span><span class="go">→</span></button>`).join("")}</div>`;
    $("main").innerHTML=h;
    if(!lcBusy)aiMode().then(mode=>{const box=$("lcBox");if(!box||view!=="lcase")return;box.innerHTML=lcConnectHTML(mode);
      const nb=$("lcNew");if(nb)nb.onclick=lcNew;
      const sv=$("aiSave");if(sv)sv.onclick=()=>{const k=$("aiKey").value.trim(),m=$("aiModel").value.trim();if(!/^sk-/.test(k)){toast("key ควรขึ้นต้นด้วย sk-");return;}try{localStorage.setItem(AIKEY,JSON.stringify({key:k,model:m}));}catch(e){}lcNew();};
      const dl=$("aiDel");if(dl)dl.onclick=()=>{try{localStorage.removeItem(AIKEY);}catch(e){}rLCase();};});
    bindSharedLc();bindUfa();
    document.querySelectorAll("[data-lc]").forEach(b=>b.onclick=()=>{const k=b.dataset.lc;if((bank[k].step||0)<8){P.lcCur=k;st.lcView="";save();}else{st.lcView=k;persist();}rLCase();window.scrollTo(0,0);});
    return;}
  const C=x.case,done=Math.min(x.step||0,8),my=x.my||{};
  h+=`<p class="sub">${done>=8?`เคส: <b>${esc(C.topic)}</b> · `:""}${fmtD(x.c)} · ${done}/8 ขั้น</p>`;
  h+=`<div class="card lcintro"><h3>Chief complaint</h3><p style="margin:0">${esc(C.intro)}</p></div>`;
  LCS.forEach(([k,t,ask],i)=>{const S=C.stages[i];if(i>done)return;const open=i<done;
    h+=`<div class="card lcstep${open?" done":""}"><h3>${t}</h3><span class="rd">${ask}</span>`;
    if(open){h+=my[k]?`<div class="lcmine"><b>คำตอบของฉัน</b><br>${esc(my[k]).replace(/\n/g,"<br>")}</div>`:`<p class="hint">ไม่ได้เขียนคำตอบในขั้นนี้</p>`;
      if(S.info)h+=`<div class="lcinfo"><b>ข้อมูลที่ได้</b>${mdLite(S.info)}</div>`;
      h+=`<div class="lcans"><b>เฉลย / แนวคิด</b>${mdLite(S.answer)}</div>`;}
    else h+=`<textarea class="ntext" id="lcTxt" placeholder="เขียนคำตอบของคุณ (ไม่บังคับ) แล้วกดดูเฉลย">${esc(my[k]||"")}</textarea><div class="row2"><span class="spacer"></span><button class="btn primary" id="lcReveal" type="button">ดูข้อมูลและเฉลยขั้นนี้</button></div>`;
    h+=`</div>`;});
  if(done>=8){h+=`<div class="card"><h3>สรุปเคส: ${esc(C.topic)}</h3>${C.pearls.length?`<ul>${C.pearls.map(p=>`<li>${esc(p)}</li>`).join("")}</ul>`:""}${C.guide?`<p class="hint">📘 อ้างอิง: ${esc(C.guide)}</p>`:""}<p class="hint">เคสและเฉลยนี้ AI สร้างขึ้น อาจผิดพลาดได้ ควรเทียบกับตำรา/guideline</p></div>`;
    h+=`<div class="card"><h3>✦ ให้ AI ประเมินคำตอบของฉัน</h3><span class="rd">เทียบคำตอบที่เขียนในแต่ละขั้นกับเฉลย บอกจุดที่ดีและสิ่งที่ขาด</span><button class="btn" id="lcFb" type="button" ${lcFbBusy?"disabled":""}>${x.fb?"ประเมินใหม่":"ประเมินคำตอบ"}</button><div class="aiout" id="lcFbOut">${lcFbBusy?`<p class="hint">กำลังประเมิน…</p>`:x.fb?mdLite(x.fb):""}</div></div>`;}
  h+=`<div class="stack" style="margin-top:12px">${done>=8?`<button class="btn primary" id="lcNext" type="button">เคสใหม่ / ดูเคสอื่น</button>`:`<button class="btn ghost" id="lcList" type="button">ดูเคสอื่น (เคสนี้เก็บไว้ทำต่อได้)</button>`}</div>`;
  $("main").innerHTML=h;
  const ta=$("lcTxt");if(ta){ta.oninput=()=>{clearTimeout(rLCase._t);rLCase._t=setTimeout(()=>{const y=bank[x.key];y.my=Object.assign({},y.my||{},{[LCS[done][0]]:ta.value});bankPut(x.key,y);},800);};}
  const rv=$("lcReveal");if(rv)rv.onclick=()=>{clearTimeout(rLCase._t);const y=bank[x.key];y.my=Object.assign({},y.my||{});if(ta)y.my[LCS[done][0]]=ta.value;y.step=done+1;bankPut(x.key,y);rLCase();const c=document.querySelectorAll(".lcstep")[done];if(c)setTimeout(()=>c.scrollIntoView({block:"start"}),50);};
  const nx=$("lcNext");if(nx)nx.onclick=()=>{if(P.lcCur===x.key)P.lcCur="";st.lcView="";save();rLCase();window.scrollTo(0,0);};
  const ls=$("lcList");if(ls)ls.onclick=()=>{P.lcCur="";st.lcView="";save();rLCase();window.scrollTo(0,0);};
  const fbb=$("lcFb");if(fbb)fbb.onclick=async()=>{if(lcFbBusy)return;lcFbBusy=true;fbb.disabled=true;$("lcFbOut").innerHTML=`<p class="hint">กำลังประเมิน… (ประมาณ 10–60 วินาที)</p>`;const k=x.key;
    try{const t=await aiText(lcFbPrompt(bank[k]),t=>{const o=$("lcFbOut");if(o)o.innerHTML=mdLite(t);});const y=bank[k];y.fb=t;bankPut(k,y);}
    catch(e){console.warn("lc fb",e);const o=$("lcFbOut");if(o)o.innerHTML=aiErrHTML(e);}
    lcFbBusy=false;const b2=$("lcFb");if(b2)b2.disabled=false;};
}
/* the start button: make a case right away when AI is reachable; otherwise the button opens this page in Claude, or the API key form */
function lcConnectHTML(mode){
  if(mode)return `<div class="stack"><button class="btn primary" id="lcNew" type="button">✦ เริ่มเคสใหม่</button></div>${HAS_CLAUDE()?"":`<p class="hint" style="text-align:center">ใช้ API key ที่บันทึกไว้ในเบราว์เซอร์นี้ · <button class="linkbtn" id="aiDel" style="font-size:13px;padding:0">ลบ key</button></p>`}`;
  if(HAS_CLAUDE())return `<div class="card"><h3>ใช้ Claude จากหน้านี้ไม่ได้</h3><span class="rd" style="margin:0">ล็อกอิน Claude แล้วเปิดหน้านี้ใหม่ แล้วกดอนุญาตเมื่อหน้านี้ขอใช้ Claude (ใช้โควตาบัญชีของคุณเอง)</span></div>`;
  const c=aiCfg();
  return `${CFG.artifactUrl?`<a class="btn primary" style="display:block;text-align:center;text-decoration:none;margin-bottom:8px" href="${esc(artLink(ward+"/lcase"))}" target="_blank" rel="noopener">✦ เริ่มเคสใหม่ใน Claude ↗ (ฟรี ใช้บัญชี Claude)</a>`:""}
  <div class="card"><h3>หรือใช้ในเว็บนี้ด้วย Anthropic API key</h3><span class="rd">เว็บนี้ไม่มี AI ในตัว ใส่ key ของคุณแล้วเริ่มเคสได้ทันที</span>
  <input class="field-in" id="aiKey" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" value="${esc(c.key||"")}">
  <input class="field-in" id="aiModel" type="text" autocapitalize="none" spellcheck="false" placeholder="โมเดล (เว้นว่าง = claude-sonnet-5-5)" value="${esc(c.model||"")}" style="margin-top:8px">
  <span class="rd" style="margin-top:6px">key เก็บไว้ในเบราว์เซอร์นี้เท่านั้น (ไม่ซิงก์ ไม่ส่งไปที่อื่นนอกจาก api.anthropic.com) · คิดเงินตามการใช้งานจากบัญชี API ของคุณ</span>
  <div class="row2" style="margin-top:6px"><button class="btn primary" id="aiSave" type="button">บันทึกแล้วเริ่มเคส</button>${c.key?`<button class="btn ghost" id="aiDel" type="button">ลบ key</button>`:""}</div></div>`;}
async function lcNew(){if(lcBusy)return;lcBusy=true;lcErr="";const wid=ward;rLCase();
  try{const c=await lcGen();const k="lc|"+wid+"|"+now().toString(36);bankPut(k,{case:c,step:0,my:{}});PWof(st,wid).lcCur=k;st.lcView="";save();}
  catch(e){console.warn("long case",e);lcErr=e;}
  lcBusy=false;if(view==="lcase"&&ward===wid)rLCase();}
function lcFbPrompt(x){const C=x.case,my=x.my||{};
  return `คุณเป็นอาจารย์ศัลยกรรมที่คุมสอบ long case ของ${INST.stu}${yearTxt()} ${INST.th} เคส: ${C.topic}\nChief complaint: ${C.intro}\n\n`+LCS.map(([k,t],i)=>`### ${t}\nคำตอบของนิสิต: ${(my[k]||"(ไม่ได้เขียน)").slice(0,1500)}\nเฉลย: ${C.stages[i].answer.slice(0,1500)}`).join("\n\n")+`\n\nประเมินคำตอบของนิสิตเป็นภาษาไทยปนศัพท์แพทย์อังกฤษ กระชับ: แต่ละขั้น 1–3 bullet (ขึ้นต้น "- ") บอกสิ่งที่ทำได้ดีและสิ่งที่ขาด/ผิด โดยใช้หัวข้อ "## <ชื่อขั้น>" แล้วปิดท้ายด้วย "## ภาพรวม" 2–4 bullet ว่าควรฝึกอะไรเพิ่ม ถ้าขั้นไหนนิสิตไม่ได้เขียน ให้บอกสั้น ๆ ว่าควรตอบอะไร ห้ามแต่งข้อมูลที่ไม่มีจริง`;}

/* ---------------- session result ---------------- */
function rResult(){
  const W=W_(),P=P_(),s=P.sess;const qs=s.list.map(u=>qAny(u)).filter(Boolean);
  if(s.kind==="advisor")return rAdvResult(W,P,s,qs);
  const ans=qs.filter(q=>s.ans[q.uid]>=0),right=ans.filter(q=>s.ans[q.uid]===q.ans),wrong=ans.filter(q=>s.ans[q.uid]!==q.ans),tout=qs.filter(q=>s.ans[q.uid]<0).length,skip=qs.length-ans.length-tout;
  let h=`<h1 class="h2">สรุป ${esc(s.title)}</h1><p class="sub">Phase ${s.ph} · ${qs.length} ข้อ</p>
  <div class="score">${right.length}<span style="font-size:22px;color:var(--muted)"> / ${qs.length}</span></div>
  <p class="statline">ถูก <b>${right.length}</b> · ผิด <b>${wrong.length}</b>${tout?` · หมดเวลา <b>${tout}</b>`:""}${skip?` · ยังไม่ได้ตอบ <b>${skip}</b>`:""} · ความแม่น <b>${ans.length?Math.round(right.length/ans.length*100)+"%":"–"}</b></p>
  <div class="stack">${wrong.length?`<button class="btn primary" id="rWrong">ทำข้อที่ผิดในรอบนี้อีกครั้ง (${wrong.length})</button>`:""}${skip?`<button class="btn" id="rBack">กลับไปทำข้อที่ข้ามไว้</button>`:""}<button class="btn ghost" id="rHome">กลับหน้าหลัก</button></div>
  <div class="card" style="padding:6px"><div class="rows" style="padding:0">${qs.map((q,i)=>{const a=s.ans[q.uid];const bs=[0,1,2,3,4].map(j=>{let c="b";if(a===j)c+=" f "+(j===q.ans?"ok":"no");else if(a!==undefined&&j===q.ans)c+=" k";return `<span class="${c}">${L[j]}</span>`;}).join("");return `<button class="srow" data-i="${i}"><span class="n">${q.id}</span><span class="bs">${bs}</span><span class="meta">${esc(q.set)} ${esc(q.ro)}</span></button>`;}).join("")}</div></div>`;
  $("main").innerHTML=h;
  const rw=$("rWrong");if(rw)rw.onclick=()=>startSess(s.kind==="quality"||s.kind==="morning"?"redo":s.kind,s.title.replace(/ \(ข้อที่ผิด\)$/,"")+" (ข้อที่ผิด)",wrong.map(q=>q.uid));
  const rb=$("rBack");if(rb)rb.onclick=()=>{s.cur=Math.max(0,s.list.findIndex(u=>s.ans[u]===undefined));save();go(ward+"/sess");};
  $("rHome").onclick=()=>go(ward);
  document.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{s.cur=+b.dataset.i;save();go(ward+"/sess");});
}

/* ---------------- Phase 2: high-yield & keywords ---------------- */
function openQ(u){const s=P_().svc[ph()];s.set="all";s.status="all";s.cur=u;save();go(ward+"/svc");}
function refBtns(refs){const W=W_();return (refs||[]).map(r=>W.byRid[r]).filter(Boolean).map(q=>`<button class="qref" data-u="${esc(q.uid)}">ข้อ ${q.id}</button>`).join(" ");}
function bindRefs(){document.querySelectorAll("[data-u].qref").forEach(b=>b.onclick=()=>openQ(b.dataset.u));}
function rHY(){rHySum("MCQ");}   /* หน้าเต็มอยู่ที่ site/hysum.js — W.HY (highyield.js) แบบเดิมเลิกใช้ */
function rKW(){
  const W=W_(),HY=W.HY||{},R=W.R;
  let h=`<h1 class="h2">Keyword ตอบข้อสอบ</h1><p class="sub">คำสำคัญที่เจอแล้วใช้ตอบได้ รวบรวมจากข้อสอบเก่าทุกปี</p>`;
  if(HY.keywords&&HY.keywords.length){h+=`<div class="card" style="padding:6px 10px"><table class="kw"><thead><tr><th>เจอคำว่า</th><th>นึกถึง / ตอบ</th></tr></thead><tbody>${HY.keywords.map(k=>`<tr><td>${k.k}</td><td>${R(k.v)} ${refBtns(k.refs)}</td></tr>`).join("")}</tbody></table></div>`;}
  else h+=`<div class="card"><span class="rd">Claude จะสรุป keyword ให้เมื่อมีข้อสอบในคลัง ระหว่างนี้ด้านล่างคือ “ช่วยจำ” ของทุกข้อ</span></div>`;
  const ms=W.QB.filter(q=>q.mnemonic);
  if(ms.length)h+=`<h2 class="h2" style="font-size:18px;margin-top:22px">ช่วยจำรายข้อ</h2><div class="card"><ul style="margin:0;padding-left:18px">${ms.map(q=>`<li style="margin:6px 0"><button class="qref" data-u="${esc(q.uid)}">ข้อ ${q.id}</button> ${q.mnemonic}</li>`).join("")}</ul></div>`;
  $("main").innerHTML=h;bindRefs();
}

/* ---------------- answer sheet ---------------- */
function statLabels(a){document.querySelectorAll("#overlay .stat .k").forEach((e,i)=>{e.textContent=a[i];});}
function sheet(){
  const W=W_(),P=P_(),p=ph();statLabels(["ทำแล้ว","ถูก","ความแม่น"]);
  {const cc=$("chChips");if(cc){cc.hidden=true;cc.innerHTML="";}}
  if(view==="exam"||view==="lrev")return legSheet();
  if(isAIV()||view==="admq")return admSheet();
  if(view==="mq")return mqSheet();
  if(isSess()){
    const s=P.sess,qs=s.list.map(u=>qAny(u)).filter(Boolean);
    $("sheetTitle").textContent=s.title;$("setChips").innerHTML="";
    const f=st.sessF||"all";
    $("statusChips").innerHTML=[["all","ทั้งหมด"],["todo",s.kind==="advisor"?"ยังไม่อ่าน":"ยังไม่ทำ"],["wrong",s.kind==="advisor"?"ล่าสุดผิด":"ตอบผิด"]].map(([v,t])=>`<button class="chip" aria-pressed="${f===v}" data-sf="${v}">${t}</button>`).join("");
    document.querySelectorAll("[data-sf]").forEach(b=>b.onclick=()=>{st.sessF=b.dataset.sf;persist();sheet();});
    const adv=s.kind==="advisor",A=q=>{if(!adv)return s.ans[q.uid];const h=hist(P,q.uid,s.hp,true);return h.length?h[h.length-1][0]:undefined;};
    const done=qs.filter(q=>s.ans[q.uid]!==undefined),right=adv?qs.filter(q=>A(q)===q.ans):done.filter(q=>s.ans[q.uid]===q.ans);
    stats(done.length,qs.length,right.length);
    const v=qs.map((q,i)=>[q,i]).filter(([q])=>{const a=s.ans[q.uid],b=A(q);return f==="todo"?a===undefined:f==="wrong"?b!==undefined&&b!==q.ans:true;});
    rows(v.map(([q,i])=>({q,a:A(q),lock:mLocked(i)?i+1:0,meta:adv&&s.ans[q.uid]!==undefined?"อ่านแล้ว · ":"",cur:i===s.cur,go:()=>{if(!qNavOK(i)){toast(navMsg());return;}pick=null;s.cur=i;save();rQuiz();window.scrollTo(0,0);}})),f==="wrong"?"ยังไม่มีข้อที่ตอบผิดในรอบนี้":"ทำครบทุกข้อในรอบนี้แล้ว");
    $("sheetFoot").innerHTML=`<span class="hint">เส้นเขียวรอบวง = เฉลย</span><span class="spacer"></span><span class="hint" id="syncNote" style="flex-basis:100%"></span><button class="link" id="toResult">จบรอบ ดูสรุป</button>`;
    $("toResult").onclick=()=>{closeS(true);go(ward+"/result");};
    paintSync();return;
  }
  $("sheetTitle").textContent=`กระดาษคำตอบ · Phase ${p}`;
  const sets=W.sets,sv=svcS();
  $("setChips").innerHTML=[["all",sv.set==="all"?"ทุกชุด":`ทุกชุด (เลือก ${selSets().length})`],...sets.map(k=>[k,(CFG.chipStrip?k.replace(CFG.chipStrip,""):k)])].map(([v,t])=>`<button class="chip" aria-pressed="${v==="all"?sv.set==="all":selSets().includes(v)}" data-set="${esc(v)}">${esc(t)}</button>`).join("");
  {const sc=$("setChips"),on=sc.querySelector('[aria-pressed="true"]');if(sheet._ok)sc.scrollLeft=sheet._x||0;if(on){const l=on.offsetLeft-sc.offsetLeft,r=l+on.offsetWidth;if(!sheet._ok||l<sc.scrollLeft||r>sc.scrollLeft+sc.clientWidth)sc.scrollLeft=l-sc.clientWidth/2+on.offsetWidth/2;}sheet._ok=1;sheet._x=sc.scrollLeft;sc.onscroll=()=>{sheet._x=sc.scrollLeft;};sc.onwheel=e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){sc.scrollLeft+=e.deltaY;e.preventDefault();}};}
  document.querySelectorAll("[data-set]").forEach(b=>b.onclick=()=>{const v=b.dataset.set;if(v==="all")sv.set="all";else{const c=selSets(),i=c.indexOf(v);if(i<0)c.push(v);else c.splice(i,1);c.sort((x,y)=>sets.indexOf(x)-sets.indexOf(y));sv.set=c.length?c.join("|"):"all";}P.pick=selSets();save();sheet();});
  /* chapter picker (e.g. YUZU) — shown only while a chaptered set is selected; slides like the set chips */
  {const cs=chSets(),cc=$("chChips");if(cs.length&&cc){const C=Object.assign({},...cs.map(k=>W.CHAP[k])),qs=W.QB.filter(q=>cs.includes(setKey(q))),chs=[...new Set(qs.map(chOf))].filter(c=>C[c]||qs.some(q=>chOf(q)===c)),sel=!sv.ch||sv.ch==="all"?[]:sv.ch.split("|");
    cc.innerHTML=[["all",sel.length?`ทุกบท (เลือก ${sel.length})`:"ทุกบท"],...chs.map(c=>[c,(/^\d+$/.test(c)?"บท "+c:c)+(C[c]?" · "+C[c]:"")])].map(([v,t])=>{const n=v==="all"?0:qs.filter(q=>chOf(q)===v).length,d=v==="all"?0:qs.filter(q=>chOf(q)===v&&lockedAns(P,p,q.uid)!==undefined).length;return `<button class="chip" aria-pressed="${v==="all"?!sel.length:sel.includes(v)}" data-ch="${esc(v)}" title="${esc(C[v]||"")}">${esc(t)}${v==="all"?"":` <span class="cnt">${d}/${n}</span>`}</button>`;}).join("");
    cc.hidden=false;
    if(sheet._cok)cc.scrollLeft=sheet._cx||0;else{const on=cc.querySelector('[aria-pressed="true"]:not([data-ch="all"])');if(on)cc.scrollLeft=on.offsetLeft-cc.offsetLeft-cc.clientWidth/2+on.offsetWidth/2;}sheet._cok=1;cc.onscroll=()=>{sheet._cx=cc.scrollLeft;};cc.onwheel=e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){cc.scrollLeft+=e.deltaY;e.preventDefault();}};
    cc.querySelectorAll("[data-ch]").forEach(b=>b.onclick=()=>{const v=b.dataset.ch;let c=!sv.ch||sv.ch==="all"?[]:sv.ch.split("|");if(v==="all")c=[];else if(c.includes(v))c=c.filter(x=>x!==v);else c.push(v);c.sort((x,y)=>chs.indexOf(x)-chs.indexOf(y));sv.ch=c.length?c.join("|"):"all";const cq=svcQ();if(cq&&!svcList().some(q=>q.uid===cq.uid)){const nx=svcVisible().find(q=>lockedAns(P,p,q.uid)===undefined)||svcVisible()[0];sv.cur=nx?nx.uid:null;}save();sheet();rQuiz();});}}
  const FS=[["all","ทั้งหมด"],["todo","ยังไม่ทำ"],["wrong","ตอบผิด"]].concat(p===2?[["right","ตอบถูก"],["flag","ไม่มั่นใจ"],["nop1","ไม่เคยทำใน P1"]]:[["flag","ไม่มั่นใจ"]]);
  if(!FS.some(x=>x[0]===sv.status))sv.status="all";
  $("statusChips").innerHTML=FS.map(([v,t])=>`<button class="chip" aria-pressed="${sv.status===v}" data-st="${v}">${t}</button>`).join("");
  document.querySelectorAll("[data-st]").forEach(b=>b.onclick=()=>{sv.status=b.dataset.st;save();sheet();});
  const pool=svcList(),done=pool.filter(q=>lockedAns(P,p,q.uid)!==undefined),right=done.filter(q=>lockedAns(P,p,q.uid)===q.ans);
  stats(done.length,pool.length,right.length);
  const cq=svcQ();
  rows(svcVisible().map(q=>{const p1=p===2?lastA(P,1,q.uid):null;return {q,a:lockedAns(P,p,q.uid),cur:cq&&q.uid===cq.uid,meta:p1?`P1${p1[0]===q.ans?"✓":"✗"} `:"",go:()=>{closeS();sv.cur=q.uid;pick=null;save();rQuiz();window.scrollTo(0,0);}};}),
    sv.status==="wrong"?"ยังไม่มีข้อที่ตอบผิดในชุดนี้":sv.status==="flag"?"ยังไม่มีข้อที่ทำเครื่องหมายไม่มั่นใจ":"ไม่มีข้อที่ตรงกับตัวกรองนี้");
  $("sheetFoot").innerHTML=`<span class="hint">เส้นเขียวรอบวง = เฉลย · แตะเลือกได้หลายชุด</span><span class="spacer"></span><span class="hint" id="syncNote" style="flex-basis:100%"></span>
   <button class="link" id="redoWrong">ทำข้อที่ผิดใหม่</button><button class="link" id="backup">ส่งลิงก์ความคืบหน้า</button><button class="link" id="restore">นำเข้า</button><button class="link" id="reset">ล้างกระดาษคำตอบ</button>`;
  $("redoWrong").onclick=async()=>{const w=pool.filter(q=>{const a=lockedAns(P,p,q.uid);return a!==undefined&&a!==q.ans;});if(!w.length){uiAlert("ยังไม่มีข้อที่ตอบผิดในชุดนี้");return;}
    if(await uiAsk(`เปิดข้อที่ตอบผิด ${w.length} ข้อให้ทำใหม่? (ข้อที่ถูกยังอยู่ ประวัติการตอบยังเก็บไว้)`)){const t=now();w.forEach(q=>{P.open[p][q.uid]=t;});sv.status="todo";save();sheet();rQuiz();}};
  $("backup").onclick=exportLink;$("restore").onclick=importPrompt;
  $("reset").onclick=async()=>{if(await uiAsk(`ล้างกระดาษคำตอบ Phase ${p} ของชุดที่เลือก แล้วเริ่มทำใหม่? (ประวัติการตอบยังเก็บไว้ใช้กับ Ward staff round)`)){const t=now();pool.forEach(q=>{P.open[p][q.uid]=t;});sv.status="all";pick=null;save();sheet();rQuiz();}};
  paintSync();
}
/* ---------------- search inside the answer sheet: every word typed must appear (any order, any case) — question, choices, recall text, topic/tags; plus the explanation once the question has been answered ---------------- */
let sheetQ="";
function srchNorm(s){return String(s==null?"":s).replace(/<[^>]+>/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').toLowerCase().replace(/\s+/g," ");}
function srchTerms(q){return srchNorm(q).trim().split(" ").filter(Boolean);}
function srchHit(text,terms){if(!terms.length)return true;const t=srchNorm(text);return terms.every(w=>t.includes(w));}
function flatTxt(v){return v==null?"":typeof v==="string"||typeof v==="number"?String(v):Array.isArray(v)?v.map(flatTxt).join(" "):typeof v==="object"?Object.values(v).map(flatTxt).join(" "):"";}
function qSearchText(q,rev,bare){if(!q)return "";const W=W_();let t=[q.stem,q.opts,bare?"":q.gray,q.imgNote].map(flatTxt).join(" ");   /* bare = Legendary exam in progress: only what the exam page shows (no recall text, tags or explanations) */
  if(!bare){try{t+=" "+(W&&!q.unit?topicOf(W,q):flatTxt(q.topic))+" "+flatTxt(qTags(q));}catch(e){t+=" "+flatTxt(q.tags)+" "+flatTxt(q.topic);}}
  if(rev)t+=" "+["key","interp","why","wrong","trap","summary","notes","mnemonic","guide","opinion","variants","outside","exp","src","flag"].map(k=>flatTxt(q[k])).join(" ");
  return t;}
function sheetQPaint(n,tot){const el=$("sheetQn");if(el)el.textContent=srchTerms(sheetQ).length?`พบ ${n}${tot!=null?"/"+tot:""} ข้อ`:"";}
{const qi=$("sheetQ");if(qi){let tm=0;qi.addEventListener("input",()=>{clearTimeout(tm);tm=setTimeout(()=>{sheetQ=qi.value;sheet();},140);});}}
function stats(d,n,r){$("sDone").textContent=`${d}/${n}`;$("sRight").textContent=r;$("sPct").textContent=d?Math.round(r/d*100)+"%":"–";}
function rows(list,empty){
  {const T=srchTerms(sheetQ),tot=list.length;if(T.length){list=list.filter(x=>!x.lock&&srchHit(qSearchText(x.q,x.rev||(x.a!==undefined&&x.a!==null)),T));if(!list.length)empty=`ไม่พบข้อที่มีคำว่า “${esc(sheetQ.trim())}” ในกระดาษคำตอบนี้`;}sheetQPaint(list.length,tot);}
  if(!list.length){$("rows").innerHTML=`<div class="empty">${empty}</div>`;return;}
  $("rows").innerHTML=list.map((x,i)=>{const q=x.q,a=x.a;
    if(x.lock)return `<button class="srow lock" data-r="${i}"><span class="n">${x.lock}</span><span class="bs">${[0,1,2,3,4].map(j=>`<span class="b">${L[j]}</span>`).join("")}</span><span class="meta">🔒 ยังไม่ถึงข้อนี้</span></button>`;const bs=[0,1,2,3,4].map(j=>{let c="b";if(a===j)c+=" f "+(j===q.ans?"ok":"no");else if(a!==undefined&&j===q.ans)c+=" k";return `<span class="${c}">${L[j]}</span>`;}).join("");
    return `<button class="srow ${x.cur?"cur":""}" data-r="${i}"><span class="n">${q.id}</span><span class="bs">${bs}</span><span class="meta">${x.meta||""}${esc(q.set)} ${esc(q.ro)}${((W_()||{}).CHAP||{})[setKey(q)]?" · "+esc(q.orig):""}${flagged(P_(),q.uid)?" ⚑":""}</span></button>`;}).join("");
  document.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{const x=list[+b.dataset.r];if(x.lock){toast(navMsg());return;}closeS();x.go();});
}
function openS(){sheet._ok=0;sheet._cok=0;sheet();$("overlay").classList.add("open");const c=document.querySelector(".srow.cur,.crow.cur");if(c)c.scrollIntoView({block:"center"});$("closeSheet").focus();}
function closeS(silent){$("overlay").classList.remove("open");if(!silent&&!$("openSheet").hidden)$("openSheet").focus();}
$("openSheet").onclick=openS;$("closeSheet").onclick=()=>closeS();
$("overlay").addEventListener("click",e=>{if(e.target.id==="overlay")closeS();});

/* ---------------- keyboard ---------------- */
document.addEventListener("keydown",e=>{
  if($("overlay").classList.contains("open")){if(e.key==="Escape")closeS();return;}
  if(!["svc","sess","adm","spc","exam","lrev","admq"].includes(view))return;
  const tg=e.target;if(tg&&(tg.tagName==="INPUT"||tg.tagName==="TEXTAREA"||tg.isContentEditable))return;
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(view==="exam"){const k=e.key.toUpperCase(),i="ABCDE".indexOf(k),n="12345".indexOf(e.key);if(i>=0||n>=0){legPick(i>=0?i:n);return;}if(e.key==="ArrowRight")step(1);if(e.key==="ArrowLeft")step(-1);return;}
  const q=curQ();if(!q)return;
  if(q.notice){const i="ABCDE".indexOf(e.key.toUpperCase()),n="12345".indexOf(e.key);if((i>=0&&i<q.opts.length)||(n>=0&&n<q.opts.length))noteGo(q);else if(e.key==="ArrowRight")step(1);return;}
  const locked=doneAns(q)!==undefined;
  const k=e.key.toUpperCase(),idx="ABCDE".indexOf(k),nidx="12345".indexOf(e.key);
  if(!locked&&(idx>=0||nidx>=0)){pick=idx>=0?idx:nidx;rQuiz();return;}
  if(e.key==="Enter"&&!locked&&pick!==null&&!(tg.classList&&tg.classList.contains("opt"))){confirmAns();return;}
  if(e.key==="ArrowRight")step(1);if(e.key==="ArrowLeft")step(-1);
});

/* ---------------- progress link export / import ---------------- */
const SITE=(()=>{try{if(!IN_FRAME&&/^https?:$/.test(location.protocol))return location.origin+location.pathname;}catch(e){}return CFG.siteUrl||"";})();
/* "all" link: every ward, both phases (answer sequences, last 20 each), ⚑ flags.
   format  #all=<ward>:<entry>,<entry>~<ward>:…   entry = <7-char hash of uid><P1 answers>[-<P2 answers>][!]  */
const SEQMAX=20;
function encodeAll(){const parts=[];
  WL.forEach(w=>{const W=WARDS[w.id];if(!W||!st.w[w.id])return;const P=PWof(st,w.id),es=[];
    W.QB.forEach(q=>{const u=q.uid,a1=atts(P,1,u).slice(-SEQMAX).map(x=>x[0]).join(""),a2=atts(P,2,u).slice(-SEQMAX).map(x=>x[0]).join(""),f=flagged(P,u);
      if(!a1&&!a2&&!f)return;es.push(H7(u)+a1+(a2||f?"-"+a2:"")+(f?"!":""));});
    if(es.length)parts.push(w.id+":"+es.join(","));});
  return parts.join("~");}
function decodeAll(str){const out={};let n=0;
  String(str||"").split("~").forEach(part=>{const k=part.indexOf(":");if(k<1)return;const w=part.slice(0,k),W=WARDS[w];if(!W)return;
    const m={};W.QB.forEach(q=>{m[H7(q.uid)]=q.uid;});const o={};
    part.slice(k+1).split(",").forEach(e=>{const r=/^([0-9a-z]{7})([0-4]*)(?:-([0-4]*))?(!)?$/.exec(e);if(!r||!m[r[1]])return;
      o[m[r[1]]]={1:r[2].split("").map(Number),2:(r[3]||"").split("").map(Number),f:!!r[4]};n++;});
    if(Object.keys(o).length)out[w]=o;});
  return {data:out,n};}
function applyAll(data,replace){let t=now();
  for(const w in data){const P=PWof(st,w),o=data[w];
    if(replace){P.att={1:{},2:{}};P.open={1:{},2:{}};P.flag={};}
    for(const u in o){[1,2].forEach(p=>{const seq=o[u][p];if(!seq.length)return;const cur=atts(P,p,u);
        if(replace||seq.length>cur.length)P.att[p][u]=seq.map(a=>[a,t++]);});
      if(o[u].f)P.flag[u]=[1,t++];}}
  save();}
function shareLink(link,title){(async()=>{if(navigator.share){try{await navigator.share({title,url:link});return;}catch(e){if(e&&e.name==="AbortError")return;}}
  try{await navigator.clipboard.writeText(link);uiAlert("คัดลอกลิงก์ความคืบหน้าแล้ว — เปิดลิงก์นี้บนเครื่องใหม่เพื่อนำความคืบหน้าไปด้วย");}catch(e){uiCopy("คัดลอกลิงก์นี้ไปเปิดบนเครื่องใหม่:",link);}})();}
function exportLink(){const d=encodeAll();if(!d){uiAlert("ยังไม่มีคำตอบให้ส่ง");return;}
  if(!SITE){const code="AC-PROGRESS:"+d;(async()=>{try{await navigator.clipboard.writeText(code);uiAlert("คัดลอกรหัสความคืบหน้าแล้ว — บนเครื่องใหม่กด \"นำเข้าลิงก์ / รหัส\" แล้ววางรหัสนี้");}catch(e){uiCopy("คัดลอกรหัสนี้ไปวางบนเครื่องใหม่ (ปุ่มนำเข้าลิงก์ / รหัส):",code);}})();return;}
  shareLink(SITE+"#all="+d,"ความคืบหน้า "+(CFG.siteName||""));}
/* older single-phase links: #p=[ward.]<hash7+answer>… (also made by the artifact in Claude) */
function decodeP(w,p){const W=WARDS[w];if(!W)return {};const m={};W.QB.forEach(q=>{m[H7(q.uid)]=q.uid;});const o={};p=String(p).replace(/[^0-9a-z]/g,"");for(let i=0;i+8<=p.length;i+=8){const u=m[p.slice(i,i+7)],v=+p[i+7];if(u&&v>=0&&v<5)o[u]=v;}return o;}
function applyImport(w,o){const P=PWof(st,w),p=ph(),t=now();let n=0;Object.keys(o).forEach(u=>{const a=lastA(P,p,u);if(!a||a[0]!==o[u]){(P.att[p][u]=P.att[p][u]||[]).push([o[u],t]);n++;}});save();return n;}
const askMode=n=>uiAsk(`นำเข้าความคืบหน้า ${n} ข้อ (ทุกวอร์ด ทุก Phase)\n\nกด OK = รวมกับของเครื่องนี้ (ข้อไหนทำในเครื่องนี้มากกว่า จะเก็บของเครื่องนี้ไว้)\nกด Cancel = ไม่นำเข้า`);
function afterImport(){toast("นำเข้าเรียบร้อย");route();}
async function importText(c){
  const a=/(?:[#&]all=|AC-PROGRESS:)([0-9a-z:,~!_-]*)/.exec(c);
  if(a){const r=decodeAll(a[1]);if(!r.n){uiAlert("ลิงก์ไม่ถูกต้อง หรือไม่ตรงกับข้อในคลังนี้");return;}if(await askMode(r.n)){applyAll(r.data,false);afterImport();}return;}
  const m=/[#&]p=(?:([a-z0-9_-]+)\.)?([0-9a-z]+)/.exec(c);let o={},w=ward||WL[0].id;
  if(m){w=m[1]&&WARDS[m[1]]?m[1]:w;o=decodeP(w,m[2]);}
  else{try{const x=JSON.parse(decodeURIComponent(escape(atob(String(c).trim()))));if(x&&x.a)o=x.a;}catch(e){}}
  const n=Object.keys(o).length;if(!n){uiAlert("ลิงก์หรือรหัสไม่ถูกต้อง หรือไม่ตรงกับข้อในคลังนี้");return;}
  if(await uiAsk(`ลิงก์/รหัสแบบเก่า มีความคืบหน้า ${n} ข้อของวอร์ด ${WARDS[w].cfg.name} — นำเข้าเข้า Phase ${ph()} ของเครื่องนี้?`)){applyImport(w,o);afterImport();}}
async function importPrompt(){const c=await uiInput("วางลิงก์หรือรหัสความคืบหน้าที่สำรองไว้:");if(c)importText(c);}
function checkHashImport(){const h=location.hash||"";if(!/[#&](all|p)=/.test(h))return false;
  try{history.replaceState(null,"",location.pathname+location.search+"#/");}catch(e){location.hash="#/";}
  setTimeout(()=>importText(h),300);return true;}
/* full backup file: everything incl. typed notes and handwriting */
async function exportFile(){
  const blob=new Blob([JSON.stringify({kind:"ac-mcq-backup",v:3,site:CFG.siteName||"",t:now(),st,ink,bank})],{type:"application/json"});
  const d=new Date(),fn=`ac-mcq-backup-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}.json`;
  if(HAS_CLAUDE()){try{const dl=await window.claude.use("downloads");if(dl){try{await dl.save({filename:fn,data:blob});return;}catch(e){const c=e&&e.code;if(c==="declined")return;if(!["unavailable","not_granted","capability_disabled","capability_removed"].includes(c)){toast("บันทึกไฟล์ไม่สำเร็จ"+(c?" ("+c+")":""));return;}}}}catch(e){}}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=fn;
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}
function importFile(){
  const i=document.createElement("input");i.type="file";i.accept=".json,application/json";
  i.onchange=async()=>{const f=i.files&&i.files[0];if(!f)return;let o;try{o=JSON.parse(await f.text());}catch(e){o=null;}
    if(!o||o.kind!=="ac-mcq-backup"||!o.st){uiAlert("ไฟล์นี้ไม่ใช่ไฟล์สำรองของเว็บนี้");return;}
    if(!await uiAsk("นำเข้าไฟล์สำรอง? จะรวมกับข้อมูลในเครื่องนี้ (คำตอบรวมกัน โน้ตใช้ฉบับที่แก้ล่าสุด)"))return;
    mergeSt(st,o.st);const ks=[];for(const k in o.ink||{}){if(!ink[k]||(o.ink[k].ts||0)>(ink[k].ts||0)){ink[k]=o.ink[k];ks.push(k);}}
    try{localStorage.setItem(IKEY,JSON.stringify(ink));}catch(e){toast("พื้นที่เก็บข้อมูลในเบราว์เซอร์เต็ม");}
    const bs=bankMerge(o.bank);
    save();ks.forEach(k=>cloudInk(k));bs.forEach(k=>cloudBank(k));afterImport();};
  i.click();}

/* ---------------- accounts (Firebase, optional) ---------------- */
let fb=null,fbFail=false,pushT=null,inkT=null;const inkDirty=new Set();let sync="local";
/* When the page runs as an artifact inside claude.ai, progress syncs to the viewer's Claude account (db + user capabilities). */
let cl=null;
const HAS_CLAUDE=()=>!!(window.claude&&typeof window.claude.use==="function");
/* confirm / prompt / alert: the Claude page runs in a sandbox where the browser's own pop-ups are blocked (they return at once with "Cancel"),
   so inside Claude these show an in-page dialog instead; the website keeps the browser's own. All return a Promise. */
function uiDlg(msg,o){o=o||{};return new Promise(ok=>{const d=document.createElement("div");d.className="mqdlg uidlg";d.setAttribute("role","dialog");
  d.innerHTML=`<div class="mqdlg-box"><p class="uimsg"></p>${o.input!==undefined?(o.ro?`<textarea class="uiin" rows="4" readonly></textarea>`:`<input class="uiin" type="text">`):""}<div class="dlg-act">${o.cancel!==null?`<button class="btn ghost" data-u="0" type="button"></button>`:""}<button class="btn primary" data-u="1" type="button"></button></div></div>`;
  d.querySelector(".uimsg").textContent=msg;const inp=d.querySelector(".uiin");if(inp){inp.value=o.input||"";}
  const b0=d.querySelector('[data-u="0"]'),b1=d.querySelector('[data-u="1"]');if(b0)b0.textContent=o.cancel||"ยกเลิก";b1.textContent=o.ok||"ตกลง";
  const done=v=>{d.remove();document.removeEventListener("keydown",kd,true);ok(v);},kd=e=>{if(e.key==="Escape"){e.stopPropagation();done(o.input!==undefined?null:false);}else if(e.key==="Enter"&&inp&&!o.ro){e.preventDefault();done(inp.value);}};
  if(b0)b0.onclick=()=>done(o.input!==undefined?null:false);b1.onclick=()=>done(o.input!==undefined?(o.ro?true:inp.value):true);
  d.addEventListener("click",e=>{if(e.target===d&&o.cancel!==null)done(o.input!==undefined?null:false);});document.addEventListener("keydown",kd,true);
  document.body.appendChild(d);setTimeout(()=>{if(inp){inp.focus();inp.select();}else b1.focus();},30);});}
const uiAsk=(m,o)=>HAS_CLAUDE()?uiDlg(m,o):Promise.resolve(confirm(m));
const uiInput=(m,v)=>HAS_CLAUDE()?uiDlg(m,{input:v||""}):Promise.resolve(prompt(m,v||""));
const uiAlert=m=>HAS_CLAUDE()?uiDlg(m,{cancel:null}):Promise.resolve(alert(m));
/* open the website in a new tab: inside Claude a click that happens after an await is not allowed to open a tab,
   so there it shows a dialog with a real link to tap (plus copy); on the website it opens straight away */
function openOut(url){
  if(!HAS_CLAUDE()){const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener";document.body.appendChild(a);a.click();a.remove();return;}
  const d=document.createElement("div");d.className="mqdlg uidlg";d.innerHTML=`<div class="mqdlg-box"><h3>เปิดเว็บ</h3><p>แตะปุ่มด้านล่างเพื่อเปิดเว็บในแท็บใหม่ แล้วข้อมูลจะเข้าเว็บเอง (ลิงก์ยาว ${Math.max(1,Math.round(url.length/1024))} KB)</p>
    <a class="btn primary" href="${esc(url)}" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none">เปิดเว็บ ↗</a>
    <button class="btn" type="button" data-oc style="width:100%;margin-top:8px">คัดลอกลิงก์ (ถ้าเปิดไม่ขึ้น)</button><textarea class="uiin" rows="3" readonly hidden></textarea>
    <div class="dlg-act" style="margin-top:10px"><button class="btn ghost" type="button" data-ox>ปิด</button></div></div>`;
  document.body.appendChild(d);const ta=d.querySelector("textarea");ta.value=url;
  d.querySelector("a").addEventListener("click",()=>setTimeout(()=>d.remove(),300));d.querySelector("[data-ox]").onclick=()=>d.remove();
  d.querySelector("[data-oc]").onclick=async()=>{try{await navigator.clipboard.writeText(url);toast("คัดลอกลิงก์แล้ว — ไปวางในเบราว์เซอร์");}catch(e){ta.hidden=false;ta.focus();ta.select();try{document.execCommand("copy");toast("คัดลอกลิงก์แล้ว");}catch(x){toast("กดค้างที่ลิงก์แล้วเลือกคัดลอก");}}};}
/* a link the reader copies by hand when the clipboard is not allowed */
const uiCopy=(m,t)=>HAS_CLAUDE()?uiDlg(m,{input:t,ro:true,cancel:null,ok:"ปิด"}):Promise.resolve(prompt(m,t));
const fbOn=()=>!!(CFG.firebase&&CFG.firebase.apiKey)&&!HAS_CLAUDE();   /* inside Claude the Claude account is the sync, Firebase sign-in is for the GitHub site only */
function paintAcct(){const b=$("acctBtn");b.hidden=view==="signin";
  if(cl){b.classList.add("on");b.textContent="☁️";b.title=b.ariaLabel="บันทึกในบัญชี Claude";}
  else if(fb&&fb.user){b.classList.add("on");b.textContent="☁️";b.title=b.ariaLabel="บัญชี: "+who(fb.user);}else{b.classList.remove("on");b.textContent="👤";b.title=b.ariaLabel="เข้าสู่ระบบ";}
  paintSync();}
$("acctBtn").onclick=()=>go("signin");
function paintSync(){const el=$("syncNote");if(!el)return;
  if(cl)el.textContent=sync==="error"?"⚠️ ซิงก์กับบัญชี Claude ไม่สำเร็จ — ยังบันทึกในเครื่องนี้อยู่":sync==="saving"?"☁️ กำลังบันทึก…":"☁️ บันทึกในบัญชี Claude แล้ว · ใช้ได้ทุกเครื่อง";
  else if(fb&&fb.user)el.textContent=sync==="error"?"⚠️ ซิงก์กับบัญชีไม่สำเร็จ — ยังบันทึกในเครื่องนี้อยู่":sync==="saving"?"☁️ กำลังบันทึก…":"☁️ บันทึกในบัญชีแล้ว · ใช้ได้ทุกเครื่อง";
  else el.textContent=fbOn()?"💾 บันทึกในเบราว์เซอร์นี้ — เข้าสู่ระบบเพื่อใช้หลายเครื่อง":"💾 บันทึกในเบราว์เซอร์นี้ — ย้ายเครื่องได้ด้วยปุ่ม \"ส่งลิงก์ความคืบหน้า\"";}
async function initFB(){
  if(!fbOn())return;
  try{
    const b="https://www.gstatic.com/firebasejs/10.12.2/";
    const [ap,au,fs]=await Promise.all([import(b+"firebase-app.js"),import(b+"firebase-auth.js"),import(b+"firebase-firestore.js")]);
    const app=ap.initializeApp(CFG.firebase);
    fb={au,fs,auth:au.getAuth(app),db:fs.getFirestore(app),user:null};loadShared();
    try{await au.setPersistence(fb.auth,au.browserLocalPersistence);}catch(e){}
    au.getRedirectResult(fb.auth).then(r=>{if(r&&r.user)markTrusted();}).catch(e=>{authErr=errMsg(e);});
    au.onAuthStateChanged(fb.auth,async u=>{
      fb.user=u;
      if(u){sync="saving";paintAcct();try{await pull();sync="cloud";}catch(e){console.warn(e);sync="error";}flushSharePend();}else sync="local";
      paintAcct();if(view==="signin"||view==="wards"||view==="home")route();else if(view==="svc"||view==="sess")rQuiz();
    });
  }catch(e){console.warn("firebase",e);fb=null;fbFail=true;if(view==="signin")rSignin();}
}
/* account data lives at users/{uid} (MDCU); another institution keeps its own copy under it (config fbPath, e.g. SI = users/{uid}/inst/si) so the two websites never mix progress */
const FBP=()=>(CFG.fbPath||["users","{uid}"]).map(x=>x==="{uid}"?fb.user.uid:x);
const uref=()=>fb.fs.doc(fb.db,...FBP());
const inkCol=()=>fb.fs.collection(fb.db,...FBP(),"ink");
const inkId=k=>"i"+H7(k)+H7(k+"#");
const bankCol=()=>fb.fs.collection(fb.db,...FBP(),"bank");
function newer(dst,src){for(const k in src||{}){const s=src[k],d=dst[k];const ts=x=>x?((Array.isArray(x)?x[1]:x.ts)||0):-1;if(!d||ts(s)>ts(d))dst[k]=s;}}
function mergeSt(a,b){
  if(!b||!b.w)return;
  for(const id in b.w){const r=PWof(b,id),l=PWof(a,id);
    [1,2].forEach(p=>{
      for(const u in r.att[p]){const m=new Map();(l.att[p][u]||[]).concat(r.att[p][u]).forEach(x=>m.set(x[1]+":"+x[0],x));l.att[p][u]=[...m.values()].sort((x,y)=>x[1]-y[1]);}
      newer(l.pre[p],r.pre[p]);newer(l.reset[p],r.reset[p]);
      for(const u in r.open[p])l.open[p][u]=Math.max(l.open[p][u]||0,r.open[p][u]);
    });
    for(const u in r.unit.att){const m=new Map();(l.unit.att[u]||[]).concat(r.unit.att[u]).forEach(x=>m.set(x[1]+":"+x[0],x));l.unit.att[u]=[...m.values()].sort((x,y)=>x[1]-y[1]);}
    [1,2].forEach(p=>{const a=l.morn[p],c=r.morn[p];if(!c)return;
      if(a&&a.day===c.day&&(a.list||[]).join()===(c.list||[]).join()){a.ans=Object.assign({},c.ans,a.ans);if(a.ot||c.ot)a.ot=Object.assign({},c.ot,a.ot);}
      else if(!a||c.day>a.day||(c.day===a.day&&(c.ts||0)>(a.ts||0)))l.morn[p]=c;});
    mornOne(l);
    for(const k in r.mornH){const a=l.mornH[k],c=r.mornH[k];if(!a)l.mornH[k]=c;else if((a.list||[]).join()===(c.list||[]).join()){a.ans=Object.assign({},c.ans,a.ans);if(a.ot||c.ot)a.ot=Object.assign({},c.ot,a.ot);}else if((c.ts||0)>(a.ts||0))l.mornH[k]=c;}
    if((r.adm.ts||0)>(l.adm.ts||0))l.adm=r.adm;
    for(const u in r.seen){const a=l.seen[u]||(l.seen[u]={}),b=r.seen[u];for(const k in b)a[k]=a[k]?Math.min(a[k],b[k]):b[k];}
    if(r.leg&&!bank["leg|"+id+"|"+r.leg.id]){if(!l.leg)l.leg=r.leg;else if(l.leg.id===r.leg.id){l.leg.ans=Object.assign({},r.leg.ans,l.leg.ans);l.leg.star=Object.assign({},r.leg.star,l.leg.star);}}
    if(l.leg&&bank["leg|"+id+"|"+l.leg.id])l.leg=null;
    if(r.lcCur&&!l.lcCur)l.lcCur=r.lcCur;
    if(r.advPlan&&(!l.advPlan||(r.advPlan.ts||0)>(l.advPlan.ts||0)))l.advPlan=r.advPlan;
    newer(l.flag,r.flag);newer(l.post,r.post);newer(l.skeep,r.skeep||{});
    for(const k in r.ioSeen||{})l.ioSeen[k]=Math.max(l.ioSeen[k]||0,r.ioSeen[k]);
    ["MEQ","OSCE"].forEach(K=>{const a=mqInitP(l,K),c=mqInitP(r,K);newer(a.a1,c.a1);newer(a.a2,c.a2);newer(a.star,c.star);if((c.v.ts||0)>(a.v.ts||0))l[K==="OSCE"?"osce":"meq"].v=c.v;});
    osMerge(l,r);
    if((b.t||0)>(a.t||0)){l.svc=r.svc;l.type=r.type;l.pick=r.pick;}
    if(r.sess&&(!l.sess||(r.sess.ts||0)>(l.sess.ts||0)))l.sess=r.sess;
  }
  if((b.t||0)>(a.t||0)){a.phase=b.phase===2?2:1;a.noteMode=b.noteMode||a.noteMode;if(b.qp)a.qp=b.qp;["staffAll","legAI","clStart","lastWard"].forEach(k=>{if(b[k]!==undefined&&b[k]!=="")a[k]=b[k];});}
  ["staffAll","legAI","clStart","lastWard"].forEach(k=>{if(a[k]===undefined&&b[k]!==undefined)a[k]=b[k];});
  if(b.wcfg){a.wcfg=a.wcfg||{};for(const k in b.wcfg){const x=b.wcfg[k];if(x&&(!a.wcfg[k]||(x.ts||0)>(a.wcfg[k].ts||0)))a.wcfg[k]=x;}}
  if(b.grades){a.grades=a.grades||{};for(const k in b.grades){const x=b.grades[k];if(x&&(!a.grades[k]||(x.ts||0)>(a.grades[k].ts||0)))a.grades[k]=x;}}
  if(!a.qp&&b.qp)a.qp=b.qp;
  if(b.lastRoute&&(b.lastRouteT||0)>(a.lastRouteT||0)){a.lastRoute=b.lastRoute;a.lastRouteT=b.lastRouteT;}
  a.t=Math.max(a.t||0,b.t||0);
}
async function pull(){
  const {fs}=fb;
  const snap=await fs.getDoc(uref());
  if(snap.exists()){const d=snap.data();try{const r=JSON.parse(d.d||"null");if(r)mergeSt(st,r);}catch(e){}}
  const remoteTs={};
  const is=await fs.getDocs(inkCol());
  is.forEach(x=>{const d=x.data();if(!d||!d.k)return;try{const v=JSON.parse(d.d);remoteTs[d.k]=v.ts||0;if(!ink[d.k]||(v.ts||0)>(ink[d.k].ts||0))ink[d.k]=v;}catch(e){}});
  const bTs={};
  try{const bs=await fs.getDocs(bankCol());bs.forEach(x=>{const d=x.data();if(!d||!d.k)return;try{const v=JSON.parse(d.d);bTs[d.k]=v.ts||0;if(!bank[d.k]||(v.ts||0)>(bank[d.k].ts||0))bank[d.k]=v;}catch(e){}});}catch(e){console.warn(e);}
  try{localStorage.setItem(KEY,JSON.stringify(st));localStorage.setItem(IKEY,JSON.stringify(ink));localStorage.setItem(BKEY,JSON.stringify(bank));}catch(e){}
  await pushNow();
  Object.keys(ink).forEach(k=>{if((ink[k].ts||0)>(remoteTs[k]||0))inkDirty.add(k);});
  await flushInk();
  Object.keys(bank).forEach(k=>{if((bank[k].ts||0)>(bTs[k]||0))bankDirty.add(k);});
  await flushBank();
}
async function pushNow(){if(!fb||!fb.user)return;clearTimeout(pushT);sync="saving";paintSync();
  try{await fb.fs.setDoc(uref(),{d:JSON.stringify(st),t:st.t||now(),v:3});sync="cloud";}catch(e){console.warn(e);sync="error";}paintSync();}
function cloudPush(){if(cl){clearTimeout(pushT);pushT=setTimeout(clPush,1500);return;}if(!fb||!fb.user)return;clearTimeout(pushT);pushT=setTimeout(pushNow,1500);}
async function flushInk(){if(!fb||!fb.user)return;clearTimeout(inkT);const ks=[...inkDirty];inkDirty.clear();
  for(const k of ks){try{if(ink[k])await fb.fs.setDoc(fb.fs.doc(inkCol(),inkId(k)),{k,d:JSON.stringify(ink[k]),ts:ink[k].ts||now()});}catch(e){console.warn(e);inkDirty.add(k);sync="error";}}paintSync();}
async function flushBank(){if(!fb||!fb.user)return;clearTimeout(bankT);const ks=[...bankDirty];bankDirty.clear();
  for(const k of ks){try{if(bank[k])await fb.fs.setDoc(fb.fs.doc(bankCol(),inkId(k)),{k,d:JSON.stringify(bank[k]),ts:bank[k].ts||now()});}catch(e){console.warn(e);bankDirty.add(k);sync="error";}}paintSync();}
function cloudBank(k){bankDirty.add(k);clearTimeout(bankT);if(cl){bankT=setTimeout(clBank,1500);return;}if(!fb||!fb.user)return;bankT=setTimeout(flushBank,1500);}
function cloudInk(k){if(cl){inkDirty.add(k);clearTimeout(inkT);inkT=setTimeout(clInk,2000);return;}if(!fb||!fb.user)return;inkDirty.add(k);clearTimeout(inkT);inkT=setTimeout(flushInk,2000);}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState!=="hidden")return;if(cl){clPush();clInk();clBank();}else if(fb&&fb.user){pushNow();flushInk();flushBank();}});

/* ---- Claude account backend: docs in data/users/<id>/ — "meta", "w_<ward>" (one per ward, < 256 KiB each), "ink_<hash>" ---- */
async function initClaude(){
  try{
    const [db,user]=await Promise.all([window.claude.use("db"),window.claude.use("user")]);
    if(!db||!user)return;const uid=await user.id();if(!uid)return;
    cl={db,col:"data/users/"+uid,bcol:"data/bank/"+uid};sync="saving";paintAcct();
    await clPull();sync="cloud";
  }catch(e){console.warn("claude sync",e);if(cl)sync="error";}
  paintAcct();if(view==="svc"||view==="sess")rQuiz();else if(view==="wards"&&!(location.hash||"").replace(/^#\/?/,"")&&startPath())go(startPath());else route();
}
async function clPull(){
  const snap=await cl.db.collection(cl.col).limit(1000).get();
  const r={w:{},t:0},rts={};let old=null;
  snap.docs.forEach(d=>{const id=d.id,x=d.data()||{};try{
    if(id==="meta"){const m=JSON.parse(x.d||"{}");r.phase=m.phase;r.noteMode=m.noteMode;if(m.qp)r.qp=m.qp;if(m.lastRoute){r.lastRoute=m.lastRoute;r.lastRouteT=m.lastRouteT||0;}["staffAll","legAI","clStart","lastWard"].forEach(k=>{if(m[k]!==undefined&&m[k]!=="")r[k]=m[k];});if(m.grades)r.grades=m.grades;if(m.wcfg)r.wcfg=m.wcfg;r.t=Math.max(r.t,x.t||0);}
    else if(id==="progress"&&Array.isArray(x.a))old=x;   /* progress saved by the earlier single-page artifact */
    else if(id.startsWith("w_")){r.w[id.slice(2)]=JSON.parse(x.d||"{}");r.t=Math.max(r.t,x.t||0);}
    else if(id.startsWith("ink_")&&x.k){const v=JSON.parse(x.d);rts[x.k]=v.ts||0;if(!ink[x.k]||(v.ts||0)>(ink[x.k].ts||0))ink[x.k]=v;}
  }catch(e){}});
  if(old){const R=PWof(r,WL[0].id),t=old.t||1;old.a.forEach(([u,a])=>{if(typeof a==="number"&&!(R.att[1][u]&&R.att[1][u].length))R.att[1][u]=[[a,t]];});}
  mergeSt(st,r);
  try{localStorage.setItem(KEY,JSON.stringify(st));localStorage.setItem(IKEY,JSON.stringify(ink));}catch(e){}
  await clPush();
  Object.keys(ink).forEach(k=>{if((ink[k].ts||0)>(rts[k]||0))inkDirty.add(k);});
  await clInk();
  const bts={};
  try{const bs=await cl.db.collection(cl.bcol).limit(1000).get();bs.docs.forEach(d=>{const x=d.data()||{};if(!x.k)return;try{const v=JSON.parse(x.d);bts[x.k]=v.ts||0;if(!bank[x.k]||(v.ts||0)>(bank[x.k].ts||0))bank[x.k]=v;}catch(e){}});
    localStorage.setItem(BKEY,JSON.stringify(bank));}catch(e){console.warn("bank",e);}
  Object.keys(bank).forEach(k=>{if((bank[k].ts||0)>(bts[k]||0))bankDirty.add(k);});
  await clBank();
}
async function clBank(){if(!cl)return;clearTimeout(bankT);const ks=[...bankDirty];bankDirty.clear();
  for(const k of ks){try{if(bank[k])await cl.db.doc(cl.bcol+"/"+inkId(k)).set({k,d:JSON.stringify(bank[k]),ts:bank[k].ts||now()});}catch(e){console.warn(e);bankDirty.add(k);sync="error";}}paintSync();}
let clBusy=false,clAgain=false;
async function clPush(){if(!cl)return;clearTimeout(pushT);if(clBusy){clAgain=true;return;}clBusy=true;sync="saving";paintSync();
  try{const t=st.t||now();
    await cl.db.doc(cl.col+"/meta").set({d:JSON.stringify({phase:st.phase,noteMode:st.noteMode||"",lastWard:st.lastWard||"",qp:st.qp||null,lastRoute:st.lastRoute||"",lastRouteT:st.lastRouteT||0,staffAll:st.staffAll,legAI:st.legAI,clStart:st.clStart,grades:st.grades||{},wcfg:st.wcfg||{}}),t});
    for(const id in st.w)await cl.db.doc(cl.col+"/w_"+id).set({d:JSON.stringify(st.w[id]),t});
    sync="cloud";}catch(e){console.warn(e);sync="error";}
  clBusy=false;paintSync();if(clAgain){clAgain=false;clPush();}}
async function clInk(){if(!cl)return;clearTimeout(inkT);const ks=[...inkDirty];inkDirty.clear();
  for(const k of ks){try{if(ink[k])await cl.db.doc(cl.col+"/ink_"+inkId(k)).set({k,d:JSON.stringify(ink[k]),ts:ink[k].ts||now()});}catch(e){console.warn(e);inkDirty.add(k);sync="error";}}paintSync();}

let authErr="";
const UDOM="@sxmcq.example.com";   /* usernames are stored as <name>@sxmcq.example.com (reserved domain — no mail is ever delivered) */
const who=u=>{const e=(u&&u.email)||"";return e.endsWith(UDOM)?e.slice(0,-UDOM.length):(e||(u&&u.displayName)||"");};
function toEmail(x){x=String(x||"").trim();if(x.includes("@"))return x;const n=x.toLowerCase();if(!/^[a-z0-9._-]{3,30}$/.test(n))throw {code:"bad-username"};return n+UDOM;}
function errMsg(e){const c=(e&&e.code)||"";return ({"bad-username":"ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, 0-9, จุด, ขีด ยาว 3–30 ตัว","auth/invalid-email":"ชื่อผู้ใช้หรืออีเมลไม่ถูกต้อง","auth/missing-password":"กรุณาใส่รหัสผ่าน","auth/weak-password":"รหัสผ่านต้องยาวอย่างน้อย 6 ตัว","auth/email-already-in-use":"ชื่อผู้ใช้/อีเมลนี้มีคนใช้แล้ว ถ้าเป็นของคุณให้กดเข้าสู่ระบบ","auth/invalid-credential":"ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง","auth/wrong-password":"ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง","auth/user-not-found":"ยังไม่มีบัญชีนี้ ให้กดสมัครใหม่","auth/too-many-requests":"ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่","auth/popup-closed-by-user":"ปิดหน้าต่างก่อนเข้าสู่ระบบเสร็จ","auth/unauthorized-domain":"โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase (Authorized domains)","auth/network-request-failed":"เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่"})[c]||("เข้าสู่ระบบไม่สำเร็จ"+(c?` (${c})`:""));}
/* ---------------- institution switch (account page): go to the other website (MDCU ⇄ SI) after typing that website's password ---------------- */
const OTHER_INSTS=()=>(CFG.insts||[]).filter(x=>x&&x.id!==INST.id&&(x.url||x.art));
async function shaHex(t){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}
function instCard(){const O=OTHER_INSTS();if(!O.length)return "";
  return `<div class="card" id="instCard"><h3>🏥 เปลี่ยนสถาบัน</h3><span class="rd">ตอนนี้อยู่เว็บ ${esc(INST.name)}${INST.th?` (${esc(INST.th)})`:""} · ความคืบหน้าของแต่ละเว็บแยกกัน บัญชีเดียวกันใช้ได้ทั้งสองเว็บ</span>
    <div class="stack">${O.map(x=>`<button class="btn" type="button" data-inst="${esc(x.id)}">ไปเว็บ ${esc(x.name)}${x.th?` (${esc(x.th)})`:""}</button>`).join("")}</div>
    <form class="instpw" id="instF" autocomplete="off" hidden><input class="field-in" type="password" id="instPw" placeholder="รหัสเข้าเว็บปลายทาง" aria-label="รหัสเข้าเว็บปลายทาง" autocomplete="off"><button class="btn primary" type="submit" id="instGo">ไป</button><p class="err" id="instErr"></p></form></div>`;}
function bindInstCard(){const f=$("instF");if(!f)return;let dest=null;
  document.querySelectorAll("[data-inst]").forEach(b=>b.onclick=()=>{dest=OTHER_INSTS().find(x=>x.id===b.dataset.inst);if(!dest)return;
    document.querySelectorAll("[data-inst]").forEach(o=>o.classList.toggle("primary",o===b));f.hidden=false;$("instGo").textContent="ไปเว็บ "+dest.name;$("instErr").textContent="";const i=$("instPw");i.value="";setTimeout(()=>i.focus(),30);});
  f.onsubmit=async e=>{e.preventDefault();if(!dest)return;const i=$("instPw"),g=dest.gate;let ok=!g;
    if(g){try{ok=(await shaHex((g.salt||"")+i.value))===g.h;}catch(x){}}
    if(!ok){$("instErr").textContent="รหัสไม่ถูกต้อง";i.value="";i.focus();return;}
    try{if(g&&dest.sk)sessionStorage.setItem(dest.sk+"-site-v3-pass",passTok(g));}catch(x){}
    await pushNow();await flushInk();
    if(IN_FRAME){const u=dest.art||dest.url;try{window.open(u,"_blank","noopener");}catch(x){location.href=u;}}else location.href=dest.url||dest.art;};}
function rSignin(){rSignin0();const m=$("main");if(!m||$("instCard"))return;const c=instCard();if(!c)return;
  m.insertAdjacentHTML("beforeend",c);bindInstCard();}
function rSignin0(){
  let h=`<h1 class="h2">บัญชีของฉัน</h1>`;
  const back=()=>{const b=$("back");if(b)b.onclick=()=>go(st.lastWard&&WARDS[st.lastWard]?st.lastWard:"");};
  if(cl){h+=`<div class="card"><h3>☁️ บันทึกในบัญชี Claude แล้ว</h3><span class="rd" style="margin:0">ความคืบหน้า โน้ต และที่เขียนไว้ บันทึกในบัญชี Claude ของคุณอัตโนมัติ ไม่ต้องสมัครเพิ่ม เปิดจากเครื่องไหนก็ได้ (ต้องล็อกอิน Claude บัญชีเดียวกัน)</span></div><div class="row2"><button class="btn primary" id="back">กลับไปทำข้อสอบ</button></div>`;$("main").innerHTML=h;back();return;}
  if(HAS_CLAUDE()&&!fbOn()){h+=`<div class="card"><h3>💾 บันทึกในเบราว์เซอร์นี้</h3><span class="rd" style="margin:0">ล็อกอิน Claude แล้วเปิดหน้านี้ใหม่ ความคืบหน้าจะบันทึกในบัญชี Claude อัตโนมัติ ระหว่างนี้ย้ายเครื่องได้ด้วยปุ่ม "ส่งลิงก์ความคืบหน้า" หรือไฟล์สำรองในหน้า home</span></div><div class="row2"><button class="btn" id="back">กลับ</button></div>`;$("main").innerHTML=h;back();return;}
  if(!fbOn()){h+=`<div class="card"><h3>ระบบบัญชีกำลังจะเปิดเร็ว ๆ นี้</h3><span class="rd" style="margin:0">ตอนนี้ความคืบหน้าบันทึกในเบราว์เซอร์นี้ ถ้าจะย้ายเครื่อง ให้กด "ส่งลิงก์ความคืบหน้า" ในกระดาษคำตอบ แล้วเปิดลิงก์นั้นบนเครื่องใหม่</span></div><div class="row2"><button class="btn" id="back">กลับ</button></div>`;$("main").innerHTML=h;$("back").onclick=()=>go(st.lastWard&&WARDS[st.lastWard]?st.lastWard:"");return;}
  if(!fb){h+=fbFail?`<p class="sub">เชื่อมต่อระบบบัญชีไม่ได้ ตรวจอินเทอร์เน็ตแล้วรีเฟรชหน้า ระหว่างนี้ใช้งานได้ตามปกติ (บันทึกในเครื่อง)</p><button class="btn" id="back">กลับ</button>`:`<p class="sub">กำลังเชื่อมต่อระบบบัญชี…</p>`;$("main").innerHTML=h;const bk=$("back");if(bk)bk.onclick=()=>go(st.lastWard&&WARDS[st.lastWard]?st.lastWard:"");return;}
  if(fb.user){
    h+=`<div class="card"><h3>☁️ เข้าสู่ระบบแล้ว</h3><span class="rd">${esc(who(fb.user))}</span><span class="rd">ความคืบหน้า โน้ต และที่เขียนไว้ บันทึกในบัญชีนี้อัตโนมัติ เปิดจากเครื่องไหนก็ได้</span></div>
    ${devTrusted()?"":`<div class="card" id="trustCard"><h3>🔐 ยืนยันเครื่องนี้</h3><span class="rd">เครื่องนี้ล็อกอินอยู่ แต่ยังไม่ได้ยืนยันในเว็บ ${esc(INST.name)} จึงต้องใส่รหัสเข้าเว็บทุกครั้งที่เปิดแท็บใหม่ — กดยืนยันครั้งเดียว แล้วเครื่องนี้ไม่ต้องใส่รหัสเว็บ ${esc(INST.name)} อีก</span><div class="stack"><button class="btn primary" type="button" id="trustBtn">ยืนยันเครื่องนี้ในเว็บ ${esc(INST.name)}</button></div></div>`}
    <div class="stack"><button class="btn primary" id="back">กลับไปทำข้อสอบ</button><button class="btn ghost" id="out">ออกจากระบบ</button></div>`;
    $("main").innerHTML=h;$("back").onclick=()=>go(st.lastWard&&WARDS[st.lastWard]?st.lastWard:"");
    const tb=$("trustBtn");if(tb)tb.onclick=()=>{markTrusted();toast("ยืนยันเครื่องนี้แล้ว ไม่ต้องใส่รหัสเว็บ "+INST.name+" อีก");rSignin();};
    $("out").onclick=async()=>{const wipe=confirm("ออกจากระบบ\n\nกด OK = ลบความคืบหน้าออกจากเครื่องนี้ด้วย (แนะนำถ้าเป็นเครื่องคนอื่น — ข้อมูลยังอยู่ในบัญชี)\nกด Cancel = เก็บไว้ในเครื่องนี้");await pushNow();await flushInk();await fb.au.signOut(fb.auth);if(wipe){st={w:{},phase:1,t:0,migrated:1};ink={};persist();try{localStorage.setItem(IKEY,"{}");}catch(e){}}go("");};
    return;}
  h+=`<p class="sub">ไม่บังคับ — เข้าสู่ระบบเพื่อบันทึกความคืบหน้าในบัญชี แล้วใช้ได้หลายเครื่อง ความคืบหน้าที่ทำไว้ในเครื่องนี้จะรวมเข้าบัญชีให้</p>
  <button class="btn primary gbtn" id="gIn">เข้าสู่ระบบด้วย Google</button>
  <p class="hint" style="margin-top:6px">ถ้าเปิดจากในแอป LINE/IG แล้วกด Google ไม่ได้ ให้เปิดลิงก์ใน Safari/Chrome หรือใช้ชื่อผู้ใช้ด้านล่าง</p>
  <div class="or">หรือใช้ชื่อผู้ใช้ / อีเมล</div>
  <input class="field-in" id="em" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="ชื่อผู้ใช้ (a-z, 0-9) หรืออีเมล">
  <input class="field-in" id="pw" type="password" autocomplete="current-password" placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว ตัวเลขล้วนก็ได้)">
  <p class="err" id="err">${esc(authErr)}</p>
  <div class="row2" style="margin-top:4px"><button class="btn primary" id="eIn">เข้าสู่ระบบ</button><button class="btn" id="eUp">สมัครใหม่</button><span class="spacer"></span><button class="linkbtn" id="eReset">ลืมรหัสผ่าน</button></div>
  <div class="row2"><button class="btn ghost" id="skip">ใช้งานโดยไม่เข้าสู่ระบบ</button></div>`;
  $("main").innerHTML=h;
  const A=fb.au,err=m=>{authErr=m;$("err").textContent=m;};
  const em=()=>toEmail($("em").value),pw=()=>$("pw").value;
  $("gIn").onclick=async()=>{err("");const p=new A.GoogleAuthProvider();try{await A.signInWithPopup(fb.auth,p);markTrusted();}catch(e){if(["auth/popup-blocked","auth/operation-not-supported-in-this-environment","auth/cancelled-popup-request"].includes(e.code)){try{await A.signInWithRedirect(fb.auth,p);}catch(e2){err(errMsg(e2));}}else err(errMsg(e));}};
  $("eIn").onclick=async()=>{err("");try{await A.signInWithEmailAndPassword(fb.auth,em(),pw());markTrusted();}catch(e){err(errMsg(e));}};
  $("eUp").onclick=async()=>{err("");try{await A.createUserWithEmailAndPassword(fb.auth,em(),pw());markTrusted();}catch(e){err(errMsg(e));}};
  $("eReset").onclick=async()=>{const v=$("em").value.trim();if(!v.includes("@")){err("รีเซ็ตรหัสได้เฉพาะบัญชีที่สมัครด้วยอีเมล — ใส่อีเมลแล้วกดอีกครั้ง");return;}try{await A.sendPasswordResetEmail(fb.auth,em());err("ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว");}catch(e){err(errMsg(e));}};
  $("skip").onclick=()=>go(st.lastWard&&WARDS[st.lastWard]?st.lastWard:"");
}

/* ---------------- start ---------------- */
const remember=()=>{if(ward){st.lastWard=ward;persist();}};
window.addEventListener("hashchange",remember);
/* opening without a page: take ?go=<ward>/<view> from a link; inside Claude, otherwise reopen the last page used there */
const RESTORE=["home","adm","spc","lcase","legend","exam","lres","lhist","advisor","report","unit","quality","service","grand","hy","kw","staff"];
/* claude.ai may not hand the link's page (?go= / #) to the artifact frame, so inside Claude the viewer picks where it opens: Admission (default), Long case, Legendary or the last page used */
/* claude.ai hands neither ?go= nor # to the artifact frame and cuts the link to the opening tab (COOP), so the page can't know which button was pressed on the website: by default it asks with one tap (launcher), or opens a fixed page */
const CLSTART=[["ask","ให้เลือกทุกครั้ง"],["adm","Admission round"],["lcase","Long case"],["legend","Legendary round"],["tch/cta","CTA"],["last","หน้าล่าสุดที่ใช้"]];
const clStart=()=>CLSTART.some(x=>x[0]===st.clStart)?st.clStart:"ask";
function startPath(){if((location.hash||"").replace(/^#\/?/,""))return "";let g="";try{g=new URLSearchParams(location.search).get("go")||"";}catch(e){}
  if(!g&&IN_FRAME){const cs=clStart();if(cs==="last")g=st.lastRoute||"";else g=(st.lastWard&&WARDS[st.lastWard]?st.lastWard:WL[0].id)+"/"+(cs==="ask"?"launch":cs);}
  return /^[\w-]+(\/[\w-]+)?$/.test(g)&&WARDS[g.split("/")[0]]?g:"";}
function noteRoute(){if(!ward||!RESTORE.includes(view))return;const r=ward+"/"+view;if(st.lastRoute!==r){st.lastRoute=r;st.lastRouteT=now();persist();if(cl)cloudPush();}}
window.addEventListener("hashchange",()=>setTimeout(noteRoute,0));
if(!mqCheckImport()&&!checkLegImport())checkHashImport();
{const g=startPath();if(g){try{history.replaceState(null,"","#/"+g);}catch(e){location.hash="#/"+g;}}}
/* plainer round names for one institution (config roundNames {"Grand round":"Random", …} — SI, ผู้ใช้สั่ง 19 ต.ค. 2026): every visible text is rewritten as it is drawn,
   so all pages, titles, toasts and the answer sheet follow without touching each string (Morning round / Long case keep their names) */
if(CFG.roundNames&&Object.keys(CFG.roundNames).length){const NM=Object.entries(CFG.roundNames).sort((a,b)=>b[0].length-a[0].length),MAP={};NM.forEach(([k,v])=>{MAP[k.toLowerCase()]=v;});
  const RX=new RegExp(NM.map(([k])=>k.replace(/[.*+?^${}()|[\]\\\/]/g,"\\$&")).join("|"),"gi"),sub=t=>t.replace(RX,m=>MAP[m.toLowerCase()]||m);
  const fix=n=>{if(n.nodeType===3){const t=n.nodeValue;RX.lastIndex=0;if(t&&RX.test(t)){RX.lastIndex=0;n.nodeValue=sub(t);}return;}
    if(n.nodeType===1&&!/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.tagName)){["placeholder","title","aria-label"].forEach(a=>{const v=n.getAttribute&&n.getAttribute(a);RX.lastIndex=0;if(v&&RX.test(v)){RX.lastIndex=0;n.setAttribute(a,sub(v));}});n.childNodes.forEach(fix);}};
  fix(document.body);new MutationObserver(ms=>ms.forEach(m=>{if(m.type==="characterData")fix(m.target);else m.addedNodes.forEach(fix);})).observe(document.body,{childList:true,subtree:true,characterData:true});}
route();noteRoute();
if(HAS_CLAUDE())initClaude();else initFB();
})();
