import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ======================================================
// SUPABASE CONNECTION
// ======================================================

const SUPABASE_URL =
  "https://ptluwoeogfkqavhspdjj.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ======================================================
// TABLES
// ======================================================

const TABLES = {
  vehicles: "vehicles",
  expenses: "expenses",
  petty: "petty_cash",
  requisitions: "requisitions"
};

// ======================================================
// DATA
// ======================================================

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];

// ======================================================
// HELPERS
// ======================================================

function money(value) {
  const number = Number(value || 0);

  return "KSh " + number.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function number(value) {
  return Number(value || 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function vehicleName(id) {
  if (!id) return "General";

  const vehicle = vehicles.find(v => v.id === id);

  return vehicle
    ? escapeHtml(vehicle.registration)
    : "Unknown";
}

function statusClass(status) {
  const s = String(status || "").toLowerCase();

  if (s.includes("repair")) return "status-repair";
  if (s.includes("completed") || s.includes("released") || s.includes("approved")) {
    return "status-completed";
  }
  if (s.includes("rejected")) return "status-rejected";

  return "status-pending";
}

function showToast(message, error = false) {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.className = "toast show" + (error ? " error" : "");

  setTimeout(() => {
    toast.className = "toast";
  }, 5000);
}

function supabaseError(prefix, error) {
  console.error(prefix, error);

  const details = [
    error?.message,
    error?.details,
    error?.hint,
    error?.code
  ].filter(Boolean).join(" | ");

  showToast(
    prefix + (details ? ": " + details : ""),
    true
  );
}

function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

function openModal(id) {
  document.getElementById(id).classList.add("show");
}

// ======================================================
// NAVIGATION
// ======================================================

window.showSection = function(sectionId, button) {

  document.querySelectorAll(".section")
    .forEach(section => section.classList.remove("active"));

  document.querySelectorAll(".nav button")
    .forEach(btn => btn.classList.remove("active"));

  document.getElementById(sectionId)
    .classList.add("active");

  if (button) {
    button.classList.add("active");
  }
};

// ======================================================
// LOAD VEHICLES
// ======================================================

async function loadVehicles() {

  const { data, error } = await supabase
    .from(TABLES.vehicles)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw {
      table: TABLES.vehicles,
      error
    };
  }

  vehicles = data || [];
}

// ======================================================
// LOAD EXPENSES
// ======================================================

async function loadExpenses() {

  const { data, error } = await supabase
    .from(TABLES.expenses)
    .select("*")
    .order("expense_date", { ascending: false });

  if (error) {
    throw {
      table: TABLES.expenses,
      error
    };
  }

  expenses = data || [];
}

// ======================================================
// LOAD PETTY CASH
// ======================================================

async function loadPettyCash() {

  const { data, error } = await supabase
    .from(TABLES.petty)
    .select("*")
    .order("cash_date", { ascending: false });

  if (error) {
    throw {
      table: TABLES.petty,
      error
    };
  }

  pettyCash = data || [];
}

// ======================================================
// LOAD REQUISITIONS
// ======================================================

async function loadRequisitions() {

  const { data, error } = await supabase
    .from(TABLES.requisitions)
    .select("*")
    .order("req_date", { ascending: false });

  if (error) {
    throw {
      table: TABLES.requisitions,
      error
    };
  }

  requisitions = data || [];
}

// ======================================================
// LOAD EVERYTHING
// ======================================================

window.loadAllData = async function() {

  showToast("Loading garage data...");

  try {

    await loadVehicles();
    await loadExpenses();
    await loadPettyCash();
    await loadRequisitions();

    populateVehicleSelects();

    renderDashboard();
    renderVehicles();
    renderExpenses();
    renderPettyCash();
    renderRequisitions();

    showToast("Garage data loaded successfully.");

  } catch (result) {

    const table = result?.table || "unknown table";
    const error = result?.error || result;

    supabaseError(
      "Could not load " + table,
      error
    );
  }
};

// ======================================================
// VEHICLE SELECTS
// ======================================================

function populateVehicleSelects() {

  const selects = [
    document.getElementById("expenseVehicle"),
    document.getElementById("reqVehicle")
  ];

  selects.forEach(select => {

    if (!select) return;

    const currentValue = select.value;

    select.innerHTML =
      `<option value="">General / No Vehicle</option>`;

    vehicles.forEach(vehicle => {

      const option = document.createElement("option");

      option.value = vehicle.id;

      option.textContent =
        vehicle.registration +
        (vehicle.customer
          ? " — " + vehicle.customer
          : "");

      select.appendChild(option);
    });

    select.value = currentValue;
  });
}

// ======================================================
// DASHBOARD
// ======================================================

function renderDashboard() {

  const totalVehicles = vehicles.length;

  const underRepair = vehicles.filter(
    v => String(v.status || "").toLowerCase() === "under repair"
  ).length;

  const billed = vehicles.reduce(
    (sum, v) => sum + number(v.billed),
    0
  );

  const paid = vehicles.reduce(
    (sum, v) => sum + number(v.paid),
    0
  );

  const outstanding = billed - paid;

  const expenseTotal = expenses.reduce(
    (sum, e) => sum + number(e.amount),
    0
  );

  const pettyTotal = pettyCash.reduce(
    (sum, p) => sum + number(p.amount),
    0
  );

  document.getElementById("dashVehicles").textContent =
    totalVehicles;

  document.getElementById("dashRepair").textContent =
    underRepair;

  document.getElementById("dashBilled").textContent =
    money(billed);

  document.getElementById("dashPaid").textContent =
    money(paid);

  document.getElementById("dashOutstanding").textContent =
    money(outstanding);

  document.getElementById("dashExpenses").textContent =
    money(expenseTotal);

  document.getElementById("dashPetty").textContent =
    money(pettyTotal);

  document.getElementById("dashReq").textContent =
    requisitions.length;
}

// ======================================================
// VEHICLES RENDER
// ======================================================

window.renderVehicles = function() {

  const body = document.getElementById("vehiclesBody");

  const search =
    String(document.getElementById("vehicleSearch")?.value || "")
      .toLowerCase();

  const status =
    document.getElementById("vehicleStatusFilter")?.value || "";

  const filtered = vehicles.filter(vehicle => {

    const matchesSearch =
      !search ||
      String(vehicle.registration || "").toLowerCase().includes(search) ||
      String(vehicle.customer || "").toLowerCase().includes(search);

    const matchesStatus =
      !status || vehicle.status === status;

    return matchesSearch && matchesStatus;
  });

  if (!filtered.length) {
    body.innerHTML =
      `<tr><td colspan="9" class="empty">
        No vehicles found.
      </td></tr>`;
    return;
  }

  body.innerHTML = filtered.map(vehicle => {

    const billed = number(vehicle.billed);
    const paid = number(vehicle.paid);
    const outstanding = billed - paid;

    return `
      <tr>
        <td><strong>${escapeHtml(vehicle.registration)}</strong></td>

        <td>${escapeHtml(vehicle.customer)}</td>

        <td>${escapeHtml(vehicle.date_in || "")}</td>

        <td>${escapeHtml(vehicle.job_type || "")}</td>

        <td>
          <span class="status ${statusClass(vehicle.status)}">
            ${escapeHtml(vehicle.status || "")}
          </span>
        </td>

        <td>${money(billed)}</td>

        <td>${money(paid)}</td>

        <td>${money(outstanding)}</td>

        <td>
          <div class="actions">

            <button class="btn btn-secondary btn-small"
              onclick="editVehicle('${vehicle.id}')">
              Edit
            </button>

            <button class="btn btn-danger btn-small"
              onclick="deleteVehicle('${vehicle.id}')">
              Delete
            </button>

          </div>
        </td>
      </tr>
    `;
  }).join("");
};

// ======================================================
// OPEN VEHICLE MODAL
// ======================================================

window.openVehicleModal = function(id = null) {

  document.getElementById("vehicleId").value = id || "";

  document.getElementById("vehicleModalTitle").textContent =
    id ? "Edit Vehicle" : "Add Vehicle";

  if (!id) {

    document.getElementById("vehicleRegistration").value = "";
    document.getElementById("vehicleCustomer").value = "";
    document.getElementById("vehicleDateIn").value = today();
    document.getElementById("vehicleDateOut").value = "";
    document.getElementById("vehicleJobType").value = "Repair";
    document.getElementById("vehicleStatus").value = "Under Repair";
    document.getElementById("vehicleBilled").value = "0";
    document.getElementById("vehiclePaid").value = "0";
    document.getElementById("vehicleReleasedTo").value = "";
    document.getElementById("vehicleReleasedContact").value = "";
    document.getElementById("vehicleDescription").value = "";
  }

  openModal("vehicleModal");
};

// ======================================================
// EDIT VEHICLE
// ======================================================

window.editVehicle = function(id) {

  const vehicle = vehicles.find(v => v.id === id);

  if (!vehicle) return;

  document.getElementById("vehicleId").value = vehicle.id;
  document.getElementById("vehicleRegistration").value =
    vehicle.registration || "";

  document.getElementById("vehicleCustomer").value =
    vehicle.customer || "";

  document.getElementById("vehicleDateIn").value =
    vehicle.date_in || today();

  document.getElementById("vehicleDateOut").value =
    vehicle.date_out || "";

  document.getElementById("vehicleJobType").value =
    vehicle.job_type || "Repair";

  document.getElementById("vehicleStatus").value =
    vehicle.status || "Under Repair";

  document.getElementById("vehicleBilled").value =
    vehicle.billed || 0;

  document.getElementById("vehiclePaid").value =
    vehicle.paid || 0;

  document.getElementById("vehicleReleasedTo").value =
    vehicle.released_to || "";

  document.getElementById("vehicleReleasedContact").value =
    vehicle.released_contact || "";

  document.getElementById("vehicleDescription").value =
    vehicle.description || "";

  document.getElementById("vehicleModalTitle").textContent =
    "Edit Vehicle";

  openModal("vehicleModal");
};

// ======================================================
// SAVE VEHICLE
// ======================================================

window.saveVehicle = async function(event) {

  event.preventDefault();

  const id =
    document.getElementById("vehicleId").value;

  const payload = {

    registration:
      document.getElementById("vehicleRegistration").value.trim(),

    customer:
      document.getElementById("vehicleCustomer").value.trim(),

    date_in:
      document.getElementById("vehicleDateIn").value,

    date_out:
      document.getElementById("vehicleDateOut").value || null,

    job_type:
      document.getElementById("vehicleJobType").value,

    status:
      document.getElementById("vehicleStatus").value,

    released_to:
      document.getElementById("vehicleReleasedTo").value.trim() || null,

    released_contact:
      document.getElementById("vehicleReleasedContact").value.trim() || null,

    description:
      document.getElementById("vehicleDescription").value.trim() || null,

    billed:
      number(document.getElementById("vehicleBilled").value),

    paid:
      number(document.getElementById("vehiclePaid").value)
  };

  try {

    let result;

    if (id) {

      result = await supabase
        .from(TABLES.vehicles)
        .update(payload)
        .eq("id", id);

    } else {

      result = await supabase
        .from(TABLES.vehicles)
        .insert(payload);
    }

    if (result.error) throw result.error;

    closeModal("vehicleModal");

    await loadAllData();

    showToast(
      id
        ? "Vehicle updated successfully."
        : "Vehicle added successfully."
    );

  } catch (error) {

    supabaseError(
      "Unable to save vehicle",
      error
    );
  }
};

// ======================================================
// DELETE VEHICLE
// ======================================================

window.deleteVehicle = async function(id) {

  const vehicle = vehicles.find(v => v.id === id);

  if (!vehicle) return;

  if (!confirm(
    `Delete vehicle ${vehicle.registration}?`
  )) return;

  try {

    const { error } = await supabase
      .from(TABLES.vehicles)
      .delete()
      .eq("id", id);

    if (error) throw error;

    await loadAllData();

    showToast("Vehicle deleted.");

  } catch (error) {

    supabaseError(
      "Unable to delete vehicle",
      error
    );
  }
};

// ======================================================
// EXPENSES RENDER
// ======================================================

window.renderExpenses = function() {

  const body =
    document.getElementById("expensesBody");

  const search =
    String(document.getElementById("expenseSearch")?.value || "")
      .toLowerCase();

  const category =
    document.getElementById("expenseCategoryFilter")?.value || "";

  const filtered = expenses.filter(expense => {

    const vehicle =
      vehicles.find(v => v.id === expense.vehicle_id);

    const matchesSearch =
      !search ||
      String(expense.description || "").toLowerCase().includes(search) ||
      String(vehicle?.registration || "").toLowerCase().includes(search);

    const matchesCategory =
      !category || expense.category === category;

    return matchesSearch && matchesCategory;
  });

  if (!filtered.length) {

    body.innerHTML =
      `<tr><td colspan="6" class="empty">
        No expenses found.
      </td></tr>`;

    return;
  }

  body.innerHTML = filtered.map(expense => {

    return `
      <tr>

        <td>${escapeHtml(expense.expense_date || "")}</td>

        <td>${vehicleName(expense.vehicle_id)}</td>

        <td>${escapeHtml(expense.description)}</td>

        <td>${escapeHtml(expense.category || "")}</td>

        <td>${money(expense.amount)}</td>

        <td>
          <div class="actions">

            <button class="btn btn-secondary btn-small"
              onclick="editExpense('${expense.id}')">
              Edit
            </button>

            <button class="btn btn-danger btn-small"
              onclick="deleteExpense('${expense.id}')">
              Delete
            </button>

          </div>
        </td>

      </tr>
    `;

  }).join("");
};

// ======================================================
// OPEN EXPENSE MODAL
// ======================================================

window.openExpenseModal = function(id = null) {

  document.getElementById("expenseId").value =
    id || "";

  document.getElementById("expenseModalTitle").textContent =
    id ? "Edit Expense" : "Add Expense";

  populateVehicleSelects();

  if (!id) {

    document.getElementById("expenseVehicle").value = "";
    document.getElementById("expenseDate").value = today();
    document.getElementById("expenseDescription").value = "";
    document.getElementById("expenseCategory").value = "Parts";
    document.getElementById("expenseAmount").value = "0";
  }

  openModal("expenseModal");
};

// ======================================================
// EDIT EXPENSE
// ======================================================

window.editExpense = function(id) {

  const expense =
    expenses.find(e => e.id === id);

  if (!expense) return;

  populateVehicleSelects();

  document.getElementById("expenseId").value =
    expense.id;

  document.getElementById("expenseVehicle").value =
    expense.vehicle_id || "";

  document.getElementById("expenseDate").value =
    expense.expense_date || today();

  document.getElementById("expenseDescription").value =
    expense.description || "";

  document.getElementById("expenseCategory").value =
    expense.category || "Other";

  document.getElementById("expenseAmount").value =
    expense.amount || 0;

  document.getElementById("expenseModalTitle").textContent =
    "Edit Expense";

  openModal("expenseModal");
};

// ======================================================
// SAVE EXPENSE
// ======================================================

window.saveExpense = async function(event) {

  event.preventDefault();

  const id =
    document.getElementById("expenseId").value;

  const payload = {

    vehicle_id:
      document.getElementById("expenseVehicle").value || null,

    expense_date:
      document.getElementById("expenseDate").value,

    description:
      document.getElementById("expenseDescription").value.trim(),

    category:
      document.getElementById("expenseCategory").value,

    amount:
      number(document.getElementById("expenseAmount").value)
  };

  try {

    let result;

    if (id) {

      result = await supabase
        .from(TABLES.expenses)
        .update(payload)
        .eq("id", id);

    } else {

      result = await supabase
        .from(TABLES.expenses)
        .insert(payload);
    }

    if (result.error) throw result.error;

    closeModal("expenseModal");

    await loadAllData();

    showToast(
      id
        ? "Expense updated successfully."
        : "Expense added successfully."
    );

  } catch (error) {

    supabaseError(
      "Unable to save expense",
      error
    );
  }
};

// ======================================================
// DELETE EXPENSE
// ======================================================

window.deleteExpense = async function(id) {

  if (!confirm("Delete this expense?")) return;

  try {

    const { error } = await supabase
      .from(TABLES.expenses)
      .delete()
      .eq("id", id);

    if (error) throw error;

    await loadAllData();

    showToast("Expense deleted.");

  } catch (error) {

    supabaseError(
      "Unable to delete expense",
      error
    );
  }
};

// ======================================================
// PETTY CASH RENDER
// ======================================================

window.renderPettyCash = function() {

  const body =
    document.getElementById("pettyBody");

  const search =
    String(document.getElementById("pettySearch")?.value || "")
      .toLowerCase();

  const category =
    document.getElementById("pettyCategoryFilter")?.value || "";

  const filtered = pettyCash.filter(item => {

    const matchesSearch =
      !search ||
      String(item.description || "").toLowerCase().includes(search) ||
      String(item.paid_to || "").toLowerCase().includes(search);

    const matchesCategory =
      !category || item.category === category;

    return matchesSearch && matchesCategory;
  });

  if (!filtered.length) {

    body.innerHTML =
      `<tr><td colspan="7" class="empty">
        No petty cash records found.
      </td></tr>`;

    return;
  }

  body.innerHTML = filtered.map(item => {

    return `
      <tr>

        <td>${escapeHtml(item.cash_date || "")}</td>

        <td>${escapeHtml(item.description)}</td>

        <td>${escapeHtml(item.paid_to || "")}</td>

        <td>${escapeHtml(item.category || "")}</td>

        <td>${money(item.amount)}</td>

        <td>${escapeHtml(item.notes || "")}</td>

        <td>
          <div class="actions">

            <button class="btn btn-secondary btn-small"
              onclick="editPettyCash('${item.id}')">
              Edit
            </button>

            <button class="btn btn-danger btn-small"
              onclick="deletePettyCash('${item.id}')">
              Delete
            </button>

          </div>
        </td>

      </tr>
    `;

  }).join("");
};

// ======================================================
// OPEN PETTY CASH MODAL
// ======================================================

window.openPettyModal = function(id = null) {

  document.getElementById("pettyId").value =
    id || "";

  document.getElementById("pettyModalTitle").textContent =
    id ? "Edit Petty Cash" : "Add Petty Cash";

  if (!id) {

    document.getElementById("pettyDate").value = today();
    document.getElementById("pettyDescription").value = "";
    document.getElementById("pettyPaidTo").value = "";
    document.getElementById("pettyCategory").value = "Transport";
    document.getElementById("pettyAmount").value = "0";
    document.getElementById("pettyNotes").value = "";
  }

  openModal("pettyModal");
};

// ======================================================
// EDIT PETTY CASH
// ======================================================

window.editPettyCash = function(id) {

  const item =
    pettyCash.find(p => p.id === id);

  if (!item) return;

  document.getElementById("pettyId").value =
    item.id;

  document.getElementById("pettyDate").value =
    item.cash_date || today();

  document.getElementById("pettyDescription").value =
    item.description || "";

  document.getElementById("pettyPaidTo").value =
    item.paid_to || "";

  document.getElementById("pettyCategory").value =
    item.category || "Other";

  document.getElementById("pettyAmount").value =
    item.amount || 0;

  document.getElementById("pettyNotes").value =
    item.notes || "";

  document.getElementById("pettyModalTitle").textContent =
    "Edit Petty Cash";

  openModal("pettyModal");
};

// ======================================================
// SAVE PETTY CASH
// ======================================================

window.savePettyCash = async function(event) {

  event.preventDefault();

  const id =
    document.getElementById("pettyId").value;

  const payload = {

    cash_date:
      document.getElementById("pettyDate").value,

    description:
      document.getElementById("pettyDescription").value.trim(),

    paid_to:
      document.getElementById("pettyPaidTo").value.trim() || null,

    category:
      document.getElementById("pettyCategory").value || null,

    amount:
      number(document.getElementById("pettyAmount").value),

    notes:
      document.getElementById("pettyNotes").value.trim() || null
  };

  try {

    let result;

    if (id) {

      result = await supabase
        .from(TABLES.petty)
        .update(payload)
        .eq("id", id);

    } else {

      result = await supabase
        .from(TABLES.petty)
        .insert(payload);
    }

    if (result.error) throw result.error;

    closeModal("pettyModal");

    await loadAllData();

    showToast(
      id
        ? "Petty cash updated successfully."
        : "Petty cash added successfully."
    );

  } catch (error) {

    supabaseError(
      "Unable to save petty cash",
      error
    );
  }
};

// ======================================================
// DELETE PETTY CASH
// ======================================================

window.deletePettyCash = async function(id) {

  if (!confirm("Delete this petty cash record?")) return;

  try {

    const { error } = await supabase
      .from(TABLES.petty)
      .delete()
      .eq("id", id);

    if (error) throw error;

    await loadAllData();

    showToast("Petty cash record deleted.");

  } catch (error) {

    supabaseError(
      "Unable to delete petty cash",
      error
    );
  }
};

// ======================================================
// REQUISITIONS RENDER
// ======================================================

window.renderRequisitions = function() {

  const body =
    document.getElementById("requisitionsBody");

  const search =
    String(document.getElementById("reqSearch")?.value || "")
      .toLowerCase();

  const status =
    document.getElementById("reqStatusFilter")?.value || "";

  const filtered =
    requisitions.filter(req => {

      const matchesSearch =
        !search ||
        String(req.req_no || "").toLowerCase().includes(search) ||
        String(req.item_description || "").toLowerCase().includes(search) ||
        String(req.requested_by || "").toLowerCase().includes(search);

      const matchesStatus =
        !status || req.status === status;

      return matchesSearch && matchesStatus;
    });

  if (!filtered.length) {

    body.innerHTML =
      `<tr><td colspan="11" class="empty">
        No requisitions found.
      </td></tr>`;

    return;
  }

  body.innerHTML = filtered.map(req => {

    return `
      <tr>

        <td><strong>${escapeHtml(req.req_no)}</strong></td>

        <td>${escapeHtml(req.req_date || "")}</td>

        <td>${escapeHtml(req.requested_by)}</td>

        <td>${vehicleName(req.vehicle_id)}</td>

        <td>${escapeHtml(req.item_description)}</td>

        <td>${number(req.quantity)}</td>

        <td>${money(req.unit_cost)}</td>

        <td><strong>${money(req.total_amount)}</strong></td>

        <td>${escapeHtml(req.expense_type || "")}</td>

        <td>
          <span class="status ${statusClass(req.status)}">
            ${escapeHtml(req.status || "")}
          </span>
        </td>

        <td>
          <div class="actions">

            <button class="btn btn-secondary btn-small"
              onclick="editRequisition('${req.id}')">
              Edit
            </button>

            <button class="btn btn-danger btn-small"
              onclick="deleteRequisition('${req.id}')">
              Delete
            </button>

          </div>
        </td>

      </tr>
    `;

  }).join("");
};

// ======================================================
// REQUISITION TOTAL
// ======================================================

window.calculateReqTotal = function() {

  const quantity =
    number(document.getElementById("reqQuantity").value);

  const unitCost =
    number(document.getElementById("reqUnitCost").value);

  const total =
    quantity * unitCost;

  document.getElementById("reqTotalDisplay")
    .textContent =
      total.toLocaleString("en-KE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
};

// ======================================================
// OPEN REQUISITION MODAL
// ======================================================

window.openRequisitionModal = function(id = null) {

  document.getElementById("reqId").value =
    id || "";

  document.getElementById("requisitionModalTitle").textContent =
    id ? "Edit Requisition" : "Add Requisition";

  populateVehicleSelects();

  if (!id) {

    document.getElementById("reqNo").value = "";

    document.getElementById("reqDate").value =
      today();

    document.getElementById("reqRequestedBy").value =
      "";

    document.getElementById("reqVehicle").value =
      "";

    document.getElementById("reqItemDescription").value =
      "";

    document.getElementById("reqQuantity").value =
      "1";

    document.getElementById("reqUnitCost").value =
      "0";

    document.getElementById("reqExpenseType").value =
      "Materials";

    document.getElementById("reqStatus").value =
      "Pending";

    document.getElementById("reqNotes").value =
      "";

    calculateReqTotal();
  }

  openModal("requisitionModal");
};

// ======================================================
// EDIT REQUISITION
// ======================================================

window.editRequisition = function(id) {

  const req =
    requisitions.find(r => r.id === id);

  if (!req) return;

  populateVehicleSelects();

  document.getElementById("reqId").value =
    req.id;

  document.getElementById("reqNo").value =
    req.req_no || "";

  document.getElementById("reqDate").value =
    req.req_date || today();

  document.getElementById("reqRequestedBy").value =
    req.requested_by || "";

  document.getElementById("reqVehicle").value =
    req.vehicle_id || "";

  document.getElementById("reqItemDescription").value =
    req.item_description || "";

  document.getElementById("reqQuantity").value =
    req.quantity || 1;

  document.getElementById("reqUnitCost").value =
    req.unit_cost || 0;

  document.getElementById("reqExpenseType").value =
    req.expense_type || "Materials";

  document.getElementById("reqStatus").value =
    req.status || "Pending";

  document.getElementById("reqNotes").value =
    req.notes || "";

  calculateReqTotal();

  document.getElementById("requisitionModalTitle").textContent =
    "Edit Requisition";

  openModal("requisitionModal");
};

// ======================================================
// SAVE REQUISITION
// ======================================================

window.saveRequisition = async function(event) {

  event.preventDefault();

  const id =
    document.getElementById("reqId").value;

  const quantity =
    number(document.getElementById("reqQuantity").value);

  const unitCost =
    number(document.getElementById("reqUnitCost").value);

  const total =
    quantity * unitCost;

  const payload = {

    req_no:
      document.getElementById("reqNo").value.trim(),

    req_date:
      document.getElementById("reqDate").value,

    requested_by:
      document.getElementById("reqRequestedBy").value.trim(),

    vehicle_id:
      document.getElementById("reqVehicle").value || null,

    item_description:
      document.getElementById("reqItemDescription").value.trim(),

    quantity,

    unit_cost:
      unitCost,

    total_amount:
      total,

    status:
      document.getElementById("reqStatus").value,

    notes:
      document.getElementById("reqNotes").value.trim() || null,

    expense_type:
      document.getElementById("reqExpenseType").value
  };

  try {

    let result;

    if (id) {

      result = await supabase
        .from(TABLES.requisitions)
        .update(payload)
        .eq("id", id);

    } else {

      result = await supabase
        .from(TABLES.requisitions)
        .insert(payload);
    }

    if (result.error) throw result.error;

    closeModal("requisitionModal");

    await loadAllData();

    showToast(
      id
        ? "Requisition updated successfully."
        : "Requisition added successfully."
    );

  } catch (error) {

    supabaseError(
      "Unable to save requisition",
      error
    );
  }
};

// ======================================================
// DELETE REQUISITION
// ======================================================

window.deleteRequisition = async function(id) {

  if (!confirm("Delete this requisition?")) return;

  try {

    const { error } = await supabase
      .from(TABLES.requisitions)
      .delete()
      .eq("id", id);

    if (error) throw error;

    await loadAllData();

    showToast("Requisition deleted.");

  } catch (error) {

    supabaseError(
      "Unable to delete requisition",
      error
    );
  }
};

// ======================================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// ======================================================

document.querySelectorAll(".modal")
  .forEach(modal => {

    modal.addEventListener("click", event => {

      if (event.target === modal) {
        modal.classList.remove("show");
      }

    });

  });

// ======================================================
// START APP
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

  loadAllData();

});
