/* 1000 MAI — วิธีอ่าน Google Sheet "1000 โรค" (แท็บ 1000 Diseases)
   เว็บหาคอลัมน์จาก "ชื่อหัวตาราง" (แถว 1 = หมวด, แถว 2 = หมวดย่อย) ไม่ได้ยึดตัวอักษรคอลัมน์
   → ย้ายหรือเพิ่มคอลัมน์ในชีตได้ ถ้าหัวตารางของคอลัมน์ข้างล่างยังชื่อเดิม
   คอลัมน์ที่ไม่อยู่ในรายการนี้ = เนื้อหายาว แสดงในหน้ารายโรคตามลำดับในชีต */
window.POY_MAI = {
  /* คอลัมน์พิเศษ — re ใช้จับกับ "หมวด › หมวดย่อย" ของหัวตาราง */
  cols: {
    no:    /^#$/,
    name:  /^diagnosis$/i,
    seen:  /^patient care/i,          /* ช่องติ๊ก = เคยดูคนไข้โรคนี้แล้ว (หมวดย่อย = ชื่อคน) */
    type:  /^a type of.*›\s*condition$/i,
    gen:   /›\s*genetic$/i,
    icd:   /icd/i,
    alias: /other .*names/i,
    sys:   /primary systems/i,
    ward:  /discovering ward/i,
    onset: /›\s*onset/i,
    prog:  /›\s*symptom progression/i,
    brief: /^brief description/i
  },
  /* ช่องที่เลือกได้หลายค่า (chip) — คั่นด้วย , */
  multi: ['sys', 'prog'],

  /* ตัวกรองด้านบนหน้า 1000 MAI (เรียงตามนี้) */
  filters: [
    { key: 'ward',  label: 'Ward' },
    { key: 'sys',   label: 'ระบบ' },
    { key: 'type',  label: 'ประเภท' },
    { key: 'gen',   label: 'Genetic' },
    { key: 'onset', label: 'Onset' },
    { key: 'prog',  label: 'Progression' },
    { key: 'seen',  label: 'เคยดูคนไข้' }
  ],

  /* สี chip ระบบ — ตรงกับสี dropdown ในชีต [พื้น, ตัวอักษร] · ค่าใหม่ที่ไม่มีในนี้จะเป็นสีเทา */
  sysColors: {
    'CVS': ['#FFC6C6', '#1E2620'],
    'RS': ['#F5F290', '#1E2620'],
    'KUB': ['#A5FFFF', '#1E2620'],
    'GI: Main Digestive Tract': ['#FFD08E', '#1E2620'],
    'GI: Hepatobiliary': ['#FFD08E', '#1E2620'],
    'Endocrine': ['#E5F295', '#1E2620'],
    'Neuro': ['#BBDEAB', '#1E2620'],
    'Psycho': ['#FFD9FD', '#1E2620'],
    'MSK': ['#BECFFF', '#3D3D3D'],
    'Hemato': ['#A22323', '#FFFFFF'],
    'Repro': ['#C6DBE1', '#215A6C'],
    'Skin': ['#F5CD92', '#1E2620'],
    'Systemic/Metabolic': ['#FEBAD3', '#1E2620'],
    'ID': ['#000000', '#FFFFFF'],
    'Immuno': ['#D7C1AB', '#1E2620'],
    'Onco': ['#EAC8FF', '#3D3D3D'],
    'Genetics': ['#AF8CF0', '#1E2620'],
    'Newborn only': ['#FF00D3', '#FFFFFF']
  },
  /* ลำดับค่าในตัวกรอง (ตามลำดับ dropdown ในชีต) */
  order: {
    ward: ['MEDICINE', 'PEDIATRIC', 'SURGERY', 'OB-GYN'],
    type: ['Disease', 'Disorder', 'Syndrome', 'Illness', 'Unspecified Condition', 'Emergency'],
    gen: ['Non-genetic', 'Genetic, Acquired', 'Genetic, Inherited, AR', 'Genetic, Inherited, AD', 'Genetic, Inherited, XR', 'Genetic, Inherited, XD', 'Genetic, Inherited, Y'],
    onset: ['Sudden', 'Acute', 'Subacute', 'Chronic'],
    prog: ['Gradual', 'Progressive', 'Regressive', 'Intermittent', 'Constant', 'Exacerbation', 'Relapsing', 'Remitting', 'Recurrent']
  },
  /* ชื่อสั้นบน tag */
  short: {
    ward: { MEDICINE: 'Med', PEDIATRIC: 'Ped', SURGERY: 'Sx', 'OB-GYN': 'OB-GYN' },
    gen: { 'Non-genetic': 'Non-genetic', 'Genetic, Acquired': 'Genetic · Acquired', 'Genetic, Inherited, AR': 'AR', 'Genetic, Inherited, AD': 'AD', 'Genetic, Inherited, XR': 'XR', 'Genetic, Inherited, XD': 'XD', 'Genetic, Inherited, Y': 'Y-linked' }
  },
  /* ประเภทที่มีสีพิเศษในชีต */
  typeColors: { 'Emergency': ['#FF0000', '#FFFFFF'] },

  /* ตรวจโรคน่าซ้ำ — คำที่ตัดทิ้งก่อนเทียบชื่อ (ต่างกันแค่คำพวกนี้ = น่าสงสัยว่าซ้ำ) */
  softWords: ['acute', 'disease', 'syndrome', 'disorder', 'infection', 'illness', 'condition']
};
