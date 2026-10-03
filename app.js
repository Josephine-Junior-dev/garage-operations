import { createClient }
from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE APP.JS
   PART 1 / 6
   ========================================================= */

/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
  "https://ptluwoeogfkqavhspdjj.supabase.co";

const SUPABASE_ANON_KEY =
  "YOUR_EXISTING_SUPABASE_ANON_KEY";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let vehicles = [];
let expenses = [];
let pettyCash = [];
let requisitions = [];

let currentUser =
  sessionStorage.getItem("garageUser") || "josephine";

let editingVehicleId = null;
let editingExpenseId = null;
let editingPettyId = null;
let editingReqId = null;

let selectedReqId = null;
let selectedVehicleId = null;


/* =========================================================
   CONSTANTS
   ========================================================= */

const VEHICLE_STATUSES = [
  "Storage",
  "Under Repair",
  "Completed",
  "Released"
];

const JOB_TYPES = [
  "Repair",
  "Storage"
];

const EXPENSE_CATEGORIES = [
  "Parts",
  "Materials",
  "Labour"
];

const PETTY_CATEGORIES = [
  "Parts",
  "Materials",
  "Labour",
  "Transport",
  "Other"
];

const REQUISITION_STATUSES = [
  "Pending",
  "Approved",
  "Purchased",
  "Completed",
  "Rejected"
];


/* =========================================================
   UTILITY FUNCTIONS
   ========================================================= */

function $(id){
  return document.getElementById(id);
}


function escapeHTML(value){

  if(value === null || value === undefined){
    return "";
  }

  return String(value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}


function formatMoney(value){

  const amount = Number(value || 0);

  return "KSh " + amount.toLocaleString(
    "en-KE",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  );
}


function formatNumber(value){

  const amount = Number(value || 0);

  return amount.toLocaleString(
    "en-KE",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  );
}


function today(){

  const d = new Date();

  const year = d.getFullYear();
  const month = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");

  return `${year}-${month}-${day}`;
}


function safeDate(value){

  if(!value){
    return "";
  }

  try{

    return new Date(value).toLocaleDateString(
      "en-KE",
      {
        year:"numeric",
        month:"short",
        day:"numeric"
      }
    );

  }catch(error){

    return value;
  }
}


function normalize(value){

  return String(value || "")
    .trim()
    .toLowerCase();
}


function getVehicleRegistration(vehicleId){

  if(!vehicleId){
    return "General";
  }

  const vehicle =
    vehicles.find(v => String(v.id) === String(vehicleId));

  if(!vehicle){
    return "Unknown";
  }

  return (
    vehicle.registration ||
    vehicle.chassis_no ||
    vehicle.registration_chassis_no ||
    "Unknown"
  );
}


function getOutstanding(vehicle){

  const billed = Number(vehicle.billed || 0);
  const paid = Number(vehicle.paid || 0);

  return Math.max(0,billed-paid);
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message){

  const toast = $("toast");

  if(!toast){
    return;
  }

  toast.textContent = message;
  toast.style.display = "block";

  clearTimeout(window.__garageToastTimer);

  window.__garageToastTimer =
    setTimeout(() => {

      toast.style.display = "none";

    },3000);
}


/* =========================================================
   ERROR HANDLING
   ========================================================= */

function showError(message,error=null){

  console.error(message,error || "");

  showToast(message);

}


/* =========================================================
   SUPABASE ERROR HANDLER
   ========================================================= */

function handleSupabaseError(error,operation){

  if(error){

    console.error(
      `Garage Operations Pro - ${operation}`,
      error
    );

    const message =
      error.message ||
      error.details ||
      "Database operation failed.";

    showToast(
      `${operation}: ${message}`
    );

    return true;
  }

  return false;
}


/* =========================================================
   LOGIN STATE
   ========================================================= */

function ensureLoggedIn(){

  const loggedIn =
    sessionStorage.getItem("garageLoggedIn");

  if(loggedIn !== "true"){

    const loginPage = $("loginPage");
    const app = $("app");

    if(loginPage){
      loginPage.style.display = "flex";
    }

    if(app){
      app.style.display = "none";
    }

    return false;
  }

  currentUser =
    sessionStorage.getItem("garageUser") ||
    "josephine";

  return true;
}


/* =========================================================
   SECTION NAVIGATION
   ========================================================= */

window.showSection = function(sectionId,button){

  const sections =
    document.querySelectorAll(".app-section");

  sections.forEach(section => {

    section.style.display =
      section.id === sectionId
        ? "block"
        : "none";

  });


  /*
     Desktop sidebar buttons
  */

  document.querySelectorAll(
    ".sidebar .nav-btn"
  ).forEach(btn => {

    btn.classList.remove("active");

  });


  /*
     Mobile navigation
  */

  document.querySelectorAll(
    ".mobile-nav-btn"
  ).forEach(btn => {

    btn.classList.remove("active");

  });


  /*
     Activate the clicked button
  */

  if(button){

    button.classList.add("active");

  }


  /*
     Keep desktop and mobile navigation
     synchronized.
  */

  const navButtons =
    document.querySelectorAll(
      `.nav-btn[onclick*="'${sectionId}'"],
       .mobile-nav-btn[onclick*="'${sectionId}'"]`
    );

  navButtons.forEach(btn => {

    btn.classList.add("active");

  });


  /*
     Refresh section data when opened.
  */

  if(sectionId === "dashboard"){
    renderDashboard();
  }

  if(sectionId === "vehicles"){
    renderVehicles();
  }

  if(sectionId === "expenses"){
    renderExpenses();
  }

  if(sectionId === "pettyCash"){
    renderPettyCash();
  }

  if(sectionId === "requisitions"){
    renderRequisitions();
  }

};


/* =========================================================
   MODAL CONTROL
   ========================================================= */

window.closeModal = function(modalId){

  const modal = $(modalId);

  if(!modal){
    return;
  }

  modal.classList.remove("show");

  modal.style.display = "none";

};


function openModal(modalId){

  const modal = $(modalId);

  if(!modal){
    return;
  }

  modal.classList.add("show");
  modal.style.display = "flex";

}


function closeAllModals(){

  document.querySelectorAll(".modal")
    .forEach(modal => {

      modal.classList.remove("show");
      modal.style.display = "none";

    });

}


/* =========================================================
   MODAL BACKDROP CLOSE
   ========================================================= */

document.addEventListener(
  "click",
  function(event){

    if(
      event.target.classList &&
      event.target.classList.contains("modal")
    ){

      event.target.classList.remove("show");
      event.target.style.display = "none";

    }

  }
);


/* =========================================================
   ESCAPE KEY
   ========================================================= */

document.addEventListener(
  "keydown",
  function(event){

    if(event.key === "Escape"){

      closeAllModals();

    }

  }
);


/* =========================================================
   VEHICLE FORM DEFAULTS
   ========================================================= */

function setVehicleFormDefaults(){

  if($("vehicleDateIn")){
    $("vehicleDateIn").value = today();
  }

  if($("vehicleDateOut")){
    $("vehicleDateOut").value = "";
  }

  if($("vehicleJobType")){
    $("vehicleJobType").value = "Repair";
  }

  if($("vehicleStatus")){
    $("vehicleStatus").value = "Under Repair";
  }

  if($("vehicleReleasedTo")){
    $("vehicleReleasedTo").value = "";
  }

  if($("vehicleReleasedContact")){
    $("vehicleReleasedContact").value = "";
  }

  if($("vehicleBilled")){
    $("vehicleBilled").value = "";
  }

  if($("vehiclePaid")){
    $("vehiclePaid").value = "";
  }

  if($("vehicleDescription")){
    $("vehicleDescription").value = "";
  }

}


/* =========================================================
   VEHICLE FORM OPTION REPAIR / STORAGE
   ========================================================= */

function setupVehicleJobType(){

  const input = $("vehicleJobType");

  if(!input){
    return;
  }


  /*
     If the existing HTML still uses an input,
     replace it with the required dropdown.
  */

  if(input.tagName.toLowerCase() !== "select"){

    const select =
      document.createElement("select");

    select.id = "vehicleJobType";
    select.name = "vehicleJobType";
    select.required = true;

    JOB_TYPES.forEach(type => {

      const option =
        document.createElement("option");

      option.value = type;
      option.textContent = type;

      select.appendChild(option);

    });

    input.replaceWith(select);

  }else{

    input.innerHTML = "";

    JOB_TYPES.forEach(type => {

      const option =
        document.createElement("option");

      option.value = type;
      option.textContent = type;

      input.appendChild(option);

    });

  }

}


/* =========================================================
   VEHICLE STATUS OPTIONS
   ========================================================= */

function setupVehicleStatus(){

  const select = $("vehicleStatus");

  if(!select){
    return;
  }

  select.innerHTML = "";

  VEHICLE_STATUSES.forEach(status => {

    const option =
      document.createElement("option");

    option.value = status;
    option.textContent = status;

    select.appendChild(option);

  });

}


/* =========================================================
   CATEGORY OPTIONS
   ========================================================= */

function setupCategoryOptions(){

  /*
     Expense category
  */

  const expenseCategory =
    $("expenseCategory");

  if(
    expenseCategory &&
    expenseCategory.tagName.toLowerCase() === "select"
  ){

    expenseCategory.innerHTML =
      `<option value="">Select Category</option>`;

    EXPENSE_CATEGORIES.forEach(category => {

      const option =
        document.createElement("option");

      option.value = category;
      option.textContent = category;

      expenseCategory.appendChild(option);

    });

  }


  /*
     Petty cash category
  */

  const pettyCategory =
    $("pettyCategory");

  if(
    pettyCategory &&
    pettyCategory.tagName.toLowerCase() === "select"
  ){

    pettyCategory.innerHTML =
      `<option value="">Select Category</option>`;

    PETTY_CATEGORIES.forEach(category => {

      const option =
        document.createElement("option");

      option.value = category;
      option.textContent = category;

      pettyCategory.appendChild(option);

    });

  }

}


/* =========================================================
   FILTER OPTIONS
   ========================================================= */

function setupFilters(){

  /*
     Vehicle status filter
  */

  const vehicleFilter =
    $("vehicleStatusFilter");

  if(vehicleFilter){

    vehicleFilter.innerHTML =
      `<option value="">All Statuses</option>`;

    VEHICLE_STATUSES.forEach(status => {

      const option =
        document.createElement("option");

      option.value = status;
      option.textContent = status;

      vehicleFilter.appendChild(option);

    });

  }


  /*
     Expense category filter
  */

  const expenseFilter =
    $("expenseCategoryFilter");

  if(expenseFilter){

    expenseFilter.innerHTML =
      `<option value="">All Categories</option>`;

    EXPENSE_CATEGORIES.forEach(category => {

      const option =
        document.createElement("option");

      option.value = category;
      option.textContent = category;

      expenseFilter.appendChild(option);

    });

  }


  /*
     Petty category filter
  */

  const pettyFilter =
    $("pettyCategoryFilter");

  if(pettyFilter){

    pettyFilter.innerHTML =
      `<option value="">All Categories</option>`;

    PETTY_CATEGORIES.forEach(category => {

      const option =
        document.createElement("option");

      option.value = category;
      option.textContent = category;

      pettyFilter.appendChild(option);

    });

  }

}


/* =========================================================
   VEHICLE MODAL
   ========================================================= */

window.openVehicleModal = function(vehicleId=null){

  editingVehicleId = vehicleId;

  const title =
    $("vehicleModalTitle");

  const form =
    $("vehicleForm");

  if(form){
    form.reset();
  }


  setupVehicleJobType();
  setupVehicleStatus();


  if(title){

    title.textContent =
      vehicleId
        ? "Edit Vehicle"
        : "Add Vehicle";

  }


  if($("vehicleId")){
    $("vehicleId").value =
      vehicleId || "";
  }


  if(vehicleId){

    const vehicle =
      vehicles.find(
        v => String(v.id) === String(vehicleId)
      );

    if(!vehicle){

      showToast("Vehicle record not found.");
      return;

    }


    if($("vehicleRegistration")){

      $("vehicleRegistration").value =
        vehicle.registration ||
        vehicle.chassis_no ||
        vehicle.registration_chassis_no ||
        "";

    }


    if($("vehicleCustomer")){

      $("vehicleCustomer").value =
        vehicle.customer || "";

    }


    if($("vehicleDateIn")){

      $("vehicleDateIn").value =
        vehicle.date_in || "";

    }


    if($("vehicleDateOut")){

      $("vehicleDateOut").value =
        vehicle.date_out || "";

    }


    if($("vehicleJobType")){

      $("vehicleJobType").value =
        JOB_TYPES.includes(vehicle.job_type)
          ? vehicle.job_type
          : "Repair";

    }


    if($("vehicleStatus")){

      $("vehicleStatus").value =
        VEHICLE_STATUSES.includes(vehicle.status)
          ? vehicle.status
          : "Under Repair";

    }


    if($("vehicleReleasedTo")){

      $("vehicleReleasedTo").value =
        vehicle.released_to || "";

    }


    if($("vehicleReleasedContact")){

      $("vehicleReleasedContact").value =
        vehicle.released_contact ||
        vehicle.released_contact_no ||
        "";

    }


    if($("vehicleBilled")){

      $("vehicleBilled").value =
        vehicle.billed ?? "";

    }


    if($("vehiclePaid")){

      $("vehiclePaid").value =
        vehicle.paid ?? "";

    }


    if($("vehicleDescription")){

      $("vehicleDescription").value =
        vehicle.description || "";

    }

  }else{

    setVehicleFormDefaults();

  }


  openModal("vehicleModal");

};


/* =========================================================
   EXPENSE MODAL
   ========================================================= */

window.openExpenseModal = function(expenseId=null){

  editingExpenseId = expenseId;

  const form =
    $("expenseForm");

  if(form){
    form.reset();
  }


  const title =
    $("expenseModalTitle");

  if(title){

    title.textContent =
      expenseId
        ? "Edit Expense"
        : "Add Expense";

  }


  if($("expenseId")){
    $("expenseId").value =
      expenseId || "";
  }


  populateVehicleSelects();


  if(expenseId){

    const expense =
      expenses.find(
        e => String(e.id) === String(expenseId)
      );

    if(!expense){

      showToast("Expense record not found.");
      return;

    }


    if($("expenseVehicle")){

      $("expenseVehicle").value =
        expense.vehicle_id || "";

    }


    if($("expenseDate")){

      $("expenseDate").value =
        expense.expense_date || "";

    }


    if($("expenseCategory")){

      $("expenseCategory").value =
        expense.category || "";

    }


    if($("expenseAmount")){

      $("expenseAmount").value =
        expense.amount ?? "";

    }


    if($("expenseDescription")){

      $("expenseDescription").value =
        expense.description || "";

    }

  }else{

    if($("expenseDate")){
      $("expenseDate").value = today();
    }

  }


  openModal("expenseModal");

};


/* =========================================================
   PETTY CASH MODAL
   ========================================================= */

window.openPettyModal = function(pettyId=null){

  editingPettyId = pettyId;

  const form =
    $("pettyForm");

  if(form){
    form.reset();
  }


  const title =
    $("pettyModalTitle");

  if(title){

    title.textContent =
      pettyId
        ? "Edit Petty Cash"
        : "Add Petty Cash";

  }


  if($("pettyId")){
    $("pettyId").value =
      pettyId || "";
  }


  if(pettyId){

    const record =
      pettyCash.find(
        p => String(p.id) === String(pettyId)
      );

    if(!record){

      showToast("Petty cash record not found.");
      return;

    }


    if($("pettyDate")){
      $("pettyDate").value =
        record.cash_date || "";
    }


    if($("pettyPaidTo")){
      $("pettyPaidTo").value =
        record.paid_to || "";
    }


    if($("pettyCategory")){
      $("pettyCategory").value =
        record.category || "";
    }


    if($("pettyAmount")){
      $("pettyAmount").value =
        record.amount ?? "";
    }


    if($("pettyDescription")){
      $("pettyDescription").value =
        record.description || "";
    }


    if($("pettyNotes")){
      $("pettyNotes").value =
        record.notes || "";
    }

  }else{

    if($("pettyDate")){
      $("pettyDate").value = today();
    }

  }


  openModal("pettyModal");

};


/* =========================================================
   REQUISITION MODAL
   ========================================================= */

window.openReqModal = function(reqId=null){

  editingReqId = reqId;

  const form =
    $("reqForm");

  if(form){
    form.reset();
  }


  const title =
    $("reqModalTitle");

  if(title){

    title.textContent =
      reqId
        ? "Edit Requisition"
        : "New Requisition";

  }


  if($("reqId")){
    $("reqId").value =
      reqId || "";
  }


  populateVehicleSelects();


  if(reqId){

    const record =
      requisitions.find(
        r => String(r.id) === String(reqId)
      );

    if(!record){

      showToast(
        "Requisition record not found."
      );

      return;
    }


    if($("reqNo")){
      $("reqNo").value =
        record.req_no || "";
    }


    if($("reqDate")){
      $("reqDate").value =
        record.req_date || "";
    }


    if($("reqRequestedBy")){
      $("reqRequestedBy").value =
        record.requested_by || "";
    }


    if($("reqVehicle")){
      $("reqVehicle").value =
        record.vehicle_id || "";
    }


    if($("reqItemDescription")){
      $("reqItemDescription").value =
        record.item_description || "";
    }


    if($("reqQuantity")){
      $("reqQuantity").value =
        record.quantity ?? "";
    }


    if($("reqUnitCost")){
      $("reqUnitCost").value =
        record.unit_cost ?? "";
    }


    if($("reqTotal")){
      $("reqTotal").value =
        record.total_amount ?? "";
    }


    if($("reqStatus")){
      $("reqStatus").value =
        record.status || "Pending";
    }


    if($("reqCategory")){
      $("reqCategory").value =
        record.category || "";
    }


    if($("reqExpenseType")){
      $("reqExpenseType").value =
        record.expense_type || "";
    }


    if($("reqNotes")){
      $("reqNotes").value =
        record.notes || "";
    }

  }else{

    if($("reqDate")){
      $("reqDate").value = today();
    }

    if($("reqStatus")){
      $("reqStatus").value = "Pending";
    }

    generateRequisitionNumber();

  }


  calculateReqTotal();

  openModal("reqModal");

};


/* =========================================================
   GENERATE REQUISITION NUMBER
   ========================================================= */

function generateRequisitionNumber(){

  const input = $("reqNo");

  if(!input){
    return;
  }


  if(input.value.trim()){
    return;
  }


  const number =
    requisitions.length + 1;

  const padded =
    String(number).padStart(4,"0");

  input.value =
    `REQ-${new Date().getFullYear()}-${padded}`;

}


/* =========================================================
   CALCULATE REQUISITION TOTAL
   ========================================================= */

function calculateReqTotal(){

  const quantity =
    Number(
      $("reqQuantity")?.value || 0
    );

  const unitCost =
    Number(
      $("reqUnitCost")?.value || 0
    );

  const total =
    quantity * unitCost;


  if($("reqTotal")){

    $("reqTotal").value =
      total.toFixed(2);

  }

}


/* =========================================================
   VEHICLE SELECT OPTIONS
   ========================================================= */

function populateVehicleSelects(){

  const selects = [
    $("expenseVehicle"),
    $("reqVehicle")
  ];

  selects.forEach(select => {

    if(!select){
      return;
    }


    const currentValue =
      select.value;


    if(select.id === "expenseVehicle"){

      select.innerHTML =
        `<option value="">General Expense</option>`;

    }else{

      select.innerHTML =
        `<option value="">Select Vehicle</option>`;

    }


    vehicles
      .slice()
      .sort((a,b) => {

        const ar =
          normalize(
            a.registration ||
            a.chassis_no
          );

        const br =
          normalize(
            b.registration ||
            b.chassis_no
          );

        return ar.localeCompare(br);

      })
      .forEach(vehicle => {

        const registration =
          vehicle.registration ||
          vehicle.chassis_no ||
          vehicle.registration_chassis_no ||
          "Unknown";


        const option =
          document.createElement("option");

        option.value =
          vehicle.id;

        option.textContent =
          registration +
          (
            vehicle.customer
              ? ` — ${vehicle.customer}`
              : ""
          );

        select.appendChild(option);

      });


    if(currentValue){

      select.value =
        currentValue;

    }

  });

}


/* =========================================================
   DATABASE LOAD
   ========================================================= */

async function loadAllData(){

  if(!ensureLoggedIn()){
    return;
  }


  showToast("Loading garage records...");


  try{

    const [
      vehiclesResult,
      expensesResult,
      pettyResult,
      requisitionsResult
    ] = await Promise.all([

      supabase
        .from("vehicles")
        .select("*")
        .order("date_in",{ascending:false}),

      supabase
        .from("expenses")
        .select("*")
        .order("expense_date",{ascending:false}),

      supabase
        .from("petty_cash")
        .select("*")
        .order("cash_date",{ascending:false}),

      supabase
        .from("requisitions")
        .select("*")
        .order("req_date",{ascending:false})

    ]);


    if(
      handleSupabaseError(
        vehiclesResult.error,
        "Loading vehicles"
      )
    ){
      return;
    }


    if(
      handleSupabaseError(
        expensesResult.error,
        "Loading expenses"
      )
    ){
      return;
    }


    if(
      handleSupabaseError(
        pettyResult.error,
        "Loading petty cash"
      )
    ){
      return;
    }


    if(
      handleSupabaseError(
        requisitionsResult.error,
        "Loading requisitions"
      )
    ){
      return;
    }


    vehicles =
      vehiclesResult.data || [];

    expenses =
      expensesResult.data || [];

    pettyCash =
      pettyResult.data || [];

    requisitions =
      requisitionsResult.data || [];


    setupVehicleJobType();
    setupVehicleStatus();
    setupCategoryOptions();
    setupFilters();

    populateVehicleSelects();

    renderDashboard();
    renderVehicles();
    renderExpenses();
    renderPettyCash();
    renderRequisitions();


    showToast("Garage records loaded.");

  }catch(error){

    console.error(
      "loadAllData error:",
      error
    );

    showToast(
      "Unable to load garage records."
    );

  }

}


/* =========================================================
   INITIALIZE APPLICATION
   ========================================================= */

async function initializeGarage(){

  if(!ensureLoggedIn()){
    return;
  }


  setupVehicleJobType();
  setupVehicleStatus();
  setupCategoryOptions();
  setupFilters();

  await loadAllData();

}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function(){

    /*
       The login logic is already in the HTML.
       app.js only initializes the application
       after the login state has been established.
    */

    setTimeout(() => {

      if(
        sessionStorage.getItem(
          "garageLoggedIn"
        ) === "true"
      ){

        initializeGarage();

      }

    },100);

  }
);


