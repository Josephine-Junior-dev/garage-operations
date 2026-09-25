<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="theme-color" content="#07111f">
<title>Garage Operations Pro</title>

<style>
:root{
--bg:#f5f7fb;
--card:#fff;
--navy:#07111f;
--navy2:#0d1b2e;
--blue:#2563eb;
--blue2:#3b82f6;
--cyan:#06b6d4;
--green:#16a34a;
--orange:#f59e0b;
--red:#dc2626;
--purple:#7c3aed;
--text:#0f172a;
--muted:#64748b;
--border:#e5e7eb;
--soft:#f8fafc;
--shadow:0 8px 28px rgba(15,23,42,.06);
--shadow2:0 20px 60px rgba(15,23,42,.15);
--radius:18px;
}

*{box-sizing:border-box;margin:0;padding:0}

html,body{
width:100%;
min-height:100%;
font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
background:var(--bg);
color:var(--text);
}

body{overflow-x:hidden}

button,input,select,textarea{font:inherit}
button{cursor:pointer}
.hidden{display:none!important}

/* LOGIN */

#loginPage{
min-height:100vh;
min-height:100dvh;
display:flex;
align-items:center;
justify-content:center;
padding:20px;
position:relative;
overflow:hidden;
background:
linear-gradient(135deg,rgba(3,10,20,.96),rgba(7,17,31,.78)),
url("https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1800&q=85")
center/cover no-repeat;
}

.login-glow{
position:absolute;
width:420px;height:420px;border-radius:50%;
background:rgba(37,99,235,.22);
filter:blur(100px);
top:-150px;right:-100px;
}

.login-glow2{
position:absolute;
width:350px;height:350px;border-radius:50%;
background:rgba(6,182,212,.12);
filter:blur(100px);
bottom:-150px;left:-100px;
}

.login-card{
width:100%;
max-width:430px;
position:relative;
z-index:2;
padding:34px 28px 28px;
background:rgba(255,255,255,.97);
border:1px solid rgba(255,255,255,.6);
border-radius:28px;
box-shadow:0 30px 100px rgba(0,0,0,.38);
backdrop-filter:blur(20px);
}

