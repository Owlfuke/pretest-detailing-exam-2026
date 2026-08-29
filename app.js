const config = window.APP_CONFIG || {};
const app = document.querySelector("#app");
const authDialog = document.querySelector("#auth-dialog");
const authForm = document.querySelector("#auth-form");
const authButton = document.querySelector("#auth-button");
const userChip = document.querySelector("#user-chip");
const toast = document.querySelector("#toast");

const state = {
  route: "home",
  session: JSON.parse(localStorage.getItem("rc-session") || "null"),
  attempt: JSON.parse(sessionStorage.getItem("rc-attempt") || "null"),
  timerHandle: null,
  result: JSON.parse(sessionStorage.getItem("rc-result") || "null"),
};

const questions = [
  {
    id: "q1", number: "1", title: "คำนวณค่าการเยื้องศูนย์ของฐานราก F5 ในแกน X และ Y พร้อมพิจารณาการผ่านเกณฑ์และการขยายฐานราก",
    image: "assets/questions/q1-pile-offset.png", alt: "ผังตำแหน่งเสาเข็ม F5 ตารางระยะคลาดเคลื่อนแกน X และ Y",
    help: "กรอกค่าเป็นเซนติเมตร ใช้เครื่องหมายบวกหรือลบตามผลคำนวณ บนโทรศัพท์ให้กรอกตัวเลขแล้วแตะปุ่ม +/− เพื่อสลับเครื่องหมาย",
    fields: [
      { name: "q1_x", label: "ค่าการเยื้องศูนย์แกน X (ซม.)", type: "number", step: "0.01", signed: true },
      { name: "q1_y", label: "ค่าการเยื้องศูนย์แกน Y (ซม.)", type: "number", step: "0.01", signed: true },
      { name: "q1_pass", label: "สรุปผลการตรวจสอบ", type: "select", options: [["pass","ผ่าน"],["fail","ไม่ผ่าน"]] },
      { name: "q1_expand", label: "ต้องขยายฐานรากหรือไม่", type: "select", options: [["yes","ต้องขยาย"],["no","ไม่ต้องขยาย"]] },
    ], columns: 2,
  },
  {
    id: "q2", number: "2", title: "เลือกข้อกำหนดคอนกรีตให้ตรงกับประเภทงานและกำลังอัดที่กำหนด",
    image: "assets/questions/q2-concrete-spec.png", alt: "ตาราง General Concrete Specification ของ RITTA",
    fields: [
      { name: "q2_1_wc", label: "2.1 คาน fc′ 280 ksc — W/C สูงสุด", type: "number", step: "0.01" },
      { name: "q2_1_water", label: "2.1 ปริมาณน้ำสูงสุด (ลิตร)", type: "number", step: "1" },
      { name: "q2_1_slump", label: "2.1 Slump ค่ากลาง (ซม.)", type: "number", step: "0.1" },
      { name: "q2_2_wc", label: "2.2 PTS fc′ 320 ksc — W/C สูงสุด", type: "number", step: "0.01" },
      { name: "q2_2_water", label: "2.2 ปริมาณน้ำสูงสุด (ลิตร)", type: "number", step: "1" },
      { name: "q2_2_slump", label: "2.2 Slump ค่ากลาง (ซม.)", type: "number", step: "0.1" },
    ], columns: 3,
  },
  {
    id: "q3", number: "3", title: "ระบุจำนวนวันขั้นต่ำที่เริ่มรื้อไม้แบบได้หลังเทคอนกรีต",
    help: "กรอกจำนวนวันเต็มตามข้อกำหนดในเอกสารอบรม",
    fields: [
      { name: "q3_1", label: "3.1 แบบข้างฐานราก", type: "number" },
      { name: "q3_2", label: "3.2 แบบข้างเสา", type: "number" },
      { name: "q3_3", label: "3.3 แบบข้างคาน", type: "number" },
      { name: "q3_4", label: "3.4 แบบท้องคาน (ช่วงไม่เกิน 6 ม.)", type: "number" },
      { name: "q3_5", label: "3.5 แบบท้องพื้น", type: "number" },
    ], columns: 3,
  },
  {
    id: "q4", number: "4", title: "คำนวณความยาวเหล็กเสริมตำแหน่ง L1, L2 และ L3 สำหรับ DB12, fc′ 280 ksc",
    images: [
      ["assets/questions/q4-beam-detail.png", "แบบขยายคานต่อเนื่องและตารางระยะฝังเหล็ก"],
      ["assets/questions/q4-standard-hook.png", "ตารางขนาดของอมาตรฐาน 90 และ 180 องศา"],
    ],
    fields: [
      { name: "q4_1", label: "4.1 ระยะฝังตรงก่อนดัด 90° ของ L1 (ซม.)", type: "number", step: "0.1" },
      { name: "q4_2", label: "4.2 ระยะงอขอปลายเหล็กบน L1 (ซม.)", type: "number", step: "0.1" },
      { name: "q4_3", label: "4.3 ความยาวเหล็กพิเศษบน L2 (ซม.)", type: "number", step: "0.1" },
      { name: "q4_4", label: "4.4 ความยาวเหล็กพิเศษล่าง L3 (ซม.)", type: "number", step: "0.1" },
    ], columns: 2,
  },
  {
    id: "q5", number: "5", title: "กำหนดเกณฑ์ควบคุมการตอกเสาเข็ม 0.40 × 0.40 ม. ยาว 9 ม. กำลังรับน้ำหนัก 63 ตัน/ต้น",
    image: "assets/questions/q5-pile-driving.png", alt: "ตาราง Danish formula, Blow Count และ Last 10 Blows",
    fields: [
      { name: "q5_1", label: "5.1 Blow Count ต้องมากกว่า (ครั้ง/ฟุต)", type: "number", step: "1" },
      { name: "q5_2", label: "5.2 Last 10 Blows ต้องไม่เกิน (ซม.)", type: "number", step: "0.01" },
      { name: "q5_3", label: "5.3 หากเสาเข็มจมหมดแล้วยังไม่ผ่านเกณฑ์ จะดำเนินการอย่างไร", type: "textarea", minlength: 20 },
    ], columns: 2,
  },
  {
    id: "q6", number: "6", title: "จากภาพจัดระเบียบและผูกเหล็กพื้นโพสต์เทนชั่น ต้องสั่งตรวจสอบและแก้ไขข้อใดก่อนอนุมัติเทคอนกรีต",
    image: "assets/questions/q6-pt-slab.png", alt: "ภาพหน้างานติดตั้งลวดอัดแรงพื้นโพสต์เทนชั่น",
    choices: [
      ["a","ก. ระดับลวดบริเวณกลางช่วงไม่เท่ากัน"],
      ["b","ข. ลวดเหนือหัวเสาจมลงแทนที่จะเป็น High Point"],
      ["c","ค. ระยะห่าง Uniform Tendon ไม่เท่ากัน"],
      ["d","ง. ถูกทุกข้อ"],
    ],
  },
  {
    id: "q7_1", number: "7.1", title: "จุดบกพร่องร้ายแรงที่สุดของระบบนั่งร้านในภาพคือข้อใด",
    image: "assets/questions/q7-shore-void.png", alt: "เสาค้ำยันตั้งชิดและภายในช่องเปิดพื้น",
    choices: [
      ["a","ก. ฐานเสาค้ำยันอยู่บนขอบ/ช่องเปิดโดยไม่มีคานรองรับกระจายน้ำหนัก"],
      ["b","ข. ถูกต้องตามมาตรฐาน เทคอนกรีตได้ทันที"],
      ["c","ค. พื้นคอนกรีตไม่เรียบ"],
      ["d","ง. ฐานเสาค้ำยันไม่ได้เจาะยึดกับพื้น"],
    ],
  },
  {
    id: "q7_2", number: "7.2", title: "จุดบกพร่องร้ายแรงที่สุดของระบบนั่งร้านสองภาพนี้คือข้อใด",
    image: "assets/questions/q7-jack-extension.png", alt: "ระบบนั่งร้านและ Jack Base ที่ยืดเกลียวยาวมาก",
    choices: [
      ["a","ก. Jack Base และ U-Head ยืดสูงเกินระยะที่ระบบ/แบบรับรอง"],
      ["b","ข. Base Plate ไม่ได้ยึดพุกกับพื้น"],
      ["c","ค. Base Plate บางกว่ามาตรฐาน มอก."],
      ["d","ง. ถูกต้องตามมาตรฐาน เทคอนกรีตได้ทันที"],
    ],
  },
  {
    id: "q8_1", number: "8.1", title: "Concrete Cover ขั้นต่ำของฐานรากที่หล่อติดดินและสัมผัสดินตลอดเวลา",
    choices: [["a","ก. 4.0 ซม."],["b","ข. 5.0 ซม."],["c","ค. 7.5 ซม."],["d","ง. 10.0 ซม."]],
  },
  {
    id: "q8_2", number: "8.2", title: "Concrete Cover ขั้นต่ำของเสาเหนือพื้นดินภายในอาคาร",
    choices: [["a","ก. 2.5 ซม."],["b","ข. 4.0 ซม."],["c","ค. 5.0 ซม."],["d","ง. 7.5 ซม."]],
  },
  {
    id: "q9", number: "9", title: "เลือกข้อกำหนดแนวหยุดเทของเสา พื้น คานหลัก และคานรองที่ถูกต้องที่สุด",
    choices: [
      ["a","ก. เสาหยุดกึ่งกลางความสูง; คานหยุด 1/4 ช่วง; พื้นหยุดขอบเสา"],
      ["b","ข. เสาหยุดใต้ท้องคานพอดี; คาน/พื้นหยุด 1/3–1/2; คานรองห่าง 2 เท่าความกว้างคานหลัก"],
      ["c","ค. เสาหยุดไม่เกิน 75 มม. ใต้ท้องคาน; คาน/พื้นหยุดใน Middle Third; รอยต่อคานรองห่างคานหลักอย่างน้อย 2 เท่าความกว้างคานรอง"],
      ["d","ง. หยุดเทจุดใดก็ได้ตามความสะดวก"],
    ],
  },
  {
    id: "q10", number: "10", title: "เลือกขั้นตอนเตรียมผิว Construction Joint ก่อนเทคอนกรีตต่อที่ถูกต้องที่สุด",
    choices: [
      ["a","ก. ขัดมันให้เรียบและไม่ล้างน้ำ"],
      ["b","ข. ทำผิวหยาบเห็นเม็ดหิน กำจัดฝ้าน้ำปูน/เศษหลุด ล้างสะอาด และทำให้ชื้นโดยไม่เปียกโชก"],
      ["c","ค. ล้างเฉพาะขยะ ปล่อยฝ้าน้ำปูนและขังน้ำไว้"],
      ["d","ง. เททับได้ทันทีโดยไม่เตรียมผิว"],
    ],
  },
];

