import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE MOBILE-FRIENDLY APP.JS
   ========================================================= */

const SUPABASE_URL = "https://ptluwoeogfkqavhspdjj.supabase.co";
const SUPABASE_KEY = "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* =========================================================
   GLOBAL DATA
   ========================================================= */

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];
let invoices = [];
let gatePasses = [];
let estimates = [];

const missingTables = {};

/* =========================================================
   HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

const n = value => {
  const x = Number(value);
  return Number.isFinite(x) ? x : 0;
};

const money = value =>
  "KSh " + n(value).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const today = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const norm = value =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s\-_/]+/g, "");

const esc = value =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const vehicleName = v =>
  v ? `${v.registration || ""}${v.customer ? " — " + v.customer : ""}` : "Unassigned";

const findVehicle = id =>
  vehicles.find(v => String(v.id) === String(id));

const statusClass = status =>
  "status-" + String(status || "")
    .toLowerCase()
    .replace(/\s+/g, "-");

function toast(message, type = "") {
  const el = $("toast");
  if (!el) {
    alert(message);
    return;
  }

  el.textContent = message;
  el.className = "toast show " + type;

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    el.className = "toast";
  }, 3000);
}

function openModal(id) {
  const el = $(id);
  if (el) el.classList.add("show");
}

function closeModal(id) {
  const el = $(id);
  if (el) el.classList.remove("show");
}

function closeAllModals() {
  document.querySelectorAll(".modal").forEach(m => {
    m.classList.remove("show");
  });
}

function storageDays(v) {
  if (!v?.date_in) return 0;

  const start = new Date(v.date_in + "T00:00:00");
  const end = v.date_out
    ? new Date(v.date_out + "T00:00:00")
    : new Date();

  const days = Math.floor((end - start) / 86400000);
  return Math.max(0, days);
}

/* =========================================================
   PHONE-FRIENDLY ACTION BUTTON STYLING
   ========================================================= */

function injectMobileStyles() {
  if ($("garageMobileStyles")) return;

  const style = document.createElement("style");
  style.id = "garageMobileStyles";

  style.textContent = `
    .table-actions{
      display:flex !important;
      flex-direction:row !important;
      flex-wrap:nowrap !important;
      align-items:center !important;
      justify-content:flex-start !important;
      gap:5px !important;
      white-space:nowrap !important;
      min-width:max-content !important;
    }

    .action-btn{
      width:34px !important;
      height:32px !important;
      min-width:34px !important;
      max-width:34px !important;
      padding:0 !important;
      margin:0 !important;
      border:0 !important;
      border-radius:7px !important;
      display:inline-flex !important;
      align-items:center !important;
      justify-content:center !important;
      font-size:15px !important;
      line-height:1 !important;
      cursor:pointer !important;
      flex:0 0 34px !important;
      box-shadow:none !important;
      transition:transform .12s,filter .12s !important;
    }

    .action-btn:hover{
      transform:translateY(-1px);
      filter:brightness(.95);
    }

    .action-btn:active{
      transform:scale(.94);
    }

    .action-btn.blue{
      background:#e0f2fe !important;
      color:#075985 !important;
    }

    .action-btn.green{
      background:#dcfce7 !important;
      color:#166534 !important;
    }

    .action-btn.orange{
      background:#fef3c7 !important;
      color:#92400e !important;
    }

    .action-btn.danger{
      background:#fee2e2 !important;
      color:#991b1b !important;
    }

    .action-btn.purple{
      background:#ede9fe !important;
      color:#5b21b6 !important;
    }

    .action-btn.gray{
      background:#f1f5f9 !important;
      color:#172033 !important;
    }

    .table-wrap,
    .table-container{
      overflow-x:auto !important;
      -webkit-overflow-scrolling:touch !important;
    }

    table{
      min-width:max-content;
    }

    td:last-child,
    th:last-child{
      white-space:nowrap !important;
    }

    .kpi-card{
      cursor:pointer;
    }

    @media(max-width:720px){
      .table-actions{
        gap:4px !important;
      }

      .action-btn{
        width:32px !important;
        height:30px !important;
        min-width:32px !important;
        max-width:32px !important;
        flex:0 0 32px !important;
        font-size:14px !important;
      }
    }

    .estimate-items-wrap{
      overflow-x:auto;
      width:100%;
    }

    .estimate-items-table{
      width:100%;
      min-width:650px;
    }

    .estimate-actions{
      display:flex;
      gap:5px;
      flex-wrap:nowrap;
      white-space:nowrap;
    }

    .screen-only{
      display:block;
    }

    @media print{
      .screen-only{
        display:none !important;
      }
    }
  `;

  document.head.appendChild(style);
}

/* =========================================================
   ACTION BUTTON
   ========================================================= */

function btn(icon, title, fn, id, cls = "gray") {
  return `
    <button
      type="button"
      class="action-btn ${cls}"
      title="${esc(title)}"
      aria-label="${esc(title)}"
      onclick="${fn}('${esc(id)}')"
    >${icon}</button>
  `;
}

function vehicleActions(id) {
  return `
    <div class="table-actions">
      ${btn("✏️", "Edit vehicle", "editVehicle", id, "blue")}
      ${btn("🚘", "Vehicle expenses", "viewVehicleExpenses", id, "green")}
      ${btn("👁️", "View vehicle", "viewVehicle", id, "gray")}
      ${btn("📤", "Share vehicle", "shareVehicle", id, "purple")}
      ${btn("🗑️", "Delete vehicle", "deleteVehicle", id, "danger")}
    </div>
  `;
}

function standardActions(id, editFn, viewFn, shareFn, deleteFn) {
  return `
    <div class="table-actions">
      ${btn("✏️", "Edit", editFn, id, "blue")}
      ${btn("👁️", "View", viewFn, id, "gray")}
      ${btn("📤", "Share", shareFn, id, "purple")}
      ${btn("🗑️", "Delete", deleteFn, id, "danger")}
    </div>
  `;
}

/* =========================================================
   SAFE DATABASE LOAD
   ========================================================= */

async function getRows(table) {
  try {
    let result = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false });

    if (result.error && /created_at/i.test(result.error.message || "")) {
      result = await supabase
        .from(table)
        .select("*");
    }

    if (result.error) {
      missingTables[table] =
        /relation|does not exist|schema cache/i.test(result.error.message || "");

      console.warn(table, result.error);
      return [];
    }

    missingTables[table] = false;
    return result.data || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

/* =========================================================
   LOAD ALL DATA
   ========================================================= */

async function loadAllData() {
  toast("Loading garage data...");

  const [
    v,
    e,
    p,
    r,
    i,
    g,
    q
  ] = await Promise.all([
    getRows("vehicles"),
    getRows("expenses"),
    getRows("petty_cash"),
    getRows("requisitions"),
    getRows("invoices"),
    getRows("gate_passes"),
    getRows("estimates")
  ]);

  vehicles = v;
  expenses = e;
  pettyCash = p;
  requisitions = r;
  invoices = i;
  gatePasses = g;
  estimates = q;

  renderAll();

  if (missingTables.gate_passes) {
    console.warn("gate_passes table is missing.");
  }

  toast("Data loaded");
}

/* =========================================================
   SECTION NAVIGATION
   ========================================================= */

