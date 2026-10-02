import { createClient }
from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE CORRECTED APP.JS
   Existing modules:
   - Dashboard
   - Vehicles
   - Expenses
   - Petty Cash
   - Requisitions

   Added:
   - Invoices
   - Gate Passes

   IMPORTANT:
   Existing Supabase tables are NOT modified.
   New invoice/gate-pass tables are expected separately.
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

let editingVehicleId = null;
let editingExpenseId = null;
let editingPettyId = null;
let editingReqId = null;
let editingInvoiceId = null;
let editingGatePassId = null;

let selectedVehicleExpenseId = null;
let selectedReqNo = null;


/* =========================================================
   HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return `KSh ${number(value).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

function moneyPlain(value) {
  return number(value).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
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
  return new Date().toISOString().slice(0, 10);
}

function dateTimeNow() {
  return new Date().toISOString();
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(d.getTime())) {
    return String(value).slice(0, 10);
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
    return String(value);
  }

  return d.toLocaleString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function statusBadge(status) {
  const safe = escapeHtml(status || "Unknown");
  const cls = normalizeStatus(status);

  return `<span class="status status-${cls || "default"}">${safe}</span>`;
}

function showToast(message, type = "success") {
  const toast = $("toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.style.display = "block";

  if (type === "error") {
    toast.style.background = "#991b1b";
  } else if (type === "warning") {
    toast.style.background = "#92400e";
  } else {
    toast.style.background = "#07111f";
  }

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.style.display = "none";
  }, 3200);
}

function openModal(id) {
  const modal = $(id);
  if (modal) {
    modal.classList.add("show");
  }
}

function closeModal(id) {
  const modal = $(id);
  if (modal) {
    modal.classList.remove("show");
  }
}

function currentUser() {
  return (
    sessionStorage.getItem("garageUser") ||
    "josephine"
  );
}

function displayCurrentUser() {
  const user = currentUser();

  const welcome = $("welcomeUser");
  const sidebar = $("sidebarUser");

  const name =
    user.charAt(0).toUpperCase() +
    user.slice(1);

  if (welcome) welcome.textContent = name;
  if (sidebar) sidebar.textContent = name;
}

function generateNumber(prefix, existingRecords, field) {
  const year = new Date().getFullYear();

  let max = 0;

  existingRecords.forEach((row) => {
    const value = String(row?.[field] || "");

    const match = value.match(/(\d+)$/);

    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  });

  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}


/* =========================================================
   SAFE SUPABASE LOADER
   ========================================================= */

async function loadTable(table, orderColumn = null) {
  let query = supabase.from(table).select("*");

  if (orderColumn) {
    query = query.order(orderColumn, {
      ascending: false
    });
  }

  const result = await query;

  if (result.error) {
    return {
      data: [],
      error: result.error
    };
  }

  return {
    data: result.data || [],
    error: null
  };
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
      loadTable("requisitions", "req_date"),
      loadTable("invoices", "created_at"),
      loadTable("gate_passes", "created_at")
    ]);

    vehicles = vehicleResult.data || [];
    expenses = expenseResult.data || [];
    pettyCash = pettyResult.data || [];
    requisitions = reqResult.data || [];

    /*
     * These two tables may not exist until the supplied SQL
     * is run. Their absence must NOT break the old modules.
     */
    invoices = invoiceResult.data || [];
    gatePasses = gateResult.data || [];

    if (vehicleResult.error) {
      console.error("Vehicles:", vehicleResult.error);
    }

    if (expenseResult.error) {
      console.error("Expenses:", expenseResult.error);
    }

    if (pettyResult.error) {
      console.error("Petty Cash:", pettyResult.error);
    }

    if (reqResult.error) {
      console.error("Requisitions:", reqResult.error);
    }

    if (invoiceResult.error) {
      console.warn(
        "Invoices table not available yet:",
        invoiceResult.error.message
      );
    }

    if (gateResult.error) {
      console.warn(
        "Gate passes table not available yet:",
        gateResult.error.message
      );
    }

    renderAll();

  } catch (error) {
    console.error(error);
    showToast(
      "Could not load garage data. Check your internet connection.",
      "error"
    );
  }
}


/* =========================================================
   RENDER ALL
   ========================================================= */

function renderAll() {
  renderDashboard();
  renderVehicles();
  renderExpenses();
  renderPettyCash();
  renderRequisitions();
  renderInvoices();
  renderGatePasses();

  populateVehicleSelects();
  populateCategoryFilters();
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {
  const totalVehicles = vehicles.length;

  const repairCount = vehicles.filter(
    v => normalizeStatus(v.status) === "under-repair"
  ).length;

  const totalBilled = vehicles.reduce(
    (sum, v) => sum + number(v.billed),
    0
  );

  const totalPaid = vehicles.reduce(
    (sum, v) => sum + number(v.paid),
    0
  );

  const outstanding = vehicles.reduce(
    (sum, v) =>
      sum +
      Math.max(
        number(v.billed) - number(v.paid),
        0
      ),
    0
  );

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + number(e.amount),
    0
  );

  const totalPetty = pettyCash.reduce(
    (sum, p) => sum + number(p.amount),
    0
  );

  const uniqueReqs = getUniqueReqNumbers();

  const reqTotal = uniqueReqs.reduce(
    (sum, reqNo) =>
      sum + requisitionTotal(reqNo),
    0
  );

  if ($("dashVehicles")) {
    $("dashVehicles").textContent = totalVehicles;
  }

  if ($("dashRepair")) {
    $("dashRepair").textContent = repairCount;
  }

  if ($("dashOutstanding")) {
    $("dashOutstanding").textContent = money(outstanding);
  }

  if ($("dashReq")) {
    $("dashReq").textContent = uniqueReqs.length;
  }

  if ($("dashBilled")) {
    $("dashBilled").textContent = money(totalBilled);
  }

  if ($("dashPaid")) {
    $("dashPaid").textContent = money(totalPaid);
  }

  if ($("dashExpenses")) {
    $("dashExpenses").textContent = money(totalExpenses);
  }

  if ($("dashPetty")) {
    $("dashPetty").textContent = money(totalPetty);
  }

  if ($("dashReqCount")) {
    $("dashReqCount").textContent =
      uniqueReqs.length;
  }

  if ($("dashReqTotal")) {
    $("dashReqTotal").textContent =
      money(reqTotal);
  }

  renderDashboardActivity();
}

function renderDashboardActivity() {
  const container = $("dashboardActivity");

  if (!container) return;

  const recent = [...vehicles]
    .sort((a, b) => {
      const da = new Date(
        a.created_at ||
        a.date_in ||
        0
      ).getTime();

      const db = new Date(
        b.created_at ||
        b.date_in ||
        0
      ).getTime();

      return db - da;
    })
    .slice(0, 7);

  if (!recent.length) {
    container.innerHTML = `
      <div style="padding:25px;color:#64748b;font-size:12px">
        No vehicle activity yet.
      </div>
    `;
    return;
  }

  container.innerHTML = recent.map(vehicle => `
    <div class="activity-item">
      <div class="activity-icon">🚘</div>

      <div class="activity-main">
        <strong>
          ${escapeHtml(vehicle.registration || "Vehicle")}
        </strong>

        <span>
          ${escapeHtml(vehicle.customer || "")}
          •
          ${escapeHtml(vehicle.job_type || "Workshop job")}
        </span>
      </div>

      ${statusBadge(vehicle.status || "Unknown")}
    </div>
  `).join("");
}


/* =========================================================
   VEHICLES
   ========================================================= */

function renderVehicles() {
  const body = $("vehiclesTableBody");

  if (!body) return;

  const search =
    ($("vehicleSearch")?.value || "")
      .trim()
      .toLowerCase();

  const status =
    ($("vehicleStatusFilter")?.value || "")
      .trim()
      .toLowerCase();

  const filtered = vehicles.filter(v => {
    const text = [
      v.registration,
      v.customer,
      v.job_type,
      v.description,
      v.released_to
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !search ||
      text.includes(search);

    const matchesStatus =
      !status ||
      String(v.status || "").toLowerCase() === status;

    return matchesSearch && matchesStatus;
  });

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center;padding:30px;color:#64748b">
          No vehicles found.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = filtered.map(v => {
    const outstanding =
      Math.max(
        number(v.billed) - number(v.paid),
        0
      );

    return `
      <tr>
        <td>
          <strong>
            ${escapeHtml(v.registration || "")}
          </strong>
        </td>

        <td>${escapeHtml(v.customer || "")}</td>

        <td>${escapeHtml(formatDate(v.date_in))}</td>

        <td>${escapeHtml(v.job_type || "")}</td>

        <td>${statusBadge(v.status || "Unknown")}</td>

        <td>${money(v.billed)}</td>

        <td>${money(v.paid)}</td>

        <td>
          <strong>${money(outstanding)}</strong>
        </td>

        <td>
          <div class="table-actions">

            <button
              class="action-btn"
              title="Edit"
              onclick="openVehicleModal('${escapeHtml(v.id)}')">
              ✏️
            </button>

            <button
              class="action-btn"
              title="Expenses"
              onclick="openVehicleExpensePreview('${escapeHtml(v.id)}')">
              💳
            </button>

            <button
              class="action-btn"
              title="Invoice"
              onclick="openInvoiceModal(null,'${escapeHtml(v.id)}')">
              🧾
            </button>

            <button
              class="action-btn"
              title="Gate Pass"
              onclick="openGatePassModal(null,'${escapeHtml(v.id)}')">
              🚪
            </button>

            <button
              class="action-btn"
              title="Delete"
              onclick="deleteVehicle('${escapeHtml(v.id)}')">
              🗑
            </button>

          </div>
        </td>
      </tr>
    `;
  }).join("");
}


/* =========================================================
   VEHICLE MODAL
   ========================================================= */

function resetVehicleForm() {
  const form = $("vehicleForm");

  if (form) form.reset();

  if ($("vehicleId")) {
    $("vehicleId").value = "";
  }

  if ($("vehicleDateIn")) {
    $("vehicleDateIn").value = today();
  }

  if ($("vehicleStatus")) {
    $("vehicleStatus").value = "Under Repair";
  }

  if ($("vehicleJobType")) {
    $("vehicleJobType").value = "Repair";
  }

  if ($("vehicleModalTitle")) {
    $("vehicleModalTitle").textContent =
      "Add Vehicle";
  }

  editingVehicleId = null;
}

function openVehicleModal(id = null) {
  resetVehicleForm();

  if (id) {
    const vehicle =
      vehicles.find(v =>
        String(v.id) === String(id)
      );

    if (!vehicle) return;

    editingVehicleId = vehicle.id;

    $("vehicleId").value = vehicle.id;
    $("vehicleRegistration").value =
      vehicle.registration || "";
    $("vehicleCustomer").value =
      vehicle.customer || "";
    $("vehicleDateIn").value =
      vehicle.date_in || "";
    $("vehicleDateOut").value =
      vehicle.date_out || "";
    $("vehicleJobType").value =
      vehicle.job_type || "Repair";
    $("vehicleStatus").value =
      vehicle.status || "Under Repair";
    $("vehicleReleasedTo").value =
      vehicle.released_to || "";
    $("vehicleReleasedContact").value =
      vehicle.released_contact || "";
    $("vehicleBilled").value =
      number(vehicle.billed);
    $("vehiclePaid").value =
      number(vehicle.paid);
    $("vehicleDescription").value =
      vehicle.description || "";

    $("vehicleModalTitle").textContent =
      "Edit Vehicle";
  }

  openModal("vehicleModal");
}

async function saveVehicle(event) {
  event.preventDefault();

  const registration =
    $("vehicleRegistration")?.value.trim();

  const customer =
    $("vehicleCustomer")?.value.trim();

  if (!registration || !customer) {
    showToast(
      "Registration and customer are required.",
      "error"
    );
    return;
  }

  const payload = {
    registration,
    customer,
    date_in:
      $("vehicleDateIn")?.value || null,
    date_out:
      $("vehicleDateOut")?.value || null,
    job_type:
      $("vehicleJobType")?.value.trim() || "Repair",
    status:
      $("vehicleStatus")?.value || "Under Repair",
    released_to:
      $("vehicleReleasedTo")?.value.trim() || null,
    released_contact:
      $("vehicleReleasedContact")?.value.trim() || null,
    billed:
      number($("vehicleBilled")?.value),
    paid:
      number($("vehiclePaid")?.value),
    description:
      $("vehicleDescription")?.value.trim() || null
  };

  try {
    let result;

    if (editingVehicleId) {
      result = await supabase
        .from("vehicles")
        .update(payload)
        .eq("id", editingVehicleId);
    } else {
      result = await supabase
        .from("vehicles")
        .insert(payload);
    }

    if (result.error) {
      throw result.error;
    }

    closeModal("vehicleModal");

    showToast(
      editingVehicleId
        ? "Vehicle updated successfully."
        : "Vehicle added successfully."
    );

    await loadAllData();

  } catch (error) {
    console.error(error);
    showToast(
      error.message ||
      "Could not save vehicle.",
      "error"
    );
  }
}

async function deleteVehicle(id) {
  const vehicle =
    vehicles.find(v =>
      String(v.id) === String(id)
    );

  if (!vehicle) return;

  const confirmed = confirm(
    `Delete vehicle ${vehicle.registration || ""}?`
  );

  if (!confirmed) return;

  try {
    const result = await supabase
      .from("vehicles")
      .delete()
      .eq("id", id);

    if (result.error) {
      throw result.error;
    }

    showToast("Vehicle deleted.");

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Could not delete vehicle.",
      "error"
    );
  }
}


