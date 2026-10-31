"""ข้อความที่ถอดจาก PDF Blackbook (ช่วยพิมพ์เท่านั้น — บางตัวอักษรหาย เช่น R B N L T ต้องดูภาพประกอบเสมอ)
ใช้: python3 -I txt.py PDFPAGE"""
import sys,subprocess,re
t=subprocess.run(['pdftotext','-f',sys.argv[1],'-l',sys.argv[1],'-layout','/home/claude/bb/src.pdf','-'],capture_output=True,text=True).stdout
print(re.sub(r'[ \t]{3,}','   ',t.replace('\t',' ')))
