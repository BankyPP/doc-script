/* ตั้งค่าเว็บโพยหมอ — แก้ไฟล์นี้ไฟล์เดียวพอ */
window.POY_CONFIG = {
  title: 'โพยหมอ',
  tagline: 'สมุดสนามความรู้ · ปี 1 ถึง License',
  owner: 'BankyPP',
  currentYear: 4,

  /* Google Sheet 1000 โรค
     - ตั้งแชร์เป็น Anyone with the link → Viewer
     - id = ตัวยาวในลิงก์ docs.google.com/spreadsheets/d/<id>/edit
     - gid = เลขหลัง #gid= ของแท็บที่ใช้ (แท็บแรกมักเป็น 0)
     ถ้ายังว่าง เว็บจะใช้ข้อมูลตัวอย่างใน data/sample-diseases.js */
  sheet: { id: '', gid: '0' },

  /* วันสอบ — ใส่เป็น 'YYYY-MM-DD' หรือปล่อยว่าง */
  exams: [
    { name: 'Comprehensive', date: '' },
    { name: 'NL1', date: '' },
    { name: 'NL2', date: '' },
    { name: 'NL3', date: '' }
  ],

  /* ลิงก์คลังข้อสอบเก่า */
  acUrl: 'https://bankypp.github.io/ac-mdcu/',

  /* ห้องสอบ AI */
  ai: {
    models: [
      { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5 (เร็ว)' },
      { id: 'claude-opus-5-5', name: 'Claude Opus 5.5 (ละเอียด)' }
    ]
  }
};
