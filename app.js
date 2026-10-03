/* =========================================================
   =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE APP.JS
   =========================================================
   PART 1 START HERE
   SUPABASE + GLOBALS + HELPERS + DASHBOARD
   ========================================================= */

import {
  createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
  "https://ptluwoeogfkqavhspdjj.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";

const supabase =
  createClient(
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

let editingVehicleId = null;
let editingExpenseId = null;
let editingPettyId = null;
let editingReqId = null;

let selectedVehicleExpenseId = null;
let selectedReqNo = null;


/* =========================================================
   OPTIONS
   ========================================================= */

const VEHICLE_JOB_TYPES = [
  "Repair",
  "Storage"
];

const VEHICLE_STATUSES = [
  "Storage",
  "Under Repair",
  "Completed",
  "Released"
];

const EXPENSE_CATEGORIES = [
  "Parts",
  "Materials",
  "Labour"
];

const PETTY_CATEGORIES = [
  "Parts",
  "Materials",
  "Labour",
  "Transport",
  "Other"
];

const REQ_STATUSES = [
  "Pending",
  "Approved",
  "Purchased",
  "Completed",
  "Rejected"
];


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function num(value) {
  const n =
    Number(
      String(value ?? "")
        .replace(/,/g, "")
        .trim()
    );

  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return (
    "KSh " +
    num(value).toLocaleString(
      "en-KE",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )
  );
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
  const d = new Date();

  return (
    d.getFullYear() +
    "-" +
    String(
      d.getMonth() + 1
    ).padStart(2, "0") +
    "-" +
    String(
      d.getDate()
    ).padStart(2, "0")
  );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const text = String(value);

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(text)
  ) {
    const parts =
      text.split("-").map(Number);

    const d =
      new Date(
        parts[0],
        parts[1] - 1,
        parts[2]
      );

    return d.toLocaleDateString(
      "en-KE",
      {
        year: "numeric",
        month: "short",
        day: "numeric"
      }
    );
  }

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return text;
  }

  return d.toLocaleDateString(
    "en-KE",
    {
      year: "numeric",
      month: "short",
      day: "numeric"
    }
  );
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}


/* =========================================================
   STORAGE DAYS
   ========================================================= */

function dateOnly(value) {
  if (!value) return null;

  const text = String(value);

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(text)
  ) {
    const p =
      text.split("-").map(Number);

    return new Date(
      p[0],
      p[1] - 1,
      p[2]
    );
  }

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  );
}

function calculateStorageDays(
  dateIn,
  dateOut = null
) {
  const start =
    dateOnly(dateIn);

  if (!start) return 0;

  const end =
    dateOnly(dateOut) ||
    dateOnly(today());

  if (!end) return 0;

  return Math.max(
    0,
    Math.floor(
      (
        end.getTime() -
        start.getTime()
      ) /
      86400000
    )
  );
}

function updateVehicleStorageDays() {
  const dateIn =
    $("vehicleDateIn")?.value || "";

  const dateOut =
    $("vehicleDateOut")?.value || "";

  const days =
    calculateStorageDays(
      dateIn,
      dateOut
    );

  const el =
    $("vehicleStorageDays");

  if (el) {
    el.textContent =
      `${days} day${days === 1 ? "" : "s"}`;
  }
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
  message,
  type = "success"
) {
  const toast = $("toast");

  if (!toast) {
    console.log(message);
    return;
  }

  toast.textContent = message;
  toast.style.display = "block";

  if (type === "error") {
    toast.style.background =
      "#dc2626";
  } else if (type === "warning") {
    toast.style.background =
      "#f59e0b";
  } else {
    toast.style.background =
      "#07111f";
  }

  clearTimeout(
    window.garageToastTimer
  );

  window.garageToastTimer =
    setTimeout(() => {
      toast.style.display =
        "none";
    }, 3500);
}


/* =========================================================
   MODALS
   ========================================================= */

function openModal(id) {
  const modal = $(id);

  if (!modal) return;

  modal.classList.add("show");
  modal.style.display = "flex";
}

function closeModal(id) {
  const modal = $(id);

  if (!modal) return;

  modal.classList.remove("show");
  modal.style.display = "none";
}


/* =========================================================
   STATUS BADGE
   ========================================================= */

