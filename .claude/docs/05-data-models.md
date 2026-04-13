05 — Data Models
Source de vérité des types TypeScript et des structures de données. Ce
fichier définit
tous les types, interfaces, enums et constantes utilisés dans l'application. Il sert
de
référence pour Cursor lors de la génération de code. Si un type n'est pas défini
ici, il
n'existe pas. Aucun type ne doit être inventé directement dans un composant.
Organisation des fichiers de types
src/
├── types/
│ ├── auth.ts ← Types liés à l'authentification et au
profil
│ ├── cycle.ts ← Types liés au cycle menstruel et aux
phases
│ └── workout.ts ← Types liés aux séances, exercices, hi
storique, recap
└── lib/
 └── env.ts ← Types des variables d'environnement
1. Types Auth — src/types/auth.ts
User
Alias du type Supabase. Représente l'utilisatrice connectée.
import type { User as SupabaseUser } from '@supabase/supabase
-js';
export type User = SupabaseUser;
05 — Data Models 1 weight?: number;
 duration?: number;
 distance?: number;
 added_load?: number;
 rir?: number;
 };
 note?: string; // Note libre sur cette série
}
SetFieldConfig
Configuration d'un champ de saisie selon le type d'exercice.
Utilisée pour rendre dynamiquement les bons inputs dans la séance active.
export interface SetFieldConfig {
 name: keyof SetState; // Nom du champ dans SetStat
e
 label: string; // Label affiché dans l'UI
 type: 'number' | 'decimal' | 'text' | 'time'; // Type de
l'input
 required?: boolean; // Champ obligatoire
 range?: [number, number]; // Plage valide (ex: [0, 10]
pour RIR)
 placeholder?: string; // Placeholder du champ
}
Configurations par input_type (depuis src/utils/constants.ts ) :
export const SET_INPUT_CONFIG: Record<ExerciseInputType, SetF
ieldConfig[]> = {
 weight_reps: [
 { name: 'reps', label: 'Reps', type: 'number', re
quired: true },
 { name: 'weight', label: 'Poids (kg)', type: 'decimal', r
equired: true },
05 — Data Models 10 { name: 'rir', label: 'RIR', type: 'number', r
ange: [0, 10] },
 ],
 bodyweight_reps: [
 { name: 'reps', label: 'Reps', type: 'number', required:
true },
 { name: 'rir', label: 'RIR', type: 'number', range: [0,
10] },
 ],
 cardio_duration: [
 { name: 'duration', label: 'Durée (MM:SS)', type: 'time',
required: true },
 ],
 cardio_distance: [
 { name: 'distance', label: 'Distance (km)', type: 'decima
l', required: true },
 { name: 'duration', label: 'Durée (MM:SS)', type: 'time', 
required: true },
 ],
 weight_plus_load: [
 { name: 'reps', label: 'Reps', typ
e: 'number', required: true },
 { name: 'added_load', label: 'Charge ajoutée (kg)', typ
e: 'decimal', required: false },
 { name: 'rir', label: 'RIR', typ
e: 'number', range: [0, 10] },
 ],
};
Program
Programme d'entraînement complet.
export interface Program {
 id: string;
05 — Data Models 11 user_id: string;
 name: string;
 description: string | null;
 duration_weeks: number;
 is_active: boolean;
 status: ProgramStatus; // 'active' | 'paused' | 'complete
d'
 created_at: string;
}
ProgramSession
Séance planifiée dans un programme.
export interface ProgramSession {
 id: string;
 program_id: string | null;
 user_id: string;
 name: string;
 order_index: number;
 day_of_week: number | null; // 0=Lundi … 6=Dimanche
 scheduled_date: string | null;
 status: SessionStatus; // 'pending' | 'completed' |
'skipped'
}
SessionExercise
Exercice planifié dans une séance.
export interface SessionExercise {
 id: string;
 session_id: string;
 exercise_catalog_id: string | null; // Rempli OU
 user_custom_exercise_id: string | null; // l'autre — jama
05 — Data Models 12is les deux
 set_targets: SetTarget[]; // Cibles par série (une entrée
par série)
 // Legacy — gardé pour compatibilité
 sets?: number; // Dérivé de set_targets.length
 reps?: string; // Ex: "6–8"
 weight?: number | null;
 order_index: number;
 completed: boolean;
 // Jointure dénormalisée depuis exercise_catalog ou user_cu
stom_exercises
 exercise_name?: string;
 exercise_category?: string;
 exercise_type?: string;
 input_type?: ExerciseInputType;
 rest_between_sets?: number; // Secondes — défaut: 150
(2'30)
 rest_after_exercise?: number; // Secondes
 is_substitution?: boolean;
}
ExerciseCatalogItem
Exercice du catalogue global.
export interface ExerciseCatalogItem {
 id: string;
 name: string;
 category: string;
 subcategory: string;
05 — Data Models 13 type: string;
 muscle_primary: string;
 muscle_secondary: string | null;
 is_public: boolean;
 source: 'catalog'; // Discriminant pour AnyExercise
}
CustomExercise
Exercice personnalisé créé par l'utilisatrice.
export interface CustomExercise {
 id: string;
 user_id: string;
 name: string;
 category: string;
 subcategory: string;
 type: string;
 muscle_primary: string;
 muscle_secondary: string | null;
 notes: string | null;
 source: 'custom'; // Discriminant pour AnyExercise
}
AnyExercise
Union des deux types d'exercices. Utilisée partout où les deux sources sont
possibles.
export type AnyExercise = ExerciseCatalogItem | CustomExercis
e;
Pattern de discrimination :
05 — Data Models 14// Vérifier la source d'un exercice
if (exercise.source === 'catalog') {
 // ExerciseCatalogItem — accès à exercise.is_public
} else {
 // CustomExercise — accès à exercise.notes, exercise.user_i
d
}
SessionHistory
Enregistrement d'une séance complétée.
export interface SessionHistory {
 id: string;
 user_id: string;
 session_id: string;
 completed_at: string; // ISO 8601
 duration_minutes: number;
 energy_score: number; // 0-100
 performance_score: number; // 0-100
 recovery_score: number; // 0-100
 total_volume: number; // kg total (poids × reps cumulé
s)
}
ExerciseHistory
Détail des performances d'un exercice lors d'une séance complétée.
export interface ExerciseHistory {
 id: string;
 user_id: string;
 session_history_id: string;
 exercise_catalog_id: string | null;
 user_custom_exercise_id: string | null;
05 — Data Models 15 set_details: SetDetails[]; // Détail par série
 // Legacy CSV — gardés pour compatibilité avec l'ancien cod
e
 reps_per_set?: string; // Ex: "10, 10, 8"
 weight_per_set?: string; // Ex: "60, 60, 57.5"
 avg_score: number;
 progression: 'up' | 'down' | 'stable';
 input_type?: ExerciseInputType;
 actual_rest_seconds?: number;
 was_substituted?: boolean;
 substituted_from_id?: string;
}
Victory
Une victoire détectée et affichée dans le récap de séance.
export interface Victory {
 type: VictoryType; // 'new_record' | 'better_than_prev
ious_phase' | 'double_record'
 exerciseName: string; // Ex: "Squat barre"
 improvement?: string; // Ex: "+5kg par rapport à la semai
ne dernière"
}
SessionRecapData
Données complètes du récap de fin de séance. Calculées par useSessionRecap .
export interface SessionRecapData {
 durationMinutes: number;
 exercisesCompleted: number;
05 — Data Models 16 feeling: WorkoutFeeling;
 performance: PerformanceLevel;
 victories: Victory[];
 energyVsPerformanceMessage: string;
}
SessionTemplate
Template de séance personnel, réutilisable.
export interface SessionTemplate {
 id: string;
 user_id: string;
 name: string;
 description: string | null;
 exercises: SessionTemplateExercise[];
 created_at: string;
}
SessionTemplateExercise
Exercice dans un template de séance.
export interface SessionTemplateExercise {
 id: string;
 template_id: string;
 exercise_catalog_id: string;
 exercise_name: string; // Dénormalisé depuis exercise
_catalog
 exercise_category?: string;
 sets: number;
 reps: number;
 weight: number | null;
 order_index: number;
}
05 — Data Models 17ProgramTemplateAssignment
Association d'un template à un programme avec jour et fréquence.
export interface ProgramTemplateAssignment {
 id: string;
 program_id: string;
 template_id: string;
 day_of_week: number; // 0-6 (Dimanche-Samedi)
 frequency_type: FrequencyType;
 start_week: number | null; // Pour biweekly/triweekly : se
maine de départ (1, 2, 3…)
 order_index: number;
 created_at: string;
 template?: SessionTemplate; // Dénormalisé pour l'UI
}
4. Constantes importantes
Labels des ressentis
export const FEELING_LABELS: Record<WorkoutFeeling, string> =
{
 survival: '🪫 séance de survie',
 notgreat: ' pas au top mais présente',
 solid: '💪 solide',
 pr: '⚡ j\'étais en mode PR',
};
Conversion ressenti → energy_score
export const FEELING_TO_SCORE: Record<WorkoutFeeling, number>
= {
05 — Data Models 18 survival: 10,
 notgreat: 35,
 solid: 70,
 pr: 100,
};
Labels des performances
export const PERFORMANCE_LABELS: Record<PerformanceLevel, str
ing> = {
 beyond: '⚡ au-delà',
 progression:'📈 en progression',
 solid: '💪 solide',
 maintained: '🖤 maintenu',
 decline: '📉 baisse',
};
Couleurs et emojis des phases (4 valeurs — pour
CyclePhaseBadge)
export const CYCLE_PHASE_COLORS: Record<CyclePhase, { bg: str
ing; text: string; emoji: string }> = {
 menstrual: { bg: '#ECA6A6', text: '#DE3030', emoji: '🔴'
},
 follicular: { bg: '#F2ECAD', text: '#EDDF40', emoji: '🌱'
},
 ovulation: { bg: '#A6ABE4', text: '#303DCA', emoji: '⚡' },
 luteal: { bg: '#A6E4CB', text: '#30CA8C', emoji: '🌙'
},
};
Labels des phases (4 valeurs)
05 — Data Models 19Les propriétés importantes de User :
Propriété Type Description
id string UUID de l'utilisatrice
email
string |
undefined
Email de l'utilisatrice
user_metadata object Métadonnées custom (ex: full_name via Google
OAuth)
created_at string Date de création du compte
Profile
Données du profil étendu, stockées dans la table profiles .
export interface Profile {
 id: string;
 name: string | null;
 objective: 'masse' | 'perte' | 'tonification' | 'equilibre'
| null;
 level: 'debutant' | 'intermediaire' | 'avance' | null;
 gender: 'femme' | 'homme' | 'autre' | null;
 cycle_tracking: boolean | null;
 avatar_url: string | null;
}
ProfileFormData
Données envoyées lors d'une mise à jour du profil. Toutes les propriétés sont
optionnelles
car l'utilisatrice peut modifier un seul champ à la fois.
export interface ProfileFormData {
 name?: string;
 objective?: Profile['objective'];
 level?: Profile['level'];
 gender?: Profile['gender'];
05 — Data Models 2export const CYCLE_PHASE_LABELS: Record<CyclePhase, string> =
{
 menstrual: 'Menstruation',
 follicular: 'Folliculaire',
 ovulation: 'Ovulation',
 luteal: 'Lutéale',
};
Conseils de séance par phase et contexte
Utilisés pour les bandeaux des pages séance active, à venir, et passée.
export const CYCLE_ADVICE: Record<CyclePhase, {
 active: string; // Pendant la séance — "tu es en..."
 upcoming: string; // Avant la séance — "tu seras en..."
 past: string; // Après la séance — "tu étais en..."
}> = { ... };
Le contenu exact est dans 03-copy.md section 6, 7, 9.
Messages énergie × performance (matrice récap)
export const RECAP_MESSAGES: Record<string, string> = {
 'survival_beyond': '🤯 tu te sentais à plat — et t\'as
surpassé tes références...',
 'survival_solid': 'tu te sentais en mode survie — et t
\'as tenu tes charges...',
 // ... 20 combinaisons au total
 // Clé = `${WorkoutFeeling}_${PerformanceLevel}`
};
Le contenu exact de chaque message est dans 03-copy.md section 8.
05 — Data Models 205. Données mockées — structure pour la démo
Pendant la démo, si Supabase n'est pas branché, ces structures sont utilisées
pour peupler l'interface avec des données réalistes.
Mock utilisateur
const MOCK_USER = {
 id: 'user-demo-1',
 name: 'Léa',
 lastPeriodStart: '2025-04-02', // J8 aujourd'hui si on est
le 10 avril
 cycleLength: 28,
 periodLength: 5,
 ovulationDay: 14,
};
Mock programme
const MOCK_PROGRAM = {
 id: 'prog-demo-1',
 name: 'Programme Jambes 3x/semaine',
 status: 'active' as ProgramStatus,
 is_active: true,
 sessions: [
 {
 id: 'sess-demo-1',
 name: 'Séance 1 — Jambes',
 order_index: 0,
 status: 'pending' as SessionStatus,
 exercises: [
 {
 id: 'ex-demo-1',
 exercise_name: 'Squat barre',
 input_type: 'weight_reps' as ExerciseInputType,
 rest_between_sets: 150,
05 — Data Models 21 set_targets: [
 { reps: 8, weight: 60, rir: 2 },
 { reps: 8, weight: 60, rir: 2 },
 { reps: 8, weight: 60, rir: 2 },
 { reps: 6, weight: 60, rir: 1 },
 ],
 },
 {
 id: 'ex-demo-2',
 exercise_name: 'Presse à cuisses',
 input_type: 'weight_reps' as ExerciseInputType,
 rest_between_sets: 120,
 set_targets: [
 { reps: 12, weight: 80, rir: 2 },
 { reps: 12, weight: 80, rir: 2 },
 { reps: 10, weight: 80, rir: 1 },
 ],
 },
 {
 id: 'ex-demo-3',
 exercise_name: 'Hip thrust barre',
 input_type: 'weight_reps' as ExerciseInputType,
 rest_between_sets: 120,
 set_targets: [
 { reps: 12, weight: 70, rir: 2 },
 { reps: 12, weight: 70, rir: 2 },
 { reps: 10, weight: 70, rir: 1 },
 ],
 },
 {
 id: 'ex-demo-4',
 exercise_name: 'Leg curl allongé',
 input_type: 'weight_reps' as ExerciseInputType,
 rest_between_sets: 90,
 set_targets: [
 { reps: 12, weight: 35, rir: 2 },
05 — Data Models 22 { reps: 12, weight: 35, rir: 2 },
 { reps: 10, weight: 35, rir: 1 },
 ],
 },
 ],
 },
 ],
};
Mock historique
const MOCK_HISTORY = [
 {
 id: 'hist-demo-1',
 completed_at: '2025-04-07T18:30:00Z', // Il y a 3 jours
 session_name: 'Séance 1 — Jambes',
 cycle_day: 5,
 phase: 'menstrual' as CyclePhase,
 feeling: 'notgreat' as WorkoutFeeling,
 duration_minutes: 52,
 exercise_history: [
 {
 exercise_name: 'Squat barre',
 weight_per_set: '57.5, 57.5, 55, 55',
 reps_per_set: '8, 7, 8, 7',
 progression: 'up' as const,
 },
 ],
 },
 {
 id: 'hist-demo-2',
 completed_at: '2025-04-04T17:00:00Z', // Il y a 6 jours
 session_name: 'Séance 1 — Jambes',
 cycle_day: 2,
 phase: 'menstrual' as CyclePhase,
05 — Data Models 23 feeling: 'survival' as WorkoutFeeling,
 duration_minutes: 45,
 exercise_history: [
 {
 exercise_name: 'Squat barre',
 weight_per_set: '55, 55, 52.5, 52.5',
 reps_per_set: '8, 7, 8, 6',
 progression: 'stable' as const,
 },
 ],
 },
];
6. Schéma des flux de données
flowchart LR
 subgraph Sources
 DB[(Supabase DB)]
 Mock[Données mockées]
 end
 subgraph Services
 AS[authService]
 WS[workoutService]
 HS[sessionHistoryService]
 CS[cyclePredictionService]
 ES[exerciseService]
 TS[sessionTemplateService]
 end
 subgraph Hooks
 AH[useAuthContext]
 WH[useWorkout]
 HH[useSessionRecap]
05 — Data Models 24 CH[useCycleDay]
 end
 subgraph UI
 Pages
 Components
 end
 DB --> AS --> AH --> Pages
 DB --> WS --> WH --> Pages
 DB --> HS --> HH --> Pages
 DB --> CS --> CH --> Pages
 DB --> ES --> Pages
 DB --> TS --> Pages
 Mock -.-> WH
 Mock -.-> HH
 CH --> Components
UI
Hooks
Services Sources
Pages
Components
useAuthContext
useWorkout
useSessionRecap
useCycleDay
authService
workoutService
sessionHistoryService
cyclePredictionService
exerciseService
sessionTemplateService
Supabase DB
Données mockées
7. Règles TypeScript
✅ Toujours typer explicitement les retours de fonctions
✅ Utiliser 'as const' sur les objets de configuration immuab
les
✅ Utiliser Record<K, V> pour les dictionnaires clé-valeur
✅ Utiliser des types union litéraux plutôt que des strings l
ibres
✅ Les propriétés optionnelles utilisent ? — pas | undefined
05 — Data Models 25explicite
✅ Les valeurs nullables Supabase utilisent | null (pas | und
efined)
❌ Jamais de 'as any' sans commentaire JSDoc justificatif
❌ Jamais de types inlinés dans les composants — tout va dans
types/
❌ Jamais d'import de types depuis les fichiers de services
 → Les types sont dans types/ — les services les importent
de là
05 — Data Models 26 cycle_tracking?: boolean;
}
AuthError
Erreur retournée par les opérations d'authentification.
export interface AuthError {
 message: string;
 code?: string;
}
2. Types Cycle — src/types/cycle.ts
CyclePhase (base de données — 4 phases)
Type stocké en base de données. La base ne connaît que ces 4 valeurs.
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulat
ion' | 'luteal';
CyclePhaseDisplay (UI — 5 sous-phases)
Type utilisé uniquement côté frontend pour l'affichage. La phase luteal est
divisée
en deux pour donner des recommandations plus précises.
export type CyclePhaseDisplay =
 | 'menstrual' // J1 → J[periodLength] 🔴 rouge
 | 'follicular' // J[periodLength+1] → J[ovDay-2] 🌱 jaune
 | 'ovulation' // J[ovDay-1] → J[ovDay+1] ⚡ bleu
 | 'luteal_early' // J[ovDay+2] → J[cycleLength-7] 🌙 vert
 | 'luteal_late'; // J[cycleLength-6] → fin 🌑 vert
