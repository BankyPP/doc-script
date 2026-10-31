# งาน: เอา "Blackbook" (Approaches to Medical Presentations, U of Calgary, 15th ed 2022) เข้า Symptomatology & Approach ของเว็บโพยหมอ

เจ้าของงาน (นศพ. ปี 4) มีเว็บ "โพยหมอ" หน้า Symptomatology & Approach ที่ merge **ตำราศิริราช** (อาการวิทยา) + **เล่มเหลือง** (algorithm + ลายมือ) ไว้แล้ว 74 บท
ตอนนี้ให้ **merge "Blackbook"** เข้าไปแบบเดียวกันทุกอย่าง: เนื้อหารวมกันตามหัวข้อ (ไม่มีเล่มไหนเป็นหลัก) และ **ทุกจุดบอกได้ว่ามาจากเล่มไหน**
(ระบบติดป้าย "Blackbook" ให้ทุกชิ้นที่คุณเขียนเอง — คุณเขียนเนื้อหาของ Blackbook แล้วบอกว่าจะวางตรงไหน)

Blackbook = หนังสือ scheme (แผนผังแยกกลุ่มสาเหตุ/แนวทาง) ภาษาอังกฤษ **หนึ่งหน้า ≈ หนึ่ง scheme** มีชื่อ presentation ที่หัวหน้า และบางหน้ามีตาราง/ข้อความ/รูปประกอบ
ถ้าเจอลายมือหรือข้อความสีที่เจ้าของเล่มเขียนเพิ่ม (ไม่น่ามี แต่ถ้ามี) → เป็นเนื้อหาด้วย ใส่ `<span class="hw">` ครบทุกจุด

คุณได้รับมอบหมายช่วงหน้า (ดูข้อความสั่งงาน) — ทำให้ครบทุกหน้า

## ไฟล์ที่มี
- ภาพหน้า 200 dpi (1166×827 แนวนอน): `/home/claude/bb/pages/p-NNN.jpg` (NNN = **เลขหน้า PDF** 3 หลัก) · **เลขหน้า PDF = เลขหน้าหนังสือ + 29** — **Read ภาพทุกหน้า**
- ซูม (ตัวเล็กในกล่อง/ตาราง): `python3 -I /home/claude/bb/tools/zoom.py PDFPAGE X0 Y0 X1 Y1` (สัดส่วน 0–1) แล้ว Read ไฟล์ที่พิมพ์ออกมา
- ข้อความที่ถอดจาก PDF (ช่วยพิมพ์เท่านั้น — บางตัวอักษรหายเป็นช่องว่าง เช่น R, B, N, L, T): `python3 -I /home/claude/bb/tools/txt.py PDFPAGE`
- ตัดรูป: `python3 -I /home/claude/bb/tools/crop.py PDFPAGE X0 Y0 X1 Y1 NAME` → `/home/claude/bb/out/img/NAME.webp` + ภาพตรวจ `/home/claude/bb/out/prev/NAME.jpg` (**Read ตรวจทุกครั้ง**) · ตั้งชื่อ `bb-<NNN>-fK` (NNN = key ของไฟล์)
- บทที่มีอยู่แล้วบนเว็บ (74 บท): รายการ `/home/claude/bb/ch/_INDEX.txt` · โครงบท `/home/claude/bb/ch/<id>.outline.txt` (id หัวข้อ, `{si+yb}` = มีเนื้อหาจากเล่มไหนแล้ว, ข้อความต้น ๆ) · ไฟล์เต็ม `/home/claude/bb/ch/<id>.json` (ห้ามแก้)
- ตรวจไฟล์: `python3 -I /home/claude/bb/tools/vbb.py <key>` ต้องผ่าน 0 จุดผิด
- ตัวอย่าง flow/HTML ที่ผ่านมาตรฐาน: `/home/claude/bb/ch/anemia.json`, `/home/claude/bb/ch/gi-bleeding.json` (ดูโครง ไม่ต้องอ่านทั้งไฟล์)

