import { createClient }
from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE APP.JS
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

let editingVehicleId = null;
let editingExpenseId = null;
let editingPettyId = null;
let editingReqId = null;


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return `KSh ${number(value).toLocaleString(
    "en-KE",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  )}`;
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
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function showToast(message, type = "success") {
  const toast = $("toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add("show");

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function closeModal(id) {
  const modal = $(id);

  if (!modal) return;

  modal.classList.remove("show");
  modal.classList.remove("active");
  modal.style.display = "none";
}

function openModal(id) {
  const modal = $(id);

  if (!modal) return;

  modal.classList.add("show");
  modal.classList.add("active");
  modal.style.display = "flex";
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function showSection(sectionId, button = null) {
  document.querySelectorAll(".app-section")
    .forEach(section => {
      section.classList.remove("active");
      section.style.display = "none";
    });

  const target = $(sectionId);

  if (target) {
    target.classList.add("active");
    target.style.display = "block";
  }

  document.querySelectorAll(
    ".nav-item, .sidebar-nav button, nav button"
  ).forEach(btn => {
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
    renderRequisitions();
  }
}


/* =========================================================
   DATA LOADING
   ========================================================= */

async function loadAllData() {
  try {
    const [
      vehiclesResult,
      expensesResult,
      pettyResult,
      requisitionsResult
    ] = await Promise.all([
      supabase
        .from("vehicles")
        .select("*")
        .order("created_at", {
          ascending: false
        }),

      supabase
        .from("expenses")
        .select("*")
        .order("created_at", {
          ascending: false
        }),

      supabase
        .from("petty_cash")
        .select("*")
        .order("created_at", {
          ascending: false
        }),

      supabase
        .from("requisitions")
        .select("*")
        .order("req_date", {
          ascending: false
        })
    ]);

    if (vehiclesResult.error) {
      console.error(
        "Vehicles:",
        vehiclesResult.error
      );
    }

    if (expensesResult.error) {
      console.error(
        "Expenses:",
        expensesResult.error
      );
    }

    if (pettyResult.error) {
      console.error(
        "Petty Cash:",
        pettyResult.error
      );
    }

    if (requisitionsResult.error) {
      console.error(
        "Requisitions:",
        requisitionsResult.error
      );
    }

    vehicles = vehiclesResult.data || [];
    expenses = expensesResult.data || [];
    pettyCash = pettyResult.data || [];
    requisitions = requisitionsResult.data || [];

    renderEverything();

  } catch (error) {
    console.error(error);
    showToast(
      "Unable to load garage data.",
      "error"
    );
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

  if ($("welcomeUser")) {
    $("welcomeUser").textContent =
      `Welcome, ${user}`;
  }

  if ($("sidebarUser")) {
    $("sidebarUser").textContent =
      user;
  }
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {

  const totalVehicles =
    vehicles.length;

  const repairVehicles =
    vehicles.filter(v =>
      normalizeStatus(v.status) ===
      "under repair"
    ).length;

  const totalBilled =
    vehicles.reduce(
      (sum, v) =>
        sum + number(v.billed),
      0
    );

  const totalPaid =
    vehicles.reduce(
      (sum, v) =>
        sum + number(v.paid),
      0
    );

  const totalOutstanding =
    vehicles.reduce(
      (sum, v) =>
        sum +
        Math.max(
          0,
          number(v.billed) -
          number(v.paid)
        ),
      0
    );

  const totalExpenses =
    expenses.reduce(
      (sum, e) =>
        sum + number(e.amount),
      0
    );

  const totalPetty =
    pettyCash.reduce(
      (sum, p) =>
        sum + number(p.amount),
      0
    );

  const uniqueReqNumbers =
    getUniqueReqNumbers();

  const totalReqValue =
    uniqueReqNumbers.reduce(
      (sum, reqNo) =>
        sum +
        requisitionFinance(reqNo)
          .requested,
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

function setText(id, value) {
  const el = $(id);

  if (el) {
    el.textContent = value;
  }
}

function renderDashboardActivity() {
  const container =
    $("dashboardActivity");

  if (!container) return;

  const activities = [];

  vehicles.slice(0, 5)
    .forEach(vehicle => {
      activities.push({
        date:
          vehicle.created_at ||
          vehicle.date_in ||
          "",
        text:
          `Vehicle ${vehicle.registration || ""} added`
      });
    });

  requisitions.slice(0, 5)
    .forEach(req => {
      activities.push({
        date:
          req.req_date ||
          req.created_at ||
          "",
        text:
          `${normalizeReq(req.req_no)} requisition`
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

function populateReqVehicleSelect() {
  const select = $("reqVehicle");

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
      `${vehicle.registration || ""} — ${vehicle.customer || ""}`;

    select.appendChild(option);
  });

  if (current) {
    select.value = current;
  }
}

function openVehicleModal(id = null) {
  editingVehicleId = id;

  const form = $("vehicleForm");

  if (form) {
    form.reset();
  }

  if ($("vehicleId")) {
    $("vehicleId").value =
      id || "";
  }

  if (!id) {
    if ($("vehicleDateIn")) {
      $("vehicleDateIn").value =
        today();
    }

    openModal("vehicleModal");
    return;
  }

  const vehicle =
    vehicles.find(v =>
      String(v.id) ===
      String(id)
    );

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

  openModal("vehicleModal");
}

async function saveVehicle(event) {
  if (event) {
    event.preventDefault();
  }

  const id =
    $("vehicleId")?.value ||
    editingVehicleId;

  const registration =
    $("vehicleRegistration")?.value
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
      $("vehicleCustomer")?.value
        ?.trim() || null,

    date_in:
      $("vehicleDateIn")?.value ||
      null,

    date_out:
      $("vehicleDateOut")?.value ||
      null,

    job_type:
      $("vehicleJobType")?.value
        ?.trim() || null,

    status:
      $("vehicleStatus")?.value ||
      "Under Repair",

    released_to:
      $("vehicleReleasedTo")?.value
        ?.trim() || null,

    released_contact:
      $("vehicleReleasedContact")?.value
        ?.trim() || null,

    description:
      $("vehicleDescription")?.value
        ?.trim() || null,

    billed:
      number(
        $("vehicleBilled")?.value
      ),

    paid:
      number(
        $("vehiclePaid")?.value
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

    closeModal("vehicleModal");

    editingVehicleId = null;

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Unable to save vehicle.",
      "error"
    );
  }
}

async function deleteVehicle(id) {

  if (!confirm(
    "Delete this vehicle?"
  )) {
    return;
  }

  try {

    const { error } =
      await supabase
        .from("vehicles")
        .delete()
        .eq("id", id);

    if (error) {
      throw error;
    }

    showToast(
      "Vehicle deleted."
    );

    await loadAllData();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Unable to delete vehicle.",
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
        `${vehicle.registration || ""} ${
          vehicle.customer || ""
        }`.toLowerCase();

      const matchesSearch =
        !search ||
        text.includes(search);

      const matchesStatus =
        !status ||
        vehicle.status === status;

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

function openExpenseModal(id = null) {

  editingExpenseId = id;

  $("expenseForm")?.reset();

  setValue(
    "expenseId",
    id || ""
  );

  if (!id) {
    setValue(
      "expenseDate",
      today()
    );

    populateExpenseVehicleSelect();

    openModal("expenseModal");
    return;
  }

  const expense =
    expenses.find(e =>
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

  populateExpenseVehicleSelect();

  setValue(
    "expenseVehicle",
    expense.vehicle_id
  );

  openModal("expenseModal");
}

async function saveExpense(event) {

  if (event) {
    event.preventDefault();
  }

  const id =
    $("expenseId")?.value ||
    editingExpenseId;

  const payload = {
    vehicle_id:
      $("expenseVehicle")?.value ||
      null,

    expense_date:
      $("expenseDate")?.value ||
      today(),

    category:
      $("expenseCategory")?.value ||
      null,

    amount:
      number(
        $("expenseAmount")?.value
      ),

    description:
      $("expenseDescription")?.value
        ?.trim() || null
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

    showToast(
      id
        ? "Expense updated."
        : "Expense added."
    );

    closeModal("expenseModal");

    editingExpenseId = null;

    await loadAllData();

  } catch (error) {

    console.error(error);

    showToast(
      error.message ||
      "Unable to save expense.",
      "error"
    );
  }
}

async function deleteExpense(id) {

  if (!confirm(
    "Delete this expense?"
  )) {
    return;
  }

  try {

    const { error } =
      await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

    if (error) {
      throw error;
    }

    showToast(
      "Expense deleted."
    );

    await loadAllData();

  } catch (error) {

    console.error(error);

    showToast(
      error.message ||
      "Unable to delete expense.",
      "error"
    );
  }
}

function getVehicleById(id) {
  return vehicles.find(v =>
    String(v.id) ===
    String(id)
  );
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
        `${vehicle?.registration || ""} ${
          vehicle?.customer || ""
        } ${
          expense.description || ""
        }`.toLowerCase();

      const matchesSearch =
        !search ||
        text.includes(search);

      const matchesCategory =
        !category ||
        expense.category === category;

      return (
        matchesSearch &&
        matchesCategory
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
            ${money(expense.amount)}
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

  const reqNumbers =
    getUniqueReqNumbers();

  select.innerHTML =
    `<option value="">
      Not linked to requisition
    </option>`;

  reqNumbers.forEach(reqNo => {

    const option =
      document.createElement("option");

    option.value =
      reqNo;

    const finance =
      requisitionFinance(reqNo);

    option.textContent =
      `${reqNo} — ${money(
        finance.requested
      )}`;

    select.appendChild(option);
  });

  if (current) {
    select.value = current;
  }
}

function openPettyModal(id = null) {

  editingPettyId = id;

  $("pettyForm")?.reset();

  setValue(
    "pettyId",
    id || ""
  );

  populatePettyReqSelect();

  if (!id) {

    setValue(
      "pettyDate",
      today()
    );

    openModal("pettyModal");

    return;
  }

  const petty =
    pettyCash.find(p =>
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

  openModal("pettyModal");
}

async function savePettyCash(event) {

  if (event) {
    event.preventDefault();
  }

  const id =
    $("pettyId")?.value ||
    editingPettyId;

  const reqNo =
    normalizeReq(
      $("pettyReqNo")?.value
    );

  const payload = {

    cash_date:
      $("pettyDate")?.value ||
      today(),

    paid_to:
      $("pettyPaidTo")?.value
        ?.trim() || null,

    category:
      $("pettyCategory")?.value ||
      null,

    amount:
      number(
        $("pettyAmount")?.value
      ),

    description:
      $("pettyDescription")?.value
        ?.trim() || null,

    notes:
      $("pettyNotes")?.value
        ?.trim() || null,

    req_no:
      reqNo || null
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

    showToast(
      id
        ? "Petty cash updated."
        : "Petty cash added."
    );

    closeModal("pettyModal");

    editingPettyId = null;

    await loadAllData();

  } catch (error) {

    console.error(error);

    showToast(
      error.message ||
      "Unable to save petty cash.",
      "error"
    );
  }
}

async function deletePettyCash(id) {

  if (!confirm(
    "Delete this petty cash entry?"
  )) {
    return;
  }

  try {

    const { error } =
      await supabase
        .from("petty_cash")
        .delete()
        .eq("id", id);

    if (error) {
      throw error;
    }

    showToast(
      "Petty cash deleted."
    );

    await loadAllData();

  } catch (error) {

    console.error(error);

    showToast(
      error.message ||
      "Unable to delete petty cash.",
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
        `${petty.paid_to || ""} ${
          petty.description || ""
        } ${
          petty.notes || ""
        } ${
          petty.req_no || ""
        }`.toLowerCase();

      const matchesSearch =
        !search ||
        text.includes(search);

      const matchesCategory =
        !category ||
        petty.category === category;

      return (
        matchesSearch &&
        matchesCategory
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
    filtered.map(petty => {

      return `
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
            ${money(petty.amount)}
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
      `;

    }).join("");
}


/* =========================================================
   REQUISITION CORE LOGIC
   IMPORTANT:
   EVERYTHING IS CALCULATED BY EXACT REQUISITION NUMBER.
   NEVER BY VEHICLE.
   NEVER BY ALL PETTY CASH.
   NEVER BY ALL REQUISITIONS.
   ========================================================= */


/*
   Return every unique requisition number.

   Example:

   REQ-001
   REQ-002
   REQ-003

   Each remains independent.
*/
function getUniqueReqNumbers() {

  const set =
    new Set();

  requisitions.forEach(req => {

    const reqNo =
      normalizeReq(
        req.req_no
      );

    if (reqNo) {
      set.add(reqNo);
    }
  });

  return Array.from(set);
}


/*
   Get all database rows belonging to ONE
   exact requisition number.
*/
function getRequisitionRows(reqNo) {

  const normalized =
    normalizeReq(reqNo);

  return requisitions.filter(req =>
    normalizeReq(req.req_no) ===
    normalized
  );
}


/*
   Calculate requested amount for ONE
   exact requisition.

   Example:

   REQ-002

   Cabin jigging       5,000
   Bike                1,000
   Master cylinder     4,000
   Air cleaner         6,000

   TOTAL = 16,000

   This is NOT combined with REQ-001.
*/
function requisitionTotal(reqNo) {

  const rows =
    getRequisitionRows(reqNo);

  return rows.reduce(
    (sum, row) => {

      const quantity =
        number(row.quantity);

      const unitCost =
        number(row.unit_cost);

      let lineTotal;

      if (
        quantity > 0 &&
        unitCost > 0
      ) {

        lineTotal =
          quantity * unitCost;

      } else {

        lineTotal =
          number(
            row.total_amount
          );
      }

      return sum + lineTotal;

    },
    0
  );
}


/*
   Calculate payments received for ONE
   exact requisition number.

   REQ-002 receives only payments
   linked to REQ-002.
*/
function requisitionReceived(reqNo) {

  const normalized =
    normalizeReq(reqNo);

  return pettyCash
    .filter(petty =>
      normalizeReq(
        petty.req_no
      ) === normalized
    )
    .reduce(
      (sum, petty) =>
        sum + number(
          petty.amount
        ),
      0
    );
}


/*
   Complete financial position of ONE
   requisition.

   requested
   received
   balance
*/
function requisitionFinance(reqNo) {

  const requested =
    requisitionTotal(reqNo);

  const received =
    requisitionReceived(reqNo);

  const balance =
    Math.max(
      0,
      requested - received
    );

  return {
    requested,
    received,
    balance
  };
}


/*
   Get the vehicle connected to a requisition.

   The requisition itself remains identified
   by req_no.
*/
function getRequisitionVehicle(reqNo) {

  const rows =
    getRequisitionRows(reqNo);

  if (!rows.length) {
    return null;
  }

  const vehicleId =
    rows.find(row =>
      row.vehicle_id
    )?.vehicle_id;

  if (vehicleId) {

    return getVehicleById(
      vehicleId
    );
  }

  return null;
}


/* =========================================================
   REQUISITIONS — OPEN FORM
   ========================================================= */

function openReqModal(id = null) {

  editingReqId = id;

  $("reqForm")?.reset();

  setValue(
    "reqId",
    id || ""
  );

  populateReqVehicleSelect();

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

    openModal("reqModal");

    return;
  }

  const req =
    requisitions.find(r =>
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
    req.req_date
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
    req.status
  );

  setValue(
    "reqCategory",
    req.category || ""
  );

  setValue(
    "reqNotes",
    req.notes
  );

  calculateReqFormTotal();

  openModal("reqModal");
}


/* =========================================================
   REQUISITION FORM TOTAL
   ========================================================= */

function calculateReqFormTotal() {

  const quantity =
    number(
      $("reqQuantity")?.value
    );

  const unitCost =
    number(
      $("reqUnitCost")?.value
    );

  const total =
    quantity * unitCost;

  if ($("reqTotal")) {
    $("reqTotal").value =
      total || "";
  }
}


/* =========================================================
   SAVE REQUISITION
   ========================================================= */

async function saveRequisition(event) {

  if (event) {
    event.preventDefault();
  }

  const id =
    $("reqId")?.value ||
    editingReqId;

  const reqNo =
    normalizeReq(
      $("reqNo")?.value
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
      $("reqQuantity")?.value
    );

  const unitCost =
    number(
      $("reqUnitCost")?.value
    );

  const calculatedTotal =
    quantity > 0 && unitCost > 0
      ? quantity * unitCost
      : number(
          $("reqTotal")?.value
        );

  /*
     IMPORTANT:
     We intentionally use the known database
     columns only.

     This prevents a missing optional category
     column from breaking the entire save.
  */
  const payload = {

    req_no:
      reqNo,

    req_date:
      $("reqDate")?.value ||
      today(),

    requested_by:
      $("reqRequestedBy")?.value
        ?.trim() || null,

    vehicle_id:
      $("reqVehicle")?.value ||
      null,

    item_description:
      itemDescription,

    quantity:
      quantity,

    unit_cost:
      unitCost,

    total_amount:
      calculatedTotal,

    status:
      $("reqStatus")?.value ||
      "Pending",

    notes:
      $("reqNotes")?.value
        ?.trim() || null
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

    closeModal("reqModal");

    editingReqId = null;

    await loadAllData();

  } catch (error) {

    console.error(
      "Requisition save error:",
      error
    );

    showToast(
      error.message ||
      "Unable to save requisition.",
      "error"
    );
  }
}


/* =========================================================
   REQUISITION TABLE
   ========================================================= */

/*
   CRITICAL:

   The table displays ONE ROW PER REQUISITION NUMBER.

   Therefore:

   REQ-001 = one financial position
   REQ-002 = another financial position
   REQ-003 = another financial position

   Multiple item rows belonging to REQ-002
   are combined ONLY inside REQ-002.

   They are NEVER combined with REQ-001.
*/
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

  const filteredReqNumbers =
    uniqueReqNumbers.filter(reqNo => {

      const rows =
        getRequisitionRows(reqNo);

      const vehicle =
        getRequisitionVehicle(reqNo);

      const first =
        rows[0] || {};

      const text =
        `${reqNo} ${
          first.requested_by || ""
        } ${
          vehicle?.registration || ""
        } ${
          vehicle?.customer || ""
        } ${
          rows.map(
            r =>
              r.item_description || ""
          ).join(" ")
        }`.toLowerCase();

      const finance =
        requisitionFinance(reqNo);

      const matchesSearch =
        !search ||
        text.includes(search) ||
        String(
          finance.requested
        ).includes(search);

      const matchesStatus =
        !status ||
        rows.some(row =>
          row.status === status
        );

      return (
        matchesSearch &&
        matchesStatus
      );
    });

  /*
     Overall total is still calculated from
     UNIQUE requisition numbers only.

     This prevents duplicate line items from
     being counted twice.
  */
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

  if (!filteredReqNumbers.length) {

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
    filteredReqNumbers
      .map(reqNo => {

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
            row => row.status
          )?.status ||
          "Pending";

        return `
          <tr>

            <td>
              <strong>
                ${escapeHtml(reqNo)}
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
              item${rows.length === 1 ? "" : "s"}
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
                onclick="previewSelectedReq('${reqNo}')">
                View
              </button>

              <button
                onclick="openFirstReqLine('${reqNo}')">
                Edit
              </button>

            </td>

          </tr>
        `;

      })
      .join("");
}


/* =========================================================
   OPEN FIRST LINE OF A REQUISITION
   ========================================================= */

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

  if (!reqNo) {

    const selected =
      $("reqSearch")?.value
        ?.trim();

    reqNo =
      normalizeReq(
        selected
      );
  }

  reqNo =
    normalizeReq(reqNo);

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
            <th>Item</th>
            <th>Qty</th>
            <th>Unit Cost</th>
            <th>Total</th>
          </tr>

        </thead>

        <tbody>

          ${rows.map(row => {

            const qty =
              number(
                row.quantity
              );

            const unit =
              number(
                row.unit_cost
              );

            const total =
              qty > 0 && unit > 0
                ? qty * unit
                : number(
                    row.total_amount
                  );

            return `
              <tr>

                <td>
                  ${escapeHtml(
                    row.item_description ||
                    "-"
                  )}
                </td>

                <td>
                  ${qty}
                </td>

                <td>
                  ${money(unit)}
                </td>

                <td>
                  ${money(total)}
                </td>

              </tr>
            `;

          }).join("")}

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
        Payments Linked To ${escapeHtml(reqNo)}
      </h3>

      ${
        pettyCash.filter(
          p =>
            normalizeReq(
              p.req_no
            ) === reqNo
        ).length

        ?

        `
        <table>

          <thead>

            <tr>
              <th>Date</th>
              <th>Paid To</th>
              <th>Category</th>
              <th>Amount</th>
            </tr>

          </thead>

          <tbody>

            ${
              pettyCash
                .filter(
                  p =>
                    normalizeReq(
                      p.req_no
                    ) === reqNo
                )
                .map(p => `
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
                `)
                .join("")
            }

          </tbody>

        </table>
        `

        :

        `
        <p>
          No payments linked to this requisition.
        </p>
        `
      }

    </div>

  `;

  openModal(
    "reqPreviewModal"
  );
}


/* =========================================================
   SEARCH REQUISITION
   ========================================================= */

function searchRequisitions() {
  renderRequisitions();

  const search =
    $("reqSearch")
      ?.value
      ?.trim();

  if (!search) {
    return;
  }

  const exact =
    normalizeReq(search);

  const found =
    getUniqueReqNumbers()
      .some(reqNo =>
        reqNo === exact
      );

  if (found) {
    previewSelectedReq(exact);
  }
}


/* =========================================================
   DELETE REQUISITION LINE
   ========================================================= */

async function deleteRequisition(id) {

  if (!confirm(
    "Delete this requisition item?"
  )) {
    return;
  }

  try {

    const { error } =
      await supabase
        .from("requisitions")
        .delete()
        .eq("id", id);

    if (error) {
      throw error;
    }

    showToast(
      "Requisition item deleted."
    );

    await loadAllData();

  } catch (error) {

    console.error(error);

    showToast(
      error.message ||
      "Unable to delete requisition.",
      "error"
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
    expenses.filter(e =>
      String(e.vehicle_id) ===
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

  const modal =
    $("vehicleExpensePreviewModal");

  const content =
    $("vehicleExpensePreviewContent");

  if (!modal || !content) {
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
          vehicle.customer ||
          ""
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

      ?

      `
      <table>

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
            vehicleExpenses.map(
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
            ).join("")
          }

        </tbody>

      </table>
      `

      :

      `
      <p>
        No expenses recorded for this vehicle.
      </p>
      `
    }

  `;

  openModal(
    "vehicleExpensePreviewModal"
  );
}


/* =========================================================
   PRINT HELPERS
   ========================================================= */

function printHtml(title, html) {

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
        />

        <style>

          body {
            font-family: Arial, sans-serif;
            padding: 30px;
            color: #111;
          }

          h1, h2, h3 {
            margin-bottom: 8px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }

          th, td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
          }

          th {
            background: #f1f1f1;
          }

          .summary {
            display: flex;
            gap: 20px;
            margin: 20px 0;
          }

          .box {
            border: 1px solid #ddd;
            padding: 15px;
            min-width: 150px;
          }

          @media print {
            body {
              padding: 10px;
            }
          }

        </style>

      </head>

      <body>

        ${html}

        <script>
          window.onload = function() {
            window.print();
          };
        <\/script>

      </body>

    </html>
  `);

  printWindow.document.close();
}


/* =========================================================
   PRINT VEHICLES
   ========================================================= */

function printVehicles() {

  const rows =
    vehicles.map(vehicle => {

      const outstanding =
        Math.max(
          0,
          number(vehicle.billed) -
          number(vehicle.paid)
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

    }).join("");

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
            <th>Registration</th>
            <th>Customer</th>
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

  const total =
    expenses.reduce(
      (sum, e) =>
        sum +
        number(e.amount),
      0
    );

  const rows =
    expenses.map(expense => {

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

    }).join("");

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
            <th>Vehicle</th>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
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

  const total =
    pettyCash.reduce(
      (sum, p) =>
        sum +
        number(p.amount),
      0
    );

  const rows =
    pettyCash.map(petty => {

      return `
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
      `;

    }).join("");

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
            <th>Date</th>
            <th>REQ No.</th>
            <th>Paid To</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Description</th>
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
   PRINT ALL REQUISITIONS
   ========================================================= */

function printRequisitions() {

  const uniqueReqNumbers =
    getUniqueReqNumbers();

  const rows =
    uniqueReqNumbers.map(reqNo => {

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
            ${escapeHtml(reqNo)}
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

    }).join("");

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
            <th>REQ No.</th>
            <th>Vehicle</th>
            <th>Requested</th>
            <th>Paid</th>
            <th>Balance</th>
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

function printSelectedReq(reqNo = null) {

  reqNo =
    normalizeReq(
      reqNo ||
      $("reqSearch")?.value
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
    rows.map(row => {

      const qty =
        number(row.quantity);

      const unit =
        number(row.unit_cost);

      const total =
        qty > 0 && unit > 0
          ? qty * unit
          : number(
              row.total_amount
            );

      return `
        <tr>

          <td>
            ${escapeHtml(
              row.item_description ||
              "-"
            )}
          </td>

          <td>
            ${qty}
          </td>

          <td>
            ${money(unit)}
          </td>

          <td>
            ${money(total)}
          </td>

        </tr>
      `;

    }).join("");

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
            <th>Item</th>
            <th>Qty</th>
            <th>Unit Cost</th>
            <th>Total</th>
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
   SMALL HELPERS
   ========================================================= */

function setValue(id, value) {

  const el = $(id);

  if (!el) return;

  el.value =
    value === null ||
    value === undefined
      ? ""
      : value;
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    /*
       Requisition live calculation
    */

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


    /*
       Vehicle search
    */

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


    /*
       Expense search
    */

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


    /*
       Petty cash search
    */

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


    /*
       Requisition search
    */

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


    /*
       Form submissions
    */

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


    /*
       Close buttons / generic modal controls
    */

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


    /*
       Clicking outside a modal closes it.
    */

    document.addEventListener(
      "click",
      event => {

        if (
          event.target.classList.contains(
            "modal"
          )
        ) {

          event.target.classList.remove(
            "show"
          );

          event.target.classList.remove(
            "active"
          );

          event.target.style.display =
            "none";
        }

      }
    );


    /*
       Escape closes open modal.
    */

    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Escape"
        ) {

          document
            .querySelectorAll(".modal")
            .forEach(modal => {

              modal.classList.remove(
                "show"
              );

              modal.classList.remove(
                "active"
              );

              modal.style.display =
                "none";
            });

        }

      }
    );


    /*
       Initial load
    */

    loadAllData();

  }
);


/* =========================================================
   MAKE FUNCTIONS AVAILABLE TO INDEX.HTML
   =========================================================
   IMPORTANT because app.js is type="module".
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

window.searchRequisitions =
  searchRequisitions;


/* =========================================================
   DEBUG HELPERS
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

  requisitionFinance

};


/* =========================================================
   END
   ========================================================= */o
