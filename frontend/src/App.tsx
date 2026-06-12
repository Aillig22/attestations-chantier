import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { DemandesListPage } from '@/pages/DemandesListPage'
import { DemandeDetailPage } from '@/pages/DemandeDetailPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { ReportingPage } from '@/pages/ReportingPage'

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
          <Route path="/demandes/:id" element={<DemandeDetailPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/reporting" element={<ReportingPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
