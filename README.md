# โพยหมอ

คลังความรู้ตั้งแต่ปี 1 ถึงใบประกอบวิชาชีพ — Medical Soil (preclinic + clinic รวมกัน), 1000 MAI และห้องสอบ

เว็บอยู่ในโฟลเดอร์ `docs/` (GitHub Pages: branch `main`, folder `/docs`) ไม่ต้อง build

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `docs/data/config.js` | ตั้งค่า: Google Sheet 1000 MAI, รายการการสอบ NL & Compre, รุ่น AI |
| `docs/data/systems.js` | ระบบ + สีประจำระบบ + คำที่ใช้จับคู่คอลัมน์ "ระบบ" ในชีต |
| `docs/data/sample-diseases.js` | ข้อมูลตัวอย่าง ใช้ตอนยังไม่เชื่อมชีต |
| `docs/data/gdoc.js` | Preclinic + Clinic จาก Google Doc **โพยหมอ** (ดึงสด) + ไฟล์อื่นที่แขวนไว้ใต้แท็บ: ชั้นของแท็บ, แท็บที่ไปฝั่ง Clinic, แท็บที่ซ่อน, สี |
| `docs/gdoc.js` | ตัวแปลง HTML ของ Google Docs → หน้าเว็บ (ใช้ทั้งตอนดึงสดและตอนสร้างฉบับเก็บ) |
| `docs/gdoc/*.json` + `docs/gdoc/img/` | ฉบับเก็บ (snapshot) ของ Doc/Sheet — ใช้ตอนดึงสดไม่ได้ และสำหรับไฟล์ที่ไม่อัปเดตเอง |
| `docs/data/clinic.js` | วอร์ด (ชื่อ สี ค่า Ward ในชีต 1000 MAI คำที่ใช้จับชื่อแท็บ) + approach ตามอาการนำ |
| `docs/data/symp.js` + `docs/symp/` | Clinic › Symptomatology & Approach — ตำราอาการวิทยา (ศิริราช) 44 บท: `chNN.json` เนื้อหา+algorithm, `img/` รูป, `search.json` ค้นทุกบท · สร้างด้วย `tools/symp/build.py` (อย่าแก้ symp.js ด้วยมือ) |
| `docs/data/nl.js` | ติว NL & Compre — สรุปเนื้อหา (กำกับที่มา จุฬาฯ / ศิริราช ทุกเรื่อง) |
| `docs/data/topics.js` | Random Topic Summary — รายการหัวข้อ (ไฟล์ของแต่ละหัวข้ออยู่ใน `docs/topics/<id>/`) |
| `docs/app.js`, `docs/app.css` | ตัวเว็บ |

## Medical Soil (`#/kb`) — Preclinic + Clinic รวมเป็นคลังเดียว (29 ต.ค. 2026)
- **ที่เก็บหลัก = แท็บตาม system ใน Doc โพยหมอ** ไม่ว่าจะเรียนตอน preclinic หรือ clinic · วอร์ดเป็นแค่ **ป้าย/มุมมอง** ไม่ใช่ที่เก็บ
- มุมมอง (แถบบนสุดของทุกหน้า): **ตาม system** `#/kb` · **ตามวอร์ด** `#/kb/ward[/<med|gensx|subspe|ped|obgyn>]` · **Clinical skills** `#/kb/skills` · **Symptomatology & Approach** `#/kb/symp[/<บท>]` · Approach `#/kb/approach/<id>` · หน้าแท็บใดก็ได้ `#/kb/<แท็บ>`
- หน้าวอร์ด = แท็บจากทุก system ที่ติดป้ายวอร์ดนั้น (จัดกลุ่มตาม system) + โรคใน 1000 MAI ที่คอลัมน์ Ward ตรงกัน (`mai` ใน data/clinic.js) + ลิงก์คลังข้อสอบเก่า
- ป้าย: `tags` ใน data/gdoc.js → `'ชื่อแท็บ': { lv: 'pre'|'clinic', ward: ['gensx', …] }` แท็บย่อยได้ป้ายตามแท็บแม่ · แท็บใต้ "Clinic" ได้วอร์ดจากชื่อแท็บเอง (`match` ใน data/clinic.js เช่น Surgery → Gen Sx + Subspe Sx)
- **กฎอัปไฟล์:** ไม่ถามว่า pre-clinic หรือ clinic — ถามว่าเรื่องนี้ system อะไร → ใส่แท็บ system นั้น แล้วติดป้ายวอร์ดถ้ามาจากวอร์ด · ไฟล์ที่ครอบหลาย system (สรุปทั้งวอร์ด) → ใต้แท็บ "Clinic"
- ลิงก์เก่า `#/preclinic/…` และ `#/clinic/…` ส่งต่อมาที่ `#/kb/…` เอง

