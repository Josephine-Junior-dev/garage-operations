import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ======================================================
// SUPABASE
// ======================================================
const SUPABASE_URL = "https://ptluwoeogfkqavhspdjj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ======================================================
// HELPERS
// ======================================================
const $ = id => document.getElementById(id);

const money = n =>
  "KSh " +
  Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

function today() {
  const d = new Date();
  const local = new Date(
    d.getTime() - d.getTimezoneOffset() * 60000
  );
  return local.toISOString().slice(0, 10);
}

const esc = s =>
  String(s ?? "").replace(
    /[&<>"']/g,
    c =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[c])
  );

const num = value => Number(value || 0);

const DEMO_USERS = {
  Josephine: "1234",
  Boss: "1234",
  Staff: "1234"
};

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];

// ======================================================
// LOGIN
// ======================================================
function start() {
  if ($("loginMsg")) {
    $("loginMsg").textContent =
      "Login: Josephine, Boss or Staff — password 1234.";
  }
}

if ($("loginForm")) {
  $("loginForm").onsubmit = async e => {
    e.preventDefault();

    const username =
      $("username")?.value.trim() || "";

    const password =
      $("password")?.value || "";

    if (DEMO_USERS[username] !== password) {
      if ($("loginMsg")) {
        $("loginMsg").textContent =
          "Incorrect username or password.";
      }
      return;
    }

    $("login")?.classList.add("hidden");
    $("app")?.classList.remove("hidden");

    await load();
  };
}

if ($("logout")) {
  $("logout").onclick = () => {
    $("app")?.classList.add("hidden");
    $("login")?.classList.remove("hidden");
  };
}

// ======================================================
// TABS
// ======================================================
document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () =>
    showTab(btn.dataset.tab);
});

function showTab(id) {
  document
    .querySelectorAll(".tab")
    .forEach(x =>
      x.classList.toggle(
        "active",
        x.dataset.tab === id
      )
    );

  document
    .querySelectorAll(".tabpage")
    .forEach(x =>
      x.classList.toggle(
        "active",
        x.id === id
      )
    );
}

function openTab(id) {
  showTab(id);
}

// ======================================================
// LOAD DATABASE
// ======================================================
async function load() {
  try {
    const [v, e, p, r] =
      await Promise.all([
        sb
          .from("vehicles")
          .select("*")
          .order("created_at", {
            ascending: false
          }),

        sb
          .from("expenses")
          .select("*")
          .order("expense_date", {
            ascending: false
          }),

        sb
          .from("petty_cash")
          .select("*")
          .order("cash_date", {
            ascending: false
          }),

        sb
          .from("requisitions")
          .select("*")
          .order("req_date", {
            ascending: false
          })
      ]);

    const err =
      v.error ||
      e.error ||
      p.error ||
      r.error;

    if (err) {
      toast(
        "Database error: " +
        err.message
      );
      return;
    }

    vehicles = v.data || [];
    expenses = e.data || [];
    pettyCash = p.data || [];
    requisitions = r.data || [];

    renderAll();

  } catch (error) {
    toast(
      "Unable to load database: " +
      error.message
    );
  }
}

// ======================================================
// RENDER EVERYTHING
// ======================================================
function renderAll() {
  renderDashboard();
  renderVehicles();
  renderPetty();
  renderReqs();
  fillVehicleSelectors();
}

// ======================================================
// DASHBOARD
// ======================================================
function renderDashboard() {
  const vehicleTotal =
    expenses.reduce(
      (a, e) =>
        a + num(e.amount),
      0
    );

  const pettyTotal =
    pettyCash.reduce(
      (a, e) =>
        a + num(e.amount),
      0
    );

  const billed =
    vehicles.reduce(
      (a, v) =>
        a + num(v.billed),
      0
    );

  const paid =
    vehicles.reduce(
      (a, v) =>
        a + num(v.paid),
      0
    );

  if ($("nVehicles"))
    $("nVehicles").textContent =
      vehicles.length;

  if ($("nRepair"))
    $("nRepair").textContent =
      vehicles.filter(
        v =>
          v.status ===
          "Under Repair"
      ).length;

  if ($("nStorage"))
    $("nStorage").textContent =
      vehicles.filter(
        v =>
          v.status ===
          "Storage"
      ).length;

  if ($("nExpenses"))
    $("nExpenses").textContent =
      money(vehicleTotal);

  if ($("nPetty"))
    $("nPetty").textContent =
      money(pettyTotal);

  if ($("nOutstanding"))
    $("nOutstanding").textContent =
      money(
        Math.max(
          0,
          billed - paid
        )
      );
}

// ======================================================
// VEHICLES
// ======================================================
function renderVehicles() {
  if (!$("list")) return;

  const q =
    ($("search")?.value || "")
      .toLowerCase();

  const filter =
    $("filter")?.value || "";

  const rows =
    vehicles.filter(v => {
      const matchesSearch =
        !q ||
        String(
          v.registration || ""
        )
          .toLowerCase()
          .includes(q) ||
        String(
          v.customer || ""
        )
          .toLowerCase()
          .includes(q);

      const matchesFilter =
        !filter ||
        v.status === filter;

      return (
        matchesSearch &&
        matchesFilter
      );
    });

  $("list").innerHTML =
    rows.length
      ? rows.map(card).join("")
      : `
        <p class="muted">
          No vehicles found.
          Use <b>+ Add Vehicle</b>
          to add one.
        </p>
      `;
}

function expenseTotalForVehicle(
  vehicleId
) {
  return expenses
    .filter(
      e =>
        String(e.vehicle_id) ===
        String(vehicleId)
    )
    .reduce(
      (a, e) =>
        a + num(e.amount),
      0
    );
}

