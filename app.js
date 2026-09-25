import { createClient }
from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
   PREMIUM GRAPHITE / STEEL EDITION
   ========================================================= */

/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
"https://ptluwoeogfkqavhspdjj.supabase.co";

const SUPABASE_ANON_KEY =
"sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";

const supabase =
createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

/* =========================================================
   TABLES
   ========================================================= */

const TABLES = {
    vehicles: "vehicles",
    expenses: "expenses",
    petty: "petty_cash",
    requisitions: "requisitions"
};

/* =========================================================
   LOCAL DATA
   ========================================================= */

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];

let selectedReqId = null;
let selectedVehicleExpenseId = null;
let selectedVehicleId = null;

/* =========================================================
   PREMIUM APP STYLE
   ========================================================= */

function injectPremiumStyles() {

    if (document.getElementById("garagePremiumStyles"))
        return;

    const style =
        document.createElement("style");

    style.id =
        "garagePremiumStyles";

    style.textContent = `

    /* ==============================================
       GARAGE OPERATIONS PRO
       GRAPHITE / STEEL / WHITE
       ============================================== */

    :root{
        --gop-bg:#111416;
        --gop-panel:#181c1f;
        --gop-panel-2:#202529;
        --gop-border:#30363b;
        --gop-border-light:#3a4248;
        --gop-text:#f2f4f5;
        --gop-muted:#9aa3aa;
        --gop-soft:#c5cbd0;
        --gop-accent:#8fa5b5;
        --gop-accent-2:#b8c5ce;
        --gop-danger:#c77979;
        --gop-shadow:0 18px 50px rgba(0,0,0,.28);
    }

    /* Vehicle table */

    #vehiclesSection .table-actions{
        display:flex !important;
        flex-direction:row !important;
        align-items:center;
        justify-content:flex-end;
        gap:6px;
        flex-wrap:nowrap !important;
        white-space:nowrap;
    }

    #vehiclesSection .vehicle-row{
        transition:
            background .18s ease,
            transform .18s ease;
    }

    #vehiclesSection .vehicle-row:hover{
        background:rgba(255,255,255,.025);
    }

    #vehiclesSection .vehicle-action-btn{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:5px;
        height:32px;
        padding:0 10px;
        border-radius:8px;
        border:1px solid var(--gop-border-light);
        background:#202529;
        color:#edf1f3;
        font-size:11px;
        font-weight:700;
        cursor:pointer;
        white-space:nowrap;
        transition:
            background .18s ease,
            border-color .18s ease,
            transform .18s ease;
    }

    #vehiclesSection .vehicle-action-btn:hover{
        background:#2a3035;
        border-color:#59636b;
        transform:translateY(-1px);
    }

    #vehiclesSection .vehicle-delete-btn{
        color:#e0b2b2;
    }

    /* ==============================================
       VEHICLE PAGE TOOLBAR
       ============================================== */

    #vehiclePageActionBar{
        position:sticky;
        bottom:12px;
        z-index:30;

        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:18px;

        margin-top:22px;
        padding:13px 15px;

        background:rgba(24,28,31,.96);
        border:1px solid #343b40;
        border-radius:16px;

        box-shadow:
            0 18px 45px rgba(0,0,0,.35);

        backdrop-filter:blur(14px);
        -webkit-backdrop-filter:blur(14px);
    }

    .gop-toolbar-label{
        min-width:0;
    }

    .gop-toolbar-label span{
        display:block;
        font-size:9px;
        letter-spacing:1.3px;
        text-transform:uppercase;
        color:#7f8990;
        font-weight:800;
        margin-bottom:3px;
    }

    .gop-toolbar-label strong{
        display:block;
        color:#f1f4f5;
        font-size:13px;
        max-width:240px;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
    }

    .gop-toolbar-buttons{
        display:flex;
        align-items:center;
        gap:7px;
        flex-shrink:0;
    }

    .gop-toolbar-btn{
        min-height:36px;
        padding:0 13px;

        border:1px solid #3a4248;
        border-radius:9px;

        background:#202529;
        color:#e9edef;

        font-size:11px;
        font-weight:800;

        cursor:pointer;
        white-space:nowrap;

        transition:
            background .18s ease,
            border-color .18s ease,
            transform .18s ease;
    }

    .gop-toolbar-btn:hover:not(:disabled){
        background:#2a3035;
        border-color:#626d75;
        transform:translateY(-1px);
    }

    .gop-toolbar-btn:disabled{
        opacity:.35;
        cursor:not-allowed;
    }

    .gop-toolbar-btn.primary{
        background:#d5dde2;
        color:#141719;
        border-color:#d5dde2;
    }

    .gop-toolbar-btn.primary:hover:not(:disabled){
        background:#eef2f4;
        border-color:#eef2f4;
    }

    /* ==============================================
       VEHICLE WORKSPACE
       ============================================== */

    .gop-vehicle-workspace{
        color:#e9edef;
        background:#15191c;
        border-radius:18px;
    }

    .gop-vw-header{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:18px;
        padding-bottom:18px;
        border-bottom:1px solid #30363b;
        margin-bottom:18px;
    }

    .gop-eyebrow{
        font-size:9px;
        letter-spacing:1.5px;
        text-transform:uppercase;
        color:#7f8990;
        font-weight:800;
        margin-bottom:6px;
    }

    .gop-vw-title{
        margin:0;
        font-size:25px;
        line-height:1.15;
        color:#f5f7f8;
        font-weight:850;
        letter-spacing:-.4px;
    }

    .gop-vw-customer{
        color:#9aa3aa;
        font-size:13px;
        margin-top:6px;
    }

    .gop-vw-status{
        flex-shrink:0;
    }

    .gop-vw-grid{
        display:grid;
        grid-template-columns:
            repeat(5,minmax(0,1fr));
        gap:9px;
        margin-bottom:22px;
    }

    .gop-vw-stat{
        min-width:0;
        padding:13px;
        border:1px solid #30363b;
        background:#1c2124;
        border-radius:13px;
    }

    .gop-vw-stat-label{
        font-size:9px;
        text-transform:uppercase;
        letter-spacing:.8px;
        color:#7f8990;
        font-weight:800;
    }

    .gop-vw-stat-value{
        margin-top:6px;
        font-size:14px;
        font-weight:800;
        color:#edf1f3;
        overflow:hidden;
        text-overflow:ellipsis;
    }

    .gop-vw-section{
        margin-top:20px;
    }

    .gop-vw-section-head{
        display:flex;
        justify-content:space-between;
        align-items:flex-end;
        gap:12px;
        margin-bottom:10px;
    }

    .gop-vw-section-title{
        font-size:16px;
        font-weight:850;
        color:#f1f4f5;
    }

    .gop-vw-section-sub{
        margin-top:3px;
        font-size:11px;
        color:#7f8990;
    }

    .gop-vw-total{
        font-size:17px;
        font-weight:900;
        color:#edf1f3;
        white-space:nowrap;
    }

    .gop-vw-info{
        display:grid;
        grid-template-columns:
            repeat(3,minmax(0,1fr));
        gap:9px;
        margin-bottom:22px;
    }

    .gop-vw-info-item{
        padding:12px 13px;
        border:1px solid #30363b;
        background:#1a1f22;
        border-radius:12px;
    }

    .gop-vw-info-item span{
        display:block;
        font-size:9px;
        text-transform:uppercase;
        letter-spacing:.7px;
        color:#788289;
        font-weight:800;
        margin-bottom:5px;
    }

    .gop-vw-info-item strong{
        color:#dfe4e7;
        font-size:12px;
    }

    .gop-expense-list{
        border:1px solid #30363b;
        border-radius:14px;
        overflow:hidden;
        background:#181c1f;
    }

    .gop-expense-head,
    .gop-expense-row{
        display:grid;
        grid-template-columns:110px 120px minmax(0,1fr) 110px;
        gap:12px;
        align-items:center;
    }

    .gop-expense-head{
        padding:10px 13px;
        background:#202529;
        border-bottom:1px solid #30363b;
        color:#7f8990;
        font-size:9px;
        font-weight:800;
        text-transform:uppercase;
        letter-spacing:.7px;
    }

    .gop-expense-row{
        padding:12px 13px;
        border-bottom:1px solid #292f33;
        color:#dce1e4;
        font-size:11px;
    }

    .gop-expense-row:last-child{
        border-bottom:0;
    }

    .gop-expense-row .amount{
        text-align:right;
        font-weight:850;
        color:#f0f3f4;
    }

    .gop-expense-empty{
        padding:36px 18px;
        text-align:center;
        color:#7f8990;
    }

    .gop-add-expense{
        border:1px solid #3b454c;
        background:#242a2e;
        color:#f0f3f4;
        border-radius:9px;
        min-height:34px;
        padding:0 12px;
        font-size:11px;
        font-weight:800;
        cursor:pointer;
    }

    .gop-add-expense:hover{
        background:#2d3439;
    }

    /* ==============================================
       MOBILE
       ============================================== */

    @media(max-width:900px){

        #vehiclePageActionBar{
            flex-direction:column;
            align-items:stretch;
            gap:10px;
        }

        .gop-toolbar-label strong{
            max-width:none;
        }

        .gop-toolbar-buttons{
            display:grid;
            grid-template-columns:repeat(2,1fr);
            width:100%;
        }

        .gop-toolbar-btn{
            width:100%;
        }

        .gop-vw-grid{
            grid-template-columns:
                repeat(2,minmax(0,1fr));
        }

        .gop-vw-info{
            grid-template-columns:
                repeat(2,minmax(0,1fr));
        }

        .gop-expense-list{
            overflow-x:auto;
        }

        .gop-expense-head,
        .gop-expense-row{
            min-width:620px;
        }

    }

    @media(max-width:560px){

        #vehiclesSection .vehicle-action-btn{
            height:30px;
            padding:0 8px;
            font-size:10px;
        }

        #vehiclesSection .table-actions{
            gap:4px;
        }

        .gop-vw-title{
            font-size:21px;
        }

        .gop-vw-header{
            gap:10px;
        }

        .gop-vw-grid,
        .gop-vw-info{
            grid-template-columns:1fr 1fr;
        }

        .gop-toolbar-buttons{
            grid-template-columns:repeat(2,1fr);
        }

    }

    `;

    document.head.appendChild(style);
}

