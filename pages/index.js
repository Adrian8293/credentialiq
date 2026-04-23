import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import {
  loadAll, upsertProvider, deleteProvider,
  upsertPayer, deletePayer,
  upsertEnrollment, deleteEnrollment,
  upsertDocument, deleteDocument,
  upsertTask, deleteTask, markTaskDone,
  fetchAuditLog, clearAuditLog as clearAuditLogDB,
  saveSettings as saveSettingsDB,
  subscribeToAll, addAudit,
} from '../lib/db'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STAGES = ['Not Started','Application Submitted','Awaiting CAQH','Pending Verification','Additional Info Requested','Under Review','Approved – Awaiting Contract','Contracted – Pending Effective Date','Active','Denied']
const STAGE_COLOR = { 'Active':'b-green','Denied':'b-red','Not Started':'b-gray','Application Submitted':'b-blue','Awaiting CAQH':'b-amber','Pending Verification':'b-amber','Additional Info Requested':'b-red','Under Review':'b-blue','Approved – Awaiting Contract':'b-teal','Contracted – Pending Effective Date':'b-teal' }
const SPEC_COLORS = { 'Mental Health':'#3563c9','Massage Therapy':'#1a8a7a','Naturopathic':'#6d3fb5','Chiropractic':'#c97d1e','Acupuncture':'#b8292e' }
const PRIORITY_COLOR = { 'Urgent':'b-red','High':'b-amber','Medium':'b-blue','Low':'b-gray' }
const STATUS_COLOR = { 'Open':'b-red','In Progress':'b-blue','Waiting':'b-amber','Done':'b-green' }
const BADGE_CLASS = { 'b-green':'badge b-green','b-red':'badge b-red','b-amber':'badge b-amber','b-blue':'badge b-blue','b-teal':'badge b-teal','b-gray':'badge b-gray','b-purple':'badge b-purple','b-gold':'badge b-gold' }

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function daysUntil(d) { if(!d) return null; return Math.ceil((new Date(d) - new Date()) / 86400000) }
function fmtDate(d) { if(!d) return '—'; const [y,m,day]=d.split('-'); return `${m}/${day}/${y}` }
function fmtTS(ts) { const d=new Date(ts); return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+' '+d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) }
function initials(p) { return ((p.fname||'')[0]||'')+((p.lname||'')[0]||'') }
function pName(providers, id) { const p=providers.find(x=>x.id===id); return p?`${p.fname} ${p.lname}${p.cred?', '+p.cred:''}`:'—' }
function pNameShort(providers, id) { const p=providers.find(x=>x.id===id); return p?`${p.fname} ${p.lname}`:'—' }
function payName(payers, id) { const p=payers.find(x=>x.id===id); return p?p.name:'—' }

// ─── SAMPLE DATA ──────────────────────────────────────────────────────────────
const d = n => { const x=new Date(); x.setDate(x.getDate()+n); return x.toISOString().split('T')[0] }
const p = n => { const x=new Date(); x.setDate(x.getDate()-n); return x.toISOString().split('T')[0] }

const SAMPLE_PROVIDERS = [
  { fname:'Sarah', lname:'Chen', cred:'LCSW', spec:'Mental Health', status:'Active', email:'schen@pis.com', phone:'(503)555-0101', focus:'Trauma, PTSD, EMDR, Anxiety', npi:'1234567890', caqh:'12345678', caqhAttest:p(120), caqhDue:d(45), medicaid:'OR1000001', ptan:'', license:'C12345', licenseExp:d(280), malCarrier:'HPSO', malPolicy:'HP-001', malExp:d(180), dea:'', deaExp:'', recred:d(310), supervisor:'', supExp:'', notes:'Bilingual Spanish/English.' },
  { fname:'Marcus', lname:'Rivera', cred:'LPC', spec:'Mental Health', status:'Active', email:'mrivera@pis.com', phone:'(503)555-0102', focus:'Adolescents, Substance Use, CBT', npi:'2345678901', caqh:'23456789', caqhAttest:p(20), caqhDue:d(10), medicaid:'OR1000002', ptan:'', license:'C23456', licenseExp:d(60), malCarrier:'CPH&A', malPolicy:'CP-002', malExp:d(20), dea:'', deaExp:'', recred:d(370), supervisor:'', supExp:'', notes:'' },
  { fname:'Priya', lname:'Nair', cred:'Naturopathic Physician', spec:'Naturopathic', status:'Active', email:'pnair@pis.com', phone:'(503)555-0103', focus:'Integrative Medicine, Hormone Health, BioCharger', npi:'3456789012', caqh:'34567890', caqhAttest:p(90), caqhDue:d(90), medicaid:'', ptan:'', license:'ND45678', licenseExp:d(365), malCarrier:'HPSO', malPolicy:'HP-003', malExp:d(300), dea:'AB1234567', deaExp:d(400), recred:d(730), supervisor:'', supExp:'', notes:'BioCharger certified.' },
  { fname:'Elena', lname:'Vasquez', cred:'Licensed Psychologist', spec:'Mental Health', status:'Active', email:'evasquez@pis.com', phone:'(503)555-0105', focus:'Neuropsychology, Assessment, Testing', npi:'5678901234', caqh:'56789012', caqhAttest:p(200), caqhDue:d(5), medicaid:'OR1000003', ptan:'PT12345', license:'PSY67890', licenseExp:d(18), malCarrier:'APA Insurance', malPolicy:'APA-005', malExp:d(-5), dea:'', deaExp:'', recred:d(30), supervisor:'', supExp:'', notes:'EPPP certified.' },
  { fname:'David', lname:'Park', cred:'Chiropractor', spec:'Chiropractic', status:'Active', email:'dpark@pis.com', phone:'(503)555-0106', focus:'Sports Injury, Spinal Manipulation, Rehab', npi:'6789012345', caqh:'67890123', caqhAttest:p(30), caqhDue:d(150), medicaid:'', ptan:'', license:'DC89012', licenseExp:d(410), malCarrier:'HPSO', malPolicy:'HP-006', malExp:d(390), dea:'', deaExp:'', recred:d(800), supervisor:'', supExp:'', notes:'' },
]

const SAMPLE_PAYERS = [
  { name:'Aetna', payerId:'60054', type:'Commercial', phone:'1-800-872-3862', email:'', portal:'https://www.aetna.com/health-care-professionals.html', timeline:'60–90 days', notes:'Submit via Availity. Requires CAQH.' },
  { name:'BCBS Oregon (Regence)', payerId:'00550', type:'Commercial', phone:'1-800-452-7278', email:'', portal:'https://www.regence.com/providers', timeline:'45–60 days', notes:'OHA participation typically required first.' },
  { name:'OHP / Medicaid (OHA)', payerId:'OROHP', type:'Medicaid', phone:'1-800-273-0557', email:'', portal:'https://www.oregon.gov/oha/hsd/ohp', timeline:'45–60 days', notes:'DMAP enrollment.' },
]