function categoryTotalForVehicle(
  vehicleId,
  category
) {
  return expenses
    .filter(
      e =>
        String(e.vehicle_id) ===
          String(vehicleId) &&
        String(
          e.category || ""
        ).toLowerCase() ===
          category.toLowerCase()
    )
    .reduce(
      (a, e) =>
        a + num(e.amount),
      0
    );
}

function card(v) {
  const es =
    expenses.filter(
      e =>
        String(e.vehicle_id) ===
        String(v.id)
    );

  const total =
    es.reduce(
      (a, e) =>
        a + num(e.amount),
      0
    );

  const parts =
    categoryTotalForVehicle(
      v.id,
      "Parts"
    );

  const materials =
    categoryTotalForVehicle(
      v.id,
      "Materials"
    );

  const labour =
    categoryTotalForVehicle(
      v.id,
      "Labour"
    );

  const balance =
    Math.max(
      0,
      num(v.billed) -
      num(v.paid)
    );

  const expenseRows =
    es
      .map(
        e => `
          <tr>
            <td>${esc(
              e.expense_date
            )}</td>

            <td>${esc(
              e.description
            )}</td>

            <td>${esc(
              e.category || ""
            )}</td>

            <td class="num">
              ${money(e.amount)}
            </td>
          </tr>
        `
      )
      .join("");

  return `
    <article class="vehicle">

      <div class="vehicle-top">

        <div>
          <h3>
            ${esc(v.registration)}
          </h3>

          <span class="muted">
            ${esc(v.customer)}
            • ${esc(v.date_in)}
            • ${esc(v.job_type)}
          </span>
        </div>

        <span class="badge">
          ${esc(v.status)}
        </span>

      </div>

      <p class="muted">
        ${esc(
          v.description ||
          "No description"
        )}
      </p>

      ${
        v.status === "Storage" ||
        v.status === "Released"
          ? `
            <div class="storage-summary">

              <b>
                Storage / Release Details
              </b>

              <div>
                Date received:
                ${esc(
                  v.date_in || ""
                )}
              </div>

              <div>
                Date out:
                ${esc(
                  v.date_out ||
                  "Still in storage"
                )}
              </div>

              <div>
                Released to:
                ${esc(
                  v.released_to ||
                  "Not yet released"
                )}
              </div>

              <div>
                Contact:
                ${esc(
                  v.released_contact ||
                  "Not provided"
                )}
              </div>

            </div>
          `
          : ""
      }

      <div class="grid">

        <div>
          <small>
            Total Expenses
          </small>
          <b>
            ${money(total)}
          </b>
        </div>

        <div>
          <small>
            Parts
          </small>
          <b>
            ${money(parts)}
          </b>
        </div>

        <div>
          <small>
            Materials
          </small>
          <b>
            ${money(materials)}
          </b>
        </div>

        <div>
          <small>
            Labour
          </small>
          <b>
            ${money(labour)}
          </b>
        </div>

        <div>
          <small>
            Charge-out
          </small>
          <b>
            ${money(v.billed)}
          </b>
        </div>

        <div>
          <small>
            Balance
          </small>
          <b>
            ${money(balance)}
          </b>
        </div>

      </div>

      <details
        class="expense-details"
        ${es.length ? "" : "open"}
      >

        <summary>
          Vehicle expenses
          (${es.length})
          — ${money(total)}
        </summary>

        ${
          es.length
            ? `
              <div class="tablewrap">

                <table>

                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Type</th>
                      <th>Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    ${expenseRows}
                  </tbody>

                </table>

              </div>
            `
            : `
              <p class="muted">
                No expenses recorded
                for this vehicle.
              </p>
            `
        }

      </details>

      <div class="actions">

        <button
          onclick="expense('${v.id}')"
        >
          + Add Expense
        </button>

        <button
          class="secondary"
          onclick="edit('${v.id}')"
        >
          Edit
        </button>

        <button
          class="secondary"
          onclick="printVehicle('${v.id}')"
        >
          Print Vehicle
        </button>

        <button
          class="secondary"
          onclick="shareVehicle('${v.id}')"
        >
          Share
        </button>

        <button
          class="secondary danger"
          onclick="removeVehicle('${v.id}')"
        >
          Delete
        </button>

      </div>

    </article>
  `;
}

if ($("search"))
  $("search").oninput =
    renderVehicles;

if ($("filter"))
  $("filter").onchange =
    renderVehicles;

// ======================================================
// QUICK BUTTONS
// ======================================================
if ($("addVehicle"))
  $("addVehicle").onclick =
    () => openVehicle();

if ($("quickVehicle"))
  $("quickVehicle").onclick =
    () => {
      openTab("vehicles");
      openVehicle();
    };

if ($("quickExpense"))
  $("quickExpense").onclick =
    () => openExpense();

if ($("quickPetty"))
  $("quickPetty").onclick =
    () => openPetty();

if ($("quickReq"))
  $("quickReq").onclick =
    () => openReq();

if ($("quickPrint"))
  $("quickPrint").onclick =
    () => printSummary();

// ======================================================
// CLOSE MODALS
// ======================================================
document
  .querySelectorAll("[data-close]")
  .forEach(button => {
    button.onclick = () => {
      const target =
        $(button.dataset.close);

      if (target)
        target.classList.add(
          "hidden"
        );
    };
  });

// ======================================================
// STORAGE / RELEASE
// ======================================================
function updateStorageFields() {
  if (
    !$("status") ||
    !$("storageFields")
  )
    return;

  const show =
    $("status").value ===
      "Storage" ||
    $("status").value ===
      "Released";

  $("storageFields")
    .classList.toggle(
      "hidden",
      !show
    );
}

if ($("status"))
  $("status").onchange =
    updateStorageFields;

