import { createClient }
from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE APP.JS
   PART 1 — START OF FILE
   ========================================================= */

/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
  "https://ptluwoeogfkqavhspdjj.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* =========================================================
   GLOBAL DATA
   ========================================================= */

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];
let invoices = [];
let gatePasses = [];

/* =========================================================
   EDITING STATE
   ========================================================= */

let editingVehicleId = null;
let editingExpenseId = null;
let editingPettyId = null;
let editingReqId = null;
let editingInvoiceId = null;
let editingGatePassId = null;

let selectedVehicleExpenseId = null;
let selectedReqNo = null;

/* =========================================================
   FIXED OPTIONS
   ========================================================= */

const VEHICLE_JOB_TYPES = [
  "Repair",
  "Storage"
];

const VEHICLE_STATUSES = [
  "Storage",
  "Under Repair",
  "Completed",
  "Released"
];

const EXPENSE_CATEGORIES = [
  "Parts",
  "Materials",
  "Labour"
];

const PETTY_CASH_CATEGORIES = [
  "Parts",
  "Materials",
  "Labour",
  "Transport",
  "Other"
];

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return "KSh " + number(value).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function moneyPlain(value) {
  return number(value).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function today() {
  const d = new Date();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateTimeNow() {
  return new Date().toISOString();
}

function formatDate(value) {
  if (!value) return "";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return value;
  }

  return d.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatDateTime(value) {
  if (!value) return "";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return value;
  }

  return d.toLocaleString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* =========================================================
   STORAGE DAYS
   Calculated automatically from Date In / Date Out.
   No new Supabase column is required.
   ========================================================= */

function calculateStorageDays(dateIn, dateOut = null) {
  if (!dateIn) return 0;

  const start = new Date(dateIn);

  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  let end;

  if (dateOut) {
    end = new Date(dateOut);
  } else {
    end = new Date();
  }

  if (Number.isNaN(end.getTime())) {
    return 0;
  }

  const startDate = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  const endDate = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  );

  const difference =
    endDate.getTime() - startDate.getTime();

  const days =
    Math.floor(difference / (1000 * 60 * 60 * 24));

  return Math.max(0, days);
}

function updateVehicleStorageDays() {
  const dateIn = $("vehicleDateIn")?.value || "";
  const dateOut = $("vehicleDateOut")?.value || "";

  const days = calculateStorageDays(dateIn, dateOut);

  const field = $("vehicleStorageDays");

  if (field) {
    field.value = days;
  }

  const display = $("vehicleStorageDaysDisplay");

  if (display) {
    display.textContent = days + " day" + (days === 1 ? "" : "s");
  }

  return days;
}

/* =========================================================
   STATUS HELPERS
   ========================================================= */

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .replace(/\s+/g, " ");
}

