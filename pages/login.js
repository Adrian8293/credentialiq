import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [org, setOrg] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function switchMode(m) {
    setMode(m); setStep(1); setError(''); setSuccess('')
    setEmail(''); setPassword(''); setFirstName(''); setLastName('')
    setConfirmPass(''); setOrg(''); setShowPass(false); setShowConfirm(false)
  }

  function validateStep1() {
    if (!firstName.trim()) return 'First name is required.'
    if (!lastName.trim()) return 'Last name is required.'
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'A valid email address is required.'
    return null
  }

  function validateStep2() {
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.'
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number.'
    if (password !== confirmPass) return 'Passwords do not match.'
    return null
  }

  function passStrength(p) {
    if (!p) return 0
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  }
  const strength = passStrength(password)
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  const strengthColor = ['', '#ef4444', '#f59e0b', '#10b981', '#10b981'][strength]

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')

    if (mode === 'signup') {
      if (step === 1) {
        const err = validateStep1()
        if (err) { setError(err); return }
        setStep(2); return
      }
      const err = validateStep2()
      if (err) { setError(err); return }
      setLoading(true)
      try {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { first_name: firstName, last_name: lastName, organization: org } }
        })
        if (error) throw error
        setSuccess('Account created! Check ' + email + ' for a confirmation link before signing in.')
        setTimeout(() => switchMode('login'), 6000)
      } catch (err) { setError(err.message) }
      setLoading(false)
      return
    }

    if (mode === 'reset') {
      if (!email.trim()) { setError('Please enter your email address.'); return }
      setLoading(true)
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        })
        if (error) throw error
        setSuccess('Reset link sent! Check your inbox and spam folder.')
      } catch (err) { setError(err.message) }
      setLoading(false)
      return
    }

    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      window.location.href = '/'
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const year = new Date().getFullYear()

  return (
    <>
      <Head>
        <title>CredFlow — {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </Head>

      <div className="cf-page">

        {/* ── HEADER ── */}
        <header className="cf-header">
          <div className="cf-header-inner">
            <div className="cf-logo">
              <CredFlowLogoIcon size={38} />
              <div className="cf-logo-text">
                <div className="cf-logo-wordmark"><span className="cred">Cred</span><span className="flow">Flow</span></div>
                <div className="cf-logo-tagline">CREDENTIALING · SIMPLIFIED · ACCELERATED</div>
              </div>
            </div>
            <div className="cf-header-right">
              {mode === 'login'
                ? <><span className="cf-header-hint">New to CredFlow?</span><button className="cf-nav-cta" onClick={() => switchMode('signup')}>Create Account</button></>
                : <><span className="cf-header-hint">Already have an account?</span><button className="cf-nav-cta" onClick={() => switchMode('login')}>Sign In</button></>
              }
            </div>
          </div>
        </header>

        {/* ── HERO BAND ── */}
        <div className="cf-hero-band">
          <div className="cf-hero-inner">
            <div className="cf-hero-tag">
              <span className="tag-dot"></span>
              Healthcare Credentialing Platform
            </div>
            <h1 className="cf-hero-h1">
              {mode === 'login'  && 'Welcome Back to CredFlow'}
              {mode === 'signup' && 'Create Your Account'}
              {mode === 'reset'  && 'Reset Your Password'}
            </h1>
            <p className="cf-hero-sub">
              {mode === 'login'  && 'Sign in to manage provider credentials, payer enrollments, and compliance — all in one place.'}
              {mode === 'signup' && 'Set up your CredFlow account to start tracking credentials, enrollments, and revenue cycle data.'}
              {mode === 'reset'  && "Enter your email and we'll send a secure reset link straight to your inbox."}
            </p>
          </div>
        </div>

        {/* ── MAIN ── */}
        <main className="cf-main">
          <div className="cf-card-wrap">
            <div className="cf-card">

              <div className="card-top-logo">
                <CredFlowLogoIcon size={28} />
                <span className="ctl-name"><span className="cred">Cred</span><span className="flow">Flow</span></span>
              </div>

              {mode === 'signup' && (
                <div className="step-bar">
                  <div className={'step-item' + (step >= 1 ? ' active' : '') + (step > 1 ? ' done' : '')}>
                    <div className="step-num">{step > 1 ? '✓' : '1'}</div>
                    <div className="step-lbl">Your Info</div>
                  </div>
                  <div className="step-line"></div>
                  <div className={'step-item' + (step >= 2 ? ' active' : '')}>
                    <div className="step-num">2</div>
                    <div className="step-lbl">Security</div>
                  </div>
                </div>
              )}

              <div className="card-heading">
                {mode === 'login'  && 'Sign in to your account'}
                {mode === 'signup' && step === 1 && 'Create your account'}
                {mode === 'signup' && step === 2 && 'Secure your account'}
                {mode === 'reset'  && 'Reset your password'}
              </div>
              <div className="card-sub">
                {mode === 'login'  && 'Enter your credentials to access your dashboard.'}
                {mode === 'signup' && step === 1 && 'Step 1 of 2 — Tell us a bit about yourself.'}
                {mode === 'signup' && step === 2 && 'Step 2 of 2 — Choose a strong password.'}
                {mode === 'reset'  && "We'll email you a secure link to reset your password."}
              </div>

              {success && (
                <div className="msg-success">
                  <span className="msg-icon msg-icon--green">✓</span>
                  <span>{success}</span>
                </div>
              )}
              {error && !success && (
                <div className="msg-error">
                  <span className="msg-icon msg-icon--red">!</span>
                  <span>{error}</span>
                </div>
              )}

              {!success && (
                <form onSubmit={handleSubmit} className="cf-form" noValidate>

                  {/* LOGIN */}
                  {mode === 'login' && (<>
                    <div className="cf-field">
                      <label htmlFor="email">Email address</label>
                      <div className="cf-input-wrap">
                        <span className="cf-input-icon"><EmailSVG /></span>
                        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@practice.com" autoComplete="email" required />
                      </div>
                    </div>
                    <div className="cf-field">
                      <label htmlFor="password">Password</label>
                      <div className="cf-input-wrap">
                        <span className="cf-input-icon"><LockSVG /></span>
                        <input id="password" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
                        <button type="button" className="eye-btn" onClick={() => setShowPass(s => !s)} tabIndex={-1}>{showPass ? <EyeOffSVG /> : <EyeSVG />}</button>
                      </div>
                    </div>
                    <div className="forgot-row">
                      <button type="button" className="link-sm" onClick={() => switchMode('reset')}>Forgot password?</button>
                    </div>
                    <button type="submit" className="cf-submit" disabled={loading}>
                      {loading ? <><span className="spinner"></span> Signing in…</> : 'Sign In →'}
                    </button>
                  </>)}

                  {/* SIGNUP STEP 1 */}
                  {mode === 'signup' && step === 1 && (<>
                    <div className="field-row-2">
                      <div className="cf-field">
                        <label htmlFor="fname">First name</label>
                        <div className="cf-input-wrap">
                          <span className="cf-input-icon"><UserSVG /></span>
                          <input id="fname" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" autoComplete="given-name" />
                        </div>
                      </div>
                      <div className="cf-field">
                        <label htmlFor="lname">Last name</label>
                        <div className="cf-input-wrap">
                          <span className="cf-input-icon"><UserSVG /></span>
                          <input id="lname" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" autoComplete="family-name" />
                        </div>
                      </div>
                    </div>
                    <div className="cf-field">
                      <label htmlFor="su-email">Work email</label>
                      <div className="cf-input-wrap">
                        <span className="cf-input-icon"><EmailSVG /></span>
                        <input id="su-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@practice.com" autoComplete="email" />
                      </div>
                    </div>
                    <div className="cf-field">
                      <label htmlFor="org">Practice / Organization <span className="opt-lbl">(optional)</span></label>
                      <div className="cf-input-wrap">
                        <span className="cf-input-icon"><OrgSVG /></span>
                        <input id="org" type="text" value={org} onChange={e => setOrg(e.target.value)} placeholder="Behavioral Health Group" autoComplete="organization" />
                      </div>
                    </div>
                    <button type="submit" className="cf-submit">Continue →</button>
                  </>)}

                  {/* SIGNUP STEP 2 */}
                  {mode === 'signup' && step === 2 && (<>
                    <div className="recap-box">
                      <div className="recap-name">{firstName} {lastName}</div>
                      <div className="recap-email">{email}</div>
                    </div>
                    <div className="cf-field">
                      <label htmlFor="pass">Password</label>
                      <div className="cf-input-wrap">
                        <span className="cf-input-icon"><LockSVG /></span>
                        <input id="pass" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" />
                        <button type="button" className="eye-btn" onClick={() => setShowPass(s => !s)} tabIndex={-1}>{showPass ? <EyeOffSVG /> : <EyeSVG />}</button>
                      </div>
                      {password && (
                        <div className="strength-wrap">
                          <div className="strength-bars">
                            {[1,2,3,4].map(i => <div key={i} className="strength-bar" style={{ background: i <= strength ? strengthColor : '#E2E8F0' }} />)}
                          </div>
                          <span className="strength-lbl" style={{ color: strengthColor }}>{strengthLabel}</span>
                        </div>
                      )}
                      <div className="pass-rules">
                        {[[password.length >= 8,'8+ characters'],[/[A-Z]/.test(password),'Uppercase letter'],[/[0-9]/.test(password),'Number']].map(([ok,txt]) => (
                          <div key={txt} className={`pass-rule${ok?' pass-rule--ok':''}`}><span>{ok?'✓':'○'}</span>{txt}</div>
                        ))}
                      </div>
                    </div>
                    <div className="cf-field">
                      <label htmlFor="confirm">Confirm password</label>
                      <div className="cf-input-wrap">
                        <span className="cf-input-icon"><LockSVG /></span>
                        <input id="confirm" type={showConfirm ? 'text' : 'password'} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Repeat password" autoComplete="new-password" />
                        <button type="button" className="eye-btn" onClick={() => setShowConfirm(s => !s)} tabIndex={-1}>{showConfirm ? <EyeOffSVG /> : <EyeSVG />}</button>
                      </div>
                      {confirmPass && (password === confirmPass
                        ? <span className="inline-ok">✓ Passwords match</span>
                        : <span className="inline-warn">Passwords do not match</span>
                      )}
                    </div>
                    <button type="submit" className="cf-submit" disabled={loading}>
                      {loading ? <><span className="spinner"></span> Creating account…</> : 'Create Account →'}
                    </button>
                    <button type="button" className="cf-back" onClick={() => { setStep(1); setError('') }}>← Back</button>
                  </>)}

                  {/* RESET */}
                  {mode === 'reset' && (<>
                    <div className="cf-field">
                      <label htmlFor="reset-email">Email address</label>
                      <div className="cf-input-wrap">
                        <span className="cf-input-icon"><EmailSVG /></span>
                        <input id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@practice.com" autoComplete="email" />
                      </div>
                    </div>
                    <button type="submit" className="cf-submit" disabled={loading}>
                      {loading ? <><span className="spinner"></span> Sending…</> : 'Send Reset Link →'}
                    </button>
                  </>)}

                </form>
              )}

              <div className="card-divider"><span>or</span></div>
              <div className="card-switch">
                {mode === 'login'  && <p>Don't have an account? <button className="link-primary" onClick={() => switchMode('signup')}>Create one</button></p>}
                {mode === 'signup' && <p>Already have an account? <button className="link-primary" onClick={() => switchMode('login')}>Sign in</button></p>}
                {mode === 'reset'  && <p>Remembered it? <button className="link-primary" onClick={() => switchMode('login')}>Back to sign in</button></p>}
              </div>
            </div>

            {/* Trust badges */}
            <div className="trust-row">
              <div className="trust-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>256-bit SSL</div>
              <div className="trust-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>HIPAA Compliant</div>
              <div className="trust-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Secure Auth</div>
            </div>
          </div>
        </main>

        {/* ── FOOTER ── */}
        <footer className="cf-footer">
          <div className="cf-footer-inner">
            <div className="cf-footer-logo">
              <CredFlowLogoIcon size={22} dark={false} />
              <span className="footer-wordmark"><span className="cred">Cred</span><span className="flow">Flow</span></span>
            </div>
            <div className="cf-footer-tagline">Credentialing. Simplified. Accelerated.</div>
            <div className="cf-footer-copy">© {year} CredFlow. All rights reserved.</div>
          </div>
        </footer>

      </div>
    </>
  )
}

// ── SVG COMPONENTS ────────────────────────────────────────────────────────────
function CredFlowLogoIcon({ size = 44, dark = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 46 46" fill="none">
      <circle cx="23" cy="23" r="20" fill="none" stroke={dark ? '#0D1B3D' : 'rgba(255,255,255,0.5)'} strokeWidth="3.5"/>
      <circle cx="34" cy="10" r="5" fill="#10B981"/>
      <circle cx="23" cy="23" r="10" fill="#0D1B3D"/>
      <path d="M18 23l3.2 3.2 6.8-7" stroke="#10B981" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="15" cy="37" r="2.5" fill="#A7F3D0"/>
      <circle cx="22" cy="39.5" r="2" fill="#2563EB"/>
    </svg>
  )
}

const EmailSVG  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
const LockSVG   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
const UserSVG   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const OrgSVG    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const EyeSVG    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const EyeOffSVG = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body { font-family: 'Poppins', system-ui, sans-serif; -webkit-font-smoothing: antialiased; background: #F0F2F7; color: #0D1B3D; font-size: 14px; }
a { text-decoration: none; color: inherit; }
button { font-family: inherit; cursor: pointer; }

:root {
  --navy: #0D1B3D;
  --blue: #2563EB;
  --blue-h: #1d55d4;
  --green: #10B981;
  --border: #E2E8F0;
  --ink-3: #64748B;
  --ink-4: #94A3B8;
}

.cf-page { display: flex; flex-direction: column; min-height: 100vh; }

/* HEADER */
.cf-header { background: #fff; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; box-shadow: 0 1px 4px rgba(13,27,61,.06); }
.cf-header-inner { max-width: 1100px; margin: 0 auto; padding: 0 32px; height: 68px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.cf-logo { display: flex; align-items: center; gap: 11px; flex-shrink: 0; }
.cf-logo-text { display: flex; flex-direction: column; }
.cf-logo-wordmark { font-size: 22px; font-weight: 800; letter-spacing: -.5px; line-height: 1; }
.cred { color: var(--navy); }
.flow { color: var(--green); }
.cf-logo-tagline { font-size: 7px; font-weight: 600; letter-spacing: 1.4px; color: var(--ink-4); margin-top: 2px; }
.cf-header-right { display: flex; align-items: center; gap: 10px; }
.cf-header-hint { font-size: 12.5px; color: var(--ink-4); }
.cf-nav-cta { padding: 8px 18px; background: var(--blue); color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; transition: all .15s; box-shadow: 0 2px 8px rgba(37,99,235,.28); }
.cf-nav-cta:hover { background: var(--blue-h); transform: translateY(-1px); }

/* HERO BAND */
.cf-hero-band { background: linear-gradient(135deg, #0D1B3D 0%, #132240 55%, #1a3060 100%); padding: 44px 32px 52px; position: relative; overflow: hidden; }
.cf-hero-band::before { content: ''; position: absolute; top: -80px; right: -80px; width: 380px; height: 380px; background: radial-gradient(circle, rgba(16,185,129,.15) 0%, transparent 70%); border-radius: 50%; }
.cf-hero-band::after  { content: ''; position: absolute; bottom: -50px; left: 4%; width: 260px; height: 260px; background: radial-gradient(circle, rgba(37,99,235,.18) 0%, transparent 70%); border-radius: 50%; }
.cf-hero-inner { max-width: 620px; margin: 0 auto; text-align: center; position: relative; z-index: 1; }
.cf-hero-tag { display: inline-flex; align-items: center; gap: 8px; background: rgba(16,185,129,.14); border: 1px solid rgba(16,185,129,.3); border-radius: 20px; padding: 4px 14px; font-size: 10px; font-weight: 600; color: #A7F3D0; letter-spacing: .8px; text-transform: uppercase; margin-bottom: 16px; }
.tag-dot { width: 6px; height: 6px; background: #10B981; border-radius: 50%; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }
.cf-hero-h1 { font-size: 32px; font-weight: 800; color: white; letter-spacing: -.6px; line-height: 1.2; margin-bottom: 12px; }
.cf-hero-sub { font-size: 14px; color: rgba(255,255,255,.6); line-height: 1.7; max-width: 500px; margin: 0 auto; }

/* MAIN */
.cf-main { flex: 1; padding: 40px 24px 56px; }
.cf-card-wrap { max-width: 456px; margin: 0 auto; }

/* CARD */
.cf-card { background: #fff; border: 1px solid var(--border); border-radius: 18px; padding: 32px 32px 24px; box-shadow: 0 4px 28px rgba(13,27,61,.09); margin-bottom: 16px; }
.card-top-logo { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
.ctl-name { font-size: 15px; font-weight: 700; letter-spacing: -.3px; }

/* STEPPER */
.step-bar { display: flex; align-items: center; margin-bottom: 20px; background: #F8FAFC; border: 1px solid var(--border); border-radius: 10px; padding: 10px 16px; }
.step-item { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 500; color: var(--ink-4); flex: 1; }
.step-item.active { color: var(--blue); }
.step-item.done   { color: #10B981; }
.step-num { width: 22px; height: 22px; border-radius: 50%; border: 2px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 700; flex-shrink: 0; }
.step-item.active .step-num { background: var(--blue); border-color: var(--blue); color: white; }
.step-item.done   .step-num { background: #10B981; border-color: #10B981; color: white; }
.step-line { flex: 1; height: 2px; background: var(--border); margin: 0 10px; }
.step-lbl { white-space: nowrap; }
.card-heading { font-size: 20px; font-weight: 700; color: var(--navy); letter-spacing: -.3px; margin-bottom: 4px; }
.card-sub { font-size: 12.5px; color: var(--ink-3); margin-bottom: 20px; line-height: 1.5; }

/* FORM */
.cf-form { display: flex; flex-direction: column; gap: 12px; }
.cf-field { display: flex; flex-direction: column; gap: 5px; }
.cf-field label { font-size: 12.5px; font-weight: 600; color: #374151; }
.opt-lbl { font-weight: 400; color: var(--ink-4); }
.cf-input-wrap { position: relative; display: flex; align-items: center; }
.cf-input-wrap input { width: 100%; padding: 10px 40px 10px 38px; border: 1.5px solid var(--border); border-radius: 10px; font-family: 'Poppins', sans-serif; font-size: 13.5px; color: var(--navy); background: #FAFBFC; outline: none; transition: all .15s; }
.cf-input-wrap input:focus { border-color: var(--blue); background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
.cf-input-wrap input::placeholder { color: #C1C9D8; }
.cf-input-icon { position: absolute; left: 12px; color: var(--ink-4); display: flex; align-items: center; pointer-events: none; z-index: 1; }
.eye-btn { position: absolute; right: 12px; background: none; border: none; color: var(--ink-4); display: flex; align-items: center; padding: 0; transition: color .15s; z-index: 1; }
.eye-btn:hover { color: var(--navy); }
.field-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.forgot-row { display: flex; justify-content: flex-end; margin-top: -4px; }
.recap-box { display: flex; flex-direction: column; gap: 2px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 10px 14px; }
.recap-name  { font-size: 13px; font-weight: 600; color: var(--navy); }
.recap-email { font-size: 11.5px; color: var(--ink-3); }
.strength-wrap { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.strength-bars { display: flex; gap: 4px; flex: 1; }
.strength-bar  { flex: 1; height: 4px; border-radius: 4px; transition: background .3s; }
.strength-lbl  { font-size: 11.5px; font-weight: 600; min-width: 36px; }
.pass-rules { display: flex; flex-direction: column; gap: 3px; padding: 9px 12px; background: #F8FAFC; border: 1px solid var(--border); border-radius: 8px; }
.pass-rule     { font-size: 11.5px; color: var(--ink-4); display: flex; gap: 7px; align-items: center; }
.pass-rule--ok { color: #10B981; }
.inline-warn   { font-size: 11.5px; color: #ef4444; }
.inline-ok     { font-size: 11.5px; color: #10B981; }
.msg-error, .msg-success { display: flex; align-items: flex-start; gap: 10px; border-radius: 10px; padding: 11px 14px; font-size: 12.5px; line-height: 1.5; margin-bottom: 8px; }
.msg-error   { background: #FEF2F2; border: 1px solid #FCA5A5; color: #B91C1C; }
.msg-success { background: #ECFDF5; border: 1px solid #86EFAC; color: #065F46; }
.msg-icon        { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.msg-icon--red   { background: #EF4444; color: white; }
.msg-icon--green { background: #10B981; color: white; }
.cf-submit { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 12px 20px; width: 100%; background: var(--blue); color: white; border: none; border-radius: 10px; font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 600; transition: all .15s; box-shadow: 0 3px 12px rgba(37,99,235,.3); margin-top: 4px; }
.cf-submit:hover:not(:disabled) { background: var(--blue-h); box-shadow: 0 5px 18px rgba(37,99,235,.4); transform: translateY(-1px); }
.cf-submit:disabled { opacity: .6; cursor: not-allowed; transform: none; }
.cf-back { width: 100%; background: none; border: 1.5px solid var(--border); border-radius: 8px; padding: 9px 14px; font-size: 12.5px; color: var(--ink-3); transition: all .15s; text-align: center; }
.cf-back:hover { border-color: var(--blue); color: var(--blue); }
.spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: white; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.card-divider { display: flex; align-items: center; gap: 12px; margin: 18px 0 14px; color: var(--ink-4); font-size: 11.5px; }
.card-divider::before, .card-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.card-switch { text-align: center; font-size: 13px; color: var(--ink-3); }
.link-primary { background: none; border: none; color: var(--blue); font-weight: 600; font-size: inherit; padding: 0; }
.link-primary:hover { color: var(--blue-h); text-decoration: underline; }
.link-sm { background: none; border: none; color: var(--blue); font-size: 12px; font-weight: 500; padding: 0; }
.link-sm:hover { color: var(--blue-h); text-decoration: underline; }

/* TRUST BADGES */
.trust-row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.trust-badge { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--ink-4); background: white; border: 1px solid var(--border); border-radius: 20px; padding: 5px 12px; }

/* FOOTER */
.cf-footer { background: var(--navy); margin-top: auto; padding: 22px 32px; }
.cf-footer-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.cf-footer-logo { display: flex; align-items: center; gap: 8px; }
.footer-wordmark { font-size: 15px; font-weight: 800; letter-spacing: -.3px; }
.cf-footer-tagline { font-size: 11.5px; color: rgba(255,255,255,.4); }
.cf-footer-copy { font-size: 11px; color: rgba(255,255,255,.28); }

@media (max-width: 600px) {
  .cf-hero-h1 { font-size: 24px; }
  .cf-hero-band { padding: 30px 20px 38px; }
  .cf-main { padding: 24px 16px 48px; }
  .cf-card { padding: 24px 18px 20px; }
  .cf-header-inner { padding: 0 20px; }
  .cf-header-hint { display: none; }
  .field-row-2 { grid-template-columns: 1fr; }
  .cf-footer-inner { flex-direction: column; align-items: center; text-align: center; gap: 6px; }
}
`