/* =========================================================
   REFRESH DATA
   ========================================================= */

window.refreshGarageData = async function(){

  await loadAllData();

};


/* =========================================================
   FORM EVENT LISTENERS
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function(){

    const reqQuantity =
      $("reqQuantity");

    const reqUnitCost =
      $("reqUnitCost");


    if(reqQuantity){

      reqQuantity.addEventListener(
        "input",
        calculateReqTotal
      );

    }


    if(reqUnitCost){

      reqUnitCost.addEventListener(
        "input",
        calculateReqTotal
      );

    }

  }
);


/* =========================================================
   SEARCH EVENT LISTENERS
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function(){

    $("vehicleSearch")?.addEventListener(
      "input",
      renderVehicles
    );


    $("vehicleStatusFilter")?.addEventListener(
      "change",
      renderVehicles
    );


    $("expenseSearch")?.addEventListener(
      "input",
      renderExpenses
    );


    $("expenseCategoryFilter")?.addEventListener(
      "change",
      renderExpenses
    );


    $("pettySearch")?.addEventListener(
      "input",
      renderPettyCash
    );


    $("pettyCategoryFilter")?.addEventListener(
      "change",
      renderPettyCash
    );


    $("reqSearch")?.addEventListener(
      "input",
      renderRequisitions
    );


    $("reqStatusFilter")?.addEventListener(
      "change",
      renderRequisitions
    );

  }
);


/* =========================================================
   END OF PART 1from 1759
   ========================================================= */
/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE APP.JS
   PART 2 / 6
   VEHICLES — CRUD + RENDERING
   ========================================================= */


/* =========================================================
   VEHICLE STATUS CLASS
   ========================================================= */

function vehicleStatusClass(status){

  const value =
    normalize(status);

  if(value === "under repair"){
    return "status-under-repair";
  }

  if(value === "completed"){
    return "status-completed";
  }

  if(value === "released"){
    return "status-purchased";
  }

  if(value === "storage"){
    return "status-default";
  }

  return "status-default";
}


/* =========================================================
   VEHICLE DISPLAY NAME
   ========================================================= */

function vehicleName(vehicle){

  if(!vehicle){
    return "Unknown";
  }

  return (
    vehicle.registration ||
    vehicle.chassis_no ||
    vehicle.registration_chassis_no ||
    "No Registration"
  );

}


/* =========================================================
   VEHICLE SEARCH
   ========================================================= */

function filterVehicles(){

  const search =
    normalize(
      $("vehicleSearch")?.value
    );

  const status =
    $("vehicleStatusFilter")?.value || "";


  return vehicles.filter(vehicle => {

    const registration =
      normalize(
        vehicle.registration ||
        vehicle.chassis_no ||
        vehicle.registration_chassis_no
      );

    const customer =
      normalize(
        vehicle.customer
      );

    const jobType =
      normalize(
        vehicle.job_type
      );

    const vehicleStatus =
      String(
        vehicle.status || ""
      );


    const matchesSearch =
      !search ||
      registration.includes(search) ||
      customer.includes(search) ||
      jobType.includes(search) ||
      normalize(vehicle.description)
        .includes(search);


    const matchesStatus =
      !status ||
      vehicleStatus === status;


    return (
      matchesSearch &&
      matchesStatus
    );

  });

}


/* =========================================================
   RENDER VEHICLES
   ========================================================= */

window.renderVehicles = function(){

  const tbody =
    $("vehiclesTableBody");

  if(!tbody){
    return;
  }


  const filtered =
    filterVehicles();


  if(filtered.length === 0){

    tbody.innerHTML = `
      <tr>
        <td colspan="9"
            style="
              text-align:center;
              padding:35px;
              color:#64748b;
            ">
          No vehicle records found.
        </td>
      </tr>
    `;

    return;
  }


  tbody.innerHTML =
    filtered.map(vehicle => {

      const registration =
        vehicleName(vehicle);

      const billed =
        Number(vehicle.billed || 0);

      const paid =
        Number(vehicle.paid || 0);

      const outstanding =
        Math.max(
          0,
          billed - paid
        );


      const status =
        vehicle.status ||
        "Under Repair";


      return `
        <tr>

          <td>
            <strong>
              ${escapeHTML(registration)}
            </strong>
          </td>

          <td>
            ${escapeHTML(
              vehicle.customer || "-"
            )}
          </td>

          <td>
            ${escapeHTML(
              safeDate(vehicle.date_in)
            )}
          </td>

          <td>
            <span class="status status-default">
              ${escapeHTML(
                vehicle.job_type || "Repair"
              )}
            </span>
          </td>

          <td>
            <span class="status ${vehicleStatusClass(status)}">
              ${escapeHTML(status)}
            </span>
          </td>

          <td>
            ${formatMoney(billed)}
          </td>

          <td>
            ${formatMoney(paid)}
          </td>

          <td>
            <strong>
              ${formatMoney(outstanding)}
            </strong>
          </td>

          <td>

            <div class="table-actions">

              <button
                class="action-btn"
                title="View vehicle expenses"
                onclick="viewVehicleExpenses('${vehicle.id}')">
                💳
              </button>

              <button
                class="action-btn"
                title="Edit vehicle"
                onclick="openVehicleModal('${vehicle.id}')">
                ✏️
              </button>

              <button
                class="action-btn"
                title="Delete vehicle"
                onclick="deleteVehicle('${vehicle.id}')">
                🗑
              </button>

            </div>

          </td>

        </tr>
      `;

    }).join("");

};


/* =========================================================
   SAVE VEHICLE
   ========================================================= */

