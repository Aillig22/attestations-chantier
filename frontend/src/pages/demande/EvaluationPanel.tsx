import { useRef } from 'react'
import { CheckCircle2, FileUp, Trash2, XCircle } from 'lucide-react'
import type { DemandeDetail } from '@/lib/types'
import { useEvaluation, usePieces } from '@/lib/queries'
import { useToast } from '@/components/Toast'
import { apiError } from '@/lib/api'
import { RiskGauge } from '@/components/RiskGauge'
import { FDR_FIELD_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

export function EvaluationPanel({ demande, readOnly }: { demande: DemandeDetail; readOnly?: boolean }) {
  const { data: evaluation, isLoading } = useEvaluation(demande.id)
  const { upload, remove } = usePieces(demande.id)
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const pendingType = useRef<string>('')

  function pickFile(type_requis: string) {
    pendingType.current = type_requis
    fileInput.current?.click()
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      await upload.mutateAsync({ file, type_requis: pendingType.current })
      toast('success', 'Pièce ajoutée.')
    } catch (err) {
      toast('error', apiError(err))
    }
  }

  async function onRemove(id: number) {
    try {
      await remove.mutateAsync(id)
    } catch (err) {
      toast('error', apiError(err))
    }
  }

  if (isLoading || !evaluation) return <p className="text-muted">Évaluation…</p>

  const fournis = new Set(demande.pieces.map((p) => p.type_requis))

  return (
    <div className="flex flex-col gap-6">
      {/* Scoring */}
      <section className="card-axa card-pad">
        <p className="section-title">Évaluation automatique du risque</p>
        <RiskGauge risque={evaluation.risque} />
      </section>

      {/* Indicateur de complétude */}
      <section className="card-axa card-pad">
        <div className="flex items-start gap-3">
          {evaluation.dossier_complet ? (
            <>
              <CheckCircle2 className="text-success" />
              <div>
                <p className="font-medium text-success">Dossier complet</p>
                <p className="help-text">Toutes les informations et pièces requises sont présentes.</p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="shrink-0 text-axa-red" />
              <div className="flex-1">
                <p className="font-medium text-axa-red">Dossier incomplet</p>
                <p className="help-text">Éléments restant à compléter avant l'envoi au siège :</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {evaluation.champs_fdr_manquants.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-muted">
                        Champs du formulaire FDR
                      </p>
                      <ul className="ml-4 list-disc text-sm">
                        {evaluation.champs_fdr_manquants.map((c) => (
                          <li key={c}>{FDR_FIELD_LABELS[c] ?? c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {evaluation.pieces_manquantes.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-muted">
                        Pièces justificatives
                      </p>
                      <ul className="ml-4 list-disc text-sm">
                        {evaluation.pieces_manquantes.map((p) => (
                          <li key={p.code}>{p.libelle}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Pièces requises */}
      <section className="card-axa card-pad">
        <p className="section-title">Pièces justificatives</p>
        <input ref={fileInput} type="file" className="hidden" onChange={onFile} />

        {evaluation.pieces_requises.length === 0 ? (
          <p className="help-text">Aucune pièce justificative requise pour ce dossier.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {evaluation.pieces_requises.map((p) => {
              const ok = fournis.has(p.code)
              return (
                <li
                  key={p.code}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    {ok ? (
                      <CheckCircle2 size={18} className="text-success" />
                    ) : (
                      <XCircle size={18} className="text-axa-red" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{p.libelle}</p>
                      <p className="help-text">{p.motif}</p>
                    </div>
                  </div>
                  {!readOnly && !ok && (
                    <button className="btn-ghost btn-sm" onClick={() => pickFile(p.code)}>
                      <FileUp size={14} /> Ajouter
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {/* Liste des fichiers uploadés */}
        {demande.pieces.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase text-muted">Fichiers déposés</p>
            <ul className="flex flex-col gap-1.5">
              {demande.pieces.map((piece) => (
                <li
                  key={piece.id}
                  className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm"
                >
                  <a href={piece.fichier_url} target="_blank" rel="noreferrer">
                    {piece.nom_original}
                  </a>
                  <div className="flex items-center gap-3">
                    <span className="help-text">{formatDate(piece.uploaded_at)}</span>
                    {!readOnly && (
                      <button
                        className="text-axa-red hover:opacity-70"
                        onClick={() => onRemove(piece.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
