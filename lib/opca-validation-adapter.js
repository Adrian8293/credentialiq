// lib/opca-validation-adapter.js
// Bridges your existing flat providers schema to OPCA validation logic.
// Reads core fields (npi, license, malCarrier, etc.) from the flat row,
// and reads OPCA-specific data (peer refs, work history, attestation) from
// the opcaData JSONB column.

function issue(field, section, message, severity, blocking) {
  return { field, section, message, severity, blocking }
}

function monthsBetween(a, b) {
  const da = new Date(a), db = new Date(b)
  return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth())
}

export function validateProviderForOPCA(provider, formVersion = '2025') {
  const issues = []
  const opca = provider.opcaData || {}

  // ── NPI ────────────────────────────────────────────────────────────────────
  if (!provider.npi || provider.npi.trim() === '') {
    issues.push(issue('npi', 'Section XIV – Licensure',
      'Individual NPI (Type 1) is required.', 'error', true))
  }

  // ── Oregon License ──────────────────────────────────────────────────────────
  if (!provider.license || provider.license.trim() === '') {
    issues.push(issue('license', 'Section XIV – Licensure',
      'Oregon license or registration number is required.', 'error', true))
  }

  // ── License expiration ──────────────────────────────────────────────────────
  if (provider.licenseExp) {
    const exp = new Date(provider.licenseExp)
    if (exp < new Date()) {
      issues.push(issue('licenseExp', 'Section XIV – Licensure',
        `Oregon license expired on ${exp.toLocaleDateString()}. Cannot submit with expired license.`,
        'error', true))
    }
  } else {
    issues.push(issue('licenseExp', 'Section XIV – Licensure',
      'License expiration date is missing.', 'warning', false))
  }

  // ── DEA Issue Date (2025 only) ──────────────────────────────────────────────
  if (formVersion === '2025' && provider.dea && provider.dea.trim() !== '') {
    if (!opca.dea_issue_date) {
      issues.push(issue('dea_issue_date', 'Section XIV – Licensure',
        'DEA Issue Date is a new required field in the 2025 OPCA. Obtain from the DEA certificate.',
        'error', true))
    }
  }

  // ── Malpractice insurance ───────────────────────────────────────────────────
  if (!provider.malCarrier || provider.malCarrier.trim() === '') {
    issues.push(issue('malCarrier', 'Section XX – Liability Insurance',
      'Current malpractice carrier name is required.', 'error', true))
  }
  if (provider.malExp) {
    const exp = new Date(provider.malExp)
    if (exp < new Date()) {
      issues.push(issue('malExp', 'Section XX – Liability Insurance',
        `Malpractice insurance expired on ${exp.toLocaleDateString()}.`, 'error', true))
    }
  } else {
    issues.push(issue('malExp', 'Section XX – Liability Insurance',
      'Malpractice insurance expiration date is missing.', 'warning', false))
  }

  // ── Peer references ─────────────────────────────────────────────────────────
  const refs = opca.peer_references || []
  if (refs.length < 3) {
    issues.push(issue('peer_references', 'Section XVIII – Peer References',
      `Only ${refs.length} of 3 required peer references provided.`, 'error', true))
  } else {
    refs.forEach((ref, i) => {
      if (!ref.reference_name?.trim()) {
        issues.push(issue(`peer_references[${i}].name`, 'Section XVIII – Peer References',
          `Reference ${i + 1}: name is required.`, 'error', true))
      }
      if (!ref.phone?.trim()) {
        issues.push(issue(`peer_references[${i}].phone`, 'Section XVIII – Peer References',
          `Reference ${i + 1} (${ref.reference_name || 'unnamed'}): phone is required.`, 'warning', false))
      }
      if (formVersion === '2025' && !ref.location_name?.trim()) {
        issues.push(issue(`peer_references[${i}].location_name`, 'Section XVIII – Peer References',
          `Reference ${i + 1}: location/facility name is new in 2025.`, 'warning', false))
      }
    })
  }

  // ── Work history gaps ───────────────────────────────────────────────────────
  const workHistory = opca.work_history || []
  const gaps = opca.work_history_gaps || []

  if (workHistory.length === 0) {
    issues.push(issue('work_history', 'Section XVII – Work History',
      'No work history entered. Work history from professional school entry to present is required.',
      'error', true))
  } else {
    const sorted = [...workHistory]
      .filter(j => j.from_date)
      .sort((a, b) => new Date(a.from_date) - new Date(b.from_date))

    for (let i = 0; i < sorted.length - 1; i++) {
      const end = sorted[i].to_date || new Date().toISOString().split('T')[0]
      const start = sorted[i + 1].from_date
      const months = monthsBetween(end, start)
      if (months > 2) {
        const explained = gaps.find(g => {
          const overlap =
            new Date(g.from_date) <= new Date(start) &&
            new Date(g.to_date) >= new Date(end)
          return overlap && g.explanation?.trim().length > 5
        })
        if (!explained) {
          const fromLabel = new Date(end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          const toLabel = new Date(start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          issues.push(issue('work_history_gaps', 'Section XVII – Work History',
            `Unexplained gap: ${fromLabel} → ${toLabel} (~${months} months). Section XVII-B requires explanation.`,
            'error', true))
        }
      }
    }
  }

  // ── Attestation ─────────────────────────────────────────────────────────────
  const attest = opca.attestation_answers
  if (!attest) {
    issues.push(issue('attestation', 'Section XXI – Attestation',
      'Attestation (Section XXI) has not been started. All questions must be answered.',
      'error', true))
  } else {
    const questions = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o']
    for (const q of questions) {
      const val = attest[`question_${q}`]
      if (val === null || val === undefined) {
        issues.push(issue(`attestation.question_${q}`, 'Section XXI – Attestation',
          `Question ${q.toUpperCase()} has not been answered.`, 'error', true))
      }
      // YES answers (true for A–N) require explanation; Q.O false (unchecked) requires explanation
      const requiresExplanation = formVersion === '2025' && q === 'o' ? val === false : val === true
      if (requiresExplanation) {
        const explanation = attest.explanations?.[`question_${q}`]
        if (!explanation || explanation.trim().length < 10) {
          const label = formVersion === '2025' && q === 'o'
            ? 'Question O (health condition)'
            : `Question ${q.toUpperCase()} (answered YES)`
          issues.push(issue(`attestation.explanations.question_${q}`, 'Section XXI – Attestation',
            `${label} requires a written explanation.`, 'error', true))
        }
      }
    }
    if (!attest.signed_at) {
      issues.push(issue('attestation.signature', 'Section XXI – Attestation',
        'Attestation has not been signed by the provider.', 'error', true))
    }
  }

  // ── Authorization & Release ─────────────────────────────────────────────────
  const auth = opca.authorization_release
  if (!auth?.signed_at) {
    issues.push(issue('authorization_release', 'Authorization & Release',
      'Authorization and Release form has not been signed.', 'error', true))
  }
  if (!auth?.printed_name?.trim()) {
    issues.push(issue('authorization_release.printed_name', 'Authorization & Release',
      'Printed name is required on the Authorization and Release form.', 'warning', false))
  }

  const blocking = issues.filter(i => i.blocking && i.severity === 'error')
  return {
    isValid: issues.filter(i => i.severity === 'error').length === 0,
    canExport: blocking.length === 0,
    issues,
  }
}

// Section-level completion scores for the progress tab
export function getSectionScores(provider) {
  const opca = provider.opcaData || {}
  const refs = opca.peer_references || []
  const attest = opca.attestation_answers || {}
  const auth = opca.authorization_release || {}

  return [
    {
      key: 'practitioner_info', label: 'II – Practitioner Info', page: 3,
      items: [provider.fname, provider.lname, provider.email, provider.npi, provider.cred],
    },
    {
      key: 'specialty', label: 'III – Specialty', page: 3,
      items: [provider.spec, provider.taxonomyCode],
    },
    {
      key: 'licensure', label: 'XIV – Licensure', page: 8,
      items: [provider.npi, provider.license, provider.licenseExp, provider.malCarrier],
    },
    {
      key: 'work_history', label: 'XVII – Work History', page: 10,
      items: [(opca.work_history?.length > 0) ? 'ok' : null],
    },
    {
      key: 'peer_references', label: 'XVIII – Peer References', page: 11,
      items: [refs[0]?.reference_name, refs[1]?.reference_name, refs[2]?.reference_name],
    },
    {
      key: 'attestation', label: 'XXI – Attestation', page: 14,
      items: [
        attest.question_a !== undefined ? 'answered' : null,
        attest.signed_at,
      ],
    },
    {
      key: 'authorization', label: 'Auth & Release', page: 15,
      items: [auth.printed_name, auth.signed_at],
    },
  ].map(s => {
    const completed = s.items.filter(v => v != null && v !== '').length
    const total = s.items.length
    return { ...s, score: Math.round((completed / total) * 100), completed, total }
  })
}
