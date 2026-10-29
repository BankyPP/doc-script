/* เลขรุ่นของไฟล์ใน docs/gdoc/ — เพิ่มทุกครั้งที่สร้างฉบับเก็บใหม่ (กันเบราว์เซอร์ใช้ไฟล์เก่า) */
window.POY_GDOC_V = 3;

/* Preclinic + Clinic จาก Google Docs / Sheets
   - main: Doc "โพยหมอ" (แชร์ Anyone with the link → Viewer) — GitHub Actions ดึงมาอัปเดต snap ทุก ~10 นาที
     สร้างเองได้ด้วย tools/gdoc/build.py (ดู README)
   - tree: สำรองเท่านั้น — ฉบับที่ GitHub Actions ดึงมามีชั้นของแท็บจริงจาก Doc
   - clinic: แท็บหลักที่ไปอยู่ฝั่ง Clinic (ที่เหลือทั้งหมดอยู่ Preclinic) → skills = Clinical skills, symp = Symptomatology & Approach, ward = สรุปวอร์ด
   - hide: แท็บที่ไม่ขึ้นเว็บเลย
   - extras: ไฟล์อื่นที่ดึงมาครั้งเดียว (ไม่อัปเดตเอง) แล้วเอาไปแขวนใต้แท็บ under */
