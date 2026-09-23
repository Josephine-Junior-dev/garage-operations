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
// STATE
// ======================================================

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];


// ======================================================
// HELPERS
// ======================================================

const $ = id => document.getElementById(id);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value) {
  return "KSh " + Number(value || 0).toLocaleString(
    "en-KE",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}

function num(value) {
  return Number(value || 0);
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message) {
  const el = $("toast");

  el.textContent = message;
  el.style.display = "block";

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    el.style.display = "none";
  }, 3000);
}

function showError(error) {
  console.error(error);

  const message =
    error?.message ||
    error?.error_description ||
    "An unexpected error occurred.";

  toast(message);
}


// ======================================================
// LOGIN
// ======================================================

const LOGIN_USERS = {
  Josephine: "1234",
  Boss: "1234",
  Staff: "1234"
};

function currentUser() {
  return localStorage.getItem("garage_logged_user");
}

function showApp() {
  $("login").classList.add("hidden");
  $("app").classList.remove("hidden");

  $("loggedUser").textContent =
    "Logged in as: " + (currentUser() || "");

  loadAll();
}

function showLogin() {
  $("app").classList.add("hidden");
  $("login").classList.remove("hidden");
}

$("loginForm").addEventListener("submit", event => {

  event.preventDefault();

  const username = $("username").value.trim();
  const password = $("password").value;

  if (
    LOGIN_USERS[username] &&
    LOGIN_USERS[username] === password
  ) {

    localStorage.setItem(
      "garage_logged_user",
      username
    );

    $("loginMsg").textContent = "";

    showApp();

  } else {

    $("loginMsg").textContent =
      "Invalid username or password.";

    $("loginMsg").style.color = "#dc2626";
  }
});


$("logout").addEventListener("click", () => {

  localStorage.removeItem("garage_logged_user");

  showLogin();
});


if (currentUser()) {
  showApp();
}


// ======================================================
// NAVIGATION
// ======================================================

function openTab(tabName) {

  document.querySelectorAll(".tab").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.tab === tabName
    );
  });

  document.querySelectorAll(".tabpage").forEach(page => {
    page.classList.add("hidden");
  });

  const page = $(tabName);

  if (page) {
    page.classList.remove("hidden");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


document.querySelectorAll(".tab").forEach(button => {

  button.addEventListener("click", () => {
    openTab(button.dataset.tab);
  });

});


document.querySelectorAll("[data-go]").forEach(button => {

  button.addEventListener("click", () => {
    openTab(button.dataset.go);
  });

});


// ======================================================
// LOAD ALL DATABASE DATA
// ======================================================

async function loadAll() {

  try {

    toast("Loading garage data...");

    const [
      vehicleResult,
      expenseResult,
      pettyResult,
      requisitionResult
    ] = await Promise.all([

      supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false }),

      supabase
        .from("petty_cash")
        .select("*")
        .order("cash_date", { ascending: false }),

      supabase
        .from("requisitions")
        .select("*")
        .order("req_date", { ascending: false })

    ]);


    if (vehicleResult.error) {
      throw vehicleResult.error;
    }

    if (expenseResult.error) {
      throw expenseResult.error;
    }

    if (pettyResult.error) {
      throw pettyResult.error;
    }

    if (requisitionResult.error) {
      throw requisitionResult.error;
    }


    vehicles = vehicleResult.data || [];
    expenses = expenseResult.data || [];
    pettyCash = pettyResult.data || [];
    requisitions = requisitionResult.data || [];


    renderEverything();

  } catch (error) {

    showError(error);

  }
}


// ======================================================
// RENDER EVERYTHING
// ======================================================

function renderEverything() {

  renderDashboard();
  renderVehicles();
  renderExpenses();
  renderPettyCash();
  renderRequisitions();

}


// ======================================================
// DASHBOARD
// ======================================================

function renderDashboard() {

  const totalExpenses =
    expenses.reduce(
      (sum, item) =>
        sum + num(
          item.amount ??
          item.total_amount
        ),
      0
    );


  const totalPetty =
    pettyCash.reduce(
      (sum, item) =>
        sum + num(
          item.amount
        ),
      0
    );


  const repairCount =
    vehicles.filter(vehicle =>
      String(vehicle.status || "")
        .toLowerCase() === "repair"
    ).length;


  const storageCount =
    vehicles.filter(vehicle =>
      String(vehicle.status || "")
        .toLowerCase() === "storage"
    ).length;


  const outstanding =
    vehicles.reduce(
      (sum, vehicle) => {

        const billed =
          num(vehicle.billed);

        const paid =
          num(vehicle.paid);

        return sum + Math.max(
          0,
          billed - paid
        );
      },
      0
    );


  $("nVehicles").textContent =
    vehicles.length;

  $("nRepair").textContent =
    repairCount;

  $("nStorage").textContent =
    storageCount;

  $("nExpenses").textContent =
    money(totalExpenses);

  $("nPetty").textContent =
    money(totalPetty);

  $("nOutstanding").textContent =
    money(outstanding);
}


