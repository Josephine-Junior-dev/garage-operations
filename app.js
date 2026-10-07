import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE APP.JS
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

const COMPANY = {
  crystal: {
    name: "CRYSTAL MOTORS (K) LTD",
    address:
      "P.O. Box 54385 – 00200, Nairobi\nOff Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge",
    phone: "0722 707124 | 0723 914 222"
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

const $ = id => document.getElementById(id);

const money = n =>
  "KSh " +
  Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const today = () => new Date().toISOString().slice(0, 10);

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setText(id, value) {
  if ($(id)) $(id).textContent = value;
}

function setValue(id, value) {
  const el = $(id);
  if (el) el.value = value ?? "";
}

function toast(msg) {
  let el = $("toast");

  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }

  el.textContent = msg;
  el.style.cssText =
    "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);" +
    "background:#172033;color:white;padding:12px 18px;border-radius:9px;" +
    "z-index:99999;box-shadow:0 5px 20px #0004";

  clearTimeout(window.garageToastTimer);
  window.garageToastTimer = setTimeout(() => el.remove(), 2500);
}

function errorMessage(error) {
  return error?.message || "Operation failed";
}

function dateDiff(dateIn, dateOut) {
  if (!dateIn) return 0;

  const start = new Date(dateIn);
  const end = dateOut ? new Date(dateOut) : new Date();

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return Math.max(0, Math.floor((end - start) / 86400000));
}

function vehicleById(id) {
  return vehicles.find(v => String(v.id) === String(id));
}

function vehicleName(id) {
  const v = vehicleById(id);
  return v ? v.registration : "Unassigned";
}

/* =========================================================
   MOBILE STYLES
   ========================================================= */

function injectStyles() {
  if ($("garageDynamicStyles")) return;

  const s = document.createElement("style");
  s.id = "garageDynamicStyles";

  s.textContent = `
    .table-actions{
      display:flex!important;
      flex-direction:row!important;
      flex-wrap:nowrap!important;
      align-items:center!important;
      gap:4px!important;
      white-space:nowrap!important;
    }

    .action-btn{
      width:33px!important;
      height:31px!important;
      min-width:33px!important;
      padding:0!important;
      border:0!important;
      border-radius:7px!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      font-size:14px!important;
      line-height:1!important;
      cursor:pointer!important;
      touch-action:manipulation!important;
    }

    .action-btn.blue{
      background:#e0f2fe!important;
      color:#075985!important;
    }

    .action-btn.green{
      background:#dcfce7!important;
      color:#166534!important;
    }

    .action-btn.orange{
      background:#fef3c7!important;
      color:#92400e!important;
    }

    .action-btn.purple{
      background:#ede9fe!important;
      color:#6d28d9!important;
    }

    .action-btn.gray{
      background:#f1f5f9!important;
      color:#172033!important;
    }

    .action-btn.danger{
      background:#fee2e2!important;
      color:#991b1b!important;
    }

    .kpi-card{
      cursor:pointer!important;
      touch-action:manipulation!important;
      -webkit-tap-highlight-color:rgba(37,99,235,.15)!important;
    }

    .modal-actions{
      display:flex!important;
      gap:8px!important;
      flex-wrap:wrap!important;
    }

    .icon-save,
    .icon-cancel{
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      width:42px!important;
      height:38px!important;
      border:0!important;
      border-radius:8px!important;
      cursor:pointer!important;
      font-size:17px!important;
    }

    .icon-save{
      background:#2563eb!important;
      color:white!important;
    }

    .icon-cancel{
      background:#e5e7eb!important;
      color:#172033!important;
    }

    @media(max-width:720px){
      .table-actions{
        gap:3px!important;
      }

      .action-btn{
        width:31px!important;
        min-width:31px!important;
        height:30px!important;
        font-size:13px!important;
        flex:0 0 31px!important;
      }
    }
  `;

  document.head.appendChild(s);
}

/* =========================================================
   ACTION BUTTONS
   ========================================================= */

function btn(icon, title, fn, id, cls = "gray") {
  return `
    <button
      type="button"
      class="action-btn ${cls}"
      title="${esc(title)}"
      aria-label="${esc(title)}"
      onclick="event.stopPropagation();${fn}('${esc(id)}')">
      ${icon}
    </button>
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

function standardActions(id, edit, view, share, del) {
  return `
    <div class="table-actions">
      ${btn("✏️", "Edit", edit, id, "blue")}
      ${btn("👁️", "View", view, id, "gray")}
      ${btn("📤", "Share", share, id, "purple")}
      ${btn("🗑️", "Delete", del, id, "danger")}
    </div>
  `;
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function showSection(section) {
  document.querySelectorAll(".section,.app-section").forEach(el => {
    el.classList.remove("active");
    el.style.display = "none";
  });

  const target = $(section);

  if (target) {
    target.classList.add("active");
    target.style.display = "";
  }

  document.querySelectorAll("[data-section]").forEach(el => {
    el.classList.toggle("active", el.dataset.section === section);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

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
   DASHBOARD CARDS
   ========================================================= */

function setupDashboardCards() {
  const actions = {
    dashVehicles: () => {
      setValue("vehicleSearch", "");
      setValue("vehicleStatusFilter", "");
      showSection("vehicles");
    },

    dashRepair: () => {
      setValue("vehicleSearch", "");
      setValue("vehicleStatusFilter", "Under Repair");
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

  Object.entries(actions).forEach(([id, action]) => {
    const value = $(id);
    if (!value) return;

    const card =
      value.closest(".kpi-card") ||
      value.closest(".stat-card") ||
      value.closest(".dashboard-card") ||
      value.parentElement?.parentElement ||
      value.parentElement;

    if (!card) return;

    card.style.cursor = "pointer";
    card.style.touchAction = "manipulation";
    card.style.pointerEvents = "auto";

    card.onclick = event => {
      if (
        event.target.closest("button") ||
        event.target.closest("a")
      ) return;

      action();
    };

    value.style.cursor = "pointer";
    value.onclick = event => {
      event.stopPropagation();
      action();
    };
  });
}

/* =========================================================
   LOAD DATA
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
    [
      vehicles,
      expenses,
      pettyCash,
      requisitions,
      invoices,
      gatePasses,
      estimates
    ] = await Promise.all([
      loadTable("vehicles"),
      loadTable("expenses"),
      loadTable("petty_cash"),
      loadTable("requisitions"),
      loadTable("invoices"),
      loadTable("gate_passes"),
      loadTable("estimates")
    ]);

    renderAll();
  } catch (e) {
    console.error(e);
    toast("Data loading error");
  }
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {
  const totalExpenses =
    expenses.reduce((a, e) => a + Number(e.amount || 0), 0);

  const totalPetty =
    pettyCash.reduce((a, e) => a + Number(e.amount || 0), 0);

  const billed =
    vehicles.reduce((a, v) => a + Number(v.billed || 0), 0);

  const paid =
    vehicles.reduce((a, v) => a + Number(v.paid || 0), 0);

  const outstanding = billed - paid;

  const repair =
    vehicles.filter(v => v.status === "Under Repair").length;

  setText("dashVehicles", vehicles.length);
  setText("dashRepair", repair);
  setText("dashOutstanding", money(outstanding));
  setText(
    "dashReq",
    requisitions.filter(r => r.status === "Pending").length
  );
  setText("dashInvoices", invoices.length);
  setText("dashGatePasses", gatePasses.length);
  setText("dashBilled", money(billed));
  setText("dashPaid", money(paid));
  setText("dashExpenses", money(totalExpenses));
  setText("dashPetty", money(totalPetty));
  setText("dashReqCount", requisitions.length);

  setText(
    "dashReqTotal",
    money(
      requisitions.reduce(
        (a, r) => a + Number(r.total_amount || 0),
        0
      )
    )
  );

  if ($("vehicleStatusSummary")) {
    const counts = {};

    vehicles.forEach(v => {
      const status = v.status || "Unknown";
      counts[status] = (counts[status] || 0) + 1;
    });

    $("vehicleStatusSummary").innerHTML =
      Object.entries(counts)
        .map(
          ([k, v]) =>
            `<div>${esc(k)}: <strong>${v}</strong></div>`
        )
        .join("") || "No vehicles";
  }

  if ($("dashboardActivity")) {
    $("dashboardActivity").innerHTML = `
      <div>Vehicles: <strong>${vehicles.length}</strong></div>
      <div>Expenses: <strong>${money(totalExpenses)}</strong></div>
      <div>Petty Cash: <strong>${money(totalPetty)}</strong></div>
      <div>Outstanding: <strong>${money(outstanding)}</strong></div>
    `;
  }

  setupDashboardCards();
}

/* =========================================================
   VEHICLES
   ========================================================= */

function renderVehicles() {
  const body = $("vehiclesTableBody");
  if (!body) return;

  const search =
    ($("vehicleSearch")?.value || "").toLowerCase().trim();

  const status =
    $("vehicleStatusFilter")?.value || "";

  const rows = vehicles.filter(v => {
    const text = [
      v.registration,
      v.customer,
      v.model,
      v.model_year,
      v.color,
      v.status,
      v.job_type
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search || text.includes(search)) &&
      (!status || v.status === status)
    );
  });

  body.innerHTML =
    rows
      .map(v => {
        const expTotal = expenses
          .filter(
            e =>
              e.vehicle_id &&
              String(e.vehicle_id) === String(v.id)
          )
          .reduce(
            (sum, e) => sum + Number(e.amount || 0),
            0
          );

        const billed = Number(v.billed || 0);
        const paid = Number(v.paid || 0);

        return `
          <tr>
            <td>${esc(v.registration)}</td>
            <td>${esc(v.customer)}</td>
            <td>${esc(v.date_in)}</td>
            <td>${esc(v.job_type)}</td>
            <td>${esc(v.status)}</td>
            <td>${dateDiff(v.date_in, v.date_out)}</td>
            <td>${money(billed)}</td>
            <td>${money(paid)}</td>
            <td>${money(billed - paid)}</td>

            <td>
              <button
                type="button"
                title="Vehicle expenses"
                onclick="event.stopPropagation();viewVehicleExpenses('${v.id}')">
                ${money(expTotal)}
              </button>
            </td>

            <td>${vehicleActions(v.id)}</td>
          </tr>
        `;
      })
      .join("") ||
    `<tr><td colspan="11">No vehicles found</td></tr>`;
}

function openVehicleModal(id = "") {
  const modal = $("vehicleModal");

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  if (!id) {
    $("vehicleForm")?.reset();

    setValue("vehicleId", "");
    setValue("vehicleDateIn", today());
    setValue("vehicleStorageDays", 0);

    setText("vehicleModalTitle", "Add Vehicle");
    return;
  }

  editVehicle(id);
}

function editVehicle(id) {
  const v = vehicleById(id);
  if (!v) return;

  const modal = $("vehicleModal");

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  setText("vehicleModalTitle", "Edit Vehicle");

  setValue("vehicleId", v.id);
  setValue("vehicleRegistration", v.registration);
  setValue("vehicleCustomer", v.customer);
  setValue("vehicleModel", v.model);
  setValue("vehicleModelYear", v.model_year);
  setValue("vehicleColor", v.color);
  setValue("vehicleDateIn", v.date_in);
  setValue("vehicleDateOut", v.date_out);
  setValue(
    "vehicleStorageDays",
    dateDiff(v.date_in, v.date_out)
  );
  setValue("vehicleJobType", v.job_type);
  setValue("vehicleStatus", v.status);
  setValue("vehicleReleasedTo", v.released_to);
  setValue("vehicleReleasedContact", v.released_contact);
  setValue("vehicleBilled", v.billed);
  setValue("vehiclePaid", v.paid);
  setValue("vehicleDescription", v.description);
}

async function saveVehicle(e) {
  e?.preventDefault();

  const id = $("vehicleId")?.value;
  const registration =
    $("vehicleRegistration")?.value.trim();

  if (!registration) {
    toast("Registration / Chassis No. is required");
    return;
  }

  const duplicate = vehicles.find(v =>
    String(v.registration || "")
      .trim()
      .toLowerCase() === registration.toLowerCase() &&
    String(v.id) !== String(id)
  );

  if (duplicate) {
    toast("Vehicle already exists");
    return;
  }

  const record = {
    registration,
    customer:
      $("vehicleCustomer")?.value.trim() || "",
    model:
      $("vehicleModel")?.value.trim() || null,
    model_year:
      $("vehicleModelYear")?.value || null,
    color:
      $("vehicleColor")?.value.trim() || null,
    date_in:
      $("vehicleDateIn")?.value || today(),
    date_out:
      $("vehicleDateOut")?.value || null,
    job_type:
      $("vehicleJobType")?.value || "Repair",
    status:
      $("vehicleStatus")?.value || "Under Repair",
    released_to:
      $("vehicleReleasedTo")?.value.trim() || null,
    released_contact:
      $("vehicleReleasedContact")?.value.trim() || null,
    billed:
      Number($("vehicleBilled")?.value || 0),
    paid:
      Number($("vehiclePaid")?.value || 0),
    description:
      $("vehicleDescription")?.value.trim() || null
  };

  const { error } = id
    ? await supabase
        .from("vehicles")
        .update(record)
        .eq("id", id)
    : await supabase
        .from("vehicles")
        .insert(record);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  closeModal("vehicleModal");
  toast("Vehicle saved");
  await loadAllData();
}

async function deleteVehicle(id) {
  const v = vehicleById(id);
  if (!v) return;

  if (!confirm(`Delete ${v.registration}?`)) return;

  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", id);

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

  const total = expenses
    .filter(
      e =>
        e.vehicle_id &&
        String(e.vehicle_id) === String(id)
    )
    .reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0
    );

  preview(
    "Vehicle Details",
    `
      <h2>${esc(v.registration)}</h2>

      <p><strong>Customer:</strong>
        ${esc(v.customer)}</p>

      <p><strong>Model:</strong>
        ${esc(v.model)}</p>

      <p><strong>Year:</strong>
        ${esc(v.model_year)}</p>

      <p><strong>Color:</strong>
        ${esc(v.color)}</p>

      <p><strong>Job:</strong>
        ${esc(v.job_type)}</p>

      <p><strong>Status:</strong>
        ${esc(v.status)}</p>

      <p><strong>Date In:</strong>
        ${esc(v.date_in)}</p>

      <p><strong>Storage Days:</strong>
        ${dateDiff(v.date_in, v.date_out)}</p>

      <p><strong>Billed:</strong>
        ${money(v.billed)}</p>

      <p><strong>Paid:</strong>
        ${money(v.paid)}</p>

      <p><strong>Outstanding:</strong>
        ${money(
          Number(v.billed || 0) -
          Number(v.paid || 0)
        )}</p>

      <p><strong>TOTAL VEHICLE EXPENSE:</strong>
        ${money(total)}</p>

      <p>${esc(v.description)}</p>
    `
  );
}

/* =========================================================
   VEHICLE-SPECIFIC EXPENSES
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

  if (!v) {
    toast("Vehicle not found");
    return;
  }

  const list = vehicleExpenseData(v.id);

  const total = list.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  window.currentVehicleExpenseId = v.id;

  const modal = $("vehicleExpensePreviewModal");

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  if (!$("vehicleExpensePreviewContent")) return;

  $("vehicleExpensePreviewContent").innerHTML = `
    <div class="print-document">

      <h1>CRYSTAL MOTORS (K) LTD</h1>

      <p style="text-align:center">
        P.O. Box 54385 – 00200, Nairobi<br>
        Off Mombasa Road, Along Quarry Road,
        Near Mlolongo Weighbridge<br>
        Cell: 0722 707124 | 0723 914 222
      </p>

      <hr>

      <h2>VEHICLE EXPENSE REPORT</h2>

      <p>
        <strong>Registration / Chassis:</strong>
        ${esc(v.registration)}
      </p>

      <p>
        <strong>Customer:</strong>
        ${esc(v.customer || "")}
      </p>

      <p>
        <strong>Job Type:</strong>
        ${esc(v.job_type || "")}
      </p>

      <p>
        <strong>Status:</strong>
        ${esc(v.status || "")}
      </p>

      <p>
        <strong>Date In:</strong>
        ${esc(v.date_in || "")}
      </p>

      <p>
        <strong>Storage Days:</strong>
        ${dateDiff(v.date_in, v.date_out)}
      </p>

      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          ${
            list.map((e, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${esc(e.expense_date || "")}</td>
                <td>${esc(e.description || "")}</td>
                <td>${esc(e.category || "")}</td>
                <td>${money(e.amount)}</td>
              </tr>
            `).join("") ||
            `
              <tr>
                <td colspan="5">
                  No expenses recorded for this vehicle
                </td>
              </tr>
            `
          }
        </tbody>

        <tfoot>
          <tr>
            <th colspan="4" style="text-align:right">
              TOTAL VEHICLE EXPENSE
            </th>
            <th>${money(total)}</th>
          </tr>
        </tfoot>
      </table>

    </div>
  `;
}

/* =========================================================
   VEHICLE SHARE
   ========================================================= */

async function shareVehicle(id) {
  const v = vehicleById(id);

  if (!v) {
    toast("Vehicle not found");
    return;
  }

  const list = vehicleExpenseData(v.id);

  const total = list.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  const expenseLines = list.length
    ? list
        .map(
          (e, i) =>
            `${i + 1}. ${e.expense_date || ""}
${e.description || ""}
Category: ${e.category || ""}
Amount: ${money(e.amount)}`
        )
        .join("\n\n")
    : "No expenses recorded for this vehicle.";

  const outstanding =
    Number(v.billed || 0) -
    Number(v.paid || 0);

  const text =
`CRYSTAL MOTORS (K) LTD
P.O. Box 54385 – 00200, Nairobi
Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge
Cell: 0722 707124 | 0723 914 222

VEHICLE EXPENSE REPORT

Registration / Chassis: ${v.registration || ""}
Customer: ${v.customer || ""}
Model: ${v.model || ""}
Job Type: ${v.job_type || ""}
Status: ${v.status || ""}
Date In: ${v.date_in || ""}
Storage Days: ${dateDiff(v.date_in, v.date_out)}

BILLED: ${money(v.billed)}
PAID: ${money(v.paid)}
OUTSTANDING: ${money(outstanding)}

VEHICLE EXPENSES
----------------

${expenseLines}

----------------
TOTAL VEHICLE EXPENSE: ${money(total)}
`;

  try {
    if (navigator.share) {
      await navigator.share({
        title:
          `Vehicle Expense Report - ${v.registration}`,
        text
      });
      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      toast("Vehicle report copied");
      return;
    }

    const box =
      document.createElement("textarea");

    box.value = text;
    box.style.position = "fixed";
    box.style.left = "-9999px";

    document.body.appendChild(box);
    box.focus();
    box.select();

    document.execCommand("copy");
    box.remove();

    toast("Vehicle report copied");

  } catch (e) {
    if (e?.name !== "AbortError") {
      console.error(e);

      try {
        prompt("Copy vehicle report:", text);
      } catch {
        toast("Share failed");
      }
    }
  }
}

function printVehicleExpenses() {
  const id =
    window.currentVehicleExpenseId;

  if (!id) {
    toast("Open vehicle expenses first");
    return;
  }

  const v = vehicleById(id);

  if (!v) {
    toast("Vehicle not found");
    return;
  }

  const list = vehicleExpenseData(id);

  const total = list.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  const html = `
    <div class="print-document">

      <h1>CRYSTAL MOTORS (K) LTD</h1>

      <p style="text-align:center">
        P.O. Box 54385 – 00200, Nairobi<br>
        Off Mombasa Road, Along Quarry Road,
        Near Mlolongo Weighbridge<br>
        Cell: 0722 707124 | 0723 914 222
      </p>

      <hr>

      <h2>VEHICLE EXPENSE REPORT</h2>

      <p>
        <strong>Registration / Chassis:</strong>
        ${esc(v.registration)}
      </p>

      <p>
        <strong>Customer:</strong>
        ${esc(v.customer || "")}
      </p>

      <p>
        <strong>Job Type:</strong>
        ${esc(v.job_type || "")}
      </p>

      <p>
        <strong>Status:</strong>
        ${esc(v.status || "")}
      </p>

      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          ${
            list.map((e, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${esc(e.expense_date || "")}</td>
                <td>${esc(e.description || "")}</td>
                <td>${esc(e.category || "")}</td>
                <td>${money(e.amount)}</td>
              </tr>
            `).join("") ||
            `
              <tr>
                <td colspan="5">
                  No expenses recorded
                </td>
              </tr>
            `
          }
        </tbody>

        <tfoot>
          <tr>
            <th colspan="4">
              TOTAL VEHICLE EXPENSE
            </th>
            <th>${money(total)}</th>
          </tr>
        </tfoot>
      </table>

    </div>
  `;

  const win = window.open("", "_blank");

  if (!win) {
    toast("Allow pop-ups to print");
    return;
  }

  win.document.write(`
    <!doctype html>
    <html>
    <head>
      <title>
        Vehicle Expense Report -
        ${esc(v.registration)}
      </title>

      <meta
        name="viewport"
        content="width=device-width,initial-scale=1"
      >

      <style>
        body{
          font-family:Arial,sans-serif;
          padding:20px;
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
          border:1px solid #777;
          padding:8px;
          text-align:left;
        }

        th{
          font-weight:bold;
        }

        @media print{
          body{
            padding:8px;
          }
        }
      </style>
    </head>

    <body>
      ${html}
    </body>
    </html>
  `);

  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
  }, 400);
}

/* =========================================================
   EXPENSES
   ========================================================= */

function renderExpenses() {
  const body = $("expensesTableBody");
  if (!body) return;

  const search =
    ($("expenseSearch")?.value || "")
      .toLowerCase()
      .trim();

  const category =
    $("expenseCategoryFilter")?.value || "";

  const rows = expenses.filter(e => {
    const v = vehicleById(e.vehicle_id);

    const text = [
      e.description,
      e.category,
      v?.registration,
      v?.customer
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search || text.includes(search)) &&
      (!category || e.category === category)
    );
  });

  body.innerHTML =
    rows
      .map(
        e => `
        <tr>
          <td>${esc(e.expense_date)}</td>
          <td>${esc(vehicleName(e.vehicle_id))}</td>
          <td>${esc(e.description)}</td>
          <td>${esc(e.category)}</td>
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
      `
      )
      .join("") ||
    `<tr><td colspan="6">No expenses found</td></tr>`;
}

function openExpenseModal(id = "") {
  const modal = $("expenseModal");

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  if (!id) {
    $("expenseForm")?.reset();

    setValue("expenseId", "");
    setValue("expenseDate", today());

    fillVehicleSelect("expenseVehicle");

    setText("expenseModalTitle", "Add Expense");
  } else {
    editExpense(id);
  }
}

function editExpense(id) {
  const e = expenses.find(
    x => String(x.id) === String(id)
  );

  if (!e) return;

  const modal = $("expenseModal");

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  fillVehicleSelect("expenseVehicle");

  setText("expenseModalTitle", "Edit Expense");

  setValue("expenseId", e.id);
  setValue("expenseVehicle", e.vehicle_id);
  setValue("expenseDate", e.expense_date);
  setValue("expenseCategory", e.category);
  setValue("expenseAmount", e.amount);
  setValue("expenseDescription", e.description);
}

async function saveExpense(e) {
  e?.preventDefault();

  const id = $("expenseId")?.value;

  const record = {
    vehicle_id:
      $("expenseVehicle")?.value || null,
    expense_date:
      $("expenseDate")?.value || today(),
    category:
      $("expenseCategory")?.value || "Parts",
    amount:
      Number($("expenseAmount")?.value || 0),
    description:
      $("expenseDescription")?.value.trim() || ""
  };

  if (!record.description) {
    toast("Description is required");
    return;
  }

  const { error } = id
    ? await supabase
        .from("expenses")
        .update(record)
        .eq("id", id)
    : await supabase
        .from("expenses")
        .insert(record);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  closeModal("expenseModal");
  toast("Expense saved");
  await loadAllData();
}

async function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  toast("Expense deleted");
  await loadAllData();
}

function viewExpense(id) {
  const e = expenses.find(
    x => String(x.id) === String(id)
  );

  if (!e) return;

  preview(
    "Expense",
    `
      <h2>${esc(e.description)}</h2>

      <p><strong>Vehicle:</strong>
        ${esc(vehicleName(e.vehicle_id))}</p>

      <p><strong>Date:</strong>
        ${esc(e.expense_date)}</p>

      <p><strong>Category:</strong>
        ${esc(e.category)}</p>

      <p><strong>Amount:</strong>
        ${money(e.amount)}</p>
    `
  );
}

function shareExpense(id) {
  const e = expenses.find(
    x => String(x.id) === String(id)
  );

  if (!e) return;

  shareText(
    "Garage Expense",
    `Vehicle: ${vehicleName(e.vehicle_id)}
Date: ${e.expense_date}
Description: ${e.description}
Category: ${e.category}
Amount: ${money(e.amount)}`
  );
}

/* =========================================================
   PETTY CASH
   ========================================================= */

function renderPettyCash() {
  const body = $("pettyTableBody");
  if (!body) return;

  const search =
    ($("pettySearch")?.value || "")
      .toLowerCase()
      .trim();

  const category =
    $("pettyCategoryFilter")?.value || "";

  const rows = pettyCash.filter(p => {
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

  body.innerHTML =
    rows
      .map(
        p => `
        <tr>
          <td>${esc(p.cash_date)}</td>
          <td>${esc(p.paid_to)}</td>
          <td>${esc(p.category)}</td>
          <td>${esc(p.description)}</td>
          <td>${money(p.amount)}</td>
          <td>
            ${standardActions(
              p.id,
              "editPetty",
              "viewPetty",
              "sharePetty",
              "deletePetty"
            )}
          </td>
        </tr>
      `
      )
      .join("") ||
    `<tr><td colspan="6">No petty cash records</td></tr>`;
}

function openPettyModal(id = "") {
  const modal = $("pettyModal");

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  if (!id) {
    $("pettyForm")?.reset();

    setValue("pettyId", "");
    setValue("pettyDate", today());

    setText("pettyModalTitle", "Add Petty Cash");
  } else {
    editPetty(id);
  }
}

function editPetty(id) {
  const p = pettyCash.find(
    x => String(x.id) === String(id)
  );

  if (!p) return;

  const modal = $("pettyModal");

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  setText("pettyModalTitle", "Edit Petty Cash");

  setValue("pettyId", p.id);
  setValue("pettyDate", p.cash_date);
  setValue("pettyPaidTo", p.paid_to);
  setValue("pettyCategory", p.category);
  setValue("pettyAmount", p.amount);
  setValue("pettyDescription", p.description);
  setValue("pettyNotes", p.notes);
}

async function savePetty(e) {
  e?.preventDefault();

  const id = $("pettyId")?.value;

  const record = {
    cash_date:
      $("pettyDate")?.value || today(),
    paid_to:
      $("pettyPaidTo")?.value.trim() || null,
    category:
      $("pettyCategory")?.value || "Other",
    amount:
      Number($("pettyAmount")?.value || 0),
    description:
      $("pettyDescription")?.value.trim() || "",
    notes:
      $("pettyNotes")?.value.trim() || null
  };

  const { error } = id
    ? await supabase
        .from("petty_cash")
        .update(record)
        .eq("id", id)
    : await supabase
        .from("petty_cash")
        .insert(record);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  closeModal("pettyModal");
  toast("Petty cash saved");
  await loadAllData();
}

async function deletePetty(id) {
  if (!confirm("Delete this petty cash record?"))
    return;

  const { error } = await supabase
    .from("petty_cash")
    .delete()
    .eq("id", id);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  toast("Deleted");
  await loadAllData();
}

function viewPetty(id) {
  const p = pettyCash.find(
    x => String(x.id) === String(id)
  );

  if (!p) return;

  preview(
    "Petty Cash",
    `
      <h2>${esc(p.description)}</h2>
      <p>Date: ${esc(p.cash_date)}</p>
      <p>Paid To: ${esc(p.paid_to)}</p>
      <p>Category: ${esc(p.category)}</p>
      <p>Amount: ${money(p.amount)}</p>
      <p>Notes: ${esc(p.notes)}</p>
    `
  );
}

function sharePetty(id) {
  const p = pettyCash.find(
    x => String(x.id) === String(id)
  );

  if (!p) return;

  shareText(
    "Petty Cash",
    `${p.cash_date}
Paid To: ${p.paid_to || ""}
Category: ${p.category || ""}
Description: ${p.description}
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

  const search =
    ($("reqSearch")?.value || "")
      .toLowerCase()
      .trim();

  const status =
    $("reqStatusFilter")?.value || "";

  const rows = requisitions.filter(r => {
    const text = [
      r.req_no,
      r.requested_by,
      r.item_description,
      vehicleName(r.vehicle_id),
      r.status
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search || text.includes(search)) &&
      (!status || r.status === status)
    );
  });

  const total = rows.reduce(
    (a, r) => a + Number(r.total_amount || 0),
    0
  );

  setText("reqOverallTotal", money(total));

  body.innerHTML =
    rows
      .map(
        r => `
        <tr>
          <td>${esc(r.req_no)}</td>
          <td>${esc(r.req_date)}</td>
          <td>${esc(r.requested_by)}</td>
          <td>${esc(vehicleName(r.vehicle_id))}</td>
          <td>${esc(r.item_description)}</td>
          <td>${esc(r.quantity)}</td>
          <td>${money(r.unit_cost)}</td>
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
      `
      )
      .join("") ||
    `<tr><td colspan="10">No requisitions found</td></tr>`;
}

function openReqModal(id = "") {
  const modal = $("reqModal");

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  fillVehicleSelect("reqVehicle");

  if (!id) {
    $("reqForm")?.reset();

    setValue("reqId", "");
    setValue("reqDate", today());
    setValue("reqQuantity", 1);
    setValue("reqTotal", 0);

    setText("reqModalTitle", "Add Requisition");
  } else {
    editReq(id);
  }
}

function editReq(id) {
  const r = requisitions.find(
    x => String(x.id) === String(id)
  );

  if (!r) return;

  const modal = $("reqModal");

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  fillVehicleSelect("reqVehicle");

  setText("reqModalTitle", "Edit Requisition");

  setValue("reqId", r.id);
  setValue("reqNo", r.req_no);
  setValue("reqDate", r.req_date);
  setValue("reqRequestedBy", r.requested_by);
  setValue("reqVehicle", r.vehicle_id);
  setValue("reqItemDescription", r.item_description);
  setValue("reqQuantity", r.quantity);
  setValue("reqUnitCost", r.unit_cost);
  setValue("reqTotal", r.total_amount);
  setValue("reqStatus", r.status);
  setValue("reqExpenseType", r.expense_type);

  if ($("reqCategory"))
    setValue("reqCategory", r.expense_type);

  setValue("reqNotes", r.notes);
}

function calculateReqTotal() {
  const q =
    Number($("reqQuantity")?.value || 0);

  const cost =
    Number($("reqUnitCost")?.value || 0);

  setValue("reqTotal", q * cost);
}

async function saveReq(e) {
  e?.preventDefault();

  calculateReqTotal();

  const id = $("reqId")?.value;

  const expenseType =
    $("reqExpenseType")?.value ||
    $("reqCategory")?.value ||
    "Materials";

  const record = {
    req_no:
      $("reqNo")?.value.trim() || "",
    req_date:
      $("reqDate")?.value || today(),
    requested_by:
      $("reqRequestedBy")?.value.trim() || "",
    vehicle_id:
      $("reqVehicle")?.value || null,
    item_description:
      $("reqItemDescription")?.value.trim() || "",
    quantity:
      Number($("reqQuantity")?.value || 1),
    unit_cost:
      Number($("reqUnitCost")?.value || 0),
    total_amount:
      Number($("reqTotal")?.value || 0),
    status:
      $("reqStatus")?.value || "Pending",
    expense_type: expenseType,
    notes:
      $("reqNotes")?.value.trim() || null
  };

  const { error } = id
    ? await supabase
        .from("requisitions")
        .update(record)
        .eq("id", id)
    : await supabase
        .from("requisitions")
        .insert(record);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  closeModal("reqModal");
  toast("Requisition saved");
  await loadAllData();
}

async function deleteReq(id) {
  if (!confirm("Delete requisition?"))
    return;

  const { error } = await supabase
    .from("requisitions")
    .delete()
    .eq("id", id);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  toast("Deleted");
  await loadAllData();
}

function viewReq(id) {
  const r = requisitions.find(
    x => String(x.id) === String(id)
  );

  if (!r) return;

  preview(
    "Requisition",
    `
      <h2>${esc(r.req_no)}</h2>
      <p>Date: ${esc(r.req_date)}</p>
      <p>Requested By: ${esc(r.requested_by)}</p>
      <p>Vehicle: ${esc(vehicleName(r.vehicle_id))}</p>
      <p>Item: ${esc(r.item_description)}</p>
      <p>Quantity: ${esc(r.quantity)}</p>
      <p>Total: ${money(r.total_amount)}</p>
      <p>Status: ${esc(r.status)}</p>
      <p>Notes: ${esc(r.notes)}</p>
    `
  );
}

function shareReq(id) {
  const r = requisitions.find(
    x => String(x.id) === String(id)
  );

  if (!r) return;

  shareText(
    "Requisition",
    `Req No: ${r.req_no}
Date: ${r.req_date}
Requested By: ${r.requested_by}
Vehicle: ${vehicleName(r.vehicle_id)}
Item: ${r.item_description}
Quantity: ${r.quantity}
Total: ${money(r.total_amount)}
Status: ${r.status}`
  );
}

/* =========================================================
   INVOICES
   ========================================================= */

function renderInvoices() {
  const body = $("invoicesTableBody");
  if (!body) return;

  const search =
    ($("invoiceSearch")?.value || "")
      .toLowerCase()
      .trim();

  const status =
    $("invoiceStatusFilter")?.value || "";

  const rows = invoices.filter(i => {
    const text = [
      i.invoice_no,
      i.customer,
      i.job_description,
      vehicleName(i.vehicle_id),
      i.status
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search || text.includes(search)) &&
      (!status || i.status === status)
    );
  });

  body.innerHTML =
    rows
      .map(
        i => `
        <tr>
          <td>${esc(i.invoice_no)}</td>
          <td>${esc(i.invoice_date)}</td>
          <td>${esc(vehicleName(i.vehicle_id))}</td>
          <td>${esc(i.customer)}</td>
          <td>${money(i.subtotal)}</td>
          <td>${money(i.paid)}</td>
          <td>${money(i.balance)}</td>
          <td>${esc(i.status)}</td>
          <td>
            ${standardActions(
              i.id,
              "editInvoice",
              "viewInvoice",
              "shareInvoice",
              "deleteInvoice"
            )}
          </td>
        </tr>
      `
      )
      .join("") ||
    `<tr><td colspan="9">No invoices found</td></tr>`;
}

