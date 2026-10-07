import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO - COMPLETE app.js
   ========================================================= */

const SUPABASE_URL = "https://ptluwoeogfkqavhspdjj.supabase.co";
const SUPABASE_KEY = "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];
let invoices = [];
let gatePasses = [];
let estimates = [];
let estimateItems = [];
let currentPreview = null;

const $ = id => document.getElementById(id);
const n = v => Number(v) || 0;
const money = v => `KSh ${n(v).toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const today = () => new Date().toISOString().slice(0,10);

function esc(v){
  return String(v ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function norm(v){
  return String(v || "").toUpperCase().replace(/[\s-]/g,"");
}

function findVehicle(id){
  return vehicles.find(v => String(v.id) === String(id));
}

function vehicleName(id){
  const v = findVehicle(id);
  return v ? `${v.registration}${v.customer ? " — "+v.customer : ""}` : "Unassigned";
}

function storageDays(v){
  if(!v?.date_in) return 0;
  const start = new Date(v.date_in+"T00:00:00");
  const end = v.date_out ? new Date(v.date_out+"T00:00:00") : new Date();
  return Math.max(0,Math.floor((end-start)/86400000));
}

function toast(msg){
  const t=$("toast");
  if(!t) return;
  t.textContent=msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2500);
}

function openModal(id){
  const x=$(id);
  if(x) x.style.display="flex";
}

function closeModal(id){
  const x=$(id);
  if(x) x.style.display="none";
}

function statusClass(s){
  return String(s||"").toLowerCase().replace(/\s+/g,"-");
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function showSection(section){
  document.querySelectorAll(".section,.page-section").forEach(x=>{
    x.style.display="none";
  });

  const x=$(section);
  if(x) x.style.display="block";

  document.querySelectorAll("[data-section]").forEach(b=>{
    b.classList.toggle("active",b.dataset.section===section);
  });

  if(section==="dashboard") renderDashboard();
  if(section==="vehicles") renderVehicles();
  if(section==="expenses") renderExpenses();
  if(section==="petty-cash") renderPetty();
  if(section==="requisitions") renderRequisitions();
  if(section==="invoices") renderInvoices();
  if(section==="gate-passes") renderGatePasses();
  if(section==="estimates") renderEstimates();
}

/* =========================================================
   LOGIN
   ========================================================= */

function setupLogin(){
  const form=$("loginForm");
  if(!form) return;

  form.addEventListener("submit",e=>{
    e.preventDefault();

    const user=($("username")?.value||"").trim().toLowerCase();
    const pass=$("password")?.value||"";

    if(["josephine","boss","staff"].includes(user) && pass==="1234"){
      sessionStorage.setItem("garageLoggedIn","1");
      sessionStorage.setItem("garageUser",user);
      $("loginPage").style.display="none";
      $("app").style.display="block";
      setupUser();
      loadAllData();
    }else{
      if($("loginMsg")) $("loginMsg").textContent="Invalid username or password";
    }
  });

  $("logout")?.addEventListener("click",()=>{
    sessionStorage.clear();
    location.reload();
  });
}

function setupUser(){
  const user=sessionStorage.getItem("garageUser")||"josephine";
  if($("sidebarUser")) $("sidebarUser").textContent=user;
  if($("welcomeUser")) $("welcomeUser").textContent=user;
}

/* =========================================================
   SUPABASE LOAD
   ========================================================= */

async function getRows(table){
  try{
    const {data,error}=await db.from(table).select("*").order("created_at",{ascending:false});
    if(error) throw error;
    return data||[];
  }catch(e){
    console.warn(table,e.message);
    return [];
  }
}

async function loadAllData(){
  toast("Loading data...");

  [vehicles,expenses,pettyCash,requisitions,invoices,gatePasses,estimates]=
    await Promise.all([
      getRows("vehicles"),
      getRows("expenses"),
      getRows("petty_cash"),
      getRows("requisitions"),
      getRows("invoices"),
      getRows("gate_passes"),
      getRows("estimates")
    ]);

  renderAll();
}

function renderAll(){
  fillAllVehicleSelects();
  renderDashboard();
  renderVehicles();
  renderExpenses();
  renderPetty();
  renderRequisitions();
  renderInvoices();
  renderGatePasses();
  renderEstimates();
}

/* =========================================================
   VEHICLE SELECTS
   ========================================================= */

function fillSelect(id,selected=""){
  const s=$(id);
  if(!s) return;

  s.innerHTML=`<option value="">Select vehicle</option>`+
    vehicles.map(v=>
      `<option value="${esc(v.id)}" ${String(v.id)===String(selected)?"selected":""}>
        ${esc(v.registration)}${v.customer?" — "+esc(v.customer):""}
      </option>`
    ).join("");
}

function fillAllVehicleSelects(){
  ["expenseVehicle","reqVehicle","invoiceVehicle","gateVehicle","estimateVehicle"]
    .forEach(id=>fillSelect(id,$(id)?.value||""));
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard(){
  const repair=vehicles.filter(v=>v.status==="Under Repair").length;
  const outstanding=vehicles.reduce((a,v)=>a+n(v.billed)-n(v.paid),0);
  const billed=vehicles.reduce((a,v)=>a+n(v.billed),0);
  const paid=vehicles.reduce((a,v)=>a+n(v.paid),0);
  const exp=expenses.reduce((a,x)=>a+n(x.amount),0);
  const petty=pettyCash.reduce((a,x)=>a+n(x.amount),0);
  const reqTotal=requisitions.reduce((a,x)=>a+n(x.total_amount),0);
  const pendingReq=requisitions.filter(x=>x.status==="Pending").length;

  const vals={
    dashVehicles:vehicles.length,
    dashRepair:repair,
    dashOutstanding:money(outstanding),
    dashReq:pendingReq,
    dashInvoices:invoices.length,
    dashGatePasses:gatePasses.length,
    dashBilled:money(billed),
    dashPaid:money(paid),
    dashExpenses:money(exp),
    dashPetty:money(petty),
    dashReqCount:pendingReq,
    dashReqTotal:money(reqTotal)
  };

  Object.entries(vals).forEach(([id,v])=>{
    if($(id)) $(id).textContent=v;
  });

  if($("vehicleStatusSummary")){
    const counts={Storage:0,"Under Repair":0,Completed:0,Released:0};
    vehicles.forEach(v=>{if(counts[v.status]!==undefined) counts[v.status]++});
    $("vehicleStatusSummary").innerHTML=Object.entries(counts)
      .map(([k,v])=>`<div><b>${v}</b> ${esc(k)}</div>`).join("");
  }

  if($("dashboardActivity")){
    const rows=[
      ...vehicles.map(v=>({date:v.created_at||v.date_in,text:`Vehicle ${v.registration} added`})),
      ...expenses.map(x=>({date:x.created_at||x.expense_date,text:`Expense: ${x.description}`})),
      ...requisitions.map(x=>({date:x.created_at||x.req_date,text:`Requisition ${x.req_no}`}))
    ].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8);

    $("dashboardActivity").innerHTML=rows.length
      ? rows.map(x=>`<div class="activity-row"><b>${esc(x.text)}</b><small>${esc(x.date||"")}</small></div>`).join("")
      : "<p>No recent activity</p>";
  }
}

function setupDashboardCards(){
  const map={
    dashVehicles:"vehicles",
    dashRepair:"vehicles",
    dashOutstanding:"vehicles",
    dashReq:"requisitions",
    dashInvoices:"invoices",
    dashGatePasses:"gate-passes",
    dashBilled:"vehicles",
    dashPaid:"vehicles",
    dashExpenses:"expenses",
    dashPetty:"petty-cash",
    dashEstimates:"estimates"
  };

  Object.entries(map).forEach(([id,section])=>{
    const el=$(id);
    if(!el) return;

    const card=el.closest(".stat-card,.dashboard-card,.card")||el;
    card.style.cursor="pointer";
    card.addEventListener("click",()=>showSection(section));
  });
}

/* =========================================================
   VEHICLES
   ========================================================= */

function renderVehicles(){
  const body=$("vehiclesTableBody");
  if(!body) return;

  const q=norm($("vehicleSearch")?.value);
  const st=$("vehicleStatusFilter")?.value||"";

  let rows=vehicles.filter(v=>{
    const matchQ=!q ||
      norm(v.registration).includes(q) ||
      String(v.customer||"").toUpperCase().includes(q) ||
      String(v.model||"").toUpperCase().includes(q);

    return matchQ && (!st||v.status===st);
  });

  body.innerHTML=rows.length?rows.map(v=>`
    <tr>
      <td><b>${esc(v.registration)}</b></td>
      <td>${esc(v.customer)}</td>
      <td>${esc(v.model||"")}</td>
      <td>${esc(v.job_type||"")}</td>
      <td><span class="status ${statusClass(v.status)}">${esc(v.status)}</span></td>
      <td>${v.date_in||""}</td>
      <td>${v.date_out||""}</td>
      <td>${storageDays(v)}</td>
      <td>${money(v.billed)}</td>
      <td>${money(v.paid)}</td>
      <td>
        <div class="action-row">
          <button onclick="editVehicle('${v.id}')">Edit</button>
          <button onclick="viewVehicleExpenses('${v.id}')">Expenses</button>
          <button onclick="deleteVehicle('${v.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join(""):`<tr><td colspan="11">No vehicles found</td></tr>`;
}

