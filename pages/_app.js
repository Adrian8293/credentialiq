import '../styles/globals.css'
import '../styles/credflow.css'
import Head from 'next/head'

// ── Env validation (dev only) ────────────────────────────────────────────────
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
  const missing = required.filter(k => !process.env[k])
  if (missing.length) {
    throw new Error(
      `[Lacentra] Missing required environment variables:\n${missing.map(k => `  • ${k}`).join('\n')}\n\nCopy .env.example → .env.local and fill in your Supabase credentials.`
    )
  }
}

// Inline SVG favicon — eliminates the 404 on every page load
const FAVICON_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'>
  <path d='M24 2L4 10V26C4 36 13 44 24 47C35 44 44 36 44 26V10L24 2Z' fill='%231565C0'/>
  <path d='M24 2L44 10V26C44 36 35 44 24 47V2Z' fill='%235CB85C'/>
  <polyline points='13,25 21,33 35,17' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round' fill='none'/>
</svg>`
const FAVICON_URL = `data:image/svg+xml,${FAVICON_SVG}`

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" href={FAVICON_URL} type="image/svg+xml" />
        <link rel="shortcut icon" href={FAVICON_URL} />
        {/* Sora (display) + DM Sans (body) — LACentra brand system */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <title>Lacentra</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
