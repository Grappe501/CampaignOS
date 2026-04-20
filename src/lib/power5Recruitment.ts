import { supabase } from './supabaseClient'

/**
 * Creates a recruitment link + optional invite row; returns token for `/join?p5=…` style URLs later.
 */
export async function createPower5RecruitmentLink(input: {
  recruiterProfileId: string
  teamId: string
  personalizationNote?: string
}): Promise<{ inviteToken: string; linkId: string }> {
  const { data: link, error: le } = await supabase
    .from('power5_recruitment_links')
    .insert({
      recruiter_profile_id: input.recruiterProfileId,
      team_id: input.teamId,
      qr_payload: {
        v: 1,
        campaign: 'chris-jones-for-congress',
        kind: 'power5',
      },
    })
    .select('id, invite_token')
    .single()

  if (le || !link) {
    throw new Error(le?.message ?? 'Could not create recruitment link')
  }

  const { error: ie } = await supabase.from('power5_invites').insert({
    recruitment_link_id: link.id,
    personalization_note: input.personalizationNote?.slice(0, 2000) ?? null,
    status: 'pending',
  })

  if (ie) {
    console.warn('power5 invite row:', ie.message)
  }

  return {
    linkId: link.id as string,
    inviteToken: String(link.invite_token),
  }
}
