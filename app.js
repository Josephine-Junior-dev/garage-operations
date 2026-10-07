/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE APP.JS
   Vehicles • Expenses • Petty Cash • Requisitions
   Invoices • Gate Passes
   Vehicle Expense Reports • Duplicate Protection
   ========================================================= */

import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
  "https://ptluwoeogfkqavhspdjj.supabase.co";

/*
  IMPORTANT:
  Paste the SAME Supabase anon/publishable key that was in
  your previous working app.js here.
*/
const SUPABASE_ANON_KEY =
  "PASTE_YOUR_EXISTING_SUPABASE_ANON_KEY_HERE";

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

let selectedVehicleForExpenses = null;
let selectedRequisition = null;
let selectedInvoice = null;
let selectedGatePass = null;


/* =========================================================
   HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value) {
  const n = Number(value || 0);
  return "KSh " + n.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function number(value) {
  const n = Number(value || 0);
  return n.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeRegistration(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function toast(message, error = false) {
  const el = $("toast");

  if (!el) {
    alert(message);
    return;
  }

  el.textContent = message;
  el.style.display = "block";
  el.style.background = error ? "#b42318" : "#07111f";

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    el.style.display = "none";
  }, 3000);
}

function closeModal(id) {
  const el = $(id);
  if (el) el.classList.remove("show");
}

window.closeModal = closeModal;

function openModal(id) {
  const el = $(id);
  if (el) el.classList.add("show");
}

function statusClass(status) {
  return String(status || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function vehicleById(id) {
  return vehicles.find(v => String(v.id) === String(id));
}

function vehicleName(id) {
  const v = vehicleById(id);
  return v ? v.registration : "General";
}

function calculateStorageDays(dateIn, dateOut) {
  if (!dateIn) return 0;

  const start = new Date(dateIn + "T00:00:00");

  let end;

  if (dateOut) {
    end = new Date(dateOut + "T00:00:00");
  } else {
    end = new Date();
    end.setHours(0, 0, 0, 0);
  }

  const difference =
    Math.floor((end - start) / 86400000) + 1;

  return Math.max(0, difference);
}


/* =========================================================
   SUPABASE LOAD
   ========================================================= */

async function loadTable(table) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn(table, error.message);
    return [];
  }

  return data || [];
}


async function loadAllData() {

  try {
    vehicles = await loadTable("vehicles");
    expenses = await loadTable("expenses");
    pettyCash = await loadTable("petty_cash");
    requisitions = await loadTable("requisitions");

    /*
      These two tables are deliberately loaded as well.
      If they don't exist yet, the rest of the application
      continues working.
    */
    invoices = await loadTable("invoices");
    gatePasses = await loadTable("gate_passes");

    renderEverything();

  } catch (error) {

    console.error(error);

    toast(
      "Unable to load some garage data. Check Supabase connection.",
      true
    );
  }
}


/* =========================================================
   SHOW / HIDE SECTIONS
   ========================================================= */

function showSection(section, button) {

  document
    .querySelectorAll(".app-section")
    .forEach(s => {
      s.style.display = "none";
      s.classList.remove("active");
    });

  const target = $(section);

  if (target) {
    target.style.display = "block";
    target.classList.add("active");
  }

  document
    .querySelectorAll(".nav-btn,.mobile-nav-btn")
    .forEach(b => b.classList.remove("active"));

  document
    .querySelectorAll(
      `.nav-btn[data-section="${section}"],` +
      `.mobile-nav-btn[data-section="${section}"]`
    )
    .forEach(b => b.classList.add("active"));

  if (button) {
    button.classList.add("active");
  }
}

window.showSection = showSection;


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {

  const totalVehicles = vehicles.length;

  const underRepair = vehicles.filter(v =>
    String(v.status || "").toLowerCase() === "under repair"
  ).length;

  const billed = vehicles.reduce(
    (sum, v) => sum + Number(v.billed || 0),
    0
  );

  const paid = vehicles.reduce(
    (sum, v) => sum + Number(v.paid || 0),
    0
  );

  const outstanding = Math.max(0, billed - paid);

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  const totalPetty = pettyCash.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const totalReq = requisitions.reduce(
    (sum, r) => sum + Number(r.total_amount || 0),
    0
  );

  if ($("dashVehicles"))
    $("dashVehicles").textContent = totalVehicles;

  if ($("dashRepair"))
    $("dashRepair").textContent = underRepair;

  if ($("dashOutstanding"))
    $("dashOutstanding").textContent = money(outstanding);

  if ($("dashReq"))
    $("dashReq").textContent = requisitions.length;

  if ($("dashBilled"))
    $("dashBilled").textContent = money(billed);

  if ($("dashPaid"))
    $("dashPaid").textContent = money(paid);

  if ($("dashExpenses"))
    $("dashExpenses").textContent = money(totalExpenses);

  if ($("dashPetty"))
    $("dashPetty").textContent = money(totalPetty);

  if ($("dashReqCount"))
    $("dashReqCount").textContent = requisitions.length;

  if ($("dashReqTotal"))
    $("dashReqTotal").textContent = money(totalReq);
}


/* =========================================================
   DASHBOARD ACTIVITY
   ========================================================= */

function renderActivity() {

  const box = $("dashboardActivity");

  if (!box) return;

  const activities = [];

  vehicles.slice(0, 5).forEach(v => {
    activities.push({
      icon: "🚘",
      title: `${v.registration || "Vehicle"} added/updated`,
      text: v.status || "Vehicle"
    });
  });

  expenses.slice(0, 5).forEach(e => {
    activities.push({
      icon: "💳",
      title: e.description || "Expense",
      text: `${vehicleName(e.vehicle_id)} • ${money(e.amount)}`
    });
  });

  requisitions.slice(0, 5).forEach(r => {
    activities.push({
      icon: "📋",
      title: r.req_no || "Requisition",
      text: `${r.item_description || ""} • ${money(r.total_amount)}`
    });
  });

  if (!activities.length) {
    box.innerHTML =
      `<div class="activity-item">
        <div class="activity-main">
          <strong>No recent activity</strong>
          <span>Garage activity will appear here.</span>
        </div>
      </div>`;
    return;
  }

  box.innerHTML = activities.slice(0, 10).map(a => `
    <div class="activity-item">
      <div class="activity-icon">${a.icon}</div>
      <div class="activity-main">
        <strong>${esc(a.title)}</strong>
        <span>${esc(a.text)}</span>
      </div>
    </div>
  `).join("");
}


/* =========================================================
   VEHICLE SELECT OPTIONS
   ========================================================= */

function populateVehicleSelects() {

  const selects = [
    $("expenseVehicle"),
    $("reqVehicle"),
    $("invoiceVehicle"),
    $("gatePassVehicle")
  ].filter(Boolean);

  selects.forEach(select => {

    const current = select.value;

    select.innerHTML =
      `<option value="">Select vehicle</option>` +
      vehicles
        .map(v =>
          `<option value="${esc(v.id)}">
            ${esc(v.registration)}
            ${v.customer ? " — " + esc(v.customer) : ""}
          </option>`
        )
        .join("");

    if (current)
      select.value = current;
  });
}


/* =========================================================
   VEHICLE EXPENSE TOTAL
   ========================================================= */

