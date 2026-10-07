import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE FUNCTIONAL APP.JS
   DESIGNED FOR THE CURRENT INDEX.HTML
   ========================================================= */

const SUPABASE_URL =
  "https://ptluwoeogfkqavhspdjj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";

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

let currentPreviewHTML = "";
let currentVehicleExpenseId = null;
let currentEstimateId = null;

window.currentVehicleExpenseId = null;

/* =========================================================
   HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

const num = v => Number(v || 0);

const today = () =>
  new Date().toISOString().slice(0, 10);

const money = v =>
  "KSh " +
  num(v).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function norm(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function errorMessage(e) {
  return e?.message || "Database error";
}

function vehicleById(id) {
  return vehicles.find(
    v => String(v.id) === String(id)
  );
}

function invoiceById(id) {
  return invoices.find(
    x => String(x.id) === String(id)
  );
}

function gateById(id) {
  return gatePasses.find(
    x => String(x.id) === String(id)
  );
}

function estimateById(id) {
  return estimates.find(
    x => String(x.id) === String(id)
  );
}

function closeModal(id) {
  const el = $(id);
  if (!el) return;

  el.classList.remove("show");
  el.classList.remove("active");
  el.style.display = "none";
}

function openModal(id) {
  const el = $(id);
  if (!el) return;

  el.style.display = "flex";
  el.classList.add("show");
  el.classList.add("active");
}

function toast(message) {
  const el = $("toast");

  if (!el) {
    alert(message);
    return;
  }

  el.textContent = message;
  el.style.display = "block";

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    el.style.display = "none";
  }, 3500);
}

function storageDays(v) {
  if (!v?.date_in) return 0;

  const start =
    new Date(v.date_in + "T00:00:00");

  const end = v.date_out
    ? new Date(v.date_out + "T00:00:00")
    : new Date();

  return Math.max(
    0,
    Math.ceil(
      (end - start) / 86400000
    )
  );
}

function outstanding(v) {
  return num(v?.billed) - num(v?.paid);
}

function vehicleExpenses(id) {
  return expenses.filter(
    e =>
      e.vehicle_id &&
      String(e.vehicle_id) === String(id)
  );
}

function vehicleExpenseTotal(id) {
  return vehicleExpenses(id)
    .reduce(
      (s, e) => s + num(e.amount),
      0
    );
}

function statusClass(status) {
  return String(status || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function statusBadge(status) {
  const s = status || "";
  return `<span class="status status-${statusClass(s)}">${esc(s)}</span>`;
}

/* =========================================================
   COMPANY DETAILS
   ========================================================= */

const COMPANIES = {
  crystal: {
    name: "CRYSTAL MOTORS (K) LTD",
    box: "P.O. Box 54385 – 00200, Nairobi",
    phone: "0722 707124 | 0723 914 222",
    address:
      "Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge",
    email: ""
  },

  quarry: {
    name: "QUARRY ROUTE MOTORS LTD",
    box: "P.O. Box 54385 – 00200, Nairobi",
    phone: "0722 707124 | 0723 914 222",
    address:
      "Off Mombasa Road, Along Quarry Road, Near Mlolongo Weigh Bridge",
    email:
      "info@quarryroutemotors.com | quarryroutemotorsltd@gmail.com"
  },

  other: {
    name: "OTHER",
    box: "",
    phone: "",
    address: "",
    email: ""
  }
};

function company(key, custom = {}) {
  const base =
    COMPANIES[key] ||
    COMPANIES.crystal;

  return {
    ...base,
    ...custom
  };
}

function companyHTML(c) {
  return `
    <div style="text-align:center">
      <h2 style="margin:0">
        ${esc(c.name)}
      </h2>

      ${c.box ? `<div>${esc(c.box)}</div>` : ""}
      ${c.phone ? `<div>Cell: ${esc(c.phone)}</div>` : ""}
      ${c.address ? `<div>${esc(c.address)}</div>` : ""}
      ${c.email ? `<div>${esc(c.email)}</div>` : ""}
    </div>
  `;
}

function injectCompanyField(
  formId,
  prefix,
  afterId
) {
  const form = $(formId);
  if (!form || $(`${prefix}CompanySelect`))
    return;

  const group = document.createElement("div");
  group.className = "form-group";
  group.innerHTML = `
    <label>Company</label>
    <select id="${prefix}CompanySelect">
      <option value="crystal">
        CRYSTAL MOTORS (K) LTD
      </option>
      <option value="quarry">
        QUARRY ROUTE MOTORS LTD
      </option>
      <option value="other">
        OTHER
      </option>
    </select>
  `;

  const target = $(afterId);

  if (target?.parentElement) {
    target.parentElement.after(group);
  } else {
    form.querySelector(".form-grid")
      ?.prepend(group);
  }
}

function setupCompanyFields() {
  injectCompanyField(
    "invoiceForm",
    "invoice",
    "invoiceNo"
  );

  injectCompanyField(
    "gatePassForm",
    "gatePass",
    "gatePassNo"
  );
}

/* =========================================================
   DATABASE LOAD
   ========================================================= */

async function loadTable(
  table,
  orderField = "created_at"
) {
  try {
    let query =
      supabase
        .from(table)
        .select("*");

    if (orderField) {
      query = query.order(
        orderField,
        { ascending: false }
      );
    }

    const { data, error } =
      await query;

    if (error) {
      console.error(
        `${table}:`,
        error.message
      );

      return {
        data: [],
        error
      };
    }

    return {
      data: data || [],
      error: null
    };

  } catch (e) {
    console.error(table, e);

    return {
      data: [],
      error: e
    };
  }
}

async function loadAllData() {

  const results =
    await Promise.all([
      loadTable(
        "vehicles",
        "created_at"
      ),

      loadTable(
        "expenses",
        "expense_date"
      ),

      loadTable(
        "petty_cash",
        "cash_date"
      ),

      loadTable(
        "requisitions",
        "created_at"
      ),

      loadTable(
        "invoices",
        "created_at"
      ),

      loadTable(
        "gate_passes",
        "created_at"
      ),

      loadTable(
        "estimates",
        "created_at"
      )
    ]);

  vehicles =
    results[0].data || [];

  expenses =
    results[1].data || [];

  pettyCash =
    results[2].data || [];

  requisitions =
    results[3].data || [];

  invoices =
    results[4].data || [];

  gatePasses =
    results[5].data || [];

  estimates =
    results[6].data || [];

  const errors =
    results
      .map((r, i) => {
        if (!r.error) return "";

        const names = [
          "vehicles",
          "expenses",
          "petty_cash",
          "requisitions",
          "invoices",
          "gate_passes",
          "estimates"
        ];

        return names[i];
      })
      .filter(Boolean);

  renderAll();

  if (errors.length) {
    toast(
      "Database tables unavailable: " +
      errors.join(", ")
    );
  }
}

/* =========================================================
   RENDER ALL
   ========================================================= */

