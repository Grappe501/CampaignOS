import { useState } from 'react'

export default function AgentJones() {
  const [question, setQuestion] = useState('')

  return (
    <section
      className="card agent-jones-card stack-section"
      aria-labelledby="agent-jones-title"
    >
      <h2 id="agent-jones-title" style={{ marginTop: 0 }}>
        Agent Jones
      </h2>
      <p id="agent-jones-help" className="subtitle">
        Welcome. I&apos;m here to guide you through the campaign. Ask a
        question below — tap the button when you&apos;re ready (more features
        coming soon).
      </p>

      <div className="field-block" style={{ marginBottom: 0 }}>
        <label htmlFor="agent-jones-input">Your question</label>
        <textarea
          id="agent-jones-input"
          className="input-stretch agent-input"
          placeholder="Ask me anything…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={4}
          autoComplete="off"
        />
      </div>

      <button
        type="button"
        className="btn-touch btn-primary"
        disabled
        aria-describedby="agent-jones-help"
        aria-label="Submit question (coming soon)"
      >
        Send (coming soon)
      </button>
    </section>
  )
}