function vehicleExpenseTotal(vehicleId) {

  return expenses
    .filter(e => String(e.vehicle_id) === String(vehicleId))
    .reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0
    );
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
    $("vehicleStatusFilter")?.value || "";

  let list = vehicles.filter(v => {

    const text = [
      v.registration,
      v.customer,
      v.model,
      v.color
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !search || text.includes(search);

    const matchesStatus =
      !status || v.status === status;

    return matchesSearch && matchesStatus;
  });

  if (!list.length) {

    body.innerHTML = `
      <tr>
        <td colspan="11"
          style="text-align:center;padding:30px;color:#64748b">
          No vehicles found.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = list.map(v => {

    const storageDays =
      calculateStorageDays(
        v.date_in,
        v.date_out
      );

    const billed = Number(v.billed || 0);
    const paid = Number(v.paid || 0);
    const outstanding = Math.max(0, billed - paid);
    const expenseTotal = vehicleExpenseTotal(v.id);

    return `
      <tr>

        <td>
          <strong>${esc(v.registration || "")}</strong>
        </td>

        <td>${esc(v.customer || "")}</td>

        <td>${esc(v.date_in || "")}</td>

        <td>${esc(v.job_type || "")}</td>

        <td>
          <span class="status status-${statusClass(v.status)}">
            ${esc(v.status || "")}
          </span>
        </td>

        <td>
          <strong>${storageDays}</strong>
        </td>

        <td>${money(billed)}</td>

        <td>${money(paid)}</td>

        <td>
          <strong>${money(outstanding)}</strong>
        </td>

        <td>
          <strong>${money(expenseTotal)}</strong>
        </td>

        <td>
          <div class="table-actions">

            <button
              class="action-btn"
              title="Vehicle expenses"
              onclick="viewVehicleExpenses('${esc(v.id)}')">
              💳
            </button>

            <button
              class="action-btn"
              title="Invoice"
              onclick="createInvoiceForVehicle('${esc(v.id)}')">
              🧾
            </button>

            <button
              class="action-btn"
              title="Gate Pass"
              onclick="createGatePassForVehicle('${esc(v.id)}')">
              🎫
            </button>

            <button
              class="action-btn"
              title="Edit"
              onclick="editVehicle('${esc(v.id)}')">
              ✏️
            </button>

            <button
              class="action-btn"
              title="Delete"
              onclick="deleteVehicle('${esc(v.id)}')">
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

function openVehicleModal(id = null) {

  const form = $("vehicleForm");

  if (!form) return;

  form.reset();

  $("vehicleId").value = "";
  $("vehicleStorageDays").value = "0";
  $("vehicleBilled").value = "0";
  $("vehiclePaid").value = "0";

  if (id) {

    const v = vehicleById(id);

    if (!v) return;

    $("vehicleModalTitle").textContent =
      "Edit Vehicle";

    $("vehicleId").value = v.id;
    $("vehicleRegistration").value =
      v.registration || "";
    $("vehicleCustomer").value =
      v.customer || "";
    $("vehicleModel").value =
      v.model || "";
    $("vehicleModelYear").value =
      v.model_year || "";
    $("vehicleColor").value =
      v.color || "";
    $("vehicleDateIn").value =
      v.date_in || "";
    $("vehicleDateOut").value =
      v.date_out || "";

    $("vehicleJobType").value =
      v.job_type || "Repair";

    $("vehicleStatus").value =
      v.status || "Storage";

    $("vehicleReleasedTo").value =
      v.released_to || "";

    $("vehicleReleasedContact").value =
      v.released_contact || "";

    $("vehicleBilled").value =
      v.billed || 0;

    $("vehiclePaid").value =
      v.paid || 0;

    $("vehicleDescription").value =
      v.description || "";

    updateStorageDays();

  } else {

    $("vehicleModalTitle").textContent =
      "Add Vehicle";

    $("vehicleDateIn").value = today();

    updateStorageDays();
  }

  openModal("vehicleModal");
}

window.openVehicleModal = openVehicleModal;

function editVehicle(id) {
  openVehicleModal(id);
}

window.editVehicle = editVehicle;


/* =========================================================
   STORAGE DAYS
   ========================================================= */

function updateStorageDays() {

  const dateIn =
    $("vehicleDateIn")?.value || "";

  const dateOut =
    $("vehicleDateOut")?.value || "";

  if ($("vehicleStorageDays")) {
    $("vehicleStorageDays").value =
      calculateStorageDays(dateIn, dateOut);
  }
}


/* =========================================================
   DUPLICATE VEHICLE PROTECTION
   ========================================================= */

function findDuplicateVehicle(registration, currentId = "") {

  const normalized =
    normalizeRegistration(registration);

  return vehicles.find(v => {

    const existing =
      normalizeRegistration(v.registration);

    const sameVehicle =
      currentId &&
      String(v.id) === String(currentId);

    return existing === normalized && !sameVehicle;
  });
}


/* =========================================================
   VEHICLE SAVE
   ========================================================= */

$("vehicleForm")?.addEventListener(
  "submit",
  async function(e) {

    e.preventDefault();

    const id =
      $("vehicleId").value.trim();

    const registration =
      normalizeRegistration(
        $("vehicleRegistration").value
      );

    if (!registration) {
      toast(
        "Registration / Chassis No. is required.",
        true
      );
      return;
    }

    /* DUPLICATE CHECK */
    const duplicate =
      findDuplicateVehicle(
        registration,
        id
      );

    if (duplicate) {

      toast(
        `Vehicle ${registration} already exists.`,
        true
      );

      return;
    }

    const dateIn =
      $("vehicleDateIn").value;

    const dateOut =
      $("vehicleDateOut").value || null;

    if (dateOut && dateIn && dateOut < dateIn) {

      toast(
        "Date Out cannot be before Date In.",
        true
      );

      return;
    }

    const record = {

      registration,

      customer:
        $("vehicleCustomer").value.trim(),

      model:
        $("vehicleModel").value.trim(),

      model_year:
        $("vehicleModelYear").value
          ? Number($("vehicleModelYear").value)
          : null,

      color:
        $("vehicleColor").value.trim(),

      date_in: dateIn,

      date_out: dateOut,

      job_type:
        $("vehicleJobType").value,

      status:
        $("vehicleStatus").value,

      released_to:
        $("vehicleReleasedTo").value.trim(),

      released_contact:
        $("vehicleReleasedContact").value.trim(),

      billed:
        Number($("vehicleBilled").value || 0),

      paid:
        Number($("vehiclePaid").value || 0),

      description:
        $("vehicleDescription").value.trim()
    };


    let result;

    if (id) {

      result = await supabase
        .from("vehicles")
        .update(record)
        .eq("id", id);

    } else {

      result = await supabase
        .from("vehicles")
        .insert(record);
    }

    if (result.error) {

      console.error(result.error);

      if (
        String(result.error.message || "")
          .toLowerCase()
          .includes("duplicate")
      ) {

        toast(
          "This vehicle registration already exists.",
          true
        );

      } else {

        toast(
          result.error.message ||
          "Unable to save vehicle.",
          true
        );
      }

      return;
    }

    closeModal("vehicleModal");

    toast(
      id
        ? "Vehicle updated successfully."
        : "Vehicle added successfully."
    );

    await loadAllData();
  }
);


/* =========================================================
   DELETE VEHICLE
   ========================================================= */

async function deleteVehicle(id) {

  const v = vehicleById(id);

  if (!v) return;

  if (
    !confirm(
      `Delete vehicle ${v.registration}?\n\n` +
      `This will remove the vehicle record.`
    )
  ) {
    return;
  }

  const { error } =
    await supabase
      .from("vehicles")
      .delete()
      .eq("id", id);

  if (error) {

    toast(
      error.message ||
      "Unable to delete vehicle.",
      true
    );

    return;
  }

  toast("Vehicle deleted.");

  await loadAllData();
}

window.deleteVehicle = deleteVehicle;


/* =========================================================
   VEHICLE EXPENSE PREVIEW
   ========================================================= */

function viewVehicleExpenses(vehicleId) {

  const vehicle =
    vehicleById(vehicleId);

  if (!vehicle) return;

  selectedVehicleForExpenses =
    vehicleId;

  const list =
    expenses.filter(
      e => String(e.vehicle_id) === String(vehicleId)
    );

  const total =
    list.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0
    );

  const content =
    $("vehicleExpensePreviewContent");

  if (!content) return;

  content.innerHTML = `

    <div style="margin-bottom:18px">

      <h2 style="margin:0 0 5px">
        ${esc(vehicle.registration)}
      </h2>

      <div style="color:#64748b">
        ${esc(vehicle.customer || "")}
      </div>

    </div>

    <div style="
      background:#f8fafc;
      border:1px solid #e5e7eb;
      border-radius:12px;
      padding:15px;
      margin-bottom:15px;
    ">

      <div style="
        display:flex;
        justify-content:space-between;
        gap:10px;
      ">

        <strong>Total Vehicle Expenses</strong>

        <strong style="font-size:20px">
          ${money(total)}
        </strong>

      </div>

    </div>

    ${
      list.length
      ?
      `
      <div style="overflow:auto">

        <table style="
          width:100%;
          border-collapse:collapse;
        ">

          <thead>
            <tr>
              <th style="text-align:left;padding:9px">
                Date
              </th>
              <th style="text-align:left;padding:9px">
                Description
              </th>
              <th style="text-align:left;padding:9px">
                Category
              </th>
              <th style="text-align:right;padding:9px">
                Amount
              </th>
            </tr>
          </thead>

          <tbody>

            ${list.map(e => `
              <tr>
                <td style="padding:9px;border-top:1px solid #eee">
                  ${esc(e.expense_date || "")}
                </td>

                <td style="padding:9px;border-top:1px solid #eee">
                  ${esc(e.description || "")}
                </td>

                <td style="padding:9px;border-top:1px solid #eee">
                  ${esc(e.category || "")}
                </td>

                <td style="
                  padding:9px;
                  border-top:1px solid #eee;
                  text-align:right;
                ">
                  ${money(e.amount)}
                </td>
              </tr>
            `).join("")}

          </tbody>

        </table>

      </div>
      `
      :
      `
      <div style="
        padding:25px;
        text-align:center;
        color:#64748b;
      ">
        No expenses recorded for this vehicle.
      </div>
      `
    }
  `;

  openModal(
    "vehicleExpensePreviewModal"
  );
}

window.viewVehicleExpenses =
  viewVehicleExpenses;


/* =========================================================
   PRINT PARTICULAR VEHICLE EXPENSES
   ========================================================= */

function printVehicleExpensePreview() {

  if (!selectedVehicleForExpenses)
    return;

  const vehicle =
    vehicleById(
      selectedVehicleForExpenses
    );

  if (!vehicle) return;

  const list =
    expenses.filter(
      e =>
        String(e.vehicle_id) ===
        String(vehicle.id)
    );

  const total =
    list.reduce(
      (sum, e) =>
        sum + Number(e.amount || 0),
      0
    );

  const rows = list.map(e => `
    <tr>
      <td>${esc(e.expense_date || "")}</td>
      <td>${esc(e.description || "")}</td>
      <td>${esc(e.category || "")}</td>
      <td>${money(e.amount)}</td>
    </tr>
  `).join("");

  const html = `

    <!DOCTYPE html>

    <html>
    <head>

      <title>
        Vehicle Expense Report -
        ${esc(vehicle.registration)}
      </title>

      <style>

        body{
          font-family:Arial,sans-serif;
          padding:35px;
          color:#172033;
        }

        h1{
          margin:0 0 5px;
        }

        h2{
          margin-top:30px;
        }

        .company{
          margin-bottom:25px;
        }

        .info{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:8px;
          margin:20px 0;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:20px;
        }

        th,td{
          border:1px solid #ddd;
          padding:10px;
          text-align:left;
        }

        th{
          background:#f3f4f6;
        }

        .total{
          margin-top:20px;
          text-align:right;
          font-size:20px;
          font-weight:bold;
        }

        @media print{
          body{padding:10px}
        }

      </style>

    </head>

    <body>

      <div class="company">
        <h1>GARAGE OPERATIONS PRO</h1>
        <div>Vehicle Expense Report</div>
      </div>

      <div class="info">

        <div>
          <strong>Registration / Chassis:</strong>
          ${esc(vehicle.registration)}
        </div>

        <div>
          <strong>Customer:</strong>
          ${esc(vehicle.customer || "")}
        </div>

        <div>
          <strong>Date In:</strong>
          ${esc(vehicle.date_in || "")}
        </div>

        <div>
          <strong>Job Type:</strong>
          ${esc(vehicle.job_type || "")}
        </div>

        <div>
          <strong>Status:</strong>
          ${esc(vehicle.status || "")}
        </div>

        <div>
          <strong>Storage Days:</strong>
          ${calculateStorageDays(
            vehicle.date_in,
            vehicle.date_out
          )}
        </div>

      </div>

      <h2>Expenses</h2>

      ${
        list.length
        ?
        `
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
            ${rows}
          </tbody>

        </table>
        `
        :
        `<p>No expenses recorded.</p>`
      }

      <div class="total">
        Total Vehicle Expenses:
        ${money(total)}
      </div>

      <script>
        window.onload=function(){
          window.print();
        };
      <\/script>

    </body>
    </html>
  `;

  const w =
    window.open(
      "",
      "_blank",
      "width=900,height=700"
    );

  if (!w) {

    toast(
      "Please allow pop-ups to print.",
      true
    );

    return;
  }

  w.document.write(html);
  w.document.close();
}

window.printVehicleExpensePreview =
  printVehicleExpensePreview;


/* =========================================================
   EXPENSES
   ========================================================= */

function renderExpenses() {

  const body =
    $("expensesTableBody");

  if (!body) return;

  const search =
    ($("expenseSearch")?.value || "")
      .toLowerCase()
      .trim();

  const category =
    $("expenseCategoryFilter")?.value || "";

  const list =
    expenses.filter(e => {

      const vehicle =
        vehicleName(e.vehicle_id);

      const text = [
        vehicle,
        e.description,
        e.category
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!search || text.includes(search)) &&
        (!category || e.category === category)
      );
    });

  if (!list.length) {

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

  body.innerHTML =
    list.map(e => `

      <tr>

        <td>
          ${esc(e.expense_date || "")}
        </td>

        <td>
          ${esc(vehicleName(e.vehicle_id))}
        </td>

        <td>
          ${esc(e.description || "")}
        </td>

        <td>
          ${esc(e.category || "")}
        </td>

        <td>
          <strong>${money(e.amount)}</strong>
        </td>

        <td>

          <div class="table-actions">

            <button
              class="action-btn"
              onclick="editExpense('${esc(e.id)}')">
              ✏️
            </button>

            <button
              class="action-btn"
              onclick="deleteExpense('${esc(e.id)}')">
              🗑
            </button>

          </div>

        </td>

      </tr>

    `).join("");
}


function openExpenseModal(id = null) {

  $("expenseForm")?.reset();

  $("expenseId").value = "";

  populateVehicleSelects();

  $("expenseDate").value = today();

  if (id) {

    const e =
      expenses.find(
        x => String(x.id) === String(id)
      );

    if (!e) return;

    $("expenseModalTitle").textContent =
      "Edit Expense";

    $("expenseId").value = e.id;
    $("expenseVehicle").value =
      e.vehicle_id || "";
    $("expenseDate").value =
      e.expense_date || "";
    $("expenseCategory").value =
      e.category || "Parts";
    $("expenseAmount").value =
      e.amount || 0;
    $("expenseDescription").value =
      e.description || "";

  } else {

    $("expenseModalTitle").textContent =
      "Add Expense";
  }

  openModal("expenseModal");
}

window.openExpenseModal =
  openExpenseModal;


$("expenseForm")?.addEventListener(
  "submit",
  async function(e) {

    e.preventDefault();

    const id =
      $("expenseId").value.trim();

    const record = {

      vehicle_id:
        $("expenseVehicle").value || null,

      expense_date:
        $("expenseDate").value,

      category:
        $("expenseCategory").value,

      amount:
        Number($("expenseAmount").value || 0),

      description:
        $("expenseDescription").value.trim()
    };

    let result;

    if (id) {

      result =
        await supabase
          .from("expenses")
          .update(record)
          .eq("id", id);

    } else {

      result =
        await supabase
          .from("expenses")
          .insert(record);
    }

    if (result.error) {

      toast(
        result.error.message ||
        "Unable to save expense.",
        true
      );

      return;
    }

    closeModal("expenseModal");

    toast(
      id
        ? "Expense updated."
        : "Expense added."
    );

    await loadAllData();
  }
);


function editExpense(id) {
  openExpenseModal(id);
}

window.editExpense = editExpense;


async function deleteExpense(id) {

  if (!confirm("Delete this expense?"))
    return;

  const { error } =
    await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

  if (error) {

    toast(error.message, true);
    return;
  }

  toast("Expense deleted.");

  await loadAllData();
}

window.deleteExpense =
  deleteExpense;


/* =========================================================
   PETTY CASH
   ========================================================= */

function renderPettyCash() {

  const body =
    $("pettyTableBody");

  if (!body) return;

  const search =
    ($("pettySearch")?.value || "")
      .toLowerCase()
      .trim();

  const category =
    $("pettyCategoryFilter")?.value || "";

  const list =
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
        (!category || p.category === category)
      );
    });

  if (!list.length) {

    body.innerHTML = `
      <tr>
        <td colspan="7"
          style="text-align:center;padding:30px;color:#64748b">
          No petty cash records found.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    list.map(p => `

      <tr>

        <td>${esc(p.cash_date || "")}</td>

        <td>${esc(p.description || "")}</td>

        <td>${esc(p.paid_to || "")}</td>

        <td>${esc(p.category || "")}</td>

        <td><strong>${money(p.amount)}</strong></td>

        <td>${esc(p.notes || "")}</td>

        <td>

          <div class="table-actions">

            <button
              class="action-btn"
              onclick="editPetty('${esc(p.id)}')">
              ✏️
            </button>

            <button
              class="action-btn"
              onclick="deletePetty('${esc(p.id)}')">
              🗑
            </button>

          </div>

        </td>

      </tr>

    `).join("");
}


function openPettyModal(id = null) {

  $("pettyForm")?.reset();

  $("pettyId").value = "";

  $("pettyDate").value = today();

  if (id) {

    const p =
      pettyCash.find(
        x => String(x.id) === String(id)
      );

    if (!p) return;

    $("pettyModalTitle").textContent =
      "Edit Petty Cash";

    $("pettyId").value = p.id;
    $("pettyDate").value =
      p.cash_date || "";
    $("pettyPaidTo").value =
      p.paid_to || "";
    $("pettyCategory").value =
      p.category || "Other";
    $("pettyAmount").value =
      p.amount || 0;
    $("pettyDescription").value =
      p.description || "";
    $("pettyNotes").value =
      p.notes || "";

  } else {

    $("pettyModalTitle").textContent =
      "Add Petty Cash";
  }

  openModal("pettyModal");
}

window.openPettyModal =
  openPettyModal;


$("pettyForm")?.addEventListener(
  "submit",
  async function(e) {

    e.preventDefault();

    const id =
      $("pettyId").value.trim();

    const record = {

      cash_date:
        $("pettyDate").value,

      paid_to:
        $("pettyPaidTo").value.trim(),

      category:
        $("pettyCategory").value,

      amount:
        Number($("pettyAmount").value || 0),

      description:
        $("pettyDescription").value.trim(),

      notes:
        $("pettyNotes").value.trim()
    };

    let result;

    if (id) {

      result =
        await supabase
          .from("petty_cash")
          .update(record)
          .eq("id", id);

    } else {

      result =
        await supabase
          .from("petty_cash")
          .insert(record);
    }

    if (result.error) {

      toast(result.error.message, true);
      return;
    }

    closeModal("pettyModal");

    toast(
      id
        ? "Petty cash updated."
        : "Petty cash added."
    );

    await loadAllData();
  }
);


function editPetty(id) {
  openPettyModal(id);
}

window.editPetty = editPetty;


async function deletePetty(id) {

  if (!confirm("Delete this petty cash record?"))
    return;

  const { error } =
    await supabase
      .from("petty_cash")
      .delete()
      .eq("id", id);

  if (error) {

    toast(error.message, true);
    return;
  }

  toast("Petty cash deleted.");

  await loadAllData();
}

window.deletePetty = deletePetty;


/* =========================================================
   REQUISITIONS
   ========================================================= */

function updateReqTotal() {

  const qty =
    Number($("reqQuantity")?.value || 0);

  const unit =
    Number($("reqUnitCost")?.value || 0);

  const total = qty * unit;

  if ($("reqTotal"))
    $("reqTotal").value = total.toFixed(2);
}


$("reqQuantity")?.addEventListener(
  "input",
  updateReqTotal
);

$("reqUnitCost")?.addEventListener(
  "input",
  updateReqTotal
);


function renderRequisitions() {

  const body =
    $("requisitionsTableBody");

  if (!body) return;

  const search =
    ($("reqSearch")?.value || "")
      .toLowerCase()
      .trim();

  const status =
    $("reqStatusFilter")?.value || "";

  const list =
    requisitions.filter(r => {

      const text = [
        r.req_no,
        r.requested_by,
        vehicleName(r.vehicle_id),
        r.item_description,
        r.expense_type
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!search || text.includes(search)) &&
        (!status || r.status === status)
      );
    });

  const overall =
    requisitions.reduce(
      (sum, r) =>
        sum + Number(r.total_amount || 0),
      0
    );

  if ($("reqOverallTotal"))
    $("reqOverallTotal").textContent =
      money(overall);

  if (!list.length) {

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
    list.map(r => `

      <tr>

        <td>${esc(r.req_no || "")}</td>

        <td>${esc(r.req_date || "")}</td>

        <td>${esc(r.requested_by || "")}</td>

        <td>${esc(vehicleName(r.vehicle_id))}</td>

        <td>${esc(r.item_description || "")}</td>

        <td>${number(r.quantity)}</td>

        <td>${money(r.unit_cost)}</td>

        <td><strong>${money(r.total_amount)}</strong></td>

        <td>${esc(r.expense_type || "")}</td>

        <td>
          <span class="status status-${statusClass(r.status)}">
            ${esc(r.status || "")}
          </span>
        </td>

        <td>

          <div class="table-actions">

            <button
              class="action-btn"
              onclick="previewReq('${esc(r.id)}')">
              👁
            </button>

            <button
              class="action-btn"
              onclick="editReq('${esc(r.id)}')">
              ✏️
            </button>

            <button
              class="action-btn"
              onclick="deleteReq('${esc(r.id)}')">
              🗑
            </button>

          </div>

        </td>

      </tr>

    `).join("");
}


function openReqModal(id = null) {

  $("reqForm")?.reset();

  $("reqId").value = "";

  $("reqDate").value = today();
  $("reqQuantity").value = "1";
  $("reqUnitCost").value = "0";
  $("reqTotal").value = "0";

  populateVehicleSelects();

  if (id) {

    const r =
      requisitions.find(
        x => String(x.id) === String(id)
      );

    if (!r) return;

    $("reqModalTitle").textContent =
      "Edit Requisition";

    $("reqId").value = r.id;
    $("reqNo").value = r.req_no || "";
    $("reqDate").value =
      r.req_date || "";
    $("reqRequestedBy").value =
      r.requested_by || "";
    $("reqVehicle").value =
      r.vehicle_id || "";
    $("reqItemDescription").value =
      r.item_description || "";
    $("reqQuantity").value =
      r.quantity || 1;
    $("reqUnitCost").value =
      r.unit_cost || 0;
    $("reqTotal").value =
      r.total_amount || 0;
    $("reqStatus").value =
      r.status || "Pending";
    $("reqCategory").value =
      r.category || "";
    $("reqExpenseType").value =
      r.expense_type || "";
    $("reqNotes").value =
      r.notes || "";

  } else {

    $("reqModalTitle").textContent =
      "New Requisition";
  }

  openModal("reqModal");
}

window.openReqModal =
  openReqModal;


$("reqForm")?.addEventListener(
  "submit",
  async function(e) {

    e.preventDefault();

    const id =
      $("reqId").value.trim();

    const quantity =
      Number($("reqQuantity").value || 0);

    const unitCost =
      Number($("reqUnitCost").value || 0);

    const total =
      quantity * unitCost;

    const record = {

      req_no:
        $("reqNo").value.trim(),

      req_date:
        $("reqDate").value,

      requested_by:
        $("reqRequestedBy").value.trim(),

      vehicle_id:
        $("reqVehicle").value || null,

      item_description:
        $("reqItemDescription").value.trim(),

      quantity,

      unit_cost:
        unitCost,

      total_amount:
        total,

      status:
        $("reqStatus").value,

      category:
        $("reqCategory").value || null,

      expense_type:
        $("reqExpenseType").value || null,

      notes:
        $("reqNotes").value.trim()
    };

    let result;

    if (id) {

      result =
        await supabase
          .from("requisitions")
          .update(record)
          .eq("id", id);

    } else {

      result =
        await supabase
          .from("requisitions")
          .insert(record);
    }

    if (result.error) {

      toast(result.error.message, true);
      return;
    }

    closeModal("reqModal");

    toast(
      id
        ? "Requisition updated."
        : "Requisition created."
    );

    await loadAllData();
  }
);


function editReq(id) {
  openReqModal(id);
}

window.editReq = editReq;


async function deleteReq(id) {

  if (!confirm("Delete this requisition?"))
    return;

  const { error } =
    await supabase
      .from("requisitions")
      .delete()
      .eq("id", id);

  if (error) {

    toast(error.message, true);
    return;
  }

  toast("Requisition deleted.");

  await loadAllData();
}


/* =========================================================
   REQUISITION PREVIEW
   ========================================================= */

function previewReq(id) {

  const r =
    requisitions.find(
      x => String(x.id) === String(id)
    );

  if (!r) return;

  selectedRequisition = r;

  $("reqPreviewContent").innerHTML = `

    <div style="line-height:1.8">

      <h2 style="margin-top:0">
        Requisition ${esc(r.req_no || "")}
      </h2>

      <p>
        <strong>Date:</strong>
        ${esc(r.req_date || "")}
      </p>

      <p>
        <strong>Requested By:</strong>
        ${esc(r.requested_by || "")}
      </p>

      <p>
        <strong>Vehicle:</strong>
        ${esc(vehicleName(r.vehicle_id))}
      </p>

      <p>
        <strong>Item:</strong>
        ${esc(r.item_description || "")}
      </p>

      <p>
        <strong>Quantity:</strong>
        ${number(r.quantity)}
      </p>

      <p>
        <strong>Unit Cost:</strong>
        ${money(r.unit_cost)}
      </p>

      <p>
        <strong>Total:</strong>
        ${money(r.total_amount)}
      </p>

      <p>
        <strong>Expense Type:</strong>
        ${esc(r.expense_type || "")}
      </p>

      <p>
        <strong>Status:</strong>
        ${esc(r.status || "")}
      </p>

      <p>
        <strong>Notes:</strong>
        ${esc(r.notes || "")}
      </p>

    </div>
  `;

  openModal("reqPreviewModal");
}

window.previewReq = previewReq;


function printSelectedReq() {

  if (!selectedRequisition)
    return;

  const r = selectedRequisition;

  printHTML(
    `Requisition ${r.req_no || ""}`,
    `
      <h1>GARAGE OPERATIONS PRO</h1>

      <h2>REQUISITION</h2>

      <p><strong>Req No:</strong> ${esc(r.req_no)}</p>
      <p><strong>Date:</strong> ${esc(r.req_date)}</p>
      <p><strong>Requested By:</strong> ${esc(r.requested_by)}</p>
      <p><strong>Vehicle:</strong> ${esc(vehicleName(r.vehicle_id))}</p>

      <table>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit Cost</th>
          <th>Total</th>
        </tr>

        <tr>
          <td>${esc(r.item_description)}</td>
          <td>${number(r.quantity)}</td>
          <td>${money(r.unit_cost)}</td>
          <td>${money(r.total_amount)}</td>
        </tr>
      </table>

      <h2>Total: ${money(r.total_amount)}</h2>

      <p><strong>Status:</strong> ${esc(r.status)}</p>

      <p><strong>Notes:</strong> ${esc(r.notes)}</p>
    `
  );
}

window.printSelectedReq =
  printSelectedReq;


/* =========================================================
   INVOICE + GATE PASS UI
   ========================================================= */

function createExtraSections() {

  const main = document.querySelector("main.page");

  if (!main) return;

  if (!$("invoices")) {

    const section =
      document.createElement("section");

    section.id = "invoices";
    section.className = "app-section";

    section.innerHTML = `

      <div class="page-header">

        <div>
          <h2>Invoices</h2>
          <p>
            Create and print customer invoices.
          </p>
        </div>

        <div class="header-actions">

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
          style="max-width:200px">

          <option value="">All statuses</option>
          <option>Unpaid</option>
          <option>Part Paid</option>
          <option>Paid</option>

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
              <th>Description</th>
              <th>Amount</th>
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


  if (!$("gatePasses")) {

    const section =
      document.createElement("section");

    section.id = "gatePasses";
    section.className = "app-section";

    section.innerHTML = `

      <div class="page-header">

        <div>
          <h2>Gate Passes</h2>
          <p>
            Authorize and print vehicle release gate passes.
          </p>
        </div>

        <div class="header-actions">

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
            id="gatePassSearch"
            type="search"
            placeholder="Search gate pass, vehicle or released to...">

        </div>

      </div>

      <div class="table-card">

        <table>

          <thead>
            <tr>
              <th>Gate Pass No.</th>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Released To</th>
              <th>Contact</th>
              <th>Authorized By</th>
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


  createInvoiceModal();
  createGatePassModal();

  addExtraNavigation();
}


/* =========================================================
   ADD NAVIGATION
   ========================================================= */

function addExtraNavigation() {

  const nav =
    document.querySelector(".sidebar nav");

  if (nav && !nav.querySelector('[data-section="invoices"]')) {

    const invoiceBtn =
      document.createElement("button");

    invoiceBtn.className = "nav-btn";
    invoiceBtn.dataset.section = "invoices";

    invoiceBtn.innerHTML =
      `<span class="nav-icon">🧾</span>Invoices`;

    invoiceBtn.onclick = () =>
      showSection("invoices", invoiceBtn);

    nav.appendChild(invoiceBtn);


    const gateBtn =
      document.createElement("button");

    gateBtn.className = "nav-btn";
    gateBtn.dataset.section = "gatePasses";

    gateBtn.innerHTML =
      `<span class="nav-icon">🎫</span>Gate Passes`;

    gateBtn.onclick = () =>
      showSection("gatePasses", gateBtn);

    nav.appendChild(gateBtn);
  }


  const mobile =
    document.querySelector(".mobile-bottom-nav");

  /*
    Mobile has limited space, so Invoice/Gate Pass are
    added as normal buttons but the main five remain.
  */

  if (
    mobile &&
    !mobile.querySelector('[data-section="invoices"]')
  ) {

    const invoiceBtn =
      document.createElement("button");

    invoiceBtn.className =
      "mobile-nav-btn";

    invoiceBtn.dataset.section =
      "invoices";

    invoiceBtn.innerHTML =
      `<span>🧾</span><span>Invoices</span>`;

    invoiceBtn.onclick = () =>
      showSection("invoices", invoiceBtn);

    mobile.appendChild(invoiceBtn);
  }
}


/* =========================================================
   INVOICE MODAL
   ========================================================= */

function createInvoiceModal() {

  if ($("invoiceModal"))
    return;

  const modal =
    document.createElement("div");

  modal.id = "invoiceModal";
  modal.className = "modal";

  modal.innerHTML = `

    <div class="modal-content">

      <div class="modal-header">

        <h3 id="invoiceModalTitle">
          New Invoice
        </h3>

        <button
          class="modal-close"
          type="button"
          onclick="closeModal('invoiceModal')">
          ×
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
                required
                placeholder="INV-2026-0001">
            </div>

            <div class="form-group">
              <label>Date</label>
              <input
                id="invoiceDate"
                type="date"
                required>
            </div>

            <div class="form-group">
              <label>Vehicle</label>
              <select id="invoiceVehicle"></select>
            </div>

            <div class="form-group">
              <label>Customer</label>
              <input id="invoiceCustomer">
            </div>

            <div class="form-group full">
              <label>Description</label>
              <textarea
                id="invoiceDescription"
                required
                placeholder="Repair / service description"></textarea>
            </div>

            <div class="form-group">
              <label>Amount (KSh)</label>
              <input
                id="invoiceAmount"
                type="number"
                min="0"
                step="0.01"
                required
                value="0">
            </div>

            <div class="form-group">
              <label>Paid (KSh)</label>
              <input
                id="invoicePaid"
                type="number"
                min="0"
                step="0.01"
                value="0">
            </div>

            <div class="form-group">
              <label>Status</label>
              <select id="invoiceStatus">
                <option>Unpaid</option>
                <option>Part Paid</option>
                <option>Paid</option>
              </select>
            </div>

            <div class="form-group full">
              <label>Notes</label>
              <textarea id="invoiceNotes"></textarea>
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
            class="btn btn-primary">
            Save Invoice
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modal);


  $("invoiceVehicle")?.addEventListener(
    "change",
    function() {

      const v =
        vehicleById(this.value);

      if (v && $("invoiceCustomer")) {
        $("invoiceCustomer").value =
          v.customer || "";
      }
    }
  );


  $("invoiceForm")?.addEventListener(
    "submit",
    saveInvoice
  );
}


