import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ======================================================
// GARAGE OPERATIONS PRO
// SUPABASE CONFIGURATION
// ======================================================

const SUPABASE_URL =
  "https://ptluwoeogfkqavhspdjj.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_wDsWINauH0jX9rezsEwcz";

// Create Supabase client
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


// ======================================================
// TABLE NAMES
// ======================================================

const TABLES = {
  vehicles: "vehicles",
  expenses: "expenses",
  petty: "petty_cash",
  requisitions: "requisitions"
};


// ======================================================
// APPLICATION STATE
// ======================================================

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];


// ======================================================
// INITIAL STARTUP
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {

  setDefaultDates();

  setupNavigation();

  setupForms();

  setupRequisitionCalculation();

  await loadAllData();

});


// ======================================================
// NAVIGATION
// ======================================================

function setupNavigation() {

  document.querySelectorAll(".nav-btn").forEach(button => {

    button.addEventListener("click", () => {

      const page = button.dataset.page;

      showPage(page);

    });

  });

}


window.showPage = function(pageName) {

  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.remove("active");
  });

  const page = document.getElementById(pageName);

  if (page) {
    page.classList.add("active");
  }

  const button =
    document.querySelector(
      `.nav-btn[data-page="${pageName}"]`
    );

  if (button) {
    button.classList.add("active");
  }

  if (pageName === "dashboard") {
    renderDashboard();
  }

  if (pageName === "vehicles") {
    renderVehicles();
  }

  if (pageName === "expenses") {
    renderExpenses();
  }

  if (pageName === "petty") {
    renderPettyCash();
  }

  if (pageName === "requisitions") {
    renderRequisitions();
  }

};


// ======================================================
// DEFAULT DATES
// ======================================================

function today() {

  const d = new Date();

  const year = d.getFullYear();

  const month =
    String(d.getMonth() + 1).padStart(2, "0");

  const day =
    String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;

}


function setDefaultDates() {

  const date = today();

  const ids = [
    "vehicleDateIn",
    "expenseDate",
    "pettyDate",
    "reqDate"
  ];

  ids.forEach(id => {

    const element = document.getElementById(id);

    if (element && !element.value) {
      element.value = date;
    }

  });

}


// ======================================================
// LOAD ALL DATA
// ======================================================

async function loadAllData() {

  try {

    await Promise.all([
      loadVehicles(),
      loadExpenses(),
      loadPettyCash(),
      loadRequisitions()
    ]);

    populateVehicleSelects();

    renderDashboard();

    renderVehicles();

    renderExpenses();

    renderPettyCash();

    renderRequisitions();

    showToast("Garage data loaded successfully.");

  } catch (error) {

    console.error(error);

    showToast(
      "Unable to load data from Supabase.",
      true
    );

  }

}


// ======================================================
// VEHICLES - LOAD
// ======================================================

async function loadVehicles() {

  const { data, error } =
    await supabase
      .from(TABLES.vehicles)
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    throw error;
  }

  vehicles = data || [];

}


// ======================================================
// EXPENSES - LOAD
// ======================================================

async function loadExpenses() {

  const { data, error } =
    await supabase
      .from(TABLES.expenses)
      .select("*")
      .order("expense_date", {
        ascending: false
      });

  if (error) {
    throw error;
  }

  expenses = data || [];

}


// ======================================================
// PETTY CASH - LOAD
// ======================================================

async function loadPettyCash() {

  const { data, error } =
    await supabase
      .from(TABLES.petty)
      .select("*")
      .order("cash_date", {
        ascending: false
      });

  if (error) {
    throw error;
  }

  pettyCash = data || [];

}


// ======================================================
// REQUISITIONS - LOAD
// ======================================================

async function loadRequisitions() {

  const { data, error } =
    await supabase
      .from(TABLES.requisitions)
      .select("*")
      .order("req_date", {
        ascending: false
      });

  if (error) {
    throw error;
  }

  requisitions = data || [];

}


// ======================================================
// VEHICLE FORM
// ======================================================

