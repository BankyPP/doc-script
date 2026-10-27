/* Blueprint ของการสอบใน NL & Compre
   - nl1 = NLE Part I ใหม่ (ไฟล์ New_NLE_Part_I_blueprint.pdf — มีผลตั้งแต่ 1 ม.ค. 2570) → หน้า #/nl/x/nl1 และแท็กของข้อสอบเก่าในคลัง NL part 1 (bank/nl/data_nl1/tags.js)
   - blueprint NL1 เก่า (300 ข้อ) อยู่ใน data/plan-c1-bank.js (มาจาก Google Sheet "Compre - NL1 Plan") → ใช้กับ Compre 1 เท่านั้น ไม่แสดงใน NL
   tag = ชื่อแท็กที่ใช้ในคลังข้อสอบ (ตรงตัวทุกตัวอักษร) */
window.POY_BP = {
  nl1: {
    name: 'NLE Part I', total: 250, format: 'ปรนัยเลือกตอบ (one best response)', eff: 'มีผลบังคับใช้ตั้งแต่ 1 มกราคม พ.ศ. 2570',
    basis: 'เนื้อหาอิงประกาศแพทยสภาที่ 4/2567 เรื่องเกณฑ์ความรู้ความสามารถในการประเมินเพื่อรับใบอนุญาตเป็นผู้ประกอบวิชาชีพเวชกรรม พ.ศ. 2567 ส่วนที่ 1 ก. – 5 จ.',
    pdf: 'nl/files/NLE_Part_I_blueprint_2570.pdf', file: 'New_NLE_Part_I_blueprint.pdf',
    parts: [
      {
        code: '1', t: 'หมวดที่ 1 ภาวะปกติและหลักการดูแลทั่วไป', en: 'Normal condition and general principle of care', n: 30,
        items: [
          { code: '1.1', tag: '1.1 Health system & promotion', n: 6, t: 'ศาสตร์ระบบสุขภาพ การสร้างเสริมสุขภาพ และระบบบริบาลสุขภาพ ทั้งในระดับบุคคล ชุมชน และประชาชน', ref: 'ส่วนที่ 3 ค.' },
          { code: '1.2', tag: '1.2 Epidemiology & community health', n: 3, t: 'การรวบรวมข้อมูล และประเมินปัญหาทางสุขภาพของบุคคล ครอบครัว และชุมชนในความรับผิดชอบ โดยใช้วิธีการทางระบาดวิทยาพื้นฐาน' },
          { code: '1.3', tag: '1.3 Health assessment across life stages', n: 3, t: 'การประเมินสุขภาพ และให้คำแนะนำที่เหมาะสมเพื่อความมีสุขภาพดีแก่บุคคลตามวัยและสภาวะต่าง ๆ ตั้งแต่ทารกในครรภ์ ทารกแรกเกิด วัยก่อนเข้าเรียน วัยเรียน วัยรุ่น วัยหนุ่มสาว ผู้ใหญ่ หญิงมีครรภ์ วัยสูงอายุ ผู้พิการ และผู้ทุพพลภาพ' },
          { code: '1.4', tag: '1.4 Family health', n: 3, t: 'การเชื่อมโยงความสัมพันธ์ของสุขภาพบุคคลกับสุขภาพครอบครัว ประเมินพัฒนาการและปัญหาสุขภาพของครอบครัว รวมทั้งให้คำปรึกษาและดูแลปัญหาสุขภาพเบื้องต้นแก่ผู้ป่วยและครอบครัว' },
          { code: '1.5', tag: '1.5 Check-up, screening & certificates', n: 3, t: 'การตรวจสุขภาพ ตรวจคัดกรองโรค และออกความเห็นหรือหนังสือรับรองความเห็นได้อย่างเหมาะสม', ref: 'ส่วนที่ 5 จ.' },
          { code: '1.6', tag: '1.6 Medicolegal examination & reports', n: 3, t: 'การตรวจและให้ความเห็นหรือทำหนังสือรับรองเกี่ยวกับผู้ป่วย ผู้พิการและทุพพลภาพ ผู้เสียหาย ผู้ต้องหา หรือจำเลย ตามที่กฎหมายกำหนดให้พนักงานสอบสวน องค์กร หรือศาลในกิจการต่าง ๆ เช่น หนังสือรับรองสุขภาพ หนังสือรับรองความพิการทุพพลภาพ หนังสือรับรองการตาย การเป็นพยานต่อพนักงานสอบสวนและศาล', ref: 'ส่วนที่ 5 จ.' },
          { code: '1.7', tag: '1.7 Autopsy & forensic', n: 3, t: 'การชันสูตรพลิกศพ เก็บวัตถุพยานจากศพ ร่วมกับพนักงานสอบสวนตามที่กฎหมายกำหนด ออกรายงานการชันสูตรพลิกศพ ให้ถ้อยคำเป็นพยานในชั้นสอบสวนและชั้นศาล', ref: 'ส่วนที่ 5 จ.' },
          { code: '1.8', tag: '1.8 Medical ethics & law', n: 6, t: 'การระบุปัญหา วิเคราะห์ และให้แนวทางปฏิบัติเชิงเวชจริยศาสตร์และกฎหมายที่เกี่ยวข้องกับการประกอบวิชาชีพเวชกรรม', ref: 'ส่วนที่ 4 ง. + ส่วนที่ 5 จ.' }
        ]
      },
      {
        code: '2', t: 'หมวดที่ 2 ภาวะผิดปกติจำแนกตามระบบอวัยวะ', en: 'Individual organ systems or types of disorders', n: 220,
        note: '2.1 อาการ/ปัญหาสำคัญ ไม่มีจำนวนข้อแยก — รวมอยู่ในข้อของ 2.2 และ 2.3 (ความรู้พยาธิกำเนิด พยาธิสรีรวิทยา การวินิจฉัยแยกโรค และการรักษาเบื้องต้นของอาการสำคัญ)',
        groups: [
          { k: 'g1', t: 'กลุ่มที่ 1 · โรค/ภาวะ/กลุ่มอาการฉุกเฉิน', n: 50, want: ['กลไกการเกิดโรค พยาธิกำเนิด พยาธิสรีรวิทยา', 'การวินิจฉัยเบื้องต้น', 'การรักษาเบื้องต้นได้อย่างทันท่วงทีตามความเหมาะสมของสถานการณ์', 'รู้ข้อจำกัดของตนเอง และปรึกษาผู้เชี่ยวชาญหรือผู้มีประสบการณ์มากกว่าได้อย่างเหมาะสม'] },
          { k: 'g2', t: 'กลุ่มที่ 2 · โรคตามระบบที่ต้องดูแลเองได้', n: 110, want: ['กลไกการเกิดโรค พยาธิกำเนิด พยาธิสรีรวิทยา', 'การวินิจฉัยด้วยตนเอง', 'การบำบัดโรคและสั่งการรักษาได้ด้วยตนเอง', 'การฟื้นฟูสภาพ การสร้างเสริมสุขภาพ และการป้องกันโรค', 'การส่งต่อเพื่อปรึกษาผู้เชี่ยวชาญ กรณีโรครุนแรงหรือซับซ้อนเกินความสามารถ'] },
          { k: 'g3', t: 'กลุ่มที่ 3 · โรคตามระบบที่ต้องรู้จักและส่งต่อ', n: 60, want: ['กลไกการเกิดโรค พยาธิกำเนิด พยาธิสรีรวิทยา', 'การวินิจฉัยแยกโรค', 'หลักในการดูแลรักษา', 'การฟื้นฟูสภาพ การสร้างเสริมสุขภาพ และการป้องกันโรค', 'การตัดสินใจส่งต่อเพื่อปรึกษาผู้เชี่ยวชาญ'] }
        ],
        tasks: {
          head: ['Diagnosis & Differential diagnosis', 'Laboratory & diagnostic studies', 'Treatment (Pharmacotherapy / Clinical intervention)', 'Pathophysiology / Pathogenesis / Mechanism of disease', 'Prognosis / Risk factors / outcome'],
          short: ['Dx & DDx', 'Lab & investigation', 'Treatment', 'Patho / mechanism', 'Prognosis / risk'],
          rows: [{ code: '2.2', t: 'ฉุกเฉิน (กลุ่มที่ 1)', n: 50, p: [20, 10, 70, 0, 0] }, { code: '2.3', t: 'โรคตามระบบ (กลุ่มที่ 2 + 3)', n: 170, p: [25, 15, 40, 15, 5] }]
        },
        items: [
          { code: '2.2', tag: '2.2 Emergency', n: 50, g1: 50, t: 'โรค/ภาวะ/กลุ่มอาการฉุกเฉิน (กลุ่มที่ 1)' },
          { code: '2.3.1', tag: '2.3.1 Infectious & parasitic', n: 14, g2: 10, g3: 4, t: 'INFECTIOUS AND PARASITIC DISEASES' },
          { code: '2.3.2', tag: '2.3.2 Neoplasm', n: 5, g2: 1, g3: 4, t: 'NEOPLASM' },
          { code: '2.3.3', tag: '2.3.3 Blood & immune', n: 8, g2: 6, g3: 2, t: 'DISEASES OF BLOOD & BLOOD FORMING ORGANS AND DISORDERS INVOLVING THE IMMUNE MECHANISM' },
          { code: '2.3.4', tag: '2.3.4 Endocrine, nutrition & metabolic', n: 10, g2: 7, g3: 3, t: 'ENDOCRINE, NUTRITIONAL, AND METABOLIC DISEASES' },
          { code: '2.3.5', tag: '2.3.5 Mental & behavioral', n: 8, g2: 4, g3: 4, t: 'MENTAL & BEHAVIORAL DISORDERS' },
          { code: '2.3.6', tag: '2.3.6 Nervous system', n: 12, g2: 9, g3: 3, t: 'DISORDERS OF THE NERVOUS SYSTEM' },
          { code: '2.3.7', tag: '2.3.7 Eye & adnexa', n: 5, g2: 3, g3: 2, t: 'DISORDERS OF THE EYE AND ADNEXA' },
          { code: '2.3.8', tag: '2.3.8 Ear & mastoid', n: 5, g2: 3, g3: 2, t: 'DISORDERS OF THE EAR & MASTOID PROCESS' },
          { code: '2.3.9', tag: '2.3.9 Circulatory', n: 14, g2: 8, g3: 6, t: 'DISORDERS OF THE CIRCULATORY SYSTEM' },
          { code: '2.3.10', tag: '2.3.10 Respiratory', n: 14, g2: 10, g3: 4, t: 'DISORDERS OF THE RESPIRATORY SYSTEM' },
          { code: '2.3.11', tag: '2.3.11 Digestive', n: 12, g2: 9, g3: 3, t: 'DISORDERS OF THE DIGESTIVE SYSTEM' },
          { code: '2.3.12', tag: '2.3.12 Skin & subcutaneous', n: 5, g2: 4, g3: 1, t: 'DISORDERS OF SKIN & SUBCUTANEOUS TISSUE' },
          { code: '2.3.13', tag: '2.3.13 Musculoskeletal & connective tissue', n: 8, g2: 6, g3: 2, t: 'DISORDERS OF THE MUSCULOSKELETAL SYSTEM AND CONNECTIVE TISSUE' },
          { code: '2.3.14', tag: '2.3.14 Genitourinary', n: 12, g2: 7, g3: 5, t: 'DISORDERS OF THE GENITO-URINARY SYSTEM' },
          { code: '2.3.15', tag: '2.3.15 Pregnancy, childbirth & puerperium', n: 12, g2: 6, g3: 6, t: 'PREGNANCY, CHILDBIRTH, AND THE PUERPERIUM' },
          { code: '2.3.16', tag: '2.3.16 Perinatal period', n: 6, g2: 4, g3: 2, t: 'CERTAIN CONDITIONS ORIGINATING IN THE PERINATAL PERIOD' },
          { code: '2.3.17', tag: '2.3.17 Congenital & chromosomal', n: 4, g2: 0, g3: 4, t: 'CONGENITAL MALFORMATIONS, DEFORMATIONS AND CHROMOSOMAL ABNORMALITIES' },
          { code: '2.3.18', tag: '2.3.18 Injury & poisoning', n: 8, g2: 6, g3: 2, t: 'INJURY, POISONING AND CONSEQUENCES OF EXTERNAL CAUSES' },
          { code: '2.3.19', tag: '2.3.19 External causes', n: 8, g2: 7, g3: 1, t: 'EXTERNAL CAUSES OF MORBIDITY & MORTALITY' }
        ]
      }
    ],
    /* วิเคราะห์จากตัวเลขใน blueprint (Claude ทำ 27 ต.ค. 2026) — ยังไม่รวมข้อสอบเก่า; ส่วนจำนวนข้อสอบเก่าต่อแท็กคำนวณสดจาก bank/stats.js */
    read: [
      { h: 'ข้อสอบใหญ่สุดคือ "การรักษา"', p: 'Treatment ≈ 103 ข้อ (41%) — ฉุกเฉินคิด 70% ของ 50 ข้อ = 35 + โรคตามระบบ 40% ของ 170 = 68 · รองลงมาคือ Dx/DDx ≈ 52 ข้อ (21%) · Lab ≈ 30 (12%) · Patho/กลไก ≈ 25 (10%) · Prognosis ≈ 8 (3%) · หมวด 1 อีก 30 (12%) → อ่านทุกโรคให้ถึง "ทำอะไรต่อ / ให้ยาอะไร ขนาดเท่าไร" ไม่ใช่แค่วินิจฉัยได้' },
      { h: 'ฉุกเฉิน 50 ข้อ = ก้อนเดียวที่ใหญ่ที่สุด (20%)', p: 'มากกว่าระบบไหนเกือบ 4 เท่า และ 70% ถามการรักษาเบื้องต้นทันที — ALS/ACLS, PALS, NRP, ATLS (primary survey, shock, burn), anaphylaxis, sepsis/septic shock, DKA/HHS, hypoglycemia, status epilepticus, acute coronary syndrome, stroke fast track, poisoning & antidotes, acute abdomen ที่ต้องรีบส่งต่อ · รู้ "เมื่อไรต้อง consult/refer" ด้วย (อยู่ในสิ่งที่กลุ่ม 1 ต้องการ)' },
      { h: 'ระบบที่ออกเยอะ (≥ 12 ข้อ ≈ 5% ขึ้นไป)', p: 'Infectious 14 · Circulatory 14 · Respiratory 14 · Digestive 12 · Genito-urinary 12 · Pregnancy/childbirth 12 · Nervous system 12 — 7 ระบบนี้รวม 90 ข้อ = 53% ของหมวดโรคตามระบบ' },
      { h: 'ระบบที่ออกน้อย (≤ 6 ข้อ)', p: 'Perinatal 6 · Neoplasm 5 · Eye 5 · Ear 5 · Skin 5 · Congenital 4 — อ่านเฉพาะโรคหลัก/เจอบ่อยพอ · Neoplasm และ Congenital ส่วนใหญ่อยู่กลุ่ม 3 (รู้จัก แยกโรค และส่งต่อ ไม่ต้องรักษาเอง)' },
      { h: 'กลุ่ม 2 vs กลุ่ม 3', p: 'กลุ่ม 2 (110 ข้อ) ต้องวินิจฉัยและสั่งการรักษาเองได้ → ยา first-line ขนาดยา การป้องกัน · กลุ่ม 3 (60 ข้อ) เน้นวินิจฉัยแยกโรค หลักการรักษา และตัดสินใจส่งต่อ · ระบบที่กลุ่ม 3 เยอะ: Pregnancy (6), Circulatory (6), GU (5), Mental (4), Neoplasm (4), Congenital (4) — อ่านรายชื่อโรคกลุ่ม 1/2/3 ในเกณฑ์ฯ แพทยสภา พ.ศ. 2567 ว่าโรคไหนอยู่กลุ่มไหน' },
      { h: 'หมวด 1 — 30 ข้อที่เก็บคะแนนได้ไว', p: 'กฎหมาย/นิติเวช/จริยธรรม (1.5–1.8) รวม 15 ข้อ = 6% ของข้อสอบ: ใบรับรองแพทย์ ใบรับรองการตาย การชันสูตรพลิกศพตาม ป.วิ.อาญา การเป็นพยาน หลักเวชจริยศาสตร์ ข้อบังคับแพทยสภา (อ่านส่วนที่ 4 ง. และ 5 จ. ของเกณฑ์ฯ) · ระบบสุขภาพ/สร้างเสริมสุขภาพ 6 ข้อ (ส่วนที่ 3 ค.) · ระบาดวิทยา ประเมินสุขภาพตามวัย สุขภาพครอบครัว อย่างละ 3' },
      { h: 'ต่างจาก NL1 เก่าอย่างไร', p: 'NL1 เก่า (300 ข้อ) เป็นวิทยาศาสตร์การแพทย์พื้นฐานล้วนตามระบบ (normal / abnormal / therapeutics) — NL part 1 ใหม่ถามแบบ clinical ทั้งหมด ความรู้ preclinic เหลืออยู่ในรูป "กลไก/พยาธิสรีรวิทยาของโรค" ≈ 10% + อาการวิทยา → ทวน preclinic ผ่านโรค ไม่ต้องอ่านแยกแบบเดิม' }
    ]
  }
};
