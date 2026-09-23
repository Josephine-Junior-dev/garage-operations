import {
  createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


// ======================================================
// SUPABASE
// ======================================================

const SUPABASE_URL =
  "https://ptluwoeogfkqavhspdjj.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";

const supabase =
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ======================================================
// HELPERS
// ======================================================

const $ = id => document.getElementById(id);

const num = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const money = value => {
  return "KSh " + num(value).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

const today = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const esc = value => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};


// ======================================================
// APPLICATION STATE
// ======================================================

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];


// ======================================================
// DEMO LOGIN
// ======================================================

const USERS = {
  Josephine: "1234",
  Boss: "1234",
  Staff: "1234"
};


// ======================================================
// TOAST
// ======================================================

function toast(message) {
  const box = $("toast");

  if (!box) {
    alert(message);
    return;
  }

  box.textContent = message;
  box.style.display = "block";

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    box.style.display = "none";
  }, 2800);
}


// ======================================================
// SUPABASE ERROR HANDLER
// ======================================================

function showDbError(action, error) {

  console.error(action, error);

  const message =
    error?.message ||
    error?.details ||
    "Unknown database error";

  toast(`${action}: ${message}`);
}


// ======================================================
// LOGIN
// ======================================================

$("loginForm")?.addEventListener("submit", async event => {

  event.preventDefault();

  const username = $("username").value.trim();
  const password = $("password").value;

  const msg = $("loginMsg");

  if (!USERS[username] || USERS[username] !== password) {
    msg.textContent = "Invalid username or password.";
    return;
  }

  localStorage.setItem(
    "garage_logged_user",
    username
  );

  msg.textContent = "";

  $("login").classList.add("hidden");
  $("app").classList.remove("hidden");

  await load();
});


$("logout")?.addEventListener("click", () => {

  localStorage.removeItem("garage_logged_user");

  $("app").classList.add("hidden");
  $("login").classList.remove("hidden");

  $("username").value = "";
  $("password").value = "";
});


// ======================================================
// STARTUP LOGIN
// ======================================================

const loggedUser =
  localStorage.getItem("garage_logged_user");

if (loggedUser && USERS[loggedUser]) {

  $("login").classList.add("hidden");
  $("app").classList.remove("hidden");

}


// ======================================================
// TABS
// ======================================================

document.querySelectorAll(".tab").forEach(tab => {

  tab.addEventListener("click", () => {

    const target = tab.dataset.tab;

    document.querySelectorAll(".tab")
      .forEach(x => x.classList.remove("active"));

    document.querySelectorAll(".tabpage")
      .forEach(x => x.classList.add("hidden"));

    tab.classList.add("active");

    const page = $(target);

    if (page) {
      page.classList.remove("hidden");
    }

  });

});


// ======================================================
// LOAD EVERYTHING
// ======================================================

async function load() {

  try {

    const [
      vehicleResult,
      expenseResult,
      pettyResult,
      requisitionResult
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
        .order("expense_date", {
          ascending: false
        }),

      supabase
        .from("petty_cash")
        .select("*")
        .order("cash_date", {
          ascending: false
        }),

      supabase
        .from("requisitions")
        .select("*")
        .order("req_date", {
          ascending: false
        })

    ]);


    if (vehicleResult.error)
      throw vehicleResult.error;

    if (expenseResult.error)
      throw expenseResult.error;

    if (pettyResult.error)
      throw pettyResult.error;

    if (requisitionResult.error)
      throw requisitionResult.error;


    vehicles = vehicleResult.data || [];
    expenses = expenseResult.data || [];
    pettyCash = pettyResult.data || [];
    requisitions = requisitionResult.data || [];


    renderAll();

  } catch (error) {

    showDbError(
      "Unable to load garage data",
      error
    );

  }

}


// ======================================================
// RENDER EVERYTHING
// ======================================================

function renderAll() {

  renderDashboard();
  renderVehicles();
  renderPettyCash();
  renderRequisitions();

  fillVehicleSelectors();

}


// ======================================================
// DASHBOARD
// ======================================================

function renderDashboard() {

  const totalVehicles = vehicles.length;

  const repair = vehicles.filter(
    v => v.status === "Under Repair"
  ).length;

  const storage = vehicles.filter(
    v => v.status === "Storage"
  ).length;

  const totalExpenses =
    expenses.reduce(
      (sum, x) => sum + num(x.amount),
      0
    );

  const totalPetty =
    pettyCash.reduce(
      (sum, x) => sum + num(x.amount),
      0
    );

  const outstanding =
    vehicles.reduce(
      (sum, v) =>
        sum +
        Math.max(
          0,
          num(v.billed) - num(v.paid)
        ),
      0
    );


  $("nVehicles").textContent =
    totalVehicles;

  $("nRepair").textContent =
    repair;

  $("nStorage").textContent =
    storage;

  $("nExpenses").textContent =
    money(totalExpenses);

  $("nPetty").textContent =
    money(totalPetty);

  $("nOutstanding").textContent =
    money(outstanding);

}


