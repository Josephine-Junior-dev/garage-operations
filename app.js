import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE COMPACT APP.JS
   ========================================================= */

const SUPABASE_URL = "https://ptluwoeogfkqavhspdjj.supabase.co";
const SUPABASE_KEY = "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* =========================================================
   DATA
   ========================================================= */

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];
let invoices = [];
let gatePasses = [];
let estimates = [];

window.currentVehicleExpenseId = null;

/* =========================================================
   HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

const esc = value =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const money = value =>
  "KSh " +
  Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const today = () => new Date().toISOString().slice(0, 10);

const num = value => Number(value || 0);

function errorMessage(error) {
  return error?.message || "Database error";
}

function vehicleById(id) {
  return vehicles.find(v => String(v.id) === String(id));
}

function closeModal(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("active");
  el.style.display = "none";
}

function openModal(id) {
  const el = $(id);
  if (!el) return;
  el.style.display = "flex";
  el.classList.add("active");
}

function toast(message) {
  const el = $("toast");
  if (!el) {
    alert(message);
    return;
  }

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 3000);
}

function storageDays(v) {
  if (!v?.date_in) return 0;

  const start = new Date(v.date_in + "T00:00:00");
  const end = v.date_out
    ? new Date(v.date_out + "T00:00:00")
    : new Date();

  const days = Math.ceil((end - start) / 86400000);

  return Math.max(0, days);
}

function vehicleExpenses(id) {
  return expenses.filter(e =>
    e.vehicle_id &&
    String(e.vehicle_id) === String(id)
  );
}

function vehicleExpenseTotal(id) {
  return vehicleExpenses(id).reduce(
    (sum, e) => sum + num(e.amount),
    0
  );
}

function outstanding(v) {
  return num(v?.billed) - num(v?.paid);
}

/* =========================================================
   DATABASE LOAD
   ========================================================= */

async function loadAllData() {
  try {
    const [
      v,
      e,
      p,
      r,
      i,
      g,
      es
    ] = await Promise.all([
      supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      supabase.from("petty_cash").select("*").order("cash_date", { ascending: false }),
      supabase.from("requisitions").select("*").order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("gate_passes").select("*").order("created_at", { ascending: false }),
      supabase.from("estimates").select("*").order("created_at", { ascending: false })
    ]);

    vehicles = v.error ? [] : (v.data || []);
    expenses = e.error ? [] : (e.data || []);
    pettyCash = p.error ? [] : (p.data || []);
    requisitions = r.error ? [] : (r.data || []);
    invoices = i.error ? [] : (i.data || []);
    gatePasses = g.error ? [] : (g.data || []);
    estimates = es.error ? [] : (es.data || []);

    if (v.error) console.warn("Vehicles:", v.error.message);
    if (e.error) console.warn("Expenses:", e.error.message);
    if (p.error) console.warn("Petty cash:", p.error.message);
    if (r.error) console.warn("Requisitions:", r.error.message);
    if (i.error) console.warn("Invoices:", i.error.message);
    if (g.error) console.warn("Gate passes:", g.error.message);
    if (es.error) console.warn("Estimates:", es.error.message);

    renderAll();

  } catch (err) {
    console.error(err);
    toast("Could not load data");
  }
}

/* =========================================================
   RENDER ALL
   ========================================================= */

function renderAll() {
  renderVehicles();
  renderExpenses();
  renderPettyCash();
  renderRequisitions();
  renderInvoices();
  renderGatePasses();
  renderEstimates();
  renderDashboard();

  fillVehicleSelect("expenseVehicle");
  fillVehicleSelect("reqVehicle");
  fillVehicleSelect("invoiceVehicle");
  fillVehicleSelect("gateVehicle");
}

/* =========================================================
   VEHICLE SELECTS
   ========================================================= */

function fillVehicleSelect(id) {
  const select = $(id);
  if (!select) return;

  const current = select.value;

  select.innerHTML =
    `<option value="">Select Vehicle</option>` +
    vehicles.map(v =>
      `<option value="${esc(v.id)}">
        ${esc(v.registration)} — ${esc(v.customer)}
      </option>`
    ).join("");

  if (current && vehicles.some(v => String(v.id) === String(current))) {
    select.value = current;
  }
}

/* =========================================================
   VEHICLES
   ========================================================= */

function renderVehicles() {
  const body = $("vehiclesTableBody");
  if (!body) return;

  const search = ($("vehicleSearch")?.value || "").toLowerCase();
  const status = $("vehicleStatusFilter")?.value || "";

  const list = vehicles.filter(v => {
    const matchesSearch =
      !search ||
      [
        v.registration,
        v.customer,
        v.model,
        v.status,
        v.job_type
      ].some(x => String(x || "").toLowerCase().includes(search));

    const matchesStatus =
      !status || String(v.status || "") === status;

    return matchesSearch && matchesStatus;
  });

  body.innerHTML = list.map(v => {
    const expTotal = vehicleExpenseTotal(v.id);
    const out = outstanding(v);

    return `
      <tr>
        <td>
          <strong>${esc(v.registration)}</strong>
          ${v.model ? `<small>${esc(v.model)}</small>` : ""}
        </td>

        <td>${esc(v.customer)}</td>

        <td>${esc(v.date_in || "")}</td>

        <td>${esc(v.job_type || "Repair")}</td>

        <td>${esc(v.status || "")}</td>

        <td>${storageDays(v)}</td>

        <td>${money(v.billed)}</td>

        <td>${money(v.paid)}</td>

        <td>${money(out)}</td>

        <td>
          <button
            class="action-btn orange"
            title="Vehicle Expenses"
            aria-label="Vehicle Expenses"
            onclick="viewVehicleExpenses('${v.id}')">
            💰 ${money(expTotal)}
          </button>
        </td>

        <td>
          <div class="table-actions">

            <button
              class="action-btn"
              title="Edit"
              aria-label="Edit"
              onclick="editVehicle('${v.id}')">✏️</button>

            <button
              class="action-btn orange"
              title="Vehicle Expenses"
              aria-label="Vehicle Expenses"
              onclick="viewVehicleExpenses('${v.id}')">🚘</button>

            <button
              class="action-btn blue"
              title="View"
              aria-label="View"
              onclick="viewVehicle('${v.id}')">👁️</button>

            <button
              class="action-btn green"
              title="Share"
              aria-label="Share"
              onclick="shareVehicle('${v.id}')">📤</button>

            <button
              class="action-btn danger"
              title="Delete"
              aria-label="Delete"
              onclick="deleteVehicle('${v.id}')">🗑️</button>

          </div>
        </td>
      </tr>
    `;
  }).join("") || `
    <tr>
      <td colspan="12">No vehicles found.</td>
    </tr>
  `;
}

function openVehicleModal() {
  $("vehicleForm")?.reset();

  if ($("vehicleId")) $("vehicleId").value = "";
  if ($("vehicleDateIn")) $("vehicleDateIn").value = today();
  if ($("vehicleJobType")) $("vehicleJobType").value = "Repair";
  if ($("vehicleStatus")) $("vehicleStatus").value = "Under Repair";

  if ($("vehicleModalTitle"))
    $("vehicleModalTitle").textContent = "Add Vehicle";

  openModal("vehicleModal");
}

