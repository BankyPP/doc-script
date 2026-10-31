/* Clinic › Symptomatology & Approach — สร้างอัตโนมัติด้วย tools/symp/build.py (อย่าแก้ด้วยมือ)
   ตำราศิริราช + เล่มเหลือง (รวมด้วย tools/symp/merge_yb.py) · เนื้อหาแต่ละบทอยู่ใน docs/symp/chNN.json · รูปใน docs/symp/img/ */
window.POY_SYMP = {
 "v": 1793472650,
 "book": {
  "title": "ตำราอายุรศาสตร์ อาการวิทยา",
  "by": "ภาควิชาอายุรศาสตร์ คณะแพทยศาสตร์ศิริราชพยาบาล",
  "ed": "พิมพ์ครั้งที่ 3 (ฉบับปรับปรุงใหม่) พ.ศ. 2559",
  "inst": "si"
 },
 "books": {
  "si": {
   "title": "ตำราอายุรศาสตร์ อาการวิทยา",
   "by": "ภาควิชาอายุรศาสตร์ คณะแพทยศาสตร์ศิริราชพยาบาล",
   "ed": "พิมพ์ครั้งที่ 3 (ฉบับปรับปรุงใหม่) พ.ศ. 2559",
   "inst": "si"
  },
  "yb": {
   "title": "Differential diagnostic algorithm in internal medicine (เล่มเหลือง — Approach algorithms)",
   "by": "ณัฐพล ปัทมินทร์",
   "ed": "พร้อมลายมือ/โน้ตที่เขียนเพิ่มในเล่ม",
   "inst": "both"
  }
 },
 "total": 74,
 "groups": [
  {
   "id": "base",
   "t": "พื้นฐานการดูแลผู้ป่วย",
   "c": "#7A5C3E",
   "ch": [
    1,
    2,
    45,
    74
   ]
  },
  {
   "id": "gen",
   "t": "อาการทั่วไป · ภาวะเร่งด่วน",
   "c": "#A44A2A",
   "ch": [
    7,
    10,
    39,
    40,
    44
   ]
  },
  {
   "id": "neuro",
   "t": "ระบบประสาท · ความคิด · การนอน",
   "c": "#3C4A7A",
   "ch": [
    3,
    4,
    6,
    31,
    32,
    33,
    34,
    35,
    36,
    37,
    38,
    70,
    71,
    72,
    73
   ]
  },
  {
   "id": "cvr",
   "t": "หัวใจ · ทรวงอก · การหายใจ",
   "c": "#9B3B4A",
   "ch": [
    5,
    12,
    13,
    14,
    15,
    16,
    46,
    47,
    48,
    49,
    50,
    51,
    52
   ]
  },
  {
   "id": "gi",
   "t": "ทางเดินอาหาร · ตับ",
   "c": "#5C7F3A",
   "ch": [
    9,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    53
   ]
  },
  {
   "id": "heme",
   "t": "เลือด · ต่อมน้ำเหลือง",
   "c": "#8A3D22",
   "ch": [
    8,
    11,
    24,
    66,
    67,
    68
   ]
  },
  {
   "id": "kub",
   "t": "ไต · ทางเดินปัสสาวะ · อวัยวะเพศ",
   "c": "#2F7466",
   "ch": [
    25,
    26,
    27,
    28,
    42,
    43,
    54,
    55,
    56,
    57
   ]
  },
  {
   "id": "msk",
   "t": "กระดูก · ข้อ · ผิวหนัง",
   "c": "#C9952E",
   "ch": [
    29,
    30,
    41,
    69
   ]
  },
  {
   "id": "endo",
   "t": "ต่อมไร้ท่อ · การเจริญเติบโต",
   "c": "#7A4E86",
   "ch": [
    58,
    59,
    60,
    61,
    62,
    63,
    64,
    65
   ]
  }
 ],
 "chapters": [
  {
   "no": 1,
   "id": "approach-to-patient",
   "th": "การปฏิบัติต่อผู้ป่วย",
   "en": "Approach to the Patient",
   "pages": "2–7",
   "g": "base",
   "b": {
    "si": {
     "no": 1,
     "pages": "2–7"
    }
   },
   "file": "ch01.json",
   "n": 13,
   "f": 1,
   "i": 0,
   "kb": 34
  },
  {
   "no": 2,
   "id": "medical-interviewing",
   "th": "การซักประวัติ",
   "en": "Medical Interviewing",
   "pages": "8–21",
   "g": "base",
   "b": {
    "si": {
     "no": 2,
     "pages": "8–21"
    }
   },
   "file": "ch02.json",
   "n": 25,
   "f": 1,
   "i": 1,
   "kb": 69
  },
  {
   "no": 3,
   "id": "alteration-of-consciousness",
   "th": "การรู้สึกตัวผิดปกติ",
   "en": "Alteration of Consciousness",
   "pages": "22–42",
   "g": "neuro",
   "b": {
    "si": {
     "no": 3,
     "pages": "22–42"
    },
    "yb": [
     {
      "k": "9.4",
      "o": 62,
      "p": "111–112"
     }
    ]
   },
   "file": "ch03.json",
   "n": 26,
   "f": 4,
   "i": 2,
   "kb": 88
  },
  {
   "no": 4,
   "id": "delirium",
   "th": "เพ้อ",
   "en": "Delirium",
   "pages": "43–52",
   "g": "neuro",
   "b": {
    "si": {
     "no": 4,
     "pages": "43–52"
    },
    "yb": [
     {
      "k": "9.4.2",
      "o": 63,
      "p": "113–114"
     }
    ]
   },
   "file": "ch04.json",
   "n": 18,
   "f": 3,
   "i": 1,
   "kb": 50
  },
  {
   "no": 5,
   "id": "syncope",
   "th": "เป็นลม",
   "en": "Syncope",
   "pages": "53–61",
   "g": "cvr",
   "b": {
    "si": {
     "no": 5,
     "pages": "53–61"
    },
    "yb": [
     {
      "k": "1.3",
      "o": 4,
      "p": "13–14"
     },
     {
      "k": "9.2",
      "o": 60,
      "p": "104–106"
     }
    ]
   },
   "file": "ch05.json",
   "n": 18,
   "f": 3,
   "i": 3,
   "kb": 55
  },
  {
   "no": 6,
   "id": "seizure",
   "th": "ชัก",
   "en": "Seizure",
   "pages": "62–71",
   "g": "neuro",
   "b": {
    "si": {
     "no": 6,
     "pages": "62–71"
    },
    "yb": [
     {
      "k": "9.3",
      "o": 61,
      "p": "107–110"
     }
    ]
   },
   "file": "ch06.json",
   "n": 27,
   "f": 6,
   "i": 4,
   "kb": 72
  },
  {
   "no": 7,
   "id": "fever",
   "th": "ไข้",
   "en": "Fever",
   "pages": "72–79",
   "g": "gen",
   "b": {
    "si": {
     "no": 7,
     "pages": "72–79"
    },
    "yb": [
     {
      "k": "7.1",
      "o": 53,
      "p": "91–94"
     },
     {
      "k": "7.2",
      "o": 54,
      "p": "95"
     },
     {
      "k": "7.3",
      "o": 55,
      "p": "96"
     }
    ]
   },
   "file": "ch07.json",
   "n": 29,
   "f": 8,
   "i": 8,
   "kb": 67
  },
  {
   "no": 8,
   "id": "anemia",
   "th": "ซีด",
   "en": "Anemia",
   "pages": "80–93",
   "g": "heme",
   "b": {
    "si": {
     "no": 8,
     "pages": "80–93"
    },
    "yb": [
     {
      "k": "6.1",
      "o": 43,
      "p": "75–77"
     },
     {
      "k": "6.2",
      "o": 44,
      "p": "78"
     }
    ]
   },
   "file": "ch08.json",
   "n": 34,
   "f": 7,
   "i": 8,
   "kb": 62
  },
  {
   "no": 9,
   "id": "jaundice",
   "th": "ดีซ่าน",
   "en": "Jaundice",
   "pages": "94–102",
   "g": "gi",
   "b": {
    "si": {
     "no": 9,
     "pages": "94–102"
    },
    "yb": [
     {
      "k": "3.1",
      "o": 16,
      "p": "36–37"
     }
    ]
   },
   "file": "ch09.json",
   "n": 21,
   "f": 4,
   "i": 3,
   "kb": 55
  },
  {
   "no": 10,
   "id": "edema",
   "th": "บวม",
   "en": "Edema",
   "pages": "103–115",
   "g": "gen",
   "b": {
    "si": {
     "no": 10,
     "pages": "103–115"
    },
    "yb": [
     {
      "k": "4.5",
      "o": 29,
      "p": "57"
     }
    ]
   },
   "file": "ch10.json",
   "n": 20,
   "f": 5,
   "i": 5,
   "kb": 53
  },
  {
   "no": 11,
   "id": "lymphadenopathy",
   "th": "ต่อมน้ำเหลืองโต",
   "en": "Lymphadenopathy",
   "pages": "116–123",
   "g": "heme",
   "b": {
    "si": {
     "no": 11,
     "pages": "116–123"
    },
    "yb": [
     {
      "k": "6.9",
      "o": 51,
      "p": "86–88"
     }
    ]
   },
   "file": "ch11.json",
   "n": 20,
   "f": 3,
   "i": 3,
   "kb": 44
  },
  {
   "no": 12,
   "id": "dyspnea",
   "th": "เหนื่อย",
   "en": "Dyspnea",
   "pages": "124–134",
   "g": "cvr",
   "b": {
    "si": {
     "no": 12,
     "pages": "124–134"
    },
    "yb": [
     {
      "k": "2.1",
      "o": 9,
      "p": "21–25"
     }
    ]
   },
   "file": "ch12.json",
   "n": 31,
   "f": 5,
   "i": 4,
   "kb": 70
  },
  {
   "no": 13,
   "id": "chest-pain",
   "th": "เจ็บหน้าอก",
   "en": "Chest Pain",
   "pages": "135–145",
   "g": "cvr",
   "b": {
    "si": {
     "no": 13,
     "pages": "135–145"
    },
    "yb": [
     {
      "k": "1.1",
      "o": 2,
      "p": "10–11"
     }
    ]
   },
   "file": "ch13.json",
   "n": 37,
   "f": 4,
   "i": 1,
   "kb": 82
  },
  {
   "no": 14,
   "id": "palpitation",
   "th": "ใจสั่น",
   "en": "Palpitation",
   "pages": "146–151",
   "g": "cvr",
   "b": {
    "si": {
     "no": 14,
     "pages": "146–151"
    },
    "yb": [
     {
      "k": "1.2",
      "o": 3,
      "p": "12"
     }
    ]
   },
   "file": "ch14.json",
   "n": 13,
   "f": 2,
   "i": 2,
   "kb": 23
  },
  {
   "no": 15,
   "id": "cough",
   "th": "ไอ",
   "en": "Cough",
   "pages": "152–158",
   "g": "cvr",
   "b": {
    "si": {
     "no": 15,
     "pages": "152–158"
    },
    "yb": [
     {
      "k": "2.2",
      "o": 10,
      "p": "26–27"
     }
    ]
   },
   "file": "ch15.json",
   "n": 15,
   "f": 3,
   "i": 2,
   "kb": 25
  },
  {
   "no": 16,
   "id": "hemoptysis",
   "th": "ไอเป็นเลือด",
   "en": "Hemoptysis",
   "pages": "159–164",
   "g": "cvr",
   "b": {
    "si": {
     "no": 16,
     "pages": "159–164"
    },
    "yb": [
     {
      "k": "2.3",
      "o": 11,
      "p": "28"
     }
    ]
   },
   "file": "ch16.json",
   "n": 11,
   "f": 3,
   "i": 2,
   "kb": 34
  },
  {
   "no": 17,
   "id": "abdominal-mass",
   "th": "ก้อนในท้อง",
   "en": "Abdominal Mass",
   "pages": "165–168",
   "g": "gi",
   "b": {
    "si": {
     "no": 17,
     "pages": "165–168"
    }
   },
   "file": "ch17.json",
   "n": 9,
   "f": 2,
   "i": 1,
   "kb": 15
  },
  {
   "no": 18,
   "id": "dysphagia",
   "th": "กลืนลำบาก",
   "en": "Dysphagia",
   "pages": "169–177",
   "g": "gi",
   "b": {
    "si": {
     "no": 18,
     "pages": "169–177"
    },
    "yb": [
     {
      "k": "3.2",
      "o": 17,
      "p": "38"
     }
    ]
   },
   "file": "ch18.json",
   "n": 21,
   "f": 4,
   "i": 3,
   "kb": 43
  },
  {
   "no": 19,
   "id": "dyspepsia",
   "th": "ดิสเปปเซีย",
   "en": "Dyspepsia",
   "pages": "178–183",
   "g": "gi",
   "b": {
    "si": {
     "no": 19,
     "pages": "178–183"
    }
   },
   "file": "ch19.json",
   "n": 13,
   "f": 2,
   "i": 1,
   "kb": 23
  },
  {
   "no": 20,
   "id": "nausea-vomiting-hiccups",
   "th": "คลื่นไส้ อาเจียน สะอึก",
   "en": "Nausea, Vomiting, Hiccups",
   "pages": "184–197",
   "g": "gi",
   "b": {
    "si": {
     "no": 20,
     "pages": "184–197"
    },
    "yb": [
     {
      "k": "3.3",
      "o": 18,
      "p": "39"
     },
     {
      "k": "3.4",
      "o": 19,
      "p": "40"
     }
    ]
   },
   "file": "ch20.json",
   "n": 33,
   "f": 4,
   "i": 3,
   "kb": 66
  },
  {
   "no": 21,
   "id": "abdominal-pain",
   "th": "ปวดท้อง",
   "en": "Abdominal Pain",
   "pages": "198–207",
   "g": "gi",
   "b": {
    "si": {
     "no": 21,
     "pages": "198–207"
    },
    "yb": [
     {
      "k": "หน้าแทรก abdominal pain",
      "o": 15,
      "p": "34–35"
     }
    ],
    "ai": 1
   },
   "file": "ch21.json",
   "n": 36,
   "f": 5,
   "i": 3,
   "kb": 110
  },
  {
   "no": 22,
   "id": "diarrhea-constipation",
   "th": "ท้องเดิน/ท้องผูก",
   "en": "Diarrhea/Constipation",
   "pages": "208–224",
   "g": "gi",
   "b": {
    "si": {
     "no": 22,
     "pages": "208–224"
    },
    "yb": [
     {
      "k": "3.7",
      "o": 22,
      "p": "45"
     },
     {
      "k": "3.8",
      "o": 23,
      "p": "46–47"
     }
    ]
   },
   "file": "ch22.json",
   "n": 32,
   "f": 9,
   "i": 7,
   "kb": 100
  },
  {
   "no": 23,
   "id": "gi-bleeding",
   "th": "เลือดออกในทางเดินอาหาร",
   "en": "Gastrointestinal Bleeding",
   "pages": "225–231",
   "g": "gi",
   "b": {
    "si": {
     "no": 23,
     "pages": "225–231"
    },
    "yb": [
     {
      "k": "3.5",
      "o": 20,
      "p": "41–43"
     },
     {
      "k": "3.6",
      "o": 21,
      "p": "44"
     }
    ]
   },
   "file": "ch23.json",
   "n": 27,
   "f": 9,
   "i": 7,
   "kb": 61
  },
  {
   "no": 24,
   "id": "abnormal-bleeding",
   "th": "เลือดออกผิดปกติ",
   "en": "Abnormal Bleeding",
   "pages": "232–242",
   "g": "heme",
   "b": {
    "si": {
     "no": 24,
     "pages": "232–242"
    },
    "yb": [
     {
      "k": "6.4",
      "o": 46,
      "p": "80–81"
     },
     {
      "k": "6.5",
      "o": 47,
      "p": "82"
     },
     {
      "k": "6.6",
      "o": 48,
      "p": "83"
     },
     {
      "k": "6.7",
      "o": 49,
      "p": "84"
     }
    ]
   },
   "file": "ch24.json",
   "n": 28,
   "f": 11,
   "i": 11,
   "kb": 88
  },
  {
   "no": 25,
   "id": "oliguria-anuria",
   "th": "ปัสสาวะออกน้อย",
   "en": "Oliguria/Anuria",
   "pages": "243–251",
   "g": "kub",
   "b": {
    "si": {
     "no": 25,
     "pages": "243–251"
    },
    "yb": [
     {
      "k": "4.1",
      "o": 25,
      "p": "51"
     },
     {
      "k": "4.2",
      "o": 26,
      "p": "52"
     }
    ]
   },
   "file": "ch25.json",
   "n": 22,
   "f": 5,
   "i": 5,
   "kb": 47
  },
  {
   "no": 26,
   "id": "polyuria",
   "th": "ปัสสาวะมาก",
   "en": "Polyuria",
   "pages": "252–257",
   "g": "kub",
   "b": {
    "si": {
     "no": 26,
     "pages": "252–257"
    },
    "yb": [
     {
      "k": "4.4",
      "o": 28,
      "p": "55–56"
     }
    ]
   },
   "file": "ch26.json",
   "n": 17,
   "f": 3,
   "i": 2,
   "kb": 30
  },
  {
   "no": 27,
   "id": "abnormal-urination-dysuria",
   "th": "ปัสสาวะผิดปกติ/ปัสสาวะลำบาก",
   "en": "Abnormal Urination/Dysuria",
   "pages": "258–265",
   "g": "kub",
   "b": {
    "si": {
     "no": 27,
     "pages": "258–265"
    }
   },
   "file": "ch27.json",
   "n": 22,
   "f": 3,
   "i": 1,
   "kb": 36
  },
  {
   "no": 28,
   "id": "hematuria",
   "th": "ปัสสาวะเป็นเลือด",
   "en": "Hematuria",
   "pages": "266–278",
   "g": "kub",
   "b": {
    "si": {
     "no": 28,
     "pages": "266–278"
    },
    "yb": [
     {
      "k": "4.6",
      "o": 30,
      "p": "58"
     },
     {
      "k": "4.7",
      "o": 31,
      "p": "59"
     }
    ]
   },
   "file": "ch28.json",
   "n": 22,
   "f": 4,
   "i": 5,
   "kb": 53
  },
  {
   "no": 29,
   "id": "arthralgia-arthritis",
   "th": "ปวดข้อและข้ออักเสบ",
   "en": "Arthralgia and Arthritis",
   "pages": "279–289",
   "g": "msk",
   "b": {
    "si": {
     "no": 29,
     "pages": "279–289"
    },
    "yb": [
     {
      "k": "8.1",
      "o": 56,
      "p": "98"
     }
    ]
   },
   "file": "ch29.json",
   "n": 24,
   "f": 3,
   "i": 9,
   "kb": 48
  },
  {
   "no": 30,
   "id": "back-pain",
   "th": "ปวดหลัง",
   "en": "Back Pain",
   "pages": "290–301",
   "g": "msk",
   "b": {
    "si": {
     "no": 30,
     "pages": "290–301"
    },
    "yb": [
     {
      "k": "8.2",
      "o": 57,
      "p": "99"
     }
    ]
   },
   "file": "ch30.json",
   "n": 18,
   "f": 4,
   "i": 7,
   "kb": 48
  },
  {
   "no": 31,
   "id": "headache",
   "th": "ปวดศีรษะ",
   "en": "Headache",
   "pages": "302–310",
   "g": "neuro",
   "b": {
    "si": {
     "no": 31,
     "pages": "302–310"
    },
    "yb": [
     {
      "k": "9.1",
      "o": 59,
      "p": "102–103"
     }
    ]
   },
   "file": "ch31.json",
   "n": 25,
   "f": 5,
   "i": 2,
   "kb": 56
  },
  {
   "no": 32,
   "id": "vertigo",
   "th": "เวียนศีรษะ",
   "en": "Vertigo",
   "pages": "311–322",
   "g": "neuro",
   "b": {
    "si": {
     "no": 32,
     "pages": "311–322"
    },
    "yb": [
     {
      "k": "9.11",
      "o": 70,
      "p": "138–139"
     }
    ]
   },
   "file": "ch32.json",
   "n": 20,
   "f": 3,
   "i": 2,
   "kb": 50
  },
  {
   "no": 33,
   "id": "weakness",
   "th": "กล้ามเนื้ออ่อนแรง",
   "en": "Weakness",
   "pages": "323–334",
   "g": "neuro",
   "b": {
    "si": {
     "no": 33,
     "pages": "323–334"
    },
    "yb": [
     {
      "k": "9.5",
      "o": 64,
      "p": "115–121"
     }
    ]
   },
   "file": "ch33.json",
   "n": 37,
   "f": 8,
   "i": 11,
   "kb": 73
  },
  {
   "no": 34,
   "id": "numbness",
   "th": "ความผิดปกติของการรับความรู้สึก",
   "en": "Numbness",
   "pages": "335–352",
   "g": "neuro",
   "b": {
    "si": {
     "no": 34,
     "pages": "335–352"
    },
    "yb": [
     {
      "k": "9.7",
      "o": 66,
      "p": "125–126"
     }
    ]
   },
   "file": "ch34.json",
   "n": 24,
   "f": 4,
   "i": 19,
   "kb": 64
  },
  {
   "no": 35,
   "id": "movement-disorders-1",
   "th": "การเคลื่อนไหวผิดปกติ 1",
   "en": "Abnormal Movement 1",
   "pages": "353–360",
   "g": "neuro",
   "b": {
    "si": {
     "no": 35,
     "pages": "353–360"
    }
   },
   "file": "ch35.json",
   "n": 11,
   "f": 1,
   "i": 2,
   "kb": 28
  },
  {
   "no": 36,
   "id": "movement-disorders-2",
   "th": "การเคลื่อนไหวผิดปกติ 2",
   "en": "Movement Disorders 2",
   "pages": "361–375",
   "g": "neuro",
   "b": {
    "si": {
     "no": 36,
     "pages": "361–375"
    },
    "yb": [
     {
      "k": "9.8",
      "o": 67,
      "p": "127–130"
     }
    ]
   },
   "file": "ch36.json",
   "n": 30,
   "f": 7,
   "i": 10,
   "kb": 62
  },
  {
   "no": 37,
   "id": "cognitive-impairment",
   "th": "ความบกพร่องของสมรรถภาพทางสมอง",
   "en": "Cognitive Impairment",
   "pages": "376–383",
   "g": "neuro",
   "b": {
    "si": {
     "no": 37,
     "pages": "376–383"
    }
   },
   "file": "ch37.json",
   "n": 14,
   "f": 2,
   "i": 1,
   "kb": 34
  },
  {
   "no": 38,
   "id": "sleep-disorders",
   "th": "การนอนหลับผิดปกติ",
   "en": "Sleep Disorders",
   "pages": "384–392",
   "g": "neuro",
   "b": {
    "si": {
     "no": 38,
     "pages": "384–392"
    }
   },
   "file": "ch38.json",
   "n": 15,
   "f": 2,
   "i": 0,
   "kb": 47
  },
  {
   "no": 39,
   "id": "weight-loss",
   "th": "น้ำหนักตัวลด",
   "en": "Weight Loss",
   "pages": "393–402",
   "g": "gen",
   "b": {
    "si": {
     "no": 39,
     "pages": "393–402"
    },
    "yb": [
     {
      "k": "10.1",
      "o": 72,
      "p": "142–143"
     }
    ]
   },
   "file": "ch39.json",
   "n": 18,
   "f": 3,
   "i": 2,
   "kb": 42
  },
  {
   "no": 40,
   "id": "weight-gaining",
   "th": "น้ำหนักตัวเพิ่ม",
   "en": "Weight Gaining",
   "pages": "403–406",
   "g": "gen",
   "b": {
    "si": {
     "no": 40,
     "pages": "403–406"
    },
    "yb": [
     {
      "k": "10.2",
      "o": 73,
      "p": "144–146"
     }
    ]
   },
   "file": "ch40.json",
   "n": 22,
   "f": 3,
   "i": 3,
   "kb": 39
  },
  {
   "no": 41,
   "id": "common-skin-manifestations",
   "th": "อาการทางผิวหนังที่พบบ่อย",
   "en": "Common Skin Manifestations",
   "pages": "407–416",
   "g": "msk",
   "b": {
    "si": {
     "no": 41,
     "pages": "407–416"
    }
   },
   "file": "ch41.json",
   "n": 26,
   "f": 2,
   "i": 0,
   "kb": 40
  },
  {
   "no": 42,
   "id": "urethral-discharge",
   "th": "สารคัดหลั่งจากท่อปัสสาวะ",
   "en": "Urethral Discharge",
   "pages": "417–422",
   "g": "kub",
   "b": {
    "si": {
     "no": 42,
     "pages": "417–422"
    }
   },
   "file": "ch42.json",
   "n": 11,
   "f": 1,
   "i": 0,
   "kb": 28
  },
  {
   "no": 43,
   "id": "genital-ulcers",
   "th": "แผลที่อวัยวะเพศ",
   "en": "Genital Ulcers",
   "pages": "423–427",
   "g": "kub",
   "b": {
    "si": {
     "no": 43,
     "pages": "423–427"
    }
   },
   "file": "ch43.json",
   "n": 18,
   "f": 2,
   "i": 1,
   "kb": 24
  },
  {
   "no": 44,
   "id": "shock",
   "th": "ช็อก",
   "en": "Shock",
   "pages": "428–444",
   "g": "gen",
   "b": {
    "si": {
     "no": 44,
     "pages": "428–444"
    }
   },
   "file": "ch44.json",
   "n": 17,
   "f": 3,
   "i": 2,
   "kb": 63
  },
  {
   "no": 45,
   "id": "yb-notes",
   "th": "โน้ตลายมือเล่มเหลือง",
   "en": "Handwritten notes",
   "pages": "",
   "g": "base",
   "b": {
    "yb": [
     {
      "k": "ปก/สารบัญ",
      "o": 1,
      "p": "1–2, 6–8"
     }
    ]
   },
   "file": "ch45.json",
   "n": 11,
   "f": 1,
   "i": 0,
   "kb": 13
  },
  {
   "no": 46,
   "id": "claudication",
   "th": "ขาเจ็บเมื่อเดิน",
   "en": "Claudication",
   "pages": "",
   "g": "cvr",
   "b": {
    "yb": [
     {
      "k": "1.4",
      "o": 5,
      "p": "15"
     }
    ]
   },
   "file": "ch46.json",
   "n": 3,
   "f": 1,
   "i": 1,
   "kb": 7
  },
  {
   "no": 47,
   "id": "heart-failure-cm",
   "th": "หัวใจล้มเหลว & cardiomyopathy",
   "en": "Congestive heart failure and cardiomyopathy",
   "pages": "",
   "g": "cvr",
   "b": {
    "yb": [
     {
      "k": "1.5",
      "o": 6,
      "p": "16–17"
     }
    ]
   },
   "file": "ch47.json",
   "n": 3,
   "f": 2,
   "i": 2,
   "kb": 11
  },
  {
   "no": 48,
   "id": "htn-young",
   "th": "ความดันโลหิตสูงในคนอายุน้อย",
   "en": "Hypertension in the young",
   "pages": "",
   "g": "cvr",
   "b": {
    "yb": [
     {
      "k": "1.6",
      "o": 7,
      "p": "18"
     }
    ]
   },
   "file": "ch48.json",
   "n": 1,
   "f": 1,
   "i": 1,
   "kb": 3
  },
  {
   "no": 49,
   "id": "pericardial-effusion",
   "th": "น้ำในเยื่อหุ้มหัวใจ",
   "en": "Pericardial effusion",
   "pages": "",
   "g": "cvr",
   "b": {
    "yb": [
     {
      "k": "1.7",
      "o": 8,
      "p": "19"
     }
    ]
   },
   "file": "ch49.json",
   "n": 1,
   "f": 1,
   "i": 1,
   "kb": 2
  },
  {
   "no": 50,
   "id": "cyanosis",
   "th": "เขียวคล้ำ",
   "en": "Cyanosis",
   "pages": "",
   "g": "cvr",
   "b": {
    "yb": [
     {
      "k": "2.4",
      "o": 12,
      "p": "29"
     }
    ]
   },
   "file": "ch50.json",
   "n": 6,
   "f": 1,
   "i": 1,
   "kb": 4
  },
  {
   "no": 51,
   "id": "clubbing-of-finger",
   "th": "นิ้วปุ้ม",
   "en": "Clubbing of finger",
   "pages": "",
   "g": "cvr",
   "b": {
    "yb": [
     {
      "k": "2.5",
      "o": 13,
      "p": "30"
     }
    ]
   },
   "file": "ch51.json",
   "n": 5,
   "f": 1,
   "i": 2,
   "kb": 4
  },
  {
   "no": 52,
   "id": "pleural-effusion",
   "th": "น้ำในโพรงเยื่อหุ้มปอด",
   "en": "Pleural effusion",
   "pages": "",
   "g": "cvr",
   "b": {
    "yb": [
     {
      "k": "2.6",
      "o": 14,
      "p": "31–32"
     }
    ]
   },
   "file": "ch52.json",
   "n": 5,
   "f": 1,
   "i": 1,
   "kb": 8
  },
  {
   "no": 53,
   "id": "abdominal-swelling",
   "th": "ท้องโต / ท้องมาน",
   "en": "Abdominal swelling & Ascites",
   "pages": "",
   "g": "gi",
   "b": {
    "yb": [
     {
      "k": "3.9",
      "o": 24,
      "p": "48–49"
     }
    ]
   },
   "file": "ch53.json",
   "n": 3,
   "f": 3,
   "i": 3,
   "kb": 8
  },
  {
   "no": 54,
   "id": "azotemia",
   "th": "ภาวะ azotemia (BUN/Cr สูง)",
   "en": "Stepwise approach to azotemia",
   "pages": "",
   "g": "kub",
   "b": {
    "yb": [
     {
      "k": "4.3",
      "o": 27,
      "p": "53–54"
     }
    ]
   },
   "file": "ch54.json",
   "n": 5,
   "f": 2,
   "i": 2,
   "kb": 9
  },
  {
   "no": 55,
   "id": "asymptomatic-proteinuria",
   "th": "โปรตีนในปัสสาวะโดยไม่มีอาการ",
   "en": "Asymptomatic proteinuria",
   "pages": "",
   "g": "kub",
   "b": {
    "yb": [
     {
      "k": "4.8",
      "o": 32,
      "p": "60"
     }
    ]
   },
   "file": "ch55.json",
   "n": 3,
   "f": 1,
   "i": 1,
   "kb": 2
  },
  {
   "no": 56,
   "id": "nephrotic-syndrome",
   "th": "กลุ่มอาการเนโฟรติก",
   "en": "Nephrotic syndrome",
   "pages": "",
   "g": "kub",
   "b": {
    "yb": [
     {
      "k": "4.9",
      "o": 33,
      "p": "61"
     }
    ]
   },
   "file": "ch56.json",
   "n": 4,
   "f": 1,
   "i": 1,
   "kb": 3
  },
  {
   "no": 57,
   "id": "rpgn",
   "th": "RPGN (ไตอักเสบรุนแรงเร็ว)",
   "en": "Rapidly progressive glomerulonephritis",
   "pages": "",
   "g": "kub",
   "b": {
    "yb": [
     {
      "k": "4.10",
      "o": 34,
      "p": "62"
     }
    ]
   },
   "file": "ch57.json",
   "n": 5,
   "f": 1,
   "i": 1,
   "kb": 4
  },
  {
   "no": 58,
   "id": "short-stature",
   "th": "ตัวเตี้ย",
   "en": "Short stature",
   "pages": "",
   "g": "endo",
   "b": {
    "yb": [
     {
      "k": "5.1",
      "o": 35,
      "p": "64"
     }
    ]
   },
   "file": "ch58.json",
   "n": 4,
   "f": 1,
   "i": 1,
   "kb": 4
  },
  {
   "no": 59,
   "id": "tall-stature",
   "th": "ตัวสูง",
   "en": "Tall stature",
   "pages": "",
   "g": "endo",
   "b": {
    "yb": [
     {
      "k": "5.2",
      "o": 36,
      "p": "65"
     }
    ]
   },
   "file": "ch59.json",
   "n": 5,
   "f": 1,
   "i": 1,
   "kb": 4
  },
  {
   "no": 60,
   "id": "thyroid-function-test",
   "th": "แปลผล thyroid function test",
   "en": "Thyroid function test interpretation",
   "pages": "",
   "g": "endo",
   "b": {
    "yb": [
     {
      "k": "5.3",
      "o": 37,
      "p": "66"
     }
    ]
   },
   "file": "ch60.json",
   "n": 2,
   "f": 1,
   "i": 1,
   "kb": 4
  },
  {
   "no": 61,
   "id": "hypoglycemia",
   "th": "น้ำตาลในเลือดต่ำ",
   "en": "Hypoglycemia",
   "pages": "",
   "g": "endo",
   "b": {
    "yb": [
     {
      "k": "5.4",
      "o": 38,
      "p": "67"
     }
    ]
   },
   "file": "ch61.json",
   "n": 3,
   "f": 1,
   "i": 1,
   "kb": 3
  },
  {
   "no": 62,
   "id": "gynecomastia",
   "th": "เต้านมโตในผู้ชาย",
   "en": "Gynecomastia",
   "pages": "",
   "g": "endo",
   "b": {
    "yb": [
     {
      "k": "5.5",
      "o": 39,
      "p": "68"
     }
    ]
   },
   "file": "ch62.json",
   "n": 6,
   "f": 1,
   "i": 1,
   "kb": 4
  },
  {
   "no": 63,
   "id": "nipple-discharge",
   "th": "สารคัดหลั่งจากหัวนม",
   "en": "Nipple discharge",
   "pages": "",
   "g": "endo",
   "b": {
    "yb": [
     {
      "k": "5.6",
      "o": 40,
      "p": "69"
     }
    ]
   },
   "file": "ch63.json",
   "n": 5,
   "f": 1,
   "i": 1,
   "kb": 3
  },
  {
   "no": 64,
   "id": "amenorrhea",
   "th": "ประจำเดือนขาด",
   "en": "Amenorrhea",
   "pages": "",
   "g": "endo",
   "b": {
    "yb": [
     {
      "k": "5.7",
      "o": 41,
      "p": "70–72"
     }
    ]
   },
   "file": "ch64.json",
   "n": 6,
   "f": 3,
   "i": 3,
   "kb": 12
  },
  {
   "no": 65,
   "id": "hirsutism-virilization",
   "th": "ขนดกและ virilization",
   "en": "Hirsutism and virilization",
   "pages": "",
   "g": "endo",
   "b": {
    "yb": [
     {
      "k": "5.8",
      "o": 42,
      "p": "73–74"
     }
    ]
   },
   "file": "ch65.json",
   "n": 3,
   "f": 2,
   "i": 3,
   "kb": 4
  },
  {
   "no": 66,
   "id": "pancytopenia",
   "th": "Pancytopenia",
   "en": "Pancytopenia",
   "pages": "",
   "g": "heme",
   "b": {
    "yb": [
     {
      "k": "6.3",
      "o": 45,
      "p": "79"
     }
    ]
   },
   "file": "ch66.json",
   "n": 7,
   "f": 1,
   "i": 1,
   "kb": 5
  },
  {
   "no": 67,
   "id": "venous-thrombosis",
   "th": "Venous thrombosis",
   "en": "Venous thrombosis",
   "pages": "",
   "g": "heme",
   "b": {
    "yb": [
     {
      "k": "6.8",
      "o": 50,
      "p": "85"
     }
    ]
   },
   "file": "ch67.json",
   "n": 10,
   "f": 1,
   "i": 1,
   "kb": 4
  },
  {
   "no": 68,
   "id": "splenomegaly",
   "th": "Splenomegaly",
   "en": "Splenomegaly",
   "pages": "",
   "g": "heme",
   "b": {
    "yb": [
     {
      "k": "6.10",
      "o": 52,
      "p": "89"
     }
    ]
   },
   "file": "ch68.json",
   "n": 5,
   "f": 1,
   "i": 1,
   "kb": 4
  },
  {
   "no": 69,
   "id": "raynaud",
   "th": "Raynaud phenomenon (นิ้วซีด-เขียว-แดงเมื่อเย็น)",
   "en": "Raynaud's phenomenon",
   "pages": "",
   "g": "msk",
   "b": {
    "yb": [
     {
      "k": "8.3",
      "o": 58,
      "p": "100"
     }
    ]
   },
   "file": "ch69.json",
   "n": 3,
   "f": 1,
   "i": 1,
   "kb": 4
  },
  {
   "no": 70,
   "id": "spinal-cord-disorder",
   "th": "โรคของไขสันหลัง",
   "en": "Spinal cord disorder",
   "pages": "",
   "g": "neuro",
   "b": {
    "yb": [
     {
      "k": "9.6",
      "o": 65,
      "p": "122–124"
     }
    ]
   },
   "file": "ch70.json",
   "n": 6,
   "f": 1,
   "i": 3,
   "kb": 8
  },
  {
   "no": 71,
   "id": "visual-disorder",
   "th": "ความผิดปกติของการมองเห็น",
   "en": "Visual disorder",
   "pages": "",
   "g": "neuro",
   "b": {
    "yb": [
     {
      "k": "9.9",
      "o": 68,
      "p": "131–136"
     }
    ]
   },
   "file": "ch71.json",
   "n": 6,
   "f": 5,
   "i": 7,
   "kb": 19
  },
  {
   "no": 72,
   "id": "ptosis",
   "th": "หนังตาตก",
   "en": "Ptosis",
   "pages": "",
   "g": "neuro",
   "b": {
    "yb": [
     {
      "k": "9.10",
      "o": 69,
      "p": "137"
     }
    ]
   },
   "file": "ch72.json",
   "n": 1,
   "f": 1,
   "i": 1,
   "kb": 2
  },
  {
   "no": 73,
   "id": "stroke-in-the-young",
   "th": "โรคหลอดเลือดสมองในคนอายุน้อย",
   "en": "Stroke in the young",
   "pages": "",
   "g": "neuro",
   "b": {
    "yb": [
     {
      "k": "9.12",
      "o": 71,
      "p": "140–141"
     }
    ]
   },
   "file": "ch73.json",
   "n": 1,
   "f": 1,
   "i": 1,
   "kb": 4
  },
  {
   "no": 74,
   "id": "yb-abbreviations",
   "th": "คำย่อในเล่มเหลือง",
   "en": "Abbreviations in the Yellow Book",
   "pages": "",
   "g": "base",
   "b": {
    "yb": [
     {
      "k": "ภาคผนวก",
      "o": 74,
      "p": "147–151"
     }
    ]
   },
   "file": "ch74.json",
   "n": 21,
   "f": 0,
   "i": 0,
   "kb": 17
  }
 ]
};
