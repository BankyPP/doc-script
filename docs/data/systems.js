/* ระบบ + สีสีน้ำประจำระบบ (ใช้ทั้งเว็บ)
   match = คำที่ใช้จับคู่กับค่าในคอลัมน์ "ระบบ" ของ Google Sheet (ไม่สนตัวพิมพ์เล็กใหญ่) */
window.POY_SYSTEMS = [
  { id: 'cvs',   name: 'Cardiovascular',     th: 'ระบบหัวใจและหลอดเลือด',   pig: 'Alizarin crimson', c: '#A33A3A', match: ['cardio', 'cvs', 'heart', 'หัวใจ'] },
  { id: 'resp',  name: 'Respiratory',        th: 'ระบบหายใจ',               pig: 'Cerulean',         c: '#3E7CA6', match: ['rs', 'resp', 'pulmo', 'lung', 'ปอด', 'หายใจ'] },
  { id: 'gi',    name: 'GI & Hepatobiliary', th: 'ระบบทางเดินอาหารและตับ',  pig: 'Yellow ochre',     c: '#C9952E', match: ['gi', 'gastro', 'hepat', 'liver', 'ทางเดินอาหาร', 'ตับ'] },
  { id: 'renal', name: 'Renal',              th: 'ระบบไตและทางเดินปัสสาวะ', pig: 'Indigo',           c: '#3C4A7A', match: ['kub', 'renal', 'kidney', 'nephro', 'uro', 'ไต'] },
  { id: 'neuro', name: 'Neurology',          th: 'ระบบประสาท',              pig: "Payne's grey",     c: '#4A5560', match: ['neuro', 'brain', 'ประสาท', 'สมอง'] },
  { id: 'endo',  name: 'Endocrine',          th: 'ระบบต่อมไร้ท่อ',          pig: 'Sap green',        c: '#5C7F3A', match: ['endo', 'ต่อมไร้ท่อ', 'metab'] },
  { id: 'heme',  name: 'Hematology',         th: 'ระบบเลือด',               pig: 'Burnt sienna',     c: '#9B4F2E', match: ['hemato', 'heme', 'blood', 'onco', 'เลือด'] },
  { id: 'id',    name: 'Infectious',         th: 'โรคติดเชื้อ',              pig: 'Viridian',         c: '#2F7466', match: ['infect', 'id', 'ติดเชื้อ'] },
  { id: 'msk',   name: 'MSK & Rheum',        th: 'กระดูก กล้ามเนื้อ รูมาติก', pig: 'Raw umber',        c: '#7A5C3E', match: ['msk', 'ortho', 'rheum', 'กระดูก', 'รูมา'] },
  { id: 'obgyn', name: 'OB-GYN',             th: 'สูติศาสตร์และนรีเวช',      pig: 'Rose madder',      c: '#B5607A', match: ['repro', 'ob', 'gyn', 'obstet', 'สูติ', 'นรีเวช'] },
  { id: 'skin',  name: 'Skin',               th: 'ผิวหนัง',                  pig: 'Naples yellow',    c: '#D9B26A', match: ['skin', 'derm', 'ผิวหนัง'] },
  { id: 'psych', name: 'Psychiatry',         th: 'จิตเวช',                   pig: 'Dioxazine violet', c: '#5E4A7E', match: ['psych', 'จิตเวช'] }
];
window.POY_OTHER = { id: 'other', name: 'อื่น ๆ', th: 'ยังไม่ระบุระบบ', pig: 'Graphite', c: '#8A8F86', match: [] };