/* =========================================================
   HELPERS
   ========================================================= */

function money(value) {

    const n =
        Number(value || 0);

    return "KSh " +
        n.toLocaleString(
            "en-KE",
            {
                minimumFractionDigits:0,
                maximumFractionDigits:2
            }
        );
}

function number(value) {

    return Number(value || 0);
}

function today() {

    return new Date()
        .toISOString()
        .slice(0,10);
}

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

function vehicleName(id) {

    if (!id)
        return "General";

    const v =
        vehicles.find(
            x => x.id === id
        );

    return v
        ? `${v.registration}${v.customer ? " — " + v.customer : ""}`
        : "Unknown vehicle";
}

function statusClass(status) {

    const s =
        String(status || "")
            .toLowerCase();

    if (s.includes("repair"))
        return "status-under-repair";

    if (
        s.includes("complete") ||
        s.includes("release")
    )
        return "status-completed";

    if (s.includes("pending"))
        return "status-pending";

    if (s.includes("approved"))
        return "status-approved";

    if (s.includes("purchased"))
        return "status-purchased";

    if (s.includes("rejected"))
        return "status-rejected";

    return "status-default";
}

function setText(id,value) {

    const element =
        document.getElementById(id);

    if (element)
        element.textContent = value;
}

function showToast(message) {

    const toast =
        document.getElementById("toast");

    if (!toast) return;

    toast.textContent =
        message;

    toast.style.display =
        "block";

    clearTimeout(
        window.__toastTimer
    );

    window.__toastTimer =
        setTimeout(
            () => {
                toast.style.display =
                    "none";
            },
            2800
        );
}

function supabaseError(error) {

    console.error(error);

    showToast(
        error?.message ||
        "Something went wrong."
    );
}

/* =========================================================
   MODALS
   ========================================================= */

window.openModal =
function(id) {

    const modal =
        document.getElementById(id);

    if (modal)
        modal.classList.add("show");
};

window.closeModal =
function(id) {

    const modal =
        document.getElementById(id);

    if (modal)
        modal.classList.remove("show");
};

/* =========================================================
   NAVIGATION
   ========================================================= */

window.showSection =
function(sectionId,button) {

    document
        .querySelectorAll(".app-section")
        .forEach(section => {
            section.style.display =
                "none";
        });

    const section =
        document.getElementById(sectionId);

    if (section)
        section.style.display =
            "block";

    document
        .querySelectorAll(
            ".nav-btn,.mobile-nav-btn"
        )
        .forEach(btn => {
            btn.classList.remove("active");
        });

    if (button) {

        button.classList.add("active");

    } else {

        document
            .querySelectorAll(
                `.nav-btn[onclick*="'${sectionId}'"],
                 .mobile-nav-btn[onclick*="'${sectionId}'"]`
            )
            .forEach(btn => {
                btn.classList.add("active");
            });
    }

    window.scrollTo({
        top:0,
        behavior:"smooth"
    });
};

window.goToDashboardSection =
function(sectionId) {

    window.showSection(
        sectionId
    );
};

/* =========================================================
   VEHICLE SELECTS
   ========================================================= */

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

        const current =
            select.value;

        if (
            select.id ===
            "expenseVehicle"
        ) {

            select.innerHTML =
                `<option value="">
                    General Expense
                </option>`;

        } else {

            select.innerHTML =
                `<option value="">
                    Select Vehicle
                </option>`;
        }

        [...vehicles]
            .sort(
                (a,b) =>
                    String(
                        a.registration || ""
                    ).localeCompare(
                        String(
                            b.registration || ""
                        )
                    )
            )
            .forEach(v => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    v.id;

                option.textContent =
                    `${v.registration}${v.customer ? " — " + v.customer : ""}`;

                select.appendChild(
                    option
                );
            });

        select.value =
            current;
    });
}

/* =========================================================
   LOAD VEHICLES
   ========================================================= */

async function loadVehicles() {

    const {
        data,
        error
    } =
        await supabase
            .from(TABLES.vehicles)
            .select("*")
            .order(
                "created_at",
                {
                    ascending:false
                }
            );

    if (error) {

        supabaseError(error);
        return;
    }

    vehicles =
        data || [];
}

/* =========================================================
   LOAD EXPENSES
   ========================================================= */

async function loadExpenses() {

    const {
        data,
        error
    } =
        await supabase
            .from(TABLES.expenses)
            .select("*")
            .order(
                "expense_date",
                {
                    ascending:false
                }
            );

    if (error) {

        supabaseError(error);
        return;
    }

    expenses =
        data || [];
}

/* =========================================================
   LOAD PETTY CASH
   ========================================================= */

async function loadPettyCash() {

    const {
        data,
        error
    } =
        await supabase
            .from(TABLES.petty)
            .select("*")
            .order(
                "cash_date",
                {
                    ascending:false
                }
            );

    if (error) {

        supabaseError(error);
        return;
    }

    pettyCash =
        data || [];
}

/* =========================================================
   LOAD REQUISITIONS
   ========================================================= */

async function loadRequisitions() {

    const {
        data,
        error
    } =
        await supabase
            .from(TABLES.requisitions)
            .select("*")
            .order(
                "req_date",
                {
                    ascending:false
                }
            );

    if (error) {

        supabaseError(error);
        return;
    }

    requisitions =
        data || [];
}

/* =========================================================
   VEHICLE PAGE ACTION BAR
   ========================================================= */

function ensureVehicleActionBar() {

    const section =
        document.getElementById(
            "vehiclesSection"
        );

    if (!section)
        return;

    if (
        document.getElementById(
            "vehiclePageActionBar"
        )
    )
        return;

    const bar =
        document.createElement("div");

    bar.id =
        "vehiclePageActionBar";

    bar.innerHTML = `

        <div class="gop-toolbar-label">

            <span>
                Selected Vehicle
            </span>

            <strong id="selectedVehicleLabel">
                No vehicle selected
            </strong>

        </div>

        <div class="gop-toolbar-buttons">

            <button
                type="button"
                id="vehicleEditBottomBtn"
                class="gop-toolbar-btn"
                onclick="editSelectedVehicle()"
                disabled
            >
                ✏ Edit
            </button>

            <button
                type="button"
                id="vehicleAddBottomBtn"
                class="gop-toolbar-btn primary"
                onclick="addVehicle()"
            >
                + Add Vehicle
            </button>

            <button
                type="button"
                id="vehicleDeleteBottomBtn"
                class="gop-toolbar-btn"
                onclick="deleteSelectedVehicle()"
                disabled
            >
                🗑 Delete
            </button>

            <button
                type="button"
                id="vehiclePrintBottomBtn"
                class="gop-toolbar-btn"
                onclick="printSelectedVehicle()"
                disabled
            >
                🖨 Print
            </button>

            <button
                type="button"
                id="vehicleShareBottomBtn"
                class="gop-toolbar-btn"
                onclick="shareSelectedVehicle()"
                disabled
            >
                ↗ Share
            </button>

        </div>

    `;

    section.appendChild(bar);

    updateVehicleActionBar();
}

function updateVehicleActionBar() {

    const label =
        document.getElementById(
            "selectedVehicleLabel"
        );

    const edit =
        document.getElementById(
            "vehicleEditBottomBtn"
        );

    const add =
        document.getElementById(
            "vehicleAddBottomBtn"
        );

    const del =
        document.getElementById(
            "vehicleDeleteBottomBtn"
        );

    const print =
        document.getElementById(
            "vehiclePrintBottomBtn"
        );

    const share =
        document.getElementById(
            "vehicleShareBottomBtn"
        );

    const vehicle =
        vehicles.find(
            v => v.id === selectedVehicleId
        );

    if (label) {

        label.textContent =
            vehicle
                ? `${vehicle.registration}${vehicle.customer ? " — " + vehicle.customer : ""}`
                : "No vehicle selected";
    }

    const disabled =
        !vehicle;

    if (edit)
        edit.disabled =
            disabled;

    if (del)
        del.disabled =
            disabled;

    if (print)
        print.disabled =
            disabled;

    if (share)
        share.disabled =
            disabled;

    if (add)
        add.disabled =
            false;
}