## โน้ต + แก้เนื้อหา (ทุกหน้าที่เป็นเนื้อหา)
- กล่องเนื้อหาที่มี `data-ann="<key>"`: แท็บจาก Doc/ชีต `g:<แท็บ>` · บท Symptomatology `y:<บท>` · โรคใน 1000 MAI `d:<id>` · สรุป NL `n:<id>` · Approach `c:<id>` (สรุปใน Random Topic Summary เป็นภาพ — เลือกข้อความไม่ได้)
- **Add note:** เลือกข้อความ → ปุ่ม Add note → พิมพ์ → ตรงนั้นขีดเส้นใต้ · กดเส้นใต้ = กล่องโน้ต (แก้/ลบได้) ปิดเมื่อกด ✕ หรือออกจากหน้า · ปุ่ม "โน้ต n" = รายการโน้ตทั้งหน้า (กดแล้วไปที่ตำแหน่ง) · โน้ตผูกกับข้อความ + ข้อความรอบ ๆ ถ้าต้นฉบับเปลี่ยนจนหาไม่เจอจะขึ้นว่า "หาไม่เจอ"
- **แก้เนื้อหา:** พิมพ์แก้ตรงไหนก็ได้ → บันทึกเป็นฉบับของเราเอง **Google Doc / Sheet ไม่ถูกแตะ** · "ดูต้นฉบับ" สลับดู · "คืนค่าต้นฉบับ" ทิ้งที่แก้ · ถ้า Doc เปลี่ยนหลังจากแก้ จะขึ้นป้ายเตือน (ฉบับที่แก้ยังทับอยู่จนกดคืนค่า) · ห้องสอบ/ค้นหาใช้ฉบับที่แก้ · algorithm ใน Symptomatology ล็อกไว้ตอนแก้
- เก็บต่อคน: localStorage `poy-ann:<key>` + Firestore `poymor/<uid>/ann/<key>` (`{v, ts}` ฉบับใหม่กว่าชนะ) — อยู่ใต้ rules `poymor/{uid}/{doc=**}` เดิม ไม่ต้องเพิ่ม rules
- โค้ด: ส่วน "โน้ต + แก้เนื้อหา" ท้าย app.js (`annMount`, `ANN_HOOK` สำหรับหน้าที่มีของ interactive) · CSS `.ann*` ท้าย app.css