// ======================================================
// OPEN VEHICLE
// ======================================================
function openVehicle(v = null) {
  if (!$("vehicleModal"))
    return;

  if ($("vTitle"))
    $("vTitle").textContent =
      v
        ? "Edit Vehicle"
        : "Add Vehicle";

  if ($("vid"))
    $("vid").value =
      v?.id || "";

  if ($("reg"))
    $("reg").value =
      v?.registration || "";

  if ($("customer"))
    $("customer").value =
      v?.customer || "";

  if ($("date_in"))
    $("date_in").value =
      v?.date_in || today();

  if ($("job_type"))
    $("job_type").value =
      v?.job_type || "Repair";

  if ($("status"))
    $("status").value =
      v?.status ||
      "Under Repair";

  if ($("date_out"))
    $("date_out").value =
      v?.date_out || "";

  if ($("released_to"))
    $("released_to").value =
      v?.released_to || "";

  if ($("released_contact"))
    $("released_contact").value =
      v?.released_contact || "";

  if ($("description"))
    $("description").value =
      v?.description || "";

  if ($("billed"))
    $("billed").value =
      v?.billed || 0;

  if ($("paid"))
    $("paid").value =
      v?.paid || 0;

  updateStorageFields();

  $("vehicleModal")
    .classList.remove(
      "hidden"
    );
}

// ======================================================
// SAVE VEHICLE
// ======================================================
if ($("vehicleForm")) {
  $("vehicleForm").onsubmit =
    async e => {
      e.preventDefault();

      const id =
        $("vid")?.value || "";

      const registration =
        $("reg")?.value
          .trim()
          .toUpperCase() || "";

      const customer =
        $("customer")?.value
          .trim() || "";

      if (!registration) {
        toast(
          "Enter vehicle registration."
        );
        return;
      }

      if (!customer) {
        toast(
          "Enter customer name."
        );
        return;
      }

      const data = {
        registration,

        customer,

        date_in:
          $("date_in")?.value ||
          today(),

        job_type:
          $("job_type")?.value ||
          "Repair",

        status:
          $("status")?.value ||
          "Under Repair",

        date_out:
          $("date_out")?.value ||
          null,

        released_to:
          $("released_to")?.value
            .trim() || "",

        released_contact:
          $("released_contact")?.value
            .trim() || "",

        description:
          $("description")?.value
            .trim() || "",

        billed:
          num(
            $("billed")?.value
          ),

        paid:
          num(
            $("paid")?.value
          )
      };

      const result = id
        ? await sb
            .from("vehicles")
            .update(data)
            .eq("id", id)
        : await sb
            .from("vehicles")
            .insert(data);

      if (result.error) {
        toast(
          result.error.message
        );
        return;
      }

      $("vehicleModal")
        ?.classList.add(
          "hidden"
        );

      await load();

      openTab("vehicles");

      toast(
        id
          ? "Vehicle updated successfully."
          : "Vehicle added successfully."
      );
    };
}

// ======================================================
// EDIT VEHICLE
// ======================================================
window.edit = id => {
  const vehicle =
    vehicles.find(
      v =>
        String(v.id) ===
        String(id)
    );

  if (vehicle)
    openVehicle(vehicle);
};

// ======================================================
// DELETE VEHICLE
// ======================================================
window.removeVehicle =
  async id => {
    if (
      !confirm(
        "Delete this vehicle and its expenses/requisitions?"
      )
    )
      return;

    const expenseDelete =
      await sb
        .from("expenses")
        .delete()
        .eq(
          "vehicle_id",
          id
        );

    if (expenseDelete.error) {
      toast(
        "Could not delete vehicle expenses: " +
        expenseDelete.error.message
      );
      return;
    }

    const reqDelete =
      await sb
        .from("requisitions")
        .delete()
        .eq(
          "vehicle_id",
          id
        );

    if (reqDelete.error) {
      toast(
        "Could not delete vehicle requisitions: " +
        reqDelete.error.message
      );
      return;
    }

    const vehicleDelete =
      await sb
        .from("vehicles")
        .delete()
        .eq(
          "id",
          id
        );

    if (vehicleDelete.error) {
      toast(
        "Could not delete vehicle: " +
        vehicleDelete.error.message
      );
      return;
    }

    await load();

    toast(
      "Vehicle deleted."
    );
  };

// ======================================================
// VEHICLE SELECTORS
// ======================================================
function fillVehicleSelectors() {
  const options =
    vehicles
      .map(
        v => `
          <option value="${esc(v.id)}">
            ${esc(v.registration)}
            — ${esc(v.customer)}
          </option>
        `
      )
      .join("");

  if ($("evidSelect")) {
    $("evidSelect").innerHTML =
      `<option value="">
        Select vehicle
      </option>` +
      options;
  }

  if ($("reqvehicle")) {
    $("reqvehicle").innerHTML =
      `<option value="">
        General / No vehicle
      </option>` +
      options;
  }
}

// ======================================================
// EXPENSE CATEGORY
// ======================================================
function ensureExpenseCategory() {
  if ($("ecat"))
    return;

  if (!$("expenseForm"))
    return;

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.innerHTML = `
    <label for="ecat">
      Expense Type
    </label>

    <select id="ecat">
      <option value="Parts">
        Parts
      </option>

      <option value="Materials">
        Materials
      </option>

      <option value="Labour">
        Labour
      </option>
    </select>
  `;

  const amount =
    $("eamount")
      ?.parentElement;

  if (amount) {
    amount.parentElement
      .insertBefore(
        wrapper,
        amount
      );
  } else {
    $("expenseForm")
      .appendChild(
        wrapper
      );
  }
}

ensureExpenseCategory();