function statusBadge(status) {
  const value =
    normalizeStatus(status) || "—";

  let cls = "status-default";

  if (value === "Under Repair") {
    cls = "status-under-repair";
  }

  if (value === "Completed") {
    cls = "status-completed";
  }

  if (value === "Pending") {
    cls = "status-pending";
  }

  if (value === "Approved") {
    cls = "status-approved";
  }

  if (value === "Purchased") {
    cls = "status-purchased";
  }

  if (value === "Rejected") {
    cls = "status-rejected";
  }

  return `
    <span class="status ${cls}">
      ${escapeHtml(value)}
    </span>
  `;
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function showSection(
  sectionId,
  clickedButton = null
) {
  document
    .querySelectorAll(".app-section")
    .forEach(section => {
      section.style.display =
        section.id === sectionId
          ? "block"
          : "none";
    });

  document
    .querySelectorAll(
      ".nav-btn, .mobile-nav-btn"
    )
    .forEach(button => {
      button.classList.remove(
        "active"
      );
    });

  if (clickedButton) {
    clickedButton.classList.add(
      "active"
    );
  } else {
    document
      .querySelectorAll(
        ".nav-btn, .mobile-nav-btn"
      )
      .forEach(button => {
        const click =
          button.getAttribute(
            "onclick"
          ) || "";

        if (
          click.includes(
            `showSection('${sectionId}'`
          )
        ) {
          button.classList.add(
            "active"
          );
        }
      });
  }
}


/* =========================================================
   LOAD DATA
   ========================================================= */

async function loadTable(table) {
  let result =
    await supabase
      .from(table)
      .select("*");

  return result;
}

async function loadAllData() {
  try {
    const [
      vehicleResult,
      expenseResult,
      pettyResult,
      reqResult
    ] = await Promise.all([
      loadTable("vehicles"),
      loadTable("expenses"),
      loadTable("petty_cash"),
      loadTable("requisitions")
    ]);

    const errors = [];

    if (vehicleResult.error) {
      errors.push(
        "Vehicles: " +
        vehicleResult.error.message
      );
    }

    if (expenseResult.error) {
      errors.push(
        "Expenses: " +
        expenseResult.error.message
      );
    }

    if (pettyResult.error) {
      errors.push(
        "Petty Cash: " +
        pettyResult.error.message
      );
    }

    if (reqResult.error) {
      errors.push(
        "Requisitions: " +
        reqResult.error.message
      );
    }

    vehicles =
      vehicleResult.data || [];

    expenses =
      expenseResult.data || [];

    pettyCash =
      pettyResult.data || [];

    requisitions =
      reqResult.data || [];

    renderAll();

    populateVehicleSelects();

    populateCategoryFilters();

    if (errors.length) {
      console.error(
        "SUPABASE ERRORS:",
        errors
      );

      showToast(
        errors.join(" | "),
        "error"
      );
    }

  } catch (error) {
    console.error(
      "LOAD ERROR:",
      error
    );

    showToast(
      "Unable to load garage data: " +
      error.message,
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
  renderDashboardActivity();
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
        normalizeStatus(
          v.status
        ) === "Under Repair"
    ).length;

  const billed =
    vehicles.reduce(
      (sum, v) =>
        sum + num(v.billed),
      0
    );

  const paid =
    vehicles.reduce(
      (sum, v) =>
        sum + num(v.paid),
      0
    );

  const outstanding =
    Math.max(
      0,
      billed - paid
    );

  const totalExpenses =
    expenses.reduce(
      (sum, e) =>
        sum + num(e.amount),
      0
    );

  const totalPetty =
    pettyCash.reduce(
      (sum, p) =>
        sum + num(p.amount),
      0
    );

  const reqCount =
    requisitions.length;

  const reqTotal =
    requisitions.reduce(
      (sum, r) =>
        sum +
        num(r.total_amount),
      0
    );

  if ($("dashVehicles")) {
    $("dashVehicles").textContent =
      totalVehicles;
  }

  if ($("dashRepair")) {
    $("dashRepair").textContent =
      repair;
  }

  if ($("dashOutstanding")) {
    $("dashOutstanding").textContent =
      money(outstanding);
  }

  if ($("dashReq")) {
    $("dashReq").textContent =
      reqCount;
  }

  if ($("dashBilled")) {
    $("dashBilled").textContent =
      money(billed);
  }

  if ($("dashPaid")) {
    $("dashPaid").textContent =
      money(paid);
  }

  if ($("dashExpenses")) {
    $("dashExpenses").textContent =
      money(totalExpenses);
  }

  if ($("dashPetty")) {
    $("dashPetty").textContent =
      money(totalPetty);
  }

  if ($("dashReqCount")) {
    $("dashReqCount").textContent =
      reqCount;
  }

  if ($("dashReqTotal")) {
    $("dashReqTotal").textContent =
      money(reqTotal);
  }

  if ($("reqOverallTotal")) {
    $("reqOverallTotal").textContent =
      money(reqTotal);
  }
}


/* =========================================================
   DASHBOARD ACTIVITY
   ========================================================= */

function renderDashboardActivity() {
  const box =
    $("dashboardActivity");

  if (!box) return;

  const activity = [];

  vehicles.forEach(v => {
    activity.push({
      date:
        v.date_in || "",
      icon: "🚘",
      title:
        v.registration ||
        "Vehicle",
      description:
        `${v.customer || "No customer"} • ${v.status || "—"}`
    });
  });

  expenses.forEach(e => {
    const vehicle =
      vehicles.find(
        v =>
          String(v.id) ===
          String(e.vehicle_id)
      );

    activity.push({
      date:
        e.expense_date || "",
      icon: "💳",
      title:
        "Expense recorded",
      description:
        `${vehicle?.registration || "General"} • ${money(e.amount)}`
    });
  });

  requisitions.forEach(r => {
    activity.push({
      date:
        r.req_date || "",
      icon: "📋",
      title:
        r.req_no ||
        "Requisition",
      description:
        `${r.status || "Pending"} • ${money(r.total_amount)}`
    });
  });

  activity.sort(
    (a, b) =>
      new Date(b.date || 0) -
      new Date(a.date || 0)
  );

  const recent =
    activity.slice(0, 6);

  if (!recent.length) {
    box.innerHTML = `
      <div class="activity-item">
        <div class="activity-icon">
          📊
        </div>
        <div class="activity-main">
          <strong>
            No activity yet
          </strong>
          <span>
            Your latest activity
            will appear here.
          </span>
        </div>
      </div>
    `;

    return;
  }

  box.innerHTML =
    recent.map(item => `
      <div class="activity-item">

        <div class="activity-icon">
          ${item.icon}
        </div>

        <div class="activity-main">

          <strong>
            ${escapeHtml(
              item.title
            )}
          </strong>

          <span>
            ${escapeHtml(
              item.description
            )}
          </span>

        </div>

      </div>
    `).join("");
}


/* =========================================================
   VEHICLE SELECTS
   ========================================================= */

function populateVehicleSelects() {
  [
    $("expenseVehicle"),
    $("reqVehicle")
  ].forEach(field => {
    if (!field) return;

    const oldValue =
      field.value || "";

    const isExpense =
      field.id ===
      "expenseVehicle";

    field.innerHTML = `
      <option value="">
        ${
          isExpense
            ? "General Expense"
            : "Select Vehicle"
        }
      </option>
    `;

    vehicles.forEach(vehicle => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        vehicle.id;

      option.textContent =
        `${vehicle.registration || "—"}${vehicle.customer ? " — " + vehicle.customer : ""}`;

      field.appendChild(option);
    });

    if (
      oldValue &&
      [...field.options].some(
        option =>
          String(option.value) ===
          String(oldValue)
      )
    ) {
      field.value =
        oldValue;
    }
  });
}


/* =========================================================
   CATEGORY FILTERS
   ========================================================= */

function populateCategoryFilters() {
  const expenseFilter =
    $("expenseCategoryFilter");

  if (expenseFilter) {
    const old =
      expenseFilter.value;

    const list =
      [
        ...EXPENSE_CATEGORIES,
        ...expenses
          .map(e => e.category)
          .filter(Boolean)
      ];

    const unique =
      [...new Set(list)];

    expenseFilter.innerHTML = `
      <option value="">
        All Categories
      </option>
      ${unique.map(c => `
        <option value="${escapeHtml(c)}">
          ${escapeHtml(c)}
        </option>
      `).join("")}
    `;

    if (unique.includes(old)) {
      expenseFilter.value = old;
    }
  }

  const pettyFilter =
    $("pettyCategoryFilter");

  if (pettyFilter) {
    const old =
      pettyFilter.value;

    const list =
      [
        ...PETTY_CATEGORIES,
        ...pettyCash
          .map(p => p.category)
          .filter(Boolean)
      ];

    const unique =
      [...new Set(list)];

    pettyFilter.innerHTML = `
      <option value="">
        All Categories
      </option>
      ${unique.map(c => `
        <option value="${escapeHtml(c)}">
          ${escapeHtml(c)}
        </option>
      `).join("")}
    `;

    if (unique.includes(old)) {
      pettyFilter.value = old;
    }
  }
}


/* =========================================================
   =========================================================
   PART 1 END HERE
   =========================================================
   PART 2 START HERE
   VEHICLES
   =========================================================
   ========================================================= */


/* =========================================================
   VEHICLE FORM
   ========================================================= */

function resetVehicleForm() {
  editingVehicleId = null;

  $("vehicleForm")?.reset();

  if ($("vehicleId")) {
    $("vehicleId").value = "";
  }

  if ($("vehicleDateIn")) {
    $("vehicleDateIn").value =
      today();
  }

  if ($("vehicleDateOut")) {
    $("vehicleDateOut").value =
      "";
  }

  if ($("vehicleJobType")) {
    $("vehicleJobType").value =
      "Repair";
  }

  if ($("vehicleStatus")) {
    $("vehicleStatus").value =
      "Under Repair";
  }

  if ($("vehicleBilled")) {
    $("vehicleBilled").value =
      "0";
  }

  if ($("vehiclePaid")) {
    $("vehiclePaid").value =
      "0";
  }

  if ($("vehicleModalTitle")) {
    $("vehicleModalTitle").textContent =
      "Add Vehicle";
  }

  updateVehicleStorageDays();
}


/* =========================================================
   OPEN VEHICLE
   ========================================================= */

function openVehicleModal(id = null) {
  if (!id) {
    resetVehicleForm();

    openModal("vehicleModal");

    return;
  }

  const vehicle =
    vehicles.find(
      v =>
        String(v.id) ===
        String(id)
    );

  if (!vehicle) {
    showToast(
      "Vehicle not found.",
      "error"
    );

    return;
  }

  editingVehicleId =
    vehicle.id;

  if ($("vehicleModalTitle")) {
    $("vehicleModalTitle").textContent =
      "Edit Vehicle";
  }

  if ($("vehicleId")) {
    $("vehicleId").value =
      vehicle.id;
  }

  if ($("vehicleRegistration")) {
    $("vehicleRegistration").value =
      vehicle.registration || "";
  }

  if ($("vehicleCustomer")) {
    $("vehicleCustomer").value =
      vehicle.customer || "";
  }

  if ($("vehicleDateIn")) {
    $("vehicleDateIn").value =
      vehicle.date_in || "";
  }

  if ($("vehicleDateOut")) {
    $("vehicleDateOut").value =
      vehicle.date_out || "";
  }

  if ($("vehicleJobType")) {
    $("vehicleJobType").value =
      VEHICLE_JOB_TYPES.includes(
        vehicle.job_type
      )
        ? vehicle.job_type
        : "Repair";
  }

  if ($("vehicleStatus")) {
    $("vehicleStatus").value =
      VEHICLE_STATUSES.includes(
        vehicle.status
      )
        ? vehicle.status
        : "Under Repair";
  }

  if ($("vehicleReleasedTo")) {
    $("vehicleReleasedTo").value =
      vehicle.released_to || "";
  }

  if ($("vehicleReleasedContact")) {
    $("vehicleReleasedContact").value =
      vehicle.released_contact || "";
  }

  if ($("vehicleBilled")) {
    $("vehicleBilled").value =
      num(vehicle.billed);
  }

  if ($("vehiclePaid")) {
    $("vehiclePaid").value =
      num(vehicle.paid);
  }

  if ($("vehicleDescription")) {
    $("vehicleDescription").value =
      vehicle.description || "";
  }

  updateVehicleStorageDays();

  openModal("vehicleModal");
}


/* =========================================================
   SAVE VEHICLE
   ========================================================= */

async function saveVehicle(event) {
  event?.preventDefault();

  const registration =
    $("vehicleRegistration")
      ?.value
      .trim();

  const customer =
    $("vehicleCustomer")
      ?.value
      .trim();

  const dateIn =
    $("vehicleDateIn")
      ?.value;

  const dateOut =
    $("vehicleDateOut")
      ?.value || null;

  const jobType =
    $("vehicleJobType")
      ?.value ||
    "Repair";

  const status =
    $("vehicleStatus")
      ?.value ||
    "Under Repair";

  if (!registration) {
    showToast(
      "Registration / Chassis No. is required.",
      "error"
    );

    return;
  }

  if (!customer) {
    showToast(
      "Customer is required.",
      "error"
    );

    return;
  }

  if (!dateIn) {
    showToast(
      "Date In is required.",
      "error"
    );

    return;
  }

  const payload = {
    registration,
    customer,
    date_in: dateIn,
    date_out: dateOut,
    job_type: jobType,
    status,
    released_to:
      $("vehicleReleasedTo")
        ?.value
        .trim() || null,
    released_contact:
      $("vehicleReleasedContact")
        ?.value
        .trim() || null,
    billed:
      num(
        $("vehicleBilled")
          ?.value
      ),
    paid:
      num(
        $("vehiclePaid")
          ?.value
      ),
    description:
      $("vehicleDescription")
        ?.value
        .trim() || null
  };

  try {
    let result;

    if (editingVehicleId) {
      result =
        await supabase
          .from("vehicles")
          .update(payload)
          .eq(
            "id",
            editingVehicleId
          );
    } else {
      result =
        await supabase
          .from("vehicles")
          .insert([
            payload
          ]);
    }

    if (result.error) {
      console.error(
        result.error
      );

      showToast(
        result.error.message,
        "error"
      );

      return;
    }

    showToast(
      editingVehicleId
        ? "Vehicle updated successfully."
        : "Vehicle added successfully."
    );

    closeModal("vehicleModal");

    resetVehicleForm();

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      "Unable to save vehicle.",
      "error"
    );
  }
}


