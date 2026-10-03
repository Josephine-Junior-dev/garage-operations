/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE APP.JS
   MATCHES THE CURRENT index.html
   ========================================================= */


/* =========================================================
   PART 1 START HERE
   SUPABASE + GLOBALS + HELPERS + NAVIGATION
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

let selectedReqForPrint = null;
let selectedVehicleExpenseForPrint = null;


/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


/* =========================================================
   NUMBER HELPERS
   ========================================================= */

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}


function money(value) {

  return "KSh " +
    num(value).toLocaleString(
      "en-KE",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    );

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =========================================================
   DATE HELPERS
   ========================================================= */

function today() {

  const d = new Date();

  const year = d.getFullYear();

  const month =
    String(d.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(d.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;

}


function formatDate(value) {

  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return escapeHtml(value);
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


/* =========================================================
   STORAGE DAYS
   ========================================================= */

function getStorageDays(dateIn, dateOut) {

  if (!dateIn) return 0;

  const start =
    new Date(`${dateIn}T00:00:00`);

  const end =
    dateOut
      ? new Date(`${dateOut}T00:00:00`)
      : new Date();

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return 0;
  }

  const difference =
    end.getTime() - start.getTime();

  const days =
    Math.floor(
      difference /
      (1000 * 60 * 60 * 24)
    );

  return Math.max(0, days);

}


/* =========================================================
   STATUS NORMALIZATION
   ========================================================= */

function normalizeStatus(status) {

  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

}


function statusBadge(status) {

  if (!status) {
    return `<span class="status status-default">—</span>`;
  }

  const normalized =
    normalizeStatus(status);

  let className =
    "status-default";

  if (normalized === "under-repair") {
    className = "status-under-repair";
  }

  if (normalized === "completed") {
    className = "status-completed";
  }

  if (normalized === "pending") {
    className = "status-pending";
  }

  if (normalized === "approved") {
    className = "status-approved";
  }

  if (normalized === "purchased") {
    className = "status-purchased";
  }

  if (normalized === "rejected") {
    className = "status-rejected";
  }

  if (normalized === "released") {
    className = "status-completed";
  }

  return `
    <span class="status ${className}">
      ${escapeHtml(status)}
    </span>
  `;

}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message, type = "success") {

  const toast = $("toast");

  if (!toast) return;

  toast.textContent = message;

  toast.style.display = "block";

  if (type === "error") {
    toast.style.background = "#991b1b";
  } else {
    toast.style.background = "#07111f";
  }

  clearTimeout(
    window.__garageToastTimer
  );

  window.__garageToastTimer =
    setTimeout(() => {
      toast.style.display = "none";
    }, 2800);

}


/* =========================================================
   MODALS
   ========================================================= */

function openModal(id) {

  const modal = $(id);

  if (!modal) return;

  modal.classList.add("show");

}


function closeModal(id) {

  const modal = $(id);

  if (!modal) return;

  modal.classList.remove("show");

}


/* =========================================================
   SECTION NAVIGATION
   ========================================================= */

function showSection(sectionId, clickedButton = null) {

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

      button.classList.remove("active");

    });


  if (clickedButton) {

    clickedButton.classList.add("active");

  } else {

    document
      .querySelectorAll(
        ".nav-btn, .mobile-nav-btn"
      )
      .forEach(button => {

        const onclick =
          button.getAttribute("onclick") || "";

        if (
          onclick.includes(
            `showSection('${sectionId}'`
          )
        ) {
          button.classList.add("active");
        }

      });

  }


  const titles = {

    dashboard: "Dashboard",

    vehicles: "Vehicles",

    expenses: "Expenses",

    pettyCash: "Petty Cash",

    requisitions: "Requisitions"

  };


  const topbarTitle =
    document.querySelector(
      ".topbar-title strong"
    );

  if (topbarTitle) {

    topbarTitle.textContent =
      `Garage Operations Pro`;

  }


  const topbarSubtitle =
    document.querySelector(
      ".topbar-title span"
    );

  if (topbarSubtitle) {

    topbarSubtitle.textContent =
      titles[sectionId] ||
      "Workshop management workspace";

  }

}


/* =========================================================
   DATABASE ERROR
   ========================================================= */

function databaseError(error, action) {

  console.error(
    `Garage Operations: ${action}`,
    error
  );

  const message =
    error?.message ||
    "Database operation failed.";

  showToast(
    `${action}: ${message}`,
    "error"
  );

}


/* =========================================================
   GENERIC DELETE CONFIRMATION
   ========================================================= */

function askDelete(message) {

  return window.confirm(
    message ||
    "Are you sure you want to delete this record?"
  );

}


/* =========================================================
   PART 1 END HERE
   ========================================================= */



/* =========================================================
   PART 2 START HERE
   DATA LOADING + DASHBOARD + VEHICLES
   ========================================================= */


/* =========================================================
   LOAD ALL DATA
   ========================================================= */

async function loadAllData() {

  try {

    await Promise.all([
      loadVehicles(),
      loadExpenses(),
      loadPettyCash(),
      loadRequisitions()
    ]);

    populateVehicleSelects();
    populateCategoryFilters();

    renderDashboard();
    renderVehicles();
    renderExpenses();
    renderPettyCash();
    renderRequisitions();

    updateVehicleStorageDays();

  } catch (error) {

    databaseError(
      error,
      "Loading data failed"
    );

  }

}


/* =========================================================
   LOAD VEHICLES
   ========================================================= */

async function loadVehicles() {

  const {
    data,
    error
  } = await supabase
    .from("vehicles")
    .select("*")
    .order(
      "date_in",
      {
        ascending: false
      }
    );

  if (error) throw error;

  vehicles = data || [];

}


/* =========================================================
   LOAD EXPENSES
   ========================================================= */

async function loadExpenses() {

  const {
    data,
    error
  } = await supabase
    .from("expenses")
    .select("*")
    .order(
      "expense_date",
      {
        ascending: false
      }
    );

  if (error) throw error;

  expenses = data || [];

}


/* =========================================================
   LOAD PETTY CASH
   ========================================================= */

async function loadPettyCash() {

  const {
    data,
    error
  } = await supabase
    .from("petty_cash")
    .select("*")
    .order(
      "cash_date",
      {
        ascending: false
      }
    );

  if (error) throw error;

  pettyCash = data || [];

}


/* =========================================================
   LOAD REQUISITIONS
   ========================================================= */

