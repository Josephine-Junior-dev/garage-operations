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

function calculateStorageDays(dateIn, dateOut = null) {
  if (!dateIn) return 0;

  const start = new Date(`${String(dateIn).slice(0, 10)}T00:00:00`);
  const end = dateOut
    ? new Date(`${String(dateOut).slice(0, 10)}T00:00:00`)
    : new Date(`${today()}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const diff = Math.floor(
    (end.getTime() - start.getTime()) / 86400000
  );

  return Math.max(0, diff);
}

function normalizeJobType(value) {
  const jobType = String(value || "").trim();

  return ["Repair", "Storage"].includes(jobType)
    ? jobType
    : "Repair";
}

function normalizeVehicleStatus(value) {
  const status = String(value || "").trim();

  return [
    "Storage",
    "Under Repair",
    "Completed",
    "Released"
  ].includes(status)
    ? status
    : "Under Repair";
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
          ${escapeHtml(normalizeJobType(vehicle.job_type))}
        </span>
      </div>

      ${statusBadge(normalizeVehicleStatus(vehicle.status))}
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
      v.model,
      v.model_year,
      v.color,
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
        <td colspan="10" style="text-align:center;padding:30px;color:#64748b">
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

        <td>${escapeHtml(normalizeJobType(v.job_type))}</td>

        <td>${statusBadge(normalizeVehicleStatus(v.status))}</td>

        <td>
          ${
            normalizeJobType(v.job_type) === "Storage" ||
            normalizeVehicleStatus(v.status) === "Storage"
              ? calculateStorageDays(v.date_in, v.date_out)
              : "—"
          }
        </td>

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

  if ($("vehicleModel")) {
    $("vehicleModel").value = "";
  }

  if ($("vehicleModelYear")) {
    $("vehicleModelYear").value = "";
  }

  if ($("vehicleColor")) {
    $("vehicleColor").value = "";
  }

  if ($("vehicleStorageDays")) {
    $("vehicleStorageDays").value = 0;
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

    if ($("vehicleModel")) {
      $("vehicleModel").value =
        vehicle.model || "";
    }

    if ($("vehicleModelYear")) {
      $("vehicleModelYear").value =
        vehicle.model_year || "";
    }

    if ($("vehicleColor")) {
      $("vehicleColor").value =
        vehicle.color || "";
    }

    $("vehicleDateIn").value =
      vehicle.date_in || "";
    $("vehicleDateOut").value =
      vehicle.date_out || "";

    if ($("vehicleStorageDays")) {
      $("vehicleStorageDays").value =
        calculateStorageDays(vehicle.date_in, vehicle.date_out);
    }

    $("vehicleJobType").value =
      normalizeJobType(vehicle.job_type);
    $("vehicleStatus").value =
      normalizeVehicleStatus(vehicle.status);
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

async function vehicleAlreadyExists(registration, editingId = "") {
  const reg = String(registration || "").trim().toUpperCase();
  if (!reg) return false;

  const localDuplicate = vehicles.some(v => {
    const existingReg = String(v.registration || "").trim().toUpperCase();
    const sameVehicle = editingId && String(v.id) === String(editingId);
    return existingReg === reg && !sameVehicle;
  });

  if (localDuplicate) return true;

  let query = supabase
    .from("vehicles")
    .select("id, registration")
    .ilike("registration", reg)
    .limit(1);

  if (editingId) query = query.neq("id", editingId);

  const { data, error } = await query;

  if (error) {
    console.error("Duplicate vehicle check failed:", error);
    throw new Error("Could not verify vehicle registration.");
  }

  return Array.isArray(data) && data.length > 0;
}


async function saveVehicle(event) {
  event.preventDefault();

  const registration =
    $("vehicleRegistration")?.value.trim();

  const customer =
    $("vehicleCustomer")?.value.trim();

  const vehicleId =
    $("vehicleId")?.value.trim() ||
    editingVehicleId ||
    "";

  if (!registration || !customer) {
    showToast(
      "Registration / Chassis No. and customer are required.",
      "error"
    );
    return;
  }

  try {
    if (await vehicleAlreadyExists(registration, vehicleId)) {
      showToast(
        "This Registration / Chassis No. already exists.",
        "error"
      );
      $("vehicleRegistration")?.focus();
      return;
    }
  } catch (error) {
    showToast(error.message || "Could not verify vehicle registration.", "error");
    return;
  }

  const payload = {
    registration: registration.toUpperCase(),
    customer,
    model:
      $("vehicleModel")?.value.trim() || null,
    model_year:
      number($("vehicleModelYear")?.value) || null,
    color:
      $("vehicleColor")?.value.trim() || null,
    date_in:
      $("vehicleDateIn")?.value || null,
    date_out:
      $("vehicleDateOut")?.value || null,
    job_type:
      normalizeJobType($("vehicleJobType")?.value),
    status:
      normalizeVehicleStatus($("vehicleStatus")?.value),
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
             number($("reqQuantity")?.value);

  const unitCost =
    number($("reqUnitCost")?.value);

  const totalAmount =
    quantity * unitCost;

  const payload = {
    req_no: reqNo,
    req_date:
      $("reqDate")?.value || today(),
    requested_by:
      $("reqRequestedBy")?.value.trim() || "",
    vehicle_id:
      $("reqVehicle")?.value || null,
    item_description: description,
    quantity,
    unit_cost: unitCost,
    total_amount: totalAmount,
    status:
      $("reqStatus")?.value || "Pending",
    category:
      $("reqCategory")?.value.trim() || null,
    expense_type:
      $("reqExpenseType")?.value.trim() || null,
    notes:
      $("reqNotes")?.value.trim() || null
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

  const rows =
    getRequisitionRows(reqNo);

  if (!rows.length) {
    showToast(
      "Requisition not found.",
      "error"
    );
    return;
  }

  const vehicle =
    getRequisitionVehicle(reqNo);

  const finance =
    requisitionFinance(reqNo);

  const container =
    $("reqPreviewContent");

  if (!container) {
    printRequisition(reqNo);
    return;
  }

  container.innerHTML = `
    <div class="print-document">

      <div class="print-header">

        <div>
          <h1>GARAGE OPERATIONS PRO</h1>
          <div>
            Vehicle • Finance • Workshop Operations
          </div>
        </div>

        <div class="document-title">
          REQUISITION
        </div>

      </div>

      <div class="document-meta">

        <div>
          <strong>Requisition No.</strong><br>
          ${escapeHtml(reqNo)}
        </div>

        <div>
          <strong>Date</strong><br>
          ${escapeHtml(
            formatDate(rows[0].req_date)
          )}
        </div>

        <div>
          <strong>Requested By</strong><br>
          ${escapeHtml(
            rows[0].requested_by || ""
          )}
        </div>

      </div>

      ${
        vehicle
          ? `
            <div class="document-section">

              <h3>Vehicle</h3>

              <div class="document-grid">

                <div>
                  <strong>Registration / Chassis No.</strong><br>
                  ${escapeHtml(
                    vehicle.registration || ""
                  )}
                </div>

                <div>
                  <strong>Customer</strong><br>
                  ${escapeHtml(
                    vehicle.customer || ""
                  )}
                </div>

                <div>
                  <strong>Model</strong><br>
                  ${escapeHtml(
                    vehicle.model || ""
                  )}
                </div>

                <div>
                  <strong>Year</strong><br>
                  ${escapeHtml(
                    vehicle.model_year || ""
                  )}
                </div>

                <div>
                  <strong>Colour</strong><br>
                  ${escapeHtml(
                    vehicle.color || ""
                  )}
                </div>

              </div>

            </div>
          `
          : ""
      }

      <table class="print-table">

        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Cost</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          ${
            rows.map((row, index) => `
              <tr>

                <td>${index + 1}</td>

                <td>
                  ${escapeHtml(
                    row.item_description || ""
                  )}
                </td>

                <td>
                  ${number(row.quantity)}
                </td>

                <td>
                  ${money(row.unit_cost)}
                </td>

                <td>
                  ${money(row.total_amount)}
                </td>

                <td>
                  ${escapeHtml(
                    row.status || ""
                  )}
                </td>

              </tr>
            `).join("")
          }

        </tbody>

      </table>

      <div class="document-total">

        <div>
          <strong>REQUISITION TOTAL</strong>
        </div>

        <div>
          <strong>
            ${money(finance.total)}
          </strong>
        </div>

      </div>

      ${
        rows[0].notes
          ? `
            <div class="document-section">
              <strong>Notes</strong>
              <p>
                ${escapeHtml(rows[0].notes)}
              </p>
            </div>
          `
          : ""
      }

      <div class="signature-row">

        <div>
          Requested By:
          ______________________
        </div>

        <div>
          Approved By:
          ______________________
        </div>

      </div>

    </div>
  `;

  openModal("reqPreviewModal");
}

function printRequisition(reqNo) {
  const rows =
    getRequisitionRows(reqNo);

  if (!rows.length) return;

  const vehicle =
    getRequisitionVehicle(reqNo);

  const total =
    requisitionTotal(reqNo);

  const html = `
<!DOCTYPE html>
<html>
<head>

<meta charset="UTF-8">

<title>Requisition ${escapeHtml(reqNo)}</title>

<style>

body{
  font-family:Arial,sans-serif;
  color:#111827;
  margin:30px;
}

h1{
  margin:0;
  font-size:24px;
}

.header{
  display:flex;
  justify-content:space-between;
  border-bottom:2px solid #111827;
  padding-bottom:15px;
  margin-bottom:20px;
}

.title{
  font-size:20px;
  font-weight:700;
}

.meta{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:15px;
  margin-bottom:20px;
}

table{
  width:100%;
  border-collapse:collapse;
}

th,td{
  border:1px solid #cbd5e1;
  padding:9px;
  text-align:left;
}

th{
  background:#f1f5f9;
}

.total{
  display:flex;
  justify-content:flex-end;
  margin-top:15px;
  font-size:18px;
}

.signatures{
  display:flex;
  justify-content:space-between;
  margin-top:70px;
}

@media print{
  body{
    margin:15mm;
  }
}

</style>

</head>

<body>

<div class="header">

  <div>
    <h1>GARAGE OPERATIONS PRO</h1>
    <div>Vehicle • Finance • Workshop Operations</div>
  </div>

  <div class="title">
    REQUISITION
  </div>

</div>

<div class="meta">

  <div>
    <strong>Requisition No.</strong><br>
    ${escapeHtml(reqNo)}
  </div>

  <div>
    <strong>Date</strong><br>
    ${escapeHtml(
      formatDate(rows[0].req_date)
    )}
  </div>

  <div>
    <strong>Requested By</strong><br>
    ${escapeHtml(
      rows[0].requested_by || ""
    )}
  </div>

</div>

${
  vehicle
    ? `
      <p>
        <strong>Vehicle:</strong>
        ${escapeHtml(
          vehicle.registration || ""
        )}
        —
        ${escapeHtml(
          vehicle.customer || ""
        )}
      </p>
    `
    : ""
}

<table>

<thead>
<tr>
  <th>#</th>
  <th>Description</th>
  <th>Qty</th>
  <th>Unit Cost</th>
  <th>Total</th>
  <th>Status</th>
</tr>
</thead>

<tbody>

${
  rows.map((row,index) => `
    <tr>
      <td>${index + 1}</td>
      <td>
        ${escapeHtml(
          row.item_description || ""
        )}
      </td>
      <td>${number(row.quantity)}</td>
      <td>${money(row.unit_cost)}</td>
      <td>${money(row.total_amount)}</td>
      <td>${escapeHtml(row.status || "")}</td>
    </tr>
  `).join("")
}

</tbody>

</table>

<div class="total">
  <strong>
    TOTAL: ${money(total)}
  </strong>
</div>

<div class="signatures">

  <div>
    Requested By:<br><br>
    __________________________
  </div>

  <div>
    Approved By:<br><br>
    __________________________
  </div>

</div>

<script>
window.onload=function(){
  window.print();
};
</script>

</body>
</html>
  `;

  const win =
    window.open(
      "",
      "_blank",
      "width=1000,height=800"
    );

  if (!win) {
    showToast(
      "Please allow pop-ups to print.",
      "error"
    );
    return;
  }

  win.document.write(html);
  win.document.close();
}


/* =========================================================
   VEHICLE EXPENSE SUMMARY
   ========================================================= */

function vehicleExpenses(vehicleId) {
  return expenses.filter(
    e =>
      String(e.vehicle_id) ===
      String(vehicleId)
  );
}

function vehicleExpenseTotal(vehicleId) {
  return vehicleExpenses(vehicleId)
    .reduce(
      (sum, e) =>
        sum + number(e.amount),
      0
    );
}

function vehicleExpenseCategoryTotal(
  vehicleId,
  category
) {
  return vehicleExpenses(vehicleId)
    .filter(e =>
      String(e.category || "")
        .trim()
        .toLowerCase() ===
      String(category || "")
        .trim()
        .toLowerCase()
    )
    .reduce(
      (sum, e) =>
        sum + number(e.amount),
      0
    );
}

function openVehicleExpensePreview(vehicleId) {
  selectedVehicleExpenseId =
    vehicleId;

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
    vehicleExpenses(vehicleId);

  const total =
    vehicleExpenseTotal(vehicleId);

  const parts =
    vehicleExpenseCategoryTotal(
      vehicleId,
      "Parts"
    );

  const materials =
    vehicleExpenseCategoryTotal(
      vehicleId,
      "Materials"
    );

  const labour =
    vehicleExpenseCategoryTotal(
      vehicleId,
      "Labour"
    );

  const transport =
    vehicleExpenseCategoryTotal(
      vehicleId,
      "Transport"
    );

  const other =
    vehicleExpenseCategoryTotal(
      vehicleId,
      "Other"
    );

  const container =
    $("vehicleExpensePreviewContent");

  if (!container) {
    printVehicleExpenseReport(
      vehicleId
    );
    return;
  }

  container.innerHTML = `
    <div class="print-document">

      <div class="print-header">

        <div>
          <h1>GARAGE OPERATIONS PRO</h1>

          <div>
            Vehicle • Finance • Workshop Operations
          </div>
        </div>

        <div class="document-title">
          VEHICLE EXPENSE REPORT
        </div>

      </div>

      <div class="document-section">

        <div class="document-grid">

          <div>
            <strong>
              Registration / Chassis No.
            </strong><br>
            ${escapeHtml(
              vehicle.registration || ""
            )}
          </div>

          <div>
            <strong>Customer</strong><br>
            ${escapeHtml(
              vehicle.customer || ""
            )}
          </div>

          <div>
            <strong>Model</strong><br>
            ${escapeHtml(
              vehicle.model || ""
            )}
          </div>

          <div>
            <strong>Year</strong><br>
            ${escapeHtml(
              vehicle.model_year || ""
            )}
          </div>

          <div>
            <strong>Colour</strong><br>
            ${escapeHtml(
              vehicle.color || ""
            )}
          </div>

          <div>
            <strong>Date In</strong><br>
            ${escapeHtml(
              formatDate(vehicle.date_in)
            )}
          </div>

          <div>
            <strong>Date Out</strong><br>
            ${escapeHtml(
              formatDate(vehicle.date_out)
            )}
          </div>

        </div>

      </div>

      <table class="print-table">

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
              ? rows.map(row => `
                <tr>

                  <td>
                    ${escapeHtml(
                      formatDate(
                        row.expense_date
                      )
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      row.description || ""
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      row.category || ""
                    )}
                  </td>

                  <td>
                    ${money(row.amount)}
                  </td>

                </tr>
              `).join("")
              : `
                <tr>
                  <td colspan="4"
                    style="text-align:center">
                    No expenses recorded.
                  </td>
                </tr>
              `
          }

        </tbody>

      </table>

      <div class="expense-summary">

        <div>
          Parts
          <strong>${money(parts)}</strong>
        </div>

        <div>
          Materials
          <strong>${money(materials)}</strong>
        </div>

        <div>
          Labour
          <strong>${money(labour)}</strong>
        </div>

        <div>
          Transport
          <strong>${money(transport)}</strong>
        </div>

        <div>
          Other
          <strong>${money(other)}</strong>
        </div>

        <div class="grand-total">
          TOTAL INCURRED
          <strong>${money(total)}</strong>
        </div>

      </div>

    </div>
  `;

  openModal(
    "vehicleExpensePreviewModal"
  );
}

function printVehicleExpenseReport(
  vehicleId
) {
  const vehicle =
    vehicles.find(v =>
      String(v.id) ===
      String(vehicleId)
    );

  if (!vehicle) return;

  const rows =
    vehicleExpenses(vehicleId);

  const total =
    vehicleExpenseTotal(vehicleId);

  const html = `
<!DOCTYPE html>
<html>
<head>

<meta charset="UTF-8">

<title>
Vehicle Expense Report —
${escapeHtml(vehicle.registration || "")}
</title>

<style>

body{
  font-family:Arial,sans-serif;
  color:#111827;
  margin:30px;
}

.header{
  display:flex;
  justify-content:space-between;
  border-bottom:2px solid #111827;
  padding-bottom:15px;
  margin-bottom:20px;
}

h1{
  margin:0;
  font-size:23px;
}

.title{
  font-weight:700;
  font-size:19px;
}

.details{
  display:grid;
  grid-template-columns:
    repeat(3,1fr);
  gap:12px;
  margin-bottom:25px;
}

table{
  width:100%;
  border-collapse:collapse;
}

th,td{
  border:1px solid #cbd5e1;
  padding:9px;
}

th{
  background:#f1f5f9;
  text-align:left;
}

.total{
  display:flex;
  justify-content:flex-end;
  margin-top:20px;
  font-size:20px;
}

@media print{
  body{
    margin:15mm;
  }
}

</style>

</head>

<body>

<div class="header">

  <div>
    <h1>GARAGE OPERATIONS PRO</h1>
    <div>
      Vehicle • Finance • Workshop Operations
    </div>
  </div>

  <div class="title">
    VEHICLE EXPENSE REPORT
  </div>

</div>

<div class="details">

  <div>
    <strong>Registration / Chassis No.</strong><br>
    ${escapeHtml(
      vehicle.registration || ""
    )}
  </div>

  <div>
    <strong>Customer</strong><br>
    ${escapeHtml(
      vehicle.customer || ""
    )}
  </div>

  <div>
    <strong>Model</strong><br>
    ${escapeHtml(
      vehicle.model || ""
    )}
  </div>

  <div>
    <strong>Year</strong><br>
    ${escapeHtml(
      vehicle.model_year || ""
    )}
  </div>

  <div>
    <strong>Colour</strong><br>
    ${escapeHtml(
      vehicle.color || ""
    )}
  </div>

  <div>
    <strong>Date In</strong><br>
    ${escapeHtml(
      formatDate(vehicle.date_in)
    )}
  </div>

  <div>
    <strong>Date Out</strong><br>
    ${escapeHtml(
      formatDate(vehicle.date_out)
    )}
  </div>

</div>

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
  rows.length
    ? rows.map(row => `
      <tr>
        <td>
          ${escapeHtml(
            formatDate(
              row.expense_date
            )
          )}
        </td>

        <td>
          ${escapeHtml(
            row.description || ""
          )}
        </td>

        <td>
          ${escapeHtml(
            row.category || ""
          )}
        </td>

        <td>
          ${money(row.amount)}
        </td>
      </tr>
    `).join("")
    : `
      <tr>
        <td colspan="4">
          No expenses recorded.
        </td>
      </tr>
    `
}

