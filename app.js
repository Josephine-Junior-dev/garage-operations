import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ======================================================
// SUPABASE
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
// LOCAL DATA
// ======================================================

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];

// ======================================================
// HELPERS
// ======================================================

function money(value) {
  return Number(value || 0).toLocaleString("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2
  });
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function vehicleName(id) {
  if (!id) return "General / No Vehicle";

  const vehicle = vehicles.find(v => v.id === id);

  if (!vehicle) return "Unknown Vehicle";

  return vehicle.registration || "Vehicle";
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value.includes("repair")) return "status-repair";
  if (value.includes("completed")) return "status-completed";
  if (value.includes("rejected")) return "status-rejected";
  if (value.includes("pending")) return "status-pending";
  if (value.includes("approved")) return "status-completed";
  if (value.includes("paid")) return "status-completed";

  return "status-pending";
}

function showToast(message, error = false) {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.className = "toast show" + (error ? " error" : "");

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toast.className = "toast";
  }, 3500);
}

function supabaseError(result, action = "Operation") {
  console.error(action, result);

  const message =
    result?.error?.message ||
    result?.message ||
    "Unknown Supabase error";

  showToast(`${action} failed: ${message}`, true);
}

// ======================================================
// MODALS
// ======================================================

window.openModal = function(id) {
  const modal = document.getElementById(id);

  if (modal) {
    modal.classList.add("show");
  }
};

window.closeModal = function(id) {
  const modal = document.getElementById(id);

  if (modal) {
    modal.classList.remove("show");
  }
};

// ======================================================
// NAVIGATION
// ======================================================

