import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE APP.JS
   ONLY REQUESTED UPDATES:
   1. CRUD ACTIONS HORIZONTAL
   2. SHARE SENDS ACTUAL DATA
========================================================= */

const SUPABASE_URL =
  "https://ptluwoeogfkqavhspdjj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";

const supabase =
  createClient(SUPABASE_URL, SUPABASE_KEY);


/* =========================================================
   STATE
========================================================= */

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];
let invoices = [];
let gatePasses = [];

let currentPreviewHTML = "";
let currentVehicleExpenseHTML = "";
let currentSection = "dashboard";


/* =========================================================
   COMPANY
========================================================= */

const COMPANIES = {

  crystal: {
    type: "crystal",
    name: "CRYSTAL MOTORS (K) LTD",
    address:
      "P.O. Box 54385 – 00200, Nairobi\n" +
      "Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge",
    phone: "0722 707124 | 0723 914 222",
    email: ""
  },

  quarry: {
    type: "quarry",
    name: "QUARRY ROUTE MOTORS LTD",
    address:
      "P.O. Box 54385 – 00200, Nairobi\n" +
      "Off Mombasa Road, Along Quarry Road, Near Mlolongo Weigh Bridge",
    phone: "0722 707124 / 0723 914 222",
    email:
      "info@quarryroutemotors.com, quarryroutemotorsltd@gmail.com"
  }

};

const DEFAULT_COMPANY =
  COMPANIES.crystal;


/* =========================================================
   HELPERS
========================================================= */

const $ = id =>
  document.getElementById(id);


function num(v) {

  const n = Number(v);

  return Number.isFinite(n)
    ? n
    : 0;
}


function money(v) {

  return (
    "KSh " +
    num(v).toLocaleString(
      "en-KE",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )
  );
}


