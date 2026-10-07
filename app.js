import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO - SHORT COMPLETE APP.JS
   ========================================================= */

const SUPABASE_URL = "https://ptluwoeogfkqavhspdjj.supabase.co";

/* Use your existing Supabase publishable/anon key here */
const SUPABASE_KEY = "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];
let invoices = [];
let gatePasses = [];

let selectedVehicle = null;
let previewHTML = "";
let vehicleExpenseHTML = "";

const $ = id => document.getElementById(id);

const today = () => new Date().toISOString().slice(0, 10);

const money = n =>
  "KSh " + Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const num = n => Number(n || 0);

const esc = value =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/* =========================================================
   REGISTRATION NORMALIZATION
   ========================================================= */

function normalizeRegistration(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function vehicleLabel(v) {
  if (!v) return "General";
  return v.registration || v.chassis_no || "Vehicle";
}

function findVehicle(id) {
  return vehicles.find(v => String(v.id) === String(id));
}

function storageDays(v) {
  if (!v || !v.date_in) return 0;

  const start = new Date(v.date_in + "T00:00:00");
  const end = v.date_out
    ? new Date(v.date_out + "T00:00:00")
    : new Date();

  const days = Math.floor((end - start) / 86400000);

  return Math.max(0, days);
}

function statusClass(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

/* =========================================================
   TOAST / MODALS
   ========================================================= */

function toast(message, error = false) {
  const el = $("toast");
  if (!el) return;

  el.textContent = message;
  el.style.display = "block";
  el.style.background = error ? "#b42318" : "#07111f";

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    el.style.display = "none";
  }, 3500);
}

function closeModal(id) {
  const el = $(id);
  if (el) el.classList.remove("show");
}

function openModal(id) {
  const el = $(id);
  if (el) el.classList.add("show");
}

/* =========================================================
   LOAD DATA
   ========================================================= */

async function loadTable(table) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*");

    if (error) {
      console.error("LOAD " + table, error);
      toast("Could not load " + table + ": " + error.message, true);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error(e);
    toast("Could not load " + table, true);
    return [];
  }
}

async function loadAllData() {
  const results = await Promise.all([
    loadTable("vehicles"),
    loadTable("expenses"),
    loadTable("petty_cash"),
    loadTable("requisitions"),
    loadTable("invoices"),
    loadTable("gate_passes")
  ]);

  vehicles = results[0] || [];
  expenses = results[1] || [];
  pettyCash = results[2] || [];
  requisitions = results[3] || [];
  invoices = results[4] || [];
  gatePasses = results[5] || [];

  /*
    IMPORTANT:
    Clean duplicate vehicles every time data is loaded.
    This protects the display even if duplicates already
    exist in Supabase.
  */
  await cleanDuplicateVehicles();

  renderEverything();
}

/* =========================================================
   DUPLICATE VEHICLE CLEANER
   ========================================================= */