// ======================================================
// OPEN EXPENSE
// ======================================================
function openExpense(
  vehicleId = ""
) {
  ensureExpenseCategory();
  fillVehicleSelectors();

  if ($("evidSelect"))
    $("evidSelect").value =
      vehicleId || "";

  if ($("evid"))
    $("evid").value =
      vehicleId || "";

  if ($("edate"))
    $("edate").value =
      today();

  if ($("edesc"))
    $("edesc").value = "";

  if ($("eamount"))
    $("eamount").value = "";

  if ($("ecat"))
    $("ecat").value =
      "Parts";

  $("expenseModal")
    ?.classList.remove(
      "hidden"
    );
}

window.expense =
  id =>
    openExpense(id);

if ($("evidSelect")) {
  $("evidSelect").onchange =
    () => {
      if ($("evid"))
        $("evid").value =
          $("evidSelect")
            .value;
    };
}

// ======================================================
// SAVE EXPENSE
// ======================================================
if ($("expenseForm")) {
  $("expenseForm").onsubmit =
    async e => {
      e.preventDefault();

      const vehicleId =
        $("evidSelect")?.value ||
        "";

      if (!vehicleId) {
        toast(
          "Please select the vehicle."
        );
        return;
      }

      const description =
        $("edesc")?.value
          .trim() || "";

      const amount =
        num(
          $("eamount")?.value
        );

      const category =
        $("ecat")?.value ||
        "Parts";

      if (!description) {
        toast(
          "Enter expense description."
        );
        return;
      }

      if (amount <= 0) {
        toast(
          "Enter a valid expense amount."
        );
        return;
      }

      const data = {
        vehicle_id:
          vehicleId,

        expense_date:
          $("edate")?.value ||
          today(),

        description,

        category,

        amount
      };

      const result =
        await sb
          .from("expenses")
          .insert(data);

      if (result.error) {
        toast(
          "Expense could not be saved: " +
          result.error.message
        );
        return;
      }

      $("expenseModal")
        ?.classList.add(
          "hidden"
        );

      await load();

      openTab("vehicles");

      toast(
        `${category} expense saved successfully.`
      );
    };
}

// ======================================================
// PETTY CASH
// ======================================================
function renderPetty() {
  if (!$("pettyList"))
    return;

  const total =
    pettyCash.reduce(
      (a, p) =>
        a + num(p.amount),
      0
    );

  $("pettyList").innerHTML =
    pettyCash.length
      ? `
        <div class="summaryline">

          <b>
            Total petty cash:
            ${money(total)}
          </b>

          <button
            class="secondary"
            onclick="printPetty()"
          >
            Print
          </button>

        </div>

        <div class="tablewrap">

          <table>

            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Paid to/by</th>
                <th>Category</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              ${pettyCash
                .map(
                  p => `
                    <tr>

                      <td>
                        ${esc(
                          p.cash_date
                        )}
                      </td>

                      <td>
                        ${esc(
                          p.description
                        )}
                      </td>

                      <td>
                        ${esc(
                          p.paid_to ||
                          ""
                        )}
                      </td>

                      <td>
                        ${esc(
                          p.category ||
                          ""
                        )}
                      </td>

                      <td class="num">
                        ${money(
                          p.amount
                        )}
                      </td>

                      <td>

                        <button
                          class="small secondary"
                          onclick="deletePetty('${p.id}')"
                        >
                          Delete
                        </button>

                      </td>

                    </tr>
                  `
                )
                .join("")}

            </tbody>

          </table>

        </div>
      `
      : `
        <p class="muted">
          No petty cash entries yet.
        </p>
      `;
}

if ($("addPetty"))
  $("addPetty").onclick =
    () => openPetty();

function openPetty() {
  if ($("pcid"))
    $("pcid").value = "";

  if ($("pcdate"))
    $("pcdate").value =
      today();

  if ($("pcamount"))
    $("pcamount").value = "";

  if ($("pcdesc"))
    $("pcdesc").value = "";

  if ($("pcperson"))
    $("pcperson").value = "";

  if ($("pcnotes"))
    $("pcnotes").value = "";

  $("pettyModal")
    ?.classList.remove(
      "hidden"
    );
}

if ($("pettyForm")) {
  $("pettyForm").onsubmit =
    async e => {
      e.preventDefault();

      const result =
        await sb
          .from("petty_cash")
          .insert({
            cash_date:
              $("pcdate")?.value ||
              today(),

            description:
              $("pcdesc")?.value
                .trim() || "",

            paid_to:
              $("pcperson")?.value
                .trim() || "",

            category:
              $("pccat")?.value ||
              "",

            amount:
              num(
                $("pcamount")?.value
              ),

            notes:
              $("pcnotes")?.value
                .trim() || ""
          });

      if (result.error) {
        toast(
          result.error.message
        );
        return;
      }

      $("pettyModal")
        ?.classList.add(
          "hidden"
        );

      await load();

      toast(
        "Petty cash saved."
      );
    };
}

window.deletePetty =
  async id => {
    if (
      !confirm(
        "Delete this petty cash entry?"
      )
    )
      return;

    const result =
      await sb
        .from("petty_cash")
        .delete()
        .eq(
          "id",
          id
        );

    if (result.error) {
      toast(
        result.error.message
      );
      return;
    }

    await load();

    toast(
      "Petty cash deleted."
    );
  };

// ======================================================
// REQUISITION TYPE
// ======================================================
function ensureReqCategory() {
  if (
    $("reqcat") ||
    $("reqtype") ||
    $("reqcategory")
  )
    return;

  if (!$("reqForm"))
    return;

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.innerHTML = `
    <label for="reqcat">
      Type
    </label>

    <select id="reqcat">

      <option value="Parts">
        Parts
      </option>

      <option value="Materials">
        Materials
      </option>

      <option value="Labour">
        Labour
      </option>

    </select>
  `;

  const item =
    $("reqitem")
      ?.parentElement;

  if (
    item &&
    item.parentElement
  ) {
    item.parentElement
      .insertBefore(
        wrapper,
        item
      );
  } else {
    $("reqForm")
      .appendChild(
        wrapper
      );
  }
}

