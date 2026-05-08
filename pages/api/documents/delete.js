import { del } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({ error: 'No URL provided' })
    }

    await del(url)

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return res.status(500).json({ error: 'Delete failed: ' + error.message })
  }
}