const api = {
  headers(withAuth = true) {
    const headers = { apikey: config.supabaseKey, "Content-Type": "application/json" };
    if (withAuth && state.session?.access_token) headers.Authorization = `Bearer ${state.session.access_token}`;
    return headers;
  },
  async request(path, options = {}) {
    if (!config.supabaseUrl) throw new Error("ยังไม่ได้ตั้งค่า Supabase");
    const { auth = true, retrying = false, ...fetchOptions } = options;
    const response = await fetch(`${config.supabaseUrl}${path}`, { ...fetchOptions, headers: { ...this.headers(auth), ...(fetchOptions.headers || {}) } });
    if (response.status === 401 && auth && !retrying && state.session?.refresh_token) {
      await this.refreshSession();
      return this.request(path, { ...options, retrying: true });
    }
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || "ระบบไม่สามารถทำรายการได้");
    return data;
  },
  async refreshSession() {
    const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST", headers: this.headers(false), body: JSON.stringify({ refresh_token: state.session.refresh_token }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) { logout(); throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง"); }
    state.session = data;
    localStorage.setItem("rc-session", JSON.stringify(data));
  },
  signInAnonymously(fullName) { return this.request("/auth/v1/signup", { method: "POST", body: JSON.stringify({ data: { full_name: fullName } }), auth: false }); },
  rpc(name, body = {}) { return this.request(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(body) }); },
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function formatDuration(totalSeconds = 0) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours ? `${hours}:${String(minutes).padStart(2,"0")}:${String(remaining).padStart(2,"0")}` : `${minutes}:${String(remaining).padStart(2,"0")}`;
}

