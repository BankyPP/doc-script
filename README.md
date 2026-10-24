# โพยหมอ

คลังความรู้ตั้งแต่ปี 1 ถึงใบประกอบวิชาชีพ — preclinic, clinic, 1000 MAI และห้องสอบ AI

เว็บอยู่ในโฟลเดอร์ `docs/` (GitHub Pages: branch `main`, folder `/docs`) ไม่ต้อง build

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `docs/data/config.js` | ตั้งค่า: Google Sheet 1000 MAI, รายการการสอบ NL & Compre, รุ่น AI |
| `docs/data/systems.js` | ระบบ + สีประจำระบบ + คำที่ใช้จับคู่คอลัมน์ "ระบบ" ในชีต |
| `docs/data/sample-diseases.js` | ข้อมูลตัวอย่าง ใช้ตอนยังไม่เชื่อมชีต |
| `docs/data/preclinic.js` | สรุป preclinic แยกตาม system |
| `docs/data/clinic.js` | สมุดวอร์ด + approach ตามอาการนำ |
| `docs/data/nl.js` | ติว NL & Compre — สรุปเนื้อหา (กำกับที่มา จุฬาฯ / ศิริราช ทุกเรื่อง) |
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

## อัปเดตเว็บ
- ทุกครั้งที่แก้ `app.js` / `app.css` / `data/*.js` ให้เพิ่มเลข `?v=` ใน `docs/index.html` ทุกบรรทัด เพื่อไม่ให้เบราว์เซอร์ใช้ไฟล์เก่าที่จำไว้
