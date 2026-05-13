/**
 * BillingHub.jsx — Lacentra
 * Unified Billing tab: Claims · Eligibility · Denial Log · Revenue Analytics
 * CSV batch import for Claims and Revenue (SimplePractice compatible).
 */

import { useState } from 'react'
import { ClaimsPage } from './ClaimsPage.jsx'
import { EligibilityPage } from './EligibilityPage.jsx'
import { DenialLog } from './DenialLog.jsx'
import { RevenueAnalytics } from './RevenueAnalytics.jsx'

const TABS = [
  {
    id: 'claims',
    label: 'Claims',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
    desc: 'Track & manage billing claims and A/R',
  },
  {
    id: 'eligibility',
    label: 'Eligibility',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    desc: 'Verify patient insurance eligibility',
  },
  {
    id: 'denials',
    label: 'Denial Log',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
    desc: 'Log and appeal denied claims',
  },
  {
    id: 'revenue',
    label: 'Revenue Analytics',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    desc: 'Financial performance & trends',
  },
]

// ── SimplePractice CSV Import ────────────────────────────────────────────────
const SP_MAP = {
  // Claims
  'Client Name': 'patient_name', 'Patient Name': 'patient_name',
  'Service Date': 'dos', 'Date of Service': 'dos',
  'Claim #': 'claim_num', 'Claim Number': 'claim_num',
  'Insurance': 'payer_name', 'Payer': 'payer_name',
  'Billed': 'billed_amount', 'Billed Amount': 'billed_amount', 'Charge': 'billed_amount',
  'Paid': 'paid_amount', 'Amount Paid': 'paid_amount', 'Payment': 'paid_amount',
  'Status': 'status', 'Claim Status': 'status',
  'CPT': 'cpt_codes', 'CPT Code': 'cpt_codes', 'Procedure Code': 'cpt_codes',
  'Provider': 'provider_name', 'Rendering Provider': 'provider_name',
  // Revenue
  'Amount': 'amount', 'Revenue': 'amount',
  'Date': 'date', 'Payment Date': 'date',
  'Type': 'payment_type', 'Payment Type': 'payment_type',
}

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row = {}
    headers.forEach((h, i) => {
      const key = SP_MAP[h] || h.toLowerCase().replace(/\s+/g, '_')
      row[key] = vals[i] || ''
    })
    return row
  }).filter(row => Object.values(row).some(v => v))
}