// ======================================================
// VEHICLE SEARCH
// ======================================================

$("search")?.addEventListener(
  "input",
  renderVehicles
);

$("filter")?.addEventListener(
  "change",
  renderVehicles
);


// ======================================================
// VEHICLE RENDER
// ======================================================

function renderVehicles() {

  const list = $("list");

  if (!list) return;

  const search =
    ($("search")?.value || "")
      .trim()
      .toLowerCase();

  const filter =
    $("filter")?.value || "";


  const filtered =
    vehicles.filter(v => {

      const matchesSearch =
        !search ||
        String(v.reg || "")
          .toLowerCase()
          .includes(search) ||
        String(v.customer || "")
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        !filter ||
        v.status === filter;

      return matchesSearch &&
             matchesStatus;

    });


  if (!filtered.length) {

    list.innerHTML = `
      <div class="empty">
        No vehicles found.
      </div>
    `;

    return;
  }


  list.innerHTML =
    filtered.map(vehicleCard).join("");

}


// ======================================================
// VEHICLE CARD
// ======================================================

function vehicleCard(v) {

  const vehicleExpenses =
    expenses.filter(
      e => e.vehicle_id === v.id
    );


  const totalExpense =
    vehicleExpenses.reduce(
      (sum, e) =>
        sum + num(e.amount),
      0
    );


  const parts =
    vehicleExpenses
      .filter(e => e.category === "Parts")
      .reduce(
        (sum, e) => sum + num(e.amount),
        0
      );


  const materials =
    vehicleExpenses
      .filter(e => e.category === "Materials")
      .reduce(
        (sum, e) => sum + num(e.amount),
        0
      );


  const labour =
    vehicleExpenses
      .filter(e => e.category === "Labour")
      .reduce(
        (sum, e) => sum + num(e.amount),
        0
      );


  const billed = num(v.billed);
  const paid = num(v.paid);

  const balance =
    Math.max(0, billed - paid);


  const expenseRows =
    vehicleExpenses.length
      ? vehicleExpenses.map(e => `
        <tr>
          <td>${esc(e.expense_date)}</td>
          <td>${esc(e.description)}</td>
          <td>${esc(e.category)}</td>
          <td>${money(e.amount)}</td>
          <td>
            <button
              class="danger"
              onclick="deleteExpense('${esc(e.id)}')">
              Delete
            </button>
          </td>
        </tr>
      `).join("")
      : `
        <tr>
          <td colspan="5">
            No expenses recorded.
          </td>
        </tr>
      `;


  return `
    <div class="vehicle-card">

      <div class="vehicle-top">

        <div>
          <h3>${esc(v.reg)}</h3>
          <div>${esc(v.customer)}</div>
        </div>

        <div>
          <span class="badge">
            ${esc(v.status || "Under Repair")}
          </span>
        </div>

      </div>


      <div class="vehicle-info">

        <div>
          <small>Date received</small>
          ${esc(v.date_in || "")}
        </div>

        <div>
          <small>Job type</small>
          ${esc(v.job_type || "")}
        </div>

        <div>
          <small>Charge-out</small>
          <span class="money">
            ${money(billed)}
          </span>
        </div>

        <div>
          <small>Balance</small>
          <span class="money">
            ${money(balance)}
          </span>
        </div>

      </div>


      ${
        v.description
          ? `
            <p>
              <strong>Description:</strong>
              ${esc(v.description)}
            </p>
          `
          : ""
      }


      ${
        v.status === "Storage" ||
        v.status === "Released"
          ? `
            <div class="storage-box">

              <strong>
                Storage / Release Details
              </strong>

              <p>
                Date out:
                ${esc(v.date_out || "Still in storage")}
              </p>

              <p>
                Released to:
                ${esc(v.released_to || "-")}
              </p>

              <p>
                Contact:
                ${esc(v.released_contact || "-")}
              </p>

            </div>
          `
          : ""
      }


      <div class="vehicle-info">

        <div>
          <small>Total expenses</small>
          <span class="money">
            ${money(totalExpense)}
          </span>
        </div>

        <div>
          <small>Parts</small>
          ${money(parts)}
        </div>

        <div>
          <small>Materials</small>
          ${money(materials)}
        </div>

        <div>
          <small>Labour</small>
          ${money(labour)}
        </div>

      </div>


      <div class="actions">

        <button
          onclick="expense('${esc(v.id)}')">
          + Expense
        </button>

        <button
          class="secondary"
          onclick="edit('${esc(v.id)}')">
          Edit
        </button>

        <button
          class="secondary"
          onclick="printVehicle('${esc(v.id)}')">
          Print
        </button>

        <button
          class="secondary"
          onclick="shareVehicle('${esc(v.id)}')">
          Share
        </button>

        <button
          class="danger"
          onclick="removeVehicle('${esc(v.id)}')">
          Delete
        </button>

      </div>


      <details style="margin-top:12px">

        <summary>
          View vehicle expenses
          (${vehicleExpenses.length})
        </summary>

        <div class="table-wrap">

          <table>

            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              ${expenseRows}
            </tbody>

          </table>

        </div>

      </details>

    </div>
  `;

}


