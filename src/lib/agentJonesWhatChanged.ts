/**
 * Lightweight deterministic “what changed” lines from operating `signal_epoch`
 * fingerprints (pipe-separated). Not a full audit log.
 */

function num(s: string | undefined): number {
  if (s === undefined || s === '') return 0
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : 0
}

function laneRank(s: string | undefined): number {
  if (!s || s === 'na') return 0
  if (s === 'healthy') return 1
  if (s === 'watch') return 2
  if (s === 'urgent') return 3
  return 0
}

export function operatingFingerprintDeltaLines(
  prevFingerprint: string,
  nextFingerprint: string,
): string[] {
  if (prevFingerprint === nextFingerprint) return []
  const p = prevFingerprint.split('|')
  const n = nextFingerprint.split('|')
  const lines: string[] = []

  if (p[3] !== n[3]) {
    const now = n[3] ?? ''
    const was = p[3] ?? ''
    if (
      (now === 'pending' || now.includes('pending')) &&
      was !== 'pending' &&
      !was.includes('pending')
    ) {
      lines.push(
        'New roster exception is pending review — voter-gated work should stay off until coordinators update status.',
      )
    } else {
      lines.push('Exception / roster status changed — re-check voter-gated work before executing.')
    }
  }

  if (p[2] !== n[2]) {
    lines.push(`Volunteer progress slice changed (${p[2] ?? '?'} → ${n[2] ?? '?'}).`)
  }

  const ka = num(p[7])
  const kb = num(n[7])
  if (ka !== kb) {
    if (kb > ka) {
      lines.push(`KPI pressure worsened — lanes under half of target (${ka} → ${kb}).`)
    } else {
      lines.push(`KPI pressure eased — lanes under half of target (${ka} → ${kb}).`)
    }
  }

  const supervisedPairs: [number, string][] = [
    [4, 'Supervised blocked assignments'],
    [5, 'Supervised overdue assignments'],
    [6, 'Stalled mission tasks'],
  ]
  for (const [idx, label] of supervisedPairs) {
    const a = num(p[idx])
    const b = num(n[idx])
    if (a !== b) {
      if (b > a) lines.push(`${label} worsened (${a} → ${b}).`)
      else if (b < a) lines.push(`${label} eased (${a} → ${b}).`)
    }
  }

  const countPairs: [number, string][] = [
    [8, 'Intern first-contact overdue (visible)'],
    [9, 'Intern pipelines escalated'],
    [10, 'Active mission rows visible'],
  ]
  for (const [idx, label] of countPairs) {
    const a = num(p[idx])
    const b = num(n[idx])
    if (a !== b) {
      if (b > a) lines.push(`${label} increased (${a} → ${b}).`)
      else if (b < a) lines.push(`${label} decreased (${a} → ${b}).`)
    }
  }

  const d0 = num(p[11])
  const d1 = num(n[11])
  const t0 = num(p[12])
  const t1 = num(n[12])
  if (t0 > 0 && t1 > 0 && d0 !== d1) {
    lines.push(`Daily activation progress changed (${d0}/${t0} → ${d1}/${t1} complete).`)
  }

  if (p.length >= 19 && n.length >= 19) {
    const aW = num(p[17])
    const bW = num(n[17])
    if (aW !== bW) {
      if (bW > aW) {
        lines.push(`Timing pressure up — more in the visible ~7d assignment window (${aW} → ${bW}).`)
      } else {
        lines.push(`Timing pressure eased in the visible ~7d window (${aW} → ${bW}).`)
      }
    }
    const dk0 = p[18] ?? ''
    const dk1 = n[18] ?? ''
    if (dk0 !== dk1 && (dk0 || dk1)) {
      lines.push('Soonest visible assignment due date moved on the board.')
    }
  }

  const laneLabels = [
    'Volunteer lane',
    'Intern lane',
    'Coordinator lane',
    'Leadership lane',
  ] as const
  if (p.length >= 17 && n.length >= 17) {
    for (let i = 0; i < 4; i++) {
      const a = p[13 + i]
      const b = n[13 + i]
      if (a !== b && a && b) {
        const ra = laneRank(a)
        const rb = laneRank(b)
        if (rb > ra) {
          lines.push(`${laneLabels[i]} worsened (${a} → ${b}).`)
        } else if (rb < ra) {
          lines.push(`${laneLabels[i]} improved (${a} → ${b}).`)
        }
      }
    }
  }

  if (p[0] !== n[0] || p[1] !== n[1]) {
    lines.push('Desk or role context changed — re-ground using the mode strip above.')
  }

  return lines.slice(0, 5)
}