// ======================================================
// VEHICLE HELPERS
// ======================================================

function vehicleName(id) {

  const vehicle =
    vehicles.find(v => v.id === id);

  if (!vehicle) {
    return "No vehicle";
  }

  return vehicle.registration ||
         vehicle.reg_no ||
         vehicle.reg ||
         "Vehicle";
}


function vehicleExpenses(vehicleId) {

  return expenses.filter(
    expense =>
      expense.vehicle_id === vehicleId
  );
}


function vehicleExpenseTotal(vehicleId) {

  return vehicleExpenses(vehicleId)
    .reduce(
      (sum, expense) =>
        sum + num(
          expense.amount ??
          expense.total_amount
        ),
      0
    );
}


// ======================================================
// VEHICLE RENDER
// ======================================================

function renderVehicles() {

  const list = $("list");

  const search =
    $("search").value.trim().toLowerCase();

  const filter =
    $("filter").value;


  let rows = [...vehicles];


  if (search) {

    rows = rows.filter(vehicle => {

      const text = [
        vehicle.registration,
        vehicle.reg_no,
        vehicle.reg,
        vehicle.customer,
        vehicle.job_type,
        vehicle.description
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(search);

    });
  }


  if (filter) {

    rows = rows.filter(vehicle => {

      const status =
        String(vehicle.status || "")
          .toLowerCase();

      return status === filter;

    });

  }


  if (!rows.length) {

    list.innerHTML = `
      <div class="card">
        <strong>No vehicles found.</strong>
        <p class="muted">
          Add a vehicle using the button above.
        </p>
      </div>
    `;

    return;
  }


  list.innerHTML = rows.map(vehicle => {

    const reg =
      vehicle.registration ||
      vehicle.reg_no ||
      vehicle.reg ||
      "";

    const expenseTotal =
      vehicleExpenseTotal(vehicle.id);

    const billed =
      num(vehicle.billed);

    const paid =
      num(vehicle.paid);

    const balance =
      Math.max(0, billed - paid);


    return `
      <div class="card">

        <h3>${esc(reg)}</h3>

        <div class="muted">
          Customer: ${esc(vehicle.customer || "-")}
        </div>

        <div class="muted">
          Job: ${esc(vehicle.job_type || "-")}
        </div>

        <div class="muted">
          Status: ${esc(vehicle.status || "-")}
        </div>

        <hr>

        <div>
          <strong>Vehicle Expenses:</strong>
          <span class="money">${money(expenseTotal)}</span>
        </div>

        <div>
          Billed:
          <strong>${money(billed)}</strong>
        </div>

        <div>
          Paid:
          <strong>${money(paid)}</strong>
        </div>

        <div>
          Balance:
          <strong class="${balance > 0 ? "negative" : "positive"}">
            ${money(balance)}
          </strong>
        </div>

        <div class="actions">

          <button
            class="btn"
            onclick="openExpenseForVehicle('${vehicle.id}')">
            + Expense
          </button>

          <button
            class="btn warning"
            onclick="editVehicle('${vehicle.id}')">
            Edit
          </button>

          <button
            class="btn secondary"
            onclick="printVehicle('${vehicle.id}')">
            Print
          </button>

          <button
            class="btn danger"
            onclick="deleteVehicle('${vehicle.id}')">
            Delete
          </button>

        </div>

      </div>
    `;

  }).join("");
}


$("search").addEventListener(
  "input",
  renderVehicles
);

$("filter").addEventListener(
  "change",
  renderVehicles
);


// ======================================================
// VEHICLE MODAL
// ======================================================

function clearVehicleForm() {

  $("vehicleForm").reset();

  $("vid").value = "";

  $("date_in").value = today();

  $("status").value = "repair";

  $("billed").value = "0";

  $("paid").value = "0";

  $("vTitle").textContent =
    "Add Vehicle";
}


function openVehicle() {

  clearVehicleForm();

  $("vehicleModal")
    .classList.remove("hidden");

}


$("addVehicle").addEventListener(
  "click",
  openVehicle
);

$("quickVehicle").addEventListener(
  "click",
  () => {

    openTab("vehicles");

    openVehicle();

  }
);


window.editVehicle = function(id) {

  const vehicle =
    vehicles.find(v => v.id === id);

  if (!vehicle) return;


  $("vid").value =
    vehicle.id;

  $("reg").value =
    vehicle.registration ||
    vehicle.reg_no ||
    vehicle.reg ||
    "";

  $("customer").value =
    vehicle.customer || "";

  $("date_in").value =
    vehicle.date_in || "";

  $("job_type").value =
    vehicle.job_type || "";

  $("status").value =
    vehicle.status || "repair";

  $("date_out").value =
    vehicle.date_out || "";

  $("released_to").value =
    vehicle.released_to || "";

  $("released_contact").value =
    vehicle.released_contact || "";

  $("description").value =
    vehicle.description || "";

  $("billed").value =
    vehicle.billed || 0;

  $("paid").value =
    vehicle.paid || 0;

  $("vTitle").textContent =
    "Edit Vehicle";

  $("vehicleModal")
    .classList.remove("hidden");
};


$("vehicleForm").addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    try {

      const id =
        $("vid").value.trim();


      const data = {

        registration:
          $("reg").value.trim(),

        customer:
          $("customer").value.trim(),

        date_in:
          $("date_in").value || null,

        job_type:
          $("job_type").value.trim(),

        status:
          $("status").value,

        date_out:
          $("date_out").value || null,

        released_to:
          $("released_to").value.trim(),

        released_contact:
          $("released_contact").value.trim(),

        description:
          $("description").value.trim(),

        billed:
          num($("billed").value),

        paid:
          num($("paid").value)

      };


      if (!data.registration) {
        toast("Vehicle registration is required.");
        return;
      }


      let result;


      if (id) {

        // UPDATE
        result = await supabase
          .from("vehicles")
          .update(data)
          .eq("id", id);

      } else {

        // INSERT
        result = await supabase
          .from("vehicles")
          .insert(data);

      }


      if (result.error) {
        throw result.error;
      }


      $("vehicleModal")
        .classList.add("hidden");

      toast(
        id
          ? "Vehicle updated successfully."
          : "Vehicle added successfully."
      );

      await loadAll();

    } catch (error) {

      showError(error);

    }

  }
);


