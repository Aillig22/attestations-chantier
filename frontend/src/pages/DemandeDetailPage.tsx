import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bell, FileDown } from 'lucide-react'
import { useDemande, useDemandeAction } from '@/lib/queries'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/components/Toast'
import { apiError } from '@/lib/api'
import { downloadFdrPdf } from '@/lib/pdf'
import { DecisionBadge, StatutBadge } from '@/components/Badges'
import { FdrForm } from './demande/FdrForm'
import { EvaluationPanel } from './demande/EvaluationPanel'
import { ValidationPanel } from './demande/ValidationPanel'
import { TraitementPanel } from './demande/TraitementPanel'
import { AttestationPanel } from './demande/AttestationPanel'
import { MonAttestationPanel } from './demande/MonAttestationPanel'

type TabId = 'fdr' | 'evaluation' | 'validation' | 'traitement' | 'attestation' | 'mon-attestation'

export function DemandeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const { data: demande, isLoading } = useDemande(id!)
  const { relance } = useDemandeAction(id!)
  const [tab, setTab] = useState<TabId>('fdr')

  if (isLoading || !demande) return <div className="page text-muted">Chargement…</div>

  const isSiege = user?.role === 'SIEGE'
  const editable = !isSiege && demande.statut === 'BROUILLON'

  const tabs: { id: TabId; label: string; show: boolean }[] = [
    { id: 'fdr', label: 'Formulaire FDR', show: true },
    { id: 'evaluation', label: 'Évaluation & pièces', show: true },
    { id: 'validation', label: 'Validation & envoi', show: !isSiege },
    { id: 'traitement', label: 'Traitement siège', show: isSiege },
    { id: 'attestation', label: 'Attestation & IA', show: isSiege },
    { id: 'mon-attestation', label: 'Mon attestation', show: !isSiege },
  ]

  async function onRelance() {
    try {
      const res = await relance.mutateAsync()
      toast('success', res.detail)
    } catch (err) {
      toast('error', apiError(err))
    }
  }

  async function exportFdrPdf() {
    try {
      await downloadFdrPdf(id!, demande?.reference ?? String(id))
    } catch (err) {
      toast('error', apiError(err))
    }
  }

  return (
    <div className="page">
      <button onClick={() => navigate('/')} className="mb-4 flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={16} /> Retour à la liste
      </button>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1>{demande.reference}</h1>
            <StatutBadge statut={demande.statut} />
            <DecisionBadge decision={demande.decision} />
          </div>
          <p className="text-sm text-muted">
            {demande.fdr.assure_nom || 'Assuré non renseigné'} — créée par {demande.created_by_nom}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost btn-sm" onClick={exportFdrPdf}>
            <FileDown size={14} /> FDR PDF
          </button>
          {!isSiege && demande.statut === 'EN_COURS' && (
            <button className="btn-ghost btn-sm" onClick={onRelance} disabled={relance.isPending}>
              <Bell size={14} /> Relancer
            </button>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-axa-blue text-axa-blue'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'fdr' && <FdrForm demande={demande} readOnly={!editable} />}
      {tab === 'evaluation' && <EvaluationPanel demande={demande} readOnly={!editable} />}
      {tab === 'validation' && <ValidationPanel demande={demande} />}
      {tab === 'traitement' && <TraitementPanel demande={demande} />}
      {tab === 'attestation' && <AttestationPanel demande={demande} />}
      {tab === 'mon-attestation' && <MonAttestationPanel demande={demande} />}
    </div>
  )
}