/* =========================================================
   OPEN INVOICE
   ========================================================= */

function openInvoiceModal(id = null) {

  createInvoiceModal();

  $("invoiceForm")?.reset();

  $("invoiceId").value = "";

  $("invoiceDate").value = today();

  $("invoiceAmount").value = "0";
  $("invoicePaid").value = "0";

  populateVehicleSelects();

  if (id) {

    const inv =
      invoices.find(
        x => String(x.id) === String(id)
      );

    if (!inv) return;

    $("invoiceModalTitle").textContent =
      "Edit Invoice";

    $("invoiceId").value =
      inv.id;

    $("invoiceNo").value =
      inv.invoice_no || "";

    $("invoiceDate").value =
      inv.invoice_date || "";

    $("invoiceVehicle").value =
      inv.vehicle_id || "";

    $("invoiceCustomer").value =
      inv.customer || "";

    $("invoiceDescription").value =
      inv.description || "";

    $("invoiceAmount").value =
      inv.amount || 0;

    $("invoicePaid").value =
      inv.paid || 0;

    $("invoiceStatus").value =
      inv.status || "Unpaid";

    $("invoiceNotes").value =
      inv.notes || "";

  } else {

    $("invoiceModalTitle").textContent =
      "New Invoice";
  }

  openModal("invoiceModal");
}