function statusBadge(status) {
  const value = normalizeStatus(status);

  let cls = "status-badge";

  if (value === "Completed") {
    cls += " status-completed";
  } else if (value === "Released") {
    cls += " status-released";
  } else if (value === "Storage") {
    cls += " status-storage";
  } else if (value === "Under Repair") {
    cls += " status-repair";
  } else if (value === "Approved") {
    cls += " status-approved";
  } else if (value === "Rejected") {
    cls += " status-rejected";
  } else if (value === "Purchased") {
    cls += " status-purchased";
  } else if (value === "Pending") {
    cls += " status-pending";
  }

  return `<span class="${cls}">${escapeHtml(value || "—")}</span>`;
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(message, type = "success") {
  let toast = $("appToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appToast";
    toast.className = "app-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;

  toast.className =
    "app-toast " +
    (type === "error"
      ? "toast-error"
      : type === "warning"
      ? "toast-warning"
      : "toast-success");

  toast.classList.add("show");

  clearTimeout(window.__garageToastTimer);

  window.__garageToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/* =========================================================
   MODALS
   ========================================================= */

function openModal(id) {
  const modal = $(id);

  if (!modal) return;

  modal.classList.add("active");
  modal.style.display = "flex";
}

function closeModal(id) {
  const modal = $(id);

  if (!modal) return;

  modal.classList.remove("active");
  modal.style.display = "none";
}

/* =========================================================
   CURRENT USER
   ========================================================= */

function currentUser() {
  return (
    sessionStorage.getItem("garageUser") ||
    sessionStorage.getItem("currentUser") ||
    localStorage.getItem("garageUser") ||
    "Josephine"
  );
}

function displayCurrentUser() {
  const user = currentUser();

  const elements = [
    $("currentUser"),
    $("currentUserName"),
    $("loggedUser"),
    $("userName")
  ];

  elements.forEach((element) => {
    if (element) {
      element.textContent = user;
    }
  });
}

/* =========================================================
   NUMBER GENERATOR
   ========================================================= */

function generateNumber(prefix, rows = []) {
  const year = new Date().getFullYear();

  const numbers = rows
    .map((row) => {
      const value =
        row.req_no ||
        row.invoice_no ||
        row.gate_pass_no ||
        "";

      const match =
        String(value).match(/(\d+)$/);

      return match ? Number(match[1]) : 0;
    })
    .filter((n) => Number.isFinite(n));

  const next =
    numbers.length
      ? Math.max(...numbers) + 1
      : 1;

  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

/* =========================================================
   FORM OPTION HELPERS
   ========================================================= */

function ensureVehicleFormOptions() {
  const jobField = $("vehicleJobType");

  if (jobField) {
    if (jobField.tagName.toLowerCase() !== "select") {
      const select = document.createElement("select");

      select.id = jobField.id;
      select.name = jobField.name || jobField.id;
      select.className = jobField.className || "form-control";
      select.required = jobField.required;

      jobField.replaceWith(select);
    }

    const select = $("vehicleJobType");

    if (select) {
      const current = select.value || "Repair";

      select.innerHTML = "";

      VEHICLE_JOB_TYPES.forEach((type) => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        select.appendChild(option);
      });

      select.value =
        VEHICLE_JOB_TYPES.includes(current)
          ? current
          : "Repair";
    }
  }

  const statusField = $("vehicleStatus");

  if (statusField) {
    const current = statusField.value || "Under Repair";

    statusField.innerHTML = "";

    VEHICLE_STATUSES.forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      statusField.appendChild(option);
    });

    statusField.value =
      VEHICLE_STATUSES.includes(current)
        ? current
        : "Under Repair";
  }

  const statusFilter = $("vehicleStatusFilter");

  if (statusFilter) {
    const current = statusFilter.value || "";

    statusFilter.innerHTML =
      '<option value="">All Statuses</option>';

    VEHICLE_STATUSES.forEach((status) => {
      const option = document.createElement("option");

      option.value = status;
      option.textContent = status;

      statusFilter.appendChild(option);
    });

    statusFilter.value = current;
  }
}

function replaceInputWithSelect(id, options, fallbackValue = "") {
  const field = $(id);

  if (!field) return null;

  if (field.tagName.toLowerCase() !== "select") {
    const select = document.createElement("select");

    select.id = field.id;
    select.name = field.name || field.id;
    select.className = field.className || "form-control";
    select.required = field.required;

    field.replaceWith(select);
  }

  const select = $(id);

  if (!select) return null;

  const current = select.value || fallbackValue;

  select.innerHTML = "";

  options.forEach((item) => {
    const option = document.createElement("option");

    option.value = item;
    option.textContent = item;

    select.appendChild(option);
  });

  if (current && !options.includes(current)) {
    const oldOption = document.createElement("option");

    oldOption.value = current;
    oldOption.textContent = current;

    select.appendChild(oldOption);
  }

  select.value =
    current && select.querySelector(
      `option[value="${CSS.escape(current)}"]`
    )
      ? current
      : fallbackValue || options[0];

  return select;
}

function ensureCategoryOptions() {
  replaceInputWithSelect(
    "expenseCategory",
    EXPENSE_CATEGORIES,
    "Materials"
  );

  replaceInputWithSelect(
    "pettyCategory",
    PETTY_CASH_CATEGORIES,
    "Other"
  );
}

/* =========================================================
   PART 1 — END 533
   =========================================================
   */
/* =========================================================
   PART 2 — DATA LOADING + DASHBOARD + VEHICLES
   CONTINUES DIRECTLY FROM PART 1
   ========================================================= */

/* =========================================================
   SUPABASE DATA LOADING
   ========================================================= */

async function loadTable(table, orderColumn) {
  let query = supabase
    .from(table)
    .select("*");

  if (orderColumn) {
    query = query.order(orderColumn, {
      ascending: false
    });
  }

  let result = await query;

  /*
   * Some existing Supabase tables may not have created_at.
   * If ordering fails because the column does not exist,
   * retry without ordering.
   */
  if (
    result.error &&
    orderColumn &&
    (
      result.error.code === "42703" ||
      /column .* does not exist/i.test(
        result.error.message || ""
      )
    )
  ) {
    console.warn(
      `Column ${orderColumn} not available in ${table}. Loading without ordering.`
    );

    result = await supabase
      .from(table)
      .select("*");
  }

  if (result.error) {
    console.error(
      `Error loading ${table}:`,
      result.error
    );
  }

  return result;
}

/* =========================================================
   LOAD ALL DATA
   ========================================================= */

async function loadAllData() {
  try {
    const [
      vehicleResult,
      expenseResult,
      pettyResult,
      reqResult,
      invoiceResult,
      gateResult
    ] = await Promise.all([
      loadTable("vehicles", "created_at"),
      loadTable("expenses", "created_at"),
      loadTable("petty_cash", "created_at"),
      loadTable("requisitions", "created_at"),
      loadTable("invoices", "created_at"),
      loadTable("gate_passes", "created_at")
    ]);

    vehicles =
      vehicleResult?.error
        ? []
        : (vehicleResult?.data || []);

    expenses =
      expenseResult?.error
        ? []
        : (expenseResult?.data || []);

    pettyCash =
      pettyResult?.error
        ? []
        : (pettyResult?.data || []);

    requisitions =
      reqResult?.error
        ? []
        : (reqResult?.data || []);

    /*
     * Invoices and gate passes were added later.
     * Keep them optional so their absence does not
     * break the main garage application.
     */
    invoices =
      invoiceResult?.error
        ? []
        : (invoiceResult?.data || []);

    gatePasses =
      gateResult?.error
        ? []
        : (gateResult?.data || []);

    renderAll();

    populateVehicleSelects();
    populateInvoiceSelect();

    populateCategoryFilters();

  } catch (error) {
    console.error(
      "loadAllData error:",
      error
    );

    showToast(
      "Unable to load garage data.",
      "error"
    );
  }
}

/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderAll() {
  renderDashboard();
  renderVehicles();
  renderExpenses();
  renderPettyCash();
  renderRequisitions();

  if (typeof renderInvoices === "function") {
    renderInvoices();
  }

  if (typeof renderGatePasses === "function") {
    renderGatePasses();
  }

  renderDashboardActivity();
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {
  const totalVehicles =
    vehicles.length;

  const underRepair =
    vehicles.filter(
      (v) =>
        normalizeStatus(v.status) ===
        "Under Repair"
    ).length;

  const totalBilled =
    vehicles.reduce(
      (sum, v) =>
        sum + number(v.billed),
      0
    );

  const totalPaid =
    vehicles.reduce(
      (sum, v) =>
        sum + number(v.paid),
      0
    );

  const outstanding =
    Math.max(
      0,
      totalBilled - totalPaid
    );

  const totalExpenses =
    expenses.reduce(
      (sum, item) =>
        sum + number(item.amount),
      0
    );

  const totalPettyCash =
    pettyCash.reduce(
      (sum, item) =>
        sum + number(item.amount),
      0
    );

  const pendingRequisitions =
    requisitions.filter(
      (r) =>
        normalizeStatus(r.status) ===
        "Pending"
    ).length;

  const totalRequisitionAmount =
    requisitions.reduce(
      (sum, r) =>
        sum + number(r.total_amount),
      0
    );

  const values = {
    totalVehicles,
    underRepair,
    totalBilled,
    totalPaid,
    outstanding,
    totalExpenses,
    totalPettyCash,
    pendingRequisitions,
    totalRequisitionAmount
  };

  /*
   * Support the existing dashboard IDs and
   * common alternative IDs.
   */
  const setText = (ids, value) => {
    ids.forEach((id) => {
      const element = $(id);

      if (element) {
        element.textContent = value;
      }
    });
  };

  setText(
    ["totalVehicles", "dashboardTotalVehicles"],
    values.totalVehicles
  );

  setText(
    ["vehiclesUnderRepair", "dashboardUnderRepair"],
    values.underRepair
  );

  setText(
    ["totalBilled", "dashboardTotalBilled"],
    money(values.totalBilled)
  );

  setText(
    ["totalPaid", "dashboardTotalPaid"],
    money(values.totalPaid)
  );

  setText(
    ["totalOutstanding", "dashboardOutstanding"],
    money(values.outstanding)
  );

  setText(
    ["totalExpenses", "dashboardTotalExpenses"],
    money(values.totalExpenses)
  );

  setText(
    ["totalPettyCash", "dashboardPettyCash"],
    money(values.totalPettyCash)
  );

  setText(
    ["pendingRequisitions", "dashboardPendingRequisitions"],
    values.pendingRequisitions
  );

  setText(
    [
      "totalRequisitionAmount",
      "dashboardRequisitionAmount"
    ],
    money(values.totalRequisitionAmount)
  );

  renderExpenseChart();
  renderVehicleStatusChart();
}

/* =========================================================
   DASHBOARD ACTIVITY
   ========================================================= */

function renderDashboardActivity() {
  const body =
    $("recentActivityBody") ||
    $("dashboardActivityBody");

  if (!body) return;

  const activities = [];

  vehicles.forEach((vehicle) => {
    activities.push({
      date:
        vehicle.created_at ||
        vehicle.date_in ||
        vehicle.date_out ||
        "",
      title:
        `Vehicle ${vehicle.registration || "—"}`,
      description:
        `${vehicle.customer || "No customer"} • ${
          vehicle.status || "—"
        }`
    });
  });

  expenses.forEach((expense) => {
    activities.push({
      date:
        expense.created_at ||
        expense.expense_date ||
        "",
      title:
        `Expense ${expense.description || "—"}`,
      description:
        money(expense.amount)
    });
  });

  requisitions.forEach((req) => {
    activities.push({
      date:
        req.created_at ||
        req.req_date ||
        "",
      title:
        `Requisition ${req.req_no || "—"}`,
      description:
        `${req.status || "Pending"} • ${
          money(req.total_amount)
        }`
    });
  });

  activities.sort(
    (a, b) =>
      new Date(b.date || 0) -
      new Date(a.date || 0)
  );

  const recent =
    activities.slice(0, 8);

  if (!recent.length) {
    body.innerHTML =
      `<tr>
        <td colspan="4" class="empty-state">
          No recent activity
        </td>
      </tr>`;

    return;
  }

  body.innerHTML = recent
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(
            formatDateTime(item.date)
          )}</td>
          <td>${escapeHtml(
            item.title
          )}</td>
          <td>${escapeHtml(
            item.description
          )}</td>
        </tr>
      `
    )
    .join("");
}

/* =========================================================
   DASHBOARD EXPENSE CHART
   ========================================================= */

function renderExpenseChart() {
  const canvas =
    $("monthlyExpensesChart");

  if (!canvas) return;

  if (
    typeof Chart === "undefined"
  ) {
    return;
  }

  const ctx =
    canvas.getContext("2d");

  const monthly = {};

  expenses.forEach((expense) => {
    const date =
      expense.expense_date ||
      expense.created_at;

    if (!date) return;

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return;
    }

    const key =
      `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}`;

    monthly[key] =
      (monthly[key] || 0) +
      number(expense.amount);
  });

  const keys =
    Object.keys(monthly).sort();

  const labels =
    keys.map((key) => {
      const [year, month] =
        key.split("-");

      return new Date(
        Number(year),
        Number(month) - 1,
        1
      ).toLocaleDateString(
        "en-KE",
        {
          month: "short",
          year: "numeric"
        }
      );
    });

  const data =
    keys.map((key) =>
      number(monthly[key])
    );

  if (window.__monthlyExpensesChart) {
    window.__monthlyExpensesChart.destroy();
  }

  window.__monthlyExpensesChart =
    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Expenses",
            data
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
}

/* =========================================================
   VEHICLE STATUS CHART
   ========================================================= */

function renderVehicleStatusChart() {
  const canvas =
    $("vehicleStatusChart");

  if (!canvas) return;

  if (
    typeof Chart === "undefined"
  ) {
    return;
  }

  const counts = {
    Storage: 0,
    "Under Repair": 0,
    Completed: 0,
    Released: 0
  };

  vehicles.forEach((vehicle) => {
    const status =
      normalizeStatus(vehicle.status);

    if (
      Object.prototype.hasOwnProperty.call(
        counts,
        status
      )
    ) {
      counts[status]++;
    }
  });

  const ctx =
    canvas.getContext("2d");

  if (window.__vehicleStatusChart) {
    window.__vehicleStatusChart.destroy();
  }

  window.__vehicleStatusChart =
    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: Object.keys(counts),
        datasets: [
          {
            data: Object.values(counts)
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
}

/* =========================================================
   VEHICLE FORM RESET
   ========================================================= */

function resetVehicleForm() {
  editingVehicleId = null;

  const form =
    $("vehicleForm");

  if (form) {
    form.reset();
  }

  const idField =
    $("vehicleId");

  if (idField) {
    idField.value = "";
  }

  if ($("vehicleDateIn")) {
    $("vehicleDateIn").value =
      today();
  }

  if ($("vehicleDateOut")) {
    $("vehicleDateOut").value =
      "";
  }

  if ($("vehicleJobType")) {
    $("vehicleJobType").value =
      "Repair";
  }

  if ($("vehicleStatus")) {
    $("vehicleStatus").value =
      "Under Repair";
  }

  if ($("vehicleBilled")) {
    $("vehicleBilled").value =
      "0";
  }

  if ($("vehiclePaid")) {
    $("vehiclePaid").value =
      "0";
  }

  updateVehicleStorageDays();
}

/* =========================================================
   OPEN VEHICLE MODAL
   ========================================================= */

function openVehicleModal(id = null) {
  ensureVehicleFormOptions();

  if (!id) {
    resetVehicleForm();
    openModal("vehicleModal");
    return;
  }

  const vehicle =
    vehicles.find(
      (v) => String(v.id) === String(id)
    );

  if (!vehicle) {
    showToast(
      "Vehicle not found.",
      "error"
    );
    return;
  }

  editingVehicleId =
    vehicle.id;

  const set = (field, value) => {
    const element = $(field);

    if (element) {
      element.value =
        value ?? "";
    }
  };

  set(
    "vehicleId",
    vehicle.id
  );

  set(
    "vehicleRegistration",
    vehicle.registration
  );

  set(
    "vehicleCustomer",
    vehicle.customer
  );

  set(
    "vehicleDateIn",
    vehicle.date_in
  );

  set(
    "vehicleDateOut",
    vehicle.date_out
  );

  set(
    "vehicleJobType",
    VEHICLE_JOB_TYPES.includes(
      vehicle.job_type
    )
      ? vehicle.job_type
      : "Repair"
  );

  set(
    "vehicleStatus",
    VEHICLE_STATUSES.includes(
      vehicle.status
    )
      ? vehicle.status
      : "Under Repair"
  );

  set(
    "vehicleReleasedTo",
    vehicle.released_to
  );

  set(
    "vehicleReleasedContact",
    vehicle.released_contact
  );

  set(
    "vehicleBilled",
    number(vehicle.billed)
  );

  set(
    "vehiclePaid",
    number(vehicle.paid)
  );

  set(
    "vehicleDescription",
    vehicle.description
  );

  updateVehicleStorageDays();

  openModal("vehicleModal");
}

/* =========================================================
   SAVE VEHICLE
   ========================================================= */

async function saveVehicle(event) {
  if (event) {
    event.preventDefault();
  }

  const registration =
    $("vehicleRegistration")?.value
      .trim();

  const customer =
    $("vehicleCustomer")?.value
      .trim();

  const dateIn =
    $("vehicleDateIn")?.value || "";

  const dateOut =
    $("vehicleDateOut")?.value || null;

  const jobType =
    $("vehicleJobType")?.value ||
    "Repair";

  const status =
    $("vehicleStatus")?.value ||
    "Under Repair";

  if (!registration) {
    showToast(
      "Registration / Chassis No. is required.",
      "error"
    );
    return;
  }

  if (!customer) {
    showToast(
      "Customer is required.",
      "error"
    );
    return;
  }

  if (!dateIn) {
    showToast(
      "Date In is required.",
      "error"
    );
    return;
  }

  if (
    !VEHICLE_JOB_TYPES.includes(jobType)
  ) {
    showToast(
      "Please select a valid Job Type.",
      "error"
    );
    return;
  }

  if (
    !VEHICLE_STATUSES.includes(status)
  ) {
    showToast(
      "Please select a valid Status.",
      "error"
    );
    return;
  }

  const payload = {
    registration,
    customer,
    date_in: dateIn,
    date_out: dateOut,
    job_type: jobType,
    status,
    released_to:
      $("vehicleReleasedTo")?.value
        .trim() || null,
    released_contact:
      $("vehicleReleasedContact")?.value
        .trim() || null,
    description:
      $("vehicleDescription")?.value
        .trim() || null,
    billed:
      number(
        $("vehicleBilled")?.value
      ),
    paid:
      number(
        $("vehiclePaid")?.value
      )
  };

  try {
    let result;

    if (editingVehicleId) {
      result =
        await supabase
          .from("vehicles")
          .update(payload)
          .eq("id", editingVehicleId);
    } else {
      result =
        await supabase
          .from("vehicles")
          .insert([payload]);
    }

    if (result.error) {
      console.error(
        "saveVehicle:",
        result.error
      );

      showToast(
        result.error.message ||
          "Unable to save vehicle.",
        "error"
      );

      return;
    }

    showToast(
      editingVehicleId
        ? "Vehicle updated successfully."
        : "Vehicle added successfully."
    );

    closeModal("vehicleModal");

    resetVehicleForm();

    await loadAllData();

  } catch (error) {
    console.error(
      "saveVehicle exception:",
      error
    );

    showToast(
      "An unexpected error occurred.",
      "error"
    );
  }
}

/* =========================================================
   DELETE VEHICLE
   ========================================================= */

async function deleteVehicle(id) {
  if (!id) return;

  const vehicle =
    vehicles.find(
      (v) => String(v.id) === String(id)
    );

  if (!vehicle) return;

  const confirmed =
    confirm(
      `Delete vehicle ${
        vehicle.registration || ""
      }?`
    );

  if (!confirmed) return;

  try {
    const result =
      await supabase
        .from("vehicles")
        .delete()
        .eq("id", id);

    if (result.error) {
      console.error(
        "deleteVehicle:",
        result.error
      );

      showToast(
        result.error.message ||
          "Unable to delete vehicle.",
        "error"
      );

      return;
    }

    showToast(
      "Vehicle deleted successfully."
    );

    await loadAllData();

  } catch (error) {
    console.error(
      "deleteVehicle exception:",
      error
    );

    showToast(
      "Unable to delete vehicle.",
      "error"
    );
  }
}

/* =========================================================
   VEHICLE SELECT OPTIONS
   ========================================================= */

function vehicleOptionList(
  includeBlank = true
) {
  let html =
    includeBlank
      ? `<option value="">Select Vehicle</option>`
      : "";

  html += vehicles
    .map(
      (vehicle) => `
        <option value="${escapeHtml(
          vehicle.id
        )}">
          ${escapeHtml(
            vehicle.registration || "—"
          )}
          ${
            vehicle.customer
              ? " — " +
                escapeHtml(
                  vehicle.customer
                )
              : ""
          }
        </option>
      `
    )
    .join("");

  return html;
}

function populateVehicleSelects() {
  const ids = [
    "expenseVehicle",
    "reqVehicle",
    "invoiceVehicle",
    "gateVehicle"
  ];

  ids.forEach((id) => {
    const field = $(id);

    if (!field) return;

    const current =
      field.value;

    field.innerHTML =
      vehicleOptionList(true);

    if (
      current &&
      field.querySelector(
        `option[value="${CSS.escape(
          current
        )}"]`
      )
    ) {
      field.value = current;
    }
  });
}

