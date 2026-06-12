"""
Génération PDF (FDR + attestation).

On utilise xhtml2pdf (pur Python, sans dépendance système) pour transformer un
gabarit HTML en PDF — robuste en local comme sur la plateforme d'hébergement.
"""

from io import BytesIO

from django.template.loader import render_to_string
from xhtml2pdf import pisa


def _render_pdf(html: str) -> bytes:
    buffer = BytesIO()
    pisa.CreatePDF(src=html, dest=buffer, encoding="utf-8")
    return buffer.getvalue()


def fdr_pdf(demande) -> bytes:
    html = render_to_string("pdf/fdr.html", {"demande": demande, "fdr": getattr(demande, "fdr", None)})
    return _render_pdf(html)


def attestation_pdf(demande, attestation) -> bytes:
    html = render_to_string(
        "pdf/attestation.html",
        {"demande": demande, "attestation": attestation, "fdr": getattr(demande, "fdr", None)},
    )
    return _render_pdf(html)
