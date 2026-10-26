const products = [
  { id: "pack.twd.01", amount: 60, bonus: 6, price: 150, oldPrice: 163, image: "/assets/aniimo/crystal-60.webp" },
  { id: "pack.twd.02", amount: 300, bonus: 30, price: 750, oldPrice: 815, image: "/assets/aniimo/crystal-300.webp" },
  { id: "pack.twd.03", amount: 980, bonus: 98, price: 1490, oldPrice: 1620, image: "/assets/aniimo/crystal-980.webp" },
  { id: "pack.twd.04", amount: 1980, bonus: 198, price: 2990, oldPrice: 3250, image: "/assets/aniimo/crystal-1980.webp" },
  { id: "pack.twd.05", amount: 3280, bonus: 328, price: 4990, oldPrice: 5420, image: "/assets/aniimo/crystal-3280.webp" },
  { id: "pack.twd.06", amount: 6480, bonus: 648, price: 9990, oldPrice: 10860, image: "/assets/aniimo/crystal-6480.webp" }
];

const state = { character: null, input: null, product: null, pendingProduct: null, accountEmail: null };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const money = (value) => `NT$ ${value.toLocaleString("en-US")}`;
let toastTimer;

function productCard(product) {
  return `<button class="product-card" type="button" data-product="${product.id}" aria-label="ซื้อ ${product.amount} คริสตัลลูมิน ราคา ${money(product.price)}">
    <span class="discount-badge">8% OFF</span>
    <span class="product-visual"><img class="product-image" src="${product.image}" alt="${product.amount} คริสตัลลูมิน" /><span class="first-bonus">โบนัสการซื้อครั้งแรก: <b>${product.amount}</b></span></span>
    <span class="product-body"><strong class="product-amount">×${product.amount}</strong><span class="product-type">คริสตัลลูมิน</span><span class="bonus-copy">โบนัส: ${product.bonus} ✦</span><span class="price-pill">${money(product.price)}<del>${money(product.oldPrice)}</del></span></span>
  </button>`;
}

function renderProducts(category = "currency") {
  const visible = category === "currency" || category === "all";
  $("#product-grid").innerHTML = visible ? products.map(productCard).join("") : "";
  $("#empty-state").hidden = visible;
  $$(".product-card").forEach((card) => card.addEventListener("click", () => selectProduct(card.dataset.product)));
}

function openDialog(selector) {
  const shell = $(selector);
  shell.hidden = false;
  document.body.classList.add("dialog-open");
  requestAnimationFrame(() => (shell.querySelector("[data-initial-focus]") || shell.querySelector("[autofocus]") || shell.querySelector("input, button:not(.dialog-backdrop)"))?.focus());
}

function closeDialog(shell) {
  shell.hidden = true;
  if (!$$('.dialog-shell:not([hidden])').length) document.body.classList.remove("dialog-open");
}

function showToast(message) {
  clearTimeout(toastTimer);
  const toast = $("#toast");
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
}

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { "content-type": "application/json", ...options.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message || `Request failed (${response.status})`);
  return body.data;
}

function setLoading(button, loading, label) {
  if (!button.dataset.label) button.dataset.label = button.querySelector("span")?.textContent || button.textContent;
  button.disabled = loading;
  const labelNode = button.querySelector("span") || button;
  labelNode.textContent = loading ? label : button.dataset.label;
}

function selectProduct(productId) {
  const product = products.find((item) => item.id === productId);
  state.pendingProduct = product;
  if (!state.character) {
    openDialog("#verify-dialog");
    return;
  }
  showCheckout(product);
}

