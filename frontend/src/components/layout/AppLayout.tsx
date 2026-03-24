/**
 * Root layout component for the app. Wraps all routes with:
 * - Auth guard
 * - ReactFlowProvider
 * - Schema/graph initialization
 * - TopBar, SidebarNav, and React Router Outlet
 *
 * Refactored from AppShell + App.tsx to support route-based navigation.
 */
import { useEffect, useState, createContext, useContext } from 'react'
import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { AlertTriangle, Home } from 'lucide-react'
import { TopBar } from './TopBar'
import { GlobalAnnouncementBanner } from './GlobalAnnouncementBanner'
import { SidebarNav } from './SidebarNav'
import { CommandPalette } from './CommandPalette'
import { ViewWizard } from '@/components/views/ViewWizard'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAuthStore } from '@/store/auth'
import { usePreferencesStore } from '@/store/preferences'
import { useSchemaStore } from '@/store/schema'
import { listViews, viewToViewConfig } from '@/services/viewApiService'
import { useWorkspacesStore } from '@/store/workspaces'
import { useRouteSync } from '@/hooks/useRouteSync'
import { useBackendRecovery } from '@/hooks/useBackendRecovery'

// Context for View Editor Modal
interface ViewEditorContextType {
  openViewEditor: (viewId?: string) => void
  closeViewEditor: () => void
}

const ViewEditorContext = createContext<ViewEditorContextType | null>(null)

export function useViewEditorModal() {
  const context = useContext(ViewEditorContext)
  if (!context) {
    throw new Error('useViewEditorModal must be used within AppLayout')
  }
  return context
}

export function AppLayout() {
  const { isAuthenticated } = useAuthStore()
  const { theme } = usePreferencesStore()

  // View editor state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [viewEditorOpen, setViewEditorOpen] = useState(false)
  const [editingViewId, setEditingViewId] = useState<string | undefined>()

  const openViewEditor = (viewId?: string) => {
    setEditingViewId(viewId)
    setViewEditorOpen(true)
  }
  const closeViewEditor = () => {
    setViewEditorOpen(false)
    setEditingViewId(undefined)
  }

  // Sync React Router location with Zustand navigation store
  useRouteSync()

  // Auto-recover data when backend comes back from an outage
  useBackendRecovery()

  // Load views from the API into the schema store cache.
  // Fetches ALL accessible views (no workspace filter) so that cross-workspace
  // links in the sidebar and deep-linked URLs resolve without a page refresh.
  // Re-runs when activeWorkspaceId or activeDataSourceId changes so newly
  // created views and data-source-scoped views are picked up.
  const activeWorkspaceId = useWorkspacesStore(s => s.activeWorkspaceId)
  const activeDataSourceId = useWorkspacesStore(s => s.activeDataSourceId)
  useEffect(() => {
    if (!isAuthenticated) return

    const loadViews = async () => {
      try {
        const views = await listViews()
        // Single set() call — avoids N sequential Zustand updates that can
        // overwhelm useSyncExternalStore subscribers during mount.
        useSchemaStore.getState().upsertViews(views.map(viewToViewConfig))
      } catch (err) {
        console.error('[AppLayout] Failed to load views from API:', err)
      }
    }
    loadViews()
  }, [isAuthenticated, activeWorkspaceId, activeDataSourceId])

  // Apply theme
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', systemDark)
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => root.classList.toggle('dark', e.matches)
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      root.classList.toggle('dark', theme === 'dark')
    }
  }, [theme])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <ViewEditorContext.Provider value={{ openViewEditor, closeViewEditor }}>
      <div className="h-full w-full flex flex-col overflow-hidden bg-canvas">
        <GlobalAnnouncementBanner />
        <TopBar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

        <div className="flex-1 flex overflow-hidden">
          <SidebarNav />

          <main
            className="flex-1 relative overflow-hidden transition-all duration-300"
          >
            <ErrorBoundary
              resetKeys={[activeWorkspaceId]}
              fallback={(error, reset) => (
                <PageError error={error} onReset={reset} />
              )}
            >
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>

        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
        />

        <ViewWizard
          mode={editingViewId ? 'edit' : 'create'}
          viewId={editingViewId}
          isOpen={viewEditorOpen}
          onClose={closeViewEditor}
          onComplete={() => closeViewEditor()}
        />
      </div>
    </ViewEditorContext.Provider>
  )
}

function PageError({ error, onReset }: { error: Error; onReset: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="w-full h-full flex items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-4 max-w-lg text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-ink">Something went wrong</h2>
        <p className="text-sm text-ink-muted">{error.message}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg bg-surface-elevated border border-border text-sm font-medium text-ink hover:bg-surface-hover transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => { onReset(); navigate('/dashboard') }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-lineage text-white text-sm font-medium hover:bg-accent-lineage/90 transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
