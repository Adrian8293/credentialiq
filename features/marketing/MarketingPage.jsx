/**
 * MarketingPage.jsx — Lacentra
 * Marketing hub: clickable channel cards (Psychology Today, others).
 * Selecting a card opens the full feature in-page — no dropdown in nav.
 */

import { useState } from 'react'
import { PsychologyToday } from '../providers/PsychologyToday.jsx'

const PT_TIPS = [
  { icon: '📸', title: 'Add a professional photo', desc: 'Profiles with photos receive significantly more clicks. Upload via the provider Edit page.', impact: 'High' },
  { icon: '✍️', title: 'Write a personal bio', desc: 'Therapists who describe their approach in first person convert better with potential clients.', impact: 'High' },
  { icon: '🎥', title: 'Add a video introduction', desc: 'A short 60-second intro dramatically increases new client inquiries.', impact: 'High' },
  { icon: '🏥', title: 'List all accepted insurances', desc: 'Many clients filter by insurance. Keep every active payer enrollment reflected on PT.', impact: 'High' },
  { icon: '🎯', title: 'Narrow your specialty focus', desc: '"Trauma and PTSD using EMDR" outperforms broad tags in PT search rankings.', impact: 'Medium' },
  { icon: '💬', title: 'Enable online booking', desc: 'Profiles with booking links convert at a higher rate. Link your intake form directly.', impact: 'Medium' },
  { icon: '🔄', title: 'Keep availability updated', desc: 'Profiles marked as accepting new clients rank higher in PT search automatically.', impact: 'Medium' },
  { icon: '⭐', title: 'Complete the entire profile', desc: 'PT favors complete profiles. Fill in every section including finances and statement.', impact: 'Medium' },
  { icon: '🌐', title: 'List telehealth availability', desc: 'Telehealth-enabled listings receive significantly more views.', impact: 'Low' },
  { icon: '💳', title: 'Update insurance accepted', desc: 'Accurate insurance data drives organic referrals from PT search.', impact: 'Low' },
]

// Marketing channel card definitions
const CHANNELS = [
  {
    id: 'pt',
    label: 'Psychology Today',
    icon: '💚',
    desc: 'Manage PT directory profiles, track monthly fees, and optimize listings for all mental health providers.',
    color: '#2e7d32',
    bg: 'rgba(46,125,50,.07)',
    border: 'rgba(46,125,50,.25)',
    tag: 'Active',
    tagCls: 'b-green',
    stats: ['Directory listings', 'Profile optimization', 'Status tracking'],
  },
  {
    id: 'google',
    label: 'Google Business',
    icon: '🔍',
    desc: 'Manage Google Business Profile listings, reviews, and local search optimization for your practice.',
    color: '#1565c0',
    bg: 'rgba(21,101,192,.07)',
    border: 'rgba(21,101,192,.25)',
    tag: 'Coming Soon',
    tagCls: 'b-blue',
    stats: ['Local SEO', 'Review management', 'Business hours'],
    locked: true,
  },
  {
    id: 'healthgrades',
    label: 'Healthgrades',
    icon: '🏥',
    desc: 'Track and optimize provider profiles on Healthgrades, one of the largest healthcare rating platforms.',
    color: '#c62828',
    bg: 'rgba(198,40,40,.07)',
    border: 'rgba(198,40,40,.25)',
    tag: 'Coming Soon',
    tagCls: 'b-red',
    stats: ['Patient reviews', 'Profile completeness', 'Rating monitoring'],
    locked: true,
  },
  {
    id: 'zocdoc',
    label: 'Zocdoc',
    icon: '📅',
    desc: 'Connect Zocdoc appointments and ensure providers appear in patient search results with correct availability.',
    color: '#6a1b9a',
    bg: 'rgba(106,27,154,.07)',
    border: 'rgba(106,27,154,.25)',
    tag: 'Coming Soon',
    tagCls: 'b-purple',
    stats: ['Booking integration', 'Insurance match', 'Availability sync'],
    locked: true,
  },
  {
    id: 'social',
    label: 'Social Media',
    icon: '📱',
    desc: 'Schedule and track provider social content across Instagram, LinkedIn, and Facebook for your practice.',
    color: '#e65100',
    bg: 'rgba(230,81,0,.07)',
    border: 'rgba(230,81,0,.25)',
    tag: 'Coming Soon',
    tagCls: 'b-amber',
    stats: ['Content calendar', 'Multi-platform', 'Engagement tracking'],
    locked: true,
  },
  {
    id: 'website',
    label: 'Practice Website',
    icon: '🌐',
    desc: 'Keep your practice website provider bios, insurance lists, and availability pages automatically updated.',
    color: '#00695c',
    bg: 'rgba(0,105,92,.07)',
    border: 'rgba(0,105,92,.25)',
    tag: 'Coming Soon',
    tagCls: 'b-teal',
    stats: ['Bio sync', 'Insurance updates', 'SEO tracking'],
    locked: true,
  },
]