/* =========================================================
   VEHICLE EXPENSE TOTAL
   ========================================================= */

function vehicleExpenseTotal(vehicleId) {
  return expenses
    .filter(
      (expense) =>
        String(expense.vehicle_id) ===
        String(vehicleId)
    )
    .reduce(
      (sum, expense) =>
        sum + number(expense.amount),
      0
    );
}

/* =========================================================
   RENDER VEHICLES
   ========================================================= */

function renderVehicles() {
  const body =
    $("vehiclesTableBody");

  if (!body) return;

  const search =
    (
      $("vehicleSearch")?.value ||
      ""
    )
      .trim()
      .toLowerCase();

  const statusFilter =
    $("vehicleStatusFilter")
      ?.value || "";

  const filtered =
    vehicles.filter((vehicle) => {
      const text =
        [
          vehicle.registration,
          vehicle.customer,
          vehicle.job_type,
          vehicle.status,
          vehicle.released_to
        ]
          .join(" ")
          .toLowerCase();

      const matchesSearch =
        !search ||
        text.includes(search);

      const matchesStatus =
        !statusFilter ||
        normalizeStatus(
          vehicle.status
        ) === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });

  if (!filtered.length) {
    body.innerHTML =
      `<tr>
        <td colspan="11" class="empty-state">
          No vehicles found
        </td>
      </tr>`;

    return;
  }

  body.innerHTML =
    filtered
      .map((vehicle) => {
        const storageDays =
          calculateStorageDays(
            vehicle.date_in,
            vehicle.date_out
          );

        const billed =
          number(vehicle.billed);

        const paid =
          number(vehicle.paid);

        const outstanding =
          Math.max(
            0,
            billed - paid
          );

        return `
          <tr>
            <td>
              <strong>
                ${escapeHtml(
                  vehicle.registration || "—"
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                vehicle.customer || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                formatDate(
                  vehicle.date_in
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                formatDate(
                  vehicle.date_out
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                vehicle.job_type || "—"
              )}
            </td>

            <td>
              ${statusBadge(
                vehicle.status
              )}
            </td>

            <td>
              ${storageDays}
            </td>

            <td>
              ${money(billed)}
            </td>

            <td>
              ${money(paid)}
            </td>

            <td>
              ${money(outstanding)}
            </td>

            <td>
              <div class="table-actions">
                <button
                  class="btn btn-sm"
                  onclick="openVehicleModal('${escapeHtml(
                    vehicle.id
                  )}')">
                  Edit
                </button>

                <button
                  class="btn btn-sm btn-danger"
                  onclick="deleteVehicle('${escapeHtml(
                    vehicle.id
                  )}')">
                  Delete
                </button>

                <button
                  class="btn btn-sm"
                  onclick="openVehicleExpenses('${escapeHtml(
                    vehicle.id
                  )}')">
                  Expenses
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
}

/* =========================================================
   PART 2 — END1743
   ========================================================= 
   */

/* =========================================================
   PART 3 — EXPENSES + PETTY CASH + REQUISITIONS
   CONTINUES DIRECTLY FROM PART 2
   ========================================================= */

/* =========================================================
   EXPENSE CATEGORY FILTERS
   ========================================================= */

function populateCategoryFilters() {
  const expenseFilter =
    $("expenseCategoryFilter");

  if (expenseFilter) {
    const existing =
      Array.from(
        expenseFilter.options
      ).map((option) => option.value);

    const categories = [
      ...EXPENSE_CATEGORIES,
      ...expenses
        .map((item) => item.category)
        .filter(Boolean)
    ];

    const unique =
      [...new Set(categories)];

    const current =
      expenseFilter.value || "";

    expenseFilter.innerHTML =
      `<option value="">All Categories</option>` +
      unique
        .map(
          (category) => `
            <option value="${escapeHtml(
              category
            )}">
              ${escapeHtml(category)}
            </option>
          `
        )
        .join("");

    if (
      current &&
      unique.includes(current)
    ) {
      expenseFilter.value = current;
    }
  }

  const pettyFilter =
    $("pettyCategoryFilter");

  if (pettyFilter) {
    const categories = [
      ...PETTY_CASH_CATEGORIES,
      ...pettyCash
        .map((item) => item.category)
        .filter(Boolean)
    ];

    const unique =
      [...new Set(categories)];

    const current =
      pettyFilter.value || "";

    pettyFilter.innerHTML =
      `<option value="">All Categories</option>` +
      unique
        .map(
          (category) => `
            <option value="${escapeHtml(
              category
            )}">
              ${escapeHtml(category)}
            </option>
          `
        )
        .join("");

    if (
      current &&
      unique.includes(current)
    ) {
      pettyFilter.value = current;
    }
  }
}

/* =========================================================
   EXPENSE FORM RESET
   ========================================================= */

function resetExpenseForm() {
  editingExpenseId = null;

  const form =
    $("expenseForm");

  if (form) {
    form.reset();
  }

  const idField =
    $("expenseId");

  if (idField) {
    idField.value = "";
  }

  if ($("expenseDate")) {
    $("expenseDate").value =
      today();
  }

  if ($("expenseCategory")) {
    $("expenseCategory").value =
      "Materials";
  }

  if ($("expenseAmount")) {
    $("expenseAmount").value =
      "0";
  }

  populateVehicleSelects();
}

/* =========================================================
   OPEN EXPENSE MODAL
   ========================================================= */

function openExpenseModal(id = null) {
  ensureCategoryOptions();
  populateVehicleSelects();

  if (!id) {
    resetExpenseForm();
    openModal("expenseModal");
    return;
  }

  const expense =
    expenses.find(
      (item) =>
        String(item.id) ===
        String(id)
    );

  if (!expense) {
    showToast(
      "Expense not found.",
      "error"
    );
    return;
  }

  editingExpenseId =
    expense.id;

  const set = (field, value) => {
    const element = $(field);

    if (element) {
      element.value =
        value ?? "";
    }
  };

  set(
    "expenseId",
    expense.id
  );

  set(
    "expenseVehicle",
    expense.vehicle_id
  );

  set(
    "expenseDate",
    expense.expense_date
  );

  set(
    "expenseDescription",
    expense.description
  );

  set(
    "expenseCategory",
    expense.category || "Materials"
  );

  set(
    "expenseAmount",
    number(expense.amount)
  );

  openModal("expenseModal");
}

/* =========================================================
   SAVE EXPENSE
   ========================================================= */

async function saveExpense(event) {
  if (event) {
    event.preventDefault();
  }

  const vehicleId =
    $("expenseVehicle")?.value || null;

  const expenseDate =
    $("expenseDate")?.value ||
    today();

  const description =
    $("expenseDescription")?.value
      .trim();

  const category =
    $("expenseCategory")?.value ||
    "Materials";

  const amount =
    number(
      $("expenseAmount")?.value
    );

  if (!vehicleId) {
    showToast(
      "Please select a vehicle.",
      "error"
    );
    return;
  }

  if (!description) {
    showToast(
      "Expense description is required.",
      "error"
    );
    return;
  }

  if (amount <= 0) {
    showToast(
      "Expense amount must be greater than zero.",
      "error"
    );
    return;
  }

  const payload = {
    vehicle_id: vehicleId,
    expense_date: expenseDate,
    description,
    category,
    amount
  };

  try {
    let result;

    if (editingExpenseId) {
      result =
        await supabase
          .from("expenses")
          .update(payload)
          .eq("id", editingExpenseId);
    } else {
      result =
        await supabase
          .from("expenses")
          .insert([payload]);
    }

    if (result.error) {
      console.error(
        "saveExpense:",
        result.error
      );

      showToast(
        result.error.message ||
          "Unable to save expense.",
        "error"
      );

      return;
    }

    showToast(
      editingExpenseId
        ? "Expense updated successfully."
        : "Expense added successfully."
    );

    closeModal("expenseModal");

    resetExpenseForm();

    await loadAllData();

  } catch (error) {
    console.error(
      "saveExpense exception:",
      error
    );

    showToast(
      "Unable to save expense.",
      "error"
    );
  }
}

/* =========================================================
   DELETE EXPENSE
   ========================================================= */

async function deleteExpense(id) {
  if (!id) return;

  const expense =
    expenses.find(
      (item) =>
        String(item.id) ===
        String(id)
    );

  if (!expense) return;

  const confirmed =
    confirm(
      `Delete expense "${
        expense.description || ""
      }"?`
    );

  if (!confirmed) return;

  try {
    const result =
      await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

    if (result.error) {
      console.error(
        "deleteExpense:",
        result.error
      );

      showToast(
        result.error.message ||
          "Unable to delete expense.",
        "error"
      );

      return;
    }

    showToast(
      "Expense deleted successfully."
    );

    await loadAllData();

  } catch (error) {
    console.error(
      "deleteExpense exception:",
      error
    );

    showToast(
      "Unable to delete expense.",
      "error"
    );
  }
}

