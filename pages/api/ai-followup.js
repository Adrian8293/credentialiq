import { generateText } from 'ai'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    providerName, providerNpi, providerSpec,
    payerName, payerId,
    stage, submittedDate, submittedDaysAgo,
    followupDate, effectiveDate,
    notes, tone,
  } = req.body

  const toneGuide = {
    professional: 'formal, precise, and courteous — appropriate for insurance credentialing',
    urgent: 'firm and results-oriented, politely emphasizing timeline impact on patient care',
    friendly: 'warm and collaborative while remaining fully professional',
  }[tone] || 'professional'

  const systemPrompt = `You are a credentialing specialist at a behavioral health practice.
You write professional follow-up emails to insurance payers about provider enrollment applications.
Your emails are concise, specific, and always include all relevant reference details.
Never include placeholders like [Name] — use the actual values provided.
Output only the email body text (no subject line, no markdown).`

  const userPrompt = `Draft a ${toneGuide} follow-up email to ${payerName} (Payer ID: ${payerId}) regarding the credentialing application for:

Provider: ${providerName}
NPI: ${providerNpi}
Specialty: ${providerSpec}
Current stage: ${stage}
Application submitted: ${submittedDate || 'date unknown'} (${submittedDaysAgo ?? '?'} days ago)
Follow-up date: ${followupDate || 'not set'}
Expected effective date: ${effectiveDate || 'pending'}
Additional notes: ${notes || 'none'}

The email should:
1. Reference the provider's name and NPI clearly
2. State the current stage and days elapsed since submission
3. Request a status update with a specific response timeline (5 business days)
4. Offer to provide any additional information needed
5. End with a professional closing`

  try {
    const result = await generateText({
      model: 'anthropic/claude-sonnet-4-5',
      maxOutputTokens: 600,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })
    
    return res.status(200).json({ email: result.text })
  } catch (err) {
    console.error('AI followup error:', err)
    return res.status(500).json({ error: err.message })
  }
}
