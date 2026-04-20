import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { CHRIS_JONES_FOR_CONGRESS_PUBLIC } from '../brand/chrisJonesForCongress'

const SLUG = 'chris-jones-for-congress'

export type CampaignFooterData = {
  slogan: string
  social: { platform: string; label: string; url: string }[]
  contactLabel: string | null
  contactUrl: string | null
}

export function useCampaignFooter() {
  const [data, setData] = useState<CampaignFooterData>(() => ({
    slogan: CHRIS_JONES_FOR_CONGRESS_PUBLIC.slogan,
    social: CHRIS_JONES_FOR_CONGRESS_PUBLIC.social,
    contactLabel: CHRIS_JONES_FOR_CONGRESS_PUBLIC.contact.addressLabel ?? null,
    contactUrl: CHRIS_JONES_FOR_CONGRESS_PUBLIC.contact.addressUrl ?? null,
  }))

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [socialRes, contactRes, sloganRes] = await Promise.all([
          supabase
            .from('campaign_social_links')
            .select('platform,label,url')
            .eq('campaign_slug', SLUG)
            .order('created_at', { ascending: true })
            .limit(12),
          supabase
            .from('campaign_contact_points')
            .select('label,value,url,kind')
            .eq('campaign_slug', SLUG)
            .order('created_at', { ascending: true })
            .limit(12),
          supabase
            .from('campaign_messages')
            .select('message_text')
            .eq('campaign_slug', SLUG)
            .eq('message_kind', 'slogan')
            .order('sort_order', { ascending: true })
            .limit(1),
        ])

        if (cancelled) return

        const socialRows = (socialRes.data ?? []) as {
          platform: string
          label: string
          url: string
        }[]
        const social =
          socialRows.length > 0
            ? socialRows.map((r) => ({
                platform: r.platform,
                label: r.label,
                url: r.url,
              }))
            : CHRIS_JONES_FOR_CONGRESS_PUBLIC.social

        const contactRows = (contactRes.data ?? []) as {
          label: string
          value: string
          url: string | null
          kind: string
        }[]
        const mailing = contactRows.find(
          (c) =>
            /box|mail|address|p\.?o\.?|contact/i.test(c.label) ||
            /box|mailing/i.test(c.value),
        )
        const contactLabel =
          mailing?.value?.trim() ??
          mailing?.label ??
          CHRIS_JONES_FOR_CONGRESS_PUBLIC.contact.addressLabel ??
          null
        const contactUrl =
          mailing?.url ?? CHRIS_JONES_FOR_CONGRESS_PUBLIC.contact.addressUrl ?? null

        const sloganRow = (sloganRes.data?.[0] ?? null) as
          | { message_text?: string }
          | null
        const slogan =
          sloganRow?.message_text?.trim() || CHRIS_JONES_FOR_CONGRESS_PUBLIC.slogan

        setData({ slogan, social, contactLabel, contactUrl })
      } catch {
        /* keep fallback */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return data
}