function showSection(section) {
  document.querySelectorAll(".section").forEach(el => {
    el.classList.remove("active");
  });

  const target = $(section);
  if (target) target.classList.add("active");

  document.querySelectorAll("[data-section]").forEach(el => {
    el.classList.toggle(
      "active",
      el.dataset.section === section
    );
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (section === "dashboard") renderDashboard();
  if (section === "vehicles") renderVehicles();
  if (section === "expenses") renderExpenses();
  if (section === "pettyCash") renderPettyCash();
  if (section === "requisitions") renderRequisitions();
  if (section === "invoices") renderInvoices();
  if (section === "gatePasses") renderGatePasses();
  if (section === "estimates") renderEstimates();
}

/* =========================================================
   USER
   ========================================================= */

function setUserDisplay() {
  const user =
    sessionStorage.getItem("garageUser") ||
    sessionStorage.getItem("username") ||
    "User";

  if ($("sidebarUser")) $("sidebarUser").textContent = user;
  if ($("welcomeUser")) $("welcomeUser").textContent = user;
}

/* =========================================================
   VEHICLES
   ========================================================= */

function filteredVehicles() {
  const q = norm($("vehicleSearch")?.value || "");
  const status = $("vehicleStatusFilter")?.value || "";

  return vehicles.filter(v => {
    const text = norm([
      v.registration,
      v.customer,
      v.model,
      v.model_year,
      v.color,
      v.job_type,
      v.status,
      v.description
    ].join(" "));

    return (
      (!q || text.includes(q)) &&
      (!status || v.status === status)
    );
  });
}

function renderVehicles() {
  const body = $("vehiclesTableBody");
  if (!body) return;

  const rows = filteredVehicles();

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="11" style="text-align:center;padding:25px">
          No vehicles found
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows.map(v => {
    const ex = expenses
      .filter(e => String(e.vehicle_id) === String(v.id))
      .reduce((a, e) => a + n(e.amount), 0);

    const outstanding = n(v.billed) - n(v.paid);

    return `
      <tr>
        <td><strong>${esc(v.registration)}</strong></td>
        <td>${esc(v.customer)}</td>
        <td>${esc(v.date_in || "")}</td>
        <td>${esc(v.job_type || "")}</td>
        <td>
          <span class="${statusClass(v.status)}">
            ${esc(v.status || "")}
          </span>
        </td>
        <td>${storageDays(v)}</td>
        <td>${money(v.billed)}</td>
        <td>${money(v.paid)}</td>
        <td>${money(outstanding)}</td>
        <td>${money(ex)}</td>
        <td>${vehicleActions(v.id)}</td>
      </tr>
    `;
  }).join("");
}

function openVehicleModal(id = "") {
  const form = $("vehicleForm");
  if (form) form.reset();

  $("vehicleId").value = "";
  $("vehicleModalTitle").textContent = "Add Vehicle";

  if ($("vehicleDateIn")) $("vehicleDateIn").value = today();
  if ($("vehicleJobType")) $("vehicleJobType").value = "Repair";
  if ($("vehicleStatus")) $("vehicleStatus").value = "Under Repair";
  if ($("vehicleBilled")) $("vehicleBilled").value = 0;
  if ($("vehiclePaid")) $("vehiclePaid").value = 0;
  if ($("vehicleStorageDays")) $("vehicleStorageDays").value = 0;

  if (id) editVehicle(id);
  else openModal("vehicleModal");
}

async function saveVehicle(event) {
  event?.preventDefault();

  const id = $("vehicleId").value.trim();
  const registration = $("vehicleRegistration").value.trim();
  const customer = $("vehicleCustomer").value.trim();

  if (!registration || !customer) {
    toast("Registration and customer are required", "error");
    return;
  }

  const duplicate = vehicles.find(v =>
    norm(v.registration) === norm(registration) &&
    String(v.id) !== String(id)
  );

  if (duplicate) {
    toast("This vehicle registration already exists", "error");
    return;
  }

  const row = {
    registration,
    customer,
    date_in: $("vehicleDateIn").value || today(),
    date_out: $("vehicleDateOut").value || null,
    job_type: $("vehicleJobType").value || "Repair",
    status: $("vehicleStatus").value || "Under Repair",
    released_to: $("vehicleReleasedTo").value.trim(),
    released_contact: $("vehicleReleasedContact").value.trim(),
    billed: n($("vehicleBilled").value),
    paid: n($("vehiclePaid").value),
    description: $("vehicleDescription").value.trim(),
    model: $("vehicleModel")?.value.trim() || "",
    model_year: $("vehicleModelYear")?.value.trim() || "",
    color: $("vehicleColor")?.value.trim() || ""
  };

  let result;

  if (id) {
    result = await supabase
      .from("vehicles")
      .update(row)
      .eq("id", id);
  } else {
    result = await supabase
      .from("vehicles")
      .insert(row);
  }

  if (result.error) {
    /*
      Some older databases may not yet have model/model_year/color.
      Retry using the original core vehicle columns.
    */
    if (/model|model_year|color/i.test(result.error.message || "")) {
      const fallback = { ...row };
      delete fallback.model;
      delete fallback.model_year;
      delete fallback.color;

      result = id
        ? await supabase.from("vehicles").update(fallback).eq("id", id)
        : await supabase.from("vehicles").insert(fallback);
    }
  }

  if (result.error) {
    console.error(result.error);
    toast(result.error.message, "error");
    return;
  }

  closeModal("vehicleModal");
  await loadAllData();
  toast(id ? "Vehicle updated" : "Vehicle added");
}

function editVehicle(id) {
  const v = findVehicle(id);
  if (!v) return;

  $("vehicleId").value = v.id;
  $("vehicleRegistration").value = v.registration || "";
  $("vehicleCustomer").value = v.customer || "";
  if ($("vehicleModel")) $("vehicleModel").value = v.model || "";
  if ($("vehicleModelYear")) $("vehicleModelYear").value = v.model_year || "";
  if ($("vehicleColor")) $("vehicleColor").value = v.color || "";
  $("vehicleDateIn").value = v.date_in || "";
  $("vehicleDateOut").value = v.date_out || "";
  $("vehicleStorageDays").value = storageDays(v);
  $("vehicleJobType").value = v.job_type || "Repair";
  $("vehicleStatus").value = v.status || "Under Repair";
  $("vehicleReleasedTo").value = v.released_to || "";
  $("vehicleReleasedContact").value = v.released_contact || "";
  $("vehicleBilled").value = n(v.billed);
  $("vehiclePaid").value = n(v.paid);
  $("vehicleDescription").value = v.description || "";

  $("vehicleModalTitle").textContent = "Edit Vehicle";
  openModal("vehicleModal");
}

async function deleteVehicle(id) {
  const v = findVehicle(id);
  if (!v) return;

  if (!confirm(
    `Delete ${v.registration}?\n\nIts linked expenses will also be deleted because of the database cascade.`
  )) return;

  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", id);

  if (error) {
    toast(error.message, "error");
    return;
  }

  await loadAllData();
  toast("Vehicle deleted");
}

function vehicleHTML(v) {
  const vehicleExpenses = vehicleExpenseRows(v.id);
  const total = vehicleExpenses.reduce((a, x) => a + n(x.amount), 0);
  const outstanding = n(v.billed) - n(v.paid);

  return `
    <div class="print-document">
      <h2>Vehicle Report</h2>

      <h3>${esc(v.registration)}</h3>

      <table>
        <tr><th>Customer</th><td>${esc(v.customer)}</td></tr>
        <tr><th>Model</th><td>${esc(v.model || "-")}</td></tr>
        <tr><th>Year</th><td>${esc(v.model_year || "-")}</td></tr>
        <tr><th>Color</th><td>${esc(v.color || "-")}</td></tr>
        <tr><th>Date In</th><td>${esc(v.date_in || "-")}</td></tr>
        <tr><th>Date Out</th><td>${esc(v.date_out || "-")}</td></tr>
        <tr><th>Storage Days</th><td>${storageDays(v)}</td></tr>
        <tr><th>Job Type</th><td>${esc(v.job_type || "-")}</td></tr>
        <tr><th>Status</th><td>${esc(v.status || "-")}</td></tr>
        <tr><th>Billed</th><td>${money(v.billed)}</td></tr>
        <tr><th>Paid</th><td>${money(v.paid)}</td></tr>
        <tr><th>Outstanding</th><td>${money(outstanding)}</td></tr>
        <tr><th>Total Expenses</th><td>${money(total)}</td></tr>
        <tr><th>Description</th><td>${esc(v.description || "-")}</td></tr>
      </table>
    </div>
  `;
}

function viewVehicle(id) {
  const v = findVehicle(id);
  if (!v) return;

  $("previewTitle").textContent =
    `Vehicle — ${v.registration}`;

  $("previewContent").innerHTML = vehicleHTML(v);
  openModal("previewModal");
}

async function shareVehicle(id) {
  const v = findVehicle(id);
  if (!v) return;

  const total = vehicleExpenseRows(id)
    .reduce((a, e) => a + n(e.amount), 0);

  const text = [
    "GARAGE OPERATIONS PRO",
    "VEHICLE REPORT",
    "",
    `Registration: ${v.registration}`,
    `Customer: ${v.customer}`,
    `Model: ${v.model || "-"}`,
    `Status: ${v.status || "-"}`,
    `Job Type: ${v.job_type || "-"}`,
    `Date In: ${v.date_in || "-"}`,
    `Storage Days: ${storageDays(v)}`,
    `Billed: ${money(v.billed)}`,
    `Paid: ${money(v.paid)}`,
    `Outstanding: ${money(n(v.billed) - n(v.paid))}`,
    `Total Expenses: ${money(total)}`
  ].join("\n");

  await shareText(`Vehicle ${v.registration}`, text);
}

/* =========================================================
   VEHICLE EXPENSE REPORT
   ========================================================= */

function vehicleExpenseRows(id) {
  return expenses.filter(e =>
    String(e.vehicle_id) === String(id)
  );
}

function vehicleExpenseHTML(id) {
  const v = findVehicle(id);
  if (!v) return "<p>Vehicle not found.</p>";

  const rows = vehicleExpenseRows(id);
  const total = rows.reduce((a, e) => a + n(e.amount), 0);

  return `
    <div class="print-document">
      <h2>Vehicle Expense Report</h2>

      <h3>${esc(v.registration)}</h3>
      <p><strong>Customer:</strong> ${esc(v.customer)}</p>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows.length
              ? rows.map(e => `
                <tr>
                  <td>${esc(e.expense_date || "")}</td>
                  <td>${esc(e.category || "")}</td>
                  <td>${esc(e.description || "")}</td>
                  <td>${money(e.amount)}</td>
                </tr>
              `).join("")
              : `
                <tr>
                  <td colspan="4">No expenses found for this vehicle.</td>
                </tr>
              `
          }
        </tbody>
        <tfoot>
          <tr>
            <th colspan="3">TOTAL</th>
            <th>${money(total)}</th>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function viewVehicleExpenses(id) {
  const v = findVehicle(id);
  if (!v) return;

  $("vehicleExpensePreviewContent").innerHTML =
    vehicleExpenseHTML(id);

  openModal("vehicleExpensePreviewModal");
}

function printVehicleExpensePreview() {
  const content = $("vehicleExpensePreviewContent")?.innerHTML || "";
  printHTML(
    "Vehicle Expense Report",
    content
  );
}

async function shareVehicleExpenses(id) {
  const v = findVehicle(id);
  if (!v) return;

  const rows = vehicleExpenseRows(id);
  const total = rows.reduce((a, e) => a + n(e.amount), 0);

  const text = [
    "GARAGE OPERATIONS PRO",
    "VEHICLE EXPENSE REPORT",
    "",
    `Vehicle: ${v.registration}`,
    `Customer: ${v.customer}`,
    "",
    ...rows.map(e =>
      `${e.expense_date || ""} | ${e.category || ""} | ${e.description || ""} | ${money(e.amount)}`
    ),
    "",
    `TOTAL: ${money(total)}`
  ].join("\n");

  await shareText(
    `Expenses ${v.registration}`,
    text
  );
}

/* =========================================================
   EXPENSES
   ========================================================= */

function fillExpenseVehicleSelect(selected = "") {
  const el = $("expenseVehicle");
  if (!el) return;

  el.innerHTML = `
    <option value="">Select vehicle</option>
    ${vehicles.map(v => `
      <option value="${esc(v.id)}"
        ${String(v.id) === String(selected) ? "selected" : ""}>
        ${esc(vehicleName(v))}
      </option>
    `).join("")}
  `;
}

function filteredExpenses() {
  const q = ($("expenseSearch")?.value || "").trim();
  const cat = $("expenseCategoryFilter")?.value || "";

  /*
    IMPORTANT:
    If search exactly matches a registration, only expenses
    linked to that vehicle_id are returned.
  */
  if (q) {
    const v = vehicles.find(x =>
      norm(x.registration) === norm(q)
    );

    if (v) {
      return expenses.filter(x =>
        String(x.vehicle_id) === String(v.id) &&
        (!cat || x.category === cat)
      );
    }
  }

  const qq = q.toLowerCase();

  return expenses.filter(x => {
    const v = findVehicle(x.vehicle_id);

    const text = [
      x.description,
      x.category,
      v?.registration,
      v?.customer,
      v?.model
    ].join(" ").toLowerCase();

    return (
      (!qq || text.includes(qq)) &&
      (!cat || x.category === cat)
    );
  });
}

function renderExpenses() {
  const body = $("expensesTableBody");
  if (!body) return;

  const rows = filteredExpenses();

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:25px">
          No expenses found
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows.map(e => {
    const v = findVehicle(e.vehicle_id);

    return `
      <tr>
        <td>${esc(e.expense_date || "")}</td>
        <td>${esc(v?.registration || "Unassigned")}</td>
        <td>${esc(e.category || "")}</td>
        <td>${esc(e.description || "")}</td>
        <td>${money(e.amount)}</td>
        <td>
          ${standardActions(
            e.id,
            "editExpense",
            "viewExpense",
            "shareExpense",
            "deleteExpense"
          )}
        </td>
      </tr>
    `;
  }).join("");
}

function openExpenseModal(id = "") {
  $("expenseForm")?.reset();

  $("expenseId").value = "";
  $("expenseDate").value = today();
  $("expenseCategory").value = "Parts";
  $("expenseAmount").value = 0;

  fillExpenseVehicleSelect();

  $("expenseModalTitle").textContent = "Add Expense";

  if (id) editExpense(id);
  else openModal("expenseModal");
}

async function saveExpense(event) {
  event?.preventDefault();

  const id = $("expenseId").value.trim();
  const vehicleId = $("expenseVehicle").value;

  if (!vehicleId) {
    toast("Please select a vehicle", "error");
    return;
  }

  if (!$("expenseDescription").value.trim()) {
    toast("Description is required", "error");
    return;
  }

  const row = {
    vehicle_id: vehicleId,
    expense_date: $("expenseDate").value || today(),
    category: $("expenseCategory").value || "Parts",
    amount: n($("expenseAmount").value),
    description: $("expenseDescription").value.trim()
  };

  const result = id
    ? await supabase.from("expenses").update(row).eq("id", id)
    : await supabase.from("expenses").insert(row);

  if (result.error) {
    toast(result.error.message, "error");
    return;
  }

  closeModal("expenseModal");
  await loadAllData();
  toast(id ? "Expense updated" : "Expense added");
}

function editExpense(id) {
  const e = expenses.find(x =>
    String(x.id) === String(id)
  );

  if (!e) return;

  $("expenseId").value = e.id;
  fillExpenseVehicleSelect(e.vehicle_id);
  $("expenseDate").value = e.expense_date || "";
  $("expenseCategory").value = e.category || "Parts";
  $("expenseAmount").value = n(e.amount);
  $("expenseDescription").value = e.description || "";

  $("expenseModalTitle").textContent = "Edit Expense";
  openModal("expenseModal");
}

async function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id);

  if (error) {
    toast(error.message, "error");
    return;
  }

  await loadAllData();
  toast("Expense deleted");
}

function expenseText(id) {
  const e = expenses.find(x =>
    String(x.id) === String(id)
  );
  if (!e) return "";

  const v = findVehicle(e.vehicle_id);

  return [
    "GARAGE OPERATIONS PRO",
    "EXPENSE",
    "",
    `Vehicle: ${v?.registration || "Unassigned"}`,
    `Customer: ${v?.customer || "-"}`,
    `Date: ${e.expense_date || "-"}`,
    `Category: ${e.category || "-"}`,
    `Description: ${e.description || "-"}`,
    `Amount: ${money(e.amount)}`
  ].join("\n");
}

function viewExpense(id) {
  const e = expenses.find(x => String(x.id) === String(id));
  if (!e) return;

  $("previewTitle").textContent = "Expense";
  $("previewContent").innerHTML = `
    <h2>Expense</h2>
    <table>
      <tr><th>Vehicle</th><td>${esc(findVehicle(e.vehicle_id)?.registration || "Unassigned")}</td></tr>
      <tr><th>Date</th><td>${esc(e.expense_date)}</td></tr>
      <tr><th>Category</th><td>${esc(e.category)}</td></tr>
      <tr><th>Description</th><td>${esc(e.description)}</td></tr>
      <tr><th>Amount</th><td>${money(e.amount)}</td></tr>
    </table>
  `;

  openModal("previewModal");
}

async function shareExpense(id) {
  const text = expenseText(id);
  if (text) await shareText("Garage Expense", text);
}

/* =========================================================
   PETTY CASH
   ========================================================= */

function filteredPetty() {
  const q = ($("pettySearch")?.value || "").toLowerCase();
  const cat = $("pettyCategoryFilter")?.value || "";

  return pettyCash.filter(x => {
    const text = [
      x.description,
      x.paid_to,
      x.category,
      x.notes
    ].join(" ").toLowerCase();

    return (
      (!q || text.includes(q)) &&
      (!cat || x.category === cat)
    );
  });
}

function renderPettyCash() {
  const body = $("pettyTableBody");
  if (!body) return;

  const rows = filteredPetty();

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:25px">
          No petty cash records found
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows.map(x => `
    <tr>
      <td>${esc(x.cash_date || "")}</td>
      <td>${esc(x.paid_to || "")}</td>
      <td>${esc(x.category || "")}</td>
      <td>${esc(x.description || "")}</td>
      <td>${money(x.amount)}</td>
      <td>
        ${standardActions(
          x.id,
          "editPetty",
          "viewPetty",
          "sharePetty",
          "deletePetty"
        )}
      </td>
    </tr>
  `).join("");
}

function openPettyModal(id = "") {
  $("pettyForm")?.reset();

  $("pettyId").value = "";
  $("pettyDate").value = today();
  $("pettyCategory").value = "Other";
  $("pettyAmount").value = 0;

  $("pettyModalTitle").textContent = "Add Petty Cash";

  if (id) editPetty(id);
  else openModal("pettyModal");
}

async function savePetty(event) {
  event?.preventDefault();

  const id = $("pettyId").value.trim();

  const row = {
    cash_date: $("pettyDate").value || today(),
    paid_to: $("pettyPaidTo").value.trim(),
    category: $("pettyCategory").value || "Other",
    amount: n($("pettyAmount").value),
    description: $("pettyDescription").value.trim(),
    notes: $("pettyNotes").value.trim()
  };

  if (!row.description) {
    toast("Description is required", "error");
    return;
  }

  const result = id
    ? await supabase.from("petty_cash").update(row).eq("id", id)
    : await supabase.from("petty_cash").insert(row);

  if (result.error) {
    toast(result.error.message, "error");
    return;
  }

  closeModal("pettyModal");
  await loadAllData();
  toast(id ? "Petty cash updated" : "Petty cash added");
}

function editPetty(id) {
  const x = pettyCash.find(r => String(r.id) === String(id));
  if (!x) return;

  $("pettyId").value = x.id;
  $("pettyDate").value = x.cash_date || "";
  $("pettyPaidTo").value = x.paid_to || "";
  $("pettyCategory").value = x.category || "Other";
  $("pettyAmount").value = n(x.amount);
  $("pettyDescription").value = x.description || "";
  $("pettyNotes").value = x.notes || "";

  $("pettyModalTitle").textContent = "Edit Petty Cash";
  openModal("pettyModal");
}

async function deletePetty(id) {
  if (!confirm("Delete this petty cash record?")) return;

  const { error } = await supabase
    .from("petty_cash")
    .delete()
    .eq("id", id);

  if (error) {
    toast(error.message, "error");
    return;
  }

  await loadAllData();
  toast("Petty cash deleted");
}

function pettyText(id) {
  const x = pettyCash.find(r => String(r.id) === String(id));
  if (!x) return "";

  return [
    "GARAGE OPERATIONS PRO",
    "PETTY CASH",
    "",
    `Date: ${x.cash_date || "-"}`,
    `Paid To: ${x.paid_to || "-"}`,
    `Category: ${x.category || "-"}`,
    `Description: ${x.description || "-"}`,
    `Amount: ${money(x.amount)}`,
    `Notes: ${x.notes || "-"}`
  ].join("\n");
}

function viewPetty(id) {
  const x = pettyCash.find(r => String(r.id) === String(id));
  if (!x) return;

  $("previewTitle").textContent = "Petty Cash";
  $("previewContent").innerHTML = `
    <h2>Petty Cash</h2>
    <table>
      <tr><th>Date</th><td>${esc(x.cash_date)}</td></tr>
      <tr><th>Paid To</th><td>${esc(x.paid_to)}</td></tr>
      <tr><th>Category</th><td>${esc(x.category)}</td></tr>
      <tr><th>Description</th><td>${esc(x.description)}</td></tr>
      <tr><th>Amount</th><td>${money(x.amount)}</td></tr>
      <tr><th>Notes</th><td>${esc(x.notes || "-")}</td></tr>
    </table>
  `;

  openModal("previewModal");
}

async function sharePetty(id) {
  const text = pettyText(id);
  if (text) await shareText("Petty Cash", text);
}

/* =========================================================
   REQUISITIONS
   ========================================================= */

function fillReqVehicleSelect(selected = "") {
  const el = $("reqVehicle");
  if (!el) return;

  el.innerHTML = `
    <option value="">Select vehicle</option>
    ${vehicles.map(v => `
      <option value="${esc(v.id)}"
        ${String(v.id) === String(selected) ? "selected" : ""}>
        ${esc(vehicleName(v))}
      </option>
    `).join("")}
  `;
}

function filteredReqs() {
  const q = ($("reqSearch")?.value || "").toLowerCase();
  const status = $("reqStatusFilter")?.value || "";

  return requisitions.filter(r => {
    const v = findVehicle(r.vehicle_id);

    const text = [
      r.req_no,
      r.requested_by,
      r.item_description,
      r.status,
      r.expense_type,
      v?.registration
    ].join(" ").toLowerCase();

    return (
      (!q || text.includes(q)) &&
      (!status || r.status === status)
    );
  });
}

function renderRequisitions() {
  const body = $("requisitionsTableBody");
  if (!body) return;

  const rows = filteredReqs();
  const total = rows.reduce((a, r) => a + n(r.total_amount), 0);

  if ($("reqOverallTotal")) {
    $("reqOverallTotal").textContent = money(total);
  }

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:25px">
          No requisitions found
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows.map(r => {
    const v = findVehicle(r.vehicle_id);

    return `
      <tr>
        <td>${esc(r.req_no)}</td>
        <td>${esc(r.req_date)}</td>
        <td>${esc(r.requested_by)}</td>
        <td>${esc(v?.registration || "—")}</td>
        <td>${esc(r.item_description)}</td>
        <td>${money(r.total_amount)}</td>
        <td>${esc(r.status)}</td>
        <td>
          ${standardActions(
            r.id,
            "editReq",
            "viewReq",
            "shareReq",
            "deleteReq"
          )}
        </td>
      </tr>
    `;
  }).join("");
}

function openReqModal(id = "") {
  $("reqForm")?.reset();

  $("reqId").value = "";
  $("reqDate").value = today();
  $("reqQuantity").value = 1;
  $("reqUnitCost").value = 0;
  $("reqTotal").value = 0;
  $("reqStatus").value = "Pending";
  $("reqExpenseType").value = "Materials";

  fillReqVehicleSelect();

  $("reqModalTitle").textContent = "Add Requisition";

  if (id) editReq(id);
  else openModal("reqModal");
}

function calcReqTotal() {
  const total =
    n($("reqQuantity")?.value) *
    n($("reqUnitCost")?.value);

  if ($("reqTotal")) {
    $("reqTotal").value = total.toFixed(2);
  }
}

async function saveReq(event) {
  event?.preventDefault();

  const id = $("reqId").value.trim();
  const reqNo = $("reqNo").value.trim();

  if (!reqNo) {
    toast("Requisition number is required", "error");
    return;
  }

  const duplicate = requisitions.find(r =>
    norm(r.req_no) === norm(reqNo) &&
    String(r.id) !== String(id)
  );

  if (duplicate) {
    toast("This requisition number already exists", "error");
    return;
  }

  const total =
    n($("reqQuantity").value) *
    n($("reqUnitCost").value);

  /*
    IMPORTANT:
    Database uses expense_type, NOT category.
  */
  const row = {
    req_no: reqNo,
    req_date: $("reqDate").value || today(),
    requested_by: $("reqRequestedBy").value.trim(),
    vehicle_id: $("reqVehicle").value || null,
    item_description: $("reqItemDescription").value.trim(),
    quantity: n($("reqQuantity").value),
    unit_cost: n($("reqUnitCost").value),
    total_amount: total,
    status: $("reqStatus").value || "Pending",
    expense_type:
      $("reqExpenseType")?.value ||
      $("reqCategory")?.value ||
      "Materials",
    notes: $("reqNotes").value.trim()
  };

  if (!row.requested_by || !row.item_description) {
    toast("Requested by and item description are required", "error");
    return;
  }

  const result = id
    ? await supabase.from("requisitions").update(row).eq("id", id)
    : await supabase.from("requisitions").insert(row);

  if (result.error) {
    toast(result.error.message, "error");
    return;
  }

  closeModal("reqModal");
  await loadAllData();
  toast(id ? "Requisition updated" : "Requisition added");
}

function editReq(id) {
  const r = requisitions.find(x => String(x.id) === String(id));
  if (!r) return;

  $("reqId").value = r.id;
  $("reqNo").value = r.req_no || "";
  $("reqDate").value = r.req_date || "";
  $("reqRequestedBy").value = r.requested_by || "";

  fillReqVehicleSelect(r.vehicle_id);

  $("reqItemDescription").value = r.item_description || "";
  $("reqQuantity").value = n(r.quantity);
  $("reqUnitCost").value = n(r.unit_cost);
  $("reqTotal").value = n(r.total_amount).toFixed(2);
  $("reqStatus").value = r.status || "Pending";

  if ($("reqExpenseType")) {
    $("reqExpenseType").value =
      r.expense_type || "Materials";
  }

  if ($("reqCategory")) {
    $("reqCategory").value =
      r.expense_type || "Materials";
  }

  $("reqNotes").value = r.notes || "";

  $("reqModalTitle").textContent = "Edit Requisition";
  openModal("reqModal");
}

async function deleteReq(id) {
  if (!confirm("Delete this requisition?")) return;

  const { error } = await supabase
    .from("requisitions")
    .delete()
    .eq("id", id);

  if (error) {
    toast(error.message, "error");
    return;
  }

  await loadAllData();
  toast("Requisition deleted");
}

function reqText(id) {
  const r = requisitions.find(x => String(x.id) === String(id));
  if (!r) return "";

  const v = findVehicle(r.vehicle_id);

  return [
    "GARAGE OPERATIONS PRO",
    "REQUISITION",
    "",
    `No: ${r.req_no}`,
    `Date: ${r.req_date}`,
    `Requested By: ${r.requested_by}`,
    `Vehicle: ${v?.registration || "-"}`,
    `Item: ${r.item_description}`,
    `Quantity: ${r.quantity}`,
    `Unit Cost: ${money(r.unit_cost)}`,
    `Total: ${money(r.total_amount)}`,
    `Status: ${r.status}`,
    `Expense Type: ${r.expense_type || "-"}`
  ].join("\n");
}

function viewReq(id) {
  const r = requisitions.find(x => String(x.id) === String(id));
  if (!r) return;

  const v = findVehicle(r.vehicle_id);

  $("previewTitle").textContent =
    `Requisition ${r.req_no}`;

  $("previewContent").innerHTML = `
    <h2>Requisition ${esc(r.req_no)}</h2>
    <table>
      <tr><th>Date</th><td>${esc(r.req_date)}</td></tr>
      <tr><th>Requested By</th><td>${esc(r.requested_by)}</td></tr>
      <tr><th>Vehicle</th><td>${esc(v?.registration || "-")}</td></tr>
      <tr><th>Item</th><td>${esc(r.item_description)}</td></tr>
      <tr><th>Quantity</th><td>${n(r.quantity)}</td></tr>
      <tr><th>Unit Cost</th><td>${money(r.unit_cost)}</td></tr>
      <tr><th>Total</th><td>${money(r.total_amount)}</td></tr>
      <tr><th>Status</th><td>${esc(r.status)}</td></tr>
      <tr><th>Expense Type</th><td>${esc(r.expense_type || "-")}</td></tr>
      <tr><th>Notes</th><td>${esc(r.notes || "-")}</td></tr>
    </table>
  `;

  openModal("previewModal");
}

async function shareReq(id) {
  const text = reqText(id);
  if (text) await shareText("Requisition", text);
}

/* =========================================================
   INVOICES
   ========================================================= */

function fillInvoiceVehicleSelect(selected = "") {
  const el = $("invoiceVehicle");
  if (!el) return;

  el.innerHTML = `
    <option value="">Select vehicle</option>
    ${vehicles.map(v => `
      <option value="${esc(v.id)}"
        ${String(v.id) === String(selected) ? "selected" : ""}>
        ${esc(vehicleName(v))}
      </option>
    `).join("")}
  `;
}

function filteredInvoices() {
  const q = ($("invoiceSearch")?.value || "").toLowerCase();
  const status = $("invoiceStatusFilter")?.value || "";

  return invoices.filter(i => {
    const v = findVehicle(i.vehicle_id);

    const text = [
      i.invoice_no,
      i.customer,
      i.job_description,
      i.status,
      v?.registration
    ].join(" ").toLowerCase();

    return (
      (!q || text.includes(q)) &&
      (!status || i.status === status)
    );
  });
}

function renderInvoices() {
  const body = $("invoicesTableBody");
  if (!body) return;

  if (missingTables.invoices && !invoices.length) {
    body.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:25px">
          Invoice table not found. Run the invoices SQL in Supabase.
        </td>
      </tr>
    `;
    return;
  }

  const rows = filteredInvoices();

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:25px">
          No invoices found
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows.map(i => `
    <tr>
      <td>${esc(i.invoice_no)}</td>
      <td>${esc(i.invoice_date)}</td>
      <td>${esc(findVehicle(i.vehicle_id)?.registration || "—")}</td>
      <td>${esc(i.customer || "")}</td>
      <td>${money(i.subtotal)}</td>
      <td>${money(i.paid)}</td>
      <td>${money(i.balance)}</td>
      <td>
        ${standardActions(
          i.id,
          "editInvoice",
          "previewInvoice",
          "shareInvoice",
          "deleteInvoice"
        )}
      </td>
    </tr>
  `).join("");
}

function openInvoiceModal(id = "") {
  $("invoiceForm")?.reset();

  $("invoiceId").value = "";
  $("invoiceDate").value = today();
  $("invoiceLabour").value = 0;
  $("invoiceParts").value = 0;
  $("invoiceOther").value = 0;
  $("invoicePaid").value = 0;
  $("invoiceSubtotal").value = 0;
  $("invoiceBalance").value = 0;
  $("invoiceStatus").value = "Pending";

  fillInvoiceVehicleSelect();

  $("invoiceModalTitle").textContent = "Add Invoice";

  if (id) editInvoice(id);
  else openModal("invoiceModal");
}

function invoiceCalc() {
  const subtotal =
    n($("invoiceLabour")?.value) +
    n($("invoiceParts")?.value) +
    n($("invoiceOther")?.value);

  const paid = n($("invoicePaid")?.value);
  const balance = subtotal - paid;

  if ($("invoiceSubtotal"))
    $("invoiceSubtotal").value = subtotal.toFixed(2);

  if ($("invoiceBalance"))
    $("invoiceBalance").value = balance.toFixed(2);

  if ($("invoiceStatus")) {
    if (subtotal <= 0) {
      $("invoiceStatus").value = "Pending";
    } else if (balance <= 0) {
      $("invoiceStatus").value = "Paid";
    } else if (paid > 0) {
      $("invoiceStatus").value = "Part Paid";
    } else {
      $("invoiceStatus").value = "Pending";
    }
  }
}

async function saveInvoice(event) {
  event?.preventDefault();

  const id = $("invoiceId").value.trim();
  const invoiceNo = $("invoiceNo").value.trim();

  if (!invoiceNo) {
    toast("Invoice number is required", "error");
    return;
  }

  const duplicate = invoices.find(i =>
    norm(i.invoice_no) === norm(invoiceNo) &&
    String(i.id) !== String(id)
  );

  if (duplicate) {
    toast("This invoice number already exists", "error");
    return;
  }

  invoiceCalc();

  const subtotal =
    n($("invoiceLabour").value) +
    n($("invoiceParts").value) +
    n($("invoiceOther").value);

  const paid = n($("invoicePaid").value);

  const row = {
    invoice_no: invoiceNo,
    invoice_date: $("invoiceDate").value || today(),
    vehicle_id: $("invoiceVehicle").value || null,
    customer: $("invoiceCustomer").value.trim(),
    job_description: $("invoiceJobDescription").value.trim(),
    labour: n($("invoiceLabour").value),
    parts: n($("invoiceParts").value),
    other: n($("invoiceOther").value),
    subtotal,
    paid,
    balance: subtotal - paid,
    status: $("invoiceStatus").value || "Pending",
    notes: $("invoiceNotes").value.trim()
  };

  const result = id
    ? await supabase.from("invoices").update(row).eq("id", id)
    : await supabase.from("invoices").insert(row);

  if (result.error) {
    toast(result.error.message, "error");
    return;
  }

  closeModal("invoiceModal");
  await loadAllData();
  toast(id ? "Invoice updated" : "Invoice added");
}

function editInvoice(id) {
  const i = invoices.find(x => String(x.id) === String(id));
  if (!i) return;

  $("invoiceId").value = i.id;
  $("invoiceNo").value = i.invoice_no || "";
  $("invoiceDate").value = i.invoice_date || "";

  fillInvoiceVehicleSelect(i.vehicle_id);

  $("invoiceCustomer").value = i.customer || "";
  $("invoiceJobDescription").value = i.job_description || "";
  $("invoiceLabour").value = n(i.labour);
  $("invoiceParts").value = n(i.parts);
  $("invoiceOther").value = n(i.other);
  $("invoiceSubtotal").value = n(i.subtotal).toFixed(2);
  $("invoicePaid").value = n(i.paid);
  $("invoiceBalance").value = n(i.balance).toFixed(2);
  $("invoiceStatus").value = i.status || "Pending";
  $("invoiceNotes").value = i.notes || "";

  $("invoiceModalTitle").textContent = "Edit Invoice";
  openModal("invoiceModal");
}

async function deleteInvoice(id) {
  if (!confirm("Delete this invoice?")) return;

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id);

  if (error) {
    toast(error.message, "error");
    return;
  }

  await loadAllData();
  toast("Invoice deleted");
}