function reqCategoryField() {
  return (
    $("reqcat") ||
    $("reqtype") ||
    $("reqcategory")
  );
}

// ======================================================
// GET REQUISITION TYPE
// ======================================================
function getReqCategory(r) {
  const direct =
    r?.expense_type ||
    r?.category ||
    r?.type ||
    r?.req_type ||
    r?.item_type;

  if (
    direct === "Parts" ||
    direct === "Materials" ||
    direct === "Labour"
  ) {
    return direct;
  }

  const notes =
    String(
      r?.notes || ""
    );

  const match =
    notes.match(
      /^\[Type:\s*(Parts|Materials|Labour)\]\s*/i
    );

  if (match)
    return match[1];

  return "Materials";
}

// ======================================================
// CLEAN REQUISITION NOTES
// ======================================================
function cleanReqNotes(r) {
  return String(
    r?.notes || ""
  )
    .replace(
      /^\[Type:\s*(Parts|Materials|Labour)\]\s*/i,
      ""
    )
    .trim();
}

ensureReqCategory();

// ======================================================
// REQUISITIONS
// ======================================================
function renderReqs() {
  if (!$("reqList"))
    return;

  $("reqList").innerHTML =
    requisitions.length
      ? `
        <div class="tablewrap">

          <table>

            <thead>

              <tr>
                <th>No.</th>
                <th>Date</th>
                <th>Requested by</th>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>

            </thead>

            <tbody>

              ${requisitions
                .map(r => {

                  const v =
                    vehicles.find(
                      x =>
                        String(
                          x.id
                        ) ===
                        String(
                          r.vehicle_id
                        )
                    );

                  const category =
                    getReqCategory(r);

                  return `
                    <tr>

                      <td>
                        ${esc(
                          r.req_no
                        )}
                      </td>

                      <td>
                        ${esc(
                          r.req_date
                        )}
                      </td>

                      <td>
                        ${esc(
                          r.requested_by
                        )}
                      </td>

                      <td>
                        ${esc(
                          v?.registration ||
                          "General"
                        )}
                      </td>

                      <td>
                        ${esc(
                          category
                        )}
                      </td>

                      <td>
                        ${esc(
                          r.item_description
                        )}
                      </td>

                      <td>
                        ${esc(
                          r.quantity
                        )}
                      </td>

                      <td class="num">
                        ${money(
                          r.total_amount
                        )}
                      </td>

                      <td>
                        <span class="badge">
                          ${esc(
                            r.status
                          )}
                        </span>
                      </td>

                      <td class="actions-inline">

                        <button
                          class="small secondary"
                          onclick="printReq('${r.id}')"
                        >
                          Print
                        </button>

                        <button
                          class="small secondary"
                          onclick="shareReq('${r.id}')"
                        >
                          Share
                        </button>

                        <button
                          class="small danger"
                          onclick="deleteReq('${r.id}')"
                        >
                          Delete
                        </button>

                      </td>

                    </tr>
                  `;
                })
                .join("")}

            </tbody>

          </table>

        </div>
      `
      : `
        <p class="muted">
          No requisitions yet.
        </p>
      `;
}

if ($("addReq"))
  $("addReq").onclick =
    () => openReq();

// ======================================================
// REQUISITION NUMBER
// ======================================================
function nextReqNumber() {
  let highest = 0;

  requisitions.forEach(r => {

    const match =
      String(
        r.req_no || ""
      ).match(
        /(\d+)$/
      );

    if (match) {
      highest =
        Math.max(
          highest,
          Number(
            match[1]
          )
        );
    }
  });

  return (
    "REQ-" +
    String(
      highest + 1
    ).padStart(
      3,
      "0"
    )
  );
}

// ======================================================
// OPEN REQUISITION
// ======================================================
function openReq() {
  ensureReqCategory();
  fillVehicleSelectors();

  if ($("reqid"))
    $("reqid").value = "";

  if ($("reqno"))
    $("reqno").value =
      nextReqNumber();

  if ($("reqdate"))
    $("reqdate").value =
      today();

  if ($("reqby"))
    $("reqby").value =
      $("username")?.value ||
      "Josephine";

  if ($("reqvehicle"))
    $("reqvehicle").value =
      "";

  if ($("reqstatus"))
    $("reqstatus").value =
      "Pending";

  if ($("reqitem"))
    $("reqitem").value =
      "";

  if ($("reqqty"))
    $("reqqty").value =
      1;

  if ($("requnit"))
    $("requnit").value =
      0;

  if ($("reqtotal"))
    $("reqtotal").value =
      "0.00";

  if ($("reqnotes"))
    $("reqnotes").value =
      "";

  const category =
    reqCategoryField();

  if (category)
    category.value =
      "Materials";

  $("reqModal")
    ?.classList.remove(
      "hidden"
    );
}

// ======================================================
// REQUISITION TOTAL
// ======================================================
function updateReqTotal() {
  const qty =
    num(
      $("reqqty")?.value
    );

  const unit =
    num(
      $("requnit")?.value
    );

  if ($("reqtotal"))
    $("reqtotal").value =
      (
        qty * unit
      ).toFixed(2);
}

if ($("reqqty"))
  $("reqqty").oninput =
    updateReqTotal;

if ($("requnit"))
  $("requnit").oninput =
    updateReqTotal;

