# CampaignOS

Vite + React + TypeScript campaign app with Supabase. This repo is set up for **local development**, **GitHub** as source of truth, and **Netlify** for production and **branch deploy previews**.

## Security: API keys

- **`VITE_*` variables are compiled into the browser bundle.** Only put **public** values there (e.g. Supabase **anon** key with RLS), never service-role keys.
- **`OPENAI_API_KEY` must stay server-side only.** Do not prefix it with `VITE_` and do not read it from React. Use **Netlify Functions** (or another backend) when you add OpenAI. Netlify defines secrets in the [site environment](https://docs.netlify.com/environment-variables/overview/), not in git.

## Prerequisites

- Node.js 20+ (matches Netlify `NODE_VERSION` in `netlify.toml`)
- npm
- A Supabase project (URL + anon key)
- Optional: [Supabase CLI](https://supabase.com/docs/guides/cli) for `db push`, and [Netlify CLI](https://docs.netlify.com/cli/get-started/) for `netlify dev` (functions + frontend)

## Stack from the bottom (migrations → env → verify → launch)

1. **Database** — Apply SQL in `supabase/migrations/` in filename order (see `supabase/README.md`). With the CLI: `npx supabase@latest link --project-ref <ref>` then `npx supabase@latest db push`. Optional dev rows: edit `supabase/seed.sql`, then `supabase db reset` (local stack only) or run seed SQL manually.
2. **Environment** — `npm run setup:env` (or copy `.env.example` → `.env`), then `npm run check:env`.
3. **One-shot lift** — `npm run launch` runs `npm install`, `check:env`, `lint`, `build`, and prints migration order + run commands.
4. **Run the app** — `npm run dev` (Vite only) or `netlify dev` (site + functions). If the app runs on Vite alone, set `VITE_NETLIFY_FUNCTIONS_ORIGIN` (e.g. `http://localhost:8888`) so Agent Jones can reach functions.

Working against the **live** Supabase project is normal: use the same project URL/anon key in `.env` as in production, and rely on **RLS** so the anon key remains safe.

## Local setup (quick path)

1. Clone the repo (when hosted on GitHub):

   ```bash
   git clone https://github.com/YOUR_ORG/CampaignOS.git
   cd CampaignOS
   ```

2. **Bootstrap** (install + env check):

   ```bash
   npm run bootstrap
   ```

   Or step-by-step: `npm install` → create `.env` (`npm run setup:env` or `cp .env.example .env`) → `npm run check:env`.

3. Start the dev server:

   ```bash
   npm run dev
   ```

## GitHub workflow

1. **Default branch** (e.g. `main`) is protected source of truth; merge via PR when you add branch rules.
2. **Feature branches**: `git checkout -b feature/short-description` → commit → push → open PR.
3. Do **not** commit `.env`, exports, or PEM files; they are listed in `.gitignore`.

## Netlify deployment

1. In [Netlify](https://www.netlify.com/), **Add new site** → **Import an existing project** → connect the **GitHub** repo `CampaignOS`.
2. Netlify reads **`netlify.toml`**: build command `npm run build`, publish directory **`dist`**.
3. In **Site configuration → Environment variables**, add at least:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`  
   (Same names as local `.env`; they are injected at **build** time for Vite.)

4. When you add server features (OpenAI, SendGrid, Twilio), set those keys in Netlify as secrets for **Functions** only — still **never** `VITE_OPENAI_*`.

### Branch deploy previews

With GitHub connected, Netlify **automatically builds deploy previews** for pull requests. No extra `netlify.toml` flags are required for that behavior.

### Optional: push env vars from local `.env` to Netlify

If the [Netlify CLI](https://docs.netlify.com/cli/get-started/) is installed and the repo is **`netlify link`**ed:

```bash
npm run netlify:env:push
```

You must type `YES` to confirm. Prefer setting sensitive values directly in the Netlify UI for production.

## Project scripts

| Script | Purpose |
|--------|---------|
| `npm run setup:env` | Interactive `.env` bootstrap |
| `npm run check:env` | Validate env (required client vars) |
| `npm run bootstrap` | `npm install` + `check:env` |
| `npm run verify` | `lint` + production `build` |
| `npm run db:list` | Print `supabase/migrations` apply order |
| `npm run launch` | Install, env check, lint, build, then print DB + run hints |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run netlify:env:push` | Optional CLI import to Netlify site |

## Netlify Functions

`netlify.toml` sets `[functions] directory = "netlify/functions"`. **`agent-jones`** calls OpenAI server-side (`OPENAI_API_KEY` on Netlify, never `VITE_*`). Keep other secrets in Functions or server-only env, not in the client bundle.
