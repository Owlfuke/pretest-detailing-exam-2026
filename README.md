# RC Detailing Field Exam 2026

เว็บข้อสอบจาก `TEST-01 แบบทดสอบความรู้หน้างาน Engineer 2026` รองรับการลงชื่อ จับเวลาจากเซิร์ฟเวอร์ ส่งคำตอบครั้งเดียว เฉลยละเอียด และ Score Board

## สิ่งที่มีในชุดนี้

- โจทย์ 10 ข้อ รวม 30 คะแนน มีช่องตัวเลข ข้อเขียน และตัวเลือก
- รูปประกอบ 8 รูป ครอปจากข้อสอบต้นฉบับให้ตรงกับโจทย์
- ระบบสมัคร/เข้าสู่ระบบด้วย Supabase Auth
- เวลาเริ่มและเวลาส่งบันทึกในฐานข้อมูล ป้องกันการแก้เวลาจากหน้าเว็บ
- ตรวจคะแนนใน PostgreSQL function จึงไม่ส่งเฉลยไปที่ browser ก่อนกดส่ง
- จำกัดหนึ่งบัญชีต่อหนึ่ง attempt ต่อเวอร์ชันข้อสอบ
- Score Board เรียงคะแนนมากก่อน และเวลาน้อยก่อนเมื่อคะแนนเท่ากัน
- เฉลยหลังส่งพร้อมหน้าเอกสารและมาตรฐานอ้างอิง
- ปลดล็อกเอกสาร SharePoint และวิดีโอ Lecture 2 รายการหลังส่งคำตอบสำเร็จเท่านั้น โดย URL ทั้งหมดอยู่ฝั่งฐานข้อมูล
- Responsive รองรับโทรศัพท์ แท็บเล็ต และคอมพิวเตอร์

## ข้อเท็จจริงที่ต้องรู้ก่อนใช้จริง

1. GitHub Pages อย่างเดียวไม่เพียงพอสำหรับระบบคะแนนที่เชื่อถือได้ จึงต้องใช้ Supabase เป็น backend
2. repository ควรตั้งเป็น **Private** เพราะ `supabase/schema.sql` มี answer key หากเปิด source สาธารณะ ผู้เข้าสอบสามารถอ่านคำตอบได้
3. ห้ามอัปโหลด PDF/วิดีโอภายในบริษัทไป public repository โดยไม่ได้รับอนุญาต ชุดนี้ใส่เฉพาะภาพจากข้อสอบที่จำเป็นต่อการทำข้อสอบ
4. ลิงก์ SharePoint ต้องทดสอบด้วยบัญชีผู้เข้าสอบจริง เพื่อยืนยันว่าทุกคนมีสิทธิ์ Viewer ก่อนเปิดสอบ
5. SharePoint และวิดีโอ YouTube หลังสอบเก็บไว้ใน database function เท่านั้น ห้ามย้าย URL ไปไว้ใน `config.js` หรือ `app.js` มิฉะนั้นผู้สอบสามารถอ่าน source ก่อนส่งคำตอบได้
6. คำตอบข้อ 1 และข้อ 4 เป็นการตีความจากแบบ/สไลด์ ผู้บรรยายหรือวิศวกรผู้ออกข้อสอบควรลงนามรับรองตาม `ANSWER-KEY-REVIEW.md` ก่อนเปิดสอบจริง

## ทดลองหน้าเว็บในเครื่อง

เปิด Terminal ในโฟลเดอร์นี้ แล้วรัน:

```powershell
python -m http.server 8080
```

จากนั้นเปิด `http://localhost:8080` ค่าเริ่มต้นเป็น `demoMode: true` จึงทดลองหน้าจอได้ แต่จะไม่ตรวจคะแนนหรือบันทึก Score Board

## ตั้งค่า Supabase

1. สร้าง Supabase project ใหม่
2. เปิด SQL Editor และรันไฟล์ `supabase/schema.sql` ทั้งไฟล์
3. ใน Authentication > URL Configuration ใส่ URL เว็บไซต์จริงใน Site URL และ Redirect URLs
4. คัดลอก Project URL และ Publishable key (`sb_publishable_...`) จาก Connect หรือ Settings > API Keys
5. แก้ `config.js` เมื่อต้องการย้ายไปใช้ Supabase project อื่น:

```js
window.APP_CONFIG = {
  supabaseUrl: "https://PROJECT.supabase.co",
  supabaseKey: "sb_publishable_...",
  demoMode: false,
  examVersion: "test-01-2026-v1",
  resources: [],
};
```

Publishable key เป็นคีย์สำหรับ browser และเปิดเผยในหน้าเว็บได้ตามการออกแบบของ Supabase ความปลอดภัยอยู่ที่ RLS และสิทธิ์ของ database function ห้ามใส่ Secret key หรือ service-role key ในไฟล์นี้เด็ดขาด

ลิงก์ SharePoint และวิดีโอหลังสอบอยู่ใน `public.post_exam_resources()` ภายใน `supabase/schema.sql` ระบบจะเรียก function นี้เมื่อ attempt มีสถานะ `submitted` เท่านั้น

## นำขึ้น GitHub

สร้าง private repository แล้วเปิด GitHub Pages โดยเลือก Source เป็น **GitHub Actions** workflow ที่ให้มา ระบบจะเผยแพร่เฉพาะไฟล์หน้าเว็บ ไม่เผยแพร่ `supabase/schema.sql`, README หรือ answer key ค่า Project URL และ Publishable key อยู่ใน `config.example.js` เพราะเป็นค่าที่ออกแบบให้เปิดเผยใน browser ได้

ห้ามเลือก Deploy from branch/root เพราะอาจทำให้ไฟล์ SQL และ answer key ถูกเสิร์ฟเป็นไฟล์เว็บไซต์ ให้ใช้ `.github/workflows/deploy-pages.yml` เท่านั้น แม้ URL และ anon key จะเป็นค่าฝั่ง client ที่เปิดเผยได้ แต่ answer key และ URL วิดีโอหลังสอบต้องไม่อยู่ใน deployment artifact

## การเปลี่ยนข้อสอบ

- โจทย์และฟอร์มอยู่ในตัวแปร `questions` ภายใน `app.js`
- กติกาตรวจคำตอบและคำอธิบายอยู่ใน `public.submit_exam` ภายใน `supabase/schema.sql`
- เพิ่มเลขเวอร์ชันใน `examVersion` ทุกครั้งที่เปลี่ยนโจทย์หรือเฉลย เพื่อไม่ให้ attempt เก่าปะปน
- ถ้าแก้คะแนนเต็ม ต้องแก้ทั้งหน้าเว็บ ตาราง และ function ให้ตรงกัน

## การดูแลข้อมูลส่วนบุคคล

ระบบเก็บชื่อ รหัสพนักงาน ตำแหน่ง อีเมล เวลา และผลคะแนน ควรกำหนดผู้ควบคุมข้อมูล ระยะเวลาเก็บ การเข้าถึง และช่องทางให้พนักงานขอแก้ไข/ลบข้อมูลตามนโยบายบริษัทและกฎหมายที่ใช้บังคับ
