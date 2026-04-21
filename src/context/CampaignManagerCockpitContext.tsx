/* eslint-disable react-refresh/only-export-components -- context + provider pair */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  CockpitModuleId,
  CockpitPersistedLayout,
  CockpitQuadrantSlots,
} from '../lib/cockpit/cockpitWorkspaceSchemas'
import {
  applyCockpitPreset,
  defaultCockpitLayout,
  loadCockpitLayout,
  saveCockpitLayout,
} from '../lib/cockpit/cockpitLayoutPersistence'
import { defaultQuadrantSlots } from '../lib/cockpit/cockpitModuleAdapter'
import { emitCockpitBus } from '../lib/cockpit/cockpitEventBus'

export type CampaignManagerCockpitContextValue = {
  layout: CockpitPersistedLayout
  setCenterModule: (id: CockpitModuleId) => void
  setCenterSplit: (primary: CockpitModuleId, secondary: CockpitModuleId | null, mode: CockpitPersistedLayout['centerMode']) => void
  promoteFromRail: (id: CockpitModuleId) => void
  setFullscreenModule: (id: CockpitModuleId | null) => void
  fullscreenModuleId: CockpitModuleId | null
  layoutLocked: boolean
  setLayoutLocked: (v: boolean) => void
  saveLayoutToStorage: () => void
  loadPreset: (name: string) => void
  resetLayout: () => void
  setCenterQuad: (slots: CockpitQuadrantSlots) => void
  setCenterLayoutMode: (mode: CockpitPersistedLayout['centerMode']) => void
}

const CampaignManagerCockpitContext = createContext<CampaignManagerCockpitContextValue | null>(null)

export function CampaignManagerCockpitProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<CockpitPersistedLayout>(() => loadCockpitLayout())
  const [fullscreenModuleId, setFullscreenModule] = useState<CockpitModuleId | null>(null)

  useEffect(() => {
    saveCockpitLayout(layout)
  }, [layout])

  const setCenterModule = useCallback((id: CockpitModuleId) => {
    setLayout((l) => ({
      ...l,
      centerPrimary: id,
      centerSecondary: null,
      centerMode: 'single',
      quadrantSlots: null,
    }))
    emitCockpitBus({ type: 'promote_module', moduleId: id })
  }, [])

  const setCenterSplit = useCallback(
    (primary: CockpitModuleId, secondary: CockpitModuleId | null, mode: CockpitPersistedLayout['centerMode']) => {
      setLayout((l) => ({
        ...l,
        centerPrimary: primary,
        centerSecondary: secondary,
        centerMode: secondary ? mode : 'single',
        quadrantSlots: null,
      }))
    },
    [],
  )

  const setCenterQuad = useCallback((slots: CockpitQuadrantSlots) => {
    setLayout((l) => ({
      ...l,
      centerPrimary: slots[0],
      centerSecondary: null,
      centerMode: 'quad',
      quadrantSlots: slots,
    }))
  }, [])

  const setCenterLayoutMode = useCallback(
    (mode: CockpitPersistedLayout['centerMode']) => {
      setLayout((l) => {
        if (mode === 'quad') {
          const slots = l.quadrantSlots ?? defaultQuadrantSlots(l)
          return {
            ...l,
            centerMode: 'quad',
            centerPrimary: slots[0],
            centerSecondary: null,
            quadrantSlots: slots,
          }
        }
        if (mode === 'single') {
          return { ...l, centerMode: 'single', centerSecondary: null, quadrantSlots: null }
        }
        const secondary = l.centerSecondary ?? l.rightRail[0] ?? 'calendar'
        return {
          ...l,
          centerMode: mode,
          centerSecondary: secondary,
          quadrantSlots: null,
        }
      })
    },
    [],
  )

  const promoteFromRail = useCallback((id: CockpitModuleId) => {
    setCenterModule(id)
  }, [setCenterModule])

  const saveLayoutToStorage = useCallback(() => {
    saveCockpitLayout(layout)
  }, [layout])

  const loadPreset = useCallback((name: string) => {
    setLayout((l) => applyCockpitPreset(name, l))
  }, [])

  const resetLayout = useCallback(() => {
    const d = defaultCockpitLayout()
    setLayout(d)
    saveCockpitLayout(d)
  }, [])

  const setLayoutLocked = useCallback((v: boolean) => {
    setLayout((l) => ({ ...l, layoutLocked: v }))
  }, [])

  const v = useMemo(
    (): CampaignManagerCockpitContextValue => ({
      layout,
      setCenterModule,
      setCenterSplit,
      promoteFromRail,
      setFullscreenModule,
      fullscreenModuleId,
      layoutLocked: layout.layoutLocked,
      setLayoutLocked,
      saveLayoutToStorage,
      loadPreset,
      resetLayout,
      setCenterQuad,
      setCenterLayoutMode,
    }),
    [
      layout,
      setCenterModule,
      setCenterSplit,
      promoteFromRail,
      fullscreenModuleId,
      saveLayoutToStorage,
      loadPreset,
      resetLayout,
      setLayoutLocked,
      setCenterQuad,
      setCenterLayoutMode,
    ],
  )

  return (
    <CampaignManagerCockpitContext.Provider value={v}>{children}</CampaignManagerCockpitContext.Provider>
  )
}

export function useCampaignManagerCockpit(): CampaignManagerCockpitContextValue {
  const x = useContext(CampaignManagerCockpitContext)
  if (!x) throw new Error('useCampaignManagerCockpit must be used under CampaignManagerCockpitProvider')
  return x
}
