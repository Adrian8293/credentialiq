import { useState, useEffect, useCallback, useRef } from 'react'
import { Providers } from '../features/providers/index.jsx'
import { NpiLookupPanel } from '../features/providers/NpiLookupPanel.jsx'
import { AddProvider } from '../features/providers/AddProvider.jsx'
import { NpiSyncModal } from '../features/providers/NpiSyncModal.jsx'
import { ProvDetailModal } from '../features/providers/ProvDetailModal.jsx'
import { ProviderLookup } from '../features/providers/ProviderLookup.jsx'
import { Enrollments } from '../features/enrollments/index.jsx'
import { EnrollmentsTab } from '../features/enrollments/EnrollmentsTab.jsx'
import { EnrollModal } from '../features/enrollments/EnrollModal.jsx'
import { KanbanPipeline } from '../features/enrollments/KanbanPipeline.jsx'
import { useSorted } from '../hooks/useSorted.js'
import { useAuth } from '../hooks/useAuth.js'
import { useToast } from '../hooks/useToast.js'
import { Modal, DrawerModal } from '../components/ui/Modal.jsx'
import { Badge, ExpiryBadge, StageBadge } from '../components/ui/Badge.jsx'
import { Sidebar } from '../components/ui/Sidebar.jsx'
import { Topbar } from '../components/ui/Topbar.jsx'
import { GlobalSearch } from '../components/GlobalSearch.jsx'
import { STAGES, KANBAN_COLUMNS, PAYER_REQUIREMENTS, STAGE_COLOR, SPEC_COLORS, PRIORITY_COLOR, STATUS_COLOR, BADGE_CLASS } from '../constants/stages.js'
import { DENIAL_CODES, AGING_BUCKETS, getAgingBucket } from '../constants/rcm.js'
import { PAYER_CATALOG, REQUIRED_DOCS } from '../constants/payerRequirements.js'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import EnrollmentKanban from '../components/EnrollmentKanban'
import OpcaUploadPanel from '../components/OpcaUploadPanel'
import {
  WorkflowDashboard,
  WorkflowProviderCard,
  WorkflowTasks,
  WorkflowDocuments,
  ProviderCommandCenter,
  ReadinessRing,
  NextActionBanner,
  ProviderReadinessBar,
  EnrollmentStageBar,
  SLABadge,
  providerReadiness,
} from '../components/WorkflowOverhaul'
import {
  loadAll, upsertProvider, deleteProvider,
  upsertPayer, deletePayer,
  upsertEnrollment, deleteEnrollment,
  upsertDocument, deleteDocument,
  upsertTask, deleteTask, markTaskDone,
  fetchAuditLog, clearAuditLog as clearAuditLogDB,
  uploadProviderPhoto, deleteProviderPhoto,
  saveSettings as saveSettingsDB,
  subscribeToAll, mergeRealtimeChange, addAudit,
  upsertEligibilityCheck, deleteEligibilityCheck,
  upsertClaim, deleteClaim,
  upsertDenial, deleteDenial,
  upsertPayment,
} from '../lib/db'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
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
  { fname:'Sarah', lname:'Chen', cred:'LCSW', spec:'Mental Health', status:'Active', email:'', phone:'(503)555-0101', focus:'Trauma, PTSD, EMDR, Anxiety', npi:'1234567890', caqh:'12345678', caqhAttest:p(120), caqhDue:d(45), medicaid:'OR1000001', ptan:'', license:'C12345', licenseExp:d(280), malCarrier:'HPSO', malPolicy:'HP-001', malExp:d(180), dea:'', deaExp:'', recred:d(310), supervisor:'', supExp:'', notes:'Bilingual Spanish/English.' },
  { fname:'Marcus', lname:'Rivera', cred:'LPC', spec:'Mental Health', status:'Active', email:'', phone:'(503)555-0102', focus:'Adolescents, Substance Use, CBT', npi:'2345678901', caqh:'23456789', caqhAttest:p(20), caqhDue:d(10), medicaid:'OR1000002', ptan:'', license:'C23456', licenseExp:d(60), malCarrier:'CPH&A', malPolicy:'CP-002', malExp:d(20), dea:'', deaExp:'', recred:d(370), supervisor:'', supExp:'', notes:'' },
  { fname:'Priya', lname:'Nair', cred:'Naturopathic Physician', spec:'Naturopathic', status:'Active', email:'', phone:'(503)555-0103', focus:'Integrative Medicine, Hormone Health, BioCharger', npi:'3456789012', caqh:'34567890', caqhAttest:p(90), caqhDue:d(90), medicaid:'', ptan:'', license:'ND45678', licenseExp:d(365), malCarrier:'HPSO', malPolicy:'HP-003', malExp:d(300), dea:'AB1234567', deaExp:d(400), recred:d(730), supervisor:'', supExp:'', notes:'BioCharger certified.' },
  { fname:'Elena', lname:'Vasquez', cred:'Licensed Psychologist', spec:'Mental Health', status:'Active', email:'', phone:'(503)555-0105', focus:'Neuropsychology, Assessment, Testing', npi:'5678901234', caqh:'56789012', caqhAttest:p(200), caqhDue:d(5), medicaid:'OR1000003', ptan:'PT12345', license:'PSY67890', licenseExp:d(18), malCarrier:'APA Insurance', malPolicy:'APA-005', malExp:d(-5), dea:'', deaExp:'', recred:d(30), supervisor:'', supExp:'', notes:'EPPP certified.' },
  { fname:'David', lname:'Park', cred:'Chiropractor', spec:'Chiropractic', status:'Active', email:'', phone:'(503)555-0106', focus:'Sports Injury, Spinal Manipulation, Rehab', npi:'6789012345', caqh:'67890123', caqhAttest:p(30), caqhDue:d(150), medicaid:'', ptan:'', license:'DC89012', licenseExp:d(410), malCarrier:'HPSO', malPolicy:'HP-006', malExp:d(390), dea:'', deaExp:'', recred:d(800), supervisor:'', supExp:'', notes:'' },
]

const SAMPLE_PAYERS = [
  { name:'Aetna', payerId:'60054', type:'Commercial', phone:'1-800-872-3862', email:'', portal:'https://www.aetna.com/health-care-professionals.html', timeline:'60–90 days', notes:'Submit via Availity. Requires CAQH.' },
  { name:'BCBS Oregon (Regence)', payerId:'00550', type:'Commercial', phone:'1-800-452-7278', email:'', portal:'https://www.regence.com/providers', timeline:'45–60 days', notes:'OHA participation typically required first.' },
  { name:'OHP / Medicaid (OHA)', payerId:'OROHP', type:'Medicaid', phone:'1-800-273-0557', email:'', portal:'https://www.oregon.gov/oha/hsd/ohp', timeline:'45–60 days', notes:'DMAP enrollment.' },
]


