# Campaign API keys — what they are and how to use them in CampaignOS

**Security:** Treat every key below as **server-only**. Call these APIs from **Netlify Functions** (or Supabase Edge Functions), not from the React app. Never prefix them with `VITE_`.

## Header: “public officials” for a matched volunteer

Your dashboard already has **precinct, county, and districts** from the voter file. To add **named officeholders** (who holds each seat today):

| Priority | Key / API | Why |
|----------|-----------|-----|
| 1 | **Google Civic Information API** (`GOOGLE_CIVIC_API_KEY`) | `representativeInfoByAddress` and related endpoints return **current office holders** tied to an address or OCD division ID. Best single call for “who represents this voter” at multiple levels when you have street/city/ZIP. |
| 2 | **Open States** (`OPENSTATES_API_KEY`) | Strong for **state legislators**, bills, and session data. Use **district numbers you already store** (state house/senate) to resolve people and committees. |
| 3 | **Congress.gov** (`CONGRESS_GOV_API_KEY`) | Authoritative **U.S. House/Senate** member and bill metadata. Pair with stored **congressional district** from the voter row. |

**OpenFEC** (optional, via `API_DOT_GOV_KEY` on many setups) can add **campaign finance** context; it is not required to show “who is my rep.”

## Per-key reference

### `GOOGLE_CIVIC_API_KEY` — Google Civic Information API

- **What it is:** Google’s election and civics data API (divisions, contests, **elected officials** for an address).
- **Use here:** Server route: accept voter address or `{ lat, lng }` + stored OCD IDs → return normalized list for the **dashboard header** and volunteer briefing.
- **Notes:** Separate from “Maps Platform” billing; enable the **Civic Information API** in Google Cloud and restrict the key by API + IP (Netlify egress) where possible.

### `GOOGLE_API_KEY` — Google Cloud (general)

- **What it is:** A generic Google API key (often **Maps JavaScript**, **Geocoding**, **Places**, etc., depending on which APIs you enable).
- **Use here:** **Geocode** volunteer addresses for Civic/OpenCage fallbacks; **Places** for event/staging locations; **not** a substitute for the Civic key for representative lookups.
- **Notes:** Lock down key to only the products you enable; consider a **second** key restricted to Geocoding vs Maps JS.

### `OPENCAGE_API_KEY` — OpenCage Geocoder

- **What it is:** Forward/reverse geocoding (address ↔ coordinates).
- **Use here:** Normalize messy addresses before Civic calls; offline-friendly alternative to Google Geocoding; batch geocode for data prep scripts.
- **Notes:** Good privacy/geography fit; does not return elected officials by itself.

### `API_DOT_GOV_KEY` — api.data.gov

- **What it is:** A **shared API key** that registers you for many U.S. government datasets exposed through data.gov gateways (each service may still have its own docs and paths).
- **Use here:** **FEC Open API** (campaign finance), **some** agency feeds; use the specific service documentation after signup.
- **Notes:** Not one “government API”; plan per downstream API (FEC, etc.).

### `OPENSTATES_API_KEY` — Open States (Plural)

- **What it is:** State legislatures: **people**, districts, bills, votes, committees (coverage varies by state).
- **Use here:** Map **AR state house/senate districts** from `raw_vr` to **current legislators**; manager dashboards for bill tracking.
- **Notes:** Complements Civic; essential for **state capitol** depth.

### `FOURSQUARE_API_KEY` — Foursquare Places

- **What it is:** POI / venue search and details.
- **Use here:** **Field ops**: staging areas, offices, parking, event venues; less central to “who is my elected official.”
- **Notes:** Optional “campaign OS” layer for logistics, not compliance core.

### `NEWSAPI_API_KEY` — NewsAPI.org

- **What it is:** Aggregated news headlines and search from many outlets (licensing limits apply).
- **Use here:** **Rapid response** / press monitoring for managers; digest widgets; not for redistributing full article text without license.
- **Notes:** Good for alerts; pair with human review.

### `GUARDIAN_API_KEY` — The Guardian Open Platform

- **What it is:** Search and retrieve Guardian content metadata (and content per their terms).
- **Use here:** Supplemental **news** angle, especially international/long-form; secondary to NewsAPI for U.S. House races depending on coverage.
- **Notes:** Respect rate limits and attribution.

### `CONGRESS_GOV_API_KEY` — Congress.gov API (v3)

- **What it is:** Official Library of Congress API: **members**, bills, amendments, committees, nominations.
- **Use here:** **Federal** layer in the header (member name, photo URL patterns, bill trackers for managers); link out to congress.gov.
- **Notes:** Pair with district number; rate limits apply—cache responses server-side.

## Suggested architecture (later builds)

