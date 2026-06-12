from django.contrib import admin

from .models import (
    AnalyseIA,
    Attestation,
    Commentaire,
    Demande,
    FDR,
    Notification,
    PieceJustificative,
)


@admin.register(Demande)
class DemandeAdmin(admin.ModelAdmin):
    list_display = ("reference", "statut", "decision", "created_by", "created_at")
    list_filter = ("statut", "decision")
    search_fields = ("reference",)


admin.site.register([FDR, PieceJustificative, Attestation, AnalyseIA, Commentaire, Notification])
