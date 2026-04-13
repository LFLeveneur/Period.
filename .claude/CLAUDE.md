# Period. — CLAUDE.md

> Point d'entrée unique. Lis ce fichier en premier. Il pointe vers tout le reste.
> Ne code rien sans avoir lu les docs pertinentes d'abord.

---

## Ce qu'est Period.

Application web de renforcement musculaire qui adapte les recommandations d'entraînement au cycle hormonal de l'utilisatrice.

**Tagline :** ton cycle, ta force. Period. 🖤

**Promesse produit :** Des recommandations sur tes séances basées sur les phases de ton cycle, pour une progression logique et plus régulière.

---

## Stack technique

| Techno | Rôle |
|--------|------|
| React 19 + TypeScript + Vite | Frontend |
| Tailwind CSS v4 | Styles utilitaires |
| React Router v7 | Routing côté client |
| Supabase | Auth + base de données PostgreSQL |
| Make | Flow d'import de programme |

---

## Principe de construction

```
Fondations → Données → Auth → Cycle → Programmes → Séances → Récap → Historique → Calendrier → Profil → Polish
```

**Règle absolue :** On ne touche pas à une feature tant que ses dépendances ne sont pas en place et fonctionnelles.

---

## Règles absolues du code

- Tous les commentaires en **français**
- Jamais de couleur hexadécimale dans un composant → utiliser les variables CSS de `src/styles/variables.css`
- Jamais de `import.meta.env` hors de `src/lib/env.ts`
- Jamais de `createClient()` hors de `src/lib/supabase.ts`
- Jamais de types inlinés dans les composants → tout va dans `src/types/`
- Toujours `.maybeSingle()` au lieu de `.single()` quand le résultat peut être null
- Mobile-first : cible principale = 390px (iPhone 14)

---

## Structure src/

```
src/
├── components/
│   ├── ui/          ← Composants réutilisables (Button, Input, Modal...)
│   └── layout/      ← AppShell, PageHeader, BottomNav
├── pages/           ← Une page = un dossier = un fichier
├── layouts/         ← PublicLayout, AppLayout, OnboardingLayout, ImmersiveLayout
├── hooks/           ← useAuthContext, useWorkout, useCycleDay...
├── services/        ← authService, workoutService, cycleService...
├── contexts/        ← AuthContext
├── types/
│   ├── auth.ts
│   ├── cycle.ts
│   └── workout.ts
├── lib/
│   ├── env.ts       ← SEUL fichier autorisé à lire import.meta.env
│   └── supabase.ts  ← SEUL fichier autorisé à instancier le client
├── utils/           ← Fonctions utilitaires pures
└── styles/
    └── variables.css ← Design tokens CSS (source : 01-design-tokens.md)
```

---

## Documentation — lire dans l'ordre

### SOCLE — lire avant de coder quoi que ce soit

| Fichier | Contenu |
|---------|---------|
| `docs/00-overview.md` | Vision produit, problème, promesse, personas, ce qu'on ne fait PAS |
| `docs/01-design-tokens.md` | Couleurs, typo, espacements, rayons, ombres |
| `docs/02-components.md` | Chaque composant UI : props, variantes, règles d'usage |
| `docs/03-copy.md` | Tout le texte de l'app — labels, messages vides, tooltips |

### DONNÉES — modéliser avant d'intégrer

| Fichier | Contenu |
|---------|---------|
| `docs/04-database.md` | Tables Supabase, colonnes, relations, RLS, enums |
| `docs/05-data-models.md` | Types TypeScript, structures de données |

### PRODUIT — spécifier avant d'implémenter

| Fichier | Contenu |
|---------|---------|
| `docs/06-features.md` | Toutes les features MVP vs hors-MVP, règles métier |
| `docs/07-screens.md` | Chaque écran : contenu, actions, états UI |
| `docs/08-navigation.md` | Routes, guards, redirections, transitions |
| `docs/09-flows.md` | Tous les parcours utilisateur — happy path + alternatifs |
| `docs/10-edge-cases.md` | Ce qui se passe quand ça se passe mal |

### INTÉGRATION

| Fichier | Contenu |
|---------|---------|
| `docs/11-make-import.md` | Flow complet import programme via Make |

### EXÉCUTION

| Fichier | Contenu |
|---------|---------|
| `docs/12-metrics.md` | KPIs, events à tracker |
| `docs/13-roadmap.md` | Phases de dev dans l'ordre, dépendances |
| `docs/14-demo-script.md` | Script démo — écran par écran |

### RÈGLES DE CODE

| Fichier | Contenu |
|---------|---------|
| `rules/code-style.md` | Conventions TypeScript, commentaires FR, nommage |
| `rules/design.md` | Règles visuelles à respecter dans le code |
| `rules/tech.md` | Stack, outils autorisés, ce qu'on n'utilise pas |

---

## MVP — périmètre strict

### Dans le MVP ✅
- Landing page
- Onboarding (cycle + jours préférés)
- Écran de révélation post-onboarding
- Accueil avec roue du cycle + recommandation du jour
- Import de programme via Make
- Création manuelle de programme
- Bibliothèque d'exercices
- Séance à venir (preview)
- Séance active
- Récap de fin de séance
- Historique des séances (liste + détail)
- Calendrier (vue mensuelle avec phases)
- Profil utilisateur

### Hors MVP ❌
- Coach IA (conversation, feedback automatisé, analyse post-séance)