async function cleanDuplicateVehicles() {
  const seen = new Map();
  const duplicates = [];

  for (const v of vehicles) {
    const key = normalizeRegistration(v.registration);

    if (!key) continue;

    if (!seen.has(key)) {
      seen.set(key, v);
    } else {
      duplicates.push(v);
    }
  }

  if (!duplicates.length) return;

  console.warn("Duplicate vehicles found:", duplicates);

  for (const duplicate of duplicates) {
    try {
      /*
        Delete linked records first.
        This prevents foreign-key problems.
      */
      await deleteLinkedVehicleRecords(duplicate.id);

      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", duplicate.id);

      if (error) {
        console.error(
          "Could not remove duplicate vehicle:",
          duplicate.registration,
          error
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  /*
    Reload clean list from database.
  */
  const { data, error } = await supabase
    .from("vehicles")
    .select("*");

  if (!error && data) {
    vehicles = data;
  }

  toast(
    duplicates.length +
      " duplicate vehicle record" +
      (duplicates.length === 1 ? "" : "s") +
      " removed."
  );
}

/* =========================================================
   DELETE LINKED RECORDS
   ========================================================= */

async function deleteLinkedVehicleRecords(vehicleId) {
  const tables = [
    "expenses",
    "requisitions",
    "invoices",
    "gate_passes"
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("vehicle_id", vehicleId);

      /*
        If an optional table does not exist, continue.
      */
      if (error) {
        console.warn(
          "Linked delete " + table + ":",
          error.message
        );
      }
    } catch (e) {
      console.warn(table, e);
    }
  }
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function showSection(section, button) {
  document.querySelectorAll(".app-section").forEach(el => {
    el.classList.remove("active");
    el.style.display = "none";
  });

  const target = $(section);

  if (target) {
    target.classList.add("active");
    target.style.display = "block";
  }

  document
    .querySelectorAll(".nav-btn,.mobile-nav-btn")
    .forEach(btn => btn.classList.remove("active"));

  document
    .querySelectorAll(
      `[data-section="${section}"]`
    )
    .forEach(btn => btn.classList.add("active"));

  if (button) button.classList.add("active");
}

/* =========================================================
   VEHICLE SELECTS
   ========================================================= */

function fillVehicleSelect(id, selected = "") {
  const select = $(id);
  if (!select) return;

  select.innerHTML =
    `<option value="">Select vehicle</option>` +
    vehicles
      .slice()
      .sort((a, b) =>
        vehicleLabel(a).localeCompare(vehicleLabel(b))
      )
      .map(
        v =>
          `<option value="${esc(v.id)}" ${
            String(v.id) === String(selected)
              ? "selected"
              : ""
          }>${esc(vehicleLabel(v))}${
            v.customer
              ? " — " + esc(v.customer)
              : ""
          }</option>`
      )
      .join("");
}

function updateAllVehicleSelects() {
  fillVehicleSelect(
    "expenseVehicle",
    $("expenseVehicle")?.value
  );

  fillVehicleSelect(
    "reqVehicle",
    $("reqVehicle")?.value
  );

  fillVehicleSelect(
    "invoiceVehicle",
    $("invoiceVehicle")?.value
  );

  fillVehicleSelect(
    "gateVehicle",
    $("gateVehicle")?.value
  );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {
  const billed = vehicles.reduce(
    (s, v) => s + num(v.billed),
    0
  );

  const paid = vehicles.reduce(
    (s, v) => s + num(v.paid),
    0
  );

  const outstanding = vehicles.reduce(
    (s, v) =>
      s + Math.max(0, num(v.billed) - num(v.paid)),
    0
  );

  const totalExpenses = expenses.reduce(
    (s, e) => s + num(e.amount),
    0
  );

  const totalPetty = pettyCash.reduce(
    (s, p) => s + num(p.amount),
    0
  );

  const repairCount = vehicles.filter(
    v => v.status === "Under Repair"
  ).length;

  const set = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value;
  };

  set("dashVehicles", vehicles.length);
  set("dashRepair", repairCount);
  set("dashOutstanding", money(outstanding));
  set("dashReq", requisitions.length);
  set("dashInvoices", invoices.length);
  set("dashGatePasses", gatePasses.length);
  set("dashBilled", money(billed));
  set("dashPaid", money(paid));
  set("dashExpenses", money(totalExpenses));
  set("dashPetty", money(totalPetty));

  set("dashReqCount", requisitions.length);

  set(
    "dashReqTotal",
    money(
      requisitions.reduce(
        (s, r) => s + num(r.total_amount),
        0
      )
    )
  );

  set(
    "reqOverallTotal",
    money(
      requisitions.reduce(
        (s, r) => s + num(r.total_amount),
        0
      )
    )
  );

  const statusBox = $("vehicleStatusSummary");

  if (statusBox) {
    const statuses = [
      "Storage",
      "Under Repair",
      "Completed",
      "Released"
    ];

    statusBox.innerHTML = statuses
      .map(status => {
        const count = vehicles.filter(
          v => v.status === status
        ).length;

        return `
          <div class="status-row">
            <span>
              <span class="status status-${statusClass(status)}">
                ${esc(status)}
              </span>
            </span>
            <strong>${count}</strong>
          </div>
        `;
      })
      .join("");
  }

  renderChart();
  renderActivity();
}

function renderChart() {
  const box = $("monthlyExpenseChart");
  if (!box) return;

  const months = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);

    months.push({
      key:
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0"),
      name: d.toLocaleString("en", {
        month: "short"
      }),
      total: 0
    });
  }

  expenses.forEach(e => {
    const date = String(
      e.expense_date || e.date || ""
    ).slice(0, 7);

    const month = months.find(
      m => m.key === date
    );

    if (month) month.total += num(e.amount);
  });

  const max = Math.max(
    ...months.map(m => m.total),
    1
  );

  box.innerHTML = months
    .map(
      m => `
        <div style="flex:1;text-align:center">
          <div
            class="chart-bar"
            style="height:${Math.max(
              25,
              (m.total / max) * 170
            )}px"
            title="${esc(money(m.total))}">
          </div>
          <small>${esc(m.name)}</small>
        </div>
      `
    )
    .join("");
}

function renderActivity() {
  const box = $("dashboardActivity");
  if (!box) return;

  const items = [];

  vehicles.slice(0, 5).forEach(v => {
    items.push({
      icon: "🚘",
      title: vehicleLabel(v),
      text: v.status || "Vehicle"
    });
  });

  expenses.slice(0, 5).forEach(e => {
    items.push({
      icon: "💳",
      title: e.description || "Expense",
      text: money(e.amount)
    });
  });

  box.innerHTML =
    items
      .slice(0, 8)
      .map(
        x => `
          <div class="activity-item">
            <div class="activity-icon">${x.icon}</div>
            <div class="activity-main">
              <strong>${esc(x.title)}</strong>
              <span>${esc(x.text)}</span>
            </div>
          </div>
        `
      )
      .join("") ||
    `<div class="activity-item">
       No recent activity.
     </div>`;
}

/* =========================================================
   VEHICLES
   ========================================================= */

function vehicleExpenseTotal(id) {
  return expenses
    .filter(e => String(e.vehicle_id) === String(id))
    .reduce((s, e) => s + num(e.amount), 0);
}

function getFilteredVehicles() {
  const search =
    String($("vehicleSearch")?.value || "")
      .trim()
      .toLowerCase();

  const status =
    $("vehicleStatusFilter")?.value || "";

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
      (!search || text.includes(search)) &&
      (!status || v.status === status)
    );
  });
}