/* =========================================================
   DELETE VEHICLE
   ========================================================= */

async function deleteVehicle(id) {
  const vehicle =
    vehicles.find(
      v =>
        String(v.id) ===
        String(id)
    );

  if (!vehicle) return;

  if (
    !confirm(
      `Delete vehicle ${vehicle.registration || ""}?`
    )
  ) {
    return;
  }

  try {
    const result =
      await supabase
        .from("vehicles")
        .delete()
        .eq("id", id);

    if (result.error) {
      showToast(
        result.error.message,
        "error"
      );

      return;
    }

    showToast(
      "Vehicle deleted successfully."
    );

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      "Unable to delete vehicle.",
      "error"
    );
  }
}


/* =========================================================
   RENDER VEHICLES
   EXACTLY 9 TABLE COLUMNS
   ========================================================= */

function renderVehicles() {
  const body =
    $("vehiclesTableBody");

  if (!body) return;

  const search =
    (
      $("vehicleSearch")
        ?.value || ""
    )
      .trim()
      .toLowerCase();

  const statusFilter =
    $("vehicleStatusFilter")
      ?.value || "";

  const filtered =
    vehicles.filter(vehicle => {
      const text =
        [
          vehicle.registration,
          vehicle.customer,
          vehicle.job_type,
          vehicle.status,
          vehicle.released_to,
          vehicle.released_contact
        ]
          .join(" ")
          .toLowerCase();

      return (
        (!search ||
          text.includes(search)) &&
        (!statusFilter ||
          normalizeStatus(
            vehicle.status
          ) ===
          statusFilter)
      );
    });

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td
          colspan="9"
          style="text-align:center;padding:30px"
        >
          No vehicles found
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    filtered.map(vehicle => {
      const billed =
        num(vehicle.billed);

      const paid =
        num(vehicle.paid);

      const outstanding =
        Math.max(
          0,
          billed - paid
        );

      const days =
        calculateStorageDays(
          vehicle.date_in,
          vehicle.date_out
        );

      return `
        <tr>

          <td>
            <strong>
              ${escapeHtml(
                vehicle.registration ||
                "—"
              )}
            </strong>
          </td>

          <td>
            ${escapeHtml(
              vehicle.customer ||
              "—"
            )}
          </td>

          <td>
            ${escapeHtml(
              formatDate(
                vehicle.date_in
              )
            )}

            <small
              style="
                display:block;
                color:#94a3b8;
                margin-top:3px;
              "
            >
              ${
                vehicle.date_out
                  ? "Out: " +
                    formatDate(
                      vehicle.date_out
                    ) +
                    " • "
                  : ""
              }
              Storage: ${days}
              day${days === 1 ? "" : "s"}
            </small>
          </td>

          <td>
            ${escapeHtml(
              vehicle.job_type ||
              "—"
            )}
          </td>

          <td>
            ${statusBadge(
              vehicle.status
            )}
          </td>

          <td>
            ${money(billed)}
          </td>

          <td>
            ${money(paid)}
          </td>

          <td>
            ${money(outstanding)}
          </td>

          <td>
            <div class="table-actions">

              <button
                class="action-btn"
                onclick="openVehicleModal('${escapeHtml(vehicle.id)}')"
                title="Edit"
              >
                ✏️
              </button>

              <button
                class="action-btn"
                onclick="openVehicleExpenses('${escapeHtml(vehicle.id)}')"
                title="Expenses"
              >
                💳
              </button>

              <button
                class="action-btn"
                onclick="deleteVehicle('${escapeHtml(vehicle.id)}')"
                title="Delete"
              >
                🗑
              </button>

            </div>
          </td>

        </tr>
      `;
    }).join("");
}


/* =========================================================
   VEHICLE EXPENSE PREVIEW
   ========================================================= */

function getVehicleExpenses(id) {
  return expenses.filter(
    e =>
      String(e.vehicle_id) ===
      String(id)
  );
}