</tbody>

</table>

<div class="total">
  <strong>
    TOTAL INCURRED:
    ${money(total)}
  </strong>
</div>

<script>
window.onload=function(){
  window.print();
};
</script>

</body>
</html>
  `;

  const win =
    window.open(
      "",
      "_blank",
      "width=1000,height=800"
    );

  if (!win) {
    showToast(
      "Please allow pop-ups to print.",
      "error"
    );
    return;
  }

  win.document.write(html);
  win.document.close();
}


/* =========================================================
   COMPANY DETAILS
   ========================================================= */

const COMPANY_OPTIONS = {
  "Quarry Route Motors Ltd": {
    name: "Quarry Route Motors Ltd",
    address:
      "P.O. Box 54385 – 00200, Nairobi",
    phone:
      "0722 707124 / 0723 914 222",
    location:
      "Off Mombasa Road • Along Quarry Road • Near Mlolongo Weigh Bridge",
    email:
      "info@quarryroutemotors.com",
    email2:
      "quarryroutemotorsltd@gmail.com"
  },

  "Crystal Motors K Ltd": {
    name: "Crystal Motors K Ltd",
    address:
      "P.O. Box 54385 – 00200, Nairobi",
    phone:
      "0722 707124 / 0723 914 222",
    location:
      "Off Mombasa Road • Along Quarry Road • Near Mlolongo Weigh Bridge",
    email:
      "info@quarryroutemotors.com",
    email2:
      "quarryroutemotorsltd@gmail.com"
  }
};

function getSelectedCompany() {
  const select =
    $("invoiceCompany") ||
    $("gateCompany");

  const value =
    select?.value || "";

  return COMPANY_OPTIONS[value] || {
    name: value || "",
    address: "",
    phone: "",
    location: "",
    email: "",
    email2: ""
  };
}

function fillCompanyFields(prefix) {
  const select =
    $(`${prefix}Company`);

  if (!select) return;

  const company =
    COMPANY_OPTIONS[select.value];

  const details =
    company || {
      name:
        select.value === "Other"
          ? ""
          : select.value,
      address: "",
      phone: "",
      location: "",
      email: "",
      email2: ""
    };

  if ($(`${prefix}CompanyName`)) {
    $(`${prefix}CompanyName`).value =
      details.name || "";
  }

  if ($(`${prefix}CompanyAddress`)) {
    $(`${prefix}CompanyAddress`).value =
      details.address || "";
  }

  if ($(`${prefix}CompanyPhone`)) {
    $(`${prefix}CompanyPhone`).value =
      details.phone || "";
  }

  if ($(`${prefix}CompanyLocation`)) {
    $(`${prefix}CompanyLocation`).value =
      details.location || "";
  }

  if ($(`${prefix}CompanyEmail`)) {
    $(`${prefix}CompanyEmail`).value =
      details.email || "";
  }

  if ($(`${prefix}CompanyEmail2`)) {
    $(`${prefix}CompanyEmail2`).value =
      details.email2 || "";
  }
}


/* =========================================================
   INVOICES
   ========================================================= */

function invoiceVehicle() {
  const id =
    $("invoiceVehicle")?.value;

  return vehicles.find(v =>
    String(v.id) === String(id)
  );
}

function invoiceRowsFromForm() {
  const rows = [];

  document
    .querySelectorAll(
      ".invoice-line"
    )
    .forEach(row => {

      const description =
        row.querySelector(
          ".invoice-description"
        )?.value.trim() || "";

      const amount =
        number(
          row.querySelector(
            ".invoice-amount"
          )?.value
        );

      if (
        description ||
        amount
      ) {
        rows.push({
          description,
          amount
        });
      }
    });

  return rows;
}

function invoiceSubtotal(rows) {
  return rows.reduce(
    (sum, row) =>
      sum + number(row.amount),
    0
  );
}

function invoiceVatRate() {
  const value =
    number(
      $("invoiceVat")?.value
    );

  return value;
}

function invoiceVatAmount(
  subtotal,
  rate
) {
  return subtotal *
    (rate / 100);
}

function invoiceGrandTotal(
  subtotal,
  rate
) {
  return subtotal +
    invoiceVatAmount(
      subtotal,
      rate
    );
}


/* =========================================================
   AMOUNT IN WORDS
   ========================================================= */

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine"
];

const TEENS = [
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen"
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety"
];

function numberToWordsUnder1000(num) {
  num = Math.floor(num);

  let words = "";

  if (num >= 100) {
    words +=
      ONES[Math.floor(num / 100)] +
      " Hundred";

    num %= 100;

    if (num) {
      words += " ";
    }
  }

  if (num >= 20) {
    words +=
      TENS[Math.floor(num / 10)];

    num %= 10;

    if (num) {
      words +=
        " " + ONES[num];
    }

  } else if (num >= 10) {

    words += TEENS[num - 10];

  } else if (num > 0) {

    words += ONES[num];
  }

  return words;
}

function numberToWords(num) {
  num = Math.floor(
    Math.abs(number(num))
  );

  if (num === 0) {
    return "Zero";
  }

  const groups = [];

  const scales = [
    "",
    "Thousand",
    "Million",
    "Billion",
    "Trillion"
  ];

  let index = 0;

  while (num > 0) {
    const part = num % 1000;

    if (part) {
      const words =
        numberToWordsUnder1000(
          part
        );

      groups.unshift(
        `${words}${scales[index] ? " " + scales[index] : ""}`
      );
    }

    num =
      Math.floor(num / 1000);

    index++;
  }

  return groups.join(" ");
}

function amountInWords(value) {
  const amount =
    number(value);

  const whole =
    Math.floor(amount);

  const cents =
    Math.round(
      (amount - whole) * 100
    );

  let result =
    numberToWords(whole) +
    " Kenya Shillings";

  if (cents > 0) {
    result +=
      " and " +
      numberToWords(cents) +
      " Cents";
  }

  return result + " Only";
}


/* =========================================================
   INVOICE LINE MANAGEMENT
   ========================================================= */

function addInvoiceLine(
  description = "",
  amount = 0
) {
  const container =
    $("invoiceLines");

  if (!container) return;

  const row =
    document.createElement("div");

  row.className =
    "invoice-line";

  row.innerHTML = `
    <input
      class="invoice-description"
      type="text"
      placeholder="Description"
      value="${escapeHtml(description)}">

    <input
      class="invoice-amount"
      type="number"
      min="0"
      step="0.01"
      placeholder="Amount"
      value="${number(amount)}">

    <button
      type="button"
      class="action-btn"
      title="Remove"
      onclick="this.closest('.invoice-line').remove();calculateInvoiceTotals()">
      🗑
    </button>
  `;

  container.appendChild(row);

  row.querySelectorAll("input")
    .forEach(input => {
      input.addEventListener(
        "input",
        calculateInvoiceTotals
      );
    });
}

function resetInvoiceLines() {
  const container =
    $("invoiceLines");

  if (!container) return;

  container.innerHTML = "";

  addInvoiceLine();
}

function calculateInvoiceTotals() {
  const rows =
    invoiceRowsFromForm();

  const subtotal =
    invoiceSubtotal(rows);

  const rate =
    invoiceVatRate();

  const vat =
    invoiceVatAmount(
      subtotal,
      rate
    );

  const total =
    subtotal + vat;

  if ($("invoiceSubtotal")) {
    $("invoiceSubtotal").value =
      subtotal.toFixed(2);
  }

  if ($("invoiceVatAmount")) {
    $("invoiceVatAmount").value =
      vat.toFixed(2);
  }

  if ($("invoiceTotal")) {
    $("invoiceTotal").value =
      total.toFixed(2);
  }

  if ($("invoiceAmountWords")) {
    $("invoiceAmountWords").value =
      amountInWords(total);
  }
}


/* =========================================================
   RESET INVOICE
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

  if ($("invoiceDate")) {
    $("invoiceDate").value =
      today();
  }

  if ($("invoiceVat")) {
    $("invoiceVat").value = "16";
  }

  if ($("invoiceModalTitle")) {
    $("invoiceModalTitle").textContent =
      "Create Invoice";
  }

  resetInvoiceLines();

  fillCompanyFields(
    "invoice"
  );

  calculateInvoiceTotals();
}


/* =========================================================
   OPEN INVOICE MODAL
   ========================================================= */

function openInvoiceModal(
  id = null,
  vehicleId = null
) {
  resetInvoiceForm();

  populateVehicleSelects();

  if (vehicleId) {
    if ($("invoiceVehicle")) {
      $("invoiceVehicle").value =
        vehicleId;
    }

    populateInvoiceFromVehicle();
  }

  if (id) {
    const invoice =
      invoices.find(i =>
        String(i.id) ===
        String(id)
      );

    if (!invoice) {
      showToast(
        "Invoice not found.",
        "error"
      );
      return;
    }

    editingInvoiceId =
      invoice.id;

    if ($("invoiceId")) {
      $("invoiceId").value =
        invoice.id;
    }

    if ($("invoiceNumber")) {
      $("invoiceNumber").value =
        invoice.invoice_no || "";
    }

    if ($("invoiceDate")) {
      $("invoiceDate").value =
        invoice.invoice_date ||
        today();
    }

    if ($("invoiceCompany")) {
      $("invoiceCompany").value =
        invoice.company_name || "";
    }

    fillCompanyFields(
      "invoice"
    );

    if ($("invoiceInsuranceCompany")) {
      $("invoiceInsuranceCompany").value =
        invoice.insurance_company || "";
    }

    if ($("invoiceClaimNo")) {
      $("invoiceClaimNo").value =
        invoice.claim_no || "";
    }

    if ($("invoiceInsured")) {
      $("invoiceInsured").value =
        invoice.insured || "";
    }

    if ($("invoicePolicyNo")) {
      $("invoicePolicyNo").value =
        invoice.policy_no || "";
    }

    if ($("invoiceCustomerContact")) {
      $("invoiceCustomerContact").value =
        invoice.customer_contact || "";
    }

    if ($("invoiceVehicle")) {
      $("invoiceVehicle").value =
        invoice.vehicle_id || "";
    }

    if ($("invoiceVat")) {
      $("invoiceVat").value =
        number(invoice.vat_rate);
    }

    if ($("invoiceAmountWords")) {
      $("invoiceAmountWords").value =
        invoice.amount_words || "";
    }

    const storedLines =
      Array.isArray(invoice.items)
        ? invoice.items
        : [];

    const container =
      $("invoiceLines");

    if (container) {
      container.innerHTML = "";

      if (storedLines.length) {
        storedLines.forEach(item => {
          addInvoiceLine(
            item.description || "",
            item.amount || 0
          );
        });
      } else {
        addInvoiceLine();
      }
    }

    populateInvoiceFromVehicle();

    if ($("invoiceModalTitle")) {
      $("invoiceModalTitle").textContent =
        "Edit Invoice";
    }

    calculateInvoiceTotals();
  }

  openModal("invoiceModal");
}


/* =========================================================
   POPULATE INVOICE FROM VEHICLE
   ========================================================= */

function populateInvoiceFromVehicle() {
  const vehicle =
    invoiceVehicle();

  if (!vehicle) return;

  if ($("invoiceRegistration")) {
    $("invoiceRegistration").value =
      vehicle.registration || "";
  }

  if ($("invoiceModel")) {
    $("invoiceModel").value =
      vehicle.model || "";
  }

  if ($("invoiceYear")) {
    $("invoiceYear").value =
      vehicle.model_year || "";
  }

  if ($("invoiceColor")) {
    $("invoiceColor").value =
      vehicle.color || "";
  }

  if ($("invoiceInsured")) {
    if (
      !$("invoiceInsured").value.trim()
    ) {
      $("invoiceInsured").value =
        vehicle.customer || "";
    }
  }

  if ($("invoiceCustomerContact")) {
    if (
      !$("invoiceCustomerContact").value.trim()
    ) {
      $("invoiceCustomerContact").value =
        vehicle.released_contact || "";
    }
  }
}


/* =========================================================
   SAVE INVOICE
   ========================================================= */

async function saveInvoice(event) {
  event.preventDefault();

  const rows =
    invoiceRowsFromForm();

  const subtotal =
    invoiceSubtotal(rows);

  const vatRate =
    invoiceVatRate();

  const vatAmount =
    invoiceVatAmount(
      subtotal,
      vatRate
    );

  const total =
    subtotal + vatAmount;

  const vehicle =
    invoiceVehicle();

  const invoiceNo =
    $("invoiceNumber")?.value.trim() ||
    generateNumber(
      "INV",
      invoices,
      "invoice_no"
    );

  const company =
    $("invoiceCompany")?.value.trim() ||
    "";

  const payload = {
    invoice_no: invoiceNo,
    invoice_date:
      $("invoiceDate")?.value ||
      today(),
    company_name: company,

    company_address:
      $("invoiceCompanyAddress")?.value.trim() ||
      "",

    company_phone:
      $("invoiceCompanyPhone")?.value.trim() ||
      "",

    company_location:
      $("invoiceCompanyLocation")?.value.trim() ||
      "",

    company_email:
      $("invoiceCompanyEmail")?.value.trim() ||
      "",

    company_email2:
      $("invoiceCompanyEmail2")?.value.trim() ||
      "",

    insurance_company:
      $("invoiceInsuranceCompany")?.value.trim() ||
      "",

    claim_no:
      $("invoiceClaimNo")?.value.trim() ||
      "",

    insured:
      $("invoiceInsured")?.value.trim() ||
      "",

    policy_no:
      $("invoicePolicyNo")?.value.trim() ||
      "",

    customer_contact:
      $("invoiceCustomerContact")?.value.trim() ||
      "",

    vehicle_id:
      vehicle?.id ||
      $("invoiceVehicle")?.value ||
      null,

    registration:
      vehicle?.registration ||
      $("invoiceRegistration")?.value.trim() ||
      "",

    model:
      vehicle?.model ||
      $("invoiceModel")?.value.trim() ||
      "",

    year:
      vehicle?.model_year ||
      number($("invoiceYear")?.value),

    color:
      vehicle?.color ||
      $("invoiceColor")?.value.trim() ||
      "",

    items: rows,

    subtotal,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total,

    amount_words:
      amountInWords(total)
  };

  try {
    let result;

    if (editingInvoiceId) {
      result = await supabase
        .from("invoices")
        .update(payload)
        .eq("id", editingInvoiceId);
    } else {
      result = await supabase
        .from("invoices")
        .insert(payload);
    }

    if (result.error) {
      throw result.error;
    }

    closeModal(
      "invoiceModal"
    );

    showToast(
      editingInvoiceId
        ? "Invoice updated."
        : "Invoice created."
    );

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Could not save invoice.",
      "error"
    );
  }
}


/* =========================================================
   INVOICE TABLE
   ========================================================= */

function renderInvoices() {
  const body =
    $("invoicesTableBody");

  if (!body) return;

  if (!invoices.length) {
    body.innerHTML = `
      <tr>
        <td colspan="8"
          style="text-align:center;padding:30px;color:#64748b">
          No invoices found.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML =
    invoices.map(invoice => {

      const vehicle =
        vehicles.find(v =>
          String(v.id) ===
          String(invoice.vehicle_id)
        );

      return `
        <tr>

          <td>
            <strong>
              ${escapeHtml(
                invoice.invoice_no || ""
              )}
            </strong>
          </td>

          <td>
            ${escapeHtml(
              formatDate(
                invoice.invoice_date
              )
            )}
          </td>

          <td>
            ${escapeHtml(
              invoice.company_name || ""
            )}
          </td>

          <td>
            ${escapeHtml(
              invoice.insurance_company || ""
            )}
          </td>

          <td>
            ${escapeHtml(
              invoice.claim_no || ""
            )}
          </td>

          <td>
            ${escapeHtml(
              vehicle?.registration ||
              invoice.registration ||
              ""
            )}
          </td>

          <td>
            <strong>
              ${money(invoice.total)}
            </strong>
          </td>

          <td>

            <div class="table-actions">

              <button
                class="action-btn"
                title="Edit"
                onclick="openInvoiceModal('${escapeHtml(invoice.id)}')">
                ✏️
              </button>

              <button
                class="action-btn"
                title="Print"
                onclick="printInvoice('${escapeHtml(invoice.id)}')">
                🖨
              </button>

              <button
                class="action-btn"
                title="Delete"
                onclick="deleteInvoice('${escapeHtml(invoice.id)}')">
                🗑
              </button>

            </div>

          </td>

        </tr>
      `;
    }).join("");
}


