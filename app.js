const STORAGE_KEY = "family-hisab-expenses";
const BUDGET_KEY = "family-hisab-monthly-budget";
const BUDGET_MONTH_KEY = "family-hisab-budget-month";
const SESSION_KEY = "family-hisab-login";
const SUPABASE_URL = "https://qhzijagmhyooptuwawye.supabase.co";
const SUPABASE_KEY = "sb_publishable_tkxUO6f_EJXvCoTYc5u29Q_FduE8Zpt";

const users = {
  arban: { login: "Arban Molla", pass: "Arban@2004", name: "Arban Molla" },
  bakkar: { login: "Abu Bakkar", pass: "Bakkar@2000", name: "Abu Bakkar" },
};

const categories = ["বাজার", "বাসা ভাড়া", "কারেন্ট বিল", "গ্যাস বিল", "ইন্টারনেট", "ঔষধ", "অন্যান্য"];

const state = {
  currentUser: null,
  expenses: [],
  budgets: [],
  monthlyBudget: 0,
  supabase: null,
  syncTimer: null,
};

const els = {
  loginScreen: document.querySelector("#loginScreen"),
  loginForm: document.querySelector("#loginForm"),
  loginUser: document.querySelector("#loginUser"),
  loginPass: document.querySelector("#loginPass"),
  loginError: document.querySelector("#loginError"),
  appShell: document.querySelector("#appShell"),
  currentUserName: document.querySelector("#currentUserName"),
  entryUserName: document.querySelector("#entryUserName"),
  form: document.querySelector("#expenseForm"),
  date: document.querySelector("#dateInput"),
  category: document.querySelector("#categoryInput"),
  detailWrap: document.querySelector("#detailWrap"),
  detailLabel: document.querySelector("#detailLabel"),
  detail: document.querySelector("#detailInput"),
  amount: document.querySelector("#amountInput"),
  totalAmount: document.querySelector("#totalAmount"),
  monthAmount: document.querySelector("#monthAmount"),
  todayAmount: document.querySelector("#todayAmount"),
  budgetAmount: document.querySelector("#budgetAmount"),
  budgetAlert: document.querySelector("#budgetAlert"),
  budgetForm: document.querySelector("#budgetForm"),
  budgetSetNote: document.querySelector("#budgetSetNote"),
  editBudget: document.querySelector("#editBudgetBtn"),
  budgetInput: document.querySelector("#budgetInput"),
  filteredTotal: document.querySelector("#filteredTotal"),
  rows: document.querySelector("#expenseRows"),
  emptyState: document.querySelector("#emptyState"),
  from: document.querySelector("#fromInput"),
  to: document.querySelector("#toInput"),
  userFilter: document.querySelector("#userFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  breakdown: document.querySelector("#breakdown"),
  syncStatus: document.querySelector("#syncStatus"),
  categoryChart: document.querySelector("#categoryChart"),
  budgetChart: document.querySelector("#budgetChart"),
  budgetHistory: document.querySelector("#budgetHistory"),
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function currentMonthKey() {
  return monthStart().slice(0, 7);
}

function daysLeftInMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
}

function formatMoney(value) {
  return `৳${Number(value || 0).toLocaleString("bn-BD")}`;
}

function normalizeLogin(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function findUser(login, pass) {
  const cleanLogin = normalizeLogin(login);
  return Object.entries(users).find(([, user]) => normalizeLogin(user.login) === cleanLogin && user.pass === pass);
}

function getUserLabel(userKey) {
  return users[userKey]?.name || userKey || "-";
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.expenses));
}

function loadLocal() {
  state.expenses = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const savedMonth = localStorage.getItem(BUDGET_MONTH_KEY);
  state.monthlyBudget = savedMonth === currentMonthKey() ? Number(localStorage.getItem(BUDGET_KEY) || 0) : 0;
}

function cacheBudget() {
  localStorage.setItem(BUDGET_KEY, String(state.monthlyBudget));
  localStorage.setItem(BUDGET_MONTH_KEY, currentMonthKey());
}

function getFilteredExpenses() {
  const from = els.from.value;
  const to = els.to.value;
  const user = els.userFilter.value;
  const category = els.categoryFilter.value;
  return state.expenses.filter((expense) => (!from || expense.date >= from) && (!to || expense.date <= to) && (user === "all" || expense.user === user) && (category === "all" || expense.category === category));
}

