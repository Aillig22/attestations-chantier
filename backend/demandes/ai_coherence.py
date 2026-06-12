"""
Analyse de cohérence FDR ↔ Attestation (IA simulée).

L'attestation est un contenu HTML riche. On en extrait le texte brut, puis on
vérifie que les données clés du FDR (nom assuré, chantier, ville, dates, travaux)
y figurent bien. Toute donnée du FDR absente du texte de l'attestation est
remontée comme incohérence.

Le module est volontairement isolé : il pourrait être remplacé par un véritable
appel LLM (API Claude) sans changer le reste de l'application — cf. README.
"""

import re
from html import unescape

from .models import StatutCoherence


def _html_to_text(html: str) -> str:
    """Extraction simple du texte d'un contenu HTML (sans dépendance externe)."""
    if not html:
        return ""
    text = re.sub(r"<[^>]+>", " ", html)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).lower()


def analyser_coherence(demande) -> dict:
    """Compare le FDR à l'attestation et retourne statut + liste d'incohérences."""
    fdr = getattr(demande, "fdr", None)
    attestation = getattr(demande, "attestation", None)

    incoherences: list[dict] = []

    if attestation is None or not attestation.contenu:
        return {
            "statut": StatutCoherence.INCOHERENCES,
            "incoherences": [
                {
                    "champ": "attestation",
                    "message": "Aucune attestation rédigée à analyser.",
                    "attendu": "",
                    "trouve": "",
                }
            ],
        }

    texte = _normalize(_html_to_text(attestation.contenu))

    # (champ technique, libellé, valeur attendue issue du FDR)
    verifications = [
        ("assure_nom", "Nom de l'assuré", fdr.assure_nom if fdr else ""),
        ("chantier_nom", "Nom du chantier", fdr.chantier_nom if fdr else ""),
        ("chantier_ville", "Ville du chantier", fdr.chantier_ville if fdr else ""),
        ("description_travaux", "Travaux", fdr.description_travaux if fdr else ""),
    ]

    for champ, libelle, valeur in verifications:
        valeur_norm = _normalize(valeur)
        if not valeur_norm:
            continue  # donnée FDR vide : non vérifiable, ignorée
        if valeur_norm not in texte:
            incoherences.append(
                {
                    "champ": champ,
                    "message": f"{libelle} du FDR absent ou divergent dans l'attestation.",
                    "attendu": valeur,
                    "trouve": "",
                }
            )

    # Vérification des dates (présence de l'année de début/fin).
    if fdr and fdr.date_debut and str(fdr.date_debut.year) not in texte:
        incoherences.append(
            {
                "champ": "date_debut",
                "message": "Date de début de chantier non mentionnée dans l'attestation.",
                "attendu": str(fdr.date_debut),
                "trouve": "",
            }
        )

    statut = (
        StatutCoherence.COHERENT
        if not incoherences
        else StatutCoherence.INCOHERENCES
    )
    return {"statut": statut, "incoherences": incoherences}
