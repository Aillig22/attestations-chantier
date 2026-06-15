import { CheckCircle2 } from 'lucide-react'
import logoAxa from '@/assets/axa_white_logo.svg'
import type { DemandeDetail, Attestation } from '@/lib/types'

/**
 * Aperçu fidèle au PDF généré côté backend (templates/pdf/base.html +
 * attestation.html). On reproduit en Tailwind le bandeau AXA, l'accent rouge,
 * la méta référence/date, la pill de type et l'encart de validation, afin que
 * la prévisualisation reflète réellement le document final.
 */
export function AttestationPreview({
  html,
  demande,
  type,
  validee,
}: {
  html: string
  demande: DemandeDetail
  type: Attestation['type']
  validee: boolean
}) {
  // Même format que le PDF : « d/m/Y à H:i ».
  const now = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const today = `${p(now.getDate())}/${p(now.getMonth() + 1)}/${now.getFullYear()} à ${p(
    now.getHours(),
  )}:${p(now.getMinutes())}`

  return (
    <div className="min-h-80 bg-background p-4 sm:p-6">
      {/* Feuille A4 */}
      <div className="mx-auto max-w-[210mm] bg-surface shadow-md">
        {/* Bandeau AXA */}
        <div className="flex items-center gap-3 bg-axa-blue px-5 py-2.5">
          <img src={logoAxa} alt="AXA" className="h-11 w-11 shrink-0" />
          <span className="text-sm font-bold text-white">Attestations de chantier</span>
        </div>
        <div className="h-1.5 bg-axa-red" />

        {/* Corps */}
        <div className="px-6 py-5 sm:px-10">
          <p className="mb-3 text-xs text-muted">
            Référence : <strong className="text-foreground">{demande.reference}</strong> · Généré le{' '}
            {today}
          </p>

          <p className="mb-4">
            <span className="bg-axa-blue-light px-2 py-0.5 text-xs font-bold text-axa-blue">
              {type === 'DEFINITIVE' ? 'Définitive' : 'Provisoire'}
            </span>
          </p>

          <div className="prose-axa" dangerouslySetInnerHTML={{ __html: html || '<p>—</p>' }} />

          {validee ? (
            <div className="mt-8 flex justify-end">
              <div className="border-2 border-success bg-green-50 px-4 py-2.5">
                <p className="flex items-center gap-1.5 text-sm font-bold text-success">
                  <CheckCircle2 size={15} /> Attestation validée
                </p>
                <p className="text-xs text-green-700">
                  Document authentifié par le siège AXA — {demande.reference}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-8 border-l-4 border-warning bg-amber-50 px-3 py-2 text-xs text-warning">
              Document de travail — cette attestation n'a pas encore été validée par le siège.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
