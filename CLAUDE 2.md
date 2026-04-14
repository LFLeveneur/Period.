# CLAUDE.md — Period.

> Ce fichier est lu automatiquement par Cursor à chaque session.
> Il est le seul point d'entrée. Il pointe vers tout le reste.
> Ne code rien sans avoir lu les docs pertinentes en premier.

---

## Ce qu'est Period.

Application web de renforcement musculaire qui adapte les recommandations d'entraînement et de récupération au **cycle hormonal** de l'utilisatrice.

**Tagline :** ton cycle, ta force. Period. 🖤
**Promesse produit :** Des recommandations sur tes séances basées sur les phases de ton cycle, pour une progression logique et plus régulière.

**Persona :** Mathilde, 23-35 ans, intermédiaire en muscu, 3-4 séances/semaine, full body / lower body. Elle connaît squat, hip thrust, RDL — mais ne fait pas le lien entre son cycle et ses performances.

---

## Stack technique

| Techno | Version | Rôle |
|--------|---------|------|
| React | 19 | UI — functional components + hooks uniquement |
| TypeScript | 5+ | Typage strict — mode strict activé |
| Vite | 5+ | Build tool |
| Tailwind CSS | v4 | Styles utilitaires |
| React Router | v7 | Routing côté client — layouts imbriqués |
| Framer Motion | 11+ | Animations fluides et transitions |
| Supabase JS | 2+ | Auth + base de données PostgreSQL |
| Make | — | Flow d'import programme via webhook |

---

## Règles absolues — à appliquer dans CHAQUE fichier

```
✅ Tous les commentaires dans le code sont en FRANÇAIS
✅ Noms de variables, fonctions, composants, fichiers en ANGLAIS
✅ Mobile-first — cible principale : 390px (iPhone 14)
✅ .maybeSingle() au lieu de .single() quand le résultat peut être null
✅ Les types viennent de src/types/ — jamais inlinés dans les composants
✅ Les services retournent { data, error } — jamais de throw

❌ Jamais de couleur hexadécimale dans un composant → variables CSS uniquement
❌ Jamais de blanc pur #FFFFFF comme texte sur fond sombre → --color-text-light
❌ Jamais de z-index arbitraire → paliers définis dans variables.css
❌ Jamais d'espacement arbitraire → multiples de 4px définis dans variables.css
❌ Jamais de import.meta.env hors de src/lib/env.ts
❌ Jamais de createClient() hors de src/lib/supabase.ts
❌ Jamais d'appel Make depuis un composant → passer par makeImportService.ts
❌ Jamais de type inventé dans un composant — tout va dans src/types/
```

---

## Structure src/

```
src/
├── components/
│   ├── ui/              ← Composants réutilisables (Button, Input, Modal, Badge...)
│   └── layout/          ← AppShell, PageHeader, BottomNav
├── contexts/
│   └── AuthContext.tsx  ← user, profile, loading — hook useAuthContext()
├── hooks/               ← useAuthContext, useWorkout, useCycleDay, useSessionRecap...
├── layouts/             ← PublicLayout, AppLayout, OnboardingLayout, ImmersiveLayout
├── lib/
│   ├── env.ts           ← SEUL fichier autorisé à lire import.meta.env
│   └── supabase.ts      ← SEUL fichier autorisé à instancier le client Supabase
├── pages/               ← Une page = un fichier (LandingPage, LoginPage...)
├── services/            ← authService, workoutService, cycleService, makeImportService...
├── styles/
│   └── variables.css    ← Design tokens CSS — importer EN PREMIER dans index.css
├── types/
│   ├── auth.ts          ← User, Profile, AuthError
│   ├── cycle.ts         ← CyclePhase, CyclePhaseDisplay, HealthData, CycleInfo
│   └── workout.ts       ← Program, SessionHistory, ExerciseHistory, SessionRecap...
└── utils/               ← Fonctions utilitaires pures (pas de logique Supabase)
```

---

## Routes de l'application