function esc(v) {

  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function today() {

  return new Date()
    .toISOString()
    .slice(0, 10);
}


function fmtDate(v) {

  if (!v) return "";

  return String(v).slice(0, 10);
}


function storageDays(v) {

  if (!v || !v.date_in) {
    return 0;
  }

  const start =
    new Date(
      v.date_in + "T00:00:00"
    );

  const end =
    v.date_out
      ? new Date(
          v.date_out + "T00:00:00"
        )
      : new Date();

  const days =
    Math.ceil(
      (end - start) /
      86400000
    );

  return Math.max(0, days);
}


function vehicleById(id) {

  return vehicles.find(
    v =>
      String(v.id) ===
      String(id)
  );
}


function vehicleByRegistration(reg) {

  const x =
    String(reg || "")
      .trim()
      .toLowerCase();

  return vehicles.find(
    v =>
      String(v.registration || "")
        .trim()
        .toLowerCase() === x
  );
}


function vehicleName(id) {

  const v =
    vehicleById(id);

  return v
    ? v.registration
    : "General";
}


function toast(
  message,
  good = true
) {

  const t =
    $("toast");

  if (!t) return;

  t.textContent =
    message;

  t.style.display =
    "block";

  t.style.background =
    good
      ? "#16834b"
      : "#b42318";

  clearTimeout(
    window.__toastTimer
  );

  window.__toastTimer =
    setTimeout(
      () => {
        t.style.display =
          "none";
      },
      3500
    );
}


function statusClass(status) {

  return String(status || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}


/* =========================================================
   ACTION BUTTONS — HORIZONTAL
========================================================= */

function forceHorizontalActions() {

  if (
    document.getElementById(
      "garageHorizontalActionsCSS"
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "garageHorizontalActionsCSS";

  style.textContent = `

    .table-actions {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: 6px !important;
      flex-wrap: nowrap !important;
      white-space: nowrap !important;
    }

    .table-actions .action-btn {
      display: inline-flex !important;
      flex: 0 0 auto !important;
      width: auto !important;
      min-width: max-content !important;
      white-space: nowrap !important;
      align-items: center !important;
      justify-content: center !important;
    }

    @media (max-width: 700px) {

      .table-actions {
        overflow-x: auto !important;
        max-width: 100% !important;
        -webkit-overflow-scrolling: touch !important;
        scrollbar-width: thin !important;
      }

      .table-actions .action-btn {
        flex-shrink: 0 !important;
      }

    }

  `;

  document.head.appendChild(
    style
  );
}


/* =========================================================
   LOAD DATA
========================================================= */

async function loadTable(
  table,
  orderColumn = "created_at"
) {

  try {

    let q =
      supabase
        .from(table)
        .select("*");

    if (orderColumn) {

      q =
        q.order(
          orderColumn,
          {
            ascending: false
          }
        );
    }

    const {
      data,
      error
    } = await q;

    if (error) {

      console.error(
        table,
        error
      );

      toast(
        `${table} could not load: ${error.message}`,
        false
      );

      return [];
    }

    return data || [];

  } catch (err) {

    console.error(
      table,
      err
    );

    toast(
      `${table} could not load`,
      false
    );

    return [];
  }
}


async function loadAllData() {

  setLoadingState();

  const results =
    await Promise.allSettled([

      loadTable(
        "vehicles",
        "created_at"
      ),

      loadTable(
        "expenses",
        "expense_date"
      ),

      loadTable(
        "petty_cash",
        "cash_date"
      ),

      loadTable(
        "requisitions",
        "req_date"
      ),

      loadTable(
        "invoices",
        "invoice_date"
      ),

      loadTable(
        "gate_passes",
        "gate_pass_date"
      )

    ]);


  vehicles =
    results[0].status ===
    "fulfilled"
      ? results[0].value
      : [];


  expenses =
    results[1].status ===
    "fulfilled"
      ? results[1].value
      : [];


  pettyCash =
    results[2].status ===
    "fulfilled"
      ? results[2].value
      : [];


  requisitions =
    results[3].status ===
    "fulfilled"
      ? results[3].value
      : [];


  invoices =
    results[4].status ===
    "fulfilled"
      ? results[4].value
      : [];


  gatePasses =
    results[5].status ===
    "fulfilled"
      ? results[5].value
      : [];


  refreshAll();


  console.log(
    "Garage data loaded:",
    {
      vehicles:
        vehicles.length,

      expenses:
        expenses.length,

      pettyCash:
        pettyCash.length,

      requisitions:
        requisitions.length,

      invoices:
        invoices.length,

      gatePasses:
        gatePasses.length
    }
  );
}


function setLoadingState() {

  [
    "vehiclesTableBody",
    "expensesTableBody",
    "pettyTableBody",
    "requisitionsTableBody",
    "invoicesTableBody",
    "gatePassesTableBody"
  ].forEach(id => {

    const el =
      $(id);

    if (el) {

      el.innerHTML = `
        <tr>
          <td
            colspan="20"
            style="
              padding:25px;
              text-align:center;
              color:#64748b
            "
          >
            Loading...
          </td>
        </tr>
      `;
    }

  });
}


/* =========================================================
   REFRESH EVERYTHING
========================================================= */

function refreshAll() {

  populateVehicleSelects();

  renderVehicles();

  renderExpenses();

  renderPettyCash();

  renderRequisitions();

  renderInvoices();

  renderGatePasses();

  renderDashboard();

  bindDynamicCalculations();

  forceHorizontalActions();
}


/* =========================================================
   NAVIGATION
========================================================= */

window.showSection =
function(
  section,
  button
) {

  currentSection =
    section;

  document
    .querySelectorAll(
      ".app-section"
    )
    .forEach(s => {

      s.classList.remove(
        "active"
      );

      s.style.display =
        "none";
    });


  const target =
    $(section);

  if (target) {

    target.classList.add(
      "active"
    );

    target.style.display =
      "block";
  }


  document
    .querySelectorAll(
      ".nav-btn,.mobile-nav-btn"
    )
    .forEach(b => {

      b.classList.toggle(
        "active",
        b.dataset.section ===
          section
      );

    });


  if (button) {

    document
      .querySelectorAll(
        ".nav-btn,.mobile-nav-btn"
      )
      .forEach(b =>
        b.classList.remove(
          "active"
        )
      );

    button.classList.add(
      "active"
    );
  }


  if (
    section ===
    "dashboard"
  )
    renderDashboard();

  if (
    section ===
    "vehicles"
  )
    renderVehicles();

  if (
    section ===
    "expenses"
  )
    renderExpenses();

  if (
    section ===
    "pettyCash"
  )
    renderPettyCash();

  if (
    section ===
    "requisitions"
  )
    renderRequisitions();

  if (
    section ===
    "invoices"
  )
    renderInvoices();

  if (
    section ===
    "gatePasses"
  )
    renderGatePasses();
};


/* =========================================================
   MODALS
========================================================= */

window.closeModal =
function(id) {

  const m =
    $(id);

  if (m) {

    m.classList.remove(
      "show"
    );
  }
};


function openModal(id) {

  const m =
    $(id);

  if (m) {

    m.classList.add(
      "show"
    );
  }
}


/* =========================================================
   VEHICLE SELECTS
========================================================= */

function populateVehicleSelects() {

  const selects = [

    $("expenseVehicle"),
    $("reqVehicle"),
    $("invoiceVehicle"),
    $("gateVehicle")

  ];


  selects.forEach(
    select => {

      if (!select) return;


      if (
        select.id ===
        "expenseVehicle"
      ) {

        setupExpenseVehicleSearch();

        return;
      }


      const old =
        select.value;


      let html =
        `
        <option value="">
          -- General / Select Vehicle --
        </option>
        `;


      vehicles
        .slice()
        .sort(
          (a, b) =>
            String(
              a.registration || ""
            ).localeCompare(
              String(
                b.registration || ""
              )
            )
        )
        .forEach(v => {

          html += `
            <option value="${esc(v.id)}">
              ${esc(v.registration)}
              ${
                v.customer
                  ? " — " +
                    esc(
                      v.customer
                    )
                  : ""
              }
            </option>
          `;
        });


      select.innerHTML =
        html;


      if (
        old &&
        vehicles.some(
          v =>
            String(v.id) ===
            String(old)
        )
      ) {

        select.value =
          old;
      }

    }
  );
}


/* =========================================================
   EXPENSE VEHICLE SEARCH
========================================================= */

function setupExpenseVehicleSearch() {

  const select =
    $("expenseVehicle");

  if (!select) return;


  let search =
    $("expenseVehicleSearch");


  if (!search) {

    search =
      document.createElement(
        "input"
      );

    search.id =
      "expenseVehicleSearch";

    search.type =
      "search";

    search.placeholder =
      "Search vehicle e.g. KBZ 272B";

    search.autocomplete =
      "off";

    search.style.width =
      "100%";

    search.style.boxSizing =
      "border-box";

    search.style.marginBottom =
      "8px";

    search.style.padding =
      "10px 12px";

    search.style.border =
      "1px solid #d1d5db";

    search.style.borderRadius =
      "8px";

    search.style.fontSize =
      "14px";

    search.style.background =
      "#fff";


    select.parentNode.insertBefore(
      search,
      select
    );


    search.addEventListener(
      "input",
      function() {

        populateExpenseVehicleOptions(
          this.value
        );

      }
    );
  }


  populateExpenseVehicleOptions(
    search.value
  );
}


function populateExpenseVehicleOptions(
  searchText = "",
  keepVehicleId = ""
) {

  const select =
    $("expenseVehicle");

  if (!select) return;


  const oldValue =
    keepVehicleId ||
    select.value ||
    "";


  const search =
    String(
      searchText || ""
    )
      .trim()
      .toLowerCase();


  const filteredVehicles =
    vehicles
      .filter(v => {

        if (!search) {
          return true;
        }

        const searchableText =
          [
            v.registration,
            v.customer,
            v.model,
            v.model_year,
            v.color
          ]
            .join(" ")
            .toLowerCase();

        return searchableText.includes(
          search
        );

      })
      .sort(
        (a, b) =>
          String(
            a.registration || ""
          ).localeCompare(
            String(
              b.registration || ""
            )
          )
      );


  let html =
    `
    <option value="">
      -- Select Vehicle --
    </option>
    `;


  filteredVehicles.forEach(
    v => {

      html += `
        <option value="${esc(v.id)}">
          ${esc(v.registration)}
          ${
            v.customer
              ? " — " +
                esc(v.customer)
              : ""
          }
        </option>
      `;

    }
  );


  select.innerHTML =
    html;


  if (
    oldValue &&
    filteredVehicles.some(
      v =>
        String(v.id) ===
        String(oldValue)
    )
  ) {

    select.value =
      oldValue;
  }
}


/* =========================================================
   VEHICLES
========================================================= */

window.openVehicleModal =
function(id = "") {

  const form =
    $("vehicleForm");

  if (form)
    form.reset();


  $("vehicleId").value =
    "";


  $("vehicleModalTitle")
    .textContent =
    id
      ? "Edit Vehicle"
      : "Add Vehicle";


  $("vehicleDateIn").value =
    today();

  $("vehicleBilled").value =
    0;

  $("vehiclePaid").value =
    0;

  $("vehicleStorageDays").value =
    0;


  if (id) {

    const v =
      vehicleById(id);

    if (!v) return;


    $("vehicleId").value =
      v.id;

    $("vehicleRegistration").value =
      v.registration || "";

    $("vehicleCustomer").value =
      v.customer || "";

    $("vehicleModel").value =
      v.model || "";

    $("vehicleModelYear").value =
      v.model_year || "";

    $("vehicleColor").value =
      v.color || "";

    $("vehicleDateIn").value =
      fmtDate(v.date_in) ||
      today();

    $("vehicleDateOut").value =
      fmtDate(v.date_out);

    $("vehicleJobType").value =
      v.job_type ||
      "Repair";

    $("vehicleStatus").value =
      v.status ||
      "Under Repair";

    $("vehicleReleasedTo").value =
      v.released_to || "";

    $("vehicleReleasedContact").value =
      v.released_contact || "";

    $("vehicleBilled").value =
      num(v.billed);

    $("vehiclePaid").value =
      num(v.paid);

    $("vehicleDescription").value =
      v.description || "";


    updateVehicleStorageDays();
  }


  openModal(
    "vehicleModal"
  );
};


function updateVehicleStorageDays() {

  const dateIn =
    $("vehicleDateIn")?.value;

  const dateOut =
    $("vehicleDateOut")?.value;


  if (!dateIn) {

    $("vehicleStorageDays").value =
      0;

    return;
  }


  const fake = {
    date_in:
      dateIn,
    date_out:
      dateOut
  };


  $("vehicleStorageDays").value =
    storageDays(fake);
}


async function saveVehicle(e) {

  e.preventDefault();


  const id =
    $("vehicleId")
      .value
      .trim();


  const registration =
    $("vehicleRegistration")
      .value
      .trim();


  if (!registration) {

    toast(
      "Vehicle registration is required.",
      false
    );

    return;
  }


  const duplicate =
    vehicles.find(
      v =>
        String(
          v.registration || ""
        )
          .trim()
          .toLowerCase() ===
          registration.toLowerCase() &&
        String(v.id) !==
          String(id)
    );


  if (duplicate) {

    toast(
      `Vehicle ${registration} already exists.`,
      false
    );

    return;
  }


  const record = {

    registration,

    customer:
      $("vehicleCustomer")
        .value
        .trim(),

    model:
      $("vehicleModel")
        .value
        .trim() ||
      null,

    model_year:
      $("vehicleModelYear").value
        ? Number(
            $("vehicleModelYear")
              .value
          )
        : null,

    color:
      $("vehicleColor")
        .value
        .trim() ||
      null,

    date_in:
      $("vehicleDateIn").value ||
      today(),

    date_out:
      $("vehicleDateOut").value ||
      null,

    job_type:
      $("vehicleJobType").value ||
      "Repair",

    status:
      $("vehicleStatus").value ||
      "Under Repair",

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

    description:
      $("vehicleDescription")
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
      )
  };


  try {

    let result;


    if (id) {

      result =
        await supabase
          .from("vehicles")
          .update(record)
          .eq("id", id)
          .select()
          .single();

    } else {

      result =
        await supabase
          .from("vehicles")
          .insert(record)
          .select()
          .single();
    }


    if (result.error) {

      console.error(
        result.error
      );

      toast(
        "Vehicle could not be saved: " +
          result.error.message,
        false
      );

      return;
    }


    if (id) {

      const index =
        vehicles.findIndex(
          v =>
            String(v.id) ===
            String(id)
        );

      if (index >= 0) {

        vehicles[index] =
          result.data;
      }

    } else {

      vehicles.unshift(
        result.data
      );
    }


    closeModal(
      "vehicleModal"
    );

    populateVehicleSelects();

    refreshAll();


    toast(
      id
        ? "Vehicle updated successfully."
        : "Vehicle added successfully."
    );

  } catch (err) {

    console.error(err);

    toast(
      "Vehicle save failed.",
      false
    );
  }
}


window.editVehicle =
function(id) {

  openVehicleModal(id);
};


window.deleteVehicle =
async function(id) {

  const v =
    vehicleById(id);

  if (!v) return;


  if (
    !confirm(
      `Delete vehicle ${v.registration}? Its linked expenses will also be deleted.`
    )
  ) {
    return;
  }


  const {
    error
  } =
    await supabase
      .from("vehicles")
      .delete()
      .eq("id", id);


  if (error) {

    toast(
      "Vehicle could not be deleted: " +
        error.message,
      false
    );

    return;
  }


  vehicles =
    vehicles.filter(
      v =>
        String(v.id) !==
        String(id)
    );


  expenses =
    expenses.filter(
      e =>
        String(
          e.vehicle_id
        ) !==
        String(id)
    );


  refreshAll();

  toast(
    "Vehicle deleted."
  );
};


function getVehicleExpenses(
  vehicleId
) {

  return expenses.filter(
    e =>
      String(
        e.vehicle_id || ""
      ) ===
      String(vehicleId)
  );
}


function vehicleExpenseTotal(
  vehicleId
) {

  return getVehicleExpenses(
    vehicleId
  ).reduce(
    (sum, e) =>
      sum + num(e.amount),
    0
  );
}


/* =========================================================
   VEHICLE EXPENSE REPORT
========================================================= */

window.showVehicleExpenses =
function(id) {

  const v =
    vehicleById(id);

  if (!v) return;


  const list =
    getVehicleExpenses(id);


  const total =
    list.reduce(
      (s, e) =>
        s + num(e.amount),
      0
    );


  let rows = "";


  list.forEach(
    e => {

      rows += `
        <tr>

          <td>
            ${esc(
              fmtDate(
                e.expense_date
              )
            )}
          </td>

          <td>
            ${esc(
              e.description
            )}
          </td>

          <td>
            ${esc(
              e.category
            )}
          </td>

          <td>
            ${money(e.amount)}
          </td>

        </tr>
      `;
    }
  );


  if (!rows) {

    rows = `
      <tr>

        <td
          colspan="4"
          style="
            text-align:center;
            padding:20px
          "
        >
          No expenses recorded for
          ${esc(v.registration)}.
        </td>

      </tr>
    `;
  }


  currentVehicleExpenseHTML = `

    <div class="preview-paper">

      <div class="preview-head">

        <h1>
          VEHICLE EXPENSE REPORT
        </h1>

        <p>
          <strong>Vehicle:</strong>
          ${esc(v.registration)}
        </p>

        <p>
          <strong>Customer:</strong>
          ${esc(v.customer)}
        </p>

      </div>


      <table class="preview-table">

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


      <div class="preview-total">

        <div>

          <span>
            Total Expenses
          </span>

          <strong>
            ${money(total)}
          </strong>

        </div>

      </div>

    </div>
  `;


  const preview =
    $("vehicleExpensePreviewContent");

  if (preview) {

    preview.innerHTML =
      currentVehicleExpenseHTML;
  }


  openModal(
    "vehicleExpensePreviewModal"
  );
};


window.printVehicleExpensePreview =
function() {

  printHTML(
    "Vehicle Expense Report",
    currentVehicleExpenseHTML
  );
};


/* =========================================================
   VEHICLE EXPENSE SHARE
========================================================= */

window.shareVehicleExpenses =
async function(id) {

  const v =
    vehicleById(id);

  if (!v) return;


  const list =
    getVehicleExpenses(id);


  const total =
    list.reduce(
      (s, e) =>
        s + num(e.amount),
      0
    );


  let text =
    "CRYSTAL MOTORS (K) LTD\n" +
    "VEHICLE EXPENSE REPORT\n\n";


  text +=
    `Vehicle: ${v.registration}\n`;

  text +=
    `Customer: ${v.customer || ""}\n`;

  text +=
    `Date In: ${fmtDate(v.date_in)}\n`;

  text +=
    `Status: ${v.status || ""}\n\n`;


  if (!list.length) {

    text +=
      "No expenses recorded for this vehicle.\n";

  } else {

    text +=
      "DATE | DESCRIPTION | CATEGORY | AMOUNT\n";

    text +=
      "----------------------------------------\n";


    list.forEach(
      e => {

        text +=
          `${fmtDate(e.expense_date)} | ` +
          `${e.description || ""} | ` +
          `${e.category || ""} | ` +
          `${money(e.amount)}\n`;
      }
    );
  }


  text +=
    `\nTOTAL EXPENSES: ${money(total)}`;


  await shareText(
    `Vehicle Expenses - ${v.registration}`,
    text
  );
};


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


  const status =
    $("vehicleStatusFilter")
      ?.value || "";


  const list =
    vehicles.filter(
      v => {

        const text =
          [
            v.registration,
            v.customer,
            v.model,
            v.color
          ]
            .join(" ")
            .toLowerCase();


        return (
          (!search ||
            text.includes(
              search
            )) &&
          (!status ||
            v.status ===
              status)
        );

      }
    );


  if (!list.length) {

    body.innerHTML = `

      <tr>

        <td
          colspan="11"
          style="
            text-align:center;
            padding:30px;
            color:#64748b
          "
        >
          No vehicles found.
        </td>

      </tr>
    `;

    return;
  }


  body.innerHTML =
    list
      .map(v => {

        const exp =
          vehicleExpenseTotal(
            v.id
          );


        const outstanding =
          Math.max(
            0,
            num(v.billed) -
              num(v.paid)
          );


        return `

          <tr>

            <td>
              <strong>
                ${esc(
                  v.registration
                )}
              </strong>
            </td>

            <td>
              ${esc(
                v.customer
              )}
            </td>

            <td>
              ${esc(
                fmtDate(
                  v.date_in
                )
              )}
            </td>

            <td>
              ${esc(
                v.job_type || ""
              )}
            </td>

            <td>

              <span
                class="status status-${statusClass(
                  v.status
                )}"
              >
                ${esc(
                  v.status || ""
                )}
              </span>

            </td>

            <td>
              ${storageDays(v)}
            </td>

            <td>
              ${money(v.billed)}
            </td>

            <td>
              ${money(v.paid)}
            </td>

            <td>
              ${money(
                outstanding
              )}
            </td>

            <td>
              <strong>
                ${money(exp)}
              </strong>
            </td>

            <td>

              <div class="table-actions">

                <button
                  class="action-btn blue"
                  onclick="showVehicleExpenses('${v.id}')"
                >
                  Expenses
                </button>

                <button
                  class="action-btn blue"
                  onclick="shareVehicleExpenses('${v.id}')"
                >
                  Share
                </button>

                <button
                  class="action-btn"
                  onclick="editVehicle('${v.id}')"
                >
                  Edit
                </button>

                <button
                  class="action-btn danger"
                  onclick="deleteVehicle('${v.id}')"
                >
                  Delete
                </button>

              </div>

            </td>

          </tr>
        `;

      })
      .join("");
}


/* =========================================================
   EXPENSES
========================================================= */

window.openExpenseModal =
function(id = "") {

  $("expenseForm")?.reset();

  $("expenseId").value =
    "";

  $("expenseDate").value =
    today();

  $("expenseCategory").value =
    "Parts";


  populateVehicleSelects();


  const vehicleSearch =
    $("expenseVehicleSearch");


  if (vehicleSearch) {

    vehicleSearch.value =
      "";
  }


  populateExpenseVehicleOptions(
    ""
  );


  if (id) {

    const e =
      expenses.find(
        x =>
          String(x.id) ===
          String(id)
      );


    if (!e) return;


    $("expenseId").value =
      e.id;


    const linkedVehicle =
      vehicleById(
        e.vehicle_id
      );


    if (linkedVehicle) {

      if (vehicleSearch) {

        vehicleSearch.value =
          linkedVehicle.registration;
      }


      populateExpenseVehicleOptions(
        linkedVehicle.registration,
        e.vehicle_id
      );

    } else {

      populateExpenseVehicleOptions(
        ""
      );

      $("expenseVehicle").value =
        e.vehicle_id || "";
    }


    $("expenseDate").value =
      fmtDate(
        e.expense_date
      );

    $("expenseCategory").value =
      e.category ||
      "Parts";

    $("expenseAmount").value =
      num(e.amount);

    $("expenseDescription").value =
      e.description || "";

    $("expenseModalTitle")
      .textContent =
      "Edit Expense";

  } else {

    $("expenseModalTitle")
      .textContent =
      "Add Expense";

    $("expenseVehicle").value =
      "";
  }


  openModal(
    "expenseModal"
  );
};


async function saveExpense(e) {

  e.preventDefault();


  const id =
    $("expenseId")
      .value
      .trim();


  const selectedVehicleId =
    $("expenseVehicle")
      .value ||
    null;


  const record = {

    vehicle_id:
      selectedVehicleId,

    expense_date:
      $("expenseDate")
        .value ||
      today(),

    category:
      $("expenseCategory")
        .value ||
      "Other",

    amount:
      num(
        $("expenseAmount")
          .value
      ),

    description:
      $("expenseDescription")
        .value
        .trim()

  };


  if (!record.description) {

    toast(
      "Expense description is required.",
      false
    );

    return;
  }


  if (record.amount < 0) {

    toast(
      "Expense amount cannot be negative.",
      false
    );

    return;
  }


  if (
    record.vehicle_id &&
    !vehicleById(
      record.vehicle_id
    )
  ) {

    toast(
      "Selected vehicle was not found. Please select the vehicle again.",
      false
    );

    return;
  }


  try {

    let result;


    if (id) {

      result =
        await supabase
          .from("expenses")
          .update(record)
          .eq("id", id)
          .select()
          .single();

    } else {

      result =
        await supabase
          .from("expenses")
          .insert(record)
          .select()
          .single();
    }


    if (result.error) {

      console.error(
        result.error
      );

      toast(
        "Expense could not be saved: " +
          result.error.message,
        false
      );

      return;
    }


    if (id) {

      const i =
        expenses.findIndex(
          x =>
            String(x.id) ===
            String(id)
        );


      if (i >= 0) {

        expenses[i] =
          result.data;
      }

    } else {

      expenses.unshift(
        result.data
      );
    }


    closeModal(
      "expenseModal"
    );

    refreshAll();


    toast(
      id
        ? "Expense updated."
        : "Expense added."
    );

  } catch (err) {

    console.error(err);

    toast(
      "Expense save failed.",
      false
    );
  }
}


window.editExpense =
function(id) {

  openExpenseModal(id);
};


window.deleteExpense =
async function(id) {

  if (
    !confirm(
      "Delete this expense?"
    )
  ) {

    return;
  }


  const {
    error
  } =
    await supabase
      .from("expenses")
      .delete()
      .eq("id", id);


  if (error) {

    toast(
      "Expense could not be deleted: " +
        error.message,
      false
    );

    return;
  }


  expenses =
    expenses.filter(
      x =>
        String(x.id) !==
        String(id)
    );


  refreshAll();

  toast(
    "Expense deleted."
  );
};


function filteredExpenses() {

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


  return expenses.filter(
    e => {

      const v =
        vehicleById(
          e.vehicle_id
        );


      const text =
        [
          v?.registration ||
            "General",

          v?.customer || "",

          e.description || "",

          e.category || ""
        ]
          .join(" ")
          .toLowerCase();


      return (
        (!search ||
          text.includes(
            search
          )) &&
        (!category ||
          e.category ===
            category)
      );

    }
  );
}


function renderExpenses() {

  const body =
    $("expensesTableBody");

  if (!body) return;


  const list =
    filteredExpenses();


  if (!list.length) {

    body.innerHTML = `

      <tr>

        <td
          colspan="6"
          style="
            text-align:center;
            padding:30px;
            color:#64748b
          "
        >
          No expenses found.
        </td>

      </tr>
    `;

    return;
  }


  body.innerHTML =
    list
      .map(
        e => `

          <tr>

            <td>
              ${esc(
                fmtDate(
                  e.expense_date
                )
              )}
            </td>

            <td>
              <strong>
                ${esc(
                  vehicleName(
                    e.vehicle_id
                  )
                )}
              </strong>
            </td>

            <td>
              ${esc(
                e.description
              )}
            </td>

            <td>
              ${esc(
                e.category
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
                  onclick="editExpense('${e.id}')"
                >
                  Edit
                </button>

                <button
                  class="action-btn danger"
                  onclick="deleteExpense('${e.id}')"
                >
                  Delete
                </button>

              </div>

            </td>

          </tr>
        `
      )
      .join("");
}


/* =========================================================
   PETTY CASH
========================================================= */

window.openPettyModal =
function(id = "") {

  $("pettyForm")?.reset();

  $("pettyId").value =
    "";

  $("pettyDate").value =
    today();

  $("pettyCategory").value =
    "Other";


  if (id) {

    const p =
      pettyCash.find(
        x =>
          String(x.id) ===
          String(id)
      );


    if (!p) return;


    $("pettyId").value =
      p.id;

    $("pettyDate").value =
      fmtDate(
        p.cash_date
      );

    $("pettyPaidTo").value =
      p.paid_to || "";

    $("pettyCategory").value =
      p.category ||
      "Other";

    $("pettyAmount").value =
      num(p.amount);

    $("pettyDescription").value =
      p.description || "";

    $("pettyNotes").value =
      p.notes || "";

    $("pettyModalTitle")
      .textContent =
      "Edit Petty Cash";

  } else {

    $("pettyModalTitle")
      .textContent =
      "Add Petty Cash";
  }


  openModal(
    "pettyModal"
  );
};


async function savePetty(e) {

  e.preventDefault();


  const id =
    $("pettyId")
      .value
      .trim();


  const record = {

    cash_date:
      $("pettyDate").value ||
      today(),

    paid_to:
      $("pettyPaidTo")
        .value
        .trim() ||
      null,

    category:
      $("pettyCategory")
        .value ||
      "Other",

    amount:
      num(
        $("pettyAmount")
          .value
      ),

    description:
      $("pettyDescription")
        .value
        .trim(),

    notes:
      $("pettyNotes")
        .value
        .trim() ||
      null

  };


  if (!record.description) {

    toast(
      "Description is required.",
      false
    );

    return;
  }


  let result;


  if (id) {

    result =
      await supabase
        .from("petty_cash")
        .update(record)
        .eq("id", id)
        .select()
        .single();

  } else {

    result =
      await supabase
        .from("petty_cash")
        .insert(record)
        .select()
        .single();
  }


  if (result.error) {

    toast(
      "Petty cash could not be saved: " +
        result.error.message,
      false
    );

    return;
  }


  if (id) {

    const i =
      pettyCash.findIndex(
        x =>
          String(x.id) ===
          String(id)
      );


    if (i >= 0) {

      pettyCash[i] =
        result.data;
    }

  } else {

    pettyCash.unshift(
      result.data
    );
  }


  closeModal(
    "pettyModal"
  );

  refreshAll();


  toast(
    id
      ? "Petty cash updated."
      : "Petty cash added."
  );
}


window.editPetty =
function(id) {

  openPettyModal(id);
};


window.deletePetty =
async function(id) {

  if (
    !confirm(
      "Delete this petty cash record?"
    )
  ) {

    return;
  }


  const {
    error
  } =
    await supabase
      .from("petty_cash")
      .delete()
      .eq("id", id);


  if (error) {

    toast(
      "Petty cash could not be deleted: " +
        error.message,
      false
    );

    return;
  }


  pettyCash =
    pettyCash.filter(
      x =>
        String(x.id) !==
        String(id)
    );


  refreshAll();

  toast(
    "Petty cash deleted."
  );
};


function filteredPetty() {

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


  return pettyCash.filter(
    p => {

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
          text.includes(
            search
          )) &&
        (!category ||
          p.category ===
            category)
      );

    }
  );
}


