import { useState } from 'react'
import type { PipelineRow } from '../../hooks/useInternLayer'
import type { VolunteerTaskRow } from '../../hooks/useVolunteerTasks'
import type { ContactMethod, ContactOutcome } from '../../lib/internPipelineEngine'
import InternDeskAttentionSummary from './InternDeskAttentionSummary'
import InternDeskMissionTasks from './InternDeskMissionTasks'
import InternDeskPipelineQueue from './InternDeskPipelineQueue'

export type InternDeskContentProps = {
  intern: {
    pipelines: PipelineRow[]
    loading: boolean
    error: string | null
    refetch: () => void | Promise<void>
    overdueCount: number
    nowMs: number
  }
  tasks: {
    active: VolunteerTaskRow[]
    loading: boolean
    error: string | null
    claim: (id: string) => Promise<boolean>
    complete: (id: string, notes?: string | null) => Promise<boolean>
    decline: (id: string, reason?: string | null) => Promise<boolean>
    refetch: () => void | Promise<void>
  }
  onProfileRefetch: () => void | Promise<void>
  /** True when opened from `/intern` — shows wayfinding for the full dashboard. */
  showDirectRouteHint?: boolean
}

/**
 * Intern operational workspace: volunteer contact queue + mission tasks.
 * Data paths: `useInternLayer`, `useVolunteerTasks`, `internPipelineEngine` RPCs only.
 */
export default function InternDeskContent({
  intern,
  tasks,
  onProfileRefetch,
  showDirectRouteHint = false,
}: InternDeskContentProps) {
  const [busy, setBusy] = useState(false)
  const [method, setMethod] = useState<ContactMethod>('call')
  const [outcome, setOutcome] = useState<ContactOutcome>('spoke')
  const [notes, setNotes] = useState('')
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState('')

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
      await intern.refetch()
      await tasks.refetch()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="intern-desk-embed">
      <header className="intern-desk-header">
        <p className="subtitle intern-desk-eyebrow" style={{ margin: 0 }}>
          Team desk
        </p>
        <h2 className="page-title intern-desk-title">
          Intern workspace — contacts & missions
        </h2>
        <p className="subtitle intern-desk-intro">
          Work assigned volunteers first (queue below), then your own mission tasks. Every
          action uses live campaign data; if something fails, the error line names the layer
          (assignments vs tasks).
        </p>
      </header>

      <InternDeskAttentionSummary
        internLoading={intern.loading}
        tasksLoading={tasks.loading}
        internError={intern.error}
        tasksError={tasks.error}
        overdueCount={intern.overdueCount}
        pipelines={intern.pipelines}
        activeTaskCount={tasks.active.length}
        nowMs={intern.nowMs}
        showRouteHint={showDirectRouteHint}
      />

      <div className="intern-desk-sections">
        <InternDeskPipelineQueue
          pipelines={intern.pipelines}
          loading={intern.loading}
          nowMs={intern.nowMs}
          busy={busy}
          selectedPipeline={selectedPipeline}
          method={method}
          outcome={outcome}
          notes={notes}
          onSelectPipeline={setSelectedPipeline}
          onMethodChange={setMethod}
          onOutcomeChange={setOutcome}
          onNotesChange={setNotes}
          run={run}
        />

        <InternDeskMissionTasks
          tasks={tasks.active}
          loading={tasks.loading}
          busy={busy}
          declineReason={declineReason}
          onDeclineReasonChange={setDeclineReason}
          run={run}
          onClaim={tasks.claim}
          onComplete={tasks.complete}
          onDecline={tasks.decline}
          onProfileRefetch={() => void onProfileRefetch()}
        />
      </div>
    </div>
  )
}
