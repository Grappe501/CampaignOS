export function formatEventDetailStage(s: string): string {
  return s.replace(/_/g, ' ')
}

/** Blueprint `EventStageSlug` labels (e.g. `followup`). */
export function formatEventStageSlug(s: string): string {
  return s.replace(/_/g, ' ')
}
