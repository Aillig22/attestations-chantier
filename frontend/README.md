# Attestations de chantier — Frontend

Application React (Vite + TypeScript + Tailwind v4) de gestion et de validation des
attestations de chantier, du distributeur au siège.

```bash
npm install
npm run dev      # serveur de dev (proxy /api → http://127.0.0.1:8000)
npm run build    # tsc + build de production
npm run lint
```

---

# Charte design AXA — démarche & mise en œuvre

Cette section documente la refonte UI et **comment l'identité AXA (« Canopée » / univers
client, dit Apollo) est respectée** dans l'application.

## Principe directeur : la charte, pas la librairie

Le design system AXA est publié sous forme de composants React (`@axa-fr/canopee-react`).
Nous avons **délibérément choisi de ne PAS les utiliser** : leur rendu très « assurance
corporate » (tags rectangulaires, formulaires plats) s'intègre mal et a été jugé peu
esthétique. De plus, leur reboot CSS (non-`@layer`) écrase les utilitaires Tailwind v4
(`display:block` forcé sur les éléments sémantiques) — source de bugs d'intégration.

**Approche retenue :** reproduire fidèlement la *charte* AXA (couleurs, typo, radius,
éléments graphiques) **dans notre propre couche Tailwind**, en s'appuyant sur les vrais
tokens du design system. On garde ainsi la cohérence de marque tout en maîtrisant
totalement le rendu. La seule dépendance UI ajoutée est **Radix** (via un composant
`Select` façon shadcn/ui) pour les dropdowns accessibles.

## 1. Tokens de design

Tous les tokens sont centralisés dans le bloc `@theme` de [`src/index.css`](src/index.css),
alignés sur les valeurs officielles de l'univers client/Apollo.

### Couleurs cœur (Core)

| Token | Hex | Usage |
|---|---|---|
| `--color-axa-blue` | `#00008f` | Couleur primaire de marque |
| `--color-axa-blue-dark` | `#000070` | Hover / dégradés |
| `--color-axa-blue-light` | `#eaeaf6` | Fonds discrets |
| `--color-axa-red` | `#e60000` | Alerte / déconnexion |
| `--color-success / warning / danger` | `#188138 / #c84d14 / #e60000` | États |
| neutres | `#333 / #5c5c5c / #e3e3e3 / #fafafa` | Texte, bordures, fonds |

### Data palette (data-viz / chips uniquement)

Neuf couleurs vives réservées à l'affichage de données (chips, graphes) — **jamais en
fond de page** (règle AXA). Déclarées en `--color-data-*` :
`cotton, coral, sunshine, leaf, mint, sky, cherry, teal, grape`.

**Accessibilité** : sur les couleurs claires → texte bleu AXA ; sur Cherry/Teal/Grape →
texte blanc (combinaisons AAA/AA du brand book). En pratique, les chips utilisent ces
couleurs **en teintes douces** (fond à faible opacité + texte foncé) pour rester
esthétiques — voir [`src/lib/constants.ts`](src/lib/constants.ts) (`STATUT_BADGE`,
`DECISION_BADGE`) et les `.pill-risk-*` dans `index.css`.

### Typographie & formes

- Police : **Source Sans** (`--font-sans`), la police AXA.
- Radius : `--radius-axa: 8px` (radius Apollo des conteneurs), boutons arrondis.

## 2. Le Switch AXA

Le « Switch » est l'élément graphique signature d'AXA : un **parallélogramme rouge à 52°**
(le « / » plein issu du logo). Implémenté dans
[`src/components/AxaSwitch.tsx`](src/components/AxaSwitch.tsx) en SVG, avec **l'angle 52°
verrouillé** (`viewBox 0 0 118 100`, ratio préservé — ne jamais utiliser
`preserveAspectRatio="none"` qui déforme l'angle).

Règles d'usage respectées (page de connexion,
[`src/pages/LoginPage.tsx`](src/pages/LoginPage.tsx)) :

- **Hero Switch** : un seul par composition, **centré sur le format** de la page, ≥ 50 %
  de la hauteur, au moins 3 coins visibles, décalable pour laisser la place au titre.
- **Mini Switch** : petit, placé en *lead* avant un titre (~120 % de la hauteur de
  capitale).

## 3. Logo

Logo AXA officiel ([`src/assets/logo-axa.svg`](src/assets/logo-axa.svg), repris des assets
de `@axa-fr/canopee-css`) — carré bleu, diagonale rouge. Affiché **une seule fois** par
écran (sidebar / page de login).

## 4. Composants & écrans

| Élément | Fichier | Notes |
|---|---|---|
| Sidebar | [`components/Layout.tsx`](src/components/Layout.tsx) | Carte flottante arrondie, item actif en pilule bleue, carte utilisateur + déconnexion rouge. Utilise des `<div>` (pas `<aside>/<nav>`) pour éviter tout conflit de reset. |
| Chips de statut | [`components/Badges.tsx`](src/components/Badges.tsx) + `lib/constants.ts` | Pilules arrondies, Data palette en teintes douces, texte accessible. |
| Dropdown filtre | [`components/FilterSelect.tsx`](src/components/FilterSelect.tsx) → [`components/ui/select.tsx`](src/components/ui/select.tsx) | Select shadcn/Radix stylé AXA (trigger pilule, chevron, options bleu clair). Mappe l'option « tout » sur un sentinel car Radix interdit `value=""`. |
| Boutons / cartes / formulaires | [`src/index.css`](src/index.css) | Classes `.btn-*`, `.card-axa`, `.input-axa`, `.badge` — briques Tailwind aux tokens AXA. |

## 5. Conventions à suivre

- **Couleurs** : toujours via les tokens (`bg-axa-blue`, `text-data-*`…), jamais de hex en
  dur dispersés.
- **Data palette** : réservée aux chips/data, en teintes douces, jamais en fond de page.
- **Titres** : un `h1` hérite de `text-axa-blue` (cf. `@layer base`) ; sur fond bleu,
  forcer explicitement `text-white`.
- **Switch** : un seul par composition, angle 52° préservé.
- **Nouveau besoin de composant** : reproduire la charte en Tailwind plutôt que d'ajouter
  `@axa-fr/canopee-react`.