(mêmes couleurs)
05 — Data Models 3Règle : CyclePhase (4 valeurs) est utilisé pour les requêtes Supabase et les
bandeaux de séance. CyclePhaseDisplay (5 valeurs) est utilisé pour la roue du
cycle
et les pop-ups d'information.
CycleDay
Données du cycle pour une date donnée. Retourné par les hooks de cycle.
export interface CycleDay {
 phase: CyclePhaseDisplay; // Phase UI (5 valeurs)
 cycleDay: number; // Jour du cycle (1 = premier jo
ur des règles)
 cycleLength: number; // Durée totale du cycle en jour
s
 periodLength: number; // Durée des règles en jours
 ovulationDay: number; // Jour estimé d'ovulation
 date: string; // Date au format YYYY-MM-DD
}
PhaseConfig
Configuration visuelle et textuelle complète pour chaque phase.
Utilisée par la roue du cycle, les bandeaux, et les pop-ups.
export interface PhaseConfig {
 label: string; // Nom affiché dans la roue (ex: "Ph
ase folliculaire")
 emoji: string; // Emoji de la phase (ex: "🌱")
 color: string; // Couleur forte — hex (ex: "#EDDF4
0")
 colorMid: string; // Couleur intermédiaire — hex (ex:
"#F0E677")
 colorLight: string; // Couleur pâle — hex (ex: "#F2ECA
