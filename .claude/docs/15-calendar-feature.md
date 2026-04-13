# Feature : Calendrier avec séances prévues et complétées

## Vue d'ensemble

Le calendrier (/calendar) affiche un mois complet avec :
- **Phases du cycle** (couleurs de fond) — si l'utilisatrice suit son cycle
- **Séances complétées** (point vert) — séances que l'utilisatrice a déjà faites
- **Séances prévues** (point gris) — séances planifiées pour aujourd'hui ou le futur
- **Légende explicative** en bas du calendrier

## Architecture

### Flux de données

```
CalendarPage (/calendar)
    ↓
getCalendarMonth(userId, year, month)  [src/services/calendarService.ts]
    ↓
4 requêtes Supabase parallèles :
    1. predictPhasesForMonth() — calcul du cycle en mémoire
    2. session_history (JOIN program_sessions) — séances complétées
    3. program_sessions (scheduled_date) — séances ponctuelles prévues
    4. program_sessions (day_of_week) — séances récurrentes prévues
    ↓
CalendarDay[] avec { date, cycleDay, sessionHistory, pendingSession }
    ↓
CalendarGrid + DayDetailSheet (modaux)
```

### Types clés

**CalendarDay** (src/services/calendarService.ts:8-18)
```typescript
export interface CalendarDay {
  date: string;                              // YYYY-MM-DD
  cycleDay: CycleDay | null;                // phase du cycle
  sessionHistory: {                          // séance complétée
    id: string;
    sessionName: string;
    durationMinutes: number;
  } | null;
  pendingSession: {                          // séance prévue
    id: string;
    sessionName: string;
  } | null;
}
```

## Fonctionnement détaillé

### 1. Chargement des séances complétées

**Requête :**
```typescript
supabase
  .from('session_history')
  .select('id, duration_minutes, completed_at, program_sessions!session_id(name)')
  .eq('user_id', userId)
  .gte('completed_at', firstDay)
  .lte('completed_at', lastDay + 'T23:59:59Z')
```

**Traitement :**
- Extrait la date du timestamp `completed_at` (YYYY-MM-DD)
- Récupère le nom de la séance depuis le JOIN `program_sessions`
- Crée un index `historyByDate: Record<date, { id, sessionName, durationMinutes }>`
- Une seule séance par jour (première trouvée)

### 2. Chargement des séances prévues (date spécifique)

**Requête :**
```typescript
supabase
  .from('program_sessions')
  .select('id, name, scheduled_date')
  .eq('user_id', userId)
  .eq('status', 'pending')
  .gte('scheduled_date', firstDay)
  .lte('scheduled_date', lastDay)
  .is('day_of_week', null)  // Exclure les récurrentes
```

**Traitement :**
- Filtre `dateStr >= todayStr` — **exclut les séances passées**
- Crée un index `pendingByDate: Record<date, { id, sessionName }>`
- Une seule séance par jour (première trouvée)

### 3. Chargement des séances prévues (récurrentes)

**Requête :**
```typescript
supabase
  .from('program_sessions')
  .select('id, name, day_of_week')
  .eq('user_id', userId)
  .eq('status', 'pending')
  .not('day_of_week', 'is', null)
```

**Traitement :**
- Parcourt les sessions avec `day_of_week` défini (0=lun, 6=dim)
- Pour chaque jour du mois :
  - Convertit le jour JS (0=dim) en lun-first (0=lun) avec `(jsDay + 6) % 7`
  - Si le jour correspond, génère la date YYYY-MM-DD
  - Filtre `dateStr >= todayStr` — **exclut les séances passées**
  - Ajoute à l'index `pendingByDate`

### 4. Affichage dans CalendarGrid

**Point vert (séance complétée) :**
```typescript
{day.sessionHistory && (
  <span style={{ backgroundColor: 'var(--color-success)' }} />
)}
```

**Point gris (séance prévue) :**
```typescript
{!day.sessionHistory && day.pendingSession && (
  <span style={{ backgroundColor: 'var(--color-text-muted-dark)' }} />
)}
```

**Légende des séances :**
```typescript
// Point vert + "séance complétée"
// Point gris + "séance prévue"
```

### 5. Modal DayDetailSheet (clic sur un jour)

**Si séance complétée :**
```
✅ Nom de la séance · 45 min
```
→ Lien vers /history/:id (détails + performances)

**Si séance prévue (pas de complétée) :**
```
🗓 Nom de la séance prévue
```
→ Lien vers /session/:id/preview (aperçu avant de commencer)

**Logique :** XOR — si les deux existent, affiche seulement la complétée

## Cas limites et règles

| Cas | Comportement |
|-----|--------------|
| Séance complétée + prévue même jour | Affiche seulement la complétée |
| Plusieurs séances prévues même jour | Stocke la première, affichée dans la modal |
| Séance prévue dans le passé | N'apparaît jamais |
| Jour futur | Affiche avec opacity 0.5 (CSS) |
| Erreur Supabase | Non-bloquante, calendrier affiche sans séances |
| Jour sans séance | Affiche seulement la phase (fond coloré) |
| Cycle non suivi | Pas de fond de couleur, seulement les séances |

## Variables d'environnement

Aucune. Toutes les données viennent de Supabase (table `program_sessions`).

## Performance

- 4 requêtes parallèles via `Promise.all()`
- Pas d'appels en cascade
- Indexation en mémoire pour O(1) lookup
- Compatible avec mois futurs (calcul en mémoire, pas de requête supplémentaire)

## Tests

### Happy path
1. Créer/importer un programme avec séances
2. Naviguer vers /calendar
3. Vérifier points gris sur jours avec séances prévues
4. Cliquer → affiche modal avec séance
5. Naviguer vers le futur → séances prévues visibles
6. Naviguer vers le passé → séances prévues disparaissent

### Edge cases
- [ ] Séance ponctuelle à date spécifique → affiche à la bonne date
- [ ] Séance récurrente (ex: chaque lundi) → affiche tous les lundis du mois
- [ ] Deux séances le même jour (prévue + complétée) → affiche seulement la complétée
- [ ] Séance prévue hier → n'apparaît pas
- [ ] Mois sans séances → calendrier affiche seulement phases

## Fichiers touchés

| Fichier | Rôle | Changements |
|---------|------|------------|
| `src/services/calendarService.ts` | Logique métier | 4 requêtes, 2 index (pending), filtrage date |
| `src/components/calendar/CalendarGrid.tsx` | Affichage | Points + légende séances |
| `src/components/calendar/DayDetailSheet.tsx` | Modal | Déjà prêt, aucun changement |
| `src/pages/calendar/CalendarPage.tsx` | Page | Déjà prêt, aucun changement |

## Documentation pertinente

- `docs/04-database.md` — schéma `program_sessions` (colonnes `scheduled_date`, `day_of_week`, `status`)
- `docs/05-data-models.md` — type `ProgramSession`
- `docs/07-screens.md` (S-20) — spec du calendrier
- `.claude/plans/validated-discovering-pond.md` — plan d'implémentation
