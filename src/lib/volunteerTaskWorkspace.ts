export type VolunteerTaskWorkspaceChecklistItem = {
  id: string
  label: string
}

export type VolunteerTaskWorkspaceSection = {
  id: string
  title: string
  body?: string
  checklist?: VolunteerTaskWorkspaceChecklistItem[]
}

/** Stored on template + copied to `volunteer_tasks.workspace_spec` (JSONB). */
export type VolunteerTaskWorkspaceSpec = {
  version?: number
  intro?: string
  sections?: VolunteerTaskWorkspaceSection[]
}

export function parseWorkspaceSpec(raw: unknown): VolunteerTaskWorkspaceSpec {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const intro = typeof o.intro === 'string' ? o.intro : undefined
  const version = typeof o.version === 'number' ? o.version : undefined
  const sectionsRaw = o.sections
  const sections: VolunteerTaskWorkspaceSection[] = []
  if (Array.isArray(sectionsRaw)) {
    for (const s of sectionsRaw) {
      if (!s || typeof s !== 'object') continue
      const r = s as Record<string, unknown>
      const id = typeof r.id === 'string' ? r.id.trim() : ''
      const title = typeof r.title === 'string' ? r.title.trim() : ''
      if (!id || !title) continue
      const body = typeof r.body === 'string' ? r.body : undefined
      const checklist: VolunteerTaskWorkspaceChecklistItem[] = []
      if (Array.isArray(r.checklist)) {
        for (const c of r.checklist) {
          if (!c || typeof c !== 'object') continue
          const cr = c as Record<string, unknown>
          const cid = typeof cr.id === 'string' ? cr.id.trim() : ''
          const label = typeof cr.label === 'string' ? cr.label.trim() : ''
          if (!cid || !label) continue
          checklist.push({ id: cid, label })
        }
      }
      sections.push({
        id,
        title,
        ...(body ? { body } : {}),
        ...(checklist.length ? { checklist } : {}),
      })
    }
  }
  return {
    ...(version != null ? { version } : {}),
    ...(intro ? { intro } : {}),
    ...(sections.length ? { sections } : {}),
  }
}

export function checklistItemKey(sectionId: string, itemId: string): string {
  return `${sectionId}:${itemId}`
}