// ─── SORT HOOK ────────────────────────────────────────────────────────────────
export default function App() {
  const { user, authLoading, signOut } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [db, setDb] = useState({ providers:[], payers:[], enrollments:[], documents:[], tasks:[], auditLog:[], settings:{} })
  const [loading, setLoading] = useState(true)
  const { toasts, toast } = useToast()
  const [modal, setModal] = useState(null) // null | 'enroll' | 'payer' | 'doc' | 'task' | 'provDetail'
  const [editingId, setEditingId] = useState({})
  const [provDetailId, setProvDetailId] = useState(null)
  const [provDetailTab, setProvDetailTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)

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
  const [npiSyncModal, setNpiSyncModal] = useState(null)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)

  // ─── GLOBAL SEARCH SHORTCUT
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setGlobalSearchOpen(o => !o)
      }
      if (e.key === 'Escape') setGlobalSearchOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
  // Each table change merges directly into state — no full re-fetch.
  // stateKey matches the db state object keys (e.g. 'providers', 'tasks').
  // mappedRow is already transformed through the *FromDb mapper in db.js.
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToAll((stateKey, mappedRow, eventType, oldId) => {
      setDb(prev => mergeRealtimeChange(prev, stateKey, mappedRow, eventType, oldId))
    })
    return unsub
  }, [user])

  // ─── AUTH GUARD ───────────────────────────────────────────────────────────────
  if (authLoading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Poppins,sans-serif', color:'#5a6e5a' }}>Loading…</div>
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
  async function handlePhotoUpload(file, providerId) {
    if (!providerId) { alert('Save the provider first before uploading a photo.'); return }
    setPhotoUploading(true)
    try {
      const url = await uploadProviderPhoto(providerId, file)
      setProvForm(f => ({ ...f, avatarUrl: url }))
      setDb(prev => ({
        ...prev,
        providers: prev.providers.map(p => p.id === providerId ? { ...p, avatarUrl: url } : p)
      }))
      toast('Photo uploaded!', 'success')
    } catch(err) { toast(err.message, 'error') }
    setPhotoUploading(false)
  }

  async function handleDeletePhoto(providerId) {
    if (!confirm('Remove this photo?')) return
    try {
      await deleteProviderPhoto(providerId)
      setProvForm(f => ({ ...f, avatarUrl: '' }))
      setDb(prev => ({
        ...prev,
        providers: prev.providers.map(p => p.id === providerId ? { ...p, avatarUrl: '' } : p)
      }))
      toast('Photo removed.', 'warn')
    } catch(err) { toast(err.message, 'error') }
  }

  async function handleSaveProvider() {
    if (!provForm.fname?.trim() || !provForm.lname?.trim()) { toast('First and last name required.', 'error'); return }

    // ── Duplicate detection (skip when editing an existing provider) ───────────
    if (!editingId.provider) {
      const fname = provForm.fname.trim().toLowerCase()
      const lname = provForm.lname.trim().toLowerCase()
      const npi   = provForm.npi?.trim()

      const duplicate = db.providers.find(p => {
        // NPI match is definitive (NPIs are unique per provider)
        if (npi && p.npi && p.npi === npi) return true
        // Name match as fallback (case-insensitive)
        const sameName = p.fname.trim().toLowerCase() === fname &&
                         p.lname.trim().toLowerCase() === lname
        return sameName
      })

      if (duplicate) {
        toast(
          `Duplicate: ${duplicate.fname} ${duplicate.lname}${duplicate.cred ? ', ' + duplicate.cred : ''} is already on file.`,
          'error'
        )
        return
      }
    }

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
      const res = await fetch(`/api/npi?number=${npiInput}`)
      const data = await res.json()
      if (!data.results?.length) { setNpiResult({ error: 'No provider found for this NPI.' }); return }

      // ── Use npiMapper for richer, taxonomy-aware data ──────────────────────
      const { mapNpiResponse, npiCardToProviderDefaults } = await import('../lib/npiMapper')
      const card = mapNpiResponse(data)
      if (!card) { setNpiResult({ error: 'No provider found for this NPI.' }); return }

      // addr string for the result box
      const addr = [card.address, card.city, card.state, card.zip].filter(Boolean).join(', ')
      setNpiResult({ ...card, addr, npi: npiInput })

      // Pre-fill form with mapped defaults (only fills empty fields)
      const defaults = npiCardToProviderDefaults(card)
      setProvForm(f => ({
        ...f,
        ...Object.fromEntries(
          Object.entries(defaults).filter(([k, v]) => v && !f[k])
        ),
        npi: npiInput,
      }))

      await addAudit('Provider', 'NPI Lookup', `NPI ${npiInput} → ${card.fname} ${card.lname} (${card.taxonomyDesc})`, '')
      toast('NPI data loaded!', 'success')
    } catch(e) { setNpiResult({ error: e.message || 'Could not reach NPI registry.' }) }
    setNpiLoading(false)
  }

  // ─── SYNC PROVIDER FROM NPPES ─────────────────────────────────────────────────
  // Fetches fresh NPPES data for a provider by their stored NPI, diffs it
  // against what's in CredFlow, and opens a confirmation modal showing exactly
  // what will change before saving anything.
  // npiSyncModal shape: { prov, diffs: [{field, label, npiValue, storedValue}], card }

  async function syncFromNPPES(provId) {
    const prov = db.providers.find(p => p.id === provId)
    if (!prov) return
    if (!prov.npi) { toast('This provider has no NPI on file — add it first.', 'error'); return }

    toast('Fetching NPPES data…', 'success')
    try {
      const res = await fetch(`/api/npi?number=${prov.npi}`)
      const data = await res.json()
      const { mapNpiResponse, diffNpiVsProvider } = await import('../lib/npiMapper')
      const card = mapNpiResponse(data)
      if (!card) { toast('No NPPES record found for NPI ' + prov.npi, 'error'); return }

      // Build diff — also include new fields not in diffNpiVsProvider's default list
      const baseDiffs = diffNpiVsProvider(card, prov)

      // Pull specific identifiers from the NPPES identifiers array
      const npiIdentifiers = card.identifiers || []
      const findId = (...keywords) => {
        const match = npiIdentifiers.find(i =>
          keywords.some(kw => (i.desc || '').toLowerCase().includes(kw.toLowerCase()))
        )
        return match?.identifier || ''
      }
      const nppesMedicaid = card.medicaid || findId('medicaid', 'dmap', 'ohp')
      const nppesPtan     = findId('medicare', 'ptan', 'part b')
      const nppesCaqh     = findId('caqh')

      // Extra fields to check that aren't in the base diff
      const EXTRA_FIELDS = [
        { field: 'phone',        label: 'Phone',                npiVal: card.phone },
        { field: 'license',      label: 'License #',            npiVal: card.license },
        { field: 'address',      label: 'Address',              npiVal: card.address },
        { field: 'city',         label: 'City',                 npiVal: card.city },
        { field: 'state',        label: 'State',                npiVal: card.state },
        { field: 'zip',          label: 'ZIP',                  npiVal: card.zip },
        { field: 'medicaid',     label: 'Medicaid ID',          npiVal: nppesMedicaid },
        { field: 'ptan',         label: 'Medicare PTAN',        npiVal: nppesPtan },
        { field: 'caqh',         label: 'CAQH ID',              npiVal: nppesCaqh },
        { field: 'focus',        label: 'Specialty Focus',      npiVal: card.taxonomyDesc },
        { field: 'taxonomyCode', label: 'Taxonomy Code',        npiVal: card.taxonomyCode },
        { field: 'taxonomyDesc', label: 'Taxonomy Description', npiVal: card.taxonomyDesc },
      ]

      const extraDiffs = EXTRA_FIELDS
        .filter(f => {
          const nv = (f.npiVal || '').trim().toLowerCase()
          const sv = (prov[f.field] || '').trim().toLowerCase()
          return nv && sv && nv !== sv
        })
        .map(f => ({ field: f.field, label: f.label, npiValue: f.npiVal, storedValue: prov[f.field] }))

      // Also detect new fields NPPES has that we don't
      const newFields = EXTRA_FIELDS
        .filter(f => {
          const nv = (f.npiVal || '').trim()
          const sv = (prov[f.field] || '').trim()
          return nv && !sv
        })
        .map(f => ({ field: f.field, label: f.label, npiValue: f.npiVal, storedValue: '(empty)', isNew: true }))

      const allDiffs = [...baseDiffs, ...extraDiffs, ...newFields]
        // dedupe by field
        .filter((d, i, arr) => arr.findIndex(x => x.field === d.field) === i)

      if (allDiffs.length === 0) {
        toast(`✓ ${prov.fname} ${prov.lname} is already up to date with NPPES.`, 'success')
        return
      }

      setNpiSyncModal({ prov, diffs: allDiffs, card })
    } catch (err) {
      toast('NPPES sync failed: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  async function applyNpiSync(selectedFields) {
    if (!npiSyncModal) return
    const { prov, diffs, card } = npiSyncModal
    setSaving(true)
    try {
      const updates = {}
      selectedFields.forEach(field => {
        const diff = diffs.find(d => d.field === field)
        updates[field] = diff ? diff.npiValue : card[field]
      })
      const updated = { ...prov, ...updates }
      const saved = await upsertProvider(updated)
      setDb(prev => ({ ...prev, providers: prev.providers.map(p => p.id === saved.id ? saved : p) }))
      await addAudit('Provider', 'NPPES Sync', `Synced ${selectedFields.join(', ')} from NPPES for NPI ${prov.npi}`, prov.id)
      toast(`✓ ${prov.fname} ${prov.lname} updated from NPPES!`, 'success')
      setNpiSyncModal(null)
    } catch (err) {
      toast('Save failed: ' + err.message, 'error')
    }
    setSaving(false)
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
    a.download = `credflow-backup-${new Date().toISOString().split('T')[0]}.json`
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
        <title>CredFlow — Credentialing. Simplified. Accelerated.</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
      </Head>
      <div className="app-root">
        {/* ─── SIDEBAR ─── */}
        <Sidebar page={page} setPage={setPage} alertCount={alertCount} pendingEnroll={pendingEnroll} expDocs={expDocs} user={user} signOut={signOut} />

        {/* ─── MAIN ─── */}
        <div className="main">
          <Topbar page={page} setPage={setPage} openEnrollModal={openEnrollModal} openPayerModal={openPayerModal} openDocModal={openDocModal} openTaskModal={openTaskModal} exportJSON={exportJSON} saving={saving} onOpenSearch={()=>setGlobalSearchOpen(true)} alertCount={alertCount} user={user} signOut={signOut} />

          {loading ? (
            <div className="loading-screen">
              <div className="spinner-lg"></div>
              <div style={{ marginTop:16, color:'#5a6e5a' }}>Loading your data…</div>
            </div>
          ) : (
            <div className="pages">
              {page === 'dashboard' && <WorkflowDashboard db={db} setPage={setPage} openEnrollModal={openEnrollModal} openProvDetail={openProvDetail} />}
              {page === 'alerts' && <Alerts db={db} />}
              {page === 'providers' && <Providers db={db} search={provSearch} setSearch={setProvSearch} fStatus={provFStatus} setFStatus={setProvFStatus} fSpec={provFSpec} setFSpec={setProvFSpec} openProvDetail={openProvDetail} editProvider={editProvider} setPage={setPage} setProvForm={setProvForm} setEditingId={setEditingId} setNpiInput={setNpiInput} setNpiResult={setNpiResult} syncFromNPPES={syncFromNPPES} />}
              {page === 'provider-lookup' && <ProviderLookup db={db} setPage={setPage} setProvForm={setProvForm} setEditingId={setEditingId} setNpiInput={setNpiInput} setNpiResult={setNpiResult} />}
              {page === 'license-verification' && <LicenseVerification />}
              {page === 'add-provider' && <AddProvider db={db} provForm={provForm} setProvForm={setProvForm} editingId={editingId} setEditingId={setEditingId} npiInput={npiInput} setNpiInput={setNpiInput} npiResult={npiResult} setNpiResult={setNpiResult} npiLoading={npiLoading} lookupNPI={lookupNPI} handleSaveProvider={handleSaveProvider} handleDeleteProvider={handleDeleteProvider} handlePhotoUpload={handlePhotoUpload} handleDeletePhoto={handleDeletePhoto} photoUploading={photoUploading} setPage={setPage} saving={saving} />}
              {page === 'pipeline' && <PayerHub db={db} initialTab="pipeline" openEnrollModal={openEnrollModal} openPayerModal={openPayerModal} search={enrSearch} setSearch={setEnrSearch} fStage={enrFStage} setFStage={setEnrFStage} fProv={enrFProv} setFProv={setEnrFProv} handleDeleteEnrollment={handleDeleteEnrollment} paySearch={paySearch} setPaySearch={setPaySearch} payFType={payFType} setPayFType={setPayFType} handleDeletePayer={handleDeletePayer} />}
              {page === 'enrollments' && <PayerHub db={db} initialTab="enrollments" openEnrollModal={openEnrollModal} openPayerModal={openPayerModal} search={enrSearch} setSearch={setEnrSearch} fStage={enrFStage} setFStage={setEnrFStage} fProv={enrFProv} setFProv={setEnrFProv} handleDeleteEnrollment={handleDeleteEnrollment} paySearch={paySearch} setPaySearch={setPaySearch} payFType={payFType} setPayFType={setPayFType} handleDeletePayer={handleDeletePayer} />}
              {page === 'payers' && <PayerHub db={db} initialTab="directory" openEnrollModal={openEnrollModal} openPayerModal={openPayerModal} search={enrSearch} setSearch={setEnrSearch} fStage={enrFStage} setFStage={setEnrFStage} fProv={enrFProv} setFProv={setEnrFProv} handleDeleteEnrollment={handleDeleteEnrollment} paySearch={paySearch} setPaySearch={setPaySearch} payFType={payFType} setPayFType={setPayFType} handleDeletePayer={handleDeletePayer} />}
              {page === 'payer-requirements' && <PayerHub db={db} initialTab="library" openEnrollModal={openEnrollModal} openPayerModal={openPayerModal} search={enrSearch} setSearch={setEnrSearch} fStage={enrFStage} setFStage={setEnrFStage} fProv={enrFProv} setFProv={setEnrFProv} handleDeleteEnrollment={handleDeleteEnrollment} paySearch={paySearch} setPaySearch={setPaySearch} payFType={payFType} setPayFType={setPayFType} handleDeletePayer={handleDeletePayer} />}
              {page === 'payer-hub' && <PayerHub db={db} initialTab="directory" openEnrollModal={openEnrollModal} openPayerModal={openPayerModal} search={enrSearch} setSearch={setEnrSearch} fStage={enrFStage} setFStage={setEnrFStage} fProv={enrFProv} setFProv={setEnrFProv} handleDeleteEnrollment={handleDeleteEnrollment} paySearch={paySearch} setPaySearch={setPaySearch} payFType={payFType} setPayFType={setPayFType} handleDeletePayer={handleDeletePayer} />}
              {page === 'missing-docs' && <MissingDocuments db={db} />}
              {page === 'documents' && <WorkflowDocuments db={db} openDocModal={openDocModal} handleDeleteDocument={handleDeleteDocument} />}
              {page === 'workflows' && <WorkflowTasks db={db} openTaskModal={openTaskModal} handleMarkDone={handleMarkDone} handleDeleteTask={handleDeleteTask} />}
              {page === 'reports' && <Reports db={db} exportJSON={exportJSON} />}
              {page === 'audit' && <Audit db={db} search={auditSearch} setSearch={setAuditSearch} fType={auditFType} setFType={setAuditFType} handleClearAudit={handleClearAudit} />}
              {page === 'psychology-today' && <PsychologyToday db={db} setPage={setPage} editProvider={editProvider} />}
              {page === 'eligibility' && <EligibilityPage db={db} toast={toast} />}
              {page === 'claims' && <ClaimsPage db={db} toast={toast} />}
              {page === 'denials' && <DenialLog db={db} toast={toast} />}
              {page === 'revenue' && <RevenueAnalytics db={db} />}
              {page === 'settings' && <Settings settingsForm={settingsForm} setSettingsForm={setSettingsForm} handleSaveSettings={handleSaveSettings} exportJSON={exportJSON} />}
            </div>
          )}
        </div>

        {/* ─── MODALS ─── */}
        {modal === 'enroll' && <EnrollModal db={db} enrollForm={enrollForm} setEnrollForm={setEnrollForm} editingId={editingId} handleSaveEnrollment={handleSaveEnrollment} onClose={()=>{setModal(null);setEnrollForm({});setEditingId(e=>({...e,enrollment:null}))}} saving={saving} />}
        {modal === 'payer' && <PayerModal payerForm={payerForm} setPayerForm={setPayerForm} editingId={editingId} handleSavePayer={handleSavePayer} onClose={()=>{setModal(null);setPayerForm({});setEditingId(e=>({...e,payer:null}))}} saving={saving} />}
        {modal === 'doc' && <DocModal db={db} docForm={docForm} setDocForm={setDocForm} editingId={editingId} handleSaveDocument={handleSaveDocument} onClose={()=>{setModal(null);setDocForm({});setEditingId(e=>({...e,doc:null}))}} saving={saving} />}
        {modal === 'task' && <TaskModal db={db} taskForm={taskForm} setTaskForm={setTaskForm} editingId={editingId} handleSaveTask={handleSaveTask} onClose={()=>{setModal(null);setTaskForm({});setEditingId(e=>({...e,task:null}))}} saving={saving} />}
        {modal === 'provDetail' && provDetail && <ProvDetailModal prov={provDetail} db={db} onClose={()=>setModal(null)} editProvider={editProvider} openEnrollModal={openEnrollModal} toast={toast} syncFromNPPES={syncFromNPPES} />}
        {npiSyncModal && <NpiSyncModal data={npiSyncModal} onApply={applyNpiSync} onClose={()=>setNpiSyncModal(null)} saving={saving} />}

        {/* ─── TOASTS ─── */}
        {globalSearchOpen && <GlobalSearch db={db} onClose={()=>setGlobalSearchOpen(false)} setPage={setPage} openProvDetail={openProvDetail} openEnrollModal={openEnrollModal} />}

        <div className="toast-wrap">
          {toasts.map(t => (
            <div key={t.id} className={`toast t-${t.type}`}>
              <div className="toast-icon">{t.type==='success'?'✓':t.type==='error'?'✕':t.type==='warn'?'!':'i'}</div>
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
function PayerHub({ db, initialTab, openEnrollModal, openPayerModal, search, setSearch, fStage, setFStage, fProv, setFProv, handleDeleteEnrollment, paySearch, setPaySearch, payFType, setPayFType, handleDeletePayer }) {
  const [tab, setTab] = useState(initialTab || 'directory')

  const TABS = [
    { id:'directory',   label:'🗂 Directory',   hint:'Your practice\'s payers' },
    { id:'enrollments', label:'📋 Enrollments', hint:'Enrollment table' },
    { id:'pipeline',    label:'📊 Pipeline',    hint:'Kanban board' },
    { id:'library',     label:'🌐 Library',     hint:'National payer library' },
  ]

  return (
    <div className="page" style={{paddingTop:0}}>
      {/* Tab bar */}
      <div style={{display:'flex',gap:4,marginBottom:22,background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:'var(--r-xl)',padding:5,position:'sticky',top:60,zIndex:50,backdropFilter:'blur(8px)'}}>
        {TABS.map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex:1, padding:'9px 14px', border:'none', borderRadius:'var(--r-lg)', cursor:'pointer',
              fontSize:13, fontWeight: tab===t.id ? 600 : 400,
              background: tab===t.id ? 'var(--surface)' : 'transparent',
              color: tab===t.id ? 'var(--primary)' : 'var(--ink-3)',
              boxShadow: tab===t.id ? 'var(--shadow-sm)' : 'none',
              transition:'all var(--t)',
              borderTop: tab===t.id ? '2px solid var(--primary)' : '2px solid transparent',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Tab: Directory (practice's enrolled payers) */}
      {tab === 'directory' && (
        <PayersTab db={db} search={paySearch} setSearch={setPaySearch} fType={payFType} setFType={setPayFType} openPayerModal={openPayerModal} handleDeletePayer={handleDeletePayer} />
      )}

      {/* Tab: Enrollments */}
      {tab === 'enrollments' && (
        <EnrollmentsTab db={db} search={search} setSearch={setSearch} fStage={fStage} setFStage={setFStage} fProv={fProv} setFProv={setFProv} openEnrollModal={openEnrollModal} handleDeleteEnrollment={handleDeleteEnrollment} />
      )}

      {/* Tab: Pipeline (Kanban) */}
      {tab === 'pipeline' && (
        <KanbanPipeline db={db} openEnrollModal={openEnrollModal} />
      )}

      {/* Tab: Library (national payer reference) */}
      {tab === 'library' && (
        <PayerRequirements db={db} />
      )}
    </div>
  )
}

// Extracted sub-tab components (so PayerHub can render them without the outer <div className="page">)
function PayersTab({ db, search, setSearch, fType, setFType, openPayerModal, handleDeletePayer }) {
  const rawPayers = db.payers.filter(p => `${p.name} ${p.payerId} ${p.type}`.toLowerCase().includes((search||'').toLowerCase()) && (!fType||p.type===fType))
  const {sorted:list, thProps} = useSorted(rawPayers, 'name')
  return <>
    <div className="toolbar">
      <div className="search-box"><span className="si">🔍</span><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search payers…" /></div>
      <select className="filter-select" value={fType} onChange={e=>setFType(e.target.value)}><option value="">All Types</option><option>Commercial</option><option>Medicaid</option><option>Medicare</option><option>Medicare Advantage</option><option>EAP</option><option>Other</option></select>
      <div className="toolbar-right"><button className="btn btn-primary btn-sm" onClick={()=>openPayerModal()}>＋ Add Payer</button></div>
    </div>
    <div className="tbl-wrap">
      <table><thead><tr>
          <th {...thProps('name','Payer Name')} />
          <th {...thProps('payerId','Payer ID')} />
          <th {...thProps('type','Type')} />
          <th className="no-sort">Phone</th>
          <th className="no-sort">Portal</th>
          <th {...thProps('timeline','Timeline')} />
          <th className="no-sort">Notes</th>
          <th className="no-sort">Actions</th>
        </tr></thead>
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
  </>
}

function Payers({ db, search, setSearch, fType, setFType, openPayerModal, handleDeletePayer }) {
  const rawPayers = db.payers.filter(p => `${p.name} ${p.payerId} ${p.type}`.toLowerCase().includes(search.toLowerCase()) && (!fType||p.type===fType))
  const {sorted:list, thProps} = useSorted(rawPayers, 'name')
  return <div className="page">
    <div className="toolbar">
      <div className="search-box"><span className="si">🔍</span><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search payers…" /></div>
      <select className="filter-select" value={fType} onChange={e=>setFType(e.target.value)}><option value="">All Types</option><option>Commercial</option><option>Medicaid</option><option>Medicare</option><option>Medicare Advantage</option><option>EAP</option><option>Other</option></select>
      <div className="toolbar-right"><button className="btn btn-primary btn-sm" onClick={()=>openPayerModal()}>＋ Add Payer</button></div>
    </div>
    <div className="tbl-wrap">
      <table><thead><tr>
          <th {...thProps('name','Payer Name')} />
          <th {...thProps('payerId','Payer ID')} />
          <th {...thProps('type','Type')} />
          <th className="no-sort">Phone</th>
          <th className="no-sort">Portal</th>
          <th {...thProps('timeline','Timeline')} />
          <th className="no-sort">Notes</th>
          <th className="no-sort">Actions</th>
        </tr></thead>
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
  const rawDocs = db.documents.filter(d => {
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
  })
  const {sorted:list, thProps} = useSorted(rawDocs, 'exp')
  return <div className="page">
    <div className="toolbar">
      <div className="search-box"><span className="si">🔍</span><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents…" /></div>
      <select className="filter-select" value={fType} onChange={e=>setFType(e.target.value)}><option value="">All Types</option><option>License</option><option>Malpractice</option><option>DEA</option><option>CAQH Attestation</option><option>Recredentialing</option><option>Supervision Agreement</option><option>Other</option></select>
      <select className="filter-select" value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="">All</option><option value="expired">Expired</option><option value="critical">Critical (≤30d)</option><option value="warning">Warning (≤90d)</option><option value="ok">OK</option></select>
      <div className="toolbar-right"><button className="btn btn-primary btn-sm" onClick={()=>openDocModal()}>＋ Add Document</button></div>
    </div>
    <div className="tbl-wrap">
      <table><thead><tr>
          <th {...thProps('provId','Provider')} />
          <th {...thProps('type','Type')} />
          <th {...thProps('issuer','Issuer')} />
          <th className="no-sort">Number</th>
          <th {...thProps('exp','Expiration')} />
          <th className="no-sort">Days Left</th>
          <th className="no-sort">Status</th>
          <th className="no-sort">Actions</th>
        </tr></thead>
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
  const rawTasks = db.tasks.filter(t => {
    const txt = `${t.task} ${pName(db.providers,t.provId)} ${payName(db.payers,t.payId)} ${t.cat}`.toLowerCase()
    return txt.includes(search.toLowerCase()) && (!fPriority||t.priority===fPriority) && (!fStatus||t.status===fStatus)
  })
  const {sorted:list, thProps} = useSorted(rawTasks, 'due')

  return <div className="page">
    <div className="toolbar">
      <div className="search-box"><span className="si">🔍</span><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks…" /></div>
      <select className="filter-select" value={fPriority} onChange={e=>setFPriority(e.target.value)}><option value="">All Priorities</option><option>Urgent</option><option>High</option><option>Medium</option><option>Low</option></select>
      <select className="filter-select" value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="">All Statuses</option><option>Open</option><option>In Progress</option><option>Waiting</option><option>Done</option></select>
      <div className="toolbar-right"><button className="btn btn-primary btn-sm" onClick={()=>openTaskModal()}>＋ New Task</button></div>
    </div>
    <div className="tbl-wrap">
      <table><thead><tr>
          <th {...thProps('due','Due Date')} />
          <th {...thProps('task','Task')} />
          <th {...thProps('provId','Provider')} />
          <th className="no-sort">Payer</th>
          <th {...thProps('priority','Priority')} />
          <th {...thProps('status','Status')} />
          <th {...thProps('cat','Category')} />
          <th className="no-sort">Actions</th>
        </tr></thead>
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
function PayerModal({ payerForm, setPayerForm, editingId, handleSavePayer, onClose, saving }) {
  const [step, setStep] = useState(editingId.payer ? 2 : 1)
  const [pickerSearch, setPickerSearch] = useState('')
  const [selectedCatalog, setSelectedCatalog] = useState(null)
  const f = k => payerForm[k] ?? ''
  const set = (k, v) => setPayerForm(prev => ({ ...prev, [k]: v }))

  function pickPayer(catalog) {
    setSelectedCatalog(catalog)
    setPayerForm({
      name: catalog.name,
      payerId: catalog.payerId,
      type: catalog.type,
      phone: catalog.phone,
      portal: catalog.portal,
      timeline: catalog.timeline,
      notes: catalog.notes,
      email: '',
    })
    setStep(2)
  }

  function pickCustom() {
    setSelectedCatalog(null)
    setPayerForm({ type:'Commercial', timeline:'60–90 days' })
    setStep(2)
  }

  const filteredCatalog = PAYER_CATALOG.filter(p =>
    p.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    p.type.toLowerCase().includes(pickerSearch.toLowerCase())
  )

  const guidelines = selectedCatalog || (editingId.payer ? PAYER_CATALOG.find(p => p.name === payerForm.name) : null)

  return (
    <DrawerModal title={editingId.payer ? 'Edit Payer' : (step === 1 ? 'Add Payer — Choose Payer' : 'Add Payer — Details')} onClose={onClose}
      footer={
        step === 1
          ? <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          : <>
              {!editingId.payer && <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>}
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSavePayer} disabled={saving}>{saving ? 'Saving…' : 'Save Payer'}</button>
            </>
      }>

      {step === 1 && (
        <>
          {!editingId.payer && (
            <div className="modal-step-indicator" style={{ marginBottom:16 }}>
              <div className="msi-step active"><div className="msi-num">1</div><span>Choose Payer</span></div>
              <div className="msi-line" />
              <div className="msi-step"><div className="msi-num">2</div><span>Review & Save</span></div>
            </div>
          )}
          <div style={{ marginBottom:12 }}>
            <div className="search-box" style={{ marginBottom:12 }}>
              <span className="si">🔍</span>
              <input type="text" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                placeholder="Search payers…" style={{ width:'100%' }} autoFocus />
            </div>
          </div>
          <div className="payer-picker-grid">
            {filteredCatalog.map(p => (
              <button key={p.name} className="payer-pick-btn" onClick={() => pickPayer(p)}>
                <div className="payer-pick-dot" style={{ background: p.color }} />
                <div>
                  <div className="payer-pick-name">{p.name}</div>
                  <div className="payer-pick-type">{p.type} · {p.timeline}</div>
                </div>
              </button>
            ))}
            <button className="payer-pick-custom" onClick={pickCustom}>
              <div style={{ fontSize:18, opacity:.5 }}>＋</div>
              <div>
                <div className="payer-pick-name" style={{ color:'var(--ink-3)' }}>Custom / Unlisted</div>
                <div className="payer-pick-type">Enter details manually</div>
              </div>
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          {!editingId.payer && (
            <div className="modal-step-indicator">
              <div className="msi-step done"><div className="msi-num">✓</div><span>Choose Payer</span></div>
              <div className="msi-line done" />
              <div className="msi-step active"><div className="msi-num">2</div><span>Review & Save</span></div>
            </div>
          )}

          {guidelines && (
            <div className="guideline-box">
              <div className="guideline-box-title">📋 Credentialing Guidelines — {guidelines.name}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2px 16px', marginBottom: guidelines.warn ? 8 : 0 }}>
                {guidelines.guidelines.map((g, i) => (
                  <div key={i} className="guideline-item">{g}</div>
                ))}
              </div>
              {guidelines.warn && <div className="guideline-warn">⚡ {guidelines.warn}</div>}
            </div>
          )}

          <div className="form-grid">
            <div className="fg full"><label>Payer Name *</label>
              <input type="text" value={f('name')} onChange={e => set('name', e.target.value)} placeholder="Payer name" />
            </div>
            <div className="fg"><label>Payer ID / EDI ID</label>
              <input type="text" value={f('payerId')} onChange={e => set('payerId', e.target.value)} placeholder="60054" />
            </div>
            <div className="fg"><label>Type</label>
              <select value={f('type')} onChange={e => set('type', e.target.value)}>
                <option>Commercial</option><option>Medicaid</option><option>Medicare</option>
                <option>Medicare Advantage</option><option>EAP</option><option>Other</option>
              </select>
            </div>
            <div className="fg"><label>Provider Relations Phone</label>
              <input type="tel" value={f('phone')} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="fg"><label>Credentialing Email</label>
              <input type="email" value={f('email')} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="fg"><label>Provider Portal URL</label>
              <input type="text" value={f('portal')} onChange={e => set('portal', e.target.value)} placeholder="https://…" />
            </div>
            <div className="fg"><label>Avg. Credentialing Timeline</label>
              <select value={f('timeline')} onChange={e => set('timeline', e.target.value)}>
                <option>30–45 days</option><option>45–60 days</option><option>60–90 days</option>
                <option>90–120 days</option><option>120+ days</option>
              </select>
            </div>
            <div className="fg full"><label>Notes</label>
              <textarea value={f('notes')} onChange={e => set('notes', e.target.value)} placeholder="Submission requirements, contacts, special instructions…" />
            </div>
          </div>
        </>
      )}
    </DrawerModal>
  )
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

// ─── NPI SYNC MODAL ───────────────────────────────────────────────────────────
// Shows a field-by-field diff between NPPES and CredFlow.
// User can check/uncheck individual fields before applying.

function MissingDocuments({ db }) {
  const [filterSeverity, setFilterSeverity] = useState('')
  const [filterProv, setFilterProv] = useState('')

  const issues = []
  db.providers.filter(p => p.status === 'Active').forEach(prov => {
    REQUIRED_DOCS.forEach(req => {
      if (req.skipIf && req.skipIf(prov)) return
      let missing = false
      if (req.checkFn) {
        missing = !req.checkFn(prov, db.documents)
      } else if (req.field) {
        const val = prov[req.field]
        if (!val) { missing = true }
        else {
          const days = daysUntil(val)
          if (days !== null && days < 0) missing = true
        }
      }
      if (missing) issues.push({ prov, label: req.label, severity: req.severity, key: req.key })
    })
    // Also flag expired documents from the documents table
    db.documents.filter(d => d.provId === prov.id).forEach(doc => {
      const days = daysUntil(doc.exp)
      if (days !== null && days < 0) {
        issues.push({ prov, label: `${doc.type} EXPIRED`, severity: 'error', key: `doc-${doc.id}`, detail: `Expired ${Math.abs(days)} days ago` })
      } else if (days !== null && days <= 30) {
        issues.push({ prov, label: `${doc.type} expiring soon`, severity: 'warn', key: `doc-exp-${doc.id}`, detail: `${days} days remaining` })
      }
    })
  })

  const filtered = issues.filter(i =>
    (!filterSeverity || i.severity === filterSeverity) &&
    (!filterProv || i.prov.id === filterProv)
  )
  const errors = filtered.filter(i => i.severity === 'error')
  const warns = filtered.filter(i => i.severity === 'warn')

  return (
    <div className="page">
      <div className="toolbar" style={{ marginBottom:18 }}>
        <select className="filter-select" value={filterSeverity} onChange={e=>setFilterSeverity(e.target.value)}>
          <option value="">All Issues</option>
          <option value="error">Critical Only</option>
          <option value="warn">Warnings Only</option>
        </select>
        <select className="filter-select" value={filterProv} onChange={e=>setFilterProv(e.target.value)}>
          <option value="">All Providers</option>
          {db.providers.filter(p=>p.status==='Active').map(p=><option key={p.id} value={p.id}>{p.fname} {p.lname}</option>)}
        </select>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {errors.length > 0 && <span className="badge b-red">⚠ {errors.length} Critical</span>}
          {warns.length > 0 && <span className="badge b-amber">! {warns.length} Warnings</span>}
          {filtered.length === 0 && <span className="badge b-green">✅ All Clear</span>}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state"><div className="ei">✅</div><h4>No issues found</h4><p>All required documents are on file and current.</p></div>
      ) : (
        <>
          {errors.length > 0 && (
            <div className="mb-20">
              <div className="text-xs font-500" style={{ letterSpacing:'.6px', textTransform:'uppercase', color:'var(--red)', marginBottom:10 }}>🔴 Critical — Missing or Expired ({errors.length})</div>
              {errors.map((issue, i) => (
                <div key={i} className="missing-doc-row">
                  <div className="missing-doc-icon">❌</div>
                  <div className="missing-doc-body">
                    <div className="missing-doc-title">{issue.prov.fname} {issue.prov.lname}{issue.prov.cred ? `, ${issue.prov.cred}` : ''}</div>
                    <div className="missing-doc-sub">{issue.label}{issue.detail ? ` · ${issue.detail}` : ''}</div>
                  </div>
                  <div className="missing-doc-badge"><span className="badge b-red">Action Required</span></div>
                </div>
              ))}
            </div>
          )}
          {warns.length > 0 && (
            <div>
              <div className="text-xs font-500" style={{ letterSpacing:'.6px', textTransform:'uppercase', color:'var(--amber)', marginBottom:10 }}>🟡 Warnings — Review Recommended ({warns.length})</div>
              {warns.map((issue, i) => (
                <div key={i} className="missing-doc-row warn">
                  <div className="missing-doc-icon">⚠️</div>
                  <div className="missing-doc-body">
                    <div className="missing-doc-title">{issue.prov.fname} {issue.prov.lname}{issue.prov.cred ? `, ${issue.prov.cred}` : ''}</div>
                    <div className="missing-doc-sub">{issue.label}{issue.detail ? ` · ${issue.detail}` : ''}</div>
                  </div>
                  <div className="missing-doc-badge"><span className="badge b-amber">Review</span></div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── PAYER REQUIREMENTS ─────────────────────────────────────────────────────────
function PayerRequirements({ db }) {
  const [search, setSearch] = useState('')
  const [fState, setFState] = useState('')
  const [fType, setFType] = useState('')
  const [expanded, setExpanded] = useState({})
  const toggle = name => setExpanded(e => ({ ...e, [name]: !e[name] }))

  const US_STATES = [
    ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
    ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','DC'],['FL','Florida'],
    ['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],
    ['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],
    ['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],
    ['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],
    ['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],
    ['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],
    ['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],
    ['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
  ]

  const TYPE_BADGE = {
    'National': 'b-blue', 'Regional': 'b-teal', 'Medicaid': 'b-green',
    'Medicare': 'b-purple', 'Military': 'b-gray', 'Marketplace': 'b-amber',
  }

  const allPayers = Object.keys(PAYER_REQUIREMENTS)

  const filtered = allPayers.filter(name => {
    const req = PAYER_REQUIREMENTS[name]
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || (req.notes||'').toLowerCase().includes(search.toLowerCase())
    const matchState = !fState || req.states === 'ALL' || (Array.isArray(req.states) && req.states.includes(fState))
    const matchType = !fType || req.type === fType
    return matchSearch && matchState && matchType
  })

  const nationalCount = filtered.filter(n => PAYER_REQUIREMENTS[n].states === 'ALL').length
  const stateCount = filtered.filter(n => PAYER_REQUIREMENTS[n].states !== 'ALL').length

  return (
    <div className="page">
      {/* Header info banner */}
      <div style={{background:'var(--primary-l)',border:'1px solid var(--primary-ll)',borderRadius:'var(--r-lg)',padding:'12px 16px',marginBottom:16,fontSize:13,color:'var(--primary)',display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:18}}>🗂️</span>
        <div>
          <strong>National Payer Library</strong> — {Object.keys(PAYER_REQUIREMENTS).length} payers across all 50 US states + DC.
          Filter by state to see which payers operate in that market.
        </div>
        <span className="badge b-blue" style={{marginLeft:'auto',flexShrink:0}}>{filtered.length} shown</span>
      </div>

      <div className="toolbar" style={{ marginBottom:18, flexWrap:'wrap', gap:8 }}>
        <div className="search-box">
          <span className="si">🔍</span>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search payers, notes…" style={{width:220}} />
        </div>

        {/* State filter */}
        <select className="filter-select" value={fState} onChange={e=>setFState(e.target.value)} style={{minWidth:170}}>
          <option value="">🌎 All States</option>
          {US_STATES.map(([abbr, name]) => (
            <option key={abbr} value={abbr}>{abbr} — {name}</option>
          ))}
        </select>

        {/* Type filter */}
        <select className="filter-select" value={fType} onChange={e=>setFType(e.target.value)}>
          <option value="">All Types</option>
          <option value="National">National</option>
          <option value="Regional">Regional</option>
          <option value="Medicaid">Medicaid</option>
          <option value="Medicare">Medicare</option>
          <option value="Military">Military</option>
          <option value="Marketplace">Marketplace</option>
        </select>

        {(fState || fType || search) && (
          <button className="btn btn-ghost btn-sm" onClick={()=>{setFState('');setFType('');setSearch('')}}>✕ Clear filters</button>
        )}

        <div style={{marginLeft:'auto',display:'flex',gap:10,fontSize:12,color:'var(--ink-4)',alignItems:'center'}}>
          {fState && <span className="badge b-blue">{nationalCount} national + {stateCount} state-specific</span>}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="ei">🔍</div>
          <h4>No payers found</h4>
          <p>Try adjusting your filters or clearing the state/type selection.</p>
        </div>
      )}

      <div className="payer-req-grid">
        {filtered.map(name => {
          const req = PAYER_REQUIREMENTS[name]
          const isExp = expanded[name]
          const stateList = req.states === 'ALL' ? null : req.states
          return (
            <div key={name} className={`payer-req-card ${isExp ? 'expanded' : ''}`}>
              <div className="payer-req-header">
                <div className="payer-req-dot" style={{ background: req.color }} />
                <div className="payer-req-name">{name}</div>
                <div style={{display:'flex',gap:4,flexWrap:'wrap',justifyContent:'flex-end'}}>
                  <span className={`badge ${TYPE_BADGE[req.type]||'b-gray'}`} style={{ fontSize:'10px' }}>{req.type}</span>
                  <span className="badge b-blue" style={{ fontSize:'10px' }}>{req.timeline}</span>
                </div>
              </div>
              <div className="payer-req-body">
                {/* States served */}
                <div style={{marginBottom:8}}>
                  {req.states === 'ALL'
                    ? <span style={{fontSize:11,color:'var(--ink-3)',background:'var(--surface-2)',padding:'2px 8px',borderRadius:20,border:'1px solid var(--border)'}}>🌎 Nationwide</span>
                    : <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                        {stateList.slice(0,12).map(s => (
                          <span key={s} style={{
                            fontSize:10,fontWeight:600,padding:'1px 5px',borderRadius:4,
                            background: fState===s ? 'var(--primary)' : 'var(--surface-2)',
                            color: fState===s ? 'white' : 'var(--ink-3)',
                            border:'1px solid var(--border)',cursor:'pointer'
                          }} onClick={()=>setFState(s===fState?'':s)}>{s}</span>
                        ))}
                        {stateList.length > 12 && <span style={{fontSize:10,color:'var(--ink-4)',padding:'1px 4px'}}>+{stateList.length-12} more</span>}
                      </div>
                  }
                </div>

                <div className="payer-req-meta">
                  <span className="payer-req-chip">🔄 {req.revalidation}</span>
                  {req.portalUrl && <a href={req.portalUrl} target="_blank" rel="noreferrer" className="payer-req-chip" style={{ color:'var(--primary)', textDecoration:'none' }}>🔗 Portal ↗</a>}
                </div>
                {req.specialNotes.map((n, i) => (
                  <div key={i} className="payer-req-special">⚡ {n}</div>
                ))}
                <div className="payer-req-section" style={{ marginTop:10 }}>
                  <div className="payer-req-section-label">Submission Method</div>
                  <div style={{ fontSize:'12.5px', color:'var(--ink-2)' }}>{req.submission}</div>
                </div>
                <div className="payer-req-expanded">
                  <div className="payer-req-section">
                    <div className="payer-req-section-label">Required Documents</div>
                    {req.requirements.map((r, i) => (
                      <div key={i} className="payer-req-item">{r}</div>
                    ))}
                  </div>
                  <div className="payer-req-section">
                    <div className="payer-req-section-label">Notes</div>
                    <div className="payer-req-note">{req.notes}</div>
                  </div>
                </div>
                <button className="payer-req-toggle" onClick={() => toggle(name)}>
                  {isExp ? '▲ Show less' : '▼ Show requirements & notes'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── GLOBAL SEARCH ─────────────────────────────────────────────────────────────
function LicenseVerification() {
  const VERIF_SOURCES = [
    { icon: '🎓', title: 'OBLPCT — LPCs & MFTs', desc: 'Verify LPC, LPCA, LMFT, LMFTA licenses.', bg: '#f0fdf4', color: '#16a34a', cta: 'Verify LPC / LMFT →', href: 'https://oblpct.us.thentiacloud.net/webs/oblpct/register/#', note: 'Oregon official registry' },
    { icon: '🧩', title: 'BLSW — LCSWs', desc: 'Verify LCSW, CSWA, LSW licenses.', bg: '#f0fdf4', color: '#0891b2', cta: 'Verify LCSW →', href: 'https://blsw.us.thentiacloud.net/webs/blsw/register/#/', note: 'Oregon official registry' },
    { icon: '🧠', title: 'Oregon Board of Psychology', desc: 'Verify Licensed Psychologist (PhD/PsyD) licenses.', bg: '#faf5ff', color: '#7c3aed', cta: 'Verify License →', href: 'https://obp.us.thentiacloud.net/webs/obp/register/#', note: 'Oregon official registry' },
    { icon: '🌿', title: 'Oregon Board of Naturopathic Medicine', desc: 'Verify ND licenses.', bg: '#f0fdf4', color: '#0891b2', cta: 'Verify License →', href: 'https://obnm.us.thentiacloud.net/webs/obnm/register/#', note: 'Oregon official registry' },
    { icon: '🦴', title: 'Oregon Board of Chiropractic Examiners', desc: 'Verify DC licenses.', bg: '#fffbeb', color: '#d97706', cta: 'Verify License →', href: 'https://obce.us.thentiacloud.net/webs/obce/register/#', note: 'Oregon official registry' },
    { icon: '⚕️', title: 'Oregon Health Licensing Office (HLO)', desc: 'LMT, LAc, and 17 other health professions.', bg: '#fef2f2', color: '#dc2626', cta: 'Verify License →', href: 'https://hlo.us.thentiacloud.net/webs/hlo/register/#', note: 'Oregon official registry' },
    { icon: '📋', title: 'CAQH ProView', desc: 'Access provider credentialing profiles and attestation status. Requires a Participating Organization account.', bg: '#ecfeff', color: '#0891b2', cta: 'Open CAQH ProView →', href: 'https://proview.caqh.org', note: 'Call CAQH at 888-599-1771 to request PO access.' },
    { icon: '🏥', title: 'OHA Medicaid Provider Enrollment Check', desc: 'Verify OHP/Medicaid enrollment by NPI.', bg: '#f0fdf4', color: '#16a34a', cta: 'Check OHA Enrollment →', href: 'https://www.oregon.gov/oha/hsd/ohp/pages/provider-enroll.aspx', note: 'Enter provider NPI at the OHA tool.' },
    { icon: '🚨', title: 'OIG LEIE — Exclusions Database', desc: 'Check for federal healthcare program exclusions. Run before credentialing any new provider.', bg: '#fef2f2', color: '#dc2626', cta: 'Search OIG Exclusions →', href: 'https://exclusions.oig.hhs.gov/', note: 'Free and real-time.' },
    { icon: '💊', title: 'DEA Registration Verification', desc: 'Verify active DEA registration for prescribing providers.', bg: '#faf5ff', color: '#7c3aed', cta: 'Verify DEA →', href: 'https://apps.deadiversion.usdoj.gov/webforms2/spring/validationLogin', note: 'Requires a DEA account.' },
  ]

  return (
    <div className="page">
      <div className="card-header" style={{ marginBottom: 20 }}>
        <h3>✅ License Verification Sources</h3>
        <span className="ch-meta">Official state boards & federal databases</span>
      </div>
      <div style={{ background:'var(--blue-l)', border:'1px solid var(--blue-b)', borderRadius:'var(--r-lg)', padding:'14px 18px', marginBottom:20, fontSize:13, color:'var(--blue)' }}>
        <strong>How to use this page:</strong> Click any source below to open the official verification portal in a new tab.
        For each provider you credential, check NPPES, their state board, and the OIG exclusions database at minimum.
      </div>
      {VERIF_SOURCES.map((s, i) => (
        <div key={i} className="verif-card">
          <div className="verif-icon" style={{ background:s.bg, color:s.color }}>{s.icon}</div>
          <div className="verif-body">
            <div className="verif-title">{s.title}</div>
            <div className="verif-desc">{s.desc}</div>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <a href={s.href} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary">{s.cta}</a>
            </div>
            {s.note && <div className="verif-note">{s.note}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}


// ─── PSYCHOLOGY TODAY PAGE ─────────────────────────────────────────────────────
function PsychologyToday({ db, setPage, editProvider }) {
  const [activeTab, setActiveTab] = useState('overview')

  const mentalHealthProvs = db.providers.filter(p => p.spec === 'Mental Health' && p.status === 'Active')
  // PT is exclusively for mental health providers
  const listed = mentalHealthProvs.filter(p => p.ptStatus === 'Active')
  const inactive = mentalHealthProvs.filter(p => p.ptStatus === 'Inactive')
  const unlisted = mentalHealthProvs.filter(p => !p.ptStatus || p.ptStatus === 'None')
  const monthlySpend = listed.filter(p => p.ptMonthlyFee).length * 29.95

  const PT_TIPS = [
    { icon: '📸', title: 'Add a professional photo', desc: 'Profiles with photos get significantly more clicks. Upload via the provider Edit page.' },
    { icon: '✍️', title: 'Write a personal bio', desc: 'Therapists who describe their approach, personality, and ideal client in first person convert better.' },
    { icon: '🎥', title: 'Add a video introduction', desc: 'PT supports a short video. Even a 60-second intro dramatically increases inquiries.' },
    { icon: '🏥', title: 'List all accepted insurances', desc: 'Many clients filter by insurance. Make sure every active payer enrollment is reflected on the PT profile.' },
    { icon: '🎯', title: 'Narrow your specialty focus', desc: 'Specific is better than general. "Trauma and PTSD using EMDR" outperforms "anxiety and depression".' },
    { icon: '💬', title: 'Enable online booking', desc: 'Profiles with booking links convert at a higher rate. Consider linking your intake form.' },
    { icon: '🔄', title: 'Keep availability updated', desc: 'Profiles marked as accepting new clients rank higher in PT search results.' },
    { icon: '⭐', title: 'Complete the entire profile', desc: 'PT favors complete profiles in their algorithm. Fill in every section including finances and statement.' },
  ]

  return (
    <div className="page">
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'var(--purple-l)',border:'1px solid var(--purple-b)',borderRadius:'var(--r-lg)',marginBottom:18}}>
        <span style={{fontSize:20}}>🧠</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,color:'#5b21b6'}}>Mental Health Providers — Marketing Tool</div>
          <div style={{fontSize:12,color:'var(--ink-3)',marginTop:2}}>Psychology Today directory management is exclusive to Mental Health specialty providers. Non-mental health providers are not tracked here.</div>
        </div>
        <span className="badge b-purple" style={{flexShrink:0}}>Mental Health Only</span>
      </div>
      <div className="lookup-tabs">
        {[['overview','📊 Overview'],['directory','📋 Profile Directory'],['tips','💡 Optimization Tips']].map(([k,l]) => (
          <div key={k} className={`lookup-tab ${activeTab===k?'active':''}`} onClick={()=>setActiveTab(k)}>{l}</div>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div>
          <div className="kpi-grid" style={{marginBottom:20}}>
            <div className="kpi kpi-green">
              <div className="kpi-icon">✅</div>
              <div className="kpi-label">Active PT Listings</div>
              <div className="kpi-value">{listed.length}</div>
              <div className="kpi-sub">of {mentalHealthProvs.length} mental health providers</div>
            </div>
            <div className="kpi kpi-red">
              <div className="kpi-icon">⚠️</div>
              <div className="kpi-label">No PT Profile</div>
              <div className="kpi-value">{unlisted.length}</div>
              <div className="kpi-sub">Mental Health providers</div>
            </div>
            <div className="kpi kpi-amber">
              <div className="kpi-icon">⏸️</div>
              <div className="kpi-label">Inactive Listings</div>
              <div className="kpi-value">{inactive.length}</div>
              <div className="kpi-sub">Paused or deactivated</div>
            </div>
            <div className="kpi kpi-blue">
              <div className="kpi-icon">💰</div>
              <div className="kpi-label">Monthly PT Spend</div>
              <div className="kpi-value">${monthlySpend.toFixed(0)}</div>
              <div className="kpi-sub">${(monthlySpend * 12).toFixed(0)}/year · $29.95/provider</div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <h3>Active PT Profiles</h3>
                <a href="https://www.psychologytoday.com/us/therapists/positive-inner-self-llc-beaverton-or/751449" target="_blank" rel="noreferrer" className="btn btn-sm btn-primary">Search PT Directory ↗</a>
              </div>
              <div className="card-body" style={{padding:'12px 16px'}}>
                {listed.length === 0 ? (
                  <div className="text-muted">No active Psychology Today listings on file.</div>
                ) : listed.map(p => (
                  <div key={p.id} className="pt-card">
                    <div className="pt-card-avatar">
                      {p.avatarUrl
                        ? <img src={p.avatarUrl} alt={p.fname} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                        : initials(p)
                      }
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{p.fname} {p.lname}{p.cred?', '+p.cred:''}</div>
                      <div style={{fontSize:11.5,color:'var(--ink-3)'}}>{p.focus||p.spec}</div>
                      {p.ptNotes && <div style={{fontSize:11,color:'var(--ink-4)',marginTop:2}}>{p.ptNotes}</div>}
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:5,alignItems:'flex-end'}}>
                      <span className="badge b-green" style={{fontSize:10}}>Active</span>
                      {p.ptMonthlyFee && <span className="badge b-blue" style={{fontSize:10}}>$29.95/mo</span>}
                      {p.ptUrl && (
                        <a href={p.ptUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{padding:'3px 8px',fontSize:11}}>View ↗</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="card mb-16">
                <div className="card-header">
                  <h3>Missing PT Profiles</h3>
                  {unlisted.length > 0 && <span className="badge b-amber">{unlisted.length} providers</span>}
                </div>
                <div className="card-body" style={{padding:'12px 16px'}}>
                  {unlisted.length === 0 ? (
                    <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0'}}>
                      <span style={{fontSize:20}}>🎉</span>
                      <span style={{fontSize:13,color:'var(--ink-3)'}}>All mental health providers have PT listings!</span>
                    </div>
                  ) : unlisted.map(p => (
                    <div key={p.id} className="pt-card pt-missing">
                      <div className="pt-card-avatar" style={{background:'var(--amber-l)',color:'var(--amber)'}}>
                        {p.avatarUrl
                          ? <img src={p.avatarUrl} alt={p.fname} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                          : initials(p)
                        }
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:13}}>{p.fname} {p.lname}{p.cred?', '+p.cred:''}</div>
                        <div style={{fontSize:11.5,color:'var(--ink-3)'}}>{p.focus||p.spec}</div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:5}}>
                        <button className="btn btn-sm btn-primary" style={{fontSize:11}} onClick={()=>editProvider(p.id)}>
                          + Add PT Profile
                        </button>
                        <a href="https://member.psychologytoday.com/us/login" target="_blank" rel="noreferrer"
                          className="btn btn-ghost btn-sm" style={{fontSize:11,textAlign:'center'}}>Sign up PT ↗</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3>Quick Links</h3></div>
                <div className="card-body" style={{padding:'12px 16px'}}>
                  {[
                    ['🔑 PT Provider Login','Sign into your Psychology Today account','https://member.psychologytoday.com/us/login'],
                    ['🔍 Our Beaverton Listing','See how PIS appears in PT search results','https://www.psychologytoday.com/us/therapists/positive-inner-self-llc-beaverton-or/751449'],
                    ['📖 PT Profile Best Practices','PT guide to getting more clients from your listing','https://www.psychologytoday.com/us/therapists/how-to-attract-clients'],
                    ['💳 PT Billing & Subscription','Manage your $29.95/mo subscription','https://member.psychologytoday.com/us/profile'],
                  ].map(([label, desc, href]) => (
                    <a key={label} href={href} target="_blank" rel="noreferrer"
                      style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid var(--border-2)',textDecoration:'none',transition:'color var(--t)'}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600,color:'var(--primary)'}}>{label}</div>
                        <div style={{fontSize:11.5,color:'var(--ink-4)'}}>{desc}</div>
                      </div>
                      <span style={{color:'var(--ink-4)',fontSize:12}}>↗</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DIRECTORY TAB ── */}
      {activeTab === 'directory' && (
        <div>
          <div style={{background:'var(--blue-l)',border:'1px solid var(--blue-b)',borderRadius:'var(--r-lg)',padding:'13px 16px',marginBottom:16,fontSize:13,color:'var(--blue)'}}>
            <strong>Tip:</strong> Click "Edit" on any provider to update their PT profile URL, status, and notes. PT profiles cost $29.95/month per provider.
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr>
                <th className="no-sort">Provider</th>
                <th className="no-sort">Specialty</th>
                <th className="no-sort">PT Status</th>
                <th className="no-sort">Monthly Fee</th>
                <th className="no-sort">PT Profile</th>
                <th className="no-sort">Notes</th>
                <th className="no-sort">Actions</th>
              </tr></thead>
              <tbody>
                {mentalHealthProvs.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:32,height:32,borderRadius:8,background:SPEC_COLORS[p.spec]||'#4f7ef8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'white',fontFamily:'Poppins,sans-serif',flexShrink:0,overflow:'hidden'}}>
                          {p.avatarUrl ? <img src={p.avatarUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : initials(p)}
                        </div>
                        <div>
                          <div style={{fontWeight:600,fontSize:13}}>{p.fname} {p.lname}</div>
                          <div style={{fontSize:11,color:'var(--ink-4)'}}>{p.cred}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge b-gray" style={{fontSize:11}}>{p.spec}</span></td>
                    <td>
                      <span className={`badge ${p.ptStatus==='Active'?'b-green':p.ptStatus==='Inactive'?'b-amber':'b-gray'}`} style={{fontSize:11}}>
                        {p.ptStatus || 'No Listing'}
                      </span>
                    </td>
                    <td style={{fontSize:12,color:'var(--ink-3)'}}>
                      {p.ptMonthlyFee ? <span className="badge b-blue" style={{fontSize:10}}>$29.95/mo</span> : '—'}
                    </td>
                    <td>
                      {p.ptUrl
                        ? <a href={p.ptUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{fontSize:11}}>View Profile ↗</a>
                        : <span style={{fontSize:12,color:'var(--ink-4)'}}>No URL saved</span>
                      }
                    </td>
                    <td style={{fontSize:12,color:'var(--ink-4)',maxWidth:160}}>{p.ptNotes||'—'}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={()=>editProvider(p.id)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TIPS TAB ── */}
      {activeTab === 'tips' && (
        <div>
          <div style={{background:'var(--navy)',borderRadius:'var(--r-lg)',padding:'20px 22px',marginBottom:20,color:'white'}}>
            <div style={{fontFamily:'Poppins,sans-serif',fontSize:20,marginBottom:6}}>Psychology Today Profile Optimization</div>
            <div style={{fontSize:13,opacity:.75,lineHeight:1.6}}>
              PT is the largest therapist directory in the US with 1.5M+ monthly visitors. A well-optimized profile is one of the highest-ROI marketing investments for a mental health practice. These tips are based on PT guidance and industry best practices.
            </div>
          </div>
          <div className="grid-2">
            {PT_TIPS.map((tip, i) => (
              <div key={i} className="card" style={{marginBottom:0}}>
                <div className="card-body" style={{display:'flex',gap:14,alignItems:'flex-start'}}>
                  <div style={{width:40,height:40,borderRadius:10,background:'var(--primary-l)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{tip.icon}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:13.5,color:'var(--ink)',marginBottom:5}}>{tip.title}</div>
                    <div style={{fontSize:12.5,color:'var(--ink-3)',lineHeight:1.55}}>{tip.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="card mt-12">
            <div className="card-header"><h3>Psychology Today Resources</h3></div>
            <div className="card-body">
              <div className="grid-3">
                {[
                  ['📊 Analytics Dashboard','Track profile views and inquiries','https://member.psychologytoday.com'],
                  ['🔧 Edit Your Profile','Update bio, photo, specialties','https://member.psychologytoday.com'],
                  ['💰 Subscription & Billing','Manage $29.95/mo fee','https://member.psychologytoday.com'],
                  ['📚 PT Help Center','Guides on optimizing your listing','https://support.psychologytoday.com'],
                  ['🔍 Preview Your Listing','See how clients see our profile','https://www.psychologytoday.com/us/therapists/positive-inner-self-llc-beaverton-or/751449'],
                  ['📧 Contact PT Support','Questions about your account','https://support.psychologytoday.com'],
                ].map(([title, desc, href]) => (
                  <a key={title} href={href} target="_blank" rel="noreferrer" className="report-card" style={{textDecoration:'none'}}>
                    <h4>{title}</h4><p>{desc}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELIGIBILITY PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function EligibilityPage({ db, toast }) {
  const { providers, payers, eligibilityChecks: initChecks = [] } = db
  const [checks, setChecks] = useState(initChecks)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => { setChecks(db.eligibilityChecks || []) }, [db.eligibilityChecks])

  function openAdd() { setForm({ status:'Pending', appt_date: new Date().toISOString().split('T')[0] }); setModal(true) }
  function openEdit(c) { setForm({...c}); setModal(true) }

  async function handleVerify() {
    if (!form.member_id || !form.payer_id) { toast('Member ID and payer required to verify.','error'); return }
    setVerifying(true)
    try {
      const res = await fetch('/api/eligibility', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ memberId: form.member_id, payerId: form.payer_id, dob: form.dob, provId: form.prov_id })
      })
      const data = await res.json()
      if (data.error) { toast(data.error,'error'); setVerifying(false); return }
      setForm(f => ({ ...f, status: data.status||'Eligible', copay: data.copay, deductible: data.deductible, deductible_met: data.deductible_met, oop_max: data.oop_max, oop_met: data.oop_met, plan_name: data.plan_name, group_num: data.group_num, raw_response: data.raw }))
      toast('Eligibility verified!','success')
    } catch(e) { toast('Availity API error: '+e.message,'error') }
    setVerifying(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const saved = await upsertEligibilityCheck(form)
      setChecks(prev => {
        const idx = prev.findIndex(x => x.id === saved.id)
        return idx >= 0 ? prev.map(x => x.id===saved.id?saved:x) : [saved,...prev]
      })
      toast('Saved!','success')
      setModal(false)
    } catch(e) { toast(e.message,'error') }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this eligibility check?')) return
    try { await deleteEligibilityCheck(id); setChecks(c => c.filter(x => x.id!==id)); toast('Deleted.','warn') }
    catch(e) { toast(e.message,'error') }
  }

  const filtered = checks.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || c.patient_name?.toLowerCase().includes(q) || c.member_id?.toLowerCase().includes(q)
    const matchS = !fStatus || c.status === fStatus
    return matchQ && matchS
  })

  const statusColor = { Eligible:'b-green', Ineligible:'b-red', Pending:'b-amber', Error:'b-gray' }

  return (
    <div className="page">
      <div className="kpi-grid">
        {[['Total Checks', checks.length, ''],
          ['Eligible', checks.filter(c=>c.status==='Eligible').length, 'kpi-teal'],
          ['Ineligible', checks.filter(c=>c.status==='Ineligible').length, 'kpi-red'],
          ['Pending', checks.filter(c=>c.status==='Pending').length, 'kpi-amber'],
        ].map(([label, val, cls]) => (
          <div key={label} className={`kpi ${cls}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{val}</div>
          </div>
        ))}
      </div>

      <div style={{background:'var(--blue-l)',border:'1px solid var(--blue-b)',borderRadius:'var(--r-lg)',padding:'13px 16px',marginBottom:16,fontSize:13,color:'var(--blue)'}}>
        <strong>ℹ️ Availity Integration:</strong> Real-time verification requires an Availity provider account (free). Configure your Availity API credentials in Settings, or log checks manually here. SimplePractice data must be entered manually.
      </div>

      <div className="toolbar">
        <div className="search-box"><span className="si">🔍</span><input placeholder="Search patient, member ID…" value={search} onChange={e=>setSearch(e.target.value)} /></div>
        <select className="filter-select" value={fStatus} onChange={e=>setFStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['Eligible','Ineligible','Pending','Error'].map(s=><option key={s}>{s}</option>)}
        </select>
        <div className="toolbar-right">
          <button className="btn btn-primary btn-sm" onClick={openAdd}>＋ Add Check</button>
        </div>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr>
            <th className="no-sort">Patient</th>
            <th className="no-sort">Payer</th>
            <th className="no-sort">Provider</th>
            <th className="no-sort">Appt Date</th>
            <th className="no-sort">Member ID</th>
            <th className="no-sort">Status</th>
            <th className="no-sort">Copay</th>
            <th className="no-sort">Deductible</th>
            <th className="no-sort">Checked</th>
            <th className="no-sort">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={10}><div className="empty-state"><div className="ei">🩺</div><h4>No eligibility checks yet</h4><p>Add a check or verify insurance before appointments</p></div></td></tr>}
            {filtered.map(c => (
              <tr key={c.id}>
                <td><div style={{fontWeight:600}}>{c.patient_name}</div><div style={{fontSize:11,color:'var(--ink-4)'}}>{c.dob ? fmtDate(c.dob) : ''}</div></td>
                <td style={{fontSize:12}}>{payName(payers, c.payer_id)}</td>
                <td style={{fontSize:12}}>{pNameShort(providers, c.prov_id)}</td>
                <td style={{fontSize:12}}>{c.appt_date ? fmtDate(c.appt_date) : '—'}</td>
                <td style={{fontSize:12,fontFamily:'monospace'}}>{c.member_id||'—'}</td>
                <td><span className={`badge ${statusColor[c.status]||'b-gray'}`}>{c.status||'Pending'}</span></td>
                <td style={{fontSize:12}}>{c.copay != null ? fmtMoney(c.copay) : '—'}</td>
                <td style={{fontSize:12}}>
                  {c.deductible != null ? <span>{fmtMoney(c.deductible_met||0)} / {fmtMoney(c.deductible)} met</span> : '—'}
                </td>
                <td style={{fontSize:11,color:'var(--ink-4)'}}>{c.checked_at ? new Date(c.checked_at).toLocaleDateString() : '—'}</td>
                <td>
                  <div style={{display:'flex',gap:5}}>
                    <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(c)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(c.id)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <>
        <div className="drawer-overlay open" onClick={()=>setModal(false)} />
        <div className="drawer">
          <div className="drawer-header">
              <div><h3>{form.id?'Edit Eligibility Check':'New Eligibility Check'}</h3><div className="mh-sub">Verify patient insurance coverage before appointment</div></div>
              <button className="modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="drawer-body">
              <div className="form-grid">
                <div className="fg full"><label>Patient Name *</label><input value={form.patient_name||''} onChange={e=>setForm(f=>({...f,patient_name:e.target.value}))} placeholder="Last, First" /></div>
                <div className="fg"><label>Date of Birth</label><input type="date" value={form.dob||''} onChange={e=>setForm(f=>({...f,dob:e.target.value}))} /></div>
                <div className="fg"><label>Appointment Date</label><input type="date" value={form.appt_date||''} onChange={e=>setForm(f=>({...f,appt_date:e.target.value}))} /></div>
                <div className="fg"><label>Payer</label>
                  <select value={form.payer_id||''} onChange={e=>setForm(f=>({...f,payer_id:e.target.value}))}>
                    <option value="">— Select Payer —</option>
                    {payers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Provider</label>
                  <select value={form.prov_id||''} onChange={e=>setForm(f=>({...f,prov_id:e.target.value}))}>
                    <option value="">— Select Provider —</option>
                    {providers.map(p=><option key={p.id} value={p.id}>{p.fname} {p.lname}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Member ID</label><input value={form.member_id||''} onChange={e=>setForm(f=>({...f,member_id:e.target.value}))} placeholder="Insurance member ID" /></div>
                <div className="fg"><label>Group Number</label><input value={form.group_num||''} onChange={e=>setForm(f=>({...f,group_num:e.target.value}))} /></div>
                <div className="fg"><label>Plan Name</label><input value={form.plan_name||''} onChange={e=>setForm(f=>({...f,plan_name:e.target.value}))} /></div>
                <div className="fg"><label>Coverage Type</label>
                  <select value={form.cov_type||''} onChange={e=>setForm(f=>({...f,cov_type:e.target.value}))}>
                    <option value="">—</option><option>Individual</option><option>Family</option>
                  </select>
                </div>
                <div className="fg"><label>Status</label>
                  <select value={form.status||'Pending'} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {['Pending','Eligible','Ineligible','Error'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="section-divider">Financial Details (manual entry or from API)</div>
                <div className="fg"><label>Copay</label><input type="number" step="0.01" value={form.copay||''} onChange={e=>setForm(f=>({...f,copay:e.target.value}))} placeholder="0.00" /></div>
                <div className="fg"><label>Deductible</label><input type="number" step="0.01" value={form.deductible||''} onChange={e=>setForm(f=>({...f,deductible:e.target.value}))} placeholder="0.00" /></div>
                <div className="fg"><label>Deductible Met</label><input type="number" step="0.01" value={form.deductible_met||''} onChange={e=>setForm(f=>({...f,deductible_met:e.target.value}))} placeholder="0.00" /></div>
                <div className="fg"><label>OOP Max</label><input type="number" step="0.01" value={form.oop_max||''} onChange={e=>setForm(f=>({...f,oop_max:e.target.value}))} placeholder="0.00" /></div>
                <div className="fg"><label>OOP Met</label><input type="number" step="0.01" value={form.oop_met||''} onChange={e=>setForm(f=>({...f,oop_met:e.target.value}))} placeholder="0.00" /></div>
                <div className="fg full"><label>Notes</label><textarea value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} /></div>
              </div>
              <div style={{marginTop:14,padding:'12px 14px',background:'var(--surface-2)',borderRadius:'var(--r-md)',border:'1px solid var(--border)',fontSize:12.5,color:'var(--ink-3)'}}>
                💡 <strong>Availity real-time verification:</strong> Enter member ID + payer, then click "Verify via Availity" to auto-fill eligibility data. Requires Availity API credentials in Settings.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
              <button className="btn btn-ghost" onClick={handleVerify} disabled={verifying}>
                {verifying ? <><span className="spinner"/>Verifying…</> : '🔗 Verify via Availity'}
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner"/>Saving…</> : 'Save'}
              </button>
            </div>
          </div>
          </>

      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAIMS TRACKER PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function ClaimsPage({ db, toast }) {
  const { providers, payers, claims: initClaims = [] } = db
  const [claims, setClaims] = useState(initClaims)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fProv, setFProv] = useState('')
  const [activeTab, setActiveTab] = useState('list')

  useEffect(() => { setClaims(db.claims || []) }, [db.claims])

  function openAdd() {
    setForm({ status:'Submitted', submitted_date: new Date().toISOString().split('T')[0] })
    setModal(true)
  }
  function openEdit(c) { setForm({...c, cpt_codes_str: (c.cpt_codes||[]).join(', '), diag_codes_str: (c.diagnosis_codes||[]).join(', ')}); setModal(true) }

  async function handleSave() {
    const obj = { ...form,
      cpt_codes: form.cpt_codes_str ? form.cpt_codes_str.split(',').map(s=>s.trim()).filter(Boolean) : [],
      diagnosis_codes: form.diag_codes_str ? form.diag_codes_str.split(',').map(s=>s.trim()).filter(Boolean) : [],
    }
    delete obj.cpt_codes_str; delete obj.diag_codes_str
    setSaving(true)
    try {
      const saved = await upsertClaim(obj)
      setClaims(prev => { const idx=prev.findIndex(x=>x.id===saved.id); return idx>=0?prev.map(x=>x.id===saved.id?saved:x):[saved,...prev] })
      toast('Claim saved!','success'); setModal(false)
    } catch(e) { toast(e.message,'error') }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this claim?')) return
    try { await deleteClaim(id); setClaims(c=>c.filter(x=>x.id!==id)); toast('Deleted.','warn') }
    catch(e) { toast(e.message,'error') }
  }

  const filtered = claims.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || c.patient_name?.toLowerCase().includes(q) || c.claim_num?.toLowerCase().includes(q)
    const matchS = !fStatus || c.status === fStatus
    const matchP = !fProv || c.prov_id === fProv
    return matchQ && matchS && matchP
  })

  // A/R Aging
  const aging = Object.fromEntries(AGING_BUCKETS.map(b=>[b,0]))
  const pendingClaims = claims.filter(c => !['Paid','Written Off'].includes(c.status))
  pendingClaims.forEach(c => {
    const bucket = getAgingBucket(c.submitted_date)
    aging[bucket] = (aging[bucket]||0) + (Number(c.billed_amount||0) - Number(c.paid_amount||0))
  })
  const totalAR = Object.values(aging).reduce((s,v)=>s+v,0)
  const totalBilled = claims.reduce((s,c)=>s+Number(c.billed_amount||0),0)
  const totalPaid = claims.reduce((s,c)=>s+Number(c.paid_amount||0),0)
  const totalDenied = claims.filter(c=>c.status==='Denied').reduce((s,c)=>s+Number(c.billed_amount||0),0)

  const statusColor = { Submitted:'b-blue', Pending:'b-amber', Paid:'b-green', Denied:'b-red', Partial:'b-teal', Appeal:'b-purple' }
  const agingColor = ['#16a34a','#d97706','#c97d1e','#dc2626','#7c3aed']

  return (
    <div className="page">
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Total Billed</div><div className="kpi-value" style={{fontSize:26}}>{fmtMoney(totalBilled)}</div></div>
        <div className="kpi kpi-teal"><div className="kpi-label">Total Paid</div><div className="kpi-value" style={{fontSize:26}}>{fmtMoney(totalPaid)}</div><div className="kpi-sub">{totalBilled>0?((totalPaid/totalBilled)*100).toFixed(1):0}% collection rate</div></div>
        <div className="kpi kpi-amber"><div className="kpi-label">Total A/R</div><div className="kpi-value" style={{fontSize:26}}>{fmtMoney(totalAR)}</div><div className="kpi-sub">{pendingClaims.length} open claims</div></div>
        <div className="kpi kpi-red"><div className="kpi-label">Denied</div><div className="kpi-value" style={{fontSize:26}}>{fmtMoney(totalDenied)}</div><div className="kpi-sub">{claims.filter(c=>c.status==='Denied').length} claims</div></div>
      </div>

      <div className="tabs">
        {[['list','📋 All Claims'],['aging','📊 A/R Aging']].map(([t,l])=>(
          <div key={t} className={`tab ${activeTab===t?'active':''}`} onClick={()=>setActiveTab(t)}>{l}</div>
        ))}
      </div>

      {activeTab === 'aging' && (
        <div className="card mb-20">
          <div className="card-header"><h3>A/R Aging Report</h3><span className="ch-meta">Unpaid balance by days outstanding</span></div>
          <div className="card-body">
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
              {AGING_BUCKETS.map((b,i) => (
                <div key={b} style={{textAlign:'center',padding:'16px 8px',borderRadius:'var(--r-lg)',background:'var(--surface-2)',border:'1px solid var(--border)'}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',color:'var(--ink-4)',marginBottom:6}}>{b} days</div>
                  <div style={{fontFamily:'Poppins,sans-serif',fontSize:22,color:agingColor[i],marginBottom:4}}>{fmtMoney(aging[b])}</div>
                  <div style={{fontSize:10,color:'var(--ink-4)'}}>{totalAR>0?((aging[b]/totalAR)*100).toFixed(0):0}% of A/R</div>
                </div>
              ))}
            </div>
            <div style={{background:'var(--surface-2)',borderRadius:'var(--r-md)',padding:'12px 16px'}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--ink-4)',marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>Visual Distribution</div>
              <div style={{display:'flex',height:20,borderRadius:6,overflow:'hidden',gap:2}}>
                {AGING_BUCKETS.map((b,i) => {
                  const pct = totalAR>0?(aging[b]/totalAR)*100:0
                  return pct>0 ? <div key={b} style={{width:`${pct}%`,background:agingColor[i],transition:'width .4s'}} title={`${b} days: ${fmtMoney(aging[b])}`}/> : null
                })}
              </div>
              <div style={{display:'flex',gap:16,marginTop:8,flexWrap:'wrap'}}>
                {AGING_BUCKETS.map((b,i) => (
                  <div key={b} style={{display:'flex',alignItems:'center',gap:5,fontSize:11}}>
                    <div style={{width:8,height:8,borderRadius:2,background:agingColor[i],flexShrink:0}}/>
                    <span style={{color:'var(--ink-3)'}}>{b} days</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'list' && <>
        <div className="toolbar">
          <div className="search-box"><span className="si">🔍</span><input placeholder="Search patient, claim #…" value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <select className="filter-select" value={fStatus} onChange={e=>setFStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {['Submitted','Pending','Paid','Denied','Partial','Appeal'].map(s=><option key={s}>{s}</option>)}
          </select>
          <select className="filter-select" value={fProv} onChange={e=>setFProv(e.target.value)}>
            <option value="">All Providers</option>
            {providers.map(p=><option key={p.id} value={p.id}>{p.fname} {p.lname}</option>)}
          </select>
          <div className="toolbar-right"><button className="btn btn-primary btn-sm" onClick={openAdd}>＋ Add Claim</button></div>
        </div>
        <div style={{marginBottom:12,fontSize:12,color:'var(--ink-4)',padding:'8px 12px',background:'var(--amber-l)',border:'1px solid var(--amber-b)',borderRadius:'var(--r-md)'}}>
          💡 <strong>SimplePractice users:</strong> Export claims from SP → Reports → Billing, then enter manually here. A CSV import tool is planned for a future update.
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr>
              <th className="no-sort">Claim #</th>
              <th className="no-sort">Patient</th>
              <th className="no-sort">DOS</th>
              <th className="no-sort">Provider</th>
              <th className="no-sort">Payer</th>
              <th className="no-sort">CPT</th>
              <th className="no-sort">Billed</th>
              <th className="no-sort">Paid</th>
              <th className="no-sort">Status</th>
              <th className="no-sort">Aging</th>
              <th className="no-sort">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={11}><div className="empty-state"><div className="ei">📋</div><h4>No claims yet</h4><p>Add claims manually or import from your clearinghouse</p></div></td></tr>}
              {filtered.map(c => {
                const bucket = getAgingBucket(c.submitted_date)
                const agingCls = bucket==='120+'?'b-red':bucket==='91–120'?'b-red':bucket==='61–90'?'b-amber':bucket==='31–60'?'b-amber':'b-green'
                return (
                  <tr key={c.id}>
                    <td style={{fontFamily:'monospace',fontSize:11}}>{c.claim_num||'—'}</td>
                    <td><div style={{fontWeight:600,fontSize:13}}>{c.patient_name}</div><div style={{fontSize:11,color:'var(--ink-4)'}}>{c.dob?fmtDate(c.dob):''}</div></td>
                    <td style={{fontSize:12}}>{c.dos?fmtDate(c.dos):'—'}</td>
                    <td style={{fontSize:12}}>{pNameShort(providers,c.prov_id)}</td>
                    <td style={{fontSize:12}}>{payName(payers,c.payer_id)}</td>
                    <td style={{fontSize:11,fontFamily:'monospace'}}>{(c.cpt_codes||[]).join(', ')||'—'}</td>
                    <td style={{fontSize:12,fontWeight:500}}>{fmtMoney(c.billed_amount)}</td>
                    <td style={{fontSize:12,color:'var(--green)'}}>{c.paid_amount?fmtMoney(c.paid_amount):'—'}</td>
                    <td><span className={`badge ${statusColor[c.status]||'b-gray'}`}>{c.status}</span></td>
                    <td>{!['Paid','Written Off'].includes(c.status) ? <span className={`badge ${agingCls}`}>{bucket}</span> : <span style={{fontSize:11,color:'var(--ink-4)'}}>—</span>}</td>
                    <td><div style={{display:'flex',gap:5}}><button className="btn btn-secondary btn-sm" onClick={()=>openEdit(c)}>Edit</button><button className="btn btn-danger btn-sm" onClick={()=>handleDelete(c.id)}>✕</button></div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </>}

      {modal && (
        <>
        <div className="drawer-overlay open" onClick={()=>setModal(false)} />
        <div className="drawer">
          <div className="drawer-header">
              <div><h3>{form.id?'Edit Claim':'New Claim'}</h3><div className="mh-sub">Log a claim from SimplePractice or your clearinghouse</div></div>
              <button className="modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="drawer-body">
              <div className="form-grid">
                <div className="fg"><label>Claim Number</label><input value={form.claim_num||''} onChange={e=>setForm(f=>({...f,claim_num:e.target.value}))} placeholder="Clearinghouse claim #" /></div>
                <div className="fg"><label>Status</label>
                  <select value={form.status||'Submitted'} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {['Submitted','Pending','Paid','Denied','Partial','Appeal'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="fg full"><label>Patient Name *</label><input value={form.patient_name||''} onChange={e=>setForm(f=>({...f,patient_name:e.target.value}))} /></div>
                <div className="fg"><label>Date of Birth</label><input type="date" value={form.dob||''} onChange={e=>setForm(f=>({...f,dob:e.target.value}))} /></div>
                <div className="fg"><label>Date of Service *</label><input type="date" value={form.dos||''} onChange={e=>setForm(f=>({...f,dos:e.target.value}))} /></div>
                <div className="fg"><label>Provider</label>
                  <select value={form.prov_id||''} onChange={e=>setForm(f=>({...f,prov_id:e.target.value}))}>
                    <option value="">— Select —</option>
                    {providers.map(p=><option key={p.id} value={p.id}>{p.fname} {p.lname}</option>)}
                  </select>
                </div>
                <div className="fg"><label>Payer</label>
                  <select value={form.payer_id||''} onChange={e=>setForm(f=>({...f,payer_id:e.target.value}))}>
                    <option value="">— Select —</option>
                    {payers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="fg"><label>CPT Codes (comma-separated)</label><input value={form.cpt_codes_str||''} onChange={e=>setForm(f=>({...f,cpt_codes_str:e.target.value}))} placeholder="90837, 90846" /></div>
                <div className="fg"><label>Diagnosis Codes (comma-separated)</label><input value={form.diag_codes_str||''} onChange={e=>setForm(f=>({...f,diag_codes_str:e.target.value}))} placeholder="F41.1, Z63.0" /></div>
                <div className="section-divider">Financials</div>
                <div className="fg"><label>Billed Amount</label><input type="number" step="0.01" value={form.billed_amount||''} onChange={e=>setForm(f=>({...f,billed_amount:e.target.value}))} placeholder="0.00" /></div>
                <div className="fg"><label>Allowed Amount</label><input type="number" step="0.01" value={form.allowed_amount||''} onChange={e=>setForm(f=>({...f,allowed_amount:e.target.value}))} /></div>
                <div className="fg"><label>Paid Amount</label><input type="number" step="0.01" value={form.paid_amount||''} onChange={e=>setForm(f=>({...f,paid_amount:e.target.value}))} /></div>
                <div className="fg"><label>Patient Responsibility</label><input type="number" step="0.01" value={form.patient_resp||''} onChange={e=>setForm(f=>({...f,patient_resp:e.target.value}))} /></div>
                <div className="fg"><label>Submitted Date</label><input type="date" value={form.submitted_date||''} onChange={e=>setForm(f=>({...f,submitted_date:e.target.value}))} /></div>
                <div className="fg"><label>Paid Date</label><input type="date" value={form.paid_date||''} onChange={e=>setForm(f=>({...f,paid_date:e.target.value}))} /></div>
                <div className="fg"><label>Clearinghouse</label><input value={form.clearinghouse||''} onChange={e=>setForm(f=>({...f,clearinghouse:e.target.value}))} placeholder="Availity, Office Ally…" /></div>
                <div className="fg"><label>ERA Received</label>
                  <select value={form.era_received?'yes':'no'} onChange={e=>setForm(f=>({...f,era_received:e.target.value==='yes'}))}>
                    <option value="no">No</option><option value="yes">Yes</option>
                  </select>
                </div>
                <div className="fg full"><label>Notes</label><textarea value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?<><span className="spinner"/>Saving…</>:'Save Claim'}</button>
            </div>
          </div>
          </>

      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DENIAL LOG PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function DenialLog({ db, toast }) {
  const { providers, payers, denials: initDenials = [], claims = [] } = db
  const [denials, setDenials] = useState(initDenials)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [fAppeal, setFAppeal] = useState('')
  const [fCat, setFCat] = useState('')

  useEffect(() => { setDenials(db.denials || []) }, [db.denials])

  function openAdd() { setForm({ appeal_status:'Not Started', denial_date: new Date().toISOString().split('T')[0] }); setModal(true) }
  function openEdit(d) { setForm({...d}); setModal(true) }

  // Auto-calc appeal deadline (90 days from denial) when denial date changes
  function handleDenialDateChange(val) {
    const deadline = new Date(val)
    deadline.setDate(deadline.getDate()+90)
    setForm(f=>({...f, denial_date:val, appeal_deadline: deadline.toISOString().split('T')[0]}))
  }

  function handleCodeSelect(code) {
    const found = DENIAL_CODES.find(d=>d.code===code)
    if (found) setForm(f=>({...f, reason_code:found.code, reason_desc:found.desc, category:found.cat}))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const saved = await upsertDenial(form)
      setDenials(prev=>{ const idx=prev.findIndex(x=>x.id===saved.id); return idx>=0?prev.map(x=>x.id===saved.id?saved:x):[saved,...prev] })
      toast('Denial logged!','success'); setModal(false)
    } catch(e) { toast(e.message,'error') }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this denial?')) return
    try { await deleteDenial(id); setDenials(d=>d.filter(x=>x.id!==id)); toast('Deleted.','warn') }
    catch(e) { toast(e.message,'error') }
  }

  const filtered = denials.filter(d => {
    const q = search.toLowerCase()
    const claimPatient = d.claims?.patient_name||''
    const matchQ = !q || d.reason_code?.toLowerCase().includes(q) || claimPatient.toLowerCase().includes(q) || d.reason_desc?.toLowerCase().includes(q)
    const matchA = !fAppeal || d.appeal_status===fAppeal
    const matchC = !fCat || d.category===fCat
    return matchQ && matchA && matchC
  })

  // Stats
  const totalDenied = denials.length
  const won = denials.filter(d=>d.appeal_status==='Won').length
  const pending = denials.filter(d=>['Not Started','In Progress'].includes(d.appeal_status)).length
  const overdue = denials.filter(d=>d.appeal_deadline && daysUntil(d.appeal_deadline)!==null && daysUntil(d.appeal_deadline)<0 && !['Won','Lost','Written Off'].includes(d.appeal_status)).length

  const appealColor = { 'Not Started':'b-gray','In Progress':'b-blue','Won':'b-green','Lost':'b-red','Written Off':'b-amber' }
  const catColor = { 'Authorization':'b-purple','Coding':'b-blue','Eligibility':'b-teal','Timely Filing':'b-red','Coordination':'b-amber','Information':'b-gray','Patient Resp':'b-gold','Prior Payer':'b-gray' }

  // Denial by category breakdown
  const byCat = {}
  denials.forEach(d=>{ byCat[d.category||'Other']=(byCat[d.category||'Other']||0)+1 })

  return (
    <div className="page">
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Total Denials</div><div className="kpi-value">{totalDenied}</div></div>
        <div className="kpi kpi-red"><div className="kpi-label">Overdue Appeals</div><div className="kpi-value">{overdue}</div><div className="kpi-sub">Deadline passed</div></div>
        <div className="kpi kpi-amber"><div className="kpi-label">Pending Appeals</div><div className="kpi-value">{pending}</div></div>
        <div className="kpi kpi-teal"><div className="kpi-label">Appeals Won</div><div className="kpi-value">{won}</div><div className="kpi-sub">{totalDenied>0?((won/totalDenied)*100).toFixed(0):0}% win rate</div></div>
      </div>

      {overdue > 0 && (
        <div style={{background:'var(--red-l)',border:'1px solid var(--red-b)',borderRadius:'var(--r-lg)',padding:'12px 16px',marginBottom:16,fontSize:13,color:'var(--red)'}}>
          ⚠️ <strong>{overdue} appeal deadline{overdue>1?'s':''} overdue.</strong> Review and mark as Written Off or escalate immediately.
        </div>
      )}

      {Object.keys(byCat).length > 0 && (
        <div className="card mb-20">
          <div className="card-header"><h3>Denials by Category</h3></div>
          <div className="card-body">
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat, count]) => (
                <div key={cat} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:'var(--r-lg)'}}>
                  <span className={`badge ${catColor[cat]||'b-gray'}`} style={{fontSize:10}}>{cat}</span>
                  <span style={{fontFamily:'Poppins,sans-serif',fontSize:20,color:'var(--ink)'}}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="search-box"><span className="si">🔍</span><input placeholder="Search code, patient, description…" value={search} onChange={e=>setSearch(e.target.value)} /></div>
        <select className="filter-select" value={fCat} onChange={e=>setFCat(e.target.value)}>
          <option value="">All Categories</option>
          {['Authorization','Coding','Eligibility','Timely Filing','Coordination','Information','Patient Resp','Prior Payer'].map(c=><option key={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={fAppeal} onChange={e=>setFAppeal(e.target.value)}>
          <option value="">All Appeal Statuses</option>
          {['Not Started','In Progress','Won','Lost','Written Off'].map(s=><option key={s}>{s}</option>)}
        </select>
        <div className="toolbar-right"><button className="btn btn-primary btn-sm" onClick={openAdd}>＋ Log Denial</button></div>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr>
            <th className="no-sort">Patient / DOS</th>
            <th className="no-sort">Reason Code</th>
            <th className="no-sort">Category</th>
            <th className="no-sort">Denial Date</th>
            <th className="no-sort">Appeal Deadline</th>
            <th className="no-sort">Appeal Status</th>
            <th className="no-sort">Days Left</th>
            <th className="no-sort">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.length===0 && <tr><td colSpan={8}><div className="empty-state"><div className="ei">🚫</div><h4>No denials logged</h4><p>Log a denial to track appeals and deadlines</p></div></td></tr>}
            {filtered.map(d => {
              const dl = daysUntil(d.appeal_deadline)
              const deadlineClass = dl===null?'b-gray':dl<0?'b-red':dl<=14?'b-red':dl<=30?'b-amber':'b-green'
              const isDone = ['Won','Lost','Written Off'].includes(d.appeal_status)
              return (
                <tr key={d.id} style={d.appeal_status==='Won'?{background:'#f0fdf4'}:overdue&&dl!==null&&dl<0&&!isDone?{background:'var(--red-l)'}:{}}>
                  <td>
                    <div style={{fontWeight:600}}>{d.claims?.patient_name||'—'}</div>
                    <div style={{fontSize:11,color:'var(--ink-4)'}}>{d.claims?.dos?fmtDate(d.claims.dos):''}</div>
                  </td>
                  <td>
                    <span style={{fontFamily:'monospace',fontSize:12,fontWeight:600,color:'var(--ink)'}}>{d.reason_code||'—'}</span>
                    <div style={{fontSize:11,color:'var(--ink-4)',marginTop:2,maxWidth:180}}>{d.reason_desc||''}</div>
                  </td>
                  <td>{d.category ? <span className={`badge ${catColor[d.category]||'b-gray'}`} style={{fontSize:10}}>{d.category}</span> : '—'}</td>
                  <td style={{fontSize:12}}>{d.denial_date?fmtDate(d.denial_date):'—'}</td>
                  <td style={{fontSize:12}}>{d.appeal_deadline?fmtDate(d.appeal_deadline):'—'}</td>
                  <td><span className={`badge ${appealColor[d.appeal_status]||'b-gray'}`}>{d.appeal_status||'Not Started'}</span></td>
                  <td>
                    {isDone ? <span style={{fontSize:11,color:'var(--ink-4)'}}>—</span>
                    : dl===null ? '—'
                    : <span className={`badge ${deadlineClass}`}>{dl<0?`${Math.abs(dl)}d overdue`:`${dl}d`}</span>}
                  </td>
                  <td><div style={{display:'flex',gap:5}}><button className="btn btn-secondary btn-sm" onClick={()=>openEdit(d)}>Edit</button><button className="btn btn-danger btn-sm" onClick={()=>handleDelete(d.id)}>✕</button></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <>
        <div className="drawer-overlay open" onClick={()=>setModal(false)} />
        <div className="drawer">
          <div className="drawer-header">
              <div><h3>{form.id?'Edit Denial':'Log Denial'}</h3><div className="mh-sub">Track denial reason, appeal status, and deadline</div></div>
              <button className="modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="drawer-body">
              <div className="form-grid">
                <div className="fg"><label>Linked Claim (optional)</label>
                  <select value={form.claim_id||''} onChange={e=>setForm(f=>({...f,claim_id:e.target.value}))}>
                    <option value="">— Unlinked —</option>
                    {claims.map(c=><option key={c.id} value={c.id}>{c.patient_name} — {c.dos?fmtDate(c.dos):''} (#{c.claim_num||'no #'})</option>)}
                  </select>
                </div>
                <div className="fg"><label>Denial Date *</label><input type="date" value={form.denial_date||''} onChange={e=>handleDenialDateChange(e.target.value)} /></div>
                <div className="fg"><label>Reason Code</label>
                  <select value={form.reason_code||''} onChange={e=>handleCodeSelect(e.target.value)}>
                    <option value="">— Select code —</option>
                    {DENIAL_CODES.map(d=><option key={d.code} value={d.code}>{d.code} — {d.desc}</option>)}
                    <option value="OTHER">Other (enter manually)</option>
                  </select>
                </div>
                <div className="fg"><label>Category</label>
                  <select value={form.category||''} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                    <option value="">—</option>
                    {['Authorization','Coding','Eligibility','Timely Filing','Coordination','Information','Patient Resp','Prior Payer','Other'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="fg full"><label>Reason Description</label><input value={form.reason_desc||''} onChange={e=>setForm(f=>({...f,reason_desc:e.target.value}))} placeholder="Description of denial reason" /></div>
                <div className="fg"><label>Appeal Deadline</label><input type="date" value={form.appeal_deadline||''} onChange={e=>setForm(f=>({...f,appeal_deadline:e.target.value}))} /></div>
                <div className="fg"><label>Appeal Status</label>
                  <select value={form.appeal_status||'Not Started'} onChange={e=>setForm(f=>({...f,appeal_status:e.target.value}))}>
                    {['Not Started','In Progress','Won','Lost','Written Off'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="fg full"><label>Appeal Notes</label><textarea value={form.appeal_notes||''} onChange={e=>setForm(f=>({...f,appeal_notes:e.target.value}))} rows={3} placeholder="Document steps taken, attachments sent, contacts made…" /></div>
              </div>
              <div style={{marginTop:14}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',color:'var(--ink-4)',marginBottom:8}}>Common Denial Codes Reference</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                  {DENIAL_CODES.map(d=>(
                    <button key={d.code} className="btn btn-ghost btn-sm" style={{fontFamily:'monospace',fontSize:11}} onClick={()=>handleCodeSelect(d.code)} title={d.desc}>{d.code}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?<><span className="spinner"/>Saving…</>:'Save'}</button>
            </div>
          </div>
          </>

      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVENUE ANALYTICS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function RevenueAnalytics({ db }) {
  const { providers, payers, claims = [], payments = [] } = db
  const [period, setPeriod] = useState('month') // month | quarter | year | all

  function getWindowStart() {
    const now = new Date()
    if (period==='month') { const d=new Date(now); d.setDate(1); return d }
    if (period==='quarter') { const d=new Date(now); d.setMonth(Math.floor(d.getMonth()/3)*3,1); return d }
    if (period==='year') { return new Date(now.getFullYear(),0,1) }
    return new Date('2000-01-01')
  }

  const windowStart = getWindowStart()
  const inPeriod = c => !c.dos || new Date(c.dos) >= windowStart

  const periodClaims = claims.filter(inPeriod)
  const totalBilled = periodClaims.reduce((s,c)=>s+Number(c.billed_amount||0),0)
  const totalPaid = periodClaims.reduce((s,c)=>s+Number(c.paid_amount||0),0)
  const totalDenied = periodClaims.filter(c=>c.status==='Denied').reduce((s,c)=>s+Number(c.billed_amount||0),0)
  const totalAR = periodClaims.filter(c=>!['Paid','Written Off'].includes(c.status)).reduce((s,c)=>s+Number(c.billed_amount||0)-Number(c.paid_amount||0),0)
  const collRate = totalBilled > 0 ? (totalPaid/totalBilled*100) : 0

  // By Provider
  const byProvider = {}
  periodClaims.forEach(c => {
    const key = c.prov_id || 'unknown'
    if (!byProvider[key]) byProvider[key] = { billed:0, paid:0, count:0, denied:0 }
    byProvider[key].billed += Number(c.billed_amount||0)
    byProvider[key].paid += Number(c.paid_amount||0)
    byProvider[key].count++
    if (c.status==='Denied') byProvider[key].denied++
  })

  // By Payer
  const byPayer = {}
  periodClaims.forEach(c => {
    const key = c.payer_id || 'unknown'
    if (!byPayer[key]) byPayer[key] = { billed:0, paid:0, count:0 }
    byPayer[key].billed += Number(c.billed_amount||0)
    byPayer[key].paid += Number(c.paid_amount||0)
    byPayer[key].count++
  })

  // Monthly trend (last 6 months)
  const months = []
  for (let i=5;i>=0;i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth()-i)
    const label = d.toLocaleDateString('en-US',{month:'short',year:'2-digit'})
    const start = new Date(d)
    const end = new Date(d.getFullYear(), d.getMonth()+1, 1)
    const mc = claims.filter(c => c.dos && new Date(c.dos)>=start && new Date(c.dos)<end)
    months.push({
      label,
      billed: mc.reduce((s,c)=>s+Number(c.billed_amount||0),0),
      paid: mc.reduce((s,c)=>s+Number(c.paid_amount||0),0),
    })
  }
  const maxMonthVal = Math.max(...months.map(m=>m.billed), 1)

  const PROV_COLORS = ['#1a6ef5','#16a34a','#d97706','#7c3aed','#0891b2','#dc2626']

  return (
    <div className="page">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
        <div style={{flex:1,fontFamily:'Poppins,sans-serif',fontSize:18,color:'var(--ink)'}}>Revenue Overview</div>
        <div style={{display:'flex',gap:4,background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:'var(--r-lg)',padding:4}}>
          {[['month','This Month'],['quarter','This Quarter'],['year','This Year'],['all','All Time']].map(([v,l])=>(
            <button key={v} className={`btn btn-sm ${period===v?'btn-primary':'btn-ghost'}`} style={{fontSize:11}} onClick={()=>setPeriod(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Billed</div><div className="kpi-value" style={{fontSize:24}}>{fmtMoney(totalBilled)}</div><div className="kpi-sub">{periodClaims.length} claims</div></div>
        <div className="kpi kpi-teal"><div className="kpi-label">Collected</div><div className="kpi-value" style={{fontSize:24}}>{fmtMoney(totalPaid)}</div><div className="kpi-sub">{collRate.toFixed(1)}% collection rate</div></div>
        <div className="kpi kpi-amber"><div className="kpi-label">Outstanding A/R</div><div className="kpi-value" style={{fontSize:24}}>{fmtMoney(totalAR)}</div></div>
        <div className="kpi kpi-red"><div className="kpi-label">Denied</div><div className="kpi-value" style={{fontSize:24}}>{fmtMoney(totalDenied)}</div></div>
      </div>

      {/* Collection Rate Bar */}
      <div className="card mb-20">
        <div className="card-header"><h3>Collection Rate</h3><span className="ch-meta">{collRate.toFixed(1)}% of billed collected</span></div>
        <div className="card-body">
          <div style={{height:12,background:'var(--border-2)',borderRadius:6,overflow:'hidden',marginBottom:8}}>
            <div style={{height:'100%',width:`${Math.min(collRate,100)}%`,background: collRate>=85?'var(--green)':collRate>=70?'var(--amber)':'var(--red)',borderRadius:6,transition:'width .4s'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--ink-4)'}}>
            <span>0%</span><span style={{color:collRate>=85?'var(--green)':collRate>=70?'var(--amber)':'var(--red)',fontWeight:600}}>{collRate.toFixed(1)}%</span><span>100%</span>
          </div>
          <div style={{marginTop:10,fontSize:12,color:'var(--ink-3)'}}>
            Industry benchmark for mental health practices: <strong>75–85%</strong>. {collRate>=85?'✅ Above benchmark!':collRate>=75?'🟡 Within benchmark.':'⚠️ Below benchmark — review denial patterns.'}
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="card mb-20">
        <div className="card-header"><h3>Monthly Billing Trend</h3><span className="ch-meta">Last 6 months</span></div>
        <div className="card-body">
          {months.every(m=>m.billed===0) ? (
            <div className="empty-state" style={{padding:24}}><div className="ei">📊</div><p>No claim data yet — add claims to see trends</p></div>
          ) : (
            <div style={{display:'flex',alignItems:'flex-end',gap:8,height:140,paddingBottom:24,position:'relative'}}>
              {months.map((m,i) => (
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  <div style={{width:'100%',display:'flex',gap:2,alignItems:'flex-end',height:110}}>
                    <div style={{flex:1,background:'#dbeafe',borderRadius:'4px 4px 0 0',height:`${(m.billed/maxMonthVal)*100}%`,minHeight:2,position:'relative'}} title={`Billed: ${fmtMoney(m.billed)}`}/>
                    <div style={{flex:1,background:'#16a34a',borderRadius:'4px 4px 0 0',height:`${(m.paid/maxMonthVal)*100}%`,minHeight:m.paid>0?2:0}} title={`Paid: ${fmtMoney(m.paid)}`}/>
                  </div>
                  <div style={{fontSize:9,color:'var(--ink-4)',whiteSpace:'nowrap'}}>{m.label}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{display:'flex',gap:16,marginTop:4}}>
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11}}><div style={{width:10,height:10,background:'#dbeafe',borderRadius:2}}/><span>Billed</span></div>
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11}}><div style={{width:10,height:10,background:'#16a34a',borderRadius:2}}/><span>Collected</span></div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* By Provider */}
        <div className="card">
          <div className="card-header"><h3>Revenue by Provider</h3></div>
          <div className="card-body">
            {Object.keys(byProvider).length === 0 ? (
              <div className="empty-state" style={{padding:16}}><p>No data yet</p></div>
            ) : Object.entries(byProvider).sort((a,b)=>b[1].billed-a[1].billed).map(([provId, data], i) => (
              <div key={provId} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <div style={{fontSize:12.5,fontWeight:600,color:'var(--ink)'}}>{pNameShort(providers,provId)||'Unknown'}</div>
                  <div style={{fontSize:12,color:'var(--ink-3)'}}>{fmtMoney(data.paid)} / {fmtMoney(data.billed)}</div>
                </div>
                <div style={{height:7,background:'var(--border-2)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${data.billed>0?(data.paid/data.billed*100):0}%`,background:PROV_COLORS[i%PROV_COLORS.length],borderRadius:4}}/>
                </div>
                <div style={{fontSize:10,color:'var(--ink-4)',marginTop:2}}>{data.count} claims · {data.denied} denied</div>
              </div>
            ))}
          </div>
        </div>

        {/* By Payer */}
        <div className="card">
          <div className="card-header"><h3>Revenue by Payer</h3></div>
          <div className="card-body">
            {Object.keys(byPayer).length === 0 ? (
              <div className="empty-state" style={{padding:16}}><p>No data yet</p></div>
            ) : Object.entries(byPayer).sort((a,b)=>b[1].paid-a[1].paid).map(([payerId, data], i) => (
              <div key={payerId} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <div style={{fontSize:12.5,fontWeight:600}}>{payName(payers,payerId)||'Unknown'}</div>
                  <div style={{fontSize:12,color:'var(--ink-3)'}}>{data.billed>0?(data.paid/data.billed*100).toFixed(0):0}% collected</div>
                </div>
                <div style={{height:7,background:'var(--border-2)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${data.billed>0?(data.paid/data.billed*100):0}%`,background:PROV_COLORS[(i+2)%PROV_COLORS.length],borderRadius:4}}/>
                </div>
                <div style={{fontSize:10,color:'var(--ink-4)',marginTop:2}}>{data.count} claims · {fmtMoney(data.paid)} paid</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-12" style={{marginTop:16}}>
        <div className="card-header"><h3>SimplePractice Import Guide</h3></div>
        <div className="card-body">
          <div style={{fontSize:13,color:'var(--ink-3)',lineHeight:1.7}}>
            Since SimplePractice doesn't offer a direct API integration, revenue data must be imported manually. Here's the recommended workflow:
          </div>
          <ol style={{marginTop:12,paddingLeft:20,fontSize:13,color:'var(--ink-3)',lineHeight:2}}>
            <li>In SimplePractice, go to <strong>Reports → Billing</strong></li>
            <li>Export to CSV for the desired date range</li>
            <li>Enter each claim in the <strong>Claims Tracker</strong> (or use the upcoming CSV import feature)</li>
            <li>Update payment status when EOBs / ERAs are received from payers</li>
            <li>Log any denials in the <strong>Denial Log</strong> with the reason code from the ERA</li>
          </ol>
          <div style={{marginTop:12,padding:'10px 14px',background:'var(--blue-l)',border:'1px solid var(--blue-b)',borderRadius:'var(--r-md)',fontSize:12,color:'var(--blue)'}}>
            💡 <strong>Future:</strong> CSV batch import for SimplePractice billing exports is planned. Until then, entering claims manually ensures accurate A/R aging and denial tracking.
          </div>
        </div>
      </div>
    </div>
  )
}