function sumExpenses(expenses) {
  return expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
}

function getMonthTotal(monthKey) {
  return sumExpenses(state.expenses.filter((expense) => expense.date?.slice(0, 7) === monthKey));
}

function renderBudget(monthTotal) {
  const budget = Number(state.monthlyBudget || 0);
  els.budgetAmount.textContent = formatMoney(budget);
  els.budgetInput.value = budget || "";
  els.budgetForm.classList.toggle("hidden", budget > 0);
  els.budgetSetNote.classList.toggle("hidden", budget <= 0);
  els.budgetAlert.classList.add("hidden");

  if (!budget) return;

  const percent = Math.round((monthTotal / budget) * 100);
  const left = budget - monthTotal;
  if (monthTotal > budget) {
    els.budgetAlert.textContent = `Warning: বাজেট ${formatMoney(Math.abs(left))} বেশি খরচ হয়েছে।`;
    els.budgetAlert.className = "budget-alert danger";
    return;
  }

  if (percent >= 80) {
    const daysText = daysLeftInMonth() >= 7 ? ` মাস শেষ হতে ${daysLeftInMonth()} দিন বাকি।` : "";
    els.budgetAlert.textContent = `Warning: বাজেটের ${percent}% খরচ হয়েছে। বাকি ${formatMoney(left)}।${daysText}`;
    els.budgetAlert.className = "budget-alert warning";
  }
}

function renderSummary() {
  const now = today();
  const start = monthStart();
  const monthTotal = sumExpenses(state.expenses.filter((item) => item.date >= start));
  els.totalAmount.textContent = formatMoney(sumExpenses(state.expenses));
  els.monthAmount.textContent = formatMoney(monthTotal);
  els.todayAmount.textContent = formatMoney(sumExpenses(state.expenses.filter((item) => item.date === now)));
  renderBudget(monthTotal);
}

function renderBreakdown(expenses) {
  els.breakdown.innerHTML = "";
  categories
    .map((category) => ({ category, total: sumExpenses(expenses.filter((expense) => expense.category === category)) }))
    .filter((item) => item.total > 0)
    .forEach((item) => {
      const row = document.createElement("div");
      row.className = "breakdown-row";
      row.innerHTML = `<span>${item.category}</span><strong>${formatMoney(item.total)}</strong>`;
      els.breakdown.appendChild(row);
    });
}

