/**
 * AiFollowupModal.jsx — AI Payer Follow-up Email Generator
 *
 * Drop this component into the Enrollments/Applications page.
 * Trigger it from any enrollment card where stage !== 'Active' && stage !== 'Denied'.
 *
 * Usage:
 *   <AiFollowupModal
 *     enrollment={enrollment}
 *     provider={provider}
 *     payer={payer}
 *     onClose={() => setAiModalOpen(false)}
 *   />
 *
 * Requires: pages/api/ai-followup.js (included at bottom of this file as a comment)
 */

import { useState } from 'react'

// ─── DAYS HELPER ─────────────────────────────────────────────────────────────
function daysAgo(dateStr) {
  if (!dateStr) return null
  return Math.floor((new Date() - new Date(dateStr)) / 86400000)
}

function fmtDate(d) {
  if (!d) return 'not set'
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y}`
}

// ─── COPY BUTTON ─────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button className="btn btn-sm" onClick={handleCopy} style={{ minWidth: 80 }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
export function AiFollowupModal({ enrollment, provider, payer, alertLabel, alertDays, alertDate, onClose }) {
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tone, setTone] = useState('professional') // 'professional' | 'urgent' | 'friendly'
  const [generated, setGenerated] = useState(false)

  const submittedDaysAgo = daysAgo(enrollment?.submitted)
  const followupDaysAgo  = daysAgo(enrollment?.followup)

  // Feature 6: alert-only mode (no enrollment/payer — just a provider credential alert)
  const isAlertMode = !!alertLabel && !enrollment?.stage

  const modalTitle = isAlertMode
    ? `Draft Renewal Reminder — ${alertLabel}`
    : 'Draft Follow-up Email'

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerName:  `${provider.fname || ''} ${provider.lname || ''}${provider.cred ? ', '+provider.cred : ''}`.trim(),
          providerNpi:   provider.npi,
          providerSpec:  provider.spec,
          payerName:     payer.name,
          payerId:       payer.payerId,
          stage:         enrollment.stage,
          submittedDate: enrollment.submitted,
          submittedDaysAgo,
          followupDate:  enrollment.followup,
          effectiveDate: enrollment.effective,
          notes:         enrollment.notes,
          tone,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        // If API not configured, fall back to a smart template
        if (res.status === 500 && (data.error?.includes('API') || data.error?.includes('key') || data.error?.includes('auth'))) {
          generateTemplate()
          return
        }
        throw new Error(data.error || 'Generation failed')
      }
      setDraft(data.email)
      setGenerated(true)
    } catch (e) {
      // Network error or unconfigured API — use template fallback
      generateTemplate()
    } finally {
      setLoading(false)
    }
  }

  function generateTemplate() {
    const toneOpener = {
      professional: 'I hope this message finds you well.',
      urgent: 'I am writing to urgently follow up on a time-sensitive matter affecting patient access to care.',
      friendly: 'I hope you are having a great week!',
    }[tone] || 'I hope this message finds you well.'

    let template
    if (isAlertMode) {
      // Feature 6: standalone alert renewal reminder template
      const provName = `${provider.fname || ''} ${provider.lname || ''}${provider.cred ? ', '+provider.cred : ''}`.trim() || 'Provider'
      const daysText = alertDays !== undefined
        ? alertDays < 0
          ? `expired ${Math.abs(alertDays)} day${Math.abs(alertDays) !== 1 ? 's' : ''} ago`
          : `expiring in ${alertDays} day${alertDays !== 1 ? 's' : ''}`
        : 'expiring soon'
      template = `${toneOpener}

This is a reminder that the ${alertLabel} for ${provName} (NPI: ${provider.npi || 'N/A'}) is ${daysText}${alertDate ? ` (${fmtDate(alertDate)})` : ''}.

Please take the following action as soon as possible:
- Gather the renewal documentation for the ${alertLabel}
- Submit the updated information to the relevant credentialing body
- Upload the renewed document to the provider's file in our system

If you have any questions or need assistance, please do not hesitate to reach out.

Thank you for your prompt attention to this matter.

Credentialing Department
Positive Inner Self, LLC`
    } else {
      const submittedLine = enrollment?.submitted
        ? `Our application was submitted on ${fmtDate(enrollment.submitted)}${submittedDaysAgo != null ? ` (${submittedDaysAgo} days ago)` : ''}`
        : 'Our application was submitted previously'

      template = `${toneOpener}

I am reaching out regarding the credentialing application for ${provider.fname || ''} ${provider.lname || ''}${provider.cred ? ', '+provider.cred : ''} (NPI: ${provider.npi || 'Pending'}) with ${payer.name || 'your organization'}${payer.payerId ? ` (Payer ID: ${payer.payerId})` : ''}.

${submittedLine}, and the application is currently in the "${enrollment?.stage || 'In Progress'}" stage. We would greatly appreciate a status update at your earliest convenience.

Could you please provide an update within 3–5 business days? If any additional documentation or information is required to move this application forward, we are happy to provide it promptly.
${enrollment?.notes ? `\nAdditional context: ${enrollment.notes}\n` : ''}
Thank you for your time and assistance. We look forward to hearing from you.

