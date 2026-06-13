import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Bell, FileText, LayoutDashboard, LogOut } from 'lucide-react'
import logoAxa from '@/assets/logo-axa.svg'
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
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
          isActive
            ? 'bg-axa-blue text-white shadow-sm shadow-axa-blue/30'
            : 'text-foreground hover:bg-axa-blue-light',
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
    <div className="flex min-h-screen bg-background p-0 md:p-3">
      <aside className="hidden w-64 shrink-0 flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm md:flex">
        <div className="mb-7 flex items-center gap-3 px-1">
          <img src={logoAxa} alt="AXA" className="h-11 w-11 shrink-0 rounded-lg" />
          <div className="leading-tight">
            <span className="block text-xl font-bold uppercase text-axa-blue">Attestations</span>
            <span className="block text-[13px] font-semibold uppercase text-muted">de chantier</span>
          </div>
        </div>
        <nav className="flex flex-col gap-1.5">
          <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Demandes" />
          <NavItem
            to="/notifications"
            icon={<Bell size={18} />}
            label="Notifications"
            badge={unread}
          />
          <NavItem to="/reporting" icon={<FileText size={18} />} label="Reporting" />
        </nav>
        <div className="mt-auto">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-background p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-axa-blue text-xs font-bold text-white">
              {(user?.nom_complet || user?.username || '?').slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.nom_complet || user?.username}</p>
              <p className="text-xs text-muted">
                {user?.role === 'SIEGE' ? 'Siège' : 'Distributeur'}
              </p>
            </div>
          </div>
          <button onClick={logout} className="btn-ghost-danger btn-sm w-full">
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex-1 md:pl-3">
        <header className="mb-3 flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm md:hidden">
          <img src={logoAxa} alt="AXA" className="h-9 w-9 rounded-md" />
          <button onClick={logout} className="btn-ghost-danger btn-sm">
            <LogOut size={14} /> Déconnexion
          </button>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
