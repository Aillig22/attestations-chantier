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

_LOGO_PATH = Path(__file__).resolve().parent / "pdf_assets" / "logo-axa.png"


@lru_cache(maxsize=1)
def _logo_data_uri() -> str:
    """Logo AXA encodé en data URI (embarqué dans le PDF, pas de fichier externe)."""
    data = base64.b64encode(_LOGO_PATH.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{data}"


def _render_pdf(html: str) -> bytes:
    buffer = BytesIO()
    pisa.CreatePDF(src=html, dest=buffer, encoding="utf-8")
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