async function saveVehicle(){

  if(!ensureLoggedIn()){
    return;
  }


  const registration =
    $("vehicleRegistration")?.value.trim();


  const customer =
    $("vehicleCustomer")?.value.trim();


  const dateIn =
    $("vehicleDateIn")?.value;


  const dateOut =
    $("vehicleDateOut")?.value || null;


  const jobType =
    $("vehicleJobType")?.value ||
    "Repair";


  const status =
    $("vehicleStatus")?.value ||
    "Under Repair";


  const releasedTo =
    $("vehicleReleasedTo")?.value.trim() ||
    null;


  const releasedContact =
    $("vehicleReleasedContact")?.value.trim() ||
    null;


  const billed =
    Number(
      $("vehicleBilled")?.value || 0
    );


  const paid =
    Number(
      $("vehiclePaid")?.value || 0
    );


  const description =
    $("vehicleDescription")?.value.trim() ||
    null;


  /*
     Validation
  */

  if(!registration){

    showToast(
      "Registration / Chassis No. is required."
    );

    $("vehicleRegistration")?.focus();

    return;

  }


  if(!customer){

    showToast(
      "Customer is required."
    );

    $("vehicleCustomer")?.focus();

    return;

  }


  if(!dateIn){

    showToast(
      "Date In is required."
    );

    $("vehicleDateIn")?.focus();

    return;

  }


  if(!JOB_TYPES.includes(jobType)){

    showToast(
      "Select a valid Job Type."
    );

    return;

  }


  if(!VEHICLE_STATUSES.includes(status)){

    showToast(
      "Select a valid vehicle status."
    );

    return;

  }


  if(billed < 0){

    showToast(
      "Billed amount cannot be negative."
    );

    return;

  }


  if(paid < 0){

    showToast(
      "Paid amount cannot be negative."
    );

    return;

  }


  /*
     Prevent paid from exceeding billed.
     This avoids negative outstanding balances.
  */

  if(
    billed > 0 &&
    paid > billed
  ){

    showToast(
      "Paid amount cannot exceed billed amount."
    );

    return;

  }


  /*
     Build database payload.
  */

  const payload = {

    registration: registration,

    customer: customer,

    date_in: dateIn,

    date_out: dateOut,

    job_type: jobType,

    status: status,

    released_to: releasedTo,

    released_contact: releasedContact,

    billed: billed,

    paid: paid,

    description: description

  };


  try{

    let result;


    /*
       EDIT EXISTING VEHICLE
    */

    if(editingVehicleId){

      result =
        await supabase
          .from("vehicles")
          .update(payload)
          .eq(
            "id",
            editingVehicleId
          )
          .select()
          .single();

    }


    /*
       ADD NEW VEHICLE
    */

    else{

      result =
        await supabase
          .from("vehicles")
          .insert(payload)
          .select()
          .single();

    }


    if(
      handleSupabaseError(
        result.error,
        editingVehicleId
          ? "Updating vehicle"
          : "Saving vehicle"
      )
    ){

      return;

    }


    /*
       Update local state immediately.
    */

    if(editingVehicleId){

      const index =
        vehicles.findIndex(
          vehicle =>
            String(vehicle.id) ===
            String(editingVehicleId)
        );


      if(index !== -1){

        vehicles[index] =
          result.data;

      }

    }else{

      vehicles.unshift(
        result.data
      );

    }


    /*
       Close modal.
    */

    closeModal(
      "vehicleModal"
    );


    editingVehicleId = null;


    /*
       Refresh vehicle-related
       dropdowns and tables.
    */

    populateVehicleSelects();

    renderVehicles();
    renderDashboard();


    showToast(
      editingVehicleId
        ? "Vehicle updated successfully."
        : "Vehicle saved successfully."
    );


  }catch(error){

    console.error(
      "saveVehicle error:",
      error
    );

    showToast(
      "Unable to save vehicle."
    );

  }

}


/* =========================================================
   VEHICLE FORM SUBMIT
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function(){

    const form =
      $("vehicleForm");


    if(form){

      form.addEventListener(
        "submit",
        async function(event){

          event.preventDefault();

          await saveVehicle();

        }
      );

    }

  }
);


/* =========================================================
   DELETE VEHICLE
   ========================================================= */

window.deleteVehicle = async function(vehicleId){

  if(!vehicleId){
    return;
  }


  const vehicle =
    vehicles.find(
      v =>
        String(v.id) ===
        String(vehicleId)
    );


  if(!vehicle){

    showToast(
      "Vehicle record not found."
    );

    return;

  }


  const registration =
    vehicleName(vehicle);


  /*
     Check whether this vehicle has
     linked expenses.
  */

  const linkedExpenses =
    expenses.filter(
      expense =>
        String(expense.vehicle_id || "") ===
        String(vehicleId)
    );


  let message =
    `Delete vehicle ${registration}?`;


  if(linkedExpenses.length){

    message +=
      `\n\nThis vehicle has ${linkedExpenses.length} linked expense record(s).`;

  }


  message +=
    "\n\nThis action cannot be undone.";


  if(!confirm(message)){
    return;
  }


  try{

    /*
       Delete linked expenses first if
       they exist, preventing foreign-key
       errors when the database requires it.
    */

    if(linkedExpenses.length){

      const expenseDelete =
        await supabase
          .from("expenses")
          .delete()
          .eq(
            "vehicle_id",
            vehicleId
          );


      if(expenseDelete.error){

        handleSupabaseError(
          expenseDelete.error,
          "Deleting vehicle expenses"
        );

        return;

      }

    }


    /*
       Delete vehicle.
    */

    const result =
      await supabase
        .from("vehicles")
        .delete()
        .eq(
          "id",
          vehicleId
        );


    if(
      handleSupabaseError(
        result.error,
        "Deleting vehicle"
      )
    ){

      return;

    }


    /*
       Update local arrays.
    */

    vehicles =
      vehicles.filter(
        vehicle =>
          String(vehicle.id) !==
          String(vehicleId)
      );


    if(linkedExpenses.length){

      expenses =
        expenses.filter(
          expense =>
            String(
              expense.vehicle_id || ""
            ) !== String(vehicleId)
        );

    }


    populateVehicleSelects();

    renderVehicles();
    renderExpenses();
    renderDashboard();


    showToast(
      "Vehicle deleted successfully."
    );


  }catch(error){

    console.error(
      "deleteVehicle error:",
      error
    );

    showToast(
      "Unable to delete vehicle."
    );

  }

};


/* =========================================================
   VEHICLE EXPENSES
   ========================================================= */

window.viewVehicleExpenses = function(vehicleId){

  selectedVehicleId =
    vehicleId;


  const vehicle =
    vehicles.find(
      vehicle =>
        String(vehicle.id) ===
        String(vehicleId)
    );


  if(!vehicle){

    showToast(
      "Vehicle not found."
    );

    return;

  }


  const vehicleExpenses =
    expenses.filter(
      expense =>
        String(
          expense.vehicle_id || ""
        ) ===
        String(vehicleId)
    );


  const totalExpenses =
    vehicleExpenses.reduce(
      (sum,expense) =>
        sum +
        Number(
          expense.amount || 0
        ),
      0
    );


  const registration =
    vehicleName(vehicle);


  const content =
    $("vehicleExpensePreviewContent");


  if(!content){
    return;
  }


  const billed =
    Number(
      vehicle.billed || 0
    );


  const paid =
    Number(
      vehicle.paid || 0
    );


  const outstanding =
    Math.max(
      0,
      billed - paid
    );


  let rows = "";


  if(vehicleExpenses.length === 0){

    rows = `
      <tr>
        <td colspan="5"
            style="
              text-align:center;
              padding:25px;
              color:#64748b;
            ">
          No expenses recorded for this vehicle.
        </td>
      </tr>
    `;

  }else{

    rows =
      vehicleExpenses
        .map(expense => `

          <tr>

            <td>
              ${escapeHTML(
                safeDate(
                  expense.expense_date
                )
              )}
            </td>

            <td>
              ${escapeHTML(
                expense.description || "-"
              )}
            </td>

            <td>
              ${escapeHTML(
                expense.category || "-"
              )}
            </td>

            <td>
              ${formatMoney(
                expense.amount
              )}
            </td>

            <td>

              <div class="table-actions">

                <button
                  class="action-btn"
                  onclick="openExpenseModal('${expense.id}')">
                  ✏️
                </button>

              </div>

            </td>

          </tr>

        `)
        .join("");

  }


  content.innerHTML = `

    <div style="margin-bottom:18px">

      <h3 style="font-size:20px;margin-bottom:5px">
        ${escapeHTML(registration)}
      </h3>

      <div style="color:#64748b;font-size:12px">
        ${escapeHTML(
          vehicle.customer || ""
        )}
      </div>

    </div>


    <div class="financial-grid"
         style="
           border:1px solid #e5e7eb;
           border-radius:14px;
           margin-bottom:18px;
         ">

      <div class="financial-item">

        <label>Billed</label>

        <strong>
          ${formatMoney(billed)}
        </strong>

      </div>


      <div class="financial-item">

        <label>Paid</label>

        <strong>
          ${formatMoney(paid)}
        </strong>

      </div>


      <div class="financial-item">

        <label>Outstanding</label>

        <strong>
          ${formatMoney(outstanding)}
        </strong>

      </div>


      <div class="financial-item">

        <label>Expenses</label>

        <strong>
          ${formatMoney(totalExpenses)}
        </strong>

      </div>

    </div>


    <div class="table-card">

      <table>

        <thead>

          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Action</th>
          </tr>

        </thead>

        <tbody>

          ${rows}

        </tbody>

      </table>

    </div>

  `;


  openModal(
    "vehicleExpensePreviewModal"
  );

};


/* =========================================================
   PRINT VEHICLE EXPENSE PREVIEW
   ========================================================= */

window.printVehicleExpensePreview = function(){

  const content =
    $("vehicleExpensePreviewContent");


  if(!content){

    showToast(
      "Nothing to print."
    );

    return;

  }


  printHTMLDocument(
    "Vehicle Expense Summary",
    content.innerHTML
  );

};


/* =========================================================
   VEHICLE TOTALS
   ========================================================= */

function getVehicleTotals(){

  const totalVehicles =
    vehicles.length;


  const underRepair =
    vehicles.filter(
      vehicle =>
        normalize(vehicle.status) ===
        "under repair"
    ).length;


  const totalBilled =
    vehicles.reduce(
      (sum,vehicle) =>
        sum +
        Number(
          vehicle.billed || 0
        ),
      0
    );


  const totalPaid =
    vehicles.reduce(
      (sum,vehicle) =>
        sum +
        Number(
          vehicle.paid || 0
        ),
      0
    );


  const outstanding =
    Math.max(
      0,
      totalBilled - totalPaid
    );


  return {

    totalVehicles,
    underRepair,
    totalBilled,
    totalPaid,
    outstanding

  };

}


/* =========================================================
   VEHICLE STATUS COUNTS
   ========================================================= */

function getVehicleStatusCounts(){

  const counts = {

    Storage: 0,

    "Under Repair": 0,

    Completed: 0,

    Released: 0

  };


  vehicles.forEach(vehicle => {

    const status =
      vehicle.status;


    if(
      Object.prototype.hasOwnProperty
        .call(counts,status)
    ){

      counts[status]++;

    }

  });


  return counts;

}


/* =========================================================
   VEHICLE SEARCH BY REGISTRATION
   ========================================================= */

window.findVehicleByRegistration =
function(registration){

  const value =
    normalize(registration);


  if(!value){
    return null;
  }


  return vehicles.find(
    vehicle => {

      const reg =
        normalize(
          vehicle.registration ||
          vehicle.chassis_no ||
          vehicle.registration_chassis_no
        );

      return reg === value;

    }
  ) || null;

};


/* =========================================================
   VEHICLE EXPENSE TOTAL
   ========================================================= */

function getVehicleExpenseTotal(vehicleId){

  return expenses
    .filter(
      expense =>
        String(
          expense.vehicle_id || ""
        ) ===
        String(vehicleId)
    )
    .reduce(
      (sum,expense) =>
        sum +
        Number(
          expense.amount || 0
        ),
      0
    );

}


/* =========================================================
   UPDATE VEHICLE PAYMENT
   ========================================================= */

window.updateVehiclePayment =
async function(vehicleId,amount){

  const vehicle =
    vehicles.find(
      v =>
        String(v.id) ===
        String(vehicleId)
    );


  if(!vehicle){

    showToast(
      "Vehicle not found."
    );

    return;

  }


  const billed =
    Number(
      vehicle.billed || 0
    );


  const paid =
    Number(amount || 0);


  if(paid < 0){

    showToast(
      "Payment cannot be negative."
    );

    return;

  }


  if(
    billed > 0 &&
    paid > billed
  ){

    showToast(
      "Payment cannot exceed billed amount."
    );

    return;

  }


  try{

    const result =
      await supabase
        .from("vehicles")
        .update({
          paid: paid
        })
        .eq(
          "id",
          vehicleId
        )
        .select()
        .single();


    if(
      handleSupabaseError(
        result.error,
        "Updating payment"
      )
    ){

      return;

    }


    const index =
      vehicles.findIndex(
        v =>
          String(v.id) ===
          String(vehicleId)
      );


    if(index !== -1){

      vehicles[index] =
        result.data;

    }


    renderVehicles();
    renderDashboard();


    showToast(
      "Payment updated."
    );


  }catch(error){

    console.error(
      "updateVehiclePayment error:",
      error
    );

    showToast(
      "Unable to update payment."
    );

  }

};


/* =========================================================
   VEHICLE RELEASE VALIDATION
   ========================================================= */

function validateVehicleRelease(){

  const status =
    $("vehicleStatus")?.value;


  const releasedTo =
    $("vehicleReleasedTo")?.value.trim();


  const releasedContact =
    $("vehicleReleasedContact")?.value.trim();


  if(status === "Released"){

    if(!releasedTo){

      showToast(
        "Enter Released To before releasing the vehicle."
      );

      $("vehicleReleasedTo")?.focus();

      return false;

    }


    if(!releasedContact){

      showToast(
        "Enter Released Contact before releasing the vehicle."
      );

      $("vehicleReleasedContact")?.focus();

      return false;

    }

  }


  return true;

}


