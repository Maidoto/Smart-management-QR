const STORAGE_KEY = "smartManagementCertificates";
const LOCAL_TEACHER_PASSWORD = "teacher2026";
const API_URL = "api.php";

const starterCertificates = [
  {
    id: "SM-2026-0001",
    fullName: "Диана Маннанова",
    courseTopic: "Аудитор СМК по ISO 9001",
    courseDate: "01-05.01.2026",
    validUntil: "01.01.2029",
  },
];

const lookupForm = document.querySelector("#lookupForm");
const teacherSection = document.querySelector("#teacher");
const teacherLoginForm = document.querySelector("#teacherLoginForm");
const teacherPanel = document.querySelector("#teacherPanel");
const loginMessage = document.querySelector("#loginMessage");
const logoutButton = document.querySelector("#logoutButton");
const form = document.querySelector("#certificateForm");
const registryList = document.querySelector("#registryList");
const registrySearch = document.querySelector("#registrySearch");
const publicLink = document.querySelector("#publicLink");
const printCertificate = document.querySelector("#printCertificate");
const certificateQr = document.querySelector("#certificateQr");
let certificatesState = [];
let apiMode = false;
let teacherAuthenticated = false;

function loadLocalCertificates() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(starterCertificates));
    return [...starterCertificates];
  }

  try {
    return JSON.parse(saved);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(starterCertificates));
    return [...starterCertificates];
  }
}

function saveLocalCertificates(certificates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(certificates));
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { Accept: "application/json", ...(options.headers ?? {}) },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Ошибка запроса.");
  }

  return payload;
}

async function checkApiSession() {
  if (window.location.protocol === "file:") {
    certificatesState = loadLocalCertificates();
    return;
  }

  try {
    const session = await apiRequest(`${API_URL}?action=session`);
    apiMode = true;
    teacherAuthenticated = Boolean(session.authenticated);
    if (teacherAuthenticated) {
      await loadTeacherCertificates();
      if (window.location.hash === "#teacher") {
        showTeacherPanel();
      }
    }
  } catch {
    apiMode = false;
    certificatesState = loadLocalCertificates();
  }
}

async function loadTeacherCertificates() {
  if (apiMode) {
    certificatesState = await apiRequest(`${API_URL}?action=list`);
    return certificatesState;
  }

  certificatesState = loadLocalCertificates();
  return certificatesState;
}

async function findCertificate(id) {
  if (apiMode) {
    return apiRequest(`${API_URL}?id=${encodeURIComponent(id)}`);
  }

  const certificates = loadLocalCertificates();
  return certificates.find((item) => item.id === id) ?? null;
}

async function createCertificate(certificate) {
  if (apiMode) {
    const savedCertificate = await apiRequest(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...certificate }),
    });
    certificatesState.push(savedCertificate);
    return savedCertificate;
  }

  certificatesState.push(certificate);
  saveLocalCertificates(certificatesState);
  return certificate;
}

async function loginTeacher(password) {
  if (apiMode) {
    await apiRequest(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", password }),
    });
  } else if (password !== LOCAL_TEACHER_PASSWORD) {
    throw new Error("Неверный пароль.");
  }

  teacherAuthenticated = true;
  await loadTeacherCertificates();
  showTeacherPanel();
}

async function logoutTeacher() {
  if (apiMode) {
    await apiRequest(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
  }

  teacherAuthenticated = false;
  teacherPanel.hidden = true;
  teacherLoginForm.hidden = false;
  certificatesState = [];
}

function showTeacherPanel() {
  teacherSection.hidden = false;
  teacherLoginForm.hidden = true;
  teacherPanel.hidden = false;
  loginMessage.textContent = "";
  renderCertificate(certificatesState[certificatesState.length - 1] ?? starterCertificates[0]);
  renderRegistry();
}

function syncTeacherSectionVisibility() {
  if (window.location.hash === "#teacher") {
    teacherSection.hidden = false;
    if (teacherAuthenticated && certificatesState.length) {
      showTeacherPanel();
    }
    return;
  }

  teacherSection.hidden = true;
}

function makeCertificateId() {
  const year = new Date().getFullYear();
  const number = String(certificatesState.length + 1).padStart(4, "0");
  return `SM-${year}-${number}`;
}

function getCertificateUrl(id) {
  const cleanUrl = window.location.href.split("#")[0];
  return `${cleanUrl}#certificate/${encodeURIComponent(id)}`;
}

function getQrImageUrl(url) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
}

function setText(id, value) {
  document.querySelector(id).textContent = value;
}

