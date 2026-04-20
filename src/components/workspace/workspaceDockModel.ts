export type WorkspaceSectionGlyphId =
  | 'dash-identity-title'
  | 'next-step-card'
  | 'onboarding-activation'
  | 'onboarding-branch'
  | 'voter-status-card'
  | 'workspace-summary'
  | 'public-officials-card'
  | 'power5-summary'
  | 'power5-workspace'
  | 'voter-workspace'
  | 'exception-request'
  | 'mission-tasks'
  | 'daily-activation'
  | 'workspace-cards'

/** Right-rail dock: scroll target id + label (glyph matches id). */
export const WORKSPACE_DOCK_ITEMS: readonly {
  id: WorkspaceSectionGlyphId
  label: string
}[] = [
  { id: 'dash-identity-title', label: 'Top & profile' },
  { id: 'next-step-card', label: 'Next step' },
  { id: 'onboarding-activation', label: 'Get started' },
  { id: 'onboarding-branch', label: 'Volunteer path' },
  { id: 'voter-status-card', label: 'Voter status' },
  { id: 'workspace-summary', label: 'Workspace snapshot' },
  { id: 'public-officials-card', label: 'Public officials' },
  { id: 'power5-summary', label: 'Power of 5 summary' },
  { id: 'power5-workspace', label: 'Power of 5' },
  { id: 'voter-workspace', label: 'Voter lookup' },
  { id: 'exception-request', label: 'Roster exception' },
  { id: 'mission-tasks', label: 'Mission tasks' },
  { id: 'daily-activation', label: 'Daily activation' },
  { id: 'workspace-cards', label: 'Tasks & training' },
] as const