function openVehicleModal(id=""){
  $("vehicleForm")?.reset();
  if($("vehicleId")) $("vehicleId").value="";
  if($("vehicleDateIn")) $("vehicleDateIn").value=today();
  if($("vehicleModalTitle")) $("vehicleModalTitle").textContent="Add Vehicle";

  if(id){
    const v=findVehicle(id);
    if(!v) return;

    $("vehicleId").value=v.id;
    $("vehicleRegistration").value=v.registration||"";
    $("vehicleCustomer").value=v.customer||"";
    $("vehicleModel").value=v.model||"";
    $("vehicleModelYear").value=v.model_year||"";
    $("vehicleColor").value=v.color||"";
    $("vehicleDateIn").value=v.date_in||"";
    $("vehicleDateOut").value=v.date_out||"";
    $("vehicleJobType").value=v.job_type||"Repair";
    $("vehicleStatus").value=v.status||"Under Repair";
    $("vehicleReleasedTo").value=v.released_to||"";
    $("vehicleReleasedContact").value=v.released_contact||"";
    $("vehicleBilled").value=v.billed||0;
    $("vehiclePaid").value=v.paid||0;
    $("vehicleDescription").value=v.description||"";
    if($("vehicleStorageDays")) $("vehicleStorageDays").value=storageDays(v);
    if($("vehicleModalTitle")) $("vehicleModalTitle").textContent="Edit Vehicle";
  }

  openModal("vehicleModal");
}

function editVehicle(id){openVehicleModal(id)}

async function saveVehicle(e){
  e.preventDefault();

  const id=$("vehicleId")?.value||"";
  const registration=($("vehicleRegistration")?.value||"").trim().toUpperCase();

  if(!registration){
    toast("Registration is required");
    return;
  }

  const duplicate=vehicles.find(v=>
    norm(v.registration)===norm(registration) &&
    String(v.id)!==String(id)
  );

  if(duplicate){
    toast("Vehicle registration already exists");
    return;
  }

  const record={
    registration,
    customer:($("vehicleCustomer")?.value||"").trim(),
    date_in:$("vehicleDateIn")?.value||today(),
    date_out:$("vehicleDateOut")?.value||null,
    job_type:$("vehicleJobType")?.value||"Repair",
    status:$("vehicleStatus")?.value||"Under Repair",
    released_to:$("vehicleReleasedTo")?.value||null,
    released_contact:$("vehicleReleasedContact")?.value||null,
    description:$("vehicleDescription")?.value||null,
    billed:n($("vehicleBilled")?.value),
    paid:n($("vehiclePaid")?.value),
    model:$("vehicleModel")?.value||null,
    model_year:$("vehicleModelYear")?.value||null,
    color:$("vehicleColor")?.value||null
  };

  const result=id
    ? await db.from("vehicles").update(record).eq("id",id).select().single()
    : await db.from("vehicles").insert(record).select().single();

  if(result.error){
    toast(result.error.message);
    return;
  }

  closeModal("vehicleModal");
  await loadAllData();
  toast("Vehicle saved");
}