function renderVehicles() {
  const body = $("vehiclesTableBody");
  if (!body) return;

  const rows = getFilteredVehicles();

  body.innerHTML = rows.length
    ? rows
        .map(v => {
          const billed = num(v.billed);
          const paid = num(v.paid);
          const outstanding = Math.max(
            0,
            billed - paid
          );
          const exp = vehicleExpenseTotal(v.id);

          return `
            <tr>
              <td>
                <strong>${esc(vehicleLabel(v))}</strong>
              </td>
              <td>${esc(v.customer)}</td>
              <td>${esc(v.date_in || "")}</td>
              <td>${esc(v.job_type || "")}</td>
              <td>
                <span class="status status-${statusClass(
                  v.status
                )}">
                  ${esc(v.status || "")}
                </span>
              </td>
              <td>${storageDays(v)}</td>
              <td>${money(billed)}</td>
              <td>${money(paid)}</td>
              <td>${money(outstanding)}</td>
              <td>
                <strong>${money(exp)}</strong>
              </td>
              <td>
                <div class="table-actions">
                  <button
                    class="action-btn blue"
                    onclick="viewVehicleExpenses('${esc(v.id)}')"
                    title="Expenses">
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
        <td colspan="11" style="text-align:center;padding:25px">
          No vehicles found.
        </td>
      </tr>
    `;
}

function openVehicleModal(id = "") {
  const v = id ? findVehicle(id) : null;

  $("vehicleForm")?.reset();

  $("vehicleId").value = v?.id || "";
  $("vehicleModalTitle").textContent = v
    ? "Edit Vehicle"
    : "Add Vehicle";

  $("vehicleRegistration").value =
    v?.registration || "";

  $("vehicleCustomer").value =
    v?.customer || "";

  $("vehicleModel").value =
    v?.model || "";

  $("vehicleModelYear").value =
    v?.model_year || "";

  $("vehicleColor").value =
    v?.color || "";

  $("vehicleDateIn").value =
    v?.date_in || today();

  $("vehicleDateOut").value =
    v?.date_out || "";

  $("vehicleJobType").value =
    v?.job_type || "Repair";

  $("vehicleStatus").value =
    v?.status || "Storage";

  $("vehicleReleasedTo").value =
    v?.released_to || "";

  $("vehicleReleasedContact").value =
    v?.released_contact || "";

  $("vehicleBilled").value =
    v?.billed ?? 0;

  $("vehiclePaid").value =
    v?.paid ?? 0;

  $("vehicleDescription").value =
    v?.description || "";

  updateVehicleStorageDays();

  openModal("vehicleModal");
}

function editVehicle(id) {
  openVehicleModal(id);
}

function updateVehicleStorageDays() {
  const start = $("vehicleDateIn")?.value;
  const end = $("vehicleDateOut")?.value;

  if (!start) return;

  const v = {
    date_in: start,
    date_out: end
  };

  if ($("vehicleStorageDays")) {
    $("vehicleStorageDays").value =
      storageDays(v);
  }
}

function duplicateVehicle(
  registration,
  currentId = ""
) {
  const key = normalizeRegistration(registration);

  if (!key) return null;

  return (
    vehicles.find(v => {
      const same =
        normalizeRegistration(v.registration) ===
        key;

      const isCurrent =
        currentId &&
        String(v.id) === String(currentId);

      return same && !isCurrent;
    }) || null
  );
}

async function saveVehicle(e) {
  e.preventDefault();

  const id = $("vehicleId").value.trim();

  const registration =
    $("vehicleRegistration").value.trim();

  const duplicate = duplicateVehicle(
    registration,
    id
  );

  /*
    NEVER allow duplicate registration.
  */
  if (duplicate) {
    toast(
      `${vehicleLabel(
        duplicate
      )} is already registered. Duplicate vehicle was not added.`,
      true
    );

    /*
      If there are already duplicate records,
      clean them immediately.
    */
    await cleanDuplicateVehicles();

    return;
  }

  const payload = {
    registration,
    customer:
      $("vehicleCustomer").value.trim(),

    model:
      $("vehicleModel").value.trim(),

    model_year:
      $("vehicleModelYear").value
        ? Number($("vehicleModelYear").value)
        : null,

    color:
      $("vehicleColor").value.trim(),

    date_in:
      $("vehicleDateIn").value,

    date_out:
      $("vehicleDateOut").value || null,

    job_type:
      $("vehicleJobType").value,

    status:
      $("vehicleStatus").value,

    released_to:
      $("vehicleReleasedTo").value.trim(),

    released_contact:
      $("vehicleReleasedContact").value.trim(),

    billed:
      num($("vehicleBilled").value),

    paid:
      num($("vehiclePaid").value),

    description:
      $("vehicleDescription").value.trim()
  };

  let result;

  if (id) {
    result = await supabase
      .from("vehicles")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
  } else {
    result = await supabase
      .from("vehicles")
      .insert(payload)
      .select()
      .single();
  }

  if (result.error) {
    /*
      If another user/device inserted the same vehicle
      at the same time, check database again.
    */
    if (
      /duplicate|unique/i.test(
        result.error.message
      )
    ) {
      toast(
        "This vehicle already exists. It was not added.",
        true
      );
    } else {
      toast(
        "Vehicle could not be saved: " +
          result.error.message,
        true
      );
    }

    return;
  }

  closeModal("vehicleModal");

  toast(
    id
      ? "Vehicle updated successfully."
      : "Vehicle added successfully."
  );

  await loadAllData();
}

async function deleteVehicle(id) {
  const v = findVehicle(id);

  if (!v) return;

  const registration =
    vehicleLabel(v);

  if (
    !confirm(
      `Delete ${registration} permanently?\n\nIts linked expenses, requisitions, invoices and gate passes will also be deleted.`
    )
  ) {
    return;
  }

  /*
    Remove linked records first.
  */
  await deleteLinkedVehicleRecords(id);

  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", id);

  if (error) {
    toast(
      "Vehicle was NOT deleted: " +
        error.message,
      true
    );

    /*
      Reload so the screen exactly matches
      the database.
    */
    await loadAllData();
    return;
  }

  /*
    Remove immediately from local array.
  */
  vehicles = vehicles.filter(
    x => String(x.id) !== String(id)
  );

  renderEverything();

  /*
    Verify deletion.
  */
  const { data: check } = await supabase
    .from("vehicles")
    .select("id,registration")
    .eq("id", id);

  if (check && check.length) {
    toast(
      "Delete did not complete in Supabase.",
      true
    );

    await loadAllData();
    return;
  }

  toast(
    registration + " deleted successfully."
  );
}

/* =========================================================
   VEHICLE EXPENSE REPORT
   ========================================================= */

function viewVehicleExpenses(id) {
  const v = findVehicle(id);
  if (!v) return;

  selectedVehicle = v;

  const list = expenses.filter(
    e =>
      String(e.vehicle_id) ===
      String(id)
  );

  const total = list.reduce(
    (s, e) => s + num(e.amount),
    0
  );

  vehicleExpenseHTML = `
    <div class="preview-paper">
      <div class="preview-head">
        <h1>VEHICLE EXPENSE REPORT</h1>
        <p>
          Vehicle: <strong>${esc(
            vehicleLabel(v)
          )}</strong>
        </p>
        <p>
          Customer: ${esc(v.customer || "")}
        </p>
      </div>

      ${
        list.length
          ? `
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
            ${list
              .map(
                e => `
              <tr>
                <td>${esc(
                  e.expense_date || ""
                )}</td>
                <td>${esc(
                  e.description || ""
                )}</td>
                <td>${esc(
                  e.category || ""
                )}</td>
                <td>${money(e.amount)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        `
          : `<p>No expenses recorded for this vehicle.</p>`
      }

      <div class="preview-total">
        <div>
          <span>Total Expenses</span>
          <strong>${money(total)}</strong>
        </div>
      </div>
    </div>
  `;

  $("vehicleExpensePreviewContent").innerHTML =
    vehicleExpenseHTML;

  openModal(
    "vehicleExpensePreviewModal"
  );
}

function printVehicleExpensePreview() {
  if (!vehicleExpenseHTML) return;

  printHTML(
    vehicleExpenseHTML,
    "Vehicle Expense Report"
  );
}

/* =========================================================
   EXPENSES
   ========================================================= */

function getFilteredExpenses() {
  const search =
    String($("expenseSearch")?.value || "")
      .trim()
      .toLowerCase();

  const category =
    $("expenseCategoryFilter")?.value || "";

  return expenses.filter(e => {
    const v = findVehicle(e.vehicle_id);

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
      (!search || text.includes(search)) &&
      (!category || e.category === category)
    );
  });
}

function renderExpenses() {
  const body = $("expensesTableBody");
  if (!body) return;

  const rows = getFilteredExpenses();

  body.innerHTML = rows.length
    ? rows
        .map(e => {
          const v = findVehicle(e.vehicle_id);

          return `
            <tr>
              <td>${esc(
                e.expense_date || ""
              )}</td>
              <td>
                <strong>${esc(
                  vehicleLabel(v)
                )}</strong>
              </td>
              <td>${esc(
                e.description || ""
              )}</td>
              <td>${esc(
                e.category || ""
              )}</td>
              <td>
                <strong>${money(
                  e.amount
                )}</strong>
              </td>
              <td>
                <div class="table-actions">
                  <button
                    class="action-btn"
                    onclick="editExpense('${esc(
                      e.id
                    )}')">
                    ✏️
                  </button>

                  <button
                    class="action-btn danger"
                    onclick="deleteExpense('${esc(
                      e.id
                    )}')">
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
  const e = id
    ? expenses.find(
        x => String(x.id) === String(id)
      )
    : null;

  $("expenseForm")?.reset();

  $("expenseId").value = e?.id || "";

  $("expenseDate").value =
    e?.expense_date || today();

  $("expenseVehicle").value =
    e?.vehicle_id || "";

  $("expenseCategory").value =
    e?.category || "Parts";

  $("expenseAmount").value =
    e?.amount ?? "";

  $("expenseDescription").value =
    e?.description || "";

  updateAllVehicleSelects();

  if (e)
    $("expenseVehicle").value =
      e.vehicle_id || "";

  $("expenseModalTitle").textContent =
    e ? "Edit Expense" : "Add Expense";

  openModal("expenseModal");
}

