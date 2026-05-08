import { streamText, tool } from 'ai'
import { z } from 'zod'

// Payer requirements database (simplified for API context)
const PAYER_INFO = {
  'Aetna': { timeline: '60-90 days', portal: 'Availity', caqhRequired: true },
  'UnitedHealthcare': { timeline: '60-120 days', portal: 'Provider Express', caqhRequired: true },
  'BCBS Oregon (Regence)': { timeline: '45-60 days', portal: 'Regence Provider Portal', caqhRequired: true },
  'OHP / Medicaid (OHA)': { timeline: '45-60 days', portal: 'Oregon DMAP', caqhRequired: false },
  'Cigna': { timeline: '60-90 days', portal: 'Cigna for HCP', caqhRequired: true },
  'Medicare (PECOS)': { timeline: '60-90 days', portal: 'PECOS', caqhRequired: false },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, context } = req.body

  const systemPrompt = `You are an expert credentialing assistant for a healthcare practice. You help with:
- Provider enrollment and credentialing questions
- Payer requirements and timelines
- CAQH attestation guidance
- License renewal reminders
- Document requirements for each payer
- Best practices for credentialing workflow

Current practice context:
${context?.providers ? `- ${context.providers.length} providers on file` : ''}
${context?.enrollments ? `- ${context.enrollments.length} active enrollments` : ''}
${context?.pendingEnrollments ? `- ${context.pendingEnrollments} pending enrollments` : ''}

Be concise, specific, and actionable. Reference specific payer requirements when relevant.
Format your responses with clear sections when answering complex questions.`

  try {
    const result = streamText({
      model: 'anthropic/claude-sonnet-4-5',
      system: systemPrompt,
      messages: messages,
      maxOutputTokens: 1000,
      tools: {
        lookupPayerRequirements: tool({
          description: 'Look up specific requirements for a payer',
          inputSchema: z.object({
            payerName: z.string().describe('Name of the payer to look up'),
          }),
          execute: async ({ payerName }) => {
            const info = Object.entries(PAYER_INFO).find(([name]) => 
              name.toLowerCase().includes(payerName.toLowerCase())
            )
            if (info) {
              return {
                payer: info[0],
                ...info[1],
                requirements: [
                  'CAQH Profile (current attestation)',
                  'W-9 Form',
                  'Copy of License',
                  'Malpractice Insurance Certificate',
                  'NPI Confirmation',
                  'CV/Resume',
                ]
              }
            }
            return { error: 'Payer not found in database' }
          },
        }),
        calculateTimeline: tool({
          description: 'Calculate expected credentialing timeline',
          inputSchema: z.object({
            payerName: z.string(),
            submissionDate: z.string().nullable().describe('Date application was submitted (YYYY-MM-DD)'),
          }),
          execute: async ({ payerName, submissionDate }) => {
            const info = Object.entries(PAYER_INFO).find(([name]) => 
              name.toLowerCase().includes(payerName.toLowerCase())
            )
            if (info) {
              const [minDays, maxDays] = info[1].timeline.split('-').map(s => parseInt(s))
              const submitted = submissionDate ? new Date(submissionDate) : new Date()
              const minDate = new Date(submitted)
              const maxDate = new Date(submitted)
              minDate.setDate(minDate.getDate() + minDays)
              maxDate.setDate(maxDate.getDate() + maxDays)
              
              return {
                payer: info[0],
                timeline: info[1].timeline,
                expectedApprovalRange: {
                  earliest: minDate.toISOString().split('T')[0],
                  latest: maxDate.toISOString().split('T')[0],
                },
                recommendedFollowUp: new Date(submitted.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              }
            }
            return { error: 'Payer not found' }
          },
        }),
        getCredentialingChecklist: tool({
          description: 'Get a checklist of items needed for credentialing',
          inputSchema: z.object({
            providerType: z.string().describe('Type of provider (e.g., LCSW, LPC, Psychologist, MD)'),
            state: z.string().nullable().describe('State of practice'),
          }),
          execute: async ({ providerType, state }) => {
            const baseChecklist = [
              { item: 'Valid state license', required: true, notes: 'Must be current and unencumbered' },
              { item: 'NPI Number (Type 1)', required: true, notes: 'Individual provider NPI' },
              { item: 'CAQH Profile', required: true, notes: 'Attestation within 120 days' },
              { item: 'Malpractice insurance', required: true, notes: 'Minimum $1M/$3M coverage typical' },
              { item: 'W-9 Form', required: true, notes: 'Current tax information' },
              { item: 'CV/Resume', required: true, notes: 'Last 5 years of work history' },
              { item: 'Education verification', required: true, notes: 'Degree transcripts or verification letter' },
            ]
            
            if (['MD', 'DO', 'Physician', 'Psychiatrist'].some(t => providerType.includes(t))) {
              baseChecklist.push(
                { item: 'DEA Certificate', required: true, notes: 'If prescribing controlled substances' },
                { item: 'Board certification', required: false, notes: 'Highly recommended' },
                { item: 'Medical school diploma', required: true, notes: 'Or verification from school' },
                { item: 'Residency completion certificate', required: true, notes: 'Training verification' },
              )
            }
            
            return {
              providerType,
              state: state || 'All states',
              checklist: baseChecklist,
              tips: [
                'Complete CAQH profile before starting payer applications',
                'Gather all documents before beginning enrollment',
                'Keep copies of everything submitted',
                'Track submission dates for follow-up',
              ]
            }
          },
        }),
      },
    })

    // Stream the response
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    for await (const chunk of result.textStream) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
    }
    
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('AI assistant error:', err)
    return res.status(500).json({ error: err.message })
  }
}