function renderPettyCash() {

  const body =
    $("pettyTableBody");

  if (!body) return;


  const list =
    filteredPetty();


  if (!list.length) {

    body.innerHTML = `

      <tr>

        <td
          colspan="7"
          style="
            text-align:center;
            padding:30px;
            color:#64748b
          "
        >
          No petty cash records found.
        </td>

      </tr>
    `;

    return;
  }


  body.innerHTML =
    list
      .map(
        p => `

          <tr>

            <td>
              ${esc(
                fmtDate(
                  p.cash_date
                )
              )}
            </td>

            <td>
              ${esc(
                p.description
              )}
            </td>

            <td>
              ${esc(
                p.paid_to || ""
              )}
            </td>

            <td>
              ${esc(
                p.category || ""
              )}
            </td>

            <td>
              <strong>
                ${money(p.amount)}
              </strong>
            </td>

            <td>
              ${esc(
                p.notes || ""
              )}
            </td>

            <td>

              <div class="table-actions">

                <button
                  class="action-btn"
                  onclick="editPetty('${p.id}')"
                >
                  Edit
                </button>

                <button
                  class="action-btn danger"
                  onclick="deletePetty('${p.id}')"
                >
                  Delete
                </button>

              </div>

            </td>

          </tr>
        `
      )
      .join("");
}