function setupForms() {

  document
    .getElementById("vehicleForm")
    .addEventListener(
      "submit",
      saveVehicle
    );


  document
    .getElementById("expenseForm")
    .addEventListener(
      "submit",
      saveExpense
    );


  document
    .getElementById("pettyForm")
    .addEventListener(
      "submit",
      savePettyCash
    );


  document
    .getElementById("reqForm")
    .addEventListener(
      "submit",
      saveRequisition
    );

}


// ======================================================
// OPEN VEHICLE MODAL
// ======================================================

window.openVehicleModal = function(vehicle = null) {

  const modal =
    document.getElementById("vehicleModal");

  const title =
    document.getElementById("vehicleModalTitle");

  if (vehicle) {

    title.textContent = "Edit Vehicle";

    document.getElementById("vehicleId").value =
      vehicle.id || "";

    document.getElementById("vehicleRegistration").value =
      vehicle.registration || "";

    document.getElementById("vehicleCustomer").value =
      vehicle.customer || "";

    document.getElementById("vehicleDateIn").value =
      vehicle.date_in || "";

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

    document.getElementById("vehicleBilled").value =
      vehicle.billed || 0;

    document.getElementById("vehiclePaid").value =
      vehicle.paid || 0;

    document.getElementById("vehicleDescription").value =
      vehicle.description || "";

  } else {

    title.textContent = "Add Vehicle";

    document.getElementById("vehicleForm").reset();

    document.getElementById("vehicleId").value = "";

    document.getElementById("vehicleDateIn").value =
      today();

    document.getElementById("vehicleJobType").value =
      "Repair";

    document.getElementById("vehicleStatus").value =
      "Under Repair";

    document.getElementById("vehicleBilled").value =
      0;

    document.getElementById("vehiclePaid").value =
      0;

  }

  modal.classList.add("show");

};


// ======================================================
// SAVE VEHICLE
// ======================================================

async function saveVehicle(event) {

  event.preventDefault();

  const id =
    document.getElementById("vehicleId").value;

  const vehicle = {

    registration:
      document
        .getElementById("vehicleRegistration")
        .value
        .trim()
        .toUpperCase(),

    customer:
      document
        .getElementById("vehicleCustomer")
        .value
        .trim(),

    date_in:
      document
        .getElementById("vehicleDateIn")
        .value,

    date_out:
      document
        .getElementById("vehicleDateOut")
        .value || null,

    job_type:
      document
        .getElementById("vehicleJobType")
        .value,

    status:
      document
        .getElementById("vehicleStatus")
        .value,

    released_to:
      document
        .getElementById("vehicleReleasedTo")
        .value
        .trim() || null,

    released_contact:
      document
        .getElementById("vehicleReleasedContact")
        .value
        .trim() || null,

    description:
      document
        .getElementById("vehicleDescription")
        .value
        .trim() || null,

    billed:
      numberValue("vehicleBilled"),

    paid:
      numberValue("vehiclePaid")

  };


  try {

    if (id) {

      const { error } =
        await supabase
          .from(TABLES.vehicles)
          .update(vehicle)
          .eq("id", id);

      if (error) {
        throw error;
      }

      showToast("Vehicle updated successfully.");

    } else {

      const { error } =
        await supabase
          .from(TABLES.vehicles)
          .insert(vehicle);

      if (error) {
        throw error;
      }

      showToast("Vehicle added successfully.");

    }


    closeModal("vehicleModal");

    await loadVehicles();

    populateVehicleSelects();

    renderVehicles();

    renderDashboard();

  } catch (error) {

    console.error(error);

    showToast(
      error.message || "Unable to save vehicle.",
      true
    );

  }

}


// ======================================================
// EDIT VEHICLE
// ======================================================

window.editVehicle = function(id) {

  const vehicle =
    vehicles.find(v => v.id === id);

  if (!vehicle) {
    showToast("Vehicle not found.", true);
    return;
  }

  openVehicleModal(vehicle);

};


// ======================================================
// DELETE VEHICLE
// ======================================================