function renderAll() {
  setupCompanyFields();

  ensureEstimateSection();

  renderVehicles();
  renderExpenses();
  renderPettyCash();
  renderRequisitions();
  renderInvoices();
  renderGatePasses();
  renderEstimates();
  renderDashboard();

  fillVehicleSelect(
    "expenseVehicle"
  );

  fillVehicleSelect(
    "reqVehicle"
  );

  fillVehicleSelect(
    "invoiceVehicle"
  );

  fillVehicleSelect(
    "gateVehicle"
  );
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

function showSection(
  sectionId,
  button
) {
  sectionId =
    SECTION_ALIASES[sectionId] ||
    sectionId;

  ensureEstimateSection();

  document
    .querySelectorAll(
      ".app-section"
    )
    .forEach(s => {
      s.classList.remove("active");
      s.style.display = "none";
    });

  const target =
    $(sectionId);

  if (!target) {
    toast(
      "Section not found: " +
      sectionId
    );
    return;
  }

  target.classList.add("active");
  target.style.display = "block";

  document
    .querySelectorAll(
      ".nav-btn,.mobile-nav-btn"
    )
    .forEach(b => {
      b.classList.toggle(
        "active",
        b.dataset.section ===
        sectionId
      );
    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

window.showSection =
  showSection;

/* =========================================================
   VEHICLE SELECTS
   ========================================================= */

function fillVehicleSelect(id) {
  const select = $(id);
  if (!select) return;

  const current =
    select.value;

  select.innerHTML =
    `<option value="">
      Select Vehicle
    </option>` +
    vehicles
      .map(v => `
        <option value="${esc(v.id)}">
          ${esc(v.registration)}
          — ${esc(v.customer)}
        </option>
      `)
      .join("");

  if (
    current &&
    vehicles.some(
      v =>
        String(v.id) ===
        String(current)
    )
  ) {
    select.value = current;
  }
}

/* =========================================================
   VEHICLES
   ========================================================= */

function renderVehicles() {
  const body =
    $("vehiclesTableBody");

  if (!body) return;

  const search =
    norm(
      $("vehicleSearch")?.value
    );

  const status =
    $("vehicleStatusFilter")
      ?.value || "";

  const list =
    vehicles.filter(v => {

      const haystack = [
        v.registration,
        v.customer,
        v.model,
        v.color,
        v.status,
        v.job_type
      ]
        .map(norm)
        .join(" ");

      return (
        (!search ||
          haystack.includes(search)) &&
        (!status ||
          v.status === status)
      );
    });

  body.innerHTML =
    list.map(v => {

      const total =
        vehicleExpenseTotal(v.id);

      return `
        <tr>

          <td>
            <strong>
              ${esc(v.registration)}
            </strong>
            ${
              v.model
                ? `<small style="display:block;color:#64748b">
                    ${esc(v.model)}
                   </small>`
                : ""
            }
          </td>

          <td>
            ${esc(v.customer)}
          </td>

          <td>
            ${esc(v.date_in || "")}
          </td>

          <td>
            ${esc(
              v.job_type ||
              "Repair"
            )}
          </td>

          <td>
            ${statusBadge(
              v.status ||
              "Under Repair"
            )}
          </td>

          <td>
            ${storageDays(v)}
          </td>

          <td>
            ${money(v.billed)}
          </td>

          <td>
            ${money(v.paid)}
          </td>

          <td>
            ${money(
              outstanding(v)
            )}
          </td>

          <td>
            <button
              class="action-btn blue"
              onclick="viewVehicleExpenses('${v.id}')">
              ${money(total)}
            </button>
          </td>

          <td>
            <div class="table-actions">

              <button
                class="action-btn"
                onclick="editVehicle('${v.id}')"
                title="Edit">
                ✏️
              </button>

              <button
                class="action-btn blue"
                onclick="viewVehicle('${v.id}')"
                title="View">
                👁️
              </button>

              <button
                class="action-btn"
                onclick="viewVehicleExpenses('${v.id}')"
                title="Expenses">
                💰
              </button>

              <button
                class="action-btn"
                onclick="shareVehicle('${v.id}')"
                title="Share">
                📤
              </button>

              <button
                class="action-btn danger"
                onclick="deleteVehicle('${v.id}')"
                title="Delete">
                🗑️
              </button>

            </div>
          </td>

        </tr>
      `;
    })
    .join("") ||
    `<tr>
      <td colspan="12">
        No vehicles found.
      </td>
    </tr>`;
}

function openVehicleModal() {
  $("vehicleForm")?.reset();

  $("vehicleId").value = "";

  $("vehicleDateIn").value =
    today();

  $("vehicleJobType").value =
    "Repair";

  $("vehicleStatus").value =
    "Under Repair";

  $("vehicleStorageDays").value =
    "0";

  $("vehicleModalTitle").textContent =
    "Add Vehicle";

  openModal(
    "vehicleModal"
  );
}

function editVehicle(id) {
  const v =
    vehicleById(id);

  if (!v) return;

  $("vehicleId").value =
    v.id;

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

  $("vehicleStorageDays").value =
    storageDays(v);

  $("vehicleJobType").value =
    v.job_type || "Repair";

  $("vehicleStatus").value =
    v.status ||
    "Under Repair";

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

  $("vehicleModalTitle").textContent =
    "Edit Vehicle";

  openModal(
    "vehicleModal"
  );
}

async function saveVehicle(e) {
  e.preventDefault();

  const id =
    $("vehicleId").value;

  const registration =
    $("vehicleRegistration")
      .value.trim();

  const customer =
    $("vehicleCustomer")
      .value.trim();

  if (!registration) {
    toast(
      "Registration / Chassis No. is required"
    );
    return;
  }

  if (!customer) {
    toast(
      "Customer is required"
    );
    return;
  }

  const duplicate =
    vehicles.find(v =>
      norm(v.registration) ===
      norm(registration) &&
      String(v.id) !==
      String(id)
    );

  if (duplicate) {
    toast(
      "This vehicle already exists."
    );
    return;
  }

  const record = {
    registration,
    customer,
    model:
      $("vehicleModel")
        .value.trim() || null,
    model_year:
      $("vehicleModelYear")
        .value || null,
    color:
      $("vehicleColor")
        .value.trim() || null,
    date_in:
      $("vehicleDateIn").value ||
      today(),
    date_out:
      $("vehicleDateOut").value ||
      null,
    job_type:
      $("vehicleJobType").value ||
      "Repair",
    status:
      $("vehicleStatus").value ||
      "Under Repair",
    released_to:
      $("vehicleReleasedTo")
        .value.trim() || null,
    released_contact:
      $("vehicleReleasedContact")
        .value.trim() || null,
    billed:
      num(
        $("vehicleBilled").value
      ),
    paid:
      num(
        $("vehiclePaid").value
      ),
    description:
      $("vehicleDescription")
        .value.trim() || null
  };

  let result;

  if (id) {
    result =
      await supabase
        .from("vehicles")
        .update(record)
        .eq("id", id);
  } else {
    result =
      await supabase
        .from("vehicles")
        .insert(record);
  }

  if (result.error) {
    toast(
      errorMessage(
        result.error
      )
    );
    return;
  }

  closeModal(
    "vehicleModal"
  );

  toast(
    id
      ? "Vehicle updated successfully"
      : "Vehicle added successfully"
  );

  await loadAllData();
}

async function deleteVehicle(id) {
  const v =
    vehicleById(id);

  if (!v) return;

  if (
    !confirm(
      `Delete ${v.registration}?\n\nLinked expenses will also be removed if the database foreign key is configured for cascade deletion.`
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
      errorMessage(error)
    );
    return;
  }

  toast(
    "Vehicle deleted"
  );

  await loadAllData();
}

function viewVehicle(id) {
  const v =
    vehicleById(id);

  if (!v) return;

  const c =
    company("crystal");

  showPreview(
    `Vehicle ${v.registration}`,
    `
      ${companyHTML(c)}

      <hr>

      <h2>VEHICLE DETAILS</h2>

      <p>
        <strong>Registration / Chassis:</strong>
        ${esc(v.registration)}
      </p>

      <p>
        <strong>Customer:</strong>
        ${esc(v.customer)}
      </p>

      <p>
        <strong>Model:</strong>
        ${esc(v.model || "")}
      </p>

      <p>
        <strong>Model Year:</strong>
        ${esc(v.model_year || "")}
      </p>

      <p>
        <strong>Color:</strong>
        ${esc(v.color || "")}
      </p>

      <p>
        <strong>Date In:</strong>
        ${esc(v.date_in || "")}
      </p>

      <p>
        <strong>Date Out:</strong>
        ${esc(v.date_out || "")}
      </p>

      <p>
        <strong>Storage Days:</strong>
        ${storageDays(v)}
      </p>

      <p>
        <strong>Job Type:</strong>
        ${esc(v.job_type || "")}
      </p>

      <p>
        <strong>Status:</strong>
        ${esc(v.status || "")}
      </p>

      <hr>

      <p>
        <strong>Billed:</strong>
        ${money(v.billed)}
      </p>

      <p>
        <strong>Paid:</strong>
        ${money(v.paid)}
      </p>

      <p>
        <strong>Outstanding:</strong>
        ${money(outstanding(v))}
      </p>

      <p>
        <strong>Vehicle Expenses:</strong>
        ${money(vehicleExpenseTotal(v.id))}
      </p>

      <hr>

      <strong>Description</strong>
      <p>
        ${esc(v.description || "")}
      </p>
    `
  );
}

/* =========================================================
   VEHICLE EXPENSE REPORT
   ========================================================= */

function vehicleExpenseData(id) {
  return expenses.filter(
    e =>
      String(e.vehicle_id) ===
      String(id)
  );
}

function vehicleExpenseHTML(
  v,
  list
) {
  const total =
    list.reduce(
      (s, e) =>
        s + num(e.amount),
      0
    );

  return `
    ${companyHTML(
      company("crystal")
    )}

    <hr>

    <h2>
      VEHICLE EXPENSE REPORT
    </h2>

    <p>
      <strong>Vehicle:</strong>
      ${esc(v.registration)}
      <br>

      <strong>Customer:</strong>
      ${esc(v.customer)}
    </p>

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
          list.length
            ? list.map(e => `
              <tr>
                <td>
                  ${esc(e.expense_date)}
                </td>
                <td>
                  ${esc(e.description)}
                </td>
                <td>
                  ${esc(e.category)}
                </td>
                <td>
                  ${money(e.amount)}
                </td>
              </tr>
            `).join("")
            : `
              <tr>
                <td colspan="4">
                  No expenses for this vehicle.
                </td>
              </tr>
            `
        }
      </tbody>

      <tfoot>
        <tr>
          <th colspan="3">
            TOTAL VEHICLE EXPENSES
          </th>
          <th>
            ${money(total)}
          </th>
        </tr>
      </tfoot>
    </table>
  `;
}

function viewVehicleExpenses(id) {
  const v =
    vehicleById(id);

  if (!v) return;

  const list =
    vehicleExpenseData(id);

  currentVehicleExpenseId =
    id;

  window.currentVehicleExpenseId =
    id;

  $("vehicleExpensePreviewContent")
    .innerHTML =
      vehicleExpenseHTML(
        v,
        list
      );

  openModal(
    "vehicleExpensePreviewModal"
  );
}

function printVehicleExpensePreview() {
  const id =
    currentVehicleExpenseId ||
    window.currentVehicleExpenseId;

  if (!id) {
    toast(
      "No vehicle expense report selected"
    );
    return;
  }

  const v =
    vehicleById(id);

  if (!v) return;

  const list =
    vehicleExpenseData(id);

  printHTML(`
    <html>
    <head>
      <title>
        Vehicle Expense Report
      </title>

      <style>
        body{
          font-family:Arial;
          padding:30px;
          color:#111;
        }

        h1,h2{
          text-align:center;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:20px;
        }

        th,td{
          border:1px solid #ccc;
          padding:8px;
          text-align:left;
        }

        th{
          font-weight:bold;
          background:#f5f5f5;
        }

        .money{
          text-align:right;
        }
      </style>
    </head>

    <body>
      ${vehicleExpenseHTML(
        v,
        list
      )}
    </body>
    </html>
  `);
}

function printVehicleExpenses() {
  printVehicleExpensePreview();
}

async function shareVehicle(id) {
  const v =
    vehicleById(id);

  if (!v) return;

  const list =
    vehicleExpenseData(id);

  const total =
    list.reduce(
      (s, e) =>
        s + num(e.amount),
      0
    );

  let text =
`CRYSTAL MOTORS (K) LTD

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
    text +=
      "No expenses for this vehicle.\n";
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

  text +=
    `TOTAL VEHICLE EXPENSES: ${money(total)}`;

  shareText(
    `Vehicle Expense Report - ${v.registration}`,
    text
  );
}

/* =========================================================
   EXPENSES
   ========================================================= */

function renderExpenses() {
  const body =
    $("expensesTableBody");

  if (!body) return;

  const search =
    norm(
      $("expenseSearch")?.value
    );

  const category =
    $("expenseCategoryFilter")
      ?.value || "";

  let list;

  /*
    IMPORTANT:
    If the search exactly matches
    a vehicle registration, ONLY
    that vehicle's expenses appear.
  */

  const exactVehicle =
    vehicles.find(
      v =>
        norm(v.registration) ===
        search
    );

  if (
    search &&
    exactVehicle
  ) {
    list =
      expenses.filter(
        e =>
          String(e.vehicle_id) ===
          String(exactVehicle.id)
      );
  } else {
    list =
      expenses.filter(e => {

        const v =
          vehicleById(
            e.vehicle_id
          );

        const haystack = [
          e.description,
          e.category,
          v?.registration,
          v?.customer
        ]
          .map(norm)
          .join(" ");

        return (
          (!search ||
            haystack.includes(search)) &&
          (!category ||
            e.category === category)
        );
      });
  }

  /*
    Category filter still applies
    to exact vehicle filtering.
  */

  if (category) {
    list =
      list.filter(
        e =>
          e.category === category
      );
  }

  const total =
    list.reduce(
      (s, e) =>
        s + num(e.amount),
      0
    );

  ensureExpenseTotalBox();

  const totalBox =
    $("expenseTotalBox");

  if (totalBox) {
    totalBox.innerHTML = `
      <div>
        <span>
          ${
            exactVehicle
              ? `Expenses for ${esc(exactVehicle.registration)}`
              : "Filtered Expense Total"
          }
        </span>

        <strong>
          ${money(total)}
        </strong>
      </div>

      <small>
        ${list.length} expense record(s)
      </small>
    `;
  }

  body.innerHTML =
    list.map(e => {

      const v =
        vehicleById(
          e.vehicle_id
        );

      return `
        <tr>

          <td>
            ${esc(
              e.expense_date || ""
            )}
          </td>

          <td>
            <strong>
              ${esc(
                v?.registration ||
                "Unlinked"
              )}
            </strong>
          </td>

          <td>
            ${esc(
              e.description
            )}
          </td>

          <td>
            ${esc(
              e.category
            )}
          </td>

          <td>
            <strong>
              ${money(e.amount)}
            </strong>
          </td>

          <td>
            <div class="table-actions">

              <button
                class="action-btn"
                onclick="editExpense('${e.id}')">
                ✏️
              </button>

              <button
                class="action-btn blue"
                onclick="viewExpense('${e.id}')">
                👁️
              </button>

              <button
                class="action-btn"
                onclick="shareExpense('${e.id}')">
                📤
              </button>

              <button
                class="action-btn danger"
                onclick="deleteExpense('${e.id}')">
                🗑️
              </button>

            </div>
          </td>

        </tr>
      `;
    })
    .join("") ||
    `<tr>
      <td colspan="6">
        No expenses found.
      </td>
    </tr>`;
}

function ensureExpenseTotalBox() {
  if ($("expenseTotalBox"))
    return;

  const table =
    $("expensesTableBody")
      ?.closest(".table-card");

  if (!table) return;

  const box =
    document.createElement(
      "div"
    );

  box.id =
    "expenseTotalBox";

  box.style.cssText = `
    padding:14px 16px;
    background:#f8fafc;
    border-bottom:1px solid #e5e7eb;
    font-weight:800;
  `;

  table.prepend(box);
}

function openExpenseModal() {
  $("expenseForm")?.reset();

  $("expenseId").value =
    "";

  $("expenseDate").value =
    today();

  fillVehicleSelect(
    "expenseVehicle"
  );

  $("expenseModalTitle").textContent =
    "Add Expense";

  openModal(
    "expenseModal"
  );
}

function editExpense(id) {
  const e =
    expenses.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!e) return;

  fillVehicleSelect(
    "expenseVehicle"
  );

  $("expenseId").value =
    e.id;

  $("expenseVehicle").value =
    e.vehicle_id || "";

  $("expenseDate").value =
    e.expense_date ||
    today();

  $("expenseCategory").value =
    e.category ||
    "Parts";

  $("expenseAmount").value =
    e.amount || 0;

  $("expenseDescription").value =
    e.description || "";

  $("expenseModalTitle").textContent =
    "Edit Expense";

  openModal(
    "expenseModal"
  );
}

async function saveExpense(e) {
  e.preventDefault();

  const id =
    $("expenseId").value;

  const record = {
    vehicle_id:
      $("expenseVehicle").value ||
      null,

    expense_date:
      $("expenseDate").value ||
      today(),

    category:
      $("expenseCategory").value ||
      "Parts",

    amount:
      num(
        $("expenseAmount").value
      ),

    description:
      $("expenseDescription")
        .value.trim()
  };

  if (!record.description) {
    toast(
      "Description is required"
    );
    return;
  }

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
      errorMessage(
        result.error
      )
    );
    return;
  }

  closeModal(
    "expenseModal"
  );

  toast(
    id
      ? "Expense updated"
      : "Expense saved"
  );

  await loadAllData();
}

async function deleteExpense(id) {
  if (
    !confirm(
      "Delete this expense?"
    )
  ) return;

  const { error } =
    await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

  if (error) {
    toast(
      errorMessage(error)
    );
    return;
  }

  toast(
    "Expense deleted"
  );

  await loadAllData();
}

function viewExpense(id) {
  const e =
    expenses.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!e) return;

  const v =
    vehicleById(
      e.vehicle_id
    );

  showPreview(
    "Expense Details",
    `
      ${companyHTML(
        company("crystal")
      )}

      <hr>

      <p>
        <strong>Date:</strong>
        ${esc(e.expense_date)}
      </p>

      <p>
        <strong>Vehicle:</strong>
        ${esc(
          v?.registration ||
          "Unlinked"
        )}
      </p>

      <p>
        <strong>Description:</strong>
        ${esc(e.description)}
      </p>

      <p>
        <strong>Category:</strong>
        ${esc(e.category)}
      </p>

      <p>
        <strong>Amount:</strong>
        ${money(e.amount)}
      </p>
    `
  );
}

function shareExpense(id) {
  const e =
    expenses.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!e) return;

  const v =
    vehicleById(
      e.vehicle_id
    );

  shareText(
    "Garage Expense",
`GARAGE EXPENSE

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
  const body =
    $("pettyTableBody");

  if (!body) return;

  const search =
    norm(
      $("pettySearch")?.value
    );

  const category =
    $("pettyCategoryFilter")
      ?.value || "";

  const list =
    pettyCash.filter(p => {

      const haystack = [
        p.description,
        p.paid_to,
        p.category,
        p.notes
      ]
        .map(norm)
        .join(" ");

      return (
        (!search ||
          haystack.includes(search)) &&
        (!category ||
          p.category === category)
      );
    });

  body.innerHTML =
    list.map(p => `
      <tr>

        <td>
          ${esc(p.cash_date)}
        </td>

        <td>
          ${esc(p.description)}
        </td>

        <td>
          ${esc(p.paid_to || "")}
        </td>

        <td>
          ${esc(p.category || "")}
        </td>

        <td>
          <strong>
            ${money(p.amount)}
          </strong>
        </td>

        <td>
          ${esc(p.notes || "")}
        </td>

        <td>
          <div class="table-actions">

            <button
              class="action-btn"
              onclick="editPetty('${p.id}')">
              ✏️
            </button>

            <button
              class="action-btn blue"
              onclick="viewPetty('${p.id}')">
              👁️
            </button>

            <button
              class="action-btn"
              onclick="sharePetty('${p.id}')">
              📤
            </button>

            <button
              class="action-btn danger"
              onclick="deletePetty('${p.id}')">
              🗑️
            </button>

          </div>
        </td>

      </tr>
    `)
    .join("") ||
    `<tr>
      <td colspan="7">
        No petty cash records.
      </td>
    </tr>`;
}

function openPettyModal() {
  $("pettyForm")?.reset();

  $("pettyId").value =
    "";

  $("pettyDate").value =
    today();

  $("pettyCategory").value =
    "Other";

  $("pettyModalTitle").textContent =
    "Add Petty Cash";

  openModal(
    "pettyModal"
  );
}

function editPetty(id) {
  const p =
    pettyCash.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!p) return;

  $("pettyId").value =
    p.id;

  $("pettyDate").value =
    p.cash_date || today();

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

  $("pettyModalTitle").textContent =
    "Edit Petty Cash";

  openModal(
    "pettyModal"
  );
}

async function savePetty(e) {
  e.preventDefault();

  const id =
    $("pettyId").value;

  const record = {
    cash_date:
      $("pettyDate").value ||
      today(),

    paid_to:
      $("pettyPaidTo").value.trim() ||
      null,

    category:
      $("pettyCategory").value ||
      "Other",

    amount:
      num(
        $("pettyAmount").value
      ),

    description:
      $("pettyDescription")
        .value.trim(),

    notes:
      $("pettyNotes")
        .value.trim() ||
      null
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
    toast(
      errorMessage(
        result.error
      )
    );
    return;
  }

  closeModal(
    "pettyModal"
  );

  toast(
    id
      ? "Petty cash updated"
      : "Petty cash saved"
  );

  await loadAllData();
}

async function deletePetty(id) {
  if (
    !confirm(
      "Delete this petty cash record?"
    )
  ) return;

  const { error } =
    await supabase
      .from("petty_cash")
      .delete()
      .eq("id", id);

  if (error) {
    toast(
      errorMessage(error)
    );
    return;
  }

  toast(
    "Petty cash deleted"
  );

  await loadAllData();
}

function viewPetty(id) {
  const p =
    pettyCash.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!p) return;

  showPreview(
    "Petty Cash",
    `
      ${companyHTML(
        company("crystal")
      )}

      <hr>

      <p>
        <strong>Date:</strong>
        ${esc(p.cash_date)}
      </p>

      <p>
        <strong>Paid To:</strong>
        ${esc(p.paid_to || "")}
      </p>

      <p>
        <strong>Description:</strong>
        ${esc(p.description)}
      </p>

      <p>
        <strong>Category:</strong>
        ${esc(p.category || "")}
      </p>

      <p>
        <strong>Amount:</strong>
        ${money(p.amount)}
      </p>

      <p>
        <strong>Notes:</strong>
        ${esc(p.notes || "")}
      </p>
    `
  );
}

function sharePetty(id) {
  const p =
    pettyCash.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!p) return;

  shareText(
    "Petty Cash",
`PETTY CASH

Date: ${p.cash_date || ""}
Paid To: ${p.paid_to || ""}
Description: ${p.description || ""}
Category: ${p.category || ""}
Amount: ${money(p.amount)}
Notes: ${p.notes || ""}`
  );
}

/* =========================================================
   REQUISITIONS
   ========================================================= */

function calculateReqTotal() {
  const total =
    num(
      $("reqQuantity")?.value
    ) *
    num(
      $("reqUnitCost")?.value
    );

  if ($("reqTotal"))
    $("reqTotal").value =
      total.toFixed(2);

  return total;
}

window.calculateReqTotal =
  calculateReqTotal;

function renderRequisitions() {
  const body =
    $("requisitionsTableBody");

  if (!body) return;

  const search =
    norm(
      $("reqSearch")?.value
    );

  const status =
    $("reqStatusFilter")
      ?.value || "";

  const list =
    requisitions.filter(r => {

      const v =
        vehicleById(
          r.vehicle_id
        );

      const haystack = [
        r.req_no,
        r.requested_by,
        r.item_description,
        r.status,
        r.expense_type,
        v?.registration,
        v?.customer
      ]
        .map(norm)
        .join(" ");

      return (
        (!search ||
          haystack.includes(search)) &&
        (!status ||
          r.status === status)
      );
    });

  const overall =
    list.reduce(
      (s, r) =>
        s +
        num(
          r.total_amount ??
          num(r.quantity) *
          num(r.unit_cost)
        ),
      0
    );

  if ($("reqOverallTotal"))
    $("reqOverallTotal").textContent =
      money(overall);

  body.innerHTML =
    list.map(r => {

      const v =
        vehicleById(
          r.vehicle_id
        );

      const total =
        num(
          r.total_amount
        ) ||
        num(r.quantity) *
        num(r.unit_cost);

      return `
        <tr>

          <td>
            ${esc(r.req_no)}
          </td>

          <td>
            ${esc(r.req_date)}
          </td>

          <td>
            ${esc(r.requested_by)}
          </td>

          <td>
            ${esc(
              v?.registration ||
              "Unlinked"
            )}
          </td>

          <td>
            ${esc(
              r.item_description
            )}
          </td>

          <td>
            ${num(r.quantity)}
          </td>

          <td>
            ${money(r.unit_cost)}
          </td>

          <td>
            <strong>
              ${money(total)}
            </strong>
          </td>

          <td>
            ${esc(
              r.expense_type ||
              r.category ||
              ""
            )}
          </td>

          <td>
            ${statusBadge(
              r.status
            )}
          </td>

          <td>
            <div class="table-actions">

              <button
                class="action-btn"
                onclick="editReq('${r.id}')">
                ✏️
              </button>

              <button
                class="action-btn blue"
                onclick="viewReq('${r.id}')">
                👁️
              </button>

              <button
                class="action-btn"
                onclick="shareReq('${r.id}')">
                📤
              </button>

              <button
                class="action-btn danger"
                onclick="deleteReq('${r.id}')">
                🗑️
              </button>

            </div>
          </td>

        </tr>
      `;
    })
    .join("") ||
    `<tr>
      <td colspan="11">
        No requisitions found.
      </td>
    </tr>`;
}

function openReqModal() {
  $("reqForm")?.reset();

  $("reqId").value =
    "";

  $("reqDate").value =
    today();

  $("reqQuantity").value =
    "1";

  $("reqUnitCost").value =
    "0";

  $("reqTotal").value =
    "0";

  fillVehicleSelect(
    "reqVehicle"
  );

  $("reqModalTitle").textContent =
    "New Requisition";

  openModal(
    "reqModal"
  );
}

function editReq(id) {
  const r =
    requisitions.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!r) return;

  fillVehicleSelect(
    "reqVehicle"
  );

  $("reqId").value =
    r.id;

  $("reqNo").value =
    r.req_no || "";

  $("reqDate").value =
    r.req_date || today();

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
    r.total_amount ||
    num(r.quantity) *
    num(r.unit_cost);

  $("reqStatus").value =
    r.status || "Pending";

  $("reqCategory").value =
    r.category ||
    r.expense_type ||
    "";

  $("reqExpenseType").value =
    r.expense_type ||
    r.category ||
    "";

  $("reqNotes").value =
    r.notes || "";

  $("reqModalTitle").textContent =
    "Edit Requisition";

  openModal(
    "reqModal"
  );
}

