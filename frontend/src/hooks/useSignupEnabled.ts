/**
 * Hook to check whether self-registration (signup) is enabled via the feature flag.
 * Fetches from the public /api/v1/auth/signup-status endpoint once on mount.
 */
import { useState, useEffect } from 'react'
import { authService } from '@/services/authService'

export function useSignupEnabled() {
    const [signupEnabled, setSignupEnabled] = useState<boolean | null>(null)

    useEffect(() => {
        let cancelled = false
        authService.getSignupStatus()
            .then((res) => { if (!cancelled) setSignupEnabled(res.signupEnabled) })
            .catch(() => { if (!cancelled) setSignupEnabled(false) })
        return () => { cancelled = true }
    }, [])

    return signupEnabled
}