function userName() {
  return state.session?.user?.user_metadata?.full_name || "ผู้เข้าสอบ";
}

function updateHeader() {
  const signedIn = Boolean(state.session?.user);
  userChip.classList.toggle("hidden", !signedIn);
  userChip.textContent = signedIn ? userName() : "";
  authButton.textContent = signedIn ? "เปลี่ยนผู้สอบ" : "กรอกชื่อ";
  document.querySelectorAll(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.route === state.route));
}

function go(route) {
  if (state.timerHandle) window.clearInterval(state.timerHandle);
  state.timerHandle = null;
  state.route = route;
  location.hash = route;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderHome() {
  const resume = state.attempt && !state.result;
  const startLabel = state.result ? "ดูผลสอบย้อนหลัง" : (resume ? "ทำข้อสอบต่อ" : "เริ่มทำข้อสอบ");
  app.innerHTML = `
    <section class="hero"><div class="container hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">ENGINEER / FOREMAN · 2026</p>
        <h1>แบบทดสอบ<br><span>RC DETAILING</span></h1>
        <p>ทดสอบการอ่านแบบ การควบคุมคอนกรีต เหล็กเสริม ฐานราก เสาเข็ม พื้นโพสต์เทนชั่น และความปลอดภัยงานค้ำยัน พร้อมเฉลยเชิงเหตุผลหลังส่งคำตอบ</p>
        <div class="hero-actions">
          <button class="button button-primary" id="start-button">${startLabel}</button>
          <button class="button button-dark" data-go="leaderboard">ดู Score Board</button>
        </div>
      </div>
      <aside class="hero-card">
        <h2>TEST–01 / FIELD KNOWLEDGE</h2>
        <div class="stat-list">
          <div class="stat"><span>หัวข้อหลัก</span><strong>10</strong></div>
          <div class="stat"><span>คะแนนเต็ม</span><strong>30</strong></div>
          <div class="stat"><span>รูปประกอบจากโจทย์</span><strong>8</strong></div>
          <div class="stat"><span>จำนวนครั้งที่ส่งได้</span><strong>1</strong></div>
        </div>
      </aside>
    </div></section>
    <section class="section"><div class="container">
      <div class="section-title"><h2>วิธีทำข้อสอบ</h2><p>คำตอบจะยังไม่ถูกตรวจระหว่างทำ ต้องตอบให้ครบและกดส่งครั้งเดียว จากนั้นระบบจึงแสดงคะแนนและเฉลยทั้งหมด</p></div>
      <div class="feature-grid">
        <article class="feature-card"><span class="feature-index">01 / NAME</span><h3>กรอกชื่อผู้เข้าสอบ</h3><p>ใช้เพียงชื่อ–นามสกุล ไม่ต้องใช้อีเมลหรือรหัสผ่าน หากเคยส่งข้อสอบแล้ว ระบบจะเปิดผลและเอกสารหลังสอบย้อนหลังให้ทันที</p></article>
        <article class="feature-card"><span class="feature-index">02 / COMPLETE</span><h3>ทำให้ครบก่อนส่ง</h3><p>มีทั้งช่องตัวเลข ข้อเขียน และตัวเลือก ระบบบันทึกเวลาเริ่มจากฝั่งเซิร์ฟเวอร์</p></article>
        <article class="feature-card"><span class="feature-index">03 / REVIEW</span><h3>เฉลยพร้อมหลักฐาน</h3><p>ดูวิธีคิด หน้าเอกสารอ้างอิง และข้อกำหนดมาตรฐานหลังส่งคำตอบแล้วเท่านั้น</p></article>
      </div>
      ${config.demoMode ? '<div class="notice"><strong>โหมดสาธิต:</strong> ระบบยังไม่เชื่อมฐานข้อมูล คะแนนและการลงชื่อในโหมดนี้ไม่ใช่ข้อมูลจริง โปรดตั้งค่า Supabase ก่อนใช้งานสอบจริง</div>' : ''}
    </div></section>`;
  document.querySelector("#start-button").addEventListener("click", startExam);
  document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => go(button.dataset.go)));
}

