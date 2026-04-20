# Voice input/output — current repo state & v2 upgrade plan

## Update — Agent Jones OpenAI STT (implemented)

- **Netlify:** `netlify/functions/agent-jones-transcribe.ts` — JSON `{ audioBase64, mimeType }` → OpenAI `/v1/audio/transcriptions`.
- **Client:** `src/lib/api/agentJonesTranscribe.ts`, `src/hooks/useAgentJonesVoiceRecorder.ts`, push-to-talk on **`AgentJonesPanel`** (floating panel included).
- **Env:** `OPENAI_API_KEY` (required); optional `OPENAI_TRANSCRIPTION_MODEL` (default `whisper-1`).
- **Local:** Run `netlify dev` and set `VITE_NETLIFY_FUNCTIONS_ORIGIN` so the browser can reach the transcribe function.

---

## What existed before this pass (historical findings)

### Speech-to-text (STT) — was **not implemented**

- No `SpeechRecognition` / `webkitSpeechRecognition`, `MediaRecorder`, or upload-to-transcribe flows in `src/`.
- No Whisper (or other) transcription calls in `netlify/functions/` (confirmed: `agent-jones.ts` has no audio/transcribe paths).

### Text-to-speech (TTS) — **not implemented**

- No `speechSynthesis` / `SpeechSynthesisUtterance` usage in the client.
- No server-side TTS (Polly, ElevenLabs, OpenAI `audio/speech`, etc.) wired in Netlify functions.

### Adjacent / misleading hits (“voice” in the repo)

| Area | What it actually is |
|------|---------------------|
| Copy / onboarding | Metaphorical “your voice” (messaging, volunteer tone) — not audio. |
| `docs/campaign-api-keys.md` | Twilio listed for **SMS / optional voice telephony** (ops), not in-app STT/TTS. |
| `public-officials.ts` | Classifies contact types; `"voice"` / `"phone"` mean **phone numbers**, not speech UI. |
| **Agent Jones** | **Text-only** assistant: browser sends context + user text to `netlify/functions/agent-jones.ts`, OpenAI text model returns text (`src/lib/api/agentJones.ts`, `AgentJonesPanel.tsx`). |

**Bottom line:** CampaignOS has **no productized voice I/O layer** yet. Any v2 pass is effectively **greenfield** on top of existing **text** Agent Jones and the volunteer shell.

---

## Version 2 — goals (suggested)

1. **Hands-free / accessibility:** speak prompts to Agent Jones (and optionally hear replies).
2. **Consistent UX:** one pattern for mic + speaker controls, permissions, errors, and offline/disabled states.
3. **Privacy & compliance:** voter/PII never sent to STT without explicit UX; campaign-approved retention for audio blobs (if any).
4. **Fallbacks:** keyboard/text always available; graceful degradation when browser or server audio fails.

---

## Architecture options (pick one primary stack)

### A. Browser-native (fastest MVP, uneven quality)

- **STT:** Web Speech API (Chrome/Safari variance, requires HTTPS).
- **TTS:** `speechSynthesis` (free, robotic; voice selection limited).

**Pros:** No extra API cost, no audio upload. **Cons:** Safari/iOS quirks, weak control, not ideal for “big v2” quality.

### B. OpenAI-aligned (fits current Agent Jones server)

- **STT:** Server endpoint accepts audio → **Whisper** (or `gpt-4o-transcribe`-class) → text → existing Agent Jones text pipeline.
- **TTS:** New Netlify function **or** same function with mode: `audio/speech` (TTS) streaming or buffered MP3 to client.

**Pros:** One vendor, good quality, keeps secrets server-side. **Cons:** cost/latency; need upload size limits and rate limiting.

### C. Hybrid

- **STT:** Browser for instant draft + optional “improve with server” pass.
- **TTS:** Server-only for consistent brand voice (optional later).

---

## Recommended v2 shape (phased “big pass”)

### Phase 0 — Design & policy (short)

- Define **where** voice is allowed: Agent Jones only vs. also task notes, intern pipeline notes, etc.
- **Data policy:** no recording storage by default; if storing, migration + RLS + retention doc.
- **Accessibility:** WCAG-minded controls (visible focus, captions for TTS text, don’t rely on color alone).

### Phase 1 — Client “voice shell” (no new AI behavior yet)

- New module e.g. `src/voice/` or `src/lib/voice/`:
  - `VoicePermissionGate`, `PushToTalkButton`, `VoiceStatusBar` (idle / listening / processing / error).
  - Feature flag: `VITE_VOICE_V2_ENABLED` (or remote flag later).
- **STT output = plain text** fed into existing Agent Jones input field (or programmatic `send`), so chat logic stays unchanged.

### Phase 2 — Server STT (+ optional TTS)

- New Netlify function `voice-transcribe.ts` (or extend `agent-jones.ts` with `multipart` + `action=transcribe`):
  - Validate auth (Supabase JWT or session pattern you use elsewhere).
  - Enforce **max duration / file size**; strip or reject silent uploads.
  - Return `{ text }` only; no long-term storage unless explicitly Phase 3.
- Optional: `voice-speak.ts` returning audio bytes or URL; client plays via `Audio` element.

### Phase 3 — Agent Jones “voice mode” UX

- **Barge-in:** stop TTS when user starts STT.
- **Streaming:** optional partial transcripts (harder; defer unless required).
- **Context:** reuse `buildAgentJonesContextV2` — same JSON as text path; only the **user message** source changes (mic vs keyboard).

### Phase 4 — Hardening

- Rate limits (Netlify + app), abuse monitoring, cost caps.
- E2E checklist: Chrome desktop, Safari iOS, Firefox (if Web STT fallback differs).
- **Twilio:** only integrate if product needs **phone** outbound/inbound; keep separate from in-app voice assistant unless explicitly converging.

---

## Integration map (after v2)

```
[Mic] → (optional client STT) → [Server STT] → text
  text → existing callAgentJones / agent-jones.ts (unchanged contract)
  reply text → [optional TTS] → [Audio playback]
```

---

## Files likely touched in implementation

| Layer | Files / areas |
|-------|----------------|
| UI | `AgentJonesPanel.tsx`, `FloatingAgentJones.tsx`, new voice components |
| API client | `src/lib/api/agentJones.ts` (if unified endpoint) or new `src/lib/api/voice.ts` |
| Server | `netlify/functions/agent-jones.ts` or new `voice-transcribe.ts`, `voice-tts.ts` |
| Config | `.env` / Netlify: model IDs, max upload, feature flags |
| Docs | `docs/campaign-api-keys.md`, compliance notice if recording |

---

## Success criteria (v2 exit)

- User can complete a **full Agent Jones turn** using only voice (with text fallback).
- No secrets in `VITE_*` for STT/TTS.
- Clear user messaging when mic is denied or STT fails.
- Lint/build green; basic manual test script documented in this file or `README`.

---

_Last audited against repo: codebase search for speech/audio/STT/TTS and `agent-jones.ts` audio paths — none present._
