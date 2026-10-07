import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE APP.JS
   ========================================================= */

const SUPABASE_URL =
  "https://ptluwoeogfkqavhspdjj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";

const supabase =
  createClient(SUPABASE_URL, SUPABASE_KEY);

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

let currentVehicleExpenseId = null;

/* =========================================================
   HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(v) {
  return "KSh " + num(v).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function today() {
  const d = new Date();

  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

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
    .toUpperCase()
    .replace(/[\s\-_/]+/g, "");
}

function vehicleById(id) {
  return vehicles.find(
    v => String(v.id) === String(id)
  );
}

function toast(message, type = "") {
  const el = $("toast");

  if (!el) {
    console.log(message);
    return;
  }

  el.textContent = message;
  el.className = "toast show " + type;

  clearTimeout(window.__garageToast);

  window.__garageToast =
    setTimeout(() => {
      el.className = "toast";
    }, 3000);
}

/* =========================================================
   MODALS
   ========================================================= */

function openModal(id) {
  const el = $(id);

  if (!el) return;

  el.style.display = "flex";
  el.classList.add("show");
}

function closeModal(id) {
  const el = $(id);

  if (!el) return;

  el.style.display = "none";
  el.classList.remove("show");
}

function closeAllModals() {
  document
    .querySelectorAll(".modal")
    .forEach(el => {
      el.style.display = "none";
      el.classList.remove("show");
    });
}

/* =========================================================
   STYLES
   ========================================================= */

function injectStyles() {
  if ($("garageAppStyles")) return;

  const style = document.createElement("style");

  style.id = "garageAppStyles";

  style.textContent = `

    /* =====================================================
       TABLE LAYOUT
       ===================================================== */

    .table-container,
    .table-wrap {
      width:100% !important;
      overflow-x:auto !important;
      -webkit-overflow-scrolling:touch !important;
    }

    .table-container table,
    .table-wrap table {
      width:100%;
      min-width:900px;
      border-collapse:collapse;
    }

    .table-container th,
    .table-container td,
    .table-wrap th,
    .table-wrap td {
      padding:10px 12px !important;
      vertical-align:middle !important;
      white-space:nowrap;
    }

    /* Description can breathe */
    #expensesTableBody td:nth-child(3) {
      white-space:normal !important;
      min-width:230px;
      max-width:420px;
    }

    /* =====================================================
       ACTION BUTTONS
       ===================================================== */

    .table-actions {
      display:flex !important;
      flex-direction:row !important;
      flex-wrap:nowrap !important;
      align-items:center !important;
      justify-content:flex-start !important;
      gap:5px !important;
      white-space:nowrap !important;
      min-width:max-content !important;
    }

    .action-btn {
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
    }

    .action-btn:hover {
      transform:translateY(-1px);
      filter:brightness(.96);
    }

    .action-btn.blue {
      background:#e0f2fe !important;
      color:#075985 !important;
    }

    .action-btn.green {
      background:#dcfce7 !important;
      color:#166534 !important;
    }

    .action-btn.orange {
      background:#fef3c7 !important;
      color:#92400e !important;
    }

    .action-btn.purple {
      background:#ede9fe !important;
      color:#5b21b6 !important;
    }

    .action-btn.gray {
      background:#f1f5f9 !important;
      color:#172033 !important;
    }

    .action-btn.danger {
      background:#fee2e2 !important;
      color:#991b1b !important;
    }

    /* =====================================================
       EXPENSE SUMMARY
       ===================================================== */

    .garage-expense-summary {
      display:grid;
      grid-template-columns:
        repeat(3,minmax(0,1fr));
      gap:14px;
      margin:0 0 18px 0;
    }

    .garage-expense-summary-card {
      background:#ffffff;
      border:1px solid #e2e8f0;
      border-radius:14px;
      padding:18px;
      box-shadow:
        0 4px 15px rgba(15,23,42,.05);
    }

    .garage-expense-summary-label {
      font-size:12px;
      font-weight:700;
      text-transform:uppercase;
      letter-spacing:.06em;
      color:#64748b;
      margin-bottom:7px;
    }

    .garage-expense-summary-value {
      font-size:24px;
      font-weight:800;
      color:#0f172a;
      line-height:1.2;
    }

    .garage-expense-summary-sub {
      margin-top:5px;
      color:#64748b;
      font-size:12px;
    }

    .garage-expense-total {
      background:
        linear-gradient(
          135deg,
          #eff6ff,
          #ffffff
        );
      border-color:#bfdbfe;
    }

    .garage-expense-total
    .garage-expense-summary-value {
      color:#075985;
    }

    /* =====================================================
       TOTAL ROW
       ===================================================== */

    .garage-expense-total-row td {
      background:#f8fafc !important;
      font-weight:800 !important;
      border-top:2px solid #cbd5e1 !important;
    }

    .garage-expense-total-row td:last-child {
      color:#075985 !important;
      font-size:16px !important;
    }

    /* =====================================================
       ESTIMATES
       ===================================================== */

    #estimates {
      display:none !important;
      width:100% !important;
      max-width:100% !important;
      box-sizing:border-box !important;
      clear:both !important;
      float:none !important;
      position:relative !important;
      margin:0 !important;
      padding:0 !important;
      overflow:hidden !important;
      z-index:1 !important;
    }

    #estimates.active {
      display:block !important;
    }

    .garage-estimate-nav {
      cursor:pointer !important;
    }

    #estimateModal {
      z-index:99999 !important;
    }

    /* =====================================================
       MOBILE
       ===================================================== */

    @media(max-width:720px) {

      .garage-expense-summary {
        grid-template-columns:1fr;
      }

      .action-btn {
        width:32px !important;
        height:30px !important;
        min-width:32px !important;
        max-width:32px !important;
        flex:0 0 32px !important;
        font-size:14px !important;
      }

      .table-actions {
        gap:4px !important;
      }

      .table-container table,
      .table-wrap table {
        min-width:900px;
      }
    }

  `;

  document.head.appendChild(style);
}

/* =========================================================
   BUTTONS
   ========================================================= */

function actionButton(
  icon,
  title,
  functionName,
  id,
  color = "gray"
) {
  return `
    <button
      type="button"
      class="action-btn ${color}"
      title="${esc(title)}"
      aria-label="${esc(title)}"
      onclick="${functionName}('${esc(id)}')"
    >${icon}</button>
  `;
}

function vehicleActions(id) {
  return `
    <div class="table-actions">

      ${actionButton(
        "✏️",
        "Edit vehicle",
        "editVehicle",
        id,
        "blue"
      )}

      ${actionButton(
        "🚘",
        "Vehicle expenses",
        "viewVehicleExpenses",
        id,
        "green"
      )}

      ${actionButton(
        "👁️",
        "View vehicle",
        "viewVehicle",
        id,
        "gray"
      )}

      ${actionButton(
        "📤",
        "Share vehicle",
        "shareVehicle",
        id,
        "purple"
      )}

      ${actionButton(
        "🗑️",
        "Delete vehicle",
        "deleteVehicle",
        id,
        "danger"
      )}

    </div>
  `;
}

function normalActions(
  id,
  edit,
  view,
  share,
  del
) {
  return `
    <div class="table-actions">

      ${actionButton(
        "✏️",
        "Edit",
        edit,
        id,
        "blue"
      )}

      ${actionButton(
        "👁️",
        "View",
        view,
        id,
        "gray"
      )}

      ${actionButton(
        "📤",
        "Share",
        share,
        id,
        "purple"
      )}

      ${actionButton(
        "🗑️",
        "Delete",
        del,
        id,
        "danger"
      )}

    </div>
  `;
}

/* =========================================================
   DATABASE LOAD
   ========================================================= */

async function getRows(table) {
  try {

    let result =
      await supabase
        .from(table)
        .select("*")
        .order(
          "created_at",
          { ascending:false }
        );

    if (
      result.error &&
      /created_at/i.test(
        result.error.message || ""
      )
    ) {
      result =
        await supabase
          .from(table)
          .select("*");
    }

    if (result.error) {

      console.warn(
        table,
        result.error.message
      );

      return [];
    }

    return result.data || [];

  } catch(error) {

    console.error(
      "Loading " + table,
      error
    );

    return [];
  }
}

async function loadAllData() {

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
}

/* =========================================================
   VEHICLE EXPENSE FUNCTIONS
   ========================================================= */

function vehicleExpenses(id) {
  return expenses.filter(
    e =>
      String(e.vehicle_id) ===
      String(id)
  );
}

function vehicleExpenseTotal(id) {
  return vehicleExpenses(id)
    .reduce(
      (sum,e) =>
        sum + num(e.amount),
      0
    );
}

function storageDays(v) {

  if (!v?.date_in)
    return 0;

  const start =
    new Date(
      v.date_in +
      "T00:00:00"
    );

  const end =
    v.date_out
      ? new Date(
          v.date_out +
          "T00:00:00"
        )
      : new Date();

  return Math.max(
    0,
    Math.floor(
      (end - start) /
      86400000
    )
  );
}

/* =========================================================
   VEHICLES
   ========================================================= */