/* =========================================================
   REQUISITIONS
========================================================= */

window.openReqModal =
function(id = "") {

  $("reqForm")?.reset();

  $("reqId").value =
    "";

  $("reqDate").value =
    today();

  $("reqQuantity").value =
    1;

  $("reqUnitCost").value =
    0;

  $("reqTotal").value =
    0;

  $("reqStatus").value =
    "Pending";


  $("reqModalTitle")
    .textContent =
    id
      ? "Edit Requisition"
      : "New Requisition";


  populateVehicleSelects();


  if (id) {

    const r =
      requisitions.find(
        x =>
          String(x.id) ===
          String(id)
      );


    if (!r) return;


    $("reqId").value =
      r.id;

    $("reqNo").value =
      r.req_no || "";

    $("reqDate").value =
      fmtDate(
        r.req_date
      );

    $("reqRequestedBy").value =
      r.requested_by || "";

    $("reqVehicle").value =
      r.vehicle_id || "";

    $("reqItemDescription").value =
      r.item_description || "";

    $("reqQuantity").value =
      num(r.quantity);

    $("reqUnitCost").value =
      num(r.unit_cost);

    $("reqTotal").value =
      num(r.total_amount);

    $("reqStatus").value =
      r.status ||
      "Pending";

    $("reqCategory").value =
      r.category || "";

    $("reqExpenseType").value =
      r.expense_type || "";

    $("reqNotes").value =
      r.notes || "";
  }


  openModal(
    "reqModal"
  );
};


function updateReqTotal() {

  const q =
    num(
      $("reqQuantity")
        ?.value
    );


  const unit =
    num(
      $("reqUnitCost")
        ?.value
    );


  if ($("reqTotal")) {

    $("reqTotal").value =
      (
        q * unit
      ).toFixed(2);
  }
}


async function saveReq(e) {

  e.preventDefault();


  const id =
    $("reqId")
      .value
      .trim();


  const quantity =
    num(
      $("reqQuantity")
        .value
    );


  const unit =
    num(
      $("reqUnitCost")
        .value
    );


  const total =
    quantity * unit;


  const record = {

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
      unit,

    total_amount:
      total,

    status:
      $("reqStatus").value ||
      "Pending",

    category:
      $("reqCategory").value ||
      null,

    expense_type:
      $("reqExpenseType").value ||
      "Materials",

    notes:
      $("reqNotes")
        .value
        .trim() ||
      null

  };


  if (
    !record.req_no ||
    !record.requested_by ||
    !record.item_description
  ) {

    toast(
      "Complete the required requisition fields.",
      false
    );

    return;
  }


  let result;


  if (id) {

    result =
      await supabase
        .from("requisitions")
        .update(record)
        .eq("id", id)
        .select()
        .single();

  } else {

    result =
      await supabase
        .from("requisitions")
        .insert(record)
        .select()
        .single();
  }


  if (result.error) {

    toast(
      "Requisition could not be saved: " +
        result.error.message,
      false
    );

    return;
  }


  if (id) {

    const i =
      requisitions.findIndex(
        x =>
          String(x.id) ===
          String(id)
      );


    if (i >= 0) {

      requisitions[i] =
        result.data;
    }

  } else {

    requisitions.unshift(
      result.data
    );
  }


  closeModal(
    "reqModal"
  );

  refreshAll();


  toast(
    id
      ? "Requisition updated."
      : "Requisition created."
  );
}


window.editReq =
function(id) {

  openReqModal(id);
};


window.deleteReq =
async function(id) {

  if (
    !confirm(
      "Delete this requisition?"
    )
  ) {

    return;
  }


  const {
    error
  } =
    await supabase
      .from("requisitions")
      .delete()
      .eq("id", id);


  if (error) {

    toast(
      "Requisition could not be deleted: " +
        error.message,
      false
    );

    return;
  }


  requisitions =
    requisitions.filter(
      x =>
        String(x.id) !==
        String(id)
    );


  refreshAll();

  toast(
    "Requisition deleted."
  );
};


function filteredReqs() {

  const search =
    (
      $("reqSearch")
        ?.value || ""
    )
      .trim()
      .toLowerCase();


  const status =
    $("reqStatusFilter")
      ?.value || "";


  return requisitions.filter(
    r => {

      const text =
        [
          r.req_no,
          r.requested_by,
          r.item_description,
          vehicleName(
            r.vehicle_id
          )
        ]
          .join(" ")
          .toLowerCase();


      return (
        (!search ||
          text.includes(
            search
          )) &&
        (!status ||
          r.status ===
            status)
      );

    }
  );
}


function renderRequisitions() {

  const body =
    $("requisitionsTableBody");

  if (!body) return;


  const list =
    filteredReqs();


  const overall =
    requisitions.reduce(
      (s, r) =>
        s +
        num(
          r.total_amount
        ),
      0
    );


  if (
    $("reqOverallTotal")
  ) {

    $("reqOverallTotal")
      .textContent =
      money(overall);
  }


  if (!list.length) {

    body.innerHTML = `

      <tr>

        <td
          colspan="11"
          style="
            text-align:center;
            padding:30px;
            color:#64748b
          "
        >
          No requisitions found.
        </td>

      </tr>
    `;

    return;
  }


  body.innerHTML =
    list
      .map(
        r => `

          <tr>

            <td>
              <strong>
                ${esc(r.req_no)}
              </strong>
            </td>

            <td>
              ${esc(
                fmtDate(
                  r.req_date
                )
              )}
            </td>

            <td>
              ${esc(
                r.requested_by
              )}
            </td>

            <td>
              ${esc(
                vehicleName(
                  r.vehicle_id
                )
              )}
            </td>

            <td>
              ${esc(
                r.item_description
              )}
            </td>

            <td>
              ${num(
                r.quantity
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
                  r.total_amount
                )}
              </strong>
            </td>

            <td>
              ${esc(
                r.expense_type ||
                r.category ||
                ""
              )}
            </td>

            <td>

              <span
                class="status status-${statusClass(
                  r.status
                )}"
              >
                ${esc(
                  r.status || ""
                )}
              </span>

            </td>

            <td>

              <div class="table-actions">

                <button
                  class="action-btn"
                  onclick="editReq('${r.id}')"
                >
                  Edit
                </button>

                <button
                  class="action-btn danger"
                  onclick="deleteReq('${r.id}')"
                >
                  Delete
                </button>

              </div>

            </td>

          </tr>
        `
      )
      .join("");
}


/* =========================================================
   INVOICES
========================================================= */

window.openInvoiceModal =
function(id = "") {

  $("invoiceForm")?.reset();

  $("invoiceId").value =
    "";

  $("invoiceDate").value =
    today();

  $("invoiceLabour").value =
    0;

  $("invoiceParts").value =
    0;

  $("invoiceOther").value =
    0;

  $("invoiceSubtotal").value =
    0;

  $("invoicePaid").value =
    0;

  $("invoiceBalance").value =
    0;

  $("invoiceStatus").value =
    "Unpaid";


  populateVehicleSelects();


  $("invoiceModalTitle")
    .textContent =
    id
      ? "Edit Invoice"
      : "New Invoice";


  if (id) {

    const inv =
      invoices.find(
        x =>
          String(x.id) ===
          String(id)
      );


    if (!inv) return;


    $("invoiceId").value =
      inv.id;

    $("invoiceNo").value =
      inv.invoice_no || "";

    $("invoiceDate").value =
      fmtDate(
        inv.invoice_date
      );

    $("invoiceVehicle").value =
      inv.vehicle_id || "";

    $("invoiceCustomer").value =
      inv.customer || "";

    $("invoiceJobDescription").value =
      inv.job_description || "";

    $("invoiceLabour").value =
      num(inv.labour);

    $("invoiceParts").value =
      num(inv.parts);

    $("invoiceOther").value =
      num(
        inv.other_amount
      );

    $("invoiceSubtotal").value =
      num(inv.subtotal);

    $("invoicePaid").value =
      num(inv.paid);

    $("invoiceBalance").value =
      num(inv.balance);

    $("invoiceStatus").value =
      inv.status ||
      "Unpaid";

    $("invoiceNotes").value =
      inv.notes || "";
  }


  updateInvoiceTotals();


  openModal(
    "invoiceModal"
  );
};


function updateInvoiceTotals() {

  const labour =
    num(
      $("invoiceLabour")
        ?.value
    );


  const parts =
    num(
      $("invoiceParts")
        ?.value
    );


  const other =
    num(
      $("invoiceOther")
        ?.value
    );


  const paid =
    num(
      $("invoicePaid")
        ?.value
    );


  const subtotal =
    labour +
    parts +
    other;


  const balance =
    Math.max(
      0,
      subtotal -
        paid
    );


  if (
    $("invoiceSubtotal")
  ) {

    $("invoiceSubtotal")
      .value =
      subtotal.toFixed(2);
  }


  if (
    $("invoiceBalance")
  ) {

    $("invoiceBalance")
      .value =
      balance.toFixed(2);
  }


  if (
    $("invoiceStatus")
  ) {

    if (
      balance <= 0 &&
      subtotal > 0
    ) {

      $("invoiceStatus")
        .value =
        "Paid";

    } else if (
      paid > 0
    ) {

      $("invoiceStatus")
        .value =
        "Part Paid";

    } else {

      $("invoiceStatus")
        .value =
        "Unpaid";
    }
  }
}


