/* ================= Round I/O — อ่านสรุปเนื้อหา (ใช้ร่วมกันทั้ง MCQ / MEQ / OSCE ของวอร์ด) =================
   ข้อมูล: <โฟลเดอร์วอร์ด>/io.js → W.IO = {docs:[{code, kind:"L"|"R"|"N", title, src, upd, legend?, pages:[{id, title, topics:[…], rev, upd, html}]}], merged:{topic:{rev,upd,html}}}
   หน้า (hash): #/<w>/io · io/L|R|N (รายการไฟล์) · io/d/<code> (เรื่องในไฟล์) · io/p/<pageId> (อ่าน) · io/T (รวมตามเรื่อง) · io/t/<topic> (อ่านรวม)
   จุดแดง = หน้าที่ rev ใหม่กว่าที่เคยเปิด (P.ioSeen {pageId|"T:"+topic: rev}) — หายเมื่อเปิดอ่านหน้านั้น 1 ครั้ง
   ไฟล์นี้ถูกแทรกเข้า app.js ตอน build (ใช้ของใน app.js ได้เฉพาะตอนเรียกฟังก์ชัน) */
const IO_K=[["L","Lecture","สรุป core content ทีละบท — อ่านให้เห็นภาพรวมก่อนไปอ่าน lecture เต็ม"],["R","Resource","สรุปเอกสาร/แหล่งความรู้นอก lecture แยกเป็นเรื่อง"],["N","โน้ตวอร์ด","โน้ตที่จดเองจากวอร์ด เรียบเรียงใหม่ และตรวจความถูกต้องทุกข้อ"],["T","รวมตามเรื่อง","ทุก L / R / N ที่เป็นเรื่องเดียวกัน รวมไว้ในหน้าเดียว"]];
const IO_UNIT={L:"บท",R:"เอกสาร",N:"โน้ต",T:"เรื่อง"};
function ioD(wid){const W=WARDS[wid||ward];return (W&&W.IO&&Array.isArray(W.IO.docs))?W.IO.docs:[];}
function ioMerged(wid){const W=WARDS[wid||ward];return (W&&W.IO&&W.IO.merged)||{};}
function ioAll(wid){const o=[];ioD(wid).forEach(d=>(d.pages||[]).forEach((p,i)=>o.push({d,p,i})));return o;}
function ioTopics(wid){const m=new Map();ioAll(wid).forEach(x=>((x.p.topics&&x.p.topics.length)?x.p.topics:["อื่น ๆ"]).forEach(t=>{if(!m.has(t))m.set(t,[]);m.get(t).push(x);}));
  Object.keys(ioMerged(wid)).forEach(t=>{if(!m.has(t))m.set(t,[]);});return m;}
function ioSeenS(){const P=P_();return P.ioSeen||(P.ioSeen={});}
const ioRev=p=>+p.rev||1;
function ioNewP(p){return (ioSeenS()[p.id]||0)<ioRev(p);}
function ioNewT(t,xs){const M=ioMerged()[t];return M?(ioSeenS()["T:"+t]||0)<(+M.rev||1):xs.some(x=>ioNewP(x.p));}
function ioNewD(d){return (d.pages||[]).some(ioNewP);}
function ioNewK(k){if(k==="T"){for(const [t,xs] of ioTopics())if(ioNewT(t,xs))return true;return false;}return ioD().filter(d=>d.kind===k).some(ioNewD);}
function ioAnyNew(wid){if(wid&&wid!==ward)return false;return ioAll().some(x=>ioNewP(x.p))||Object.keys(ioMerged()).some(t=>ioNewT(t,[]));}
function ioMark(ids){const S=ioSeenS();let ch=false;ids.forEach(([id,rev])=>{if((S[id]||0)<rev){S[id]=rev;ch=true;}});if(ch)save();}
const ioDot=on=>on?'<span class="iodot" title="มีเนื้อหาใหม่" aria-label="ใหม่"></span>':"";
const ioDate=s=>{const m=/^(\d{4})-(\d\d)-(\d\d)/.exec(s||"");return m?`${+m[3]}/${+m[2]}/${String(+m[1]+543).slice(2)}`:"";};
function ioRich(h,p){const id=p?String(p.id).replace(/[^\w.-]/g,"_"):"";
  return String(h||"").replace(/\{\{IMG:([\w-]+)\}\}/g,(m,k)=>IMGS[k]?`<span class="ioimg">${imgHTML(k,"ภาพจากไฟล์ต้นฉบับ",1)}</span>`:"")
    .replace(/\{\{R:([\d,\s]+)\}\}/g,(m,ns)=>id?ns.split(",").map(n=>n.trim()).filter(Boolean).map(n=>`<sup class="iocite"><a href="#" data-ioref="${id}" data-n="${n}">[${n}]</a></sup>`).join(""):"");}