D")
 cardTextColor: string; // Couleur du texte sur fond coloré
05 — Data Models 4 banner: string; // Texte court du bandeau contextuel
(1-2 phrases)
 popupText: string; // Texte long de la pop-up biologiqu
e (avec \n\n pour séparer)
}
PHASE_DISPLAY_CONFIG
Constante qui mappe chaque CyclePhaseDisplay à sa PhaseConfig .
Source de vérité pour toutes les couleurs et textes de phase.
export const PHASE_DISPLAY_CONFIG: Record<CyclePhaseDisplay,
PhaseConfig> = {
 menstrual: {
 label: 'Menstruation',
 emoji: '🔴',
 color: '#DE3030',
 colorMid: '#E66C6C',
 colorLight: '#ECA6A6',
 cardTextColor: '#2F0057',
 banner: "tu es en menstruation — tes hormones sont au plu
s bas...",
 popupText: "aujourd'hui tu es en menstruation...\n\n✶ plu
s tu loggeras...",
 },
 follicular: { ... },
 ovulation: { ... },
 luteal_early: { ... },
 luteal_late: { ... },
};
Le contenu exact de chaque banner et popupText est dans 03-copy.md .
getCyclePhaseDisplay() — fonction utilitaire
05 — Data Models 5Calcule la CyclePhaseDisplay à partir des paramètres du cycle.
export function getCyclePhaseDisplay(
 cycleDay: number,
 periodLength: number,
 ovulationDay: number,
 cycleLength: number
): CyclePhaseDisplay {
 if (cycleDay <= periodLength) return 'menstrual';
 if (cycleDay < ovulationDay - 1) return 'follicular';
 if (cycleDay <= ovulationDay + 1) return 'ovulation';
 if (cycleDay <= cycleLength - 6) return 'luteal_earl
y';
 return 'luteal_late';
}
daysUntilNextPeriod() — fonction utilitaire
Calcule le nombre de jours avant les prochaines règles.
export function daysUntilNextPeriod(cycleDay: number, cycleLe
ngth: number): number {
 return cycleLength - cycleDay;
}
3. Types Workout — src/types/workout.ts
Enums de base
/** Phase du cycle (4 valeurs — base de données) */
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulat
ion' | 'luteal';
/** Statut d'une session planifiée */
05 — Data Models 6export type SessionStatus = 'pending' | 'completed' | 'skippe
d';
/** Source d'un exercice */
export type ExerciseSource = 'catalog' | 'custom';
/** Statut d'un programme */
export type ProgramStatus = 'active' | 'paused' | 'complete
d';
/** Ressenti de fin de séance */
export type WorkoutFeeling = 'survival' | 'notgreat' | 'soli
d' | 'pr';
/** Niveau de performance calculé */
export type PerformanceLevel = 'beyond' | 'progression' | 'so
lid' | 'maintained' | 'decline';
/** Type de victoire dans le récap */
export type VictoryType = 'new_record' | 'better_than_previou
s_phase' | 'double_record';
/** Fréquence d'une séance template */
export type FrequencyType = 'weekly' | 'biweekly' | 'triweekl
y' | 'monthly';
ExerciseInputType
Détermine quels champs de saisie afficher pour un exercice pendant la séance
active.
export type ExerciseInputType =
 | 'weight_reps' // → Champs : Poids (kg) + Reps + RIR
 | 'bodyweight_reps' // → Champs : Reps + RIR (pas de poid
