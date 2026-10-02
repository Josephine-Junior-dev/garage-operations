import { createClient }
from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO — COMPLETE APP.JS
   ========================================================= */

const SUPABASE_URL = "https://ptluwoeogfkqavhspdjj.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_wDsWINauH0jX9rezsEwczw_Rovm6Nv";

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

let editingVehicleId = null;
let editingExpenseId = null;
let editingPettyId = null;
let editingReqId = null;

let pettyCashHasReqNo = true;

/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function number(value) {
  if (value === null || value === undefined || value === "") return 0;

  const n = Number(String(value).replace(/,/g, ""));

  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return `KSh ${number(value).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeReq(value) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeStatus(value) {
  return String(value ?? "").trim().toLowerCase();
}

function today() {
  const d = new Date();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function setText(id, value) {
  const el = $(id);

  if (el) {
    el.textContent = value ?? "";
  }
}

function setValue(id, value) {
  const el = $(id);

  if (!el) return;

  el.value =
    value === null || value === undefined
      ? ""
      : value;
}

function getErrorMessage(error) {
  return (
    error?.message ||
    error?.details ||
    error?.hint ||
    "Unknown Supabase error"
  );
}

function showToast(message, type = "success") {
  const toast = $("toast");

  if (!toast) {
    console[type === "error" ? "error" : "log"](message);
    return;
  }

  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add("show");

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

function openModal(id) {
  const modal = $(id);

  if (!modal) return;

  modal.classList.add("show", "active");
  modal.style.display = "flex";
}

function closeModal(id) {
  const modal = $(id);

  if (!modal) return;

  modal.classList.remove("show", "active");
  modal.style.display = "none";
}

/* =========================================================
   SUPABASE LOADING
   ========================================================= */

async function loadTable(table, orderColumn = null, ascending = false) {

  let query = supabase
    .from(table)
    .select("*");

  if (orderColumn) {
    query = query.order(orderColumn, {
      ascending
    });
  }

  let result = await query;

  /*
    Some versions of the database do not contain
    created_at. Retry without ordering.
  */

  if (result.error && orderColumn) {

    console.warn(
      `${table}: ordered query failed. Retrying without order.`,
      result.error
    );

    result = await supabase
      .from(table)
      .select("*");
  }

  return result;
}

async function loadAllData() {

  try {

    const results = await Promise.all([

      loadTable(
        "vehicles",
        "created_at",
        false
      ),

      loadTable(
        "expenses",
        "created_at",
        false
      ),

      loadTable(
        "petty_cash",
        "created_at",
        false
      ),

      loadTable(
        "requisitions",
        "req_date",
        false
      )

    ]);

    const errors = [];

    /* VEHICLES */

    if (results[0].error) {

      errors.push(
        `Vehicles: ${getErrorMessage(results[0].error)}`
      );

    } else {

      vehicles = results[0].data || [];

    }

    /* EXPENSES */

    if (results[1].error) {

      errors.push(
        `Expenses: ${getErrorMessage(results[1].error)}`
      );

    } else {

      expenses = results[1].data || [];

    }

    /* PETTY CASH */

    if (results[2].error) {

      errors.push(
        `Petty Cash: ${getErrorMessage(results[2].error)}`
      );

    } else {

      pettyCash = results[2].data || [];

      pettyCashHasReqNo =
        pettyCash.length === 0 ||
        Object.prototype.hasOwnProperty.call(
          pettyCash[0],
          "req_no"
        );
    }

    /* REQUISITIONS */

    if (results[3].error) {

      errors.push(
        `Requisitions: ${getErrorMessage(results[3].error)}`
      );

    } else {

      requisitions = results[3].data || [];

    }

    renderEverything();

    if (errors.length) {

      console.error(
        "Garage data loading errors:",
        errors
      );

      showToast(
        errors.join(" | "),
        "error"
      );
    }

  } catch (error) {

    console.error(
      "loadAllData:",
      error
    );

    showToast(
      `Unable to load garage data: ${getErrorMessage(error)}`,
      "error"
    );
  }
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function showSection(sectionId, button = null) {

  document
    .querySelectorAll(".app-section")
    .forEach(section => {

      section.classList.remove("active");
      section.style.display = "none";

    });

  const target = $(sectionId);

  if (target) {

    target.classList.add("active");
    target.style.display = "block";

  }

  document
    .querySelectorAll(
      ".nav-item, .sidebar-nav button, nav button"
    )
    .forEach(btn => {

      btn.classList.remove("active");

    });

  if (button) {

    button.classList.add("active");

  }

  if (sectionId === "dashboard") {

    renderDashboard();

  }

  if (sectionId === "vehicles") {

    renderVehicles();

  }

  if (sectionId === "expenses") {

    populateExpenseVehicleSelect();
    renderExpenses();

  }

  if (sectionId === "pettyCash") {

    populatePettyReqSelect();
    renderPettyCash();

  }

  if (sectionId === "requisitions") {

    populateReqVehicleSelect();
    renderRequisitions();

  }
}

/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderEverything() {

  renderDashboard();

  renderVehicles();

  renderExpenses();

  renderPettyCash();

  renderRequisitions();

  populateExpenseVehicleSelect();

  populatePettyReqSelect();

  populateReqVehicleSelect();

  updateUserDisplayFromSession();
}

/* =========================================================
   USER DISPLAY
   ========================================================= */

function updateUserDisplayFromSession() {

  const user =
    sessionStorage.getItem("garageUser") ||
    "User";

  setText(
    "welcomeUser",
    `Welcome, ${user}`
  );

  setText(
    "sidebarUser",
    user
  );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {

  const totalVehicles =
    vehicles.length;

  const repairVehicles =
    vehicles.filter(vehicle =>
      normalizeStatus(vehicle.status) ===
      "under repair"
    ).length;

  const totalBilled =
    vehicles.reduce(
      (sum, vehicle) =>
        sum + number(vehicle.billed),
      0
    );

  const totalPaid =
    vehicles.reduce(
      (sum, vehicle) =>
        sum + number(vehicle.paid),
      0
    );

  const totalOutstanding =
    vehicles.reduce(
      (sum, vehicle) =>
        sum +
        Math.max(
          0,
          number(vehicle.billed) -
          number(vehicle.paid)
        ),
      0
    );

  const totalExpenses =
    expenses.reduce(
      (sum, expense) =>
        sum + number(expense.amount),
      0
    );

  const totalPetty =
    pettyCash.reduce(
      (sum, petty) =>
        sum + number(petty.amount),
      0
    );

  const uniqueReqNumbers =
    getUniqueReqNumbers();

  const totalReqValue =
    uniqueReqNumbers.reduce(
      (sum, reqNo) =>
        sum +
        requisitionFinance(reqNo).requested,
      0
    );

  setText(
    "dashVehicles",
    totalVehicles
  );

  setText(
    "dashRepair",
    repairVehicles
  );

  setText(
    "dashOutstanding",
    money(totalOutstanding)
  );

  setText(
    "dashReq",
    money(totalReqValue)
  );

  setText(
    "dashBilled",
    money(totalBilled)
  );

  setText(
    "dashPaid",
    money(totalPaid)
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
    uniqueReqNumbers.length
  );

  setText(
    "dashReqTotal",
    money(totalReqValue)
  );

  renderDashboardActivity();
}

function renderDashboardActivity() {

  const container =
    $("dashboardActivity");

  if (!container) return;

  const activities = [];

  vehicles.forEach(vehicle => {

    activities.push({

      date:
        vehicle.created_at ||
        vehicle.date_in ||
        "",

      text:
        `Vehicle ${
          vehicle.registration || ""
        } added`

    });

  });

  requisitions.forEach(req => {

    activities.push({

      date:
        req.req_date ||
        req.created_at ||
        "",

      text:
        `${normalizeReq(req.req_no)}
        requisition`

    });

  });

  activities.sort(
    (a, b) =>
      new Date(b.date || 0) -
      new Date(a.date || 0)
  );

  if (!activities.length) {

    container.innerHTML =
      `<div class="empty-state">
        No recent activity.
      </div>`;

    return;
  }

  container.innerHTML =
    activities
      .slice(0, 8)
      .map(activity => `

        <div class="activity-item">

          <div>
            ${escapeHtml(activity.text)}
          </div>

          <small>
            ${escapeHtml(
              String(activity.date || "")
                .slice(0, 10)
            )}
          </small>

        </div>

      `)
      .join("");
}

/* =========================================================
   VEHICLES
   ========================================================= */

function getVehicleById(id) {

  return vehicles.find(
    vehicle =>
      String(vehicle.id) ===
      String(id)
  );
}

function populateReqVehicleSelect() {

  const select =
    $("reqVehicle");

  if (!select) return;

  const current =
    select.value;

  select.innerHTML =
    `<option value="">
      Select vehicle
    </option>`;

  vehicles.forEach(vehicle => {

    const option =
      document.createElement("option");

    option.value =
      vehicle.id;

    option.textContent =
      `${vehicle.registration || ""} — ${
        vehicle.customer || ""
      }`;

    select.appendChild(option);

  });

  if (current) {

    select.value = current;

  }
}

function openVehicleModal(id = null) {

  editingVehicleId = id;

  $("vehicleForm")?.reset();

  setValue(
    "vehicleId",
    id || ""
  );

  if (!id) {

    setValue(
      "vehicleDateIn",
      today()
    );

    setValue(
      "vehicleStatus",
      "Under Repair"
    );

    openModal(
      "vehicleModal"
    );

    return;
  }

  const vehicle =
    getVehicleById(id);

  if (!vehicle) return;

  setValue(
    "vehicleId",
    vehicle.id
  );

  setValue(
    "vehicleRegistration",
    vehicle.registration
  );

  setValue(
    "vehicleCustomer",
    vehicle.customer
  );

  setValue(
    "vehicleDateIn",
    vehicle.date_in
  );

  setValue(
    "vehicleDateOut",
    vehicle.date_out
  );

  setValue(
    "vehicleJobType",
    vehicle.job_type
  );

  setValue(
    "vehicleStatus",
    vehicle.status
  );

  setValue(
    "vehicleReleasedTo",
    vehicle.released_to
  );

  setValue(
    "vehicleReleasedContact",
    vehicle.released_contact
  );

  setValue(
    "vehicleBilled",
    vehicle.billed
  );

  setValue(
    "vehiclePaid",
    vehicle.paid
  );

  setValue(
    "vehicleDescription",
    vehicle.description
  );

  openModal(
    "vehicleModal"
  );
}

async function saveVehicle(event) {

  event?.preventDefault();

  const id =
    $("vehicleId")?.value ||
    editingVehicleId;

  const registration =
    $("vehicleRegistration")
      ?.value
      ?.trim()
      .toUpperCase();

  if (!registration) {

    showToast(
      "Vehicle registration is required.",
      "error"
    );

    return;
  }

  const payload = {

    registration,

    customer:
      $("vehicleCustomer")
        ?.value
        ?.trim() || null,

    date_in:
      $("vehicleDateIn")
        ?.value || null,

    date_out:
      $("vehicleDateOut")
        ?.value || null,

    job_type:
      $("vehicleJobType")
        ?.value
        ?.trim() || null,

    status:
      $("vehicleStatus")
        ?.value ||
      "Under Repair",

    released_to:
      $("vehicleReleasedTo")
        ?.value
        ?.trim() || null,

    released_contact:
      $("vehicleReleasedContact")
        ?.value
        ?.trim() || null,

    description:
      $("vehicleDescription")
        ?.value
        ?.trim() || null,

    billed:
      number(
        $("vehicleBilled")
          ?.value
      ),

    paid:
      number(
        $("vehiclePaid")
          ?.value
      )

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

    showToast(
      id
        ? "Vehicle updated successfully."
        : "Vehicle added successfully."
    );

    closeModal(
      "vehicleModal"
    );

    editingVehicleId = null;

    await loadAllData();

  } catch (error) {

    console.error(
      "saveVehicle:",
      error
    );

    showToast(
      `Unable to save vehicle: ${
        getErrorMessage(error)
      }`,
      "error"
    );
  }
}

async function deleteVehicle(id) {

  if (
    !confirm(
      "Delete this vehicle?"
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

      throw result.error;

    }

    showToast(
      "Vehicle deleted."
    );

    await loadAllData();

  } catch (error) {

    console.error(
      "deleteVehicle:",
      error
    );

    showToast(
      `Unable to delete vehicle: ${
        getErrorMessage(error)
      }`,
      "error"
    );
  }
}

function renderVehicles() {

  const tbody =
    $("vehiclesTableBody");

  if (!tbody) return;

  const search =
    $("vehicleSearch")
      ?.value
      ?.trim()
      .toLowerCase() || "";

  const status =
    $("vehicleStatusFilter")
      ?.value || "";

  const filtered =
    vehicles.filter(vehicle => {

      const text =
        `${vehicle.registration || ""}
         ${vehicle.customer || ""}
         ${vehicle.job_type || ""}`
          .toLowerCase();

      const matchesSearch =
        !search ||
        text.includes(search);

      const matchesStatus =
        !status ||
        normalizeStatus(
          vehicle.status
        ) ===
        normalizeStatus(status);

      return (
        matchesSearch &&
        matchesStatus
      );
    });

  if (!filtered.length) {

    tbody.innerHTML =
      `<tr>
        <td colspan="9"
            style="text-align:center">
          No vehicles found.
        </td>
      </tr>`;

    return;
  }

  tbody.innerHTML =
    filtered.map(vehicle => {

      const outstanding =
        Math.max(
          0,
          number(vehicle.billed) -
          number(vehicle.paid)
        );

      return `

        <tr>

          <td>
            <strong>
              ${escapeHtml(
                vehicle.registration
              )}
            </strong>
          </td>

          <td>
            ${escapeHtml(
              vehicle.customer || "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              vehicle.date_in || "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              vehicle.job_type || "-"
            )}
          </td>

          <td>
            <span class="status-badge">
              ${escapeHtml(
                vehicle.status || "-"
              )}
            </span>
          </td>

          <td>
            ${money(vehicle.billed)}
          </td>

          <td>
            ${money(vehicle.paid)}
          </td>

          <td>
            ${money(outstanding)}
          </td>

          <td>

            <button
              onclick="openVehicleModal('${vehicle.id}')">
              Edit
            </button>

            <button
              onclick="openVehicleExpensePreview('${vehicle.id}')">
              Expenses
            </button>

            <button
              onclick="deleteVehicle('${vehicle.id}')">
              Delete
            </button>

          </td>

        </tr>

      `;

    }).join("");
}

/* =========================================================
   EXPENSES
   ========================================================= */

function populateExpenseVehicleSelect() {

  const select =
    $("expenseVehicle");

  if (!select) return;

  const current =
    select.value;

  select.innerHTML =
    `<option value="">
      Select vehicle
    </option>`;

  vehicles.forEach(vehicle => {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      vehicle.id;

    option.textContent =
      `${vehicle.registration || ""} — ${
        vehicle.customer || ""
      }`;

    select.appendChild(
      option
    );

  });

  if (current) {

    select.value =
      current;

  }
}

function openExpenseModal(id = null) {

  editingExpenseId = id;

  $("expenseForm")?.reset();

  populateExpenseVehicleSelect();

  setValue(
    "expenseId",
    id || ""
  );

  if (!id) {

    setValue(
      "expenseDate",
      today()
    );

    openModal(
      "expenseModal"
    );

    return;
  }

  const expense =
    expenses.find(
      e =>
        String(e.id) ===
        String(id)
    );

  if (!expense) return;

  setValue(
    "expenseId",
    expense.id
  );

  setValue(
    "expenseVehicle",
    expense.vehicle_id
  );

  setValue(
    "expenseDate",
    expense.expense_date ||
    expense.date ||
    today()
  );

  setValue(
    "expenseCategory",
    expense.category
  );

  setValue(
    "expenseAmount",
    expense.amount
  );

  setValue(
    "expenseDescription",
    expense.description
  );

  openModal(
    "expenseModal"
  );
}

async function saveExpense(event) {

  event?.preventDefault();

  const id =
    $("expenseId")?.value ||
    editingExpenseId;

  const payload = {

    vehicle_id:
      $("expenseVehicle")
        ?.value || null,

    expense_date:
      $("expenseDate")
        ?.value || today(),

    category:
      $("expenseCategory")
        ?.value || null,

    amount:
      number(
        $("expenseAmount")
          ?.value
      ),

    description:
      $("expenseDescription")
        ?.value
        ?.trim() || null

  };

  if (payload.amount <= 0) {

    showToast(
      "Expense amount must be greater than zero.",
      "error"
    );

    return;
  }

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

    showToast(
      id
        ? "Expense updated."
        : "Expense added."
    );

    closeModal(
      "expenseModal"
    );

    editingExpenseId = null;

    await loadAllData();

  } catch (error) {

    console.error(
      "saveExpense:",
      error
    );

    showToast(
      `Unable to save expense: ${
        getErrorMessage(error)
      }`,
      "error"
    );
  }
}

async function deleteExpense(id) {

  if (
    !confirm(
      "Delete this expense?"
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

      throw result.error;

    }

    showToast(
      "Expense deleted."
    );

    await loadAllData();

  } catch (error) {

    console.error(
      "deleteExpense:",
      error
    );

    showToast(
      `Unable to delete expense: ${
        getErrorMessage(error)
      }`,
      "error"
    );
  }
}

function renderExpenses() {

  const tbody =
    $("expensesTableBody");

  if (!tbody) return;

  const search =
    $("expenseSearch")
      ?.value
      ?.trim()
      .toLowerCase() || "";

  const category =
    $("expenseCategoryFilter")
      ?.value || "";

  const filtered =
    expenses.filter(expense => {

      const vehicle =
        getVehicleById(
          expense.vehicle_id
        );

      const text =
        `${vehicle?.registration || ""}
         ${vehicle?.customer || ""}
         ${expense.description || ""}
         ${expense.category || ""}`
          .toLowerCase();

      return (

        (!search ||
          text.includes(search))

        &&

        (!category ||
          expense.category ===
          category)

      );
    });

  if (!filtered.length) {

    tbody.innerHTML =
      `<tr>
        <td colspan="7"
            style="text-align:center">
          No expenses found.
        </td>
      </tr>`;

    return;
  }

  tbody.innerHTML =
    filtered.map(expense => {

      const vehicle =
        getVehicleById(
          expense.vehicle_id
        );

      return `

        <tr>

          <td>
            ${escapeHtml(
              vehicle?.registration ||
              "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              expense.expense_date ||
              expense.date ||
              "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              expense.category ||
              "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              expense.description ||
              "-"
            )}
          </td>

          <td>
            ${money(
              expense.amount
            )}
          </td>

          <td>
            ${escapeHtml(
              vehicle?.customer ||
              "-"
            )}
          </td>

          <td>

            <button
              onclick="openExpenseModal('${expense.id}')">
              Edit
            </button>

            <button
              onclick="deleteExpense('${expense.id}')">
              Delete
            </button>

          </td>

        </tr>

      `;

    }).join("");
}

/* =========================================================
   PETTY CASH
   ========================================================= */

function populatePettyReqSelect() {

  const select =
    $("pettyReqNo");

  if (!select) return;

  const current =
    select.value;

  select.innerHTML =
    `<option value="">
      Not linked to requisition
    </option>`;

  getUniqueReqNumbers()
    .forEach(reqNo => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        reqNo;

      const finance =
        requisitionFinance(
          reqNo
        );

      option.textContent =
        `${reqNo} — ${
          money(finance.requested)
        }`;

      select.appendChild(
        option
      );

    });

  if (current) {

    select.value =
      current;

  }
}

function openPettyModal(id = null) {

  editingPettyId = id;

  $("pettyForm")?.reset();

  populatePettyReqSelect();

  setValue(
    "pettyId",
    id || ""
  );

  if (!id) {

    setValue(
      "pettyDate",
      today()
    );

    openModal(
      "pettyModal"
    );

    return;
  }

  const petty =
    pettyCash.find(
      p =>
        String(p.id) ===
        String(id)
    );

  if (!petty) return;

  setValue(
    "pettyId",
    petty.id
  );

  setValue(
    "pettyDate",
    petty.cash_date ||
    petty.date ||
    today()
  );

  setValue(
    "pettyPaidTo",
    petty.paid_to
  );

  setValue(
    "pettyCategory",
    petty.category
  );

  setValue(
    "pettyAmount",
    petty.amount
  );

  setValue(
    "pettyDescription",
    petty.description
  );

  setValue(
    "pettyNotes",
    petty.notes
  );

  setValue(
    "pettyReqNo",
    normalizeReq(
      petty.req_no
    )
  );

  openModal(
    "pettyModal"
  );
}

async function savePettyCash(event) {

  event?.preventDefault();

  const id =
    $("pettyId")?.value ||
    editingPettyId;

  const reqNo =
    normalizeReq(
      $("pettyReqNo")?.value
    );

  const basePayload = {

    cash_date:
      $("pettyDate")
        ?.value || today(),

    paid_to:
      $("pettyPaidTo")
        ?.value
        ?.trim() || null,

    category:
      $("pettyCategory")
        ?.value || null,

    amount:
      number(
        $("pettyAmount")
          ?.value
      ),

    description:
      $("pettyDescription")
        ?.value
        ?.trim() || null,

    notes:
      $("pettyNotes")
        ?.value
        ?.trim() || null

  };

  if (basePayload.amount <= 0) {

    showToast(
      "Petty cash amount must be greater than zero.",
      "error"
    );

    return;
  }

  let payload = {
    ...basePayload
  };

  if (
    reqNo &&
    pettyCashHasReqNo
  ) {

    payload.req_no =
      reqNo;

  }

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

    /*
      Older database may not have req_no.
      Retry without it.
    */

    if (
      result.error &&
      reqNo &&
      Object.prototype.hasOwnProperty.call(
        payload,
        "req_no"
      ) &&
      /req_no|column/i.test(
        getErrorMessage(
          result.error
        )
      )
    ) {

      pettyCashHasReqNo =
        false;

      const fallbackPayload =
        {
          ...basePayload
        };

      if (id) {

        result =
          await supabase
            .from("petty_cash")
            .update(
              fallbackPayload
            )
            .eq("id", id);

      } else {

        result =
          await supabase
            .from("petty_cash")
            .insert(
              fallbackPayload
            );

      }
    }

    if (result.error) {

      throw result.error;

    }

    showToast(
      id
        ? "Petty cash updated."
        : "Petty cash added."
    );

    if (
      reqNo &&
      !pettyCashHasReqNo
    ) {

      showToast(
        "Saved, but petty_cash.req_no is missing, so this payment cannot be linked to a requisition.",
        "error"
      );

    }

    closeModal(
      "pettyModal"
    );

    editingPettyId = null;

    await loadAllData();

  } catch (error) {

    console.error(
      "savePettyCash:",
      error
    );

    showToast(
      `Unable to save petty cash: ${
        getErrorMessage(error)
      }`,
      "error"
    );
  }
}

async function deletePettyCash(id) {

  if (
    !confirm(
      "Delete this petty cash entry?"
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

      throw result.error;

    }

    showToast(
      "Petty cash deleted."
    );

    await loadAllData();

  } catch (error) {

    console.error(
      "deletePettyCash:",
      error
    );

    showToast(
      `Unable to delete petty cash: ${
        getErrorMessage(error)
      }`,
      "error"
    );
  }
}

function renderPettyCash() {

  const tbody =
    $("pettyTableBody");

  if (!tbody) return;

  const search =
    $("pettySearch")
      ?.value
      ?.trim()
      .toLowerCase() || "";

  const category =
    $("pettyCategoryFilter")
      ?.value || "";

  const filtered =
    pettyCash.filter(petty => {

      const text =
        `${petty.paid_to || ""}
         ${petty.description || ""}
         ${petty.notes || ""}
         ${petty.req_no || ""}
         ${petty.category || ""}`
          .toLowerCase();

      return (

        (!search ||
          text.includes(search))

        &&

        (!category ||
          petty.category ===
          category)

      );
    });

  if (!filtered.length) {

    tbody.innerHTML =
      `<tr>
        <td colspan="8"
            style="text-align:center">
          No petty cash entries found.
        </td>
      </tr>`;

    return;
  }

  tbody.innerHTML =
    filtered.map(petty => `

      <tr>

        <td>
          ${escapeHtml(
            petty.cash_date ||
            petty.date ||
            "-"
          )}
        </td>

        <td>
          ${escapeHtml(
            petty.req_no ||
            "-"
          )}
        </td>

        <td>
          ${escapeHtml(
            petty.paid_to ||
            "-"
          )}
        </td>

        <td>
          ${escapeHtml(
            petty.category ||
            "-"
          )}
        </td>

        <td>
          ${escapeHtml(
            petty.description ||
            "-"
          )}
        </td>

        <td>
          ${money(
            petty.amount
          )}
        </td>

        <td>
          ${escapeHtml(
            petty.notes ||
            "-"
          )}
        </td>

        <td>

          <button
            onclick="openPettyModal('${petty.id}')">
            Edit
          </button>

          <button
            onclick="deletePettyCash('${petty.id}')">
            Delete
          </button>

        </td>

      </tr>

    `).join("");
}

/* =========================================================
   REQUISITIONS
   ========================================================= */

function getUniqueReqNumbers() {

  const set =
    new Set();

  requisitions.forEach(req => {

    const reqNo =
      normalizeReq(
        req.req_no
      );

    if (reqNo) {

      set.add(
        reqNo
      );

    }

  });

  return Array.from(set);
}

function getRequisitionRows(reqNo) {

  const normalized =
    normalizeReq(
      reqNo
    );

  return requisitions.filter(
    req =>
      normalizeReq(
        req.req_no
      ) === normalized
  );
}

function requisitionLineTotal(row) {

  const quantity =
    number(
      row.quantity
    );

  const unitCost =
    number(
      row.unit_cost
    );

  if (
    quantity > 0 &&
    unitCost > 0
  ) {

    return (
      quantity *
      unitCost
    );

  }

  return number(
    row.total_amount
  );
}

function requisitionTotal(reqNo) {

  return getRequisitionRows(
    reqNo
  ).reduce(
    (sum, row) =>
      sum +
      requisitionLineTotal(row),
    0
  );
}

function requisitionReceived(reqNo) {

  const normalized =
    normalizeReq(
      reqNo
    );

  return pettyCash
    .filter(
      petty =>
        normalizeReq(
          petty.req_no
        ) === normalized
    )
    .reduce(
      (sum, petty) =>
        sum +
        number(petty.amount),
      0
    );
}

function requisitionFinance(reqNo) {

  const requested =
    requisitionTotal(
      reqNo
    );

  const received =
    requisitionReceived(
      reqNo
    );

  return {

    requested,

    received,

    balance:
      Math.max(
        0,
        requested -
        received
      )

  };
}

function getRequisitionVehicle(reqNo) {

  const rows =
    getRequisitionRows(
      reqNo
    );

  const vehicleId =
    rows.find(
      row =>
        row.vehicle_id
    )?.vehicle_id;

  return vehicleId
    ? getVehicleById(
        vehicleId
      )
    : null;
}

/* =========================================================
   REQUISITION FORM
   ========================================================= */

function calculateReqFormTotal() {

  const quantity =
    number(
      $("reqQuantity")
        ?.value
    );

  const unitCost =
    number(
      $("reqUnitCost")
        ?.value
    );

  setValue(
    "reqTotal",
    quantity *
      unitCost ||
      ""
  );
}

function openReqModal(id = null) {

  editingReqId = id;

  $("reqForm")?.reset();

  populateReqVehicleSelect();

  setValue(
    "reqId",
    id || ""
  );

  if (!id) {

    setValue(
      "reqDate",
      today()
    );

    setValue(
      "reqStatus",
      "Pending"
    );

    calculateReqFormTotal();

    openModal(
      "reqModal"
    );

    return;
  }

  const req =
    requisitions.find(
      r =>
        String(r.id) ===
        String(id)
    );

  if (!req) return;

  setValue(
    "reqId",
    req.id
  );

  setValue(
    "reqNo",
    req.req_no
  );

  setValue(
    "reqDate",
    req.req_date ||
    today()
  );

  setValue(
    "reqRequestedBy",
    req.requested_by
  );

  setValue(
    "reqVehicle",
    req.vehicle_id
  );

  setValue(
    "reqItemDescription",
    req.item_description
  );

  setValue(
    "reqQuantity",
    req.quantity
  );

  setValue(
    "reqUnitCost",
    req.unit_cost
  );

  setValue(
    "reqTotal",
    req.total_amount
  );

  setValue(
    "reqStatus",
    req.status ||
    "Pending"
  );

  setValue(
    "reqNotes",
    req.notes
  );

  calculateReqFormTotal();

  openModal(
    "reqModal"
  );
}

async function saveRequisition(event) {

  event?.preventDefault();

  const id =
    $("reqId")?.value ||
    editingReqId;

  const reqNo =
    normalizeReq(
      $("reqNo")
        ?.value
    );

  if (!reqNo) {

    showToast(
      "Requisition number is required.",
      "error"
    );

    return;
  }

  const itemDescription =
    $("reqItemDescription")
      ?.value
      ?.trim();

  if (!itemDescription) {

    showToast(
      "Item description is required.",
      "error"
    );

    return;
  }

  const quantity =
    number(
      $("reqQuantity")
        ?.value
    );

  const unitCost =
    number(
      $("reqUnitCost")
        ?.value
    );

  const calculatedTotal =
    quantity > 0 &&
    unitCost > 0

      ? quantity *
        unitCost

      : number(
          $("reqTotal")
            ?.value
        );

  if (
    calculatedTotal <= 0
  ) {

    showToast(
      "Requisition total must be greater than zero.",
      "error"
    );

    return;
  }

  const payload = {

    req_no:
      reqNo,

    req_date:
      $("reqDate")
        ?.value ||
      today(),

    requested_by:
      $("reqRequestedBy")
        ?.value
        ?.trim() ||
      null,

    vehicle_id:
      $("reqVehicle")
        ?.value ||
      null,

    item_description:
      itemDescription,

    quantity,

    unit_cost:
      unitCost,

    total_amount:
      calculatedTotal,

    status:
      $("reqStatus")
        ?.value ||
      "Pending",

    notes:
      $("reqNotes")
        ?.value
        ?.trim() ||
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

    showToast(
      id
        ? "Requisition line updated."
        : "Requisition line added."
    );

    closeModal(
      "reqModal"
    );

    editingReqId = null;

    await loadAllData();

  } catch (error) {

    console.error(
      "saveRequisition:",
      error
    );

    showToast(
      `Unable to save requisition: ${
        getErrorMessage(error)
      }`,
      "error"
    );
  }
}

async function deleteRequisition(id) {

  if (
    !confirm(
      "Delete this requisition item?"
    )
  ) {
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

    showToast(
      "Requisition item deleted."
    );

    await loadAllData();

  } catch (error) {

    console.error(
      "deleteRequisition:",
      error
    );

    showToast(
      `Unable to delete requisition: ${
        getErrorMessage(error)
      }`,
      "error"
    );
  }
}

/* =========================================================
   REQUISITION TABLE
   ========================================================= */

function renderRequisitions() {

  const tbody =
    $("requisitionsTableBody");

  if (!tbody) return;

  const search =
    $("reqSearch")
      ?.value
      ?.trim()
      .toLowerCase() || "";

  const status =
    $("reqStatusFilter")
      ?.value || "";

  const uniqueReqNumbers =
    getUniqueReqNumbers();

  const filtered =
    uniqueReqNumbers.filter(
      reqNo => {

        const rows =
          getRequisitionRows(
            reqNo
          );

        const first =
          rows[0] || {};

        const vehicle =
          getRequisitionVehicle(
            reqNo
          );

        const finance =
          requisitionFinance(
            reqNo
          );

        const text = `

          ${reqNo}

          ${first.requested_by || ""}

          ${vehicle?.registration || ""}

          ${vehicle?.customer || ""}

          ${rows
            .map(
              row =>
                row.item_description ||
                ""
            )
            .join(" ")}

        `.toLowerCase();

        const matchesSearch =
          !search ||
          text.includes(search) ||
          String(
            finance.requested
          ).includes(search);

        const matchesStatus =
          !status ||
          rows.some(
            row =>
              normalizeStatus(
                row.status
              ) ===
              normalizeStatus(
                status
              )
          );

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );

  const overallTotal =
    uniqueReqNumbers.reduce(
      (sum, reqNo) =>
        sum +
        requisitionFinance(
          reqNo
        ).requested,
      0
    );

  setText(
    "reqOverallTotal",
    money(overallTotal)
  );

  if (!filtered.length) {

    tbody.innerHTML =
      `<tr>
        <td colspan="10"
            style="text-align:center">
          No requisitions found.
        </td>
      </tr>`;

    return;
  }

  tbody.innerHTML =
    filtered.map(
      reqNo => {

        const rows =
          getRequisitionRows(
            reqNo
          );

        const first =
          rows[0] || {};

        const vehicle =
          getRequisitionVehicle(
            reqNo
          );

        const finance =
          requisitionFinance(
            reqNo
          );

        const statusValue =
          rows.find(
            row =>
              row.status
          )?.status ||
          "Pending";

        return `

          <tr>

            <td>
              <strong>
                ${escapeHtml(
                  reqNo
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                first.req_date ||
                "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                vehicle?.registration ||
                "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                vehicle?.customer ||
                "-"
              )}
            </td>

            <td>
              ${rows.length}
              item${rows.length === 1
                ? ""
                : "s"}
            </td>

            <td>
              <strong>
                ${money(
                  finance.requested
                )}
              </strong>
            </td>

            <td>
              ${money(
                finance.received
              )}
            </td>

            <td>
              <strong>
                ${money(
                  finance.balance
                )}
              </strong>
            </td>

            <td>
              <span class="status-badge">
                ${escapeHtml(
                  statusValue
                )}
              </span>
            </td>

            <td>

              <button
                onclick="previewSelectedReq('${escapeHtml(reqNo)}')">
                View
              </button>

              <button
                onclick="openFirstReqLine('${escapeHtml(reqNo)}')">
                Edit
              </button>

            </td>

          </tr>

        `;

      }
    ).join("");
}

function openFirstReqLine(reqNo) {

  const rows =
    getRequisitionRows(
      reqNo
    );

  if (!rows.length) {

    showToast(
      "Requisition not found.",
      "error"
    );

    return;
  }

  openReqModal(
    rows[0].id
  );
}

/* =========================================================
   REQUISITION PREVIEW
   ========================================================= */

function previewSelectedReq(reqNo = null) {

  reqNo =
    normalizeReq(
      reqNo ||
      $("reqSearch")
        ?.value
    );

  if (!reqNo) {

    showToast(
      "Enter a requisition number first.",
      "error"
    );

    return;
  }

  const rows =
    getRequisitionRows(
      reqNo
    );

  if (!rows.length) {

    showToast(
      `${reqNo} was not found.`,
      "error"
    );

    return;
  }

  const finance =
    requisitionFinance(
      reqNo
    );

  const vehicle =
    getRequisitionVehicle(
      reqNo
    );

  const container =
    $("reqPreviewContent");

  if (!container) return;

  const paymentRows =
    pettyCash.filter(
      p =>
        normalizeReq(
          p.req_no
        ) === reqNo
    );

  container.innerHTML = `

    <div class="preview-header">

      <h2>
        ${escapeHtml(reqNo)}
      </h2>

      <p>
        ${escapeHtml(
          vehicle?.registration ||
          "Vehicle not assigned"
        )}
      </p>

    </div>

    <div class="finance-grid">

      <div class="finance-card">

        <small>
          Requested
        </small>

        <strong>
          ${money(
            finance.requested
          )}
        </strong>

      </div>

      <div class="finance-card">

        <small>
          Paid
        </small>

        <strong>
          ${money(
            finance.received
          )}
        </strong>

      </div>

      <div class="finance-card">

        <small>
          Balance
        </small>

        <strong>
          ${money(
            finance.balance
          )}
        </strong>

      </div>

    </div>

    <div class="preview-section">

      <h3>
        Requisition Items
      </h3>

      <table>

        <thead>

          <tr>

            <th>
              Item
            </th>

            <th>
              Qty
            </th>

            <th>
              Unit Cost
            </th>

            <th>
              Total
            </th>

          </tr>

        </thead>

        <tbody>

          ${rows.map(row => `

            <tr>

              <td>
                ${escapeHtml(
                  row.item_description ||
                  "-"
                )}
              </td>

              <td>
                ${number(
                  row.quantity
                )}
              </td>

              <td>
                ${money(
                  row.unit_cost
                )}
              </td>

              <td>
                ${money(
                  requisitionLineTotal(
                    row
                  )
                )}
              </td>

            </tr>

          `).join("")}

        </tbody>

        <tfoot>

          <tr>

            <th colspan="3">
              Requisition Total
            </th>

            <th>
              ${money(
                finance.requested
              )}
            </th>

          </tr>

        </tfoot>

      </table>

    </div>

    <div class="preview-section">

      <h3>
        Payments Linked To
        ${escapeHtml(reqNo)}
      </h3>

      ${
        paymentRows.length

          ? `

            <table>

              <thead>

                <tr>

                  <th>
                    Date
                  </th>

                  <th>
                    Paid To
                  </th>

                  <th>
                    Category
                  </th>

                  <th>
                    Amount
                  </th>

                </tr>

              </thead>

              <tbody>

                ${paymentRows.map(
                  p => `

                    <tr>

                      <td>
                        ${escapeHtml(
                          p.cash_date ||
                          p.date ||
                          "-"
                        )}
                      </td>

                      <td>
                        ${escapeHtml(
                          p.paid_to ||
                          "-"
                        )}
                      </td>

                      <td>
                        ${escapeHtml(
                          p.category ||
                          "-"
                        )}
                      </td>

                      <td>
                        ${money(
                          p.amount
                        )}
                      </td>

                    </tr>

                  `
                ).join("")}

              </tbody>

            </table>

          `

          : `

            <p>
              No payments linked to
              this requisition.
            </p>

          `
      }

    </div>

  `;

  openModal(
    "reqPreviewModal"
  );
}

function searchRequisitions() {

  renderRequisitions();

  const exact =
    normalizeReq(
      $("reqSearch")
        ?.value
    );

  if (
    exact &&
    getUniqueReqNumbers()
      .includes(exact)
  ) {

    previewSelectedReq(
      exact
    );

  }
}

/* =========================================================
   VEHICLE EXPENSE PREVIEW
   ========================================================= */

function openVehicleExpensePreview(
  vehicleId
) {

  const vehicle =
    getVehicleById(
      vehicleId
    );

  if (!vehicle) return;

  const vehicleExpenses =
    expenses.filter(
      e =>
        String(
          e.vehicle_id
        ) ===
        String(vehicleId)
    );

  const total =
    vehicleExpenses.reduce(
      (sum, expense) =>
        sum +
        number(
          expense.amount
        ),
      0
    );

  const content =
    $("vehicleExpensePreviewContent");

  if (
    !content ||
    !$(
      "vehicleExpensePreviewModal"
    )
  ) {
    return;
  }

  content.innerHTML = `

    <div class="preview-header">

      <h2>
        ${escapeHtml(
          vehicle.registration
        )}
      </h2>

      <p>
        ${escapeHtml(
          vehicle.customer || ""
        )}
      </p>

    </div>

    <div class="finance-card">

      <small>
        Total Expenses
      </small>

      <strong>
        ${money(total)}
      </strong>

    </div>

    ${
      vehicleExpenses.length

        ? `

          <table>

            <thead>

              <tr>

                <th>
                  Date
                </th>

                <th>
                  Category
                </th>

                <th>
                  Description
                </th>

                <th>
                  Amount
                </th>

              </tr>

            </thead>

            <tbody>

              ${vehicleExpenses.map(
                expense => `

                  <tr>

                    <td>
                      ${escapeHtml(
                        expense.expense_date ||
                        expense.date ||
                        "-"
                      )}
                    </td>

                    <td>
                      ${escapeHtml(
                        expense.category ||
                        "-"
                      )}
                    </td>

                    <td>
                      ${escapeHtml(
                        expense.description ||
                        "-"
                      )}
                    </td>

                    <td>
                      ${money(
                        expense.amount
                      )}
                    </td>

                  </tr>

                `
              ).join("")}

            </tbody>

          </table>

        `

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
   PRINT
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

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        >

        <style>

          body {
            font-family:
              Arial,
              sans-serif;

            padding: 30px;

            color: #111;
          }

          table {
            width: 100%;

            border-collapse:
              collapse;

            margin-top:
              20px;
          }

          th,
          td {
            border:
              1px solid #ccc;

            padding:
              8px;

            text-align:
              left;
          }

          th {
            background:
              #f1f1f1;
          }

          .summary {
            display:
              flex;

            gap:
              20px;

            margin:
              20px 0;

            flex-wrap:
              wrap;
          }

          .box {
            border:
              1px solid #ddd;

            padding:
              15px;

            min-width:
              150px;
          }

          @media print {

            body {
              padding:
                10px;
            }

          }

        </style>

      </head>

      <body>

        ${html}

        <script>

          window.onload =
            function () {

              window.print();

            };

        <\/script>

      </body>

    </html>

  `);

  printWindow.document.close();
}

function printVehicles() {

  const rows =
    vehicles.map(
      vehicle => {

        const outstanding =
          Math.max(
            0,
            number(
              vehicle.billed
            ) -
            number(
              vehicle.paid
            )
          );

        return `

          <tr>

            <td>
              ${escapeHtml(
                vehicle.registration
              )}
            </td>

            <td>
              ${escapeHtml(
                vehicle.customer ||
                "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                vehicle.status ||
                "-"
              )}
            </td>

            <td>
              ${money(
                vehicle.billed
              )}
            </td>

            <td>
              ${money(
                vehicle.paid
              )}
            </td>

            <td>
              ${money(
                outstanding
              )}
            </td>

          </tr>

        `;

      }
    ).join("");

  printHtml(
    "Garage Vehicles Report",
    `

      <h1>
        Garage Operations Pro
      </h1>

      <h2>
        Vehicles Report
      </h2>

      <table>

        <thead>

          <tr>

            <th>
              Registration
            </th>

            <th>
              Customer
            </th>

            <th>
              Status
            </th>

            <th>
              Billed
            </th>

            <th>
              Paid
            </th>

            <th>
              Outstanding
            </th>

          </tr>

        </thead>

        <tbody>

          ${rows}

        </tbody>

      </table>

    `
  );
}

function printExpenses() {

  const total =
    expenses.reduce(
      (sum, expense) =>
        sum +
        number(
          expense.amount
        ),
      0
    );

  const rows =
    expenses.map(
      expense => {

        const vehicle =
          getVehicleById(
            expense.vehicle_id
          );

        return `

          <tr>

            <td>
              ${escapeHtml(
                vehicle?.registration ||
                "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                expense.expense_date ||
                expense.date ||
                "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                expense.category ||
                "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                expense.description ||
                "-"
              )}
            </td>

            <td>
              ${money(
                expense.amount
              )}
            </td>

          </tr>

        `;

      }
    ).join("");

  printHtml(
    "Garage Expenses Report",
    `

      <h1>
        Garage Operations Pro
      </h1>

      <h2>
        Expenses Report
      </h2>

      <h3>
        Total Expenses:
        ${money(total)}
      </h3>

      <table>

        <thead>

          <tr>

            <th>
              Vehicle
            </th>

            <th>
              Date
            </th>

            <th>
              Category
            </th>

            <th>
              Description
            </th>

            <th>
              Amount
            </th>

          </tr>

        </thead>

        <tbody>
          ${rows}
        </tbody>

      </table>

    `
  );
}

function printPettyCash() {

  const total =
    pettyCash.reduce(
      (sum, petty) =>
        sum +
        number(
          petty.amount
        ),
      0
    );

  const rows =
    pettyCash.map(
      petty => `

        <tr>

          <td>
            ${escapeHtml(
              petty.cash_date ||
              petty.date ||
              "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              petty.req_no ||
              "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              petty.paid_to ||
              "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              petty.category ||
              "-"
            )}
          </td>

          <td>
            ${money(
              petty.amount
            )}
          </td>

          <td>
            ${escapeHtml(
              petty.description ||
              "-"
            )}
          </td>

        </tr>

      `
    ).join("");

  printHtml(
    "Petty Cash Report",
    `

      <h1>
        Garage Operations Pro
      </h1>

      <h2>
        Petty Cash Report
      </h2>

      <h3>
        Total:
        ${money(total)}
      </h3>

      <table>

        <thead>

          <tr>

            <th>
              Date
            </th>

            <th>
              REQ No.
            </th>

            <th>
              Paid To
            </th>

            <th>
              Category
            </th>

            <th>
              Amount
            </th>

            <th>
              Description
            </th>

          </tr>

        </thead>

        <tbody>
          ${rows}
        </tbody>

      </table>

    `
  );
}

function printRequisitions() {

  const uniqueReqNumbers =
    getUniqueReqNumbers();

  const rows =
    uniqueReqNumbers.map(
      reqNo => {

        const vehicle =
          getRequisitionVehicle(
            reqNo
          );

        const finance =
          requisitionFinance(
            reqNo
          );

        return `

          <tr>

            <td>
              ${escapeHtml(
                reqNo
              )}
            </td>

            <td>
              ${escapeHtml(
                vehicle?.registration ||
                "-"
              )}
            </td>

            <td>
              ${money(
                finance.requested
              )}
            </td>

            <td>
              ${money(
                finance.received
              )}
            </td>

            <td>
              ${money(
                finance.balance
              )}
            </td>

          </tr>

        `;

      }
    ).join("");

  const totalRequested =
    uniqueReqNumbers.reduce(
      (sum, reqNo) =>
        sum +
        requisitionFinance(
          reqNo
        ).requested,
      0
    );

  const totalReceived =
    uniqueReqNumbers.reduce(
      (sum, reqNo) =>
        sum +
        requisitionFinance(
          reqNo
        ).received,
      0
    );

  const totalBalance =
    uniqueReqNumbers.reduce(
      (sum, reqNo) =>
        sum +
        requisitionFinance(
          reqNo
        ).balance,
      0
    );

  printHtml(
    "Garage Requisitions Report",
    `

      <h1>
        Garage Operations Pro
      </h1>

      <h2>
        Requisitions Report
      </h2>

      <div class="summary">

        <div class="box">

          Requested<br>

          <strong>
            ${money(
              totalRequested
            )}
          </strong>

        </div>

        <div class="box">

          Paid<br>

          <strong>
            ${money(
              totalReceived
            )}
          </strong>

        </div>

        <div class="box">

          Balance<br>

          <strong>
            ${money(
              totalBalance
            )}
          </strong>

        </div>

      </div>

      <table>

        <thead>

          <tr>

            <th>
              REQ No.
            </th>

            <th>
              Vehicle
            </th>

            <th>
              Requested
            </th>

            <th>
              Paid
            </th>

            <th>
              Balance
            </th>

          </tr>

        </thead>

        <tbody>
          ${rows}
        </tbody>

      </table>

    `
  );
}

function printSelectedReq(
  reqNo = null
) {

  reqNo =
    normalizeReq(
      reqNo ||
      $("reqSearch")
        ?.value
    );

  if (!reqNo) {

    showToast(
      "Enter a requisition number.",
      "error"
    );

    return;
  }

  const rows =
    getRequisitionRows(
      reqNo
    );

  if (!rows.length) {

    showToast(
      `${reqNo} not found.`,
      "error"
    );

    return;
  }

  const finance =
    requisitionFinance(
      reqNo
    );

  const vehicle =
    getRequisitionVehicle(
      reqNo
    );

  const itemRows =
    rows.map(
      row => `

        <tr>

          <td>
            ${escapeHtml(
              row.item_description ||
              "-"
            )}
          </td>

          <td>
            ${number(
              row.quantity
            )}
          </td>

          <td>
            ${money(
              row.unit_cost
            )}
          </td>

          <td>
            ${money(
              requisitionLineTotal(
                row
              )
            )}
          </td>

        </tr>

      `
    ).join("");

  printHtml(
    `${reqNo} Requisition`,
    `

      <h1>
        Garage Operations Pro
      </h1>

      <h2>
        ${escapeHtml(reqNo)}
      </h2>

      <p>

        Vehicle:
        <strong>
          ${escapeHtml(
            vehicle?.registration ||
            "-"
          )}
        </strong>

      </p>

      <p>

        Customer:
        ${escapeHtml(
          vehicle?.customer ||
          "-"
        )}

      </p>

      <div class="summary">

        <div class="box">

          Requested<br>

          <strong>
            ${money(
              finance.requested
            )}
          </strong>

        </div>

        <div class="box">

          Paid<br>

          <strong>
            ${money(
              finance.received
            )}
          </strong>

        </div>

        <div class="box">

          Balance<br>

          <strong>
            ${money(
              finance.balance
            )}
          </strong>

        </div>

      </div>

      <h3>
        Items
      </h3>

      <table>

        <thead>

          <tr>

            <th>
              Item
            </th>

            <th>
              Qty
            </th>

            <th>
              Unit Cost
            </th>

            <th>
              Total
            </th>

          </tr>

        </thead>

        <tbody>
          ${itemRows}
        </tbody>

        <tfoot>

          <tr>

            <th colspan="3">
              Total
            </th>

            <th>
              ${money(
                finance.requested
              )}
            </th>

          </tr>

        </tfoot>

      </table>

    `
  );
}

/* =========================================================
   EVENT LISTENERS
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    $("reqQuantity")
      ?.addEventListener(
        "input",
        calculateReqFormTotal
      );

    $("reqUnitCost")
      ?.addEventListener(
        "input",
        calculateReqFormTotal
      );

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
        savePettyCash
      );

    $("reqForm")
      ?.addEventListener(
        "submit",
        saveRequisition
      );

    document
      .querySelectorAll(
        "[data-close-modal]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            closeModal(
              button.dataset
                .closeModal
            );

          }
        );

      });

    document.addEventListener(
      "click",
      event => {

        if (
          event.target.classList
            .contains("modal")
        ) {

          closeModal(
            event.target.id
          );

        }

      }
    );

    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Escape"
        ) {

          document
            .querySelectorAll(
              ".modal"
            )
            .forEach(
              modal => {

                closeModal(
                  modal.id
                );

              }
            );

        }

      }
    );

    loadAllData();

  }
);

/* =========================================================
   MAKE FUNCTIONS AVAILABLE TO INDEX.HTML
   ========================================================= */

window.showSection =
  showSection;

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

window.savePettyCash =
  savePettyCash;

window.deletePettyCash =
  deletePettyCash;

window.openReqModal =
  openReqModal;

window.saveRequisition =
  saveRequisition;

window.deleteRequisition =
  deleteRequisition;

window.previewSelectedReq =
  previewSelectedReq;

window.openFirstReqLine =
  openFirstReqLine;

window.searchRequisitions =
  searchRequisitions;

window.printSelectedReq =
  printSelectedReq;

window.printRequisitions =
  printRequisitions;

window.printVehicles =
  printVehicles;

window.printExpenses =
  printExpenses;

window.printPettyCash =
  printPettyCash;

window.openVehicleExpensePreview =
  openVehicleExpensePreview;

/* =========================================================
   DEBUG ACCESS
   ========================================================= */

window.GarageOperations = {

  supabase,

  get vehicles() {
    return vehicles;
  },

  get expenses() {
    return expenses;
  },

  get pettyCash() {
    return pettyCash;
  },

  get requisitions() {
    return requisitions;
  },

  getUniqueReqNumbers,

  getRequisitionRows,

  requisitionTotal,

  requisitionReceived,

  requisitionFinance,

  loadAllData

};

/* =========================================================
   END OF APP.JS
   ========================================================= */