function editExpense(id) {
  openExpenseModal(id);
}

async function saveExpense(e) {
  e.preventDefault();

  const id = $("expenseId").value;

  const payload = {
    vehicle_id:
      $("expenseVehicle").value || null,

    expense_date:
      $("expenseDate").value,

    description:
      $("expenseDescription").value.trim(),

    category:
      $("expenseCategory").value,

    amount:
      num($("expenseAmount").value)
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
  if (!confirm("Delete this expense?"))
    return;

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id);

  if (error) {
    toast(
      "Could not delete expense: " +
        error.message,
      true
    );
    return;
  }

  toast("Expense deleted.");
  await loadAllData();
}

function printExpenses() {
  const rows = getFilteredExpenses();

  const search =
    $("expenseSearch")?.value || "";

  const total = rows.reduce(
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
              ? "Search: " + esc(search)
              : "Current filtered results"
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
                    const v = findVehicle(
                      e.vehicle_id
                    );

                    return `
                      <tr>
                        <td>${esc(
                          e.expense_date || ""
                        )}</td>
                        <td>${esc(
                          vehicleLabel(v)
                        )}</td>
                        <td>${esc(
                          e.description || ""
                        )}</td>
                        <td>${esc(
                          e.category || ""
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
          <strong>${money(total)}</strong>
        </div>
      </div>
    </div>
  `;

  printHTML(html, "Expense Report");
}

/* =========================================================
   PETTY CASH
   ========================================================= */

function getFilteredPetty() {
  const search =
    String($("pettySearch")?.value || "")
      .toLowerCase();

  const category =
    $("pettyCategoryFilter")?.value || "";

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
      (!search || text.includes(search)) &&
      (!category || p.category === category)
    );
  });
}