/* =========================================================
   INVOICE PRINT
   ========================================================= */

function invoicePrintData(invoice) {
  const vehicle =
    vehicles.find(v =>
      String(v.id) ===
      String(invoice.vehicle_id)
    );

  const company =
    COMPANY_OPTIONS[
      invoice.company_name
    ] || {
      name:
        invoice.company_name || "",
      address:
        invoice.company_address || "",
      phone:
        invoice.company_phone || "",
      location:
        invoice.company_location || "",
      email:
        invoice.company_email || "",
      email2:
        invoice.company_email2 || ""
    };

  const items =
    Array.isArray(invoice.items)
      ? invoice.items
      : [];

  return {
    vehicle,
    company,
    items
  };
}

function printInvoice(id) {
  const invoice =
    invoices.find(i =>
      String(i.id) ===
      String(id)
    );

  if (!invoice) {
    showToast(
      "Invoice not found.",
      "error"
    );
    return;
  }

  const {
    vehicle,
    company,
    items
  } =
    invoicePrintData(invoice);

  const html = `
<!DOCTYPE html>
<html>
<head>

<meta charset="UTF-8">

<title>
Invoice ${escapeHtml(
  invoice.invoice_no || ""
)}
</title>

<style>

*{
  box-sizing:border-box;
}

body{
  font-family:Arial,Helvetica,sans-serif;
  color:#111827;
  background:#fff;
  margin:0;
}

.page{
  width:210mm;
  min-height:297mm;
  margin:0 auto;
  padding:15mm;
}

.top{
  display:flex;
  justify-content:space-between;
  gap:30px;
  border-bottom:3px solid #111827;
  padding-bottom:15px;
}

.company{
  width:60%;
}

.company h1{
  margin:0 0 8px;
  font-size:25px;
}

.company p{
  margin:3px 0;
  font-size:12px;
}

.invoice-heading{
  text-align:right;
}

.invoice-heading h2{
  margin:0;
  font-size:30px;
  letter-spacing:1px;
}

.invoice-heading p{
  margin:5px 0;
  font-size:12px;
}

.info-grid{
  display:grid;
  grid-template-columns:
    1fr 1fr;
  gap:12px;
  margin-top:18px;
}

.info-box{
  border:1px solid #cbd5e1;
  padding:10px;
  min-height:70px;
}

.info-box strong{
  display:block;
  font-size:10px;
  text-transform:uppercase;
  margin-bottom:5px;
}

table{
  width:100%;
  border-collapse:collapse;
  margin-top:18px;
}

th,td{
  border:1px solid #cbd5e1;
  padding:9px;
  font-size:12px;
}

th{
  background:#f1f5f9;
  text-align:left;
}

.amount{
  text-align:right;
}

.totals{
  width:45%;
  margin-left:auto;
  margin-top:15px;
}

.total-row{
  display:flex;
  justify-content:space-between;
  padding:7px;
  border-bottom:1px solid #cbd5e1;
}

.grand{
  font-size:17px;
  font-weight:bold;
  border-top:2px solid #111827;
}

.words{
  margin-top:20px;
  border:1px solid #cbd5e1;
  padding:12px;
  font-size:12px;
}

.footer{
  margin-top:50px;
  display:flex;
  justify-content:space-between;
  gap:40px;
}

.signature{
  width:45%;
  padding-top:45px;
  border-bottom:1px solid #111827;
  text-align:center;
}

.stamp{
  width:150px;
  height:100px;
  border:2px dashed #94a3b8;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:11px;
  color:#64748b;
}

@media print{

  @page{
    size:A4;
    margin:0;
  }

  .page{
    margin:0;
  }

}

</style>

</head>

<body>

<div class="page">

  <div class="top">

    <div class="company">

      <h1>
        ${escapeHtml(
          company.name || ""
        )}
      </h1>

      <p>
        ${escapeHtml(
          company.address || ""
        )}
      </p>

      <p>
        Cell:
        ${escapeHtml(
          company.phone || ""
        )}
      </p>

      <p>
        ${escapeHtml(
          company.location || ""
        )}
      </p>

      <p>
        ${escapeHtml(
          company.email || ""
        )}
      </p>

      ${
        company.email2
          ? `
            <p>
              ${escapeHtml(
                company.email2
              )}
            </p>
          `
          : ""
      }

    </div>

    <div class="invoice-heading">

      <h2>INVOICE</h2>

      <p>
        <strong>Invoice No:</strong>
        ${escapeHtml(
          invoice.invoice_no || ""
        )}
      </p>

      <p>
        <strong>Date:</strong>
        ${escapeHtml(
          formatDate(
            invoice.invoice_date
          )
        )}
      </p>

    </div>

  </div>

  <div class="info-grid">

    <div class="info-box">

      <strong>
        Insurance Company
      </strong>

      ${escapeHtml(
        invoice.insurance_company || ""
      )}

    </div>

    <div class="info-box">

      <strong>
        Claim No.
      </strong>

      ${escapeHtml(
        invoice.claim_no || ""
      )}

    </div>

    <div class="info-box">

      <strong>
        Insured
      </strong>

      ${escapeHtml(
        invoice.insured || ""
      )}

    </div>

    <div class="info-box">

      <strong>
        Policy No.
      </strong>

      ${escapeHtml(
        invoice.policy_no || ""
      )}

    </div>

    <div class="info-box">

      <strong>
        Customer / Insured Contact
      </strong>

      ${escapeHtml(
        invoice.customer_contact || ""
      )}

    </div>

    <div class="info-box">

      <strong>
        Registration / Chassis No.
      </strong>

      ${escapeHtml(
        vehicle?.registration ||
        invoice.registration ||
        ""
      )}

    </div>

    <div class="info-box">

      <strong>
        Model
      </strong>

      ${escapeHtml(
        vehicle?.model ||
        invoice.model ||
        ""
      )}

    </div>

    <div class="info-box">

      <strong>
        Year / Colour
      </strong>

      ${escapeHtml(
        vehicle?.model_year ||
        invoice.year ||
        ""
      )}

      /
      ${escapeHtml(
        vehicle?.color ||
        invoice.color ||
        ""
      )}

    </div>

  </div>

  <table>

    <thead>

      <tr>

        <th style="width:7%">
          #
        </th>

        <th>
          Description
        </th>

        <th
          class="amount"
          style="width:25%">
          Amount (KSh)
        </th>

      </tr>

    </thead>

    <tbody>

      ${
        items.length
          ? items.map(
              (item,index) => `
                <tr>

                  <td>
                    ${index + 1}
                  </td>

                  <td>
                    ${escapeHtml(
                      item.description || ""
                    )}
                  </td>

                  <td class="amount">
                    ${moneyPlain(
                      item.amount
                    )}
                  </td>

                </tr>
              `
            ).join("")
          : `
            <tr>
              <td colspan="3">
                No charge lines.
              </td>
            </tr>
          `
      }

    </tbody>

  </table>

  <div class="totals">

    <div class="total-row">

      <span>
        Subtotal
      </span>

      <strong>
        ${moneyPlain(
          invoice.subtotal
        )}
      </strong>

    </div>

    <div class="total-row">

      <span>
        VAT
        (${number(invoice.vat_rate)}%)
      </span>

      <strong>
        ${moneyPlain(
          invoice.vat_amount
        )}
      </strong>

    </div>

    <div class="total-row grand">

      <span>
        TOTAL
      </span>

      <strong>
        KSh ${moneyPlain(
          invoice.total
        )}
      </strong>

    </div>

  </div>

  <div class="words">

    <strong>
      Amount in Words:
    </strong>

    ${escapeHtml(
      invoice.amount_words ||
      amountInWords(
        invoice.total
      )
    )}

  </div>

  <div class="footer">

    <div class="signature">
      Authorized Signature
    </div>

    <div class="stamp">
      COMPANY STAMP
    </div>

  </div>

</div>

<script>

window.onload=function(){
  window.print();
};

</script>

</body>
</html>
  `;

  const win =
    window.open(
      "",
      "_blank",
      "width=1100,height=900"
    );

  if (!win) {
    showToast(
      "Please allow pop-ups to print.",
      "error"
    );
    return;
  }

  win.document.write(html);
  win.document.close();
}

