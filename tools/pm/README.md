# Pocket Medicine 8e → โพยหมอ (Medical Soil › Pocket Medicine)

ไฟล์ต้นฉบับ: Pocket_Medicine_8th_Edition_2022.pdf (705 หน้า, ไม่อยู่ใน repo)

```
python3 -I tools/pm/extract.py <pdf> /tmp/pmout          # → /tmp/pmout/<id>.json + img/*.webp
python3 -I tools/pm/build_site.py /tmp/pmout docs        # → docs/pm/, docs/pm/search.json, docs/data/pm.js
```

- PDF ไม่มี ToUnicode ที่ใช้ได้: Helvetica glyph id 3..97 = ASCII − 29, ตัวอื่น map ใน `GH/GA/GL`
- ลูกศร ↑↓→, ✓, ♂♀ ฯลฯ วาดเป็นเส้น → จับจากรูปร่าง (`draws.json` + `DRAWN`)
- ตาราง/รูป/ECG/algorithm = ภาพตัดจากเล่ม (webp lossless 170 dpi) + ข้อความในภาพเก็บไว้ค้นหา
- `toc.json` = เรื่องทั้งหมด (หน้าเริ่ม/จบ ตาม index ไฟล์ 0-based, บทของเล่ม) — ข้ามสารบัญ/คำนำ/Index
- หน้าเว็บ: `pmPage` ใน docs/app.js · โน้ต/แก้เนื้อหา key `pm:<เรื่อง>:<ส่วน>` · แท็ก International