.brand-mark{
width:68px;height:68px;
border-radius:20px;
margin:0 auto 20px;
display:flex;
align-items:center;
justify-content:center;
background:linear-gradient(135deg,#2563eb,#06b6d4);
color:white;
font-size:28px;
font-weight:900;
box-shadow:0 15px 35px rgba(37,99,235,.32);
}

.login-card h1{
text-align:center;
font-size:27px;
letter-spacing:-.8px;
margin-bottom:7px;
}

.login-subtitle{
text-align:center;
color:var(--muted);
font-size:14px;
margin-bottom:30px;
}

.login-label{
display:block;
font-size:13px;
font-weight:700;
margin-bottom:8px;
color:#334155;
}

.login-input{
width:100%;
height:52px;
border:1px solid var(--border);
border-radius:13px;
padding:0 15px;
outline:none;
background:#f8fafc;
margin-bottom:17px;
transition:.2s;
}

.login-input:focus{
background:white;
border-color:var(--blue);
box-shadow:0 0 0 4px rgba(37,99,235,.1);
}

.login-button{
width:100%;
height:53px;
border:0;
border-radius:14px;
color:white;
font-weight:800;
font-size:15px;
background:linear-gradient(135deg,#2563eb,#1d4ed8);
box-shadow:0 12px 25px rgba(37,99,235,.25);
}

.login-error{
color:#dc2626;
font-size:13px;
text-align:center;
margin-top:13px;
min-height:18px;
}

.login-footer{
text-align:center;
color:#94a3b8;
font-size:11px;
margin-top:25px;
}

/* APP */

#app{display:none;min-height:100vh}

.app-layout{min-height:100vh;display:flex}

/* SIDEBAR */

.sidebar{
width:250px;
flex-shrink:0;
background:linear-gradient(180deg,#07111f,#0a1728);
color:white;
padding:22px 15px;
display:flex;
flex-direction:column;
position:fixed;
left:0;top:0;bottom:0;
z-index:50;
}

.sidebar-brand{
padding:8px 10px 26px;
display:flex;
align-items:center;
gap:12px;
}

.sidebar-logo{
width:42px;height:42px;
border-radius:13px;
display:flex;
align-items:center;
justify-content:center;
background:linear-gradient(135deg,#2563eb,#06b6d4);
font-weight:900;
box-shadow:0 8px 20px rgba(37,99,235,.25);
}

.sidebar-brand strong{display:block;font-size:14px}
.sidebar-brand span{
display:block;
color:#94a3b8;
font-size:10px;
margin-top:2px;
}

.nav-title{
color:#64748b;
font-size:10px;
text-transform:uppercase;
letter-spacing:1.2px;
font-weight:800;
padding:10px 12px;
}

.sidebar nav{display:flex;flex-direction:column;gap:5px}

.nav-btn{
width:100%;
border:0;
background:transparent;
color:#94a3b8;
text-align:left;
padding:12px 13px;
border-radius:12px;
font-size:13px;
font-weight:650;
display:flex;
align-items:center;
gap:11px;
transition:.2s;
}

.nav-btn:hover{background:rgba(255,255,255,.06);color:white}

.nav-btn.active{
background:linear-gradient(90deg,rgba(37,99,235,.28),rgba(37,99,235,.08));
color:white;
box-shadow:inset 3px 0 0 #3b82f6;
}

.nav-icon{width:22px;text-align:center;font-size:16px}

.sidebar-bottom{
margin-top:auto;
padding:15px 8px 5px;
border-top:1px solid rgba(255,255,255,.07);
}

.user-mini{display:flex;align-items:center;gap:10px}

.user-avatar{
width:34px;height:34px;border-radius:50%;
background:linear-gradient(135deg,#2563eb,#06b6d4);
display:flex;align-items:center;justify-content:center;
font-weight:800;font-size:13px;
}

.user-mini strong{font-size:12px;display:block}
.user-mini span{font-size:10px;color:#64748b}

/* MAIN */

.main{
margin-left:250px;
width:calc(100% - 250px);
min-height:100vh;
}

.topbar{
height:70px;
background:rgba(255,255,255,.94);
border-bottom:1px solid var(--border);
display:flex;
align-items:center;
justify-content:space-between;
padding:0 28px;
position:sticky;
top:0;
z-index:40;
backdrop-filter:blur(14px);
}

.topbar-title strong{font-size:16px}
.topbar-title span{
display:block;color:var(--muted);
font-size:11px;margin-top:2px;
}

.topbar-right{display:flex;align-items:center;gap:12px}

.online-status{
display:flex;align-items:center;gap:7px;
color:#64748b;font-size:11px;
}

.online-dot{
width:7px;height:7px;background:#22c55e;border-radius:50%;
box-shadow:0 0 0 4px rgba(34,197,94,.1);
}

.content{
padding:28px;
max-width:1600px;
margin:auto;
}

/* PAGE */

.page-header{
display:flex;
justify-content:space-between;
align-items:flex-end;
gap:20px;
margin-bottom:25px;
}

.page-header h2{
font-size:27px;
letter-spacing:-.9px;
}

.page-header p{
color:var(--muted);
font-size:13px;
margin-top:5px;
}

.header-actions{display:flex;gap:8px;flex-wrap:wrap}

/* BUTTONS */

.btn{
min-height:40px;
padding:0 14px;
border:1px solid var(--border);
border-radius:10px;
background:white;
color:#334155;
font-weight:700;
font-size:12px;
display:inline-flex;
align-items:center;
justify-content:center;
gap:7px;
transition:.2s;
}

.btn:hover{transform:translateY(-1px);border-color:#cbd5e1}

.btn-primary{
color:white;
border-color:#2563eb;
background:linear-gradient(135deg,#2563eb,#1d4ed8);
box-shadow:0 7px 18px rgba(37,99,235,.18);
}

.btn-danger{color:#dc2626}

/* DASHBOARD */

.dashboard-welcome{margin-bottom:25px}

.dashboard-welcome h1{
font-size:29px;
letter-spacing:-1.1px;
}

.dashboard-welcome p{
color:var(--muted);
font-size:13px;
margin-top:5px;
}

.kpi-grid{
display:grid;
grid-template-columns:repeat(4,1fr);
gap:15px;
margin-bottom:20px;
}

.kpi-card{
background:white;
border:1px solid var(--border);
border-radius:18px;
padding:19px;
box-shadow:var(--shadow);
position:relative;
overflow:hidden;
}

.kpi-card::after{
content:"";
position:absolute;
width:75px;height:75px;
border-radius:50%;
right:-30px;top:-30px;
background:rgba(37,99,235,.06);
}

.kpi-top{
display:flex;
align-items:center;
justify-content:space-between;
}

.kpi-label{
color:var(--muted);
font-size:11px;
font-weight:700;
text-transform:uppercase;
letter-spacing:.5px;
}

.kpi-icon{
width:34px;height:34px;
border-radius:10px;
display:flex;
align-items:center;
justify-content:center;
background:#eff6ff;
color:#2563eb;
font-size:15px;
}

.kpi-value{
margin-top:15px;
font-size:27px;
letter-spacing:-.8px;
font-weight:800;
}

.kpi-meta{
color:#94a3b8;
font-size:10px;
margin-top:5px;
}

/* CARDS */

.section-card{
background:white;
border:1px solid var(--border);
border-radius:18px;
box-shadow:var(--shadow);
overflow:hidden;
}

.section-card-header{
padding:18px 20px;
display:flex;
justify-content:space-between;
align-items:center;
border-bottom:1px solid var(--border);
}

.section-card-header h3{font-size:14px}
.section-card-header span{font-size:11px;color:var(--muted)}

.financial-grid{
display:grid;
grid-template-columns:repeat(4,1fr);
}

.financial-item{
padding:20px;
border-right:1px solid var(--border);
}

.financial-item:last-child{border-right:0}

.financial-item label{
display:block;
color:var(--muted);
font-size:11px;
margin-bottom:8px;
}

.financial-item strong{font-size:19px}

.dashboard-columns{
display:grid;
grid-template-columns:1.35fr .65fr;
gap:18px;
margin-top:18px;
}

.activity-list{padding:5px 20px 10px}

.activity-item{
display:flex;
align-items:center;
gap:12px;
padding:14px 0;
border-bottom:1px solid #f1f5f9;
}

.activity-item:last-child{border-bottom:0}

.activity-icon{
width:38px;height:38px;
border-radius:11px;
background:#f1f5f9;
display:flex;
align-items:center;
justify-content:center;
}

.activity-main{flex:1}
.activity-main strong{display:block;font-size:12px}
.activity-main span{
display:block;
font-size:10px;
color:var(--muted);
margin-top:3px;
}

.status{
display:inline-flex;
padding:5px 9px;
border-radius:999px;
font-size:10px;
font-weight:800;
}

.status-under-repair{color:#92400e;background:#fef3c7}
.status-completed{color:#166534;background:#dcfce7}
.status-pending{color:#92400e;background:#fef3c7}
.status-approved{color:#1d4ed8;background:#dbeafe}
.status-purchased{color:#166534;background:#dcfce7}
.status-rejected{color:#991b1b;background:#fee2e2}
.status-default{color:#475569;background:#f1f5f9}

/* QUICK ACTIONS */

.quick-actions{
padding:18px;
display:grid;
grid-template-columns:repeat(2,1fr);
gap:9px;
}

.quick-action{
min-height:60px;
border:1px solid var(--border);
border-radius:12px;
background:#fafafa;
display:flex;
align-items:center;
gap:10px;
padding:11px;
text-align:left;
transition:.2s;
}

.quick-action:hover{
background:#f8fafc;
border-color:#cbd5e1;
transform:translateY(-1px);
}

.quick-action-icon{
width:32px;height:32px;border-radius:9px;
background:#eff6ff;color:#2563eb;
display:flex;align-items:center;justify-content:center;
}

.quick-action strong{font-size:11px;display:block}
.quick-action span{
font-size:9px;color:var(--muted);display:block;margin-top:2px;
}

/* TOOLBAR */

.toolbar{
background:white;
border:1px solid var(--border);
border-radius:15px;
padding:12px;
display:flex;
gap:9px;
flex-wrap:wrap;
margin-bottom:15px;
box-shadow:var(--shadow);
}

.search-box{flex:1;min-width:190px}

.search-box input,
.filter-select{
width:100%;
height:40px;
border:1px solid var(--border);
border-radius:10px;
background:#f8fafc;
padding:0 12px;
outline:none;
font-size:12px;
}

.search-box input:focus,
.filter-select:focus{
border-color:var(--blue);
background:white;
}

/* TABLE */

.table-card{
background:white;
border:1px solid var(--border);
border-radius:18px;
overflow:auto;
box-shadow:var(--shadow);
}

table{
width:100%;
border-collapse:collapse;
min-width:850px;
}

thead{background:#f8fafc}

th{
text-align:left;
padding:13px 15px;
font-size:10px;
color:#64748b;
text-transform:uppercase;
letter-spacing:.5px;
white-space:nowrap;
}

td{
padding:14px 15px;
border-top:1px solid #f1f5f9;
font-size:12px;
color:#334155;
white-space:nowrap;
}

tbody tr:hover{background:#fafcff}

.table-actions{display:flex;gap:5px}

.action-btn{
width:30px;height:30px;
border:1px solid var(--border);
border-radius:8px;
background:white;
display:flex;
align-items:center;
justify-content:center;
font-size:12px;
}

/* MODALS */

.modal{
position:fixed;
inset:0;
background:rgba(2,8,23,.58);
display:none;
align-items:center;
justify-content:center;
padding:18px;
z-index:100;
backdrop-filter:blur(7px);
}

.modal.show{display:flex}

.modal-content{
width:100%;
max-width:650px;
max-height:92vh;
overflow:auto;
background:white;
border-radius:22px;
box-shadow:var(--shadow2);
}

.modal-header{
padding:19px 21px;
border-bottom:1px solid var(--border);
display:flex;
justify-content:space-between;
align-items:center;
}

.modal-header h3{font-size:16px}

.modal-close{
border:0;
background:#f1f5f9;
width:32px;height:32px;
border-radius:9px;
}

.modal-body{padding:21px}

.modal-footer{
padding:16px 21px;
border-top:1px solid var(--border);
display:flex;
justify-content:flex-end;
gap:8px;
}

.form-grid{
display:grid;
grid-template-columns:repeat(2,1fr);
gap:14px;
}

.form-group{
display:flex;
flex-direction:column;
gap:6px;
}

.form-group.full{grid-column:1/-1}

.form-group label{
font-size:11px;
font-weight:750;
color:#475569;
}

.form-group input,
.form-group select,
.form-group textarea{
width:100%;
border:1px solid var(--border);
border-radius:10px;
min-height:42px;
padding:9px 11px;
background:#f8fafc;
outline:none;
font-size:12px;
}

.form-group textarea{
min-height:90px;
resize:vertical;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus{
border-color:var(--blue);
background:white;
box-shadow:0 0 0 3px rgba(37,99,235,.08);
}

/* TOAST */

#toast{
position:fixed;
right:20px;
bottom:20px;
z-index:200;
background:#07111f;
color:white;
padding:12px 16px;
border-radius:11px;
font-size:12px;
box-shadow:var(--shadow2);
display:none;
}

/* MOBILE NAV */

.mobile-bottom-nav{display:none}

@media(max-width:1000px){

.sidebar{width:215px}

.main{
margin-left:215px;
width:calc(100% - 215px);
}

.kpi-grid{grid-template-columns:repeat(2,1fr)}

.dashboard-columns{grid-template-columns:1fr}

.financial-grid{grid-template-columns:repeat(2,1fr)}

.financial-item:nth-child(2){border-right:0}

.financial-item:nth-child(-n+2){
border-bottom:1px solid var(--border);
}
}

@media(max-width:720px){

body{padding-bottom:70px}

.sidebar{display:none}

.main{
width:100%;
margin-left:0;
}

.topbar{
height:62px;
padding:0 16px;
}

.topbar-title strong{font-size:14px}
.topbar-title span{font-size:9px}
.online-status{display:none}

.content{padding:18px 14px 25px}

.page-header{
align-items:flex-start;
flex-direction:column;
margin-bottom:18px;
}

.page-header h2{font-size:23px}

.header-actions{width:100%}

.header-actions .btn{flex:1}

.dashboard-welcome h1{font-size:24px}

.kpi-grid{
grid-template-columns:repeat(2,1fr);
gap:10px;
}

.kpi-card{
padding:14px;
border-radius:15px;
}

.kpi-value{font-size:22px}

.kpi-icon{
width:29px;height:29px;font-size:13px;
}

.financial-grid{grid-template-columns:1fr 1fr}

.financial-item{padding:15px}

.financial-item strong{font-size:15px}

.quick-actions{padding:14px}

.toolbar{padding:9px}

.search-box{min-width:100%}

.table-card{border-radius:14px}

.form-grid{grid-template-columns:1fr}

.form-group.full{grid-column:auto}

.modal{
align-items:flex-end;
padding:0;
}

.modal-content{
max-height:92vh;
border-radius:22px 22px 0 0;
}

.mobile-bottom-nav{
display:flex;
position:fixed;
bottom:0;
left:0;
right:0;
height:66px;
background:rgba(255,255,255,.96);
border-top:1px solid var(--border);
z-index:80;
backdrop-filter:blur(16px);
padding:5px;
}

.mobile-nav-btn{
flex:1;
border:0;
background:transparent;
color:#94a3b8;
border-radius:10px;
font-size:9px;
font-weight:700;
display:flex;
flex-direction:column;
align-items:center;
justify-content:center;
gap:3px;
}

.mobile-nav-btn span:first-child{font-size:17px}

.mobile-nav-btn.active{
color:#2563eb;
background:#eff6ff;
}
}

@media(max-width:380px){

.content{padding:15px 10px 20px}

.kpi-grid{gap:8px}

.kpi-card{padding:12px}

.kpi-label{font-size:9px}

.kpi-value{font-size:19px}

.financial-item strong{font-size:14px}
}
</style>
</head>

<body>

<!-- LOGIN -->

<div id="loginPage">

<div class="login-glow"></div>
<div class="login-glow2"></div>

<div class="login-card">

<div class="brand-mark">🚘</div>

<h1>Garage Operations Pro</h1>

<div class="login-subtitle">
Vehicle • Finance • Workshop Operations
</div>

<label class="login-label">Username</label>

<input
id="username"
class="login-input"
type="text"
placeholder="Enter username"
autocomplete="username">

<label class="login-label">Password</label>

<input
id="password"
class="login-input"
type="password"
placeholder="Enter password"
autocomplete="current-password">

<button
id="loginBtn"
class="login-button"
onclick="login()">
SIGN IN
</button>

<div id="loginError" class="login-error"></div>

<div class="login-footer">
Garage Operations Pro
<br>
Professional workshop management
</div>

</div>
</div>


<!-- APPLICATION -->

<div id="app">

<div class="app-layout">

<aside class="sidebar">

<div class="sidebar-brand">

<div class="sidebar-logo">🚘</div>

<div>
<strong>Garage Operations</strong>
<span>PRO WORKSPACE</span>
</div>

</div>

<div class="nav-title">Workspace</div>

<nav>

<button class="nav-btn active"
onclick="showSection('dashboard',this)">
<span class="nav-icon">⌂</span>
Dashboard
</button>

<button class="nav-btn"
onclick="showSection('vehicles',this)">
<span class="nav-icon">🚘</span>
Vehicles
</button>

<button class="nav-btn"
onclick="showSection('expenses',this)">
<span class="nav-icon">💳</span>
Expenses
</button>

<button class="nav-btn"
onclick="showSection('pettyCash',this)">
<span class="nav-icon">💰</span>
Petty Cash
</button>

<button class="nav-btn"
onclick="showSection('requisitions',this)">
<span class="nav-icon">📋</span>
Requisitions
</button>

</nav>

<div class="sidebar-bottom">

<div class="user-mini">

<div class="user-avatar">J</div>

<div>
<strong id="sidebarUser">Josephine</strong>
<span>Garage Administrator</span>
</div>

</div>

</div>

</aside>


<main class="main">

<header class="topbar">

<div class="topbar-title">
<strong>Garage Operations Pro</strong>
<span>Workshop management workspace</span>
</div>

<div class="topbar-right">
<div class="online-status">
<span class="online-dot"></span>
System online
</div>
</div>

</header>


<div class="content">

<!-- DASHBOARD -->

<section id="dashboard" class="app-section">

<div class="dashboard-welcome">

<h1>
Good day, <span id="welcomeUser">Josephine</span> 👋
</h1>

<p>
Here's what's happening across your garage today.
</p>

</div>


<div class="kpi-grid">

<div class="kpi-card">

<div class="kpi-top">
<span class="kpi-label">Total Vehicles</span>
<span class="kpi-icon">🚘</span>
</div>

<div id="dashVehicles" class="kpi-value">0</div>

<div class="kpi-meta">Vehicles in system</div>

</div>


<div class="kpi-card">

<div class="kpi-top">
<span class="kpi-label">Under Repair</span>
<span class="kpi-icon">🔧</span>
</div>

<div id="dashRepair" class="kpi-value">0</div>

<div class="kpi-meta">Active workshop jobs</div>

</div>


<div class="kpi-card">

<div class="kpi-top">
<span class="kpi-label">Outstanding</span>
<span class="kpi-icon">₿</span>
</div>

<div id="dashOutstanding" class="kpi-value">KSh 0</div>

<div class="kpi-meta">Awaiting payment</div>

</div>


<div class="kpi-card">

<div class="kpi-top">
<span class="kpi-label">Requisitions</span>
<span class="kpi-icon">📋</span>
</div>

<div id="dashReq" class="kpi-value">0</div>

<div class="kpi-meta">Total requisitions</div>

</div>

</div>


<div class="section-card">

<div class="section-card-header">
<h3>Financial Overview</h3>
<span>Current records</span>
</div>

<div class="financial-grid">

<div class="financial-item">
<label>Total Billed</label>
<strong id="dashBilled">KSh 0</strong>
</div>

<div class="financial-item">
<label>Total Paid</label>
<strong id="dashPaid">KSh 0</strong>
</div>

<div class="financial-item">
<label>Expenses</label>
<strong id="dashExpenses">KSh 0</strong>
</div>

<div class="financial-item">
<label>Petty Cash</label>
<strong id="dashPetty">KSh 0</strong>
</div>

</div>
</div>


<div class="dashboard-columns">

<div class="section-card">

<div class="section-card-header">
<h3>Workshop Activity</h3>
<span>Recent vehicles</span>
</div>

<div id="dashboardActivity" class="activity-list"></div>

</div>


<div class="section-card">

<div class="section-card-header">
<h3>Quick Actions</h3>
<span>Shortcuts</span>
</div>

<div class="quick-actions">

<button class="quick-action"
onclick="openVehicleModal()">

<div class="quick-action-icon">+</div>

<div>
<strong>Add Vehicle</strong>
<span>Register vehicle</span>
</div>

</button>


<button class="quick-action"
onclick="openExpenseModal()">

<div class="quick-action-icon">+</div>

<div>
<strong>Add Expense</strong>
<span>Record expense</span>
</div>

</button>


<button class="quick-action"
onclick="openPettyModal()">

<div class="quick-action-icon">+</div>

<div>
<strong>Petty Cash</strong>
<span>Add transaction</span>
</div>

</button>


<button class="quick-action"
onclick="openReqModal()">

<div class="quick-action-icon">+</div>

<div>
<strong>Requisition</strong>
<span>Request materials</span>
</div>

</button>

</div>
</div>

</div>


<div class="section-card" style="margin-top:18px">

<div class="section-card-header">
<h3>Requisition Overview</h3>
<span>Total requested value</span>
</div>

<div class="financial-grid">

<div class="financial-item">
<label>Total Requisitions</label>
<strong id="dashReqCount">0</strong>
</div>

<div class="financial-item">
<label>Total Value</label>
<strong id="dashReqTotal">KSh 0</strong>
</div>

<div class="financial-item">
<label>Workshop Status</label>
<strong>Active</strong>
</div>

<div class="financial-item">
<label>System</label>
<strong style="color:#16a34a">Online</strong>
</div>

</div>
</div>

</section>


<!-- VEHICLES -->

<section id="vehicles" class="app-section" style="display:none">

<div class="page-header">

<div>
<h2>Vehicles</h2>
<p>Manage vehicles and workshop jobs.</p>
</div>

<div class="header-actions">

<button class="btn"
onclick="printVehicles()">
🖨 Print
</button>

<button class="btn btn-primary"
onclick="openVehicleModal()">
+ Add Vehicle
</button>

</div>
</div>


<div class="toolbar">

<div class="search-box">
<input
id="vehicleSearch"
type="search"
placeholder="Search registration or customer...">
</div>

<select id="vehicleStatusFilter"
class="filter-select"
style="max-width:190px">

<option value="">All Statuses</option>
<option value="Under Repair">Under Repair</option>
<option value="Completed">Completed</option>
<option value="Released">Released</option>

</select>

</div>


<div class="table-card">

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
<th>Actions</th>
</tr>

</thead>

<tbody id="vehiclesTableBody"></tbody>

</table>

</div>

</section>


<!-- EXPENSES -->

<section id="expenses" class="app-section" style="display:none">

<div class="page-header">

<div>
<h2>Expenses</h2>
<p>Track workshop expenses and costs.</p>
</div>

<div class="header-actions">

<button class="btn"
onclick="printExpenses()">
🖨 Print
</button>

<button class="btn btn-primary"
onclick="openExpenseModal()">
+ Add Expense
</button>

</div>
</div>


<div class="toolbar">

<div class="search-box">
<input
id="expenseSearch"
type="search"
placeholder="Search expense...">
</div>

<select
id="expenseCategoryFilter"
class="filter-select"
style="max-width:190px">

<option value="">All Categories</option>

</select>

</div>


<div class="table-card">

<table>

<thead>

<tr>
<th>Date</th>
<th>Vehicle</th>
<th>Description</th>
<th>Category</th>
<th>Amount</th>
<th>Actions</th>
</tr>

</thead>

<tbody id="expensesTableBody"></tbody>

</table>

</div>

</section>


<!-- PETTY CASH -->

<section id="pettyCash" class="app-section" style="display:none">

<div class="page-header">

<div>
<h2>Petty Cash</h2>
<p>Monitor small daily workshop transactions.</p>
</div>

<div class="header-actions">

<button class="btn"
onclick="printPettyCash()">
🖨 Print
</button>

<button class="btn btn-primary"
onclick="openPettyModal()">
+ Add Transaction
</button>

</div>
</div>


<div class="toolbar">

<div class="search-box">
<input
id="pettySearch"
type="search"
placeholder="Search transaction...">
</div>

<select
id="pettyCategoryFilter"
class="filter-select"
style="max-width:190px">

<option value="">All Categories</option>

</select>

</div>


<div class="table-card">

<table>

<thead>

<tr>
<th>Date</th>
<th>Description</th>
<th>Paid To</th>
<th>Category</th>
<th>Amount</th>
<th>Notes</th>
<th>Actions</th>
</tr>

</thead>

<tbody id="pettyTableBody"></tbody>

</table>

</div>

</section>


<!-- REQUISITIONS -->

<section id="requisitions" class="app-section" style="display:none">

<div class="page-header">

<div>
<h2>Requisitions</h2>
<p>Manage workshop material and purchase requests.</p>
</div>

<div class="header-actions">

<button class="btn"
onclick="previewSelectedReq()">
👁 Preview
</button>

<button class="btn"
onclick="printRequisitions()">
🖨 Print
</button>

<button class="btn btn-primary"
onclick="openReqModal()">
+ New Requisition
</button>

</div>
</div>


<div class="toolbar">

<div class="search-box">
<input
id="reqSearch"
type="search"
placeholder="Search requisition...">
</div>

<select
id="reqStatusFilter"
class="filter-select"
style="max-width:190px">

<option value="">All Statuses</option>
<option value="Pending">Pending</option>
<option value="Approved">Approved</option>
<option value="Purchased">Purchased</option>
<option value="Completed">Completed</option>
<option value="Rejected">Rejected</option>

</select>

</div>


<div class="section-card" style="margin-bottom:15px">

<div class="section-card-header">

<h3>Requisition Total</h3>

<strong id="reqOverallTotal">
KSh 0
</strong>

</div>

</div>


<div class="table-card">

<table>

<thead>

<tr>
<th>Req No.</th>
<th>Date</th>
<th>Requested By</th>
<th>Vehicle</th>
<th>Item Description</th>
<th>Qty</th>
<th>Unit Cost</th>
<th>Total</th>
<th>Expense Type</th>
<th>Status</th>
<th>Actions</th>
</tr>

</thead>

<tbody id="requisitionsTableBody"></tbody>

</table>

</div>

</section>

</div>
</main>

</div>


<!-- MOBILE NAV -->

<div class="mobile-bottom-nav">

<button class="mobile-nav-btn active"
onclick="showSection('dashboard',this)">
<span>⌂</span>
<span>Home</span>
</button>

<button class="mobile-nav-btn"
onclick="showSection('vehicles',this)">
<span>🚘</span>
<span>Vehicles</span>
</button>

<button class="mobile-nav-btn"
onclick="showSection('expenses',this)">
<span>💳</span>
<span>Expenses</span>
</button>

<button class="mobile-nav-btn"
onclick="showSection('pettyCash',this)">
<span>💰</span>
<span>Cash</span>
</button>

<button class="mobile-nav-btn"
onclick="showSection('requisitions',this)">
<span>📋</span>
<span>Requests</span>
</button>

</div>

</div>


<!-- VEHICLE MODAL -->

<div id="vehicleModal" class="modal">

<div class="modal-content">

<div class="modal-header">
<h3 id="vehicleModalTitle">Add Vehicle</h3>
<button class="modal-close"
onclick="closeModal('vehicleModal')">✕</button>
</div>

<form id="vehicleForm">

<div class="modal-body">

<input id="vehicleId" type="hidden">

<div class="form-grid">

<div class="form-group">
<label>Registration</label>
<input id="vehicleRegistration" required>
</div>

<div class="form-group">
<label>Customer</label>
<input id="vehicleCustomer" required>
</div>

<div class="form-group">
<label>Date In</label>
<input id="vehicleDateIn" type="date" required>
</div>

<div class="form-group">
<label>Date Out</label>
<input id="vehicleDateOut" type="date">
</div>

<div class="form-group">
<label>Job Type</label>
<input id="vehicleJobType" value="Repair">
</div>

<div class="form-group">
<label>Status</label>

<select id="vehicleStatus">
<option value="Under Repair">Under Repair</option>
<option value="Completed">Completed</option>
<option value="Released">Released</option>
</select>

</div>

<div class="form-group">
<label>Released To</label>
<input id="vehicleReleasedTo">
</div>

<div class="form-group">
<label>Released Contact</label>
<input id="vehicleReleasedContact">
</div>

<div class="form-group">
<label>Billed</label>
<input id="vehicleBilled" type="number" step="0.01">
</div>

<div class="form-group">
<label>Paid</label>
<input id="vehiclePaid" type="number" step="0.01">
</div>

<div class="form-group full">
<label>Description</label>
<textarea id="vehicleDescription"></textarea>
</div>

</div>
</div>

<div class="modal-footer">

<button type="button" class="btn"
onclick="closeModal('vehicleModal')">
Cancel
</button>

<button type="submit" class="btn btn-primary">
Save Vehicle
</button>

</div>

</form>
</div>
</div>


<!-- EXPENSE MODAL -->

<div id="expenseModal" class="modal">

<div class="modal-content">

<div class="modal-header">
<h3 id="expenseModalTitle">Add Expense</h3>
<button class="modal-close"
onclick="closeModal('expenseModal')">✕</button>
</div>

<form id="expenseForm">

<div class="modal-body">

<input id="expenseId" type="hidden">

<div class="form-grid">

<div class="form-group">
<label>Vehicle</label>
<select id="expenseVehicle">
<option value="">General Expense</option>
</select>
</div>

<div class="form-group">
<label>Date</label>
<input id="expenseDate" type="date" required>
</div>

<div class="form-group">
<label>Category</label>
<input id="expenseCategory" required>
</div>

<div class="form-group">
<label>Amount</label>
<input id="expenseAmount" type="number" step="0.01" required>
</div>

<div class="form-group full">
<label>Description</label>
<textarea id="expenseDescription" required></textarea>
</div>

</div>
</div>

<div class="modal-footer">

<button type="button" class="btn"
onclick="closeModal('expenseModal')">
Cancel
</button>

<button type="submit" class="btn btn-primary">
Save Expense
</button>

</div>

</form>
</div>
</div>


<!-- PETTY CASH MODAL -->

<div id="pettyModal" class="modal">

<div class="modal-content">

<div class="modal-header">
<h3 id="pettyModalTitle">Add Petty Cash</h3>
<button class="modal-close"
onclick="closeModal('pettyModal')">✕</button>
</div>

<form id="pettyForm">

<div class="modal-body">

<input id="pettyId" type="hidden">

<div class="form-grid">

<div class="form-group">
<label>Date</label>
<input id="pettyDate" type="date" required>
</div>

<div class="form-group">
<label>Paid To</label>
<input id="pettyPaidTo" required>
</div>

<div class="form-group">
<label>Category</label>
<input id="pettyCategory" required>
</div>

<div class="form-group">
<label>Amount</label>
<input id="pettyAmount" type="number" step="0.01" required>
</div>

<div class="form-group full">
<label>Description</label>
<textarea id="pettyDescription" required></textarea>
</div>

<div class="form-group full">
<label>Notes</label>
<textarea id="pettyNotes"></textarea>
</div>

</div>
</div>

<div class="modal-footer">

<button type="button" class="btn"
onclick="closeModal('pettyModal')">
Cancel
</button>

<button type="submit" class="btn btn-primary">
Save Transaction
</button>

</div>

</form>
</div>
</div>


<!-- REQUISITION MODAL -->

<div id="reqModal" class="modal">

<div class="modal-content">

<div class="modal-header">
<h3 id="reqModalTitle">New Requisition</h3>
<button class="modal-close"
onclick="closeModal('reqModal')">✕</button>
</div>

<form id="reqForm">

<div class="modal-body">

<input id="reqId" type="hidden">

<div class="form-grid">

<div class="form-group">
<label>Requisition No.</label>
<input id="reqNo" required>
</div>

<div class="form-group">
<label>Date</label>
<input id="reqDate" type="date" required>
</div>

<div class="form-group">
<label>Requested By</label>
<input id="reqRequestedBy" required>
</div>

<div class="form-group">
<label>Vehicle</label>
<select id="reqVehicle">
<option value="">Select Vehicle</option>
</select>
</div>

<div class="form-group full">
<label>Item Description</label>
<textarea id="reqItemDescription" required></textarea>
</div>

<div class="form-group">
<label>Quantity</label>
<input id="reqQuantity" type="number" min="0" step="0.01" required>
</div>

<div class="form-group">
<label>Unit Cost</label>
<input id="reqUnitCost" type="number" min="0" step="0.01" required>
</div>

<div class="form-group">
<label>Total Amount</label>
<input id="reqTotal" type="number" readonly>
</div>

<div class="form-group">
<label>Status</label>
<select id="reqStatus">
<option value="Pending">Pending</option>
<option value="Approved">Approved</option>
<option value="Purchased">Purchased</option>
<option value="Completed">Completed</option>
<option value="Rejected">Rejected</option>
</select>
</div>

<div class="form-group">
<label>Category</label>
<input id="reqCategory">
</div>

<div class="form-group">
<label>Expense Type</label>
<input id="reqExpenseType">
</div>

<div class="form-group full">
<label>Notes</label>
<textarea id="reqNotes"></textarea>
</div>

</div>
</div>

<div class="modal-footer">

<button type="button" class="btn"
onclick="closeModal('reqModal')">
Cancel
</button>

<button type="submit" class="btn btn-primary">
Save Requisition
</button>

</div>

</form>
</div>
</div>


<!-- REQUISITION PREVIEW -->

<div id="reqPreviewModal" class="modal">

<div class="modal-content">

<div class="modal-header">
<h3>Requisition Preview</h3>
<button class="modal-close"
onclick="closeModal('reqPreviewModal')">✕</button>
</div>

<div id="reqPreviewContent" class="modal-body"></div>

<div class="modal-footer">

<button class="btn"
onclick="closeModal('reqPreviewModal')">
Close
</button>

<button class="btn btn-primary"
onclick="printSelectedReq()">
🖨 Print
</button>

</div>

</div>
</div>


<!-- VEHICLE EXPENSE PREVIEW -->

<div id="vehicleExpensePreviewModal" class="modal">

<div class="modal-content">

<div class="modal-header">
<h3>Vehicle Expense Summary</h3>
<button class="modal-close"
onclick="closeModal('vehicleExpensePreviewModal')">✕</button>
</div>

<div id="vehicleExpensePreviewContent" class="modal-body"></div>

<div class="modal-footer">

<button class="btn"
onclick="closeModal('vehicleExpensePreviewModal')">
Close
</button>

<button class="btn btn-primary"
onclick="printVehicleExpensePreview()">
🖨 Print
</button>

</div>

</div>
</div>


<div id="toast"></div>


<script>
/* LOGIN — SAME CURRENT LOGIC */

function login(){

const username=document.getElementById("username").value.trim().toLowerCase();
const password=document.getElementById("password").value;
const error=document.getElementById("loginError");

const users={
josephine:"1234",
boss:"1234",
staff:"1234"
};

if(users[username] && users[username]===password){

sessionStorage.setItem("garageLoggedIn","true");
sessionStorage.setItem("garageUser",username);

error.textContent="";

document.getElementById("loginPage").style.display="none";
document.getElementById("app").style.display="block";

updateUserDisplay(username);

}else{

error.textContent="Invalid username or password.";

}
}

function updateUserDisplay(username){

const displayName=
username.charAt(0).toUpperCase()+username.slice(1);

const welcome=document.getElementById("welcomeUser");
const sidebar=document.getElementById("sidebarUser");

if(welcome)welcome.textContent=displayName;
if(sidebar)sidebar.textContent=displayName;
}

function checkLogin(){

const loggedIn=sessionStorage.getItem("garageLoggedIn");
const username=sessionStorage.getItem("garageUser");

if(loggedIn==="true"){

document.getElementById("loginPage").style.display="none";
document.getElementById("app").style.display="block";

updateUserDisplay(username||"josephine");

}
}

document.addEventListener("DOMContentLoaded",checkLogin);

document.getElementById("password")?.addEventListener("keydown",e=>{
if(e.key==="Enter")login();
});
</script>


<script type="module" src="app.js"></script>

</body>
</html>
