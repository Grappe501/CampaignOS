/** Mirrors `volunteer_task_type_points` in Postgres for UI copy only. */
export const VOLUNTEER_TASK_TYPE_POINTS: Record<string, number> = {
  onboarding: 5,
  outreach: 8,
  training: 6,
  event: 7,
  admin: 4,
  power5: 10,
}

export function pointsForTaskType(taskType: string | null | undefined): number {
  const k = String(taskType ?? '')
    .trim()
    .toLowerCase()
  return VOLUNTEER_TASK_TYPE_POINTS[k] ?? 4
}
