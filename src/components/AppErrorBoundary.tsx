import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }

type State = { error: Error | null }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App render error:', error, info.componentStack)
  }

  override render() {
    if (this.state.error) {
      return (
        <div
          className="app-viewport"
          style={{
            padding: '24px',
            maxWidth: '40rem',
            margin: '0 auto',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: '1.25rem' }}>Something went wrong</h1>
          <p style={{ marginTop: 12, lineHeight: 1.5 }}>
            {this.state.error.message}
          </p>
          <button
            type="button"
            style={{ marginTop: 20, padding: '10px 16px', cursor: 'pointer' }}
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
