import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
   Complete app.js
   ========================================================= */

const SUPABASE_URL = "https://ptluwoeogfkqavhspdjj.supabase.co";
const SUPABASE_KEY = "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];
let invoices = [];
let gatePasses = [];
let estimates = [];

let currentVehicleExpenseId = null;
let currentPreviewHTML = "";

const $ = id => document.getElementById(id);
const num = v => Number(v || 0);
const today = () => new Date().toISOString().slice(0, 10);

const money = v =>
  "KSh " + num(v).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const esc = v =>
  String(v ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[m]));

const norm = v =>
  String(v || "").trim().toLowerCase().replace(/\s+/g, " ");

const errorMessage = e => e?.message || "Database error";

function vehicleById(id) {
  return vehicles.find(v => String(v.id) === String(id));
}

function invoiceById(id) {
  return invoices.find(v => String(v.id) === String(id));
}

function gateById(id) {
  return gatePasses.find(v => String(v.id) === String(id));
}

function estimateById(id) {
  return estimates.find(v => String(v.id) === String(id));
}

function toast(message) {
  const t = $("toast");
  if (!t) {
    alert(message);
    return;
  }

  t.textContent = message;
  t.style.display = "block";
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    t.style.display = "none";
  }, 3500);
}

function openModal(id) {
  const x = $(id);
  if (!x) return;
  x.style.display = "flex";
  x.classList.add("show", "active");
}

function closeModal(id) {
  const x = $(id);
  if (!x) return;
  x.style.display = "none";
  x.classList.remove("show", "active");
}

window.openModal = openModal;
window.closeModal = closeModal;

/* =========================================================
   COMPANIES
   ========================================================= */

const COMPANIES = {
  crystal: {
    name: "CRYSTAL MOTORS (K) LTD",
    box: "P.O. Box 54385 – 00200, Nairobi",
    phone: "0722 707124 | 0723 914 222",
    address: "Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge",
    email: ""
  },

  quarry: {
    name: "QUARRY ROUTE MOTORS LTD",
    box: "P.O. Box 54385 – 00200, Nairobi",
    phone: "0722 707124 | 0723 914 222",
    address: "Off Mombasa Road, Along Quarry Road, Near Mlolongo Weigh Bridge",
    email: "info@quarryroutemotors.com | quarryroutemotorsltd@gmail.com"
  },

  other: {
    name: "OTHER",
    box: "",
    phone: "",
    address: "",
    email: ""
  }
};

function company(key) {
  return COMPANIES[key] || COMPANIES.crystal;
}

function companyHTML(c) {
  return `
    <div style="text-align:center">
      <h2 style="margin:0">${esc(c.name)}</h2>
      ${c.box ? `<div>${esc(c.box)}</div>` : ""}
      ${c.phone ? `<div>Cell: ${esc(c.phone)}</div>` : ""}
      ${c.address ? `<div>${esc(c.address)}</div>` : ""}
      ${c.email ? `<div>${esc(c.email)}</div>` : ""}
    </div>
  `;
}

function injectCompanyField(formId, prefix, afterId) {
  const form = $(formId);
  if (!form || $(`${prefix}CompanySelect`)) return;

  const group = document.createElement("div");
  group.className = "form-group";

  group.innerHTML = `
    <label>Company</label>
    <select id="${prefix}CompanySelect">
      <option value="crystal">CRYSTAL MOTORS (K) LTD</option>
      <option value="quarry">QUARRY ROUTE MOTORS LTD</option>
      <option value="other">OTHER</option>
    </select>
  `;

  const target = $(afterId);

  if (target?.parentElement) {
    target.parentElement.after(group);
  } else {
    form.querySelector(".form-grid")?.prepend(group);
  }
}

function setupCompanyFields() {
  injectCompanyField("invoiceForm", "invoice", "invoiceNo");
  injectCompanyField("gatePassForm", "gatePass", "gatePassNo");
}

/* =========================================================
   DATABASE
   ========================================================= */

async function loadTable(table, orderField = "created_at") {
  try {
    let q = supabase.from(table).select("*");

    if (orderField) {
      q = q.order(orderField, { ascending: false });
    }

    const { data, error } = await q;

    if (error) {
      console.error(table, error.message);
      return { data: [], error };
    }

    return { data: data || [], error: null };

  } catch (e) {
    console.error(table, e);
    return { data: [], error: e };
  }
}

async function loadAllData() {
  const results = await Promise.all([
    loadTable("vehicles"),
    loadTable("expenses", "expense_date"),
    loadTable("petty_cash", "cash_date"),
    loadTable("requisitions"),
    loadTable("invoices"),
    loadTable("gate_passes"),
    loadTable("estimates")
  ]);

  vehicles = results[0].data;
  expenses = results[1].data;
  pettyCash = results[2].data;
  requisitions = results[3].data;
  invoices = results[4].data;
  gatePasses = results[5].data;
  estimates = results[6].data;

  renderAll();

  const names = [
    "vehicles",
    "expenses",
    "petty_cash",
    "requisitions",
    "invoices",
    "gate_passes",
    "estimates"
  ];

  const failed = results
    .map((r, i) => r.error ? names[i] : "")
    .filter(Boolean);

  if (failed.length) {
    toast("Tables unavailable: " + failed.join(", "));
  }
}

function renderAll() {
  setupCompanyFields();
  ensureEstimateSection();

  fillVehicleSelect("expenseVehicle");
  fillVehicleSelect("reqVehicle");
  fillVehicleSelect("invoiceVehicle");
  fillVehicleSelect("gateVehicle");
  fillVehicleSelect("estimateVehicle");

  renderVehicles();
  renderExpenses();
  renderPettyCash();
  renderRequisitions();
  renderInvoices();
  renderGatePasses();
  renderEstimates();
  renderDashboard();
}

/* =========================================================
   NAVIGATION
   ========================================================= */

const SECTION_ALIASES = {
  "petty-cash": "pettyCash",
  "gate-passes": "gatePasses",
  "gatepass": "gatePasses",
  "estimates": "estimates"
};

