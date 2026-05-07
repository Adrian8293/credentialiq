import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

export default function Login() {
  const [mode, setMode]             = useState('login')
  const [step, setStep]             = useState(1)
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [org, setOrg]               = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  function switchMode(m) {
    setMode(m); setStep(1); setError(''); setSuccess('')
    setEmail(''); setPassword(''); setFirstName(''); setLastName('')
    setConfirmPass(''); setOrg(''); setShowPass(false); setShowConfirm(false)
  }

  function validateStep1() {
    if (!firstName.trim()) return 'First name is required.'
    if (!lastName.trim())  return 'Last name is required.'
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'A valid email is required.'
    return null
  }
  function validateStep2() {
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter.'
    if (!/[0-9]/.test(password)) return 'Password must contain a number.'
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
  const strengthColor = ['', '#F43F5E', '#F59E0B', '#00C9A7', '#00C9A7'][strength]

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

  return (
    <>
      <Head>
        <title>PrimeCredential — {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: LOGIN_CSS }} />
      </Head>

      <div className="pc-root">

        {/* ── ambient blobs ── */}
        <div className="blob blob-teal" />
        <div className="blob blob-blue" />

        {/* ── center box ── */}
        <div className="pc-box">

          {/* Logo */}
          <div className="pc-logo">
            <PcMark size={36} />
            <div className="pc-logo-text">
              <span className="pc-prime">Prime</span><span className="pc-credential">Credential</span>
            </div>
          </div>

          {/* Heading */}
          <div className="pc-heading">
            {mode === 'login'  && 'Welcome back'}
            {mode === 'signup' && (step === 1 ? 'Create your account' : 'Secure your account')}
            {mode === 'reset'  && 'Reset your password'}
          </div>
          <div className="pc-sub">
            {mode === 'login'  && 'Sign in to your credentialing workspace.'}
            {mode === 'signup' && step === 1 && 'Step 1 of 2 — Your details.'}
            {mode === 'signup' && step === 2 && 'Step 2 of 2 — Choose a strong password.'}
            {mode === 'reset'  && "We'll send a secure link to your inbox."}
          </div>

          {/* Signup stepper */}
          {mode === 'signup' && (
            <div className="pc-stepper">
              <div className={`pc-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
                <div className="pc-step-dot">{step > 1 ? '✓' : '1'}</div>
                <span>Details</span>
              </div>
              <div className="pc-step-line" />
              <div className={`pc-step ${step >= 2 ? 'active' : ''}`}>
                <div className="pc-step-dot">2</div>
                <span>Security</span>
              </div>
            </div>
          )}

          {/* Messages */}
          {success && (
            <div className="pc-msg pc-msg--ok">
              <span className="pc-msg-icon">✓</span>
              <span>{success}</span>
            </div>
          )}
          {error && !success && (
            <div className="pc-msg pc-msg--err">
              <span className="pc-msg-icon">!</span>
              <span>{error}</span>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="pc-form" noValidate>

              {/* ── LOGIN ── */}
              {mode === 'login' && (
                <>
                  <Field label="Email address">
                    <InputWrap icon={<EmailIcon />}>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="you@practice.com" autoComplete="email" required />
                    </InputWrap>
                  </Field>
                  <Field label="Password">
                    <InputWrap icon={<LockIcon />} right={
                      <button type="button" className="eye-btn" onClick={() => setShowPass(s => !s)} tabIndex={-1}>
                        {showPass ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    }>
                      <input type={showPass ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
                    </InputWrap>
                  </Field>
                  <div className="pc-forgot">
                    <button type="button" className="pc-link" onClick={() => switchMode('reset')}>Forgot password?</button>
                  </div>
                  <button type="submit" className="pc-submit" disabled={loading}>
                    {loading ? <><Spinner /> Signing in…</> : 'Sign in →'}
                  </button>
                </>
              )}

              {/* ── SIGNUP step 1 ── */}
              {mode === 'signup' && step === 1 && (
                <>
                  <div className="pc-row2">
                    <Field label="First name">
                      <InputWrap icon={<UserIcon />}>
                        <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                          placeholder="Jane" autoComplete="given-name" />
                      </InputWrap>
                    </Field>
                    <Field label="Last name">
                      <InputWrap icon={<UserIcon />}>
                        <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                          placeholder="Smith" autoComplete="family-name" />
                      </InputWrap>
                    </Field>
                  </div>
                  <Field label="Work email">
                    <InputWrap icon={<EmailIcon />}>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="you@practice.com" autoComplete="email" />
                    </InputWrap>
                  </Field>
                  <Field label={<>Practice / Organization <span className="pc-opt">(optional)</span></>}>
                    <InputWrap icon={<OrgIcon />}>
                      <input type="text" value={org} onChange={e => setOrg(e.target.value)}
                        placeholder="Positive Inner Self, LLC" autoComplete="organization" />
                    </InputWrap>
                  </Field>
                  <button type="submit" className="pc-submit">Continue →</button>
                </>
              )}

              {/* ── SIGNUP step 2 ── */}
              {mode === 'signup' && step === 2 && (
                <>
                  <div className="pc-recap">
                    <div className="pc-recap-name">{firstName} {lastName}</div>
                    <div className="pc-recap-email">{email}</div>
                  </div>
                  <Field label="Password">
                    <InputWrap icon={<LockIcon />} right={
                      <button type="button" className="eye-btn" onClick={() => setShowPass(s => !s)} tabIndex={-1}>
                        {showPass ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    }>
                      <input type={showPass ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" />
                    </InputWrap>
                    {password && (
                      <div className="pc-strength">
                        <div className="pc-strength-bars">
                          {[1,2,3,4].map(i => (
                            <div key={i} className="pc-strength-bar" style={{ background: i <= strength ? strengthColor : 'rgba(255,255,255,.08)' }} />
                          ))}
                        </div>
                        <span className="pc-strength-label" style={{ color: strengthColor }}>{strengthLabel}</span>
                      </div>
                    )}
                    <div className="pc-rules">
                      {[[password.length >= 8,'8+ characters'],[/[A-Z]/.test(password),'Uppercase letter'],[/[0-9]/.test(password),'Number']].map(([ok, txt]) => (
                        <div key={txt} className={`pc-rule${ok ? ' ok' : ''}`}><span>{ok ? '✓' : '○'}</span>{txt}</div>
                      ))}
                    </div>
                  </Field>
                  <Field label="Confirm password">
                    <InputWrap icon={<LockIcon />} right={
                      <button type="button" className="eye-btn" onClick={() => setShowConfirm(s => !s)} tabIndex={-1}>
                        {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    }>
                      <input type={showConfirm ? 'text' : 'password'} value={confirmPass}
                        onChange={e => setConfirmPass(e.target.value)} placeholder="Repeat password" autoComplete="new-password" />
                    </InputWrap>
                    {confirmPass && (
                      password === confirmPass
                        ? <span className="pc-inline-ok">✓ Passwords match</span>
                        : <span className="pc-inline-err">Passwords do not match</span>
                    )}
                  </Field>
                  <button type="submit" className="pc-submit" disabled={loading}>
                    {loading ? <><Spinner /> Creating account…</> : 'Create Account →'}
                  </button>
                  <button type="button" className="pc-back" onClick={() => { setStep(1); setError('') }}>← Back</button>
                </>
              )}

              {/* ── RESET ── */}
              {mode === 'reset' && (
                <>
                  <Field label="Email address">
                    <InputWrap icon={<EmailIcon />}>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="you@practice.com" autoComplete="email" />
                    </InputWrap>
                  </Field>
                  <button type="submit" className="pc-submit" disabled={loading}>
                    {loading ? <><Spinner /> Sending…</> : 'Send Reset Link →'}
                  </button>
                </>
              )}

            </form>
          )}

          {/* Divider + switch */}
          <div className="pc-divider"><span>or</span></div>
          <div className="pc-switch">
            {mode === 'login'  && <p>No account? <button className="pc-link pc-link--bold" onClick={() => switchMode('signup')}>Create one</button></p>}
            {mode === 'signup' && <p>Have an account? <button className="pc-link pc-link--bold" onClick={() => switchMode('login')}>Sign in</button></p>}
            {mode === 'reset'  && <p>Remembered it? <button className="pc-link pc-link--bold" onClick={() => switchMode('login')}>Back to sign in</button></p>}
          </div>

          {/* Trust strip */}
          <div className="pc-trust">
            <TrustItem icon="🔒" label="256-bit SSL" />
            <div className="pc-trust-sep" />
            <TrustItem icon="🛡" label="HIPAA Compliant" />
            <div className="pc-trust-sep" />
            <TrustItem icon="✓" label="Secure Auth" />
          </div>

        </div>
      </div>
    </>
  )
}

/* ── Small helpers ── */
function Field({ label, children }) {
  return (
    <div className="pc-field">
      <label className="pc-label">{label}</label>
      {children}
    </div>
  )
}
function InputWrap({ icon, right, children }) {
  return (
    <div className="pc-input-wrap">
      <span className="pc-input-icon">{icon}</span>
      {children}
      {right && <span className="pc-input-right">{right}</span>}
    </div>
  )
}
function TrustItem({ icon, label }) {
  return <div className="pc-trust-item"><span>{icon}</span>{label}</div>
}
function Spinner() {
  return <span className="pc-spinner" />
}

/* ── Mark SVG ── */
function PcMark({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lmg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00C9A7"/>
          <stop offset="100%" stopColor="#3B82F6"/>
        </linearGradient>
      </defs>
      <rect x="2" y="10" width="30" height="4" rx="2" fill="url(#lmg)"/>
      <rect x="2" y="20" width="21" height="4" rx="2" fill="#00C9A7" opacity=".5"/>
      <rect x="2" y="30" width="25" height="4" rx="2" fill="#00C9A7" opacity=".28"/>
      <circle cx="39" cy="31" r="9" fill="none" stroke="#00C9A7" strokeWidth="2"/>
      <path d="M36 31l2.4 2.4 4.6-5" fill="none" stroke="#00C9A7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ── Icon set ── */
const EmailIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
const LockIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
const UserIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const OrgIcon    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const EyeIcon    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const EyeOffIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>

/* ── CSS ── */
const LOGIN_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;overflow:hidden;}
body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;background:#0B1628;color:#F1F5F9;font-size:14px;}
button{font-family:inherit;cursor:pointer;border:none;background:none;}
input{font-family:inherit;}

/* root */
.pc-root{
  position:fixed;inset:0;
  display:flex;align-items:center;justify-content:center;
  padding:24px;
  background:#0B1628;
  overflow-y:auto;
}

/* ambient blobs */
.blob{position:fixed;border-radius:50%;pointer-events:none;filter:blur(100px);}
.blob-teal{width:600px;height:600px;top:-200px;left:-200px;background:radial-gradient(circle,rgba(0,201,167,.07) 0%,transparent 70%);}
.blob-blue{width:500px;height:500px;bottom:-150px;right:-100px;background:radial-gradient(circle,rgba(59,130,246,.06) 0%,transparent 70%);}

/* box */
.pc-box{
  position:relative;z-index:1;
  width:100%;max-width:440px;
  background:#162038;
  border:1px solid rgba(255,255,255,.08);
  border-radius:20px;
  padding:40px 36px 32px;
  box-shadow:0 24px 64px rgba(0,0,0,.5),0 8px 24px rgba(0,0,0,.35);
}

/* logo */
.pc-logo{display:flex;align-items:center;gap:10px;margin-bottom:28px;}
.pc-logo-text{display:flex;align-items:baseline;line-height:1;}
.pc-prime{font-size:18px;font-weight:600;color:#F1F5F9;letter-spacing:-.4px;}
.pc-credential{font-size:18px;font-weight:300;color:#94A3B8;letter-spacing:-.2px;}

/* heading */
.pc-heading{font-size:22px;font-weight:700;color:#F1F5F9;letter-spacing:-.5px;margin-bottom:6px;}
.pc-sub{font-size:13px;color:#64748B;margin-bottom:24px;line-height:1.5;}

/* stepper */
.pc-stepper{display:flex;align-items:center;margin-bottom:22px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:10px 16px;}
.pc-step{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:500;color:#475569;flex:1;}
.pc-step.active{color:#00C9A7;}
.pc-step.done{color:#00C9A7;}
.pc-step-dot{width:22px;height:22px;border-radius:50%;border:1.5px solid currentColor;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;}
.pc-step.active .pc-step-dot,.pc-step.done .pc-step-dot{background:#00C9A7;border-color:#00C9A7;color:#0B1628;}
.pc-step-line{flex:1;height:1px;background:rgba(255,255,255,.08);margin:0 10px;}

/* form */
.pc-form{display:flex;flex-direction:column;gap:14px;}
.pc-field{display:flex;flex-direction:column;gap:5px;}
.pc-label{font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#64748B;}
.pc-opt{font-weight:400;color:#475569;text-transform:none;letter-spacing:0;}

/* input */
.pc-input-wrap{position:relative;display:flex;align-items:center;}
.pc-input-wrap input{
  width:100%;padding:10px 40px 10px 38px;
  border:1px solid rgba(255,255,255,.07);border-radius:8px;
  font-family:'Plus Jakarta Sans',sans-serif;font-size:13.5px;
  color:#F1F5F9;background:#1E2D4A;outline:none;
  transition:border-color .15s,box-shadow .15s,background .15s;
}
.pc-input-wrap input:focus{border-color:#00C9A7;background:#243257;box-shadow:0 0 0 3px rgba(0,201,167,.1);}
.pc-input-wrap input::placeholder{color:#334155;}
.pc-input-icon{position:absolute;left:12px;color:#475569;display:flex;align-items:center;pointer-events:none;z-index:1;}
.pc-input-right{position:absolute;right:12px;display:flex;align-items:center;z-index:1;}
.eye-btn{background:none;border:none;color:#475569;display:flex;align-items:center;padding:0;cursor:pointer;transition:color .15s;}
.eye-btn:hover{color:#94A3B8;}

/* two-col row */
.pc-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}

/* forgot */
.pc-forgot{display:flex;justify-content:flex-end;margin-top:-6px;}

/* strength */
.pc-strength{display:flex;align-items:center;gap:8px;margin-top:4px;}
.pc-strength-bars{display:flex;gap:4px;flex:1;}
.pc-strength-bar{flex:1;height:3px;border-radius:3px;transition:background .3s;}
.pc-strength-label{font-size:11px;font-weight:600;min-width:36px;}

/* rules */
.pc-rules{display:flex;flex-direction:column;gap:3px;padding:8px 12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:8px;margin-top:4px;}
.pc-rule{font-size:11.5px;color:#475569;display:flex;gap:7px;align-items:center;}
.pc-rule.ok{color:#00C9A7;}

/* inline feedback */
.pc-inline-ok{font-size:11.5px;color:#00C9A7;margin-top:2px;}
.pc-inline-err{font-size:11.5px;color:#F43F5E;margin-top:2px;}

/* recap */
.pc-recap{background:rgba(0,201,167,.06);border:1px solid rgba(0,201,167,.15);border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:2px;}
.pc-recap-name{font-size:13px;font-weight:600;color:#F1F5F9;}
.pc-recap-email{font-size:11px;color:#64748B;}

/* messages */
.pc-msg{display:flex;align-items:flex-start;gap:10px;border-radius:8px;padding:11px 14px;font-size:12.5px;line-height:1.5;margin-bottom:8px;}
.pc-msg--ok{background:rgba(0,201,167,.08);border:1px solid rgba(0,201,167,.2);color:#00C9A7;}
.pc-msg--err{background:rgba(244,63,94,.08);border:1px solid rgba(244,63,94,.2);color:#F43F5E;}
.pc-msg-icon{width:20px;height:20px;border-radius:50%;background:currentColor;color:#0B1628;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;}

/* submit */
.pc-submit{
  display:flex;align-items:center;justify-content:center;gap:9px;
  padding:12px 20px;width:100%;
  background:linear-gradient(90deg,#00C9A7,#3B82F6);
  color:#fff;border:none;border-radius:8px;
  font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:600;
  transition:opacity .15s,transform .15s;
  box-shadow:0 3px 14px rgba(0,201,167,.3);
  margin-top:2px;cursor:pointer;
}
.pc-submit:hover:not(:disabled){opacity:.88;transform:translateY(-1px);box-shadow:0 5px 20px rgba(0,201,167,.4);}
.pc-submit:disabled{opacity:.5;cursor:not-allowed;transform:none;}

/* back */
.pc-back{
  width:100%;padding:9px 14px;
  background:none;border:1px solid rgba(255,255,255,.07);border-radius:8px;
  font-size:12.5px;color:#64748B;
  transition:all .15s;text-align:center;cursor:pointer;
}
.pc-back:hover{border-color:rgba(0,201,167,.3);color:#00C9A7;}

/* spinner */
.pc-spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0;}
@keyframes spin{to{transform:rotate(360deg);}}

/* links */
.pc-link{background:none;border:none;color:#00C9A7;font-size:inherit;padding:0;cursor:pointer;transition:opacity .15s;}
.pc-link:hover{opacity:.75;}
.pc-link--bold{font-weight:600;}

/* divider */
.pc-divider{display:flex;align-items:center;gap:12px;margin:20px 0 14px;color:#334155;font-size:11.5px;}
.pc-divider::before,.pc-divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.06);}

/* switch */
.pc-switch{text-align:center;font-size:13px;color:#475569;}

/* trust */
.pc-trust{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:20px;flex-wrap:wrap;}
.pc-trust-item{display:flex;align-items:center;gap:5px;font-size:10px;color:#334155;}
.pc-trust-sep{width:3px;height:3px;border-radius:50%;background:#1E2D4A;}

@media(max-width:480px){
  .pc-box{padding:28px 22px 24px;}
  .pc-row2{grid-template-columns:1fr;}
}
`
