import { createClient }
from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


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

const TABLES={
vehicles:"vehicles",
expenses:"expenses",
petty:"petty_cash",
requisitions:"requisitions"
};


/* =========================================================
   LOCAL DATA
   ========================================================= */

let vehicles=[];
let expenses=[];
let pettyCash=[];
let requisitions=[];

let selectedReqId=null;
let selectedVehicleExpenseId=null;


/* =========================================================
   HELPERS
   ========================================================= */

function money(value){

const n=Number(value||0);

return "KSh "+
n.toLocaleString("en-KE",{
minimumFractionDigits:0,
maximumFractionDigits:2
});

}


function number(value){

return Number(value||0);
}


function today(){

return new Date()
.toISOString()
.slice(0,10);

}


function escapeHtml(value){

return String(value??"")
.replace(/&/g,"&amp;")
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;")
.replace(/"/g,"&quot;")
.replace(/'/g,"&#039;");

}


function vehicleName(id){

if(!id)return "General";

const v=vehicles.find(x=>x.id===id);

return v
? `${v.registration}${v.customer?" — "+v.customer:""}`
: "Unknown vehicle";

}


function statusClass(status){

const s=String(status||"")
.toLowerCase();

if(s.includes("repair"))
return "status-under-repair";

if(s.includes("complete")||s.includes("release"))
return "status-completed";

if(s.includes("pending"))
return "status-pending";

if(s.includes("approved"))
return "status-approved";

if(s.includes("purchased"))
return "status-purchased";

if(s.includes("rejected"))
return "status-rejected";

return "status-default";

}


function showToast(message){

const toast=document.getElementById("toast");

if(!toast)return;

toast.textContent=message;
toast.style.display="block";

clearTimeout(window.__toastTimer);

window.__toastTimer=setTimeout(()=>{
toast.style.display="none";
},2800);

}


function supabaseError(error){

console.error(error);

showToast(
error?.message ||
"Something went wrong."
);

}


/* =========================================================
   MODALS
   ========================================================= */

window.openModal=function(id){

const modal=document.getElementById(id);

if(modal)
modal.classList.add("show");

};


window.closeModal=function(id){

const modal=document.getElementById(id);

if(modal)
modal.classList.remove("show");

};


/* =========================================================
   NAVIGATION
   ========================================================= */

window.showSection=function(sectionId,button){

document.querySelectorAll(".app-section")
.forEach(section=>{
section.style.display="none";
});

const section=
document.getElementById(sectionId);

if(section)
section.style.display="block";


document.querySelectorAll(".nav-btn,.mobile-nav-btn")
.forEach(btn=>{
btn.classList.remove("active");
});


if(button)
button.classList.add("active");

else{

document
.querySelectorAll(
`.nav-btn[onclick*="'${sectionId}'"],
.mobile-nav-btn[onclick*="'${sectionId}'"]`
)
.forEach(btn=>btn.classList.add("active"));

}

window.scrollTo({
top:0,
behavior:"smooth"
});

};


window.goToDashboardSection=function(sectionId){

window.showSection(sectionId);

};


/* =========================================================
   VEHICLE SELECTS
   ========================================================= */

function populateVehicleSelects(){

const selects=[
document.getElementById("expenseVehicle"),
document.getElementById("reqVehicle")
];

selects.forEach(select=>{

if(!select)return;

const current=select.value;

if(select.id==="expenseVehicle"){

select.innerHTML=
`<option value="">General Expense</option>`;

}else{

select.innerHTML=
`<option value="">Select Vehicle</option>`;

}

vehicles
.sort((a,b)=>
String(a.registration||"")
.localeCompare(String(b.registration||""))
)
.forEach(v=>{

const option=document.createElement("option");

option.value=v.id;

option.textContent=
`${v.registration}${v.customer?" — "+v.customer:""}`;

select.appendChild(option);

});

select.value=current;

});

}


/* =========================================================
   LOAD VEHICLES
   ========================================================= */

async function loadVehicles(){

const {data,error}=
await supabase
.from(TABLES.vehicles)
.select("*")
.order("created_at",{ascending:false});

if(error){

supabaseError(error);
return;

}

vehicles=data||[];

}


/* =========================================================
   LOAD EXPENSES
   ========================================================= */

async function loadExpenses(){

const {data,error}=
await supabase
.from(TABLES.expenses)
.select("*")
.order("expense_date",{ascending:false});

if(error){

supabaseError(error);
return;

}

expenses=data||[];

}


/* =========================================================
   LOAD PETTY CASH
   ========================================================= */

async function loadPettyCash(){

const {data,error}=
await supabase
.from(TABLES.petty)
.select("*")
.order("cash_date",{ascending:false});

if(error){

supabaseError(error);
return;

}

pettyCash=data||[];

}


/* =========================================================
   LOAD REQUISITIONS
   ========================================================= */

async function loadRequisitions(){

const {data,error}=
await supabase
.from(TABLES.requisitions)
.select("*")
.order("req_date",{ascending:false});

if(error){

supabaseError(error);
return;

}

requisitions=data||[];

}


/* =========================================================
   LOAD EVERYTHING
   ========================================================= */

async function loadAllData(){

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

}


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard(){

const totalVehicles=
vehicles.length;

const underRepair=
vehicles.filter(v=>
String(v.status||"")
.toLowerCase()==="under repair"
).length;

const totalBilled=
vehicles.reduce(
(sum,v)=>sum+number(v.billed),
0
);

const totalPaid=
vehicles.reduce(
(sum,v)=>sum+number(v.paid),
0
);

const outstanding=
totalBilled-totalPaid;

const totalExpenses=
expenses.reduce(
(sum,e)=>sum+number(e.amount),
0
);

const totalPetty=
pettyCash.reduce(
(sum,p)=>sum+number(p.amount),
0
);

const reqTotal=
requisitions.reduce(
(sum,r)=>sum+number(
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

function renderPremiumDashboard(){

const box=
document.getElementById("dashboardActivity");

if(!box)return;

const recent=
[...vehicles]
.sort((a,b)=>{

const da=
new Date(
a.created_at||
a.date_in||
0
);

const db=
new Date(
b.created_at||
b.date_in||
0
);

return db-da;

})
.slice(0,5);


if(!recent.length){

box.innerHTML=`

<div class="activity-item">

<div class="activity-icon">
🚘
</div>

<div class="activity-main">

<strong>No vehicle activity yet</strong>

<span>
Add your first vehicle to begin.
</span>

</div>

</div>

`;

return;

}


box.innerHTML=
recent.map(v=>`

<div class="activity-item">

<div class="activity-icon">
🚘
</div>

<div class="activity-main">

<strong>
${escapeHtml(
v.registration||
"Unknown vehicle"
)}
</strong>

<span>
${escapeHtml(
v.customer||
"No customer"
)}
</span>

</div>

<span class="status ${statusClass(v.status)}">
${escapeHtml(
v.status||
"Unknown"
)}
</span>

</div>

`).join("");

}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(id,value){

const element=
document.getElementById(id);

if(element)
element.textContent=value;

}


/* =========================================================
   VEHICLES
   ========================================================= */

function renderVehicles(){

const tbody=
document.getElementById(
"vehiclesTableBody"
);

if(!tbody)return;

const search=
String(
document.getElementById(
"vehicleSearch"
)?.value||""
).toLowerCase();

const status=
String(
document.getElementById(
"vehicleStatusFilter"
)?.value||""
).toLowerCase();


const filtered=
vehicles.filter(v=>{

const matchesSearch=
!search||
String(v.registration||"")
.toLowerCase()
.includes(search)||
String(v.customer||"")
.toLowerCase()
.includes(search)||
String(v.job_type||"")
.toLowerCase()
.includes(search);

const matchesStatus=
!status||
String(v.status||"")
.toLowerCase()===status;

return matchesSearch&&matchesStatus;

});


if(!filtered.length){

tbody.innerHTML=`

<tr>
<td colspan="9"
style="text-align:center;padding:35px;color:#94a3b8">
No vehicles found.
</td>
</tr>

`;

return;

}


tbody.innerHTML=
filtered.map(v=>{

const outstanding=
number(v.billed)-number(v.paid);

return `

<tr onclick="editVehicle('${v.id}')">

<td>
<strong>
${escapeHtml(v.registration)}
</strong>
</td>

<td>
${escapeHtml(v.customer)}
</td>

<td>
${escapeHtml(v.date_in||"")}
</td>

<td>
${escapeHtml(v.job_type||"")}
</td>

<td>
<span class="status ${statusClass(v.status)}">
${escapeHtml(v.status||"")}
</span>
</td>

<td>${money(v.billed)}</td>

<td>${money(v.paid)}</td>

<td>${money(outstanding)}</td>

<td onclick="event.stopPropagation()">

<div class="table-actions">

<button
class="action-btn"
onclick="editVehicle('${v.id}')">
✏️
</button>

<button
class="action-btn"
onclick="previewVehicleExpenses('${v.id}')">
👁
</button>

<button
class="action-btn"
onclick="deleteVehicle('${v.id}')">
🗑
</button>

</div>

</td>

</tr>

`;

}).join("");

}


/* =========================================================
   OPEN VEHICLE
   ========================================================= */

window.openVehicleModal=function(id=null){

const form=
document.getElementById("vehicleForm");

if(form)
form.reset();

document.getElementById(
"vehicleId"
).value=id||"";

document.getElementById(
"vehicleModalTitle"
).textContent=
id?"Edit Vehicle":"Add Vehicle";

if(id){

const v=
vehicles.find(x=>x.id===id);

if(!v)return;

document.getElementById("vehicleRegistration").value=
v.registration||"";

document.getElementById("vehicleCustomer").value=
v.customer||"";

document.getElementById("vehicleDateIn").value=
v.date_in||"";

document.getElementById("vehicleDateOut").value=
v.date_out||"";

document.getElementById("vehicleJobType").value=
v.job_type||"Repair";

document.getElementById("vehicleStatus").value=
v.status||"Under Repair";

document.getElementById("vehicleReleasedTo").value=
v.released_to||"";

document.getElementById("vehicleReleasedContact").value=
v.released_contact||"";

document.getElementById("vehicleDescription").value=
v.description||"";

document.getElementById("vehicleBilled").value=
v.billed||0;

document.getElementById("vehiclePaid").value=
v.paid||0;

}else{

document.getElementById("vehicleDateIn").value=
today();

document.getElementById("vehicleStatus").value=
"Under Repair";

document.getElementById("vehicleJobType").value=
"Repair";

document.getElementById("vehicleBilled").value=0;
document.getElementById("vehiclePaid").value=0;

}

openModal("vehicleModal");

};


window.editVehicle=function(id){

openVehicleModal(id);

};


/* =========================================================
   SAVE VEHICLE
   ========================================================= */

document.getElementById("vehicleForm")
?.addEventListener("submit",async e=>{

e.preventDefault();

const id=
document.getElementById("vehicleId").value;


const payload={

registration:
document.getElementById("vehicleRegistration").value.trim(),

customer:
document.getElementById("vehicleCustomer").value.trim(),

date_in:
document.getElementById("vehicleDateIn").value,

date_out:
document.getElementById("vehicleDateOut").value||null,

job_type:
document.getElementById("vehicleJobType").value.trim(),

status:
document.getElementById("vehicleStatus").value,

released_to:
document.getElementById("vehicleReleasedTo").value.trim(),

released_contact:
document.getElementById("vehicleReleasedContact").value.trim(),

description:
document.getElementById("vehicleDescription").value.trim(),

billed:
number(
document.getElementById("vehicleBilled").value
),

paid:
number(
document.getElementById("vehiclePaid").value
)

};


let result;

if(id){

result=
await supabase
.from(TABLES.vehicles)
.update(payload)
.eq("id",id);

}else{

result=
await supabase
.from(TABLES.vehicles)
.insert([payload]);

}


if(result.error){

supabaseError(result.error);
return;

}

closeModal("vehicleModal");

showToast(
id?
"Vehicle updated successfully."
:
"Vehicle added successfully."
);

await loadAllData();

});


/* =========================================================
   DELETE VEHICLE
   ========================================================= */

window.deleteVehicle=async function(id){

if(!confirm(
"Delete this vehicle record?"
))
return;

const {error}=
await supabase
.from(TABLES.vehicles)
.delete()
.eq("id",id);

if(error){

supabaseError(error);
return;

}

showToast("Vehicle deleted.");

await loadAllData();

};


/* =========================================================
   EXPENSES
   ========================================================= */

function renderExpenses(){

const tbody=
document.getElementById(
"expensesTableBody"
);

if(!tbody)return;

const search=
String(
document.getElementById(
"expenseSearch"
)?.value||""
).toLowerCase();

const category=
String(
document.getElementById(
"expenseCategoryFilter"
)?.value||""
).toLowerCase();


const filtered=
expenses.filter(e=>{

const vehicle=
vehicleName(e.vehicle_id);

const matchesSearch=
!search||
String(e.description||"")
.toLowerCase()
.includes(search)||
vehicle.toLowerCase()
.includes(search)||
String(e.category||"")
.toLowerCase()
.includes(search);

const matchesCategory=
!category||
String(e.category||"")
.toLowerCase()===category;

return matchesSearch&&matchesCategory;

});


populateExpenseCategories();


if(!filtered.length){

tbody.innerHTML=`

<tr>
<td colspan="6"
style="text-align:center;padding:35px;color:#94a3b8">
No expenses found.
</td>
</tr>

`;

return;

}


tbody.innerHTML=
filtered.map(e=>`

<tr>

<td>${escapeHtml(e.expense_date||"")}</td>

<td>${escapeHtml(vehicleName(e.vehicle_id))}</td>

<td>${escapeHtml(e.description||"")}</td>

<td>${escapeHtml(e.category||"")}</td>

<td>
<strong>${money(e.amount)}</strong>
</td>

<td>

<div class="table-actions">

<button
class="action-btn"
onclick="editExpense('${e.id}')">
✏️
</button>

<button
class="action-btn"
onclick="deleteExpense('${e.id}')">
🗑
</button>

</div>

</td>

</tr>

`).join("");

}


function populateExpenseCategories(){

const select=
document.getElementById(
"expenseCategoryFilter"
);

if(!select)return;

const current=select.value;

const categories=
[...new Set(
expenses
.map(e=>e.category)
.filter(Boolean)
)];

select.innerHTML=
`<option value="">All Categories</option>`;

categories
.sort()
.forEach(c=>{

select.innerHTML+=
`<option value="${escapeHtml(c)}">
${escapeHtml(c)}
</option>`;

});

select.value=current;

}


window.openExpenseModal=function(id=null){

const form=
document.getElementById("expenseForm");

if(form)
form.reset();

document.getElementById(
"expenseId"
).value=id||"";

document.getElementById(
"expenseModalTitle"
).textContent=
id?"Edit Expense":"Add Expense";

document.getElementById(
"expenseDate"
).value=today();

populateVehicleSelects();

if(id){

const e=
expenses.find(x=>x.id===id);

if(!e)return;

document.getElementById("expenseVehicle").value=
e.vehicle_id||"";

document.getElementById("expenseDate").value=
e.expense_date||today();

document.getElementById("expenseDescription").value=
e.description||"";

document.getElementById("expenseCategory").value=
e.category||"";

document.getElementById("expenseAmount").value=
e.amount||0;

}

openModal("expenseModal");

};


window.editExpense=function(id){

openExpenseModal(id);

};


document.getElementById("expenseForm")
?.addEventListener("submit",async e=>{

e.preventDefault();

const id=
document.getElementById("expenseId").value;

const payload={

vehicle_id:
document.getElementById("expenseVehicle").value||null,

expense_date:
document.getElementById("expenseDate").value,

description:
document.getElementById("expenseDescription").value.trim(),

category:
document.getElementById("expenseCategory").value.trim(),

amount:
number(
document.getElementById("expenseAmount").value
)

};


let result;

if(id){

result=
await supabase
.from(TABLES.expenses)
.update(payload)
.eq("id",id);

}else{

result=
await supabase
.from(TABLES.expenses)
.insert([payload]);

}


if(result.error){

supabaseError(result.error);
return;

}

closeModal("expenseModal");

showToast(
id?
"Expense updated."
:
"Expense recorded."
);

await loadAllData();

});


window.deleteExpense=async function(id){

if(!confirm("Delete this expense?"))
return;

const {error}=
await supabase
.from(TABLES.expenses)
.delete()
.eq("id",id);

if(error){

supabaseError(error);
return;

}

showToast("Expense deleted.");

await loadAllData();

};


/* =========================================================
   PETTY CASH
   ========================================================= */

function renderPettyCash(){

const tbody=
document.getElementById(
"pettyTableBody"
);

if(!tbody)return;

const search=
String(
document.getElementById(
"pettySearch"
)?.value||""
).toLowerCase();

const category=
String(
document.getElementById(
"pettyCategoryFilter"
)?.value||""
).toLowerCase();


const filtered=
pettyCash.filter(p=>{

const text=
`${p.description||""}
${p.paid_to||""}
${p.category||""}`
.toLowerCase();

return(
(!search||text.includes(search))&&
(!category||
String(p.category||"")
.toLowerCase()===category)
);

});


populatePettyCategories();


if(!filtered.length){

tbody.innerHTML=`

<tr>
<td colspan="7"
style="text-align:center;padding:35px;color:#94a3b8">
No petty cash records found.
</td>
</tr>

`;

return;

}


tbody.innerHTML=
filtered.map(p=>`

<tr>

<td>${escapeHtml(p.cash_date||"")}</td>

<td>${escapeHtml(p.description||"")}</td>

<td>${escapeHtml(p.paid_to||"")}</td>

<td>${escapeHtml(p.category||"")}</td>

<td>
<strong>${money(p.amount)}</strong>
</td>

<td>${escapeHtml(p.notes||"")}</td>

<td>

<div class="table-actions">

<button
class="action-btn"
onclick="editPetty('${p.id}')">
✏️
</button>

<button
class="action-btn"
onclick="deletePetty('${p.id}')">
🗑
</button>

</div>

</td>

</tr>

`).join("");

}


function populatePettyCategories(){

const select=
document.getElementById(
"pettyCategoryFilter"
);

if(!select)return;

const current=select.value;

const categories=
[...new Set(
pettyCash
.map(p=>p.category)
.filter(Boolean)
)];

select.innerHTML=
`<option value="">All Categories</option>`;

categories.sort().forEach(c=>{

select.innerHTML+=
`<option value="${escapeHtml(c)}">
${escapeHtml(c)}
</option>`;

});

select.value=current;

}


window.openPettyModal=function(id=null){

const form=
document.getElementById("pettyForm");

if(form)
form.reset();

document.getElementById(
"pettyId"
).value=id||"";

document.getElementById(
"pettyModalTitle"
).textContent=
id?"Edit Petty Cash":"Add Petty Cash";

document.getElementById(
"pettyDate"
).value=today();

if(id){

const p=
pettyCash.find(x=>x.id===id);

if(!p)return;

document.getElementById("pettyDate").value=
p.cash_date||today();

document.getElementById("pettyDescription").value=
p.description||"";

document.getElementById("pettyPaidTo").value=
p.paid_to||"";

document.getElementById("pettyCategory").value=
p.category||"";

document.getElementById("pettyAmount").value=
p.amount||0;

document.getElementById("pettyNotes").value=
p.notes||"";

}

openModal("pettyModal");

};


window.editPetty=function(id){

openPettyModal(id);

};


document.getElementById("pettyForm")
?.addEventListener("submit",async e=>{

e.preventDefault();

const id=
document.getElementById("pettyId").value;

const payload={

cash_date:
document.getElementById("pettyDate").value,

description:
document.getElementById("pettyDescription").value.trim(),

paid_to:
document.getElementById("pettyPaidTo").value.trim(),

category:
document.getElementById("pettyCategory").value.trim(),

amount:
number(
document.getElementById("pettyAmount").value
),

notes:
document.getElementById("pettyNotes").value.trim()

};


let result;

if(id){

result=
await supabase
.from(TABLES.petty)
.update(payload)
.eq("id",id);

}else{

result=
await supabase
.from(TABLES.petty)
.insert([payload]);

}


if(result.error){

supabaseError(result.error);
return;

}

closeModal("pettyModal");

showToast(
id?
"Petty cash updated."
:
"Petty cash recorded."
);

await loadAllData();

});


window.deletePetty=async function(id){

if(!confirm("Delete this petty cash record?"))
return;

const {error}=
await supabase
.from(TABLES.petty)
.delete()
.eq("id",id);

if(error){

supabaseError(error);
return;

}

showToast("Petty cash deleted.");

await loadAllData();

};


/* =========================================================
   REQUISITIONS
   ========================================================= */

function renderRequisitions(){

const tbody=
document.getElementById(
"requisitionsTableBody"
);

if(!tbody)return;

const search=
String(
document.getElementById(
"reqSearch"
)?.value||""
).toLowerCase();

const status=
String(
document.getElementById(
"reqStatusFilter"
)?.value||""
).toLowerCase();


const filtered=
requisitions.filter(r=>{

const text=
`${r.req_no||""}
${r.requested_by||""}
${r.item_description||""}
${vehicleName(r.vehicle_id)}`
.toLowerCase();

return(
(!search||text.includes(search))&&
(!status||
String(r.status||"")
.toLowerCase()===status)
);

});


const total=
requisitions.reduce(
(sum,r)=>sum+number(r.total_amount),
0
);

setText("reqOverallTotal",money(total));


if(!filtered.length){

tbody.innerHTML=`

<tr>
<td colspan="11"
style="text-align:center;padding:35px;color:#94a3b8">
No requisitions found.
</td>
</tr>

`;

return;

}


tbody.innerHTML=
filtered.map(r=>`

<tr>

<td>
<strong>
${escapeHtml(r.req_no||"")}
</strong>
</td>

<td>${escapeHtml(r.req_date||"")}</td>

<td>${escapeHtml(r.requested_by||"")}</td>

<td>${escapeHtml(vehicleName(r.vehicle_id))}</td>

<td>${escapeHtml(r.item_description||"")}</td>

<td>${number(r.quantity)}</td>

<td>${money(r.unit_cost)}</td>

<td><strong>${money(r.total_amount)}</strong></td>

<td>${escapeHtml(r.expense_type||"")}</td>

<td>
<span class="status ${statusClass(r.status)}">
${escapeHtml(r.status||"")}
</span>
</td>

<td>

<div class="table-actions">

<button
class="action-btn"
onclick="event.stopPropagation();previewReq('${r.id}')">
👁
</button>

<button
class="action-btn"
onclick="event.stopPropagation();editReq('${r.id}')">
✏️
</button>

<button
class="action-btn"
onclick="event.stopPropagation();deleteReq('${r.id}')">
🗑
</button>

</div>

</td>

</tr>

`).join("");

}


/* =========================================================
   OPEN REQUISITION
   ========================================================= */

window.openReqModal=function(id=null){

const form=
document.getElementById("reqForm");

if(form)
form.reset();

document.getElementById(
"reqId"
).value=id||"";

document.getElementById(
"reqModalTitle"
).textContent=
id?
"Edit Requisition":
"New Requisition";

document.getElementById(
"reqDate"
).value=today();

populateVehicleSelects();


if(!id){

document.getElementById(
"reqStatus"
).value="Pending";

document.getElementById(
"reqQuantity"
).value=1;

document.getElementById(
"reqUnitCost"
).value=0;

calculateReqTotal();

}else{

const r=
requisitions.find(x=>x.id===id);

if(!r)return;

document.getElementById("reqNo").value=
r.req_no||"";

document.getElementById("reqDate").value=
r.req_date||today();

document.getElementById("reqRequestedBy").value=
r.requested_by||"";

document.getElementById("reqVehicle").value=
r.vehicle_id||"";

document.getElementById("reqItemDescription").value=
r.item_description||"";

document.getElementById("reqQuantity").value=
r.quantity||0;

document.getElementById("reqUnitCost").value=
r.unit_cost||0;

document.getElementById("reqTotal").value=
r.total_amount||0;

document.getElementById("reqStatus").value=
r.status||"Pending";

document.getElementById("reqNotes").value=
r.notes||"";

document.getElementById("reqCategory").value=
r.category||"";

document.getElementById("reqExpenseType").value=
r.expense_type||"";

}

openModal("reqModal");

};


window.editReq=function(id){

openReqModal(id);

};


function calculateReqTotal(){

const qty=
number(
document.getElementById(
"reqQuantity"
)?.value
);

const unit=
number(
document.getElementById(
"reqUnitCost"
)?.value
);

const total=qty*unit;

const field=
document.getElementById("reqTotal");

if(field)
field.value=total;

}


document.getElementById("reqQuantity")
?.addEventListener(
"input",
calculateReqTotal
);

document.getElementById("reqUnitCost")
?.addEventListener(
"input",
calculateReqTotal
);


/* =========================================================
   SAVE REQUISITION
   ========================================================= */

document.getElementById("reqForm")
?.addEventListener("submit",async e=>{

e.preventDefault();

const id=
document.getElementById("reqId").value;

const quantity=
number(
document.getElementById("reqQuantity").value
);

const unitCost=
number(
document.getElementById("reqUnitCost").value
);

const total=quantity*unitCost;


const payload={

req_no:
document.getElementById("reqNo").value.trim(),

req_date:
document.getElementById("reqDate").value,

requested_by:
document.getElementById("reqRequestedBy").value.trim(),

vehicle_id:
document.getElementById("reqVehicle").value||null,

item_description:
document.getElementById("reqItemDescription").value.trim(),

quantity,

unit_cost:unitCost,

total_amount:total,

status:
document.getElementById("reqStatus").value,

notes:
document.getElementById("reqNotes").value.trim(),

category:
document.getElementById("reqCategory").value.trim(),

expense_type:
document.getElementById("reqExpenseType").value.trim()

};


let result;

if(id){

result=
await supabase
.from(TABLES.requisitions)
.update(payload)
.eq("id",id);

}else{

result=
await supabase
.from(TABLES.requisitions)
.insert([payload]);

}


if(result.error){

supabaseError(result.error);
return;

}

closeModal("reqModal");

showToast(
id?
"Requisition updated."
:
"Requisition created."
);

await loadAllData();

});


/* =========================================================
   DELETE REQUISITION
   ========================================================= */

window.deleteReq=async function(id){

if(!confirm(
"Delete this requisition?"
))
return;

const {error}=
await supabase
.from(TABLES.requisitions)
.delete()
.eq("id",id);

if(error){

supabaseError(error);
return;

}

showToast("Requisition deleted.");

await loadAllData();

};


/* =========================================================
   REQUISITION PREVIEW
   ========================================================= */

window.previewReq=function(id){

selectedReqId=id;

const r=
requisitions.find(x=>x.id===id);

if(!r)return;


const content=
document.getElementById(
"reqPreviewContent"
);

if(!content)return;


content.innerHTML=`

<div style="
font-family:Arial,sans-serif;
">

<div style="
border-bottom:2px solid #0f172a;
padding-bottom:14px;
margin-bottom:18px;
">

<h2 style="margin-bottom:5px">
GARAGE OPERATIONS PRO
</h2>

<div style="color:#64748b;font-size:12px">
Workshop Requisition
</div>

</div>


<table style="
width:100%;
min-width:0;
border-collapse:collapse;
">

<tr>
<td style="padding:8px 0;font-weight:bold">
Requisition No.
</td>

<td style="padding:8px 0">
${escapeHtml(r.req_no||"")}
</td>
</tr>


<tr>
<td style="padding:8px 0;font-weight:bold">
Date
</td>

<td style="padding:8px 0">
${escapeHtml(r.req_date||"")}
</td>
</tr>


<tr>
<td style="padding:8px 0;font-weight:bold">
Requested By
</td>

<td style="padding:8px 0">
${escapeHtml(r.requested_by||"")}
</td>
</tr>


<tr>
<td style="padding:8px 0;font-weight:bold">
Vehicle
</td>

<td style="padding:8px 0">
${escapeHtml(vehicleName(r.vehicle_id))}
</td>
</tr>


<tr>
<td style="padding:8px 0;font-weight:bold">
Item
</td>

<td style="padding:8px 0">
${escapeHtml(r.item_description||"")}
</td>
</tr>


<tr>
<td style="padding:8px 0;font-weight:bold">
Quantity
</td>

<td style="padding:8px 0">
${number(r.quantity)}
</td>
</tr>


<tr>
<td style="padding:8px 0;font-weight:bold">
Unit Cost
</td>

<td style="padding:8px 0">
${money(r.unit_cost)}
</td>
</tr>


<tr>
<td style="padding:8px 0;font-weight:bold">
Total
</td>

<td style="padding:8px 0;font-weight:bold">
${money(r.total_amount)}
</td>
</tr>


<tr>
<td style="padding:8px 0;font-weight:bold">
Expense Type
</td>

<td style="padding:8px 0">
${escapeHtml(r.expense_type||"")}
</td>
</tr>


<tr>
<td style="padding:8px 0;font-weight:bold">
Status
</td>

<td style="padding:8px 0">
${escapeHtml(r.status||"")}
</td>
</tr>

</table>

</div>

`;

openModal("reqPreviewModal");

};


window.previewSelectedReq=function(){

if(!requisitions.length){

showToast("There are no requisitions.");

return;

}

if(!selectedReqId){

previewReq(requisitions[0].id);

}else{

previewReq(selectedReqId);

}

};


/* =========================================================
   VEHICLE EXPENSE PREVIEW
   ========================================================= */

window.previewVehicleExpenses=function(vehicleId){

selectedVehicleExpenseId=vehicleId;

const vehicle=
vehicles.find(v=>v.id===vehicleId);

if(!vehicle)return;


const list=
expenses.filter(
e=>e.vehicle_id===vehicleId
);

const total=
list.reduce(
(sum,e)=>sum+number(e.amount),
0
);


const content=
document.getElementById(
"vehicleExpensePreviewContent"
);

content.innerHTML=`

<h2 style="margin-bottom:5px">
${escapeHtml(vehicle.registration)}
</h2>

<p style="
color:#64748b;
font-size:12px;
margin-bottom:18px;
">
${escapeHtml(vehicle.customer||"")}
</p>

<div style="
padding:15px;
background:#f8fafc;
border-radius:12px;
margin-bottom:18px;
">

<div style="
font-size:11px;
color:#64748b;
">
TOTAL VEHICLE EXPENSES
</div>

<div style="
font-size:24px;
font-weight:800;
margin-top:5px;
">
${money(total)}
</div>

</div>


${list.length?

list.map(e=>`

<div style="
padding:12px 0;
border-bottom:1px solid #e5e7eb;
">

<div style="font-weight:700;font-size:12px">
${escapeHtml(e.description||"")}
</div>

<div style="
font-size:10px;
color:#64748b;
margin-top:3px;
">
${escapeHtml(e.expense_date||"")}
 ·
${escapeHtml(e.category||"")}
</div>

<div style="
font-weight:700;
margin-top:5px;
">
${money(e.amount)}
</div>

</div>

`).join("")

:

`<p style="color:#94a3b8">
No expenses recorded for this vehicle.
</p>`

}

`;

openModal(
"vehicleExpensePreviewModal"
);

};


/* =========================================================
   PRINT HELPERS
   ========================================================= */

function printHtml(title,html){

const win=
window.open(
"",
"_blank",
"width=1000,height=700"
);

if(!win){

showToast("Please allow pop-ups to print.");

return;

}


win.document.write(`

<!DOCTYPE html>

<html>

<head>

<title>${escapeHtml(title)}</title>

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
background:#f3f4f6;
}

.header{
border-bottom:2px solid #111827;
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

setTimeout(()=>{
win.print();
},300);

}


window.printVehicles=function(){

const rows=
vehicles.map(v=>`

<tr>

<td>${escapeHtml(v.registration)}</td>
<td>${escapeHtml(v.customer)}</td>
<td>${escapeHtml(v.date_in||"")}</td>
<td>${escapeHtml(v.job_type||"")}</td>
<td>${escapeHtml(v.status||"")}</td>
<td>${money(v.billed)}</td>
<td>${money(v.paid)}</td>
<td>${money(
number(v.billed)-number(v.paid)
)}</td>

</tr>

`).join("");


printHtml(
"Garage Vehicles",
`

<div class="header">

<h1>Garage Operations Pro</h1>
<h3>Vehicle Register</h3>

</div>

<table>

<thead>

<tr>
<th>Registration</th>
<th>Customer</th>
<th>Date In</th>
<th>Job Type</th>
<th>Status</th>
<th>Billed</th>
<th>Paid</th>
<th>Outstanding</th>
</tr>

</thead>

<tbody>${rows}</tbody>

</table>

`
);

};


window.printExpenses=function(){

const rows=
expenses.map(e=>`

<tr>

<td>${escapeHtml(e.expense_date||"")}</td>
<td>${escapeHtml(vehicleName(e.vehicle_id))}</td>
<td>${escapeHtml(e.description||"")}</td>
<td>${escapeHtml(e.category||"")}</td>
<td>${money(e.amount)}</td>

</tr>

`).join("");


printHtml(
"Garage Expenses",
`

<div class="header">

<h1>Garage Operations Pro</h1>
<h3>Expenses</h3>

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

<tbody>${rows}</tbody>

</table>

`
);

};


window.printPettyCash=function(){

const rows=
pettyCash.map(p=>`

<tr>

<td>${escapeHtml(p.cash_date||"")}</td>
<td>${escapeHtml(p.description||"")}</td>
<td>${escapeHtml(p.paid_to||"")}</td>
<td>${escapeHtml(p.category||"")}</td>
<td>${money(p.amount)}</td>
<td>${escapeHtml(p.notes||"")}</td>

</tr>

`).join("");


printHtml(
"Garage Petty Cash",
`

<div class="header">

<h1>Garage Operations Pro</h1>
<h3>Petty Cash</h3>

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

<tbody>${rows}</tbody>

</table>

`
);

};


window.printRequisitions=function(){

const rows=
requisitions.map(r=>`

<tr>

<td>${escapeHtml(r.req_no||"")}</td>
<td>${escapeHtml(r.req_date||"")}</td>
<td>${escapeHtml(r.requested_by||"")}</td>
<td>${escapeHtml(vehicleName(r.vehicle_id))}</td>
<td>${escapeHtml(r.item_description||"")}</td>
<td>${number(r.quantity)}</td>
<td>${money(r.unit_cost)}</td>
<td>${money(r.total_amount)}</td>
<td>${escapeHtml(r.status||"")}</td>

</tr>

`).join("");


printHtml(
"Garage Requisitions",
`

<div class="header">

<h1>Garage Operations Pro</h1>
<h3>Requisitions</h3>

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

<tbody>${rows}</tbody>

</table>

`
);

};


window.printSelectedReq=function(){

if(!selectedReqId){

showToast("Select a requisition first.");

return;

}

const r=
requisitions.find(x=>x.id===selectedReqId);

if(!r)return;

printHtml(
"Requisition "+r.req_no,
document.getElementById(
"reqPreviewContent"
).innerHTML
);

};


window.printVehicleExpensePreview=function(){

if(!selectedVehicleExpenseId)return;

const content=
document.getElementById(
"vehicleExpensePreviewContent"
);

printHtml(
"Vehicle Expense Summary",
content.innerHTML
);

};


/* =========================================================
   SHARE
   ========================================================= */

async function shareText(title,text){

if(navigator.share){

try{

await navigator.share({
title,
text
});

}catch(error){

console.log(error);

}

}else{

try{

await navigator.clipboard.writeText(text);

showToast(
"Details copied to clipboard."
);

}catch(error){

showToast(
"Sharing is not supported on this device."
);

}

}

}


window.shareVehicle=function(id){

const v=
vehicles.find(x=>x.id===id);

if(!v)return;

shareText(
"Vehicle "+v.registration,
`

Vehicle: ${v.registration}

Customer: ${v.customer}

Date In: ${v.date_in||""}

Job Type: ${v.job_type||""}

Status: ${v.status||""}

Billed: ${money(v.billed)}

Paid: ${money(v.paid)}

Outstanding:
${money(number(v.billed)-number(v.paid))}
`
);

};


window.shareExpense=function(id){

const e=
expenses.find(x=>x.id===id);

if(!e)return;

shareText(
"Garage Expense",
`

Date: ${e.expense_date}

Vehicle: ${vehicleName(e.vehicle_id)}

Description: ${e.description}

Category: ${e.category}

Amount: ${money(e.amount)}
`
);

};


window.sharePetty=function(id){

const p=
pettyCash.find(x=>x.id===id);

if(!p)return;

shareText(
"Petty Cash",
`

Date: ${p.cash_date}

Description: ${p.description}

Paid To: ${p.paid_to}

Category: ${p.category}

Amount: ${money(p.amount)}

Notes: ${p.notes||""}
`
);

};


window.shareReq=function(id){

const r=
requisitions.find(x=>x.id===id);

if(!r)return;

shareText(
"Requisition "+r.req_no,
`

Requisition: ${r.req_no}

Date: ${r.req_date}

Requested By: ${r.requested_by}

Vehicle: ${vehicleName(r.vehicle_id)}

Item: ${r.item_description}

Quantity: ${r.quantity}

Unit Cost: ${money(r.unit_cost)}

Total: ${money(r.total_amount)}

Status: ${r.status}
`
);

};


/* =========================================================
   SEARCH / FILTER EVENTS
   ========================================================= */

[
"vehicleSearch",
"vehicleStatusFilter"
].forEach(id=>{

document.getElementById(id)
?.addEventListener(
"input",
renderVehicles
);

document.getElementById(id)
?.addEventListener(
"change",
renderVehicles
);

});


[
"expenseSearch",
"expenseCategoryFilter"
].forEach(id=>{

document.getElementById(id)
?.addEventListener(
"input",
renderExpenses
);

document.getElementById(id)
?.addEventListener(
"change",
renderExpenses
);

});


[
"pettySearch",
"pettyCategoryFilter"
].forEach(id=>{

document.getElementById(id)
?.addEventListener(
"input",
renderPettyCash
);

document.getElementById(id)
?.addEventListener(
"change",
renderPettyCash
);

});


[
"reqSearch",
"reqStatusFilter"
].forEach(id=>{

document.getElementById(id)
?.addEventListener(
"input",
renderRequisitions
);

document.getElementById(id)
?.addEventListener(
"change",
renderRequisitions
);

});


/* =========================================================
   MODAL OUTSIDE CLICK
   ========================================================= */

document.addEventListener("click",e=>{

if(e.target.classList.contains("modal")){

e.target.classList.remove("show");

}

});


document.addEventListener("keydown",e=>{

if(e.key==="Escape"){

document
.querySelectorAll(".modal.show")
.forEach(modal=>{
modal.classList.remove("show");
});

}

});


/* =========================================================
   GLOBAL ERROR HANDLING
   ========================================================= */

window.addEventListener(
"error",
e=>{
console.error(
"Application error:",
e.error||e.message
);
}
);


/* =========================================================
   START
   ========================================================= */

loadAllData();