window.openInvoiceModal =
  openInvoiceModal;


/* =========================================================
   CREATE INVOICE FROM VEHICLE
   ========================================================= */

function createInvoiceForVehicle(vehicleId) {

  openInvoiceModal();

  const v =
    vehicleById(vehicleId);

  if (!v) return;

  $("invoiceVehicle").value =
    vehicleId;

  $("invoiceCustomer").value =
    v.customer || "";

  $("invoiceAmount").value =
    Number(v.billed || 0);

  $("invoicePaid").value =
    Number(v.paid || 0);

  $("invoiceDescription").value =
    v.description ||
    `Repair / service for ${v.registration}`;

  const amount =
    Number($("invoiceAmount").value || 0);

  const paid =
    Number($("invoicePaid").value || 0);

  $("invoiceStatus").value =
    paid >= amount
      ? "Paid"
      : paid > 0
        ? "Part Paid"
        : "Unpaid";
}

window.createInvoiceForVehicle =
  createInvoiceForVehicle;


/* =========================================================
   SAVE INVOICE
   ========================================================= */

async function saveInvoice(e) {

  e.preventDefault();

  const id =
    $("invoiceId").value.trim();

  const amount =
    Number($("invoiceAmount").value || 0);

  const paid =
    Number($("invoicePaid").value || 0);

  let status =
    $("invoiceStatus").value;

  if (paid >= amount && amount > 0)
    status = "Paid";
  else if (paid > 0)
    status = "Part Paid";
  else
    status = "Unpaid";


  const record = {

    invoice_no:
      $("invoiceNo").value.trim(),

    invoice_date:
      $("invoiceDate").value,

    vehicle_id:
      $("invoiceVehicle").value || null,

    customer:
      $("invoiceCustomer").value.trim(),

    description:
      $("invoiceDescription").value.trim(),

    amount,

    paid,

    status,

    notes:
      $("invoiceNotes").value.trim()
  };


  let result;

  if (id) {

    result =
      await supabase
        .from("invoices")
        .update(record)
        .eq("id", id);

  } else {

    result =
      await supabase
        .from("invoices")
        .insert(record);
  }


  if (result.error) {

    console.error(result.error);

    toast(
      "Invoice could not be saved: " +
      result.error.message,
      true
    );

    return;
  }


  closeModal("invoiceModal");

  toast(
    id
      ? "Invoice updated."
      : "Invoice created."
  );

  await loadAllData();
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
      .toLowerCase()
      .trim();

  const status =
    $("invoiceStatusFilter")?.value || "";

  const list =
    invoices.filter(inv => {

      const text = [
        inv.invoice_no,
        inv.customer,
        vehicleName(inv.vehicle_id),
        inv.description
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!search || text.includes(search)) &&
        (!status || inv.status === status)
      );
    });


  if (!list.length) {

    body.innerHTML = `
      <tr>
        <td colspan="10"
          style="text-align:center;padding:30px;color:#64748b">
          No invoices found.
        </td>
      </tr>
    `;

    return;
  }


  body.innerHTML =
    list.map(inv => {

      const amount =
        Number(inv.amount || 0);

      const paid =
        Number(inv.paid || 0);

      const balance =
        Math.max(0, amount - paid);

      return `

        <tr>

          <td>
            <strong>
              ${esc(inv.invoice_no || "")}
            </strong>
          </td>

          <td>
            ${esc(inv.invoice_date || "")}
          </td>

          <td>
            ${esc(vehicleName(inv.vehicle_id))}
          </td>

          <td>
            ${esc(inv.customer || "")}
          </td>

          <td>
            ${esc(inv.description || "")}
          </td>

          <td>
            ${money(amount)}
          </td>

          <td>
            ${money(paid)}
          </td>

          <td>
            <strong>
              ${money(balance)}
            </strong>
          </td>

          <td>
            <span class="status status-${statusClass(inv.status)}">
              ${esc(inv.status || "")}
            </span>
          </td>

          <td>

            <div class="table-actions">

              <button
                class="action-btn"
                onclick="printInvoice('${esc(inv.id)}')">
                🖨
              </button>

              <button
                class="action-btn"
                onclick="editInvoice('${esc(inv.id)}')">
                ✏️
              </button>

              <button
                class="action-btn"
                onclick="deleteInvoice('${esc(inv.id)}')">
                🗑
              </button>

            </div>

          </td>

        </tr>
      `;
    }).join("");
}


