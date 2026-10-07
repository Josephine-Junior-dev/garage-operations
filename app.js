/* =========================================================
   GARAGE OPERATIONS PRO - COMPLETE SHORT APP.JS
   Supabase: Vehicles / Expenses / Petty Cash / Requisitions
             Invoices / Gate Passes / Estimates
   ========================================================= */

import { createClient } from
"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL =
"https://ptluwoeogfkqavhspdjj.supabase.co";

const SUPABASE_KEY =
"sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* =========================================================
   DATA
   ========================================================= */

let vehicles=[], expenses=[], pettyCash=[], requisitions=[];
let invoices=[], gatePasses=[], estimates=[];

let currentPreview="";
let currentVehicleExpenseId=null;

const COMPANY={
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
  phone:"0722 707124 / 0723 914 222",
  location:"Off Mombasa Road, Along Quarry Road, Near Mlolongo Weigh Bridge",
  email:"info@quarryroutemotors.com | quarryroutemotorsltd@gmail.com"
 },
 other:{
  name:"OTHER",
  address:"",
  phone:"",
  location:"",
  email:""
 }
};

/* =========================================================
   HELPERS
   ========================================================= */

const $=id=>document.getElementById(id);

const esc=s=>String(s??"")
 .replace(/&/g,"&amp;")
 .replace(/</g,"&lt;")
 .replace(/>/g,"&gt;")
 .replace(/"/g,"&quot;");

const money=n=>"KSh "+Number(n||0).toLocaleString("en-KE",{
 minimumFractionDigits:2,
 maximumFractionDigits:2
});

const num=n=>Number(n)||0;

const today=()=>new Date().toISOString().slice(0,10);

const norm=s=>String(s||"").toUpperCase().replace(/[\s-]/g,"");

function toast(msg){
 const t=$("toast");
 if(!t)return alert(msg);
 t.textContent=msg;
 t.style.display="block";
 clearTimeout(window._toast);
 window._toast=setTimeout(()=>t.style.display="none",3000);
}

function closeModal(id){
 const x=$(id);
 if(x)x.style.display="none";
}

function openModal(id){
 const x=$(id);
 if(x)x.style.display="flex";
}

function storageDays(v){
 if(!v?.date_in)return 0;
 const a=new Date(v.date_in+"T00:00:00");
 const b=v.date_out
  ?new Date(v.date_out+"T00:00:00")
  :new Date();
 return Math.max(0,Math.floor((b-a)/86400000)+1);
}

function vehicleById(id){
 return vehicles.find(v=>String(v.id)===String(id));
}

function vehicleReg(id){
 return vehicleById(id)?.registration||"";
}

function vehicleExpenseRows(id){
 return expenses.filter(e=>String(e.vehicle_id)===String(id));
}

function vehicleExpenseTotal(id){
 return vehicleExpenseRows(id)
  .reduce((a,e)=>a+num(e.amount),0);
}

function formVal(id){
 return $(id)?.value?.trim()||"";
}

function setVal(id,v){
 if($(id))$(id).value=v??"";
}

function closeAllModals(){
 document.querySelectorAll(".modal").forEach(x=>x.style.display="none");
}

/* =========================================================
   STYLES
   ========================================================= */

function styles(){
 if($("garageExtraStyle"))return;

 const s=document.createElement("style");
 s.id="garageExtraStyle";
 s.textContent=`
 .table-actions{
  display:flex!important;
  flex-direction:row!important;
  flex-wrap:nowrap!important;
  align-items:center;
  gap:4px;
  white-space:nowrap;
 }
 .action-btn{
  width:34px!important;
  height:32px!important;
  padding:0!important;
  border:0;
  border-radius:7px;
  display:inline-flex!important;
  align-items:center;
  justify-content:center;
  font-size:15px;
  line-height:1;
  cursor:pointer;
 }
 .action-btn.blue{background:#e0f2fe;color:#075985}
 .action-btn.green{background:#dcfce7;color:#166534}
 .action-btn.orange{background:#fef3c7;color:#92400e}
 .action-btn.danger{background:#fee2e2;color:#991b1b}
 .action-btn:hover{transform:translateY(-1px)}
 .expense-total-card{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:14px 18px;
  margin:0 0 12px;
  background:white;
  border:1px solid #dbe4ee;
  border-radius:12px;
  box-shadow:0 2px 8px rgba(15,23,42,.05);
 }
 .expense-total-card strong{font-size:20px}
 .garage-company{
  border:1px solid #dbe4ee;
  border-radius:10px;
  padding:10px;
  margin-bottom:10px;
 }
 #estimates{width:100%;position:relative;clear:both}
 .estimate-items input{width:100%}
 @media(max-width:720px){
  .action-btn{width:32px!important;height:30px!important}
 }
 `;
 document.head.appendChild(s);
}

/* =========================================================
   LOAD DATABASE
   ========================================================= */

async function loadTable(name){
 const {data,error}=await supabase
  .from(name).select("*").order("created_at",{ascending:false});

 if(error){
  console.error(name,error);
  return [];
 }
 return data||[];
}

async function loadAllData(){
 try{
  [
   vehicles,
   expenses,
   pettyCash,
   requisitions,
   invoices,
   gatePasses,
   estimates
  ]=await Promise.all([
   loadTable("vehicles"),
   loadTable("expenses"),
   loadTable("petty_cash"),
   loadTable("requisitions"),
   loadTable("invoices"),
   loadTable("gate_passes"),
   loadTable("estimates")
  ]);

  renderAll();
  toast("Data loaded successfully");
 }catch(e){
  console.error(e);
  toast("Could not load some database records");
 }
}

function renderAll(){
 renderDashboard();
 renderVehicles();
 renderExpenses();
 renderPetty();
 renderReq();
 renderInvoices();
 renderGatePasses();
 if($("estimates"))renderEstimates();
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation(){
 document.querySelectorAll("[data-section]").forEach(b=>{
  if(b.dataset.bound)return;
  b.dataset.bound="1";
  b.addEventListener("click",()=>{
   showSection(b.dataset.section);
  });
 });

 setupEstimateNav();
}

function setupEstimateNav(){
 if(document.querySelector('[data-section="estimates"]'))return;

 const gate=document.querySelector('[data-section="gate-passes"]');

 if(gate){
  const b=gate.cloneNode(true);
  b.dataset.section="estimates";
  b.innerHTML="<span>📋</span><span>Estimates / Quotations</span>";
  b.removeAttribute("onclick");
  b.addEventListener("click",()=>showSection("estimates"));
  gate.parentElement.insertBefore(b,gate.nextSibling);
 }
}

function showSection(section){
 ensureEstimateSection();

 document.querySelectorAll(".section,.app-section").forEach(x=>{
  x.style.display="none";
 });

 const x=$(section);
 if(x){
  x.style.display="block";
  x.classList.add("active");
 }

 if(section==="dashboard")renderDashboard();
 if(section==="vehicles")renderVehicles();
 if(section==="expenses")renderExpenses();
 if(section==="petty-cash")renderPetty();
 if(section==="requisitions")renderReq();
 if(section==="invoices")renderInvoices();
 if(section==="gate-passes")renderGatePasses();
 if(section==="estimates")renderEstimates();
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard(){
 setVal("dashVehicles",vehicles.length);
 setVal("dashRepair",
  vehicles.filter(v=>v.status==="Under Repair").length);

 setVal("dashOutstanding",
  vehicles.reduce((a,v)=>a+num(v.billed)-num(v.paid),0)
 );

 setVal("dashReq",requisitions.filter(r=>r.status==="Pending").length);
 setVal("dashInvoices",invoices.length);
 setVal("dashGatePasses",gatePasses.length);

 setVal("dashBilled",vehicles.reduce((a,v)=>a+num(v.billed),0));
 setVal("dashPaid",vehicles.reduce((a,v)=>a+num(v.paid),0));

 setVal("dashExpenses",
  expenses.reduce((a,e)=>a+num(e.amount),0)
 );

 setVal("dashPetty",
  pettyCash.reduce((a,e)=>a+num(e.amount),0)
 );

 setVal("dashReqCount",
  requisitions.filter(r=>r.status==="Pending").length
 );

 setVal("dashReqTotal",
  requisitions.reduce((a,r)=>a+num(r.total_amount),0)
 );

 const activity=$("dashboardActivity");
 if(activity){
  activity.innerHTML=[
   ...vehicles.slice(0,5).map(v=>`<div>🚘 ${esc(v.registration)} — ${esc(v.status)}</div>`),
   ...expenses.slice(0,5).map(e=>`<div>💰 ${esc(e.description)} — ${money(e.amount)}</div>`)
  ].join("")||"<div>No recent activity</div>";
 }

 document.querySelectorAll("[id^=dash]").forEach(x=>{
  const card=x.closest(".card,.stat-card,.kpi-card");
  if(card&&!card.dataset.bound){
   card.dataset.bound="1";
   card.style.cursor="pointer";
  }
 });
}

/* =========================================================
   VEHICLES
   ========================================================= */

function renderVehicles(){
 const body=$("vehiclesTableBody");
 if(!body)return;

 const q=formVal("vehicleSearch").toLowerCase();
 const st=formVal("vehicleStatusFilter");

 const rows=vehicles.filter(v=>{
  const text=[
   v.registration,v.customer,v.model,v.status,v.job_type
  ].join(" ").toLowerCase();

  return (!q||text.includes(q))&&(!st||v.status===st);
 });

 body.innerHTML=rows.map(v=>`
 <tr>
  <td><strong>${esc(v.registration)}</strong></td>
  <td>${esc(v.customer)}</td>
  <td>${esc(v.date_in||"")}</td>
  <td>${esc(v.job_type||"")}</td>
  <td>${esc(v.status||"")}</td>
  <td>${storageDays(v)}</td>
  <td>${money(v.billed)}</td>
  <td>${money(v.paid)}</td>
  <td>${money(num(v.billed)-num(v.paid))}</td>
  <td><strong>${money(vehicleExpenseTotal(v.id))}</strong></td>
  <td>
   <div class="table-actions">
    <button class="action-btn blue" title="Edit"
     onclick="editVehicle('${v.id}')">✏️</button>
    <button class="action-btn green" title="Expenses"
     onclick="viewVehicleExpenses('${v.id}')">🚘</button>
    <button class="action-btn" title="View"
     onclick="viewVehicle('${v.id}')">👁️</button>
    <button class="action-btn orange" title="Share"
     onclick="shareVehicle('${v.id}')">📤</button>
    <button class="action-btn danger" title="Delete"
     onclick="deleteVehicle('${v.id}')">🗑️</button>
   </div>
  </td>
 </tr>
 `).join("")||`<tr><td colspan="11">No vehicles found</td></tr>`;
}

function openVehicleModal(){
 $("vehicleForm")?.reset();
 setVal("vehicleId","");
 setVal("vehicleDateIn",today());
 setVal("vehicleJobType","Repair");
 setVal("vehicleStatus","Under Repair");
 setVal("vehicleModalTitle","Add Vehicle");
 openModal("vehicleModal");
}

function editVehicle(id){
 const v=vehicleById(id);
 if(!v)return;

 setVal("vehicleId",v.id);
 setVal("vehicleRegistration",v.registration);
 setVal("vehicleCustomer",v.customer);
 setVal("vehicleModel",v.model);
 setVal("vehicleModelYear",v.model_year);
 setVal("vehicleColor",v.color);
 setVal("vehicleDateIn",v.date_in);
 setVal("vehicleDateOut",v.date_out);
 setVal("vehicleJobType",v.job_type);
 setVal("vehicleStatus",v.status);
 setVal("vehicleReleasedTo",v.released_to);
 setVal("vehicleReleasedContact",v.released_contact);
 setVal("vehicleBilled",v.billed);
 setVal("vehiclePaid",v.paid);
 setVal("vehicleDescription",v.description);
 setVal("vehicleModalTitle","Edit Vehicle");
 openModal("vehicleModal");
}

async function saveVehicle(e){
 e?.preventDefault();

 const id=formVal("vehicleId");
 const registration=formVal("vehicleRegistration");
 const customer=formVal("vehicleCustomer");

 if(!registration||!customer)
  return toast("Registration and customer are required");

 const duplicate=vehicles.find(v=>
  norm(v.registration)===norm(registration)&&String(v.id)!==String(id)
 );

 if(duplicate)return toast("Vehicle already exists");

 const row={
  registration,
  customer,
  model:formVal("vehicleModel"),
  model_year:formVal("vehicleModelYear"),
  color:formVal("vehicleColor"),
  date_in:formVal("vehicleDateIn")||today(),
  date_out:formVal("vehicleDateOut")||null,
  job_type:formVal("vehicleJobType")||"Repair",
  status:formVal("vehicleStatus")||"Under Repair",
  released_to:formVal("vehicleReleasedTo"),
  released_contact:formVal("vehicleReleasedContact"),
  billed:num(formVal("vehicleBilled")),
  paid:num(formVal("vehiclePaid")),
  description:formVal("vehicleDescription")
 };

 const q=id
  ?supabase.from("vehicles").update(row).eq("id",id)
  :supabase.from("vehicles").insert(row);

 const {error}=await q;

 if(error){
  console.error(error);
  return toast(error.message);
 }

 closeModal("vehicleModal");
 await loadAllData();
 toast("Vehicle saved");
}

async function deleteVehicle(id){
 const v=vehicleById(id);
 if(!v||!confirm(`Delete ${v.registration}?`))return;

 const {error}=await supabase
  .from("vehicles").delete().eq("id",id);

 if(error)return toast(error.message);

 await loadAllData();
 toast("Vehicle deleted");
}

function viewVehicle(id){
 const v=vehicleById(id);
 if(!v)return;

 preview(
  "Vehicle Details",
  documentTemplate(`
   <h2>${esc(v.registration)}</h2>
   <p><b>Customer:</b> ${esc(v.customer)}</p>
   <p><b>Model:</b> ${esc(v.model)}</p>
   <p><b>Year:</b> ${esc(v.model_year)}</p>
   <p><b>Color:</b> ${esc(v.color)}</p>
   <p><b>Date In:</b> ${esc(v.date_in)}</p>
   <p><b>Date Out:</b> ${esc(v.date_out||"")}</p>
   <p><b>Storage Days:</b> ${storageDays(v)}</p>
   <p><b>Job:</b> ${esc(v.job_type)}</p>
   <p><b>Status:</b> ${esc(v.status)}</p>
   <p><b>Billed:</b> ${money(v.billed)}</p>
   <p><b>Paid:</b> ${money(v.paid)}</p>
   <p><b>Outstanding:</b> ${money(num(v.billed)-num(v.paid))}</p>
   <p><b>Total Expenses:</b> ${money(vehicleExpenseTotal(v.id))}</p>
   <p>${esc(v.description)}</p>
  `)
 );
}

function vehicleReport(id){
 const v=vehicleById(id);
 if(!v)return "";

 const rows=vehicleExpenseRows(id);

 return documentTemplate(`
  <h2>VEHICLE EXPENSE REPORT</h2>
  <h3>${esc(v.registration)}</h3>
  <p><b>Customer:</b> ${esc(v.customer)}</p>
  <p><b>Status:</b> ${esc(v.status)}</p>
  <hr>
  <table>
   <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr>
   ${rows.map(e=>`
    <tr>
     <td>${esc(e.expense_date)}</td>
     <td>${esc(e.description)}</td>
     <td>${esc(e.category)}</td>
     <td>${money(e.amount)}</td>
    </tr>`).join("")}
   <tr>
    <th colspan="3">TOTAL EXPENSES</th>
    <th>${money(vehicleExpenseTotal(id))}</th>
   </tr>
  </table>
 `);
}

function viewVehicleExpenses(id){
 currentVehicleExpenseId=id;
 const html=vehicleReport(id);

 if($("vehicleExpensePreviewContent"))
  $("vehicleExpensePreviewContent").innerHTML=html;

 openModal("vehicleExpensePreviewModal");
}

async function shareVehicle(id){
 const v=vehicleById(id);
 if(!v)return;

 const text=
 `${COMPANY.crystal.name}\n`+
 `VEHICLE REPORT\n`+
 `Vehicle: ${v.registration}\n`+
 `Customer: ${v.customer}\n`+
 `Status: ${v.status}\n`+
 `Billed: ${money(v.billed)}\n`+
 `Paid: ${money(v.paid)}\n`+
 `Outstanding: ${money(num(v.billed)-num(v.paid))}\n`+
 `Expenses: ${money(vehicleExpenseTotal(id))}`;

 await shareText(text,"Vehicle Report");
}

function printVehicleExpensePreview(){
 const html=$("vehicleExpensePreviewContent")?.innerHTML||"";
 printHTML(html,"Vehicle Expense Report");
}

/* =========================================================
   EXPENSES
   ========================================================= */

function ensureExpenseTotal(){
 const body=$("expensesTableBody");
 if(!body)return null;

 const table=body.closest("table");
 if(!table)return null;

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
 if(!body)return;

 const q=formVal("expenseSearch").toLowerCase();
 const cat=formVal("expenseCategoryFilter");

 let rows=[...expenses];

 const exact=vehicles.find(v=>norm(v.registration)===norm(q));

 if(exact&&q){
  rows=rows.filter(e=>String(e.vehicle_id)===String(exact.id));
 }else if(q){
  rows=rows.filter(e=>{
   const v=vehicleById(e.vehicle_id);
   return [
    e.description,e.category,v?.registration,v?.customer
   ].join(" ").toLowerCase().includes(q);
  });
 }

 if(cat)rows=rows.filter(e=>e.category===cat);

 const total=rows.reduce((a,e)=>a+num(e.amount),0);

 const box=ensureExpenseTotal();
 if(box)box.innerHTML=
  `<span>Total Filtered Expenses (${rows.length})</span>
   <strong>${money(total)}</strong>`;

 body.innerHTML=rows.map(e=>{
  const v=vehicleById(e.vehicle_id);

  return `
   <tr>
    <td>${esc(e.expense_date)}</td>
    <td>${esc(v?.registration||"")}</td>
    <td>${esc(e.description)}</td>
    <td>${esc(e.category)}</td>
    <td><strong>${money(e.amount)}</strong></td>
    <td>
     <div class="table-actions">
      <button class="action-btn blue" title="Edit"
       onclick="editExpense('${e.id}')">✏️</button>
      <button class="action-btn" title="View"
       onclick="viewExpense('${e.id}')">👁️</button>
      <button class="action-btn orange" title="Share"
       onclick="shareExpense('${e.id}')">📤</button>
      <button class="action-btn danger" title="Delete"
       onclick="deleteExpense('${e.id}')">🗑️</button>
     </div>
    </td>
   </tr>`;
 }).join("")||`<tr><td colspan="6">No expenses found</td></tr>`;

 const table=body.closest("table");

 if(table){
  let foot=table.querySelector("tfoot");
  if(!foot)foot=table.createTFoot();

  foot.innerHTML=`
   <tr>
    <th colspan="4">TOTAL FILTERED EXPENSES</th>
    <th>${money(total)}</th>
    <th></th>
   </tr>`;
 }
}

function fillVehicleSelect(id){
 const x=$(id);
 if(!x)return;

 x.innerHTML=`<option value="">Select vehicle</option>`+
 vehicles.map(v=>
  `<option value="${v.id}">
   ${esc(v.registration)} — ${esc(v.customer)}
  </option>`
 ).join("");
}

function openExpenseModal(){
 $("expenseForm")?.reset();
 setVal("expenseId","");
 setVal("expenseDate",today());
 fillVehicleSelect("expenseVehicle");
 openModal("expenseModal");
}

function editExpense(id){
 const e=expenses.find(x=>String(x.id)===String(id));
 if(!e)return;

 fillVehicleSelect("expenseVehicle");

 setVal("expenseId",e.id);
 setVal("expenseVehicle",e.vehicle_id);
 setVal("expenseDate",e.expense_date);
 setVal("expenseCategory",e.category);
 setVal("expenseAmount",e.amount);
 setVal("expenseDescription",e.description);
 setVal("expenseModalTitle","Edit Expense");

 openModal("expenseModal");
}

async function saveExpense(e){
 e?.preventDefault();

 const id=formVal("expenseId");
 const vehicle=formVal("expenseVehicle");

 if(!vehicle)return toast("Select a vehicle");

 const row={
  vehicle_id:vehicle,
  expense_date:formVal("expenseDate")||today(),
  category:formVal("expenseCategory")||"Parts",
  amount:num(formVal("expenseAmount")),
  description:formVal("expenseDescription")
 };

 const q=id
 ?supabase.from("expenses").update(row).eq("id",id)
 :supabase.from("expenses").insert(row);

 const {error}=await q;

 if(error)return toast(error.message);

 closeModal("expenseModal");
 await loadAllData();
}

function viewExpense(id){
 const e=expenses.find(x=>String(x.id)===String(id));
 if(!e)return;

 const v=vehicleById(e.vehicle_id);

 preview("Expense",documentTemplate(`
  <h2>Expense</h2>
  <p><b>Vehicle:</b> ${esc(v?.registration)}</p>
  <p><b>Date:</b> ${esc(e.expense_date)}</p>
  <p><b>Category:</b> ${esc(e.category)}</p>
  <p><b>Description:</b> ${esc(e.description)}</p>
  <h3>${money(e.amount)}</h3>
 `));
}

async function shareExpense(id){
 const e=expenses.find(x=>String(x.id)===String(id));
 if(!e)return;

 const v=vehicleById(e.vehicle_id);

 await shareText(
  `${COMPANY.crystal.name}\nExpense\nVehicle: ${v?.registration||""}\n`+
  `Date: ${e.expense_date}\nDescription: ${e.description}\n`+
  `Category: ${e.category}\nAmount: ${money(e.amount)}`,
  "Expense"
 );
}

async function deleteExpense(id){
 if(!confirm("Delete this expense?"))return;

 const {error}=await supabase.from("expenses").delete().eq("id",id);

 if(error)return toast(error.message);

 await loadAllData();
}

/* =========================================================
   PETTY CASH
   ========================================================= */

function renderPetty(){
 const body=$("pettyTableBody");
 if(!body)return;

 const q=formVal("pettySearch").toLowerCase();
 const cat=formVal("pettyCategoryFilter");

 const rows=pettyCash.filter(x=>{
  const text=[
   x.description,x.paid_to,x.category,x.notes
  ].join(" ").toLowerCase();

  return (!q||text.includes(q))&&(!cat||x.category===cat);
 });

 body.innerHTML=rows.map(x=>`
 <tr>
  <td>${esc(x.cash_date)}</td>
  <td>${esc(x.paid_to)}</td>
  <td>${esc(x.description)}</td>
  <td>${esc(x.category)}</td>
  <td>${money(x.amount)}</td>
  <td>
   <div class="table-actions">
    <button class="action-btn blue" onclick="editPetty('${x.id}')">✏️</button>
    <button class="action-btn" onclick="viewPetty('${x.id}')">👁️</button>
    <button class="action-btn orange" onclick="sharePetty('${x.id}')">📤</button>
    <button class="action-btn danger" onclick="deletePetty('${x.id}')">🗑️</button>
   </div>
  </td>
 </tr>
 `).join("")||`<tr><td colspan="6">No petty cash records</td></tr>`;
}

function openPettyModal(){
 $("pettyForm")?.reset();
 setVal("pettyId","");
 setVal("pettyDate",today());
 openModal("pettyModal");
}

function editPetty(id){
 const x=pettyCash.find(a=>String(a.id)===String(id));
 if(!x)return;

 setVal("pettyId",x.id);
 setVal("pettyDate",x.cash_date);
 setVal("pettyPaidTo",x.paid_to);
 setVal("pettyCategory",x.category);
 setVal("pettyAmount",x.amount);
 setVal("pettyDescription",x.description);
 setVal("pettyNotes",x.notes);
 setVal("pettyModalTitle","Edit Petty Cash");

 openModal("pettyModal");
}

async function savePetty(e){
 e?.preventDefault();

 const id=formVal("pettyId");

 const row={
  cash_date:formVal("pettyDate")||today(),
  paid_to:formVal("pettyPaidTo"),
  category:formVal("pettyCategory"),
  amount:num(formVal("pettyAmount")),
  description:formVal("pettyDescription"),
  notes:formVal("pettyNotes")
 };

 const q=id
 ?supabase.from("petty_cash").update(row).eq("id",id)
 :supabase.from("petty_cash").insert(row);

 const {error}=await q;

 if(error)return toast(error.message);

 closeModal("pettyModal");
 await loadAllData();
}

function viewPetty(id){
 const x=pettyCash.find(a=>String(a.id)===String(id));
 if(!x)return;

 preview("Petty Cash",documentTemplate(`
  <h2>Petty Cash</h2>
  <p><b>Date:</b> ${esc(x.cash_date)}</p>
  <p><b>Paid To:</b> ${esc(x.paid_to)}</p>
  <p><b>Description:</b> ${esc(x.description)}</p>
  <p><b>Category:</b> ${esc(x.category)}</p>
  <h3>${money(x.amount)}</h3>
  <p>${esc(x.notes)}</p>
 `));
}

async function sharePetty(id){
 const x=pettyCash.find(a=>String(a.id)===String(id));
 if(!x)return;

 await shareText(
  `Petty Cash\n${x.cash_date}\n${x.description}\n${money(x.amount)}`,
  "Petty Cash"
 );
}

async function deletePetty(id){
 if(!confirm("Delete petty cash record?"))return;

 const {error}=await supabase.from("petty_cash").delete().eq("id",id);
 if(error)return toast(error.message);

 await loadAllData();
}

/* =========================================================
   REQUISITIONS
   ========================================================= */

function renderReq(){
 const body=$("requisitionsTableBody");
 if(!body)return;

 const q=formVal("reqSearch").toLowerCase();
 const st=formVal("reqStatusFilter");

 const rows=requisitions.filter(r=>{
  const v=vehicleById(r.vehicle_id);

  const text=[
   r.req_no,r.requested_by,r.item_description,
   v?.registration,r.expense_type,r.status
  ].join(" ").toLowerCase();

  return (!q||text.includes(q))&&(!st||r.status===st);
 });

 const total=rows.reduce((a,r)=>a+num(r.total_amount),0);
 setVal("reqOverallTotal",money(total));

 body.innerHTML=rows.map(r=>`
 <tr>
  <td>${esc(r.req_no)}</td>
  <td>${esc(r.req_date)}</td>
  <td>${esc(r.requested_by)}</td>
  <td>${esc(vehicleReg(r.vehicle_id))}</td>
  <td>${esc(r.item_description)}</td>
  <td>${esc(r.expense_type)}</td>
  <td>${money(r.total_amount)}</td>
  <td>${esc(r.status)}</td>
  <td>
   <div class="table-actions">
    <button class="action-btn blue" onclick="editReq('${r.id}')">✏️</button>
    <button class="action-btn" onclick="viewReq('${r.id}')">👁️</button>
    <button class="action-btn orange" onclick="shareReq('${r.id}')">📤</button>
    <button class="action-btn danger" onclick="deleteReq('${r.id}')">🗑️</button>
   </div>
  </td>
 </tr>
 `).join("")||`<tr><td colspan="9">No requisitions</td></tr>`;
}

function openReqModal(){
 $("reqForm")?.reset();
 setVal("reqId","");
 setVal("reqDate",today());
 fillVehicleSelect("reqVehicle");
 openModal("reqModal");
}

function editReq(id){
 const r=requisitions.find(x=>String(x.id)===String(id));
 if(!r)return;

 fillVehicleSelect("reqVehicle");

 setVal("reqId",r.id);
 setVal("reqNo",r.req_no);
 setVal("reqDate",r.req_date);
 setVal("reqRequestedBy",r.requested_by);
 setVal("reqVehicle",r.vehicle_id);
 setVal("reqItemDescription",r.item_description);
 setVal("reqQuantity",r.quantity);
 setVal("reqUnitCost",r.unit_cost);
 setVal("reqTotal",r.total_amount);
 setVal("reqStatus",r.status);
 setVal("reqExpenseType",r.expense_type);
 setVal("reqCategory",r.expense_type);
 setVal("reqNotes",r.notes);

 openModal("reqModal");
}

async function saveReq(e){
 e?.preventDefault();

 const id=formVal("reqId");
 const quantity=num(formVal("reqQuantity"));
 const unit=num(formVal("reqUnitCost"));

 const row={
  req_no:formVal("reqNo"),
  req_date:formVal("reqDate")||today(),
  requested_by:formVal("reqRequestedBy"),
  vehicle_id:formVal("reqVehicle")||null,
  item_description:formVal("reqItemDescription"),
  quantity,
  unit_cost:unit,
  total_amount:quantity*unit,
  status:formVal("reqStatus")||"Pending",
  expense_type:formVal("reqExpenseType")||
   formVal("reqCategory")||"Materials",
  notes:formVal("reqNotes")
 };

 const q=id
 ?supabase.from("requisitions").update(row).eq("id",id)
 :supabase.from("requisitions").insert(row);

 const {error}=await q;

 if(error)return toast(error.message);

 closeModal("reqModal");
 await loadAllData();
}

function viewReq(id){
 const r=requisitions.find(x=>String(x.id)===String(id));
 if(!r)return;

 preview("Requisition",documentTemplate(`
  <h2>REQUISITION ${esc(r.req_no)}</h2>
  <p><b>Date:</b> ${esc(r.req_date)}</p>
  <p><b>Requested By:</b> ${esc(r.requested_by)}</p>
  <p><b>Vehicle:</b> ${esc(vehicleReg(r.vehicle_id))}</p>
  <p><b>Item:</b> ${esc(r.item_description)}</p>
  <p><b>Type:</b> ${esc(r.expense_type)}</p>
  <p><b>Quantity:</b> ${r.quantity}</p>
  <p><b>Unit Cost:</b> ${money(r.unit_cost)}</p>
  <h3>Total: ${money(r.total_amount)}</h3>
 `));
}

async function shareReq(id){
 const r=requisitions.find(x=>String(x.id)===String(id));
 if(!r)return;

 await shareText(
  `REQUISITION ${r.req_no}\n`+
  `Vehicle: ${vehicleReg(r.vehicle_id)}\n`+
  `Item: ${r.item_description}\n`+
  `Total: ${money(r.total_amount)}`,
  "Requisition"
 );
}

async function deleteReq(id){
 if(!confirm("Delete requisition?"))return;

 const {error}=await supabase
  .from("requisitions").delete().eq("id",id);

 if(error)return toast(error.message);

 await loadAllData();
}

/* =========================================================
   INVOICES
   ========================================================= */

function companyFields(type="invoice"){
 const form=$(type==="gate"?"gatePassForm":"invoiceForm");
 if(!form)return;

 const prefix=type==="gate"?"gateCompany":"invoiceCompany";

 if($(prefix+"Select"))return;

 const box=document.createElement("div");
 box.className="garage-company";
 box.innerHTML=`
  <label>Company</label>
  <select id="${prefix}Select">
   <option value="crystal">CRYSTAL MOTORS (K) LTD</option>
   <option value="quarry">QUARRY ROUTE MOTORS LTD</option>
   <option value="other">OTHER</option>
  </select>

  <input id="${prefix}Name" placeholder="Company Name">
  <input id="${prefix}Address" placeholder="Company Address">
  <input id="${prefix}Phone" placeholder="Company Phone">
  <input id="${prefix}Email" placeholder="Company Email">
 `;

 form.insertBefore(box,form.firstElementChild);

 $(prefix+"Select").addEventListener("change",()=>{
  const c=COMPANY[$(prefix+"Select").value];
  setVal(prefix+"Name",c.name);
  setVal(prefix+"Address",c.address);
  setVal(prefix+"Phone",c.phone);
  setVal(prefix+"Email",c.email);
 });

 $(prefix+"Select").dispatchEvent(new Event("change"));
}

function companyData(prefix){
 return {
  company_name:formVal(prefix+"Name"),
  company_address:formVal(prefix+"Address"),
  company_phone:formVal(prefix+"Phone"),
  company_email:formVal(prefix+"Email")
 };
}

function renderInvoices(){
 const body=$("invoicesTableBody");
 if(!body)return;

 const q=formVal("invoiceSearch").toLowerCase();
 const st=formVal("invoiceStatusFilter");

 const rows=invoices.filter(x=>{
  const v=vehicleById(x.vehicle_id);

  const text=[
   x.invoice_no,x.customer,x.job_description,
   x.company_name,v?.registration
  ].join(" ").toLowerCase();

  return (!q||text.includes(q))&&(!st||x.status===st);
 });

 body.innerHTML=rows.map(x=>`
 <tr>
  <td>${esc(x.invoice_no)}</td>
  <td>${esc(x.invoice_date)}</td>
  <td>${esc(x.company_name)}</td>
  <td>${esc(vehicleReg(x.vehicle_id))}</td>
  <td>${esc(x.customer)}</td>
  <td>${money(x.subtotal)}</td>
  <td>${money(x.paid)}</td>
  <td>${money(x.balance)}</td>
  <td>${esc(x.status)}</td>
  <td>
   <div class="table-actions">
    <button class="action-btn blue" onclick="editInvoice('${x.id}')">✏️</button>
    <button class="action-btn" onclick="viewInvoice('${x.id}')">👁️</button>
    <button class="action-btn orange" onclick="shareInvoice('${x.id}')">📤</button>
    <button class="action-btn danger" onclick="deleteInvoice('${x.id}')">🗑️</button>
   </div>
  </td>
 </tr>
 `).join("")||`<tr><td colspan="10">No invoices</td></tr>`;
}

function openInvoiceModal(){
 $("invoiceForm")?.reset();
 setVal("invoiceId","");
 setVal("invoiceDate",today());
 fillVehicleSelect("invoiceVehicle");
 companyFields("invoice");
 openModal("invoiceModal");
}

function editInvoice(id){
 const x=invoices.find(a=>String(a.id)===String(id));
 if(!x)return;

 fillVehicleSelect("invoiceVehicle");
 companyFields("invoice");

 setVal("invoiceId",x.id);
 setVal("invoiceNo",x.invoice_no);
 setVal("invoiceDate",x.invoice_date);
 setVal("invoiceVehicle",x.vehicle_id);
 setVal("invoiceCustomer",x.customer);
 setVal("invoiceJobDescription",x.job_description);
 setVal("invoiceLabour",x.labour);
 setVal("invoiceParts",x.parts);
 setVal("invoiceOther",x.other);
 setVal("invoiceSubtotal",x.subtotal);
 setVal("invoicePaid",x.paid);
 setVal("invoiceBalance",x.balance);
 setVal("invoiceStatus",x.status);
 setVal("invoiceNotes",x.notes);

 setVal("invoiceCompanyName",x.company_name);
 setVal("invoiceCompanyAddress",x.company_address);
 setVal("invoiceCompanyPhone",x.company_phone);
 setVal("invoiceCompanyEmail",x.company_email);

 openModal("invoiceModal");
}

async function saveInvoice(e){
 e?.preventDefault();

 const id=formVal("invoiceId");

 const labour=num(formVal("invoiceLabour"));
 const parts=num(formVal("invoiceParts"));
 const other=num(formVal("invoiceOther"));
 const subtotal=labour+parts+other;
 const paid=num(formVal("invoicePaid"));

 const row={
  invoice_no:formVal("invoiceNo"),
  invoice_date:formVal("invoiceDate")||today(),
  vehicle_id:formVal("invoiceVehicle")||null,
  customer:formVal("invoiceCustomer"),
  job_description:formVal("invoiceJobDescription"),
  labour,parts,other,subtotal,
  paid,
  balance:subtotal-paid,
  status:formVal("invoiceStatus")||"Pending",
  notes:formVal("invoiceNotes"),
  ...companyData("invoiceCompany")
 };

 const q=id
 ?supabase.from("invoices").update(row).eq("id",id)
 :supabase.from("invoices").insert(row);

 const {error}=await q;

 if(error)return toast(error.message);

 closeModal("invoiceModal");
 await loadAllData();
}

function invoiceHTML(x){
 const c=COMPANY.crystal;

 return documentTemplate(`
  <h2>${esc(x.company_name||c.name)}</h2>
  <p>${esc(x.company_address||c.address)}</p>
  <p>${esc(x.company_phone||c.phone)}</p>
  <h2>INVOICE ${esc(x.invoice_no)}</h2>
  <p><b>Date:</b> ${esc(x.invoice_date)}</p>
  <p><b>Vehicle:</b> ${esc(vehicleReg(x.vehicle_id))}</p>
  <p><b>Customer:</b> ${esc(x.customer)}</p>
  <p>${esc(x.job_description)}</p>
  <table>
   <tr><td>Labour</td><td>${money(x.labour)}</td></tr>
   <tr><td>Parts</td><td>${money(x.parts)}</td></tr>
   <tr><td>Other</td><td>${money(x.other)}</td></tr>
   <tr><th>Total</th><th>${money(x.subtotal)}</th></tr>
   <tr><td>Paid</td><td>${money(x.paid)}</td></tr>
   <tr><th>Balance</th><th>${money(x.balance)}</th></tr>
  </table>
 `);
}

function viewInvoice(id){
 const x=invoices.find(a=>String(a.id)===String(id));
 if(x)preview("Invoice",invoiceHTML(x));
}

async function shareInvoice(id){
 const x=invoices.find(a=>String(a.id)===String(id));
 if(!x)return;

 await shareText(
  `${x.company_name||COMPANY.crystal.name}\n`+
  `INVOICE ${x.invoice_no}\n`+
  `Vehicle: ${vehicleReg(x.vehicle_id)}\n`+
  `Customer: ${x.customer}\n`+
  `Total: ${money(x.subtotal)}\n`+
  `Paid: ${money(x.paid)}\n`+
  `Balance: ${money(x.balance)}`,
  "Invoice"
 );
}

async function deleteInvoice(id){
 if(!confirm("Delete invoice?"))return;

 const {error}=await supabase
  .from("invoices").delete().eq("id",id);

 if(error)return toast(error.message);

 await loadAllData();
}

/* =========================================================
   GATE PASSES
   ========================================================= */

function renderGatePasses(){
 const body=$("gatePassesTableBody");
 if(!body)return;

 const q=formVal("gateSearch").toLowerCase();
 const st=formVal("gateStatusFilter");

 const rows=gatePasses.filter(x=>{
  const text=[
   x.gate_pass_no,x.registration,x.customer,
   x.released_to,x.company_name
  ].join(" ").toLowerCase();

  return (!q||text.includes(q))&&(!st||x.status===st);
 });

 body.innerHTML=rows.map(x=>`
 <tr>
  <td>${esc(x.gate_pass_no)}</td>
  <td>${esc(x.gate_pass_date)}</td>
  <td>${esc(x.company_name)}</td>
  <td>${esc(x.registration||vehicleReg(x.vehicle_id))}</td>
  <td>${esc(x.customer)}</td>
  <td>${esc(x.released_to)}</td>
  <td>${money(x.balance)}</td>
  <td>${esc(x.status)}</td>
  <td>
   <div class="table-actions">
    <button class="action-btn blue" onclick="editGatePass('${x.id}')">✏️</button>
    <button class="action-btn" onclick="viewGatePass('${x.id}')">👁️</button>
    <button class="action-btn orange" onclick="shareGatePass('${x.id}')">📤</button>
    <button class="action-btn danger" onclick="deleteGatePass('${x.id}')">🗑️</button>
   </div>
  </td>
 </tr>
 `).join("")||`<tr><td colspan="9">No gate passes</td></tr>`;
}

function openGatePassModal(){
 $("gatePassForm")?.reset();
 setVal("gatePassId","");
 setVal("gatePassDate",today());
 fillVehicleSelect("gateVehicle");
 companyFields("gate");
 openModal("gatePassModal");
}

function editGatePass(id){
 const x=gatePasses.find(a=>String(a.id)===String(id));
 if(!x)return;

 fillVehicleSelect("gateVehicle");
 companyFields("gate");

 setVal("gatePassId",x.id);
 setVal("gatePassNo",x.gate_pass_no);
 setVal("gatePassDate",x.gate_pass_date);
 setVal("gateVehicle",x.vehicle_id);
 setVal("gateVehicleRegistration",x.registration);
 setVal("gateCustomer",x.customer);
 setVal("gateReleasedTo",x.released_to);
 setVal("gateReleasedContact",x.released_contact);
 setVal("gateInvoice",x.invoice_id);
 setVal("gatePaid",x.paid);
 setVal("gateBalance",x.balance);
 setVal("gateAuthorizedBy",x.authorized_by);
 setVal("gateStatus",x.status);
 setVal("gateNotes",x.notes);

 setVal("gateCompanyName",x.company_name);
 setVal("gateCompanyAddress",x.company_address);
 setVal("gateCompanyPhone",x.company_phone);
 setVal("gateCompanyEmail",x.company_email);

 openModal("gatePassModal");
}

async function saveGatePass(e){
 e?.preventDefault();

 const id=formVal("gatePassId");
 const v=vehicleById(formVal("gateVehicle"));

 const paid=num(formVal("gatePaid"));

 const invoice=invoices.find(x=>
  String(x.id)===String(formVal("gateInvoice"))
 );

 const row={
  gate_pass_no:formVal("gatePassNo"),
  gate_pass_date:formVal("gatePassDate")||today(),
  vehicle_id:formVal("gateVehicle")||null,
  registration:formVal("gateVehicleRegistration")||v?.registration||"",
  customer:formVal("gateCustomer")||v?.customer||"",
  released_to:formVal("gateReleasedTo"),
  released_contact:formVal("gateReleasedContact"),
  invoice_id:formVal("gateInvoice")||null,
  paid,
  balance:invoice
   ?num(invoice.subtotal)-paid
   :num(formVal("gateBalance")),
  authorized_by:formVal("gateAuthorizedBy"),
  status:formVal("gateStatus")||"Pending",
  notes:formVal("gateNotes"),
  ...companyData("gateCompany")
 };

 const q=id
 ?supabase.from("gate_passes").update(row).eq("id",id)
 :supabase.from("gate_passes").insert(row);

 const {error}=await q;

 if(error)return toast(error.message);

 closeModal("gatePassModal");
 await loadAllData();
}

function gateHTML(x){
 const v=vehicleById(x.vehicle_id);

 return documentTemplate(`
  <h2>${esc(x.company_name||COMPANY.crystal.name)}</h2>
  <p>${esc(x.company_address||"")}</p>
  <p>${esc(x.company_phone||"")}</p>
  <p>${esc(x.company_email||"")}</p>
  <h2>GATE PASS</h2>
  <h3>${esc(x.gate_pass_no)}</h3>
  <p><b>Date:</b> ${esc(x.gate_pass_date)}</p>
  <p><b>Vehicle:</b> ${esc(x.registration||v?.registration)}</p>
  <p><b>Customer:</b> ${esc(x.customer||v?.customer)}</p>
  <p><b>Released To:</b> ${esc(x.released_to)}</p>
  <p><b>Contact:</b> ${esc(x.released_contact)}</p>
  <p><b>Paid:</b> ${money(x.paid)}</p>
  <p><b>Balance:</b> ${money(x.balance)}</p>
  <p><b>Authorized By:</b> ${esc(x.authorized_by)}</p>
  <p><b>Status:</b> ${esc(x.status)}</p>
  <hr>
  <p>${esc(x.notes)}</p>
 `);
}

function viewGatePass(id){
 const x=gatePasses.find(a=>String(a.id)===String(id));
 if(x)preview("Gate Pass",gateHTML(x));
}

async function shareGatePass(id){
 const x=gatePasses.find(a=>String(a.id)===String(id));
 if(!x)return;

 const v=vehicleById(x.vehicle_id);

 await shareText(
  `${x.company_name||COMPANY.crystal.name}\n`+
  `GATE PASS ${x.gate_pass_no}\n`+
  `Vehicle: ${x.registration||v?.registration||""}\n`+
  `Customer: ${x.customer||v?.customer||""}\n`+
  `Released To: ${x.released_to||""}\n`+
  `Status: ${x.status||""}`,
  "Gate Pass"
 );
}

async function deleteGatePass(id){
 if(!confirm("Delete gate pass?"))return;

 const {error}=await supabase
  .from("gate_passes").delete().eq("id",id);

 if(error)return toast(error.message);

 await loadAllData();
}

/* =========================================================
   ESTIMATES
   ========================================================= */

function ensureEstimateSection(){
 if($("estimates"))return;

 const app=$("app");
 if(!app)return;

 const s=document.createElement("section");
 s.id="estimates";
 s.className="section app-section";
 s.style.display="none";

 s.innerHTML=`
  <div class="section-header">
   <div>
    <h2>Estimates / Quotations</h2>
    <p>Create and manage repair estimates.</p>
   </div>
   <button onclick="openEstimateModal()">＋ New Estimate</button>
  </div>

  <div class="table-wrap">
   <table>
    <thead>
     <tr>
      <th>No.</th><th>Date</th><th>Company</th>
      <th>Vehicle</th><th>Customer</th>
      <th>Total</th><th>Actions</th>
     </tr>
    </thead>
    <tbody id="estimatesTableBody"></tbody>
   </table>
  </div>

  <div id="estimateModal" class="modal" style="display:none">
   <div class="modal-content">
    <form id="estimateForm">
     <h3>Estimate / Quotation</h3>

     <input type="hidden" id="estimateId">

     <input id="estimateNo" placeholder="Estimate No." required>
     <input id="estimateDate" type="date">

     <select id="estimateVehicle"></select>

     <input id="estimateCustomer" placeholder="Customer">
     <input id="estimateCustomerPhone" placeholder="Customer Phone">

     <input id="estimateModel" placeholder="Vehicle Model">
     <input id="estimateYear" placeholder="Vehicle Year">

     <input id="estimateSubtotal" type="number"
      placeholder="Subtotal">

     <input id="estimateVat" type="number"
      value="16" placeholder="VAT %">

     <input id="estimateNotes" placeholder="Notes">

     <div style="display:flex;gap:8px">
      <button type="submit">Save Estimate</button>
      <button type="button"
       onclick="closeModal('estimateModal')">Cancel</button>
     </div>
    </form>
   </div>
  </div>
 `;

 app.appendChild(s);

 $("estimateForm").addEventListener("submit",saveEstimate);
}

function renderEstimates(){
 const body=$("estimatesTableBody");
 if(!body)return;

 body.innerHTML=estimates.map(x=>`
  <tr>
   <td>${esc(x.estimate_no)}</td>
   <td>${esc(x.estimate_date)}</td>
   <td>${esc(x.company_name)}</td>
   <td>${esc(x.registration||vehicleReg(x.vehicle_id))}</td>
   <td>${esc(x.customer)}</td>
   <td>${money(x.total_amount)}</td>
   <td>
    <div class="table-actions">
     <button class="action-btn blue"
      onclick="editEstimate('${x.id}')">✏️</button>
     <button class="action-btn"
      onclick="viewEstimate('${x.id}')">👁️</button>
     <button class="action-btn orange"
      onclick="shareEstimate('${x.id}')">📤</button>
     <button class="action-btn danger"
      onclick="deleteEstimate('${x.id}')">🗑️</button>
    </div>
   </td>
  </tr>
 `).join("")||`<tr><td colspan="7">No estimates</td></tr>`;
}

function openEstimateModal(){
 ensureEstimateSection();

 $("estimateForm")?.reset();

 setVal("estimateId","");
 setVal("estimateDate",today());
 setVal("estimateVat",16);

 fillVehicleSelect("estimateVehicle");

 openModal("estimateModal");
}

function editEstimate(id){
 const x=estimates.find(a=>String(a.id)===String(id));
 if(!x)return;

 openEstimateModal();

 setVal("estimateId",x.id);
 setVal("estimateNo",x.estimate_no);
 setVal("estimateDate",x.estimate_date);
 setVal("estimateVehicle",x.vehicle_id);
 setVal("estimateCustomer",x.customer);
 setVal("estimateCustomerPhone",x.customer_phone);
 setVal("estimateModel",x.vehicle_model);
 setVal("estimateYear",x.vehicle_year);
 setVal("estimateSubtotal",x.subtotal);
 setVal("estimateVat",x.vat_rate);
 setVal("estimateNotes",x.notes);
}

async function saveEstimate(e){
 e?.preventDefault();

 const id=formVal("estimateId");
 const v=vehicleById(formVal("estimateVehicle"));

 const subtotal=num(formVal("estimateSubtotal"));
 const vatRate=num(formVal("estimateVat"));
 const vat=subtotal*vatRate/100;

 const row={
  estimate_no:formVal("estimateNo"),
  estimate_date:formVal("estimateDate")||today(),
  company_name:COMPANY.crystal.name,
  company_address:COMPANY.crystal.address,
  company_phone:COMPANY.crystal.phone,
  company_email:COMPANY.crystal.email,
  customer:formVal("estimateCustomer")||v?.customer||"",
  customer_phone:formVal("estimateCustomerPhone"),
  vehicle_id:formVal("estimateVehicle")||null,
  registration:v?.registration||"",
  chassis_no:v?.registration||"",
  vehicle_year:formVal("estimateYear")||v?.model_year||"",
  vehicle_model:formVal("estimateModel")||v?.model||"",
  subtotal,
  vat_rate:vatRate,
  vat_amount:vat,
  total_amount:subtotal+vat,
  notes:formVal("estimateNotes"),
  items:[]
 };

 const q=id
 ?supabase.from("estimates").update(row).eq("id",id)
 :supabase.from("estimates").insert(row);

 const {error}=await q;

 if(error)return toast(error.message);

 closeModal("estimateModal");
 await loadAllData();
}

function estimateHTML(x){
 return documentTemplate(`
  <h2>${esc(x.company_name||COMPANY.crystal.name)}</h2>
  <p>${esc(x.company_address||"")}</p>
  <p>${esc(x.company_phone||"")}</p>
  <h2>REPAIR ESTIMATE / QUOTATION</h2>
  <h3>${esc(x.estimate_no)}</h3>
  <p><b>Date:</b> ${esc(x.estimate_date)}</p>
  <p><b>Customer:</b> ${esc(x.customer)}</p>
  <p><b>Vehicle:</b> ${esc(x.registration)}</p>
  <p><b>Model:</b> ${esc(x.vehicle_model)}</p>
  <p><b>Year:</b> ${esc(x.vehicle_year)}</p>

  <table>
   <tr><td>Subtotal</td><td>${money(x.subtotal)}</td></tr>
   <tr><td>VAT (${x.vat_rate}%)</td><td>${money(x.vat_amount)}</td></tr>
   <tr><th>TOTAL</th><th>${money(x.total_amount)}</th></tr>
  </table>

  <p>${esc(x.notes)}</p>
 `);
}

function viewEstimate(id){
 const x=estimates.find(a=>String(a.id)===String(id));
 if(x)preview("Estimate",estimateHTML(x));
}

async function shareEstimate(id){
 const x=estimates.find(a=>String(a.id)===String(id));
 if(!x)return;

 await shareText(
  `${x.company_name}\n`+
  `ESTIMATE ${x.estimate_no}\n`+
  `Vehicle: ${x.registration}\n`+
  `Customer: ${x.customer}\n`+
  `TOTAL: ${money(x.total_amount)}`,
  "Estimate"
 );
}

async function deleteEstimate(id){
 if(!confirm("Delete estimate?"))return;

 const {error}=await supabase
  .from("estimates").delete().eq("id",id);

 if(error)return toast(error.message);

 await loadAllData();
}

/* =========================================================
   PREVIEW / PRINT / SHARE
   ========================================================= */

function documentTemplate(content){
 return `
 <div style="
  font-family:Arial,sans-serif;
  max-width:900px;
  margin:auto;
  padding:25px;
  color:#111827">
  ${content}
 </div>`;
}

function preview(title,html){
 currentPreview=html;

 setVal("previewTitle",title);

 if($("previewContent"))
  $("previewContent").innerHTML=html;

 openModal("previewModal");
}

function printHTML(html,title="Garage Operations Pro"){
 const w=window.open("","_blank");

 if(!w)return toast("Allow popups to print");

 w.document.write(`
  <!doctype html>
  <html>
  <head>
   <title>${esc(title)}</title>
   <style>
    body{font-family:Arial;padding:25px;color:#111}
    table{width:100%;border-collapse:collapse;margin-top:15px}
    th,td{border:1px solid #ccc;padding:8px;text-align:left}
    th{font-weight:bold}
   </style>
  </head>
  <body>${html}</body>
  </html>
 `);

 w.document.close();
 w.focus();

 setTimeout(()=>w.print(),300);
}

function printCurrentPreview(){
 printHTML(
  $("previewContent")?.innerHTML||currentPreview,
  $("previewTitle")?.textContent||"Document"
 );
}

function printExpenses(){
 printHTML(
  document.querySelector("#expensesTableBody")
   ?.closest("table")?.outerHTML||"",
  "Expense Report"
 );
}

function printVehicles(){
 printHTML(
  document.querySelector("#vehiclesTableBody")
   ?.closest("table")?.outerHTML||"",
  "Vehicles"
 );
}

function printPettyCash(){
 printHTML(
  document.querySelector("#pettyTableBody")
   ?.closest("table")?.outerHTML||"",
  "Petty Cash"
 );
}

function printRequisitions(){
 printHTML(
  document.querySelector("#requisitionsTableBody")
   ?.closest("table")?.outerHTML||"",
  "Requisitions"
 );
}

function printInvoices(){
 printHTML(
  document.querySelector("#invoicesTableBody")
   ?.closest("table")?.outerHTML||"",
  "Invoices"
 );
}

function printGatePasses(){
 printHTML(
  document.querySelector("#gatePassesTableBody")
   ?.closest("table")?.outerHTML||"",
  "Gate Passes"
 );
}

async function shareText(text,title){
 try{
  if(navigator.share){
   await navigator.share({title,text});
   return;
  }

  await navigator.clipboard.writeText(text);
  toast("Copied to clipboard");
 }catch(e){
  try{
   await navigator.clipboard.writeText(text);
   toast("Copied to clipboard");
  }catch{
   toast("Sharing unavailable");
  }
}

/* =========================================================
   GLOBAL SEARCH EVENTS
   ========================================================= */

function bindSearch(id,fn){
 const x=$(id);
 if(!x)return;

 x.addEventListener("input",fn);
 x.addEventListener("change",fn);
}

function bindForms(){
 $("vehicleForm")?.addEventListener("submit",saveVehicle);
 $("expenseForm")?.addEventListener("submit",saveExpense);
 $("pettyForm")?.addEventListener("submit",savePetty);
 $("reqForm")?.addEventListener("submit",saveReq);
 $("invoiceForm")?.addEventListener("submit",saveInvoice);
 $("gatePassForm")?.addEventListener("submit",saveGatePass);

 bindSearch("vehicleSearch",renderVehicles);
 bindSearch("vehicleStatusFilter",renderVehicles);

 bindSearch("expenseSearch",renderExpenses);
 bindSearch("expenseCategoryFilter",renderExpenses);

 bindSearch("pettySearch",renderPetty);
 bindSearch("pettyCategoryFilter",renderPetty);

 bindSearch("reqSearch",renderReq);
 bindSearch("reqStatusFilter",renderReq);

 bindSearch("invoiceSearch",renderInvoices);
 bindSearch("invoiceStatusFilter",renderInvoices);

 bindSearch("gateSearch",renderGatePasses);
 bindSearch("gateStatusFilter",renderGatePasses);
}

/* =========================================================
   DASHBOARD CARD CLICKING
   ========================================================= */

function setupDashboardCards(){
 const map={
  dashVehicles:"vehicles",
  dashRepair:"vehicles",
  dashOutstanding:"expenses",
  dashExpenses:"expenses",
  dashPetty:"petty-cash",
  dashReq:"requisitions",
  dashReqCount:"requisitions",
  dashInvoices:"invoices",
  dashGatePasses:"gate-passes"
 };

 Object.entries(map).forEach(([id,section])=>{
  const x=$(id);
  if(!x)return;

  const card=x.closest(
   ".card,.stat-card,.kpi-card,.dashboard-card"
  )||x;

  if(card.dataset.garageBound)return;

  card.dataset.garageBound="1";
  card.style.cursor="pointer";
  card.addEventListener("click",e=>{
   if(e.target.closest("button,a"))return;
   showSection(section);
  });
 });
}

/* =========================================================
   AUTO VEHICLE FIELDS
   ========================================================= */

function autoVehicleFields(){
 const sel=$("expenseVehicle");
 if(sel&&!sel.dataset.bound){
  sel.dataset.bound="1";
  sel.addEventListener("change",()=>{
   const v=vehicleById(sel.value);
   if(v&&$("expenseDescription")&&
      !$("expenseDescription").value){
    $("expenseDescription").value=
     `${v.registration} expense`;
   }
  });
 }
}

/* =========================================================
   START
   ========================================================= */

document.addEventListener("DOMContentLoaded",async()=>{
 styles();
 setupNavigation();
 ensureEstimateSection();
 bindForms();
 setupDashboardCards();
 autoVehicleFields();

 document.querySelectorAll(
  ".modal .close,[data-close-modal]"
 ).forEach(x=>{
  x.addEventListener("click",closeAllModals);
 });

 document.addEventListener("keydown",e=>{
  if(e.key==="Escape")closeAllModals();
 });

 await loadAllData();

 showSection("dashboard");
});

/* =========================================================
   WINDOW EXPORTS
   Required by existing HTML onclick handlers
   ========================================================= */

Object.assign(window,{
 supabase,
 loadAllData,
 showSection,

 openVehicleModal,
 editVehicle,
 saveVehicle,
 deleteVehicle,
 viewVehicle,
 viewVehicleExpenses,
 shareVehicle,

 openExpenseModal,
 editExpense,
 saveExpense,
 deleteExpense,
 viewExpense,
 shareExpense,

 openPettyModal,
 editPetty,
 savePetty,
 deletePetty,
 viewPetty,
 sharePetty,

 openReqModal,
 editReq,
 saveReq,
 deleteReq,
 viewReq,
 shareReq,

 openInvoiceModal,
 editInvoice,
 saveInvoice,
 deleteInvoice,
 viewInvoice,
 shareInvoice,

 openGatePassModal,
 editGatePass,
 saveGatePass,
 deleteGatePass,
 viewGatePass,
 shareGatePass,

 openEstimateModal,
 editEstimate,
 saveEstimate,
 deleteEstimate,
 viewEstimate,
 shareEstimate,

 printVehicles,
 printExpenses,
 printPettyCash,
 printRequisitions,
 printInvoices,
 printGatePasses,

 printCurrentPreview,
 printVehicleExpensePreview,

 closeModal,
 closeAllModals
});
   
