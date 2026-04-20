/**
 * Onboarding checklist generation from role interests and org defaults.
 */

import type { VolunteerOnboardingStatus } from './volunteerCommandDomain'

export type OnboardingChecklistItem = {
  key: string
  label: string
  done: boolean
}

const BASE_KEYS: { key: string; label: string }[] = [
  { key: 'contact_confirmed', label: 'Intro call or email completed' },
  { key: 'code_of_conduct', label: 'Code of conduct acknowledged' },
  { key: 'availability_logged', label: 'Availability and travel captured' },
  { key: 'skills_review', label: 'Skills and interests reviewed' },
]

export function generateOnboardingChecklist(input: {
  preferredRoleSlugs: string[]
  fromStatus: VolunteerOnboardingStatus
}): OnboardingChecklistItem[] {
  const items = BASE_KEYS.map((b) => ({ ...b, done: false }))
  if (input.preferredRoleSlugs.includes('team_lead')) {
    items.push({ key: 'leadership_chat', label: 'Leadership pathway conversation', done: false })
  }
  return items
}

export function nextOnboardingStatus(current: VolunteerOnboardingStatus): VolunteerOnboardingStatus {
  const order: VolunteerOnboardingStatus[] = [
    'new',
    'contacted',
    'onboarding',
    'ready',
    'active',
    'paused',
    'inactive',
  ]
  const i = order.indexOf(current)
  if (i < 0 || i >= order.length - 1) return current
  return order[i + 1]!
}
