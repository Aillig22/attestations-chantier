from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from . import business_rules
from .models import (
    Decision,
    Demande,
    FDR,
    Statut,
    TypeChantier,
    UsageChantier,
)

User = get_user_model()


def make_fdr(demande, **overrides):
    defaults = dict(
        assure_nom="ACME",
        assure_ville="Paris",
        assure_numero_contrat="CT-1",
        chantier_nom="Chantier A",
        chantier_ville="Paris",
        chantier_type=TypeChantier.NEUVE,
        usage=UsageChantier.HABITATION,
        date_debut=date(2026, 1, 1),
        date_fin=date(2026, 6, 1),
        cout_total=100000,
        description_travaux="Travaux",
        type_intervention="ENTREPRISE_PRINCIPALE",
        activite_couverte=True,
        travaux_standards=True,
    )
    defaults.update(overrides)
    return FDR.objects.create(demande=demande, **defaults)


class BusinessRulesTests(APITestCase):
    """Couvre les 6 règles de pièces requises, le scoring et la complétude."""

    def setUp(self):
        self.user = User.objects.create_user("a", password="x", role="DISTRIBUTEUR")
        self.demande = Demande.objects.create(created_by=self.user)

    def codes(self, fdr):
        return {p.code for p in business_rules.required_documents(fdr)}

    def test_aucune_piece_si_dossier_simple(self):
        fdr = make_fdr(self.demande)
        self.assertEqual(self.codes(fdr), set())

    def test_renovation_structure(self):
        fdr = make_fdr(self.demande, chantier_type=TypeChantier.RENOVATION,
                       modification_structure=True)
        self.assertIn("STRUCTURE", self.codes(fdr))

    def test_renovation_sans_structure_pas_de_piece(self):
        fdr = make_fdr(self.demande, chantier_type=TypeChantier.RENOVATION,
                       modification_structure=False)
        self.assertNotIn("STRUCTURE", self.codes(fdr))

    def test_usage_autre(self):
        fdr = make_fdr(self.demande, usage=UsageChantier.AUTRE, usage_autre_texte="Data center")
        self.assertIn("USAGE_AUTRE", self.codes(fdr))

    def test_chantier_atypique(self):
        fdr = make_fdr(self.demande, chantier_atypique=True)
        self.assertIn("ATYPIQUE", self.codes(fdr))

    def test_montant_superieur_10m(self):
        fdr = make_fdr(self.demande, cout_total=10_000_001)
        self.assertIn("MONTANT", self.codes(fdr))

    def test_montant_egal_10m_pas_de_piece(self):
        fdr = make_fdr(self.demande, cout_total=10_000_000)
        self.assertNotIn("MONTANT", self.codes(fdr))

    def test_activite_hors_contrat(self):
        fdr = make_fdr(self.demande, activite_couverte=False,
                       activite_couverte_texte="hors contrat")
        self.assertIn("ACTIVITE", self.codes(fdr))

    def test_travaux_non_standards(self):
        fdr = make_fdr(self.demande, travaux_standards=False)
        self.assertIn("TRAVAUX_NON_STD", self.codes(fdr))

    def test_scoring_eleve(self):
        fdr = make_fdr(self.demande, chantier_atypique=True, activite_couverte=False,
                       activite_couverte_texte="x", travaux_standards=False)
        score = business_rules.risk_score(fdr)
        self.assertEqual(score.niveau, "ELEVE")  # 25 + 25 + 15 = 65

    def test_dossier_incomplet_si_piece_manquante(self):
        make_fdr(self.demande, chantier_atypique=True)
        self.assertFalse(business_rules.is_dossier_complet(self.demande))

    def test_transitions(self):
        self.assertTrue(business_rules.transition_autorisee(Statut.BROUILLON, Statut.EN_COURS))
        self.assertFalse(business_rules.transition_autorisee(Statut.BROUILLON, Statut.TRAITE))
        self.assertFalse(business_rules.transition_autorisee(Statut.TRAITE, Statut.EN_COURS))


