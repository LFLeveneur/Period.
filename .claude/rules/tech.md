# rules/tech.md — Stack technique Period.

## Stack autorisée

| Techno | Version | Rôle | Notes |
|--------|---------|------|-------|
| React | 19 | UI | Hooks uniquement — pas de class components |
| TypeScript | 5+ | Typage | Strict mode activé |
| Vite | 5+ | Build tool | — |
| Tailwind CSS | v4 | Styles utilitaires | En complément des CSS variables |
| React Router | v7 | Routing | Layouts imbriqués |
| Framer Motion | 11+ | Animations | Import depuis `motion/react` — animations fluides et subtiles |
| Supabase JS | 2+ | Auth + DB | Via `src/lib/supabase.ts` uniquement |
| Make | — | Import programme | Via webhook — jamais appelé directement depuis un composant |

---

## Ce qu'on n'utilise PAS

```
❌ Redux / Zustand / Jotai — le state global passe par AuthContext + React state local
❌ React Query / SWR — les fetches sont dans les services, gérés manuellement
❌ Axios — on utilise fetch() natif ou le client Supabase
❌ styled-components / Emotion — on utilise Tailwind + CSS variables
❌ Class components React — uniquement des functional components + hooks
❌ moment.js — on utilise date-fns ou l'API Intl native
❌ lodash — les utils sont écrits à la main dans src/utils/
❌ i18n libraries — le texte est en français, hardcodé, référencé dans 03-copy.md
```

---

## Connexions — règles absolues

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
```

```ts
// src/lib/supabase.ts — SEUL fichier autorisé à instancier le client
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
```

```
❌ Ne jamais écrire createClient() ailleurs que dans src/lib/supabase.ts
❌ Ne jamais lire import.meta.env ailleurs que dans src/lib/env.ts
❌ Ne jamais exposer les clés Supabase dans le code ou les commits
❌ Ne jamais appeler le webhook Make depuis un composant React directement
   → Toujours passer par src/services/makeImportService.ts
✅ Toujours importer { supabase } depuis src/lib/supabase.ts
```

---

## Variables d'environnement

```bash
# .env.local (non commité)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_MAKE_WEBHOOK_URL=https://hook.eu2.make.com/{WEBHOOK_ID}

# .env.example (commité — sans valeurs réelles)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MAKE_WEBHOOK_URL=
```

---

## Architecture des services

Chaque service :
- Est un fichier dans `src/services/`
- Exporte des fonctions nommées (pas de classe)
- Retourne toujours `{ data, error }` ou `{ error }` — jamais de throw
- Importe `supabase` depuis `src/lib/supabase.ts`
- Importe les types depuis `src/types/`

```ts
// Exemple de pattern de service
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/auth';

export async function getProfile(userId: string): Promise<{ data: Profile | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}
```

---

## Path aliases

Configurer `@/` comme alias vers `src/` dans `vite.config.ts` et `tsconfig.json`.

```ts
// Import avec alias
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types/auth';
```

---

## ESLint + Prettier

- ESLint avec `@typescript-eslint` en mode strict
- Prettier avec : `semi: true`, `singleQuote: true`, `tabWidth: 2`, `trailingComma: 'es5'`, `printWidth: 100`
- Les deux s'exécutent avant chaque commit (lint-staged recommandé)
