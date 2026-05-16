/**
 * pages/api/get-document-url.js
 *
 * Generates a fresh signed URL for a document file on demand.
 * Uses the service role key so it works regardless of the user's session.
 *
 * GET /api/get-document-url?documentId=xxx
 *
 * Returns: { signedUrl: "https://..." }
 */

import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { documentId } = req.query
  if (!documentId) {
    return res.status(400).json({ error: 'Missing documentId' })
  }

  try {
    const supabase = getServiceClient()

    // Get the stored file_url to extract the storage path
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('file_url, file_name')
      .eq('id', documentId)
      .single()

    if (docError || !doc?.file_url) {
      return res.status(404).json({ error: 'Document or file not found' })
    }

    // Extract the storage path from the existing signed URL
    // Format: .../storage/v1/object/sign/documents/PATH?token=...
    const pathMatch = doc.file_url.match(/\/documents\/([^?]+)/)
    if (!pathMatch?.[1]) {
      // URL is already a direct URL — return as-is
      return res.status(200).json({ signedUrl: doc.file_url, fileName: doc.file_name })
    }

    const storagePath = decodeURIComponent(pathMatch[1])

    // Generate a fresh signed URL — 1 hour TTL for viewing
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 60 * 60)

    if (error) {
      console.error('[get-document-url] createSignedUrl failed:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({
      signedUrl: data.signedUrl,
      fileName: doc.file_name,
    })

  } catch (err) {
    console.error('[get-document-url] Unexpected error:', err)
    return res.status(500).json({ error: err.message })
  }
}
