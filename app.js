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
   ========================================================= ×/*/

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="theme-color" content="#07111f">
<title>Garage Operations Pro</title>

<style>
:root{
--bg:#f5f7fb;
--card:#fff;
--navy:#07111f;
--navy2:#0d1b2e;
--blue:#2563eb;
--blue2:#3b82f6;
--cyan:#06b6d4;
--green:#16a34a;
--orange:#f59e0b;
--red:#dc2626;
--purple:#7c3aed;
--text:#0f172a;
--muted:#64748b;
--border:#e5e7eb;
--soft:#f8fafc;
--shadow:0 8px 28px rgba(15,23,42,.06);
--shadow2:0 20px 60px rgba(15,23,42,.15);
--radius:18px;
}

*{box-sizing:border-box;margin:0;padding:0}

html,body{
width:100%;
min-height:100%;
font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
background:var(--bg);
color:var(--text);
}

body{overflow-x:hidden}

button,input,select,textarea{font:inherit}
button{cursor:pointer}
.hidden{display:none!important}

/* LOGIN */

#loginPage{
min-height:100vh;
min-height:100dvh;
display:flex;
align-items:center;
justify-content:center;
padding:20px;
position:relative;
overflow:hidden;
background:
linear-gradient(135deg,rgba(3,10,20,.96),rgba(7,17,31,.78)),
url("https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1800&q=85")
center/cover no-repeat;
}

.login-glow{
position:absolute;
width:420px;height:420px;border-radius:50%;
background:rgba(37,99,235,.22);
filter:blur(100px);
top:-150px;right:-100px;
}

.login-glow2{
position:absolute;
width:350px;height:350px;border-radius:50%;
background:rgba(6,182,212,.12);
filter:blur(100px);
bottom:-150px;left:-100px;
}

.login-card{
width:100%;
max-width:430px;
position:relative;
z-index:2;
padding:34px 28px 28px;
background:rgba(255,255,255,.97);
border:1px solid rgba(255,255,255,.6);
border-radius:28px;
box-shadow:0 30px 100px rgba(0,0,0,.38);
backdrop-filter:blur(20px);
}