async function deleteVehicle(id){
  const v=findVehicle(id);
  if(!v||!confirm(`Delete ${v.registration}?`)) return;

  const {error}=await db.from("vehicles").delete().eq("id",id);
  if(error){toast(error.message);return}

  await loadAllData();
  toast("Vehicle deleted");
}

function printVehicles(){
  const rows=vehicles.map(v=>`
    <tr>
      <td>${esc(v.registration)}</td><td>${esc(v.customer)}</td>
      <td>${esc(v.model||"")}</td><td>${esc(v.status)}</td>
      <td>${v.date_in||""}</td><td>${storageDays(v)}</td>
      <td>${money(v.billed)}</td><td>${money(v.paid)}</td>
    </tr>`).join("");

  printHTML("Vehicle Report",`
    <h1>Vehicle Report</h1>
    <table><thead><tr>
      <th>Registration</th><th>Customer</th><th>Model</th><th>Status</th>
      <th>Date In</th><th>Storage Days</th><th>Billed</th><th>Paid</th>
    </tr></thead><tbody>${rows}</tbody></table>
  `);
}

/* =========================================================
   EXPENSES
   ========================================================= */

function filteredExpenses(){
  const q=($("expenseSearch")?.value||"").trim();
  const cat=$("expenseCategoryFilter")?.value||"";

  if(q){
    const v=vehicles.find(x=>norm(x.registration)===norm(q));

    if(v){
      return expenses.filter(x=>String(x.vehicle_id)===String(v.id) &&
        (!cat||x.category===cat));
    }
  }

  const qq=q.toLowerCase();

  return expenses.filter(x=>{
    const v=findVehicle(x.vehicle_id);
    const text=[
      x.description,x.category,
      v?.registration,v?.customer
    ].join(" ").toLowerCase();

    return (!qq||text.includes(qq)) &&
           (!cat||x.category===cat);
  });
}

function renderExpenses(){
  const body=$("expensesTableBody");
  if(!body) return;

  const rows=filteredExpenses();

  body.innerHTML=rows.length?rows.map(x=>{
    const v=findVehicle(x.vehicle_id);
    return `<tr>
      <td>${x.expense_date||""}</td>
      <td>${v?esc(v.registration):"Unassigned"}</td>
      <td>${esc(x.description)}</td>
      <td>${esc(x.category)}</td>
      <td>${money(x.amount)}</td>
      <td>
        <button onclick="editExpense('${x.id}')">Edit</button>
        <button onclick="deleteExpense('${x.id}')">Delete</button>
      </td>
    </tr>`;
  }).join(""):`<tr><td colspan="6">No expenses found</td></tr>`;
}

function openExpenseModal(id=""){
  $("expenseForm")?.reset();
  $("expenseId").value="";
  $("expenseDate").value=today();
  fillSelect("expenseVehicle");

  if($("expenseModalTitle")) $("expenseModalTitle").textContent="Add Expense";

  if(id){
    const x=expenses.find(a=>String(a.id)===String(id));
    if(!x)return;

    $("expenseId").value=x.id;
    $("expenseVehicle").value=x.vehicle_id||"";
    $("expenseDate").value=x.expense_date||today();
    $("expenseCategory").value=x.category||"Parts";
    $("expenseAmount").value=x.amount||0;
    $("expenseDescription").value=x.description||"";

    if($("expenseModalTitle")) $("expenseModalTitle").textContent="Edit Expense";
  }

  openModal("expenseModal");
}

function editExpense(id){openExpenseModal(id)}

async function saveExpense(e){
  e.preventDefault();

  const id=$("expenseId").value;
  const record={
    vehicle_id:$("expenseVehicle").value||null,
    expense_date:$("expenseDate").value||today(),
    category:$("expenseCategory").value||"Parts",
    amount:n($("expenseAmount").value),
    description:$("expenseDescription").value.trim()
  };

  if(!record.description){
    toast("Description is required");
    return;
  }

  const r=id
    ? await db.from("expenses").update(record).eq("id",id)
    : await db.from("expenses").insert(record);

  if(r.error){toast(r.error.message);return}

  closeModal("expenseModal");
  await loadAllData();
  toast("Expense saved");
}

async function deleteExpense(id){
  if(!confirm("Delete this expense?"))return;

  const {error}=await db.from("expenses").delete().eq("id",id);
  if(error){toast(error.message);return}

  await loadAllData();
}

function printExpenses(){
  const rows=filteredExpenses();
  printHTML("Expense Report",`
    <h1>Expense Report</h1>
    <table><thead><tr>
      <th>Date</th><th>Vehicle</th><th>Description</th>
      <th>Category</th><th>Amount</th>
    </tr></thead><tbody>
    ${rows.map(x=>`<tr>
      <td>${x.expense_date||""}</td>
      <td>${esc(vehicleName(x.vehicle_id))}</td>
      <td>${esc(x.description)}</td>
      <td>${esc(x.category)}</td>
      <td>${money(x.amount)}</td>
    </tr>`).join("")}
    </tbody></table>
    <h3>Total: ${money(rows.reduce((a,x)=>a+n(x.amount),0))}</h3>
  `);
}

/* =========================================================
   VEHICLE-SPECIFIC EXPENSE REPORT
   ========================================================= */

