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
    v: 3,
    pages: 20,
    pdf: 'ABX_Spectrum_Summary_v4_20pages.pdf',
    source: 'ABX Spectrum — ฉบับขยาย 20 หน้า (สรุปโดย Claude)',
    added: '26 ต.ค. 2026',
    selftest: true,
    testPages: [18, 19, 20],
    flash: [
      { id: 'bug-drug', title: 'Flashcard — Bug → Drug', note: 'จากหน้า 10–11 ของสรุป', pages: [10, 11], file: 'flash-bug-drug.html' }
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
    v: 2,
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
  },
  {
    /* 2 เล่ม A3: การ์ดแต่ละใบตัดเป็นภาพ (ตามต้นฉบับ) · chk = ผลตรวจข้อมูลใต้กล่อง · links = ลิงก์จาก QR
       สร้างด้วย tools/topic-from-pdf/ekg_build.py (ekg_glyphs.json, ekg_qr.json, ekg_checks.json) */
    id: 'ekg',
    title: 'EKG',
    th: 'การอ่านคลื่นไฟฟ้าหัวใจ',
    c: '#1F6F8B',
    dir: 'topics/ekg/',
    v: 1,
    pages: 26,
    pdf: 'AI_EKG1_God_A3_Field_Manual.pdf',
    pdfs: [{ f: 'AI_EKG1_God_A3_Field_Manual.pdf', t: 'เล่ม 1 (PDF)' }, { f: 'AI_EKG2_God_Vol2_Deep_Dive.pdf', t: 'เล่ม 2 (PDF)' }],
    source: 'EKG God เล่ม 1 Field Manual + เล่ม 2 Deep Dive (สรุปโดย AI · ตรวจข้อมูลแล้ว 3 พ.ย. 2026)',
    added: '3 พ.ย. 2026',
    selftest: false,
    testPages: [25, 26],
    searchPh: 'เช่น Wellens, Sgarbossa, Mobitz II',
    focusPh: 'เช่น AV block, posterior MI, hyperK',
    /* โจทย์ AI: case-based MCQ 5 ตัวเลือกเหมือนค่าเริ่มต้น แต่หัวข้อนี้ไม่มีเรื่องเชื้อ/ยาเป็นหลัก จึงเน้นอ่าน ECG */
    mix: {
      p: 0.8,
      main: 'เน้นการอ่าน ECG จากเคส — บรรยายลักษณะ ECG เป็นคำในโจทย์ (rate, rhythm, ความสัมพันธ์ P–QRS, PR, QRS, QT, ST–T และ lead ที่พบ) ร่วมกับอาการและบริบท แล้วถามการวินิจฉัย ตำแหน่ง/หลอดเลือดที่เกี่ยวข้อง หรือขั้นต่อไป (stable/unstable, ยาที่ควรให้หรือห้ามให้, ต้อง pace หรือช็อกไหม)',
      hint: '(ถ้าเนื้อหาด้านล่างไม่ได้พูดถึงตรง ๆ ให้ใช้เนื้อหานี้เป็นบริบทของเคส แล้วให้คำถามจบที่การอ่าน ECG หรือการจัดการจาก ECG)',
      other: 'ถามเรื่องอื่นในเนื้อหาได้ เช่น กลไก (action potential, vector, arrhythmogenesis) เกณฑ์และ score (Sgarbossa, Schwartz, Shanghai, VT score) ขนาดยา การวัด QT สาเหตุของ pattern หรือกับดักในการอ่าน'
    },
    flash: []
  },
  {
    /* หัวข้อแบบข้อความ (kind html): เนื้อหาเดียวกับ Round I/O L11 Breast ใน ac-mdcu ทุกตัวอักษร รวมรูปและ reference
       สร้างด้วย tools/topic-from-io/build.py <ac-mdcu> breast — แก้ที่ Round I/O แล้วรันใหม่ + เพิ่ม v */
    id: 'breast',
    title: 'Breast',
    th: 'เต้านม — L11 Breast (Gen Sx) รวม Repro II + Nuc',
    c: '#C2457A',
    dir: 'topics/breast/',
    v: 1,
    pages: 18,
    pdfs: [],
    source: 'Round I/O L11 Breast (เนื้อหาเดียวกัน) — สไลด์ 78 + jod + handout อ.นพ.มาวิน · Breast I/II (Repro II) · รังสีรักษา (Nuc) · guideline ล่าสุด',
    added: '12 พ.ย. 2026',
    selftest: false,
    searchPh: 'เช่น BI-RADS, phyllodes, SLNB',
    focusPh: 'เช่น nipple discharge, staging, HER2+',
    /* โจทย์ AI: case-based MCQ 5 ตัวเลือก — หัวข้อนี้ไม่มีเรื่องเชื้อ/ยา จึงเน้น approach + management จากเคส */
    mix: {
      p: 0.8,
      main: 'เน้น approach และการรักษาจากเคส — จากอาการ/ตรวจร่างกาย/ภาพ (mammogram, US, BI-RADS)/ผลชิ้นเนื้อ ให้เลือก investigation ถัดไป การวินิจฉัย stage หรือ subtype แล้วเลือก management (ผ่าตัดเต้านม/รักแร้ systemic therapy รังสีรักษา หรือ follow-up)',
      hint: '(ถ้าเนื้อหาด้านล่างไม่ได้พูดถึงตรง ๆ ให้ใช้เนื้อหานี้เป็นบริบทของเคส แล้วให้คำถามจบที่ next step หรือการรักษา)',
      other: 'ถามเรื่องอื่นในเนื้อหาได้ เช่น anatomy (lymphatic, nerves) physiology pathology risk factor และ screening ตัวเลขสำคัญ ภาวะเต้านมในผู้ชาย หรือหัวข้ออื่นที่อยู่ในเนื้อหา'
    },
    flash: []
  }
];