// ======================================================
// DELETE VEHICLE
// ======================================================

window.deleteVehicle = async function(id) {

  const vehicle =
    vehicles.find(v => v.id === id);

  if (!vehicle) return;


  const registration =
    vehicle.registration ||
    vehicle.reg_no ||
    vehicle.reg ||
    "vehicle";


  if (!confirm(
    `Delete ${registration}? This will also delete its expenses.`
  )) {
    return;
  }


  try {

    // Delete vehicle expenses first
    const expenseResult =
      await supabase
        .from("expenses")
        .delete()
        .eq("vehicle_id", id);


    if (expenseResult.error) {
      throw expenseResult.error;
    }


    // Unlink requisitions
    const reqResult =
      await supabase
        .from("requisitions")
        .update({
          vehicle_id: null
        })
        .eq("vehicle_id", id);


    if (reqResult.error) {
      throw reqResult.error;
    }


    // Delete vehicle
    const vehicleResult =
      await supabase
        .from("vehicles")
        .delete()
        .eq("id", id);


    if (vehicleResult.error) {
      throw vehicleResult.error;
    }


    toast("Vehicle deleted.");

    await loadAll();

  } catch (error) {

    showError(error);

  }
};


// ======================================================
// EXPENSE VEHICLE SELECT
// ======================================================

function populateVehicleSelect(
  elementId,
  allowEmpty = false
) {

  const select =
    $(elementId);

  if (!select) return;


  let html = "";

  if (allowEmpty) {
    html += `
      <option value="">
        No vehicle
      </option>
    `;
  }


  html += vehicles.map(vehicle => {

    const reg =
      vehicle.registration ||
      vehicle.reg_no ||
      vehicle.reg ||
      "Vehicle";


    return `
      <option value="${vehicle.id}">
        ${esc(reg)}
      </option>
    `;

  }).join("");


  select.innerHTML = html;
}


// ======================================================
// EXPENSE MODAL
// ======================================================

function clearExpenseForm() {

  $("expenseForm").reset();

  $("evid").value = "";

  $("edate").value =
    today();

  $("ecat").value =
    "Parts";

  $("expenseTitle").textContent =
    "Add Expense";

  populateVehicleSelect(
    "evidSelect"
  );
}


function openExpense() {

  clearExpenseForm();

  $("expenseModal")
    .classList.remove("hidden");
}


$("addExpense").addEventListener(
  "click",
  openExpense
);


$("quickExpense").addEventListener(
  "click",
  () => {

    openTab("expenses");

    openExpense();

  }
);