window.showSection = function(sectionId, button) {
  document.querySelectorAll(".section").forEach(section => {
    section.classList.remove("active");
  });

  const section = document.getElementById(sectionId);

  if (section) {
    section.classList.add("active");
  }

  document.querySelectorAll(".nav button").forEach(btn => {
    btn.classList.remove("active");
  });

  if (button) {
    button.classList.add("active");
  } else {
    const navButton = document.querySelector(
      `.nav button[data-section="${sectionId}"]`
    );

    if (navButton) {
      navButton.classList.add("active");
    }
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};

window.goToDashboardSection = function(sectionId) {
  window.showSection(sectionId);
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

  } catch (error) {
    console.error(error);

    supabaseError(
      error,
      `Loading ${error?.table || "application data"}`
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

    select.innerHTML = `
      <option value="">General / No Vehicle</option>
    `;

    vehicles.forEach(vehicle => {
      const option = document.createElement("option");

      option.value = vehicle.id;

      option.textContent =
        `${vehicle.registration || ""} - ${vehicle.customer || ""}`;

      select.appendChild(option);
    });

    if (
      currentValue &&
      vehicles.some(vehicle => vehicle.id === currentValue)
    ) {
      select.value = currentValue;
    }
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

  const totalBilled = vehicles.reduce(
    (sum, v) => sum + number(v.billed),
    0
  );

  const totalPaid = vehicles.reduce(
    (sum, v) => sum + number(v.paid),
    0
  );

  const outstanding = totalBilled - totalPaid;

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + number(e.amount),
    0
  );

  const totalPetty = pettyCash.reduce(
    (sum, p) => sum + number(p.amount),
    0
  );

  const totalReq = requisitions.length;

  const totalReqAmount = requisitions.reduce(
    (sum, r) => sum + number(r.total_amount),
    0
  );

  setText("dashVehicles", totalVehicles);
  setText("dashRepair", underRepair);
  setText("dashBilled", money(totalBilled));
  setText("dashPaid", money(totalPaid));
  setText("dashOutstanding", money(outstanding));
  setText("dashExpenses", money(totalExpenses));
  setText("dashPetty", money(totalPetty));
  setText("dashReq", totalReq);
  setText("dashReqTotal", money(totalReqAmount));
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

// ======================================================
// VEHICLES
// ======================================================

function renderVehicles() {
  const tbody = document.getElementById("vehiclesTableBody");

  if (!tbody) return;

  const search =
    document.getElementById("vehicleSearch")?.value
      .trim()
      .toLowerCase() || "";

  const status =
    document.getElementById("vehicleStatusFilter")?.value || "";

  const filtered = vehicles.filter(vehicle => {
    const searchable = [
      vehicle.registration,
      vehicle.customer,
      vehicle.job_type,
      vehicle.status,
      vehicle.description
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !search || searchable.includes(search);

    const matchesStatus =
      !status || vehicle.status === status;

    return matchesSearch && matchesStatus;
  });

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="empty">
          No vehicles found.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = filtered.map(vehicle => {
    const billed = number(vehicle.billed);
    const paid = number(vehicle.paid);
    const outstanding = billed - paid;

    return `
      <tr onclick="editVehicle('${vehicle.id}')" style="cursor:pointer">

        <td>
          <strong>${escapeHtml(vehicle.registration)}</strong>
        </td>

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

        <td class="no-print">
          <div class="actions">

            <button
              class="btn secondary"
              onclick="event.stopPropagation(); editVehicle('${vehicle.id}')">
              Edit
            </button>

            <button
              class="btn danger"
              onclick="event.stopPropagation(); deleteVehicle('${vehicle.id}')">
              Delete
            </button>

          </div>
        </td>

      </tr>
    `;
  }).join("");
}

window.openVehicleModal = function(id = null) {
  const form = document.getElementById("vehicleForm");

  if (form) form.reset();

  document.getElementById("vehicleId").value = "";

  document.getElementById("vehicleModalTitle").textContent =
    "Add Vehicle";

  document.getElementById("vehicleDateIn").value = today();
  document.getElementById("vehicleBilled").value = "0";
  document.getElementById("vehiclePaid").value = "0";

  if (id) {
    editVehicle(id);
    return;
  }

  openModal("vehicleModal");
};

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
  document.getElementById("vehicleReleasedTo").value =
    vehicle.released_to || "";
  document.getElementById("vehicleReleasedContact").value =
    vehicle.released_contact || "";
  document.getElementById("vehicleDescription").value =
    vehicle.description || "";
  document.getElementById("vehicleBilled").value =
    number(vehicle.billed);
  document.getElementById("vehiclePaid").value =
    number(vehicle.paid);

  document.getElementById("vehicleModalTitle").textContent =
    "Edit Vehicle";

  openModal("vehicleModal");
};

async function saveVehicle() {
  const id =
    document.getElementById("vehicleId").value || null;

  const payload = {
    registration:
      document.getElementById("vehicleRegistration").value.trim(),

    customer:
      document.getElementById("vehicleCustomer").value.trim(),

    date_in:
      document.getElementById("vehicleDateIn").value || today(),

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

    if (result.error) {
      supabaseError(result, "Saving vehicle");
      return;
    }

    showToast(
      id
        ? "Vehicle updated successfully."
        : "Vehicle added successfully."
    );

    closeModal("vehicleModal");

    await loadAllData();

  } catch (error) {
    supabaseError(
      { error },
      "Saving vehicle"
    );
  }
}

async function deleteVehicle(id) {
  const vehicle = vehicles.find(v => v.id === id);

  if (!vehicle) return;

  const confirmed = confirm(
    `Delete vehicle ${vehicle.registration}?\n\n` +
    `This will remove the vehicle record.`
  );

  if (!confirmed) return;

  try {
    const result = await supabase
      .from(TABLES.vehicles)
      .delete()
      .eq("id", id);

    if (result.error) {
      supabaseError(result, "Deleting vehicle");
      return;
    }

    showToast("Vehicle deleted.");

    await loadAllData();

  } catch (error) {
    supabaseError(
      { error },
      "Deleting vehicle"
    );
  }
}

window.deleteVehicle = deleteVehicle;

// ======================================================
// EXPENSES
// ======================================================

function renderExpenses() {
  const tbody =
    document.getElementById("expensesTableBody");

  if (!tbody) return;

  const search =
    document.getElementById("expenseSearch")?.value
      .trim()
      .toLowerCase() || "";

  const category =
    document.getElementById("expenseCategoryFilter")?.value || "";

  const filtered = expenses.filter(expense => {
    const searchable = [
      expense.description,
      expense.category,
      vehicleName(expense.vehicle_id)
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !search || searchable.includes(search);

    const matchesCategory =
      !category || expense.category === category;

    return matchesSearch && matchesCategory;
  });

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          No expenses found.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = filtered.map(expense => {
    return `
      <tr onclick="editExpense('${expense.id}')"
          style="cursor:pointer">

        <td>${escapeHtml(expense.expense_date || "")}</td>

        <td>${escapeHtml(vehicleName(expense.vehicle_id))}</td>

        <td>${escapeHtml(expense.description)}</td>

        <td>${escapeHtml(expense.category || "")}</td>

        <td>${money(expense.amount)}</td>

        <td class="no-print">
          <div class="actions">

            <button
              class="btn secondary"
              onclick="event.stopPropagation(); previewVehicleExpense('${expense.vehicle_id || ""}')">
              Preview
            </button>

            <button
              class="btn secondary"
              onclick="event.stopPropagation(); editExpense('${expense.id}')">
              Edit
            </button>

            <button
              class="btn danger"
              onclick="event.stopPropagation(); deleteExpense('${expense.id}')">
              Delete
            </button>

          </div>
        </td>

      </tr>
    `;
  }).join("");
}

window.openExpenseModal = function(id = null) {
  const form = document.getElementById("expenseForm");

  if (form) form.reset();

  document.getElementById("expenseId").value = "";

  populateVehicleSelects();

  document.getElementById("expenseDate").value = today();
  document.getElementById("expenseAmount").value = "0";

  document.getElementById("expenseModalTitle").textContent =
    "Add Expense";

  if (id) {
    editExpense(id);
    return;
  }

  openModal("expenseModal");
};

window.editExpense = function(id) {
  const expense = expenses.find(e => e.id === id);

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
    expense.category || "Parts";

  document.getElementById("expenseAmount").value =
    number(expense.amount);

  document.getElementById("expenseModalTitle").textContent =
    "Edit Expense";

  openModal("expenseModal");
};

async function saveExpense() {
  const id =
    document.getElementById("expenseId").value || null;

  const payload = {
    vehicle_id:
      document.getElementById("expenseVehicle").value || null,

    expense_date:
      document.getElementById("expenseDate").value || today(),

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

    if (result.error) {
      supabaseError(result, "Saving expense");
      return;
    }

    showToast(
      id
        ? "Expense updated successfully."
        : "Expense added successfully."
    );

    closeModal("expenseModal");

    await loadAllData();

  } catch (error) {
    supabaseError(
      { error },
      "Saving expense"
    );
  }
}

async function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;

  try {
    const result = await supabase
      .from(TABLES.expenses)
      .delete()
      .eq("id", id);

    if (result.error) {
      supabaseError(result, "Deleting expense");
      return;
    }

    showToast("Expense deleted.");

    await loadAllData();

  } catch (error) {
    supabaseError(
      { error },
      "Deleting expense"
    );
  }
}

window.deleteExpense = deleteExpense;

// ======================================================
// PETTY CASH
// ======================================================

function renderPettyCash() {
  const tbody =
    document.getElementById("pettyTableBody");

  if (!tbody) return;

  const search =
    document.getElementById("pettySearch")?.value
      .trim()
      .toLowerCase() || "";

  const category =
    document.getElementById("pettyCategoryFilter")?.value || "";

  const filtered = pettyCash.filter(item => {
    const searchable = [
      item.description,
      item.paid_to,
      item.category,
      item.notes
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !search || searchable.includes(search);

    const matchesCategory =
      !category || item.category === category;

    return matchesSearch && matchesCategory;
  });

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty">
          No petty cash records found.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = filtered.map(item => {
    return `
      <tr onclick="editPettyCash('${item.id}')"
          style="cursor:pointer">

        <td>${escapeHtml(item.cash_date || "")}</td>

        <td>${escapeHtml(item.description)}</td>

        <td>${escapeHtml(item.paid_to || "")}</td>

        <td>${escapeHtml(item.category || "")}</td>

        <td>${money(item.amount)}</td>

        <td>${escapeHtml(item.notes || "")}</td>

        <td class="no-print">
          <div class="actions">

            <button
              class="btn secondary"
              onclick="event.stopPropagation(); editPettyCash('${item.id}')">
              Edit
            </button>

            <button
              class="btn danger"
              onclick="event.stopPropagation(); deletePettyCash('${item.id}')">
              Delete
            </button>

          </div>
        </td>

      </tr>
    `;
  }).join("");
}

window.openPettyModal = function(id = null) {
  const form = document.getElementById("pettyForm");

  if (form) form.reset();

  document.getElementById("pettyId").value = "";

  document.getElementById("pettyDate").value = today();
  document.getElementById("pettyAmount").value = "0";

  document.getElementById("pettyModalTitle").textContent =
    "Add Petty Cash";

  if (id) {
    editPettyCash(id);
    return;
  }

  openModal("pettyModal");
};

window.editPettyCash = function(id) {
  const item = pettyCash.find(p => p.id === id);

  if (!item) return;

  document.getElementById("pettyId").value =
    item.id;

  document.getElementById("pettyDate").value =
    item.cash_date || today();

  document.getElementById("pettyPaidTo").value =
    item.paid_to || "";

  document.getElementById("pettyDescription").value =
    item.description || "";

  document.getElementById("pettyCategory").value =
    item.category || "Other";

  document.getElementById("pettyAmount").value =
    number(item.amount);

  document.getElementById("pettyNotes").value =
    item.notes || "";

  document.getElementById("pettyModalTitle").textContent =
    "Edit Petty Cash";

  openModal("pettyModal");
};

async function savePettyCash() {
  const id =
    document.getElementById("pettyId").value || null;

  const payload = {
    cash_date:
      document.getElementById("pettyDate").value || today(),

    description:
      document.getElementById("pettyDescription").value.trim(),

    paid_to:
      document.getElementById("pettyPaidTo").value.trim() || null,

    category:
      document.getElementById("pettyCategory").value,

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

    if (result.error) {
      supabaseError(result, "Saving petty cash");
      return;
    }

    showToast(
      id
        ? "Petty cash updated successfully."
        : "Petty cash added successfully."
    );

    closeModal("pettyModal");

    await loadAllData();

  } catch (error) {
    supabaseError(
      { error },
      "Saving petty cash"
    );
  }
}

async function deletePettyCash(id) {
  if (!confirm("Delete this petty cash record?")) return;

  try {
    const result = await supabase
      .from(TABLES.petty)
      .delete()
      .eq("id", id);

    if (result.error) {
      supabaseError(result, "Deleting petty cash");
      return;
    }

    showToast("Petty cash deleted.");

    await loadAllData();

  } catch (error) {
    supabaseError(
      { error },
      "Deleting petty cash"
    );
  }
}

window.deletePettyCash = deletePettyCash;

// ======================================================
// REQUISITIONS
// ======================================================

function renderRequisitions() {
  const tbody =
    document.getElementById("requisitionsTableBody");

  if (!tbody) return;

  const search =
    document.getElementById("reqSearch")?.value
      .trim()
      .toLowerCase() || "";

  const status =
    document.getElementById("reqStatusFilter")?.value || "";

  const filtered = requisitions.filter(req => {
    const searchable = [
      req.req_no,
      req.requested_by,
      vehicleName(req.vehicle_id),
      req.item_description,
      req.expense_type,
      req.category,
      req.status,
      req.notes
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !search || searchable.includes(search);

    const matchesStatus =
      !status || req.status === status;

    return matchesSearch && matchesStatus;
  });

  const overallTotal = filtered.reduce(
    (sum, req) => sum + number(req.total_amount),
    0
  );

  setText(
    "reqOverallTotal",
    money(overallTotal)
  );

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="empty">
          No requisitions found.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = filtered.map(req => {
    const total =
      number(req.total_amount) ||
      number(req.quantity) * number(req.unit_cost);

    const expenseType =
      req.expense_type ||
      req.category ||
      "Materials";

    return `
      <tr onclick="editRequisition('${req.id}')"
          style="cursor:pointer">

        <td>
          <strong>${escapeHtml(req.req_no)}</strong>
        </td>

        <td>${escapeHtml(req.req_date || "")}</td>

        <td>${escapeHtml(req.requested_by)}</td>

        <td>${escapeHtml(vehicleName(req.vehicle_id))}</td>

        <td>${escapeHtml(req.item_description)}</td>

        <td>${number(req.quantity)}</td>

        <td>${money(req.unit_cost)}</td>

        <td>
          <strong>${money(total)}</strong>
        </td>

        <td>${escapeHtml(expenseType)}</td>

        <td>
          <span class="status ${statusClass(req.status)}">
            ${escapeHtml(req.status || "")}
          </span>
        </td>

        <td class="no-print">
          <div class="actions">

            <button
              class="btn secondary"
              onclick="event.stopPropagation(); previewSingleRequisition('${req.id}')">
              Preview
            </button>

            <button
              class="btn secondary"
              onclick="event.stopPropagation(); editRequisition('${req.id}')">
              Edit
            </button>

            <button
              class="btn danger"
              onclick="event.stopPropagation(); deleteRequisition('${req.id}')">
              Delete
            </button>

          </div>
        </td>

      </tr>
    `;
  }).join("");
}

window.calculateReqTotal = function() {
  const quantity =
    number(document.getElementById("reqQuantity")?.value);

  const unitCost =
    number(document.getElementById("reqUnitCost")?.value);

  const total = quantity * unitCost;

  const display =
    document.getElementById("reqTotalDisplay");

  if (display) {
    display.value = money(total);
  }

  return total;
};

window.openRequisitionModal = function(id = null) {
  const form =
    document.getElementById("requisitionForm");

  if (form) form.reset();

  document.getElementById("requisitionId").value = "";

  populateVehicleSelects();

  document.getElementById("reqDate").value = today();

  document.getElementById("reqQuantity").value = "1";

  document.getElementById("reqUnitCost").value = "0";

  document.getElementById("reqExpenseType").value =
    "Materials";

  document.getElementById("reqStatus").value =
    "Pending";

  document.getElementById("reqTotalDisplay").value =
    money(0);

  document.getElementById("requisitionModalTitle").textContent =
    "Add Requisition";

  if (id) {
    editRequisition(id);
    return;
  }

  openModal("requisitionModal");
};

window.editRequisition = function(id) {
  const req = requisitions.find(r => r.id === id);

  if (!req) return;

  populateVehicleSelects();

  document.getElementById("requisitionId").value =
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
    number(req.quantity);

  document.getElementById("reqUnitCost").value =
    number(req.unit_cost);

  document.getElementById("reqExpenseType").value =
    req.expense_type ||
    req.category ||
    "Materials";

  document.getElementById("reqStatus").value =
    req.status || "Pending";

  document.getElementById("reqNotes").value =
    req.notes || "";

  calculateReqTotal();

  document.getElementById("requisitionModalTitle").textContent =
    "Edit Requisition";

  openModal("requisitionModal");
};

async function saveRequisition() {
  const id =
    document.getElementById("requisitionId").value || null;

  const quantity =
    number(document.getElementById("reqQuantity").value);

  const unitCost =
    number(document.getElementById("reqUnitCost").value);

  const expenseType =
    document.getElementById("reqExpenseType").value ||
    "Materials";

  /*
    IMPORTANT:
    Supabase has BOTH category and expense_type.
    We save both so the application remains compatible
    with the current database.
  */

  const payload = {
    req_no:
      document.getElementById("reqNo").value.trim(),

    req_date:
      document.getElementById("reqDate").value || today(),

    requested_by:
      document.getElementById("reqRequestedBy").value.trim(),

    vehicle_id:
      document.getElementById("reqVehicle").value || null,

    item_description:
      document.getElementById("reqItemDescription").value.trim(),

    quantity,

    unit_cost: unitCost,

    total_amount:
      quantity * unitCost,

    status:
      document.getElementById("reqStatus").value,

    notes:
      document.getElementById("reqNotes").value.trim() || null,

    category:
      expenseType,

    expense_type:
      expenseType
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

    if (result.error) {
      supabaseError(
        result,
        "Saving requisition"
      );
      return;
    }

    showToast(
      id
        ? "Requisition updated successfully."
        : "Requisition saved successfully."
    );

    closeModal("requisitionModal");

    await loadAllData();

  } catch (error) {
    supabaseError(
      { error },
      "Saving requisition"
    );
  }
}

async function deleteRequisition(id) {
  const req =
    requisitions.find(r => r.id === id);

  if (!req) return;

  const confirmed = confirm(
    `Delete requisition ${req.req_no}?\n\n` +
    `This will delete only this requisition record.`
  );

  if (!confirmed) return;

  try {
    const result = await supabase
      .from(TABLES.requisitions)
      .delete()
      .eq("id", id);

    if (result.error) {
      supabaseError(
        result,
        "Deleting requisition"
      );
      return;
    }

    showToast("Requisition deleted.");

    await loadAllData();

  } catch (error) {
    supabaseError(
      { error },
      "Deleting requisition"
    );
  }
}

window.deleteRequisition = deleteRequisition;

// ======================================================
// REQUISITION PREVIEW
// ======================================================

function getFilteredRequisitions() {
  const search =
    document.getElementById("reqSearch")?.value
      .trim()
      .toLowerCase() || "";

  const status =
    document.getElementById("reqStatusFilter")?.value || "";

  return requisitions.filter(req => {
    const searchable = [
      req.req_no,
      req.requested_by,
      vehicleName(req.vehicle_id),
      req.item_description,
      req.expense_type,
      req.category,
      req.status,
      req.notes
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search || searchable.includes(search)) &&
      (!status || req.status === status)
    );
  });
}

window.previewRequisitions = function() {
  const filtered = getFilteredRequisitions();

  if (!filtered.length) {
    showToast(
      "There are no requisitions to preview.",
      true
    );
    return;
  }

  const total = filtered.reduce(
    (sum, req) =>
      sum +
      (
        number(req.total_amount) ||
        number(req.quantity) * number(req.unit_cost)
      ),
    0
  );

  const rows = filtered.map(req => {
    const amount =
      number(req.total_amount) ||
      number(req.quantity) * number(req.unit_cost);

    return `
      <tr>
        <td>${escapeHtml(req.req_no)}</td>
        <td>${escapeHtml(req.req_date || "")}</td>
        <td>${escapeHtml(req.requested_by)}</td>
        <td>${escapeHtml(vehicleName(req.vehicle_id))}</td>
        <td>${escapeHtml(req.item_description)}</td>
        <td>${number(req.quantity)}</td>
        <td>${money(req.unit_cost)}</td>
        <td>${money(amount)}</td>
        <td>${escapeHtml(req.expense_type || req.category || "Materials")}</td>
        <td>${escapeHtml(req.status || "")}</td>
      </tr>
    `;
  }).join("");

  document.getElementById(
    "requisitionPreviewContent"
  ).innerHTML = `
    <div class="preview-meta">
      <div>
        <strong>Total Requisitions</strong><br>
        ${filtered.length}
      </div>

      <div>
        <strong>Overall Total</strong><br>
        ${money(total)}
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Req No.</th>
            <th>Date</th>
            <th>Requested By</th>
            <th>Vehicle</th>
            <th>Item</th>
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
    </div>

    <div class="preview-total">
      <span>Overall Total</span>
      <strong>${money(total)}</strong>
    </div>
  `;

  window.currentRequisitionPreview = {
    title: "Requisitions Preview",
    rows: filtered,
    total
  };

  openModal("requisitionPreviewModal");
};

window.previewSingleRequisition = function(id) {
  const req = requisitions.find(r => r.id === id);

  if (!req) return;

  const total =
    number(req.total_amount) ||
    number(req.quantity) * number(req.unit_cost);

  document.getElementById(
    "requisitionPreviewContent"
  ).innerHTML = `
    <div class="preview-meta">

      <div>
        <strong>Requisition No.</strong><br>
        ${escapeHtml(req.req_no)}
      </div>

      <div>
        <strong>Date</strong><br>
        ${escapeHtml(req.req_date || "")}
      </div>

      <div>
        <strong>Requested By</strong><br>
        ${escapeHtml(req.requested_by)}
      </div>

      <div>
        <strong>Vehicle</strong><br>
        ${escapeHtml(vehicleName(req.vehicle_id))}
      </div>

      <div>
        <strong>Expense Type</strong><br>
        ${escapeHtml(req.expense_type || req.category || "Materials")}
      </div>

      <div>
        <strong>Status</strong><br>
        ${escapeHtml(req.status || "")}
      </div>

    </div>

    <div class="panel">

      <div class="table-container">

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th>Quantity</th>
              <th>Unit Cost</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>${escapeHtml(req.item_description)}</td>
              <td>${number(req.quantity)}</td>
              <td>${money(req.unit_cost)}</td>
              <td><strong>${money(total)}</strong></td>
            </tr>
          </tbody>
        </table>

      </div>

    </div>

    ${
      req.notes
        ? `
          <div style="margin-top:16px">
            <strong>Notes</strong>
            <p>${escapeHtml(req.notes)}</p>
          </div>
        `
        : ""
    }

    <div class="preview-total">
      <span>Total Amount</span>
      <strong>${money(total)}</strong>
    </div>
  `;

  window.currentRequisitionPreview = {
    title: `Requisition ${req.req_no}`,
    rows: [req],
    total,
    single: true
  };

  openModal("requisitionPreviewModal");
};

window.printRequisitionPreview = function() {
  const content =
    document.getElementById(
      "requisitionPreviewContent"
    )?.innerHTML || "";

  if (!content) return;

  printHtml(
    "Requisition Preview",
    content
  );
};

window.shareRequisitionPreview = async function() {
  const data =
    window.currentRequisitionPreview;

  if (!data) return;

  let text =
    `${data.title}\n` +
    `====================\n\n`;

  data.rows.forEach(req => {
    const amount =
      number(req.total_amount) ||
      number(req.quantity) * number(req.unit_cost);

    text +=
      `Req No: ${req.req_no || ""}\n` +
      `Date: ${req.req_date || ""}\n` +
      `Requested By: ${req.requested_by || ""}\n` +
      `Vehicle: ${vehicleName(req.vehicle_id)}\n` +
      `Item: ${req.item_description || ""}\n` +
      `Quantity: ${number(req.quantity)}\n` +
      `Unit Cost: ${money(req.unit_cost)}\n` +
      `Total: ${money(amount)}\n` +
      `Expense Type: ${req.expense_type || req.category || "Materials"}\n` +
      `Status: ${req.status || ""}\n\n`;
  });

  text +=
    `OVERALL TOTAL: ${money(data.total)}`;

  await shareText(
    data.title,
    text
  );
};

// ======================================================
// VEHICLE EXPENSE PREVIEW
// ======================================================

function getVehicleExpenses(vehicleId) {
  return expenses.filter(
    expense => expense.vehicle_id === vehicleId
  );
}

window.previewVehicleExpense = function(vehicleId) {
  if (!vehicleId) {
    showToast(
      "This expense is General / No Vehicle.",
      true
    );
    return;
  }

  const vehicle =
    vehicles.find(v => v.id === vehicleId);

  const vehicleExpenses =
    getVehicleExpenses(vehicleId);

  if (!vehicleExpenses.length) {
    showToast(
      "No expenses found for this vehicle.",
      true
    );
    return;
  }

  const total = vehicleExpenses.reduce(
    (sum, expense) =>
      sum + number(expense.amount),
    0
  );

  const rows = vehicleExpenses.map(expense => `
    <tr>
      <td>${escapeHtml(expense.expense_date || "")}</td>
      <td>${escapeHtml(expense.description || "")}</td>
      <td>${escapeHtml(expense.category || "")}</td>
      <td>${money(expense.amount)}</td>
    </tr>
  `).join("");

  document.getElementById(
    "vehicleExpensePreviewContent"
  ).innerHTML = `

    <div class="preview-meta">

      <div>
        <strong>Registration</strong><br>
        ${escapeHtml(vehicle?.registration || vehicleName(vehicleId))}
      </div>

      <div>
        <strong>Customer</strong><br>
        ${escapeHtml(vehicle?.customer || "")}
      </div>

      <div>
        <strong>Total Expense Records</strong><br>
        ${vehicleExpenses.length}
      </div>

      <div>
        <strong>Total Expenses</strong><br>
        ${money(total)}
      </div>

    </div>

    <div class="table-container">

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

    </div>

    <div class="preview-total">
      <span>Total Vehicle Expenses</span>
      <strong>${money(total)}</strong>
    </div>
  `;

  window.currentVehicleExpensePreview = {
    vehicleId,
    vehicle,
    expenses: vehicleExpenses,
    total
  };

  openModal("vehicleExpensePreviewModal");
};

window.printVehicleExpensePreview = function() {
  const content =
    document.getElementById(
      "vehicleExpensePreviewContent"
    )?.innerHTML || "";

  if (!content) return;

  const vehicle =
    window.currentVehicleExpensePreview?.vehicle;

  printHtml(
    `Vehicle Expenses - ${vehicle?.registration || ""}`,
    content
  );
};

window.shareVehicleExpensePreview = async function() {
  const data =
    window.currentVehicleExpensePreview;

  if (!data) return;

  const vehicle =
    data.vehicle;

  let text =
    `VEHICLE EXPENSE REPORT\n` +
    `========================\n\n` +
    `Registration: ${vehicle?.registration || ""}\n` +
    `Customer: ${vehicle?.customer || ""}\n\n`;

  data.expenses.forEach(expense => {
    text +=
      `${expense.expense_date || ""} - ` +
      `${expense.description || ""} - ` +
      `${expense.category || ""} - ` +
      `${money(expense.amount)}\n`;
  });

  text +=
    `\nTOTAL VEHICLE EXPENSES: ${money(data.total)}`;

  await shareText(
    `Vehicle Expenses - ${vehicle?.registration || ""}`,
    text
  );
};

// ======================================================
// PRINT
// ======================================================

window.printSection = function(title, areaId) {
  const area =
    document.getElementById(areaId);

  if (!area) {
    showToast(
      "Print area not found.",
      true
    );
    return;
  }

  printHtml(
    title,
    area.innerHTML
  );
};

function printHtml(title, content) {
  const printWindow =
    window.open(
      "",
      "_blank",
      "width=1100,height=800"
    );

  if (!printWindow) {
    showToast(
      "Please allow pop-ups to print.",
      true
    );
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>

      <meta charset="UTF-8">

      <title>${escapeHtml(title)}</title>

      <style>

        body{
          font-family:Arial,Helvetica,sans-serif;
          color:#111827;
          padding:25px;
        }

        h1{
          margin:0 0 20px;
          font-size:24px;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:15px;
        }

        th,td{
          border:1px solid #cbd5e1;
          padding:9px;
          text-align:left;
        }

        th{
          background:#f1f5f9;
        }

        .preview-meta{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:10px;
          margin-bottom:15px;
        }

        .preview-meta div{
          border:1px solid #cbd5e1;
          padding:10px;
        }

        .preview-total{
          display:flex;
          justify-content:space-between;
          border-top:2px solid #111827;
          padding-top:12px;
          margin-top:15px;
          font-size:18px;
          font-weight:bold;
        }

        .print-summary{
          display:flex;
          justify-content:space-between;
          padding:12px;
          border:1px solid #cbd5e1;
          margin-bottom:10px;
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

      <h1>${escapeHtml(title)}</h1>

      ${content}

    </body>
    </html>
  `);

  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 300);
}

// ======================================================
// SHARING
// ======================================================

async function shareText(title, text) {
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
      navigator.clipboard &&
      navigator.clipboard.writeText
    ) {
      await navigator.clipboard.writeText(text);

      showToast(
        "Report copied. You can paste it into WhatsApp or another app."
      );

      return;
    }

    showToast(
      "Sharing is not available on this device.",
      true
    );

  } catch (error) {

    if (error?.name === "AbortError") {
      return;
    }

    console.error(error);

    showToast(
      "Unable to share the report.",
      true
    );
  }
}

window.shareText = shareText;

// ======================================================
// SHARE VEHICLES
// ======================================================

window.shareVehicles = async function() {
  const lines = [
    "GARAGE VEHICLES",
    "================"
  ];

  vehicles.forEach(vehicle => {
    const billed = number(vehicle.billed);
    const paid = number(vehicle.paid);
    const outstanding = billed - paid;

    lines.push(
      "",
      `Registration: ${vehicle.registration || ""}`,
      `Customer: ${vehicle.customer || ""}`,
      `Date In: ${vehicle.date_in || ""}`,
      `Job Type: ${vehicle.job_type || ""}`,
      `Status: ${vehicle.status || ""}`,
      `Billed: ${money(billed)}`,
      `Paid: ${money(paid)}`,
      `Outstanding: ${money(outstanding)}`
    );
  });

  await shareText(
    "Garage Vehicles",
    lines.join("\n")
  );
};

// ======================================================
// SHARE EXPENSES
// ======================================================

window.shareExpenses = async function() {
  const lines = [
    "GARAGE EXPENSES",
    "================"
  ];

  let total = 0;

  expenses.forEach(expense => {
    const amount = number(expense.amount);

    total += amount;

    lines.push(
      "",
      `Date: ${expense.expense_date || ""}`,
      `Vehicle: ${vehicleName(expense.vehicle_id)}`,
      `Description: ${expense.description || ""}`,
      `Category: ${expense.category || ""}`,
      `Amount: ${money(amount)}`
    );
  });

  lines.push(
    "",
    `TOTAL EXPENSES: ${money(total)}`
  );

  await shareText(
    "Garage Expenses",
    lines.join("\n")
  );
};

// ======================================================
// SHARE PETTY CASH
// ======================================================

window.sharePettyCash = async function() {
  const lines = [
    "PETTY CASH",
    "==========="
  ];

  let total = 0;

  pettyCash.forEach(item => {
    const amount = number(item.amount);

    total += amount;

    lines.push(
      "",
      `Date: ${item.cash_date || ""}`,
      `Description: ${item.description || ""}`,
      `Paid To: ${item.paid_to || ""}`,
      `Category: ${item.category || ""}`,
      `Amount: ${money(amount)}`,
      `Notes: ${item.notes || ""}`
    );
  });

  lines.push(
    "",
    `TOTAL PETTY CASH: ${money(total)}`
  );

  await shareText(
    "Petty Cash",
    lines.join("\n")
  );
};

// ======================================================
// SHARE REQUISITIONS
// ======================================================

window.shareRequisitions = async function() {
  const filtered =
    getFilteredRequisitions();

  let total = 0;

  const lines = [
    "GARAGE REQUISITIONS",
    "===================="
  ];

  filtered.forEach(req => {
    const amount =
      number(req.total_amount) ||
      number(req.quantity) * number(req.unit_cost);

    total += amount;

    lines.push(
      "",
      `Req No: ${req.req_no || ""}`,
      `Date: ${req.req_date || ""}`,
      `Requested By: ${req.requested_by || ""}`,
      `Vehicle: ${vehicleName(req.vehicle_id)}`,
      `Item: ${req.item_description || ""}`,
      `Quantity: ${number(req.quantity)}`,
      `Unit Cost: ${money(req.unit_cost)}`,
      `Total: ${money(amount)}`,
      `Expense Type: ${req.expense_type || req.category || "Materials"}`,
      `Status: ${req.status || ""}`
    );
  });

  lines.push(
    "",
    `OVERALL TOTAL: ${money(total)}`
  );

  await shareText(
    "Garage Requisitions",
    lines.join("\n")
  );
};

// ======================================================
// SEARCH / FILTER EVENTS
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

  const vehicleSearch =
    document.getElementById("vehicleSearch");

  const vehicleStatusFilter =
    document.getElementById("vehicleStatusFilter");

  const expenseSearch =
    document.getElementById("expenseSearch");

  const expenseCategoryFilter =
    document.getElementById("expenseCategoryFilter");

  const pettySearch =
    document.getElementById("pettySearch");

  const pettyCategoryFilter =
    document.getElementById("pettyCategoryFilter");

  const reqSearch =
    document.getElementById("reqSearch");

  const reqStatusFilter =
    document.getElementById("reqStatusFilter");

  vehicleSearch?.addEventListener(
    "input",
    renderVehicles
  );

  vehicleStatusFilter?.addEventListener(
    "change",
    renderVehicles
  );

  expenseSearch?.addEventListener(
    "input",
    renderExpenses
  );

  expenseCategoryFilter?.addEventListener(
    "change",
    renderExpenses
  );

  pettySearch?.addEventListener(
    "input",
    renderPettyCash
  );

  pettyCategoryFilter?.addEventListener(
    "change",
    renderPettyCash
  );

  reqSearch?.addEventListener(
    "input",
    renderRequisitions
  );

  reqStatusFilter?.addEventListener(
    "change",
    renderRequisitions
  );

  // Vehicle form
  document
    .getElementById("vehicleForm")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();
        await saveVehicle();
      }
    );

  // Expense form
  document
    .getElementById("expenseForm")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();
        await saveExpense();
      }
    );

  // Petty cash form
  document
    .getElementById("pettyForm")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();
        await savePettyCash();
      }
    );

  // Requisition form
  document
    .getElementById("requisitionForm")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();
        await saveRequisition();
      }
    );

  // Close modal when clicking outside
  document.querySelectorAll(".modal").forEach(modal => {

    modal.addEventListener("click", event => {

      if (event.target === modal) {
        modal.classList.remove("show");
      }

    });

  });

  // Escape key closes modal
  document.addEventListener(
    "keydown",
    event => {

      if (event.key !== "Escape") return;

      document
        .querySelectorAll(".modal.show")
        .forEach(modal => {
          modal.classList.remove("show");
        });

    }
  );

  // Initial load
  loadAllData();

});

// ======================================================
// GLOBAL ERROR HANDLING
// ======================================================

window.addEventListener(
  "unhandledrejection",
  event => {
    console.error(
      "Unhandled promise rejection:",
      event.reason
    );
  }
);

window.addEventListener(
  "error",
  event => {
    console.error(
      "Application error:",
      event.error || event.message
    );
  }
);