async function deleteInvoice(id) {
  if (!confirm("Delete this invoice?")) {
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

    showToast(
      "Invoice deleted."
    );

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
   GATE PASSES
   ========================================================= */

function gatePassVehicle() {
  const id =
    $("gateVehicle")?.value;

  return vehicles.find(v =>
    String(v.id) === String(id)
  );
}

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

  if ($("gatePassDate")) {
    $("gatePassDate").value =
      today();
  }

  if ($("gatePassModalTitle")) {
    $("gatePassModalTitle").textContent =
      "Gate Pass";
  }

  fillCompanyFields(
    "gate"
  );
}

function openGatePassModal(
  id = null,
  vehicleId = null
) {

  resetGatePassForm();

  populateVehicleSelects();

  if (vehicleId) {

    if ($("gateVehicle")) {
      $("gateVehicle").value =
        vehicleId;
    }

    populateGatePassFromVehicle();
  }

  if (id) {

    const pass =
      gatePasses.find(g =>
        String(g.id) ===
        String(id)
      );

    if (!pass) {
      showToast(
        "Gate pass not found.",
        "error"
      );
      return;
    }

    editingGatePassId =
      pass.id;

    if ($("gatePassId")) {
      $("gatePassId").value =
        pass.id;
    }

    if ($("gatePassNumber")) {
      $("gatePassNumber").value =
        pass.gate_pass_no || "";
    }

    if ($("gatePassDate")) {
      $("gatePassDate").value =
        pass.gate_date ||
        today();
    }

    if ($("gateCompany")) {
      $("gateCompany").value =
        pass.company_name || "";
    }

    fillCompanyFields(
      "gate"
    );

    if ($("gateVehicle")) {
      $("gateVehicle").value =
        pass.vehicle_id || "";
    }

    if ($("gateAuthorizedBy")) {
      $("gateAuthorizedBy").value =
        pass.authorized_by || "";
    }

    if ($("gateSignature")) {
      $("gateSignature").value =
        pass.signature || "";
    }

    populateGatePassFromVehicle();

    if ($("gatePassModalTitle")) {
      $("gatePassModalTitle").textContent =
        "Edit Gate Pass";
    }
  }

  openModal(
    "gatePassModal"
  );
}


/* =========================================================
   POPULATE GATE PASS FROM VEHICLE
   ========================================================= */

function populateGatePassFromVehicle() {

  const vehicle =
    gatePassVehicle();

  if (!vehicle) return;

  const values = {
    registration:
      vehicle.registration || "",
    customer:
      vehicle.customer || "",
    model:
      vehicle.model || "",
    year:
      vehicle.model_year || "",
    color:
      vehicle.color || "",
    dateIn:
      vehicle.date_in || "",
    dateOut:
      vehicle.date_out || "",
    releasedTo:
      vehicle.released_to || "",
    contact:
      vehicle.released_contact || "",
    status:
      normalizeVehicleStatus(
        vehicle.status
      )
  };

  if ($("gateRegistration")) {
    $("gateRegistration").value =
      values.registration;
  }

  if ($("gateCustomer")) {
    $("gateCustomer").value =
      values.customer;
  }

  if ($("gateModel")) {
    $("gateModel").value =
      values.model;
  }

  if ($("gateYear")) {
    $("gateYear").value =
      values.year;
  }

  if ($("gateColor")) {
    $("gateColor").value =
      values.color;
  }

  if ($("gateDateIn")) {
    $("gateDateIn").value =
      values.dateIn;
  }

  if ($("gateDateOut")) {
    $("gateDateOut").value =
      values.dateOut;
  }

  if ($("gateReleasedTo")) {
    $("gateReleasedTo").value =
      values.releasedTo;
  }

  if ($("gateContact")) {
    $("gateContact").value =
      values.contact;
  }

  if ($("gateStatus")) {
    $("gateStatus").value =
      values.status;
  }
}


/* =========================================================
   SAVE GATE PASS
   ========================================================= */

async function saveGatePass(event) {

  event.preventDefault();

  const vehicle =
    gatePassVehicle();

  const gatePassNo =
    $("gatePassNumber")?.value.trim() ||
    generateNumber(
      "GP",
      gatePasses,
      "gate_pass_no"
    );

  const payload = {

    gate_pass_no:
      gatePassNo,

    gate_date:
      $("gatePassDate")?.value ||
      today(),

    company_name:
      $("gateCompany")?.value.trim() ||
      "",

    company_address:
      $("gateCompanyAddress")?.value.trim() ||
      "",

    company_phone:
      $("gateCompanyPhone")?.value.trim() ||
      "",

    company_location:
      $("gateCompanyLocation")?.value.trim() ||
      "",

    company_email:
      $("gateCompanyEmail")?.value.trim() ||
      "",

    company_email2:
      $("gateCompanyEmail2")?.value.trim() ||
      "",

    vehicle_id:
      vehicle?.id ||
      $("gateVehicle")?.value ||
      null,

    registration:
      vehicle?.registration ||
      $("gateRegistration")?.value.trim() ||
      "",

    customer:
      vehicle?.customer ||
      $("gateCustomer")?.value.trim() ||
      "",

    model:
      vehicle?.model ||
      $("gateModel")?.value.trim() ||
      "",

    year:
      vehicle?.model_year ||
      number($("gateYear")?.value),

    color:
      vehicle?.color ||
      $("gateColor")?.value.trim() ||
      "",

    date_in:
      vehicle?.date_in ||
      $("gateDateIn")?.value ||
      null,

    date_out:
      vehicle?.date_out ||
      $("gateDateOut")?.value ||
      null,

    released_to:
      vehicle?.released_to ||
      $("gateReleasedTo")?.value.trim() ||
      "",

    contact:
      vehicle?.released_contact ||
      $("gateContact")?.value.trim() ||
      "",

    status:
      vehicle?.status ||
      $("gateStatus")?.value ||
      "",

    authorized_by:
      $("gateAuthorizedBy")?.value.trim() ||
      "",

    signature:
      $("gateSignature")?.value.trim() ||
      ""
  };

  try {

    let result;

    if (editingGatePassId) {

      result =
        await supabase
          .from("gate_passes")
          .update(payload)
          .eq(
            "id",
            editingGatePassId
          );

    } else {

      result =
        await supabase
          .from("gate_passes")
          .insert(payload);

    }

    if (result.error) {
      throw result.error;
    }

    closeModal(
      "gatePassModal"
    );

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
      "Could not save gate pass.",
      "error"
    );

  }
}