function showCheckout(product) {
  state.product = product;
  state.pendingProduct = null;
  $("#checkout-content").hidden = false;
  $("#success-content").hidden = true;
  $("#checkout-error").hidden = true;
  $("#checkout-avatar").textContent = state.character.characterName.charAt(0).toUpperCase();
  $("#checkout-character").textContent = state.character.characterName;
  $("#checkout-meta").textContent = `UID ${state.character.uid} · ${state.character.server}${state.character.level ? ` · LV.${state.character.level}` : ""}`;
  $("#checkout-image").src = product.image;
  $("#checkout-image").alt = `${product.amount} คริสตัลลูมิน`;
  $("#checkout-product-name").textContent = `×${product.amount}`;
  $("#checkout-bonus").textContent = `โบนัส ${product.bonus} คริสตัล`;
  $("#checkout-price").textContent = money(product.price);
  openDialog("#checkout-dialog");
}

function updateAccount() {
  $("#account-status").textContent = `UID ${state.character.uid} · ${state.character.server}`;
  $("#account-name").textContent = state.character.characterName;
}

renderProducts();

$$('.category-tabs button').forEach((tab) => tab.addEventListener("click", () => {
  $$('.category-tabs button').forEach((item) => { item.classList.toggle("active", item === tab); item.setAttribute("aria-selected", String(item === tab)); });
  renderProducts(tab.dataset.category);
}));

$("#benefits-button").addEventListener("click", () => openDialog("#benefits-dialog"));
$("#help-button").addEventListener("click", () => openDialog("#help-dialog"));
$("#account-button").addEventListener("click", () => {
  if (state.accountEmail) showToast(`เข้าสู่ระบบแล้ว: ${state.accountEmail}`);
  else openDialog("#login-dialog");
});

let loginCodeTimer;

function showLoginError(message) {
  const error = $("#login-error");
  error.textContent = message;
  error.hidden = false;
}

function validLoginEmail() {
  const email = $("#login-email").value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showLoginError("กรุณากรอกอีเมลให้ถูกต้อง");
    $("#login-email").focus();
    return null;
  }
  return email;
}

$("#request-login-code").addEventListener("click", () => {
  $("#login-error").hidden = true;
  const email = validLoginEmail();
  if (!email) return;
  const button = $("#request-login-code");
  let seconds = 30;
  clearInterval(loginCodeTimer);
  button.disabled = true;
  button.textContent = `ส่งแล้ว ${seconds}s`;
  showToast(`โหมดทดสอบ: จำลองการส่งรหัสยืนยันไปยัง ${email}`);
  loginCodeTimer = setInterval(() => {
    seconds -= 1;
    button.textContent = seconds > 0 ? `ส่งแล้ว ${seconds}s` : "รับรหัส";
    if (seconds <= 0) {
      clearInterval(loginCodeTimer);
      button.disabled = false;
    }
  }, 1000);
});

$("#login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  $("#login-error").hidden = true;
  const email = validLoginEmail();
  if (!email) return;
  if (!/^\d{6}$/.test($("#login-code").value.trim())) {
    showLoginError("กรุณากรอกรหัสยืนยัน 6 หลักจากอีเมล");
    $("#login-code").focus();
    return;
  }
  if (!$("#login-consent").checked) {
    showLoginError("กรุณายอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว");
    $("#login-consent").focus();
    return;
  }
  state.accountEmail = email;
  $("#account-status").textContent = "ลงชื่อเข้าใช้แล้ว";
  $("#account-name").textContent = email.split("@")[0];
  closeDialog($("#login-dialog"));
  showToast("ลงชื่อเข้าใช้โหมดทดสอบสำเร็จ");
});

$$('[data-social]').forEach((button) => button.addEventListener("click", () => {
  showToast(`การเข้าสู่ระบบด้วย ${button.dataset.social} ยังไม่เปิดในโหมดทดสอบ`);
}));

$$('[data-close]').forEach((button) => button.addEventListener("click", () => closeDialog(button.closest(".dialog-shell"))));
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const open = $$('.dialog-shell:not([hidden])').pop();
  if (open) closeDialog(open);
});

