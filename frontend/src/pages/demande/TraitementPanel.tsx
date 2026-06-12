import { useState } from 'react'
import { Check, MessageSquarePlus, X } from 'lucide-react'
import type { DemandeDetail } from '@/lib/types'
import { useDemandeAction } from '@/lib/queries'
import { useToast } from '@/components/Toast'
import { apiError } from '@/lib/api'
import { DecisionBadge } from '@/components/Badges'
import { formatDate } from '@/lib/utils'

export function TraitementPanel({ demande }: { demande: DemandeDetail }) {
  const { decision, complements } = useDemandeAction(demande.id)
  const toast = useToast()
  const [motif, setMotif] = useState('')
  const [complement, setComplement] = useState('')
  const traite = demande.statut === 'TRAITE'

  async function decide(value: 'ACCEPTEE' | 'REFUSEE') {
    if (value === 'REFUSEE' && !motif.trim()) {
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

  async function askComplements() {
    if (!complement.trim()) return
    try {
      await complements.mutateAsync(complement)
      setComplement('')
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
          <section className="card-axa card-pad">
            <p className="mb-2 text-sm font-medium">Refus — motivation</p>
            <textarea
              className="input-axa"
              rows={3}
              placeholder="Motif du refus (obligatoire en cas de refus)"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
            />
            <div className="mt-4 flex gap-3">
              <button className="btn-success" onClick={() => decide('ACCEPTEE')} disabled={decision.isPending}>
                <Check size={16} /> Accepter
              </button>
              <button className="btn-danger" onClick={() => decide('REFUSEE')} disabled={decision.isPending}>
                <X size={16} /> Refuser
              </button>
            </div>
          </section>

          <section className="card-axa card-pad">
            <p className="mb-2 text-sm font-medium">Demander des éléments complémentaires</p>
            <textarea
              className="input-axa"
              rows={2}
              placeholder="Précisez les éléments attendus du distributeur…"
              value={complement}
              onChange={(e) => setComplement(e.target.value)}
            />
            <div className="mt-3 flex justify-end">
              <button className="btn-ghost" onClick={askComplements} disabled={complements.isPending}>
                <MessageSquarePlus size={16} /> Envoyer la demande
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