function editVehicle(id) {
  const v = vehicleById(id);
  if (!v) return;

  $("vehicleId").value = v.id;
  $("vehicleRegistration").value = v.registration || "";
  $("vehicleCustomer").value = v.customer || "";
  $("vehicleModel").value = v.model || "";
  $("vehicleModelYear").value = v.model_year || "";
  $("vehicleColor").value = v.color || "";
  $("vehicleDateIn").value = v.date_in || "";
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

async function saveVehicle(e) {
  e?.preventDefault();

  const id = $("vehicleId")?.value;
  const registration =
    $("vehicleRegistration")?.value.trim() || "";

  const customer =
    $("vehicleCustomer")?.value.trim() || "";

  if (!registration) {
    toast("Registration / Chassis No. is required");
    return;
  }

  if (!customer) {
    toast("Customer is required");
    return;
  }

  const duplicate = vehicles.find(v =>
    String(v.registration || "").trim().toLowerCase() ===
    registration.toLowerCase() &&
    String(v.id) !== String(id)
  );

  if (duplicate) {
    toast("Vehicle already exists");
    return;
  }

  const record = {
    registration,
    customer,
    model: $("vehicleModel")?.value.trim() || null,
    model_year: $("vehicleModelYear")?.value.trim() || null,
    color: $("vehicleColor")?.value.trim() || null,
    date_in: $("vehicleDateIn")?.value || today(),
    date_out: $("vehicleDateOut")?.value || null,
    job_type: $("vehicleJobType")?.value || "Repair",
    status: $("vehicleStatus")?.value || "Under Repair",
    released_to: $("vehicleReleasedTo")?.value.trim() || null,
    released_contact: $("vehicleReleasedContact")?.value.trim() || null,
    billed: num($("vehicleBilled")?.value),
    paid: num($("vehiclePaid")?.value),
    description: $("vehicleDescription")?.value.trim() || null
  };

  const result = id
    ? await supabase.from("vehicles").update(record).eq("id", id)
    : await supabase.from("vehicles").insert(record);

  if (result.error) {
    toast(errorMessage(result.error));
    return;
  }

  closeModal("vehicleModal");
  toast("Vehicle saved");
  await loadAllData();
}

async function deleteVehicle(id) {
  const v = vehicleById(id);
  if (!v) return;

  if (!confirm(
    `Delete vehicle ${v.registration}?\n\nIts linked expenses will also be deleted.`
  )) return;

  const { error } =
    await supabase.from("vehicles").delete().eq("id", id);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  toast("Vehicle deleted");
  await loadAllData();
}

function viewVehicle(id) {
  const v = vehicleById(id);
  if (!v) return;

  const expTotal = vehicleExpenseTotal(id);

  showPreview(
    `Vehicle ${v.registration}`,
    `
      <div class="print-document">

        <h2>CRYSTAL MOTORS (K) LTD</h2>
        <p>
          P.O. Box 54385 – 00200, Nairobi<br>
          Cell: 0722 707124 | 0723 914 222<br>
          Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge
        </p>

        <hr>

        <h2>VEHICLE DETAILS</h2>

        <p><strong>Registration / Chassis:</strong>
          ${esc(v.registration)}</p>

        <p><strong>Customer:</strong>
          ${esc(v.customer)}</p>

        <p><strong>Model:</strong>
          ${esc(v.model || "")}</p>

        <p><strong>Year:</strong>
          ${esc(v.model_year || "")}</p>

        <p><strong>Colour:</strong>
          ${esc(v.color || "")}</p>

        <p><strong>Date In:</strong>
          ${esc(v.date_in || "")}</p>

        <p><strong>Date Out:</strong>
          ${esc(v.date_out || "")}</p>

        <p><strong>Storage Days:</strong>
          ${storageDays(v)}</p>

        <p><strong>Job Type:</strong>
          ${esc(v.job_type || "")}</p>

        <p><strong>Status:</strong>
          ${esc(v.status || "")}</p>

        <hr>

        <p><strong>Billed:</strong> ${money(v.billed)}</p>
        <p><strong>Paid:</strong> ${money(v.paid)}</p>
        <p><strong>Outstanding:</strong> ${money(outstanding(v))}</p>
        <p><strong>Total Vehicle Expenses:</strong> ${money(expTotal)}</p>

        <hr>

        <p><strong>Description:</strong></p>
        <p>${esc(v.description || "")}</p>

      </div>
    `
  );
}

/* =========================================================
   VEHICLE EXPENSE REPORT
   ========================================================= */

function vehicleExpenseData(id) {
  if (!id) return [];

  return expenses.filter(e =>
    e.vehicle_id &&
    String(e.vehicle_id) === String(id)
  );
}

function viewVehicleExpenses(id) {
  const v = vehicleById(id);
  if (!v) return;

  const list = vehicleExpenseData(id);
  const total = list.reduce(
    (sum, e) => sum + num(e.amount),
    0
  );

  window.currentVehicleExpenseId = v.id;

  const content = $("vehicleExpensePreviewContent");
  if (!content) return;

  content.innerHTML = `
    <div class="print-document">

      <h2>CRYSTAL MOTORS (K) LTD</h2>

      <p>
        P.O. Box 54385 – 00200, Nairobi<br>
        Cell: 0722 707124 | 0723 914 222<br>
        Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge
      </p>

      <hr>

      <h2>VEHICLE EXPENSE REPORT</h2>

      <p>
        <strong>Vehicle:</strong> ${esc(v.registration)}<br>
        <strong>Customer:</strong> ${esc(v.customer)}
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

          ${
            list.map(e => `
              <tr>
                <td>${esc(e.expense_date)}</td>
                <td>${esc(e.description)}</td>
                <td>${esc(e.category)}</td>
                <td>${money(e.amount)}</td>
              </tr>
            `).join("")
            ||
            `
              <tr>
                <td colspan="4">
                  No expenses for this vehicle
                </td>
              </tr>
            `
          }

        </tbody>

        <tfoot>
          <tr>
            <th colspan="3">TOTAL VEHICLE EXPENSES</th>
            <th>${money(total)}</th>
          </tr>
        </tfoot>
      </table>

    </div>
  `;

  openModal("vehicleExpensePreviewModal");
}

async function shareVehicle(id) {
  const v = vehicleById(id);
  if (!v) return;

  const list = vehicleExpenseData(id);
  const total = list.reduce(
    (sum, e) => sum + num(e.amount),
    0
  );

  let text =
`CRYSTAL MOTORS (K) LTD
P.O. Box 54385 – 00200, Nairobi
Cell: 0722 707124 | 0723 914 222

VEHICLE EXPENSE REPORT

Vehicle: ${v.registration}
Customer: ${v.customer || ""}
Status: ${v.status || ""}

Billed: ${money(v.billed)}
Paid: ${money(v.paid)}
Outstanding: ${money(outstanding(v))}

EXPENSES:
`;

  if (!list.length) {
    text += "No expenses for this vehicle.\n";
  } else {
    list.forEach(e => {
      text +=
`${e.expense_date || ""}
${e.description || ""}
${e.category || ""}
${money(e.amount)}

`;
    });
  }

  text += `TOTAL VEHICLE EXPENSES: ${money(total)}`;

  shareText(
    `Vehicle Expense Report - ${v.registration}`,
    text
  );
}

async function shareText(title, text) {
  try {
    if (navigator.share) {
      await navigator.share({
        title,
        text
      });
      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      toast("Report copied. You can paste it into WhatsApp.");
      return;
    }

    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();

    toast("Report copied");
  } catch (err) {
    console.log(err);
  }
}

function printVehicleExpenses() {
  const id = window.currentVehicleExpenseId;
  if (!id) return;

  const v = vehicleById(id);
  if (!v) return;

  const list = vehicleExpenseData(id);
  const total = list.reduce(
    (sum, e) => sum + num(e.amount),
    0
  );

  const html = `
    <html>
    <head>
      <title>Vehicle Expense Report</title>
      <style>
        body{font-family:Arial;padding:30px;color:#111}
        h1,h2{text-align:center}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{border:1px solid #ccc;padding:8px;text-align:left}
        th{font-weight:bold}
        .right{text-align:right}
      </style>
    </head>

    <body>

      <h2>CRYSTAL MOTORS (K) LTD</h2>

      <p style="text-align:center">
        P.O. Box 54385 – 00200, Nairobi<br>
        Cell: 0722 707124 | 0723 914 222<br>
        Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge
      </p>

      <hr>

      <h2>VEHICLE EXPENSE REPORT</h2>

      <p>
        <strong>Vehicle:</strong> ${esc(v.registration)}<br>
        <strong>Customer:</strong> ${esc(v.customer)}
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
          ${
            list.map(e => `
              <tr>
                <td>${esc(e.expense_date)}</td>
                <td>${esc(e.description)}</td>
                <td>${esc(e.category)}</td>
                <td class="right">${money(e.amount)}</td>
              </tr>
            `).join("")
            ||
            `<tr><td colspan="4">No expenses</td></tr>`
          }
        </tbody>

        <tfoot>
          <tr>
            <th colspan="3">TOTAL</th>
            <th class="right">${money(total)}</th>
          </tr>
        </tfoot>
      </table>

    </body>
    </html>
  `;

  printHTML(html);
}

/* =========================================================
   EXPENSES
   ========================================================= */

function renderExpenses() {
  const body = $("expensesTableBody");
  if (!body) return;

  const search = ($("expenseSearch")?.value || "").toLowerCase();
  const category = $("expenseCategoryFilter")?.value || "";

  const list = expenses.filter(e => {
    const v = vehicleById(e.vehicle_id);

    const matchesSearch =
      !search ||
      [
        e.description,
        e.category,
        v?.registration,
        v?.customer
      ].some(x =>
        String(x || "").toLowerCase().includes(search)
      );

    const matchesCategory =
      !category || e.category === category;

    return matchesSearch && matchesCategory;
  });

  body.innerHTML = list.map(e => {
    const v = vehicleById(e.vehicle_id);

    return `
      <tr>
        <td>${esc(e.expense_date)}</td>

        <td>
          <strong>${esc(v?.registration || "Unlinked")}</strong>
        </td>

        <td>${esc(e.description)}</td>

        <td>${esc(e.category)}</td>

        <td>${money(e.amount)}</td>

        <td>
          <div class="table-actions">

            <button
              class="action-btn"
              title="Edit"
              aria-label="Edit"
              onclick="editExpense('${e.id}')">✏️</button>

            <button
              class="action-btn blue"
              title="View"
              aria-label="View"
              onclick="viewExpense('${e.id}')">👁️</button>

            <button
              class="action-btn green"
              title="Share"
              aria-label="Share"
              onclick="shareExpense('${e.id}')">📤</button>

            <button
              class="action-btn danger"
              title="Delete"
              aria-label="Delete"
              onclick="deleteExpense('${e.id}')">🗑️</button>

          </div>
        </td>
      </tr>
    `;
  }).join("") || `
    <tr><td colspan="6">No expenses found.</td></tr>
  `;
}

function openExpenseModal() {
  $("expenseForm")?.reset();

  if ($("expenseId")) $("expenseId").value = "";
  if ($("expenseDate")) $("expenseDate").value = today();

  fillVehicleSelect("expenseVehicle");

  if ($("expenseModalTitle"))
    $("expenseModalTitle").textContent = "Add Expense";

  openModal("expenseModal");
}

function editExpense(id) {
  const e = expenses.find(x => String(x.id) === String(id));
  if (!e) return;

  fillVehicleSelect("expenseVehicle");

  $("expenseId").value = e.id;
  $("expenseVehicle").value = e.vehicle_id || "";
  $("expenseDate").value = e.expense_date || "";
  $("expenseCategory").value = e.category || "Parts";
  $("expenseAmount").value = e.amount || 0;
  $("expenseDescription").value = e.description || "";

  $("expenseModalTitle").textContent = "Edit Expense";

  openModal("expenseModal");
}

async function saveExpense(e) {
  e?.preventDefault();

  const id = $("expenseId")?.value;
  const vehicleId = $("expenseVehicle")?.value || null;

  if (!vehicleId) {
    toast("Please select a vehicle");
    return;
  }

  const description =
    $("expenseDescription")?.value.trim() || "";

  if (!description) {
    toast("Description is required");
    return;
  }

  const amount = num($("expenseAmount")?.value);

  if (amount < 0) {
    toast("Amount cannot be negative");
    return;
  }

  const record = {
    vehicle_id: vehicleId,
    expense_date: $("expenseDate")?.value || today(),
    category: $("expenseCategory")?.value || "Parts",
    amount,
    description
  };

  const result = id
    ? await supabase.from("expenses").update(record).eq("id", id)
    : await supabase.from("expenses").insert(record);

  if (result.error) {
    toast(errorMessage(result.error));
    return;
  }

  closeModal("expenseModal");
  toast("Expense saved");

  await loadAllData();
}

async function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;

  const { error } =
    await supabase.from("expenses").delete().eq("id", id);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  toast("Expense deleted");
  await loadAllData();
}