async function saveReq(e) {
  e.preventDefault();

  const id =
    $("reqId").value;

  const total =
    calculateReqTotal();

  const record = {
    req_no:
      $("reqNo").value.trim(),

    req_date:
      $("reqDate").value ||
      today(),

    requested_by:
      $("reqRequestedBy")
        .value.trim(),

    vehicle_id:
      $("reqVehicle").value ||
      null,

    item_description:
      $("reqItemDescription")
        .value.trim(),

    quantity:
      num(
        $("reqQuantity").value
      ),

    unit_cost:
      num(
        $("reqUnitCost").value
      ),

    total_amount:
      total,

    status:
      $("reqStatus").value ||
      "Pending",

    notes:
      $("reqNotes").value.trim() ||
      null,

    expense_type:
      $("reqExpenseType").value ||
      $("reqCategory").value ||
      "Materials"
  };

  if (!record.req_no) {
    toast(
      "Requisition number is required"
    );
    return;
  }

  if (!record.item_description) {
    toast(
      "Item description is required"
    );
    return;
  }

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
    toast(
      errorMessage(
        result.error
      )
    );
    return;
  }

  closeModal(
    "reqModal"
  );

  toast(
    id
      ? "Requisition updated"
      : "Requisition saved"
  );

  await loadAllData();
}

