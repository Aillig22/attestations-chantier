import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Plus, Trash2 } from 'lucide-react'
import { useCreateDemande, useDeleteDemande, useDemandes, useRelanceDemande } from '@/lib/queries'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/components/Toast'
import { apiError } from '@/lib/api'
import { DecisionBadge, StatutBadge } from '@/components/Badges'
import { FilterSelect } from '@/components/FilterSelect'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { formatDate } from '@/lib/utils'
import type { DemandeListItem } from '@/lib/types'

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
  const remove = useDeleteDemande()
  const relance = useRelanceDemande()
  const isDistributeur = user?.role === 'DISTRIBUTEUR'
  const [toDelete, setToDelete] = useState<DemandeListItem | null>(null)

  async function onCreate() {
    try {
      const demande = await create.mutateAsync()
      navigate(`/demandes/${demande.id}`)
    } catch (err) {
      toast('error', apiError(err))
    }
  }

  // Relance possible sur une demande en cours, 24h après sa création ou sa
  // dernière relance.
  function relancePossible(d: DemandeListItem) {
    if (d.statut !== 'EN_COURS') return false
    const base = new Date(d.last_relance_at ?? d.created_at).getTime()
    return Date.now() - base >= 24 * 60 * 60 * 1000
  }

  async function onRelance(e: React.MouseEvent, d: DemandeListItem) {
    e.stopPropagation()
    // Ouvre le client mail avec les infos déjà renseignées…
    const sujet = `Relance demande d'attestation ${d.reference}`
    const corps = [
      'Bonjour,',
      '',
      `Je me permets de relancer concernant la demande d'attestation ${d.reference}` +
        ` (assuré : ${d.assure_nom || '—'}, chantier : ${d.chantier_nom || '—'})` +
        (d.submitted_at ? `, soumise le ${formatDate(d.submitted_at)}` : '') +
        '.',
      '',
      'Pourriez-vous m’indiquer où en est son traitement ?',
      '',
      'Cordialement,',
    ].join('\r\n')
    const dest = encodeURIComponent(d.siege_email || '')
    window.location.href = `mailto:${dest}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`
    // …puis enregistre la relance pour réappliquer le délai de 24h.
    try {
      await relance.mutateAsync(d.id)
    } catch (err) {
      toast('error', apiError(err))
    }
  }

  function askDelete(e: React.MouseEvent, demande: DemandeListItem) {
    e.stopPropagation()
    setToDelete(demande)
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await remove.mutateAsync(toDelete.id)
      toast('success', 'Brouillon supprimé.')
      setToDelete(null)
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
              {isDistributeur && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={isDistributeur ? 7 : 6} className="px-4 py-8 text-center text-muted">
                  Chargement…
                </td>
              </tr>
            )}
            {data?.length === 0 && (
              <tr>
                <td colSpan={isDistributeur ? 7 : 6} className="px-4 py-8 text-center text-muted">
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
                {isDistributeur && (
                  <td className="px-4 py-3 text-right">
                    {d.statut === 'BROUILLON' && (
                      <button
                        onClick={(e) => askDelete(e, d)}
                        title="Supprimer le brouillon"
                        aria-label={`Supprimer le brouillon ${d.reference}`}
                        className="cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-axa-red/10 hover:text-axa-red focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-axa-red"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {relancePossible(d) && (
                      <button
                        onClick={(e) => onRelance(e, d)}
                        disabled={relance.isPending}
                        title="Relancer le siège par e-mail"
                        aria-label={`Relancer la demande ${d.reference}`}
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-axa-blue transition-colors hover:bg-axa-blue-light focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-axa-blue disabled:opacity-50"
                      >
                        <Bell size={14} /> Relancer
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer le brouillon"
        message={
          <>
            Le brouillon{' '}
            <span className="font-semibold text-foreground">{toDelete?.reference}</span> sera
            définitivement supprimé. Cette action est irréversible.
          </>
        }
        confirmLabel="Supprimer"
        variant="danger"
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
