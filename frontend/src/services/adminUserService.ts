/**
 * Admin User Service — manage user accounts, roles, and approvals.
 */
import { authFetch } from './apiClient'

const ADMIN_USERS_API = '/api/v1/admin/users'
const ADMIN_INVITES_API = '/api/v1/admin/invites'

export interface AdminUserResponse {
    id: string
    email: string
    firstName: string
    lastName: string
    displayName: string
    status: string
    role: string
    createdAt: string
    updatedAt: string
    resetRequested: boolean
}

export interface ResetTokenResponse {
    resetToken: string
    expiresAt: string
}

export interface CreateInviteRequest {
    role?: string
    email?: string
    label?: string
    maxUses?: number
    expiryHours?: number
}

export interface InviteTokenResponse {
    id: string
    inviteToken: string
    role: string
    email: string | null
    label: string | null
    maxUses: number
    useCount: number
    expiresAt: string
    createdAt: string
}

export interface InviteTokenListItem {
    id: string
    role: string
    email: string | null
    label: string | null
    maxUses: number
    useCount: number
    expiresAt: string
    revoked: boolean
    createdAt: string
    isActive: boolean
}

export const adminUserService = {
    listUsers(status?: string): Promise<AdminUserResponse[]> {
        const params = status ? `?status=${encodeURIComponent(status)}` : ''
        return authFetch<AdminUserResponse[]>(`${ADMIN_USERS_API}${params}`)
    },

    approveUser(userId: string): Promise<{ detail: string }> {
        return authFetch<{ detail: string }>(`${ADMIN_USERS_API}/${userId}/approve`, {
            method: 'POST',
        })
    },

    rejectUser(userId: string, rejectionReason?: string): Promise<{ detail: string }> {
        return authFetch<{ detail: string }>(`${ADMIN_USERS_API}/${userId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ rejectionReason: rejectionReason || null }),
        })
    },

    changeRole(userId: string, role: string): Promise<{ detail: string }> {
        return authFetch<{ detail: string }>(`${ADMIN_USERS_API}/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role }),
        })
    },

    suspendUser(userId: string): Promise<{ detail: string }> {
        return authFetch<{ detail: string }>(`${ADMIN_USERS_API}/${userId}/suspend`, {
            method: 'POST',
        })
    },

    reactivateUser(userId: string): Promise<{ detail: string }> {
        return authFetch<{ detail: string }>(`${ADMIN_USERS_API}/${userId}/reactivate`, {
            method: 'POST',
        })
    },

    resetPassword(userId: string, newPassword: string): Promise<{ detail: string }> {
        return authFetch<{ detail: string }>(`${ADMIN_USERS_API}/${userId}/reset-password`, {
            method: 'POST',
            body: JSON.stringify({ newPassword }),
        })
    },

    generateResetToken(userId: string): Promise<ResetTokenResponse> {
        return authFetch<ResetTokenResponse>(`${ADMIN_USERS_API}/${userId}/generate-reset-token`, {
            method: 'POST',
        })
    },

    revokeResetToken(userId: string): Promise<{ detail: string }> {
        return authFetch<{ detail: string }>(`${ADMIN_USERS_API}/${userId}/revoke-reset-token`, {
            method: 'POST',
        })
    },

    // ── Invite tokens ────────────────────────────────────────────────

    createInvite(req: CreateInviteRequest): Promise<InviteTokenResponse> {
        return authFetch<InviteTokenResponse>(ADMIN_INVITES_API, {
            method: 'POST',
            body: JSON.stringify(req),
        })
    },

    listInvites(includeRevoked = false): Promise<InviteTokenListItem[]> {
        const params = includeRevoked ? '?includeRevoked=true' : ''
        return authFetch<InviteTokenListItem[]>(`${ADMIN_INVITES_API}${params}`)
    },

    revokeInvite(inviteId: string): Promise<{ detail: string }> {
        return authFetch<{ detail: string }>(`${ADMIN_INVITES_API}/${inviteId}/revoke`, {
            method: 'POST',
        })
    },
}
