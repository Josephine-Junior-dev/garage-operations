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
  return "KSh " + Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function today() {
  const d = new Date();

  d.setMinutes(
    d.getMinutes() - d.getTimezoneOffset()
  );

  return d.toISOString().slice(0, 10);
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

  if (!id) {
    return "General";
  }

  const vehicle =
    vehicles.find(v => v.id === id);

  return vehicle
    ? escapeHtml(vehicle.registration)
    : "Unknown";
}

function statusClass(status) {

  const s =
    String(status || "").toLowerCase();

  if (s.includes("repair")) {
    return "status-repair";
  }

  if (
    s.includes("completed") ||
    s.includes("released") ||
    s.includes("approved")
  ) {
    return "status-completed";
  }

  if (s.includes("rejected")) {
    return "status-rejected";
  }

  return "status-pending";
}

function showToast(message, error = false) {

  const toast =
    document.getElementById("toast");

  if (!toast) {
    console.log(message);
    return;
  }

  toast.textContent = message;

  toast.className =
    "toast show" +
    (error ? " error" : "");

  setTimeout(() => {
    toast.className = "toast";
  }, 4500);
}

function supabaseError(prefix, error) {

  console.error(prefix, error);

  const details = [
    error?.message,
    error?.details,
    error?.hint,
    error?.code
  ]
    .filter(Boolean)
    .join(" | ");

  showToast(
    prefix +
    (details ? ": " + details : ""),
    true
  );
}

// ======================================================
// MODAL FUNCTIONS
// IMPORTANT: attached to window because app.js is module
// ======================================================

window.openModal = function(id) {

  const modal =
    document.getElementById(id);

  if (modal) {
    modal.classList.add("show");
  }
};

window.closeModal = function(id) {

  const modal =
    document.getElementById(id);

  if (modal) {
    modal.classList.remove("show");
  }
};

// ======================================================
// NAVIGATION
// ======================================================

