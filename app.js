import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE REPLACEMENT APP.JS
   ========================================================= */

const SUPABASE_URL = "https://ptluwoeogfkqavhspdjj.supabase.co";
const SUPABASE_KEY = "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];
let invoices = [];
let gatePasses = [];
let estimates = [];

let editingVehicleId = null;
let editingExpenseId = null;
let editingPettyId = null;
let editingReqId = null;
let editingInvoiceId = null;
let editingGatePassId = null;
let editingEstimateId = null;

let currentVehicleExpenseId = null;


/* =========================================================
   HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

const esc = value => String(value ?? "")
  .replace(/&/g,"&amp;")
  .replace(/</g,"&lt;")
  .replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;")
  .replace(/'/g,"&#039;");

const num = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const money = value =>
  `KSh ${num(value).toLocaleString("en-KE",{
    minimumFractionDigits:2,
    maximumFractionDigits:2
  })}`;

const today = () => new Date().toISOString().slice(0,10);

function normReg(v){
  return String(v || "").toUpperCase().replace(/[\s-]/g,"");
}

function dateText(v){
  if(!v) return "";
  const d = new Date(String(v).slice(0,10)+"T00:00:00");
  return Number.isNaN(d.getTime()) ? String(v).slice(0,10) :
    d.toLocaleDateString("en-KE",{year:"numeric",month:"short",day:"numeric"});
}

function storageDays(v){
  if(!v?.date_in) return 0;

  const a = new Date(String(v.date_in).slice(0,10)+"T00:00:00");
  const b = new Date(
    (v.date_out || today()).toString().slice(0,10)+"T00:00:00"
  );

  return Math.max(0,Math.floor((b-a)/86400000));
}

function toast(message,type="success"){
  const t=$("toast");
  if(!t){
    alert(message);
    return;
  }

  t.textContent=message;
  t.style.display="block";
  t.style.background=type==="error" ? "#991b1b" :
                     type==="warning" ? "#92400e" : "#07111f";

  clearTimeout(window.__garageToast);
  window.__garageToast=setTimeout(()=>t.style.display="none",3000);
}

function openModal(id){
  const x=$(id);
  if(x){
    x.style.display="flex";
    x.classList.add("show");
  }
}

function closeModal(id){
  const x=$(id);
  if(x){
    x.style.display="none";
    x.classList.remove("show");
  }
}

function statusBadge(s){
  const value=String(s||"Unknown");
  const cls=value.toLowerCase().replace(/\s+/g,"-");
  return `<span class="status status-${esc(cls)}">${esc(value)}</span>`;
}


/* =========================================================
   COMPANY DETAILS
   ========================================================= */

const COMPANIES={
  crystal:{
    name:"CRYSTAL MOTORS (K) LTD",
    address:"P.O. Box 54385 – 00200, Nairobi",
    phone:"0722 707124 | 0723 914 222",
    location:"Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge",
    email:""
  },

  quarry:{
    name:"QUARRY ROUTE MOTORS LTD",
    address:"P.O. Box 54385 – 00200, Nairobi",
    phone:"0722 707124 | 0723 914 222",
    location:"Off Mombasa Road, Along Quarry Road, Near Mlolongo Weigh Bridge",
    email:"info@quarryroutemotors.com | quarryroutemotorsltd@gmail.com"
  },

  other:{
    name:"",
    address:"",
    phone:"",
    location:"",
    email:""
  }
};

function companyKey(value){
  const x=String(value||"").toLowerCase();

  if(x.includes("quarry")) return "quarry";
  if(x.includes("other")) return "other";

  return "crystal";
}

function companyFromRow(row){
  const key=companyKey(row?.company_name);
  const c={...COMPANIES[key]};

  if(key==="other"){
    c.name=row?.company_name||"OTHER";
    c.address=row?.company_address||"";
    c.phone=row?.company_phone||"";
    c.email=row?.company_email||"";
  }

  return c;
}


/* =========================================================
   CSS FIXES
   ========================================================= */

function injectStyles(){

  if($("garageRuntimeStyles")) return;

  const style=document.createElement("style");
  style.id="garageRuntimeStyles";

  style.textContent=`
    .table-actions{
      display:flex!important;
      flex-direction:row!important;
      flex-wrap:nowrap!important;
      align-items:center!important;
      gap:5px!important;
      white-space:nowrap!important;
    }

    .action-btn{
      width:34px!important;
      height:32px!important;
      min-width:34px!important;
      padding:0!important;
      border:0!important;
      border-radius:7px!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      font-size:15px!important;
      line-height:1!important;
      cursor:pointer!important;
      background:#f1f5f9!important;
    }

    .action-btn:hover{
      transform:translateY(-1px);
      filter:brightness(.96);
    }

    .expense-total-card{
      margin:0 0 12px;
      padding:14px 18px;
      border:1px solid #dbe4ee;
      border-radius:12px;
      background:#fff;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
      box-shadow:0 2px 8px rgba(15,23,42,.05);
    }

    .expense-total-card .label{
      font-weight:700;
      color:#475569;
    }

    .expense-total-card .value{
      font-size:21px;
      font-weight:800;
      color:#0f172a;
    }

    .garage-company-box{
      border:1px solid #dbe4ee;
      border-radius:12px;
      padding:14px;
      margin:12px 0;
      background:#f8fafc;
    }

    .garage-company-box h3{
      margin:0 0 5px;
      font-size:18px;
    }

    .estimate-items{
      width:100%;
      border-collapse:collapse;
      margin-top:10px;
    }

    .estimate-items th,
    .estimate-items td{
      border:1px solid #dbe4ee;
      padding:7px;
    }

    #estimates{
      width:100%;
      box-sizing:border-box;
      position:relative;
      clear:both;
    }

    @media(max-width:720px){
      .table-actions{
        gap:4px!important;
      }

      .action-btn{
        width:32px!important;
        min-width:32px!important;
        height:30px!important;
        font-size:14px!important;
      }

      .expense-total-card{
        padding:12px;
      }
    }
  `;

  document.head.appendChild(style);
}


/* =========================================================
   SUPABASE LOADING
   ========================================================= */

async function loadTable(table,order=null){

  try{

    let q=supabase.from(table).select("*");

    if(order) q=q.order(order,{ascending:false});

    let r=await q;

    if(r.error && order){
      r=await supabase.from(table).select("*");
    }

    return {
      data:r.data||[],
      error:r.error||null
    };

  }catch(error){

    console.error(table,error);

    return {
      data:[],
      error
    };
  }
}

async function loadAllData(){

  const results=await Promise.all([
    loadTable("vehicles","created_at"),
    loadTable("expenses","created_at"),
    loadTable("petty_cash","created_at"),
    loadTable("requisitions","created_at"),
    loadTable("invoices","created_at"),
    loadTable("gate_passes","created_at"),
    loadTable("estimates","created_at")
  ]);

  vehicles=results[0].data;
  expenses=results[1].data;
  pettyCash=results[2].data;
  requisitions=results[3].data;

  invoices=results[4].data;
  gatePasses=results[5].data;
  estimates=results[6].data;

  if(results[4].error)
    console.warn("Invoices:",results[4].error.message);

  if(results[5].error)
    console.warn("Gate Passes:",results[5].error.message);

  if(results[6].error)
    console.warn("Estimates:",results[6].error.message);

  renderAll();
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupEstimateNavigation(){

  if(document.querySelector('[data-section="estimates"]')) return;

  const gate=document.querySelector('[data-section="gate-passes"]');

  if(gate){

    const button=gate.cloneNode(true);

    button.removeAttribute("onclick");
    button.dataset.section="estimates";
    button.innerHTML=
      `<span>📋</span><span>Estimates / Quotations</span>`;

    button.addEventListener("click",()=>showSection("estimates"));

    gate.parentElement.insertBefore(button,gate.nextSibling);

    return;
  }

  const nav=
    document.querySelector(".sidebar nav")||
    document.querySelector(".sidebar-menu")||
    document.querySelector("aside nav")||
    document.querySelector("aside");

  if(!nav) return;

  const button=document.createElement("button");
  button.type="button";
  button.className="nav-item";
  button.dataset.section="estimates";
  button.innerHTML=
    `<span>📋</span><span>Estimates / Quotations</span>`;

  button.onclick=()=>showSection("estimates");

  nav.appendChild(button);
}

function showSection(name){

  ensureEstimateSection();

  document
    .querySelectorAll(".section,.app-section")
    .forEach(x=>x.style.display="none");

  const target=$(name);

  if(target){
    target.style.display=
      name==="estimates" ? "block" : "";
  }

  document
    .querySelectorAll("[data-section]")
    .forEach(x=>x.classList.remove("active"));

  const nav=document.querySelector(`[data-section="${name}"]`);

  if(nav) nav.classList.add("active");

  if(name==="estimates") renderEstimates();
  if(name==="expenses") renderExpenses();
  if(name==="vehicles") renderVehicles();
  if(name==="invoices") renderInvoices();
  if(name==="gate-passes") renderGatePasses();
}

window.showSection=showSection;


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard(){

  const billed=vehicles.reduce((a,v)=>a+num(v.billed),0);
  const paid=vehicles.reduce((a,v)=>a+num(v.paid),0);
  const outstanding=vehicles.reduce(
    (a,v)=>a+Math.max(num(v.billed)-num(v.paid),0),0
  );

  const expTotal=expenses.reduce((a,e)=>a+num(e.amount),0);
  const pettyTotal=pettyCash.reduce((a,e)=>a+num(e.amount),0);

  const repair=vehicles.filter(v=>
    String(v.status||"").toLowerCase()==="under repair"
  ).length;

  if($("dashVehicles")) $("dashVehicles").textContent=vehicles.length;
  if($("dashRepair")) $("dashRepair").textContent=repair;
  if($("dashOutstanding")) $("dashOutstanding").textContent=money(outstanding);

  if($("dashBilled")) $("dashBilled").textContent=money(billed);
  if($("dashPaid")) $("dashPaid").textContent=money(paid);
  if($("dashExpenses")) $("dashExpenses").textContent=money(expTotal);
  if($("dashPetty")) $("dashPetty").textContent=money(pettyTotal);

  if($("dashReq")){
    $("dashReq").textContent=[
      ...new Set(requisitions.map(r=>r.req_no))
    ].length;
  }

  if($("dashInvoices"))
    $("dashInvoices").textContent=invoices.length;

  if($("dashGatePasses"))
    $("dashGatePasses").textContent=gatePasses.length;

  if($("dashReqCount"))
    $("dashReqCount").textContent=[
      ...new Set(requisitions.map(r=>r.req_no))
    ].length;

  if($("dashReqTotal"))
    $("dashReqTotal").textContent=money(
      requisitions.reduce((a,r)=>a+num(r.total_amount),0)
    );

  renderDashboardActivity();
}

function renderDashboardActivity(){

  const box=$("dashboardActivity");
  if(!box) return;

  const rows=[...vehicles]
    .sort((a,b)=>
      new Date(b.created_at||b.date_in||0)-
      new Date(a.created_at||a.date_in||0)
    )
    .slice(0,7);

  if(!rows.length){
    box.innerHTML=
      `<div style="padding:20px;color:#64748b">No recent activity.</div>`;
    return;
  }

  box.innerHTML=rows.map(v=>`
    <div class="activity-item">
      <div class="activity-icon">🚘</div>
      <div class="activity-main">
        <strong>${esc(v.registration)}</strong>
        <span>${esc(v.customer||"")}</span>
      </div>
      ${statusBadge(v.status)}
    </div>
  `).join("");
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
    dashPetty:"petty-cash"
  };

  Object.entries(map).forEach(([id,section])=>{
    const el=$(id);
    if(!el) return;

    const card=
      el.closest(".stat-card")||
      el.closest(".dashboard-card")||
      el.closest(".kpi-card")||
      el.closest(".card");

    if(card){
      card.style.cursor="pointer";
      card.onclick=()=>showSection(section);
    }
  });
}