/* =========================================================
   GATE PASS TABLE
   ========================================================= */

function renderGatePasses() {

  const body =
    $("gatePassesTableBody");

  if (!body) return;

  if (!gatePasses.length) {

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
    gatePasses.map(pass => {

      const vehicle =
        vehicles.find(v =>
          String(v.id) ===
          String(pass.vehicle_id)
        );

      return `
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
              formatDate(
                pass.gate_date
              )
            )}
          </td>

          <td>
            ${escapeHtml(
              pass.company_name || ""
            )}
          </td>

          <td>
            ${escapeHtml(
              vehicle?.registration ||
              pass.registration ||
              ""
            )}
          </td>

          <td>
            ${escapeHtml(
              vehicle?.customer ||
              pass.customer ||
              ""
            )}
          </td>

          <td>
            ${escapeHtml(
              pass.released_to ||
              vehicle?.released_to ||
              ""
            )}
          </td>

          <td>
            ${statusBadge(
              pass.status ||
              vehicle?.status ||
              ""
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
      `;
    }).join("");
}


/* =========================================================
   GATE PASS PRINT
   ========================================================= */

function printGatePass(id) {

  const pass =
    gatePasses.find(g =>
      String(g.id) ===
      String(id)
    );

  if (!pass) {
    showToast(
      "Gate pass not found.",
      "error"
    );
    return;
  }

  const vehicle =
    vehicles.find(v =>
      String(v.id) ===
      String(pass.vehicle_id)
    );

  const company =
    COMPANY_OPTIONS[
      pass.company_name
    ] || {
      name:
        pass.company_name || "",
      address:
        pass.company_address || "",
      phone:
        pass.company_phone || "",
      location:
        pass.company_location || "",
      email:
        pass.company_email || "",
      email2:
        pass.company_email2 || ""
    };

  const html = `
<!DOCTYPE html>
<html>

<head>

<meta charset="UTF-8">

<title>
Gate Pass
${escapeHtml(
  pass.gate_pass_no || ""
)}
</title>

<style>

*{
  box-sizing:border-box;
}

body{
  font-family:Arial,Helvetica,sans-serif;
  color:#111827;
  margin:0;
}

.page{
  width:210mm;
  min-height:297mm;
  margin:0 auto;
  padding:18mm;
}

.header{
  display:flex;
  justify-content:space-between;
  border-bottom:3px solid #111827;
  padding-bottom:15px;
}

.company h1{
  margin:0 0 7px;
  font-size:24px;
}

.company p{
  margin:3px 0;
  font-size:11px;
}

.heading{
  text-align:right;
}

.heading h2{
  margin:0;
  font-size:29px;
}

.meta{
  display:grid;
  grid-template-columns:
    1fr 1fr;
  gap:14px;
  margin-top:20px;
}

.box{
  border:1px solid #cbd5e1;
  padding:12px;
  min-height:65px;
}

.box strong{
  display:block;
  font-size:10px;
  text-transform:uppercase;
  margin-bottom:6px;
}

.vehicle{
  margin-top:20px;
}

.vehicle table{
  width:100%;
  border-collapse:collapse;
}

.vehicle th,
.vehicle td{
  border:1px solid #cbd5e1;
  padding:10px;
  font-size:12px;
}

.vehicle th{
  background:#f1f5f9;
}

.notice{
  margin-top:25px;
  border:1px solid #cbd5e1;
  padding:15px;
  line-height:1.6;
}

.sign{
  margin-top:70px;
  display:flex;
  justify-content:space-between;
}

.signbox{
  width:43%;
  text-align:center;
  border-top:1px solid #111827;
  padding-top:8px;
}

@media print{

  @page{
    size:A4;
    margin:0;
  }

  .page{
    margin:0;
  }

}

</style>

</head>

<body>

<div class="page">

  <div class="header">

    <div class="company">

      <h1>
        ${escapeHtml(
          company.name || ""
        )}
      </h1>

      <p>
        ${escapeHtml(
          company.address || ""
        )}
      </p>

      <p>
        Cell:
        ${escapeHtml(
          company.phone || ""
        )}
      </p>

      <p>
        ${escapeHtml(
          company.location || ""
        )}
      </p>

      <p>
        ${escapeHtml(
          company.email || ""
        )}
      </p>

    </div>

    <div class="heading">

      <h2>GATE PASS</h2>

      <p>
        <strong>No:</strong>
        ${escapeHtml(
          pass.gate_pass_no || ""
        )}
      </p>

      <p>
        <strong>Date:</strong>
        ${escapeHtml(
          formatDate(
            pass.gate_date
          )
        )}
      </p>

    </div>

  </div>

  <div class="meta">

    <div class="box">

      <strong>
        Registration / Chassis No.
      </strong>

      ${escapeHtml(
        vehicle?.registration ||
        pass.registration ||
        ""
      )}

    </div>

    <div class="box">

      <strong>
        Customer
      </strong>

      ${escapeHtml(
        vehicle?.customer ||
        pass.customer ||
        ""
      )}

    </div>

    <div class="box">

      <strong>
        Released To
      </strong>

      ${escapeHtml(
        vehicle?.released_to ||
        pass.released_to ||
        ""
      )}

    </div>

    <div class="box">

      <strong>
        Contact
      </strong>

      ${escapeHtml(
        vehicle?.released_contact ||
        pass.contact ||
        ""
      )}

    </div>

  </div>

  <div class="vehicle">

    <table>

      <thead>

        <tr>

          <th>
            Vehicle
          </th>

          <th>
            Model
          </th>

          <th>
            Year
          </th>

          <th>
            Colour
          </th>

          <th>
            Status
          </th>

        </tr>

      </thead>

      <tbody>

        <tr>

          <td>
            ${escapeHtml(
              vehicle?.registration ||
              pass.registration ||
              ""
            )}
          </td>

          <td>
            ${escapeHtml(
              vehicle?.model ||
              pass.model ||
              ""
            )}
          </td>

          <td>
            ${escapeHtml(
              vehicle?.model_year ||
              pass.year ||
              ""
            )}
          </td>

          <td>
            ${escapeHtml(
              vehicle?.color ||
              pass.color ||
              ""
            )}
          </td>

          <td>
            ${escapeHtml(
              vehicle?.status ||
              pass.status ||
              ""
            )}
          </td>

        </tr>

      </tbody>

    </table>

  </div>

  <div class="notice">

    <strong>
      Vehicle Release Authorization
    </strong>

    <p>
      The above vehicle is authorized
      to leave the premises under the
      release details stated on this
      Gate Pass.
    </p>

    <p>
      Date In:
      ${escapeHtml(
        formatDate(
          vehicle?.date_in ||
          pass.date_in
        )
      )}
      &nbsp;&nbsp;&nbsp;
      Date Out:
      ${escapeHtml(
        formatDate(
          vehicle?.date_out ||
          pass.date_out
        )
      )}
    </p>

  </div>

  <div class="sign">

    <div class="signbox">

      Authorized By

      <br><br>

      ${escapeHtml(
        pass.authorized_by || ""
      )}

    </div>

    <div class="signbox">

      Signature

      <br><br>

      ${escapeHtml(
        pass.signature || ""
      )}

    </div>

  </div>

</div>

<script>

window.onload=function(){
  window.print();
};

</script>

</body>

</html>
  `;

  const win =
    window.open(
      "",
      "_blank",
      "width=1100,height=900"
    );

  if (!win) {
    showToast(
      "Please allow pop-ups to print.",
      "error"
    );
    return;
  }

  win.document.write(html);
  win.document.close();
}

async function deleteGatePass(id) {

  if (!confirm(
    "Delete this gate pass?"
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

    showToast(
      "Gate pass deleted."
    );

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
   CHARTS
   ========================================================= */

function renderMonthlyExpensesChart() {

  const canvas =
    $("monthlyExpensesChart");

  if (!canvas) return;

  const ctx =
    canvas.getContext("2d");

  const width =
    canvas.width =
      canvas.clientWidth || 600;

  const height =
    canvas.height =
      260;

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  const now =
    new Date();

  const months = [];

  for (
    let i = 5;
    i >= 0;
    i--
  ) {

    const date =
      new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

    months.push({
      key:
        `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2,"0")}`,

      label:
        date.toLocaleDateString(
          "en-KE",
          {
            month:"short"
          }
        ),

      total:0
    });

  }

  expenses.forEach(expense => {

    const date =
      String(
        expense.expense_date || ""
      ).slice(0,7);

    const month =
      months.find(m =>
        m.key === date
      );

    if (month) {
      month.total +=
        number(expense.amount);
    }

  });

  const max =
    Math.max(
      ...months.map(
        m => m.total
      ),
      1
    );

  const padding = 35;

  const chartHeight =
    height - 55;

  const barGap =
    14;

  const barWidth =
    (
      width -
      padding * 2 -
      barGap *
        (months.length - 1)
    ) /
    months.length;

  ctx.font =
    "11px Arial";

  months.forEach(
    (month,index) => {

      const x =
        padding +
        index *
          (barWidth + barGap);

      const barHeight =
        (
          month.total /
          max
        ) *
        chartHeight;

      const y =
        height -
        35 -
        barHeight;

      ctx.fillStyle =
        "#2563eb";

      ctx.fillRect(
        x,
        y,
        barWidth,
        barHeight
      );

      ctx.fillStyle =
        "#475569";

      ctx.textAlign =
        "center";

      ctx.fillText(
        month.label,
        x + barWidth / 2,
        height - 14
      );

      if (month.total > 0) {

        ctx.fillText(
          moneyPlain(
            month.total
          ),
          x + barWidth / 2,
          Math.max(
            y - 6,
            12
          )
        );

      }

    }
  );

}

function renderVehicleStatusChart() {

  const canvas =
    $("vehicleStatusChart");

  if (!canvas) return;

  const ctx =
    canvas.getContext("2d");

  const width =
    canvas.width =
      canvas.clientWidth || 350;

  const height =
    canvas.height =
      260;

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  const statuses = [
    "Storage",
    "Under Repair",
    "Completed",
    "Released"
  ];

  const counts =
    statuses.map(
      status =>
        vehicles.filter(v =>
          normalizeVehicleStatus(
            v.status
          ) === status
        ).length
    );

  const total =
    counts.reduce(
      (sum,n) => sum+n,
      0
    );

  if (!total) {

    ctx.font =
      "13px Arial";

    ctx.fillStyle =
      "#64748b";

    ctx.textAlign =
      "center";

    ctx.fillText(
      "No vehicle data",
      width / 2,
      height / 2
    );

    return;
  }

  const centerX =
    width * 0.38;

  const centerY =
    height / 2;

  const radius =
    Math.min(
      width * 0.25,
      height * 0.35
    );

  let start =
    -Math.PI / 2;

  const palette = [
    "#2563eb",
    "#f59e0b",
    "#16a34a",
    "#64748b"
  ];

  counts.forEach(
    (count,index) => {

      if (!count) return;

      const angle =
        (
          count / total
        ) *
        Math.PI *
        2;

      ctx.beginPath();

      ctx.moveTo(
        centerX,
        centerY
      );

      ctx.arc(
        centerX,
        centerY,
        radius,
        start,
        start + angle
      );

      ctx.closePath();

      ctx.fillStyle =
        palette[index];

      ctx.fill();

      start += angle;

    }
  );

  ctx.beginPath();

  ctx.arc(
    centerX,
    centerY,
    radius * 0.55,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    "#ffffff";

  ctx.fill();

  ctx.fillStyle =
    "#111827";

  ctx.font =
    "bold 22px Arial";

  ctx.textAlign =
    "center";

  ctx.fillText(
    total,
    centerX,
    centerY + 7
  );

  ctx.font =
    "11px Arial";

  ctx.textAlign =
    "left";

  statuses.forEach(
    (status,index) => {

      const y =
        65 + index * 38;

      ctx.fillStyle =
        palette[index];

      ctx.fillRect(
        width * 0.68,
        y - 9,
        11,
        11
      );

      ctx.fillStyle =
        "#334155";

      ctx.fillText(
        `${status} (${counts[index]})`,
        width * 0.72,
        y
      );

    }
  );

}


/* =========================================================
   REPORTS
   ========================================================= */

function renderReports() {

  const vehicleReport =
    $("vehicleReportBody");

  if (!vehicleReport) {
    return;
  }

  const search =
    (
      $("reportVehicleSearch")
        ?.value || ""
    )
      .trim()
      .toLowerCase();

  const filtered =
    vehicles.filter(v => {

      const text = [
        v.registration,
        v.customer,
        v.model,
        v.model_year,
        v.color
      ]
        .join(" ")
        .toLowerCase();

      return (
        !search ||
        text.includes(search)
      );

    });

  vehicleReport.innerHTML =
    filtered.length
      ? filtered.map(v => {

          const incurred =
            vehicleExpenseTotal(
              v.id
            );

          const outstanding =
            Math.max(
              number(v.billed) -
              number(v.paid),
              0
            );

          return `
            <tr>

              <td>
                ${escapeHtml(
                  v.registration || ""
                )}
              </td>

              <td>
                ${escapeHtml(
                  v.customer || ""
                )}
              </td>

              <td>
                ${escapeHtml(
                  v.model || ""
                )}
              </td>

              <td>
                ${escapeHtml(
                  v.model_year || ""
                )}
              </td>

              <td>
                ${escapeHtml(
                  v.color || ""
                )}
              </td>

              <td>
                ${money(incurred)}
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

                <button
                  class="action-btn"
                  onclick="openVehicleExpensePreview('${escapeHtml(v.id)}')">
                  👁
                </button>

              </td>

            </tr>
          `;

        }).join("")
      : `
        <tr>
          <td colspan="10"
            style="text-align:center;padding:30px;color:#64748b">
            No report data found.
          </td>
        </tr>
      `;

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function showSection(
  sectionId
) {

  document
    .querySelectorAll(
      ".app-section"
    )
    .forEach(section => {

      section.style.display =
        section.id ===
        sectionId
          ? "block"
          : "none";

    });

  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(item => {

      item.classList.toggle(
        "active",
        item.dataset.section ===
        sectionId
      );

    });

  if (
    sectionId ===
    "dashboardSection"
  ) {

    renderDashboard();

  } else if (
    sectionId ===
    "vehiclesSection"
  ) {

    renderVehicles();

  } else if (
    sectionId ===
    "expensesSection"
  ) {

    renderExpenses();

  } else if (
    sectionId ===
    "pettyCashSection"
  ) {

    renderPettyCash();

  } else if (
    sectionId ===
    "requisitionsSection"
  ) {

    renderRequisitions();

  } else if (
    sectionId ===
    "invoicesSection"
  ) {

    renderInvoices();

  } else if (
    sectionId ===
    "gatePassesSection"
  ) {

    renderGatePasses();

  } else if (
    sectionId ===
    "reportsSection"
  ) {

    renderReports();

  }

}

function setupNavigation() {

  document
    .querySelectorAll(
      "[data-section]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const section =
            button.dataset.section;

          if (section) {
            showSection(
              section
            );
          }

          closeSidebarMobile();

        }
      );

    });

}


/* =========================================================
   MOBILE SIDEBAR
   ========================================================= */

function openSidebarMobile() {

  const sidebar =
    $("sidebar");

  if (!sidebar) return;

  sidebar.classList.add(
    "open"
  );

}

function closeSidebarMobile() {

  const sidebar =
    $("sidebar");

  if (!sidebar) return;

  sidebar.classList.remove(
    "open"
  );

}


/* =========================================================
   GLOBAL SEARCH
   ========================================================= */

function setupGlobalSearch() {

  const search =
    $("globalSearch");

  if (!search) return;

  search.addEventListener(
    "input",
    () => {

      const value =
        search.value
          .trim()
          .toLowerCase();

      if (!value) {
        return;
      }

      const vehicle =
        vehicles.find(v => {

          const text = [
            v.registration,
            v.customer,
            v.model,
            v.model_year,
            v.color
          ]
            .join(" ")
            .toLowerCase();

          return text.includes(
            value
          );

        });

      if (vehicle) {

        showSection(
          "vehiclesSection"
        );

        if ($("vehicleSearch")) {

          $("vehicleSearch").value =
            value;

          renderVehicles();

        }

      }

    }
  );

}


/* =========================================================
   FORM EVENT SETUP
   ========================================================= */

function setupForms() {

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

  $("invoiceVat")
    ?.addEventListener(
      "input",
      calculateInvoiceTotals
    );

  $("invoiceVehicle")
    ?.addEventListener(
      "change",
      populateInvoiceFromVehicle
    );

  $("gateVehicle")
    ?.addEventListener(
      "change",
      populateGatePassFromVehicle
    );

  $("invoiceCompany")
    ?.addEventListener(
      "change",
      () => {
        fillCompanyFields(
          "invoice"
        );
      }
    );

  $("gateCompany")
    ?.addEventListener(
      "change",
      () => {
        fillCompanyFields(
          "gate"
        );
      }
    );

}


/* =========================================================
   SEARCH / FILTER EVENTS
   ========================================================= */

function setupFilters() {

  $("vehicleSearch")
    ?.addEventListener(
      "input",
      renderVehicles
    );

  $("vehicleStatusFilter")
    ?.addEventListener(
      "change",
      renderVehicles
    );

  $("expenseSearch")
    ?.addEventListener(
      "input",
      renderExpenses
    );

  $("expenseCategoryFilter")
    ?.addEventListener(
      "change",
      renderExpenses
    );

  $("pettySearch")
    ?.addEventListener(
      "input",
      renderPettyCash
    );

  $("pettyCategoryFilter")
    ?.addEventListener(
      "change",
      renderPettyCash
    );

  $("reqSearch")
    ?.addEventListener(
      "input",
      renderRequisitions
    );

  $("reqStatusFilter")
    ?.addEventListener(
      "change",
      renderRequisitions
    );

  $("reportVehicleSearch")
    ?.addEventListener(
      "input",
      renderReports
    );

}


/* =========================================================
   STORAGE DAYS LIVE CALCULATION
   ========================================================= */

function updateStorageDaysField() {

  const dateIn =
    $("vehicleDateIn")
      ?.value;

  const dateOut =
    $("vehicleDateOut")
      ?.value ||
    null;

  if ($("vehicleStorageDays")) {

    $("vehicleStorageDays").value =
      calculateStorageDays(
        dateIn,
        dateOut
      );

  }

}

function setupStorageDays() {

  $("vehicleDateIn")
    ?.addEventListener(
      "input",
      updateStorageDaysField
    );

  $("vehicleDateOut")
    ?.addEventListener(
      "input",
      updateStorageDaysField
    );

  updateStorageDaysField();

}


/* =========================================================
   CLOSE MODALS
   ========================================================= */

function setupModalClosing() {

  document
    .querySelectorAll(
      ".modal"
    )
    .forEach(modal => {

      modal.addEventListener(
        "click",
        event => {

          if (
            event.target ===
            modal
          ) {

            modal.classList.remove(
              "show"
            );

          }

        }
      );

    });

  document
    .querySelectorAll(
      "[data-close-modal]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          closeModal(
            button.dataset.closeModal
          );

        }
      );

    });

}