/* =========================================================
   RENDER EXPENSES
   ========================================================= */

function renderExpenses() {
  const body =
    $("expensesTableBody");

  if (!body) return;

  const search =
    (
      $("expenseSearch")?.value ||
      ""
    )
      .trim()
      .toLowerCase();

  const categoryFilter =
    $("expenseCategoryFilter")
      ?.value || "";

  const vehicleFilter =
    $("expenseVehicleFilter")
      ?.value || "";

  const filtered =
    expenses.filter((expense) => {
      const vehicle =
        vehicles.find(
          (v) =>
            String(v.id) ===
            String(expense.vehicle_id)
        );

      const vehicleReg =
        vehicle?.registration || "";

      const text =
        [
          expense.description,
          expense.category,
          vehicleReg,
          vehicle?.customer
        ]
          .join(" ")
          .toLowerCase();

      const matchesSearch =
        !search ||
        text.includes(search);

      const matchesCategory =
        !categoryFilter ||
        expense.category ===
          categoryFilter;

      const matchesVehicle =
        !vehicleFilter ||
        String(expense.vehicle_id) ===
          String(vehicleFilter);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesVehicle
      );
    });

  if (!filtered.length) {
    body.innerHTML =
      `<tr>
        <td colspan="7" class="empty-state">
          No expenses found
        </td>
      </tr>`;

    return;
  }

  body.innerHTML =
    filtered
      .map((expense) => {
        const vehicle =
          vehicles.find(
            (v) =>
              String(v.id) ===
              String(
                expense.vehicle_id
              )
          );

        return `
          <tr>
            <td>
              ${escapeHtml(
                formatDate(
                  expense.expense_date
                )
              )}
            </td>

            <td>
              <strong>
                ${escapeHtml(
                  vehicle?.registration ||
                    "—"
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                expense.description ||
                  "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                expense.category ||
                  "—"
              )}
            </td>

            <td>
              ${money(
                expense.amount
              )}
            </td>

            <td>
              ${escapeHtml(
                vehicle?.customer ||
                  "—"
              )}
            </td>

            <td>
              <div class="table-actions">
                <button
                  class="btn btn-sm"
                  onclick="openExpenseModal('${escapeHtml(
                    expense.id
                  )}')">
                  Edit
                </button>

                <button
                  class="btn btn-sm btn-danger"
                  onclick="deleteExpense('${escapeHtml(
                    expense.id
                  )}')">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
}

/* =========================================================
   OPEN EXPENSES FOR ONE VEHICLE
   ========================================================= */

function openVehicleExpenses(vehicleId) {
  selectedVehicleExpenseId =
    vehicleId;

  const vehicle =
    vehicles.find(
      (v) =>
        String(v.id) ===
        String(vehicleId)
    );

  if (!vehicle) {
    showToast(
      "Vehicle not found.",
      "error"
    );
    return;
  }

  /*
   * Move to Expenses section if the
   * navigation function exists.
   */
  if (
    typeof showSection ===
    "function"
  ) {
    showSection("expenses");
  }

  const vehicleFilter =
    $("expenseVehicleFilter");

  if (vehicleFilter) {
    vehicleFilter.value =
      vehicleId;
  }

  renderExpenses();

  showToast(
    `Showing expenses for ${vehicle.registration}.`
  );
}

/* =========================================================
   PETTY CASH FORM RESET
   ========================================================= */

function resetPettyForm() {
  editingPettyId = null;

  const form =
    $("pettyForm");

  if (form) {
    form.reset();
  }

  const idField =
    $("pettyId");

  if (idField) {
    idField.value = "";
  }

  if ($("pettyDate")) {
    $("pettyDate").value =
      today();
  }

  if ($("pettyCategory")) {
    $("pettyCategory").value =
      "Other";
  }

  if ($("pettyAmount")) {
    $("pettyAmount").value =
      "0";
  }
}

/* =========================================================
   OPEN PETTY CASH MODAL
   ========================================================= */

function openPettyModal(id = null) {
  ensureCategoryOptions();

  if (!id) {
    resetPettyForm();
    openModal("pettyModal");
    return;
  }

  const item =
    pettyCash.find(
      (row) =>
        String(row.id) ===
        String(id)
    );

  if (!item) {
    showToast(
      "Petty cash entry not found.",
      "error"
    );
    return;
  }

  editingPettyId =
    item.id;

  const set = (field, value) => {
    const element = $(field);

    if (element) {
      element.value =
        value ?? "";
    }
  };

  set(
    "pettyId",
    item.id
  );

  set(
    "pettyDate",
    item.cash_date
  );

  set(
    "pettyDescription",
    item.description
  );

  set(
    "pettyPaidTo",
    item.paid_to
  );

  set(
    "pettyCategory",
    item.category || "Other"
  );

  set(
    "pettyAmount",
    number(item.amount)
  );

  set(
    "pettyNotes",
    item.notes
  );

  openModal("pettyModal");
}

/* =========================================================
   SAVE PETTY CASH
   ========================================================= */

async function savePetty(event) {
  if (event) {
    event.preventDefault();
  }

  const cashDate =
    $("pettyDate")?.value ||
    today();

  const description =
    $("pettyDescription")?.value
      .trim();

  const paidTo =
    $("pettyPaidTo")?.value
      .trim();

  const category =
    $("pettyCategory")?.value ||
    "Other";

  const amount =
    number(
      $("pettyAmount")?.value
    );

  const notes =
    $("pettyNotes")?.value
      .trim() || null;

  if (!description) {
    showToast(
      "Description is required.",
      "error"
    );
    return;
  }

  if (!paidTo) {
    showToast(
      "Paid To is required.",
      "error"
    );
    return;
  }

  if (amount <= 0) {
    showToast(
      "Amount must be greater than zero.",
      "error"
    );
    return;
  }

  const payload = {
    cash_date: cashDate,
    description,
    paid_to: paidTo,
    category,
    amount,
    notes
  };

  try {
    let result;

    if (editingPettyId) {
      result =
        await supabase
          .from("petty_cash")
          .update(payload)
          .eq("id", editingPettyId);
    } else {
      result =
        await supabase
          .from("petty_cash")
          .insert([payload]);
    }

    if (result.error) {
      console.error(
        "savePetty:",
        result.error
      );

      showToast(
        result.error.message ||
          "Unable to save petty cash.",
        "error"
      );

      return;
    }

    showToast(
      editingPettyId
        ? "Petty cash updated successfully."
        : "Petty cash added successfully."
    );

    closeModal("pettyModal");

    resetPettyForm();

    await loadAllData();

  } catch (error) {
    console.error(
      "savePetty exception:",
      error
    );

    showToast(
      "Unable to save petty cash.",
      "error"
    );
  }
}

/* =========================================================
   DELETE PETTY CASH
   ========================================================= */

async function deletePetty(id) {
  if (!id) return;

  const item =
    pettyCash.find(
      (row) =>
        String(row.id) ===
        String(id)
    );

  if (!item) return;

  const confirmed =
    confirm(
      `Delete petty cash entry "${
        item.description || ""
      }"?`
    );

  if (!confirmed) return;

  try {
    const result =
      await supabase
        .from("petty_cash")
        .delete()
        .eq("id", id);

    if (result.error) {
      console.error(
        "deletePetty:",
        result.error
      );

      showToast(
        result.error.message ||
          "Unable to delete petty cash.",
        "error"
      );

      return;
    }

    showToast(
      "Petty cash deleted successfully."
    );

    await loadAllData();

  } catch (error) {
    console.error(
      "deletePetty exception:",
      error
    );

    showToast(
      "Unable to delete petty cash.",
      "error"
    );
  }
}