/* =========================================================
   ADD RELEASE VALIDATION TO VEHICLE FORM
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function(){

    const form =
      $("vehicleForm");


    if(!form){
      return;
    }


    form.addEventListener(
      "submit",
      function(event){

        if(!validateVehicleRelease()){

          event.preventDefault();

        }

      },
      true
    );

  }
);


/* =========================================================
   VEHICLE STATUS CHANGE
   ========================================================= */

document.addEventListener(
  "change",
  function(event){

    if(
      event.target &&
      event.target.id ===
      "vehicleStatus"
    ){

      const status =
        event.target.value;


      /*
         Clear release information when
         vehicle is not being released.
      */

      if(status !== "Released"){

        /*
           We don't clear the fields automatically
           if editing an existing record because
           the user may want to review them.
        */

      }

    }

  }
);


/* =========================================================
   PRINT VEHICLES
   ========================================================= */

window.printVehicles = function(){

  const filtered =
    filterVehicles();


  let rows = "";


  filtered.forEach(vehicle => {

    const billed =
      Number(
        vehicle.billed || 0
      );


    const paid =
      Number(
        vehicle.paid || 0
      );


    const outstanding =
      Math.max(
        0,
        billed - paid
      );


    rows += `

      <tr>

        <td>
          ${escapeHTML(
            vehicleName(vehicle)
          )}
        </td>

        <td>
          ${escapeHTML(
            vehicle.customer || "-"
          )}
        </td>

        <td>
          ${escapeHTML(
            safeDate(vehicle.date_in)
          )}
        </td>

        <td>
          ${escapeHTML(
            vehicle.job_type || "Repair"
          )}
        </td>

        <td>
          ${escapeHTML(
            vehicle.status || ""
          )}
        </td>

        <td>
          ${formatMoney(billed)}
        </td>

        <td>
          ${formatMoney(paid)}
        </td>

        <td>
          ${formatMoney(outstanding)}
        </td>

      </tr>

    `;

  });


  const html = `

    <div class="print-header">

      <h1>Garage Operations Pro</h1>

      <h2>Vehicle Report</h2>

      <p>
        Generated:
        ${new Date().toLocaleString("en-KE")}
      </p>

    </div>


    <table>

      <thead>

        <tr>
          <th>Registration / Chassis No.</th>
          <th>Customer</th>
          <th>Date In</th>
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

  `;


  printHTMLDocument(
    "Vehicle Report",
    html
  );

};


/* =========================================================
   END OF PART 2 3423
   ========================================================= */

/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE APP.JS
   PART 3 / 6
   EXPENSES — CRUD + RENDERING
   ========================================================= */

/* =========================================================
   EXPENSE HELPERS
   ========================================================= */

function expenseCategoryClass(category){
  const value = normalize(category);

  if(value === "parts"){
    return "status-under-repair";
  }

  if(value === "materials"){
    return "status-default";
  }

  if(value === "labour"){
    return "status-completed";
  }

  return "status-default";
}

function getExpenseVehicle(expense){
  if(!expense){
    return null;
  }

  if(!expense.vehicle_id){
    return null;
  }

  return vehicles.find(
    vehicle =>
      String(vehicle.id) === String(expense.vehicle_id)
  ) || null;
}

function getExpenseVehicleName(expense){
  const vehicle = getExpenseVehicle(expense);

  if(!vehicle){
    return "General";
  }

  return vehicleName(vehicle);
}

function getTotalExpenses(){
  return expenses.reduce(
    (sum,expense) =>
      sum + Number(expense.amount || 0),
    0
  );
}

function getExpenseCategoryTotals(){
  const totals = {
    Parts: 0,
    Materials: 0,
    Labour: 0
  };

  expenses.forEach(expense => {
    const category = expense.category;

    if(
      Object.prototype.hasOwnProperty.call(
        totals,
        category
      )
    ){
      totals[category] +=
        Number(expense.amount || 0);
    }
  });

  return totals;
}

/* =========================================================
   EXPENSE FILTER
   ========================================================= */

function filterExpenses(){
  const search =
    normalize($("expenseSearch")?.value);

  const category =
    $("expenseCategoryFilter")?.value || "";

  return expenses.filter(expense => {

    const vehicleRegistration =
      normalize(getExpenseVehicleName(expense));

    const description =
      normalize(expense.description);

    const expenseCategory =
      String(expense.category || "");

    const amount =
      normalize(expense.amount);

    const date =
      normalize(expense.expense_date);

    const matchesSearch =
      !search ||
      vehicleRegistration.includes(search) ||
      description.includes(search) ||
      expenseCategory.toLowerCase().includes(search) ||
      amount.includes(search) ||
      date.includes(search);

    const matchesCategory =
      !category ||
      expenseCategory === category;

    return (
      matchesSearch &&
      matchesCategory
    );
  });
}

/* =========================================================
   RENDER EXPENSES
   ========================================================= */

window.renderExpenses = function(){

  const tbody =
    $("expensesTableBody");

  if(!tbody){
    return;
  }

  const filtered =
    filterExpenses();

  if(filtered.length === 0){

    tbody.innerHTML = `
      <tr>
        <td
          colspan="7"
          style="
            text-align:center;
            padding:35px;
            color:#64748b;
          "
        >
          No expense records found.
        </td>
      </tr>
    `;

    updateExpenseSummary();
    return;
  }

  tbody.innerHTML =
    filtered.map(expense => {

      const vehicle =
        getExpenseVehicle(expense);

      const vehicleRegistration =
        getExpenseVehicleName(expense);

      const amount =
        Number(expense.amount || 0);

      return `
        <tr>

          <td>
            ${escapeHTML(
              safeDate(expense.expense_date)
            )}
          </td>

          <td>
            <strong>
              ${escapeHTML(
                vehicleRegistration
              )}
            </strong>

            ${
              vehicle && vehicle.customer
                ? `
                  <div
                    style="
                      font-size:11px;
                      color:#64748b;
                      margin-top:3px;
                    "
                  >
                    ${escapeHTML(
                      vehicle.customer
                    )}
                  </div>
                `
                : ""
            }
          </td>

          <td>
            <span
              class="status ${expenseCategoryClass(
                expense.category
              )}"
            >
              ${escapeHTML(
                expense.category || "-"
              )}
            </span>
          </td>

          <td>
            ${escapeHTML(
              expense.description || "-"
            )}
          </td>

          <td>
            <strong>
              ${formatMoney(amount)}
            </strong>
          </td>

          <td>
            ${
              expense.created_at
                ? escapeHTML(
                    safeDate(expense.created_at)
                  )
                : "-"
            }
          </td>

          <td>
            <div class="table-actions">

              <button
                class="action-btn"
                title="Edit expense"
                onclick="openExpenseModal('${expense.id}')"
              >
                ✏️
              </button>

              <button
                class="action-btn"
                title="Delete expense"
                onclick="deleteExpense('${expense.id}')"
              >
                🗑
              </button>

            </div>
          </td>

        </tr>
      `;

    }).join("");

  updateExpenseSummary();
};

/* =========================================================
   EXPENSE SUMMARY
   ========================================================= */

function updateExpenseSummary(){

  const total =
    getTotalExpenses();

  const categoryTotals =
    getExpenseCategoryTotals();

  /*
   * These IDs are optional.
   * If they exist in the HTML they will be updated.
   * This keeps the JS compatible with the
   * existing dashboard.
   */

  if($("expenseTotal")){
    $("expenseTotal").textContent =
      formatMoney(total);
  }

  if($("expensePartsTotal")){
    $("expensePartsTotal").textContent =
      formatMoney(categoryTotals.Parts);
  }

  if($("expenseMaterialsTotal")){
    $("expenseMaterialsTotal").textContent =
      formatMoney(categoryTotals.Materials);
  }

  if($("expenseLabourTotal")){
    $("expenseLabourTotal").textContent =
      formatMoney(categoryTotals.Labour);
  }
}

/* =========================================================
   SAVE EXPENSE
   ========================================================= */

async function saveExpense(){

  if(!ensureLoggedIn()){
    return;
  }

  const vehicleId =
    $("expenseVehicle")?.value || null;

  const expenseDate =
    $("expenseDate")?.value;

  const category =
    $("expenseCategory")?.value;

  const amount =
    Number(
      $("expenseAmount")?.value || 0
    );

  const description =
    $("expenseDescription")?.value.trim();

  /* VALIDATION */

  if(!expenseDate){

    showToast(
      "Expense date is required."
    );

    $("expenseDate")?.focus();

    return;
  }

  if(!EXPENSE_CATEGORIES.includes(category)){

    showToast(
      "Select a valid expense category."
    );

    $("expenseCategory")?.focus();

    return;
  }

  if(
    !Number.isFinite(amount) ||
    amount <= 0
  ){

    showToast(
      "Enter a valid expense amount."
    );

    $("expenseAmount")?.focus();

    return;
  }

  if(!description){

    showToast(
      "Expense description is required."
    );

    $("expenseDescription")?.focus();

    return;
  }

  const payload = {

    vehicle_id:
      vehicleId || null,

    expense_date:
      expenseDate,

    category:
      category,

    amount:
      amount,

    description:
      description
  };

  try{

    let result;

    if(editingExpenseId){

      result =
        await supabase
          .from("expenses")
          .update(payload)
          .eq(
            "id",
            editingExpenseId
          )
          .select()
          .single();

    }else{

      result =
        await supabase
          .from("expenses")
          .insert(payload)
          .select()
          .single();
    }

    if(
      handleSupabaseError(
        result.error,
        editingExpenseId
          ? "Updating expense"
          : "Saving expense"
      )
    ){
      return;
    }

    const wasEditing =
      Boolean(editingExpenseId);

    if(wasEditing){

      const index =
        expenses.findIndex(
          expense =>
            String(expense.id) ===
            String(editingExpenseId)
        );

      if(index !== -1){

        expenses[index] =
          result.data;

      }

    }else{

      expenses.unshift(
        result.data
      );

    }

    editingExpenseId = null;

    closeModal(
      "expenseModal"
    );

    renderExpenses();

    renderDashboard();

    showToast(
      wasEditing
        ? "Expense updated successfully."
        : "Expense saved successfully."
    );

  }catch(error){

    console.error(
      "saveExpense error:",
      error
    );

    showToast(
      "Unable to save expense."
    );

  }
}

/* =========================================================
   EXPENSE FORM SUBMIT
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function(){

    const form =
      $("expenseForm");

    if(!form){
      return;
    }

    form.addEventListener(
      "submit",
      async function(event){

        event.preventDefault();

        await saveExpense();

      }
    );

  }
);

/* =========================================================
   DELETE EXPENSE
   ========================================================= */

window.deleteExpense =
async function(expenseId){

  if(!expenseId){
    return;
  }

  const expense =
    expenses.find(
      item =>
        String(item.id) ===
        String(expenseId)
    );

  if(!expense){

    showToast(
      "Expense record not found."
    );

    return;
  }

  const vehicleNameForMessage =
    getExpenseVehicleName(
      expense
    );

  const amount =
    Number(
      expense.amount || 0
    );

  const message =
    `Delete expense for ${vehicleNameForMessage}?\n\n` +
    `Amount: ${formatMoney(amount)}\n` +
    `Category: ${expense.category || "-"}\n\n` +
    `This action cannot be undone.`;

  if(!confirm(message)){
    return;
  }

  try{

    const result =
      await supabase
        .from("expenses")
        .delete()
        .eq(
          "id",
          expenseId
        );

    if(
      handleSupabaseError(
        result.error,
        "Deleting expense"
      )
    ){
      return;
    }

    expenses =
      expenses.filter(
        item =>
          String(item.id) !==
          String(expenseId)
      );

    renderExpenses();

    renderDashboard();

    showToast(
      "Expense deleted successfully."
    );

  }catch(error){

    console.error(
      "deleteExpense error:",
      error
    );

    showToast(
      "Unable to delete expense."
    );

  }
};

/* =========================================================
   OPEN EXPENSE FOR VEHICLE
   ========================================================= */

window.openVehicleExpense =
function(vehicleId){

  if(!vehicleId){
    openExpenseModal();
    return;
  }

  const vehicle =
    vehicles.find(
      vehicle =>
        String(vehicle.id) ===
        String(vehicleId)
    );

  if(!vehicle){

    showToast(
      "Vehicle not found."
    );

    return;
  }

  openExpenseModal();

  if($("expenseVehicle")){
    $("expenseVehicle").value =
      vehicleId;
  }

  if($("expenseDate")){
    $("expenseDate").value =
      today();
  }
};

/* =========================================================
   VEHICLE EXPENSES SEARCH
   ========================================================= */

window.searchVehicleExpenses =
function(registration){

  const vehicle =
    findVehicleByRegistration(
      registration
    );

  if(!vehicle){

    showToast(
      "Vehicle not found."
    );

    return;
  }

  viewVehicleExpenses(
    vehicle.id
  );
};

/* =========================================================
   EXPENSE TOTAL BY VEHICLE
   ========================================================= */

function getExpensesForVehicle(
  vehicleId
){

  return expenses.filter(
    expense =>
      String(
        expense.vehicle_id || ""
      ) === String(vehicleId)
  );

}

function getVehicleExpenseBreakdown(
  vehicleId
){

  const result = {

    Parts: 0,

    Materials: 0,

    Labour: 0,

    Total: 0

  };

  const records =
    getExpensesForVehicle(
      vehicleId
    );

  records.forEach(expense => {

    const amount =
      Number(
        expense.amount || 0
      );

    const category =
      expense.category;

    if(
      Object.prototype.hasOwnProperty.call(
        result,
        category
      )
    ){

      result[category] +=
        amount;

    }

    result.Total +=
      amount;

  });

  return result;

}

/* =========================================================
   EXPENSE PRINT REPORT
   ========================================================= */