async function saveInvoice(e) {

  e.preventDefault();


  const id =
    $("invoiceId")
      .value
      .trim();


  const labour =
    num(
      $("invoiceLabour")
        .value
    );


  const parts =
    num(
      $("invoiceParts")
        .value
    );


  const other =
    num(
      $("invoiceOther")
        .value
    );


  const paid =
    num(
      $("invoicePaid")
        .value
    );


  const subtotal =
    labour +
    parts +
    other;


  const balance =
    Math.max(
      0,
      subtotal -
        paid
    );


  const record = {

    invoice_no:
      $("invoiceNo")
        .value
        .trim(),

    invoice_date:
      $("invoiceDate").value ||
      today(),

    vehicle_id:
      $("invoiceVehicle").value ||
      null,

    customer:
      $("invoiceCustomer")
        .value
        .trim(),

    job_description:
      $("invoiceJobDescription")
        .value
        .trim(),

    labour,

    parts,

    other_amount:
      other,

    subtotal,

    paid,

    balance,

    status:
      $("invoiceStatus").value ||
      "Unpaid",

    notes:
      $("invoiceNotes")
        .value
        .trim() ||
      null,

    company_type:
      "crystal",

    company_name:
      DEFAULT_COMPANY.name,

    company_address:
      DEFAULT_COMPANY.address,

    company_phone:
      DEFAULT_COMPANY.phone,

    company_email:
      DEFAULT_COMPANY.email ||
      null

  };


  if (
    !record.invoice_no ||
    !record.customer ||
    !record.job_description
  ) {

    toast(
      "Complete the required invoice fields.",
      false
    );

    return;
  }


  let result;


  if (id) {

    result =
      await supabase
        .from("invoices")
        .update(record)
        .eq("id", id)
        .select()
        .single();

  } else {

    result =
      await supabase
        .from("invoices")
        .insert(record)
        .select()
        .single();
  }


  if (result.error) {

    toast(
      "Invoice could not be saved: " +
        result.error.message,
      false
    );

    return;
  }


  if (id) {

    const i =
      invoices.findIndex(
        x =>
          String(x.id) ===
          String(id)
      );


    if (i >= 0) {

      invoices[i] =
        result.data;
    }

  } else {

    invoices.unshift(
      result.data
    );
  }


  closeModal(
    "invoiceModal"
  );

  refreshAll();


  toast(
    id
      ? "Invoice updated."
      : "Invoice created."
  );
}


window.editInvoice =
function(id) {

  openInvoiceModal(id);
};


window.deleteInvoice =
async function(id) {

  if (
    !confirm(
      "Delete this invoice?"
    )
  ) {

    return;
  }


  const {
    error
  } =
    await supabase
      .from("invoices")
      .delete()
      .eq("id", id);


  if (error) {

    toast(
      "Invoice could not be deleted: " +
        error.message,
      false
    );

    return;
  }


  invoices =
    invoices.filter(
      x =>
        String(x.id) !==
        String(id)
    );


  refreshAll();

  toast(
    "Invoice deleted."
  );
};


function filteredInvoices() {

  const search =
    (
      $("invoiceSearch")
        ?.value || ""
    )
      .trim()
      .toLowerCase();


  const status =
    $("invoiceStatusFilter")
      ?.value || "";


  return invoices.filter(
    inv => {

      const text =
        [
          inv.invoice_no,
          inv.customer,
          vehicleName(
            inv.vehicle_id
          )
        ]
          .join(" ")
          .toLowerCase();


      return (
        (!search ||
          text.includes(
            search
          )) &&
        (!status ||
          inv.status ===
            status)
      );

    }
  );
}


function renderInvoices() {

  const body =
    $("invoicesTableBody");

  if (!body) return;


  const list =
    filteredInvoices();


  if (!list.length) {

    body.innerHTML = `

      <tr>

        <td
          colspan="9"
          style="
            text-align:center;
            padding:30px;
            color:#64748b
          "
        >
          No invoices found.
        </td>

      </tr>
    `;

    return;
  }


  body.innerHTML =
    list
      .map(
        inv => `

          <tr>

            <td>
              <strong>
                ${esc(
                  inv.invoice_no
                )}
              </strong>
            </td>

            <td>
              ${esc(
                fmtDate(
                  inv.invoice_date
                )
              )}
            </td>

            <td>
              ${esc(
                vehicleName(
                  inv.vehicle_id
                )
              )}
            </td>

            <td>
              ${esc(
                inv.customer
              )}
            </td>

            <td>
              ${money(
                inv.subtotal
              )}
            </td>

            <td>
              ${money(
                inv.paid
              )}
            </td>

            <td>
              <strong>
                ${money(
                  inv.balance
                )}
              </strong>
            </td>

            <td>

              <span
                class="status status-${statusClass(
                  inv.status
                )}"
              >
                ${esc(
                  inv.status
                )}
              </span>

            </td>

            <td>

              <div class="table-actions">

                <button
                  class="action-btn blue"
                  onclick="previewInvoice('${inv.id}')"
                >
                  View
                </button>

                <button
                  class="action-btn"
                  onclick="editInvoice('${inv.id}')"
                >
                  Edit
                </button>

                <button
                  class="action-btn danger"
                  onclick="deleteInvoice('${inv.id}')"
                >
                  Delete
                </button>

              </div>

            </td>

          </tr>
        `
      )
      .join("");
}


/* =========================================================
   INVOICE PREVIEW
========================================================= */

window.previewInvoice =
function(id) {

  const inv =
    invoices.find(
      x =>
        String(x.id) ===
        String(id)
    );


  if (!inv) return;


  currentPreviewHTML =
    documentHTML(
      inv.company_type ||
        "crystal",

      "TAX INVOICE",

      `

        <p>
          <strong>
            Invoice No:
          </strong>
          ${esc(
            inv.invoice_no
          )}
        </p>

        <p>
          <strong>
            Date:
          </strong>
          ${esc(
            fmtDate(
              inv.invoice_date
            )
          )}
        </p>

        <p>
          <strong>
            Customer:
          </strong>
          ${esc(
            inv.customer
          )}
        </p>

        <p>
          <strong>
            Vehicle:
          </strong>
          ${esc(
            vehicleName(
              inv.vehicle_id
            )
          )}
        </p>


        <table
          class="preview-table"
        >

          <thead>

            <tr>
              <th>
                Description
              </th>

              <th>
                Amount
              </th>
            </tr>

          </thead>


          <tbody>

            <tr>
              <td>
                Labour
              </td>

              <td>
                ${money(
                  inv.labour
                )}
              </td>
            </tr>

            <tr>
              <td>
                Parts
              </td>

              <td>
                ${money(
                  inv.parts
                )}
              </td>
            </tr>

            <tr>
              <td>
                Other
              </td>

              <td>
                ${money(
                  inv.other_amount
                )}
              </td>
            </tr>

          </tbody>

        </table>


        <div class="preview-total">

          <div>

            <span>
              Subtotal
            </span>

            <strong>
              ${money(
                inv.subtotal
              )}
            </strong>

          </div>


          <div>

            <span>
              Paid
            </span>

            <strong>
              ${money(
                inv.paid
              )}
            </strong>

          </div>


          <div class="grand">

            <span>
              Balance
            </span>

            <strong>
              ${money(
                inv.balance
              )}
            </strong>

          </div>

        </div>


        <p>
          <strong>
            Job:
          </strong>
          ${esc(
            inv.job_description
          )}
        </p>


        <p>
          ${esc(
            inv.notes || ""
          )}
        </p>

      `
    );


  $("previewTitle")
    .textContent =
    "Invoice Preview";


  $("previewContent")
    .innerHTML =
    currentPreviewHTML;


  openModal(
    "previewModal"
  );
};


/* =========================================================
   GATE PASSES
========================================================= */

window.openGatePassModal =
function(id = "") {

  $("gatePassForm")?.reset();

  $("gatePassId").value =
    "";

  $("gatePassDate").value =
    today();

  $("gatePaid").value =
    0;

  $("gateBalance").value =
    0;

  $("gateAuthorizedBy").value =
    "Josephine";

  $("gateStatus").value =
    "Pending";


  populateVehicleSelects();


  $("gatePassModalTitle")
    .textContent =
    id
      ? "Edit Gate Pass"
      : "New Gate Pass";


  if (id) {

    const g =
      gatePasses.find(
        x =>
          String(x.id) ===
          String(id)
      );


    if (!g) return;


    $("gatePassId").value =
      g.id;

    $("gatePassNo").value =
      g.gate_pass_no || "";

    $("gatePassDate").value =
      fmtDate(
        g.gate_pass_date
      );

    $("gateVehicle").value =
      g.vehicle_id || "";

    $("gateVehicleRegistration").value =
      g.vehicle_registration ||
      "";

    $("gateCustomer").value =
      g.customer || "";

    $("gateReleasedTo").value =
      g.released_to || "";

    $("gateReleasedContact").value =
      g.released_contact || "";

    $("gateInvoice").value =
      g.invoice_no || "";

    $("gatePaid").value =
      num(g.paid);

    $("gateBalance").value =
      num(g.balance);

    $("gateAuthorizedBy").value =
      g.authorized_by ||
      "Josephine";

    $("gateStatus").value =
      g.status ||
      "Pending";

    $("gateNotes").value =
      g.notes || "";
  }


  openModal(
    "gatePassModal"
  );
};


function updateGateVehicleFields() {

  const id =
    $("gateVehicle")
      ?.value;


  const v =
    vehicleById(id);


  if (!v) {

    if (
      $("gateVehicleRegistration")
    ) {

      $("gateVehicleRegistration")
        .value =
        "";
    }

    return;
  }


  $("gateVehicleRegistration")
    .value =
    v.registration || "";


  $("gateCustomer")
    .value =
    v.customer || "";


  $("gateReleasedTo")
    .value =
    v.released_to || "";


  $("gateReleasedContact")
    .value =
    v.released_contact || "";
}


function updateGateBalance() {

  const invoiceNo =
    $("gateInvoice")
      ?.value
      .trim();


  if (!invoiceNo) {

    $("gateBalance").value =
      0;

    return;
  }


  const inv =
    invoices.find(
      i =>
        String(
          i.invoice_no || ""
        )
          .trim()
          .toLowerCase() ===
        invoiceNo.toLowerCase()
    );


  if (!inv) {

    $("gateBalance").value =
      0;

    return;
  }


  const paid =
    num(
      $("gatePaid")
        .value
    );


  $("gateBalance").value =
    Math.max(
      0,
      num(inv.subtotal) -
        paid
    ).toFixed(2);
}


async function saveGatePass(e) {

  e.preventDefault();


  const id =
    $("gatePassId")
      .value
      .trim();


  const record = {

    gate_pass_no:
      $("gatePassNo")
        .value
        .trim(),

    gate_pass_date:
      $("gatePassDate").value ||
      today(),

    vehicle_id:
      $("gateVehicle").value ||
      null,

    vehicle_registration:
      $("gateVehicleRegistration")
        .value
        .trim() ||
      null,

    customer:
      $("gateCustomer")
        .value
        .trim() ||
      null,

    released_to:
      $("gateReleasedTo")
        .value
        .trim(),

    released_contact:
      $("gateReleasedContact")
        .value
        .trim() ||
      null,

    invoice_no:
      $("gateInvoice")
        .value
        .trim() ||
      null,

    paid:
      num(
        $("gatePaid")
          .value
      ),

    balance:
      num(
        $("gateBalance")
          .value
      ),

    authorized_by:
      $("gateAuthorizedBy")
        .value
        .trim() ||
      null,

    status:
      $("gateStatus").value ||
      "Pending",

    notes:
      $("gateNotes")
        .value
        .trim() ||
      null,

    company_type:
      "crystal",

    company_name:
      DEFAULT_COMPANY.name,

    company_address:
      DEFAULT_COMPANY.address,

    company_phone:
      DEFAULT_COMPANY.phone,

    company_email:
      DEFAULT_COMPANY.email ||
      null

  };


  if (
    !record.gate_pass_no ||
    !record.released_to
  ) {

    toast(
      "Gate Pass No. and Released To are required.",
      false
    );

    return;
  }


  let result;


  if (id) {

    result =
      await supabase
        .from("gate_passes")
        .update(record)
        .eq("id", id)
        .select()
        .single();

  } else {

    result =
      await supabase
        .from("gate_passes")
        .insert(record)
        .select()
        .single();
  }


  if (result.error) {

    toast(
      "Gate Pass could not be saved: " +
        result.error.message,
      false
    );

    console.error(
      result.error
    );

    return;
  }


  if (id) {

    const i =
      gatePasses.findIndex(
        x =>
          String(x.id) ===
          String(id)
      );


    if (i >= 0) {

      gatePasses[i] =
        result.data;
    }

  } else {

    gatePasses.unshift(
      result.data
    );
  }


  closeModal(
    "gatePassModal"
  );

  refreshAll();


  toast(
    id
      ? "Gate Pass updated."
      : "Gate Pass created."
  );
}