function filteredVehicles() {

  const q =
    norm(
      $("vehicleSearch")?.value ||
      ""
    );

  const status =
    $("vehicleStatusFilter")?.value ||
    "";

  return vehicles.filter(v => {

    const text =
      norm([
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

  const body =
    $("vehiclesTableBody");

  if (!body) return;

  const rows =
    filteredVehicles();

  if (!rows.length) {

    body.innerHTML = `
      <tr>
        <td
          colspan="11"
          style="text-align:center;padding:25px"
        >
          No vehicles found
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    rows.map(v => {

      const expenseTotal =
        vehicleExpenseTotal(v.id);

      const outstanding =
        num(v.billed) -
        num(v.paid);

      return `
        <tr>

          <td>
            <strong>
              ${esc(v.registration)}
            </strong>
          </td>

          <td>
            ${esc(v.customer)}
          </td>

          <td>
            ${esc(v.date_in || "")}
          </td>

          <td>
            ${esc(v.job_type || "")}
          </td>

          <td>
            ${esc(v.status || "")}
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
            ${money(outstanding)}
          </td>

          <td>
            <strong>
              ${money(expenseTotal)}
            </strong>
          </td>

          <td>
            ${vehicleActions(v.id)}
          </td>

        </tr>
      `;

    }).join("");
}

function openVehicleModal(id = "") {

  $("vehicleForm")?.reset();

  if ($("vehicleId"))
    $("vehicleId").value = "";

  if ($("vehicleModalTitle"))
    $("vehicleModalTitle").textContent =
      "Add Vehicle";

  if ($("vehicleDateIn"))
    $("vehicleDateIn").value =
      today();

  if ($("vehicleJobType"))
    $("vehicleJobType").value =
      "Repair";

  if ($("vehicleStatus"))
    $("vehicleStatus").value =
      "Under Repair";

  if ($("vehicleBilled"))
    $("vehicleBilled").value = 0;

  if ($("vehiclePaid"))
    $("vehiclePaid").value = 0;

  if ($("vehicleStorageDays"))
    $("vehicleStorageDays").value = 0;

  if (id)
    editVehicle(id);
  else
    openModal("vehicleModal");
}

async function saveVehicle(event) {

  event?.preventDefault();

  const id =
    $("vehicleId")?.value || "";

  const registration =
    $("vehicleRegistration")
      ?.value.trim() || "";

  const customer =
    $("vehicleCustomer")
      ?.value.trim() || "";

  if (!registration || !customer) {

    toast(
      "Registration and customer are required.",
      "error"
    );

    return;
  }

  const duplicate =
    vehicles.find(v =>
      norm(v.registration) ===
      norm(registration) &&
      String(v.id) !== String(id)
    );

  if (duplicate) {

    toast(
      "This vehicle registration already exists.",
      "error"
    );

    return;
  }

  const record = {

    registration,

    customer,

    date_in:
      $("vehicleDateIn")?.value ||
      today(),

    date_out:
      $("vehicleDateOut")?.value ||
      null,

    job_type:
      $("vehicleJobType")?.value ||
      "Repair",

    status:
      $("vehicleStatus")?.value ||
      "Under Repair",

    released_to:
      $("vehicleReleasedTo")
        ?.value.trim() ||
      null,

    released_contact:
      $("vehicleReleasedContact")
        ?.value.trim() ||
      null,

    billed:
      num(
        $("vehicleBilled")?.value
      ),

    paid:
      num(
        $("vehiclePaid")?.value
      ),

    description:
      $("vehicleDescription")
        ?.value.trim() ||
      null,

    model:
      $("vehicleModel")
        ?.value.trim() ||
      "",

    model_year:
      $("vehicleModelYear")
        ?.value.trim() ||
      "",

    color:
      $("vehicleColor")
        ?.value.trim() ||
      ""

  };

  let result;

  if (id) {

    result =
      await supabase
        .from("vehicles")
        .update(record)
        .eq("id",id);

  } else {

    result =
      await supabase
        .from("vehicles")
        .insert(record);
  }

  if (
    result.error &&
    /model|model_year|color/i.test(
      result.error.message || ""
    )
  ) {

    const fallback = {
      ...record
    };

    delete fallback.model;
    delete fallback.model_year;
    delete fallback.color;

    result =
      id
        ? await supabase
            .from("vehicles")
            .update(fallback)
            .eq("id",id)
        : await supabase
            .from("vehicles")
            .insert(fallback);
  }

  if (result.error) {

    toast(
      result.error.message,
      "error"
    );

    return;
  }

  closeModal("vehicleModal");

  await loadAllData();

  toast(
    id
      ? "Vehicle updated."
      : "Vehicle added."
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

  if ($("vehicleModel"))
    $("vehicleModel").value =
      v.model || "";

  if ($("vehicleModelYear"))
    $("vehicleModelYear").value =
      v.model_year || "";

  if ($("vehicleColor"))
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
    v.status || "Under Repair";

  $("vehicleReleasedTo").value =
    v.released_to || "";

  $("vehicleReleasedContact").value =
    v.released_contact || "";

  $("vehicleBilled").value =
    num(v.billed);

  $("vehiclePaid").value =
    num(v.paid);

  $("vehicleDescription").value =
    v.description || "";

  $("vehicleModalTitle").textContent =
    "Edit Vehicle";

  openModal("vehicleModal");
}

async function deleteVehicle(id) {

  const v =
    vehicleById(id);

  if (!v) return;

  if (
    !confirm(
      `Delete ${v.registration}?`
    )
  ) return;

  const { error } =
    await supabase
      .from("vehicles")
      .delete()
      .eq("id",id);

  if (error) {

    toast(
      error.message,
      "error"
    );

    return;
  }

  await loadAllData();

  toast("Vehicle deleted.");
}

/* =========================================================
   VEHICLE VIEW
   ========================================================= */

function viewVehicle(id) {

  const v =
    vehicleById(id);

  if (!v) return;

  const expenseTotal =
    vehicleExpenseTotal(id);

  showPreview(
    `Vehicle — ${v.registration}`,
    `
      <div class="print-document">

        <h2>
          GARAGE OPERATIONS PRO
        </h2>

        <h3>
          Vehicle Report
        </h3>

        <table>

          <tr>
            <th>
              Registration / Chassis No.
            </th>
            <td>
              ${esc(v.registration)}
            </td>
          </tr>

          <tr>
            <th>Customer</th>
            <td>
              ${esc(v.customer)}
            </td>
          </tr>

          <tr>
            <th>Model</th>
            <td>
              ${esc(v.model || "-")}
            </td>
          </tr>

          <tr>
            <th>Year</th>
            <td>
              ${esc(v.model_year || "-")}
            </td>
          </tr>

          <tr>
            <th>Color</th>
            <td>
              ${esc(v.color || "-")}
            </td>
          </tr>

          <tr>
            <th>Date In</th>
            <td>
              ${esc(v.date_in || "-")}
            </td>
          </tr>

          <tr>
            <th>Date Out</th>
            <td>
              ${esc(v.date_out || "-")}
            </td>
          </tr>

          <tr>
            <th>Storage Days</th>
            <td>
              ${storageDays(v)}
            </td>
          </tr>

          <tr>
            <th>Job Type</th>
            <td>
              ${esc(v.job_type || "-")}
            </td>
          </tr>

          <tr>
            <th>Status</th>
            <td>
              ${esc(v.status || "-")}
            </td>
          </tr>

          <tr>
            <th>Billed</th>
            <td>
              ${money(v.billed)}
            </td>
          </tr>

          <tr>
            <th>Paid</th>
            <td>
              ${money(v.paid)}
            </td>
          </tr>

          <tr>
            <th>Outstanding</th>
            <td>
              ${money(
                num(v.billed) -
                num(v.paid)
              )}
            </td>
          </tr>

          <tr>
            <th>Total Expenses</th>
            <td>
              <strong>
                ${money(expenseTotal)}
              </strong>
            </td>
          </tr>

          <tr>
            <th>Description</th>
            <td>
              ${esc(
                v.description || "-"
              )}
            </td>
          </tr>

        </table>

      </div>
    `
  );
}

async function shareVehicle(id) {

  const v =
    vehicleById(id);

  if (!v) return;

  await shareText(
    `Vehicle ${v.registration}`,
    [
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
      `Outstanding: ${money(
        num(v.billed) -
        num(v.paid)
      )}`,
      `Total Expenses: ${money(
        vehicleExpenseTotal(id)
      )}`
    ].join("\n")
  );
}

/* =========================================================
   VEHICLE EXPENSE REPORT
   ========================================================= */

function vehicleExpenseHTML(id) {

  const v =
    vehicleById(id);

  if (!v)
    return "<p>Vehicle not found.</p>";

  const rows =
    vehicleExpenses(id);

  const total =
    rows.reduce(
      (sum,e) =>
        sum + num(e.amount),
      0
    );

  return `

    <div class="print-document">

      <h2>
        CRYSTAL MOTORS (K) LTD
      </h2>

      <p>
        P.O. Box 54385 – 00200, Nairobi<br>
        Cell: 0722 707124 | 0723 914 222<br>
        Off Mombasa Road, Along Quarry Road,
        Near Mlolongo Weighbridge
      </p>

      <hr>

      <h2>
        VEHICLE EXPENSE REPORT
      </h2>

      <p>
        <strong>
          Registration:
        </strong>
        ${esc(v.registration)}
      </p>

      <p>
        <strong>
          Customer:
        </strong>
        ${esc(v.customer)}
      </p>

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

          ${
            rows.length

              ? rows.map(e => `
                  <tr>

                    <td>
                      ${esc(
                        e.expense_date || ""
                      )}
                    </td>

                    <td>
                      ${esc(
                        v.registration
                      )}
                    </td>

                    <td>
                      ${esc(
                        e.description || ""
                      )}
                    </td>

                    <td>
                      ${esc(
                        e.category || ""
                      )}
                    </td>

                    <td>
                      ${money(e.amount)}
                    </td>

                  </tr>
                `).join("")

              : `
                  <tr>
                    <td colspan="5">
                      No expenses found.
                    </td>
                  </tr>
                `
          }

          <tr
            class="garage-expense-total-row"
          >

            <td
              colspan="4"
              style="text-align:right"
            >
              TOTAL EXPENSES
            </td>

            <td>
              ${money(total)}
            </td>

          </tr>

        </tbody>

      </table>

    </div>
  `;
}

function viewVehicleExpenses(id) {

  const v =
    vehicleById(id);

  if (!v) return;

  currentVehicleExpenseId =
    id;

  if (
    $("vehicleExpensePreviewContent")
  ) {

    $("vehicleExpensePreviewContent")
      .innerHTML =
        vehicleExpenseHTML(id);
  }

  openModal(
    "vehicleExpensePreviewModal"
  );
}

function printVehicleExpensePreview() {

  if (!currentVehicleExpenseId) {

    toast(
      "No vehicle selected.",
      "error"
    );

    return;
  }

  const v =
    vehicleById(
      currentVehicleExpenseId
    );

  printHTML(
    `Vehicle Expenses — ${
      v?.registration || ""
    }`,
    vehicleExpenseHTML(
      currentVehicleExpenseId
    )
  );
}

async function shareVehicleExpenses(id) {

  const v =
    vehicleById(id);

  if (!v) return;

  const rows =
    vehicleExpenses(id);

  const total =
    rows.reduce(
      (a,e) =>
        a + num(e.amount),
      0
    );

  const text = [

    "CRYSTAL MOTORS (K) LTD",

    "VEHICLE EXPENSE REPORT",

    "",

    `Vehicle: ${v.registration}`,

    `Customer: ${v.customer}`,

    "",

    ...rows.map(e =>
      `${e.expense_date || ""} | ` +
      `${e.description || ""} | ` +
      `${e.category || ""} | ` +
      `${money(e.amount)}`
    ),

    "",

    `TOTAL EXPENSES: ${money(total)}`

  ].join("\n");

  await shareText(
    `Expenses ${v.registration}`,
    text
  );
}

/* =========================================================
   EXPENSES
   ========================================================= */

function fillExpenseVehicleSelect(
  selected = ""
) {

  const el =
    $("expenseVehicle");

  if (!el) return;

  el.innerHTML = `

    <option value="">
      Select vehicle
    </option>

    ${
      vehicles.map(v => `
        <option
          value="${esc(v.id)}"
          ${
            String(v.id) ===
            String(selected)
              ? "selected"
              : ""
          }
        >
          ${esc(
            v.registration +
            (
              v.customer
                ? " — " +
                  v.customer
                : ""
            )
          )}
        </option>
      `).join("")
    }

  `;
}

/*
  ==========================================================
  IMPORTANT EXPENSE FILTER
  ==========================================================

  If search exactly matches a vehicle registration,
  filter by vehicle_id.

  This prevents:

  KBZ 272B
  from displaying expenses belonging to
  KBN 084E, KCA 123A, etc.
*/

function filteredExpenses() {

  const search =
    (
      $("expenseSearch")?.value ||
      ""
    ).trim();

  const category =
    $("expenseCategoryFilter")
      ?.value || "";

  if (search) {

    const exactVehicle =
      vehicles.find(
        v =>
          norm(v.registration) ===
          norm(search)
      );

    if (exactVehicle) {

      return expenses.filter(e =>

        String(e.vehicle_id) ===
        String(exactVehicle.id)

      ).filter(e =>

        !category ||
        e.category === category

      );
    }
  }

  const q =
    norm(search);

  return expenses.filter(e => {

    const v =
      vehicleById(e.vehicle_id);

    const text =
      norm([
        e.description,
        e.category,
        e.expense_date,
        v?.registration,
        v?.customer
      ].join(" "));

    return (
      (!q ||
        text.includes(q)) &&
      (
        !category ||
        e.category === category
      )
    );
  });
}

/*
  ----------------------------------------------------------
  EXPENSE TOTAL DISPLAY
  ----------------------------------------------------------
*/

function renderExpenseSummary(rows) {

  const total =
    rows.reduce(
      (sum,e) =>
        sum + num(e.amount),
      0
    );

  const uniqueVehicles =
    new Set(
      rows
        .map(e => e.vehicle_id)
        .filter(Boolean)
    ).size;

  const search =
    (
      $("expenseSearch")?.value ||
      ""
    ).trim();

  let title =
    "TOTAL EXPENSES";

  let subtitle =
    `${rows.length} expense record${
      rows.length === 1
        ? ""
        : "s"
    }`;

  /*
    If exact vehicle is searched,
    make the total vehicle-specific.
  */

  const vehicle =
    vehicles.find(
      v =>
        norm(v.registration) ===
        norm(search)
    );

  if (vehicle) {

    title =
      `TOTAL EXPENSES — ${
        vehicle.registration
      }`;

    subtitle =
      `${rows.length} expense record${
        rows.length === 1
          ? ""
          : "s"
      } for this vehicle`;
  }

  /*
    Inject summary directly above
    the expense table.

    It is removed/rebuilt safely
    on every render.
  */

  const tableBody =
    $("expensesTableBody");

  if (!tableBody)
    return;

  const table =
    tableBody.closest(
      "table"
    );

  if (!table)
    return;

  const container =
    table.parentElement;

  if (!container)
    return;

  let summary =
    $("garageExpenseSummary");

  if (!summary) {

    summary =
      document.createElement(
        "div"
      );

    summary.id =
      "garageExpenseSummary";

    summary.className =
      "garage-expense-summary";

    container.parentElement
      ?.insertBefore(
        summary,
        container
      );
  }

  summary.innerHTML = `

    <div
      class="
        garage-expense-summary-card
        garage-expense-total
      "
    >

      <div
        class="
          garage-expense-summary-label
        "
      >
        ${esc(title)}
      </div>

      <div
        class="
          garage-expense-summary-value
        "
      >
        ${money(total)}
      </div>

      <div
        class="
          garage-expense-summary-sub
        "
      >
        ${esc(subtitle)}
      </div>

    </div>

    <div
      class="
        garage-expense-summary-card
      "
    >

      <div
        class="
          garage-expense-summary-label
        "
      >
        RECORDS
      </div>

      <div
        class="
          garage-expense-summary-value
        "
      >
        ${rows.length}
      </div>

      <div
        class="
          garage-expense-summary-sub
        "
      >
        Expense entries
      </div>

    </div>

    <div
      class="
        garage-expense-summary-card
      "
    >

      <div
        class="
          garage-expense-summary-label
        "
      >
        VEHICLES
      </div>

      <div
        class="
          garage-expense-summary-value
        "
      >
        ${uniqueVehicles}
      </div>

      <div
        class="
          garage-expense-summary-sub
        "
      >
        Vehicles represented
      </div>

    </div>
  `;
}

function renderExpenses() {

  const body =
    $("expensesTableBody");

  if (!body) return;

  const rows =
    filteredExpenses();

  /*
    Update TOTAL EXPENSES
    every time the table renders.
  */

  renderExpenseSummary(rows);

  const total =
    rows.reduce(
      (sum,e) =>
        sum + num(e.amount),
      0
    );

  if (!rows.length) {

    body.innerHTML = `

      <tr>

        <td
          colspan="6"
          style="
            text-align:center;
            padding:28px;
          "
        >
          No expenses found
        </td>

      </tr>

    `;

    return;
  }

  body.innerHTML =
    rows.map(e => {

      const v =
        vehicleById(e.vehicle_id);

      /*
        Display Labour consistently.
      */

      let category =
        e.category || "";

      if (
        category.toLowerCase() ===
        "labor"
      ) {
        category = "Labour";
      }

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
                v?.registration || "—"
              )}
            </strong>
          </td>

          <td>
            ${esc(
              e.description || ""
            )}
          </td>

          <td>
            ${esc(category)}
          </td>

          <td>
            <strong>
              ${money(e.amount)}
            </strong>
          </td>

          <td>
            ${normalActions(
              e.id,
              "editExpense",
              "viewExpense",
              "shareExpense",
              "deleteExpense"
            )}
          </td>

        </tr>
      `;

    }).join("") +

    `

      <tr
        class="garage-expense-total-row"
      >

        <td
          colspan="4"
          style="text-align:right"
        >
          TOTAL EXPENSES
        </td>

        <td>
          ${money(total)}
        </td>

        <td></td>

      </tr>

    `;
}

function openExpenseModal(id = "") {

  $("expenseForm")?.reset();

  if ($("expenseId"))
    $("expenseId").value = "";

  if ($("expenseModalTitle"))
    $("expenseModalTitle").textContent =
      "Add Expense";

  if ($("expenseDate"))
    $("expenseDate").value =
      today();

  fillExpenseVehicleSelect();

  if (id)
    editExpense(id);
  else
    openModal("expenseModal");
}

async function saveExpense(event) {

  event?.preventDefault();

  const id =
    $("expenseId")?.value || "";

  const vehicleId =
    $("expenseVehicle")?.value || "";

  if (!vehicleId) {

    toast(
      "Please select a vehicle.",
      "error"
    );

    return;
  }

  const record = {

    vehicle_id:
      vehicleId,

    expense_date:
      $("expenseDate")?.value ||
      today(),

    category:
      $("expenseCategory")?.value ||
      "Parts",

    amount:
      num(
        $("expenseAmount")?.value
      ),

    description:
      $("expenseDescription")
        ?.value.trim() ||
      ""

  };

  if (!record.description) {

    toast(
      "Expense description is required.",
      "error"
    );

    return;
  }

  const result =
    id

      ? await supabase
          .from("expenses")
          .update(record)
          .eq("id",id)

      : await supabase
          .from("expenses")
          .insert(record);

  if (result.error) {

    toast(
      result.error.message,
      "error"
    );

    return;
  }

  closeModal("expenseModal");

  await loadAllData();

  toast(
    id
      ? "Expense updated."
      : "Expense added."
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

  $("expenseId").value =
    e.id;

  fillExpenseVehicleSelect(
    e.vehicle_id
  );

  $("expenseDate").value =
    e.expense_date || "";

  $("expenseCategory").value =
    e.category || "Parts";

  $("expenseAmount").value =
    num(e.amount);

  $("expenseDescription").value =
    e.description || "";

  $("expenseModalTitle").textContent =
    "Edit Expense";

  openModal("expenseModal");
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
      .eq("id",id);

  if (error) {

    toast(
      error.message,
      "error"
    );

    return;
  }

  await loadAllData();

  toast("Expense deleted.");
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
    vehicleById(e.vehicle_id);

  showPreview(
    "Vehicle Expense",
    `
      <h2>
        Vehicle Expense
      </h2>

      <p>
        <strong>Vehicle:</strong>
        ${esc(
          v?.registration || ""
        )}
      </p>

      <p>
        <strong>Date:</strong>
        ${esc(
          e.expense_date || ""
        )}
      </p>

      <p>
        <strong>Description:</strong>
        ${esc(
          e.description || ""
        )}
      </p>

      <p>
        <strong>Category:</strong>
        ${esc(
          e.category || ""
        )}
      </p>

      <p>
        <strong>Amount:</strong>
        ${money(e.amount)}
      </p>
    `
  );
}

async function shareExpense(id) {

  const e =
    expenses.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!e) return;

  const v =
    vehicleById(e.vehicle_id);

  await shareText(
    "Vehicle Expense",
    [
      "GARAGE OPERATIONS PRO",
      "VEHICLE EXPENSE",
      "",
      `Vehicle: ${v?.registration || ""}`,
      `Date: ${e.expense_date || ""}`,
      `Description: ${e.description || ""}`,
      `Category: ${e.category || ""}`,
      `Amount: ${money(e.amount)}`
    ].join("\n")
  );
}

/* =========================================================
   PETTY CASH
   ========================================================= */

function renderPettyCash() {

  const body =
    $("pettyTableBody");

  if (!body) return;

  const q =
    norm(
      $("pettySearch")?.value ||
      ""
    );

  const category =
    $("pettyCategoryFilter")?.value ||
    "";

  const rows =
    pettyCash.filter(p => {

      const text =
        norm([
          p.description,
          p.paid_to,
          p.category,
          p.notes,
          p.cash_date
        ].join(" "));

      return (
        (!q ||
          text.includes(q)) &&
        (
          !category ||
          p.category === category
        )
      );
    });

  body.innerHTML =
    rows.map(p => `

      <tr>

        <td>
          ${esc(p.cash_date || "")}
        </td>

        <td>
          ${esc(p.paid_to || "")}
        </td>

        <td>
          ${esc(p.category || "")}
        </td>

        <td>
          ${esc(p.description || "")}
        </td>

        <td>
          ${money(p.amount)}
        </td>

        <td>
          ${esc(p.notes || "")}
        </td>

        <td>
          ${normalActions(
            p.id,
            "editPetty",
            "viewPetty",
            "sharePetty",
            "deletePetty"
          )}
        </td>

      </tr>

    `).join("") ||

    `
      <tr>
        <td
          colspan="7"
          style="text-align:center;padding:25px"
        >
          No petty cash records found
        </td>
      </tr>
    `;
}

function openPettyModal(id = "") {

  $("pettyForm")?.reset();

  if ($("pettyId"))
    $("pettyId").value = "";

  if ($("pettyModalTitle"))
    $("pettyModalTitle").textContent =
      "Add Petty Cash";

  if ($("pettyDate"))
    $("pettyDate").value =
      today();

  if (id)
    editPetty(id);
  else
    openModal("pettyModal");
}

async function savePetty(event) {

  event?.preventDefault();

  const id =
    $("pettyId")?.value || "";

  const record = {

    cash_date:
      $("pettyDate")?.value ||
      today(),

    paid_to:
      $("pettyPaidTo")
        ?.value.trim() ||
      null,

    category:
      $("pettyCategory")
        ?.value ||
      null,

    amount:
      num(
        $("pettyAmount")?.value
      ),

    description:
      $("pettyDescription")
        ?.value.trim() ||
      "",

    notes:
      $("pettyNotes")
        ?.value.trim() ||
      null

  };

  const result =
    id

      ? await supabase
          .from("petty_cash")
          .update(record)
          .eq("id",id)

      : await supabase
          .from("petty_cash")
          .insert(record);

  if (result.error) {

    toast(
      result.error.message,
      "error"
    );

    return;
  }

  closeModal("pettyModal");

  await loadAllData();

  toast(
    id
      ? "Petty cash updated."
      : "Petty cash added."
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
    p.cash_date || "";

  $("pettyPaidTo").value =
    p.paid_to || "";

  $("pettyCategory").value =
    p.category || "";

  $("pettyAmount").value =
    num(p.amount);

  $("pettyDescription").value =
    p.description || "";

  $("pettyNotes").value =
    p.notes || "";

  $("pettyModalTitle").textContent =
    "Edit Petty Cash";

  openModal("pettyModal");
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
      .eq("id",id);

  if (error) {

    toast(
      error.message,
      "error"
    );

    return;
  }

  await loadAllData();

  toast("Petty cash deleted.");
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
      <h2>Petty Cash</h2>

      <p>
        <strong>Date:</strong>
        ${esc(p.cash_date || "")}
      </p>

      <p>
        <strong>Paid To:</strong>
        ${esc(p.paid_to || "")}
      </p>

      <p>
        <strong>Category:</strong>
        ${esc(p.category || "")}
      </p>

      <p>
        <strong>Description:</strong>
        ${esc(p.description || "")}
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

async function sharePetty(id) {

  const p =
    pettyCash.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!p) return;

  await shareText(
    "Petty Cash",
    [
      "GARAGE OPERATIONS PRO",
      "PETTY CASH",
      "",
      `Date: ${p.cash_date || ""}`,
      `Paid To: ${p.paid_to || ""}`,
      `Category: ${p.category || ""}`,
      `Description: ${p.description || ""}`,
      `Amount: ${money(p.amount)}`,
      `Notes: ${p.notes || ""}`
    ].join("\n")
  );
}

/* =========================================================
   VEHICLE SELECT
   ========================================================= */

function fillVehicleSelect(
  id,
  selected = ""
) {

  const el = $(id);

  if (!el) return;

  el.innerHTML = `

    <option value="">
      Select vehicle
    </option>

    ${
      vehicles.map(v => `
        <option
          value="${esc(v.id)}"
          ${
            String(v.id) ===
            String(selected)
              ? "selected"
              : ""
          }
        >
          ${esc(
            v.registration +
            (
              v.customer
                ? " — " +
                  v.customer
                : ""
            )
          )}
        </option>
      `).join("")
    }

  `;
}

/* =========================================================
   REQUISITIONS
   ========================================================= */

function calculateReqTotal() {

  const quantity =
    num(
      $("reqQuantity")?.value
    );

  const unit =
    num(
      $("reqUnitCost")?.value
    );

  const total =
    quantity * unit;

  if ($("reqTotal"))
    $("reqTotal").value =
      total.toFixed(2);

  return total;
}

function renderRequisitions() {

  const body =
    $("requisitionsTableBody");

  if (!body) return;

  const q =
    norm(
      $("reqSearch")?.value ||
      ""
    );

  const status =
    $("reqStatusFilter")?.value ||
    "";

  const rows =
    requisitions.filter(r => {

      const v =
        vehicleById(r.vehicle_id);

      const text =
        norm([
          r.req_no,
          r.requested_by,
          r.item_description,
          r.expense_type,
          r.notes,
          v?.registration
        ].join(" "));

      return (
        (!q ||
          text.includes(q)) &&
        (
          !status ||
          r.status === status
        )
      );
    });

  const total =
    rows.reduce(
      (a,r) =>
        a + num(r.total_amount),
      0
    );

  if ($("reqOverallTotal"))
    $("reqOverallTotal").textContent =
      money(total);

  body.innerHTML =
    rows.map(r => {

      const v =
        vehicleById(r.vehicle_id);

      return `

        <tr>

          <td>
            ${esc(r.req_no)}
          </td>

          <td>
            ${esc(r.req_date || "")}
          </td>

          <td>
            ${esc(r.requested_by || "")}
          </td>

          <td>
            ${esc(v?.registration || "")}
          </td>

          <td>
            ${esc(
              r.item_description || ""
            )}
          </td>

          <td>
            ${num(r.quantity)}
          </td>

          <td>
            ${money(r.unit_cost)}
          </td>

          <td>
            ${money(r.total_amount)}
          </td>

          <td>
            ${esc(r.status || "")}
          </td>

          <td>
            ${normalActions(
              r.id,
              "editReq",
              "viewReq",
              "shareReq",
              "deleteReq"
            )}
          </td>

        </tr>

      `;
    }).join("") ||

    `
      <tr>
        <td
          colspan="10"
          style="text-align:center;padding:25px"
        >
          No requisitions found
        </td>
      </tr>
    `;
}

function openReqModal(id = "") {

  $("reqForm")?.reset();

  if ($("reqId"))
    $("reqId").value = "";

  if ($("reqModalTitle"))
    $("reqModalTitle").textContent =
      "Add Requisition";

  if ($("reqDate"))
    $("reqDate").value =
      today();

  fillVehicleSelect(
    "reqVehicle"
  );

  calculateReqTotal();

  if (id)
    editReq(id);
  else
    openModal("reqModal");
}

async function saveReq(event) {

  event?.preventDefault();

  const id =
    $("reqId")?.value || "";

  const quantity =
    num(
      $("reqQuantity")?.value
    );

  const unitCost =
    num(
      $("reqUnitCost")?.value
    );

  const record = {

    req_no:
      $("reqNo")
        ?.value.trim() ||
      "",

    req_date:
      $("reqDate")?.value ||
      today(),

    requested_by:
      $("reqRequestedBy")
        ?.value.trim() ||
      "",

    vehicle_id:
      $("reqVehicle")?.value ||
      null,

    item_description:
      $("reqItemDescription")
        ?.value.trim() ||
      "",

    quantity,

    unit_cost:
      unitCost,

    total_amount:
      quantity * unitCost,

    status:
      $("reqStatus")?.value ||
      "Pending",

    expense_type:
      $("reqExpenseType")?.value ||
      $("reqCategory")?.value ||
      "Materials",

    notes:
      $("reqNotes")
        ?.value.trim() ||
      null

  };

  if (!record.req_no) {

    toast(
      "Requisition number is required.",
      "error"
    );

    return;
  }

  const result =
    id

      ? await supabase
          .from("requisitions")
          .update(record)
          .eq("id",id)

      : await supabase
          .from("requisitions")
          .insert(record);

  if (result.error) {

    toast(
      result.error.message,
      "error"
    );

    return;
  }

  closeModal("reqModal");

  await loadAllData();

  toast(
    id
      ? "Requisition updated."
      : "Requisition added."
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

  $("reqId").value =
    r.id;

  $("reqNo").value =
    r.req_no || "";

  $("reqDate").value =
    r.req_date || "";

  $("reqRequestedBy").value =
    r.requested_by || "";

  fillVehicleSelect(
    "reqVehicle",
    r.vehicle_id
  );

  $("reqItemDescription").value =
    r.item_description || "";

  $("reqQuantity").value =
    num(r.quantity);

  $("reqUnitCost").value =
    num(r.unit_cost);

  $("reqTotal").value =
    num(r.total_amount)
      .toFixed(2);

  $("reqStatus").value =
    r.status || "Pending";

  if ($("reqExpenseType"))
    $("reqExpenseType").value =
      r.expense_type ||
      "Materials";

  if ($("reqCategory"))
    $("reqCategory").value =
      r.expense_type ||
      "Materials";

  $("reqNotes").value =
    r.notes || "";

  $("reqModalTitle").textContent =
    "Edit Requisition";

  openModal("reqModal");
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
      .eq("id",id);

  if (error) {

    toast(
      error.message,
      "error"
    );

    return;
  }

  await loadAllData();

  toast("Requisition deleted.");
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
    vehicleById(r.vehicle_id);

  showPreview(
    `Requisition ${r.req_no}`,
    `
      <h2>REQUISITION</h2>

      <p>
        <strong>No:</strong>
        ${esc(r.req_no)}
      </p>

      <p>
        <strong>Date:</strong>
        ${esc(r.req_date || "")}
      </p>

      <p>
        <strong>Requested By:</strong>
        ${esc(
          r.requested_by || ""
        )}
      </p>

      <p>
        <strong>Vehicle:</strong>
        ${esc(
          v?.registration || ""
        )}
      </p>

      <p>
        <strong>Item:</strong>
        ${esc(
          r.item_description || ""
        )}
      </p>

      <p>
        <strong>Total:</strong>
        ${money(r.total_amount)}
      </p>

      <p>
        <strong>Status:</strong>
        ${esc(r.status || "")}
      </p>

      <p>
        <strong>Notes:</strong>
        ${esc(r.notes || "")}
      </p>
    `
  );
}

async function shareReq(id) {

  const r =
    requisitions.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!r) return;

  const v =
    vehicleById(r.vehicle_id);

  await shareText(
    `Requisition ${r.req_no}`,
    [
      "GARAGE OPERATIONS PRO",
      "REQUISITION",
      "",
      `No: ${r.req_no}`,
      `Date: ${r.req_date || ""}`,
      `Requested By: ${r.requested_by || ""}`,
      `Vehicle: ${v?.registration || ""}`,
      `Item: ${r.item_description || ""}`,
      `Quantity: ${r.quantity || 0}`,
      `Total: ${money(r.total_amount)}`,
      `Status: ${r.status || ""}`
    ].join("\n")
  );
}

/* =========================================================
   INVOICES
   ========================================================= */

function calculateInvoice() {

  const labour =
    num(
      $("invoiceLabour")?.value
    );

  const parts =
    num(
      $("invoiceParts")?.value
    );

  const other =
    num(
      $("invoiceOther")?.value
    );

  const subtotal =
    labour +
    parts +
    other;

  const paid =
    num(
      $("invoicePaid")?.value
    );

  const balance =
    subtotal -
    paid;

  if ($("invoiceSubtotal"))
    $("invoiceSubtotal").value =
      subtotal.toFixed(2);

  if ($("invoiceBalance"))
    $("invoiceBalance").value =
      balance.toFixed(2);

  return {
    subtotal,
    balance
  };
}

function renderInvoices() {

  const body =
    $("invoicesTableBody");

  if (!body) return;

  const q =
    norm(
      $("invoiceSearch")?.value ||
      ""
    );

  const status =
    $("invoiceStatusFilter")?.value ||
    "";

  const rows =
    invoices.filter(i => {

      const v =
        vehicleById(i.vehicle_id);

      const text =
        norm([
          i.invoice_no,
          i.customer,
          i.job_description,
          i.status,
          v?.registration
        ].join(" "));

      return (
        (!q ||
          text.includes(q)) &&
        (
          !status ||
          i.status === status
        )
      );
    });

  body.innerHTML =
    rows.map(i => {

      const v =
        vehicleById(i.vehicle_id);

      return `

        <tr>

          <td>
            ${esc(i.invoice_no)}
          </td>

          <td>
            ${esc(
              i.invoice_date || ""
            )}
          </td>

          <td>
            ${esc(
              v?.registration || ""
            )}
          </td>

          <td>
            ${esc(i.customer || "")}
          </td>

          <td>
            ${money(i.subtotal)}
          </td>

          <td>
            ${money(i.paid)}
          </td>

          <td>
            ${money(i.balance)}
          </td>

          <td>
            ${esc(i.status || "")}
          </td>

          <td>
            ${normalActions(
              i.id,
              "editInvoice",
              "viewInvoice",
              "shareInvoice",
              "deleteInvoice"
            )}
          </td>

        </tr>

      `;

    }).join("") ||

    `
      <tr>
        <td
          colspan="9"
          style="text-align:center;padding:25px"
        >
          No invoices found
        </td>
      </tr>
    `;
}

function openInvoiceModal(id = "") {

  $("invoiceForm")?.reset();

  if ($("invoiceId"))
    $("invoiceId").value = "";

  if ($("invoiceModalTitle"))
    $("invoiceModalTitle").textContent =
      "Add Invoice";

  if ($("invoiceDate"))
    $("invoiceDate").value =
      today();

  fillVehicleSelect(
    "invoiceVehicle"
  );

  calculateInvoice();

  if (id)
    editInvoice(id);
  else
    openModal("invoiceModal");
}

async function saveInvoice(event) {

  event?.preventDefault();

  const id =
    $("invoiceId")?.value || "";

  const calc =
    calculateInvoice();

  const record = {

    invoice_no:
      $("invoiceNo")
        ?.value.trim() ||
      "",

    invoice_date:
      $("invoiceDate")?.value ||
      today(),

    vehicle_id:
      $("invoiceVehicle")?.value ||
      null,

    customer:
      $("invoiceCustomer")
        ?.value.trim() ||
      null,

    job_description:
      $("invoiceJobDescription")
        ?.value.trim() ||
      null,

    labour:
      num(
        $("invoiceLabour")?.value
      ),

    parts:
      num(
        $("invoiceParts")?.value
      ),

    other:
      num(
        $("invoiceOther")?.value
      ),

    subtotal:
      calc.subtotal,

    paid:
      num(
        $("invoicePaid")?.value
      ),

    balance:
      calc.balance,

    status:
      $("invoiceStatus")?.value ||
      "Pending",

    notes:
      $("invoiceNotes")
        ?.value.trim() ||
      null

  };

  if (!record.invoice_no) {

    toast(
      "Invoice number is required.",
      "error"
    );

    return;
  }

  const result =
    id

      ? await supabase
          .from("invoices")
          .update(record)
          .eq("id",id)

      : await supabase
          .from("invoices")
          .insert(record);

  if (result.error) {

    toast(
      result.error.message,
      "error"
    );

    return;
  }

  closeModal("invoiceModal");

  await loadAllData();

  toast(
    id
      ? "Invoice updated."
      : "Invoice added."
  );
}

function editInvoice(id) {

  const i =
    invoices.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!i) return;

  $("invoiceId").value =
    i.id;

  $("invoiceNo").value =
    i.invoice_no || "";

  $("invoiceDate").value =
    i.invoice_date || "";

  fillVehicleSelect(
    "invoiceVehicle",
    i.vehicle_id
  );

  $("invoiceCustomer").value =
    i.customer || "";

  $("invoiceJobDescription").value =
    i.job_description || "";

  $("invoiceLabour").value =
    num(i.labour);

  $("invoiceParts").value =
    num(i.parts);

  $("invoiceOther").value =
    num(i.other);

  $("invoicePaid").value =
    num(i.paid);

  $("invoiceStatus").value =
    i.status || "Pending";

  $("invoiceNotes").value =
    i.notes || "";

  calculateInvoice();

  $("invoiceModalTitle").textContent =
    "Edit Invoice";

  openModal("invoiceModal");
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
      .eq("id",id);

  if (error) {

    toast(
      error.message,
      "error"
    );

    return;
  }

  await loadAllData();

  toast("Invoice deleted.");
}

function viewInvoice(id) {

  const i =
    invoices.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!i) return;

  const v =
    vehicleById(i.vehicle_id);

  showPreview(
    `Invoice ${i.invoice_no}`,
    `
      <h2>
        CRYSTAL MOTORS (K) LTD
      </h2>

      <h2>INVOICE</h2>

      <p>
        <strong>Invoice No:</strong>
        ${esc(i.invoice_no)}
      </p>

      <p>
        <strong>Date:</strong>
        ${esc(i.invoice_date || "")}
      </p>

      <p>
        <strong>Vehicle:</strong>
        ${esc(
          v?.registration || ""
        )}
      </p>

      <p>
        <strong>Customer:</strong>
        ${esc(i.customer || "")}
      </p>

      <p>
        <strong>Subtotal:</strong>
        ${money(i.subtotal)}
      </p>

      <p>
        <strong>Paid:</strong>
        ${money(i.paid)}
      </p>

      <p>
        <strong>Balance:</strong>
        ${money(i.balance)}
      </p>

      <p>
        <strong>Status:</strong>
        ${esc(i.status || "")}
      </p>
    `
  );
}

async function shareInvoice(id) {

  const i =
    invoices.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!i) return;

  const v =
    vehicleById(i.vehicle_id);

  await shareText(
    `Invoice ${i.invoice_no}`,
    [
      "CRYSTAL MOTORS (K) LTD",
      "INVOICE",
      "",
      `Invoice: ${i.invoice_no}`,
      `Date: ${i.invoice_date || ""}`,
      `Vehicle: ${v?.registration || ""}`,
      `Customer: ${i.customer || ""}`,
      `Subtotal: ${money(i.subtotal)}`,
      `Paid: ${money(i.paid)}`,
      `Balance: ${money(i.balance)}`,
      `Status: ${i.status || ""}`
    ].join("\n")
  );
}

/* =========================================================
   GATE PASSES
   ========================================================= */

function renderGatePasses() {

  const body =
    $("gatePassesTableBody");

  if (!body) return;

  const q =
    norm(
      $("gateSearch")?.value ||
      ""
    );

  const status =
    $("gateStatusFilter")?.value ||
    "";

  const rows =
    gatePasses.filter(g => {

      const v =
        vehicleById(g.vehicle_id);

      const text =
        norm([
          g.gate_pass_no,
          g.registration,
          g.customer,
          g.released_to,
          g.released_contact,
          g.status,
          v?.registration
        ].join(" "));

      return (
        (!q ||
          text.includes(q)) &&
        (
          !status ||
          g.status === status
        )
      );
    });

  body.innerHTML =
    rows.map(g => {

      const v =
        vehicleById(g.vehicle_id);

      return `

        <tr>

          <td>
            ${esc(g.gate_pass_no)}
          </td>

          <td>
            ${esc(
              g.gate_pass_date || ""
            )}
          </td>

          <td>
            ${esc(
              v?.registration ||
              g.registration ||
              ""
            )}
          </td>

          <td>
            ${esc(g.customer || "")}
          </td>

          <td>
            ${esc(
              g.released_to || ""
            )}
          </td>

          <td>
            ${money(g.paid)}
          </td>

          <td>
            ${money(g.balance)}
          </td>

          <td>
            ${esc(g.status || "")}
          </td>

          <td>
            ${normalActions(
              g.id,
              "editGatePass",
              "viewGatePass",
              "shareGatePass",
              "deleteGatePass"
            )}
          </td>

        </tr>

      `;

    }).join("") ||

    `
      <tr>
        <td
          colspan="9"
          style="text-align:center;padding:25px"
        >
          No gate passes found
        </td>
      </tr>
    `;
}

function openGatePassModal(id = "") {

  $("gatePassForm")?.reset();

  if ($("gatePassId"))
    $("gatePassId").value = "";

  if ($("gatePassModalTitle"))
    $("gatePassModalTitle").textContent =
      "Add Gate Pass";

  if ($("gatePassDate"))
    $("gatePassDate").value =
      today();

  fillVehicleSelect(
    "gateVehicle"
  );

  if (id)
    editGatePass(id);
  else
    openModal("gatePassModal");
}

async function saveGatePass(event) {

  event?.preventDefault();

  const id =
    $("gatePassId")?.value || "";

  const vehicleId =
    $("gateVehicle")?.value ||
    null;

  const v =
    vehicleById(vehicleId);

  const invoiceId =
    $("gateInvoice")?.value ||
    null;

  let balance =
    num(
      $("gateBalance")?.value
    );

  if (invoiceId) {

    const invoice =
      invoices.find(
        x =>
          String(x.id) ===
          String(invoiceId)
      );

    if (invoice) {

      balance =
        num(invoice.subtotal) -
        num(
          $("gatePaid")?.value
        );
    }
  }

  const record = {

    gate_pass_no:
      $("gatePassNo")
        ?.value.trim() ||
      "",

    gate_pass_date:
      $("gatePassDate")?.value ||
      today(),

    vehicle_id:
      vehicleId,

    registration:
      $("gateVehicleRegistration")
        ?.value.trim() ||
      v?.registration ||
      null,

    customer:
      $("gateCustomer")
        ?.value.trim() ||
      v?.customer ||
      null,

    released_to:
      $("gateReleasedTo")
        ?.value.trim() ||
      null,

    released_contact:
      $("gateReleasedContact")
        ?.value.trim() ||
      null,

    invoice_id:
      invoiceId,

    paid:
      num(
        $("gatePaid")?.value
      ),

    balance,

    authorized_by:
      $("gateAuthorizedBy")
        ?.value.trim() ||
      null,

    status:
      $("gateStatus")?.value ||
      "Pending",

    notes:
      $("gateNotes")
        ?.value.trim() ||
      null

  };

  if (!record.gate_pass_no) {

    toast(
      "Gate pass number is required.",
      "error"
    );

    return;
  }

  const result =
    id

      ? await supabase
          .from("gate_passes")
          .update(record)
          .eq("id",id)

      : await supabase
          .from("gate_passes")
          .insert(record);

  if (result.error) {

    toast(
      result.error.message,
      "error"
    );

    return;
  }

  closeModal("gatePassModal");

  await loadAllData();

  toast(
    id
      ? "Gate pass updated."
      : "Gate pass added."
  );
}

function editGatePass(id) {

  const g =
    gatePasses.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!g) return;

  $("gatePassId").value =
    g.id;

  $("gatePassNo").value =
    g.gate_pass_no || "";

  $("gatePassDate").value =
    g.gate_pass_date || "";

  fillVehicleSelect(
    "gateVehicle",
    g.vehicle_id
  );

  $("gateVehicleRegistration").value =
    g.registration || "";

  $("gateCustomer").value =
    g.customer || "";

  $("gateReleasedTo").value =
    g.released_to || "";

  $("gateReleasedContact").value =
    g.released_contact || "";

  if ($("gateInvoice"))
    $("gateInvoice").value =
      g.invoice_id || "";

  $("gatePaid").value =
    num(g.paid);

  $("gateBalance").value =
    num(g.balance);

  $("gateAuthorizedBy").value =
    g.authorized_by || "";

  $("gateStatus").value =
    g.status || "Pending";

  $("gateNotes").value =
    g.notes || "";

  $("gatePassModalTitle")
    .textContent =
      "Edit Gate Pass";

  openModal("gatePassModal");
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
      .eq("id",id);

  if (error) {

    toast(
      error.message,
      "error"
    );

    return;
  }

  await loadAllData();

  toast("Gate pass deleted.");
}

