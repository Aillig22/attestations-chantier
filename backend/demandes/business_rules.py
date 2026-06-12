"""
Règles métier centralisées de la plateforme.

Tout le calcul métier (pièces requises, complétude du dossier, scoring de risque,
transitions de statut) est défini ici et exposé via l'API. Le front ne réimplémente
aucune règle : il consomme `evaluation(demande)`.
"""

from dataclasses import dataclass, field
from decimal import Decimal

from .models import (
    FDR,
    Decision,
    Statut,
    TypeChantier,
    UsageChantier,
)

# Seuil de montant global déclenchant des pièces (10 M€).
SEUIL_MONTANT_PIECES = Decimal("10000000")


# --------------------------------------------------------------------------- #
# Pièces requises
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class PieceRequise:
    code: str
    libelle: str
    motif: str


def required_documents(fdr: FDR | None) -> list[PieceRequise]:
    """Retourne la liste des pièces requises selon les règles métier.

    Une demande nécessite des pièces si :
      1. Rénovation + modification de structure
      2. Usage "Autre"
      3. Chantier atypique
      4. Montant global > 10 M€
      5. Activité non couverte par le contrat
      6. Travaux non standards
    """
    if fdr is None:
        return []

    pieces: list[PieceRequise] = []

    if fdr.chantier_type == TypeChantier.RENOVATION and fdr.modification_structure:
        pieces.append(
            PieceRequise(
                code="STRUCTURE",
                libelle="Étude de structure / note de calcul",
                motif="Rénovation avec modification de structure",
            )
        )

    if fdr.usage == UsageChantier.AUTRE:
        pieces.append(
            PieceRequise(
                code="USAGE_AUTRE",
                libelle="Justificatif d'usage spécifique",
                motif='Usage "Autre" déclaré',
            )
        )

    if fdr.chantier_atypique:
        pieces.append(
            PieceRequise(
                code="ATYPIQUE",
                libelle="Note descriptive du caractère atypique",
                motif="Chantier déclaré atypique",
            )
        )

    if fdr.cout_total is not None and fdr.cout_total > SEUIL_MONTANT_PIECES:
        pieces.append(
            PieceRequise(
                code="MONTANT",
                libelle="Justificatif financier du chantier",
                motif="Montant global supérieur à 10 M€",
            )
        )

    if not fdr.activite_couverte:
        pieces.append(
            PieceRequise(
                code="ACTIVITE",
                libelle="Justificatif d'extension de garantie",
                motif="Activité non couverte par le contrat",
            )
        )

    if not fdr.travaux_standards:
        pieces.append(
            PieceRequise(
                code="TRAVAUX_NON_STD",
                libelle="Descriptif technique des travaux non standards",
                motif="Travaux non standards déclarés",
            )
        )

    return pieces


# --------------------------------------------------------------------------- #
# Complétude du dossier
# --------------------------------------------------------------------------- #
# Champs minimaux du FDR exigés pour considérer la saisie comme aboutie.
CHAMPS_FDR_OBLIGATOIRES = [
    "assure_nom",
    "assure_ville",
    "assure_numero_contrat",
    "chantier_nom",
    "chantier_ville",
    "chantier_type",
    "usage",
    "date_debut",
    "date_fin",
    "cout_total",
    "description_travaux",
    "type_intervention",
]


def champs_fdr_manquants(fdr: FDR | None) -> list[str]:
    if fdr is None:
        return list(CHAMPS_FDR_OBLIGATOIRES)
    manquants = [c for c in CHAMPS_FDR_OBLIGATOIRES if not getattr(fdr, c)]
    # Champs conditionnels obligatoires.
    if fdr.usage == UsageChantier.AUTRE and not fdr.usage_autre_texte:
        manquants.append("usage_autre_texte")
    if not fdr.activite_couverte and not fdr.activite_couverte_texte:
        manquants.append("activite_couverte_texte")
    return manquants