/* =========================================================
   TOP BUTTONS
   ========================================================= */

function setupButtons() {

  $("addVehicleBtn")
    ?.addEventListener(
      "click",
      () =>
        openVehicleModal()
    );

  $("addExpenseBtn")
    ?.addEventListener(
      "click",
      () =>
        openExpenseModal()
    );

  $("addPettyBtn")
    ?.addEventListener(
      "click",
      () =>
        openPettyModal()
    );

  $("addReqBtn")
    ?.addEventListener(
      "click",
      () =>
        openReqModal()
    );

  $("addInvoiceBtn")
    ?.addEventListener(
      "click",
      () =>
        openInvoiceModal()
    );

  $("addGatePassBtn")
    ?.addEventListener(
      "click",
      () =>
        openGatePassModal()
    );

  $("menuBtn")
    ?.addEventListener(
      "click",
      openSidebarMobile
    );

  $("closeSidebarBtn")
    ?.addEventListener(
      "click",
      closeSidebarMobile
    );

  $("addInvoiceLineBtn")
    ?.addEventListener(
      "click",
      () =>
        addInvoiceLine()
    );

  $("printReqBtn")
    ?.addEventListener(
      "click",
      () => {

        if (selectedReqNo) {
          printRequisition(
            selectedReqNo
          );
        }

      }
    );

  $("printVehicleExpenseBtn")
    ?.addEventListener(
      "click",
      () => {

        if (
          selectedVehicleExpenseId
        ) {

          printVehicleExpenseReport(
            selectedVehicleExpenseId
          );

        }

      }
    );

}