window.editGatePass =
function(id) {

  openGatePassModal(id);
};


window.deleteGatePass =
async function(id) {

  if (
    !confirm(
      "Delete this Gate Pass?"
    )
  ) {

    return;
  }


  const {
    error
  } =
    await supabase
      .from("gate_passes")
      .delete()
      .eq("id", id);


  if (error) {

    toast(
      "Gate Pass could not be deleted: " +
        error.message,
      false
    );

    return;
  }


  gatePasses =
    gatePasses.filter(
      x =>
        String(x.id) !==
        String(id)
    );


  refreshAll();

  toast(
    "Gate Pass deleted."
  );
};


function filteredGatePasses() {

  const search =
    (
      $("gateSearch")
        ?.value || ""
    )
      .trim()
      .toLowerCase();


  const status =
    $("gateStatusFilter")
      ?.value || "";


  return gatePasses.filter(
    g => {

      const text =
        [
          g.gate_pass_no,
          g.vehicle_registration,
          g.customer,
          g.released_to,
          g.invoice_no
        ]
          .join(" ")
          .toLowerCase();


      return (
        (!search ||
          text.includes(
            search
          )) &&
        (!status ||
          g.status ===
            status)
      );

    }
  );
}


function renderGatePasses() {

  const body =
    $("gatePassesTableBody");

  if (!body) return;


  const list =
    filteredGatePasses();


  if (!list.length) {

    body.innerHTML = `

      <tr>

        <td
          colspan="10"
          style="
            text-align:center;
            padding:30px;
            color:#64748b
          "
        >
          No gate passes found.
        </td>

      </tr>
    `;

    return;
  }


  body.innerHTML =
    list
      .map(
        g => `

          <tr>

            <td>
              <strong>
                ${esc(
                  g.gate_pass_no
                )}
              </strong>
            </td>

            <td>
              ${esc(
                fmtDate(
                  g.gate_pass_date
                )
              )}
            </td>

            <td>
              ${esc(
                g.vehicle_registration ||
                vehicleName(
                  g.vehicle_id
                )
              )}
            </td>

            <td>
              ${esc(
                g.customer || ""
              )}
            </td>

            <td>
              ${esc(
                g.released_to || ""
              )}
            </td>

            <td>
              ${esc(
                g.invoice_no || ""
              )}
            </td>

            <td>
              ${money(g.paid)}
            </td>

            <td>
              ${money(g.balance)}
            </td>

            <td>

              <span
                class="status status-${statusClass(
                  g.status
                )}"
              >
                ${esc(
                  g.status || ""
                )}
              </span>

            </td>

            <td>

              <div class="table-actions">

                <button
                  class="action-btn blue"
                  onclick="previewGatePass('${g.id}')"
                >
                  View
                </button>

                <button
                  class="action-btn"
                  onclick="editGatePass('${g.id}')"
                >
                  Edit
                </button>

                <button
                  class="action-btn danger"
                  onclick="deleteGatePass('${g.id}')"
                >
                  Delete
                </button>

              </div>

            </td>

          </tr>
        `
      )
      .join("");
}


/* =========================================================
   GATE PASS PREVIEW
========================================================= */

window.previewGatePass =
function(id) {

  const g =
    gatePasses.find(
      x =>
        String(x.id) ===
        String(id)
    );


  if (!g) return;


  currentPreviewHTML =
    documentHTML(
      g.company_type ||
        "crystal",

      "GATE PASS",

      `

        <p>
          <strong>
            Gate Pass No:
          </strong>
          ${esc(
            g.gate_pass_no
          )}
        </p>

        <p>
          <strong>
            Date:
          </strong>
          ${esc(
            fmtDate(
              g.gate_pass_date
            )
          )}
        </p>

        <p>
          <strong>
            Vehicle:
          </strong>
          ${esc(
            g.vehicle_registration ||
            vehicleName(
              g.vehicle_id
            )
          )}
        </p>

        <p>
          <strong>
            Customer:
          </strong>
          ${esc(
            g.customer || ""
          )}
        </p>

        <p>
          <strong>
            Released To:
          </strong>
          ${esc(
            g.released_to || ""
          )}
        </p>

        <p>
          <strong>
            Contact:
          </strong>
          ${esc(
            g.released_contact ||
            ""
          )}
        </p>

        <p>
          <strong>
            Invoice:
          </strong>
          ${esc(
            g.invoice_no || ""
          )}
        </p>

        <p>
          <strong>
            Paid:
          </strong>
          ${money(g.paid)}
        </p>

        <p>
          <strong>
            Balance:
          </strong>
          ${money(g.balance)}
        </p>

        <p>
          <strong>
            Authorized By:
          </strong>
          ${esc(
            g.authorized_by ||
            ""
          )}
        </p>

        <p>
          <strong>
            Status:
          </strong>
          ${esc(
            g.status || ""
          )}
        </p>

        <p>
          ${esc(
            g.notes || ""
          )}
        </p>

      `
    );


  $("previewTitle")
    .textContent =
    "Gate Pass Preview";


  $("previewContent")
    .innerHTML =
    currentPreviewHTML;


  openModal(
    "previewModal"
  );
};


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

  const totalVehicles =
    vehicles.length;


  const underRepair =
    vehicles.filter(
      v =>
        String(
          v.status || ""
        ).toLowerCase() ===
        "under repair"
    ).length;


  const billed =
    vehicles.reduce(
      (s, v) =>
        s + num(v.billed),
      0
    );


  const paid =
    vehicles.reduce(
      (s, v) =>
        s + num(v.paid),
      0
    );


  const outstanding =
    vehicles.reduce(
      (s, v) =>
        s +
        Math.max(
          0,
          num(v.billed) -
            num(v.paid)
        ),
      0
    );


  const expenseTotal =
    expenses.reduce(
      (s, e) =>
        s + num(e.amount),
      0
    );


  const pettyTotal =
    pettyCash.reduce(
      (s, p) =>
        s + num(p.amount),
      0
    );


  const reqTotal =
    requisitions.reduce(
      (s, r) =>
        s +
        num(
          r.total_amount
        ),
      0
    );


  if ($("dashVehicles"))
    $("dashVehicles")
      .textContent =
      totalVehicles;


  if ($("dashRepair"))
    $("dashRepair")
      .textContent =
      underRepair;


  if ($("dashOutstanding"))
    $("dashOutstanding")
      .textContent =
      money(outstanding);


  if ($("dashReq"))
    $("dashReq")
      .textContent =
      requisitions.length;


  if ($("dashInvoices"))
    $("dashInvoices")
      .textContent =
      invoices.length;


  if ($("dashGatePasses"))
    $("dashGatePasses")
      .textContent =
      gatePasses.length;


  if ($("dashBilled"))
    $("dashBilled")
      .textContent =
      money(billed);


  if ($("dashPaid"))
    $("dashPaid")
      .textContent =
      money(paid);


  if ($("dashExpenses"))
    $("dashExpenses")
      .textContent =
      money(expenseTotal);


  if ($("dashPetty"))
    $("dashPetty")
      .textContent =
      money(pettyTotal);


  if ($("dashReqCount"))
    $("dashReqCount")
      .textContent =
      requisitions.length;


  if ($("dashReqTotal"))
    $("dashReqTotal")
      .textContent =
      money(reqTotal);


  renderStatusSummary();

  renderMonthlyChart();

  renderActivity();
}


function renderStatusSummary() {

  const box =
    $("vehicleStatusSummary");

  if (!box) return;


  const statuses = [
    "Storage",
    "Under Repair",
    "Completed",
    "Released"
  ];


  box.innerHTML =
    statuses
      .map(
        status => {

          const count =
            vehicles.filter(
              v =>
                v.status ===
                status
            ).length;


          return `

            <div
              class="status-row"
            >

              <span>
                ${esc(status)}
              </span>

              <strong>
                ${count}
              </strong>

            </div>
          `;
        }
      )
      .join("");
}


function renderMonthlyChart() {

  const box =
    $("monthlyExpenseChart");

  if (!box) return;


  const months = [];


  for (
    let i = 5;
    i >= 0;
    i--
  ) {

    const d =
      new Date();


    d.setMonth(
      d.getMonth() - i
    );


    months.push({

      year:
        d.getFullYear(),

      month:
        d.getMonth(),

      label:
        d.toLocaleString(
          "en-US",
          {
            month:
              "short"
          }
        ),

      total:
        0
    });
  }


  expenses.forEach(
    e => {

      const d =
        new Date(
          (e.expense_date || "") +
          "T00:00:00"
        );


      if (isNaN(d))
        return;


      const m =
        months.find(
          x =>
            x.year ===
              d.getFullYear() &&
            x.month ===
              d.getMonth()
        );


      if (m) {

        m.total +=
          num(e.amount);
      }

    }
  );


  const max =
    Math.max(
      ...months.map(
        x => x.total
      ),
      1
    );


  box.innerHTML =
    months
      .map(
        m => {

          const height =
            Math.max(
              25,
              Math.round(
                (m.total / max) *
                  190
              )
            );


          return `

            <div
              style="
                flex:1;
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:flex-end;
                height:100%
              "
            >

              <div
                style="
                  font-size:9px;
                  color:#64748b;
                  margin-bottom:3px
                "
              >
                ${
                  m.total
                    ? money(
                        m.total
                      ).replace(
                        ".00",
                        ""
                      )
                    : ""
                }
              </div>


              <div
                class="chart-bar"
                style="
                  height:${height}px
                "
                title="${money(
                  m.total
                )}"
              >
              </div>


              <div
                style="
                  font-size:10px;
                  color:#64748b;
                  margin-top:5px
                "
              >
                ${m.label}
              </div>

            </div>
          `;
        }
      )
      .join("");
}


