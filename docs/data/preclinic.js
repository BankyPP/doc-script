/* Preclinic — สรุปแยกตาม system
   เอกสารที่ html = null คือยังไม่ได้ดึงเนื้อหาจาก Google Docs */
window.POY_PRECLINIC = [
  { id: 'basic', name: 'Basic sciences', th: 'เซลล์ ชีวเคมี พันธุศาสตร์', pig: 'Raw umber', c: '#7A5C3E', subj: 'Biochem · Genetics · Histology', groups: [] },
  { id: 'cvs', name: 'Cardiovascular', th: 'ระบบหัวใจและหลอดเลือด', pig: 'Alizarin crimson', c: '#A33A3A', subj: 'Anatomy · Physio · Patho · Pharm', groups: [
    { name: 'ANATOMY', docs: [
      { id: 'chambers-valves', title: 'Heart chambers & valves', html: null },
      { id: 'coronary', title: 'Coronary circulation', html: null },
      { id: 'conduction', title: 'Conduction system', html: null }
    ] },
    { name: 'PHYSIOLOGY', docs: [
      { id: 'cardiac-cycle', title: 'Cardiac cycle', source: 'ตัวอย่าง (ยังไม่ได้ดึงจาก Google Docs)', related: ['STEMI'], html:
        '<p>หนึ่งรอบการเต้นของหัวใจแบ่งเป็น systole และ diastole — ลำดับเหตุการณ์ใน left ventricle เป็นแบบนี้</p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:24px 40px"><ol style="flex:1 1 340px;min-width:0">' +
        '<li><b>Atrial contraction</b> — เติมเลือดช่วงท้าย diastole (ได้ยิน S4 ถ้า ventricle แข็ง)</li>' +
        '<li><b>Isovolumetric contraction</b> — mitral ปิด แต่ aortic ยังไม่เปิด ปริมาตรคงที่ ความดันขึ้นเร็ว</li>' +
        '<li><b>Rapid ejection</b></li><li><b>Reduced ejection</b></li>' +
        '<li><b>Isovolumetric relaxation</b> — aortic ปิด ปริมาตรคงที่ ความดันลดลง</li>' +
        '<li><b>Rapid filling</b> — mitral เปิด (ได้ยิน S3 ถ้า volume overload)</li>' +
        '<li><b>Reduced filling</b> (diastasis)</li></ol>' +
        '<aside style="flex:0 1 240px;display:flex;flex-direction:column;gap:10px;padding-top:6px">' +
        '<p class="pencil">S1 = AV valves ปิด</p><p class="pencil">S2 = semilunar valves ปิด</p>' +
        '<p class="pencil">ช่วง isovolumetric ทั้งสองช่วง ลิ้นปิดหมดทุกลิ้น</p></aside></div>' +
        '<figure style="max-width:520px;display:flex;flex-direction:column;gap:8px">' +
        '<svg viewBox="0 0 360 270" width="100%" role="img" aria-label="ภาพร่าง pressure-volume loop ของ left ventricle">' +
        '<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M40 232 L344 232 M40 232 L40 14" stroke="#1E2620" stroke-width="1.3"/>' +
        '<path d="M140 218 C190 222 250 220 280 212 L280 110 C260 58 190 46 140 80 L140 218 Z" stroke="#A33A3A" stroke-width="2.2" fill="#A33A3A" fill-opacity=".08"/></g>' +
        '<g fill="#1E2620"><circle cx="140" cy="218" r="4"/><circle cx="280" cy="212" r="4"/><circle cx="280" cy="110" r="4"/><circle cx="140" cy="80" r="4"/></g>' +
        '<g font-family="Sarabun, sans-serif" font-size="13" fill="#1E2620"><text x="288" y="226">mitral ปิด</text><text x="288" y="106">aortic เปิด</text>' +
        '<text x="132" y="76" text-anchor="end">aortic ปิด</text><text x="132" y="214" text-anchor="end">mitral เปิด</text>' +
        '<text x="210" y="44" text-anchor="middle" fill="#5A6258" font-style="italic">ejection</text><text x="210" y="248" text-anchor="middle" fill="#5A6258" font-style="italic">filling</text>' +
        '<text x="190" y="266" text-anchor="middle" fill="#5A6258" font-size="12">ปริมาตร LV</text>' +
        '<text x="20" y="130" fill="#5A6258" font-size="12" transform="rotate(-90 20 130)" text-anchor="middle">ความดัน LV</text></g></svg>' +
        '<figcaption class="muted" style="font-size:14px;font-style:italic">Fig. — Pressure–volume loop ของ LV · ภาพร่างประกอบ ไม่ได้วาดตามสเกล</figcaption></figure>'
      },
      { id: 'cardiac-output', title: 'Cardiac output', html: null },
      { id: 'ecg', title: 'ECG basics', html: null },
      { id: 'bp', title: 'Blood pressure regulation', html: null }
    ] },
    { name: 'PATHOLOGY', docs: [
      { id: 'athero', title: 'Atherosclerosis', html: null },
      { id: 'rhd', title: 'Rheumatic heart disease', html: null }
    ] },
    { name: 'PHARMACOLOGY', docs: [
      { id: 'antiht', title: 'Antihypertensives', html: null },
      { id: 'antiarr', title: 'Antiarrhythmics', html: null }
    ] }
  ] },
  { id: 'resp', name: 'Respiratory', th: 'ระบบหายใจ', pig: 'Cerulean', c: '#3E7CA6', subj: 'Anatomy · Physio · Patho · Pharm', groups: [] },
  { id: 'gi', name: 'GI & Hepatobiliary', th: 'ระบบทางเดินอาหารและตับ', pig: 'Yellow ochre', c: '#C9952E', subj: 'Anatomy · Physio · Patho · Pharm', groups: [] },
  { id: 'renal', name: 'Renal & Urinary', th: 'ระบบไตและทางเดินปัสสาวะ', pig: 'Indigo', c: '#3C4A7A', subj: 'Anatomy · Physio · Patho · Pharm', groups: [] },
  { id: 'neuro', name: 'Nervous system', th: 'ระบบประสาท', pig: "Payne's grey", c: '#4A5560', subj: 'Anatomy · Physio · Patho · Pharm', groups: [] },
  { id: 'endo', name: 'Endocrine', th: 'ระบบต่อมไร้ท่อ', pig: 'Sap green', c: '#5C7F3A', subj: 'Anatomy · Physio · Patho · Pharm', groups: [] },
  { id: 'heme', name: 'Blood & Immune', th: 'ระบบเลือดและภูมิคุ้มกัน', pig: 'Burnt sienna', c: '#9B4F2E', subj: 'Physio · Immuno · Patho · Pharm', groups: [] },
  { id: 'micro', name: 'Microbiology', th: 'จุลชีววิทยาและการติดเชื้อ', pig: 'Viridian', c: '#2F7466', subj: 'Bacteria · Virus · Fungus · Parasite', groups: [] },
  { id: 'msk', name: 'Musculoskeletal', th: 'ระบบกระดูกและกล้ามเนื้อ', pig: 'Terre verte', c: '#6F7F5E', subj: 'Anatomy · Physio · Patho · Pharm', groups: [] },
  { id: 'repro', name: 'Reproductive', th: 'ระบบสืบพันธุ์', pig: 'Rose madder', c: '#B5607A', subj: 'Anatomy · Physio · Patho · Pharm', groups: [] },
  { id: 'skin', name: 'Skin', th: 'ระบบผิวหนัง', pig: 'Naples yellow', c: '#D9B26A', subj: 'Anatomy · Histo · Patho', groups: [] }
];
