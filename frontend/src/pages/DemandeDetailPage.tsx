import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useDemande } from '@/lib/queries'
import { useAuth } from '@/lib/auth'
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
  const { data: demande, isLoading } = useDemande(id!)
  const [tab, setTab] = useState<TabId>('fdr')

  // Onglet d'entrée selon le contexte : le siège arrive directement sur
  // « Traitement siège », et le distributeur sur le motif de refus d'un dossier
  // refusé. On ne le fait qu'une fois pour ne pas écraser les clics ultérieurs.
  const initialTabSet = useRef(false)
  useEffect(() => {
    if (initialTabSet.current || !demande) return
    initialTabSet.current = true
    if (user?.role === 'SIEGE') setTab('traitement')
    else if (demande.decision === 'REFUSEE') setTab('mon-attestation')
  }, [demande, user])

  if (isLoading || !demande) return <div className="page text-muted">Chargement…</div>

  const isSiege = user?.role === 'SIEGE'
  // Le distributeur peut éditer un brouillon, ou une demande en cours tant que
  // le siège a une demande de compléments en attente.
  const complementEnAttente =
    Boolean(demande.complement_message) || demande.complement_champs.length > 0
  const editable = !isSiege && (demande.statut === 'BROUILLON' || complementEnAttente)

  const tabs: { id: TabId; label: string; show: boolean }[] = [
    { id: 'fdr', label: 'Formulaire FDR', show: true },
    { id: 'evaluation', label: 'Évaluation & pièces', show: true },
    { id: 'validation', label: 'Validation & envoi', show: !isSiege },
    { id: 'traitement', label: 'Traitement siège', show: isSiege },
    { id: 'attestation', label: 'Attestation & IA', show: isSiege },
    { id: 'mon-attestation', label: 'Mon attestation', show: !isSiege },
  ]

  // Progression explicite entre onglets visibles (en complément de la sauvegarde auto).
  const shownTabs = tabs.filter((t) => t.show)
  const currentIndex = shownTabs.findIndex((t) => t.id === tab)
  const hasNext = currentIndex >= 0 && currentIndex < shownTabs.length - 1
  const goNext = () => {
    if (hasNext) setTab(shownTabs[currentIndex + 1].id)
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
      </div>

      {/* Onglets — collés en haut pour rester accessibles pendant la saisie. */}
      <div className="sticky top-0 z-20 mb-6 flex gap-1 overflow-x-auto border-b border-border bg-background pt-1">
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

      {tab === 'fdr' && <FdrForm demande={demande} readOnly={!editable} onNext={hasNext ? goNext : undefined} />}
      {tab === 'evaluation' && <EvaluationPanel demande={demande} readOnly={!editable} onNext={hasNext ? goNext : undefined} />}
      {tab === 'validation' && <ValidationPanel demande={demande} />}
      {tab === 'traitement' && <TraitementPanel demande={demande} />}
      {tab === 'attestation' && <AttestationPanel demande={demande} />}
      {tab === 'mon-attestation' && <MonAttestationPanel demande={demande} />}
    </div>
  )
}