def pieces_manquantes(demande) -> list[PieceRequise]:
    """Pièces requises non encore couvertes par un upload."""
    fdr = getattr(demande, "fdr", None)
    requises = required_documents(fdr)
    codes_fournis = {
        p.type_requis for p in demande.pieces.all() if p.type_requis
    }
    return [p for p in requises if p.code not in codes_fournis]


def is_dossier_complet(demande) -> bool:
    """Le dossier est complet si le FDR minimal est saisi ET toutes les pièces
    requises sont fournies."""
    fdr = getattr(demande, "fdr", None)
    return not champs_fdr_manquants(fdr) and not pieces_manquantes(demande)


# --------------------------------------------------------------------------- #
# Scoring de risque (indicateurs fictifs)
# --------------------------------------------------------------------------- #
@dataclass
class RiskScore:
    score: int  # 0-100
    niveau: str  # FAIBLE | MOYEN | ELEVE
    facteurs: list[str] = field(default_factory=list)
    synthese: str = ""


def risk_score(fdr: FDR | None) -> RiskScore:
    """Score de risque fictif : chaque facteur de risque ajoute des points."""
    if fdr is None:
        return RiskScore(score=0, niveau="FAIBLE", facteurs=[], synthese="FDR non saisi.")

    score = 0
    facteurs: list[str] = []

    if fdr.chantier_type == TypeChantier.RENOVATION and fdr.modification_structure:
        score += 20
        facteurs.append("Rénovation avec modification de structure")
    if fdr.usage == UsageChantier.AUTRE:
        score += 15
        facteurs.append('Usage "Autre"')
    if fdr.chantier_atypique:
        score += 25
        facteurs.append("Chantier atypique")
    if fdr.cout_total is not None and fdr.cout_total > SEUIL_MONTANT_PIECES:
        score += 20
        facteurs.append("Montant global > 10 M€")
    if not fdr.activite_couverte:
        score += 25
        facteurs.append("Activité hors contrat")
    if not fdr.travaux_standards:
        score += 15
        facteurs.append("Travaux non standards")

    score = min(score, 100)

    if score >= 60:
        niveau = "ELEVE"
    elif score >= 30:
        niveau = "MOYEN"
    else:
        niveau = "FAIBLE"

    if facteurs:
        synthese = (
            f"Niveau de risque {niveau.lower()} : "
            + ", ".join(facteurs).lower()
            + "."
        )
    else:
        synthese = "Aucun facteur de risque particulier détecté."

    return RiskScore(score=score, niveau=niveau, facteurs=facteurs, synthese=synthese)


# --------------------------------------------------------------------------- #
# Transitions de statut
# --------------------------------------------------------------------------- #
TRANSITIONS_AUTORISEES: dict[str, set[str]] = {
    Statut.BROUILLON: {Statut.EN_COURS},
    Statut.EN_COURS: {Statut.TRAITE},
    Statut.TRAITE: set(),
}


def transition_autorisee(actuel: str, cible: str) -> bool:
    return cible in TRANSITIONS_AUTORISEES.get(actuel, set())


# --------------------------------------------------------------------------- #
# Évaluation agrégée (exposée à l'API)
# --------------------------------------------------------------------------- #
def evaluation(demande) -> dict:
    fdr = getattr(demande, "fdr", None)
    risk = risk_score(fdr)
    requises = required_documents(fdr)
    manquantes = pieces_manquantes(demande)
    champs_manquants = champs_fdr_manquants(fdr)
    complet = not champs_manquants and not manquantes

    return {
        "dossier_complet": complet,
        "champs_fdr_manquants": champs_manquants,
        "pieces_requises": [
            {"code": p.code, "libelle": p.libelle, "motif": p.motif} for p in requises
        ],
        "pieces_manquantes": [
            {"code": p.code, "libelle": p.libelle, "motif": p.motif}
            for p in manquantes
        ],
        "risque": {
            "score": risk.score,
            "niveau": risk.niveau,
            "facteurs": risk.facteurs,
            "synthese": risk.synthese,
        },
    }