async function deleteReq(id) {
  if (
    !confirm(
      "Delete this requisition?"
    )
  ) return;

  const { error } =
    await supabase
      .from("requisitions")
      .delete()
      .eq("id", id);

  if (error) {
    toast(
      errorMessage(error)
    );
    return;
  }

  toast(
    "Requisition deleted"
  );

  await loadAllData();
}

function viewReq(id) {
  const r =
    requisitions.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!r) return;

  const v =
    vehicleById(
      r.vehicle_id
    );

  showPreview(
    `Requisition ${r.req_no}`,
    `
      ${companyHTML(
        company("crystal")
      )}

      <hr>

      <p>
        <strong>Req No:</strong>
        ${esc(r.req_no)}
      </p>

      <p>
        <strong>Date:</strong>
        ${esc(r.req_date)}
      </p>

      <p>
        <strong>Requested By:</strong>
        ${esc(r.requested_by)}
      </p>

      <p>
        <strong>Vehicle:</strong>
        ${esc(
          v?.registration ||
          "Unlinked"
        )}
      </p>

      <p>
        <strong>Item:</strong>
        ${esc(r.item_description)}
      </p>

      <p>
        <strong>Quantity:</strong>
        ${num(r.quantity)}
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
        <strong>Status:</strong>
        ${esc(r.status)}
      </p>

      <p>
        <strong>Notes:</strong>
        ${esc(r.notes || "")}
      </p>
    `
  );
}

function shareReq(id) {
  const r =
    requisitions.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!r) return;

  const v =
    vehicleById(
      r.vehicle_id
    );

  shareText(
    `Requisition ${r.req_no}`,
`REQUISITION

Req No: ${r.req_no}
Date: ${r.req_date || ""}
Requested By: ${r.requested_by || ""}
Vehicle: ${v?.registration || "Unlinked"}
Item: ${r.item_description || ""}
Quantity: ${r.quantity || 0}
Unit Cost: ${money(r.unit_cost)}
Total: ${money(r.total_amount)}
Status: ${r.status || ""}`
  );
}

/* =========================================================
   INVOICES
   ========================================================= */

function calculateInvoice() {
  const subtotal =
    num(
      $("invoiceLabour")
        ?.value
    ) +
    num(
      $("invoiceParts")
        ?.value
    ) +
    num(
      $("invoiceOther")
        ?.value
    );

  const paid =
    num(
      $("invoicePaid")
        ?.value
    );

  const balance =
    subtotal - paid;

  if ($("invoiceSubtotal"))
    $("invoiceSubtotal").value =
      subtotal.toFixed(2);

  if ($("invoiceBalance"))
    $("invoiceBalance").value =
      balance.toFixed(2);

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

window.calculateInvoice =
  calculateInvoice;

function renderInvoices() {
  const body =
    $("invoicesTableBody");

  if (!body) return;

  const search =
    norm(
      $("invoiceSearch")?.value
    );

  const status =
    $("invoiceStatusFilter")
      ?.value || "";

  const list =
    invoices.filter(i => {

      const v =
        vehicleById(
          i.vehicle_id
        );

      const haystack = [
        i.invoice_no,
        i.customer,
        v?.registration,
        v?.customer,
        i.job_description
      ]
        .map(norm)
        .join(" ");

      return (
        (!search ||
          haystack.includes(search)) &&
        (!status ||
          i.status === status)
      );
    });

  body.innerHTML =
    list.map(i => {

      const v =
        vehicleById(
          i.vehicle_id
        );

      const subtotal =
        num(
          i.subtotal ??
          num(i.labour) +
          num(i.parts) +
          num(i.other)
        );

      const paid =
        num(i.paid);

      const balance =
        num(
          i.balance ??
          subtotal - paid
        );

      return `
        <tr>

          <td>
            <strong>
              ${esc(i.invoice_no)}
            </strong>
          </td>

          <td>
            ${esc(i.invoice_date || "")}
          </td>

          <td>
            ${esc(
              v?.registration ||
              "Unlinked"
            )}
          </td>

          <td>
            ${esc(
              i.customer ||
              v?.customer ||
              ""
            )}
          </td>

          <td>
            ${money(subtotal)}
          </td>

          <td>
            ${money(paid)}
          </td>

          <td>
            ${money(balance)}
          </td>

          <td>
            ${statusBadge(
              i.status ||
              "Unpaid"
            )}
          </td>

          <td>
            <div class="table-actions">

              <button
                class="action-btn"
                onclick="editInvoice('${i.id}')">
                ✏️
              </button>

              <button
                class="action-btn blue"
                onclick="viewInvoice('${i.id}')">
                👁️
              </button>

              <button
                class="action-btn"
                onclick="shareInvoice('${i.id}')">
                📤
              </button>

              <button
                class="action-btn danger"
                onclick="deleteInvoice('${i.id}')">
                🗑️
              </button>

            </div>
          </td>

        </tr>
      `;
    })
    .join("") ||
    `<tr>
      <td colspan="9">
        No invoices found.
      </td>
    </tr>`;
}

function openInvoiceModal() {
  $("invoiceForm")?.reset();

  $("invoiceId").value =
    "";

  $("invoiceDate").value =
    today();

  fillVehicleSelect(
    "invoiceVehicle"
  );

  $("invoiceCompanySelect").value =
    "crystal";

  calculateInvoice();

  $("invoiceModalTitle").textContent =
    "New Invoice";

  openModal(
    "invoiceModal"
  );
}

function editInvoice(id) {
  const i =
    invoiceById(id);

  if (!i) return;

  fillVehicleSelect(
    "invoiceVehicle"
  );

  $("invoiceId").value =
    i.id;

  $("invoiceNo").value =
    i.invoice_no || "";

  $("invoiceDate").value =
    i.invoice_date ||
    today();

  $("invoiceVehicle").value =
    i.vehicle_id || "";

  $("invoiceCustomer").value =
    i.customer || "";

  $("invoiceJobDescription").value =
    i.job_description || "";

  $("invoiceLabour").value =
    i.labour || 0;

  $("invoiceParts").value =
    i.parts || 0;

  $("invoiceOther").value =
    i.other || 0;

  $("invoiceSubtotal").value =
    i.subtotal || 0;

  $("invoicePaid").value =
    i.paid || 0;

  $("invoiceBalance").value =
    i.balance || 0;

  $("invoiceStatus").value =
    i.status || "Unpaid";

  $("invoiceNotes").value =
    i.notes || "";

  if ($("invoiceCompanySelect"))
    $("invoiceCompanySelect").value =
      i.company_key ||
      "crystal";

  $("invoiceModalTitle").textContent =
    "Edit Invoice";

  openModal(
    "invoiceModal"
  );
}

function syncInvoiceVehicle() {
  const v =
    vehicleById(
      $("invoiceVehicle")
        ?.value
    );

  if (!v) return;

  if (
    $("invoiceCustomer") &&
    !$("invoiceCustomer").value
  ) {
    $("invoiceCustomer").value =
      v.customer || "";
  }
}

async function saveInvoice(e) {
  e.preventDefault();

  const totals =
    calculateInvoice();

  const companyKey =
    $("invoiceCompanySelect")
      ?.value ||
    "crystal";

  const record = {
    invoice_no:
      $("invoiceNo")
        .value.trim(),

    invoice_date:
      $("invoiceDate").value ||
      today(),

    vehicle_id:
      $("invoiceVehicle")
        .value || null,

    customer:
      $("invoiceCustomer")
        .value.trim(),

    job_description:
      $("invoiceJobDescription")
        .value.trim(),

    labour:
      num(
        $("invoiceLabour")
          .value
      ),

    parts:
      num(
        $("invoiceParts")
          .value
      ),

    other:
      num(
        $("invoiceOther")
          .value
      ),

    subtotal:
      totals.subtotal,

    paid:
      totals.paid,

    balance:
      totals.balance,

    status:
      $("invoiceStatus")
        .value,

    notes:
      $("invoiceNotes")
        .value.trim() ||
      null,

    company_key:
      companyKey,

    company_name:
      company(companyKey)
        .name,

    company_address:
      company(companyKey)
        .address,

    company_phone:
      company(companyKey)
        .phone
  };

  const id =
    $("invoiceId")
      .value;

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
    toast(
      errorMessage(
        result.error
      )
    );
    return;
  }

  closeModal(
    "invoiceModal"
  );

  toast(
    id
      ? "Invoice updated"
      : "Invoice created"
  );

  await loadAllData();
}

async function deleteInvoice(id) {
  if (
    !confirm(
      "Delete this invoice?"
    )
  ) return;

  const { error } =
    await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

  if (error) {
    toast(
      errorMessage(error)
    );
    return;
  }

  toast(
    "Invoice deleted"
  );

  await loadAllData();
}

function invoiceCompany(i) {
  return company(
    i.company_key ||
    "crystal",
    {
      name:
        i.company_name ||
        undefined,
      address:
        i.company_address ||
        undefined,
      phone:
        i.company_phone ||
        undefined
    }
  );
}

function invoiceHTML(i) {
  const v =
    vehicleById(
      i.vehicle_id
    );

  const c =
    invoiceCompany(i);

  const subtotal =
    num(
      i.subtotal ??
      num(i.labour) +
      num(i.parts) +
      num(i.other)
    );

  const paid =
    num(i.paid);

  const balance =
    num(
      i.balance ??
      subtotal - paid
    );

  return `
    ${companyHTML(c)}

    <hr>

    <h2>INVOICE</h2>

    <p>
      <strong>Invoice No:</strong>
      ${esc(i.invoice_no)}
      <br>

      <strong>Date:</strong>
      ${esc(i.invoice_date)}
    </p>

    <p>
      <strong>Vehicle:</strong>
      ${esc(
        v?.registration ||
        "Unlinked"
      )}
      <br>

      <strong>Customer:</strong>
      ${esc(
        i.customer ||
        v?.customer ||
        ""
      )}
    </p>

    <table class="preview-table">

      <tr>
        <th>Description</th>
        <th>Amount</th>
      </tr>

      <tr>
        <td>Labour</td>
        <td>${money(i.labour)}</td>
      </tr>

      <tr>
        <td>Parts</td>
        <td>${money(i.parts)}</td>
      </tr>

      <tr>
        <td>Other</td>
        <td>${money(i.other)}</td>
      </tr>

      <tr>
        <th>SUBTOTAL</th>
        <th>${money(subtotal)}</th>
      </tr>

      <tr>
        <td>Paid</td>
        <td>${money(paid)}</td>
      </tr>

      <tr>
        <th>BALANCE</th>
        <th>${money(balance)}</th>
      </tr>

    </table>

    <p>
      <strong>Status:</strong>
      ${esc(i.status || "")}
    </p>

    <p>
      ${esc(i.notes || "")}
    </p>
  `;
}

function viewInvoice(id) {
  const i =
    invoiceById(id);

  if (!i) return;

  showPreview(
    `Invoice ${i.invoice_no}`,
    invoiceHTML(i)
  );
}

function shareInvoice(id) {
  const i =
    invoiceById(id);

  if (!i) return;

  const v =
    vehicleById(
      i.vehicle_id
    );

  const subtotal =
    num(i.subtotal);

  const paid =
    num(i.paid);

  const balance =
    num(
      i.balance ??
      subtotal - paid
    );

  shareText(
    `Invoice ${i.invoice_no}`,
`INVOICE

Invoice: ${i.invoice_no}
Date: ${i.invoice_date || ""}
Vehicle: ${v?.registration || ""}
Customer: ${i.customer || ""}

Subtotal: ${money(subtotal)}
Paid: ${money(paid)}
Balance: ${money(balance)}
Status: ${i.status || ""}`
  );
}