window.openExpenseForVehicle =
  function(vehicleId) {

    clearExpenseForm();

    $("evidSelect").value =
      vehicleId;

    $("expenseModal")
      .classList.remove("hidden");
  };


// ======================================================
// RENDER EXPENSES
// ======================================================

function renderExpenses() {

  const list =
    $("expenseList");

  if (!expenses.length) {

    list.innerHTML = `
      <div class="card">
        <strong>No expenses recorded.</strong>
      </div>
    `;

    return;
  }


  list.innerHTML =
    expenses.map(expense => {

      const amount =
        num(
          expense.amount ??
          expense.total_amount
        );


      return `
        <div class="card">

          <h3>
            ${esc(
              expense.description ||
              expense.item_description ||
              "Expense"
            )}
          </h3>

          <div class="muted">
            Vehicle:
            ${esc(
              vehicleName(
                expense.vehicle_id
              )
            )}
          </div>

          <div class="muted">
            Date:
            ${esc(
              expense.expense_date || "-"
            )}
          </div>

          <div class="muted">
            Category:
            ${esc(
              expense.category ||
              expense.expense_type ||
              "-"
            )}
          </div>

          <p class="money">
            ${money(amount)}
          </p>

          <div class="actions">

            <button
              class="btn warning"
              onclick="editExpense('${expense.id}')">
              Edit
            </button>

            <button
              class="btn danger"
              onclick="deleteExpense('${expense.id}')">
              Delete
            </button>

          </div>

        </div>
      `;

    }).join("");
}


// ======================================================
// SAVE EXPENSE
// ======================================================

$("expenseForm").addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    try {

      const id =
        $("evid").value.trim();


      const data = {

        vehicle_id:
          $("evidSelect").value || null,

        expense_date:
          $("edate").value || today(),

        description:
          $("edesc").value.trim(),

        category:
          $("ecat").value,

        amount:
          num($("eamount").value)

      };


      if (!data.description) {
        toast("Expense description is required.");
        return;
      }


      let result;


      if (id) {

        // UPDATE
        result = await supabase
          .from("expenses")
          .update(data)
          .eq("id", id);

      } else {

        // INSERT
        result = await supabase
          .from("expenses")
          .insert(data);

      }


      if (result.error) {
        throw result.error;
      }


      $("expenseModal")
        .classList.add("hidden");

      toast(
        id
          ? "Expense updated."
          : "Expense added."
      );

      await loadAll();

    } catch (error) {

      showError(error);

    }

  }
);


// ======================================================
// EDIT EXPENSE
// ======================================================

window.editExpense =
  function(id) {

    const expense =
      expenses.find(
        item => item.id === id
      );

    if (!expense) return;


    populateVehicleSelect(
      "evidSelect"
    );


    $("evid").value =
      expense.id;

    $("evidSelect").value =
      expense.vehicle_id || "";

    $("edate").value =
      expense.expense_date || today();

    $("edesc").value =
      expense.description ||
      expense.item_description ||
      "";

    $("ecat").value =
      expense.category ||
      expense.expense_type ||
      "Other";

    $("eamount").value =
      expense.amount ??
      expense.total_amount ??
      0;

    $("expenseTitle").textContent =
      "Edit Expense";

    $("expenseModal")
      .classList.remove("hidden");

  };


// ======================================================
// DELETE EXPENSE
// ======================================================

window.deleteExpense =
  async function(id) {

    if (!confirm(
      "Delete this expense?"
    )) {
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


      toast("Expense deleted.");

      await loadAll();

    } catch (error) {

      showError(error);

    }

  };


// ======================================================
// PETTY CASH
// ======================================================

function clearPettyForm() {

  $("pettyForm").reset();

  $("pcid").value = "";

  $("pcdate").value =
    today();

  $("pettyTitle").textContent =
    "Petty Cash";

}


function openPetty() {

  clearPettyForm();

  $("pettyModal")
    .classList.remove("hidden");

}


$("addPetty").addEventListener(
  "click",
  openPetty
);


$("quickPetty").addEventListener(
  "click",
  () => {

    openTab("petty");

    openPetty();

  }
);


// ======================================================
// RENDER PETTY CASH
// ======================================================

