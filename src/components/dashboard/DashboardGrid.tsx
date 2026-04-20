import type { ReactNode } from 'react'

export default function DashboardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="dashboard-page-grid stack-section">{children}</div>
  )
}