/* =========================================================
   SELECT VEHICLE
   ========================================================= */

window.selectVehicle =
function(vehicleId) {

    selectedVehicleId =
        vehicleId;

    updateVehicleActionBar();

    renderVehicles();

    openVehicleWorkspace(
        vehicleId
    );
};

/* =========================================================
   LOAD EVERYTHING
   ========================================================= */

async function loadAllData() {

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
    renderPremiumDashboard();

    ensureVehicleActionBar();

    updateVehicleActionBar();

    if (selectedVehicleId) {

        const exists =
            vehicles.some(
                v =>
                    v.id ===
                    selectedVehicleId
            );

        if (exists) {

            renderVehicleWorkspace(
                selectedVehicleId
            );
        }
    }
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {

    const totalVehicles =
        vehicles.length;

    const underRepair =
        vehicles.filter(v =>
            String(v.status || "")
                .toLowerCase() ===
            "under repair"
        ).length;

    const totalBilled =
        vehicles.reduce(
            (sum,v) =>
                sum +
                number(v.billed),
            0
        );

    const totalPaid =
        vehicles.reduce(
            (sum,v) =>
                sum +
                number(v.paid),
            0
        );

    const outstanding =
        totalBilled -
        totalPaid;

    const totalExpenses =
        expenses.reduce(
            (sum,e) =>
                sum +
                number(e.amount),
            0
        );

    const totalPetty =
        pettyCash.reduce(
            (sum,p) =>
                sum +
                number(p.amount),
            0
        );

    const reqTotal =
        requisitions.reduce(
            (sum,r) =>
                sum +
                number(
                    r.total_amount
                ),
            0
        );

    setText(
        "dashVehicles",
        totalVehicles
    );

    setText(
        "dashRepair",
        underRepair
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
        "dashOutstanding",
        money(outstanding)
    );

    setText(
        "dashExpenses",
        money(totalExpenses)
    );

    setText(
        "dashPetty",
        money(totalPetty)
    );

    setText(
        "dashReq",
        requisitions.length
    );

    setText(
        "dashReqCount",
        requisitions.length
    );

    setText(
        "dashReqTotal",
        money(reqTotal)
    );

    setText(
        "reqOverallTotal",
        money(reqTotal)
    );
}

/* =========================================================
   PREMIUM DASHBOARD ACTIVITY
   ========================================================= */

function renderPremiumDashboard() {

    const box =
        document.getElementById(
            "dashboardActivity"
        );

    if (!box)
        return;

    const recent =
        [...vehicles]
            .sort((a,b) => {

                const da =
                    new Date(
                        a.created_at ||
                        a.date_in ||
                        0
                    );

                const db =
                    new Date(
                        b.created_at ||
                        b.date_in ||
                        0
                    );

                return db - da;
            })
            .slice(0,5);

    if (!recent.length) {

        box.innerHTML = `

            <div class="activity-item">

                <div class="activity-icon">
                    🚘
                </div>

                <div class="activity-main">

                    <strong>
                        No vehicle activity yet
                    </strong>

                    <span>
                        Add your first vehicle to begin.
                    </span>

                </div>

            </div>

        `;

        return;
    }

    box.innerHTML =
        recent.map(v => `

            <div
                class="activity-item"
                style="cursor:pointer"
                onclick="openVehicleWorkspace('${v.id}')"
            >

                <div class="activity-icon">
                    🚘
                </div>

                <div class="activity-main">

                    <strong>
                        ${escapeHtml(
                            v.registration ||
                            "Unknown vehicle"
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            v.customer ||
                            "No customer"
                        )}
                    </span>

                </div>

                <span
                    class="status ${statusClass(v.status)}"
                >
                    ${escapeHtml(
                        v.status ||
                        "Unknown"
                    )}
                </span>

            </div>

        `).join("");
}

/* =========================================================
   VEHICLES
   ========================================================= */

function renderVehicles() {

    const tbody =
        document.getElementById(
            "vehiclesTableBody"
        );

    if (!tbody)
        return;

    ensureVehicleActionBar();

    const search =
        String(
            document.getElementById(
                "vehicleSearch"
            )?.value || ""
        ).toLowerCase();

    const status =
        String(
            document.getElementById(
                "vehicleStatusFilter"
            )?.value || ""
        ).toLowerCase();

    const filtered =
        vehicles.filter(v => {

            const matchesSearch =
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
                .includes(search) ||

                String(
                    v.job_type || ""
                )
                .toLowerCase()
                .includes(search);

            const matchesStatus =
                !status ||
                String(
                    v.status || ""
                )
                .toLowerCase() ===
                status;

            return (
                matchesSearch &&
                matchesStatus
            );
        });

    if (!filtered.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="10"
                    style="
                        text-align:center;
                        padding:35px;
                        color:#94a3b8
                    "
                >
                    No vehicles found.
                </td>

            </tr>

        `;

        return;
    }

    tbody.innerHTML =
        filtered.map(v => {

            const outstanding =
                number(v.billed) -
                number(v.paid);

            const selected =
                selectedVehicleId ===
                v.id
                    ? " selected"
                    : "";

            return `

            <tr
                class="vehicle-row${selected}"
                onclick="selectVehicle('${v.id}')"
                style="cursor:pointer"
            >

                <td>

                    <strong>
                        ${escapeHtml(
                            v.registration
                        )}
                    </strong>

                </td>

                <td>
                    ${escapeHtml(
                        v.customer
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        v.date_in || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        v.date_out || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        v.job_type || ""
                    )}
                </td>

                <td>

                    <span
                        class="status ${statusClass(v.status)}"
                    >
                        ${escapeHtml(
                            v.status || ""
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
                    ${money(outstanding)}
                </td>

                <td
                    onclick="event.stopPropagation()"
                >

                    <div class="table-actions">

                        <button
                            type="button"
                            class="vehicle-action-btn"
                            title="Edit Vehicle"
                            onclick="editVehicle('${v.id}')"
                        >
                            ✏ Edit
                        </button>

                        <button
                            type="button"
                            class="vehicle-action-btn vehicle-delete-btn"
                            title="Delete Vehicle"
                            onclick="deleteVehicle('${v.id}')"
                        >
                            🗑 Delete
                        </button>

                    </div>

                </td>

            </tr>

            `;

        }).join("");
}

/* =========================================================
   VEHICLE WORKSPACE
   ========================================================= */

window.openVehicleWorkspace =
function(vehicleId) {

    selectedVehicleId =
        vehicleId;

    updateVehicleActionBar();

    const modal =
        document.getElementById(
            "vehicleExpensePreviewModal"
        );

    renderVehicleWorkspace(
        vehicleId
    );

    if (modal) {

        openModal(
            "vehicleExpensePreviewModal"
        );

    } else {

        window.showSection(
            "vehicles"
        );
    }
};

/* =========================================================
   VEHICLE WORKSPACE RENDER
   ========================================================= */

function renderVehicleWorkspace(
    vehicleId
) {

    const vehicle =
        vehicles.find(
            v => v.id === vehicleId
        );

    if (!vehicle)
        return;

    const content =
        document.getElementById(
            "vehicleExpensePreviewContent"
        );

    if (!content)
        return;

    const list =
        expenses.filter(
            e =>
                e.vehicle_id ===
                vehicleId
        );

    const total =
        list.reduce(
            (sum,e) =>
                sum +
                number(e.amount),
            0
        );

    const outstanding =
        number(vehicle.billed) -
        number(vehicle.paid);

    content.innerHTML = `

        <div class="gop-vehicle-workspace">

            <div class="gop-vw-header">

                <div>

                    <div class="gop-eyebrow">
                        Vehicle Workspace
                    </div>

                    <h2 class="gop-vw-title">
                        ${escapeHtml(
                            vehicle.registration
                        )}
                    </h2>

                    <div class="gop-vw-customer">
                        ${escapeHtml(
                            vehicle.customer ||
                            "No customer"
                        )}
                    </div>

                </div>

                <div class="gop-vw-status">

                    <span
                        class="status ${statusClass(vehicle.status)}"
                    >
                        ${escapeHtml(
                            vehicle.status ||
                            "Unknown"
                        )}
                    </span>

                </div>

            </div>

            <div class="gop-vw-grid">

                <div class="gop-vw-stat">

                    <div class="gop-vw-stat-label">
                        Job
                    </div>

                    <div class="gop-vw-stat-value">
                        ${escapeHtml(
                            vehicle.job_type ||
                            "Repair"
                        )}
                    </div>

                </div>

                <div class="gop-vw-stat">

                    <div class="gop-vw-stat-label">
                        Date In
                    </div>

                    <div class="gop-vw-stat-value">
                        ${escapeHtml(
                            vehicle.date_in ||
                            "-"
                        )}
                    </div>

                </div>

                <div class="gop-vw-stat">

                    <div class="gop-vw-stat-label">
                        Date Out
                    </div>

                    <div class="gop-vw-stat-value">
                        ${escapeHtml(
                            vehicle.date_out ||
                            "-"
                        )}
                    </div>

                </div>

                <div class="gop-vw-stat">

                    <div class="gop-vw-stat-label">
                        Billed
                    </div>

                    <div class="gop-vw-stat-value">
                        ${money(
                            vehicle.billed
                        )}
                    </div>

                </div>

                <div class="gop-vw-stat">

                    <div class="gop-vw-stat-label">
                        Outstanding
                    </div>

                    <div class="gop-vw-stat-value">
                        ${money(
                            outstanding
                        )}
                    </div>

                </div>

            </div>

            <div class="gop-vw-info">

                <div class="gop-vw-info-item">

                    <span>
                        Released To
                    </span>

                    <strong>
                        ${escapeHtml(
                            vehicle.released_to ||
                            "-"
                        )}
                    </strong>

                </div>

                <div class="gop-vw-info-item">

                    <span>
                        Release Contact
                    </span>

                    <strong>
                        ${escapeHtml(
                            vehicle.released_contact ||
                            "-"
                        )}
                    </strong>

                </div>

                <div class="gop-vw-info-item">

                    <span>
                        Total Vehicle Expenses
                    </span>

                    <strong>
                        ${money(total)}
                    </strong>

                </div>

                <div class="gop-vw-info-item"
                     style="grid-column:1/-1">

                    <span>
                        Description
                    </span>

                    <strong>
                        ${escapeHtml(
                            vehicle.description ||
                            "No description recorded."
                        )}
                    </strong>

                </div>

            </div>

            <div
                class="gop-vw-section"
            >

                <div
                    class="gop-vw-section-head"
                >

                    <div>

                        <div
                            class="gop-vw-section-title"
                        >
                            Expense History
                        </div>

                        <div
                            class="gop-vw-section-sub"
                        >
                            Expenses recorded against this vehicle
                        </div>

                    </div>

                    <div
                        style="
                            display:flex;
                            align-items:center;
                            gap:9px;
                        "
                    >

                        <strong
                            class="gop-vw-total"
                        >
                            ${money(total)}
                        </strong>

                        <button
                            type="button"
                            class="gop-add-expense"
                            onclick="openExpenseModalForVehicle('${vehicle.id}')"
                        >
                            + Expense
                        </button>

                    </div>

                </div>

                ${
                    list.length

                    ?

                    `

                    <div class="gop-expense-list">

                        <div class="gop-expense-head">

                            <div>Date</div>
                            <div>Category</div>
                            <div>Description</div>
                            <div style="text-align:right">
                                Amount
                            </div>

                        </div>

                        ${
                            list.map(e => `

                                <div
                                    class="gop-expense-row"
                                >

                                    <div>
                                        ${escapeHtml(
                                            e.expense_date ||
                                            "-"
                                        )}
                                    </div>

                                    <div>
                                        ${escapeHtml(
                                            e.category ||
                                            "-"
                                        )}
                                    </div>

                                    <div>
                                        ${escapeHtml(
                                            e.description ||
                                            "Expense"
                                        )}
                                    </div>

                                    <div class="amount">
                                        ${money(
                                            e.amount
                                        )}
                                    </div>

                                </div>

                            `).join("")
                        }

                    </div>

                    `

                    :

                    `

                    <div
                        class="gop-expense-empty"
                    >

                        <div
                            style="
                                font-size:27px;
                                margin-bottom:7px;
                            "
                        >
                            ₵
                        </div>

                        <strong
                            style="
                                display:block;
                                color:#b9c1c6;
                                margin-bottom:5px;
                            "
                        >
                            No expenses recorded
                        </strong>

                        <span
                            style="font-size:11px"
                        >
                            Add the first expense for this vehicle.
                        </span>

                    </div>

                    `
                }

            </div>

            <div
                style="
                    margin-top:18px;
                    padding-top:14px;
                    border-top:1px solid #30363b;
                    display:flex;
                    justify-content:flex-end;
                "
            >

                <button
                    type="button"
                    class="gop-add-expense"
                    onclick="closeModal('vehicleExpensePreviewModal')"
                >
                    Close
                </button>

            </div>

        </div>

    `;
}

/* =========================================================
   VEHICLE BOTTOM ACTIONS
   ========================================================= */

window.addVehicle =
function() {

    window.openVehicleModal();
};

window.editSelectedVehicle =
function() {

    if (!selectedVehicleId) {

        showToast(
            "Select a vehicle first."
        );

        return;
    }

    editVehicle(
        selectedVehicleId
    );
};

window.deleteSelectedVehicle =
function() {

    if (!selectedVehicleId) {

        showToast(
            "Select a vehicle first."
        );

        return;
    }

    deleteVehicle(
        selectedVehicleId
    );
};

window.printSelectedVehicle =
function() {

    if (!selectedVehicleId) {

        showToast(
            "Select a vehicle first."
        );

        return;
    }

    printVehicleReport(
        selectedVehicleId
    );
};

window.shareSelectedVehicle =
function() {

    if (!selectedVehicleId) {

        showToast(
            "Select a vehicle first."
        );

        return;
    }

    shareVehicle(
        selectedVehicleId
    );
};

/* =========================================================
   VEHICLE FORM
   ========================================================= */

window.openVehicleModal =
function(id = null) {

    const form =
        document.getElementById(
            "vehicleForm"
        );

    if (form)
        form.reset();

    const idField =
        document.getElementById(
            "vehicleId"
        );

    if (idField)
        idField.value =
            id || "";

    const title =
        document.getElementById(
            "vehicleModalTitle"
        );

    if (title)
        title.textContent =
            id
                ? "Edit Vehicle"
                : "Add Vehicle";

    if (id) {

        const v =
            vehicles.find(
                x => x.id === id
            );

        if (!v)
            return;

        const fields = {

            vehicleRegistration:
                v.registration || "",

            vehicleCustomer:
                v.customer || "",

            vehicleDateIn:
                v.date_in || "",

            vehicleDateOut:
                v.date_out || "",

            vehicleJobType:
                v.job_type || "Repair",

            vehicleStatus:
                v.status || "Under Repair",

            vehicleReleasedTo:
                v.released_to || "",

            vehicleReleasedContact:
                v.released_contact || "",

            vehicleDescription:
                v.description || "",

            vehicleBilled:
                v.billed || 0,

            vehiclePaid:
                v.paid || 0
        };

        Object.entries(fields)
            .forEach(
                ([fieldId,value]) => {

                    const field =
                        document.getElementById(
                            fieldId
                        );

                    if (field)
                        field.value =
                            value;
                }
            );

    } else {

        const defaults = {

            vehicleDateIn:
                today(),

            vehicleStatus:
                "Under Repair",

            vehicleJobType:
                "Repair",

            vehicleBilled:
                0,

            vehiclePaid:
                0
        };

        Object.entries(defaults)
            .forEach(
                ([fieldId,value]) => {

                    const field =
                        document.getElementById(
                            fieldId
                        );

                    if (field)
                        field.value =
                            value;
                }
            );
    }

    openModal(
        "vehicleModal"
    );
};

window.editVehicle =
function(id) {

    closeModal(
        "vehicleExpensePreviewModal"
    );

    selectedVehicleId =
        id;

    updateVehicleActionBar();

    window.openVehicleModal(
        id
    );
};

/* =========================================================
   SAVE VEHICLE
   ========================================================= */

document
    .getElementById("vehicleForm")
    ?.addEventListener(
        "submit",
        async e => {

            e.preventDefault();

            const id =
                document.getElementById(
                    "vehicleId"
                )?.value;

            const value =
                id =>
                    document.getElementById(
                        id
                    )?.value || "";

            const payload = {

                registration:
                    value(
                        "vehicleRegistration"
                    ).trim(),

                customer:
                    value(
                        "vehicleCustomer"
                    ).trim(),

                date_in:
                    value(
                        "vehicleDateIn"
                    ),

                date_out:
                    value(
                        "vehicleDateOut"
                    ) || null,

                job_type:
                    value(
                        "vehicleJobType"
                    ).trim(),

                status:
                    value(
                        "vehicleStatus"
                    ),

                released_to:
                    value(
                        "vehicleReleasedTo"
                    ).trim(),

                released_contact:
                    value(
                        "vehicleReleasedContact"
                    ).trim(),

                description:
                    value(
                        "vehicleDescription"
                    ).trim(),

                billed:
                    number(
                        value(
                            "vehicleBilled"
                        )
                    ),

                paid:
                    number(
                        value(
                            "vehiclePaid"
                        )
                    )
            };

            let result;

            if (id) {

                result =
                    await supabase
                        .from(
                            TABLES.vehicles
                        )
                        .update(payload)
                        .eq(
                            "id",
                            id
                        );

            } else {

                result =
                    await supabase
                        .from(
                            TABLES.vehicles
                        )
                        .insert([
                            payload
                        ]);
            }

            if (result.error) {

                supabaseError(
                    result.error
                );

                return;
            }

            closeModal(
                "vehicleModal"
            );

            showToast(
                id
                    ? "Vehicle updated successfully."
                    : "Vehicle added successfully."
            );

            if (id)
                selectedVehicleId =
                    id;

            await loadAllData();

            if (id) {

                setTimeout(
                    () =>
                        window.openVehicleWorkspace(
                            id
                        ),
                    150
                );
            }
        }
    );

/* =========================================================
   DELETE VEHICLE
   ========================================================= */

window.deleteVehicle =
async function(id) {

    const vehicle =
        vehicles.find(
            v => v.id === id
        );

    if (!vehicle)
        return;

    if (
        !confirm(
            `Delete vehicle ${vehicle.registration}?`
        )
    )
        return;

    const {
        error
    } =
        await supabase
            .from(
                TABLES.vehicles
            )
            .delete()
            .eq(
                "id",
                id
            );

    if (error) {

        supabaseError(error);
        return;
    }

    if (
        selectedVehicleId ===
        id
    ) {

        selectedVehicleId =
            null;

        closeModal(
            "vehicleExpensePreviewModal"
        );
    }

    showToast(
        "Vehicle deleted."
    );

    await loadAllData();
};

/* =========================================================
   EXPENSES
   ========================================================= */

function renderExpenses() {

    const tbody =
        document.getElementById(
            "expensesTableBody"
        );

    if (!tbody)
        return;

    const search =
        String(
            document.getElementById(
                "expenseSearch"
            )?.value || ""
        ).toLowerCase();

    const category =
        String(
            document.getElementById(
                "expenseCategoryFilter"
            )?.value || ""
        ).toLowerCase();

    const filtered =
        expenses.filter(e => {

            const vehicle =
                vehicleName(
                    e.vehicle_id
                );

            const matchesSearch =
                !search ||
                String(
                    e.description || ""
                )
                .toLowerCase()
                .includes(search) ||

                vehicle
                    .toLowerCase()
                    .includes(search) ||

                String(
                    e.category || ""
                )
                .toLowerCase()
                .includes(search);

            const matchesCategory =
                !category ||
                String(
                    e.category || ""
                )
                .toLowerCase() ===
                category;

            return (
                matchesSearch &&
                matchesCategory
            );
        });

    populateExpenseCategories();

    if (!filtered.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    style="
                        text-align:center;
                        padding:35px;
                        color:#94a3b8
                    "
                >
                    No expenses found.
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
                        e.expense_date || ""
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
                        e.description || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        e.category || ""
                    )}
                </td>

                <td>
                    <strong>
                        ${money(
                            e.amount
                        )}
                    </strong>
                </td>

                <td>

                    <div class="table-actions">

                        <button
                            class="action-btn"
                            onclick="editExpense('${e.id}')"
                        >
                            ✏️
                        </button>

                        <button
                            class="action-btn"
                            onclick="deleteExpense('${e.id}')"
                        >
                            🗑
                        </button>

                    </div>

                </td>

            </tr>

        `).join("");
}

function populateExpenseCategories() {

    const select =
        document.getElementById(
            "expenseCategoryFilter"
        );

    if (!select)
        return;

    const current =
        select.value;

    const categories =
        [
            ...new Set(
                expenses
                    .map(
                        e =>
                            e.category
                    )
                    .filter(Boolean)
            )
        ];

    select.innerHTML =
        `<option value="">
            All Categories
        </option>`;

    categories
        .sort()
        .forEach(c => {

            select.innerHTML +=
                `<option value="${escapeHtml(c)}">
                    ${escapeHtml(c)}
                </option>`;
        });

    select.value =
        current;
}

/* =========================================================
   OPEN EXPENSE
   ========================================================= */

window.openExpenseModal =
function(id = null) {

    const form =
        document.getElementById(
            "expenseForm"
        );

    if (form)
        form.reset();

    const idField =
        document.getElementById(
            "expenseId"
        );

    if (idField)
        idField.value =
            id || "";

    setText(
        "expenseModalTitle",
        id
            ? "Edit Expense"
            : "Add Expense"
    );

    const date =
        document.getElementById(
            "expenseDate"
        );

    if (date)
        date.value =
            today();

    populateVehicleSelects();

    if (id) {

        const e =
            expenses.find(
                x => x.id === id
            );

        if (!e)
            return;

        const fields = {

            expenseVehicle:
                e.vehicle_id || "",

            expenseDate:
                e.expense_date ||
                today(),

            expenseDescription:
                e.description || "",

            expenseCategory:
                e.category || "",

            expenseAmount:
                e.amount || 0
        };

        Object.entries(fields)
            .forEach(
                ([fieldId,value]) => {

                    const field =
                        document.getElementById(
                            fieldId
                        );

                    if (field)
                        field.value =
                            value;
                }
            );
    }

    openModal(
        "expenseModal"
    );
};

window.editExpense =
function(id) {

    window.openExpenseModal(
        id
    );
};

/* =========================================================
   SAVE EXPENSE
   ========================================================= */

document
    .getElementById("expenseForm")
    ?.addEventListener(
        "submit",
        async e => {

            e.preventDefault();

            const id =
                document.getElementById(
                    "expenseId"
                )?.value;

            const vehicleId =
                document.getElementById(
                    "expenseVehicle"
                )?.value ||
                null;

            const payload = {

                vehicle_id:
                    vehicleId,

                expense_date:
                    document.getElementById(
                        "expenseDate"
                    )?.value,

                description:
                    document.getElementById(
                        "expenseDescription"
                    )?.value
                    .trim(),

                category:
                    document.getElementById(
                        "expenseCategory"
                    )?.value
                    .trim(),

                amount:
                    number(
                        document.getElementById(
                            "expenseAmount"
                        )?.value
                    )
            };

            let result;

            if (id) {

                result =
                    await supabase
                        .from(
                            TABLES.expenses
                        )
                        .update(payload)
                        .eq(
                            "id",
                            id
                        );

            } else {

                result =
                    await supabase
                        .from(
                            TABLES.expenses
                        )
                        .insert([
                            payload
                        ]);
            }

            if (result.error) {

                supabaseError(
                    result.error
                );

                return;
            }

            closeModal(
                "expenseModal"
            );

            showToast(
                id
                    ? "Expense updated."
                    : "Expense recorded."
            );

            await loadAllData();

            if (vehicleId) {

                selectedVehicleId =
                    vehicleId;

                setTimeout(
                    () =>
                        window.openVehicleWorkspace(
                            vehicleId
                        ),
                    150
                );
            }
        }
    );

/* =========================================================
   DELETE EXPENSE
   ========================================================= */

window.deleteExpense =
async function(id) {

    if (
        !confirm(
            "Delete this expense?"
        )
    )
        return;

    const {
        error
    } =
        await supabase
            .from(
                TABLES.expenses
            )
            .delete()
            .eq(
                "id",
                id
            );

    if (error) {

        supabaseError(error);
        return;
    }

    showToast(
        "Expense deleted."
    );

    await loadAllData();
};

/* =========================================================
   VEHICLE EXPENSE COMPATIBILITY
   ========================================================= */

window.openExpenseModalForVehicle =
function(vehicleId) {

    selectedVehicleId =
        vehicleId;

    closeModal(
        "vehicleExpensePreviewModal"
    );

    window.openExpenseModal();

    const select =
        document.getElementById(
            "expenseVehicle"
        );

    if (select)
        select.value =
            vehicleId;
};

window.previewVehicleExpenses =
function(vehicleId) {

    window.openVehicleWorkspace(
        vehicleId
    );
};

/* =========================================================
   PETTY CASH
   ========================================================= */

function renderPettyCash() {

    const tbody =
        document.getElementById(
            "pettyTableBody"
        );

    if (!tbody)
        return;

    const search =
        String(
            document.getElementById(
                "pettySearch"
            )?.value || ""
        ).toLowerCase();

    const category =
        String(
            document.getElementById(
                "pettyCategoryFilter"
            )?.value || ""
        ).toLowerCase();

    const filtered =
        pettyCash.filter(p => {

            const text =
                `${p.description || ""}
                 ${p.paid_to || ""}
                 ${p.category || ""}`
                .toLowerCase();

            return (
                (!search ||
                    text.includes(
                        search
                    )) &&

                (!category ||
                    String(
                        p.category || ""
                    ).toLowerCase() ===
                    category)
            );
        });

    populatePettyCategories();

    if (!filtered.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="
                        text-align:center;
                        padding:35px;
                        color:#94a3b8
                    "
                >
                    No petty cash records found.
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
                        p.cash_date || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        p.description || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        p.paid_to || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        p.category || ""
                    )}
                </td>

                <td>
                    <strong>
                        ${money(p.amount)}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        p.notes || ""
                    )}
                </td>

                <td>

                    <div class="table-actions">

                        <button
                            class="action-btn"
                            onclick="editPetty('${p.id}')"
                        >
                            ✏️
                        </button>

                        <button
                            class="action-btn"
                            onclick="deletePetty('${p.id}')"
                        >
                            🗑
                        </button>

                    </div>

                </td>

            </tr>

        `).join("");
}

function populatePettyCategories() {

    const select =
        document.getElementById(
            "pettyCategoryFilter"
        );

    if (!select)
        return;

    const current =
        select.value;

    const categories =
        [
            ...new Set(
                pettyCash
                    .map(
                        p =>
                            p.category
                    )
                    .filter(Boolean)
            )
        ];

    select.innerHTML =
        `<option value="">
            All Categories
        </option>`;

    categories
        .sort()
        .forEach(c => {

            select.innerHTML +=
                `<option value="${escapeHtml(c)}">
                    ${escapeHtml(c)}
                </option>`;
        });

    select.value =
        current;
}

/* =========================================================
   PETTY MODAL
   ========================================================= */

window.openPettyModal =
function(id = null) {

    const form =
        document.getElementById(
            "pettyForm"
        );

    if (form)
        form.reset();

    document.getElementById(
        "pettyId"
    ).value =
        id || "";

    setText(
        "pettyModalTitle",
        id
            ? "Edit Petty Cash"
            : "Add Petty Cash"
    );

    document.getElementById(
        "pettyDate"
    ).value =
        today();

    if (id) {

        const p =
            pettyCash.find(
                x => x.id === id
            );

        if (!p)
            return;

        const fields = {

            pettyDate:
                p.cash_date ||
                today(),

            pettyDescription:
                p.description || "",

            pettyPaidTo:
                p.paid_to || "",

            pettyCategory:
                p.category || "",

            pettyAmount:
                p.amount || 0,

            pettyNotes:
                p.notes || ""
        };

        Object.entries(fields)
            .forEach(
                ([fieldId,value]) => {

                    const field =
                        document.getElementById(
                            fieldId
                        );

                    if (field)
                        field.value =
                            value;
                }
            );
    }

    openModal(
        "pettyModal"
    );
};

window.editPetty =
function(id) {

    window.openPettyModal(
        id
    );
};

/* =========================================================
   SAVE PETTY
   ========================================================= */

document
    .getElementById("pettyForm")
    ?.addEventListener(
        "submit",
        async e => {

            e.preventDefault();

            const id =
                document.getElementById(
                    "pettyId"
                )?.value;

            const payload = {

                cash_date:
                    document.getElementById(
                        "pettyDate"
                    )?.value,

                description:
                    document.getElementById(
                        "pettyDescription"
                    )?.value
                    .trim(),

                paid_to:
                    document.getElementById(
                        "pettyPaidTo"
                    )?.value
                    .trim(),

                category:
                    document.getElementById(
                        "pettyCategory"
                    )?.value
                    .trim(),

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
                    .trim()
            };

            let result;

            if (id) {

                result =
                    await supabase
                        .from(
                            TABLES.petty
                        )
                        .update(payload)
                        .eq(
                            "id",
                            id
                        );

            } else {

                result =
                    await supabase
                        .from(
                            TABLES.petty
                        )
                        .insert([
                            payload
                        ]);
            }

            if (result.error) {

                supabaseError(
                    result.error
                );

                return;
            }

            closeModal(
                "pettyModal"
            );

            showToast(
                id
                    ? "Petty cash updated."
                    : "Petty cash recorded."
            );

            await loadAllData();
        }
    );

/* =========================================================
   DELETE PETTY
   ========================================================= */

window.deletePetty =
async function(id) {

    if (
        !confirm(
            "Delete this petty cash record?"
        )
    )
        return;

    const {
        error
    } =
        await supabase
            .from(
                TABLES.petty
            )
            .delete()
            .eq(
                "id",
                id
            );

    if (error) {

        supabaseError(error);
        return;
    }

    showToast(
        "Petty cash deleted."
    );

    await loadAllData();
};

/* =========================================================
   REQUISITIONS
   ========================================================= */

function renderRequisitions() {

    const tbody =
        document.getElementById(
            "requisitionsTableBody"
        );

    if (!tbody)
        return;

    const search =
        String(
            document.getElementById(
                "reqSearch"
            )?.value || ""
        ).toLowerCase();

    const status =
        String(
            document.getElementById(
                "reqStatusFilter"
            )?.value || ""
        ).toLowerCase();

    const filtered =
        requisitions.filter(r => {

            const text =
                `${r.req_no || ""}
                 ${r.requested_by || ""}
                 ${r.item_description || ""}
                 ${vehicleName(r.vehicle_id)}`
                .toLowerCase();

            return (
                (!search ||
                    text.includes(
                        search
                    )) &&

                (!status ||
                    String(
                        r.status || ""
                    ).toLowerCase() ===
                    status)
            );
        });

    const total =
        requisitions.reduce(
            (sum,r) =>
                sum +
                number(
                    r.total_amount
                ),
            0
        );

    setText(
        "reqOverallTotal",
        money(total)
    );

    if (!filtered.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="11"
                    style="
                        text-align:center;
                        padding:35px;
                        color:#94a3b8
                    "
                >
                    No requisitions found.
                </td>

            </tr>

        `;

        return;
    }

    tbody.innerHTML =
        filtered.map(r => `

            <tr>

                <td>
                    <strong>
                        ${escapeHtml(
                            r.req_no || ""
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        r.req_date || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        r.requested_by || ""
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
                        r.item_description || ""
                    )}
                </td>

                <td>
                    ${number(
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
                    ${escapeHtml(
                        r.category || ""
                    )}
                </td>

                <td>

                    <span
                        class="status ${statusClass(r.status)}"
                    >
                        ${escapeHtml(
                            r.status || ""
                        )}
                    </span>

                </td>

                <td>

                    <div class="table-actions">

                        <button
                            class="action-btn"
                            onclick="
                                event.stopPropagation();
                                previewReq('${r.id}')
                            "
                        >
                            👁
                        </button>

                        <button
                            class="action-btn"
                            onclick="
                                event.stopPropagation();
                                editReq('${r.id}')
                            "
                        >
                            ✏️
                        </button>

                        <button
                            class="action-btn"
                            onclick="
                                event.stopPropagation();
                                deleteReq('${r.id}')
                            "
                        >
                            🗑
                        </button>

                    </div>

                </td>

            </tr>

        `).join("");
}