function renderActivity() {

  const box =
    $("dashboardActivity");

  if (!box) return;


  const activity = [];


  vehicles
    .slice(0, 3)
    .forEach(
      v => {

        activity.push({

          icon:
            "🚘",

          title:
            `${v.registration} — ${
              v.status ||
              "Vehicle"
            }`,

          sub:
            `Customer: ${
              v.customer || ""
            }`

        });

      }
    );


  expenses
    .slice(0, 3)
    .forEach(
      e => {

        activity.push({

          icon:
            "💳",

          title:
            `Expense — ${money(
              e.amount
            )}`,

          sub:
            `${vehicleName(
              e.vehicle_id
            )} • ${
              e.description ||
              ""
            }`

        });

      }
    );


  requisitions
    .slice(0, 2)
    .forEach(
      r => {

        activity.push({

          icon:
            "📋",

          title:
            `Requisition ${
              r.req_no
            }`,

          sub:
            `${
              r.status || ""
            } • ${money(
              r.total_amount
            )}`

        });

      }
    );


  if (!activity.length) {

    box.innerHTML = `

      <div
        style="
          padding:20px;
          text-align:center;
          color:#64748b
        "
      >
        No recent activity.
      </div>
    `;

    return;
  }


  box.innerHTML =
    activity
      .slice(0, 8)
      .map(
        a => `

          <div
            class="activity-item"
          >

            <div
              class="activity-icon"
            >
              ${a.icon}
            </div>


            <div
              class="activity-main"
            >

              <strong>
                ${esc(
                  a.title
                )}
              </strong>

              <span>
                ${esc(
                  a.sub
                )}
              </span>

            </div>

          </div>
        `
      )
      .join("");
}


/* =========================================================
   PRINTING
========================================================= */

function printHTML(
  title,
  content
) {

  if (!content) {

    toast(
      "Nothing to print.",
      false
    );

    return;
  }


  const win =
    window.open(
      "",
      "_blank"
    );


  if (!win) {

    toast(
      "Please allow pop-ups to print.",
      false
    );

    return;
  }


  win.document.write(`

    <html>

      <head>

        <title>
          ${esc(title)}
        </title>

        <meta
          name="viewport"
          content="
            width=device-width,
            initial-scale=1
          "
        >


        <style>

          body {
            font-family:
              Arial,
              sans-serif;

            padding:25px;

            color:#172033;
          }


          .preview-paper {
            max-width:900px;
            margin:auto;
          }


          .preview-head {
            text-align:center;

            border-bottom:
              2px solid #07111f;

            padding-bottom:15px;

            margin-bottom:18px;
          }


          .preview-head h1 {
            margin:0;
            font-size:21px;
          }


          .preview-head p {
            margin:4px 0;

            color:#64748b;

            font-size:12px;
          }


          .preview-table {
            width:100%;

            border-collapse:
              collapse;

            margin-top:15px;
          }


          .preview-table th,
          .preview-table td {

            border:
              1px solid #dfe4ea;

            padding:9px;

            text-align:left;

            font-size:12px;
          }


          .preview-table th {
            background:#f8fafc;
          }


          .preview-total {

            margin-top:16px;

            margin-left:auto;

            width:300px;

            display:grid;

            gap:7px;
          }


          .preview-total div {

            display:flex;

            justify-content:
              space-between;
          }


          .preview-total .grand {

            font-weight:900;

            border-top:
              2px solid #07111f;

            padding-top:8px;
          }


          @media print {

            body {
              padding:10px;
            }

          }

        </style>

      </head>


      <body>

        ${content}


        <script>

          window.onload =
            function() {

              setTimeout(
                function() {

                  window.print();

                },
                300
              );

            }

        <\/script>

      </body>

    </html>

  `);


  win.document.close();
}


window.printCurrentPreview =
function() {

  printHTML(
    "Garage Operations Document",
    currentPreviewHTML
  );
};


window.printVehicles =
function() {

  const list =
    filteredVehicleListForPrint();


  let rows =
    list
      .map(
        v => `

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
                fmtDate(
                  v.date_in
                )
              )}
            </td>

            <td>
              ${esc(
                v.job_type || ""
              )}
            </td>

            <td>
              ${esc(
                v.status || ""
              )}
            </td>

            <td>
              ${storageDays(v)}
            </td>

            <td>
              ${money(
                v.billed
              )}
            </td>

            <td>
              ${money(
                v.paid
              )}
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
        `
      )
      .join("");


  currentPreviewHTML = `

    <div
      class="preview-paper"
    >

      <div
        class="preview-head"
      >

        <h1>
          VEHICLE REGISTER
        </h1>

        <p>
          ${esc(
            DEFAULT_COMPANY.name
          )}
        </p>

      </div>


      <table
        class="preview-table"
      >

        <thead>

          <tr>

            <th>
              Registration
            </th>

            <th>
              Customer
            </th>

            <th>
              Date In
            </th>

            <th>
              Job
            </th>

            <th>
              Status
            </th>

            <th>
              Days
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

    </div>
  `;


  printHTML(
    "Vehicle Register",
    currentPreviewHTML
  );
};


function filteredVehicleListForPrint() {

  const search =
    (
      $("vehicleSearch")
        ?.value || ""
    )
      .trim()
      .toLowerCase();


  const status =
    $("vehicleStatusFilter")
      ?.value || "";


  return vehicles.filter(
    v => {

      const text =
        [
          v.registration,
          v.customer,
          v.model,
          v.color
        ]
          .join(" ")
          .toLowerCase();


      return (
        (!search ||
          text.includes(
            search
          )) &&
        (!status ||
          v.status ===
            status)
      );

    }
  );
}


window.printExpenses =
function() {

  const list =
    filteredExpenses();


  const total =
    list.reduce(
      (s, e) =>
        s + num(e.amount),
      0
    );


  const rows =
    list
      .map(
        e => `

          <tr>

            <td>
              ${esc(
                fmtDate(
                  e.expense_date
                )
              )}
            </td>

            <td>
              ${esc(
                vehicleName(
                  e.vehicle_id
                )
              )}
            </td>

            <td>
              ${esc(
                e.description
              )}
            </td>

            <td>
              ${esc(
                e.category
              )}
            </td>

            <td>
              ${money(
                e.amount
              )}
            </td>

          </tr>
        `
      )
      .join("");


  currentPreviewHTML = `

    <div
      class="preview-paper"
    >

      <div
        class="preview-head"
      >

        <h1>
          EXPENSE REPORT
        </h1>

        <p>
          ${esc(
            DEFAULT_COMPANY.name
          )}
        </p>

      </div>


      <table
        class="preview-table"
      >

        <thead>

          <tr>

            <th>
              Date
            </th>

            <th>
              Vehicle
            </th>

            <th>
              Description
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
          ${rows}
        </tbody>

      </table>


      <div
        class="preview-total"
      >

        <div
          class="grand"
        >

          <span>
            Total Expenses
          </span>

          <strong>
            ${money(total)}
          </strong>

        </div>

      </div>

    </div>
  `;


  printHTML(
    "Expense Report",
    currentPreviewHTML
  );
};


window.printPettyCash =
function() {

  const list =
    filteredPetty();


  const total =
    list.reduce(
      (s, p) =>
        s + num(p.amount),
      0
    );


  const rows =
    list
      .map(
        p => `

          <tr>

            <td>
              ${esc(
                fmtDate(
                  p.cash_date
                )
              )}
            </td>

            <td>
              ${esc(
                p.description
              )}
            </td>

            <td>
              ${esc(
                p.paid_to || ""
              )}
            </td>

            <td>
              ${esc(
                p.category || ""
              )}
            </td>

            <td>
              ${money(
                p.amount
              )}
            </td>

          </tr>
        `
      )
      .join("");


  currentPreviewHTML = `

    <div
      class="preview-paper"
    >

      <div
        class="preview-head"
      >

        <h1>
          PETTY CASH REPORT
        </h1>

      </div>


      <table
        class="preview-table"
      >

        <thead>

          <tr>

            <th>
              Date
            </th>

            <th>
              Description
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
          ${rows}
        </tbody>

      </table>


      <div
        class="preview-total"
      >

        <div
          class="grand"
        >

          <span>
            Total
          </span>

          <strong>
            ${money(total)}
          </strong>

        </div>

      </div>

    </div>
  `;


  printHTML(
    "Petty Cash Report",
    currentPreviewHTML
  );
};


window.printRequisitions =
function() {

  const list =
    filteredReqs();


  const total =
    list.reduce(
      (s, r) =>
        s +
        num(
          r.total_amount
        ),
      0
    );


  const rows =
    list
      .map(
        r => `

          <tr>

            <td>
              ${esc(
                r.req_no
              )}
            </td>

            <td>
              ${esc(
                fmtDate(
                  r.req_date
                )
              )}
            </td>

            <td>
              ${esc(
                r.requested_by
              )}
            </td>

            <td>
              ${esc(
                vehicleName(
                  r.vehicle_id
                )
              )}
            </td>

            <td>
              ${esc(
                r.item_description
              )}
            </td>

            <td>
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
        `
      )
      .join("");


  currentPreviewHTML = `

    <div
      class="preview-paper"
    >

      <div
        class="preview-head"
      >

        <h1>
          REQUISITION REPORT
        </h1>

      </div>


      <table
        class="preview-table"
      >

        <thead>

          <tr>

            <th>
              Req No.
            </th>

            <th>
              Date
            </th>

            <th>
              Requested By
            </th>

            <th>
              Vehicle
            </th>

            <th>
              Description
            </th>

            <th>
              Total
            </th>

            <th>
              Status
            </th>

          </tr>

        </thead>


        <tbody>
          ${rows}
        </tbody>

      </table>


      <div
        class="preview-total"
      >

        <div
          class="grand"
        >

          <span>
            Total
          </span>

          <strong>
            ${money(total)}
          </strong>

        </div>

      </div>

    </div>
  `;


  printHTML(
    "Requisition Report",
    currentPreviewHTML
  );
};


window.printInvoices =
function() {

  const list =
    filteredInvoices();


  const rows =
    list
      .map(
        inv => `

          <tr>

            <td>
              ${esc(
                inv.invoice_no
              )}
            </td>

            <td>
              ${esc(
                fmtDate(
                  inv.invoice_date
                )
              )}
            </td>

            <td>
              ${esc(
                vehicleName(
                  inv.vehicle_id
                )
              )}
            </td>

            <td>
              ${esc(
                inv.customer
              )}
            </td>

            <td>
              ${money(
                inv.subtotal
              )}
            </td>

            <td>
              ${money(
                inv.paid
              )}
            </td>

            <td>
              ${money(
                inv.balance
              )}
            </td>

          </tr>
        `
      )
      .join("");


  currentPreviewHTML = `

    <div
      class="preview-paper"
    >

      <div
        class="preview-head"
      >

        <h1>
          INVOICE REGISTER
        </h1>

      </div>


      <table
        class="preview-table"
      >

        <thead>

          <tr>

            <th>
              Invoice
            </th>

            <th>
              Date
            </th>

            <th>
              Vehicle
            </th>

            <th>
              Customer
            </th>

            <th>
              Subtotal
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

    </div>
  `;


  printHTML(
    "Invoice Register",
    currentPreviewHTML
  );
};