function fieldHtml(field) {
  if (field.type === "select") {
    return `<label>${escapeHtml(field.label)}<select name="${field.name}" required><option value="">— เลือกคำตอบ —</option>${field.options.map(([v,l]) => `<option value="${v}">${escapeHtml(l)}</option>`).join("")}</select></label>`;
  }
  if (field.type === "textarea") {
    return `<label style="grid-column:1/-1">${escapeHtml(field.label)}<textarea name="${field.name}" minlength="${field.minlength || 1}" required placeholder="อธิบายลำดับการทำงาน เหตุผล และผู้ที่ต้องประสานงาน"></textarea></label>`;
  }
  const input = `<input name="${field.name}" type="number" step="${field.step || 1}" required inputmode="decimal" />`;
  if (field.signed) {
    return `<label>${escapeHtml(field.label)}<span class="signed-number-control">${input}<button class="sign-toggle" type="button" data-sign-target="${field.name}" aria-label="สลับค่าบวกหรือลบของ ${escapeHtml(field.label)}" aria-pressed="false">+/−</button></span></label>`;
  }
  return `<label>${escapeHtml(field.label)}${input}</label>`;
}

function setupSignedInputs(form) {
  form.querySelectorAll("[data-sign-target]").forEach((button) => {
    const input = form.elements[button.dataset.signTarget];
    if (!input) return;

    const sync = () => {
      const negative = String(input.value).startsWith("-");
      button.disabled = input.value === "";
      button.classList.toggle("negative", negative);
      button.setAttribute("aria-pressed", String(negative));
      button.title = negative ? "ค่าปัจจุบันเป็นลบ" : "ค่าปัจจุบันเป็นบวก";
    };

    button.addEventListener("click", () => {
      const value = input.value.trim();
      if (!value) return;
      input.value = value.startsWith("-") ? value.slice(1) : `-${value}`;
      sync();
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    });
    input.addEventListener("input", sync);
    sync();
  });
}

