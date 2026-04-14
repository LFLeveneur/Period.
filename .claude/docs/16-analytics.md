# 16 — Analytics & Tracking

Source de vérité du système de tracking KPI de Period.
Ce fichier décrit l'intégralité du système : architecture, events, base de données,
service, composants, dashboard admin et règles d'intégration.
Lire ce fichier avant de toucher à tout ce qui concerne le tracking ou le feedback.

---

## 1. Vue d'ensemble

### Objectif

Mesurer l'activation et la rétention des utilisatrices sans spam, sans données
personnelles, et sans bloquer l'UX en cas d'erreur.

### Deux couches de tracking

```
PostHog (src/lib/analytics.ts)
  └── Tracking produit — production uniquement (VITE_POSTHOG_KEY requis)
  └── Désactivé en dev — aucun event envoyé hors production
  └── Utilisé pour : analyses comportementales détaillées, funnels PostHog

Supabase (src/services/analyticsService.ts)
  └── Tracking KPI persistant — toujours actif si utilisatrice connectée
  └── Utilisé pour : dashboard admin, démo, métriques d'activation
  └── Stockage : tables events et feedback dans Supabase
```

**Règle :** Pour les KPIs de la démo et du dashboard admin, toujours passer par
`analyticsService.ts`. Ne jamais utiliser PostHog pour les KPIs — sa désactivation
en dev rendrait les données incomplètes.

---

## 2. Catalogue des events

### Events one-time — trackés une seule fois par utilisatrice

Un event one-time ne peut être inséré qu'une seule fois en base pour une
utilisatrice donnée. Le flag est stocké dans `user_settings` (clé :
`event_tracked_[eventName]`). Les appels suivants sont silencieusement ignorés.

| Event | Déclenché où | Metadata |
|-------|-------------|---------|
| `signup_started` | `SignupPage` — au mount du composant | — |
| `onboarding_completed` | `OnboardingPage` — fin step 2 (sans cycle) ou step 3 (avec cycle) | — |
| `cycle_filled` | `OnboardingPage` — fin step 3, après `saveHealthData()` | `{ cycle_length: number }` |
| `training_filled` | `ProgramNewPage` — après `createProgram()` réussi | `{ sessions_count: number }` |
| `feedback_submitted` | `analyticsService.submitFeedback()` — automatique | — |

### Events répétés — trackés à chaque appel

| Event | Déclenché où | Metadata |
|-------|-------------|---------|
| `session_logged` | `SessionRecapPage` — au chargement du récap | `{ phase, duration_minutes, feeling }` |
| `page_viewed` | `AppLayout` via `usePageTracking()` — à chaque changement de route | `{ path: string }` |

### Funnel d'activation

```
signup_started → onboarding_completed → cycle_filled → training_filled → session_logged
```

Chaque étape du funnel correspond à un event one-time. La conversion entre étapes
se calcule dans le dashboard admin.

---

## 3. Base de données

### Table `events`

```sql
CREATE TABLE events (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  text        NOT NULL CHECK (event_type IN (
    'signup_started', 'onboarding_completed', 'cycle_filled',
    'training_filled', 'session_logged', 'page_viewed', 'feedback_submitted'
  )),
  metadata    jsonb,
  created_at  timestamptz DEFAULT now() NOT NULL
);
```

**RLS :**
- `INSERT` : `auth.uid() = user_id` — chaque utilisatrice insère ses propres events
- `SELECT` propre : `auth.uid() = user_id`
- `SELECT` admin : `profiles.is_admin = true` pour l'utilisatrice courante

**Index :** `user_id`, `event_type`, `created_at DESC`

### Table `feedback`

```sql
CREATE TABLE feedback (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liked       text,
  frustrated  text,
  created_at  timestamptz DEFAULT now() NOT NULL
);
```

**RLS :** même logique que `events` — insert/select own + select admin.

**Index :** `user_id`, `created_at DESC`

### Table `user_settings` — flags one-time

La table `user_settings` est utilisée pour stocker les flags des events one-time.
Elle doit avoir une contrainte `UNIQUE (user_id, key)` pour permettre l'upsert.

```sql
CREATE TABLE IF NOT EXISTS user_settings (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key        text        NOT NULL,
  value      text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, key)
);
```

Clés créées par le système analytics :