```
/ → Landing (public)
/login → Connexion (public)
/signup → Inscription (public)
/reset-password → Reset mot de passe (public)
/onboarding → Onboarding 4 steps (auth requis, onboarding non complété)
/onboarding/reveal → Révélation (auth requis, juste après onboarding)

[Layout protégé — auth + onboarding complété + bottom nav]
/home → Accueil (roue du cycle + séance du jour)
/calendar → Calendrier mensuel avec phases
/history → Historique des séances (liste)
/history/:id → Détail d'une séance
/profile → Profil utilisateur
/programs → Liste des programmes
/programs/new → Création de programme
/programs/import → Import Make
/programs/:id → Détail programme
/programs/:id/edit → Modification programme

[Sans bottom nav — auth + onboarding complété]
/exercises → Bibliothèque d'exercices
/session/:id/preview → Séance à venir
/session/:id/active → Séance active (mode immersif)
/session/:id/recap → Récap de séance
```

**Guards :**
- `requireAuth` → redirige vers `/login` si non connectée
- `requireOnboarding` → redirige vers `/onboarding` si onboarding non complété
- `requireNoAuth` → redirige vers `/home` si déjà connectée + onboarding complété

---

## Connexions Supabase — pattern obligatoire

```ts
// src/lib/env.ts — SEUL fichier autorisé à lire import.meta.env
function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) throw new Error(`Variable d'environnement manquante : ${key}`);
  return value;
}
export const env = {
  SUPABASE_URL: requireEnv('VITE_SUPABASE_URL'),
  SUPABASE_ANON_KEY: requireEnv('VITE_SUPABASE_ANON_KEY'),
  MAKE_WEBHOOK_URL: requireEnv('VITE_MAKE_WEBHOOK_URL'),
} as const;