## Doc "โพยหมอ" → Medical Soil
- Doc โพยหมอ แชร์ Anyone with the link → Viewer แล้ว · หน้าเว็บอ่าน Doc ตรงจาก Google ไม่ได้ (Google ไม่ส่ง CORS) จึงใช้ **GitHub Actions** `.github/workflows/gdoc-sync.yml` ทุก ~10 นาที: `tools/gdoc/build.py --public <docId> poymor` อ่านชื่อ+ชั้นของแท็บจากหน้า `/edit` (DOCS_modelChunk) แล้วดึงทีละแท็บด้วย `export?format=html&tab=<id>` → `docs/gdoc/poymor.json` (มี `d` = ชั้นจริง) + รูปใน `docs/gdoc/img/` → commit เฉพาะเมื่อ Doc เปลี่ยน · อยากอัปเดตทันที: แท็บ Actions → Sync Google Doc → Run workflow
- ถ้า Actions ล้มด้วย "ได้แค่ N แท็บ" = Doc ถูกปิดแชร์ (Google ส่งหน้า login มา)
- ทุกแท็บอยู่ "ตาม system" ยกเว้นแท็บหลักใน `clinic` ของ data/gdoc.js (History Taking, Physical Exam, Lab Procedures → Clinical skills · Symptomatology → การ์ดในหน้า Symptomatology & Approach · Clinic → ตามวอร์ด) · แท็บ `homework (?)` ไม่ขึ้นเว็บ (ตัดทั้งตอนดึงสดและในฉบับเก็บ)
- `tree` ใน data/gdoc.js ใช้สำรองเฉพาะฉบับเก็บที่ไม่มีข้อมูลชั้น · แท็บ homework ซ่อนพร้อมแท็บย่อย
- ไฟล์ที่ดึงครั้งเดียว (ไม่อัปเดตเอง) อยู่ใน `extras`: MSK Anatomy Atlas (ชีต MSK ปี 2 → ใต้ MS Anatomy), Tissue Bio Spot Hack (→ ใต้ Histology), DocQ Med Template 2026 (แต่ละแท็บ → เรื่องที่ตรงกัน)
- สร้างฉบับเก็บใหม่ (ต้องมี zip ที่ export จาก Google: Doc → `application/zip`, Sheet → `application/zip`):
  - Doc โพยหมอ: Actions ทำเอง · Doc อื่น (เช่น DocQ) จาก zip ที่ export ผ่าน Drive: `python3 tools/gdoc/build.py <โฟลเดอร์> docq --prefix q`
  - Sheet: `python3 tools/gdoc/sheets.py <โฟลเดอร์> msk-anatomy "<ชีต 1>" "<ชีต 2>" ...` (ใส่ชื่อชีตเรียงตามไฟล์)
  - แล้วเพิ่มเลข `POY_GDOC_V` ใน data/gdoc.js
- ผู้ใช้สั่งอัปเดตไฟล์ที่ไม่ sync เองด้วยคำสั่งในแชท `//update ggfile <ชื่อไฟล์|all>`
- ออกข้อสอบจากแท็บใดก็ได้: `#/exam?src=g:<แท็บ>` (รวมแท็บย่อย)

## Medical Soil › Neuro — CNS & PNS Tutorial 2026 (B03)
- ไฟล์ต้นฉบับ 76 หน้า (สไลด์ + ลายมือ) + ไฟล์สรุป 10 หน้า → `docs/gdoc/neuro-tut.json` แขวนใต้แท็บ Neuro และแท็บย่อยของ Neuro ผ่าน `extras` ใน data/gdoc.js (badge "Tutorial") — **ไม่แตะ Google Doc** และไม่ถูกทับตอน Doc sync
- 62 แท็บ: ใต้ Neuro = แท็บรวม "CNS & PNS Tutorial 2026" (Localization, Neuro exam, High-yield, Mnemonics, Quiz 145 ข้อ, สไลด์ต้นฉบับ 76 หน้า, ไฟล์สรุป PDF) · ที่เหลือกระจายใต้ Neuroanatomy / Neurophysiology / Neuro Disorders / Neuropharm & Abx / Neuro Investigation / Neuro Congenital Disorders
- แต่ละแท็บ = กล่องหลายคอลัมน์ตามหัวข้อย่อย (สารบัญซ้าย) + ภาพสไลด์ต้นฉบับหน้าที่เกี่ยวข้องท้ายแท็บ · CSS อยู่ท้าย app.css (`.nx`)
- แก้เนื้อหา: `tools/neuro-tut/src/` (p1–p8.html = ไฟล์สรุป, extra.html = กล่องเสริมจากต้นฉบับ, qa.py = คำถาม) · ย้าย/เพิ่มแท็บ: `TABS` ใน `tools/neuro-tut/build.py` → `python3 tools/neuro-tut/build.py` → ถ้าชื่อแท็บเปลี่ยน copy `tools/neuro-tut/tabs.js.txt` ไปแทนรายการใน data/gdoc.js → เพิ่ม `POY_GDOC_V`
- ภาพ: `docs/gdoc/img/neuro-tut/` (pNN = สไลด์ต้นฉบับ, sNN = ไฟล์สรุป, fig-* = รูปที่ตัดมา) · PDF สรุป: `docs/gdoc/files/neuro-cnspns-summary.pdf`