function openInvoiceModal(id = "") {
  const modal = $("invoiceModal");

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  fillVehicleSelect("invoiceVehicle");

  if (!id) {
    $("invoiceForm")?.reset();

    setValue("invoiceId", "");
    setValue("invoiceDate", today());
    setValue("invoiceSubtotal", 0);
    setValue("invoiceBalance", 0);

    setText("invoiceModalTitle", "Add Invoice");
  } else {
    editInvoice(id);
  }
}

function editInvoice(id) {
  const i = invoices.find(
    x => String(x.id) === String(id)
  );

  if (!i) return;

  const modal = $("invoiceModal");

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  fillVehicleSelect("invoiceVehicle");

  setText("invoiceModalTitle", "Edit Invoice");

  [
    ["invoiceId", i.id],
    ["invoiceNo", i.invoice_no],
    ["invoiceDate", i.invoice_date],
    ["invoiceVehicle", i.vehicle_id],
    ["invoiceCustomer", i.customer],
    ["invoiceJobDescription", i.job_description],
    ["invoiceLabour", i.labour],
    ["invoiceParts", i.parts],
    ["invoiceOther", i.other],
    ["invoiceSubtotal", i.subtotal],
    ["invoicePaid", i.paid],
    ["invoiceBalance", i.balance],
    ["invoiceStatus", i.status],
    ["invoiceNotes", i.notes]
  ].forEach(([a, b]) => setValue(a, b));
}

