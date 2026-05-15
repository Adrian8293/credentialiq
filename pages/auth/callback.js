/**
 * pages/auth/callback.js
 *
 * Catches Supabase magic link and OAuth redirects.
 * Supabase appends #access_token=... to the Site URL after auth.
 * This page reads that token, establishes the session, then redirects home.
 */
import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  useEffect(() => {
    // getSession() reads the token from the URL fragment automatically
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = '/'
      } else {
        // No session found — send back to login
        window.location.href = '/login'
      }
    })
  }, [])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'Inter, sans-serif',
      color: '#64748B',
      fontSize: '14px',
    }}>
      Signing you in…
    </div>
  )
}