window.printGatePasses =
function() {

  const list =
    filteredGatePasses();


  const rows =
    list
      .map(
        g => `

          <tr>

            <td>
              ${esc(
                g.gate_pass_no
              )}
            </td>

            <td>
              ${esc(
                fmtDate(
                  g.gate_pass_date
                )
              )}
            </td>

            <td>
              ${esc(
                g.vehicle_registration ||
                vehicleName(
                  g.vehicle_id
                )
              )}
            </td>

            <td>
              ${esc(
                g.customer || ""
              )}
            </td>

            <td>
              ${esc(
                g.released_to || ""
              )}
            </td>

            <td>
              ${esc(
                g.status || ""
              )}
            </td>

          </tr>
        `
      )
      .join("");


  currentPreviewHTML = `

    <div
      class="preview-paper"
    >

      <div
        class="preview-head"
      >

        <h1>
          GATE PASS REGISTER
        </h1>

      </div>


      <table
        class="preview-table"
      >

        <thead>

          <tr>

            <th>
              Gate Pass
            </th>

            <th>
              Date
            </th>

            <th>
              Vehicle
            </th>

            <th>
              Customer
            </th>

            <th>
              Released To
            </th>

            <th>
              Status
            </th>

          </tr>

        </thead>


        <tbody>
          ${rows}
        </tbody>

      </table>

    </div>
  `;


  printHTML(
    "Gate Pass Register",
    currentPreviewHTML
  );
};


/* =========================================================
   DOCUMENT / COMPANY HTML
========================================================= */

function documentHTML(
  companyType,
  title,
  body
) {

  const company =
    COMPANIES[
      companyType
    ] ||
    DEFAULT_COMPANY;


  return `

    <div
      class="preview-paper"
    >

      <div
        class="preview-head"
      >

        <h1>
          ${esc(
            company.name
          )}
        </h1>


        <p>
          ${esc(
            company.address
          ).replace(
            /\n/g,
            "<br>"
          )}
        </p>


        <p>
          ${esc(
            company.phone
          )}
        </p>


        ${
          company.email
            ? `
              <p>
                ${esc(
                  company.email
                )}
              </p>
            `
            : ""
        }


        <h2
          style="
            margin:14px 0 0
          "
        >
          ${esc(title)}
        </h2>

      </div>


      ${body}

    </div>
  `;
}


/* =========================================================
   SHARE
========================================================= */

/*
   IMPORTANT:

   This function NEVER uses window.open()
   for sharing.

   It sends the ACTUAL report data through
   Android Web Share.

   If native sharing is unavailable,
   clipboard sharing is used.

   No about:blank is created.
*/


async function shareText(
  title,
  text
) {

  const shareTitle =
    String(
      title ||
      "Garage Operations Pro"
    ).trim();


  const shareTextValue =
    String(
      text || ""
    ).trim();


  if (!shareTextValue) {

    toast(
      "Nothing to share.",
      false
    );

    return;
  }


  /* =====================================================
     ANDROID / NATIVE SHARE
  ===================================================== */

  try {

    if (
      navigator.share &&
      typeof navigator.share ===
        "function"
    ) {

      await navigator.share({

        title:
          shareTitle,

        text:
          shareTextValue

      });


      toast(
        "Report shared successfully."
      );

      return;
    }

  } catch (err) {

    /*
       Cancelled Android share:
       do nothing.
    */

    if (
      err &&
      err.name ===
        "AbortError"
    ) {

      return;
    }


    console.warn(
      "Native sharing failed:",
      err
    );
  }


  /* =====================================================
     CLIPBOARD FALLBACK
  ===================================================== */

  try {

    if (
      navigator.clipboard &&
      typeof navigator
        .clipboard
        .writeText ===
        "function"
    ) {

      await navigator.clipboard.writeText(
        shareTextValue
      );


      toast(
        "Report copied. Paste it into WhatsApp, email, or another app."
      );

      return;
    }

  } catch (err) {

    console.warn(
      "Clipboard API failed:",
      err
    );
  }


  /* =====================================================
     OLD BROWSER FALLBACK
  ===================================================== */

  try {

    const area =
      document.createElement(
        "textarea"
      );


    area.value =
      shareTextValue;


    area.setAttribute(
      "readonly",
      ""
    );


    area.style.position =
      "fixed";

    area.style.left =
      "-9999px";

    area.style.top =
      "0";

    area.style.width =
      "1px";

    area.style.height =
      "1px";

    area.style.opacity =
      "0";


    document.body.appendChild(
      area
    );


    area.focus();

    area.select();


    area.setSelectionRange(
      0,
      area.value.length
    );


    const copied =
      document.execCommand(
        "copy"
      );


    area.remove();


    if (copied) {

      toast(
        "Report copied. Paste it into WhatsApp, email, or another app."
      );

    } else {

      toast(
        "Unable to share or copy the report.",
        false
      );
    }

  } catch (err) {

    console.error(
      "Final share fallback failed:",
      err
    );


    toast(
      "Unable to share the report.",
      false
    );
  }
}


/* =========================================================
   SHARE GENERAL EXPENSE REPORT
========================================================= */

window.shareExpenses =
async function() {

  /*
     Uses the SAME filters as the
     Expense screen.

     Therefore if the user searches:

     KBN 084E

     only KBN 084E expenses
     are shared.
  */


  const list =
    filteredExpenses();


  const total =
    list.reduce(
      (s, e) =>
        s + num(e.amount),
      0
    );


  let text =
    "CRYSTAL MOTORS (K) LTD\n" +
    "GARAGE OPERATIONS PRO\n" +
    "EXPENSE REPORT\n\n";


  if (!list.length) {

    text +=
      "No expenses found for the current selection.\n";

  } else {

    text +=
      "DATE | VEHICLE | DESCRIPTION | CATEGORY | AMOUNT\n";

    text +=
      "------------------------------------------------------------\n";


    list.forEach(
      e => {

        text +=
          `${fmtDate(
            e.expense_date
          )} | ` +
          `${vehicleName(
            e.vehicle_id
          )} | ` +
          `${e.description || ""} | ` +
          `${e.category || ""} | ` +
          `${money(
            e.amount
          )}\n`;

      }
    );
  }


  text +=
    `\nTOTAL EXPENSES: ${money(
      total
    )}`;


  await shareText(
    "Garage Expense Report",
    text
  );
};


/* =========================================================
   SEARCH / FILTER EVENTS
========================================================= */

function bindSearchEvents() {

  const pairs = [

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
    ],


    [
      "invoiceSearch",
      renderInvoices
    ],

    [
      "invoiceStatusFilter",
      renderInvoices
    ],


    [
      "gateSearch",
      renderGatePasses
    ],

    [
      "gateStatusFilter",
      renderGatePasses
    ]

  ];


  pairs.forEach(
    ([id, fn]) => {

      const el =
        $(id);


      if (
        !el ||
        el.dataset.bound ===
          "1"
      ) {

        return;
      }


      el.addEventListener(
        "input",
        fn
      );


      el.addEventListener(
        "change",
        fn
      );


      el.dataset.bound =
        "1";
    }
  );
}


/* =========================================================
   FORM EVENTS
========================================================= */

function bindForms() {

  const forms = [

    [
      "vehicleForm",
      saveVehicle
    ],

    [
      "expenseForm",
      saveExpense
    ],

    [
      "pettyForm",
      savePetty
    ],

    [
      "reqForm",
      saveReq
    ],

    [
      "invoiceForm",
      saveInvoice
    ],

    [
      "gatePassForm",
      saveGatePass
    ]

  ];


  forms.forEach(
    ([id, fn]) => {

      const form =
        $(id);


      if (
        !form ||
        form.dataset.bound ===
          "1"
      ) {

        return;
      }


      form.addEventListener(
        "submit",
        fn
      );


      form.dataset.bound =
        "1";
    }
  );
}


/* =========================================================
   DYNAMIC CALCULATIONS
========================================================= */

function bindDynamicCalculations() {

  [
    "vehicleDateIn",
    "vehicleDateOut"
  ].forEach(
    id => {

      const el =
        $(id);


      if (
        el &&
        el.dataset.boundStorage !==
          "1"
      ) {

        el.addEventListener(
          "change",
          updateVehicleStorageDays
        );


        el.dataset.boundStorage =
          "1";
      }

    }
  );


  [
    "reqQuantity",
    "reqUnitCost"
  ].forEach(
    id => {

      const el =
        $(id);


      if (
        el &&
        el.dataset.boundCalc !==
          "1"
      ) {

        el.addEventListener(
          "input",
          updateReqTotal
        );


        el.dataset.boundCalc =
          "1";
      }

    }
  );


  [
    "invoiceLabour",
    "invoiceParts",
    "invoiceOther",
    "invoicePaid"
  ].forEach(
    id => {

      const el =
        $(id);


      if (
        el &&
        el.dataset.boundCalc !==
          "1"
      ) {

        el.addEventListener(
          "input",
          updateInvoiceTotals
        );


        el.dataset.boundCalc =
          "1";
      }

    }
  );


  const gateVehicle =
    $("gateVehicle");


  if (
    gateVehicle &&
    gateVehicle.dataset.boundGate !==
      "1"
  ) {

    gateVehicle.addEventListener(
      "change",
      updateGateVehicleFields
    );


    gateVehicle.dataset.boundGate =
      "1";
  }


  const gateInvoice =
    $("gateInvoice");


  const gatePaid =
    $("gatePaid");


  if (
    gateInvoice &&
    gateInvoice.dataset.boundGate !==
      "1"
  ) {

    gateInvoice.addEventListener(
      "input",
      updateGateBalance
    );


    gateInvoice.dataset.boundGate =
      "1";
  }


  if (
    gatePaid &&
    gatePaid.dataset.boundGate !==
      "1"
  ) {

    gatePaid.addEventListener(
      "input",
      updateGateBalance
    );


    gatePaid.dataset.boundGate =
      "1";
  }
}


/* =========================================================
   LOGIN DISPLAY
========================================================= */

function updateUserDisplay() {

  const user =
    sessionStorage.getItem(
      "garageUser"
    ) ||
    "josephine";


  const display =
    user.charAt(0)
      .toUpperCase() +
    user.slice(1);


  if ($("sidebarUser")) {

    $("sidebarUser")
      .textContent =
      display;
  }


  if ($("welcomeUser")) {

    $("welcomeUser")
      .textContent =
      display.charAt(0)
        .toUpperCase();
  }
}


/* =========================================================
   PREVIEW MODAL
========================================================= */

window.closePreview =
function() {

  closeModal(
    "previewModal"
  );
};


/* =========================================================
   INITIALIZE
========================================================= */

async function init() {

  try {

    updateUserDisplay();

    /*
       Requested UI change:
       keep all CRUD actions horizontal.
    */
    forceHorizontalActions();

    bindForms();

    bindSearchEvents();

    bindDynamicCalculations();

    populateVehicleSelects();

    await loadAllData();


    /*
       Run once more after all
       tables have rendered.
    */
    forceHorizontalActions();


    console.log(
      "Garage Operations Pro initialized."
    );

  } catch (err) {

    console.error(
      "INITIALIZATION ERROR:",
      err
    );


    toast(
      "Application started with an error. Check the browser console.",
      false
    );
  }
}


init();