// ======================================================
// VEHICLE SELECTORS
// ======================================================

function fillVehicleSelectors() {

  const expenseSelect =
    $("evidSelect");

  const reqSelect =
    $("reqvehicle");


  if (expenseSelect) {

    expenseSelect.innerHTML =
      `<option value="">Select vehicle</option>` +
      vehicles.map(v => `
        <option value="${esc(v.id)}">
          ${esc(v.reg)} - ${esc(v.customer)}
        </option>
      `).join("");

  }


  if (reqSelect) {

    reqSelect.innerHTML =
      `<option value="">
        General / No vehicle
      </option>` +

      vehicles.map(v => `
        <option value="${esc(v.id)}">
          ${esc(v.reg)} - ${esc(v.customer)}
        </option>
      `).join("");

  }

}


// ======================================================
// VEHICLE MODAL
// ======================================================

$("addVehicle")?.addEventListener(
  "click",
  openVehicle
);

$("quickVehicle")?.addEventListener(
  "click",
  openVehicle
);


function openVehicle() {

  $("vehicleForm").reset();

  $("vid").value = "";

  $("vTitle").textContent =
    "Add Vehicle";

  $("date_in").value =
    today();

  $("billed").value = 0;
  $("paid").value = 0;

  updateStorageFields();

  $("vehicleModal")
    .classList.remove("hidden");

}


// ======================================================
// EDIT VEHICLE
// ======================================================

window.edit = function(id) {

  const v =
    vehicles.find(x => x.id === id);

  if (!v) return;


  $("vid").value =
    v.id;

  $("reg").value =
    v.reg || "";

  $("customer").value =
    v.customer || "";

  $("date_in").value =
    v.date_in || today();

  $("job_type").value =
    v.job_type || "Repair";

  $("status").value =
    v.status || "Under Repair";

  $("date_out").value =
    v.date_out || "";

  $("released_to").value =
    v.released_to || "";

  $("released_contact").value =
    v.released_contact || "";

  $("description").value =
    v.description || "";

  $("billed").value =
    num(v.billed);

  $("paid").value =
    num(v.paid);

  $("vTitle").textContent =
    "Edit Vehicle";

  updateStorageFields();

  $("vehicleModal")
    .classList.remove("hidden");

};


// ======================================================
// STORAGE FIELDS
// ======================================================

$("status")?.addEventListener(
  "change",
  updateStorageFields
);


function updateStorageFields() {

  const status =
    $("status")?.value;

  if (
    status === "Storage" ||
    status === "Released"
  ) {

    $("storageFields")
      ?.classList.remove("hidden");

  } else {

    $("storageFields")
      ?.classList.add("hidden");

  }

}


// ======================================================
// SAVE VEHICLE
// ======================================================

$("vehicleForm")?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const id =
      $("vid").value.trim();


    const record = {

      reg:
        $("reg").value.trim(),

      customer:
        $("customer").value.trim(),

      date_in:
        $("date_in").value,

      job_type:
        $("job_type").value,

      status:
        $("status").value,

      date_out:
        $("date_out").value || null,

      released_to:
        $("released_to").value.trim() || null,

      released_contact:
        $("released_contact").value.trim() || null,

      description:
        $("description").value.trim(),

      billed:
        num($("billed").value),

      paid:
        num($("paid").value)

    };


    try {

      let result;

      if (id) {

        result =
          await supabase
            .from("vehicles")
            .update(record)
            .eq("id", id);

      } else {

        result =
          await supabase
            .from("vehicles")
            .insert(record);

      }


      if (result.error)
        throw result.error;


      closeModal("vehicleModal");

      toast(
        id
          ? "Vehicle updated successfully."
          : "Vehicle added successfully."
      );

      await load();

    } catch (error) {

      showDbError(
        "Unable to save vehicle",
        error
      );

    }

  }
);


// ======================================================
// DELETE VEHICLE
// ======================================================

window.removeVehicle = async function(id) {

  const v =
    vehicles.find(x => x.id === id);

  if (!v) return;


  if (
    !confirm(
      `Delete vehicle ${v.reg} and its vehicle expenses?`
    )
  ) {
    return;
  }


  try {

    // Delete vehicle expenses first.
    const expenseDelete =
      await supabase
        .from("expenses")
        .delete()
        .eq("vehicle_id", id);

    if (expenseDelete.error)
      throw expenseDelete.error;


    // Remove vehicle link from requisitions.
    const reqUpdate =
      await supabase
        .from("requisitions")
        .update({
          vehicle_id: null
        })
        .eq("vehicle_id", id);

    if (reqUpdate.error)
      throw reqUpdate.error;


    // Delete vehicle.
    const vehicleDelete =
      await supabase
        .from("vehicles")
        .delete()
        .eq("id", id);

    if (vehicleDelete.error)
      throw vehicleDelete.error;


    toast(
      "Vehicle deleted successfully."
    );

    await load();

  } catch (error) {

    showDbError(
      "Unable to delete vehicle",
      error
    );

  }

};


