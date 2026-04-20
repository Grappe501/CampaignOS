# Supabase (CampaignOS)

## Migration order

Apply SQL in `migrations/` sorted by filename (timestamp prefix):

1. `20260418100000_core_campaign_profiles_and_raw_vr.sql` — `campaign_profiles`, `raw_vr` shell, RLS, auth trigger  
2. `20260419120000_voter_match_layer.sql` — voter RPCs + `voter_match_links`  
3. `20260420140000_onboarding_branch_exception.sql` — onboarding / exception columns  
4. `20260420180000_workspace_tasks_training.sql` — workspace task/training catalog + per-profile progress + seed + trigger  

**Hosted project:** Supabase Dashboard → SQL Editor (paste each file), or CLI:

```bash
npx supabase@latest link --project-ref YOUR_PROJECT_REF
npx supabase@latest db push
```

**Local Docker stack (optional):**

```bash
npx supabase@latest start
npx supabase@latest db reset
```

## Seeds

`seed.sql` is wired in `config.toml`. Uncomment inserts there for local test rows; avoid real voter PII.

## Auth trigger

`handle_new_campaign_profile` inserts into `campaign_profiles` when a row appears in `auth.users`. If login succeeds but no profile row appears, confirm this trigger exists and ran (and that RLS allows the definer insert).