function viewGatePass(id) {

  const g =
    gatePasses.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!g) return;

  const v =
    vehicleById(g.vehicle_id);

  showPreview(
    `Gate Pass ${g.gate_pass_no}`,
    `
      <h2>
        CRYSTAL MOTORS (K) LTD
      </h2>

      <h2>GATE PASS</h2>

      <p>
        <strong>Gate Pass No:</strong>
        ${esc(g.gate_pass_no)}
      </p>

      <p>
        <strong>Date:</strong>
        ${esc(
          g.gate_pass_date || ""
        )}
      </p>

      <p>
        <strong>Vehicle:</strong>
        ${esc(
          v?.registration ||
          g.registration ||
          ""
        )}
      </p>

      <p>
        <strong>Customer:</strong>
        ${esc(g.customer || "")}
      </p>

      <p>
        <strong>Released To:</strong>
        ${esc(
          g.released_to || ""
        )}
      </p>

      <p>
        <strong>Contact:</strong>
        ${esc(
          g.released_contact || ""
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
    `
  );
}

async function shareGatePass(id) {

  const g =
    gatePasses.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!g) return;

  const v =
    vehicleById(g.vehicle_id);

  await shareText(
    `Gate Pass ${g.gate_pass_no}`,
    [
      "CRYSTAL MOTORS (K) LTD",
      "GATE PASS",
      "",
      `No: ${g.gate_pass_no}`,
      `Date: ${g.gate_pass_date || ""}`,
      `Vehicle: ${
        v?.registration ||
        g.registration ||
        ""
      }`,
      `Customer: ${g.customer || ""}`,
      `Released To: ${g.released_to || ""}`,
      `Contact: ${g.released_contact || ""}`,
      `Paid: ${money(g.paid)}`,
      `Balance: ${money(g.balance)}`,
      `Status: ${g.status || ""}`
    ].join("\n")
  );
}

