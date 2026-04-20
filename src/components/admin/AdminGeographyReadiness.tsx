export default function AdminGeographyReadiness({
  voterLoading,
  hasMatch,
  county,
  precinct,
  congressionalDistrict,
  stateSenateDistrict,
  stateHouseDistrict,
}: {
  voterLoading: boolean
  hasMatch: boolean
  county: string | null
  precinct: string | null
  congressionalDistrict: string | null
  stateSenateDistrict: string | null
  stateHouseDistrict: string | null
}) {
  return (
    <div className="admin-desk-split">
      <div className="admin-desk-panel admin-desk-nested">
        <h3 className="admin-desk-panel-title">This profile &amp; voter geography</h3>
        {voterLoading ? (
          <p className="subtitle">Loading voter linkage…</p>
        ) : !hasMatch ? (
          <p className="subtitle">
            No voter file match on this profile. County/precinct readiness for <strong>your</strong>{' '}
            session cannot be derived from the voter record until you complete lookup or roster
            flows on the volunteer workspace.
          </p>
        ) : (
          <ul className="admin-desk-list">
            <li>
              County: <strong>{county ?? '—'}</strong>
            </li>
            <li>
              Precinct: <strong>{precinct ?? '—'}</strong>
            </li>
            <li>
              Congressional district: <strong>{congressionalDistrict ?? '—'}</strong>
            </li>
            <li>
              State Senate: <strong>{stateSenateDistrict ?? '—'}</strong>
            </li>
            <li>
              State House: <strong>{stateHouseDistrict ?? '—'}</strong>
            </li>
          </ul>
        )}
      </div>
      <div className="admin-desk-panel admin-desk-nested">
        <h3 className="admin-desk-panel-title">Campaign-wide field coverage</h3>
        <p className="subtitle">
          County lead assignment, precinct captain coverage, and backlog-by-geography require
          aggregated admin RPCs and geography registries. Those reads are not exposed on this build.
        </p>
        <p className="admin-desk-empty-hint">
          When available, this panel will summarize staffed vs gap counties and high-backlog precincts
          without dumping raw voter data.
        </p>
      </div>
    </div>
  )
}
