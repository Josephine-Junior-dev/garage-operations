import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://ptluwoeogfkqavhspdjj.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv';
const db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

let vehicles=[],expenses=[],pettyCash=[],requisitions=[],invoices=[],gatePasses=[];
let editingVehicleId=null,editingExpenseId=null,editingPettyId=null,editingReqId=null,editingInvoiceId=null,editingGatePassId=null;
let selectedReqNo=null,selectedVehicleId=null;

const $=id=>document.getElementById(id);
const num=v=>Number.isFinite(Number(v))?Number(v):0;

const money=v=>'KSh '+num(v).toLocaleString('en-KE',{
  minimumFractionDigits:0,
  maximumFractionDigits:2
});

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#039;'
}[m]));

const today=()=>new Date().toISOString().slice(0,10);

const date=v=>{
  if(!v)return '';
  const d=new Date(String(v).slice(0,10)+'T00:00:00');
  return Number.isNaN(d.getTime())?'':d.toLocaleDateString('en-KE',{
    year:'numeric',
    month:'short',
    day:'numeric'
  });
};

const statusClass=s=>String(s||'').toLowerCase().replace(/\s+/g,'-');

const badge=s=>`<span class="status status-${statusClass(s)}">${esc(s||'Unknown')}</span>`;

const toast=(m,t='success')=>{
  const x=$('toast');

  if(!x){
    alert(m);
    return;
  }

  x.textContent=m;
  x.style.display='block';
  x.style.background=
    t==='error'?'#991b1b':
    t==='warning'?'#92400e':
    '#07111f';

  clearTimeout(toast.t);

  toast.t=setTimeout(()=>{
    x.style.display='none';
  },3000);
};

function openModal(id){
  $(id)?.classList.add('show');
}

function closeModal(id){
  $(id)?.classList.remove('show');
}

function storageDays(a,b){
  if(!a)return 0;

  const s=new Date(
    String(a).slice(0,10)+'T00:00:00'
  );

  const e=new Date(
    String(b||today()).slice(0,10)+'T00:00:00'
  );

  return Math.max(
    0,
    Math.floor((e-s)/86400000)
  );
}

function normalizeJob(v){
  return ['Repair','Storage'].includes(String(v))
    ? String(v)
    : 'Repair';
}

function normalizeVehicleStatus(v){
  return [
    'Storage',
    'Under Repair',
    'Completed',
    'Released'
  ].includes(String(v))
    ? String(v)
    : 'Under Repair';
}

function vehicleName(id){
  const v=vehicles.find(
    x=>String(x.id)===String(id)
  );

  return v?.registration||'General';
}

function uniqueReqs(){
  return [
    ...new Set(
      requisitions
        .map(r=>r.req_no)
        .filter(Boolean)
    )
  ];
}

function reqTotal(no){
  return requisitions
    .filter(r=>r.req_no===no)
    .reduce(
      (s,r)=>s+num(r.total_amount),
      0
    );
}

function genNo(prefix,arr,field){
  let max=0;

  arr.forEach(r=>{
    const m=String(
      r?.[field]||''
    ).match(/(\d+)$/);

    if(m){
      max=Math.max(
        max,
        Number(m[1])
      );
    }
  });

  return `${prefix}-${new Date().getFullYear()}-${String(max+1).padStart(4,'0')}`;
}


/* =========================================================
   SUPABASE LOADING
   ========================================================= */

async function loadTable(table,order){

  try{

    let q=db
      .from(table)
      .select('*');

    if(order){
      q=q.order(order,{
        ascending:false
      });
    }

    let r=await q;

    /*
     * IMPORTANT:
     * Older tables may not have created_at.
     * If ordering fails because that column does
     * not exist, load normally instead of returning
     * an empty array.
     */

    if(
      r.error &&
      order &&
      String(r.error.message)
        .toLowerCase()
        .includes(order.toLowerCase())
    ){

      console.warn(
        `Column ${order} not available in ${table}. Loading without ordering.`
      );

      r=await db
        .from(table)
        .select('*');
    }

    if(r.error){

      console.error(
        `Supabase error loading ${table}:`,
        r.error
      );

      return {
        data:[],
        error:r.error
      };
    }

    return {
      data:r.data||[],
      error:null
    };

  }catch(error){

    console.error(
      `Unexpected error loading ${table}:`,
      error
    );

    return {
      data:[],
      error
    };
  }
}


/* =========================================================
   LOAD ALL DATA
   ========================================================= */

async function loadAllData(){

  const results=await Promise.all([

    loadTable(
      'vehicles',
      'created_at'
    ),

    loadTable(
      'expenses',
      'created_at'
    ),

    loadTable(
      'petty_cash',
      'created_at'
    ),

    loadTable(
      'requisitions',
      'req_date'
    ),

    loadTable(
      'invoices',
      'created_at'
    ),

    loadTable(
      'gate_passes',
      'created_at'
    )

  ]);

  [
    vehicles,
    expenses,
    pettyCash,
    requisitions,
    invoices,
    gatePasses
  ]=results.map(
    r=>r.data||[]
  );

  results
    .slice(0,4)
    .forEach((r,i)=>{

      if(r.error){

        console.error(
          [
            'vehicles',
            'expenses',
            'petty_cash',
            'requisitions'
          ][i],
          r.error
        );
      }

    });

  renderAll();
}


/* =========================================================
   RENDER ALL
   ========================================================= */

