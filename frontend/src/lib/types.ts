export type Role = 'DISTRIBUTEUR' | 'SIEGE'
export type Statut = 'BROUILLON' | 'EN_COURS' | 'TRAITE'
export type Decision = 'ACCEPTEE' | 'REFUSEE' | null
export type TypeChantier = 'NEUVE' | 'RENOVATION' | ''
export type UsageChantier = 'HABITATION' | 'BUREAU' | 'COMMERCE' | 'AUTRE' | ''
export type TypeIntervention = 'ENTREPRISE_PRINCIPALE' | 'SOUS_TRAITANT' | ''

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  nom_complet: string
  role: Role
}

export interface FDR {
  assure_nom: string
  assure_ville: string
  assure_numero_contrat: string
  chantier_nom: string
  chantier_ville: string
  chantier_type: TypeChantier
  modification_structure: boolean
  usage: UsageChantier
  usage_autre_texte: string
  chantier_atypique: boolean
  date_debut: string | null
  date_fin: string | null
  cout_total: string | null
  description_travaux: string
  montant_prestation: string | null
  type_intervention: TypeIntervention
  activite_couverte: boolean
  activite_couverte_texte: string
  travaux_standards: boolean
}

export interface Piece {
  id: number
  fichier_url: string
  nom_original: string
  type_requis: string
  uploaded_at: string
}

export interface PieceRequise {
  code: string
  libelle: string
  motif: string
}

export interface Evaluation {
  dossier_complet: boolean
  champs_fdr_manquants: string[]
  pieces_requises: PieceRequise[]
  pieces_manquantes: PieceRequise[]
  risque: {
    score: number
    niveau: 'FAIBLE' | 'MOYEN' | 'ELEVE'
    facteurs: string[]
    synthese: string
  }
}

export interface Attestation {
  id: number
  contenu: string
  type: 'PROJET' | 'DEFINITIVE'
  validee: boolean
  created_at: string
  updated_at: string
}

export interface Incoherence {
  champ: string
  message: string
  attendu: string
  trouve: string
}

export interface AnalyseIA {
  statut: 'COHERENT' | 'INCOHERENCES'
  incoherences: Incoherence[]
  analyzed_at: string
}

export interface Commentaire {
  id: number
  texte: string
  auteur_nom: string
  auteur_role: Role
  created_at: string
}

export interface DemandeListItem {
  id: number
  reference: string
  statut: Statut
  decision: Decision
  assure_nom: string
  chantier_nom: string
  created_by_nom: string
  created_at: string
  submitted_at: string | null
  last_relance_at: string | null
  siege_email: string
}

export interface DemandeDetail extends DemandeListItem {
  motif_refus: string
  updated_at: string
  traite_at: string | null
  complement_message: string
  complement_champs: string[]
  fdr: FDR
  pieces: Piece[]
  attestation: Attestation | null
  analyse_ia: AnalyseIA | null
  commentaires: Commentaire[]
  evaluation: Evaluation
}

export interface Notification {
  id: number
  message: string
  demande: number | null
  lue: boolean
  created_at: string
}

export interface ReportingData {
  role: Role
  kpis: {
    total: number
    brouillon: number
    en_cours: number
    traite: number
    acceptees: number
    refusees: number
    taux_acceptation: number | null
    delai_moyen_traitement_jours: number | null
  }
  par_statut: { statut: Statut; label: string; count: number }[]
  par_decision: { decision: string; label: string; count: number }[]
  par_risque: { niveau: 'FAIBLE' | 'MOYEN' | 'ELEVE'; label: string; count: number }[]
  evolution: { mois: string; creees: number; traitees: number }[]
  top_motifs_refus?: { motif: string; count: number }[]
  par_distributeur?: { nom: string; total: number; acceptees: number }[]
}