function showSection(sectionId) {
  sectionId = SECTION_ALIASES[sectionId] || sectionId;

  ensureEstimateSection();

  document.querySelectorAll(".app-section").forEach(s => {
    s.classList.remove("active");
    s.style.display = "none";
  });

  const target = $(sectionId);

  if (!target) {
    toast("Section not found: " + sectionId);
    return;
  }

  target.classList.add("active");
  target.style.display = "block";

  document.querySelectorAll(".nav-btn,.mobile-nav-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.section === sectionId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.showSection = showSection;

/* =========================================================
   VEHICLE SELECTS
   ========================================================= */

function fillVehicleSelect(id) {
  const select = $(id);
  if (!select) return;

  const old = select.value;

  select.innerHTML =
    `<option value="">Select Vehicle</option>` +
    vehicles.map(v =>
      `<option value="${esc(v.id)}">
        ${esc(v.registration)} — ${esc(v.customer)}
      </option>`
    ).join("");

  if (old && vehicles.some(v => String(v.id) === String(old))) {
    select.value = old;
  }
}

/* =========================================================
   VEHICLES
   ========================================================= */

function storageDays(v) {
  if (!v?.date_in) return 0;

  const start = new Date(v.date_in + "T00:00:00");
  const end = v.date_out
    ? new Date(v.date_out + "T00:00:00")
    : new Date();

  return Math.max(0, Math.ceil((end - start) / 86400000));
}

function vehicleExpenses(id) {
  return expenses.filter(e =>
    String(e.vehicle_id) === String(id)
  );
}

function vehicleExpenseTotal(id) {
  return vehicleExpenses(id)
    .reduce((s, e) => s + num(e.amount), 0);
}

function renderVehicles() {
  const body = $("vehiclesTableBody");
  if (!body) return;

  const search = norm($("vehicleSearch")?.value);
  const status = $("vehicleStatusFilter")?.value || "";

  const list = vehicles.filter(v => {
    const text = [
      v.registration,
      v.customer,
      v.model,
      v.color,
      v.status,
      v.job_type
    ].map(norm).join(" ");

    return (
      (!search || text.includes(search)) &&
      (!status || v.status === status)
    );
  });

  body.innerHTML = list.map(v => `
    <tr>
      <td><b>${esc(v.registration)}</b></td>
      <td>${esc(v.customer)}</td>
      <td>${esc(v.model || "")}</td>
      <td>${esc(v.job_type || "")}</td>
      <td>${esc(v.status || "")}</td>
      <td>${storageDays(v)}</td>
      <td>${money(vehicleExpenseTotal(v.id))}</td>
      <td>
        <button class="btn" onclick="viewVehicleExpenses('${v.id}')">
          Expenses
        </button>
        <button class="btn" onclick="editVehicle('${v.id}')">
          Edit
        </button>
        <button class="btn btn-danger" onclick="deleteVehicle('${v.id}')">
          Delete
        </button>
      </td>
    </tr>
  `).join("") || `
    <tr><td colspan="8">No vehicles found.</td></tr>
  `;
}

function updateVehicleStorageDays() {
  const dateIn = $("vehicleDateIn")?.value;
  const dateOut = $("vehicleDateOut")?.value;

  if (!dateIn) return;

  const start = new Date(dateIn + "T00:00:00");
  const end = dateOut
    ? new Date(dateOut + "T00:00:00")
    : new Date();

  const days = Math.max(
    0,
    Math.ceil((end - start) / 86400000)
  );

  if ($("vehicleStorageDays")) {
    $("vehicleStorageDays").value = days;
  }
}

window.updateVehicleStorageDays = updateVehicleStorageDays;

function openVehicleModal() {
  $("vehicleForm")?.reset();

  $("vehicleId").value = "";
  $("vehicleDateIn").value = today();
  $("vehicleStorageDays").value = 0;
  $("vehicleJobType").value = "Repair";
  $("vehicleStatus").value = "Under Repair";
  $("vehicleBilled").value = 0;
  $("vehiclePaid").value = 0;

  $("vehicleModalTitle").textContent = "Add Vehicle";

  openModal("vehicleModal");
}

window.openVehicleModal = openVehicleModal;

function editVehicle(id) {
  const v = vehicleById(id);
  if (!v) return;

  $("vehicleId").value = v.id;
  $("vehicleRegistration").value = v.registration || "";
  $("vehicleCustomer").value = v.customer || "";
  $("vehicleModel").value = v.model || "";
  $("vehicleModelYear").value = v.model_year || "";
  $("vehicleColor").value = v.color || "";
  $("vehicleDateIn").value = v.date_in || today();
  $("vehicleDateOut").value = v.date_out || "";
  $("vehicleStorageDays").value = storageDays(v);
  $("vehicleJobType").value = v.job_type || "Repair";
  $("vehicleStatus").value = v.status || "Under Repair";
  $("vehicleReleasedTo").value = v.released_to || "";
  $("vehicleReleasedContact").value = v.released_contact || "";
  $("vehicleBilled").value = v.billed || 0;
  $("vehiclePaid").value = v.paid || 0;
  $("vehicleDescription").value = v.description || "";

  $("vehicleModalTitle").textContent = "Edit Vehicle";

  openModal("vehicleModal");
}

window.editVehicle = editVehicle;

async function saveVehicle(e) {
  e.preventDefault();

  const id = $("vehicleId").value;
  const registration = $("vehicleRegistration").value.trim();
  const customer = $("vehicleCustomer").value.trim();

  if (!registration) {
    toast("Registration / Chassis No. is required");
    return;
  }

  if (!customer) {
    toast("Customer is required");
    return;
  }

  const duplicate = vehicles.find(v =>
    norm(v.registration) === norm(registration) &&
    String(v.id) !== String(id)
  );

  if (duplicate) {
    toast("This vehicle already exists.");
    return;
  }

  const record = {
    registration,
    customer,
    model: $("vehicleModel").value.trim() || null,
    model_year: $("vehicleModelYear").value
      ? Number($("vehicleModelYear").value)
      : null,
    color: $("vehicleColor").value.trim() || null,
    date_in: $("vehicleDateIn").value || today(),
    date_out: $("vehicleDateOut").value || null,
    job_type: $("vehicleJobType").value || "Repair",
    status: $("vehicleStatus").value || "Under Repair",
    released_to: $("vehicleReleasedTo").value.trim() || null,
    released_contact:
      $("vehicleReleasedContact").value.trim() || null,
    billed: num($("vehicleBilled").value),
    paid: num($("vehiclePaid").value),
    description:
      $("vehicleDescription").value.trim() || null
  };

  let result;

  if (id) {
    result = await supabase
      .from("vehicles")
      .update(record)
      .eq("id", id)
      .select();
  } else {
    result = await supabase
      .from("vehicles")
      .insert(record)
      .select();
  }

  if (result.error) {
    toast("Vehicle save failed: " + errorMessage(result.error));
    console.error(result.error);
    return;
  }

  closeModal("vehicleModal");

  toast(
    id
      ? "Vehicle updated successfully"
      : "Vehicle added successfully"
  );

  await loadAllData();
}

async function deleteVehicle(id) {
  const v = vehicleById(id);
  if (!v) return;

  if (!confirm(`Delete vehicle ${v.registration}?`)) return;

  const result = await supabase
    .from("vehicles")
    .delete()
    .eq("id", id);

  if (result.error) {
    toast("Vehicle delete failed: " + errorMessage(result.error));
    return;
  }

  toast("Vehicle deleted");
  await loadAllData();
}

window.deleteVehicle = deleteVehicle;

/* =========================================================
   EXPENSES
   ========================================================= */

function renderExpenses() {
  const body = $("expensesTableBody");
  if (!body) return;

  const search = norm($("expenseSearch")?.value);
  const category = $("expenseCategoryFilter")?.value || "";

  let list = expenses;

  if (search) {
    const exactVehicle = vehicles.find(
      v => norm(v.registration) === search
    );

    if (exactVehicle) {
      list = expenses.filter(e =>
        String(e.vehicle_id) === String(exactVehicle.id)
      );
    } else {
      list = expenses.filter(e => {
        const v = vehicleById(e.vehicle_id);
        return (
          norm(v?.registration).includes(search) ||
          norm(e.description).includes(search)
        );
      });
    }
  }

  if (category) {
    list = list.filter(e => e.category === category);
  }

  body.innerHTML = list.map(e => {
    const v = vehicleById(e.vehicle_id);

    return `
      <tr>
        <td>${esc(e.expense_date)}</td>
        <td>${esc(v?.registration || "")}</td>
        <td>${esc(e.category || "")}</td>
        <td>${esc(e.description || "")}</td>
        <td>${money(e.amount)}</td>
        <td>
          <button class="btn" onclick="editExpense('${e.id}')">Edit</button>
          <button class="btn btn-danger"
            onclick="deleteExpense('${e.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join("") || `
    <tr><td colspan="6">No expenses found.</td></tr>
  `;
}

function openExpenseModal() {
  $("expenseForm")?.reset();
  $("expenseId").value = "";
  $("expenseDate").value = today();
  $("expenseAmount").value = 0;

  fillVehicleSelect("expenseVehicle");

  openModal("expenseModal");
}

window.openExpenseModal = openExpenseModal;

function editExpense(id) {
  const e = expenses.find(x => String(x.id) === String(id));
  if (!e) return;

  $("expenseId").value = e.id;
  $("expenseVehicle").value = e.vehicle_id || "";
  $("expenseDate").value = e.expense_date || today();
  $("expenseCategory").value = e.category || "Parts";
  $("expenseAmount").value = e.amount || 0;
  $("expenseDescription").value = e.description || "";

  openModal("expenseModal");
}

window.editExpense = editExpense;

async function saveExpense(e) {
  e.preventDefault();

  const record = {
    vehicle_id: $("expenseVehicle").value || null,
    expense_date: $("expenseDate").value || today(),
    category: $("expenseCategory").value || "Parts",
    amount: num($("expenseAmount").value),
    description: $("expenseDescription").value.trim()
  };

  if (!record.description) {
    toast("Expense description is required");
    return;
  }

  const id = $("expenseId").value;

  const result = id
    ? await supabase.from("expenses").update(record).eq("id", id)
    : await supabase.from("expenses").insert(record);

  if (result.error) {
    toast("Expense error: " + errorMessage(result.error));
    return;
  }

  closeModal("expenseModal");
  toast("Expense saved");
  await loadAllData();
}

async function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;

  const result = await supabase
    .from("expenses")
    .delete()
    .eq("id", id);

  if (result.error) {
    toast(errorMessage(result.error));
    return;
  }

  await loadAllData();
}

window.deleteExpense = deleteExpense;

/* =========================================================
   VEHICLE EXPENSE REPORT
   ========================================================= */

function vehicleExpenseHTML(id) {
  const v = vehicleById(id);
  if (!v) return "<p>Vehicle not found.</p>";

  const list = vehicleExpenses(id);
  const total = list.reduce((s, e) => s + num(e.amount), 0);

  return `
    <div>
      <h2>Vehicle Expense Report</h2>
      <h3>${esc(v.registration)}</h3>
      <p><b>Customer:</b> ${esc(v.customer || "")}</p>

      <table style="width:100%;border-collapse:collapse">
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
            list.map(e => `
              <tr>
                <td>${esc(e.expense_date)}</td>
                <td>${esc(e.category)}</td>
                <td>${esc(e.description)}</td>
                <td>${money(e.amount)}</td>
              </tr>
            `).join("")
            ||
            `<tr><td colspan="4">No expenses found.</td></tr>`
          }
        </tbody>
      </table>

      <h3>Total: ${money(total)}</h3>
    </div>
  `;
}

function viewVehicleExpenses(id) {
  const v = vehicleById(id);
  if (!v) return;

  currentVehicleExpenseId = id;
  window.currentVehicleExpenseId = id;

  const content = $("vehicleExpensePreviewContent");

  if (content) {
    content.innerHTML = vehicleExpenseHTML(id);
  }

  openModal("vehicleExpensePreviewModal");
}

window.viewVehicleExpenses = viewVehicleExpenses;

function printVehicleExpensePreview() {
  if (!currentVehicleExpenseId) return;

  printHTML(
    vehicleExpenseHTML(currentVehicleExpenseId),
    "Vehicle Expense Report"
  );
}

window.printVehicleExpensePreview = printVehicleExpensePreview;
window.printVehicleExpenses = printVehicleExpensePreview;

async function shareVehicle() {
  if (!currentVehicleExpenseId) {
    toast("Select a vehicle expense report first");
    return;
  }

  const v = vehicleById(currentVehicleExpenseId);
  const list = vehicleExpenses(currentVehicleExpenseId);
  const total = list.reduce((s, e) => s + num(e.amount), 0);

  const text =
`VEHICLE EXPENSE REPORT

Vehicle: ${v?.registration || ""}
Customer: ${v?.customer || ""}

${list.map(e =>
`${e.expense_date} | ${e.category} | ${e.description} | ${money(e.amount)}`
).join("\n")}

TOTAL: ${money(total)}`;

  await shareText(text);
}

window.shareVehicle = shareVehicle;

/* =========================================================
   PETTY CASH
   ========================================================= */

function renderPettyCash() {
  const body = $("pettyCashTableBody");
  if (!body) return;

  body.innerHTML = pettyCash.map(p => `
    <tr>
      <td>${esc(p.cash_date)}</td>
      <td>${esc(p.paid_to || "")}</td>
      <td>${esc(p.category || "")}</td>
      <td>${esc(p.description || "")}</td>
      <td>${money(p.amount)}</td>
      <td>
        <button class="btn" onclick="editPettyCash('${p.id}')">Edit</button>
        <button class="btn btn-danger"
          onclick="deletePettyCash('${p.id}')">Delete</button>
      </td>
    </tr>
  `).join("") || `
    <tr><td colspan="6">No petty cash records.</td></tr>
  `;
}

function openPettyCashModal() {
  $("pettyForm")?.reset();
  $("pettyId").value = "";
  $("pettyDate").value = today();
  $("pettyAmount").value = 0;
  openModal("pettyModal");
}

window.openPettyCashModal = openPettyCashModal;

function editPettyCash(id) {
  const p = pettyCash.find(x => String(x.id) === String(id));
  if (!p) return;

  $("pettyId").value = p.id;
  $("pettyDate").value = p.cash_date || today();
  $("pettyPaidTo").value = p.paid_to || "";
  $("pettyCategory").value = p.category || "";
  $("pettyAmount").value = p.amount || 0;
  $("pettyDescription").value = p.description || "";
  $("pettyNotes").value = p.notes || "";

  openModal("pettyModal");
}

window.editPettyCash = editPettyCash;
window.editPetty = editPettyCash;

async function savePettyCash(e) {
  e.preventDefault();

  const record = {
    cash_date: $("pettyDate").value || today(),
    description: $("pettyDescription").value.trim(),
    paid_to: $("pettyPaidTo").value.trim() || null,
    category: $("pettyCategory").value || null,
    amount: num($("pettyAmount").value),
    notes: $("pettyNotes").value.trim() || null
  };

  const id = $("pettyId").value;

  const result = id
    ? await supabase.from("petty_cash").update(record).eq("id", id)
    : await supabase.from("petty_cash").insert(record);

  if (result.error) {
    toast(errorMessage(result.error));
    return;
  }

  closeModal("pettyModal");
  await loadAllData();
}

async function deletePettyCash(id) {
  if (!confirm("Delete this petty cash record?")) return;

  const result = await supabase
    .from("petty_cash")
    .delete()
    .eq("id", id);

  if (result.error) {
    toast(errorMessage(result.error));
    return;
  }

  await loadAllData();
}

window.deletePettyCash = deletePettyCash;
window.deletePetty = deletePettyCash;

/* =========================================================
   REQUISITIONS
   ========================================================= */

function renderRequisitions() {
  const body = $("requisitionsTableBody");
  if (!body) return;

  body.innerHTML = requisitions.map(r => `
    <tr>
      <td>${esc(r.req_no)}</td>
      <td>${esc(r.req_date)}</td>
      <td>${esc(r.requested_by)}</td>
      <td>${esc(vehicleById(r.vehicle_id)?.registration || "")}</td>
      <td>${esc(r.item_description)}</td>
      <td>${money(r.total_amount)}</td>
      <td>${esc(r.status)}</td>
      <td>
        <button class="btn" onclick="editRequisition('${r.id}')">
          Edit
        </button>
        <button class="btn btn-danger"
          onclick="deleteRequisition('${r.id}')">
          Delete
        </button>
      </td>
    </tr>
  `).join("") || `
    <tr><td colspan="8">No requisitions.</td></tr>
  `;
}

function calculateReqTotal() {
  const total =
    num($("reqQuantity")?.value) *
    num($("reqUnitCost")?.value);

  if ($("reqTotal")) {
    $("reqTotal").value = total;
  }
}

function openRequisitionModal() {
  $("reqForm")?.reset();
  $("reqId").value = "";
  $("reqDate").value = today();
  $("reqQuantity").value = 1;
  $("reqUnitCost").value = 0;
  calculateReqTotal();
  fillVehicleSelect("reqVehicle");
  openModal("reqModal");
}

window.openRequisitionModal = openRequisitionModal;
window.openReqModal = openRequisitionModal;

function editRequisition(id) {
  const r = requisitions.find(x => String(x.id) === String(id));
  if (!r) return;

  $("reqId").value = r.id;
  $("reqNo").value = r.req_no || "";
  $("reqDate").value = r.req_date || today();
  $("reqRequestedBy").value = r.requested_by || "";
  $("reqVehicle").value = r.vehicle_id || "";
  $("reqItemDescription").value = r.item_description || "";
  $("reqQuantity").value = r.quantity || 1;
  $("reqUnitCost").value = r.unit_cost || 0;
  $("reqTotal").value = r.total_amount || 0;
  $("reqStatus").value = r.status || "Pending";
  $("reqCategory").value = r.category || "";
  $("reqExpenseType").value = r.expense_type || "Materials";
  $("reqNotes").value = r.notes || "";

  openModal("reqModal");
}

window.editRequisition = editRequisition;
window.editReq = editRequisition;

async function saveRequisition(e) {
  e.preventDefault();

  const record = {
    req_no: $("reqNo").value.trim(),
    req_date: $("reqDate").value || today(),
    requested_by: $("reqRequestedBy").value.trim(),
    vehicle_id: $("reqVehicle").value || null,
    item_description: $("reqItemDescription").value.trim(),
    quantity: num($("reqQuantity").value),
    unit_cost: num($("reqUnitCost").value),
    total_amount: num($("reqTotal").value),
    status: $("reqStatus").value || "Pending",
    category: $("reqCategory").value || null,
    expense_type: $("reqExpenseType").value || "Materials",
    notes: $("reqNotes").value.trim() || null
  };

  const id = $("reqId").value;

  const result = id
    ? await supabase.from("requisitions").update(record).eq("id", id)
    : await supabase.from("requisitions").insert(record);

  if (result.error) {
    toast("Requisition: " + errorMessage(result.error));
    return;
  }

  closeModal("reqModal");
  await loadAllData();
}

async function deleteRequisition(id) {
  if (!confirm("Delete this requisition?")) return;

  const result = await supabase
    .from("requisitions")
    .delete()
    .eq("id", id);

  if (result.error) {
    toast(errorMessage(result.error));
    return;
  }

  await loadAllData();
}

window.deleteRequisition = deleteRequisition;
window.deleteReq = deleteRequisition;

/* =========================================================
   INVOICES
   ========================================================= */

function invoiceTotal() {
  const total =
    num($("invoiceLabour")?.value) +
    num($("invoiceParts")?.value) +
    num($("invoiceOther")?.value);

  if ($("invoiceSubtotal")) {
    $("invoiceSubtotal").value = total;
  }

  if ($("invoiceBalance")) {
    $("invoiceBalance").value =
      Math.max(0, total - num($("invoicePaid")?.value));
  }
}

function renderInvoices() {
  const body = $("invoicesTableBody");
  if (!body) return;

  body.innerHTML = invoices.map(i => `
    <tr>
      <td>${esc(i.invoice_no)}</td>
      <td>${esc(i.invoice_date)}</td>
      <td>${esc(vehicleById(i.vehicle_id)?.registration || "")}</td>
      <td>${esc(i.customer || "")}</td>
      <td>${money(i.subtotal)}</td>
      <td>${money(i.paid)}</td>
      <td>${money(i.balance)}</td>
      <td>
        <button class="btn" onclick="editInvoice('${i.id}')">Edit</button>
        <button class="btn btn-danger"
          onclick="deleteInvoice('${i.id}')">Delete</button>
      </td>
    </tr>
  `).join("") || `
    <tr><td colspan="8">No invoices.</td></tr>
  `;
}

function openInvoiceModal() {
  $("invoiceForm")?.reset();
  $("invoiceId").value = "";
  $("invoiceDate").value = today();

  fillVehicleSelect("invoiceVehicle");

  if ($("invoiceCompanySelect")) {
    $("invoiceCompanySelect").value = "crystal";
  }

  invoiceTotal();
  openModal("invoiceModal");
}

window.openInvoiceModal = openInvoiceModal;

function editInvoice(id) {
  const i = invoiceById(id);
  if (!i) return;

  $("invoiceId").value = i.id;
  $("invoiceNo").value = i.invoice_no || "";
  $("invoiceDate").value = i.invoice_date || today();
  $("invoiceVehicle").value = i.vehicle_id || "";
  $("invoiceCustomer").value = i.customer || "";
  $("invoiceJobDescription").value = i.job_description || "";
  $("invoiceLabour").value = i.labour || 0;
  $("invoiceParts").value = i.parts || 0;
  $("invoiceOther").value = i.other_amount ?? i.other ?? 0;
  $("invoiceSubtotal").value = i.subtotal ?? i.total ?? 0;
  $("invoicePaid").value = i.paid || 0;
  $("invoiceBalance").value = i.balance || 0;
  $("invoiceStatus").value = i.status || "Unpaid";
  $("invoiceNotes").value = i.notes || "";

  if ($("invoiceCompanySelect")) {
    $("invoiceCompanySelect").value =
      i.company_type || i.company_key || "crystal";
  }

  openModal("invoiceModal");
}

window.editInvoice = editInvoice;

async function saveInvoice(e) {
  e.preventDefault();

  invoiceTotal();

  const type =
    $("invoiceCompanySelect")?.value || "crystal";

  const c = company(type);

  const record = {
    invoice_no: $("invoiceNo").value.trim(),
    invoice_date: $("invoiceDate").value || today(),
    vehicle_id: $("invoiceVehicle").value || null,
    customer: $("invoiceCustomer").value.trim() || null,
    job_description:
      $("invoiceJobDescription").value.trim() || null,

    labour: num($("invoiceLabour").value),
    parts: num($("invoiceParts").value),
    other_amount: num($("invoiceOther").value),
    subtotal: num($("invoiceSubtotal").value),
    paid: num($("invoicePaid").value),
    balance: num($("invoiceBalance").value),

    status: $("invoiceStatus").value || "Unpaid",
    notes: $("invoiceNotes").value.trim() || null,

    company_type: type,
    company_name: c.name,
    company_address: c.address,
    company_phone: c.phone,
    company_email: c.email
  };

  const id = $("invoiceId").value;

  const result = id
    ? await supabase.from("invoices").update(record).eq("id", id)
    : await supabase.from("invoices").insert(record);

  if (result.error) {
    toast("Invoice error: " + errorMessage(result.error));
    return;
  }

  closeModal("invoiceModal");
  toast("Invoice saved");
  await loadAllData();
}

async function deleteInvoice(id) {
  if (!confirm("Delete invoice?")) return;

  const result = await supabase
    .from("invoices")
    .delete()
    .eq("id", id);

  if (result.error) {
    toast(errorMessage(result.error));
    return;
  }

  await loadAllData();
}

window.deleteInvoice = deleteInvoice;

/* =========================================================
   GATE PASSES
   ========================================================= */

function syncGateVehicle() {
  const v = vehicleById($("gateVehicle")?.value);
  if (!v) return;

  $("gateVehicleRegistration").value =
    v.registration || "";

  if ($("gateCustomer") && !$("gateCustomer").value) {
    $("gateCustomer").value = v.customer || "";
  }

  if ($("gateReleasedTo") && !$("gateReleasedTo").value) {
    $("gateReleasedTo").value = v.released_to || "";
  }

  if (
    $("gateReleasedContact") &&
    !$("gateReleasedContact").value
  ) {
    $("gateReleasedContact").value =
      v.released_contact || "";
  }
}

function calculateGateBalance() {
  /*
     The current Gate Pass form contains Invoice No.,
     not invoice amount. Therefore we preserve the manually
     entered Gate Pass balance rather than inventing a value.
  */
  const paid = num($("gatePaid")?.value);

  if ($("gateBalance") && !$("gateBalance").value) {
    $("gateBalance").value = 0;
  }

  return num($("gateBalance")?.value);
}

function renderGatePasses() {
  const body = $("gatePassesTableBody");
  if (!body) return;

  body.innerHTML = gatePasses.map(g => `
    <tr>
      <td>${esc(g.gate_pass_no || g.pass_no || "")}</td>
      <td>${esc(g.gate_pass_date || g.pass_date || "")}</td>
      <td>
        ${esc(
          g.vehicle_registration ||
          vehicleById(g.vehicle_id)?.registration ||
          ""
        )}
      </td>
      <td>${esc(g.customer || "")}</td>
      <td>${esc(g.released_to || "")}</td>
      <td>${money(g.paid)}</td>
      <td>${esc(g.status || "")}</td>
      <td>
        <button class="btn"
          onclick="editGatePass('${g.id}')">Edit</button>
        <button class="btn btn-danger"
          onclick="deleteGatePass('${g.id}')">Delete</button>
      </td>
    </tr>
  `).join("") || `
    <tr><td colspan="8">No gate passes.</td></tr>
  `;
}

function openGatePassModal() {
  $("gatePassForm")?.reset();
  $("gatePassId").value = "";
  $("gatePassDate").value = today();
  $("gatePaid").value = 0;
  $("gateBalance").value = 0;

  fillVehicleSelect("gateVehicle");

  if ($("gateCompanySelect")) {
    $("gateCompanySelect").value = "crystal";
  }

  openModal("gatePassModal");
}

window.openGatePassModal = openGatePassModal;

function editGatePass(id) {
  const g = gateById(id);
  if (!g) return;

  $("gatePassId").value = g.id;
  $("gatePassNo").value =
    g.gate_pass_no || g.pass_no || "";

  $("gatePassDate").value =
    g.gate_pass_date ||
    g.pass_date ||
    today();

  $("gateVehicle").value = g.vehicle_id || "";

  $("gateVehicleRegistration").value =
    g.vehicle_registration ||
    vehicleById(g.vehicle_id)?.registration ||
    "";

  $("gateCustomer").value = g.customer || "";
  $("gateReleasedTo").value = g.released_to || "";
  $("gateReleasedContact").value =
    g.released_contact || "";

  $("gateInvoice").value = g.invoice_no || "";
  $("gatePaid").value = g.paid || 0;
  $("gateBalance").value = g.balance || 0;

  $("gateAuthorizedBy").value =
    g.authorized_by || "Josephine";

  $("gateStatus").value =
    g.status || "Pending";

  $("gateNotes").value = g.notes || "";

  if ($("gateCompanySelect")) {
    $("gateCompanySelect").value =
      g.company_type ||
      g.company_key ||
      "crystal";
  }

  openModal("gatePassModal");
}

window.editGatePass = editGatePass;

async function saveGatePass(e) {
  e.preventDefault();

  const type =
    $("gateCompanySelect")?.value || "crystal";

  const c = company(type);

  const record = {
    gate_pass_no:
      $("gatePassNo").value.trim(),

    gate_pass_date:
      $("gatePassDate").value || today(),

    vehicle_id:
      $("gateVehicle").value || null,

    vehicle_registration:
      $("gateVehicleRegistration").value || null,

    customer:
      $("gateCustomer").value.trim() || null,

    released_to:
      $("gateReleasedTo").value.trim(),

    released_contact:
      $("gateReleasedContact").value.trim() || null,

    invoice_no:
      $("gateInvoice").value.trim() || null,

    paid:
      num($("gatePaid").value),

    balance:
      num($("gateBalance").value),

    authorized_by:
      $("gateAuthorizedBy").value.trim() || null,

    status:
      $("gateStatus").value || "Pending",

    notes:
      $("gateNotes").value.trim() || null,

    company_type: type,
    company_name: c.name,
    company_address: c.address,
    company_phone: c.phone,
    company_email: c.email
  };

  const id = $("gatePassId").value;

  const result = id
    ? await supabase
        .from("gate_passes")
        .update(record)
        .eq("id", id)
    : await supabase
        .from("gate_passes")
        .insert(record);

  if (result.error) {
    toast("Gate Pass error: " + errorMessage(result.error));
    console.error(result.error);
    return;
  }

  closeModal("gatePassModal");
  toast("Gate Pass saved");
  await loadAllData();
}

async function deleteGatePass(id) {
  if (!confirm("Delete Gate Pass?")) return;

  const result = await supabase
    .from("gate_passes")
    .delete()
    .eq("id", id);

  if (result.error) {
    toast(errorMessage(result.error));
    return;
  }

  await loadAllData();
}

window.deleteGatePass = deleteGatePass;

/* =========================================================
   ESTIMATES / QUOTATIONS
   ========================================================= */

function ensureEstimateSection() {
  if ($("estimates")) return;

  const main =
    document.querySelector("main") ||
    document.querySelector(".main-content") ||
    document.body;

  const section = document.createElement("section");

  section.id = "estimates";
  section.className = "app-section";
  section.style.display = "none";

  section.innerHTML = `
    <div class="section-header">
      <h2>Estimates / Quotations</h2>
      <button class="btn btn-primary"
        onclick="openEstimateModal()">
        New Estimate
      </button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>Date</th>
            <th>Vehicle</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="estimatesTableBody"></tbody>
      </table>
    </div>
  `;

  main.appendChild(section);
}

function ensureEstimateModal() {
  if ($("estimateModal")) return;

  const modal = document.createElement("div");

  modal.id = "estimateModal";
  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-content">

      <div class="modal-header">
        <h3>Estimate / Quotation</h3>
        <button class="modal-close"
          onclick="closeModal('estimateModal')">
          ×
        </button>
      </div>

      <form id="estimateForm">

        <div class="modal-body">

          <input id="estimateId" type="hidden">

          <div class="form-grid">

            <div class="form-group">
              <label>Estimate No.</label>
              <input id="estimateNo" required>
            </div>

            <div class="form-group">
              <label>Date</label>
              <input id="estimateDate"
                type="date" required>
            </div>

            <div class="form-group">
              <label>Vehicle</label>
              <select id="estimateVehicle"></select>
            </div>

            <div class="form-group">
              <label>Customer</label>
              <input id="estimateCustomer">
            </div>

            <div class="form-group full">
              <label>Job Description</label>
              <input id="estimateJobDescription">
            </div>

            <div class="form-group">
              <label>Labour</label>
              <input id="estimateLabour"
                type="number" step="0.01" value="0">
            </div>

            <div class="form-group">
              <label>Parts</label>
              <input id="estimateParts"
                type="number" step="0.01" value="0">
            </div>

            <div class="form-group">
              <label>Other</label>
              <input id="estimateOther"
                type="number" step="0.01" value="0">
            </div>

            <div class="form-group">
              <label>Total</label>
              <input id="estimateSubtotal"
                type="number" readonly value="0">
            </div>

            <div class="form-group">
              <label>Status</label>
              <select id="estimateStatus">
                <option>Draft</option>
                <option>Sent</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </div>

            <div class="form-group full">
              <label>Notes</label>
              <textarea id="estimateNotes"></textarea>
            </div>

          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn"
            onclick="closeModal('estimateModal')">
            Cancel
          </button>

          <button class="btn btn-primary">
            Save Estimate
          </button>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modal);

  $("estimateForm").addEventListener(
    "submit",
    saveEstimate
  );

  ["estimateLabour","estimateParts","estimateOther"]
    .forEach(id => {
      $(id)?.addEventListener(
        "input",
        calculateEstimateTotal
      );
    });

  $("estimateVehicle")?.addEventListener(
    "change",
    syncEstimateVehicle
  );
}

function calculateEstimateTotal() {
  const total =
    num($("estimateLabour")?.value) +
    num($("estimateParts")?.value) +
    num($("estimateOther")?.value);

  if ($("estimateSubtotal")) {
    $("estimateSubtotal").value = total;
  }
}

function syncEstimateVehicle() {
  const v = vehicleById($("estimateVehicle")?.value);
  if (!v) return;

  if ($("estimateCustomer")) {
    $("estimateCustomer").value =
      v.customer || "";
  }

  if ($("estimateJobDescription") &&
      !$("estimateJobDescription").value) {
    $("estimateJobDescription").value =
      v.description || "";
  }
}

function renderEstimates() {
  ensureEstimateSection();

  const body = $("estimatesTableBody");
  if (!body) return;

  body.innerHTML = estimates.map(e => `
    <tr>
      <td>${esc(e.estimate_no)}</td>
      <td>${esc(e.estimate_date)}</td>
      <td>
        ${esc(
          vehicleById(e.vehicle_id)?.registration || ""
        )}
      </td>
      <td>${esc(e.customer || "")}</td>
      <td>${money(
        e.subtotal ?? e.total ?? 0
      )}</td>
      <td>${esc(e.status || "")}</td>
      <td>
        <button class="btn"
          onclick="editEstimate('${e.id}')">
          Edit
        </button>

        <button class="btn btn-danger"
          onclick="deleteEstimate('${e.id}')">
          Delete
        </button>
      </td>
    </tr>
  `).join("") || `
    <tr><td colspan="7">No estimates.</td></tr>
  `;
}

function openEstimateModal() {
  ensureEstimateModal();

  $("estimateForm").reset();

  $("estimateId").value = "";
  $("estimateDate").value = today();

  fillVehicleSelect("estimateVehicle");

  $("estimateLabour").value = 0;
  $("estimateParts").value = 0;
  $("estimateOther").value = 0;

  calculateEstimateTotal();

  openModal("estimateModal");
}

window.openEstimateModal = openEstimateModal;

function editEstimate(id) {
  ensureEstimateModal();

  const e = estimateById(id);
  if (!e) return;

  $("estimateId").value = e.id;
  $("estimateNo").value = e.estimate_no || "";
  $("estimateDate").value =
    e.estimate_date || today();

  $("estimateVehicle").value =
    e.vehicle_id || "";

  $("estimateCustomer").value =
    e.customer || "";

  $("estimateJobDescription").value =
    e.job_description ||
    e.description ||
    "";

  $("estimateLabour").value =
    e.labour || 0;

  $("estimateParts").value =
    e.parts || 0;

  $("estimateOther").value =
    e.other_amount ??
    e.other ??
    0;

  $("estimateSubtotal").value =
    e.subtotal ??
    e.total ??
    0;

  $("estimateStatus").value =
    e.status || "Draft";

  $("estimateNotes").value =
    e.notes || "";

  openModal("estimateModal");
}

window.editEstimate = editEstimate;

async function saveEstimate(e) {
  e.preventDefault();

  const record = {
    estimate_no:
      $("estimateNo").value.trim(),

    estimate_date:
      $("estimateDate").value || today(),

    vehicle_id:
      $("estimateVehicle").value || null,

    customer:
      $("estimateCustomer").value.trim() || null,

    job_description:
      $("estimateJobDescription").value.trim() || null,

    labour:
      num($("estimateLabour").value),

    parts:
      num($("estimateParts").value),

    other_amount:
      num($("estimateOther").value),

    subtotal:
      num($("estimateSubtotal").value),

    status:
      $("estimateStatus").value || "Draft",

    notes:
      $("estimateNotes").value.trim() || null,

    company_type: "crystal",
    company_name: COMPANIES.crystal.name,
    company_address: COMPANIES.crystal.address,
    company_phone: COMPANIES.crystal.phone,
    company_email: COMPANIES.crystal.email
  };

  const id = $("estimateId").value;

  const result = id
    ? await supabase
        .from("estimates")
        .update(record)
        .eq("id", id)
    : await supabase
        .from("estimates")
        .insert(record);

  if (result.error) {
    toast(
      "Estimate error: " +
      errorMessage(result.error)
    );
    return;
  }

  closeModal("estimateModal");
  toast("Estimate saved");
  await loadAllData();
}

async function deleteEstimate(id) {
  if (!confirm("Delete estimate?")) return;

  const result = await supabase
    .from("estimates")
    .delete()
    .eq("id", id);

  if (result.error) {
    toast(errorMessage(result.error));
    return;
  }

  await loadAllData();
}

window.deleteEstimate = deleteEstimate;

/* =========================================================
   DASHBOARD
   ========================================================= */

function setText(id, value) {
  const x = $(id);
  if (x) x.textContent = value;
}

function renderDashboard() {
  setText("totalVehicles", vehicles.length);

  setText(
    "totalExpenses",
    money(
      expenses.reduce(
        (s, e) => s + num(e.amount),
        0
      )
    )
  );

  setText(
    "totalPettyCash",
    money(
      pettyCash.reduce(
        (s, e) => s + num(e.amount),
        0
      )
    )
  );

  setText(
    "pendingRequisitions",
    requisitions.filter(
      r => r.status === "Pending"
    ).length
  );

  setText("totalInvoices", invoices.length);
  setText("totalGatePasses", gatePasses.length);

  const underRepair =
    vehicles.filter(
      v => v.status === "Under Repair"
    ).length;

  setText("vehiclesUnderRepair", underRepair);

  const billed =
    vehicles.reduce(
      (s, v) => s + num(v.billed),
      0
    );

  const paid =
    vehicles.reduce(
      (s, v) => s + num(v.paid),
      0
    );

  setText("totalBilled", money(billed));
  setText("totalPaid", money(paid));
  setText(
    "totalOutstanding",
    money(Math.max(0, billed - paid))
  );
}

/* =========================================================
   PRINT / SHARE
   ========================================================= */

function printHTML(html, title = "Garage Operations") {
  const w = window.open("", "_blank");

  if (!w) {
    toast("Allow pop-ups to print.");
    return;
  }

  w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${esc(title)}</title>

      <style>
        body{
          font-family:Arial,sans-serif;
          padding:25px;
          color:#111;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:15px;
        }

        th,td{
          border:1px solid #ccc;
          padding:8px;
          text-align:left;
        }

        th{
          background:#eee;
        }

        h1,h2,h3{
          margin-top:10px;
        }

        @media print{
          button{display:none}
        }
      </style>
    </head>

    <body>
      ${html}
    </body>
    </html>
  `);

  w.document.close();
  w.focus();

  setTimeout(() => w.print(), 300);
}

window.printHTML = printHTML;

async function shareText(text) {
  if (!text || !text.trim()) {
    toast("Nothing to share.");
    return;
  }

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Garage Operations",
        text
      });
      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      toast("Report copied. Paste it into WhatsApp.");
      return;
    }

    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();

    toast("Report copied.");

  } catch (e) {
    toast("Share cancelled.");
  }
}

