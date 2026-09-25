import { createClient }
from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
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

const TABLES = {
  vehicles: "vehicles",
  expenses: "expenses",
  petty: "petty_cash",
  requisitions: "requisitions"
};

/* =========================================================
   APP STATE
========================================================= */

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];

let selectedReqId = null;
let selectedVehicleId = null;
let selectedVehicleExpenseId = null;

let pettyCashSupportsReqNo = false;

/* =========================================================
   HELPERS
========================================================= */

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return "KSh " + number(value).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeReqNo(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function vehicleName(id) {
  const vehicle = vehicles.find(v => String(v.id) === String(id));

  if (!vehicle) {
    return "—";
  }

  return `${vehicle.registration || ""} — ${vehicle.customer || ""}`;
}

function statusClass(status) {
  return String(status || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function showToast(message, type = "success") {
  let toast = document.getElementById("appToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appToast";

    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.bottom = "24px";
    toast.style.transform = "translateX(-50%)";
    toast.style.zIndex = "99999";
    toast.style.padding = "13px 18px";
    toast.style.borderRadius = "12px";
    toast.style.fontSize = "14px";
    toast.style.fontWeight = "700";
    toast.style.maxWidth = "90%";
    toast.style.textAlign = "center";
    toast.style.boxShadow = "0 10px 30px rgba(0,0,0,.25)";

    document.body.appendChild(toast);
  }

  toast.textContent = message;

  toast.style.background =
    type === "error" ? "#7f1d1d" :
    type === "warning" ? "#78350f" :
    "#14532d";

  toast.style.color = "#fff";

  clearTimeout(window.__garageToastTimer);

  window.__garageToastTimer = setTimeout(() => {
    toast.remove();
  }, 3500);
}

function supabaseError(error, fallback = "Something went wrong.") {
  console.error(error);

  const message =
    error?.message ||
    error?.details ||
    error?.hint ||
    fallback;

  showToast(message, "error");
}

/* =========================================================
   PREMIUM STYLES
========================================================= */

function injectPremiumStyles() {
  if (document.getElementById("garagePremiumStyles")) return;

  const style = document.createElement("style");
  style.id = "garagePremiumStyles";

  style.textContent = `
    .req-finance {
      display:flex;
      flex-direction:column;
      gap:6px;
      min-width:170px;
    }

    .req-finance-row {
      display:flex;
      justify-content:space-between;
      gap:12px;
      font-size:12px;
    }

    .req-finance-label {
      color:#94a3b8;
    }

    .req-finance-value {
      font-weight:800;
      color:#f8fafc;
    }

    .req-finance-balance {
      border-top:1px solid rgba(148,163,184,.18);
      padding-top:6px;
      margin-top:2px;
    }

    .req-summary {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:10px;
      margin:15px 0;
    }

    .req-summary-card {
      padding:14px;
      border:1px solid rgba(148,163,184,.18);
      border-radius:14px;
      background:rgba(15,23,42,.55);
    }

    .req-summary-card span {
      display:block;
      color:#94a3b8;
      font-size:11px;
      margin-bottom:5px;
    }

    .req-summary-card strong {
      display:block;
      color:#f8fafc;
      font-size:18px;
    }

    .req-payment-note {
      font-size:11px;
      color:#94a3b8;
      margin-top:3px;
    }

    .req-no-badge {
      display:inline-flex;
      align-items:center;
      padding:5px 9px;
      border-radius:8px;
      background:rgba(59,130,246,.12);
      border:1px solid rgba(59,130,246,.25);
      color:#bfdbfe;
      font-weight:800;
      font-size:12px;
    }

    @media(max-width:600px) {
      .req-summary {
        grid-template-columns:1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

/* =========================================================
   MODALS
========================================================= */

window.openModal = function(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.add("active");
  modal.style.display = "flex";
};

window.closeModal = function(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.remove("active");
  modal.style.display = "none";
};

/* =========================================================
   NAVIGATION
========================================================= */

window.showSection = function(section) {
  document.querySelectorAll(".section").forEach(el => {
    el.style.display = "none";
  });

  const target =
    document.getElementById(section) ||
    document.getElementById(section + "Section");

  if (target) {
    target.style.display = "";
  }

  document.querySelectorAll("[data-section]").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.section === section
    );
  });

  if (section === "dashboard") {
    renderDashboard();
  }

  if (section === "vehicles") {
    renderVehicles();
  }

  if (section === "expenses") {
    renderExpenses();
  }

  if (section === "pettyCash" || section === "petty") {
    renderPettyCash();
  }

  if (section === "requisitions") {
    renderRequisitions();
  }
};

window.goToDashboardSection = function(section) {
  showSection(section);
};

/* =========================================================
   VEHICLE SELECTS
========================================================= */

function populateVehicleSelects() {
  const selects = document.querySelectorAll(
    'select[name="vehicle_id"], #vehicle_id, #expenseVehicleId, #reqVehicleId'
  );

  selects.forEach(select => {
    const current = select.value;

    select.innerHTML =
      `<option value="">Select vehicle</option>` +
      vehicles.map(v => `
        <option value="${escapeHtml(v.id)}">
          ${escapeHtml(v.registration)} — ${escapeHtml(v.customer || "")}
        </option>
      `).join("");

    if (current) {
      select.value = current;
    }
  });
}

/* =========================================================
   VEHICLES
========================================================= */

async function loadVehicles() {
  const { data, error } = await supabase
    .from(TABLES.vehicles)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    supabaseError(error, "Unable to load vehicles.");
    return;
  }

  vehicles = data || [];

  populateVehicleSelects();
  renderVehicles();
  renderDashboard();
}

function renderVehicles() {
  const search =
    document.getElementById("vehicleSearch")?.value
      ?.toLowerCase()
      .trim() || "";

  const filtered = vehicles.filter(v => {
    const text = [
      v.registration,
      v.customer,
      v.status,
      v.description
    ].join(" ").toLowerCase();

    return !search || text.includes(search);
  });

  const container =
    document.getElementById("vehiclesList") ||
    document.getElementById("vehicleList") ||
    document.getElementById("vehiclesTableBody");

  if (!container) return;

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        No vehicles found.
      </div>
    `;
    return;
  }

  const rows = filtered.map(v => `
    <tr>
      <td><strong>${escapeHtml(v.registration)}</strong></td>
      <td>${escapeHtml(v.customer || "—")}</td>
      <td>${escapeHtml(v.date_in || "—")}</td>
      <td>${escapeHtml(v.date_out || "—")}</td>
      <td>${escapeHtml(v.job_type || "—")}</td>
      <td>${escapeHtml(v.status || "—")}</td>
      <td>${money(v.billed)}</td>
      <td>${money(v.paid)}</td>
      <td>
        <button onclick="editVehicle('${v.id}')">✏️</button>
        <button onclick="deleteVehicle('${v.id}')">🗑</button>
        <button onclick="openVehicleWorkspace('${v.id}')">👁</button>
      </td>
    </tr>
  `).join("");

  if (container.tagName === "TBODY") {
    container.innerHTML = rows;
  } else {
    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Registration</th>
              <th>Customer</th>
              <th>Date In</th>
              <th>Date Out</th>
              <th>Job</th>
              <th>Status</th>
              <th>Billed</th>
              <th>Paid</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }
}

window.saveVehicle = async function() {
  const id =
    document.getElementById("vehicleId")?.value || null;

  const payload = {
    registration:
      document.getElementById("vehicleRegistration")?.value
        ?.trim()
        .toUpperCase(),

    customer:
      document.getElementById("vehicleCustomer")?.value?.trim(),

    date_in:
      document.getElementById("vehicleDateIn")?.value ||
      null,

    date_out:
      document.getElementById("vehicleDateOut")?.value ||
      null,

    job_type:
      document.getElementById("vehicleJobType")?.value?.trim(),

    status:
      document.getElementById("vehicleStatus")?.value ||
      "Under Repair",

    released_to:
      document.getElementById("vehicleReleasedTo")?.value?.trim(),

    released_contact:
      document.getElementById("vehicleReleasedContact")?.value?.trim(),

    description:
      document.getElementById("vehicleDescription")?.value?.trim(),

    billed:
      number(document.getElementById("vehicleBilled")?.value),

    paid:
      number(document.getElementById("vehiclePaid")?.value)
  };

  if (!payload.registration) {
    showToast("Vehicle registration is required.", "warning");
    return;
  }

  let result;

  if (id) {
    result = await supabase
      .from(TABLES.vehicles)
      .update(payload)
      .eq("id", id);
  } else {
    result = await supabase
      .from(TABLES.vehicles)
      .insert(payload);
  }

  if (result.error) {
    supabaseError(result.error, "Unable to save vehicle.");
    return;
  }

  showToast("Vehicle saved successfully.");
  closeModal("vehicleModal");

  await loadVehicles();
};

window.editVehicle = function(id) {
  const v = vehicles.find(x => String(x.id) === String(id));

  if (!v) return;

  const fields = {
    vehicleId: v.id,
    vehicleRegistration: v.registration,
    vehicleCustomer: v.customer,
    vehicleDateIn: v.date_in,
    vehicleDateOut: v.date_out,
    vehicleJobType: v.job_type,
    vehicleStatus: v.status,
    vehicleReleasedTo: v.released_to,
    vehicleReleasedContact: v.released_contact,
    vehicleDescription: v.description,
    vehicleBilled: v.billed,
    vehiclePaid: v.paid
  };

  Object.entries(fields).forEach(([id2, value]) => {
    const el = document.getElementById(id2);
    if (el) el.value = value ?? "";
  });

  openModal("vehicleModal");
};

window.deleteVehicle = async function(id) {
  if (!confirm("Delete this vehicle?")) return;

  const { error } = await supabase
    .from(TABLES.vehicles)
    .delete()
    .eq("id", id);

  if (error) {
    supabaseError(error, "Unable to delete vehicle.");
    return;
  }

  showToast("Vehicle deleted.");
  await loadVehicles();
};

window.openVehicleWorkspace = function(id) {
  selectedVehicleId = id;

  const v = vehicles.find(x => String(x.id) === String(id));

  if (!v) return;

  setText("workspaceVehicleName", vehicleName(id));

  renderVehicleExpenses(id);

  const modal =
    document.getElementById("vehicleWorkspaceModal");

  if (modal) {
    openModal("vehicleWorkspaceModal");
  } else {
    showSection("expenses");
  }
};

/* =========================================================
   EXPENSES
========================================================= */

async function loadExpenses() {
  const { data, error } = await supabase
    .from(TABLES.expenses)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    supabaseError(error, "Unable to load expenses.");
    return;
  }

  expenses = data || [];

  renderExpenses();

  if (selectedVehicleId) {
    renderVehicleExpenses(selectedVehicleId);
  }

  renderDashboard();
}

function renderExpenses() {
  const search =
    document.getElementById("expenseSearch")?.value
      ?.toLowerCase()
      .trim() || "";

  const filtered = expenses.filter(e => {
    const text = [
      e.description,
      e.category,
      e.expense_type,
      vehicleName(e.vehicle_id)
    ].join(" ").toLowerCase();

    return !search || text.includes(search);
  });

  const container =
    document.getElementById("expensesList") ||
    document.getElementById("expenseList") ||
    document.getElementById("expensesTableBody");

  if (!container) return;

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        No expenses found.
      </div>
    `;
    return;
  }

  const rows = filtered.map(e => `
    <tr>
      <td>${escapeHtml(e.expense_date || e.created_at?.slice(0,10) || "—")}</td>
      <td>${escapeHtml(vehicleName(e.vehicle_id))}</td>
      <td>${escapeHtml(e.description || "—")}</td>
      <td>${escapeHtml(e.category || e.expense_type || "—")}</td>
      <td>${money(e.amount)}</td>
      <td>
        <button onclick="editExpense('${e.id}')">✏️</button>
        <button onclick="deleteExpense('${e.id}')">🗑</button>
      </td>
    </tr>
  `).join("");

  if (container.tagName === "TBODY") {
    container.innerHTML = rows;
  } else {
    container.innerHTML = `
      <div class="table-wrap">
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
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }
}