## Google Sheet 1000 MAI
- แชร์ชีตเป็น Anyone with the link → Viewer แล้วใส่ `sheet.id` / `sheet.gid` ใน config.js
- แถวแรกคือหัวคอลัมน์ · คอลัมน์ชื่อโรค / ชื่อไทย / ระบบ / No. ถูกจับอัตโนมัติจากชื่อหัว ที่เหลือแสดงเป็นหัวข้อในหน้าโรคตามลำดับในชีต
- ในช่องข้อมูล ขึ้นบรรทัดใหม่ด้วย `- ` จะกลายเป็น bullet

## บัญชี (Firebase)
- ใช้โปรเจกต์ Firebase `ac-mdcu` ร่วมกับคลังข้อสอบเก่า MDCU — ล็อกอินบัญชีเดียวกันได้ (Google / ชื่อผู้ใช้ / อีเมล)
- เก็บที่ Firestore `poymor/<uid>/data/state` · rules: `match /poymor/{uid}/{doc=**}` เจ้าของอ่าน/เขียนได้คนเดียว
- ซิงก์: หน้าที่อ่านค้าง, ข้อสอบ AI ชุดล่าสุด + คำตอบ, ค่าที่เลือกในห้องสอบ, ตั้งค่าการสอบ NL & Compre · API key ไม่ซิงก์

## ติว NL & Compre (`#/nl`)
- หน้าย่อย: บอร์ดประกาศ `#/nl/board` · สรุปเนื้อหา `#/nl/notes` · ข้อสอบ `#/nl/exams` · ตั้งค่า `#/nl/settings` · **หน้าการสอบ `#/nl/x/<id>`**
- การสอบ (data/config.js `nl.exams`): **NL part 1** (= NL1 + NL2 เก่า, blueprint ใหม่มีผล 1 ม.ค. 2570) · **NL part 2** (= NL3 เก่า) · Compre 1 (จุฬาฯ เท่านั้น, blueprint NL1 เก่า) · Compre 2 · Compre 3 — id เดิม nl1/nl2/c1/c2/c3 · `bank` = ลิงก์คลังข้อสอบเก่า · ตั้งรูปแบบ/วันสอบได้ในหน้าตั้งค่า (เก็บต่อคน)
- กติกาเนื้อหา: NL เอาเนื้อหาครบจากจุฬาฯ และศิริราช ไม่มีฝั่งไหนเป็นหลัก · Compre เนื้อหาเหมือน NL แต่ข้อสอบเก่าแยกตามสถาบัน · ทุกเรื่องบอกที่มา

### หน้าการสอบ `#/nl/x/<id>`
- **nl1**: blueprint ใหม่ (`data/blueprint.js` → `POY_BP.nl1`) — ภาพรวม 30/50/170, วิเคราะห์ออกเยอะ-น้อยและควรอ่านอะไร (`read`), กลุ่ม 1/2/3, สัดส่วนภารกิจ (Dx/Lab/Tx/Patho/Prognosis), ฉุกเฉิน + โรคตามระบบ (เรียงตาม blueprint หรือจำนวนข้อ `?s=n`), หมวด 1 · ช่อง 📚 = ข้อสอบเก่าในคลังที่ติดแท็กนั้น (จาก `bank/stats.js` ที่ `bank/build.py` สร้าง) · PDF ต้นฉบับ `nl/files/NLE_Part_I_blueprint_2570.pdf`
- **c1**: แท็บ แผนอ่าน (Bank = จุฬาฯ · Fye = ศิริราช ว่าง) + Blueprint NL1 เก่า — ข้อมูลจาก Google Sheet "Compre - NL1 Plan" (ของ Bank) **ดึงครั้งเดียว ไม่ live**: `tools/plan/compre1_bank.py` → `data/plan-c1-bank.js` (อัปเดตด้วย `//update ggfile Compre - NL1 Plan` → แก้ข้อมูลในสคริปต์ตามชีตแล้วรันใหม่)
- nl2 / c2 / c3: ยังไม่มีข้อมูล (หน้าว่างพร้อมคำอธิบาย)