/* =========================================================
   EDIT / DELETE INVOICE
   ========================================================= */

function editInvoice(id) {
  openInvoiceModal(id);
}

window.editInvoice = editInvoice;


async function deleteInvoice(id) {

  if (!confirm("Delete this invoice?"))
    return;

  const { error } =
    await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

  if (error) {

    toast(error.message, true);
    return;
  }

  toast("Invoice deleted.");

  await loadAllData();
}

window.deleteInvoice =
  deleteInvoice;


/* =========================================================
   PRINT INVOICE
   ========================================================= */

function printInvoice(id) {

  const inv =
    invoices.find(
      x => String(x.id) === String(id)
    );

  if (!inv) return;

  const v =
    vehicleById(inv.vehicle_id);

  const amount =
    Number(inv.amount || 0);

  const paid =
    Number(inv.paid || 0);

  const balance =
    Math.max(0, amount - paid);


  printHTML(
    `Invoice ${inv.invoice_no || ""}`,

    `

      <div class="header">
        <h1>GARAGE OPERATIONS PRO</h1>
        <p>SMART FLEET. HIGHER PERFORMANCE.</p>
      </div>

      <h2>INVOICE</h2>

      <div class="info">

        <p>
          <strong>Invoice No:</strong>
          ${esc(inv.invoice_no)}
        </p>

        <p>
          <strong>Date:</strong>
          ${esc(inv.invoice_date)}
        </p>

        <p>
          <strong>Customer:</strong>
          ${esc(inv.customer)}
        </p>

        <p>
          <strong>Vehicle:</strong>
          ${esc(v?.registration || "")}
        </p>

      </div>

      <table>

        <tr>
          <th>Description</th>
          <th>Amount</th>
        </tr>

        <tr>
          <td>
            ${esc(inv.description)}
          </td>

          <td>
            ${money(amount)}
          </td>
        </tr>

      </table>

      <div class="totals">

        <p>
          <strong>Total:</strong>
          ${money(amount)}
        </p>

        <p>
          <strong>Paid:</strong>
          ${money(paid)}
        </p>

        <p>
          <strong>Balance:</strong>
          ${money(balance)}
        </p>

      </div>

      <p>
        <strong>Status:</strong>
        ${esc(inv.status)}
      </p>

      <p>
        <strong>Notes:</strong>
        ${esc(inv.notes)}
      </p>

    `
  );
}