function renderAll(){

  renderDashboard();

  renderVehicles();

  renderExpenses();

  renderPettyCash();

  renderRequisitions();

  renderInvoices();

  renderGatePasses();

  populateVehicleSelects();

  populateInvoiceSelects();
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard(){

  const billed=vehicles.reduce(
    (s,v)=>s+num(v.billed),
    0
  );

  const paid=vehicles.reduce(
    (s,v)=>s+num(v.paid),
    0
  );

  const outstanding=vehicles.reduce(
    (s,v)=>
      s+
      Math.max(
        num(v.billed)-num(v.paid),
        0
      ),
    0
  );

  const totalExpenses=expenses.reduce(
    (s,r)=>s+num(r.amount),
    0
  );

  const totalPetty=pettyCash.reduce(
    (s,r)=>s+num(r.amount),
    0
  );

  const reqs=uniqueReqs();

  const reqGrandTotal=reqs.reduce(
    (s,n)=>s+reqTotal(n),
    0
  );

  const values={

    dashVehicles:
      vehicles.length,

    dashRepair:
      vehicles.filter(
        v=>
          String(v.status)
            .toLowerCase()==='under repair'
      ).length,

    dashOutstanding:
      money(outstanding),

    dashReq:
      reqs.length,

    dashBilled:
      money(billed),

    dashPaid:
      money(paid),

    dashExpenses:
      money(totalExpenses),

    dashPetty:
      money(totalPetty),

    dashReqCount:
      reqs.length,

    dashReqTotal:
      money(reqGrandTotal),

    reqOverallTotal:
      money(reqGrandTotal)

  };

  Object.entries(values).forEach(
    ([id,value])=>{

      if($(id)){
        $(id).textContent=value;
      }

    }
  );


  const activity=$('dashboardActivity');

  if(activity){

    const rows=[

      ...vehicles.map(v=>({
        icon:'🚘',
        message:`Vehicle ${v.registration||''}`,
        d:v.created_at||v.date_in
      })),

      ...expenses.map(e=>({
        icon:'💳',
        message:
          `Expense ${e.description||''} — ${vehicleName(e.vehicle_id)}`,
        d:e.created_at||e.expense_date
      })),

      ...requisitions.map(r=>({
        icon:'📋',
        message:`Requisition ${r.req_no||''}`,
        d:r.created_at||r.req_date
      }))

    ]
    .sort(
      (a,b)=>
        new Date(b.d||0)-
        new Date(a.d||0)
    )
    .slice(0,10);

    activity.innerHTML=rows.length

      ?rows.map(r=>`

        <div class="activity-item">

          <div class="activity-icon">
            ${r.icon}
          </div>

          <div class="activity-main">

            <strong>
              ${esc(r.message)}
            </strong>

            <span>
              ${date(r.d)}
            </span>

          </div>

        </div>

      `).join('')

      :'<div style="color:#64748b">No recent activity.</div>';
  }
}


/* =========================================================
   VEHICLES
   ========================================================= */

function renderVehicles(){

  const body=$('vehiclesTableBody');

  if(!body)return;

  const search=(
    $('vehicleSearch')?.value||''
  )
  .toLowerCase();

  const status=(
    $('vehicleStatusFilter')?.value||''
  )
  .toLowerCase();

  const rows=vehicles.filter(v=>{

    const text=[

      v.registration,
      v.customer,
      v.model,
      v.model_year,
      v.color,
      v.job_type,
      v.status,
      v.description,
      v.released_to

    ]
    .join(' ')
    .toLowerCase();

    return(
      (!search||text.includes(search))&&
      (
        !status||
        String(v.status||'')
          .toLowerCase()===status
      )
    );

  });

  if(!rows.length){

    body.innerHTML=`

      <tr>

        <td
          colspan="10"
          style="
            text-align:center;
            padding:30px;
            color:#64748b
          "
        >
          No vehicles found.
        </td>

      </tr>

    `;

    return;
  }

  body.innerHTML=rows.map(v=>{

    const outstanding=Math.max(
      num(v.billed)-num(v.paid),
      0
    );

    const days=
      normalizeJob(v.job_type)==='Storage'||
      normalizeVehicleStatus(v.status)==='Storage'
      ?storageDays(
          v.date_in,
          v.date_out
        )
      :'—';

    return`

      <tr>

        <td>

          <strong>
            ${esc(v.registration)}
          </strong>

          <br>

          <small>
            ${esc(v.model||'')}
            ${esc(v.model_year||'')}
          </small>

        </td>

        <td>
          ${esc(v.customer)}
        </td>

        <td>
          ${date(v.date_in)}
        </td>

        <td>
          ${esc(normalizeJob(v.job_type))}
        </td>

        <td>
          ${badge(
            normalizeVehicleStatus(
              v.status
            )
          )}
        </td>

        <td>
          ${days}
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
              onclick="openVehicleModal('${esc(v.id)}')"
            >
              ✏️
            </button>

            <button
              class="action-btn"
              onclick="openVehicleExpensePreview('${esc(v.id)}')"
            >
              💳
            </button>

            <button
              class="action-btn"
              onclick="openInvoiceModal(null,'${esc(v.id)}')"
            >
              🧾
            </button>

            <button
              class="action-btn"
              onclick="openGatePassModal(null,'${esc(v.id)}')"
            >
              🚪
            </button>

            <button
              class="action-btn"
              onclick="deleteVehicle('${esc(v.id)}')"
            >
              🗑
            </button>

          </div>

        </td>

      </tr>

    `;

  }).join('');
}


/* =========================================================
   EXPENSES
   ========================================================= */

function renderExpenses(){

  const body=$('expensesTableBody');

  if(!body)return;

  const search=(
    $('expenseSearch')?.value||''
  ).toLowerCase();

  const category=(
    $('expenseCategoryFilter')?.value||''
  ).toLowerCase();

  const rows=expenses.filter(e=>{

    const text=[
      vehicleName(e.vehicle_id),
      e.description,
      e.category
    ]
    .join(' ')
    .toLowerCase();

    return(
      (!search||text.includes(search))&&
      (
        !category||
        String(e.category||'')
          .toLowerCase()===category
      )
    );

  });

  body.innerHTML=rows.length

    ?rows.map(e=>`

      <tr>

        <td>
          ${date(e.expense_date)}
        </td>

        <td>
          ${esc(
            vehicleName(e.vehicle_id)
          )}
        </td>

        <td>
          ${esc(e.description)}
        </td>

        <td>
          ${esc(e.category)}
        </td>

        <td>
          ${money(e.amount)}
        </td>

        <td>

          <div class="table-actions">

            <button
              class="action-btn"
              onclick="openExpenseModal('${esc(e.id)}')"
            >
              ✏️
            </button>

            <button
              class="action-btn"
              onclick="deleteExpense('${esc(e.id)}')"
            >
              🗑
            </button>

          </div>

        </td>

      </tr>

    `).join('')

    :`

      <tr>

        <td
          colspan="6"
          style="
            text-align:center;
            padding:30px;
            color:#64748b
          "
        >
          No expenses found.
        </td>

      </tr>

    `;
}


/* =========================================================
   PETTY CASH
   ========================================================= */

function renderPettyCash(){

  const body=$('pettyTableBody');

  if(!body)return;

  const search=(
    $('pettySearch')?.value||''
  ).toLowerCase();

  const category=(
    $('pettyCategoryFilter')?.value||''
  ).toLowerCase();

  const rows=pettyCash.filter(e=>{

    const text=[
      e.description,
      e.paid_to,
      e.category,
      e.notes
    ]
    .join(' ')
    .toLowerCase();

    return(
      (!search||text.includes(search))&&
      (
        !category||
        String(e.category||'')
          .toLowerCase()===category
      )
    );

  });

  body.innerHTML=rows.length

    ?rows.map(e=>`

      <tr>

        <td>
          ${date(e.cash_date)}
        </td>

        <td>
          ${esc(e.description)}
        </td>

        <td>
          ${esc(e.paid_to)}
        </td>

        <td>
          ${esc(e.category)}
        </td>

        <td>
          ${money(e.amount)}
        </td>

        <td>
          ${esc(e.notes)}
        </td>

        <td>

          <div class="table-actions">

            <button
              class="action-btn"
              onclick="openPettyModal('${esc(e.id)}')"
            >
              ✏️
            </button>

            <button
              class="action-btn"
              onclick="deletePetty('${esc(e.id)}')"
            >
              🗑
            </button>

          </div>

        </td>

      </tr>

    `).join('')

    :`

      <tr>

        <td
          colspan="7"
          style="
            text-align:center;
            padding:30px;
            color:#64748b
          "
        >
          No petty cash records found.
        </td>

      </tr>

    `;
}


/* =========================================================
   REQUISITIONS
   ========================================================= */

function renderRequisitions(){

  const body=$('requisitionsTableBody');

  if(!body)return;

  const search=(
    $('reqSearch')?.value||''
  ).toLowerCase();

  const status=(
    $('reqStatusFilter')?.value||''
  ).toLowerCase();

  const rows=requisitions.filter(r=>{

    const text=[

      r.req_no,
      r.requested_by,
      vehicleName(r.vehicle_id),
      r.item_description,
      r.expense_type,
      r.category

    ]
    .join(' ')
    .toLowerCase();

    return(
      (!search||text.includes(search))&&
      (
        !status||
        String(r.status||'')
          .toLowerCase()===status
      )
    );

  });

  body.innerHTML=rows.length

    ?rows.map(r=>`

      <tr>

        <td>
          ${esc(r.req_no)}
        </td>

        <td>
          ${date(r.req_date)}
        </td>

        <td>
          ${esc(r.requested_by)}
        </td>

        <td>
          ${esc(
            vehicleName(r.vehicle_id)
          )}
        </td>

        <td>
          ${esc(r.item_description)}
        </td>

        <td>
          ${num(r.quantity)}
        </td>

        <td>
          ${money(r.unit_cost)}
        </td>

        <td>
          ${money(r.total_amount)}
        </td>

        <td>
          ${esc(
            r.expense_type||
            r.category||
            ''
          )}
        </td>

        <td>
          ${badge(r.status)}
        </td>

        <td>

          <div class="table-actions">

            <button
              class="action-btn"
              onclick="openReqModal('${esc(r.id)}')"
            >
              ✏️
            </button>

            <button
              class="action-btn"
              onclick="previewReq('${esc(r.req_no)}')"
            >
              👁
            </button>

            <button
              class="action-btn"
              onclick="deleteReq('${esc(r.id)}')"
            >
              🗑
            </button>

          </div>

        </td>

      </tr>

    `).join('')

    :`

      <tr>

        <td
          colspan="11"
          style="
            text-align:center;
            padding:30px;
            color:#64748b
          "
        >
          No requisitions found.
        </td>

      </tr>

    `;
}


/* =========================================================
   SELECT LISTS
   ========================================================= */

function populateVehicleSelects(){

  [
    'expenseVehicle',
    'reqVehicle',
    'invoiceVehicle',
    'gateVehicle'
  ].forEach(id=>{

    const select=$(id);

    if(!select)return;

    const old=select.value;

    select.innerHTML=
      '<option value="">General / Select vehicle</option>'+
      vehicles.map(v=>`

        <option value="${esc(v.id)}">

          ${esc(v.registration)}
          — ${esc(v.customer||'')}

        </option>

      `).join('');

    if(old){
      select.value=old;
    }

  });
}


function populateInvoiceSelects(){

  const select=$('gateInvoice');

  if(!select)return;

  const old=select.value;

  select.innerHTML=
    '<option value="">No Invoice</option>'+
    invoices.map(i=>`

      <option value="${esc(i.id)}">

        ${esc(i.invoice_no||i.id)}
        —
        ${esc(i.vehicle_registration||'')}

      </option>

    `).join('');

  if(old){
    select.value=old;
  }
}


/* =========================================================
   VEHICLE CRUD
   ========================================================= */

function openVehicleModal(id=null){

  $('vehicleForm')?.reset();

  editingVehicleId=id;

  if($('vehicleDateIn')){
    $('vehicleDateIn').value=today();
  }

  if($('vehicleStatus')){
    $('vehicleStatus').value='Under Repair';
  }

  if($('vehicleJobType')){
    $('vehicleJobType').value='Repair';
  }

  if($('vehicleModalTitle')){
    $('vehicleModalTitle').textContent=
      id?'Edit Vehicle':'Add Vehicle';
  }

  if(id){

    const v=vehicles.find(
      x=>String(x.id)===String(id)
    );

    if(!v)return;

    const fields={

      vehicleId:v.id,

      vehicleRegistration:v.registration,

      vehicleCustomer:v.customer,

      vehicleModel:v.model,

      vehicleModelYear:v.model_year,

      vehicleColor:v.color,

      vehicleDateIn:v.date_in,

      vehicleDateOut:v.date_out,

      vehicleStorageDays:
        storageDays(
          v.date_in,
          v.date_out
        ),

      vehicleJobType:
        normalizeJob(v.job_type),

      vehicleStatus:
        normalizeVehicleStatus(
          v.status
        ),

      vehicleReleasedTo:
        v.released_to,

      vehicleReleasedContact:
        v.released_contact,

      vehicleBilled:
        v.billed||0,

      vehiclePaid:
        v.paid||0,

      vehicleDescription:
        v.description

    };

    Object.entries(fields).forEach(
      ([key,value])=>{

        if($(key)){
          $(key).value=value??'';
        }

      }
    );

  }

  openModal('vehicleModal');
}


async function saveVehicle(e){

  e.preventDefault();

  const id=
    $('vehicleId')?.value||
    editingVehicleId;

  const registration=
    $('vehicleRegistration')
      .value
      .trim();

  if(!registration)return;

  const duplicate=vehicles.find(v=>
    String(v.registration||'')
      .toLowerCase()===
    registration.toLowerCase()&&
    String(v.id)!==String(id)
  );

  if(duplicate){

    toast(
      'Registration / chassis number already exists.',
      'error'
    );

    return;
  }

  const payload={

    registration,

    customer:
      $('vehicleCustomer')
        .value.trim(),

    model:
      $('vehicleModel')
        .value.trim(),

    model_year:
      $('vehicleModelYear')
        .value||null,

    color:
      $('vehicleColor')
        .value.trim(),

    date_in:
      $('vehicleDateIn')
        .value,

    date_out:
      $('vehicleDateOut')
        .value||null,

    job_type:
      normalizeJob(
        $('vehicleJobType')
          .value
      ),

    status:
      normalizeVehicleStatus(
        $('vehicleStatus')
          .value
      ),

    released_to:
      $('vehicleReleasedTo')
        .value.trim(),

    released_contact:
      $('vehicleReleasedContact')
        .value.trim(),

    billed:
      num(
        $('vehicleBilled').value
      ),

    paid:
      num(
        $('vehiclePaid').value
      ),

    description:
      $('vehicleDescription')
        .value.trim()

  };

  try{

    const result=id

      ?await db
        .from('vehicles')
        .update(payload)
        .eq('id',id)

      :await db
        .from('vehicles')
        .insert(payload);

    if(result.error){
      throw result.error;
    }

    closeModal('vehicleModal');

    toast(
      id
        ?'Vehicle updated.'
        :'Vehicle added.'
    );

    await loadAllData();

  }catch(error){

    console.error(error);

    toast(
      error.message||
      'Could not save vehicle.',
      'error'
    );
  }
}


async function deleteVehicle(id){

  if(!confirm(
    'Delete this vehicle and its record?'
  ))return;

  const result=await db
    .from('vehicles')
    .delete()
    .eq('id',id);

  if(result.error){

    toast(
      result.error.message,
      'error'
    );

    return;
  }

  toast('Vehicle deleted.');

  await loadAllData();
}


/* =========================================================
   EXPENSE CRUD
   ========================================================= */

function openExpenseModal(id=null){

  $('expenseForm')?.reset();

  editingExpenseId=id;

  if($('expenseDate')){
    $('expenseDate').value=today();
  }

  populateVehicleSelects();

  if(id){

    const e=expenses.find(
      x=>String(x.id)===String(id)
    );

    if(!e)return;

    const fields={

      expenseId:e.id,

      expenseVehicle:e.vehicle_id,

      expenseDate:e.expense_date,

      expenseCategory:e.category,

      expenseAmount:e.amount,

      expenseDescription:e.description

    };

    Object.entries(fields).forEach(
      ([key,value])=>{

        if($(key)){
          $(key).value=value??'';
        }

      }
    );

    $('expenseModalTitle').textContent=
      'Edit Expense';

  }else{

    $('expenseModalTitle').textContent=
      'Add Expense';

  }

  openModal('expenseModal');
}


async function saveExpense(e){

  e.preventDefault();

  const id=
    $('expenseId').value||
    editingExpenseId;

  const payload={

    vehicle_id:
      $('expenseVehicle').value||
      null,

    expense_date:
      $('expenseDate').value,

    description:
      $('expenseDescription')
        .value.trim(),

    category:
      $('expenseCategory').value,

    amount:
      num(
        $('expenseAmount').value
      )

  };

  try{

    const result=id

      ?await db
        .from('expenses')
        .update(payload)
        .eq('id',id)

      :await db
        .from('expenses')
        .insert(payload);

    if(result.error){
      throw result.error;
    }

    closeModal('expenseModal');

    toast('Expense saved.');

    await loadAllData();

  }catch(error){

    toast(
      error.message||
      'Could not save expense.',
      'error'
    );
  }
}


async function deleteExpense(id){

  if(!confirm(
    'Delete this expense?'
  ))return;

  const result=await db
    .from('expenses')
    .delete()
    .eq('id',id);

  if(result.error){

    toast(
      result.error.message,
      'error'
    );

    return;
  }

  toast('Expense deleted.');

  await loadAllData();
}


/* =========================================================
   PETTY CASH CRUD
   ========================================================= */

function openPettyModal(id=null){

  $('pettyForm')?.reset();

  editingPettyId=id;

  if($('pettyDate')){
    $('pettyDate').value=today();
  }

  if(id){

    const p=pettyCash.find(
      x=>String(x.id)===String(id)
    );

    if(!p)return;

    const fields={

      pettyId:p.id,

      pettyDate:p.cash_date,

      pettyPaidTo:p.paid_to,

      pettyCategory:p.category,

      pettyAmount:p.amount,

      pettyDescription:p.description,

      pettyNotes:p.notes

    };

    Object.entries(fields).forEach(
      ([key,value])=>{

        if($(key)){
          $(key).value=value??'';
        }

      }
    );

    $('pettyModalTitle').textContent=
      'Edit Petty Cash';

  }else{

    $('pettyModalTitle').textContent=
      'Add Petty Cash';

  }

  openModal('pettyModal');
}


async function savePetty(e){

  e.preventDefault();

  const id=
    $('pettyId').value||
    editingPettyId;

  const payload={

    cash_date:
      $('pettyDate').value,

    paid_to:
      $('pettyPaidTo')
        .value.trim(),

    category:
      $('pettyCategory').value,

    amount:
      num(
        $('pettyAmount').value
      ),

    description:
      $('pettyDescription')
        .value.trim(),

    notes:
      $('pettyNotes')
        .value.trim()

  };

  try{

    const result=id

      ?await db
        .from('petty_cash')
        .update(payload)
        .eq('id',id)

      :await db
        .from('petty_cash')
        .insert(payload);

    if(result.error){
      throw result.error;
    }

    closeModal('pettyModal');

    toast('Petty cash saved.');

    await loadAllData();

  }catch(error){

    toast(
      error.message||
      'Could not save petty cash.',
      'error'
    );
  }
}


async function deletePetty(id){

  if(!confirm(
    'Delete this petty cash record?'
  ))return;

  const result=await db
    .from('petty_cash')
    .delete()
    .eq('id',id);

  if(result.error){

    toast(
      result.error.message,
      'error'
    );

    return;
  }

  toast('Petty cash deleted.');

  await loadAllData();
}


/* =========================================================
   REQUISITIONS
   ========================================================= */

function calculateReqTotal(){

  if($('reqTotal')){

    $('reqTotal').value=(
      num(
        $('reqQuantity')?.value
      )*
      num(
        $('reqUnitCost')?.value
      )
    ).toFixed(2);

  }
}


function openReqModal(id=null){

  $('reqForm')?.reset();

  editingReqId=id;

  populateVehicleSelects();

  if(!id){

    $('reqDate').value=today();

    $('reqNo').value=
      genNo(
        'REQ',
        requisitions,
        'req_no'
      );

    $('reqQuantity').value=1;

    $('reqStatus').value='Pending';

    $('reqModalTitle').textContent=
      'New Requisition';

  }else{

    const r=requisitions.find(
      x=>String(x.id)===String(id)
    );

    if(!r)return;

    const fields={

      reqId:r.id,

      reqNo:r.req_no,

      reqDate:r.req_date,

      reqRequestedBy:r.requested_by,

      reqVehicle:r.vehicle_id,

      reqItemDescription:
        r.item_description,

      reqQuantity:r.quantity,

      reqUnitCost:r.unit_cost,

      reqTotal:r.total_amount,

      reqStatus:r.status,

      reqCategory:r.category,

      reqExpenseType:r.expense_type,

      reqNotes:r.notes

    };

    Object.entries(fields).forEach(
      ([key,value])=>{

        if($(key)){
          $(key).value=value??'';
        }

      }
    );

    $('reqModalTitle').textContent=
      'Edit Requisition';

  }

  calculateReqTotal();

  openModal('reqModal');
}


async function saveReq(e){

  e.preventDefault();

  calculateReqTotal();

  const id=
    $('reqId').value||
    editingReqId;

  const payload={

    req_no:
      $('reqNo').value.trim(),

    req_date:
      $('reqDate').value,

    requested_by:
      $('reqRequestedBy')
        .value.trim(),

    vehicle_id:
      $('reqVehicle').value||
      null,

    item_description:
      $('reqItemDescription')
        .value.trim(),

    quantity:
      num(
        $('reqQuantity').value
      ),

    unit_cost:
      num(
        $('reqUnitCost').value
      ),

    total_amount:
      num(
        $('reqTotal').value
      ),

    status:
      $('reqStatus').value,

    category:
      $('reqCategory').value||
      null,

    expense_type:
      $('reqExpenseType').value||
      null,

    notes:
      $('reqNotes')
        .value.trim()

  };

  try{

    const result=id

      ?await db
        .from('requisitions')
        .update(payload)
        .eq('id',id)

      :await db
        .from('requisitions')
        .insert(payload);

    if(result.error){
      throw result.error;
    }

    closeModal('reqModal');

    toast('Requisition saved.');

    await loadAllData();

  }catch(error){

    toast(
      error.message||
      'Could not save requisition.',
      'error'
    );
  }
}


async function deleteReq(id){

  if(!confirm(
    'Delete this requisition?'
  ))return;

  const result=await db
    .from('requisitions')
    .delete()
    .eq('id',id);

  if(result.error){

    toast(
      result.error.message,
      'error'
    );

    return;
  }

  toast('Requisition deleted.');

  await loadAllData();
}


function previewReq(no){

  selectedReqNo=no;

  const rows=
    requisitions.filter(
      r=>r.req_no===no
    );

  const box=$('reqPreviewContent');

  if(!box)return;

  box.innerHTML=`

    <h3>
      Requisition ${esc(no)}
    </h3>

    <table
      style="
        width:100%;
        border-collapse:collapse
      "
    >

      <tr>

        <th>Vehicle</th>
        <th>Item</th>
        <th>Qty</th>
        <th>Total</th>
        <th>Status</th>

      </tr>

      ${rows.map(r=>`

        <tr>

          <td>
            ${esc(
              vehicleName(
                r.vehicle_id
              )
            )}
          </td>

          <td>
            ${esc(
              r.item_description
            )}
          </td>

          <td>
            ${num(r.quantity)}
          </td>

          <td>
            ${money(r.total_amount)}
          </td>

          <td>
            ${esc(r.status)}
          </td>

        </tr>

      `).join('')}

    </table>

    <p>

      <strong>
        Total:
        ${money(reqTotal(no))}
      </strong>

    </p>

  `;

  openModal(
    'reqPreviewModal'
  );
}


function previewSelectedReq(){

  if(selectedReqNo){
    previewReq(selectedReqNo);
  }

}


/* =========================================================
   VEHICLE EXPENSE REPORT
   ========================================================= */

function openVehicleExpensePreview(id){

  selectedVehicleId=id;

  const v=vehicles.find(
    x=>String(x.id)===String(id)
  );

  const rows=expenses.filter(
    e=>String(e.vehicle_id)===
       String(id)
  );

  const total=rows.reduce(
    (s,e)=>s+num(e.amount),
    0
  );

  const box=
    $('vehicleExpensePreviewContent');

  if(!box||!v)return;

  box.innerHTML=`

    <h2>
      ${esc(v.registration)}
      — Expense Report
    </h2>

    <p>

      <strong>Customer:</strong>
      ${esc(v.customer)}

      &nbsp;

      <strong>Model:</strong>
      ${esc(v.model)}

      &nbsp;

      <strong>Year:</strong>
      ${esc(v.model_year)}

      &nbsp;

      <strong>Colour:</strong>
      ${esc(v.color)}

    </p>

    <p>

      <strong>Date In:</strong>
      ${date(v.date_in)}

      &nbsp;

      <strong>Date Out:</strong>
      ${date(v.date_out)}

    </p>

    <table
      style="
        width:100%;
        border-collapse:collapse
      "
    >

      <tr>

        <th>Date</th>
        <th>Description</th>
        <th>Category</th>
        <th>Amount</th>

      </tr>

      ${rows.map(e=>`

        <tr>

          <td>
            ${date(e.expense_date)}
          </td>

          <td>
            ${esc(e.description)}
          </td>

          <td>
            ${esc(e.category)}
          </td>

          <td>
            ${money(e.amount)}
          </td>

        </tr>

      `).join('')}

    </table>

    <h3 style="text-align:right">

      TOTAL INCURRED:
      ${money(total)}

    </h3>

  `;

  openModal(
    'vehicleExpensePreviewModal'
  );
}


/* =========================================================
   PRINT ENGINE
   ========================================================= */

function printHtml(
  body,
  title='Garage Operations Pro'
){

  const w=window.open(
    '',
    '_blank',
    'width=1000,height=800'
  );

  if(!w){

    toast(
      'Please allow pop-ups to print.',
      'error'
    );

    return;
  }

  w.document.write(`

    <!doctype html>

    <html>

    <head>

      <title>
        ${esc(title)}
      </title>

      <style>

        body{
          font-family:Arial;
          padding:25px;
          color:#111;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:15px;
        }

        th,
        td{
          border:1px solid #ccc;
          padding:8px;
          text-align:left;
        }

        th{
          background:#f3f4f6;
        }

        .right{
          text-align:right;
        }

        @page{
          size:A4;
          margin:10mm;
        }

      </style>

    </head>

    <body>

      ${body}

      <script>
        window.onload=()=>{
          window.print();
        };
      <\/script>

    </body>

    </html>

  `);

  w.document.close();
}


/* =========================================================
   PRINT VEHICLES
   ========================================================= */

function printVehicles(){

  const rows=vehicles.map(v=>`

    <tr>

      <td>
        ${esc(v.registration)}
      </td>

      <td>
        ${esc(v.customer)}
      </td>

      <td>
        ${date(v.date_in)}
      </td>

      <td>
        ${esc(v.job_type)}
      </td>

      <td>
        ${esc(v.status)}
      </td>

      <td>
        ${storageDays(
          v.date_in,
          v.date_out
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
            num(v.billed)-
            num(v.paid),
            0
          )
        )}
      </td>

    </tr>

  `).join('');

  printHtml(`

    <h1>
      GARAGE OPERATIONS PRO
    </h1>

    <h2>
      VEHICLE REGISTER
    </h2>

    <table>

      <tr>

        <th>Registration</th>
        <th>Customer</th>
        <th>Date In</th>
        <th>Job</th>
        <th>Status</th>
        <th>Storage Days</th>
        <th>Billed</th>
        <th>Paid</th>
        <th>Outstanding</th>

      </tr>

      ${rows}

    </table>

  `,'Vehicle Register');
}


/* =========================================================
   PRINT EXPENSES
   ========================================================= */

function printExpenses(){

  const rows=expenses.map(e=>`

    <tr>

      <td>
        ${date(e.expense_date)}
      </td>

      <td>
        ${esc(
          vehicleName(
            e.vehicle_id
          )
        )}
      </td>

      <td>
        ${esc(e.description)}
      </td>

      <td>
        ${esc(e.category)}
      </td>

      <td>
        ${money(e.amount)}
      </td>

    </tr>

  `).join('');

  printHtml(`

    <h1>
      GARAGE OPERATIONS PRO
    </h1>

    <h2>
      EXPENSE REGISTER
    </h2>

    <table>

      <tr>

        <th>Date</th>
        <th>Vehicle</th>
        <th>Description</th>
        <th>Category</th>
        <th>Amount</th>

      </tr>

      ${rows}

    </table>

  `,'Expense Register');
}


/* =========================================================
   PRINT PETTY CASH
   ========================================================= */

function printPettyCash(){

  const rows=pettyCash.map(e=>`

    <tr>

      <td>
        ${date(e.cash_date)}
      </td>

      <td>
        ${esc(e.description)}
      </td>

      <td>
        ${esc(e.paid_to)}
      </td>

      <td>
        ${esc(e.category)}
      </td>

      <td>
        ${money(e.amount)}
      </td>

    </tr>

  `).join('');

  printHtml(`

    <h1>
      GARAGE OPERATIONS PRO
    </h1>

    <h2>
      PETTY CASH REGISTER
    </h2>

    <table>

      <tr>

        <th>Date</th>
        <th>Description</th>
        <th>Paid To</th>
        <th>Category</th>
        <th>Amount</th>

      </tr>

      ${rows}

    </table>

  `,'Petty Cash Register');
}


/* =========================================================
   PRINT REQUISITIONS
   ========================================================= */

function printRequisitions(){

  const rows=requisitions.map(r=>`

    <tr>

      <td>
        ${esc(r.req_no)}
      </td>

      <td>
        ${date(r.req_date)}
      </td>

      <td>
        ${esc(r.requested_by)}
      </td>

      <td>
        ${esc(
          vehicleName(
            r.vehicle_id
          )
        )}
      </td>

      <td>
        ${esc(r.item_description)}
      </td>

      <td>
        ${num(r.quantity)}
      </td>

      <td>
        ${money(r.unit_cost)}
      </td>

      <td>
        ${money(r.total_amount)}
      </td>

      <td>
        ${esc(r.status)}
      </td>

    </tr>

  `).join('');

  printHtml(`

    <h1>
      GARAGE OPERATIONS PRO
    </h1>

    <h2>
      REQUISITION REGISTER
    </h2>

    <table>

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

      ${rows}

    </table>

  `,'Requisition Register');
}


/* =========================================================
   PRINT SELECTED REQUISITION
   ========================================================= */

function printSelectedReq(){

  if(!selectedReqNo)return;

  const rows=requisitions.filter(
    r=>r.req_no===selectedReqNo
  );

  printHtml(`

    <h1>
      GARAGE OPERATIONS PRO
    </h1>

    <h2>
      REQUISITION
      ${esc(selectedReqNo)}
    </h2>

    <table>

      <tr>

        <th>Vehicle</th>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit</th>
        <th>Total</th>
        <th>Status</th>

      </tr>

      ${rows.map(r=>`

        <tr>

          <td>
            ${esc(
              vehicleName(
                r.vehicle_id
              )
            )}
          </td>

          <td>
            ${esc(
              r.item_description
            )}
          </td>

          <td>
            ${num(r.quantity)}
          </td>

          <td>
            ${money(r.unit_cost)}
          </td>

          <td>
            ${money(r.total_amount)}
          </td>

          <td>
            ${esc(r.status)}
          </td>

        </tr>

      `).join('')}

    </table>

    <h3>
      Total:
      ${money(
        reqTotal(
          selectedReqNo
        )
      )}
    </h3>

  `,'Requisition');
}


/* =========================================================
   PRINT VEHICLE EXPENSE REPORT
   ========================================================= */

function printVehicleExpensePreview(){

  if(!selectedVehicleId)return;

  const v=vehicles.find(
    x=>String(x.id)===
       String(selectedVehicleId)
  );

  if(!v)return;

  const rows=expenses.filter(
    e=>String(e.vehicle_id)===
       String(selectedVehicleId)
  );

  const total=rows.reduce(
    (s,e)=>s+num(e.amount),
    0
  );

  printHtml(`

    <h1>
      GARAGE OPERATIONS PRO
    </h1>

    <h2>
      VEHICLE EXPENSE REPORT
    </h2>

    <p>

      <strong>
        Registration:
      </strong>

      ${esc(v.registration)}

      <br>

      <strong>
        Customer:
      </strong>

      ${esc(v.customer)}

      <br>

      <strong>
        Model:
      </strong>

      ${esc(v.model)}

      |

      <strong>
        Year:
      </strong>

      ${esc(v.model_year)}

      |

      <strong>
        Colour:
      </strong>

      ${esc(v.color)}

      <br>

      <strong>
        Date In:
      </strong>

      ${date(v.date_in)}

      |

      <strong>
        Date Out:
      </strong>

      ${date(v.date_out)}

    </p>

    <table>

      <tr>

        <th>Date</th>
        <th>Description</th>
        <th>Category</th>
        <th>Amount</th>

      </tr>

      ${rows.map(e=>`

        <tr>

          <td>
            ${date(e.expense_date)}
          </td>

          <td>
            ${esc(e.description)}
          </td>

          <td>
            ${esc(e.category)}
          </td>

          <td>
            ${money(e.amount)}
          </td>

        </tr>

      `).join('')}

    </table>

    <h2 class="right">

      TOTAL INCURRED:
      ${money(total)}

    </h2>

  `,'Vehicle Expense Report');
}


/* =========================================================
   INVOICE + GATE PASS UI
   ========================================================= */

function ensureDocumentUI(){

  if($('invoiceSection'))return;

  const wrap=
    document.createElement('div');

  wrap.id='documentTools';

  wrap.innerHTML=`

    <section
      id="invoiceSection"
      class="app-section"
    >

      <div class="page-header">

        <div>

          <h2>
            Invoices
          </h2>

          <p>
            Professional insurance invoices.
          </p>

        </div>

        <div class="header-actions">

          <button
            class="btn btn-primary"
            onclick="openInvoiceModal()"
          >
            + New Invoice
          </button>

        </div>

      </div>

      <div class="table-card">

        <table>

          <thead>

            <tr>

              <th>Invoice</th>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Actions</th>

            </tr>

          </thead>

          <tbody id="invoiceTableBody"></tbody>

        </table>

      </div>

    </section>


    <section
      id="gatePasses"
      class="app-section"
    >

      <div class="page-header">

        <div>

          <h2>
            Gate Passes
          </h2>

          <p>
            Vehicle release records.
          </p>

        </div>

        <div class="header-actions">

          <button
            class="btn btn-primary"
            onclick="openGatePassModal()"
          >
            + New Gate Pass
          </button>

        </div>

      </div>

      <div class="table-card">

        <table>

          <thead>

            <tr>

              <th>Gate Pass</th>
              <th>Date</th>
              <th>Vehicle</th>
              <th>Customer</th>
              <th>Released To</th>
              <th>Status</th>
              <th>Actions</th>

            </tr>

          </thead>

          <tbody id="gateTableBody"></tbody>

        </table>

      </div>

    </section>

  `;

  document
    .querySelector('main.page')
    ?.appendChild(wrap);


  const modals=
    document.createElement('div');

  modals.innerHTML=`

    <div
      id="invoiceModal"
      class="modal"
    >

      <div class="modal-content">

        <div class="modal-header">

          <h3>
            Invoice
          </h3>

          <button
            class="modal-close"
            onclick="closeModal('invoiceModal')"
          >
            ×
          </button>

        </div>

        <form id="invoiceForm">

          <div class="modal-body">

            <div class="form-grid">

              <input
                id="invoiceId"
                type="hidden"
              >

              <div class="form-group">

                <label>
                  Company
                </label>

                <select id="invoiceCompany">

                  <option>
                    Quarry Route Motors Ltd
                  </option>

                  <option>
                    Crystal Motors K Ltd
                  </option>

                  <option>
                    Other
                  </option>

                </select>

              </div>


              <div class="form-group">

                <label>
                  Invoice No.
                </label>

                <input
                  id="invoiceNo"
                  required
                >

              </div>


              <div class="form-group">

                <label>
                  Invoice Date
                </label>

                <input
                  id="invoiceDate"
                  type="date"
                  required
                >

              </div>


              <div class="form-group">

                <label>
                  Vehicle
                </label>

                <select
                  id="invoiceVehicle"
                ></select>

              </div>


              <div class="form-group">

                <label>
                  Insurance Company
                </label>

                <input
                  id="invoiceInsuranceCompany"
                >

              </div>


              <div class="form-group">

                <label>
                  Claim No.
                </label>

                <input
                  id="invoiceClaimNo"
                >

              </div>


              <div class="form-group">

                <label>
                  Insured
                </label>

                <input
                  id="invoiceInsured"
                >

              </div>


              <div class="form-group">

                <label>
                  Policy No.
                </label>

                <input
                  id="invoicePolicyNo"
                >

              </div>


              <div class="form-group">

                <label>
                  Customer/Insured Contact
                </label>

                <input
                  id="invoiceCustomerContact"
                >

              </div>


              <div class="form-group">

                <label>
                  Customer
                </label>

                <input
                  id="invoiceCustomer"
                >

              </div>


              <div class="form-group">

                <label>
                  Registration / Chassis No.
                </label>

                <input
                  id="invoiceRegistration"
                >

              </div>


              <div class="form-group">

                <label>
                  Model
                </label>

                <input
                  id="invoiceModel"
                >

              </div>


              <div class="form-group">

                <label>
                  Year
                </label>

                <input
                  id="invoiceYear"
                >

              </div>


              <div class="form-group">

                <label>
                  Colour
                </label>

                <input
                  id="invoiceColour"
                >

              </div>


              <div class="form-group full">

                <label>
                  Job Description
                </label>

                <textarea
                  id="invoiceJobDescription"
                ></textarea>

              </div>


              <div class="form-group full">

                <label>
                  Line 1 Description
                </label>

                <input
                  id="invoiceDesc1"
                >

              </div>


              <div class="form-group">

                <label>
                  Amount
                </label>

                <input
                  id="invoiceAmount1"
                  type="number"
                  step="0.01"
                >

              </div>


              <div class="form-group full">

                <label>
                  Line 2 Description
                </label>

                <input
                  id="invoiceDesc2"
                >

              </div>


              <div class="form-group">

                <label>
                  Amount
                </label>

                <input
                  id="invoiceAmount2"
                  type="number"
                  step="0.01"
                >

              </div>


              <div class="form-group full">

                <label>
                  Line 3 Description
                </label>

                <input
                  id="invoiceDesc3"
                >

              </div>


              <div class="form-group">

                <label>
                  Amount
                </label>

                <input
                  id="invoiceAmount3"
                  type="number"
                  step="0.01"
                >

              </div>


              <div class="form-group">

                <label>
                  VAT %
                </label>

                <input
                  id="invoiceVat"
                  type="number"
                  step="0.01"
                  value="16"
                >

              </div>


              <div class="form-group">

                <label>
                  Paid
                </label>

                <input
                  id="invoicePaid"
                  type="number"
                  step="0.01"
                  value="0"
                >

              </div>


              <div class="form-group full">

                <label>
                  Notes
                </label>

                <textarea
                  id="invoiceNotes"
                ></textarea>

              </div>

            </div>

          </div>


          <div class="modal-footer">

            <button
              type="button"
              class="btn"
              onclick="closeModal('invoiceModal')"
            >
              Cancel
            </button>

            <button
              class="btn btn-primary"
            >
              Save Invoice
            </button>

          </div>

        </form>

      </div>

    </div>


    <div
      id="gatePassModal"
      class="modal"
    >

      <div class="modal-content">

        <div class="modal-header">

          <h3>
            Gate Pass
          </h3>

          <button
            class="modal-close"
            onclick="closeModal('gatePassModal')"
          >
            ×
          </button>

        </div>

        <form id="gatePassForm">

          <div class="modal-body">

            <div class="form-grid">

              <input
                id="gateId"
                type="hidden"
              >


              <div class="form-group">

                <label>
                  Company
                </label>

                <select id="gateCompany">

                  <option>
                    Quarry Route Motors Ltd
                  </option>

                  <option>
                    Crystal Motors K Ltd
                  </option>

                  <option>
                    Other
                  </option>

                </select>

              </div>


              <div class="form-group">

                <label>
                  Gate Pass No.
                </label>

                <input
                  id="gatePassNo"
                  required
                >

              </div>


              <div class="form-group">

                <label>
                  Date
                </label>

                <input
                  id="gatePassDate"
                  type="date"
                  required
                >

              </div>


              <div class="form-group">

                <label>
                  Vehicle
                </label>

                <select
                  id="gateVehicle"
                ></select>

              </div>


              <div class="form-group">

                <label>
                  Customer
                </label>

                <input
                  id="gateCustomer"
                >

              </div>


              <div class="form-group">

                <label>
                  Registration / Chassis No.
                </label>

                <input
                  id="gateRegistration"
                >

              </div>


              <div class="form-group">

                <label>
                  Date In
                </label>

                <input
                  id="gateDateIn"
                  type="date"
                >

              </div>


              <div class="form-group">

                <label>
                  Date Out
                </label>

                <input
                  id="gateDateOut"
                  type="date"
                >

              </div>


              <div class="form-group">

                <label>
                  Released To
                </label>

                <input
                  id="gateReleasedTo"
                >

              </div>


              <div class="form-group">

                <label>
                  Contact
                </label>

                <input
                  id="gateContact"
                >

              </div>


              <div class="form-group">

                <label>
                  Status
                </label>

                <select id="gateStatus">

                  <option>
                    Released
                  </option>

                  <option>
                    Completed
                  </option>

                </select>

              </div>


              <div class="form-group">

                <label>
                  Authorized By
                </label>

                <input
                  id="gateAuthorizedBy"
                >

              </div>


              <div class="form-group full">

                <label>
                  Notes
                </label>

                <textarea
                  id="gateNotes"
                ></textarea>

              </div>

            </div>

          </div>


          <div class="modal-footer">

            <button
              type="button"
              class="btn"
              onclick="closeModal('gatePassModal')"
            >
              Cancel
            </button>

            <button
              class="btn btn-primary"
            >
              Save Gate Pass
            </button>

          </div>

        </form>

      </div>

    </div>

  `;

  document.body.appendChild(modals);
}


/* =========================================================
   COMPANY DETAILS
   ========================================================= */

function companyDetails(company){

  if(
    company==='Quarry Route Motors Ltd'||
    company==='Crystal Motors K Ltd'
  ){

    return`

      P.O. Box 54385 – 00200, Nairobi<br>

      Cell: 0722 707124 / 0723 914 222<br>

      Off Mombasa Road, Along Quarry Road<br>

      Near Mlolongo Weigh Bridge<br>

      info@quarryroutemotors.com<br>

      quarryroutemotorsltd@gmail.com

    `;

  }

  return'Company details';
}


/* =========================================================
   INVOICES
   ========================================================= */

function renderInvoices(){

  ensureDocumentUI();

  const body=$('invoiceTableBody');

  if(!body)return;

  body.innerHTML=invoices.length

    ?invoices.map(i=>`

      <tr>

        <td>
          ${esc(i.invoice_no)}
        </td>

        <td>
          ${date(i.invoice_date)}
        </td>

        <td>
          ${esc(
            i.vehicle_registration||''
          )}
        </td>

        <td>
          ${esc(i.customer||'')}
        </td>

        <td>
          ${money(i.total)}
        </td>

        <td>
          ${money(i.paid)}
        </td>

        <td>
          ${money(i.balance)}
        </td>

        <td>

          <button
            class="action-btn"
            onclick="openInvoiceModal('${esc(i.id)}')"
          >
            ✏️
          </button>

          <button
            class="action-btn"
            onclick="printInvoice('${esc(i.id)}')"
          >
            🖨
          </button>

          <button
            class="action-btn"
            onclick="deleteInvoice('${esc(i.id)}')"
          >
            🗑
          </button>

        </td>

      </tr>

    `).join('')

    :`

      <tr>

        <td
          colspan="8"
          style="
            text-align:center;
            padding:25px;
            color:#64748b
          "
        >
          No invoices.
        </td>

      </tr>

    `;
}


/* =========================================================
   GATE PASSES
   ========================================================= */

function renderGatePasses(){

  ensureDocumentUI();

  const body=$('gateTableBody');

  if(!body)return;

  body.innerHTML=gatePasses.length

    ?gatePasses.map(g=>`

      <tr>

        <td>
          ${esc(g.gate_pass_no)}
        </td>

        <td>
          ${date(g.pass_date)}
        </td>

        <td>
          ${esc(
            g.vehicle_registration
          )}
        </td>

        <td>
          ${esc(g.customer)}
        </td>

        <td>
          ${esc(g.released_to)}
        </td>

        <td>
          ${badge(g.status)}
        </td>

        <td>

          <button
            class="action-btn"
            onclick="openGatePassModal('${esc(g.id)}')"
          >
            ✏️
          </button>

          <button
            class="action-btn"
            onclick="printGatePass('${esc(g.id)}')"
          >
            🖨
          </button>

          <button
            class="action-btn"
            onclick="deleteGatePass('${esc(g.id)}')"
          >
            🗑
          </button>

        </td>

      </tr>

    `).join('')

    :`

      <tr>

        <td
          colspan="7"
          style="
            text-align:center;
            padding:25px;
            color:#64748b
          "
        >
          No gate passes.
        </td>

      </tr>

    `;
}


/* =========================================================
   INVOICE VEHICLE AUTO FILL
   ========================================================= */

function fillInvoiceVehicle(){

  const v=vehicles.find(
    x=>String(x.id)===
       String(
         $('invoiceVehicle')?.value
       )
  );

  if(!v)return;

  const fields={

    invoiceCustomer:
      v.customer,

    invoiceRegistration:
      v.registration,

    invoiceModel:
      v.model,

    invoiceYear:
      v.model_year,

    invoiceColour:
      v.color,

    invoiceJobDescription:
      v.description||
      v.job_type

  };

  Object.entries(fields).forEach(
    ([id,value])=>{

      if($(id)){
        $(id).value=value??'';
      }

    }
  );
}


/* =========================================================
   OPEN INVOICE
   ========================================================= */

function openInvoiceModal(
  id=null,
  vehicleId=null
){

  ensureDocumentUI();

  editingInvoiceId=id;

  $('invoiceForm')?.reset();

  $('invoiceDate').value=today();

  $('invoiceNo').value=
    genNo(
      'INV',
      invoices,
      'invoice_no'
    );

  $('invoiceVat').value=16;

  populateVehicleSelects();

  if(vehicleId){
    $('invoiceVehicle').value=
      vehicleId;
  }

  if(id){

    const i=invoices.find(
      x=>String(x.id)===String(id)
    );

    if(!i)return;

    const fields={

      invoiceId:i.id,

      invoiceCompany:
        i.company_name,

      invoiceNo:
        i.invoice_no,

      invoiceDate:
        i.invoice_date,

      invoiceVehicle:
        i.vehicle_id,

      invoiceInsuranceCompany:
        i.insurance_company,

      invoiceClaimNo:
        i.claim_no,

      invoiceInsured:
        i.insured,

      invoicePolicyNo:
        i.policy_no,

      invoiceCustomerContact:
        i.customer_contact,

      invoiceCustomer:
        i.customer,

      invoiceRegistration:
        i.vehicle_registration,

      invoiceModel:
        i.vehicle_model,

      invoiceYear:
        i.vehicle_year,

      invoiceColour:
        i.vehicle_colour,

      invoiceJobDescription:
        i.job_description,

      invoiceDesc1:
        i.description1,

      invoiceAmount1:
        i.amount1,

      invoiceDesc2:
        i.description2,

      invoiceAmount2:
        i.amount2,

      invoiceDesc3:
        i.description3,

      invoiceAmount3:
        i.amount3,

      invoiceVat:
        i.vat_rate,

      invoicePaid:
        i.paid,

      invoiceNotes:
        i.notes

    };

    Object.entries(fields).forEach(
      ([key,value])=>{

        if($(key)){
          $(key).value=value??'';
        }

      }
    );

  }

  populateVehicleSelects();

  if(vehicleId){
    $('invoiceVehicle').value=
      vehicleId;
  }

  fillInvoiceVehicle();

  openModal('invoiceModal');
}


/* =========================================================
   INVOICE CALCULATION
   ========================================================= */

function invoiceCalc(){

  const subtotal=

    num(
      $('invoiceAmount1')?.value
    )+

    num(
      $('invoiceAmount2')?.value
    )+

    num(
      $('invoiceAmount3')?.value
    );

  const vat=
    subtotal*
    num(
      $('invoiceVat')?.value
    )/
    100;

  const total=
    subtotal+vat;

  const paid=
    num(
      $('invoicePaid')?.value
    );

  return{
    subtotal,
    vat,
    total,
    paid
  };
}


/* =========================================================
   SAVE INVOICE
   ========================================================= */

async function saveInvoice(e){

  e.preventDefault();

  const totals=invoiceCalc();

  const id=
    $('invoiceId').value||
    editingInvoiceId;

  const vehicle=
    vehicles.find(
      x=>String(x.id)===
         String(
           $('invoiceVehicle').value
         )
    );

  const payload={

    company_name:
      $('invoiceCompany').value,

    invoice_no:
      $('invoiceNo')
        .value.trim(),

    invoice_date:
      $('invoiceDate').value,

    vehicle_id:
      $('invoiceVehicle').value||
      null,

    vehicle_registration:
      $('invoiceRegistration').value||
      vehicle?.registration||
      '',

    customer:
      $('invoiceCustomer').value||
      vehicle?.customer||
      '',

    vehicle_model:
      $('invoiceModel').value||
      vehicle?.model||
      '',

    vehicle_year:
      $('invoiceYear').value||
      vehicle?.model_year||
      null,

    vehicle_colour:
      $('invoiceColour').value||
      vehicle?.color||
      '',

    insurance_company:
      $('invoiceInsuranceCompany').value,

    claim_no:
      $('invoiceClaimNo').value,

    insured:
      $('invoiceInsured').value,

    policy_no:
      $('invoicePolicyNo').value,

    customer_contact:
      $('invoiceCustomerContact').value,

    job_description:
      $('invoiceJobDescription').value,

    description1:
      $('invoiceDesc1').value,

    amount1:
      num(
        $('invoiceAmount1').value
      ),

    description2:
      $('invoiceDesc2').value,

    amount2:
      num(
        $('invoiceAmount2').value
      ),

    description3:
      $('invoiceDesc3').value,

    amount3:
      num(
        $('invoiceAmount3').value
      ),

    subtotal:
      totals.subtotal,

    vat_rate:
      num(
        $('invoiceVat').value
      ),

    vat_amount:
      totals.vat,

    total:
      totals.total,

    paid:
      totals.paid,

    balance:
      Math.max(
        totals.total-
        totals.paid,
        0
      ),

    notes:
      $('invoiceNotes').value,

    status:
      totals.paid>=totals.total
        ?'Paid'
        :totals.paid>0
          ?'Part Paid'
          :'Unpaid'

  };

  try{

    const result=id

      ?await db
        .from('invoices')
        .update(payload)
        .eq('id',id)

      :await db
        .from('invoices')
        .insert(payload);

    if(result.error){
      throw result.error;
    }

    closeModal('invoiceModal');

    toast('Invoice saved.');

    await loadAllData();

  }catch(error){

    toast(
      error.message||
      'Could not save invoice. Check invoices table.',
      'error'
    );
  }
}


/* =========================================================
   PRINT INVOICE
   ========================================================= */

function printInvoice(id){

  const i=invoices.find(
    x=>String(x.id)===String(id)
  );

  if(!i)return;

  const lines=[

    [i.description1,i.amount1],
    [i.description2,i.amount2],
    [i.description3,i.amount3]

  ]
  .filter(
    x=>x[0]||x[1]
  );

  printHtml(`

    <div
      style="
        display:flex;
        justify-content:space-between
      "
    >

      <div>

        <h1>
          ${esc(
            i.company_name
          )}
        </h1>

        <p>
          ${companyDetails(
            i.company_name
          )}
        </p>

      </div>


      <div>

        <h1>
          INVOICE
        </h1>

        <p>

          <strong>
            ${esc(i.invoice_no)}
          </strong>

          <br>

          ${date(i.invoice_date)}

        </p>

      </div>

    </div>


    <hr>


    <h3>
      INSURANCE DETAILS
    </h3>

    <p>

      Insurance Company:
      ${esc(i.insurance_company)}

      <br>

      Claim No.:
      ${esc(i.claim_no)}

      <br>

      Insured:
      ${esc(i.insured)}

      <br>

      Policy No.:
      ${esc(i.policy_no)}

      <br>

      Contact:
      ${esc(i.customer_contact)}

    </p>


    <h3>
      VEHICLE
    </h3>

    <p>

      Registration / Chassis No.:
      ${esc(i.vehicle_registration)}

      <br>

      Model:
      ${esc(i.vehicle_model)}

      |

      Year:
      ${esc(i.vehicle_year)}

      |

      Colour:
      ${esc(i.vehicle_colour)}

    </p>


    <table>

      <tr>

        <th>
          Description
        </th>

        <th>
          Amount
        </th>

      </tr>

      ${lines.map(x=>`

        <tr>

          <td>
            ${esc(x[0])}
          </td>

          <td>
            ${money(x[1])}
          </td>

        </tr>

      `).join('')}


      <tr>

        <th>
          Subtotal
        </th>

        <th>
          ${money(i.subtotal)}
        </th>

      </tr>


      <tr>

        <th>
          VAT ${num(i.vat_rate)}%
        </th>

        <th>
          ${money(i.vat_amount)}
        </th>

      </tr>


      <tr>

        <th>
          TOTAL
        </th>

        <th>
          ${money(i.total)}
        </th>

      </tr>

    </table>


    <p>

      <strong>
        Amount in Words:
      </strong>

      KSh ${String(
        Math.round(
          num(i.total)
        )
      ).replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ','
      )}

    </p>


    <div
      style="
        margin-top:70px;
        display:flex;
        justify-content:space-between
      "
    >

      <span>
        Authorized Signature:
        __________________
      </span>

      <span>
        Company Stamp:
        __________________
      </span>

    </div>

  `,'Invoice '+i.invoice_no);
}


/* =========================================================
   DELETE INVOICE
   ========================================================= */

async function deleteInvoice(id){

  if(!confirm(
    'Delete this invoice?'
  ))return;

  const result=await db
    .from('invoices')
    .delete()
    .eq('id',id);

  if(result.error){

    toast(
      result.error.message,
      'error'
    );

    return;
  }

  toast('Invoice deleted.');

  await loadAllData();
}


/* =========================================================
   GATE PASS VEHICLE FILL
   ========================================================= */

function fillGatePassFromVehicle(){

  const v=vehicles.find(
    x=>String(x.id)===
       String(
         $('gateVehicle')?.value
       )
  );

  if(!v)return;

  const fields={

    gateCustomer:
      v.customer,

    gateRegistration:
      v.registration,

    gateDateIn:
      v.date_in,

    gateDateOut:
      v.date_out,

    gateReleasedTo:
      v.released_to,

    gateContact:
      v.released_contact,

    gateStatus:
      v.status

  };

  Object.entries(fields).forEach(
    ([id,value])=>{

      if($(id)){
        $(id).value=value??'';
      }

    }
  );
}


/* =========================================================
   OPEN GATE PASS
   ========================================================= */

function openGatePassModal(
  id=null,
  vehicleId=null
){

  ensureDocumentUI();

  editingGatePassId=id;

  $('gatePassForm')?.reset();

  $('gatePassDate').value=today();

  $('gatePassNo').value=
    genNo(
      'GP',
      gatePasses,
      'gate_pass_no'
    );

  populateVehicleSelects();

  if(id){

    const g=gatePasses.find(
      x=>String(x.id)===String(id)
    );

    if(!g)return;

    const fields={

      gateId:g.id,

      gateCompany:
        g.company_name,

      gatePassNo:
        g.gate_pass_no,

      gatePassDate:
        g.pass_date,

      gateVehicle:
        g.vehicle_id,

      gateCustomer:
        g.customer,

      gateRegistration:
        g.vehicle_registration,

      gateDateIn:
        g.date_in,

      gateDateOut:
        g.date_out,

      gateReleasedTo:
        g.released_to,

      gateContact:
        g.contact,

      gateStatus:
        g.status,

      gateAuthorizedBy:
        g.authorized_by,

      gateNotes:
        g.notes

    };

    Object.entries(fields).forEach(
      ([key,value])=>{

        if($(key)){
          $(key).value=value??'';
        }

      }
    );

  }else if(vehicleId){

    $('gateVehicle').value=
      vehicleId;

    fillGatePassFromVehicle();

  }

  openModal('gatePassModal');
}


/* =========================================================
   SAVE GATE PASS
   ========================================================= */

async function saveGatePass(e){

  e.preventDefault();

  const id=
    $('gateId').value||
    editingGatePassId;

  const vehicle=
    vehicles.find(
      x=>String(x.id)===
         String(
           $('gateVehicle').value
         )
    );

  const payload={

    company_name:
      $('gateCompany').value,

    gate_pass_no:
      $('gatePassNo').value,

    pass_date:
      $('gatePassDate').value,

    vehicle_id:
      $('gateVehicle').value||
      null,

    vehicle_registration:
      $('gateRegistration').value||
      vehicle?.registration||
      '',

    customer:
      $('gateCustomer').value||
      vehicle?.customer||
      '',

    date_in:
      $('gateDateIn').value||
      vehicle?.date_in||
      null,

    date_out:
      $('gateDateOut').value||
      vehicle?.date_out||
      null,

    released_to:
      $('gateReleasedTo').value||
      vehicle?.released_to||
      '',

    contact:
      $('gateContact').value||
      vehicle?.released_contact||
      '',

    status:
      $('gateStatus').value,

    authorized_by:
      $('gateAuthorizedBy').value,

    notes:
      $('gateNotes').value

  };

  try{

    const result=id

      ?await db
        .from('gate_passes')
        .update(payload)
        .eq('id',id)

      :await db
        .from('gate_passes')
        .insert(payload);

    if(result.error){
      throw result.error;
    }

    closeModal(
      'gatePassModal'
    );

    toast(
      'Gate pass saved.'
    );

    await loadAllData();

  }catch(error){

    toast(
      error.message||
      'Could not save gate pass. Check gate_passes table.',
      'error'
    );
  }
}


/* =========================================================
   PRINT GATE PASS
   ========================================================= */

function printGatePass(id){

  const g=gatePasses.find(
    x=>String(x.id)===String(id)
  );

  if(!g)return;

  printHtml(`

    <div
      style="
        display:flex;
        justify-content:space-between
      "
    >

      <div>

        <h1>
          ${esc(
            g.company_name
          )}
        </h1>

        <p>
          ${companyDetails(
            g.company_name
          )}
        </p>

      </div>


      <div>

        <h1>
          GATE PASS
        </h1>

        <p>

          ${esc(
            g.gate_pass_no
          )}

          <br>

          ${date(g.pass_date)}

        </p>

      </div>

    </div>


    <hr>


    <table>

      <tr>

        <th>
          Registration / Chassis No.
        </th>

        <td>
          ${esc(
            g.vehicle_registration
          )}
        </td>

      </tr>


      <tr>

        <th>
          Customer
        </th>

        <td>
          ${esc(g.customer)}
        </td>

      </tr>


      <tr>

        <th>
          Date In
        </th>

        <td>
          ${date(g.date_in)}
        </td>

      </tr>


      <tr>

        <th>
          Date Out
        </th>

        <td>
          ${date(g.date_out)}
        </td>

      </tr>


      <tr>

        <th>
          Released To
        </th>

        <td>
          ${esc(g.released_to)}
        </td>

      </tr>


      <tr>

        <th>
          Contact
        </th>

        <td>
          ${esc(g.contact)}
        </td>

      </tr>


      <tr>

        <th>
          Status
        </th>

        <td>
          ${esc(g.status)}
        </td>

      </tr>


      <tr>

        <th>
          Authorized By
        </th>

        <td>
          ${esc(g.authorized_by)}
        </td>

      </tr>

    </table>


    <div
      style="
        margin-top:70px;
        display:flex;
        justify-content:space-between
      "
    >

      <span>
        Driver Signature:
        __________________
      </span>

      <span>
        Authorized Signature:
        __________________
      </span>

    </div>

  `,'Gate Pass '+g.gate_pass_no);
}


/* =========================================================
   DELETE GATE PASS
   ========================================================= */

async function deleteGatePass(id){

  if(!confirm(
    'Delete this gate pass?'
  ))return;

  const result=await db
    .from('gate_passes')
    .delete()
    .eq('id',id);

  if(result.error){

    toast(
      result.error.message,
      'error'
    );

    return;
  }

  toast(
    'Gate pass deleted.'
  );

  await loadAllData();
}


/* =========================================================
   SECTION NAVIGATION
   ========================================================= */

function showSection(
  id,
  button=null
){

  ensureDocumentUI();

  document
    .querySelectorAll(
      '.app-section'
    )
    .forEach(section=>{

      section.style.display=
        section.id===id
          ?'block'
          :'none';

    });

  document
    .querySelectorAll(
      '.nav-btn,.mobile-nav-btn'
    )
    .forEach(btn=>{
      btn.classList.remove(
        'active'
      );
    });

  if(button){

    button.classList.add(
      'active'
    );

  }else{

    document
      .querySelectorAll(
        `[data-section="${id}"]`
      )
      .forEach(btn=>{
        btn.classList.add(
          'active'
        );
      });

  }

  const titles={

    dashboard:
      'Garage Operations Pro',

    vehicles:
      'Vehicles',

    expenses:
      'Expenses',

    pettyCash:
      'Petty Cash',

    requisitions:
      'Requisitions',

    invoiceSection:
      'Invoices',

    gatePasses:
      'Gate Passes'

  };

  const subtitle=
    document.querySelector(
      '.topbar-title span'
    );

  if(subtitle){

    subtitle.textContent=
      titles[id]||id;

  }

}


/* =========================================================
   EVENTS
   ========================================================= */

function bind(){

  $('vehicleForm')
    ?.addEventListener(
      'submit',
      saveVehicle
    );

  $('expenseForm')
    ?.addEventListener(
      'submit',
      saveExpense
    );

  $('pettyForm')
    ?.addEventListener(
      'submit',
      savePetty
    );

  $('reqForm')
    ?.addEventListener(
      'submit',
      saveReq
    );


  [
    'vehicleSearch',
    'expenseSearch',
    'pettySearch',
    'reqSearch'
  ].forEach(
    (id,index)=>{

      $(id)?.addEventListener(
        'input',
        [
          renderVehicles,
          renderExpenses,
          renderPettyCash,
          renderRequisitions
        ][index]
      );

    }
  );


  [
    'vehicleStatusFilter',
    'expenseCategoryFilter',
    'pettyCategoryFilter',
    'reqStatusFilter'
  ].forEach(
    (id,index)=>{

      $(id)?.addEventListener(
        'change',
        [
          renderVehicles,
          renderExpenses,
          renderPettyCash,
          renderRequisitions
        ][index]
      );

    }
  );


  [
    'reqQuantity',
    'reqUnitCost'
  ].forEach(id=>{

    $(id)?.addEventListener(
      'input',
      calculateReqTotal
    );

  });


  [
    'vehicleDateIn',
    'vehicleDateOut'
  ].forEach(id=>{

    $(id)?.addEventListener(
      'input',
      ()=>{

        if($('vehicleStorageDays')){

          $('vehicleStorageDays')
            .value=
            storageDays(
              $('vehicleDateIn')
                .value,
              $('vehicleDateOut')
                .value
            );

        }

      }
    );

  });


  $('invoiceForm')
    ?.addEventListener(
      'submit',
      saveInvoice
    );

  $('gatePassForm')
    ?.addEventListener(
      'submit',
      saveGatePass
    );


  document.addEventListener(
    'change',
    event=>{

      if(
        event.target?.id===
        'invoiceVehicle'
      ){

        fillInvoiceVehicle();

      }

      if(
        event.target?.id===
        'gateVehicle'
      ){

        fillGatePassFromVehicle();

      }

    }
  );


  document.addEventListener(
    'click',
    event=>{

      if(
        event.target.classList?.contains(
          'modal'
        )
      ){

        event.target.classList.remove(
          'show'
        );

      }

    }
  );


  document.addEventListener(
    'keydown',
    event=>{

      if(
        event.key==='Escape'
      ){

        document
          .querySelectorAll(
            '.modal.show'
          )
          .forEach(
            x=>
              x.classList.remove(
                'show'
              )
          );

      }

    }
  );

}


/* =========================================================
   EXPOSE FUNCTIONS
   ========================================================= */

Object.assign(
  window,
  {

    showSection,

    openModal,

    closeModal,

    openVehicleModal,

    deleteVehicle,

    openExpenseModal,

    deleteExpense,

    openPettyModal,

    deletePetty,

    openReqModal,

    deleteReq,

    previewReq,

    previewSelectedReq,

    printSelectedReq,

    openVehicleExpensePreview,

    printVehicleExpensePreview,

    printVehicles,

    printExpenses,

    printPettyCash,

    printRequisitions,

    openInvoiceModal,

    saveInvoice,

    deleteInvoice,

    printInvoice,

    openGatePassModal,

    saveGatePass,

    deleteGatePass,

    printGatePass,

    calculateStorageDays:
      storageDays,

    autoCalculateInvoice:
      invoiceCalc

  }
);


/* =========================================================
   INITIALISE
   ========================================================= */

async function init(){

  try{

    /*
     * Create invoice/gate-pass
     * interface before rendering.
     */

    ensureDocumentUI();

    bind();

    await loadAllData();

    /*
     * Respect existing login
     * handled by index.html.
     */

    if(
      sessionStorage.getItem(
        'garageLoggedIn'
      )==='true'
    ){

      if($('loginPage')){
        $('loginPage').style.display=
          'none';
      }

      if($('app')){
        $('app').style.display=
          'flex';
      }

    }

  }catch(error){

    console.error(
      'Garage initialization error:',
      error
    );

    toast(
      'Garage application could not load.',
      'error'
    );

  }

}

init();