/* =========================================================
   VEHICLE SELECTS
   ========================================================= */

function vehicleOptionList(includeBlank = true) {
  let html = includeBlank
    ? `<option value="">Select Vehicle</option>`
    : "";

  vehicles.forEach(v => {
    html += `
      <option value="${escapeHtml(v.id)}">
        ${escapeHtml(v.registration || "Vehicle")}
        ${v.customer ? " — " + escapeHtml(v.customer) : ""}
      </option>
    `;
  });

  return html;
}

function populateVehicleSelects() {
  const expenseVehicle = $("expenseVehicle");

  if (expenseVehicle) {
    const current = expenseVehicle.value;

    expenseVehicle.innerHTML =
      `<option value="">General Expense</option>` +
      vehicles.map(v => `
        <option value="${escapeHtml(v.id)}">
          ${escapeHtml(v.registration || "")}
          ${v.customer ? " — " + escapeHtml(v.customer) : ""}
        </option>
      `).join("");

    if (
      [...expenseVehicle.options]
        .some(o => o.value === current)
    ) {
      expenseVehicle.value = current;
    }
  }

  const reqVehicle = $("reqVehicle");

  if (reqVehicle) {
    const current = reqVehicle.value;

    reqVehicle.innerHTML =
      vehicleOptionList(true);

    if (
      [...reqVehicle.options]
        .some(o => o.value === current)
    ) {
      reqVehicle.value = current;
    }
  }

  const invoiceVehicle =
    $("invoiceVehicle");

  if (invoiceVehicle) {
    const current =
      invoiceVehicle.value;

    invoiceVehicle.innerHTML =
      vehicleOptionList(true);

    if (
      [...invoiceVehicle.options]
        .some(o => o.value === current)
    ) {
      invoiceVehicle.value = current;
    }
  }

  const gateVehicle =
    $("gateVehicle");

  if (gateVehicle) {
    const current =
      gateVehicle.value;

    gateVehicle.innerHTML =
      vehicleOptionList(true);

    if (
      [...gateVehicle.options]
        .some(o => o.value === current)
    ) {
      gateVehicle.value = current;
    }
  }
}


/* =========================================================
   EXPENSES
   ========================================================= */