/* =========================================================
   ESTIMATES / QUOTATIONS
   ========================================================= */

function ensureEstimateNavigation() {

  if (
    document.querySelector(
      '[data-section="estimates"]'
    )
  ) {
    return;
  }

  const sidebar =
    document.querySelector(
      ".sidebar"
    );

  if (!sidebar) return;

  const existing =
    sidebar.querySelector(
      '[data-section="gate-passes"]'
    );

  const button =
    document.createElement(
      "button"
    );

  button.type = "button";

  /*
    Copy the existing navigation
    class so it looks like the
    other sidebar buttons.
  */

  if (existing) {

    button.className =
      existing.className;

  } else {

    button.className =
      "nav-item";
  }

  button.classList.add(
    "garage-estimate-nav"
  );

  button.dataset.section =
    "estimates";

  button.innerHTML = `
    <span>📋</span>
    <span>
      Estimates / Quotations
    </span>
  `;

  button.addEventListener(
    "click",
    () =>
      showSection("estimates")
  );

  if (
    existing?.parentElement
  ) {

    existing.parentElement
      .insertBefore(
        button,
        existing.nextSibling
      );

  } else {

    sidebar.appendChild(
      button
    );
  }
}

function ensureEstimateSection() {

  let section =
    $("estimates");

  if (section)
    return section;

  section =
    document.createElement(
      "section"
    );

  section.id =
    "estimates";

  section.className =
    "section";

  section.style.display =
    "none";

  section.innerHTML = `

    <div class="section-header">

      <div>

        <h2>
          Estimates / Quotations
        </h2>

        <p>
          Professional vehicle repair
          estimates and quotations.
        </p>

      </div>

      <button
        class="primary-btn"
        type="button"
        onclick="openEstimateModal()"
      >
        + Add Estimate
      </button>

    </div>

    <div
      class="table-container"
    >

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

        <tbody
          id="estimatesTableBody"
        ></tbody>

      </table>

    </div>

  `;

  const app =
    $("app");

  if (app)
    app.appendChild(section);
  else
    document.body.appendChild(section);

  return section;
}

