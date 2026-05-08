import { put } from '@vercel/blob'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const contentType = req.headers['content-type'] || ''
    const filename = req.headers['x-filename'] || `document-${Date.now()}`
    const providerId = req.headers['x-provider-id'] || 'unknown'
    const docType = req.headers['x-doc-type'] || 'document'

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    const mimeType = contentType.split(';')[0]
    if (!allowedTypes.some(t => mimeType.includes(t) || mimeType.includes('application/octet-stream'))) {
      return res.status(400).json({ error: 'Invalid file type. Allowed: PDF, JPG, PNG, WebP, DOC, DOCX' })
    }

    // Read the raw body
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    // Check file size (max 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' })
    }

    // Create a clean path for the document
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const path = `documents/${providerId}/${docType}/${Date.now()}-${sanitizedFilename}`

    // Upload to Vercel Blob (private store)
    const blob = await put(path, buffer, {
      access: 'public', // Using public for simplicity; can switch to private if needed
      contentType: mimeType === 'application/octet-stream' ? 'application/pdf' : mimeType,
    })

    return res.status(200).json({
      url: blob.url,
      pathname: blob.pathname,
      size: buffer.length,
      contentType: blob.contentType,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ error: 'Upload failed: ' + error.message })
  }
}
