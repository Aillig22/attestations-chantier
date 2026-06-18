# Plateforme de gestion des demandes d'attestation de chantier

Application web interne permettant de gérer le cycle de vie complet d'une **demande
d'attestation de chantier** — de la saisie du **Formulaire de Déclaration du Risque (FDR)**
par un **Distributeur** (agent/courtier) jusqu'au traitement et à la génération de
l'attestation par le **Siège**.

Réalisée dans le cadre d'un test technique Développeur Fullstack.

---

## ✨ Fonctionnalités

| Parcours | Détail |
| --- | --- |
| **Liste des demandes** | Filtres par statut et décision, création, accès au détail, relance email (délai 24h) |
| **Formulaire FDR dynamique** | Champs conditionnels (rénovation, usage « Autre », chantier atypique, activité hors contrat…) avec aperçu temps réel des pièces requises |
| **Évaluation automatique du risque** | Score de risque (indicateurs fictifs), synthèse, indicateur dossier complet / incomplet |
| **Pièces justificatives** | Détection automatique des pièces requises selon les règles métier, upload / liste / suppression |
| **Validation & envoi** | Récapitulatif, vérification de complétude, passage `BROUILLON → EN_COURS`, génération du FDR en PDF |
| **Traitement siège** | Consultation du dossier, acceptation / refus motivé, demande de compléments |
| **Éditeur d'attestation (WYSIWYG)** | Éditeur riche TipTap, zones pré-remplies depuis le FDR, prévisualisation, export PDF, validation |
| **Analyse IA (simulée)** | Vérification de cohérence FDR ↔ attestation, statut + liste des incohérences avec highlight |
| **Notifications & Reporting** | Notifications d'événements, statistiques (acceptées / refusées…) |

---

## 🏗️ Stack technique

**Backend** — Python / Django + Django REST Framework
- Authentification JWT par rôle (`djangorestframework-simplejwt`)
- Documentation OpenAPI / Swagger auto-générée (`drf-spectacular`)
- Génération PDF sans dépendance système (`xhtml2pdf`)
- SQLite en développement, PostgreSQL en production

**Frontend** — React + TypeScript (Vite)
- Tailwind CSS v4 (design system AXA centralisé) + composants maison
- TanStack Query (data fetching / cache), React Router
- React Hook Form (formulaire dynamique), TipTap (éditeur riche)

---

## 📁 Architecture

```
attestations-chantier/
├── backend/
│   ├── config/             # settings, urls, wsgi
│   ├── accounts/           # User custom (rôle DISTRIBUTEUR | SIEGE), auth JWT
│   ├── demandes/
│   │   ├── models.py       # Demande, FDR, Piece, Attestation, AnalyseIA, Notification
│   │   ├── business_rules.py  # ⭐ règles métier centralisées (pièces, scoring, complétude)
│   │   ├── ai_coherence.py    # analyse IA simulée (FDR ↔ attestation)
│   │   ├── pdf.py + templates/pdf/  # génération PDF (FDR, attestation)
│   │   ├── permissions.py  # droits par rôle
│   │   ├── serializers.py / views.py
│   │   └── tests.py        # 25 tests (règles métier + droits + cas limites)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── lib/            # api, auth, queries (TanStack), types, constants
        ├── components/     # Layout, Badges, RiskGauge, Toast
        ├── pages/          # liste, détail (onglets), login, notifications, reporting
        │   └── demande/    # FdrForm, EvaluationPanel, ValidationPanel,
        │                   #   TraitementPanel, AttestationPanel (éditeur + IA)
        └── index.css       # ⭐ design tokens AXA + classes composant (@utility / @layer)
```

---

## 🚀 Installation locale

