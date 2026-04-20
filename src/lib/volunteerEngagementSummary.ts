/**
 * Engagement scoring + supportive categories from recent events.
 */

import type { EngagementCategory, VolunteerEngagementSummary } from './volunteerRecommendationSchemas'
import { fetchEngagementEventsForVolunteer } from './volunteerEngagementTracker'

const WINDOW_DAYS = 30

function scoreFromEvents(
  rows: Array<{ event_type: string; metadata_json: Record<string, unknown> }>,
): number {
  let s = 50
  for (const r of rows) {
    switch (r.event_type) {
      case 'claimed_opportunity':
        s += 12
        break
      case 'completed_assignment':
        s += 10
        break
      case 'saved_opportunity':
        s += 5
        break
      case 'opened_opportunity_detail':
        s += 3
        break
      case 'viewed_recommended_opportunity':
      case 'clicked_recommendation':
        s += 2
        break
      case 'ignored_opportunity':
      case 'dismissed_recommendation':
        s -= 2
        break
      case 'missed_shift':
        s -= 8
        break
      default:
        break
    }
  }
  return Math.max(0, Math.min(100, s))
}

function categoryFromScore(score: number, recentClaims: number, recentIgnores: number): EngagementCategory {
  if (score >= 78) return 'highly_active'
  if (score >= 62 && recentClaims > 0) return 'warming_up'
  if (score >= 45) return 'steady'
  if (recentIgnores > 8 && recentClaims === 0) return 'drifting'
  if (score < 30) return 'inactive'
  return 'steady'
}

function computeEngagementTrend(rows: Array<{ created_at: string; event_type: string }>): 'up' | 'flat' | 'down' {
  const mid = Math.floor(rows.length / 2)
  const older = rows.slice(mid)
  const newer = rows.slice(0, mid)
  const score = (ev: typeof rows) =>
    ev.filter((e) =>
      ['claimed_opportunity', 'saved_opportunity', 'opened_opportunity_detail'].includes(e.event_type),
    ).length
  const a = score(older)
  const b = score(newer)
  if (b > a + 1) return 'up'
  if (b + 1 < a) return 'down'
  return 'flat'
}

export async function buildVolunteerEngagementSummary(volunteerId: string): Promise<VolunteerEngagementSummary> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString()
  const rows = await fetchEngagementEventsForVolunteer(volunteerId, since)
  const engagementScore = scoreFromEvents(rows)
  const recentClaims = rows.filter((r) => r.event_type === 'claimed_opportunity').length
  const recentIgnores = rows.filter((r) =>
    ['ignored_opportunity', 'dismissed_recommendation'].includes(r.event_type),
  ).length
  const engagementCategory = categoryFromScore(engagementScore, recentClaims, recentIgnores)
  const trendDirection = computeEngagementTrend(rows)

  const themes = new Set<string>()
  for (const r of rows) {
    const slug = r.metadata_json?.role_slug
    if (typeof slug === 'string' && slug) themes.add(slug)
  }

  let actionRecommendation = 'Keep browsing opportunities that match your availability.'
  if (engagementCategory === 'drifting' || engagementCategory === 'inactive') {
    actionRecommendation = 'A short check-in with your coordinator can surface lighter ways to help.'
  } else if (engagementCategory === 'highly_active') {
    actionRecommendation = 'You are carrying a lot — consider pacing and backup roles where possible.'
  } else if (engagementCategory === 'warming_up') {
    actionRecommendation = 'Great momentum — save a couple of shifts that fit your calendar.'
  }

  return {
    volunteerId,
    engagementScore,
    engagementCategory,
    trendDirection,
    topInterestThemes: [...themes].slice(0, 6),
    actionRecommendation,
    windowDays: WINDOW_DAYS,
    eventsInWindow: rows.length,
  }
}

export function calculateVolunteerEngagementScore(
  rows: Array<{ event_type: string; metadata_json: Record<string, unknown> }>,
): number {
  return scoreFromEvents(rows)
}

export function getVolunteerEngagementTrend(
  rows: Array<{ created_at: string; event_type: string }>,
): 'up' | 'flat' | 'down' {
  return computeEngagementTrend(rows)
}

export function detectVolunteerDriftRisk(summary: VolunteerEngagementSummary): boolean {
  return summary.engagementCategory === 'drifting' || summary.engagementCategory === 'inactive'
}

export function detectVolunteerReadinessForMoreResponsibility(summary: VolunteerEngagementSummary): boolean {
  return summary.engagementCategory === 'highly_active' && summary.trendDirection !== 'down'
}
