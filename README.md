# โพยหมอ

คลังความรู้ตั้งแต่ปี 1 ถึงใบประกอบวิชาชีพ — preclinic, clinic, 1000 MAI และห้องสอบ

เว็บอยู่ในโฟลเดอร์ `docs/` (GitHub Pages: branch `main`, folder `/docs`) ไม่ต้อง build

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `docs/data/config.js` | ตั้งค่า: Google Sheet 1000 MAI, รายการการสอบ NL & Compre, รุ่น AI |
| `docs/data/systems.js` | ระบบ + สีประจำระบบ + คำที่ใช้จับคู่คอลัมน์ "ระบบ" ในชีต |
| `docs/data/sample-diseases.js` | ข้อมูลตัวอย่าง ใช้ตอนยังไม่เชื่อมชีต |
| `docs/data/preclinic.js` | สรุป preclinic แยกตาม system |
| `docs/data/clinic.js` | สมุดวอร์ด + approach ตามอาการนำ |
| `docs/data/nl.js` | ติว NL & Compre — สรุปเนื้อหา (กำกับที่มา จุฬาฯ / ศิริราช ทุกเรื่อง) |
| `docs/data/topics.js` | Random Topic Summary — รายการหัวข้อ (ไฟล์ของแต่ละหัวข้ออยู่ใน `docs/topics/<id>/`) |
| `docs/app.js`, `docs/app.css` | ตัวเว็บ |

## Google Sheet 1000 MAI
- แชร์ชีตเป็น Anyone with the link → Viewer แล้วใส่ `sheet.id` / `sheet.gid` ใน config.js
- แถวแรกคือหัวคอลัมน์ · คอลัมน์ชื่อโรค / ชื่อไทย / ระบบ / No. ถูกจับอัตโนมัติจากชื่อหัว ที่เหลือแสดงเป็นหัวข้อในหน้าโรคตามลำดับในชีต
- ในช่องข้อมูล ขึ้นบรรทัดใหม่ด้วย `- ` จะกลายเป็น bullet

## บัญชี (Firebase)
- ใช้โปรเจกต์ Firebase `ac-mdcu` ร่วมกับคลังข้อสอบเก่า MDCU — ล็อกอินบัญชีเดียวกันได้ (Google / ชื่อผู้ใช้ / อีเมล)
- เก็บที่ Firestore `poymor/<uid>/data/state` · rules: `match /poymor/{uid}/{doc=**}` เจ้าของอ่าน/เขียนได้คนเดียว
- ซิงก์: หน้าที่อ่านค้าง, ข้อสอบ AI ชุดล่าสุด + คำตอบ, ค่าที่เลือกในห้องสอบ, ตั้งค่าการสอบ NL & Compre · API key ไม่ซิงก์

## ติว NL & Compre (`#/nl`)
- หน้าย่อย: บอร์ดประกาศ `#/nl/board` · สรุปเนื้อหา `#/nl/notes` · ข้อสอบ `#/nl/exams` · ตั้งค่า `#/nl/settings`
- การสอบ: NL1, NL2, Compre 1, Compre 2, Compre 3 — ตั้งรูปแบบ (MCQ/MEQ/OSCE) วันสอบ เวลาเริ่ม จำนวน และเวลาสอบได้ในหน้าตั้งค่า (เก็บต่อคน)
- กติกาเนื้อหา: NL เอาเนื้อหาครบจากจุฬาฯ และศิริราช ไม่มีฝั่งไหนเป็นหลัก · Compre เนื้อหาเหมือน NL แต่ข้อสอบเก่าแยกตามสถาบัน · ทุกเรื่องบอกที่มา

### บอร์ดประกาศ — Firestore rules ที่ต้องเพิ่ม (วางใน `match /databases/{database}/documents { … }`)
```
match /poymor_board/{id} {
  allow read: if true;
  allow create: if request.auth != null
    && request.resource.data.keys().hasOnly(['uid','name','tag','title','body','at'])
    && request.resource.data.uid == request.auth.uid
    && request.resource.data.tag in ['nl','compre','both']
    && request.resource.data.title is string && request.resource.data.title.size() > 0 && request.resource.data.title.size() <= 120
    && request.resource.data.body is string && request.resource.data.body.size() <= 4000
    && request.resource.data.name is string && request.resource.data.name.size() <= 40
    && request.resource.data.at == request.time;
  allow update: if request.auth != null && resource.data.uid == request.auth.uid
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['tag','title','body','ed'])
    && request.resource.data.tag in ['nl','compre','both']
    && request.resource.data.title is string && request.resource.data.title.size() > 0 && request.resource.data.title.size() <= 120
    && request.resource.data.body is string && request.resource.data.body.size() <= 4000
    && request.resource.data.ed == request.time;
  allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
}
```

## Random Topic Summary (`#/topics`)
- สรุปแยกตามหัวข้อที่เลือกเอง · แต่ละหัวข้อมี **สรุป** (`#/topics/<id>/sum/<หน้า>`) และ **ฝึก** (`#/topics/<id>/practice?m=ai|test|flash`)
- สรุป: ใช้ภาพแต่ละหน้าของไฟล์ต้นฉบับ (เนื้อหาไม่แก้) ตัดเป็นกล่องตามหัวข้อย่อย อ่านทีละกล่องหรือทั้งหน้า แตะเพื่อซูม ค้นในหัวข้อได้ · ดาวน์โหลด PDF ต้นฉบับได้
- ฝึก: (1) AI ออกโจทย์ case-based ทีละข้อต่อเนื่อง เลือกขอบเขตได้ตั้งแต่ทั้งหัวข้อ → กลุ่ม → หน้า → หัวข้อย่อย + "เน้นเรื่อง" + ระดับความยาก · ผ่าน API key (ทำในหน้าเว็บ ข้อต่อไปเตรียมไว้ล่วงหน้า) หรือเปิดแชท Claude (2) ข้อสอบที่อยู่ในไฟล์สรุปเอง กดตอบได้ (3) Flashcard (ไฟล์ html ใน `docs/topics/<id>/`, ใส่ชื่อไฟล์ใน `flash[].file`)
- ซิงก์เข้าบัญชี: `topicset` (ค่าที่เลือก), `topicq` (คะแนน AI), `topicst` (คำตอบข้อสอบในสรุป)
- เพิ่มหัวข้อใหม่จาก PDF: สคริปต์ใน `tools/topic-from-pdf/` — `pdftoppm -r 170` → webp, `extract.py` (กล่อง/คอลัมน์ + ข้อความ, แก้สระไทยที่ฟอนต์ map ไม่ได้ใน `cidpatch.py`), `build_data.py` (ชื่อหน้า/กลุ่ม ต้องแก้ตามไฟล์), ตัดภาพแต่ละกล่องเป็นไฟล์ `docs/topics/<id>/c/<หน้า>-<คอลัมน์>-<กล่อง>.webp` (ห้ามใช้ภาพทั้งหน้าเลื่อนกรอบ — Safari บน iPhone วาดไม่ขึ้น), `selftest.py` (ถ้ามีข้อสอบในไฟล์)

## อัปเดตเว็บ
- ทุกครั้งที่แก้ `app.js` / `app.css` / `data/*.js` ให้เพิ่มเลข `?v=` ใน `docs/index.html` ทุกบรรทัด เพื่อไม่ให้เบราว์เซอร์ใช้ไฟล์เก่าที่จำไว้
