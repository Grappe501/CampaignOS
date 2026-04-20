/**
 * Workspace navigator: horizontal strip on phone/tablet; fixed right rail on wide screens.
 */
import { useMemo } from 'react'
import { CHRIS_JONES_FOR_CONGRESS_PUBLIC } from '../brand/chrisJonesForCongress'
import {
  WORKSPACE_DOCK_ITEMS,
  type WorkspaceSectionGlyphId,
} from './workspace/workspaceDockModel'
import { WorkspaceDockHdGlyph, WorkspaceSectionGlyph } from './workspace/workspaceSectionGlyphs'

const brand = CHRIS_JONES_FOR_CONGRESS_PUBLIC

function scrollToId(id: string) {
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function WorkspaceDock({
  onAgentOpen,
  hdWorkspace,
  onHdWorkspaceChange,
  visibleSectionIds,
}: {
  onAgentOpen?: () => void
  hdWorkspace: boolean
  onHdWorkspaceChange: (next: boolean) => void
  /** When set, only these section ids render jump buttons (DOM may omit panels). */
  visibleSectionIds?: ReadonlySet<WorkspaceSectionGlyphId>
}) {
  const items = useMemo(() => {
    if (!visibleSectionIds) return [...WORKSPACE_DOCK_ITEMS]
    return WORKSPACE_DOCK_ITEMS.filter((i) => visibleSectionIds.has(i.id))
  }, [visibleSectionIds])

  return (
    <nav className="workspace-dock" aria-label="Workspace sections">
      <div className="workspace-dock-scroll">
        <div className="workspace-dock-grid" role="group" aria-label="Jump to section">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="workspace-dock-icon-btn"
              title={item.label}
              aria-label={`Jump to ${item.label}`}
              onClick={() => scrollToId(item.id)}
            >
              <span className="workspace-dock-icon-btn__glyph" aria-hidden>
                <WorkspaceSectionGlyph id={item.id} size={22} />
              </span>
            </button>
          ))}
          <button
            type="button"
            className="workspace-dock-icon-btn workspace-dock-icon-btn--brand"
            title="Agent Jones"
            aria-label="Open Agent Jones"
            onClick={() => onAgentOpen?.()}
          >
            <span className="workspace-dock-icon-btn__glyph workspace-dock-icon-btn__img-wrap" aria-hidden>
              <img
                src={brand.assets.logoPrimaryUrl}
                alt=""
                className="workspace-dock-brand-mark"
                width={22}
                height={22}
                loading="lazy"
                decoding="async"
              />
            </span>
          </button>
        </div>
      </div>
      <div className="workspace-dock-footer" role="group" aria-label="Layout">
        <button
          type="button"
          className={`workspace-dock-hd-btn${hdWorkspace ? ' workspace-dock-hd-btn--on' : ''}`}
          aria-pressed={hdWorkspace}
          title={hdWorkspace ? 'Standard width' : 'Wide (HD) layout'}
          onClick={() => onHdWorkspaceChange(!hdWorkspace)}
        >
          <span className="workspace-dock-hd-btn__icons" aria-hidden>
            <WorkspaceDockHdGlyph size={20} />
          </span>
          <span className="workspace-dock-hd-btn__text">HD</span>
        </button>
      </div>
    </nav>
  )
}