window.shareText = shareText;

function printExpenses() {
  const search =
    norm($("expenseSearch")?.value);

  let list = expenses;
  let title = "Expense Report";

  if (search) {
    const v = vehicles.find(
      x => norm(x.registration) === search
    );

    if (!v) {
      toast(
        "No exact vehicle found for " +
        $("expenseSearch").value
      );
      return;
    }

    list = expenses.filter(
      e => String(e.vehicle_id) === String(v.id)
    );

    title =
      "Vehicle Expense Report - " +
      v.registration;
  }

  const total =
    list.reduce(
      (s, e) => s + num(e.amount),
      0
    );

  const html = `
    <h2>${esc(title)}</h2>

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
        ${
          list.map(e => `
            <tr>
              <td>${esc(e.expense_date)}</td>
              <td>${esc(
                vehicleById(e.vehicle_id)?.registration || ""
              )}</td>
              <td>${esc(e.category || "")}</td>
              <td>${esc(e.description || "")}</td>
              <td>${money(e.amount)}</td>
            </tr>
          `).join("")
          ||
          `<tr><td colspan="5">No expenses.</td></tr>`
        }
      </tbody>
    </table>

    <h3>Total: ${money(total)}</h3>
  `;

  printHTML(html, title);
}

window.printExpenses = printExpenses;