$("#verify-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const uid = $("#uid").value.trim();
  const server = $("#server").value;
  const error = $("#verify-error");
  error.hidden = true;
  if (!/^\d{6,20}$/.test(uid)) {
    error.textContent = "กรุณากรอก UID เป็นตัวเลข 6–20 หลัก";
    error.hidden = false;
    return;
  }
  const button = $("#verify-submit");
  setLoading(button, true, "กำลังตรวจสอบ...");
  try {
    state.character = await api("/api/v1/aniimo/verify", { method: "POST", body: JSON.stringify({ uid, server }) });
    state.input = { uid, server };
    updateAccount();
    closeDialog($("#verify-dialog"));
    showToast(`ตรวจสอบสำเร็จ: ${state.character.characterName}`);
    if (state.pendingProduct) showCheckout(state.pendingProduct);
  } catch (apiError) {
    error.textContent = apiError.message === "UID or server is invalid" ? "ไม่พบตัวละคร กรุณาตรวจสอบ UID อีกครั้ง" : apiError.message;
    error.hidden = false;
  } finally { setLoading(button, false); }
});

$("#change-uid").addEventListener("click", () => {
  closeDialog($("#checkout-dialog"));
  state.pendingProduct = state.product;
  openDialog("#verify-dialog");
  $("#uid").select();
});

$("#create-session").addEventListener("click", async () => {
  const button = $("#create-session");
  const error = $("#checkout-error");
  error.hidden = true;
  setLoading(button, true, "กำลังสร้าง Session...");
  try {
    const session = await api("/api/v1/aniimo/sessions", { method: "POST", body: JSON.stringify({ ...state.input, productId: state.product.id, paymentMethod: "mycard" }) });
    $("#receipt-character").textContent = `${session.characterName} (${session.uid})`;
    $("#receipt-package").textContent = `${state.product.amount} คริสตัล · ${money(state.product.price)}`;
    $("#receipt-session").textContent = session.id;
    $("#receipt-expiry").textContent = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.expiresAt));
    $("#checkout-content").hidden = true;
    $("#success-content").hidden = false;
  } catch (apiError) {
    error.textContent = apiError.message;
    error.hidden = false;
  } finally { setLoading(button, false); }
});

$("#finish-session").addEventListener("click", () => {
  closeDialog($("#checkout-dialog"));
  showToast("สร้าง Session เรียบร้อยแล้ว");
});

const wizard = {
  step: 1,
  product: products[0]
};

function renderWizardPackages() {
  $("#wizard-packages").innerHTML = products.map((product) => `<button class="wizard-package${wizard.product.id === product.id ? " selected" : ""}" type="button" role="radio" aria-checked="${wizard.product.id === product.id}" data-wizard-product="${product.id}"><img src="${product.image}" alt="" /><span><small>คริสตัลลูมิน + โบนัส ${product.bonus}</small><strong>×${product.amount}</strong></span><b>${money(product.price)}</b></button>`).join("");
  $$("[data-wizard-product]").forEach((button) => button.addEventListener("click", () => {
    wizard.product = products.find((product) => product.id === button.dataset.wizardProduct);
    renderWizardPackages();
  }));
}

function setWizardStep(step) {
  wizard.step = step;
  $$("[data-wizard-step]").forEach((section) => {
    const selected = Number(section.dataset.wizardStep) === step;
    section.hidden = !selected;
    section.classList.toggle("active", selected);
  });
  $$("[data-wizard-progress]").forEach((item) => {
    const number = Number(item.dataset.wizardProgress);
    item.classList.toggle("active", number === step);
    item.classList.toggle("complete", number < step);
  });
  $(".topup-panel").scrollTo({ top: 0, behavior: "smooth" });
}

function openWizard() {
  $("#topup-wizard").hidden = false;
  document.body.classList.add("dialog-open");
  if (state.input) $("#wizard-uid").value = state.input.uid;
  setWizardStep(1);
  requestAnimationFrame(() => $("#wizard-uid").focus());
}

function closeWizard() {
  $("#topup-wizard").hidden = true;
  if (!$$('.dialog-shell:not([hidden])').length) document.body.classList.remove("dialog-open");
}