function renderPettyCash() {

  const list =
    $("pettyList");


  if (!pettyCash.length) {

    list.innerHTML = `
      <div class="card">
        <strong>No petty cash transactions.</strong>
      </div>
    `;

    return;
  }


  list.innerHTML =
    pettyCash.map(item => {

      return `
        <div class="card">

          <h3>
            ${esc(
              item.description ||
              "Petty Cash"
            )}
          </h3>

          <div class="muted">
            Date:
            ${esc(
              item.cash_date || "-"
            )}
          </div>

          <div class="muted">
            Person:
            ${esc(
              item.person || "-"
            )}
          </div>

          <div class="muted">
            Category:
            ${esc(
              item.category || "-"
            )}
          </div>

          <p class="money">
            ${money(item.amount)}
          </p>

          <div class="actions">

            <button
              class="btn warning"
              onclick="editPetty('${item.id}')">
              Edit
            </button>

            <button
              class="btn danger"
              onclick="deletePetty('${item.id}')">
              Delete
            </button>

          </div>

        </div>
      `;

    }).join("");
}


// ======================================================
// SAVE PETTY CASH
// ======================================================

$("pettyForm").addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    try {

      const id =
        $("pcid").value.trim();


      const data = {

        cash_date:
          $("pcdate").value || today(),

        amount:
          num($("pcamount").value),

        description:
          $("pcdesc").value.trim(),

        person:
          $("pcperson").value.trim(),

        category:
          $("pccat").value.trim(),

        notes:
          $("pcnotes").value.trim()

      };


      let result;


      if (id) {

        // UPDATE
        result = await supabase
          .from("petty_cash")
          .update(data)
          .eq("id", id);

      } else {

        // INSERT
        result = await supabase
          .from("petty_cash")
          .insert(data);

      }


      if (result.error) {
        throw result.error;
      }


      $("pettyModal")
        .classList.add("hidden");

      toast(
        id
          ? "Petty cash updated."
          : "Petty cash added."
      );

      await loadAll();

    } catch (error) {

      showError(error);

    }

  }
);


// ======================================================
// EDIT PETTY CASH
// ======================================================

window.editPetty =
  function(id) {

    const item =
      pettyCash.find(
        row => row.id === id
      );

    if (!item) return;


    $("pcid").value =
      item.id;

    $("pcdate").value =
      item.cash_date || today();

    $("pcamount").value =
      item.amount || 0;

    $("pcdesc").value =
      item.description || "";

    $("pcperson").value =
      item.person || "";

    $("pccat").value =
      item.category || "";

    $("pcnotes").value =
      item.notes || "";

    $("pettyTitle").textContent =
      "Edit Petty Cash";

    $("pettyModal")
      .classList.remove("hidden");

  };


// ======================================================
// DELETE PETTY CASH
// ======================================================

window.deletePetty =
  async function(id) {

    if (!confirm(
      "Delete this petty cash transaction?"
    )) {
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


      toast("Petty cash deleted.");

      await loadAll();

    } catch (error) {

      showError(error);

    }

  };


// ======================================================
// REQUISITIONS
// ======================================================

function getReqCategory(req) {

  return (
    req.expense_type ||
    req.category ||
    req.type ||
    req.req_type ||
    req.item_type ||
    "Materials"
  );

}


async function nextReqNumber() {

  const numbers =
    requisitions
      .map(req => {

        const match =
          String(req.req_no || "")
            .match(/(\d+)$/);

        return match
          ? Number(match[1])
          : 0;

      });


  const next =
    Math.max(
      0,
      ...numbers
    ) + 1;


  return "REQ-" +
    String(next)
      .padStart(3, "0");

}


function clearReqForm() {

  $("reqForm").reset();

  $("reqid").value = "";

  $("reqdate").value =
    today();

  $("reqqty").value =
    "1";

  $("requnit").value =
    "0";

  $("reqtotal").value =
    "0";

  $("reqstatus").value =
    "Pending";

  $("reqcat").value =
    "Materials";

  populateVehicleSelect(
    "reqvehicle",
    true
  );

  nextReqNumber().then(number => {
    $("reqno").value = number;
  });

  $("reqTitle").textContent =
    "Add Requisition";
}


function openRequisition() {

  clearReqForm();

  $("reqModal")
    .classList.remove("hidden");

}


$("addReq").addEventListener(
  "click",
  openRequisition
);


$("quickReq").addEventListener(
  "click",
  () => {

    openTab("requisitions");

    openRequisition();

  }
);


// ======================================================
// REQUISITION TOTAL
// ======================================================

function calculateReqTotal() {

  const qty =
    num($("reqqty").value);

  const unit =
    num($("requnit").value);

  $("reqtotal").value =
    (qty * unit).toFixed(2);

}


$("reqqty").addEventListener(
  "input",
  calculateReqTotal
);

$("requnit").addEventListener(
  "input",
  calculateReqTotal
);


// ======================================================
// RENDER REQUISITIONS
// ======================================================

