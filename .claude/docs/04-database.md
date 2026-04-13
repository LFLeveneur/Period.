04 — Base de données
Source de vérité de la structure de données. Ce fichier décrit l'intégralité du
schéma
Supabase de Period. : tables, colonnes, types, relations, contraintes, règles RLS,
et
comportements spéciaux. Aucune requête ne doit cibler une table ou une
colonne qui n'est
pas documentée ici. Si une table manque, elle n'existe pas encore en base.
Technologie
Supabase — Backend as a Service basé sur PostgreSQL.
Supabase fournit :
Une base PostgreSQL hébergée
Un système d'authentification (auth.users)
Un système de Row Level Security (RLS) pour isoler les données par utilisateur
Un stockage de fichiers (Storage — utilisé pour les avatars)
Des fonctions serveur (RPC — utilisées pour la suppression de compte)
Connexion — règle absolue
// src/lib/supabase.ts — SEUL fichier autorisé à instancier l
e client
import { createClient } from '@supabase/supabase-js';
import { env } from './env';
export const supabase = createClient(env.SUPABASE_URL, env.SU
PABASE_ANON_KEY);
04 — Base de données 1Enum de session_exercises.input_type :
input_type : 'weight_reps' → Poids + Reps + RIR
 | 'bodyweight_reps' → Reps + RIR (poids du corps)
 | 'cardio_duration' → Durée en MM:SS
 | 'cardio_distance' → Distance + Durée
 | 'weight_plus_load' → Reps + Charge ajoutée + RIR
Structure de set_targets (jsonb) :
// Un élément par série planifiée
interface SetTarget {
 reps?: number; // Reps visées
 weight?: number; // Poids en kg (null pour bodyweight/
cardio)
 duration?: number; // Durée en secondes (cardio)
 distance?: number; // Distance en km (cardio)
 added_load?: number; // Charge ajoutée en kg (exercices le
stés)
 rir?: number; // RIR cible 0-10 (défaut: 2)
 rest_after?: number; // Override repos après cette série