| Clé | Valeur | Description |
|-----|--------|-------------|
| `event_tracked_signup_started` | `"true"` | Event tracké |
| `event_tracked_onboarding_completed` | `"true"` | Event tracké |
| `event_tracked_cycle_filled` | `"true"` | Event tracké |
| `event_tracked_training_filled` | `"true"` | Event tracké |
| `event_tracked_feedback_submitted` | `"true"` | Event tracké |

### Colonne `profiles.is_admin`

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
```

Valeur `false` par défaut. À activer manuellement en base pour les comptes admin :

```sql
UPDATE profiles SET is_admin = true WHERE user_id = '<uuid>';
```

**Attention :** Ne jamais exposer la liste des admins dans le code front. La vérification
se fait côté Supabase via RLS.

---

## 4. Types TypeScript

Fichier : `src/types/analytics.ts`

```ts
// Type union de tous les events trackés
type EventType =
  | 'signup_started'
  | 'onboarding_completed'
  | 'cycle_filled'
  | 'training_filled'
  | 'session_logged'
  | 'page_viewed'
  | 'feedback_submitted';

// Liste des events trackés une seule fois par utilisatrice
const ONE_TIME_EVENTS: EventType[] = [
  'signup_started',
  'onboarding_completed',
  'cycle_filled',
  'training_filled',
  'feedback_submitted',
];