// ======================================================
// SAVE REQUISITION
// ======================================================
if ($("reqForm")) {

  $("reqForm").onsubmit =
    async e => {

      e.preventDefault();

      ensureReqCategory();

      const expenseType =
        reqCategoryField()
          ?.value ||
        "Materials";

      const notes =
        $("reqnotes")
          ?.value
          .trim() || "";

      const item =
        $("reqitem")
          ?.value
          .trim() || "";

      const quantity =
        num(
          $("reqqty")
            ?.value
        );

      const unitCost =
        num(
          $("requnit")
            ?.value
        );

      const total =
        quantity *
        unitCost;

      if (!item) {
        toast(
          "Enter the requisition item or description."
        );
        return;
      }

      if (quantity <= 0) {
        toast(
          "Enter a valid quantity."
        );
        return;
      }

      if (unitCost < 0) {
        toast(
          "Enter a valid unit cost."
        );
        return;
      }

      const data = {

        req_no:
          $("reqno")
            ?.value
            .trim() ||
          nextReqNumber(),

        req_date:
          $("reqdate")
            ?.value ||
          today(),

        requested_by:
          $("reqby")
            ?.value
            .trim() ||
          "Josephine",

        vehicle_id:
          $("reqvehicle")
            ?.value ||
          null,

        item_description:
          item,

        expense_type:
          expenseType,

        quantity,

        unit_cost:
          unitCost,

        total_amount:
          total,

        status:
          $("reqstatus")
            ?.value ||
          "Pending",

        notes
      };

      const result =
        await sb
          .from("requisitions")
          .insert(data);

      if (result.error) {
        toast(
          "Requisition could not be saved: " +
          result.error.message
        );
        return;
      }

      $("reqModal")
        ?.classList.add(
          "hidden"
        );

      await load();

      toast(
        `${expenseType} requisition saved successfully.`
      );
    };
}

// ======================================================
// DELETE REQUISITION
// ======================================================
window.deleteReq =
  async id => {

    if (
      !confirm(
        "Delete this requisition?"
      )
    )
      return;

    const result =
      await sb
        .from("requisitions")
        .delete()
        .eq(
          "id",
          id
        );

    if (result.error) {
      toast(
        result.error.message
      );
      return;
    }

    await load();

    toast(
      "Requisition deleted."
    );
  };

// ======================================================
// PRINT
// ======================================================
function printPage(
  title,
  html
) {

  const w =
    window.open(
      "",
      "_blank",
      "width=900,height=700"
    );

  if (!w) {
    toast(
      "Allow pop-ups/printing for this site."
    );
    return;
  }

  w.document.write(`
    <!doctype html>

    <html>

    <head>

      <title>
        ${esc(title)}
      </title>

      <style>

        body {
          font-family: Arial, sans-serif;
          padding: 30px;
          color: #111;
        }

        h1 {
          margin-bottom: 4px;
        }

        h2 {
          margin-top: 4px;
        }

        p {
          margin: 5px 0;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 18px;
        }

        th,
        td {
          border: 1px solid #aaa;
          padding: 8px;
          text-align: left;
        }

        th {
          background: #eee;
        }

        .num {
          text-align: right;
        }

        .total {
          font-size: 18px;
          font-weight: bold;
          margin-top: 18px;
        }

        @media print {

          body {
            padding: 10px;
          }

        }

      </style>

    </head>

    <body>

      <h1>
        Garage Operations
      </h1>

      <h2>
        ${esc(title)}
      </h2>

      ${html}

      <script>
        window.onload = () =>
          window.print();
      <\/script>

    </body>

    </html>
  `);

  w.document.close();
}

// ======================================================
// VEHICLE PRINT ROWS
// ======================================================
function vehicleRows() {

  return vehicles
    .map(v => {

      const es =
        expenses.filter(
          e =>
            String(
              e.vehicle_id
            ) ===
            String(
              v.id
            )
        );

      const cost =
        es.reduce(
          (a, e) =>
            a + num(
              e.amount
            ),
          0
        );

      return `
        <tr>

          <td>
            ${esc(
              v.registration
            )}
          </td>

          <td>
            ${esc(
              v.customer
            )}
          </td>

          <td>
            ${esc(
              v.status
            )}
          </td>

          <td>
            ${esc(
              v.date_in
            )}
          </td>

          <td>
            ${esc(
              v.date_out ||
              ""
            )}
          </td>

          <td>
            ${esc(
              v.released_to ||
              ""
            )}
          </td>

          <td>
            ${esc(
              v.released_contact ||
              ""
            )}
          </td>

          <td class="num">
            ${money(cost)}
          </td>

          <td class="num">
            ${money(
              v.billed
            )}
          </td>

          <td class="num">
            ${money(
              v.paid
            )}
          </td>

        </tr>
      `;
    })
    .join("");
}

// ======================================================
// PRINT SUMMARY
// ======================================================
window.printSummary =
  () => {

    const expenseTotal =
      expenses.reduce(
        (a, e) =>
          a + num(
            e.amount
          ),
        0
      );

    const pettyTotal =
      pettyCash.reduce(
        (a, e) =>
          a + num(
            e.amount
          ),
        0
      );

    const billed =
      vehicles.reduce(
        (a, v) =>
          a + num(
            v.billed
          ),
        0
      );

    const paid =
      vehicles.reduce(
        (a, v) =>
          a + num(
            v.paid
          ),
        0
      );

    printPage(
      "Garage Summary",
      `
        <p>
          <b>Vehicles:</b>
          ${vehicles.length}
        </p>

        <p>
          <b>Vehicle Expenses:</b>
          ${money(
            expenseTotal
          )}
        </p>

        <p>
          <b>Petty Cash:</b>
          ${money(
            pettyTotal
          )}
        </p>

        <p>
          <b>Outstanding:</b>
          ${money(
            Math.max(
              0,
              billed - paid
            )
          )}
        </p>
      `
    );
  };

// ======================================================
// PRINT VEHICLES
// ======================================================
window.printVehicles =
  () => {

    printPage(
      "Vehicle List",
      `
        <table>

          <thead>

            <tr>
              <th>Registration</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Date received</th>
              <th>Date out</th>
              <th>Released to</th>
              <th>Contact</th>
              <th>Expenses</th>
              <th>Charge-out</th>
              <th>Paid</th>
            </tr>

          </thead>

          <tbody>
            ${vehicleRows()}
          </tbody>

        </table>
      `
    );
  };

