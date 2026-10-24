/* ติว NL & Compre — สรุปเนื้อหา
   กติกา (ทุกครั้งที่ Claude ทำสรุปลงไฟล์นี้):
   - ทุกสรุปต้องบอกว่าเนื้อหามาจากฝั่งไหน: src = ['MDCU'] / ['SI'] / ['MDCU','SI'] (จุฬาฯ / ศิริราช)
     ถ้าในสรุปเดียวมีทั้งสองฝั่ง ให้กำกับแต่ละส่วนด้วย <span class="src mdcu">จุฬาฯ</span> / <span class="src si">ศิริราช</span>
   - NL: เอาเนื้อหาครบจากทั้งสองฝั่ง ไม่มีฝั่งไหนเป็นหลัก
   - Compre: เนื้อหาเหมือน NL (ไม่แยกสถาบัน) — แยกสถาบันเฉพาะข้อสอบเก่า
   รูปแบบแต่ละสรุป:
   { id: 'cardio-hf', title: 'Heart failure', topic: 'Cardiology', exams: ['nl', 'compre'],
     src: ['MDCU', 'SI'], files: ['ชื่อไฟล์ต้นทาง'], updated: 'YYYY-MM-DD', html: '<p>…</p>' } */
window.POY_NL = {
  notes: []
};