window.deleteVehicle = async function(id) {

  const vehicle =
    vehicles.find(v => v.id === id);

  if (!vehicle) return;

  const confirmed =
    confirm(
      `Delete vehicle ${vehicle.registration}?\n\nRelated expenses will also be deleted because of the database cascade rule.`
    );

  if (!confirmed) return;


  try {

    const { error } =
      await supabase
        .from(TABLES.vehicles)
        .delete()
        .eq("id", id);

    if (error) {
      throw error;
    }

    showToast("Vehicle deleted.");

    await loadVehicles();

    await loadExpenses();

    populateVehicleSelects();

    renderVehicles();

    renderExpenses();

    renderDashboard();

  } catch (error) {

    console.error(error);

    showToast(
      error.message || "Unable to delete vehicle.",
      true
    );

  }

};


// ======================================================
// EXPENSE MODAL
// ======================================================

window.openExpenseModal = function(expense = null) {

  const modal =
    document.getElementById("expenseModal");

  const title =
    document.getElementById("expenseModalTitle");

  populateVehicleSelects();


  if (expense) {

    title.textContent = "Edit Expense";

    document.getElementById("expenseId").value =
      expense.id || "";

    document.getElementById("expenseDate").value =
      expense.expense_date || today();

    document.getElementById("expenseVehicle").value =
      expense.vehicle_id || "";

    document.getElementById("expenseDescription").value =
      expense.description || "";

    document.getElementById("expenseCategory").value =
      expense.category || "Parts";

    document.getElementById("expenseAmount").value =
      expense.amount || 0;

  } else {

    title.textContent = "Add Expense";

    document.getElementById("expenseForm").reset();

    document.getElementById("expenseId").value = "";

    document.getElementById("expenseDate").value =
      today();

    document.getElementById("expenseCategory").value =
      "Parts";

    document.getElementById("expenseAmount").value =
      0;

  }

  modal.classList.add("show");

};


// ======================================================
// SAVE EXPENSE
// ======================================================

async function saveExpense(event) {

  event.preventDefault();

  const id =
    document.getElementById("expenseId").value;

  const vehicleId =
    document.getElementById("expenseVehicle").value;


  const expense = {

    vehicle_id:
      vehicleId || null,

    expense_date:
      document.getElementById("expenseDate").value,

    description:
      document
        .getElementById("expenseDescription")
        .value
        .trim(),

    category:
      document.getElementById("expenseCategory").value,

    amount:
      numberValue("expenseAmount")

  };


  try {

    if (id) {

      const { error } =
        await supabase
          .from(TABLES.expenses)
          .update(expense)
          .eq("id", id);

      if (error) {
        throw error;
      }

      showToast("Expense updated successfully.");

    } else {

      const { error } =
        await supabase
          .from(TABLES.expenses)
          .insert(expense);

      if (error) {
        throw error;
      }

      showToast("Expense added successfully.");

    }


    closeModal("expenseModal");

    await loadExpenses();

    renderExpenses();

    renderDashboard();

  } catch (error) {

    console.error(error);

    showToast(
      error.message || "Unable to save expense.",
      true
    );

  }

}


// ======================================================
// EDIT EXPENSE
// ======================================================

window.editExpense = function(id) {

  const expense =
    expenses.find(e => e.id === id);

  if (!expense) return;

  openExpenseModal(expense);

};


// ======================================================
// DELETE EXPENSE
// ======================================================

window.deleteExpense = async function(id) {

  const expense =
    expenses.find(e => e.id === id);

  if (!expense) return;


  if (!confirm(
    `Delete expense "${expense.description}"?`
  )) {
    return;
  }


  try {

    const { error } =
      await supabase
        .from(TABLES.expenses)
        .delete()
        .eq("id", id);

    if (error) {
      throw error;
    }

    showToast("Expense deleted.");

    await loadExpenses();

    renderExpenses();

    renderDashboard();

  } catch (error) {

    console.error(error);

    showToast(
      error.message || "Unable to delete expense.",
      true
    );

  }

};


// ======================================================
// PETTY CASH MODAL
// ======================================================

