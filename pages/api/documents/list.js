import { list } from '@vercel/blob'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { providerId, prefix } = req.query

    const options = {}
    if (providerId) {
      options.prefix = `documents/${providerId}/`
    } else if (prefix) {
      options.prefix = prefix
    }

    const { blobs } = await list(options)

    const files = blobs.map(blob => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
      filename: blob.pathname.split('/').pop() || 'unknown',
    }))

    return res.status(200).json({ files })
  } catch (error) {
    console.error('List error:', error)
    return res.status(500).json({ error: 'Failed to list files: ' + error.message })
  }
}