// ======================================================
// PRINT ALL EXPENSES
// ======================================================
window.printExpenses =
  () => {

    printPage(
      "All Vehicle Expenses",
      `
        <table>

          <thead>

            <tr>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Description</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>

          </thead>

          <tbody>

            ${expenses
              .map(e => {

                const v =
                  vehicles.find(
                    x =>
                      String(
                        x.id
                      ) ===
                      String(
                        e.vehicle_id
                      )
                  );

                return `
                  <tr>

                    <td>
                      ${esc(
                        e.expense_date
                      )}
                    </td>

                    <td>
                      ${esc(
                        v?.registration ||
                        "Unknown"
                      )}
                    </td>

                    <td>
                      ${esc(
                        e.description
                      )}
                    </td>

                    <td>
                      ${esc(
                        e.category ||
                        ""
                      )}
                    </td>

                    <td class="num">
                      ${money(
                        e.amount
                      )}
                    </td>

                  </tr>
                `;
              })
              .join("")}

          </tbody>

        </table>
      `
    );
  };

// ======================================================
// PRINT PETTY CASH
// ======================================================
window.printPetty =
  () => {

    printPage(
      "Petty Cash",
      `
        <table>

          <thead>

            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Paid to/by</th>
              <th>Category</th>
              <th>Amount</th>
            </tr>

          </thead>

          <tbody>

            ${pettyCash
              .map(
                p => `
                  <tr>

                    <td>
                      ${esc(
                        p.cash_date
                      )}
                    </td>

                    <td>
                      ${esc(
                        p.description
                      )}
                    </td>

                    <td>
                      ${esc(
                        p.paid_to ||
                        ""
                      )}
                    </td>

                    <td>
                      ${esc(
                        p.category ||
                        ""
                      )}
                    </td>

                    <td class="num">
                      ${money(
                        p.amount
                      )}
                    </td>

                  </tr>
                `
              )
              .join("")}

          </tbody>

        </table>
      `
    );
  };

// ======================================================
// PRINT REQUISITIONS
// ======================================================
window.printRequisitions =
  () => {

    printPage(
      "Requisitions",
      `
        <table>

          <thead>

            <tr>
              <th>No.</th>
              <th>Date</th>
              <th>Requested by</th>
              <th>Vehicle</th>
              <th>Type</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Status</th>
            </tr>

          </thead>

          <tbody>

            ${requisitions
              .map(r => {

                const v =
                  vehicles.find(
                    x =>
                      String(
                        x.id
                      ) ===
                      String(
                        r.vehicle_id
                      )
                  );

                return `
                  <tr>

                    <td>
                      ${esc(
                        r.req_no
                      )}
                    </td>

                    <td>
                      ${esc(
                        r.req_date
                      )}
                    </td>

                    <td>
                      ${esc(
                        r.requested_by
                      )}
                    </td>

                    <td>
                      ${esc(
                        v?.registration ||
                        "General"
                      )}
                    </td>

                    <td>
                      ${esc(
                        getReqCategory(
                          r
                        )
                      )}
                    </td>

                    <td>
                      ${esc(
                        r.item_description
                      )}
                    </td>

                    <td>
                      ${esc(
                        r.quantity
                      )}
                    </td>

                    <td class="num">
                      ${money(
                        r.total_amount
                      )}
                    </td>

                    <td>
                      ${esc(
                        r.status
                      )}
                    </td>

                  </tr>
                `;
              })
              .join("")}

          </tbody>

        </table>
      `
    );
  };

// ======================================================
// PRINT ONE VEHICLE
// ======================================================
window.printVehicle =
  id => {

    const v =
      vehicles.find(
        x =>
          String(
            x.id
          ) ===
          String(
            id
          )
      );

    if (!v) return;

    const es =
      expenses.filter(
        e =>
          String(
            e.vehicle_id
          ) ===
          String(
            id
          )
      );

    const parts =
      categoryTotalForVehicle(
        id,
        "Parts"
      );

    const materials =
      categoryTotalForVehicle(
        id,
        "Materials"
      );

    const labour =
      categoryTotalForVehicle(
        id,
        "Labour"
      );

    const total =
      es.reduce(
        (a, e) =>
          a + num(
            e.amount
          ),
        0
      );

    printPage(
      `Vehicle ${v.registration}`,
      `
        <p>
          <b>Customer:</b>
          ${esc(
            v.customer
          )}
        </p>

        <p>
          <b>Status:</b>
          ${esc(
            v.status
          )}
        </p>

        <p>
          <b>Date received:</b>
          ${esc(
            v.date_in ||
            ""
          )}
        </p>

        ${
          v.status ===
            "Storage" ||
          v.status ===
            "Released"
            ? `
              <p>
                <b>Date out:</b>
                ${esc(
                  v.date_out ||
                  "Still in storage"
                )}
              </p>

              <p>
                <b>Released to:</b>
                ${esc(
                  v.released_to ||
                  "Not yet released"
                )}
              </p>

              <p>
                <b>Release contact:</b>
                ${esc(
                  v.released_contact ||
                  "Not provided"
                )}
              </p>
            `
            : ""
        }

        <p>
          <b>Description:</b>
          ${esc(
            v.description ||
            ""
          )}
        </p>

        <h3>
          Expense Summary
        </h3>

        <table>

          <tr>
            <th>
              Total Expenses
            </th>

            <td class="num">
              ${money(
                total
              )}
            </td>
          </tr>

          <tr>
            <th>
              Parts
            </th>

            <td class="num">
              ${money(
                parts
              )}
            </td>
          </tr>

          <tr>
            <th>
              Materials
            </th>

            <td class="num">
              ${money(
                materials
              )}
            </td>
          </tr>

          <tr>
            <th>
              Labour
            </th>

            <td class="num">
              ${money(
                labour
              )}
            </td>
          </tr>

        </table>

        <table>

          <thead>

            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>

          </thead>

          <tbody>

            ${es
              .map(
                e => `
                  <tr>

                    <td>
                      ${esc(
                        e.expense_date
                      )}
                    </td>

                    <td>
                      ${esc(
                        e.description
                      )}
                    </td>

                    <td>
                      ${esc(
                        e.category ||
                        ""
                      )}
                    </td>

                    <td class="num">
                      ${money(
                        e.amount
                      )}
                    </td>

                  </tr>
                `
              )
              .join("")}

          </tbody>

        </table>
      `
    );
  };