function invoiceHTML(id) {
  const i = invoices.find(x => String(x.id) === String(id));
  if (!i) return "";

  const v = findVehicle(i.vehicle_id);

  return `
    <div class="print-document">
      <h2>INVOICE</h2>

      <h3>CRYSTAL MOTORS (K) LTD</h3>
      <p>
        P.O. Box 54385 – 00200, Nairobi<br>
        Cell: 0722 707124 | 0723 914 222<br>
        Off Mombasa Road, Along Quarry Road,
        Near Mlolongo Weighbridge
      </p>

      <hr>

      <table>
        <tr><th>Invoice No.</th><td>${esc(i.invoice_no)}</td></tr>
        <tr><th>Date</th><td>${esc(i.invoice_date)}</td></tr>
        <tr><th>Customer</th><td>${esc(i.customer || v?.customer || "-")}</td></tr>
        <tr><th>Vehicle</th><td>${esc(v?.registration || "-")}</td></tr>
        <tr><th>Job</th><td>${esc(i.job_description || "-")}</td></tr>
      </table>

      <br>

      <table>
        <tr><th>Labour</th><td>${money(i.labour)}</td></tr>
        <tr><th>Parts</th><td>${money(i.parts)}</td></tr>
        <tr><th>Other</th><td>${money(i.other)}</td></tr>
        <tr><th>Subtotal</th><td>${money(i.subtotal)}</td></tr>
        <tr><th>Paid</th><td>${money(i.paid)}</td></tr>
        <tr><th>Balance</th><td><strong>${money(i.balance)}</strong></td></tr>
        <tr><th>Status</th><td>${esc(i.status)}</td></tr>
      </table>

      <p>${esc(i.notes || "")}</p>
    </div>
  `;
}