function questionHtml(question) {
  const media = question.image
    ? `<img class="question-image" src="${question.image}" alt="${escapeHtml(question.alt)}" loading="lazy" />`
    : (question.images || []).map(([src, alt]) => `<img class="question-image" src="${src}" alt="${escapeHtml(alt)}" loading="lazy" />`).join("");
  const answers = question.fields
    ? `<div class="answer-fields field-grid ${question.columns === 3 ? "three" : "two"}">${question.fields.map(fieldHtml).join("")}</div>`
    : `<div class="choice-list">${question.choices.map(([value, label]) => `<label class="choice"><input type="radio" name="${question.id}" value="${value}" required /><span>${escapeHtml(label)}</span></label>`).join("")}</div>`;
  return `<article class="question-card" id="question-${question.id}" data-question="${question.id}">
    <div class="question-head"><span class="question-number">${question.number}</span><h2>${escapeHtml(question.title)}</h2></div>
    ${question.help ? `<p class="question-help">${escapeHtml(question.help)}</p>` : ""}${media}${answers}
  </article>`;
}

function renderExam() {
  if (!state.session?.user) return go("home");
  if (state.result) return go("results");
  app.innerHTML = `
    <section class="page-head"><div class="container"><p class="eyebrow">TEST–01 / ${escapeHtml(config.examVersion)}</p><h1>แบบทดสอบความรู้หน้างาน</h1><p>ตอบทุกข้อให้ครบก่อนกดส่ง ระบบจะไม่แสดงว่าข้อใดถูกหรือผิดระหว่างทำ</p></div></section>
    <div class="exam-toolbar"><div class="container"><div><span class="progress-text">เวลาที่ใช้</span><div class="timer" id="timer">0:00</div></div><div class="progress-text" id="progress">ตอบแล้ว 0 / ${questions.length} หัวข้อ</div></div></div>
    <form id="exam-form" class="container exam-layout">
      <section class="question-stack">${questions.map(questionHtml).join("")}</section>
      <aside class="exam-sidebar"><h3>ตรวจความครบถ้วน</h3><div class="question-nav">${questions.map((q, i) => `<button type="button" data-target="${q.id}" aria-label="ไปข้อ ${q.number}">${i + 1}</button>`).join("")}</div><p class="sidebar-note">ปุ่มสีเขียวหมายถึงหัวข้อนั้นตอบครบทุกช่องแล้ว</p><button class="button button-primary exam-submit" type="submit">ส่งคำตอบ</button></aside>
    </form>`;
  const form = document.querySelector("#exam-form");
  restoreDraft(form);
  setupSignedInputs(form);
  form.addEventListener("input", () => { saveDraft(form); updateProgress(form); });
  form.addEventListener("submit", submitExam);
  document.querySelectorAll("[data-target]").forEach((button) => button.addEventListener("click", () => document.querySelector(`#question-${button.dataset.target}`).scrollIntoView({ behavior: "smooth" })));
  updateProgress(form);
  updateTimer();
  state.timerHandle = window.setInterval(updateTimer, 1000);
}

