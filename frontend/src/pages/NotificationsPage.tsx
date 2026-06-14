import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useMarkNotificationsRead, useNotifications } from '@/lib/queries'
import { formatDate } from '@/lib/utils'

export function NotificationsPage() {
  const { data, isLoading } = useNotifications()
  const markRead = useMarkNotificationsRead()
  const navigate = useNavigate()

  // À la consultation de la page, les notifications non lues sont marquées comme
  // lues (le badge et le liseré bleu disparaissent). On ne le déclenche qu'une
  // fois par lot d'identifiants pour éviter les appels répétés au refetch.
  const treatedRef = useRef('')
  useEffect(() => {
    const unread = data?.filter((n) => !n.lue).map((n) => n.id) ?? []
    if (unread.length === 0) return
    const key = unread.join(',')
    if (treatedRef.current === key) return
    treatedRef.current = key
    markRead.mutate(unread)
  }, [data, markRead])

  return (
    <div className="page">
      <h1 className="mb-6">Notifications</h1>
      {isLoading && <p className="text-muted">Chargement…</p>}
      {data?.length === 0 && <p className="text-muted">Aucune notification.</p>}
      <ul className="flex flex-col gap-2">
        {data?.map((n) => (
          <li
            key={n.id}
            onClick={() => n.demande && navigate(`/demandes/${n.demande}`)}
            className={`card-axa flex items-center gap-3 p-4 ${n.demande ? 'cursor-pointer hover:bg-background' : ''} ${
              n.lue ? '' : 'border-l-4 border-l-axa-blue'
            }`}
          >
            <Bell size={18} className="text-axa-blue" />
            <div className="flex-1">
              <p className="text-sm">{n.message}</p>
              <p className="help-text">{formatDate(n.created_at)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
