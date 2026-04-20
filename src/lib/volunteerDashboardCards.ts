import {
  normalizeKey,
  ONBOARDING_BRANCH_OPTIONS,
  type OnboardingBranchValue,
} from './dashboardState'

export type VolunteerPathCard = {
  id: string
  title: string
  description: string
  detail?: string
}

/** Scaffold: replace with final global volunteer copy when ready. */
export const VOLUNTEER_GLOBAL_CARDS: readonly VolunteerPathCard[] = [
  {
    id: 'global-todo-1',
    title: 'TODO — global card 1',
    description: 'Placeholder. Add campaign-wide volunteer guidance here.',
  },
  {
    id: 'global-todo-2',
    title: 'TODO — global card 2',
    description: 'Placeholder.',
  },
] as const

const BRANCH_SPECIALTIES: Partial<
  Record<OnboardingBranchValue, readonly VolunteerPathCard[]>
> = {
  registered_arkansas_voter: [
    {
      id: 'branch-ra-todo',
      title: 'TODO — registered Arkansas voter',
      description: 'Placeholder branch-specific content.',
    },
  ],
  eligible_not_registered: [
    {
      id: 'branch-enr-todo',
      title: 'TODO — eligible, not registered',
      description: 'Placeholder.',
    },
  ],
  under_18_youth: [
    {
      id: 'branch-youth-todo',
      title: 'TODO — under-18 youth',
      description: 'Placeholder.',
    },
  ],
  out_of_state_supporter: [
    {
      id: 'branch-oss-todo',
      title: 'TODO — out-of-state supporter',
      description: 'Placeholder.',
    },
  ],
  staff_admin_direct_placement: [
    {
      id: 'branch-staff-todo',
      title: 'TODO — staff / admin placement',
      description: 'Placeholder.',
    },
  ],
}

export function getBranchSpecialtyCards(
  onboardingBranch: string | null | undefined,
): VolunteerPathCard[] {
  const k = normalizeKey(onboardingBranch)
  for (const opt of ONBOARDING_BRANCH_OPTIONS) {
    if (opt.value === k) {
      const list = BRANCH_SPECIALTIES[opt.value]
      return list ? [...list] : []
    }
  }
  return []
}