function renderEstimates() {

  const section =
    $("estimates");

  if (!section)
    return;

  const body =
    $("estimatesTableBody");

  if (!body)
    return;

  body.innerHTML =
    estimates.map(e => {

      const v =
        vehicleById(e.vehicle_id);

      return `

        <tr>

          <td>
            ${esc(e.estimate_no)}
          </td>

          <td>
            ${esc(
              e.estimate_date || ""
            )}
          </td>

          <td>
            ${esc(
              e.company_name || ""
            )}
          </td>

          <td>
            ${esc(
              v?.registration ||
              e.registration ||
              ""
            )}
          </td>

          <td>
            ${esc(e.customer || "")}
          </td>

          <td>
            <strong>
              ${money(e.total_amount)}
            </strong>
          </td>

          <td>
            ${normalActions(
              e.id,
              "editEstimate",
              "viewEstimate",
              "shareEstimate",
              "deleteEstimate"
            )}
          </td>

        </tr>

      `;

    }).join("") ||

    `
      <tr>
        <td
          colspan="7"
          style="text-align:center;padding:25px"
        >
          No estimates found.
        </td>
      </tr>
    `;
}

function estimateCompanyDetails(
  company
) {

  if (
    company ===
    "QUARRY ROUTE MOTORS LTD"
  ) {

    return `
      <strong>
        QUARRY ROUTE MOTORS LTD
      </strong><br>

      P.O. Box 54385 – 00200, Nairobi<br>

      Cell: 0722 707124 /
      0723 914 222<br>

      Off Mombasa Road,
      Along Quarry Road,
      Near Mlolongo Weigh Bridge<br>

      info@quarryroutemotors.com<br>

      quarryroutemotorsltd@gmail.com
    `;
  }

  return `
    <strong>
      CRYSTAL MOTORS (K) LTD
    </strong><br>

    P.O. Box 54385 – 00200, Nairobi<br>

    Cell: 0722 707124 |
    0723 914 222<br>

    Off Mombasa Road,
    Along Quarry Road,
    Near Mlolongo Weighbridge
  `;
}

