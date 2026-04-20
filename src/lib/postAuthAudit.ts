import { getDeviceFingerprint } from './deviceFingerprint'
import {
  fetchEdgeObservedIp,
  recordSignInAuditEvent,
  registerTrustedDeviceScaffold,
} from './recordSignInAudit'

/**
 * After successful Supabase session (password auth unchanged). Fire-and-forget safe.
 */
export async function runPostSignInAudit(options: {
  rememberDevice: boolean
}): Promise<void> {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : null
  const edgeIp = await fetchEdgeObservedIp()
  await recordSignInAuditEvent({
    userAgent: ua,
    clientObservedIp: edgeIp,
  })
  if (options.rememberDevice) {
    await registerTrustedDeviceScaffold({
      fingerprint: getDeviceFingerprint(),
      userAgent: ua,
      clientObservedIp: edgeIp,
    })
  }
}