// ======================================================
// VEHICLE EXPENSE MODAL
// ======================================================

$("quickExpense")?.addEventListener(
  "click",
  () => openExpense()
);


window.expense = function(vehicleId) {
  openExpense(vehicleId);
};


function openExpense(vehicleId = "") {

  $("expenseForm").reset();

  $("edate").value =
    today();

  $("evid").value =
    vehicleId || "";

  fillVehicleSelectors();

  if (vehicleId) {

    $("evidSelect").value =
      vehicleId;

  }

  $("expenseModal")
    .classList.remove("hidden");

}


// ======================================================
// EXPENSE VEHICLE CHANGE
// ======================================================

$("evidSelect")?.addEventListener(
  "change",
  () => {

    $("evid").value =
      $("evidSelect").value;

  }
);


// ======================================================
// SAVE EXPENSE
// ======================================================

$("expenseForm")?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const vehicleId =
      $("evidSelect").value ||
      $("evid").value;


    if (!vehicleId) {

      toast(
        "Please select a vehicle."
      );

      return;
    }


    const record = {

      vehicle_id:
        vehicleId,

      expense_date:
        $("edate").value,

      description:
        $("edesc").value.trim(),

      category:
        $("ecat").value,

      amount:
        num($("eamount").value)

    };


    try {

      const result =
        await supabase
          .from("expenses")
          .insert(record);


      if (result.error)
        throw result.error;


      closeModal("expenseModal");

      toast(
        "Vehicle expense saved."
      );

      await load();

    } catch (error) {

      showDbError(
        "Unable to save vehicle expense",
        error
      );

    }

  }
);


// ======================================================
// DELETE EXPENSE
// ======================================================

window.deleteExpense = async function(id) {

  if (!confirm("Delete this expense?"))
    return;


  try {

    const result =
      await supabase
        .from("expenses")
        .delete()
        .eq("id", id);


    if (result.error)
      throw result.error;


    toast(
      "Expense deleted."
    );

    await load();

  } catch (error) {

    showDbError(
      "Unable to delete expense",
      error
    );

  }

};


// ======================================================
// PETTY CASH
// ======================================================

$("addPetty")?.addEventListener(
  "click",
  openPetty
);

$("quickPetty")?.addEventListener(
  "click",
  openPetty
);


function openPetty() {

  $("pettyForm").reset();

  $("pcid").value = "";

  $("pcdate").value =
    today();

  $("pettyModal")
    .classList.remove("hidden");

}


// ======================================================
// SAVE PETTY CASH
// ======================================================

$("pettyForm")?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const record = {

      cash_date:
        $("pcdate").value,

      description:
        $("pcdesc").value.trim(),

      paid_to:
        $("pcperson").value.trim(),

      category:
        $("pccat").value,

      amount:
        num($("pcamount").value),

      notes:
        $("pcnotes").value.trim()

    };


    try {

      const result =
        await supabase
          .from("petty_cash")
          .insert(record);


      if (result.error)
        throw result.error;


      closeModal("pettyModal");

      toast(
        "Petty cash saved."
      );

      await load();

    } catch (error) {

      showDbError(
        "Unable to save petty cash",
        error
      );

    }

  }
);


// ======================================================
// RENDER PETTY CASH
// ======================================================

function renderPettyCash() {

  const box =
    $("pettyList");

  if (!box) return;


  if (!pettyCash.length) {

    box.innerHTML = `
      <div class="empty">
        No petty cash records found.
      </div>
    `;

    return;
  }


  const total =
    pettyCash.reduce(
      (sum, p) =>
        sum + num(p.amount),
      0
    );


  box.innerHTML = `

    <div class="panel">
      <strong>
        Total Petty Cash:
        ${money(total)}
      </strong>
    </div>

    <div class="table-wrap">

      <table>

        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Paid To / By</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          ${
            pettyCash.map(p => `
              <tr>

                <td>
                  ${esc(p.cash_date)}
                </td>

                <td>
                  ${esc(p.description)}
                </td>

                <td>
                  ${esc(p.paid_to)}
                </td>

                <td>
                  ${esc(p.category)}
                </td>

                <td>
                  <strong>
                    ${money(p.amount)}
                  </strong>
                </td>

                <td>
                  ${esc(p.notes)}
                </td>

                <td>
                  <button
                    class="danger"
                    onclick="deletePetty('${esc(p.id)}')">
                    Delete
                  </button>
                </td>

              </tr>
            `).join("")
          }

        </tbody>

      </table>

    </div>
  `;

}


// ======================================================
// DELETE PETTY CASH
// ======================================================

