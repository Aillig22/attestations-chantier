import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import type { DemandeDetail } from '@/lib/types'
import { useAttestation } from '@/lib/queries'
import { useToast } from '@/components/Toast'
import { downloadAttestationPdf } from '@/lib/pdf'
import { apiError } from '@/lib/api'

/**
 * Vue distributeur en lecture seule : permet de consulter et télécharger
 * l'attestation une fois validée par le siège.
 */
export function MonAttestationPanel({ demande }: { demande: DemandeDetail }) {
  const { query } = useAttestation(demande.id)
  const toast = useToast()
  const [downloading, setDownloading] = useState(false)

  const attestation = query.data
  const disponible = Boolean(attestation?.validee && attestation?.contenu)

  async function download() {
    setDownloading(true)
    try {
      await downloadAttestationPdf(demande.id, demande.reference)
    } catch (err) {
      toast('error', apiError(err))
    } finally {
      setDownloading(false)
    }
  }

  if (query.isLoading) {
    return <p className="text-muted">Chargement…</p>
  }

  if (!disponible) {
    return (
      <section className="card-axa card-pad flex flex-col items-center gap-3 text-center">
        <FileText size={28} className="text-muted" />
        <p className="font-medium">Attestation en attente</p>
        <p className="help-text max-w-md">
          Votre attestation sera disponible ici une fois validée par le siège.
        </p>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="section-title mb-0">Votre attestation</p>
        <button className="btn-primary btn-sm" onClick={download} disabled={downloading}>
          <Download size={14} /> {downloading ? 'Téléchargement…' : 'Télécharger le PDF'}
        </button>
      </div>
      <section className="card-axa card-pad">
        <div
          className="prose-axa"
          dangerouslySetInnerHTML={{ __html: attestation!.contenu }}
        />
      </section>
    </div>
  )
}
