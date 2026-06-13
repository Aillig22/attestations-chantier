import type { Decision, Statut } from './types'

export const STATUT_LABELS: Record<Statut, string> = {
  BROUILLON: 'Brouillon',
  EN_COURS: 'En cours',
  TRAITE: 'Traité',
}

/* Chips statut — Data palette AXA en teintes douces (fond pâle + texte foncé). */
export const STATUT_BADGE: Record<Statut, string> = {
  BROUILLON: 'bg-gray-100 text-gray-600',
  EN_COURS: 'bg-data-sunshine/30 text-axa-blue',
  TRAITE: 'bg-data-sky/25 text-axa-blue',
}

export const DECISION_LABELS: Record<'ACCEPTEE' | 'REFUSEE', string> = {
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
}

/* Chips décision — Leaf doux pour Acceptée, Cherry doux pour Refusée. */
export const DECISION_BADGE: Record<'ACCEPTEE' | 'REFUSEE', string> = {
  ACCEPTEE: 'bg-data-leaf/20 text-[#2f6b22]',
  REFUSEE: 'bg-data-cherry/10 text-data-cherry',
}

export function decisionLabel(d: Decision) {
  return d ? DECISION_LABELS[d] : '—'
}

export const RISK_PILL: Record<string, string> = {
  FAIBLE: 'pill-risk-faible',
  MOYEN: 'pill-risk-moyen',
  ELEVE: 'pill-risk-eleve',
}

export const RISK_LABEL: Record<string, string> = {
  FAIBLE: 'Faible',
  MOYEN: 'Moyen',
  ELEVE: 'Élevé',
}

// Libellés lisibles des champs FDR (pour les messages de complétude / IA).
export const FDR_FIELD_LABELS: Record<string, string> = {
  assure_nom: "Nom de l'assuré",
  assure_ville: "Ville de l'assuré",
  assure_numero_contrat: 'Numéro de contrat',
  chantier_nom: 'Nom du chantier',
  chantier_ville: 'Ville du chantier',
  chantier_type: 'Type de chantier',
  usage: 'Usage',
  usage_autre_texte: "Précision de l'usage",
  date_debut: 'Date de début',
  date_fin: 'Date de fin',
  cout_total: 'Coût total',
  description_travaux: 'Description des travaux',
  type_intervention: "Type d'intervention",
  activite_couverte_texte: 'Précision activité hors contrat',
}