function renderVehicleExpenses(vehicleId) {
  const list = expenses.filter(
    e => String(e.vehicle_id) === String(vehicleId)
  );

  const container =
    document.getElementById("vehicleExpensesList");

  if (!container) return;

  if (!list.length) {
    container.innerHTML =
      `<div class="empty-state">No expenses for this vehicle.</div>`;
    return;
  }

  const total = list.reduce(
    (sum, e) => sum + number(e.amount),
    0
  );

  container.innerHTML = `
    <div class="req-summary-card">
      <span>Total vehicle expenses</span>
      <strong>${money(total)}</strong>
    </div>

    <div class="table-wrap">
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
          ${list.map(e => `
            <tr>
              <td>${escapeHtml(e.expense_date || e.created_at?.slice(0,10) || "—")}</td>
              <td>${escapeHtml(e.description || "—")}</td>
              <td>${escapeHtml(e.category || e.expense_type || "—")}</td>
              <td>${money(e.amount)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

window.saveExpense = async function() {
  const id =
    document.getElementById("expenseId")?.value || null;

  const payload = {
    vehicle_id:
      document.getElementById("expenseVehicleId")?.value ||
      document.getElementById("expenseVehicle")?.value ||
      null,

    description:
      document.getElementById("expenseDescription")?.value?.trim(),

    amount:
      number(document.getElementById("expenseAmount")?.value),

    category:
      document.getElementById("expenseCategory")?.value ||
      document.getElementById("expenseType")?.value ||
      "Other",

    expense_type:
      document.getElementById("expenseType")?.value ||
      document.getElementById("expenseCategory")?.value ||
      "Other",

    expense_date:
      document.getElementById("expenseDate")?.value ||
      today(),

    notes:
      document.getElementById("expenseNotes")?.value?.trim()
  };

  if (!payload.description) {
    showToast("Expense description is required.", "warning");
    return;
  }

  let result;

  if (id) {
    result = await supabase
      .from(TABLES.expenses)
      .update(payload)
      .eq("id", id);
  } else {
    result = await supabase
      .from(TABLES.expenses)
      .insert(payload);
  }

  if (result.error) {
    supabaseError(result.error, "Unable to save expense.");
    return;
  }

  showToast("Expense saved.");
  closeModal("expenseModal");

  await loadExpenses();
};

window.editExpense = function(id) {
  const e = expenses.find(x => String(x.id) === String(id));

  if (!e) return;

  const values = {
    expenseId: e.id,
    expenseVehicleId: e.vehicle_id,
    expenseVehicle: e.vehicle_id,
    expenseDescription: e.description,
    expenseAmount: e.amount,
    expenseCategory: e.category || e.expense_type,
    expenseType: e.expense_type || e.category,
    expenseDate: e.expense_date,
    expenseNotes: e.notes
  };

  Object.entries(values).forEach(([id2, value]) => {
    const el = document.getElementById(id2);
    if (el) el.value = value ?? "";
  });

  openModal("expenseModal");
};

window.deleteExpense = async function(id) {
  if (!confirm("Delete this expense?")) return;

  const { error } = await supabase
    .from(TABLES.expenses)
    .delete()
    .eq("id", id);

  if (error) {
    supabaseError(error, "Unable to delete expense.");
    return;
  }

  showToast("Expense deleted.");
  await loadExpenses();
};

/* =========================================================
   PETTY CASH
========================================================= */

async function loadPettyCash() {
  /*
    IMPORTANT:
    req_no is used to connect a payment to a specific
    requisition.

    We first try to load req_no.
    If the database has not yet been given the column,
    we fall back to the normal petty_cash columns.
  */

  let result = await supabase
    .from(TABLES.petty)
    .select("*, req_no")
    .order("created_at", { ascending: false });

  if (result.error) {
    console.warn(
      "petty_cash.req_no is not available yet.",
      result.error
    );

    pettyCashSupportsReqNo = false;

    result = await supabase
      .from(TABLES.petty)
      .select("*")
      .order("created_at", { ascending: false });
  } else {
    pettyCashSupportsReqNo = true;
  }

  if (result.error) {
    supabaseError(
      result.error,
      "Unable to load petty cash."
    );
    return;
  }

  pettyCash = result.data || [];

  populatePettyCashReqSelect();
  renderPettyCash();
  renderDashboard();
}

function populatePettyCashReqSelect() {
  const select =
    document.getElementById("pettyReqNo");

  if (!select) return;

  const current = select.value;

  const uniqueReqs = [
    ...new Map(
      requisitions.map(r => [
        normalizeReqNo(r.req_no),
        r
      ])
    ).values()
  ];

  select.innerHTML =
    `<option value="">Not linked to requisition</option>` +
    uniqueReqs.map(r => `
      <option value="${escapeHtml(normalizeReqNo(r.req_no))}">
        ${escapeHtml(normalizeReqNo(r.req_no))}
      </option>
    `).join("");

  if (current) {
    select.value = current;
  }
}

function renderPettyCash() {
  const search =
    document.getElementById("pettySearch")?.value
      ?.toLowerCase()
      .trim() || "";

  const filtered = pettyCash.filter(p => {
    const text = [
      p.description,
      p.paid_to,
      p.category,
      p.req_no
    ].join(" ").toLowerCase();

    return !search || text.includes(search);
  });

  const container =
    document.getElementById("pettyCashList") ||
    document.getElementById("pettyList") ||
    document.getElementById("pettyCashTableBody");

  if (!container) return;

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        No petty cash records found.
      </div>
    `;
    return;
  }

  const rows = filtered.map(p => `
    <tr>
      <td>${escapeHtml(p.cash_date || p.created_at?.slice(0,10) || "—")}</td>

      <td>
        ${
          p.req_no
            ? `<span class="req-no-badge">${escapeHtml(normalizeReqNo(p.req_no))}</span>`
            : "—"
        }
      </td>

      <td>${escapeHtml(p.description || "—")}</td>
      <td>${escapeHtml(p.paid_to || "—")}</td>
      <td>${escapeHtml(p.category || "—")}</td>
      <td>${money(p.amount)}</td>

      <td>
        <button onclick="editPettyCash('${p.id}')">✏️</button>
        <button onclick="deletePettyCash('${p.id}')">🗑</button>
      </td>
    </tr>
  `).join("");

  if (container.tagName === "TBODY") {
    container.innerHTML = rows;
  } else {
    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Req No.</th>
              <th>Description</th>
              <th>Paid To</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }
}

window.savePettyCash = async function() {
  const id =
    document.getElementById("pettyCashId")?.value || null;

  const reqNo =
    normalizeReqNo(
      document.getElementById("pettyReqNo")?.value
    );

  const payload = {
    cash_date:
      document.getElementById("pettyDate")?.value ||
      today(),

    description:
      document.getElementById("pettyDescription")?.value?.trim(),

    paid_to:
      document.getElementById("pettyPaidTo")?.value?.trim(),

    category:
      document.getElementById("pettyCategory")?.value ||
      "Other",

    amount:
      number(document.getElementById("pettyAmount")?.value),

    notes:
      document.getElementById("pettyNotes")?.value?.trim()
  };

  /*
    Only send req_no when the column exists.
  */

  if (pettyCashSupportsReqNo) {
    payload.req_no = reqNo || null;
  }

  if (!payload.description) {
    showToast(
      "Petty cash description is required.",
      "warning"
    );
    return;
  }

  let result;

  if (id) {
    result = await supabase
      .from(TABLES.petty)
      .update(payload)
      .eq("id", id);
  } else {
    result = await supabase
      .from(TABLES.petty)
      .insert(payload);
  }

  if (result.error) {
    supabaseError(
      result.error,
      "Unable to save petty cash."
    );
    return;
  }

  showToast("Petty cash saved.");
  closeModal("pettyCashModal");

  await loadPettyCash();
};

window.editPettyCash = function(id) {
  const p =
    pettyCash.find(x => String(x.id) === String(id));

  if (!p) return;

  const values = {
    pettyCashId: p.id,
    pettyDate: p.cash_date,
    pettyReqNo: normalizeReqNo(p.req_no),
    pettyDescription: p.description,
    pettyPaidTo: p.paid_to,
    pettyCategory: p.category,
    pettyAmount: p.amount,
    pettyNotes: p.notes
  };

  Object.entries(values).forEach(([id2, value]) => {
    const el = document.getElementById(id2);
    if (el) el.value = value ?? "";
  });

  openModal("pettyCashModal");
};

window.deletePettyCash = async function(id) {
  if (!confirm("Delete this petty cash record?")) {
    return;
  }

  const { error } = await supabase
    .from(TABLES.petty)
    .delete()
    .eq("id", id);

  if (error) {
    supabaseError(
      error,
      "Unable to delete petty cash."
    );
    return;
  }

  showToast("Petty cash deleted.");
  await loadPettyCash();
};

/* =========================================================
   REQUISITION FINANCIAL CALCULATION
   THIS IS THE IMPORTANT FIX
========================================================= */

/*
  Every requisition number has its OWN financial position.

  Example:

  REQ-001
  Requested = 20,000
  Received  = only petty cash linked to REQ-001

  REQ-002
  Requested = 16,000
  Received  = only petty cash linked to REQ-002

  NEVER:
  total all requisitions
  divide/allocate all petty cash
  combine REQ-001 and REQ-002
*/

function getRequisitionFinance(reqNo) {
  const key = normalizeReqNo(reqNo);

  /*
    Get ONLY rows belonging to this requisition.
  */

  const matchingReqs =
    requisitions.filter(
      r => normalizeReqNo(r.req_no) === key
    );

  /*
    Requested amount is the SUM of this requisition's
    own line items.

    Example REQ-002:

    5,000
    1,000
    4,000
    6,000
    -------
    16,000
  */

  const requested =
    matchingReqs.reduce(
      (sum, r) => {
        /*
          Always calculate from quantity × unit cost
          when both are available.

          This prevents accidental combined totals.
        */

        const qty = number(r.quantity);
        const unit = number(r.unit_cost);

        const calculated =
          qty > 0
            ? qty * unit
            : number(r.total_amount);

        return sum + calculated;
      },
      0
    );

  /*
    RECEIVED:
    ONLY petty cash whose req_no exactly matches
    this requisition number.
  */

  const received =
    pettyCash
      .filter(
        p =>
          normalizeReqNo(p.req_no) === key &&
          key !== ""
      )
      .reduce(
        (sum, p) => sum + number(p.amount),
        0
      );

  /*
    Balance belongs only to this requisition.
  */

  const balance =
    Math.max(requested - received, 0);

  return {
    requested,
    received,
    balance
  };
}

/* =========================================================
   REQUISITIONS
========================================================= */

async function loadRequisitions() {
  const { data, error } = await supabase
    .from(TABLES.requisitions)
    .select("*")
    .order("req_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    supabaseError(
      error,
      "Unable to load requisitions."
    );
    return;
  }

  requisitions = data || [];

  populatePettyCashReqSelect();
  renderRequisitions();
  renderDashboard();
}

function getRequisitionGroups() {
  const groups = new Map();

  requisitions.forEach(req => {
    const key = normalizeReqNo(req.req_no);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(req);
  });

  return groups;
}

function renderRequisitionSummary(reqNo = "") {
  const container =
    document.getElementById("requisitionSummary");

  if (!container) return;

  const key = normalizeReqNo(reqNo);

  if (!key) {
    const allRequested =
      requisitions.reduce(
        (sum, r) => {
          const qty = number(r.quantity);
          const unit = number(r.unit_cost);

          return sum +
            (qty > 0
              ? qty * unit
              : number(r.total_amount));
        },
        0
      );

    const allReceived =
      pettyCash.reduce(
        (sum, p) => sum + number(p.amount),
        0
      );

    container.innerHTML = `
      <div class="req-summary">
        <div class="req-summary-card">
          <span>All Requisition Requests</span>
          <strong>${money(allRequested)}</strong>
        </div>

        <div class="req-summary-card">
          <span>All Petty Cash</span>
          <strong>${money(allReceived)}</strong>
        </div>

        <div class="req-summary-card">
          <span>Overall Position</span>
          <strong>
            ${money(Math.max(allRequested - allReceived, 0))}
          </strong>
        </div>
      </div>
    `;

    return;
  }

  const finance = getRequisitionFinance(key);

  container.innerHTML = `
    <div class="req-summary">
      <div class="req-summary-card">
        <span>Requested</span>
        <strong>${money(finance.requested)}</strong>
      </div>

      <div class="req-summary-card">
        <span>Received</span>
        <strong>${money(finance.received)}</strong>
        <div class="req-payment-note">
          Only payments linked to ${escapeHtml(key)}
        </div>
      </div>

      <div class="req-summary-card">
        <span>Balance</span>
        <strong>${money(finance.balance)}</strong>
      </div>
    </div>
  `;
}

function renderRequisitions() {
  const search =
    document.getElementById("requisitionSearch")?.value
      ?.trim()
      .toLowerCase() || "";

  const status =
    document.getElementById("requisitionStatusFilter")?.value ||
    "";

  const filtered =
    requisitions.filter(r => {
      const text = [
        r.req_no,
        r.req_date,
        r.requested_by,
        r.item_description,
        vehicleName(r.vehicle_id),
        r.status,
        r.category,
        r.expense_type
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search || text.includes(search);

      const matchesStatus =
        !status ||
        String(r.status || "").toLowerCase() ===
          status.toLowerCase();

      return matchesSearch && matchesStatus;
    });

  /*
    If search is an exact requisition number,
    show its own financial summary.
  */

  const exactReq =
    normalizeReqNo(search);

  if (
    exactReq &&
    requisitions.some(
      r => normalizeReqNo(r.req_no) === exactReq
    )
  ) {
    renderRequisitionSummary(exactReq);
  } else {
    renderRequisitionSummary("");
  }

  const container =
    document.getElementById("requisitionsList") ||
    document.getElementById("requisitionList") ||
    document.getElementById("requisitionsTableBody");

  if (!container) return;

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        No requisitions found.
      </div>
    `;
    return;
  }

  const rows =
    filtered.map(r => {
      /*
        IMPORTANT:
        This row's amount belongs ONLY to this row.
      */

      const qty = number(r.quantity);
      const unit = number(r.unit_cost);

      const lineTotal =
        qty > 0
          ? qty * unit
          : number(r.total_amount);

      /*
        For the financial block, calculate using
        the entire exact requisition number.
      */

      const finance =
        getRequisitionFinance(r.req_no);

      return `
        <tr>

          <td>
            <strong>
              ${escapeHtml(normalizeReqNo(r.req_no))}
            </strong>
          </td>

          <td>
            ${escapeHtml(r.req_date || "—")}
          </td>

          <td>
            ${escapeHtml(r.requested_by || "—")}
          </td>

          <td>
            ${escapeHtml(vehicleName(r.vehicle_id))}
          </td>

          <td>
            ${escapeHtml(r.item_description || "—")}
          </td>

          <td>
            ${qty}
          </td>

          <td>
            ${money(unit)}
          </td>

          <td>
            <strong>${money(lineTotal)}</strong>
          </td>

          <td>
            ${escapeHtml(
              r.category ||
              r.expense_type ||
              "—"
            )}
          </td>

          <td>
            <span class="status ${statusClass(r.status)}">
              ${escapeHtml(r.status || "Pending")}
            </span>
          </td>

          <td>
            <div class="req-finance">

              <div class="req-finance-row">
                <span class="req-finance-label">
                  Requested
                </span>
                <span class="req-finance-value">
                  ${money(finance.requested)}
                </span>
              </div>

              <div class="req-finance-row">
                <span class="req-finance-label">
                  Received
                </span>
                <span class="req-finance-value">
                  ${money(finance.received)}
                </span>
              </div>

              <div class="req-finance-row req-finance-balance">
                <span class="req-finance-label">
                  Balance
                </span>
                <span class="req-finance-value">
                  ${money(finance.balance)}
                </span>
              </div>

              ${
                finance.received === 0
                  ? `
                    <div class="req-payment-note">
                      No linked payment
                    </div>
                  `
                  : ""
              }

            </div>
          </td>

          <td>
            <button
              type="button"
              onclick="previewReq('${r.id}')">
              👁
            </button>

            <button
              type="button"
              onclick="editRequisition('${r.id}')">
              ✏️
            </button>

            <button
              type="button"
              onclick="deleteRequisition('${r.id}')">
              🗑
            </button>
          </td>

        </tr>
      `;
    }).join("");

  if (container.tagName === "TBODY") {
    container.innerHTML = rows;
  } else {
    container.innerHTML = `
      <div class="table-wrap">
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
              <th>Financial Position</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>

        </table>
      </div>
    `;
  }

  /*
    Keep the old overall "Requisition Total" card,
    but calculate it correctly from requisition rows.
  */

  const total =
    filtered.reduce(
      (sum, r) => {
        const qty = number(r.quantity);
        const unit = number(r.unit_cost);

        return sum +
          (qty > 0
            ? qty * unit
            : number(r.total_amount));
      },
      0
    );

  setText(
    "requisitionTotal",
    money(total)
  );
}

/* =========================================================
   SAVE REQUISITION
========================================================= */

window.saveRequisition = async function() {
  const id =
    document.getElementById("reqId")?.value || null;

  const reqNoInput =
    document.getElementById("reqNo")?.value?.trim();

  const reqNo =
    normalizeReqNo(reqNoInput);

  const quantity =
    number(
      document.getElementById("reqQuantity")?.value
    );

  const unitCost =
    number(
      document.getElementById("reqUnitCost")?.value
    );

  /*
    CRITICAL:
    Every line saves its OWN total.

    quantity × unit cost
  */

  const lineTotal =
    quantity * unitCost;

  const payload = {
    req_no: reqNo,

    req_date:
      document.getElementById("reqDate")?.value ||
      today(),

    requested_by:
      document.getElementById("reqRequestedBy")?.value?.trim(),

    vehicle_id:
      document.getElementById("reqVehicleId")?.value ||
      null,

    item_description:
      document.getElementById("reqItemDescription")?.value?.trim(),

    quantity,

    unit_cost: unitCost,

    total_amount: lineTotal,

    status:
      document.getElementById("reqStatus")?.value ||
      "Pending",

    notes:
      document.getElementById("reqNotes")?.value?.trim()
  };

  /*
    Preserve optional category/expense_type if those
    fields exist in the database and the HTML.
  */

  const category =
    document.getElementById("reqCategory")?.value ||
    document.getElementById("reqExpenseType")?.value ||
    "";

  if (category) {
    payload.category = category;
    payload.expense_type = category;
  }

  if (!reqNo) {
    showToast(
      "Requisition number is required.",
      "warning"
    );
    return;
  }

  if (!payload.item_description) {
    showToast(
      "Item description is required.",
      "warning"
    );
    return;
  }

  if (quantity <= 0) {
    showToast(
      "Quantity must be greater than zero.",
      "warning"
    );
    return;
  }

  if (unitCost < 0) {
    showToast(
      "Unit cost cannot be negative.",
      "warning"
    );
    return;
  }

  let result;

  if (id) {
    result = await supabase
      .from(TABLES.requisitions)
      .update(payload)
      .eq("id", id);
  } else {
    result = await supabase
      .from(TABLES.requisitions)
      .insert(payload);
  }

  if (result.error) {
    supabaseError(
      result.error,
      "Unable to save requisition."
    );
    return;
  }

  showToast(
    `${reqNo} saved at ${money(lineTotal)}.`
  );

  closeModal("requisitionModal");

  await loadRequisitions();
};

/* =========================================================
   EDIT REQUISITION
========================================================= */

window.editRequisition = function(id) {
  const r =
    requisitions.find(
      x => String(x.id) === String(id)
    );

  if (!r) return;

  const values = {
    reqId: r.id,
    reqNo: normalizeReqNo(r.req_no),
    reqDate: r.req_date,
    reqRequestedBy: r.requested_by,
    reqVehicleId: r.vehicle_id,
    reqItemDescription: r.item_description,
    reqQuantity: r.quantity,
    reqUnitCost: r.unit_cost,
    reqStatus: r.status,
    reqNotes: r.notes,
    reqCategory: r.category || r.expense_type,
    reqExpenseType: r.expense_type || r.category
  };

  Object.entries(values).forEach(([id2, value]) => {
    const el = document.getElementById(id2);

    if (el) {
      el.value = value ?? "";
    }
  });

  openModal("requisitionModal");
};

/* =========================================================
   DELETE REQUISITION
========================================================= */

window.deleteRequisition = async function(id) {
  const r =
    requisitions.find(
      x => String(x.id) === String(id)
    );

  if (!r) return;

  if (
    !confirm(
      `Delete ${normalizeReqNo(r.req_no)} — ${r.item_description}?`
    )
  ) {
    return;
  }

  const { error } =
    await supabase
      .from(TABLES.requisitions)
      .delete()
      .eq("id", id);

  if (error) {
    supabaseError(
      error,
      "Unable to delete requisition."
    );
    return;
  }

  showToast("Requisition deleted.");

  await loadRequisitions();
};

/* =========================================================
   PREVIEW REQUISITION
========================================================= */

window.previewReq = function(id) {
  const r =
    requisitions.find(
      x => String(x.id) === String(id)
    );

  if (!r) return;

  const reqNo =
    normalizeReqNo(r.req_no);

  const finance =
    getRequisitionFinance(reqNo);

  const lines =
    requisitions.filter(
      x =>
        normalizeReqNo(x.req_no) === reqNo
    );

  const html = `
    <div class="preview-card">

      <div class="preview-header">
        <h2>${escapeHtml(reqNo)}</h2>
        <p>Garage Operations Pro</p>
      </div>

      <div class="req-summary">

        <div class="req-summary-card">
          <span>Requested</span>
          <strong>${money(finance.requested)}</strong>
        </div>

        <div class="req-summary-card">
          <span>Received</span>
          <strong>${money(finance.received)}</strong>
        </div>

        <div class="req-summary-card">
          <span>Balance</span>
          <strong>${money(finance.balance)}</strong>
        </div>

      </div>

      <div class="table-wrap">

        <table>

          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Cost</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>

            ${lines.map(line => {

              const qty =
                number(line.quantity);

              const unit =
                number(line.unit_cost);

              const total =
                qty * unit;

              return `
                <tr>
                  <td>
                    ${escapeHtml(
                      line.item_description || "—"
                    )}
                  </td>

                  <td>${qty}</td>

                  <td>${money(unit)}</td>

                  <td>
                    <strong>
                      ${money(total)}
                    </strong>
                  </td>
                </tr>
              `;

            }).join("")}

          </tbody>

        </table>

      </div>

      <div class="preview-footer">

        <p>
          <strong>Requested:</strong>
          ${money(finance.requested)}
        </p>

        <p>
          <strong>Received:</strong>
          ${money(finance.received)}
        </p>

        <p>
          <strong>Balance:</strong>
          ${money(finance.balance)}
        </p>

        <p class="req-payment-note">
          Received amount includes only petty cash
          linked to ${escapeHtml(reqNo)}.
        </p>

      </div>

    </div>
  `;

  const container =
    document.getElementById("requisitionPreview");

  if (container) {
    container.innerHTML = html;
    openModal("requisitionPreviewModal");
  } else {
    const win = window.open(
      "",
      "_blank",
      "width=900,height=700"
    );

    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${escapeHtml(reqNo)}</title>
        <style>
          body{
            font-family:Arial,sans-serif;
            padding:30px;
            color:#111827;
          }
          table{
            width:100%;
            border-collapse:collapse;
          }
          th,td{
            border:1px solid #ddd;
            padding:10px;
            text-align:left;
          }
          th{
            background:#f3f4f6;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `);

    win.document.close();
  }
};

/* =========================================================
   PRINT REQUISITION
========================================================= */

window.printRequisition = function(id) {
  const r =
    requisitions.find(
      x => String(x.id) === String(id)
    );

  if (!r) return;

  const reqNo =
    normalizeReqNo(r.req_no);

  const finance =
    getRequisitionFinance(reqNo);

  const lines =
    requisitions.filter(
      x =>
        normalizeReqNo(x.req_no) === reqNo
    );

  const printWindow =
    window.open(
      "",
      "_blank",
      "width=900,height=700"
    );

  if (!printWindow) {
    showToast(
      "Please allow pop-ups to print.",
      "warning"
    );
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>

    <html>

    <head>

      <title>${escapeHtml(reqNo)}</title>

      <style>

        body {
          font-family: Arial, sans-serif;
          padding: 30px;
          color: #111827;
        }

        h1 {
          margin-bottom: 4px;
        }

        .subtitle {
          color: #6b7280;
          margin-bottom: 25px;
        }

        .summary {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:12px;
          margin:20px 0;
        }

        .card {
          border:1px solid #ddd;
          border-radius:8px;
          padding:14px;
        }

        .card span {
          display:block;
          color:#6b7280;
          font-size:12px;
          margin-bottom:5px;
        }

        .card strong {
          font-size:18px;
        }

        table {
          width:100%;
          border-collapse:collapse;
          margin-top:20px;
        }

        th, td {
          border:1px solid #ddd;
          padding:10px;
          text-align:left;
        }

        th {
          background:#f3f4f6;
        }

        .footer {
          margin-top:25px;
        }

      </style>

    </head>

    <body>

      <h1>${escapeHtml(reqNo)}</h1>

      <div class="subtitle">
        Garage Operations Pro — Requisition
      </div>

      <div class="summary">

        <div class="card">
          <span>Requested</span>
          <strong>${money(finance.requested)}</strong>
        </div>

        <div class="card">
          <span>Received</span>
          <strong>${money(finance.received)}</strong>
        </div>

        <div class="card">
          <span>Balance</span>
          <strong>${money(finance.balance)}</strong>
        </div>

      </div>

      <table>

        <thead>
          <tr>
            <th>Item Description</th>
            <th>Qty</th>
            <th>Unit Cost</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>

          ${lines.map(line => {

            const qty =
              number(line.quantity);

            const unit =
              number(line.unit_cost);

            const total =
              qty * unit;

            return `
              <tr>

                <td>
                  ${escapeHtml(
                    line.item_description || "—"
                  )}
                </td>

                <td>${qty}</td>

                <td>${money(unit)}</td>

                <td>${money(total)}</td>

              </tr>
            `;

          }).join("")}

        </tbody>

      </table>

      <div class="footer">

        <p>
          <strong>Requested:</strong>
          ${money(finance.requested)}
        </p>

        <p>
          <strong>Received:</strong>
          ${money(finance.received)}
        </p>

        <p>
          <strong>Balance:</strong>
          ${money(finance.balance)}
        </p>

        <p>
          Received amount is based only on petty cash
          linked to ${escapeHtml(reqNo)}.
        </p>

      </div>

    </body>

    </html>
  `);

  printWindow.document.close();

  setTimeout(() => {
    printWindow.print();
  }, 400);
};

/* =========================================================
   SHARE REQUISITION
========================================================= */

window.shareRequisition = async function(id) {
  const r =
    requisitions.find(
      x => String(x.id) === String(id)
    );

  if (!r) return;

  const reqNo =
    normalizeReqNo(r.req_no);

  const finance =
    getRequisitionFinance(reqNo);

  const lines =
    requisitions.filter(
      x =>
        normalizeReqNo(x.req_no) === reqNo
    );

  const text = [
    "GARAGE OPERATIONS PRO",
    `REQUISITION: ${reqNo}`,
    "",
    ...lines.map(line => {
      const qty = number(line.quantity);
      const unit = number(line.unit_cost);
      const total = qty * unit;

      return `${line.item_description}: ${qty} × ${money(unit)} = ${money(total)}`;
    }),
    "",
    `Requested: ${money(finance.requested)}`,
    `Received: ${money(finance.received)}`,
    `Balance: ${money(finance.balance)}`,
    "",
    `Received applies only to ${reqNo}.`
  ].join("\n");

  if (navigator.share) {
    try {
      await navigator.share({
        title: reqNo,
        text
      });

      return;
    } catch (error) {
      console.log("Share cancelled.");
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast("Requisition copied to clipboard.");
  } catch (error) {
    showToast(
      "Sharing is not available on this device.",
      "warning"
    );
  }
};

/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {
  const totalVehicles =
    vehicles.length;

  const underRepair =
    vehicles.filter(
      v =>
        String(v.status || "")
          .toLowerCase() === "under repair"
    ).length;

  const storage =
    vehicles.filter(
      v =>
        String(v.status || "")
          .toLowerCase() === "storage"
    ).length;

  const completed =
    vehicles.filter(
      v =>
        String(v.status || "")
          .toLowerCase() === "completed"
    ).length;

  const released =
    vehicles.filter(
      v =>
        String(v.status || "")
          .toLowerCase() === "released"
    ).length;

  const expenseTotal =
    expenses.reduce(
      (sum, e) => sum + number(e.amount),
      0
    );

  const pettyTotal =
    pettyCash.reduce(
      (sum, p) => sum + number(p.amount),
      0
    );

  /*
    Dashboard requisition total is the total of
    individual requisition lines.

    It does NOT alter individual requisition finances.
  */

  const requisitionTotal =
    requisitions.reduce(
      (sum, r) => {
        const qty = number(r.quantity);
        const unit = number(r.unit_cost);

        return sum +
          (qty > 0
            ? qty * unit
            : number(r.total_amount));
      },
      0
    );

  setText("dashboardVehicles", totalVehicles);
  setText("dashboardUnderRepair", underRepair);
  setText("dashboardStorage", storage);
  setText("dashboardCompleted", completed);
  setText("dashboardReleased", released);
  setText("dashboardExpenses", money(expenseTotal));
  setText("dashboardPettyCash", money(pettyTotal));
  setText(
    "dashboardRequisitions",
    money(requisitionTotal)
  );

  renderPremiumDashboard();
}

function renderPremiumDashboard() {
  const now = new Date();

  setText(
    "liveDate",
    now.toLocaleDateString(
      "en-KE",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      }
    )
  );

  setText(
    "liveTime",
    now.toLocaleTimeString("en-KE")
  );

  setText(
    "lastUpdated",
    "Last updated " +
      now.toLocaleTimeString("en-KE")
  );
}

/* =========================================================
   SEARCH LISTENERS
========================================================= */

document.addEventListener("input", event => {
  if (
    event.target.id ===
    "vehicleSearch"
  ) {
    renderVehicles();
  }

  if (
    event.target.id ===
    "expenseSearch"
  ) {
    renderExpenses();
  }

  if (
    event.target.id ===
    "pettySearch"
  ) {
    renderPettyCash();
  }

  if (
    event.target.id ===
    "requisitionSearch"
  ) {
    renderRequisitions();
  }
});

document.addEventListener("change", event => {
  if (
    event.target.id ===
    "requisitionStatusFilter"
  ) {
    renderRequisitions();
  }
});

/* =========================================================
   REQUISITION AUTO TOTAL PREVIEW
========================================================= */

function updateRequisitionLineTotal() {
  const quantity =
    number(
      document.getElementById("reqQuantity")?.value
    );

  const unitCost =
    number(
      document.getElementById("reqUnitCost")?.value
    );

  const total =
    quantity * unitCost;

  setText(
    "reqTotalPreview",
    money(total)
  );

  const input =
    document.getElementById("reqTotalAmount");

  if (input) {
    input.value = total;
  }
}

document.addEventListener("input", event => {
  if (
    event.target.id === "reqQuantity" ||
    event.target.id === "reqUnitCost"
  ) {
    updateRequisitionLineTotal();
  }
});

/* =========================================================
   MODAL CLOSE
========================================================= */

document.addEventListener("click", event => {
  const target = event.target;

  if (
    target.classList.contains("modal") &&
    target.dataset.closeOnOutside === "true"
  ) {
    target.style.display = "none";
    target.classList.remove("active");
  }
});

/* =========================================================
   ESCAPE KEY
========================================================= */

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;

  document
    .querySelectorAll(".modal.active")
    .forEach(modal => {
      modal.classList.remove("active");
      modal.style.display = "none";
    });
});

/* =========================================================
   CLOCK
========================================================= */

setInterval(() => {
  renderPremiumDashboard();
}, 1000);

/* =========================================================
   GLOBAL ERROR HANDLING
========================================================= */

window.addEventListener("error", event => {
  console.error(
    "Garage Operations Pro error:",
    event.error || event.message
  );
});

window.addEventListener(
  "unhandledrejection",
  event => {
    console.error(
      "Garage Operations Pro promise error:",
      event.reason
    );
  }
);

/* =========================================================
   START APPLICATION
========================================================= */

async function startApp() {
  injectPremiumStyles();

  /*
    Login logic remains handled by the existing HTML/login
    flow. This file starts the application data layer.
  */

  await loadVehicles();

  await loadExpenses();

  await loadRequisitions();

  /*
    Requisitions must load before petty cash so that the
    petty cash requisition selector contains REQ-001,
    REQ-002, etc.
  */

  await loadPettyCash();

  populateVehicleSelects();

  populatePettyCashReqSelect();

  renderDashboard();

  /*
    Do not automatically change the user's current page.
    Existing login/navigation remains in control.
  */
}

/* =========================================================
   START
========================================================= */

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    startApp
  );
} else {
  startApp();
}