function openVehicleExpenses(id) {
  const vehicle =
    vehicles.find(
      v =>
        String(v.id) ===
        String(id)
    );

  if (!vehicle) {
    showToast(
      "Vehicle not found.",
      "error"
    );

    return;
  }

  selectedVehicleExpenseId =
    id;

  const list =
    getVehicleExpenses(id);

  const total =
    list.reduce(
      (sum, e) =>
        sum + num(e.amount),
      0
    );

  const content =
    $("vehicleExpensePreviewContent");

  if (!content) return;

  content.innerHTML = `
    <h3>
      ${escapeHtml(
        vehicle.registration ||
        "Vehicle"
      )}
    </h3>

    <p>
      ${escapeHtml(
        vehicle.customer || ""
      )}
    </p>

    <div
      style="
        padding:14px;
        background:#f8fafc;
        border-radius:12px;
        margin:12px 0;
      "
    >
      <strong>
        Total Expenses
      </strong>

      <div
        style="
          font-size:22px;
          font-weight:800;
          margin-top:5px;
        "
      >
        ${money(total)}
      </div>
    </div>

    ${
      list.length
        ? list.map(e => `
          <div
            style="
              padding:12px 0;
              border-bottom:1px solid #e5e7eb;
            "
          >

            <strong>
              ${escapeHtml(
                e.description ||
                "Expense"
              )}
            </strong>

            <div
              style="
                color:#64748b;
                font-size:12px;
              "
            >
              ${escapeHtml(
                formatDate(
                  e.expense_date
                )
              )}
              •
              ${escapeHtml(
                e.category || ""
              )}
            </div>

            <strong>
              ${money(e.amount)}
            </strong>

          </div>
        `).join("")
        : `
          <p>
            No expenses recorded
            for this vehicle.
          </p>
        `
    }
  `;

  openModal(
    "vehicleExpensePreviewModal"
  );
}


/* =========================================================
   =========================================================
   PART 2 END HERE
   =========================================================
   PART 3 START HERE
   EXPENSES + PETTY CASH
   =========================================================
   ========================================================= */


/* =========================================================
   EXPENSE FORM
   ========================================================= */

function resetExpenseForm() {
  editingExpenseId = null;

  $("expenseForm")?.reset();

  if ($("expenseId")) {
    $("expenseId").value = "";
  }

  if ($("expenseDate")) {
    $("expenseDate").value =
      today();
  }

  if ($("expenseCategory")) {
    $("expenseCategory").value =
      "Materials";
  }

  populateVehicleSelects();

  if ($("expenseModalTitle")) {
    $("expenseModalTitle").textContent =
      "Add Expense";
  }
}

function openExpenseModal(id = null) {
  populateVehicleSelects();

  if (!id) {
    resetExpenseForm();

    openModal("expenseModal");

    return;
  }

  const expense =
    expenses.find(
      e =>
        String(e.id) ===
        String(id)
    );

  if (!expense) {
    showToast(
      "Expense not found.",
      "error"
    );

    return;
  }

  editingExpenseId =
    expense.id;

  if ($("expenseModalTitle")) {
    $("expenseModalTitle").textContent =
      "Edit Expense";
  }

  if ($("expenseId")) {
    $("expenseId").value =
      expense.id;
  }

  if ($("expenseVehicle")) {
    $("expenseVehicle").value =
      expense.vehicle_id || "";
  }

  if ($("expenseDate")) {
    $("expenseDate").value =
      expense.expense_date || "";
  }

  if ($("expenseCategory")) {
    $("expenseCategory").value =
      expense.category || "Materials";
  }

  if ($("expenseAmount")) {
    $("expenseAmount").value =
      num(expense.amount);
  }

  if ($("expenseDescription")) {
    $("expenseDescription").value =
      expense.description || "";
  }

  openModal("expenseModal");
}


/* =========================================================
   SAVE EXPENSE
   ========================================================= */

async function saveExpense(event) {
  event?.preventDefault();

  const vehicleId =
    $("expenseVehicle")
      ?.value || null;

  const expenseDate =
    $("expenseDate")
      ?.value ||
    today();

  const category =
    $("expenseCategory")
      ?.value;

  const amount =
    num(
      $("expenseAmount")
        ?.value
    );

  const description =
    $("expenseDescription")
      ?.value
      .trim();

  if (!category) {
    showToast(
      "Please select a category.",
      "error"
    );

    return;
  }

  if (!description) {
    showToast(
      "Description is required.",
      "error"
    );

    return;
  }

  if (amount <= 0) {
    showToast(
      "Amount must be greater than zero.",
      "error"
    );

    return;
  }

  const payload = {
    vehicle_id:
      vehicleId,
    expense_date:
      expenseDate,
    description:
      description,
    category:
      category,
    amount:
      amount
  };

  try {
    let result;

    if (editingExpenseId) {
      result =
        await supabase
          .from("expenses")
          .update(payload)
          .eq(
            "id",
            editingExpenseId
          );
    } else {
      result =
        await supabase
          .from("expenses")
          .insert([
            payload
          ]);
    }

    if (result.error) {
      showToast(
        result.error.message,
        "error"
      );

      return;
    }

    showToast(
      editingExpenseId
        ? "Expense updated successfully."
        : "Expense added successfully."
    );

    closeModal("expenseModal");

    resetExpenseForm();

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      "Unable to save expense.",
      "error"
    );
  }
}


/* =========================================================
   DELETE EXPENSE
   ========================================================= */

async function deleteExpense(id) {
  const expense =
    expenses.find(
      e =>
        String(e.id) ===
        String(id)
    );

  if (!expense) return;

  if (
    !confirm(
      `Delete expense "${expense.description || ""}"?`
    )
  ) {
    return;
  }

  try {
    const result =
      await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

    if (result.error) {
      showToast(
        result.error.message,
        "error"
      );

      return;
    }

    showToast(
      "Expense deleted successfully."
    );

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      "Unable to delete expense.",
      "error"
    );
  }
}


/* =========================================================
   RENDER EXPENSES
   EXACTLY 6 COLUMNS
   ========================================================= */

function renderExpenses() {
  const body =
    $("expensesTableBody");

  if (!body) return;

  const search =
    (
      $("expenseSearch")
        ?.value || ""
    )
      .trim()
      .toLowerCase();

  const category =
    $("expenseCategoryFilter")
      ?.value || "";

  const filtered =
    expenses.filter(e => {
      const vehicle =
        vehicles.find(
          v =>
            String(v.id) ===
            String(e.vehicle_id)
        );

      const text =
        [
          e.description,
          e.category,
          vehicle?.registration,
          vehicle?.customer
        ]
          .join(" ")
          .toLowerCase();

      return (
        (!search ||
          text.includes(search)) &&
        (!category ||
          e.category === category)
      );
    });

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td
          colspan="6"
          style="text-align:center;padding:30px"
        >
          No expenses found
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    filtered.map(e => {
      const vehicle =
        vehicles.find(
          v =>
            String(v.id) ===
            String(e.vehicle_id)
        );

      return `
        <tr>

          <td>
            ${escapeHtml(
              formatDate(
                e.expense_date
              )
            )}
          </td>

          <td>
            ${escapeHtml(
              vehicle?.registration ||
              "General"
            )}
          </td>

          <td>
            ${escapeHtml(
              e.description || "—"
            )}
          </td>

          <td>
            ${escapeHtml(
              e.category || "—"
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
                onclick="openExpenseModal('${escapeHtml(e.id)}')"
              >
                ✏️
              </button>

              <button
                class="action-btn"
                onclick="deleteExpense('${escapeHtml(e.id)}')"
              >
                🗑
              </button>

            </div>
          </td>

        </tr>
      `;
    }).join("");
}


