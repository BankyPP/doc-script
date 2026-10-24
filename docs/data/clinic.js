/* Clinic — สมุดวอร์ด + approach ตามอาการนำ
   ชื่อโรคใน {{ }} จะกลายเป็นลิงก์ไปหน้าโรคใน 1000 MAIเอง (ถ้ามีในชีต) */
window.POY_CLINIC = {
  wards: [
    { id: 'med', name: 'Med Y4', full: 'Internal medicine', c: '#3C4A7A' },
    { id: 'gensx', name: 'Gen Sx Y4', full: 'General surgery', c: '#355A3A' },
    { id: 'subspe', name: 'Subspe Sx Y4', full: 'Subspecialty surgery', c: '#2F7466' },
    { id: 'ped', name: 'Ped Y4', full: 'Pediatrics', c: '#9B4F2E' },
    { id: 'obgyn', name: 'OB-GYN Y4', full: 'Obstetrics & gynecology', c: '#A33A3A' }
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