function viewExpense(id) {
  const e = expenses.find(x => String(x.id) === String(id));
  if (!e) return;

  const v = vehicleById(e.vehicle_id);

  showPreview(
    "Expense",
    `
      <h2>Expense</h2>

      <p><strong>Vehicle:</strong>
        ${esc(v?.registration || "Unlinked")}</p>

      <p><strong>Date:</strong>
        ${esc(e.expense_date)}</p>

      <p><strong>Description:</strong>
        ${esc(e.description)}</p>

      <p><strong>Category:</strong>
        ${esc(e.category)}</p>

      <h3>${money(e.amount)}</h3>
    `
  );
}

function shareExpense(id) {
  const e = expenses.find(x => String(x.id) === String(id));
  if (!e) return;

  const v = vehicleById(e.vehicle_id);

  shareText(
    "Garage Expense",
`CRYSTAL MOTORS (K) LTD

Vehicle: ${v?.registration || "Unlinked"}
Date: ${e.expense_date || ""}
Description: ${e.description || ""}
Category: ${e.category || ""}
Amount: ${money(e.amount)}`
  );
}

/* =========================================================
   PETTY CASH
   ========================================================= */

function renderPettyCash() {
  const body = $("pettyTableBody");
  if (!body) return;

  const search = ($("pettySearch")?.value || "").toLowerCase();
  const category = $("pettyCategoryFilter")?.value || "";

  const list = pettyCash.filter(p => {
    const matchesSearch =
      !search ||
      [
        p.description,
        p.paid_to,
        p.category,
        p.notes
      ].some(x =>
        String(x || "").toLowerCase().includes(search)
      );

    const matchesCategory =
      !category || p.category === category;

    return matchesSearch && matchesCategory;
  });

  body.innerHTML = list.map(p => `
    <tr>
      <td>${esc(p.cash_date)}</td>
      <td>${esc(p.paid_to || "")}</td>
      <td>${esc(p.description)}</td>
      <td>${esc(p.category || "")}</td>
      <td>${money(p.amount)}</td>

      <td>
        <div class="table-actions">

          <button
            class="action-btn"
            title="Edit"
            onclick="editPetty('${p.id}')">✏️</button>

          <button
            class="action-btn blue"
            title="View"
            onclick="viewPetty('${p.id}')">👁️</button>

          <button
            class="action-btn green"
            title="Share"
            onclick="sharePetty('${p.id}')">📤</button>

          <button
            class="action-btn danger"
            title="Delete"
            onclick="deletePetty('${p.id}')">🗑️</button>

        </div>
      </td>
    </tr>
  `).join("") || `
    <tr><td colspan="6">No petty cash records found.</td></tr>
  `;
}

function openPettyModal() {
  $("pettyForm")?.reset();

  if ($("pettyId")) $("pettyId").value = "";
  if ($("pettyDate")) $("pettyDate").value = today();

  $("pettyModalTitle").textContent = "Add Petty Cash";

  openModal("pettyModal");
}

function editPetty(id) {
  const p = pettyCash.find(x => String(x.id) === String(id));
  if (!p) return;

  $("pettyId").value = p.id;
  $("pettyDate").value = p.cash_date || "";
  $("pettyPaidTo").value = p.paid_to || "";
  $("pettyCategory").value = p.category || "";
  $("pettyAmount").value = p.amount || 0;
  $("pettyDescription").value = p.description || "";
  $("pettyNotes").value = p.notes || "";

  $("pettyModalTitle").textContent = "Edit Petty Cash";

  openModal("pettyModal");
}

async function savePetty(e) {
  e?.preventDefault();

  const id = $("pettyId")?.value;

  const record = {
    cash_date: $("pettyDate")?.value || today(),
    paid_to: $("pettyPaidTo")?.value.trim() || null,
    category: $("pettyCategory")?.value || null,
    amount: num($("pettyAmount")?.value),
    description: $("pettyDescription")?.value.trim() || "",
    notes: $("pettyNotes")?.value.trim() || null
  };

  if (!record.description) {
    toast("Description is required");
    return;
  }

  const result = id
    ? await supabase.from("petty_cash").update(record).eq("id", id)
    : await supabase.from("petty_cash").insert(record);

  if (result.error) {
    toast(errorMessage(result.error));
    return;
  }

  closeModal("pettyModal");
  toast("Petty cash saved");
  await loadAllData();
}

async function deletePetty(id) {
  if (!confirm("Delete this petty cash record?")) return;

  const { error } =
    await supabase.from("petty_cash").delete().eq("id", id);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  toast("Petty cash deleted");
  await loadAllData();
}

function viewPetty(id) {
  const p = pettyCash.find(x => String(x.id) === String(id));
  if (!p) return;

  showPreview(
    "Petty Cash",
    `
      <h2>Petty Cash</h2>
      <p><strong>Date:</strong> ${esc(p.cash_date)}</p>
      <p><strong>Paid To:</strong> ${esc(p.paid_to || "")}</p>
      <p><strong>Category:</strong> ${esc(p.category || "")}</p>
      <p><strong>Description:</strong> ${esc(p.description)}</p>
      <p><strong>Notes:</strong> ${esc(p.notes || "")}</p>
      <h3>${money(p.amount)}</h3>
    `
  );
}

function sharePetty(id) {
  const p = pettyCash.find(x => String(x.id) === String(id));
  if (!p) return;

  shareText(
    "Petty Cash",
`CRYSTAL MOTORS (K) LTD

Date: ${p.cash_date || ""}
Paid To: ${p.paid_to || ""}
Category: ${p.category || ""}
Description: ${p.description || ""}
Amount: ${money(p.amount)}
Notes: ${p.notes || ""}`
  );
}

