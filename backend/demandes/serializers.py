from rest_framework import serializers

from . import business_rules
from .models import (
    Attestation,
    AnalyseIA,
    Commentaire,
    Demande,
    FDR,
    Notification,
    PieceJustificative,
)


class FDRSerializer(serializers.ModelSerializer):
    class Meta:
        model = FDR
        exclude = ("id", "demande", "updated_at")


class PieceJustificativeSerializer(serializers.ModelSerializer):
    fichier_url = serializers.SerializerMethodField()

    class Meta:
        model = PieceJustificative
        fields = (
            "id",
            "fichier",
            "fichier_url",
            "nom_original",
            "type_requis",
            "uploaded_at",
        )
        read_only_fields = ("nom_original", "uploaded_at")
        extra_kwargs = {"fichier": {"write_only": True}}

    def get_fichier_url(self, obj):
        request = self.context.get("request")
        if obj.fichier and request:
            return request.build_absolute_uri(obj.fichier.url)
        return obj.fichier.url if obj.fichier else None

    def create(self, validated_data):
        fichier = validated_data.get("fichier")
        if fichier and not validated_data.get("nom_original"):
            validated_data["nom_original"] = fichier.name
        return super().create(validated_data)


class AttestationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attestation
        fields = ("id", "contenu", "type", "validee", "created_at", "updated_at")
        read_only_fields = ("validee", "created_at", "updated_at")


class AnalyseIASerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyseIA
        fields = ("statut", "incoherences", "analyzed_at")


class CommentaireSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source="auteur.get_full_name", read_only=True)
    auteur_role = serializers.CharField(source="auteur.role", read_only=True)

    class Meta:
        model = Commentaire
        fields = ("id", "texte", "auteur_nom", "auteur_role", "created_at")
        read_only_fields = ("auteur_nom", "auteur_role", "created_at")


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "message", "demande", "lue", "created_at")


class DemandeListSerializer(serializers.ModelSerializer):
    """Vue allégée pour la liste."""

    assure_nom = serializers.CharField(source="fdr.assure_nom", read_only=True, default="")
    chantier_nom = serializers.CharField(source="fdr.chantier_nom", read_only=True, default="")
    created_by_nom = serializers.CharField(source="created_by.get_full_name", read_only=True)
    # Adresse de contact du siège (pour la relance) — fournie via le contexte.
    siege_email = serializers.SerializerMethodField()

    def get_siege_email(self, obj):
        return self.context.get("siege_email", "")

    class Meta:
        model = Demande
        fields = (
            "id",
            "reference",
            "statut",
            "decision",
            "assure_nom",
            "chantier_nom",
            "created_by_nom",
            "created_at",
            "submitted_at",
            "last_relance_at",
            "siege_email",
        )


class DemandeDetailSerializer(serializers.ModelSerializer):
    fdr = FDRSerializer(read_only=True)
    pieces = PieceJustificativeSerializer(many=True, read_only=True)
    attestation = AttestationSerializer(read_only=True)
    analyse_ia = AnalyseIASerializer(read_only=True)
    commentaires = CommentaireSerializer(many=True, read_only=True)
    created_by_nom = serializers.CharField(source="created_by.get_full_name", read_only=True)
    siege_email = serializers.SerializerMethodField()
    evaluation = serializers.SerializerMethodField()

    def get_siege_email(self, obj):
        return self.context.get("siege_email", "")

    class Meta:
        model = Demande
        fields = (
            "id",
            "reference",
            "statut",
            "decision",
            "motif_refus",
            "created_by_nom",
            "created_at",
            "updated_at",
            "submitted_at",
            "traite_at",
            "last_relance_at",
            "complement_message",
            "complement_champs",
            "siege_email",
            "fdr",
            "pieces",
            "attestation",
            "analyse_ia",
            "commentaires",
            "evaluation",
        )

    def get_evaluation(self, obj):
        return business_rules.evaluation(obj)
