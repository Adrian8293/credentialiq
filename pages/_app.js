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
  <rect width='48' height='48' rx='12' fill='%231E56F0'/>
  <text x='10' y='36' font-family='Inter,system-ui,sans-serif' font-weight='800' font-size='30' fill='%23FFFFFF'>P</text>
</svg>`
const FAVICON_URL = `data:image/svg+xml,${FAVICON_SVG}`

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" href={FAVICON_URL} type="image/svg+xml" />
        <link rel="shortcut icon" href={FAVICON_URL} />
        {/* Plus Jakarta Sans + Geist Mono — Lacentra design system v2 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <title>Lacentra</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
