# Onboarding source documents

Place canonical campaign files here (git-tracked or local-only per your policy):

| File | Purpose |
|------|---------|
| `Volunteer Welcome Kit.md` | Culture, voice, messaging, escalation — drives `campaign_onboarding_*` and `volunteer_talk_tracks` seeds. |
| `Vol organization (2).pptx` | Lanes, objectives, accountability — drives `volunteer_lanes` and related seeds; export notes or re-ingest when slides change. |

After updating files, adjust rows in Supabase (SQL) or add an ingestion script that maps sections to:

- `campaign_onboarding_modules` / `campaign_onboarding_sections`
- `volunteer_lanes` / `volunteer_first_actions`
- `campaign_values`, `volunteer_talk_tracks`, etc.

Registry rows live in `campaign_onboarding_documents` (see migration `20260424100001_onboarding_welcome_kit_seed.sql`).