async function loadRequisitions() {

  const {
    data,
    error
  } = await supabase
    .from("requisitions")
    .select("*")
    .order(
      "req_date",
      {
        ascending: false
      }
    );

  if (error) throw error;

  requisitions = data || [];

}


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {

  const totalVehicles =
    vehicles.length;

  const underRepair =
    vehicles.filter(
      vehicle =>
        String(vehicle.status || "")
          .toLowerCase() ===
        "under repair"
    ).length;

  const totalBilled =
    vehicles.reduce(
      (sum, vehicle) =>
        sum + num(vehicle.billed),
      0
    );

  const totalPaid =
    vehicles.reduce(
      (sum, vehicle) =>
        sum + num(vehicle.paid),
      0
    );

  const outstanding =
    vehicles.reduce(
      (sum, vehicle) =>
        sum +
        Math.max(
          0,
          num(vehicle.billed) -
          num(vehicle.paid)
        ),
      0
    );

  const totalExpenses =
    expenses.reduce(
      (sum, item) =>
        sum + num(item.amount),
      0
    );

  const totalPetty =
    pettyCash.reduce(
      (sum, item) =>
        sum + num(item.amount),
      0
    );

  const totalReq =
    requisitions.length;

  const totalReqValue =
    requisitions.reduce(
      (sum, item) =>
        sum + num(item.total_amount),
      0
    );


  if ($("dashVehicles")) {
    $("dashVehicles").textContent =
      totalVehicles;
  }

  if ($("dashRepair")) {
    $("dashRepair").textContent =
      underRepair;
  }

  if ($("dashOutstanding")) {
    $("dashOutstanding").textContent =
      money(outstanding);
  }

  if ($("dashReq")) {
    $("dashReq").textContent =
      totalReq;
  }

  if ($("dashBilled")) {
    $("dashBilled").textContent =
      money(totalBilled);
  }

  if ($("dashPaid")) {
    $("dashPaid").textContent =
      money(totalPaid);
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
      totalReq;
  }

  if ($("dashReqTotal")) {
    $("dashReqTotal").textContent =
      money(totalReqValue);
  }

  if ($("reqOverallTotal")) {
    $("reqOverallTotal").textContent =
      money(totalReqValue);
  }

  renderDashboardActivity();

}


/* =========================================================
   DASHBOARD ACTIVITY
   ========================================================= */

function renderDashboardActivity() {

  const container =
    $("dashboardActivity");

  if (!container) return;


  const recent =
    [...vehicles]
      .sort(
        (a, b) =>
          new Date(
            b.date_in || 0
          ) -
          new Date(
            a.date_in || 0
          )
      )
      .slice(0, 6);


  if (!recent.length) {

    container.innerHTML = `
      <div style="
        padding:25px 0;
        text-align:center;
        color:#94a3b8;
        font-size:12px;
      ">
        No vehicle activity yet.
      </div>
    `;

    return;

  }


  container.innerHTML =
    recent
      .map(vehicle => {

        const registration =
          escapeHtml(
            vehicle.registration ||
            "No registration"
          );

        const customer =
          escapeHtml(
            vehicle.customer ||
            ""
          );

        return `
          <div class="activity-item">

            <div class="activity-icon">
              🚘
            </div>

            <div class="activity-main">

              <strong>
                ${registration}
              </strong>

              <span>
                ${customer}
                •
                ${formatDate(vehicle.date_in)}
              </span>

            </div>

            ${statusBadge(vehicle.status)}

          </div>
        `;

      })
      .join("");

}


/* =========================================================
   DASHBOARD CARDS
   THIS MATCHES THE ACTUAL HTML:
   .kpi-card
   .financial-item
   ========================================================= */

function bindDashboardCards() {

  const cardActions = {

    /* TOP KPI CARDS */

    dashVehicles:
      "vehicles",

    dashRepair:
      "vehicles",

    dashOutstanding:
      "vehicles",

    dashReq:
      "requisitions",


    /* FINANCIAL OVERVIEW */

    dashBilled:
      "vehicles",

    dashPaid:
      "vehicles",

    dashExpenses:
      "expenses",

    dashPetty:
      "pettyCash"

  };


  Object.entries(cardActions)
    .forEach(
      ([numberId, sectionId]) => {

        const numberElement =
          $(numberId);

        if (!numberElement) return;


        const card =
          numberElement.closest(
            ".kpi-card"
          ) ||
          numberElement.closest(
            ".financial-item"
          );

        if (!card) return;


        card.style.cursor =
          "pointer";


        card.title =
          "Open " +
          sectionId;


        if (
          card.dataset
            .dashboardClickBound ===
          "true"
        ) {
          return;
        }


        card.dataset
          .dashboardClickBound =
          "true";


        card.addEventListener(
          "click",
          function () {

            showSection(
              sectionId
            );

          }
        );

      }
    );

}


/* =========================================================
   POPULATE VEHICLE SELECTS
   ========================================================= */

function populateVehicleSelects() {

  const expenseVehicle =
    $("expenseVehicle");

  const reqVehicle =
    $("reqVehicle");


  if (expenseVehicle) {

    const current =
      expenseVehicle.value;

    expenseVehicle.innerHTML =
      `
        <option value="">
          General Expense
        </option>
      `;

    vehicles.forEach(
      vehicle => {

        expenseVehicle.innerHTML += `
          <option value="${escapeHtml(vehicle.id)}">
            ${escapeHtml(
              vehicle.registration ||
              "Unnamed vehicle"
            )}
          </option>
        `;

      }
    );

    if (current) {
      expenseVehicle.value =
        current;
    }

  }


  if (reqVehicle) {

    const current =
      reqVehicle.value;

    reqVehicle.innerHTML =
      `
        <option value="">
          Select Vehicle
        </option>
      `;

    vehicles.forEach(
      vehicle => {

        reqVehicle.innerHTML += `
          <option value="${escapeHtml(vehicle.id)}">
            ${escapeHtml(
              vehicle.registration ||
              "Unnamed vehicle"
            )}
          </option>
        `;

      }
    );

    if (current) {
      reqVehicle.value =
        current;
    }

  }

}


/* =========================================================
   VEHICLE NAME
   ========================================================= */

function getVehicleRegistration(
  vehicleId
) {

  if (!vehicleId) {
    return "General";
  }

  const vehicle =
    vehicles.find(
      item =>
        String(item.id) ===
        String(vehicleId)
    );

  return vehicle
    ? (
        vehicle.registration ||
        "Unnamed vehicle"
      )
    : "Unknown vehicle";

}


/* =========================================================
   VEHICLES RENDER
   ========================================================= */

