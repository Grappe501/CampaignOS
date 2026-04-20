import { supabase } from './supabaseClient'

/**
 * Records a sign-in audit row (authenticated caller only).
 * IP is optional client-reported; for production, prefer edge-captured IP later.
 */
export async function recordSignInAuditEvent(params: {
  userAgent: string | null
  clientObservedIp: string | null
}): Promise<void> {
  const { error } = await supabase.rpc('record_signin_audit_event', {
    p_user_agent: params.userAgent ?? '',
    p_client_observed_ip: params.clientObservedIp ?? '',
  })
  if (error) {
    console.warn('record_signin_audit_event:', error.message)
  }
}

/**
 * Optional: fetch observed IP from Netlify function when deployed (not available on pure Vite).
 */
export async function fetchEdgeObservedIp(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const envOrigin = (import.meta.env.VITE_NETLIFY_FUNCTIONS_ORIGIN as string | undefined)?.replace(
    /\/$/,
    '',
  )
  const path = '/.netlify/functions/signin-audit-context'
  const url = envOrigin?.trim() ? `${envOrigin}${path}` : path
  try {
    const res = await fetch(url, { method: 'GET', credentials: 'omit' })
    if (!res.ok) return null
    const data = (await res.json()) as { observedIp?: string | null }
    const ip = data.observedIp?.trim()
    return ip || null
  } catch {
    return null
  }
}

export async function registerTrustedDeviceScaffold(params: {
  fingerprint: string
  userAgent: string | null
  clientObservedIp: string | null
}): Promise<string | null> {
  const { data, error } = await supabase.rpc('register_trusted_device_scaffold', {
    p_device_fingerprint: params.fingerprint,
    p_user_agent: params.userAgent ?? '',
    p_client_observed_ip: params.clientObservedIp ?? '',
  })
  if (error) {
    console.warn('register_trusted_device_scaffold:', error.message)
    return null
  }
  return typeof data === 'string' ? data : null
}

export async function touchTrustedSessionScaffold(params: {
  trustedDeviceId: string
  userAgent: string | null
  clientObservedIp: string | null
}): Promise<void> {
  const { error } = await supabase.rpc('touch_trusted_session_scaffold', {
    p_trusted_device_id: params.trustedDeviceId,
    p_user_agent: params.userAgent ?? '',
    p_client_observed_ip: params.clientObservedIp ?? '',
  })
  if (error) {
    console.warn('touch_trusted_session_scaffold:', error.message)
  }
}