/* =========================================================
   PETTY CASH
   ========================================================= */

function resetPettyForm() {
  editingPettyId = null;

  $("pettyForm")?.reset();

  if ($("pettyId")) {
    $("pettyId").value = "";
  }

  if ($("pettyDate")) {
    $("pettyDate").value =
      today();
  }

  if ($("pettyCategory")) {
    $("pettyCategory").value =
      "Other";
  }

  if ($("pettyModalTitle")) {
    $("pettyModalTitle").textContent =
      "Add Petty Cash";
  }
}

function openPettyModal(id = null) {
  if (!id) {
    resetPettyForm();

    openModal("pettyModal");

    return;
  }

  const item =
    pettyCash.find(
      p =>
        String(p.id) ===
        String(id)
    );

  if (!item) {
    showToast(
      "Petty cash entry not found.",
      "error"
    );

    return;
  }

  editingPettyId =
    item.id;

  if ($("pettyModalTitle")) {
    $("pettyModalTitle").textContent =
      "Edit Petty Cash";
  }

  if ($("pettyId")) {
    $("pettyId").value =
      item.id;
  }

  if ($("pettyDate")) {
    $("pettyDate").value =
      item.cash_date || "";
  }

  if ($("pettyPaidTo")) {
    $("pettyPaidTo").value =
      item.paid_to || "";
  }

  if ($("pettyCategory")) {
    $("pettyCategory").value =
      item.category || "Other";
  }

  if ($("pettyAmount")) {
    $("pettyAmount").value =
      num(item.amount);
  }

  if ($("pettyDescription")) {
    $("pettyDescription").value =
      item.description || "";
  }

  if ($("pettyNotes")) {
    $("pettyNotes").value =
      item.notes || "";
  }

  openModal("pettyModal");
}


/* =========================================================
   SAVE PETTY CASH
   ========================================================= */

async function savePetty(event) {
  event?.preventDefault();

  const cashDate =
    $("pettyDate")
      ?.value ||
    today();

  const paidTo =
    $("pettyPaidTo")
      ?.value
      .trim();

  const category =
    $("pettyCategory")
      ?.value;

  const amount =
    num(
      $("pettyAmount")
        ?.value
    );

  const description =
    $("pettyDescription")
      ?.value
      .trim();

  const notes =
    $("pettyNotes")
      ?.value
      .trim() || null;

  if (!paidTo) {
    showToast(
      "Paid To is required.",
      "error"
    );

    return;
  }

  if (!category) {
    showToast(
      "Please select a category.",
      "error"
    );

    return;
  }

  if (!description) {
    showToast(
      "Description is required.",
      "error"
    );

    return;
  }

  if (amount <= 0) {
    showToast(
      "Amount must be greater than zero.",
      "error"
    );

    return;
  }

  const payload = {
    cash_date:
      cashDate,
    description:
      description,
    paid_to:
      paidTo,
    category:
      category,
    amount:
      amount,
    notes:
      notes
  };

  try {
    let result;

    if (editingPettyId) {
      result =
        await supabase
          .from("petty_cash")
          .update(payload)
          .eq(
            "id",
            editingPettyId
          );
    } else {
      result =
        await supabase
          .from("petty_cash")
          .insert([
            payload
          ]);
    }

    if (result.error) {
      showToast(
        result.error.message,
        "error"
      );

      return;
    }

    showToast(
      editingPettyId
        ? "Petty cash updated successfully."
        : "Petty cash added successfully."
    );

    closeModal("pettyModal");

    resetPettyForm();

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      "Unable to save petty cash.",
      "error"
    );
  }
}


/* =========================================================
   DELETE PETTY CASH
   ========================================================= */

async function deletePetty(id) {
  const item =
    pettyCash.find(
      p =>
        String(p.id) ===
        String(id)
    );

  if (!item) return;

  if (
    !confirm(
      `Delete petty cash "${item.description || ""}"?`
    )
  ) {
    return;
  }

  try {
    const result =
      await supabase
        .from("petty_cash")
        .delete()
        .eq("id", id);

    if (result.error) {
      showToast(
        result.error.message,
        "error"
      );

      return;
    }

    showToast(
      "Petty cash deleted successfully."
    );

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      "Unable to delete petty cash.",
      "error"
    );
  }
}


/* =========================================================
   RENDER PETTY CASH
   EXACTLY 7 COLUMNS
   ========================================================= */

function renderPettyCash() {
  const body =
    $("pettyTableBody");

  if (!body) return;

  const search =
    (
      $("pettySearch")
        ?.value || ""
    )
      .trim()
      .toLowerCase();

  const category =
    $("pettyCategoryFilter")
      ?.value || "";

  const filtered =
    pettyCash.filter(p => {
      const text =
        [
          p.description,
          p.paid_to,
          p.category,
          p.notes
        ]
          .join(" ")
          .toLowerCase();

      return (
        (!search ||
          text.includes(search)) &&
        (!category ||
          p.category === category)
      );
    });

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td
          colspan="7"
          style="text-align:center;padding:30px"
        >
          No petty cash records found
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    filtered.map(p => `
      <tr>

        <td>
          ${escapeHtml(
            formatDate(
              p.cash_date
            )
          )}
        </td>

        <td>
          ${escapeHtml(
            p.description || "—"
          )}
        </td>

        <td>
          ${escapeHtml(
            p.paid_to || "—"
          )}
        </td>

        <td>
          ${escapeHtml(
            p.category || "—"
          )}
        </td>

        <td>
          <strong>
            ${money(p.amount)}
          </strong>
        </td>

        <td>
          ${escapeHtml(
            p.notes || "—"
          )}
        </td>

        <td>
          <div class="table-actions">

            <button
              class="action-btn"
              onclick="openPettyModal('${escapeHtml(p.id)}')"
            >
              ✏️
            </button>

            <button
              class="action-btn"
              onclick="deletePetty('${escapeHtml(p.id)}')"
            >
              🗑
            </button>

          </div>
        </td>

      </tr>
    `).join("");
}


/* =========================================================
   =========================================================
   PART 3 END HERE
   =========================================================
   PART 4 START HERE
   REQUISITIONS + PRINTING + STARTUP
   =========================================================
   ========================================================= */


/* =========================================================
   REQUISITIONS
   ========================================================= */

function generateReqNo() {
  const year =
    new Date().getFullYear();

  let highest = 0;

  requisitions.forEach(r => {
    const match =
      String(
        r.req_no || ""
      ).match(/(\d+)$/);

    if (match) {
      highest =
        Math.max(
          highest,
          Number(match[1])
        );
    }
  });

  return (
    `REQ-${year}-` +
    String(
      highest + 1
    ).padStart(4, "0")
  );
}

function resetReqForm() {
  editingReqId = null;

  $("reqForm")?.reset();

  if ($("reqId")) {
    $("reqId").value = "";
  }

  if ($("reqNo")) {
    $("reqNo").value =
      generateReqNo();
  }

  if ($("reqDate")) {
    $("reqDate").value =
      today();
  }

  if ($("reqQuantity")) {
    $("reqQuantity").value =
      "1";
  }

  if ($("reqUnitCost")) {
    $("reqUnitCost").value =
      "0";
  }

  if ($("reqTotal")) {
    $("reqTotal").value =
      "0.00";
  }

  if ($("reqStatus")) {
    $("reqStatus").value =
      "Pending";
  }

  populateVehicleSelects();

  if ($("reqModalTitle")) {
    $("reqModalTitle").textContent =
      "New Requisition";
  }
}