function renderVehicles() {

  const body =
    $("vehiclesTableBody");

  if (!body) return;


  const search =
    (
      $("vehicleSearch")?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  const status =
    (
      $("vehicleStatusFilter")?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  const filtered =
    vehicles.filter(
      vehicle => {

        const registration =
          String(
            vehicle.registration ||
            ""
          ).toLowerCase();

        const customer =
          String(
            vehicle.customer ||
            ""
          ).toLowerCase();

        const vehicleStatus =
          String(
            vehicle.status ||
            ""
          ).toLowerCase();


        const matchesSearch =
          !search ||
          registration.includes(search) ||
          customer.includes(search);


        const matchesStatus =
          !status ||
          vehicleStatus === status;


        return (
          matchesSearch &&
          matchesStatus
        );

      }
    );


  if (!filtered.length) {

    body.innerHTML = `
      <tr>
        <td colspan="9"
            style="
              text-align:center;
              padding:35px;
              color:#94a3b8;
            ">
          No vehicles found.
        </td>
      </tr>
    `;

    return;

  }


  body.innerHTML =
    filtered
      .map(
        vehicle => {

          const billed =
            num(vehicle.billed);

          const paid =
            num(vehicle.paid);

          const outstanding =
            Math.max(
              0,
              billed - paid
            );


          const storageDays =
            getStorageDays(
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
                ${formatDate(
                  vehicle.date_in
                )}

                <br>

                <small style="
                  color:#94a3b8;
                  font-size:10px;
                ">
                  ${
                    vehicle.date_out
                      ? "Out: " +
                        formatDate(
                          vehicle.date_out
                        )
                      : "Storage: " +
                        storageDays +
                        " day" +
                        (
                          storageDays === 1
                            ? ""
                            : "s"
                        )
                  }
                </small>
              </td>

              <td>
                ${escapeHtml(
                  vehicle.job_type ||
                  "Repair"
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
                <strong>
                  ${money(outstanding)}
                </strong>
              </td>

              <td>

                <div class="table-actions">

                  <button
                    class="action-btn"
                    title="Vehicle expenses"
                    onclick="previewVehicleExpenses('${escapeHtml(vehicle.id)}')">
                    💳
                  </button>

                  <button
                    class="action-btn"
                    title="Edit vehicle"
                    onclick="editVehicle('${escapeHtml(vehicle.id)}')">
                    ✏️
                  </button>

                  <button
                    class="action-btn"
                    title="Delete vehicle"
                    onclick="deleteVehicle('${escapeHtml(vehicle.id)}')">
                    🗑
                  </button>

                </div>

              </td>

            </tr>
          `;

        }
      )
      .join("");

}


/* =========================================================
   UPDATE STORAGE DAYS
   ========================================================= */

function updateVehicleStorageDays() {

  /*
   * Storage Days are calculated automatically
   * from Date In and Date Out.
   *
   * No new Supabase column is required.
   */

  renderVehicles();

}


/* =========================================================
   OPEN VEHICLE MODAL
   ========================================================= */

function openVehicleModal(
  vehicle = null
) {

  editingVehicleId =
    vehicle?.id || null;


  if ($("vehicleModalTitle")) {

    $("vehicleModalTitle")
      .textContent =
      vehicle
        ? "Edit Vehicle"
        : "Add Vehicle";

  }


  $("vehicleId").value =
    vehicle?.id || "";


  $("vehicleRegistration").value =
    vehicle?.registration || "";


  $("vehicleCustomer").value =
    vehicle?.customer || "";


  $("vehicleDateIn").value =
    vehicle?.date_in ||
    today();


  $("vehicleDateOut").value =
    vehicle?.date_out || "";


  $("vehicleJobType").value =
    vehicle?.job_type ||
    "Repair";


  $("vehicleStatus").value =
    vehicle?.status ||
    "Storage";


  $("vehicleReleasedTo").value =
    vehicle?.released_to ||
    "";


  $("vehicleReleasedContact").value =
    vehicle?.released_contact ||
    "";


  $("vehicleBilled").value =
    vehicle?.billed ?? 0;


  $("vehiclePaid").value =
    vehicle?.paid ?? 0;


  $("vehicleDescription").value =
    vehicle?.description ||
    "";


  openModal("vehicleModal");

}


/* =========================================================
   SAVE VEHICLE
   ========================================================= */

async function saveVehicle(
  event
) {

  event.preventDefault();


  const id =
    $("vehicleId").value ||
    editingVehicleId;


  const registration =
    $("vehicleRegistration")
      .value
      .trim();


  const customer =
    $("vehicleCustomer")
      .value
      .trim();


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


  const payload = {

    registration,

    customer,

    date_in:
      $("vehicleDateIn").value ||
      null,

    date_out:
      $("vehicleDateOut").value ||
      null,

    job_type:
      $("vehicleJobType").value ||
      "Repair",

    status:
      $("vehicleStatus").value ||
      "Storage",

    released_to:
      $("vehicleReleasedTo")
        .value
        .trim() ||
      null,

    released_contact:
      $("vehicleReleasedContact")
        .value
        .trim() ||
      null,

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
        .value
        .trim() ||
      null

  };


  try {

    let result;


    if (id) {

      result =
        await supabase
          .from("vehicles")
          .update(payload)
          .eq("id", id);

    } else {

      result =
        await supabase
          .from("vehicles")
          .insert(payload);

    }


    if (result.error) {
      throw result.error;
    }


    closeModal(
      "vehicleModal"
    );


    editingVehicleId = null;


    await loadVehicles();


    populateVehicleSelects();

    renderDashboard();

    renderVehicles();


    showToast(
      id
        ? "Vehicle updated successfully."
        : "Vehicle added successfully."
    );


  } catch (error) {

    databaseError(
      error,
      "Saving vehicle failed"
    );

  }

}


/* =========================================================
   EDIT VEHICLE
   ========================================================= */

function editVehicle(id) {

  const vehicle =
    vehicles.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!vehicle) {

    showToast(
      "Vehicle not found.",
      "error"
    );

    return;

  }


  openVehicleModal(
    vehicle
  );

}


/* =========================================================
   DELETE VEHICLE
   ========================================================= */

async function deleteVehicle(id) {

  const vehicle =
    vehicles.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!vehicle) return;


  if (
    !askDelete(
      `Delete vehicle ${
        vehicle.registration ||
        ""
      }?`
    )
  ) {
    return;
  }


  try {

    const {
      error
    } =
      await supabase
        .from("vehicles")
        .delete()
        .eq("id", id);


    if (error) throw error;


    await loadVehicles();


    populateVehicleSelects();

    renderDashboard();

    renderVehicles();


    showToast(
      "Vehicle deleted successfully."
    );


  } catch (error) {

    databaseError(
      error,
      "Deleting vehicle failed"
    );

  }

}


/* =========================================================
   PART 2 END HERE
   ========================================================= */



/* =========================================================
   PART 3 START HERE
   EXPENSES + PETTY CASH
   ========================================================= */


/* =========================================================
   CATEGORY FILTERS
   ========================================================= */

function populateCategoryFilters() {

  const expenseFilter =
    $("expenseCategoryFilter");

  const pettyFilter =
    $("pettyCategoryFilter");


  if (expenseFilter) {

    const categories =
      [
        "Parts",
        "Materials",
        "Labour"
      ];


    expenseFilter.innerHTML =
      `<option value="">
        All Categories
      </option>`;


    categories.forEach(
      category => {

        expenseFilter.innerHTML += `
          <option value="${category}">
            ${category}
          </option>
        `;

      }
    );

  }


  if (pettyFilter) {

    const categories =
      [
        "Parts",
        "Materials",
        "Labour",
        "Transport",
        "Other"
      ];


    pettyFilter.innerHTML =
      `<option value="">
        All Categories
      </option>`;


    categories.forEach(
      category => {

        pettyFilter.innerHTML += `
          <option value="${category}">
            ${category}
          </option>
        `;

      }
    );

  }

}


/* =========================================================
   EXPENSES
   ========================================================= */

function renderExpenses() {

  const body =
    $("expensesTableBody");

  if (!body) return;


  const search =
    (
      $("expenseSearch")?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  const category =
    $("expenseCategoryFilter")
      ?.value ||
    "";


  const filtered =
    expenses.filter(
      expense => {

        const vehicleName =
          getVehicleRegistration(
            expense.vehicle_id
          );


        const text = [

          expense.description,

          expense.category,

          vehicleName

        ]
          .join(" ")
          .toLowerCase();


        const matchesSearch =
          !search ||
          text.includes(search);


        const matchesCategory =
          !category ||
          expense.category ===
          category;


        return (
          matchesSearch &&
          matchesCategory
        );

      }
    );


  if (!filtered.length) {

    body.innerHTML = `
      <tr>
        <td colspan="6"
            style="
              text-align:center;
              padding:35px;
              color:#94a3b8;
            ">
          No expenses found.
        </td>
      </tr>
    `;

    return;

  }


  body.innerHTML =
    filtered
      .map(
        expense => {

          return `
            <tr>

              <td>
                ${formatDate(
                  expense.expense_date
                )}
              </td>

              <td>
                ${escapeHtml(
                  getVehicleRegistration(
                    expense.vehicle_id
                  )
                )}
              </td>

              <td>
                ${escapeHtml(
                  expense.description ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  expense.category ||
                  "—"
                )}
              </td>

              <td>
                <strong>
                  ${money(
                    expense.amount
                  )}
                </strong>
              </td>

              <td>

                <div class="table-actions">

                  <button
                    class="action-btn"
                    title="Edit"
                    onclick="editExpense('${escapeHtml(expense.id)}')">
                    ✏️
                  </button>

                  <button
                    class="action-btn"
                    title="Delete"
                    onclick="deleteExpense('${escapeHtml(expense.id)}')">
                    🗑
                  </button>

                </div>

              </td>

            </tr>
          `;

        }
      )
      .join("");

}


/* =========================================================
   OPEN EXPENSE MODAL
   ========================================================= */

function openExpenseModal(
  expense = null
) {

  editingExpenseId =
    expense?.id || null;


  if ($("expenseModalTitle")) {

    $("expenseModalTitle")
      .textContent =
      expense
        ? "Edit Expense"
        : "Add Expense";

  }


  $("expenseId").value =
    expense?.id || "";


  $("expenseVehicle").value =
    expense?.vehicle_id || "";


  $("expenseDate").value =
    expense?.expense_date ||
    today();


  $("expenseCategory").value =
    expense?.category ||
    "";


  $("expenseAmount").value =
    expense?.amount ?? "";


  $("expenseDescription").value =
    expense?.description ||
    "";


  openModal(
    "expenseModal"
  );

}


/* =========================================================
   SAVE EXPENSE
   ========================================================= */

async function saveExpense(
  event
) {

  event.preventDefault();


  const id =
    $("expenseId").value ||
    editingExpenseId;


  const amount =
    num(
      $("expenseAmount").value
    );


  const description =
    $("expenseDescription")
      .value
      .trim();


  if (!amount) {

    showToast(
      "Enter an expense amount.",
      "error"
    );

    return;

  }


  if (!description) {

    showToast(
      "Enter an expense description.",
      "error"
    );

    return;

  }


  const payload = {

    vehicle_id:
      $("expenseVehicle").value ||
      null,

    expense_date:
      $("expenseDate").value ||
      today(),

    description,

    category:
      $("expenseCategory").value,

    amount

  };


  try {

    let result;


    if (id) {

      result =
        await supabase
          .from("expenses")
          .update(payload)
          .eq("id", id);

    } else {

      result =
        await supabase
          .from("expenses")
          .insert(payload);

    }


    if (result.error) {
      throw result.error;
    }


    closeModal(
      "expenseModal"
    );


    editingExpenseId = null;


    await loadExpenses();


    renderExpenses();

    renderDashboard();


    showToast(
      id
        ? "Expense updated successfully."
        : "Expense added successfully."
    );


  } catch (error) {

    databaseError(
      error,
      "Saving expense failed"
    );

  }

}


/* =========================================================
   EDIT EXPENSE
   ========================================================= */

function editExpense(id) {

  const expense =
    expenses.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!expense) return;


  openExpenseModal(
    expense
  );

}


/* =========================================================
   DELETE EXPENSE
   ========================================================= */

async function deleteExpense(id) {

  if (
    !askDelete(
      "Delete this expense?"
    )
  ) {
    return;
  }


  try {

    const {
      error
    } =
      await supabase
        .from("expenses")
        .delete()
        .eq("id", id);


    if (error) throw error;


    await loadExpenses();


    renderExpenses();

    renderDashboard();


    showToast(
      "Expense deleted successfully."
    );


  } catch (error) {

    databaseError(
      error,
      "Deleting expense failed"
    );

  }

}


/* =========================================================
   PETTY CASH
   ========================================================= */

function renderPettyCash() {

  const body =
    $("pettyTableBody");

  if (!body) return;


  const search =
    (
      $("pettySearch")?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  const category =
    $("pettyCategoryFilter")
      ?.value ||
    "";


  const filtered =
    pettyCash.filter(
      item => {

        const text = [

          item.description,

          item.paid_to,

          item.category,

          item.notes

        ]
          .join(" ")
          .toLowerCase();


        return (
          (!search ||
            text.includes(search)) &&
          (!category ||
            item.category === category)
        );

      }
    );


  if (!filtered.length) {

    body.innerHTML = `
      <tr>
        <td colspan="7"
            style="
              text-align:center;
              padding:35px;
              color:#94a3b8;
            ">
          No petty cash transactions found.
        </td>
      </tr>
    `;

    return;

  }


  body.innerHTML =
    filtered
      .map(
        item => {

          return `
            <tr>

              <td>
                ${formatDate(
                  item.cash_date
                )}
              </td>

              <td>
                ${escapeHtml(
                  item.description ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  item.paid_to ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  item.category ||
                  "—"
                )}
              </td>

              <td>
                <strong>
                  ${money(
                    item.amount
                  )}
                </strong>
              </td>

              <td>
                ${escapeHtml(
                  item.notes ||
                  "—"
                )}
              </td>

              <td>

                <div class="table-actions">

                  <button
                    class="action-btn"
                    title="Edit"
                    onclick="editPetty('${escapeHtml(item.id)}')">
                    ✏️
                  </button>

                  <button
                    class="action-btn"
                    title="Delete"
                    onclick="deletePetty('${escapeHtml(item.id)}')">
                    🗑
                  </button>

                </div>

              </td>

            </tr>
          `;

        }
      )
      .join("");

}


/* =========================================================
   OPEN PETTY CASH MODAL
   ========================================================= */

function openPettyModal(
  item = null
) {

  editingPettyId =
    item?.id || null;


  if ($("pettyModalTitle")) {

    $("pettyModalTitle")
      .textContent =
      item
        ? "Edit Petty Cash"
        : "Add Petty Cash";

  }


  $("pettyId").value =
    item?.id || "";


  $("pettyDate").value =
    item?.cash_date ||
    today();


  $("pettyPaidTo").value =
    item?.paid_to ||
    "";


  $("pettyCategory").value =
    item?.category ||
    "";


  $("pettyAmount").value =
    item?.amount ?? "";


  $("pettyDescription").value =
    item?.description ||
    "";


  $("pettyNotes").value =
    item?.notes ||
    "";


  openModal(
    "pettyModal"
  );

}


/* =========================================================
   SAVE PETTY CASH
   ========================================================= */

async function savePetty(
  event
) {

  event.preventDefault();


  const id =
    $("pettyId").value ||
    editingPettyId;


  const amount =
    num(
      $("pettyAmount").value
    );


  if (!amount) {

    showToast(
      "Enter a petty cash amount.",
      "error"
    );

    return;

  }


  const payload = {

    cash_date:
      $("pettyDate").value ||
      today(),

    description:
      $("pettyDescription")
        .value
        .trim(),

    paid_to:
      $("pettyPaidTo")
        .value
        .trim(),

    category:
      $("pettyCategory").value,

    amount,

    notes:
      $("pettyNotes")
        .value
        .trim() ||
      null

  };


  try {

    let result;


    if (id) {

      result =
        await supabase
          .from("petty_cash")
          .update(payload)
          .eq("id", id);

    } else {

      result =
        await supabase
          .from("petty_cash")
          .insert(payload);

    }


    if (result.error) {
      throw result.error;
    }


    closeModal(
      "pettyModal"
    );


    editingPettyId = null;


    await loadPettyCash();


    renderPettyCash();

    renderDashboard();


    showToast(
      id
        ? "Petty cash updated successfully."
        : "Petty cash transaction added successfully."
    );


  } catch (error) {

    databaseError(
      error,
      "Saving petty cash failed"
    );

  }

}


/* =========================================================
   EDIT PETTY
   ========================================================= */

function editPetty(id) {

  const item =
    pettyCash.find(
      record =>
        String(record.id) ===
        String(id)
    );


  if (!item) return;


  openPettyModal(
    item
  );

}


/* =========================================================
   DELETE PETTY
   ========================================================= */

async function deletePetty(id) {

  if (
    !askDelete(
      "Delete this petty cash transaction?"
    )
  ) {
    return;
  }


  try {

    const {
      error
    } =
      await supabase
        .from("petty_cash")
        .delete()
        .eq("id", id);


    if (error) throw error;


    await loadPettyCash();


    renderPettyCash();

    renderDashboard();


    showToast(
      "Petty cash deleted successfully."
    );


  } catch (error) {

    databaseError(
      error,
      "Deleting petty cash failed"
    );

  }

}


/* =========================================================
   PART 3 END HERE
   ========================================================= */



/* =========================================================
   PART 4 START HERE
   REQUISITIONS + PREVIEWS + PRINTING + EVENTS + STARTUP
   ========================================================= */


/* =========================================================
   REQUISITIONS
   ========================================================= */

function renderRequisitions() {

  const body =
    $("requisitionsTableBody");

  if (!body) return;


  const search =
    (
      $("reqSearch")?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  const status =
    $("reqStatusFilter")
      ?.value ||
    "";


  const filtered =
    requisitions.filter(
      req => {

        const vehicleName =
          getVehicleRegistration(
            req.vehicle_id
          );


        const text = [

          req.req_no,

          req.requested_by,

          vehicleName,

          req.item_description,

          req.status,

          req.notes,

          req.category,

          req.expense_type

        ]
          .join(" ")
          .toLowerCase();


        const matchesSearch =
          !search ||
          text.includes(search);


        const matchesStatus =
          !status ||
          req.status === status;


        return (
          matchesSearch &&
          matchesStatus
        );

      }
    );


  if (!filtered.length) {

    body.innerHTML = `
      <tr>
        <td colspan="11"
            style="
              text-align:center;
              padding:35px;
              color:#94a3b8;
            ">
          No requisitions found.
        </td>
      </tr>
    `;

    updateReqTotal(filtered);

    return;

  }


  body.innerHTML =
    filtered
      .map(
        req => {

          const expenseType =
            req.expense_type ||
            req.category ||
            "—";


          return `
            <tr>

              <td>
                <strong>
                  ${escapeHtml(
                    req.req_no ||
                    "—"
                  )}
                </strong>
              </td>

              <td>
                ${formatDate(
                  req.req_date
                )}
              </td>

              <td>
                ${escapeHtml(
                  req.requested_by ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  getVehicleRegistration(
                    req.vehicle_id
                  )
                )}
              </td>

              <td>
                ${escapeHtml(
                  req.item_description ||
                  "—"
                )}
              </td>

              <td>
                ${num(
                  req.quantity
                )}
              </td>

              <td>
                ${money(
                  req.unit_cost
                )}
              </td>

              <td>
                <strong>
                  ${money(
                    req.total_amount
                  )}
                </strong>
              </td>

              <td>
                ${escapeHtml(
                  expenseType
                )}
              </td>

              <td>
                ${statusBadge(
                  req.status
                )}
              </td>

              <td>

                <div class="table-actions">

                  <button
                    class="action-btn"
                    title="Preview"
                    onclick="previewReq('${escapeHtml(req.id)}')">
                    👁
                  </button>

                  <button
                    class="action-btn"
                    title="Edit"
                    onclick="editReq('${escapeHtml(req.id)}')">
                    ✏️
                  </button>

                  <button
                    class="action-btn"
                    title="Delete"
                    onclick="deleteReq('${escapeHtml(req.id)}')">
                    🗑
                  </button>

                </div>

              </td>

            </tr>
          `;

        }
      )
      .join("");


  updateReqTotal(
    filtered
  );

}


/* =========================================================
   REQUISITION TOTAL
   ========================================================= */

function updateReqTotal(
  list = requisitions
) {

  const total =
    list.reduce(
      (sum, req) =>
        sum +
        num(req.total_amount),
      0
    );


  if ($("reqOverallTotal")) {

    $("reqOverallTotal")
      .textContent =
      money(total);

  }

}


/* =========================================================
   OPEN REQUISITION MODAL
   ========================================================= */

function openReqModal(
  req = null
) {

  editingReqId =
    req?.id || null;


  if ($("reqModalTitle")) {

    $("reqModalTitle")
      .textContent =
      req
        ? "Edit Requisition"
        : "New Requisition";

  }


  $("reqId").value =
    req?.id || "";


  $("reqNo").value =
    req?.req_no ||
    "";


  $("reqDate").value =
    req?.req_date ||
    today();


  $("reqRequestedBy").value =
    req?.requested_by ||
    "";


  $("reqVehicle").value =
    req?.vehicle_id ||
    "";


  $("reqItemDescription").value =
    req?.item_description ||
    "";


  $("reqQuantity").value =
    req?.quantity ?? "";


  $("reqUnitCost").value =
    req?.unit_cost ?? "";


  $("reqTotal").value =
    req?.total_amount ??
    "";


  $("reqStatus").value =
    req?.status ||
    "Pending";


  $("reqCategory").value =
    req?.category ||
    "";


  $("reqExpenseType").value =
    req?.expense_type ||
    "";


  $("reqNotes").value =
    req?.notes ||
    "";


  calculateReqTotal();


  openModal(
    "reqModal"
  );

}


/* =========================================================
   CALCULATE REQUISITION TOTAL
   ========================================================= */

function calculateReqTotal() {

  const quantity =
    num(
      $("reqQuantity")?.value
    );


  const unitCost =
    num(
      $("reqUnitCost")?.value
    );


  const total =
    quantity * unitCost;


  if ($("reqTotal")) {

    $("reqTotal").value =
      total.toFixed(2);

  }

}


/* =========================================================
   SAVE REQUISITION
   ========================================================= */

async function saveReq(
  event
) {

  event.preventDefault();


  const id =
    $("reqId").value ||
    editingReqId;


  const quantity =
    num(
      $("reqQuantity").value
    );


  const unitCost =
    num(
      $("reqUnitCost").value
    );


  const total =
    quantity * unitCost;


  if (
    !$("reqNo").value.trim()
  ) {

    showToast(
      "Requisition number is required.",
      "error"
    );

    return;

  }


  if (
    !$("reqRequestedBy")
      .value
      .trim()
  ) {

    showToast(
      "Requested By is required.",
      "error"
    );

    return;

  }


  if (!quantity) {

    showToast(
      "Enter a quantity.",
      "error"
    );

    return;

  }


  const payload = {

    req_no:
      $("reqNo")
        .value
        .trim(),

    req_date:
      $("reqDate").value ||
      today(),

    requested_by:
      $("reqRequestedBy")
        .value
        .trim(),

    vehicle_id:
      $("reqVehicle").value ||
      null,

    item_description:
      $("reqItemDescription")
        .value
        .trim(),

    quantity,

    unit_cost:
      unitCost,

    total_amount:
      total,

    status:
      $("reqStatus").value ||
      "Pending",

    notes:
      $("reqNotes")
        .value
        .trim() ||
      null

  };


  try {

    let result;


    if (id) {

      result =
        await supabase
          .from("requisitions")
          .update(payload)
          .eq("id", id);

    } else {

      result =
        await supabase
          .from("requisitions")
          .insert(payload);

    }


    if (result.error) {
      throw result.error;
    }


    closeModal(
      "reqModal"
    );


    editingReqId = null;


    await loadRequisitions();


    renderRequisitions();

    renderDashboard();


    showToast(
      id
        ? "Requisition updated successfully."
        : "Requisition created successfully."
    );


  } catch (error) {

    databaseError(
      error,
      "Saving requisition failed"
    );

  }

}


/* =========================================================
   EDIT REQUISITION
   ========================================================= */

function editReq(id) {

  const req =
    requisitions.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!req) return;


  openReqModal(
    req
  );

}


/* =========================================================
   DELETE REQUISITION
   ========================================================= */

async function deleteReq(id) {

  if (
    !askDelete(
      "Delete this requisition?"
    )
  ) {
    return;
  }


  try {

    const {
      error
    } =
      await supabase
        .from("requisitions")
        .delete()
        .eq("id", id);


    if (error) throw error;


    await loadRequisitions();


    renderRequisitions();

    renderDashboard();


    showToast(
      "Requisition deleted successfully."
    );


  } catch (error) {

    databaseError(
      error,
      "Deleting requisition failed"
    );

  }

}


/* =========================================================
   PREVIEW REQUISITION
   ========================================================= */

function previewReq(id) {

  const req =
    requisitions.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!req) {

    showToast(
      "Requisition not found.",
      "error"
    );

    return;

  }


  selectedReqForPrint =
    req;


  const vehicle =
    getVehicleRegistration(
      req.vehicle_id
    );


  const expenseType =
    req.expense_type ||
    req.category ||
    "—";


  const content =
    $("reqPreviewContent");


  if (!content) return;


  content.innerHTML = `

    <div style="
      font-family:Arial,sans-serif;
      color:#0f172a;
    ">

      <div style="
        text-align:center;
        margin-bottom:22px;
      ">

        <h2 style="
          margin-bottom:5px;
        ">
          Garage Operations Pro
        </h2>

        <div style="
          color:#64748b;
          font-size:12px;
        ">
          Requisition Preview
        </div>

      </div>


      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:12px;
        margin-bottom:18px;
      ">

        <div>
          <strong>Requisition No.</strong>
          <br>
          ${escapeHtml(
            req.req_no || "—"
          )}
        </div>

        <div>
          <strong>Date</strong>
          <br>
          ${formatDate(
            req.req_date
          )}
        </div>

        <div>
          <strong>Requested By</strong>
          <br>
          ${escapeHtml(
            req.requested_by ||
            "—"
          )}
        </div>

        <div>
          <strong>Vehicle</strong>
          <br>
          ${escapeHtml(
            vehicle
          )}
        </div>

        <div>
          <strong>Status</strong>
          <br>
          ${escapeHtml(
            req.status ||
            "—"
          )}
        </div>

        <div>
          <strong>Expense Type</strong>
          <br>
          ${escapeHtml(
            expenseType
          )}
        </div>

      </div>


      <div style="
        border:1px solid #e5e7eb;
        border-radius:10px;
        padding:14px;
        margin-bottom:15px;
      ">

        <strong>
          Item Description
        </strong>

        <p style="
          margin-top:7px;
          white-space:pre-wrap;
        ">
          ${escapeHtml(
            req.item_description ||
            "—"
          )}
        </p>

      </div>


      <table style="
        width:100%;
        border-collapse:collapse;
        margin-bottom:15px;
      ">

        <tr>
          <td style="
            padding:9px;
            border:1px solid #e5e7eb;
          ">
            Quantity
          </td>

          <td style="
            padding:9px;
            border:1px solid #e5e7eb;
          ">
            ${num(req.quantity)}
          </td>
        </tr>

        <tr>
          <td style="
            padding:9px;
            border:1px solid #e5e7eb;
          ">
            Unit Cost
          </td>

          <td style="
            padding:9px;
            border:1px solid #e5e7eb;
          ">
            ${money(req.unit_cost)}
          </td>
        </tr>

        <tr>
          <td style="
            padding:9px;
            border:1px solid #e5e7eb;
            font-weight:bold;
          ">
            Total
          </td>

          <td style="
            padding:9px;
            border:1px solid #e5e7eb;
            font-weight:bold;
          ">
            ${money(req.total_amount)}
          </td>
        </tr>

      </table>


      <div>
        <strong>Notes</strong>

        <p style="
          margin-top:6px;
          white-space:pre-wrap;
        ">
          ${escapeHtml(
            req.notes ||
            "—"
          )}
        </p>
      </div>

    </div>
  `;


  openModal(
    "reqPreviewModal"
  );

}


/* =========================================================
   PREVIEW SELECTED REQUISITION
   ========================================================= */

function previewSelectedReq() {

  if (
    selectedReqForPrint
  ) {

    previewReq(
      selectedReqForPrint.id
    );

    return;

  }


  const first =
    requisitions[0];


  if (!first) {

    showToast(
      "There are no requisitions to preview.",
      "error"
    );

    return;

  }


  previewReq(
    first.id
  );

}


/* =========================================================
   VEHICLE EXPENSE PREVIEW
   ========================================================= */

function previewVehicleExpenses(
  vehicleId
) {

  const vehicle =
    vehicles.find(
      item =>
        String(item.id) ===
        String(vehicleId)
    );


  if (!vehicle) return;


  const vehicleExpenses =
    expenses.filter(
      expense =>
        String(
          expense.vehicle_id
        ) ===
        String(vehicleId)
    );


  const total =
    vehicleExpenses.reduce(
      (sum, item) =>
        sum + num(item.amount),
      0
    );


  selectedVehicleExpenseForPrint =
    {
      vehicle,
      expenses:
        vehicleExpenses,
      total
    };


  const content =
    $("vehicleExpensePreviewContent");


  if (!content) return;


  content.innerHTML = `

    <div style="
      font-family:Arial,sans-serif;
    ">

      <h2 style="
        margin-bottom:6px;
      ">
        Vehicle Expense Summary
      </h2>

      <p style="
        color:#64748b;
        margin-bottom:18px;
      ">
        Vehicle:
        <strong>
          ${escapeHtml(
            vehicle.registration ||
            "—"
          )}
        </strong>
      </p>


      <table style="
        width:100%;
        border-collapse:collapse;
      ">

        <thead>

          <tr>

            <th style="
              padding:9px;
              text-align:left;
              border-bottom:1px solid #ddd;
            ">
              Date
            </th>

            <th style="
              padding:9px;
              text-align:left;
              border-bottom:1px solid #ddd;
            ">
              Description
            </th>

            <th style="
              padding:9px;
              text-align:left;
              border-bottom:1px solid #ddd;
            ">
              Category
            </th>

            <th style="
              padding:9px;
              text-align:right;
              border-bottom:1px solid #ddd;
            ">
              Amount
            </th>

          </tr>

        </thead>

        <tbody>

          ${
            vehicleExpenses.length
              ? vehicleExpenses
                  .map(
                    expense => `
                      <tr>

                        <td style="
                          padding:9px;
                          border-bottom:1px solid #eee;
                        ">
                          ${formatDate(
                            expense.expense_date
                          )}
                        </td>

                        <td style="
                          padding:9px;
                          border-bottom:1px solid #eee;
                        ">
                          ${escapeHtml(
                            expense.description ||
                            "—"
                          )}
                        </td>

                        <td style="
                          padding:9px;
                          border-bottom:1px solid #eee;
                        ">
                          ${escapeHtml(
                            expense.category ||
                            "—"
                          )}
                        </td>

                        <td style="
                          padding:9px;
                          text-align:right;
                          border-bottom:1px solid #eee;
                        ">
                          ${money(
                            expense.amount
                          )}
                        </td>

                      </tr>
                    `
                  )
                  .join("")
              : `
                <tr>
                  <td colspan="4"
                      style="
                        padding:20px;
                        text-align:center;
                        color:#94a3b8;
                      ">
                    No expenses recorded
                    for this vehicle.
                  </td>
                </tr>
              `
          }

        </tbody>

      </table>


      <div style="
        margin-top:18px;
        text-align:right;
        font-size:18px;
        font-weight:800;
      ">
        Total:
        ${money(total)}
      </div>

    </div>
  `;


  openModal(
    "vehicleExpensePreviewModal"
  );

}


/* =========================================================
   PRINT HELPER
   ========================================================= */

function printHtml(
  title,
  html
) {

  const printWindow =
    window.open(
      "",
      "_blank"
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

      <title>
        ${escapeHtml(title)}
      </title>

      <style>

        body{
          font-family:Arial,sans-serif;
          color:#111827;
          padding:30px;
        }

        h1,h2,h3{
          margin-top:0;
        }

        table{
          width:100%;
          border-collapse:collapse;
        }

        th,td{
          padding:8px;
          border:1px solid #ddd;
          text-align:left;
        }

        th{
          background:#f5f5f5;
        }

        @media print{

          body{
            padding:10px;
          }

          .no-print{
            display:none!important;
          }

        }

      </style>

    </head>

    <body>

      ${html}

    </body>

    </html>
  `);


  printWindow.document.close();


  printWindow.focus();


  setTimeout(
    () => {

      printWindow.print();

    },
    350
  );

}


/* =========================================================
   PRINT VEHICLES
   ========================================================= */

function printVehicles() {

  const rows =
    vehicles
      .map(
        vehicle => {

          const billed =
            num(vehicle.billed);

          const paid =
            num(vehicle.paid);

          const outstanding =
            Math.max(
              0,
              billed - paid
            );


          return `
            <tr>

              <td>
                ${escapeHtml(
                  vehicle.registration ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  vehicle.customer ||
                  "—"
                )}
              </td>

              <td>
                ${formatDate(
                  vehicle.date_in
                )}
              </td>

              <td>
                ${escapeHtml(
                  vehicle.job_type ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  vehicle.status ||
                  "—"
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

            </tr>
          `;

        }
      )
      .join("");


  printHtml(
    "Vehicles - Garage Operations Pro",
    `

      <h1>
        Garage Operations Pro
      </h1>

      <h2>
        Vehicle Report
      </h2>

      <p>
        Printed:
        ${formatDate(today())}
      </p>

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
   PRINT EXPENSES
   ========================================================= */

function printExpenses() {

  const rows =
    expenses
      .map(
        expense => `
          <tr>

            <td>
              ${formatDate(
                expense.expense_date
              )}
            </td>

            <td>
              ${escapeHtml(
                getVehicleRegistration(
                  expense.vehicle_id
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                expense.description ||
                "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                expense.category ||
                "—"
              )}
            </td>

            <td>
              ${money(
                expense.amount
              )}
            </td>

          </tr>
        `
      )
      .join("");


  printHtml(
    "Expenses - Garage Operations Pro",
    `

      <h1>
        Garage Operations Pro
      </h1>

      <h2>
        Expense Report
      </h2>

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
    `
  );

}


/* =========================================================
   PRINT PETTY CASH
   ========================================================= */

function printPettyCash() {

  const rows =
    pettyCash
      .map(
        item => `
          <tr>

            <td>
              ${formatDate(
                item.cash_date
              )}
            </td>

            <td>
              ${escapeHtml(
                item.description ||
                "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                item.paid_to ||
                "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                item.category ||
                "—"
              )}
            </td>

            <td>
              ${money(
                item.amount
              )}
            </td>

            <td>
              ${escapeHtml(
                item.notes ||
                "—"
              )}
            </td>

          </tr>
        `
      )
      .join("");


  printHtml(
    "Petty Cash - Garage Operations Pro",
    `

      <h1>
        Garage Operations Pro
      </h1>

      <h2>
        Petty Cash Report
      </h2>

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
    `
  );

}


/* =========================================================
   PRINT REQUISITIONS
   ========================================================= */

function printRequisitions() {

  const rows =
    requisitions
      .map(
        req => `

          <tr>

            <td>
              ${escapeHtml(
                req.req_no ||
                "—"
              )}
            </td>

            <td>
              ${formatDate(
                req.req_date
              )}
            </td>

            <td>
              ${escapeHtml(
                req.requested_by ||
                "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                getVehicleRegistration(
                  req.vehicle_id
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                req.item_description ||
                "—"
              )}
            </td>

            <td>
              ${num(
                req.quantity
              )}
            </td>

            <td>
              ${money(
                req.unit_cost
              )}
            </td>

            <td>
              ${money(
                req.total_amount
              )}
            </td>

            <td>
              ${escapeHtml(
                req.expense_type ||
                req.category ||
                "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                req.status ||
                "—"
              )}
            </td>

          </tr>

        `
      )
      .join("");


  printHtml(
    "Requisitions - Garage Operations Pro",
    `

      <h1>
        Garage Operations Pro
      </h1>

      <h2>
        Requisition Report
      </h2>

      <table>

        <thead>

          <tr>

            <th>Req No.</th>
            <th>Date</th>
            <th>Requested By</th>
            <th>Vehicle</th>
            <th>Item Description</th>
            <th>Qty</th>
            <th>Unit Cost</th>
            <th>Total</th>
            <th>Expense Type</th>
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
   PRINT SELECTED REQUISITION
   ========================================================= */

function printSelectedReq() {

  const req =
    selectedReqForPrint;


  if (!req) {

    showToast(
      "Select a requisition first.",
      "error"
    );

    return;

  }


  const expenseType =
    req.expense_type ||
    req.category ||
    "—";


  printHtml(
    "Requisition - Garage Operations Pro",
    `

      <div style="
        max-width:750px;
        margin:auto;
      ">

        <h1>
          Garage Operations Pro
        </h1>

        <h2>
          Requisition
        </h2>

        <p>
          <strong>
            Requisition No.:
          </strong>
          ${escapeHtml(
            req.req_no ||
            "—"
          )}
        </p>

        <p>
          <strong>
            Date:
          </strong>
          ${formatDate(
            req.req_date
          )}
        </p>

        <p>
          <strong>
            Requested By:
          </strong>
          ${escapeHtml(
            req.requested_by ||
            "—"
          )}
        </p>

        <p>
          <strong>
            Vehicle:
          </strong>
          ${escapeHtml(
            getVehicleRegistration(
              req.vehicle_id
            )
          )}
        </p>

        <p>
          <strong>
            Status:
          </strong>
          ${escapeHtml(
            req.status ||
            "—"
          )}
        </p>

        <p>
          <strong>
            Expense Type:
          </strong>
          ${escapeHtml(
            expenseType
          )}
        </p>

        <hr>

        <h3>
          Item Description
        </h3>

        <p style="
          white-space:pre-wrap;
        ">
          ${escapeHtml(
            req.item_description ||
            "—"
          )}
        </p>

        <table>

          <tr>

            <th>
              Quantity
            </th>

            <td>
              ${num(
                req.quantity
              )}
            </td>

          </tr>

          <tr>

            <th>
              Unit Cost
            </th>

            <td>
              ${money(
                req.unit_cost
              )}
            </td>

          </tr>

          <tr>

            <th>
              Total
            </th>

            <td>
              <strong>
                ${money(
                  req.total_amount
                )}
              </strong>
            </td>

          </tr>

        </table>

        <br>

        <h3>
          Notes
        </h3>

        <p style="
          white-space:pre-wrap;
        ">
          ${escapeHtml(
            req.notes ||
            "—"
          )}
        </p>

      </div>
    `
  );

}


/* =========================================================
   PRINT VEHICLE EXPENSE PREVIEW
   ========================================================= */

function printVehicleExpensePreview() {

  const selected =
    selectedVehicleExpenseForPrint;


  if (!selected) {

    showToast(
      "No vehicle expense summary selected.",
      "error"
    );

    return;

  }


  const vehicle =
    selected.vehicle;


  const rows =
    selected.expenses
      .map(
        expense => `
          <tr>

            <td>
              ${formatDate(
                expense.expense_date
              )}
            </td>

            <td>
              ${escapeHtml(
                expense.description ||
                "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                expense.category ||
                "—"
              )}
            </td>

            <td>
              ${money(
                expense.amount
              )}
            </td>

          </tr>
        `
      )
      .join("");


  printHtml(
    "Vehicle Expense Summary",
    `

      <h1>
        Garage Operations Pro
      </h1>

      <h2>
        Vehicle Expense Summary
      </h2>

      <p>
        <strong>
          Vehicle:
        </strong>

        ${escapeHtml(
          vehicle.registration ||
          "—"
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

          ${rows}

        </tbody>

      </table>

      <h3 style="
        text-align:right;
        margin-top:20px;
      ">
        Total:
        ${money(
          selected.total
        )}
      </h3>
    `
  );

}


/* =========================================================
   SEARCH / FILTER EVENTS
   ========================================================= */

function bindSearchEvents() {

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

}


/* =========================================================
   FORM EVENTS
   ========================================================= */

function bindFormEvents() {

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

}


/* =========================================================
   MODAL EVENTS
   ========================================================= */

function bindModalEvents() {

  document
    .querySelectorAll(".modal")
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

}


/* =========================================================
   ESCAPE KEY CLOSES MODAL
   ========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key !== "Escape"
    ) {
      return;
    }


    document
      .querySelectorAll(
        ".modal.show"
      )
      .forEach(modal => {

        modal.classList.remove(
          "show"
        );

      });

  }
);


/* =========================================================
   LOGIN DISPLAY
   ========================================================= */

function initializeLoggedInState() {

  const loggedIn =
    sessionStorage.getItem(
      "garageLoggedIn"
    );


  const username =
    sessionStorage.getItem(
      "garageUser"
    );


  if (
    loggedIn === "true"
  ) {

    if ($("loginPage")) {

      $("loginPage")
        .style.display =
        "none";

    }


    if ($("app")) {

      $("app")
        .style.display =
        "block";

    }


    if (username) {

      const displayName =
        username
          .charAt(0)
          .toUpperCase() +
        username.slice(1);


      if ($("welcomeUser")) {

        $("welcomeUser")
          .textContent =
          displayName;

      }


      if ($("sidebarUser")) {

        $("sidebarUser")
          .textContent =
          displayName;

      }

    }

  }

}


/* =========================================================
   START APPLICATION
   ========================================================= */

async function initGarageApp() {

  bindFormEvents();

  bindSearchEvents();

  bindModalEvents();

  /*
   * IMPORTANT:
   * This makes the dashboard cards
   * actually clickable.
   */
  bindDashboardCards();


  /*
   * Default dates
   */
  if ($("vehicleDateIn")) {

    $("vehicleDateIn").value =
      today();

  }

  if ($("expenseDate")) {

    $("expenseDate").value =
      today();

  }

  if ($("pettyDate")) {

    $("pettyDate").value =
      today();

  }

  if ($("reqDate")) {

    $("reqDate").value =
      today();

  }


  /*
   * Default vehicle form values
   */
  if ($("vehicleJobType")) {

    $("vehicleJobType").value =
      "Repair";

  }

  if ($("vehicleStatus")) {

    $("vehicleStatus").value =
      "Storage";

  }


  /*
   * Show dashboard first
   */
  showSection(
    "dashboard"
  );


  /*
   * Load Supabase data
   */
  await loadAllData();

}


/* =========================================================
   EXPOSE FUNCTIONS TO index.html
   The HTML uses onclick="..."
   ========================================================= */

Object.assign(
  window,
  {

    /* Navigation */

    showSection,


    /* Modals */

    openModal,

    closeModal,

    openVehicleModal,

    openExpenseModal,

    openPettyModal,

    openReqModal,


    /* Vehicles */

    editVehicle,

    deleteVehicle,

    printVehicles,

    previewVehicleExpenses,


    /* Expenses */

    editExpense,

    deleteExpense,

    printExpenses,


    /* Petty Cash */

    editPetty,

    deletePetty,

    printPettyCash,


    /* Requisitions */

    editReq,

    deleteReq,

    previewReq,

    previewSelectedReq,

    printRequisitions,

    printSelectedReq,

    printVehicleExpensePreview,


    /* Calculations */

    calculateReqTotal,


    /* Data */

    loadAllData,

    renderDashboard,

    renderVehicles,

    renderExpenses,

    renderPettyCash,

    renderRequisitions

  }
);


/* =========================================================
   START WHEN MODULE LOADS
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      initializeLoggedInState();

      initGarageApp();

    },
    {
      once: true
    }
  );

} else {

  initializeLoggedInState();

  initGarageApp();

}


/* =========================================================
   PART 4 END HERE
   ========================================================= */