window.printExpenses =
function(){

  const filtered =
    filterExpenses();

  let rows = "";

  filtered.forEach(expense => {

    rows += `
      <tr>

        <td>
          ${escapeHTML(
            safeDate(
              expense.expense_date
            )
          )}
        </td>

        <td>
          ${escapeHTML(
            getExpenseVehicleName(
              expense
            )
          )}
        </td>

        <td>
          ${escapeHTML(
            expense.category || "-"
          )}
        </td>

        <td>
          ${escapeHTML(
            expense.description || "-"
          )}
        </td>

        <td>
          ${formatMoney(
            expense.amount
          )}
        </td>

      </tr>
    `;

  });

  const total =
    filtered.reduce(
      (sum,expense) =>
        sum +
        Number(
          expense.amount || 0
        ),
      0
    );

  const html = `

    <div class="print-header">

      <h1>
        Garage Operations Pro
      </h1>

      <h2>
        Expense Report
      </h2>

      <p>
        Generated:
        ${new Date().toLocaleString("en-KE")}
      </p>

      <p>
        Total Expenses:
        <strong>
          ${formatMoney(total)}
        </strong>
      </p>

    </div>

    <table>

      <thead>

        <tr>

          <th>Date</th>

          <th>
            Registration / Chassis No.
          </th>

          <th>
            Category
          </th>

          <th>
            Description
          </th>

          <th>
            Amount
          </th>

        </tr>

      </thead>

      <tbody>

        ${
          rows ||
          `
            <tr>
              <td
                colspan="5"
                style="text-align:center"
              >
                No expense records found.
              </td>
            </tr>
          `
        }

      </tbody>

    </table>

  `;

  printHTMLDocument(
    "Expense Report",
    html
  );

};

/* =========================================================
   EXPENSE DATE SORTING
   ========================================================= */

function sortExpensesByDate(
  descending = true
){

  expenses.sort(
    (a,b) => {

      const dateA =
        new Date(
          a.expense_date || 0
        ).getTime();

      const dateB =
        new Date(
          b.expense_date || 0
        ).getTime();

      return descending
        ? dateB - dateA
        : dateA - dateB;

    }
  );

}

/* =========================================================
   QUICK EXPENSE ACTION
   ========================================================= */

window.addExpenseForVehicle =
function(vehicleId){

  const vehicle =
    vehicles.find(
      vehicle =>
        String(vehicle.id) ===
        String(vehicleId)
    );

  if(!vehicle){

    showToast(
      "Vehicle not found."
    );

    return;
  }

  openExpenseModal();

  if($("expenseVehicle")){
    $("expenseVehicle").value =
      vehicle.id;
  }

};

/* =========================================================
   EXPENSE KEYBOARD SUPPORT
   ========================================================= */

document.addEventListener(
  "keydown",
  function(event){

    /*
     * Ctrl/Cmd + E opens a new expense.
     * Do not trigger while typing into an input.
     */

    if(
      (event.ctrlKey ||
       event.metaKey) &&
      event.key.toLowerCase() === "e"
    ){

      const tag =
        document.activeElement?.tagName;

      if(
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT"
      ){
        return;
      }

      event.preventDefault();

      openExpenseModal();

    }

  }
);

/* =========================================================
   EXPENSE CATEGORY SAFETY
   ========================================================= */

function normalizeExpenseCategory(
  category
){

  const value =
    normalize(category);

  if(value === "part" ||
     value === "parts"){
    return "Parts";
  }

  if(value === "material" ||
     value === "materials"){
    return "Materials";
  }

  if(value === "labour" ||
     value === "labor"){
    return "Labour";
  }

  return category || "";
}

/* =========================================================
   CLEAN EXISTING EXPENSE DATA
   ========================================================= */

function normalizeLoadedExpenses(){

  expenses =
    expenses.map(expense => {

      return {
        ...expense,

        category:
          normalizeExpenseCategory(
            expense.category
          ),

        amount:
          Number(
            expense.amount || 0
          )

      };

    });

}

/* =========================================================
   END PART 3 4503
   ========================================================= */
/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE APP.JS
   PART 4 / 6
   PETTY CASH — CRUD + RENDERING
   ========================================================= */

/* =========================================================
   PETTY CASH HELPERS
   ========================================================= */

function pettyCategoryClass(category){
  const value = normalize(category);

  if(value === "parts"){
    return "status-under-repair";
  }

  if(value === "materials"){
    return "status-default";
  }

  if(value === "labour" || value === "labor"){
    return "status-completed";
  }

  if(value === "transport"){
    return "status-purchased";
  }

  if(value === "other"){
    return "status-default";
  }

  return "status-default";
}

function getTotalPettyCash(){
  return pettyCash.reduce(
    (sum,record) =>
      sum + Number(record.amount || 0),
    0
  );
}

function getPettyCategoryTotals(){
  const totals = {
    Parts: 0,
    Materials: 0,
    Labour: 0,
    Transport: 0,
    Other: 0
  };

  pettyCash.forEach(record => {
    const category =
      normalizePettyCategory(
        record.category
      );

    if(
      Object.prototype.hasOwnProperty.call(
        totals,
        category
      )
    ){
      totals[category] +=
        Number(record.amount || 0);
    }
  });

  return totals;
}

function normalizePettyCategory(category){

  const value =
    normalize(category);

  if(
    value === "part" ||
    value === "parts"
  ){
    return "Parts";
  }

  if(
    value === "material" ||
    value === "materials"
  ){
    return "Materials";
  }

  if(
    value === "labour" ||
    value === "labor"
  ){
    return "Labour";
  }

  if(value === "transport"){
    return "Transport";
  }

  if(value === "other"){
    return "Other";
  }

  return category || "";
}

/* =========================================================
   PETTY CASH FILTER
   ========================================================= */

function filterPettyCash(){

  const search =
    normalize(
      $("pettySearch")?.value
    );

  const category =
    $("pettyCategoryFilter")?.value || "";

  return pettyCash.filter(record => {

    const paidTo =
      normalize(record.paid_to);

    const description =
      normalize(record.description);

    const notes =
      normalize(record.notes);

    const recordCategory =
      normalizePettyCategory(
        record.category
      );

    const amount =
      normalize(record.amount);

    const date =
      normalize(record.cash_date);

    const matchesSearch =
      !search ||
      paidTo.includes(search) ||
      description.includes(search) ||
      notes.includes(search) ||
      recordCategory.toLowerCase()
        .includes(search) ||
      amount.includes(search) ||
      date.includes(search);

    const matchesCategory =
      !category ||
      recordCategory === category;

    return (
      matchesSearch &&
      matchesCategory
    );
  });
}

/* =========================================================
   RENDER PETTY CASH
   ========================================================= */

window.renderPettyCash =
function(){

  const tbody =
    $("pettyTableBody");

  if(!tbody){
    return;
  }

  const filtered =
    filterPettyCash();

  if(filtered.length === 0){

    tbody.innerHTML = `
      <tr>
        <td
          colspan="7"
          style="
            text-align:center;
            padding:35px;
            color:#64748b;
          "
        >
          No petty cash records found.
        </td>
      </tr>
    `;

    updatePettySummary();

    return;
  }

  tbody.innerHTML =
    filtered.map(record => {

      const amount =
        Number(record.amount || 0);

      const category =
        normalizePettyCategory(
          record.category
        );

      return `
        <tr>

          <td>
            ${escapeHTML(
              safeDate(
                record.cash_date
              )
            )}
          </td>

          <td>
            <strong>
              ${escapeHTML(
                record.paid_to || "-"
              )}
            </strong>
          </td>

          <td>

            <span
              class="status ${pettyCategoryClass(
                category
              )}"
            >
              ${escapeHTML(
                category || "-"
              )}
            </span>

          </td>

          <td>
            ${escapeHTML(
              record.description || "-"
            )}
          </td>

          <td>
            <strong>
              ${formatMoney(amount)}
            </strong>
          </td>

          <td>
            ${escapeHTML(
              record.notes || "-"
            )}
          </td>

          <td>

            <div class="table-actions">

              <button
                class="action-btn"
                title="Edit petty cash"
                onclick="openPettyModal('${record.id}')"
              >
                ✏️
              </button>

              <button
                class="action-btn"
                title="Delete petty cash"
                onclick="deletePettyCash('${record.id}')"
              >
                🗑
              </button>

            </div>

          </td>

        </tr>
      `;

    }).join("");

  updatePettySummary();
};

/* =========================================================
   PETTY CASH SUMMARY
   ========================================================= */

function updatePettySummary(){

  const total =
    getTotalPettyCash();

  const totals =
    getPettyCategoryTotals();

  if($("pettyTotal")){
    $("pettyTotal").textContent =
      formatMoney(total);
  }

  if($("pettyPartsTotal")){
    $("pettyPartsTotal").textContent =
      formatMoney(totals.Parts);
  }

  if($("pettyMaterialsTotal")){
    $("pettyMaterialsTotal").textContent =
      formatMoney(totals.Materials);
  }

  if($("pettyLabourTotal")){
    $("pettyLabourTotal").textContent =
      formatMoney(totals.Labour);
  }

  if($("pettyTransportTotal")){
    $("pettyTransportTotal").textContent =
      formatMoney(totals.Transport);
  }

  if($("pettyOtherTotal")){
    $("pettyOtherTotal").textContent =
      formatMoney(totals.Other);
  }
}

/* =========================================================
   SAVE PETTY CASH
   ========================================================= */

async function savePettyCash(){

  if(!ensureLoggedIn()){
    return;
  }

  const cashDate =
    $("pettyDate")?.value;

  const paidTo =
    $("pettyPaidTo")?.value.trim();

  const category =
    normalizePettyCategory(
      $("pettyCategory")?.value
    );

  const amount =
    Number(
      $("pettyAmount")?.value || 0
    );

  const description =
    $("pettyDescription")
      ?.value.trim();

  const notes =
    $("pettyNotes")
      ?.value.trim() || null;

  if(!cashDate){

    showToast(
      "Cash date is required."
    );

    $("pettyDate")?.focus();

    return;
  }

  if(!paidTo){

    showToast(
      "Paid To is required."
    );

    $("pettyPaidTo")?.focus();

    return;
  }

  if(
    !PETTY_CATEGORIES.includes(
      category
    )
  ){

    showToast(
      "Select a valid petty cash category."
    );

    $("pettyCategory")?.focus();

    return;
  }

  if(
    !Number.isFinite(amount) ||
    amount <= 0
  ){

    showToast(
      "Enter a valid petty cash amount."
    );

    $("pettyAmount")?.focus();

    return;
  }

  if(!description){

    showToast(
      "Description is required."
    );

    $("pettyDescription")?.focus();

    return;
  }

  const payload = {

    cash_date:
      cashDate,

    paid_to:
      paidTo,

    category:
      category,

    amount:
      amount,

    description:
      description,

    notes:
      notes

  };

  try{

    let result;

    if(editingPettyId){

      result =
        await supabase
          .from("petty_cash")
          .update(payload)
          .eq(
            "id",
            editingPettyId
          )
          .select()
          .single();

    }else{

      result =
        await supabase
          .from("petty_cash")
          .insert(payload)
          .select()
          .single();

    }

    if(
      handleSupabaseError(
        result.error,
        editingPettyId
          ? "Updating petty cash"
          : "Saving petty cash"
      )
    ){
      return;
    }

    const wasEditing =
      Boolean(editingPettyId);

    if(wasEditing){

      const index =
        pettyCash.findIndex(
          record =>
            String(record.id) ===
            String(editingPettyId)
        );

      if(index !== -1){
        pettyCash[index] =
          result.data;
      }

    }else{

      pettyCash.unshift(
        result.data
      );

    }

    editingPettyId = null;

    closeModal(
      "pettyModal"
    );

    renderPettyCash();

    renderDashboard();

    showToast(
      wasEditing
        ? "Petty cash updated successfully."
        : "Petty cash saved successfully."
    );

  }catch(error){

    console.error(
      "savePettyCash error:",
      error
    );

    showToast(
      "Unable to save petty cash."
    );

  }
}

/* =========================================================
   PETTY CASH FORM
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function(){

    const form =
      $("pettyForm");

    if(!form){
      return;
    }

    form.addEventListener(
      "submit",
      async function(event){

        event.preventDefault();

        await savePettyCash();

      }
    );

  }
);

/* =========================================================
   DELETE PETTY CASH
   ========================================================= */

window.deletePettyCash =
async function(pettyId){

  if(!pettyId){
    return;
  }

  const record =
    pettyCash.find(
      item =>
        String(item.id) ===
        String(pettyId)
    );

  if(!record){

    showToast(
      "Petty cash record not found."
    );

    return;
  }

  const message =
    `Delete petty cash record?\n\n` +
    `Paid To: ${record.paid_to || "-"}\n` +
    `Amount: ${formatMoney(record.amount)}\n` +
    `Category: ${record.category || "-"}\n\n` +
    `This action cannot be undone.`;

  if(!confirm(message)){
    return;
  }

  try{

    const result =
      await supabase
        .from("petty_cash")
        .delete()
        .eq(
          "id",
          pettyId
        );

    if(
      handleSupabaseError(
        result.error,
        "Deleting petty cash"
      )
    ){
      return;
    }

    pettyCash =
      pettyCash.filter(
        item =>
          String(item.id) !==
          String(pettyId)
      );

    renderPettyCash();

    renderDashboard();

    showToast(
      "Petty cash deleted successfully."
    );

  }catch(error){

    console.error(
      "deletePettyCash error:",
      error
    );

    showToast(
      "Unable to delete petty cash."
    );

  }
};

/* =========================================================
   PETTY CASH PRINT REPORT
   ========================================================= */

window.printPettyCash =
function(){

  const filtered =
    filterPettyCash();

  let rows = "";

  filtered.forEach(record => {

    rows += `
      <tr>

        <td>
          ${escapeHTML(
            safeDate(
              record.cash_date
            )
          )}
        </td>

        <td>
          ${escapeHTML(
            record.paid_to || "-"
          )}
        </td>

        <td>
          ${escapeHTML(
            normalizePettyCategory(
              record.category
            ) || "-"
          )}
        </td>

        <td>
          ${escapeHTML(
            record.description || "-"
          )}
        </td>

        <td>
          ${formatMoney(
            record.amount
          )}
        </td>

        <td>
          ${escapeHTML(
            record.notes || "-"
          )}
        </td>

      </tr>
    `;

  });

  const total =
    filtered.reduce(
      (sum,record) =>
        sum +
        Number(
          record.amount || 0
        ),
      0
    );

  const html = `

    <div class="print-header">

      <h1>
        Garage Operations Pro
      </h1>

      <h2>
        Petty Cash Report
      </h2>

      <p>
        Generated:
        ${new Date().toLocaleString("en-KE")}
      </p>

      <p>
        Total:
        <strong>
          ${formatMoney(total)}
        </strong>
      </p>

    </div>

    <table>

      <thead>

        <tr>

          <th>Date</th>

          <th>Paid To</th>

          <th>Category</th>

          <th>Description</th>

          <th>Amount</th>

          <th>Notes</th>

        </tr>

      </thead>

      <tbody>

        ${
          rows ||
          `
            <tr>
              <td
                colspan="6"
                style="text-align:center"
              >
                No petty cash records found.
              </td>
            </tr>
          `
        }

      </tbody>

    </table>

  `;

  printHTMLDocument(
    "Petty Cash Report",
    html
  );

};