function renderTable(expenses) {
  els.rows.innerHTML = "";
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date) || Number(b.createdAt || 0) - Number(a.createdAt || 0));
  sorted.forEach((expense) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${expense.date}</td>
      <td>${getUserLabel(expense.user)}</td>
      <td>${expense.category}</td>
      <td>${expense.detail || "-"}</td>
      <td class="amount-cell">${formatMoney(expense.amount)}</td>
      <td><button class="delete-btn" type="button" data-id="${expense.id}" title="মুছুন">×</button></td>
    `;
    els.rows.appendChild(tr);
  });
  els.emptyState.classList.toggle("show", sorted.length === 0);
}

function drawBarChart(canvas, labels, values, colors) {
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 420;
  const height = Number(canvas.getAttribute("height")) || 220;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);
  const max = Math.max(...values, 1);
  const barWidth = Math.max(18, (width - 34) / Math.max(values.length, 1) - 10);
  values.forEach((value, index) => {
    const barHeight = Math.round((value / max) * (height - 70));
    const x = 18 + index * (barWidth + 10);
    const y = height - 42 - barHeight;
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
    ctx.font = "11px sans-serif";
    ctx.fillText(labels[index].slice(0, 8), x, height - 20);
  });
}

function drawBudgetCompareChart(canvas, months) {
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 420;
  const height = Number(canvas.getAttribute("height")) || 220;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);
  const spentValues = months.map(getMonthTotal);
  const budgetValues = months.map((month) => Number(state.budgets.find((item) => item.monthKey === month)?.amount || 0));
  const max = Math.max(...spentValues, ...budgetValues, 1);
  const groupWidth = Math.max(42, (width - 34) / Math.max(months.length, 1) - 10);
  months.forEach((month, index) => {
    const x = 18 + index * (groupWidth + 10);
    const budgetHeight = Math.round((budgetValues[index] / max) * (height - 74));
    const spentHeight = Math.round((spentValues[index] / max) * (height - 74));
    ctx.fillStyle = "#d17a22";
    ctx.fillRect(x, height - 46 - budgetHeight, groupWidth / 2 - 3, budgetHeight);
    ctx.fillStyle = "#156064";
    ctx.fillRect(x + groupWidth / 2 + 3, height - 46 - spentHeight, groupWidth / 2 - 3, spentHeight);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
    ctx.font = "11px sans-serif";
    ctx.fillText(month.slice(5), x, height - 22);
  });
}

function renderCharts(filtered) {
  const palette = ["#156064", "#4c7c59", "#d17a22", "#3f6fb5", "#8b5cf6", "#bd3f32", "#64748b"];
  const categoryValues = categories.map((category) => sumExpenses(filtered.filter((expense) => expense.category === category)));
  drawBarChart(els.categoryChart, categories, categoryValues, palette);

  const months = [...new Set([...state.expenses.map((expense) => expense.date?.slice(0, 7)), ...state.budgets.map((budget) => budget.monthKey)])].filter(Boolean).sort().slice(-6);
  const visibleMonths = months.length ? months : [currentMonthKey()];
  drawBudgetCompareChart(els.budgetChart, visibleMonths);

  els.budgetHistory.innerHTML = "";
  visibleMonths.forEach((month) => {
    const spent = getMonthTotal(month);
    const budget = Number(state.budgets.find((item) => item.monthKey === month)?.amount || 0);
    const ok = budget > 0 && spent <= budget;
    const row = document.createElement("div");
    row.className = `history-row ${ok ? "ok" : "bad"}`;
    row.innerHTML = `<span>${month}</span><strong>${budget ? (ok ? "ঠিক ছিল" : "বেশি খরচ") : "বাজেট নেই"}</strong><span>${formatMoney(spent)} / ${formatMoney(budget)}</span>`;
    els.budgetHistory.appendChild(row);
  });
}

function render() {
  const filtered = getFilteredExpenses();
  renderSummary();
  renderBreakdown(filtered);
  renderTable(filtered);
  renderCharts(filtered);
  els.filteredTotal.textContent = formatMoney(sumExpenses(filtered));
}

function updateDetailField() {
  const isBazar = els.category.value === "বাজার";
  const isOther = els.category.value === "অন্যান্য";
  els.detailWrap.classList.toggle("hidden", !isBazar && !isOther);
  els.detail.required = isBazar || isOther;
  els.detailLabel.textContent = isBazar ? "কি বাজার" : "অন্যান্য কি";
  els.detail.placeholder = isBazar ? "যেমন চাল, ডাল, মাছ" : "যেমন মিস্ত্রি খরচ";
  if (!isBazar && !isOther) els.detail.value = "";
}

function toExpense(row) {
  return {
    id: row.id,
    user: row.user_key,
    userName: row.user_name,
    date: row.expense_date,
    category: row.category,
    detail: row.detail || "",
    amount: Number(row.amount),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : 0,
  };
}

function toExpenseRow(expense) {
  return {
    user_key: expense.user,
    user_name: expense.userName,
    expense_date: expense.date,
    category: expense.category,
    detail: expense.detail,
    amount: expense.amount,
  };
}

async function loadOnlineData() {
  if (!state.supabase) return;
  const { data: expenses, error: expensesError } = await state.supabase.from("expenses").select("*").order("expense_date", { ascending: false }).order("created_at", { ascending: false });
  if (expensesError) throw expensesError;
  const { data: budgets, error: budgetsError } = await state.supabase.from("monthly_budgets").select("*").order("month_key", { ascending: true });
  if (budgetsError) throw budgetsError;
  state.expenses = expenses.map(toExpense);
  state.budgets = budgets.map((budget) => ({ monthKey: budget.month_key, amount: Number(budget.amount) }));
  state.monthlyBudget = Number(state.budgets.find((budget) => budget.monthKey === currentMonthKey())?.amount || 0);
  saveLocal();
  cacheBudget();
  render();
}

async function initSupabase() {
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  state.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  await loadOnlineData();
  els.syncStatus.textContent = "Supabase online";
  els.syncStatus.style.color = "var(--primary-deep)";
  clearInterval(state.syncTimer);
  state.syncTimer = setInterval(() => loadOnlineData().catch(() => {}), 10000);
}

function showOnlineError() {
  els.syncStatus.textContent = "Online error";
  els.syncStatus.style.color = "var(--red)";
}

function showLogin() {
  state.currentUser = null;
  sessionStorage.removeItem(SESSION_KEY);
  els.loginScreen.classList.remove("hidden");
  els.appShell.classList.add("hidden");
  els.loginPass.value = "";
}

async function showApp(userKey) {
  state.currentUser = userKey;
  sessionStorage.setItem(SESSION_KEY, userKey);
  els.currentUserName.textContent = getUserLabel(userKey);
  els.entryUserName.textContent = getUserLabel(userKey);
  els.loginScreen.classList.add("hidden");
  els.appShell.classList.remove("hidden");
  loadLocal();
  render();
  try {
    await initSupabase();
  } catch (error) {
    showOnlineError();
  }
}

async function addExpense(expense) {
  if (!state.supabase) throw new Error("Supabase not connected");
  const { error } = await state.supabase.from("expenses").insert(toExpenseRow(expense));
  if (error) throw error;
  await loadOnlineData();
}

async function deleteExpense(id) {
  if (!state.supabase) throw new Error("Supabase not connected");
  const { error } = await state.supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
  await loadOnlineData();
}

async function saveBudget(value) {
  state.monthlyBudget = Number(value || 0);
  if (!state.supabase) throw new Error("Supabase not connected");
  const { error } = await state.supabase.from("monthly_budgets").upsert({
    month_key: currentMonthKey(),
    amount: state.monthlyBudget,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  await loadOnlineData();
}

function initFilters() {
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    els.categoryFilter.appendChild(option);
  });
  els.date.value = today();
  els.from.value = monthStart();
  els.to.value = today();
  updateDetailField();
}

function printReport() {
  document.title = `FAMILY HISAB report ${els.from.value || "start"} to ${els.to.value || "end"}`;
  window.print();
  document.title = "FAMILY HISAB";
}

function bindEvents() {
  els.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const match = findUser(els.loginUser.value, els.loginPass.value);
    if (!match) {
      els.loginError.classList.add("show");
      return;
    }
    els.loginError.classList.remove("show");
    await showApp(match[0]);
  });

  document.querySelector("#logoutBtn").addEventListener("click", showLogin);
  els.category.addEventListener("change", updateDetailField);
  els.editBudget.addEventListener("click", () => {
    els.budgetForm.classList.remove("hidden");
    els.budgetSetNote.classList.add("hidden");
    els.budgetInput.focus();
  });

  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await addExpense({
        user: state.currentUser,
        userName: getUserLabel(state.currentUser),
        date: els.date.value,
        category: els.category.value,
        detail: els.detail.value.trim(),
        amount: Number(els.amount.value),
      });
      els.amount.value = "";
      els.detail.value = "";
      updateDetailField();
      els.amount.focus();
    } catch (error) {
      alert("Online save হচ্ছে না। Supabase table check করুন।");
    }
  });

  els.budgetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await saveBudget(els.budgetInput.value);
    } catch (error) {
      alert("Budget save হচ্ছে না। Supabase table check করুন।");
    }
  });

  [els.from, els.to, els.userFilter, els.categoryFilter].forEach((input) => input.addEventListener("input", render));
  document.querySelector("#clearFilterBtn").addEventListener("click", () => {
    els.from.value = "";
    els.to.value = "";
    els.userFilter.value = "all";
    els.categoryFilter.value = "all";
    render();
  });
  document.querySelector("#printPdfBtn").addEventListener("click", printReport);
  els.rows.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-id]");
    if (!button) return;
    try {
      await deleteExpense(button.dataset.id);
    } catch (error) {
      alert("Delete হচ্ছে না। Supabase table check করুন।");
    }
  });
}

async function boot() {
  initFilters();
  bindEvents();
  const savedUser = sessionStorage.getItem(SESSION_KEY);
  if (savedUser && users[savedUser]) {
    await showApp(savedUser);
    return;
  }
  showLogin();
}

boot();