function renderPettyCash() {
  const body = $("pettyTableBody");
  if (!body) return;

  const rows = getFilteredPetty();

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
            <td>${money(p.amount)}</td>
            <td>${esc(
              p.notes || ""
            )}</td>
            <td>
              <div class="table-actions">
                <button
                  class="action-btn"
                  onclick="editPetty('${esc(
                    p.id
                  )}')">
                  ✏️
                </button>
                <button
                  class="action-btn danger"
                  onclick="deletePetty('${esc(
                    p.id
                  )}')">
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
  const p = id
    ? pettyCash.find(
        x => String(x.id) === String(id)
      )
    : null;

  $("pettyForm")?.reset();

  $("pettyId").value = p?.id || "";
  $("pettyDate").value =
    p?.cash_date || today();
  $("pettyPaidTo").value =
    p?.paid_to || "";
  $("pettyCategory").value =
    p?.category || "Other";
  $("pettyAmount").value =
    p?.amount ?? "";
  $("pettyDescription").value =
    p?.description || "";
  $("pettyNotes").value =
    p?.notes || "";

  $("pettyModalTitle").textContent =
    p ? "Edit Petty Cash" : "Add Petty Cash";

  openModal("pettyModal");
}

function editPetty(id) {
  openPettyModal(id);
}

async function savePetty(e) {
  e.preventDefault();

  const id = $("pettyId").value;

  const payload = {
    cash_date: $("pettyDate").value,
    paid_to: $("pettyPaidTo").value.trim(),
    category: $("pettyCategory").value,
    amount: num($("pettyAmount").value),
    description:
      $("pettyDescription").value.trim(),
    notes:
      $("pettyNotes").value.trim()
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
  if (!confirm("Delete this petty cash record?"))
    return;

  const { error } = await supabase
    .from("petty_cash")
    .delete()
    .eq("id", id);

  if (error) {
    toast(
      "Delete failed: " + error.message,
      true
    );
    return;
  }

  await loadAllData();
  toast("Petty cash deleted.");
}

function printPettyCash() {
  const rows = getFilteredPetty();

  const html = `
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
                <td>${money(p.amount)}</td>
              </tr>
            `
            )
            .join("")}
        </tbody>
      </table>

      <div class="preview-total">
        <div class="grand">
          <span>TOTAL</span>
          <strong>${money(
            rows.reduce(
              (s, p) => s + num(p.amount),
              0
            )
          )}</strong>
        </div>
      </div>
    </div>
  `;

  printHTML(html, "Petty Cash Report");
}

/* =========================================================
   REQUISITIONS
   ========================================================= */

function getFilteredReqs() {
  const search =
    String($("reqSearch")?.value || "")
      .toLowerCase();

  const status =
    $("reqStatusFilter")?.value || "";

  return requisitions.filter(r => {
    const v = findVehicle(r.vehicle_id);

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
      (!search || text.includes(search)) &&
      (!status || r.status === status)
    );
  });
}

function renderRequisitions() {
  const body =
    $("requisitionsTableBody");

  if (!body) return;

  const rows = getFilteredReqs();

  body.innerHTML = rows.length
    ? rows
        .map(r => {
          const v = findVehicle(
            r.vehicle_id
          );

          return `
            <tr>
              <td>${esc(r.req_no)}</td>
              <td>${esc(r.req_date)}</td>
              <td>${esc(r.requested_by)}</td>
              <td>${esc(
                vehicleLabel(v)
              )}</td>
              <td>${esc(
                r.item_description
              )}</td>
              <td>${num(r.quantity)}</td>
              <td>${money(
                r.unit_cost
              )}</td>
              <td>${money(
                r.total_amount
              )}</td>
              <td>${esc(
                r.expense_type ||
                  r.category ||
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
                    onclick="editReq('${esc(
                      r.id
                    )}')">
                    ✏️
                  </button>
                  <button
                    class="action-btn danger"
                    onclick="deleteReq('${esc(
                      r.id
                    )}')">
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
  const q = num($("reqQuantity")?.value);
  const c = num($("reqUnitCost")?.value);

  if ($("reqTotal"))
    $("reqTotal").value = q * c;
}

function openReqModal(id = "") {
  const r = id
    ? requisitions.find(
        x => String(x.id) === String(id)
      )
    : null;

  $("reqForm")?.reset();

  $("reqId").value = r?.id || "";
  $("reqNo").value =
    r?.req_no ||
    "REQ-" +
      new Date().getFullYear() +
      "-" +
      String(
        requisitions.length + 1
      ).padStart(4, "0");

  $("reqDate").value =
    r?.req_date || today();

  $("reqRequestedBy").value =
    r?.requested_by || "";

  $("reqItemDescription").value =
    r?.item_description || "";

  $("reqQuantity").value =
    r?.quantity ?? 1;

  $("reqUnitCost").value =
    r?.unit_cost ?? 0;

  $("reqTotal").value =
    r?.total_amount ?? 0;

  $("reqStatus").value =
    r?.status || "Pending";

  $("reqCategory").value =
    r?.category || "";

  $("reqExpenseType").value =
    r?.expense_type || "";

  $("reqNotes").value =
    r?.notes || "";

  updateAllVehicleSelects();

  if ($("reqVehicle"))
    $("reqVehicle").value =
      r?.vehicle_id || "";

  $("reqModalTitle").textContent =
    r
      ? "Edit Requisition"
      : "New Requisition";

  openModal("reqModal");
}

function editReq(id) {
  openReqModal(id);
}

