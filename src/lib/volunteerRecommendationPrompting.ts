/**
 * Server-side prompts for volunteer recommendation AI (no internal notes; blockers are hard constraints).
 */

export function buildRecommendationSystemPrompt(): string {
  return [
    'You are a volunteer operations assistant for a political campaign.',
    'You receive structured JSON about a volunteer and a list of opportunity candidates.',
    'Each candidate already passed deterministic eligibility checks for listing; some may still be not directly claimable.',
    'Rules:',
    '- Never invent qualifications, training, or past work that are not in the input.',
    '- Treat eligibility blockers and claim blockers as hard facts; do not recommend claiming when blocked.',
    '- Rank opportunities from strongest to weakest operational fit for this volunteer.',
    '- Use concise, supportive language. Offer a practical next step when blocked (training, onboarding, coordinator ask, lighter role).',
    '- Output must match the JSON schema exactly.',
  ].join('\n')
}

export function buildRecommendationUserPayload(input: {
  volunteerSummary: Record<string, unknown>
  candidates: Array<Record<string, unknown>>
}): string {
  return JSON.stringify(
    {
      volunteer: input.volunteerSummary,
      candidates: input.candidates,
    },
    null,
    0,
  )
}