function vehicleExpenseRows(id){
  return expenses.filter(x=>String(x.vehicle_id)===String(id));
}

function vehicleExpenseReport(id){
  const v=findVehicle(id);
  if(!v)return;

  const rows=vehicleExpenseRows(id);
  const total=rows.reduce((a,x)=>a+n(x.amount),0);

  return `
    <div class="company-head">
      <h1>CRYSTAL MOTORS (K) LTD</h1>
      <p>P.O. Box 54385 – 00200, Nairobi</p>
      <p>0722 707124 | 0723 914 222</p>
      <p>Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge</p>
    </div>

    <h2>VEHICLE EXPENSE REPORT</h2>
    <p><b>Registration:</b> ${esc(v.registration)}</p>
    <p><b>Customer:</b> ${esc(v.customer)}</p>

    <table><thead><tr>
      <th>Date</th><th>Description</th><th>Category</th><th>Amount</th>
    </tr></thead><tbody>
      ${rows.length?rows.map(x=>`<tr>
        <td>${x.expense_date||""}</td>
        <td>${esc(x.description)}</td>
        <td>${esc(x.category)}</td>
        <td>${money(x.amount)}</td>
      </tr>`).join(""):`<tr><td colspan="4">No expenses for this vehicle</td></tr>`}
    </tbody></table>

    <h3>Total Vehicle Expenses: ${money(total)}</h3>
  `;
}

function viewVehicleExpenses(id){
  const v=findVehicle(id);
  if(!v)return;

  const html=vehicleExpenseReport(id);

  if($("vehicleExpensePreviewContent")){
    $("vehicleExpensePreviewContent").innerHTML=
      html+
      `<div class="action-row">
        <button onclick="printVehicleExpensePreview('${id}')">Print</button>
        <button onclick="shareVehicleExpenses('${id}')">Share</button>
      </div>`;
  }

  openModal("vehicleExpensePreviewModal");
}

function printVehicleExpensePreview(id){
  const v=findVehicle(id);
  if(v) printHTML(`Expenses - ${v.registration}`,vehicleExpenseReport(id));
}

async function shareVehicleExpenses(id){
  const v=findVehicle(id);
  if(!v)return;

  const rows=vehicleExpenseRows(id);
  const total=rows.reduce((a,x)=>a+n(x.amount),0);

  const text=[
    "CRYSTAL MOTORS (K) LTD",
    "VEHICLE EXPENSE REPORT",
    `Registration: ${v.registration}`,
    `Customer: ${v.customer}`,
    "",
    ...rows.map(x=>`${x.expense_date||""} | ${x.description} | ${x.category} | ${money(x.amount)}`),
    "",
    `TOTAL: ${money(total)}`
  ].join("\n");

  shareText(`Vehicle Expenses - ${v.registration}`,text);
}

/* =========================================================
   PETTY CASH
   ========================================================= */

function renderPetty(){
  const body=$("pettyTableBody");
  if(!body)return;

  const q=($("pettySearch")?.value||"").toLowerCase();
  const cat=$("pettyCategoryFilter")?.value||"";

  const rows=pettyCash.filter(x=>{
    const text=[x.description,x.paid_to,x.category,x.notes].join(" ").toLowerCase();
    return (!q||text.includes(q))&&(!cat||x.category===cat);
  });

  body.innerHTML=rows.length?rows.map(x=>`
    <tr>
      <td>${x.cash_date||""}</td>
      <td>${esc(x.paid_to||"")}</td>
      <td>${esc(x.description)}</td>
      <td>${esc(x.category||"")}</td>
      <td>${money(x.amount)}</td>
      <td>
        <button onclick="editPetty('${x.id}')">Edit</button>
        <button onclick="deletePetty('${x.id}')">Delete</button>
      </td>
    </tr>
  `).join(""):`<tr><td colspan="6">No petty cash records</td></tr>`;
}

function openPettyModal(id=""){
  $("pettyForm")?.reset();
  $("pettyId").value="";
  $("pettyDate").value=today();

  if($("pettyModalTitle"))$("pettyModalTitle").textContent="Add Petty Cash";

  if(id){
    const x=pettyCash.find(a=>String(a.id)===String(id));
    if(!x)return;

    $("pettyId").value=x.id;
    $("pettyDate").value=x.cash_date||today();
    $("pettyPaidTo").value=x.paid_to||"";
    $("pettyCategory").value=x.category||"";
    $("pettyAmount").value=x.amount||0;
    $("pettyDescription").value=x.description||"";
    $("pettyNotes").value=x.notes||"";

    if($("pettyModalTitle"))$("pettyModalTitle").textContent="Edit Petty Cash";
  }

  openModal("pettyModal");
}

function editPetty(id){openPettyModal(id)}

async function savePetty(e){
  e.preventDefault();

  const id=$("pettyId").value;

  const record={
    cash_date:$("pettyDate").value||today(),
    paid_to:$("pettyPaidTo").value||null,
    category:$("pettyCategory").value||null,
    amount:n($("pettyAmount").value),
    description:$("pettyDescription").value.trim(),
    notes:$("pettyNotes").value||null
  };

  if(!record.description){
    toast("Description is required");
    return;
  }

  const r=id
    ? await db.from("petty_cash").update(record).eq("id",id)
    : await db.from("petty_cash").insert(record);

  if(r.error){toast(r.error.message);return}

  closeModal("pettyModal");
  await loadAllData();
}

async function deletePetty(id){
  if(!confirm("Delete petty cash record?"))return;

  const {error}=await db.from("petty_cash").delete().eq("id",id);
  if(error){toast(error.message);return}

  await loadAllData();
}

