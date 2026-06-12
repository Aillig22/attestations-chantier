import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Stats {
  total: number
  brouillon: number
  en_cours: number
  traite: number
  acceptees: number
  refusees: number
}

export function ReportingPage() {
  const { data } = useQuery({
    queryKey: ['reporting'],
    queryFn: async () => (await api.get<Stats>('/reporting/')).data,
  })

  const cards = [
    { label: 'Total demandes', value: data?.total, color: 'text-axa-blue' },
    { label: 'Brouillons', value: data?.brouillon, color: 'text-gray-600' },
    { label: 'En cours', value: data?.en_cours, color: 'text-blue-600' },
    { label: 'Traitées', value: data?.traite, color: 'text-green-600' },
    { label: 'Acceptées', value: data?.acceptees, color: 'text-success' },
    { label: 'Refusées', value: data?.refusees, color: 'text-axa-red' },
  ]

  return (
    <div className="page">
      <h1 className="mb-6">Reporting</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <span className="text-xs uppercase text-muted">{c.label}</span>
            <span className={`text-3xl font-bold ${c.color}`}>{c.value ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