window.openPettyModal = function(record = null) {

  const modal =
    document.getElementById("pettyModal");

  const title =
    document.getElementById("pettyModalTitle");


  if (record) {

    title.textContent = "Edit Petty Cash";

    document.getElementById("pettyId").value =
      record.id || "";

    document.getElementById("pettyDate").value =
      record.cash_date || today();

    document.getElementById("pettyDescription").value =
      record.description || "";

    document.getElementById("pettyPaidTo").value =
      record.paid_to || "";

    document.getElementById("pettyCategory").value =
      record.category || "";

    document.getElementById("pettyAmount").value =
      record.amount || 0;

    document.getElementById("pettyNotes").value =
      record.notes || "";

  } else {

    title.textContent = "Add Petty Cash";

    document.getElementById("pettyForm").reset();

    document.getElementById("pettyId").value = "";

    document.getElementById("pettyDate").value =
      today();

    document.getElementById("pettyAmount").value =
      0;

  }


  modal.classList.add("show");

};


// ======================================================
// SAVE PETTY CASH
// ======================================================

async function savePettyCash(event) {

  event.preventDefault();

  const id =
    document.getElementById("pettyId").value;


  const record = {

    cash_date:
      document.getElementById("pettyDate").value,

    description:
      document
        .getElementById("pettyDescription")
        .value
        .trim(),

    paid_to:
      document
        .getElementById("pettyPaidTo")
        .value
        .trim() || null,

    category:
      document.getElementById("pettyCategory").value
      || null,

    amount:
      numberValue("pettyAmount"),

    notes:
      document
        .getElementById("pettyNotes")
        .value
        .trim() || null

  };


  try {

    if (id) {

      const { error } =
        await supabase
          .from(TABLES.petty)
          .update(record)
          .eq("id", id);

      if (error) {
        throw error;
      }

      showToast(
        "Petty cash updated successfully."
      );

    } else {

      const { error } =
        await supabase
          .from(TABLES.petty)
          .insert(record);

      if (error) {
        throw error;
      }

      showToast(
        "Petty cash added successfully."
      );

    }


    closeModal("pettyModal");

    await loadPettyCash();

    renderPettyCash();

    renderDashboard();

  } catch (error) {

    console.error(error);

    showToast(
      error.message || "Unable to save petty cash.",
      true
    );

  }

}


// ======================================================
// EDIT PETTY CASH
// ======================================================

window.editPetty = function(id) {

  const record =
    pettyCash.find(p => p.id === id);

  if (!record) return;

  openPettyModal(record);

};


// ======================================================
// DELETE PETTY CASH
// ======================================================

window.deletePetty = async function(id) {

  const record =
    pettyCash.find(p => p.id === id);

  if (!record) return;


  if (!confirm(
    `Delete petty cash entry "${record.description}"?`
  )) {
    return;
  }


  try {

    const { error } =
      await supabase
        .from(TABLES.petty)
        .delete()
        .eq("id", id);

    if (error) {
      throw error;
    }

    showToast("Petty cash deleted.");

    await loadPettyCash();

    renderPettyCash();

    renderDashboard();

  } catch (error) {

    console.error(error);

    showToast(
      error.message || "Unable to delete petty cash.",
      true
    );

  }

};


// ======================================================
// REQUISITION MODAL
// ======================================================

window.openReqModal = function(req = null) {

  const modal =
    document.getElementById("reqModal");

  const title =
    document.getElementById("reqModalTitle");


  populateVehicleSelects();


  if (req) {

    title.textContent = "Edit Requisition";

    document.getElementById("reqId").value =
      req.id || "";

    document.getElementById("reqNo").value =
      req.req_no || "";

    document.getElementById("reqDate").value =
      req.req_date || today();

    document.getElementById("reqRequestedBy").value =
      req.requested_by || "";

    document.getElementById("reqVehicle").value =
      req.vehicle_id || "";

    document.getElementById("reqDescription").value =
      req.item_description || "";

    document.getElementById("reqQuantity").value =
      req.quantity || 1;

    document.getElementById("reqUnitCost").value =
      req.unit_cost || 0;

    document.getElementById("reqTotal").value =
      req.total_amount || 0;

    document.getElementById("reqStatus").value =
      req.status || "Pending";

    document.getElementById("reqNotes").value =
      req.notes || "";

    document.getElementById("reqExpenseType").value =
      req.expense_type || "Materials";

  } else {

    title.textContent = "New Requisition";

    document.getElementById("reqForm").reset();

    document.getElementById("reqId").value = "";

    document.getElementById("reqDate").value =
      today();

    document.getElementById("reqQuantity").value =
      1;

    document.getElementById("reqUnitCost").value =
      0;

    document.getElementById("reqTotal").value =
      0;

    document.getElementById("reqStatus").value =
      "Pending";

    document.getElementById("reqExpenseType").value =
      "Materials";

  }


  modal.classList.add("show");

};


