import type { ReactNode } from 'react'
import { useCallback, useState } from 'react'
import type { WorkspaceSectionGlyphId } from '../workspace/workspaceDockModel'
import { WorkspaceSectionGlyph } from '../workspace/workspaceSectionGlyphs'

const prefix = 'campaignos-dash-panel-'

function readExpanded(storageKey: string, defaultExpanded: boolean): boolean {
  try {
    const v = localStorage.getItem(`${prefix}${storageKey}`)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  return defaultExpanded
}

export default function DashboardPanelFrame({
  scrollId,
  storageKey,
  labelCollapsed,
  sectionGlyph,
  children,
  className,
  defaultExpanded = true,
}: {
  /** When set, the wrapper gets this `id` for scroll-into-view from the workspace dock. */
  scrollId?: string
  storageKey: string
  labelCollapsed: string
  /** Same icon as the workspace dock for this section. */
  sectionGlyph: WorkspaceSectionGlyphId
  children: ReactNode
  className?: string
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(() =>
    readExpanded(storageKey, defaultExpanded),
  )

  const persist = useCallback((next: boolean) => {
    try {
      localStorage.setItem(`${prefix}${storageKey}`, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [storageKey])

  const collapse = useCallback(() => {
    setExpanded(false)
    persist(false)
  }, [persist])

  const expand = useCallback(() => {
    setExpanded(true)
    persist(true)
  }, [persist])

  const rootClass = [
    'dashboard-panel-frame',
    expanded ? '' : 'dashboard-panel-frame--collapsed',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClass} id={scrollId}>
      {expanded ? (
        <>
          <button
            type="button"
            className="dashboard-panel-frame__min"
            onClick={collapse}
            aria-label={`Minimize section: ${labelCollapsed}`}
          >
            <span className="dashboard-panel-frame__min-glyph" aria-hidden>
              <WorkspaceSectionGlyph id={sectionGlyph} size={17} />
            </span>
          </button>
          <div className="dashboard-panel-frame__body">{children}</div>
        </>
      ) : (
        <button
          type="button"
          className="dashboard-panel-frame__strip"
          onClick={expand}
          aria-expanded={false}
        >
          <span className="dashboard-panel-frame__strip-leading" aria-hidden>
            <WorkspaceSectionGlyph id={sectionGlyph} size={18} />
          </span>
          <span className="dashboard-panel-frame__strip-label">
            {labelCollapsed}
          </span>
          <span className="dashboard-panel-frame__strip-hint" aria-hidden>
            Show
          </span>
        </button>
      )}
    </div>
  )
}