.brand-mark{
width:68px;height:68px;
border-radius:20px;
margin:0 auto 20px;
display:flex;
align-items:center;
justify-content:center;
background:linear-gradient(135deg,#2563eb,#06b6d4);
color:white;
font-size:28px;
font-weight:900;
box-shadow:0 15px 35px rgba(37,99,235,.32);
}

.login-card h1{
text-align:center;
font-size:27px;
letter-spacing:-.8px;
margin-bottom:7px;
}

.login-subtitle{
text-align:center;
color:var(--muted);
font-size:14px;
margin-bottom:30px;
}

.login-label{
display:block;
font-size:13px;
font-weight:700;
margin-bottom:8px;
color:#334155;
}

.login-input{
width:100%;
height:52px;
border:1px solid var(--border);
border-radius:13px;
padding:0 15px;
outline:none;
background:#f8fafc;
margin-bottom:17px;
transition:.2s;
}

.login-input:focus{
background:white;
border-color:var(--blue);
box-shadow:0 0 0 4px rgba(37,99,235,.1);
}

.login-button{
width:100%;
height:53px;
border:0;
border-radius:14px;
color:white;
font-weight:800;
font-size:15px;
background:linear-gradient(135deg,#2563eb,#1d4ed8);
box-shadow:0 12px 25px rgba(37,99,235,.25);
}

.login-error{
color:#dc2626;
font-size:13px;
text-align:center;
margin-top:13px;
min-height:18px;
}

.login-footer{
text-align:center;
color:#94a3b8;
font-size:11px;
margin-top:25px;
}

/* APP */

#app{display:none;min-height:100vh}

.app-layout{min-height:100vh;display:flex}

/* SIDEBAR */

.sidebar{
width:250px;
flex-shrink:0;
background:linear-gradient(180deg,#07111f,#0a1728);
color:white;
padding:22px 15px;
display:flex;
flex-direction:column;
position:fixed;
left:0;top:0;bottom:0;
z-index:50;
}

.sidebar-brand{
padding:8px 10px 26px;
display:flex;
align-items:center;
gap:12px;
}

.sidebar-logo{
width:42px;height:42px;
border-radius:13px;
display:flex;
align-items:center;
justify-content:center;
background:linear-gradient(135deg,#2563eb,#06b6d4);
font-weight:900;
box-shadow:0 8px 20px rgba(37,99,235,.25);
}

.sidebar-brand strong{display:block;font-size:14px}
.sidebar-brand span{
display:block;
color:#94a3b8;
font-size:10px;
margin-top:2px;
}

.nav-title{
color:#64748b;
font-size:10px;
text-transform:uppercase;
letter-spacing:1.2px;
font-weight:800;
padding:10px 12px;
}

.sidebar nav{display:flex;flex-direction:column;gap:5px}

.nav-btn{
width:100%;
border:0;
background:transparent;
color:#94a3b8;
text-align:left;
padding:12px 13px;
border-radius:12px;
font-size:13px;
font-weight:650;
display:flex;
align-items:center;
gap:11px;
transition:.2s;
}

.nav-btn:hover{background:rgba(255,255,255,.06);color:white}

.nav-btn.active{
background:linear-gradient(90deg,rgba(37,99,235,.28),rgba(37,99,235,.08));
color:white;
box-shadow:inset 3px 0 0 #3b82f6;
}

.nav-icon{width:22px;text-align:center;font-size:16px}

.sidebar-bottom{
margin-top:auto;
padding:15px 8px 5px;
border-top:1px solid rgba(255,255,255,.07);
}

.user-mini{display:flex;align-items:center;gap:10px}

.user-avatar{
width:34px;height:34px;border-radius:50%;
background:linear-gradient(135deg,#2563eb,#06b6d4);
display:flex;align-items:center;justify-content:center;
font-weight:800;font-size:13px;
}

.user-mini strong{font-size:12px;display:block}
.user-mini span{font-size:10px;color:#64748b}

/* MAIN */

.main{
margin-left:250px;
width:calc(100% - 250px);
min-height:100vh;
}

.topbar{
height:70px;
background:rgba(255,255,255,.94);
border-bottom:1px solid var(--border);
display:flex;
align-items:center;
justify-content:space-between;
padding:0 28px;
position:sticky;
top:0;
z-index:40;
backdrop-filter:blur(14px);
}

.topbar-title strong{font-size:16px}
.topbar-title span{
display:block;color:var(--muted);
font-size:11px;margin-top:2px;
}

.topbar-right{display:flex;align-items:center;gap:12px}

.online-status{
display:flex;align-items:center;gap:7px;
color:#64748b;font-size:11px;
}

.online-dot{
width:7px;height:7px;background:#22c55e;border-radius:50%;
box-shadow:0 0 0 4px rgba(34,197,94,.1);
}

.content{
padding:28px;
max-width:1600px;
margin:auto;
}

/* PAGE */

.page-header{
display:flex;
justify-content:space-between;
align-items:flex-end;
gap:20px;
margin-bottom:25px;
}

.page-header h2{
font-size:27px;
letter-spacing:-.9px;
}

.page-header p{
color:var(--muted);
font-size:13px;
margin-top:5px;
}

.header-actions{display:flex;gap:8px;flex-wrap:wrap}

/* BUTTONS */

.btn{
min-height:40px;
padding:0 14px;
border:1px solid var(--border);
border-radius:10px;
background:white;
color:#334155;
font-weight:700;
font-size:12px;
display:inline-flex;
align-items:center;
justify-content:center;
gap:7px;
transition:.2s;
}

.btn:hover{transform:translateY(-1px);border-color:#cbd5e1}

.btn-primary{
color:white;
border-color:#2563eb;
background:linear-gradient(135deg,#2563eb,#1d4ed8);
box-shadow:0 7px 18px rgba(37,99,235,.18);
}

.btn-danger{color:#dc2626}

/* DASHBOARD */

.dashboard-welcome{margin-bottom:25px}

.dashboard-welcome h1{
font-size:29px;
letter-spacing:-1.1px;
}

.dashboard-welcome p{
color:var(--muted);
font-size:13px;
margin-top:5px;
}

.kpi-grid{
display:grid;
grid-template-columns:repeat(4,1fr);
gap:15px;
margin-bottom:20px;
}

.kpi-card{
background:white;
border:1px solid var(--border);
border-radius:18px;
padding:19px;
box-shadow:var(--shadow);
position:relative;
overflow:hidden;
}

.kpi-card::after{
content:"";
position:absolute;
width:75px;height:75px;
border-radius:50%;
right:-30px;top:-30px;
background:rgba(37,99,235,.06);
}

.kpi-top{
display:flex;
align-items:center;
justify-content:space-between;
}

.kpi-label{
color:var(--muted);
font-size:11px;
font-weight:700;
text-transform:uppercase;
letter-spacing:.5px;
}

.kpi-icon{
width:34px;height:34px;
border-radius:10px;
display:flex;
align-items:center;
justify-content:center;
background:#eff6ff;
color:#2563eb;
font-size:15px;
}

.kpi-value{
margin-top:15px;
font-size:27px;
letter-spacing:-.8px;
font-weight:800;
}

.kpi-meta{
color:#94a3b8;
font-size:10px;
margin-top:5px;
}

/* CARDS */

.section-card{
background:white;
border:1px solid var(--border);
border-radius:18px;
box-shadow:var(--shadow);
overflow:hidden;
}

.section-card-header{
padding:18px 20px;
display:flex;
justify-content:space-between;
align-items:center;
border-bottom:1px solid var(--border);
}

.section-card-header h3{font-size:14px}
.section-card-header span{font-size:11px;color:var(--muted)}

.financial-grid{
display:grid;
grid-template-columns:repeat(4,1fr);
}

.financial-item{
padding:20px;
border-right:1px solid var(--border);
}

.financial-item:last-child{border-right:0}

.financial-item label{
display:block;
color:var(--muted);
font-size:11px;
margin-bottom:8px;
}

.financial-item strong{font-size:19px}

.dashboard-columns{
display:grid;
grid-template-columns:1.35fr .65fr;
gap:18px;
margin-top:18px;
}

.activity-list{padding:5px 20px 10px}

.activity-item{
display:flex;
align-items:center;
gap:12px;
padding:14px 0;
border-bottom:1px solid #f1f5f9;
}

.activity-item:last-child{border-bottom:0}

.activity-icon{
width:38px;height:38px;
border-radius:11px;
background:#f1f5f9;
display:flex;
align-items:center;
justify-content:center;
}

.activity-main{flex:1}
.activity-main strong{display:block;font-size:12px}
.activity-main span{
display:block;
font-size:10px;
color:var(--muted);
margin-top:3px;
}

.status{
display:inline-flex;
padding:5px 9px;
border-radius:999px;
font-size:10px;
font-weight:800;
}

.status-under-repair{color:#92400e;background:#fef3c7}
.status-completed{color:#166534;background:#dcfce7}
.status-pending{color:#92400e;background:#fef3c7}
.status-approved{color:#1d4ed8;background:#dbeafe}
.status-purchased{color:#166534;background:#dcfce7}
.status-rejected{color:#991b1b;background:#fee2e2}
.status-default{color:#475569;background:#f1f5f9}

/* QUICK ACTIONS */

.quick-actions{
padding:18px;
display:grid;
grid-template-columns:repeat(2,1fr);
gap:9px;
}

.quick-action{
min-height:60px;
border:1px solid var(--border);
border-radius:12px;
background:#fafafa;
display:flex;
align-items:center;
gap:10px;
padding:11px;
text-align:left;
transition:.2s;
}

.quick-action:hover{
background:#f8fafc;
border-color:#cbd5e1;
transform:translateY(-1px);
}

.quick-action-icon{
width:32px;height:32px;border-radius:9px;
background:#eff6ff;color:#2563eb;
display:flex;align-items:center;justify-content:center;
}

.quick-action strong{font-size:11px;display:block}
.quick-action span{
font-size:9px;color:var(--muted);display:block;margin-top:2px;
}

/* TOOLBAR */

.toolbar{
background:white;
border:1px solid var(--border);
border-radius:15px;
padding:12px;
display:flex;
gap:9px;
flex-wrap:wrap;
margin-bottom:15px;
box-shadow:var(--shadow);
}

.search-box{flex:1;min-width:190px}

.search-box input,
.filter-select{
width:100%;
height:40px;
border:1px solid var(--border);
border-radius:10px;
background:#f8fafc;
padding:0 12px;
outline:none;
font-size:12px;
}

.search-box input:focus,
.filter-select:focus{
border-color:var(--blue);
background:white;
}

/* TABLE */

.table-card{
background:white;
border:1px solid var(--border);
border-radius:18px;
overflow:auto;
box-shadow:var(--shadow);
}

table{
width:100%;
border-collapse:collapse;
min-width:850px;
}

thead{background:#f8fafc}

th{
text-align:left;
padding:13px 15px;
font-size:10px;
color:#64748b;
text-transform:uppercase;
letter-spacing:.5px;
white-space:nowrap;
}

td{
padding:14px 15px;
border-top:1px solid #f1f5f9;
font-size:12px;
color:#334155;
white-space:nowrap;
}

tbody tr:hover{background:#fafcff}

.table-actions{display:flex;gap:5px}

.action-btn{
width:30px;height:30px;
border:1px solid var(--border);
border-radius:8px;
background:white;
display:flex;
align-items:center;
justify-content:center;
font-size:12px;
}

/* MODALS */

.modal{
position:fixed;
inset:0;
background:rgba(2,8,23,.58);
display:none;
align-items:center;
justify-content:center;
padding:18px;
z-index:100;
backdrop-filter:blur(7px);
}

.modal.show{display:flex}

.modal-content{
width:100%;
max-width:650px;
max-height:92vh;
overflow:auto;
background:white;
border-radius:22px;
box-shadow:var(--shadow2);
}

.modal-header{
padding:19px 21px;
border-bottom:1px solid var(--border);
display:flex;
justify-content:space-between;
align-items:center;
}

.modal-header h3{font-size:16px}

.modal-close{
border:0;
background:#f1f5f9;
width:32px;height:32px;
border-radius:9px;
}

.modal-body{padding:21px}

.modal-footer{
padding:16px 21px;
border-top:1px solid var(--border);
display:flex;
justify-content:flex-end;
gap:8px;
}

.form-grid{
display:grid;
grid-template-columns:repeat(2,1fr);
gap:14px;
}

.form-group{
display:flex;
flex-direction:column;
gap:6px;
}

.form-group.full{grid-column:1/-1}

.form-group label{
font-size:11px;
font-weight:750;
color:#475569;
}

.form-group input,
.form-group select,
.form-group textarea{
width:100%;
border:1px solid var(--border);
border-radius:10px;
min-height:42px;
padding:9px 11px;
background:#f8fafc;
outline:none;
font-size:12px;
}

.form-group textarea{
min-height:90px;
resize:vertical;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus{
border-color:var(--blue);
background:white;
box-shadow:0 0 0 3px rgba(37,99,235,.08);
}

/* TOAST */

#toast{
position:fixed;
right:20px;
bottom:20px;
z-index:200;
background:#07111f;
color:white;
padding:12px 16px;
border-radius:11px;
font-size:12px;
box-shadow:var(--shadow2);
display:none;
}

/* MOBILE NAV */

.mobile-bottom-nav{display:none}

@media(max-width:1000px){

.sidebar{width:215px}

.main{
margin-left:215px;
width:calc(100% - 215px);
}

.kpi-grid{grid-template-columns:repeat(2,1fr)}

.dashboard-columns{grid-template-columns:1fr}

.financial-grid{grid-template-columns:repeat(2,1fr)}

.financial-item:nth-child(2){border-right:0}

.financial-item:nth-child(-n+2){
border-bottom:1px solid var(--border);
}
}

@media(max-width:720px){

body{padding-bottom:70px}

.sidebar{display:none}

.main{
width:100%;
margin-left:0;
}

.topbar{
height:62px;
padding:0 16px;
}

.topbar-title strong{font-size:14px}
.topbar-title span{font-size:9px}
.online-status{display:none}

.content{padding:18px 14px 25px}

.page-header{
align-items:flex-start;
flex-direction:column;
margin-bottom:18px;
}

.page-header h2{font-size:23px}

.header-actions{width:100%}

.header-actions .btn{flex:1}

.dashboard-welcome h1{font-size:24px}

.kpi-grid{
grid-template-columns:repeat(2,1fr);
gap:10px;
}

.kpi-card{
padding:14px;
border-radius:15px;
}

.kpi-value{font-size:22px}

.kpi-icon{
width:29px;height:29px;font-size:13px;
}

.financial-grid{grid-template-columns:1fr 1fr}

.financial-item{padding:15px}

.financial-item strong{font-size:15px}

.quick-actions{padding:14px}

.toolbar{padding:9px}

.search-box{min-width:100%}

.table-card{border-radius:14px}

.form-grid{grid-template-columns:1fr}

.form-group.full{grid-column:auto}

.modal{
align-items:flex-end;
padding:0;
}

.modal-content{
max-height:92vh;
border-radius:22px 22px 0 0;
}

.mobile-bottom-nav{
display:flex;
position:fixed;
bottom:0;
left:0;
right:0;
height:66px;
background:rgba(255,255,255,.96);
border-top:1px solid var(--border);
z-index:80;
backdrop-filter:blur(16px);
padding:5px;
}

.mobile-nav-btn{
flex:1;
border:0;
background:transparent;
color:#94a3b8;
border-radius:10px;
font-size:9px;
font-weight:700;
display:flex;
flex-direction:column;
align-items:center;
justify-content:center;
gap:3px;
}

.mobile-nav-btn span:first-child{font-size:17px}

.mobile-nav-btn.active{
color:#2563eb;
background:#eff6ff;
}
}

@media(max-width:380px){

.content{padding:15px 10px 20px}

.kpi-grid{gap:8px}

.kpi-card{padding:12px}

.kpi-label{font-size:9px}

.kpi-value{font-size:19px}

.financial-item strong{font-size:14px}
}
</style>
</head>

<body>

<!-- LOGIN -->

<div id="loginPage">

<div class="login-glow"></div>
<div class="login-glow2"></div>

<div class="login-card">

<div class="brand-mark">🚘</div>

<h1>Garage Operations Pro</h1>

<div class="login-subtitle">
Vehicle • Finance • Workshop Operations
</div>

<label class="login-label">Username</label>

<input
id="username"
class="login-input"
type="text"
placeholder="Enter username"
autocomplete="username">

<label class="login-label">Password</label>

<input
id="password"
class="login-input"
type="password"
placeholder="Enter password"
autocomplete="current-password">

<button
id="loginBtn"
class="login-button"
onclick="login()">
SIGN IN
</button>

<div id="loginError" class="login-error"></div>

<div class="login-footer">
Garage Operations Pro
<br>
Professional workshop management
</div>

</div>
</div>


<!-- APPLICATION -->

<div id="app">

<div class="app-layout">

<aside class="sidebar">

<div class="sidebar-brand">

<div class="sidebar-logo">🚘</div>

<div>
<strong>Garage Operations</strong>
<span>PRO WORKSPACE</span>
</div>

</div>

<div class="nav-title">Workspace</div>

<nav>

<button class="nav-btn active"
onclick="showSection('dashboard',this)">
<span class="nav-icon">⌂</span>
Dashboard
</button>

<button class="nav-btn"
onclick="showSection('vehicles',this)">
<span class="nav-icon">🚘</span>
Vehicles
</button>

<button class="nav-btn"
onclick="showSection('expenses',this)">
<span class="nav-icon">💳</span>
Expenses
</button>

<button class="nav-btn"
onclick="showSection('pettyCash',this)">
<span class="nav-icon">💰</span>
Petty Cash
</button>

<button class="nav-btn"
onclick="showSection('requisitions',this)">
<span class="nav-icon">📋</span>
Requisitions
</button>

</nav>

<div class="sidebar-bottom">

<div class="user-mini">

<div class="user-avatar">J</div>

<div>
<strong id="sidebarUser">Josephine</strong>
<span>Garage Administrator</span>
</div>

</div>

</div>

</aside>


<main class="main">

<header class="topbar">

<div class="topbar-title">
<strong>Garage Operations Pro</strong>
<span>Workshop management workspace</span>
</div>

<div class="topbar-right">
<div class="online-status">
<span class="online-dot"></span>
System online
</div>
</div>

</header>


<div class="content">

<!-- DASHBOARD -->

<section id="dashboard" class="app-section">

<div class="dashboard-welcome">

<h1>
Good day, <span id="welcomeUser">Josephine</span> 👋
</h1>

<p>
Here's what's happening across your garage today.
</p>

</div>


<div class="kpi-grid">

<div class="kpi-card">

<div class="kpi-top">
<span class="kpi-label">Total Vehicles</span>
<span class="kpi-icon">🚘</span>
</div>

<div id="dashVehicles" class="kpi-value">0</div>

<div class="kpi-meta">Vehicles in system</div>

</div>


<div class="kpi-card">

<div class="kpi-top">
<span class="kpi-label">Under Repair</span>
<span class="kpi-icon">🔧</span>
</div>

<div id="dashRepair" class="kpi-value">0</div>

<div class="kpi-meta">Active workshop jobs</div>

</div>


<div class="kpi-card">

<div class="kpi-top">
<span class="kpi-label">Outstanding</span>
<span class="kpi-icon">₿</span>
</div>

<div id="dashOutstanding" class="kpi-value">KSh 0</div>

<div class="kpi-meta">Awaiting payment</div>

</div>


<div class="kpi-card">

<div class="kpi-top">
<span class="kpi-label">Requisitions</span>
<span class="kpi-icon">📋</span>
</div>

<div id="dashReq" class="kpi-value">0</div>

<div class="kpi-meta">Total requisitions</div>

</div>

</div>


<div class="section-card">

<div class="section-card-header">
<h3>Financial Overview</h3>
<span>Current records</span>
</div>

<div class="financial-grid">

<div class="financial-item">
<label>Total Billed</label>
<strong id="dashBilled">KSh 0</strong>
</div>

<div class="financial-item">
<label>Total Paid</label>
<strong id="dashPaid">KSh 0</strong>
</div>

<div class="financial-item">
<label>Expenses</label>
<strong id="dashExpenses">KSh 0</strong>
</div>

<div class="financial-item">
<label>Petty Cash</label>
<strong id="dashPetty">KSh 0</strong>
</div>

</div>
</div>


<div class="dashboard-columns">

<div class="section-card">

<div class="section-card-header">
<h3>Workshop Activity</h3>
<span>Recent vehicles</span>
</div>

<div id="dashboardActivity" class="activity-list"></div>

</div>


<div class="section-card">

<div class="section-card-header">
<h3>Quick Actions</h3>
<span>Shortcuts</span>
</div>

<div class="quick-actions">

<button class="quick-action"
onclick="openVehicleModal()">

<div class="quick-action-icon">+</div>

<div>
<strong>Add Vehicle</strong>
<span>Register vehicle</span>
</div>

</button>


<button class="quick-action"
onclick="openExpenseModal()">

<div class="quick-action-icon">+</div>

<div>
<strong>Add Expense</strong>
<span>Record expense</span>
</div>

</button>


<button class="quick-action"
onclick="openPettyModal()">

<div class="quick-action-icon">+</div>

<div>
<strong>Petty Cash</strong>
<span>Add transaction</span>
</div>

</button>


<button class="quick-action"
onclick="openReqModal()">

<div class="quick-action-icon">+</div>

<div>
<strong>Requisition</strong>
<span>Request materials</span>
</div>

</button>

</div>
</div>

</div>


<div class="section-card" style="margin-top:18px">

<div class="section-card-header">
<h3>Requisition Overview</h3>
<span>Total requested value</span>
</div>

<div class="financial-grid">

<div class="financial-item">
<label>Total Requisitions</label>
<strong id="dashReqCount">0</strong>
</div>

<div class="financial-item">
<label>Total Value</label>
<strong id="dashReqTotal">KSh 0</strong>
</div>

<div class="financial-item">
<label>Workshop Status</label>
<strong>Active</strong>
</div>

<div class="financial-item">
<label>System</label>
<strong style="color:#16a34a">Online</strong>
</div>

</div>
</div>

</section>


<!-- VEHICLES -->

<section id="vehicles" class="app-section" style="display:none">

<div class="page-header">

<div>
<h2>Vehicles</h2>
<p>Manage vehicles and workshop jobs.</p>
</div>

<div class="header-actions">

<button class="btn"
onclick="printVehicles()">
🖨 Print
</button>

<button class="btn btn-primary"
onclick="openVehicleModal()">
+ Add Vehicle
</button>

</div>
</div>


<div class="toolbar">

<div class="search-box">
<input
id="vehicleSearch"
type="search"
placeholder="Search registration or customer...">
</div>

<select id="vehicleStatusFilter"
class="filter-select"
style="max-width:190px">

<option value="">All Statuses</option>
<option value="Storage">Storage</option>
<option value="Under Repair">Under Repair</option>
<option value="Completed">Completed</option>
<option value="Released">Released</option>

</select>

</div>


<div class="table-card">

<table>

<thead>

<tr>
<th>Registration</th>
<th>Customer</th>
<th>Date In</th>
<th>Job Type</th>
<th>Status</th>
<th>Billed</th>
<th>Paid</th>
<th>Outstanding</th>
<th>Actions</th>
</tr>

</thead>

<tbody id="vehiclesTableBody"></tbody>

</table>

</div>

</section>


<!-- EXPENSES -->

<section id="expenses" class="app-section" style="display:none">

<div class="page-header">

<div>
<h2>Expenses</h2>
<p>Track workshop expenses and costs.</p>
</div>

<div class="header-actions">

<button class="btn"
onclick="printExpenses()">
🖨 Print
</button>

<button class="btn btn-primary"
onclick="openExpenseModal()">
+ Add Expense
</button>

</div>
</div>


<div class="toolbar">

<div class="search-box">
<input
id="expenseSearch"
type="search"
placeholder="Search expense...">
</div>

<select
id="expenseCategoryFilter"
class="filter-select"
style="max-width:190px">

<option value="">All Categories</option>

</select>

</div>


<div class="table-card">

<table>

<thead>

<tr>
<th>Date</th>
<th>Vehicle</th>
<th>Description</th>
<th>Category</th>
<th>Amount</th>
<th>Actions</th>
</tr>

</thead>

<tbody id="expensesTableBody"></tbody>

</table>

</div>

</section>


<!-- PETTY CASH -->

<section id="pettyCash" class="app-section" style="display:none">

<div class="page-header">

<div>
<h2>Petty Cash</h2>
<p>Monitor small daily workshop transactions.</p>
</div>

<div class="header-actions">

<button class="btn"
onclick="printPettyCash()">
🖨 Print
</button>

<button class="btn btn-primary"
onclick="openPettyModal()">
+ Add Transaction
</button>

</div>
</div>


<div class="toolbar">

<div class="search-box">
<input
id="pettySearch"
type="search"
placeholder="Search transaction...">
</div>

<select
id="pettyCategoryFilter"
class="filter-select"
style="max-width:190px">

<option value="">All Categories</option>

</select>

</div>


<div class="table-card">

<table>

<thead>

<tr>
<th>Date</th>
<th>Description</th>
<th>Paid To</th>
<th>Category</th>
<th>Amount</th>
<th>Notes</th>
<th>Actions</th>
</tr>

</thead>

<tbody id="pettyTableBody"></tbody>

</table>

</div>

</section>


<!-- REQUISITIONS -->

<section id="requisitions" class="app-section" style="display:none">

<div class="page-header">

<div>
<h2>Requisitions</h2>
<p>Manage workshop material and purchase requests.</p>
</div>

<div class="header-actions">

<button class="btn"
onclick="previewSelectedReq()">
👁 Preview
</button>

<button class="btn"
onclick="printRequisitions()">
🖨 Print
</button>

<button class="btn btn-primary"
onclick="openReqModal()">
+ New Requisition
</button>

</div>
</div>


<div class="toolbar">

<div class="search-box">
<input
id="reqSearch"
type="search"
placeholder="Search requisition...">
</div>

<select
id="reqStatusFilter"
class="filter-select"
style="max-width:190px">

<option value="">All Statuses</option>
<option value="Pending">Pending</option>
<option value="Approved">Approved</option>
<option value="Purchased">Purchased</option>
<option value="Completed">Completed</option>
<option value="Rejected">Rejected</option>

</select>

</div>


<div class="section-card" style="margin-bottom:15px">

<div class="section-card-header">

<h3>Requisition Total</h3>

<strong id="reqOverallTotal">
KSh 0
</strong>

</div>

</div>


<div class="table-card">

<table>

<thead>

<tr>
<th>Req No.</th>
<th>Date</th>
<th>Requested By</th>
<th>Vehicle</th>
<th>Item Description</th>
<th>Qty</th>
<th>Unit Cost</th>
<th>Total</th>
<th>Expense Type</th>
<th>Status</th>
<th>Actions</th>
</tr>

</thead>

<tbody id="requisitionsTableBody"></tbody>

</table>

</div>

</section>

</div>
</main>

</div>


<!-- MOBILE NAV -->

<div class="mobile-bottom-nav">

<button class="mobile-nav-btn active"
onclick="showSection('dashboard',this)">
<span>⌂</span>
<span>Home</span>
</button>

<button class="mobile-nav-btn"
onclick="showSection('vehicles',this)">
<span>🚘</span>
<span>Vehicles</span>
</button>

<button class="mobile-nav-btn"
onclick="showSection('expenses',this)">
<span>💳</span>
<span>Expenses</span>
</button>

<button class="mobile-nav-btn"
onclick="showSection('pettyCash',this)">
<span>💰</span>
<span>Cash</span>
</button>

<button class="mobile-nav-btn"
onclick="showSection('requisitions',this)">
<span>📋</span>
<span>Requests</span>
</button>

</div>

</div>


<!-- VEHICLE MODAL -->

<div id="vehicleModal" class="modal">

<div class="modal-content">

<div class="modal-header">
<h3 id="vehicleModalTitle">Add Vehicle</h3>
<button class="modal-close"
onclick="closeModal('vehicleModal')">✕</button>
</div>

<form id="vehicleForm">

<div class="modal-body">

<input id="vehicleId" type="hidden">

<div class="form-grid">

<div class="form-group">
<label>Registration / Chassis No.</label>
<input id="vehicleRegistration" required>
</div>

<div class="form-group">
<label>Customer</label>
<input id="vehicleCustomer" required>
</div>

<div class="form-group">
<label>Date In</label>
<input id="vehicleDateIn" type="date" required>
</div>

<div class="form-group">
<label>Date Out</label>
<input id="vehicleDateOut" type="date">
</div>

<div class="form-group">
<label>Job Type</label>
<select id="vehicleJobType">
<option value="Repair">Repair</option>
<option value="Storage">Storage</option>
</select>
</div>

<div class="form-group">
<label>Status</label>

<select id="vehicleStatus">
<option value="Storage">Storage</option>
<option value="Under Repair">Under Repair</option>
<option value="Completed">Completed</option>
<option value="Released">Released</option>
</select>

</div>

<div class="form-group">
<label>Released To</label>
<input id="vehicleReleasedTo">
</div>

<div class="form-group">
<label>Released Contact</label>
<input id="vehicleReleasedContact">
</div>

<div class="form-group">
<label>Billed</label>
<input id="vehicleBilled" type="number" step="0.01">
</div>

<div class="form-group">
<label>Paid</label>
<input id="vehiclePaid" type="number" step="0.01">
</div>

<div class="form-group full">
<label>Description</label>
<textarea id="vehicleDescription"></textarea>
</div>

</div>
</div>

<div class="modal-footer">

<button type="button" class="btn"
onclick="closeModal('vehicleModal')">
Cancel
</button>

<button type="submit" class="btn btn-primary">
Save Vehicle
</button>

</div>

</form>
</div>
</div>


<!-- EXPENSE MODAL -->

<div id="expenseModal" class="modal">

<div class="modal-content">

<div class="modal-header">
<h3 id="expenseModalTitle">Add Expense</h3>
<button class="modal-close"
onclick="closeModal('expenseModal')">✕</button>
</div>

<form id="expenseForm">

<div class="modal-body">

<input id="expenseId" type="hidden">

<div class="form-grid">

<div class="form-group">
<label>Vehicle</label>
<select id="expenseVehicle">
<option value="">General Expense</option>
</select>
</div>

<div class="form-group">
<label>Date</label>
<input id="expenseDate" type="date" required>
</div>

<div class="form-group">
<label>Category</label>
<select id="expenseCategory" required>
<option value="">Select Category</option>
<option value="Parts">Parts</option>
<option value="Materials">Materials</option>
<option value="Labour">Labour</option>
</select>
</div>

<div class="form-group">
<label>Amount</label>
<input id="expenseAmount" type="number" step="0.01" required>
</div>

<div class="form-group full">
<label>Description</label>
<textarea id="expenseDescription" required></textarea>
</div>

</div>
</div>

<div class="modal-footer">

<button type="button" class="btn"
onclick="closeModal('expenseModal')">
Cancel
</button>

<button type="submit" class="btn btn-primary">
Save Expense
</button>

</div>

</form>
</div>
</div>


<!-- PETTY CASH MODAL -->

<div id="pettyModal" class="modal">

<div class="modal-content">

<div class="modal-header">
<h3 id="pettyModalTitle">Add Petty Cash</h3>
<button class="modal-close"
onclick="closeModal('pettyModal')">✕</button>
</div>

<form id="pettyForm">

<div class="modal-body">

<input id="pettyId" type="hidden">

<div class="form-grid">

<div class="form-group">
<label>Date</label>
<input id="pettyDate" type="date" required>
</div>

<div class="form-group">
<label>Paid To</label>
<input id="pettyPaidTo" required>
</div>

<div class="form-group">
<label>Category</label>
<select id="pettyCategory" required>
<option value="">Select Category</option>
<option value="Parts">Parts</option>
<option value="Materials">Materials</option>
<option value="Labour">Labour</option>
<option value="Transport">Transport</option>
<option value="Other">Other</option>
</select>
</div>

<div class="form-group">
<label>Amount</label>
<input id="pettyAmount" type="number" step="0.01" required>
</div>

<div class="form-group full">
<label>Description</label>
<textarea id="pettyDescription" required></textarea>
</div>

<div class="form-group full">
<label>Notes</label>
<textarea id="pettyNotes"></textarea>
</div>

</div>
</div>

<div class="modal-footer">

<button type="button" class="btn"
onclick="closeModal('pettyModal')">
Cancel
</button>

<button type="submit" class="btn btn-primary">
Save Transaction
</button>

</div>

</form>
</div>
</div>


<!-- REQUISITION MODAL -->

<div id="reqModal" class="modal">

<div class="modal-content">

<div class="modal-header">
<h3 id="reqModalTitle">New Requisition</h3>
<button class="modal-close"
onclick="closeModal('reqModal')">✕</button>
</div>

<form id="reqForm">

<div class="modal-body">

<input id="reqId" type="hidden">

<div class="form-grid">

<div class="form-group">
<label>Requisition No.</label>
<input id="reqNo" required>
</div>

<div class="form-group">
<label>Date</label>
<input id="reqDate" type="date" required>
</div>

<div class="form-group">
<label>Requested By</label>
<input id="reqRequestedBy" required>
</div>

<div class="form-group">
<label>Vehicle</label>
<select id="reqVehicle">
<option value="">Select Vehicle</option>
</select>
</div>

<div class="form-group full">
<label>Item Description</label>
<textarea id="reqItemDescription" required></textarea>
</div>

<div class="form-group">
<label>Quantity</label>
<input id="reqQuantity" type="number" min="0" step="0.01" required>
</div>

<div class="form-group">
<label>Unit Cost</label>
<input id="reqUnitCost" type="number" min="0" step="0.01" required>
</div>

<div class="form-group">
<label>Total Amount</label>
<input id="reqTotal" type="number" readonly>
</div>

<div class="form-group">
<label>Status</label>
<select id="reqStatus">
<option value="Pending">Pending</option>
<option value="Approved">Approved</option>
<option value="Purchased">Purchased</option>
<option value="Completed">Completed</option>
<option value="Rejected">Rejected</option>
</select>
</div>

<div class="form-group">
<label>Category</label>
<input id="reqCategory">
</div>

<div class="form-group">
<label>Expense Type</label>
<input id="reqExpenseType">
</div>

<div class="form-group full">
<label>Notes</label>
<textarea id="reqNotes"></textarea>
</div>

</div>
</div>

<div class="modal-footer">

<button type="button" class="btn"
onclick="closeModal('reqModal')">
Cancel
</button>

<button type="submit" class="btn btn-primary">
Save Requisition
</button>

</div>

</form>
</div>
</div>


<!-- REQUISITION PREVIEW -->

<div id="reqPreviewModal" class="modal">

<div class="modal-content">

<div class="modal-header">
<h3>Requisition Preview</h3>
<button class="modal-close"
onclick="closeModal('reqPreviewModal')">✕</button>
</div>

<div id="reqPreviewContent" class="modal-body"></div>

<div class="modal-footer">

<button class="btn"
onclick="closeModal('reqPreviewModal')">
Close
</button>

<button class="btn btn-primary"
onclick="printSelectedReq()">
🖨 Print
</button>

</div>

</div>
</div>


<!-- VEHICLE EXPENSE PREVIEW -->

<div id="vehicleExpensePreviewModal" class="modal">

<div class="modal-content">

<div class="modal-header">
<h3>Vehicle Expense Summary</h3>
<button class="modal-close"
onclick="closeModal('vehicleExpensePreviewModal')">✕</button>
</div>

<div id="vehicleExpensePreviewContent" class="modal-body"></div>

<div class="modal-footer">

<button class="btn"
onclick="closeModal('vehicleExpensePreviewModal')">
Close
</button>

<button class="btn btn-primary"
onclick="printVehicleExpensePreview()">
🖨 Print
</button>

</div>

</div>
</div>


<div id="toast"></div>


<script>
/* LOGIN — SAME CURRENT LOGIC */

function login(){

const username=document.getElementById("username").value.trim().toLowerCase();
const password=document.getElementById("password").value;
const error=document.getElementById("loginError");

const users={
josephine:"1234",
boss:"1234",
staff:"1234"
};

if(users[username] && users[username]===password){

sessionStorage.setItem("garageLoggedIn","true");
sessionStorage.setItem("garageUser",username);

error.textContent="";

document.getElementById("loginPage").style.display="none";
document.getElementById("app").style.display="block";

updateUserDisplay(username);

}else{

error.textContent="Invalid username or password.";

}
}

function updateUserDisplay(username){

const displayName=
username.charAt(0).toUpperCase()+username.slice(1);

const welcome=document.getElementById("welcomeUser");
const sidebar=document.getElementById("sidebarUser");

if(welcome)welcome.textContent=displayName;
if(sidebar)sidebar.textContent=displayName;
}

function checkLogin(){

const loggedIn=sessionStorage.getItem("garageLoggedIn");
const username=sessionStorage.getItem("garageUser");

if(loggedIn==="true"){

document.getElementById("loginPage").style.display="none";
document.getElementById("app").style.display="block";

updateUserDisplay(username||"josephine");

}
}

document.addEventListener("DOMContentLoaded",checkLogin);

document.getElementById("password")?.addEventListener("keydown",e=>{
if(e.key==="Enter")login();
});
</script>


<script type="module" src="app.js"></script>

</body>
</html>