window.printInvoice =
  printInvoice;


/* =========================================================
   GATE PASS MODAL
   ========================================================= */

function createGatePassModal() {

  if ($("gatePassModal"))
    return;

  const modal =
    document.createElement("div");

  modal.id = "gatePassModal";
  modal.className = "modal";

  modal.innerHTML = `

    <div class="modal-content">

      <div class="modal-header">

        <h3 id="gatePassModalTitle">
          New Gate Pass
        </h3>

        <button
          class="modal-close"
          type="button"
          onclick="closeModal('gatePassModal')">
          ×
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
                required
                placeholder="GP-2026-0001">
            </div>

            <div class="form-group">
              <label>Date</label>
              <input
                id="gatePassDate"
                type="date"
                required>
            </div>

            <div class="form-group full">
              <label>Vehicle</label>
              <select id="gatePassVehicle"></select>
            </div>

            <div class="form-group">
              <label>Released To</label>
              <input
                id="gatePassReleasedTo"
                required>
            </div>

            <div class="form-group">
              <label>Contact</label>
              <input
                id="gatePassContact"
                type="tel">
            </div>

            <div class="form-group">
              <label>Authorized By</label>
              <input
                id="gatePassAuthorizedBy"
                required>
            </div>

            <div class="form-group">
              <label>Status</label>
              <select id="gatePassStatus">
                <option>Pending</option>
                <option>Approved</option>
                <option>Released</option>
                <option>Cancelled</option>
              </select>
            </div>

            <div class="form-group full">
              <label>Notes</label>
              <textarea
                id="gatePassNotes"
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
            class="btn btn-primary">
            Save Gate Pass
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modal);

  $("gatePassForm")?.addEventListener(
    "submit",
    saveGatePass
  );


  $("gatePassVehicle")?.addEventListener(
    "change",
    function() {

      const v =
        vehicleById(this.value);

      if (!v) return;

      if ($("gatePassReleasedTo"))
        $("gatePassReleasedTo").value =
          v.released_to || "";

      if ($("gatePassContact"))
        $("gatePassContact").value =
          v.released_contact || "";
    }
  );
}


/* =========================================================
   OPEN GATE PASS
   ========================================================= */

function openGatePassModal(id = null) {

  createGatePassModal();

  $("gatePassForm")?.reset();

  $("gatePassId").value = "";

  $("gatePassDate").value =
    today();

  populateVehicleSelects();

  if (id) {

    const gp =
      gatePasses.find(
        x => String(x.id) === String(id)
      );

    if (!gp) return;

    $("gatePassModalTitle").textContent =
      "Edit Gate Pass";

    $("gatePassId").value =
      gp.id;

    $("gatePassNo").value =
      gp.gate_pass_no || "";

    $("gatePassDate").value =
      gp.gate_pass_date || "";

    $("gatePassVehicle").value =
      gp.vehicle_id || "";

    $("gatePassReleasedTo").value =
      gp.released_to || "";

    $("gatePassContact").value =
      gp.contact || "";

    $("gatePassAuthorizedBy").value =
      gp.authorized_by || "";

    $("gatePassStatus").value =
      gp.status || "Pending";

    $("gatePassNotes").value =
      gp.notes || "";

  } else {

    $("gatePassModalTitle").textContent =
      "New Gate Pass";
  }

  openModal("gatePassModal");
}

window.openGatePassModal =
  openGatePassModal;


/* =========================================================
   CREATE GATE PASS FROM VEHICLE
   ========================================================= */

function createGatePassForVehicle(vehicleId) {

  openGatePassModal();

  const v =
    vehicleById(vehicleId);

  if (!v) return;

  $("gatePassVehicle").value =
    vehicleId;

  $("gatePassReleasedTo").value =
    v.released_to || "";

  $("gatePassContact").value =
    v.released_contact || "";

  $("gatePassAuthorizedBy").value =
    sessionStorage.getItem(
      "garageUser"
    ) || "Josephine";

  $("gatePassStatus").value =
    "Pending";
}

window.createGatePassForVehicle =
  createGatePassForVehicle;


/* =========================================================
   SAVE GATE PASS
   ========================================================= */

async function saveGatePass(e) {

  e.preventDefault();

  const id =
    $("gatePassId").value.trim();

  const record = {

    gate_pass_no:
      $("gatePassNo").value.trim(),

    gate_pass_date:
      $("gatePassDate").value,

    vehicle_id:
      $("gatePassVehicle").value || null,

    released_to:
      $("gatePassReleasedTo").value.trim(),

    contact:
      $("gatePassContact").value.trim(),

    authorized_by:
      $("gatePassAuthorizedBy").value.trim(),

    status:
      $("gatePassStatus").value,

    notes:
      $("gatePassNotes").value.trim()
  };


  let result;

  if (id) {

    result =
      await supabase
        .from("gate_passes")
        .update(record)
        .eq("id", id);

  } else {

    result =
      await supabase
        .from("gate_passes")
        .insert(record);
  }


  if (result.error) {

    console.error(result.error);

    toast(
      "Gate pass could not be saved: " +
      result.error.message,
      true
    );

    return;
  }


  closeModal("gatePassModal");

  toast(
    id
      ? "Gate pass updated."
      : "Gate pass created."
  );

  await loadAllData();
}


/* =========================================================
   RENDER GATE PASSES
   ========================================================= */

function renderGatePasses() {

  const body =
    $("gatePassesTableBody");

  if (!body) return;

  const search =
    ($("gatePassSearch")?.value || "")
      .toLowerCase()
      .trim();


  const list =
    gatePasses.filter(gp => {

      const text = [
        gp.gate_pass_no,
        vehicleName(gp.vehicle_id),
        gp.released_to,
        gp.contact,
        gp.authorized_by,
        gp.status
      ]
        .join(" ")
        .toLowerCase();

      return (
        !search ||
        text.includes(search)
      );
    });


  if (!list.length) {

    body.innerHTML = `
      <tr>
        <td colspan="8"
          style="text-align:center;padding:30px;color:#64748b">
          No gate passes found.
        </td>
      </tr>
    `;

    return;
  }


  body.innerHTML =
    list.map(gp => `

      <tr>

        <td>
          <strong>
            ${esc(gp.gate_pass_no || "")}
          </strong>
        </td>

        <td>
          ${esc(gp.gate_pass_date || "")}
        </td>

        <td>
          ${esc(vehicleName(gp.vehicle_id))}
        </td>

        <td>
          ${esc(gp.released_to || "")}
        </td>

        <td>
          ${esc(gp.contact || "")}
        </td>

        <td>
          ${esc(gp.authorized_by || "")}
        </td>

        <td>
          <span class="status status-${statusClass(gp.status)}">
            ${esc(gp.status || "")}
          </span>
        </td>

        <td>

          <div class="table-actions">

            <button
              class="action-btn"
              onclick="printGatePass('${esc(gp.id)}')">
              🖨
            </button>

            <button
              class="action-btn"
              onclick="editGatePass('${esc(gp.id)}')">
              ✏️
            </button>

            <button
              class="action-btn"
              onclick="deleteGatePass('${esc(gp.id)}')">
              🗑
            </button>

          </div>

        </td>

      </tr>

    `).join("");
}


/* =========================================================
   EDIT / DELETE GATE PASS
   ========================================================= */

function editGatePass(id) {
  openGatePassModal(id);
}

window.editGatePass =
  editGatePass;


async function deleteGatePass(id) {

  if (!confirm("Delete this gate pass?"))
    return;

  const { error } =
    await supabase
      .from("gate_passes")
      .delete()
      .eq("id", id);

  if (error) {

    toast(error.message, true);
    return;
  }

  toast("Gate pass deleted.");

  await loadAllData();
}

window.deleteGatePass =
  deleteGatePass;


/* =========================================================
   PRINT GATE PASS
   ========================================================= */

function printGatePass(id) {

  const gp =
    gatePasses.find(
      x => String(x.id) === String(id)
    );

  if (!gp) return;

  const v =
    vehicleById(gp.vehicle_id);


  printHTML(
    `Gate Pass ${gp.gate_pass_no || ""}`,

    `

      <div class="header">
        <h1>GARAGE OPERATIONS PRO</h1>
        <p>SMART FLEET. HIGHER PERFORMANCE.</p>
      </div>

      <h2>VEHICLE GATE PASS</h2>

      <table>

        <tr>
          <th>Gate Pass No.</th>
          <td>${esc(gp.gate_pass_no)}</td>
        </tr>

        <tr>
          <th>Date</th>
          <td>${esc(gp.gate_pass_date)}</td>
        </tr>

        <tr>
          <th>Registration / Chassis</th>
          <td>${esc(v?.registration || "")}</td>
        </tr>

        <tr>
          <th>Customer</th>
          <td>${esc(v?.customer || "")}</td>
        </tr>

        <tr>
          <th>Released To</th>
          <td>${esc(gp.released_to)}</td>
        </tr>

        <tr>
          <th>Contact</th>
          <td>${esc(gp.contact)}</td>
        </tr>

        <tr>
          <th>Authorized By</th>
          <td>${esc(gp.authorized_by)}</td>
        </tr>

        <tr>
          <th>Status</th>
          <td>${esc(gp.status)}</td>
        </tr>

      </table>

      <h3>Notes</h3>

      <p>
        ${esc(gp.notes || "")}
      </p>

      <br><br>

      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:50px;
      ">

        <div>
          __________________________
          <br>
          Authorized By
        </div>

        <div>
          __________________________
          <br>
          Released To
        </div>

      </div>

    `
  );
}

window.printGatePass =
  printGatePass;


/* =========================================================
   GENERIC PRINT FUNCTION
   ========================================================= */

function printHTML(title, body) {

  const w =
    window.open(
      "",
      "_blank",
      "width=900,height=700"
    );

  if (!w) {

    toast(
      "Please allow pop-ups for printing.",
      true
    );

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
          color:#172033;
          padding:35px;
          line-height:1.5;
        }

        h1{
          margin:0;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:20px;
        }

        th,td{
          border:1px solid #ddd;
          padding:10px;
          text-align:left;
        }

        th{
          background:#f3f4f6;
        }

        .header{
          border-bottom:2px solid #07111f;
          padding-bottom:15px;
          margin-bottom:25px;
        }

        @media print{

          body{
            padding:10px;
          }

        }

      </style>

    </head>

    <body>

      ${body}

      <script>
        window.onload=function(){
          window.print();
        };
      <\/script>

    </body>

    </html>

  `);

  w.document.close();
}