/* =========================================================
   GATE PASSES
   ========================================================= */

function calculateGateBalance() {
  const v =
    vehicleById(
      $("gateVehicle")
        ?.value
    );

  let balance = 0;

  if (v) {
    balance =
      outstanding(v);
  }

  const paid =
    num(
      $("gatePaid")
        ?.value
    );

  /*
    If an invoice is selected/
    typed, use invoice balance
    when available.
  */

  const invNo =
    norm(
      $("gateInvoice")
        ?.value
    );

  const invoice =
    invoices.find(
      i =>
        norm(i.invoice_no) ===
        invNo
    );

  if (invoice) {
    balance =
      num(
        invoice.balance
      );
  } else {
    balance =
      Math.max(
        0,
        balance - paid
      );
  }

  if ($("gateBalance"))
    $("gateBalance").value =
      balance.toFixed(2);

  return balance;
}

window.calculateGateBalance =
  calculateGateBalance;

function syncGateVehicle() {
  const v =
    vehicleById(
      $("gateVehicle")
        ?.value
    );

  if (!v) {
    $("gateVehicleRegistration").value =
      "";

    return;
  }

  $("gateVehicleRegistration").value =
    v.registration || "";

  if (
    $("gateCustomer") &&
    !$("gateCustomer").value
  ) {
    $("gateCustomer").value =
      v.customer || "";
  }

  if (
    $("gateReleasedTo") &&
    !$("gateReleasedTo").value
  ) {
    $("gateReleasedTo").value =
      v.released_to || "";
  }

  if (
    $("gateReleasedContact") &&
    !$("gateReleasedContact").value
  ) {
    $("gateReleasedContact").value =
      v.released_contact || "";
  }

  calculateGateBalance();
}

function renderGatePasses() {
  const body =
    $("gatePassesTableBody");

  if (!body) return;

  const search =
    norm(
      $("gateSearch")?.value
    );

  const status =
    $("gateStatusFilter")
      ?.value || "";

  const list =
    gatePasses.filter(g => {

      const v =
        vehicleById(
          g.vehicle_id
        );

      const haystack = [
        g.gate_pass_no,
        g.pass_no,
        g.customer,
        g.released_to,
        g.invoice_no,
        v?.registration,
        v?.customer
      ]
        .map(norm)
        .join(" ");

      return (
        (!search ||
          haystack.includes(search)) &&
        (!status ||
          g.status === status)
      );
    });

  body.innerHTML =
    list.map(g => {

      const v =
        vehicleById(
          g.vehicle_id
        );

      return `
        <tr>

          <td>
            <strong>
              ${esc(
                g.gate_pass_no ||
                g.pass_no ||
                ""
              )}
            </strong>
          </td>

          <td>
            ${esc(
              g.pass_date || ""
            )}
          </td>

          <td>
            ${esc(
              v?.registration ||
              g.vehicle_registration ||
              "Unlinked"
            )}
          </td>

          <td>
            ${esc(
              g.customer ||
              v?.customer ||
              ""
            )}
          </td>

          <td>
            ${esc(
              g.released_to ||
              ""
            )}
          </td>

          <td>
            ${esc(
              g.invoice_no ||
              ""
            )}
          </td>

          <td>
            ${money(g.paid)}
          </td>

          <td>
            ${money(g.balance)}
          </td>

          <td>
            ${statusBadge(
              g.status ||
              "Pending"
            )}
          </td>

          <td>
            <div class="table-actions">

              <button
                class="action-btn"
                onclick="editGatePass('${g.id}')">
                ✏️
              </button>

              <button
                class="action-btn blue"
                onclick="viewGatePass('${g.id}')">
                👁️
              </button>

              <button
                class="action-btn"
                onclick="shareGatePass('${g.id}')">
                📤
              </button>

              <button
                class="action-btn danger"
                onclick="deleteGatePass('${g.id}')">
                🗑️
              </button>

            </div>
          </td>

        </tr>
      `;
    })
    .join("") ||
    `<tr>
      <td colspan="10">
        No gate passes found.
      </td>
    </tr>`;
}

function openGatePassModal() {
  $("gatePassForm")?.reset();

  $("gatePassId").value =
    "";

  $("gatePassDate").value =
    today();

  fillVehicleSelect(
    "gateVehicle"
  );

  if ($("gateCompanySelect"))
    $("gateCompanySelect").value =
      "crystal";

  $("gateAuthorizedBy").value =
    sessionStorage.getItem(
      "garageUser"
    ) || "Josephine";

  $("gatePaid").value =
    "0";

  $("gateBalance").value =
    "0";

  $("gatePassModalTitle").textContent =
    "New Gate Pass";

  openModal(
    "gatePassModal"
  );
}

function editGatePass(id) {
  const g =
    gateById(id);

  if (!g) return;

  fillVehicleSelect(
    "gateVehicle"
  );

  $("gatePassId").value =
    g.id;

  $("gatePassNo").value =
    g.gate_pass_no ||
    g.pass_no ||
    "";

  $("gatePassDate").value =
    g.pass_date ||
    today();

  $("gateVehicle").value =
    g.vehicle_id || "";

  $("gateVehicleRegistration").value =
    g.vehicle_registration ||
    vehicleById(
      g.vehicle_id
    )?.registration ||
    "";

  $("gateCustomer").value =
    g.customer ||
    vehicleById(
      g.vehicle_id
    )?.customer ||
    "";

  $("gateReleasedTo").value =
    g.released_to || "";

  $("gateReleasedContact").value =
    g.released_contact || "";

  $("gateInvoice").value =
    g.invoice_no || "";

  $("gatePaid").value =
    g.paid || 0;

  $("gateBalance").value =
    g.balance || 0;

  $("gateAuthorizedBy").value =
    g.authorized_by ||
    "Josephine";

  $("gateStatus").value =
    g.status ||
    "Pending";

  $("gateNotes").value =
    g.notes || "";

  if ($("gateCompanySelect"))
    $("gateCompanySelect").value =
      g.company_key ||
      "crystal";

  $("gatePassModalTitle").textContent =
    "Edit Gate Pass";

  openModal(
    "gatePassModal"
  );
}

async function saveGatePass(e) {
  e.preventDefault();

  const id =
    $("gatePassId").value;

  const companyKey =
    $("gateCompanySelect")
      ?.value ||
    "crystal";

  const v =
    vehicleById(
      $("gateVehicle")
        .value
    );

  const record = {
    gate_pass_no:
      $("gatePassNo")
        .value.trim(),

    pass_date:
      $("gatePassDate").value ||
      today(),

    vehicle_id:
      $("gateVehicle").value ||
      null,

    vehicle_registration:
      v?.registration ||
      $("gateVehicleRegistration")
        .value ||
      null,

    customer:
      $("gateCustomer")
        .value.trim() ||
      v?.customer ||
      null,

    released_to:
      $("gateReleasedTo")
        .value.trim(),

    released_contact:
      $("gateReleasedContact")
        .value.trim() ||
      null,

    invoice_no:
      $("gateInvoice")
        .value.trim() ||
      null,

    paid:
      num(
        $("gatePaid").value
      ),

    balance:
      calculateGateBalance(),

    authorized_by:
      $("gateAuthorizedBy")
        .value.trim() ||
      null,

    status:
      $("gateStatus").value ||
      "Pending",

    notes:
      $("gateNotes")
        .value.trim() ||
      null,

    company_key:
      companyKey,

    company_name:
      company(companyKey)
        .name,

    company_address:
      company(companyKey)
        .address,

    company_phone:
      company(companyKey)
        .phone
  };

  if (!record.gate_pass_no) {
    toast(
      "Gate Pass number is required"
    );
    return;
  }

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
    toast(
      errorMessage(
        result.error
      )
    );
    return;
  }

  closeModal(
    "gatePassModal"
  );

  toast(
    id
      ? "Gate Pass updated"
      : "Gate Pass created"
  );

  await loadAllData();
}

async function deleteGatePass(id) {
  if (
    !confirm(
      "Delete this gate pass?"
    )
  ) return;

  const { error } =
    await supabase
      .from("gate_passes")
      .delete()
      .eq("id", id);

  if (error) {
    toast(
      errorMessage(error)
    );
    return;
  }

  toast(
    "Gate Pass deleted"
  );

  await loadAllData();
}

function gateCompany(g) {
  return company(
    g.company_key ||
    "crystal",
    {
      name:
        g.company_name ||
        undefined,

      address:
        g.company_address ||
        undefined,

      phone:
        g.company_phone ||
        undefined
    }
  );
}

function gatePassHTML(g) {
  const v =
    vehicleById(
      g.vehicle_id
    );

  return `
    ${companyHTML(
      gateCompany(g)
    )}

    <hr>

    <h2>GATE PASS</h2>

    <p>
      <strong>Gate Pass No:</strong>
      ${esc(
        g.gate_pass_no ||
        g.pass_no ||
        ""
      )}

      <br>

      <strong>Date:</strong>
      ${esc(
        g.pass_date ||
        ""
      )}
    </p>

    <p>
      <strong>Vehicle:</strong>
      ${esc(
        v?.registration ||
        g.vehicle_registration ||
        ""
      )}

      <br>

      <strong>Customer:</strong>
      ${esc(
        g.customer ||
        v?.customer ||
        ""
      )}
    </p>

    <p>
      <strong>Released To:</strong>
      ${esc(
        g.released_to ||
        ""
      )}
    </p>

    <p>
      <strong>Contact:</strong>
      ${esc(
        g.released_contact ||
        ""
      )}
    </p>

    <p>
      <strong>Invoice:</strong>
      ${esc(
        g.invoice_no ||
        ""
      )}
    </p>

    <p>
      <strong>Paid:</strong>
      ${money(g.paid)}
    </p>

    <p>
      <strong>Balance:</strong>
      ${money(g.balance)}
    </p>

    <p>
      <strong>Status:</strong>
      ${esc(g.status || "")}
    </p>

    <p>
      <strong>Authorized By:</strong>
      ${esc(
        g.authorized_by ||
        ""
      )}
    </p>

    <p>
      <strong>Notes:</strong>
      ${esc(
        g.notes ||
        ""
      )}
    </p>
  `;
}

function viewGatePass(id) {
  const g =
    gateById(id);

  if (!g) return;

  showPreview(
    `Gate Pass ${
      g.gate_pass_no ||
      g.pass_no ||
      ""
    }`,
    gatePassHTML(g)
  );
}

function shareGatePass(id) {
  const g =
    gateById(id);

  if (!g) return;

  const v =
    vehicleById(
      g.vehicle_id
    );

  shareText(
    "Gate Pass",
`GATE PASS

Gate Pass: ${g.gate_pass_no || g.pass_no || ""}
Date: ${g.pass_date || ""}
Vehicle: ${v?.registration || g.vehicle_registration || ""}
Customer: ${g.customer || v?.customer || ""}
Released To: ${g.released_to || ""}
Contact: ${g.released_contact || ""}
Invoice: ${g.invoice_no || ""}
Paid: ${money(g.paid)}
Balance: ${money(g.balance)}
Status: ${g.status || ""}`
  );
}

/* =========================================================
   ESTIMATES
   ========================================================= */

