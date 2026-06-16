import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { DemandesListPage } from '@/pages/DemandesListPage'
import { NotificationsPage } from '@/pages/NotificationsPage'

// Chargé à la demande : embarque recharts, inutile tant qu'on ne visite pas le reporting.
const ReportingPage = lazy(() =>
  import('@/pages/ReportingPage').then((m) => ({ default: m.ReportingPage })),
)

// Chargé à la demande : embarque l'éditeur riche TipTap (lourd), inutile sur les autres pages.
const DemandeDetailPage = lazy(() =>
  import('@/pages/DemandeDetailPage').then((m) => ({ default: m.DemandeDetailPage })),
)

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-muted">Chargement…</div>
  )
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading)
    return <div className="flex min-h-screen items-center justify-center text-muted">Chargement…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route path="/" element={<DemandesListPage />} />
          <Route
            path="/demandes/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <DemandeDetailPage />
              </Suspense>
            }
          />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route
            path="/reporting"
            element={
              <Suspense fallback={<PageLoader />}>
                <ReportingPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
