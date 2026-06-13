from datetime import timedelta

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import business_rules, pdf
from .ai_coherence import analyser_coherence
from .models import (
    AnalyseIA,
    Attestation,
    Commentaire,
    Decision,
    Demande,
    FDR,
    Notification,
    PieceJustificative,
    Statut,
    TypeAttestation,
)
from .permissions import IsOwnerOrSiege, IsSiege
from .serializers import (
    AnalyseIASerializer,
    AttestationSerializer,
    CommentaireSerializer,
    DemandeDetailSerializer,
    DemandeListSerializer,
    FDRSerializer,
    NotificationSerializer,
    PieceJustificativeSerializer,
)


def _notifier(user, demande, message):
    Notification.objects.create(destinataire=user, demande=demande, message=message)


class DemandeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwnerOrSiege]
    filterset_fields = ["statut", "decision"]
    ordering_fields = ["created_at", "submitted_at"]

    def get_queryset(self):
        user = self.request.user
        qs = (
            Demande.objects.select_related("fdr", "created_by", "attestation", "analyse_ia")
            .prefetch_related("pieces", "commentaires")
        )
        # Le distributeur ne voit que ses demandes ; le siège voit les demandes
        # soumises (EN_COURS / TRAITE) — pas les brouillons des autres.
        if user.is_siege:
            return qs.exclude(statut=Statut.BROUILLON)
        return qs.filter(created_by=user)

    def get_serializer_class(self):
        if self.action == "list":
            return DemandeListSerializer
        return DemandeDetailSerializer

    def perform_create(self, serializer):
        if not self.request.user.is_distributeur:
            raise PermissionDenied("Seul un distributeur peut créer une demande.")
        demande = serializer.save(created_by=self.request.user)
        FDR.objects.create(demande=demande)

    # ------------------------------------------------------------------ #
    # FDR
    # ------------------------------------------------------------------ #
    @action(detail=True, methods=["get", "put", "patch"])
    def fdr(self, request, pk=None):
        demande = self.get_object()
        fdr, _ = FDR.objects.get_or_create(demande=demande)
        if request.method == "GET":
            return Response(FDRSerializer(fdr).data)
        self._assert_modifiable(demande)
        partial = request.method == "PATCH"
        serializer = FDRSerializer(fdr, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    # ------------------------------------------------------------------ #
    # Évaluation (règles métier)
    # ------------------------------------------------------------------ #
    @action(detail=True, methods=["get"])
    def evaluation(self, request, pk=None):
        demande = self.get_object()
        return Response(business_rules.evaluation(demande))

    # ------------------------------------------------------------------ #
    # Pièces justificatives
    # ------------------------------------------------------------------ #
    @action(detail=True, methods=["get", "post"])
    def pieces(self, request, pk=None):
        demande = self.get_object()
        if request.method == "GET":
            pieces = demande.pieces.all()
            return Response(
                PieceJustificativeSerializer(pieces, many=True, context={"request": request}).data
            )
        self._assert_modifiable(demande)
        serializer = PieceJustificativeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(demande=demande)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="pieces/(?P<piece_id>[0-9]+)")
    def delete_piece(self, request, pk=None, piece_id=None):
        demande = self.get_object()
        self._assert_modifiable(demande)
        try:
            piece = demande.pieces.get(pk=piece_id)
        except PieceJustificative.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        piece.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ------------------------------------------------------------------ #
    # Soumission au siège : BROUILLON -> EN_COURS + génération FDR PDF
    # ------------------------------------------------------------------ #
    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        demande = self.get_object()
        if not request.user.is_distributeur:
            raise PermissionDenied("Seul le distributeur peut envoyer la demande.")
        if not business_rules.transition_autorisee(demande.statut, Statut.EN_COURS):
            raise ValidationError("La demande ne peut pas être envoyée depuis son statut actuel.")
        if not business_rules.is_dossier_complet(demande):
            raise ValidationError("Le dossier est incomplet (FDR ou pièces manquantes).")
        demande.statut = Statut.EN_COURS
        demande.submitted_at = timezone.now()
        demande.save(update_fields=["statut", "submitted_at", "updated_at"])
        _notifier(demande.created_by, demande, f"Demande {demande.reference} envoyée au siège.")
        return Response(DemandeDetailSerializer(demande, context={"request": request}).data)

    # ------------------------------------------------------------------ #
    # Décision du siège
    # ------------------------------------------------------------------ #
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsSiege])
    def decision(self, request, pk=None):
        demande = self.get_object()
        if demande.statut != Statut.EN_COURS:
            raise ValidationError("Seule une demande en cours peut être traitée.")
        # Garde-fou : un dossier incomplet n'aurait pas dû être soumis ; on refuse
        # de rendre une décision dessus (cohérence si des données legacy existent).
        if not business_rules.is_dossier_complet(demande):
            raise ValidationError("Le dossier est incomplet (FDR ou pièces manquantes).")
        decision = request.data.get("decision")
        if decision not in (Decision.ACCEPTEE, Decision.REFUSEE):
            raise ValidationError("Décision invalide.")
        motif = request.data.get("motif_refus", "").strip()
        if decision == Decision.REFUSEE and not motif:
            raise ValidationError("Le motif de refus est obligatoire.")
        demande.decision = decision
        demande.motif_refus = motif if decision == Decision.REFUSEE else ""
        demande.statut = Statut.TRAITE
        demande.traite_par = request.user
        demande.traite_at = timezone.now()
        demande.save()
        _notifier(
            demande.created_by,
            demande,
            f"Demande {demande.reference} traitée : {demande.get_decision_display()}.",
        )
        return Response(DemandeDetailSerializer(demande, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="demander-complements",
            permission_classes=[IsAuthenticated, IsSiege])
    def demander_complements(self, request, pk=None):
        demande = self.get_object()
        texte = request.data.get("texte", "").strip()
        if not texte:
            raise ValidationError("Précisez les éléments complémentaires demandés.")
        # Champs du FDR explicitement pointés par le siège (« ping »).
        champs = request.data.get("champs") or []
        if champs:
            libelles = ", ".join(business_rules.libelle_champ_fdr(c) for c in champs)
            texte = f"Champs concernés : {libelles}.\n{texte}"
        Commentaire.objects.create(demande=demande, auteur=request.user, texte=texte)
        _notifier(demande.created_by, demande,
                  f"Le siège demande des compléments sur {demande.reference}.")
        return Response({"detail": "Demande de compléments envoyée."})

    # ------------------------------------------------------------------ #
    # Commentaires
    # ------------------------------------------------------------------ #
    @action(detail=True, methods=["post"])
    def commentaires(self, request, pk=None):
        demande = self.get_object()
        texte = request.data.get("texte", "").strip()
        if not texte:
            raise ValidationError("Commentaire vide.")
        c = Commentaire.objects.create(demande=demande, auteur=request.user, texte=texte)
        return Response(CommentaireSerializer(c).data, status=status.HTTP_201_CREATED)

    # ------------------------------------------------------------------ #
    # Attestation
    # ------------------------------------------------------------------ #
    @action(detail=True, methods=["get", "put"])
    def attestation(self, request, pk=None):
        demande = self.get_object()
        attestation, _ = Attestation.objects.get_or_create(
            demande=demande, defaults={"type": TypeAttestation.DEFINITIVE}
        )
        if request.method == "GET":
            return Response(AttestationSerializer(attestation).data)
        # L'attestation est générée par le siège, une fois la demande acceptée.
        self._assert_attestation_editable(demande, request.user)
        data = {**request.data, "type": TypeAttestation.DEFINITIVE}
        serializer = AttestationSerializer(attestation, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="attestation/valider")
    def valider_attestation(self, request, pk=None):
        demande = self.get_object()
        self._assert_attestation_editable(demande, request.user)
        attestation = getattr(demande, "attestation", None)
        if attestation is None or not attestation.contenu:
            raise ValidationError("Aucune attestation à valider.")
        attestation.validee = True
        attestation.save(update_fields=["validee", "updated_at"])
        _notifier(
            demande.created_by, demande,
            f"Votre attestation pour {demande.reference} est disponible.",
        )
        return Response(AttestationSerializer(attestation).data)

    @action(detail=True, methods=["get"], url_path="attestation/pdf")
    def attestation_pdf(self, request, pk=None):
        demande = self.get_object()
        attestation = getattr(demande, "attestation", None)
        if attestation is None or not attestation.contenu:
            raise ValidationError("Aucune attestation à exporter.")
        content = pdf.attestation_pdf(demande, attestation)
        resp = HttpResponse(content, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="attestation-{demande.reference}.pdf"'
        return resp

    @action(detail=True, methods=["get"], url_path="fdr/pdf")
    def fdr_pdf(self, request, pk=None):
        demande = self.get_object()
        content = pdf.fdr_pdf(demande)
        resp = HttpResponse(content, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="fdr-{demande.reference}.pdf"'
        return resp

    # ------------------------------------------------------------------ #
    # Analyse IA
    # ------------------------------------------------------------------ #
    @action(detail=True, methods=["post"], url_path="analyse-ia",
            permission_classes=[IsAuthenticated, IsSiege])
    def analyse_ia(self, request, pk=None):
        demande = self.get_object()
        self._assert_attestation_editable(demande, request.user)
        resultat = analyser_coherence(demande)
        analyse, _ = AnalyseIA.objects.update_or_create(
            demande=demande,
            defaults={"statut": resultat["statut"], "incoherences": resultat["incoherences"]},
        )
        return Response(AnalyseIASerializer(analyse).data)

    # ------------------------------------------------------------------ #
    # Relance (délai 24h)
    # ------------------------------------------------------------------ #
    @action(detail=True, methods=["post"])
    def relance(self, request, pk=None):
        demande = self.get_object()
        if demande.statut != Statut.EN_COURS:
            raise ValidationError("Seule une demande en cours peut être relancée.")
        now = timezone.now()
        cooldown = timedelta(hours=settings.RELANCE_COOLDOWN_HOURS)
        if demande.last_relance_at and now - demande.last_relance_at < cooldown:
            prochaine = demande.last_relance_at + cooldown
            raise ValidationError(
                f"Relance déjà effectuée. Prochaine relance possible à {prochaine:%d/%m/%Y %H:%M}."
            )
        demande.last_relance_at = now
        demande.save(update_fields=["last_relance_at", "updated_at"])
        # Simulation d'envoi d'email.
        return Response({"detail": f"Relance envoyée par email pour {demande.reference}."})

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    def _assert_modifiable(self, demande):
        """Le FDR et les pièces ne sont éditables qu'au stade BROUILLON par le distributeur."""
        if demande.statut != Statut.BROUILLON:
            raise ValidationError("La demande n'est plus modifiable (déjà envoyée).")
        if not self.request.user.is_distributeur:
            raise PermissionDenied("Seul le distributeur peut modifier le dossier.")

    def _assert_attestation_editable(self, demande, user):
        """L'attestation (et l'analyse IA) est générée par le siège, une fois la demande acceptée."""
        if not user.is_siege:
            raise PermissionDenied("Seul le siège génère l'attestation.")
        if demande.decision != Decision.ACCEPTEE:
            raise ValidationError(
                "L'attestation n'est disponible qu'après acceptation de la demande."
            )


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(destinataire=self.request.user)

    @action(detail=True, methods=["post"], url_path="lue")
    def marquer_lue(self, request, pk=None):
        notif = self.get_object()
        notif.lue = True
        notif.save(update_fields=["lue"])
        return Response(NotificationSerializer(notif).data)


class ReportingView(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        user = request.user
        qs = Demande.objects.all() if user.is_siege else Demande.objects.filter(created_by=user)
        return Response({
            "total": qs.count(),
            "brouillon": qs.filter(statut=Statut.BROUILLON).count(),
            "en_cours": qs.filter(statut=Statut.EN_COURS).count(),
            "traite": qs.filter(statut=Statut.TRAITE).count(),
            "acceptees": qs.filter(decision=Decision.ACCEPTEE).count(),
            "refusees": qs.filter(decision=Decision.REFUSEE).count(),
        })