function renderRequisitions() {

  const list =
    $("reqList");


  if (!requisitions.length) {

    list.innerHTML = `
      <div class="card">
        <strong>No requisitions found.</strong>
      </div>
    `;

    return;
  }


  list.innerHTML =
    requisitions.map(req => {

      const category =
        getReqCategory(req);


      return `
        <div class="card">

          <h3>
            ${esc(
              req.req_no || "Requisition"
            )}
          </h3>

          <div class="muted">
            Date:
            ${esc(
              req.req_date || "-"
            )}
          </div>

          <div class="muted">
            Requested by:
            ${esc(
              req.requested_by || "-"
            )}
          </div>

          <div class="muted">
            Vehicle:
            ${esc(
              vehicleName(
                req.vehicle_id
              )
            )}
          </div>

          <div class="muted">
            Type:
            <strong>
              ${esc(category)}
            </strong>
          </div>

          <div>
            ${esc(
              req.item_description ||
              "-"
            )}
          </div>

          <div class="muted">
            Qty:
            ${num(req.quantity)}
            ×
            ${money(req.unit_cost)}
          </div>

          <p class="money">
            ${money(req.total_amount)}
          </p>

          <div class="muted">
            Status:
            ${esc(
              req.status || "Pending"
            )}
          </div>

          <div class="actions">

            <button
              class="btn warning"
              onclick="editRequisition('${req.id}')">
              Edit
            </button>

            <button
              class="btn secondary"
              onclick="printRequisition('${req.id}')">
              Print
            </button>

            <button
              class="btn danger"
              onclick="deleteRequisition('${req.id}')">
              Delete
            </button>

          </div>

        </div>
      `;

    }).join("");
}


// ======================================================
// SAVE REQUISITION
// ======================================================

$("reqForm").addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    try {

      const id =
        $("reqid").value.trim();


      const quantity =
        num($("reqqty").value);


      const unitCost =
        num($("requnit").value);


      const data = {

        req_no:
          $("reqno").value.trim(),

        req_date:
          $("reqdate").value || today(),

        requested_by:
          $("reqby").value.trim(),

        vehicle_id:
          $("reqvehicle").value || null,

        expense_type:
          $("reqcat").value,

        item_description:
          $("reqitem").value.trim(),

        quantity,

        unit_cost:
          unitCost,

        total_amount:
          quantity * unitCost,

        status:
          $("reqstatus").value,

        notes:
          $("reqnotes").value.trim()

      };


      if (!data.requested_by) {
        toast("Requested by is required.");
        return;
      }


      if (!data.item_description) {
        toast("Item description is required.");
        return;
      }


      let result;


      if (id) {

        // UPDATE
        result = await supabase
          .from("requisitions")
          .update(data)
          .eq("id", id);

      } else {

        // INSERT
        result = await supabase
          .from("requisitions")
          .insert(data);

      }


      if (result.error) {
        throw result.error;
      }


      $("reqModal")
        .classList.add("hidden");

      toast(
        id
          ? "Requisition updated."
          : "Requisition added."
      );

      await loadAll();

    } catch (error) {

      showError(error);

    }

  }
);


// ======================================================
// EDIT REQUISITION
// ======================================================

window.editRequisition =
  function(id) {

    const req =
      requisitions.find(
        item => item.id === id
      );

    if (!req) return;


    populateVehicleSelect(
      "reqvehicle",
      true
    );


    $("reqid").value =
      req.id;

    $("reqno").value =
      req.req_no || "";

    $("reqdate").value =
      req.req_date || today();

    $("reqby").value =
      req.requested_by || "";

    $("reqvehicle").value =
      req.vehicle_id || "";

    $("reqcat").value =
      getReqCategory(req);

    $("reqstatus").value =
      req.status || "Pending";

    $("reqitem").value =
      req.item_description || "";

    $("reqqty").value =
      req.quantity || 1;

    $("requnit").value =
      req.unit_cost || 0;

    $("reqtotal").value =
      req.total_amount || 0;

    $("reqnotes").value =
      req.notes || "";

    $("reqTitle").textContent =
      "Edit Requisition";

    $("reqModal")
      .classList.remove("hidden");

  };


// ======================================================
// DELETE REQUISITION
// ======================================================

window.deleteRequisition =
  async function(id) {

    if (!confirm(
      "Delete this requisition?"
    )) {
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


      toast("Requisition deleted.");

      await loadAll();

    } catch (error) {

      showError(error);

    }

  };


// ======================================================
// MODAL CLOSE
// ======================================================

document.querySelectorAll(
  "[data-close]"
).forEach(button => {

  button.addEventListener(
    "click",
    () => {

      const modalId =
        button.dataset.close;

      $(modalId)
        .classList.add("hidden");

    }
  );

});