function openEstimateModal() {

  let modal =
    $("estimateModal");

  if (!modal) {

    modal =
      document.createElement(
        "div"
      );

    modal.id =
      "estimateModal";

    modal.className =
      "modal";

    modal.innerHTML = `

      <div class="modal-content">

        <button
          class="modal-close"
          type="button"
          onclick="
            closeModal(
              'estimateModal'
            )
          "
        >
          ×
        </button>

        <h2
          id="estimateModalTitle"
        >
          Add Estimate
        </h2>

        <form
          id="estimateForm"
        >

          <input
            type="hidden"
            id="estimateId"
          >

          <label>
            Company
          </label>

          <select
            id="estimateCompany"
          >

            <option
              value="CRYSTAL MOTORS (K) LTD"
            >
              CRYSTAL MOTORS (K) LTD
            </option>

            <option
              value="QUARRY ROUTE MOTORS LTD"
            >
              QUARRY ROUTE MOTORS LTD
            </option>

          </select>

          <label>
            Estimate No.
          </label>

          <input
            id="estimateNo"
            required
          >

          <label>
            Date
          </label>

          <input
            type="date"
            id="estimateDate"
            required
          >

          <label>
            Vehicle
          </label>

          <select
            id="estimateVehicle"
          ></select>

          <label>
            Customer
          </label>

          <input
            id="estimateCustomer"
          >

          <label>
            Customer Phone
          </label>

          <input
            id="estimateCustomerPhone"
          >

          <label>
            Vehicle Model
          </label>

          <input
            id="estimateVehicleModel"
          >

          <label>
            Chassis No.
          </label>

          <input
            id="estimateChassis"
          >

          <label>
            Subtotal
          </label>

          <input
            type="number"
            step="0.01"
            id="estimateSubtotal"
          >

          <label>
            VAT %
          </label>

          <input
            type="number"
            step="0.01"
            id="estimateVatRate"
            value="16"
          >

          <label>
            VAT Amount
          </label>

          <input
            type="number"
            step="0.01"
            id="estimateVatAmount"
            readonly
          >

          <label>
            Total
          </label>

          <input
            type="number"
            step="0.01"
            id="estimateTotal"
            readonly
          >

          <label>
            Notes
          </label>

          <textarea
            id="estimateNotes"
          ></textarea>

          <button
            class="primary-btn"
            type="submit"
          >
            Save Estimate
          </button>

        </form>

      </div>
    `;

    document.body.appendChild(
      modal
    );

    $("estimateForm")
      ?.addEventListener(
        "submit",
        saveEstimate
      );

    $("estimateSubtotal")
      ?.addEventListener(
        "input",
        calculateEstimate
      );

    $("estimateVatRate")
      ?.addEventListener(
        "input",
        calculateEstimate
      );
  }

  $("estimateForm")?.reset();

  $("estimateId").value =
    "";

  $("estimateDate").value =
    today();

  $("estimateVatRate").value =
    16;

  fillVehicleSelect(
    "estimateVehicle"
  );

  $("estimateModalTitle")
    .textContent =
      "Add Estimate";

  calculateEstimate();

  openModal(
    "estimateModal"
  );
}