### คลังข้อสอบเก่า NL & Compre (`bank/` → `docs/bank/nl/`, `docs/bank/compre/`)
- **ใช้โค้ดชุดเดียวกับเว็บข้อสอบเก่า (BankyPP/ac-mdcu) 100%** — หน้า home ของการสอบ, หน้าทำข้อสอบ, ทุก round, Phase 1/2, สรุป High-yield, Teaching, OSCE ฯลฯ ต่างแค่ธีมโพยหมอ
- `bank/template.html`, `bank/build_site.py`, `bank/site/` = สำเนา engine (ห้ามแก้ตรงนี้) · **ทุกครั้งที่แก้หน้า home / หน้าทำข้อสอบ / round ในเว็บ MDCU หรือ SI ให้ sync มาด้วย**: `python3 bank/sync_engine.py <ac-mdcu checkout>` → `python3 bank/build.py` (บันทึกเวอร์ชันใน `bank/ENGINE_VERSION.txt`)
- ส่วนที่ต่างจากเว็บข้อสอบเก่า (ทำตอน build ใน `bank/build.py`, engine ไม่ถูกแตะ): ธีม `bank/poy.css` (Kanit + Sarabun, สีโพยหมอ) · gate ใช้คีย์ของโพยหมอ (`poy-trusted` / `poy-pass` — เครื่องที่ยืนยันในโพยหมอผ่านทั้งหมด) · ไม่มีปุ่มเปลี่ยนสถาบัน · `bank/poy.js` = ปุ่ม "โพยหมอ" มุมซ้ายบน + การ์ด "Blueprint · วิเคราะห์ · แผนอ่าน" บนหน้า home ของการสอบ
- `bank/nl/config.json`: วอร์ด nl1 (NL part 1), nl2 (NL part 2) · **ชื่อ round แบบ SI** (Random, Year by year, Real Experience …) · บัญชี `poymor/{uid}/bank/nl` · คลังรวม `shared/poy_nl_<ward>`
- `bank/compre/config.json`: c1, c2, c3 · **ชื่อ round แบบ MDCU** · บัญชี `poymor/{uid}/bank/compre` · คลังรวม `shared/poy_compre_<ward>`
- ทุกการสอบ `noExam:["MEQ"]` (หน้า MEQ ขึ้นว่าไม่มีสอบ) · OSCE มีทุกการสอบ หัวข้อ (`osceTopics`) รอผู้ใช้ส่ง
- ข้อสอบ: `bank/<nl|compre>/data_<ward>/data_bN.js` (รูปแบบเดียวกับ ac-mdcu) · แท็ก = blueprint ของการสอบนั้น (`tags.js`, คำศัพท์ `TAGS_VOCAB.md`; NL part 1 ใช้แท็กเดียวกับ `docs/data/blueprint.js`) · topics.js · สรุป High-yield `sum_mcq_*.js` · รูป `bank/<inst>/img/`
- ทุกข้อมีช่อง `inst:"MDCU"|"SI"` + ที่มาใน ro (เช่น "ติวจุฬาฯ Neonatology") · ตรวจด้วย tools ของ ac-mdcu: `DIR=<path จาก ac-mdcu ไป data_nl1> node tools/validate.js` (error เรื่องรูปไม่ต้องสน — ตรวจรูปแยก), `node tools/sumcheck.js <data dir> MCQ`
- build: `python3 bank/build.py` (+ `docs/bank/stats.js`) · **ไม่ทำ artifact ใน Claude ของคลังนี้** (ผู้ใช้สั่ง 27 ต.ค. 2026: artifact ใช้แค่ห้องฝึก/ออกโจทย์ ไม่ทำคลังหรือทั้งเว็บ)