function previewInvoice(id) {
  const i = invoices.find(x => String(x.id) === String(id));
  if (!i) return;

  $("previewTitle").textContent =
    `Invoice ${i.invoice_no}`;

  $("previewContent").innerHTML =
    invoiceHTML(id);

  openModal("previewModal");
}

async function shareInvoice(id) {
  const i = invoices.find(x => String(x.id) === String(id));
  if (!i) return;

  const v = findVehicle(i.vehicle_id);

  const text = [
    "CRYSTAL MOTORS (K) LTD",
    "INVOICE",
    "",
    `Invoice No: ${i.invoice_no}`,
    `Date: ${i.invoice_date}`,
    `Customer: ${i.customer || v?.customer || "-"}`,
    `Vehicle: ${v?.registration || "-"}`,
    `Job: ${i.job_description || "-"}`,
    `Labour: ${money(i.labour)}`,
    `Parts: ${money(i.parts)}`,
    `Other: ${money(i.other)}`,
    `Subtotal: ${money(i.subtotal)}`,
    `Paid: ${money(i.paid)}`,
    `Balance: ${money(i.balance)}`,
    `Status: ${i.status}`
  ].join("\n");

  await shareText(
    `Invoice ${i.invoice_no}`,
    text
  );
}

/* =========================================================
   GATE PASSES
   ========================================================= */

