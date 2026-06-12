import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Bell, FileText, LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useNotifications } from '@/lib/queries'
import { cn } from '@/lib/utils'

function NavItem({ to, icon, label, badge }: { to: string; icon: ReactNode; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-axa-blue text-white' : 'text-foreground hover:bg-background',
        )
      }
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="badge bg-axa-red text-white">{badge}</span>
      ) : null}
    </NavLink>
  )
}

export function Layout() {
  const { user, logout } = useAuth()
  const { data: notifications } = useNotifications()
  const unread = notifications?.filter((n) => !n.lue).length ?? 0

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="text-2xl font-bold text-axa-blue">AXA</span>
          <span className="text-xs text-muted leading-tight">
            Attestations
            <br />
            de chantier
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Demandes" />
          <NavItem
            to="/notifications"
            icon={<Bell size={18} />}
            label="Notifications"
            badge={unread}
          />
          <NavItem to="/reporting" icon={<FileText size={18} />} label="Reporting" />
        </nav>
        <div className="mt-auto border-t border-border pt-4">
          <div className="mb-2 px-2">
            <p className="text-sm font-medium">{user?.nom_complet || user?.username}</p>
            <p className="text-xs text-muted">
              {user?.role === 'SIEGE' ? 'Siège' : 'Distributeur'}
            </p>
          </div>
          <button onClick={logout} className="btn-ghost btn-sm w-full">
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex-1 bg-background">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
          <span className="text-xl font-bold text-axa-blue">AXA</span>
          <button onClick={logout} className="btn-ghost btn-sm">
            <LogOut size={14} />
          </button>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