// ======================================================
// REQUISITION CALCULATION
// ======================================================

function setupRequisitionCalculation() {

  const quantity =
    document.getElementById("reqQuantity");

  const unitCost =
    document.getElementById("reqUnitCost");


  function calculate() {

    const q =
      parseFloat(quantity.value) || 0;

    const cost =
      parseFloat(unitCost.value) || 0;

    document.getElementById("reqTotal").value =
      (q * cost).toFixed(2);

  }


  quantity.addEventListener(
    "input",
    calculate
  );

  unitCost.addEventListener(
    "input",
    calculate
  );

}


// ======================================================
// SAVE REQUISITION
// ======================================================

async function saveRequisition(event) {

  event.preventDefault();

  const id =
    document.getElementById("reqId").value;


  const quantity =
    numberValue("reqQuantity");

  const unitCost =
    numberValue("reqUnitCost");

  const total =
    quantity * unitCost;


  const req = {

    req_no:
      document
        .getElementById("reqNo")
        .value
        .trim(),

    req_date:
      document
        .getElementById("reqDate")
        .value,

    requested_by:
      document
        .getElementById("reqRequestedBy")
        .value
        .trim(),

    vehicle_id:
      document
        .getElementById("reqVehicle")
        .value || null,

    item_description:
      document
        .getElementById("reqDescription")
        .value
        .trim(),

    quantity:
      quantity,

    unit_cost:
      unitCost,

    total_amount:
      total,

    status:
      document
        .getElementById("reqStatus")
        .value,

    notes:
      document
        .getElementById("reqNotes")
        .value
        .trim() || null,

    expense_type:
      document
        .getElementById("reqExpenseType")
        .value

  };


  try {

    if (id) {

      const { error } =
        await supabase
          .from(TABLES.requisitions)
          .update(req)
          .eq("id", id);

      if (error) {
        throw error;
      }

      showToast(
        "Requisition updated successfully."
      );

    } else {

      const { error } =
        await supabase
          .from(TABLES.requisitions)
          .insert(req);

      if (error) {
        throw error;
      }

      showToast(
        "Requisition created successfully."
      );

    }


    closeModal("reqModal");

    await loadRequisitions();

    renderRequisitions();

    renderDashboard();

  } catch (error) {

    console.error(error);

    showToast(
      error.message ||
      "Unable to save requisition.",
      true
    );

  }

}


// ======================================================
// EDIT REQUISITION
// ======================================================

window.editReq = function(id) {

  const req =
    requisitions.find(r => r.id === id);

  if (!req) return;

  openReqModal(req);

};


// ======================================================
// DELETE REQUISITION
// ======================================================

window.deleteReq = async function(id) {

  const req =
    requisitions.find(r => r.id === id);

  if (!req) return;


  if (!confirm(
    `Delete requisition ${req.req_no}?`
  )) {
    return;
  }


  try {

    const { error } =
      await supabase
        .from(TABLES.requisitions)
        .delete()
        .eq("id", id);

    if (error) {
      throw error;
    }

    showToast("Requisition deleted.");

    await loadRequisitions();

    renderRequisitions();

    renderDashboard();

  } catch (error) {

    console.error(error);

    showToast(
      error.message ||
      "Unable to delete requisition.",
      true
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

    const current =
      select.value;

    const general =
      select.id === "expenseVehicle"
        ? "General / No Vehicle"
        : "General / No Vehicle";


    select.innerHTML = "";

    const option =
      document.createElement("option");

    option.value = "";

    option.textContent = general;

    select.appendChild(option);


    vehicles.forEach(vehicle => {

      const opt =
        document.createElement("option");

      opt.value =
        vehicle.id;

      opt.textContent =
        `${vehicle.registration} — ${vehicle.customer}`;

      select.appendChild(opt);

    });


    if (
      current &&
      vehicles.some(v => v.id === current)
    ) {
      select.value = current;
    }

  });

}