/* =========================================================
   RENDER PETTY CASH
   ========================================================= */

function renderPettyCash() {
  const body =
    $("pettyCashTableBody");

  if (!body) return;

  const search =
    (
      $("pettySearch")?.value ||
      ""
    )
      .trim()
      .toLowerCase();

  const categoryFilter =
    $("pettyCategoryFilter")
      ?.value || "";

  const filtered =
    pettyCash.filter((item) => {
      const text =
        [
          item.description,
          item.paid_to,
          item.category,
          item.notes
        ]
          .join(" ")
          .toLowerCase();

      const matchesSearch =
        !search ||
        text.includes(search);

      const matchesCategory =
        !categoryFilter ||
        item.category ===
          categoryFilter;

      return (
        matchesSearch &&
        matchesCategory
      );
    });

  if (!filtered.length) {
    body.innerHTML =
      `<tr>
        <td colspan="7" class="empty-state">
          No petty cash records found
        </td>
      </tr>`;

    return;
  }

  body.innerHTML =
    filtered
      .map(
        (item) => `
          <tr>
            <td>
              ${escapeHtml(
                formatDate(
                  item.cash_date
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                item.description ||
                  "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                item.paid_to ||
                  "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                item.category ||
                  "—"
              )}
            </td>

            <td>
              ${money(
                item.amount
              )}
            </td>

            <td>
              ${escapeHtml(
                item.notes ||
                  "—"
              )}
            </td>

            <td>
              <div class="table-actions">
                <button
                  class="btn btn-sm"
                  onclick="openPettyModal('${escapeHtml(
                    item.id
                  )}')">
                  Edit
                </button>

                <button
                  class="btn btn-sm btn-danger"
                  onclick="deletePetty('${escapeHtml(
                    item.id
                  )}')">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");
}

/* =========================================================
   REQUISITION HELPERS
   ========================================================= */

function getUniqueReqNumbers() {
  return [
    ...new Set(
      requisitions
        .map((r) => r.req_no)
        .filter(Boolean)
    )
  ];
}

function getRequisitionRows(reqNo) {
  return requisitions.filter(
    (r) =>
      String(r.req_no) ===
      String(reqNo)
  );
}

function requisitionTotal(reqNo) {
  return getRequisitionRows(
    reqNo
  ).reduce(
    (sum, row) =>
      sum +
      number(row.total_amount),
    0
  );
}

function requisitionReceived(reqNo) {
  return getRequisitionRows(
    reqNo
  ).filter(
    (row) =>
      normalizeStatus(row.status) ===
      "Completed"
  ).length;
}

function requisitionFinance(reqNo) {
  const rows =
    getRequisitionRows(reqNo);

  const total =
    rows.reduce(
      (sum, row) =>
        sum +
        number(row.total_amount),
      0
    );

  const purchased =
    rows
      .filter(
        (row) =>
          [
            "Purchased",
            "Completed"
          ].includes(
            normalizeStatus(
              row.status
            )
          )
      )
      .reduce(
        (sum, row) =>
          sum +
          number(row.total_amount),
        0
      );

  return {
    total,
    purchased,
    balance:
      Math.max(
        0,
        total - purchased
      )
  };
}

function getRequisitionVehicle(req) {
  if (!req) return null;

  return vehicles.find(
    (vehicle) =>
      String(vehicle.id) ===
      String(req.vehicle_id)
  );
}

/* =========================================================
   RENDER REQUISITIONS
   ========================================================= */

function renderRequisitions() {
  const body =
    $("requisitionsTableBody");

  if (!body) return;

  const search =
    (
      $("reqSearch")?.value ||
      ""
    )
      .trim()
      .toLowerCase();

  const statusFilter =
    $("reqStatusFilter")
      ?.value || "";

  const grouped = {};

  requisitions.forEach((row) => {
    const key =
      row.req_no ||
      row.id;

    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push(row);
  });

  let rows = Object.entries(
    grouped
  ).map(
    ([reqNo, items]) => {
      const first =
        items[0];

      const vehicle =
        getRequisitionVehicle(
          first
        );

      const total =
        items.reduce(
          (sum, item) =>
            sum +
            number(
              item.total_amount
            ),
          0
        );

      const statuses =
        [
          ...new Set(
            items.map(
              (item) =>
                normalizeStatus(
                  item.status
                )
            )
          )
        ];

      const status =
        statuses.length === 1
          ? statuses[0]
          : "Mixed";

      return {
        reqNo,
        first,
        vehicle,
        total,
        status,
        items
      };
    }
  );

  rows =
    rows.filter((row) => {
      const text =
        [
          row.reqNo,
          row.first.requested_by,
          row.first.item_description,
          row.vehicle?.registration,
          row.vehicle?.customer,
          row.status
        ]
          .join(" ")
          .toLowerCase();

      const matchesSearch =
        !search ||
        text.includes(search);

      const matchesStatus =
        !statusFilter ||
        row.status === statusFilter ||
        row.items.some(
          (item) =>
            normalizeStatus(
              item.status
            ) === statusFilter
        );

      return (
        matchesSearch &&
        matchesStatus
      );
    });

  rows.sort(
    (a, b) =>
      new Date(
        b.first.req_date || 0
      ) -
      new Date(
        a.first.req_date || 0
      )
  );

  if (!rows.length) {
    body.innerHTML =
      `<tr>
        <td colspan="9" class="empty-state">
          No requisitions found
        </td>
      </tr>`;

    return;
  }

  body.innerHTML =
    rows
      .map((row) => {
        const received =
          requisitionReceived(
            row.reqNo
          );

        return `
          <tr>
            <td>
              <strong>
                ${escapeHtml(
                  row.reqNo || "—"
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                formatDate(
                  row.first.req_date
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                row.first.requested_by ||
                  "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                row.vehicle?.registration ||
                  "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                row.first.item_description ||
                  "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                row.first.quantity ||
                  "—"
              )}
            </td>

            <td>
              ${money(row.total)}
            </td>

            <td>
              ${statusBadge(
                row.status
              )}

              ${
                received
                  ? `<small>
                       ${received} completed
                     </small>`
                  : ""
              }
            </td>

            <td>
              <div class="table-actions">
                <button
                  class="btn btn-sm"
                  onclick="openReqModal('${escapeHtml(
                    row.reqNo
                  )}')">
                  Edit
                </button>

                <button
                  class="btn btn-sm"
                  onclick="printReq('${escapeHtml(
                    row.reqNo
                  )}')">
                  Print
                </button>

                <button
                  class="btn btn-sm btn-danger"
                  onclick="deleteReq('${escapeHtml(
                    row.reqNo
                  )}')">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
}