/* =========================================================
   REQUISITION MODAL
   ========================================================= */

window.openReqModal =
function(id = null) {

    const form =
        document.getElementById(
            "reqForm"
        );

    if (form)
        form.reset();

    document.getElementById(
        "reqId"
    ).value =
        id || "";

    setText(
        "reqModalTitle",
        id
            ? "Edit Requisition"
            : "New Requisition"
    );

    document.getElementById(
        "reqDate"
    ).value =
        today();

    populateVehicleSelects();

    if (!id) {

        document.getElementById(
            "reqStatus"
        ).value =
            "Pending";

        document.getElementById(
            "reqQuantity"
        ).value =
            1;

        document.getElementById(
            "reqUnitCost"
        ).value =
            0;

        calculateReqTotal();

    } else {

        const r =
            requisitions.find(
                x => x.id === id
            );

        if (!r)
            return;

        const fields = {

            reqNo:
                r.req_no || "",

            reqDate:
                r.req_date ||
                today(),

            reqRequestedBy:
                r.requested_by ||
                "",

            reqVehicle:
                r.vehicle_id ||
                "",

            reqItemDescription:
                r.item_description ||
                "",

            reqQuantity:
                r.quantity ||
                0,

            reqUnitCost:
                r.unit_cost ||
                0,

            reqTotal:
                r.total_amount ||
                0,

            reqStatus:
                r.status ||
                "Pending",

            reqNotes:
                r.notes ||
                "",

            reqCategory:
                r.category ||
                "",

            reqExpenseType:
                r.expense_type ||
                ""
        };

        Object.entries(fields)
            .forEach(
                ([fieldId,value]) => {

                    const field =
                        document.getElementById(
                            fieldId
                        );

                    if (field)
                        field.value =
                            value;
                }
            );
    }

    openModal(
        "reqModal"
    );
};