function fillWizardCharacter() {
  $("#wizard-avatar").textContent = state.character.characterName.charAt(0).toUpperCase();
  $("#wizard-character-name").textContent = state.character.characterName;
  $("#wizard-character-meta").textContent = `UID ${state.character.uid} · ${state.character.server}${state.character.level ? ` · LV.${state.character.level}` : ""}`;
}

function fillWizardSummary() {
  $("#wizard-summary-character").textContent = state.character.characterName;
  $("#wizard-summary-uid").textContent = `${state.input.uid} / ${state.input.server}`;
  $("#wizard-summary-product").textContent = `${wizard.product.amount} คริสตัล + โบนัส ${wizard.product.bonus}`;
  $("#wizard-summary-total").textContent = money(wizard.product.price);
  $("#wizard-order-error").hidden = true;
  $("#wizard-order-content").hidden = false;
  $("#wizard-success").hidden = true;
}

$("#topup-launcher").addEventListener("click", openWizard);
$$('[data-wizard-close]').forEach((button) => button.addEventListener("click", closeWizard));

$("#wizard-verify-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const uid = $("#wizard-uid").value.trim();
  const server = $("#wizard-server").value;
  const error = $("#wizard-verify-error");
  error.hidden = true;
  if (!/^\d{6,20}$/.test(uid)) {
    error.textContent = "กรุณากรอก UID เป็นตัวเลข 6–20 หลัก";
    error.hidden = false;
    return;
  }
  const button = $("#wizard-verify-button");
  setLoading(button, true, "กำลังตรวจสอบ...");
  try {
    state.character = await api("/api/v1/aniimo/verify", { method: "POST", body: JSON.stringify({ uid, server }) });
    state.input = { uid, server };
    updateAccount();
    fillWizardCharacter();
    setWizardStep(2);
  } catch (apiError) {
    error.textContent = apiError.message === "UID or server is invalid" ? "ไม่พบตัวละคร กรุณาตรวจสอบ UID อีกครั้ง" : apiError.message;
    error.hidden = false;
  } finally { setLoading(button, false); }
});

$$('[data-wizard-back]').forEach((button) => button.addEventListener("click", () => setWizardStep(Number(button.dataset.wizardBack))));
$$('[data-wizard-next]').forEach((button) => button.addEventListener("click", () => {
  renderWizardPackages();
  setWizardStep(Number(button.dataset.wizardNext));
}));

$("#wizard-package-next").addEventListener("click", () => {
  fillWizardSummary();
  setWizardStep(4);
});

$("#wizard-create-order").addEventListener("click", async () => {
  const button = $("#wizard-create-order");
  const error = $("#wizard-order-error");
  error.hidden = true;
  setLoading(button, true, "กำลังสร้างออเดอร์...");
  try {
    const session = await api("/api/v1/aniimo/sessions", { method: "POST", body: JSON.stringify({ ...state.input, productId: wizard.product.id, paymentMethod: "mycard" }) });
    $("#wizard-session-id").textContent = session.id;
    $("#wizard-session-expiry").textContent = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.expiresAt));
    $("#wizard-order-content").hidden = true;
    $("#wizard-success").hidden = false;
  } catch (apiError) {
    error.textContent = apiError.message;
    error.hidden = false;
  } finally { setLoading(button, false); }
});

$("#wizard-finish").addEventListener("click", () => {
  closeWizard();
  showToast("สร้างออเดอร์เติมเกมเรียบร้อยแล้ว");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#topup-wizard").hidden) closeWizard();
});

renderWizardPackages();

const demoState = {
  product: products[0]
};

function setDemoStage(stage) {
  $$("[data-demo-card]").forEach((card) => {
    const number = Number(card.dataset.demoCard);
    card.classList.toggle("active", number === stage);
    card.classList.toggle("complete", number < stage);
  });
}