/* =========================================================
   REQUISITIONS
   ========================================================= */

function renderRequisitions() {
  const body = $("requisitionsTableBody");
  if (!body) return;

  const search = ($("reqSearch")?.value || "").toLowerCase();
  const status = $("reqStatusFilter")?.value || "";

  const list = requisitions.filter(r => {
    const v = vehicleById(r.vehicle_id);

    const matchesSearch =
      !search ||
      [
        r.req_no,
        r.requested_by,
        r.item_description,
        r.status,
        v?.registration
      ].some(x =>
        String(x || "").toLowerCase().includes(search)
      );

    const matchesStatus =
      !status || r.status === status;

    return matchesSearch && matchesStatus;
  });

  const total = list.reduce(
    (sum, r) => sum + num(r.total_amount),
    0
  );

  if ($("reqOverallTotal"))
    $("reqOverallTotal").textContent = money(total);

  body.innerHTML = list.map(r => {
    const v = vehicleById(r.vehicle_id);

    return `
      <tr>
        <td>${esc(r.req_no)}</td>
        <td>${esc(r.req_date)}</td>
        <td>${esc(r.requested_by)}</td>
        <td>${esc(v?.registration || "")}</td>
        <td>${esc(r.item_description)}</td>
        <td>${num(r.quantity)}</td>
        <td>${money(r.unit_cost)}</td>
        <td>${money(r.total_amount)}</td>
        <td>${esc(r.status || "")}</td>

        <td>
          <div class="table-actions">
            <button class="action-btn"
              title="Edit"
              onclick="editReq('${r.id}')">✏️</button>

            <button class="action-btn blue"
              title="View"
              onclick="viewReq('${r.id}')">👁️</button>

            <button class="action-btn green"
              title="Share"
              onclick="shareReq('${r.id}')">📤</button>

            <button class="action-btn danger"
              title="Delete"
              onclick="deleteReq('${r.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join("") || `
    <tr><td colspan="10">No requisitions found.</td></tr>
  `;
}

function openReqModal() {
  $("reqForm")?.reset();

  if ($("reqId")) $("reqId").value = "";
  if ($("reqDate")) $("reqDate").value = today();

  fillVehicleSelect("reqVehicle");

  if ($("reqStatus")) $("reqStatus").value = "Pending";

  $("reqModalTitle").textContent = "Add Requisition";

  calculateReqTotal();
  openModal("reqModal");
}

function editReq(id) {
  const r = requisitions.find(x => String(x.id) === String(id));
  if (!r) return;

  fillVehicleSelect("reqVehicle");

  $("reqId").value = r.id;
  $("reqNo").value = r.req_no || "";
  $("reqDate").value = r.req_date || "";
  $("reqRequestedBy").value = r.requested_by || "";
  $("reqVehicle").value = r.vehicle_id || "";
  $("reqItemDescription").value = r.item_description || "";
  $("reqQuantity").value = r.quantity || 1;
  $("reqUnitCost").value = r.unit_cost || 0;
  $("reqTotal").value = r.total_amount || 0;
  $("reqStatus").value = r.status || "Pending";

  if ($("reqExpenseType"))
    $("reqExpenseType").value = r.expense_type || "Materials";

  if ($("reqCategory"))
    $("reqCategory").value = r.expense_type || "Materials";

  $("reqNotes").value = r.notes || "";

  $("reqModalTitle").textContent = "Edit Requisition";

  openModal("reqModal");
}

function calculateReqTotal() {
  const q = num($("reqQuantity")?.value);
  const c = num($("reqUnitCost")?.value);

  if ($("reqTotal"))
    $("reqTotal").value = (q * c).toFixed(2);
}

async function saveReq(e) {
  e?.preventDefault();

  const id = $("reqId")?.value;

  calculateReqTotal();

  const expenseType =
    $("reqExpenseType")?.value ||
    $("reqCategory")?.value ||
    "Materials";

  const record = {
    req_no: $("reqNo")?.value.trim() || "",
    req_date: $("reqDate")?.value || today(),
    requested_by: $("reqRequestedBy")?.value.trim() || "",
    vehicle_id: $("reqVehicle")?.value || null,
    item_description:
      $("reqItemDescription")?.value.trim() || "",
    quantity: num($("reqQuantity")?.value) || 1,
    unit_cost: num($("reqUnitCost")?.value),
    total_amount:
      num($("reqQuantity")?.value) *
      num($("reqUnitCost")?.value),
    status: $("reqStatus")?.value || "Pending",
    notes: $("reqNotes")?.value.trim() || null,
    expense_type: expenseType
  };

  if (!record.req_no || !record.requested_by ||
      !record.item_description) {
    toast("Please complete the requisition");
    return;
  }

  const result = id
    ? await supabase.from("requisitions").update(record).eq("id", id)
    : await supabase.from("requisitions").insert(record);

  if (result.error) {
    toast(errorMessage(result.error));
    return;
  }

  closeModal("reqModal");
  toast("Requisition saved");
  await loadAllData();
}

async function deleteReq(id) {
  if (!confirm("Delete this requisition?")) return;

  const { error } =
    await supabase.from("requisitions").delete().eq("id", id);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  toast("Requisition deleted");
  await loadAllData();
}

function viewReq(id) {
  const r = requisitions.find(x => String(x.id) === String(id));
  if (!r) return;

  const v = vehicleById(r.vehicle_id);

  showPreview(
    `Requisition ${r.req_no}`,
    `
      <h2>REQUISITION</h2>

      <p><strong>No:</strong> ${esc(r.req_no)}</p>
      <p><strong>Date:</strong> ${esc(r.req_date)}</p>
      <p><strong>Requested By:</strong> ${esc(r.requested_by)}</p>
      <p><strong>Vehicle:</strong> ${esc(v?.registration || "")}</p>
      <p><strong>Item:</strong> ${esc(r.item_description)}</p>
      <p><strong>Quantity:</strong> ${num(r.quantity)}</p>
      <p><strong>Unit Cost:</strong> ${money(r.unit_cost)}</p>
      <p><strong>Total:</strong> ${money(r.total_amount)}</p>
      <p><strong>Status:</strong> ${esc(r.status)}</p>
      <p><strong>Notes:</strong> ${esc(r.notes || "")}</p>
    `
  );
}

function shareReq(id) {
  const r = requisitions.find(x => String(x.id) === String(id));
  if (!r) return;

  const v = vehicleById(r.vehicle_id);

  shareText(
    `Requisition ${r.req_no}`,
`CRYSTAL MOTORS (K) LTD

REQUISITION: ${r.req_no}
Date: ${r.req_date}
Requested By: ${r.requested_by}
Vehicle: ${v?.registration || ""}
Item: ${r.item_description}
Quantity: ${r.quantity}
Unit Cost: ${money(r.unit_cost)}
Total: ${money(r.total_amount)}
Status: ${r.status}
Notes: ${r.notes || ""}`
  );
}

/* =========================================================
   INVOICES
   ========================================================= */

function renderInvoices() {
  const body = $("invoicesTableBody");
  if (!body) return;

  const search = ($("invoiceSearch")?.value || "").toLowerCase();
  const status = $("invoiceStatusFilter")?.value || "";

  const list = invoices.filter(i => {
    const v = vehicleById(i.vehicle_id);

    const matchesSearch =
      !search ||
      [
        i.invoice_no,
        i.customer,
        i.job_description,
        i.status,
        v?.registration
      ].some(x =>
        String(x || "").toLowerCase().includes(search)
      );

    const matchesStatus =
      !status || i.status === status;

    return matchesSearch && matchesStatus;
  });

  body.innerHTML = list.map(i => {
    const v = vehicleById(i.vehicle_id);

    return `
      <tr>
        <td>${esc(i.invoice_no)}</td>
        <td>${esc(i.invoice_date)}</td>
        <td>${esc(v?.registration || "")}</td>
        <td>${esc(i.customer || v?.customer || "")}</td>
        <td>${money(i.subtotal)}</td>
        <td>${money(i.paid)}</td>
        <td>${money(i.balance)}</td>
        <td>${esc(i.status)}</td>

        <td>
          <div class="table-actions">
            <button class="action-btn"
              title="Edit"
              onclick="editInvoice('${i.id}')">✏️</button>

            <button class="action-btn blue"
              title="View"
              onclick="viewInvoice('${i.id}')">👁️</button>

            <button class="action-btn green"
              title="Share"
              onclick="shareInvoice('${i.id}')">📤</button>

            <button class="action-btn danger"
              title="Delete"
              onclick="deleteInvoice('${i.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join("") || `
    <tr><td colspan="9">No invoices found.</td></tr>
  `;
}

function openInvoiceModal() {
  $("invoiceForm")?.reset();

  if ($("invoiceId")) $("invoiceId").value = "";
  if ($("invoiceDate")) $("invoiceDate").value = today();

  fillVehicleSelect("invoiceVehicle");

  $("invoiceModalTitle").textContent = "Add Invoice";

  calculateInvoice();
  openModal("invoiceModal");
}

function editInvoice(id) {
  const i = invoices.find(x => String(x.id) === String(id));
  if (!i) return;

  fillVehicleSelect("invoiceVehicle");

  $("invoiceId").value = i.id;
  $("invoiceNo").value = i.invoice_no || "";
  $("invoiceDate").value = i.invoice_date || "";
  $("invoiceVehicle").value = i.vehicle_id || "";
  $("invoiceCustomer").value = i.customer || "";
  $("invoiceJobDescription").value = i.job_description || "";
  $("invoiceLabour").value = i.labour || 0;
  $("invoiceParts").value = i.parts || 0;
  $("invoiceOther").value = i.other || 0;
  $("invoiceSubtotal").value = i.subtotal || 0;
  $("invoicePaid").value = i.paid || 0;
  $("invoiceBalance").value = i.balance || 0;
  $("invoiceStatus").value = i.status || "Pending";
  $("invoiceNotes").value = i.notes || "";

  $("invoiceModalTitle").textContent = "Edit Invoice";

  openModal("invoiceModal");
}

function calculateInvoice() {
  const labour = num($("invoiceLabour")?.value);
  const parts = num($("invoiceParts")?.value);
  const other = num($("invoiceOther")?.value);
  const paid = num($("invoicePaid")?.value);

  const subtotal = labour + parts + other;
  const balance = subtotal - paid;

  if ($("invoiceSubtotal"))
    $("invoiceSubtotal").value = subtotal.toFixed(2);

  if ($("invoiceBalance"))
    $("invoiceBalance").value = balance.toFixed(2);
}

async function saveInvoice(e) {
  e?.preventDefault();

  const id = $("invoiceId")?.value;

  calculateInvoice();

  const vehicleId = $("invoiceVehicle")?.value || null;
  const v = vehicleById(vehicleId);

  const subtotal =
    num($("invoiceLabour")?.value) +
    num($("invoiceParts")?.value) +
    num($("invoiceOther")?.value);

  const paid = num($("invoicePaid")?.value);

  const record = {
    invoice_no: $("invoiceNo")?.value.trim() || "",
    invoice_date: $("invoiceDate")?.value || today(),
    vehicle_id: vehicleId,
    customer:
      $("invoiceCustomer")?.value.trim() ||
      v?.customer ||
      null,
    job_description:
      $("invoiceJobDescription")?.value.trim() || "",
    labour: num($("invoiceLabour")?.value),
    parts: num($("invoiceParts")?.value),
    other: num($("invoiceOther")?.value),
    subtotal,
    paid,
    balance: subtotal - paid,
    status: $("invoiceStatus")?.value || "Pending",
    notes: $("invoiceNotes")?.value.trim() || null
  };

  if (!record.invoice_no) {
    toast("Invoice number is required");
    return;
  }

  const result = id
    ? await supabase.from("invoices").update(record).eq("id", id)
    : await supabase.from("invoices").insert(record);

  if (result.error) {
    toast(errorMessage(result.error));
    return;
  }

  closeModal("invoiceModal");
  toast("Invoice saved");
  await loadAllData();
}

async function deleteInvoice(id) {
  if (!confirm("Delete this invoice?")) return;

  const { error } =
    await supabase.from("invoices").delete().eq("id", id);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  toast("Invoice deleted");
  await loadAllData();
}

function viewInvoice(id) {
  const i = invoices.find(x => String(x.id) === String(id));
  if (!i) return;

  const v = vehicleById(i.vehicle_id);

  showPreview(
    `Invoice ${i.invoice_no}`,
    `
      <h2>CRYSTAL MOTORS (K) LTD</h2>

      <h2>INVOICE</h2>

      <p><strong>Invoice No:</strong> ${esc(i.invoice_no)}</p>
      <p><strong>Date:</strong> ${esc(i.invoice_date)}</p>
      <p><strong>Vehicle:</strong> ${esc(v?.registration || "")}</p>
      <p><strong>Customer:</strong> ${esc(i.customer || "")}</p>
      <p><strong>Job:</strong> ${esc(i.job_description || "")}</p>

      <hr>

      <p><strong>Labour:</strong> ${money(i.labour)}</p>
      <p><strong>Parts:</strong> ${money(i.parts)}</p>
      <p><strong>Other:</strong> ${money(i.other)}</p>
      <p><strong>Subtotal:</strong> ${money(i.subtotal)}</p>
      <p><strong>Paid:</strong> ${money(i.paid)}</p>
      <p><strong>Balance:</strong> ${money(i.balance)}</p>
      <p><strong>Status:</strong> ${esc(i.status)}</p>
    `
  );
}

function shareInvoice(id) {
  const i = invoices.find(x => String(x.id) === String(id));
  if (!i) return;

  const v = vehicleById(i.vehicle_id);

  shareText(
    `Invoice ${i.invoice_no}`,
`CRYSTAL MOTORS (K) LTD

INVOICE: ${i.invoice_no}
Date: ${i.invoice_date}
Vehicle: ${v?.registration || ""}
Customer: ${i.customer || ""}
Job: ${i.job_description || ""}

Labour: ${money(i.labour)}
Parts: ${money(i.parts)}
Other: ${money(i.other)}
Subtotal: ${money(i.subtotal)}
Paid: ${money(i.paid)}
Balance: ${money(i.balance)}
Status: ${i.status}`
  );
}

/* =========================================================
   GATE PASSES
   ========================================================= */

function renderGatePasses() {
  const body = $("gatePassesTableBody");
  if (!body) return;

  const search = ($("gateSearch")?.value || "").toLowerCase();
  const status = $("gateStatusFilter")?.value || "";

  const list = gatePasses.filter(g => {
    const v = vehicleById(g.vehicle_id);

    const matchesSearch =
      !search ||
      [
        g.gate_pass_no,
        g.registration,
        g.customer,
        g.released_to,
        g.status,
        v?.registration
      ].some(x =>
        String(x || "").toLowerCase().includes(search)
      );

    const matchesStatus =
      !status || g.status === status;

    return matchesSearch && matchesStatus;
  });

  body.innerHTML = list.map(g => {
    const v = vehicleById(g.vehicle_id);

    return `
      <tr>
        <td>${esc(g.gate_pass_no)}</td>
        <td>${esc(g.gate_pass_date)}</td>
        <td>${esc(v?.registration || g.registration || "")}</td>
        <td>${esc(g.customer || v?.customer || "")}</td>
        <td>${esc(g.released_to || "")}</td>
        <td>${esc(g.released_contact || "")}</td>
        <td>${money(g.paid)}</td>
        <td>${money(g.balance)}</td>
        <td>${esc(g.status)}</td>

        <td>
          <div class="table-actions">

            <button class="action-btn"
              title="Edit"
              onclick="editGatePass('${g.id}')">✏️</button>

            <button class="action-btn blue"
              title="View"
              onclick="viewGatePass('${g.id}')">👁️</button>

            <button class="action-btn green"
              title="Share"
              onclick="shareGatePass('${g.id}')">📤</button>

            <button class="action-btn danger"
              title="Delete"
              onclick="deleteGatePass('${g.id}')">🗑️</button>

          </div>
        </td>
      </tr>
    `;
  }).join("") || `
    <tr><td colspan="10">No gate passes found.</td></tr>
  `;
}

function openGatePassModal() {
  $("gatePassForm")?.reset();

  if ($("gatePassId")) $("gatePassId").value = "";
  if ($("gatePassDate")) $("gatePassDate").value = today();

  fillVehicleSelect("gateVehicle");

  $("gatePassModalTitle").textContent = "Add Gate Pass";

  openModal("gatePassModal");
}

function editGatePass(id) {
  const g = gatePasses.find(x => String(x.id) === String(id));
  if (!g) return;

  fillVehicleSelect("gateVehicle");

  $("gatePassId").value = g.id;
  $("gatePassNo").value = g.gate_pass_no || "";
  $("gatePassDate").value = g.gate_pass_date || "";
  $("gateVehicle").value = g.vehicle_id || "";
  $("gateVehicleRegistration").value = g.registration || "";
  $("gateCustomer").value = g.customer || "";
  $("gateReleasedTo").value = g.released_to || "";
  $("gateReleasedContact").value = g.released_contact || "";
  $("gateInvoice").value = g.invoice_id || "";
  $("gatePaid").value = g.paid || 0;
  $("gateBalance").value = g.balance || 0;
  $("gateAuthorizedBy").value = g.authorized_by || "";
  $("gateStatus").value = g.status || "Pending";
  $("gateNotes").value = g.notes || "";

  $("gatePassModalTitle").textContent = "Edit Gate Pass";

  openModal("gatePassModal");
}

async function saveGatePass(e) {
  e?.preventDefault();

  const id = $("gatePassId")?.value;

  const vehicleId = $("gateVehicle")?.value || null;
  const v = vehicleById(vehicleId);

  const invoiceId = $("gateInvoice")?.value || null;

  let balance = num($("gateBalance")?.value);

  if (invoiceId) {
    const inv = invoices.find(x =>
      String(x.id) === String(invoiceId)
    );

    if (inv) {
      balance =
        num(inv.subtotal) -
        num($("gatePaid")?.value);
    }
  }

  const record = {
    gate_pass_no:
      $("gatePassNo")?.value.trim() || "",

    gate_pass_date:
      $("gatePassDate")?.value || today(),

    vehicle_id: vehicleId,

    registration:
      $("gateVehicleRegistration")?.value.trim() ||
      v?.registration ||
      null,

    customer:
      $("gateCustomer")?.value.trim() ||
      v?.customer ||
      null,

    released_to:
      $("gateReleasedTo")?.value.trim() || null,

    released_contact:
      $("gateReleasedContact")?.value.trim() || null,

    invoice_id: invoiceId,

    paid:
      num($("gatePaid")?.value),

    balance,

    authorized_by:
      $("gateAuthorizedBy")?.value.trim() || null,

    status:
      $("gateStatus")?.value || "Pending",

    notes:
      $("gateNotes")?.value.trim() || null
  };

  if (!record.gate_pass_no) {
    toast("Gate pass number is required");
    return;
  }

  const result = id
    ? await supabase.from("gate_passes").update(record).eq("id", id)
    : await supabase.from("gate_passes").insert(record);

  if (result.error) {
    toast(errorMessage(result.error));
    return;
  }

  closeModal("gatePassModal");
  toast("Gate pass saved");
  await loadAllData();
}

async function deleteGatePass(id) {
  if (!confirm("Delete this gate pass?")) return;

  const { error } =
    await supabase.from("gate_passes").delete().eq("id", id);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  toast("Gate pass deleted");
  await loadAllData();
}

function viewGatePass(id) {
  const g = gatePasses.find(x => String(x.id) === String(id));
  if (!g) return;

  const v = vehicleById(g.vehicle_id);

  showPreview(
    `Gate Pass ${g.gate_pass_no}`,
    `
      <h2>CRYSTAL MOTORS (K) LTD</h2>

      <h2>GATE PASS</h2>

      <p><strong>Gate Pass No:</strong>
        ${esc(g.gate_pass_no)}</p>

      <p><strong>Date:</strong>
        ${esc(g.gate_pass_date)}</p>

      <p><strong>Vehicle:</strong>
        ${esc(v?.registration || g.registration || "")}</p>

      <p><strong>Customer:</strong>
        ${esc(g.customer || "")}</p>

      <p><strong>Released To:</strong>
        ${esc(g.released_to || "")}</p>

      <p><strong>Contact:</strong>
        ${esc(g.released_contact || "")}</p>

      <p><strong>Paid:</strong>
        ${money(g.paid)}</p>

      <p><strong>Balance:</strong>
        ${money(g.balance)}</p>

      <p><strong>Authorized By:</strong>
        ${esc(g.authorized_by || "")}</p>

      <p><strong>Status:</strong>
        ${esc(g.status)}</p>

      <p><strong>Notes:</strong>
        ${esc(g.notes || "")}</p>
    `
  );
}

function shareGatePass(id) {
  const g = gatePasses.find(x => String(x.id) === String(id));
  if (!g) return;

  const v = vehicleById(g.vehicle_id);

  shareText(
    `Gate Pass ${g.gate_pass_no}`,
`CRYSTAL MOTORS (K) LTD

GATE PASS: ${g.gate_pass_no}
Date: ${g.gate_pass_date}
Vehicle: ${v?.registration || g.registration || ""}
Customer: ${g.customer || ""}
Released To: ${g.released_to || ""}
Contact: ${g.released_contact || ""}
Paid: ${money(g.paid)}
Balance: ${money(g.balance)}
Authorized By: ${g.authorized_by || ""}
Status: ${g.status}`
  );
}

/* =========================================================
   ESTIMATES
   ========================================================= */

function ensureEstimateSection() {
  if ($("estimates")) return;

  const section = document.createElement("section");
  section.id = "estimates";
  section.className = "section";
  section.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Estimates / Quotations</h2>
        <p>Create and manage repair estimates.</p>
      </div>

      <button class="primary-btn" onclick="openEstimateModal()">
        + Add Estimate
      </button>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Estimate No.</th>
            <th>Date</th>
            <th>Company</th>
            <th>Vehicle</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="estimatesTableBody"></tbody>
      </table>
    </div>
  `;

  $("app")?.appendChild(section);
}

function renderEstimates() {
  ensureEstimateSection();

  const body = $("estimatesTableBody");
  if (!body) return;

  body.innerHTML = estimates.map(e => {
    const v = vehicleById(e.vehicle_id);

    return `
      <tr>
        <td>${esc(e.estimate_no)}</td>
        <td>${esc(e.estimate_date)}</td>
        <td>${esc(e.company_name)}</td>
        <td>${esc(v?.registration || e.registration || "")}</td>
        <td>${esc(e.customer || "")}</td>
        <td>${money(e.total_amount)}</td>

        <td>
          <div class="table-actions">
            <button class="action-btn"
              title="Edit"
              onclick="editEstimate('${e.id}')">✏️</button>

            <button class="action-btn blue"
              title="View"
              onclick="viewEstimate('${e.id}')">👁️</button>

            <button class="action-btn green"
              title="Share"
              onclick="shareEstimate('${e.id}')">📤</button>

            <button class="action-btn danger"
              title="Delete"
              onclick="deleteEstimate('${e.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join("") || `
    <tr><td colspan="7">No estimates found.</td></tr>
  `;
}

function openEstimateModal() {
  let modal = $("estimateModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "estimateModal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">

        <button class="modal-close"
          onclick="closeModal('estimateModal')">×</button>

        <h2 id="estimateModalTitle">Add Estimate</h2>

        <form id="estimateForm">

          <input type="hidden" id="estimateId">

          <label>Company</label>
          <select id="estimateCompany">
            <option value="CRYSTAL MOTORS (K) LTD">
              CRYSTAL MOTORS (K) LTD
            </option>
            <option value="QUARRY ROUTE MOTORS LTD">
              QUARRY ROUTE MOTORS LTD
            </option>
          </select>

          <label>Estimate No.</label>
          <input id="estimateNo" required>

          <label>Date</label>
          <input type="date" id="estimateDate" required>

          <label>Vehicle</label>
          <select id="estimateVehicle"></select>

          <label>Customer</label>
          <input id="estimateCustomer">

          <label>Customer Phone</label>
          <input id="estimateCustomerPhone">

          <label>Vehicle Model</label>
          <input id="estimateVehicleModel">

          <label>Chassis No.</label>
          <input id="estimateChassis">

          <label>Subtotal</label>
          <input type="number" step="0.01" id="estimateSubtotal">

          <label>VAT %</label>
          <input type="number" step="0.01"
            id="estimateVatRate" value="16">

          <label>VAT Amount</label>
          <input type="number" step="0.01"
            id="estimateVatAmount">

          <label>Total</label>
          <input type="number" step="0.01"
            id="estimateTotal">

          <label>Notes</label>
          <textarea id="estimateNotes"></textarea>

          <button class="primary-btn" type="submit">
            Save Estimate
          </button>

        </form>
      </div>
    `;

    document.body.appendChild(modal);

    $("estimateForm").addEventListener(
      "submit",
      saveEstimate
    );

    $("estimateSubtotal").addEventListener(
      "input",
      calculateEstimate
    );

    $("estimateVatRate").addEventListener(
      "input",
      calculateEstimate
    );
  }

  $("estimateForm")?.reset();

  $("estimateId").value = "";
  $("estimateDate").value = today();
  $("estimateVatRate").value = 16;

  fillVehicleSelect("estimateVehicle");

  $("estimateModalTitle").textContent =
    "Add Estimate";

  calculateEstimate();

  openModal("estimateModal");
}

function calculateEstimate() {
  const subtotal = num($("estimateSubtotal")?.value);
  const rate = num($("estimateVatRate")?.value);

  const vat = subtotal * rate / 100;
  const total = subtotal + vat;

  if ($("estimateVatAmount"))
    $("estimateVatAmount").value = vat.toFixed(2);

  if ($("estimateTotal"))
    $("estimateTotal").value = total.toFixed(2);
}

function editEstimate(id) {
  const e = estimates.find(x => String(x.id) === String(id));
  if (!e) return;

  openEstimateModal();

  $("estimateId").value = e.id;
  $("estimateCompany").value =
    e.company_name || "CRYSTAL MOTORS (K) LTD";

  $("estimateNo").value = e.estimate_no || "";
  $("estimateDate").value = e.estimate_date || "";
  $("estimateVehicle").value = e.vehicle_id || "";
  $("estimateCustomer").value = e.customer || "";
  $("estimateCustomerPhone").value =
    e.customer_phone || "";

  $("estimateVehicleModel").value =
    e.vehicle_model || "";

  $("estimateChassis").value =
    e.chassis_no || "";

  $("estimateSubtotal").value =
    e.subtotal || 0;

  $("estimateVatRate").value =
    e.vat_rate || 16;

  $("estimateVatAmount").value =
    e.vat_amount || 0;

  $("estimateTotal").value =
    e.total_amount || 0;

  $("estimateNotes").value =
    e.notes || "";

  $("estimateModalTitle").textContent =
    "Edit Estimate";
}

async function saveEstimate(e) {
  e?.preventDefault();

  calculateEstimate();

  const id = $("estimateId")?.value;
  const vehicleId = $("estimateVehicle")?.value || null;
  const v = vehicleById(vehicleId);

  const record = {
    estimate_no:
      $("estimateNo")?.value.trim() || "",

    estimate_date:
      $("estimateDate")?.value || today(),

    company_name:
      $("estimateCompany")?.value ||
      "CRYSTAL MOTORS (K) LTD",

    customer:
      $("estimateCustomer")?.value.trim() || null,

    customer_phone:
      $("estimateCustomerPhone")?.value.trim() || null,

    vehicle_id: vehicleId,

    registration:
      v?.registration || null,

    chassis_no:
      $("estimateChassis")?.value.trim() || null,

    vehicle_model:
      $("estimateVehicleModel")?.value.trim() ||
      v?.model ||
      null,

    subtotal:
      num($("estimateSubtotal")?.value),

    vat_rate:
      num($("estimateVatRate")?.value),

    vat_amount:
      num($("estimateVatAmount")?.value),

    total_amount:
      num($("estimateTotal")?.value),

    notes:
      $("estimateNotes")?.value.trim() || null
  };

  if (!record.estimate_no) {
    toast("Estimate number is required");
    return;
  }

  const result = id
    ? await supabase.from("estimates").update(record).eq("id", id)
    : await supabase.from("estimates").insert(record);

  if (result.error) {
    toast(errorMessage(result.error));
    return;
  }

  closeModal("estimateModal");
  toast("Estimate saved");

  await loadAllData();
}

async function deleteEstimate(id) {
  if (!confirm("Delete this estimate?")) return;

  const { error } =
    await supabase.from("estimates").delete().eq("id", id);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  toast("Estimate deleted");
  await loadAllData();
}

function estimateCompanyDetails(company) {
  if (company === "QUARRY ROUTE MOTORS LTD") {
    return `
      <strong>QUARRY ROUTE MOTORS LTD</strong><br>
      P.O. Box 54385 – 00200, Nairobi<br>
      Cell: 0722 707124 / 0723 914 222<br>
      Off Mombasa Road, Along Quarry Road,
      Near Mlolongo Weigh Bridge<br>
      info@quarryroutemotors.com<br>
      quarryroutemotorsltd@gmail.com
    `;
  }

  return `
    <strong>CRYSTAL MOTORS (K) LTD</strong><br>
    P.O. Box 54385 – 00200, Nairobi<br>
    Cell: 0722 707124 | 0723 914 222<br>
    Off Mombasa Road, Along Quarry Road,
    Near Mlolongo Weighbridge
  `;
}

function viewEstimate(id) {
  const e = estimates.find(x => String(x.id) === String(id));
  if (!e) return;

  const v = vehicleById(e.vehicle_id);

  showPreview(
    `Estimate ${e.estimate_no}`,
    `
      <div class="print-document">

        <h2>${estimateCompanyDetails(e.company_name)}</h2>

        <hr>

        <h2>REPAIR ESTIMATE / QUOTATION</h2>

        <p>
          <strong>Estimate No:</strong>
          ${esc(e.estimate_no)}
        </p>

        <p>
          <strong>Date:</strong>
          ${esc(e.estimate_date)}
        </p>

        <p>
          <strong>Vehicle:</strong>
          ${esc(v?.registration || e.registration || "")}
        </p>

        <p>
          <strong>Customer:</strong>
          ${esc(e.customer || "")}
        </p>

        <p>
          <strong>Vehicle Model:</strong>
          ${esc(e.vehicle_model || "")}
        </p>

        <p>
          <strong>Chassis No:</strong>
          ${esc(e.chassis_no || "")}
        </p>

        <hr>

        <p><strong>Subtotal:</strong>
          ${money(e.subtotal)}</p>

        <p><strong>VAT (${num(e.vat_rate)}%):</strong>
          ${money(e.vat_amount)}</p>

        <h2>TOTAL: ${money(e.total_amount)}</h2>

        <p>
          <strong>Notes:</strong><br>
          ${esc(e.notes || "")}
        </p>

      </div>
    `
  );
}

function shareEstimate(id) {
  const e = estimates.find(x => String(x.id) === String(id));
  if (!e) return;

  const v = vehicleById(e.vehicle_id);

  shareText(
    `Estimate ${e.estimate_no}`,
`${e.company_name}

ESTIMATE / QUOTATION
No: ${e.estimate_no}
Date: ${e.estimate_date}

Vehicle: ${v?.registration || e.registration || ""}
Customer: ${e.customer || ""}
Model: ${e.vehicle_model || ""}
Chassis: ${e.chassis_no || ""}

Subtotal: ${money(e.subtotal)}
VAT: ${money(e.vat_amount)}
TOTAL: ${money(e.total_amount)}

${e.notes || ""}`
  );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {
  const totalBilled = vehicles.reduce(
    (sum, v) => sum + num(v.billed),
    0
  );

  const totalPaid = vehicles.reduce(
    (sum, v) => sum + num(v.paid),
    0
  );

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + num(e.amount),
    0
  );

  const totalPetty = pettyCash.reduce(
    (sum, p) => sum + num(p.amount),
    0
  );

  const pendingReq = requisitions.filter(
    r => String(r.status).toLowerCase() === "pending"
  ).length;

  const pendingInvoices = invoices.filter(
    i => String(i.status).toLowerCase() === "pending"
  ).length;

  const pendingGates = gatePasses.filter(
    g => String(g.status).toLowerCase() === "pending"
  ).length;

  setText("dashVehicles", vehicles.length);
  setText(
    "dashRepair",
    vehicles.filter(v =>
      String(v.status).toLowerCase() === "under repair"
    ).length
  );

  setText(
    "dashOutstanding",
    money(totalBilled - totalPaid)
  );

  setText("dashReq", pendingReq);
  setText("dashInvoices", pendingInvoices);
  setText("dashGatePasses", pendingGates);
  setText("dashBilled", money(totalBilled));
  setText("dashPaid", money(totalPaid));
  setText("dashExpenses", money(totalExpenses));
  setText("dashPetty", money(totalPetty));
  setText("dashReqCount", pendingReq);

  setText(
    "dashReqTotal",
    money(
      requisitions
        .filter(r =>
          String(r.status).toLowerCase() === "pending"
        )
        .reduce((s, r) => s + num(r.total_amount), 0)
    )
  );

  renderVehicleStatusSummary();
  renderActivity();
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function renderVehicleStatusSummary() {
  const el = $("vehicleStatusSummary");
  if (!el) return;

  const counts = {};

  vehicles.forEach(v => {
    const status = v.status || "Unknown";
    counts[status] = (counts[status] || 0) + 1;
  });

  el.innerHTML = Object.entries(counts).map(
    ([status, count]) =>
      `<div><strong>${esc(status)}</strong>: ${count}</div>`
  ).join("") || "No vehicles";
}

function renderActivity() {
  const el = $("dashboardActivity");
  if (!el) return;

  const items = [
    ...vehicles.map(v => ({
      date: v.created_at || v.date_in,
      text: `Vehicle ${v.registration} added`
    })),

    ...expenses.map(e => ({
      date: e.created_at || e.expense_date,
      text: `Expense ${money(e.amount)} — ${e.description}`
    })),

    ...invoices.map(i => ({
      date: i.created_at || i.invoice_date,
      text: `Invoice ${i.invoice_no}`
    }))
  ]
  .sort((a, b) =>
    String(b.date || "").localeCompare(
      String(a.date || "")
    )
  )
  .slice(0, 10);

  el.innerHTML = items.map(x =>
    `<div class="activity-item">
      <strong>${esc(x.text)}</strong>
      <small>${esc(x.date || "")}</small>
    </div>`
  ).join("") || "No recent activity.";
}

/* =========================================================
   SEARCH EVENTS
   ========================================================= */

[
  "vehicleSearch",
  "vehicleStatusFilter",
  "expenseSearch",
  "expenseCategoryFilter",
  "pettySearch",
  "pettyCategoryFilter",
  "reqSearch",
  "reqStatusFilter",
  "invoiceSearch",
  "invoiceStatusFilter",
  "gateSearch",
  "gateStatusFilter"
].forEach(id => {
  $(id)?.addEventListener("input", renderAll);
  $(id)?.addEventListener("change", renderAll);
});

/* =========================================================
   CALCULATION EVENTS
   ========================================================= */

["reqQuantity", "reqUnitCost"].forEach(id => {
  $(id)?.addEventListener("input", calculateReqTotal);
});

[
  "invoiceLabour",
  "invoiceParts",
  "invoiceOther",
  "invoicePaid"
].forEach(id => {
  $(id)?.addEventListener("input", calculateInvoice);
});

/* =========================================================
   FORM EVENTS
   ========================================================= */

$("vehicleForm")?.addEventListener("submit", saveVehicle);
$("expenseForm")?.addEventListener("submit", saveExpense);
$("pettyForm")?.addEventListener("submit", savePetty);
$("reqForm")?.addEventListener("submit", saveReq);
$("invoiceForm")?.addEventListener("submit", saveInvoice);
$("gatePassForm")?.addEventListener("submit", saveGatePass);

/* =========================================================
   PREVIEW
   ========================================================= */

function showPreview(title, html) {
  if ($("previewTitle"))
    $("previewTitle").textContent = title;

  if ($("previewContent"))
    $("previewContent").innerHTML = html;

  openModal("previewModal");
}

function printCurrentPreview() {
  const html = $("previewContent")?.innerHTML || "";

  if (!html) {
    toast("Nothing to print");
    return;
  }

  printHTML(`
    <html>
      <head>
        <title>${esc($("previewTitle")?.textContent || "Report")}</title>
        <style>
          body{
            font-family:Arial,sans-serif;
            padding:30px;
            color:#111;
          }

          table{
            width:100%;
            border-collapse:collapse;
          }

          th,td{
            border:1px solid #ccc;
            padding:8px;
          }

          th{
            font-weight:bold;
          }
        </style>
      </head>

      <body>${html}</body>
    </html>
  `);
}

function printElement(id, title) {
  const html = $(id)?.innerHTML || "";

  if (!html) {
    toast("Nothing to print");
    return;
  }

  printHTML(`
    <html>
      <head>
        <title>${esc(title)}</title>
        <style>
          body{
            font-family:Arial,sans-serif;
            padding:30px;
            color:#111;
          }

          table{
            width:100%;
            border-collapse:collapse;
          }

          th,td{
            border:1px solid #ccc;
            padding:8px;
          }
        </style>
      </head>

      <body>${html}</body>
    </html>
  `);
}

function printHTML(html) {
  const w = window.open("", "_blank");

  if (!w) {
    toast("Please allow pop-ups to print");
    return;
  }

  w.document.open();
  w.document.write(html);
  w.document.close();

  setTimeout(() => {
    w.focus();
    w.print();
  }, 300);
}

/* =========================================================
   PRINT FUNCTIONS REQUIRED BY HTML
   ========================================================= */

function printVehicles() {
  printElement(
    "vehiclesTableBody",
    "Vehicles"
  );
}

function printExpenses() {
  printElement(
    "expensesTableBody",
    "Vehicle Expenses"
  );
}

function printPettyCash() {
  printElement(
    "pettyTableBody",
    "Petty Cash"
  );
}

function printRequisitions() {
  printElement(
    "requisitionsTableBody",
    "Requisitions"
  );
}

function printInvoices() {
  printElement(
    "invoicesTableBody",
    "Invoices"
  );
}

function printGatePasses() {
  printElement(
    "gatePassesTableBody",
    "Gate Passes"
  );
}

/* =========================================================
   SECTION NAVIGATION
   ========================================================= */

function showSection(sectionId) {
  document
    .querySelectorAll(".section,.app-section")
    .forEach(section => {
      section.style.display = "none";
      section.classList.remove("active");
    });

  const target = $(sectionId);

  if (target) {
    target.style.display = "";
    target.classList.add("active");
  }

  document
    .querySelectorAll("[data-section]")
    .forEach(btn => {
      btn.classList.toggle(
        "active",
        btn.dataset.section === sectionId
      );
    });

  if (sectionId === "estimates") {
    ensureEstimateSection();
    renderEstimates();
  }
}

/* =========================================================
   DASHBOARD CARD CLICKING
   ========================================================= */

function setupDashboardCards() {
  const map = {
    dashVehicles: "vehicles",
    dashRepair: "vehicles",
    dashOutstanding: "vehicles",
    dashReq: "requisitions",
    dashInvoices: "invoices",
    dashGatePasses: "gate-passes",
    dashBilled: "vehicles",
    dashPaid: "vehicles",
    dashExpenses: "expenses",
    dashPetty: "petty-cash"
  };

  Object.entries(map).forEach(([id, section]) => {
    const el = $(id);
    if (!el) return;

    const card =
      el.closest(".kpi-card") ||
      el.closest(".stat-card") ||
      el.closest(".dashboard-card") ||
      el.parentElement;

    if (!card) return;

    card.style.cursor = "pointer";

    card.addEventListener("click", () => {
      showSection(section);
    });
  });
}

/* =========================================================
   EXPOSE FUNCTIONS TO HTML
   ========================================================= */

Object.assign(window, {
  supabase,

  loadAllData,
  renderAll,

  showSection,

  openVehicleModal,
  editVehicle,
  saveVehicle,
  deleteVehicle,
  viewVehicle,
  shareVehicle,

  viewVehicleExpenses,
  printVehicleExpenses,

  openExpenseModal,
  editExpense,
  saveExpense,
  deleteExpense,
  viewExpense,
  shareExpense,

  openPettyModal,
  editPetty,
  savePetty,
  deletePetty,
  viewPetty,
  sharePetty,

  openReqModal,
  editReq,
  saveReq,
  deleteReq,
  viewReq,
  shareReq,
  calculateReqTotal,

  openInvoiceModal,
  editInvoice,
  saveInvoice,
  deleteInvoice,
  viewInvoice,
  shareInvoice,
  calculateInvoice,

  openGatePassModal,
  editGatePass,
  saveGatePass,
  deleteGatePass,
  viewGatePass,
  shareGatePass,

  openEstimateModal,
  editEstimate,
  saveEstimate,
  deleteEstimate,
  viewEstimate,
  shareEstimate,
  calculateEstimate,

  printVehicles,
  printExpenses,
  printPettyCash,
  printRequisitions,
  printInvoices,
  printGatePasses,

  printCurrentPreview,

  closeModal,
  openModal,

  vehicleExpenseData,
  vehicleExpenseTotal
});

/* =========================================================
   START
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  setupDashboardCards();

  /* Default dates */
  [
    "vehicleDateIn",
    "expenseDate",
    "pettyDate",
    "reqDate",
    "invoiceDate",
    "gatePassDate"
  ].forEach(id => {
    const el = $(id);
    if (el && !el.value) el.value = today();
  });

  /* Load Supabase data */
  await loadAllData();

  /* Make dashboard cards clickable again
     after all elements have rendered. */
  setupDashboardCards();

  console.log(
    "Garage Operations Pro loaded:",
    {
      vehicles: vehicles.length,
      expenses: expenses.length,
      pettyCash: pettyCash.length,
      requisitions: requisitions.length,
      invoices: invoices.length,
      gatePasses: gatePasses.length,
      estimates: estimates.length
    }
  );
});