// Entrée brute en base
interface AnalyticsEvent {
  id: string;
  user_id: string;
  event_type: EventType;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Données soumises via FeedbackModal
interface FeedbackData {
  liked: string;
  frustrated: string;
}

// Entrée brute en base
interface FeedbackEntry {
  id: string;
  user_id: string;
  liked: string | null;
  frustrated: string | null;
  created_at: string;
}

// KPIs d'activation pour le dashboard
interface ActivationKpis {
  signup_started: number;
  onboarding_completed: number;
  cycle_filled: number;
  training_filled: number;
  session_logged: number;
}

// KPIs de rétention pour le dashboard
interface RetentionKpis {
  active_7d: number;   // utilisatrices avec page_viewed dans les 7 derniers jours
  active_30d: number;  // utilisatrices avec page_viewed dans les 30 derniers jours
  total_users: number; // utilisatrices avec signup_started
}

// Répartition des séances par phase du cycle
interface PhaseDistribution {
  phase: string;
  count: number;
}
```

---

## 5. Service — `analyticsService.ts`

Fichier : `src/services/analyticsService.ts`

### `trackEvent(eventType, metadata?)`

```ts
// Fire-and-forget — ne bloque jamais l'UX
// Les erreurs Supabase sont loguées mais silencieuses
trackEvent('session_logged', { phase: 'follicular', duration_minutes: 45 });

// One-time — ignoré si déjà tracké pour cette utilisatrice
await trackEvent('cycle_filled', { cycle_length: 28 });
// → Insère dans events + pose le flag dans user_settings (upsert)
// → 2e appel : flag trouvé → return immédiat sans insertion
```

**Logique interne one-time :**

```
1. getUser() → récupère user_id
2. Lit user_settings WHERE user_id = X AND key = 'event_tracked_[type]'
3. Si found → return (ignoré)
4. Sinon → Promise.all([
     INSERT events { user_id, event_type, metadata },
     UPSERT user_settings { user_id, key, value: 'true' }
   ])
```

### `submitFeedback(data)`

```ts
const { error } = await submitFeedback({ liked: '...', frustrated: '...' });
// → INSERT feedback
// → trackEvent('feedback_submitted') automatiquement
// → Retourne { error: string | null }
```

### Fonctions de lecture admin (dashboard)

Toutes nécessitent `profiles.is_admin = true` (RLS).

| Fonction | Retour | Description |
|----------|--------|-------------|
| `getActivationKpis()` | `ActivationKpis` | Compte par event_type |
| `getRetentionKpis()` | `RetentionKpis` | Utilisatrices actives 7j / 30j / total |
| `getPhaseDistribution()` | `PhaseDistribution[]` | Séances par phase (via metadata.phase) |
| `getFeedbackList(limit)` | `FeedbackEntry[]` | Feedbacks récents (défaut : 50) |

**Rétention — calcul :**
- `active_7d` : `COUNT(DISTINCT user_id)` sur `events` WHERE `event_type = 'page_viewed'`
  AND `created_at >= now() - 7 days`
- `active_30d` : même logique sur 30 jours
- `total_users` : `COUNT(DISTINCT user_id)` sur `events` WHERE `event_type = 'signup_started'`

**Phase distribution — calcul :**
Agrégation côté client depuis `metadata->>'phase'` des events `session_logged`.
La phase est stockée telle que retournée par `session_history.cycle_phase` (valeurs DB :
`menstrual`, `follicular`, `ovulation`, `luteal`).

---

## 6. Hook — `usePageTracking`

Fichier : `src/hooks/usePageTracking.ts`

```ts
// Appel unique dans AppLayout — track page_viewed à chaque changement de pathname
function usePageTracking() {
  const location = useLocation();
  useEffect(() => {
    trackEvent('page_viewed', { path: location.pathname });
  }, [location.pathname]);
}
```

**Intégration dans AppLayout :**

```ts
// src/layouts/AppLayout.tsx
import { usePageTracking } from '@/hooks/usePageTracking';

export function AppLayout() {
  usePageTracking(); // ← après les guards d'auth
  // ...
}
```

**Portée :** Seules les routes sous `AppLayout` (routes protégées avec bottom nav)
sont trackées. Les routes immersives (`/session/*`, `/programs/new`) ne le sont pas.
Si le besoin évolue, ajouter `usePageTracking()` dans `ImmersiveLayout` aussi.

---

## 7. Composant — `FeedbackModal`

Fichier : `src/components/FeedbackModal.tsx`

Bottom sheet avec deux questions ouvertes et un bouton d'envoi.

### Props

```ts
interface FeedbackModalProps {
  onClose: () => void; // Appelé après envoi réussi OU annulation
}
```

### Utilisation

```tsx
import { FeedbackModal } from '@/components/FeedbackModal';

const [showFeedback, setShowFeedback] = useState(false);

// Bouton déclencheur — par exemple dans ProfilePage
<button onClick={() => setShowFeedback(true)}>
  donner mon avis
</button>

{showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
```

### Comportement

1. Affiche deux `<textarea>` : "qu'est-ce que tu as aimé ?" et "qu'est-ce qui t'a frustrée ?"
2. Le bouton "envoyer" est activé dès qu'au moins un des deux champs est rempli
3. Appelle `submitFeedback()` au clic
4. En cas de succès : toast "merci pour ton retour 🖤" + `onClose()`
5. En cas d'erreur : toast d'erreur, modal reste ouverte
6. Overlay cliquable ferme la modal sans envoyer

**Pas de persistance locale** — le contenu des textareas est perdu à la fermeture.
Si l'utilisatrice ferme sans envoyer, aucun feedback n'est enregistré.

---

## 8. Page — `AnalyticsPage` (admin)

Fichier : `src/pages/Admin/AnalyticsPage.tsx`

Route : `/admin/analytics`

### Guard admin

```ts
// Redirige vers /home si non admin
useEffect(() => {
  if (!authLoading && (!user || !profile?.is_admin)) {
    navigate('/home', { replace: true });
  }
}, [user, profile, authLoading, navigate]);
```

La vérification est double : côté composant (redirect) et côté Supabase (RLS sur les
tables events et feedback). Un non-admin ne peut pas lire les données même s'il
contourne le redirect.

### Sections du dashboard

| Section | Source | Description |
|---------|--------|-------------|
| **Activation** | `getActivationKpis()` | 5 KPI cards : inscriptions, onboarding, cycles, programmes, séances |
| **Rétention** | `getRetentionKpis()` | 3 cards : actives 7j, actives 30j, total inscrites |
| **Séances par phase** | `getPhaseDistribution()` | Barres de progression par phase avec pourcentage |
| **Feedbacks** | `getFeedbackList(30)` | Cards chronologiques avec aimé / frustré |

### Chargement

Les 4 requêtes sont lancées en parallèle (`Promise.all`). En cas d'erreur sur l'une,
la première erreur rencontrée est affichée. Les autres sections se chargent quand même.

---

## 9. Points d'intégration dans l'app

### `SignupPage` — `signup_started`

```ts
// Au mount du composant — fire-and-forget
useEffect(() => {
  trackEvent('signup_started');
}, []);
```

**Pourquoi au mount et pas au submit ?** L'intention d'inscription est ce qu'on mesure.
Une utilisatrice qui visite la page mais ne valide pas est quand même dans le funnel.
Comme c'est un event one-time, si elle revient sur la page elle ne sera pas comptée deux fois.

### `OnboardingPage` — `onboarding_completed` + `cycle_filled`

```ts
// Step 2 — sans cycle (trackCycle = false)
await trackEvent('onboarding_completed');
navigate('/onboarding/reveal', { replace: true });

// Step 3 — avec cycle (après saveHealthData réussie)
await Promise.all([
  trackEvent('cycle_filled', { cycle_length: cycleLength }),
  trackEvent('onboarding_completed'),
]);
navigate('/onboarding/reveal', { replace: true });
```

**Pourquoi `await` ici ?** Ces events sont dans un flow critique. On veut être sûr
qu'ils sont bien soumis avant la navigation. Pour `session_logged` ou `page_viewed`,
le fire-and-forget suffit.

### `ProgramNewPage` — `training_filled`

```ts
// Après createProgram() réussi, avant navigate()
trackEvent('training_filled', { sessions_count: sessionsInput.length });
navigate(`/programs/${programId}`, { replace: true });
```

### `SessionRecapPage` — `session_logged`

```ts
// Après chargement réussi du récap
setDetail(data);
setLoading(false);
trackEvent('session_logged', {
  phase: data.cycle_phase ?? null,
  duration_minutes: data.duration_minutes ?? null,
  feeling: data.feeling ?? null,
});
```

**Pourquoi dans le recap et pas dans SessionActivePage ?** Le récap charge les données
de `session_history` déjà sauvegardées. C'est la confirmation que la séance a bien
été persistée. Tracker depuis `SessionActivePage` risquerait de compter des séances
abandonnées ou non sauvegardées.

### `AppLayout` — `page_viewed`

```ts
// Via usePageTracking() — s'exécute à chaque changement de pathname
usePageTracking();
```

---

## 10. Règles absolues

```
❌ Jamais de données personnelles dans metadata
   → Pas d'email, pas de nom, pas de prénom

❌ Jamais d'appel trackEvent() depuis un service métier
   → Seulement depuis les pages ou les hooks

❌ Jamais de await sur trackEvent() sauf dans un flow critique (onboarding)
   → Fire-and-forget par défaut — ne bloque pas l'UX

❌ Jamais d'appel aux fonctions admin (getActivationKpis etc.) depuis une page non-admin
   → Elles retournent des erreurs RLS pour les non-admins

✅ trackEvent() retourne toujours void — les erreurs sont loguées, jamais propagées
✅ submitFeedback() retourne { error } — l'appelant gère l'affichage de l'erreur
✅ profiles.is_admin est false par défaut — à activer manuellement en base
✅ Si on ajoute un nouvel event, l'ajouter dans le CHECK de la table events en SQL
   ET dans le type EventType en TypeScript ET dans ONE_TIME_EVENTS si nécessaire
```

---

## 11. Ajouter un nouvel event — checklist

1. Ajouter le type dans `src/types/analytics.ts` → `EventType`
2. Si one-time : l'ajouter dans `ONE_TIME_EVENTS` dans le même fichier
3. Modifier la contrainte CHECK en base :
   ```sql
   ALTER TABLE events DROP CONSTRAINT events_event_type_check;
   ALTER TABLE events ADD CONSTRAINT events_event_type_check
     CHECK (event_type IN ('signup_started', ... , 'nouveau_event'));
   ```
4. Appeler `trackEvent('nouveau_event', { ... })` au point de déclenchement
5. Si l'event doit apparaître dans le dashboard, ajouter la logique dans
   `getActivationKpis()` ou créer une nouvelle fonction dans `analyticsService.ts`

---

## 12. Structure des fichiers

```
src/
├── types/
│   └── analytics.ts              ← EventType, ONE_TIME_EVENTS, AnalyticsEvent, KPIs...
├── services/
│   └── analyticsService.ts       ← trackEvent(), submitFeedback(), fonctions admin
├── hooks/
│   └── usePageTracking.ts        ← track page_viewed à chaque navigation
├── components/
│   └── FeedbackModal.tsx         ← Modal bottom-sheet feedback qualitatif
├── pages/
│   └── Admin/
│       └── AnalyticsPage.tsx     ← Dashboard KPIs — accès is_admin uniquement
└── layouts/
    └── AppLayout.tsx             ← usePageTracking() intégré ici
```

Points d'intégration dans les pages existantes :

```
src/pages/auth/SignupPage.tsx            ← signup_started au mount
src/pages/onboarding/OnboardingPage.tsx  ← cycle_filled + onboarding_completed
src/pages/programs/ProgramNewPage.tsx    ← training_filled après createProgram()
src/pages/session/SessionRecapPage.tsx   ← session_logged après chargement récap
```

Route admin ajoutée dans `src/router.tsx` :
```
/admin/analytics → AnalyticsPage (hors layouts imbriqués — guard géré dans le composant)
```