/* =========================================================
   PRINT VEHICLES
   ========================================================= */

function printVehicles() {

  const rows =
    vehicles.map(v => {

      const billed =
        Number(v.billed || 0);

      const paid =
        Number(v.paid || 0);

      const outstanding =
        Math.max(0, billed - paid);

      const expense =
        vehicleExpenseTotal(v.id);

      return `
        <tr>

          <td>${esc(v.registration)}</td>
          <td>${esc(v.customer)}</td>
          <td>${esc(v.date_in)}</td>
          <td>${esc(v.job_type)}</td>
          <td>${esc(v.status)}</td>
          <td>${calculateStorageDays(
            v.date_in,
            v.date_out
          )}</td>
          <td>${money(billed)}</td>
          <td>${money(paid)}</td>
          <td>${money(outstanding)}</td>
          <td>${money(expense)}</td>

        </tr>
      `;

    }).join("");


  printHTML(
    "Vehicle Report",

    `

      <h1>GARAGE OPERATIONS PRO</h1>

      <h2>VEHICLE REPORT</h2>

      <table>

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

        ${rows}

      </table>

    `
  );
}

window.printVehicles =
  printVehicles;


/* =========================================================
   PRINT EXPENSES
   ========================================================= */

function printExpenses() {

  const rows =
    expenses.map(e => `

      <tr>

        <td>${esc(e.expense_date)}</td>

        <td>${esc(vehicleName(e.vehicle_id))}</td>

        <td>${esc(e.description)}</td>

        <td>${esc(e.category)}</td>

        <td>${money(e.amount)}</td>

      </tr>

    `).join("");


  const total =
    expenses.reduce(
      (sum, e) =>
        sum + Number(e.amount || 0),
      0
    );


  printHTML(
    "Expense Report",

    `

      <h1>GARAGE OPERATIONS PRO</h1>

      <h2>EXPENSE REPORT</h2>

      <table>

        <tr>
          <th>Date</th>
          <th>Vehicle</th>
          <th>Description</th>
          <th>Category</th>
          <th>Amount</th>
        </tr>

        ${rows}

      </table>

      <h2 style="text-align:right">
        Total Expenses: ${money(total)}
      </h2>

    `
  );
}