async function saveReq(e) {
  e.preventDefault();

  const id = $("reqId").value;

  const quantity =
    num($("reqQuantity").value);

  const unitCost =
    num($("reqUnitCost").value);

  const payload = {
    req_no:
      $("reqNo").value.trim(),

    req_date:
      $("reqDate").value,

    requested_by:
      $("reqRequestedBy").value.trim(),

    vehicle_id:
      $("reqVehicle").value || null,

    item_description:
      $("reqItemDescription").value.trim(),

    quantity,

    unit_cost: unitCost,

    total_amount:
      quantity * unitCost,

    status:
      $("reqStatus").value,

    category:
      $("reqCategory").value,

    expense_type:
      $("reqExpenseType").value,

    notes:
      $("reqNotes").value.trim()
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
  if (!confirm("Delete this requisition?"))
    return;

  const { error } = await supabase
    .from("requisitions")
    .delete()
    .eq("id", id);

  if (error) {
    toast(
      "Delete failed: " + error.message,
      true
    );
    return;
  }

  await loadAllData();
  toast("Requisition deleted.");
}

function printRequisitions() {
  const rows = getFilteredReqs();

  const html = `
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
              const v = findVehicle(
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
                  <td>${num(r.quantity)}</td>
                  <td>${money(
                    r.total_amount
                  )}</td>
                  <td>${esc(r.status)}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  printHTML(html, "Requisitions");
}

/* =========================================================
   INVOICES
   ========================================================= */

function invoiceSubtotal(i) {
  return (
    num(i.labour) +
    num(i.parts) +
    num(i.other)
  );
}

function invoiceBalance(i) {
  return Math.max(
    0,
    invoiceSubtotal(i) -
      num(i.paid)
  );
}

function invoiceStatus(i) {
  const total = invoiceSubtotal(i);
  const paid = num(i.paid);

  if (paid <= 0) return "Unpaid";
  if (paid >= total) return "Paid";
  return "Part Paid";
}

function getFilteredInvoices() {
  const search =
    String($("invoiceSearch")?.value || "")
      .toLowerCase();

  const status =
    $("invoiceStatusFilter")?.value || "";

  return invoices.filter(i => {
    const v = findVehicle(
      i.vehicle_id
    );

    const actualStatus =
      i.status || invoiceStatus(i);

    const text = [
      i.invoice_no,
      i.customer,
      vehicleLabel(v)
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search || text.includes(search)) &&
      (!status || actualStatus === status)
    );
  });
}

function renderInvoices() {
  const body =
    $("invoicesTableBody");

  if (!body) return;

  const rows =
    getFilteredInvoices();

  body.innerHTML = rows.length
    ? rows
        .map(i => {
          const v = findVehicle(
            i.vehicle_id
          );

          const subtotal =
            invoiceSubtotal(i);

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
              <td>${money(
                subtotal
              )}</td>
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
                    onclick="editInvoice('${esc(
                      i.id
                    )}')">
                    ✏️
                  </button>
                  <button
                    class="action-btn danger"
                    onclick="deleteInvoice('${esc(
                      i.id
                    )}')">
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
  const labour =
    num($("invoiceLabour")?.value);

  const parts =
    num($("invoiceParts")?.value);

  const other =
    num($("invoiceOther")?.value);

  const paid =
    num($("invoicePaid")?.value);

  const subtotal =
    labour + parts + other;

  if ($("invoiceSubtotal"))
    $("invoiceSubtotal").value =
      subtotal;

  if ($("invoiceBalance"))
    $("invoiceBalance").value =
      Math.max(0, subtotal - paid);

  if ($("invoiceStatus")) {
    $("invoiceStatus").value =
      paid <= 0
        ? "Unpaid"
        : paid >= subtotal
        ? "Paid"
        : "Part Paid";
  }
}

function openInvoiceModal(vehicleId = "") {
  const i = invoices.find(
    x =>
      vehicleId &&
      String(x.vehicle_id) ===
        String(vehicleId) &&
      false
  );

  $("invoiceForm")?.reset();

  $("invoiceId").value = i?.id || "";

  $("invoiceNo").value =
    i?.invoice_no ||
    "INV-" +
      new Date().getFullYear() +
      "-" +
      String(
        invoices.length + 1
      ).padStart(4, "0");

  $("invoiceDate").value =
    i?.invoice_date || today();

  updateAllVehicleSelects();

  $("invoiceVehicle").value =
    i?.vehicle_id ||
    vehicleId ||
    "";

  const v = findVehicle(
    $("invoiceVehicle").value
  );

  $("invoiceCustomer").value =
    i?.customer ||
    v?.customer ||
    "";

  $("invoiceJobDescription").value =
    i?.job_description || "";

  $("invoiceLabour").value =
    i?.labour ?? 0;

  $("invoiceParts").value =
    i?.parts ?? 0;

  $("invoiceOther").value =
    i?.other ?? 0;

  $("invoicePaid").value =
    i?.paid ?? 0;

  $("invoiceNotes").value =
    i?.notes || "";

  updateInvoiceTotals();

  $("invoiceModalTitle").textContent =
    i ? "Edit Invoice" : "New Invoice";

  openModal("invoiceModal");
}

function editInvoice(id) {
  const i = invoices.find(
    x => String(x.id) === String(id)
  );

  if (!i) return;

  $("invoiceForm")?.reset();

  $("invoiceId").value = i.id;
  $("invoiceNo").value =
    i.invoice_no || "";
  $("invoiceDate").value =
    i.invoice_date || today();

  updateAllVehicleSelects();

  $("invoiceVehicle").value =
    i.vehicle_id || "";

  $("invoiceCustomer").value =
    i.customer || "";

  $("invoiceJobDescription").value =
    i.job_description || "";

  $("invoiceLabour").value =
    i.labour ?? 0;

  $("invoiceParts").value =
    i.parts ?? 0;

  $("invoiceOther").value =
    i.other ?? 0;

  $("invoicePaid").value =
    i.paid ?? 0;

  $("invoiceNotes").value =
    i.notes || "";

  updateInvoiceTotals();

  $("invoiceModalTitle").textContent =
    "Edit Invoice";

  openModal("invoiceModal");
}

async function saveInvoice(e) {
  e.preventDefault();

  updateInvoiceTotals();

  const id =
    $("invoiceId").value;

  const subtotal =
    num($("invoiceLabour").value) +
    num($("invoiceParts").value) +
    num($("invoiceOther").value);

  const paid =
    num($("invoicePaid").value);

  const payload = {
    invoice_no:
      $("invoiceNo").value.trim(),

    invoice_date:
      $("invoiceDate").value,

    vehicle_id:
      $("invoiceVehicle").value || null,

    customer:
      $("invoiceCustomer").value.trim(),

    job_description:
      $("invoiceJobDescription").value.trim(),

    labour:
      num($("invoiceLabour").value),

    parts:
      num($("invoiceParts").value),

    other:
      num($("invoiceOther").value),

    subtotal,

    paid,

    balance:
      Math.max(0, subtotal - paid),

    status:
      $("invoiceStatus").value,

    notes:
      $("invoiceNotes").value.trim()
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
  if (!confirm("Delete this invoice?"))
    return;

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id);

  if (error) {
    toast(
      "Delete failed: " + error.message,
      true
    );
    return;
  }

  await loadAllData();
  toast("Invoice deleted.");
}

function printInvoices() {
  const rows =
    getFilteredInvoices();

  const html = `
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
            <th>Subtotal</th>
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
                    invoiceSubtotal(i)
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
  `;

  printHTML(html, "Invoices");
}

/* =========================================================
   GATE PASSES
   ========================================================= */

function getFilteredGatePasses() {
  const search =
    String($("gateSearch")?.value || "")
      .toLowerCase();

  const status =
    $("gateStatusFilter")?.value || "";

  return gatePasses.filter(g => {
    const v = findVehicle(
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
      (!search || text.includes(search)) &&
      (!status || g.status === status)
    );
  });
}

function renderGatePasses() {
  const body =
    $("gatePassesTableBody");

  if (!body) return;

  const rows =
    getFilteredGatePasses();

  body.innerHTML = rows.length
    ? rows
        .map(g => {
          const v =
            findVehicle(g.vehicle_id);

          const billed =
            num(v?.billed);

          const paid =
            num(g.paid);

          const balance =
            Math.max(
              0,
              billed - paid
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
                g.customer || v?.customer || ""
              )}</td>
              <td>${esc(
                g.released_to
              )}</td>
              <td>${esc(
                g.invoice_no || ""
              )}</td>
              <td>${money(
                g.paid
              )}</td>
              <td>${money(
                g.balance ?? balance
              )}</td>
              <td>
                <span class="status status-${statusClass(
                  g.status
                )}">
                  ${esc(g.status)}
                </span>
              </td>
              <td>
                <div class="table-actions">
                  <button
                    class="action-btn"
                    onclick="editGatePass('${esc(
                      g.id
                    )}')">
                    ✏️
                  </button>
                  <button
                    class="action-btn danger"
                    onclick="deleteGatePass('${esc(
                      g.id
                    )}')">
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
  const vehicle =
    findVehicle(
      $("gateVehicle")?.value
    );

  const paid =
    num($("gatePaid")?.value);

  const billed =
    num(vehicle?.billed);

  if ($("gateBalance"))
    $("gateBalance").value =
      Math.max(0, billed - paid);
}

function fillGateVehicleData() {
  const v =
    findVehicle(
      $("gateVehicle")?.value
    );

  if (!v) return;

  $("gateVehicleRegistration").value =
    vehicleLabel(v);

  $("gateCustomer").value =
    v.customer || "";

  updateGateBalance();
}

function openGatePassModal(vehicleId = "") {
  $("gatePassForm")?.reset();

  $("gatePassId").value = "";

  $("gatePassNo").value =
    "GP-" +
    new Date().getFullYear() +
    "-" +
    String(
      gatePasses.length + 1
    ).padStart(4, "0");

  $("gatePassDate").value =
    today();

  updateAllVehicleSelects();

  $("gateVehicle").value =
    vehicleId || "";

  $("gateAuthorizedBy").value =
    "Josephine";

  $("gateStatus").value =
    "Pending";

  fillGateVehicleData();

  $("gatePassModalTitle").textContent =
    "New Gate Pass";

  openModal("gatePassModal");
}

function editGatePass(id) {
  const g =
    gatePasses.find(
      x => String(x.id) === String(id)
    );

  if (!g) return;

  $("gatePassForm")?.reset();

  $("gatePassId").value = g.id;
  $("gatePassNo").value =
    g.gate_pass_no || "";
  $("gatePassDate").value =
    g.pass_date || today();

  updateAllVehicleSelects();

  $("gateVehicle").value =
    g.vehicle_id || "";

  $("gateVehicleRegistration").value =
    g.vehicle_registration || "";

  $("gateCustomer").value =
    g.customer || "";

  $("gateReleasedTo").value =
    g.released_to || "";

  $("gateReleasedContact").value =
    g.released_contact || "";

  $("gateInvoice").value =
    g.invoice_no || "";

  $("gatePaid").value =
    g.paid ?? 0;

  $("gateAuthorizedBy").value =
    g.authorized_by || "Josephine";

  $("gateStatus").value =
    g.status || "Pending";

  $("gateNotes").value =
    g.notes || "";

  updateGateBalance();

  $("gatePassModalTitle").textContent =
    "Edit Gate Pass";

  openModal("gatePassModal");
}

async function saveGatePass(e) {
  e.preventDefault();

  updateGateBalance();

  const id =
    $("gatePassId").value;

  const vehicle =
    findVehicle(
      $("gateVehicle").value
    );

  const paid =
    num($("gatePaid").value);

  const balance =
    Math.max(
      0,
      num(vehicle?.billed) - paid
    );

  const payload = {
    gate_pass_no:
      $("gatePassNo").value.trim(),

    pass_date:
      $("gatePassDate").value,

    vehicle_id:
      $("gateVehicle").value || null,

    vehicle_registration:
      vehicle?.registration || "",

    customer:
      $("gateCustomer").value.trim(),

    released_to:
      $("gateReleasedTo").value.trim(),

    released_contact:
      $("gateReleasedContact").value.trim(),

    invoice_no:
      $("gateInvoice").value.trim(),

    paid,

    balance,

    authorized_by:
      $("gateAuthorizedBy").value.trim(),

    status:
      $("gateStatus").value,

    notes:
      $("gateNotes").value.trim()
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
    toast(
      "Gate pass error: " +
        result.error.message,
      true
    );
    return;
  }

  closeModal("gatePassModal");
  toast("Gate pass saved.");
  await loadAllData();
}

async function deleteGatePass(id) {
  if (!confirm("Delete this gate pass?"))
    return;

  const { error } = await supabase
    .from("gate_passes")
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

  await loadAllData();
  toast("Gate pass deleted.");
}

function printGatePasses() {
  const rows =
    getFilteredGatePasses();

  const html = `
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
  `;

  printHTML(html, "Gate Passes");
}

/* =========================================================
   VEHICLE PRINT
   ========================================================= */

function printVehicles() {
  const rows =
    getFilteredVehicles();

  const html = `
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
            .map(v => {
              return `
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
                  <td>${storageDays(v)}</td>
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
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  printHTML(html, "Vehicles");
}

/* =========================================================
   PREVIEW / PRINT
   ========================================================= */

function printHTML(html, title) {
  const win = window.open(
    "",
    "_blank",
    "width=1000,height=800"
  );

  if (!win) {
    toast(
      "Please allow pop-ups to print.",
      true
    );
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${esc(title)}</title>
      <meta name="viewport"
            content="width=device-width,initial-scale=1">
      <style>
        *{box-sizing:border-box}
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
        .preview-head p{
          margin:5px 0;
          color:#64748b;
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
        .preview-total div{
          display:flex;
          justify-content:space-between;
          padding:6px 0;
        }
        .grand{
          border-top:2px solid #07111f;
          font-weight:900;
        }
        @media print{
          body{padding:0}
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
   RENDER EVERYTHING
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
   EVENT LISTENERS
   ========================================================= */

function listen(id, event, fn) {
  const el = $(id);
  if (el)
    el.addEventListener(event, fn);
}

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

/* Vehicle filters */
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

/* Expense filters */
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

/* Petty filters */
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

/* Requisition filters */
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

/* Invoice filters */
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

/* Gate filters */
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

/* Storage calculation */
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

/* Requisition calculation */
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

/* Invoice calculations */
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

/* Gate calculations */
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

/* Invoice customer when vehicle changes */
listen(
  "invoiceVehicle",
  "change",
  () => {
    const v = findVehicle(
      $("invoiceVehicle").value
    );

    if (
      v &&
      $("invoiceCustomer")
    ) {
      $("invoiceCustomer").value =
        v.customer || "";
    }
  }
);

/* =========================================================
   ACTION BUTTON STYLE
   ========================================================= */

function actionButtonStyle() {
  if ($("garageActionStyle"))
    return;

  const style =
    document.createElement("style");

  style.id =
    "garageActionStyle";

  style.textContent = `
    .table-actions{
      display:flex!important;
      flex-direction:row!important;
      flex-wrap:nowrap!important;
      align-items:center;
      gap:5px;
      min-width:max-content;
    }

    .action-btn{
      width:36px;
      height:36px;
      min-width:36px;
      padding:0!important;
      display:inline-flex!important;
      align-items:center;
      justify-content:center;
      flex:0 0 auto;
      white-space:nowrap;
    }

    .table-card{
      overflow-x:auto!important;
    }

    @media(max-width:720px){
      .action-btn{
        width:34px;
        height:34px;
        min-width:34px;
        font-size:14px;
      }
    }
  `;

  document.head.appendChild(style);
}

/* =========================================================
   LOGIN DISPLAY
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
    $("sidebarUser").textContent =
      name;

  if ($("welcomeUser"))
    $("welcomeUser").textContent =
      name.charAt(0);
}

/* =========================================================
   BACKDROP CLOSE
   ========================================================= */

document.addEventListener(
  "click",
  e => {
    if (
      e.target.classList &&
      e.target.classList.contains("modal")
    ) {
      e.target.classList.remove(
        "show"
      );
    }
  }
);

/* =========================================================
   START
   ========================================================= */

async function startApp() {
  actionButtonStyle();
  setupUser();

  /*
    Ensure app is visible when the existing
    login script has authenticated the user.
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
      $("app").style.display = "flex";
  }

  showSection("dashboard");

  /*
    Default dates.
  */
  if ($("vehicleDateIn") &&
      !$("vehicleDateIn").value) {
    $("vehicleDateIn").value =
      today();
  }

  if ($("expenseDate") &&
      !$("expenseDate").value) {
    $("expenseDate").value =
      today();
  }

  if ($("pettyDate") &&
      !$("pettyDate").value) {
    $("pettyDate").value =
      today();
  }

  if ($("reqDate") &&
      !$("reqDate").value) {
    $("reqDate").value =
      today();
  }

  if ($("invoiceDate") &&
      !$("invoiceDate").value) {
    $("invoiceDate").value =
      today();
  }

  if ($("gatePassDate") &&
      !$("gatePassDate").value) {
    $("gatePassDate").value =
      today();
  }

  await loadAllData();
}

startApp();