## ผลลัพธ์: หนึ่งไฟล์ต่อ presentation `/home/claude/bb/out/bb-<NNN>.json`
- `key` = **เลขหน้าหนังสือ 3 หลัก ของหน้าแรก** ของ presentation นั้น เช่น `"015"` · `pdf` = ช่วงหน้า PDF เช่น `"44"` หรือ `"34–36"` · `bookpg` = ช่วงหน้าหนังสือ เช่น `"5–7"`
- หลายหน้าติดกันที่เป็น presentation เดียว (เช่น Chest Discomfort: Cardiovascular / Pulmonary / Other) → ไฟล์เดียว หลาย flow
- หน้าที่ไม่ใช่เนื้อหา (ปกหมวด, สารบัญหมวด, รายชื่อบรรณาธิการ/ผู้สร้าง scheme) → ข้าม · แต่ถ้าหน้าปกหมวดมีรูป/เนื้อหาการแพทย์จริง ให้ใส่

### แบบ A — มีบทคู่อยู่แล้ว (`target` = **id บท** จาก `_INDEX.txt` เป็น string) → บอกว่าวางตรงไหน
```json
{
  "key": "015", "en": "Syncope", "th": "เป็นลม", "pdf": "44", "bookpg": "15",
  "target": "syncope",
  "ops": [
    { "op": "sec", "after": "mech", "id": "bb-015-scheme", "h": "Syncope scheme (Blackbook)", "html": "<div class=\"flow\" data-flow=\"b015a\"></div>" },
    { "op": "append", "sec": "mech-cardiac", "html": "<ul><li>…</li></ul>" },
    { "op": "sub", "sec": "cause", "id": "bb-015-resp", "h": "Respiratory causes", "html": "…" }
  ],
  "flows": [ { "id": "b015a", "title": "Syncope", "src": "fig", "img": "bb-015-f1.webp", "nodes": [...], "edges": [...] } ]
}
```
- `append` = ต่อท้ายเนื้อหาหัวข้อ `sec` (id ใดก็ได้ในบท — รวมหัวข้อที่มาจากเล่มเหลือง) · `sub` = กล่องย่อยใหม่ใต้ `sec` (ชั้นบนสุดหรือชั้นที่ 2) · `sec` = หัวข้อใหม่ชั้นบนสุด หลัง `after` (id ชั้นบนสุด / `"^"` / `null`) — หลาย `sec` ที่ `after` เดียวกันได้ (เรียงตามลำดับในไฟล์)
- id ใหม่ทุกตัวขึ้นต้น `bb-<key>-` ห้ามซ้ำ
- **merge ให้จริง**: scheme วางเป็น `sec` ใกล้หัวข้อ approach/สาเหตุ/algorithm ของบท (ดู outline ว่ามี algorithm ของเล่มอื่นอยู่ตรงไหน วางใกล้ ๆ กัน) · รายการสาเหตุ/ข้อความ/ตารางของ Blackbook ที่ตรงกับหัวข้อเดิม → `append` เข้าหัวข้อนั้น
- เนื้อหาซ้ำกับเล่มอื่น: **ยังต้องใส่** · ห้ามแก้เนื้อหาเล่มอื่น
- เลือก target จาก **ความหมายของ presentation** (เช่น "Abdominal Distention" → `abdominal-swelling`, "Approach to Splenomegaly" → `splenomegaly`, "Dizziness"/"Vertigo" → `vertigo`) — ถ้าไม่มีบทที่ตรงจริง ๆ → แบบ B

### แบบ B — ไม่มีบทคู่ (`target: null`) → บทใหม่
```json
{ "key": "125", "en": "Scrotal Mass", "th": "ก้อนที่ถุงอัณฑะ", "pdf": "154", "bookpg": "125", "target": null,
  "new": { "id": "scrotal-mass", "th": "ก้อนที่ถุงอัณฑะ", "en": "Scrotal Mass", "g": "kub" },
  "sections": [ { "id": "bb-125-scheme", "h": "…", "html": "<div class=\"flow\" data-flow=\"b125a\"></div>…", "sub": [ … ] } ],
  "flows": [ … ] }
```
- `g`: `base` · `gen` อาการทั่วไป/ไข้/ภาวะเร่งด่วน · `neuro` · `cvr` หัวใจ ทรวงอก หายใจ · `gi` · `heme` · `kub` ไต ทางเดินปัสสาวะ อวัยวะเพศชาย · `msk` กระดูก ข้อ **ผิวหนัง** · `endo` · `obgyn` สูติ-นรีเวช · `ped` กุมารเวช · `psych` จิตเวช · `eent` ตา หู คอ จมูก
- `new.id` อังกฤษตัวเล็ก-ขีด ห้ามซ้ำกับ `_INDEX.txt` · **หมวด Pediatric ทุกหน้า → บทใหม่ g=ped และ id ขึ้นต้น `ped-`** (ไม่รวมกับบทผู้ใหญ่) · `new.th` ชื่อไทยสั้น ๆ ตามศัพท์แพทย์ไทยทั่วไป