function questionAnswered(form, question) {
  if (question.fields) return question.fields.every((field) => String(new FormData(form).get(field.name) || "").trim().length >= (field.minlength || 1));
  return Boolean(new FormData(form).get(question.id));
}

function updateProgress(form) {
  let answered = 0;
  questions.forEach((question, index) => {
    const complete = questionAnswered(form, question);
    answered += complete ? 1 : 0;
    document.querySelectorAll(".question-nav button")[index]?.classList.toggle("answered", complete);
  });
  document.querySelector("#progress").textContent = `ตอบแล้ว ${answered} / ${questions.length} หัวข้อ`;
}

function saveDraft(form) {
  const answers = Object.fromEntries(new FormData(form).entries());
  sessionStorage.setItem("rc-draft", JSON.stringify(answers));
}

function restoreDraft(form) {
  const draft = JSON.parse(sessionStorage.getItem("rc-draft") || "null");
  if (!draft) return;
  Object.entries(draft).forEach(([name, value]) => {
    const elements = form.elements[name];
    if (!elements) return;
    if (elements instanceof RadioNodeList) {
      [...elements].forEach((element) => { element.checked = element.value === value; });
    } else elements.value = value;
  });
}

function updateTimer() {
  const started = new Date(state.attempt?.started_at || Date.now()).getTime();
  const seconds = Math.floor((Date.now() - started) / 1000);
  const timer = document.querySelector("#timer");
  if (timer) timer.textContent = formatDuration(seconds);
}

async function startExam() {
  if (!state.session?.user) { openAuth(); return; }
  if (state.result && !state.result.demo) { go("results"); return; }
  try {
    if (!state.attempt) {
      state.attempt = config.demoMode
        ? { attempt_id: crypto.randomUUID(), started_at: new Date().toISOString() }
        : await api.rpc("start_exam", { p_exam_version: config.examVersion });
      if (Array.isArray(state.attempt)) state.attempt = state.attempt[0];
      if (state.attempt?.status === "submitted" && state.attempt.result) {
        state.result = state.attempt.result;
        state.attempt = null;
        sessionStorage.setItem("rc-result", JSON.stringify(state.result));
        sessionStorage.removeItem("rc-attempt");
        go("results");
        return;
      }
      sessionStorage.setItem("rc-attempt", JSON.stringify(state.attempt));
    }
    go("exam");
  } catch (error) { showToast(error.message); }
}

async function submitExam(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  if (!window.confirm("ส่งคำตอบตอนนี้? หลังส่งแล้วจะไม่สามารถแก้ไขหรือส่งซ้ำได้")) return;
  const submitButton = form.querySelector("[type=submit]");
  submitButton.disabled = true;
  submitButton.textContent = "กำลังตรวจคำตอบ…";
  const answers = Object.fromEntries(new FormData(form).entries());
  try {
    let result;
    if (config.demoMode) {
      const seconds = Math.floor((Date.now() - new Date(state.attempt.started_at).getTime()) / 1000);
      result = { score: 0, max_score: 30, duration_seconds: seconds, submitted_at: new Date().toISOString(), demo: true, details: [] };
    } else {
      result = await api.rpc("submit_exam", { p_attempt_id: state.attempt.attempt_id, p_answers: answers });
      if (Array.isArray(result)) result = result[0];
    }
    state.result = result;
    sessionStorage.setItem("rc-result", JSON.stringify(result));
    sessionStorage.removeItem("rc-draft");
    go("results");
  } catch (error) {
    showToast(error.message);
    submitButton.disabled = false;
    submitButton.textContent = "ส่งคำตอบ";
  }
}

