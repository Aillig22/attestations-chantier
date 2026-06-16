"""
Génération PDF (FDR + attestation).

On utilise xhtml2pdf (pur Python, sans dépendance système) pour transformer un
gabarit HTML en PDF — robuste en local comme sur la plateforme d'hébergement.
"""

import base64
from functools import lru_cache
from io import BytesIO
from pathlib import Path

from django.template.loader import render_to_string
from xhtml2pdf import pisa

_LOGO_PATH = Path(__file__).resolve().parent / "pdf_assets" / "axa-white.png"


@lru_cache(maxsize=1)
def _logo_data_uri() -> str:
    """Logo AXA encodé en data URI (embarqué dans le PDF, pas de fichier externe)."""
    data = base64.b64encode(_LOGO_PATH.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{data}"


def _block_external(uri, rel):
    """Refuse toute ressource externe lors du rendu PDF.

    Le logo et les styles sont embarqués (data URI / CSS inline), gérés par
    xhtml2pdf sans passer par ce callback. Tout autre URI (`file://`, `http(s)://`,
    chemin local) provient donc du contenu HTML utilisateur : on le bloque pour
    empêcher la lecture de fichiers locaux (LFI) ou des requêtes internes (SSRF).
    """
    raise OSError(f"Ressource externe refusée dans le rendu PDF : {uri!r}")


def _render_pdf(html: str) -> bytes:
    buffer = BytesIO()
    pisa.CreatePDF(src=html, dest=buffer, encoding="utf-8", link_callback=_block_external)
    return buffer.getvalue()


def fdr_pdf(demande) -> bytes:
    html = render_to_string(
        "pdf/fdr.html",
        {"demande": demande, "fdr": getattr(demande, "fdr", None), "logo_data_uri": _logo_data_uri()},
    )
    return _render_pdf(html)


def attestation_pdf(demande, attestation) -> bytes:
    html = render_to_string(
        "pdf/attestation.html",
        {
            "demande": demande,
            "attestation": attestation,
            "fdr": getattr(demande, "fdr", None),
            "logo_data_uri": _logo_data_uri(),
        },
    )
    return _render_pdf(html)