function ProfileDirectory({ db, editProvider }) {
  const mhProvs = db.providers.filter(p => p.spec === 'Mental Health')
  const active  = mhProvs.filter(p => p.ptStatus === 'Active').length

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Total MH Providers', val: mhProvs.length, color: 'var(--pr)' },
          { label: 'PT Active Profiles', val: active, color: 'var(--success)' },
          { label: 'Profiles Needed', val: mhProvs.length - active, color: mhProvs.length - active > 0 ? 'var(--warning)' : 'var(--success)' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color, marginBottom: 3 }}>{k.val}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.label}</div>
          </div>
        ))}
      </div>
      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Provider</th><th>Specialty</th><th>PT Status</th><th>Monthly Fee</th><th>Profile URL</th><th>Actions</th></tr></thead>
          <tbody>
            {!mhProvs.length ? (
              <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-title">No mental health providers</div></div></td></tr>
            ) : mhProvs.map(p => {
              const ptStatus = p.ptStatus || 'None'
              const statusCls = ptStatus === 'Active' ? 'b-green' : ptStatus === 'Inactive' ? 'b-amber' : 'b-gray'
              return (
                <tr key={p.id}>
                  <td><span style={{ fontWeight: 600 }}>{p.fname} {p.lname}{p.cred ? `, ${p.cred}` : ''}</span></td>
                  <td><span className="badge b-purple">{p.spec}</span></td>
                  <td><span className={`badge ${statusCls}`}>{ptStatus}</span></td>
                  <td>{p.ptMonthlyFee ? `$${p.ptMonthlyFee}/mo` : ptStatus === 'Active' ? '$29.95/mo' : '—'}</td>
                  <td>{p.ptProfileUrl ? <a href={p.ptProfileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--pr)', fontSize: 12, fontWeight: 600 }}>View ↗</a> : '—'}</td>
                  <td><div style={{ display: 'flex', gap: 5 }}><button className="btn btn-secondary btn-sm" onClick={() => editProvider?.(p.id)}>Edit</button></div></td>
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
        {['All', 'High', 'Medium', 'Low'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 14px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 500, border: '1.5px solid var(--border)',
            background: filter === f ? 'var(--pr)' : 'var(--card)', color: filter === f ? '#fff' : 'var(--text-3)', cursor: 'pointer',
          }}>
            {f === 'All' ? 'All Tips' : `${f} Impact`}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {filtered.map((tip, i) => (
          <div key={i} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ fontSize: 22, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--elevated)', borderRadius: 9, border: '1px solid var(--border)' }}>{tip.icon}</div>
              <div>
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

const PT_INNER_TABS = [
  { id: 'profiles', label: 'PT Profiles' },
  { id: 'directory', label: 'All Directories' },
  { id: 'tips', label: 'Optimization Tips' },
]

function PsychologyTodayHub({ db, setPage, editProvider }) {
  const [innerTab, setInnerTab] = useState('profiles')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={() => setPage('marketing-home')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pr)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Marketing
        </button>
        <span style={{ color: 'var(--text-4)', fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Psychology Today</span>
      </div>

      <div className="tabs" style={{ marginBottom: 18 }}>
        {PT_INNER_TABS.map(t => (
          <div key={t.id} className={`tab${innerTab === t.id ? ' active' : ''}`} onClick={() => setInnerTab(t.id)}>{t.label}</div>
        ))}
      </div>

      {innerTab === 'profiles'   && <PsychologyToday db={db} setPage={setPage} editProvider={editProvider} />}
      {innerTab === 'directory'  && <ProfileDirectory db={db} editProvider={editProvider} />}
      {innerTab === 'tips'       && <OptimizationTips />}
    </div>
  )
}

export function MarketingPage({ db, setPage, editProvider }) {
  const [channel, setChannel] = useState(null)

  if (channel === 'pt') {
    return (
      <div className="page">
        <PsychologyTodayHub db={db} setPage={(pg) => { if (pg === 'marketing-home') setChannel(null); else setPage(pg) }} editProvider={editProvider} />
      </div>
    )
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-.04em', margin: 0, marginBottom: 3 }}>Marketing</h2>
        <p style={{ fontSize: 12.5, color: 'var(--text-4)', margin: 0 }}>Manage your practice's online presence across all patient-facing directories and channels.</p>
      </div>

      {/* Channel cards — clickable quadrilaterals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {CHANNELS.map(ch => (
          <div key={ch.id}
            onClick={() => !ch.locked && setChannel(ch.id)}
            style={{
              background: 'var(--card)', border: `1.5px solid ${ch.border}`,
              borderRadius: 14, padding: '20px 20px 18px',
              cursor: ch.locked ? 'default' : 'pointer',
              opacity: ch.locked ? 0.72 : 1,
              transition: 'all .18s', position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => { if (!ch.locked) { e.currentTarget.style.boxShadow='var(--shadow)'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor=ch.color } }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow=''; e.currentTarget.style.transform=''; e.currentTarget.style.borderColor=ch.border }}
          >
            {/* Colored top accent */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: ch.color, borderRadius: '14px 14px 0 0' }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: ch.bg, border: `1.5px solid ${ch.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {ch.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2 }}>{ch.label}</div>
                  <span className={`badge ${ch.tagCls}`} style={{ fontSize: 10, marginTop: 3 }}>{ch.tag}</span>
                </div>
              </div>
              {!ch.locked && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ch.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              )}
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, margin: '0 0 14px' }}>{ch.desc}</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {ch.stats.map((s, i) => (
                <span key={i} style={{ padding: '2px 8px', background: ch.bg, border: `1px solid ${ch.border}`, borderRadius: 99, fontSize: 10.5, fontWeight: 600, color: ch.color }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom tips strip */}
      <div style={{ marginTop: 24, background: 'var(--elevated)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>💡 Marketing Best Practice</div>
        <p style={{ fontSize: 12, color: 'var(--text-4)', margin: 0 }}>
          Consistent, complete profiles across all directories increase patient conversion by an estimated 35–60%. Start with Psychology Today, the top referral source for mental health providers.
        </p>
      </div>
    </div>
  )
}

export default MarketingPage