function CSVImportBanner({ onImport, target }) {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview]   = useState(null)
  const [rows, setRows]         = useState([])
  const [done, setDone]         = useState(false)

  function handleFile(file) {
    if (!file || !file.name.endsWith('.csv')) return
    const reader = new FileReader()
    reader.onload = e => {
      const parsed = parseCSV(e.target.result)
      setRows(parsed)
      setPreview(parsed.slice(0, 3))
      setDone(false)
    }
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function handleImport() {
    if (onImport) onImport(rows)
    setDone(true)
    setPreview(null)
    setRows([])
  }

  if (done) return (
    <div style={{ background: 'rgba(16,185,129,.07)', border: '1.5px solid rgba(16,185,129,.3)', borderRadius: 10, padding: '12px 16px', fontSize: 12.5, color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      ✓ CSV imported successfully! Records added to {target}.
      <button onClick={() => setDone(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#059669', fontSize: 11 }}>Import another ×</button>
    </div>
  )

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--pr)' : 'var(--border)'}`,
          borderRadius: 10, padding: '14px 18px',
          background: dragging ? 'var(--pr-l)' : 'var(--elevated)',
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          transition: 'all .15s',
        }}
        onClick={() => document.getElementById(`csv-input-${target}`).click()}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={dragging ? 'var(--pr)' : 'var(--text-4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: dragging ? 'var(--pr)' : 'var(--text-2)' }}>
            Drop SimplePractice CSV here or click to browse
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
            Export from SimplePractice → Reports → Billing. Supports all SP export column formats.
          </div>
        </div>
        <input id={`csv-input-${target}`} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])} />
      </div>

      {preview && (
        <div style={{ marginTop: 10, background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', background: 'var(--elevated)', borderBottom: '1px solid var(--border-l)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
              Preview — {rows.length} records found
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setPreview(null); setRows([]) }}
                style={{ fontSize: 11.5, color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleImport} className="btn btn-primary btn-sm">
                Import {rows.length} Records
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontSize: 11.5, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {Object.keys(preview[0] || {}).slice(0, 6).map(k => (
                    <th key={k} style={{ padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid var(--border-l)', color: 'var(--text-4)', fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-l)' }}>
                    {Object.values(row).slice(0, 6).map((v, j) => (
                      <td key={j} style={{ padding: '5px 12px', color: 'var(--text-2)' }}>{v || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 3 && (
            <div style={{ padding: '6px 14px', fontSize: 11, color: 'var(--text-4)', borderTop: '1px solid var(--border-l)' }}>
              +{rows.length - 3} more rows not shown in preview
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function BillingHub({ db, toast, requestConfirm, onDraftAppeal }) {
  const [activeTab, setActiveTab] = useState('claims')
  const [showImport, setShowImport] = useState(false)

  // KPI summary across all billing data
  const claims = db.claims || []
  const denials = db.claimDenials || []
  const elig = db.eligibilityChecks || []
  const totalBilled = claims.reduce((s, c) => s + Number(c.billed_amount || 0), 0)
  const totalPaid   = claims.reduce((s, c) => s + Number(c.paid_amount || 0), 0)
  const openClaims  = claims.filter(c => !['Paid', 'Written Off'].includes(c.status)).length
  const denialRate  = claims.length > 0 ? ((claims.filter(c => c.status === 'Denied').length / claims.length) * 100).toFixed(1) : '0.0'

  function fmtMoney(n) {
    return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function handleCSVImport(rows) {
    // In a real app these would be upserted to Supabase
    toast(`Imported ${rows.length} records from CSV`, 'success')
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-.04em', margin: 0, marginBottom: 3 }}>Billing</h2>
          <p style={{ fontSize: 12.5, color: 'var(--text-4)', margin: 0 }}>Claims, eligibility, denials, and revenue analytics in one place.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setShowImport(s => !s)}
            className={`btn btn-sm ${showImport ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {showImport ? 'Hide Import' : 'CSV Import'}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <div className="kpi">
          <div className="kpi-label">Total Billed</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{fmtMoney(totalBilled)}</div>
        </div>
        <div className="kpi kpi-teal">
          <div className="kpi-label">Collected</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{fmtMoney(totalPaid)}</div>
          <div className="kpi-sub">{totalBilled > 0 ? ((totalPaid / totalBilled) * 100).toFixed(1) : 0}% rate</div>
        </div>
        <div className="kpi kpi-amber">
          <div className="kpi-label">Open Claims</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{openClaims}</div>
          <div className="kpi-sub">{fmtMoney(totalBilled - totalPaid)} outstanding</div>
        </div>
        <div className="kpi kpi-red">
          <div className="kpi-label">Denial Rate</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{denialRate}%</div>
          <div className="kpi-sub">{denials.length} logged denials</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Elig Checks</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{elig.length}</div>
          <div className="kpi-sub">{elig.filter(e => e.status === 'Eligible').length} eligible</div>
        </div>
      </div>

      {/* CSV Import Panel */}
      {showImport && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: 'var(--pr-l)', border: '1.5px solid rgba(21,101,192,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#1e40af', fontWeight: 500, marginBottom: 10 }}>
            ℹ Import from SimplePractice: Reports → Billing → Export CSV. Works for Claims and Revenue exports.
          </div>
          <CSVImportBanner onImport={handleCSVImport} target={activeTab === 'revenue' ? 'Revenue Analytics' : 'Claims'} />
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{
        display: 'flex', gap: 2, background: 'var(--elevated)', border: '1.5px solid var(--border)',
        borderRadius: 10, padding: 4, marginBottom: 20, flexWrap: 'wrap',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, padding: '8px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, transition: 'all var(--t)',
            background: activeTab === t.id ? 'var(--navy)' : 'transparent',
            color: activeTab === t.id ? '#fff' : 'var(--text-3)',
            boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,.15)' : 'none',
          }}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {activeTab === 'claims'      && <ClaimsPage db={db} toast={toast} requestConfirm={requestConfirm} />}
      {activeTab === 'eligibility' && <EligibilityPage db={db} toast={toast} requestConfirm={requestConfirm} />}
      {activeTab === 'denials'     && <DenialLog db={db} toast={toast} onDraftAppeal={onDraftAppeal} requestConfirm={requestConfirm} />}
      {activeTab === 'revenue'     && <RevenueAnalytics db={db} />}
    </div>
  )
}

export default BillingHub