(secondes)
}
// Exemple pour un squat barre 4x6-8 à 60kg
set_targets: [
 { reps: 8, weight: 60, rir: 2 },
 { reps: 8, weight: 60, rir: 2 },
 { reps: 8, weight: 60, rir: 2 },
 { reps: 6, weight: 60, rir: 1 },
]
session_history
Enregistrement d'une séance complétée. Créé à la fin de chaque séance.
04 — Base de données 10RLS : activé — filtre sur user_id .
Colonne Type Nullable Description
id uuid ❌ PK
user_id uuid ❌ FK → auth.users.id
session_id uuid ✅ FK → program_sessions.id
completed_at timestamptz ❌ Date et heure de fin de séance
duration_minutes int ✅ Durée totale en minutes
energy_score int ✅
Score énergie 0-100 (dérivé du
ressenti)
performance_score int ✅
Score performance 0-100
(calculé)
recovery_score int ✅ Score récupération 0-100
total_volume float ✅
Volume total en kg (somme des
poids × reps)
Correspondance ressenti → energy_score :
survival → 10
notgreat → 35
solid → 70
pr → 100
exercise_history
Détail des performances par exercice lors d'une séance complétée.
RLS : activé — filtre sur user_id .
Colonne Type Nullable Description
id uuid ❌ PK
user_id uuid ❌ FK → auth.users.id
session_history_id uuid ❌ FK → session_history.id
exercise_catalog_id uuid ✅
FK →
exercise_catalog.id
04 — Base de données 11Colonne Type Nullable Description
user_custom_exercise_id uuid ✅ FK →
user_custom_exercises.id
set_details jsonb ✅
Array détaillé par série —
voir structure
reps_per_set text ✅ Legacy CSV : "10, 10, 8"
weight_per_set text ✅
Legacy CSV : "60, 60,
57.5"
avg_score float ✅ Score moyen de l'exercice
progression text ✅
Comparaison vs séance
précédente
input_type text ✅
Même enum que
session_exercises
actual_rest_seconds int ✅
Repos réel pris entre les
séries
was_substituted boolean ✅ L'exercice a été substitué
substituted_from_id uuid ✅
Exercice original avant
substitution
Enum de exercise_history.progression :
progression : 'up' | 'down' | 'stable'
Structure de set_details (jsonb) :
interface SetDetails {
 set: number; // Numéro de la série (1-indexed)
 target: SetTarget; // Ce qui était planifié
 actual: { // Ce qui a été réellement fait
 reps?: number;
 weight?: number;
 duration?: number;
 distance?: number;
 added_load?: number;
 rir?: number;
04 — Base de données 12 };
 note?: string; // Note libre de l'utilisatrice
}
health_data
Données de santé et de cycle par jour. Une seule ligne par utilisatrice par date.
C'est ici que les phases du cycle sont stockées et calculées.
RLS : activé — filtre sur user_id .
Colonne Type Nullable Description
id uuid ❌ PK
user_id uuid ❌ FK → auth.users.id
date date ❌ Date de la mesure (YYYY-MM-DD)
steps int ✅ Nombre de pas
calories_active int ✅ Calories actives brûlées
heart_rate_avg int ✅
Fréquence cardiaque moyenne
(bpm)
hrv float ✅
Variabilité de la fréquence
cardiaque
sleep_hours float ✅ Heures de sommeil
sleep_quality text ✅ Qualité du sommeil — voir enum
cycle_phase text ✅ Phase du cycle — voir enum
cycle_day int ✅
Jour du cycle (1 = premier jour des
règles)
cycle_length int ✅ Durée totale du cycle en jours
period_length int ✅ Durée des règles en jours
ovulation_day int ✅
Jour estimé d'ovulation dans le
cycle
basal_body_temp float ✅ Température basale (°C)
Enum de health_data.sleep_quality :
04 — Base de données 13sleep_quality : 'poor' | 'fair' | 'good'
Enum de health_data.cycle_phase (4 phases en base) :
cycle_phase : 'menstrual' → J1 à J[period_length]
 | 'follicular' → J[period_length+1] à J[ovulatio
n_day-2]
 | 'ovulation' → J[ovulation_day-1] à J[ovulatio
n_day+1]
 | 'luteal' → J[ovulation_day+2] à J[cycle_le
ngth]
Attention : La base de données stocke 4 phases. L'UI affiche 5 sous-phases
(luteal_early et luteal_late). Cette distinction se fait uniquement côté frontend,
dans src/types/cycle.ts via la fonction getCyclePhaseDisplay() . La base ne connaît
que luteal .
Comment le cycle est déclaré :
Quand une utilisatrice déclare le premier jour de ses règles, on insère une ligne
dans
health_data avec :
cycle_day = 1
cycle_phase = 'menstrual'
La date du jour
L'algorithme de prédiction ( cyclePredictionService.ts ) requête ensuite les lignes avec
cycle_day = 1 pour calculer la longueur réelle des cycles.
body_analysis
Analyse musculaire générée après une séance. Liée à un session_history .
RLS : activé — filtre sur user_id .
04 — Base de données 14Colonne Type Nullable Description
id uuid ❌ PK
user_id uuid ❌ FK → auth.users.id
session_history_id uuid ✅ FK → session_history.id
analyzed_at timestamptz ❌ Date de l'analyse
muscle_scores
Scores par groupe musculaire pour une body_analysis .
RLS : activé — accès via body_analysis parente.
Colonne Type Nullable Description
id uuid ❌ PK
body_analysis_id uuid ❌ FK → body_analysis.id
muscle_group text ❌ Groupe musculaire — voir enum
zone_score text ❌ Score de la zone — voir enum
action_items text[] ✅ Recommandations pour cette zone
Enums de muscle_scores :
muscle_group : 'legs' | 'core' | 'chest' | 'back' | 'arms' |
'traps' | 'rhomboids'
zone_score : 'green' | 'orange' | 'red'
ai_conversations
Conversations avec le Coach IA. Hors MVP — table existante mais non utilisée en
V1.
RLS : activé — filtre sur user_id .
Colonne Type Nullable Description
id uuid ❌ PK
user_id uuid ❌ FK → auth.users.id
04 — Base de données 15Colonne Type Nullable Description
context_type text ❌
Contexte de la conversation — voir
enum
started_at timestamptz ❌ Date de début
updated_at timestamptz ✅ Date de dernière mise à jour
Enum de ai_conversations.context_type :
context_type : 'post_session' | 'morning' | 'free_chat'
ai_messages
Messages individuels dans une conversation IA. Hors MVP.
Colonne Type Nullable Description
id uuid ❌ PK
conversation_id uuid ❌ FK → ai_conversations.id
role text ❌ Rôle du message — voir enum
content text ❌ Contenu du message
sent_at timestamptz ❌ Date d'envoi
Enum de ai_messages.role :
role : 'user' | 'assistant'
ai_feedbacks
Feedbacks IA post-séance. Hors MVP.
Colonne Type Nullable Description
id uuid ❌ PK
session_history_id uuid ✅ FK → session_history.id
conversation_id uuid ✅ FK → ai_conversations.id
feedback_text text ✅ Texte du feedback
04 — Base de données 16Colonne Type Nullable Description
score int ✅ Score du feedback (0-100)
notifications
Notifications push ou in-app pour l'utilisatrice.
RLS : activé — filtre sur user_id .
Colonne Type Nullable Description
id uuid ❌ PK
user_id uuid ❌ FK → auth.users.id
type text ❌ Type de notification — voir enum
title text ❌ Titre de la notification
body text ✅ Corps de la notification
is_read boolean ❌ Notification lue (défaut: false)
scheduled_at timestamptz ✅ Date d'envoi planifiée
sent_at timestamptz ✅ Date d'envoi réelle
Enum de notifications.type :
type : 'reminder' | 'ai_tip' | 'achievement' | 'recovery'
user_settings
Paramètres clé-valeur par utilisatrice. Un seul enregistrement par couple user +
key.
RLS : activé — filtre sur user_id .
Colonne Type Nullable Description
id uuid ❌ PK
user_id uuid ❌ FK → auth.users.id
key text ❌
Clé du paramètre (ex:
"notifications_enabled")
value text ✅ Valeur du paramètre (texte sérialisé)
04 — Base de données 17Colonne Type Nullable Description
updated_at timestamptz ✅ Date de dernière modification
Algorithme de calcul du cycle
flowchart TD
 A[Utilisatrice déclare ses règles] --> B[INSERT dans heal
th_data\ncycle_day=1, phase=menstrual]
 B --> C[cyclePredictionService.fetchCycleStats]
 C --> D{Combien de cycles\nhistoriques ?}
 D -->|>= 2 cycles| E[Calcul longueur réelle\npar écarts e
ntre dates]
 D -->|1 cycle| F[Valeur déclarée\nou 28j par défaut]
 E --> G[avgCycleLength, avgPeriodLength\navgOvulationDay]
 F --> G
 G --> H[predictPhaseForDate\npour chaque date demandée]
 H --> I[Calcul cycleDay\npar modulo du cycle]
 I --> J[getCyclePhaseDisplay\n4 phases → 5 sous-phases U
I]
 J --> K[Affichage dans\nl'app]
04 — Base de données 18Utilisatrice déclare ses 
règles
INSERT dans 
health_data\ncycle_day=1, 
phase=menstrual
cyclePredictionService.fetchCycleStats
Combien de 
cycles\nhistoriques ?
Calcul longueur réelle\npar 
écarts entre dates
Valeur déclarée\nou 28j par 
défaut
avgCycleLength, 
avgPeriodLength\navgOvulationDay
predictPhaseForDate\npour 
chaque date demandée
Calcul cycleDay\npar 
modulo du cycle
getCyclePhaseDisplay\n4 
phases → 5 sous-phases 
UI
Affichage dans\nl'app
>= 2 cycles 1 cycle
Formule du calcul de phase :
daysDiff = (targetDate - lastPeriodStart) en jours
cycleDay = (daysDiff % avgCycleLength) + 1
04 — Base de données 19// src/lib/env.ts — SEUL fichier autorisé à lire import.meta.
env
export const env = {
 SUPABASE_URL: requireEnv('VITE_SUPABASE_URL'),
 SUPABASE_ANON_KEY: requireEnv('VITE_SUPABASE_ANON_KEY'),
} as const;
❌ Ne jamais écrire createClient() ailleurs que dans src/lib/
supabase.ts
❌ Ne jamais lire import.meta.env ailleurs que dans src/lib/e
nv.ts
❌ Ne jamais exposer les clés Supabase dans le code ou les co
mmits
✅ Toujours importer { supabase } depuis src/lib/supabase.ts
Vue d'ensemble des tables
erDiagram
 auth_users ||--|| profiles : "1-1"
 auth_users ||--o{ programs : "1-N"
 auth_users ||--o{ health_data : "1-N"
 auth_users ||--o{ user_custom_exercises : "1-N"
 auth_users ||--o{ notifications : "1-N"
 auth_users ||--o{ user_settings : "1-N"
 auth_users ||--o{ ai_conversations : "1-N"
 programs ||--o{ program_sessions : "1-N"
 program_sessions ||--o{ session_exercises : "1-N"
 program_sessions ||--o{ session_history : "1-N"
 session_history ||--o{ exercise_history : "1-N"
 session_history ||--o{ body_analysis : "1-1"
 session_history ||--o{ ai_feedbacks : "1-N"
04 — Base de données 2if cycleDay <= periodLength → menstrual
if cycleDay < ovulationDay - 1 → follicular
if cycleDay <= ovulationDay + 1 → ovulation
if cycleDay <= cycleLength - 6 → luteal_early (UI uniqu
ement)
else → luteal_late (UI uniqu
ement)
Filtrage des écarts aberrants :
Les écarts entre cycles inférieurs à 15 jours ou supérieurs à 45 jours sont ignorés
dans le calcul de la moyenne — ce sont probablement des erreurs de saisie.
Règles RLS par table
Table RLS Règle
profiles ✅ user_id = auth.uid()
exercise_catalog ❌
Lecture publique pour tous les utilisateurs
authentifiés
user_custom_exercises ✅ user_id = auth.uid()
programs ✅ user_id = auth.uid()
program_sessions ✅ user_id = auth.uid()
session_exercises ✅
Via join program_sessions.user_id =
auth.uid()
session_history ✅ user_id = auth.uid()
exercise_history ✅ user_id = auth.uid()
health_data ✅ user_id = auth.uid()
body_analysis ✅ user_id = auth.uid()
muscle_scores ✅ Via join body_analysis.user_id = auth.uid()
ai_conversations ✅ user_id = auth.uid()
ai_messages ✅
Via join ai_conversations.user_id =
auth.uid()
ai_feedbacks ✅ Via join — pas de user_id direct
04 — Base de données 20Table RLS Règle
notifications ✅ user_id = auth.uid()
user_settings ✅ user_id = auth.uid()
Fonctions RPC Supabase
delete_user()
Supprime le compte de l'utilisateur connecté et toutes ses données.
Appelée depuis authService.deleteAccount() .
const { error } = await supabase.rpc('delete_user');
Cette fonction doit exister côté Supabase (SQL function avec security definer ).
Elle supprime dans l'ordre : données utilisateur → profil → compte auth.
Supabase Storage
Bucket avatars
Propriété Valeur
Accès Public
Chemin des fichiers {userId}/avatar.{ext}
Formats acceptés jpg , png , webp
Taille max
recommandée
5 MB
Upload
Via supabase.storage.from('avatars').upload(path, file, {
upsert: true })
URL publique Via supabase.storage.from('avatars').getPublicUrl(path)
Règles de développement base de données
✅ Toujours utiliser .maybeSingle() au lieu de .single() quan
d le résultat peut être null
04 — Base de données 21 → .single() lance une erreur si aucun résultat, .maybeSing
le() retourne null
✅ Toujours logger les erreurs Supabase avec console.error
('[service] method', error)
 avant de throw
✅ Toujours entourer les appels Supabase d'un try/catch
✅ Les insertions retournent les données insérées avec .selec
t().single()
 pour récupérer l'id généré
✅ Les mises à jour en batch utilisent Promise.all() — pas de
boucle await séquentielle
❌ Ne jamais exposer les données d'un user_id dans une requêt
e sans filtre .eq('user_id', userId)
❌ Ne jamais faire de .delete() sans clause .eq() — risque de
vider toute la table
❌ Ne jamais utiliser select('*') en production si une jointu
re complexe est nécessaire
 → préférer select('id, name, created_at') avec les colonne
s exactes
04 — Base de données 22 body_analysis ||--o{ muscle_scores : "1-N"
 exercise_catalog ||--o{ session_exercises : "0-N"
 exercise_catalog ||--o{ exercise_history : "0-N"
 user_custom_exercises ||--o{ session_exercises : "0-N"
 user_custom_exercises ||--o{ exercise_history : "0-N"
 ai_conversations ||--o{ ai_messages : "1-N"
 ai_conversations ||--o{ ai_feedbacks : "1-N"
auth_users
health_data programs profiles
user_custom_exercises
notifications ai_conversations user_settings
program_sessions
session_exercises session_history
exercise_history body_analysis ai_feedbacks
muscle_scores
exercise_catalog ai_messages
1-N 1-N 1-1
1-N
1-N 1-N 1-N
1-N
1-N 1-N
1-N 1-1 1-N
1-N
0-N
0-N
0-N
0-N
1-N
1-N
Tables détaillées
auth.users (gérée par Supabase Auth)
Table native de Supabase. Ne jamais écrire directement dans cette table.
Toutes les opérations passent par supabase.auth.* .
Colonne Type Description
id uuid Identifiant unique de l'utilisateur
email text Adresse email
04 — Base de données 3Colonne Type Description
created_at timestamptz Date de création du compte
Opérations disponibles via l'API Auth :
signUp — inscription email/password
signInWithPassword — connexion email/password
signInWithOAuth — connexion Google
signOut — déconnexion
resetPasswordForEmail — envoi du lien de reset
updateUser — mise à jour du mot de passe
profiles
Profil étendu de chaque utilisateur. Créé automatiquement à l'inscription via un
trigger
Supabase, ou manuellement via upsert si le trigger n'est pas actif.
RLS : activé — un utilisateur ne peut lire et modifier que son propre profil.
Colonne Type Nullable Description
id uuid ❌ PK — référence auth.users.id
name text ✅ Prénom de l'utilisatrice
objective text ✅
Objectif fitness — voir enum cidessous
level text ✅
Niveau d'entraînement — voir enum
ci-dessous
gender text ✅
Genre déclaré — voir enum cidessous
cycle_tracking boolean ✅ L'utilisatrice suit-elle son cycle ?
avatar_url text ✅
URL publique de l'avatar (Supabase
Storage)
created_at timestamptz ✅ Date de création (auto)
updated_at timestamptz ✅ Date de dernière modification (auto)
04 — Base de données 4Enums de profiles :
objective : 'masse' | 'perte' | 'tonification' | 'equilibre'
level : 'debutant' | 'intermediaire' | 'avance'
gender : 'femme' | 'homme' | 'autre'
Stockage de l'avatar :
Bucket Supabase Storage : avatars
Chemin : {userId}/avatar.{ext}
Formats acceptés : jpg , png , webp
Accès public (URL publique directe)
exercise_catalog
Catalogue global d'exercices partagé entre tous les utilisateurs.
Lecture seule — les utilisatrices ne peuvent pas modifier ce catalogue.
RLS : désactivé — table publique en lecture pour tous les utilisateurs authentifiés.
Colonne Type Nullable Description
id uuid ❌ PK
name text ❌
Nom de l'exercice (ex: "Squat
barre")
category text ❌ Catégorie principale — voir enum
subcategory text ✅ Sous-catégorie — voir enum
type text ✅ Type de l'exercice — voir enum
muscle_primary text ✅ Muscle principal sollicité
muscle_secondary text ✅ Muscle secondaire sollicité
is_public boolean ❌
Visible dans la bibliothèque
globale
created_at timestamptz ✅ Date d'ajout au catalogue
Enums de exercise_catalog :
04 — Base de données 5category : 'Haut du corps' | 'Bas du corps' | 'Full Body'
| 'Cardio' | 'Mobilité'
subcategory : 'Push' | 'Pull' | 'Jambes' | 'Abdos' | 'Autre'
type : 'Force' | 'Poids du corps' | 'Machine' | 'Haltè
res'
user_custom_exercises
Exercices créés manuellement par une utilisatrice. Visibles uniquement par elle.
RLS : activé — filtre sur user_id .
Colonne Type Nullable Description
id uuid ❌ PK
user_id uuid ❌ FK → auth.users.id
name text ❌ Nom de l'exercice
category text ✅
Même enum que
exercise_catalog
subcategory text ✅
Même enum que
exercise_catalog
type text ✅
Même enum que
exercise_catalog
muscle_primary text ✅ Muscle principal
muscle_secondary text ✅ Muscle secondaire
notes text ✅ Notes libres sur l'exercice
created_at timestamptz ✅ Date de création
Règle importante — double source d'exercice :
Dans session_exercises et exercise_history , un exercice peut venir du catalogue
global
ou des exercices personnalisés. Deux colonnes existent pour ça :
exercise_catalog_id — remplie si exercice du catalogue global
user_custom_exercise_id — remplie si exercice personnalisé
04 — Base de données 6L'une des deux est remplie, jamais les deux en même temps, jamais les deux
nulles.
session_exercises.exercise_catalog_id → référence exerci
se_catalog
session_exercises.user_custom_exercise_id → référence user_c
ustom_exercises
programs
Programme d'entraînement créé ou importé par une utilisatrice.
RLS : activé — filtre sur user_id .
Colonne Type Nullable Description
id uuid ❌ PK
user_id uuid ❌ FK → auth.users.id
name text ❌
Nom du programme (ex:
"Programme Jambes 3x")
description text ✅ Description libre
duration_weeks int ✅ Durée en semaines
is_active boolean ❌
Programme actuellement actif
(défaut: false)
status text ✅ Statut étendu — voir enum
created_at timestamptz ✅ Date de création
Enum de programs.status :
status : 'active' | 'paused' | 'completed'
Règle importante — programme actif :
Une utilisatrice n'a qu'un seul programme actif à la fois
is_active = true et status = 'active' doivent toujours être synchronisés
04 — Base de données 7Quand on active un programme, on désactive tous les autres de l'utilisatrice
en premier
// Pattern d'activation — toujours dans cet ordre
await supabase.from('programs').update({ is_active: false }).
eq('user_id', userId);
await supabase.from('programs').update({ is_active: true }).e
q('id', programId);
program_sessions
Séances planifiées dans un programme. Chaque séance est un entraînement à
faire.
RLS : activé — filtre sur user_id .
Colonne Type Nullable Description
id uuid ❌ PK
program_id uuid ✅ FK → programs.id
user_id uuid ❌ FK → auth.users.id
name text ❌
Nom de la séance (ex: "Séance 1 —
Jambes")
order_index int ❌
Position dans le programme (0indexed)
day_of_week int ✅
Jour de la semaine récurrent :
0=Lundi … 6=Dimanche
scheduled_date date ✅
Date planifiée spécifique (si non
récurrent)
status text ❌ État de la séance — voir enum
created_at timestamptz ✅ Date de création
Enum de program_sessions.status :
status : 'pending' | 'completed' | 'skipped'
04 — Base de données 8session_exercises
Exercices planifiés dans une séance. Définit ce que l'utilisatrice doit faire.
RLS : activé — accès via la session parente (user_id implicite).
Colonne Type Nullable Description
id uuid ❌ PK
session_id uuid ❌
FK →
program_sessions.id
exercise_catalog_id uuid ✅
FK →
exercise_catalog.id (si
catalogue)
user_custom_exercise_id uuid ✅
FK →
user_custom_exercises.id
(si perso)
set_targets jsonb ✅
Array de cibles par série —
voir structure ci-dessous
sets int ✅
Nombre de séries (legacy
— dérivé de
set_targets.length)
reps text ✅
Reps affichées (legacy —
ex: "68")
weight float ✅
Poids de référence
(legacy)
order_index int ❌
Position dans la séance (0indexed)
completed boolean ❌
Exercice complété pendant
la séance
input_type text ✅ Type d'input — voir enum
rest_between_sets int ✅
Repos entre séries en
secondes (défaut: 150)
rest_after_exercise int ✅
Repos après l'exercice en
secondes
is_substitution boolean ✅
Remplace un autre
exercice
04 — Base de données 9