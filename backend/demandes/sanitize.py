"""
Nettoyage du HTML riche (contenu d'attestation issu de l'éditeur TipTap).

Le contenu est saisi par le siège puis affiché dans le navigateur du distributeur
et injecté dans le PDF : il doit être assaini côté serveur pour empêcher tout XSS
persistant (balises <script>, attributs `on*`, `javascript:`, ressources externes).
"""

import nh3

# Balises produites par l'éditeur TipTap (titres, mise en forme, listes, tableaux).
_ALLOWED_TAGS = {
    "p", "br", "span", "strong", "b", "em", "i", "u", "s", "mark",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "hr",
    "table", "thead", "tbody", "tr", "th", "td",
}

# Attributs autorisés : uniquement le style inline (couleur/alignement TipTap).
# Pas de `href`/`src` : aucune ressource externe ni lien n'est nécessaire.
_ALLOWED_ATTRS = {
    "*": {"style"},
    "th": {"colspan", "rowspan"},
    "td": {"colspan", "rowspan"},
}


def clean_html(html: str) -> str:
    """Retourne une version assainie du HTML (balises/attributs en liste blanche)."""
    if not html:
        return ""
    return nh3.clean(html, tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRS)
