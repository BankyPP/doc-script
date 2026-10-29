/* Medical Soil › ตามวอร์ด + approach ตามอาการนำ
   wards: mai = ค่าในคอลัมน์ Ward ของชีต 1000 MAI · match = คำในชื่อแท็บ (ใต้ "Clinic" ใน Doc) ที่นับเป็นวอร์ดนี้
   ชื่อโรคใน {{ }} จะกลายเป็นลิงก์ไปหน้าโรคใน 1000 MAIเอง (ถ้ามีในชีต) */
window.POY_CLINIC = {
  /* y = ชั้นปีที่วน · แก้ป้ายของแท็บได้ในเว็บ (ปุ่ม "แก้ป้ายวอร์ด" ในหน้าแท็บ) */
  wards: [
    { id: 'med', y: 4, name: 'Med Y4', full: 'Internal medicine', c: '#3C4A7A', mai: 'MEDICINE', match: ['med', 'internal', 'อายุร'] },
    { id: 'sx', y: 4, name: 'Sx Y4', full: 'Surgery (Gen Sx + Subspe Sx)', c: '#355A3A', mai: 'SURGERY', match: ['surg', 'gen sx', 'subspe', 'ศัลย'] },
    { id: 'ped', y: 4, name: 'Ped Y4', full: 'Pediatrics', c: '#9B4F2E', mai: 'PEDIATRIC', match: ['ped', 'กุมาร'] },
    { id: 'obgyn', y: 4, name: 'OB-GYN Y4', full: 'Obstetrics & gynecology', c: '#A33A3A', mai: 'OB-GYN', match: ['ob-gyn', 'obgyn', 'gyn', 'สูติ', 'นรีเวช'] },
    { id: 'ortho', y: 5, name: 'Ortho Y5', full: 'Orthopedics', c: '#6B5B3E', match: ['ortho', 'ออร์โธ'] },
    { id: 'eye', y: 5, name: 'Eye Y5', full: 'Ophthalmology', c: '#2E6A8A', match: ['ophthal', 'จักษุ'] },
    { id: 'ent', y: 5, name: 'ENT Y5', full: 'Otolaryngology', c: '#7A4E6B', match: ['otolaryn', 'โสต'] },
    { id: 'psych', y: 5, name: 'Psych Y5', full: 'Psychiatry', c: '#5B4A8A', match: ['psych', 'จิตเวช'] },
    { id: 'anes', y: 5, name: 'Anes Y5', full: 'Anesthesiology', c: '#4A6B6B', match: ['anes', 'วิสัญญี'] },
    { id: 'rehab', y: 5, name: 'Rehab Y5', full: 'Rehabilitation medicine', c: '#8A6B2E', match: ['rehab', 'เวชศาสตร์ฟื้นฟู'] },
    { id: 'radio', y: 5, name: 'Radio Y5', full: 'Radiology', c: '#3E4A55', match: ['radio', 'รังสี'] },
    { id: 'forensic', y: 5, name: 'Forensic Y5', full: 'Forensic medicine & law', c: '#5A6258', match: ['forensic', 'นิติเวช'] },
    { id: 'derm', y: 5, name: 'Derm Y5', full: 'Dermatology', c: '#B0614A', match: ['derm', 'ผิวหนัง'] },
    { id: 'em', y: 5, name: 'EM Y5', full: 'Emergency medicine', c: '#9C2F2F', match: ['emergency', 'ฉุกเฉิน'] },
    { id: 'comm', y: 5, name: 'Comm Med Y5', full: 'Preventive & community medicine', c: '#4F7A3A', match: ['prev', 'community', 'ป้องกัน'] }
  ],
  approaches: [
    { id: 'fever', group: 'Fever', title: 'ไข้เฉียบพลันในผู้ใหญ่', sub: 'Acute undifferentiated fever · แผนที่เดินป่า 5 จุดพัก จากคนไข้หน้าห้องถึงยาตัวแรก',
      steps: [
        { title: 'ดู red flag ก่อน', html: '<p>ความดันต่ำ ซึม หายใจเร็ว เลือดออก ปัสสาวะออกน้อย → resuscitate, เจาะ hemoculture แล้วให้ยาฆ่าเชื้อให้เร็วที่สุด (ภายใน 1 ชั่วโมงถ้าสงสัย sepsis)</p>' },
        { title: 'ถามประวัติสัมผัส', links: [
          ['ลุยน้ำ ย่ำโคลน หลังน้ำท่วม', 'Leptospirosis'],
          ['เข้าป่า ทำไร่ ถางหญ้า', 'Scrub typhus'],
          ['ฤดูฝน มีคนในชุมชนเป็นไข้เลือดออก', 'Dengue hemorrhagic fever'],
          ['ชาวนา + เบาหวาน', 'Melioidosis'],
          ['เข้าป่าแถบชายแดน', 'Malaria']
        ] },
        { title: 'ตรวจร่างกายหาจุดจับ', html: '<ul><li><b>Eschar</b> ตามข้อพับ ขาหนีบ รักแร้ → scrub typhus</li><li><b>Conjunctival suffusion</b> + กดเจ็บน่อง → leptospirosis</li><li><b>Petechiae</b>, tourniquet test บวก → dengue</li><li>ตับม้ามโต ซีด เหลือง → คิดถึง malaria และ hepatobiliary infection</li></ul>' },
        { title: 'Lab เบื้องต้น', html: '<p>CBC · NS1 Ag / dengue IgM · thick &amp; thin blood film · hemoculture · UA · BUN/Cr · LFT · CXR ถ้ามีอาการทางปอด</p>' },
        { title: 'เริ่มรักษา', html: '<ul><li><b>Dengue</b> — supportive เฝ้าระวัง critical phase เลี่ยง NSAIDs และ aspirin</li><li><b>Leptospirosis / scrub typhus</b> ไม่รุนแรง — doxycycline · leptospirosis รุนแรง — penicillin G หรือ ceftriaxone IV</li><li><b>Melioidosis</b> — ceftazidime IV</li></ul><p class="note" style="margin-top:10px">อ้างอิง: [guideline ที่ใช้]</p>' }
      ] }
  ],
  more: ['เจ็บหน้าอก', 'ปวดท้องเฉียบพลัน', 'หอบเหนื่อย', 'ซึมลง', 'ซีด', 'บวม', 'ตัวเหลือง'],
  tools: [
    ['Admission order', 'แม่แบบสั่งงานแรกรับ'],
    ['Progress note', 'SOAP ที่อาจารย์ชอบ'],
    ['ยาที่ใช้บ่อย', 'ขนาดยา ผู้ใหญ่ / เด็ก'],
    ['Procedure checklist', 'ยังไม่มีเนื้อหา']
  ]
};
