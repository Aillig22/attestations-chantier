import {
  DECISION_BADGE,
  RISK_LABEL,
  RISK_PILL,
  STATUT_BADGE,
  STATUT_LABELS,
  decisionLabel,
} from '@/lib/constants'
import type { Decision, Statut } from '@/lib/types'

export function StatutBadge({ statut }: { statut: Statut }) {
  return <span className={`badge ${STATUT_BADGE[statut]}`}>{STATUT_LABELS[statut]}</span>
}

export function DecisionBadge({ decision }: { decision: Decision }) {
  if (!decision) return <span className="text-muted text-xs">—</span>
  return <span className={`badge ${DECISION_BADGE[decision]}`}>{decisionLabel(decision)}</span>
}

export function RiskBadge({ niveau }: { niveau: 'FAIBLE' | 'MOYEN' | 'ELEVE' }) {
  return <span className={RISK_PILL[niveau]}>Risque {RISK_LABEL[niveau]}</span>
}