window.deletePetty = async function(id) {

  if (!confirm("Delete this petty cash record?"))
    return;


  try {

    const result =
      await supabase
        .from("petty_cash")
        .delete()
        .eq("id", id);


    if (result.error)
      throw result.error;


    toast(
      "Petty cash deleted."
    );

    await load();

  } catch (error) {

    showDbError(
      "Unable to delete petty cash",
      error
    );

  }

};


// ======================================================
// REQUISITIONS
// ======================================================

$("addReq")?.addEventListener(
  "click",
  openRequisition
);

$("quickReq")?.addEventListener(
  "click",
  openRequisition
);


function openRequisition() {

  $("reqForm").reset();

  $("reqid").value = "";

  $("reqdate").value =
    today();

  $("reqstatus").value =
    "Pending";

  $("reqcat").value =
    "Materials";

  $("reqqty").value = 1;
  $("requnit").value = 0;
  $("reqtotal").value = 0;

  fillVehicleSelectors();

  nextReqNumber()
    .then(number => {
      $("reqno").value = number;
    });

  $("reqTitle").textContent =
    "New Requisition";

  $("reqModal")
    .classList.remove("hidden");

}


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


$("reqqty")?.addEventListener(
  "input",
  calculateReqTotal
);

$("requnit")?.addEventListener(
  "input",
  calculateReqTotal
);


// ======================================================
// NEXT REQUISITION NUMBER
// ======================================================

async function nextReqNumber() {

  try {

    const result =
      await supabase
        .from("requisitions")
        .select("req_no")
        .order("req_no", {
          ascending: false
        })
        .limit(100);


    if (result.error)
      throw result.error;


    let highest = 0;


    (result.data || [])
      .forEach(row => {

        const match =
          String(row.req_no || "")
            .match(/(\d+)$/);

        if (match) {

          highest =
            Math.max(
              highest,
              Number(match[1])
            );

        }

      });


    return `REQ-${String(highest + 1)
      .padStart(3, "0")}`;


  } catch (error) {

    console.error(
      "Requisition number error",
      error
    );

    return `REQ-${Date.now()
      .toString()
      .slice(-6)}`;

  }

}


// ======================================================
// SAVE REQUISITION
// ======================================================

$("reqForm")?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    calculateReqTotal();


    const id =
      $("reqid").value.trim();


    const record = {

      req_no:
        $("reqno").value.trim(),

      req_date:
        $("reqdate").value,

      requested_by:
        $("reqby").value.trim(),

      vehicle_id:
        $("reqvehicle").value ||
        null,

      item_description:
        $("reqitem").value.trim(),

      expense_type:
        $("reqcat").value,

      quantity:
        num($("reqqty").value),

      unit_cost:
        num($("requnit").value),

      total_amount:
        num($("reqtotal").value),

      status:
        $("reqstatus").value,

      notes:
        $("reqnotes").value.trim()

    };


    try {

      let result;


      if (id) {

        result =
          await supabase
            .from("requisitions")
            .update(record)
            .eq("id", id);

      } else {

        result =
          await supabase
            .from("requisitions")
            .insert(record);

      }


      if (result.error)
        throw result.error;


      closeModal("reqModal");

      toast(
        id
          ? "Requisition updated."
          : "Requisition saved."
      );

      await load();

    } catch (error) {

      showDbError(
        "Unable to save requisition",
        error
      );

    }

  }
);


// ======================================================
// REQUISITION CATEGORY
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


// ======================================================
// RENDER REQUISITIONS
// ======================================================

function renderRequisitions() {

  const box =
    $("reqList");

  if (!box) return;


  if (!requisitions.length) {

    box.innerHTML = `
      <div class="empty">
        No requisitions found.
      </div>
    `;

    return;
  }


  box.innerHTML = `

    <div class="table-wrap">

      <table>

        <thead>

          <tr>
            <th>No.</th>
            <th>Date</th>
            <th>Requested By</th>
            <th>Vehicle</th>
            <th>Type</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Total</th>
            <th>Status</th>
            <th></th>
          </tr>

        </thead>


        <tbody>

          ${
            requisitions.map(r => {

              const vehicle =
                vehicles.find(
                  v => v.id === r.vehicle_id
                );


              return `

                <tr>

                  <td>
                    ${esc(r.req_no)}
                  </td>

                  <td>
                    ${esc(r.req_date)}
                  </td>

                  <td>
                    ${esc(r.requested_by)}
                  </td>

                  <td>
                    ${
                      vehicle
                        ? esc(vehicle.reg)
                        : "General"
                    }
                  </td>

                  <td>
                    ${esc(getReqCategory(r))}
                  </td>

                  <td>
                    ${esc(r.item_description)}
                  </td>

                  <td>
                    ${num(r.quantity)}
                  </td>

                  <td>
                    ${money(r.unit_cost)}
                  </td>

                  <td>
                    <strong>
                      ${money(r.total_amount)}
                    </strong>
                  </td>

                  <td>
                    <span class="badge">
                      ${esc(r.status)}
                    </span>
                  </td>

                  <td>

                    <button
                      class="secondary"
                      onclick="printReq('${esc(r.id)}')">
                      Print
                    </button>

                    <button
                      class="danger"
                      onclick="deleteReq('${esc(r.id)}')">
                      Delete
                    </button>

                  </td>

                </tr>

              `;

            }).join("")
          }

        </tbody>

      </table>

    </div>

  `;

}