function ensureEstimateSection() {

  if ($("estimates"))
    return;

  const page =
    document.querySelector(
      ".page"
    );

  if (!page) return;

  const section =
    document.createElement(
      "section"
    );

  section.id =
    "estimates";

  section.className =
    "app-section";

  section.innerHTML = `
    <div class="page-header">

      <div>
        <h2>Estimates / Quotations</h2>
        <p>
          Prepare customer repair estimates
          and quotations.
        </p>
      </div>

      <div class="header-actions">
        <button
          class="btn"
          onclick="printEstimates()">
          🖨 Print
        </button>

        <button
          class="btn btn-primary"
          onclick="openEstimateModal()">
          + New Estimate
        </button>
      </div>

    </div>

    <div class="toolbar">

      <div class="search-box">
        <input
          id="estimateSearch"
          type="search"
          placeholder="Search estimate, vehicle or customer...">
      </div>

      <select
        id="estimateStatusFilter"
        style="max-width:200px">

        <option value="">
          All statuses
        </option>

        <option>Draft</option>
        <option>Sent</option>
        <option>Approved</option>
        <option>Rejected</option>
        <option>Converted</option>

      </select>

    </div>

    <div class="table-card">

      <table>

        <thead>
          <tr>
            <th>Estimate</th>
            <th>Date</th>
            <th>Vehicle</th>
            <th>Customer</th>
            <th>Parts</th>
            <th>Labour</th>
            <th>Other</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody id="estimatesTableBody"></tbody>

      </table>

    </div>
  `;

  page.appendChild(
    section
  );

  createEstimateModal();

  bindEstimateSearch();
}

