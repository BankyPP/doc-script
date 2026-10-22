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

  /* บัญชี — ใช้ Firebase โปรเจกต์เดียวกับคลังข้อสอบเก่า MDCU (ล็อกอินบัญชีเดียวกันได้)
     ข้อมูลเก็บที่ Firestore: poymor/<uid>/data/state (rules: match /poymor/{uid}/{doc=**}) */
  firebase: {
    apiKey: 'AIzaSyDIzd81Qw7shAOj3uiGU1T8tm90HXtF4yg',
    authDomain: 'ac-mdcu.firebaseapp.com',
    projectId: 'ac-mdcu',
    storageBucket: 'ac-mdcu.firebasestorage.app',
    messagingSenderId: '537236830552',
    appId: '1:537236830552:web:40d77940f7adf0fecd8d2d'
  },
  userDomain: '@sxmcq.example.com',   /* ชื่อผู้ใช้แบบไม่มีอีเมล — ต้องตรงกับคลังข้อสอบเก่า */

  /* รหัสเข้าเว็บ (gate) — รหัสเดียวกับคลังข้อสอบเก่า MDCU · เก็บแค่ hash = sha256(salt + รหัส) ห้ามใส่รหัสจริง
     on: true = เครื่องที่ไม่เคยเข้าสู่ระบบในเว็บนี้ต้องพิมพ์รหัสทุกครั้งที่เข้า · เข้าสู่ระบบครั้งเดียว = เครื่องที่เชื่อถือ ไม่ถามอีก */
  gate: { on: true, salt: '06faf800614125fd', h: 'ed660d4b3559b47d9f0a826217ba1f983dcece43cd22b7e6a5f4413fdfc5d26b' },

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