const CSS = `
:root {
  --ink:#0f1a0f;--ink-2:#2d3d2d;--ink-3:#5a6e5a;--ink-4:#8fa08f;
  --line:#e4ece4;--line-2:#f0f5f0;--bg:#f8fbf8;--surface:#ffffff;--surface-2:#f3f7f3;
  --primary:#1e6b3f;--primary-h:#155430;--primary-l:#e8f4ed;--primary-ll:#f2faf5;
  --accent:#2d9e5f;--red:#c5383a;--red-l:#fdf0f0;--amber:#c97d1e;--amber-l:#fdf5e8;
  --blue:#2563a8;--blue-l:#edf3fc;--purple:#6d3fb5;--purple-l:#f3eeff;
  --teal:#1a8a7a;--teal-l:#e8f6f4;--gold:#b8880d;--gold-l:#fef9e6;
  --r:10px;--r-lg:16px;--r-xl:22px;
  --shadow:0 1px 3px rgba(15,26,15,.06),0 4px 16px rgba(15,26,15,.05);
  --shadow-md:0 4px 24px rgba(15,26,15,.10);--shadow-lg:0 16px 48px rgba(15,26,15,.14);
  --transition:0.18s cubic-bezier(.4,0,.2,1);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{font-size:14px;}
body{font-family:'Geist',system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.55;-webkit-font-smoothing:antialiased;}
.app-root{display:flex;min-height:100vh;}
.sidebar{width:220px;min-height:100vh;background:var(--surface);border-right:1px solid var(--line);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:200;overflow-y:auto;}
.sb-logo{padding:20px 18px 14px;border-bottom:1px solid var(--line);}
.sb-logo-mark{display:flex;align-items:center;gap:9px;}
.sb-logo-icon{width:32px;height:32px;background:var(--primary);border-radius:9px;display:flex;align-items:center;justify-content:center;color:white;font-size:15px;flex-shrink:0;}
.sb-logo h1{font-family:'Instrument Serif',serif;font-size:16px;color:var(--ink);line-height:1.2;letter-spacing:-0.2px;}
.sb-logo p{font-size:10.5px;color:var(--ink-4);margin-top:2px;letter-spacing:0.3px;}
.sb-nav{padding:10px 8px;flex:1;}
.sb-section{font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--ink-4);padding:10px 10px 4px;margin-top:4px;}
.sb-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px;cursor:pointer;color:var(--ink-3);font-size:13px;font-weight:400;transition:all var(--transition);margin-bottom:1px;user-select:none;position:relative;}
.sb-item:hover{background:var(--surface-2);color:var(--ink);}
.sb-item.active{background:var(--primary-l);color:var(--primary);font-weight:500;}
.sb-item.active::before{content:'';position:absolute;left:-8px;top:6px;bottom:6px;width:3px;background:var(--primary);border-radius:0 2px 2px 0;}
.sb-icon{font-size:14px;width:16px;text-align:center;flex-shrink:0;}
.sb-badge{margin-left:auto;background:var(--red);color:white;font-size:10px;font-weight:600;border-radius:20px;padding:1px 6px;min-width:18px;text-align:center;line-height:1.6;}
.sb-badge.amber{background:var(--amber);}
.sb-footer{padding:12px 18px;border-top:1px solid var(--line);font-size:11px;color:var(--ink-4);}
.main{margin-left:220px;flex:1;display:flex;flex-direction:column;min-height:100vh;}
.topbar{background:var(--surface);border-bottom:1px solid var(--line);padding:0 28px;height:56px;display:flex;align-items:center;gap:14px;position:sticky;top:0;z-index:100;}
.topbar-left{flex:1;display:flex;align-items:baseline;gap:10px;}
.topbar-title{font-family:'Instrument Serif',serif;font-size:19px;color:var(--ink);letter-spacing:-0.3px;}
.topbar-actions{display:flex;gap:8px;align-items:center;}
.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;font-family:'Geist',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;border:1px solid transparent;transition:all var(--transition);white-space:nowrap;line-height:1;}
.btn:disabled{opacity:.6;cursor:not-allowed;}
.btn-primary{background:var(--primary);color:white;border-color:var(--primary);}
.btn-primary:hover:not(:disabled){background:var(--primary-h);}
.btn-secondary{background:var(--surface);color:var(--ink-2);border-color:var(--line);}
.btn-secondary:hover:not(:disabled){background:var(--surface-2);border-color:var(--ink-4);}
.btn-ghost{background:transparent;color:var(--ink-3);border-color:transparent;}
.btn-ghost:hover:not(:disabled){background:var(--surface-2);color:var(--ink);}
.btn-danger{background:var(--red-l);color:var(--red);border-color:#f0c8c8;}
.btn-danger:hover:not(:disabled){background:#f9e0e0;}
.btn-sm{padding:5px 10px;font-size:11.5px;border-radius:6px;}
.btn-green{background:var(--primary-l);color:var(--primary);border-color:#b8dfc7;}
.btn-green:hover:not(:disabled){background:#d2edd9;}
.pages{padding:24px 28px;}
.page{animation:pageIn 0.2s ease;}
@keyframes pageIn{from{opacity:0;transform:translateY(3px);}to{opacity:1;transform:none;}}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow);overflow:hidden;margin-bottom:0;}
.card-header{padding:16px 20px 12px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px;}
.card-header h3{font-family:'Instrument Serif',serif;font-size:15.5px;color:var(--ink);letter-spacing:-0.1px;flex:1;}
.ch-meta{font-size:12px;color:var(--ink-4);}
.card-body{padding:18px 20px;}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:22px;}
.kpi{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:18px 20px 16px;box-shadow:var(--shadow);transition:box-shadow var(--transition);position:relative;overflow:hidden;}
.kpi::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:var(--kpi-color,var(--primary));opacity:0.7;}
.kpi-label{font-size:11px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;color:var(--ink-4);margin-bottom:8px;}
.kpi-value{font-family:'Instrument Serif',serif;font-size:38px;line-height:1;color:var(--ink);margin-bottom:4px;}
.kpi-sub{font-size:11.5px;color:var(--ink-4);}
.kpi.kpi-red{--kpi-color:var(--red);}
.kpi.kpi-amber{--kpi-color:var(--amber);}
.kpi.kpi-blue{--kpi-color:var(--blue);}
.kpi.kpi-teal{--kpi-color:var(--teal);}
.kpi.kpi-purple{--kpi-color:var(--purple);}
.tbl-wrap{border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden;box-shadow:var(--shadow);}
table{width:100%;border-collapse:collapse;background:var(--surface);}
thead th{padding:10px 14px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;color:var(--ink-3);background:var(--surface-2);border-bottom:1px solid var(--line);white-space:nowrap;user-select:none;}
tbody td{padding:11px 14px;border-bottom:1px solid var(--line-2);font-size:13px;vertical-align:middle;}
tbody tr:last-child td{border-bottom:none;}
tbody tr{transition:background var(--transition);}
tbody tr:hover{background:var(--primary-ll);}
.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:500;white-space:nowrap;line-height:1.6;}
.badge::before{content:'';width:5px;height:5px;border-radius:50%;background:currentColor;opacity:0.7;display:none;}
.badge-dot::before{display:inline-block;}
.b-green{background:#dff4e7;color:#177a3a;}
.b-red{background:var(--red-l);color:var(--red);}
.b-amber{background:var(--amber-l);color:var(--amber);}
.b-blue{background:var(--blue-l);color:var(--blue);}
.b-purple{background:var(--purple-l);color:var(--purple);}
.b-teal{background:var(--teal-l);color:var(--teal);}
.b-gold{background:var(--gold-l);color:var(--gold);}
.b-gray{background:var(--surface-2);color:var(--ink-3);border:1px solid var(--line);}
.toolbar{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap;}
.search-box{position:relative;}
.search-box input{padding:7px 12px 7px 32px;border:1px solid var(--line);border-radius:8px;font-family:'Geist',sans-serif;font-size:12.5px;color:var(--ink);background:var(--surface);outline:none;width:220px;transition:border-color var(--transition),box-shadow var(--transition);}
.search-box input:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(30,107,63,.1);}
.search-box .si{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--ink-4);font-size:13px;pointer-events:none;}
.filter-select{padding:6px 10px;border:1px solid var(--line);border-radius:8px;font-family:'Geist',sans-serif;font-size:12.5px;color:var(--ink);background:var(--surface);outline:none;cursor:pointer;}
.filter-select:focus{border-color:var(--primary);}
.toolbar-right{margin-left:auto;display:flex;gap:8px;}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.form-grid .full{grid-column:1/-1;}
.fg{display:flex;flex-direction:column;gap:5px;}
.fg label{font-size:11.5px;font-weight:500;color:var(--ink-3);}
.fg input,.fg select,.fg textarea{padding:7px 10px;border:1px solid var(--line);border-radius:7px;font-family:'Geist',sans-serif;font-size:12.5px;color:var(--ink);background:var(--surface);outline:none;transition:border-color var(--transition),box-shadow var(--transition);}
.fg input:focus,.fg select:focus,.fg textarea:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(30,107,63,.1);}
.fg textarea{resize:vertical;min-height:72px;line-height:1.5;}
.field-note{font-size:10.5px;color:var(--ink-4);margin-top:2px;}
.section-divider{font-size:10.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:var(--primary);background:var(--primary-ll);border:1px solid #c8e6d4;border-radius:6px;padding:5px 10px;grid-column:1/-1;margin-top:4px;}
.overlay{display:none;position:fixed;inset:0;background:rgba(10,20,10,.35);backdrop-filter:blur(4px);z-index:500;align-items:center;justify-content:center;padding:24px;}
.overlay.open{display:flex;}
.modal{background:var(--surface);border-radius:var(--r-xl);box-shadow:var(--shadow-lg);width:100%;max-width:620px;max-height:88vh;overflow-y:auto;animation:modalIn 0.2s ease;}
.modal-lg{max-width:780px;}
@keyframes modalIn{from{opacity:0;transform:scale(.97) translateY(8px);}to{opacity:1;transform:none;}}
.modal-header{padding:20px 24px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px;position:sticky;top:0;background:var(--surface);z-index:2;border-radius:var(--r-xl) var(--r-xl) 0 0;}
.modal-header h3{font-family:'Instrument Serif',serif;font-size:19px;flex:1;letter-spacing:-0.2px;}
.mh-sub{font-size:12px;color:var(--ink-4);}
.modal-close{background:none;border:none;font-size:18px;cursor:pointer;color:var(--ink-4);padding:4px;border-radius:6px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;}
.modal-close:hover{background:var(--surface-2);color:var(--ink);}
.modal-body{padding:20px 24px;}
.modal-footer{padding:14px 24px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;position:sticky;bottom:0;background:var(--surface);border-radius:0 0 var(--r-xl) var(--r-xl);}
.tabs{display:flex;border-bottom:1px solid var(--line);margin-bottom:18px;}
.tab{padding:9px 16px;cursor:pointer;font-size:13px;color:var(--ink-4);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all var(--transition);white-space:nowrap;}
.tab:hover{color:var(--ink);}
.tab.active{color:var(--primary);border-bottom-color:var(--primary);font-weight:500;}
.prov-card{display:grid;grid-template-columns:auto 1fr auto;align-items:start;gap:14px;padding:16px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);margin-bottom:10px;cursor:pointer;transition:all var(--transition);box-shadow:var(--shadow);}
.prov-card:hover{border-color:#a8d5be;box-shadow:var(--shadow-md);transform:translateY(-1px);}
.prov-avatar{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Instrument Serif',serif;font-size:17px;color:white;flex-shrink:0;}
.prov-name{font-size:14px;font-weight:600;color:var(--ink);margin-bottom:2px;}
.prov-title{font-size:12px;color:var(--ink-3);margin-bottom:8px;}
.prov-chips{display:flex;gap:5px;flex-wrap:wrap;}
.prov-actions{display:flex;flex-direction:column;gap:6px;align-items:flex-end;}
.workflow-steps{display:flex;align-items:center;overflow-x:auto;padding:4px 0;}
.ws{display:flex;flex-direction:column;align-items:center;flex-shrink:0;min-width:72px;position:relative;}
.ws:not(:last-child)::after{content:'';position:absolute;left:50%;top:14px;width:100%;height:2px;background:var(--line);z-index:0;}
.ws.done:not(:last-child)::after{background:var(--primary);}
.ws-dot{width:28px;height:28px;border-radius:50%;border:2px solid var(--line);background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--ink-4);z-index:1;position:relative;transition:all var(--transition);}
.ws.done .ws-dot{background:var(--primary);border-color:var(--primary);color:white;}
.ws.active .ws-dot{border-color:var(--primary);color:var(--primary);box-shadow:0 0 0 4px rgba(30,107,63,.15);}
.ws-label{font-size:9.5px;color:var(--ink-4);margin-top:5px;text-align:center;max-width:68px;line-height:1.3;}
.ws.done .ws-label,.ws.active .ws-label{color:var(--primary);font-weight:500;}
.alert-item{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-radius:9px;margin-bottom:8px;font-size:12.5px;}
.alert-item.al-red{background:var(--red-l);border-left:3px solid var(--red);}
.alert-item.al-amber{background:var(--amber-l);border-left:3px solid var(--amber);}
.alert-item.al-blue{background:var(--blue-l);border-left:3px solid var(--blue);}
.al-icon{font-size:14px;flex-shrink:0;margin-top:1px;}
.al-body{flex:1;}
.al-title{font-weight:500;color:var(--ink);margin-bottom:1px;}
.al-sub{color:var(--ink-3);font-size:11.5px;}
.stat-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line-2);font-size:13px;}
.stat-row:last-child{border-bottom:none;}
.stat-row-label{color:var(--ink-3);}
.stat-row-value{font-weight:600;color:var(--ink);}
.donut-wrap{display:flex;align-items:center;gap:24px;}
.donut-legend{flex:1;}
.donut-legend-item{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;}
.donut-legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
.npi-result-box{border-radius:9px;padding:12px 14px;margin-top:8px;}
.nr-name{font-weight:600;font-size:14px;color:var(--ink);}
.nr-detail{font-size:12px;color:var(--ink-3);margin-top:3px;}
.report-card{padding:16px;background:var(--surface-2);border-radius:10px;border:1px solid var(--line);margin-bottom:10px;cursor:pointer;transition:all var(--transition);}
.report-card:hover{background:var(--primary-ll);border-color:#b8dfc7;}
.report-card h4{font-size:13.5px;font-weight:600;color:var(--ink);margin-bottom:3px;}
.report-card p{font-size:12px;color:var(--ink-4);}
.audit-entry{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--line-2);font-size:12.5px;}
.audit-entry:last-child{border-bottom:none;}
.audit-dot{width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;margin-top:5px;}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
.mb-12{margin-bottom:12px;}.mb-16{margin-bottom:16px;}.mb-20{margin-bottom:20px;}.mt-12{margin-top:12px;}
.text-muted{color:var(--ink-4);font-size:12px;}
.text-sm{font-size:12.5px;}.text-xs{font-size:11px;}.font-500{font-weight:500;}
.empty-state{text-align:center;padding:48px 20px;color:var(--ink-4);}
.ei{font-size:36px;margin-bottom:10px;}
.empty-state h4{font-size:15px;color:var(--ink-3);margin-bottom:5px;}
.info-chip{display:inline-flex;align-items:center;gap:4px;background:var(--surface-2);border:1px solid var(--line);border-radius:6px;padding:3px 8px;font-size:11.5px;color:var(--ink-3);}
.spinner{display:inline-block;width:14px;height:14px;border:2px solid var(--line);border-top-color:var(--primary);border-radius:50%;animation:spin 0.7s linear infinite;}
.spinner-lg{display:inline-block;width:32px;height:32px;border:3px solid var(--line);border-top-color:var(--primary);border-radius:50%;animation:spin 0.7s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.loading-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;}
.toast-wrap{position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;}
.toast{background:var(--ink);color:white;padding:10px 16px;border-radius:10px;font-size:12.5px;box-shadow:var(--shadow-lg);animation:toastIn 0.2s ease;display:flex;align-items:center;gap:9px;min-width:230px;pointer-events:auto;}
@keyframes toastIn{from{opacity:0;transform:translateY(6px) scale(.98);}to{opacity:1;transform:none;}}
.t-success{border-left:3px solid var(--accent);}
.t-error{border-left:3px solid var(--red);}
.t-warn{border-left:3px solid var(--amber);}
.t-info{border-left:3px solid var(--blue);}
@media(max-width:860px){.sidebar{width:180px;}.main{margin-left:180px;}.kpi-grid{grid-template-columns:repeat(2,1fr);}.form-grid,.grid-2,.grid-3{grid-template-columns:1fr;}.form-grid .full{grid-column:1;}}
`

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [db, setDb] = useState({ providers:[], payers:[], enrollments:[], documents:[], tasks:[], auditLog:[], settings:{} })
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState([])
  const [modal, setModal] = useState(null) // null | 'enroll' | 'payer' | 'doc' | 'task' | 'provDetail'
  const [editingId, setEditingId] = useState({})
  const [provDetailId, setProvDetailId] = useState(null)
  const [provDetailTab, setProvDetailTab] = useState('profile')
  const [saving, setSaving] = useState(false)

  // Form states
  const [provForm, setProvForm] = useState({})
  const [enrollForm, setEnrollForm] = useState({})
  const [payerForm, setPayerForm] = useState({})
  const [docForm, setDocForm] = useState({})
  const [taskForm, setTaskForm] = useState({})
  const [settingsForm, setSettingsForm] = useState({})

  // Filter/search states
  const [provSearch, setProvSearch] = useState(''); const [provFStatus, setProvFStatus] = useState(''); const [provFSpec, setProvFSpec] = useState('')
  const [enrSearch, setEnrSearch] = useState(''); const [enrFStage, setEnrFStage] = useState(''); const [enrFProv, setEnrFProv] = useState('')
  const [paySearch, setPaySearch] = useState(''); const [payFType, setPayFType] = useState('')
  const [docSearch, setDocSearch] = useState(''); const [docFType, setDocFType] = useState(''); const [docFStatus, setDocFStatus] = useState('')
  const [wfSearch, setWfSearch] = useState(''); const [wfFPriority, setWfFPriority] = useState(''); const [wfFStatus, setWfFStatus] = useState('')
  const [auditSearch, setAuditSearch] = useState(''); const [auditFType, setAuditFType] = useState('')
  const [npiInput, setNpiInput] = useState(''); const [npiResult, setNpiResult] = useState(null); const [npiLoading, setNpiLoading] = useState(false)

  // ─── AUTH ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ─── LOAD DATA ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    setLoading(true)
    loadAll().then(data => {
      setDb(data)
      setSettingsForm(data.settings)
      setLoading(false)
    }).catch(err => {
      toast('Error loading data: ' + err.message, 'error')
      setLoading(false)
    })
  }, [user])

  // ─── REALTIME ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToAll(() => {
      loadAll().then(data => setDb(data))
    })
    return unsub
  }, [user])

  // ─── TOAST ───────────────────────────────────────────────────────────────────
  function toast(msg, type='success') {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3400)
  }

  // ─── SIGN OUT ─────────────────────────────────────────────────────────────────
  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // ─── AUTH GUARD ───────────────────────────────────────────────────────────────
  if (authLoading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Geist,sans-serif', color:'#5a6e5a' }}>Loading…</div>
  if (!user) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    return null
  }

  // ─── COMPUTED ALERTS ──────────────────────────────────────────────────────────
  const alertDays = db.settings.alertDays || 90
  const alertCount = db.providers.reduce((n, prov) => {
    ['licenseExp','malExp','deaExp','caqhDue','recred'].forEach(f => { const d=daysUntil(prov[f]); if(d!==null && d<=alertDays) n++ })
    return n
  }, 0)
  const pendingEnroll = db.enrollments.filter(e => !['Active','Denied'].includes(e.stage)).length
  const expDocs = db.documents.filter(d => { const days=daysUntil(d.exp); return days!==null && days<=90 }).length

  // ─── SAVE PROVIDER ────────────────────────────────────────────────────────────
  async function handleSaveProvider() {
    if (!provForm.fname?.trim() || !provForm.lname?.trim()) { toast('First and last name required.', 'error'); return }
    setSaving(true)
    try {
      const saved = await upsertProvider({ ...provForm, id: editingId.provider || undefined })
      setDb(prev => {
        const list = editingId.provider ? prev.providers.map(x => x.id===saved.id ? saved : x) : [...prev.providers, saved]
        return { ...prev, providers: list }
      })
      toast(editingId.provider ? 'Provider updated!' : 'Provider saved!', 'success')
      setEditingId(e => ({ ...e, provider: null }))
      setProvForm({})
      setNpiResult(null)
      setNpiInput('')
      setPage('providers')
    } catch(err) { toast(err.message, 'error') }
    setSaving(false)
  }

  async function handleDeleteProvider(id) {
    if (!confirm('Delete this provider and all linked data?')) return
    setSaving(true)
    try {
      await deleteProvider(id)
      setDb(prev => ({
        ...prev,
        providers: prev.providers.filter(x => x.id !== id),
        enrollments: prev.enrollments.filter(e => e.provId !== id),
        documents: prev.documents.filter(d => d.provId !== id),
        tasks: prev.tasks.filter(t => t.provId !== id),
      }))
      toast('Provider deleted.', 'warn')
      setEditingId(e => ({ ...e, provider: null }))
      setPage('providers')
    } catch(err) { toast(err.message, 'error') }
    setSaving(false)
  }

  // ─── SAVE ENROLLMENT ──────────────────────────────────────────────────────────
  async function handleSaveEnrollment() {
    if (!enrollForm.provId || !enrollForm.payId) { toast('Provider and payer required.', 'error'); return }
    setSaving(true)
    try {
      const provN = pNameShort(db.providers, enrollForm.provId)
      const payN = payName(db.payers, enrollForm.payId)
      const saved = await upsertEnrollment({ ...enrollForm, id: editingId.enrollment || undefined }, provN, payN)
      setDb(prev => {
        const list = editingId.enrollment ? prev.enrollments.map(x => x.id===saved.id ? saved : x) : [...prev.enrollments, saved]
        return { ...prev, enrollments: list }
      })
      toast(editingId.enrollment ? 'Enrollment updated!' : 'Enrollment saved!', 'success')
      setModal(null)
      setEnrollForm({})
      setEditingId(e => ({ ...e, enrollment: null }))
    } catch(err) { toast(err.message, 'error') }
    setSaving(false)
  }

  async function handleDeleteEnrollment(id) {
    if (!confirm('Delete this enrollment?')) return
    try {
      await deleteEnrollment(id)
      setDb(prev => ({ ...prev, enrollments: prev.enrollments.filter(x => x.id !== id) }))
      toast('Deleted.', 'warn')
    } catch(err) { toast(err.message, 'error') }
  }

  // ─── SAVE PAYER ───────────────────────────────────────────────────────────────
  async function handleSavePayer() {
    if (!payerForm.name?.trim()) { toast('Payer name required.', 'error'); return }
    setSaving(true)
    try {
      const saved = await upsertPayer({ ...payerForm, id: editingId.payer || undefined })
      setDb(prev => {
        const list = editingId.payer ? prev.payers.map(x => x.id===saved.id ? saved : x) : [...prev.payers, saved]
        return { ...prev, payers: list }
      })
      toast(editingId.payer ? 'Payer updated!' : 'Payer saved!', 'success')
      setModal(null)
      setPayerForm({})
      setEditingId(e => ({ ...e, payer: null }))
    } catch(err) { toast(err.message, 'error') }
    setSaving(false)
  }

  async function handleDeletePayer(id) {
    if (!confirm('Delete this payer?')) return
    try {
      await deletePayer(id)
      setDb(prev => ({ ...prev, payers: prev.payers.filter(x => x.id !== id) }))
      toast('Deleted.', 'warn')
    } catch(err) { toast(err.message, 'error') }
  }

  // ─── SAVE DOCUMENT ────────────────────────────────────────────────────────────
  async function handleSaveDocument() {
    if (!docForm.provId || !docForm.exp) { toast('Provider and expiration date required.', 'error'); return }
    setSaving(true)
    try {
      const provN = pNameShort(db.providers, docForm.provId)
      const saved = await upsertDocument({ ...docForm, id: editingId.doc || undefined }, provN)
      setDb(prev => {
        const list = editingId.doc ? prev.documents.map(x => x.id===saved.id ? saved : x) : [...prev.documents, saved]
        return { ...prev, documents: list }
      })
      toast(editingId.doc ? 'Document updated!' : 'Document saved!', 'success')
      setModal(null)
      setDocForm({})
      setEditingId(e => ({ ...e, doc: null }))
    } catch(err) { toast(err.message, 'error') }
    setSaving(false)
  }

  async function handleDeleteDocument(id) {
    if (!confirm('Delete this document?')) return
    try {
      await deleteDocument(id)
      setDb(prev => ({ ...prev, documents: prev.documents.filter(x => x.id !== id) }))
      toast('Deleted.', 'warn')
    } catch(err) { toast(err.message, 'error') }
  }

  // ─── SAVE TASK ────────────────────────────────────────────────────────────────
  async function handleSaveTask() {
    if (!taskForm.task?.trim() || !taskForm.due) { toast('Task description and due date required.', 'error'); return }
    setSaving(true)
    try {
      const saved = await upsertTask({ ...taskForm, id: editingId.task || undefined })
      setDb(prev => {
        const list = editingId.task ? prev.tasks.map(x => x.id===saved.id ? saved : x) : [...prev.tasks, saved]
        return { ...prev, tasks: list }
      })
      toast(editingId.task ? 'Task updated!' : 'Task saved!', 'success')
      setModal(null)
      setTaskForm({})
      setEditingId(e => ({ ...e, task: null }))
    } catch(err) { toast(err.message, 'error') }
    setSaving(false)
  }

  async function handleMarkDone(id, taskName) {
    try {
      await markTaskDone(id, taskName)
      setDb(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id===id ? { ...t, status:'Done' } : t) }))
      toast('Task marked complete!', 'success')
    } catch(err) { toast(err.message, 'error') }
  }

  async function handleDeleteTask(id) {
    if (!confirm('Delete this task?')) return
    try {
      await deleteTask(id)
      setDb(prev => ({ ...prev, tasks: prev.tasks.filter(x => x.id !== id) }))
      toast('Deleted.', 'warn')
    } catch(err) { toast(err.message, 'error') }
  }

  // ─── SAVE SETTINGS ────────────────────────────────────────────────────────────
  async function handleSaveSettings() {
    try {
      await saveSettingsDB(settingsForm)
      setDb(prev => ({ ...prev, settings: settingsForm }))
      toast('Settings saved!', 'success')
    } catch(err) { toast(err.message, 'error') }
  }

  // ─── CLEAR AUDIT ──────────────────────────────────────────────────────────────
  async function handleClearAudit() {
    if (!confirm('Clear the audit log?')) return
    try {
      await clearAuditLogDB()
      setDb(prev => ({ ...prev, auditLog: [] }))
      toast('Audit log cleared.', 'warn')
    } catch(err) { toast(err.message, 'error') }
  }

  // ─── NPI LOOKUP ───────────────────────────────────────────────────────────────
  async function lookupNPI() {
    if (!/^\d{10}$/.test(npiInput)) { toast('Enter a valid 10-digit NPI.', 'error'); return }
    setNpiLoading(true)
    setNpiResult(null)
    try {
      const res = await fetch(`https://npiregistry.cms.hhs.gov/api/?number=${npiInput}&version=2.1`)
      const data = await res.json()
      if (!data.results?.length) { setNpiResult({ error: 'No provider found for this NPI.' }); return }
      const r = data.results[0]
      const basic = r.basic || {}
      const isOrg = r.enumeration_type === 'NPI-2'
      const fname = isOrg ? '' : (basic.first_name || '')
      const lname = isOrg ? (basic.organization_name || '') : (basic.last_name || '')
      const cred = isOrg ? '' : (basic.credential || '').replace(/\./g, '').trim()
      const spec = r.taxonomies?.[0]?.desc || ''
      const loc = r.addresses?.[0]
      const addr = loc ? [loc.address_1, loc.city, loc.state, loc.postal_code].filter(Boolean).join(', ') : ''
      setNpiResult({ fname, lname, cred, spec, addr, npi: npiInput })
      setProvForm(f => ({ ...f, fname: fname||f.fname, lname: lname||f.lname, npi: npiInput }))
      await addAudit('Provider', 'NPI Lookup', `NPI ${npiInput} → ${fname} ${lname}`, '')
      toast('NPI data loaded!', 'success')
    } catch(e) { setNpiResult({ error: 'Could not reach NPI registry.' }) }
    setNpiLoading(false)
  }

  // ─── LOAD SAMPLE DATA ─────────────────────────────────────────────────────────
  async function loadSampleData() {
    if (!confirm('Load sample data? This will add sample providers and payers.')) return
    setSaving(true)
    try {
      for (const prov of SAMPLE_PROVIDERS) {
        await upsertProvider(prov)
      }
      const savedPayers = []
      for (const pay of SAMPLE_PAYERS) {
        const saved = await upsertPayer(pay)
        savedPayers.push(saved)
      }
      const freshData = await loadAll()
      setDb(freshData)
      setSettingsForm(freshData.settings)
      toast('Sample data loaded!', 'success')
    } catch(err) { toast('Error loading sample data: ' + err.message, 'error') }
    setSaving(false)
  }

  // ─── EXPORT ───────────────────────────────────────────────────────────────────
  function exportJSON() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `credentialiq-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    toast('Backup exported!', 'success')
  }

  // ─── OPEN MODALS ──────────────────────────────────────────────────────────────
  function openEnrollModal(id, preProvId) {
    setEditingId(e => ({ ...e, enrollment: id || null }))
    if (id) {
      const en = db.enrollments.find(x => x.id === id)
      if (en) setEnrollForm({ ...en })
    } else {
      setEnrollForm({ stage:'Not Started', eft:'Not Set Up', era:'Not Set Up', contract:'No', provId: preProvId||'', payId:'' })
    }
    setModal('enroll')
  }

  function openPayerModal(id) {
    setEditingId(e => ({ ...e, payer: id || null }))
    if (id) {
      const pay = db.payers.find(x => x.id === id)
      if (pay) setPayerForm({ ...pay })
    } else {
      setPayerForm({ type:'Commercial', timeline:'60–90 days' })
    }
    setModal('payer')
  }

  function openDocModal(id) {
    setEditingId(e => ({ ...e, doc: id || null }))
    if (id) {
      const doc = db.documents.find(x => x.id === id)
      if (doc) setDocForm({ ...doc })
    } else {
      setDocForm({ type:'License' })
    }
    setModal('doc')
  }

  function openTaskModal(id) {
    setEditingId(e => ({ ...e, task: id || null }))
    if (id) {
      const t = db.tasks.find(x => x.id === id)
      if (t) setTaskForm({ ...t })
    } else {
      setTaskForm({ priority:'Medium', status:'Open', cat:'Follow-up' })
    }
    setModal('task')
  }

  function openProvDetail(id) {
    setProvDetailId(id)
    setProvDetailTab('profile')
    setModal('provDetail')
  }

  function editProvider(id) {
    const prov = db.providers.find(x => x.id === id)
    if (!prov) return
    setEditingId(e => ({ ...e, provider: id }))
    setProvForm({ ...prov })
    setNpiInput(prov.npi || '')
    setNpiResult(null)
    setPage('add-provider')
    setModal(null)
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  const provDetail = provDetailId ? db.providers.find(x => x.id === provDetailId) : null

  return (
    <>
      <Head>
        <title>CredentialIQ — Positive Inner Self</title>
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <style>{CSS}</style>
      </Head>
      <div className="app-root">
        {/* ─── SIDEBAR ─── */}
        <Sidebar page={page} setPage={setPage} alertCount={alertCount} pendingEnroll={pendingEnroll} expDocs={expDocs} user={user} signOut={signOut} />

        {/* ─── MAIN ─── */}
        <div className="main">
          <Topbar page={page} setPage={setPage} openEnrollModal={openEnrollModal} openPayerModal={openPayerModal} openDocModal={openDocModal} openTaskModal={openTaskModal} exportJSON={exportJSON} loadSampleData={loadSampleData} saving={saving} />

          {loading ? (
            <div className="loading-screen">
              <div className="spinner-lg"></div>
              <div style={{ marginTop:16, color:'#5a6e5a' }}>Loading your data…</div>
            </div>
          ) : (
            <div className="pages">
              {page === 'dashboard' && <Dashboard db={db} setPage={setPage} openEnrollModal={openEnrollModal} />}
              {page === 'alerts' && <Alerts db={db} />}
              {page === 'providers' && <Providers db={db} search={provSearch} setSearch={setProvSearch} fStatus={provFStatus} setFStatus={setProvFStatus} fSpec={provFSpec} setFSpec={setProvFSpec} openProvDetail={openProvDetail} editProvider={editProvider} setPage={setPage} setProvForm={setProvForm} setEditingId={setEditingId} setNpiInput={setNpiInput} setNpiResult={setNpiResult} />}
              {page === 'add-provider' && <AddProvider db={db} provForm={provForm} setProvForm={setProvForm} editingId={editingId} setEditingId={setEditingId} npiInput={npiInput} setNpiInput={setNpiInput} npiResult={npiResult} setNpiResult={setNpiResult} npiLoading={npiLoading} lookupNPI={lookupNPI} handleSaveProvider={handleSaveProvider} handleDeleteProvider={handleDeleteProvider} setPage={setPage} saving={saving} />}
              {page === 'enrollments' && <Enrollments db={db} search={enrSearch} setSearch={setEnrSearch} fStage={enrFStage} setFStage={setEnrFStage} fProv={enrFProv} setFProv={setEnrFProv} openEnrollModal={openEnrollModal} handleDeleteEnrollment={handleDeleteEnrollment} />}
              {page === 'payers' && <Payers db={db} search={paySearch} setSearch={setPaySearch} fType={payFType} setFType={setPayFType} openPayerModal={openPayerModal} handleDeletePayer={handleDeletePayer} />}
              {page === 'documents' && <Documents db={db} search={docSearch} setSearch={setDocSearch} fType={docFType} setFType={setDocFType} fStatus={docFStatus} setFStatus={setDocFStatus} openDocModal={openDocModal} handleDeleteDocument={handleDeleteDocument} />}
              {page === 'workflows' && <Workflows db={db} search={wfSearch} setSearch={setWfSearch} fPriority={wfFPriority} setFPriority={setWfFPriority} fStatus={wfFStatus} setFStatus={setWfFStatus} openTaskModal={openTaskModal} handleMarkDone={handleMarkDone} handleDeleteTask={handleDeleteTask} />}
              {page === 'reports' && <Reports db={db} exportJSON={exportJSON} />}
              {page === 'audit' && <Audit db={db} search={auditSearch} setSearch={setAuditSearch} fType={auditFType} setFType={setAuditFType} handleClearAudit={handleClearAudit} />}
              {page === 'settings' && <Settings settingsForm={settingsForm} setSettingsForm={setSettingsForm} handleSaveSettings={handleSaveSettings} exportJSON={exportJSON} />}
            </div>
          )}
        </div>

        {/* ─── MODALS ─── */}
        {modal === 'enroll' && <EnrollModal db={db} enrollForm={enrollForm} setEnrollForm={setEnrollForm} editingId={editingId} handleSaveEnrollment={handleSaveEnrollment} onClose={()=>{setModal(null);setEnrollForm({});setEditingId(e=>({...e,enrollment:null}))}} saving={saving} />}
        {modal === 'payer' && <PayerModal payerForm={payerForm} setPayerForm={setPayerForm} editingId={editingId} handleSavePayer={handleSavePayer} onClose={()=>{setModal(null);setPayerForm({});setEditingId(e=>({...e,payer:null}))}} saving={saving} />}
        {modal === 'doc' && <DocModal db={db} docForm={docForm} setDocForm={setDocForm} editingId={editingId} handleSaveDocument={handleSaveDocument} onClose={()=>{setModal(null);setDocForm({});setEditingId(e=>({...e,doc:null}))}} saving={saving} />}
        {modal === 'task' && <TaskModal db={db} taskForm={taskForm} setTaskForm={setTaskForm} editingId={editingId} handleSaveTask={handleSaveTask} onClose={()=>{setModal(null);setTaskForm({});setEditingId(e=>({...e,task:null}))}} saving={saving} />}
        {modal === 'provDetail' && provDetail && <ProvDetailModal prov={provDetail} db={db} tab={provDetailTab} setTab={setProvDetailTab} onClose={()=>setModal(null)} editProvider={editProvider} openEnrollModal={openEnrollModal} />}

        {/* ─── TOASTS ─── */}
        <div className="toast-wrap">
          {toasts.map(t => (
            <div key={t.id} className={`toast t-${t.type}`}>
              <span>{t.type==='success'?'✓':t.type==='error'?'✕':t.type==='warn'?'⚠':'ℹ'}</span>
              {t.msg}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function Sidebar({ page, setPage, alertCount, pendingEnroll, expDocs, user, signOut }) {
  const navItem = (pg, icon, label, badge, badgeClass) => (
    <div className={`sb-item ${page===pg?'active':''}`} onClick={() => setPage(pg)}>
      <span className="sb-icon">{icon}</span> {label}
      {badge > 0 && <span className={`sb-badge ${badgeClass||''}`}>{badge}</span>}
    </div>
  )
  return (
    <nav className="sidebar">
      <div className="sb-logo">
        <div className="sb-logo-mark">
          <div className="sb-logo-icon">✦</div>
          <div><h1>CredentialIQ</h1><p>Positive Inner Self</p></div>
        </div>
      </div>
      <nav className="sb-nav">
        <div className="sb-section">Overview</div>
        {navItem('dashboard','▦','Dashboard')}
        {navItem('alerts','🔔','Alerts', alertCount)}
        <div className="sb-section">Providers</div>
        {navItem('providers','👤','All Providers')}
        {navItem('add-provider','＋','Add Provider')}
        <div className="sb-section">Enrollments</div>
        {navItem('enrollments','🏥','Payer Enrollments', pendingEnroll, 'amber')}
        {navItem('payers','🗂','Payer Directory')}
        <div className="sb-section">Compliance</div>
        {navItem('documents','📎','Documents & Expiry', expDocs)}
        {navItem('workflows','⚡','Workflows & Tasks')}
        <div className="sb-section">Analytics</div>
        {navItem('reports','📊','Reports')}
        {navItem('audit','📋','Audit Trail')}
        <div className="sb-section">Settings</div>
        {navItem('settings','⚙️','Settings')}
      </nav>
      <div className="sb-footer">
        <strong style={{ display:'block', fontSize:'12px', color:'#2d3d2d', fontWeight:500, marginBottom:1 }}>{user?.email}</strong>
        <button onClick={signOut} style={{ background:'none', border:'none', color:'#5a6e5a', fontSize:'11px', cursor:'pointer', padding:0, marginTop:4 }}>Sign out →</button>
      </div>
    </nav>
  )
}

function Topbar({ page, setPage, openEnrollModal, openPayerModal, openDocModal, openTaskModal, exportJSON, loadSampleData, saving }) {
  const titles = { dashboard:'Dashboard', alerts:'Alerts', providers:'All Providers', 'add-provider':'Add Provider', enrollments:'Payer Enrollments', payers:'Payer Directory', documents:'Documents & Expiry', workflows:'Workflows & Tasks', reports:'Reports & Analytics', audit:'Audit Trail', settings:'Settings' }
  function topCTA() {
    if (page==='enrollments') openEnrollModal()
    else if (page==='payers') openPayerModal()
    else if (page==='documents') openDocModal()
    else if (page==='workflows') openTaskModal()
    else setPage('add-provider')
  }
  const ctaLabel = page==='enrollments'?'＋ New Enrollment':page==='payers'?'＋ Add Payer':page==='documents'?'＋ Add Document':page==='workflows'?'＋ New Task':['reports','audit','settings'].includes(page)?null:'＋ Add Provider'
  return (
    <div className="topbar">
      <div className="topbar-left"><div className="topbar-title">{titles[page]||page}</div></div>
      <div className="topbar-actions">
        <button className="btn btn-ghost btn-sm" onClick={exportJSON}>⬇ Export</button>
        <button className="btn btn-secondary btn-sm" onClick={loadSampleData} disabled={saving}>↺ Sample Data</button>
        {ctaLabel && <button className="btn btn-primary btn-sm" onClick={topCTA}>{ctaLabel}</button>}
      </div>
    </div>
  )
}

// ─── BADGE HELPERS ─────────────────────────────────────────────────────────────
function Badge({ cls, children }) { return <span className={`badge ${cls||'b-gray'}`}>{children}</span> }
function ExpiryBadge({ date }) {
  const days = daysUntil(date)
  if (days === null) return <Badge cls="b-gray">Not Set</Badge>
  if (days < 0) return <Badge cls="b-red">Expired {Math.abs(days)}d ago</Badge>
  if (days <= 30) return <Badge cls="b-red">{days}d left</Badge>
  if (days <= 90) return <Badge cls="b-amber">{days}d left</Badge>
  return <Badge cls="b-green">{days}d left</Badge>
}
function StageBadge({ stage }) { return <Badge cls={STAGE_COLOR[stage]||'b-gray'}>{stage}</Badge> }

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ db, setPage, openEnrollModal }) {
  const alertDays = db.settings.alertDays || 90
  const activeProvs = db.providers.filter(p => p.status==='Active').length
  const activeEnr = db.enrollments.filter(e => e.stage==='Active').length
  const pendingEnr = db.enrollments.filter(e => !['Active','Denied'].includes(e.stage)).length
  let expiring = 0
  db.providers.forEach(p => { ['licenseExp','malExp','caqhDue'].forEach(f => { const d=daysUntil(p[f]); if(d!==null && d<=alertDays) expiring++ }) })
  const openTasks = db.tasks.filter(t => t.status!=='Done').length
  const expDocs = db.documents.filter(d => { const days=daysUntil(d.exp); return days!==null && days<=90 }).length

  const alerts = []
  db.providers.forEach(p => {
    [{f:'licenseExp',l:'License'},{f:'malExp',l:'Malpractice'},{f:'deaExp',l:'DEA'},{f:'caqhDue',l:'CAQH Attestation'},{f:'recred',l:'Recredentialing'}].forEach(c => {
      const d = daysUntil(p[c.f]); if(d!==null && d<=90) alerts.push({ p, label:c.label, days:d, date:p[c.f] })
    })
  })
  alerts.sort((a,b) => a.days-b.days)

  const fu = db.enrollments.filter(e => e.followup && daysUntil(e.followup)!==null && daysUntil(e.followup)<=14).sort((a,b) => daysUntil(a.followup)-daysUntil(b.followup))

  const stages = {}
  db.enrollments.forEach(e => { stages[e.stage]=(stages[e.stage]||0)+1 })
  const colors = ['#1e6b3f','#2563a8','#c97d1e','#c5383a','#6d3fb5','#1a8a7a','#b8880d','#5a6e5a']
  const total = db.enrollments.length || 1
  let offset = 25; const r = 35; const circ = 2*Math.PI*r

  const specs = {}
  db.providers.filter(p => p.status==='Active').forEach(p => { specs[p.spec]=(specs[p.spec]||0)+1 })

  return (
    <div className="page">
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Active Providers</div><div className="kpi-value">{activeProvs}</div><div className="kpi-sub">{db.providers.length} total on file</div></div>
        <div className="kpi kpi-teal"><div className="kpi-label">Active Panels</div><div className="kpi-value">{activeEnr}</div><div className="kpi-sub">of {db.enrollments.length} total</div></div>
        <div className="kpi kpi-amber"><div className="kpi-label">Pending Enrollments</div><div className="kpi-value">{pendingEnr}</div><div className="kpi-sub">Awaiting approval</div></div>
        <div className="kpi kpi-red"><div className="kpi-label">Credentials Expiring</div><div className="kpi-value">{expiring}</div><div className="kpi-sub">Within {alertDays} days</div></div>
        <div className="kpi kpi-blue"><div className="kpi-label">Open Tasks</div><div className="kpi-value">{openTasks}</div><div className="kpi-sub">Pending & in progress</div></div>
        <div className="kpi kpi-purple"><div className="kpi-label">Docs Expiring</div><div className="kpi-value">{expDocs}</div><div className="kpi-sub">Within 90 days</div></div>
      </div>
      <div className="grid-2">
        <div>
          <div className="card mb-16">
            <div className="card-header"><h3>🚨 Active Alerts</h3></div>
            <div className="card-body" style={{ maxHeight:220, overflowY:'auto' }}>
              {alerts.length ? alerts.slice(0,6).map((a,i) => (
                <div key={i} className={`alert-item ${a.days<0?'al-red':a.days<=30?'al-red':'al-amber'}`}>
                  <div className="al-icon">{a.days<0?'❌':'⚠️'}</div>
                  <div className="al-body"><div className="al-title">{a.p.fname} {a.p.lname} — {a.label}</div><div className="al-sub">{fmtDate(a.date)} · {a.days<0?`Expired ${Math.abs(a.days)}d ago`:`${a.days}d remaining`}</div></div>
                </div>
              )) : <div className="empty-state" style={{ padding:20 }}><div className="ei">✅</div><p>No active alerts</p></div>}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>📅 Upcoming Follow-ups</h3></div>
            <div className="card-body" style={{ maxHeight:200, overflowY:'auto' }}>
              {fu.length ? fu.slice(0,5).map((e,i) => {
                const d = daysUntil(e.followup)
                return <div key={i} className={`alert-item ${d<=0?'al-red':d<=7?'al-amber':'al-blue'}`}>
                  <div className="al-icon">📌</div>
                  <div className="al-body"><div className="al-title">{pNameShort(db.providers,e.provId)} × {payName(db.payers,e.payId)}</div><div className="al-sub">Follow-up {d<=0?`overdue by ${Math.abs(d)}d`:`in ${d}d`} · {fmtDate(e.followup)}</div></div>
                </div>
              }) : <div className="text-muted" style={{ padding:'8px 0' }}>No upcoming follow-ups in 14 days.</div>}
            </div>
          </div>
        </div>
        <div>
          <div className="card mb-16">
            <div className="card-header"><h3>📊 Enrollment Pipeline</h3></div>
            <div className="card-body">
              <div className="donut-wrap">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  {Object.entries(stages).map(([s,n],i) => {
                    const pct = (n/total)*circ; const el = <circle key={s} cx="50" cy="50" r={r} fill="none" stroke={colors[i%colors.length]} strokeWidth="12" strokeDasharray={`${pct} ${circ-pct}`} strokeDashoffset={-offset} style={{ transform:'rotate(-90deg)', transformOrigin:'50% 50%' }} />; offset -= pct; return el
                  })}
                  <text x="50" y="54" textAnchor="middle" fontFamily="Instrument Serif,serif" fontSize="18" fill="#0f1a0f">{db.enrollments.length}</text>
                </svg>
                <div className="donut-legend">
                  {Object.entries(stages).map(([s,n],i) => <div key={s} className="donut-legend-item"><div className="donut-legend-dot" style={{ background:colors[i%colors.length] }}></div><span style={{ flex:1, fontSize:'11.5px' }}>{s}</span><span style={{ fontWeight:600, fontSize:'11.5px' }}>{n}</span></div>)}
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>👥 Providers by Specialty</h3></div>
            <div className="card-body">
              {Object.entries(specs).map(([s,n]) => (
                <div key={s} className="stat-row"><span className="stat-row-label"><span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background: SPEC_COLORS[s]||'#6b7f6b', marginRight:8 }}></span>{s}</span><span className="stat-row-value">{n}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ALERTS PAGE ───────────────────────────────────────────────────────────────
function Alerts({ db }) {
  const alertDays = db.settings.alertDays || 90
  const caqhDays = db.settings.caqhDays || 30
  const items = []
  db.providers.forEach(p => {
    [{f:'licenseExp',l:'License',th:alertDays},{f:'malExp',l:'Malpractice Insurance',th:alertDays},{f:'deaExp',l:'DEA Certificate',th:alertDays},{f:'caqhDue',l:'CAQH Attestation',th:caqhDays},{f:'recred',l:'Recredentialing',th:alertDays},{f:'supExp',l:'Supervision Agreement',th:alertDays}].forEach(c => {
      if (!p[c.f]) return; const d = daysUntil(p[c.f]); if(d!==null && d<=c.th) items.push({ p, label:c.label, days:d, date:p[c.f] })
    })
  })
  items.sort((a,b) => a.days-b.days)
  const urgent = items.filter(a => a.days<=0)
  const critical = items.filter(a => a.days>0 && a.days<=30)
  const warning = items.filter(a => a.days>30 && a.days<=60)
  const notice = items.filter(a => a.days>60)
  function Section({ title, list, cls }) {
    if (!list.length) return null
    return <div className="mb-20">
      <div className="text-xs font-500" style={{ letterSpacing:'.6px', textTransform:'uppercase', color:'var(--ink-4)', marginBottom:10 }}>{title} ({list.length})</div>
      {list.map((a,i) => <div key={i} className={`alert-item ${cls}`}>
        <div className="al-icon">{a.days<0?'❌':'⚠️'}</div>
        <div className="al-body"><div className="al-title">{a.p.fname} {a.p.lname}{a.p.cred?', '+a.p.cred:''} — {a.label}</div><div className="al-sub">{fmtDate(a.date)} · {a.days<0?`Expired ${Math.abs(a.days)} days ago`:`${a.days} days remaining`}</div></div>
      </div>)}
    </div>
  }
  return <div className="page">
    {items.length ? <>
      <Section title="🔴 Expired / Overdue" list={urgent} cls="al-red" />
      <Section title="🟠 Critical — ≤30 Days" list={critical} cls="al-red" />
      <Section title="🟡 Warning — 31–60 Days" list={warning} cls="al-amber" />
      <Section title="📅 Notice — 61–90 Days" list={notice} cls="al-blue" />
    </> : <div className="empty-state"><div className="ei">✅</div><h4>No Active Alerts</h4><p>All credentials are within acceptable thresholds.</p></div>}
  </div>
}

// ─── PROVIDERS PAGE ────────────────────────────────────────────────────────────
function Providers({ db, search, setSearch, fStatus, setFStatus, fSpec, setFSpec, openProvDetail, editProvider, setPage, setProvForm, setEditingId, setNpiInput, setNpiResult }) {
  const list = db.providers.filter(p => {
    const txt = `${p.fname} ${p.lname} ${p.cred} ${p.npi} ${p.focus} ${p.spec}`.toLowerCase()
    return (!search || txt.includes(search.toLowerCase())) && (!fStatus || p.status===fStatus) && (!fSpec || p.spec===fSpec)
  })
  return <div className="page">
    <div className="toolbar">
      <div className="search-box"><span className="si">🔍</span><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search providers…" /></div>
      <select className="filter-select" value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="">All Statuses</option><option>Active</option><option>Pending</option><option>Inactive</option></select>
      <select className="filter-select" value={fSpec} onChange={e=>setFSpec(e.target.value)}><option value="">All Specialties</option><option>Mental Health</option><option>Massage Therapy</option><option>Naturopathic</option><option>Chiropractic</option><option>Acupuncture</option></select>
      <div className="toolbar-right"><button className="btn btn-primary btn-sm" onClick={()=>{setProvForm({});setEditingId(e=>({...e,provider:null}));setNpiInput('');setNpiResult(null);setPage('add-provider')}}>＋ Add Provider</button></div>
    </div>
    {!list.length ? <div className="empty-state"><div className="ei">👤</div><h4>No providers found</h4></div> : list.map(p => {
      const licD=daysUntil(p.licenseExp); const malD=daysUntil(p.malExp); const caqhD=daysUntil(p.caqhDue)
      const urgent=(licD!==null&&licD<=30)||(malD!==null&&malD<=30)||(caqhD!==null&&caqhD<=30)
      const activeP=db.enrollments.filter(e=>e.provId===p.id&&e.stage==='Active').length
      const totalP=db.enrollments.filter(e=>e.provId===p.id).length
      return <div key={p.id} className="prov-card" onClick={()=>openProvDetail(p.id)}>
        <div className="prov-avatar" style={{ background: SPEC_COLORS[p.spec]||'#6b7f6b' }}>{initials(p)}</div>
        <div>
          <div className="prov-name">{p.fname} {p.lname}</div>
          <div className="prov-title">{p.cred}{p.focus?' · '+p.focus:''}</div>
          <div className="prov-chips">
            <span className={`badge ${p.status==='Active'?'b-green':p.status==='Pending'?'b-amber':'b-gray'} badge-dot`}>{p.status}</span>
            <span className="badge b-gray">{p.spec}</span>
            {p.npi && <span className="info-chip">NPI: {p.npi}</span>}
            {activeP>0 && <span className="badge b-teal">{activeP}/{totalP} panels</span>}
            {urgent && <span className="badge b-red">⚠ Expiring Soon</span>}
            {p.supervisor && <span className="badge b-purple">Supervised</span>}
          </div>
        </div>
        <div className="prov-actions" onClick={e=>e.stopPropagation()}>
          <button className="btn btn-secondary btn-sm" onClick={()=>openProvDetail(p.id)}>View</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>editProvider(p.id)}>Edit</button>
        </div>
      </div>
    })}
  </div>
}

// ─── ADD / EDIT PROVIDER ───────────────────────────────────────────────────────
function AddProvider({ db, provForm, setProvForm, editingId, setEditingId, npiInput, setNpiInput, npiResult, setNpiResult, npiLoading, lookupNPI, handleSaveProvider, handleDeleteProvider, setPage, saving }) {
  const f = (k) => provForm[k] || ''
  const set = (k, v) => setProvForm(prev => ({ ...prev, [k]: v }))
  const inp = (k, placeholder, type='text', opts={}) => <input type={type} value={f(k)} onChange={e=>set(k,e.target.value)} placeholder={placeholder} {...opts} />
  const sel = (k, children) => <select value={f(k)} onChange={e=>set(k,e.target.value)}>{children}</select>
  return <div className="page">
    <div className="card" style={{ maxWidth:760 }}>
      <div className="card-header">
        <h3>{editingId.provider ? 'Edit Provider' : 'New Provider'}</h3>
        <div className="ch-meta">{editingId.provider ? `${f('fname')} ${f('lname')}` : 'Fill in provider details below'}</div>
      </div>
      <div className="card-body">
        <div className="mb-16 fg">
          <label>NPI Registry Lookup</label>
          <div style={{ display:'flex', gap:6 }}>
            <input type="text" value={npiInput} onChange={e=>setNpiInput(e.target.value)} placeholder="Enter NPI number to auto-fill…" maxLength={10} style={{ flex:1 }} />
            <button className="btn btn-green" onClick={lookupNPI} disabled={npiLoading}>{npiLoading ? '⏳ Searching…' : '🔍 Look Up NPI'}</button>
          </div>
          {npiResult && <div className={`npi-result-box show`} style={{ background: npiResult.error?'#fdf0f0':'var(--primary-ll)', border: `1px solid ${npiResult.error?'#f0c8c8':'#c8e6d4'}` }}>
            {npiResult.error ? <div style={{ color:'var(--red)', fontSize:'12.5px' }}>{npiResult.error}</div> : <>
              <div className="nr-name">{[npiResult.fname,npiResult.lname].filter(Boolean).join(' ')} {npiResult.cred?'· '+npiResult.cred:''}</div>
              <div className="nr-detail">{npiResult.spec} {npiResult.addr?' · '+npiResult.addr:''}</div>
            </>}
          </div>}
          <span className="field-note">Auto-fills name and credential from the NPPES National Provider Registry.</span>
        </div>
        <div className="form-grid">
          <div className="section-divider">Personal Information</div>
          <div className="fg"><label>First Name *</label>{inp('fname','Jane')}</div>
          <div className="fg"><label>Last Name *</label>{inp('lname','Smith')}</div>
          <div className="fg"><label>Credential / License Type</label>{sel('cred',<>
            <option value="LCSW">LCSW — Licensed Clinical Social Worker</option>
            <option value="LPC">LPC — Licensed Professional Counselor</option>
            <option value="LMFT">LMFT — Licensed Marriage & Family Therapist</option>
            <option value="MFT Associate">MFT Associate (Supervised)</option>
            <option value="LCSW Associate">LCSW Associate (Supervised)</option>
            <option value="Licensed Psychologist">Licensed Psychologist (PhD/PsyD)</option>
            <option value="PMHNP">PMHNP — Psychiatric Nurse Practitioner</option>
            <option value="Naturopathic Physician">Naturopathic Physician (ND)</option>
            <option value="Chiropractor">Chiropractor (DC)</option>
            <option value="Acupuncturist">Licensed Acupuncturist (LAc)</option>
            <option value="LMT">Licensed Massage Therapist (LMT)</option>
            <option value="MD">Medical Doctor (MD)</option>
            <option value="DO">Doctor of Osteopathy (DO)</option>
            <option value="Other">Other</option>
          </>)}</div>
          <div className="fg"><label>Specialty Category</label>{sel('spec',<>
            <option>Mental Health</option><option>Massage Therapy</option><option>Naturopathic</option><option>Chiropractic</option><option>Acupuncture</option>
          </>)}</div>
          <div className="fg"><label>Provider Status</label>{sel('status',<><option>Active</option><option>Pending</option><option>Inactive</option></>)}</div>
          <div className="fg"><label>Email</label>{inp('email','provider@pis.com','email')}</div>
          <div className="fg"><label>Phone</label>{inp('phone','(503) 000-0000','tel')}</div>
          <div className="fg full"><label>Specialty Focus</label>{inp('focus','Trauma, EMDR, Anxiety…')}</div>

          <div className="section-divider">Identification Numbers</div>
          <div className="fg"><label>NPI Number</label>{inp('npi','1234567890','text',{maxLength:10})}</div>
          <div className="fg"><label>CAQH ID</label>{inp('caqh','12345678')}</div>
          <div className="fg"><label>CAQH Attestation Date</label>{inp('caqhAttest','','date')}</div>
          <div className="fg"><label>Next CAQH Attestation Due</label>{inp('caqhDue','','date')}</div>
          <div className="fg"><label>Medicaid / DMAP ID</label>{inp('medicaid','OR1234567')}</div>
          <div className="fg"><label>Medicare PTAN</label>{inp('ptan','If applicable')}</div>
          <div className="fg"><label>State License Number</label>{inp('license','C12345')}</div>
          <div className="fg"><label>License Expiration *</label>{inp('licenseExp','','date')}</div>

          <div className="section-divider">Insurance & Malpractice</div>
          <div className="fg"><label>Malpractice Carrier</label>{inp('malCarrier','HPSO, CPH&A…')}</div>
          <div className="fg"><label>Malpractice Policy #</label>{inp('malPolicy','POL-123456')}</div>
          <div className="fg"><label>Malpractice Expiration *</label>{inp('malExp','','date')}</div>
          <div className="fg"><label>DEA Registration #</label>{inp('dea','AB1234567')}</div>
          <div className="fg"><label>DEA Expiration</label>{inp('deaExp','','date')}</div>
          <div className="fg"><label>Recredentialing Due Date</label>{inp('recred','','date')}</div>

          <div className="section-divider">Supervision (Associates Only)</div>
          <div className="fg"><label>Supervising Provider</label>{inp('supervisor','Name of supervisor')}</div>
          <div className="fg"><label>Supervision Expiration</label>{inp('supExp','','date')}</div>

          <div className="section-divider">Notes</div>
          <div className="fg full"><label>Internal Notes</label><textarea value={f('notes')} onChange={e=>set('notes',e.target.value)} placeholder="Any relevant credentialing notes…"></textarea></div>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:12 }}>
          <button className="btn btn-primary" onClick={handleSaveProvider} disabled={saving}>{saving?'Saving…':'Save Provider'}</button>
          <button className="btn btn-secondary" onClick={()=>setPage('providers')}>Cancel</button>
          {editingId.provider && <button className="btn btn-danger" style={{ marginLeft:'auto' }} onClick={()=>handleDeleteProvider(editingId.provider)} disabled={saving}>Delete Provider</button>}
        </div>
      </div>
    </div>
  </div>
}

// ─── ENROLLMENTS ───────────────────────────────────────────────────────────────
function Enrollments({ db, search, setSearch, fStage, setFStage, fProv, setFProv, openEnrollModal, handleDeleteEnrollment }) {
  const list = db.enrollments.filter(e => {
    const txt = `${pName(db.providers,e.provId)} ${payName(db.payers,e.payId)} ${e.stage} ${e.notes}`.toLowerCase()
    return (!search||txt.includes(search.toLowerCase())) && (!fStage||e.stage===fStage) && (!fProv||e.provId===fProv)
  })
  return <div className="page">
    <div className="toolbar">
      <div className="search-box"><span className="si">🔍</span><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search enrollments…" /></div>
      <select className="filter-select" value={fStage} onChange={e=>setFStage(e.target.value)}>
        <option value="">All Stages</option>
        {STAGES.map(s=><option key={s}>{s}</option>)}
      </select>
      <select className="filter-select" value={fProv} onChange={e=>setFProv(e.target.value)}>
        <option value="">All Providers</option>
        {db.providers.map(p=><option key={p.id} value={p.id}>{p.fname} {p.lname}</option>)}
      </select>
      <div className="toolbar-right"><button className="btn btn-primary btn-sm" onClick={()=>openEnrollModal()}>＋ New Enrollment</button></div>
    </div>
    <div className="tbl-wrap">
      <table><thead><tr><th>Provider</th><th>Payer</th><th>Stage</th><th>Submitted</th><th>Effective</th><th>EFT / ERA</th><th>Follow-up</th><th>Actions</th></tr></thead>
        <tbody>
          {!list.length ? <tr><td colSpan={8}><div className="empty-state"><div className="ei">🏥</div><h4>No enrollments found</h4></div></td></tr> : list.map(e => {
            const fuD = daysUntil(e.followup)
            const fuCls = fuD!==null&&fuD<=0?'b-red':fuD!==null&&fuD<=7?'b-amber':'b-blue'
            return <tr key={e.id}>
              <td><strong>{pNameShort(db.providers,e.provId)}</strong><div className="text-xs text-muted">{db.providers.find(x=>x.id===e.provId)?.cred||''}</div></td>
              <td>{payName(db.payers,e.payId)}</td>
              <td><StageBadge stage={e.stage} /></td>
              <td style={{ whiteSpace:'nowrap' }}>{fmtDate(e.submitted)}</td>
              <td style={{ whiteSpace:'nowrap' }}>{fmtDate(e.effective)}</td>
              <td><div style={{ display:'flex', gap:4 }}><Badge cls={e.eft==='Active'?'b-green':'b-gray'}>EFT: {e.eft}</Badge><Badge cls={e.era==='Active'?'b-green':'b-gray'}>ERA: {e.era}</Badge></div></td>
              <td style={{ whiteSpace:'nowrap' }}>{e.followup?<Badge cls={fuCls}>{fmtDate(e.followup)}</Badge>:'—'}</td>
              <td><div style={{ display:'flex', gap:6 }}>
                <button className="btn btn-secondary btn-sm" onClick={()=>openEnrollModal(e.id)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={()=>handleDeleteEnrollment(e.id)}>Del</button>
              </div></td>
            </tr>
          })}
        </tbody>
      </table>
    </div>
  </div>
}

// ─── PAYERS ────────────────────────────────────────────────────────────────────
function Payers({ db, search, setSearch, fType, setFType, openPayerModal, handleDeletePayer }) {
  const list = db.payers.filter(p => `${p.name} ${p.payerId} ${p.type}`.toLowerCase().includes(search.toLowerCase()) && (!fType||p.type===fType))
  return <div className="page">
    <div className="toolbar">
      <div className="search-box"><span className="si">🔍</span><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search payers…" /></div>
      <select className="filter-select" value={fType} onChange={e=>setFType(e.target.value)}><option value="">All Types</option><option>Commercial</option><option>Medicaid</option><option>Medicare</option><option>Medicare Advantage</option><option>EAP</option><option>Other</option></select>
      <div className="toolbar-right"><button className="btn btn-primary btn-sm" onClick={()=>openPayerModal()}>＋ Add Payer</button></div>
    </div>
    <div className="tbl-wrap">
      <table><thead><tr><th>Payer Name</th><th>Payer ID</th><th>Type</th><th>Phone</th><th>Portal</th><th>Timeline</th><th>Notes</th><th>Actions</th></tr></thead>
        <tbody>
          {!list.length ? <tr><td colSpan={8}><div className="empty-state"><div className="ei">🗂</div><h4>No payers found</h4></div></td></tr> : list.map(p => (
            <tr key={p.id}>
              <td><strong>{p.name}</strong></td>
              <td><code style={{ background:'var(--surface-2)', padding:'2px 6px', borderRadius:4, fontSize:'11.5px' }}>{p.payerId||'—'}</code></td>
              <td><Badge cls="b-blue">{p.type}</Badge></td>
              <td>{p.phone||'—'}</td>
              <td>{p.portal?<a href={p.portal} target="_blank" rel="noreferrer" style={{ color:'var(--primary)', fontSize:'12px' }}>Portal ↗</a>:'—'}</td>
              <td><Badge cls="b-gray">{p.timeline||'—'}</Badge></td>
              <td style={{ maxWidth:180, fontSize:12, color:'var(--ink-4)' }}>{p.notes?p.notes.slice(0,70)+(p.notes.length>70?'…':''):'—'}</td>
              <td><div style={{ display:'flex', gap:6 }}>
                <button className="btn btn-secondary btn-sm" onClick={()=>openPayerModal(p.id)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={()=>handleDeletePayer(p.id)}>Del</button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
}

// ─── DOCUMENTS ─────────────────────────────────────────────────────────────────
function Documents({ db, search, setSearch, fType, setFType, fStatus, setFStatus, openDocModal, handleDeleteDocument }) {
  const list = db.documents.filter(d => {
    const txt = `${pName(db.providers,d.provId)} ${d.type} ${d.issuer} ${d.number}`.toLowerCase()
    if (!txt.includes(search.toLowerCase())) return false
    if (fType && d.type !== fType) return false
    if (fStatus) {
      const days = daysUntil(d.exp)
      if (fStatus==='expired' && (days===null||days>=0)) return false
      if (fStatus==='critical' && (days===null||days<0||days>30)) return false
      if (fStatus==='warning' && (days===null||days<0||days>90)) return false
      if (fStatus==='ok' && (days===null||days<=90)) return false
    }
    return true
  }).sort((a,b) => (daysUntil(a.exp)||9999)-(daysUntil(b.exp)||9999))
  return <div className="page">
    <div className="toolbar">
      <div className="search-box"><span className="si">🔍</span><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents…" /></div>
      <select className="filter-select" value={fType} onChange={e=>setFType(e.target.value)}><option value="">All Types</option><option>License</option><option>Malpractice</option><option>DEA</option><option>CAQH Attestation</option><option>Recredentialing</option><option>Supervision Agreement</option><option>Other</option></select>
      <select className="filter-select" value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="">All</option><option value="expired">Expired</option><option value="critical">Critical (≤30d)</option><option value="warning">Warning (≤90d)</option><option value="ok">OK</option></select>
      <div className="toolbar-right"><button className="btn btn-primary btn-sm" onClick={()=>openDocModal()}>＋ Add Document</button></div>
    </div>
    <div className="tbl-wrap">
      <table><thead><tr><th>Provider</th><th>Type</th><th>Issuer</th><th>Number</th><th>Expiration</th><th>Days Left</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {!list.length ? <tr><td colSpan={8}><div className="empty-state"><div className="ei">📎</div><h4>No documents found</h4></div></td></tr> : list.map(d => {
            const days = daysUntil(d.exp)
            const statusCls = days===null?'b-gray':days<0?'b-red':days<=30?'b-red':days<=90?'b-amber':'b-green'
            return <tr key={d.id}>
              <td><strong>{pNameShort(db.providers,d.provId)}</strong></td>
              <td>{d.type}</td>
              <td>{d.issuer||'—'}</td>
              <td style={{ fontSize:12 }}>{d.number||'—'}</td>
              <td style={{ whiteSpace:'nowrap' }}>{fmtDate(d.exp)}</td>
              <td style={{ fontWeight:600, color: days!==null&&days<=30?'var(--red)':days!==null&&days<=90?'var(--amber)':'var(--ink-3)' }}>{days===null?'—':days<0?`−${Math.abs(days)}`:''+days}</td>
              <td><Badge cls={statusCls}>{days===null?'Not Set':days<0?'Expired':'Active'}</Badge> <ExpiryBadge date={d.exp} /></td>
              <td><div style={{ display:'flex', gap:6 }}>
                <button className="btn btn-secondary btn-sm" onClick={()=>openDocModal(d.id)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={()=>handleDeleteDocument(d.id)}>Del</button>
              </div></td>
            </tr>
          })}
        </tbody>
      </table>
    </div>
  </div>
}

// ─── WORKFLOWS ─────────────────────────────────────────────────────────────────
function Workflows({ db, search, setSearch, fPriority, setFPriority, fStatus, setFStatus, openTaskModal, handleMarkDone, handleDeleteTask }) {
  const list = db.tasks.filter(t => {
    const txt = `${t.task} ${pName(db.providers,t.provId)} ${payName(db.payers,t.payId)} ${t.cat}`.toLowerCase()
    return txt.includes(search.toLowerCase()) && (!fPriority||t.priority===fPriority) && (!fStatus||t.status===fStatus)
  }).sort((a,b) => {
    const pd={Urgent:0,High:1,Medium:2,Low:3}; const sd={Open:0,'In Progress':1,Waiting:2,Done:3}
    if(a.status!==b.status) return sd[a.status]-sd[b.status]
    if(a.priority!==b.priority) return pd[a.priority]-pd[b.priority]
    return (a.due||'').localeCompare(b.due||'')
  })
  return <div className="page">
    <div className="toolbar">
      <div className="search-box"><span className="si">🔍</span><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks…" /></div>
      <select className="filter-select" value={fPriority} onChange={e=>setFPriority(e.target.value)}><option value="">All Priorities</option><option>Urgent</option><option>High</option><option>Medium</option><option>Low</option></select>
      <select className="filter-select" value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="">All Statuses</option><option>Open</option><option>In Progress</option><option>Waiting</option><option>Done</option></select>
      <div className="toolbar-right"><button className="btn btn-primary btn-sm" onClick={()=>openTaskModal()}>＋ New Task</button></div>
    </div>
    <div className="tbl-wrap">
      <table><thead><tr><th>Due Date</th><th>Task</th><th>Provider</th><th>Payer</th><th>Priority</th><th>Status</th><th>Category</th><th>Actions</th></tr></thead>
        <tbody>
          {!list.length ? <tr><td colSpan={8}><div className="empty-state"><div className="ei">⚡</div><h4>No tasks found</h4></div></td></tr> : list.map(t => {
            const dd = daysUntil(t.due)
            const dCls = dd!==null&&dd<=0?'b-red':dd!==null&&dd<=3?'b-amber':'b-gray'
            const dTxt = dd!==null&&dd<0?`${Math.abs(dd)}d overdue`:dd===0?'Today':dd!==null?`${dd}d`:'—'
            return <tr key={t.id} style={{ opacity: t.status==='Done' ? 0.55 : 1 }}>
              <td><Badge cls={dCls}>{fmtDate(t.due)} · {dTxt}</Badge></td>
              <td style={{ maxWidth:260 }}><div style={{ fontSize:13, fontWeight: t.status!=='Done'?'500':'400' }}>{t.task}</div>{t.notes&&<div className="text-xs text-muted">{t.notes.slice(0,60)}</div>}</td>
              <td>{t.provId ? pNameShort(db.providers,t.provId) : '—'}</td>
              <td>{t.payId ? payName(db.payers,t.payId) : '—'}</td>
              <td><Badge cls={PRIORITY_COLOR[t.priority]||'b-gray'}>{t.priority}</Badge></td>
              <td><Badge cls={STATUS_COLOR[t.status]||'b-gray'}>{t.status}</Badge></td>
              <td><Badge cls="b-gray">{t.cat}</Badge></td>
              <td><div style={{ display:'flex', gap:6 }}>
                {t.status!=='Done' && <button className="btn btn-green btn-sm" onClick={()=>handleMarkDone(t.id,t.task)}>✓</button>}
                <button className="btn btn-secondary btn-sm" onClick={()=>openTaskModal(t.id)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={()=>handleDeleteTask(t.id)}>Del</button>
              </div></td>
            </tr>
          })}
        </tbody>
      </table>
    </div>
  </div>
}

// ─── REPORTS ───────────────────────────────────────────────────────────────────
function Reports({ db, exportJSON }) {
  const stages = {}; db.enrollments.forEach(e => { stages[e.stage]=(stages[e.stage]||0)+1 })
  const total = db.providers.length||1
  const compliant = db.providers.filter(p => { const l=daysUntil(p.licenseExp); const m=daysUntil(p.malExp); const c=daysUntil(p.caqhDue); return (l===null||l>0)&&(m===null||m>0)&&(c===null||c>0) }).length
  const pct = Math.round((compliant/total)*100)
  const done = db.tasks.filter(t=>t.status==='Done').length; const tTotal=db.tasks.length||1; const tPct=Math.round((done/tTotal)*100)
  const panels = {}; db.enrollments.filter(e=>e.stage==='Active').forEach(e=>{ panels[e.payId]=(panels[e.payId]||0)+1 })
  return <div className="page">
    <div className="grid-2 mb-20">
      <div className="card"><div className="card-header"><h3>📈 Enrollment Summary</h3></div><div className="card-body">{Object.entries(stages).map(([s,n])=><div key={s} className="stat-row"><span className="stat-row-label"><StageBadge stage={s} /></span><span className="stat-row-value">{n}</span></div>)}</div></div>
      <div className="card"><div className="card-header"><h3>📋 Provider Compliance Rate</h3></div><div className="card-body">
        <div style={{ fontFamily:'Instrument Serif,serif', fontSize:48, lineHeight:1 }}>{pct}%</div>
        <div className="text-muted mb-12">{compliant} of {total} providers fully compliant</div>
        <div style={{ height:8, background:'var(--line)', borderRadius:4, overflow:'hidden' }}><div style={{ height:'100%', width:`${pct}%`, background: pct>=80?'var(--accent)':pct>=60?'var(--amber)':'var(--red)', borderRadius:4 }}></div></div>
      </div></div>
    </div>
    <div className="grid-2">
      <div className="card"><div className="card-header"><h3>⚡ Task Completion</h3></div><div className="card-body">
        <div style={{ fontFamily:'Instrument Serif,serif', fontSize:48, lineHeight:1 }}>{tPct}%</div>
        <div className="text-muted mb-12">{done} of {tTotal} tasks completed</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>{['Open','In Progress','Waiting','Done'].map(s=><div key={s}><Badge cls={STATUS_COLOR[s]||'b-gray'}>{s}</Badge> <strong>{db.tasks.filter(t=>t.status===s).length}</strong></div>)}</div>
      </div></div>
      <div className="card"><div className="card-header"><h3>🏥 Active Panels by Payer</h3></div><div className="card-body">{Object.entries(panels).sort((a,b)=>b[1]-a[1]).map(([payId,n])=><div key={payId} className="stat-row"><span className="stat-row-label">{payName(db.payers,payId)}</span><span className="stat-row-value">{n} provider{n>1?'s':''}</span></div>)}</div></div>
    </div>
    <div className="card mt-12"><div className="card-header"><h3>📤 Export Reports</h3></div><div className="card-body">
      <div className="grid-3">
        {[['👤 Provider Roster','All providers with license & expiry details'],['🏥 Enrollment Status','All payer enrollments by stage'],['📅 Expiration Report','All credentials expiring within 90 days'],['⚡ Open Tasks','All pending and in-progress tasks'],['💾 Full Data Backup','Export all data as a JSON backup file']].map(([h,p])=>(
          <div key={h} className="report-card" onClick={exportJSON}><h4>{h}</h4><p>{p}</p></div>
        ))}
      </div>
    </div></div>
  </div>
}

// ─── AUDIT ─────────────────────────────────────────────────────────────────────
function Audit({ db, search, setSearch, fType, setFType, handleClearAudit }) {
  const typeColor = { Provider:'b-purple', Enrollment:'b-blue', Document:'b-teal', Task:'b-green', Payer:'b-gold', Settings:'b-gray' }
  const list = db.auditLog.filter(a => `${a.type} ${a.action} ${a.detail}`.toLowerCase().includes(search.toLowerCase()) && (!fType||a.type===fType))
  return <div className="page">
    <div className="toolbar">
      <div className="search-box"><span className="si">🔍</span><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search audit log…" /></div>
      <select className="filter-select" value={fType} onChange={e=>setFType(e.target.value)}><option value="">All Actions</option><option value="Provider">Provider</option><option value="Enrollment">Enrollment</option><option value="Document">Document</option><option value="Task">Task</option><option value="Payer">Payer</option></select>
      <div className="toolbar-right"><button className="btn btn-secondary btn-sm" onClick={handleClearAudit}>Clear Log</button></div>
    </div>
    <div className="card"><div className="card-body" style={{ maxHeight:600, overflowY:'auto' }}>
      {!list.length ? <div className="empty-state"><div className="ei">📋</div><h4>No audit entries</h4></div> : list.map(a => (
        <div key={a.id} className="audit-entry">
          <div className="audit-dot"></div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <Badge cls={typeColor[a.type]||'b-gray'}>{a.type}</Badge>
              <span style={{ fontWeight:500, fontSize:'12.5px' }}>{a.action}</span>
              <span style={{ marginLeft:'auto', color:'var(--ink-4)', fontSize:'11px', whiteSpace:'nowrap' }}>{fmtTS(a.ts)}</span>
            </div>
            <div style={{ fontSize:'12.5px', color:'var(--ink-2)' }}>{a.detail||'—'}</div>
          </div>
        </div>
      ))}
    </div></div>
  </div>
}

// ─── SETTINGS ──────────────────────────────────────────────────────────────────
function Settings({ settingsForm, setSettingsForm, handleSaveSettings, exportJSON }) {
  const f = k => settingsForm[k] ?? ''
  const set = (k, v) => setSettingsForm(prev => ({ ...prev, [k]: v }))
  return <div className="page">
    <div className="grid-2">
      <div className="card"><div className="card-header"><h3>🏢 Practice Information</h3></div><div className="card-body">
        <div className="form-grid">
          <div className="fg full"><label>Practice Name</label><input type="text" value={f('practice')} onChange={e=>set('practice',e.target.value)} /></div>
          <div className="fg full"><label>Address</label><input type="text" value={f('address')} onChange={e=>set('address',e.target.value)} /></div>
          <div className="fg"><label>Phone</label><input type="tel" value={f('phone')} onChange={e=>set('phone',e.target.value)} /></div>
          <div className="fg"><label>Intake Email</label><input type="email" value={f('email')} onChange={e=>set('email',e.target.value)} /></div>
        </div>
        <button className="btn btn-primary mt-12" onClick={handleSaveSettings}>Save</button>
      </div></div>
      <div className="card"><div className="card-header"><h3>⚠️ Alert Thresholds</h3></div><div className="card-body">
        <div className="form-grid">
          <div className="fg"><label>License / Malpractice alert (days)</label><input type="number" value={f('alertDays')} onChange={e=>set('alertDays',parseInt(e.target.value)||90)} min={30} max={365} /></div>
          <div className="fg"><label>CAQH attestation alert (days)</label><input type="number" value={f('caqhDays')} onChange={e=>set('caqhDays',parseInt(e.target.value)||30)} min={7} max={90} /></div>
        </div>
        <button className="btn btn-primary mt-12" onClick={handleSaveSettings}>Save</button>
      </div></div>
    </div>
    <div className="card mt-12"><div className="card-header"><h3>⚡ Data Management</h3></div><div className="card-body">
      <div style={{ display:'flex', gap:8 }}>
        <button className="btn btn-secondary" onClick={exportJSON}>⬇ Export Backup</button>
      </div>
    </div></div>
  </div>
}

// ─── MODALS ────────────────────────────────────────────────────────────────────
function Modal({ onClose, title, sub, children, footer, lg }) {
  return <div className="overlay open" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className={`modal ${lg?'modal-lg':''}`}>
      <div className="modal-header">
        <div><h3>{title}</h3>{sub&&<div className="mh-sub">{sub}</div>}</div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">{children}</div>
      <div className="modal-footer">{footer}</div>
    </div>
  </div>
}

function EnrollModal({ db, enrollForm, setEnrollForm, editingId, handleSaveEnrollment, onClose, saving }) {
  const f = k => enrollForm[k] ?? ''
  const set = (k, v) => setEnrollForm(prev => ({ ...prev, [k]: v }))
  const stageIdx = STAGES.indexOf(f('stage'))
  return <Modal title={editingId.enrollment?'Edit Enrollment':'New Payer Enrollment'} sub={editingId.enrollment?`${pNameShort(db.providers,f('provId'))} × ${payName(db.payers,f('payId'))}`:''}
    onClose={onClose}
    footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSaveEnrollment} disabled={saving}>{saving?'Saving…':'Save Enrollment'}</button></>}>
    <div className="mb-16">
      <div className="text-xs text-muted mb-8" style={{ fontWeight:600, letterSpacing:'.6px', textTransform:'uppercase' }}>Enrollment Stage</div>
      <div className="workflow-steps">
        {STAGES.filter(s=>s!=='Denied').map((s,i)=>(
          <div key={s} className={`ws ${stageIdx>i?'done':stageIdx===i?'active':''}`}>
            <div className="ws-dot">{stageIdx>i?'✓':i+1}</div>
            <div className="ws-label">{s.split('–')[0].trim()}</div>
          </div>
        ))}
      </div>
    </div>
    <div className="form-grid">
      <div className="fg"><label>Provider *</label><select value={f('provId')} onChange={e=>set('provId',e.target.value)}><option value="">— Select —</option>{db.providers.map(p=><option key={p.id} value={p.id}>{p.fname} {p.lname}, {p.cred}</option>)}</select></div>
      <div className="fg"><label>Payer *</label><select value={f('payId')} onChange={e=>set('payId',e.target.value)}><option value="">— Select —</option>{db.payers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="fg"><label>Stage</label><select value={f('stage')} onChange={e=>set('stage',e.target.value)}>{STAGES.map(s=><option key={s}>{s}</option>)}</select></div>
      <div className="fg"><label>Date Submitted</label><input type="date" value={f('submitted')} onChange={e=>set('submitted',e.target.value)} /></div>
      <div className="fg"><label>Effective Date</label><input type="date" value={f('effective')} onChange={e=>set('effective',e.target.value)} /></div>
      <div className="fg"><label>Recredentialing Due</label><input type="date" value={f('recred')} onChange={e=>set('recred',e.target.value)} /></div>
      <div className="fg"><label>EFT Status</label><select value={f('eft')} onChange={e=>set('eft',e.target.value)}><option>Not Set Up</option><option>Submitted</option><option>Active</option></select></div>
      <div className="fg"><label>ERA Status</label><select value={f('era')} onChange={e=>set('era',e.target.value)}><option>Not Set Up</option><option>Submitted</option><option>Active</option></select></div>
      <div className="fg"><label>Follow-up Date</label><input type="date" value={f('followup')} onChange={e=>set('followup',e.target.value)} /></div>
      <div className="fg"><label>Contract Received</label><select value={f('contract')} onChange={e=>set('contract',e.target.value)}><option value="No">No</option><option value="Yes">Yes</option></select></div>
      <div className="fg full"><label>Notes / Audit Entry</label><textarea value={f('notes')} onChange={e=>set('notes',e.target.value)} placeholder="Add a note (logged to audit trail)…"></textarea></div>
    </div>
  </Modal>
}

function PayerModal({ payerForm, setPayerForm, editingId, handleSavePayer, onClose, saving }) {
  const f = k => payerForm[k] ?? ''
  const set = (k, v) => setPayerForm(prev => ({ ...prev, [k]: v }))
  return <Modal title={editingId.payer?'Edit Payer':'Add Payer'} onClose={onClose}
    footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSavePayer} disabled={saving}>{saving?'Saving…':'Save Payer'}</button></>}>
    <div className="form-grid">
      <div className="fg full"><label>Payer Name *</label><input type="text" value={f('name')} onChange={e=>set('name',e.target.value)} placeholder="Aetna" /></div>
      <div className="fg"><label>Payer ID / EDI ID</label><input type="text" value={f('payerId')} onChange={e=>set('payerId',e.target.value)} placeholder="60054" /></div>
      <div className="fg"><label>Type</label><select value={f('type')} onChange={e=>set('type',e.target.value)}><option>Commercial</option><option>Medicaid</option><option>Medicare</option><option>Medicare Advantage</option><option>EAP</option><option>Other</option></select></div>
      <div className="fg"><label>Provider Relations Phone</label><input type="tel" value={f('phone')} onChange={e=>set('phone',e.target.value)} /></div>
      <div className="fg"><label>Credentialing Email</label><input type="email" value={f('email')} onChange={e=>set('email',e.target.value)} /></div>
      <div className="fg"><label>Provider Portal URL</label><input type="text" value={f('portal')} onChange={e=>set('portal',e.target.value)} placeholder="https://…" /></div>
      <div className="fg"><label>Avg. Credentialing Timeline</label><select value={f('timeline')} onChange={e=>set('timeline',e.target.value)}><option>30–45 days</option><option>45–60 days</option><option>60–90 days</option><option>90–120 days</option><option>120+ days</option></select></div>
      <div className="fg full"><label>Notes</label><textarea value={f('notes')} onChange={e=>set('notes',e.target.value)} placeholder="Submission requirements, contacts…"></textarea></div>
    </div>
  </Modal>
}

function DocModal({ db, docForm, setDocForm, editingId, handleSaveDocument, onClose, saving }) {
  const f = k => docForm[k] ?? ''
  const set = (k, v) => setDocForm(prev => ({ ...prev, [k]: v }))
  return <Modal title={editingId.doc?'Edit Document':'Add Document / Credential'} onClose={onClose}
    footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSaveDocument} disabled={saving}>{saving?'Saving…':'Save Document'}</button></>}>
    <div className="form-grid">
      <div className="fg"><label>Provider *</label><select value={f('provId')} onChange={e=>set('provId',e.target.value)}><option value="">— Select Provider —</option>{db.providers.map(p=><option key={p.id} value={p.id}>{p.fname} {p.lname}</option>)}</select></div>
      <div className="fg"><label>Document Type *</label><select value={f('type')} onChange={e=>set('type',e.target.value)}><option>License</option><option>Malpractice</option><option>DEA</option><option>CAQH Attestation</option><option>Recredentialing</option><option>Supervision Agreement</option><option>NPI Letter</option><option>W-9</option><option>CV / Resume</option><option>Other</option></select></div>
      <div className="fg"><label>Issuer / Carrier</label><input type="text" value={f('issuer')} onChange={e=>set('issuer',e.target.value)} placeholder="OBRC, HPSO…" /></div>
      <div className="fg"><label>License / Policy Number</label><input type="text" value={f('number')} onChange={e=>set('number',e.target.value)} /></div>
      <div className="fg"><label>Issue Date</label><input type="date" value={f('issue')} onChange={e=>set('issue',e.target.value)} /></div>
      <div className="fg"><label>Expiration Date *</label><input type="date" value={f('exp')} onChange={e=>set('exp',e.target.value)} /></div>
      <div className="fg full"><label>Notes</label><textarea value={f('notes')} onChange={e=>set('notes',e.target.value)} style={{ minHeight:56 }}></textarea></div>
    </div>
  </Modal>
}

function TaskModal({ db, taskForm, setTaskForm, editingId, handleSaveTask, onClose, saving }) {
  const f = k => taskForm[k] ?? ''
  const set = (k, v) => setTaskForm(prev => ({ ...prev, [k]: v }))
  return <Modal title={editingId.task?'Edit Task':'New Task'} onClose={onClose}
    footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSaveTask} disabled={saving}>{saving?'Saving…':'Save Task'}</button></>}>
    <div className="form-grid">
      <div className="fg full"><label>Task Description *</label><input type="text" value={f('task')} onChange={e=>set('task',e.target.value)} placeholder="Follow up with Aetna re: enrollment…" /></div>
      <div className="fg"><label>Due Date *</label><input type="date" value={f('due')} onChange={e=>set('due',e.target.value)} /></div>
      <div className="fg"><label>Priority</label><select value={f('priority')} onChange={e=>set('priority',e.target.value)}><option>Urgent</option><option>High</option><option>Medium</option><option>Low</option></select></div>
      <div className="fg"><label>Status</label><select value={f('status')} onChange={e=>set('status',e.target.value)}><option>Open</option><option>In Progress</option><option>Waiting</option><option>Done</option></select></div>
      <div className="fg"><label>Category</label><select value={f('cat')} onChange={e=>set('cat',e.target.value)}><option>Follow-up</option><option>Application</option><option>Document Renewal</option><option>Recredentialing</option><option>Enrollment</option><option>Internal</option><option>Other</option></select></div>
      <div className="fg"><label>Provider (optional)</label><select value={f('provId')} onChange={e=>set('provId',e.target.value)}><option value="">— None —</option>{db.providers.map(p=><option key={p.id} value={p.id}>{p.fname} {p.lname}</option>)}</select></div>
      <div className="fg"><label>Payer (optional)</label><select value={f('payId')} onChange={e=>set('payId',e.target.value)}><option value="">— None —</option>{db.payers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="fg full"><label>Notes</label><textarea value={f('notes')} onChange={e=>set('notes',e.target.value)} style={{ minHeight:56 }}></textarea></div>
    </div>
  </Modal>
}

function ProvDetailModal({ prov, db, tab, setTab, onClose, editProvider, openEnrollModal }) {
  const enrs = db.enrollments.filter(e => e.provId === prov.id)
  const docs = db.documents.filter(d => d.provId === prov.id)
  const tabs = [['profile','Profile'],['creds','Credentials'],['enrollments',`Enrollments (${enrs.length})`],['documents',`Documents (${docs.length})`]]
  return <Modal lg title={`${prov.fname} ${prov.lname}, ${prov.cred}`} sub={`${prov.spec} · ${prov.status}`} onClose={onClose}
    footer={<><button className="btn btn-ghost" onClick={onClose}>Close</button><button className="btn btn-secondary" onClick={()=>{onClose();editProvider(prov.id)}}>Edit Provider</button><button className="btn btn-primary" onClick={()=>{onClose();openEnrollModal(null,prov.id)}}>＋ Add Enrollment</button></>}>
    <div className="tabs">{tabs.map(([k,l])=><div key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</div>)}</div>
    {tab==='profile' && <div className="grid-2" style={{ gap:12 }}>
      <div className="fg"><div className="text-xs text-muted">Email</div><div>{prov.email||'—'}</div></div>
      <div className="fg"><div className="text-xs text-muted">Phone</div><div>{prov.phone||'—'}</div></div>
      <div className="fg"><div className="text-xs text-muted">Specialty Focus</div><div>{prov.focus||'—'}</div></div>
      <div className="fg"><div className="text-xs text-muted">Supervisor</div><div>{prov.supervisor||'—'}</div></div>
      {prov.notes && <div className="fg full"><div className="text-xs text-muted">Notes</div><div style={{ fontSize:13, color:'var(--ink-2)', background:'var(--surface-2)', padding:'10px 12px', borderRadius:8 }}>{prov.notes}</div></div>}
    </div>}
    {tab==='creds' && <div className="grid-2" style={{ gap:12 }}>
      {[['NPI',prov.npi],['CAQH ID',prov.caqh],['CAQH Due',prov.caqhDue?`${fmtDate(prov.caqhDue)} `:null],['Medicaid / DMAP',prov.medicaid],['Medicare PTAN',prov.ptan],['License #',prov.license],['License Exp',prov.licenseExp?fmtDate(prov.licenseExp):null],['Malpractice',prov.malCarrier?`${prov.malCarrier} (${prov.malPolicy})`:null],['Mal. Exp',prov.malExp?fmtDate(prov.malExp):null],['DEA #',prov.dea],['DEA Exp',prov.deaExp?fmtDate(prov.deaExp):null],['Recredentialing Due',prov.recred?fmtDate(prov.recred):null]].map(([l,v])=>(
        <div key={l} className="fg"><div className="text-xs text-muted">{l}</div><div style={{ display:'flex', alignItems:'center', gap:6 }}>{v||'—'}{['CAQH Due','License Exp','Mal. Exp','DEA Exp','Recredentialing Due'].includes(l)&&<ExpiryBadge date={prov[{['CAQH Due']:'caqhDue',['License Exp']:'licenseExp',['Mal. Exp']:'malExp',['DEA Exp']:'deaExp',['Recredentialing Due']:'recred'}[l]]} />}</div></div>
      ))}
    </div>}
    {tab==='enrollments' && (!enrs.length ? <div className="text-muted" style={{ padding:'12px 0' }}>No enrollments on file.</div> : enrs.map(e=>(
      <div key={e.id} style={{ padding:'10px 0', borderBottom:'1px solid var(--line-2)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}><strong style={{ flex:1 }}>{payName(db.payers,e.payId)}</strong><StageBadge stage={e.stage} /></div>
        <div className="text-sm text-muted">Submitted: {fmtDate(e.submitted)} · Effective: {fmtDate(e.effective)} · EFT: {e.eft} · ERA: {e.era}</div>
        {e.followup && <div className="text-sm text-muted">Follow-up: {fmtDate(e.followup)}</div>}
      </div>
    )))}
    {tab==='documents' && (!docs.length ? <div className="text-muted" style={{ padding:'12px 0' }}>No documents on file.</div> : docs.map(d=>(
      <div key={d.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--line-2)' }}>
        <div style={{ width:34, height:34, borderRadius:8, background:'var(--blue-l)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>📄</div>
        <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500 }}>{d.type}</div><div className="text-xs text-muted">{d.issuer} {d.number?'· '+d.number:''}</div></div>
        <ExpiryBadge date={d.exp} />
      </div>
    )))}
  </Modal>
}


// ═══════════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════════