function createEstimateModal() {

  if ($("estimateModal"))
    return;

  const modal =
    document.createElement(
      "div"
    );

  modal.id =
    "estimateModal";

  modal.className =
    "modal";

  modal.innerHTML = `
    <div class="modal-content">

      <div class="modal-header">

        <h3 id="estimateModalTitle">
          New Estimate
        </h3>

        <button
          class="modal-close"
          onclick="closeModal('estimateModal')">
          ×
        </button>

      </div>

      <form id="estimateForm">

        <div class="modal-body">

          <input
            id="estimateId"
            type="hidden">

          <div class="form-grid">

            <div class="form-group">
              <label>
                Estimate No.
              </label>

              <input
                id="estimateNo"
                required
                placeholder="EST-2026-0001">
            </div>

            <div class="form-group">
              <label>
                Date
              </label>

              <input
                id="estimateDate"
                type="date"
                required>
            </div>

            <div class="form-group">
              <label>
                Vehicle
              </label>

              <select
                id="estimateVehicle">
              </select>
            </div>

            <div class="form-group">
              <label>
                Customer
              </label>

              <input
                id="estimateCustomer"
                required>
            </div>

            <div class="form-group">
              <label>
                Parts (KSh)
              </label>

              <input
                id="estimateParts"
                type="number"
                min="0"
                step="0.01"
                value="0">
            </div>

            <div class="form-group">
              <label>
                Labour (KSh)
              </label>

              <input
                id="estimateLabour"
                type="number"
                min="0"
                step="0.01"
                value="0">
            </div>

            <div class="form-group">
              <label>
                Other (KSh)
              </label>

              <input
                id="estimateOther"
                type="number"
                min="0"
                step="0.01"
                value="0">
            </div>

            <div class="form-group">
              <label>
                Total (KSh)
              </label>

              <input
                id="estimateTotal"
                class="readonly"
                type="number"
                readonly
                value="0">
            </div>

            <div class="form-group">
              <label>
                Status
              </label>

              <select id="estimateStatus">
                <option>Draft</option>
                <option>Sent</option>
                <option>Approved</option>
                <option>Rejected</option>
                <option>Converted</option>
              </select>
            </div>

            <div class="form-group">
              <label>
                Company
              </label>

              <select
                id="estimateCompany">
                <option value="crystal">
                  CRYSTAL MOTORS (K) LTD
                </option>

                <option value="quarry">
                  QUARRY ROUTE MOTORS LTD
                </option>

                <option value="other">
                  OTHER
                </option>
              </select>
            </div>

            <div class="form-group full">
              <label>
                Description
              </label>

              <textarea
                id="estimateDescription">
              </textarea>
            </div>

            <div class="form-group full">
              <label>
                Notes
              </label>

              <textarea
                id="estimateNotes">
              </textarea>
            </div>

          </div>

        </div>

        <div class="modal-footer">

          <button
            type="button"
            class="btn"
            onclick="closeModal('estimateModal')">
            Cancel
          </button>

          <button
            class="btn btn-primary">
            Save Estimate
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(
    modal
  );
}

function calculateEstimate() {

  const total =
    num(
      $("estimateParts")
        ?.value
    ) +
    num(
      $("estimateLabour")
        ?.value
    ) +
    num(
      $("estimateOther")
        ?.value
    );

  if ($("estimateTotal"))
    $("estimateTotal").value =
      total.toFixed(2);

  return total;
}

window.calculateEstimate =
  calculateEstimate;

function renderEstimates() {

  ensureEstimateSection();

  const body =
    $("estimatesTableBody");

  if (!body) return;

  const search =
    norm(
      $("estimateSearch")
        ?.value
    );

  const status =
    $("estimateStatusFilter")
      ?.value || "";

  const list =
    estimates.filter(e => {

      const v =
        vehicleById(
          e.vehicle_id
        );

      const haystack = [
        e.estimate_no,
        e.customer,
        v?.registration,
        v?.customer,
        e.description
      ]
        .map(norm)
        .join(" ");

      return (
        (!search ||
          haystack.includes(search)) &&
        (!status ||
          e.status === status)
      );
    });

  body.innerHTML =
    list.map(e => {

      const v =
        vehicleById(
          e.vehicle_id
        );

      const total =
        num(
          e.total ??
          num(e.parts) +
          num(e.labour) +
          num(e.other)
        );

      return `
        <tr>

          <td>
            <strong>
              ${esc(
                e.estimate_no ||
                ""
              )}
            </strong>
          </td>

          <td>
            ${esc(
              e.estimate_date ||
              ""
            )}
          </td>

          <td>
            ${esc(
              v?.registration ||
              "Unlinked"
            )}
          </td>

          <td>
            ${esc(
              e.customer ||
              v?.customer ||
              ""
            )}
          </td>

          <td>
            ${money(e.parts)}
          </td>

          <td>
            ${money(e.labour)}
          </td>

          <td>
            ${money(e.other)}
          </td>

          <td>
            <strong>
              ${money(total)}
            </strong>
          </td>

          <td>
            ${statusBadge(
              e.status ||
              "Draft"
            )}
          </td>

          <td>
            <div class="table-actions">

              <button
                class="action-btn"
                onclick="editEstimate('${e.id}')">
                ✏️
              </button>

              <button
                class="action-btn blue"
                onclick="viewEstimate('${e.id}')">
                👁️
              </button>

              <button
                class="action-btn"
                onclick="shareEstimate('${e.id}')">
                📤
              </button>

              <button
                class="action-btn danger"
                onclick="deleteEstimate('${e.id}')">
                🗑️
              </button>

            </div>
          </td>

        </tr>
      `;
    })
    .join("") ||
    `<tr>
      <td colspan="10">
        No estimates found.
      </td>
    </tr>`;
}

function bindEstimateSearch() {

  [
    "estimateSearch",
    "estimateStatusFilter"
  ].forEach(id => {

    const el = $(id);

    if (!el || el.dataset.bound)
      return;

    el.dataset.bound =
      "true";

    el.addEventListener(
      "input",
      renderEstimates
    );

    el.addEventListener(
      "change",
      renderEstimates
    );
  });
}

function openEstimateModal() {

  createEstimateModal();

  $("estimateForm")?.reset();

  $("estimateId").value =
    "";

  $("estimateDate").value =
    today();

  fillVehicleSelect(
    "estimateVehicle"
  );

  $("estimateCompany").value =
    "crystal";

  calculateEstimate();

  $("estimateModalTitle")
    .textContent =
      "New Estimate";

  openModal(
    "estimateModal"
  );
}

function editEstimate(id) {

  const e =
    estimateById(id);

  if (!e) return;

  fillVehicleSelect(
    "estimateVehicle"
  );

  $("estimateId").value =
    e.id;

  $("estimateNo").value =
    e.estimate_no || "";

  $("estimateDate").value =
    e.estimate_date ||
    today();

  $("estimateVehicle").value =
    e.vehicle_id || "";

  $("estimateCustomer").value =
    e.customer || "";

  $("estimateParts").value =
    e.parts || 0;

  $("estimateLabour").value =
    e.labour || 0;

  $("estimateOther").value =
    e.other || 0;

  $("estimateTotal").value =
    e.total ||
    num(e.parts) +
    num(e.labour) +
    num(e.other);

  $("estimateStatus").value =
    e.status ||
    "Draft";

  $("estimateCompany").value =
    e.company_key ||
    "crystal";

  $("estimateDescription").value =
    e.description || "";

  $("estimateNotes").value =
    e.notes || "";

  $("estimateModalTitle")
    .textContent =
      "Edit Estimate";

  openModal(
    "estimateModal"
  );
}

async function saveEstimate(e) {
  e.preventDefault();

  const total =
    calculateEstimate();

  const companyKey =
    $("estimateCompany")
      .value ||
    "crystal";

  const id =
    $("estimateId")
      .value;

  const record = {
    estimate_no:
      $("estimateNo")
        .value.trim(),

    estimate_date:
      $("estimateDate")
        .value ||
      today(),

    vehicle_id:
      $("estimateVehicle")
        .value ||
      null,

    customer:
      $("estimateCustomer")
        .value.trim(),

    parts:
      num(
        $("estimateParts")
          .value
      ),

    labour:
      num(
        $("estimateLabour")
          .value
      ),

    other:
      num(
        $("estimateOther")
          .value
      ),

    total,

    status:
      $("estimateStatus")
        .value ||
      "Draft",

    description:
      $("estimateDescription")
        .value.trim() ||
      null,

    notes:
      $("estimateNotes")
        .value.trim() ||
      null,

    company_key:
      companyKey,

    company_name:
      company(companyKey)
        .name,

    company_address:
      company(companyKey)
        .address,

    company_phone:
      company(companyKey)
        .phone
  };

  let result;

  if (id) {
    result =
      await supabase
        .from("estimates")
        .update(record)
        .eq("id", id);
  } else {
    result =
      await supabase
        .from("estimates")
        .insert(record);
  }

  if (result.error) {
    toast(
      errorMessage(
        result.error
      )
    );
    return;
  }

  closeModal(
    "estimateModal"
  );

  toast(
    id
      ? "Estimate updated"
      : "Estimate created"
  );

  await loadAllData();
}

function estimateCompany(e) {
  return company(
    e.company_key ||
    "crystal",
    {
      name:
        e.company_name ||
        undefined,

      address:
        e.company_address ||
        undefined,

      phone:
        e.company_phone ||
        undefined
    }
  );
}

function estimateHTML(e) {

  const v =
    vehicleById(
      e.vehicle_id
    );

  const total =
    num(
      e.total ??
      num(e.parts) +
      num(e.labour) +
      num(e.other)
    );

  return `
    ${companyHTML(
      estimateCompany(e)
    )}

    <hr>

    <h2>
      REPAIR ESTIMATE / QUOTATION
    </h2>

    <p>
      <strong>Estimate No:</strong>
      ${esc(e.estimate_no)}
      <br>

      <strong>Date:</strong>
      ${esc(e.estimate_date)}
    </p>

    <p>
      <strong>Vehicle:</strong>
      ${esc(
        v?.registration ||
        ""
      )}

      <br>

      <strong>Customer:</strong>
      ${esc(
        e.customer ||
        v?.customer ||
        ""
      )}
    </p>

    <table class="preview-table">

      <tr>
        <th>Description</th>
        <th>Amount</th>
      </tr>

      <tr>
        <td>Parts</td>
        <td>${money(e.parts)}</td>
      </tr>

      <tr>
        <td>Labour</td>
        <td>${money(e.labour)}</td>
      </tr>

      <tr>
        <td>Other</td>
        <td>${money(e.other)}</td>
      </tr>

      <tr>
        <th>TOTAL</th>
        <th>${money(total)}</th>
      </tr>

    </table>

    <p>
      <strong>Description:</strong>
      ${esc(e.description || "")}
    </p>

    <p>
      <strong>Notes:</strong>
      ${esc(e.notes || "")}
    </p>

    <p>
      <strong>Status:</strong>
      ${esc(e.status || "")}
    </p>
  `;
}

function viewEstimate(id) {

  const e =
    estimateById(id);

  if (!e) return;

  currentEstimateId =
    id;

  showPreview(
    `Estimate ${e.estimate_no}`,
    estimateHTML(e)
  );
}

function shareEstimate(id) {

  const e =
    estimateById(id);

  if (!e) return;

  const v =
    vehicleById(
      e.vehicle_id
    );

  const total =
    num(
      e.total ??
      num(e.parts) +
      num(e.labour) +
      num(e.other)
    );

  shareText(
    `Estimate ${e.estimate_no}`,
`REPAIR ESTIMATE

Estimate: ${e.estimate_no}
Date: ${e.estimate_date || ""}
Vehicle: ${v?.registration || ""}
Customer: ${e.customer || ""}

Parts: ${money(e.parts)}
Labour: ${money(e.labour)}
Other: ${money(e.other)}

TOTAL: ${money(total)}

Status: ${e.status || ""}`
  );
}

async function deleteEstimate(id) {

  if (
    !confirm(
      "Delete this estimate?"
    )
  ) return;

  const { error } =
    await supabase
      .from("estimates")
      .delete()
      .eq("id", id);

  if (error) {
    toast(
      errorMessage(error)
    );
    return;
  }

  toast(
    "Estimate deleted"
  );

  await loadAllData();
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {

  const totalVehicles =
    vehicles.length;

  const repair =
    vehicles.filter(
      v =>
        v.status ===
        "Under Repair"
    ).length;

  const billed =
    vehicles.reduce(
      (s, v) =>
        s + num(v.billed),
      0
    );

  const paid =
    vehicles.reduce(
      (s, v) =>
        s + num(v.paid),
      0
    );

  const outstandingTotal =
    vehicles.reduce(
      (s, v) =>
        s + outstanding(v),
      0
    );

  const expenseTotal =
    expenses.reduce(
      (s, e) =>
        s + num(e.amount),
      0
    );

  const pettyTotal =
    pettyCash.reduce(
      (s, p) =>
        s + num(p.amount),
      0
    );

  const reqTotal =
    requisitions.reduce(
      (s, r) =>
        s +
        num(
          r.total_amount ??
          num(r.quantity) *
          num(r.unit_cost)
        ),
      0
    );

  /*
    IMPORTANT:
    Dashboard now shows total
    records, not only pending.
  */

  setText(
    "dashVehicles",
    totalVehicles
  );

  setText(
    "dashRepair",
    repair
  );

  setText(
    "dashOutstanding",
    money(
      outstandingTotal
    )
  );

  setText(
    "dashReq",
    requisitions.length
  );

  setText(
    "dashInvoices",
    invoices.length
  );

  setText(
    "dashGatePasses",
    gatePasses.length
  );

  setText(
    "dashBilled",
    money(billed)
  );

  setText(
    "dashPaid",
    money(paid)
  );

  setText(
    "dashExpenses",
    money(expenseTotal)
  );

  setText(
    "dashPetty",
    money(pettyTotal)
  );

  setText(
    "dashReqCount",
    requisitions.length
  );

  setText(
    "dashReqTotal",
    money(reqTotal)
  );

  renderMonthlyChart();
  renderVehicleStatus();
  renderActivity();
}

function setText(id, value) {
  const el = $(id);

  if (el)
    el.textContent =
      value;
}

function renderMonthlyChart() {

  const box =
    $("monthlyExpenseChart");

  if (!box) return;

  const months = [];

  for (
    let i = 5;
    i >= 0;
    i--
  ) {

    const d =
      new Date();

    d.setMonth(
      d.getMonth() - i
    );

    const key =
      `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}`;

    const amount =
      expenses
        .filter(e =>
          String(
            e.expense_date || ""
          ).startsWith(key)
        )
        .reduce(
          (s, e) =>
            s + num(e.amount),
          0
        );

    months.push({
      key,
      amount,
      label:
        d.toLocaleString(
          "en-US",
          {
            month: "short"
          }
        )
    });
  }

  const max =
    Math.max(
      1,
      ...months.map(
        m => m.amount
      )
    );

  box.innerHTML =
    months.map(m => {

      const height =
        Math.max(
          8,
          (m.amount / max) *
          170
        );

      return `
        <div
          style="
            flex:1;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:5px;
          ">

          <small style="font-size:9px">
            ${money(
              m.amount
            ).replace("KSh ", "")}
          </small>

          <div
            class="chart-bar"
            title="${money(m.amount)}"
            style="
              height:${height}px;
              width:100%;
            ">
          </div>

          <small>
            ${esc(m.label)}
          </small>

        </div>
      `;
    })
    .join("");
}

function renderVehicleStatus() {

  const box =
    $("vehicleStatusSummary");

  if (!box) return;

  const statuses = [
    "Storage",
    "Under Repair",
    "Completed",
    "Released"
  ];

  box.innerHTML =
    statuses.map(status => {

      const count =
        vehicles.filter(
          v =>
            v.status ===
            status
        ).length;

      return `
        <div class="status-row">

          <span>
            ${statusBadge(status)}
          </span>

          <strong>
            ${count}
          </strong>

        </div>
      `;
    })
    .join("");
}

function renderActivity() {

  const box =
    $("dashboardActivity");

  if (!box) return;

  const activity = [];

  vehicles
    .slice(0, 4)
    .forEach(v => {
      activity.push({
        icon: "🚘",
        title:
          `Vehicle ${v.registration}`,
        text:
          `${v.customer || ""} • ${v.status || ""}`
      });
    });

  expenses
    .slice(0, 4)
    .forEach(e => {

      const v =
        vehicleById(
          e.vehicle_id
        );

      activity.push({
        icon: "💳",
        title:
          `Expense ${money(e.amount)}`,
        text:
          `${v?.registration || "General"} • ${e.description || ""}`
      });
    });

  invoices
    .slice(0, 3)
    .forEach(i => {
      activity.push({
        icon: "🧾",
        title:
          `Invoice ${i.invoice_no || ""}`,
        text:
          `${i.customer || ""} • ${money(i.total || i.subtotal)}`
      });
    });

  box.innerHTML =
    activity
      .slice(0, 8)
      .map(a => `
        <div class="activity-item">

          <div class="activity-icon">
            ${a.icon}
          </div>

          <div class="activity-main">

            <strong>
              ${esc(a.title)}
            </strong>

            <span>
              ${esc(a.text)}
            </span>

          </div>

        </div>
      `)
      .join("") ||
    `
      <div class="activity-item">
        No recent activity.
      </div>
    `;
}

/* =========================================================
   PREVIEW / PRINT / SHARE
   ========================================================= */

function showPreview(
  title,
  html
) {

  currentPreviewHTML =
    html;

  const titleEl =
    $("previewTitle");

  const content =
    $("previewContent");

  if (titleEl)
    titleEl.textContent =
      title;

  if (content)
    content.innerHTML =
      html;

  openModal(
    "previewModal"
  );
}

function printCurrentPreview() {

  if (!currentPreviewHTML) {
    toast(
      "Nothing to print"
    );
    return;
  }

  printHTML(`
    <html>
    <head>
      <title>
        Garage Operations Pro
      </title>

      <style>
        body{
          font-family:Arial;
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
          background:#f5f5f5;
        }
      </style>
    </head>

    <body>
      ${currentPreviewHTML}
    </body>
    </html>
  `);
}

function printHTML(html) {

  const w =
    window.open(
      "",
      "_blank",
      "width=1000,height=800"
    );

  if (!w) {
    toast(
      "Please allow pop-ups to print."
    );
    return;
  }

  w.document.open();
  w.document.write(html);
  w.document.close();

  setTimeout(() => {
    w.focus();
    w.print();
  }, 500);
}

async function shareText(
  title,
  text
) {

  if (!text) {
    toast(
      "Nothing to share"
    );
    return;
  }

  try {

    if (
      navigator.share
    ) {

      await navigator.share({
        title,
        text
      });

      return;
    }

    if (
      navigator.clipboard
    ) {

      await navigator.clipboard
        .writeText(text);

      toast(
        "Copied. Paste it into WhatsApp or another app."
      );

      return;
    }

    const area =
      document.createElement(
        "textarea"
      );

    area.value =
      text;

    document.body.appendChild(
      area
    );

    area.select();

    document.execCommand(
      "copy"
    );

    area.remove();

    toast(
      "Copied to clipboard"
    );

  } catch (e) {

    console.log(e);

    toast(
      "Share cancelled or unavailable."
    );
  }
}

/* =========================================================
   PRINT FUNCTIONS
   ========================================================= */

function printVehicles() {

  const rows =
    vehicles.map(v => `
      <tr>
        <td>${esc(v.registration)}</td>
        <td>${esc(v.customer)}</td>
        <td>${esc(v.date_in)}</td>
        <td>${esc(v.job_type)}</td>
        <td>${esc(v.status)}</td>
        <td>${storageDays(v)}</td>
        <td>${money(v.billed)}</td>
        <td>${money(v.paid)}</td>
        <td>${money(outstanding(v))}</td>
        <td>${money(vehicleExpenseTotal(v.id))}</td>
      </tr>
    `).join("");

  printHTML(`
    <html>
    <head>
      <title>Vehicles</title>
      <style>
        body{font-family:Arial;padding:25px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ccc;padding:7px}
        th{background:#eee}
      </style>
    </head>
    <body>
      ${companyHTML(company("crystal"))}

      <h2>VEHICLE REGISTER</h2>

      <table>
        <tr>
          <th>Registration</th>
          <th>Customer</th>
          <th>Date In</th>
          <th>Job</th>
          <th>Status</th>
          <th>Days</th>
          <th>Billed</th>
          <th>Paid</th>
          <th>Outstanding</th>
          <th>Expenses</th>
        </tr>
        ${rows}
      </table>
    </body>
    </html>
  `);
}

function printExpenses() {

  const search =
    norm(
      $("expenseSearch")
        ?.value
    );

  const exactVehicle =
    vehicles.find(
      v =>
        norm(v.registration) ===
        search
    );

  const list =
    exactVehicle
      ? vehicleExpenseData(
          exactVehicle.id
        )
      : expenses;

  const total =
    list.reduce(
      (s, e) =>
        s + num(e.amount),
      0
    );

  printHTML(`
    <html>
    <head>
      <title>Expense Report</title>
      <style>
        body{font-family:Arial;padding:25px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ccc;padding:8px}
        th{background:#eee}
      </style>
    </head>

    <body>

      ${companyHTML(
        company("crystal")
      )}

      <h2>
        ${
          exactVehicle
            ? `EXPENSE REPORT - ${esc(exactVehicle.registration)}`
            : "EXPENSE REPORT"
        }
      </h2>

      <table>

        <tr>
          <th>Date</th>
          <th>Vehicle</th>
          <th>Description</th>
          <th>Category</th>
          <th>Amount</th>
        </tr>

        ${
          list.map(e => {

            const v =
              vehicleById(
                e.vehicle_id
              );

            return `
              <tr>
                <td>${esc(e.expense_date)}</td>
                <td>${esc(v?.registration || "Unlinked")}</td>
                <td>${esc(e.description)}</td>
                <td>${esc(e.category)}</td>
                <td>${money(e.amount)}</td>
              </tr>
            `;
          }).join("")
        }

        <tr>
          <th colspan="4">
            TOTAL
          </th>
          <th>
            ${money(total)}
          </th>
        </tr>

      </table>

    </body>
    </html>
  `);
}

function printPettyCash() {

  const total =
    pettyCash.reduce(
      (s, p) =>
        s + num(p.amount),
      0
    );

  printHTML(`
    <html>
    <head>
      <title>Petty Cash</title>
      <style>
        body{font-family:Arial;padding:25px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ccc;padding:8px}
        th{background:#eee}
      </style>
    </head>

    <body>

      ${companyHTML(
        company("crystal")
      )}

      <h2>PETTY CASH</h2>

      <table>

        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Paid To</th>
          <th>Category</th>
          <th>Amount</th>
        </tr>

        ${
          pettyCash.map(p => `
            <tr>
              <td>${esc(p.cash_date)}</td>
              <td>${esc(p.description)}</td>
              <td>${esc(p.paid_to || "")}</td>
              <td>${esc(p.category || "")}</td>
              <td>${money(p.amount)}</td>
            </tr>
          `).join("")
        }

        <tr>
          <th colspan="4">
            TOTAL
          </th>
          <th>
            ${money(total)}
          </th>
        </tr>

      </table>

    </body>
    </html>
  `);
}

function printRequisitions() {

  const total =
    requisitions.reduce(
      (s, r) =>
        s +
        num(
          r.total_amount ??
          num(r.quantity) *
          num(r.unit_cost)
        ),
      0
    );

  printHTML(`
    <html>
    <head>
      <title>Requisitions</title>
      <style>
        body{font-family:Arial;padding:25px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ccc;padding:7px}
        th{background:#eee}
      </style>
    </head>

    <body>

      ${companyHTML(
        company("crystal")
      )}

      <h2>REQUISITIONS</h2>

      <table>

        <tr>
          <th>Req No</th>
          <th>Date</th>
          <th>Requester</th>
          <th>Vehicle</th>
          <th>Description</th>
          <th>Total</th>
          <th>Status</th>
        </tr>

        ${
          requisitions.map(r => {

            const v =
              vehicleById(
                r.vehicle_id
              );

            const amount =
              num(
                r.total_amount ??
                num(r.quantity) *
                num(r.unit_cost)
              );

            return `
              <tr>
                <td>${esc(r.req_no)}</td>
                <td>${esc(r.req_date)}</td>
                <td>${esc(r.requested_by)}</td>
                <td>${esc(v?.registration || "")}</td>
                <td>${esc(r.item_description)}</td>
                <td>${money(amount)}</td>
                <td>${esc(r.status)}</td>
              </tr>
            `;
          }).join("")
        }

        <tr>
          <th colspan="5">
            TOTAL
          </th>
          <th>
            ${money(total)}
          </th>
          <th></th>
        </tr>

      </table>

    </body>
    </html>
  `);
}

function printInvoices() {

  const total =
    invoices.reduce(
      (s, i) =>
        s +
        num(
          i.subtotal
        ),
      0
    );

  printHTML(`
    <html>
    <head>
      <title>Invoices</title>
      <style>
        body{font-family:Arial;padding:25px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ccc;padding:8px}
        th{background:#eee}
      </style>
    </head>

    <body>

      ${companyHTML(
        company("crystal")
      )}

      <h2>INVOICES</h2>

      <table>

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

        ${
          invoices.map(i => {

            const v =
              vehicleById(
                i.vehicle_id
              );

            const subtotal =
              num(i.subtotal);

            const paid =
              num(i.paid);

            const balance =
              num(
                i.balance ??
                subtotal - paid
              );

            return `
              <tr>
                <td>${esc(i.invoice_no)}</td>
                <td>${esc(i.invoice_date)}</td>
                <td>${esc(v?.registration || "")}</td>
                <td>${esc(i.customer || "")}</td>
                <td>${money(subtotal)}</td>
                <td>${money(paid)}</td>
                <td>${money(balance)}</td>
                <td>${esc(i.status || "")}</td>
              </tr>
            `;
          }).join("")
        }

        <tr>
          <th colspan="4">
            TOTAL INVOICED
          </th>
          <th>
            ${money(total)}
          </th>
          <th colspan="3"></th>
        </tr>

      </table>

    </body>
    </html>
  `);
}

function printGatePasses() {

  printHTML(`
    <html>
    <head>
      <title>Gate Passes</title>
      <style>
        body{font-family:Arial;padding:25px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ccc;padding:8px}
        th{background:#eee}
      </style>
    </head>

    <body>

      ${companyHTML(
        company("crystal")
      )}

      <h2>GATE PASSES</h2>

      <table>

        <tr>
          <th>Gate Pass</th>
          <th>Date</th>
          <th>Vehicle</th>
          <th>Customer</th>
          <th>Released To</th>
          <th>Paid</th>
          <th>Balance</th>
          <th>Status</th>
        </tr>

        ${
          gatePasses.map(g => {

            const v =
              vehicleById(
                g.vehicle_id
              );

            return `
              <tr>
                <td>
                  ${esc(
                    g.gate_pass_no ||
                    g.pass_no ||
                    ""
                  )}
                </td>

                <td>
                  ${esc(
                    g.pass_date ||
                    ""
                  )}
                </td>

                <td>
                  ${esc(
                    v?.registration ||
                    g.vehicle_registration ||
                    ""
                  )}
                </td>

                <td>
                  ${esc(
                    g.customer ||
                    v?.customer ||
                    ""
                  )}
                </td>

                <td>
                  ${esc(
                    g.released_to ||
                    ""
                  )}
                </td>

                <td>
                  ${money(g.paid)}
                </td>

                <td>
                  ${money(g.balance)}
                </td>

                <td>
                  ${esc(
                    g.status ||
                    ""
                  )}
                </td>
              </tr>
            `;
          }).join("")
        }

      </table>

    </body>
    </html>
  `);
}

function printEstimates() {

  printHTML(`
    <html>
    <head>
      <title>Estimates</title>
      <style>
        body{font-family:Arial;padding:25px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ccc;padding:8px}
        th{background:#eee}
      </style>
    </head>

    <body>

      ${companyHTML(
        company("crystal")
      )}

      <h2>
        ESTIMATES / QUOTATIONS
      </h2>

      <table>

        <tr>
          <th>Estimate</th>
          <th>Date</th>
          <th>Vehicle</th>
          <th>Customer</th>
          <th>Total</th>
          <th>Status</th>
        </tr>

        ${
          estimates.map(e => {

            const v =
              vehicleById(
                e.vehicle_id
              );

            const total =
              num(
                e.total ??
                num(e.parts) +
                num(e.labour) +
                num(e.other)
              );

            return `
              <tr>
                <td>${esc(e.estimate_no)}</td>
                <td>${esc(e.estimate_date)}</td>
                <td>${esc(v?.registration || "")}</td>
                <td>${esc(e.customer || "")}</td>
                <td>${money(total)}</td>
                <td>${esc(e.status || "")}</td>
              </tr>
            `;
          }).join("")
        }

      </table>

    </body>
    </html>
  `);
}

/* =========================================================
   EVENT BINDING
   ========================================================= */

function bind(id, event, fn) {

  const el = $(id);

  if (!el ||
      el.dataset[
        `bound_${event}`
      ]) {
    return;
  }

  el.dataset[
    `bound_${event}`
  ] = "true";

  el.addEventListener(
    event,
    fn
  );
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
    savePetty
  );

  bind(
    "reqForm",
    "submit",
    saveReq
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

  [
    "vehicleSearch",
    "vehicleStatusFilter"
  ].forEach(id => {

    bind(
      id,
      "input",
      renderVehicles
    );

    bind(
      id,
      "change",
      renderVehicles
    );
  });

  [
    "expenseSearch",
    "expenseCategoryFilter"
  ].forEach(id => {

    bind(
      id,
      "input",
      renderExpenses
    );

    bind(
      id,
      "change",
      renderExpenses
    );
  });

  [
    "pettySearch",
    "pettyCategoryFilter"
  ].forEach(id => {

    bind(
      id,
      "input",
      renderPettyCash
    );

    bind(
      id,
      "change",
      renderPettyCash
    );
  });

  [
    "reqSearch",
    "reqStatusFilter"
  ].forEach(id => {

    bind(
      id,
      "input",
      renderRequisitions
    );

    bind(
      id,
      "change",
      renderRequisitions
    );
  });

  [
    "invoiceSearch",
    "invoiceStatusFilter"
  ].forEach(id => {

    bind(
      id,
      "input",
      renderInvoices
    );

    bind(
      id,
      "change",
      renderInvoices
    );
  });

  [
    "gateSearch",
    "gateStatusFilter"
  ].forEach(id => {

    bind(
      id,
      "input",
      renderGatePasses
    );

    bind(
      id,
      "change",
      renderGatePasses
    );
  });

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
  ].forEach(id => {

    bind(
      id,
      "input",
      calculateInvoice
    );
  });

  bind(
    "invoiceVehicle",
    "change",
    syncInvoiceVehicle
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
    "gateInvoice",
    "input",
    calculateGateBalance
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
    "estimateForm",
    "submit",
    saveEstimate
  );

  bind(
    "estimateVehicle",
    "change",
    syncEstimateVehicle
  );

  [
    "estimateParts",
    "estimateLabour",
    "estimateOther"
  ].forEach(id => {

    bind(
      id,
      "input",
      calculateEstimate
    );
  });
}

function updateVehicleStorageDays() {

  const fake = {
    date_in:
      $("vehicleDateIn")
        ?.value,

    date_out:
      $("vehicleDateOut")
        ?.value
  };

  if ($("vehicleStorageDays"))
    $("vehicleStorageDays")
      .value =
        storageDays(fake);
}

function syncEstimateVehicle() {

  const v =
    vehicleById(
      $("estimateVehicle")
        ?.value
    );

  if (
    v &&
    $("estimateCustomer") &&
    !$("estimateCustomer").value
  ) {
    $("estimateCustomer")
      .value =
        v.customer || "";
  }
}

/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

Object.assign(
  window,
  {

    closeModal,
    openModal,

    openVehicleModal,
    editVehicle,
    deleteVehicle,
    saveVehicle,
    viewVehicle,
    shareVehicle,

    openExpenseModal,
    editExpense,
    deleteExpense,
    saveExpense,
    viewExpense,
    shareExpense,

    openPettyModal,
    editPetty,
    deletePetty,
    savePetty,
    viewPetty,
    sharePetty,

    openReqModal,
    editReq,
    deleteReq,
    saveReq,
    viewReq,
    shareReq,

    openInvoiceModal,
    editInvoice,
    deleteInvoice,
    saveInvoice,
    viewInvoice,
    shareInvoice,

    openGatePassModal,
    editGatePass,
    deleteGatePass,
    saveGatePass,
    viewGatePass,
    shareGatePass,

    openEstimateModal,
    editEstimate,
    deleteEstimate,
    saveEstimate,
    viewEstimate,
    shareEstimate,

    printVehicles,
    printExpenses,
    printPettyCash,
    printRequisitions,
    printInvoices,
    printGatePasses,
    printEstimates,

    printVehicleExpenses,
    printVehicleExpensePreview,

    printCurrentPreview,

    shareText,

    calculateReqTotal,
    calculateInvoice,
    calculateGateBalance,
    calculateEstimate
  }
);

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function init() {

  setupCompanyFields();

  ensureEstimateSection();

  setupEvents();

  const logged =
    sessionStorage.getItem(
      "garageLoggedIn"
    ) === "true";

  const user =
    sessionStorage.getItem(
      "garageUser"
    ) || "Josephine";

  if ($("sidebarUser"))
    $("sidebarUser")
      .textContent =
        user;

  if ($("welcomeUser"))
    $("welcomeUser")
      .textContent =
        user
          .charAt(0)
          .toUpperCase();

  /*
    Do not wait for login state
    to initialize the JS.
    The HTML login controls
    visibility itself.
  */

  await loadAllData();

  showSection(
    "dashboard"
  );
}

/* =========================================================
   START
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

} else {

  init();

}
