// pages/api/opca-migrate.js
// POST { profileId }  — takes an existing opca_profiles row (2023 or 2024)
//                       and creates a new 2025 version, flagging gaps.
// Returns: { newProfileId, summary }

import { createClient } from '@supabase/supabase-js'
import { migrateToOpca2025, buildMigrationSummary } from '../../lib/opca-migrator'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { profileId } = req.body
  if (!profileId) return res.status(400).json({ error: 'profileId is required' })

  // Fetch source profile
  const { data: source, error } = await supabase
    .from('opca_profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (error || !source) {
    return res.status(404).json({ error: 'OPCA profile not found' })
  }

  if (source.form_version === '2025') {
    return res.status(400).json({ error: 'Profile is already version 2025.' })
  }

  // Run migration
  const result = migrateToOpca2025(source)
  const summary = buildMigrationSummary(source, result)

  // Save migrated profile
  const { data: saved, error: saveError } = await supabase
    .from('opca_profiles')
    .insert([result.migratedProfile])
    .select()
    .single()

  if (saveError) {
    return res.status(500).json({ error: 'Failed to save migrated profile: ' + saveError.message })
  }

  return res.status(200).json({
    success: true,
    newProfileId: saved.id,
    summary,
  })
}
