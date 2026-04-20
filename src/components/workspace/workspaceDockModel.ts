export type WorkspaceSectionGlyphId =
  | 'dash-identity-title'
  | 'next-step-card'
  | 'volunteer-global'
  | 'intern-desk'
  | 'mission-tasks'
  | 'daily-activation'
  | 'campaign-kpis'
  | 'onboarding-activation'
  | 'onboarding-branch'
  | 'voter-status-card'
  | 'workspace-summary'
  | 'branch-specialty'
  | 'public-officials-card'
  | 'power5-workspace'
  | 'voter-workspace'
  | 'exception-request'
  | 'workspace-cards'

/**
 * Scroll targets in the same top-to-bottom order as `Dashboard.tsx` panels.
 * Labels are short for icon `title` tooltips; `aria-label` adds “Jump to”.
 */
export const WORKSPACE_DOCK_ITEMS: readonly {
  id: WorkspaceSectionGlyphId
  label: string
}[] = [
  { id: 'dash-identity-title', label: 'Profile' },
  { id: 'next-step-card', label: 'Next step' },
  { id: 'volunteer-global', label: 'Volunteer guide' },
  { id: 'intern-desk', label: 'Team desk' },
  { id: 'mission-tasks', label: 'Mission' },
  { id: 'daily-activation', label: 'Daily' },
  { id: 'campaign-kpis', label: 'Goals' },
  { id: 'onboarding-activation', label: 'Get started' },
  { id: 'onboarding-branch', label: 'Path' },
  { id: 'voter-status-card', label: 'Voter' },
  { id: 'workspace-summary', label: 'Snapshot' },
  { id: 'branch-specialty', label: 'Path tips' },
  { id: 'public-officials-card', label: 'Officials' },
  { id: 'power5-workspace', label: 'Power of 5' },
  { id: 'voter-workspace', label: 'Lookup' },
  { id: 'exception-request', label: 'Exception' },
  { id: 'workspace-cards', label: 'Training' },
] as const