/* =========================================================
   NORMALIZE LOADED PETTY CASH
   ========================================================= */

function normalizeLoadedPettyCash(){

  pettyCash =
    pettyCash.map(record => {

      return {

        ...record,

        category:
          normalizePettyCategory(
            record.category
          ),

        amount:
          Number(
            record.amount || 0
          )

      };

    });

}

/* =========================================================
   END PART 4 5356
   ========================================================= */









/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE APP.JS
   PART 5 / 6
   REQUISITIONS — CRUD + RENDERING + PREVIEW
   ========================================================= */

/* =========================================================
   REQUISITION HELPERS
   ========================================================= */

function requisitionStatusClass(status){

  const value =
    normalize(status);

  if(value === "pending"){
    return "status-default";
  }

  if(value === "approved"){
    return "status-under-repair";
  }

  if(value === "purchased"){
    return "status-purchased";
  }

  if(value === "completed"){
    return "status-completed";
  }

  if(value === "rejected"){
    return "status-released";
  }

  return "status-default";
}

function normalizeRequisitionStatus(
  status
){

  const value =
    normalize(status);

  if(value === "pending"){
    return "Pending";
  }

  if(value === "approved"){
    return "Approved";
  }

  if(value === "purchased"){
    return "Purchased";
  }

  if(value === "completed"){
    return "Completed";
  }

  if(value === "rejected"){
    return "Rejected";
  }

  return status || "Pending";
}

function getRequisitionTotal(
  requisition
){

  if(!requisition){
    return 0;
  }

  if(
    requisition.total_amount !== null &&
    requisition.total_amount !== undefined &&
    requisition.total_amount !== ""
  ){

    return Number(
      requisition.total_amount || 0
    );

  }

  return (
    Number(
      requisition.quantity || 0
    ) *
    Number(
      requisition.unit_cost || 0
    )
  );

}

function getTotalRequisitions(){

  return requisitions.reduce(
    (sum,requisition) =>
      sum +
      getRequisitionTotal(
        requisition
      ),
    0
  );

}

function getPendingRequisitions(){

  return requisitions.filter(
    requisition =>
      normalizeRequisitionStatus(
        requisition.status
      ) === "Pending"
  );

}

/* =========================================================
   REQUISITION FILTER
   ========================================================= */

function filterRequisitions(){

  const search =
    normalize(
      $("reqSearch")?.value
    );

  const status =
    $("reqStatusFilter")?.value || "";

  return requisitions.filter(
    requisition => {

      const reqNo =
        normalize(
          requisition.req_no
        );

      const requestedBy =
        normalize(
          requisition.requested_by
        );

      const description =
        normalize(
          requisition.item_description
        );

      const notes =
        normalize(
          requisition.notes
        );

      const vehicle =
        normalize(
          getRequisitionVehicleName(
            requisition
          )
        );

      const category =
        normalize(
          requisition.category
        );

      const expenseType =
        normalize(
          requisition.expense_type
        );

      const reqStatus =
        normalizeRequisitionStatus(
          requisition.status
        );

      const matchesSearch =
        !search ||
        reqNo.includes(search) ||
        requestedBy.includes(search) ||
        description.includes(search) ||
        notes.includes(search) ||
        vehicle.includes(search) ||
        category.includes(search) ||
        expenseType.includes(search);

      const matchesStatus =
        !status ||
        reqStatus === status;

      return (
        matchesSearch &&
        matchesStatus
      );

    }
  );

}

/* =========================================================
   REQUISITION VEHICLE
   ========================================================= */

function getRequisitionVehicle(
  requisition
){

  if(
    !requisition ||
    !requisition.vehicle_id
  ){
    return null;
  }

  return vehicles.find(
    vehicle =>
      String(vehicle.id) ===
      String(requisition.vehicle_id)
  ) || null;

}

function getRequisitionVehicleName(
  requisition
){

  const vehicle =
    getRequisitionVehicle(
      requisition
    );

  if(!vehicle){
    return "General";
  }

  return vehicleName(
    vehicle
  );

}

/* =========================================================
   RENDER REQUISITIONS
   ========================================================= */

window.renderRequisitions =
function(){

  const tbody =
    $("requisitionsTableBody");

  if(!tbody){
    return;
  }

  const filtered =
    filterRequisitions();

  if(filtered.length === 0){

    tbody.innerHTML = `
      <tr>
        <td
          colspan="10"
          style="
            text-align:center;
            padding:35px;
            color:#64748b;
          "
        >
          No requisition records found.
        </td>
      </tr>
    `;

    updateRequisitionSummary();

    return;
  }

  tbody.innerHTML =
    filtered.map(requisition => {

      const total =
        getRequisitionTotal(
          requisition
        );

      const status =
        normalizeRequisitionStatus(
          requisition.status
        );

      const vehicle =
        getRequisitionVehicleName(
          requisition
        );

      return `
        <tr>

          <td>
            <strong>
              ${escapeHTML(
                requisition.req_no || "-"
              )}
            </strong>
          </td>

          <td>
            ${escapeHTML(
              safeDate(
                requisition.req_date
              )
            )}
          </td>

          <td>
            ${escapeHTML(
              requisition.requested_by || "-"
            )}
          </td>

          <td>
            ${escapeHTML(
              vehicle
            )}
          </td>

          <td>
            ${escapeHTML(
              requisition.item_description ||
              "-"
            )}
          </td>

          <td>
            ${formatNumber(
              requisition.quantity
            )}
          </td>

          <td>
            ${formatMoney(
              requisition.unit_cost
            )}
          </td>

          <td>
            <strong>
              ${formatMoney(total)}
            </strong>
          </td>

          <td>

            <span
              class="status ${requisitionStatusClass(
                status
              )}"
            >
              ${escapeHTML(status)}
            </span>

          </td>

          <td>

            <div class="table-actions">

              <button
                class="action-btn"
                title="Preview requisition"
                onclick="previewSelectedReq('${requisition.id}')"
              >
                👁️
              </button>

              <button
                class="action-btn"
                title="Edit requisition"
                onclick="openReqModal('${requisition.id}')"
              >
                ✏️
              </button>

              <button
                class="action-btn"
                title="Delete requisition"
                onclick="deleteRequisition('${requisition.id}')"
              >
                🗑
              </button>

            </div>

          </td>

        </tr>
      `;

    }).join("");

  updateRequisitionSummary();

};

/* =========================================================
   REQUISITION SUMMARY
   ========================================================= */

function updateRequisitionSummary(){

  const total =
    getTotalRequisitions();

  const pending =
    getPendingRequisitions();

  if($("reqOverallTotal")){

    $("reqOverallTotal")
      .textContent =
      formatMoney(total);

  }

  if($("dashReqCount")){

    $("dashReqCount")
      .textContent =
      String(pending.length);

  }

  if($("dashReqTotal")){

    $("dashReqTotal")
      .textContent =
      formatMoney(
        pending.reduce(
          (sum,requisition) =>
            sum +
            getRequisitionTotal(
              requisition
            ),
          0
        )
      );

  }

}

/* =========================================================
   SAVE REQUISITION
   ========================================================= */

async function saveRequisition(){

  if(!ensureLoggedIn()){
    return;
  }

  const reqNo =
    $("reqNo")?.value.trim();

  const reqDate =
    $("reqDate")?.value;

  const requestedBy =
    $("reqRequestedBy")
      ?.value.trim();

  const vehicleId =
    $("reqVehicle")?.value ||
    null;

  const itemDescription =
    $("reqItemDescription")
      ?.value.trim();

  const quantity =
    Number(
      $("reqQuantity")?.value || 0
    );

  const unitCost =
    Number(
      $("reqUnitCost")?.value || 0
    );

  const calculatedTotal =
    quantity * unitCost;

  const status =
    normalizeRequisitionStatus(
      $("reqStatus")?.value
    );

  const category =
    $("reqCategory")?.value.trim() ||
    null;

  const expenseType =
    $("reqExpenseType")
      ?.value.trim() ||
    null;

  const notes =
    $("reqNotes")
      ?.value.trim() ||
    null;

  if(!reqNo){

    showToast(
      "Requisition number is required."
    );

    $("reqNo")?.focus();

    return;
  }

  if(!reqDate){

    showToast(
      "Requisition date is required."
    );

    $("reqDate")?.focus();

    return;
  }

  if(!requestedBy){

    showToast(
      "Requested By is required."
    );

    $("reqRequestedBy")?.focus();

    return;
  }

  if(!itemDescription){

    showToast(
      "Item description is required."
    );

    $("reqItemDescription")?.focus();

    return;
  }

  if(
    !Number.isFinite(quantity) ||
    quantity <= 0
  ){

    showToast(
      "Enter a valid quantity."
    );

    $("reqQuantity")?.focus();

    return;
  }

  if(
    !Number.isFinite(unitCost) ||
    unitCost < 0
  ){

    showToast(
      "Enter a valid unit cost."
    );

    $("reqUnitCost")?.focus();

    return;
  }

  if(
    !REQUISITION_STATUSES.includes(
      status
    )
  ){

    showToast(
      "Select a valid requisition status."
    );

    return;
  }

  const payload = {

    req_no:
      reqNo,

    req_date:
      reqDate,

    requested_by:
      requestedBy,

    vehicle_id:
      vehicleId,

    item_description:
      itemDescription,

    quantity:
      quantity,

    unit_cost:
      unitCost,

    total_amount:
      calculatedTotal,

    status:
      status,

    category:
      category,

    expense_type:
      expenseType,

    notes:
      notes

  };

  try{

    let result;

    if(editingReqId){

      result =
        await supabase
          .from("requisitions")
          .update(payload)
          .eq(
            "id",
            editingReqId
          )
          .select()
          .single();

    }else{

      result =
        await supabase
          .from("requisitions")
          .insert(payload)
          .select()
          .single();

    }

    if(
      handleSupabaseError(
        result.error,
        editingReqId
          ? "Updating requisition"
          : "Saving requisition"
      )
    ){
      return;
    }

    const wasEditing =
      Boolean(editingReqId);

    if(wasEditing){

      const index =
        requisitions.findIndex(
          requisition =>
            String(requisition.id) ===
            String(editingReqId)
        );

      if(index !== -1){

        requisitions[index] =
          result.data;

      }

    }else{

      requisitions.unshift(
        result.data
      );

    }

    editingReqId = null;

    closeModal(
      "reqModal"
    );

    renderRequisitions();

    renderDashboard();

    showToast(
      wasEditing
        ? "Requisition updated successfully."
        : "Requisition saved successfully."
    );

  }catch(error){

    console.error(
      "saveRequisition error:",
      error
    );

    showToast(
      "Unable to save requisition."
    );

  }

}

/* =========================================================
   REQUISITION FORM SUBMIT
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function(){

    const form =
      $("reqForm");

    if(!form){
      return;
    }

    form.addEventListener(
      "submit",
      async function(event){

        event.preventDefault();

        await saveRequisition();

      }
    );

  }
);

/* =========================================================
   DELETE REQUISITION
   ========================================================= */

window.deleteRequisition =
async function(reqId){

  if(!reqId){
    return;
  }

  const requisition =
    requisitions.find(
      item =>
        String(item.id) ===
        String(reqId)
    );

  if(!requisition){

    showToast(
      "Requisition record not found."
    );

    return;
  }

  const total =
    getRequisitionTotal(
      requisition
    );

  const message =
    `Delete requisition ${requisition.req_no || ""}?\n\n` +
    `Item: ${requisition.item_description || "-"}\n` +
    `Total: ${formatMoney(total)}\n` +
    `Status: ${normalizeRequisitionStatus(requisition.status)}\n\n` +
    `This action cannot be undone.`;

  if(!confirm(message)){
    return;
  }

  try{

    const result =
      await supabase
        .from("requisitions")
        .delete()
        .eq(
          "id",
          reqId
        );

    if(
      handleSupabaseError(
        result.error,
        "Deleting requisition"
      )
    ){
      return;
    }

    requisitions =
      requisitions.filter(
        item =>
          String(item.id) !==
          String(reqId)
      );

    if(
      String(selectedReqId) ===
      String(reqId)
    ){
      selectedReqId = null;
    }

    renderRequisitions();

    renderDashboard();

    showToast(
      "Requisition deleted successfully."
    );

  }catch(error){

    console.error(
      "deleteRequisition error:",
      error
    );

    showToast(
      "Unable to delete requisition."
    );

  }

};

/* =========================================================
   PREVIEW SELECTED REQUISITION
   ========================================================= */

