-- Run this file once in the Supabase SQL Editor.
-- Keep the repository private: this server-side file contains the answer key.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  employee_id text not null unique check (char_length(employee_id) between 2 and 40),
  position text not null check (position in ('Engineer', 'Foreman', 'Other')),
  created_at timestamptz not null default now()
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  exam_version text not null,
  started_at timestamptz not null default clock_timestamp(),
  submitted_at timestamptz,
  answers jsonb,
  score numeric(6,2),
  max_score numeric(6,2) not null default 30,
  duration_seconds integer,
  details jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  unique (user_id, exam_version)
);

create index if not exists exam_attempts_leaderboard_idx
  on public.exam_attempts (exam_version, score desc, duration_seconds asc, submitted_at asc)
  where status = 'submitted';

create index if not exists profiles_normalized_name_idx
  on public.profiles ((lower(regexp_replace(trim(full_name), '[[:space:]]+', ' ', 'g'))));

alter table public.profiles enable row level security;
alter table public.exam_attempts enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "read own attempts" on public.exam_attempts;
create policy "read own attempts" on public.exam_attempts
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, employee_id, position)
  values (
    new.id,
    trim(coalesce(new.raw_user_meta_data->>'full_name', '')),
    coalesce(nullif(upper(trim(new.raw_user_meta_data->>'employee_id')), ''), 'G-' || new.id::text),
    coalesce(nullif(new.raw_user_meta_data->>'position', ''), 'Other')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.safe_numeric(value text)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
begin
  return value::numeric;
exception when others then
  return null;
end;
$$;

revoke all on function public.safe_numeric(text) from public, anon, authenticated;

-- These links stay server-side and are returned only after a verified submission.
create or replace function public.post_exam_resources()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_array(
    jsonb_build_object('label','เอกสารประกอบการอบรม Reinforced Concrete Detailing','url','https://drive.google.com/file/d/1tPAJ60LcHa9I2u6jFB5D3xw8XWBlhBmB/view?usp=sharing'),
    jsonb_build_object('label','Lecture Reinforced Concrete Detailing — Part 1','url','https://youtu.be/MrbwCVn2XJE'),
    jsonb_build_object('label','Lecture Reinforced Concrete Detailing — Part 2','url','https://youtu.be/-KvpzvD8Zko')
  );
$$;

revoke all on function public.post_exam_resources() from public, anon, authenticated;

-- Name-only recovery is intentionally convenient but is not identity verification.
-- Anyone who knows a submitted participant's exact name can retrieve that result.
create or replace function public.get_previous_result_by_name(
  p_exam_version text,
  p_full_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_attempt public.exam_attempts;
  v_normalized_name text := lower(regexp_replace(trim(coalesce(p_full_name, '')), '[[:space:]]+', ' ', 'g'));
begin
  if v_user is null then raise exception 'กรุณาลงชื่อเข้าใช้'; end if;
  if char_length(v_normalized_name) not between 2 and 120 then
    raise exception 'กรุณากรอกชื่อ–นามสกุลให้ถูกต้อง';
  end if;

  select a.* into v_attempt
  from public.exam_attempts a
  join public.profiles p on p.id = a.user_id
  where a.exam_version = p_exam_version
    and a.status = 'submitted'
    and lower(regexp_replace(trim(p.full_name), '[[:space:]]+', ' ', 'g')) = v_normalized_name
  order by a.submitted_at desc, a.id desc
  limit 1;

  if not found then return null; end if;

  return jsonb_build_object(
    'score',v_attempt.score,
    'max_score',v_attempt.max_score,
    'duration_seconds',v_attempt.duration_seconds,
    'submitted_at',v_attempt.submitted_at,
    'details',v_attempt.details,
    'post_exam_resources',public.post_exam_resources(),
    'recovered',true
  );
end;
$$;

revoke all on function public.get_previous_result_by_name(text,text) from public, anon, authenticated;
grant execute on function public.get_previous_result_by_name(text,text) to authenticated;

create or replace function public.start_exam(p_exam_version text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_attempt public.exam_attempts;
  v_full_name text;
  v_previous_result jsonb;
begin
  if v_user is null then raise exception 'กรุณาลงชื่อเข้าใช้'; end if;

  select p.full_name into v_full_name
  from public.profiles p
  where p.id = v_user;
  if not found then raise exception 'ไม่พบข้อมูลผู้เข้าสอบ'; end if;

  v_previous_result := public.get_previous_result_by_name(p_exam_version, v_full_name);
  if v_previous_result is not null then
    return jsonb_build_object('status','submitted','result',v_previous_result);
  end if;

  select * into v_attempt
  from public.exam_attempts
  where user_id = v_user and exam_version = p_exam_version;

  if found and v_attempt.status = 'submitted' then
    return jsonb_build_object(
      'status','submitted',
      'result',jsonb_build_object(
        'score',v_attempt.score,
        'max_score',v_attempt.max_score,
        'duration_seconds',v_attempt.duration_seconds,
        'submitted_at',v_attempt.submitted_at,
        'details',v_attempt.details,
        'post_exam_resources',public.post_exam_resources()
      )
    );
  end if;

  if not found then
    insert into public.exam_attempts (user_id, exam_version)
    values (v_user, p_exam_version)
    returning * into v_attempt;
  end if;

  return jsonb_build_object('status','in_progress','attempt_id',v_attempt.id,'started_at',v_attempt.started_at);
end;
$$;

create or replace function public.submit_exam(p_attempt_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.exam_attempts;
  v_user uuid := auth.uid();
  v_score numeric := 0;
  v_award numeric;
  v_details jsonb := '[]'::jsonb;
  v_text text := lower(coalesce(p_answers->>'q5_3', ''));
  v_key text;
  v_submitted timestamptz := clock_timestamp();
  v_duration integer;
begin
  if v_user is null then raise exception 'กรุณาลงชื่อเข้าใช้'; end if;

  select * into v_attempt from public.exam_attempts
  where id = p_attempt_id and user_id = v_user for update;
  if not found then raise exception 'ไม่พบการทำข้อสอบของผู้ใช้'; end if;
  if v_attempt.status = 'submitted' then raise exception 'ส่งคำตอบแล้ว ไม่สามารถส่งซ้ำได้'; end if;

  foreach v_key in array array[
    'q1_x','q1_y','q1_pass','q1_expand',
    'q2_1_wc','q2_1_water','q2_1_slump','q2_2_wc','q2_2_water','q2_2_slump',
    'q3_1','q3_2','q3_3','q3_4','q3_5',
    'q4_1','q4_2','q4_3','q4_4',
    'q5_1','q5_2','q5_3','q6','q7_1','q7_2','q8_1','q8_2','q9','q10'
  ] loop
    if nullif(trim(coalesce(p_answers->>v_key,'')), '') is null then
      raise exception 'กรุณาตอบคำถามให้ครบทุกข้อก่อนส่ง';
    end if;
  end loop;
  if char_length(trim(p_answers->>'q5_3')) < 20 then
    raise exception 'คำตอบข้อ 5.3 ต้องอธิบายอย่างน้อย 20 ตัวอักษร';
  end if;

  -- Q1: 4 points
  v_award := 0;
  if abs(public.safe_numeric(p_answers->>'q1_x') - (-0.34)) <= 0.01 then v_award := v_award + 1; end if;
  if abs(public.safe_numeric(p_answers->>'q1_y') - (-2.10)) <= 0.01 then v_award := v_award + 1; end if;
  if p_answers->>'q1_pass' = 'pass' then v_award := v_award + 1; end if;
  if p_answers->>'q1_expand' = 'no' then v_award := v_award + 1; end if;
  v_score := v_score + v_award;
  v_details := v_details || jsonb_build_array(jsonb_build_object(
    'label','ข้อ 1 — Pile eccentricity','awarded',v_award,'points',4,
    'status',case when v_award=4 then 'correct' when v_award=0 then 'incorrect' else 'partial' end,
    'user_answer',concat('X=',p_answers->>'q1_x',', Y=',p_answers->>'q1_y',', ',p_answers->>'q1_pass',', expand=',p_answers->>'q1_expand'),
    'explanation','X=(5.3−0.5−1.1−6.1+0.7)/5 = −0.34 ซม.; Y=(−1.3+5.6−0.6−6.3−7.9)/5 = −2.10 ซม. ระยะเยื้องศูนย์ลัพธ์ = √(X²+Y²) = √(0.34²+2.10²) = 2.127 ซม. หรือประมาณ 2.13 ซม. ซึ่งไม่เกินเกณฑ์ 7.5 ซม. จึงผ่านและไม่ต้องขยายฐานรากตามคำรับรองของผู้ออกข้อสอบ',
    'reference','TEST-01 หน้า 1; Detailing 2026 หน้า 130–138 (Pile Eccentricity); คำรับรองผู้ออกข้อสอบ 29 ส.ค. 2026'
  ));

  -- Q2: 6 points
  v_award := 0;
  if abs(public.safe_numeric(p_answers->>'q2_1_wc') - 0.45) <= 0.001 then v_award:=v_award+1; end if;
  if abs(public.safe_numeric(p_answers->>'q2_1_water') - 170) <= 0.1 then v_award:=v_award+1; end if;
  if abs(public.safe_numeric(p_answers->>'q2_1_slump') - 7.5) <= 0.1 then v_award:=v_award+1; end if;
  if abs(public.safe_numeric(p_answers->>'q2_2_wc') - 0.40) <= 0.001 then v_award:=v_award+1; end if;
  if abs(public.safe_numeric(p_answers->>'q2_2_water') - 180) <= 0.1 then v_award:=v_award+1; end if;
  if abs(public.safe_numeric(p_answers->>'q2_2_slump') - 10) <= 0.1 then v_award:=v_award+1; end if;
  v_score := v_score + v_award;
  v_details := v_details || jsonb_build_array(jsonb_build_object(
    'label','ข้อ 2 — General Concrete Specification','awarded',v_award,'points',6,
    'status',case when v_award=6 then 'correct' when v_award=0 then 'incorrect' else 'partial' end,
    'user_answer',concat('คาน: W/C ',p_answers->>'q2_1_wc',', น้ำ ',p_answers->>'q2_1_water',', slump ',p_answers->>'q2_1_slump','; PTS: W/C ',p_answers->>'q2_2_wc',', น้ำ ',p_answers->>'q2_2_water',', slump ',p_answers->>'q2_2_slump'),
    'explanation','คาน RC.Normal (General Structure) fc′ 240–280: W/C ≤0.45, น้ำ ≤170 ลิตร, slump 75±25 มม. (ค่ากลาง 7.5 ซม.). PTS fc′ 320: W/C ≤0.40, น้ำ 170–180 ลิตรจึงใช้ค่าสูงสุด 180 ลิตร, slump 100±25 มม. (ค่ากลาง 10 ซม.)',
    'reference','TEST-01 หน้า 2; Detailing 2026 หน้า 11 และหน้า 13'
  ));

  -- Q3: 5 points
  v_award := 0;
  if public.safe_numeric(p_answers->>'q3_1')=2 then v_award:=v_award+1; end if;
  if public.safe_numeric(p_answers->>'q3_2')=2 then v_award:=v_award+1; end if;
  if public.safe_numeric(p_answers->>'q3_3')=2 then v_award:=v_award+1; end if;
  if public.safe_numeric(p_answers->>'q3_4')=14 then v_award:=v_award+1; end if;
  if public.safe_numeric(p_answers->>'q3_5')=14 then v_award:=v_award+1; end if;
  v_score := v_score + v_award;
  v_details := v_details || jsonb_build_array(jsonb_build_object(
    'label','ข้อ 3 — ระยะเวลาถอดแบบ','awarded',v_award,'points',5,
    'status',case when v_award=5 then 'correct' when v_award=0 then 'incorrect' else 'partial' end,
    'user_answer',concat_ws(', ',p_answers->>'q3_1',p_answers->>'q3_2',p_answers->>'q3_3',p_answers->>'q3_4',p_answers->>'q3_5'),
    'explanation','แบบข้างฐานราก แบบข้างเสา และแบบข้างคานอย่างน้อย 2 วัน; แบบล่างรองรับคานและพื้น 14 วัน. ถ้าท้องคานยาวเกิน 6 ม. เอกสารกำหนด 21 วัน และต้องค้ำต่อ/ตรวจตามแบบและคำแนะนำวิศวกร',
    'reference','TEST-01 หน้า 2; Detailing 2026 หน้า 14 (การถอดแบบคอนกรีต)'
  ));

  -- Q4: 4 points
  v_award := 0;
  if abs(public.safe_numeric(p_answers->>'q4_1')-25)<=0.1 then v_award:=v_award+1; end if;
  if abs(public.safe_numeric(p_answers->>'q4_2')-20)<=0.1 then v_award:=v_award+1; end if;
  if abs(public.safe_numeric(p_answers->>'q4_3')-240)<=0.5 then v_award:=v_award+1; end if;
  if abs(public.safe_numeric(p_answers->>'q4_4')-300)<=0.5 then v_award:=v_award+1; end if;
  v_score := v_score + v_award;
  v_details := v_details || jsonb_build_array(jsonb_build_object(
    'label','ข้อ 4 — Detailing เหล็กคาน','awarded',v_award,'points',4,
    'status',case when v_award=4 then 'correct' when v_award=0 then 'incorrect' else 'partial' end,
    'user_answer',concat_ws(', ',p_answers->>'q4_1',p_answers->>'q4_2',p_answers->>'q4_3',p_answers->>'q4_4'),
    'explanation','DB12, fc′ 280: ระยะฝังสำหรับเหล็กงอขอ 25 ซม.; ของอ 90° ค่า J = 20 ซม. เหล็กพิเศษบนเหนือเสายื่น 0.30L แต่ละด้าน จึง L2=0.60×400=240 ซม. เหล็กพิเศษล่างเว้น 0.125L จากแต่ละปลาย จึง L3=(1−0.125−0.125)×400=300 ซม.',
    'reference','TEST-01 หน้า 3–4; Detailing 2026 หน้า 31–34 และ 43–44; ว.ส.ท. 1008-38 หัวข้อ 3401 (ของอมาตรฐาน)'
  ));

  -- Q5: 4 points, including a two-part written-answer rubric.
  v_award := 0;
  if abs(public.safe_numeric(p_answers->>'q5_1')-100)<=0.1 then v_award:=v_award+1; end if;
  if abs(public.safe_numeric(p_answers->>'q5_2')-3.02)<=0.01 then v_award:=v_award+1; end if;
  if (v_text like '%หยุด%' or v_text like '%ห้าม%') and (v_text like '%วิศวกร%' or v_text like '%ผู้ออกแบบ%') then v_award:=v_award+1; end if;
  if v_text ~ '(ต่อเข็ม|splice|restrike|re-strike|ทดสอบ|dynamic|pda|static|เจาะสำรวจ|แก้ไขแบบ|เพิ่มเข็ม)' then v_award:=v_award+1; end if;
  v_score := v_score + v_award;
  v_details := v_details || jsonb_build_array(jsonb_build_object(
    'label','ข้อ 5 — เกณฑ์หยุดตอกเสาเข็ม','awarded',v_award,'points',4,
    'status',case when v_award=4 then 'correct' when v_award=0 then 'incorrect' else 'partial' end,
    'user_answer',concat('Blow Count ',p_answers->>'q5_1',', Last 10 ',p_answers->>'q5_2','; ',p_answers->>'q5_3'),
    'explanation','ที่ความยาว 9 ม. ตารางให้ 50 blows/ft และ Last 10 = 6.04 ซม. เกณฑ์ในสไลด์ให้เริ่ม/ควบคุมที่ Blow Count >2 เท่าของรายการคำนวณ (=มากกว่า 100 blows/ft) และหยุดได้เมื่อ Last 10 ไม่เกินครึ่งหนึ่ง (=3.02 ซม.) จำนวน 3 ครั้งติดต่อกัน. หากเข็มจมหมดแล้วยังไม่ผ่าน ต้องหยุดงาน แจ้งผู้ออกแบบ ตรวจข้อมูล/สภาพชั้นดิน และดำเนินมาตรการที่วิศวกรอนุมัติ เช่น restrike/PDA, ต่อเข็ม, ทดสอบเพิ่มเติม หรือแก้แบบ ไม่ควรตัดสินใจตอกหรือเพิ่มเข็มเอง',
    'reference','TEST-01 หน้า 5; Detailing 2026 หน้า 125 (ฐานรากเสาเข็ม Case 1–4)'
  ));

  -- Q6: 1 point
  v_award := case when p_answers->>'q6'='d' then 1 else 0 end; v_score:=v_score+v_award;
  v_details := v_details || jsonb_build_array(jsonb_build_object(
    'label','ข้อ 6 — พื้นโพสต์เทนชั่น','awarded',v_award,'points',1,'status',case when v_award=1 then 'correct' else 'incorrect' end,
    'user_answer',p_answers->>'q6','explanation','ตอบ ง. ถูกทุกข้อ เพราะ tendon profile ต้องได้ Low Point ในช่วงกลางและ High Point เหนือแนวรองรับตามแบบ รวมทั้ง Uniform Tendon ต้องจัดแนว/ระยะให้สม่ำเสมอก่อนเท','reference','TEST-01 หน้า 6; Detailing 2026 หน้า 82–95 (Post-tensioned Flat Slab); ให้ยึด shop drawing/PT layout ที่วิศวกรอนุมัติ'
  ));

  -- Q7: 2 points
  v_award := 0;
  if p_answers->>'q7_1'='a' then v_award:=v_award+1; end if;
  if p_answers->>'q7_2'='a' then v_award:=v_award+1; end if;
  v_score:=v_score+v_award;
  v_details := v_details || jsonb_build_array(jsonb_build_object(
    'label','ข้อ 7 — ระบบนั่งร้านและค้ำยัน','awarded',v_award,'points',2,'status',case when v_award=2 then 'correct' when v_award=0 then 'incorrect' else 'partial' end,
    'user_answer',concat('7.1=',p_answers->>'q7_1',', 7.2=',p_answers->>'q7_2'),
    'explanation','7.1 ตอบ ก: จุดรับแรงอยู่บน/ชิดช่องเปิดโดยไม่มีสมาชิกกระจายแรง ทำให้ฐานสูญเสียเสถียรภาพ. 7.2 ตอบ ก: การยืด Jack Base/U-Head มากเกินค่าที่ผู้ผลิตและแบบค้ำยันรับรองเพิ่ม slenderness และลดกำลังรับแรง; ต้องแก้ตามแบบค้ำยัน ไม่ใช้ตัวเลขทั่วไปโดยเดา',
    'reference','TEST-01 หน้า 7–8; แบบค้ำยันที่วิศวกรอนุมัติ; OSHA 29 CFR 1926.703(a), (b)(5)–(7): ระบบต้องรับแรงได้ ฐานแข็งแรง และ base plates/adjustment screws สัมผัสแน่น'
  ));

  -- Q8: 2 points
  v_award := 0;
  if p_answers->>'q8_1'='c' then v_award:=v_award+1; end if;
  if p_answers->>'q8_2'='b' then v_award:=v_award+1; end if;
  v_score:=v_score+v_award;
  v_details := v_details || jsonb_build_array(jsonb_build_object(
    'label','ข้อ 8 — Concrete Cover','awarded',v_award,'points',2,'status',case when v_award=2 then 'correct' when v_award=0 then 'incorrect' else 'partial' end,
    'user_answer',concat('8.1=',p_answers->>'q8_1',', 8.2=',p_answers->>'q8_2'),
    'explanation','8.1 ตอบ ค 7.5 ซม. สำหรับคอนกรีตหล่อติดดินและสัมผัสดินตลอดเวลา. 8.2 ตอบ ข 4.0 ซม. สำหรับคาน/เสาภายในอาคารตามตารางอบรม',
    'reference','TEST-01 หน้า 9; Detailing 2026 หน้า 28; ACI 318-19 Table 20.5.1.3.1 กำหนด 3 in. (ประมาณ 76 มม.) สำหรับคอนกรีตหล่อติดดินถาวร'
  ));

  -- Q9: 1 point
  v_award := case when p_answers->>'q9'='c' then 1 else 0 end; v_score:=v_score+v_award;
  v_details := v_details || jsonb_build_array(jsonb_build_object(
    'label','ข้อ 9 — ตำแหน่ง Construction Joint','awarded',v_award,'points',1,'status',case when v_award=1 then 'correct' else 'incorrect' end,
    'user_answer',p_answers->>'q9','explanation','ตอบ ค. แนวหยุดเทต้องอยู่บริเวณแรงเฉือนต่ำ: คานและพื้นอยู่ใน middle third; รอยต่อในคานหลักต้องเยื้องจากคานที่มาตัดอย่างน้อย 2 เท่าความกว้างคานที่มาตัด และตำแหน่งเสาต้องเป็นไปตามรายละเอียดในข้อกำหนด/แบบ','reference','TEST-01 หน้า 9; ACI 302.1R-04 ข้อ 3.3.8.1 ซึ่งอ้างข้อกำหนด ACI 318 เรื่อง middle third และระยะเยื้อง 2 เท่าความกว้างคาน'
  ));

  -- Q10: 1 point
  v_award := case when p_answers->>'q10'='b' then 1 else 0 end; v_score:=v_score+v_award;
  v_details := v_details || jsonb_build_array(jsonb_build_object(
    'label','ข้อ 10 — การเตรียมผิว Construction Joint','awarded',v_award,'points',1,'status',case when v_award=1 then 'correct' else 'incorrect' end,
    'user_answer',p_answers->>'q10','explanation','ตอบ ข. ทำผิวหยาบให้มวลรวมหยาบเปิดสม่ำเสมอ กำจัด laitance และชิ้นส่วนหลวม ล้างให้สะอาด แล้วทำผิวให้ชื้นโดยไม่มีน้ำขังก่อนเทใหม่ ทั้งนี้ให้ทำตาม project specification และรายละเอียดถ่ายแรงเฉือนของผู้ออกแบบ','reference','TEST-01 หน้า 10; ACI 318-11 ข้อ 6.4.3 และ 11.6.9 / ACI 318-14 ข้อ 26.4.7; ACI Specification 301 เรื่อง joint preparation'
  ));

  v_duration := greatest(0, floor(extract(epoch from (v_submitted - v_attempt.started_at)))::integer);
  update public.exam_attempts set
    submitted_at=v_submitted, answers=p_answers, score=v_score,
    duration_seconds=v_duration, details=v_details, status='submitted'
  where id=v_attempt.id;

  return jsonb_build_object(
    'score',v_score,
    'max_score',30,
    'duration_seconds',v_duration,
    'submitted_at',v_submitted,
    'details',v_details,
    'post_exam_resources',public.post_exam_resources()
  );
end;
$$;

drop function if exists public.get_leaderboard(text);
create function public.get_leaderboard(p_exam_version text)
returns table (
  full_name text, score numeric, max_score numeric,
  duration_seconds integer, submitted_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select p.full_name, a.score, a.max_score, a.duration_seconds, a.submitted_at
  from public.exam_attempts a
  join public.profiles p on p.id = a.user_id
  where (select auth.uid()) is not null
    and a.exam_version = p_exam_version and a.status = 'submitted'
  order by a.score desc, a.duration_seconds asc, a.submitted_at asc
  limit 100;
$$;

revoke all on function public.start_exam(text) from public, anon;
revoke all on function public.submit_exam(uuid,jsonb) from public, anon;
revoke all on function public.get_leaderboard(text) from public, anon;
grant execute on function public.start_exam(text) to authenticated;
grant execute on function public.submit_exam(uuid,jsonb) to authenticated;
grant execute on function public.get_leaderboard(text) to authenticated;