s)
05 — Data Models 7 | 'cardio_duration' // → Champs : Durée (MM:SS)
 | 'cardio_distance' // → Champs : Distance (km) + Durée (M
M:SS)
 | 'weight_plus_load';// → Champs : Reps + Charge ajoutée (k
g) + RIR
Correspondance avec l'affichage :
input_type Champs affichés Cas d'usage
weight_reps Poids + Reps + RIR Squat barre, développé, etc.
bodyweight_reps Reps + RIR Pompes, tractions, etc.
cardio_duration Durée MM:SS Gainage, planche, etc.
cardio_distance Distance + Durée Course, vélo, etc.
weight_plus_load Reps + Charge ajoutée + RIR Tractions lestées, dips lestés
SetTarget
Cible planifiée pour une série. Stockée dans session_exercises.set_targets (jsonb).
export interface SetTarget {
 reps?: number; // Nombre de reps visées
 weight?: number; // Poids en kg (null pour bodyweight/
cardio)
 duration?: number; // Durée en secondes (cardio_duratio
n)
 distance?: number; // Distance en km (cardio_distance)
 added_load?: number; // Charge ajoutée en kg (weight_plus_
load)
 rir?: number; // RIR cible 0-10 — défaut: 2
 rest_after?: number; // Override du temps de repos après c
