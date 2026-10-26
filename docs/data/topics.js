/* Random Topic Summary — หัวข้อที่สรุปแยกเป็นเรื่อง ๆ
   แต่ละหัวข้อมีโฟลเดอร์ใน docs/topics/<id>/
   - data.json   : หัวข้อย่อย (กลุ่ม → หน้า → กล่อง) + กรอบตำแหน่งบนภาพ + ข้อความแต่ละกล่อง (ใช้ให้ AI ออกข้อสอบ)
   - pNN.webp    : ภาพแต่ละหน้าของไฟล์สรุป (เนื้อหาตามต้นฉบับ ไม่ได้แก้)
   - selftest.json (ถ้ามี) : ข้อสอบที่อยู่ในไฟล์สรุปเอง
   - ไฟล์ต้นฉบับ (pdf)
   flash: ชุด flashcard ที่ใส่ในหน้าฝึก (ไฟล์ html ในโฟลเดอร์เดียวกัน) — ว่างไว้จนกว่าจะได้ไฟล์ */
window.POY_TOPICS = [
  {
    id: 'id-atb',
    title: 'ID & Antibiotics',
    th: 'โรคติดเชื้อและยาต้านจุลชีพ',
    c: '#2F7466',
    dir: 'topics/id-atb/',
    v: 2,
    pages: 20,
    pdf: 'ABX_Spectrum_Summary_v4_20pages.pdf',
    source: 'ABX Spectrum — ฉบับขยาย 20 หน้า (สรุปโดย Claude)',
    added: '26 ต.ค. 2026',
    selftest: true,
    flash: [
      { id: 'bug-drug', title: 'Flashcard — Bug → Drug', note: 'จากหน้า 10–11 ของสรุป', pages: [10, 11], file: '' }
    ]
  }
];