window.showSection =
  function(sectionId, button) {

    document
      .querySelectorAll(".section")
      .forEach(section => {
        section.classList.remove("active");
      });

    document
      .querySelectorAll(".nav button")
      .forEach(btn => {
        btn.classList.remove("active");
      });

    const section =
      document.getElementById(sectionId);

    if (section) {
      section.classList.add("active");
    }

    if (button) {
      button.classList.add("active");
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

// ======================================================
// DASHBOARD NAVIGATION
// ======================================================

window.goToDashboardSection =
  function(sectionId) {

    const buttons =
      document.querySelectorAll(
        ".nav button"
      );

    let matchingButton = null;

    buttons.forEach(btn => {

      const onclick =
        btn.getAttribute("onclick") || "";

      if (
        onclick.includes(
          `'${sectionId}'`
        ) ||
        onclick.includes(
          `"${sectionId}"`
        )
      ) {
        matchingButton = btn;
      }
    });

    window.showSection(
      sectionId,
      matchingButton
    );

    if (sectionId === "vehiclesSection") {
      window.renderVehicles();
    }

    if (sectionId === "expensesSection") {
      window.renderExpenses();
    }

    if (sectionId === "pettySection") {
      window.renderPettyCash();
    }

    if (
      sectionId ===
      "requisitionsSection"
    ) {
      window.renderRequisitions();
    }
  };

// ======================================================
// LOAD VEHICLES
// ======================================================

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

  const { data, error } =
    await supabase
      .from(TABLES.expenses)
      .select("*")
      .order(
        "expense_date",
        { ascending: false }
      );

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

  const { data, error } =
    await supabase
      .from(TABLES.petty)
      .select("*")
      .order(
        "cash_date",
        { ascending: false }
      );

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

  const { data, error } =
    await supabase
      .from(TABLES.requisitions)
      .select("*")
      .order(
        "req_date",
        { ascending: false }
      );

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

window.loadAllData =
  async function() {

    showToast(
      "Loading garage data..."
    );

    try {

      await loadVehicles();
      await loadExpenses();
      await loadPettyCash();
      await loadRequisitions();

      populateVehicleSelects();

      renderDashboard();

      window.renderVehicles();
      window.renderExpenses();
      window.renderPettyCash();
      window.renderRequisitions();

      showToast(
        "Garage data loaded successfully."
      );

    } catch (result) {

      const table =
        result?.table || "unknown table";

      const error =
        result?.error || result;

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
    document.getElementById(
      "expenseVehicle"
    ),
    document.getElementById(
      "reqVehicle"
    )
  ];

  selects.forEach(select => {

    if (!select) return;

    const currentValue =
      select.value;

    select.innerHTML =
      `<option value="">
        General / No Vehicle
      </option>`;

    vehicles.forEach(vehicle => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        vehicle.id;

      option.textContent =
        vehicle.registration +
        (
          vehicle.customer
            ? " — " +
              vehicle.customer
            : ""
        );

      select.appendChild(option);
    });

    select.value =
      currentValue;
  });
}

// ======================================================
// DASHBOARD
// ======================================================

function renderDashboard() {

  const totalVehicles =
    vehicles.length;

  const underRepair =
    vehicles.filter(v =>
      String(v.status || "")
        .toLowerCase() ===
      "under repair"
    ).length;

  const billed =
    vehicles.reduce(
      (sum, v) =>
        sum + number(v.billed),
      0
    );

  const paid =
    vehicles.reduce(
      (sum, v) =>
        sum + number(v.paid),
      0
    );

  const outstanding =
    billed - paid;

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

  // NEW REQUISITION TOTAL

  const requisitionTotal =
    requisitions.reduce(
      (sum, r) =>
        sum + number(r.total_amount),
      0
    );

  const set = (
    id,
    value
  ) => {

    const el =
      document.getElementById(id);

    if (el) {
      el.textContent = value;
    }
  };

  set(
    "dashVehicles",
    totalVehicles
  );

  set(
    "dashRepair",
    underRepair
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
    "dashOutstanding",
    money(outstanding)
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
    "dashReq",
    requisitions.length
  );

  // NEW
  set(
    "dashReqTotal",
    money(requisitionTotal)
  );
}

// ======================================================
// VEHICLES
// ======================================================

window.renderVehicles =
  function() {

    const body =
      document.getElementById(
        "vehiclesBody"
      );

    if (!body) return;

    const search =
      String(
        document.getElementById(
          "vehicleSearch"
        )?.value || ""
      ).toLowerCase();

    const status =
      document.getElementById(
        "vehicleStatusFilter"
      )?.value || "";

    const filtered =
      vehicles.filter(vehicle => {

        const matchesSearch =
          !search ||
          String(
            vehicle.registration || ""
          )
            .toLowerCase()
            .includes(search) ||
          String(
            vehicle.customer || ""
          )
            .toLowerCase()
            .includes(search);

        const matchesStatus =
          !status ||
          vehicle.status === status;

        return (
          matchesSearch &&
          matchesStatus
        );
      });

    if (!filtered.length) {

      body.innerHTML = `
        <tr>
          <td colspan="9" class="empty">
            No vehicles found.
          </td>
        </tr>
      `;

      return;
    }

    body.innerHTML =
      filtered
        .map(vehicle => {

          const billed =
            number(vehicle.billed);

          const paid =
            number(vehicle.paid);

          const outstanding =
            billed - paid;

          return `
            <tr
              class="clickable-row"
              data-vehicle-id="${escapeHtml(vehicle.id)}">

              <td>
                <strong>
                  ${escapeHtml(
                    vehicle.registration
                  )}
                </strong>
              </td>

              <td>
                ${escapeHtml(
                  vehicle.customer
                )}
              </td>

              <td>
                ${escapeHtml(
                  vehicle.date_in || ""
                )}
              </td>

              <td>
                ${escapeHtml(
                  vehicle.job_type || ""
                )}
              </td>

              <td>
                <span
                  class="status ${statusClass(
                    vehicle.status
                  )}">
                  ${escapeHtml(
                    vehicle.status || ""
                  )}
                </span>
              </td>

              <td>
                ${money(billed)}
              </td>

              <td>
                ${money(paid)}
              </td>

              <td>
                ${money(outstanding)}
              </td>

              <td>
                <div class="actions">

                  <button
                    type="button"
                    class="btn btn-secondary btn-small"
                    onclick="event.stopPropagation(); window.editVehicle('${vehicle.id}')">
                    Edit
                  </button>

                  <button
                    type="button"
                    class="btn btn-danger btn-small"
                    onclick="event.stopPropagation(); window.deleteVehicle('${vehicle.id}')">
                    Delete
                  </button>

                </div>
              </td>

            </tr>
          `;
        })
        .join("");
  };

// ======================================================
// VEHICLE MODAL
// ======================================================

window.openVehicleModal =
  function(id = null) {

    document.getElementById(
      "vehicleId"
    ).value = id || "";

    document.getElementById(
      "vehicleModalTitle"
    ).textContent =
      id
        ? "Edit Vehicle"
        : "Add Vehicle";

    if (!id) {

      document.getElementById(
        "vehicleRegistration"
      ).value = "";

      document.getElementById(
        "vehicleCustomer"
      ).value = "";

      document.getElementById(
        "vehicleDateIn"
      ).value = today();

      document.getElementById(
        "vehicleDateOut"
      ).value = "";

      document.getElementById(
        "vehicleJobType"
      ).value = "Repair";

      document.getElementById(
        "vehicleStatus"
      ).value = "Under Repair";

      document.getElementById(
        "vehicleBilled"
      ).value = "0";

      document.getElementById(
        "vehiclePaid"
      ).value = "0";

      document.getElementById(
        "vehicleReleasedTo"
      ).value = "";

      document.getElementById(
        "vehicleReleasedContact"
      ).value = "";

      document.getElementById(
        "vehicleDescription"
      ).value = "";
    }

    window.openModal(
      "vehicleModal"
    );
  };

window.editVehicle =
  function(id) {

    const vehicle =
      vehicles.find(
        v => v.id === id
      );

    if (!vehicle) {
      showToast(
        "Vehicle not found.",
        true
      );
      return;
    }

    document.getElementById(
      "vehicleId"
    ).value = vehicle.id;

    document.getElementById(
      "vehicleRegistration"
    ).value =
      vehicle.registration || "";

    document.getElementById(
      "vehicleCustomer"
    ).value =
      vehicle.customer || "";

    document.getElementById(
      "vehicleDateIn"
    ).value =
      vehicle.date_in || today();

    document.getElementById(
      "vehicleDateOut"
    ).value =
      vehicle.date_out || "";

    document.getElementById(
      "vehicleJobType"
    ).value =
      vehicle.job_type || "Repair";

    document.getElementById(
      "vehicleStatus"
    ).value =
      vehicle.status ||
      "Under Repair";

    document.getElementById(
      "vehicleBilled"
    ).value =
      vehicle.billed || 0;

    document.getElementById(
      "vehiclePaid"
    ).value =
      vehicle.paid || 0;

    document.getElementById(
      "vehicleReleasedTo"
    ).value =
      vehicle.released_to || "";

    document.getElementById(
      "vehicleReleasedContact"
    ).value =
      vehicle.released_contact || "";

    document.getElementById(
      "vehicleDescription"
    ).value =
      vehicle.description || "";

    document.getElementById(
      "vehicleModalTitle"
    ).textContent =
      "Edit Vehicle";

    window.openModal(
      "vehicleModal"
    );
  };

window.saveVehicle =
  async function(event) {

    event.preventDefault();

    const id =
      document.getElementById(
        "vehicleId"
      ).value;

    const payload = {

      registration:
        document.getElementById(
          "vehicleRegistration"
        ).value.trim(),

      customer:
        document.getElementById(
          "vehicleCustomer"
        ).value.trim(),

      date_in:
        document.getElementById(
          "vehicleDateIn"
        ).value || today(),

      date_out:
        document.getElementById(
          "vehicleDateOut"
        ).value || null,

      job_type:
        document.getElementById(
          "vehicleJobType"
        ).value,

      status:
        document.getElementById(
          "vehicleStatus"
        ).value,

      released_to:
        document.getElementById(
          "vehicleReleasedTo"
        ).value.trim() || null,

      released_contact:
        document.getElementById(
          "vehicleReleasedContact"
        ).value.trim() || null,

      description:
        document.getElementById(
          "vehicleDescription"
        ).value.trim() || null,

      billed:
        number(
          document.getElementById(
            "vehicleBilled"
          ).value
        ),

      paid:
        number(
          document.getElementById(
            "vehiclePaid"
          ).value
        )
    };

    if (
      !payload.registration ||
      !payload.customer
    ) {

      showToast(
        "Registration and customer are required.",
        true
      );

      return;
    }

    try {

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
        throw result.error;
      }

      window.closeModal(
        "vehicleModal"
      );

      await window.loadAllData();

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

window.deleteVehicle =
  async function(id) {

    const vehicle =
      vehicles.find(
        v => v.id === id
      );

    if (!vehicle) return;

    if (
      !confirm(
        `Delete vehicle ${vehicle.registration}?`
      )
    ) {
      return;
    }

    try {

      const { error } =
        await supabase
          .from(TABLES.vehicles)
          .delete()
          .eq("id", id);

      if (error) {
        throw error;
      }

      await window.loadAllData();

      showToast(
        "Vehicle deleted."
      );

    } catch (error) {

      supabaseError(
        "Unable to delete vehicle",
        error
      );
    }
  };

// ======================================================
// EXPENSES
// ======================================================

window.renderExpenses =
  function() {

    const body =
      document.getElementById(
        "expensesBody"
      );

    if (!body) return;

    const search =
      String(
        document.getElementById(
          "expenseSearch"
        )?.value || ""
      ).toLowerCase();

    const category =
      document.getElementById(
        "expenseCategoryFilter"
      )?.value || "";

    const filtered =
      expenses.filter(expense => {

        const vehicle =
          vehicles.find(
            v =>
              v.id ===
              expense.vehicle_id
          );

        const matchesSearch =
          !search ||
          String(
            expense.description || ""
          )
            .toLowerCase()
            .includes(search) ||
          String(
            vehicle?.registration || ""
          )
            .toLowerCase()
            .includes(search);

        const matchesCategory =
          !category ||
          expense.category ===
          category;

        return (
          matchesSearch &&
          matchesCategory
        );
      });

    if (!filtered.length) {

      body.innerHTML = `
        <tr>
          <td colspan="6" class="empty">
            No expenses found.
          </td>
        </tr>
      `;

      return;
    }

    body.innerHTML =
      filtered
        .map(expense => {

          return `
            <tr
              class="clickable-row"
              data-expense-id="${escapeHtml(expense.id)}">

              <td>
                ${escapeHtml(
                  expense.expense_date || ""
                )}
              </td>

              <td>
                ${vehicleName(
                  expense.vehicle_id
                )}
              </td>

              <td>
                ${escapeHtml(
                  expense.description
                )}
              </td>

              <td>
                ${escapeHtml(
                  expense.category || ""
                )}
              </td>

              <td>
                ${money(
                  expense.amount
                )}
              </td>

              <td>
                <div class="actions">

                  <button
                    type="button"
                    class="btn btn-secondary btn-small"
                    onclick="event.stopPropagation(); window.editExpense('${expense.id}')">
                    Edit
                  </button>

                  <button
                    type="button"
                    class="btn btn-danger btn-small"
                    onclick="event.stopPropagation(); window.deleteExpense('${expense.id}')">
                    Delete
                  </button>

                </div>
              </td>

            </tr>
          `;
        })
        .join("");
  };

window.openExpenseModal =
  function(id = null) {

    document.getElementById(
      "expenseId"
    ).value = id || "";

    document.getElementById(
      "expenseModalTitle"
    ).textContent =
      id
        ? "Edit Expense"
        : "Add Expense";

    populateVehicleSelects();

    if (!id) {

      document.getElementById(
        "expenseVehicle"
      ).value = "";

      document.getElementById(
        "expenseDate"
      ).value = today();

      document.getElementById(
        "expenseDescription"
      ).value = "";

      document.getElementById(
        "expenseCategory"
      ).value = "Parts";

      document.getElementById(
        "expenseAmount"
      ).value = "0";
    }

    window.openModal(
      "expenseModal"
    );
  };

window.editExpense =
  function(id) {

    const expense =
      expenses.find(
        e => e.id === id
      );

    if (!expense) {

      showToast(
        "Expense not found.",
        true
      );

      return;
    }

    populateVehicleSelects();

    document.getElementById(
      "expenseId"
    ).value = expense.id;

    document.getElementById(
      "expenseVehicle"
    ).value =
      expense.vehicle_id || "";

    document.getElementById(
      "expenseDate"
    ).value =
      expense.expense_date ||
      today();

    document.getElementById(
      "expenseDescription"
    ).value =
      expense.description || "";

    document.getElementById(
      "expenseCategory"
    ).value =
      expense.category || "Other";

    document.getElementById(
      "expenseAmount"
    ).value =
      expense.amount || 0;

    document.getElementById(
      "expenseModalTitle"
    ).textContent =
      "Edit Expense";

    window.openModal(
      "expenseModal"
    );
  };

window.saveExpense =
  async function(event) {

    event.preventDefault();

    const id =
      document.getElementById(
        "expenseId"
      ).value;

    const payload = {

      vehicle_id:
        document.getElementById(
          "expenseVehicle"
        ).value || null,

      expense_date:
        document.getElementById(
          "expenseDate"
        ).value || today(),

      description:
        document.getElementById(
          "expenseDescription"
        ).value.trim(),

      category:
        document.getElementById(
          "expenseCategory"
        ).value || "Parts",

      amount:
        number(
          document.getElementById(
            "expenseAmount"
          ).value
        )
    };

    if (!payload.description) {

      showToast(
        "Expense description is required.",
        true
      );

      return;
    }

    try {

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
        throw result.error;
      }

      window.closeModal(
        "expenseModal"
      );

      await window.loadAllData();

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

window.deleteExpense =
  async function(id) {

    if (
      !confirm(
        "Delete this expense?"
      )
    ) {
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

      await window.loadAllData();

      showToast(
        "Expense deleted."
      );

    } catch (error) {

      supabaseError(
        "Unable to delete expense",
        error
      );
    }
  };

// ======================================================
// PETTY CASH
// ======================================================

window.renderPettyCash =
  function() {

    const body =
      document.getElementById(
        "pettyBody"
      );

    if (!body) return;

    const search =
      String(
        document.getElementById(
          "pettySearch"
        )?.value || ""
      ).toLowerCase();

    const category =
      document.getElementById(
        "pettyCategoryFilter"
      )?.value || "";

    const filtered =
      pettyCash.filter(item => {

        const matchesSearch =
          !search ||
          String(
            item.description || ""
          )
            .toLowerCase()
            .includes(search) ||
          String(
            item.paid_to || ""
          )
            .toLowerCase()
            .includes(search);

        const matchesCategory =
          !category ||
          item.category === category;

        return (
          matchesSearch &&
          matchesCategory
        );
      });

    if (!filtered.length) {

      body.innerHTML = `
        <tr>
          <td colspan="7" class="empty">
            No petty cash records found.
          </td>
        </tr>
      `;

      return;
    }

    body.innerHTML =
      filtered
        .map(item => {

          return `
            <tr
              class="clickable-row"
              data-petty-id="${escapeHtml(item.id)}">

              <td>
                ${escapeHtml(
                  item.cash_date || ""
                )}
              </td>

              <td>
                ${escapeHtml(
                  item.description
                )}
              </td>

              <td>
                ${escapeHtml(
                  item.paid_to || ""
                )}
              </td>

              <td>
                ${escapeHtml(
                  item.category || ""
                )}
              </td>

              <td>
                ${money(item.amount)}
              </td>

              <td>
                ${escapeHtml(
                  item.notes || ""
                )}
              </td>

              <td>
                <div class="actions">

                  <button
                    type="button"
                    class="btn btn-secondary btn-small"
                    onclick="event.stopPropagation(); window.editPettyCash('${item.id}')">
                    Edit
                  </button>

                  <button
                    type="button"
                    class="btn btn-danger btn-small"
                    onclick="event.stopPropagation(); window.deletePettyCash('${item.id}')">
                    Delete
                  </button>

                </div>
              </td>

            </tr>
          `;
        })
        .join("");
  };

window.openPettyModal =
  function(id = null) {

    document.getElementById(
      "pettyId"
    ).value = id || "";

    document.getElementById(
      "pettyModalTitle"
    ).textContent =
      id
        ? "Edit Petty Cash"
        : "Add Petty Cash";

    if (!id) {

      document.getElementById(
        "pettyDate"
      ).value = today();

      document.getElementById(
        "pettyDescription"
      ).value = "";

      document.getElementById(
        "pettyPaidTo"
      ).value = "";

      document.getElementById(
        "pettyCategory"
      ).value = "Transport";

      document.getElementById(
        "pettyAmount"
      ).value = "0";

      document.getElementById(
        "pettyNotes"
      ).value = "";
    }

    window.openModal(
      "pettyModal"
    );
  };

window.editPettyCash =
  function(id) {

    const item =
      pettyCash.find(
        p => p.id === id
      );

    if (!item) {

      showToast(
        "Petty cash record not found.",
        true
      );

      return;
    }

    document.getElementById(
      "pettyId"
    ).value = item.id;

    document.getElementById(
      "pettyDate"
    ).value =
      item.cash_date || today();

    document.getElementById(
      "pettyDescription"
    ).value =
      item.description || "";

    document.getElementById(
      "pettyPaidTo"
    ).value =
      item.paid_to || "";

    document.getElementById(
      "pettyCategory"
    ).value =
      item.category || "Other";

    document.getElementById(
      "pettyAmount"
    ).value =
      item.amount || 0;

    document.getElementById(
      "pettyNotes"
    ).value =
      item.notes || "";

    document.getElementById(
      "pettyModalTitle"
    ).textContent =
      "Edit Petty Cash";

    window.openModal(
      "pettyModal"
    );
  };

window.savePettyCash =
  async function(event) {

    event.preventDefault();

    const id =
      document.getElementById(
        "pettyId"
      ).value;

    const payload = {

      cash_date:
        document.getElementById(
          "pettyDate"
        ).value || today(),

      description:
        document.getElementById(
          "pettyDescription"
        ).value.trim(),

      paid_to:
        document.getElementById(
          "pettyPaidTo"
        ).value.trim() || null,

      category:
        document.getElementById(
          "pettyCategory"
        ).value || null,

      amount:
        number(
          document.getElementById(
            "pettyAmount"
          ).value
        ),

      notes:
        document.getElementById(
          "pettyNotes"
        ).value.trim() || null
    };

    if (!payload.description) {

      showToast(
        "Petty cash description is required.",
        true
      );

      return;
    }

    try {

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
        throw result.error;
      }

      window.closeModal(
        "pettyModal"
      );

      await window.loadAllData();

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

window.deletePettyCash =
  async function(id) {

    if (
      !confirm(
        "Delete this petty cash record?"
      )
    ) {
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

      await window.loadAllData();

      showToast(
        "Petty cash record deleted."
      );

    } catch (error) {

      supabaseError(
        "Unable to delete petty cash",
        error
      );
    }
  };

// ======================================================
// REQUISITIONS
// ======================================================

window.renderRequisitions =
  function() {

    const body =
      document.getElementById(
        "requisitionsBody"
      );

    if (!body) return;

    const search =
      String(
        document.getElementById(
          "reqSearch"
        )?.value || ""
      ).toLowerCase();

    const status =
      document.getElementById(
        "reqStatusFilter"
      )?.value || "";

    const filtered =
      requisitions.filter(req => {

        const matchesSearch =
          !search ||
          String(
            req.req_no || ""
          )
            .toLowerCase()
            .includes(search) ||
          String(
            req.item_description || ""
          )
            .toLowerCase()
            .includes(search) ||
          String(
            req.requested_by || ""
          )
            .toLowerCase()
            .includes(search) ||
          String(
            vehicleName(
              req.vehicle_id
            )
          )
            .toLowerCase()
            .includes(search);

        const matchesStatus =
          !status ||
          req.status === status;

        return (
          matchesSearch &&
          matchesStatus
        );
      });

    // ==================================================
    // OVERALL TOTAL OF CURRENTLY DISPLAYED REQUISITIONS
    // ==================================================

    const overallTotal =
      filtered.reduce(
        (sum, req) =>
          sum +
          number(req.total_amount),
        0
      );

    const totalElement =
      document.getElementById(
        "reqOverallTotal"
      );

    if (totalElement) {

      totalElement.textContent =
        money(overallTotal);
    }

    // ==================================================
    // TABLE
    // ==================================================

    if (!filtered.length) {

      body.innerHTML = `
        <tr>
          <td colspan="11" class="empty">
            No requisitions found.
          </td>
        </tr>
      `;

      return;
    }

    body.innerHTML =
      filtered
        .map(req => {

          return `
            <tr
              class="clickable-row"
              data-requisition-id="${escapeHtml(req.id)}">

              <td>
                <strong>
                  ${escapeHtml(
                    req.req_no
                  )}
                </strong>
              </td>

              <td>
                ${escapeHtml(
                  req.req_date || ""
                )}
              </td>

              <td>
                ${escapeHtml(
                  req.requested_by
                )}
              </td>

              <td>
                ${vehicleName(
                  req.vehicle_id
                )}
              </td>

              <td>
                ${escapeHtml(
                  req.item_description
                )}
              </td>

              <td>
                ${number(
                  req.quantity
                )}
              </td>

              <td>
                ${money(
                  req.unit_cost
                )}
              </td>

              <td>
                <strong>
                  ${money(
                    req.total_amount
                  )}
                </strong>
              </td>

              <td>
                ${escapeHtml(
                  req.expense_type || ""
                )}
              </td>

              <td>
                <span
                  class="status ${statusClass(
                    req.status
                  )}">
                  ${escapeHtml(
                    req.status || ""
                  )}
                </span>
              </td>

              <td>
                <div class="actions">

                  <button
                    type="button"
                    class="btn btn-secondary btn-small"
                    onclick="event.stopPropagation(); window.editRequisition('${req.id}')">
                    Edit
                  </button>

                  <button
                    type="button"
                    class="btn btn-danger btn-small"
                    onclick="event.stopPropagation(); window.deleteRequisition('${req.id}')">
                    Delete
                  </button>

                </div>
              </td>

            </tr>
          `;
        })
        .join("");
  };

// ======================================================
// REQUISITION AUTO TOTAL
// ======================================================

window.calculateReqTotal =
  function() {

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
      quantity * unitCost;

    const display =
      document.getElementById(
        "reqTotalDisplay"
      );

    if (display) {

      display.textContent =
        total.toLocaleString(
          "en-KE",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }
        );
    }
  };

// ======================================================
// OPEN REQUISITION
// ======================================================

window.openRequisitionModal =
  function(id = null) {

    document.getElementById(
      "reqId"
    ).value = id || "";

    document.getElementById(
      "requisitionModalTitle"
    ).textContent =
      id
        ? "Edit Requisition"
        : "Add Requisition";

    populateVehicleSelects();

    if (!id) {

      document.getElementById(
        "reqNo"
      ).value = "";

      document.getElementById(
        "reqDate"
      ).value = today();

      document.getElementById(
        "reqRequestedBy"
      ).value = "";

      document.getElementById(
        "reqVehicle"
      ).value = "";

      document.getElementById(
        "reqItemDescription"
      ).value = "";

      document.getElementById(
        "reqQuantity"
      ).value = "1";

      document.getElementById(
        "reqUnitCost"
      ).value = "0";

      document.getElementById(
        "reqExpenseType"
      ).value = "Materials";

      document.getElementById(
        "reqStatus"
      ).value = "Pending";

      document.getElementById(
        "reqNotes"
      ).value = "";

      window.calculateReqTotal();
    }

    window.openModal(
      "requisitionModal"
    );
  };

// ======================================================
// EDIT REQUISITION
// ======================================================

window.editRequisition =
  function(id) {

    const req =
      requisitions.find(
        r => r.id === id
      );

    if (!req) {

      showToast(
        "Requisition not found.",
        true
      );

      return;
    }

    populateVehicleSelects();

    document.getElementById(
      "reqId"
    ).value = req.id;

    document.getElementById(
      "reqNo"
    ).value =
      req.req_no || "";

    document.getElementById(
      "reqDate"
    ).value =
      req.req_date || today();

    document.getElementById(
      "reqRequestedBy"
    ).value =
      req.requested_by || "";

    document.getElementById(
      "reqVehicle"
    ).value =
      req.vehicle_id || "";

    document.getElementById(
      "reqItemDescription"
    ).value =
      req.item_description || "";

    document.getElementById(
      "reqQuantity"
    ).value =
      req.quantity || 1;

    document.getElementById(
      "reqUnitCost"
    ).value =
      req.unit_cost || 0;

    document.getElementById(
      "reqExpenseType"
    ).value =
      req.expense_type ||
      "Materials";

    document.getElementById(
      "reqStatus"
    ).value =
      req.status || "Pending";

    document.getElementById(
      "reqNotes"
    ).value =
      req.notes || "";

    window.calculateReqTotal();

    document.getElementById(
      "requisitionModalTitle"
    ).textContent =
      "Edit Requisition";

    window.openModal(
      "requisitionModal"
    );
  };

// ======================================================
// SAVE REQUISITION
// ======================================================

window.saveRequisition =
  async function(event) {

    event.preventDefault();

    const id =
      document.getElementById(
        "reqId"
      ).value;

    const quantity =
      number(
        document.getElementById(
          "reqQuantity"
        ).value
      );

    const unitCost =
      number(
        document.getElementById(
          "reqUnitCost"
        ).value
      );

    const payload = {

      req_no:
        document.getElementById(
          "reqNo"
        ).value.trim(),

      req_date:
        document.getElementById(
          "reqDate"
        ).value || today(),

      requested_by:
        document.getElementById(
          "reqRequestedBy"
        ).value.trim(),

      vehicle_id:
        document.getElementById(
          "reqVehicle"
        ).value || null,

      item_description:
        document.getElementById(
          "reqItemDescription"
        ).value.trim(),

      quantity,

      unit_cost:
        unitCost,

      total_amount:
        quantity * unitCost,

      status:
        document.getElementById(
          "reqStatus"
        ).value,

      notes:
        document.getElementById(
          "reqNotes"
        ).value.trim() || null,

      expense_type:
        document.getElementById(
          "reqExpenseType"
        ).value
    };

    if (
      !payload.req_no ||
      !payload.requested_by ||
      !payload.item_description
    ) {

      showToast(
        "Requisition number, requested by and item description are required.",
        true
      );

      return;
    }

    try {

      let result;

      if (id) {

        result =
          await supabase
            .from(TABLES.requisitions)
            .update(payload)
            .eq("id", id);

      } else {

        result =
          await supabase
            .from(TABLES.requisitions)
            .insert(payload);
      }

      if (result.error) {
        throw result.error;
      }

      window.closeModal(
        "requisitionModal"
      );

      await window.loadAllData();

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

window.deleteRequisition =
  async function(id) {

    if (
      !confirm(
        "Delete this requisition?"
      )
    ) {
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

      await window.loadAllData();

      showToast(
        "Requisition deleted."
      );

    } catch (error) {

      supabaseError(
        "Unable to delete requisition",
        error
      );
    }
  };

// ======================================================
// CLICKABLE TABLE ROWS
// ======================================================

function setupClickableRows() {

  const vehiclesBody =
    document.getElementById(
      "vehiclesBody"
    );

  if (vehiclesBody) {

    vehiclesBody.addEventListener(
      "click",
      event => {

        if (
          event.target.closest(
            "button"
          )
        ) {
          return;
        }

        const row =
          event.target.closest(
            "tr[data-vehicle-id]"
          );

        if (row) {

          window.editVehicle(
            row.dataset.vehicleId
          );
        }
      }
    );
  }

  const expensesBody =
    document.getElementById(
      "expensesBody"
    );

  if (expensesBody) {

    expensesBody.addEventListener(
      "click",
      event => {

        if (
          event.target.closest(
            "button"
          )
        ) {
          return;
        }

        const row =
          event.target.closest(
            "tr[data-expense-id]"
          );

        if (row) {

          window.editExpense(
            row.dataset.expenseId
          );
        }
      }
    );
  }

  const pettyBody =
    document.getElementById(
      "pettyBody"
    );

  if (pettyBody) {

    pettyBody.addEventListener(
      "click",
      event => {

        if (
          event.target.closest(
            "button"
          )
        ) {
          return;
        }

        const row =
          event.target.closest(
            "tr[data-petty-id]"
          );

        if (row) {

          window.editPettyCash(
            row.dataset.pettyId
          );
        }
      }
    );
  }

  const requisitionsBody =
    document.getElementById(
      "requisitionsBody"
    );

  if (requisitionsBody) {

    requisitionsBody.addEventListener(
      "click",
      event => {

        if (
          event.target.closest(
            "button"
          )
        ) {
          return;
        }

        const row =
          event.target.closest(
            "tr[data-requisition-id]"
          );

        if (row) {

          window.editRequisition(
            row.dataset.requisitionId
          );
        }
      }
    );
  }
}

// ======================================================
// PRINT
// ======================================================

window.printSection =
  function(title, elementId) {

    const element =
      document.getElementById(
        elementId
      );

    if (!element) {

      showToast(
        "Nothing available to print.",
        true
      );

      return;
    }

    const printWindow =
      window.open(
        "",
        "_blank"
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

        <title>
          ${escapeHtml(title)}
        </title>

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1">

        <style>

          body {
            font-family: Arial, sans-serif;
            padding: 25px;
            color: #111827;
          }

          h1 {
            text-align: center;
            margin-bottom: 5px;
          }

          .date {
            text-align: center;
            margin-bottom: 20px;
            color: #6b7280;
          }

          .print-summary {
            border: 1px solid #d1d5db;
            padding: 12px;
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
            font-weight: 700;
          }

          .print-summary strong {
            font-size: 18px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          th,
          td {
            border: 1px solid #d1d5db;
            padding: 8px;
            text-align: left;
          }

          th {
            background: #f3f4f6;
          }

          button,
          .actions {
            display: none !important;
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
          ${escapeHtml(title)}
        </h1>

        <div class="date">
          Printed:
          ${new Date().toLocaleString("en-KE")}
        </div>

        ${element.outerHTML}

      </body>

      </html>
    `);

    printWindow.document.close();

    setTimeout(() => {

      printWindow.focus();

      printWindow.print();

      printWindow.close();

    }, 500);
  };

// ======================================================
// GENERAL SHARE
// ======================================================

window.shareText =
  async function(title, text) {

    const shareData = {
      title,
      text
    };

    try {

      if (
        navigator.share &&
        typeof navigator.share ===
          "function"
      ) {

        await navigator.share(
          shareData
        );

        showToast(
          "Shared successfully."
        );

        return;
      }

      if (
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {

        await navigator.clipboard.writeText(
          text
        );

        showToast(
          "Details copied. You can paste them anywhere."
        );

        return;
      }

      showToast(
        "Sharing is not available on this browser.",
        true
      );

    } catch (error) {

      if (
        error?.name ===
        "AbortError"
      ) {
        return;
      }

      console.error(
        "Share error:",
        error
      );

      showToast(
        "Unable to share.",
        true
      );
    }
  };

// ======================================================
// SHARE VEHICLES
// ======================================================

window.shareVehicles =
  function() {

    let text =
`GARAGE OPERATIONS PRO
VEHICLES

`;

    const search =
      String(
        document.getElementById(
          "vehicleSearch"
        )?.value || ""
      ).toLowerCase();

    const status =
      document.getElementById(
        "vehicleStatusFilter"
      )?.value || "";

    const data =
      vehicles.filter(v => {

        const searchMatch =
          !search ||
          String(
            v.registration || ""
          )
            .toLowerCase()
            .includes(search) ||
          String(
            v.customer || ""
          )
            .toLowerCase()
            .includes(search);

        const statusMatch =
          !status ||
          v.status === status;

        return (
          searchMatch &&
          statusMatch
        );
      });

    data.forEach((v, i) => {

      text +=
`${i + 1}. ${v.registration || ""}
Customer: ${v.customer || ""}
Status: ${v.status || ""}
Job: ${v.job_type || ""}
Billed: ${money(v.billed)}
Paid: ${money(v.paid)}
Outstanding: ${money(
        number(v.billed) -
        number(v.paid)
      )}

`;
    });

    window.shareText(
      "Garage Vehicles",
      text
    );
  };

// ======================================================
// SHARE EXPENSES
// ======================================================

window.shareExpenses =
  function() {

    let text =
`GARAGE OPERATIONS PRO
EXPENSES

`;

    const search =
      String(
        document.getElementById(
          "expenseSearch"
        )?.value || ""
      ).toLowerCase();

    const category =
      document.getElementById(
        "expenseCategoryFilter"
      )?.value || "";

    const data =
      expenses.filter(e => {

        const vehicle =
          vehicles.find(
            v =>
              v.id ===
              e.vehicle_id
          );

        const searchMatch =
          !search ||
          String(
            e.description || ""
          )
            .toLowerCase()
            .includes(search) ||
          String(
            vehicle?.registration || ""
          )
            .toLowerCase()
            .includes(search);

        const categoryMatch =
          !category ||
          e.category === category;

        return (
          searchMatch &&
          categoryMatch
        );
      });

    data.forEach((e, i) => {

      text +=
`${i + 1}. ${e.description || ""}
Date: ${e.expense_date || ""}
Vehicle: ${
        e.vehicle_id
          ? vehicleName(
              e.vehicle_id
            )
          : "General"
      }
Category: ${e.category || ""}
Amount: ${money(e.amount)}

`;
    });

    window.shareText(
      "Garage Expenses",
      text
    );
  };

// ======================================================
// SHARE PETTY CASH
// ======================================================

window.sharePettyCash =
  function() {

    let text =
`GARAGE OPERATIONS PRO
PETTY CASH

`;

    const search =
      String(
        document.getElementById(
          "pettySearch"
        )?.value || ""
      ).toLowerCase();

    const category =
      document.getElementById(
        "pettyCategoryFilter"
      )?.value || "";

    const data =
      pettyCash.filter(p => {

        const searchMatch =
          !search ||
          String(
            p.description || ""
          )
            .toLowerCase()
            .includes(search) ||
          String(
            p.paid_to || ""
          )
            .toLowerCase()
            .includes(search);

        const categoryMatch =
          !category ||
          p.category === category;

        return (
          searchMatch &&
          categoryMatch
        );
      });

    data.forEach((p, i) => {

      text +=
`${i + 1}. ${p.description || ""}
Date: ${p.cash_date || ""}
Paid To: ${p.paid_to || ""}
Category: ${p.category || ""}
Amount: ${money(p.amount)}
Notes: ${p.notes || ""}

`;
    });

    window.shareText(
      "Garage Petty Cash",
      text
    );
  };

// ======================================================
// SHARE REQUISITIONS
// ======================================================

window.shareRequisitions =
  function() {

    let text =
`GARAGE OPERATIONS PRO
REQUISITIONS

`;

    const search =
      String(
        document.getElementById(
          "reqSearch"
        )?.value || ""
      ).toLowerCase();

    const status =
      document.getElementById(
        "reqStatusFilter"
      )?.value || "";

    const data =
      requisitions.filter(r => {

        const searchMatch =
          !search ||
          String(
            r.req_no || ""
          )
            .toLowerCase()
            .includes(search) ||
          String(
            r.item_description || ""
          )
            .toLowerCase()
            .includes(search) ||
          String(
            r.requested_by || ""
          )
            .toLowerCase()
            .includes(search) ||
          String(
            vehicleName(
              r.vehicle_id
            )
          )
            .toLowerCase()
            .includes(search);

        const statusMatch =
          !status ||
          r.status === status;

        return (
          searchMatch &&
          statusMatch
        );
      });

    const overallTotal =
      data.reduce(
        (sum, r) =>
          sum +
          number(r.total_amount),
        0
      );

    text +=
`Overall Total Amount: ${money(
      overallTotal
    )}

`;

    data.forEach((r, i) => {

      text +=
`${i + 1}. ${r.req_no || ""}
Date: ${r.req_date || ""}
Requested By: ${r.requested_by || ""}
Vehicle: ${
        r.vehicle_id
          ? vehicleName(
              r.vehicle_id
            )
          : "General"
      }
Item: ${r.item_description || ""}
Quantity: ${number(r.quantity)}
Unit Cost: ${money(r.unit_cost)}
Total: ${money(r.total_amount)}
Expense Type: ${r.expense_type || ""}
Status: ${r.status || ""}

`;
    });

    window.shareText(
      "Garage Requisitions",
      text
    );
  };

// ======================================================
// MODAL BACKDROP
// ======================================================

function setupModalHandlers() {

  document
    .querySelectorAll(".modal")
    .forEach(modal => {

      modal.addEventListener(
        "click",
        event => {

          if (
            event.target ===
            modal
          ) {

            modal.classList.remove(
              "show"
            );
          }
        }
      );
    });
}

// ======================================================
// ESCAPE KEY
// ======================================================

function setupEscapeKey() {

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key !== "Escape"
      ) {
        return;
      }

      document
        .querySelectorAll(
          ".modal.show"
        )
        .forEach(modal => {

          modal.classList.remove(
            "show"
          );
        });
    }
  );
}

// ======================================================
// REQUISITION AUTO CALCULATION
// ======================================================

function setupRequisitionCalculation() {

  const quantity =
    document.getElementById(
      "reqQuantity"
    );

  const unitCost =
    document.getElementById(
      "reqUnitCost"
    );

  if (quantity) {

    quantity.addEventListener(
      "input",
      window.calculateReqTotal
    );
  }

  if (unitCost) {

    unitCost.addEventListener(
      "input",
      window.calculateReqTotal
    );
  }
}

// ======================================================
// START
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    setupClickableRows();

    setupModalHandlers();

    setupEscapeKey();

    setupRequisitionCalculation();

    await window.loadAllData();

  }
);