class APIPermissionTests(APITestCase):
    def setUp(self):
        self.agent = User.objects.create_user("agent", password="x", role="DISTRIBUTEUR")
        self.other = User.objects.create_user("other", password="x", role="DISTRIBUTEUR")
        self.siege = User.objects.create_user("siege", password="x", role="SIEGE")
        self.demande = Demande.objects.create(created_by=self.agent, statut=Statut.EN_COURS,
                                              submitted_at=timezone.now())
        make_fdr(self.demande)

    def test_distributeur_ne_voit_pas_demande_d_un_autre(self):
        self.client.force_authenticate(self.other)
        resp = self.client.get(f"/api/demandes/{self.demande.id}/")
        self.assertEqual(resp.status_code, 404)

    def test_distributeur_ne_peut_pas_decider(self):
        self.client.force_authenticate(self.agent)
        resp = self.client.post(f"/api/demandes/{self.demande.id}/decision/",
                                {"decision": Decision.ACCEPTEE})
        self.assertEqual(resp.status_code, 403)

    def test_siege_refuse_sans_motif_echoue(self):
        self.client.force_authenticate(self.siege)
        resp = self.client.post(f"/api/demandes/{self.demande.id}/decision/",
                                {"decision": Decision.REFUSEE})
        self.assertEqual(resp.status_code, 400)

    def test_siege_accepte(self):
        self.client.force_authenticate(self.siege)
        resp = self.client.post(f"/api/demandes/{self.demande.id}/decision/",
                                {"decision": Decision.ACCEPTEE})
        self.assertEqual(resp.status_code, 200)
        self.demande.refresh_from_db()
        self.assertEqual(self.demande.statut, Statut.TRAITE)

    def test_relance_bloquee_avant_24h(self):
        self.client.force_authenticate(self.agent)
        r1 = self.client.post(f"/api/demandes/{self.demande.id}/relance/")
        self.assertEqual(r1.status_code, 200)
        r2 = self.client.post(f"/api/demandes/{self.demande.id}/relance/")
        self.assertEqual(r2.status_code, 400)

    def test_relance_autorisee_apres_24h(self):
        self.client.force_authenticate(self.agent)
        self.demande.last_relance_at = timezone.now() - timedelta(hours=25)
        self.demande.save()
        resp = self.client.post(f"/api/demandes/{self.demande.id}/relance/")
        self.assertEqual(resp.status_code, 200)


class AttestationRoleTests(APITestCase):
    """L'attestation et l'analyse IA sont générées par le siège, après acceptation."""

    def setUp(self):
        self.agent = User.objects.create_user("agent", password="x", role="DISTRIBUTEUR")
        self.siege = User.objects.create_user("siege", password="x", role="SIEGE")
        self.demande = Demande.objects.create(created_by=self.agent, statut=Statut.EN_COURS,
                                              submitted_at=timezone.now())
        make_fdr(self.demande)

    def _accepter(self):
        self.demande.statut = Statut.TRAITE
        self.demande.decision = Decision.ACCEPTEE
        self.demande.save()

    def test_distributeur_ne_peut_pas_editer_attestation(self):
        self._accepter()
        self.client.force_authenticate(self.agent)
        resp = self.client.put(f"/api/demandes/{self.demande.id}/attestation/",
                               {"contenu": "<p>Test</p>"}, format="json")
        self.assertEqual(resp.status_code, 403)

    def test_siege_ne_peut_pas_editer_avant_acceptation(self):
        self.client.force_authenticate(self.siege)
        resp = self.client.put(f"/api/demandes/{self.demande.id}/attestation/",
                               {"contenu": "<p>Test</p>"}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_siege_edite_apres_acceptation(self):
        self._accepter()
        self.client.force_authenticate(self.siege)
        resp = self.client.put(f"/api/demandes/{self.demande.id}/attestation/",
                               {"contenu": "<p>Test</p>"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["type"], "DEFINITIVE")

    def test_validation_notifie_le_distributeur(self):
        self._accepter()
        self.client.force_authenticate(self.siege)
        self.client.put(f"/api/demandes/{self.demande.id}/attestation/",
                        {"contenu": "<p>Test</p>"}, format="json")
        resp = self.client.post(f"/api/demandes/{self.demande.id}/attestation/valider/")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(
            self.agent.notifications.filter(message__icontains="attestation").exists()
        )

    def test_distributeur_ne_peut_pas_lancer_ia(self):
        self._accepter()
        self.client.force_authenticate(self.agent)
        resp = self.client.post(f"/api/demandes/{self.demande.id}/analyse-ia/")
        self.assertEqual(resp.status_code, 403)
