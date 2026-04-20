# Supabase (CampaignOS)

## Migration order

Supabase applies every file in `migrations/` in **lexicographic (filename) order**. Do not cherry-pick a subset unless you know the dependency chain.

**Gotchas:**

- **`20260429170000_adaptive_daily_activation.sql`** alters `daily_task_templates` / `daily_tasks` and functions that use **`user_scores`**. It must run **after** `20260429160000_daily_activation_engine.sql`. (An older copy used timestamp `20260420120000` and failed on fresh DBs because those tables did not exist yet.)
- **Same second:** `20260420140000_intern_layer_system.sql` runs before `20260420140000_onboarding_branch_exception.sql` (alphabetical order).

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
