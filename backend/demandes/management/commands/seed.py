from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from demandes.models import (
    Attestation,
    Decision,
    Demande,
    FDR,
    Statut,
    TypeChantier,
    TypeIntervention,
    UsageChantier,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Crée les comptes de démo et quelques demandes d'exemple."

    def handle(self, *args, **options):
        # --- Utilisateurs de démo ---
        agent, created = User.objects.get_or_create(
            username="agent",
            defaults={
                "first_name": "Alice",
                "last_name": "Martin",
                "email": "agent@axa-demo.fr",
                "role": "DISTRIBUTEUR",
            },
        )
        agent.set_password("demo1234")
        agent.save()

        siege, _ = User.objects.get_or_create(
            username="siege",
            defaults={
                "first_name": "Bruno",
                "last_name": "Lefevre",
                "email": "siege@axa-demo.fr",
                "role": "SIEGE",
            },
        )
        siege.set_password("demo1234")
        siege.save()

        admin, _ = User.objects.get_or_create(
            username="admin",
            defaults={"is_staff": True, "is_superuser": True, "role": "SIEGE"},
        )
        admin.set_password("admin1234")
        admin.save()

        # --- Demandes d'exemple ---
        if Demande.objects.exists():
            self.stdout.write(self.style.WARNING("Demandes déjà présentes, seed des demandes ignoré."))
            self._done()
            return

        # 1. Brouillon simple (faible risque, dossier complet)
        d1 = Demande.objects.create(created_by=agent, statut=Statut.BROUILLON)
        FDR.objects.create(
            demande=d1,
            assure_nom="SCI Les Tilleuls",
            assure_ville="Lyon",
            assure_numero_contrat="CT-2024-0098",
            chantier_nom="Résidence Bellevue",
            chantier_ville="Villeurbanne",
            chantier_type=TypeChantier.NEUVE,
            usage=UsageChantier.HABITATION,
            date_debut=date(2026, 1, 10),
            date_fin=date(2026, 9, 30),
            cout_total=850000,
            description_travaux="Construction d'un immeuble de 12 logements.",
            montant_prestation=850000,
            type_intervention=TypeIntervention.ENTREPRISE_PRINCIPALE,
            activite_couverte=True,
            travaux_standards=True,
        )

        # 2. En cours (risque élevé : atypique + >10M + activité hors contrat)
        d2 = Demande.objects.create(
            created_by=agent, statut=Statut.EN_COURS, submitted_at=timezone.now()
        )
        FDR.objects.create(
            demande=d2,
            assure_nom="BTP Grand Est SA",
            assure_ville="Strasbourg",
            assure_numero_contrat="CT-2023-1450",
            chantier_nom="Tour Horizon",
            chantier_ville="Strasbourg",
            chantier_type=TypeChantier.NEUVE,
            usage=UsageChantier.BUREAU,
            chantier_atypique=True,
            date_debut=date(2026, 3, 1),
            date_fin=date(2028, 6, 30),
            cout_total=15000000,
            description_travaux="Construction d'une tour de bureaux de 30 étages.",
            montant_prestation=4000000,
            type_intervention=TypeIntervention.SOUS_TRAITANT,
            activite_couverte=False,
            activite_couverte_texte="Activité de génie civil non incluse au contrat initial.",
            travaux_standards=False,
        )

        # 3. Traité / accepté
        d3 = Demande.objects.create(
            created_by=agent,
            statut=Statut.TRAITE,
            decision=Decision.ACCEPTEE,
            submitted_at=timezone.now(),
            traite_par=siege,
            traite_at=timezone.now(),
        )
        fdr3 = FDR.objects.create(
            demande=d3,
            assure_nom="Dupont Rénovation",
            assure_ville="Nantes",
            assure_numero_contrat="CT-2025-0321",
            chantier_nom="Maison Quai de Loire",
            chantier_ville="Nantes",
            chantier_type=TypeChantier.RENOVATION,
            modification_structure=False,
            usage=UsageChantier.HABITATION,
            date_debut=date(2026, 2, 1),
            date_fin=date(2026, 5, 15),
            cout_total=120000,
            description_travaux="Rénovation complète d'une maison de ville.",
            montant_prestation=120000,
            type_intervention=TypeIntervention.ENTREPRISE_PRINCIPALE,
            activite_couverte=True,
            travaux_standards=True,
        )
        Attestation.objects.create(
            demande=d3,
            type="DEFINITIVE",
            validee=True,
            contenu=(
                f"<h2>Attestation de chantier</h2>"
                f"<p>Nous attestons que <strong>{fdr3.assure_nom}</strong>, "
                f"situé à {fdr3.assure_ville}, est couvert pour le chantier "
                f"<strong>{fdr3.chantier_nom}</strong> à {fdr3.chantier_ville}.</p>"
                f"<p>Travaux : {fdr3.description_travaux}</p>"
                f"<p>Période : du {fdr3.date_debut} au {fdr3.date_fin}.</p>"
            ),
        )

        self.stdout.write(self.style.SUCCESS("3 demandes d'exemple créées."))
        self._done()

    def _done(self):
        self.stdout.write(self.style.SUCCESS("Seed terminé."))
        self.stdout.write("Comptes : agent/demo1234 (distributeur), siege/demo1234 (siège), admin/admin1234.")