/* references of one page (Wikipedia style): p.refs = [{t:"text (may hold <i>/<b>)", u?:"url or #/ward/io/p/<id>"}] — numbered [1]… in the order given; the list is hidden behind a toggle */
const ioRefsOpen=()=>{try{return localStorage.getItem(KEY+"-iorefs")==="1";}catch(e){return false;}};
function ioRefs(p){const R=Array.isArray(p&&p.refs)?p.refs:[];if(!R.length)return "";const id=String(p.id).replace(/[^\w.-]/g,"_"),open=ioRefsOpen();
  return `<div class="iorefs"><button type="button" class="btn ghost iorefbtn" data-iorefs="${id}" aria-expanded="${open}">📚 Reference (${R.length}) <span class="iorefar">${open?"▲":"▼"}</span></button><ol class="ioreflist" id="iorefs-${id}"${open?"":" hidden"}>${R.map((r,i)=>{const u=r.u||"",inner=u.startsWith("#")?`<a href="${esc(u)}">เปิดใน Round I/O →</a>`:u?`<a href="${esc(u)}" target="_blank" rel="noopener">ลิงก์ ↗</a>`:"";return `<li id="ioref-${id}-${i+1}">${r.t||""}${inner?` · ${inner}`:""}</li>`;}).join("")}</ol></div>`;}
function ioRefsWire(){
  const tog=(id,on)=>{const ol=$("iorefs-"+id),b=document.querySelector(`[data-iorefs="${id}"]`);if(!ol)return;ol.hidden=!on;if(b){b.setAttribute("aria-expanded",on);const a=b.querySelector(".iorefar");if(a)a.textContent=on?"▲":"▼";}};
  document.querySelectorAll("[data-iorefs]").forEach(b=>b.onclick=()=>{const on=$("iorefs-"+b.dataset.iorefs).hidden;document.querySelectorAll("[data-iorefs]").forEach(x=>tog(x.dataset.iorefs,on));try{localStorage.setItem(KEY+"-iorefs",on?"1":"0");}catch(e){}});
  document.querySelectorAll("[data-ioref]").forEach(a=>a.onclick=e=>{e.preventDefault();const id=a.dataset.ioref;tog(id,true);const li=$(`ioref-${id}-${a.dataset.n}`);if(li){li.scrollIntoView({block:"center"});li.classList.remove("iohit");void li.offsetWidth;li.classList.add("iohit");}});}
const ioHref=(...a)=>"#/"+ward+"/io"+a.map(x=>"/"+encodeURIComponent(x)).join("");
const ioLegend=d=>d.kind==="N"?`<div class="iolegend"><span>ไม่มีป้าย = จากโน้ต ตรวจแล้วถูก</span><span><span class="iofix">✎ แก้</span> = แก้จากโน้ต + <span class="iowas">เดิมจดว่า</span> + เหตุผล</span><span><span class="iofind">🔎 หาต่อให้</span> = โน้ตมีแค่หัวข้อ/ชื่อ หรือไม่แน่ใจ → หามาให้</span><span><span class="ioadd">＋ เพิ่ม</span> = เนื้อหาที่ปี 4 ควรรู้เพิ่ม</span><span><sup class="iocite"><a>[1]</a></sup> = แหล่งอ้างอิง (กดดูท้ายหน้า)</span></div>`
  :typeof d.legend==="string"?`<div class="iolegend">${d.legend}</div>`:d.legend?`<div class="iolegend"><span><span class="imp">ตัวแดง</span> = สำคัญ/เน้นมาก</span><span><span class="hw">ตัวเอียงม่วง</span> = ลายมือ/คำพูดในไฟล์</span><span><span class="chip r">🔴</span> ดาวแดงผู้สอน</span><span><span class="chip g">🟢</span> nice to know</span><span><span class="warn">⚠</span> = ไฟล์ไม่ตรงกัน</span><span><span class="ref">A10 · B5</span> = หน้าในไฟล์เต็ม (ไปอ่านต่อได้)</span></div>`:"";
