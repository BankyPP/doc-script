/* ---------- Teaching round › Flashcard ----------
   Look = the "Bug → Drug Drill" artifact 1:1 (Flashcards · Quiz 4 ตัวเลือก · Match, group chips, จำได้ meter).
   Decks live in site/flash_data.js (FLASH); a deck shows in the wards listed in deck.wards on its institution's site.
   The front of a card is a picture only; the answer is the name only. Progress stays in this browser (localStorage). */
function flashDecks(wid){return (typeof FLASH==="undefined"?[]:FLASH).filter(d=>(d.inst||"mdcu")===INST.id&&(d.wards||[]).includes(wid||ward));}
const FD_CSS=`
.fdr{--bg:#f5f3f8;--surface:#ffffff;--surface-2:#eeeaf4;--ink:#1e1830;--muted:#6a6380;--line:#dcd6e6;
  --violet:#5a2d91;--violet-soft:#ece3f7;--safranin:#c0306a;--safranin-soft:#fbe4ee;
  --good:#1f7a4d;--good-soft:#dff3e8;--bad:#b4232c;--bad-soft:#fbe3e4;
  --g0:#5a2d91;--g1:#c0306a;--g2:#d0582f;--g3:#5d7a1f;--g4:#3d4f6b;--g5:#0f7d7a;
  --shadow:0 1px 2px rgba(30,24,48,.06),0 8px 24px rgba(30,24,48,.08);
  --f-display:"Bricolage Grotesque","IBM Plex Sans Thai",system-ui,sans-serif;
  --f-body:"IBM Plex Sans Thai",system-ui,-apple-system,"Segoe UI",sans-serif;
  --f-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .fdr{
  --bg:#13101b;--surface:#1d1828;--surface-2:#262035;--ink:#efeaf7;--muted:#a59db8;--line:#352d47;
  --violet:#b48cf0;--violet-soft:#2e2343;--safranin:#f07aa6;--safranin-soft:#3a1f2c;
  --good:#5fd39a;--good-soft:#163527;--bad:#ff7d84;--bad-soft:#3d1a1e;
  --g0:#b48cf0;--g1:#f07aa6;--g2:#f0956c;--g3:#a9c95e;--g4:#9fb3d6;--g5:#4fd1c9;
  --shadow:0 1px 2px rgba(0,0,0,.3),0 8px 28px rgba(0,0,0,.35);color-scheme:dark}}
:root[data-theme="dark"] .fdr{
  --bg:#13101b;--surface:#1d1828;--surface-2:#262035;--ink:#efeaf7;--muted:#a59db8;--line:#352d47;
  --violet:#b48cf0;--violet-soft:#2e2343;--safranin:#f07aa6;--safranin-soft:#3a1f2c;
  --good:#5fd39a;--good-soft:#163527;--bad:#ff7d84;--bad-soft:#3d1a1e;
  --g0:#b48cf0;--g1:#f07aa6;--g2:#f0956c;--g3:#a9c95e;--g4:#9fb3d6;--g5:#4fd1c9;
  --shadow:0 1px 2px rgba(0,0,0,.3),0 8px 28px rgba(0,0,0,.35);color-scheme:dark}
.fdr{background:var(--bg);color:var(--ink);font-family:var(--f-body);font-size:15px;line-height:1.5;border-radius:18px;padding:0 16px;margin:0 -4px}
.fdr *{box-sizing:border-box}
.fdr .fd-wrap{max-width:860px;margin:0 auto;padding-block:20px 40px;display:flex;flex-direction:column;gap:16px}
.fdr button{font:inherit;color:inherit;cursor:pointer;text-transform:none;letter-spacing:normal;min-height:0;width:auto}
.fdr button:focus-visible{outline:2px solid var(--violet);outline-offset:2px}
.fdr .fd-back{font-size:13px;color:var(--muted);text-decoration:underline;text-underline-offset:3px;width:fit-content}
.fdr .fd-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px}
.fdr .fd-brand h1{font-family:var(--f-display);font-weight:800;font-size:clamp(26px,5vw,34px);line-height:1.05;margin:0;letter-spacing:-.01em;text-wrap:balance;color:var(--ink)}
.fdr .fd-brand h1 .arrow{color:var(--safranin)}
.fdr .fd-brand p{margin:4px 0 0;color:var(--muted);font-size:13px}
.fdr .fd-tally{font-family:var(--f-mono);font-size:12.5px;color:var(--muted);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.fdr .fd-tally b{color:var(--ink);font-weight:500}
.fdr .fd-meter{width:120px;height:6px;border-radius:3px;background:var(--surface-2);overflow:hidden}
.fdr .fd-meter i{display:block;height:100%;background:linear-gradient(90deg,var(--violet),var(--safranin));width:0;transition:width .3s}
.fdr .fd-tabs{display:flex;gap:4px;background:var(--surface-2);padding:4px;border-radius:12px;width:fit-content;max-width:100%;flex-wrap:wrap;border:0;margin:0}
.fdr .fd-tabs button{border:0;background:transparent;padding:7px 14px;border-radius:9px;font-weight:600;font-size:14px;color:var(--muted)}
.fdr .fd-tabs button[aria-selected="true"]{background:var(--surface);color:var(--ink);box-shadow:var(--shadow)}
.fdr .fd-filters{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.fdr .fd-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:5px 11px 5px 9px;font-size:13px;user-select:none}
.fdr .fd-chip .dot{width:9px;height:9px;border-radius:50%;background:var(--c)}
.fdr .fd-chip .n{font-family:var(--f-mono);font-size:11.5px;color:var(--muted)}
.fdr .fd-chip[aria-pressed="false"]{opacity:.45}
.fdr .fd-chip[aria-pressed="false"] .dot{background:transparent;box-shadow:inset 0 0 0 1.5px var(--c)}
.fdr .fd-opts{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;color:var(--muted);align-items:center}
.fdr .fd-opts label{display:inline-flex;gap:6px;align-items:center;cursor:pointer}
.fdr .fd-link{border:0;background:none;color:var(--muted);text-decoration:underline;text-underline-offset:3px;padding:0;font-size:13px}
.fdr .fd-decks{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.fdr .fd-deck{display:flex;flex-direction:column;gap:6px;border-radius:18px;background:var(--surface);box-shadow:var(--shadow);border:1px solid var(--line);border-top:4px solid var(--c);padding:16px 18px;color:var(--ink);text-decoration:none;transition:transform .15s}
.fdr .fd-deck:hover{transform:translateY(-2px);border-color:var(--violet)}
.fdr .fd-deck>b{font-family:var(--f-display);font-weight:800;font-size:22px;line-height:1.15;letter-spacing:-.01em}
.fdr .fd-deck .d{font-size:13px;color:var(--muted)}
.fdr .fd-deck .fd-tally{margin-top:6px}
.fdr .fd-stage{display:flex;flex-direction:column;gap:14px}
.fdr .fd-progress{display:flex;justify-content:space-between;font-family:var(--f-mono);font-size:12.5px;color:var(--muted)}
.fdr .fd-card{position:relative;perspective:1400px;min-height:380px;cursor:pointer;-webkit-tap-highlight-color:transparent}
.fdr .fd-card .face{position:absolute;inset:0;border-radius:18px;background:var(--surface);box-shadow:var(--shadow);border:1px solid var(--line);
  display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:40px 22px 34px;backface-visibility:hidden;-webkit-backface-visibility:hidden;
  transition:transform .45s cubic-bezier(.2,.7,.2,1)}
.fdr .fd-card .back{transform:rotateY(180deg);background:var(--violet-soft)}
.fdr .fd-card.flipped .front{transform:rotateY(-180deg)}
.fdr .fd-card.flipped .back{transform:rotateY(0)}
.fdr .face .fd-tag,.fdr .fd-qcard .fd-tag,.fdr .fd-deck .fd-tag{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--c);font-weight:700;display:flex;gap:6px;align-items:center}
.fdr .face .fd-tag{position:absolute;top:14px;left:16px}
.fdr .face .fd-tag::before,.fdr .fd-qcard .fd-tag::before,.fdr .fd-deck .fd-tag::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--c)}
.fdr .face .side{position:absolute;top:14px;right:16px;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600}
.fdr .face .known-badge{position:absolute;bottom:14px;left:16px;font-size:12px;color:var(--good);font-weight:600}
.fdr .fd-pic{display:flex;align-items:center;justify-content:center;max-width:100%;background:#fff;border-radius:12px;padding:8px}
.fdr .fd-pic .spr{display:block;border-radius:6px}
.fdr .fd-pic img{display:block;max-width:100%;max-height:var(--ph,250px);object-fit:contain}
.fdr .drug{font-weight:700;font-size:clamp(22px,4.6vw,34px);line-height:1.25;color:var(--violet);text-wrap:balance;overflow-wrap:anywhere}
.fdr .fd-ask{font-size:13px;color:var(--muted);margin-top:8px}
.fdr .face .fd-hint{position:absolute;bottom:14px;right:16px;font-size:12px;color:var(--muted)}
.fdr .fd-row{display:flex;gap:10px;flex-wrap:wrap}
.fdr .fd-row>*{flex:1 1 160px}
.fdr .fd-btn{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:12px 14px;font-weight:600;font-size:15px;display:flex;align-items:center;justify-content:center;gap:8px}
.fdr .fd-btn kbd{font-family:var(--f-mono);font-size:11px;border:1px solid var(--line);border-radius:5px;padding:0 5px;color:var(--muted);background:var(--surface-2)}
.fdr .fd-btn.again{color:var(--bad);border-color:color-mix(in srgb,var(--bad) 35%,var(--line))}
.fdr .fd-btn.again:hover{background:var(--bad-soft)}
.fdr .fd-btn.know{color:var(--good);border-color:color-mix(in srgb,var(--good) 35%,var(--line))}
.fdr .fd-btn.know:hover{background:var(--good-soft)}
.fdr .fd-btn.primary{background:var(--violet);color:var(--surface);border-color:var(--violet)}
.fdr .fd-btn.primary kbd{background:transparent;color:inherit;border-color:currentColor;opacity:.7}
.fdr .fd-btn:disabled{opacity:.4;cursor:default}
.fdr .fd-qcard{border-radius:18px;background:var(--surface);box-shadow:var(--shadow);border:1px solid var(--line);padding:22px;display:flex;flex-direction:column;gap:14px;position:relative;align-items:stretch}
.fdr .fd-qcard .fd-pic{align-self:center}
.fdr .fd-choices{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (max-width:560px){.fdr .fd-choices{grid-template-columns:1fr}}
.fdr .fd-choice{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:12px 14px;text-align:left;font-size:15px;display:flex;gap:10px;align-items:flex-start;min-width:0}
.fdr .fd-choice:hover:not(:disabled){border-color:var(--violet)}
.fdr .fd-choice .k{font-family:var(--f-mono);font-size:12px;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:1px 6px;flex-shrink:0;margin-top:2px}
.fdr .fd-choice span.t{min-width:0;overflow-wrap:anywhere}
.fdr .fd-choice.ok{background:var(--good-soft);border-color:var(--good);color:var(--good);font-weight:600}
.fdr .fd-choice.no{background:var(--bad-soft);border-color:var(--bad);color:var(--bad)}
.fdr .fd-choice:disabled{cursor:default}
.fdr .fd-feedback{font-weight:600;min-height:1.5em}
.fdr .fd-feedback.ok{color:var(--good)}.fdr .fd-feedback.no{color:var(--bad)}
.fdr .fd-mgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
@media (max-width:620px){.fdr .fd-mgrid{grid-template-columns:repeat(2,1fr)}}
.fdr .fd-tile{min-height:92px;border-radius:14px;border:1px solid var(--line);background:var(--surface);color:var(--ink);box-shadow:var(--shadow);padding:10px;font-size:14px;line-height:1.3;display:flex;align-items:center;justify-content:center;text-align:center;overflow-wrap:anywhere;min-width:0;transition:transform .15s,opacity .3s,background .2s}
.fdr .fd-tile.bugt{padding:6px}
.fdr .fd-tile.bugt .fd-pic{padding:4px;border-radius:9px}
.fdr .fd-tile.drugt{color:var(--violet);font-weight:600}
.fdr .fd-tile.sel{outline:2px solid var(--safranin);outline-offset:1px;transform:translateY(-2px)}
.fdr .fd-tile.done{opacity:0;pointer-events:none}
.fdr .fd-tile.wrong{animation:fdshake .35s;background:var(--bad-soft)}
@keyframes fdshake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.fdr .fd-summary{border-radius:18px;background:var(--surface);box-shadow:var(--shadow);border:1px solid var(--line);padding:24px;display:flex;flex-direction:column;gap:14px}
.fdr .fd-summary h2{font-family:var(--f-display);font-weight:800;font-size:28px;margin:0;color:var(--ink)}
.fdr .fd-stats{display:flex;gap:22px;flex-wrap:wrap;font-family:var(--f-mono);font-size:13px;color:var(--muted)}
.fdr .fd-stats b{display:block;font-size:26px;color:var(--ink);font-family:var(--f-display);font-weight:800}
.fdr .fd-missed{border-top:1px solid var(--line);padding-top:10px;display:flex;flex-direction:column;gap:6px;max-height:340px;overflow:auto}
.fdr .fd-missed div{display:flex;gap:10px;justify-content:space-between;align-items:center;font-size:14px;flex-wrap:wrap}
.fdr .fd-missed div b{font-weight:700}
.fdr .fd-missed div span{color:var(--violet);text-align:right}
.fdr .fd-empty{padding:40px 20px;text-align:center;color:var(--muted)}
.fdr .fd-confirm{display:inline-flex;gap:8px;align-items:center;font-size:13px}
.fdr .fd-confirm button{border:1px solid var(--line);background:var(--surface);border-radius:8px;padding:3px 10px;font-size:13px}
.fdr .fd-confirm button.danger{color:var(--bad);border-color:var(--bad)}
.fdr .fd-foot{font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:12px}
@media (prefers-reduced-motion:reduce){.fdr .fd-card .face,.fdr .fd-tile,.fdr .fd-meter i{transition:none}.fdr .fd-tile.wrong{animation:none}}`;
function fdSetup(){
  if(!document.getElementById("fdCss")){const s=document.createElement("style");s.id="fdCss";s.textContent=FD_CSS;document.head.appendChild(s);}
  if(!document.getElementById("fdFont")){const l=document.createElement("link");l.id="fdFont";l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap";document.head.appendChild(l);}}
/* picture only, sized to fit a box of max height mh */
function fdPic(k,mh){const v=IMGS[k];if(!v)return "";
  if(typeof v==="string")return `<span class="fd-pic" style="--ph:${mh}px"><img src="${v}" alt=""></span>`;
  return `<span class="fd-pic">${imgHTML(k,"").replace(`width:min(100%,${v.w}px)`,`width:${Math.round(Math.min(v.w,mh*v.w/v.h))}px;max-width:100%`)}</span>`;}
let FD=null;
/* topic picker: always shown first, even with only one deck (standing rule, every site) */
function fdKnown(D){try{const o=JSON.parse(localStorage.getItem("fdrill-"+D.id+"-v1")||"{}");return Array.isArray(o.known)?o.known.filter(i=>i<D.cards.length).length:0;}catch(e){return 0;}}
function fdPick(decks){
  $("main").innerHTML=`<div class="fdr"><div class="fd-wrap">
    <a class="fd-back" href="#/${esc(ward)}/teach">← Teaching round</a>
    <div class="fd-head"><div class="fd-brand"><h1>Flashcard</h1><p>${esc(W_().cfg.name)} · เลือกเรื่องที่จะฝึก</p></div></div>
    <div class="fd-decks">${decks.map((D,i)=>{const k=fdKnown(D),n=D.cards.length;
      return `<a class="fd-deck" href="#/${esc(ward)}/tch/flash/${encodeURIComponent(D.id)}" style="--c:var(--g${i%6})">
        <span class="fd-tag">${String(i+1).padStart(2,"0")} · ${n} การ์ด</span>
        <b>${esc(D.title)}</b><span class="d">${esc(D.sub)}</span>
        <span class="fd-tally"><span>จำได้ <b>${k}</b>/<b>${n}</b></span><span class="fd-meter"><i style="width:${(k/n*100).toFixed(1)}%"></i></span></span></a>`;}).join("")}</div>
  </div></div>`;}
function rFlash(){
  const decks=flashDecks();if(!decks.length){toast("ยังไม่มี flashcard ในวอร์ดนี้");go(ward+"/teach");return;}
  fdSetup();
  const a=tSeg();if(!a[1])return fdPick(decks);
  const D=decks.find(d=>d.id===a[1]);if(!D){go(ward+"/tch/flash");return;}
  const C=D.cards,KEY="fdrill-"+D.id+"-v1",store={load(){try{return JSON.parse(localStorage.getItem(KEY)||"{}");}catch(e){return {};}},save(o){try{localStorage.setItem(KEY,JSON.stringify(o));}catch(e){}}};
  const saved=store.load(),allG=D.groups.map((g,i)=>i);
  const S={mode:FD&&FD.deck===D.id?FD.mode:"flash",groups:new Set(Array.isArray(saved.groups)?saved.groups:allG),known:new Set(Array.isArray(saved.known)?saved.known:[]),
    shuffle:saved.shuffle!==false,onlyUnknown:!!saved.onlyUnknown,best:saved.best||null,flash:null,quiz:null,match:null};
  if(FD&&FD.S&&FD.S.match&&FD.S.match.timer)clearInterval(FD.S.match.timer);
  FD={deck:D.id,S};
  const persist=()=>store.save({groups:[...S.groups],known:[...S.known],shuffle:S.shuffle,onlyUnknown:S.onlyUnknown,best:S.best});
  const q=s=>document.querySelector(".fdr "+s);
  const sh=a=>{const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
  const gcol=g=>`var(--g${g})`;
  const pool=()=>{let ids=C.map((c,i)=>i).filter(i=>S.groups.has(C[i].g));if(S.onlyUnknown)ids=ids.filter(i=>!S.known.has(i));return S.shuffle?sh(ids):ids;};
  $("main").innerHTML=`<div class="fdr"><div class="fd-wrap">
    <a class="fd-back" href="#/${esc(ward)}/tch/flash">← Flashcard</a>
    <div class="fd-head"><div class="fd-brand"><h1>${esc(D.h1[0])} <span class="arrow">→</span> ${esc(D.h1[1])}</h1><p>${esc(D.sub)}</p></div>
      <div class="fd-tally"><span>จำได้ <b id="fdKnown">0</b>/<b id="fdTotal">0</b></span><span class="fd-meter"><i id="fdMeter"></i></span></div></div>
    <div class="fd-tabs" role="tablist"><button type="button" role="tab" data-fmode="flash">Flashcards</button><button type="button" role="tab" data-fmode="quiz">Quiz 4 ตัวเลือก</button><button type="button" role="tab" data-fmode="match">Match</button></div>
    <div class="fd-filters" id="fdFilters"></div>
    <div class="fd-opts"><label><input type="checkbox" id="fdShuffle"> สลับลำดับ</label><label><input type="checkbox" id="fdUnknown"> เฉพาะที่ยังจำไม่ได้</label><span id="fdReset"></span></div>
    <div class="fd-stage" id="fdStage"></div>
    <div class="fd-foot">Flashcards: แตะการ์ดหรือกด Space เพื่อพลิก · ← / 1 = ยังจำไม่ได้ · → / 2 = จำได้แล้ว &nbsp;·&nbsp; Quiz: กด 1–4 เลือก, Enter ไปข้อถัดไป · ความคืบหน้าเก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น</div>
  </div></div>`;
  const stage=()=>$("fdStage");
  function renderTally(){$("fdKnown").textContent=S.known.size;$("fdTotal").textContent=C.length;$("fdMeter").style.width=(S.known.size/C.length*100)+"%";
    document.querySelectorAll(".fdr .fd-chip").forEach(ch=>{const g=+ch.dataset.g,all=C.filter(c=>c.g===g).length,k=C.reduce((n,c,i)=>n+(c.g===g&&S.known.has(i)?1:0),0);ch.querySelector(".n").textContent=`${k}/${all}`;});}
  function renderFilters(){const f=$("fdFilters");
    f.innerHTML=D.groups.map((g,i)=>`<button type="button" class="fd-chip" data-g="${i}" style="--c:${gcol(i)}" aria-pressed="${S.groups.has(i)}" title="${esc(g.name)}"><span class="dot"></span>${esc(g.short)} <span class="n"></span></button>`).join("");
    f.querySelectorAll(".fd-chip").forEach(ch=>ch.onclick=()=>{const g=+ch.dataset.g;if(S.groups.has(g)){if(S.groups.size>1)S.groups.delete(g);}else S.groups.add(g);ch.setAttribute("aria-pressed",S.groups.has(g));persist();restart();});}
  const emptyMsg=`<div class="fd-summary fd-empty">ไม่มีการ์ดในชุดนี้ — เลือกกลุ่มเพิ่ม หรือเอาติ๊ก "เฉพาะที่ยังจำไม่ได้" ออก</div>`;
  const missRow=i=>`<div>${fdPic(C[i].k,56)}<span>${esc(C[i].n)}</span></div>`;
  /* ---- Flashcards ---- */
  function startFlash(ids){const qq=ids||pool();S.flash={queue:qq,total:qq.length,done:0,againSet:new Set(),flipped:false};}
  function renderFlash(){const F=S.flash,st=stage();if(!st)return;
    if(!F.total){st.innerHTML=emptyMsg;return;}
    if(!F.queue.length){const miss=[...F.againSet];
      st.innerHTML=`<div class="fd-summary"><h2>จบรอบแล้ว</h2>
        <div class="fd-stats"><span><b>${F.total}</b>การ์ดในรอบ</span><span><b>${F.total-miss.length}</b>จำได้ครั้งแรก</span><span><b>${miss.length}</b>ต้องทวน</span></div>
        ${miss.length?`<div class="fd-missed">${miss.map(missRow).join("")}</div>`:""}
        <div class="fd-row">${miss.length?`<button class="fd-btn primary" id="fdRedo" type="button">ทวนเฉพาะ ${miss.length} ใบที่พลาด</button>`:""}<button class="fd-btn" id="fdNew" type="button">เริ่มรอบใหม่</button></div></div>`;
      $("fdNew").onclick=()=>{startFlash();renderFlash();};if(miss.length)$("fdRedo").onclick=()=>{startFlash(sh(miss));renderFlash();};return;}
    const i=F.queue[0],c=C[i];
    st.innerHTML=`<div class="fd-progress"><span>${F.done+1>F.total?F.total:F.done+1} / ${F.total}</span><span>เหลือในคิว ${F.queue.length}</span></div>
      <div class="fd-card ${F.flipped?"flipped":""}" id="fdCard" role="button" tabindex="0" aria-label="พลิกการ์ด">
        <div class="face front" style="--c:${gcol(c.g)}"><span class="fd-tag">${esc(D.groups[c.g].short)}</span><span class="side">${esc(D.front)}</span>
          ${fdPic(c.k,250)}<div class="fd-ask">${esc(D.ask)}</div>
          ${S.known.has(i)?`<span class="known-badge">✓ เคยจำได้</span>`:""}<span class="fd-hint">แตะเพื่อพลิก</span></div>
        <div class="face back" style="--c:${gcol(c.g)}"><span class="fd-tag">${esc(D.groups[c.g].short)}</span><span class="side">${esc(D.back)}</span>
          <div class="drug">${esc(c.n)}</div></div></div>
      <div class="fd-row"><button class="fd-btn again" id="fdAgain" type="button" ${F.flipped?"":"disabled"}><kbd>←</kbd> ยังจำไม่ได้</button>
        <button class="fd-btn know" id="fdKnow" type="button" ${F.flipped?"":"disabled"}>จำได้แล้ว <kbd>→</kbd></button></div>
      ${F.flipped?"":`<button class="fd-btn primary" id="fdFlip" type="button">ดูคำตอบ <kbd>Space</kbd></button>`}`;
    const flip=()=>{F.flipped=!F.flipped;renderFlash();};
    $("fdCard").onclick=flip;$("fdCard").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();flip();}};
    if($("fdFlip"))$("fdFlip").onclick=flip;$("fdAgain").onclick=()=>flashAnswer(false);$("fdKnow").onclick=()=>flashAnswer(true);}
  function flashAnswer(ok){const F=S.flash;if(!F.flipped||!F.queue.length)return;const i=F.queue.shift();
    if(ok){S.known.add(i);F.done++;}else{S.known.delete(i);F.againSet.add(i);F.queue.push(i);}
    F.flipped=false;persist();renderTally();renderFlash();}
  /* ---- Quiz ---- */
  function startQuiz(){S.quiz={order:pool(),pos:0,score:0,answered:null,opts:null,missed:[]};}
  function buildOpts(i){const c=C[i],right=c.n;
    const same=sh(C.filter((x,j)=>j!==i&&x.g===c.g&&x.n!==right).map(x=>x.n)),other=sh(C.filter((x,j)=>j!==i&&x.n!==right).map(x=>x.n)),picks=[];
    for(const d of [...same,...other]){if(!picks.includes(d))picks.push(d);if(picks.length===3)break;}return sh([right,...picks]);}
  function renderQuiz(){const Q=S.quiz,st=stage();if(!st)return;
    if(!Q.order.length){st.innerHTML=emptyMsg;return;}
    if(Q.pos>=Q.order.length){const pct=Math.round(Q.score/Q.order.length*100);
      st.innerHTML=`<div class="fd-summary"><h2>${pct}%</h2>
        <div class="fd-stats"><span><b>${Q.score}</b>ถูก</span><span><b>${Q.order.length-Q.score}</b>ผิด</span><span><b>${Q.order.length}</b>ข้อทั้งหมด</span></div>
        ${Q.missed.length?`<div class="fd-missed">${Q.missed.map(missRow).join("")}</div>`:""}
        <div class="fd-row">${Q.missed.length?`<button class="fd-btn primary" id="fdQMiss" type="button">ทำใหม่เฉพาะ ${Q.missed.length} ข้อที่ผิด</button>`:""}<button class="fd-btn" id="fdQNew" type="button">เริ่มชุดใหม่</button></div></div>`;
      $("fdQNew").onclick=()=>{startQuiz();renderQuiz();};
      if(Q.missed.length)$("fdQMiss").onclick=()=>{S.quiz={order:sh(Q.missed),pos:0,score:0,answered:null,opts:null,missed:[]};renderQuiz();};return;}
    const i=Q.order[Q.pos],c=C[i];if(!Q.opts)Q.opts=buildOpts(i);const a=Q.answered;
    st.innerHTML=`<div class="fd-progress"><span>ข้อ ${Q.pos+1} / ${Q.order.length}</span><span>ถูก ${Q.score}</span></div>
      <div class="fd-qcard" style="--c:${gcol(c.g)}"><span class="fd-tag">${esc(D.groups[c.g].short)}</span>
        ${fdPic(c.k,230)}<div class="fd-ask" style="margin-top:-6px;text-align:center">${esc(D.qask)}</div>
        <div class="fd-choices">${Q.opts.map((d,k)=>{let cls="";if(a!==null){if(d===c.n)cls="ok";else if(k===a)cls="no";}
          return `<button class="fd-choice ${cls}" type="button" data-k="${k}" ${a!==null?"disabled":""}><span class="k">${k+1}</span><span class="t">${esc(d)}</span></button>`;}).join("")}</div>
        <div class="fd-feedback ${a===null?"":(Q.opts[a]===c.n?"ok":"no")}">${a===null?"":(Q.opts[a]===c.n?"ถูกต้อง":"ยังไม่ใช่ — คำตอบคือ "+esc(c.n))}</div>
        ${a!==null?`<button class="fd-btn primary" id="fdQNext" type="button">ข้อถัดไป <kbd>Enter</kbd></button>`:""}</div>`;
    st.querySelectorAll(".fd-choice").forEach(b=>b.onclick=()=>quizPick(+b.dataset.k));
    if($("fdQNext")){$("fdQNext").onclick=quizNext;$("fdQNext").focus({preventScroll:true});}}
  function quizPick(k){const Q=S.quiz;if(Q.answered!==null||Q.pos>=Q.order.length)return;const i=Q.order[Q.pos];Q.answered=k;
    if(Q.opts[k]===C[i].n){Q.score++;S.known.add(i);}else{Q.missed.push(i);S.known.delete(i);}persist();renderTally();renderQuiz();}
  function quizNext(){const Q=S.quiz;if(Q.answered===null)return;Q.pos++;Q.answered=null;Q.opts=null;renderQuiz();}
  /* ---- Match ---- */
  function startMatch(){const ids=pool(),picked=[],used=new Set();
    for(const i of (S.shuffle?ids:sh(ids))){if(!used.has(C[i].n)){picked.push(i);used.add(C[i].n);}if(picked.length===6)break;}
    S.match={tiles:sh([...picked.map(i=>({i,t:"b"})),...picked.map(i=>({i,t:"d"}))]),sel:null,done:new Set(),start:null,end:null,errors:0,timer:null};}
  const fmt=ms=>(ms/1000).toFixed(1)+" s";
  function renderMatch(){const M=S.match,st=stage();if(!st)return;
    if(M.tiles.length<4){st.innerHTML=`<div class="fd-summary fd-empty">ต้องมีอย่างน้อย 2 คู่ — เลือกกลุ่มเพิ่ม</div>`;return;}
    const pairs=M.tiles.length/2;
    if(M.done.size===pairs){const t=M.end-M.start,isBest=!S.best||t<S.best;if(isBest&&pairs===6){S.best=t;persist();}
      st.innerHTML=`<div class="fd-summary"><h2>${fmt(t)}</h2>
        <div class="fd-stats"><span><b>${pairs}</b>คู่</span><span><b>${M.errors}</b>จับคู่ผิด</span><span><b>${S.best?fmt(S.best):"–"}</b>สถิติดีสุด</span></div>
        <div class="fd-row"><button class="fd-btn primary" id="fdMNew" type="button">เล่นอีกรอบ</button></div></div>`;
      $("fdMNew").onclick=()=>{startMatch();renderMatch();};return;}
    st.innerHTML=`<div class="fd-progress"><span>${esc(D.mlabel)} · ${M.done.size}/${pairs}</span><span id="fdMt">${M.start?fmt(Date.now()-M.start):"แตะเพื่อเริ่มจับเวลา"}</span></div>
      <div class="fd-mgrid">${M.tiles.map((x,k)=>{const c=C[x.i];
        return `<button type="button" class="fd-tile ${x.t==="b"?"bugt":"drugt"} ${M.done.has(x.i)?"done":""} ${M.sel===k?"sel":""}" data-k="${k}" style="${x.t==="b"?`border-left:4px solid ${gcol(c.g)}`:""}">${x.t==="b"?fdPic(c.k,96):esc(c.n)}</button>`;}).join("")}</div>
      <div class="fd-row"><button class="fd-btn" id="fdMShuf" type="button">สุ่มชุดใหม่</button></div>`;
    st.querySelectorAll(".fd-tile").forEach(t=>t.onclick=()=>matchPick(+t.dataset.k));
    $("fdMShuf").onclick=()=>{clearInterval(M.timer);startMatch();renderMatch();};}
  function matchPick(k){const M=S.match;
    if(!M.start){M.start=Date.now();M.timer=setInterval(()=>{const e=$("fdMt");if(!e){clearInterval(M.timer);return;}if(S.mode==="match"&&M.start&&!M.end)e.textContent=fmt(Date.now()-M.start);},100);}
    if(M.sel===null){M.sel=k;renderMatch();return;}if(M.sel===k){M.sel=null;renderMatch();return;}
    const a=M.tiles[M.sel],b=M.tiles[k];
    if(a.i===b.i&&a.t!==b.t){M.done.add(a.i);M.sel=null;if(M.done.size===M.tiles.length/2){M.end=Date.now();clearInterval(M.timer);}renderMatch();}
    else{M.errors++;const prev=M.sel;M.sel=null;renderMatch();
      [prev,k].forEach(x=>{const t=document.querySelector(`.fdr .fd-tile[data-k="${x}"]`);if(t){t.classList.add("wrong");setTimeout(()=>t.classList.remove("wrong"),380);}});}}
  /* ---- shell ---- */
  function restart(){if(S.match&&S.match.timer)clearInterval(S.match.timer);
    if(S.mode==="flash"){startFlash();renderFlash();}else if(S.mode==="quiz"){startQuiz();renderQuiz();}else{startMatch();renderMatch();}renderTally();}
  function setMode(m){S.mode=m;FD.mode=m;document.querySelectorAll(".fdr [data-fmode]").forEach(b=>b.setAttribute("aria-selected",b.dataset.fmode===m));restart();}
  document.querySelectorAll(".fdr [data-fmode]").forEach(b=>b.onclick=()=>setMode(b.dataset.fmode));
  $("fdShuffle").checked=S.shuffle;$("fdUnknown").checked=S.onlyUnknown;
  $("fdShuffle").onchange=e=>{S.shuffle=e.target.checked;persist();restart();};
  $("fdUnknown").onchange=e=>{S.onlyUnknown=e.target.checked;persist();restart();};
  function resetUI(){const w=$("fdReset");w.innerHTML=`<button class="fd-link" id="fdResetBtn" type="button">ล้างความคืบหน้า</button>`;
    $("fdResetBtn").onclick=()=>{w.innerHTML=`<span class="fd-confirm">ล้างการ์ดที่จำได้ทั้งหมด? <button class="danger" id="fdRYes" type="button">ล้าง</button><button id="fdRNo" type="button">ยกเลิก</button></span>`;
      $("fdRYes").onclick=()=>{S.known.clear();S.best=null;persist();resetUI();restart();};$("fdRNo").onclick=resetUI;};}
  resetUI();
  FD.key=e=>{if(!document.querySelector(".fdr")||e.target.matches("input,textarea,[contenteditable='true']"))return;
    if(S.mode==="flash"&&S.flash&&S.flash.queue.length){
      if(e.key===" "){e.preventDefault();S.flash.flipped=!S.flash.flipped;renderFlash();}
      else if(e.key==="ArrowRight"||e.key==="2")flashAnswer(true);else if(e.key==="ArrowLeft"||e.key==="1")flashAnswer(false);}
    else if(S.mode==="quiz"&&S.quiz){if(["1","2","3","4"].includes(e.key))quizPick(+e.key-1);else if(e.key==="Enter"&&S.quiz.answered!==null){e.preventDefault();quizNext();}}};
  renderFilters();setMode(S.mode);}
document.addEventListener("keydown",e=>{if(FD&&FD.key)FD.key(e);});
