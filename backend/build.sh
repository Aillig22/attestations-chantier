#!/usr/bin/env bash
# Script de build Render
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# Le seed (comptes + données de démo) n'est PAS exécuté automatiquement : il
# créerait des comptes à mots de passe connus en production. Pour amorcer un
# environnement de démo dédié, lancer manuellement :
#   SEED_DEMO=1 DEMO_PASSWORD=... python manage.py seed