function ioRow(href,code,title,meta,dot){return `<a class="iorow" href="${href}">${code?`<span class="iocode">${esc(code)}</span>`:""}<span class="iot"><b>${ioDot(dot)}${esc(title)}</b>${meta?`<span class="rd">${meta}</span>`:""}</span><span class="go">→</span></a>`;}
function rIO(){const a=(location.hash||"").replace(/^#\/?/,"").split("/").slice(2).map(x=>{try{return decodeURIComponent(x);}catch(e){return x;}});
  const W=W_(),w=W.cfg,K=a[0]||"";let h=`<div class="iov">`;
  const back=(href,t)=>`<a class="ioback" href="${href}">← ${esc(t)}</a>`;
  if(!K){h+=`<div class="whead"><h1 class="h2">Round I/O</h1><a href="#/${esc(ward)}">กลับหน้าวอร์ด</a></div><p class="sub" style="margin:0 0 12px">อ่านสรุปเนื้อหาของ ${esc(w.name)} ที่ Claude สรุปจากไฟล์ที่ส่งมา · ใช้ร่วมกันทั้ง MCQ / MEQ / OSCE · จุดแดง = มีเนื้อหาใหม่หรือเพิ่งอัปเดต</p><div class="iotiles">`;
    const TP=ioTopics();h+=IO_K.map(([k,n,d])=>{const c=k==="T"?TP.size:ioD().filter(x=>x.kind===k).length;return `<a class="iotile" href="${ioHref(k)}"><span class="iok">${k==="T"?"รวม":k}</span><span class="iot"><b>${ioDot(ioNewK(k))}${n}</b><span class="rd">${d}</span><span class="rcnt">มี <b>${c}</b> ${IO_UNIT[k]}</span></span><span class="go">→</span></a>`;}).join("")+`</div>`;}
  else if(K==="L"||K==="R"||K==="N"){const KN=IO_K.find(x=>x[0]===K),D=ioD().filter(d=>d.kind===K);
    h+=back(ioHref(),"Round I/O")+`<h1 class="h2">${K} · ${esc(KN[1])}</h1><p class="sub" style="margin:0 0 10px">${esc(KN[2])}</p>`;
    if(!D.length)h+=`<div class="empty">ยังไม่มี${K==="L"?" lecture":K==="R"?" resource":"โน้ตวอร์ด"}ในวอร์ดนี้<br><span class="hint">ส่งไฟล์${K==="N"?"โน้ตที่จด (รูป/ไฟล์/พิมพ์มา)":""}ให้ Claude แล้วบอกว่าเป็นรหัส ${K} — จะสรุปขึ้นหน้านี้ให้</span></div>`;
    else if(K==="N"&&D.length===1)h+=`<p class="sub" style="margin:0 0 10px">${esc(D[0].src||"")}</p><div class="iolist">`+(D[0].pages||[]).map((p,i)=>ioRow(ioHref("p",p.id),String(i+1),p.title,`${p.from?esc(p.from)+" · ":""}${p.upd?`อัปเดต ${ioDate(p.upd)}`:""}`,ioNewP(p))).join("")+`</div>`;
    else h+=`<div class="iolist">`+D.map(d=>{const ps=d.pages||[],one=ps.length===1;return ioRow(one?ioHref("p",ps[0].id):ioHref("d",d.code),d.code,d.title,`${ps.length} เรื่อง${d.upd?` · อัปเดต ${ioDate(d.upd)}`:""}`,ioNewD(d));}).join("")+`</div>`;}
  else if(K==="d"){const d=ioD().find(x=>x.code===a[1]);if(!d){go(ward+"/io");return;}const KN=IO_K.find(x=>x[0]===d.kind)||["","ไฟล์"];
    h+=back(ioHref(d.kind),KN[1])+`<h1 class="h2"><span class="iocode big">${esc(d.code)}</span> ${esc(d.title)}</h1>${d.src?`<p class="sub" style="margin:0 0 10px">${esc(d.src)}</p>`:""}<div class="iolist">`+(d.pages||[]).map((p,i)=>ioRow(ioHref("p",p.id),String(i+1),p.title,p.upd?`อัปเดต ${ioDate(p.upd)}`:"",ioNewP(p))).join("")+`</div>`;}
  else if(K==="p"){const x=ioAll().find(y=>y.p.id===a[1]);if(!x){go(ward+"/io");return;}const {d,p,i}=x,ps=d.pages||[],one=ps.length===1,KN=IO_K.find(y=>y[0]===d.kind)||["","ไฟล์"];
    h+=back(one?ioHref(d.kind):ioHref("d",d.code),one?KN[1]:`${d.code} ${d.title}`)+`<div class="iohead"><span class="iocode">${esc(d.code)}${one?"":` · ${i+1}/${ps.length}`}</span><h1 class="h2">${esc(p.title)}</h1><p class="sub" style="margin:0">${esc(d.title)}${p.upd?` · อัปเดต ${ioDate(p.upd)}`:""}${(p.topics||[]).length?` · ${p.topics.map(t=>`<a href="${ioHref("t",t)}">${esc(t)}</a>`).join(", ")}`:""}</p></div>${ioLegend(d)}<div class="iobody">${ioRich(p.html,p)}</div>${ioRefs(p)}`;
    h+=`<div class="ionav">${i>0?`<a class="btn ghost" href="${ioHref("p",ps[i-1].id)}">‹ ${esc(ps[i-1].title)}</a>`:"<span></span>"}${i<ps.length-1?`<a class="btn primary" href="${ioHref("p",ps[i+1].id)}">${esc(ps[i+1].title)} ›</a>`:`<a class="btn" href="${one?ioHref(d.kind):ioHref("d",d.code)}">กลับรายการ</a>`}</div>`;
    ioMark([[p.id,ioRev(p)]]);}
  else if(K==="T"){const TP=[...ioTopics()];h+=back(ioHref(),"Round I/O")+`<h1 class="h2">รวมตามเรื่อง</h1><p class="sub" style="margin:0 0 10px">ทุก L / R / N ของเรื่องเดียวกันอยู่ในหน้าเดียว</p>`;
    h+=TP.length?`<div class="iolist">`+TP.map(([t,xs])=>ioRow(ioHref("t",t),"",t,`${[...new Set(xs.map(x=>x.d.code))].join(" · ")||"สรุปรวม"} · ${xs.length} หัวข้อย่อย`,ioNewT(t,xs))).join("")+`</div>`:`<div class="empty">ยังไม่มีเนื้อหา</div>`;}
  else if(K==="t"){const t=a[1],xs=ioTopics().get(t);if(!xs){go(ward+"/io/T");return;}const M=ioMerged()[t];
    h+=back(ioHref("T"),"รวมตามเรื่อง")+`<div class="iohead"><span class="iocode">รวม</span><h1 class="h2">${esc(t)}</h1><p class="sub" style="margin:0">จาก ${[...new Set(xs.map(x=>x.d.code))].map(esc).join(" · ")||"สรุปรวม"}</p></div>`;
    if(M)h+=`<div class="iobody">${ioRich(M.html)}</div>`;
    if(xs.length){h+=`<div class="iotoc"><b>ในหน้านี้</b>${xs.map((x,j)=>`<button type="button" class="linkbtn" data-iojump="ios${j}">${esc(x.d.code)} · ${esc(x.p.title)}</button>`).join("")}</div>`;
      h+=xs.map((x,j)=>`<section class="iosec" id="ios${j}"><h2 class="iosrc"><span class="iocode">${esc(x.d.code)}</span> ${esc(x.p.title)} <a class="iosrcl" href="${ioHref("p",x.p.id)}">เปิดหน้าเดี่ยว →</a></h2>${ioLegend(x.d)}<div class="iobody">${ioRich(x.p.html,x.p)}</div>${ioRefs(x.p)}</section>`).join("");}
    ioMark((M?[["T:"+t,+M.rev||1]]:[]).concat(xs.map(x=>[x.p.id,ioRev(x.p)])));}
  else{go(ward+"/io");return;}
  h+=`</div>`;$("main").innerHTML=h;ioRefsWire();
  document.querySelectorAll("[data-iojump]").forEach(b=>b.onclick=()=>{const el=$(b.dataset.iojump);if(el)el.scrollIntoView({block:"start"});});}
/* OSCE tab (and any exam type without its own rounds yet): link to the same Round I/O */
function ioCard(){const n=ioAll().length;return `<a class="iotile" href="#/${esc(ward)}/io" style="margin-top:14px"><span class="iok">I/O</span><span class="iot"><b>${ioDot(ioAnyNew())}Round I/O — อ่านสรุปเนื้อหา</b><span class="rd">สรุปจาก L / R / N ของวอร์ดนี้ ใช้ร่วมกันทั้ง MCQ / MEQ / OSCE</span><span class="rcnt">มี <b>${n}</b> เรื่อง</span></span><span class="go">→</span></a>`;}