function renderCertificate(certificate) {
  const certificateUrl = getCertificateUrl(certificate.id);

  setText("#certificateName", certificate.fullName);
  setText("#certificateCourse", certificate.courseTopic);
  setText("#certificateDate", certificate.courseDate);
  setText("#certificateValidUntil", certificate.validUntil);
  setText("#certificateNumber", certificate.id);
  publicLink.href = `#certificate/${encodeURIComponent(certificate.id)}`;

  if (certificateQr) {
    certificateQr.src = getQrImageUrl(certificateUrl);
    certificateQr.alt = `QR для проверки сертификата ${certificate.id}`;
  }
}

function waitForCertificateQr() {
  if (!certificateQr || !certificateQr.src || certificateQr.complete) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    certificateQr.addEventListener("load", resolve, { once: true });
    certificateQr.addEventListener("error", resolve, { once: true });
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderRegistry() {
  const query = registrySearch.value.trim().toLowerCase();
  const certificates = certificatesState.filter((certificate) => {
    const text = [
      certificate.id,
      certificate.fullName,
      certificate.courseTopic,
      certificate.courseDate,
      certificate.validUntil,
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(query);
  });

  registryList.innerHTML = "";

  if (!certificates.length) {
    registryList.innerHTML = '<p class="registry-empty">Сертификаты не найдены.</p>';
    return;
  }

  certificates.forEach((certificate) => {
    const item = document.createElement("article");
    item.className = "registry-item";
    item.innerHTML = `
      <span class="status-pill">Сертификат действителен</span>
      <h3>${escapeHtml(certificate.fullName)}</h3>
      <p><b>Курс:</b> ${escapeHtml(certificate.courseTopic)}</p>
      <p><b>Дата курса:</b> ${escapeHtml(certificate.courseDate)}</p>
      <p><b>Действует до:</b> ${escapeHtml(certificate.validUntil)}</p>
      <p><b>Номер:</b> ${escapeHtml(certificate.id)}</p>
      <a class="button secondary" href="#certificate/${encodeURIComponent(certificate.id)}">Проверить сертификат</a>
    `;
    registryList.append(item);
  });
}

function showVerificationPage(certificate) {
  document.body.classList.add("is-verifying");
  document.querySelector("#verifyScreen").hidden = false;

  if (!certificate) {
    setText("#verifyName", "Сертификат не найден");
    setText("#verifyId", "Нет данных");
    setText("#verifyCourse", "Нет данных");
    setText("#verifyCourseDate", "Нет данных");
    setText("#verifyValidUntil", "Нет данных");
    document.querySelector("#verifyStatus").textContent = "Проверка не пройдена";
    return;
  }

  document.querySelector("#verifyStatus").textContent = "Сертификат действителен";
  setText("#verifyName", certificate.fullName);
  setText("#verifyId", certificate.id);
  setText("#verifyCourse", certificate.courseTopic);
  setText("#verifyCourseDate", certificate.courseDate);
  setText("#verifyValidUntil", certificate.validUntil);
}

async function handleRoute() {
  const hash = window.location.hash;
  syncTeacherSectionVisibility();
  const match = hash.match(/^#certificate\/(.+)$/);

  if (!match) {
    document.body.classList.remove("is-verifying");
    document.querySelector("#verifyScreen").hidden = true;
    return;
  }

  const id = decodeURIComponent(match[1]);
  const certificate = await findCertificate(id).catch(() => null);
  showVerificationPage(certificate);
}

lookupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(lookupForm));
  window.location.hash = `certificate/${encodeURIComponent(data.certificateId.trim())}`;
});

teacherLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";

  try {
    const data = Object.fromEntries(new FormData(teacherLoginForm));
    await loginTeacher(data.password);
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!teacherAuthenticated) {
    loginMessage.textContent = "Войдите как учитель, чтобы создать сертификат.";
    window.location.hash = "teacher";
    return;
  }

  const data = Object.fromEntries(new FormData(form));
  const certificate = {
    id: makeCertificateId(),
    fullName: data.fullName.trim(),
    courseTopic: data.courseTopic.trim(),
    courseDate: data.courseDate.trim(),
    validUntil: data.validUntil.trim(),
  };

  const savedCertificate = await createCertificate(certificate);
  renderCertificate(savedCertificate);
  renderRegistry();
  document.querySelector("#certificate").scrollIntoView({ behavior: "smooth", block: "start" });
});

logoutButton.addEventListener("click", logoutTeacher);
registrySearch.addEventListener("input", renderRegistry);
printCertificate.addEventListener("click", async () => {
  document.body.classList.add("is-downloading-certificate");
  await waitForCertificateQr();
  window.print();
});
window.addEventListener("afterprint", () => {
  document.body.classList.remove("is-downloading-certificate");
});
window.addEventListener("hashchange", handleRoute);

async function init() {
  await checkApiSession();
  await handleRoute();
}

init();