/* =========================================================
   REQUISITION FORM RESET
   ========================================================= */

function resetReqForm() {
  editingReqId = null;

  const form =
    $("reqForm");

  if (form) {
    form.reset();
  }

  const idField =
    $("reqId");

  if (idField) {
    idField.value = "";
  }

  if ($("reqNo")) {
    $("reqNo").value =
      generateNumber(
        "REQ",
        requisitions
      );
  }

  if ($("reqDate")) {
    $("reqDate").value =
      today();
  }

  if ($("reqStatus")) {
    $("reqStatus").value =
      "Pending";
  }

  if ($("reqQuantity")) {
    $("reqQuantity").value =
      "1";
  }

  if ($("reqUnitCost")) {
    $("reqUnitCost").value =
      "0";
  }

  if ($("reqTotalAmount")) {
    $("reqTotalAmount").value =
      "0";
  }

  populateVehicleSelects();

  calculateReqTotal();
}

/* =========================================================
   OPEN REQUISITION MODAL
   ========================================================= */

function openReqModal(reqNo = null) {
  populateVehicleSelects();

  if (!reqNo) {
    resetReqForm();
    openModal("reqModal");
    return;
  }

  const rows =
    getRequisitionRows(
      reqNo
    );

  if (!rows.length) {
    showToast(
      "Requisition not found.",
      "error"
    );
    return;
  }

  /*
   * Existing requisitions can contain
   * multiple rows with the same req_no.
   * Edit the first row through the
   * existing single-entry form.
   */
  const row =
    rows[0];

  editingReqId =
    row.id;

  const set = (field, value) => {
    const element = $(field);

    if (element) {
      element.value =
        value ?? "";
    }
  };

  set(
    "reqId",
    row.id
  );

  set(
    "reqNo",
    row.req_no
  );

  set(
    "reqDate",
    row.req_date
  );

  set(
    "reqRequestedBy",
    row.requested_by
  );

  set(
    "reqVehicle",
    row.vehicle_id
  );

  set(
    "reqItemDescription",
    row.item_description
  );

  set(
    "reqQuantity",
    row.quantity
  );

  set(
    "reqUnitCost",
    row.unit_cost
  );

  set(
    "reqTotalAmount",
    row.total_amount
  );

  set(
    "reqStatus",
    row.status || "Pending"
  );

  set(
    "reqNotes",
    row.notes
  );

  calculateReqTotal();

  openModal("reqModal");
}

/* =========================================================
   CALCULATE REQUISITION TOTAL
   ========================================================= */

function calculateReqTotal() {
  const quantity =
    number(
      $("reqQuantity")?.value
    );

  const unitCost =
    number(
      $("reqUnitCost")?.value
    );

  const total =
    quantity * unitCost;

  const field =
    $("reqTotalAmount");

  if (field) {
    field.value =
      total.toFixed(2);
  }

  return total;
}

/* =========================================================
   SAVE REQUISITION
   ========================================================= */

async function saveReq(event) {
  if (event) {
    event.preventDefault();
  }

  const reqNo =
    $("reqNo")?.value
      .trim() ||
    generateNumber(
      "REQ",
      requisitions
    );

  const reqDate =
    $("reqDate")?.value ||
    today();

  const requestedBy =
    $("reqRequestedBy")?.value
      .trim();

  const vehicleId =
    $("reqVehicle")?.value ||
    null;

  const itemDescription =
    $("reqItemDescription")?.value
      .trim();

  const quantity =
    number(
      $("reqQuantity")?.value
    );

  const unitCost =
    number(
      $("reqUnitCost")?.value
    );

  const totalAmount =
    quantity * unitCost;

  const status =
    $("reqStatus")?.value ||
    "Pending";

  const notes =
    $("reqNotes")?.value
      .trim() || null;

  if (!requestedBy) {
    showToast(
      "Requested By is required.",
      "error"
    );
    return;
  }

  if (!itemDescription) {
    showToast(
      "Item description is required.",
      "error"
    );
    return;
  }

  if (quantity <= 0) {
    showToast(
      "Quantity must be greater than zero.",
      "error"
    );
    return;
  }

  if (unitCost < 0) {
    showToast(
      "Unit cost cannot be negative.",
      "error"
    );
    return;
  }

  /*
   * Keep the existing Supabase schema.
   * Category / expense type fields in
   * the HTML are not added to the payload
   * unless those columns exist in the
   * user's actual table.
   */
  const payload = {
    req_no: reqNo,
    req_date: reqDate,
    requested_by: requestedBy,
    vehicle_id: vehicleId,
    item_description: itemDescription,
    quantity,
    unit_cost: unitCost,
    total_amount: totalAmount,
    status,
    notes
  };

  try {
    let result;

    if (editingReqId) {
      result =
        await supabase
          .from("requisitions")
          .update(payload)
          .eq("id", editingReqId);
    } else {
      result =
        await supabase
          .from("requisitions")
          .insert([payload]);
    }

    if (result.error) {
      console.error(
        "saveReq:",
        result.error
      );

      showToast(
        result.error.message ||
          "Unable to save requisition.",
        "error"
      );

      return;
    }

    showToast(
      editingReqId
        ? "Requisition updated successfully."
        : "Requisition created successfully."
    );

    closeModal("reqModal");

    resetReqForm();

    await loadAllData();

  } catch (error) {
    console.error(
      "saveReq exception:",
      error
    );

    showToast(
      "Unable to save requisition.",
      "error"
    );
  }
}

/* =========================================================
   DELETE REQUISITION
   ========================================================= */

async function deleteReq(reqNo) {
  if (!reqNo) return;

  const rows =
    getRequisitionRows(
      reqNo
    );

  if (!rows.length) return;

  const confirmed =
    confirm(
      `Delete requisition ${
        reqNo
      }?`
    );

  if (!confirmed) return;

  try {
    const result =
      await supabase
        .from("requisitions")
        .delete()
        .eq("req_no", reqNo);

    if (result.error) {
      console.error(
        "deleteReq:",
        result.error
      );

      showToast(
        result.error.message ||
          "Unable to delete requisition.",
        "error"
      );

      return;
    }

    showToast(
      "Requisition deleted successfully."
    );

    await loadAllData();

  } catch (error) {
    console.error(
      "deleteReq exception:",
      error
    );

    showToast(
      "Unable to delete requisition.",
      "error"
    );
  }
}

/* =========================================================
   PART 3 — END 350
   ========================================================= */

/* =========================================================
   PART 4 — INVOICES + GATE PASSES
   CONTINUES DIRECTLY FROM PART 3
   ========================================================= */

/* =========================================================
   INVOICE / GATE PASS UI CREATION
   ========================================================= */

function ensureInvoiceGatePassUI() {
  createInvoiceSection();
  createGatePassSection();
  createInvoiceModal();
  createGatePassModal();
  addNewNavigationButtons();
}

/* =========================================================
   ADD NAVIGATION BUTTONS
   ========================================================= */

function addNewNavigationButtons() {
  const sidebar =
    document.querySelector(
      ".sidebar nav"
    ) ||
    document.querySelector(
      ".sidebar"
    );

  if (sidebar) {
    if (
      !document.querySelector(
        '[data-section="invoices"]'
      )
    ) {
      const button =
        document.createElement("button");

      button.className =
        "nav-item";

      button.setAttribute(
        "data-section",
        "invoices"
      );

      button.innerHTML =
        "Invoices";

      button.onclick = () =>
        showSection("invoices");

      sidebar.appendChild(button);
    }

    if (
      !document.querySelector(
        '[data-section="gatePasses"]'
      )
    ) {
      const button =
        document.createElement("button");

      button.className =
        "nav-item";

      button.setAttribute(
        "data-section",
        "gatePasses"
      );

      button.innerHTML =
        "Gate Passes";

      button.onclick = () =>
        showSection("gatePasses");

      sidebar.appendChild(button);
    }
  }
}

/* =========================================================
   INVOICE SECTION
   ========================================================= */