/* =========================================================
   VEHICLES
   ========================================================= */

function populateVehicleSelects(){

  const selects=[
    $("expenseVehicle"),
    $("reqVehicle"),
    $("invoiceVehicle"),
    $("gateVehicle")
  ].filter(Boolean);

  selects.forEach(select=>{

    const old=select.value;

    select.innerHTML=
      `<option value="">Select Vehicle</option>`+
      vehicles.map(v=>`
        <option value="${esc(v.id)}">
          ${esc(v.registration)}
          ${v.customer?" — "+esc(v.customer):""}
        </option>
      `).join("");

    if([...select.options].some(o=>o.value===old))
      select.value=old;
  });
}

function renderVehicles(){

  const body=$("vehiclesTableBody");
  if(!body) return;

  const q=($("vehicleSearch")?.value||"").toLowerCase();
  const filter=($("vehicleStatusFilter")?.value||"").toLowerCase();

  const rows=vehicles.filter(v=>{

    const text=[
      v.registration,v.customer,v.model,v.model_year,
      v.color,v.job_type,v.status,v.description
    ].join(" ").toLowerCase();

    return (!q||text.includes(q)) &&
      (!filter||String(v.status||"").toLowerCase()===filter);
  });

  if(!rows.length){
    body.innerHTML=
      `<tr><td colspan="11" style="text-align:center;padding:30px">No vehicles found.</td></tr>`;
    return;
  }

  body.innerHTML=rows.map(v=>{

    const expenseTotal=expenses
      .filter(e=>String(e.vehicle_id)===String(v.id))
      .reduce((a,e)=>a+num(e.amount),0);

    const outstanding=
      Math.max(num(v.billed)-num(v.paid),0);

    const days=
      String(v.job_type||"") === "Storage" ||
      String(v.status||"") === "Storage"
      ? storageDays(v)
      : "—";

    return `
      <tr>
        <td><strong>${esc(v.registration)}</strong></td>
        <td>${esc(v.customer)}</td>
        <td>${dateText(v.date_in)}</td>
        <td>${esc(v.job_type||"Repair")}</td>
        <td>${statusBadge(v.status)}</td>
        <td>${days}</td>
        <td><strong>${money(expenseTotal)}</strong></td>
        <td>${money(v.billed)}</td>
        <td>${money(v.paid)}</td>
        <td>${money(outstanding)}</td>

        <td>
          <div class="table-actions">

            <button class="action-btn"
              title="Edit"
              aria-label="Edit"
              onclick="openVehicleModal('${v.id}')">✏️</button>

            <button class="action-btn"
              title="Vehicle Expenses"
              aria-label="Vehicle Expenses"
              onclick="openVehicleExpensePreview('${v.id}')">🚘</button>

            <button class="action-btn"
              title="View"
              aria-label="View"
              onclick="viewVehicle('${v.id}')">👁️</button>

            <button class="action-btn"
              title="Share"
              aria-label="Share"
              onclick="shareVehicle('${v.id}')">📤</button>

            <button class="action-btn"
              title="Delete"
              aria-label="Delete"
              onclick="deleteVehicle('${v.id}')">🗑️</button>

          </div>
        </td>
      </tr>
    `;
  }).join("");
}


/* =========================================================
   VEHICLE ADD / EDIT / UPDATE
   ========================================================= */

function resetVehicleForm(){

  editingVehicleId=null;

  if($("vehicleForm")) $("vehicleForm").reset();
  if($("vehicleId")) $("vehicleId").value="";
  if($("vehicleDateIn")) $("vehicleDateIn").value=today();
  if($("vehicleJobType")) $("vehicleJobType").value="Repair";
  if($("vehicleStatus")) $("vehicleStatus").value="Under Repair";
  if($("vehicleStorageDays")) $("vehicleStorageDays").value="0";

  if($("vehicleModalTitle"))
    $("vehicleModalTitle").textContent="Add Vehicle";
}

function openVehicleModal(id=null){

  resetVehicleForm();

  if(id){

    const v=vehicles.find(x=>String(x.id)===String(id));
    if(!v) return;

    editingVehicleId=v.id;

    $("vehicleId").value=v.id;
    $("vehicleRegistration").value=v.registration||"";
    $("vehicleCustomer").value=v.customer||"";

    if($("vehicleModel"))
      $("vehicleModel").value=v.model||"";

    if($("vehicleModelYear"))
      $("vehicleModelYear").value=v.model_year||"";

    if($("vehicleColor"))
      $("vehicleColor").value=v.color||"";

    $("vehicleDateIn").value=v.date_in||"";
    $("vehicleDateOut").value=v.date_out||"";

    if($("vehicleStorageDays"))
      $("vehicleStorageDays").value=storageDays(v);

    $("vehicleJobType").value=v.job_type||"Repair";
    $("vehicleStatus").value=v.status||"Under Repair";
    $("vehicleReleasedTo").value=v.released_to||"";
    $("vehicleReleasedContact").value=v.released_contact||"";
    $("vehicleBilled").value=num(v.billed);
    $("vehiclePaid").value=num(v.paid);
    $("vehicleDescription").value=v.description||"";

    if($("vehicleModalTitle"))
      $("vehicleModalTitle").textContent="Edit Vehicle";
  }

  openModal("vehicleModal");
}

async function saveVehicle(event){

  event.preventDefault();

  const id=
    $("vehicleId")?.value.trim()||
    editingVehicleId||
    null;

  const registration=
    $("vehicleRegistration")?.value.trim();

  const customer=
    $("vehicleCustomer")?.value.trim();

  if(!registration||!customer){
    toast("Registration / Chassis No. and customer are required.","error");
    return;
  }

  const duplicate=vehicles.some(v=>
    normReg(v.registration)===normReg(registration) &&
    String(v.id)!==String(id||"")
  );

  if(duplicate){
    toast("This Registration / Chassis No. already exists.","error");
    return;
  }

  const payload={
    registration:registration.toUpperCase(),
    customer,

    model:$("vehicleModel")?.value.trim()||null,
    model_year:$("vehicleModelYear")?.value.trim()||null,
    color:$("vehicleColor")?.value.trim()||null,

    date_in:$("vehicleDateIn")?.value||today(),
    date_out:$("vehicleDateOut")?.value||null,

    job_type:$("vehicleJobType")?.value||"Repair",
    status:$("vehicleStatus")?.value||"Under Repair",

    released_to:$("vehicleReleasedTo")?.value.trim()||null,
    released_contact:$("vehicleReleasedContact")?.value.trim()||null,

    billed:num($("vehicleBilled")?.value),
    paid:num($("vehiclePaid")?.value),

    description:$("vehicleDescription")?.value.trim()||null
  };

  try{

    let result;

    if(id){

      /*
       * IMPORTANT VEHICLE UPDATE FIX:
       * Update by exact UUID and request the updated
       * row back from Supabase.
       */
      result=await supabase
        .from("vehicles")
        .update(payload)
        .eq("id",id)
        .select("*")
        .single();

      if(result.error) throw result.error;

      if(!result.data)
        throw new Error("Vehicle update returned no record.");

    }else{

      result=await supabase
        .from("vehicles")
        .insert(payload)
        .select("*")
        .single();

      if(result.error) throw result.error;
    }

    closeModal("vehicleModal");

    toast(
      id
        ? "Vehicle updated successfully."
        : "Vehicle added successfully."
    );

    await loadAllData();

  }catch(error){

    console.error("Vehicle save:",error);

    toast(
      error.message||"Vehicle could not be saved.",
      "error"
    );
  }
}

async function deleteVehicle(id){

  const v=vehicles.find(x=>String(x.id)===String(id));
  if(!v) return;

  if(!confirm(
    `Delete ${v.registration}? This will delete its linked expenses and records.`
  )) return;

  try{

    const childTables=[
      "expenses",
      "requisitions",
      "invoices",
      "gate_passes"
    ];

    for(const table of childTables){

      const r=await supabase
        .from(table)
        .delete()
        .eq("vehicle_id",id);

      if(r.error){

        const msg=String(r.error.message||"").toLowerCase();

        if(
          table==="invoices"||
          table==="gate_passes"
        ){

          if(
            msg.includes("does not exist")||
            msg.includes("relation")
          ) continue;
        }

        throw r.error;
      }
    }

    const r=await supabase
      .from("vehicles")
      .delete()
      .eq("id",id);

    if(r.error) throw r.error;

    toast("Vehicle deleted successfully.");
    await loadAllData();

  }catch(error){

    console.error(error);
    toast(
      error.message||"Could not delete vehicle.",
      "error"
    );
  }
}


/* =========================================================
   VEHICLE VIEW / EXPENSES
   ========================================================= */

function vehicleExpenseRows(id){

  return expenses.filter(e=>
    String(e.vehicle_id)===String(id)
  );
}

function vehicleExpenseTotal(id){

  return vehicleExpenseRows(id)
    .reduce((a,e)=>a+num(e.amount),0);
}

function vehicleReportHtml(id){

  const v=vehicles.find(x=>String(x.id)===String(id));
  if(!v) return "";

  const rows=vehicleExpenseRows(id);
  const total=vehicleExpenseTotal(id);

  return `
    <div class="garage-company-box">
      <h3>CRYSTAL MOTORS (K) LTD</h3>
      <div>P.O. Box 54385 – 00200, Nairobi</div>
      <div>Cell: 0722 707124 | 0723 914 222</div>
      <div>Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge</div>
    </div>

    <h2>VEHICLE EXPENSE REPORT</h2>

    <p>
      <strong>Registration:</strong> ${esc(v.registration)}<br>
      <strong>Customer:</strong> ${esc(v.customer)}<br>
      <strong>Job Type:</strong> ${esc(v.job_type||"Repair")}<br>
      <strong>Status:</strong> ${esc(v.status||"")}
    </p>

    <table class="estimate-items">
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
          ? rows.map(e=>`
            <tr>
              <td>${dateText(e.expense_date)}</td>
              <td>${esc(e.description)}</td>
              <td>${esc(e.category||"")}</td>
              <td>${money(e.amount)}</td>
            </tr>
          `).join("")
          : `<tr><td colspan="4">No expenses recorded.</td></tr>`
        }
      </tbody>

      <tfoot>
        <tr>
          <th colspan="3" style="text-align:right">TOTAL EXPENSES</th>
          <th>${money(total)}</th>
        </tr>
      </tfoot>
    </table>
  `;
}

