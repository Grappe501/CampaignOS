/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Only honored when `import.meta.env.DEV` is true. */
  readonly VITE_ENABLE_DEV_AUTH_BYPASS?: string
  /**
   * Dev + bypass only: initial preset before sessionStorage UI.
   * `unmatched` | `matched_no_branch` | `exception_pending` | `matched_ready`
   * (`matched_incomplete` maps to `matched_no_branch`.)
   */
  readonly VITE_DEV_MOCK_DASHBOARD_STATE?: string
  /**
   * Local only: origin where Netlify functions run (`netlify dev`), e.g. `http://localhost:8888`.
   * Omit on Netlify production (same-origin `/.netlify/functions/...`).
   */
  readonly VITE_NETLIFY_FUNCTIONS_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
