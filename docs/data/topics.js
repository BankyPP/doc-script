/* Random Topic Summary — หัวข้อที่สรุปแยกเป็นเรื่อง ๆ
   แต่ละหัวข้อมีโฟลเดอร์ใน docs/topics/<id>/
   - data.json   : หัวข้อย่อย (กลุ่ม → หน้า → กล่อง) + กรอบตำแหน่งบนภาพ + ข้อความแต่ละกล่อง (ใช้ให้ AI ออกข้อสอบ)
   - pNN.webp    : ภาพแต่ละหน้าของไฟล์สรุป (เนื้อหาตามต้นฉบับ ไม่ได้แก้)
   - selftest.json (ถ้ามี) : ข้อสอบที่อยู่ในไฟล์สรุปเอง
   - ไฟล์ต้นฉบับ (pdf)
   flash: ชุด flashcard ที่ใส่ในหน้าฝึก (ไฟล์ html ในโฟลเดอร์เดียวกัน) — ว่างไว้จนกว่าจะได้ไฟล์ */
/* ค่าเริ่มต้นของทุกหัวข้อ (หัวข้อไหนอยากต่าง ให้ใส่ mix ของตัวเองทับ)
   โจทย์ AI: case-based MCQ 5 ตัวเลือก ออกเรื่องอะไรก็ได้ในไฟล์ แต่ ~80% เน้นเชื้อและการเลือกยา */
window.POY_TOPIC_DEFAULTS = {
  mix: {
    p: 0.8,
    main: 'เน้นเรื่องเชื้อก่อโรคและการเลือกยา — จากเคสให้นึกถึงเชื้อ แล้วเลือกยา (empiric / definitive / drug of choice / ยาทางเลือกเมื่อแพ้ยา ตั้งครรภ์ เด็ก หรือเชื้อดื้อยา) · ถ้าเนื้อหาส่วนนี้ไม่เกี่ยวกับเชื้อ ให้เน้นการวินิจฉัยแล้วเลือกยา/การรักษาแทน',
    hint: '(ถ้าเนื้อหาด้านล่างไม่ได้พูดถึงตรง ๆ ให้ใช้เนื้อหานี้เป็นบริบทของเคส แล้วให้คำถามจบที่เชื้อ/ยา)',
    other: 'ถามเรื่องอื่นในเนื้อหาได้ เช่น กลไกออกฤทธิ์ กลไกดื้อยา ADR/DI, PK/PD, dose, ระยะเวลารักษา, prophylaxis, lab/micro หรือหัวข้ออื่นที่อยู่ในไฟล์'
  }
};

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
    testPages: [18, 19, 20],
    flash: [
      { id: 'bug-drug', title: 'Flashcard — Bug → Drug', note: 'จากหน้า 10–11 ของสรุป', pages: [10, 11], file: '' }
    ]
  },
  {
    /* หน้า 1–2 เป็นตาราง: แต่ละแถว = หัวข้อย่อย ตัดภาพเป็นช่อง ๆ (c/<หน้า>-<คอลัมน์>-<แถว>-<ช่อง>.webp) · หน้า 3 เป็นภาพถ่ายโปสเตอร์ ดัดให้ตรงแล้วตัดทีละแถวพร้อมหัวตาราง
       สร้างด้วย tools/topic-from-pdf/table_extract.py + table_build.py */
    id: 'heart',
    title: 'Heart Sounds & Murmurs',
    th: 'เสียงหัวใจและเสียงฟู่',
    c: '#A33A3A',
    dir: 'topics/heart/',
    v: 1,
    pages: 3,
    pdf: 'AI_Heart_Sounds_and_Murmurs.pdf',
    source: 'ตาราง Heart sounds + Heart murmurs (สรุปโดย AI) + ภาพโปสเตอร์ Master Key of All Diseases',
    added: '27 ต.ค. 2026',
    selftest: false,
    searchPh: 'เช่น fixed split, Austin Flint',
    focusPh: 'เช่น split S2, maneuver, murmur ในเด็ก',
    /* โจทย์ AI: case-based MCQ 5 ตัวเลือกเหมือนค่าเริ่มต้น แต่หัวข้อนี้ไม่มีเรื่องเชื้อ/ยา จึงเน้นแปลผลการฟังแทน */
    mix: {
      p: 0.8,
      main: 'เน้นการแปลผลสิ่งที่ฟัง/ตรวจได้จากเคส — จากลักษณะเสียงหัวใจหรือเสียงฟู่ (timing, รูปร่าง, ตำแหน่ง, การกระจาย, pitch, การเปลี่ยนตามการหายใจ/maneuver) ร่วมกับ JVP ชีพจร BP ให้นึกถึงโรคหรือภาวะ แล้วถามการวินิจฉัย กลไกที่ทำให้เกิดเสียง หรือขั้นต่อไป (investigation/management)',
      hint: '(ถ้าเนื้อหาด้านล่างไม่ได้พูดถึงตรง ๆ ให้ใช้เนื้อหานี้เป็นบริบทของเคส แล้วให้คำถามจบที่การวินิจฉัยหรือกลไกจากสิ่งที่ฟังได้)',
      other: 'ถามเรื่องอื่นในเนื้อหาได้ เช่น pathophysiology ทีละขั้น ความหมายของคำ (word-by-word) ตำแหน่งและวิธีฟัง (bell/diaphragm, ท่า) maneuver, Levine grading, red flags ที่ต้องส่ง echo หรือ key pearl'
    },
    flash: []
  }
];
