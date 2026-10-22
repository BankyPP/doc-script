# โพยหมอ

คลังความรู้ตั้งแต่ปี 1 ถึงใบประกอบวิชาชีพ — preclinic, clinic, 1000 โรค และห้องสอบ AI

เว็บอยู่ในโฟลเดอร์ `docs/` (GitHub Pages: branch `main`, folder `/docs`) ไม่ต้อง build

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `docs/data/config.js` | ตั้งค่า: Google Sheet 1000 โรค, วันสอบ, รุ่น AI |
| `docs/data/systems.js` | ระบบ + สีประจำระบบ + คำที่ใช้จับคู่คอลัมน์ "ระบบ" ในชีต |
| `docs/data/sample-diseases.js` | ข้อมูลตัวอย่าง ใช้ตอนยังไม่เชื่อมชีต |
| `docs/data/preclinic.js` | สรุป preclinic แยกตาม system |
| `docs/data/clinic.js` | สมุดวอร์ด + approach ตามอาการนำ |
| `docs/app.js`, `docs/app.css` | ตัวเว็บ |

## Google Sheet 1000 โรค
- แชร์ชีตเป็น Anyone with the link → Viewer แล้วใส่ `sheet.id` / `sheet.gid` ใน config.js
- แถวแรกคือหัวคอลัมน์ · คอลัมน์ชื่อโรค / ชื่อไทย / ระบบ / No. ถูกจับอัตโนมัติจากชื่อหัว ที่เหลือแสดงเป็นหัวข้อในหน้าโรคตามลำดับในชีต
- ในช่องข้อมูล ขึ้นบรรทัดใหม่ด้วย `- ` จะกลายเป็น bullet

## บัญชี (Firebase)
- ใช้โปรเจกต์ Firebase `ac-mdcu` ร่วมกับคลังข้อสอบเก่า MDCU — ล็อกอินบัญชีเดียวกันได้ (Google / ชื่อผู้ใช้ / อีเมล)
- เก็บที่ Firestore `poymor/<uid>/data/state` · rules: `match /poymor/{uid}/{doc=**}` เจ้าของอ่าน/เขียนได้คนเดียว
- ซิงก์: หน้าที่อ่านค้าง, ข้อสอบ AI ชุดล่าสุด + คำตอบ, ค่าที่เลือกในห้องสอบ · API key ไม่ซิงก์

## อัปเดตเว็บ
- ทุกครั้งที่แก้ `app.js` / `app.css` / `data/*.js` ให้เพิ่มเลข `?v=` ใน `docs/index.html` ทุกบรรทัด เพื่อไม่ให้เบราว์เซอร์ใช้ไฟล์เก่าที่จำไว้
