/* Round I/O (อ่านสรุปเนื้อหา) — NL part 1 · W.IO.docs = [{code, kind:"L"|"R"|"T"|"N", title, src, upd, legend?, pages:[{id,title,topics,rev,upd,html}]}]
   topics = แท็ก blueprint NLE Part I ใหม่ (ชุดเดียวกับ tags.js / docs/data/blueprint.js) → "รวมตามเรื่อง" และ Specialty round เลือกตามเรื่องได้
   L42_Neonatology = clone ของสรุป nl2-neonatology-mdcu ใน docs/data/nl.js (กติกา clone: แก้/โน้ตที่หนึ่งต้องแก้อีกที่ให้ตรงกัน)
   ทุกครั้งที่แก้/เพิ่มเนื้อหาหน้าไหน ให้เพิ่ม rev และเปลี่ยน upd ของหน้านั้น */
W.IO={"docs":[{
"code": "L42_Neonatology",
"kind": "L",
"title": "ติวสอบ NL2 (จุฬาฯ)",
"src": "NL2_Neonatology.pdf (ติวสอบ NL2 จุฬาฯ — Thaninee Chitsinchayakul, MD., 17 หน้า) · เนื้อหาชุดเดียวกับโพยหมอ › ติว NL & Compre › สรุปเนื้อหา (แก้ที่หนึ่งต้องแก้อีกที่ให้ตรงกัน)",
"upd": "2026-11-07",
"legend": "<span><span class=\"hw\">ตัวเอียง</span> = ลายมือผู้จดในไฟล์</span><span>★ = ผู้สอนติดดาว</span><span>แท็กเรื่อง = หัวข้อ blueprint NLE Part I ใหม่</span>",
"pages": [
{
"id": "L42-1",
"title": "Neonatal jaundice — เกณฑ์ AAP 2022 และสาเหตุตามเวลา",
"topics": [
"2.3.16 Perinatal period"
],
"rev": 1,
"upd": "2026-11-07",
"html": "<div class=\"iointro\">ติวสอบ NL2 — Thaninee Chitsinchayakul, MD. (จุฬาฯ) · บท Neonatology · หัวข้อในไฟล์: Neonatal jaundice ★ · Neonatal sepsis · Scalp injuries ★ · Hypoglycemia ★ (ออกแน่) · Polycythemia (ออก) · Neonatal anemia · Acid elution / APT test · Respiratory distress ★ (รวม CDH ออก , TE fistula) · Neonatal resuscitation (NCPR) · SGA · TORCH · Neonatal conjunctivitis · Vital signs · Hearing screening (หน้าสุดท้าย ลายมือ)</div><div class=\"box\"><h3>Neonatal jaundice — AAP 2004 → 2022</h3><ul><li>2022 เปลี่ยน: เกณฑ์ phototherapy สูงขึ้น · เกณฑ์ exchange สูงขึ้น · เพิ่ม <b>escalation of care</b> · รายละเอียดเฉพาะขึ้น (แยกตาม GA + risk factor)</li><li><b>Neurotoxicity risk factors</b>: GA &lt;38 wk (ยิ่ง preterm ยิ่งเสี่ยง <span class=\"hw\">BBB ยังไม่ดี bilirubin ผ่านง่าย</span>) · albumin &lt;3 g/dL <span class=\"hw\">→ unconjugated free bilirubin ↑</span> · isoimmune/non-immune hemolytic disease · sepsis · clinical instability ใน 24 ชม.ที่ผ่านมา</li></ul><table><tr><th>MB (mg/dL)</th><th>24 ชม.</th><th>48 ชม.</th></tr><tr><td>Phototherapy 2004</td><td>8–12</td><td>11–15</td></tr><tr><td>Phototherapy 2022</td><td>9–11 <span class=\"hw\">≈10</span></td><td>12–14 <span class=\"hw\">≈12–13</span></td></tr><tr><td>Exchange 2004</td><td>15–19</td><td>17–23</td></tr><tr><td>Exchange 2022</td><td>16–18 <span class=\"hw\">18</span></td><td>18–20 <span class=\"hw\">20</span></td></tr></table><ul><li><b>Escalation of care</b> = TSB ต่ำกว่าเกณฑ์ exchange ≤2 mg/dL → intensive phototherapy + IV hydration · work-up TB, DB, crossmatch <span class=\"hw\">(เตรียม exchange)</span> · F/U TSB ทุก 2 ชม. จนต่ำกว่าระดับ escalation · ตัวอย่าง อายุ 24 ชม. escalation point = 14</li></ul></div><div class=\"box\"><h3>สาเหตุตามเวลาที่เริ่มเหลือง</h3><ul><li><b>&lt;24 ชม.: hemolysis</b> — immune (ABO, Rh, minor blood group; <b>DCT บวก</b>) <span class=\"hw\">ABO: แม่ O ลูกไม่ O · Rh: แม่ Rh− ลูก Rh+</span> · non-immune (G6PD, hereditary spherocytosis; <span class=\"hw\">DCT neg · spherocyte + polychromasia</span>)</li><li><b>24–48 ชม.</b>: G6PD, sepsis</li><li><b>Day 3–5</b>: <b>breastfeeding jaundice</b> (น้ำหนักลดมาก <span class=\"hw\">นมไม่พอ</span>) · skin ecchymosis (subgaleal, cephalohematoma) · enterohepatic circulation ↑ · polycythemia · sepsis</li><li><b>&gt;Day 5</b>: breastfeeding jaundice (weight loss) · <b>breast milk jaundice</b> (นมแม่ล้วน + น้ำหนักขึ้นปกติ) · cephalohematoma · sepsis</li><li><b>&gt;2 wk</b>: BF/BM jaundice · sepsis · <b>congenital hypothyroid · biliary atresia (acholic stool)</b> · Gilbert · Crigler-Najjar</li></ul></div><div class=\"box\"><h3>สไลด์ต้นฉบับ (มีลายมือ)</h3>{{IMG:knl2neo_02}}{{IMG:knl2neo_03a}}{{IMG:knl2neo_03c}}{{IMG:knl2neo_03d}}</div>"
},
{
"id": "L42-2",
"title": "Neonatal sepsis",
"topics": [
"2.3.16 Perinatal period",
"2.3.1 Infectious & parasitic"
],
"rev": 1,
"upd": "2026-11-07",
"html": "<div class=\"box\"><h3>Neonatal sepsis</h3><table><tr><th></th><th>Early-onset</th><th>Late-onset</th></tr><tr><td>Onset</td><td>&lt;72 ชม. (&lt;6 วัน)</td><td>&gt;72 ชม. (&gt;6 วัน)</td></tr><tr><td>ทาง</td><td>vertical จาก GI/GU แม่</td><td>horizontal — nosocomial/สิ่งแวดล้อม</td></tr><tr><td>เชื้อ</td><td>GBS, Listeria, GN enteric (E. coli)</td><td>CoNS, S. aureus, GBS + E. coli, herpes</td></tr><tr><td>Ix</td><td>CBC, H/C ± serial CRP <span class=\"hw\">(6, 12, 24 hr)</span>, CXR ถ้ามีอาการ, ± LP</td><td>CBC, H/C, <b>urine culture, LP</b>, CXR ถ้ามีอาการ</td></tr><tr><td>ATB</td><td><b>Ampicillin + gentamicin</b></td><td>Cefotaxime + ampicillin <span class=\"hw\">(สงสัย Listeria)</span> · cefotaxime + amikacin · vancomycin + aminoglycoside <span class=\"hw\">(อยู่ รพ.นาน/มี catheter)</span></td></tr></table><ul><li>Risk factors: maternal fever · <b>PROM &gt;18 ชม.</b> · chorioamnionitis → Triple I · maternal GBS colonization · maternal UTI · preterm labour</li><li>อาการ: respiratory distress · apnea · temperature instability · lethargy <span class=\"hw\">(ซึม)</span> · septic shock <span class=\"hw\">(tachycardia, BP drop)</span></li><li><b>LP ใน EOS</b>: hemoculture บวก <span class=\"hw\">(→ meningitis ~30%)</span> · สงสัย meningitis (ชัก, ซึม) · ไม่ตอบสนองต่อยาที่เหมาะสม</li></ul></div><div class=\"box\"><h3>สไลด์ต้นฉบับ (มีลายมือ)</h3>{{IMG:knl2neo_04d}}{{IMG:knl2neo_05a}}{{IMG:knl2neo_05b}}</div>"
},
{
"id": "L42-3",
"title": "Scalp injury — caput · subgaleal · cephalohematoma",
"topics": [
"2.3.16 Perinatal period",
"2.2 Emergency"
],
"rev": 1,
"upd": "2026-11-07",
"html": "<div class=\"box\"><h3>Scalp injury ★ <span class=\"hw\">ออกบ่อย</span></h3><table><tr><th></th><th>ลักษณะ</th><th>เวลา</th><th>ภาวะแทรกซ้อน</th></tr><tr><td>Caput succedaneum</td><td>soft tissue บวม <b>ข้าม suture</b></td><td>มีตั้งแต่เกิด หายในไม่กี่วัน</td><td>—</td></tr><tr><td><b>Subgaleal hemorrhage</b></td><td>fluctuant → tense, <b>ข้าม suture</b> <span class=\"hw\">(ใต้ galea)</span></td><td>หลังเกิดไม่นาน หายใน ~1 สัปดาห์</td><td><b>Hypovolemic shock ★★</b>, jaundice</td></tr><tr><td>Cephalohematoma</td><td>tense, <b>ไม่ข้าม suture</b> <span class=\"hw\">(ใต้ periosteum)</span></td><td>ใน 24 ชม.แรก หายหลายสัปดาห์</td><td>jaundice, calcified (ไม่บ่อย)</td></tr></table><ul><li>โจทย์: vacuum + ก้อนโตขึ้น/ข้าม midline + BP ต่ำ → ติดตาม <b>serial Hct</b> · ช็อก → <b>NSS 10 mL/kg</b></li></ul></div><div class=\"box\"><h3>สไลด์ต้นฉบับ (มีลายมือ)</h3>{{IMG:knl2neo_05d}}{{IMG:knl2neo_06a}}</div>"
},
{
"id": "L42-4",
"title": "Vital signs (neonatal period)",
"topics": [
"2.3.16 Perinatal period"
],
"rev": 1,
"upd": "2026-11-07",
"html": "<div class=\"box\"><h3>Vital signs (neonatal period)</h3><ul><li>BT 36.5–37.5 °C · RR 40–60 <span class=\"hw\">(&gt;60 = respiratory distress, &lt;40 ช้า, หยุดหายใจ &gt;20 วินาที = apnea)</span> · PR 100–160 <span class=\"hw\">(&lt;100 → PPV · tachycardia + cap refill &gt;2 s/BP drop = shock)</span></li><li>SBP ตามน้ำหนัก: <b>40 / 50 / 60 mmHg ที่ 1 / 2 / 3 kg</b> <span class=\"hw\">(4 kg ≈ 70)</span> · <b>MAP ≈ GA</b> (GA 39 wk ให้ MAP &gt;39)</li><li><span class=\"hw\">SpO2 &gt;95% · preterm &gt;90% OK · term &lt;95% → ให้ O2</span></li></ul></div><div class=\"box\"><h3>สไลด์ต้นฉบับ (มีลายมือ)</h3>{{IMG:knl2neo_16d}}</div>"
},
{
"id": "L42-5",
"title": "Neonatal hypoglycemia",
"topics": [
"2.3.16 Perinatal period",
"2.3.4 Endocrine, nutrition & metabolic"
],
"rev": 1,
"upd": "2026-11-07",
"html": "<div class=\"box\"><h3>Hypoglycemia ★ <span class=\"hw\">ออกแน่</span></h3><ul><li>นิยาม: <b>POCT glucose ≤40 mg%</b></li><li>คัดกรองกลุ่มเสี่ยง: preterm · IUGR/SGA · LBW · LGA · maternal diabetes</li><li>อาการ: sweating · tachypnea, cyanosis, apnea · hypotonia, poor feeding · seizure · lethargy, coma · jitteriness</li><li><b>Symptomatic</b>: เจาะ blood sugar → <b>10% dextrose 2 mL/kg IV push ★</b> → F/U POCT 60 นาที → IV fluid GIR 5–8 mg/kg/min <span class=\"hw\">(80–100 mL/kg/day)</span></li><li><b>Asymptomatic</b>: <b>early feeding</b> → F/U POCT 60 นาที</li><li>AAP: symptomatic + &lt;40 → IV glucose · 0–4 ชม.: feed ใน 1 ชม.แรก เจาะ 30 นาทีหลัง feed — &lt;25 feed/เจาะซ้ำ 1 ชม. → ยัง &lt;25 IV, 25–40 refeed/IV prn · 4–24 ชม.: feed q2–3 ชม. เจาะก่อนทุก feed — &lt;35 IV (หลัง feed ไม่ขึ้น), 35–45 refeed/IV prn · เป้า ≥45 ก่อน routine feed · glucose dose 200 mg/kg (D10 2 mL/kg) และ/หรือ 5–8 mg/kg/min</li><li>Emergency: dextrose 0.2 g/kg IV ใน 1 นาที แล้ว infusion GIR 6–8 · <b>GIR = %dextrose × rate (mL/h) ÷ (6 × BW)</b> · เจาะซ้ำทุก 10–20 นาที (keep 70–120)</li></ul></div><div class=\"box\"><h3>สไลด์ต้นฉบับ (มีลายมือ)</h3>{{IMG:knl2neo_06d}}{{IMG:knl2neo_07a}}{{IMG:knl2neo_07b}}</div>"
},
{
"id": "L42-6",
"title": "Polycythemia · neonatal anemia · acid elution / APT test",
"topics": [
"2.3.16 Perinatal period",
"2.3.3 Blood & immune"
],
"rev": 1,
"upd": "2026-11-07",
"html": "<div class=\"box\"><h3>Polycythemia <span class=\"hw\">ออก</span></h3><ul><li>นิยาม: <b>venous Hct ≥65%</b> <span class=\"hw\">(ปกติ 45–65 · capillary สูงกว่า venous)</span></li><li>Risk: placental insufficiency · maternal diabetes · maternal smoking <span class=\"hw\">(vasospasm → hypoxia → EPO)</span> · trisomy 13/18/21, Beckwith-Wiedemann <span class=\"hw\">(LGA)</span> · twin-to-twin transfusion · neonatal hyperthyroidism</li><li>Hyperviscosity: blood flow ไปสมอง หัวใจ ปอด ลำไส้ลดลง · irritability, jitteriness, tremor · feeding difficulty · lethargy · apnea, cyanosis, RD · seizure</li><li>รักษา (partial exchange transfusion): asymptomatic Hct &gt;70% · symptomatic Hct &gt;65%</li><li><b>NSS (mL) = (Hct ทารก − 55) × 80 × BW ÷ Hct ทารก</b> <span class=\"hw\">(55 = Hct ที่ต้องการ · 80 = blood volume mL/kg)</span></li></ul></div><div class=\"box\"><h3>Neonatal anemia</h3><ul><li>นิยาม Hct &lt;−2SD, <b>Hct &lt;40%</b></li><li><b>Blood loss</b>: antepartum (abruptio, previa, TTTS) · intrapartum (<b>fetomaternal hemorrhage</b> <span class=\"hw\">→ acid elution test</span>, obstetric trauma) · neonatal (subgaleal, intracranial, visceral bleed) → Dx: peripartum history, acid elution test ★, PE</li><li><b>Hemolysis</b>: immune (ABO, Rh, minor) · non-immune (sepsis) · enzyme (G6PD) · membrane (HS, HE) → anemia + jaundice, reticulocyte/NRBC ↑, PBS</li><li><b>Underproduction</b>: congenital (Diamond-Blackfan, congenital leukemia) · acquired (rubella, syphilis, aplastic) → reticulocyte ↓</li></ul></div><div class=\"box\"><h3>Acid elution · APT test</h3><ul><li><b>Kleihauer-Betke (acid elution)</b>: ยืนยัน <b>fetomaternal hemorrhage</b> · ทำบน<b>เลือดแม่</b> หาปริมาณ HbF ที่เข้าไปในแม่ · HbF ทนกรด, HbA ถูกชะออก <span class=\"hw\">(เม็ดเลือดแม่ HbA จางเป็นผี · เม็ดเลือดลูก HbF ติดสีชมพู)</span></li><li><b>APT (Apt-Downey / alkali denaturation)</b>: แยกเลือดในอุจจาระ/อาเจียนของทารกว่าเป็น<b>เลือดลูกหรือเลือดแม่ที่กลืนเข้าไป</b> · ผสมน้ำให้ hemolysis (supernatant สีชมพู) → ผสม 1% NaOH · <b>ยังชมพู = fetal blood (positive)</b> · เหลือง-น้ำตาล = maternal blood</li></ul></div>"
},
{
"id": "L42-7",
"title": "Respiratory distress — RDS · TTNB · MAS · pneumonia",
"topics": [
"2.3.16 Perinatal period"
],
"rev": 1,
"upd": "2026-11-07",
"html": "<div class=\"box\"><h3>Respiratory distress ★</h3><ul><li>DDx: RDS · TTNB <span class=\"hw\">(เหนื่อยใน 2–3 ชม.แรก)</span> · MAS · infection (pneumonia/sepsis) · CDH · TE fistula</li><li><b>RDS</b>: preterm &lt;34 wk (&lt;5% ใน &gt;34 wk) · <b>6 เท่าใน maternal diabetes</b> <span class=\"hw\">(insulin ทำให้ surfactant maturation ช้า)</span> · type II pneumocyte ยังไม่โต → surfactant น้อย → surface tension ↑ compliance ↓ · grunting, retraction, poor air entry, hypoxia, cyanosis <span class=\"hw\">เหนื่อยภายใน 2 ชม.แรก</span> · CXR: homogeneous opacity (ground glass), air bronchogram, <b>lung volume ลด ★★</b></li><li><b>TTNB ★★</b>: สาเหตุ RD ที่พบบ่อยสุดใน <b>term (40%)</b> · risk: maternal diabetes, <b>cesarean ★★★</b> <span class=\"hw\">(ไม่ได้เจ็บครรภ์ → ไม่มี catecholamine → ENaC ไม่ทำงาน → น้ำในปอดไม่ถูกดูดกลับ)</span> · delayed clearance of fetal lung fluid · อาการทันทีหรือใน 2 ชม. · CXR: diffuse parenchymal infiltrate รอบหัวใจ, <b>fluid in minor fissure</b>, hyperaeration ± pleural effusion</li><li><b>MAS</b>: term/post-term · meconium irritative + obstructive → หอบทันทีหลังคลอด <span class=\"hw\">(air trap · chemical pneumonitis)</span> · ภาวะแทรกซ้อน <b>air leak</b> (pneumothorax, pneumomediastinum), <b>PPHN</b> · CXR: patchy opacity + hyperinflation (atelectasis + air trapping)</li><li><b>Pneumonia/sepsis</b>: GBS, S. aureus, S. pneumoniae, GN rods · RD + temperature instability · <b>ใช้เวลาเป็นชั่วโมงถึงวัน</b> <span class=\"hw\">(เหนื่อยหลังคลอด 2–3 วัน → infection)</span> · risk: preterm, chorio, maternal fever, PROM นาน, GBS+ · CXR patchy ± air bronchogram</li></ul></div>"
},
{
"id": "L42-8",
"title": "CDH · TE fistula",
"topics": [
"2.3.17 Congenital & chromosomal",
"2.2 Emergency"
],
"rev": 1,
"upd": "2026-11-07",
"html": "<div class=\"box\"><h3>CDH ★ <span class=\"hw\">ออก</span> · TE fistula</h3><ul><li><b>CDH</b>: 85% ซ้าย · RD ในไม่กี่นาทีแรก, retraction, cyanosis, <b>scaphoid abdomen</b> <span class=\"hw\">(KW)</span>, heart sound ย้ายไปขวา (left CDH), breath sound ลด/ได้ยิน bowel sound ข้างที่เป็น · ภาวะแทรกซ้อน: lung hypoplasia, PPHN, pneumothorax · Mx: <b>ห้าม PPV via mask</b> <span class=\"hw\">(ลมเข้าลำไส้ในช่องอก)</span> · <b>intubate ★★</b> เมื่อมี RD · OG decompress · NPO</li><li><b>TE fistula</b>: พบบ่อยสุด <b>EA with distal TEF (type C, 87%)</b> · ร่วม <b>VACTERL</b> (vertebral, anorectal, cardiac, TEF, renal, limb) · Hx polyhydramnios <span class=\"hw\">(กลืนน้ำคร่ำไม่ได้)</span> · RD · hypersecretion, drooling · choking <span class=\"hw\">(ให้นมแล้วสำลัก)</span> · secretion sound/coarse crepitation ทั้งสองปอด · aspiration pneumonia · Dx**: <b>OG tube ใส่ไม่ผ่านเกิน 10–15 cm</b> → CXR เห็นสายขดใน upper esophageal pouch <span class=\"hw\">(ใส่ OG ก่อนแล้ว CXR)</span> · Mx: intubate ตามข้อบ่งชี้ · คา OG + low-pressure suction · NPO · หัวสูง · consult ped surg · empirical antibiotic</li></ul></div><div class=\"box\"><h3>สไลด์ต้นฉบับ (มีลายมือ)</h3>{{IMG:knl2neo_11c}}{{IMG:knl2neo_11d}}</div>"
},
{
"id": "L42-9",
"title": "Neonatal resuscitation (NRP 8th)",
"topics": [
"2.2 Emergency",
"2.3.16 Perinatal period"
],
"rev": 1,
"upd": "2026-11-07",
"html": "<div class=\"box\"><h3>Neonatal resuscitation (NRP 8th)</h3><ul><li><b>Initial steps</b>: warm, dry, stimulate, position airway (แหงนคอเล็กน้อย), suction ถ้าจำเป็น <span class=\"hw\">(วางใต้ radiant warmer เช็ดตัว เปลี่ยนผ้า)</span></li><li><b>Apnea/gasping หรือ HR &lt;100 → PPV</b> (→ ET tube) · labored breathing/cyanosis → O2 <span class=\"hw\">(term)</span> / CPAP <span class=\"hw\">(preterm)</span></li><li><b>HR &lt;60 → chest compression</b> → drugs (adrenaline, NSS) · <span class=\"hw\">HR&lt;100 PPV · HR&lt;60 CPR</span></li><li>Target SpO2: 1 นาที 60–65% · 2 นาที 65–70% · 3 นาที 70–75% · 4 นาที 75–80% · 5 นาที 80–85% · 10 นาที 85–95% · O2 เริ่ม PPV: ≥35 wk 21% · &lt;35 wk 21–30%</li><li><b>Airway and breathing are important in NCPR</b> · แม่ได้ pethidine: <span class=\"hw\">guideline 2010 ให้ naloxone · 2020 ใส่ tube</span> · MSAF non-vigorous HR &lt;100 → PPV (ไม่ดูดขี้เทาผ่านท่อเป็น routine)</li></ul></div><div class=\"box\"><h3>สไลด์ต้นฉบับ (มีลายมือ)</h3>{{IMG:knl2neo_13b}}{{IMG:knl2neo_13d}}</div>"
},
{
"id": "L42-10",
"title": "SGA · TORCH",
"topics": [
"2.3.16 Perinatal period",
"2.3.17 Congenital & chromosomal",
"2.3.1 Infectious & parasitic"
],
"rev": 1,
"upd": "2026-11-07",
"html": "<div class=\"box\"><h3>SGA</h3><table><tr><th></th><th>Symmetrical <span class=\"hw\">(เกิดจากตัวเด็ก)</span></th><th>Asymmetrical <span class=\"hw\">(เกิดจากแม่)</span></th></tr><tr><td>Etiology</td><td>intrinsic ต่อทารก</td><td>รก, โรคแม่</td></tr><tr><td>ตัวอย่าง</td><td>chromosome, genetic, congenital infection (TORCH)</td><td>chronic HT, preeclampsia, chronic fetal distress</td></tr><tr><td>Body / Brain</td><td>เล็กทั้งคู่</td><td>ตัวเล็ก <b>สมองไม่เล็ก</b></td></tr><tr><td>ช่วงที่กระทบ</td><td>ไตรมาสแรก</td><td>ไตรมาส 3 / ปลายไตรมาส 2</td></tr></table><ul><li>Complications: perinatal asphyxia · meconium aspiration <span class=\"hw\">(fetal distress → ขี้เทา → MAS)</span> · hypoglycemia · polycythemia · hypothermia</li><li>SGA + malformation (cleft lip) + แม่อายุมาก → <b>chromosome study</b></li></ul></div><div class=\"box\"><h3>TORCH</h3><ul><li>T toxoplasmosis · O others (syphilis, Zika <span class=\"hw\">VZV</span>) · R rubella · C CMV · H herpes</li><li>ร่วม: IUGR · microcephaly · ventriculomegaly · intracranial calcification · optic nerve hypoplasia · chorioretinal atrophy</li><li>Toxo: diffuse ICC, hydrocephalus, chorioretinitis · Syphilis: snuffles, maculopapular rash ฝ่ามือฝ่าเท้า, bone change (osteochondritis, periostitis) · <b>Rubella ★</b>: blueberry muffin, ตา (cataract, congenital glaucoma, pigmentary retinopathy), <b>CHD (PDA, pulmonary artery stenosis)</b> <span class=\"hw\">→ heart</span> · <b>CMV ★</b>: periventricular calcification, microcephaly · HSV: vesicle/scar, conjunctivitis/keratoconjunctivitis, LFT ↑ · Zika: microcephaly, ventriculomegaly, ICC, optic nerve hypoplasia</li><li><span class=\"hw\">clouded lens (ต้อกระจก) = KW → rubella</span></li></ul></div><div class=\"box\"><h3>สไลด์ต้นฉบับ (มีลายมือ)</h3>{{IMG:knl2neo_14c}}{{IMG:knl2neo_14d}}{{IMG:knl2neo_15d}}</div>"
},
{
"id": "L42-11",
"title": "Neonatal conjunctivitis",
"topics": [
"2.3.7 Eye & adnexa",
"2.3.16 Perinatal period"
],
"rev": 1,
"upd": "2026-11-07",
"html": "<div class=\"box\"><h3>Neonatal conjunctivitis (Nelson table)</h3><table><tr><th></th><th>Onset</th><th>ลักษณะ</th><th>Dx</th><th>Rx</th></tr><tr><td>Chemical</td><td>24 ชม.</td><td>noninfectious, lid edema, watery</td><td>ประวัติยา หายเองใน &lt;48 ชม.</td><td>ไม่ต้อง</td></tr><tr><td>Gonococcal</td><td>3–4 วัน</td><td>hyperacute purulent, lid edema มาก, cornea perforate ได้</td><td>Gram stain GN intracellular diplococci</td><td>ceftriaxone 25–50 mg/kg ครั้งเดียว + irrigation</td></tr><tr><td>Chlamydia</td><td>5–7 วัน (พบบ่อยสุด)</td><td>mild mucopurulent, pseudomembrane, pneumonitis 3–12 wk</td><td>Giemsa inclusion, DFA, PCR</td><td>oral erythromycin 12.5 mg/kg q6h 2 wk หรือ azithromycin 20 mg/kg/d 3 วัน</td></tr><tr><td>Staph/Strep</td><td>5–14 วัน</td><td>nosocomial</td><td>culture</td><td>topical</td></tr><tr><td>HSV</td><td>6–14 วัน</td><td>dendritic keratitis</td><td>DFA/PCR</td><td>acyclovir 60 mg/kg/d IV + topical</td></tr></table><ul><li><span class=\"hw\">silver nitrate = ยาหยอดตา → chemical · ป้ายยา tetracycline = OK</span></li></ul></div><div class=\"box\"><h3>สไลด์ต้นฉบับ (มีลายมือ)</h3>{{IMG:knl2neo_16b}}</div>"
},
{
"id": "L42-12",
"title": "Hearing screening ในทารกแรกเกิด (ลายมือหน้าสุดท้าย)",
"topics": [
"1.5 Check-up, screening & certificates",
"2.3.8 Ear & mastoid"
],
"rev": 1,
"upd": "2026-11-07",
"html": "<div class=\"box\"><h3><span class=\"hw\">ต้องตรวจการได้ยินตอนไหน (ลายมือหน้าสุดท้าย)</span></h3><ul><li><b>OAE screening → ตรวจทุกคน</b></li><li><b>ABR → ตรวจในคนเสี่ยง</b>: เหลืองจนถึงเกณฑ์ exchange · chromosome abnormality · craniofacial malformation · meningitis (อาจกด brain stem) · ได้ ototoxic drug (gentamicin, aminoglycoside, lasix) · เจ็บป่วยมาก อยู่ รพ.นาน · <b>low Apgar score</b> (เลือดไปเลี้ยงสมองน้อย)</li></ul></div><div class=\"box\"><h3>สไลด์ต้นฉบับ (มีลายมือ)</h3>{{IMG:knl2neo_17}}</div>"
}
]
}],"merged":{}};
