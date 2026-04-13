12 — Metrics
Source de vérité des métriques. Ce fichier définit les KPIs du MVP, les events
à tracker, et la définition du succès de la démo. Cursor lit ce fichier pour savoir
quels events implémenter côté app. Les métriques produit sont suivies via
Posthog
(ou équivalent léger). Les métriques de performance technique sont hors scope
MVP.
1. Définition du succès du MVP
Le MVP est un succès si, à la fin de la démonstration :
✅ 1. Une personne qui ne connaît pas Period. comprend immédi
atement le problème résolu
✅ 2. Le parcours de démonstration se déroule sans bug de la
landing page au récap de séance
✅ 3. La connexion entre phase du cycle et recommandation d'e
ntraînement est perçue
 comme utile et crédible
✅ 4. L'import de programme via Make fonctionne et l'utilisat
rice peut vérifier
 et valider
✅ 5. Les données de performance (charges, RIR, comparaison s
emaine précédente /
 même phase) sont affichées correctement
2. KPIs produit — MVP
Ces KPIs sont mesurés sur les premières utilisatrices réelles (test utilisateur +
démo).
KPIs d'activation
12 — Metrics 1 months_from_today: number, // Positif = futur, négatif = pa
ssé
});
Events Profil
// Photo de profil modifiée
track('profile_avatar_updated');
// Niveau ou objectif modifié
track('profile_updated', {
 field: 'name' | 'level' | 'objective' | 'cycle_length' | 'p
eriod_length',
});
// Jours d'entraînement modifiés
track('profile_training_days_updated', {
 days_count: number,
});
4. Implémentation du tracking
Service de tracking
// src/lib/analytics.ts
const ANALYTICS_ENABLED =
 import.meta.env.PROD && !!import.meta.env.VITE_POSTHOG_KEY;
export function track(
 event: string,
 properties?: Record<string, string | number | boolean | nul
l | undefined>
): void {
12 — Metrics 10 if (!ANALYTICS_ENABLED) {
 // En développement : log console pour debug
 console.log('[analytics]', event, properties);
 return;
 }
 try {
 // Posthog ou équivalent
 posthog.capture(event, properties);
 } catch (error) {
 // Jamais bloquer l'app pour une erreur analytics
 console.error('[analytics] tracking failed', event, erro
r);
 }
}
export function identify(userId: string, properties?: Record<
string, unknown>): void {
 if (!ANALYTICS_ENABLED) return;
 try {
 posthog.identify(userId, properties);
 } catch (error) {
 console.error('[analytics] identify failed', error);
 }
}
export function reset(): void {
 if (!ANALYTICS_ENABLED) return;
 try {
 posthog.reset();
 } catch (error) {
 console.error('[analytics] reset failed', error);
 }
}
12 — Metrics 11Règles d'implémentation
✅ Toujours importer { track } depuis src/lib/analytics.ts
✅ Appeler track() après la confirmation du succès d'une acti
on
 (pas avant, pas pendant le loading)