function renderResults() {
  if (!state.result) return go("home");
  const result = state.result;
  const recovered = Boolean(result.recovered);
  const resultTitle = recovered ? "ผลสอบย้อนหลัง" : "ส่งคำตอบเรียบร้อย";
  const resultSummary = recovered
    ? `ส่งเมื่อ ${new Date(result.submitted_at).toLocaleString("th-TH")} · ใช้เวลา ${formatDuration(result.duration_seconds)}`
    : `ใช้เวลา ${formatDuration(result.duration_seconds)} · บันทึกผลแล้วและไม่สามารถแก้ไขคำตอบได้`;
  const postExamResources = (result.post_exam_resources || []).map((resource, index) => `
    <a class="lecture-card" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">
      <span class="lecture-index">RESOURCE ${String(index + 1).padStart(2, "0")}</span>
      <strong>${escapeHtml(resource.label)}</strong>
      <span>เปิดดูหลังสอบ ↗</span>
    </a>`).join("");
  const detailCards = (result.details || []).map((item) => `
    <article class="result-card ${item.status || (item.awarded === item.points ? "correct" : "incorrect")}">
      <div class="result-meta"><h3>${escapeHtml(item.label)}</h3><strong>${item.awarded}/${item.points} คะแนน</strong></div>
      <p><strong>คำตอบของคุณ:</strong> ${escapeHtml(item.user_answer || "—")}</p>
      <div class="answer-box"><strong>คำตอบและเหตุผล</strong><p>${escapeHtml(item.explanation)}</p></div>
      <p class="reference"><strong>อ้างอิง:</strong> ${escapeHtml(item.reference)}</p>
    </article>`).join("");
  app.innerHTML = `
    <section class="result-hero"><div class="container result-summary"><div><p class="eyebrow">${recovered ? "PREVIOUS RESULT" : "SUBMITTED"}</p><h1>${resultTitle}</h1><p>${resultSummary}</p></div><div class="result-score">${result.score}<small> / ${result.max_score}</small></div></div></section>
    <section class="container">
      ${result.demo ? '<div class="notice"><strong>โหมดสาธิต:</strong> ยังไม่ตรวจคะแนนจริง กรุณาติดตั้งฐานข้อมูลตาม README แล้วปิด demoMode</div>' : ''}
      ${postExamResources ? `<section class="post-exam-resources"><p class="eyebrow">UNLOCKED AFTER SUBMISSION</p><div class="section-title"><h2>เอกสารและวิดีโอหลังสอบ</h2><p>ลิงก์ส่วนนี้ปลดล็อกหลังส่งคำตอบสำเร็จและไม่ถูกส่งมายัง browser ก่อนสอบเสร็จ</p></div><div class="lecture-grid">${postExamResources}</div></section>` : ''}
      <div class="result-list">${detailCards || '<div class="empty-state">โหมดสาธิตไม่เปิดเผยเฉลยและไม่บันทึก Score Board</div>'}</div>
    </section>`;
}

async function renderLeaderboard() {
  app.innerHTML = `<section class="page-head"><div class="container"><p class="eyebrow">RANKING / VERIFIED TIME</p><h1>Score Board</h1><p>เรียงคะแนนจากมากไปน้อย และใช้เวลาน้อยกว่าเป็นลำดับถัดไปเมื่อคะแนนเท่ากัน</p></div></section><section class="section"><div class="container" id="leaderboard-content"><div class="empty-state">กำลังโหลดผลคะแนน…</div></div></section>`;
  const target = document.querySelector("#leaderboard-content");
  if (config.demoMode) { target.innerHTML = '<div class="empty-state"><h2>ยังไม่มีคะแนนจริง</h2><p>Score Board จะเริ่มทำงานเมื่อเชื่อม Supabase และปิดโหมดสาธิต</p></div>'; return; }
  if (!state.session?.user) {
    target.innerHTML = '<div class="empty-state"><h2>กรอกชื่อก่อนดู Score Board</h2><p>ระบบใช้ชื่อเพื่อแยกผู้เข้าสอบแต่ละคน</p><button class="button button-primary" id="leaderboard-signin">กรอกชื่อ</button></div>';
    document.querySelector("#leaderboard-signin").addEventListener("click", openAuth);
    return;
  }
  try {
    const rows = await api.rpc("get_leaderboard", { p_exam_version: config.examVersion });
    if (!rows?.length) { target.innerHTML = '<div class="empty-state">ยังไม่มีผู้ส่งคำตอบ</div>'; return; }
    target.innerHTML = `<div class="table-wrap"><table><thead><tr><th>อันดับ</th><th>ชื่อ–นามสกุล</th><th>คะแนน</th><th>เวลา</th><th>วันที่ส่ง</th></tr></thead><tbody>${rows.map((row, index) => `<tr><td class="rank">${index + 1}</td><td>${escapeHtml(row.full_name)}</td><td><span class="score-pill">${row.score}/${row.max_score}</span></td><td>${formatDuration(row.duration_seconds)}</td><td>${new Date(row.submitted_at).toLocaleString("th-TH")}</td></tr>`).join("")}</tbody></table></div>`;
  } catch (error) { target.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; }
}