function printPettyCash(){
  printHTML("Petty Cash Report",`
    <h1>Petty Cash Report</h1>
    <table><thead><tr>
      <th>Date</th><th>Paid To</th><th>Description</th>
      <th>Category</th><th>Amount</th>
    </tr></thead><tbody>
    ${pettyCash.map(x=>`<tr>
      <td>${x.cash_date||""}</td>
      <td>${esc(x.paid_to||"")}</td>
      <td>${esc(x.description)}</td>
      <td>${esc(x.category||"")}</td>
      <td>${money(x.amount)}</td>
    </tr>`).join("")}
    </tbody></table>
  `);
}

/* =========================================================
   REQUISITIONS
   ========================================================= */

function renderRequisitions(){
  const body=$("requisitionsTableBody");
  if(!body)return;

  const q=($("reqSearch")?.value||"").toLowerCase();
  const st=$("reqStatusFilter")?.value||"";

  const rows=requisitions.filter(x=>{
    const text=[
      x.req_no,x.requested_by,x.item_description,
      vehicleName(x.vehicle_id),x.status
    ].join(" ").toLowerCase();

    return (!q||text.includes(q))&&(!st||x.status===st);
  });

  body.innerHTML=rows.length?rows.map(x=>`
    <tr>
      <td>${esc(x.req_no)}</td>
      <td>${x.req_date||""}</td>
      <td>${esc(x.requested_by)}</td>
      <td>${esc(vehicleName(x.vehicle_id))}</td>
      <td>${esc(x.item_description)}</td>
      <td>${n(x.quantity)}</td>
      <td>${money(x.unit_cost)}</td>
      <td>${money(x.total_amount)}</td>
      <td>${esc(x.status)}</td>
      <td>
        <button onclick="editReq('${x.id}')">Edit</button>
        <button onclick="deleteReq('${x.id}')">Delete</button>
      </td>
    </tr>
  `).join(""):`<tr><td colspan="10">No requisitions</td></tr>`;

  if($("reqOverallTotal")){
    $("reqOverallTotal").textContent=money(
      rows.reduce((a,x)=>a+n(x.total_amount),0)
    );
  }
}

function calcReq(){
  if($("reqTotal")){
    $("reqTotal").value=
      (n($("reqQuantity")?.value)*n($("reqUnitCost")?.value)).toFixed(2);
  }
}

function openReqModal(id=""){
  $("reqForm")?.reset();
  $("reqId").value="";
  $("reqDate").value=today();
  fillSelect("reqVehicle");

  if($("reqModalTitle"))$("reqModalTitle").textContent="New Requisition";

  if(id){
    const x=requisitions.find(a=>String(a.id)===String(id));
    if(!x)return;

    $("reqId").value=x.id;
    $("reqNo").value=x.req_no||"";
    $("reqDate").value=x.req_date||today();
    $("reqRequestedBy").value=x.requested_by||"";
    $("reqVehicle").value=x.vehicle_id||"";
    $("reqItemDescription").value=x.item_description||"";
    $("reqQuantity").value=x.quantity||1;
    $("reqUnitCost").value=x.unit_cost||0;
    $("reqTotal").value=x.total_amount||0;
    $("reqStatus").value=x.status||"Pending";
    if($("reqCategory"))$("reqCategory").value=x.expense_type||"Materials";
    if($("reqExpenseType"))$("reqExpenseType").value=x.expense_type||"Materials";
    $("reqNotes").value=x.notes||"";

    if($("reqModalTitle"))$("reqModalTitle").textContent="Edit Requisition";
  }

  openModal("reqModal");
}

function editReq(id){openReqModal(id)}

async function saveReq(e){
  e.preventDefault();

  const id=$("reqId").value;
  const qty=n($("reqQuantity").value);
  const cost=n($("reqUnitCost").value);

  const record={
    req_no:$("reqNo").value.trim(),
    req_date:$("reqDate").value||today(),
    requested_by:$("reqRequestedBy").value.trim(),
    vehicle_id:$("reqVehicle").value||null,
    item_description:$("reqItemDescription").value.trim(),
    quantity:qty,
    unit_cost:cost,
    total_amount:qty*cost,
    status:$("reqStatus").value||"Pending",
    notes:$("reqNotes").value||null,
    expense_type:$("reqExpenseType")?.value||
                 $("reqCategory")?.value||"Materials"
  };

  if(!record.req_no||!record.requested_by||!record.item_description){
    toast("Complete the required fields");
    return;
  }

  const r=id
    ? await db.from("requisitions").update(record).eq("id",id)
    : await db.from("requisitions").insert(record);

  if(r.error){toast(r.error.message);return}

  closeModal("reqModal");
  await loadAllData();
}

async function deleteReq(id){
  if(!confirm("Delete requisition?"))return;

  const {error}=await db.from("requisitions").delete().eq("id",id);
  if(error){toast(error.message);return}

  await loadAllData();
}

function printRequisitions(){
  printHTML("Requisitions",`
    <h1>Requisitions</h1>
    <table><thead><tr>
      <th>No.</th><th>Date</th><th>Requested By</th>
      <th>Vehicle</th><th>Item</th><th>Qty</th><th>Total</th><th>Status</th>
    </tr></thead><tbody>
    ${requisitions.map(x=>`<tr>
      <td>${esc(x.req_no)}</td><td>${x.req_date||""}</td>
      <td>${esc(x.requested_by)}</td><td>${esc(vehicleName(x.vehicle_id))}</td>
      <td>${esc(x.item_description)}</td><td>${x.quantity}</td>
      <td>${money(x.total_amount)}</td><td>${esc(x.status)}</td>
    </tr>`).join("")}
    </tbody></table>
  `);
}

/* =========================================================
   INVOICES
   ========================================================= */

function invoiceTotal(x){
  return n(x.labour)+n(x.parts)+n(x.other);
}

