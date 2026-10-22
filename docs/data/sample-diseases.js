/* ข้อมูลตัวอย่าง — ใช้เมื่อยังไม่ได้ใส่ Google Sheet ใน config.js
   รูปแบบเดียวกับชีต: แถวแรกเป็นหัวคอลัมน์ */
window.POY_SAMPLE = [
  ['ชื่อโรค', 'ชื่อไทย', 'ระบบ', 'พบใน', 'จุดจับ', 'นิยามและสาเหตุ', 'อาการ', 'การวินิจฉัย', 'Lab เบื้องต้น', 'Initial management', 'ภาวะแทรกซ้อน', 'Pearl'],
  ['Melioidosis', 'เมลิออยโดสิส', 'Infectious',
    'ชาวนาอีสาน, เบาหวาน, ฤดูฝน',
    'Pneumonia หรือฝีหลายอวัยวะ · culture ได้ B. pseudomallei',
    'การติดเชื้อ Burkholderia pseudomallei ซึ่งเป็น Gram-negative bacillus ที่อยู่ในดินและน้ำ ติดผ่านผิวหนังที่มีแผล การสูดหายใจ หรือการกลืนกิน',
    '- Pneumonia — พบบ่อยที่สุด เป็นได้ทั้งเฉียบพลันและเรื้อรังคล้าย TB\n- Bacteremia / septic shock\n- Abscess ตับ ม้าม ต่อมลูกหมาก (เด็กไทยพบ parotid abscess ได้)\n- ติดเชื้อผิวหนัง, septic arthritis, osteomyelitis',
    '- Culture คือ gold standard: blood, sputum, pus, urine, throat swab (Ashdown’s selective medium)\n- Gram stain: bipolar staining แบบ “safety pin” ช่วยให้สงสัย แต่ยืนยันไม่ได้\n- Serology (IHA) ใช้ยากในพื้นที่ระบาด เพราะคนทั่วไปก็มี titer สูง\n- Ultrasound ช่องท้องหา abscess ตับและม้าม',
    'CBC, hemoculture ×2, sputum G/S + C/S, urine C/S, FBS/HbA1c, BUN/Cr, LFT, CXR, US whole abdomen',
    '- Intensive (IV อย่างน้อย 10–14 วัน): ceftazidime 50 mg/kg (สูงสุด 2 g) ทุก 6–8 ชม. หรือ meropenem 25 mg/kg (สูงสุด 1 g) ทุก 8 ชม. ถ้า severe sepsis/ICU\n- Eradication (กินอย่างน้อย 12 สัปดาห์): co-trimoxazole ตามน้ำหนัก (ทางเลือก amoxicillin–clavulanate)\n- Drain abscess ขนาดใหญ่, คุมน้ำตาล, sepsis bundle\n(ขนาดยาตรวจกับ guideline ก่อนใช้จริง)',
    'อัตราตายสูงโดยเฉพาะเมื่อมี bacteremia หรือ septic shock · relapse ได้ถ้ากินยาระยะ eradication ไม่ครบ',
    '- ชาวนาอีสาน + เบาหวาน + ไข้ + ฝีหลายที่ → คิดถึง melioidosis ก่อน\n- เชื้อดื้อ aminoglycoside, penicillin, cephalosporin รุ่น 1–2 โดยธรรมชาติ ช้อยพวกนี้มักเป็นตัวหลอก\n- สงสัยแล้วเริ่ม ceftazidime ได้เลย ไม่ต้องรอ culture'],
  ['Leptospirosis', 'โรคฉี่หนู', 'Infectious', 'ลุยน้ำ ย่ำโคลน หลังน้ำท่วม', 'ไข้ ปวดน่อง conjunctival suffusion · AKI, ปอดเลือดออก'],
  ['Scrub typhus', 'ไข้รากสาดใหญ่', 'Infectious', 'เข้าป่า ทำไร่ ถางหญ้า', 'Eschar · ไข้ ต่อมน้ำเหลืองโต · ตอบสนองต่อ doxycycline'],
  ['Dengue hemorrhagic fever', 'ไข้เลือดออกเดงกี', 'Infectious', 'ฤดูฝน เด็กและวัยรุ่น', 'Critical phase: plasma leakage, Hct สูงขึ้น, เกล็ดเลือดต่ำ'],
  ['Diabetic ketoacidosis', 'ภาวะเลือดเป็นกรดจากคีโตน', 'Endocrine', 'T1DM ขาดยา insulin หรือติดเชื้อ', 'Glucose สูง · ketone สูง · pH < 7.3 หรือ HCO₃⁻ < 18'],
  ['β-thalassemia / HbE', 'เบต้าธาลัสซีเมีย / ฮีโมโกลบินอี', 'Hematology', 'พบบ่อยในไทย มีประวัติครอบครัว', 'Microcytic anemia, target cell · ยืนยันด้วย Hb typing'],
  ['Acute appendicitis', 'ไส้ติ่งอักเสบเฉียบพลัน', 'GI & Hepatobiliary', 'วัยรุ่นถึงวัยทำงาน', 'ปวดรอบสะดือแล้วย้ายไป RLQ · Alvarado score'],
  ['STEMI', 'กล้ามเนื้อหัวใจตายเฉียบพลันชนิด ST ยก', 'Cardiovascular', 'สูงอายุ เบาหวาน ความดัน สูบบุหรี่', 'เจ็บแน่นหน้าอก + ST elevation · รีบ reperfusion'],
  ['Community-acquired pneumonia', 'ปอดอักเสบติดเชื้อในชุมชน', 'Respiratory', 'สูงอายุ มีโรคร่วม', 'ไข้ ไอ เสมหะ + infiltrate ใน CXR · ประเมินด้วย CURB-65'],
  ['Nephrotic syndrome', 'กลุ่มอาการเนโฟรติก', 'Renal', 'เด็กส่วนใหญ่เป็น minimal change', 'Proteinuria ระดับ nephrotic, albumin ต่ำ, บวม, ไขมันสูง'],
  ['Guillain–Barré syndrome', 'กลุ่มอาการกิลแลง-บาร์เร', 'Neurology', 'หลังติดเชื้อทางเดินหายใจหรือทางเดินอาหาร', 'อ่อนแรงไล่ขึ้นจากขา + areflexia · CSF protein สูง เซลล์ปกติ'],
  ['Preeclampsia', 'ภาวะครรภ์เป็นพิษ', 'OB-GYN', 'อายุครรภ์ ≥ 20 สัปดาห์ ครรภ์แรก', 'BP ≥ 140/90 + proteinuria หรือ end-organ · MgSO₄ กันชัก']
];