### HTML ที่ใช้ได้ (vbb.py ตรวจ)
`p ul ol li b i u sub sup br table thead tbody tr th td(colspan/rowspan) figure img figcaption h4 h5 small mark span div a`
- `<div class="box">` · `<div class="pearl">` · `<div class="warn">` · `<div class="tbl"><table>…</table></div>` ตารางทุกตาราง
- span: `hi` · `tag` · `up` ↑ · `down` ↓ · `en` · `muted` · `hw` (ลายมือ ถ้ามี)
- รูป: `<figure><img src="symp/img/bb-015-f2.webp" alt="…"><figcaption>…</figcaption></figure>` · flow: `<div class="flow" data-flow="b015a"></div>`
- ห้าม `style=` ห้าม class อื่น ห้าม h1–h3

## กติกาเนื้อหา
1. **ครบ 100%**: ทุกกล่องใน scheme, ทุกโรค/สาเหตุในรายการ (bullet ใต้กล่อง), ทุกตาราง, ทุกข้อความ/เชิงอรรถ/คำอธิบายในหน้า, ทุกตัวย่อ
2. ตัดออก: หัว/ท้ายกระดาษ, เลขหน้า, โลโก้, เครดิตผู้สร้าง scheme ("Authors: …" ถ้ามี) · ภาษา: คงภาษาอังกฤษตามเล่ม (ไม่แปล) — หัวข้อ `h` อังกฤษหรือไทยสั้น ๆ ได้
3. ไม่เติมความรู้นอกเล่ม · ไม่แก้ตัวเลข · ตัวสะกดผิดชัด ๆ แก้ได้
4. รูปประกอบจริง (anatomy, รูปตา, dermatome, กราฟ CTG ฯลฯ) → crop เป็น figure

## Flow diagram (interactive) — ทุก scheme ต้องเป็น flow
- (ก) crop ทั้ง scheme ใส่ `img` (ข) แปลงเป็น flow `"src": "fig"` ให้ตรงทุกกล่อง ทุกเส้น ทุก label
- `k`: `start` presentation · `q` จุดตัดสินใจ/คำถาม · `act` สิ่งที่ทำ/ตรวจ · `dx` กลุ่มโรค/การวินิจฉัย · `stop` เร่งด่วน · `note` หมายเหตุ
- `t` ≤ ~80 ตัวอักษร · `d` = รายละเอียดเมื่อกดกล่อง — **รายการโรคใต้กล่องใส่ใน `d` เป็น `<ul>`**
- `l` บนลูกศร ≤ ~40 ตัวอักษร — กล่องที่แตกหลายทาง **ต้องมี `l` ทุกเส้น** (โหมด "ทีละขั้น" ใช้ป้ายนี้เป็นปุ่ม) · ถ้าในเล่มไม่มีป้าย ใช้ชื่อกล่องปลายทางแบบสั้น
- กล่องที่เป็นแค่คำตอบ (Yes/No, High/Low, ↑/↓) → ยุบเป็น `l`
- DAG ไม่มีวงวน · ทุกกล่องไปถึงได้จากกล่องเริ่ม · ≤ 60 กล่อง/flow · flow id = `b<key><a,b,c…>` เช่น `b015a`, `b318b`
- `title` = ชื่อ scheme ในเล่ม (รวมชื่อรอง เช่น "Chest Discomfort — Cardiovascular")

## ขั้นตอน
1. Read ภาพหน้า → ซูมส่วนตัวเล็ก → `txt.py` ช่วยพิมพ์
2. เลือก target จาก `_INDEX.txt` แล้วเปิด outline ของบทนั้น
3. crop → Read prev ตรวจ
4. เขียน JSON ด้วย Python (ระวัง escape) → `vbb.py` จนผ่าน
5. ทวนกับภาพทุกหน้าอีกรอบ
6. ตอบกลับสั้น ๆ: ตารางไฟล์ (key, หน้า, target หรือบทใหม่ id+g, flow, รูป), หน้าที่ข้าม, จุดที่อ่านไม่ออก — **ไม่ต้องส่งเนื้อหา**