function calculateEstimate() {

  const subtotal =
    num(
      $("estimateSubtotal")?.value
    );

  const rate =
    num(
      $("estimateVatRate")?.value
    );

  const vat =
    subtotal *
    rate /
    100;

  const total =
    subtotal +
    vat;

  if ($("estimateVatAmount"))
    $("estimateVatAmount").value =
      vat.toFixed(2);

  if ($("estimateTotal"))
    $("estimateTotal").value =
      total.toFixed(2);

  return {
    subtotal,
    vat,
    total
  };
}

function editEstimate(id) {

  openEstimateModal();

  const e =
    estimates.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!e) return;

  $("estimateId").value =
    e.id;

  $("estimateCompany").value =
    e.company_name ||
    "CRYSTAL MOTORS (K) LTD";

  $("estimateNo").value =
    e.estimate_no || "";

  $("estimateDate").value =
    e.estimate_date || "";

  $("estimateVehicle").value =
    e.vehicle_id || "";

  $("estimateCustomer").value =
    e.customer || "";

  $("estimateCustomerPhone").value =
    e.customer_phone || "";

  $("estimateVehicleModel").value =
    e.vehicle_model || "";

  $("estimateChassis").value =
    e.chassis_no || "";

  $("estimateSubtotal").value =
    num(e.subtotal);

  $("estimateVatRate").value =
    num(e.vat_rate) || 16;

  $("estimateVatAmount").value =
    num(e.vat_amount);

  $("estimateTotal").value =
    num(e.total_amount);

  $("estimateNotes").value =
    e.notes || "";

  $("estimateModalTitle")
    .textContent =
      "Edit Estimate";
}

async function saveEstimate(event) {

  event?.preventDefault();

  const id =
    $("estimateId")?.value || "";

  const calc =
    calculateEstimate();

  const vehicleId =
    $("estimateVehicle")?.value ||
    null;

  const v =
    vehicleById(vehicleId);

  const record = {

    estimate_no:
      $("estimateNo")
        ?.value.trim() ||
      "",

    estimate_date:
      $("estimateDate")?.value ||
      today(),

    company_name:
      $("estimateCompany")?.value ||
      "CRYSTAL MOTORS (K) LTD",

    customer:
      $("estimateCustomer")
        ?.value.trim() ||
      null,

    customer_phone:
      $("estimateCustomerPhone")
        ?.value.trim() ||
      null,

    vehicle_id:
      vehicleId,

    registration:
      v?.registration ||
      null,

    chassis_no:
      $("estimateChassis")
        ?.value.trim() ||
      null,

    vehicle_model:
      $("estimateVehicleModel")
        ?.value.trim() ||
      v?.model ||
      null,

    subtotal:
      calc.subtotal,

    vat_rate:
      num(
        $("estimateVatRate")?.value
      ),

    vat_amount:
      calc.vat,

    total_amount:
      calc.total,

    notes:
      $("estimateNotes")
        ?.value.trim() ||
      null

  };

  if (!record.estimate_no) {

    toast(
      "Estimate number is required.",
      "error"
    );

    return;
  }

  const result =
    id

      ? await supabase
          .from("estimates")
          .update(record)
          .eq("id",id)

      : await supabase
          .from("estimates")
          .insert(record);

  if (result.error) {

    toast(
      result.error.message,
      "error"
    );

    return;
  }

  closeModal(
    "estimateModal"
  );

  await loadAllData();

  toast(
    id
      ? "Estimate updated."
      : "Estimate saved."
  );
}

function viewEstimate(id) {

  const e =
    estimates.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!e) return;

  const v =
    vehicleById(e.vehicle_id);

  showPreview(
    `Estimate ${e.estimate_no}`,
    `
      <div class="print-document">

        <h2>
          ${estimateCompanyDetails(
            e.company_name
          )}
        </h2>

        <hr>

        <h2>
          REPAIR ESTIMATE / QUOTATION
        </h2>

        <p>
          <strong>
            Estimate No:
          </strong>
          ${esc(e.estimate_no)}
        </p>

        <p>
          <strong>
            Date:
          </strong>
          ${esc(
            e.estimate_date || ""
          )}
        </p>

        <p>
          <strong>
            Vehicle:
          </strong>
          ${esc(
            v?.registration ||
            e.registration ||
            ""
          )}
        </p>

        <p>
          <strong>
            Customer:
          </strong>
          ${esc(
            e.customer || ""
          )}
        </p>

        <p>
          <strong>
            Customer Phone:
          </strong>
          ${esc(
            e.customer_phone || ""
          )}
        </p>

        <p>
          <strong>
            Vehicle Model:
          </strong>
          ${esc(
            e.vehicle_model || ""
          )}
        </p>

        <p>
          <strong>
            Chassis No:
          </strong>
          ${esc(
            e.chassis_no || ""
          )}
        </p>

        <table>

          <tr>
            <th>Subtotal</th>
            <td>
              ${money(e.subtotal)}
            </td>
          </tr>

          <tr>
            <th>
              VAT ${num(e.vat_rate)}%
            </th>
            <td>
              ${money(e.vat_amount)}
            </td>
          </tr>

          <tr>
            <th>TOTAL</th>
            <td>
              <strong>
                ${money(e.total_amount)}
              </strong>
            </td>
          </tr>

        </table>

        <p>
          <strong>Notes:</strong><br>
          ${esc(e.notes || "")}
        </p>

      </div>
    `
  );
}

async function shareEstimate(id) {

  const e =
    estimates.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!e) return;

  const v =
    vehicleById(e.vehicle_id);

  await shareText(
    `Estimate ${e.estimate_no}`,
    [
      e.company_name,
      "REPAIR ESTIMATE / QUOTATION",
      "",
      `Estimate No: ${e.estimate_no}`,
      `Date: ${e.estimate_date || ""}`,
      `Vehicle: ${
        v?.registration ||
        e.registration ||
        ""
      }`,
      `Customer: ${e.customer || ""}`,
      `Subtotal: ${money(e.subtotal)}`,
      `VAT: ${money(e.vat_amount)}`,
      `TOTAL: ${money(e.total_amount)}`,
      "",
      `Notes: ${e.notes || ""}`
    ].join("\n")
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
      .eq("id",id);

  if (error) {

    toast(
      error.message,
      "error"
    );

    return;
  }

  await loadAllData();

  toast("Estimate deleted.");
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {

  const totalVehicles =
    vehicles.length;

  const repairs =
    vehicles.filter(
      v =>
        v.status ===
        "Under Repair"
    ).length;

  const outstanding =
    vehicles.reduce(
      (a,v) =>
        a +
        Math.max(
          0,
          num(v.billed) -
          num(v.paid)
        ),
      0
    );

  const billed =
    vehicles.reduce(
      (a,v) =>
        a + num(v.billed),
      0
    );

  const paid =
    vehicles.reduce(
      (a,v) =>
        a + num(v.paid),
      0
    );

  const totalExpenses =
    expenses.reduce(
      (a,e) =>
        a + num(e.amount),
      0
    );

  const totalPetty =
    pettyCash.reduce(
      (a,p) =>
        a + num(p.amount),
      0
    );

  const pendingReq =
    requisitions.filter(
      r =>
        r.status ===
        "Pending"
    ).length;

  setText(
    "dashVehicles",
    totalVehicles
  );

  setText(
    "dashRepair",
    repairs
  );

  setText(
    "dashOutstanding",
    money(outstanding)
  );

  setText(
    "dashReq",
    pendingReq
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
    money(totalExpenses)
  );

  setText(
    "dashPetty",
    money(totalPetty)
  );

  setText(
    "dashReqCount",
    pendingReq
  );

  setText(
    "dashReqTotal",
    money(
      requisitions.reduce(
        (a,r) =>
          a +
          num(r.total_amount),
        0
      )
    )
  );
}

function setText(id,value) {

  const el = $(id);

  if (el)
    el.textContent =
      value;
}

/* =========================================================
   PREVIEW
   ========================================================= */

function showPreview(
  title,
  html
) {

  if ($("previewTitle"))
    $("previewTitle").textContent =
      title;

  if ($("previewContent"))
    $("previewContent").innerHTML =
      html;

  openModal(
    "previewModal"
  );
}

function printCurrentPreview() {

  const title =
    $("previewTitle")
      ?.textContent ||
    "Garage Report";

  const html =
    $("previewContent")
      ?.innerHTML ||
    "";

  if (!html) {

    toast(
      "Nothing to print.",
      "error"
    );

    return;
  }

  printHTML(
    title,
    html
  );
}

/* =========================================================
   SHARE
   ========================================================= */

async function shareText(
  title,
  text
) {

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

  } catch(error) {

    if (
      error?.name ===
      "AbortError"
    ) {
      return;
    }
  }

  try {

    await navigator.clipboard
      .writeText(text);

    toast(
      "Report copied. Paste it into WhatsApp."
    );

    return;

  } catch(error) {

    console.warn(error);
  }

  alert(text);
}

/* =========================================================
   PRINT
   ========================================================= */

function printHTML(
  title,
  html
) {

  const w =
    window.open(
      "",
      "_blank"
    );

  if (!w) {

    toast(
      "Please allow pop-ups to print.",
      "error"
    );

    return;
  }

  w.document.write(`

    <!DOCTYPE html>

    <html>

    <head>

      <title>
        ${esc(title)}
      </title>

      <style>

        body {
          font-family:
            Arial,
            sans-serif;

          padding:30px;

          color:#111;
        }

        h1,
        h2,
        h3 {
          margin-top:0;
        }

        table {
          width:100%;
          border-collapse:
            collapse;
          margin-top:20px;
        }

        th,
        td {
          border:
            1px solid #ccc;
          padding:8px;
          text-align:left;
        }

        th {
          background:
            #f1f5f9;
        }

        button,
        .table-actions {
          display:none !important;
        }

      </style>

    </head>

    <body>

      ${html}

    </body>

    </html>

  `);

  w.document.close();

  setTimeout(
    () => {
      w.focus();
      w.print();
    },
    300
  );
}