function createInvoiceSection() {
  if ($("invoices")) {
    return;
  }

  const main =
    document.querySelector(
      "main"
    ) ||
    document.querySelector(
      ".main-content"
    ) ||
    document.body;

  const section =
    document.createElement("section");

  section.id =
    "invoices";

  section.className =
    "page-section";

  section.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Invoices</h2>
        <p>Manage customer invoices</p>
      </div>

      <button
        class="btn btn-primary"
        onclick="openInvoiceModal()">
        + New Invoice
      </button>
    </div>

    <div class="toolbar">
      <input
        id="invoiceSearch"
        class="search-input"
        type="search"
        placeholder="Search invoices...">

      <select
        id="invoiceStatusFilter"
        class="filter-select">
        <option value="">All Statuses</option>
        <option value="Paid">Paid</option>
        <option value="Part Paid">Part Paid</option>
        <option value="Unpaid">Unpaid</option>
      </select>

      <button
        class="btn"
        onclick="printInvoices()">
        Print
      </button>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Invoice No.</th>
            <th>Date</th>
            <th>Vehicle</th>
            <th>Customer</th>
            <th>Subtotal</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody id="invoicesTableBody"></tbody>
      </table>
    </div>
  `;

  main.appendChild(section);
}

/* =========================================================
   GATE PASS SECTION
   ========================================================= */

function createGatePassSection() {
  if ($("gatePasses")) {
    return;
  }

  const main =
    document.querySelector(
      "main"
    ) ||
    document.querySelector(
      ".main-content"
    ) ||
    document.body;

  const section =
    document.createElement("section");

  section.id =
    "gatePasses";

  section.className =
    "page-section";

  section.innerHTML = `
    <div class="page-header">
      <div>
        <h2>Gate Passes</h2>
        <p>Vehicle release records</p>
      </div>

      <button
        class="btn btn-primary"
        onclick="openGatePassModal()">
        + New Gate Pass
      </button>
    </div>

    <div class="toolbar">
      <input
        id="gateSearch"
        class="search-input"
        type="search"
        placeholder="Search gate passes...">

      <select
        id="gateStatusFilter"
        class="filter-select">
        <option value="">All Statuses</option>
        <option value="Released">Released</option>
        <option value="Pending">Pending</option>
      </select>

      <button
        class="btn"
        onclick="printGatePasses()">
        Print
      </button>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Gate Pass No.</th>
            <th>Date</th>
            <th>Vehicle</th>
            <th>Customer</th>
            <th>Released To</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody id="gatePassesTableBody"></tbody>
      </table>
    </div>
  `;

  main.appendChild(section);
}

/* =========================================================
   INVOICE MODAL
   ========================================================= */

function createInvoiceModal() {
  if ($("invoiceModal")) {
    return;
  }

  const modal =
    document.createElement("div");

  modal.id =
    "invoiceModal";

  modal.className =
    "modal";

  modal.innerHTML = `
    <div class="modal-content">

      <div class="modal-header">
        <h3 id="invoiceModalTitle">
          New Invoice
        </h3>

        <button
          type="button"
          class="modal-close"
          onclick="closeModal('invoiceModal')">
          ×
        </button>
      </div>

      <form id="invoiceForm">

        <input
          type="hidden"
          id="invoiceId">

        <div class="form-grid">

          <div class="form-group">
            <label>Invoice No.</label>
            <input
              id="invoiceNo"
              required>
          </div>

          <div class="form-group">
            <label>Invoice Date</label>
            <input
              id="invoiceDate"
              type="date"
              required>
          </div>

          <div class="form-group">
            <label>Vehicle</label>
            <select
              id="invoiceVehicle"
              required>
            </select>
          </div>

          <div class="form-group">
            <label>Customer</label>
            <input
              id="invoiceCustomer"
              readonly>
          </div>

          <div class="form-group">
            <label>Job Description</label>
            <input
              id="invoiceJobDescription">
          </div>

          <div class="form-group">
            <label>Labour</label>
            <input
              id="invoiceLabour"
              type="number"
              min="0"
              step="0.01"
              value="0">
          </div>

          <div class="form-group">
            <label>Parts / Materials</label>
            <input
              id="invoiceParts"
              type="number"
              min="0"
              step="0.01"
              value="0">
          </div>

          <div class="form-group">
            <label>Other</label>
            <input
              id="invoiceOther"
              type="number"
              min="0"
              step="0.01"
              value="0">
          </div>

          <div class="form-group">
            <label>Subtotal</label>
            <input
              id="invoiceSubtotal"
              type="number"
              readonly>
          </div>

          <div class="form-group">
            <label>Amount Paid</label>
            <input
              id="invoicePaid"
              type="number"
              min="0"
              step="0.01"
              value="0">
          </div>

          <div class="form-group">
            <label>Balance</label>
            <input
              id="invoiceBalance"
              type="number"
              readonly>
          </div>

          <div class="form-group">
            <label>Status</label>
            <select id="invoiceStatus">
              <option value="Unpaid">
                Unpaid
              </option>
              <option value="Part Paid">
                Part Paid
              </option>
              <option value="Paid">
                Paid
              </option>
            </select>
          </div>

          <div class="form-group form-group-full">
            <label>Notes</label>
            <textarea
              id="invoiceNotes"
              rows="3">
            </textarea>
          </div>

        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="btn"
            onclick="closeModal('invoiceModal')">
            Cancel
          </button>

          <button
            type="submit"
            class="btn btn-primary">
            Save Invoice
          </button>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modal);
}

/* =========================================================
   GATE PASS MODAL
   ========================================================= */

function createGatePassModal() {
  if ($("gatePassModal")) {
    return;
  }

  const modal =
    document.createElement("div");

  modal.id =
    "gatePassModal";

  modal.className =
    "modal";

  modal.innerHTML = `
    <div class="modal-content">

      <div class="modal-header">
        <h3 id="gatePassModalTitle">
          New Gate Pass
        </h3>

        <button
          type="button"
          class="modal-close"
          onclick="closeModal('gatePassModal')">
          ×
        </button>
      </div>

      <form id="gatePassForm">

        <input
          type="hidden"
          id="gatePassId">

        <div class="form-grid">

          <div class="form-group">
            <label>Gate Pass No.</label>
            <input
              id="gatePassNo"
              required>
          </div>

          <div class="form-group">
            <label>Date</label>
            <input
              id="gatePassDate"
              type="date"
              required>
          </div>

          <div class="form-group">
            <label>Vehicle</label>
            <select
              id="gateVehicle"
              required>
            </select>
          </div>

          <div class="form-group">
            <label>Customer</label>
            <input
              id="gateCustomer"
              readonly>
          </div>

          <div class="form-group">
            <label>Released To</label>
            <input
              id="gateReleasedTo">
          </div>

          <div class="form-group">
            <label>Contact</label>
            <input
              id="gateReleasedContact">
          </div>

          <div class="form-group">
            <label>Invoice</label>
            <select
              id="gateInvoice">
              <option value="">
                Select Invoice
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Paid</label>
            <input
              id="gatePaid"
              type="number"
              readonly>
          </div>

          <div class="form-group">
            <label>Balance</label>
            <input
              id="gateBalance"
              type="number"
              readonly>
          </div>

          <div class="form-group">
            <label>Authorized By</label>
            <input
              id="gateAuthorizedBy">
          </div>

          <div class="form-group">
            <label>Status</label>
            <select id="gateStatus">
              <option value="Pending">
                Pending
              </option>
              <option value="Released">
                Released
              </option>
            </select>
          </div>

          <div class="form-group form-group-full">
            <label>Notes</label>
            <textarea
              id="gateNotes"
              rows="3">
            </textarea>
          </div>

        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="btn"
            onclick="closeModal('gatePassModal')">
            Cancel
          </button>

          <button
            type="submit"
            class="btn btn-primary">
            Save Gate Pass
          </button>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modal);
}

/* =========================================================
   CALCULATE VEHICLE CHARGES
   ========================================================= */

function calculateVehicleCharges(vehicleId) {
  let labour = 0;
  let parts = 0;
  let other = 0;

  expenses
    .filter(
      (expense) =>
        String(expense.vehicle_id) ===
        String(vehicleId)
    )
    .forEach((expense) => {
      const category =
        String(
          expense.category || ""
        ).toLowerCase();

      const amount =
        number(expense.amount);

      if (
        category === "labour" ||
        category === "labor"
      ) {
        labour += amount;
      } else if (
        category === "parts" ||
        category === "materials" ||
        category === "material"
      ) {
        parts += amount;
      } else {
        other += amount;
      }
    });

  /*
   * Requisition totals connected to
   * the same vehicle are treated as
   * parts/materials.
   */
  requisitions
    .filter(
      (req) =>
        String(req.vehicle_id) ===
        String(vehicleId)
    )
    .forEach((req) => {
      parts +=
        number(req.total_amount);
    });

  return {
    labour,
    parts,
    other,
    subtotal:
      labour +
      parts +
      other
  };
}

/* =========================================================
   AUTO CALCULATE INVOICE
   ========================================================= */

function autoCalculateInvoice() {
  const vehicleId =
    $("invoiceVehicle")?.value;

  if (!vehicleId) {
    calculateInvoiceTotals();
    return;
  }

  const vehicle =
    vehicles.find(
      (v) =>
        String(v.id) ===
        String(vehicleId)
    );

  if (vehicle) {
    if ($("invoiceCustomer")) {
      $("invoiceCustomer").value =
        vehicle.customer || "";
    }

    if (
      $("invoiceJobDescription") &&
      !$("invoiceJobDescription").value
    ) {
      $("invoiceJobDescription").value =
        vehicle.description || "";
    }
  }

  const charges =
    calculateVehicleCharges(
      vehicleId
    );

  if ($("invoiceLabour")) {
    $("invoiceLabour").value =
      charges.labour.toFixed(2);
  }

  if ($("invoiceParts")) {
    $("invoiceParts").value =
      charges.parts.toFixed(2);
  }

  if ($("invoiceOther")) {
    $("invoiceOther").value =
      charges.other.toFixed(2);
  }

  calculateInvoiceTotals();
}

/* =========================================================
   INVOICE TOTALS
   ========================================================= */

function calculateInvoiceTotals() {
  const labour =
    number(
      $("invoiceLabour")?.value
    );

  const parts =
    number(
      $("invoiceParts")?.value
    );

  const other =
    number(
      $("invoiceOther")?.value
    );

  const paid =
    number(
      $("invoicePaid")?.value
    );

  const subtotal =
    labour +
    parts +
    other;

  const balance =
    Math.max(
      0,
      subtotal - paid
    );

  if ($("invoiceSubtotal")) {
    $("invoiceSubtotal").value =
      subtotal.toFixed(2);
  }

  if ($("invoiceBalance")) {
    $("invoiceBalance").value =
      balance.toFixed(2);
  }

  if ($("invoiceStatus")) {
    $("invoiceStatus").value =
      paid >= subtotal &&
      subtotal > 0
        ? "Paid"
        : paid > 0
        ? "Part Paid"
        : "Unpaid";
  }

  return {
    subtotal,
    paid,
    balance
  };
}

/* =========================================================
   RESET INVOICE
   ========================================================= */

function resetInvoiceForm() {
  editingInvoiceId = null;

  const form =
    $("invoiceForm");

  if (form) {
    form.reset();
  }

  if ($("invoiceId")) {
    $("invoiceId").value = "";
  }

  if ($("invoiceNo")) {
    $("invoiceNo").value =
      generateNumber(
        "INV",
        invoices
      );
  }

  if ($("invoiceDate")) {
    $("invoiceDate").value =
      today();
  }

  if ($("invoiceLabour")) {
    $("invoiceLabour").value =
      "0";
  }

  if ($("invoiceParts")) {
    $("invoiceParts").value =
      "0";
  }

  if ($("invoiceOther")) {
    $("invoiceOther").value =
      "0";
  }

  if ($("invoicePaid")) {
    $("invoicePaid").value =
      "0";
  }

  if ($("invoiceStatus")) {
    $("invoiceStatus").value =
      "Unpaid";
  }

  populateInvoiceSelect();

  populateVehicleSelects();

  calculateInvoiceTotals();
}

/* =========================================================
   POPULATE INVOICE VEHICLE SELECT
   ========================================================= */

function populateInvoiceSelect() {
  const vehicleSelect =
    $("invoiceVehicle");

  if (vehicleSelect) {
    const current =
      vehicleSelect.value;

    vehicleSelect.innerHTML =
      vehicleOptionList(true);

    if (
      current &&
      vehicleSelect.querySelector(
        `option[value="${CSS.escape(
          current
        )}"]`
      )
    ) {
      vehicleSelect.value =
        current;
    }
  }

  const invoiceSelect =
    $("gateInvoice");

  if (invoiceSelect) {
    const current =
      invoiceSelect.value;

    invoiceSelect.innerHTML =
      `<option value="">
        Select Invoice
      </option>` +
      invoices
        .map(
          (invoice) => `
            <option value="${escapeHtml(
              invoice.id
            )}">
              ${escapeHtml(
                invoice.invoice_no ||
                  "—"
              )}
            </option>
          `
        )
        .join("");

    if (
      current &&
      invoiceSelect.querySelector(
        `option[value="${CSS.escape(
          current
        )}"]`
      )
    ) {
      invoiceSelect.value =
        current;
    }
  }
}