ette série (secondes)
}
SetState
05 — Data Models 8État en temps réel d'une série pendant la séance active. Stocké en mémoire
(useState).
Jamais persisté directement — converti en SetDetails lors de la sauvegarde.
export interface SetState {
 weight?: string; // Saisie poids en kg (string pour
l'input)
 reps?: string; // Saisie reps (string pour l'input)
 rir?: string; // Saisie RIR 0-10 (string pour l'inp
ut)
 duration?: number; // Durée en secondes (cardio)
 distance?: number; // Distance en km (cardio)
 added_load?: number; // Charge ajoutée en kg
 done: boolean; // Série complétée
 target?: SetTarget; // Référence à la cible pour affichag
e/comparaison
 note?: string; // Note libre de l'utilisatrice
}
Pourquoi des strings pour weight/reps/rir ? Les inputs HTML retournent des
strings.
Conserver le type string évite des conversions intermédiaires et préserve la
saisie
partielle (ex: "6" avant de taper "0" pour "60").
SetDetails
Détail complet d'une série complétée. Stocké dans exercise_history.set_details
(jsonb).
export interface SetDetails {
 set: number; // Numéro de la série (1-indexed)
 target: SetTarget; // Ce qui était planifié
 actual: { // Ce qui a réellement été fait
 reps?: number;
05 — Data Models 9