function printTableBody(
  bodyId,
  title
) {

  const body =
    $(bodyId);

  if (!body) {

    toast(
      "Nothing to print.",
      "error"
    );

    return;
  }

  const table =
    body.closest(
      "table"
    );

  if (!table) {

    toast(
      "Nothing to print.",
      "error"
    );

    return;
  }

  printHTML(
    title,
    table.outerHTML
  );
}

function printVehicles() {

  renderVehicles();

  printTableBody(
    "vehiclesTableBody",
    "Vehicles"
  );
}

function printExpenses() {

  renderExpenses();

  printTableBody(
    "expensesTableBody",
    "Vehicle Expenses"
  );
}

function printPettyCash() {

  renderPettyCash();

  printTableBody(
    "pettyTableBody",
    "Petty Cash"
  );
}

function printRequisitions() {

  renderRequisitions();

  printTableBody(
    "requisitionsTableBody",
    "Requisitions"
  );
}

function printInvoices() {

  renderInvoices();

  printTableBody(
    "invoicesTableBody",
    "Invoices"
  );
}

function printGatePasses() {

  renderGatePasses();

  printTableBody(
    "gatePassesTableBody",
    "Gate Passes"
  );
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function showSection(
  sectionId
) {

  /*
    Hide every section first.
    This is what prevents
    Dashboard + Estimates from
    occupying the same workspace.
  */

  document
    .querySelectorAll(
      ".section,.app-section"
    )
    .forEach(section => {

      section.classList.remove(
        "active"
      );

      section.style.display =
        "none";
    });

  if (
    sectionId ===
    "estimates"
  ) {

    const section =
      ensureEstimateSection();

    section.style.display =
      "block";

    section.classList.add(
      "active"
    );

    renderEstimates();

  } else {

    const target =
      $(sectionId);

    if (target) {

      target.style.display =
        "";

      target.classList.add(
        "active"
      );
    }
  }

  /*
    Sidebar active state.
  */

  document
    .querySelectorAll(
      "[data-section]"
    )
    .forEach(el => {

      el.classList.toggle(
        "active",
        el.dataset.section ===
        sectionId
      );

    });

  switch(sectionId) {

    case "dashboard":
      renderDashboard();
      break;

    case "vehicles":
      renderVehicles();
      break;

    case "expenses":
      renderExpenses();
      break;

    case "petty-cash":
    case "pettyCash":
      renderPettyCash();
      break;

    case "requisitions":
      renderRequisitions();
      break;

    case "invoices":
      renderInvoices();
      break;

    case "gate-passes":
    case "gatePasses":
      renderGatePasses();
      break;

    case "estimates":
      renderEstimates();
      break;
  }

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });
}

/* =========================================================
   DASHBOARD CLICKABLE CARDS
   ========================================================= */

function setupDashboardCards() {

  const map = {

    dashVehicles:
      "vehicles",

    dashRepair:
      "vehicles",

    dashOutstanding:
      "vehicles",

    dashReq:
      "requisitions",

    dashInvoices:
      "invoices",

    dashGatePasses:
      "gate-passes",

    dashBilled:
      "vehicles",

    dashPaid:
      "vehicles",

    dashExpenses:
      "expenses",

    dashPetty:
      "petty-cash"

  };

  Object.entries(map)
    .forEach(
      ([id,section]) => {

        const el =
          $(id);

        if (!el)
          return;

        const card =
          el.closest(
            ".kpi-card"
          ) ||
          el.closest(
            ".stat-card"
          ) ||
          el.closest(
            ".dashboard-card"
          ) ||
          el.parentElement;

        if (!card)
          return;

        if (
          card.dataset
            .garageClickBound ===
          "1"
        ) {
          return;
        }

        card.dataset
          .garageClickBound =
          "1";

        card.style.cursor =
          "pointer";

        card.addEventListener(
          "click",
          () =>
            showSection(section)
        );
      }
    );
}

/* =========================================================
   SEARCH
   ========================================================= */

function setupSearches() {

  const ids = [

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

  ];

  ids.forEach(id => {

    const el =
      $(id);

    if (!el)
      return;

    if (
      el.dataset
        .garageSearchBound ===
      "1"
    ) {
      return;
    }

    el.dataset
      .garageSearchBound =
      "1";

    el.addEventListener(
      "input",
      () =>
        refreshSearch(id)
    );

    el.addEventListener(
      "change",
      () =>
        refreshSearch(id)
    );

  });
}

function refreshSearch(id) {

  if (
    id ===
    "expenseSearch" ||
    id ===
    "expenseCategoryFilter"
  ) {

    renderExpenses();

    return;
  }

  if (
    id.startsWith(
      "vehicle"
    )
  ) {

    renderVehicles();

    return;
  }

  if (
    id.startsWith(
      "petty"
    )
  ) {

    renderPettyCash();

    return;
  }

  if (
    id.startsWith(
      "req"
    )
  ) {

    renderRequisitions();

    return;
  }

  if (
    id.startsWith(
      "invoice"
    )
  ) {

    renderInvoices();

    return;
  }

  if (
    id.startsWith(
      "gate"
    )
  ) {

    renderGatePasses();

    return;
  }
}

/* =========================================================
   FORM LISTENERS
   ========================================================= */

function setupFormListeners() {

  [
    "reqQuantity",
    "reqUnitCost"
  ].forEach(id => {

    $(id)?.addEventListener(
      "input",
      calculateReqTotal
    );

  });

  [
    "invoiceLabour",
    "invoiceParts",
    "invoiceOther",
    "invoicePaid"
  ].forEach(id => {

    $(id)?.addEventListener(
      "input",
      calculateInvoice
    );

  });

  [
    "vehicleDateIn",
    "vehicleDateOut"
  ].forEach(id => {

    $(id)?.addEventListener(
      "change",
      () => {

        const fakeVehicle = {

          date_in:
            $("vehicleDateIn")
              ?.value,

          date_out:
            $("vehicleDateOut")
              ?.value

        };

        if (
          $("vehicleStorageDays")
        ) {

          $("vehicleStorageDays")
            .value =
              storageDays(
                fakeVehicle
              );
        }

      }
    );

  });

  $("invoiceVehicle")
    ?.addEventListener(
      "change",
      () => {

        const v =
          vehicleById(
            $("invoiceVehicle")
              .value
          );

        if (
          v &&
          $("invoiceCustomer")
        ) {

          $("invoiceCustomer")
            .value =
              v.customer || "";
        }
      }
    );

  $("gateVehicle")
    ?.addEventListener(
      "change",
      () => {

        const v =
          vehicleById(
            $("gateVehicle")
              .value
          );

        if (!v) return;

        if (
          $("gateVehicleRegistration")
        ) {

          $("gateVehicleRegistration")
            .value =
              v.registration || "";
        }

        if ($("gateCustomer")) {

          $("gateCustomer")
            .value =
              v.customer || "";
        }

        if ($("gateReleasedTo")) {

          $("gateReleasedTo")
            .value =
              v.released_to || "";
        }

        if (
          $("gateReleasedContact")
        ) {

          $("gateReleasedContact")
            .value =
              v.released_contact || "";
        }

      }
    );
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

  /*
    Estimates is rendered only
    after its page exists.
  */

  if ($("estimates"))
    renderEstimates();
}

/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

Object.assign(
  window,
  {

    supabase,

    loadAllData,
    renderAll,

    showSection,

    openModal,
    closeModal,
    closeAllModals,

    /* Vehicles */

    openVehicleModal,
    saveVehicle,
    editVehicle,
    deleteVehicle,
    viewVehicle,
    shareVehicle,

    /* Vehicle Expenses */

    viewVehicleExpenses,
    shareVehicleExpenses,
    printVehicleExpensePreview,
    vehicleExpenseTotal,

    /* Expenses */

    openExpenseModal,
    saveExpense,
    editExpense,
    deleteExpense,
    viewExpense,
    shareExpense,

    /* Petty */

    openPettyModal,
    savePetty,
    editPetty,
    deletePetty,
    viewPetty,
    sharePetty,

    /* Requisitions */

    openReqModal,
    saveReq,
    editReq,
    deleteReq,
    viewReq,
    shareReq,
    calculateReqTotal,

    /* Invoices */

    openInvoiceModal,
    saveInvoice,
    editInvoice,
    deleteInvoice,
    viewInvoice,
    shareInvoice,
    calculateInvoice,

    /* Gate Passes */

    openGatePassModal,
    saveGatePass,
    editGatePass,
    deleteGatePass,
    viewGatePass,
    shareGatePass,

    /* Estimates */

    openEstimateModal,
    saveEstimate,
    editEstimate,
    deleteEstimate,
    viewEstimate,
    shareEstimate,
    calculateEstimate,

    /* Print */

    printVehicles,
    printExpenses,
    printPettyCash,
    printRequisitions,
    printInvoices,
    printGatePasses,
    printCurrentPreview

  }
);

/* =========================================================
   START APPLICATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    injectStyles();

    setupSearches();

    setupFormListeners();

    /*
      Adds:
      📋 Estimates / Quotations
      to the existing sidebar.
    */

    ensureEstimateNavigation();

    /*
      Default dates.
    */

    [
      "vehicleDateIn",
      "expenseDate",
      "pettyDate",
      "reqDate",
      "invoiceDate",
      "gatePassDate"
    ].forEach(id => {

      const el = $(id);

      if (
        el &&
        !el.value
      ) {

        el.value =
          today();
      }

    });

    /*
      Load Supabase.
    */

    await loadAllData();

    /*
      Dashboard cards.
    */

    setupDashboardCards();

    /*
      ALWAYS start on Dashboard.
      Estimates remains hidden until
      its sidebar button is clicked.
    */

    document
      .querySelectorAll(
        ".section,.app-section"
      )
      .forEach(section => {

        if (
          section.id !==
          "dashboard"
        ) {

          section.style.display =
            "none";

          section.classList.remove(
            "active"
          );
        }

      });

    const dashboard =
      $("dashboard");

    if (dashboard) {

      dashboard.style.display =
        "";

      dashboard.classList.add(
        "active"
      );
    }

    console.log(
      "Garage Operations Pro ready."
    );

  }
);
