/**
 * Stable correlation scope for orchestration bundles and recommendation rows.
 * Prefer campaign identifiers from program event rows — avoid mislabeling user profile id as campaign_id.
 */

/** Best-effort campaign key from visible calendar rows, else session-scoped fallback for audit correlation. */
export function resolveEventAiCampaignScope(
  programEvents: readonly { campaign_id?: string | null }[],
  profileId: string | undefined | null,
): string {
  for (const e of programEvents) {
    const c = e.campaign_id
    if (c != null && String(c).trim() !== '') return String(c).trim()
  }
  if (profileId != null && String(profileId).trim() !== '') {
    return `session_profile:${String(profileId).trim()}`
  }
  return 'default'
}
