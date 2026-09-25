import { createClient }
from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
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

const TABLES = {
  vehicles: "vehicles",
  expenses: "expenses",
  petty: "petty_cash",
  requisitions: "requisitions"
};

/* =========================================================
   APP STATE
========================================================= */

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];

let selectedReqId = null;
let selectedVehicleId = null;

let pettyCashSupportsReqNo = false;

/* =========================================================
   HELPERS
========================================================= */

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return "KSh " + number(value).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function today() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeReqNo(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setText(id, value) {
  const el = document.getElementById(id);

  if (el) {
    el.textContent = value;
  }
}

function vehicleName(id) {
  if (!id) {
    return "General";
  }

  const vehicle =
    vehicles.find(
      v => String(v.id) === String(id)
    );

  if (!vehicle) {
    return "—";
  }

  return `${vehicle.registration || ""} — ${vehicle.customer || ""}`;
}

function statusClass(status) {
  const value =
    String(status || "Pending")
      .toLowerCase()
      .replace(/\s+/g, "-");

  return `status-${value}`;
}

function showToast(message, type = "success") {
  let toast =
    document.getElementById("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.style.display = "block";

  if (type === "error") {
    toast.style.background = "#991b1b";
  } else if (type === "warning") {
    toast.style.background = "#92400e";
  } else {
    toast.style.background = "#07111f";
  }

  clearTimeout(window.__garageToastTimer);

  window.__garageToastTimer =
    setTimeout(() => {
      toast.style.display = "none";
    }, 3500);
}

function supabaseError(error, fallback) {
  console.error(
    "Garage Operations Pro:",
    error
  );

  const message =
    error?.message ||
    error?.details ||
    error?.hint ||
    fallback ||
    "Something went wrong.";

  showToast(message, "error");
}

/* =========================================================
   PREMIUM REQUISITION STYLES
========================================================= */

function injectPremiumStyles() {
  if (
    document.getElementById(
      "garagePremiumStyles"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "garagePremiumStyles";

  style.textContent = `
    .req-summary{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:12px;
      margin:15px 0;
    }

    .req-summary-card{
      background:#f8fafc;
      border:1px solid #e5e7eb;
      border-radius:14px;
      padding:15px;
    }

    .req-summary-card span{
      display:block;
      color:#64748b;
      font-size:11px;
      margin-bottom:6px;
    }

    .req-summary-card strong{
      display:block;
      font-size:18px;
      color:#0f172a;
    }

    .req-finance{
      display:flex;
      flex-direction:column;
      gap:5px;
      min-width:145px;
    }

    .req-finance-row{
      display:flex;
      justify-content:space-between;
      gap:10px;
      font-size:11px;
    }

    .req-finance-label{
      color:#64748b;
    }

    .req-finance-value{
      font-weight:800;
      color:#0f172a;
    }

    .req-finance-balance{
      border-top:1px solid #e5e7eb;
      padding-top:5px;
    }

    .req-payment-note{
      color:#64748b;
      font-size:10px;
      margin-top:3px;
    }

    .req-no-badge{
      display:inline-flex;
      align-items:center;
      padding:4px 8px;
      border-radius:7px;
      background:#eff6ff;
      border:1px solid #bfdbfe;
      color:#1d4ed8;
      font-weight:800;
      font-size:11px;
    }

    .empty-state{
      padding:35px 20px;
      text-align:center;
      color:#64748b;
      font-size:13px;
    }

    .preview-card{
      color:#0f172a;
    }

    .preview-header{
      margin-bottom:15px;
    }

    .preview-header h2{
      font-size:22px;
      margin-bottom:3px;
    }

    .preview-header p{
      color:#64748b;
      font-size:12px;
    }

    .preview-footer{
      margin-top:20px;
      padding-top:15px;
      border-top:1px solid #e5e7eb;
    }

    .preview-footer p{
      margin-bottom:7px;
      font-size:13px;
    }

    .table-wrap{
      width:100%;
      overflow:auto;
    }

    @media(max-width:600px){
      .req-summary{
        grid-template-columns:1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

/* =========================================================
   MODALS
   MATCHES EXACT HTML IDs
========================================================= */

window.openModal = function(id) {
  const modal =
    document.getElementById(id);

  if (!modal) {
    console.warn(
      "Modal not found:",
      id
    );
    return;
  }

  modal.classList.add("show");
  modal.style.display = "flex";
};

window.closeModal = function(id) {
  const modal =
    document.getElementById(id);

  if (!modal) return;

  modal.classList.remove("show");
  modal.style.display = "none";
};

/* =========================================================
   NAVIGATION
========================================================= */

window.showSection = function(
  section,
  button
) {
  document
    .querySelectorAll(".app-section")
    .forEach(el => {
      el.style.display = "none";
    });

  const target =
    document.getElementById(section);

  if (target) {
    target.style.display = "block";
  }

  document
    .querySelectorAll(".nav-btn")
    .forEach(btn => {
      btn.classList.remove("active");
    });

  document
    .querySelectorAll(".mobile-nav-btn")
    .forEach(btn => {
      btn.classList.remove("active");
    });

  if (button) {
    button.classList.add("active");
  } else {
    document
      .querySelectorAll(
        `[onclick*="showSection('${section}'"]`
      )
      .forEach(btn => {
        btn.classList.add("active");
      });
  }

  if (section === "dashboard") {
    renderDashboard();
  }

  if (section === "vehicles") {
    renderVehicles();
  }

  if (section === "expenses") {
    renderExpenses();
  }

  if (section === "pettyCash") {
    renderPettyCash();
  }

  if (section === "requisitions") {
    renderRequisitions();
  }
};

/* =========================================================
   VEHICLE SELECTS
   EXACT HTML:
   reqVehicle
   expenseVehicle
========================================================= */

function populateVehicleSelects() {
  const selectors = [
    "expenseVehicle",
    "reqVehicle"
  ];

  selectors.forEach(id => {
    const select =
      document.getElementById(id);

    if (!select) return;

    const current =
      select.value;

    let firstOption =
      id === "expenseVehicle"
        ? `<option value="">General Expense</option>`
        : `<option value="">Select Vehicle</option>`;

    select.innerHTML =
      firstOption +
      vehicles
        .map(v => `
          <option value="${escapeHtml(v.id)}">
            ${escapeHtml(v.registration || "")}
            — ${escapeHtml(v.customer || "")}
          </option>
        `)
        .join("");

    if (current) {
      select.value = current;
    }
  });
}

/* =========================================================
   VEHICLES
========================================================= */

async function loadVehicles() {
  const { data, error } =
    await supabase
      .from(TABLES.vehicles)
      .select("*")
      .order(
        "created_at",
        { ascending: false }
      );

  if (error) {
    supabaseError(
      error,
      "Unable to load vehicles."
    );
    return;
  }

  vehicles = data || [];

  populateVehicleSelects();

  renderVehicles();
  renderDashboard();
}

function renderVehicles() {
  const search =
    document
      .getElementById(
        "vehicleSearch"
      )
      ?.value
      ?.toLowerCase()
      ?.trim() || "";

  const status =
    document
      .getElementById(
        "vehicleStatusFilter"
      )
      ?.value || "";

  const filtered =
    vehicles.filter(v => {
      const text = [
        v.registration,
        v.customer,
        v.status,
        v.job_type,
        v.description,
        v.released_to,
        v.released_contact
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search ||
        text.includes(search);

      const matchesStatus =
        !status ||
        String(v.status || "")
          .toLowerCase() ===
          status.toLowerCase();

      return (
        matchesSearch &&
        matchesStatus
      );
    });

  const tbody =
    document.getElementById(
      "vehiclesTableBody"
    );

  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="empty-state">
            No vehicles found.
          </div>
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    filtered
      .map(v => {
        const outstanding =
          Math.max(
            number(v.billed) -
            number(v.paid),
            0
          );

        return `
          <tr>

            <td>
              <strong>
                ${escapeHtml(
                  v.registration || "—"
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                v.customer || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                v.date_in || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                v.job_type || "—"
              )}
            </td>

            <td>
              <span class="status ${statusClass(v.status)}">
                ${escapeHtml(
                  v.status || "Pending"
                )}
              </span>
            </td>

            <td>
              ${money(v.billed)}
            </td>

            <td>
              ${money(v.paid)}
            </td>

            <td>
              <strong>
                ${money(outstanding)}
              </strong>
            </td>

            <td>
              <div class="table-actions">

                <button
                  class="action-btn"
                  type="button"
                  onclick="editVehicle('${v.id}')">
                  ✏️
                </button>

                <button
                  class="action-btn"
                  type="button"
                  onclick="openVehicleWorkspace('${v.id}')">
                  👁
                </button>

                <button
                  class="action-btn"
                  type="button"
                  onclick="deleteVehicle('${v.id}')">
                  🗑
                </button>

              </div>
            </td>

          </tr>
        `;
      })
      .join("");
}

/* =========================================================
   OPEN VEHICLE MODAL
========================================================= */

window.openVehicleModal =
  function(id = null) {

    const form =
      document.getElementById(
        "vehicleForm"
      );

    if (form) {
      form.reset();
    }

    const hidden =
      document.getElementById(
        "vehicleId"
      );

    if (hidden) {
      hidden.value = "";
    }

    const title =
      document.getElementById(
        "vehicleModalTitle"
      );

    if (title) {
      title.textContent =
        id
          ? "Edit Vehicle"
          : "Add Vehicle";
    }

    if (id) {
      window.editVehicle(id);
      return;
    }

    const date =
      document.getElementById(
        "vehicleDateIn"
      );

    if (date) {
      date.value = today();
    }

    openModal(
      "vehicleModal"
    );
  };

/* =========================================================
   SAVE VEHICLE
========================================================= */

window.saveVehicle =
  async function() {

    const id =
      document.getElementById(
        "vehicleId"
      )?.value || null;

    const registration =
      document.getElementById(
        "vehicleRegistration"
      )?.value
      ?.trim()
      ?.toUpperCase();

    const customer =
      document.getElementById(
        "vehicleCustomer"
      )?.value
      ?.trim();

    if (!registration) {
      showToast(
        "Vehicle registration is required.",
        "warning"
      );
      return;
    }

    if (!customer) {
      showToast(
        "Customer name is required.",
        "warning"
      );
      return;
    }

    const payload = {
      registration,

      customer,

      date_in:
        document.getElementById(
          "vehicleDateIn"
        )?.value || null,

      date_out:
        document.getElementById(
          "vehicleDateOut"
        )?.value || null,

      job_type:
        document.getElementById(
          "vehicleJobType"
        )?.value
        ?.trim() || "Repair",

      status:
        document.getElementById(
          "vehicleStatus"
        )?.value ||
        "Under Repair",

      released_to:
        document.getElementById(
          "vehicleReleasedTo"
        )?.value
        ?.trim() || null,

      released_contact:
        document.getElementById(
          "vehicleReleasedContact"
        )?.value
        ?.trim() || null,

      description:
        document.getElementById(
          "vehicleDescription"
        )?.value
        ?.trim() || null,

      billed:
        number(
          document.getElementById(
            "vehicleBilled"
          )?.value
        ),

      paid:
        number(
          document.getElementById(
            "vehiclePaid"
          )?.value
        )
    };

    let result;

    if (id) {
      result =
        await supabase
          .from(TABLES.vehicles)
          .update(payload)
          .eq("id", id);
    } else {
      result =
        await supabase
          .from(TABLES.vehicles)
          .insert(payload);
    }

    if (result.error) {
      supabaseError(
        result.error,
        "Unable to save vehicle."
      );
      return;
    }

    showToast(
      "Vehicle saved successfully."
    );

    closeModal(
      "vehicleModal"
    );

    await loadVehicles();
  };

/* =========================================================
   EDIT VEHICLE
========================================================= */

window.editVehicle =
  function(id) {

    const v =
      vehicles.find(
        x =>
          String(x.id) ===
          String(id)
      );

    if (!v) return;

    const fields = {
      vehicleId: v.id,
      vehicleRegistration:
        v.registration,
      vehicleCustomer:
        v.customer,
      vehicleDateIn:
        v.date_in,
      vehicleDateOut:
        v.date_out,
      vehicleJobType:
        v.job_type,
      vehicleStatus:
        v.status,
      vehicleReleasedTo:
        v.released_to,
      vehicleReleasedContact:
        v.released_contact,
      vehicleDescription:
        v.description,
      vehicleBilled:
        v.billed,
      vehiclePaid:
        v.paid
    };

    Object.entries(fields)
      .forEach(
        ([fieldId, value]) => {
          const el =
            document.getElementById(
              fieldId
            );

          if (el) {
            el.value =
              value ?? "";
          }
        }
      );

    const title =
      document.getElementById(
        "vehicleModalTitle"
      );

    if (title) {
      title.textContent =
        "Edit Vehicle";
    }

    openModal(
      "vehicleModal"
    );
  };

/* =========================================================
   DELETE VEHICLE
========================================================= */

window.deleteVehicle =
  async function(id) {

    const vehicle =
      vehicles.find(
        v =>
          String(v.id) ===
          String(id)
      );

    if (!vehicle) return;

    if (
      !confirm(
        `Delete ${vehicle.registration}?`
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from(TABLES.vehicles)
        .delete()
        .eq("id", id);

    if (error) {
      supabaseError(
        error,
        "Unable to delete vehicle."
      );
      return;
    }

    showToast(
      "Vehicle deleted."
    );

    await loadVehicles();
  };

/* =========================================================
   VEHICLE WORKSPACE
========================================================= */

window.openVehicleWorkspace =
  function(id) {

    selectedVehicleId = id;

    const vehicle =
      vehicles.find(
        v =>
          String(v.id) ===
          String(id)
      );

    if (!vehicle) return;

    const matchingExpenses =
      expenses.filter(
        e =>
          String(e.vehicle_id) ===
          String(id)
      );

    const total =
      matchingExpenses.reduce(
        (sum, e) =>
          sum + number(e.amount),
        0
      );

    const html = `
      <div class="preview-card">

        <div class="preview-header">
          <h2>
            ${escapeHtml(
              vehicle.registration || "Vehicle"
            )}
          </h2>

          <p>
            ${escapeHtml(
              vehicle.customer || ""
            )}
          </p>
        </div>

        <div class="req-summary">

          <div class="req-summary-card">
            <span>Status</span>
            <strong>
              ${escapeHtml(
                vehicle.status || "—"
              )}
            </strong>
          </div>

          <div class="req-summary-card">
            <span>Billed</span>
            <strong>
              ${money(vehicle.billed)}
            </strong>
          </div>

          <div class="req-summary-card">
            <span>Outstanding</span>
            <strong>
              ${money(
                Math.max(
                  number(vehicle.billed) -
                  number(vehicle.paid),
                  0
                )
              )}
            </strong>
          </div>

        </div>

        <h3 style="margin:15px 0 8px">
          Vehicle Expenses
        </h3>

        <p style="font-size:12px;color:#64748b;margin-bottom:10px">
          Total: ${money(total)}
        </p>

        ${
          matchingExpenses.length
            ? `
              <div class="table-wrap">
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

                    ${matchingExpenses.map(e => `
                      <tr>
                        <td>
                          ${escapeHtml(
                            e.expense_date ||
                            e.created_at?.slice(0,10) ||
                            "—"
                          )}
                        </td>

                        <td>
                          ${escapeHtml(
                            e.description || "—"
                          )}
                        </td>

                        <td>
                          ${escapeHtml(
                            e.category ||
                            e.expense_type ||
                            "—"
                          )}
                        </td>

                        <td>
                          ${money(e.amount)}
                        </td>
                      </tr>
                    `).join("")}

                  </tbody>
                </table>
              </div>
            `
            : `
              <div class="empty-state">
                No expenses recorded for this vehicle.
              </div>
            `
        }

      </div>
    `;

    const modal =
      document.getElementById(
        "vehicleExpensePreviewModal"
      );

    const content =
      document.getElementById(
        "vehicleExpensePreviewContent"
      );

    if (modal && content) {
      content.innerHTML = html;

      openModal(
        "vehicleExpensePreviewModal"
      );
    }
  };

/* =========================================================
   EXPENSES
========================================================= */

async function loadExpenses() {

  const { data, error } =
    await supabase
      .from(TABLES.expenses)
      .select("*")
      .order(
        "created_at",
        { ascending: false }
      );

  if (error) {
    supabaseError(
      error,
      "Unable to load expenses."
    );
    return;
  }

  expenses = data || [];

  populateExpenseCategoryFilter();

  renderExpenses();
  renderDashboard();
}

function populateExpenseCategoryFilter() {

  const select =
    document.getElementById(
      "expenseCategoryFilter"
    );

  if (!select) return;

  const current =
    select.value;

  const categories =
    [
      ...new Set(
        expenses
          .map(
            e =>
              e.category ||
              e.expense_type
          )
          .filter(Boolean)
      )
    ]
    .sort();

  select.innerHTML =
    `<option value="">All Categories</option>` +
    categories
      .map(
        c => `
          <option value="${escapeHtml(c)}">
            ${escapeHtml(c)}
          </option>
        `
      )
      .join("");

  if (current) {
    select.value = current;
  }
}

function renderExpenses() {

  const search =
    document
      .getElementById(
        "expenseSearch"
      )
      ?.value
      ?.toLowerCase()
      ?.trim() || "";

  const category =
    document
      .getElementById(
        "expenseCategoryFilter"
      )
      ?.value || "";

  const filtered =
    expenses.filter(e => {

      const text = [
        e.description,
        e.category,
        e.expense_type,
        vehicleName(
          e.vehicle_id
        )
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search ||
        text.includes(search);

      const actualCategory =
        e.category ||
        e.expense_type ||
        "";

      const matchesCategory =
        !category ||
        actualCategory ===
        category;

      return (
        matchesSearch &&
        matchesCategory
      );
    });

  const tbody =
    document.getElementById(
      "expensesTableBody"
    );

  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            No expenses found.
          </div>
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    filtered.map(e => `
      <tr>

        <td>
          ${escapeHtml(
            e.expense_date ||
            e.created_at?.slice(0,10) ||
            "—"
          )}
        </td>

        <td>
          ${escapeHtml(
            vehicleName(
              e.vehicle_id
            )
          )}
        </td>

        <td>
          ${escapeHtml(
            e.description || "—"
          )}
        </td>

        <td>
          ${escapeHtml(
            e.category ||
            e.expense_type ||
            "—"
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
              type="button"
              onclick="editExpense('${e.id}')">
              ✏️
            </button>

            <button
              class="action-btn"
              type="button"
              onclick="deleteExpense('${e.id}')">
              🗑
            </button>

          </div>

        </td>

      </tr>
    `).join("");
}

/* =========================================================
   OPEN EXPENSE MODAL
========================================================= */

window.openExpenseModal =
  function(id = null) {

    const form =
      document.getElementById(
        "expenseForm"
      );

    if (form) {
      form.reset();
    }

    const hidden =
      document.getElementById(
        "expenseId"
      );

    if (hidden) {
      hidden.value = "";
    }

    const title =
      document.getElementById(
        "expenseModalTitle"
      );

    if (title) {
      title.textContent =
        id
          ? "Edit Expense"
          : "Add Expense";
    }

    populateVehicleSelects();

    const date =
      document.getElementById(
        "expenseDate"
      );

    if (date) {
      date.value = today();
    }

    if (id) {
      window.editExpense(id);
      return;
    }

    openModal(
      "expenseModal"
    );
  };

/* =========================================================
   SAVE EXPENSE
========================================================= */

window.saveExpense =
  async function() {

    const id =
      document.getElementById(
        "expenseId"
      )?.value || null;

    const payload = {
      vehicle_id:
        document.getElementById(
          "expenseVehicle"
        )?.value || null,

      description:
        document.getElementById(
          "expenseDescription"
        )?.value
        ?.trim(),

      amount:
        number(
          document.getElementById(
            "expenseAmount"
          )?.value
        ),

      category:
        document.getElementById(
          "expenseCategory"
        )?.value
        ?.trim() || "Other",

      expense_type:
        document.getElementById(
          "expenseCategory"
        )?.value
        ?.trim() || "Other",

      expense_date:
        document.getElementById(
          "expenseDate"
        )?.value ||
        today()
    };

    if (!payload.description) {
      showToast(
        "Expense description is required.",
        "warning"
      );
      return;
    }

    if (payload.amount < 0) {
      showToast(
        "Amount cannot be negative.",
        "warning"
      );
      return;
    }

    let result;

    if (id) {
      result =
        await supabase
          .from(TABLES.expenses)
          .update(payload)
          .eq("id", id);
    } else {
      result =
        await supabase
          .from(TABLES.expenses)
          .insert(payload);
    }

    if (result.error) {
      supabaseError(
        result.error,
        "Unable to save expense."
      );
      return;
    }

    showToast(
      "Expense saved successfully."
    );

    closeModal(
      "expenseModal"
    );

    await loadExpenses();
  };

/* =========================================================
   EDIT EXPENSE
========================================================= */

window.editExpense =
  function(id) {

    const e =
      expenses.find(
        x =>
          String(x.id) ===
          String(id)
      );

    if (!e) return;

    populateVehicleSelects();

    const values = {
      expenseId: e.id,
      expenseVehicle:
        e.vehicle_id,
      expenseDate:
        e.expense_date ||
        e.created_at?.slice(0,10),
      expenseCategory:
        e.category ||
        e.expense_type,
      expenseAmount:
        e.amount,
      expenseDescription:
        e.description
    };

    Object.entries(values)
      .forEach(
        ([fieldId, value]) => {

          const el =
            document.getElementById(
              fieldId
            );

          if (el) {
            el.value =
              value ?? "";
          }

        }
      );

    const title =
      document.getElementById(
        "expenseModalTitle"
      );

    if (title) {
      title.textContent =
        "Edit Expense";
    }

    openModal(
      "expenseModal"
    );
  };

/* =========================================================
   DELETE EXPENSE
========================================================= */

window.deleteExpense =
  async function(id) {

    if (
      !confirm(
        "Delete this expense?"
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from(TABLES.expenses)
        .delete()
        .eq("id", id);

    if (error) {
      supabaseError(
        error,
        "Unable to delete expense."
      );
      return;
    }

    showToast(
      "Expense deleted."
    );

    await loadExpenses();
  };

/* =========================================================
   PETTY CASH
========================================================= */

async function loadPettyCash() {

  let result =
    await supabase
      .from(TABLES.petty)
      .select("*, req_no")
      .order(
        "created_at",
        { ascending: false }
      );

  if (result.error) {

    console.warn(
      "req_no column unavailable.",
      result.error
    );

    pettyCashSupportsReqNo =
      false;

    result =
      await supabase
        .from(TABLES.petty)
        .select("*")
        .order(
          "created_at",
          { ascending: false }
        );
  } else {
    pettyCashSupportsReqNo =
      true;
  }

  if (result.error) {
    supabaseError(
      result.error,
      "Unable to load petty cash."
    );
    return;
  }

  pettyCash =
    result.data || [];

  populatePettyCashReqSelect();
  populatePettyCategoryFilter();

  renderPettyCash();
  renderDashboard();
}

/* =========================================================
   PETTY CASH REQUISITION SELECT
========================================================= */

function populatePettyCashReqSelect() {

  /*
    The exact HTML supplied by the user
    does not currently contain a pettyReqNo
    select.

    Therefore this function safely does nothing
    until that field is added.

    This does NOT break the application.
  */

  const select =
    document.getElementById(
      "pettyReqNo"
    );

  if (!select) return;

  const current =
    select.value;

  const unique =
    [
      ...new Set(
        requisitions
          .map(
            r =>
              normalizeReqNo(
                r.req_no
              )
          )
          .filter(Boolean)
      )
    ];

  select.innerHTML =
    `<option value="">
      Not linked to requisition
    </option>` +
    unique
      .map(
        reqNo => `
          <option value="${escapeHtml(reqNo)}">
            ${escapeHtml(reqNo)}
          </option>
        `
      )
      .join("");

  if (current) {
    select.value =
      current;
  }
}

/* =========================================================
   PETTY CATEGORY FILTER
========================================================= */

function populatePettyCategoryFilter() {

  const select =
    document.getElementById(
      "pettyCategoryFilter"
    );

  if (!select) return;

  const current =
    select.value;

  const categories =
    [
      ...new Set(
        pettyCash
          .map(
            p => p.category
          )
          .filter(Boolean)
      )
    ]
    .sort();

  select.innerHTML =
    `<option value="">
      All Categories
    </option>` +
    categories
      .map(
        c => `
          <option value="${escapeHtml(c)}">
            ${escapeHtml(c)}
          </option>
        `
      )
      .join("");

  if (current) {
    select.value =
      current;
  }
}

/* =========================================================
   RENDER PETTY CASH
========================================================= */

function renderPettyCash() {

  const search =
    document
      .getElementById(
        "pettySearch"
      )
      ?.value
      ?.toLowerCase()
      ?.trim() || "";

  const category =
    document
      .getElementById(
        "pettyCategoryFilter"
      )
      ?.value || "";

  const filtered =
    pettyCash.filter(p => {

      const text = [
        p.description,
        p.paid_to,
        p.category,
        p.req_no
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search ||
        text.includes(search);

      const matchesCategory =
        !category ||
        String(p.category || "") ===
        category;

      return (
        matchesSearch &&
        matchesCategory
      );
    });

  const tbody =
    document.getElementById(
      "pettyTableBody"
    );

  if (!tbody) return;

  if (!filtered.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            No petty cash records found.
          </div>
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    filtered.map(p => `
      <tr>

        <td>
          ${escapeHtml(
            p.cash_date ||
            p.created_at?.slice(0,10) ||
            "—"
          )}
        </td>

        <td>
          ${escapeHtml(
            p.description || "—"
          )}
        </td>

        <td>
          ${escapeHtml(
            p.paid_to || "—"
          )}
        </td>

        <td>
          ${escapeHtml(
            p.category || "—"
          )}
        </td>

        <td>
          <strong>
            ${money(p.amount)}
          </strong>
        </td>

        <td>
          ${escapeHtml(
            p.notes || "—"
          )}
        </td>

        <td>

          <div class="table-actions">

            <button
              class="action-btn"
              type="button"
              onclick="editPettyCash('${p.id}')">
              ✏️
            </button>

            <button
              class="action-btn"
              type="button"
              onclick="deletePettyCash('${p.id}')">
              🗑
            </button>

          </div>

        </td>

      </tr>
    `).join("");
}

/* =========================================================
   OPEN PETTY CASH MODAL
========================================================= */

window.openPettyModal =
  function(id = null) {

    const form =
      document.getElementById(
        "pettyForm"
      );

    if (form) {
      form.reset();
    }

    const hidden =
      document.getElementById(
        "pettyId"
      );

    if (hidden) {
      hidden.value = "";
    }

    const title =
      document.getElementById(
        "pettyModalTitle"
      );

    if (title) {
      title.textContent =
        id
          ? "Edit Petty Cash"
          : "Add Petty Cash";
    }

    const date =
      document.getElementById(
        "pettyDate"
      );

    if (date) {
      date.value = today();
    }

    if (id) {
      window.editPettyCash(id);
      return;
    }

    openModal(
      "pettyModal"
    );
  };

/* =========================================================
   SAVE PETTY CASH
========================================================= */

window.savePettyCash =
  async function() {

    const id =
      document.getElementById(
        "pettyId"
      )?.value || null;

    const reqNo =
      normalizeReqNo(
        document.getElementById(
          "pettyReqNo"
        )?.value
      );

    const payload = {

      cash_date:
        document.getElementById(
          "pettyDate"
        )?.value ||
        today(),

      description:
        document.getElementById(
          "pettyDescription"
        )?.value
        ?.trim(),

      paid_to:
        document.getElementById(
          "pettyPaidTo"
        )?.value
        ?.trim(),

      category:
        document.getElementById(
          "pettyCategory"
        )?.value
        ?.trim() ||
        "Other",

      amount:
        number(
          document.getElementById(
            "pettyAmount"
          )?.value
        ),

      notes:
        document.getElementById(
          "pettyNotes"
        )?.value
        ?.trim() || null
    };

    if (
      pettyCashSupportsReqNo
    ) {
      payload.req_no =
        reqNo || null;
    }

    if (!payload.description) {
      showToast(
        "Petty cash description is required.",
        "warning"
      );
      return;
    }

    if (!payload.paid_to) {
      showToast(
        "Paid To is required.",
        "warning"
      );
      return;
    }

    if (payload.amount < 0) {
      showToast(
        "Amount cannot be negative.",
        "warning"
      );
      return;
    }

    let result;

    if (id) {

      result =
        await supabase
          .from(TABLES.petty)
          .update(payload)
          .eq("id", id);

    } else {

      result =
        await supabase
          .from(TABLES.petty)
          .insert(payload);

    }

    if (result.error) {
      supabaseError(
        result.error,
        "Unable to save petty cash."
      );
      return;
    }

    showToast(
      "Petty cash saved successfully."
    );

    closeModal(
      "pettyModal"
    );

    await loadPettyCash();
  };

/* =========================================================
   EDIT PETTY CASH
========================================================= */

window.editPettyCash =
  function(id) {

    const p =
      pettyCash.find(
        x =>
          String(x.id) ===
          String(id)
      );

    if (!p) return;

    const values = {

      pettyId:
        p.id,

      pettyDate:
        p.cash_date,

      pettyReqNo:
        normalizeReqNo(
          p.req_no
        ),

      pettyPaidTo:
        p.paid_to,

      pettyCategory:
        p.category,

      pettyAmount:
        p.amount,

      pettyDescription:
        p.description,

      pettyNotes:
        p.notes
    };

    Object.entries(values)
      .forEach(
        ([fieldId, value]) => {

          const el =
            document.getElementById(
              fieldId
            );

          if (el) {
            el.value =
              value ?? "";
          }

        }
      );

    const title =
      document.getElementById(
        "pettyModalTitle"
      );

    if (title) {
      title.textContent =
        "Edit Petty Cash";
    }

    openModal(
      "pettyModal"
    );
  };

/* =========================================================
   DELETE PETTY CASH
========================================================= */

window.deletePettyCash =
  async function(id) {

    if (
      !confirm(
        "Delete this petty cash transaction?"
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from(TABLES.petty)
        .delete()
        .eq("id", id);

    if (error) {
      supabaseError(
        error,
        "Unable to delete petty cash."
      );
      return;
    }

    showToast(
      "Petty cash deleted."
    );

    await loadPettyCash();
  };

/* =========================================================
   REQUISITION FINANCIAL ENGINE
========================================================= */

/*
   VERY IMPORTANT

   REQ-001 and REQ-002 are financially independent.

   REQ-001:
   Requested 20,000
   Received 17,000
   Balance 3,000

   REQ-002:
   Requested 16,000
   Received 0
   Balance 16,000

   We NEVER combine all requisitions
   with all petty cash.

   Received money is counted only when
   petty_cash.req_no exactly matches req_no.
*/

function getRequisitionFinance(
  reqNo
) {

  const key =
    normalizeReqNo(reqNo);

  if (!key) {
    return {
      requested: 0,
      received: 0,
      balance: 0
    };
  }

  /* ---------------------------------------------
     REQUESTED
     Sum only rows belonging to this REQ number
  --------------------------------------------- */

  const matchingReqs =
    requisitions.filter(
      r =>
        normalizeReqNo(
          r.req_no
        ) === key
    );

  const requested =
    matchingReqs.reduce(
      (sum, r) => {

        const quantity =
          number(r.quantity);

        const unitCost =
          number(r.unit_cost);

        /*
          Each row:
          quantity × unit cost
        */

        if (quantity > 0) {
          return (
            sum +
            quantity *
            unitCost
          );
        }

        /*
          Fallback for old records.
        */

        return (
          sum +
          number(r.total_amount)
        );

      },
      0
    );

  /* ---------------------------------------------
     RECEIVED
     ONLY petty cash linked to this REQ number
  --------------------------------------------- */

  const received =
    pettyCash
      .filter(
        p =>
          key !== "" &&
          normalizeReqNo(
            p.req_no
          ) === key
      )
      .reduce(
        (sum, p) =>
          sum + number(p.amount),
        0
      );

  /* ---------------------------------------------
     BALANCE
  --------------------------------------------- */

  const balance =
    Math.max(
      requested -
      received,
      0
    );

  return {
    requested,
    received,
    balance
  };
}

/* =========================================================
   LOAD REQUISITIONS
========================================================= */

async function loadRequisitions() {

  const { data, error } =
    await supabase
      .from(
        TABLES.requisitions
      )
      .select("*")
      .order(
        "req_date",
        { ascending: false }
      )
      .order(
        "created_at",
        { ascending: false }
      );

  if (error) {
    supabaseError(
      error,
      "Unable to load requisitions."
    );
    return;
  }

  requisitions =
    data || [];

  populateVehicleSelects();
  populatePettyCashReqSelect();

  renderRequisitions();
  renderDashboard();
}

/* =========================================================
   REQUISITION SUMMARY
========================================================= */

function renderRequisitionSummary(
  reqNo
) {

  /*
    The current exact HTML does NOT have
    a separate requisitionSummary element.

    Therefore we use the existing
    reqOverallTotal card and inject a
    detailed summary beside it when searching
    an exact requisition.
  */

  const card =
    document.getElementById(
      "reqOverallTotal"
    );

  if (!card) return;

  const key =
    normalizeReqNo(reqNo);

  if (!key) {

    const allRequested =
      requisitions.reduce(
        (sum, r) => {

          const qty =
            number(r.quantity);

          const unit =
            number(r.unit_cost);

          return (
            sum +
            (
              qty > 0
                ? qty * unit
                : number(r.total_amount)
            )
          );
        },
        0
      );

    card.innerHTML =
      money(allRequested);

    return;
  }

  const finance =
    getRequisitionFinance(
      key
    );

  card.innerHTML = `
    <div style="
      display:flex;
      flex-direction:column;
      gap:3px;
      text-align:right;
    ">

      <strong>
        ${money(finance.requested)}
      </strong>

      <span style="
        font-size:10px;
        color:#64748b;
        font-weight:500;
      ">
        Received: ${money(finance.received)}
        &nbsp;•&nbsp;
        Balance: ${money(finance.balance)}
      </span>

    </div>
  `;
}

/* =========================================================
   RENDER REQUISITIONS
========================================================= */

function renderRequisitions() {

  /*
    IMPORTANT:
    Exact HTML uses reqSearch
    and reqStatusFilter.
  */

  const search =
    document
      .getElementById(
        "reqSearch"
      )
      ?.value
      ?.trim()
      ?.toLowerCase() || "";

  const status =
    document
      .getElementById(
        "reqStatusFilter"
      )
      ?.value || "";

  const filtered =
    requisitions.filter(
      r => {

        const text = [
          r.req_no,
          r.req_date,
          r.requested_by,
          r.item_description,
          r.status,
          r.category,
          r.expense_type,
          vehicleName(
            r.vehicle_id
          )
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !search ||
          text.includes(search);

        const matchesStatus =
          !status ||
          String(
            r.status || ""
          ).toLowerCase() ===
          status.toLowerCase();

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );

  /*
    Exact search:
    REQ-001
    REQ-002
  */

  const exactReq =
    normalizeReqNo(search);

  const exactExists =
    exactReq &&
    requisitions.some(
      r =>
        normalizeReqNo(
          r.req_no
        ) === exactReq
    );

  if (exactExists) {
    renderRequisitionSummary(
      exactReq
    );
  } else {
    renderRequisitionSummary(
      ""
    );
  }

  const tbody =
    document.getElementById(
      "requisitionsTableBody"
    );

  if (!tbody) return;

  if (!filtered.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="11">
          <div class="empty-state">
            No requisitions found.
          </div>
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    filtered
      .map(r => {

        const quantity =
          number(r.quantity);

        const unitCost =
          number(r.unit_cost);

        const lineTotal =
          quantity > 0
            ? quantity * unitCost
            : number(r.total_amount);

        /*
          THIS IS THE CRITICAL PART.

          Financial values are calculated
          for the entire exact REQ number,
          not just the current line.
        */

        const finance =
          getRequisitionFinance(
            r.req_no
          );

        return `
          <tr>

            <td>
              <span class="req-no-badge">
                ${escapeHtml(
                  normalizeReqNo(
                    r.req_no
                  )
                )}
              </span>
            </td>

            <td>
              ${escapeHtml(
                r.req_date || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                r.requested_by || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                vehicleName(
                  r.vehicle_id
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                r.item_description || "—"
              )}
            </td>

            <td>
              ${quantity}
            </td>

            <td>
              ${money(unitCost)}
            </td>

            <td>
              <strong>
                ${money(lineTotal)}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                r.category ||
                r.expense_type ||
                "—"
              )}
            </td>

            <td>
              <span class="status ${statusClass(r.status)}">
                ${escapeHtml(
                  r.status ||
                  "Pending"
                )}
              </span>
            </td>

            <td>

              <div class="req-finance">

                <div class="req-finance-row">

                  <span class="req-finance-label">
                    Requested
                  </span>

                  <span class="req-finance-value">
                    ${money(
                      finance.requested
                    )}
                  </span>

                </div>

                <div class="req-finance-row">

                  <span class="req-finance-label">
                    Received
                  </span>

                  <span class="req-finance-value">
                    ${money(
                      finance.received
                    )}
                  </span>

                </div>

                <div class="req-finance-row req-finance-balance">

                  <span class="req-finance-label">
                    Balance
                  </span>

                  <span class="req-finance-value">
                    ${money(
                      finance.balance
                    )}
                  </span>

                </div>

              </div>

            </td>

          </tr>
        `;
      })
      .join("");

  /*
    Existing HTML has:
    reqOverallTotal

    Keep it as the overall total
    when no exact REQ search is active.
  */

  if (!exactExists) {

    const total =
      filtered.reduce(
        (sum, r) => {

          const qty =
            number(r.quantity);

          const unit =
            number(r.unit_cost);

          return (
            sum +
            (
              qty > 0
                ? qty * unit
                : number(r.total_amount)
            )
          );
        },
        0
      );

    setText(
      "reqOverallTotal",
      money(total)
    );
  }
}

/* =========================================================
   OPEN REQUISITION MODAL
========================================================= */

window.openReqModal =
  function(id = null) {

    const form =
      document.getElementById(
        "reqForm"
      );

    if (form) {
      form.reset();
    }

    const hidden =
      document.getElementById(
        "reqId"
      );

    if (hidden) {
      hidden.value = "";
    }

    populateVehicleSelects();

    const title =
      document.getElementById(
        "reqModalTitle"
      );

    if (title) {
      title.textContent =
        id
          ? "Edit Requisition"
          : "New Requisition";
    }

    const date =
      document.getElementById(
        "reqDate"
      );

    if (date) {
      date.value = today();
    }

    const total =
      document.getElementById(
        "reqTotal"
      );

    if (total) {
      total.value = 0;
    }

    if (id) {
      window.editRequisition(id);
      return;
    }

    openModal(
      "reqModal"
    );
  };

/* =========================================================
   AUTO CALCULATE REQUISITION TOTAL
========================================================= */

function updateRequisitionTotal() {

  const quantity =
    number(
      document.getElementById(
        "reqQuantity"
      )?.value
    );

  const unitCost =
    number(
      document.getElementById(
        "reqUnitCost"
      )?.value
    );

  const total =
    quantity *
    unitCost;

  const input =
    document.getElementById(
      "reqTotal"
    );

  if (input) {
    input.value =
      total;
  }
}

/* =========================================================
   SAVE REQUISITION
========================================================= */

window.saveRequisition =
  async function() {

    const id =
      document.getElementById(
        "reqId"
      )?.value || null;

    const reqNo =
      normalizeReqNo(
        document.getElementById(
          "reqNo"
        )?.value
      );

    const quantity =
      number(
        document.getElementById(
          "reqQuantity"
        )?.value
      );

    const unitCost =
      number(
        document.getElementById(
          "reqUnitCost"
        )?.value
      );

    const lineTotal =
      quantity *
      unitCost;

    const payload = {

      req_no:
        reqNo,

      req_date:
        document.getElementById(
          "reqDate"
        )?.value ||
        today(),

      requested_by:
        document.getElementById(
          "reqRequestedBy"
        )?.value
        ?.trim(),

      vehicle_id:
        document.getElementById(
          "reqVehicle"
        )?.value ||
        null,

      item_description:
        document.getElementById(
          "reqItemDescription"
        )?.value
        ?.trim(),

      quantity,

      unit_cost:
        unitCost,

      total_amount:
        lineTotal,

      status:
        document.getElementById(
          "reqStatus"
        )?.value ||
        "Pending",

      notes:
        document.getElementById(
          "reqNotes"
        )?.value
        ?.trim() ||
        null
    };

    const category =
      document.getElementById(
        "reqCategory"
      )?.value
      ?.trim();

    const expenseType =
      document.getElementById(
        "reqExpenseType"
      )?.value
      ?.trim();

    /*
      Only include optional fields when
      the user actually entered something.
    */

    if (category) {
      payload.category =
        category;
    }

    if (expenseType) {
      payload.expense_type =
        expenseType;
    }

    if (!reqNo) {
      showToast(
        "Requisition number is required.",
        "warning"
      );
      return;
    }

    if (
      !payload.item_description
    ) {
      showToast(
        "Item description is required.",
        "warning"
      );
      return;
    }

    if (quantity <= 0) {
      showToast(
        "Quantity must be greater than zero.",
        "warning"
      );
      return;
    }

    if (unitCost < 0) {
      showToast(
        "Unit cost cannot be negative.",
        "warning"
      );
      return;
    }

    let result;

    if (id) {

      result =
        await supabase
          .from(
            TABLES.requisitions
          )
          .update(payload)
          .eq("id", id);

    } else {

      result =
        await supabase
          .from(
            TABLES.requisitions
          )
          .insert(payload);

    }

    if (result.error) {
      supabaseError(
        result.error,
        "Unable to save requisition."
      );
      return;
    }

    showToast(
      `${reqNo} saved: ${money(lineTotal)}`
    );

    closeModal(
      "reqModal"
    );

    await loadRequisitions();
  };

/* =========================================================
   EDIT REQUISITION
========================================================= */

window.editRequisition =
  function(id) {

    const r =
      requisitions.find(
        x =>
          String(x.id) ===
          String(id)
      );

    if (!r) return;

    populateVehicleSelects();

    const values = {

      reqId:
        r.id,

      reqNo:
        normalizeReqNo(
          r.req_no
        ),

      reqDate:
        r.req_date,

      reqRequestedBy:
        r.requested_by,

      reqVehicle:
        r.vehicle_id,

      reqItemDescription:
        r.item_description,

      reqQuantity:
        r.quantity,

      reqUnitCost:
        r.unit_cost,

      reqTotal:
        number(r.quantity) *
        number(r.unit_cost),

      reqStatus:
        r.status,

      reqCategory:
        r.category,

      reqExpenseType:
        r.expense_type,

      reqNotes:
        r.notes
    };

    Object.entries(values)
      .forEach(
        ([fieldId, value]) => {

          const el =
            document.getElementById(
              fieldId
            );

          if (el) {
            el.value =
              value ?? "";
          }

        }
      );

    const title =
      document.getElementById(
        "reqModalTitle"
      );

    if (title) {
      title.textContent =
        "Edit Requisition";
    }

    openModal(
      "reqModal"
    );
  };

/* =========================================================
   DELETE REQUISITION
========================================================= */

window.deleteRequisition =
  async function(id) {

    const r =
      requisitions.find(
        x =>
          String(x.id) ===
          String(id)
      );

    if (!r) return;

    const reqNo =
      normalizeReqNo(
        r.req_no
      );

    if (
      !confirm(
        `Delete ${reqNo} — ${r.item_description}?`
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from(
          TABLES.requisitions
        )
        .delete()
        .eq("id", id);

    if (error) {
      supabaseError(
        error,
        "Unable to delete requisition."
      );
      return;
    }

    showToast(
      "Requisition deleted."
    );

    await loadRequisitions();
  };

/* =========================================================
   PREVIEW SELECTED REQUISITION
========================================================= */

window.previewSelectedReq =
  function() {

    const search =
      document
        .getElementById(
          "reqSearch"
        )
        ?.value
        ?.trim();

    let id =
      selectedReqId;

    if (search) {

      const reqNo =
        normalizeReqNo(
          search
        );

      const found =
        requisitions.find(
          r =>
            normalizeReqNo(
              r.req_no
            ) === reqNo
        );

      if (found) {
        id = found.id;
      }
    }

    if (!id) {

      if (!requisitions.length) {
        showToast(
          "No requisition available.",
          "warning"
        );
        return;
      }

      id =
        requisitions[0].id;
    }

    window.previewReq(id);
  };

/* =========================================================
   PREVIEW REQUISITION
========================================================= */

window.previewReq =
  function(id) {

    const r =
      requisitions.find(
        x =>
          String(x.id) ===
          String(id)
      );

    if (!r) return;

    selectedReqId =
      r.id;

    const reqNo =
      normalizeReqNo(
        r.req_no
      );

    const finance =
      getRequisitionFinance(
        reqNo
      );

    const lines =
      requisitions.filter(
        x =>
          normalizeReqNo(
            x.req_no
          ) === reqNo
      );

    const html = `
      <div class="preview-card">

        <div class="preview-header">

          <h2>
            ${escapeHtml(reqNo)}
          </h2>

          <p>
            Garage Operations Pro
          </p>

        </div>

        <div class="req-summary">

          <div class="req-summary-card">
            <span>Requested</span>
            <strong>
              ${money(
                finance.requested
              )}
            </strong>
          </div>

          <div class="req-summary-card">
            <span>Received</span>
            <strong>
              ${money(
                finance.received
              )}
            </strong>
          </div>

          <div class="req-summary-card">
            <span>Balance</span>
            <strong>
              ${money(
                finance.balance
              )}
            </strong>
          </div>

        </div>

        <div class="table-wrap">

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

              ${
                lines.map(
                  line => {

                    const qty =
                      number(
                        line.quantity
                      );

                    const unit =
                      number(
                        line.unit_cost
                      );

                    const total =
                      qty > 0
                        ? qty * unit
                        : number(
                            line.total_amount
                          );

                    return `
                      <tr>

                        <td>
                          ${escapeHtml(
                            line.item_description ||
                            "—"
                          )}
                        </td>

                        <td>
                          ${qty}
                        </td>

                        <td>
                          ${money(unit)}
                        </td>

                        <td>
                          <strong>
                            ${money(total)}
                          </strong>
                        </td>

                      </tr>
                    `;
                  }
                ).join("")
              }

            </tbody>

          </table>

        </div>

        <div class="preview-footer">

          <p>
            <strong>
              Requested:
            </strong>
            ${money(
              finance.requested
            )}
          </p>

          <p>
            <strong>
              Received:
            </strong>
            ${money(
              finance.received
            )}
          </p>

          <p>
            <strong>
              Balance:
            </strong>
            ${money(
              finance.balance
            )}
          </p>

          <p class="req-payment-note">
            Received amount is based only on
            petty cash linked to
            ${escapeHtml(reqNo)}.
          </p>

        </div>

      </div>
    `;

    const content =
      document.getElementById(
        "reqPreviewContent"
      );

    if (!content) return;

    content.innerHTML =
      html;

    openModal(
      "reqPreviewModal"
    );
  };

/* =========================================================
   PRINT SELECTED REQUISITION
========================================================= */

window.printSelectedReq =
  function() {

    if (selectedReqId) {
      window.printRequisition(
        selectedReqId
      );
      return;
    }

    const search =
      document
        .getElementById(
          "reqSearch"
        )
        ?.value
        ?.trim();

    if (search) {

      const reqNo =
        normalizeReqNo(
          search
        );

      const r =
        requisitions.find(
          x =>
            normalizeReqNo(
              x.req_no
            ) === reqNo
        );

      if (r) {
        window.printRequisition(
          r.id
        );
        return;
      }
    }

    showToast(
      "Select a requisition first.",
      "warning"
    );
  };

/* =========================================================
   PRINT REQUISITION
========================================================= */

window.printRequisition =
  function(id) {

    const r =
      requisitions.find(
        x =>
          String(x.id) ===
          String(id)
      );

    if (!r) return;

    const reqNo =
      normalizeReqNo(
        r.req_no
      );

    const finance =
      getRequisitionFinance(
        reqNo
      );

    const lines =
      requisitions.filter(
        x =>
          normalizeReqNo(
            x.req_no
          ) === reqNo
      );

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=900,height=700"
      );

    if (!printWindow) {

      showToast(
        "Please allow pop-ups to print.",
        "warning"
      );

      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>

      <html>

      <head>

        <title>
          ${escapeHtml(reqNo)}
        </title>

        <style>

          body{
            font-family:Arial,sans-serif;
            padding:35px;
            color:#111827;
          }

          h1{
            margin-bottom:4px;
          }

          .subtitle{
            color:#6b7280;
            margin-bottom:25px;
          }

          .summary{
            display:grid;
            grid-template-columns:repeat(3,1fr);
            gap:12px;
            margin:20px 0;
          }

          .card{
            border:1px solid #ddd;
            border-radius:8px;
            padding:14px;
          }

          .card span{
            display:block;
            color:#6b7280;
            font-size:12px;
            margin-bottom:5px;
          }

          .card strong{
            font-size:18px;
          }

          table{
            width:100%;
            border-collapse:collapse;
            margin-top:20px;
          }

          th,
          td{
            border:1px solid #ddd;
            padding:10px;
            text-align:left;
          }

          th{
            background:#f3f4f6;
          }

          .footer{
            margin-top:25px;
          }

          @media print{
            body{
              padding:15px;
            }
          }

        </style>

      </head>

      <body>

        <h1>
          ${escapeHtml(reqNo)}
        </h1>

        <div class="subtitle">
          Garage Operations Pro —
          Requisition
        </div>

        <div class="summary">

          <div class="card">
            <span>
              Requested
            </span>

            <strong>
              ${money(
                finance.requested
              )}
            </strong>
          </div>

          <div class="card">
            <span>
              Received
            </span>

            <strong>
              ${money(
                finance.received
              )}
            </strong>
          </div>

          <div class="card">
            <span>
              Balance
            </span>

            <strong>
              ${money(
                finance.balance
              )}
            </strong>
          </div>

        </div>

        <table>

          <thead>

            <tr>
              <th>Item Description</th>
              <th>Qty</th>
              <th>Unit Cost</th>
              <th>Total</th>
            </tr>

          </thead>

          <tbody>

            ${
              lines.map(
                line => {

                  const qty =
                    number(
                      line.quantity
                    );

                  const unit =
                    number(
                      line.unit_cost
                    );

                  const total =
                    qty > 0
                      ? qty * unit
                      : number(
                          line.total_amount
                        );

                  return `
                    <tr>

                      <td>
                        ${escapeHtml(
                          line.item_description ||
                          "—"
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
                }
              ).join("")
            }

          </tbody>

        </table>

        <div class="footer">

          <p>
            <strong>
              Requested:
            </strong>
            ${money(
              finance.requested
            )}
          </p>

          <p>
            <strong>
              Received:
            </strong>
            ${money(
              finance.received
            )}
          </p>

          <p>
            <strong>
              Balance:
            </strong>
            ${money(
              finance.balance
            )}
          </p>

          <p>
            Received amount is based only on
            petty cash linked to
            ${escapeHtml(reqNo)}.
          </p>

        </div>

      </body>

      </html>
    `);

    printWindow.document.close();

    setTimeout(
      () => {
        printWindow.print();
      },
      400
    );
  };

/* =========================================================
   PRINT ALL REQUISITIONS
========================================================= */

window.printRequisitions =
  function() {

    if (!requisitions.length) {
      showToast(
        "No requisitions to print.",
        "warning"
      );
      return;
    }

    const groups =
      new Map();

    requisitions.forEach(
      r => {

        const key =
          normalizeReqNo(
            r.req_no
          );

        if (!groups.has(key)) {
          groups.set(
            key,
            []
          );
        }

        groups
          .get(key)
          .push(r);
      }
    );

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1000,height=800"
      );

    if (!printWindow) {
      showToast(
        "Please allow pop-ups to print.",
        "warning"
      );
      return;
    }

    let html = `
      <!DOCTYPE html>

      <html>

      <head>

        <title>
          Garage Requisitions
        </title>

        <style>

          body{
            font-family:Arial,sans-serif;
            padding:30px;
            color:#111827;
          }

          h1{
            margin-bottom:25px;
          }

          .req{
            margin-bottom:35px;
            page-break-inside:avoid;
          }

          .summary{
            display:grid;
            grid-template-columns:repeat(3,1fr);
            gap:10px;
            margin:12px 0;
          }

          .card{
            border:1px solid #ddd;
            padding:10px;
            border-radius:7px;
          }

          .card span{
            display:block;
            font-size:11px;
            color:#6b7280;
          }

          .card strong{
            font-size:16px;
          }

          table{
            width:100%;
            border-collapse:collapse;
          }

          th,td{
            border:1px solid #ddd;
            padding:8px;
            text-align:left;
          }

          th{
            background:#f3f4f6;
          }

        </style>

      </head>

      <body>

        <h1>
          Garage Operations Pro —
          Requisitions
        </h1>
    `;

    groups.forEach(
      (lines, reqNo) => {

        const finance =
          getRequisitionFinance(
            reqNo
          );

        html += `
          <div class="req">

            <h2>
              ${escapeHtml(reqNo)}
            </h2>

            <div class="summary">

              <div class="card">
                <span>Requested</span>
                <strong>
                  ${money(
                    finance.requested
                  )}
                </strong>
              </div>

              <div class="card">
                <span>Received</span>
                <strong>
                  ${money(
                    finance.received
                  )}
                </strong>
              </div>

              <div class="card">
                <span>Balance</span>
                <strong>
                  ${money(
                    finance.balance
                  )}
                </strong>
              </div>

            </div>

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

                ${
                  lines.map(
                    line => {

                      const qty =
                        number(
                          line.quantity
                        );

                      const unit =
                        number(
                          line.unit_cost
                        );

                      const total =
                        qty > 0
                          ? qty * unit
                          : number(
                              line.total_amount
                            );

                      return `
                        <tr>
                          <td>
                            ${escapeHtml(
                              line.item_description ||
                              "—"
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
                    }
                  ).join("")
                }

              </tbody>

            </table>

          </div>
        `;
      }
    );

    html += `
      </body>
      </html>
    `;

    printWindow.document.write(
      html
    );

    printWindow.document.close();

    setTimeout(
      () => {
        printWindow.print();
      },
      500
    );
  };

/* =========================================================
   VEHICLE PRINT
========================================================= */

window.printVehicles =
  function() {

    if (!vehicles.length) {
      showToast(
        "No vehicles to print.",
        "warning"
      );
      return;
    }

    const rows =
      vehicles.map(
        v => `
          <tr>

            <td>
              ${escapeHtml(
                v.registration || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                v.customer || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                v.date_in || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                v.job_type || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                v.status || "—"
              )}
            </td>

            <td>
              ${money(v.billed)}
            </td>

            <td>
              ${money(v.paid)}
            </td>

            <td>
              ${money(
                Math.max(
                  number(v.billed) -
                  number(v.paid),
                  0
                )
              )}
            </td>

          </tr>
        `
      ).join("");

    const win =
      window.open(
        "",
        "_blank"
      );

    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>

      <html>

      <head>

        <title>
          Garage Vehicles
        </title>

        <style>

          body{
            font-family:Arial;
            padding:30px;
          }

          table{
            width:100%;
            border-collapse:collapse;
          }

          th,td{
            border:1px solid #ddd;
            padding:8px;
          }

          th{
            background:#f3f4f6;
          }

        </style>

      </head>

      <body>

        <h1>
          Garage Operations Pro
        </h1>

        <h2>
          Vehicle Report
        </h2>

        <table>

          <thead>

            <tr>
              <th>Registration</th>
              <th>Customer</th>
              <th>Date In</th>
              <th>Job</th>
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

      </body>

      </html>
    `);

    win.document.close();

    setTimeout(
      () => win.print(),
      400
    );
  };

/* =========================================================
   EXPENSE PRINT
========================================================= */

window.printExpenses =
  function() {

    const rows =
      expenses.map(
        e => `
          <tr>

            <td>
              ${escapeHtml(
                e.expense_date ||
                e.created_at?.slice(0,10) ||
                "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                vehicleName(
                  e.vehicle_id
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                e.description || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                e.category ||
                e.expense_type ||
                "—"
              )}
            </td>

            <td>
              ${money(e.amount)}
            </td>

          </tr>
        `
      ).join("");

    const win =
      window.open(
        "",
        "_blank"
      );

    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>

      <html>

      <head>

        <title>
          Garage Expenses
        </title>

        <style>

          body{
            font-family:Arial;
            padding:30px;
          }

          table{
            width:100%;
            border-collapse:collapse;
          }

          th,td{
            border:1px solid #ddd;
            padding:8px;
          }

          th{
            background:#f3f4f6;
          }

        </style>

      </head>

      <body>

        <h1>
          Garage Operations Pro
        </h1>

        <h2>
          Expense Report
        </h2>

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
            ${rows}
          </tbody>

        </table>

      </body>

      </html>
    `);

    win.document.close();

    setTimeout(
      () => win.print(),
      400
    );
  };

/* =========================================================
   PETTY CASH PRINT
========================================================= */

window.printPettyCash =
  function() {

    const rows =
      pettyCash.map(
        p => `
          <tr>

            <td>
              ${escapeHtml(
                p.cash_date ||
                p.created_at?.slice(0,10) ||
                "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                p.description || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                p.paid_to || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                p.category || "—"
              )}
            </td>

            <td>
              ${money(p.amount)}
            </td>

            <td>
              ${escapeHtml(
                p.notes || "—"
              )}
            </td>

          </tr>
        `
      ).join("");

    const win =
      window.open(
        "",
        "_blank"
      );

    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>

      <html>

      <head>

        <title>
          Garage Petty Cash
        </title>

        <style>

          body{
            font-family:Arial;
            padding:30px;
          }

          table{
            width:100%;
            border-collapse:collapse;
          }

          th,td{
            border:1px solid #ddd;
            padding:8px;
          }

          th{
            background:#f3f4f6;
          }

        </style>

      </head>

      <body>

        <h1>
          Garage Operations Pro
        </h1>

        <h2>
          Petty Cash Report
        </h2>

        <table>

          <thead>

            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Paid To</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Notes</th>
            </tr>

          </thead>

          <tbody>
            ${rows}
          </tbody>

        </table>

      </body>

      </html>
    `);

    win.document.close();

    setTimeout(
      () => win.print(),
      400
    );
  };

/* =========================================================
   VEHICLE EXPENSE PRINT
========================================================= */

window.printVehicleExpensePreview =
  function() {

    if (!selectedVehicleId) {
      showToast(
        "No vehicle selected.",
        "warning"
      );
      return;
    }

    const vehicle =
      vehicles.find(
        v =>
          String(v.id) ===
          String(
            selectedVehicleId
          )
      );

    if (!vehicle) return;

    const list =
      expenses.filter(
        e =>
          String(e.vehicle_id) ===
          String(
            selectedVehicleId
          )
      );

    const total =
      list.reduce(
        (sum, e) =>
          sum + number(e.amount),
        0
      );

    const rows =
      list.map(
        e => `
          <tr>

            <td>
              ${escapeHtml(
                e.expense_date ||
                e.created_at?.slice(0,10) ||
                "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                e.description || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                e.category ||
                e.expense_type ||
                "—"
              )}
            </td>

            <td>
              ${money(e.amount)}
            </td>

          </tr>
        `
      ).join("");

    const win =
      window.open(
        "",
        "_blank"
      );

    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>

      <html>

      <head>

        <title>
          ${escapeHtml(
            vehicle.registration
          )}
          Expenses
        </title>

        <style>

          body{
            font-family:Arial;
            padding:30px;
          }

          table{
            width:100%;
            border-collapse:collapse;
          }

          th,td{
            border:1px solid #ddd;
            padding:8px;
          }

          th{
            background:#f3f4f6;
          }

        </style>

      </head>

      <body>

        <h1>
          Garage Operations Pro
        </h1>

        <h2>
          ${escapeHtml(
            vehicle.registration
          )}
          — Expense Report
        </h2>

        <p>
          Customer:
          ${escapeHtml(
            vehicle.customer || "—"
          )}
        </p>

        <p>
          Total Expenses:
          <strong>
            ${money(total)}
          </strong>
        </p>

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

      </body>

      </html>
    `);

    win.document.close();

    setTimeout(
      () => win.print(),
      400
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

  const outstanding =
    Math.max(
      totalBilled -
      totalPaid,
      0
    );

  const expenseTotal =
    expenses.reduce(
      (sum, e) =>
        sum + number(e.amount),
      0
    );

  const pettyTotal =
    pettyCash.reduce(
      (sum, p) =>
        sum + number(p.amount),
      0
    );

  /*
    Count UNIQUE requisition numbers.
  */

  const uniqueReqNos =
    [
      ...new Set(
        requisitions
          .map(
            r =>
              normalizeReqNo(
                r.req_no
              )
          )
          .filter(Boolean)
      )
    ];

  /*
    Total requested value.
  */

  const requisitionTotal =
    requisitions.reduce(
      (sum, r) => {

        const qty =
          number(r.quantity);

        const unit =
          number(r.unit_cost);

        return (
          sum +
          (
            qty > 0
              ? qty * unit
              : number(
                  r.total_amount
                )
          )
        );
      },
      0
    );

  /* ---------------------------------------------
     MATCH EXACT HTML DASHBOARD IDs
  --------------------------------------------- */

  setText(
    "dashVehicles",
    totalVehicles
  );

  setText(
    "dashRepair",
    underRepair
  );

  setText(
    "dashOutstanding",
    money(outstanding)
  );

  setText(
    "dashReq",
    uniqueReqNos.length
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
    money(expenseTotal)
  );

  setText(
    "dashPetty",
    money(pettyTotal)
  );

  setText(
    "dashReqCount",
    uniqueReqNos.length
  );

  setText(
    "dashReqTotal",
    money(requisitionTotal)
  );

  renderDashboardActivity();
}

/* =========================================================
   DASHBOARD ACTIVITY
========================================================= */

function renderDashboardActivity() {

  const container =
    document.getElementById(
      "dashboardActivity"
    );

  if (!container) return;

  const recent =
    vehicles.slice(
      0,
      6
    );

  if (!recent.length) {

    container.innerHTML = `
      <div class="empty-state">
        No workshop activity yet.
      </div>
    `;

    return;
  }

  container.innerHTML =
    recent.map(
      v => `
        <div class="activity-item">

          <div class="activity-icon">
            🚘
          </div>

          <div class="activity-main">

            <strong>
              ${escapeHtml(
                v.registration || "Vehicle"
              )}
            </strong>

            <span>
              ${escapeHtml(
                v.customer || ""
              )}
            </span>

          </div>

          <span class="status ${statusClass(v.status)}">
            ${escapeHtml(
              v.status || "Pending"
            )}
          </span>

        </div>
      `
    ).join("");
}

/* =========================================================
   SEARCH EVENTS
========================================================= */

document.addEventListener(
  "input",
  event => {

    const id =
      event.target?.id;

    if (
      id ===
      "vehicleSearch"
    ) {
      renderVehicles();
    }

    if (
      id ===
      "expenseSearch"
    ) {
      renderExpenses();
    }

    if (
      id ===
      "pettySearch"
    ) {
      renderPettyCash();
    }

    if (
      id ===
      "reqSearch"
    ) {
      renderRequisitions();
    }

    if (
      id ===
      "reqQuantity" ||
      id ===
      "reqUnitCost"
    ) {
      updateRequisitionTotal();
    }
  }
);

/* =========================================================
   FILTER EVENTS
========================================================= */

document.addEventListener(
  "change",
  event => {

    const id =
      event.target?.id;

    if (
      id ===
      "vehicleStatusFilter"
    ) {
      renderVehicles();
    }

    if (
      id ===
      "expenseCategoryFilter"
    ) {
      renderExpenses();
    }

    if (
      id ===
      "pettyCategoryFilter"
    ) {
      renderPettyCash();
    }

    if (
      id ===
      "reqStatusFilter"
    ) {
      renderRequisitions();
    }
  }
);

/* =========================================================
   FORM SUBMISSION
   EXACT FORM IDs FROM HTML
========================================================= */

document.addEventListener(
  "submit",
  event => {

    if (
      event.target.id ===
      "vehicleForm"
    ) {

      event.preventDefault();

      window.saveVehicle();

      return;
    }

    if (
      event.target.id ===
      "expenseForm"
    ) {

      event.preventDefault();

      window.saveExpense();

      return;
    }

    if (
      event.target.id ===
      "pettyForm"
    ) {

      event.preventDefault();

      window.savePettyCash();

      return;
    }

    if (
      event.target.id ===
      "reqForm"
    ) {

      event.preventDefault();

      window.saveRequisition();

      return;
    }
  }
);

/* =========================================================
   MODAL OUTSIDE CLICK
========================================================= */

document.addEventListener(
  "click",
  event => {

    const target =
      event.target;

    if (
      target.classList &&
      target.classList.contains(
        "modal"
      )
    ) {

      target.style.display =
        "none";

      target.classList.remove(
        "show"
      );
    }
  }
);

/* =========================================================
   ESCAPE KEY
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key !==
      "Escape"
    ) {
      return;
    }

    document
      .querySelectorAll(
        ".modal.show"
      )
      .forEach(
        modal => {

          modal.classList.remove(
            "show"
          );

          modal.style.display =
            "none";
        }
      );
  }
);

/* =========================================================
   LIVE CLOCK
========================================================= */

function updateClock() {

  const now =
    new Date();

  /*
    These are safe even though
    the current HTML does not have
    liveDate/liveTime elements.
  */

  setText(
    "liveDate",
    now.toLocaleDateString(
      "en-KE",
      {
        weekday:
          "long",
        year:
          "numeric",
        month:
          "long",
        day:
          "numeric"
      }
    )
  );

  setText(
    "liveTime",
    now.toLocaleTimeString(
      "en-KE"
    )
  );
}

setInterval(
  updateClock,
  1000
);

/* =========================================================
   LOGIN-SAFE APP START
========================================================= */

let appStarted = false;

async function startApp() {

  if (appStarted) {
    return;
  }

  appStarted = true;

  try {

    injectPremiumStyles();

    /*
      Load in dependency order:
      Vehicles
      Expenses
      Requisitions
      Petty Cash

      Requisitions load before petty cash
      so requisition links can be populated.
    */

    await loadVehicles();

    await loadExpenses();

    await loadRequisitions();

    await loadPettyCash();

    populateVehicleSelects();

    populatePettyCashReqSelect();

    renderDashboard();

    updateClock();

    /*
      Always show dashboard after
      application has initialized,
      but only if the user is already
      logged in.
    */

    const loggedIn =
      sessionStorage.getItem(
        "garageLoggedIn"
      );

    if (
      loggedIn ===
      "true"
    ) {
      showSection(
        "dashboard"
      );
    }

  } catch (error) {

    console.error(
      "Application startup error:",
      error
    );

    showToast(
      "The application could not finish loading. Check the browser console.",
      "error"
    );
  }
}

/* =========================================================
   START AFTER DOM READY
========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    startApp
  );

} else {

  startApp();

}

/* =========================================================
   GLOBAL ERROR HANDLING
========================================================= */

window.addEventListener(
  "error",
  event => {

    console.error(
      "Garage Operations Pro error:",
      event.error ||
      event.message
    );

  }
);

window.addEventListener(
  "unhandledrejection",
  event => {

    console.error(
      "Garage Operations Pro promise error:",
      event.reason
    );

  }
);