window.POY_GDOC = {
  main: {
    id: '11lXA1hl_ZiBV_kCget8vxl1RGVGM_7beGwfYX6r2EnE',
    name: 'โพยหมอ',
    snap: 'gdoc/poymor.json',
    /* live: true = หน้าเว็บดึง Doc ตรงจาก Google — Google ไม่อนุญาต (CORS) จึงปิด
       แทนด้วย GitHub Actions (.github/workflows/gdoc-sync.yml) ดึงมาอัปเดต snap ทุก ~10 นาที */
    live: false,
    hide: ['homework (?)']
  },
  clinic: {
    'History Taking (General)': 'skills',
    'Physical Exam (GA)': 'skills',
    'Lab Procedures': 'skills',
    'Symptomatology': 'symp',
    'Clinic': 'ward'
  },
  /* ป้ายของแท็บ (Medical Soilเก็บตาม system — วอร์ดเป็นแค่ป้าย):
       'ชื่อแท็บ': { lv: 'pre' | 'clinic', ward: ['med','gensx','subspe','ped','obgyn'] }
     แท็บย่อยได้ป้ายตามแท็บแม่ · แท็บใต้ "Clinic" ได้วอร์ดจากชื่อแท็บเองอยู่แล้ว (เช่น Surgery → Gen Sx + Subspe Sx)
     ไฟล์ที่เรียนจากวอร์ด: ใส่ในแท็บ system ของเรื่องนั้นใน Doc แล้วเพิ่มป้ายตรงนี้ → ขึ้นในหน้า "ตามวอร์ด" เอง */
  tags: {
  },
  /* ชั้นของแท็บ — ใช้เฉพาะตอนฉบับเก็บไม่มีข้อมูลชั้น (ฉบับที่ GitHub Actions ดึงมีชั้นจริงจาก Doc อยู่แล้ว) */
  tree: [
    'Study Plan', 'law เพราะ ป.อ.มาตรา64', 'Normal values & approaches', 'homework (?)',
    'History Taking (General)', '  Hx (Symptom-based)', '  Hx (Pediatrics)', '  Hx SUM OSCE', '    Hx SUM Ped',
    'Physical Exam (GA)', '  PE (Pediatrics)', '  PE SUM OSCE',
    'Lab Procedures', '  Protocols', 'Symptomatology', 'Clinic', '  Surgery',
    'Hemato', '  Hematology', '  Hematologic Disorders', '  Hematologic Investigation',
    'Neuro', '  Neuroanatomy', '  Neurophysiology', '  Neuro Disorders', '  Neuropharm & Abx', '  Neuro Investigation', '  Neuro Congenital Disorders',
    'Skin', '  Skin Anatomy & Fx', '  Skin Pharm & Abx', '  Skin Lab Investigation', '  Skin Spot Diag', '  Skin Pathology', '  Skin Congenital Disorders',
    'MS', '  MS Anatomy', '  MS Physiology', '  MS Disorders', '  MS Investigation', '  MS Congenital Disorders',
    'RS', '  RS Anatomy', '  RS Physiology', '  RS Disorders', '  RS Pharm & Abx', '  RS Investigation', '  RS Congenital Disorders',
    'CVS', '  CVS Anatomy', '  CVS Physiology', '  CVS Disorders', '  CVS Pharm & Abx', '    Lipid Lowering Drugs', '  CVS Investigations', '  CVS Congenital Disorders',
    'GI', '  GI Anatomy', '  GI Physiology', '  GI Disorders', '  GI Pharm & Abx', '  GI Investigation', '  GI Congenital Disorders',
    'KUB', '  KUB Anatomy', '  KUB Physiology', '  KUB Disorders', '  KUB Pharm & Abx', '  KUB Investigation', '  KUB Congenital Disoders',
    'Repro', '  Repro Anatomy', '  Repro Physiology', '  Repro Disorders', '  Repro Pharm & Abx', '  Repro Investigation', '  Repro Congenital Disorders',
    'Endocrine System', '  Endoc Anatomy', '  Endoc Physiology', '  Endoc Disorders', '  Endoc Pharm & Abx', '  Endoc Investigation', '  Endoc Congenital Disorders',
    'Psychopathology', 'Immune System', '  Normal Immune', '  Immunocompromised Disorders', '  Immuno Lab Investigation',
    'General Principles', '  Cell Biology', '  Metabo & Nutrition', '  Genetics', '  Biostat', '  Medical Ethics', '  Medical Safety', '  Histology', '  Pathology', '  Radiology'
  ],
  /* สีของแต่ละระบบ (ชื่อแท็บชั้นบนสุด) — สีสีน้ำแบบเดียวกับหน้าอื่นของเว็บ */
  look: {
    'Study Plan': ['#7A5C3E', 'Raw umber', 'แผนการอ่าน'],
    'law เพราะ ป.อ.มาตรา64': ['#5A6258', 'Davy\'s grey', 'กฎหมายการแพทย์'],
    'Normal values & approaches': ['#2F7466', 'Viridian', 'ค่าปกติและการแปลผล'],
    'Hemato': ['#9B4F2E', 'Burnt sienna', 'ระบบเลือด'],
    'Neuro': ['#4A5560', "Payne's grey", 'ระบบประสาท'],
    'Skin': ['#C8A256', 'Naples yellow', 'ระบบผิวหนัง'],
    'MS': ['#6F7F5E', 'Terre verte', 'ระบบกระดูกและกล้ามเนื้อ'],
    'RS': ['#3E7CA6', 'Cerulean', 'ระบบหายใจ'],
    'CVS': ['#A33A3A', 'Alizarin crimson', 'ระบบหัวใจและหลอดเลือด'],
    'GI': ['#C9952E', 'Yellow ochre', 'ระบบทางเดินอาหารและตับ'],
    'KUB': ['#3C4A7A', 'Indigo', 'ระบบไตและทางเดินปัสสาวะ'],
    'Repro': ['#B5607A', 'Rose madder', 'ระบบสืบพันธุ์'],
    'Endocrine System': ['#5C7F3A', 'Sap green', 'ระบบต่อมไร้ท่อ'],
    'Psychopathology': ['#6B5A86', 'Dioxazine violet', 'จิตพยาธิวิทยา'],
    'Immune System': ['#8E6A3A', 'Raw sienna', 'ระบบภูมิคุ้มกัน'],
    'General Principles': ['#55606B', 'Neutral tint', 'หลักการพื้นฐาน'],
    'History Taking (General)': ['#355A3A', 'Hooker\'s green', 'ซักประวัติ'],
    'Physical Exam (GA)': ['#2F7466', 'Viridian', 'ตรวจร่างกาย'],
    'Lab Procedures': ['#3C4A7A', 'Indigo', 'หัตถการและแลป'],
    'Symptomatology': ['#A44A2A', 'Burnt sienna', 'อาการวิทยา'],
    'Clinic': ['#5C7F3A', 'Sap green', 'สรุปวอร์ด']
  },
  extras: [
    { under: 'MS Anatomy', kind: 'sheet', snap: 'gdoc/msk-anatomy.json', title: 'MSK Anatomy Atlas',
      from: 'Google Sheet MSK Anatomy Atlas · บท Musculoskeletal system ปี 2' },
    { under: 'Histology', kind: 'sheet', snap: 'gdoc/tissue-bio.json', title: 'Tissue Bio Spot Hack',
      from: 'Google Sheet "Tissue Bio Spot Hack"' },
    /* DocQ Med Template 2026 — แต่ละแท็บแขวนไว้ใต้เรื่องที่ตรงกัน (ชื่อแท็บเดิม) */
    { kind: 'doc', snap: 'gdoc/docq.json', id: '15kN0TE6ZRFJCnN-baFPTTVOgsa-lxp7T9NtwWdIPaZk', from: 'Google Doc "[AI] DocQ Med Template 2026"', tabs: [
      { tab: 'DocQ Med Template', under: 'Clinic' },
      { tab: 'DocQ Example MED 2026', under: 'Clinic' },
      { tab: 'Hx Sum OSCE', under: 'History Taking (General)' },
      { tab: 'Tab 4', under: 'Physical Exam (GA)' },
      { tab: 'ROS & PE Template', under: 'Tab 4' },
      { tab: 'Neuro PE MedUMore', under: 'Physical Exam (GA)' },
      { tab: 'แปลผล Weber & Rinne', under: 'Physical Exam (GA)' },
      { tab: 'MEQ Approach', under: 'Clinic' },
      { tab: 'DKA', under: 'MEQ Approach' },
      { tab: 'OSCE Note', under: 'Lab Procedures' },
      { tab: 'CXR Interpretation', under: 'OSCE Note' }
    ] },
    /* CNS & PNS Comprehensive Tutorial 2026 (B03) + สรุป 10 หน้า — แขวนใต้ Neuro และแท็บย่อยของ Neuro
       สร้างด้วย tools/neuro-tut/build.py (ไม่แตะ Google Doc) */
    { kind: 'doc', snap: 'gdoc/neuro-tut.json', badge: 'Tutorial', from: 'CNS & PNS Comprehensive Tutorial 2026 (B03) + สรุป 10 หน้า', tabs: [
      { tab: "CNS & PNS Tutorial 2026", under: "Neuro" },
      { tab: "Localization approach", under: "CNS & PNS Tutorial 2026" },
      { tab: "Neuro examination", under: "CNS & PNS Tutorial 2026" },
      { tab: "High-yield tables", under: "CNS & PNS Tutorial 2026" },
      { tab: "Mnemonics & red flags", under: "CNS & PNS Tutorial 2026" },
      { tab: "Quiz 145 ข้อ", under: "CNS & PNS Tutorial 2026" },
      { tab: "สไลด์ต้นฉบับ 76 หน้า", under: "CNS & PNS Tutorial 2026" },
      { tab: "ไฟล์สรุป 10 หน้า (PDF)", under: "CNS & PNS Tutorial 2026" },
      { tab: "Peripheral nervous system", under: "Neuroanatomy" },
      { tab: "Motor & sensory pathways", under: "Neuroanatomy" },
      { tab: "Brainstem & cranial nerves", under: "Neuroanatomy" },
      { tab: "Spinal cord", under: "Neuroanatomy" },
      { tab: "Cerebral cortex & lobes", under: "Neuroanatomy" },
      { tab: "Cerebral vasculature", under: "Neuroanatomy" },
      { tab: "Visual pathway & eye movements", under: "Neuroanatomy" },
      { tab: "Hypothalamus & autonomic", under: "Neuroanatomy" },
      { tab: "Nerve fibers & action potential", under: "Neurophysiology" },
      { tab: "Reflex, tone & motor unit", under: "Neurophysiology" },
      { tab: "NMJ transmission", under: "Neurophysiology" },
      { tab: "Basal ganglia & dopamine", under: "Neurophysiology" },
      { tab: "Pain physiology", under: "Neurophysiology" },
      { tab: "Consciousness & syncope", under: "Neurophysiology" },
      { tab: "CBF, ICP & autoregulation", under: "Neurophysiology" },
      { tab: "Bladder control", under: "Neurophysiology" },
      { tab: "Memory & hearing", under: "Neurophysiology" },
      { tab: "Peripheral neuropathy & GBS", under: "Neuro Disorders" },
      { tab: "NMJ disorders", under: "Neuro Disorders" },
      { tab: "Myopathy", under: "Neuro Disorders" },
      { tab: "Motor neuron disease", under: "Neuro Disorders" },
      { tab: "Weakness: เปรียบเทียบทุกระดับ", under: "Neuro Disorders" },
      { tab: "Ischemic stroke", under: "Neuro Disorders" },
      { tab: "Hemorrhagic stroke & SAH", under: "Neuro Disorders" },
      { tab: "↑ICP & herniation", under: "Neuro Disorders" },
      { tab: "Head injury", under: "Neuro Disorders" },
      { tab: "Brain tumors", under: "Neuro Disorders" },
      { tab: "Brainstem syndromes", under: "Neuro Disorders" },
      { tab: "Spinal cord syndromes", under: "Neuro Disorders" },
      { tab: "Movement disorders & Parkinson", under: "Neuro Disorders" },
      { tab: "Headache & neuralgia", under: "Neuro Disorders" },
      { tab: "CNS infections", under: "Neuro Disorders" },
      { tab: "Dementia & memory disorders", under: "Neuro Disorders" },
      { tab: "Altered consciousness & brain death", under: "Neuro Disorders" },
      { tab: "Toxidromes & withdrawal", under: "Neuro Disorders" },
      { tab: "Neuropathology: inclusions", under: "Neuro Disorders" },
      { tab: "Stroke drugs", under: "Neuropharm & Abx" },
      { tab: "Antiparkinson & dopaminergic drugs", under: "Neuropharm & Abx" },
      { tab: "Antipsychotics & EPS", under: "Neuropharm & Abx" },
      { tab: "Antidepressants, BZD & sedatives", under: "Neuropharm & Abx" },
      { tab: "Opioids & analgesics", under: "Neuropharm & Abx" },
      { tab: "Anesthetics", under: "Neuropharm & Abx" },
      { tab: "Anti-seizure medications", under: "Neuropharm & Abx" },
      { tab: "Migraine drugs", under: "Neuropharm & Abx" },
      { tab: "Anti-vertigo", under: "Neuropharm & Abx" },
      { tab: "Antibiotics in CNS infection", under: "Neuropharm & Abx" },
      { tab: "Drug high-yield (ตาราง)", under: "Neuropharm & Abx" },
      { tab: "LP & CSF", under: "Neuro Investigation" },
      { tab: "NCS, EMG & RNS", under: "Neuro Investigation" },
      { tab: "EEG", under: "Neuro Investigation" },
      { tab: "Neuroimaging", under: "Neuro Investigation" },
      { tab: "Lab, antibodies & biomarkers", under: "Neuro Investigation" },
      { tab: "Neural tube defects", under: "Neuro Congenital Disorders" },
      { tab: "Neurocutaneous syndromes", under: "Neuro Congenital Disorders" },
      { tab: "Muscular dystrophy & SMA", under: "Neuro Congenital Disorders" }
    ] }
  ]
};