function renderInvoices(){
  const body=$("invoicesTableBody");
  if(!body)return;

  const q=($("invoiceSearch")?.value||"").toLowerCase();
  const st=$("invoiceStatusFilter")?.value||"";

  const rows=invoices.filter(x=>{
    const text=[
      x.invoice_no,x.customer,x.job_description,
      vehicleName(x.vehicle_id),x.status
    ].join(" ").toLowerCase();

    return (!q||text.includes(q))&&(!st||x.status===st);
  });

  body.innerHTML=rows.length?rows.map(x=>`
    <tr>
      <td>${esc(x.invoice_no)}</td>
      <td>${x.invoice_date||""}</td>
      <td>${esc(vehicleName(x.vehicle_id))}</td>
      <td>${esc(x.customer||"")}</td>
      <td>${money(x.subtotal)}</td>
      <td>${money(x.paid)}</td>
      <td>${money(x.balance)}</td>
      <td>${esc(x.status||"")}</td>
      <td>
        <button onclick="editInvoice('${x.id}')">Edit</button>
        <button onclick="deleteInvoice('${x.id}')">Delete</button>
      </td>
    </tr>
  `).join(""):`<tr><td colspan="9">No invoices</td></tr>`;
}

function calcInvoice(){
  const total=n($("invoiceLabour")?.value)+
              n($("invoiceParts")?.value)+
              n($("invoiceOther")?.value);

  if($("invoiceSubtotal"))$("invoiceSubtotal").value=total.toFixed(2);

  const paid=n($("invoicePaid")?.value);

  if($("invoiceBalance"))
    $("invoiceBalance").value=(total-paid).toFixed(2);
}

function openInvoiceModal(id=""){
  $("invoiceForm")?.reset();
  $("invoiceId").value="";
  $("invoiceDate").value=today();
  fillSelect("invoiceVehicle");

  if($("invoiceModalTitle"))$("invoiceModalTitle").textContent="New Invoice";

  if(id){
    const x=invoices.find(a=>String(a.id)===String(id));
    if(!x)return;

    Object.entries({
      invoiceId:x.id,
      invoiceNo:x.invoice_no,
      invoiceDate:x.invoice_date,
      invoiceVehicle:x.vehicle_id,
      invoiceCustomer:x.customer,
      invoiceJobDescription:x.job_description,
      invoiceLabour:x.labour,
      invoiceParts:x.parts,
      invoiceOther:x.other,
      invoiceSubtotal:x.subtotal,
      invoicePaid:x.paid,
      invoiceBalance:x.balance,
      invoiceStatus:x.status,
      invoiceNotes:x.notes
    }).forEach(([k,v])=>{if($(k))$(k).value=v??""});

    if($("invoiceModalTitle"))$("invoiceModalTitle").textContent="Edit Invoice";
  }

  openModal("invoiceModal");
}

function editInvoice(id){openInvoiceModal(id)}

async function saveInvoice(e){
  e.preventDefault();

  const subtotal=
    n($("invoiceLabour").value)+
    n($("invoiceParts").value)+
    n($("invoiceOther").value);

  const paid=n($("invoicePaid").value);

  const record={
    invoice_no:$("invoiceNo").value.trim(),
    invoice_date:$("invoiceDate").value||today(),
    vehicle_id:$("invoiceVehicle").value||null,
    customer:$("invoiceCustomer").value||"",
    job_description:$("invoiceJobDescription").value||"",
    labour:n($("invoiceLabour").value),
    parts:n($("invoiceParts").value),
    other:n($("invoiceOther").value),
    subtotal,
    paid,
    balance:subtotal-paid,
    status:$("invoiceStatus").value||"Pending",
    notes:$("invoiceNotes").value||null
  };

  const id=$("invoiceId").value;

  const r=id
    ? await db.from("invoices").update(record).eq("id",id)
    : await db.from("invoices").insert(record);

  if(r.error){
    toast(r.error.message.includes("does not exist")
      ?"Invoices table is not created in Supabase yet"
      :r.error.message);
    return;
  }

  closeModal("invoiceModal");
  await loadAllData();
}

async function deleteInvoice(id){
  if(!confirm("Delete invoice?"))return;

  const {error}=await db.from("invoices").delete().eq("id",id);
  if(error){toast(error.message);return}

  await loadAllData();
}

function printInvoices(){
  printHTML("Invoices",`
    <h1>Invoices</h1>
    <table><thead><tr>
      <th>Invoice</th><th>Date</th><th>Vehicle</th>
      <th>Customer</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th>
    </tr></thead><tbody>
    ${invoices.map(x=>`<tr>
      <td>${esc(x.invoice_no)}</td><td>${x.invoice_date||""}</td>
      <td>${esc(vehicleName(x.vehicle_id))}</td><td>${esc(x.customer||"")}</td>
      <td>${money(x.subtotal)}</td><td>${money(x.paid)}</td>
      <td>${money(x.balance)}</td><td>${esc(x.status||"")}</td>
    </tr>`).join("")}
    </tbody></table>
  `);
}

/* =========================================================
   GATE PASSES
   ========================================================= */

function renderGatePasses(){
  const body=$("gatePassesTableBody");
  if(!body)return;

  const q=($("gateSearch")?.value||"").toLowerCase();
  const st=$("gateStatusFilter")?.value||"";

  const rows=gatePasses.filter(x=>{
    const text=[
      x.gate_pass_no,x.registration,x.customer,
      x.released_to,x.status,vehicleName(x.vehicle_id)
    ].join(" ").toLowerCase();

    return (!q||text.includes(q))&&(!st||x.status===st);
  });

  body.innerHTML=rows.length?rows.map(x=>`
    <tr>
      <td>${esc(x.gate_pass_no)}</td>
      <td>${x.gate_pass_date||""}</td>
      <td>${esc(x.registration||vehicleName(x.vehicle_id))}</td>
      <td>${esc(x.customer||"")}</td>
      <td>${esc(x.released_to||"")}</td>
      <td>${money(x.balance)}</td>
      <td>${esc(x.status||"")}</td>
      <td>
        <button onclick="editGatePass('${x.id}')">Edit</button>
        <button onclick="deleteGatePass('${x.id}')">Delete</button>
      </td>
    </tr>
  `).join(""):`<tr><td colspan="8">No gate passes</td></tr>`;
}

