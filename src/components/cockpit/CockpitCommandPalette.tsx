import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { COCKPIT_MODULE_REGISTRY } from '../../lib/cockpit/cockpitModuleRegistry'
import {
  COCKPIT_COMPARE_TEMPLATES,
  getCompareTemplate,
  type CockpitCompareTemplateId,
} from '../../lib/cockpit/cockpitCompareTemplates'
import { COCKPIT_PRESET_ORDER } from '../../lib/cockpit/cockpitWorkspaceSchemas'
import type { CockpitModuleId } from '../../lib/cockpit/cockpitWorkspaceSchemas'

type Props = {
  open: boolean
  onClose: () => void
  onPromoteCenter: (id: CockpitModuleId) => void
  onApplyCompare: (id: CockpitCompareTemplateId) => void
  onLoadPreset: (name: string) => void
}

export default function CockpitCommandPalette({
  open,
  onClose,
  onPromoteCenter,
  onApplyCompare,
  onLoadPreset,
}: Props) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (open) {
      setQ('')
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const qn = q.trim().toLowerCase()

  const modules = useMemo(() => {
    return COCKPIT_MODULE_REGISTRY.filter(
      (m) =>
        !qn ||
        m.title.toLowerCase().includes(qn) ||
        m.shortTitle.toLowerCase().includes(qn) ||
        m.id.includes(qn),
    ).slice(0, 14)
  }, [qn])

  const compares = useMemo(() => {
    return COCKPIT_COMPARE_TEMPLATES.filter(
      (t) => !qn || t.title.toLowerCase().includes(qn) || t.id.includes(qn),
    ).slice(0, 12)
  }, [qn])

  const presets = useMemo(() => {
    return COCKPIT_PRESET_ORDER.filter((p) => !qn || p.toLowerCase().includes(qn)).slice(0, 10)
  }, [qn])

  if (!open) return null

  return (
    <div className="cm-cockpit-palette-backdrop" role="presentation" onClick={onClose}>
      <div
        className="cm-cockpit-palette"
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        <p id={titleId} className="cm-cockpit-palette__title">
          Mission command
        </p>
        <input
          ref={inputRef}
          className="cm-cockpit-palette__input"
          placeholder="Filter modules, compare layouts, presets…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
        <div className="cm-cockpit-palette__cols">
          <section className="cm-cockpit-palette__col">
            <h3 className="cm-cockpit-palette__eyebrow">Modules</h3>
            <ul className="cm-cockpit-palette__list">
              {modules.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className="cm-cockpit-palette__row"
                    onClick={() => {
                      onPromoteCenter(m.id)
                      onClose()
                    }}
                  >
                    <span aria-hidden>{m.icon}</span>
                    <span>{m.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="cm-cockpit-palette__col">
            <h3 className="cm-cockpit-palette__eyebrow">Compare</h3>
            <ul className="cm-cockpit-palette__list">
              {compares.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="cm-cockpit-palette__row"
                    onClick={() => {
                      if (getCompareTemplate(t.id)) {
                        onApplyCompare(t.id)
                        onClose()
                      }
                    }}
                  >
                    <span>{t.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="cm-cockpit-palette__col">
            <h3 className="cm-cockpit-palette__eyebrow">Presets</h3>
            <ul className="cm-cockpit-palette__list">
              {presets.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    className="cm-cockpit-palette__row"
                    onClick={() => {
                      onLoadPreset(name)
                      onClose()
                    }}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <p className="cm-cockpit-palette__hint">Alt+K toggles · Esc closes</p>
      </div>
    </div>
  )
}