document.querySelectorAll(
  ".modal"
).forEach(modal => {

  modal.addEventListener(
    "click",
    event => {

      if (event.target === modal) {

        modal.classList.add(
          "hidden"
        );

      }

    }
  );

});


// ======================================================
// PRINT
// ======================================================

function printPage(title, content) {

  const win =
    window.open(
      "",
      "_blank"
    );

  if (!win) {

    toast(
      "Please allow pop-ups to print."
    );

    return;
  }


  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${esc(title)}</title>

      <style>
        body {
          font-family: Arial;
          padding: 25px;
          color: #111;
        }

        h1 {
          margin-bottom: 5px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        th,
        td {
          border: 1px solid #ccc;
          padding: 8px;
          text-align: left;
        }

        th {
          background: #eee;
        }
      </style>
    </head>

    <body>

      <h1>${esc(title)}</h1>

      <p>
        Generated:
        ${new Date().toLocaleString()}
      </p>

      ${content}

      <script>
        window.onload = function() {
          window.print();
        };
      <\/script>

    </body>
    </html>
  `);

  win.document.close();
}


window.printSummary =
  function() {

    const totalExpenses =
      expenses.reduce(
        (s, e) =>
          s + num(
            e.amount ??
            e.total_amount
          ),
        0
      );


    const totalPetty =
      pettyCash.reduce(
        (s, e) =>
          s + num(e.amount),
        0
      );


    printPage(
      "Garage Operations Summary",
      `
        <table>
          <tr>
            <th>Item</th>
            <th>Total</th>
          </tr>

          <tr>
            <td>Vehicles</td>
            <td>${vehicles.length}</td>
          </tr>

          <tr>
            <td>Vehicle Expenses</td>
            <td>${money(totalExpenses)}</td>
          </tr>

          <tr>
            <td>Petty Cash</td>
            <td>${money(totalPetty)}</td>
          </tr>

          <tr>
            <td>Requisitions</td>
            <td>${requisitions.length}</td>
          </tr>
        </table>
      `
    );
  };


window.printVehicles =
  function() {

    const rows =
      vehicles.map(vehicle => `
        <tr>
          <td>
            ${esc(
              vehicle.registration ||
              vehicle.reg_no ||
              vehicle.reg ||
              ""
            )}
          </td>

          <td>
            ${esc(
              vehicle.customer || ""
            )}
          </td>

          <td>
            ${esc(
              vehicle.status || ""
            )}
          </td>

          <td>
            ${money(
              vehicleExpenseTotal(
                vehicle.id
              )
            )}
          </td>
        </tr>
      `).join("");


    printPage(
      "Vehicle Report",
      `
        <table>
          <tr>
            <th>Registration</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Expenses</th>
          </tr>

          ${rows}
        </table>
      `
    );
  };


window.printExpenses =
  function() {

    const rows =
      expenses.map(expense => `
        <tr>
          <td>
            ${esc(
              expense.expense_date || ""
            )}
          </td>

          <td>
            ${esc(
              vehicleName(
                expense.vehicle_id
              )
            )}
          </td>

          <td>
            ${esc(
              expense.category ||
              expense.expense_type ||
              ""
            )}
          </td>

          <td>
            ${esc(
              expense.description ||
              expense.item_description ||
              ""
            )}
          </td>

          <td>
            ${money(
              expense.amount ??
              expense.total_amount
            )}
          </td>
        </tr>
      `).join("");


    printPage(
      "Vehicle Expense Report",
      `
        <table>
          <tr>
            <th>Date</th>
            <th>Vehicle</th>
            <th>Category</th>
            <th>Description</th>
            <th>Amount</th>
          </tr>

          ${rows}
        </table>
      `
    );
  };


window.printPetty =
  function() {

    const rows =
      pettyCash.map(item => `
        <tr>
          <td>${esc(item.cash_date || "")}</td>
          <td>${esc(item.person || "")}</td>
          <td>${esc(item.category || "")}</td>
          <td>${esc(item.description || "")}</td>
          <td>${money(item.amount)}</td>
        </tr>
      `).join("");


    printPage(
      "Petty Cash Report",
      `
        <table>
          <tr>
            <th>Date</th>
            <th>Person</th>
            <th>Category</th>
            <th>Description</th>
            <th>Amount</th>
          </tr>

          ${rows}
        </table>
      `
    );
  };


window.printRequisitions =
  function() {

    const rows =
      requisitions.map(req => `
        <tr>
          <td>${esc(req.req_no || "")}</td>
          <td>${esc(req.req_date || "")}</td>
          <td>${esc(vehicleName(req.vehicle_id))}</td>
          <td>${esc(getReqCategory(req))}</td>
          <td>${esc(req.item_description || "")}</td>
          <td>${money(req.total_amount)}</td>
          <td>${esc(req.status || "")}</td>
        </tr>
      `).join("");


    printPage(
      "Requisition Report",
      `
        <table>
          <tr>
            <th>Req No.</th>
            <th>Date</th>
            <th>Vehicle</th>
            <th>Type</th>
            <th>Item</th>
            <th>Total</th>
            <th>Status</th>
          </tr>

          ${rows}
        </table>
      `
    );
  };


window.printVehicle =
  function(id) {

    const vehicle =
      vehicles.find(
        v => v.id === id
      );

    if (!vehicle) return;


    const reg =
      vehicle.registration ||
      vehicle.reg_no ||
      vehicle.reg ||
      "";


    const rows =
      vehicleExpenses(id)
        .map(expense => `
          <tr>
            <td>
              ${esc(
                expense.expense_date || ""
              )}
            </td>

            <td>
              ${esc(
                expense.category ||
                expense.expense_type ||
                ""
              )}
            </td>

            <td>
              ${esc(
                expense.description ||
                expense.item_description ||
                ""
              )}
            </td>

            <td>
              ${money(
                expense.amount ??
                expense.total_amount
              )}
            </td>
          </tr>
        `).join("");


    printPage(
      `Vehicle - ${reg}`,
      `
        <h2>${esc(reg)}</h2>

        <p>
          Customer:
          ${esc(vehicle.customer || "-")}
        </p>

        <p>
          Status:
          ${esc(vehicle.status || "-")}
        </p>

        <p>
          Billed:
          ${money(vehicle.billed)}
        </p>

        <p>
          Paid:
          ${money(vehicle.paid)}
        </p>

        <p>
          Balance:
          ${money(
            Math.max(
              0,
              num(vehicle.billed) -
              num(vehicle.paid)
            )
          )}
        </p>

        <h3>Expenses</h3>

        <table>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Amount</th>
          </tr>

          ${rows}
        </table>
      `
    );
  };


window.printRequisition =
  function(id) {

    const req =
      requisitions.find(
        r => r.id === id
      );

    if (!req) return;


    printPage(
      `Requisition ${req.req_no || ""}`,
      `
        <table>

          <tr>
            <th>Requisition No.</th>
            <td>${esc(req.req_no || "")}</td>
          </tr>

          <tr>
            <th>Date</th>
            <td>${esc(req.req_date || "")}</td>
          </tr>

          <tr>
            <th>Requested By</th>
            <td>${esc(req.requested_by || "")}</td>
          </tr>

          <tr>
            <th>Vehicle</th>
            <td>${esc(vehicleName(req.vehicle_id))}</td>
          </tr>

          <tr>
            <th>Type</th>
            <td>${esc(getReqCategory(req))}</td>
          </tr>

          <tr>
            <th>Item</th>
            <td>${esc(req.item_description || "")}</td>
          </tr>

          <tr>
            <th>Quantity</th>
            <td>${num(req.quantity)}</td>
          </tr>

          <tr>
            <th>Unit Cost</th>
            <td>${money(req.unit_cost)}</td>
          </tr>

          <tr>
            <th>Total</th>
            <td>${money(req.total_amount)}</td>
          </tr>

          <tr>
            <th>Status</th>
            <td>${esc(req.status || "")}</td>
          </tr>

        </table>
      `
    );
  };


// ======================================================
// SHARE
// ======================================================

window.shareGarage =
  async function() {

    const text =
      "Garage Operations Pro\n" +
      `Vehicles: ${vehicles.length}\n` +
      `Expenses: ${money(
        expenses.reduce(
          (s, e) =>
            s + num(
              e.amount ??
              e.total_amount
            ),
          0
        )
      )}\n` +
      `Petty Cash: ${money(
        pettyCash.reduce(
          (s, e) =>
            s + num(e.amount),
          0
        )
      )}`;

    try {

      if (
        navigator.share
      ) {

        await navigator.share({
          title: "Garage Operations Pro",
          text
        });

      } else {

        await navigator.clipboard.writeText(text);

        toast(
          "Summary copied to clipboard."
        );

      }

    } catch (error) {

      console.log(error);

    }
  };


window.shareSummary =
  window.shareGarage;


// ======================================================
// QUICK PRINT
// ======================================================

$("quickPrint").addEventListener(
  "click",
  () => {

    window.printSummary();

  }
);


// ======================================================
// INITIAL DATE DEFAULTS
// ======================================================

$("date_in").value =
  today();

$("edate").value =
  today();

$("pcdate").value =
  today();

$("reqdate").value =
  today();


// ======================================================
// END
// ======================================================
