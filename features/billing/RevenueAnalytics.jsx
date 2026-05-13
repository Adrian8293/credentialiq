/**
 * RevenueAnalytics.jsx — Lacentra
 * Revenue overview with collection rate, monthly trend, provider/payer breakdown.
 * Upgraded to Lacentra design system.
 */

import { useState } from 'react'
import { pNameShort, payName } from '../../lib/helpers.js'
import { fmtMoney } from '../../constants/rcm.js'

const COLORS = ['#1565C0','#10B981','#F59E0B','#7C3AED','#EF4444','#0891B2']

export function RevenueAnalytics({ db }) {
  const { providers, payers, claims = [] } = db
  const [period, setPeriod] = useState('month')

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
  const totalPaid   = periodClaims.reduce((s,c)=>s+Number(c.paid_amount||0),0)
  const totalDenied = periodClaims.filter(c=>c.status==='Denied').reduce((s,c)=>s+Number(c.billed_amount||0),0)
  const totalAR     = periodClaims.filter(c=>!['Paid','Written Off'].includes(c.status)).reduce((s,c)=>s+Number(c.billed_amount||0)-Number(c.paid_amount||0),0)
  const collRate    = totalBilled > 0 ? (totalPaid/totalBilled*100) : 0

  const byProvider = {}
  periodClaims.forEach(c => {
    const k = c.prov_id||'unknown'
    if (!byProvider[k]) byProvider[k]={billed:0,paid:0,count:0,denied:0}
    byProvider[k].billed+=Number(c.billed_amount||0); byProvider[k].paid+=Number(c.paid_amount||0)
    byProvider[k].count++; if (c.status==='Denied') byProvider[k].denied++
  })
  const byPayer = {}
  periodClaims.forEach(c => {
    const k = c.payer_id||'unknown'
    if (!byPayer[k]) byPayer[k]={billed:0,paid:0,count:0}
    byPayer[k].billed+=Number(c.billed_amount||0); byPayer[k].paid+=Number(c.paid_amount||0); byPayer[k].count++
  })

  const months = []
  for (let i=5;i>=0;i--) {
    const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-i)
    const label=d.toLocaleDateString('en-US',{month:'short'})
    const start=new Date(d); const end=new Date(d.getFullYear(),d.getMonth()+1,1)
    const mc=claims.filter(c=>c.dos&&new Date(c.dos)>=start&&new Date(c.dos)<end)
    months.push({ label, billed: mc.reduce((s,c)=>s+Number(c.billed_amount||0),0), paid: mc.reduce((s,c)=>s+Number(c.paid_amount||0),0) })
  }
  const maxMonthVal = Math.max(...months.map(m=>m.billed),1)

  const collColor = collRate>=85 ? 'var(--success)' : collRate>=70 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-.03em', marginBottom: 3 }}>Revenue Analytics</h2>
          <p style={{ fontSize: 13, color: 'var(--text-4)' }}>Monitor billing performance, collection rates, and A/R aging across Lacentra.</p>
        </div>
        <div style={{ display: 'flex', gap: 3, background: 'var(--elevated)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 3 }}>
          {[['month','This Month'],['quarter','Quarter'],['year','Year'],['all','All Time']].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriod(v)} style={{
              padding:'5px 12px', borderRadius:'var(--r)', fontSize:11.5, fontWeight:500, border:'none', cursor:'pointer',
              background: period===v ? 'var(--pr)' : 'transparent',
              color: period===v ? '#fff' : 'var(--text-3)',
              transition: 'all .14s',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi kpi-blue"><div className="kpi-label">Total Billed</div><div className="kpi-value" style={{ fontSize: 24 }}>{fmtMoney(totalBilled)}</div><div className="kpi-sub">{periodClaims.length} claims</div></div>
        <div className="kpi kpi-green"><div className="kpi-label">Collected</div><div className="kpi-value" style={{ fontSize: 24 }}>{fmtMoney(totalPaid)}</div><div className="kpi-sub">{collRate.toFixed(1)}% collection rate</div></div>
        <div className="kpi kpi-amber"><div className="kpi-label">Outstanding A/R</div><div className="kpi-value" style={{ fontSize: 24 }}>{fmtMoney(totalAR)}</div><div className="kpi-sub">Awaiting payment</div></div>
        <div className="kpi kpi-red"><div className="kpi-label">Denied</div><div className="kpi-value" style={{ fontSize: 24 }}>{fmtMoney(totalDenied)}</div><div className="kpi-sub">Requires follow-up</div></div>
      </div>

      {/* Collection Rate */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h3>Collection Rate</h3>
          <span className="ch-meta">{collRate.toFixed(1)}% of billed amount collected</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: collColor, letterSpacing: '-2px' }}>{collRate.toFixed(1)}%</div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 12, background: 'var(--elevated)', borderRadius: 6, overflow: 'hidden', marginBottom: 6, border: '1px solid var(--border)' }}>
                <div style={{ height: '100%', width: `${Math.min(collRate,100)}%`, background: collColor, borderRadius: 6, transition: 'width .4s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-4)' }}>
                <span>0%</span>
                <span style={{ color: collColor, fontWeight: 600 }}>Current: {collRate.toFixed(1)}%</span>
                <span>Target: 85%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
          <div style={{ padding: '10px 14px', background: collRate >= 85 ? 'rgba(16,185,129,.06)' : collRate >= 75 ? 'rgba(245,158,11,.06)' : 'rgba(239,68,68,.06)', border: `1px solid ${collRate >= 85 ? 'rgba(16,185,129,.2)' : collRate >= 75 ? 'rgba(245,158,11,.2)' : 'rgba(239,68,68,.2)'}`, borderRadius: 'var(--r)', fontSize: 12, color: collColor, lineHeight: 1.5 }}>
            {collRate >= 85 ? '✅ Above benchmark — excellent collection performance.' : collRate >= 75 ? '🟡 Within benchmark (75–85%). Monitor denial patterns.' : '⚠️ Below benchmark — review denial logs and follow-up processes.'}
            {' '}Industry benchmark for behavioral health: <strong>75–85%</strong>.
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3>Monthly Billing Trend</h3><span className="ch-meta">Last 6 months</span></div>
        <div className="card-body">
          {months.every(m=>m.billed===0) ? (
            <div className="empty-state">
              <div className="empty-state-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
              <div className="empty-state-title">No claim data yet</div>
              <div className="empty-state-desc">Add claims to see monthly billing trends and collection analytics.</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 130, paddingBottom: 22, position: 'relative' }}>
                {months.map((m, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 108 }}>
                      <div title={`Billed: ${fmtMoney(m.billed)}`} style={{ flex: 1, background: 'rgba(21,101,192,.25)', borderRadius: '4px 4px 0 0', height: `${(m.billed/maxMonthVal)*100}%`, minHeight: m.billed>0?3:0, transition:'height .4s' }} />
                      <div title={`Paid: ${fmtMoney(m.paid)}`} style={{ flex: 1, background: 'var(--success)', borderRadius: '4px 4px 0 0', height: `${(m.paid/maxMonthVal)*100}%`, minHeight: m.paid>0?3:0, transition:'height .4s' }} />
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-4)', whiteSpace: 'nowrap', position: 'absolute', bottom: 0 }}>{m.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}><div style={{ width: 10, height: 10, background: 'rgba(21,101,192,.25)', borderRadius: 2 }} /><span>Billed</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}><div style={{ width: 10, height: 10, background: 'var(--success)', borderRadius: 2 }} /><span>Collected</span></div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid-2">
        {/* By Provider */}
        <div className="card">
          <div className="card-header"><h3>Revenue by Provider</h3></div>
          <div className="card-body">
            {Object.keys(byProvider).length === 0 ? (
              <div className="empty-state" style={{ padding: '16px 0' }}><div style={{ fontSize: 12, color: 'var(--text-4)' }}>No claims data in this period.</div></div>
            ) : Object.entries(byProvider).sort((a,b)=>b[1].billed-a[1].billed).map(([provId, data], i) => (
              <div key={provId} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{pNameShort(providers, provId) || 'Unknown Provider'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{fmtMoney(data.paid)} / {fmtMoney(data.billed)}</div>
                </div>
                <div style={{ height: 6, background: 'var(--elevated)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border-l)' }}>
                  <div style={{ height: '100%', width: `${data.billed>0?(data.paid/data.billed*100):0}%`, background: COLORS[i%COLORS.length], borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>{data.count} claims · {data.denied} denied</div>
              </div>
            ))}
          </div>
        </div>

        {/* By Payer */}
        <div className="card">
          <div className="card-header"><h3>Revenue by Payer</h3></div>
          <div className="card-body">
            {Object.keys(byPayer).length === 0 ? (
              <div className="empty-state" style={{ padding: '16px 0' }}><div style={{ fontSize: 12, color: 'var(--text-4)' }}>No claims data in this period.</div></div>
            ) : Object.entries(byPayer).sort((a,b)=>b[1].paid-a[1].paid).map(([payerId, data], i) => (
              <div key={payerId} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{payName(payers, payerId) || 'Unknown Payer'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{data.billed>0?(data.paid/data.billed*100).toFixed(0):0}% collected</div>
                </div>
                <div style={{ height: 6, background: 'var(--elevated)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border-l)' }}>
                  <div style={{ height: '100%', width: `${data.billed>0?(data.paid/data.billed*100):0}%`, background: COLORS[(i+2)%COLORS.length], borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>{data.count} claims · {fmtMoney(data.paid)} paid</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Import Guide */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><h3>SimplePractice Import Guide</h3></div>
        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 12 }}>
            Since SimplePractice doesn't offer a direct API integration, revenue data is imported manually. Recommended workflow:
          </p>
          <ol style={{ paddingLeft: 20, fontSize: 13, color: 'var(--text-3)', lineHeight: 2 }}>
            <li>In SimplePractice, go to <strong>Reports → Billing</strong></li>
            <li>Export to CSV for the desired date range</li>
            <li>Enter each claim in the <strong>Claims Tracker</strong> in Lacentra</li>
            <li>Update payment status when EOBs / ERAs are received</li>
            <li>Log denials in the <strong>Denial Log</strong> with the reason code from the ERA</li>
          </ol>
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--blue-l)', border: '1px solid var(--blue-b)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--pr)', lineHeight: 1.5 }}>
            💡 <strong>CSV batch import available:</strong> Use the <strong>CSV Import</strong> button at the top of the Billing page to upload SimplePractice billing exports directly. Supports all SP export column formats.
          </div>
        </div>
      </div>
    </div>
  )
}

export default RevenueAnalytics