function renderDemoPackages(enabled = Boolean(state.character)) {
  $("#demo-package-list").innerHTML = products.slice(0, 4).map((product) => `<button class="demo-pack${demoState.product.id === product.id ? " selected" : ""}" type="button" data-demo-product="${product.id}" ${enabled ? "" : "disabled"}><img src="${product.image}" alt="" /><span><small>คริสตัล ${product.amount} + โบนัส ${product.bonus}</small><strong>×${product.amount}</strong></span><b>${money(product.price)}</b></button>`).join("");
  $$("[data-demo-product]").forEach((button) => button.addEventListener("click", () => {
    demoState.product = products.find((product) => product.id === button.dataset.demoProduct);
    renderDemoPackages(true);
    fillDemoOrder();
    setDemoStage(4);
  }));
}

function fillDemoOrder() {
  if (!state.character || !state.input) return;
  $("#demo-order-character").textContent = state.character.characterName;
  $("#demo-order-uid").textContent = state.input.uid;
  $("#demo-order-server").textContent = state.input.server;
  $("#demo-order-product").textContent = `${demoState.product.amount} + โบนัส ${demoState.product.bonus}`;
  $("#demo-order-total").textContent = money(demoState.product.price);
  $("#demo-create-order").disabled = false;
}

$("#demo-verify-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const uid = $("#demo-uid").value.trim();
  const server = $("#demo-server").value;
  const error = $("#demo-verify-error");
  error.hidden = true;
  if (!/^\d{6,20}$/.test(uid)) {
    error.textContent = "กรุณากรอก UID เป็นตัวเลข 6–20 หลัก";
    error.hidden = false;
    return;
  }
  const button = $("#demo-verify-button");
  setLoading(button, true, "กำลังตรวจสอบ...");
  try {
    state.character = await api("/api/v1/aniimo/verify", { method: "POST", body: JSON.stringify({ uid, server }) });
    state.input = { uid, server };
    updateAccount();
    $("#demo-character-waiting").hidden = true;
    $("#demo-character-result").hidden = false;
    $("#demo-result-uid").textContent = uid;
    $("#demo-result-check").textContent = `ตรวจสอบแล้ว · ${server}`;
    $("#demo-character-name").textContent = state.character.characterName;
    $("#demo-character-level").textContent = `${state.character.level ? `LV.${state.character.level} · ` : ""}${server}`;
    $("#demo-package-hint").textContent = "เลือกสินค้าที่ต้องการ";
    renderDemoPackages(true);
    fillDemoOrder();
    setDemoStage(3);
  } catch (apiError) {
    error.textContent = apiError.message === "UID or server is invalid" ? "ไม่พบตัวละคร กรุณาตรวจสอบ UID อีกครั้ง" : apiError.message;
    error.hidden = false;
  } finally { setLoading(button, false); }
});

$("#demo-create-order").addEventListener("click", async () => {
  const button = $("#demo-create-order");
  const error = $("#demo-order-error");
  error.hidden = true;
  setLoading(button, true, "กำลังสร้างออเดอร์...");
  try {
    const session = await api("/api/v1/aniimo/sessions", { method: "POST", body: JSON.stringify({ ...state.input, productId: demoState.product.id, paymentMethod: "mycard" }) });
    $("#demo-order-content").hidden = true;
    $("#demo-order-success").hidden = false;
    $("#demo-order-session").textContent = `Session: ${session.id}`;
    setDemoStage(4);
  } catch (apiError) {
    error.textContent = apiError.message;
    error.hidden = false;
  } finally { setLoading(button, false); }
});

$("#demo-reset").addEventListener("click", () => {
  $("#demo-order-content").hidden = false;
  $("#demo-order-success").hidden = true;
  $("#demo-character-waiting").hidden = false;
  $("#demo-character-result").hidden = true;
  $("#demo-create-order").disabled = true;
  $("#demo-package-hint").textContent = "ตรวจสอบ UID ก่อนเลือกสินค้า";
  state.character = null;
  state.input = null;
  renderDemoPackages(false);
  setDemoStage(1);
  $("#demo-uid").focus();
});

renderDemoPackages(false);

const demoObserver = new IntersectionObserver(([entry]) => {
  document.body.classList.toggle("demo-in-view", entry.isIntersecting);
}, { threshold: 0.18 });
demoObserver.observe($("#uid-demo"));