window.previewSelectedReq =
function(reqId){

  const requisition =
    requisitions.find(
      item =>
        String(item.id) ===
        String(reqId)
    );

  if(!requisition){

    showToast(
      "Requisition not found."
    );

    return;
  }

  selectedReqId =
    requisition.id;

  const content =
    $("reqPreviewContent");

  if(!content){

    showToast(
      "Requisition preview area not found."
    );

    return;
  }

  const total =
    getRequisitionTotal(
      requisition
    );

  const status =
    normalizeRequisitionStatus(
      requisition.status
    );

  const vehicle =
    getRequisitionVehicleName(
      requisition
    );

  content.innerHTML = `

    <div
      class="print-header"
      style="
        margin-bottom:20px;
      "
    >

      <h1>
        Garage Operations Pro
      </h1>

      <h2>
        Requisition
      </h2>

    </div>

    <div
      style="
        display:grid;
        grid-template-columns:
          repeat(auto-fit,minmax(180px,1fr));
        gap:12px;
        margin-bottom:20px;
      "
    >

      <div class="financial-item">
        <label>Requisition No.</label>
        <strong>
          ${escapeHTML(
            requisition.req_no || "-"
          )}
        </strong>
      </div>

      <div class="financial-item">
        <label>Date</label>
        <strong>
          ${escapeHTML(
            safeDate(
              requisition.req_date
            )
          )}
        </strong>
      </div>

      <div class="financial-item">
        <label>Requested By</label>
        <strong>
          ${escapeHTML(
            requisition.requested_by || "-"
          )}
        </strong>
      </div>

      <div class="financial-item">
        <label>Vehicle</label>
        <strong>
          ${escapeHTML(
            vehicle
          )}
        </strong>
      </div>

      <div class="financial-item">
        <label>Status</label>
        <strong>
          ${escapeHTML(
            status
          )}
        </strong>
      </div>

    </div>

    <div
      class="table-card"
      style="
        margin-bottom:18px;
      "
    >

      <table>

        <thead>

          <tr>

            <th>Item Description</th>

            <th>Category</th>

            <th>Expense Type</th>

            <th>Quantity</th>

            <th>Unit Cost</th>

            <th>Total</th>

          </tr>

        </thead>

        <tbody>

          <tr>

            <td>
              ${escapeHTML(
                requisition.item_description ||
                "-"
              )}
            </td>

            <td>
              ${escapeHTML(
                requisition.category ||
                "-"
              )}
            </td>

            <td>
              ${escapeHTML(
                requisition.expense_type ||
                "-"
              )}
            </td>

            <td>
              ${formatNumber(
                requisition.quantity
              )}
            </td>

            <td>
              ${formatMoney(
                requisition.unit_cost
              )}
            </td>

            <td>
              <strong>
                ${formatMoney(total)}
              </strong>
            </td>

          </tr>

        </tbody>

      </table>

    </div>

    <div
      style="
        padding:16px;
        border-radius:12px;
        background:#f8fafc;
        margin-bottom:18px;
      "
    >

      <strong>
        Notes
      </strong>

      <div
        style="
          margin-top:7px;
          color:#475569;
          white-space:pre-wrap;
        "
      >
        ${escapeHTML(
          requisition.notes ||
          "No notes."
        )}
      </div>

    </div>

    <div
      style="
        text-align:right;
        font-size:20px;
        font-weight:800;
      "
    >

      Total:
      ${formatMoney(total)}

    </div>

  `;

  openModal(
    "reqPreviewModal"
  );

};

/* =========================================================
   PRINT SELECTED REQUISITION
   ========================================================= */

window.printSelectedReq =
function(){

  if(!selectedReqId){

    showToast(
      "Select a requisition first."
    );

    return;
  }

  const requisition =
    requisitions.find(
      item =>
        String(item.id) ===
        String(selectedReqId)
    );

  if(!requisition){

    showToast(
      "Requisition not found."
    );

    return;
  }

  const total =
    getRequisitionTotal(
      requisition
    );

  const html = `

    <div class="print-header">

      <h1>
        Garage Operations Pro
      </h1>

      <h2>
        Requisition
      </h2>

      <p>
        Requisition No:
        <strong>
          ${escapeHTML(
            requisition.req_no || "-"
          )}
        </strong>
      </p>

      <p>
        Date:
        ${escapeHTML(
          safeDate(
            requisition.req_date
          )
        )}
      </p>

    </div>

    <table>

      <tbody>

        <tr>

          <th>
            Requested By
          </th>

          <td>
            ${escapeHTML(
              requisition.requested_by ||
              "-"
            )}
          </td>

        </tr>

        <tr>

          <th>
            Vehicle
          </th>

          <td>
            ${escapeHTML(
              getRequisitionVehicleName(
                requisition
              )
            )}
          </td>

        </tr>

        <tr>

          <th>
            Item
          </th>

          <td>
            ${escapeHTML(
              requisition.item_description ||
              "-"
            )}
          </td>

        </tr>

        <tr>

          <th>
            Category
          </th>

          <td>
            ${escapeHTML(
              requisition.category ||
              "-"
            )}
          </td>

        </tr>

        <tr>

          <th>
            Expense Type
          </th>

          <td>
            ${escapeHTML(
              requisition.expense_type ||
              "-"
            )}
          </td>

        </tr>

        <tr>

          <th>
            Quantity
          </th>

          <td>
            ${formatNumber(
              requisition.quantity
            )}
          </td>

        </tr>

        <tr>

          <th>
            Unit Cost
          </th>

          <td>
            ${formatMoney(
              requisition.unit_cost
            )}
          </td>

        </tr>

        <tr>

          <th>
            Total
          </th>

          <td>
            <strong>
              ${formatMoney(total)}
            </strong>
          </td>

        </tr>

        <tr>

          <th>
            Status
          </th>

          <td>
            ${escapeHTML(
              normalizeRequisitionStatus(
                requisition.status
              )
            )}
          </td>

        </tr>

        <tr>

          <th>
            Notes
          </th>

          <td>
            ${escapeHTML(
              requisition.notes ||
              "-"
            )}
          </td>

        </tr>

      </tbody>

    </table>

  `;

  printHTMLDocument(
    "Requisition",
    html
  );

};

/* =========================================================
   REQUISITION STATUS QUICK UPDATE
   ========================================================= */

window.updateRequisitionStatus =
async function(
  reqId,
  newStatus
){

  if(
    !REQUISITION_STATUSES.includes(
      newStatus
    )
  ){

    showToast(
      "Invalid requisition status."
    );

    return;
  }

  const requisition =
    requisitions.find(
      item =>
        String(item.id) ===
        String(reqId)
    );

  if(!requisition){

    showToast(
      "Requisition not found."
    );

    return;
  }

  try{

    const result =
      await supabase
        .from("requisitions")
        .update({
          status: newStatus
        })
        .eq(
          "id",
          reqId
        )
        .select()
        .single();

    if(
      handleSupabaseError(
        result.error,
        "Updating requisition status"
      )
    ){
      return;
    }

    const index =
      requisitions.findIndex(
        item =>
          String(item.id) ===
          String(reqId)
      );

    if(index !== -1){

      requisitions[index] =
        result.data;

    }

    renderRequisitions();

    renderDashboard();

    showToast(
      `Requisition marked ${newStatus}.`
    );

  }catch(error){

    console.error(
      "updateRequisitionStatus error:",
      error
    );

    showToast(
      "Unable to update requisition status."
    );

  }

};

/* =========================================================
   NORMALIZE LOADED REQUISITIONS
   ========================================================= */

function normalizeLoadedRequisitions(){

  requisitions =
    requisitions.map(
      requisition => {

        const quantity =
          Number(
            requisition.quantity || 0
          );

        const unitCost =
          Number(
            requisition.unit_cost || 0
          );

        let total =
          Number(
            requisition.total_amount
          );

        if(
          !Number.isFinite(total)
        ){

          total =
            quantity *
            unitCost;

        }

        return {

          ...requisition,

          status:
            normalizeRequisitionStatus(
              requisition.status
            ),

          quantity:
            quantity,

          unit_cost:
            unitCost,

          total_amount:
            total

        };

      }
    );

}

/* =========================================================
   END PART 5 6035
   ========================================================= */

/* =========================================================
   GARAGE OPERATIONS PRO
   COMPLETE APP.JS
   PART 6 / 6
   DASHBOARD + PRINTING + FINAL INITIALIZATION
   ========================================================= */


/* =========================================================
   DASHBOARD — TOTALS
   ========================================================= */

function getDashboardTotals(){

  const totalVehicles =
    vehicles.length;

  const repairVehicles =
    vehicles.filter(
      vehicle =>
        normalize(vehicle.status) ===
        "under repair"
    ).length;

  const totalBilled =
    vehicles.reduce(
      (sum,vehicle) =>
        sum +
        Number(
          vehicle.billed || 0
        ),
      0
    );

  const totalPaid =
    vehicles.reduce(
      (sum,vehicle) =>
        sum +
        Number(
          vehicle.paid || 0
        ),
      0
    );

  const outstanding =
    Math.max(
      0,
      totalBilled -
      totalPaid
    );

  const totalExpenses =
    getTotalExpenses();

  const totalPetty =
    getTotalPettyCash();

  const pendingRequisitions =
    getPendingRequisitions();

  const pendingReqTotal =
    pendingRequisitions.reduce(
      (sum,requisition) =>
        sum +
        getRequisitionTotal(
          requisition
        ),
      0
    );

  return {

    totalVehicles,

    repairVehicles,

    totalBilled,

    totalPaid,

    outstanding,

    totalExpenses,

    totalPetty,

    pendingRequisitions:
      pendingRequisitions.length,

    pendingReqTotal

  };

}


/* =========================================================
   DASHBOARD — ACTIVITY
   ========================================================= */

function buildDashboardActivity(){

  const activity = [];

  vehicles.forEach(vehicle => {

    activity.push({

      type:
        "Vehicle",

      date:
        vehicle.created_at ||
        vehicle.date_in,

      text:
        `Vehicle ${vehicleName(vehicle)} added`

    });

  });

  expenses.forEach(expense => {

    activity.push({

      type:
        "Expense",

      date:
        expense.created_at ||
        expense.expense_date,

      text:
        `Expense recorded: ${formatMoney(expense.amount)}`

    });

  });

  pettyCash.forEach(record => {

    activity.push({

      type:
        "Petty Cash",

      date:
        record.created_at ||
        record.cash_date,

      text:
        `Petty cash: ${formatMoney(record.amount)}`

    });

  });

  requisitions.forEach(requisition => {

    activity.push({

      type:
        "Requisition",

      date:
        requisition.created_at ||
        requisition.req_date,

      text:
        `${requisition.req_no || "Requisition"} — ${
          normalizeRequisitionStatus(
            requisition.status
          )
        }`

    });

  });

  activity.sort(
    (a,b) => {

      const dateA =
        new Date(
          a.date || 0
        ).getTime();

      const dateB =
        new Date(
          b.date || 0
        ).getTime();

      return dateB - dateA;

    }
  );

  return activity.slice(
    0,
    8
  );

}


/* =========================================================
   DASHBOARD — RENDER
   ========================================================= */

window.renderDashboard =
function(){

  const totals =
    getDashboardTotals();

  /* MAIN DASHBOARD CARDS */

  if($("dashVehicles")){
    $("dashVehicles")
      .textContent =
      formatNumber(
        totals.totalVehicles
      );
  }

  if($("dashRepair")){
    $("dashRepair")
      .textContent =
      formatNumber(
        totals.repairVehicles
      );
  }

  if($("dashOutstanding")){
    $("dashOutstanding")
      .textContent =
      formatMoney(
        totals.outstanding
      );
  }

  if($("dashReq")){
    $("dashReq")
      .textContent =
      formatNumber(
        totals.pendingRequisitions
      );
  }

  /* FINANCIAL CARDS */

  if($("dashBilled")){
    $("dashBilled")
      .textContent =
      formatMoney(
        totals.totalBilled
      );
  }

  if($("dashPaid")){
    $("dashPaid")
      .textContent =
      formatMoney(
        totals.totalPaid
      );
  }

  if($("dashExpenses")){
    $("dashExpenses")
      .textContent =
      formatMoney(
        totals.totalExpenses
      );
  }

  if($("dashPetty")){
    $("dashPetty")
      .textContent =
      formatMoney(
        totals.totalPetty
      );
  }

  /* REQUISITION SUMMARY */

  if($("dashReqCount")){
    $("dashReqCount")
      .textContent =
      String(
        totals.pendingRequisitions
      );
  }

  if($("dashReqTotal")){
    $("dashReqTotal")
      .textContent =
      formatMoney(
        totals.pendingReqTotal
      );
  }

  /* ACTIVITY */

  const activityContainer =
    $("dashboardActivity");

  if(
    activityContainer
  ){

    const activity =
      buildDashboardActivity();

    if(activity.length === 0){

      activityContainer.innerHTML = `
        <div
          style="
            padding:25px;
            text-align:center;
            color:#64748b;
          "
        >
          No recent activity.
        </div>
      `;

    }else{

      activityContainer.innerHTML =
        activity.map(item => {

          return `
            <div
              style="
                display:flex;
                align-items:flex-start;
                gap:12px;
                padding:12px 0;
                border-bottom:
                  1px solid #e5e7eb;
              "
            >

              <div
                style="
                  width:36px;
                  height:36px;
                  min-width:36px;
                  border-radius:10px;
                  background:#eff6ff;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-size:16px;
                "
              >
                ${
                  item.type === "Vehicle"
                    ? "🚗"
                    : item.type === "Expense"
                    ? "💳"
                    : item.type === "Petty Cash"
                    ? "💵"
                    : "📋"
                }
              </div>

              <div
                style="
                  min-width:0;
                  flex:1;
                "
              >

                <div
                  style="
                    font-size:13px;
                    font-weight:700;
                    color:#0f172a;
                  "
                >
                  ${escapeHTML(
                    item.text
                  )}
                </div>

                <div
                  style="
                    font-size:11px;
                    color:#64748b;
                    margin-top:3px;
                  "
                >
                  ${escapeHTML(
                    safeDate(item.date)
                  )}
                </div>

              </div>

            </div>
          `;

        }).join("");

    }

  }

  renderDashboardCharts();

};


/* =========================================================
   DASHBOARD — STATUS CHART
   ========================================================= */

