import { FileDown, Send } from 'lucide-react'
import type { DemandeDetail } from '@/lib/types'
import { useDemandeAction, useEvaluation } from '@/lib/queries'
import { useToast } from '@/components/Toast'
import { apiError } from '@/lib/api'
import { downloadFdrPdf } from '@/lib/pdf'
import { FDR_FIELD_LABELS } from '@/lib/constants'
import { formatDate, formatEuro } from '@/lib/utils'

export function ValidationPanel({ demande }: { demande: DemandeDetail }) {
  const { data: evaluation } = useEvaluation(demande.id)
  const { submit } = useDemandeAction(demande.id)
  const toast = useToast()
  const fdr = demande.fdr
  // Des compléments demandés par le siège rouvrent l'envoi même en cours.
  const complementEnAttente =
    Boolean(demande.complement_message) || demande.complement_champs.length > 0
  // À envoyer : brouillon initial, ou demande en cours avec compléments à fournir.
  const aEnvoyer = demande.statut === 'BROUILLON' || complementEnAttente

  async function onSubmit() {
    try {
      await submit.mutateAsync()
      toast('success', complementEnAttente ? 'Demande renvoyée au siège.' : 'Demande envoyée au siège.')
    } catch (err) {
      toast('error', apiError(err))
    }
  }

  async function onDownloadFdr() {
    try {
      await downloadFdrPdf(demande.id, demande.reference)
    } catch (err) {
      toast('error', apiError(err))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="card-axa card-pad">
        <p className="section-title">Récapitulatif</p>
        <dl className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
          <Row label="Assuré" value={fdr.assure_nom} />
          <Row label="Contrat" value={fdr.assure_numero_contrat} />
          <Row label="Chantier" value={fdr.chantier_nom} />
          <Row label="Ville" value={fdr.chantier_ville} />
          <Row label="Dates" value={`${formatDate(fdr.date_debut)} → ${formatDate(fdr.date_fin)}`} />
          <Row label="Coût total" value={formatEuro(fdr.cout_total)} />
          <Row label="Travaux" value={fdr.description_travaux} />
        </dl>
      </section>

      {/* Vérification de complétude */}
      {evaluation && !evaluation.dossier_complet && (
        <section className="card-axa card-pad border-l-4 border-l-axa-red">
          <p className="mb-2 font-medium text-axa-red">Le dossier ne peut pas encore être envoyé</p>
          {evaluation.champs_fdr_manquants.length > 0 && (
            <div className="mb-2">
              <p className="help-text">Champs FDR manquants :</p>
              <ul className="ml-4 list-disc text-sm">
                {evaluation.champs_fdr_manquants.map((c) => (
                  <li key={c}>{FDR_FIELD_LABELS[c] ?? c}</li>
                ))}
              </ul>
            </div>
          )}
          {evaluation.pieces_manquantes.length > 0 && (
            <div>
              <p className="help-text">Pièces requises manquantes :</p>
              <ul className="ml-4 list-disc text-sm">
                {evaluation.pieces_manquantes.map((p) => (
                  <li key={p.code}>{p.libelle}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {aEnvoyer ? (
        <div className="flex items-center justify-end gap-3">
          <span className="help-text">
            {complementEnAttente
              ? 'Complétez le dossier puis renvoyez-le au siège.'
              : 'Le FDR est enregistré depuis l’onglet « Formulaire FDR ».'}
          </span>
          <button
            className="btn-primary"
            onClick={onSubmit}
            disabled={submit.isPending || !evaluation?.dossier_complet}
          >
            <Send size={16} /> {complementEnAttente ? 'Renvoyer au siège' : 'Envoyer au siège'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-3">
          <span className="help-text">La demande a été envoyée au siège.</span>
          <button className="btn-ghost" onClick={onDownloadFdr}>
            <FileDown size={16} /> Télécharger le FDR en PDF
          </button>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase text-muted">{label}</dt>
      <dd className="font-medium">{value || '—'}</dd>
    </div>
  )
}