1. **Netlify Function** `civic-context` (or similar): reads Supabase session, loads `campaign_profiles` + matched districts, calls Civic + Open States + Congress.gov with **server keys**, returns one JSON for the header.
2. **Cache** results in Postgres (`profile_civic_cache` with TTL) to respect quotas.
3. **Volunteer UI** shows read-only summary; **manager UI** adds bill/news panels using the same backend.

## Keys in `.env.example` (quick map)

| Variable | Role |
|----------|------|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Browser Supabase client (RLS-scoped). **Not** secret in the same way as service role — still don’t commit prod abuse. |
| `VITE_ENABLE_DEV_AUTH_BYPASS` | Local-only fake sign-in for UI work. **Never** in production. |
| `VITE_DEV_MOCK_DASHBOARD_STATE` | Dev bypass: which dashboard fixture to show. |
| `VITE_NETLIFY_FUNCTIONS_ORIGIN` | When the UI runs on Vite alone (`npm run dev`), base URL for Netlify functions (e.g. `http://localhost:8888` while `netlify dev` runs). |
| `OPENAI_API_KEY` | Server-side LLM (e.g. Agent Jones Netlify function). Never `VITE_`. |
| `GOOGLE_CIVIC_API_KEY` | **Elected officials** for an address (`representatives` API) — used by `public-officials` function. |
| `GOOGLE_API_KEY` | Maps / Geocoding / Places (depending on enabled APIs). |
| `OPENCAGE_API_KEY` | Geocoding alternative. |
| `API_DOT_GOV_KEY` | data.gov gateway key for APIs like OpenFEC (per-service docs). |
| `OPENSTATES_API_KEY` | State legislators, bills (future enrichment). |
| `FOURSQUARE_API_KEY` | Venues / field ops (optional). |
| `NEWSAPI_API_KEY` | Headlines / search (optional monitoring). |
| `GUARDIAN_API_KEY` | Guardian Open Platform (optional news). |
| `CONGRESS_GOV_API_KEY` | Congress.gov member and bill metadata (optional federal layer). |
| `SENDGRID_API_KEY` | Transactional email from Netlify/Edge (invites, alerts). |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | SMS/voice (2FA, reminders) — server-only. |
| `GITHUB_PAT` | Automation against your repo (CI, scripts) — not required for civics UI. |
| `NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID` | CLI / deploy automation; optional for local app behavior. |

### `OPENAI_API_KEY`

- **What it is:** Access to OpenAI (or compatible) chat/completions used in **Netlify Functions**.
- **Use here:** Agent Jones (`agent-jones`) and **Agent Jones voice** (`agent-jones-transcribe` → Audio Transcriptions API). Same key for both.
- **Notes:** Keep off the client; rotate if leaked.

### `OPENAI_TRANSCRIPTION_MODEL` (optional)

- **What it is:** Model id for `/.netlify/functions/agent-jones-transcribe` (default **`whisper-1`**).
- **Use here:** Only if your OpenAI project uses a different transcription model name.

### `SENDGRID_API_KEY`

- **What it is:** SendGrid HTTP API for outbound email.
- **Use here:** Welcome mail, recruitment invites, coordinator alerts — call from a function, not the browser.
- **Notes:** Domain authentication (SPF/DKIM) required for deliverability.

### `TWILIO_*`

- **What they are:** Twilio REST credentials and sender number for SMS (and optionally voice).
- **Use here:** Opt-in texts, verification codes, field reminders.
- **Notes:** TCPA/consent rules apply; never expose `TWILIO_AUTH_TOKEN` to the client.

### `GITHUB_PAT`

- **What it is:** Personal access token for GitHub API (repo, Actions, etc.).
- **Use here:** Optional scripts or CI that open PRs, read checks, or manage issues — not part of the volunteer dashboard.

### `NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID`

- **What they are:** Netlify CLI / API identifiers for deploys and site configuration.
- **Use here:** Local or CI deploy pipelines; the running app does not need them for civics features.

## Dashboard: public officials

With **`GOOGLE_CIVIC_API_KEY`** set on Netlify (and locally for `netlify dev`), the dashboard **`PublicOfficialsCard`** calls **`/.netlify/functions/public-officials`**, which queries Google’s **`representatives`** endpoint using the matched voter’s **city, state, and ZIP**. No street address is sent unless you extend the payload later.

## Storing keys locally

Run:

```bash
npm run ingest:api-keys
```

Or merge a file of `KEY=value` lines:

```bash
node scripts/ingest-api-keys.mjs --merge ./my-keys.env
```

Keys are written to **`.env`** (gitignored). Mirror them in **Netlify** / CI as secrets for production functions.