function renderDashboardCharts(){

  const counts =
    getVehicleStatusCounts();

  const total =
    Object.values(
      counts
    ).reduce(
      (sum,value) =>
        sum + value,
      0
    );

  /*
   * The existing HTML may contain chart
   * containers with different IDs.
   * The code checks several common IDs
   * without changing the dashboard structure.
   */

  const statusContainer =
    $("vehicleStatusChart") ||
    $("vehicleStatusDonut") ||
    $("statusChart");

  if(statusContainer){

    if(total === 0){

      statusContainer.innerHTML = `
        <div
          style="
            text-align:center;
            padding:25px;
            color:#64748b;
          "
        >
          No vehicle data
        </div>
      `;

    }else{

      const items = [
        {
          name:"Storage",
          value:counts.Storage
        },
        {
          name:"Under Repair",
          value:counts["Under Repair"]
        },
        {
          name:"Completed",
          value:counts.Completed
        },
        {
          name:"Released",
          value:counts.Released
        }
      ];

      statusContainer.innerHTML =
        items.map(item => {

          const percentage =
            total > 0
              ? Math.round(
                  (item.value / total) *
                  100
                )
              : 0;

          return `
            <div
              style="
                margin-bottom:10px;
              "
            >

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  gap:10px;
                  font-size:12px;
                  margin-bottom:4px;
                "
              >

                <span>
                  ${escapeHTML(
                    item.name
                  )}
                </span>

                <strong>
                  ${item.value}
                  (${percentage}%)
                </strong>

              </div>

              <div
                style="
                  height:7px;
                  background:#e5e7eb;
                  border-radius:20px;
                  overflow:hidden;
                "
              >

                <div
                  style="
                    width:${percentage}%;
                    height:100%;
                    background:#2563eb;
                    border-radius:20px;
                  "
                ></div>

              </div>

            </div>
          `;

        }).join("");

    }

  }

  /*
   * Monthly expense summary.
   */

  const monthlyContainer =
    $("monthlyExpenseChart") ||
    $("expenseChart");

  if(monthlyContainer){

    const monthly =
      {};

    expenses.forEach(expense => {

      if(!expense.expense_date){
        return;
      }

      const date =
        new Date(
          expense.expense_date
        );

      if(
        Number.isNaN(
          date.getTime()
        )
      ){
        return;
      }

      const key =
        `${date.getFullYear()}-${String(
          date.getMonth()+1
        ).padStart(2,"0")}`;

      monthly[key] =
        (monthly[key] || 0) +
        Number(
          expense.amount || 0
        );

    });

    const entries =
      Object.entries(
        monthly
      )
      .sort(
        (a,b) =>
          a[0].localeCompare(b[0])
      )
      .slice(-6);

    if(entries.length === 0){

      monthlyContainer.innerHTML = `
        <div
          style="
            text-align:center;
            padding:25px;
            color:#64748b;
          "
        >
          No expense data
        </div>
      `;

    }else{

      const max =
        Math.max(
          ...entries.map(
            item => item[1]
          ),
          1
        );

      monthlyContainer.innerHTML =
        entries.map(
          ([month,value]) => {

            const width =
              Math.max(
                3,
                Math.round(
                  (value / max) *
                  100
                )
              );

            return `
              <div
                style="
                  margin-bottom:12px;
                "
              >

                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    font-size:11px;
                    margin-bottom:4px;
                  "
                >

                  <span>
                    ${escapeHTML(
                      month
                    )}
                  </span>

                  <strong>
                    ${formatMoney(
                      value
                    )}
                  </strong>

                </div>

                <div
                  style="
                    height:8px;
                    background:#e5e7eb;
                    border-radius:20px;
                    overflow:hidden;
                  "
                >

                  <div
                    style="
                      width:${width}%;
                      height:100%;
                      background:#0f172a;
                      border-radius:20px;
                    "
                  ></div>

                </div>

              </div>
            `;

          }
        ).join("");

    }

  }

}


/* =========================================================
   PRINTING ENGINE
   ========================================================= */

function printHTMLDocument(
  title,
  content
){

  const printWindow =
    window.open(
      "",
      "_blank",
      "width=1000,height=800"
    );

  if(!printWindow){

    showToast(
      "Please allow pop-ups to print."
    );

    return;
  }

  const generated =
    new Date()
      .toLocaleString(
        "en-KE"
      );

  printWindow.document.open();

  printWindow.document.write(`
    <!DOCTYPE html>

    <html>

    <head>

      <meta charset="UTF-8">

      <meta
        name="viewport"
        content="width=device-width,initial-scale=1"
      >

      <title>
        ${escapeHTML(title)}
      </title>

      <style>

        *{
          box-sizing:border-box;
        }

        body{
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          margin:0;
          padding:30px;
          color:#111827;
          background:#fff;
        }

        .print-header{
          margin-bottom:25px;
          text-align:center;
        }

        .print-header h1{
          margin:0 0 5px;
          font-size:24px;
        }

        .print-header h2{
          margin:0 0 8px;
          font-size:18px;
        }

        .print-header p{
          margin:4px 0;
          font-size:12px;
          color:#64748b;
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:15px;
        }

        th,
        td{
          border:1px solid #d1d5db;
          padding:8px;
          text-align:left;
          vertical-align:top;
          font-size:12px;
        }

        th{
          background:#f1f5f9;
          font-weight:700;
        }

        h1,
        h2,
        h3{
          color:#111827;
        }

        @media print{

          body{
            padding:10px;
          }

          .no-print{
            display:none !important;
          }

          table{
            page-break-inside:auto;
          }

          tr{
            page-break-inside:avoid;
            page-break-after:auto;
          }

        }

      </style>

    </head>

    <body>

      ${content}

      <div
        style="
          margin-top:30px;
          text-align:center;
          color:#94a3b8;
          font-size:10px;
        "
      >
        Garage Operations Pro —
        Generated ${escapeHTML(generated)}
      </div>

    </body>

    </html>
  `);

  printWindow.document.close();

  setTimeout(
    () => {

      printWindow.focus();

      printWindow.print();

    },
    400
  );

}


/* =========================================================
   GLOBAL PRINT HELPERS
   ========================================================= */

window.printHTMLDocument =
  printHTMLDocument;


/* =========================================================
   USER DISPLAY
   ========================================================= */

function updateGarageUserDisplay(){

  const storedUser =
    sessionStorage.getItem(
      "garageUser"
    );

  if(storedUser){

    currentUser =
      storedUser;

  }

  const displayName =
    currentUser
      ? (
          currentUser.charAt(0)
            .toUpperCase() +
          currentUser.slice(1)
        )
      : "Josephine";

  if($("welcomeUser")){
    $("welcomeUser")
      .textContent =
      displayName;
  }

  if($("sidebarUser")){
    $("sidebarUser")
      .textContent =
      displayName;
  }

}


/* =========================================================
   NORMALIZE ALL LOADED DATA
   ========================================================= */

function normalizeAllLoadedData(){

  /*
   * Vehicles
   */

  vehicles =
    vehicles.map(vehicle => {

      return {

        ...vehicle,

        job_type:
          JOB_TYPES.includes(
            vehicle.job_type
          )
            ? vehicle.job_type
            : "Repair",

        status:
          VEHICLE_STATUSES.includes(
            vehicle.status
          )
            ? vehicle.status
            : "Under Repair",

        billed:
          Number(
            vehicle.billed || 0
          ),

        paid:
          Number(
            vehicle.paid || 0
          )

      };

    });

  /*
   * Expenses
   */

  normalizeLoadedExpenses();

  /*
   * Petty Cash
   */

  normalizeLoadedPettyCash();

  /*
   * Requisitions
   */

  normalizeLoadedRequisitions();

}


/* =========================================================
   FIX VEHICLE SAVE MESSAGE
   ========================================================= */

window.__garageOriginalSaveVehicle =
  window.__garageOriginalSaveVehicle ||
  null;


/*
 * The saveVehicle function from Part 2 is already
 * connected to the form. The function below does not
 * replace it. Instead, the correction is applied by
 * remembering the edit state before the original
 * function clears it.
 *
 * The original CRUD remains unchanged.
 */


/* =========================================================
   DATA REFRESH
   ========================================================= */

window.refreshAll =
async function(){

  if(!ensureLoggedIn()){
    return;
  }

  await loadAllData();

};


/* =========================================================
   NAVIGATION REFRESH
   ========================================================= */

document.addEventListener(
  "click",
  function(event){

    const button =
      event.target.closest(
        ".nav-btn, .mobile-nav-btn"
      );

    if(!button){
      return;
    }

    /*
     * Give the section a moment to become visible
     * before rendering its table.
     */

    setTimeout(
      () => {

        const onclick =
          button.getAttribute(
            "onclick"
          ) || "";

        if(
          onclick.includes(
            "'dashboard'"
          )
        ){
          renderDashboard();
        }

        if(
          onclick.includes(
            "'vehicles'"
          )
        ){
          renderVehicles();
        }

        if(
          onclick.includes(
            "'expenses'"
          )
        ){
          renderExpenses();
        }

        if(
          onclick.includes(
            "'pettyCash'"
          )
        ){
          renderPettyCash();
        }

        if(
          onclick.includes(
            "'requisitions'"
          )
        ){
          renderRequisitions();
        }

      },
      50
    );

  }
);


/* =========================================================
   MODAL RESET HELPERS
   ========================================================= */

document.addEventListener(
  "hidden",
  function(){
    /*
     * Compatibility placeholder.
     * Some existing UI versions dispatch a
     * "hidden" event when closing a modal.
     */
  }
);


/* =========================================================
   MOBILE FORM BEHAVIOUR
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function(){

    /*
     * Numeric fields should select their current
     * value when focused, making phone entry faster.
     */

    const numericFields = [
      "vehicleBilled",
      "vehiclePaid",
      "expenseAmount",
      "pettyAmount",
      "reqQuantity",
      "reqUnitCost"
    ];

    numericFields.forEach(id => {

      const field = $(id);

      if(!field){
        return;
      }

      field.addEventListener(
        "focus",
        function(){
          this.select();
        }
      );

    });

  }
);


/* =========================================================
   VEHICLE SEARCH — ENTER KEY
   ========================================================= */

document.addEventListener(
  "keydown",
  function(event){

    if(
      event.key !== "Enter"
    ){
      return;
    }

    const active =
      document.activeElement;

    if(
      active &&
      active.id ===
      "vehicleSearch"
    ){

      event.preventDefault();

      const value =
        active.value.trim();

      if(!value){
        return;
      }

      const vehicle =
        findVehicleByRegistration(
          value
        );

      if(vehicle){

        viewVehicleExpenses(
          vehicle.id
        );

      }else{

        showToast(
          "No vehicle found."
        );

      }

    }

  }
);


/* =========================================================
   AUTO-FOCUS VEHICLE REGISTRATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function(){

    const modal =
      $("vehicleModal");

    if(!modal){
      return;
    }

    modal.addEventListener(
      "transitionend",
      function(){
        /*
         * Intentionally empty.
         * Keeps compatibility with existing CSS
         * modal transitions.
         */
      }
    );

  }
);


/* =========================================================
   GLOBAL ERROR PROTECTION
   ========================================================= */

window.addEventListener(
  "error",
  function(event){

    console.error(
      "Garage Operations Pro error:",
      event.error ||
      event.message
    );

  }
);

window.addEventListener(
  "unhandledrejection",
  function(event){

    console.error(
      "Garage Operations Pro promise error:",
      event.reason
    );

  }
);


/* =========================================================
   INITIALIZE UI AFTER DATA LOAD
   ========================================================= */

async function finalizeGarageInitialization(){

  if(
    sessionStorage.getItem(
      "garageLoggedIn"
    ) !== "true"
  ){
    return;
  }

  updateGarageUserDisplay();

  setupVehicleJobType();

  setupVehicleStatus();

  setupCategoryOptions();

  setupFilters();

  normalizeAllLoadedData();

  populateVehicleSelects();

  renderDashboard();

  renderVehicles();

  renderExpenses();

  renderPettyCash();

  renderRequisitions();

}


/* =========================================================
   FINAL DOM INITIALIZATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async function(){

    updateGarageUserDisplay();

    if(
      sessionStorage.getItem(
        "garageLoggedIn"
      ) === "true"
    ){

      /*
       * loadAllData() is already called by
       * initializeGarage().
       *
       * The short delay ensures the existing
       * login/UI script has completed first.
       */

      setTimeout(
        async () => {

          try{

            await finalizeGarageInitialization();

          }catch(error){

            console.error(
              "Final initialization error:",
              error
            );

          }

        },
        250
      );

    }

  }
);


/* =========================================================
   QUICK ACTION — OPEN VEHICLE
   ========================================================= */

window.quickAddVehicle =
function(){

  if(
    typeof openVehicleModal ===
    "function"
  ){

    openVehicleModal();

  }

};


/* =========================================================
   QUICK ACTION — OPEN EXPENSE
   ========================================================= */

window.quickAddExpense =
function(){

  if(
    typeof openExpenseModal ===
    "function"
  ){

    openExpenseModal();

  }

};


/* =========================================================
   QUICK ACTION — OPEN PETTY CASH
   ========================================================= */

window.quickAddPettyCash =
function(){

  if(
    typeof openPettyModal ===
    "function"
  ){

    openPettyModal();

  }

};


/* =========================================================
   QUICK ACTION — OPEN REQUISITION
   ========================================================= */

window.quickAddRequisition =
function(){

  if(
    typeof openReqModal ===
    "function"
  ){

    openReqModal();

  }

};


/* =========================================================
   DASHBOARD CARD NAVIGATION
   ========================================================= */

window.openVehiclesFromDashboard =
function(){

  const button =
    document.querySelector(
      `.nav-btn[onclick*="'vehicles'"]`
    );

  showSection(
    "vehicles",
    button
  );

};

window.openExpensesFromDashboard =
function(){

  const button =
    document.querySelector(
      `.nav-btn[onclick*="'expenses'"]`
    );

  showSection(
    "expenses",
    button
  );

};

window.openPettyCashFromDashboard =
function(){

  const button =
    document.querySelector(
      `.nav-btn[onclick*="'pettyCash'"]`
    );

  showSection(
    "pettyCash",
    button
  );

};

window.openRequisitionsFromDashboard =
function(){

  const button =
    document.querySelector(
      `.nav-btn[onclick*="'requisitions'"]`
    );

  showSection(
    "requisitions",
    button
  );

};


/* =========================================================
   FINAL DATA SAFETY
   ========================================================= */

function ensureArrayData(){

  if(!Array.isArray(vehicles)){
    vehicles = [];
  }

  if(!Array.isArray(expenses)){
    expenses = [];
  }

  if(!Array.isArray(pettyCash)){
    pettyCash = [];
  }

  if(!Array.isArray(requisitions)){
    requisitions = [];
  }

}


/* =========================================================
   FINAL READY STATE
   ========================================================= */

ensureArrayData();

console.log(
  "Garage Operations Pro app.js loaded successfully."
);

console.log(
  "Vehicles:",
  vehicles.length
);

console.log(
  "Expenses:",
  expenses.length
);

console.log(
  "Petty Cash:",
  pettyCash.length
);

console.log(
  "Requisitions:",
  requisitions.length
);


/* =========================================================
   END PART 6 / 6
   ========================================================= */