// ======================================================
// RENDER DASHBOARD
// ======================================================

function renderDashboard() {

  const totalVehicles =
    vehicles.length;

  const underRepair =
    vehicles.filter(
      v =>
        String(v.status || "")
          .toLowerCase() ===
        "under repair"
    ).length;


  const billed =
    sum(
      vehicles.map(v =>
        number(v.billed)
      )
    );


  const paid =
    sum(
      vehicles.map(v =>
        number(v.paid)
      )
    );


  const outstanding =
    sum(
      vehicles.map(v =>
        Math.max(
          number(v.billed) -
          number(v.paid),
          0
        )
      )
    );


  const expenseTotal =
    sum(
      expenses.map(e =>
        number(e.amount)
      )
    );


  const pettyTotal =
    sum(
      pettyCash.map(p =>
        number(p.amount)
      )
    );


  document.getElementById(
    "statVehicles"
  ).textContent =
    formatNumber(totalVehicles);


  document.getElementById(
    "statRepair"
  ).textContent =
    formatNumber(underRepair);


  document.getElementById(
    "statBilled"
  ).textContent =
    money(billed);


  document.getElementById(
    "statPaid"
  ).textContent =
    money(paid);


  document.getElementById(
    "statOutstanding"
  ).textContent =
    money(outstanding);


  document.getElementById(
    "statExpenses"
  ).textContent =
    money(expenseTotal);


  document.getElementById(
    "statPetty"
  ).textContent =
    money(pettyTotal);


  document.getElementById(
    "statReq"
  ).textContent =
    formatNumber(requisitions.length);


  const tbody =
    document.getElementById(
      "dashboardVehicles"
    );


  const recent =
    vehicles.slice(0, 8);


  if (!recent.length) {

    tbody.innerHTML =
      `<tr>
        <td colspan="8">
          <div class="empty">
            No vehicles recorded yet.
          </div>
        </td>
      </tr>`;

    return;
  }


  tbody.innerHTML =
    recent.map(vehicle => {

      const balance =
        Math.max(
          number(vehicle.billed) -
          number(vehicle.paid),
          0
        );


      return `
        <tr>

          <td>
            <strong>
              ${escapeHTML(vehicle.registration)}
            </strong>
          </td>

          <td>
            ${escapeHTML(vehicle.customer)}
          </td>

          <td>
            ${formatDate(vehicle.date_in)}
          </td>

          <td>
            ${escapeHTML(vehicle.job_type || "")}
          </td>

          <td>
            ${statusBadge(vehicle.status)}
          </td>

          <td class="amount">
            ${money(vehicle.billed)}
          </td>

          <td class="amount">
            ${money(vehicle.paid)}
          </td>

          <td class="amount">
            ${money(balance)}
          </td>

        </tr>
      `;

    }).join("");

}


// ======================================================
// RENDER VEHICLES
// ======================================================