/* =========================================================
   GENERAL PREVIEW
   ========================================================= */

function showPreview(title, html) {
  currentPreviewHTML = html;

  if ($("previewTitle")) {
    $("previewTitle").textContent = title;
  }

  if ($("previewContent")) {
    $("previewContent").innerHTML = html;
  }

  openModal("previewModal");
}

window.showPreview = showPreview;

function printCurrentPreview() {
  if (!currentPreviewHTML) {
    toast("Nothing to print.");
    return;
  }

  printHTML(
    currentPreviewHTML,
    $("previewTitle")?.textContent ||
    "Garage Operations"
  );
}

window.printCurrentPreview = printCurrentPreview;

/* =========================================================
   EVENT BINDING
   ========================================================= */

function bind(id, event, fn) {
  const x = $(id);

  if (!x || x.dataset["bound_" + event]) {
    return;
  }

  x.dataset["bound_" + event] = "1";
  x.addEventListener(event, fn);
}

function setupEvents() {

  bind(
    "vehicleForm",
    "submit",
    saveVehicle
  );

  bind(
    "expenseForm",
    "submit",
    saveExpense
  );

  bind(
    "pettyForm",
    "submit",
    savePettyCash
  );

  bind(
    "reqForm",
    "submit",
    saveRequisition
  );

  bind(
    "invoiceForm",
    "submit",
    saveInvoice
  );

  bind(
    "gatePassForm",
    "submit",
    saveGatePass
  );

  bind(
    "vehicleSearch",
    "input",
    renderVehicles
  );

  bind(
    "vehicleStatusFilter",
    "change",
    renderVehicles
  );

  bind(
    "expenseSearch",
    "input",
    renderExpenses
  );

  bind(
    "expenseCategoryFilter",
    "change",
    renderExpenses
  );

  bind(
    "vehicleDateIn",
    "change",
    updateVehicleStorageDays
  );

  bind(
    "vehicleDateOut",
    "change",
    updateVehicleStorageDays
  );

  bind(
    "gateVehicle",
    "change",
    syncGateVehicle
  );

  bind(
    "gatePaid",
    "input",
    calculateGateBalance
  );

  bind(
    "reqQuantity",
    "input",
    calculateReqTotal
  );

  bind(
    "reqUnitCost",
    "input",
    calculateReqTotal
  );

  [
    "invoiceLabour",
    "invoiceParts",
    "invoiceOther",
    "invoicePaid"
  ].forEach(id =>
    bind(id, "input", invoiceTotal)
  );
}

/* =========================================================
   INITIALIZE
   ========================================================= */

async function init() {
  try {
    setupCompanyFields();
    ensureEstimateSection();
    ensureEstimateModal();
    setupEvents();

    await loadAllData();

    showSection("dashboard");

  } catch (e) {
    console.error(e);
    toast("Application startup error: " + errorMessage(e));
  }
}

window.addEventListener(
  "DOMContentLoaded",
  init
);