/* =========================================================
   AUTHENTICATION
   ========================================================= */

const LOGIN_USERS = {
  josephine: "1234",
  boss: "1234",
  staff: "1234"
};

function setupLogin() {

  const loginScreen =
    $("loginScreen");

  const app =
    $("app");

  const loginForm =
    $("loginForm");

  if (!loginForm) {

    if (app) {
      app.style.display =
        "block";
    }

    return;

  }

  const existingUser =
    sessionStorage.getItem(
      "garageUser"
    );

  if (existingUser) {

    if (loginScreen) {
      loginScreen.style.display =
        "none";
    }

    if (app) {
      app.style.display =
        "block";
    }

    displayCurrentUser();

    return;

  }

  if (app) {
    app.style.display =
      "none";
  }

  if (loginScreen) {
    loginScreen.style.display =
      "flex";
  }

  loginForm.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      const username =
        $("loginUsername")
          ?.value
          .trim()
          .toLowerCase();

      const password =
        $("loginPassword")
          ?.value || "";

      if (
        LOGIN_USERS[username] &&
        LOGIN_USERS[username] ===
        password
      ) {

        sessionStorage.setItem(
          "garageUser",
          username
        );

        if (loginScreen) {
          loginScreen.style.display =
            "none";
        }

        if (app) {
          app.style.display =
            "block";
        }

        displayCurrentUser();

        loadAllData();

      } else {

        showToast(
          "Invalid username or password.",
          "error"
        );

      }

    }
  );

}

