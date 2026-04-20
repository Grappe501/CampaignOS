/** Shaped rows from `workspace_profile_*` + catalog joins for dashboard cards. */
export type StructuredWorkspaceRecord = {
  title: string
  status: string
  description?: string | null
}

export function humanizeWorkspaceStatus(status: string): string {
  const s = String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
  if (!s) return 'Unknown'
  return s
    .split(/\s+/u)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
