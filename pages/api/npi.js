import { requireAuth } from '../../lib/supabase-server'
import { enforceRateLimit } from '../../lib/api-middleware'

export default async function handler(req, res) {
  if (!enforceRateLimit(req, res, { max: 30, windowMs: 60_000, keyPrefix: 'npi:' })) return

  // Auth guard — prevent open proxy abuse
  const user = await requireAuth(req, res)
  if (!user) return

  const { number } = req.query;

  if (!number) {
    return res.status(400).json({ error: "Missing NPI number" });
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000) // 8s — within Vercel's 10s limit

  try {
    const response = await fetch(
      `https://npiregistry.cms.hhs.gov/api/?number=${encodeURIComponent(number)}&version=2.1`,
      { signal: controller.signal }
    )
    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'NPI registry timed out. Please try again in a moment.' })
    }
    return res.status(500).json({ error: 'Could not reach NPI registry' })
  } finally {
    clearTimeout(timeout) // always cancel the timer, even on success
  }
}
