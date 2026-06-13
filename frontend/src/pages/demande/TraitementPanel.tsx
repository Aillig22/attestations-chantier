import { useState } from 'react'
import { Check, MessageSquarePlus, X } from 'lucide-react'
import type { DemandeDetail } from '@/lib/types'
import { useDemandeAction } from '@/lib/queries'
import { useToast } from '@/components/Toast'
import { apiError } from '@/lib/api'
import { DecisionBadge } from '@/components/Badges'
import { FDR_FIELD_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

// Champs du FDR que le siège peut « pinger » dans une demande de compléments.
const FIELDS_PINGABLES = [
  'assure_nom',
  'assure_numero_contrat',
  'chantier_nom',
  'chantier_ville',
  'chantier_type',
  'usage',
  'date_debut',
  'date_fin',
  'cout_total',
  'description_travaux',
  'type_intervention',
  'activite_couverte_texte',
] as const

export function TraitementPanel({ demande }: { demande: DemandeDetail }) {
  const { decision, complements } = useDemandeAction(demande.id)
  const toast = useToast()
  const [motif, setMotif] = useState('')
  const [complement, setComplement] = useState('')
  const [champs, setChamps] = useState<string[]>([])
  const traite = demande.statut === 'TRAITE'
  const motifVide = !motif.trim()

  async function decide(value: 'ACCEPTEE' | 'REFUSEE') {
    if (value === 'REFUSEE' && motifVide) {
      toast('error', 'Le motif de refus est obligatoire.')
      return
    }
    try {
      await decision.mutateAsync({ decision: value, motif_refus: motif })
      toast('success', `Demande ${value === 'ACCEPTEE' ? 'acceptée' : 'refusée'}.`)
    } catch (err) {
      toast('error', apiError(err))
    }
  }

  function toggleChamp(champ: string) {
    setChamps((prev) =>
      prev.includes(champ) ? prev.filter((c) => c !== champ) : [...prev, champ],
    )
  }

  async function askComplements() {
    if (!complement.trim()) return
    try {
      await complements.mutateAsync({ texte: complement, champs })
      setComplement('')
      setChamps([])
      toast('success', 'Demande de compléments envoyée.')
    } catch (err) {
      toast('error', apiError(err))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="card-axa card-pad">
        <p className="section-title">Traitement de la demande</p>
        {traite ? (
          <div className="flex items-center gap-3">
            <span className="text-sm">Décision rendue :</span>
            <DecisionBadge decision={demande.decision} />
            {demande.traite_at && (
              <span className="help-text">le {formatDate(demande.traite_at)}</span>
            )}
          </div>
        ) : (
          <p className="help-text">
            Consultez le FDR, l'évaluation et les pièces, puis rendez votre décision.
          </p>
        )}
        {traite && demande.decision === 'REFUSEE' && demande.motif_refus && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            <span className="font-medium">Motif du refus : </span>
            {demande.motif_refus}
          </div>
        )}
      </section>

      {!traite && (
        <>
          {/* Compléments — au-dessus de la décision : on sollicite le distributeur
              avant de trancher. */}
          <section className="card-axa card-pad">
            <p className="mb-2 text-sm font-medium">Demander des éléments complémentaires</p>
            <p className="help-text mb-3">
              Cochez les champs du FDR concernés pour les signaler au distributeur.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {FIELDS_PINGABLES.map((champ) => {
                const actif = champs.includes(champ)
                return (
                  <button
                    key={champ}
                    type="button"
                    onClick={() => toggleChamp(champ)}
                    className={`badge cursor-pointer border transition-colors ${
                      actif
                        ? 'border-axa-blue bg-axa-blue text-white'
                        : 'border-border bg-surface text-muted hover:bg-background'
                    }`}
                  >
                    {FDR_FIELD_LABELS[champ] ?? champ}
                  </button>
                )
              })}
            </div>
            <textarea
              className="input-axa"
              rows={2}
              placeholder="Précisez les éléments attendus du distributeur…"
              value={complement}
              onChange={(e) => setComplement(e.target.value)}
            />
            <div className="mt-3 flex justify-end">
              <button
                className="btn-ghost"
                onClick={askComplements}
                disabled={complements.isPending || !complement.trim()}
              >
                <MessageSquarePlus size={16} /> Envoyer la demande
              </button>
            </div>
          </section>

          {/* Décision */}
          <section className="card-axa card-pad">
            <p className="mb-2 text-sm font-medium">Décision</p>
            <textarea
              className="input-axa"
              rows={3}
              placeholder="Motif (obligatoire en cas de refus)"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
            />
            <div className="mt-4 flex gap-3">
              <button className="btn-success" onClick={() => decide('ACCEPTEE')} disabled={decision.isPending}>
                <Check size={16} /> Accepter
              </button>
              <button
                className="btn-danger"
                onClick={() => decide('REFUSEE')}
                disabled={decision.isPending || motifVide}
                title={motifVide ? 'Saisissez un motif pour pouvoir refuser' : undefined}
              >
                <X size={16} /> Refuser
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
