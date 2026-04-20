import type { Power5ContactPath } from './power5Model'
import { POWER5_CONTACT_PATHS } from './power5Model'
import type { Power5RelationshipNodeRow } from './power5Model'

const DEFAULT_ORDER: Power5ContactPath[] = [
  'face_to_face',
  'phone_call',
  'zoom',
  'social_media',
  'text',
]

const KIND_BOOST: Partial<Record<string, Power5ContactPath>> = {
  family: 'face_to_face',
  neighbor: 'face_to_face',
  church: 'face_to_face',
  coworker: 'phone_call',
  friend: 'text',
  teammate: 'phone_call',
  community: 'face_to_face',
}

/** Relationship- and proximity-first recommended channel (user can override in UI). */
export function recommendContactPath(node: Power5RelationshipNodeRow): Power5ContactPath {
  const preferred = node.preferred_contact as Power5ContactPath
  if (preferred && POWER5_CONTACT_PATHS.includes(preferred)) {
    return preferred
  }
  const boost = KIND_BOOST[node.relationship_kind]
  if (boost) return boost
  const prox = node.proximity_type
  if (prox === 'co_resident' || prox === 'same_block' || prox === 'same_community') {
    return 'face_to_face'
  }
  if (prox === 'digital_only') return 'social_media'
  return 'phone_call'
}

/** Full fallback order starting from recommendation. */
export function contactPathOrder(primary: Power5ContactPath): Power5ContactPath[] {
  const i = DEFAULT_ORDER.indexOf(primary)
  if (i <= 0) return [...DEFAULT_ORDER]
  return [primary, ...DEFAULT_ORDER.filter((p) => p !== primary)]
}

export function contactStrategySummary(node: Power5RelationshipNodeRow): string {
  const p = recommendContactPath(node)
  const order = contactPathOrder(p)
  const labels: Record<Power5ContactPath, string> = {
    face_to_face: 'in person',
    phone_call: 'phone',
    zoom: 'Zoom',
    social_media: 'social',
    text: 'text',
  }
  return `Start ${labels[p]}, then ${order
    .slice(1, 4)
    .map((x) => labels[x])
    .join(' → ')}`
}