function openVehicleExpensePreview(id){

  const v=vehicles.find(x=>String(x.id)===String(id));
  if(!v) return;

  currentVehicleExpenseId=v.id;

  const content=$("vehicleExpensePreviewContent");

  if(content)
    content.innerHTML=vehicleReportHtml(v.id);

  openModal("vehicleExpensePreviewModal");
}

window.openVehicleExpensePreview=openVehicleExpensePreview;

function viewVehicle(id){

  const v=vehicles.find(x=>String(x.id)===String(id));
  if(!v) return;

  const content=$("previewContent");

  if(content){

    content.innerHTML=`
      <div class="garage-company-box">
        <h3>CRYSTAL MOTORS (K) LTD</h3>
        <div>P.O. Box 54385 – 00200, Nairobi</div>
        <div>Cell: 0722 707124 | 0723 914 222</div>
        <div>Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge</div>
      </div>

      <h2>${esc(v.registration)}</h2>

      <p>
        <strong>Customer:</strong> ${esc(v.customer)}<br>
        <strong>Model:</strong> ${esc(v.model||"")}<br>
        <strong>Year:</strong> ${esc(v.model_year||"")}<br>
        <strong>Color:</strong> ${esc(v.color||"")}<br>
        <strong>Date In:</strong> ${dateText(v.date_in)}<br>
        <strong>Date Out:</strong> ${dateText(v.date_out)}<br>
        <strong>Job:</strong> ${esc(v.job_type||"Repair")}<br>
        <strong>Status:</strong> ${esc(v.status||"")}<br>
        <strong>Storage Days:</strong> ${storageDays(v)}<br>
        <strong>Billed:</strong> ${money(v.billed)}<br>
        <strong>Paid:</strong> ${money(v.paid)}<br>
        <strong>Outstanding:</strong> ${money(
          Math.max(num(v.billed)-num(v.paid),0)
        )}
      </p>

      <p>${esc(v.description||"")}</p>
    `;
  }

  if($("previewTitle"))
    $("previewTitle").textContent="Vehicle Details";

  openModal("previewModal");
}

async function shareVehicle(id){

  const v=vehicles.find(x=>String(x.id)===String(id));
  if(!v) return;

  const rows=vehicleExpenseRows(id);
  const total=vehicleExpenseTotal(id);

  const text=[
    "CRYSTAL MOTORS (K) LTD",
    "P.O. Box 54385 – 00200, Nairobi",
    "Cell: 0722 707124 | 0723 914 222",
    "Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge",
    "",
    "VEHICLE EXPENSE REPORT",
    `Registration: ${v.registration}`,
    `Customer: ${v.customer}`,
    "",
    ...rows.map(e=>
      `${dateText(e.expense_date)} - ${e.description} - ${money(e.amount)}`
    ),
    "",
    `TOTAL EXPENSES: ${money(total)}`
  ].join("\n");

  await shareText(
    `Vehicle Expense Report - ${v.registration}`,
    text
  );
}

async function shareText(title,text){

  try{

    if(navigator.share){

      await navigator.share({
        title,
        text
      });

      return;
    }

    if(navigator.clipboard){

      await navigator.clipboard.writeText(text);
      toast("Report copied. You can now paste it into WhatsApp.");
      return;
    }

    const w=window.open("");
    if(w){
      w.document.write(`<pre>${esc(text)}</pre>`);
      w.document.close();
    }

  }catch(error){

    if(error?.name!=="AbortError")
      toast("Could not share the report.","error");
  }
}

function printVehicleExpensePreview(){

  const content=$("vehicleExpensePreviewContent")?.innerHTML||"";

  printHtml(
    "Vehicle Expense Report",
    content
  );
}

function printVehicle(id){

  const v=vehicles.find(x=>String(x.id)===String(id));
  if(!v) return;

  printHtml(
    `Vehicle ${v.registration}`,
    vehicleReportHtml(id)
  );
}


/* =========================================================
   EXPENSES
   ========================================================= */

function ensureExpenseTotal(){

  const body=$("expensesTableBody");
  if(!body) return null;

  const table=body.closest("table");
  if(!table) return null;

  let box=$("expenseOverallTotal");

  if(!box){

    box=document.createElement("div");
    box.id="expenseOverallTotal";
    box.className="expense-total-card";

    table.parentElement.insertBefore(box,table);
  }

  return box;
}

function renderExpenses(){

  const body=$("expensesTableBody");
  if(!body) return;

  const q=($("expenseSearch")?.value||"").trim();
  const category=($("expenseCategoryFilter")?.value||"").trim().toLowerCase();

  let rows=[...expenses];

  /*
   * EXACT VEHICLE SEARCH
   *
   * KBN 084E -> only expenses linked to KBN 084E
   * KCA 123A -> only expenses linked to KCA 123A
   * Any vehicle -> only that vehicle's expenses
   */

  if(q){

    const vehicle=vehicles.find(v=>
      normReg(v.registration)===normReg(q)
    );

    if(vehicle){

      rows=expenses.filter(e=>
        String(e.vehicle_id)===String(vehicle.id)
      );

    }else{

      const lower=q.toLowerCase();

      rows=expenses.filter(e=>{

        const v=vehicles.find(x=>
          String(x.id)===String(e.vehicle_id)
        );

        return [
          e.description,
          e.category,
          v?.registration,
          v?.customer
        ].join(" ").toLowerCase().includes(lower);
      });
    }
  }

  if(category){
    rows=rows.filter(e=>
      String(e.category||"").toLowerCase()===category
    );
  }

  const total=rows.reduce(
    (a,e)=>a+num(e.amount),0
  );

  const totalBox=ensureExpenseTotal();

  if(totalBox){

    totalBox.innerHTML=`
      <div class="label">
        Filtered Expenses (${rows.length})
      </div>

      <div class="value">
        ${money(total)}
      </div>
    `;
  }

  if(!rows.length){

    body.innerHTML=
      `<tr><td colspan="6" style="text-align:center;padding:30px">
        No expenses found.
      </td></tr>`;

    return;
  }

  body.innerHTML=rows.map(e=>{

    const v=vehicles.find(x=>
      String(x.id)===String(e.vehicle_id)
    );

    return `
      <tr>

        <td>${dateText(e.expense_date)}</td>

        <td>
          <strong>${esc(v?.registration||"General")}</strong>
        </td>

        <td>${esc(e.description)}</td>

        <td>${esc(e.category||"")}</td>

        <td><strong>${money(e.amount)}</strong></td>

        <td>
          <div class="table-actions">

            <button class="action-btn"
              title="Edit"
              onclick="openExpenseModal('${e.id}')">✏️</button>

            <button class="action-btn"
              title="View"
              onclick="viewExpense('${e.id}')">👁️</button>

            <button class="action-btn"
              title="Share"
              onclick="shareExpense('${e.id}')">📤</button>

            <button class="action-btn"
              title="Delete"
              onclick="deleteExpense('${e.id}')">🗑️</button>

          </div>
        </td>

      </tr>
    `;
  }).join("");

  let foot=body.closest("table")?.querySelector("tfoot");

  if(!foot){

    const table=body.closest("table");

    if(table)
      foot=table.createTFoot();
  }

  if(foot){

    foot.innerHTML=`
      <tr>
        <th colspan="4" style="text-align:right">
          TOTAL FILTERED EXPENSES
        </th>
        <th>${money(total)}</th>
        <th></th>
      </tr>
    `;
  }
}

function resetExpenseForm(){

  editingExpenseId=null;

  if($("expenseForm")) $("expenseForm").reset();
  if($("expenseId")) $("expenseId").value="";
  if($("expenseDate")) $("expenseDate").value=today();
  if($("expenseCategory")) $("expenseCategory").value="Parts";

  if($("expenseModalTitle"))
    $("expenseModalTitle").textContent="Add Expense";
}

function openExpenseModal(id=null){

  resetExpenseForm();
  populateVehicleSelects();

  if(id){

    const e=expenses.find(x=>String(x.id)===String(id));
    if(!e) return;

    editingExpenseId=e.id;

    $("expenseId").value=e.id;
    $("expenseVehicle").value=e.vehicle_id||"";
    $("expenseDate").value=e.expense_date||"";
    $("expenseCategory").value=e.category||"Parts";
    $("expenseAmount").value=num(e.amount);
    $("expenseDescription").value=e.description||"";

    if($("expenseModalTitle"))
      $("expenseModalTitle").textContent="Edit Expense";
  }

  openModal("expenseModal");
}

async function saveExpense(event){

  event.preventDefault();

  const payload={
    vehicle_id:$("expenseVehicle")?.value||null,
    expense_date:$("expenseDate")?.value||today(),
    category:$("expenseCategory")?.value||"Parts",
    amount:num($("expenseAmount")?.value),
    description:$("expenseDescription")?.value.trim()
  };

  if(!payload.description){
    toast("Expense description is required.","error");
    return;
  }

  try{

    let r;

    if(editingExpenseId){

      r=await supabase
        .from("expenses")
        .update(payload)
        .eq("id",editingExpenseId)
        .select("*")
        .single();

    }else{

      r=await supabase
        .from("expenses")
        .insert(payload)
        .select("*")
        .single();
    }

    if(r.error) throw r.error;

    closeModal("expenseModal");
    toast(editingExpenseId?"Expense updated.":"Expense added.");

    await loadAllData();

  }catch(error){

    console.error(error);
    toast(error.message||"Could not save expense.","error");
  }
}

function viewExpense(id){

  const e=expenses.find(x=>String(x.id)===String(id));
  if(!e) return;

  const v=vehicles.find(x=>
    String(x.id)===String(e.vehicle_id)
  );

  $("previewTitle").textContent="Expense Details";

  $("previewContent").innerHTML=`
    <div class="garage-company-box">
      <h3>CRYSTAL MOTORS (K) LTD</h3>
      <div>P.O. Box 54385 – 00200, Nairobi</div>
      <div>Cell: 0722 707124 | 0723 914 222</div>
    </div>

    <h3>${esc(e.description)}</h3>

    <p>
      <strong>Vehicle:</strong> ${esc(v?.registration||"General")}<br>
      <strong>Date:</strong> ${dateText(e.expense_date)}<br>
      <strong>Category:</strong> ${esc(e.category||"")}<br>
      <strong>Amount:</strong> ${money(e.amount)}
    </p>
  `;

  openModal("previewModal");
}

