import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================
   SUPABASE
========================= */
const SUPABASE_URL = "https://ptluwoeogfkqavhspdjj.supabase.co";
const SUPABASE_KEY = "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

/* =========================
   DATA
========================= */
let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];
let invoices = [];
let gatePasses = [];
let estimates = [];

let estimateItems = [];
let currentPreview = "";
let currentVehicleReport = "";

/* =========================
   HELPERS
========================= */
const $ = id => document.getElementById(id);

const n = v => {
  const x = parseFloat(v);
  return Number.isFinite(x) ? x : 0;
};

const money = v =>
  "KSh " + n(v).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const today = () => new Date().toISOString().slice(0, 10);

const norm = v =>
  String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const esc = v =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function vehicleName(id) {
  const v = vehicles.find(x => String(x.id) === String(id));
  return v ? v.registration : "General";
}

function findVehicle(id) {
  return vehicles.find(x => String(x.id) === String(id));
}

function statusClass(s) {
  return "status-" + String(s || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function toast(message, error = false) {
  const t = $("toast");
  if (!t) return;
  t.textContent = message;
  t.style.background = error ? "#b42318" : "#07111f";
  t.style.display = "block";
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => t.style.display = "none", 2800);
}

function openModal(id) {
  const x = $(id);
  if (x) x.classList.add("show");
}

function closeModal(id) {
  const x = $(id);
  if (x) x.classList.remove("show");
}

window.closeModal = closeModal;

function listen(id, event, fn) {
  const x = $(id);
  if (x) x.addEventListener(event, fn);
}

/* =========================
   SAFE DATABASE LOAD
========================= */
async function getRows(table) {
  try {
    let r = await db.from(table).select("*").order("created_at", {
      ascending: false
    });

    if (r.error && /created_at/i.test(r.error.message || "")) {
      r = await db.from(table).select("*");
    }

    if (r.error) {
      console.warn(table, r.error.message);
      return [];
    }

    return r.data || [];
  } catch (e) {
    console.warn(table, e);
    return [];
  }
}

async function loadAllData() {
  vehicles = await getRows("vehicles");
  expenses = await getRows("expenses");
  pettyCash = await getRows("petty_cash");
  requisitions = await getRows("requisitions");

  /* Optional tables */
  invoices = await getRows("invoices");
  gatePasses = await getRows("gate_passes");
  estimates = await getRows("estimates");

  renderAll();
}

/* =========================
   NAVIGATION
========================= */
function showSection(id, button) {
  document.querySelectorAll(".app-section").forEach(s => {
    s.classList.remove("active");
    s.style.display = "none";
  });

  const section = $(id);
  if (section) {
    section.classList.add("active");
    section.style.display = "block";
  }

  document.querySelectorAll(".nav-btn,.mobile-nav-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.section === id);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (id === "dashboard") renderDashboard();
  if (id === "vehicles") renderVehicles();
  if (id === "expenses") renderExpenses();
  if (id === "pettyCash") renderPetty();
  if (id === "requisitions") renderRequisitions();
  if (id === "invoices") renderInvoices();
  if (id === "gatePasses") renderGatePasses();
  if (id === "estimates") renderEstimates();
}

window.showSection = showSection;

/* =========================
   LOGIN USER DISPLAY
========================= */
function setUserDisplay() {
  const u = sessionStorage.getItem("garageUser") || "josephine";
  const name = u.charAt(0).toUpperCase() + u.slice(1);

  if ($("sidebarUser")) $("sidebarUser").textContent = name;
  if ($("welcomeUser")) $("welcomeUser").textContent = name.charAt(0);
}

/* =========================
   VEHICLES
========================= */
function storageDays(v) {
  if (!v || !v.date_in) return 0;

  const start = new Date(v.date_in + "T00:00:00");
  const end = v.date_out
    ? new Date(v.date_out + "T00:00:00")
    : new Date();

  const d = Math.ceil((end - start) / 86400000);
  return Math.max(0, d);
}

function updateVehicleStorageDays() {
  const dateIn = $("vehicleDateIn")?.value;
  const dateOut = $("vehicleDateOut")?.value;

  if (!dateIn) {
    if ($("vehicleStorageDays")) $("vehicleStorageDays").value = 0;
    return;
  }

  const a = new Date(dateIn + "T00:00:00");
  const b = dateOut
    ? new Date(dateOut + "T00:00:00")
    : new Date();

  $("vehicleStorageDays").value = Math.max(
    0,
    Math.ceil((b - a) / 86400000)
  );
}

function vehicleFiltered() {
  const q = ($("vehicleSearch")?.value || "").toLowerCase().trim();
  const st = $("vehicleStatusFilter")?.value || "";

  return vehicles.filter(v => {
    const text = [
      v.registration,
      v.customer,
      v.model,
      v.model_year,
      v.color,
      v.description
    ].join(" ").toLowerCase();

    return (!q || text.includes(q)) && (!st || v.status === st);
  });
}

function renderVehicles() {
  const body = $("vehiclesTableBody");
  if (!body) return;

  const rows = vehicleFiltered();

  body.innerHTML = rows.length
    ? rows.map(v => {
        const outstanding = Math.max(0, n(v.billed) - n(v.paid));
        const ex = expenses
          .filter(x => String(x.vehicle_id) === String(v.id))
          .reduce((a, x) => a + n(x.amount), 0);

        return `
        <tr>
          <td><strong>${esc(v.registration)}</strong></td>
          <td>${esc(v.customer)}</td>
          <td>${esc(v.date_in || "")}</td>
          <td>${esc(v.job_type || "")}</td>
          <td>
            <span class="status ${statusClass(v.status)}">
              ${esc(v.status || "")}
            </span>
          </td>
          <td>${storageDays(v)}</td>
          <td>${money(v.billed)}</td>
          <td>${money(v.paid)}</td>
          <td>${money(outstanding)}</td>
          <td>${money(ex)}</td>
          <td>
            <div class="table-actions">
              <button class="action-btn blue"
                onclick="viewVehicleExpenses('${v.id}')">Expenses</button>
              <button class="action-btn"
                onclick="editVehicle('${v.id}')">Edit</button>
              <button class="action-btn"
                onclick="quoteForVehicle('${v.id}')">Quote</button>
              <button class="action-btn danger"
                onclick="deleteVehicle('${v.id}')">Delete</button>
            </div>
          </td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="11" style="text-align:center;padding:30px">
        No vehicles found.
       </td></tr>`;
}

async function saveVehicle(e) {
  e.preventDefault();

  const id = $("vehicleId").value;
  const registration = $("vehicleRegistration").value.trim();

  if (!registration) return;

  const duplicate = vehicles.find(v =>
    norm(v.registration) === norm(registration) &&
    String(v.id) !== String(id)
  );

  if (duplicate) {
    toast("That registration/chassis number already exists.", true);
    return;
  }

  const row = {
    registration,
    customer: $("vehicleCustomer").value.trim(),
    model: $("vehicleModel").value.trim(),
    model_year: $("vehicleModelYear").value || null,
    color: $("vehicleColor").value.trim(),
    date_in: $("vehicleDateIn").value || today(),
    date_out: $("vehicleDateOut").value || null,
    job_type: $("vehicleJobType").value,
    status: $("vehicleStatus").value,
    released_to: $("vehicleReleasedTo").value.trim(),
    released_contact: $("vehicleReleasedContact").value.trim(),
    billed: n($("vehicleBilled").value),
    paid: n($("vehiclePaid").value),
    description: $("vehicleDescription").value.trim()
  };

  try {
    let r;

    if (id) {
      r = await db.from("vehicles").update(row).eq("id", id);
    } else {
      r = await db.from("vehicles").insert(row);
    }

    if (r.error) {
      if (/model|model_year|color/i.test(r.error.message || "")) {
        toast("Run the vehicle SQL below first.", true);
      } else {
        toast(r.error.message, true);
      }
      return;
    }

    closeModal("vehicleModal");
    toast("Vehicle saved");
    await loadAllData();
  } catch (err) {
    toast(err.message, true);
  }
}

function openVehicleModal(id = "") {
  $("vehicleForm")?.reset();
  $("vehicleId").value = id || "";
  $("vehicleModalTitle").textContent = id ? "Edit Vehicle" : "Add Vehicle";

  $("vehicleDateIn").value = today();
  $("vehicleBilled").value = 0;
  $("vehiclePaid").value = 0;
  $("vehicleStorageDays").value = 0;

  if (id) {
    const v = findVehicle(id);
    if (!v) return;

    $("vehicleRegistration").value = v.registration || "";
    $("vehicleCustomer").value = v.customer || "";
    $("vehicleModel").value = v.model || "";
    $("vehicleModelYear").value = v.model_year || "";
    $("vehicleColor").value = v.color || "";
    $("vehicleDateIn").value = v.date_in || today();
    $("vehicleDateOut").value = v.date_out || "";
    $("vehicleJobType").value = v.job_type || "Repair";
    $("vehicleStatus").value = v.status || "Under Repair";
    $("vehicleReleasedTo").value = v.released_to || "";
    $("vehicleReleasedContact").value = v.released_contact || "";
    $("vehicleBilled").value = n(v.billed);
    $("vehiclePaid").value = n(v.paid);
    $("vehicleDescription").value = v.description || "";
    updateVehicleStorageDays();
  }

  openModal("vehicleModal");
}

window.openVehicleModal = openVehicleModal;

function editVehicle(id) {
  openVehicleModal(id);
}

window.editVehicle = editVehicle;

async function deleteVehicle(id) {
  const v = findVehicle(id);
  if (!v) return;

  if (!confirm(`Delete vehicle ${v.registration}? Its linked expenses will also be removed.`)) {
    return;
  }

  const r = await db.from("vehicles").delete().eq("id", id);

  if (r.error) {
    toast(r.error.message, true);
    return;
  }

  toast("Vehicle deleted");
  await loadAllData();
}

window.deleteVehicle = deleteVehicle;

/* =========================
   EXPENSES
========================= */
function fillVehicleSelect(id, selected = "") {
  const el = $(id);
  if (!el) return;

  el.innerHTML =
    `<option value="">General / No Vehicle</option>` +
    vehicles.map(v =>
      `<option value="${v.id}" ${String(v.id) === String(selected) ? "selected" : ""}>
        ${esc(v.registration)} — ${esc(v.customer)}
      </option>`
    ).join("");
}

function filteredExpenses() {
  const q = ($("expenseSearch")?.value || "").trim();
  const cat = $("expenseCategoryFilter")?.value || "";

  /*
    IMPORTANT:
    If the search exactly matches a vehicle registration,
    ONLY expenses belonging to that vehicle are returned.
  */
  if (q) {
    const v = vehicles.find(x => norm(x.registration) === norm(q));

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

  body.innerHTML = rows.length
    ? rows.map(x => `
      <tr>
        <td>${esc(x.expense_date || "")}</td>
        <td><strong>${esc(vehicleName(x.vehicle_id))}</strong></td>
        <td>${esc(x.description)}</td>
        <td>${esc(x.category)}</td>
        <td>${money(x.amount)}</td>
        <td>
          <div class="table-actions">
            <button class="action-btn" onclick="editExpense('${x.id}')">Edit</button>
            <button class="action-btn danger" onclick="deleteExpense('${x.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="6" style="text-align:center;padding:30px">
        No expenses found.
       </td></tr>`;
}

function openExpenseModal(id = "", vehicleId = "") {
  $("expenseForm")?.reset();
  $("expenseId").value = id || "";
  $("expenseModalTitle").textContent = id ? "Edit Expense" : "Add Expense";

  fillVehicleSelect("expenseVehicle", vehicleId);
  $("expenseDate").value = today();

  if (id) {
    const x = expenses.find(a => String(a.id) === String(id));
    if (!x) return;

    $("expenseVehicle").value = x.vehicle_id || "";
    $("expenseDate").value = x.expense_date || today();
    $("expenseCategory").value = x.category || "Parts";
    $("expenseAmount").value = n(x.amount);
    $("expenseDescription").value = x.description || "";
  }

  openModal("expenseModal");
}

window.openExpenseModal = openExpenseModal;

async function saveExpense(e) {
  e.preventDefault();

  const id = $("expenseId").value;

  const row = {
    vehicle_id: $("expenseVehicle").value || null,
    expense_date: $("expenseDate").value || today(),
    category: $("expenseCategory").value,
    amount: n($("expenseAmount").value),
    description: $("expenseDescription").value.trim()
  };

  const r = id
    ? await db.from("expenses").update(row).eq("id", id)
    : await db.from("expenses").insert(row);

  if (r.error) {
    toast(r.error.message, true);
    return;
  }

  closeModal("expenseModal");
  toast("Expense saved");
  await loadAllData();
}

function editExpense(id) {
  openExpenseModal(id);
}

window.editExpense = editExpense;

async function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;

  const r = await db.from("expenses").delete().eq("id", id);

  if (r.error) {
    toast(r.error.message, true);
    return;
  }

  toast("Expense deleted");
  await loadAllData();
}

window.deleteExpense = deleteExpense;

/* =========================
   VEHICLE EXPENSE REPORT
========================= */
function vehicleExpenseRows(id) {
  return expenses.filter(x =>
    String(x.vehicle_id) === String(id)
  );
}

function vehicleExpenseHTML(id) {
  const v = findVehicle(id);
  if (!v) return "<p>Vehicle not found.</p>";

  const rows = vehicleExpenseRows(id);
  const total = rows.reduce((a, x) => a + n(x.amount), 0);

  return `
    <div class="preview-paper">
      <div class="preview-head">
        <h1>VEHICLE EXPENSE REPORT</h1>
        <p><strong>${esc(v.registration)}</strong></p>
        <p>${esc(v.customer)} | ${esc(v.model || "")}</p>
      </div>

      <table class="preview-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows.length
              ? rows.map(x => `
                <tr>
                  <td>${esc(x.expense_date || "")}</td>
                  <td>${esc(x.description)}</td>
                  <td>${esc(x.category)}</td>
                  <td>${money(x.amount)}</td>
                </tr>
              `).join("")
              : `<tr><td colspan="4">No expenses recorded.</td></tr>`
          }
        </tbody>
      </table>

      <div class="preview-total">
        <div>
          <span>Total Expenses</span>
          <strong>${money(total)}</strong>
        </div>
      </div>
    </div>
  `;
}

function viewVehicleExpenses(id) {
  currentVehicleReport = id;
  $("vehicleExpensePreviewContent").innerHTML =
    vehicleExpenseHTML(id);

  openModal("vehicleExpensePreviewModal");
}

window.viewVehicleExpenses = viewVehicleExpenses;

function printVehicleExpensePreview() {
  if (!currentVehicleReport) return;

  printHTML(
    "Vehicle Expense Report",
    vehicleExpenseHTML(currentVehicleReport)
  );
}

window.printVehicleExpensePreview = printVehicleExpensePreview;

async function shareVehicleExpenses(id) {
  const v = findVehicle(id);
  if (!v) return;

  const rows = vehicleExpenseRows(id);
  const total = rows.reduce((a, x) => a + n(x.amount), 0);

  const text = [
    "VEHICLE EXPENSE REPORT",
    `Vehicle: ${v.registration}`,
    `Customer: ${v.customer}`,
    "",
    ...rows.map(x =>
      `${x.expense_date || ""} | ${x.description} | ${x.category} | ${money(x.amount)}`
    ),
    "",
    `TOTAL EXPENSES: ${money(total)}`
  ].join("\n");

  await shareText(
    `Expenses - ${v.registration}`,
    text
  );
}

window.shareVehicleExpenses = shareVehicleExpenses;

/* =========================
   PETTY CASH
========================= */
function filteredPetty() {
  const q = ($("pettySearch")?.value || "").toLowerCase().trim();
  const cat = $("pettyCategoryFilter")?.value || "";

  return pettyCash.filter(x => {
    const text = [
      x.description,
      x.paid_to,
      x.category,
      x.notes
    ].join(" ").toLowerCase();

    return (!q || text.includes(q)) &&
      (!cat || x.category === cat);
  });
}

function renderPetty() {
  const body = $("pettyTableBody");
  if (!body) return;

  const rows = filteredPetty();

  body.innerHTML = rows.length
    ? rows.map(x => `
      <tr>
        <td>${esc(x.cash_date || "")}</td>
        <td>${esc(x.description)}</td>
        <td>${esc(x.paid_to || "")}</td>
        <td>${esc(x.category || "")}</td>
        <td>${money(x.amount)}</td>
        <td>${esc(x.notes || "")}</td>
        <td>
          <div class="table-actions">
            <button class="action-btn" onclick="editPetty('${x.id}')">Edit</button>
            <button class="action-btn danger" onclick="deletePetty('${x.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="7" style="text-align:center;padding:30px">
        No petty cash records found.
       </td></tr>`;
}

function openPettyModal(id = "") {
  $("pettyForm")?.reset();
  $("pettyId").value = id || "";
  $("pettyModalTitle").textContent = id ? "Edit Petty Cash" : "Add Petty Cash";
  $("pettyDate").value = today();

  if (id) {
    const x = pettyCash.find(a => String(a.id) === String(id));
    if (!x) return;

    $("pettyDate").value = x.cash_date || today();
    $("pettyPaidTo").value = x.paid_to || "";
    $("pettyCategory").value = x.category || "Other";
    $("pettyAmount").value = n(x.amount);
    $("pettyDescription").value = x.description || "";
    $("pettyNotes").value = x.notes || "";
  }

  openModal("pettyModal");
}

window.openPettyModal = openPettyModal;

async function savePetty(e) {
  e.preventDefault();

  const id = $("pettyId").value;

  const row = {
    cash_date: $("pettyDate").value || today(),
    paid_to: $("pettyPaidTo").value.trim(),
    category: $("pettyCategory").value,
    amount: n($("pettyAmount").value),
    description: $("pettyDescription").value.trim(),
    notes: $("pettyNotes").value.trim()
  };

  const r = id
    ? await db.from("petty_cash").update(row).eq("id", id)
    : await db.from("petty_cash").insert(row);

  if (r.error) {
    toast(r.error.message, true);
    return;
  }

  closeModal("pettyModal");
  toast("Petty cash saved");
  await loadAllData();
}

function editPetty(id) {
  openPettyModal(id);
}

window.editPetty = editPetty;

async function deletePetty(id) {
  if (!confirm("Delete this petty cash record?")) return;

  const r = await db.from("petty_cash").delete().eq("id", id);

  if (r.error) {
    toast(r.error.message, true);
    return;
  }

  toast("Petty cash deleted");
  await loadAllData();
}

window.deletePetty = deletePetty;

/* =========================
   REQUISITIONS
========================= */
function reqTotalUpdate() {
  const q = n($("reqQuantity")?.value);
  const p = n($("reqUnitCost")?.value);

  if ($("reqTotal")) {
    $("reqTotal").value = (q * p).toFixed(2);
  }
}

function filteredReqs() {
  const q = ($("reqSearch")?.value || "").toLowerCase().trim();
  const st = $("reqStatusFilter")?.value || "";

  return requisitions.filter(x => {
    const text = [
      x.req_no,
      x.requested_by,
      x.item_description,
      vehicleName(x.vehicle_id),
      x.expense_type,
      x.notes
    ].join(" ").toLowerCase();

    return (!q || text.includes(q)) &&
      (!st || x.status === st);
  });
}

function renderRequisitions() {
  const body = $("requisitionsTableBody");
  if (!body) return;

  const rows = filteredReqs();

  const total = rows.reduce((a, x) => a + n(x.total_amount), 0);
  if ($("reqOverallTotal")) $("reqOverallTotal").textContent = money(total);

  body.innerHTML = rows.length
    ? rows.map(x => `
      <tr>
        <td>${esc(x.req_no)}</td>
        <td>${esc(x.req_date || "")}</td>
        <td>${esc(x.requested_by)}</td>
        <td>${esc(vehicleName(x.vehicle_id))}</td>
        <td>${esc(x.item_description)}</td>
        <td>${n(x.quantity)}</td>
        <td>${money(x.unit_cost)}</td>
        <td>${money(x.total_amount)}</td>
        <td>${esc(x.expense_type || "")}</td>
        <td>
          <span class="status ${statusClass(x.status)}">
            ${esc(x.status || "")}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="action-btn" onclick="editReq('${x.id}')">Edit</button>
            <button class="action-btn danger" onclick="deleteReq('${x.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="11" style="text-align:center;padding:30px">
        No requisitions found.
       </td></tr>`;
}

function nextReqNo() {
  const year = new Date().getFullYear();
  let max = 0;

  requisitions.forEach(x => {
    const m = String(x.req_no || "").match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });

  return `REQ-${year}-${String(max + 1).padStart(4, "0")}`;
}

function openReqModal(id = "") {
  $("reqForm")?.reset();
  $("reqId").value = id || "";
  $("reqModalTitle").textContent = id ? "Edit Requisition" : "New Requisition";

  fillVehicleSelect("reqVehicle");
  $("reqDate").value = today();
  $("reqNo").value = nextReqNo();
  $("reqQuantity").value = 1;
  $("reqUnitCost").value = 0;
  $("reqTotal").value = 0;

  if (id) {
    const x = requisitions.find(a => String(a.id) === String(id));
    if (!x) return;

    $("reqNo").value = x.req_no || "";
    $("reqDate").value = x.req_date || today();
    $("reqRequestedBy").value = x.requested_by || "";
    $("reqVehicle").value = x.vehicle_id || "";
    $("reqItemDescription").value = x.item_description || "";
    $("reqQuantity").value = n(x.quantity);
    $("reqUnitCost").value = n(x.unit_cost);
    $("reqTotal").value = n(x.total_amount).toFixed(2);
    $("reqStatus").value = x.status || "Pending";
    $("reqCategory").value = x.expense_type || "";
    $("reqExpenseType").value = x.expense_type || "";
    $("reqNotes").value = x.notes || "";
  }

  openModal("reqModal");
}

window.openReqModal = openReqModal;

async function saveReq(e) {
  e.preventDefault();

  const id = $("reqId").value;
  const qty = n($("reqQuantity").value);
  const unit = n($("reqUnitCost").value);

  const expenseType =
    $("reqExpenseType").value ||
    $("reqCategory").value ||
    "Materials";

  const row = {
    req_no: $("reqNo").value.trim(),
    req_date: $("reqDate").value || today(),
    requested_by: $("reqRequestedBy").value.trim(),
    vehicle_id: $("reqVehicle").value || null,
    item_description: $("reqItemDescription").value.trim(),
    quantity: qty,
    unit_cost: unit,
    total_amount: qty * unit,
    status: $("reqStatus").value,
    notes: $("reqNotes").value.trim(),
    expense_type: expenseType
  };

  const r = id
    ? await db.from("requisitions").update(row).eq("id", id)
    : await db.from("requisitions").insert(row);

  if (r.error) {
    toast(r.error.message, true);
    return;
  }

  closeModal("reqModal");
  toast("Requisition saved");
  await loadAllData();
}

function editReq(id) {
  openReqModal(id);
}

window.editReq = editReq;

async function deleteReq(id) {
  if (!confirm("Delete this requisition?")) return;

  const r = await db.from("requisitions").delete().eq("id", id);

  if (r.error) {
    toast(r.error.message, true);
    return;
  }

  toast("Requisition deleted");
  await loadAllData();
}

window.deleteReq = deleteReq;

/* =========================
   INVOICES
========================= */
function invoiceCalc() {
  const total =
    n($("invoiceLabour")?.value) +
    n($("invoiceParts")?.value) +
    n($("invoiceOther")?.value);

  const paid = n($("invoicePaid")?.value);
  const balance = Math.max(0, total - paid);

  if ($("invoiceSubtotal"))
    $("invoiceSubtotal").value = total.toFixed(2);

  if ($("invoiceBalance"))
    $("invoiceBalance").value = balance.toFixed(2);

  if ($("invoiceStatus")) {
    $("invoiceStatus").value =
      balance <= 0 && total > 0
        ? "Paid"
        : paid > 0
        ? "Part Paid"
        : "Unpaid";
  }
}

function nextInvoiceNo() {
  const year = new Date().getFullYear();
  let max = 0;

  invoices.forEach(x => {
    const m = String(x.invoice_no || "").match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });

  return `INV-${year}-${String(max + 1).padStart(4, "0")}`;
}

function renderInvoices() {
  const body = $("invoicesTableBody");
  if (!body) return;

  const q = ($("invoiceSearch")?.value || "").toLowerCase().trim();
  const st = $("invoiceStatusFilter")?.value || "";

  const rows = invoices.filter(x => {
    const text = [
      x.invoice_no,
      x.customer,
      vehicleName(x.vehicle_id)
    ].join(" ").toLowerCase();

    return (!q || text.includes(q)) &&
      (!st || x.status === st);
  });

  body.innerHTML = rows.length
    ? rows.map(x => `
      <tr>
        <td><strong>${esc(x.invoice_no)}</strong></td>
        <td>${esc(x.invoice_date || "")}</td>
        <td>${esc(vehicleName(x.vehicle_id))}</td>
        <td>${esc(x.customer || "")}</td>
        <td>${money(x.subtotal)}</td>
        <td>${money(x.paid)}</td>
        <td>${money(x.balance)}</td>
        <td>
          <span class="status ${statusClass(x.status)}">
            ${esc(x.status || "")}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="action-btn blue" onclick="previewInvoice('${x.id}')">View</button>
            <button class="action-btn" onclick="editInvoice('${x.id}')">Edit</button>
            <button class="action-btn danger" onclick="deleteInvoice('${x.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="9" style="text-align:center;padding:30px">
        No invoices found. If the database table has not been created,
        run the SQL below.
       </td></tr>`;
}

function openInvoiceModal(id = "") {
  $("invoiceForm")?.reset();
  $("invoiceId").value = id || "";
  $("invoiceModalTitle").textContent = id ? "Edit Invoice" : "New Invoice";

  fillVehicleSelect("invoiceVehicle");
  $("invoiceDate").value = today();
  $("invoiceNo").value = nextInvoiceNo();

  ["invoiceLabour","invoiceParts","invoiceOther","invoicePaid"]
    .forEach(x => $(x).value = 0);

  invoiceCalc();

  if (id) {
    const x = invoices.find(a => String(a.id) === String(id));
    if (!x) return;

    $("invoiceNo").value = x.invoice_no || "";
    $("invoiceDate").value = x.invoice_date || today();
    $("invoiceVehicle").value = x.vehicle_id || "";
    $("invoiceCustomer").value = x.customer || "";
    $("invoiceJobDescription").value = x.job_description || "";
    $("invoiceLabour").value = n(x.labour);
    $("invoiceParts").value = n(x.parts);
    $("invoiceOther").value = n(x.other);
    $("invoiceSubtotal").value = n(x.subtotal);
    $("invoicePaid").value = n(x.paid);
    $("invoiceBalance").value = n(x.balance);
    $("invoiceStatus").value = x.status || "Unpaid";
    $("invoiceNotes").value = x.notes || "";
  }

  openModal("invoiceModal");
}

window.openInvoiceModal = openInvoiceModal;

async function saveInvoice(e) {
  e.preventDefault();

  const subtotal =
    n($("invoiceLabour").value) +
    n($("invoiceParts").value) +
    n($("invoiceOther").value);

  const paid = n($("invoicePaid").value);

  const row = {
    invoice_no: $("invoiceNo").value.trim(),
    invoice_date: $("invoiceDate").value || today(),
    vehicle_id: $("invoiceVehicle").value || null,
    customer: $("invoiceCustomer").value.trim(),
    job_description: $("invoiceJobDescription").value.trim(),
    labour: n($("invoiceLabour").value),
    parts: n($("invoiceParts").value),
    other: n($("invoiceOther").value),
    subtotal,
    paid,
    balance: Math.max(0, subtotal - paid),
    status: $("invoiceStatus").value,
    notes: $("invoiceNotes").value.trim()
  };

  const r = $("invoiceId").value
    ? await db.from("invoices")
        .update(row)
        .eq("id", $("invoiceId").value)
    : await db.from("invoices").insert(row);

  if (r.error) {
    toast(
      /relation .*invoices.*does not exist/i.test(r.error.message)
        ? "Invoices table missing. Run the SQL below."
        : r.error.message,
      true
    );
    return;
  }

  closeModal("invoiceModal");
  toast("Invoice saved");
  await loadAllData();
}

function invoiceHTML(x) {
  return `
    <div class="preview-paper">
      <div class="preview-head">
        <h1>CRYSTAL MOTORS (K) LTD</h1>
        <p>P.O. Box 54385 – 00200, Nairobi</p>
        <p>Cell: 0722 707124 | 0723 914 222</p>
        <p>Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge</p>
        <h2>INVOICE</h2>
      </div>

      <p><strong>Invoice No:</strong> ${esc(x.invoice_no)}</p>
      <p><strong>Date:</strong> ${esc(x.invoice_date)}</p>
      <p><strong>Vehicle:</strong> ${esc(vehicleName(x.vehicle_id))}</p>
      <p><strong>Customer:</strong> ${esc(x.customer)}</p>

      <table class="preview-table">
        <tr><th>Description</th><th>Amount</th></tr>
        <tr><td>Labour</td><td>${money(x.labour)}</td></tr>
        <tr><td>Parts</td><td>${money(x.parts)}</td></tr>
        <tr><td>Other</td><td>${money(x.other)}</td></tr>
      </table>

      <div class="preview-total">
        <div><span>Subtotal</span><strong>${money(x.subtotal)}</strong></div>
        <div><span>Paid</span><strong>${money(x.paid)}</strong></div>
        <div class="grand"><span>Balance</span><strong>${money(x.balance)}</strong></div>
      </div>

      <p>${esc(x.notes || "")}</p>
    </div>
  `;
}

function previewInvoice(id) {
  const x = invoices.find(a => String(a.id) === String(id));
  if (!x) return;

  currentPreview = invoiceHTML(x);
  $("previewTitle").textContent = `Invoice ${x.invoice_no}`;
  $("previewContent").innerHTML = currentPreview;
  openModal("previewModal");
}

window.previewInvoice = previewInvoice;

function editInvoice(id) {
  openInvoiceModal(id);
}

window.editInvoice = editInvoice;

async function deleteInvoice(id) {
  if (!confirm("Delete this invoice?")) return;

  const r = await db.from("invoices").delete().eq("id", id);

  if (r.error) {
    toast(r.error.message, true);
    return;
  }

  toast("Invoice deleted");
  await loadAllData();
}

/* =========================
   GATE PASSES
========================= */
function gateBalanceUpdate() {
  const paid = n($("gatePaid")?.value);
  const invNo = $("gateInvoice")?.value.trim();

  const inv = invoices.find(x =>
    String(x.invoice_no).toLowerCase() === invNo.toLowerCase()
  );

  const balance = inv
    ? Math.max(0, n(inv.subtotal) - paid)
    : 0;

  if ($("gateBalance"))
    $("gateBalance").value = balance.toFixed(2);
}

function nextGateNo() {
  const year = new Date().getFullYear();
  let max = 0;

  gatePasses.forEach(x => {
    const m = String(x.gate_pass_no || "").match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });

  return `GP-${year}-${String(max + 1).padStart(4, "0")}`;
}

function renderGatePasses() {
  const body = $("gatePassesTableBody");
  if (!body) return;

  const q = ($("gateSearch")?.value || "").toLowerCase().trim();
  const st = $("gateStatusFilter")?.value || "";

  const rows = gatePasses.filter(x => {
    const text = [
      x.gate_pass_no,
      x.registration,
      x.customer,
      x.released_to
    ].join(" ").toLowerCase();

    return (!q || text.includes(q)) &&
      (!st || x.status === st);
  });

  body.innerHTML = rows.length
    ? rows.map(x => `
      <tr>
        <td><strong>${esc(x.gate_pass_no)}</strong></td>
        <td>${esc(x.gate_pass_date || "")}</td>
        <td>${esc(x.registration || vehicleName(x.vehicle_id))}</td>
        <td>${esc(x.customer || "")}</td>
        <td>${esc(x.released_to || "")}</td>
        <td>${esc(x.invoice_id || "")}</td>
        <td>${money(x.paid)}</td>
        <td>${money(x.balance)}</td>
        <td>
          <span class="status ${statusClass(x.status)}">
            ${esc(x.status || "")}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="action-btn blue" onclick="previewGate('${x.id}')">View</button>
            <button class="action-btn" onclick="editGatePass('${x.id}')">Edit</button>
            <button class="action-btn danger" onclick="deleteGatePass('${x.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="10" style="text-align:center;padding:30px">
        No gate passes found. Run the Gate Pass SQL below if needed.
       </td></tr>`;
}

function openGatePassModal(id = "") {
  $("gatePassForm")?.reset();
  $("gatePassId").value = id || "";
  $("gatePassModalTitle").textContent = id ? "Edit Gate Pass" : "New Gate Pass";

  fillVehicleSelect("gateVehicle");
  $("gatePassDate").value = today();
  $("gatePassNo").value = nextGateNo();
  $("gateAuthorizedBy").value =
    sessionStorage.getItem("garageUser") || "Josephine";

  if (id) {
    const x = gatePasses.find(a => String(a.id) === String(id));
    if (!x) return;

    $("gatePassNo").value = x.gate_pass_no || "";
    $("gatePassDate").value = x.gate_pass_date || today();
    $("gateVehicle").value = x.vehicle_id || "";
    $("gateVehicleRegistration").value = x.registration || "";
    $("gateCustomer").value = x.customer || "";
    $("gateReleasedTo").value = x.released_to || "";
    $("gateReleasedContact").value = x.released_contact || "";
    $("gateInvoice").value = x.invoice_id || "";
    $("gatePaid").value = n(x.paid);
    $("gateBalance").value = n(x.balance);
    $("gateAuthorizedBy").value = x.authorized_by || "";
    $("gateStatus").value = x.status || "Pending";
    $("gateNotes").value = x.notes || "";
  }

  openModal("gatePassModal");
}

window.openGatePassModal = openGatePassModal;

function fillGateVehicleDetails() {
  const v = findVehicle($("gateVehicle")?.value);

  if (!v) {
    $("gateVehicleRegistration").value = "";
    return;
  }

  $("gateVehicleRegistration").value = v.registration || "";
  $("gateCustomer").value = v.customer || "";
  $("gateReleasedTo").value = v.released_to || "";
  $("gateReleasedContact").value = v.released_contact || "";
}

async function saveGatePass(e) {
  e.preventDefault();

  const v = findVehicle($("gateVehicle").value);

  const row = {
    gate_pass_no: $("gatePassNo").value.trim(),
    gate_pass_date: $("gatePassDate").value || today(),
    vehicle_id: $("gateVehicle").value || null,
    registration: v?.registration || $("gateVehicleRegistration").value,
    customer: $("gateCustomer").value.trim(),
    released_to: $("gateReleasedTo").value.trim(),
    released_contact: $("gateReleasedContact").value.trim(),
    invoice_id: null,
    paid: n($("gatePaid").value),
    balance: n($("gateBalance").value),
    authorized_by: $("gateAuthorizedBy").value.trim(),
    status: $("gateStatus").value,
    notes: $("gateNotes").value.trim()
  };

  /*
    gateInvoice is text in your HTML, while the database invoice_id
    is UUID. Convert the invoice number to the actual invoice UUID.
  */
  const invNo = $("gateInvoice").value.trim();

  if (invNo) {
    const inv = invoices.find(x =>
      String(x.invoice_no).toLowerCase() === invNo.toLowerCase()
    );

    if (inv) row.invoice_id = inv.id;
  }

  const id = $("gatePassId").value;

  const r = id
    ? await db.from("gate_passes").update(row).eq("id", id)
    : await db.from("gate_passes").insert(row);

  if (r.error) {
    toast(
      /relation .*gate_passes.*does not exist/i.test(r.error.message)
        ? "Gate Pass table missing. Run the SQL below."
        : r.error.message,
      true
    );
    return;
  }

  closeModal("gatePassModal");
  toast("Gate pass saved");
  await loadAllData();
}

function previewGate(id) {
  const x = gatePasses.find(a => String(a.id) === String(id));
  if (!x) return;

  currentPreview = `
    <div class="preview-paper">
      <div class="preview-head">
        <h1>CRYSTAL MOTORS (K) LTD</h1>
        <p>P.O. Box 54385 – 00200, Nairobi</p>
        <p>Cell: 0722 707124 | 0723 914 222</p>
        <p>Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge</p>
        <h2>GATE PASS</h2>
      </div>

      <p><strong>Gate Pass:</strong> ${esc(x.gate_pass_no)}</p>
      <p><strong>Date:</strong> ${esc(x.gate_pass_date)}</p>
      <p><strong>Vehicle:</strong> ${esc(x.registration || vehicleName(x.vehicle_id))}</p>
      <p><strong>Customer:</strong> ${esc(x.customer)}</p>
      <p><strong>Released To:</strong> ${esc(x.released_to)}</p>
      <p><strong>Contact:</strong> ${esc(x.released_contact || "")}</p>
      <p><strong>Invoice:</strong> ${esc(x.invoice_id || "")}</p>

      <div class="preview-total">
        <div><span>Paid</span><strong>${money(x.paid)}</strong></div>
        <div class="grand"><span>Balance</span><strong>${money(x.balance)}</strong></div>
      </div>

      <p><strong>Authorized By:</strong> ${esc(x.authorized_by || "")}</p>
      <p>${esc(x.notes || "")}</p>
    </div>
  `;

  $("previewTitle").textContent = `Gate Pass ${x.gate_pass_no}`;
  $("previewContent").innerHTML = currentPreview;
  openModal("previewModal");
}

window.previewGate = previewGate;

function editGatePass(id) {
  openGatePassModal(id);
}

window.editGatePass = editGatePass;

async function deleteGatePass(id) {
  if (!confirm("Delete this gate pass?")) return;

  const r = await db.from("gate_passes").delete().eq("id", id);

  if (r.error) {
    toast(r.error.message, true);
    return;
  }

  toast("Gate pass deleted");
  await loadAllData();
}

/* =========================
   ESTIMATES / QUOTATIONS
========================= */
const COMPANIES = {
  crystal: {
    name: "CRYSTAL MOTORS (K) LTD",
    address: "P.O. Box 54385 – 00200, Nairobi",
    phone: "0722 707124 | 0723 914 222",
    location: "Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge"
  },

  quarry: {
    name: "QUARRY ROUTE MOTORS LTD",
    address: "P.O. Box 54385 – 00200, Nairobi",
    phone: "0722 707124 / 0723 914 222",
    location: "Off Mombasa Road, Along Quarry Road, Near Mlolongo Weigh Bridge",
    email: "info@quarryroutemotors.com | quarryroutemotorsltd@gmail.com"
  }
};

function injectEstimateUI() {
  if ($("estimates")) return;

  /* Desktop navigation */
  const nav = document.querySelector(".sidebar nav");

  if (nav) {
    nav.insertAdjacentHTML(
      "beforeend",
      `<button class="nav-btn" data-section="estimates"
        onclick="showSection('estimates',this)">
        <span class="nav-icon">📑</span>Estimates
      </button>`
    );
  }

  /* Mobile navigation */
  const mobile = document.querySelector(".mobile-bottom-nav");

  if (mobile) {
    mobile.insertAdjacentHTML(
      "beforeend",
      `<button class="mobile-nav-btn" data-section="estimates"
        onclick="showSection('estimates',this)">
        <span>📑</span><span>Quotes</span>
      </button>`
    );

    mobile.style.gridTemplateColumns =
      "repeat(8,1fr)";
  }

  /* Dashboard card */
  const grid = document.querySelector(".dashboard-grid");

  if (grid) {
    grid.insertAdjacentHTML(
      "beforeend",
      `<div class="kpi-card" onclick="showSection('estimates')">
        <div class="kpi-label">Estimates</div>
        <div class="kpi-value" id="dashEstimates">0</div>
        <small>Vehicle quotations</small>
      </div>`
    );
  }

  /* Estimate section */
  const main = document.querySelector("main.page");

  if (!main) return;

  main.insertAdjacentHTML(
    "beforeend",
    `
    <section id="estimates" class="app-section">

      <div class="page-header">
        <div>
          <h2>Estimates & Quotations</h2>
          <p>Create professional vehicle repair quotations with automatic 16% VAT.</p>
        </div>

        <div class="header-actions">
          <button class="btn" onclick="printEstimates()">🖨 Print</button>
          <button class="btn btn-primary" onclick="openEstimateModal()">+ New Estimate</button>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <input id="estimateSearch" type="search"
            placeholder="Search estimate, registration or customer...">
        </div>
      </div>

      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>Estimate No.</th>
              <th>Date</th>
              <th>Company</th>
              <th>Registration</th>
              <th>Customer</th>
              <th>Subtotal</th>
              <th>VAT 16%</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="estimatesTableBody"></tbody>
        </table>
      </div>

    </section>

    <div id="estimateModal" class="modal">
      <div class="modal-content">

        <div class="modal-header">
          <h3>Vehicle Repair Estimate / Quotation</h3>
          <button class="modal-close" type="button"
            onclick="closeModal('estimateModal')">×</button>
        </div>

        <form id="estimateForm">

          <div class="modal-body">

            <input id="estimateId" type="hidden">

            <div class="form-grid">

              <div class="form-group">
                <label>Company</label>
                <select id="estimateCompany">
                  <option value="crystal">CRYSTAL MOTORS (K) LTD</option>
                  <option value="quarry">QUARRY ROUTE MOTORS LTD</option>
                </select>
              </div>

              <div class="form-group">
                <label>Estimate No.</label>
                <input id="estimateNo" required>
              </div>

              <div class="form-group">
                <label>Date</label>
                <input id="estimateDate" type="date" required>
              </div>

              <div class="form-group">
                <label>Customer</label>
                <input id="estimateCustomer" required>
              </div>

              <div class="form-group">
                <label>Customer Phone</label>
                <input id="estimateCustomerPhone" type="tel">
              </div>

              <div class="form-group full">
                <label>Customer Address</label>
                <input id="estimateCustomerAddress">
              </div>

              <div class="form-group">
                <label>Vehicle</label>
                <select id="estimateVehicle"></select>
              </div>

              <div class="form-group">
                <label>Registration</label>
                <input id="estimateRegistration" required>
              </div>

              <div class="form-group">
                <label>Chassis No.</label>
                <input id="estimateChassis">
              </div>

              <div class="form-group">
                <label>Year</label>
                <input id="estimateYear" type="number">
              </div>

              <div class="form-group">
                <label>Model</label>
                <input id="estimateModel">
              </div>

            </div>

            <div style="margin-top:18px">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">
                <strong>Quotation Items</strong>
                <button type="button" class="btn btn-small btn-primary"
                  onclick="addEstimateItem()">+ Add Item</button>
              </div>

              <div class="table-card">
                <table style="min-width:650px">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th style="width:90px">Qty</th>
                      <th style="width:130px">Price</th>
                      <th style="width:130px">Subtotal</th>
                      <th style="width:50px"></th>
                    </tr>
                  </thead>
                  <tbody id="estimateItemsBody"></tbody>
                </table>
              </div>
            </div>

            <div class="preview-total" style="margin-top:18px">
              <div>
                <span>Subtotal</span>
                <strong id="estimateSubtotal">KSh 0.00</strong>
              </div>

              <div>
                <span>VAT (16%)</span>
                <strong id="estimateVat">KSh 0.00</strong>
              </div>

              <div class="grand">
                <span>TOTAL</span>
                <strong id="estimateTotal">KSh 0.00</strong>
              </div>
            </div>

            <div class="form-group full" style="margin-top:18px">
              <label>Notes</label>
              <textarea id="estimateNotes"
                placeholder="Quotation notes, validity, payment terms, etc."></textarea>
            </div>

          </div>

          <div class="modal-footer">
            <button type="button" class="btn"
              onclick="closeModal('estimateModal')">Cancel</button>
            <button type="submit" class="btn btn-primary">
              Save Estimate
            </button>
          </div>

        </form>
      </div>
    </div>
    `
  );
}

function nextEstimateNo() {
  const year = new Date().getFullYear();
  let max = 0;

  estimates.forEach(x => {
    const m = String(x.estimate_no || "").match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });

  return `EST-${year}-${String(max + 1).padStart(4, "0")}`;
}

function estimateTotals() {
  const subtotal = estimateItems.reduce(
    (a, x) => a + n(x.qty) * n(x.price),
    0
  );

  const vat = subtotal * 0.16;
  const total = subtotal + vat;

  return { subtotal, vat, total };
}

function renderEstimateItems() {
  const body = $("estimateItemsBody");
  if (!body) return;

  body.innerHTML = estimateItems.map((x, i) => `
    <tr>
      <td>
        <input
          data-est-field="description"
          data-est-index="${i}"
          value="${esc(x.description)}"
          placeholder="Item / repair description"
          style="width:100%;border:1px solid #d7dce3;border-radius:7px;padding:8px">
      </td>

      <td>
        <input
          data-est-field="qty"
          data-est-index="${i}"
          type="number"
          min="0"
          step="0.01"
          value="${n(x.qty)}"
          style="width:100%;border:1px solid #d7dce3;border-radius:7px;padding:8px">
      </td>

      <td>
        <input
          data-est-field="price"
          data-est-index="${i}"
          type="number"
          min="0"
          step="0.01"
          value="${n(x.price)}"
          style="width:100%;border:1px solid #d7dce3;border-radius:7px;padding:8px">
      </td>

      <td class="money-total">
        ${money(n(x.qty) * n(x.price))}
      </td>

      <td>
        <button type="button"
          class="action-btn danger"
          onclick="removeEstimateItem(${i})">×</button>
      </td>
    </tr>
  `).join("");

  updateEstimateTotals();
}

function addEstimateItem() {
  estimateItems.push({
    description: "",
    qty: 1,
    price: 0
  });

  renderEstimateItems();

  setTimeout(() => {
    const inputs =
      document.querySelectorAll('[data-est-field="description"]');

    const x = inputs[inputs.length - 1];
    if (x) x.focus();
  }, 30);
}

window.addEstimateItem = addEstimateItem;

function removeEstimateItem(i) {
  estimateItems.splice(i, 1);

  if (!estimateItems.length) {
    estimateItems.push({
      description: "",
      qty: 1,
      price: 0
    });
  }

  renderEstimateItems();
}

window.removeEstimateItem = removeEstimateItem;

function updateEstimateTotals() {
  const t = estimateTotals();

  if ($("estimateSubtotal"))
    $("estimateSubtotal").textContent = money(t.subtotal);

  if ($("estimateVat"))
    $("estimateVat").textContent = money(t.vat);

  if ($("estimateTotal"))
    $("estimateTotal").textContent = money(t.total);
}

/*
  Delegated input handler.
  This is deliberately used instead of rerendering the table on every
  keystroke, so the keyboard cursor does NOT jump on Android.
*/
document.addEventListener("input", e => {
  const field = e.target.dataset?.estField;
  const index = e.target.dataset?.estIndex;

  if (field == null || index == null) return;

  const i = Number(index);
  if (!estimateItems[i]) return;

  if (field === "description")
    estimateItems[i].description = e.target.value;

  if (field === "qty")
    estimateItems[i].qty = n(e.target.value);

  if (field === "price")
    estimateItems[i].price = n(e.target.value);

  const row = e.target.closest("tr");
  const totalCell = row?.querySelector(".money-total");

  if (totalCell) {
    totalCell.textContent =
      money(n(estimateItems[i].qty) * n(estimateItems[i].price));
  }

  updateEstimateTotals();
});

function fillEstimateFromVehicle() {
  const v = findVehicle($("estimateVehicle")?.value);
  if (!v) return;

  $("estimateRegistration").value = v.registration || "";
  $("estimateCustomer").value = v.customer || "";
  $("estimateModel").value = v.model || "";
  $("estimateYear").value = v.model_year || "";
}

function openEstimateModal(id = "", vehicleId = "") {
  $("estimateForm")?.reset();

  $("estimateId").value = id || "";
  $("estimateDate").value = today();
  $("estimateNo").value = nextEstimateNo();
  $("estimateCompany").value = "crystal";

  fillVehicleSelect("estimateVehicle", vehicleId);

  estimateItems = [
    {
      description: "",
      qty: 1,
      price: 0
    }
  ];

  if (id) {
    const x = estimates.find(a => String(a.id) === String(id));
    if (!x) return;

    $("estimateCompany").value =
      x.company_name === COMPANIES.quarry.name
        ? "quarry"
        : "crystal";

    $("estimateNo").value = x.estimate_no || "";
    $("estimateDate").value = x.estimate_date || today();
    $("estimateCustomer").value = x.customer || "";
    $("estimateCustomerPhone").value = x.customer_phone || "";
    $("estimateCustomerAddress").value = x.customer_address || "";
    $("estimateVehicle").value = x.vehicle_id || "";
    $("estimateRegistration").value = x.registration || "";
    $("estimateChassis").value = x.chassis_no || "";
    $("estimateYear").value = x.vehicle_year || "";
    $("estimateModel").value = x.vehicle_model || "";
    $("estimateNotes").value = x.notes || "";

    try {
      estimateItems =
        Array.isArray(x.items) && x.items.length
          ? x.items
          : [{ description: "", qty: 1, price: 0 }];
    } catch {
      estimateItems = [{ description: "", qty: 1, price: 0 }];
    }
  }

  renderEstimateItems();
  openModal("estimateModal");
}

window.openEstimateModal = openEstimateModal;

function quoteForVehicle(id) {
  openEstimateModal("", id);
}

window.quoteForVehicle = quoteForVehicle;

async function saveEstimate(e) {
  e.preventDefault();

  const company =
    COMPANIES[$("estimateCompany").value] || COMPANIES.crystal;

  const t = estimateTotals();

  const row = {
    estimate_no: $("estimateNo").value.trim(),
    estimate_date: $("estimateDate").value || today(),

    company_name: company.name,
    company_address: company.address,
    company_phone: company.phone,
    company_email: company.email || "",

    customer: $("estimateCustomer").value.trim(),
    customer_phone: $("estimateCustomerPhone").value.trim(),
    customer_address: $("estimateCustomerAddress").value.trim(),

    vehicle_id: $("estimateVehicle").value || null,
    registration: $("estimateRegistration").value.trim(),
    chassis_no: $("estimateChassis").value.trim(),
    vehicle_year: $("estimateYear").value || "",
    vehicle_model: $("estimateModel").value.trim(),

    subtotal: t.subtotal,
    vat_rate: 16,
    vat_amount: t.vat,
    total_amount: t.total,

    notes: $("estimateNotes").value.trim(),
    items: estimateItems
  };

  const id = $("estimateId").value;

  const r = id
    ? await db.from("estimates").update(row).eq("id", id)
    : await db.from("estimates").insert(row);

  if (r.error) {
    toast(
      /relation .*estimates.*does not exist/i.test(r.error.message)
        ? "Estimates table missing. Run the SQL below."
        : r.error.message,
      true
    );
    return;
  }

  closeModal("estimateModal");
  toast("Estimate saved");
  await loadAllData();
}

function filteredEstimates() {
  const q = ($("estimateSearch")?.value || "").toLowerCase().trim();

  return estimates.filter(x => {
    const text = [
      x.estimate_no,
      x.registration,
      x.customer,
      x.company_name,
      x.vehicle_model
    ].join(" ").toLowerCase();

    return !q || text.includes(q);
  });
}

function renderEstimates() {
  const body = $("estimatesTableBody");
  if (!body) return;

  const rows = filteredEstimates();

  body.innerHTML = rows.length
    ? rows.map(x => `
      <tr>
        <td><strong>${esc(x.estimate_no)}</strong></td>
        <td>${esc(x.estimate_date || "")}</td>
        <td>${esc(x.company_name || "")}</td>
        <td>${esc(x.registration || vehicleName(x.vehicle_id))}</td>
        <td>${esc(x.customer || "")}</td>
        <td>${money(x.subtotal)}</td>
        <td>${money(x.vat_amount)}</td>
        <td><strong>${money(x.total_amount)}</strong></td>
        <td>
          <div class="table-actions">
            <button class="action-btn blue"
              onclick="previewEstimate('${x.id}')">View</button>
            <button class="action-btn"
              onclick="editEstimate('${x.id}')">Edit</button>
            <button class="action-btn"
              onclick="shareEstimate('${x.id}')">Share</button>
            <button class="action-btn danger"
              onclick="deleteEstimate('${x.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="9" style="text-align:center;padding:30px">
        No estimates found.
       </td></tr>`;
}

function estimateHTML(x) {
  const company =
    x.company_name === COMPANIES.quarry.name
      ? COMPANIES.quarry
      : COMPANIES.crystal;

  let items = [];

  try {
    items = Array.isArray(x.items) ? x.items : [];
  } catch {
    items = [];
  }

  return `
    <div class="preview-paper">

      <div class="preview-head">
        <h1>${esc(company.name)}</h1>
        <p>${esc(company.address)}</p>
        <p>${esc(company.phone)}</p>
        <p>${esc(company.location)}</p>
        ${company.email ? `<p>${esc(company.email)}</p>` : ""}
        <h2>REPAIR ESTIMATE / QUOTATION</h2>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <p><strong>Estimate No:</strong> ${esc(x.estimate_no)}</p>
        <p><strong>Date:</strong> ${esc(x.estimate_date)}</p>
        <p><strong>Customer:</strong> ${esc(x.customer)}</p>
        <p><strong>Phone:</strong> ${esc(x.customer_phone || "")}</p>
        <p><strong>Registration:</strong> ${esc(x.registration)}</p>
        <p><strong>Chassis No:</strong> ${esc(x.chassis_no || "")}</p>
        <p><strong>Year:</strong> ${esc(x.vehicle_year || "")}</p>
        <p><strong>Model:</strong> ${esc(x.vehicle_model || "")}</p>
      </div>

      <table class="preview-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Subtotal</th>
          </tr>
        </thead>

        <tbody>
          ${
            items.length
              ? items.map((item, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${esc(item.description || "")}</td>
                  <td>${n(item.qty)}</td>
                  <td>${money(item.price)}</td>
                  <td>${money(n(item.qty) * n(item.price))}</td>
                </tr>
              `).join("")
              : `<tr><td colspan="5">No quotation items.</td></tr>`
          }
        </tbody>
      </table>

      <div class="preview-total">
        <div>
          <span>Subtotal</span>
          <strong>${money(x.subtotal)}</strong>
        </div>

        <div>
          <span>VAT (16%)</span>
          <strong>${money(x.vat_amount)}</strong>
        </div>

        <div class="grand">
          <span>TOTAL</span>
          <strong>${money(x.total_amount)}</strong>
        </div>
      </div>

      ${
        x.notes
          ? `<div style="margin-top:20px">
              <strong>Notes:</strong><br>
              ${esc(x.notes).replace(/\n/g, "<br>")}
             </div>`
          : ""
      }

      <div style="margin-top:35px;font-size:11px;color:#64748b">
        This quotation is subject to confirmation of parts, labour and
        other repair requirements.
      </div>

    </div>
  `;
}

function previewEstimate(id) {
  const x = estimates.find(a => String(a.id) === String(id));
  if (!x) return;

  currentPreview = estimateHTML(x);

  $("previewTitle").textContent =
    `Estimate ${x.estimate_no}`;

  $("previewContent").innerHTML =
    currentPreview;

  openModal("previewModal");
}

window.previewEstimate = previewEstimate;

function editEstimate(id) {
  openEstimateModal(id);
}

window.editEstimate = editEstimate;

async function deleteEstimate(id) {
  if (!confirm("Delete this estimate?")) return;

  const r = await db.from("estimates").delete().eq("id", id);

  if (r.error) {
    toast(r.error.message, true);
    return;
  }

  toast("Estimate deleted");
  await loadAllData();
}

async function shareEstimate(id) {
  const x = estimates.find(a => String(a.id) === String(id));
  if (!x) return;

  let items = [];

  try {
    items = Array.isArray(x.items) ? x.items : [];
  } catch {}

  const text = [
    x.company_name,
    "REPAIR ESTIMATE / QUOTATION",
    "",
    `Estimate No: ${x.estimate_no}`,
    `Date: ${x.estimate_date}`,
    `Customer: ${x.customer || ""}`,
    `Registration: ${x.registration || ""}`,
    `Chassis No: ${x.chassis_no || ""}`,
    `Year: ${x.vehicle_year || ""}`,
    `Model: ${x.vehicle_model || ""}`,
    "",
    ...items.map((a, i) =>
      `${i + 1}. ${a.description} | Qty ${a.qty} | ${money(a.price)} | ${money(n(a.qty) * n(a.price))}`
    ),
    "",
    `Subtotal: ${money(x.subtotal)}`,
    `VAT 16%: ${money(x.vat_amount)}`,
    `TOTAL: ${money(x.total_amount)}`
  ].join("\n");

  await shareText(
    `Estimate ${x.estimate_no}`,
    text
  );
}

window.shareEstimate = shareEstimate;

/* =========================
   SHARE
========================= */
async function shareText(title, text) {
  try {
    if (navigator.share) {
      await navigator.share({
        title,
        text
      });
      return;
    }
  } catch (e) {
    if (e.name === "AbortError") return;
  }

  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  } catch {
    prompt("Copy this text:", text);
  }
}

/* =========================
   PRINT
========================= */
function printHTML(title, html) {
  const w = window.open("", "_blank");

  if (!w) {
    toast("Allow pop-ups to print.", true);
    return;
  }

  w.document.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${esc(title)}</title>
      <style>
        *{box-sizing:border-box}
        body{
          margin:0;
          padding:25px;
          font-family:Arial,sans-serif;
          color:#172033
        }
        .preview-paper{padding:10px}
        .preview-head{
          text-align:center;
          border-bottom:2px solid #07111f;
          padding-bottom:15px;
          margin-bottom:18px
        }
        .preview-head h1{margin:0;font-size:22px}
        .preview-head p{
          margin:4px 0;
          color:#64748b;
          font-size:12px
        }
        .preview-table{
          width:100%;
          border-collapse:collapse;
          margin-top:15px
        }
        .preview-table th,
        .preview-table td{
          border:1px solid #dfe4ea;
          padding:9px;
          text-align:left;
          font-size:12px
        }
        .preview-table th{background:#f8fafc}
        .preview-total{
          margin-top:16px;
          margin-left:auto;
          width:300px;
          display:grid;
          gap:7px
        }
        .preview-total div{
          display:flex;
          justify-content:space-between
        }
        .preview-total .grand{
          font-weight:900;
          border-top:2px solid #07111f;
          padding-top:8px
        }
        @media print{
          body{padding:10mm}
          @page{margin:10mm}
        }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `);

  w.document.close();

  setTimeout(() => {
    w.focus();
    w.print();
  }, 400);
}

function printCurrentPreview() {
  if (!currentPreview) return;
  printHTML("Garage Operations Pro", currentPreview);
}

window.printCurrentPreview = printCurrentPreview;

/* =========================
   GENERAL PRINTS
========================= */
function printVehicles() {
  const rows = vehicleFiltered();

  const html = `
    <div class="preview-paper">
      <div class="preview-head">
        <h1>GARAGE OPERATIONS PRO</h1>
        <p>VEHICLE REPORT</p>
      </div>

      <table class="preview-table">
        <tr>
          <th>Registration</th>
          <th>Customer</th>
          <th>Status</th>
          <th>Storage Days</th>
          <th>Billed</th>
          <th>Paid</th>
          <th>Outstanding</th>
        </tr>

        ${rows.map(v => `
          <tr>
            <td>${esc(v.registration)}</td>
            <td>${esc(v.customer)}</td>
            <td>${esc(v.status)}</td>
            <td>${storageDays(v)}</td>
            <td>${money(v.billed)}</td>
            <td>${money(v.paid)}</td>
            <td>${money(n(v.billed) - n(v.paid))}</td>
          </tr>
        `).join("")}
      </table>
    </div>
  `;

  printHTML("Vehicles", html);
}

window.printVehicles = printVehicles;

function printExpenses() {
  const rows = filteredExpenses();
  const total = rows.reduce((a, x) => a + n(x.amount), 0);

  const html = `
    <div class="preview-paper">
      <div class="preview-head">
        <h1>GARAGE OPERATIONS PRO</h1>
        <p>EXPENSE REPORT</p>
      </div>

      <table class="preview-table">
        <tr>
          <th>Date</th>
          <th>Vehicle</th>
          <th>Description</th>
          <th>Category</th>
          <th>Amount</th>
        </tr>

        ${rows.map(x => `
          <tr>
            <td>${esc(x.expense_date)}</td>
            <td>${esc(vehicleName(x.vehicle_id))}</td>
            <td>${esc(x.description)}</td>
            <td>${esc(x.category)}</td>
            <td>${money(x.amount)}</td>
          </tr>
        `).join("")}
      </table>

      <div class="preview-total">
        <div class="grand">
          <span>TOTAL</span>
          <strong>${money(total)}</strong>
        </div>
      </div>
    </div>
  `;

  printHTML("Expenses", html);
}

window.printExpenses = printExpenses;

function printPettyCash() {
  const rows = filteredPetty();
  const total = rows.reduce((a, x) => a + n(x.amount), 0);

  const html = `
    <div class="preview-paper">
      <div class="preview-head">
        <h1>GARAGE OPERATIONS PRO</h1>
        <p>PETTY CASH REPORT</p>
      </div>

      <table class="preview-table">
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Paid To</th>
          <th>Category</th>
          <th>Amount</th>
        </tr>

        ${rows.map(x => `
          <tr>
            <td>${esc(x.cash_date)}</td>
            <td>${esc(x.description)}</td>
            <td>${esc(x.paid_to || "")}</td>
            <td>${esc(x.category || "")}</td>
            <td>${money(x.amount)}</td>
          </tr>
        `).join("")}
      </table>

      <div class="preview-total">
        <div class="grand">
          <span>TOTAL</span>
          <strong>${money(total)}</strong>
        </div>
      </div>
    </div>
  `;

  printHTML("Petty Cash", html);
}

window.printPettyCash = printPettyCash;

function printRequisitions() {
  const rows = filteredReqs();
  const total = rows.reduce((a, x) => a + n(x.total_amount), 0);

  const html = `
    <div class="preview-paper">
      <div class="preview-head">
        <h1>GARAGE OPERATIONS PRO</h1>
        <p>REQUISITION REPORT</p>
      </div>

      <table class="preview-table">
        <tr>
          <th>Req No.</th>
          <th>Date</th>
          <th>Requester</th>
          <th>Vehicle</th>
          <th>Description</th>
          <th>Total</th>
          <th>Status</th>
        </tr>

        ${rows.map(x => `
          <tr>
            <td>${esc(x.req_no)}</td>
            <td>${esc(x.req_date)}</td>
            <td>${esc(x.requested_by)}</td>
            <td>${esc(vehicleName(x.vehicle_id))}</td>
            <td>${esc(x.item_description)}</td>
            <td>${money(x.total_amount)}</td>
            <td>${esc(x.status)}</td>
          </tr>
        `).join("")}
      </table>

      <div class="preview-total">
        <div class="grand">
          <span>TOTAL</span>
          <strong>${money(total)}</strong>
        </div>
      </div>
    </div>
  `;

  printHTML("Requisitions", html);
}

window.printRequisitions = printRequisitions;

function printInvoices() {
  if (!invoices.length) {
    toast("No invoices available.", true);
    return;
  }

  const html = `
    <div class="preview-paper">
      <div class="preview-head">
        <h1>GARAGE OPERATIONS PRO</h1>
        <p>INVOICE REPORT</p>
      </div>

      <table class="preview-table">
        <tr>
          <th>Invoice</th>
          <th>Date</th>
          <th>Vehicle</th>
          <th>Customer</th>
          <th>Subtotal</th>
          <th>Paid</th>
          <th>Balance</th>
        </tr>

        ${invoices.map(x => `
          <tr>
            <td>${esc(x.invoice_no)}</td>
            <td>${esc(x.invoice_date)}</td>
            <td>${esc(vehicleName(x.vehicle_id))}</td>
            <td>${esc(x.customer)}</td>
            <td>${money(x.subtotal)}</td>
            <td>${money(x.paid)}</td>
            <td>${money(x.balance)}</td>
          </tr>
        `).join("")}
      </table>
    </div>
  `;

  printHTML("Invoices", html);
}

window.printInvoices = printInvoices;

function printGatePasses() {
  if (!gatePasses.length) {
    toast("No gate passes available.", true);
    return;
  }

  const html = `
    <div class="preview-paper">
      <div class="preview-head">
        <h1>GARAGE OPERATIONS PRO</h1>
        <p>GATE PASS REPORT</p>
      </div>

      <table class="preview-table">
        <tr>
          <th>Gate Pass</th>
          <th>Date</th>
          <th>Vehicle</th>
          <th>Customer</th>
          <th>Released To</th>
          <th>Status</th>
        </tr>

        ${gatePasses.map(x => `
          <tr>
            <td>${esc(x.gate_pass_no)}</td>
            <td>${esc(x.gate_pass_date)}</td>
            <td>${esc(x.registration || vehicleName(x.vehicle_id))}</td>
            <td>${esc(x.customer)}</td>
            <td>${esc(x.released_to)}</td>
            <td>${esc(x.status)}</td>
          </tr>
        `).join("")}
      </table>
    </div>
  `;

  printHTML("Gate Passes", html);
}

window.printGatePasses = printGatePasses;

function printEstimates() {
  const rows = filteredEstimates();

  if (!rows.length) {
    toast("No estimates available.", true);
    return;
  }

  const html = `
    <div class="preview-paper">
      <div class="preview-head">
        <h1>GARAGE OPERATIONS PRO</h1>
        <p>ESTIMATE REPORT</p>
      </div>

      <table class="preview-table">
        <tr>
          <th>Estimate</th>
          <th>Date</th>
          <th>Registration</th>
          <th>Customer</th>
          <th>Subtotal</th>
          <th>VAT</th>
          <th>Total</th>
        </tr>

        ${rows.map(x => `
          <tr>
            <td>${esc(x.estimate_no)}</td>
            <td>${esc(x.estimate_date)}</td>
            <td>${esc(x.registration)}</td>
            <td>${esc(x.customer)}</td>
            <td>${money(x.subtotal)}</td>
            <td>${money(x.vat_amount)}</td>
            <td>${money(x.total_amount)}</td>
          </tr>
        `).join("")}
      </table>
    </div>
  `;

  printHTML("Estimates", html);
}

window.printEstimates = printEstimates;

/* =========================
   DASHBOARD
========================= */
function renderDashboard() {
  const totalVehicles = vehicles.length;

  const repair = vehicles.filter(
    v => v.status === "Under Repair"
  ).length;

  const billed = vehicles.reduce(
    (a, v) => a + n(v.billed),
    0
  );

  const paid = vehicles.reduce(
    (a, v) => a + n(v.paid),
    0
  );

  const outstanding = Math.max(0, billed - paid);

  const expenseTotal = expenses.reduce(
    (a, x) => a + n(x.amount),
    0
  );

  const pettyTotal = pettyCash.reduce(
    (a, x) => a + n(x.amount),
    0
  );

  const reqTotal = requisitions.reduce(
    (a, x) => a + n(x.total_amount),
    0
  );

  if ($("dashVehicles"))
    $("dashVehicles").textContent = totalVehicles;

  if ($("dashRepair"))
    $("dashRepair").textContent = repair;

  if ($("dashOutstanding"))
    $("dashOutstanding").textContent = money(outstanding);

  if ($("dashReq"))
    $("dashReq").textContent = requisitions.length;

  if ($("dashInvoices"))
    $("dashInvoices").textContent = invoices.length;

  if ($("dashGatePasses"))
    $("dashGatePasses").textContent = gatePasses.length;

  if ($("dashBilled"))
    $("dashBilled").textContent = money(billed);

  if ($("dashPaid"))
    $("dashPaid").textContent = money(paid);

  if ($("dashExpenses"))
    $("dashExpenses").textContent = money(expenseTotal);

  if ($("dashPetty"))
    $("dashPetty").textContent = money(pettyTotal);

  if ($("dashReqCount"))
    $("dashReqCount").textContent = requisitions.length;

  if ($("dashReqTotal"))
    $("dashReqTotal").textContent = money(reqTotal);

  if ($("dashEstimates"))
    $("dashEstimates").textContent = estimates.length;

  renderStatusSummary();
  renderMonthlyExpenses();
  renderActivity();
}

function renderStatusSummary() {
  const box = $("vehicleStatusSummary");
  if (!box) return;

  const statuses = [
    "Storage",
    "Under Repair",
    "Completed",
    "Released"
  ];

  box.innerHTML = statuses.map(s => {
    const count = vehicles.filter(
      v => v.status === s
    ).length;

    return `
      <div class="status-row">
        <span>
          <span class="status ${statusClass(s)}">${s}</span>
        </span>
        <strong>${count}</strong>
      </div>
    `;
  }).join("");
}

function renderMonthlyExpenses() {
  const box = $("monthlyExpenseChart");
  if (!box) return;

  const months = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);

    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en", { month: "short" }),
      value: 0
    });
  }

  expenses.forEach(x => {
    const key = String(x.expense_date || "").slice(0, 7);
    const m = months.find(a => a.key === key);
    if (m) m.value += n(x.amount);
  });

  const max = Math.max(
    1,
    ...months.map(x => x.value)
  );

  box.innerHTML = months.map(x => `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
      <div style="font-size:9px;color:#64748b;margin-bottom:4px">
        ${money(x.value)}
      </div>
      <div class="chart-bar"
        style="width:100%;height:${Math.max(12, (x.value / max) * 160)}px">
      </div>
      <div style="font-size:10px;color:#64748b;margin-top:5px">
        ${x.label}
      </div>
    </div>
  `).join("");
}

function renderActivity() {
  const box = $("dashboardActivity");
  if (!box) return;

  const all = [
    ...vehicles.map(x => ({
      date: x.created_at || x.date_in,
      icon: "🚘",
      title: `Vehicle ${x.registration}`,
      sub: `${x.status || ""} • ${x.customer || ""}`
    })),

    ...expenses.map(x => ({
      date: x.created_at || x.expense_date,
      icon: "💳",
      title: `Expense ${money(x.amount)}`,
      sub: `${vehicleName(x.vehicle_id)} • ${x.description}`
    })),

    ...requisitions.map(x => ({
      date: x.created_at || x.req_date,
      icon: "📋",
      title: `Requisition ${x.req_no}`,
      sub: `${x.requested_by} • ${money(x.total_amount)}`
    }))
  ];

  all.sort((a, b) =>
    new Date(b.date || 0) - new Date(a.date || 0)
  );

  const rows = all.slice(0, 8);

  box.innerHTML = rows.length
    ? rows.map(x => `
      <div class="activity-item">
        <div class="activity-icon">${x.icon}</div>
        <div class="activity-main">
          <strong>${esc(x.title)}</strong>
          <span>${esc(x.sub)}</span>
        </div>
      </div>
    `).join("")
    : `<div style="color:#64748b">No recent activity.</div>`;
}

/* =========================
   RENDER ALL
========================= */
function renderAll() {
  renderDashboard();
  renderVehicles();
  renderExpenses();
  renderPetty();
  renderRequisitions();
  renderInvoices();
  renderGatePasses();
  renderEstimates();
}

/* =========================
   EVENTS
========================= */
function setupEvents() {
  listen("vehicleForm", "submit", saveVehicle);
  listen("expenseForm", "submit", saveExpense);
  listen("pettyForm", "submit", savePetty);
  listen("reqForm", "submit", saveReq);
  listen("invoiceForm", "submit", saveInvoice);
  listen("gatePassForm", "submit", saveGatePass);
  listen("estimateForm", "submit", saveEstimate);

  listen("vehicleSearch", "input", renderVehicles);
  listen("vehicleStatusFilter", "change", renderVehicles);

  listen("expenseSearch", "input", renderExpenses);
  listen("expenseCategoryFilter", "change", renderExpenses);

  listen("pettySearch", "input", renderPetty);
  listen("pettyCategoryFilter", "change", renderPetty);

  listen("reqSearch", "input", renderRequisitions);
  listen("reqStatusFilter", "change", renderRequisitions);

  listen("invoiceSearch", "input", renderInvoices);
  listen("invoiceStatusFilter", "change", renderInvoices);

  listen("gateSearch", "input", renderGatePasses);
  listen("gateStatusFilter", "change", renderGatePasses);

  listen("estimateSearch", "input", renderEstimates);

  listen("vehicleDateIn", "change", updateVehicleStorageDays);
  listen("vehicleDateOut", "change", updateVehicleStorageDays);

  ["reqQuantity", "reqUnitCost"].forEach(id =>
    listen(id, "input", reqTotalUpdate)
  );

  [
    "invoiceLabour",
    "invoiceParts",
    "invoiceOther",
    "invoicePaid"
  ].forEach(id =>
    listen(id, "input", invoiceCalc)
  );

  listen("gatePaid", "input", gateBalanceUpdate);
  listen("gateInvoice", "input", gateBalanceUpdate);
  listen("gateVehicle", "change", fillGateVehicleDetails);

  listen("estimateVehicle", "change", fillEstimateFromVehicle);

  listen("estimateCompany", "change", updateEstimateTotals);

  /* Close modal when clicking dark background */
  document.querySelectorAll(".modal").forEach(m => {
    m.addEventListener("click", e => {
      if (e.target === m) m.classList.remove("show");
    });
  });
}

/* =========================
   START
========================= */
async function startApp() {
  injectEstimateUI();
  setUserDisplay();
  setupEvents();

  /*
    Make the dashboard visible immediately.
  */
  showSection("dashboard");

  await loadAllData();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp);
} else {
  startApp();
   }
