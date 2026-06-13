import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useCreateDemande, useDemandes } from '@/lib/queries'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/components/Toast'
import { apiError } from '@/lib/api'
import { DecisionBadge, StatutBadge } from '@/components/Badges'
import { FilterSelect } from '@/components/FilterSelect'
import { formatDate } from '@/lib/utils'

export function DemandesListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [statut, setStatut] = useState('')
  const [decision, setDecision] = useState('')
  const { data, isLoading } = useDemandes({
    statut: statut || undefined,
    decision: decision || undefined,
  })
  const create = useCreateDemande()

  async function onCreate() {
    try {
      const demande = await create.mutateAsync()
      navigate(`/demandes/${demande.id}`)
    } catch (err) {
      toast('error', apiError(err))
    }
  }

  return (
    <div className="page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1>Demandes d'attestation</h1>
          <p className="text-sm text-muted">
            {user?.role === 'SIEGE'
              ? 'Demandes soumises par les distributeurs'
              : 'Vos demandes en cours et passées'}
          </p>
        </div>
        {user?.role === 'DISTRIBUTEUR' && (
          <button className="btn-primary" onClick={onCreate} disabled={create.isPending}>
            <Plus size={16} /> Nouvelle demande
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Filtrer
        </span>
        <FilterSelect
          value={statut}
          onChange={setStatut}
          options={[
            { value: '', label: 'Tous les statuts' },
            { value: 'BROUILLON', label: 'Brouillon' },
            { value: 'EN_COURS', label: 'En cours' },
            { value: 'TRAITE', label: 'Traité' },
          ]}
        />
        <FilterSelect
          value={decision}
          onChange={setDecision}
          options={[
            { value: '', label: 'Toutes les décisions' },
            { value: 'ACCEPTEE', label: 'Acceptée' },
            { value: 'REFUSEE', label: 'Refusée' },
          ]}
        />
        {(statut || decision) && (
          <button
            onClick={() => {
              setStatut('')
              setDecision('')
            }}
            className="text-xs font-semibold text-axa-blue hover:underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div className="card-axa overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Référence</th>
              <th className="px-4 py-3">Assuré</th>
              <th className="px-4 py-3">Chantier</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Décision</th>
              <th className="px-4 py-3">Créée le</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Chargement…
                </td>
              </tr>
            )}
            {data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Aucune demande.
                </td>
              </tr>
            )}
            {data?.map((d) => (
              <tr
                key={d.id}
                onClick={() => navigate(`/demandes/${d.id}`)}
                className="cursor-pointer border-t border-border hover:bg-background"
              >
                <td className="px-4 py-3 font-medium text-axa-blue">{d.reference}</td>
                <td className="px-4 py-3">{d.assure_nom || '—'}</td>
                <td className="px-4 py-3">{d.chantier_nom || '—'}</td>
                <td className="px-4 py-3">
                  <StatutBadge statut={d.statut} />
                </td>
                <td className="px-4 py-3">
                  <DecisionBadge decision={d.decision} />
                </td>
                <td className="px-4 py-3 text-muted">{formatDate(d.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