window.printExpenses =
  printExpenses;


/* =========================================================
   PRINT PETTY CASH
   ========================================================= */

function printPettyCash() {

  const rows =
    pettyCash.map(p => `

      <tr>

        <td>${esc(p.cash_date)}</td>
        <td>${esc(p.description)}</td>
        <td>${esc(p.paid_to)}</td>
        <td>${esc(p.category)}</td>
        <td>${money(p.amount)}</td>

      </tr>

    `).join("");


  const total =
    pettyCash.reduce(
      (sum, p) =>
        sum + Number(p.amount || 0),
      0
    );


  printHTML(
    "Petty Cash Report",

    `

      <h1>GARAGE OPERATIONS PRO</h1>

      <h2>PETTY CASH REPORT</h2>

      <table>

        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Paid To</th>
          <th>Category</th>
          <th>Amount</th>
        </tr>

        ${rows}

      </table>

      <h2 style="text-align:right">
        Total: ${money(total)}
      </h2>

    `
  );
}

window.printPettyCash =
  printPettyCash;


/* =========================================================
   PRINT REQUISITIONS
   ========================================================= */

function printRequisitions() {

  const rows =
    requisitions.map(r => `

      <tr>

        <td>${esc(r.req_no)}</td>
        <td>${esc(r.req_date)}</td>
        <td>${esc(r.requested_by)}</td>
        <td>${esc(vehicleName(r.vehicle_id))}</td>
        <td>${esc(r.item_description)}</td>
        <td>${number(r.quantity)}</td>
        <td>${money(r.total_amount)}</td>
        <td>${esc(r.status)}</td>

      </tr>

    `).join("");


  const total =
    requisitions.reduce(
      (sum, r) =>
        sum + Number(r.total_amount || 0),
      0
    );


  printHTML(
    "Requisition Report",

    `

      <h1>GARAGE OPERATIONS PRO</h1>

      <h2>REQUISITION REPORT</h2>

      <table>

        <tr>
          <th>Req No.</th>
          <th>Date</th>
          <th>Requested By</th>
          <th>Vehicle</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Total</th>
          <th>Status</th>
        </tr>

        ${rows}

      </table>

      <h2 style="text-align:right">
        Total: ${money(total)}
      </h2>

    `
  );
}

window.printRequisitions =
  printRequisitions;


/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderEverything() {

  renderDashboard();
  renderActivity();

  renderVehicles();
  renderExpenses();
  renderPettyCash();
  renderRequisitions();

  renderInvoices();
  renderGatePasses();

  populateVehicleSelects();
}


/* =========================================================
   SEARCH EVENTS
   ========================================================= */

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


$("vehicleDateIn")?.addEventListener(
  "change",
  updateStorageDays
);

$("vehicleDateOut")?.addEventListener(
  "change",
  updateStorageDays
);


/* =========================================================
   DYNAMIC SEARCH EVENTS
   ========================================================= */

document.addEventListener(
  "input",
  function(e) {

    if (
      e.target.id ===
      "invoiceSearch"
    ) {
      renderInvoices();
    }

    if (
      e.target.id ===
      "gatePassSearch"
    ) {
      renderGatePasses();
    }
  }
);


document.addEventListener(
  "change",
  function(e) {

    if (
      e.target.id ===
      "invoiceStatusFilter"
    ) {
      renderInvoices();
    }
  }
);


/* =========================================================
   LOGGED-IN USER
   ========================================================= */

function setupUser() {

  const user =
    sessionStorage.getItem(
      "garageUser"
    ) || "Josephine";

  if ($("sidebarUser"))
    $("sidebarUser").textContent =
      user;

  if ($("welcomeUser"))
    $("welcomeUser").textContent =
      user.charAt(0).toUpperCase();
}


/* =========================================================
   LOGIN PAGE POLISH
   ========================================================= */

function polishLogin() {

  const page =
    $("loginPage");

  if (!page) return;

  page.style.background =
    "radial-gradient(circle at top right,#1769aa 0,#07111f 45%,#030914 100%)";

  const card =
    document.querySelector(".login-card");

  if (!card) return;

  card.style.border =
    "1px solid rgba(255,255,255,.15)";

  card.style.boxShadow =
    "0 30px 90px rgba(0,0,0,.45)";

  card.style.backdropFilter =
    "blur(18px)";
}


/* =========================================================
   CLOSE MODALS WHEN CLICKING BACKDROP
   ========================================================= */

document.addEventListener(
  "click",
  function(e) {

    if (
      e.target.classList &&
      e.target.classList.contains("modal")
    ) {
      e.target.classList.remove("show");
    }
  }
);


/* =========================================================
   START APPLICATION
   ========================================================= */

async function startApp() {

  setupUser();

  polishLogin();

  /*
    Create Invoice/Gate Pass screens
    before loading/rendering data.
  */
  createExtraSections();

  await loadAllData();
}


/* =========================================================
   START
   ========================================================= */

startApp();


/* =========================================================
   END
   ========================================================= */
