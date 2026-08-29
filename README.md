# RC Detailing Field Exam 2026

เว็บข้อสอบจาก `TEST-01 แบบทดสอบความรู้หน้างาน Engineer 2026` รองรับการลงชื่อ จับเวลาจากเซิร์ฟเวอร์ ส่งคำตอบครั้งเดียว เฉลยละเอียด และ Score Board

## สิ่งที่มีในชุดนี้

- โจทย์ 10 ข้อ รวม 30 คะแนน มีช่องตัวเลข ข้อเขียน และตัวเลือก
- รูปประกอบ 8 รูป ครอปจากข้อสอบต้นฉบับให้ตรงกับโจทย์
- กรอกเฉพาะชื่อ–นามสกุล โดยใช้ Supabase Anonymous Sign-in ไม่ต้องใช้อีเมลหรือรหัสผ่าน
- เวลาเริ่มและเวลาส่งบันทึกในฐานข้อมูล ป้องกันการแก้เวลาจากหน้าเว็บ
- ตรวจคะแนนใน PostgreSQL function จึงไม่ส่งเฉลยไปที่ browser ก่อนกดส่ง
- จำกัดหนึ่งบัญชีต่อหนึ่ง attempt ต่อเวอร์ชันข้อสอบ
- Score Board เรียงคะแนนมากก่อน และเวลาน้อยก่อนเมื่อคะแนนเท่ากัน
- เฉลยหลังส่งพร้อมหน้าเอกสารและมาตรฐานอ้างอิง
- ปลดล็อกเอกสาร Google Drive และวิดีโอ Lecture 2 รายการหลังส่งคำตอบสำเร็จเท่านั้น โดย URL ทั้งหมดอยู่ฝั่งฐานข้อมูล
- ผู้ที่เคยส่งข้อสอบสามารถกรอกชื่อเดิมเพื่อเปิดคะแนน เฉลย และเอกสารหลังสอบย้อนหลัง
- Responsive รองรับโทรศัพท์ แท็บเล็ต และคอมพิวเตอร์

## ข้อเท็จจริงที่ต้องรู้ก่อนใช้จริง

1. GitHub Pages อย่างเดียวไม่เพียงพอสำหรับระบบคะแนนที่เชื่อถือได้ จึงต้องใช้ Supabase เป็น backend
2. repository ควรตั้งเป็น **Private** เพราะ `supabase/schema.sql` มี answer key หากเปิด source สาธารณะ ผู้เข้าสอบสามารถอ่านคำตอบได้
3. ห้ามอัปโหลด PDF/วิดีโอภายในบริษัทไป public repository โดยไม่ได้รับอนุญาต ชุดนี้ใส่เฉพาะภาพจากข้อสอบที่จำเป็นต่อการทำข้อสอบ
4. ลิงก์ Google Drive ต้องตั้งสิทธิ์ Viewer ให้กลุ่มผู้สอบเปิดได้ และควรทดสอบในหน้าต่างไม่ระบุตัวตนก่อนเปิดสอบ
5. Google Drive และวิดีโอ YouTube หลังสอบเก็บไว้ใน database function เท่านั้น ห้ามย้าย URL ไปไว้ใน `config.js` หรือ `app.js` มิฉะนั้นผู้สอบสามารถอ่าน source ก่อนส่งคำตอบได้
6. ผู้ออกข้อสอบรับรองคำตอบข้อ 1, 4, 7.2 และ 9 เมื่อวันที่ 29 สิงหาคม 2026 ตาม `ANSWER-KEY-REVIEW.md`
7. การค้นผลย้อนหลังด้วยชื่ออย่างเดียวไม่ใช่การยืนยันตัวตน ผู้ที่รู้ชื่อผู้อื่นสามารถเปิดผลของชื่อนั้นได้ และกรณีชื่อซ้ำระบบจะเลือกผลที่ส่งล่าสุด

## ทดลองหน้าเว็บในเครื่อง

เปิด Terminal ในโฟลเดอร์นี้ แล้วรัน:

```powershell
python -m http.server 8080
```

จากนั้นเปิด `http://localhost:8080` ค่าเริ่มต้นเป็น `demoMode: true` จึงทดลองหน้าจอได้ แต่จะไม่ตรวจคะแนนหรือบันทึก Score Board

## ตั้งค่า Supabase

1. สร้าง Supabase project ใหม่
2. เปิด SQL Editor และรันไฟล์ `supabase/schema.sql` ทั้งไฟล์
3. ใน Authentication > Sign In / Providers เปิด **Allow anonymous sign-ins**
4. แนะนำให้เปิด Cloudflare Turnstile/CAPTCHA ก่อนเผยแพร่สู่สาธารณะ เพื่อลดการสร้างบัญชีชั่วคราวอัตโนมัติ
5. คัดลอก Project URL และ Publishable key (`sb_publishable_...`) จาก Connect หรือ Settings > API Keys
6. แก้ `config.js` เมื่อต้องการย้ายไปใช้ Supabase project อื่น:

```js
window.APP_CONFIG = {
  supabaseUrl: "https://PROJECT.supabase.co",
  supabaseKey: "sb_publishable_...",
  demoMode: false,
  examVersion: "test-01-2026-v2",
  resources: [],
};
```

Publishable key เป็นคีย์สำหรับ browser และเปิดเผยในหน้าเว็บได้ตามการออกแบบของ Supabase ความปลอดภัยอยู่ที่ RLS และสิทธิ์ของ database function ห้ามใส่ Secret key หรือ service-role key ในไฟล์นี้เด็ดขาด

ลิงก์ Google Drive และวิดีโอหลังสอบอยู่ใน `public.post_exam_resources()` ภายใน `supabase/schema.sql` ระบบจะเรียก function นี้เมื่อ attempt มีสถานะ `submitted` เท่านั้น

## นำขึ้น Cloudflare Workers จาก Private GitHub repository

โปรเจกต์นี้ใช้ Workers Static Assets และกำหนดโฟลเดอร์เผยแพร่ไว้ใน `wrangler.jsonc` แล้ว ให้เชื่อม Private repository กับ Workers Builds และตั้งค่า:

- Build command: `npm run build`
- Deploy command: `npm run deploy`
- Root directory: เว้นว่าง
- Production branch: `main`

คำสั่ง build จะคัดลอกเฉพาะหน้าเว็บและรูปข้อสอบไปยัง `dist` และหยุดทันทีหากตรวจพบ URL เอกสาร/วิดีโอหลังสอบ จึงไม่เผยแพร่ `supabase/schema.sql`, README หรือ answer key

ห้ามเปลี่ยน `assets.directory` เป็น `.` หรือ root repository เพราะจะทำให้ไฟล์ SQL และ answer key ถูกเสิร์ฟเป็นไฟล์เว็บไซต์ ต้องใช้ `./dist` เท่านั้น

## การเปลี่ยนข้อสอบ

- โจทย์และฟอร์มอยู่ในตัวแปร `questions` ภายใน `app.js`
- กติกาตรวจคำตอบและคำอธิบายอยู่ใน `public.submit_exam` ภายใน `supabase/schema.sql`
- เพิ่มเลขเวอร์ชันใน `examVersion` ทุกครั้งที่เปลี่ยนโจทย์หรือเฉลย เพื่อไม่ให้ attempt เก่าปะปน
- ถ้าแก้คะแนนเต็ม ต้องแก้ทั้งหน้าเว็บ ตาราง และ function ให้ตรงกัน

## การดูแลข้อมูลส่วนบุคคล

ระบบเก็บชื่อ เวลา และผลคะแนน รวมถึงบัญชี Anonymous ภายใน Supabase ควรกำหนดระยะเวลาเก็บและลบบัญชีชั่วคราวที่หมดอายุเป็นระยะ ผู้สอบจะกลับเข้าบัญชีเดิมไม่ได้หากล้างข้อมูล browser เปลี่ยนอุปกรณ์ หรือกดเปลี่ยนผู้สอบ
