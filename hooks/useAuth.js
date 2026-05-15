import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function useAuth() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    // First read the session from localStorage (instant, no network call).
    // This prevents the flash-redirect to /login on page load.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setAuthLoading(false)
      } else {
        // No local session — confirm with server
        supabase.auth.getUser().then(({ data: { user } }) => {
          setUser(user ?? null)
          setAuthLoading(false)
        }).catch(() => {
          setUser(null)
          setAuthLoading(false)
        })
      }
    })

    // Listen for sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      // If a new session arrives (e.g. after magic link), stop loading
      if (session !== undefined) setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    if (typeof window !== 'undefined') window.location.href = '/login'
  }

  return { user, authLoading, signOut }
}

export { useAuth }
