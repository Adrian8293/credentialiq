/**
 * MarketingPage.jsx — PrimeCredential
 * Psychology Today profile management, directory tracking, and optimization tips.
 */

import { useState } from 'react'
import { PsychologyToday } from '../providers/PsychologyToday.jsx'

const TABS = [
  { id: 'pt',        label: 'Psychology Today' },
  { id: 'directory', label: 'Profile Directory' },
  { id: 'tips',      label: 'Optimization Tips' },
]

const PT_TIPS = [
  { icon: '📸', title: 'Add a professional photo', desc: 'Profiles with photos receive significantly more clicks. Upload via the provider Edit page in PrimeCredential.', impact: 'High' },
  { icon: '✍️', title: 'Write a personal bio', desc: 'Therapists who describe their approach and personality in first person convert better with potential clients.', impact: 'High' },
  { icon: '🎥', title: 'Add a video introduction', desc: 'PT supports a short video intro. Even 60 seconds dramatically increases new client inquiries.', impact: 'High' },
  { icon: '🏥', title: 'List all accepted insurances', desc: 'Many clients filter by insurance. Make sure every active payer enrollment is reflected on the PT profile.', impact: 'High' },
  { icon: '🎯', title: 'Narrow your specialty focus', desc: '"Trauma and PTSD using EMDR" outperforms "anxiety and depression" in PT search rankings.', impact: 'Medium' },
  { icon: '💬', title: 'Enable online booking', desc: 'Profiles with booking links convert at a higher rate. Consider linking your intake form directly.', impact: 'Medium' },
  { icon: '🔄', title: 'Keep availability updated', desc: 'Profiles marked as accepting new clients rank higher in PT search results automatically.', impact: 'Medium' },
  { icon: '⭐', title: 'Complete the entire profile', desc: 'PT favors complete profiles. Fill in every section including finances and statement.', impact: 'Medium' },
  { icon: '🌐', title: 'List telehealth availability', desc: 'Telehealth-enabled listings receive significantly more views post-pandemic.', impact: 'Low' },
  { icon: '💳', title: 'Update insurance accepted', desc: 'Accurate insurance data drives organic referrals from PT search to your providers.', impact: 'Low' },
]

function ProfileDirectory({ db, editProvider }) {
  const mhProvs = db.providers.filter(p => p.spec === 'Mental Health')
  const active = mhProvs.filter(p => p.ptStatus === 'Active').length
  const total  = mhProvs.length

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Total MH Providers', val: total, color: 'var(--pr)' },
          { label: 'PT Active Profiles', val: active, color: 'var(--success)' },
          { label: 'Profiles Needed', val: total - active, color: total - active > 0 ? 'var(--warning)' : 'var(--success)' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color, marginBottom: 3 }}>{k.val}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, text: 'uppercase', letterSpacing: '.04em', color: 'var(--text-4)', textTransform: 'uppercase' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr>
            <th>Provider</th><th>Specialty</th><th>PT Status</th><th>Monthly Fee</th><th>Profile URL</th><th>Notes</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {!mhProvs.length ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <div className="empty-state-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1E56F0" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
                  <div className="empty-state-title">No mental health providers</div>
                  <div className="empty-state-desc">Add providers with "Mental Health" specialty to manage their PT profiles here.</div>
                </div>
              </td></tr>
            ) : mhProvs.map(p => {
              const ptStatus = p.ptStatus || 'None'
              const statusCls = ptStatus === 'Active' ? 'b-green' : ptStatus === 'Inactive' ? 'b-amber' : 'b-gray'
              const ini = ((p.fname||'?')[0] + (p.lname||'')[0]).toUpperCase()
              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{ini}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-1)' }}>{p.fname} {p.lname}{p.cred?`, ${p.cred}`:''}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{p.email||'No email'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge b-purple">{p.spec}</span></td>
                  <td><span className={`badge ${statusCls}`}>{ptStatus}</span></td>
                  <td style={{ fontFamily: 'var(--fn-mono)', fontSize: 11.5 }}>{p.ptMonthlyFee?`$${p.ptMonthlyFee}/mo`:ptStatus==='Active'?'$29.95/mo':'—'}</td>
                  <td>{p.ptProfileUrl ? <a href={p.ptProfileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--pr)', fontSize: 11.5, fontWeight: 600 }}>View ↗</a> : <span style={{ color: 'var(--text-3)', fontSize: 11.5 }}>—</span>}</td>
                  <td style={{ fontSize: 11.5, color: 'var(--text-3)', maxWidth: 120 }}>{p.notes ? p.notes.slice(0,50) : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => editProvider?.(p.id)}>Edit</button>
                      {ptStatus !== 'Active' && <button className="btn btn-primary btn-sm">+ Add PT</button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OptimizationTips() {
  const [filter, setFilter] = useState('All')
  const filtered = filter === 'All' ? PT_TIPS : PT_TIPS.filter(t => t.impact === filter)
  const impactColor = { High: 'b-red', Medium: 'b-amber', Low: 'b-green' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {['All','High','Medium','Low'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 14px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 500, border: '1.5px solid var(--border)',
            background: filter === f ? 'var(--pr)' : 'var(--card)', color: filter === f ? '#fff' : 'var(--text-3)', cursor: 'pointer', transition: 'all .14s',
          }}>
            {f === 'All' ? 'All Tips' : `${f} Impact`}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {filtered.map((tip, i) => (
          <div key={i} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='var(--pr)'; e.currentTarget.style.boxShadow='var(--shadow)'; e.currentTarget.style.transform='translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.boxShadow=''; e.currentTarget.style.transform='' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ fontSize: 22, flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--elevated)', borderRadius: 9, border: '1px solid var(--border)' }}>
                {tip.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{tip.title}</span>
                  <span className={`badge ${impactColor[tip.impact]}`}>{tip.impact}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{tip.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MarketingPage({ db, setPage, editProvider }) {
  const [activeTab, setActiveTab] = useState('pt')

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-.03em', marginBottom: 3 }}>Marketing</h2>
          <p style={{ fontSize: 13, color: 'var(--text-4)' }}>Manage provider online presence, directory listings, and marketing optimization.</p>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <div key={t.id} className={`tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</div>
        ))}
      </div>

      {activeTab === 'pt' && <PsychologyToday db={db} setPage={setPage} editProvider={editProvider} />}
      {activeTab === 'directory' && <ProfileDirectory db={db} editProvider={editProvider} />}
      {activeTab === 'tips' && <OptimizationTips />}
    </div>
  )
}

export default MarketingPage