window.editReq =
function(id) {

    window.openReqModal(
        id
    );
};

function calculateReqTotal() {

    const qty =
        number(
            document.getElementById(
                "reqQuantity"
            )?.value
        );

    const unit =
        number(
            document.getElementById(
                "reqUnitCost"
            )?.value
        );

    const total =
        qty *
        unit;

    const field =
        document.getElementById(
            "reqTotal"
        );

    if (field)
        field.value =
            total;
}

document
    .getElementById(
        "reqQuantity"
    )
    ?.addEventListener(
        "input",
        calculateReqTotal
    );

document
    .getElementById(
        "reqUnitCost"
    )
    ?.addEventListener(
        "input",
        calculateReqTotal
    );

/* =========================================================
   SAVE REQUISITION
   ========================================================= */

document
    .getElementById("reqForm")
    ?.addEventListener(
        "submit",
        async e => {

            e.preventDefault();

            const id =
                document.getElementById(
                    "reqId"
                )?.value;

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

            /*
               IMPORTANT:
               Only fields known to exist in the
               current requisitions table are sent.
            */

            const payload = {

                req_no:
                    document.getElementById(
                        "reqNo"
                    )?.value
                    .trim(),

                req_date:
                    document.getElementById(
                        "reqDate"
                    )?.value,

                requested_by:
                    document.getElementById(
                        "reqRequestedBy"
                    )?.value
                    .trim(),

                vehicle_id:
                    document.getElementById(
                        "reqVehicle"
                    )?.value ||
                    null,

                item_description:
                    document.getElementById(
                        "reqItemDescription"
                    )?.value
                    .trim(),

                quantity,

                unit_cost:
                    unitCost,

                total_amount:
                    total,

                status:
                    document.getElementById(
                        "reqStatus"
                    )?.value,

                notes:
                    document.getElementById(
                        "reqNotes"
                    )?.value
                    .trim()
            };

            let result;

            if (id) {

                result =
                    await supabase
                        .from(
                            TABLES.requisitions
                        )
                        .update(payload)
                        .eq(
                            "id",
                            id
                        );

            } else {

                result =
                    await supabase
                        .from(
                            TABLES.requisitions
                        )
                        .insert([
                            payload
                        ]);
            }

            if (result.error) {

                supabaseError(
                    result.error
                );

                return;
            }

            closeModal(
                "reqModal"
            );

            showToast(
                id
                    ? "Requisition updated."
                    : "Requisition created."
            );

            await loadAllData();
        }
    );