function fillGateVehicleSelect(selected = "") {
  const el = $("gateVehicle");
  if (!el) return;

  el.innerHTML = `
    <option value="">Select vehicle</option>
    ${vehicles.map(v => `
      <option value="${esc(v.id)}"
        ${String(v.id) === String(selected) ? "selected" : ""}>
        ${esc(vehicleName(v))}
      </option>
    `).join("")}
  `;
}

function fillGateInvoiceSelect(selected = "") {
  const el = $("gateInvoice");
  if (!el) return;

  /*
    Current HTML may use an input rather than select.
    If it is a SELECT, populate it.
  */
  if (el.tagName === "SELECT") {
    el.innerHTML = `
      <option value="">No invoice</option>
      ${invoices.map(i => `
        <option value="${esc(i.id)}"
          ${String(i.id) === String(selected) ? "selected" : ""}>
          ${esc(i.invoice_no)}
        </option>
      `).join("")}
    `;
  } else {
    const invoice = invoices.find(i =>
      String(i.id) === String(selected)
    );

    el.value = invoice?.invoice_no || "";
  }
}

function filteredGates() {
  const q = ($("gateSearch")?.value || "").toLowerCase();
  const status = $("gateStatusFilter")?.value || "";

  return gatePasses.filter(g => {
    const v = findVehicle(g.vehicle_id);

    const invoice =
      invoices.find(i =>
        String(i.id) === String(g.invoice_id)
      );

    const text = [
      g.gate_pass_no,
      g.registration,
      g.customer,
      g.released_to,
      g.released_contact,
      g.authorized_by,
      g.status,
      v?.registration,
      invoice?.invoice_no
    ].join(" ").toLowerCase();

    return (
      (!q || text.includes(q)) &&
      (!status || g.status === status)
    );
  });
}

function renderGatePasses() {
  const body = $("gatePassesTableBody");
  if (!body) return;

  if (missingTables.gate_passes && !gatePasses.length) {
    body.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:25px">
          <strong>Gate Pass table not found.</strong><br>
          Run the gate_passes SQL in Supabase.
        </td>
      </tr>
    `;
    return;
  }

  const rows = filteredGates();

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:25px">
          No gate passes found
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows.map(g => {
    const v = findVehicle(g.vehicle_id);
    const invoice = invoices.find(i =>
      String(i.id) === String(g.invoice_id)
    );

    return `
      <tr>
        <td>${esc(g.gate_pass_no)}</td>
        <td>${esc(g.gate_pass_date)}</td>
        <td>${esc(v?.registration || g.registration || "—")}</td>
        <td>${esc(g.customer || v?.customer || "")}</td>
        <td>${esc(g.released_to || "")}</td>
        <td>${esc(invoice?.invoice_no || "—")}</td>
        <td>${esc(g.status || "")}</td>
        <td>
          ${standardActions(
            g.id,
            "editGatePass",
            "previewGatePass",
            "shareGatePass",
            "deleteGatePass"
          )}
        </td>
      </tr>
    `;
  }).join("");
}

function openGatePassModal(id = "") {
  $("gatePassForm")?.reset();

  $("gatePassId").value = "";
  $("gatePassDate").value = today();
  $("gatePaid").value = 0;
  $("gateBalance").value = 0;
  $("gateStatus").value = "Pending";

  fillGateVehicleSelect();
  fillGateInvoiceSelect();

  $("gatePassModalTitle").textContent = "Add Gate Pass";

  if (id) editGatePass(id);
  else openModal("gatePassModal");
}

function fillGateVehicleDetails() {
  const id = $("gateVehicle")?.value;
  const v = findVehicle(id);

  if (!v) return;

  if ($("gateVehicleRegistration"))
    $("gateVehicleRegistration").value = v.registration || "";

  if ($("gateCustomer"))
    $("gateCustomer").value = v.customer || "";

  if ($("gateReleasedTo"))
    $("gateReleasedTo").value = v.released_to || "";

  if ($("gateReleasedContact"))
    $("gateReleasedContact").value =
      v.released_contact || "";

  if ($("gatePaid"))
    $("gatePaid").value = n(v.paid);
}

async function saveGatePass(event) {
  event?.preventDefault();

  const id = $("gatePassId").value.trim();
  const gateNo = $("gatePassNo").value.trim();

  if (!gateNo) {
    toast("Gate Pass number is required", "error");
    return;
  }

  const duplicate = gatePasses.find(g =>
    norm(g.gate_pass_no) === norm(gateNo) &&
    String(g.id) !== String(id)
  );

  if (duplicate) {
    toast("This Gate Pass number already exists", "error");
    return;
  }

  const vehicle = findVehicle($("gateVehicle").value);

  let invoiceId = null;

  if ($("gateInvoice")) {
    if ($("gateInvoice").tagName === "SELECT") {
      invoiceId = $("gateInvoice").value || null;
    } else {
      const value = $("gateInvoice").value.trim();

      const invoice = invoices.find(i =>
        norm(i.invoice_no) === norm(value) ||
        String(i.id) === value
      );

      invoiceId = invoice?.id || null;
    }
  }

  const invoice = invoices.find(i =>
    String(i.id) === String(invoiceId)
  );

  const paid = n($("gatePaid").value);
  const balance = invoice
    ? n(invoice.subtotal) - paid
    : n($("gateBalance").value);

  const row = {
    gate_pass_no: gateNo,
    gate_pass_date: $("gatePassDate").value || today(),
    vehicle_id: $("gateVehicle").value || null,
    registration:
      $("gateVehicleRegistration").value.trim() ||
      vehicle?.registration ||
      "",
    customer:
      $("gateCustomer").value.trim() ||
      vehicle?.customer ||
      "",
    released_to: $("gateReleasedTo").value.trim(),
    released_contact:
      $("gateReleasedContact").value.trim(),
    invoice_id: invoiceId,
    paid,
    balance,
    authorized_by:
      $("gateAuthorizedBy").value.trim(),
    status: $("gateStatus").value || "Pending",
    notes: $("gateNotes").value.trim()
  };

  const result = id
    ? await supabase.from("gate_passes").update(row).eq("id", id)
    : await supabase.from("gate_passes").insert(row);

  if (result.error) {
    toast(result.error.message, "error");
    return;
  }

  closeModal("gatePassModal");
  await loadAllData();
  toast(id ? "Gate Pass updated" : "Gate Pass added");
}

function editGatePass(id) {
  const g = gatePasses.find(x => String(x.id) === String(id));
  if (!g) return;

  $("gatePassId").value = g.id;
  $("gatePassNo").value = g.gate_pass_no || "";
  $("gatePassDate").value = g.gate_pass_date || "";

  fillGateVehicleSelect(g.vehicle_id);

  $("gateVehicleRegistration").value =
    g.registration ||
    findVehicle(g.vehicle_id)?.registration ||
    "";

  $("gateCustomer").value =
    g.customer ||
    findVehicle(g.vehicle_id)?.customer ||
    "";

  $("gateReleasedTo").value = g.released_to || "";
  $("gateReleasedContact").value =
    g.released_contact || "";

  fillGateInvoiceSelect(g.invoice_id);

  /*
    If gateInvoice is an input, show invoice number rather
    than the UUID.
  */
  if ($("gateInvoice")?.tagName !== "SELECT") {
    const inv = invoices.find(i =>
      String(i.id) === String(g.invoice_id)
    );

    $("gateInvoice").value = inv?.invoice_no || "";
  }

  $("gatePaid").value = n(g.paid);
  $("gateBalance").value = n(g.balance);
  $("gateAuthorizedBy").value =
    g.authorized_by || "";
  $("gateStatus").value =
    g.status || "Pending";
  $("gateNotes").value = g.notes || "";

  $("gatePassModalTitle").textContent =
    "Edit Gate Pass";

  openModal("gatePassModal");
}

async function deleteGatePass(id) {
  if (!confirm("Delete this Gate Pass?")) return;

  const { error } = await supabase
    .from("gate_passes")
    .delete()
    .eq("id", id);

  if (error) {
    toast(error.message, "error");
    return;
  }

  await loadAllData();
  toast("Gate Pass deleted");
}

function gateHTML(id) {
  const g = gatePasses.find(x => String(x.id) === String(id));
  if (!g) return "";

  const v = findVehicle(g.vehicle_id);
  const invoice = invoices.find(i =>
    String(i.id) === String(g.invoice_id)
  );

  return `
    <div class="print-document">
      <h2>GATE PASS</h2>

      <h3>CRYSTAL MOTORS (K) LTD</h3>

      <p>
        P.O. Box 54385 – 00200, Nairobi<br>
        Cell: 0722 707124 | 0723 914 222<br>
        Off Mombasa Road, Along Quarry Road,
        Near Mlolongo Weighbridge
      </p>

      <hr>

      <table>
        <tr><th>Gate Pass No.</th><td>${esc(g.gate_pass_no)}</td></tr>
        <tr><th>Date</th><td>${esc(g.gate_pass_date)}</td></tr>
        <tr><th>Registration</th><td>${esc(v?.registration || g.registration || "-")}</td></tr>
        <tr><th>Customer</th><td>${esc(g.customer || v?.customer || "-")}</td></tr>
        <tr><th>Released To</th><td>${esc(g.released_to || "-")}</td></tr>
        <tr><th>Contact</th><td>${esc(g.released_contact || "-")}</td></tr>
        <tr><th>Invoice</th><td>${esc(invoice?.invoice_no || "-")}</td></tr>
        <tr><th>Paid</th><td>${money(g.paid)}</td></tr>
        <tr><th>Balance</th><td>${money(g.balance)}</td></tr>
        <tr><th>Authorized By</th><td>${esc(g.authorized_by || "-")}</td></tr>
        <tr><th>Status</th><td>${esc(g.status || "-")}</td></tr>
      </table>

      <p>${esc(g.notes || "")}</p>
    </div>
  `;
}

function previewGatePass(id) {
  const g = gatePasses.find(x => String(x.id) === String(id));
  if (!g) return;

  $("previewTitle").textContent =
    `Gate Pass ${g.gate_pass_no}`;

  $("previewContent").innerHTML =
    gateHTML(id);

  openModal("previewModal");
}

async function shareGatePass(id) {
  const g = gatePasses.find(x => String(x.id) === String(id));
  if (!g) return;

  const v = findVehicle(g.vehicle_id);
  const invoice = invoices.find(i =>
    String(i.id) === String(g.invoice_id)
  );

  const text = [
    "CRYSTAL MOTORS (K) LTD",
    "GATE PASS",
    "",
    `Gate Pass No: ${g.gate_pass_no}`,
    `Date: ${g.gate_pass_date}`,
    `Registration: ${v?.registration || g.registration || "-"}`,
    `Customer: ${g.customer || v?.customer || "-"}`,
    `Released To: ${g.released_to || "-"}`,
    `Contact: ${g.released_contact || "-"}`,
    `Invoice: ${invoice?.invoice_no || "-"}`,
    `Paid: ${money(g.paid)}`,
    `Balance: ${money(g.balance)}`,
    `Authorized By: ${g.authorized_by || "-"}`,
    `Status: ${g.status || "-"}`
  ].join("\n");

  await shareText(
    `Gate Pass ${g.gate_pass_no}`,
    text
  );
}

/* =========================================================
   ESTIMATES / QUOTATIONS
   ========================================================= */

const COMPANY_DATA = {
  crystal: {
    name: "CRYSTAL MOTORS (K) LTD",
    address:
      "P.O. Box 54385 – 00200, Nairobi\nOff Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge",
    phone: "0722 707124 | 0723 914 222",
    email: ""
  },

  quarry: {
    name: "QUARRY ROUTE MOTORS LTD",
    address:
      "P.O. Box 54385 – 00200, Nairobi\nOff Mombasa Road, Along Quarry Road, Near Mlolongo Weigh Bridge",
    phone: "0722 707124 / 0723 914 222",
    email:
      "info@quarryroutemotors.com | quarryroutemotorsltd@gmail.com"
  }
};

function injectEstimateUI() {
  if ($("estimates")) return;

  /* Sidebar */
  const nav =
    document.querySelector(".sidebar nav") ||
    document.querySelector(".sidebar");

  if (nav) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.section = "estimates";
    button.textContent = "📑 Estimates";
    button.onclick = () => showSection("estimates");
    nav.appendChild(button);
  }

  /* Mobile navigation */
  const mobileNav =
    document.querySelector(".mobile-bottom-nav");

  if (mobileNav) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.section = "estimates";
    button.textContent = "📑";
    button.title = "Estimates";
    button.onclick = () => showSection("estimates");
    mobileNav.appendChild(button);
  }

  /* Dashboard card */
  const dashboardGrid =
    document.querySelector(".dashboard-grid");

  if (dashboardGrid && !$("dashEstimates")) {
    const card = document.createElement("div");
    card.className = "kpi-card";
    card.id = "dashEstimates";
    card.innerHTML = `
      <div class="kpi-icon">📑</div>
      <div>
        <small>Estimates</small>
        <strong>0</strong>
      </div>
    `;
    card.onclick = () => showSection("estimates");
    dashboardGrid.appendChild(card);
  }

  /* Section */
  const main =
    document.querySelector("main.page") ||
    document.querySelector("main") ||
    $("app");

  if (main) {
    const section = document.createElement("section");
    section.id = "estimates";
    section.className = "section";

    section.innerHTML = `
      <div class="section-header">
        <div>
          <h2>Estimates / Quotations</h2>
          <p>Create professional repair estimates.</p>
        </div>

        <div class="section-actions">
          <button type="button" onclick="printEstimates()">🖨️ Print</button>
          <button type="button" onclick="openEstimateModal()">➕ New Estimate</button>
        </div>
      </div>

      <div class="filters">
        <input
          id="estimateSearch"
          type="search"
          placeholder="Search estimate, customer or vehicle..."
        >

        <button
          type="button"
          onclick="renderEstimates()"
        >🔍 Search</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Estimate No.</th>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Customer</th>
              <th>Subtotal</th>
              <th>VAT</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="estimatesTableBody"></tbody>
        </table>
      </div>

      <div id="estimateModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="estimateModalTitle">New Estimate</h2>
            <button type="button" onclick="closeModal('estimateModal')">✕</button>
          </div>

          <form id="estimateForm">
            <input type="hidden" id="estimateId">

            <div class="form-grid">
              <label>
                Company
                <select id="estimateCompany">
                  <option value="crystal">CRYSTAL MOTORS (K) LTD</option>
                  <option value="quarry">QUARRY ROUTE MOTORS LTD</option>
                </select>
              </label>

              <label>
                Estimate No.
                <input id="estimateNo" required>
              </label>

              <label>
                Date
                <input id="estimateDate" type="date" required>
              </label>

              <label>
                Vehicle
                <select id="estimateVehicle"></select>
              </label>

              <label>
                Registration
                <input id="estimateRegistration">
              </label>

              <label>
                Chassis No.
                <input id="estimateChassis">
              </label>

              <label>
                Vehicle Model
                <input id="estimateModel">
              </label>

              <label>
                Vehicle Year
                <input id="estimateYear">
              </label>

              <label>
                Customer
                <input id="estimateCustomer">
              </label>

              <label>
                Customer Phone
                <input id="estimateCustomerPhone">
              </label>

              <label>
                Customer Address
                <input id="estimateCustomerAddress">
              </label>
            </div>

            <div class="estimate-items-wrap">
              <table class="estimate-items-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit Cost</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="estimateItemsBody"></tbody>
              </table>
            </div>

            <button
              type="button"
              onclick="addEstimateItem()"
            >➕ Add Item</button>

            <div class="estimate-totals">
              <p>
                Subtotal:
                <strong id="estimateSubtotal">KSh 0.00</strong>
              </p>

              <p>
                VAT (16%):
                <strong id="estimateVat">KSh 0.00</strong>
              </p>

              <p>
                TOTAL:
                <strong id="estimateTotal">KSh 0.00</strong>
              </p>
            </div>

            <label>
              Notes
              <textarea id="estimateNotes"></textarea>
            </label>

            <div class="form-actions">
              <button type="submit">💾 Save Estimate</button>
              <button
                type="button"
                onclick="closeModal('estimateModal')"
              >Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;

    main.appendChild(section);
  }
}

