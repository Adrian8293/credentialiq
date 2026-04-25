export default async function handler(req, res) {
  const { first_name, last_name, state, taxonomy, limit = 20 } = req.query

  if (!first_name && !last_name) {
    return res.status(400).json({ error: 'At least first or last name is required.' })
  }

  try {
    const params = new URLSearchParams({ version: '2.1', limit })
    if (first_name) params.append('first_name', first_name + '*')
    if (last_name)  params.append('last_name',  last_name  + '*')
    if (state)      params.append('state', state)
    if (taxonomy)   params.append('taxonomy_description', taxonomy + '*')
    // Always search individual providers (NPI-1)
    params.append('enumeration_type', 'NPI-1')

    const url = `https://npiregistry.cms.hhs.gov/api/?${params.toString()}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CredentialIQ/1.0 (Positive Inner Self, LLC)' }
    })

    if (!response.ok) {
      return res.status(502).json({ error: 'NPPES registry returned an error.' })
    }

    const data = await response.json()

    // Normalize results
    const results = (data.results || []).map(r => {
      const basic = r.basic || {}
      const addr  = (r.addresses || []).find(a => a.address_purpose === 'LOCATION') || r.addresses?.[0] || {}
      const tax   = (r.taxonomies || []).find(t => t.primary) || r.taxonomies?.[0] || {}
      const ids   = r.identifiers || []
      const licenseId = ids.find(i => i.desc === 'State license')

      return {
        npi:       r.number,
        fname:     basic.first_name  || '',
        lname:     basic.last_name   || '',
        cred:      (basic.credential || '').replace(/\./g, '').trim(),
        status:    basic.status      || '',
        gender:    basic.gender      || '',
        specialty: tax.desc          || '',
        taxonomy:  tax.code          || '',
        phone:     addr.telephone_number || '',
        address:   [addr.address_1, addr.city, addr.state, addr.postal_code].filter(Boolean).join(', '),
        city:      addr.city         || '',
        state:     addr.state        || '',
        zip:       addr.postal_code  || '',
        license:   licenseId?.identifier || '',
        licenseState: licenseId?.state  || '',
        enumType:  r.enumeration_type,
      }
    })

    return res.status(200).json({ results, resultCount: data.result_count || results.length })
  } catch (err) {
    console.error('NPI search error:', err)
    return res.status(500).json({ error: 'Could not reach NPI registry. Try again.' })
  }
}
