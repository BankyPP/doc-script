/* ตั้งค่าเว็บโพยหมอ — แก้ไฟล์นี้ไฟล์เดียวพอ */
window.POY_CONFIG = {
  title: 'โพยหมอ',
  tagline: 'สมุดสนามความรู้ · ปี 1 ถึง License',
  owner: 'BankyPP',
  currentYear: 4,

  /* Google Sheet 1000 MAI
     - ตั้งแชร์เป็น Anyone with the link → Viewer
     - id = ตัวยาวในลิงก์ docs.google.com/spreadsheets/d/<id>/edit
     - gid = เลขหลัง #gid= ของแท็บที่ใช้ (แท็บแรกมักเป็น 0)
     ถ้ายังว่าง เว็บจะใช้ข้อมูลตัวอย่างใน data/sample-diseases.js */
  sheet: { id: '10Gv4qlYArhsEE3VH1aWhuyBjdoLy-oyUAtxuD4QLzBI', gid: '0' },   /* "1000 โรค" แท็บ 1000 Diseases — วิธีอ่านคอลัมน์ดู data/mai.js */

  /* ติว NL & Compre — รายการการสอบ
     วันสอบ / รูปแบบ / จำนวน / เวลา ใส่ในเว็บ (ติว NL & Compre › ตั้งค่า) — บันทึกต่อคน ซิงก์เข้าบัญชี
     ค่าใน parts ด้านล่างคือค่าเริ่มต้น ถ้ายังไม่เคยแก้ในเว็บ
     part: { type: 'MCQ'|'MEQ'|'OSCE', date: 'YYYY-MM-DD', time: 'HH:MM', n: จำนวนข้อ/สถานี, min: เวลาสอบ (นาที) } */
  nl: {
    exams: [
      { id: 'nl1', name: 'NL1', kind: 'nl', parts: [] },
      { id: 'nl2', name: 'NL2', kind: 'nl', parts: [] },
      { id: 'c1', name: 'Compre 1', kind: 'compre', parts: [] },
      { id: 'c2', name: 'Compre 2', kind: 'compre', parts: [] },
      { id: 'c3', name: 'Compre 3', kind: 'compre', parts: [] }
    ],
    /* บอร์ดประกาศ — Firestore คอลเลกชันนี้ (rules ดู README) */
    board: 'poymor_board'
  },

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
     on: true = เครื่องที่ไม่เคยกดเข้าสู่ระบบในโพยหมอต้องพิมพ์รหัสทุกครั้งที่เข้า (เคย sign in คลังข้อสอบเก่าไม่นับ)
     กดเข้าสู่ระบบในโพยหมอสำเร็จครั้งเดียว = เครื่องที่เชื่อถือ ไม่ถามอีก */
  gate: { on: true, salt: '06faf800614125fd', h: 'ed660d4b3559b47d9f0a826217ba1f983dcece43cd22b7e6a5f4413fdfc5d26b', r: 0 },

  /* ลิงก์คลังข้อสอบเก่า */
  acUrl: 'https://bankypp.github.io/ac-mdcu/',

  /* ห้องสอบ */
  /* ที่อยู่เว็บ — ใช้ในลิงก์ที่ห้องฝึกใน Claude ส่งโจทย์กลับมา (#tbank=) */
  siteUrl: 'https://bankypp.github.io/doc-script/',
  ai: {
    /* ห้องฝึกโพยหมอใน Claude (artifact) — ตัวเลือก "Claude" ในหน้าฝึกของ Random Topic Summary เปิดลิงก์นี้ · สร้างใหม่ด้วย tools/claude-room/build.py */
    room: 'https://claude.ai/artifact/3tpAE8e1L2E7WfAyK7BYqg',
    models: [
      { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5 (เร็ว)' },
      { id: 'claude-opus-5-5', name: 'Claude Opus 5.5 (ละเอียด)' }
    ]
  }
};
