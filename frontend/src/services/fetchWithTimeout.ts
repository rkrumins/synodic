/**
 * Fetch wrapper with AbortController timeout.
 *
 * Prevents requests from hanging indefinitely when the backend is down.
 * All service-layer fetch calls should use this instead of bare fetch().
 *
 * Default timeout: 5 seconds — fail fast so the UI can show error states
 * promptly instead of leaving users staring at spinners.
 *
 * Every failure is reported to the health store so the BackendHealthBanner
 * surfaces quickly — even if the health poll hasn't run yet.
 */

const DEFAULT_TIMEOUT_MS = 5_000

// Lazy import to avoid circular dependency (health store imports this module)
let _reportFailure: ((err: unknown) => void) | null = null
function reportFailure(err: unknown) {
  if (!_reportFailure) {
    // Dynamic import on first failure — tiny cost, only happens once
    import('@/store/health').then(({ useHealthStore }) => {
      _reportFailure = useHealthStore.getState().reportFailure
      _reportFailure(err)
    }).catch(() => { /* health store not available */ })
  } else {
    _reportFailure(err)
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchInit } = init ?? {}

  const controller = new AbortController()

  // If the caller already provided a signal, chain it
  if (fetchInit.signal) {
    fetchInit.signal.addEventListener('abort', () => controller.abort(fetchInit.signal!.reason))
  }

  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(input, { ...fetchInit, signal: controller.signal })
    return res
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      const timeoutErr = new TypeError('Request timed out (backend may be unavailable)')
      reportFailure(timeoutErr)
      throw timeoutErr
    }
    reportFailure(err)
    throw err
  } finally {
    clearTimeout(timer)
  }
}