function calculateReqTotal() {
  const quantity =
    num(
      $("reqQuantity")
        ?.value
    );

  const unitCost =
    num(
      $("reqUnitCost")
        ?.value
    );

  const total =
    quantity * unitCost;

  if ($("reqTotal")) {
    $("reqTotal").value =
      total.toFixed(2);
  }

  return total;
}

function openReqModal(
  reqNo = null
) {
  populateVehicleSelects();

  if (!reqNo) {
    resetReqForm();

    openModal("reqModal");

    return;
  }

  const rows =
    requisitions.filter(
      r =>
        String(r.req_no) ===
        String(reqNo)
    );

  if (!rows.length) {
    showToast(
      "Requisition not found.",
      "error"
    );

    return;
  }

  const r = rows[0];

  editingReqId =
    r.id;

  if ($("reqModalTitle")) {
    $("reqModalTitle").textContent =
      "Edit Requisition";
  }

  if ($("reqId")) {
    $("reqId").value =
      r.id;
  }

  if ($("reqNo")) {
    $("reqNo").value =
      r.req_no || "";
  }

  if ($("reqDate")) {
    $("reqDate").value =
      r.req_date || "";
  }

  if ($("reqRequestedBy")) {
    $("reqRequestedBy").value =
      r.requested_by || "";
  }

  if ($("reqVehicle")) {
    $("reqVehicle").value =
      r.vehicle_id || "";
  }

  if ($("reqItemDescription")) {
    $("reqItemDescription").value =
      r.item_description || "";
  }

  if ($("reqQuantity")) {
    $("reqQuantity").value =
      num(r.quantity);
  }

  if ($("reqUnitCost")) {
    $("reqUnitCost").value =
      num(r.unit_cost);
  }

  if ($("reqTotal")) {
    $("reqTotal").value =
      num(r.total_amount)
        .toFixed(2);
  }

  if ($("reqStatus")) {
    $("reqStatus").value =
      r.status || "Pending";
  }

  if ($("reqCategory")) {
    $("reqCategory").value =
      r.category || "";
  }

  if ($("reqExpenseType")) {
    $("reqExpenseType").value =
      r.expense_type || "";
  }

  if ($("reqNotes")) {
    $("reqNotes").value =
      r.notes || "";
  }

  openModal("reqModal");
}


/* =========================================================
   SAVE REQUISITION
   ========================================================= */

async function saveReq(event) {
  event?.preventDefault();

  const reqNo =
    $("reqNo")
      ?.value
      .trim() ||
    generateReqNo();

  const reqDate =
    $("reqDate")
      ?.value ||
    today();

  const requestedBy =
    $("reqRequestedBy")
      ?.value
      .trim();

  const vehicleId =
    $("reqVehicle")
      ?.value ||
    null;

  const itemDescription =
    $("reqItemDescription")
      ?.value
      .trim();

  const quantity =
    num(
      $("reqQuantity")
        ?.value
    );

  const unitCost =
    num(
      $("reqUnitCost")
        ?.value
    );

  const totalAmount =
    quantity * unitCost;

  const status =
    $("reqStatus")
      ?.value ||
    "Pending";

  const notes =
    $("reqNotes")
      ?.value
      .trim() ||
    null;

  if (!requestedBy) {
    showToast(
      "Requested By is required.",
      "error"
    );

    return;
  }

  if (!itemDescription) {
    showToast(
      "Item Description is required.",
      "error"
    );

    return;
  }

  if (quantity <= 0) {
    showToast(
      "Quantity must be greater than zero.",
      "error"
    );

    return;
  }

  /*
   * Only the known existing Supabase
   * requisitions columns are sent.
   *
   * This prevents reqCategory /
   * reqExpenseType from breaking
   * the save if those columns do
   * not exist in Supabase.
   */
  const payload = {
    req_no:
      reqNo,

    req_date:
      reqDate,

    requested_by:
      requestedBy,

    vehicle_id:
      vehicleId,

    item_description:
      itemDescription,

    quantity:
      quantity,

    unit_cost:
      unitCost,

    total_amount:
      totalAmount,

    status:
      status,

    notes:
      notes
  };

  try {
    let result;

    if (editingReqId) {
      result =
        await supabase
          .from("requisitions")
          .update(payload)
          .eq(
            "id",
            editingReqId
          );
    } else {
      result =
        await supabase
          .from("requisitions")
          .insert([
            payload
          ]);
    }

    if (result.error) {
      showToast(
        result.error.message,
        "error"
      );

      return;
    }

    showToast(
      editingReqId
        ? "Requisition updated successfully."
        : "Requisition created successfully."
    );

    closeModal("reqModal");

    resetReqForm();

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      "Unable to save requisition.",
      "error"
    );
  }
}


/* =========================================================
   DELETE REQUISITION
   ========================================================= */

async function deleteReq(reqNo) {
  if (!reqNo) return;

  if (
    !confirm(
      `Delete requisition ${reqNo}?`
    )
  ) {
    return;
  }

  try {
    const result =
      await supabase
        .from("requisitions")
        .delete()
        .eq(
          "req_no",
          reqNo
        );

    if (result.error) {
      showToast(
        result.error.message,
        "error"
      );

      return;
    }

    showToast(
      "Requisition deleted successfully."
    );

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      "Unable to delete requisition.",
      "error"
    );
  }
}


/* =========================================================
   RENDER REQUISITIONS
   EXACTLY 11 COLUMNS
   ========================================================= */

function renderRequisitions() {
  const body =
    $("requisitionsTableBody");

  if (!body) return;

  const search =
    (
      $("reqSearch")
        ?.value || ""
    )
      .trim()
      .toLowerCase();

  const statusFilter =
    $("reqStatusFilter")
      ?.value || "";

  const groups = {};

  requisitions.forEach(r => {
    const key =
      r.req_no ||
      r.id;

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(r);
  });

  let rows =
    Object.entries(groups)
      .map(
        ([reqNo, items]) => {
          const first =
            items[0];

          const vehicle =
            vehicles.find(
              v =>
                String(v.id) ===
                String(
                  first.vehicle_id
                )
            );

          const total =
            items.reduce(
              (sum, item) =>
                sum +
                num(
                  item.total_amount
                ),
              0
            );

          const statuses =
            [
              ...new Set(
                items.map(
                  i =>
                    normalizeStatus(
                      i.status
                    )
                )
              )
            ];

          const status =
            statuses.length === 1
              ? statuses[0]
              : "Mixed";

          return {
            reqNo,
            items,
            first,
            vehicle,
            total,
            status
          };
        }
      );

  rows =
    rows.filter(row => {
      const text =
        [
          row.reqNo,
          row.first.req_date,
          row.first.requested_by,
          row.first.item_description,
          row.vehicle?.registration,
          row.status
        ]
          .join(" ")
          .toLowerCase();

      return (
        (!search ||
          text.includes(search)) &&
        (
          !statusFilter ||
          row.status ===
            statusFilter ||
          row.items.some(
            i =>
              normalizeStatus(
                i.status
              ) ===
              statusFilter
          )
        )
      );
    });

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td
          colspan="11"
          style="text-align:center;padding:30px"
        >
          No requisitions found
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    rows.map(row => {
      const r =
        row.first;

      return `
        <tr>

          <td>
            <strong>
              ${escapeHtml(
                row.reqNo
              )}
            </strong>
          </td>

          <td>
            ${escapeHtml(
              formatDate(
                r.req_date
              )
            )}
          </td>

          <td>
            ${escapeHtml(
              r.requested_by ||
              "—"
            )}
          </td>

          <td>
            ${escapeHtml(
              row.vehicle
                ?.registration ||
              "—"
            )}
          </td>

          <td>
            ${escapeHtml(
              r.item_description ||
              "—"
            )}
          </td>

          <td>
            ${escapeHtml(
              r.quantity ??
              "—"
            )}
          </td>

          <td>
            ${money(
              r.unit_cost
            )}
          </td>

          <td>
            <strong>
              ${money(
                row.total
              )}
            </strong>
          </td>

          <td>
            ${escapeHtml(
              r.expense_type ||
              r.category ||
              "—"
            )}
          </td>

          <td>
            ${statusBadge(
              row.status
            )}
          </td>

          <td>
            <div class="table-actions">

              <button
                class="action-btn"
                onclick="openReqModal('${escapeHtml(row.reqNo)}')"
                title="Edit"
              >
                ✏️
              </button>

              <button
                class="action-btn"
                onclick="deleteReq('${escapeHtml(row.reqNo)}')"
                title="Delete"
              >
                🗑
              </button>

              <button
                class="action-btn"
                onclick="printReq('${escapeHtml(row.reqNo)}')"
                title="Print"
              >
                🖨
              </button>

            </div>
          </td>

        </tr>
      `;
    }).join("");

  const total =
    requisitions.reduce(
      (sum, r) =>
        sum +
        num(r.total_amount),
      0
    );

  if ($("reqOverallTotal")) {
    $("reqOverallTotal").textContent =
      money(total);
  }
}


