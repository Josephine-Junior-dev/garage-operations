import { createClient }
from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
   PREMIUM GRAPHITE / STEEL EDITION
   REQUISITION ACCOUNTING SEPARATION
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

/*
   True when petty_cash.req_no exists and can be used.
   This is important because older databases may not yet
   have the new column.
*/
let pettyCashHasReqNo = false;

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
        box-shadow:0 18px 45px rgba(0,0,0,.35);
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
        grid-template-columns:repeat(5,minmax(0,1fr));
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
        grid-template-columns:repeat(3,minmax(0,1fr));
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

    /* =====================================================
       REQUISITION FINANCIAL CARDS
       ===================================================== */

    .gop-req-finance{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:10px;
        margin:16px 0 18px;
    }

    .gop-req-finance-card{
        padding:14px;
        border:1px solid #30363b;
        background:#181c1f;
        border-radius:13px;
    }

    .gop-req-finance-label{
        font-size:9px;
        letter-spacing:1px;
        text-transform:uppercase;
        color:#7f8990;
        font-weight:800;
    }

    .gop-req-finance-value{
        margin-top:6px;
        font-size:18px;
        font-weight:900;
        color:#f2f4f5;
    }

    .gop-req-finance-note{
        margin-top:4px;
        font-size:10px;
        color:#7f8990;
    }

    .gop-req-search-highlight{
        border:1px solid #3a4248;
        background:#1b2023;
        border-radius:14px;
        padding:15px;
        margin:12px 0;
    }

    .gop-req-search-title{
        font-size:18px;
        font-weight:900;
        color:#f1f4f5;
    }

    .gop-req-search-sub{
        margin-top:4px;
        color:#8c969d;
        font-size:11px;
    }

    .gop-req-balance{
        font-weight:900;
    }

    .gop-req-balance-zero{
        color:#a8c1ad;
    }

    .gop-req-balance-due{
        color:#e0c1a1;
    }

    .gop-req-payment{
        font-size:10px;
        color:#8e989f;
        margin-top:3px;
    }

    /* Dynamically created requisition selector */

    .gop-req-field{
        margin-top:12px;
    }

    .gop-req-field label{
        display:block;
        margin-bottom:5px;
        font-size:11px;
        font-weight:700;
    }

    .gop-req-field select,
    .gop-req-field input{
        width:100%;
        box-sizing:border-box;
    }

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
            grid-template-columns:repeat(2,minmax(0,1fr));
        }

        .gop-vw-info{
            grid-template-columns:repeat(2,minmax(0,1fr));
        }

        .gop-expense-list{
            overflow-x:auto;
        }

        .gop-expense-head,
        .gop-expense-row{
            min-width:620px;
        }

        .gop-req-finance{
            grid-template-columns:1fr;
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

function normalizeReqNo(value) {

    return String(value || "")
        .trim()
        .toUpperCase();
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
   REQUISITION FINANCIAL CALCULATION
   ========================================================= */

/*
   IMPORTANT:

   A requisition is identified by its EXACT req_no.

   Example:

   REQ-001 -> only payments where req_no = REQ-001
   REQ-002 -> only payments where req_no = REQ-002

   There is deliberately NO global petty cash calculation here.
*/

function getRequisitionPayments(reqNo) {

    const target =
        normalizeReqNo(reqNo);

    if (!target)
        return [];

    return pettyCash.filter(p => {

        const paymentReqNo =
            normalizeReqNo(
                p.req_no
            );

        return (
            paymentReqNo &&
            paymentReqNo === target
        );
    });
}

function getRequisitionReceived(reqNo) {

    const payments =
        getRequisitionPayments(
            reqNo
        );

    return payments.reduce(
        (sum,p) =>
            sum +
            number(p.amount),
        0
    );
}

function getRequisitionFinancials(req) {

    if (!req) {

        return {
            requested:0,
            received:0,
            balance:0,
            payments:[]
        };
    }

    const requested =
        number(
            req.total_amount
        );

    const payments =
        getRequisitionPayments(
            req.req_no
        );

    const received =
        payments.reduce(
            (sum,p) =>
                sum +
                number(p.amount),
            0
        );

    const balance =
        Math.max(
            requested - received,
            0
        );

    return {
        requested,
        received,
        balance,
        payments
    };
}

/*
   Used for the overall dashboard total.

   This is ONLY the sum of each requisition's own
   requested amount. It is NOT used to calculate an
   individual requisition's balance.
*/

function getTotalRequisitionRequested() {

    return requisitions.reduce(
        (sum,r) =>
            sum +
            number(r.total_amount),
        0
    );
}

function getTotalRequisitionReceived() {

    /*
       Only petty cash entries that actually have
       a requisition number are considered here.
    */

    return pettyCash.reduce(
        (sum,p) => {

            const reqNo =
                normalizeReqNo(
                    p.req_no
                );

            if (!reqNo)
                return sum;

            return (
                sum +
                number(p.amount)
            );
        },
        0
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
   REQUISITION SELECT
   ========================================================= */

function populateRequisitionSelect(select) {

    if (!select)
        return;

    const current =
        normalizeReqNo(
            select.value
        );

    select.innerHTML =
        `<option value="">
            No Requisition
        </option>`;

    [...requisitions]
        .sort(
            (a,b) =>
                normalizeReqNo(a.req_no)
                    .localeCompare(
                        normalizeReqNo(b.req_no)
                    )
        )
        .forEach(r => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                normalizeReqNo(
                    r.req_no
                );

            option.textContent =
                normalizeReqNo(
                    r.req_no
                );

            select.appendChild(
                option
            );
        });

    if (
        [...select.options]
            .some(
                o =>
                    normalizeReqNo(o.value) ===
                    current
            )
    ) {

        select.value =
            current;
    }
}

/* =========================================================
   DYNAMIC PETTY CASH REQUISITION FIELD
   ========================================================= */

function ensurePettyRequisitionField() {

    const form =
        document.getElementById(
            "pettyForm"
        );

    if (!form)
        return null;

    /*
       If the HTML already has pettyReqNo,
       use it and do not create another.
    */

    let existing =
        document.getElementById(
            "pettyReqNo"
        );

    if (existing) {

        pettyCashHasReqNo = true;

        populateRequisitionSelect(
            existing
        );

        return existing;
    }

    /*
       If database does not yet have req_no,
       still create the field visually. Saving
       will explain what needs to be added.
    */

    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        "gop-req-field";

    wrapper.id =
        "dynamicPettyReqField";

    wrapper.innerHTML = `

        <label for="pettyReqNo">
            Requisition No.
        </label>

        <select id="pettyReqNo">

            <option value="">
                No Requisition
            </option>

        </select>

        <small
            style="
                display:block;
                margin-top:5px;
                color:#8c969d;
                font-size:10px;
            "
        >
            Link this payment to one exact requisition.
        </small>

    `;

    /*
       Put it before the first submit button,
       or at the end if no button exists.
    */

    const submit =
        form.querySelector(
            'button[type="submit"],input[type="submit"]'
        );

    if (submit) {

        form.insertBefore(
            wrapper,
            submit
        );

    } else {

        form.appendChild(
            wrapper
        );
    }

    existing =
        document.getElementById(
            "pettyReqNo"
        );

    populateRequisitionSelect(
        existing
    );

    return existing;
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

    /*
       First try the new structure with req_no.
    */

    let result =
        await supabase
            .from(TABLES.petty)
            .select("*")
            .order(
                "cash_date",
                {
                    ascending:false
                }
            );

    /*
       If req_no does not exist, Supabase normally
       returns a column error. Try loading the old
       structure so the rest of the application
       continues working.
    */

    if (
        result.error &&
        String(result.error.message || "")
            .toLowerCase()
            .includes("req_no")
    ) {

        console.warn(
            "petty_cash.req_no is not available yet. " +
            "Requisition-linked payments require this column."
        );

        pettyCashHasReqNo =
            false;

        result =
            await supabase
                .from(TABLES.petty)
                .select("*")
                .order(
                    "cash_date",
                    {
                        ascending:false
                    }
                );

    } else {

        pettyCashHasReqNo =
            !result.error;
    }

    if (result.error) {

        supabaseError(
            result.error
        );

        return;
    }

    pettyCash =
        dataWithReqNo(
            result.data || []
        );
}

/*
   Ensures old rows behave as unlinked payments.
*/

function dataWithReqNo(data) {

    return (data || []).map(
        row => ({
            ...row,
            req_no:
                normalizeReqNo(
                    row.req_no
                )
        })
    );
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

    ensurePettyRequisitionField();

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
        getTotalRequisitionRequested();

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
                ).toLowerCase() ===
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
                            onclick="editVehicle('${v.id}')"
                        >
                            ✏ Edit
                        </button>

                        <button
                            type="button"
                            class="vehicle-action-btn vehicle-delete-btn"
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
                    <div class="gop-vw-stat-label">Job</div>
                    <div class="gop-vw-stat-value">
                        ${escapeHtml(
                            vehicle.job_type ||
                            "Repair"
                        )}
                    </div>
                </div>

                <div class="gop-vw-stat">
                    <div class="gop-vw-stat-label">Date In</div>
                    <div class="gop-vw-stat-value">
                        ${escapeHtml(
                            vehicle.date_in ||
                            "-"
                        )}
                    </div>
                </div>

                <div class="gop-vw-stat">
                    <div class="gop-vw-stat-label">Date Out</div>
                    <div class="gop-vw-stat-value">
                        ${escapeHtml(
                            vehicle.date_out ||
                            "-"
                        )}
                    </div>
                </div>

                <div class="gop-vw-stat">
                    <div class="gop-vw-stat-label">Billed</div>
                    <div class="gop-vw-stat-value">
                        ${money(
                            vehicle.billed
                        )}
                    </div>
                </div>

                <div class="gop-vw-stat">
                    <div class="gop-vw-stat-label">Outstanding</div>
                    <div class="gop-vw-stat-value">
                        ${money(
                            outstanding
                        )}
                    </div>
                </div>

            </div>

            <div class="gop-vw-info">

                <div class="gop-vw-info-item">
                    <span>Released To</span>
                    <strong>
                        ${escapeHtml(
                            vehicle.released_to ||
                            "-"
                        )}
                    </strong>
                </div>

                <div class="gop-vw-info-item">
                    <span>Release Contact</span>
                    <strong>
                        ${escapeHtml(
                            vehicle.released_contact ||
                            "-"
                        )}
                    </strong>
                </div>

                <div class="gop-vw-info-item">
                    <span>Total Vehicle Expenses</span>
                    <strong>
                        ${money(total)}
                    </strong>
                </div>

                <div
                    class="gop-vw-info-item"
                    style="grid-column:1/-1"
                >
                    <span>Description</span>
                    <strong>
                        ${escapeHtml(
                            vehicle.description ||
                            "No description recorded."
                        )}
                    </strong>
                </div>

            </div>

            <div class="gop-vw-section">

                <div class="gop-vw-section-head">

                    <div>

                        <div class="gop-vw-section-title">
                            Expense History
                        </div>

                        <div class="gop-vw-section-sub">
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

                        <strong class="gop-vw-total">
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

                                <div class="gop-expense-row">

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
                    <div class="gop-expense-empty">

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

                        <span style="font-size:11px">
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
   VEHICLE ACTIONS
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
                fieldId =>
                    document.getElementById(
                        fieldId
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
                ).toLowerCase() ===
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
                 ${p.category || ""}
                 ${p.req_no || ""}`
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
                    colspan="8"
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
                    ${escapeHtml(
                        p.req_no || "-"
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

    const idField =
        document.getElementById(
            "pettyId"
        );

    if (idField)
        idField.value =
            id || "";

    setText(
        "pettyModalTitle",
        id
            ? "Edit Petty Cash"
            : "Add Petty Cash"
    );

    const date =
        document.getElementById(
            "pettyDate"
        );

    if (date)
        date.value =
            today();

    const reqSelect =
        ensurePettyRequisitionField();

    populateRequisitionSelect(
        reqSelect
    );

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

        if (reqSelect) {

            reqSelect.value =
                normalizeReqNo(
                    p.req_no
                );
        }
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

            const reqField =
                document.getElementById(
                    "pettyReqNo"
                );

            const reqNo =
                normalizeReqNo(
                    reqField?.value
                );

            const basePayload = {

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

            /*
               If req_no is available in the database,
               save the exact requisition number.
            */

            let payload = {
                ...basePayload
            };

            if (pettyCashHasReqNo) {

                payload.req_no =
                    reqNo || null;

            } else if (reqNo) {

                /*
                   Do not silently create a payment that
                   looks linked when the database cannot
                   store the link.
                */

                showToast(
                    "Add the req_no column to petty_cash before linking a payment."
                );

                return;
            }

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

            /*
               If the column was thought to exist but
               Supabase rejects it, retry without it only
               for unlinked records.
            */

            if (
                result.error &&
                pettyCashHasReqNo &&
                String(
                    result.error.message || ""
                )
                .toLowerCase()
                .includes("req_no")
            ) {

                pettyCashHasReqNo =
                    false;

                if (!reqNo) {

                    result =
                        await supabase
                            .from(
                                TABLES.petty
                            )
                            .update(
                                basePayload
                            )
                            .eq(
                                "id",
                                id
                            );

                } else {

                    showToast(
                        "The database needs petty_cash.req_no to link this payment."
                    );

                    return;
                }
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

            /*
               If payment was linked, show the affected
               requisition immediately.
            */

            if (reqNo) {

                const affected =
                    requisitions.find(
                        r =>
                            normalizeReqNo(
                                r.req_no
                            ) === reqNo
                    );

                if (affected) {

                    selectedReqId =
                        affected.id;

                    setTimeout(
                        () =>
                            previewReq(
                                affected.id
                            ),
                        150
                    );
                }
            }
        }
    );

/* =========================================================
   DELETE PETTY
   ========================================================= */

window.deletePetty =
async function(id) {

    const payment =
        pettyCash.find(
            p => p.id === id
        );

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

    /*
       Refresh the requisition whose payment was
       deleted.
    */

    if (payment?.req_no) {

        const affected =
            requisitions.find(
                r =>
                    normalizeReqNo(
                        r.req_no
                    ) ===
                    normalizeReqNo(
                        payment.req_no
                    )
            );

        if (affected) {

            setTimeout(
                () =>
                    previewReq(
                        affected.id
                    ),
                150
            );
        }
    }
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

    const rawSearch =
        String(
            document.getElementById(
                "reqSearch"
            )?.value || ""
        ).trim();

    const search =
        rawSearch.toLowerCase();

    const status =
        String(
            document.getElementById(
                "reqStatusFilter"
            )?.value || ""
        ).toLowerCase();

    const filtered =
        requisitions.filter(r => {

            /*
               Exact requisition search is given
               priority when the search looks like
               REQ-001 / REQ-002.
            */

            const reqNo =
                normalizeReqNo(
                    r.req_no
                );

            const exactReqSearch =
                normalizeReqNo(
                    rawSearch
                );

            const isReqSearch =
                /^REQ-\d+$/i.test(
                    rawSearch
                );

            let matchesSearch;

            if (isReqSearch) {

                matchesSearch =
                    reqNo ===
                    exactReqSearch;

            } else {

                const text =
                    `${r.req_no || ""}
                     ${r.requested_by || ""}
                     ${r.item_description || ""}
                     ${vehicleName(r.vehicle_id)}`
                    .toLowerCase();

                matchesSearch =
                    !search ||
                    text.includes(search);
            }

            const matchesStatus =
                !status ||
                String(
                    r.status || ""
                ).toLowerCase() ===
                status;

            return (
                matchesSearch &&
                matchesStatus
            );
        });

    const total =
        getTotalRequisitionRequested();

    setText(
        "reqOverallTotal",
        money(total)
    );

    /*
       If the user searched an exact requisition,
       render its financial summary.
    */

    renderSelectedRequisitionSearchSummary(
        rawSearch
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
        filtered.map(r => {

            const financial =
                getRequisitionFinancials(
                    r
                );

            const balanceClass =
                financial.balance <= 0
                    ? "gop-req-balance gop-req-balance-zero"
                    : "gop-req-balance gop-req-balance-due";

            return `

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
                            financial.requested
                        )}
                    </strong>
                </td>

                <td>

                    <strong>
                        ${money(
                            financial.received
                        )}
                    </strong>

                    <div class="gop-req-payment">
                        ${
                            financial.payments.length
                            ? `${financial.payments.length} linked payment${financial.payments.length === 1 ? "" : "s"}`
                            : "No linked payment"
                        }
                    </div>

                </td>

                <td>

                    <strong class="${balanceClass}">
                        ${money(
                            financial.balance
                        )}
                    </strong>

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

            `;

        }).join("");
}

/* =========================================================
   EXACT REQUISITION SEARCH SUMMARY
   ========================================================= */

function renderSelectedRequisitionSearchSummary(
    searchValue
) {

    const existing =
        document.getElementById(
            "gopReqSearchSummary"
        );

    if (existing)
        existing.remove();

    if (
        !/^REQ-\d+$/i.test(
            String(searchValue || "").trim()
        )
    )
        return;

    const target =
        normalizeReqNo(
            searchValue
        );

    const req =
        requisitions.find(
            r =>
                normalizeReqNo(
                    r.req_no
                ) === target
        );

    if (!req)
        return;

    const financial =
        getRequisitionFinancials(
            req
        );

    const tbody =
        document.getElementById(
            "requisitionsTableBody"
        );

    if (!tbody)
        return;

    const table =
        tbody.closest(
            "table"
        );

    if (!table)
        return;

    const summary =
        document.createElement(
            "div"
        );

    summary.id =
        "gopReqSearchSummary";

    summary.className =
        "gop-req-search-highlight";

    summary.innerHTML = `

        <div class="gop-req-search-title">
            ${escapeHtml(
                normalizeReqNo(req.req_no)
            )}
        </div>

        <div class="gop-req-search-sub">
            Financial position for this requisition only
        </div>

        <div class="gop-req-finance">

            <div class="gop-req-finance-card">

                <div class="gop-req-finance-label">
                    Requested
                </div>

                <div class="gop-req-finance-value">
                    ${money(
                        financial.requested
                    )}
                </div>

            </div>

            <div class="gop-req-finance-card">

                <div class="gop-req-finance-label">
                    Received
                </div>

                <div class="gop-req-finance-value">
                    ${money(
                        financial.received
                    )}
                </div>

                <div class="gop-req-finance-note">
                    Only payments linked to ${escapeHtml(
                        normalizeReqNo(req.req_no)
                    )}
                </div>

            </div>

            <div class="gop-req-finance-card">

                <div class="gop-req-finance-label">
                    Balance
                </div>

                <div class="gop-req-finance-value">
                    ${money(
                        financial.balance
                    )}
                </div>

            </div>

        </div>

    `;

    table.parentNode.insertBefore(
        summary,
        table
    );
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

    const idField =
        document.getElementById(
            "reqId"
        );

    if (idField)
        idField.value =
            id || "";

    setText(
        "reqModalTitle",
        id
            ? "Edit Requisition"
            : "New Requisition"
    );

    const date =
        document.getElementById(
            "reqDate"
        );

    if (date)
        date.value =
            today();

    populateVehicleSelects();

    if (!id) {

        const status =
            document.getElementById(
                "reqStatus"
            );

        if (status)
            status.value =
                "Pending";

        const quantity =
            document.getElementById(
                "reqQuantity"
            );

        if (quantity)
            quantity.value =
                1;

        const unit =
            document.getElementById(
                "reqUnitCost"
            );

        if (unit)
            unit.value =
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

            const reqNo =
                normalizeReqNo(
                    document.getElementById(
                        "reqNo"
                    )?.value
                );

            /*
               IMPORTANT:

               Requisition number remains an independent
               identifier.

               REQ-001 is never merged with REQ-002.
            */

            if (!reqNo) {

                showToast(
                    "Requisition number is required."
                );

                return;
            }

            const duplicate =
                requisitions.some(
                    r =>
                        normalizeReqNo(
                            r.req_no
                        ) === reqNo &&
                        r.id !== id
                );

            if (duplicate) {

                showToast(
                    `${reqNo} already exists. Use a different requisition number.`
                );

                return;
            }

            const payload = {

                req_no:
                    reqNo,

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
                    ? `${reqNo} updated.`
                    : `${reqNo} created.`
            );

            await loadAllData();

            /*
               Open the exact requisition after saving.
            */

            const saved =
                requisitions.find(
                    r =>
                        normalizeReqNo(
                            r.req_no
                        ) === reqNo
                );

            if (saved) {

                selectedReqId =
                    saved.id;

                setTimeout(
                    () =>
                        previewReq(
                            saved.id
                        ),
                    150
                );
            }
        }
    );

/* =========================================================
   DELETE REQUISITION
   ========================================================= */

window.deleteReq =
async function(id) {

    const req =
        requisitions.find(
            r => r.id === id
        );

    if (
        !confirm(
            `Delete ${req?.req_no || "this requisition"}?`
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

    if (
        selectedReqId === id
    ) {

        selectedReqId =
            null;
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

    const financial =
        getRequisitionFinancials(
            r
        );

    const paymentRows =
        financial.payments
            .map(p => `

                <tr>

                    <td style="padding:8px">
                        ${escapeHtml(
                            p.cash_date || "-"
                        )}
                    </td>

                    <td style="padding:8px">
                        ${escapeHtml(
                            p.description || "-"
                        )}
                    </td>

                    <td style="padding:8px">
                        ${escapeHtml(
                            p.paid_to || "-"
                        )}
                    </td>

                    <td
                        style="
                            padding:8px;
                            text-align:right;
                        "
                    >
                        ${money(
                            p.amount
                        )}
                    </td>

                </tr>

            `)
            .join("");

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

            <h2 style="margin-bottom:4px">
                ${escapeHtml(
                    normalizeReqNo(
                        r.req_no
                    )
                )}
            </h2>

            <div
                style="
                    color:#64748b;
                    font-size:11px;
                    margin-bottom:15px;
                "
            >
                This financial summary belongs to this requisition only.
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

            </table>

            <div
                style="
                    display:grid;
                    grid-template-columns:repeat(3,1fr);
                    gap:10px;
                    margin-top:20px;
                "
            >

                <div
                    style="
                        border:1px solid #d1d5db;
                        padding:12px;
                    "
                >
                    <div
                        style="
                            font-size:10px;
                            color:#64748b;
                        "
                    >
                        REQUESTED
                    </div>

                    <strong>
                        ${money(
                            financial.requested
                        )}
                    </strong>
                </div>

                <div
                    style="
                        border:1px solid #d1d5db;
                        padding:12px;
                    "
                >
                    <div
                        style="
                            font-size:10px;
                            color:#64748b;
                        "
                    >
                        RECEIVED
                    </div>

                    <strong>
                        ${money(
                            financial.received
                        )}
                    </strong>
                </div>

                <div
                    style="
                        border:1px solid #d1d5db;
                        padding:12px;
                    "
                >
                    <div
                        style="
                            font-size:10px;
                            color:#64748b;
                        "
                    >
                        BALANCE
                    </div>

                    <strong>
                        ${money(
                            financial.balance
                        )}
                    </strong>
                </div>

            </div>

            <h3 style="margin-top:30px">
                Linked Payments
            </h3>

            <table
                style="
                    width:100%;
                    border-collapse:collapse;
                "
            >

                <thead>

                    <tr>

                        <th
                            style="
                                padding:8px;
                                border:1px solid #d1d5db;
                                text-align:left;
                            "
                        >
                            Date
                        </th>

                        <th
                            style="
                                padding:8px;
                                border:1px solid #d1d5db;
                                text-align:left;
                            "
                        >
                            Description
                        </th>

                        <th
                            style="
                                padding:8px;
                                border:1px solid #d1d5db;
                                text-align:left;
                            "
                        >
                            Paid To
                        </th>

                        <th
                            style="
                                padding:8px;
                                border:1px solid #d1d5db;
                                text-align:right;
                            "
                        >
                            Amount
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${
                        paymentRows ||
                        `
                        <tr>
                            <td
                                colspan="4"
                                style="
                                    padding:12px;
                                    border:1px solid #d1d5db;
                                "
                            >
                                No payments linked to ${escapeHtml(
                                    r.req_no
                                )}.
                            </td>
                        </tr>
                        `
                    }

                </tbody>

            </table>

            <div
                style="
                    margin-top:20px;
                    padding-top:14px;
                    border-top:1px solid #d1d5db;
                    font-size:11px;
                    color:#64748b;
                "
            >
                Only petty cash records with the exact requisition
                number <strong>${escapeHtml(
                    normalizeReqNo(r.req_no)
                )}</strong> are included in Received.
            </div>

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

/* =========================================================
   PRINT SELECTED REQUISITION
   ========================================================= */

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

    const financial =
        getRequisitionFinancials(
            r
        );

    const paymentRows =
        financial.payments.map(
            p => `

                <tr>

                    <td>
                        ${escapeHtml(
                            p.cash_date || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            p.description || "-"
                        )}
                    </td>

                    <td>
                        ${money(
                            p.amount
                        )}
                    </td>

                </tr>

            `
        ).join("");

    printHtml(
        "Requisition " +
        r.req_no,
        `

            <div class="header">

                <h1>
                    Garage Operations Pro
                </h1>

                <h2>
                    Requisition ${escapeHtml(
                        r.req_no
                    )}
                </h2>

            </div>

            <table>

                <tr>
                    <th>Requisition No.</th>
                    <td>
                        ${escapeHtml(
                            r.req_no
                        )}
                    </td>
                </tr>

                <tr>
                    <th>Date</th>
                    <td>
                        ${escapeHtml(
                            r.req_date
                        )}
                    </td>
                </tr>

                <tr>
                    <th>Requested By</th>
                    <td>
                        ${escapeHtml(
                            r.requested_by
                        )}
                    </td>
                </tr>

                <tr>
                    <th>Vehicle</th>
                    <td>
                        ${escapeHtml(
                            vehicleName(
                                r.vehicle_id
                            )
                        )}
                    </td>
                </tr>

                <tr>
                    <th>Item</th>
                    <td>
                        ${escapeHtml(
                            r.item_description
                        )}
                    </td>
                </tr>

            </table>

            <h3>
                Financial Summary
            </h3>

            <table>

                <tr>
                    <th>Requested</th>
                    <td>
                        ${money(
                            financial.requested
                        )}
                    </td>
                </tr>

                <tr>
                    <th>Received</th>
                    <td>
                        ${money(
                            financial.received
                        )}
                    </td>
                </tr>

                <tr>
                    <th>Balance</th>
                    <td>
                        ${money(
                            financial.balance
                        )}
                    </td>
                </tr>

            </table>

            <h3>
                Linked Payments
            </h3>

            <table>

                <thead>

                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>

                </thead>

                <tbody>

                    ${
                        paymentRows ||
                        `
                        <tr>
                            <td colspan="3">
                                No payments linked to ${escapeHtml(
                                    r.req_no
                                )}.
                            </td>
                        </tr>
                        `
                    }

                </tbody>

            </table>

        `
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
                        p.req_no || "-"
                    )}
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
                        <th>Requisition</th>
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
        requisitions.map(r => {

            const financial =
                getRequisitionFinancials(
                    r
                );

            return `

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
                            financial.requested
                        )}
                    </td>

                    <td>
                        ${money(
                            financial.received
                        )}
                    </td>

                    <td>
                        ${money(
                            financial.balance
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            r.status || ""
                        )}
                    </td>

                </tr>

            `;
        }).join("");

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
                        <th>Requested</th>
                        <th>Received</th>
                        <th>Balance</th>
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
Requisition: ${p.req_no || "Not linked"}
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

    const financial =
        getRequisitionFinancials(
            r
        );

    shareText(
        "Requisition " +
        r.req_no,

        `
GARAGE OPERATIONS PRO

Requisition: ${r.req_no}
Date: ${r.req_date}
Requested By: ${r.requested_by}
Vehicle: ${vehicleName(
    r.vehicle_id
)}
Item: ${r.item_description}

Requested: ${money(
    financial.requested
)}

Received for ${r.req_no}: ${money(
    financial.received
)}

Balance for ${r.req_no}: ${money(
    financial.balance
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

    ensurePettyRequisitionField();

    setTimeout(
        setupDashboardCards,
        100
    );
}

startApp();