/* =========================================================
   DELETE REQUISITION
   ========================================================= */

window.deleteReq =
async function(id) {

    if (
        !confirm(
            "Delete this requisition?"
        )
    )
        return;

    const {
        error
    } =
        await supabase
            .from(
                TABLES.requisitions
            )
            .delete()
            .eq(
                "id",
                id
            );

    if (error) {

        supabaseError(error);
        return;
    }

    showToast(
        "Requisition deleted."
    );

    await loadAllData();
};

/* =========================================================
   REQUISITION PREVIEW
   ========================================================= */

window.previewReq =
function(id) {

    selectedReqId =
        id;

    const r =
        requisitions.find(
            x => x.id === id
        );

    if (!r)
        return;

    const content =
        document.getElementById(
            "reqPreviewContent"
        );

    if (!content)
        return;

    content.innerHTML = `

        <div
            style="
                font-family:Arial,sans-serif;
                color:#111827;
            "
        >

            <div
                style="
                    border-bottom:2px solid #202529;
                    padding-bottom:14px;
                    margin-bottom:18px;
                "
            >

                <h2>
                    GARAGE OPERATIONS PRO
                </h2>

                <div
                    style="
                        color:#64748b;
                        font-size:12px;
                    "
                >
                    Workshop Requisition
                </div>

            </div>

            <table
                style="
                    width:100%;
                    border-collapse:collapse;
                "
            >

                <tr>
                    <td style="padding:8px;font-weight:bold">
                        Requisition No.
                    </td>
                    <td style="padding:8px">
                        ${escapeHtml(
                            r.req_no || ""
                        )}
                    </td>
                </tr>

                <tr>
                    <td style="padding:8px;font-weight:bold">
                        Date
                    </td>
                    <td style="padding:8px">
                        ${escapeHtml(
                            r.req_date || ""
                        )}
                    </td>
                </tr>

                <tr>
                    <td style="padding:8px;font-weight:bold">
                        Requested By
                    </td>
                    <td style="padding:8px">
                        ${escapeHtml(
                            r.requested_by || ""
                        )}
                    </td>
                </tr>

                <tr>
                    <td style="padding:8px;font-weight:bold">
                        Vehicle
                    </td>
                    <td style="padding:8px">
                        ${escapeHtml(
                            vehicleName(
                                r.vehicle_id
                            )
                        )}
                    </td>
                </tr>

                <tr>
                    <td style="padding:8px;font-weight:bold">
                        Item
                    </td>
                    <td style="padding:8px">
                        ${escapeHtml(
                            r.item_description || ""
                        )}
                    </td>
                </tr>

                <tr>
                    <td style="padding:8px;font-weight:bold">
                        Quantity
                    </td>
                    <td style="padding:8px">
                        ${number(
                            r.quantity
                        )}
                    </td>
                </tr>

                <tr>
                    <td style="padding:8px;font-weight:bold">
                        Unit Cost
                    </td>
                    <td style="padding:8px">
                        ${money(
                            r.unit_cost
                        )}
                    </td>
                </tr>

                <tr>
                    <td style="padding:8px;font-weight:bold">
                        Total
                    </td>
                    <td style="padding:8px;font-weight:bold">
                        ${money(
                            r.total_amount
                        )}
                    </td>
                </tr>

                <tr>
                    <td style="padding:8px;font-weight:bold">
                        Status
                    </td>
                    <td style="padding:8px">
                        ${escapeHtml(
                            r.status || ""
                        )}
                    </td>
                </tr>

            </table>

        </div>

    `;

    openModal(
        "reqPreviewModal"
    );
};

