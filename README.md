# CampaignOS

Vite + React + TypeScript campaign app with Supabase. This repo is set up for **local development**, **GitHub** as source of truth, and **Netlify** for production and **branch deploy previews**.

## Security: API keys

- **`VITE_*` variables are compiled into the browser bundle.** Only put **public** values there (e.g. Supabase **anon** key with RLS), never service-role keys.
- **`OPENAI_API_KEY` must stay server-side only.** Do not prefix it with `VITE_` and do not read it from React. Use **Netlify Functions** (or another backend) when you add OpenAI. Netlify defines secrets in the [site environment](https://docs.netlify.com/environment-variables/overview/), not in git.

## Prerequisites

- Node.js 20+ (matches Netlify `NODE_VERSION` in `netlify.toml`)
- npm
- A Supabase project (URL + anon key)

## Local setup

1. Clone the repo (when hosted on GitHub):

   ```bash
   git clone https://github.com/YOUR_ORG/CampaignOS.git
   cd CampaignOS
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a local `.env` from prompts (values are **not** printed back in full after save):

   ```bash
   npm run setup:env
   ```

   Or copy manually:

   ```bash
   cp .env.example .env
   ```

4. Verify required variables (fails if Supabase client vars are missing or still placeholders):

   ```bash
   npm run check:env
   ```

5. Start the dev server:

   ```bash
   npm run dev
   ```

Working against the **live** Supabase project is normal: use the same project URL/anon key in `.env` as in production, and rely on **RLS** so the anon key remains safe.

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

| Script            | Purpose                                      |
|-------------------|----------------------------------------------|
| `npm run setup:env` | Interactive `.env` bootstrap               |
| `npm run check:env` | Validate env (required client vars)        |
| `npm run dev`     | Vite dev server                               |
| `npm run build`   | Typecheck + production build → `dist/`       |
| `npm run netlify:env:push` | Optional CLI import to Netlify site   |

## Netlify Functions (future)

`netlify.toml` sets `[functions] directory = "netlify/functions"`. Add server handlers there when needed; keep OpenAI and other secrets in server code + Netlify env, not in the client.