function calcGate(){
  const paid=n($("gatePaid")?.value);
  const inv=invoices.find(x=>String(x.id)===String($("gateInvoice")?.value));
  const total=inv?n(inv.subtotal):0;

  if($("gateBalance"))
    $("gateBalance").value=(total-paid).toFixed(2);
}

function openGatePassModal(id=""){
  $("gatePassForm")?.reset();
  $("gatePassId").value="";
  $("gatePassDate").value=today();
  fillSelect("gateVehicle");

  if($("gateModalTitle"))$("gatePassModalTitle").textContent="New Gate Pass";

  if(id){
    const x=gatePasses.find(a=>String(a.id)===String(id));
    if(!x)return;

    Object.entries({
      gatePassId:x.id,
      gatePassNo:x.gate_pass_no,
      gatePassDate:x.gate_pass_date,
      gateVehicle:x.vehicle_id,
      gateVehicleRegistration:x.registration,
      gateCustomer:x.customer,
      gateReleasedTo:x.released_to,
      gateReleasedContact:x.released_contact,
      gateInvoice:x.invoice_id,
      gatePaid:x.paid,
      gateBalance:x.balance,
      gateAuthorizedBy:x.authorized_by,
      gateStatus:x.status,
      gateNotes:x.notes
    }).forEach(([k,v])=>{if($(k))$(k).value=v??""});

    if($("gatePassModalTitle"))
      $("gatePassModalTitle").textContent="Edit Gate Pass";
  }

  openModal("gatePassModal");
}

function editGatePass(id){openGatePassModal(id)}

async function saveGatePass(e){
  e.preventDefault();

  const v=findVehicle($("gateVehicle").value);

  const record={
    gate_pass_no:$("gatePassNo").value.trim(),
    gate_pass_date:$("gatePassDate").value||today(),
    vehicle_id:$("gateVehicle").value||null,
    registration:$("gateVehicleRegistration").value||(v?.registration||""),
    customer:$("gateCustomer").value||(v?.customer||""),
    released_to:$("gateReleasedTo").value||null,
    released_contact:$("gateReleasedContact").value||null,
    invoice_id:$("gateInvoice").value||null,
    paid:n($("gatePaid").value),
    balance:n($("gateBalance").value),
    authorized_by:$("gateAuthorizedBy").value||null,
    status:$("gateStatus").value||"Pending",
    notes:$("gateNotes").value||null
  };

  const id=$("gatePassId").value;

  const r=id
    ? await db.from("gate_passes").update(record).eq("id",id)
    : await db.from("gate_passes").insert(record);

  if(r.error){
    toast(r.error.message.includes("does not exist")
      ?"Gate Passes table is not created in Supabase yet"
      :r.error.message);
    return;
  }

  closeModal("gatePassModal");
  await loadAllData();
}

async function deleteGatePass(id){
  if(!confirm("Delete gate pass?"))return;

  const {error}=await db.from("gate_passes").delete().eq("id",id);
  if(error){toast(error.message);return}

  await loadAllData();
}

function printGatePasses(){
  printHTML("Gate Passes",`
    <h1>Gate Passes</h1>
    <table><thead><tr>
      <th>No.</th><th>Date</th><th>Registration</th>
      <th>Customer</th><th>Released To</th><th>Balance</th><th>Status</th>
    </tr></thead><tbody>
    ${gatePasses.map(x=>`<tr>
      <td>${esc(x.gate_pass_no)}</td><td>${x.gate_pass_date||""}</td>
      <td>${esc(x.registration||"")}</td><td>${esc(x.customer||"")}</td>
      <td>${esc(x.released_to||"")}</td><td>${money(x.balance)}</td>
      <td>${esc(x.status||"")}</td>
    </tr>`).join("")}
    </tbody></table>
  `);
}

/* =========================================================
   ESTIMATES / QUOTATIONS
   ========================================================= */

const COMPANIES={
  crystal:{
    name:"CRYSTAL MOTORS (K) LTD",
    address:"P.O. Box 54385 – 00200, Nairobi",
    phone:"0722 707124 | 0723 914 222",
    location:"Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge"
  },
  quarry:{
    name:"QUARRY ROUTE MOTORS LTD",
    address:"P.O. Box 54385 – 00200, Nairobi",
    phone:"0722 707124 | 0723 914 222",
    location:"Off Mombasa Road, Along Quarry Road, Near Mlolongo Weigh Bridge",
    email:"info@quarryroutemotors.com | quarryroutemotorsltd@gmail.com"
  }
};

function nextEstimateNo(){
  const year=new Date().getFullYear();
  let max=0;

  estimates.forEach(x=>{
    const m=String(x.estimate_no||"").match(/(\d+)$/);
    if(m)max=Math.max(max,n(m[1]));
  });

  return `EST-${year}-${String(max+1).padStart(4,"0")}`;
}

function calculateEstimate(){
  let subtotal=0;

  estimateItems.forEach((x,i)=>{
    x.qty=n(x.qty);
    x.price=n(x.price);
    x.subtotal=x.qty*x.price;
    subtotal+=x.subtotal;

    const cell=document.querySelector(`[data-line-total="${i}"]`);
    if(cell)cell.textContent=money(x.subtotal);
  });

  const vat=subtotal*0.16;
  const total=subtotal+vat;

  if($("estimateSubtotal"))$("estimateSubtotal").textContent=money(subtotal);
  if($("estimateVat"))$("estimateVat").textContent=money(vat);
  if($("estimateTotal"))$("estimateTotal").textContent=money(total);

  return {subtotal,vat,total};
}