// src/lib/supabase.ts — SEUL fichier autorisé à instancier le client
import { createClient } from '@supabase/supabase-js';
import { env } from './env';
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
```

---

## Pattern des services

```ts
// Retourner toujours { data, error } — jamais de throw
export async function getProfile(userId: string): Promise<{ data: Profile | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle(); // ← TOUJOURS maybeSingle, jamais single()
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}
```

---

## Phases du cycle — référence rapide

| Phase (DB) | Phase UI | Couleur CSS | Jours approximatifs |
|-----------|---------|-------------|---------------------|
| `menstrual` | `menstrual` | `--color-menstrual` #DE3030 | J1 → J[periodLength] |
| `follicular` | `follicular` | `--color-follicular` #EDDF40 | J[periodLength+1] → J[ovDay-2] |
| `ovulation` | `ovulation` | `--color-ovulation` #303DCA | J[ovDay-1] → J[ovDay+1] |
| `luteal` | `luteal_early` | `--color-luteal` #30CA8C | J[ovDay+2] → J[cycleLength-7] |
| `luteal` | `luteal_late` | `--color-luteal` #30CA8C | J[cycleLength-6] → fin |

La base ne stocke que 4 phases. `luteal_early` et `luteal_late` sont uniquement côté UI.

---

## Tables Supabase — référence rapide

| Table | RLS | Description |
|-------|-----|-------------|
| `profiles` | ✅ user_id | Profil étendu — créé automatiquement via trigger à l'inscription |
| `health_data` | ✅ user_id | Données de cycle (last_period_date, cycle_length, period_length) |
| `exercise_catalog` | ❌ public | Catalogue global d'exercices — lecture seule |
| `user_custom_exercises` | ✅ user_id | Exercices créés par l'utilisatrice |
| `programs` | ✅ user_id | Programmes d'entraînement |
| `program_sessions` | ✅ user_id | Séances dans un programme |
| `session_exercises` | ✅ via join | Exercices planifiés dans une séance |
| `session_history` | ✅ user_id | Séances complétées |
| `exercise_history` | ✅ user_id | Performances par exercice lors d'une séance |
| `user_settings` | ✅ user_id | Paramètres clé-valeur (jours d'entraînement préférés...) |

**Règle importante :** Un exercice peut venir de `exercise_catalog` OU de `user_custom_exercises` — jamais les deux en même temps. Les deux colonnes `exercise_catalog_id` et `user_custom_exercise_id` existent dans `session_exercises` et `exercise_history`.

---

## Design tokens — couleurs principales

```css
--color-bg: #F9EDE1          /* Fond principal — beige crème chaud */
--color-bg-dark: #2F0057     /* Fond sections inversées — violet profond */
--color-surface: #FFFFFF     /* Cards sur fond clair */
--color-surface-dark: #3D0070 /* Cards sur fond sombre */
--color-primary: #C584EE     /* Accent violet lavande */
--color-text: #2F0057        /* Texte principal sur fond clair */
--color-text-light: #F9EDE1  /* Texte sur fond sombre — JAMAIS #FFFFFF */
--color-text-muted: rgba(47, 0, 87, 0.5)
--color-error: #D32F2F
--color-success: #2E7D32
```

Toutes les valeurs complètes sont dans `src/styles/variables.css`.

---

## MVP — périmètre strict

### Dans le MVP ✅
Landing · Onboarding (4 steps) · Révélation · Accueil (roue du cycle) · Import Make · Création programme · Bibliothèque exercices · Séance à venir · Séance active · Récap · Historique (liste + détail) · Calendrier · Profil

### Hors MVP ❌
Coach IA · Notifications push · Analyse musculaire · Export RGPD · Partage programme · Changement d'email

---

## Roadmap — phases dans l'ordre

| Phase | Contenu | Dépend de |
|-------|---------|-----------|
| 0 | Setup projet | — |
| 1 | Base de données Supabase | 0 |
| 2 | Auth (login, signup, reset) | 1 |
| 3 | Onboarding + révélation | 2 |
| 4 | Calcul du cycle (`cyclePredictionService`) | 1, 3 |
| 5 | Accueil (roue du cycle + séances) | 3, 4 |
| 6 | Programmes + bibliothèque | 1, 5 |
| 7 | Import Make | 6 |
| 8 | Séance (preview + active + récap) | 4, 5, 6 |
| 9 | Historique | 8 |
| 10 | Calendrier | 4, 8, 6 |
| 11 | Profil | 2, 3, 4 |
| 12 | Polish + démo | tout |

**Ne jamais coder une phase sans que ses dépendances soient complètes et testées.**

---

## Documentation complète

> Lire dans l'ordre avant de toucher au code d'une feature.

### Fondations
- `.claude/docs/00-overview.md` — Vision, problème, persona, limites produit
- `.claude/docs/01-design-tokens.md` — Couleurs, typo, espacements, rayons, ombres
- `.claude/docs/02-components.md` — Composants UI : props, variantes, exemples
- `.claude/docs/03-copy.md` — Tout le texte de l'app — copier tel quel, ne pas reformuler

### Données
- `.claude/docs/04-database.md` — Tables Supabase, colonnes, RLS, enums, triggers
- `.claude/docs/05-data-models.md` — Types TypeScript complets, constantes, configs

### Produit
- `.claude/docs/06-features.md` — Features MVP vs hors-MVP, règles métier, contraintes
- `.claude/docs/07-screens.md` — Contenu de chaque écran, actions, états UI
- `.claude/docs/08-navigation.md` — Routes, guards, redirections, transitions
- `.claude/docs/09-flows.md` — Parcours utilisateur complets (happy path + alternatifs)
- `.claude/docs/10-edge-cases.md` — Ce qui se passe quand ça se passe mal

### Intégration
- `.claude/docs/11-make-import.md` — Flow Make complet : texte → JSON → vérification → import

### Exécution
- `.claude/docs/12-metrics.md` — KPIs, events à tracker
- `.claude/docs/13-roadmap.md` — Phases détaillées, tâches, définition de "done"
- `.claude/docs/14-demo-script.md` — Script démo écran par écran

### Conventions
- `.claude/rules/code-style.md` — TypeScript, nommage, structure des composants
- `.claude/rules/design.md` — Règles visuelles, tokens à utiliser, quand les utiliser
- `.claude/rules/tech.md` — Stack autorisée, ce qu'on n'utilise PAS, patterns de service