### บอร์ดประกาศ
- แท็ก: เรื่อง (`tag`: nl / compre / both) + สถาบัน (`inst`: ["MDCU","SI"]) · ตัวกรองทั้งสองแบบ · **ใครเข้าสู่ระบบแล้วแก้ประกาศไหนก็ได้** — ทุกการแก้เก็บฉบับเดิมใน `poymor_board/<id>/hist` (ปุ่ม "ประวัติ" → "ใช้ฉบับนี้" ย้อนกลับ) · ลบได้เฉพาะเจ้าของ
- ประกาศตั้งต้น (ปักหมุด) อยู่ใน `data/nl.js` → `board` (NLE Part 1 — ทั้งสองสถาบัน · Progress Test 25 ม.ค. 2570 — จุฬาฯ) ขึ้นเสมอ · แก้ครั้งแรกสร้างเอกสาร id เดียวกันใน Firestore · ไฟล์แนบ (`att`) อยู่ใน `docs/nl/files/`
- **Firestore rules ชุดใหม่ (แทนของเดิม — วางใน `match /databases/{database}/documents { … }`)**:
```
match /poymor_board/{id} {
  allow read: if true;
  allow create: if request.auth != null
    && request.resource.data.keys().hasOnly(['uid','name','tag','inst','title','body','at'])
    && request.resource.data.uid == request.auth.uid
    && request.resource.data.tag in ['nl','compre','both']
    && (!('inst' in request.resource.data) || (request.resource.data.inst is list && request.resource.data.inst.size() <= 2))
    && request.resource.data.title is string && request.resource.data.title.size() > 0 && request.resource.data.title.size() <= 120
    && request.resource.data.body is string && request.resource.data.body.size() <= 4000
    && request.resource.data.name is string && request.resource.data.name.size() <= 40
    && request.resource.data.at == request.time;
  allow update: if request.auth != null
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['tag','inst','title','body','ed','edBy','edName'])
    && request.resource.data.tag in ['nl','compre','both']
    && request.resource.data.inst is list && request.resource.data.inst.size() <= 2
    && request.resource.data.title is string && request.resource.data.title.size() > 0 && request.resource.data.title.size() <= 120
    && request.resource.data.body is string && request.resource.data.body.size() <= 4000
    && request.resource.data.edBy == request.auth.uid
    && request.resource.data.edName is string && request.resource.data.edName.size() <= 40
    && request.resource.data.ed == request.time;
  allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
  match /hist/{h} {
    allow read: if true;
    allow create: if request.auth != null
      && request.resource.data.keys().hasOnly(['tag','inst','title','body','by','name','at'])
      && request.resource.data.by == request.auth.uid
      && request.resource.data.title is string && request.resource.data.title.size() <= 120
      && request.resource.data.body is string && request.resource.data.body.size() <= 4000
      && request.resource.data.at == request.time;
  }
}
```
- คลังรวม (Update for all) ของ NL & Compre ใช้ `shared/poy_nl_<ward>` และ `shared/poy_compre_<ward>` — ใช้ rules `shared/{ward}/items/{id}` เดิมของคลังข้อสอบเก่าได้ถ้าเขียนแบบ wildcard

