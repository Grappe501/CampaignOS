# Cursor Master Script #5 — Self-Driving Automation Layer (Operational Orchestration Engine)

_Spec archived from master script. Implementation see `reports/self-driving-automation-audit.md` and `src/lib/automation*.ts`._

## Purpose

Build the **Self-Driving Automation Layer** as the orchestration engine for CampaignOS: detect conditions, queue auditable actions, route interventions, and surface bounded context to Agent Jones — **deterministic rules first**, AI advisory only, no silent protected writes.

## Safety

- Observe, classify, score, recommend, queue, pre-fill, escalate — yes.
- Bypass RLS, silent strategic rewrites, unapproved external sends — no.

## Recommended next script

**Cursor Master Script #6 — Polling Place / GOTV Command Layer**