function calculateInvoice() {
  const labour =
    Number($("invoiceLabour")?.value || 0);

  const parts =
    Number($("invoiceParts")?.value || 0);

  const other =
    Number($("invoiceOther")?.value || 0);

  const paid =
    Number($("invoicePaid")?.value || 0);

  const subtotal =
    labour + parts + other;

  setValue("invoiceSubtotal", subtotal);
  setValue(
    "invoiceBalance",
    subtotal - paid
  );
}

async function saveInvoice(e) {
  e?.preventDefault();

  calculateInvoice();

  const id = $("invoiceId")?.value;

  const subtotal =
    Number($("invoiceSubtotal")?.value || 0);

  const paid =
    Number($("invoicePaid")?.value || 0);

  const record = {
    invoice_no:
      $("invoiceNo")?.value.trim() || "",
    invoice_date:
      $("invoiceDate")?.value || today(),
    vehicle_id:
      $("invoiceVehicle")?.value || null,
    customer:
      $("invoiceCustomer")?.value.trim() || "",
    job_description:
      $("invoiceJobDescription")?.value.trim() || "",
    labour:
      Number($("invoiceLabour")?.value || 0),
    parts:
      Number($("invoiceParts")?.value || 0),
    other:
      Number($("invoiceOther")?.value || 0),
    subtotal,
    paid,
    balance: subtotal - paid,
    status:
      $("invoiceStatus")?.value || "Pending",
    notes:
      $("invoiceNotes")?.value.trim() || null
  };

  const { error } = id
    ? await supabase
        .from("invoices")
        .update(record)
        .eq("id", id)
    : await supabase
        .from("invoices")
        .insert(record);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  closeModal("invoiceModal");
  toast("Invoice saved");
  await loadAllData();
}

