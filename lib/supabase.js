import { createClient } from '@supabase/supabase-js'

/**
 * lib/supabase.js — Browser-side Supabase client
 *
 * WHY THIS CHANGED:
 * The previous implementation used createBrowserClient from @supabase/ssr.
 * That package requires middleware.js to forward the session cookie on every
 * SSR request. This app has NO middleware.js and uses the Pages Router with
 * purely client-side data fetching — so createBrowserClient cannot correctly
 * attach the auth token to outgoing Supabase requests.
 *
 * Result: auth.uid() arrives as null in Postgres RLS, and even permissive
 * policies (USING true) block inserts because the user is seen as the anon
 * role, not authenticated.
 *
 * Standard createClient stores the session in localStorage and sends the JWT
 * in the Authorization header on every request automatically. This is the
 * correct client for a purely client-side Next.js Pages Router app.
 *
 * SWITCHED FROM: createBrowserClient (@supabase/ssr)
 * SWITCHED TO:   createClient (@supabase/supabase-js)
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Lacentra] Missing Supabase environment variables.\n' +
    'Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
    'in .env.local (dev) and Vercel environment variables (prod).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:     true,  // keep session across page reloads
    autoRefreshToken:   true,  // refresh JWT before it expires
    detectSessionInUrl: true,  // handle magic link / OAuth redirects
    storageKey: 'lacentra-auth', // namespaced localStorage key
  },
})