// ======================================================
// DELETE REQUISITION
// ======================================================

window.deleteReq = async function(id) {

  if (!confirm("Delete this requisition?"))
    return;


  try {

    const result =
      await supabase
        .from("requisitions")
        .delete()
        .eq("id", id);


    if (result.error)
      throw result.error;


    toast(
      "Requisition deleted."
    );

    await load();

  } catch (error) {

    showDbError(
      "Unable to delete requisition",
      error
    );

  }

};


// ======================================================
// CLOSE MODALS
// ======================================================

document.querySelectorAll("[data-close]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        closeModal(
          button.dataset.close
        );

      }
    );

  });


function closeModal(id) {

  $(id)?.classList.add("hidden");

}


// Close modal when clicking outside card.

document.querySelectorAll(".modal")
  .forEach(modal => {

    modal.addEventListener(
      "click",
      event => {

        if (event.target === modal) {
          modal.classList.add("hidden");
        }

      }
    );

  });


// ======================================================
// PRINT ENGINE
// ======================================================

function printPage(title, content) {

  const win =
    window.open(
      "",
      "_blank"
    );

  if (!win) {

    toast(
      "Please allow pop-ups for printing."
    );

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
          padding:25px;
          color:#111;
        }

        h1,h2{
          margin-bottom:8px;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:15px;
        }

        th,td{
          border:1px solid #bbb;
          padding:7px;
          text-align:left;
          font-size:12px;
        }

        th{
          background:#eee;
        }

        .total{
          font-weight:bold;
          margin-top:15px;
        }

        @media print{
          button{
            display:none;
          }
        }

      </style>

    </head>

    <body>

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


// ======================================================
// PRINT SUMMARY
// ======================================================

window.printSummary = function() {

  const totalExpenses =
    expenses.reduce(
      (s,e) => s + num(e.amount),
      0
    );

  const totalPetty =
    pettyCash.reduce(
      (s,p) => s + num(p.amount),
      0
    );

  const billed =
    vehicles.reduce(
      (s,v) => s + num(v.billed),
      0
    );

  const paid =
    vehicles.reduce(
      (s,v) => s + num(v.paid),
      0
    );


  printPage(
    "Garage Summary",
    `

      <h1>Garage Operations Pro</h1>

      <h2>Garage Summary</h2>

      <p>
        Report date:
        ${today()}
      </p>

      <table>

        <tr>
          <th>Total Vehicles</th>
          <td>${vehicles.length}</td>
        </tr>

        <tr>
          <th>Under Repair</th>
          <td>
            ${
              vehicles.filter(
                v => v.status === "Under Repair"
              ).length
            }
          </td>
        </tr>

        <tr>
          <th>Storage</th>
          <td>
            ${
              vehicles.filter(
                v => v.status === "Storage"
              ).length
            }
          </td>
        </tr>

        <tr>
          <th>Total Vehicle Expenses</th>
          <td>${money(totalExpenses)}</td>
        </tr>

        <tr>
          <th>Total Petty Cash</th>
          <td>${money(totalPetty)}</td>
        </tr>

        <tr>
          <th>Total Charge-Out</th>
          <td>${money(billed)}</td>
        </tr>

        <tr>
          <th>Total Payments</th>
          <td>${money(paid)}</td>
        </tr>

        <tr>
          <th>Outstanding</th>
          <td>
            ${money(Math.max(0,billed-paid))}
          </td>
        </tr>

      </table>

    `
  );

};


// ======================================================
// PRINT VEHICLES
// ======================================================

window.printVehicles = function() {

  printPage(
    "Vehicle List",
    `

      <h1>Garage Operations Pro</h1>

      <h2>Vehicle List</h2>

      <table>

        <thead>

          <tr>
            <th>Registration</th>
            <th>Customer</th>
            <th>Date In</th>
            <th>Job Type</th>
            <th>Status</th>
            <th>Charge-Out</th>
            <th>Paid</th>
            <th>Balance</th>
          </tr>

        </thead>

        <tbody>

          ${
            vehicles.map(v => `

              <tr>

                <td>${esc(v.reg)}</td>
                <td>${esc(v.customer)}</td>
                <td>${esc(v.date_in)}</td>
                <td>${esc(v.job_type)}</td>
                <td>${esc(v.status)}</td>
                <td>${money(v.billed)}</td>
                <td>${money(v.paid)}</td>
                <td>
                  ${money(
                    Math.max(
                      0,
                      num(v.billed)-num(v.paid)
                    )
                  )}
                </td>

              </tr>

            `).join("")
          }

        </tbody>

      </table>

    `
  );

};


// ======================================================
// PRINT ALL EXPENSES
// ======================================================

window.printExpenses = function() {

  const total =
    expenses.reduce(
      (s,e) => s + num(e.amount),
      0
    );


  printPage(
    "Vehicle Expenses",
    `

      <h1>Garage Operations Pro</h1>

      <h2>Vehicle Expenses</h2>

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

          ${
            expenses.map(e => {

              const v =
                vehicles.find(
                  x => x.id === e.vehicle_id
                );

              return `

                <tr>

                  <td>${esc(e.expense_date)}</td>

                  <td>
                    ${
                      v
                        ? esc(v.reg)
                        : "Unknown"
                    }
                  </td>

                  <td>${esc(e.description)}</td>

                  <td>${esc(e.category)}</td>

                  <td>${money(e.amount)}</td>

                </tr>

              `;

            }).join("")
          }

        </tbody>

      </table>

      <p class="total">
        Total:
        ${money(total)}
      </p>

    `
  );

};


// ======================================================
// PRINT PETTY CASH
// ======================================================

window.printPetty = function() {

  const total =
    pettyCash.reduce(
      (s,p) => s + num(p.amount),
      0
    );


  printPage(
    "Petty Cash",
    `

      <h1>Garage Operations Pro</h1>

      <h2>Petty Cash</h2>

      <table>

        <thead>

          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Paid To / By</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Notes</th>
          </tr>

        </thead>

        <tbody>

          ${
            pettyCash.map(p => `

              <tr>

                <td>${esc(p.cash_date)}</td>

                <td>${esc(p.description)}</td>

                <td>${esc(p.paid_to)}</td>

                <td>${esc(p.category)}</td>

                <td>${money(p.amount)}</td>

                <td>${esc(p.notes)}</td>

              </tr>

            `).join("")
          }

        </tbody>

      </table>

      <p class="total">
        Total:
        ${money(total)}
      </p>

    `
  );

};


// ======================================================
// PRINT REQUISITIONS
// ======================================================

window.printRequisitions = function() {

  const total =
    requisitions.reduce(
      (s,r) => s + num(r.total_amount),
      0
    );


  printPage(
    "Requisitions",
    `

      <h1>Garage Operations Pro</h1>

      <h2>Requisitions</h2>

      <table>

        <thead>

          <tr>
            <th>No.</th>
            <th>Date</th>
            <th>Requested By</th>
            <th>Vehicle</th>
            <th>Type</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Total</th>
            <th>Status</th>
          </tr>

        </thead>

        <tbody>

          ${
            requisitions.map(r => {

              const v =
                vehicles.find(
                  x => x.id === r.vehicle_id
                );

              return `

                <tr>

                  <td>${esc(r.req_no)}</td>

                  <td>${esc(r.req_date)}</td>

                  <td>${esc(r.requested_by)}</td>

                  <td>
                    ${
                      v
                        ? esc(v.reg)
                        : "General"
                    }
                  </td>

                  <td>
                    ${esc(getReqCategory(r))}
                  </td>

                  <td>
                    ${esc(r.item_description)}
                  </td>

                  <td>
                    ${num(r.quantity)}
                  </td>

                  <td>
                    ${money(r.total_amount)}
                  </td>

                  <td>
                    ${esc(r.status)}
                  </td>

                </tr>

              `;

            }).join("")
          }

        </tbody>

      </table>

      <p class="total">
        Total Requisitions:
        ${money(total)}
      </p>

    `
  );

};


// ======================================================
// PRINT ONE VEHICLE
// ======================================================

window.printVehicle = function(id) {

  const v =
    vehicles.find(
      x => x.id === id
    );

  if (!v) return;


  const list =
    expenses.filter(
      e => e.vehicle_id === id
    );


  const total =
    list.reduce(
      (s,e) => s + num(e.amount),
      0
    );


  printPage(
    `Vehicle ${v.reg}`,
    `

      <h1>Garage Operations Pro</h1>

      <h2>Vehicle Repair Report</h2>

      <table>

        <tr>
          <th>Registration</th>
          <td>${esc(v.reg)}</td>
        </tr>

        <tr>
          <th>Customer</th>
          <td>${esc(v.customer)}</td>
        </tr>

        <tr>
          <th>Date Received</th>
          <td>${esc(v.date_in)}</td>
        </tr>

        <tr>
          <th>Job Type</th>
          <td>${esc(v.job_type)}</td>
        </tr>

        <tr>
          <th>Status</th>
          <td>${esc(v.status)}</td>
        </tr>

        <tr>
          <th>Charge-Out</th>
          <td>${money(v.billed)}</td>
        </tr>

        <tr>
          <th>Paid</th>
          <td>${money(v.paid)}</td>
        </tr>

        <tr>
          <th>Outstanding</th>
          <td>
            ${money(
              Math.max(
                0,
                num(v.billed)-num(v.paid)
              )
            )}
          </td>
        </tr>

      </table>


      <h2>Expenses</h2>

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
            list.map(e => `

              <tr>

                <td>${esc(e.expense_date)}</td>
                <td>${esc(e.description)}</td>
                <td>${esc(e.category)}</td>
                <td>${money(e.amount)}</td>

              </tr>

            `).join("")
          }

        </tbody>

      </table>

      <p class="total">
        Total Vehicle Expenses:
        ${money(total)}
      </p>

    `
  );

};


// ======================================================
// PRINT ONE REQUISITION
// ======================================================

window.printReq = function(id) {

  const r =
    requisitions.find(
      x => x.id === id
    );

  if (!r) return;


  const v =
    vehicles.find(
      x => x.id === r.vehicle_id
    );


  printPage(
    `Requisition ${r.req_no}`,
    `

      <h1>Garage Operations Pro</h1>

      <h2>Requisition</h2>

      <table>

        <tr>
          <th>Requisition No.</th>
          <td>${esc(r.req_no)}</td>
        </tr>

        <tr>
          <th>Date</th>
          <td>${esc(r.req_date)}</td>
        </tr>

        <tr>
          <th>Requested By</th>
          <td>${esc(r.requested_by)}</td>
        </tr>

        <tr>
          <th>Vehicle</th>
          <td>
            ${
              v
                ? esc(v.reg)
                : "General / No vehicle"
            }
          </td>
        </tr>

        <tr>
          <th>Expense Type</th>
          <td>${esc(getReqCategory(r))}</td>
        </tr>

        <tr>
          <th>Item</th>
          <td>${esc(r.item_description)}</td>
        </tr>

        <tr>
          <th>Quantity</th>
          <td>${num(r.quantity)}</td>
        </tr>

        <tr>
          <th>Unit Cost</th>
          <td>${money(r.unit_cost)}</td>
        </tr>

        <tr>
          <th>Total</th>
          <td>${money(r.total_amount)}</td>
        </tr>

        <tr>
          <th>Status</th>
          <td>${esc(r.status)}</td>
        </tr>

        <tr>
          <th>Notes</th>
          <td>${esc(r.notes)}</td>
        </tr>

      </table>

    `
  );

};


// ======================================================
// SHARE ENGINE
// ======================================================

async function doShare(title, text) {

  const data = {
    title,
    text,
    url: location.href
  };


  try {

    if (
      navigator.share &&
      typeof navigator.share === "function"
    ) {

      await navigator.share(data);

      return;
    }


    if (
      navigator.clipboard &&
      navigator.clipboard.writeText
    ) {

      await navigator.clipboard.writeText(
        `${text}\n${location.href}`
      );

      toast(
        "Copied to clipboard."
      );

      return;
    }


    toast(
      "Sharing is not available on this browser."
    );


  } catch (error) {

    if (error?.name !== "AbortError") {

      console.error(
        "Share error",
        error
      );

    }

  }

}


// ======================================================
// SHARE GARAGE
// ======================================================

window.shareGarage = function() {

  doShare(
    "Garage Operations Pro",
    "Garage Operations Pro vehicle and expense management."
  );

};


// ======================================================
// SHARE SUMMARY
// ======================================================

window.shareSummary = function() {

  const totalExpenses =
    expenses.reduce(
      (s,e) => s + num(e.amount),
      0
    );

  const totalPetty =
    pettyCash.reduce(
      (s,p) => s + num(p.amount),
      0
    );

  const outstanding =
    vehicles.reduce(
      (s,v) =>
        s +
        Math.max(
          0,
          num(v.billed)-num(v.paid)
        ),
      0
    );


  doShare(
    "Garage Summary",
    `Garage Summary

Vehicles: ${vehicles.length}
Vehicle Expenses: ${money(totalExpenses)}
Petty Cash: ${money(totalPetty)}
Outstanding: ${money(outstanding)}`
  );

};


// ======================================================
// SHARE VEHICLE
// ======================================================

window.shareVehicle = function(id) {

  const v =
    vehicles.find(
      x => x.id === id
    );

  if (!v) return;


  const total =
    expenses
      .filter(e => e.vehicle_id === id)
      .reduce(
        (s,e) => s + num(e.amount),
        0
      );


  doShare(
    `Vehicle ${v.reg}`,
    `Vehicle: ${v.reg}
Customer: ${v.customer}
Status: ${v.status}
Charge-out: ${money(v.billed)}
Paid: ${money(v.paid)}
Outstanding: ${money(
      Math.max(
        0,
        num(v.billed)-num(v.paid)
      )
    )}
Vehicle expenses: ${money(total)}`
  );

};


// ======================================================
// QUICK PRINT
// ======================================================

$("quickPrint")?.addEventListener(
  "click",
  () => printSummary()
);


// ======================================================
// INITIAL LOAD
// ======================================================

if (
  localStorage.getItem("garage_logged_user") &&
  USERS[localStorage.getItem("garage_logged_user")]
) {

  load();

}