async function deleteInvoice(id) {
  if (!confirm("Delete invoice?"))
    return;

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  toast("Invoice deleted");
  await loadAllData();
}

function viewInvoice(id) {
  const i = invoices.find(
    x => String(x.id) === String(id)
  );

  if (!i) return;

  preview(
    "Invoice",
    `
      <h2>Invoice ${esc(i.invoice_no)}</h2>
      <p>Date: ${esc(i.invoice_date)}</p>
      <p>Vehicle: ${esc(vehicleName(i.vehicle_id))}</p>
      <p>Customer: ${esc(i.customer)}</p>
      <p>Description: ${esc(i.job_description)}</p>
      <p>Labour: ${money(i.labour)}</p>
      <p>Parts: ${money(i.parts)}</p>
      <p>Other: ${money(i.other)}</p>
      <p><strong>Total: ${money(i.subtotal)}</strong></p>
      <p>Paid: ${money(i.paid)}</p>
      <p>Balance: ${money(i.balance)}</p>
      <p>Status: ${esc(i.status)}</p>
    `
  );
}

function shareInvoice(id) {
  const i = invoices.find(
    x => String(x.id) === String(id)
  );

  if (!i) return;

  shareText(
    `Invoice ${i.invoice_no}`,
    `Invoice: ${i.invoice_no}
Date: ${i.invoice_date}
Vehicle: ${vehicleName(i.vehicle_id)}
Customer: ${i.customer || ""}
Description: ${i.job_description || ""}
Total: ${money(i.subtotal)}
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

  const search =
    ($("gateSearch")?.value || "")
      .toLowerCase()
      .trim();

  const status =
    $("gateStatusFilter")?.value || "";

  const rows = gatePasses.filter(g => {
    const text = [
      g.gate_pass_no,
      g.registration,
      g.customer,
      g.released_to,
      g.status,
      vehicleName(g.vehicle_id)
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search || text.includes(search)) &&
      (!status || g.status === status)
    );
  });

  body.innerHTML =
    rows
      .map(
        g => `
        <tr>
          <td>${esc(g.gate_pass_no)}</td>
          <td>${esc(g.gate_pass_date)}</td>
          <td>
            ${esc(
              g.registration ||
              vehicleName(g.vehicle_id)
            )}
          </td>
          <td>${esc(g.customer)}</td>
          <td>${esc(g.released_to)}</td>
          <td>${money(g.paid)}</td>
          <td>${money(g.balance)}</td>
          <td>${esc(g.status)}</td>
          <td>
            ${standardActions(
              g.id,
              "editGatePass",
              "viewGatePass",
              "shareGatePass",
              "deleteGatePass"
            )}
          </td>
        </tr>
      `
      )
      .join("") ||
    `<tr><td colspan="9">No gate passes found</td></tr>`;
}

function openGatePassModal(id = "") {
  const modal = $("gatePassModal");

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  fillVehicleSelect("gateVehicle");

  if (!id) {
    $("gatePassForm")?.reset();

    setValue("gatePassId", "");
    setValue("gatePassDate", today());

    setText(
      "gatePassModalTitle",
      "Add Gate Pass"
    );
  } else {
    editGatePass(id);
  }
}

function editGatePass(id) {
  const g = gatePasses.find(
    x => String(x.id) === String(id)
  );

  if (!g) return;

  const modal = $("gatePassModal");

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  fillVehicleSelect("gateVehicle");

  setText(
    "gatePassModalTitle",
    "Edit Gate Pass"
  );

  [
    ["gatePassId", g.id],
    ["gatePassNo", g.gate_pass_no],
    ["gatePassDate", g.gate_pass_date],
    ["gateVehicle", g.vehicle_id],
    ["gateVehicleRegistration", g.registration],
    ["gateCustomer", g.customer],
    ["gateReleasedTo", g.released_to],
    ["gateReleasedContact", g.released_contact],
    ["gateInvoice", g.invoice_id],
    ["gatePaid", g.paid],
    ["gateBalance", g.balance],
    ["gateAuthorizedBy", g.authorized_by],
    ["gateStatus", g.status],
    ["gateNotes", g.notes]
  ].forEach(([a, b]) => setValue(a, b));
}

function updateGateVehicle() {
  const v =
    vehicleById($("gateVehicle")?.value);

  if (!v) return;

  setValue(
    "gateVehicleRegistration",
    v.registration
  );

  setValue("gateCustomer", v.customer);
  setValue("gateReleasedTo", v.released_to);
  setValue(
    "gateReleasedContact",
    v.released_contact
  );
}

async function saveGatePass(e) {
  e?.preventDefault();

  updateGateVehicle();

  const id = $("gatePassId")?.value;

  const record = {
    gate_pass_no:
      $("gatePassNo")?.value.trim() || "",
    gate_pass_date:
      $("gatePassDate")?.value || today(),
    vehicle_id:
      $("gateVehicle")?.value || null,
    registration:
      $("gateVehicleRegistration")
        ?.value.trim() || "",
    customer:
      $("gateCustomer")?.value.trim() || "",
    released_to:
      $("gateReleasedTo")?.value.trim() || "",
    released_contact:
      $("gateReleasedContact")
        ?.value.trim() || "",
    invoice_id:
      $("gateInvoice")?.value || null,
    paid:
      Number($("gatePaid")?.value || 0),
    balance:
      Number($("gateBalance")?.value || 0),
    authorized_by:
      $("gateAuthorizedBy")
        ?.value.trim() || "",
    status:
      $("gateStatus")?.value || "Pending",
    notes:
      $("gateNotes")?.value.trim() || null
  };

  const { error } = id
    ? await supabase
        .from("gate_passes")
        .update(record)
        .eq("id", id)
    : await supabase
        .from("gate_passes")
        .insert(record);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  closeModal("gatePassModal");
  toast("Gate Pass saved");
  await loadAllData();
}

async function deleteGatePass(id) {
  if (!confirm("Delete gate pass?"))
    return;

  const { error } = await supabase
    .from("gate_passes")
    .delete()
    .eq("id", id);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  toast("Gate Pass deleted");
  await loadAllData();
}

function gatePassHTML(g) {
  const company = COMPANY.crystal;

  return `
    <div class="print-document">

      <h1>${esc(company.name)}</h1>

      <p>
        ${esc(company.address)
          .replace(/\n/g, "<br>")}
      </p>

      <p>${esc(company.phone)}</p>

      <hr>

      <h2>VEHICLE GATE PASS</h2>

      <p>
        <strong>Gate Pass No:</strong>
        ${esc(g.gate_pass_no)}
      </p>

      <p>
        <strong>Date:</strong>
        ${esc(g.gate_pass_date)}
      </p>

      <p>
        <strong>Registration / Chassis:</strong>
        ${esc(g.registration)}
      </p>

      <p>
        <strong>Customer:</strong>
        ${esc(g.customer)}
      </p>

      <p>
        <strong>Released To:</strong>
        ${esc(g.released_to)}
      </p>

      <p>
        <strong>Contact:</strong>
        ${esc(g.released_contact)}
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
        <strong>Authorized By:</strong>
        ${esc(g.authorized_by)}
      </p>

      <p>
        <strong>Status:</strong>
        ${esc(g.status)}
      </p>

      <p>
        <strong>Notes:</strong>
        ${esc(g.notes)}
      </p>

    </div>
  `;
}

function viewGatePass(id) {
  const g = gatePasses.find(
    x => String(x.id) === String(id)
  );

  if (!g) return;

  preview(
    "Gate Pass",
    gatePassHTML(g)
  );
}

function shareGatePass(id) {
  const g = gatePasses.find(
    x => String(x.id) === String(id)
  );

  if (!g) return;

  shareText(
    `Gate Pass ${g.gate_pass_no}`,
    `${COMPANY.crystal.name}
${COMPANY.crystal.address.replace(/\n/g, " | ")}
${COMPANY.crystal.phone}

Gate Pass: ${g.gate_pass_no}
Date: ${g.gate_pass_date}
Registration: ${g.registration}
Customer: ${g.customer}
Released To: ${g.released_to}
Contact: ${g.released_contact}
Paid: ${money(g.paid)}
Balance: ${money(g.balance)}
Authorized By: ${g.authorized_by}
Status: ${g.status}`
  );
}

/* =========================================================
   ESTIMATES
   ========================================================= */

function injectEstimateUI() {
  if ($("estimates")) return;

  const nav =
    document.querySelector(
      "[data-section='gatePasses']"
    )?.parentElement;

  if (
    nav &&
    !document.querySelector(
      "[data-section='estimates']"
    )
  ) {
    const b =
      document.createElement("button");

    b.type = "button";
    b.className = "nav-btn";
    b.dataset.section = "estimates";
    b.textContent = "Estimates";
    b.onclick = () =>
      showSection("estimates");

    nav.appendChild(b);
  }

  const main =
    $("gatePasses")?.parentElement ||
    document.querySelector("main");

  if (!main) return;

  const section =
    document.createElement("section");

  section.id = "estimates";
  section.className =
    "section app-section";
  section.style.display = "none";

  section.innerHTML = `
    <div class="section-header">

      <div>
        <h2>Estimates</h2>
        <p>
          Repair quotations and estimates
        </p>
      </div>

      <button
        type="button"
        onclick="openEstimateModal()">
        ＋ Estimate
      </button>

    </div>

    <div class="toolbar">
      <input
        id="estimateSearch"
        placeholder="Search estimates...">
    </div>

    <div class="table-wrap">
      <table>

        <thead>
          <tr>
            <th>No.</th>
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

    <div id="estimateModal" class="modal">

      <div class="modal-content">

        <div class="modal-header">

          <h2 id="estimateModalTitle">
            Add Estimate
          </h2>

          <button
            type="button"
            onclick="closeModal('estimateModal')">
            ✕
          </button>

        </div>

        <form id="estimateForm">

          <input
            type="hidden"
            id="estimateId">

          <label>Estimate No.</label>
          <input id="estimateNo" required>

          <label>Date</label>
          <input
            id="estimateDate"
            type="date">

          <label>Company</label>

          <select id="estimateCompany">

            <option value="crystal">
              CRYSTAL MOTORS (K) LTD
            </option>

            <option value="quarry">
              QUARRY ROUTE MOTORS LTD
            </option>

          </select>

          <label>Vehicle</label>
          <select id="estimateVehicle"></select>

          <label>Customer</label>
          <input id="estimateCustomer">

          <label>Customer Phone</label>
          <input id="estimateCustomerPhone">

          <label>Vehicle Model</label>
          <input id="estimateModel">

          <label>Chassis No.</label>
          <input id="estimateChassis">

          <label>Items</label>

          <textarea
            id="estimateItems"
            placeholder="Description - Amount
Body repair - 50000
Painting - 30000"></textarea>

          <label>VAT %</label>
          <input
            id="estimateVatRate"
            type="number"
            value="16">

          <label>Notes</label>
          <textarea id="estimateNotes"></textarea>

          <div class="modal-actions">

            <button
              type="submit"
              class="icon-save"
              title="Save">
              💾
            </button>

            <button
              type="button"
              class="icon-cancel"
              onclick="closeModal('estimateModal')"
              title="Cancel">
              ✖️
            </button>

          </div>

        </form>
      </div>
    </div>
  `;

  main.appendChild(section);

  $("estimateForm")
    ?.addEventListener(
      "submit",
      saveEstimate
    );

  $("estimateSearch")
    ?.addEventListener(
      "input",
      renderEstimates
    );
}

function parseEstimateItems(text) {
  return String(text || "")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean)
    .map(line => {
      const parts =
        line.split(/\s*[-–—:]\s*/);

      const amount = Number(
        String(parts.pop() || "0")
          .replace(/,/g, "")
      );

      return {
        description: parts.join(" - "),
        amount: isNaN(amount) ? 0 : amount
      };
    });
}

function estimateItemsText(items) {
  return (Array.isArray(items) ? items : [])
    .map(
      i =>
        `${i.description || ""} - ${
          i.amount || 0
        }`
    )
    .join("\n");
}

function renderEstimates() {
  const body = $("estimatesTableBody");
  if (!body) return;

  const search =
    ($("estimateSearch")?.value || "")
      .toLowerCase()
      .trim();

  const rows = estimates.filter(e =>
    [
      e.estimate_no,
      e.company_name,
      e.customer,
      e.registration
    ]
      .join(" ")
      .toLowerCase()
      .includes(search)
  );

  body.innerHTML =
    rows
      .map(
        e => `
        <tr>
          <td>${esc(e.estimate_no)}</td>
          <td>${esc(e.estimate_date)}</td>
          <td>${esc(e.company_name)}</td>
          <td>
            ${esc(
              e.registration ||
              vehicleName(e.vehicle_id)
            )}
          </td>
          <td>${esc(e.customer)}</td>
          <td>${money(e.total_amount)}</td>
          <td>
            ${standardActions(
              e.id,
              "editEstimate",
              "viewEstimate",
              "shareEstimate",
              "deleteEstimate"
            )}
          </td>
        </tr>
      `
      )
      .join("") ||
    `<tr><td colspan="7">No estimates found</td></tr>`;
}

function openEstimateModal(id = "") {
  injectEstimateUI();

  const modal = $("estimateModal");

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  fillVehicleSelect("estimateVehicle");

  if (!id) {
    $("estimateForm")?.reset();

    setValue("estimateId", "");
    setValue("estimateDate", today());
    setValue("estimateVatRate", 16);

    setText(
      "estimateModalTitle",
      "Add Estimate"
    );
  } else {
    editEstimate(id);
  }
}

function editEstimate(id) {
  const e = estimates.find(
    x => String(x.id) === String(id)
  );

  if (!e) return;

  const modal = $("estimateModal");

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  fillVehicleSelect("estimateVehicle");

  setText(
    "estimateModalTitle",
    "Edit Estimate"
  );

  setValue("estimateId", e.id);
  setValue("estimateNo", e.estimate_no);
  setValue("estimateDate", e.estimate_date);

  setValue(
    "estimateCompany",
    e.company_name === COMPANY.quarry.name
      ? "quarry"
      : "crystal"
  );

  setValue(
    "estimateVehicle",
    e.vehicle_id
  );

  setValue(
    "estimateCustomer",
    e.customer
  );

  setValue(
    "estimateCustomerPhone",
    e.customer_phone
  );

  setValue(
    "estimateModel",
    e.vehicle_model
  );

  setValue(
    "estimateChassis",
    e.chassis_no
  );

  setValue(
    "estimateItems",
    estimateItemsText(e.items)
  );

  setValue(
    "estimateVatRate",
    e.vat_rate
  );

  setValue(
    "estimateNotes",
    e.notes
  );
}

async function saveEstimate(e) {
  e?.preventDefault();

  const id =
    $("estimateId")?.value;

  const company =
    COMPANY[
      $("estimateCompany")?.value ||
      "crystal"
    ];

  const vehicle =
    vehicleById(
      $("estimateVehicle")?.value
    );

  const items =
    parseEstimateItems(
      $("estimateItems")?.value
    );

  const subtotal =
    items.reduce(
      (a, i) =>
        a + Number(i.amount || 0),
      0
    );

  const vatRate =
    Number(
      $("estimateVatRate")?.value || 0
    );

  const vatAmount =
    subtotal * vatRate / 100;

  const total =
    subtotal + vatAmount;

  const record = {
    estimate_no:
      $("estimateNo")?.value.trim() || "",

    estimate_date:
      $("estimateDate")?.value || today(),

    company_name:
      company.name,

    company_address:
      company.address,

    company_phone:
      company.phone,

    company_email:
      company.email || null,

    customer:
      $("estimateCustomer")?.value.trim() ||
      null,

    customer_phone:
      $("estimateCustomerPhone")
        ?.value.trim() || null,

    customer_address:
      null,

    vehicle_id:
      $("estimateVehicle")?.value || null,

    registration:
      vehicle?.registration || null,

    chassis_no:
      $("estimateChassis")?.value.trim() ||
      null,

    vehicle_year:
      vehicle?.model_year || null,

    vehicle_model:
      $("estimateModel")?.value.trim() ||
      vehicle?.model ||
      null,

    subtotal,

    vat_rate:
      vatRate,

    vat_amount:
      vatAmount,

    total_amount:
      total,

    notes:
      $("estimateNotes")?.value.trim() ||
      null,

    items
  };

  const { error } = id
    ? await supabase
        .from("estimates")
        .update(record)
        .eq("id", id)
    : await supabase
        .from("estimates")
        .insert(record);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  closeModal("estimateModal");
  toast("Estimate saved");
  await loadAllData();
}

async function deleteEstimate(id) {
  if (!confirm("Delete estimate?"))
    return;

  const { error } = await supabase
    .from("estimates")
    .delete()
    .eq("id", id);

  if (error) {
    toast(errorMessage(error));
    return;
  }

  toast("Estimate deleted");
  await loadAllData();
}

function estimateHTML(e) {
  return `
    <div class="print-document">

      <h1>${esc(e.company_name)}</h1>

      <p>
        ${esc(e.company_address || "")
          .replace(/\n/g, "<br>")}
      </p>

      <p>${esc(e.company_phone || "")}</p>

      ${
        e.company_email
          ? `<p>${esc(e.company_email)}</p>`
          : ""
      }

      <hr>

      <h2>REPAIR ESTIMATE</h2>

      <p>
        <strong>Estimate No:</strong>
        ${esc(e.estimate_no)}
      </p>

      <p>
        <strong>Date:</strong>
        ${esc(e.estimate_date)}
      </p>

      <p>
        <strong>Customer:</strong>
        ${esc(e.customer)}
      </p>

      <p>
        <strong>Vehicle:</strong>
        ${esc(e.registration)}
      </p>

      <p>
        <strong>Model:</strong>
        ${esc(e.vehicle_model)}
      </p>

      <p>
        <strong>Chassis:</strong>
        ${esc(e.chassis_no)}
      </p>

      <table>

        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>

          ${(e.items || [])
            .map(
              i => `
              <tr>
                <td>${esc(i.description)}</td>
                <td>${money(i.amount)}</td>
              </tr>
            `
            )
            .join("")}

        </tbody>

        <tfoot>

          <tr>
            <th>Subtotal</th>
            <th>${money(e.subtotal)}</th>
          </tr>

          <tr>
            <th>VAT ${e.vat_rate}%</th>
            <th>${money(e.vat_amount)}</th>
          </tr>

          <tr>
            <th>TOTAL</th>
            <th>${money(e.total_amount)}</th>
          </tr>

        </tfoot>

      </table>

      <p>
        <strong>Notes:</strong>
        ${esc(e.notes)}
      </p>

    </div>
  `;
}

function viewEstimate(id) {
  const e = estimates.find(
    x => String(x.id) === String(id)
  );

  if (!e) return;

  preview(
    "Estimate",
    estimateHTML(e)
  );
}

function shareEstimate(id) {
  const e = estimates.find(
    x => String(x.id) === String(id)
  );

  if (!e) return;

  shareText(
    `Estimate ${e.estimate_no}`,
    `${e.company_name}
Estimate: ${e.estimate_no}
Date: ${e.estimate_date}
Customer: ${e.customer || ""}
Vehicle: ${e.registration || ""}
Subtotal: ${money(e.subtotal)}
VAT: ${money(e.vat_amount)}
TOTAL: ${money(e.total_amount)}`
  );
}

/* =========================================================
   VEHICLE SELECTS
   ========================================================= */

function fillVehicleSelect(id) {
  const el = $(id);
  if (!el) return;

  const current = el.value;

  el.innerHTML =
    `<option value="">-- Select Vehicle --</option>` +
    vehicles
      .map(
        v => `
          <option value="${esc(v.id)}">
            ${esc(v.registration)}
            ${
              v.customer
                ? " — " + esc(v.customer)
                : ""
            }
          </option>
        `
      )
      .join("");

  if (current) {
    el.value = current;
  }
}

/* =========================================================
   PREVIEW
   ========================================================= */

function preview(title, html) {
  const modal = $("previewModal");

  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }

  setText("previewTitle", title);

  if ($("previewContent")) {
    $("previewContent").innerHTML = html;
  }
}

function printCurrentPreview() {
  printElement(
    "previewContent",
    $("previewTitle")?.textContent ||
      "Print"
  );
}

/* =========================================================
   PRINT
   ========================================================= */

function printElement(
  id,
  title = "Garage Operations Pro"
) {
  const el = $(id);
  if (!el) return;

  const win = window.open("", "_blank");

  if (!win) {
    toast("Allow pop-ups to print");
    return;
  }

  win.document.write(`
    <!doctype html>

    <html>

    <head>

      <title>${esc(title)}</title>

      <meta
        name="viewport"
        content="width=device-width,initial-scale=1">

      <style>

        body{
          font-family:Arial,sans-serif;
          padding:20px;
          color:#111;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:15px;
        }

        th,td{
          border:1px solid #999;
          padding:8px;
          text-align:left;
        }

        th{
          font-weight:bold;
        }

        h1,h2,h3{
          text-align:center;
        }

        @media print{
          body{
            padding:8px;
          }
        }

      </style>

    </head>

    <body>
      ${el.innerHTML}
    </body>

    </html>
  `);

  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
  }, 400);
}

function printVehicles() {
  printTable(
    "vehiclesTableBody",
    "Vehicles Report"
  );
}

function printExpenses() {
  printTable(
    "expensesTableBody",
    "Expenses Report"
  );
}

function printPettyCash() {
  printTable(
    "pettyTableBody",
    "Petty Cash Report"
  );
}

function printRequisitions() {
  printTable(
    "requisitionsTableBody",
    "Requisitions Report"
  );
}

function printInvoices() {
  printTable(
    "invoicesTableBody",
    "Invoices Report"
  );
}

function printGatePasses() {
  printTable(
    "gatePassesTableBody",
    "Gate Passes Report"
  );
}

function printTable(bodyId, title) {
  const body = $(bodyId);
  if (!body) return;

  const table =
    body.closest("table");

  if (!table) return;

  const win =
    window.open("", "_blank");

  if (!win) {
    toast("Allow pop-ups to print");
    return;
  }

  win.document.write(`
    <html>

    <head>

      <title>${esc(title)}</title>

      <style>

        body{
          font-family:Arial;
          padding:20px;
        }

        table{
          width:100%;
          border-collapse:collapse;
        }

        th,td{
          border:1px solid #999;
          padding:7px;
        }

        th{
          background:#eee;
        }

        .table-actions{
          display:none!important;
        }

        button{
          display:none!important;
        }

      </style>

    </head>

    <body>

      <h2>${esc(title)}</h2>

      ${table.outerHTML}

    </body>

    </html>
  `);

  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
  }, 400);
}

/* =========================================================
   SHARE
   ========================================================= */

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
      toast("Copied to clipboard");
      return;
    }

    prompt(
      "Copy this text:",
      text
    );

  } catch (e) {
    if (e?.name !== "AbortError") {
      try {
        prompt(
          "Copy this text:",
          text
        );
      } catch {
        toast("Share failed");
      }
    }
  }
}

/* =========================================================
   MODALS
   ========================================================= */

function closeModal(id) {
  const el = $(id);
  if (!el) return;

  el.classList.remove("active");
  el.style.display = "none";
}

function closeAllModals() {
  document
    .querySelectorAll(".modal")
    .forEach(m => {
      m.classList.remove("active");
      m.style.display = "none";
    });
}

/* =========================================================
   USER
   ========================================================= */

function setUserDisplay() {
  const user =
    sessionStorage.getItem("garageUser") ||
    sessionStorage.getItem("username") ||
    "User";

  if ($("sidebarUser"))
    $("sidebarUser").textContent = user;

  if ($("welcomeUser"))
    $("welcomeUser").textContent = user;
}

/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {
  $("vehicleForm")
    ?.addEventListener(
      "submit",
      saveVehicle
    );

  $("expenseForm")
    ?.addEventListener(
      "submit",
      saveExpense
    );

  $("pettyForm")
    ?.addEventListener(
      "submit",
      savePetty
    );

  $("reqForm")
    ?.addEventListener(
      "submit",
      saveReq
    );

  $("invoiceForm")
    ?.addEventListener(
      "submit",
      saveInvoice
    );

  $("gatePassForm")
    ?.addEventListener(
      "submit",
      saveGatePass
    );

  $("reqQuantity")
    ?.addEventListener(
      "input",
      calculateReqTotal
    );

  $("reqUnitCost")
    ?.addEventListener(
      "input",
      calculateReqTotal
    );

  [
    "invoiceLabour",
    "invoiceParts",
    "invoiceOther",
    "invoicePaid"
  ].forEach(id =>
    $(id)?.addEventListener(
      "input",
      calculateInvoice
    )
  );

  $("gateVehicle")
    ?.addEventListener(
      "change",
      updateGateVehicle
    );

  [
    ["vehicleSearch", renderVehicles],
    ["vehicleStatusFilter", renderVehicles],
    ["expenseSearch", renderExpenses],
    ["expenseCategoryFilter", renderExpenses],
    ["pettySearch", renderPettyCash],
    ["pettyCategoryFilter", renderPettyCash],
    ["reqSearch", renderRequisitions],
    ["reqStatusFilter", renderRequisitions],
    ["invoiceSearch", renderInvoices],
    ["invoiceStatusFilter", renderInvoices],
    ["gateSearch", renderGatePasses],
    ["gateStatusFilter", renderGatePasses]
  ].forEach(([id, fn]) => {
    $(id)?.addEventListener("input", fn);
    $(id)?.addEventListener("change", fn);
  });

  document.addEventListener(
    "keydown",
    e => {
      if (e.key === "Escape")
        closeAllModals();
    }
  );

  document
    .querySelectorAll("[data-section]")
    .forEach(el => {
      el.addEventListener(
        "click",
        e => {
          if (
            el.tagName === "BUTTON" ||
            el.tagName === "A"
          ) {
            e.preventDefault();
          }

          const section =
            el.dataset.section;

          if (section)
            showSection(section);
        }
      );
    });
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

  injectEstimateUI();
  renderEstimates();

  setupDashboardCards();
}

/* =========================================================
   START
   ========================================================= */

async function startApp() {
  injectStyles();
  injectEstimateUI();
  setUserDisplay();
  setupEvents();

  showSection("dashboard");

  await loadAllData();
}

document.addEventListener(
  "DOMContentLoaded",
  startApp
);

/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

Object.assign(window, {

  supabase,

  showSection,

  openVehicleModal,
  editVehicle,
  saveVehicle,
  deleteVehicle,
  viewVehicle,
  viewVehicleExpenses,
  shareVehicle,
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

  printVehicles,
  printExpenses,
  printPettyCash,
  printRequisitions,
  printInvoices,
  printGatePasses,

  printCurrentPreview,
  closeModal,
  closeAllModals
});