function renderEstimateItems(){
  const body=$("estimateItemsBody");
  if(!body)return;

  body.innerHTML=estimateItems.map((x,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>
        <input data-est-field="description" data-est-index="${i}"
          value="${esc(x.description)}">
      </td>
      <td>
        <input type="number" min="0" step="0.01"
          data-est-field="qty" data-est-index="${i}"
          value="${x.qty}">
      </td>
      <td>
        <input type="number" min="0" step="0.01"
          data-est-field="price" data-est-index="${i}"
          value="${x.price}">
      </td>
      <td data-line-total="${i}">${money(x.subtotal)}</td>
      <td><button type="button" onclick="removeEstimateItem(${i})">×</button></td>
    </tr>
  `).join("");

  calculateEstimate();
}

function addEstimateItem(){
  estimateItems.push({
    description:"",
    qty:1,
    price:0,
    subtotal:0
  });
  renderEstimateItems();
}

function removeEstimateItem(i){
  estimateItems.splice(i,1);
  if(!estimateItems.length)addEstimateItem();
  renderEstimateItems();
}

function setupEstimateInputs(){
  $("estimateItemsBody")?.addEventListener("input",e=>{
    const el=e.target;
    if(!el.dataset.estIndex)return;

    const i=n(el.dataset.estIndex);
    const field=el.dataset.estField;

    if(!estimateItems[i])return;

    estimateItems[i][field]=
      field==="description"?el.value:n(el.value);

    calculateEstimate();
  });
}

function clearEstimateForm(){
  $("estimateForm")?.reset();
  $("estimateId").value="";
  $("estimateDate").value=today();
  $("estimateNo").value=nextEstimateNo();

  if($("estimateCompany"))$("estimateCompany").value="crystal";

  estimateItems=[];
  addEstimateItem();
}

function openEstimateModal(vehicleId=""){
  clearEstimateForm();
  fillSelect("estimateVehicle");

  if(vehicleId){
    $("estimateVehicle").value=vehicleId;
    loadVehicleIntoEstimate();
  }

  openModal("estimateModal");
}

function loadVehicleIntoEstimate(){
  const v=findVehicle($("estimateVehicle")?.value);
  if(!v)return;

  if($("estimateCustomer"))$("estimateCustomer").value=v.customer||"";
  if($("estimateRegistration"))$("estimateRegistration").value=v.registration||"";
  if($("estimateModel"))$("estimateModel").value=v.model||"";
  if($("estimateYear"))$("estimateYear").value=v.model_year||"";
}

function estimateTotals(){
  let subtotal=estimateItems.reduce((a,x)=>a+n(x.qty)*n(x.price),0);
  return {
    subtotal,
    vat:subtotal*0.16,
    total:subtotal*1.16
  };
}

async function saveEstimate(e){
  e.preventDefault();

  const t=estimateTotals();
  const company=COMPANIES[$("estimateCompany")?.value||"crystal"];
  const id=$("estimateId").value;

  const record={
    estimate_no:$("estimateNo").value.trim(),
    estimate_date:$("estimateDate").value||today(),
    company_name:company.name,
    company_address:`${company.address} | ${company.location}`,
    company_phone:company.phone,
    company_email:company.email||null,
    customer:$("estimateCustomer").value||null,
    customer_phone:$("estimateCustomerPhone")?.value||null,
    customer_address:$("estimateCustomerAddress")?.value||null,
    vehicle_id:$("estimateVehicle").value||null,
    registration:$("estimateRegistration").value||null,
    chassis_no:$("estimateChassis").value||null,
    vehicle_year:$("estimateYear").value||null,
    vehicle_model:$("estimateModel").value||null,
    subtotal:t.subtotal,
    vat_rate:16,
    vat_amount:t.vat,
    total_amount:t.total,
    notes:$("estimateNotes").value||null,
    items:estimateItems
  };

  const r=id
    ? await db.from("estimates").update(record).eq("id",id)
    : await db.from("estimates").insert(record);

  if(r.error){toast(r.error.message);return}

  closeModal("estimateModal");
  await loadAllData();
  toast("Estimate saved");
}

function renderEstimates(){
  const body=$("estimatesTableBody");
  if(!body)return;

  const q=($("estimateSearch")?.value||"").toLowerCase();

  const rows=estimates.filter(x=>{
    const text=[
      x.estimate_no,x.customer,x.registration,
      x.vehicle_model,x.chassis_no
    ].join(" ").toLowerCase();

    return !q||text.includes(q);
  });

  body.innerHTML=rows.length?rows.map(x=>`
    <tr>
      <td>${esc(x.estimate_no)}</td>
      <td>${x.estimate_date||""}</td>
      <td>${esc(x.registration||"")}</td>
      <td>${esc(x.customer||"")}</td>
      <td>${money(x.subtotal)}</td>
      <td>${money(x.vat_amount)}</td>
      <td><b>${money(x.total_amount)}</b></td>
      <td>
        <button onclick="previewEstimate('${x.id}')">View</button>
        <button onclick="editEstimate('${x.id}')">Edit</button>
        <button onclick="shareEstimate('${x.id}')">Share</button>
        <button onclick="deleteEstimate('${x.id}')">Delete</button>
      </td>
    </tr>
  `).join(""):`<tr><td colspan="8">No estimates found</td></tr>`;
}

function editEstimate(id){
  const x=estimates.find(a=>String(a.id)===String(id));
  if(!x)return;

  openModal("estimateModal");

  $("estimateId").value=x.id;
  $("estimateNo").value=x.estimate_no||"";
  $("estimateDate").value=x.estimate_date||today();

  $("estimateCustomer").value=x.customer||"";
  if($("estimateCustomerPhone"))$("estimateCustomerPhone").value=x.customer_phone||"";
  if($("estimateCustomerAddress"))$("estimateCustomerAddress").value=x.customer_address||"";

  $("estimateRegistration").value=x.registration||"";
  $("estimateChassis").value=x.chassis_no||"";
  $("estimateYear").value=x.vehicle_year||"";
  $("estimateModel").value=x.vehicle_model||"";
  $("estimateVehicle").value=x.vehicle_id||

     