function logout() {

  sessionStorage.removeItem(
    "garageUser"
  );

  location.reload();

}


/* =========================================================
   EXPOSE FUNCTIONS TO HTML
   ========================================================= */

window.openModal =
  openModal;

window.closeModal =
  closeModal;

window.openVehicleModal =
  openVehicleModal;

window.saveVehicle =
  saveVehicle;

window.deleteVehicle =
  deleteVehicle;

window.openExpenseModal =
  openExpenseModal;

window.saveExpense =
  saveExpense;

window.deleteExpense =
  deleteExpense;

window.openPettyModal =
  openPettyModal;

window.savePetty =
  savePetty;

window.deletePetty =
  deletePetty;

window.openReqModal =
  openReqModal;

window.saveReq =
  saveReq;

window.deleteReq =
  deleteReq;

window.previewReq =
  previewReq;

window.printRequisition =
  printRequisition;

window.openVehicleExpensePreview =
  openVehicleExpensePreview;

window.printVehicleExpenseReport =
  printVehicleExpenseReport;

window.openInvoiceModal =
  openInvoiceModal;

window.saveInvoice =
  saveInvoice;

window.deleteInvoice =
  deleteInvoice;

window.printInvoice =
  printInvoice;

window.addInvoiceLine =
  addInvoiceLine;

window.calculateInvoiceTotals =
  calculateInvoiceTotals;

window.openGatePassModal =
  openGatePassModal;

window.saveGatePass =
  saveGatePass;

window.deleteGatePass =
  deleteGatePass;

window.printGatePass =
  printGatePass;

window.showSection =
  showSection;

window.logout =
  logout;

window.openSidebarMobile =
  openSidebarMobile;

window.closeSidebarMobile =
  closeSidebarMobile;


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initApp() {

  setupLogin();

  setupNavigation();

  setupForms();

  setupFilters();

  setupStorageDays();

  setupModalClosing();

  setupButtons();

  setupGlobalSearch();

  displayCurrentUser();

  renderMonthlyExpensesChart();

  renderVehicleStatusChart();

  renderReports();

  /*
   * Only load data when the user is already
   * logged in or there is no login screen.
   */
  const loginScreen =
    $("loginScreen");

  const loggedIn =
    !!sessionStorage.getItem(
      "garageUser"
    );

  if (
    !loginScreen ||
    loggedIn
  ) {

    await loadAllData();

  }

  /*
   * Charts are rendered again after
   * Supabase data is available.
   */
  renderMonthlyExpensesChart();

  renderVehicleStatusChart();

  renderReports();

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
    initApp
  );

} else {

  initApp();

}         </div>

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
          <td>${
            normalizeJobType(v.job_type) === "Storage" ||
            normalizeVehicleStatus(v.status) === "Storage"
              ? calculateStorageDays(v.date_in, v.date_out)
              : "—"
          }</td>
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
            <th>Storage Days</th>
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

  function updateVehicleStorageDays() {
    if ($("vehicleStorageDays")) {
      $("vehicleStorageDays").value =
        calculateStorageDays(
          $("vehicleDateIn")?.value,
          $("vehicleDateOut")?.value || null
        );
    }
  }

  $("vehicleDateIn")?.addEventListener(
    "input",
    updateVehicleStorageDays
  );

  $("vehicleDateOut")?.addEventListener(
    "input",
    updateVehicleStorageDays
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

window.calculateStorageDays =
  calculateStorageDays;

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
   
