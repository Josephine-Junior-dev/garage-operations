import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE SHORT APP.JS
   ========================================================= */

const SUPABASE_URL =
  "https://ptluwoeogfkqavhspdjj.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =========================================================
   DATA
   ========================================================= */

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];
let invoices = [];
let gatePasses = [];

let selectedVehicle = null;
let previewHTML = "";

const $ = id => document.getElementById(id);

const today = () =>
  new Date().toISOString().slice(0, 10);

const num = value => Number(value || 0);

const money = value =>
  "KSh " +
  num(value).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const esc = value =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/* =========================================================
   HELPERS
   ========================================================= */

function normalizeRegistration(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function vehicleLabel(v) {
  if (!v) return "General";
  return (
    v.registration ||
    v.chassis_no ||
    "Vehicle"
  );
}

function findVehicle(id) {
  return vehicles.find(
    v => String(v.id) === String(id)
  );
}

function statusClass(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function storageDays(v) {
  if (!v?.date_in) return 0;

  const start =
    new Date(v.date_in + "T00:00:00");

  const end = v.date_out
    ? new Date(v.date_out + "T00:00:00")
    : new Date();

  return Math.max(
    0,
    Math.floor(
      (end - start) / 86400000
    )
  );
}

function toast(message, error = false) {
  const el = $("toast");
  if (!el) {
    console.log(message);
    return;
  }

  el.textContent = message;
  el.style.display = "block";
  el.style.background = error
    ? "#b42318"
    : "#07111f";

  clearTimeout(window.__garageToast);

  window.__garageToast =
    setTimeout(() => {
      el.style.display = "none";
    }, 3500);
}

function openModal(id) {
  $(id)?.classList.add("show");
}

function closeModal(id) {
  $(id)?.classList.remove("show");
}

function listen(id, event, fn) {
  $(id)?.addEventListener(event, fn);
}

/* =========================================================
   LOAD DATA
   ========================================================= */

async function loadTable(table) {
  try {
    const { data, error } =
      await supabase
        .from(table)
        .select("*");

    if (error) {
      console.error(
        "Supabase loading " + table,
        error
      );

      toast(
        "Could not load " +
          table +
          ": " +
          error.message,
        true
      );

      return [];
    }

    return data || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function loadAllData() {
  const [
    v,
    e,
    p,
    r,
    i,
    g
  ] = await Promise.all([
    loadTable("vehicles"),
    loadTable("expenses"),
    loadTable("petty_cash"),
    loadTable("requisitions"),
    loadTable("invoices"),
    loadTable("gate_passes")
  ]);

  vehicles = v;
  expenses = e;
  pettyCash = p;
  requisitions = r;
  invoices = i;
  gatePasses = g;

  await removeDuplicateVehicles();

  renderEverything();
}

/* =========================================================
   DUPLICATE VEHICLE PROTECTION
   ========================================================= */

function findDuplicate(
  registration,
  currentId = ""
) {
  const key =
    normalizeRegistration(registration);

  if (!key) return null;

  return (
    vehicles.find(v => {
      const same =
        normalizeRegistration(
          v.registration
        ) === key;

      const current =
        currentId &&
        String(v.id) === String(currentId);

      return same && !current;
    }) || null
  );
}

async function removeLinkedRecords(vehicleId) {
  const tables = [
    "expenses",
    "requisitions",
    "invoices",
    "gate_passes"
  ];

  for (const table of tables) {
    try {
      const { error } =
        await supabase
          .from(table)
          .delete()
          .eq("vehicle_id", vehicleId);

      if (error) {
        console.warn(
          "Could not delete linked " +
            table +
            ":",
          error.message
        );
      }
    } catch (error) {
      console.warn(table, error);
    }
  }
}

async function removeDuplicateVehicles() {
  const seen = new Map();
  const duplicates = [];

  for (const vehicle of vehicles) {
    const key =
      normalizeRegistration(
        vehicle.registration
      );

    if (!key) continue;

    if (!seen.has(key)) {
      seen.set(key, vehicle);
    } else {
      /*
        Keep the first record and remove
        subsequent duplicates.
      */
      duplicates.push(vehicle);
    }
  }

  if (!duplicates.length) return;

  let removed = 0;

  for (const duplicate of duplicates) {
    try {
      await removeLinkedRecords(
        duplicate.id
      );

      const { error } =
        await supabase
          .from("vehicles")
          .delete()
          .eq("id", duplicate.id);

      if (!error) {
        removed++;
      } else {
        console.error(
          "Duplicate vehicle delete failed:",
          duplicate,
          error
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  /*
    Refresh vehicles after duplicate cleanup.
  */
  const { data } =
    await supabase
      .from("vehicles")
      .select("*");

  if (data) vehicles = data;

  if (removed) {
    toast(
      removed +
        " duplicate vehicle" +
        (removed === 1 ? "" : "s") +
        " removed."
    );
  }
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function showSection(section) {
  document
    .querySelectorAll(".app-section")
    .forEach(el => {
      el.classList.remove("active");
      el.style.display = "none";
    });

  const target = $(section);

  if (target) {
    target.classList.add("active");
    target.style.display = "block";
  }

  document
    .querySelectorAll(
      ".nav-btn,.mobile-nav-btn"
    )
    .forEach(btn =>
      btn.classList.remove("active")
    );

  document
    .querySelectorAll(
      `[data-section="${section}"]`
    )
    .forEach(btn =>
      btn.classList.add("active")
    );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================================================
   CLICKABLE DASHBOARD CARDS
   ========================================================= */

function setupDashboardCards() {
  const map = {
    dashVehicles: "vehicles",
    dashExpenses: "expenses",
    dashPetty: "pettyCash",
    dashReq: "requisitions",
    dashInvoices: "invoices",
    dashGatePasses: "gatePasses",
    dashRepair: "vehicles",
    dashOutstanding: "vehicles",
    dashBilled: "vehicles",
    dashPaid: "vehicles"
  };

  Object.entries(map).forEach(
    ([id, section]) => {
      const card = $(id)?.closest(
        ".stat-card,.dashboard-card,.summary-card,.card"
      );

      if (!card) return;

      card.style.cursor = "pointer";

      card.addEventListener(
        "click",
        event => {
          if (
            event.target.closest(
              "button,a,input,select"
            )
          )
            return;

          showSection(section);

          if (
            section === "vehicles"
          ) {
            renderVehicles();
          }

          if (
            section === "expenses"
          ) {
            renderExpenses();
          }
        }
      );
    }
  );

  /*
    Also support cards with data-section.
  */
  document
    .querySelectorAll(
      "[data-dashboard-section]"
    )
    .forEach(card => {
      card.style.cursor = "pointer";

      card.addEventListener(
        "click",
        () =>
          showSection(
            card.dataset.dashboardSection
          )
      );
    });
}

/* =========================================================
   VEHICLE SELECTS
   ========================================================= */

function fillVehicleSelect(
  id,
  selected = ""
) {
  const select = $(id);
  if (!select) return;

  select.innerHTML =
    `<option value="">Select vehicle</option>` +
    vehicles
      .slice()
      .sort((a, b) =>
        vehicleLabel(a).localeCompare(
          vehicleLabel(b)
        )
      )
      .map(
        v =>
          `<option value="${esc(v.id)}"
            ${
              String(v.id) ===
              String(selected)
                ? "selected"
                : ""
            }>
            ${esc(vehicleLabel(v))}
            ${
              v.customer
                ? " — " +
                  esc(v.customer)
                : ""
            }
          </option>`
      )
      .join("");
}

function updateAllVehicleSelects() {
  [
    "expenseVehicle",
    "reqVehicle",
    "invoiceVehicle",
    "gateVehicle"
  ].forEach(id => {
    if ($(id))
      fillVehicleSelect(
        id,
        $(id).value
      );
  });
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {
  const billed =
    vehicles.reduce(
      (s, v) => s + num(v.billed),
      0
    );

  const paid =
    vehicles.reduce(
      (s, v) => s + num(v.paid),
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
      (s, e) => s + num(e.amount),
      0
    );

  const pettyTotal =
    pettyCash.reduce(
      (s, p) => s + num(p.amount),
      0
    );

  const repair =
    vehicles.filter(
      v => v.status === "Under Repair"
    ).length;

  const set = (id, value) => {
    if ($(id))
      $(id).textContent = value;
  };

  set(
    "dashVehicles",
    vehicles.length
  );

  set(
    "dashRepair",
    repair
  );

  set(
    "dashOutstanding",
    money(outstanding)
  );

  set(
    "dashReq",
    requisitions.length
  );

  set(
    "dashInvoices",
    invoices.length
  );

  set(
    "dashGatePasses",
    gatePasses.length
  );

  set(
    "dashBilled",
    money(billed)
  );

  set(
    "dashPaid",
    money(paid)
  );

  set(
    "dashExpenses",
    money(expenseTotal)
  );

  set(
    "dashPetty",
    money(pettyTotal)
  );

  set(
    "dashReqCount",
    requisitions.length
  );

  set(
    "dashReqTotal",
    money(
      requisitions.reduce(
        (s, r) =>
          s + num(r.total_amount),
        0
      )
    )
  );

  set(
    "reqOverallTotal",
    money(
      requisitions.reduce(
        (s, r) =>
          s + num(r.total_amount),
        0
      )
    )
  );

  renderStatusSummary();
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

  box.innerHTML = statuses
    .map(status => {
      const count =
        vehicles.filter(
          v => v.status === status
        ).length;

      return `
        <div class="status-row">
          <span>
            <span class="status status-${statusClass(
              status
            )}">
              ${esc(status)}
            </span>
          </span>
          <strong>${count}</strong>
        </div>
      `;
    })
    .join("");
}

function renderActivity() {
  const box =
    $("dashboardActivity");

  if (!box) return;

  const items = [];

  vehicles.slice(0, 5).forEach(v =>
    items.push({
      icon: "🚘",
      title: vehicleLabel(v),
      text: v.status || "Vehicle"
    })
  );

  expenses.slice(0, 5).forEach(e =>
    items.push({
      icon: "💳",
      title:
        e.description ||
        "Expense",
      text: money(e.amount)
    })
  );

  box.innerHTML =
    items
      .slice(0, 8)
      .map(
        x => `
          <div class="activity-item">
            <div class="activity-icon">
              ${x.icon}
            </div>
            <div class="activity-main">
              <strong>
                ${esc(x.title)}
              </strong>
              <span>
                ${esc(x.text)}
              </span>
            </div>
          </div>
        `
      )
      .join("") ||
    "No recent activity.";
}

/* =========================================================
   VEHICLES
   ========================================================= */

function vehicleExpenseTotal(id) {
  return expenses
    .filter(
      e =>
        String(e.vehicle_id) ===
        String(id)
    )
    .reduce(
      (s, e) => s + num(e.amount),
      0
    );
}

function filteredVehicles() {
  const search =
    String(
      $("vehicleSearch")?.value ||
        ""
    )
      .trim()
      .toLowerCase();

  const status =
    $("vehicleStatusFilter")
      ?.value || "";

  return vehicles.filter(v => {
    const text = [
      v.registration,
      v.customer,
      v.model,
      v.color,
      v.chassis_no
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search ||
        text.includes(search)) &&
      (!status ||
        v.status === status)
    );
  });
}

function renderVehicles() {
  const body =
    $("vehiclesTableBody");

  if (!body) return;

  const rows =
    filteredVehicles();

  body.innerHTML = rows.length
    ? rows
        .map(v => {
          const billed =
            num(v.billed);

          const paid =
            num(v.paid);

          const balance =
            Math.max(
              0,
              billed - paid
            );

          return `
            <tr>
              <td>
                <strong>
                  ${esc(vehicleLabel(v))}
                </strong>
              </td>

              <td>${esc(
                v.customer
              )}</td>

              <td>${esc(
                v.date_in || ""
              )}</td>

              <td>${esc(
                v.job_type || ""
              )}</td>

              <td>
                <span class="status status-${statusClass(
                  v.status
                )}">
                  ${esc(v.status || "")}
                </span>
              </td>

              <td>
                ${storageDays(v)}
              </td>

              <td>${money(billed)}</td>

              <td>${money(paid)}</td>

              <td>${money(balance)}</td>

              <td>
                <strong>
                  ${money(
                    vehicleExpenseTotal(
                      v.id
                    )
                  )}
                </strong>
              </td>

              <td>
                <div class="table-actions">
                  <button
                    class="action-btn blue"
                    onclick="viewVehicleExpenses('${esc(v.id)}')"
                    title="Vehicle Expenses">
                    💳
                  </button>

                  <button
                    class="action-btn"
                    onclick="openInvoiceModal('${esc(v.id)}')"
                    title="Invoice">
                    🧾
                  </button>

                  <button
                    class="action-btn"
                    onclick="openGatePassModal('${esc(v.id)}')"
                    title="Gate Pass">
                    🎫
                  </button>

                  <button
                    class="action-btn"
                    onclick="editVehicle('${esc(v.id)}')"
                    title="Edit">
                    ✏️
                  </button>

                  <button
                    class="action-btn danger"
                    onclick="deleteVehicle('${esc(v.id)}')"
                    title="Delete">
                    🗑
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td
          colspan="12"
          style="text-align:center;padding:25px">
          No vehicles found.
        </td>
      </tr>
    `;
}

/* =========================================================
   VEHICLE FORM
   ========================================================= */

function openVehicleModal(id = "") {
  const v =
    id ? findVehicle(id) : null;

  $("vehicleForm")?.reset();

  if ($("vehicleId"))
    $("vehicleId").value =
      v?.id || "";

  if ($("vehicleModalTitle"))
    $("vehicleModalTitle")
      .textContent =
      v
        ? "Edit Vehicle"
        : "Add Vehicle";

  const values = {
    vehicleRegistration:
      v?.registration || "",
    vehicleCustomer:
      v?.customer || "",
    vehicleModel:
      v?.model || "",
    vehicleModelYear:
      v?.model_year || "",
    vehicleColor:
      v?.color || "",
    vehicleDateIn:
      v?.date_in || today(),
    vehicleDateOut:
      v?.date_out || "",
    vehicleJobType:
      v?.job_type || "Repair",
    vehicleStatus:
      v?.status || "Storage",
    vehicleReleasedTo:
      v?.released_to || "",
    vehicleReleasedContact:
      v?.released_contact || "",
    vehicleBilled:
      v?.billed ?? 0,
    vehiclePaid:
      v?.paid ?? 0,
    vehicleDescription:
      v?.description || ""
  };

  Object.entries(values).forEach(
    ([id, value]) => {
      if ($(id))
        $(id).value = value;
    }
  );

  updateVehicleStorageDays();

  openModal("vehicleModal");
}

function editVehicle(id) {
  openVehicleModal(id);
}

function updateVehicleStorageDays() {
  if (!$("vehicleStorageDays"))
    return;

  const v = {
    date_in:
      $("vehicleDateIn")?.value,
    date_out:
      $("vehicleDateOut")?.value
  };

  $("vehicleStorageDays").value =
    storageDays(v);
}

async function saveVehicle(event) {
  event.preventDefault();

  const id =
    $("vehicleId")?.value.trim();

  const registration =
    $("vehicleRegistration")
      ?.value.trim();

  if (!registration) {
    toast(
      "Registration / Chassis No. is required.",
      true
    );
    return;
  }

  const duplicate =
    findDuplicate(
      registration,
      id
    );

  if (duplicate) {
    toast(
      vehicleLabel(duplicate) +
        " already exists. Duplicate was NOT added.",
      true
    );

    /*
      Clean existing duplicate records too.
    */
    await removeDuplicateVehicles();

    return;
  }

  const payload = {
    registration,
    customer:
      $("vehicleCustomer")
        ?.value.trim() || "",
    model:
      $("vehicleModel")
        ?.value.trim() || "",
    model_year:
      $("vehicleModelYear")
        ?.value
        ? Number(
            $("vehicleModelYear").value
          )
        : null,
    color:
      $("vehicleColor")
        ?.value.trim() || "",
    date_in:
      $("vehicleDateIn")?.value ||
      null,
    date_out:
      $("vehicleDateOut")?.value ||
      null,
    job_type:
      $("vehicleJobType")?.value ||
      "Repair",
    status:
      $("vehicleStatus")?.value ||
      "Storage",
    released_to:
      $("vehicleReleasedTo")
        ?.value.trim() || "",
    released_contact:
      $("vehicleReleasedContact")
        ?.value.trim() || "",
    billed:
      num(
        $("vehicleBilled")
          ?.value
      ),
    paid:
      num(
        $("vehiclePaid")
          ?.value
      ),
    description:
      $("vehicleDescription")
        ?.value.trim() || ""
  };

  let result;

  if (id) {
    result =
      await supabase
        .from("vehicles")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
  } else {
    result =
      await supabase
        .from("vehicles")
        .insert(payload)
        .select()
        .single();
  }

  if (result.error) {
    const message =
      result.error.message || "";

    if (
      /duplicate|unique/i.test(
        message
      )
    ) {
      toast(
        "This vehicle already exists. It was not added.",
        true
      );
    } else {
      toast(
        "Vehicle save failed: " +
          message,
        true
      );
    }

    return;
  }

  closeModal("vehicleModal");

  toast(
    id
      ? "Vehicle updated."
      : "Vehicle added."
  );

  await loadAllData();
}

async function deleteVehicle(id) {
  const v = findVehicle(id);

  if (!v) {
    toast(
      "Vehicle not found.",
      true
    );
    return;
  }

  const registration =
    vehicleLabel(v);

  const ok = confirm(
    "DELETE " +
      registration +
      "?\n\n" +
      "This will also remove its linked expenses, requisitions, invoices and gate passes."
  );

  if (!ok) return;

  try {
    /*
      Delete linked records first.
    */
    await removeLinkedRecords(id);

    /*
      Delete vehicle.
    */
    const { error } =
      await supabase
        .from("vehicles")
        .delete()
        .eq("id", id);

    if (error) {
      toast(
        "Vehicle was NOT deleted: " +
          error.message,
        true
      );

      await loadAllData();
      return;
    }

    /*
      Immediately remove locally.
    */
    vehicles =
      vehicles.filter(
        x =>
          String(x.id) !==
          String(id)
      );

    renderEverything();

    /*
      Verify against database.
    */
    const { data, error: checkError } =
      await supabase
        .from("vehicles")
        .select("id")
        .eq("id", id);

    if (checkError) {
      console.warn(checkError);
    }

    if (data?.length) {
      toast(
        "Vehicle still exists in Supabase. Check database permissions/RLS.",
        true
      );

      await loadAllData();
      return;
    }

    toast(
      registration +
        " deleted successfully."
    );
  } catch (error) {
    console.error(error);

    toast(
      "Vehicle deletion failed: " +
        error.message,
      true
    );

    await loadAllData();
  }
}

/* =========================================================
   VEHICLE EXPENSE REPORT
   ========================================================= */

function viewVehicleExpenses(id) {
  const v = findVehicle(id);

  if (!v) return;

  selectedVehicle = v;

  const rows =
    expenses.filter(
      e =>
        String(e.vehicle_id) ===
        String(id)
    );

  const total =
    rows.reduce(
      (s, e) => s + num(e.amount),
      0
    );

  const html = `
    <div class="preview-paper">

      <div class="preview-head">
        <h1>VEHICLE EXPENSE REPORT</h1>
        <p>
          Vehicle:
          <strong>
            ${esc(vehicleLabel(v))}
          </strong>
        </p>
        <p>
          Customer:
          ${esc(v.customer || "")}
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
          ${
            rows.length
              ? rows
                  .map(
                    e => `
                      <tr>
                        <td>${esc(
                          e.expense_date ||
                            ""
                        )}</td>
                        <td>${esc(
                          e.description ||
                            ""
                        )}</td>
                        <td>${esc(
                          e.category ||
                            ""
                        )}</td>
                        <td>${money(
                          e.amount
                        )}</td>
                      </tr>
                    `
                  )
                  .join("")
              : `
                <tr>
                  <td colspan="4">
                    No expenses recorded.
                  </td>
                </tr>
              `
          }
        </tbody>
      </table>

      <div class="preview-total">
        <div class="grand">
          <span>TOTAL EXPENSES</span>
          <strong>
            ${money(total)}
          </strong>
        </div>
      </div>

    </div>
  `;

  previewHTML = html;

  if (
    $("vehicleExpensePreviewContent")
  ) {
    $("vehicleExpensePreviewContent")
      .innerHTML = html;
  }

  openModal(
    "vehicleExpensePreviewModal"
  );
}

function printVehicleExpensePreview() {
  if (previewHTML)
    printHTML(
      previewHTML,
      "Vehicle Expense Report"
    );
}

/* =========================================================
   EXPENSES
   ========================================================= */

function filteredExpenses() {
  const search =
    String(
      $("expenseSearch")?.value ||
        ""
    )
      .trim()
      .toLowerCase();

  const category =
    $("expenseCategoryFilter")
      ?.value || "";

  return expenses.filter(e => {
    const v =
      findVehicle(
        e.vehicle_id
      );

    const text = [
      vehicleLabel(v),
      v?.customer,
      v?.model,
      e.description,
      e.category
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search ||
        text.includes(search)) &&
      (!category ||
        e.category === category)
    );
  });
}

function renderExpenses() {
  const body =
    $("expensesTableBody");

  if (!body) return;

  const rows =
    filteredExpenses();

  body.innerHTML = rows.length
    ? rows
        .map(e => {
          const v =
            findVehicle(
              e.vehicle_id
            );

          return `
            <tr>
              <td>${esc(
                e.expense_date || ""
              )}</td>

              <td>
                <strong>
                  ${esc(vehicleLabel(v))}
                </strong>
              </td>

              <td>${esc(
                e.description || ""
              )}</td>

              <td>${esc(
                e.category || ""
              )}</td>

              <td>
                <strong>
                  ${money(e.amount)}
                </strong>
              </td>

              <td>
                <div class="table-actions">
                  <button
                    class="action-btn"
                    onclick="editExpense('${esc(e.id)}')">
                    ✏️
                  </button>

                  <button
                    class="action-btn danger"
                    onclick="deleteExpense('${esc(e.id)}')">
                    🗑
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td colspan="6"
            style="text-align:center;padding:25px">
          No expenses found.
        </td>
      </tr>
    `;
}

function openExpenseModal(id = "") {
  const e =
    id
      ? expenses.find(
          x =>
            String(x.id) ===
            String(id)
        )
      : null;

  $("expenseForm")?.reset();

  if ($("expenseId"))
    $("expenseId").value =
      e?.id || "";

  if ($("expenseDate"))
    $("expenseDate").value =
      e?.expense_date ||
      today();

  updateAllVehicleSelects();

  if ($("expenseVehicle"))
    $("expenseVehicle").value =
      e?.vehicle_id || "";

  if ($("expenseCategory"))
    $("expenseCategory").value =
      e?.category || "Parts";

  if ($("expenseAmount"))
    $("expenseAmount").value =
      e?.amount ?? "";

  if ($("expenseDescription"))
    $("expenseDescription").value =
      e?.description || "";

  if ($("expenseModalTitle"))
    $("expenseModalTitle")
      .textContent =
      e
        ? "Edit Expense"
        : "Add Expense";

  openModal("expenseModal");
}

function editExpense(id) {
  openExpenseModal(id);
}

async function saveExpense(event) {
  event.preventDefault();

  const id =
    $("expenseId")?.value;

  const payload = {
    vehicle_id:
      $("expenseVehicle")
        ?.value || null,
    expense_date:
      $("expenseDate")?.value ||
      today(),
    description:
      $("expenseDescription")
        ?.value.trim() || "",
    category:
      $("expenseCategory")
        ?.value || "Other",
    amount:
      num(
        $("expenseAmount")
          ?.value
      )
  };

  const result = id
    ? await supabase
        .from("expenses")
        .update(payload)
        .eq("id", id)
    : await supabase
        .from("expenses")
        .insert(payload);

  if (result.error) {
    toast(
      "Expense error: " +
        result.error.message,
      true
    );
    return;
  }

  closeModal("expenseModal");
  toast("Expense saved.");
  await loadAllData();
}

async function deleteExpense(id) {
  if (
    !confirm(
      "Delete this expense?"
    )
  )
    return;

  const { error } =
    await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

  if (error) {
    toast(
      "Expense delete failed: " +
        error.message,
      true
    );
    return;
  }

  toast("Expense deleted.");
  await loadAllData();
}

function printExpenses() {
  /*
    IMPORTANT:
    Uses EXACTLY the same filtered
    rows displayed on screen.
  */
  const rows =
    filteredExpenses();

  const search =
    $("expenseSearch")?.value ||
    "";

  const total =
    rows.reduce(
      (s, e) => s + num(e.amount),
      0
    );

  const html = `
    <div class="preview-paper">

      <div class="preview-head">
        <h1>EXPENSE REPORT</h1>

        <p>
          ${
            search
              ? "Vehicle / Search: " +
                esc(search)
              : "Current filtered expenses"
          }
        </p>
      </div>

      <table class="preview-table">
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
            rows.length
              ? rows
                  .map(e => {
                    const v =
                      findVehicle(
                        e.vehicle_id
                      );

                    return `
                      <tr>
                        <td>${esc(
                          e.expense_date ||
                            ""
                        )}</td>

                        <td>${esc(
                          vehicleLabel(v)
                        )}</td>

                        <td>${esc(
                          e.description ||
                            ""
                        )}</td>

                        <td>${esc(
                          e.category ||
                            ""
                        )}</td>

                        <td>${money(
                          e.amount
                        )}</td>
                      </tr>
                    `;
                  })
                  .join("")
              : `
                <tr>
                  <td colspan="5">
                    No matching expenses.
                  </td>
                </tr>
              `
          }
        </tbody>
      </table>

      <div class="preview-total">
        <div class="grand">
          <span>TOTAL</span>
          <strong>
            ${money(total)}
          </strong>
        </div>
      </div>

    </div>
  `;

  printHTML(
    html,
    "Vehicle Expense Report"
  );
}

/* =========================================================
   PETTY CASH
   ========================================================= */

function filteredPetty() {
  const search =
    String(
      $("pettySearch")?.value ||
        ""
    ).toLowerCase();

  const category =
    $("pettyCategoryFilter")
      ?.value || "";

  return pettyCash.filter(p => {
    const text = [
      p.description,
      p.paid_to,
      p.category,
      p.notes
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search ||
        text.includes(search)) &&
      (!category ||
        p.category === category)
    );
  });
}

function renderPettyCash() {
  const body =
    $("pettyTableBody");

  if (!body) return;

  const rows =
    filteredPetty();

  body.innerHTML = rows.length
    ? rows
        .map(
          p => `
            <tr>
              <td>${esc(
                p.cash_date || ""
              )}</td>

              <td>${esc(
                p.description || ""
              )}</td>

              <td>${esc(
                p.paid_to || ""
              )}</td>

              <td>${esc(
                p.category || ""
              )}</td>

              <td>${money(
                p.amount
              )}</td>

              <td>${esc(
                p.notes || ""
              )}</td>

              <td>
                <div class="table-actions">
                  <button
                    class="action-btn"
                    onclick="editPetty('${esc(p.id)}')">
                    ✏️
                  </button>

                  <button
                    class="action-btn danger"
                    onclick="deletePetty('${esc(p.id)}')">
                    🗑
                  </button>
                </div>
              </td>
            </tr>
          `
        )
        .join("")
    : `
      <tr>
        <td colspan="7"
            style="text-align:center;padding:25px">
          No petty cash records.
        </td>
      </tr>
    `;
}

function openPettyModal(id = "") {
  const p =
    id
      ? pettyCash.find(
          x =>
            String(x.id) ===
            String(id)
        )
      : null;

  $("pettyForm")?.reset();

  if ($("pettyId"))
    $("pettyId").value =
      p?.id || "";

  if ($("pettyDate"))
    $("pettyDate").value =
      p?.cash_date || today();

  if ($("pettyPaidTo"))
    $("pettyPaidTo").value =
      p?.paid_to || "";

  if ($("pettyCategory"))
    $("pettyCategory").value =
      p?.category || "Other";

  if ($("pettyAmount"))
    $("pettyAmount").value =
      p?.amount ?? "";

  if ($("pettyDescription"))
    $("pettyDescription").value =
      p?.description || "";

  if ($("pettyNotes"))
    $("pettyNotes").value =
      p?.notes || "";

  if ($("pettyModalTitle"))
    $("pettyModalTitle")
      .textContent =
      p
        ? "Edit Petty Cash"
        : "Add Petty Cash";

  openModal("pettyModal");
}

function editPetty(id) {
  openPettyModal(id);
}

async function savePetty(event) {
  event.preventDefault();

  const id =
    $("pettyId")?.value;

  const payload = {
    cash_date:
      $("pettyDate")?.value ||
      today(),
    paid_to:
      $("pettyPaidTo")
        ?.value.trim() || "",
    category:
      $("pettyCategory")
        ?.value || "Other",
    amount:
      num(
        $("pettyAmount")
          ?.value
      ),
    description:
      $("pettyDescription")
        ?.value.trim() || "",
    notes:
      $("pettyNotes")
        ?.value.trim() || ""
  };

  const result = id
    ? await supabase
        .from("petty_cash")
        .update(payload)
        .eq("id", id)
    : await supabase
        .from("petty_cash")
        .insert(payload);

  if (result.error) {
    toast(
      "Petty cash error: " +
        result.error.message,
      true
    );
    return;
  }

  closeModal("pettyModal");
  toast("Petty cash saved.");
  await loadAllData();
}

async function deletePetty(id) {
  if (
    !confirm(
      "Delete this petty cash record?"
    )
  )
    return;

  const { error } =
    await supabase
      .from("petty_cash")
      .delete()
      .eq("id", id);

  if (error) {
    toast(
      "Delete failed: " +
        error.message,
      true
    );
    return;
  }

  toast("Petty cash deleted.");
  await loadAllData();
}

function printPettyCash() {
  const rows =
    filteredPetty();

  const total =
    rows.reduce(
      (s, p) => s + num(p.amount),
      0
    );

  printHTML(
    `
      <div class="preview-paper">
        <div class="preview-head">
          <h1>PETTY CASH REPORT</h1>
        </div>

        <table class="preview-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Paid To</th>
              <th>Category</th>
              <th>Amount</th>
            </tr>
          </thead>

          <tbody>
            ${rows
              .map(
                p => `
                  <tr>
                    <td>${esc(
                      p.cash_date
                    )}</td>
                    <td>${esc(
                      p.description
                    )}</td>
                    <td>${esc(
                      p.paid_to
                    )}</td>
                    <td>${esc(
                      p.category
                    )}</td>
                    <td>${money(
                      p.amount
                    )}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>

        <div class="preview-total">
          <div class="grand">
            <span>TOTAL</span>
            <strong>
              ${money(total)}
            </strong>
          </div>
        </div>
      </div>
    `,
    "Petty Cash"
  );
}

/* =========================================================
   REQUISITIONS
   ========================================================= */

function filteredReqs() {
  const search =
    String(
      $("reqSearch")?.value ||
        ""
    ).toLowerCase();

  const status =
    $("reqStatusFilter")
      ?.value || "";

  return requisitions.filter(r => {
    const v =
      findVehicle(
        r.vehicle_id
      );

    const text = [
      r.req_no,
      r.requested_by,
      r.item_description,
      r.status,
      vehicleLabel(v)
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search ||
        text.includes(search)) &&
      (!status ||
        r.status === status)
    );
  });
}

function renderRequisitions() {
  const body =
    $("requisitionsTableBody");

  if (!body) return;

  const rows =
    filteredReqs();

  body.innerHTML = rows.length
    ? rows
        .map(r => {
          const v =
            findVehicle(
              r.vehicle_id
            );

          return `
            <tr>
              <td>${esc(r.req_no)}</td>
              <td>${esc(r.req_date)}</td>
              <td>${esc(
                r.requested_by
              )}</td>
              <td>${esc(
                vehicleLabel(v)
              )}</td>
              <td>${esc(
                r.item_description
              )}</td>
              <td>${num(
                r.quantity
              )}</td>
              <td>${money(
                r.unit_cost
              )}</td>
              <td>${money(
                r.total_amount
              )}</td>
              <td>${esc(
                r.category ||
                  r.expense_type ||
                  ""
              )}</td>
              <td>
                <span class="status status-${statusClass(
                  r.status
                )}">
                  ${esc(r.status)}
                </span>
              </td>
              <td>
                <div class="table-actions">
                  <button
                    class="action-btn"
                    onclick="editReq('${esc(r.id)}')">
                    ✏️
                  </button>

                  <button
                    class="action-btn danger"
                    onclick="deleteReq('${esc(r.id)}')">
                    🗑
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td colspan="11"
            style="text-align:center;padding:25px">
          No requisitions found.
        </td>
      </tr>
    `;
}

function updateReqTotal() {
  const total =
    num(
      $("reqQuantity")
        ?.value
    ) *
    num(
      $("reqUnitCost")
        ?.value
    );

  if ($("reqTotal"))
    $("reqTotal").value =
      total;
}

function openReqModal(id = "") {
  const r =
    id
      ? requisitions.find(
          x =>
            String(x.id) ===
            String(id)
        )
      : null;

  $("reqForm")?.reset();

  if ($("reqId"))
    $("reqId").value =
      r?.id || "";

  if ($("reqNo"))
    $("reqNo").value =
      r?.req_no ||
      "REQ-" +
        new Date()
          .getFullYear() +
        "-" +
        String(
          requisitions.length +
            1
        ).padStart(4, "0");

  if ($("reqDate"))
    $("reqDate").value =
      r?.req_date || today();

  if ($("reqRequestedBy"))
    $("reqRequestedBy").value =
      r?.requested_by || "";

  if ($("reqItemDescription"))
    $("reqItemDescription")
      .value =
      r?.item_description || "";

  if ($("reqQuantity"))
    $("reqQuantity").value =
      r?.quantity ?? 1;

  if ($("reqUnitCost"))
    $("reqUnitCost").value =
      r?.unit_cost ?? 0;

  if ($("reqTotal"))
    $("reqTotal").value =
      r?.total_amount ?? 0;

  if ($("reqStatus"))
    $("reqStatus").value =
      r?.status || "Pending";

  if ($("reqCategory"))
    $("reqCategory").value =
      r?.category || "";

  if ($("reqExpenseType"))
    $("reqExpenseType").value =
      r?.expense_type || "";

  if ($("reqNotes"))
    $("reqNotes").value =
      r?.notes || "";

  updateAllVehicleSelects();

  if ($("reqVehicle"))
    $("reqVehicle").value =
      r?.vehicle_id || "";

  if ($("reqModalTitle"))
    $("reqModalTitle")
      .textContent =
      r
        ? "Edit Requisition"
        : "New Requisition";

  openModal("reqModal");
}

function editReq(id) {
  openReqModal(id);
}

async function saveReq(event) {
  event.preventDefault();

  const id =
    $("reqId")?.value;

  const quantity =
    num(
      $("reqQuantity")
        ?.value
    );

  const unitCost =
    num(
      $("reqUnitCost")
        ?.value
    );

  const payload = {
    req_no:
      $("reqNo")?.value.trim(),
    req_date:
      $("reqDate")?.value,
    requested_by:
      $("reqRequestedBy")
        ?.value.trim(),
    vehicle_id:
      $("reqVehicle")?.value ||
      null,
    item_description:
      $("reqItemDescription")
        ?.value.trim(),
    quantity,
    unit_cost: unitCost,
    total_amount:
      quantity * unitCost,
    status:
      $("reqStatus")?.value ||
      "Pending",
    category:
      $("reqCategory")?.value ||
      "",
    expense_type:
      $("reqExpenseType")
        ?.value || "",
    notes:
      $("reqNotes")
        ?.value.trim() || ""
  };

  const result = id
    ? await supabase
        .from("requisitions")
        .update(payload)
        .eq("id", id)
    : await supabase
        .from("requisitions")
        .insert(payload);

  if (result.error) {
    toast(
      "Requisition error: " +
        result.error.message,
      true
    );
    return;
  }

  closeModal("reqModal");
  toast("Requisition saved.");
  await loadAllData();
}

async function deleteReq(id) {
  if (
    !confirm(
      "Delete this requisition?"
    )
  )
    return;

  const { error } =
    await supabase
      .from("requisitions")
      .delete()
      .eq("id", id);

  if (error) {
    toast(
      "Delete failed: " +
        error.message,
      true
    );
    return;
  }

  toast("Requisition deleted.");
  await loadAllData();
}

function printRequisitions() {
  const rows =
    filteredReqs();

  printHTML(
    `
      <div class="preview-paper">
        <div class="preview-head">
          <h1>REQUISITION REPORT</h1>
        </div>

        <table class="preview-table">
          <thead>
            <tr>
              <th>Req No.</th>
              <th>Date</th>
              <th>Requested By</th>
              <th>Vehicle</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            ${rows
              .map(r => {
                const v =
                  findVehicle(
                    r.vehicle_id
                  );

                return `
                  <tr>
                    <td>${esc(
                      r.req_no
                    )}</td>
                    <td>${esc(
                      r.req_date
                    )}</td>
                    <td>${esc(
                      r.requested_by
                    )}</td>
                    <td>${esc(
                      vehicleLabel(v)
                    )}</td>
                    <td>${esc(
                      r.item_description
                    )}</td>
                    <td>${num(
                      r.quantity
                    )}</td>
                    <td>${money(
                      r.total_amount
                    )}</td>
                    <td>${esc(
                      r.status
                    )}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `,
    "Requisitions"
  );
}

/* =========================================================
   INVOICES
   ========================================================= */

function invoiceTotal(i) {
  return (
    num(i.labour) +
    num(i.parts) +
    num(i.other)
  );
}

function invoiceBalance(i) {
  return Math.max(
    0,
    invoiceTotal(i) -
      num(i.paid)
  );
}

function invoiceStatus(i) {
  const total =
    invoiceTotal(i);

  const paid =
    num(i.paid);

  if (paid <= 0)
    return "Unpaid";

  if (paid >= total)
    return "Paid";

  return "Part Paid";
}

function filteredInvoices() {
  const search =
    String(
      $("invoiceSearch")
        ?.value || ""
    ).toLowerCase();

  const status =
    $("invoiceStatusFilter")
      ?.value || "";

  return invoices.filter(i => {
    const v =
      findVehicle(
        i.vehicle_id
      );

    const actual =
      i.status ||
      invoiceStatus(i);

    const text = [
      i.invoice_no,
      i.customer,
      vehicleLabel(v)
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search ||
        text.includes(search)) &&
      (!status ||
        actual === status)
    );
  });
}

function renderInvoices() {
  const body =
    $("invoicesTableBody");

  if (!body) return;

  const rows =
    filteredInvoices();

  body.innerHTML = rows.length
    ? rows
        .map(i => {
          const v =
            findVehicle(
              i.vehicle_id
            );

          const total =
            invoiceTotal(i);

          const balance =
            invoiceBalance(i);

          const status =
            i.status ||
            invoiceStatus(i);

          return `
            <tr>
              <td>${esc(
                i.invoice_no
              )}</td>

              <td>${esc(
                i.invoice_date
              )}</td>

              <td>${esc(
                vehicleLabel(v)
              )}</td>

              <td>${esc(
                i.customer
              )}</td>

              <td>${money(total)}</td>

              <td>${money(
                i.paid
              )}</td>

              <td>${money(
                balance
              )}</td>

              <td>
                <span class="status status-${statusClass(
                  status
                )}">
                  ${esc(status)}
                </span>
              </td>

              <td>
                <div class="table-actions">
                  <button
                    class="action-btn"
                    onclick="editInvoice('${esc(i.id)}')">
                    ✏️
                  </button>

                  <button
                    class="action-btn danger"
                    onclick="deleteInvoice('${esc(i.id)}')">
                    🗑
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td colspan="9"
            style="text-align:center;padding:25px">
          No invoices found.
        </td>
      </tr>
    `;
}

function updateInvoiceTotals() {
  const total =
    num(
      $("invoiceLabour")
        ?.value
    ) +
    num(
      $("invoiceParts")
        ?.value
    ) +
    num(
      $("invoiceOther")
        ?.value
    );

  const paid =
    num(
      $("invoicePaid")
        ?.value
    );

  if ($("invoiceSubtotal"))
    $("invoiceSubtotal").value =
      total;

  if ($("invoiceBalance"))
    $("invoiceBalance").value =
      Math.max(
        0,
        total - paid
      );

  if ($("invoiceStatus"))
    $("invoiceStatus").value =
      paid <= 0
        ? "Unpaid"
        : paid >= total
        ? "Paid"
        : "Part Paid";
}

function openInvoiceModal(
  vehicleId = ""
) {
  $("invoiceForm")?.reset();

  if ($("invoiceId"))
    $("invoiceId").value =
      "";

  if ($("invoiceNo"))
    $("invoiceNo").value =
      "INV-" +
      new Date()
        .getFullYear() +
      "-" +
      String(
        invoices.length + 1
      ).padStart(4, "0");

  if ($("invoiceDate"))
    $("invoiceDate").value =
      today();

  updateAllVehicleSelects();

  if ($("invoiceVehicle"))
    $("invoiceVehicle").value =
      vehicleId || "";

  const v =
    findVehicle(
      $("invoiceVehicle")
        ?.value
    );

  if ($("invoiceCustomer"))
    $("invoiceCustomer").value =
      v?.customer || "";

  [
    "invoiceLabour",
    "invoiceParts",
    "invoiceOther",
    "invoicePaid"
  ].forEach(id => {
    if ($(id))
      $(id).value = 0;
  });

  updateInvoiceTotals();

  if ($("invoiceModalTitle"))
    $("invoiceModalTitle")
      .textContent =
      "New Invoice";

  openModal("invoiceModal");
}

function editInvoice(id) {
  const i =
    invoices.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!i) return;

  $("invoiceForm")?.reset();

  const values = {
    invoiceId: i.id,
    invoiceNo:
      i.invoice_no || "",
    invoiceDate:
      i.invoice_date ||
      today(),
    invoiceCustomer:
      i.customer || "",
    invoiceJobDescription:
      i.job_description ||
      "",
    invoiceLabour:
      i.labour ?? 0,
    invoiceParts:
      i.parts ?? 0,
    invoiceOther:
      i.other ?? 0,
    invoicePaid:
      i.paid ?? 0,
    invoiceNotes:
      i.notes || ""
  };

  updateAllVehicleSelects();

  Object.entries(values).forEach(
    ([id, value]) => {
      if ($(id))
        $(id).value = value;
    }
  );

  if ($("invoiceVehicle"))
    $("invoiceVehicle").value =
      i.vehicle_id || "";

  updateInvoiceTotals();

  if ($("invoiceModalTitle"))
    $("invoiceModalTitle")
      .textContent =
      "Edit Invoice";

  openModal("invoiceModal");
}

async function saveInvoice(event) {
  event.preventDefault();

  updateInvoiceTotals();

  const id =
    $("invoiceId")?.value;

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
    labour + parts + other;

  const payload = {
    invoice_no:
      $("invoiceNo")
        ?.value.trim(),
    invoice_date:
      $("invoiceDate")
        ?.value,
    vehicle_id:
      $("invoiceVehicle")
        ?.value || null,
    customer:
      $("invoiceCustomer")
        ?.value.trim() || "",
    job_description:
      $("invoiceJobDescription")
        ?.value.trim() || "",
    labour,
    parts,
    other,
    subtotal,
    paid,
    balance:
      Math.max(
        0,
        subtotal - paid
      ),
    status:
      $("invoiceStatus")
        ?.value ||
      invoiceStatus({
        labour,
        parts,
        other,
        paid
      }),
    notes:
      $("invoiceNotes")
        ?.value.trim() || ""
  };

  const result = id
    ? await supabase
        .from("invoices")
        .update(payload)
        .eq("id", id)
    : await supabase
        .from("invoices")
        .insert(payload);

  if (result.error) {
    toast(
      "Invoice error: " +
        result.error.message,
      true
    );
    return;
  }

  closeModal("invoiceModal");
  toast("Invoice saved.");
  await loadAllData();
}

async function deleteInvoice(id) {
  if (
    !confirm(
      "Delete this invoice?"
    )
  )
    return;

  const { error } =
    await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

  if (error) {
    toast(
      "Invoice delete failed: " +
        error.message,
      true
    );
    return;
  }

  toast("Invoice deleted.");
  await loadAllData();
}

function printInvoices() {
  const rows =
    filteredInvoices();

  printHTML(
    `
      <div class="preview-paper">
        <div class="preview-head">
          <h1>INVOICE REPORT</h1>
        </div>

        <table class="preview-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            ${rows
              .map(i => {
                const v =
                  findVehicle(
                    i.vehicle_id
                  );

                return `
                  <tr>
                    <td>${esc(
                      i.invoice_no
                    )}</td>
                    <td>${esc(
                      i.invoice_date
                    )}</td>
                    <td>${esc(
                      vehicleLabel(v)
                    )}</td>
                    <td>${esc(
                      i.customer
                    )}</td>
                    <td>${money(
                      invoiceTotal(i)
                    )}</td>
                    <td>${money(
                      i.paid
                    )}</td>
                    <td>${money(
                      invoiceBalance(i)
                    )}</td>
                    <td>${esc(
                      i.status ||
                        invoiceStatus(i)
                    )}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `,
    "Invoices"
  );
}

/* =========================================================
   GATE PASSES
   ========================================================= */

function filteredGatePasses() {
  const search =
    String(
      $("gateSearch")
        ?.value || ""
    ).toLowerCase();

  const status =
    $("gateStatusFilter")
      ?.value || "";

  return gatePasses.filter(g => {
    const v =
      findVehicle(
        g.vehicle_id
      );

    const text = [
      g.gate_pass_no,
      g.customer,
      g.released_to,
      g.invoice_no,
      vehicleLabel(v)
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search ||
        text.includes(search)) &&
      (!status ||
        g.status === status)
    );
  });
}

function renderGatePasses() {
  const body =
    $("gatePassesTableBody");

  if (!body) return;

  const rows =
    filteredGatePasses();

  body.innerHTML = rows.length
    ? rows
        .map(g => {
          const v =
            findVehicle(
              g.vehicle_id
            );

          const paid =
            num(g.paid);

          const balance =
            g.balance != null
              ? num(g.balance)
              : Math.max(
                  0,
                  num(v?.billed) -
                    paid
                );

          return `
            <tr>
              <td>${esc(
                g.gate_pass_no
              )}</td>

              <td>${esc(
                g.pass_date
              )}</td>

              <td>${esc(
                vehicleLabel(v)
              )}</td>

              <td>${esc(
                g.customer ||
                  v?.customer ||
                  ""
              )}</td>

              <td>${esc(
                g.released_to
              )}</td>

              <td>${esc(
                g.invoice_no || ""
              )}</td>

              <td>${money(
                paid
              )}</td>

              <td>${money(
                balance
              )}</td>

              <td>
                <span class="status status-${statusClass(
                  g.status
                )}">
                  ${esc(
                    g.status ||
                      "Pending"
                  )}
                </span>
              </td>

              <td>
                <div class="table-actions">
                  <button
                    class="action-btn"
                    onclick="editGatePass('${esc(g.id)}')">
                    ✏️
                  </button>

                  <button
                    class="action-btn danger"
                    onclick="deleteGatePass('${esc(g.id)}')">
                    🗑
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td colspan="10"
            style="text-align:center;padding:25px">
          No gate passes found.
        </td>
      </tr>
    `;
}

function updateGateBalance() {
  const v =
    findVehicle(
      $("gateVehicle")
        ?.value
    );

  const paid =
    num(
      $("gatePaid")
        ?.value
    );

  if ($("gateBalance"))
    $("gateBalance").value =
      Math.max(
        0,
        num(v?.billed) - paid
      );
}

function fillGateVehicleData() {
  const v =
    findVehicle(
      $("gateVehicle")
        ?.value
    );

  if (!v) {
    if ($("gateVehicleRegistration"))
      $("gateVehicleRegistration")
        .value = "";

    if ($("gateCustomer"))
      $("gateCustomer").value =
        "";

    updateGateBalance();
    return;
  }

  if ($("gateVehicleRegistration"))
    $("gateVehicleRegistration")
      .value =
      vehicleLabel(v);

  if ($("gateCustomer"))
    $("gateCustomer").value =
      v.customer || "";

  updateGateBalance();
}

function openGatePassModal(
  vehicleId = ""
) {
  $("gatePassForm")?.reset();

  if ($("gatePassId"))
    $("gatePassId").value =
      "";

  if ($("gatePassNo"))
    $("gatePassNo").value =
      "GP-" +
      new Date()
        .getFullYear() +
      "-" +
      String(
        gatePasses.length + 1
      ).padStart(4, "0");

  if ($("gatePassDate"))
    $("gatePassDate").value =
      today();

  updateAllVehicleSelects();

  if ($("gateVehicle"))
    $("gateVehicle").value =
      vehicleId || "";

  if ($("gateAuthorizedBy"))
    $("gateAuthorizedBy").value =
      "Josephine";

  if ($("gateStatus"))
    $("gateStatus").value =
      "Pending";

  fillGateVehicleData();

  if ($("gatePassModalTitle"))
    $("gatePassModalTitle")
      .textContent =
      "New Gate Pass";

  openModal("gatePassModal");
}

function editGatePass(id) {
  const g =
    gatePasses.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!g) return;

  $("gatePassForm")?.reset();

  const values = {
    gatePassId: g.id,
    gatePassNo:
      g.gate_pass_no || "",
    gatePassDate:
      g.pass_date || today(),
    gateCustomer:
      g.customer || "",
    gateReleasedTo:
      g.released_to || "",
    gateReleasedContact:
      g.released_contact || "",
    gateInvoice:
      g.invoice_no || "",
    gatePaid:
      g.paid ?? 0,
    gateAuthorizedBy:
      g.authorized_by ||
      "Josephine",
    gateStatus:
      g.status || "Pending",
    gateNotes:
      g.notes || ""
  };

  updateAllVehicleSelects();

  Object.entries(values).forEach(
    ([id, value]) => {
      if ($(id))
        $(id).value = value;
    }
  );

  if ($("gateVehicle"))
    $("gateVehicle").value =
      g.vehicle_id || "";

  fillGateVehicleData();

  if ($("gatePassModalTitle"))
    $("gatePassModalTitle")
      .textContent =
      "Edit Gate Pass";

  openModal("gatePassModal");
}

async function saveGatePass(event) {
  event.preventDefault();

  const id =
    $("gatePassId")
      ?.value;

  const vehicle =
    findVehicle(
      $("gateVehicle")
        ?.value
    );

  const paid =
    num(
      $("gatePaid")
        ?.value
    );

  const balance =
    Math.max(
      0,
      num(vehicle?.billed) -
        paid
    );

  const payload = {
    gate_pass_no:
      $("gatePassNo")
        ?.value.trim(),
    pass_date:
      $("gatePassDate")
        ?.value ||
      today(),
    vehicle_id:
      $("gateVehicle")
        ?.value || null,
    vehicle_registration:
      vehicle?.registration ||
      "",
    customer:
      $("gateCustomer")
        ?.value.trim() ||
      vehicle?.customer ||
      "",
    released_to:
      $("gateReleasedTo")
        ?.value.trim() ||
      "",
    released_contact:
      $("gateReleasedContact")
        ?.value.trim() ||
      "",
    invoice_no:
      $("gateInvoice")
        ?.value.trim() ||
      "",
    paid,
    balance,
    authorized_by:
      $("gateAuthorizedBy")
        ?.value.trim() ||
      "Josephine",
    status:
      $("gateStatus")
        ?.value ||
      "Pending",
    notes:
      $("gateNotes")
        ?.value.trim() ||
      ""
  };

  const result = id
    ? await supabase
        .from("gate_passes")
        .update(payload)
        .eq("id", id)
    : await supabase
        .from("gate_passes")
        .insert(payload);

  if (result.error) {
    console.error(
      "GATE PASS ERROR",
      result.error,
      payload
    );

    toast(
      "Gate Pass error: " +
        result.error.message,
      true
    );

    return;
  }

  closeModal(
    "gatePassModal"
  );

  toast(
    id
      ? "Gate Pass updated."
      : "Gate Pass created."
  );

  await loadAllData();
}

async function deleteGatePass(id) {
  if (
    !confirm(
      "Delete this Gate Pass?"
    )
  )
    return;

  const { error } =
    await supabase
      .from("gate_passes")
      .delete()
      .eq("id", id);

  if (error) {
    toast(
      "Gate Pass delete failed: " +
        error.message,
      true
    );
    return;
  }

  toast("Gate Pass deleted.");
  await loadAllData();
}

function printGatePasses() {
  const rows =
    filteredGatePasses();

  printHTML(
    `
      <div class="preview-paper">
        <div class="preview-head">
          <h1>GATE PASS REPORT</h1>
        </div>

        <table class="preview-table">
          <thead>
            <tr>
              <th>Gate Pass</th>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Customer</th>
              <th>Released To</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            ${rows
              .map(g => {
                const v =
                  findVehicle(
                    g.vehicle_id
                  );

                return `
                  <tr>
                    <td>${esc(
                      g.gate_pass_no
                    )}</td>
                    <td>${esc(
                      g.pass_date
                    )}</td>
                    <td>${esc(
                      vehicleLabel(v)
                    )}</td>
                    <td>${esc(
                      g.customer
                    )}</td>
                    <td>${esc(
                      g.released_to
                    )}</td>
                    <td>${money(
                      g.paid
                    )}</td>
                    <td>${money(
                      g.balance
                    )}</td>
                    <td>${esc(
                      g.status
                    )}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `,
    "Gate Passes"
  );
}

/* =========================================================
   VEHICLE PRINT
   ========================================================= */

function printVehicles() {
  const rows =
    filteredVehicles();

  printHTML(
    `
      <div class="preview-paper">

        <div class="preview-head">
          <h1>VEHICLE REPORT</h1>
        </div>

        <table class="preview-table">
          <thead>
            <tr>
              <th>Registration</th>
              <th>Customer</th>
              <th>Date In</th>
              <th>Job</th>
              <th>Status</th>
              <th>Storage Days</th>
              <th>Billed</th>
              <th>Paid</th>
              <th>Expenses</th>
            </tr>
          </thead>

          <tbody>
            ${rows
              .map(
                v => `
                  <tr>
                    <td>${esc(
                      vehicleLabel(v)
                    )}</td>
                    <td>${esc(
                      v.customer
                    )}</td>
                    <td>${esc(
                      v.date_in
                    )}</td>
                    <td>${esc(
                      v.job_type
                    )}</td>
                    <td>${esc(
                      v.status
                    )}</td>
                    <td>${storageDays(
                      v
                    )}</td>
                    <td>${money(
                      v.billed
                    )}</td>
                    <td>${money(
                      v.paid
                    )}</td>
                    <td>${money(
                      vehicleExpenseTotal(
                        v.id
                      )
                    )}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `,
    "Vehicles"
  );
}

/* =========================================================
   PRINT ENGINE
   ========================================================= */

function printHTML(
  html,
  title
) {
  const win =
    window.open(
      "",
      "_blank",
      "width=1100,height=800"
    );

  if (!win) {
    toast(
      "Allow pop-ups to print.",
      true
    );
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${esc(title)}</title>

      <meta
        name="viewport"
        content="width=device-width,initial-scale=1"
      >

      <style>
        *{
          box-sizing:border-box;
        }

        body{
          margin:0;
          padding:20px;
          font-family:Arial,sans-serif;
          color:#172033;
        }

        .preview-paper{
          max-width:1100px;
          margin:auto;
        }

        .preview-head{
          text-align:center;
          border-bottom:2px solid #07111f;
          padding-bottom:15px;
          margin-bottom:18px;
        }

        .preview-head h1{
          margin:0;
          font-size:22px;
        }

        table{
          width:100%;
          border-collapse:collapse;
        }

        th,td{
          border:1px solid #dfe4ea;
          padding:8px;
          font-size:12px;
          text-align:left;
        }

        th{
          background:#f1f5f9;
        }

        .preview-total{
          margin-top:18px;
          margin-left:auto;
          max-width:350px;
        }

        .grand{
          display:flex;
          justify-content:space-between;
          border-top:2px solid #07111f;
          padding-top:8px;
          font-weight:bold;
        }

        @media print{
          body{
            padding:0;
          }
        }
      </style>
    </head>

    <body>
      ${html}

      <script>
        window.onload=function(){
          setTimeout(function(){
            window.print();
          },300);
        };
      <\/script>
    </body>
    </html>
  `);

  win.document.close();
}

function printCurrentPreview() {
  if (previewHTML)
    printHTML(
      previewHTML,
      "Garage Operations"
    );
}

/* =========================================================
   RENDER
   ========================================================= */

function renderEverything() {
  renderDashboard();
  renderVehicles();
  renderExpenses();
  renderPettyCash();
  renderRequisitions();
  renderInvoices();
  renderGatePasses();
  updateAllVehicleSelects();
}

/* =========================================================
   HORIZONTAL ACTION BUTTONS
   ========================================================= */

function installActionCSS() {
  if ($("garageActionStyle"))
    return;

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "garageActionStyle";

  style.textContent = `
    .table-actions{
      display:flex!important;
      flex-direction:row!important;
      flex-wrap:nowrap!important;
      align-items:center!important;
      justify-content:flex-start!important;
      gap:5px!important;
      min-width:max-content!important;
      white-space:nowrap!important;
    }

    .action-btn{
      width:36px!important;
      height:36px!important;
      min-width:36px!important;
      padding:0!important;
      margin:0!important;
      flex:0 0 36px!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      white-space:nowrap!important;
    }

    .table-card,
    .table-responsive,
    .table-wrap{
      overflow-x:auto!important;
    }

    @media(max-width:720px){
      .action-btn{
        width:34px!important;
        height:34px!important;
        min-width:34px!important;
        flex-basis:34px!important;
        font-size:14px!important;
      }
    }
  `;

  document.head.appendChild(style);
}

/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

  /* Forms */
  listen(
    "vehicleForm",
    "submit",
    saveVehicle
  );

  listen(
    "expenseForm",
    "submit",
    saveExpense
  );

  listen(
    "pettyForm",
    "submit",
    savePetty
  );

  listen(
    "reqForm",
    "submit",
    saveReq
  );

  listen(
    "invoiceForm",
    "submit",
    saveInvoice
  );

  listen(
    "gatePassForm",
    "submit",
    saveGatePass
  );

  /* Vehicle */
  listen(
    "vehicleSearch",
    "input",
    renderVehicles
  );

  listen(
    "vehicleStatusFilter",
    "change",
    renderVehicles
  );

  listen(
    "vehicleDateIn",
    "change",
    updateVehicleStorageDays
  );

  listen(
    "vehicleDateOut",
    "change",
    updateVehicleStorageDays
  );

  /* Expenses */
  listen(
    "expenseSearch",
    "input",
    renderExpenses
  );

  listen(
    "expenseCategoryFilter",
    "change",
    renderExpenses
  );

  /* Petty */
  listen(
    "pettySearch",
    "input",
    renderPettyCash
  );

  listen(
    "pettyCategoryFilter",
    "change",
    renderPettyCash
  );

  /* Requisitions */
  listen(
    "reqSearch",
    "input",
    renderRequisitions
  );

  listen(
    "reqStatusFilter",
    "change",
    renderRequisitions
  );

  listen(
    "reqQuantity",
    "input",
    updateReqTotal
  );

  listen(
    "reqUnitCost",
    "input",
    updateReqTotal
  );

  /* Invoices */
  listen(
    "invoiceSearch",
    "input",
    renderInvoices
  );

  listen(
    "invoiceStatusFilter",
    "change",
    renderInvoices
  );

  [
    "invoiceLabour",
    "invoiceParts",
    "invoiceOther",
    "invoicePaid"
  ].forEach(id =>
    listen(
      id,
      "input",
      updateInvoiceTotals
    )
  );

  listen(
    "invoiceVehicle",
    "change",
    () => {
      const v =
        findVehicle(
          $("invoiceVehicle")
            ?.value
        );

      if (
        v &&
        $("invoiceCustomer")
      ) {
        $("invoiceCustomer")
          .value =
          v.customer || "";
      }
    }
  );

  /* Gate Pass */
  listen(
    "gateSearch",
    "input",
    renderGatePasses
  );

  listen(
    "gateStatusFilter",
    "change",
    renderGatePasses
  );

  listen(
    "gateVehicle",
    "change",
    fillGateVehicleData
  );

  listen(
    "gatePaid",
    "input",
    updateGateBalance
  );

  /*
    Close modal by clicking backdrop.
  */
  document.addEventListener(
    "click",
    event => {
      if (
        event.target.classList?.contains(
          "modal"
        )
      ) {
        event.target.classList.remove(
          "show"
        );
      }
    }
  );
}

/* =========================================================
   LOGIN
   ========================================================= */

function setupUser() {
  const user =
    sessionStorage.getItem(
      "garageUser"
    ) || "josephine";

  const name =
    user.charAt(0).toUpperCase() +
    user.slice(1);

  if ($("sidebarUser"))
    $("sidebarUser")
      .textContent = name;

  if ($("welcomeUser"))
    $("welcomeUser")
      .textContent =
      name.charAt(0);
}

/* =========================================================
   GLOBAL FUNCTIONS
   =========================================================
   Required because index.html uses onclick=""
   ========================================================= */

Object.assign(
  window,
  {
    showSection,
    openVehicleModal,
    editVehicle,
    deleteVehicle,
    viewVehicleExpenses,
    printVehicleExpensePreview,
    openExpenseModal,
    editExpense,
    deleteExpense,
    printExpenses,
    openPettyModal,
    editPetty,
    deletePetty,
    printPettyCash,
    openReqModal,
    editReq,
    deleteReq,
    printRequisitions,
    openInvoiceModal,
    editInvoice,
    deleteInvoice,
    printInvoices,
    openGatePassModal,
    editGatePass,
    deleteGatePass,
    printGatePasses,
    printVehicles,
    printCurrentPreview,
    closeModal,
    openModal
  }
);

/* =========================================================
   START
   ========================================================= */

async function startApp() {
  installActionCSS();
  setupUser();
  setupEvents();

  /*
    Make sure login/app visibility
    remains compatible with existing HTML.
  */
  if (
    sessionStorage.getItem(
      "garageLoggedIn"
    ) === "true"
  ) {
    if ($("loginPage"))
      $("loginPage").style.display =
        "none";

    if ($("app"))
      $("app").style.display =
        "flex";
  }

  /*
    Default dates.
  */
  [
    "vehicleDateIn",
    "expenseDate",
    "pettyDate",
    "reqDate",
    "invoiceDate",
    "gatePassDate"
  ].forEach(id => {
    if (
      $(id) &&
      !$(id).value
    ) {
      $(id).value =
        today();
    }
  });

  showSection("dashboard");

  /*
    Load everything from Supabase.
  */
  await loadAllData();

  /*
    Dashboard cards are installed
    AFTER the dashboard exists.
  */
  setupDashboardCards();
}

startApp();