✅ Les events d'erreur sont trackés avec reason précis
✅ Jamais de données personnelles dans les properties (pas
d'email, pas de nom)
✅ Appeler identify() juste après une connexion réussie
✅ Appeler reset() juste après une déconnexion
❌ Ne jamais appeler posthog directement dans un composant
 → Toujours passer par src/lib/analytics.ts
❌ Ne jamais bloquer une action utilisatrice en attendant un
event analytics
❌ Ne jamais tracker en développement (ANALYTICS_ENABLED = fa
lse en dev)
5. Métriques de démo (non automatisées)
Ces métriques sont évaluées manuellement pendant et après la démonstration.
Grille d'évaluation démo
Critère Question évaluée Score
Clarté du problème "Est-ce que tu comprends ce que l'app résout ?" /5
Fluidité du parcours Nombre de blocages ou bugs pendant la démo Compte
Crédibilité cycle "Est-ce que la recommandation te semble utile ?" /5
Import Make Flow Make s'est déroulé sans erreur Oui / Non
Données
performance
Comparaisons séance précédente / même phase
visibles
Oui / Non
Intention d'usage "Est-ce que tu utiliserais cette app ?" /5
12 — Metrics 12Seuil de succès démo
Clarté du problème ≥ 4/5
Fluidité 0 blocage bloquant (les bugs mineurs son
t tolérés)
Crédibilité cycle ≥ 4/5
Import Make Oui
Données performance Oui
Intention d'usage ≥ 3.5/5 en moyenne sur les évaluateurs
6. Dashboard de suivi (post-démo)
Pour la phase de test utilisateur qui suit la démo, les métriques suivantes
sont suivies dans Posthog (ou exportées en CSV pour analyse).
Funnel d'activation
Inscription
 └── Onboarding step 1 démarré → taux : X%
 └── Onboarding complété → taux : X%
 └── 1er programme → taux : X%
 └── 1ère séance → taux : X%
Rétention
J0 → Inscription
J1 → Retour sur l'app
J3 → 2ème séance
J7 → 3ème séance ou plus
J14 → Actif (≥ 1 séance dans la semaine 2)
J30 → Actif (≥ 2 séances dans la semaine 4)
Répartition des ressentis
12 — Metrics 13Distribution des WorkoutFeeling sur l'ensemble des session_hi
story :
survival / notgreat / solid / pr → en % du total
Croisé avec la phase du cycle :
→ Quel ressenti predomine par phase ?
→ Valide l'hypothèse produit centrale
12 — Metrics 14KPI Définition Cible MVP
Taux de complétion
onboarding
% d'utilisatrices qui finissent les 4 steps ≥ 80%
Taux d'activation cycle % d'utilisatrices avec cycle_tracking = true ≥ 70%
Taux de création de
programme
% d'utilisatrices qui créent ou importent 1
programme
≥ 60%
Délai jusqu'à la 1ère séance
Temps entre inscription et 1ère
session_history
≤ 48h
KPIs d'engagement
KPI Définition Cible MVP
Séances par semaine
Nombre moyen de session_history par
utilisatrice par semaine
≥ 2
Taux de complétion de
séance
% de séances démarrées qui se terminent (vs
abandonnées)
≥ 75%
Rétention J7
% d'utilisatrices actives 7 jours après
l'inscription
≥ 40%
Utilisation du bandeau
phase
% de séances avec consultation du popup
PhaseInfo
≥ 50%
KPIs de valeur perçue
KPI Définition Mesure
Compréhension du
problème
L'observateur externe comprend le
problème en < 30s
Qualitatif — démo
Crédibilité de la
recommandation
Notation 1-5 par les testeurs ≥ 4/5
Utilité perçue du cycle
"Est-ce que ça t'a aidée à mieux
t'entraîner ?"
Qualitatif — test
utilisateur
3. Events à tracker
Convention de nommage
12 — Metrics 2[domaine]_[objet]_[action]
Domaine : auth | onboarding | cycle | program | session | ex
ercise | profile | navigation
Objet : user | step | phase | program | session | exercise
| template | import
Action : started | completed | skipped | failed | viewed |
tapped | created | deleted
Events Auth
// Inscription réussie
track('auth_user_signed_up', {
 method: 'email' | 'google',
});
// Connexion réussie
track('auth_user_signed_in', {
 method: 'email' | 'google',
});
// Déconnexion
track('auth_user_signed_out');
// Suppression de compte
track('auth_user_deleted');
Events Onboarding
// Démarrage step 1
track('onboarding_step_started', {
 step: 1 | 2 | 3 | 4,
});
12 — Metrics 3// Complétion d'un step
track('onboarding_step_completed', {
 step: 1 | 2 | 3 | 4,
 // Step 1
 level?: 'debutant' | 'intermediaire' | 'avance',
 objective?: 'masse' | 'perte' | 'tonification' | 'equilibr
e',
 // Step 2
 cycle_tracking?: boolean,
 // Step 3
 cycle_length?: number,
 period_length?: number,
 // Step 4
 training_days_count?: number, // Nombre de jours sélectionn
és
});
// Onboarding complété
track('onboarding_completed', {
 cycle_tracking: boolean,
 training_days_count: number,
 duration_seconds: number, // Durée totale de l'onboarding
});
// Révélation vue
track('onboarding_reveal_viewed', {
 current_phase: CyclePhaseDisplay | null,
});
Events Cycle
// Règles déclarées
track('cycle_period_declared', {
 source: 'home' | 'profile', // D'où vient la déclaration
12 — Metrics 4 cycle_day_count: number, // Nombre de cycles enregistré
s à ce moment
});
// Phase consultée (popup PhaseInfo ouvert)
track('cycle_phase_viewed', {
 phase: CyclePhaseDisplay,
 source: 'home_wheel' | 'home_banner' | 'session_preview' |
'session_active' | 'calendar',
});
// Cycle activé depuis le profil
track('cycle_tracking_enabled', {
 source: 'profile',
});
// Cycle désactivé depuis le profil
track('cycle_tracking_disabled', {
 source: 'profile',
});
Events Programme
// Programme créé manuellement
track('program_created', {
 method: 'manual',
 sessions_count: number,
 exercises_count: number, // Total exercices toutes séances
});
// Programme importé via Make
track('program_imported', {
 method: 'make',
 input_type: 'text' | 'file',
 sessions_count: number,
12 — Metrics 5 exercises_count: number,
 custom_exercises_count: number, // Exercices non matchés →
user_custom_exercises
 duration_seconds: number, // Durée du flow Make
});
// Import Make échoué
track('program_import_failed', {
 reason: 'timeout' | 'make_error' | 'json_invalid' | 'no_ses
sions',
 input_type: 'text' | 'file',
});
// Programme activé
track('program_activated', {
 program_id: string,
 sessions_count: number,
});
// Programme mis en pause
track('program_paused', {
 program_id: string,
});
// Programme supprimé
track('program_deleted', {
 had_history: boolean, // Avait-il des session_history ?
});
Events Séance
// Séance à venir consultée
track('session_preview_viewed', {
 session_id: string,
 has_history: boolean, // Y a-t-il une comparaison
12 — Metrics 6"dernière fois" ?
 current_phase: CyclePhase | null,
 exercises_count: number,
});
// Séance démarrée
track('session_started', {
 session_id: string,
 current_phase: CyclePhase | null,
 cycle_day: number | null,
});
// Série validée
track('session_set_completed', {
 session_id: string,
 exercise_name: string,
 set_number: number,
 input_type: ExerciseInputType,
 has_weight: boolean,
 has_reps: boolean,
 has_rir: boolean,
 rest_skipped: boolean, // L'utilisatrice a-t-elle sauté
le repos ?
});
// Séance complétée
track('session_completed', {
 session_id: string,
 duration_minutes: number,
 feeling: WorkoutFeeling,
 performance_score: number,
 performance_level: PerformanceLevel,
 exercises_completed: number,
 total_volume: number,
 victories_count: number,
 current_phase: CyclePhase | null,
12 — Metrics 7 cycle_day: number | null,
});
// Séance abandonnée
track('session_abandoned', {
 session_id: string,
 exercises_touched: number, // Nb d'exercices avec au moins
1 série saisie
 duration_minutes: number, // Durée avant abandon
 current_phase: CyclePhase | null,
});
// Victoire détectée (dans le récap)
track('session_victory_detected', {
 session_id: string,
 victory_type: VictoryType,
 exercise_name: string,
 current_phase: CyclePhase | null,
});
Events Exercice et Bibliothèque
// Exercice personnalisé créé
track('exercise_custom_created', {
 has_category: boolean,
 has_muscle: boolean,
});
// Exercice personnalisé modifié
track('exercise_custom_updated');
// Exercice personnalisé supprimé
track('exercise_custom_deleted');
// Bibliothèque consultée
12 — Metrics 8track('exercise_library_viewed', {
 tab: 'catalog' | 'custom',
 filters_active: boolean,
});
Events Template
// Template créé
track('template_created', {
 exercises_count: number,
});
// Template utilisé dans un programme
track('template_used_in_program', {
 template_id: string,
 target_session_order: number,
});
// Template supprimé
track('template_deleted');
Events Navigation
// Onglet bottom nav tapé
track('navigation_tab_tapped', {
 tab: 'home' | 'calendar' | 'programs' | 'history' | 'profil
e',
 from_tab: 'home' | 'calendar' | 'programs' | 'history' | 'p
rofile' | null,
});
// Calendrier — changement de mois
track('calendar_month_changed', {
 direction: 'prev' | 'next',
12 — Metrics 9