function renderExpenses() {
  const body =
    $("expensesTableBody");

  if (!body) return;

  const search =
    ($("expenseSearch")?.value || "")
      .trim()
      .toLowerCase();

  const category =
    ($("expenseCategoryFilter")?.value || "")
      .trim()
      .toLowerCase();

  const filtered = expenses.filter(e => {
    const vehicle =
      vehicles.find(v =>
        String(v.id) === String(e.vehicle_id)
      );

    const text = [
      e.description,
      e.category,
      vehicle?.registration,
      vehicle?.customer
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search || text.includes(search)) &&
      (!category ||
        String(e.category || "")
          .toLowerCase() === category)
    );
  });

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td colspan="6"
          style="text-align:center;padding:30px;color:#64748b">
          No expenses found.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = filtered.map(e => {
    const vehicle =
      vehicles.find(v =>
        String(v.id) === String(e.vehicle_id)
      );

    return `
      <tr>
        <td>${escapeHtml(formatDate(e.expense_date))}</td>

        <td>
          ${escapeHtml(
            vehicle?.registration || "General"
          )}
        </td>

        <td>
          ${escapeHtml(e.description || "")}
        </td>

        <td>${escapeHtml(e.category || "")}</td>

        <td><strong>${money(e.amount)}</strong></td>

        <td>
          <div class="table-actions">

            <button
              class="action-btn"
              onclick="openExpenseModal('${escapeHtml(e.id)}')">
              ✏️
            </button>

            <button
              class="action-btn"
              onclick="deleteExpense('${escapeHtml(e.id)}')">
              🗑
            </button>

          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function resetExpenseForm() {
  const form = $("expenseForm");

  if (form) form.reset();

  editingExpenseId = null;

  if ($("expenseId")) {
    $("expenseId").value = "";
  }

  if ($("expenseDate")) {
    $("expenseDate").value = today();
  }

  if ($("expenseModalTitle")) {
    $("expenseModalTitle").textContent =
      "Add Expense";
  }
}

function openExpenseModal(id = null) {
  resetExpenseForm();

  populateVehicleSelects();

  if (id) {
    const expense =
      expenses.find(e =>
        String(e.id) === String(id)
      );

    if (!expense) return;

    editingExpenseId = expense.id;

    $("expenseId").value = expense.id;
    $("expenseVehicle").value =
      expense.vehicle_id || "";
    $("expenseDate").value =
      expense.expense_date || "";
    $("expenseCategory").value =
      expense.category || "";
    $("expenseAmount").value =
      number(expense.amount);
    $("expenseDescription").value =
      expense.description || "";

    $("expenseModalTitle").textContent =
      "Edit Expense";
  }

  openModal("expenseModal");
}

async function saveExpense(event) {
  event.preventDefault();

  const payload = {
    vehicle_id:
      $("expenseVehicle")?.value || null,
    expense_date:
      $("expenseDate")?.value || today(),
    category:
      $("expenseCategory")?.value.trim() || "Other",
    amount:
      number($("expenseAmount")?.value),
    description:
      $("expenseDescription")?.value.trim() || ""
  };

  try {
    let result;

    if (editingExpenseId) {
      result = await supabase
        .from("expenses")
        .update(payload)
        .eq("id", editingExpenseId);
    } else {
      result = await supabase
        .from("expenses")
        .insert(payload);
    }

    if (result.error) {
      throw result.error;
    }

    closeModal("expenseModal");

    showToast(
      editingExpenseId
        ? "Expense updated."
        : "Expense added."
    );

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Could not save expense.",
      "error"
    );
  }
}

async function deleteExpense(id) {
  if (!confirm("Delete this expense?")) {
    return;
  }

  try {
    const result =
      await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

    if (result.error) {
      throw result.error;
    }

    showToast("Expense deleted.");

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Could not delete expense.",
      "error"
    );
  }
}


/* =========================================================
   EXPENSE CATEGORY FILTER
   ========================================================= */

function populateCategoryFilters() {
  const expenseCategories =
    [...new Set(
      expenses
        .map(e => String(e.category || "").trim())
        .filter(Boolean)
    )];

  const filter =
    $("expenseCategoryFilter");

  if (filter) {
    const current = filter.value;

    filter.innerHTML =
      `<option value="">All Categories</option>` +
      expenseCategories.map(c =>
        `<option value="${escapeHtml(c)}">
          ${escapeHtml(c)}
        </option>`
      ).join("");

    if (
      expenseCategories.includes(current)
    ) {
      filter.value = current;
    }
  }

  const pettyCategories =
    [...new Set(
      pettyCash
        .map(p => String(p.category || "").trim())
        .filter(Boolean)
    )];

  const pettyFilter =
    $("pettyCategoryFilter");

  if (pettyFilter) {
    const current = pettyFilter.value;

    pettyFilter.innerHTML =
      `<option value="">All Categories</option>` +
      pettyCategories.map(c =>
        `<option value="${escapeHtml(c)}">
          ${escapeHtml(c)}
        </option>`
      ).join("");

    if (
      pettyCategories.includes(current)
    ) {
      pettyFilter.value = current;
    }
  }
}


/* =========================================================
   PETTY CASH
   ========================================================= */

function renderPettyCash() {
  const body = $("pettyTableBody");

  if (!body) return;

  const search =
    ($("pettySearch")?.value || "")
      .trim()
      .toLowerCase();

  const category =
    ($("pettyCategoryFilter")?.value || "")
      .trim()
      .toLowerCase();

  const filtered =
    pettyCash.filter(p => {
      const text = [
        p.description,
        p.paid_to,
        p.category,
        p.notes
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!search || text.includes(search)) &&
        (!category ||
          String(p.category || "")
            .toLowerCase() === category)
      );
    });

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7"
          style="text-align:center;padding:30px;color:#64748b">
          No petty cash transactions found.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML =
    filtered.map(p => `
      <tr>

        <td>
          ${escapeHtml(formatDate(p.cash_date))}
        </td>

        <td>
          ${escapeHtml(p.description || "")}
        </td>

        <td>
          ${escapeHtml(p.paid_to || "")}
        </td>

        <td>
          ${escapeHtml(p.category || "")}
        </td>

        <td>
          <strong>${money(p.amount)}</strong>
        </td>

        <td>
          ${escapeHtml(p.notes || "")}
        </td>

        <td>

          <div class="table-actions">

            <button
              class="action-btn"
              onclick="openPettyModal('${escapeHtml(p.id)}')">
              ✏️
            </button>

            <button
              class="action-btn"
              onclick="deletePetty('${escapeHtml(p.id)}')">
              🗑
            </button>

          </div>

        </td>

      </tr>
    `).join("");
}

function resetPettyForm() {
  const form = $("pettyForm");

  if (form) form.reset();

  editingPettyId = null;

  if ($("pettyId")) {
    $("pettyId").value = "";
  }

  if ($("pettyDate")) {
    $("pettyDate").value = today();
  }

  if ($("pettyModalTitle")) {
    $("pettyModalTitle").textContent =
      "Add Petty Cash";
  }
}

function openPettyModal(id = null) {
  resetPettyForm();

  if (id) {
    const row =
      pettyCash.find(p =>
        String(p.id) === String(id)
      );

    if (!row) return;

    editingPettyId = row.id;

    $("pettyId").value = row.id;
    $("pettyDate").value =
      row.cash_date || "";
    $("pettyPaidTo").value =
      row.paid_to || "";
    $("pettyCategory").value =
      row.category || "";
    $("pettyAmount").value =
      number(row.amount);
    $("pettyDescription").value =
      row.description || "";
    $("pettyNotes").value =
      row.notes || "";

    $("pettyModalTitle").textContent =
      "Edit Petty Cash";
  }

  openModal("pettyModal");
}

async function savePetty(event) {
  event.preventDefault();

  const payload = {
    cash_date:
      $("pettyDate")?.value || today(),
    paid_to:
      $("pettyPaidTo")?.value.trim() || "",
    category:
      $("pettyCategory")?.value.trim() || "Other",
    amount:
      number($("pettyAmount")?.value),
    description:
      $("pettyDescription")?.value.trim() || "",
    notes:
      $("pettyNotes")?.value.trim() || ""
  };

  try {
    let result;

    if (editingPettyId) {
      result = await supabase
        .from("petty_cash")
        .update(payload)
        .eq("id", editingPettyId);
    } else {
      result = await supabase
        .from("petty_cash")
        .insert(payload);
    }

    if (result.error) {
      throw result.error;
    }

    closeModal("pettyModal");

    showToast(
      editingPettyId
        ? "Petty cash updated."
        : "Petty cash transaction added."
    );

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Could not save petty cash.",
      "error"
    );
  }
}

async function deletePetty(id) {
  if (!confirm("Delete this petty cash transaction?")) {
    return;
  }

  try {
    const result =
      await supabase
        .from("petty_cash")
        .delete()
        .eq("id", id);

    if (result.error) {
      throw result.error;
    }

    showToast("Petty cash transaction deleted.");

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Could not delete transaction.",
      "error"
    );
  }
}


/* =========================================================
   REQUISITIONS
   ========================================================= */

function getUniqueReqNumbers() {
  return [
    ...new Set(
      requisitions
        .map(r => String(r.req_no || "").trim())
        .filter(Boolean)
    )
  ];
}

function getRequisitionRows(reqNo) {
  return requisitions.filter(
    r =>
      String(r.req_no || "").trim() ===
      String(reqNo || "").trim()
  );
}

function requisitionTotal(reqNo) {
  return getRequisitionRows(reqNo)
    .reduce(
      (sum, row) =>
        sum + number(row.total_amount),
      0
    );
}

function requisitionReceived(reqNo) {
  return getRequisitionRows(reqNo)
    .filter(r =>
      ["purchased", "completed"]
        .includes(
          String(r.status || "").toLowerCase()
        )
    )
    .reduce(
      (sum, row) =>
        sum + number(row.total_amount),
      0
    );
}

function requisitionFinance(reqNo) {
  const rows =
    getRequisitionRows(reqNo);

  return {
    total: rows.reduce(
      (sum, r) =>
        sum + number(r.total_amount),
      0
    ),
    received: rows
      .filter(r =>
        ["purchased", "completed"]
          .includes(
            String(r.status || "").toLowerCase()
          )
      )
      .reduce(
        (sum, r) =>
          sum + number(r.total_amount),
        0
      )
  };
}

function getRequisitionVehicle(reqNo) {
  const row =
    getRequisitionRows(reqNo)[0];

  if (!row || !row.vehicle_id) {
    return null;
  }

  return vehicles.find(
    v =>
      String(v.id) ===
      String(row.vehicle_id)
  );
}

function renderRequisitions() {
  const body =
    $("requisitionsTableBody");

  if (!body) return;

  const search =
    ($("reqSearch")?.value || "")
      .trim()
      .toLowerCase();

  const status =
    ($("reqStatusFilter")?.value || "")
      .trim()
      .toLowerCase();

  const unique =
    getUniqueReqNumbers();

  const rows = [];

  unique.forEach(reqNo => {
    const reqRows =
      getRequisitionRows(reqNo);

    reqRows.forEach(row => {
      rows.push(row);
    });
  });

  const filtered = rows.filter(row => {
    const vehicle =
      vehicles.find(v =>
        String(v.id) ===
        String(row.vehicle_id)
      );

    const text = [
      row.req_no,
      row.requested_by,
      row.item_description,
      row.category,
      row.expense_type,
      row.notes,
      vehicle?.registration,
      vehicle?.customer
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search || text.includes(search)) &&
      (!status ||
        String(row.status || "")
          .toLowerCase() === status)
    );
  });

  if ($("reqOverallTotal")) {
    const total =
      filtered.reduce(
        (sum, r) =>
          sum + number(r.total_amount),
        0
      );

    $("reqOverallTotal").textContent =
      money(total);
  }

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td colspan="11"
          style="text-align:center;padding:30px;color:#64748b">
          No requisitions found.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML =
    filtered.map(r => {
      const vehicle =
        vehicles.find(v =>
          String(v.id) ===
          String(r.vehicle_id)
        );

      return `
        <tr>

          <td>
            <strong>
              ${escapeHtml(r.req_no || "")}
            </strong>
          </td>

          <td>
            ${escapeHtml(formatDate(r.req_date))}
          </td>

          <td>
            ${escapeHtml(r.requested_by || "")}
          </td>

          <td>
            ${escapeHtml(
              vehicle?.registration || "General"
            )}
          </td>

          <td>
            ${escapeHtml(
              r.item_description || ""
            )}
          </td>

          <td>
            ${number(r.quantity)}
          </td>

          <td>
            ${money(r.unit_cost)}
          </td>

          <td>
            <strong>
              ${money(r.total_amount)}
            </strong>
          </td>

          <td>
            ${escapeHtml(
              r.expense_type ||
              r.category ||
              ""
            )}
          </td>

          <td>
            ${statusBadge(r.status || "Pending")}
          </td>

          <td>

            <div class="table-actions">

              <button
                class="action-btn"
                title="Edit"
                onclick="openReqModal('${escapeHtml(r.id)}')">
                ✏️
              </button>

              <button
                class="action-btn"
                title="Preview"
                onclick="previewReq('${escapeHtml(r.req_no)}')">
                👁
              </button>

              <button
                class="action-btn"
                title="Delete"
                onclick="deleteReq('${escapeHtml(r.id)}')">
                🗑
              </button>

            </div>

          </td>

        </tr>
      `;
    }).join("");
}


/* =========================================================
   REQUISITION MODAL
   ========================================================= */

function resetReqForm() {
  const form = $("reqForm");

  if (form) form.reset();

  editingReqId = null;

  if ($("reqId")) {
    $("reqId").value = "";
  }

  if ($("reqDate")) {
    $("reqDate").value = today();
  }

  if ($("reqStatus")) {
    $("reqStatus").value = "Pending";
  }

  if ($("reqModalTitle")) {
    $("reqModalTitle").textContent =
      "New Requisition";
  }

  calculateReqTotal();
}

function openReqModal(id = null) {
  resetReqForm();

  populateVehicleSelects();

  if (id) {
    const row =
      requisitions.find(r =>
        String(r.id) === String(id)
      );

    if (!row) return;

    editingReqId = row.id;

    $("reqId").value = row.id;
    $("reqNo").value = row.req_no || "";
    $("reqDate").value =
      row.req_date || "";
    $("reqRequestedBy").value =
      row.requested_by || "";
    $("reqVehicle").value =
      row.vehicle_id || "";
    $("reqItemDescription").value =
      row.item_description || "";
    $("reqQuantity").value =
      number(row.quantity);
    $("reqUnitCost").value =
      number(row.unit_cost);
    $("reqTotal").value =
      number(row.total_amount);
    $("reqStatus").value =
      row.status || "Pending";
    $("reqCategory").value =
      row.category || "";
    $("reqExpenseType").value =
      row.expense_type || "";
    $("reqNotes").value =
      row.notes || "";

    $("reqModalTitle").textContent =
      "Edit Requisition";
  }

  calculateReqTotal();

  openModal("reqModal");
}

function calculateReqTotal() {
  const qty =
    number($("reqQuantity")?.value);

  const unit =
    number($("reqUnitCost")?.value);

  const total = qty * unit;

  if ($("reqTotal")) {
    $("reqTotal").value =
      total.toFixed(2);
  }
}

async function saveReq(event) {
  event.preventDefault();

  const reqNo =
    $("reqNo")?.value.trim();

  const description =
    $("reqItemDescription")?.value.trim();

  if (!reqNo || !description) {
    showToast(
      "Requisition number and item description are required.",
      "error"
    );
    return;
  }

  const quantity =
    number($("reqQuantity")?.value);

  const unitCost =
    number($("reqUnitCost")?.value);

  const totalAmount =
    quantity * unitCost;

  /*
   * Only columns known to exist in the current
   * Supabase requisitions table are sent.
   */
  const payload = {
    req_no: reqNo,
    req_date:
      $("reqDate")?.value || today(),
    requested_by:
      $("reqRequestedBy")?.value.trim() || "",
    vehicle_id:
      $("reqVehicle")?.value || null,
    item_description:
      description,
    quantity,
    unit_cost:
      unitCost,
    total_amount:
      totalAmount,
    status:
      $("reqStatus")?.value || "Pending",
    notes:
      $("reqNotes")?.value.trim() || ""
  };

  try {
    let result;

    if (editingReqId) {
      result = await supabase
        .from("requisitions")
        .update(payload)
        .eq("id", editingReqId);
    } else {
      result = await supabase
        .from("requisitions")
        .insert(payload);
    }

    if (result.error) {
      throw result.error;
    }

    closeModal("reqModal");

    showToast(
      editingReqId
        ? "Requisition updated."
        : "Requisition added."
    );

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Could not save requisition.",
      "error"
    );
  }
}

async function deleteReq(id) {
  if (!confirm("Delete this requisition item?")) {
    return;
  }

  try {
    const result =
      await supabase
        .from("requisitions")
        .delete()
        .eq("id", id);

    if (result.error) {
      throw result.error;
    }

    showToast("Requisition deleted.");

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Could not delete requisition.",
      "error"
    );
  }
}


/* =========================================================
   REQUISITION PREVIEW
   ========================================================= */

function previewReq(reqNo) {
  selectedReqNo = reqNo;

  const content =
    $("reqPreviewContent");

  if (!content) return;

  const rows =
    getRequisitionRows(reqNo);

  if (!rows.length) {
    content.innerHTML =
      "<p>No requisition found.</p>";

    openModal("reqPreviewModal");
    return;
  }

  const first = rows[0];

  const vehicle =
    vehicles.find(v =>
      String(v.id) ===
      String(first.vehicle_id)
    );

  const total =
    rows.reduce(
      (sum, r) =>
        sum + number(r.total_amount),
      0
    );

  content.innerHTML = `
    <div style="font-family:Arial,sans-serif">

      <div style="
        display:flex;
        justify-content:space-between;
        gap:20px;
        margin-bottom:20px;
      ">

        <div>
          <h2 style="margin-bottom:5px">
            GARAGE OPERATIONS PRO
          </h2>

          <div style="color:#64748b;font-size:12px">
            Requisition Preview
          </div>
        </div>

        <div style="text-align:right">
          <strong>
            ${escapeHtml(reqNo)}
          </strong>

          <div style="font-size:12px;color:#64748b">
            ${escapeHtml(formatDate(first.req_date))}
          </div>
        </div>

      </div>

      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
        margin-bottom:20px;
      ">

        <div>
          <strong>Requested By</strong><br>
          ${escapeHtml(first.requested_by || "")}
        </div>

        <div>
          <strong>Vehicle</strong><br>
          ${escapeHtml(
            vehicle?.registration || "General"
          )}
        </div>

      </div>

      <table style="
        width:100%;
        border-collapse:collapse;
      ">

        <thead>
          <tr>
            <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd">
              Description
            </th>

            <th style="text-align:right;padding:8px;border-bottom:1px solid #ddd">
              Qty
            </th>

            <th style="text-align:right;padding:8px;border-bottom:1px solid #ddd">
              Unit
            </th>

            <th style="text-align:right;padding:8px;border-bottom:1px solid #ddd">
              Total
            </th>
          </tr>
        </thead>

        <tbody>

          ${rows.map(r => `
            <tr>

              <td style="padding:8px;border-bottom:1px solid #eee">
                ${escapeHtml(r.item_description || "")}
              </td>

              <td style="text-align:right;padding:8px;border-bottom:1px solid #eee">
                ${number(r.quantity)}
              </td>

              <td style="text-align:right;padding:8px;border-bottom:1px solid #eee">
                ${money(r.unit_cost)}
              </td>

              <td style="text-align:right;padding:8px;border-bottom:1px solid #eee">
                ${money(r.total_amount)}
              </td>

            </tr>
          `).join("")}

        </tbody>

      </table>

      <div style="
        margin-top:20px;
        text-align:right;
        font-size:18px;
        font-weight:800;
      ">
        Total: ${money(total)}
      </div>

    </div>
  `;

  openModal("reqPreviewModal");
}

function previewSelectedReq() {
  const reqNo =
    selectedReqNo ||
    getUniqueReqNumbers()[0];

  if (!reqNo) {
    showToast(
      "There is no requisition to preview.",
      "warning"
    );
    return;
  }

  previewReq(reqNo);
}

function printSelectedReq() {
  if (!selectedReqNo) {
    showToast(
      "Select a requisition first.",
      "warning"
    );
    return;
  }

  const rows =
    getRequisitionRows(selectedReqNo);

  const vehicle =
    getRequisitionVehicle(selectedReqNo);

  const total =
    requisitionTotal(selectedReqNo);

  const html = `
    <h1>GARAGE OPERATIONS PRO</h1>
    <h2>REQUISITION</h2>

    <p>
      <strong>Requisition No:</strong>
      ${escapeHtml(selectedReqNo)}
    </p>

    <p>
      <strong>Date:</strong>
      ${escapeHtml(formatDate(rows[0]?.req_date))}
    </p>

    <p>
      <strong>Requested By:</strong>
      ${escapeHtml(rows[0]?.requested_by || "")}
    </p>

    <p>
      <strong>Vehicle:</strong>
      ${escapeHtml(vehicle?.registration || "General")}
    </p>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit Cost</th>
          <th>Total</th>
        </tr>
      </thead>

      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${escapeHtml(r.item_description || "")}</td>
            <td>${number(r.quantity)}</td>
            <td>${money(r.unit_cost)}</td>
            <td>${money(r.total_amount)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <h3 style="text-align:right">
      Total: ${money(total)}
    </h3>
  `;

  printHtml(
    html,
    `Requisition ${selectedReqNo}`
  );
}


/* =========================================================
   VEHICLE EXPENSE PREVIEW
   ========================================================= */

function openVehicleExpensePreview(vehicleId) {
  selectedVehicleExpenseId = vehicleId;

  const vehicle =
    vehicles.find(v =>
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

  const rows =
    expenses.filter(e =>
      String(e.vehicle_id) ===
      String(vehicleId)
    );

  const expenseTotal =
    rows.reduce(
      (sum, e) =>
        sum + number(e.amount),
      0
    );

  const reqRows =
    requisitions.filter(r =>
      String(r.vehicle_id) ===
      String(vehicleId)
    );

  const reqTotal =
    reqRows.reduce(
      (sum, r) =>
        sum + number(r.total_amount),
      0
    );

  const total =
    expenseTotal + reqTotal;

  const content =
    $("vehicleExpensePreviewContent");

  if (!content) return;

  content.innerHTML = `
    <div>

      <h2 style="margin-bottom:6px">
        ${escapeHtml(vehicle.registration || "")}
      </h2>

      <p style="color:#64748b;margin-bottom:20px">
        ${escapeHtml(vehicle.customer || "")}
      </p>

      <h4 style="margin-bottom:10px">
        Workshop Expenses
      </h4>

      ${
        rows.length
          ? `
            <table style="width:100%;border-collapse:collapse">

              <thead>
                <tr>
                  <th style="text-align:left;padding:8px">
                    Date
                  </th>

                  <th style="text-align:left;padding:8px">
                    Description
                  </th>

                  <th style="text-align:left;padding:8px">
                    Category
                  </th>

                  <th style="text-align:right;padding:8px">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>

                ${rows.map(e => `
                  <tr>
                    <td style="padding:8px">
                      ${escapeHtml(formatDate(e.expense_date))}
                    </td>

                    <td style="padding:8px">
                      ${escapeHtml(e.description || "")}
                    </td>

                    <td style="padding:8px">
                      ${escapeHtml(e.category || "")}
                    </td>

                    <td style="padding:8px;text-align:right">
                      ${money(e.amount)}
                    </td>
                  </tr>
                `).join("")}

              </tbody>
            </table>
          `
          : `
            <p style="color:#64748b">
              No expenses recorded.
            </p>
          `
      }

      <div style="
        margin-top:20px;
        padding-top:15px;
        border-top:1px solid #eee;
      ">

        <div style="
          display:flex;
          justify-content:space-between;
          margin-bottom:8px;
        ">
          <span>Workshop Expenses</span>
          <strong>${money(expenseTotal)}</strong>
        </div>

        <div style="
          display:flex;
          justify-content:space-between;
          margin-bottom:8px;
        ">
          <span>Requisitions</span>
          <strong>${money(reqTotal)}</strong>
        </div>

        <div style="
          display:flex;
          justify-content:space-between;
          font-size:18px;
          font-weight:800;
        ">
          <span>Total Cost</span>
          <strong>${money(total)}</strong>
        </div>

      </div>

    </div>
  `;

  openModal(
    "vehicleExpensePreviewModal"
  );
}

function printVehicleExpensePreview() {
  if (!selectedVehicleExpenseId) {
    showToast(
      "Select a vehicle first.",
      "warning"
    );
    return;
  }

  const vehicle =
    vehicles.find(v =>
      String(v.id) ===
      String(selectedVehicleExpenseId)
    );

  if (!vehicle) return;

  const rows =
    expenses.filter(e =>
      String(e.vehicle_id) ===
      String(vehicle.id)
    );

  const reqRows =
    requisitions.filter(r =>
      String(r.vehicle_id) ===
      String(vehicle.id)
    );

  const expenseTotal =
    rows.reduce(
      (sum, e) =>
        sum + number(e.amount),
      0
    );

  const reqTotal =
    reqRows.reduce(
      (sum, r) =>
        sum + number(r.total_amount),
      0
    );

  const total =
    expenseTotal + reqTotal;

  const html = `
    <h1>GARAGE OPERATIONS PRO</h1>

    <h2>VEHICLE EXPENSE SUMMARY</h2>

    <p>
      <strong>Registration:</strong>
      ${escapeHtml(vehicle.registration || "")}
    </p>

    <p>
      <strong>Customer:</strong>
      ${escapeHtml(vehicle.customer || "")}
    </p>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Category</th>
          <th>Amount</th>
        </tr>
      </thead>

      <tbody>
        ${rows.map(e => `
          <tr>
            <td>${escapeHtml(formatDate(e.expense_date))}</td>
            <td>${escapeHtml(e.description || "")}</td>
            <td>${escapeHtml(e.category || "")}</td>
            <td>${money(e.amount)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <h3>Workshop Expenses: ${money(expenseTotal)}</h3>
    <h3>Requisitions: ${money(reqTotal)}</h3>
    <h2>Total Cost: ${money(total)}</h2>
  `;

  printHtml(
    html,
    `Vehicle Expenses - ${vehicle.registration}`
  );
}


/* =========================================================
   INVOICE / GATE PASS UI
   ========================================================= */

function ensureInvoiceGatePassUI() {
  if (!$("invoices")) {
    createInvoiceSection();
  }

  if (!$("gatePasses")) {
    createGatePassSection();
  }

  if (!$("invoiceModal")) {
    createInvoiceModal();
  }

  if (!$("gatePassModal")) {
    createGatePassModal();
  }

  addNewNavigationButtons();
}


/* =========================================================
   ADD NAVIGATION
   ========================================================= */

function addNewNavigationButtons() {
  const sidebarNav =
    document.querySelector(".sidebar nav");

  if (sidebarNav) {
    if (!sidebarNav.querySelector(
      '[data-section="invoices"]'
    )) {
      sidebarNav.insertAdjacentHTML(
        "beforeend",
        `
          <button
            class="nav-btn"
            data-section="invoices"
            onclick="showSection('invoices',this)">

            <span class="nav-icon">🧾</span>
            Invoices

          </button>

          <button
            class="nav-btn"
            data-section="gatePasses"
            onclick="showSection('gatePasses',this)">

            <span class="nav-icon">🚪</span>
            Gate Passes

          </button>
        `
      );
    }
  }

  const mobileNav =
    document.querySelector(".mobile-bottom-nav");

  if (mobileNav) {
    if (!mobileNav.querySelector(
      '[data-section="invoices"]'
    )) {
      const moreButton =
        document.createElement("button");

      moreButton.className =
        "mobile-nav-btn";

      moreButton.dataset.section =
        "invoices";

      moreButton.innerHTML = `
        <span>🧾</span>
        <span>Invoices</span>
      `;

      moreButton.onclick = () =>
        showSection(
          "invoices",
          moreButton
        );

      mobileNav.appendChild(
        moreButton
      );

      const gateButton =
        document.createElement("button");

      gateButton.className =
        "mobile-nav-btn";

      gateButton.dataset.section =
        "gatePasses";

      gateButton.innerHTML = `
        <span>🚪</span>
        <span>Gate</span>
      `;

      gateButton.onclick = () =>
        showSection(
          "gatePasses",
          gateButton
        );

      mobileNav.appendChild(
        gateButton
      );
    }
  }
}


/* =========================================================
   INVOICE SECTION
   ========================================================= */

function createInvoiceSection() {
  const content =
    document.querySelector(".content");

  if (!content) return;

  const section =
    document.createElement("section");

  section.id = "invoices";
  section.className = "app-section";
  section.style.display = "none";

  section.innerHTML = `
    <div class="page-header">

      <div>
        <h2>Invoices</h2>

        <p>
          Create and manage customer invoices.
        </p>
      </div>

      <div class="header-actions">

        <button
          class="btn"
          onclick="printInvoices()">
          🖨 Print
        </button>

        <button
          class="btn btn-primary"
          onclick="openInvoiceModal()">
          + New Invoice
        </button>

      </div>

    </div>

    <div class="toolbar">

      <div class="search-box">
        <input
          id="invoiceSearch"
          type="search"
          placeholder="Search invoice, vehicle or customer...">
      </div>

      <select
        id="invoiceStatusFilter"
        class="filter-select"
        style="max-width:190px">

        <option value="">All Statuses</option>
        <option value="Paid">Paid</option>
        <option value="Part Paid">Part Paid</option>
        <option value="Unpaid">Unpaid</option>

      </select>

    </div>

    <div class="table-card">

      <table>

        <thead>

          <tr>
            <th>Invoice No.</th>
            <th>Date</th>
            <th>Vehicle</th>
            <th>Customer</th>
            <th>Total</th>
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

  content.appendChild(section);
}


/* =========================================================
   GATE PASS SECTION
   ========================================================= */

function createGatePassSection() {
  const content =
    document.querySelector(".content");

  if (!content) return;

  const section =
    document.createElement("section");

  section.id = "gatePasses";
  section.className = "app-section";
  section.style.display = "none";

  section.innerHTML = `
    <div class="page-header">

      <div>
        <h2>Gate Passes</h2>

        <p>
          Record and print vehicle release passes.
        </p>
      </div>

      <div class="header-actions">

        <button
          class="btn"
          onclick="printGatePasses()">
          🖨 Print
        </button>

        <button
          class="btn btn-primary"
          onclick="openGatePassModal()">
          + New Gate Pass
        </button>

      </div>

    </div>

    <div class="toolbar">

      <div class="search-box">
        <input
          id="gateSearch"
          type="search"
          placeholder="Search gate pass, vehicle or customer...">
      </div>

      <select
        id="gateStatusFilter"
        class="filter-select"
        style="max-width:190px">

        <option value="">All Statuses</option>
        <option value="Released">Released</option>
        <option value="Pending">Pending</option>

      </select>

    </div>

    <div class="table-card">

      <table>

        <thead>

          <tr>
            <th>Gate Pass</th>
            <th>Date</th>
            <th>Vehicle</th>
            <th>Customer</th>
            <th>Released To</th>
            <th>Invoice</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>

        </thead>

        <tbody id="gatePassesTableBody"></tbody>

      </table>

    </div>
  `;

  content.appendChild(section);
}


/* =========================================================
   INVOICE MODAL
   ========================================================= */

function createInvoiceModal() {
  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div id="invoiceModal" class="modal">

        <div class="modal-content">

          <div class="modal-header">

            <h3 id="invoiceModalTitle">
              New Invoice
            </h3>

            <button
              class="modal-close"
              onclick="closeModal('invoiceModal')">
              ✕
            </button>

          </div>

          <form id="invoiceForm">

            <div class="modal-body">

              <input
                id="invoiceId"
                type="hidden">

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

                <div class="form-group full">
                  <label>Vehicle</label>

                  <select
                    id="invoiceVehicle"
                    required>
                    <option value="">
                      Select Vehicle
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Customer</label>

                  <input
                    id="invoiceCustomer"
                    required>
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
                  <label>Other Charges</label>

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
                  <label>Payment Status</label>

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

                <div class="form-group full">
                  <label>Notes</label>

                  <textarea
                    id="invoiceNotes"
                    placeholder="Invoice notes..."></textarea>
                </div>

              </div>

            </div>

            <div class="modal-footer">

              <button
                type="button"
                class="btn"
                onclick="closeModal('invoiceModal')">
                Cancel
              </button>

              <button
                type="button"
                class="btn"
                onclick="autoCalculateInvoice()">
                ↻ Calculate
              </button>

              <button
                type="submit"
                class="btn btn-primary">
                Save Invoice
              </button>

            </div>

          </form>

        </div>

      </div>
    `
  );
}


/* =========================================================
   GATE PASS MODAL
   ========================================================= */

function createGatePassModal() {
  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div id="gatePassModal" class="modal">

        <div class="modal-content">

          <div class="modal-header">

            <h3 id="gatePassModalTitle">
              New Gate Pass
            </h3>

            <button
              class="modal-close"
              onclick="closeModal('gatePassModal')">
              ✕
            </button>

          </div>

          <form id="gatePassForm">

            <div class="modal-body">

              <input
                id="gatePassId"
                type="hidden">

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
                    type="datetime-local"
                    required>
                </div>

                <div class="form-group full">
                  <label>Vehicle</label>

                  <select
                    id="gateVehicle"
                    required>
                    <option value="">
                      Select Vehicle
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Customer</label>

                  <input
                    id="gateCustomer">
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

                  <select id="gateInvoice">
                    <option value="">
                      No Invoice
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Amount Paid</label>

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
                  <label>Authorised By</label>

                  <input
                    id="gateAuthorizedBy">
                </div>

                <div class="form-group">
                  <label>Status</label>

                  <select id="gateStatus">

                    <option value="Released">
                      Released
                    </option>

                    <option value="Pending">
                      Pending
                    </option>

                  </select>
                </div>

                <div class="form-group full">
                  <label>Notes</label>

                  <textarea
                    id="gateNotes"
                    placeholder="Release notes..."></textarea>
                </div>

              </div>

            </div>

            <div class="modal-footer">

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

      </div>
    `
  );
}


/* =========================================================
   AUTO INVOICE CALCULATION
   ========================================================= */

function calculateVehicleCharges(
  vehicleId
) {
  const vehicleExpenses =
    expenses.filter(e =>
      String(e.vehicle_id) ===
      String(vehicleId)
    );

  let labour = 0;
  let parts = 0;
  let other = 0;

  vehicleExpenses.forEach(e => {
    const category =
      String(e.category || "")
        .trim()
        .toLowerCase();

    const amount =
      number(e.amount);

    if (category === "labour" ||
        category === "labor") {
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

  const vehicleReqs =
    requisitions.filter(r =>
      String(r.vehicle_id) ===
      String(vehicleId)
    );

  /*
   * Existing requisitions do not necessarily have
   * category/expense_type stored because the current
   * database structure was intentionally preserved.
   *
   * Therefore their value is added to Parts/Materials.
   */
  parts += vehicleReqs.reduce(
    (sum, r) =>
      sum + number(r.total_amount),
    0
  );

  return {
    labour,
    parts,
    other
  };
}

function autoCalculateInvoice() {
  const vehicleId =
    $("invoiceVehicle")?.value;

  if (vehicleId) {
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
  }

  calculateInvoiceTotals();
}

function calculateInvoiceTotals() {
  const labour =
    number($("invoiceLabour")?.value);

  const parts =
    number($("invoiceParts")?.value);

  const other =
    number($("invoiceOther")?.value);

  const subtotal =
    labour + parts + other;

  let paid =
    number($("invoicePaid")?.value);

  if (paid < 0) paid = 0;

  const balance =
    Math.max(subtotal - paid, 0);

  if ($("invoiceSubtotal")) {
    $("invoiceSubtotal").value =
      subtotal.toFixed(2);
  }

  if ($("invoiceBalance")) {
    $("invoiceBalance").value =
      balance.toFixed(2);
  }

  if ($("invoiceStatus")) {
    if (subtotal <= 0) {
      $("invoiceStatus").value =
        "Unpaid";
    } else if (paid >= subtotal) {
      $("invoiceStatus").value =
        "Paid";
    } else if (paid > 0) {
      $("invoiceStatus").value =
        "Part Paid";
    } else {
      $("invoiceStatus").value =
        "Unpaid";
    }
  }
}


/* =========================================================
   INVOICE MODAL
   ========================================================= */

function resetInvoiceForm() {
  const form =
    $("invoiceForm");

  if (form) {
    form.reset();
  }

  editingInvoiceId = null;

  if ($("invoiceId")) {
    $("invoiceId").value = "";
  }

  if ($("invoiceNo")) {
    $("invoiceNo").value =
      generateNumber(
        "INV",
        invoices,
        "invoice_no"
      );
  }

  if ($("invoiceDate")) {
    $("invoiceDate").value =
      today();
  }

  if ($("invoiceLabour")) {
    $("invoiceLabour").value = "0";
  }

  if ($("invoiceParts")) {
    $("invoiceParts").value = "0";
  }

  if ($("invoiceOther")) {
    $("invoiceOther").value = "0";
  }

  if ($("invoicePaid")) {
    $("invoicePaid").value = "0";
  }

  if ($("invoiceModalTitle")) {
    $("invoiceModalTitle").textContent =
      "New Invoice";
  }

  calculateInvoiceTotals();
}

function populateInvoiceSelect() {
  const select =
    $("gateInvoice");

  if (!select) return;

  const current =
    select.value;

  select.innerHTML =
    `<option value="">No Invoice</option>` +
    invoices.map(inv => `
      <option value="${escapeHtml(inv.invoice_no || "")}">
        ${escapeHtml(inv.invoice_no || "")}
        —
        ${escapeHtml(inv.vehicle_registration || "")}
        —
        ${money(inv.subtotal)}
      </option>
    `).join("");

  if (
    [...select.options]
      .some(o => o.value === current)
  ) {
    select.value = current;
  }
}

function openInvoiceModal(
  id = null,
  vehicleId = null
) {
  ensureInvoiceGatePassUI();

  resetInvoiceForm();
  populateVehicleSelects();

  if (id) {
    const invoice =
      invoices.find(i =>
        String(i.id) === String(id)
      );

    if (!invoice) return;

    editingInvoiceId =
      invoice.id;

    $("invoiceId").value =
      invoice.id;

    $("invoiceNo").value =
      invoice.invoice_no || "";

    $("invoiceDate").value =
      invoice.invoice_date || "";

    $("invoiceVehicle").value =
      invoice.vehicle_id || "";

    $("invoiceCustomer").value =
      invoice.customer || "";

    $("invoiceJobDescription").value =
      invoice.job_description || "";

    $("invoiceLabour").value =
      number(invoice.labour_amount);

    $("invoiceParts").value =
      number(invoice.parts_amount);

    $("invoiceOther").value =
      number(invoice.other_amount);

    $("invoiceSubtotal").value =
      number(invoice.subtotal).toFixed(2);

    $("invoicePaid").value =
      number(invoice.paid_amount);

    $("invoiceBalance").value =
      number(invoice.balance).toFixed(2);

    $("invoiceStatus").value =
      invoice.status || "Unpaid";

    $("invoiceNotes").value =
      invoice.notes || "";

    $("invoiceModalTitle").textContent =
      "Edit Invoice";

  } else if (vehicleId) {

    const vehicle =
      vehicles.find(v =>
        String(v.id) ===
        String(vehicleId)
      );

    if (vehicle) {
      $("invoiceVehicle").value =
        vehicle.id;

      $("invoiceCustomer").value =
        vehicle.customer || "";

      $("invoiceJobDescription").value =
        vehicle.description ||
        vehicle.job_type ||
        "";

      autoCalculateInvoice();
    }

  }

  openModal("invoiceModal");
}


/* =========================================================
   SAVE INVOICE
   ========================================================= */

async function saveInvoice(event) {
  event.preventDefault();

  const vehicleId =
    $("invoiceVehicle")?.value;

  const vehicle =
    vehicles.find(v =>
      String(v.id) ===
      String(vehicleId)
    );

  if (!vehicle) {
    showToast(
      "Please select a vehicle.",
      "error"
    );
    return;
  }

  calculateInvoiceTotals();

  const subtotal =
    number($("invoiceSubtotal")?.value);

  const paid =
    Math.min(
      number($("invoicePaid")?.value),
      subtotal
    );

  const balance =
    Math.max(subtotal - paid, 0);

  let status =
    $("invoiceStatus")?.value ||
    "Unpaid";

  if (paid >= subtotal && subtotal > 0) {
    status = "Paid";
  } else if (paid > 0) {
    status = "Part Paid";
  } else {
    status = "Unpaid";
  }

  const payload = {
    invoice_no:
      $("invoiceNo")?.value.trim(),
    invoice_date:
      $("invoiceDate")?.value || today(),
    vehicle_id:
      String(vehicle.id),
    vehicle_registration:
      vehicle.registration || "",
    customer:
      $("invoiceCustomer")?.value.trim() ||
      vehicle.customer ||
      "",
    job_description:
      $("invoiceJobDescription")?.value.trim() ||
      "",
    labour_amount:
      number($("invoiceLabour")?.value),
    parts_amount:
      number($("invoiceParts")?.value),
    other_amount:
      number($("invoiceOther")?.value),
    subtotal,
    paid_amount:
      paid,
    balance,
    status,
    notes:
      $("invoiceNotes")?.value.trim() ||
      ""
  };

  if (!payload.invoice_no) {
    showToast(
      "Invoice number is required.",
      "error"
    );
    return;
  }

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
          .insert(payload);
    }

    if (result.error) {
      throw result.error;
    }

    closeModal("invoiceModal");

    showToast(
      editingInvoiceId
        ? "Invoice updated successfully."
        : "Invoice created successfully."
    );

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Could not save invoice. Make sure the invoices table exists.",
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
    ($("invoiceSearch")?.value || "")
      .trim()
      .toLowerCase();

  const status =
    ($("invoiceStatusFilter")?.value || "")
      .trim()
      .toLowerCase();

  const filtered =
    invoices.filter(inv => {
      const text = [
        inv.invoice_no,
        inv.vehicle_registration,
        inv.customer,
        inv.job_description
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!search || text.includes(search)) &&
        (!status ||
          String(inv.status || "")
            .toLowerCase() === status)
      );
    });

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td colspan="9"
          style="text-align:center;padding:30px;color:#64748b">
          ${
            invoices.length
              ? "No invoices match your search."
              : "No invoices have been created yet."
          }
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML =
    filtered.map(inv => `
      <tr>

        <td>
          <strong>
            ${escapeHtml(inv.invoice_no || "")}
          </strong>
        </td>

        <td>
          ${escapeHtml(formatDate(inv.invoice_date))}
        </td>

        <td>
          ${escapeHtml(
            inv.vehicle_registration || ""
          )}
        </td>

        <td>
          ${escapeHtml(inv.customer || "")}
        </td>

        <td>
          <strong>
            ${money(inv.subtotal)}
          </strong>
        </td>

        <td>
          ${money(inv.paid_amount)}
        </td>

        <td>
          <strong>
            ${money(inv.balance)}
          </strong>
        </td>

        <td>
          ${statusBadge(inv.status || "Unpaid")}
        </td>

        <td>

          <div class="table-actions">

            <button
              class="action-btn"
              title="Edit"
              onclick="openInvoiceModal('${escapeHtml(inv.id)}')">
              ✏️
            </button>

            <button
              class="action-btn"
              title="Print"
              onclick="printInvoice('${escapeHtml(inv.id)}')">
              🖨
            </button>

            <button
              class="action-btn"
              title="Gate Pass"
              onclick="openGatePassModal(null,'${escapeHtml(inv.vehicle_id)}','${escapeHtml(inv.invoice_no)}')">
              🚪
            </button>

            <button
              class="action-btn"
              title="Delete"
              onclick="deleteInvoice('${escapeHtml(inv.id)}')">
              🗑
            </button>

          </div>

        </td>

      </tr>
    `).join("");
}


/* =========================================================
   DELETE INVOICE
   ========================================================= */

async function deleteInvoice(id) {
  const invoice =
    invoices.find(i =>
      String(i.id) === String(id)
    );

  if (!invoice) return;

  if (!confirm(
    `Delete invoice ${invoice.invoice_no || ""}?`
  )) {
    return;
  }

  try {
    const result =
      await supabase
        .from("invoices")
        .delete()
        .eq("id", id);

    if (result.error) {
      throw result.error;
    }

    showToast("Invoice deleted.");

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Could not delete invoice.",
      "error"
    );
  }
}


/* =========================================================
   INVOICE PRINT
   ========================================================= */

function printInvoice(id) {
  const invoice =
    invoices.find(i =>
      String(i.id) === String(id)
    );

  if (!invoice) {
    showToast(
      "Invoice not found.",
      "error"
    );
    return;
  }

  const html = `
    <div class="invoice">

      <div class="invoice-header">

        <div>
          <h1>GARAGE OPERATIONS PRO</h1>

          <p>
            Vehicle • Finance • Workshop Operations
          </p>
        </div>

        <div class="invoice-title">
          <h2>INVOICE</h2>

          <p>
            <strong>
              ${escapeHtml(invoice.invoice_no || "")}
            </strong>
          </p>

          <p>
            ${escapeHtml(formatDate(invoice.invoice_date))}
          </p>
        </div>

      </div>

      <hr>

      <div class="two-column">

        <div>
          <h4>CUSTOMER</h4>

          <p>
            ${escapeHtml(invoice.customer || "")}
          </p>
        </div>

        <div>
          <h4>VEHICLE</h4>

          <p>
            ${escapeHtml(
              invoice.vehicle_registration || ""
            )}
          </p>
        </div>

      </div>

      <div class="description-box">

        <strong>Job Description</strong>

        <p>
          ${escapeHtml(
            invoice.job_description || ""
          )}
        </p>

      </div>

      <table>

        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align:right">
              Amount
            </th>
          </tr>
        </thead>

        <tbody>

          <tr>
            <td>Labour</td>
            <td style="text-align:right">
              ${money(invoice.labour_amount)}
            </td>
          </tr>

          <tr>
            <td>Parts / Materials</td>
            <td style="text-align:right">
              ${money(invoice.parts_amount)}
            </td>
          </tr>

          <tr>
            <td>Other Charges</td>
            <td style="text-align:right">
              ${money(invoice.other_amount)}
            </td>
          </tr>

        </tbody>

      </table>

      <div class="invoice-total">

        <div>
          Subtotal
          <strong>
            ${money(invoice.subtotal)}
          </strong>
        </div>

        <div>
          Amount Paid
          <strong>
            ${money(invoice.paid_amount)}
          </strong>
        </div>

        <div class="balance">
          Balance Due
          <strong>
            ${money(invoice.balance)}
          </strong>
        </div>

      </div>

      <p style="margin-top:20px">
        <strong>Payment Status:</strong>
        ${escapeHtml(invoice.status || "")}
      </p>

      ${
        invoice.notes
          ? `
            <div class="notes">
              <strong>Notes</strong>
              <p>${escapeHtml(invoice.notes)}</p>
            </div>
          `
          : ""
      }

      <div class="signature-area">

        <div>
          Customer Signature
        </div>

        <div>
          Authorised Signature
        </div>

      </div>

    </div>
  `;

  printHtml(
    html,
    `Invoice ${invoice.invoice_no}`
  );
}

function printInvoices() {
  if (!invoices.length) {
    showToast(
      "There are no invoices to print.",
      "warning"
    );
    return;
  }

  const rows =
    invoices.map(inv => `
      <tr>
        <td>${escapeHtml(inv.invoice_no || "")}</td>
        <td>${escapeHtml(formatDate(inv.invoice_date))}</td>
        <td>${escapeHtml(inv.vehicle_registration || "")}</td>
        <td>${escapeHtml(inv.customer || "")}</td>
        <td>${money(inv.subtotal)}</td>
        <td>${money(inv.paid_amount)}</td>
        <td>${money(inv.balance)}</td>
        <td>${escapeHtml(inv.status || "")}</td>
      </tr>
    `).join("");

  printHtml(
    `
      <h1>GARAGE OPERATIONS PRO</h1>
      <h2>INVOICE REGISTER</h2>

      <table>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Date</th>
            <th>Vehicle</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>
      </table>
    `,
    "Invoice Register"
  );
}


/* =========================================================
   GATE PASS HELPERS
   ========================================================= */

function populateGateInvoiceSelect() {
  populateInvoiceSelect();
}

function fillGatePassFromVehicle() {
  const vehicleId =
    $("gateVehicle")?.value;

  if (!vehicleId) return;

  const vehicle =
    vehicles.find(v =>
      String(v.id) ===
      String(vehicleId)
    );

  if (!vehicle) return;

  if ($("gateCustomer")) {
    $("gateCustomer").value =
      vehicle.customer || "";
  }

  if ($("gateReleasedTo")) {
    $("gateReleasedTo").value =
      vehicle.released_to || "";
  }

  if ($("gateReleasedContact")) {
    $("gateReleasedContact").value =
      vehicle.released_contact || "";
  }

  const invoice =
    invoices.find(i =>
      String(i.vehicle_id) ===
      String(vehicleId) &&
      number(i.balance) > 0
    ) ||
    invoices.find(i =>
      String(i.vehicle_id) ===
      String(vehicleId)
    );

  if (invoice) {
    if ($("gateInvoice")) {
      $("gateInvoice").value =
        invoice.invoice_no || "";
    }

    if ($("gatePaid")) {
      $("gatePaid").value =
        number(invoice.paid_amount);
    }

    if ($("gateBalance")) {
      $("gateBalance").value =
        number(invoice.balance);
    }
  } else {
    const paid =
      number(vehicle.paid);

    const balance =
      Math.max(
        number(vehicle.billed) - paid,
        0
      );

    if ($("gatePaid")) {
      $("gatePaid").value =
        paid;
    }

    if ($("gateBalance")) {
      $("gateBalance").value =
        balance;
    }
  }
}

function fillGatePassFromInvoice() {
  const invoiceNo =
    $("gateInvoice")?.value;

  if (!invoiceNo) {
    return;
  }

  const invoice =
    invoices.find(i =>
      String(i.invoice_no) ===
      String(invoiceNo)
    );

  if (!invoice) return;

  if ($("gateVehicle")) {
    $("gateVehicle").value =
      invoice.vehicle_id || "";
  }

  if ($("gateCustomer")) {
    $("gateCustomer").value =
      invoice.customer || "";
  }

  if ($("gatePaid")) {
    $("gatePaid").value =
      number(invoice.paid_amount);
  }

  if ($("gateBalance")) {
    $("gateBalance").value =
      number(invoice.balance);
  }

  const vehicle =
    vehicles.find(v =>
      String(v.id) ===
      String(invoice.vehicle_id)
    );

  if (vehicle) {
    if ($("gateReleasedTo")) {
      $("gateReleasedTo").value =
        vehicle.released_to || "";
    }

    if ($("gateReleasedContact")) {
      $("gateReleasedContact").value =
        vehicle.released_contact || "";
    }
  }
}


/* =========================================================
   GATE PASS MODAL
   ========================================================= */

function resetGatePassForm() {
  const form =
    $("gatePassForm");

  if (form) {
    form.reset();
  }

  editingGatePassId = null;

  if ($("gatePassId")) {
    $("gatePassId").value = "";
  }

  if ($("gatePassNo")) {
    $("gatePassNo").value =
      generateNumber(
        "GP",
        gatePasses,
        "gate_pass_no"
      );
  }

  if ($("gatePassDate")) {
    const now =
      new Date();

    const local =
      new Date(
        now.getTime() -
        now.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);

    $("gatePassDate").value =
      local;
  }

  if ($("gateAuthorizedBy")) {
    $("gateAuthorizedBy").value =
      currentUser()
        .charAt(0)
        .toUpperCase() +
      currentUser().slice(1);
  }

  if ($("gateStatus")) {
    $("gateStatus").value =
      "Released";
  }

  if ($("gatePassModalTitle")) {
    $("gatePassModalTitle").textContent =
      "New Gate Pass";
  }
}

function openGatePassModal(
  id = null,
  vehicleId = null,
  invoiceNo = null
) {
  ensureInvoiceGatePassUI();

  resetGatePassForm();

  populateVehicleSelects();
  populateGateInvoiceSelect();

  if (id) {
    const pass =
      gatePasses.find(g =>
        String(g.id) ===
        String(id)
      );

    if (!pass) return;

    editingGatePassId =
      pass.id;

    $("gatePassId").value =
      pass.id;

    $("gatePassNo").value =
      pass.gate_pass_no || "";

    if (pass.pass_date) {
      const d =
        new Date(pass.pass_date);

      if (!Number.isNaN(d.getTime())) {
        const local =
          new Date(
            d.getTime() -
            d.getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(0, 16);

        $("gatePassDate").value =
          local;
      }
    }

    $("gateVehicle").value =
      pass.vehicle_id || "";

    $("gateCustomer").value =
      pass.customer || "";

    $("gateReleasedTo").value =
      pass.released_to || "";

    $("gateReleasedContact").value =
      pass.released_contact || "";

    $("gateInvoice").value =
      pass.invoice_no || "";

    $("gatePaid").value =
      number(pass.amount_paid);

    $("gateBalance").value =
      number(pass.balance);

    $("gateAuthorizedBy").value =
      pass.authorized_by || "";

    $("gateStatus").value =
      pass.status || "Released";

    $("gateNotes").value =
      pass.notes || "";

    $("gatePassModalTitle").textContent =
      "Edit Gate Pass";

  } else {

    if (vehicleId) {
      $("gateVehicle").value =
        vehicleId;

      fillGatePassFromVehicle();
    }

    if (invoiceNo) {
      $("gateInvoice").value =
        invoiceNo;

      fillGatePassFromInvoice();
    }

  }

  openModal("gatePassModal");
}


/* =========================================================
   SAVE GATE PASS
   ========================================================= */

async function saveGatePass(event) {
  event.preventDefault();

  const vehicleId =
    $("gateVehicle")?.value;

  const vehicle =
    vehicles.find(v =>
      String(v.id) ===
      String(vehicleId)
    );

  if (!vehicle) {
    showToast(
      "Please select a vehicle.",
      "error"
    );
    return;
  }

  const invoiceNo =
    $("gateInvoice")?.value ||
    null;

  const invoice =
    invoiceNo
      ? invoices.find(i =>
          String(i.invoice_no) ===
          String(invoiceNo)
        )
      : null;

  const paid =
    invoice
      ? number(invoice.paid_amount)
      : number($("gatePaid")?.value);

  const balance =
    invoice
      ? number(invoice.balance)
      : number($("gateBalance")?.value);

  const payload = {
    gate_pass_no:
      $("gatePassNo")?.value.trim(),
    pass_date:
      $("gatePassDate")?.value
        ? new Date(
            $("gatePassDate").value
          ).toISOString()
        : dateTimeNow(),
    vehicle_id:
      String(vehicle.id),
    vehicle_registration:
      vehicle.registration || "",
    customer:
      $("gateCustomer")?.value.trim() ||
      vehicle.customer ||
      "",
    released_to:
      $("gateReleasedTo")?.value.trim() ||
      vehicle.released_to ||
      "",
    released_contact:
      $("gateReleasedContact")?.value.trim() ||
      vehicle.released_contact ||
      "",
    invoice_no:
      invoiceNo,
    amount_paid:
      paid,
    balance:
      balance,
    authorized_by:
      $("gateAuthorizedBy")?.value.trim() ||
      currentUser(),
    status:
      $("gateStatus")?.value ||
      "Released",
    notes:
      $("gateNotes")?.value.trim() ||
      ""
  };

  if (!payload.gate_pass_no) {
    showToast(
      "Gate pass number is required.",
      "error"
    );
    return;
  }

  try {
    let result;

    if (editingGatePassId) {
      result =
        await supabase
          .from("gate_passes")
          .update(payload)
          .eq("id", editingGatePassId);
    } else {
      result =
        await supabase
          .from("gate_passes")
          .insert(payload);
    }

    if (result.error) {
      throw result.error;
    }

    closeModal("gatePassModal");

    showToast(
      editingGatePassId
        ? "Gate pass updated."
        : "Gate pass created."
    );

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Could not save gate pass. Make sure the gate_passes table exists.",
      "error"
    );
  }
}


/* =========================================================
   RENDER GATE PASSES
   ========================================================= */

function renderGatePasses() {
  const body =
    $("gatePassesTableBody");

  if (!body) return;

  const search =
    ($("gateSearch")?.value || "")
      .trim()
      .toLowerCase();

  const status =
    ($("gateStatusFilter")?.value || "")
      .trim()
      .toLowerCase();

  const filtered =
    gatePasses.filter(pass => {
      const text = [
        pass.gate_pass_no,
        pass.vehicle_registration,
        pass.customer,
        pass.released_to,
        pass.released_contact,
        pass.invoice_no
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!search || text.includes(search)) &&
        (!status ||
          String(pass.status || "")
            .toLowerCase() === status)
      );
    });

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td colspan="9"
          style="text-align:center;padding:30px;color:#64748b">
          ${
            gatePasses.length
              ? "No gate passes match your search."
              : "No gate passes have been created yet."
          }
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML =
    filtered.map(pass => `
      <tr>

        <td>
          <strong>
            ${escapeHtml(
              pass.gate_pass_no || ""
            )}
          </strong>
        </td>

        <td>
          ${escapeHtml(
            formatDateTime(pass.pass_date)
          )}
        </td>

        <td>
          ${escapeHtml(
            pass.vehicle_registration || ""
          )}
        </td>

        <td>
          ${escapeHtml(
            pass.customer || ""
          )}
        </td>

        <td>
          ${escapeHtml(
            pass.released_to || ""
          )}
        </td>

        <td>
          ${escapeHtml(
            pass.invoice_no || "—"
          )}
        </td>

        <td>
          ${money(pass.balance)}
        </td>

        <td>
          ${statusBadge(
            pass.status || "Released"
          )}
        </td>

        <td>

          <div class="table-actions">

            <button
              class="action-btn"
              title="Edit"
              onclick="openGatePassModal('${escapeHtml(pass.id)}')">
              ✏️
            </button>

            <button
              class="action-btn"
              title="Print"
              onclick="printGatePass('${escapeHtml(pass.id)}')">
              🖨
            </button>

            <button
              class="action-btn"
              title="Delete"
              onclick="deleteGatePass('${escapeHtml(pass.id)}')">
              🗑
            </button>

          </div>

        </td>

      </tr>
    `).join("");
}


/* =========================================================
   DELETE GATE PASS
   ========================================================= */

async function deleteGatePass(id) {
  const pass =
    gatePasses.find(g =>
      String(g.id) === String(id)
    );

  if (!pass) return;

  if (!confirm(
    `Delete gate pass ${pass.gate_pass_no || ""}?`
  )) {
    return;
  }

  try {
    const result =
      await supabase
        .from("gate_passes")
        .delete()
        .eq("id", id);

    if (result.error) {
      throw result.error;
    }

    showToast("Gate pass deleted.");

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Could not delete gate pass.",
      "error"
    );
  }
}


/* =========================================================
   GATE PASS PRINT
   ========================================================= */

function printGatePass(id) {
  const pass =
    gatePasses.find(g =>
      String(g.id) === String(id)
    );

  if (!pass) {
    showToast(
      "Gate pass not found.",
      "error"
    );
    return;
  }

  const html = `
    <div class="gate-pass">

      <div class="gate-header">

        <div>
          <h1>GARAGE OPERATIONS PRO</h1>

          <p>
            Vehicle • Finance • Workshop Operations
          </p>
        </div>

        <div>
          <h2>GATE PASS</h2>

          <p>
            <strong>
              ${escapeHtml(pass.gate_pass_no || "")}
            </strong>
          </p>

          <p>
            ${escapeHtml(
              formatDateTime(pass.pass_date)
            )}
          </p>
        </div>

      </div>

      <hr>

      <div class="release-box">

        <div>
          <strong>VEHICLE</strong>

          <p>
            ${escapeHtml(
              pass.vehicle_registration || ""
            )}
          </p>
        </div>

        <div>
          <strong>CUSTOMER</strong>

          <p>
            ${escapeHtml(
              pass.customer || ""
            )}
          </p>
        </div>

        <div>
          <strong>RELEASED TO</strong>

          <p>
            ${escapeHtml(
              pass.released_to || ""
            )}
          </p>
        </div>

        <div>
          <strong>CONTACT</strong>

          <p>
            ${escapeHtml(
              pass.released_contact || ""
            )}
          </p>
        </div>

      </div>

      <table>

        <tr>
          <th>Invoice</th>
          <td>
            ${escapeHtml(
              pass.invoice_no || "No Invoice"
            )}
          </td>
        </tr>

        <tr>
          <th>Amount Paid</th>
          <td>
            ${money(pass.amount_paid)}
          </td>
        </tr>

        <tr>
          <th>Balance</th>
          <td>
            ${money(pass.balance)}
          </td>
        </tr>

        <tr>
          <th>Status</th>
          <td>
            ${escapeHtml(
              pass.status || "Released"
            )}
          </td>
        </tr>

        <tr>
          <th>Authorised By</th>
          <td>
            ${escapeHtml(
              pass.authorized_by || ""
            )}
          </td>
        </tr>

      </table>

      ${
        pass.notes
          ? `
            <div class="notes">
              <strong>Notes</strong>
              <p>${escapeHtml(pass.notes)}</p>
            </div>
          `
          : ""
      }

      <div class="release-warning">
        Vehicle released from garage.
      </div>

      <div class="signature-area">

        <div>
          Customer / Driver Signature
          <br><br>
          ______________________________
        </div>

        <div>
          Authorised By
          <br><br>
          ______________________________
        </div>

      </div>

    </div>
  `;

  printHtml(
    html,
    `Gate Pass ${pass.gate_pass_no}`
  );
}

function printGatePasses() {
  if (!gatePasses.length) {
    showToast(
      "There are no gate passes to print.",
      "warning"
    );
    return;
  }

  const rows =
    gatePasses.map(pass => `
      <tr>
        <td>${escapeHtml(pass.gate_pass_no || "")}</td>
        <td>${escapeHtml(formatDateTime(pass.pass_date))}</td>
        <td>${escapeHtml(pass.vehicle_registration || "")}</td>
        <td>${escapeHtml(pass.customer || "")}</td>
        <td>${escapeHtml(pass.released_to || "")}</td>
        <td>${escapeHtml(pass.invoice_no || "")}</td>
        <td>${money(pass.balance)}</td>
        <td>${escapeHtml(pass.status || "")}</td>
      </tr>
    `).join("");

  printHtml(
    `
      <h1>GARAGE OPERATIONS PRO</h1>
      <h2>GATE PASS REGISTER</h2>

      <table>
        <thead>
          <tr>
            <th>Gate Pass</th>
            <th>Date</th>
            <th>Vehicle</th>
            <th>Customer</th>
            <th>Released To</th>
            <th>Invoice</th>
            <th>Balance</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>
      </table>
    `,
    "Gate Pass Register"
  );
}


/* =========================================================
   PRINT ENGINE
   ========================================================= */

function printHtml(bodyHtml, title = "Garage Operations Pro") {
  const printWindow =
    window.open(
      "",
      "_blank",
      "width=1000,height=800"
    );

  if (!printWindow) {
    showToast(
      "Please allow pop-ups to print.",
      "error"
    );
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>

    <html>

    <head>

      <meta charset="UTF-8">

      <title>
        ${escapeHtml(title)}
      </title>

      <style>

        *{
          box-sizing:border-box;
        }

        body{
          font-family:Arial,Helvetica,sans-serif;
          color:#111827;
          padding:35px;
          font-size:13px;
        }

        h1{
          font-size:24px;
          margin:0 0 5px;
        }

        h2{
          font-size:20px;
          margin:10px 0 20px;
        }

        h3{
          margin-top:20px;
        }

        p{
          margin:5px 0;
          line-height:1.5;
        }

        hr{
          border:0;
          border-top:1px solid #ddd;
          margin:20px 0;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:20px;
        }

        th{
          background:#f3f4f6;
          text-align:left;
          font-weight:700;
        }

        th,td{
          border:1px solid #ddd;
          padding:10px;
          vertical-align:top;
        }

        .invoice-header,
        .gate-header{
          display:flex;
          justify-content:space-between;
          gap:30px;
        }

        .invoice-title,
        .gate-header > div:last-child{
          text-align:right;
        }

        .two-column{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:30px;
          margin:20px 0;
        }

        .release-box{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:20px;
          margin:20px 0;
          padding:18px;
          border:1px solid #ddd;
          border-radius:8px;
        }

        .description-box{
          padding:15px;
          border:1px solid #ddd;
          margin:20px 0;
        }

        .invoice-total{
          width:350px;
          max-width:100%;
          margin-left:auto;
          margin-top:20px;
        }

        .invoice-total > div{
          display:flex;
          justify-content:space-between;
          padding:9px 0;
          border-bottom:1px solid #eee;
        }

        .invoice-total .balance{
          font-size:18px;
          font-weight:800;
          border-bottom:0;
        }

        .notes{
          margin-top:25px;
          padding:15px;
          background:#f8fafc;
          border:1px solid #ddd;
        }

        .signature-area{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:70px;
          margin-top:70px;
          padding-top:20px;
        }

        .release-warning{
          margin-top:30px;
          padding:15px;
          text-align:center;
          font-weight:700;
          border:2px solid #111827;
        }

        @media print{

          body{
            padding:15mm;
          }

          @page{
            size:A4;
            margin:10mm;
          }

        }

      </style>

    </head>

    <body>

      ${bodyHtml}

      <script>

        window.onload=function(){
          window.print();
        };

      <\/script>

    </body>

    </html>
  `);

  printWindow.document.close();
}


/* =========================================================
   GENERAL PRINTS
   ========================================================= */

function printVehicles() {
  const rows =
    vehicles.map(v => {
      const outstanding =
        Math.max(
          number(v.billed) -
          number(v.paid),
          0
        );

      return `
        <tr>
          <td>${escapeHtml(v.registration || "")}</td>
          <td>${escapeHtml(v.customer || "")}</td>
          <td>${escapeHtml(formatDate(v.date_in))}</td>
          <td>${escapeHtml(v.job_type || "")}</td>
          <td>${escapeHtml(v.status || "")}</td>
          <td>${money(v.billed)}</td>
          <td>${money(v.paid)}</td>
          <td>${money(outstanding)}</td>
        </tr>
      `;
    }).join("");

  printHtml(
    `
      <h1>GARAGE OPERATIONS PRO</h1>
      <h2>VEHICLE REGISTER</h2>

      <table>

        <thead>
          <tr>
            <th>Registration</th>
            <th>Customer</th>
            <th>Date In</th>
            <th>Job</th>
            <th>Status</th>
            <th>Billed</th>
            <th>Paid</th>
            <th>Outstanding</th>
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>

      </table>
    `,
    "Vehicle Register"
  );
}

function printExpenses() {
  const rows =
    expenses.map(e => {
      const vehicle =
        vehicles.find(v =>
          String(v.id) ===
          String(e.vehicle_id)
        );

      return `
        <tr>
          <td>${escapeHtml(formatDate(e.expense_date))}</td>
          <td>${escapeHtml(vehicle?.registration || "General")}</td>
          <td>${escapeHtml(e.description || "")}</td>
          <td>${escapeHtml(e.category || "")}</td>
          <td>${money(e.amount)}</td>
        </tr>
      `;
    }).join("");

  printHtml(
    `
      <h1>GARAGE OPERATIONS PRO</h1>
      <h2>EXPENSE REGISTER</h2>

      <table>

        <thead>
          <tr>
            <th>Date</th>
            <th>Vehicle</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>

      </table>
    `,
    "Expense Register"
  );
}

function printPettyCash() {
  const rows =
    pettyCash.map(p => `
      <tr>
        <td>${escapeHtml(formatDate(p.cash_date))}</td>
        <td>${escapeHtml(p.description || "")}</td>
        <td>${escapeHtml(p.paid_to || "")}</td>
        <td>${escapeHtml(p.category || "")}</td>
        <td>${money(p.amount)}</td>
        <td>${escapeHtml(p.notes || "")}</td>
      </tr>
    `).join("");

  printHtml(
    `
      <h1>GARAGE OPERATIONS PRO</h1>
      <h2>PETTY CASH REGISTER</h2>

      <table>

        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Paid To</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Notes</th>
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>

      </table>
    `,
    "Petty Cash Register"
  );
}

function printRequisitions() {
  const rows =
    requisitions.map(r => {
      const vehicle =
        vehicles.find(v =>
          String(v.id) ===
          String(r.vehicle_id)
        );

      return `
        <tr>
          <td>${escapeHtml(r.req_no || "")}</td>
          <td>${escapeHtml(formatDate(r.req_date))}</td>
          <td>${escapeHtml(r.requested_by || "")}</td>
          <td>${escapeHtml(vehicle?.registration || "General")}</td>
          <td>${escapeHtml(r.item_description || "")}</td>
          <td>${number(r.quantity)}</td>
          <td>${money(r.unit_cost)}</td>
          <td>${money(r.total_amount)}</td>
          <td>${escapeHtml(r.status || "")}</td>
        </tr>
      `;
    }).join("");

  printHtml(
    `
      <h1>GARAGE OPERATIONS PRO</h1>
      <h2>REQUISITION REGISTER</h2>

      <table>

        <thead>
          <tr>
            <th>Req No.</th>
            <th>Date</th>
            <th>Requested By</th>
            <th>Vehicle</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Cost</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>

      </table>
    `,
    "Requisition Register"
  );
}


/* =========================================================
   SECTION NAVIGATION
   ========================================================= */

function showSection(sectionId, button = null) {
  ensureInvoiceGatePassUI();

  document
    .querySelectorAll(".app-section")
    .forEach(section => {
      section.style.display =
        section.id === sectionId
          ? "block"
          : "none";
    });

  document
    .querySelectorAll(".nav-btn")
    .forEach(btn => {
      btn.classList.remove("active");
    });

  document
    .querySelectorAll(".mobile-nav-btn")
    .forEach(btn => {
      btn.classList.remove("active");
    });

  if (button) {
    button.classList.add("active");
  } else {
    document
      .querySelectorAll(
        `[data-section="${sectionId}"]`
      )
      .forEach(btn => {
        btn.classList.add("active");
      });
  }

  const titles = {
    dashboard:
      "Garage Operations Pro",
    vehicles:
      "Vehicles",
    expenses:
      "Expenses",
    pettyCash:
      "Petty Cash",
    requisitions:
      "Requisitions",
    invoices:
      "Invoices",
    gatePasses:
      "Gate Passes"
  };

  const subtitle =
    document.querySelector(
      ".topbar-title span"
    );

  if (subtitle) {
    subtitle.textContent =
      titles[sectionId] ||
      "Workshop management workspace";
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   SEARCH EVENTS
   ========================================================= */

function bindSearchEvents() {
  $("vehicleSearch")?.addEventListener(
    "input",
    renderVehicles
  );

  $("vehicleStatusFilter")?.addEventListener(
    "change",
    renderVehicles
  );

  $("expenseSearch")?.addEventListener(
    "input",
    renderExpenses
  );

  $("expenseCategoryFilter")?.addEventListener(
    "change",
    renderExpenses
  );

  $("pettySearch")?.addEventListener(
    "input",
    renderPettyCash
  );

  $("pettyCategoryFilter")?.addEventListener(
    "change",
    renderPettyCash
  );

  $("reqSearch")?.addEventListener(
    "input",
    renderRequisitions
  );

  $("reqStatusFilter")?.addEventListener(
    "change",
    renderRequisitions
  );

  document.addEventListener(
    "input",
    event => {
      if (
        event.target?.id ===
          "invoiceLabour" ||
        event.target?.id ===
          "invoiceParts" ||
        event.target?.id ===
          "invoiceOther" ||
        event.target?.id ===
          "invoicePaid"
      ) {
        calculateInvoiceTotals();
      }
    }
  );

  document.addEventListener(
    "change",
    event => {
      if (
        event.target?.id ===
        "invoiceVehicle"
      ) {
        const vehicleId =
          event.target.value;

        const vehicle =
          vehicles.find(v =>
            String(v.id) ===
            String(vehicleId)
          );

        if (vehicle) {
          if ($("invoiceCustomer")) {
            $("invoiceCustomer").value =
              vehicle.customer || "";
          }

          if ($("invoiceJobDescription")) {
            $("invoiceJobDescription").value =
              vehicle.description ||
              vehicle.job_type ||
              "";
          }

          autoCalculateInvoice();
        }
      }

      if (
        event.target?.id ===
        "gateVehicle"
      ) {
        fillGatePassFromVehicle();
      }

      if (
        event.target?.id ===
        "gateInvoice"
      ) {
        fillGatePassFromInvoice();
      }
    }
  );
}


/* =========================================================
   FORM EVENTS
   ========================================================= */

function bindFormEvents() {
  $("vehicleForm")?.addEventListener(
    "submit",
    saveVehicle
  );

  $("expenseForm")?.addEventListener(
    "submit",
    saveExpense
  );

  $("pettyForm")?.addEventListener(
    "submit",
    savePetty
  );

  $("reqForm")?.addEventListener(
    "submit",
    saveReq
  );

  $("reqQuantity")?.addEventListener(
    "input",
    calculateReqTotal
  );

  $("reqUnitCost")?.addEventListener(
    "input",
    calculateReqTotal
  );

  $("invoiceForm")?.addEventListener(
    "submit",
    saveInvoice
  );

  $("gatePassForm")?.addEventListener(
    "submit",
    saveGatePass
  );
}


/* =========================================================
   MODAL BACKDROP CLOSE
   ========================================================= */

function bindModalClose() {
  document.addEventListener(
    "click",
    event => {
      const target =
        event.target;

      if (
        target.classList &&
        target.classList.contains("modal")
      ) {
        target.classList.remove("show");
      }
    }
  );
}


/* =========================================================
   INITIALISE
   ========================================================= */

async function initializeApp() {
  try {
    displayCurrentUser();

    ensureInvoiceGatePassUI();

    bindSearchEvents();
    bindFormEvents();
    bindModalClose();

    await loadAllData();

    /*
     * Form elements for the dynamically-created
     * invoice/gate-pass sections are created before
     * loadAllData, but their submit handlers are
     * rebound here to guarantee availability.
     */
    bindFormEvents();

    /*
     * Re-populate invoice dropdown after loading data.
     */
    populateInvoiceSelect();

    /*
     * If login has already happened before this
     * module loads, make sure the application is visible.
     */
    const loggedIn =
      sessionStorage.getItem(
        "garageLoggedIn"
      );

    if (loggedIn === "true") {
      $("loginPage")?.style.setProperty(
        "display",
        "none"
      );

      $("app")?.style.setProperty(
        "display",
        "block"
      );
    }

  } catch (error) {
    console.error(
      "Garage initialization error:",
      error
    );

    showToast(
      "Garage application could not finish loading.",
      "error"
    );
  }
}


/* =========================================================
   CLOSE MODALS WITH ESC
   ========================================================= */

document.addEventListener(
  "keydown",
  event => {
    if (event.key !== "Escape") {
      return;
    }

    document
      .querySelectorAll(".modal.show")
      .forEach(modal => {
        modal.classList.remove("show");
      });
  }
);


/* =========================================================
   EXPOSE FUNCTIONS TO HTML
   ========================================================= */

window.showSection =
  showSection;

window.openModal =
  openModal;

window.closeModal =
  closeModal;

window.openVehicleModal =
  openVehicleModal;

window.deleteVehicle =
  deleteVehicle;

window.openExpenseModal =
  openExpenseModal;

window.deleteExpense =
  deleteExpense;

window.openPettyModal =
  openPettyModal;

window.deletePetty =
  deletePetty;

window.openReqModal =
  openReqModal;

window.deleteReq =
  deleteReq;

window.previewReq =
  previewReq;

window.previewSelectedReq =
  previewSelectedReq;

window.printSelectedReq =
  printSelectedReq;

window.openVehicleExpensePreview =
  openVehicleExpensePreview;

window.printVehicleExpensePreview =
  printVehicleExpensePreview;

window.printVehicles =
  printVehicles;

window.printExpenses =
  printExpenses;

window.printPettyCash =
  printPettyCash;

window.printRequisitions =
  printRequisitions;


/* Invoice */

window.openInvoiceModal =
  openInvoiceModal;

window.saveInvoice =
  saveInvoice;

window.deleteInvoice =
  deleteInvoice;

window.printInvoice =
  printInvoice;

window.printInvoices =
  printInvoices;

window.autoCalculateInvoice =
  autoCalculateInvoice;


/* Gate Pass */

window.openGatePassModal =
  openGatePassModal;

window.saveGatePass =
  saveGatePass;

window.deleteGatePass =
  deleteGatePass;

window.printGatePass =
  printGatePass;

window.printGatePasses =
  printGatePasses;


/* =========================================================
   START
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeApp
  );
} else {
  initializeApp();
}