## Random Topic Summary (`#/topics`)
- สรุปแยกตามหัวข้อที่เลือกเอง · แต่ละหัวข้อมี **สรุป** (`#/topics/<id>/sum/<หน้า>`) และ **ฝึก** (`#/topics/<id>/practice?m=ai|test|flash`)
- สรุป: ใช้ภาพแต่ละหน้าของไฟล์ต้นฉบับ (เนื้อหาไม่แก้) ตัดเป็นกล่องตามหัวข้อย่อย อ่านทีละกล่องหรือทั้งหน้า แตะเพื่อซูม ค้นในหัวข้อได้ · ดาวน์โหลด PDF ต้นฉบับได้
- ฝึก: (1) AI ออกโจทย์ case-based ทีละข้อต่อเนื่อง เลือกขอบเขตได้ตั้งแต่ทั้งหัวข้อ → กลุ่ม → หน้า → หัวข้อย่อย + "เน้นเรื่อง" + ระดับความยาก · ผ่าน API key (ทำในหน้าเว็บ ข้อต่อไปเตรียมไว้ล่วงหน้า) หรือเปิดแชท Claude (2) ข้อสอบที่อยู่ในไฟล์สรุปเอง กดตอบได้ (3) Flashcard (ไฟล์ html ใน `docs/topics/<id>/`, ใส่ชื่อไฟล์ใน `flash[].file`)
- กติกาโจทย์ AI ค่าเริ่มต้นทุกหัวข้อ (`POY_TOPIC_DEFAULTS.mix` ใน data/topics.js): case-based MCQ 5 ตัวเลือก ออกเรื่องอะไรก็ได้ในไฟล์ แต่ ~80% เน้นเชื้อและการเลือกยา · หัวข้อไหนอยากต่างใส่ `mix` ของตัวเอง
- ซิงก์เข้าบัญชี: `topicset` (ค่าที่เลือก), `topicq` (คะแนน AI), `topicst` (คำตอบข้อสอบในสรุป)
- หัวข้อที่ต้นฉบับเป็น**ตาราง** (เช่น Heart Sounds & Murmurs): แต่ละแถว = หัวข้อย่อย, `cells` ใน data.json = กรอบของแต่ละช่อง → หน้าเว็บแสดงเป็นการ์ด ช่องแรก (ชื่อ) เป็นหัว ช่องที่เหลือเรียงพร้อมชื่อคอลัมน์ (`heads`/`hcol` ระดับหน้า) · ภาพ `c/<หน้า>-<คอลัมน์>-<แถว>-<ช่อง>.webp` · สคริปต์ `table_extract.py` → `heart_build.py`
- หน้าที่เป็น**ภาพถ่าย** (เช่นโปสเตอร์ Master Key): `img:[w,h]` ระดับหน้า (ขนาดไม่ใช่ A4), กล่องมี `sz` = ขนาดภาพตัด · `poster_track.py` หาเส้นแถวที่โค้งบนภาพที่ดัดมุมแล้ว แล้ว `heart_build.py` ดัดแต่ละแถวให้ตรงและต่อหัวตารางไว้ด้านบน (ไม่แก้เนื้อหา) · ข้อความให้ AI ของหน้าแบบนี้ต้องพิมพ์จากภาพเอง (ตรวจกับภาพทุกแถว)
- ต่อหัวข้อใส่ได้: `testPages` (หน้าข้อสอบที่ไม่เอาไปออกโจทย์ AI โดยค่าเริ่มต้น), `mix` ของตัวเอง (+ `hint`), `searchPh` / `focusPh` (ตัวอย่างในช่องค้น/ช่องเน้นเรื่อง)
- เพิ่มหัวข้อใหม่จาก PDF: สคริปต์ใน `tools/topic-from-pdf/` — `pdftoppm -r 170` → webp, `extract.py` (กล่อง/คอลัมน์ + ข้อความ, แก้สระไทยที่ฟอนต์ map ไม่ได้ใน `cidpatch.py`), `build_data.py` (ชื่อหน้า/กลุ่ม ต้องแก้ตามไฟล์), ตัดภาพแต่ละกล่องเป็นไฟล์ `docs/topics/<id>/c/<หน้า>-<คอลัมน์>-<กล่อง>.webp` (ห้ามใช้ภาพทั้งหน้าเลื่อนกรอบ — Safari บน iPhone วาดไม่ขึ้น), `selftest.py` (ถ้ามีข้อสอบในไฟล์)

