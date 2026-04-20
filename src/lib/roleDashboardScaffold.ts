/**
 * Scaffold-only notes for role dashboards (intern, candidate, volunteer coordinator).
 * Replace with real modules, hooks, and copy as you implement today — not product spec.
 */

/** Dev checklist — intern UX ships in-app; keep ops/RPC docs in migrations or runbooks. */
export const INTERN_DASHBOARD_SCAFFOLD_SECTIONS = [
  'Shipped: `InternDeskContent` on dashboard + `/intern` (same shell, scroll + route hint)',
  'Shipped: Queue + mission tasks wired to `useInternLayer` / `useVolunteerTasks` + existing RPCs',
  'Ops: RLS + RPC contracts live in `supabase/migrations` (e.g. intern layer) — not duplicated here',
] as const

/** Dev checklist — `/candidate` strategic dashboard ships; external approvals stay out-of-app. */
export const CANDIDATE_DASHBOARD_SCAFFOLD_SECTIONS = [
  'Shipped: election clock + phase narrative (`campaignClock` + `candidateDeskNarrative`)',
  'Shipped: KPI snapshot + leadership scaffold when role is principal/HQ (`isCampaignLeadershipRole` includes candidate)',
  'Shipped: ops deep-links (/coordinator, /intern, /dashboard) — no fabricated org metrics',
  'Out of scope: legal/finance approval storage — HQ workflow only',
] as const

/** Dev checklist — coordinator UI ships at `/coordinator`; org-wide exception inbox still backend TBD. */
export const COORDINATOR_DASHBOARD_SCAFFOLD_SECTIONS = [
  'Shipped: `/coordinator` — supervisor mission board, intern overview RPC, activation counts, KPIs',
  'Backend gap: roster exception queue (RLS limits cross-profile reads; document ops path)',
  'Shipped: Nudge / Block on assignments via existing supervisor RPCs',
] as const
