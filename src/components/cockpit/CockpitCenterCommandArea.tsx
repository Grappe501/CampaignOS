import { useCallback, useMemo } from 'react'
import type { CockpitModuleId } from '../../lib/cockpit/cockpitWorkspaceSchemas'
import CockpitModuleViewport from './CockpitModuleViewport'
import CockpitFullscreenSphere from './CockpitFullscreenSphere'
import type { CampaignProfile } from '../../hooks/useProfile'
import { useCampaignManagerCockpit } from '../../context/CampaignManagerCockpitContext'
import { defaultQuadrantSlots } from '../../lib/cockpit/cockpitModuleAdapter'

const DRAG_MIME = 'application/x-campaignos-cockpit-module'

type Props = {
  profile: CampaignProfile | null
}

export default function CockpitCenterCommandArea({ profile }: Props) {
  const {
    layout,
    setCenterModule,
    setFullscreenModule,
    fullscreenModuleId,
    layoutLocked,
    setCenterLayoutMode,
    setCenterSplit,
  } = useCampaignManagerCockpit()

  const quadSlots = useMemo(
    () => (layout.centerMode === 'quad' ? defaultQuadrantSlots(layout) : null),
    [layout],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (layoutLocked) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [layoutLocked])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (layoutLocked) return
      e.preventDefault()
      const id = e.dataTransfer.getData(DRAG_MIME)
      if (id) setCenterModule(id as CockpitModuleId)
    },
    [layoutLocked, setCenterModule],
  )

  const primary = layout.centerPrimary
  const secondary = layout.centerSecondary
  const mode = layout.centerMode

  const primaryFs = fullscreenModuleId === primary
  const secondaryFs = secondary ? fullscreenModuleId === secondary : false

  const gridClass =
    mode === 'quad' && quadSlots
      ? 'cm-cockpit-center__grid cm-cockpit-center__grid--quad'
      : mode === 'split_h' && secondary
        ? 'cm-cockpit-center__grid cm-cockpit-center__grid--split-h'
        : mode === 'split_v' && secondary
          ? 'cm-cockpit-center__grid cm-cockpit-center__grid--split-v'
          : 'cm-cockpit-center__grid cm-cockpit-center__grid--single'

  return (
    <section
      className="cm-cockpit-center"
      aria-label="Command workspace"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <header className="cm-cockpit-center__chrome">
        <span className="cm-cockpit-center__badge">{mode.split('_').join(' ')}</span>
        <div className="cm-cockpit-center__layout-tools" role="toolbar" aria-label="Center layout mode">
          <button
            type="button"
            className="cm-cockpit-center__layout-btn"
            disabled={layoutLocked}
            data-active={mode === 'single'}
            title="Single panel"
            onClick={() => setCenterLayoutMode('single')}
          >
            1
          </button>
          <button
            type="button"
            className="cm-cockpit-center__layout-btn"
            disabled={layoutLocked}
            data-active={mode === 'split_h'}
            title="Split horizontal"
            onClick={() =>
              setCenterSplit(primary, secondary ?? layout.rightRail[0] ?? 'calendar', 'split_h')
            }
          >
            2H
          </button>
          <button
            type="button"
            className="cm-cockpit-center__layout-btn"
            disabled={layoutLocked}
            data-active={mode === 'split_v'}
            title="Split vertical"
            onClick={() =>
              setCenterSplit(primary, secondary ?? layout.rightRail[0] ?? 'calendar', 'split_v')
            }
          >
            2V
          </button>
          <button
            type="button"
            className="cm-cockpit-center__layout-btn"
            disabled={layoutLocked}
            data-active={mode === 'quad'}
            title="Four quadrants"
            onClick={() => setCenterLayoutMode('quad')}
          >
            4
          </button>
        </div>
        {mode === 'quad' && quadSlots ? null : (
          <CockpitFullscreenSphere
            attention="info"
            title="Primary command panel"
            fullscreenActive={primaryFs}
            onToggleFullscreen={() => setFullscreenModule(primaryFs ? null : primary)}
          />
        )}
      </header>

      <div className={gridClass}>
        {mode === 'quad' && quadSlots ? (
          quadSlots.map((mid, i) => {
            const fs = fullscreenModuleId === mid
            return (
              <div key={`${mid}-${String(i)}`} className="cm-cockpit-center__pane cm-cockpit-center__quad-pane cm-cockpit__embed">
                <div className="cm-cockpit-center__pane-head cm-cockpit-center__pane-head--quad">
                  <span className="cm-cockpit-center__quad-label">Q{i + 1}</span>
                  <CockpitFullscreenSphere
                    attention="info"
                    title={`Quadrant panel ${String(i + 1)}`}
                    fullscreenActive={fs}
                    onToggleFullscreen={() => setFullscreenModule(fs ? null : mid)}
                  />
                </div>
                <CockpitModuleViewport moduleId={mid} profile={profile} />
              </div>
            )
          })
        ) : (
          <>
            <div className="cm-cockpit-center__pane cm-cockpit__embed">
              <CockpitModuleViewport moduleId={primary} profile={profile} />
            </div>
            {mode !== 'single' && secondary ? (
              <div className="cm-cockpit-center__pane cm-cockpit__embed">
                <div className="cm-cockpit-center__pane-head">
                  <CockpitFullscreenSphere
                    attention="info"
                    title="Secondary panel"
                    fullscreenActive={secondaryFs}
                    onToggleFullscreen={() => setFullscreenModule(secondaryFs ? null : secondary)}
                  />
                </div>
                <CockpitModuleViewport moduleId={secondary} profile={profile} />
              </div>
            ) : null}
          </>
        )}
      </div>
      <p className="cm-cockpit-center__drop-hint">Drop a rail module here to switch center workspace.</p>
    </section>
  )
}
