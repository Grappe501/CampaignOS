import type { ReactElement } from 'react'
import type { WorkspaceSectionGlyphId } from './workspaceDockModel'

type SizeProps = { size?: number }

function IconTop({ size = 22 }: SizeProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <circle cx="16" cy="14" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 26c2.5-4 6.5-6 8-6s5.5 2 8 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconNextStep({ size = 22 }: SizeProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <path
        d="M6 22V10l8 6 8-6v12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10 18l6 4 6-4" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function IconSpark({ size = 22 }: SizeProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <path
        d="M16 4l1.8 6.2L24 12l-6.2 1.8L16 20l-1.8-6.2L8 12l6.2-1.8L16 4z"
        fill="currentColor"
        opacity="0.92"
      />
    </svg>
  )
}

function IconBranch({ size = 22 }: SizeProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <path
        d="M16 6v8M16 14c-4 0-7 2.5-7 7v5M16 14c4 0 7 2.5 7 7v5M9 26h4M19 26h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconBallot({ size = 22 }: SizeProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <rect
        x="9"
        y="5"
        width="14"
        height="22"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M12 11h8M12 16h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function IconSnapshot({ size = 22 }: SizeProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <rect x="5" y="7" width="22" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 20l4-4 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconCapitol({ size = 22 }: SizeProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <path
        d="M16 4l3 4v3h-6V8l3-4zm-9 9h18v15H7V13zm3 6h4v6h-4v-6zm6 0h4v6h-4v-6z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  )
}

function IconNetwork({ size = 22 }: SizeProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <circle cx="16" cy="10" r="3" fill="currentColor" />
      <circle cx="8" cy="22" r="3" fill="currentColor" />
      <circle cx="24" cy="22" r="3" fill="currentColor" />
      <path
        d="M16 13v5M13 20l-3 2M19 20l3 2"
        stroke="currentColor"
        strokeWidth="1.75"
        fill="none"
      />
    </svg>
  )
}

function IconVoterSearch({ size = 22 }: SizeProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <circle cx="13" cy="13" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M18 18l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconDoc({ size = 22 }: SizeProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <path
        d="M10 4h8l6 6v18H10V4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M17 4v7h7M13 16h10M13 20h10" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function IconTasks({ size = 22 }: SizeProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <path
        d="M8 9h16M8 16h16M8 23h12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M6 9l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

const GLYPH_RENDERERS: Record<
  WorkspaceSectionGlyphId,
  (p: SizeProps) => ReactElement
> = {
  'dash-identity-title': (p) => IconTop(p),
  'next-step-card': (p) => IconNextStep(p),
  'volunteer-global': (p) => IconSnapshot(p),
  'branch-specialty': (p) => IconBranch(p),
  'onboarding-activation': (p) => IconSpark(p),
  'onboarding-branch': (p) => IconBranch(p),
  'voter-status-card': (p) => IconBallot(p),
  'workspace-summary': (p) => IconSnapshot(p),
  'public-officials-card': (p) => IconCapitol(p),
  'power5-summary': (p) => IconSpark(p),
  'power5-workspace': (p) => IconNetwork(p),
  'voter-workspace': (p) => IconVoterSearch(p),
  'exception-request': (p) => IconDoc(p),
  'mission-tasks': (p) => IconNextStep(p),
  'intern-desk': (p) => IconTasks(p),
  'daily-activation': (p) => IconSpark(p),
  'workspace-cards': (p) => IconTasks(p),
}

export function WorkspaceSectionGlyph({
  id,
  size = 22,
}: {
  id: WorkspaceSectionGlyphId
  size?: number
}) {
  const render = GLYPH_RENDERERS[id]
  if (typeof render !== 'function') {
    return IconDoc({ size })
  }
  return render({ size })
}

export function WorkspaceDockHdGlyph({ size = 20 }: SizeProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <rect x="5" y="8" width="22" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 12h4v8H9zM19 12h4v8h-4z" fill="currentColor" />
    </svg>
  )
}
