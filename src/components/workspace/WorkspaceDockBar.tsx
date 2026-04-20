/**
 * Shared workspace jump buttons (+ Agent, HD) for top / left / right rails.
 */
import { CHRIS_JONES_FOR_CONGRESS_PUBLIC } from '../../brand/chrisJonesForCongress'
import {
  WORKSPACE_DOCK_ITEMS,
  type WorkspaceSectionGlyphId,
} from './workspaceDockModel'
import { WorkspaceDockHdGlyph, WorkspaceSectionGlyph } from './workspaceSectionGlyphs'

const brand = CHRIS_JONES_FOR_CONGRESS_PUBLIC

function scrollToId(id: string) {
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export type WorkspaceDockBarProps = {
  onAgentOpen?: () => void
  hdWorkspace: boolean
  onHdWorkspaceChange: (next: boolean) => void
  visibleSectionIds?: ReadonlySet<WorkspaceSectionGlyphId>
  /** `horizontal` = strip; `vertical` = column (side rails). */
  layout?: 'horizontal' | 'vertical'
  /** Left rail: section jumps only. Right rail: include Agent + HD layout controls. */
  variant?: 'full' | 'navigation-only'
}

export default function WorkspaceDockBar({
  onAgentOpen,
  hdWorkspace,
  onHdWorkspaceChange,
  visibleSectionIds,
  layout = 'horizontal',
  variant = 'full',
}: WorkspaceDockBarProps) {
  const items = !visibleSectionIds
    ? [...WORKSPACE_DOCK_ITEMS]
    : WORKSPACE_DOCK_ITEMS.filter((i) => visibleSectionIds.has(i.id))

  const gridClass =
    layout === 'vertical'
      ? 'workspace-dock-grid workspace-dock-grid--vertical'
      : 'workspace-dock-grid'

  const showTools = variant === 'full'

  return (
    <>
      <div className="workspace-dock-scroll">
        <div className={gridClass} role="group" aria-label="Jump to section">
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
          {showTools ? (
            <button
              type="button"
              className="workspace-dock-icon-btn workspace-dock-icon-btn--brand"
              title="Jones AI"
              aria-label="Open Jones AI"
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
          ) : null}
        </div>
      </div>
      {showTools ? (
        <div className="workspace-dock-footer" role="group" aria-label="Layout">
          <button
            type="button"
            className={`workspace-dock-hd-btn${hdWorkspace ? ' workspace-dock-hd-btn--on' : ''}`}
            aria-pressed={hdWorkspace}
            title={hdWorkspace ? 'Comfortable density' : 'Dense workspace (full width)'}
            onClick={() => onHdWorkspaceChange(!hdWorkspace)}
          >
            <span className="workspace-dock-hd-btn__icons" aria-hidden>
              <WorkspaceDockHdGlyph size={20} />
            </span>
            <span className="workspace-dock-hd-btn__text">HD</span>
          </button>
        </div>
      ) : null}
    </>
  )
}
