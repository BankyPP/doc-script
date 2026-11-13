/* Service worker (9 Nov 2026) — copied next to each site's page by build_site.py (docs/sw.js, docs/si/sw.js).
   · files with ?v=<hash> (core, app, css, each ward's data) never change under the same hash → served from this device's cache after the first load;
     when a new hash of the same file arrives, the older copies are deleted
   · the page (index.html) → always from the network so every open gets the newest version; the cached copy is used only when there is no internet at all
   · img/ → cached copy at once, refreshed in the background
   · anything else (other sites, Firebase, Claude, fonts) is not touched */
const CN="ac-"+self.registration.scope;
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
async function putV(c,req,res){await c.put(req,res);const u=new URL(req.url);
  for(const k of await c.keys()){const x=new URL(k.url);if(x.pathname===u.pathname&&x.search!==u.search)await c.delete(k);}}
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
  if(u.origin!==location.origin||!u.href.startsWith(self.registration.scope))return;
  const rest=u.pathname.slice(new URL(self.registration.scope).pathname.length);
  if(rest.includes("/")&&!rest.startsWith("img/"))return;   /* a deeper site (e.g. si/) has its own worker */
  if(u.searchParams.has("v")){
    e.respondWith(caches.open(CN).then(async c=>{const hit=await c.match(r);if(hit)return hit;
      const res=await fetch(r);if(res.ok)e.waitUntil(putV(c,r,res.clone()));return res;}));
    return;}
  if(rest.startsWith("img/")){
    e.respondWith(caches.open(CN).then(async c=>{const hit=await c.match(r);
      const net=fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res;});
      if(hit){e.waitUntil(net.catch(()=>{}));return hit;}return net;}));
    return;}
  if(r.mode==="navigate"||rest===""||rest==="index.html"){
    const key=new URL("index.html",self.registration.scope).href;
    e.respondWith(caches.open(CN).then(async c=>{
      const net=fetch(r).then(res=>{if(res.ok)e.waitUntil(c.put(key,res.clone()));return res;});
      try{return await net;}catch(err){const hit=await c.match(key);if(hit)return hit;throw err;}}));
  }
});