function fillEstimateVehicleSelect(selected = "") {
  const el = $("estimateVehicle");
  if (!el) return;

  el.innerHTML = `
    <option value="">Select vehicle</option>
    ${vehicles.map(v => `
      <option value="${esc(v.id)}"
        ${String(v.id) === String(selected) ? "selected" : ""}>
        ${esc(vehicleName(v))}
      </option>
    `).join("")}
  `;
}

function estimateItems() {
  const body = $("estimateItemsBody");
  if (!body) return [];

  return [...body.querySelectorAll("tr")].map(row => ({
    description:
      row.querySelector(".estimate-desc")?.value.trim() || "",
    quantity:
      n(row.querySelector(".estimate-qty")?.value),
    unit_cost:
      n(row.querySelector(".estimate-price")?.value)
  }));
}

function renderEstimateItems(items = []) {
  const body = $("estimateItemsBody");
  if (!body) return;

  if (!items.length) {
    items = [{
      description: "",
      quantity: 1,
      unit_cost: 0
    }];
  }

  body.innerHTML = items.map(item => `
    <tr>
      <td>
        <input
          class="estimate-desc"
          value="${esc(item.description || "")}"
          placeholder="Description"
        >
      </td>

      <td>
        <input
          class="estimate-qty"
          type="number"
          min="0"
          step="0.01"
          value="${n(item.quantity) || 1}"
        >
      </td>

      <td>
        <input
          class="estimate-price"
          type="number"
          min="0"
          step="0.01"
          value="${n(item.unit_cost)}"
        >
      </td>

      <td class="estimate-line-total">
        ${money(n(item.quantity) * n(item.unit_cost))}
      </td>

      <td>
        <button
          type="button"
          class="action-btn danger"
          title="Remove item"
          aria-label="Remove item"
          onclick="removeEstimateItem(this)"
        >🗑️</button>
      </td>
    </tr>
  `).join("");

  body.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", calculateEstimate);
  });

  calculateEstimate();
}

function addEstimateItem() {
  const items = estimateItems();

  items.push({
    description: "",
    quantity: 1,
    unit_cost: 0
  });

  renderEstimateItems(items);
}

function removeEstimateItem(button) {
  const row = button.closest("tr");
  row?.remove();

  if (!$("estimateItemsBody")?.children.length) {
    renderEstimateItems([]);
  }

  calculateEstimate();
}

function calculateEstimate() {
  const rows = estimateItems();

  let subtotal = 0;

  $("estimateItemsBody")
    ?.querySelectorAll("tr")
    .forEach(row => {
      const qty = n(row.querySelector(".estimate-qty")?.value);
      const price = n(row.querySelector(".estimate-price")?.value);
      const total = qty * price;

      const cell = row.querySelector(".estimate-line-total");

      if (cell) cell.textContent = money(total);

      subtotal += total;
    });

  const vat = subtotal * 0.16;
  const total = subtotal + vat;

  if ($("estimateSubtotal"))
    $("estimateSubtotal").textContent = money(subtotal);

  if ($("estimateVat"))
    $("estimateVat").textContent = money(vat);

  if ($("estimateTotal"))
    $("estimateTotal").textContent = money(total);

  return { rows, subtotal, vat, total };
}

function fillEstimateFromVehicle(id) {
  const v = findVehicle(id);
  if (!v) return;

  $("estimateRegistration").value =
    v.registration || "";

  $("estimateModel").value =
    v.model || "";

  $("estimateYear").value =
    v.model_year || "";

  $("estimateCustomer").value =
    v.customer || "";
}

function openEstimateModal(id = "", vehicleId = "") {
  $("estimateForm")?.reset();

  $("estimateId").value = "";
  $("estimateDate").value = today();
  $("estimateCompany").value = "crystal";

  fillEstimateVehicleSelect(vehicleId);

  $("estimateNo").value =
    "EST-" + Date.now().toString().slice(-6);

  renderEstimateItems([]);

  $("estimateModalTitle").textContent =
    "New Estimate";

  if (vehicleId) {
    $("estimateVehicle").value = vehicleId;
    fillEstimateFromVehicle(vehicleId);
  }

  if (id) editEstimate(id);
  else openModal("estimateModal");
}

async function saveEstimate(event) {
  event?.preventDefault();

  const id = $("estimateId").value.trim();
  const estimateNo = $("estimateNo").value.trim();

  if (!estimateNo) {
    toast("Estimate number is required", "error");
    return;
  }

  const duplicate = estimates.find(e =>
    norm(e.estimate_no) === norm(estimateNo) &&
    String(e.id) !== String(id)
  );

  if (duplicate) {
    toast("This estimate number already exists", "error");
    return;
  }

  const calc = calculateEstimate();
  const company =
    COMPANY_DATA[$("estimateCompany").value] ||
    COMPANY_DATA.crystal;

  const row = {
    estimate_no: estimateNo,
    estimate_date:
      $("estimateDate").value || today(),
    company_name: company.name,
    company_address: company.address,
    company_phone: company.phone,
    company_email: company.email,
    customer: $("estimateCustomer").value.trim(),
    customer_phone:
      $("estimateCustomerPhone").value.trim(),
    customer_address:
      $("estimateCustomerAddress").value.trim(),
    vehicle_id:
      $("estimateVehicle").value || null,
    registration:
      $("estimateRegistration").value.trim(),
    chassis_no:
      $("estimateChassis").value.trim(),
    vehicle_year:
      $("estimateYear").value.trim(),
    vehicle_model:
      $("estimateModel").value.trim(),
    subtotal: calc.subtotal,
    vat_rate: 16,
    vat_amount: calc.vat,
    total_amount: calc.total,
    notes: $("estimateNotes").value.trim(),
    items: calc.rows
  };

  const result = id
    ? await supabase.from("estimates").update(row).eq("id", id)
    : await supabase.from("estimates").insert(row);

  if (result.error) {
    toast(result.error.message, "error");
    return;
  }

  closeModal("estimateModal");
  await loadAllData();
  toast(id ? "Estimate updated" : "Estimate saved");
}

function filteredEstimates() {
  const q =
    ($("estimateSearch")?.value || "")
      .toLowerCase();

  return estimates.filter(e => {
    const v = findVehicle(e.vehicle_id);

    const text = [
      e.estimate_no,
      e.customer,
      e.registration,
      e.vehicle_model,
      v?.registration
    ].join(" ").toLowerCase();

    return !q || text.includes(q);
  });
}