/* =========================================================
   REQUISITION PREVIEW
   ========================================================= */

function previewSelectedReq(
  reqNo = null
) {
  const selected =
    reqNo ||
    selectedReqNo ||
    requisitions[0]?.req_no;

  if (!selected) {
    showToast(
      "There are no requisitions to preview.",
      "warning"
    );

    return;
  }

  selectedReqNo =
    selected;

  const rows =
    requisitions.filter(
      r =>
        String(r.req_no) ===
        String(selected)
    );

  if (!rows.length) {
    showToast(
      "Requisition not found.",
      "error"
    );

    return;
  }

  const first =
    rows[0];

  const vehicle =
    vehicles.find(
      v =>
        String(v.id) ===
        String(first.vehicle_id)
    );

  const total =
    rows.reduce(
      (sum, r) =>
        sum +
        num(r.total_amount),
      0
    );

  const content =
    $("reqPreviewContent");

  if (!content) return;

  content.innerHTML = `
    <h2>
      Requisition
      ${escapeHtml(selected)}
    </h2>

    <p>
      <strong>Date:</strong>
      ${escapeHtml(
        formatDate(
          first.req_date
        )
      )}
    </p>

    <p>
      <strong>Requested By:</strong>
      ${escapeHtml(
        first.requested_by ||
        "—"
      )}
    </p>

    <p>
      <strong>Vehicle:</strong>
      ${escapeHtml(
        vehicle?.registration ||
        "—"
      )}
    </p>

    <hr>

    ${rows.map(r => `
      <div
        style="
          padding:12px 0;
          border-bottom:1px solid #eee;
        "
      >

        <strong>
          ${escapeHtml(
            r.item_description ||
            "—"
          )}
        </strong>

        <div>
          Qty:
          ${escapeHtml(
            r.quantity
          )}
          ×
          ${money(
            r.unit_cost
          )}
        </div>

        <strong>
          ${money(
            r.total_amount
          )}
        </strong>

      </div>
    `).join("")}

    <h3>
      Total:
      ${money(total)}
    </h3>

    <p>
      <strong>Status:</strong>
      ${escapeHtml(
        first.status ||
        "Pending"
      )}
    </p>
  `;

  openModal(
    "reqPreviewModal"
  );
}


/* =========================================================
   PRINT HELPER
   ========================================================= */