Credentialing Department
Positive Inner Self, LLC`
    }

    setDraft(template)
    setGenerated(true)
    setError(null)
  }

  // Compose mailto: link with draft pre-filled
  function openInMail() {
    const subject = encodeURIComponent(
      `Provider Enrollment Follow-Up — ${provider.fname} ${provider.lname}, ${provider.cred} | NPI: ${provider.npi}`
    )
    const body = encodeURIComponent(draft)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        width: '100%',
        maxWidth: 620,
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)',
        margin: '0 16px',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pr)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              AI Follow-up Email Generator
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3 }}>
              {provider.fname} {provider.lname}, {provider.cred} &nbsp;·&nbsp; {payer.name}
              {submittedDaysAgo !== null && ` · Submitted ${submittedDaysAgo}d ago`}
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-3)', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>×</button>
        </div>

        {/* Context strip */}
        <div style={{ padding: '10px 20px', background: 'var(--elevated)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <CtxChip label="Stage" value={enrollment.stage} />
          <CtxChip label="NPI" value={provider.npi || '—'} />
          <CtxChip label="Submitted" value={fmtDate(enrollment.submitted)} />
          <CtxChip label="Follow-up due" value={fmtDate(enrollment.followup)} urgent={followupDaysAgo !== null && followupDaysAgo > 0} />
        </div>

        {/* Tone selector */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600, marginRight: 4 }}>TONE</span>
          {['professional', 'urgent', 'friendly'].map(t => (
            <button
              key={t}
              onClick={() => { setTone(t); setGenerated(false) }}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--r-pill)',
                border: `1px solid ${tone === t ? 'var(--pr)' : 'var(--border)'}`,
                background: tone === t ? 'var(--pr-l)' : 'transparent',
                color: tone === t ? 'var(--pr)' : 'var(--text-2)',
                fontSize: 12,
                fontWeight: tone === t ? 600 : 400,
                cursor: 'pointer',
                transition: 'all .13s',
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Draft area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {!generated && !loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/></svg>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>
                Ready to draft
              </div>
              <div style={{ fontSize: 12, maxWidth: 320, margin: '0 auto', lineHeight: 1.6 }}>
                Claude will write a professional follow-up email based on the provider, payer, stage, and elapsed time.
              </div>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px', width: 22, height: 22, borderWidth: 2 }} />
              <div style={{ fontSize: 13 }}>Drafting follow-up…</div>
            </div>
          )}

          {error && (
            <div style={{ background: 'var(--red-l)', border: '1px solid var(--red-b)', borderRadius: 'var(--r)', padding: '10px 14px', color: 'var(--red-d)', fontSize: 13 }}>
              {error}
            </div>
          )}

          {generated && draft && (
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              style={{
                width: '100%',
                minHeight: 280,
                background: 'var(--elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                padding: '12px 14px',
                fontSize: 12.5,
                lineHeight: 1.7,
                fontFamily: 'var(--fn)',
                color: 'var(--text-1)',
                resize: 'vertical',
              }}
            />
          )}
        </div>

        {/* Actions */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
            Powered by Claude · Review before sending
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {generated && <CopyButton text={draft} />}
            {generated && (
              <button className="btn btn-sm" onClick={openInMail}>
                Open in Mail ↗
              </button>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={generate}
              disabled={loading}
            >
              {loading ? 'Generating…' : generated ? 'Regenerate' : '✦ Generate email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CONTEXT CHIP (internal) ─────────────────────────────────────────────────
function CtxChip({ label, value, urgent }) {
  return (
    <div style={{ fontSize: 11 }}>
      <span style={{ color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label} </span>
      <span style={{ color: urgent ? 'var(--danger)' : 'var(--text-1)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

export default AiFollowupModal


/*
 * ─────────────────────────────────────────────────────────────────────────────
 * API ROUTE — pages/api/ai-followup.js
 * Copy this into your project as a new file.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * import Anthropic from '@anthropic-ai/sdk'
 *
 * const client = new Anthropic()
 *
 * export default async function handler(req, res) {
 *   if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
 *
 *   const {
 *     providerName, providerNpi, providerSpec,
 *     payerName, payerId,
 *     stage, submittedDate, submittedDaysAgo,
 *     followupDate, effectiveDate,
 *     notes, tone,
 *   } = req.body
 *
 *   const toneGuide = {
 *     professional: 'formal, precise, and courteous — appropriate for insurance credentialing',
 *     urgent: 'firm and results-oriented, politely emphasizing timeline impact on patient care',
 *     friendly: 'warm and collaborative while remaining fully professional',
 *   }[tone] || 'professional'
 *
 *   const systemPrompt = `You are a credentialing specialist at a behavioral health practice.
 * You write professional follow-up emails to insurance payers about provider enrollment applications.
 * Your emails are concise, specific, and always include all relevant reference details.
 * Never include placeholders like [Name] — use the actual values provided.
 * Output only the email body text (no subject line, no markdown).`
 *
 *   const userPrompt = `Draft a ${toneGuide} follow-up email to ${payerName} (Payer ID: ${payerId}) regarding the credentialing application for:
 *
 * Provider: ${providerName}
 * NPI: ${providerNpi}
 * Specialty: ${providerSpec}
 * Current stage: ${stage}
 * Application submitted: ${submittedDate || 'date unknown'} (${submittedDaysAgo ?? '?'} days ago)
 * Follow-up date: ${followupDate || 'not set'}
 * Expected effective date: ${effectiveDate || 'pending'}
 * Additional notes: ${notes || 'none'}
 *
 * The email should:
 * 1. Reference the provider's name and NPI clearly
 * 2. State the current stage and days elapsed since submission
 * 3. Request a status update with a specific response timeline (5 business days)
 * 4. Offer to provide any additional information needed
 * 5. End with a professional closing`
 *
 *   try {
 *     const message = await client.messages.create({
 *       model: 'claude-opus-4-5',
 *       max_tokens: 600,
 *       messages: [{ role: 'user', content: userPrompt }],
 *       system: systemPrompt,
 *     })
 *     const email = message.content[0]?.text || ''
 *     return res.status(200).json({ email })
 *   } catch (err) {
 *     console.error('AI followup error:', err)
 *     return res.status(500).json({ error: err.message })
 *   }
 * }
 */