async function shareExpense(id){

  const e=expenses.find(x=>String(x.id)===String(id));
  if(!e) return;

  const v=vehicles.find(x=>
    String(x.id)===String(e.vehicle_id)
  );

  await shareText(
    "Garage Expense",
    [
      "CRYSTAL MOTORS (K) LTD",
      "P.O. Box 54385 – 00200, Nairobi",
      "Cell: 0722 707124 | 0723 914 222",
      "",
      `Vehicle: ${v?.registration||"General"}`,
      `Date: ${dateText(e.expense_date)}`,
      `Description: ${e.description}`,
      `Category: ${e.category||""}`,
      `Amount: ${money(e.amount)}`
    ].join("\n")
  );
}

async function deleteExpense(id){

  if(!confirm("Delete this expense?")) return;

  const r=await supabase
    .from("expenses")
    .delete()
    .eq("id",id);

  if(r.error){
    toast(r.error.message,"error");
    return;
  }

  toast("Expense deleted.");
  await loadAllData();
}

function printExpenses(){

  const body=$("expensesTableBody");
  const totalBox=$("expenseOverallTotal");

  printHtml(
    "Vehicle Expense Report",
    `
      <h2>EXPENSE REPORT</h2>
      ${totalBox?.outerHTML||""}
      <table>${body?.closest("table")?.innerHTML||""}</table>
    `
  );
}


/* =========================================================
   PETTY CASH
   ========================================================= */