### คลังโจทย์ + ห้องฝึกใน Claude (27 ต.ค. 2026)
- หน้าฝึกของทุกหัวข้อมีแท็บ **คลังโจทย์** (`?m=bank`): **คลังของฉัน** (โจทย์ AI ที่ตอบในเว็บด้วย API key + โจทย์ที่ส่งมาจาก Claude · localStorage `poy-tbank` + บัญชี `poymor/<uid>/tbank/<id>`) และ **🌐 คลังรวมจากทุกคน** (Firestore `poymor_shared/<หัวข้อ>/items/<id>` = `{d, ts, by}`)
- **ห้องฝึกใน Claude** = artifact `C.ai.room` (ตัวเลือก "Claude" ในหน้า AI เปิดลิงก์นี้) — AI ออกทีละข้อด้วยบัญชี Claude ของผู้ใช้ (capability sample) เก็บในบัญชี Claude (db, ส่วนตัวต่อคน) · ปุ่ม **ส่งไปเว็บ** = เปิดเว็บด้วย `#tbank=z.<deflate-raw base64url ของ {v:1,q:[…]}>` → เก็บเข้าคลังของฉัน · **🌐 Update for all** = ลิงก์เดียวกัน + `s:1` → เว็บเก็บแล้วแชร์ขึ้นคลังรวม (ยังไม่เข้าสู่ระบบ = เก็บรอใน `poy-tbank-pend` แชร์ทันทีที่เข้า) · ลิงก์ละไม่เกิน 40 ข้อ
- เพิ่ม/แก้หัวข้อเมื่อไร ต้องสร้างห้องฝึกใหม่: `python3 tools/claude-room/build.py <ไฟล์>.html` แล้ว publish ทับ artifact เดิม (URL เดิม, capabilities sample + db + user)
- Firestore rules ที่ต้องเพิ่ม (วางใน `match /databases/{database}/documents { … }`):
```
match /poymor_shared/{topic}/items/{id} {
  allow read: if true;
  allow create: if request.auth != null
    && request.resource.data.keys().hasOnly(['d','ts','by'])
    && request.resource.data.by == request.auth.uid
    && request.resource.data.d is string && request.resource.data.d.size() <= 20000
    && request.resource.data.ts is number;
  allow update: if request.auth != null && resource.data.by == request.auth.uid
    && request.resource.data.by == request.auth.uid
    && request.resource.data.keys().hasOnly(['d','ts','by'])
    && request.resource.data.d is string && request.resource.data.d.size() <= 20000;
  allow delete: if request.auth != null && resource.data.by == request.auth.uid;
}
```

## อัปเดตเว็บ
- ทุกครั้งที่แก้ `app.js` / `app.css` / `data/*.js` ให้เพิ่มเลข `?v=` ใน `docs/index.html` ทุกบรรทัด เพื่อไม่ให้เบราว์เซอร์ใช้ไฟล์เก่าที่จำไว้

## Medical Soil › Symptomatology & Approach (`#/kb/symp`)
- ที่มา: ตำราอายุรศาสตร์ อาการวิทยา ภาควิชาอายุรศาสตร์ ศิริราช พิมพ์ครั้งที่ 3 (2559) — 44 บท
- แต่ละบท: หัวข้อเป็น toggle, หัวข้อย่อยเป็นกล่องหลายคอลัมน์, algorithm กดกล่องดูรายละเอียด/ไฮไลต์เส้นทาง หรือโหมดทีละขั้น, รูปต้นฉบับ, ออกข้อสอบจากบท (`#/exam?src=y:<id>`)
- แก้เนื้อหา: แก้ `/home/claude/symp/out/chNN.json` (หรือ `docs/symp/chNN.json` แล้ว copy กลับ) → `python3 tools/symp/validate.py NN` → `python3 tools/symp/build.py <โฟลเดอร์>`
- รูปแบบไฟล์บทและกติกาเนื้อหา: `tools/symp/BRIEF.md`
- Clinical skills (`#/kb/skills`)