window.previewSelectedReq =
function() {

    if (!requisitions.length) {

        showToast(
            "There are no requisitions."
        );

        return;
    }

    if (!selectedReqId) {

        previewReq(
            requisitions[0].id
        );

    } else {

        previewReq(
            selectedReqId
        );
    }
};

/* =========================================================
   PRINT ENGINE
   ========================================================= */

function printHtml(
    title,
    html
) {

    const win =
        window.open(
            "",
            "_blank",
            "width=1000,height=700"
        );

    if (!win) {

        showToast(
            "Please allow pop-ups to print."
        );

        return;
    }

    win.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

            <title>
                ${escapeHtml(title)}
            </title>

            <style>

                body{
                    font-family:Arial,sans-serif;
                    padding:30px;
                    color:#111827;
                }

                h1,h2,h3{
                    margin-top:0;
                }

                table{
                    width:100%;
                    border-collapse:collapse;
                    margin-top:20px;
                }

                th,td{
                    border:1px solid #d1d5db;
                    padding:9px;
                    text-align:left;
                    font-size:12px;
                }

                th{
                    background:#f1f3f4;
                }

                .header{
                    border-bottom:2px solid #202529;
                    padding-bottom:15px;
                    margin-bottom:20px;
                }

            </style>

        </head>

        <body>

            ${html}

        </body>

        </html>

    `);

    win.document.close();

    win.focus();

    setTimeout(
        () => win.print(),
        300
    );
}

/* =========================================================
   PRINT VEHICLES
   ========================================================= */

window.printVehicles =
function() {

    const rows =
        vehicles.map(v => `

            <tr>

                <td>
                    ${escapeHtml(
                        v.registration
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        v.customer
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        v.date_in || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        v.date_out || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        v.job_type || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        v.status || ""
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
                        number(v.billed) -
                        number(v.paid)
                    )}
                </td>

            </tr>

        `).join("");

    printHtml(
        "Garage Vehicles",
        `

            <div class="header">

                <h1>
                    Garage Operations Pro
                </h1>

                <h3>
                    Vehicle Register
                </h3>

            </div>

            <table>

                <thead>

                    <tr>
                        <th>Registration</th>
                        <th>Customer</th>
                        <th>Date In</th>
                        <th>Date Out</th>
                        <th>Job Type</th>
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

        `
    );
};

/* =========================================================
   PRINT SELECTED VEHICLE
   ========================================================= */

function printVehicleReport(
    vehicleId
) {

    const v =
        vehicles.find(
            x => x.id === vehicleId
        );

    if (!v)
        return;

    const list =
        expenses.filter(
            e =>
                e.vehicle_id ===
                vehicleId
        );

    const expenseRows =
        list.map(e => `

            <tr>

                <td>
                    ${escapeHtml(
                        e.expense_date || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        e.category || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        e.description || ""
                    )}
                </td>

                <td>
                    ${money(e.amount)}
                </td>

            </tr>

        `).join("");

    const expenseTotal =
        list.reduce(
            (sum,e) =>
                sum +
                number(e.amount),
            0
        );

    printHtml(
        `Vehicle ${v.registration}`,
        `

            <div class="header">

                <h1>
                    Garage Operations Pro
                </h1>

                <h2>
                    Vehicle Report
                </h2>

                <strong>
                    ${escapeHtml(
                        v.registration
                    )}
                </strong>

            </div>

            <table>

                <tr>
                    <th>Customer</th>
                    <td>
                        ${escapeHtml(
                            v.customer || ""
                        )}
                    </td>
                </tr>

                <tr>
                    <th>Date In</th>
                    <td>
                        ${escapeHtml(
                            v.date_in || ""
                        )}
                    </td>
                </tr>

                <tr>
                    <th>Date Out</th>
                    <td>
                        ${escapeHtml(
                            v.date_out || "-"
                        )}
                    </td>
                </tr>

                <tr>
                    <th>Job Type</th>
                    <td>
                        ${escapeHtml(
                            v.job_type || ""
                        )}
                    </td>
                </tr>

                <tr>
                    <th>Status</th>
                    <td>
                        ${escapeHtml(
                            v.status || ""
                        )}
                    </td>
                </tr>

                <tr>
                    <th>Billed</th>
                    <td>
                        ${money(v.billed)}
                    </td>
                </tr>

                <tr>
                    <th>Paid</th>
                    <td>
                        ${money(v.paid)}
                    </td>
                </tr>

                <tr>
                    <th>Outstanding</th>
                    <td>
                        ${money(
                            number(v.billed) -
                            number(v.paid)
                        )}
                    </td>
                </tr>

            </table>

            <h3 style="margin-top:30px">
                Expense History
            </h3>

            <table>

                <thead>

                    <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>

                </thead>

                <tbody>

                    ${
                        expenseRows ||
                        `
                        <tr>
                            <td colspan="4">
                                No expenses recorded.
                            </td>
                        </tr>
                        `
                    }

                </tbody>

            </table>

            <h3>
                Total Vehicle Expenses:
                ${money(expenseTotal)}
            </h3>

        `
    );
}

window.printVehicleExpensePreview =
function() {

    if (!selectedVehicleId)
        return;

    printVehicleReport(
        selectedVehicleId
    );
};

window.printSelectedReq =
function() {

    if (!selectedReqId) {

        showToast(
            "Select a requisition first."
        );

        return;
    }

    const r =
        requisitions.find(
            x => x.id === selectedReqId
        );

    if (!r)
        return;

    const content =
        document.getElementById(
            "reqPreviewContent"
        );

    if (!content)
        return;

    printHtml(
        "Requisition " +
        r.req_no,
        content.innerHTML
    );
};

/* =========================================================
   PRINT EXPENSES
   ========================================================= */

window.printExpenses =
function() {

    const rows =
        expenses.map(e => `

            <tr>

                <td>
                    ${escapeHtml(
                        e.expense_date || ""
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
                        e.description || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        e.category || ""
                    )}
                </td>

                <td>
                    ${money(e.amount)}
                </td>

            </tr>

        `).join("");

    printHtml(
        "Garage Expenses",
        `

            <div class="header">

                <h1>
                    Garage Operations Pro
                </h1>

                <h3>
                    Expenses
                </h3>

            </div>

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

        `
    );
};

/* =========================================================
   PRINT PETTY CASH
   ========================================================= */

window.printPettyCash =
function() {

    const rows =
        pettyCash.map(p => `

            <tr>

                <td>
                    ${escapeHtml(
                        p.cash_date || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        p.description || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        p.paid_to || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        p.category || ""
                    )}
                </td>

                <td>
                    ${money(p.amount)}
                </td>

                <td>
                    ${escapeHtml(
                        p.notes || ""
                    )}
                </td>

            </tr>

        `).join("");

    printHtml(
        "Garage Petty Cash",
        `

            <div class="header">

                <h1>
                    Garage Operations Pro
                </h1>

                <h3>
                    Petty Cash
                </h3>

            </div>

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

        `
    );
};

/* =========================================================
   PRINT REQUISITIONS
   ========================================================= */

window.printRequisitions =
function() {

    const rows =
        requisitions.map(r => `

            <tr>

                <td>
                    ${escapeHtml(
                        r.req_no || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        r.req_date || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        r.requested_by || ""
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
                        r.item_description || ""
                    )}
                </td>

                <td>
                    ${number(
                        r.quantity
                    )}
                </td>

                <td>
                    ${money(
                        r.unit_cost
                    )}
                </td>

                <td>
                    ${money(
                        r.total_amount
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        r.status || ""
                    )}
                </td>

            </tr>

        `).join("");

    printHtml(
        "Garage Requisitions",
        `

            <div class="header">

                <h1>
                    Garage Operations Pro
                </h1>

                <h3>
                    Requisitions
                </h3>

            </div>

            <table>

                <thead>

                    <tr>
                        <th>Req No.</th>
                        <th>Date</th>
                        <th>Requested By</th>
                        <th>Vehicle</th>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Unit Cost</th>
                        <th>Total</th>
                        <th>Status</th>
                    </tr>

                </thead>

                <tbody>
                    ${rows}
                </tbody>

            </table>

        `
    );
};

/* =========================================================
   SHARE
   ========================================================= */

async function shareText(
    title,
    text
) {

    if (
        navigator.share
    ) {

        try {

            await navigator.share({
                title,
                text
            });

        } catch (error) {

            console.log(error);
        }

    } else {

        try {

            await navigator.clipboard
                .writeText(text);

            showToast(
                "Details copied to clipboard."
            );

        } catch (error) {

            showToast(
                "Sharing is not supported on this device."
            );
        }
    }
}

/* =========================================================
   SHARE VEHICLE
   ========================================================= */

window.shareVehicle =
function(id) {

    const v =
        vehicles.find(
            x => x.id === id
        );

    if (!v)
        return;

    const list =
        expenses.filter(
            e =>
                e.vehicle_id ===
                id
        );

    const expenseTotal =
        list.reduce(
            (sum,e) =>
                sum +
                number(e.amount),
            0
        );

    shareText(
        "Vehicle " +
        v.registration,

        `
GARAGE OPERATIONS PRO

Vehicle: ${v.registration}
Customer: ${v.customer || ""}
Date In: ${v.date_in || ""}
Date Out: ${v.date_out || ""}
Job Type: ${v.job_type || ""}
Status: ${v.status || ""}

Billed: ${money(v.billed)}
Paid: ${money(v.paid)}
Outstanding: ${money(
    number(v.billed) -
    number(v.paid)
)}

Vehicle Expenses: ${money(
    expenseTotal
)}
        `
    );
};

window.shareExpense =
function(id) {

    const e =
        expenses.find(
            x => x.id === id
        );

    if (!e)
        return;

    shareText(
        "Garage Expense",

        `
Date: ${e.expense_date}
Vehicle: ${vehicleName(
    e.vehicle_id
)}
Description: ${e.description}
Category: ${e.category}
Amount: ${money(e.amount)}
        `
    );
};

window.sharePetty =
function(id) {

    const p =
        pettyCash.find(
            x => x.id === id
        );

    if (!p)
        return;

    shareText(
        "Petty Cash",

        `
Date: ${p.cash_date}
Description: ${p.description}
Paid To: ${p.paid_to}
Category: ${p.category}
Amount: ${money(p.amount)}
Notes: ${p.notes || ""}
        `
    );
};

window.shareReq =
function(id) {

    const r =
        requisitions.find(
            x => x.id === id
        );

    if (!r)
        return;

    shareText(
        "Requisition " +
        r.req_no,

        `
Requisition: ${r.req_no}
Date: ${r.req_date}
Requested By: ${r.requested_by}
Vehicle: ${vehicleName(
    r.vehicle_id
)}
Item: ${r.item_description}
Quantity: ${r.quantity}
Unit Cost: ${money(
    r.unit_cost
)}
Total: ${money(
    r.total_amount
)}
Status: ${r.status}
        `
    );
};

/* =========================================================
   DASHBOARD CARD NAVIGATION
   ========================================================= */

function setupDashboardCards() {

    const mappings = [

        {
            ids:[
                "dashVehicles"
            ],
            section:"vehicles"
        },

        {
            ids:[
                "dashRepair"
            ],
            section:"vehicles"
        },

        {
            ids:[
                "dashBilled",
                "dashPaid",
                "dashOutstanding"
            ],
            section:"vehicles"
        },

        {
            ids:[
                "dashExpenses"
            ],
            section:"expenses"
        },

        {
            ids:[
                "dashPetty"
            ],
            section:"pettyCash"
        },

        {
            ids:[
                "dashReq",
                "dashReqCount",
                "dashReqTotal",
                "reqOverallTotal"
            ],
            section:"requisitions"
        }

    ];

    mappings.forEach(item => {

        item.ids.forEach(id => {

            const element =
                document.getElementById(
                    id
                );

            if (!element)
                return;

            const card =
                element.closest(
                    ".dashboard-card,.stat-card,.kpi-card,.card"
                ) ||
                element.parentElement;

            if (!card)
                return;

            if (
                card.dataset.garageCardReady
            )
                return;

            card.dataset.garageCardReady =
                "true";

            card.style.cursor =
                "pointer";

            card.addEventListener(
                "click",
                event => {

                    if (
                        event.target.closest(
                            "button,a"
                        )
                    )
                        return;

                    window.showSection(
                        item.section
                    );
                }
            );
        });
    });
}

/* =========================================================
   SEARCH / FILTER
   ========================================================= */

[
    "vehicleSearch",
    "vehicleStatusFilter"
].forEach(id => {

    document
        .getElementById(id)
        ?.addEventListener(
            "input",
            renderVehicles
        );

    document
        .getElementById(id)
        ?.addEventListener(
            "change",
            renderVehicles
        );
});

[
    "expenseSearch",
    "expenseCategoryFilter"
].forEach(id => {

    document
        .getElementById(id)
        ?.addEventListener(
            "input",
            renderExpenses
        );

    document
        .getElementById(id)
        ?.addEventListener(
            "change",
            renderExpenses
        );
});

[
    "pettySearch",
    "pettyCategoryFilter"
].forEach(id => {

    document
        .getElementById(id)
        ?.addEventListener(
            "input",
            renderPettyCash
        );

    document
        .getElementById(id)
        ?.addEventListener(
            "change",
            renderPettyCash
        );
});

[
    "reqSearch",
    "reqStatusFilter"
].forEach(id => {

    document
        .getElementById(id)
        ?.addEventListener(
            "input",
            renderRequisitions
        );

    document
        .getElementById(id)
        ?.addEventListener(
            "change",
            renderRequisitions
        );
});

/* =========================================================
   MODAL OUTSIDE CLICK
   ========================================================= */

document.addEventListener(
    "click",
    e => {

        if (
            e.target.classList.contains(
                "modal"
            )
        ) {

            e.target.classList.remove(
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
    e => {

        if (
            e.key ===
            "Escape"
        ) {

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
    }
);

/* =========================================================
   GLOBAL ERROR HANDLING
   ========================================================= */

window.addEventListener(
    "error",
    e => {

        console.error(
            "Application error:",
            e.error ||
            e.message
        );
    }
);

/* =========================================================
   START
   ========================================================= */

async function startApp() {

    injectPremiumStyles();

    await loadAllData();

    setTimeout(
        setupDashboardCards,
        100
    );
}

startApp();