/* =========================================================
   OPEN INVOICE MODAL
   ========================================================= */

function openInvoiceModal(id = null) {
  populateVehicleSelects();
  populateInvoiceSelect();

  if (!id) {
    resetInvoiceForm();
    openModal("invoiceModal");
    return;
  }

  const invoice =
    invoices.find(
      (item) =>
        String(item.id) ===
        String(id)
    );

  if (!invoice) {
    showToast(
      "Invoice not found.",
      "error"
    );
    return;
  }

  editingInvoiceId =
    invoice.id;

  const set = (field, value) => {
    const element = $(field);

    if (element) {
      element.value =
        value ?? "";
    }
  };

  set(
    "invoiceId",
    invoice.id
  );

  set(
    "invoiceNo",
    invoice.invoice_no
  );

  set(
    "invoiceDate",
    invoice.invoice_date
  );

  set(
    "invoiceVehicle",
    invoice.vehicle_id
  );

  set(
    "invoiceCustomer",
    invoice.customer
  );

  set(
    "invoiceJobDescription",
    invoice.job_description
  );

  set(
    "invoiceLabour",
    invoice.labour
  );

  set(
    "invoiceParts",
    invoice.parts
  );

  set(
    "invoiceOther",
    invoice.other
  );

  set(
    "invoicePaid",
    invoice.paid
  );

  set(
    "invoiceStatus",
    invoice.status
  );

  set(
    "invoiceNotes",
    invoice.notes
  );

  calculateInvoiceTotals();

  openModal("invoiceModal");
}

/* =========================================================
   SAVE INVOICE
   ========================================================= */

async function saveInvoice(event) {
  if (event) {
    event.preventDefault();
  }

  const invoiceNo =
    $("invoiceNo")?.value
      .trim() ||
    generateNumber(
      "INV",
      invoices
    );

  const invoiceDate =
    $("invoiceDate")?.value ||
    today();

  const vehicleId =
    $("invoiceVehicle")?.value ||
    null;

  const vehicle =
    vehicles.find(
      (v) =>
        String(v.id) ===
        String(vehicleId)
    );

  const customer =
    $("invoiceCustomer")?.value
      .trim() ||
    vehicle?.customer ||
    "";

  const jobDescription =
    $("invoiceJobDescription")
      ?.value.trim() ||
    "";

  const totals =
    calculateInvoiceTotals();

  const status =
    $("invoiceStatus")?.value ||
    "Unpaid";

  const notes =
    $("invoiceNotes")?.value
      .trim() || null;

  if (!vehicleId) {
    showToast(
      "Please select a vehicle.",
      "error"
    );
    return;
  }

  if (!customer) {
    showToast(
      "Customer is required.",
      "error"
    );
    return;
  }

  const payload = {
    invoice_no: invoiceNo,
    invoice_date: invoiceDate,
    vehicle_id: vehicleId,
    customer,
    job_description: jobDescription,
    labour:
      number(
        $("invoiceLabour")?.value
      ),
    parts:
      number(
        $("invoiceParts")?.value
      ),
    other:
      number(
        $("invoiceOther")?.value
      ),
    subtotal:
      totals.subtotal,
    paid:
      totals.paid,
    balance:
      totals.balance,
    status,
    notes
  };

  try {
    let result;

    if (editingInvoiceId) {
      result =
        await supabase
          .from("invoices")
          .update(payload)
          .eq("id", editingInvoiceId);
    } else {
      result =
        await supabase
          .from("invoices")
          .insert([payload]);
    }

    if (result.error) {
      console.error(
        "saveInvoice:",
        result.error
      );

      showToast(
        result.error.message ||
          "Unable to save invoice.",
        "error"
      );

      return;
    }

    showToast(
      editingInvoiceId
        ? "Invoice updated successfully."
        : "Invoice created successfully."
    );

    closeModal("invoiceModal");

    resetInvoiceForm();

    await loadAllData();

  } catch (error) {
    console.error(
      "saveInvoice exception:",
      error
    );

    showToast(
      "Unable to save invoice.",
      "error"
    );
  }
}

/* =========================================================
   RENDER INVOICES
   ========================================================= */

function renderInvoices() {
  const body =
    $("invoicesTableBody");

  if (!body) return;

  const search =
    (
      $("invoiceSearch")?.value ||
      ""
    )
      .trim()
      .toLowerCase();

  const statusFilter =
    $("invoiceStatusFilter")
      ?.value || "";

  const filtered =
    invoices.filter((invoice) => {
      const vehicle =
        vehicles.find(
          (v) =>
            String(v.id) ===
            String(invoice.vehicle_id)
        );

      const text =
        [
          invoice.invoice_no,
          invoice.customer,
          vehicle?.registration,
          invoice.job_description,
          invoice.status
        ]
          .join(" ")
          .toLowerCase();

      return (
        (!search ||
          text.includes(search)) &&
        (!statusFilter ||
          invoice.status ===
            statusFilter)
      );
    });

  if (!filtered.length) {
    body.innerHTML =
      `<tr>
        <td colspan="9" class="empty-state">
          No invoices found
        </td>
      </tr>`;

    return;
  }

  body.innerHTML =
    filtered
      .map((invoice) => {
        const vehicle =
          vehicles.find(
            (v) =>
              String(v.id) ===
              String(
                invoice.vehicle_id
              )
          );

        return `
          <tr>
            <td>
              <strong>
                ${escapeHtml(
                  invoice.invoice_no ||
                    "—"
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                formatDate(
                  invoice.invoice_date
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                vehicle?.registration ||
                  "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                invoice.customer ||
                  "—"
              )}
            </td>

            <td>
              ${money(
                invoice.subtotal
              )}
            </td>

            <td>
              ${money(
                invoice.paid
              )}
            </td>

            <td>
              ${money(
                invoice.balance
              )}
            </td>

            <td>
              ${statusBadge(
                invoice.status
              )}
            </td>

            <td>
              <div class="table-actions">
                <button
                  class="btn btn-sm"
                  onclick="openInvoiceModal('${escapeHtml(
                    invoice.id
                  )}')">
                  Edit
                </button>

                <button
                  class="btn btn-sm"
                  onclick="printInvoice('${escapeHtml(
                    invoice.id
                  )}')">
                  Print
                </button>

                <button
                  class="btn btn-sm btn-danger"
                  onclick="deleteInvoice('${escapeHtml(
                    invoice.id
                  )}')">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
}

/* =========================================================
   DELETE INVOICE
   ========================================================= */

async function deleteInvoice(id) {
  const invoice =
    invoices.find(
      (item) =>
        String(item.id) ===
        String(id)
    );

  if (!invoice) return;

  if (
    !confirm(
      `Delete invoice ${
        invoice.invoice_no || ""
      }?`
    )
  ) {
    return;
  }

  const result =
    await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

  if (result.error) {
    console.error(
      "deleteInvoice:",
      result.error
    );

    showToast(
      result.error.message ||
        "Unable to delete invoice.",
      "error"
    );

    return;
  }

  showToast(
    "Invoice deleted successfully."
  );

  await loadAllData();
}

/* =========================================================
   PART 4 — END 
   ========================================================= */