### Prérequis
Python 3.12+ et Node.js 20+.

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export DEBUG=True                    # mode dev : SQLite + clé jetable + seed activé
python manage.py migrate
python manage.py seed                # crée les comptes + demandes de démo
python manage.py runserver           # http://127.0.0.1:8000
```

> En l'absence de `DEBUG=True`, le serveur exige les variables de production
> (`SECRET_KEY`, `DATABASE_URL`…). Conserver `export DEBUG=True` dans le même
> terminal pour les commandes suivantes (`seed`, `test`). Voir
> [`backend/.env.example`](backend/.env.example) pour la configuration de production.

### Frontend
```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173 (proxy /api -> :8000)
```

### Comptes de démo
Créés par `python manage.py seed` :

| Rôle | Identifiant | Mot de passe |
| --- | --- | --- |
| Distributeur | `agent` | `demo1234` |
| Siège | `siege` | `demo1234` |

> L'admin Django n'est pas seedé : le créer au besoin avec
> `python manage.py createsuperuser`.

---

## 📚 API & documentation

- Documentation interactive Swagger : **`/api/docs/`**
- Schéma OpenAPI : `/api/schema/`

Principaux endpoints (préfixe `/api/`) :

| Méthode | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/login/` | Connexion (renvoie le token JWT + le rôle) |
| `GET` | `/auth/me/` | Utilisateur courant |
| `GET/POST` | `/demandes/` | Liste (filtres `?statut=`, `?decision=`) / création |
| `GET/PUT` | `/demandes/{id}/fdr/` | Lecture / saisie du FDR |
| `GET` | `/demandes/{id}/evaluation/` | Règles métier : pièces requises, complétude, score |
| `GET/POST/DELETE` | `/demandes/{id}/pieces/` | Pièces justificatives |
| `POST` | `/demandes/{id}/submit/` | Envoi au siège (+ FDR PDF) |
| `POST` | `/demandes/{id}/decision/` | Décision du siège (accepter / refuser) |
| `GET/PUT` | `/demandes/{id}/attestation/` | Éditer l'attestation |
| `GET` | `/demandes/{id}/attestation/pdf/` | Export PDF |
| `POST` | `/demandes/{id}/analyse-ia/` | Analyse de cohérence |
| `POST` | `/demandes/{id}/relance/` | Relance (bloquée < 24h) |

---

## ✅ Tests

```bash
cd backend
python manage.py test
```

25 tests couvrant les **6 règles de pièces requises**, le scoring de risque, la complétude,
les transitions de statut interdites, et la **gestion des droits** (un distributeur ne voit
pas les demandes d'un autre, ne peut pas décider ; refus sans motif rejeté ; relance bloquée
avant 24h).

---

## 📐 Règles métier

Centralisées dans [`backend/demandes/business_rules.py`](backend/demandes/business_rules.py)
et exposées via l'API (le front ne réimplémente aucune règle).

Une demande **nécessite des pièces justificatives** si :
1. Rénovation **avec** modification de structure
2. Usage « Autre »
3. Chantier atypique
4. Montant global > 10 M€
5. Activité non couverte par le contrat
6. Travaux non standards

Cycle de vie : `BROUILLON → EN_COURS → TRAITÉ` (transitions contrôlées côté serveur).

---

## 🎨 Choix techniques

- **Django REST Framework** : ORM, auth, permissions et serializers intégrés — l'architecture
  la plus rapide à mettre en place proprement pour ce domaine métier.
- **Règles métier isolées** dans un module unique testé unitairement : lisibilité, testabilité,
  et source de vérité unique partagée entre l'API d'évaluation, la soumission et l'admin.
- **xhtml2pdf plutôt que WeasyPrint** : pas de dépendance système (Cairo/Pango), donc build
  identique en local et sur Render.
- **Design system centralisé** (Tailwind v4) : tokens AXA déclarés une seule fois (`@theme`),
  briques composables en `@utility` (`btn`, `badge`, `card-axa`) et variantes en
  `@layer components` — **zéro répétition d'utilitaires dans le JSX**.
- **TanStack Query** : invalidation de cache déclarative après chaque action métier.
- **Module IA isolé** (`ai_coherence.py`) : remplaçable par un véritable appel LLM sans
  toucher au reste de l'application (voir ci-dessous).

---

## ☁️ Déploiement

- **Frontend → Vercel** : build Vite, variable `VITE_API_URL` pointant vers l'API Render,
  SPA fallback géré par `frontend/vercel.json`.
- **Backend → Render** : décrit en IaC dans [`render.yaml`](render.yaml) (web service Python,
  `gunicorn`, `whitenoise`, migrations + seed via `build.sh`). Renseigner
  `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` avec le domaine Vercel.
- **Base de données → Neon** (PostgreSQL serverless managé) : chaîne de connexion fournie
  via `DATABASE_URL` (SSL forcé automatiquement, cf. [`settings.py`](backend/config/settings.py)).
- **Pièces justificatives → Supabase Storage** (objet S3-compatible) : le filesystem de Render
  étant éphémère, les uploads sont stockés hors instance et servis via des **URLs présignées**
  à durée de vie limitée. Activé dès que `AWS_STORAGE_BUCKET_NAME` est défini ; sinon le
  backend reste sur le `FileSystemStorage` local. Secrets (`AWS_S3_*`) à renseigner côté Render.

---

## 🔮 Améliorations futures

- **Analyse de cohérence par véritable LLM** (API Claude) en remplacement de la simulation
  par règles, pour une détection sémantique réelle des incohérences.
- **Pré-remplissage assisté du FDR** par extraction (OCR/LLM) des pièces uploadées.
- **Recommandation automatique** de décision et de niveau de risque pour le siège.
- **Signature électronique** et horodatage de l'attestation, piste d'audit complète.
- Notifications temps réel (WebSocket) et export Excel du reporting.
