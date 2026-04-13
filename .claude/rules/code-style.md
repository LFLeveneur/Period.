# rules/code-style.md — Conventions de code Period.

## Langue

- Tous les commentaires dans le code sont en **français**
- Les noms de variables, fonctions, composants, fichiers sont en **anglais**
- Les messages affichés à l'utilisatrice sont en **français** (voir 03-copy.md)

---

## TypeScript

```ts
// ✅ Toujours typer explicitement les retours de fonctions
function getUser(): Promise<User | null> { ... }

// ✅ Utiliser 'as const' sur les objets de configuration immuables
const CYCLE_PHASES = ['menstrual', 'follicular', 'ovulation', 'luteal'] as const;

// ✅ Utiliser Record<K, V> pour les dictionnaires clé-valeur
const phaseLabels: Record<CyclePhase, string> = { ... };

// ✅ Utiliser des types union littéraux plutôt que des strings libres
type Feeling = 'survival' | 'notgreat' | 'solid' | 'pr';

// ✅ Les propriétés optionnelles utilisent ? — pas | undefined
interface Props { name?: string; }

// ✅ Les valeurs nullables Supabase utilisent | null (pas | undefined)
interface Profile { avatar_url: string | null; }

// ❌ Jamais de 'as any' sans commentaire JSDoc justificatif
// ❌ Jamais de types inlinés dans les composants — tout va dans src/types/
// ❌ Jamais d'import de types depuis les fichiers de services
//    → Les types sont dans types/ — les services les importent de là
```

---

## Nommage des fichiers

| Type | Convention | Exemple |
|------|-----------|---------|
| Composants React | PascalCase | `PrimaryButton.tsx` |
| Pages | PascalCase + Page | `LoginPage.tsx` |
| Hooks | camelCase + use | `useAuthContext.ts` |
| Services | camelCase + Service | `authService.ts` |
| Types | camelCase | `auth.ts`, `cycle.ts` |
| Utils | camelCase | `cycleUtils.ts` |
| Styles | kebab-case | `variables.css` |

---

## Structure des composants

```tsx
// 1. Imports externes
import { useState } from 'react';

// 2. Imports internes — types d'abord, puis composants, puis utils
import type { Profile } from '@/types/auth';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

// 3. Interface des props — toujours avec JSDoc
interface ProfileCardProps {
  /** Profil de l'utilisatrice à afficher */
  profile: Profile;
  /** Callback appelé au tap sur le bouton modifier */
  onEdit: () => void;
}

// 4. Composant — fonction nommée (pas arrow function anonyme)
export function ProfileCard({ profile, onEdit }: ProfileCardProps) {
  // 5. State et hooks en premier
  const [loading, setLoading] = useState(false);

  // 6. Handlers — nommés handle + action
  const handleEdit = () => {
    onEdit();
  };

  // 7. Rendu
  return (
    <div>...</div>
  );
}
```

---

## Gestion des erreurs

```ts
// ✅ Les services retournent toujours { data, error } ou { error }
// Jamais de throw — l'appelant gère l'erreur

async function signIn(email: string, password: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: { message: mapErrorMessage(error.message) } };
  return { error: null };
}

// ✅ Dans les composants — toujours afficher l'erreur à l'utilisatrice
const { error } = await authService.signIn(email, password);
if (error) {
  setErrorMessage(error.message);
  return;
}
```

---

## Requêtes Supabase

```ts
// ✅ Toujours .maybeSingle() quand le résultat peut être null
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();

// ❌ Jamais .single() si le résultat peut être null — ça throw une erreur

// ✅ Toujours importer supabase depuis src/lib/supabase.ts
import { supabase } from '@/lib/supabase';

// ✅ Toujours importer env depuis src/lib/env.ts
import { env } from '@/lib/env';
```

---

## Règles de fichiers

- Max 200 lignes par fichier de composant
- Max 150 lignes par fichier de service
- Un composant = un fichier = un export default OU export nommé cohérent
- Les barrel exports (`index.ts`) sont autorisés dans `components/ui/`
- Pas de logique métier dans les composants — elle va dans les services ou hooks