window.renderVehicles = function() {

  const tbody =
    document.getElementById(
      "vehiclesTable"
    );


  const search =
    (
      document.getElementById(
        "vehicleSearch"
      )?.value || ""
    )
    .toLowerCase()
    .trim();


  const status =
    document.getElementById(
      "vehicleStatusFilter"
    )?.value || "";


  const filtered =
    vehicles.filter(vehicle => {

      const text =
        [
          vehicle.registration,
          vehicle.customer,
          vehicle.description,
          vehicle.job_type
        ]
        .join(" ")
        .toLowerCase();


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
        <td colspan="10">
          <div class="empty">
            No vehicles found.
          </div>
        </td>
      </tr>`;

    return;
  }


  tbody.innerHTML =
    filtered.map(vehicle => {

      const balance =
        Math.max(
          number(vehicle.billed) -
          number(vehicle.paid),
          0
        );


      return `
        <tr>

          <td>
            <strong>
              ${escapeHTML(vehicle.registration)}
            </strong>
          </td>

          <td>
            ${escapeHTML(vehicle.customer)}
          </td>

          <td>
            ${formatDate(vehicle.date_in)}
          </td>

          <td>
            ${formatDate(vehicle.date_out)}
          </td>

          <td>
            ${escapeHTML(vehicle.job_type || "")}
          </td>

          <td>
            ${statusBadge(vehicle.status)}
          </td>

          <td class="amount">
            ${money(vehicle.billed)}
          </td>

          <td class="amount">
            ${money(vehicle.paid)}
          </td>

          <td class="amount">
            ${money(balance)}
          </td>

          <td>

            <div class="actions">

              <button
                class="btn btn-secondary btn-small"
                onclick="editVehicle('${vehicle.id}')">
                Edit
              </button>

              <button
                class="btn btn-danger btn-small"
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
// RENDER EXPENSES
// ======================================================

window.renderExpenses = function() {

  const tbody =
    document.getElementById(
      "expensesTable"
    );


  const search =
    (
      document.getElementById(
        "expenseSearch"
      )?.value || ""
    )
    .toLowerCase()
    .trim();


  const category =
    document.getElementById(
      "expenseCategoryFilter"
    )?.value || "";


  const filtered =
    expenses.filter(expense => {

      const vehicle =
        vehicles.find(
          v => v.id === expense.vehicle_id
        );


      const text =
        [
          expense.description,
          expense.category,
          vehicle?.registration,
          vehicle?.customer
        ]
        .join(" ")
        .toLowerCase();


      return (
        (!search || text.includes(search)) &&
        (!category || expense.category === category)
      );

    });


  if (!filtered.length) {

    tbody.innerHTML =
      `<tr>
        <td colspan="6">
          <div class="empty">
            No expenses found.
          </div>
        </td>
      </tr>`;

    return;
  }


  tbody.innerHTML =
    filtered.map(expense => {

      const vehicle =
        vehicles.find(
          v => v.id === expense.vehicle_id
        );


      return `
        <tr>

          <td>
            ${formatDate(expense.expense_date)}
          </td>

          <td>
            ${
              vehicle
                ? escapeHTML(vehicle.registration)
                : "General"
            }
          </td>

          <td>
            ${escapeHTML(expense.description)}
          </td>

          <td>
            ${escapeHTML(expense.category || "")}
          </td>

          <td class="amount">
            ${money(expense.amount)}
          </td>

          <td>

            <div class="actions">

              <button
                class="btn btn-secondary btn-small"
                onclick="editExpense('${expense.id}')">
                Edit
              </button>

              <button
                class="btn btn-danger btn-small"
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
// RENDER PETTY CASH
// ======================================================

window.renderPettyCash = function() {

  const tbody =
    document.getElementById(
      "pettyTable"
    );


  if (!pettyCash.length) {

    tbody.innerHTML =
      `<tr>
        <td colspan="7">
          <div class="empty">
            No petty cash records found.
          </div>
        </td>
      </tr>`;

    return;
  }


  tbody.innerHTML =
    pettyCash.map(record => {

      return `
        <tr>

          <td>
            ${formatDate(record.cash_date)}
          </td>

          <td>
            ${escapeHTML(record.description)}
          </td>

          <td>
            ${escapeHTML(record.paid_to || "")}
          </td>

          <td>
            ${escapeHTML(record.category || "")}
          </td>

          <td class="amount">
            ${money(record.amount)}
          </td>

          <td>
            ${escapeHTML(record.notes || "")}
          </td>

          <td>

            <div class="actions">

              <button
                class="btn btn-secondary btn-small"
                onclick="editPetty('${record.id}')">
                Edit
              </button>

              <button
                class="btn btn-danger btn-small"
                onclick="deletePetty('${record.id}')">
                Delete
              </button>

            </div>

          </td>

        </tr>
      `;

    }).join("");

};


// ======================================================
// RENDER REQUISITIONS
// ======================================================

window.renderRequisitions = function() {

  const tbody =
    document.getElementById(
      "requisitionsTable"
    );


  if (!requisitions.length) {

    tbody.innerHTML =
      `<tr>
        <td colspan="11">
          <div class="empty">
            No requisitions found.
          </div>
        </td>
      </tr>`;

    return;
  }


  tbody.innerHTML =
    requisitions.map(req => {

      const vehicle =
        vehicles.find(
          v => v.id === req.vehicle_id
        );


      return `
        <tr>

          <td>
            <strong>
              ${escapeHTML(req.req_no)}
            </strong>
          </td>

          <td>
            ${formatDate(req.req_date)}
          </td>

          <td>
            ${escapeHTML(req.requested_by)}
          </td>

          <td>
            ${
              vehicle
                ? escapeHTML(vehicle.registration)
                : "General"
            }
          </td>

          <td>
            ${escapeHTML(req.item_description)}
          </td>

          <td>
            ${number(req.quantity)}
          </td>

          <td class="amount">
            ${money(req.unit_cost)}
          </td>

          <td class="amount">
            ${money(req.total_amount)}
          </td>

          <td>
            ${escapeHTML(req.expense_type || "")}
          </td>

          <td>
            ${statusBadge(req.status)}
          </td>

          <td>

            <div class="actions">

              <button
                class="btn btn-secondary btn-small"
                onclick="editReq('${req.id}')">
                Edit
              </button>

              <button
                class="btn btn-danger btn-small"
                onclick="deleteReq('${req.id}')">
                Delete
              </button>

            </div>

          </td>

        </tr>
      `;

    }).join("");

};


// ======================================================
// CLOSE MODAL
// ======================================================

window.closeModal = function(id) {

  const modal =
    document.getElementById(id);

  if (modal) {
    modal.classList.remove("show");
  }

};


// ======================================================
// CLOSE MODALS WHEN CLICKING OUTSIDE
// ======================================================

document.addEventListener("click", event => {

  if (
    event.target.classList.contains("modal")
  ) {

    event.target.classList.remove("show");

  }

});


// ======================================================
// HELPERS
// ======================================================

function number(value) {

  const n =
    parseFloat(value);

  return Number.isFinite(n)
    ? n
    : 0;

}


function numberValue(id) {

  const element =
    document.getElementById(id);

  return number(
    element?.value
  );

}


function sum(values) {

  return values.reduce(
    (total, value) =>
      total + number(value),
    0
  );

}


function formatNumber(value) {

  return number(value)
    .toLocaleString("en-KE", {
      maximumFractionDigits: 2
    });

}


function money(value) {

  return (
    "KSh " +
    number(value).toLocaleString(
      "en-KE",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    )
  );

}


function formatDate(value) {

  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value + "T00:00:00"
    );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-KE",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );

}


function statusBadge(status) {

  const value =
    String(status || "Pending");

  const lower =
    value.toLowerCase();


  let cls =
    "status-pending";


  if (
    lower.includes("repair") ||
    lower.includes("under")
  ) {

    cls = "status-under";

  }


  if (
    lower.includes("complete") ||
    lower.includes("released") ||
    lower.includes("paid") ||
    lower.includes("approved")
  ) {

    cls = "status-complete";

  }


  if (
    lower.includes("cancel")
  ) {

    cls = "status-cancelled";

  }


  return `
    <span class="status ${cls}">
      ${escapeHTML(value)}
    </span>
  `;

}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ======================================================
// TOAST
// ======================================================

let toastTimer;


function showToast(message, error = false) {

  const toast =
    document.getElementById("toast");

  toast.textContent =
    message;

  toast.classList.toggle(
    "error",
    error
  );

  toast.classList.add("show");


  clearTimeout(toastTimer);


  toastTimer =
    setTimeout(() => {

      toast.classList.remove(
        "show"
      );

    }, 3500);

}
