from django.conf import settings
from django.db import models


# --------------------------------------------------------------------------- #
# Énumérations métier
# --------------------------------------------------------------------------- #
class Statut(models.TextChoices):
    BROUILLON = "BROUILLON", "Brouillon"
    EN_COURS = "EN_COURS", "En cours"
    TRAITE = "TRAITE", "Traité"


class Decision(models.TextChoices):
    ACCEPTEE = "ACCEPTEE", "Acceptée"
    REFUSEE = "REFUSEE", "Refusée"


class TypeChantier(models.TextChoices):
    NEUVE = "NEUVE", "Construction neuve"
    RENOVATION = "RENOVATION", "Rénovation"


class UsageChantier(models.TextChoices):
    HABITATION = "HABITATION", "Habitation"
    BUREAU = "BUREAU", "Bureau"
    COMMERCE = "COMMERCE", "Commerce"
    AUTRE = "AUTRE", "Autre"


class TypeIntervention(models.TextChoices):
    ENTREPRISE_PRINCIPALE = "ENTREPRISE_PRINCIPALE", "Entreprise principale"
    SOUS_TRAITANT = "SOUS_TRAITANT", "Sous-traitant"


# --------------------------------------------------------------------------- #
# Demande
# --------------------------------------------------------------------------- #
class Demande(models.Model):
    """Demande d'attestation de chantier — pilote le cycle de vie."""

    reference = models.CharField(max_length=20, unique=True, blank=True)
    statut = models.CharField(
        max_length=20, choices=Statut.choices, default=Statut.BROUILLON
    )
    decision = models.CharField(
        max_length=20, choices=Decision.choices, blank=True, null=True
    )
    motif_refus = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="demandes",
    )
    traite_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="demandes_traitees",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(blank=True, null=True)
    traite_at = models.DateTimeField(blank=True, null=True)

    # Gestion de la relance : on stocke la dernière relance pour appliquer le délai 24h.
    last_relance_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.reference:
            # Référence lisible type AC-2026-000042 (générée après le 1er save).
            super().save(*args, **kwargs)
            self.reference = f"AC-{self.created_at.year}-{self.pk:06d}"
            return super().save(update_fields=["reference"])
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.reference or f"Demande #{self.pk}"


# --------------------------------------------------------------------------- #
# Formulaire de Déclaration du Risque (FDR)
# --------------------------------------------------------------------------- #
class FDR(models.Model):
    """Formulaire métier rattaché à une demande (1-1)."""

    demande = models.OneToOneField(
        Demande, on_delete=models.CASCADE, related_name="fdr"
    )

    # --- Assuré ---
    assure_nom = models.CharField("Nom / raison sociale", max_length=255, blank=True)
    assure_ville = models.CharField(max_length=255, blank=True)
    assure_numero_contrat = models.CharField(max_length=100, blank=True)

    # --- Chantier ---
    chantier_nom = models.CharField(max_length=255, blank=True)
    chantier_ville = models.CharField(max_length=255, blank=True)
    chantier_type = models.CharField(
        max_length=20, choices=TypeChantier.choices, blank=True
    )
    modification_structure = models.BooleanField(default=False)  # si rénovation

    usage = models.CharField(max_length=20, choices=UsageChantier.choices, blank=True)
    usage_autre_texte = models.CharField(max_length=255, blank=True)

    chantier_atypique = models.BooleanField(default=False)

    date_debut = models.DateField(blank=True, null=True)
    date_fin = models.DateField(blank=True, null=True)

    cout_total = models.DecimalField(
        max_digits=14, decimal_places=2, blank=True, null=True
    )

    # --- Intervention ---
    description_travaux = models.TextField(blank=True)
    montant_prestation = models.DecimalField(
        max_digits=14, decimal_places=2, blank=True, null=True
    )
    type_intervention = models.CharField(
        max_length=30, choices=TypeIntervention.choices, blank=True
    )

    activite_couverte = models.BooleanField(default=True)
    activite_couverte_texte = models.TextField(blank=True)  # obligatoire si non couverte
    travaux_standards = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"FDR {self.demande.reference}"


# --------------------------------------------------------------------------- #
# Pièces justificatives
# --------------------------------------------------------------------------- #
class PieceJustificative(models.Model):
    demande = models.ForeignKey(
        Demande, on_delete=models.CASCADE, related_name="pieces"
    )
    fichier = models.FileField(upload_to="pieces/%Y/%m/")
    nom_original = models.CharField(max_length=255, blank=True)
    # Type de pièce requise auquel ce fichier répond (libellé issu des règles métier).
    type_requis = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self) -> str:
        return self.nom_original or self.fichier.name


# --------------------------------------------------------------------------- #
# Attestation
# --------------------------------------------------------------------------- #
class TypeAttestation(models.TextChoices):
    PROJET = "PROJET", "Projet (distributeur)"
    DEFINITIVE = "DEFINITIVE", "Définitive (siège)"


class Attestation(models.Model):
    demande = models.OneToOneField(
        Demande, on_delete=models.CASCADE, related_name="attestation"
    )
    contenu = models.TextField(blank=True)  # HTML riche (TipTap)
    type = models.CharField(
        max_length=20, choices=TypeAttestation.choices, default=TypeAttestation.PROJET
    )
    validee = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Attestation {self.demande.reference} ({self.type})"


# --------------------------------------------------------------------------- #
# Analyse IA (simulée)
# --------------------------------------------------------------------------- #
class StatutCoherence(models.TextChoices):
    COHERENT = "COHERENT", "Cohérent"
    INCOHERENCES = "INCOHERENCES", "Incohérences détectées"


class AnalyseIA(models.Model):
    demande = models.OneToOneField(
        Demande, on_delete=models.CASCADE, related_name="analyse_ia"
    )
    statut = models.CharField(max_length=20, choices=StatutCoherence.choices)
    incoherences = models.JSONField(default=list)  # liste de {champ, attendu, trouve, message}
    analyzed_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Analyse IA {self.demande.reference} : {self.statut}"


# --------------------------------------------------------------------------- #
# Commentaires & Notifications
# --------------------------------------------------------------------------- #
class Commentaire(models.Model):
    demande = models.ForeignKey(
        Demande, on_delete=models.CASCADE, related_name="commentaires"
    )
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="commentaires"
    )
    texte = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class Notification(models.Model):
    destinataire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    demande = models.ForeignKey(
        Demande, on_delete=models.CASCADE, related_name="notifications", null=True
    )
    message = models.CharField(max_length=500)
    lue = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