function renderEstimates() {
  const body = $("estimatesTableBody");
  if (!body) return;

  if (missingTables.estimates && !estimates.length) {
    body.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:25px">
          Estimate table not found. Run the estimates SQL in Supabase.
        </td>
      </tr>
    `;
    return;
  }

  const rows = filteredEstimates();

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:25px">
          No estimates found
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows.map(e => `
    <tr>
      <td>${esc(e.estimate_no)}</td>
      <td>${esc(e.estimate_date)}</td>
      <td>${esc(e.registration || findVehicle(e.vehicle_id)?.registration || "—")}</td>
      <td>${esc(e.customer || "")}</td>
      <td>${money(e.subtotal)}</td>
      <td>${money(e.vat_amount)}</td>
      <td>${money(e.total_amount)}</td>
      <td>
        ${standardActions(
          e.id,
          "editEstimate",
          "previewEstimate",
          "shareEstimate",
          "deleteEstimate"
        )}
      </td>
    </tr>
  `).join("");

  const card = $("dashEstimates");
  if (card) {
    const strong = card.querySelector("strong");
    if (strong) strong.textContent = estimates.length;
  }
}

function editEstimate(id) {
  const e = estimates.find(x => String(x.id) === String(id));
  if (!e) return;

  $("estimateId").value = e.id;
  $("estimateNo").value = e.estimate_no || "";
  $("estimateDate").value =
    e.estimate_date || "";

  $("estimateCompany").value =
    e.company_name === COMPANY_DATA.quarry.name
      ? "quarry"
      : "crystal";

  fillEstimateVehicleSelect(e.vehicle_id);

  $("estimateRegistration").value =
    e.registration || "";

  $("estimateChassis").value =
    e.chassis_no || "";

  $("estimateModel").value =
    e.vehicle_model || "";

  $("estimateYear").value =
    e.vehicle_year || "";

  $("estimateCustomer").value =
    e.customer || "";

  $("estimateCustomerPhone").value =
    e.customer_phone || "";

  $("estimateCustomerAddress").value =
    e.customer_address || "";

  $("estimateNotes").value =
    e.notes || "";

  renderEstimateItems(
    Array.isArray(e.items) ? e.items : []
  );

  $("estimateModalTitle").textContent =
    "Edit Estimate";

  openModal("estimateModal");
}

function estimateHTML(id) {
  const e = estimates.find(x => String(x.id) === String(id));
  if (!e) return "";

  const v = findVehicle(e.vehicle_id);
  const items = Array.isArray(e.items)
    ? e.items
    : [];

  return `
    <div class="print-document">
      <h2>${esc(e.company_name || "GARAGE OPERATIONS")}</h2>

      <p>
        ${esc(e.company_address || "").replace(/\n/g, "<br>")}<br>
        ${esc(e.company_phone || "")}
        ${e.company_email
          ? "<br>" + esc(e.company_email)
          : ""}
      </p>

      <hr>

      <h2>REPAIR ESTIMATE / QUOTATION</h2>

      <table>
        <tr><th>Estimate No.</th><td>${esc(e.estimate_no)}</td></tr>
        <tr><th>Date</th><td>${esc(e.estimate_date)}</td></tr>
        <tr><th>Customer</th><td>${esc(e.customer || v?.customer || "-")}</td></tr>
        <tr><th>Phone</th><td>${esc(e.customer_phone || "-")}</td></tr>
        <tr><th>Vehicle</th><td>${esc(e.registration || v?.registration || "-")}</td></tr>
        <tr><th>Model</th><td>${esc(e.vehicle_model || "-")}</td></tr>
        <tr><th>Year</th><td>${esc(e.vehicle_year || "-")}</td></tr>
        <tr><th>Chassis No.</th><td>${esc(e.chassis_no || "-")}</td></tr>
      </table>

      <br>

      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Cost</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          ${
            items.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${esc(item.description)}</td>
                <td>${n(item.quantity)}</td>
                <td>${money(item.unit_cost)}</td>
                <td>${money(n(item.quantity) * n(item.unit_cost))}</td>
              </tr>
            `).join("")
          }
        </tbody>

        <tfoot>
          <tr>
            <th colspan="4">Subtotal</th>
            <th>${money(e.subtotal)}</th>
          </tr>

          <tr>
            <th colspan="4">VAT 16%</th>
            <th>${money(e.vat_amount)}</th>
          </tr>

          <tr>
            <th colspan="4">TOTAL</th>
            <th>${money(e.total_amount)}</th>
          </tr>
        </tfoot>
      </table>

      <p>
        <strong>Notes:</strong><br>
        ${esc(e.notes || "-")}
      </p>
    </div>
  `;
}

function previewEstimate(id) {
  const e = estimates.find(x => String(x.id) === String(id));
  if (!e) return;

  $("previewTitle").textContent =
    `Estimate ${e.estimate_no}`;

  $("previewContent").innerHTML =
    estimateHTML(id);

  openModal("previewModal");
}

async function shareEstimate(id) {
  const e = estimates.find(x => String(x.id) === String(id));
  if (!e) return;

  const v = findVehicle(e.vehicle_id);
  const items = Array.isArray(e.items)
    ? e.items
    : [];

  const text = [
    e.company_name,
    "REPAIR ESTIMATE / QUOTATION",
    "",
    `Estimate No: ${e.estimate_no}`,
    `Date: ${e.estimate_date}`,
    `Customer: ${e.customer || v?.customer || "-"}`,
    `Vehicle: ${e.registration || v?.registration || "-"}`,
    `Model: ${e.vehicle_model || "-"}`,
    "",
    ...items.map((item, i) =>
      `${i + 1}. ${item.description} | Qty ${item.quantity} | ${money(item.unit_cost)} | ${money(n(item.quantity) * n(item.unit_cost))}`
    ),
    "",
    `Subtotal: ${money(e.subtotal)}`,
    `VAT 16%: ${money(e.vat_amount)}`,
    `TOTAL: ${money(e.total_amount)}`
  ].join("\n");

  await shareText(
    `Estimate ${e.estimate_no}`,
    text
  );
}

async function deleteEstimate(id) {
  if (!confirm("Delete this estimate?")) return;

  const { error } = await supabase
    .from("estimates")
    .delete()
    .eq("id", id);

  if (error) {
    toast(error.message, "error");
    return;
  }

  await loadAllData();
  toast("Estimate deleted");
}

function quoteForVehicle(id) {
  openEstimateModal("", id);
}

/* =========================================================
   SHARE
   ========================================================= */

async function shareText(title, text) {
  if (!text) {
    toast("Nothing to share", "error");
    return;
  }

  try {
    if (navigator.share) {
      await navigator.share({
        title,
        text
      });
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") return;
  }

  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  } catch (error) {
    try {
      window.prompt(
        "Copy this text:",
        text
      );
    } catch {
      toast("Sharing is not available", "error");
    }
  }
}

/* =========================================================
   PRINT ENGINE
   ========================================================= */

function printHTML(title, content) {
  const win = window.open(
    "",
    "_blank",
    "width=900,height=700"
  );

  if (!win) {
    toast("Allow pop-ups to print", "error");
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${esc(title)}</title>

      <meta name="viewport"
        content="width=device-width,initial-scale=1">

      <style>
        body{
          font-family:Arial,sans-serif;
          padding:25px;
          color:#111827;
        }

        h1,h2,h3{
          margin-top:0;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:15px;
        }

        th,td{
          border:1px solid #d1d5db;
          padding:8px;
          text-align:left;
        }

        th{
          background:#f3f4f6;
        }

        hr{
          border:0;
          border-top:1px solid #ddd;
        }

        @media print{
          body{
            padding:10px;
          }
        }
      </style>
    </head>

    <body>
      ${content}
      <script>
        window.onload=function(){
          window.print();
        };
      <\/script>
    </body>
    </html>
  `);

  win.document.close();
}

function printCurrentPreview() {
  const title =
    $("previewTitle")?.textContent ||
    "Garage Report";

  const content =
    $("previewContent")?.innerHTML ||
    "";

  printHTML(title, content);
}

function printVehicles() {
  const rows = filteredVehicles();

  const content = `
    <h2>Vehicle Report</h2>

    <table>
      <thead>
        <tr>
          <th>Registration</th>
          <th>Customer</th>
          <th>Date In</th>
          <th>Job Type</th>
          <th>Status</th>
          <th>Storage Days</th>
          <th>Billed</th>
          <th>Paid</th>
          <th>Outstanding</th>
          <th>Expenses</th>
        </tr>
      </thead>

      <tbody>
        ${rows.map(v => {
          const total = vehicleExpenseRows(v.id)
            .reduce((a, e) => a + n(e.amount), 0);

          return `
            <tr>
              <td>${esc(v.registration)}</td>
              <td>${esc(v.customer)}</td>
              <td>${esc(v.date_in)}</td>
              <td>${esc(v.job_type)}</td>
              <td>${esc(v.status)}</td>
              <td>${storageDays(v)}</td>
              <td>${money(v.billed)}</td>
              <td>${money(v.paid)}</td>
              <td>${money(n(v.billed) - n(v.paid))}</td>
              <td>${money(total)}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;

  printHTML("Vehicles", content);
}

function printExpenses() {
  const rows = filteredExpenses();

  const content = `
    <h2>Expense Report</h2>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Vehicle</th>
          <th>Category</th>
          <th>Description</th>
          <th>Amount</th>
        </tr>
      </thead>

      <tbody>
        ${rows.map(e => `
          <tr>
            <td>${esc(e.expense_date)}</td>
            <td>${esc(findVehicle(e.vehicle_id)?.registration || "Unassigned")}</td>
            <td>${esc(e.category)}</td>
            <td>${esc(e.description)}</td>
            <td>${money(e.amount)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  printHTML("Expenses", content);
}

function printPettyCash() {
  const rows = filteredPetty();

  const content = `
    <h2>Petty Cash Report</h2>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Paid To</th>
          <th>Category</th>
          <th>Description</th>
          <th>Amount</th>
        </tr>
      </thead>

      <tbody>
        ${rows.map(x => `
          <tr>
            <td>${esc(x.cash_date)}</td>
            <td>${esc(x.paid_to)}</td>
            <td>${esc(x.category)}</td>
            <td>${esc(x.description)}</td>
            <td>${money(x.amount)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  printHTML("Petty Cash", content);
}

function printRequisitions() {
  const rows = filteredReqs();

  const content = `
    <h2>Requisition Report</h2>

    <table>
      <thead>
        <tr>
          <th>No.</th>
          <th>Date</th>
          <th>Requested By</th>
          <th>Vehicle</th>
          <th>Item</th>
          <th>Total</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${esc(r.req_no)}</td>
            <td>${esc(r.req_date)}</td>
            <td>${esc(r.requested_by)}</td>
            <td>${esc(findVehicle(r.vehicle_id)?.registration || "-")}</td>
            <td>${esc(r.item_description)}</td>
            <td>${money(r.total_amount)}</td>
            <td>${esc(r.status)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  printHTML("Requisitions", content);
}

function printInvoices() {
  const rows = filteredInvoices();

  const content = `
    <h2>Invoice Report</h2>

    <table>
      <thead>
        <tr>
          <th>Invoice</th>
          <th>Date</th>
          <th>Vehicle</th>
          <th>Customer</th>
          <th>Subtotal</th>
          <th>Paid</th>
          <th>Balance</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>
        ${rows.map(i => `
          <tr>
            <td>${esc(i.invoice_no)}</td>
            <td>${esc(i.invoice_date)}</td>
            <td>${esc(findVehicle(i.vehicle_id)?.registration || "-")}</td>
            <td>${esc(i.customer)}</td>
            <td>${money(i.subtotal)}</td>
            <td>${money(i.paid)}</td>
            <td>${money(i.balance)}</td>
            <td>${esc(i.status)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  printHTML("Invoices", content);
}

function printGatePasses() {
  const rows = filteredGates();

  const content = `
    <h2>Gate Pass Report</h2>

    <table>
      <thead>
        <tr>
          <th>Gate Pass</th>
          <th>Date</th>
          <th>Vehicle</th>
          <th>Customer</th>
          <th>Released To</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>
        ${rows.map(g => {
          const v = findVehicle(g.vehicle_id);

          return `
            <tr>
              <td>${esc(g.gate_pass_no)}</td>
              <td>${esc(g.gate_pass_date)}</td>
              <td>${esc(v?.registration || g.registration || "-")}</td>
              <td>${esc(g.customer || v?.customer || "-")}</td>
              <td>${esc(g.released_to || "-")}</td>
              <td>${esc(g.status || "-")}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;

  printHTML("Gate Passes", content);
}

function printEstimates() {
  const rows = filteredEstimates();

  const content = `
    <h2>Estimates / Quotations</h2>

    <table>
      <thead>
        <tr>
          <th>Estimate</th>
          <th>Date</th>
          <th>Vehicle</th>
          <th>Customer</th>
          <th>Subtotal</th>
          <th>VAT</th>
          <th>Total</th>
        </tr>
      </thead>

      <tbody>
        ${rows.map(e => `
          <tr>
            <td>${esc(e.estimate_no)}</td>
            <td>${esc(e.estimate_date)}</td>
            <td>${esc(e.registration || findVehicle(e.vehicle_id)?.registration || "-")}</td>
            <td>${esc(e.customer || "-")}</td>
            <td>${money(e.subtotal)}</td>
            <td>${money(e.vat_amount)}</td>
            <td>${money(e.total_amount)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  printHTML("Estimates", content);
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function setupDashboardCards() {
  const actions = {
    dashVehicles: () => {
      if ($("vehicleStatusFilter"))
        $("vehicleStatusFilter").value = "";
      showSection("vehicles");
    },

    dashRepair: () => {
      if ($("vehicleStatusFilter"))
        $("vehicleStatusFilter").value = "Under Repair";
      showSection("vehicles");
    },

    dashOutstanding: () => showSection("vehicles"),
    dashReq: () => showSection("requisitions"),
    dashInvoices: () => showSection("invoices"),
    dashGatePasses: () => showSection("gatePasses"),
    dashBilled: () => showSection("vehicles"),
    dashPaid: () => showSection("vehicles"),
    dashExpenses: () => showSection("expenses"),
    dashPetty: () => showSection("pettyCash"),
    dashEstimates: () => showSection("estimates")
  };

  Object.entries(actions).forEach(([id, fn]) => {
    const value = $(id);
    const card = value?.closest(".kpi-card");

    if (card) {
      card.style.cursor = "pointer";
      card.onclick = fn;
    }
  });
}

function renderDashboard() {
  const totalVehicles = vehicles.length;

  const repairs = vehicles.filter(v =>
    v.status === "Under Repair"
  ).length;

  const billed = vehicles.reduce(
    (a, v) => a + n(v.billed),
    0
  );

  const paid = vehicles.reduce(
    (a, v) => a + n(v.paid),
    0
  );

  const outstanding = billed - paid;

  const totalExpenses = expenses.reduce(
    (a, e) => a + n(e.amount),
    0
  );

  const totalPetty = pettyCash.reduce(
    (a, e) => a + n(e.amount),
    0
  );

  const pendingReq = requisitions.filter(
    r => r.status === "Pending"
  ).length;

  const reqTotal = requisitions.reduce(
    (a, r) => a + n(r.total_amount),
    0
  );

  const set = (id, value) => {
    if ($(id)) $(id).textContent = value;
  };

  set("dashVehicles", totalVehicles);
  set("dashRepair", repairs);
  set("dashOutstanding", money(outstanding));
  set("dashReq", pendingReq);
  set("dashInvoices", invoices.length);
  set("dashGatePasses", gatePasses.length);
  set("dashBilled", money(billed));
  set("dashPaid", money(paid));
  set("dashExpenses", money(totalExpenses));
  set("dashPetty", money(totalPetty));

  set("dashReqCount", pendingReq);
  set("dashReqTotal", money(reqTotal));

  const activity = $("dashboardActivity");

  if (activity) {
    const recent = [
      ...vehicles.map(x => ({
        date: x.created_at || x.date_in,
        text: `Vehicle ${x.registration}`
      })),

      ...expenses.map(x => ({
        date: x.created_at || x.expense_date,
        text: `Expense: ${x.description}`
      })),

      ...invoices.map(x => ({
        date: x.created_at || x.invoice_date,
        text: `Invoice ${x.invoice_no}`
      }))
    ]
      .sort((a, b) =>
        String(b.date).localeCompare(String(a.date))
      )
      .slice(0, 8);

    activity.innerHTML = recent.length
      ? recent.map(x => `
          <div class="activity-item">
            <span>${esc(x.text)}</span>
            <small>${esc(x.date || "")}</small>
          </div>
        `).join("")
      : "<p>No recent activity.</p>";
  }

  renderMonthlyExpenses();
  renderVehicleStatus();
}

function renderMonthlyExpenses() {
  const el = $("monthlyExpenseChart");
  if (!el) return;

  const canvas =
    el.tagName === "CANVAS"
      ? el
      : el.querySelector("canvas");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const totals = Array(12).fill(0);

  expenses.forEach(e => {
    if (!e.expense_date) return;

    const month =
      new Date(e.expense_date + "T00:00:00")
        .getMonth();

    totals[month] += n(e.amount);
  });

  const width = canvas.width = 700;
  const height = canvas.height = 260;

  ctx.clearRect(0, 0, width, height);

  const max = Math.max(...totals, 1);

  ctx.strokeStyle = "#94a3b8";
  ctx.beginPath();
  ctx.moveTo(45, 15);
  ctx.lineTo(45, 225);
  ctx.lineTo(680, 225);
  ctx.stroke();

  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  const barWidth = 35;
  const gap = 17;

  totals.forEach((value, i) => {
    const h = (value / max) * 190;
    const x = 60 + i * (barWidth + gap);
    const y = 225 - h;

    ctx.fillStyle = "#2563eb";
    ctx.fillRect(
      x,
      y,
      barWidth,
      h
    );

    ctx.fillStyle = "#334155";
    ctx.font = "11px Arial";
    ctx.fillText(
      months[i],
      x,
      245
    );
  });
}

function renderVehicleStatus() {
  const el = $("vehicleStatusSummary");
  if (!el) return;

  const counts = {};

  vehicles.forEach(v => {
    const status = v.status || "Unknown";
    counts[status] =
      (counts[status] || 0) + 1;
  });

  el.innerHTML = Object.entries(counts).length
    ? Object.entries(counts).map(([status, count]) => `
        <div class="status-summary-item">
          <span>${esc(status)}</span>
          <strong>${count}</strong>
        </div>
      `).join("")
    : "<p>No vehicle data.</p>";
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
  renderEstimates();

  setupDashboardCards();
}

/* =========================================================
   EVENT SETUP
   ========================================================= */

function setupEvents() {

  /* Vehicle search */
  $("vehicleSearch")?.addEventListener(
    "input",
    renderVehicles
  );

  $("vehicleStatusFilter")?.addEventListener(
    "change",
    renderVehicles
  );

  /* Expense search */
  $("expenseSearch")?.addEventListener(
    "input",
    renderExpenses
  );

  $("expenseCategoryFilter")?.addEventListener(
    "change",
    renderExpenses
  );

  /* Petty search */
  $("pettySearch")?.addEventListener(
    "input",
    renderPettyCash
  );

  $("pettyCategoryFilter")?.addEventListener(
    "change",
    renderPettyCash
  );

  /* Requisitions */
  $("reqSearch")?.addEventListener(
    "input",
    renderRequisitions
  );

  $("reqStatusFilter")?.addEventListener(
    "change",
    renderRequisitions
  );

  $("reqQuantity")?.addEventListener(
    "input",
    calcReqTotal
  );

  $("reqUnitCost")?.addEventListener(
    "input",
    calcReqTotal
  );

  /* Invoices */
  $("invoiceSearch")?.addEventListener(
    "input",
    renderInvoices
  );

  $("invoiceStatusFilter")?.addEventListener(
    "change",
    renderInvoices
  );

  [
    "invoiceLabour",
    "invoiceParts",
    "invoiceOther",
    "invoicePaid"
  ].forEach(id => {
    $(id)?.addEventListener(
      "input",
      invoiceCalc
    );
  });

  /* Gate Pass */
  $("gateSearch")?.addEventListener(
    "input",
    renderGatePasses
  );

  $("gateStatusFilter")?.addEventListener(
    "change",
    renderGatePasses
  );

  $("gateVehicle")?.addEventListener(
    "change",
    fillGateVehicleDetails
  );

  /* Forms */
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

  $("invoiceForm")?.addEventListener(
    "submit",
    saveInvoice
  );

  $("gatePassForm")?.addEventListener(
    "submit",
    saveGatePass
  );

  $("estimateForm")?.addEventListener(
    "submit",
    saveEstimate
  );

  /* Estimate */
  $("estimateSearch")?.addEventListener(
    "input",
    renderEstimates
  );

  $("estimateVehicle")?.addEventListener(
    "change",
    function () {
      fillEstimateFromVehicle(this.value);
    }
  );

  /* Close modal when clicking outside */
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) {
        modal.classList.remove("show");
      }
    });
  });

  /* Vehicle storage days */
  $("vehicleDateIn")?.addEventListener(
    "change",
    updateVehicleStorageDays
  );

  $("vehicleDateOut")?.addEventListener(
    "change",
    updateVehicleStorageDays
  );
}

function updateVehicleStorageDays() {
  const fakeVehicle = {
    date_in: $("vehicleDateIn")?.value,
    date_out: $("vehicleDateOut")?.value
  };

  if ($("vehicleStorageDays")) {
    $("vehicleStorageDays").value =
      storageDays(fakeVehicle);
  }
}

/* =========================================================
   GLOBAL FUNCTIONS
   Needed because HTML and row buttons use onclick=""
   ========================================================= */

Object.assign(window, {
  showSection,

  openVehicleModal,
  editVehicle,
  deleteVehicle,
  viewVehicle,
  shareVehicle,

  openExpenseModal,
  editExpense,
  deleteExpense,
  viewExpense,
  shareExpense,

  openPettyModal,
  editPetty,
  deletePetty,
  viewPetty,
  sharePetty,

  openReqModal,
  editReq,
  deleteReq,
  viewReq,
  shareReq,

  openInvoiceModal,
  editInvoice,
  deleteInvoice,
  previewInvoice,
  shareInvoice,

  openGatePassModal,
  editGatePass,
  deleteGatePass,
  previewGatePass,
  shareGatePass,

  openEstimateModal,
  editEstimate,
  deleteEstimate,
  previewEstimate,
  shareEstimate,
  quoteForVehicle,
  addEstimateItem,
  removeEstimateItem,

  viewVehicleExpenses,
  shareVehicleExpenses,

  printVehicles,
  printExpenses,
  printPettyCash,
  printRequisitions,
  printInvoices,
  printGatePasses,
  printEstimates,

  printCurrentPreview,
  printVehicleExpensePreview,

  closeModal
});

/* =========================================================
   START APPLICATION
   ========================================================= */

async function startApp() {
  injectMobileStyles();
  injectEstimateUI();
  setUserDisplay();
  setupEvents();

  showSection("dashboard");

  await loadAllData();
}

/* =========================================================
   START
   ========================================================= */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    startApp
  );
} else {
  startApp();
                         }