function renderPettyCash(){

  const body=$("pettyTableBody");
  if(!body) return;

  const q=($("pettySearch")?.value||"").toLowerCase();
  const c=($("pettyCategoryFilter")?.value||"").toLowerCase();

  const rows=pettyCash.filter(p=>{

    const text=[
      p.description,p.paid_to,p.category,p.notes
    ].join(" ").toLowerCase();

    return (!q||text.includes(q)) &&
      (!c||String(p.category||"").toLowerCase()===c);
  });

  if(!rows.length){
    body.innerHTML=
      `<tr><td colspan="7" style="text-align:center;padding:30px">No petty cash records.</td></tr>`;
    return;
  }

  body.innerHTML=rows.map(p=>`
    <tr>
      <td>${dateText(p.cash_date)}</td>
      <td>${esc(p.paid_to||"")}</td>
      <td>${esc(p.category||"")}</td>
      <td>${esc(p.description)}</td>
      <td>${esc(p.notes||"")}</td>
      <td><strong>${money(p.amount)}</strong></td>
      <td>
        <div class="table-actions">
          <button class="action-btn" title="Edit"
            onclick="openPettyModal('${p.id}')">✏️</button>
          <button class="action-btn" title="View"
            onclick="viewPetty('${p.id}')">👁️</button>
          <button class="action-btn" title="Share"
            onclick="sharePetty('${p.id}')">📤</button>
          <button class="action-btn" title="Delete"
            onclick="deletePetty('${p.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function openPettyModal(id=null){

  editingPettyId=id;

  if($("pettyForm")) $("pettyForm").reset();
  if($("pettyDate")) $("pettyDate").value=today();

  if($("pettyModalTitle"))
    $("pettyModalTitle").textContent=id?"Edit Petty Cash":"Add Petty Cash";

  if(id){

    const p=pettyCash.find(x=>String(x.id)===String(id));
    if(!p) return;

    $("pettyId").value=p.id;
    $("pettyDate").value=p.cash_date||"";
    $("pettyPaidTo").value=p.paid_to||"";
    $("pettyCategory").value=p.category||"";
    $("pettyAmount").value=num(p.amount);
    $("pettyDescription").value=p.description||"";
    $("pettyNotes").value=p.notes||"";
  }

  openModal("pettyModal");
}

async function savePetty(event){

  event.preventDefault();

  const payload={
    cash_date:$("pettyDate")?.value||today(),
    paid_to:$("pettyPaidTo")?.value.trim()||null,
    category:$("pettyCategory")?.value||null,
    amount:num($("pettyAmount")?.value),
    description:$("pettyDescription")?.value.trim(),
    notes:$("pettyNotes")?.value.trim()||null
  };

  if(!payload.description){
    toast("Description is required.","error");
    return;
  }

  const r=editingPettyId
    ? await supabase.from("petty_cash")
        .update(payload).eq("id",editingPettyId).select("*").single()
    : await supabase.from("petty_cash")
        .insert(payload).select("*").single();

  if(r.error){
    toast(r.error.message,"error");
    return;
  }

  closeModal("pettyModal");
  toast(editingPettyId?"Petty cash updated.":"Petty cash added.");
  await loadAllData();
}

function viewPetty(id){

  const p=pettyCash.find(x=>String(x.id)===String(id));
  if(!p) return;

  $("previewTitle").textContent="Petty Cash";
  $("previewContent").innerHTML=`
    <h2>CRYSTAL MOTORS (K) LTD</h2>
    <p>
      <strong>Date:</strong> ${dateText(p.cash_date)}<br>
      <strong>Paid To:</strong> ${esc(p.paid_to||"")}<br>
      <strong>Category:</strong> ${esc(p.category||"")}<br>
      <strong>Description:</strong> ${esc(p.description)}<br>
      <strong>Amount:</strong> ${money(p.amount)}<br>
      <strong>Notes:</strong> ${esc(p.notes||"")}
    </p>
  `;

  openModal("previewModal");
}

async function sharePetty(id){

  const p=pettyCash.find(x=>String(x.id)===String(id));
  if(!p) return;

  await shareText(
    "Petty Cash",
    `CRYSTAL MOTORS (K) LTD\nDate: ${dateText(p.cash_date)}\nPaid To: ${p.paid_to||""}\nDescription: ${p.description}\nAmount: ${money(p.amount)}`
  );
}

async function deletePetty(id){

  if(!confirm("Delete this petty cash record?")) return;

  const r=await supabase.from("petty_cash").delete().eq("id",id);

  if(r.error){
    toast(r.error.message,"error");
    return;
  }

  toast("Petty cash deleted.");
  await loadAllData();
}


/* =========================================================
   REQUISITIONS
   ========================================================= */

function reqNumbers(){
  return [...new Set(requisitions.map(r=>r.req_no).filter(Boolean))];
}

function reqTotal(no){
  return requisitions
    .filter(r=>String(r.req_no)===String(no))
    .reduce((a,r)=>a+num(r.total_amount),0);
}

function renderRequisitions(){

  const body=$("requisitionsTableBody");
  if(!body) return;

  const q=($("reqSearch")?.value||"").toLowerCase();
  const s=($("reqStatusFilter")?.value||"").toLowerCase();

  const rows=requisitions.filter(r=>{

    const text=[
      r.req_no,r.requested_by,r.item_description,
      r.status,r.notes
    ].join(" ").toLowerCase();

    return (!q||text.includes(q)) &&
      (!s||String(r.status||"").toLowerCase()===s);
  });

  if($("reqOverallTotal"))
    $("reqOverallTotal").textContent=
      money(rows.reduce((a,r)=>a+num(r.total_amount),0));

  if(!rows.length){
    body.innerHTML=
      `<tr><td colspan="8" style="text-align:center;padding:30px">No requisitions.</td></tr>`;
    return;
  }

  body.innerHTML=rows.map(r=>`
    <tr>
      <td>${esc(r.req_no)}</td>
      <td>${dateText(r.req_date)}</td>
      <td>${esc(r.requested_by)}</td>
      <td>${esc(r.item_description)}</td>
      <td>${num(r.quantity)}</td>
      <td>${money(r.unit_cost)}</td>
      <td><strong>${money(r.total_amount)}</strong></td>
      <td>
        <div class="table-actions">
          <button class="action-btn" title="Edit"
            onclick="openReqModal('${r.id}')">✏️</button>
          <button class="action-btn" title="View"
            onclick="viewReq('${r.id}')">👁️</button>
          <button class="action-btn" title="Share"
            onclick="shareReq('${r.id}')">📤</button>
          <button class="action-btn" title="Delete"
            onclick="deleteReq('${r.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function openReqModal(id=null){

  editingReqId=id;

  populateVehicleSelects();

  if($("reqForm")) $("reqForm").reset();
  if($("reqDate")) $("reqDate").value=today();

  if($("reqModalTitle"))
    $("reqModalTitle").textContent=id?"Edit Requisition":"Add Requisition";

  if(id){

    const r=requisitions.find(x=>String(x.id)===String(id));
    if(!r) return;

    $("reqId").value=r.id;
    $("reqNo").value=r.req_no||"";
    $("reqDate").value=r.req_date||"";
    $("reqRequestedBy").value=r.requested_by||"";
    $("reqVehicle").value=r.vehicle_id||"";
    $("reqItemDescription").value=r.item_description||"";
    $("reqQuantity").value=num(r.quantity);
    $("reqUnitCost").value=num(r.unit_cost);
    $("reqTotal").value=num(r.total_amount);
    $("reqStatus").value=r.status||"Pending";

    if($("reqExpenseType"))
      $("reqExpenseType").value=r.expense_type||"Materials";

    if($("reqCategory"))
      $("reqCategory").value=r.expense_type||"Materials";

    $("reqNotes").value=r.notes||"";
  }

  openModal("reqModal");
}

async function saveReq(event){

  event.preventDefault();

  const qty=num($("reqQuantity")?.value);
  const unit=num($("reqUnitCost")?.value);

  const payload={
    req_no:$("reqNo")?.value.trim(),
    req_date:$("reqDate")?.value||today(),
    requested_by:$("reqRequestedBy")?.value.trim(),
    vehicle_id:$("reqVehicle")?.value||null,
    item_description:$("reqItemDescription")?.value.trim(),
    quantity:qty,
    unit_cost:unit,
    total_amount:qty*unit,
    status:$("reqStatus")?.value||"Pending",
    expense_type:$("reqExpenseType")?.value||
                 $("reqCategory")?.value||
                 "Materials",
    notes:$("reqNotes")?.value.trim()||null
  };

  if(!payload.req_no||!payload.requested_by||!payload.item_description){
    toast("Request No., requested by and item description are required.","error");
    return;
  }

  const r=editingReqId
    ? await supabase.from("requisitions")
        .update(payload).eq("id",editingReqId).select("*").single()
    : await supabase.from("requisitions")
        .insert(payload).select("*").single();

  if(r.error){
    toast(r.error.message,"error");
    return;
  }

  closeModal("reqModal");
  toast(editingReqId?"Requisition updated.":"Requisition added.");
  await loadAllData();
}

function viewReq(id){

  const r=requisitions.find(x=>String(x.id)===String(id));
  if(!r) return;

  $("previewTitle").textContent="Requisition";
  $("previewContent").innerHTML=`
    <h2>CRYSTAL MOTORS (K) LTD</h2>
    <p>
      <strong>Request No:</strong> ${esc(r.req_no)}<br>
      <strong>Date:</strong> ${dateText(r.req_date)}<br>
      <strong>Requested By:</strong> ${esc(r.requested_by)}<br>
      <strong>Item:</strong> ${esc(r.item_description)}<br>
      <strong>Quantity:</strong> ${num(r.quantity)}<br>
      <strong>Unit Cost:</strong> ${money(r.unit_cost)}<br>
      <strong>Total:</strong> ${money(r.total_amount)}<br>
      <strong>Status:</strong> ${esc(r.status||"")}
    </p>
  `;

  openModal("previewModal");
}

async function shareReq(id){

  const r=requisitions.find(x=>String(x.id)===String(id));
  if(!r) return;

  await shareText(
    `Requisition ${r.req_no}`,
    `CRYSTAL MOTORS (K) LTD\nRequest: ${r.req_no}\nItem: ${r.item_description}\nQuantity: ${r.quantity}\nTotal: ${money(r.total_amount)}`
  );
}

async function deleteReq(id){

  if(!confirm("Delete this requisition?")) return;

  const r=await supabase.from("requisitions").delete().eq("id",id);

  if(r.error){
    toast(r.error.message,"error");
    return;
  }

  toast("Requisition deleted.");
  await loadAllData();
}


/* =========================================================
   INVOICES
   ========================================================= */

function invoiceTotals(i){
  const subtotal=
    num(i.labour)+num(i.parts)+num(i.other);

  const balance=
    Math.max(subtotal-num(i.paid),0);

  return {subtotal,balance};
}

function renderInvoices(){

  const body=$("invoicesTableBody");
  if(!body) return;

  const q=($("invoiceSearch")?.value||"").toLowerCase();
  const s=($("invoiceStatusFilter")?.value||"").toLowerCase();

  const rows=invoices.filter(i=>{

    const v=vehicles.find(x=>
      String(x.id)===String(i.vehicle_id)
    );

    const text=[
      i.invoice_no,i.customer,i.job_description,
      i.status,v?.registration
    ].join(" ").toLowerCase();

    return (!q||text.includes(q)) &&
      (!s||String(i.status||"").toLowerCase()===s);
  });

  if(!rows.length){
    body.innerHTML=
      `<tr><td colspan="8" style="text-align:center;padding:30px">No invoices found.</td></tr>`;
    return;
  }

  body.innerHTML=rows.map(i=>{
    const t=invoiceTotals(i);

    return `
      <tr>
        <td>${esc(i.invoice_no)}</td>
        <td>${dateText(i.invoice_date)}</td>
        <td>${esc(i.customer||"")}</td>
        <td>${esc(i.job_description||"")}</td>
        <td>${money(t.subtotal)}</td>
        <td>${money(i.paid)}</td>
        <td>${money(t.balance)}</td>
        <td>
          <div class="table-actions">
            <button class="action-btn" title="Edit"
              onclick="openInvoiceModal('${i.id}')">✏️</button>
            <button class="action-btn" title="View"
              onclick="viewInvoice('${i.id}')">👁️</button>
            <button class="action-btn" title="Share"
              onclick="shareInvoice('${i.id}')">📤</button>
            <button class="action-btn" title="Delete"
              onclick="deleteInvoice('${i.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openInvoiceModal(id=null,vehicleId=null){

  editingInvoiceId=id;
  populateVehicleSelects();

  if($("invoiceForm")) $("invoiceForm").reset();

  if($("invoiceDate"))
    $("invoiceDate").value=today();

  if($("invoiceModalTitle"))
    $("invoiceModalTitle").textContent=id?"Edit Invoice":"Add Invoice";

  if(!id&&vehicleId){

    $("invoiceVehicle").value=vehicleId;

    const v=vehicles.find(x=>
      String(x.id)===String(vehicleId)
    );

    if(v){
      $("invoiceCustomer").value=v.customer||"";
      $("invoiceJobDescription").value=
        `${v.registration} - ${v.job_type||"Repair"}`;
    }
  }

  if(id){

    const i=invoices.find(x=>String(x.id)===String(id));
    if(!i) return;

    $("invoiceId").value=i.id;
    $("invoiceNo").value=i.invoice_no||"";
    $("invoiceDate").value=i.invoice_date||"";
    $("invoiceVehicle").value=i.vehicle_id||"";
    $("invoiceCustomer").value=i.customer||"";
    $("invoiceJobDescription").value=i.job_description||"";
    $("invoiceLabour").value=num(i.labour);
    $("invoiceParts").value=num(i.parts);
    $("invoiceOther").value=num(i.other);
    $("invoiceSubtotal").value=invoiceTotals(i).subtotal;
    $("invoicePaid").value=num(i.paid);
    $("invoiceBalance").value=invoiceTotals(i).balance;
    $("invoiceStatus").value=i.status||"Pending";
    $("invoiceNotes").value=i.notes||"";
  }

  openModal("invoiceModal");
}

async function saveInvoice(event){

  event.preventDefault();

  const labour=num($("invoiceLabour")?.value);
  const parts=num($("invoiceParts")?.value);
  const other=num($("invoiceOther")?.value);
  const subtotal=labour+parts+other;
  const paid=num($("invoicePaid")?.value);

  const payload={
    invoice_no:$("invoiceNo")?.value.trim(),
    invoice_date:$("invoiceDate")?.value||today(),
    vehicle_id:$("invoiceVehicle")?.value||null,
    customer:$("invoiceCustomer")?.value.trim()||null,
    job_description:$("invoiceJobDescription")?.value.trim()||null,
    labour,
    parts,
    other,
    subtotal,
    paid,
    balance:Math.max(subtotal-paid,0),
    status:$("invoiceStatus")?.value||"Pending",
    notes:$("invoiceNotes")?.value.trim()||null
  };

  if(!payload.invoice_no){
    toast("Invoice number is required.","error");
    return;
  }

  const r=editingInvoiceId
    ? await supabase.from("invoices")
        .update(payload).eq("id",editingInvoiceId).select("*").single()
    : await supabase.from("invoices")
        .insert(payload).select("*").single();

  if(r.error){
    toast(r.error.message,"error");
    return;
  }

  closeModal("invoiceModal");
  toast(editingInvoiceId?"Invoice updated.":"Invoice added.");
  await loadAllData();
}

function invoiceHtml(i){

  const v=vehicles.find(x=>
    String(x.id)===String(i.vehicle_id)
  );

  const t=invoiceTotals(i);

  return `
    <div class="garage-company-box">
      <h3>CRYSTAL MOTORS (K) LTD</h3>
      <div>P.O. Box 54385 – 00200, Nairobi</div>
      <div>Cell: 0722 707124 | 0723 914 222</div>
      <div>Off Mombasa Road, Along Quarry Road, Near Mlolongo Weighbridge</div>
    </div>

    <h2>INVOICE</h2>

    <p>
      <strong>Invoice No:</strong> ${esc(i.invoice_no)}<br>
      <strong>Date:</strong> ${dateText(i.invoice_date)}<br>
      <strong>Customer:</strong> ${esc(i.customer||"")}<br>
      <strong>Vehicle:</strong> ${esc(v?.registration||"")}
    </p>

    <table class="estimate-items">
      <tr><th>Description</th><th>Amount</th></tr>
      <tr><td>Labour</td><td>${money(i.labour)}</td></tr>
      <tr><td>Parts</td><td>${money(i.parts)}</td></tr>
      <tr><td>Other</td><td>${money(i.other)}</td></tr>
      <tr><th>Subtotal</th><th>${money(t.subtotal)}</th></tr>
      <tr><th>Paid</th><th>${money(i.paid)}</th></tr>
      <tr><th>Balance</th><th>${money(t.balance)}</th></tr>
    </table>

    <p>${esc(i.notes||"")}</p>
  `;
}

function viewInvoice(id){

  const i=invoices.find(x=>String(x.id)===String(id));
  if(!i) return;

  $("previewTitle").textContent="Invoice";
  $("previewContent").innerHTML=invoiceHtml(i);

  openModal("previewModal");
}

async function shareInvoice(id){

  const i=invoices.find(x=>String(x.id)===String(id));
  if(!i) return;

  const t=invoiceTotals(i);

  await shareText(
    `Invoice ${i.invoice_no}`,
    [
      "CRYSTAL MOTORS (K) LTD",
      "P.O. Box 54385 – 00200, Nairobi",
      "Cell: 0722 707124 | 0723 914 222",
      "",
      `Invoice: ${i.invoice_no}`,
      `Customer: ${i.customer||""}`,
      `Subtotal: ${money(t.subtotal)}`,
      `Paid: ${money(i.paid)}`,
      `Balance: ${money(t.balance)}`
    ].join("\n")
  );
}

async function deleteInvoice(id){

  if(!confirm("Delete this invoice?")) return;

  const r=await supabase.from("invoices").delete().eq("id",id);

  if(r.error){
    toast(r.error.message,"error");
    return;
  }

  toast("Invoice deleted.");
  await loadAllData();
}


/* =========================================================
   GATE PASSES
   ========================================================= */

function renderGatePasses(){

  const body=$("gatePassesTableBody");
  if(!body) return;

  const q=($("gateSearch")?.value||"").toLowerCase();
  const s=($("gateStatusFilter")?.value||"").toLowerCase();

  const rows=gatePasses.filter(g=>{

    const v=vehicles.find(x=>
      String(x.id)===String(g.vehicle_id)
    );

    const text=[
      g.gate_pass_no,
      g.registration,
      g.customer,
      g.released_to,
      g.status,
      v?.registration
    ].join(" ").toLowerCase();

    return (!q||text.includes(q)) &&
      (!s||String(g.status||"").toLowerCase()===s);
  });

  if(!rows.length){

    body.innerHTML=
      `<tr><td colspan="8" style="text-align:center;padding:30px">
        No gate passes found.
      </td></tr>`;

    return;
  }

  body.innerHTML=rows.map(g=>`

    <tr>

      <td>${esc(g.gate_pass_no)}</td>

      <td>${dateText(g.gate_pass_date)}</td>

      <td>
        <strong>${esc(
          g.registration||
          vehicles.find(v=>String(v.id)===String(g.vehicle_id))?.registration||
          ""
        )}</strong>
      </td>

      <td>${esc(g.customer||"")}</td>

      <td>${esc(g.released_to||"")}</td>

      <td>${money(g.paid)}</td>

      <td>${statusBadge(g.status||"Pending")}</td>

      <td>
        <div class="table-actions">

          <button class="action-btn"
            title="Edit"
            onclick="openGatePassModal('${g.id}')">✏️</button>

          <button class="action-btn"
            title="View"
            onclick="viewGatePass('${g.id}')">👁️</button>

          <button class="action-btn"
            title="Share"
            onclick="shareGatePass('${g.id}')">📤</button>

          <button class="action-btn"
            title="Delete"
            onclick="deleteGatePass('${g.id}')">🗑️</button>

        </div>
      </td>

    </tr>

  `).join("");
}

function openGatePassModal(id=null,vehicleId=null){

  editingGatePassId=id;

  populateVehicleSelects();

  if($("gatePassForm"))
    $("gatePassForm").reset();

  if($("gatePassDate"))
    $("gatePassDate").value=today();

  if($("gatePassModalTitle"))
    $("gatePassModalTitle").textContent=
      id?"Edit Gate Pass":"Add Gate Pass";

  if(!id&&vehicleId){

    $("gateVehicle").value=vehicleId;

    const v=vehicles.find(x=>
      String(x.id)===String(vehicleId)
    );

    if(v){

      $("gateVehicleRegistration").value=
        v.registration||"";

      $("gateCustomer").value=
        v.customer||"";

      $("gateReleasedTo").value=
        v.released_to||"";

      $("gateReleasedContact").value=
        v.released_contact||"";
    }
  }

  if(id){

    const g=gatePasses.find(x=>String(x.id)===String(id));
    if(!g) return;

    $("gatePassId").value=g.id;
    $("gatePassNo").value=g.gate_pass_no||"";
    $("gatePassDate").value=g.gate_pass_date||"";
    $("gateVehicle").value=g.vehicle_id||"";
    $("gateVehicleRegistration").value=g.registration||"";
    $("gateCustomer").value=g.customer||"";
    $("gateReleasedTo").value=g.released_to||"";
    $("gateReleasedContact").value=g.released_contact||"";
    $("gateInvoice").value=g.invoice_id||"";
    $("gatePaid").value=num(g.paid);
    $("gateBalance").value=num(g.balance);
    $("gateAuthorizedBy").value=g.authorized_by||"";
    $("gateStatus").value=g.status||"Pending";
    $("gateNotes").value=g.notes||"";

    setGateCompanyFields(g);
  }

  ensureGateCompanyFields();

  openModal("gatePassModal");
}

function ensureGateCompanyFields(){

  const form=$("gatePassForm");
  if(!form) return;

  if($("gateCompanyName")) return;

  const wrapper=document.createElement("div");

  wrapper.style.marginBottom="12px";

  wrapper.innerHTML=`

    <label>
      Company
      <select id="gateCompanySelect">
        <option value="crystal">CRYSTAL MOTORS (K) LTD</option>
        <option value="quarry">QUARRY ROUTE MOTORS LTD</option>
        <option value="other">OTHER</option>
      </select>
    </label>

    <div id="gateOtherCompany" style="display:none">

      <input id="gateCompanyName"
        placeholder="Other company name">

      <input id="gateCompanyAddress"
        placeholder="Company address">

      <input id="gateCompanyPhone"
        placeholder="Company phone">

      <input id="gateCompanyEmail"
        placeholder="Company email">

    </div>
  `;

  form.insertBefore(wrapper,form.firstChild);

  $("gateCompanySelect").addEventListener("change",()=>{

    const other=
      $("gateCompanySelect").value==="other";

    $("gateOtherCompany").style.display=
      other?"block":"none";
  });
}

function setGateCompanyFields(g){

  ensureGateCompanyFields();

  const key=companyKey(g.company_name);

  if($("gateCompanySelect"))
    $("gateCompanySelect").value=key;

  if($("gateOtherCompany"))
    $("gateOtherCompany").style.display=
      key==="other"?"block":"none";

  if(key==="other"){

    if($("gateCompanyName"))
      $("gateCompanyName").value=g.company_name||"";

    if($("gateCompanyAddress"))
      $("gateCompanyAddress").value=g.company_address||"";

    if($("gateCompanyPhone"))
      $("gateCompanyPhone").value=g.company_phone||"";

    if($("gateCompanyEmail"))
      $("gateCompanyEmail").value=g.company_email||"";
  }
}

function getGateCompany(){

  ensureGateCompanyFields();

  const key=$("gateCompanySelect")?.value||"crystal";

  if(key!=="other")
    return COMPANIES[key];

  return {
    name:$("gateCompanyName")?.value.trim()||"OTHER",
    address:$("gateCompanyAddress")?.value.trim()||"",
    phone:$("gateCompanyPhone")?.value.trim()||"",
    location:"",
    email:$("gateCompanyEmail")?.value.trim()||""
  };
}

async function saveGatePass(event){

  event.preventDefault();

  const company=getGateCompany();

  const vehicleId=$("gateVehicle")?.value||null;

  const v=vehicles.find(x=>
    String(x.id)===String(vehicleId)
  );

  const payload={
    gate_pass_no:$("gatePassNo")?.value.trim(),
    gate_pass_date:$("gatePassDate")?.value||today(),

    vehicle_id:vehicleId,

    registration:
      $("gateVehicleRegistration")?.value.trim()||
      v?.registration||
      null,

    customer:
      $("gateCustomer")?.value.trim()||
      v?.customer||
      null,

    released_to:
      $("gateReleasedTo")?.value.trim()||null,

    released_contact:
      $("gateReleasedContact")?.value.trim()||null,

    invoice_id:$("gateInvoice")?.value||null,

    paid:num($("gatePaid")?.value),
    balance:num($("gateBalance")?.value),

    authorized_by:
      $("gateAuthorizedBy")?.value.trim()||null,

    status:
      $("gateStatus")?.value||"Pending",

    notes:
      $("gateNotes")?.value.trim()||null,

    company_name:company.name,
    company_address:company.address,
    company_phone:company.phone,
    company_email:company.email
  };

  if(!payload.gate_pass_no){
    toast("Gate Pass number is required.","error");
    return;
  }

  try{

    let r;

    if(editingGatePassId){

      r=await supabase
        .from("gate_passes")
        .update(payload)
        .eq("id",editingGatePassId)
        .select("*")
        .single();

    }else{

      r=await supabase
        .from("gate_passes")
        .insert(payload)
        .select("*")
        .single();
    }

    if(r.error){

      /*
       * If company columns have not yet been added,
       * retry with the original Gate Pass columns.
       */
      const message=String(r.error.message||"").toLowerCase();

      if(
        message.includes("company_name")||
        message.includes("company_address")||
        message.includes("company_phone")||
        message.includes("company_email")
      ){

        delete payload.company_name;
        delete payload.company_address;
        delete payload.company_phone;
        delete payload.company_email;

        r=editingGatePassId
          ? await supabase.from("gate_passes")
              .update(payload)
              .eq("id",editingGatePassId)
              .select("*").single()
          : await supabase.from("gate_passes")
              .insert(payload)
              .select("*").single();
      }
    }

    if(r.error) throw r.error;

    closeModal("gatePassModal");

    toast(
      editingGatePassId
        ? "Gate Pass updated."
        : "Gate Pass added."
    );

    await loadAllData();

  }catch(error){

    console.error(error);

    toast(
      error.message||
      "Could not save Gate Pass.",
      "error"
    );
  }
}

function gatePassHtml(g){

  const c=companyFromRow(g);

  const v=vehicles.find(x=>
    String(x.id)===String(g.vehicle_id)
  );

  return `

    <div class="garage-company-box">

      <h3>${esc(c.name)}</h3>

      <div>${esc(c.address)}</div>

      <div>${esc(c.phone)}</div>

      <div>${esc(c.location)}</div>

      ${
        c.email
        ? `<div>${esc(c.email)}</div>`
        : ""
      }

    </div>

    <h2>GATE PASS</h2>

    <p>

      <strong>Gate Pass No:</strong>
      ${esc(g.gate_pass_no)}<br>

      <strong>Date:</strong>
      ${dateText(g.gate_pass_date)}<br>

      <strong>Registration:</strong>
      ${esc(g.registration||v?.registration||"")}<br>

      <strong>Customer:</strong>
      ${esc(g.customer||v?.customer||"")}<br>

      <strong>Released To:</strong>
      ${esc(g.released_to||"")}<br>

      <strong>Contact:</strong>
      ${esc(g.released_contact||"")}<br>

      <strong>Paid:</strong>
      ${money(g.paid)}<br>

      <strong>Balance:</strong>
      ${money(g.balance)}<br>

      <strong>Authorized By:</strong>
      ${esc(g.authorized_by||"")}<br>

      <strong>Status:</strong>
      ${esc(g.status||"Pending")}

    </p>

    <p>${esc(g.notes||"")}</p>
  `;
}

function viewGatePass(id){

  const g=gatePasses.find(x=>String(x.id)===String(id));
  if(!g) return;

  $("previewTitle").textContent="Gate Pass";
  $("previewContent").innerHTML=gatePassHtml(g);

  openModal("previewModal");
}

async function shareGatePass(id){

  const g=gatePasses.find(x=>String(x.id)===String(id));
  if(!g) return;

  const c=companyFromRow(g);

  await shareText(
    `Gate Pass ${g.gate_pass_no}`,
    [
      c.name,
      c.address,
      c.phone,
      c.location,
      c.email,
      "",
      "GATE PASS",
      `Gate Pass No: ${g.gate_pass_no}`,
      `Date: ${dateText(g.gate_pass_date)}`,
      `Registration: ${g.registration||""}`,
      `Customer: ${g.customer||""}`,
      `Released To: ${g.released_to||""}`,
      `Contact: ${g.released_contact||""}`,
      `Paid: ${money(g.paid)}`,
      `Balance: ${money(g.balance)}`,
      `Authorized By: ${g.authorized_by||""}`
    ].filter(Boolean).join("\n")
  );
}

async function deleteGatePass(id){

  if(!confirm("Delete this Gate Pass?")) return;

  const r=await supabase
    .from("gate_passes")
    .delete()
    .eq("id",id);

  if(r.error){
    toast(r.error.message,"error");
    return;
  }

  toast("Gate Pass deleted.");
  await loadAllData();
}


/* =========================================================
   ESTIMATES / QUOTATIONS
   ========================================================= */

function ensureEstimateSection(){

  if($("estimates")) return;

  const app=$("app");
  if(!app) return;

  const section=document.createElement("section");

  section.id="estimates";
  section.className="section";
  section.style.display="none";

  section.innerHTML=`

    <div class="section-header">

      <div>
        <h2>Estimates / Quotations</h2>
        <p>Create, edit, print and share repair estimates.</p>
      </div>

      <button class="primary-btn"
        onclick="openEstimateModal()">＋ New Estimate</button>

    </div>

    <div class="card">

      <div style="
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        margin-bottom:15px
      ">

        <input
          id="estimateSearch"
          placeholder="Search estimate, vehicle or customer"
          style="flex:1;min-width:220px"
        >

      </div>

      <div style="overflow:auto">

        <table>

          <thead>
            <tr>
              <th>Estimate No.</th>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody id="estimatesTableBody"></tbody>

        </table>

      </div>

    </div>

    <div id="estimateModal"
      class="modal"
      style="display:none">

      <div class="modal-content"
        style="max-width:950px">

        <div class="modal-header">

          <h2 id="estimateModalTitle">
            New Estimate
          </h2>

          <button type="button"
            onclick="closeModal('estimateModal')">✕</button>

        </div>

        <form id="estimateForm">

          <input type="hidden" id="estimateId">

          <div class="form-grid">

            <label>
              Estimate No.
              <input id="estimateNo" required>
            </label>

            <label>
              Date
              <input id="estimateDate" type="date" required>
            </label>

            <label>
              Company
              <select id="estimateCompany">

                <option value="crystal">
                  CRYSTAL MOTORS (K) LTD
                </option>

                <option value="quarry">
                  QUARRY ROUTE MOTORS LTD
                </option>

                <option value="other">
                  OTHER
                </option>

              </select>
            </label>

            <label>
              Vehicle
              <select id="estimateVehicle">
                <option value="">Select Vehicle</option>
              </select>
            </label>

            <label>
              Customer
              <input id="estimateCustomer">
            </label>

            <label>
              Customer Phone
              <input id="estimateCustomerPhone">
            </label>

            <label>
              Registration
              <input id="estimateRegistration">
            </label>

            <label>
              Chassis No.
              <input id="estimateChassis">
            </label>

            <label>
              Vehicle Model
              <input id="estimateModel">
            </label>

            <label>
              Vehicle Year
              <input id="estimateYear">
            </label>

            <label>
              VAT %
              <input id="estimateVat" type="number" value="16">
            </label>

          </div>

          <h3 style="margin-top:20px">
            Estimate Items
          </h3>

          <div style="overflow:auto">

            <table class="estimate-items">

              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Cost</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>

              <tbody id="estimateItemsBody"></tbody>

            </table>

          </div>

          <button
            type="button"
            class="action-btn"
            style="width:auto!important;padding:0 12px!important;margin-top:10px"
            onclick="addEstimateItem()">
            ＋ Add Item
          </button>

          <div style="
            margin-top:20px;
            text-align:right
          ">

            <p>
              Subtotal:
              <strong id="estimateSubtotal">KSh 0.00</strong>
            </p>

            <p>
              VAT:
              <strong id="estimateVatAmount">KSh 0.00</strong>
            </p>

            <h2>
              Total:
              <strong id="estimateTotal">KSh 0.00</strong>
            </h2>

          </div>

          <label>
            Notes
            <textarea id="estimateNotes"></textarea>
          </label>

          <div style="
            display:flex;
            gap:8px;
            justify-content:flex-end;
            margin-top:15px
          ">

            <button type="button"
              onclick="closeModal('estimateModal')">
              Cancel
            </button>

            <button type="submit"
              class="primary-btn">
              Save Estimate
            </button>

          </div>

        </form>

      </div>

    </div>
  `;

  app.appendChild(section);

  $("estimateForm").addEventListener(
    "submit",
    saveEstimate
  );

  $("estimateVehicle").addEventListener(
    "change",
    fillEstimateVehicle
  );

  $("estimateCompany").addEventListener(
    "change",
    updateEstimateCompany
  );

  $("estimateVat").addEventListener(
    "input",
    calculateEstimate
  );

  $("estimateSearch").addEventListener(
    "input",
    renderEstimates
  );
}

function resetEstimateForm(){

  editingEstimateId=null;

  $("estimateForm")?.reset();

  $("estimateDate").value=today();
  $("estimateVat").value=16;

  $("estimateNo").value=
    `EST-${new Date().getFullYear()}-${String(estimates.length+1).padStart(4,"0")}`;

  $("estimateItemsBody").innerHTML="";

  addEstimateItem();
  calculateEstimate();

  $("estimateModalTitle").textContent=
    "New Estimate";
}

function openEstimateModal(id=null){

  ensureEstimateSection();
  populateEstimateVehicleSelect();

  resetEstimateForm();

  if(id){

    const e=estimates.find(x=>String(x.id)===String(id));
    if(!e) return;

    editingEstimateId=e.id;

    $("estimateId").value=e.id;
    $("estimateNo").value=e.estimate_no||"";
    $("estimateDate").value=e.estimate_date||"";
    $("estimateCustomer").value=e.customer||"";
    $("estimateCustomerPhone").value=e.customer_phone||"";
    $("estimateVehicle").value=e.vehicle_id||"";
    $("estimateRegistration").value=e.registration||"";
    $("estimateChassis").value=e.chassis_no||"";
    $("estimateModel").value=e.vehicle_model||e.model||"";
    $("estimateYear").value=e.vehicle_year||e.model_year||"";
    $("estimateVat").value=num(e.vat_rate)||16;
    $("estimateNotes").value=e.notes||"";

    $("estimateCompany").value=companyKey(e.company_name);

    const items=Array.isArray(e.items)?e.items:[];

    $("estimateItemsBody").innerHTML="";

    if(items.length)
      items.forEach(addEstimateItem);
    else
      addEstimateItem();

    $("estimateModalTitle").textContent=
      "Edit Estimate";

    calculateEstimate();
  }

  openModal("estimateModal");
}

function populateEstimateVehicleSelect(){

  const select=$("estimateVehicle");
  if(!select) return;

  const old=select.value;

  select.innerHTML=
    `<option value="">Select Vehicle</option>`+
    vehicles.map(v=>`
      <option value="${esc(v.id)}">
        ${esc(v.registration)}
        ${v.customer?" — "+esc(v.customer):""}
      </option>
    `).join("");

  if([...select.options].some(o=>o.value===old))
    select.value=old;
}

function fillEstimateVehicle(){

  const v=vehicles.find(x=>
    String(x.id)===
    String($("estimateVehicle").value)
  );

  if(!v) return;

  $("estimateCustomer").value=v.customer||"";
  $("estimateRegistration").value=v.registration||"";
  $("estimateModel").value=v.model||"";
  $("estimateYear").value=v.model_year||"";
}

function updateEstimateCompany(){

  const key=$("estimateCompany").value;

  if(key!=="other"){

    const c=COMPANIES[key];

    if(c)
      $("estimateCompany").title=
        `${c.name} | ${c.address} | ${c.phone}`;
  }
}

function addEstimateItem(item={}){

  const body=$("estimateItemsBody");
  if(!body) return;

  const tr=document.createElement("tr");

  tr.innerHTML=`

    <td>
      <input
        class="estimate-desc"
        value="${esc(item.description||"")}"
        placeholder="Repair / part description">
    </td>

    <td>
      <input
        class="estimate-qty"
        type="number"
        min="0"
        step="0.01"
        value="${num(item.quantity)||1}">
    </td>

    <td>
      <input
        class="estimate-price"
        type="number"
        min="0"
        step="0.01"
        value="${num(item.unit_cost)}">
    </td>

    <td class="estimate-line-total">
      ${money(num(item.quantity)*num(item.unit_cost))}
    </td>

    <td>
      <button
        type="button"
        class="action-btn"
        title="Remove"
        onclick="this.closest('tr').remove();calculateEstimate()">
        🗑️
      </button>
    </td>
  `;

  body.appendChild(tr);

  tr.querySelectorAll("input").forEach(input=>
    input.addEventListener("input",calculateEstimate)
  );

  calculateEstimate();
}

function getEstimateItems(){

  return [...document.querySelectorAll("#estimateItemsBody tr")]
    .map(tr=>{

      const description=
        tr.querySelector(".estimate-desc")?.value.trim();

      const quantity=
        num(tr.querySelector(".estimate-qty")?.value);

      const unit_cost=
        num(tr.querySelector(".estimate-price")?.value);

      return {
        description,
        quantity,
        unit_cost,
        total:quantity*unit_cost
      };
    })
    .filter(x=>x.description||x.unit_cost);
}

function calculateEstimate(){

  const items=getEstimateItems();

  const subtotal=items.reduce(
    (a,i)=>a+i.total,0
  );

  const vatRate=num($("estimateVat")?.value);
  const vatAmount=subtotal*vatRate/100;
  const total=subtotal+vatAmount;

  document.querySelectorAll(
    "#estimateItemsBody tr"
  ).forEach(tr=>{

    const qty=num(tr.querySelector(".estimate-qty")?.value);
    const price=num(tr.querySelector(".estimate-price")?.value);

    const cell=tr.querySelector(".estimate-line-total");

    if(cell)
      cell.textContent=money(qty*price);
  });

  if($("estimateSubtotal"))
    $("estimateSubtotal").textContent=money(subtotal);

  if($("estimateVatAmount"))
    $("estimateVatAmount").textContent=money(vatAmount);

  if($("estimateTotal"))
    $("estimateTotal").textContent=money(total);

  return {items,subtotal,vatRate,vatAmount,total};
}

async function saveEstimate(event){

  event.preventDefault();

  const calc=calculateEstimate();

  const companyKeyValue=
    $("estimateCompany").value;

  let company;

  if(companyKeyValue==="other"){

    const name=prompt(
      "Enter the OTHER company name:"
    );

    if(!name){
      toast("Company name is required.","error");
      return;
    }

    company={
      name,
      address:"",
      phone:"",
      email:""
    };

  }else{

    company=COMPANIES[companyKeyValue];
  }

  const payload={
    estimate_no:$("estimateNo").value.trim(),
    estimate_date:$("estimateDate").value||today(),

    company_name:company.name,
    company_address:company.address,
    company_phone:company.phone,
    company_email:company.email,

    customer:$("estimateCustomer").value.trim()||null,
    customer_phone:$("estimateCustomerPhone").value.trim()||null,

    vehicle_id:$("estimateVehicle").value||null,

    registration:$("estimateRegistration").value.trim()||null,
    chassis_no:$("estimateChassis").value.trim()||null,
    vehicle_year:$("estimateYear").value.trim()||null,
    vehicle_model:$("estimateModel").value.trim()||null,

    subtotal:calc.subtotal,
    vat_rate:calc.vatRate,
    vat_amount:calc.vatAmount,
    total_amount:calc.total,

    notes:$("estimateNotes").value.trim()||null,

    items:calc.items
  };

  if(!payload.estimate_no){
    toast("Estimate number is required.","error");
    return;
  }

  const duplicate=estimates.some(e=>
    String(e.estimate_no).toLowerCase()===
    payload.estimate_no.toLowerCase() &&
    String(e.id)!==String(editingEstimateId||"")
  );

  if(duplicate){
    toast("That estimate number already exists.","error");
    return;
  }

  try{

    let r;

    if(editingEstimateId){

      r=await supabase
        .from("estimates")
        .update(payload)
        .eq("id",editingEstimateId)
        .select("*")
        .single();

    }else{

      r=await supabase
        .from("estimates")
        .insert(payload)
        .select("*")
        .single();
    }

    if(r.error) throw r.error;

    closeModal("estimateModal");

    toast(
      editingEstimateId
        ?"Estimate updated."
        :"Estimate created."
    );

    await loadAllData();

  }catch(error){

    console.error(error);

    toast(
      error.message||
      "Could not save estimate. Make sure the estimates table exists.",
      "error"
    );
  }
}

function renderEstimates(){

  ensureEstimateSection();

  const body=$("estimatesTableBody");
  if(!body) return;

  const q=($("estimateSearch")?.value||"").toLowerCase();

  const rows=estimates.filter(e=>{

    const v=vehicles.find(x=>
      String(x.id)===String(e.vehicle_id)
    );

    return !q||[
      e.estimate_no,
      e.customer,
      e.registration,
      e.company_name,
      v?.registration
    ].join(" ").toLowerCase().includes(q);
  });

  if(!rows.length){

    body.innerHTML=`
      <tr>
        <td colspan="6"
          style="text-align:center;padding:30px">
          No estimates found.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML=rows.map(e=>`

    <tr>

      <td><strong>${esc(e.estimate_no)}</strong></td>

      <td>${dateText(e.estimate_date)}</td>

      <td>${esc(e.registration||"")}</td>

      <td>${esc(e.customer||"")}</td>

      <td><strong>${money(e.total_amount)}</strong></td>

      <td>

        <div class="table-actions">

          <button class="action-btn"
            title="Edit"
            onclick="openEstimateModal('${e.id}')">
            ✏️
          </button>

          <button class="action-btn"
            title="View"
            onclick="viewEstimate('${e.id}')">
            👁️
          </button>

          <button class="action-btn"
            title="Share"
            onclick="shareEstimate('${e.id}')">
            📤
          </button>

          <button class="action-btn"
            title="Delete"
            onclick="deleteEstimate('${e.id}')">
            🗑️
          </button>

        </div>

      </td>

    </tr>

  `).join("");
}

function estimateHtml(e){

  const c=companyFromRow(e);

  const items=Array.isArray(e.items)?e.items:[];

  return `

    <div class="garage-company-box">

      <h3>${esc(c.name)}</h3>

      <div>${esc(c.address)}</div>

      <div>${esc(c.phone)}</div>

      <div>${esc(c.location)}</div>

      ${
        c.email
        ? `<div>${esc(c.email)}</div>`
        :""
      }

    </div>

    <h2>REPAIR ESTIMATE / QUOTATION</h2>

    <p>

      <strong>Estimate No:</strong>
      ${esc(e.estimate_no)}<br>

      <strong>Date:</strong>
      ${dateText(e.estimate_date)}<br>

      <strong>Customer:</strong>
      ${esc(e.customer||"")}<br>

      <strong>Vehicle:</strong>
      ${esc(e.registration||"")}<br>

      <strong>Model:</strong>
      ${esc(e.vehicle_model||"")}<br>

      <strong>Year:</strong>
      ${esc(e.vehicle_year||"")}

    </p>

    <table class="estimate-items">

      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit Cost</th>
          <th>Total</th>
        </tr>
      </thead>

      <tbody>

        ${
          items.length
          ? items.map(i=>`
            <tr>
              <td>${esc(i.description)}</td>
              <td>${num(i.quantity)}</td>
              <td>${money(i.unit_cost)}</td>
              <td>${money(i.total)}</td>
            </tr>
          `).join("")
          : `
            <tr>
              <td colspan="4">No items.</td>
            </tr>
          `
        }

      </tbody>

      <tfoot>

        <tr>
          <th colspan="3" style="text-align:right">
            SUBTOTAL
          </th>
          <th>${money(e.subtotal)}</th>
        </tr>

        <tr>
          <th colspan="3" style="text-align:right">
            VAT (${num(e.vat_rate)}%)
          </th>
          <th>${money(e.vat_amount)}</th>
        </tr>

        <tr>
          <th colspan="3" style="text-align:right">
            TOTAL
          </th>
          <th>${money(e.total_amount)}</th>
        </tr>

      </tfoot>

    </table>

    <p>${esc(e.notes||"")}</p>
  `;
}

function viewEstimate(id){

  const e=estimates.find(x=>String(x.id)===String(id));
  if(!e) return;

  $("previewTitle").textContent=
    "Estimate / Quotation";

  $("previewContent").innerHTML=
    estimateHtml(e);

  openModal("previewModal");
}

async function shareEstimate(id){

  const e=estimates.find(x=>String(x.id)===String(id));
  if(!e) return;

  const c=companyFromRow(e);

  await shareText(
    `Estimate ${e.estimate_no}`,
    [
      c.name,
      c.address,
      c.phone,
      c.location,
      c.email,
      "",
      "REPAIR ESTIMATE / QUOTATION",
      `Estimate No: ${e.estimate_no}`,
      `Customer: ${e.customer||""}`,
      `Vehicle: ${e.registration||""}`,
      "",
      `Subtotal: ${money(e.subtotal)}`,
      `VAT: ${money(e.vat_amount)}`,
      `TOTAL: ${money(e.total_amount)}`
    ].filter(Boolean).join("\n")
  );
}

async function deleteEstimate(id){

  if(!confirm("Delete this estimate?")) return;

  const r=await supabase
    .from("estimates")
    .delete()
    .eq("id",id);

  if(r.error){
    toast(r.error.message,"error");
    return;
  }

  toast("Estimate deleted.");
  await loadAllData();
}


/* =========================================================
   PRINT
   ========================================================= */

function printHtml(title,html){

  const w=window.open("","_blank");

  if(!w){

    toast(
      "Pop-up blocked. Allow pop-ups to print.",
      "warning"
    );

    return;
  }

  w.document.write(`
    <!doctype html>
    <html>
    <head>

      <title>${esc(title)}</title>

      <style>

        body{
          font-family:Arial,sans-serif;
          padding:25px;
          color:#111827;
        }

        h1,h2,h3{
          color:#0f172a;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:15px;
        }

        th,td{
          border:1px solid #cbd5e1;
          padding:8px;
          text-align:left;
        }

        th{
          background:#f1f5f9;
        }

        .garage-company-box{
          border-bottom:2px solid #0f172a;
          padding-bottom:12px;
          margin-bottom:20px;
        }

        @media print{
          body{padding:10px}
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

  w.document.close();
}


/* =========================================================
   PRINT WRAPPERS
   ========================================================= */

function printPettyCash(){

  printHtml(
    "Petty Cash Report",
    `<h2>PETTY CASH REPORT</h2>
     <table>${$("pettyTableBody")?.closest("table")?.innerHTML||""}</table>`
  );
}

function printRequisitions(){

  printHtml(
    "Requisitions",
    `<h2>REQUISITIONS</h2>
     <table>${$("requisitionsTableBody")?.closest("table")?.innerHTML||""}</table>`
  );
}

function printInvoices(){

  printHtml(
    "Invoices",
    `<h2>INVOICES</h2>
     <table>${$("invoicesTableBody")?.closest("table")?.innerHTML||""}</table>`
  );
}

function printGatePasses(){

  printHtml(
    "Gate Passes",
    `<h2>GATE PASSES</h2>
     <table>${$("gatePassesTableBody")?.closest("table")?.innerHTML||""}</table>`
  );
}

function printVehicles(){

  printHtml(
    "Vehicles",
    `<h2>VEHICLES</h2>
     <table>${$("vehiclesTableBody")?.closest("table")?.innerHTML||""}</table>`
  );
}


/* =========================================================
   SEARCH EVENTS
   ========================================================= */

function bind(id,event,fn){

  const x=$(id);

  if(x)
    x.addEventListener(event,fn);
}

function bindEvents(){

  bind("vehicleSearch","input",renderVehicles);
  bind("vehicleStatusFilter","change",renderVehicles);

  bind("expenseSearch","input",renderExpenses);
  bind("expenseCategoryFilter","change",renderExpenses);

  bind("pettySearch","input",renderPettyCash);
  bind("pettyCategoryFilter","change",renderPettyCash);

  bind("reqSearch","input",renderRequisitions);
  bind("reqStatusFilter","change",renderRequisitions);

  bind("invoiceSearch","input",renderInvoices);
  bind("invoiceStatusFilter","change",renderInvoices);

  bind("gateSearch","input",renderGatePasses);
  bind("gateStatusFilter","change",renderGatePasses);

  $("vehicleForm")?.addEventListener(
    "submit",saveVehicle
  );

  $("expenseForm")?.addEventListener(
    "submit",saveExpense
  );

  $("pettyForm")?.addEventListener(
    "submit",savePetty
  );

  $("reqForm")?.addEventListener(
    "submit",saveReq
  );

  $("invoiceForm")?.addEventListener(
    "submit",saveInvoice
  );

  $("gatePassForm")?.addEventListener(
    "submit",saveGatePass
  );

  /*
   * Storage Days updates immediately when
   * Date In / Date Out changes.
   */
  ["vehicleDateIn","vehicleDateOut"].forEach(id=>{

    bind(id,"change",()=>{

      if($("vehicleStorageDays")){

        $("vehicleStorageDays").value=
          storageDays({
            date_in:$("vehicleDateIn").value,
            date_out:$("vehicleDateOut").value
          });
      }
    });
  });
}


/* =========================================================
   GLOBAL FUNCTIONS FOR EXISTING HTML
   ========================================================= */

Object.assign(window,{

  openVehicleModal,
  saveVehicle,
  deleteVehicle,
  viewVehicle,
  shareVehicle,
  printVehicle,

  openExpenseModal,
  saveExpense,
  deleteExpense,
  viewExpense,
  shareExpense,
  printExpenses,

  openPettyModal,
  savePetty,
  deletePetty,
  viewPetty,
  sharePetty,
  printPettyCash,

  openReqModal,
  saveReq,
  deleteReq,
  viewReq,
  shareReq,
  printRequisitions,

  openInvoiceModal,
  saveInvoice,
  deleteInvoice,
  viewInvoice,
  shareInvoice,
  printInvoices,

  openGatePassModal,
  saveGatePass,
  deleteGatePass,
  viewGatePass,
  shareGatePass,
  printGatePasses,

  openEstimateModal,
  saveEstimate,
  viewEstimate,
  shareEstimate,
  deleteEstimate,
  addEstimateItem,

  printVehicles,

  printVehicleExpensePreview,
  printVehicleExpenses:printVehicleExpensePreview,

  closeModal,
  showSection

});


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initGarage(){

  if(window.__garageInitialized) return;
  window.__garageInitialized=true;

  injectStyles();

  setupEstimateNavigation();

  ensureEstimateSection();

  bindEvents();

  setupDashboardCards();

  const logged=
    sessionStorage.getItem("garageLoggedIn");

  if(logged==="true"){

    $("loginPage")?.style &&
      ($("loginPage").style.display="none");

    if($("app"))
      $("app").style.display="block";
  }

  try{

    await loadAllData();

  }catch(error){

    console.error(error);
    toast("Garage data could not be loaded.","error");
  }

  displayUser();

  showSection("dashboard");
}

function displayUser(){

  const user=
    sessionStorage.getItem("garageUser")||
    sessionStorage.getItem("username")||
    "josephine";

  const name=
    user.charAt(0).toUpperCase()+user.slice(1);

  if($("welcomeUser"))
    $("welcomeUser").textContent=name;

  if($("sidebarUser"))
    $("sidebarUser").textContent=name;
}

if(document.readyState==="loading"){

  document.addEventListener(
    "DOMContentLoaded",
    initGarage
  );

}else{

  initGarage();
}