function printWindow(
  title,
  content
) {
  const win =
    window.open(
      "",
      "_blank",
      "width=900,height=700"
    );

  if (!win) {
    showToast(
      "Please allow pop-ups to print.",
      "warning"
    );

    return;
  }

  win.document.write(`
    <!DOCTYPE html>

    <html>

    <head>

      <title>
        ${escapeHtml(title)}
      </title>

      <style>

        body{
          font-family:Arial,sans-serif;
          padding:30px;
          color:#111827;
        }

        h1{
          margin-bottom:5px;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:20px;
        }

        th,td{
          border:1px solid #d1d5db;
          padding:8px;
          text-align:left;
          font-size:12px;
        }

        th{
          background:#f3f4f6;
        }

        .total{
          margin-top:20px;
          font-size:18px;
          font-weight:bold;
        }

        @media print{
          body{
            padding:10px;
          }
        }

      </style>

    </head>

    <body>

      <h1>
        Garage Operations Pro
      </h1>

      <p>
        ${escapeHtml(title)}
      </p>

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


/* =========================================================
   PRINT VEHICLES
   ========================================================= */

function printVehicles() {
  const rows =
    vehicles.map(v => `
      <tr>

        <td>
          ${escapeHtml(
            v.registration
          )}
        </td>

        <td>
          ${escapeHtml(
            v.customer
          )}
        </td>

        <td>
          ${escapeHtml(
            formatDate(v.date_in)
          )}
        </td>

        <td>
          ${escapeHtml(
            v.job_type
          )}
        </td>

        <td>
          ${escapeHtml(
            v.status
          )}
        </td>

        <td>
          ${money(v.billed)}
        </td>

        <td>
          ${money(v.paid)}
        </td>

        <td>
          ${money(
            Math.max(
              0,
              num(v.billed) -
              num(v.paid)
            )
          )}
        </td>

      </tr>
    `).join("");

  printWindow(
    "Vehicle Report",
    `
      <table>

        <thead>

          <tr>
            <th>Registration</th>
            <th>Customer</th>
            <th>Date In</th>
            <th>Job Type</th>
            <th>Status</th>
            <th>Billed</th>
            <th>Paid</th>
            <th>Outstanding</th>
          </tr>

        </thead>

        <tbody>
          ${rows}
        </tbody>

      </table>
    `
  );
}


/* =========================================================
   PRINT REQUISITIONS
   ========================================================= */

function printRequisitions() {
  const rows =
    requisitions.map(r => `
      <tr>

        <td>
          ${escapeHtml(
            r.req_no
          )}
        </td>

        <td>
          ${escapeHtml(
            formatDate(
              r.req_date
            )
          )}
        </td>

        <td>
          ${escapeHtml(
            r.requested_by
          )}
        </td>

        <td>
          ${escapeHtml(
            r.item_description
          )}
        </td>

        <td>
          ${escapeHtml(
            r.quantity
          )}
        </td>

        <td>
          ${money(
            r.unit_cost
          )}
        </td>

        <td>
          ${money(
            r.total_amount
          )}
        </td>

        <td>
          ${escapeHtml(
            r.status
          )}
        </td>

      </tr>
    `).join("");

  printWindow(
    "Requisition Report",
    `
      <table>

        <thead>

          <tr>
            <th>Req No.</th>
            <th>Date</th>
            <th>Requested By</th>
            <th>Item</th>
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
    `
  );
}


/* =========================================================
   PRINT ONE REQUISITION
   ========================================================= */

function printReq(reqNo) {
  const rows =
    requisitions.filter(
      r =>
        String(r.req_no) ===
        String(reqNo)
    );

  if (!rows.length) {
    showToast(
      "Requisition not found.",
      "error"
    );

    return;
  }

  const first =
    rows[0];

  const total =
    rows.reduce(
      (sum, r) =>
        sum +
        num(r.total_amount),
      0
    );

  const items =
    rows.map(r => `
      <tr>

        <td>
          ${escapeHtml(
            r.item_description
          )}
        </td>

        <td>
          ${escapeHtml(
            r.quantity
          )}
        </td>

        <td>
          ${money(
            r.unit_cost
          )}
        </td>

        <td>
          ${money(
            r.total_amount
          )}
        </td>

      </tr>
    `).join("");

  printWindow(
    `Requisition ${reqNo}`,
    `
      <p>
        <strong>
          Requisition No:
        </strong>
        ${escapeHtml(reqNo)}
      </p>

      <p>
        <strong>
          Date:
        </strong>
        ${escapeHtml(
          formatDate(
            first.req_date
          )
        )}
      </p>

      <p>
        <strong>
          Requested By:
        </strong>
        ${escapeHtml(
          first.requested_by
        )}
      </p>

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
          ${items}
        </tbody>

      </table>

      <div class="total">
        Total:
        ${money(total)}
      </div>
    `
  );
}

function printSelectedReq() {
  if (!selectedReqNo) {
    showToast(
      "Preview a requisition first.",
      "warning"
    );

    return;
  }

  printReq(
    selectedReqNo
  );
}


/* =========================================================
   PRINT VEHICLE EXPENSES
   ========================================================= */

function printVehicleExpensePreview() {
  if (!selectedVehicleExpenseId) {
    showToast(
      "No vehicle selected.",
      "warning"
    );

    return;
  }

  const vehicle =
    vehicles.find(
      v =>
        String(v.id) ===
        String(
          selectedVehicleExpenseId
        )
    );

  if (!vehicle) return;

  const rows =
    getVehicleExpenses(
      vehicle.id
    );

  const total =
    rows.reduce(
      (sum, e) =>
        sum + num(e.amount),
      0
    );

  const table =
    rows.map(e => `
      <tr>

        <td>
          ${escapeHtml(
            formatDate(
              e.expense_date
            )
          )}
        </td>

        <td>
          ${escapeHtml(
            e.description
          )}
        </td>

        <td>
          ${escapeHtml(
            e.category
          )}
        </td>

        <td>
          ${money(e.amount)}
        </td>

      </tr>
    `).join("");

  printWindow(
    `Vehicle Expenses - ${vehicle.registration}`,
    `
      <p>
        <strong>Vehicle:</strong>
        ${escapeHtml(
          vehicle.registration
        )}
      </p>

      <p>
        <strong>Customer:</strong>
        ${escapeHtml(
          vehicle.customer
        )}
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
          ${table}
        </tbody>

      </table>

      <div class="total">
        Total Expenses:
        ${money(total)}
      </div>
    `
  );
}


/* =========================================================
   SEARCH AND FILTERS
   ========================================================= */

function bindSearchEvents() {
  const events = [
    [
      "vehicleSearch",
      renderVehicles
    ],
    [
      "vehicleStatusFilter",
      renderVehicles
    ],
    [
      "expenseSearch",
      renderExpenses
    ],
    [
      "expenseCategoryFilter",
      renderExpenses
    ],
    [
      "pettySearch",
      renderPettyCash
    ],
    [
      "pettyCategoryFilter",
      renderPettyCash
    ],
    [
      "reqSearch",
      renderRequisitions
    ],
    [
      "reqStatusFilter",
      renderRequisitions
    ]
  ];

  events.forEach(
    ([id, fn]) => {
      const element = $(id);

      if (!element) return;

      element.addEventListener(
        "input",
        fn
      );

      element.addEventListener(
        "change",
        fn
      );
    }
  );
}


/* =========================================================
   FORM EVENTS
   ========================================================= */

function bindFormEvents() {
  if ($("vehicleForm")) {
    $("vehicleForm").onsubmit =
      saveVehicle;
  }

  if ($("expenseForm")) {
    $("expenseForm").onsubmit =
      saveExpense;
  }

  if ($("pettyForm")) {
    $("pettyForm").onsubmit =
      savePetty;
  }

  if ($("reqForm")) {
    $("reqForm").onsubmit =
      saveReq;
  }

  if ($("reqQuantity")) {
    $("reqQuantity").addEventListener(
      "input",
      calculateReqTotal
    );
  }

  if ($("reqUnitCost")) {
    $("reqUnitCost").addEventListener(
      "input",
      calculateReqTotal
    );
  }

  if ($("vehicleDateIn")) {
    $("vehicleDateIn").addEventListener(
      "input",
      updateVehicleStorageDays
    );

    $("vehicleDateIn").addEventListener(
      "change",
      updateVehicleStorageDays
    );
  }

  if ($("vehicleDateOut")) {
    $("vehicleDateOut").addEventListener(
      "input",
      updateVehicleStorageDays
    );

    $("vehicleDateOut").addEventListener(
      "change",
      updateVehicleStorageDays
    );
  }
}


/* =========================================================
   CLOSE MODAL BY CLICKING OUTSIDE
   ========================================================= */

function bindModalEvents() {
  document.addEventListener(
    "click",
    event => {
      if (
        event.target &&
        event.target.classList &&
        event.target.classList.contains(
          "modal"
        )
      ) {
        event.target.classList.remove(
          "show"
        );

        event.target.style.display =
          "none";
      }
    }
  );
}


/* =========================================================
   MAKE FUNCTIONS AVAILABLE TO HTML
   ========================================================= */

Object.assign(
  window,
  {
    showSection,

    openModal,
    closeModal,

    openVehicleModal,
    saveVehicle,
    deleteVehicle,
    openVehicleExpenses,

    openExpenseModal,
    saveExpense,
    deleteExpense,

    openPettyModal,
    savePetty,
    deletePetty,

    openReqModal,
    saveReq,
    deleteReq,
    calculateReqTotal,

    previewSelectedReq,
    printSelectedReq,

    printVehicles,
    printRequisitions,
    printReq,
    printVehicleExpensePreview,

    updateVehicleStorageDays,

    loadAllData
  }
);


/* =========================================================
   START APPLICATION
   ========================================================= */

async function initGarageApp() {
  console.log(
    "Garage Operations Pro starting..."
  );

  bindFormEvents();

  bindSearchEvents();

  bindModalEvents();

  if (
    $("vehicleDateIn") &&
    !$("vehicleDateIn").value
  ) {
    $("vehicleDateIn").value =
      today();
  }

  if (
    $("expenseDate") &&
    !$("expenseDate").value
  ) {
    $("expenseDate").value =
      today();
  }

  if (
    $("pettyDate") &&
    !$("pettyDate").value
  ) {
    $("pettyDate").value =
      today();
  }

  if (
    $("reqDate") &&
    !$("reqDate").value
  ) {
    $("reqDate").value =
      today();
  }

  if (
    $("vehicleJobType") &&
    !$("vehicleJobType").value
  ) {
    $("vehicleJobType").value =
      "Repair";
  }

  if (
    $("vehicleStatus") &&
    !$("vehicleStatus").value
  ) {
    $("vehicleStatus").value =
      "Under Repair";
  }

  if (
    $("reqQuantity") &&
    !$("reqQuantity").value
  ) {
    $("reqQuantity").value =
      "1";
  }

  showSection(
    "dashboard"
  );

  await loadAllData();

  updateVehicleStorageDays();

  console.log(
    "Garage Operations Pro ready."
  );
}


/* =========================================================
   DOM START
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initGarageApp
  );
} else {
  initGarageApp();
}


/* =========================================================
   =========================================================
   PART 4 END HERE
   =========================================================
   END OF SINGLE app.js FILE
   =========================================================
   ========================================================= */