// ======================================================
// PRINT ONE REQUISITION
// ======================================================
window.printReq =
  id => {

    const r =
      requisitions.find(
        x =>
          String(
            x.id
          ) ===
          String(
            id
          )
      );

    if (!r) return;

    const v =
      vehicles.find(
        x =>
          String(
            x.id
          ) ===
          String(
            r.vehicle_id
          )
      );

    printPage(
      `Requisition ${r.req_no}`,
      `
        <p>
          <b>Date:</b>
          ${esc(
            r.req_date
          )}
        </p>

        <p>
          <b>Requested by:</b>
          ${esc(
            r.requested_by
          )}
        </p>

        <p>
          <b>Vehicle:</b>
          ${esc(
            v?.registration ||
            "General"
          )}
        </p>

        <table>

          <tr>

            <th>
              Type
            </th>

            <td>
              ${esc(
                getReqCategory(
                  r
                )
              )}
            </td>

          </tr>

          <tr>

            <th>
              Item
            </th>

            <td>
              ${esc(
                r.item_description
              )}
            </td>

          </tr>

          <tr>

            <th>
              Quantity
            </th>

            <td>
              ${esc(
                r.quantity
              )}
            </td>

          </tr>

          <tr>

            <th>
              Unit cost
            </th>

            <td>
              ${money(
                r.unit_cost
              )}
            </td>

          </tr>

          <tr>

            <th>
              Total
            </th>

            <td>
              ${money(
                r.total_amount
              )}
            </td>

          </tr>

          <tr>

            <th>
              Status
            </th>

            <td>
              ${esc(
                r.status
              )}
            </td>

          </tr>

          <tr>

            <th>
              Notes
            </th>

            <td>
              ${esc(
                cleanReqNotes(
                  r
                )
              )}
            </td>

          </tr>

        </table>
      `
    );
  };

// ======================================================
// SHARING
// ======================================================
async function doShare(
  title,
  text
) {

  if (navigator.share) {

    try {

      await navigator.share({
        title,
        text,
        url:
          location.href
      });

      return;

    } catch (error) {

      if (
        error.name ===
        "AbortError"
      )
        return;
    }
  }

  try {

    await navigator.clipboard
      .writeText(
        text +
        " " +
        location.href
      );

    toast(
      "Share text copied. Paste it in WhatsApp."
    );

  } catch (error) {

    toast(
      "Sharing is not available on this browser."
    );
  }
}

window.shareGarage =
  () =>
    doShare(
      "Garage Operations",
      "Garage Operations shared link"
    );

window.shareSummary =
  () =>
    doShare(
      "Garage Operations Summary",
      `
Vehicles: ${vehicles.length}.
Vehicle expenses: ${money(
        expenses.reduce(
          (a, e) =>
            a + num(
              e.amount
            ),
          0
        )
      )}.
Petty cash: ${money(
        pettyCash.reduce(
          (a, e) =>
            a + num(
              e.amount
            ),
          0
        )
      )}.
      `.trim()
    );

window.shareVehicle =
  id => {

    const v =
      vehicles.find(
        x =>
          String(
            x.id
          ) ===
          String(
            id
          )
      );

    if (!v) return;

    const es =
      expenses.filter(
        e =>
          String(
            e.vehicle_id
          ) ===
          String(
            id
          )
      );

    const total =
      es.reduce(
        (a, e) =>
          a + num(
            e.amount
          ),
        0
      );

    const parts =
      categoryTotalForVehicle(
        id,
        "Parts"
      );

    const materials =
      categoryTotalForVehicle(
        id,
        "Materials"
      );

    const labour =
      categoryTotalForVehicle(
        id,
        "Labour"
      );

    doShare(
      `Vehicle ${v.registration}`,
      `
${v.registration} — ${v.customer}
Status: ${v.status}

Total Expenses: ${money(total)}
Parts: ${money(parts)}
Materials: ${money(materials)}
Labour: ${money(labour)}
      `.trim()
    );
  };

window.shareReq =
  id => {

    const r =
      requisitions.find(
        x =>
          String(
            x.id
          ) ===
          String(
            id
          )
      );

    if (!r) return;

    const v =
      vehicles.find(
        x =>
          String(
            x.id
          ) ===
          String(
            r.vehicle_id
          )
      );

    doShare(
      `Requisition ${r.req_no}`,
      `
Requisition: ${r.req_no}
Vehicle: ${
        v?.registration ||
        "General"
      }
Type: ${getReqCategory(r)}
Item: ${r.item_description}
Quantity: ${r.quantity}
Total: ${money(
        r.total_amount
      )}
Status: ${r.status}
      `.trim()
    );
  };

// ======================================================
// TOAST
// ======================================================
function toast(message) {

  if (!$("toast")) {
    alert(message);
    return;
  }

  $("toast").textContent =
    message;

  $("toast").style.display =
    "block";

  setTimeout(
    () => {
      $("toast").style.display =
        "none";
    },
    2800
  );
}

// ======================================================
// START
// ======================================================
start();