function renderResources() {
  const resources = config.resources || [];
  app.innerHTML = `<section class="page-head"><div class="container"><p class="eyebrow">LECTURE / REFERENCES</p><h1>เอกสารประกอบ</h1><p>ลิงก์สำหรับทบทวนก่อนเริ่มสอบ ผู้ดูแลกำหนดได้จากไฟล์ config.js</p></div></section><section class="section"><div class="container"><div class="resource-grid">${resources.map((resource) => `<article class="resource-card ${resource.url ? "" : "disabled"}"><h3>${escapeHtml(resource.label)}</h3><p>${escapeHtml(resource.note || "")}</p>${resource.url ? `<a class="button" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">เปิดเอกสาร</a>` : '<button class="button" disabled>ยังไม่ได้ใส่ลิงก์</button>'}</article>`).join("")}</div><div class="notice"><strong>ข้อกำหนดการใช้งาน:</strong> ควรใส่เฉพาะลิงก์ที่ผู้จัดอบรมมีสิทธิ์เผยแพร่ และกำหนดให้เปิดก่อนเริ่มสอบหากต้องการใช้ข้อสอบแบบปิดเอกสาร</div></div></section>`;
}

function openAuth() { authDialog.showModal(); }

async function handleAuth(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(authForm).entries());
  const message = document.querySelector("#auth-message");
  const button = authForm.querySelector("[type=submit]");
  message.textContent = "";
  button.disabled = true;
  try {
    const fullName = data.full_name.trim();
    if (config.demoMode) {
      state.session = { access_token: "demo", user: { id: crypto.randomUUID(), is_anonymous: true, user_metadata: { full_name: fullName } } };
    } else if (!state.session?.user) {
      state.session = await api.signInAnonymously(fullName);
    }
    localStorage.setItem("rc-session", JSON.stringify(state.session));

    if (!config.demoMode) {
      let previousResult = await api.rpc("get_previous_result_by_name", {
        p_exam_version: config.examVersion,
        p_full_name: userName(),
      });
      if (Array.isArray(previousResult)) previousResult = previousResult[0];
      if (previousResult) {
        state.result = previousResult;
        state.attempt = null;
        sessionStorage.setItem("rc-result", JSON.stringify(previousResult));
        sessionStorage.removeItem("rc-attempt");
        sessionStorage.removeItem("rc-draft");
        authDialog.close(); authForm.reset();
        showToast(`พบผลสอบเดิมของ ${userName()}`);
        go("results");
        return;
      }
    }

    authDialog.close(); authForm.reset(); render(); showToast(`ยินดีต้อนรับ ${userName()}`);
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
}

function logout() {
  localStorage.removeItem("rc-session");
  sessionStorage.removeItem("rc-attempt");
  sessionStorage.removeItem("rc-draft");
  sessionStorage.removeItem("rc-result");
  state.session = state.attempt = state.result = null;
  updateHeader(); go("home"); showToast("ออกจากระบบแล้ว");
}

function render() {
  updateHeader();
  if (state.route === "exam") renderExam();
  else if (state.route === "results") renderResults();
  else if (state.route === "leaderboard") renderLeaderboard();
  else if (state.route === "resources") renderResources();
  else renderHome();
  app.focus({ preventScroll: true });
}

authButton.addEventListener("click", () => state.session?.user ? logout() : openAuth());
authForm.addEventListener("submit", handleAuth);
document.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => go(button.dataset.route)));
window.addEventListener("hashchange", () => { state.route = location.hash.slice(1) || "home"; render(); });

state.route = location.hash.slice(1) || (state.result ? "results" : "home");
render();
