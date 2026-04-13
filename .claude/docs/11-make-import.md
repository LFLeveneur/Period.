11 — Make import
Source de vérité du flow d'import Make. Ce fichier décrit l'intégralité du
système d'import de programme via Make : du déclenchement côté app jusqu'à
l'insertion
en base, en passant par le schéma du webhook, la logique de matching des
exercices,
et la gestion des erreurs. Cursor lit ce fichier avant de toucher à tout ce qui
concerne l'import de programme.
Vue d'ensemble
[Utilisatrice colle du texte ou uploade un fichier]
 │
 ▼
[App Period. — /programs/import]
 Prépare le payload → POST webhook Make
 │
 ▼
[Make — Scénario d'import]
 Reçoit le contenu
 Envoie à Claude (ou OpenAI) pour extraction structurée
 Retourne un JSON normalisé
 │
 ▼
[App Period. — Écran de vérification]
 Valide le JSON
 Affiche pour correction
 Fuzzy match exercices → exercise_catalog
 │
 ▼
[Supabase]
 INSERT programs
11 — Make import 1m');
 }
 if (!Array.isArray(session.exercises) || session.exercise
s.length === 0) {
 throw new MakeImportError(`La séance "${session.name}"
n'a pas d'exercices`);
 }
 // 5. Chaque exercice a un exercise_name et un sets valid
e
 for (const ex of session.exercises) {
 if (!ex.exercise_name) {
 throw new MakeImportError('Un exercice n\'a pas de no
m');
 }
 if (!ex.sets || typeof ex.sets !== 'number' || ex.sets
< 1) {
 ex.sets = 3; // Fallback silencieux
 }
 if (!ex.reps) {
 ex.reps = '8'; // Fallback silencieux
 }
 }
 }
 return data as MakeImportResponse;
}
class MakeImportError extends Error {
 constructor(message: string) {
 super(message);
 this.name = 'MakeImportError';
 }
}
11 — Make import 106. Fuzzy matching — résolution des exercices
Après validation, chaque exercise_name du JSON Make est matché contre
exercise_catalog .
Algorithme
// src/services/makeImportService.ts
import { distance } from 'fastest-levenshtein'; // ou lib équ
ivalente
/**
* Normalise un nom d'exercice pour la comparaison
* Insensible à la casse, aux accents, aux tirets, aux espace
s multiples
*/
function normalizeName(name: string): string {
 return name
 .toLowerCase()
 .normalize('NFD')
 .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
 .replace(/[-_]/g, ' ') // Tirets et underscores
→ espaces
 .replace(/\s+/g, ' ') // Espaces multiples → u
n seul
 .trim();
}
/**
* Score de similarité entre deux noms (0 = identiques, plus
grand = plus différent)
* Retourne un score normalisé entre 0 et 1 (1 = identiques)
*/
function similarityScore(a: string, b: string): number {
 const normA = normalizeName(a);
11 — Make import 11 const normB = normalizeName(b);
 const maxLen = Math.max(normA.length, normB.length);
 if (maxLen === 0) return 1;
 const dist = distance(normA, normB);
 return 1 - dist / maxLen;
}
/**
* Trouve le meilleur match dans le catalogue
* Seuil minimum : 0.7
* En cas d'égalité : premier par ordre alphabétique
*/
async function resolveExercise(
 exerciseName: string,
 catalog: ExerciseCatalogItem[]
): Promise<{ match: ExerciseCatalogItem | null; score: number
}> {
 let bestMatch: ExerciseCatalogItem | null = null;
 let bestScore = 0;
 for (const item of catalog) {
 const score = similarityScore(exerciseName, item.name);
 if (score > bestScore) {
 bestScore = score;
 bestMatch = item;
 }
 }
 if (bestScore >= 0.7) {
 return { match: bestMatch, score: bestScore };
 }
 return { match: null, score: bestScore };
}
11 — Make import 12Résultat du matching par exercice
interface ResolvedExercise {
 original_name: string; // Nom tel que retourné par
Make
 exercise_catalog_id: string | null; // Rempli si match tro
uvé
 catalog_name: string | null; // Nom dans le catalogue (p
our affichage)
 is_custom: boolean; // true si pas de match → s
era créé en user_custom_exercises
 similarity_score: number; // Score pour debug / affic
hage
 make_exercise: MakeExercise; // Données brutes Make
}
7. Génération des set_targets
Une fois les exercices résolus, les set_targets sont générés pour chaque exercice.
// src/services/makeImportService.ts
function buildSetTargets(
 sets: number,
 reps: string,
 weight: number | null,
 inputType: ExerciseInputType
): SetTarget[] {
 // Parse les reps : "6-8" → 6 (borne basse), "8" → 8, "10-1
2" → 10
 const repsNum = parseInt(reps.split('-')[0]) || 8;
 return Array.from({ length: sets }, () => {
 const target: SetTarget = { rir: 2 }; // RIR par défaut
11 — Make import 13 switch (inputType) {
 case 'weight_reps':
 target.reps = repsNum;
 target.weight = weight ?? undefined;
 break;
 case 'bodyweight_reps':
 target.reps = repsNum;
 // Pas de weight pour bodyweight
 break;
 case 'cardio_duration':
 target.duration = repsNum * 60; // Conversion approxi
mative si reps = minutes
 break;
 case 'cardio_distance':
 target.distance = undefined;
 target.duration = undefined;
 break;
 case 'weight_plus_load':
 target.reps = repsNum;
 target.added_load = weight ?? undefined;
 break;
 }
 return target;
 });
}
/**
* Détermine l'input_type depuis la réponse Make
* Si Make ne le précise pas, on infère depuis le poids et le
nom de l'exercice
*/
function resolveInputType(ex: MakeExercise): ExerciseInputTyp
e {
 if (ex.input_type && isValidInputType(ex.input_type)) {
 return ex.input_type as ExerciseInputType;
11 — Make import 14 }
 // Inférence basique si Make ne précise pas
 if (ex.weight === null) return 'bodyweight_reps';
 return 'weight_reps'; // Défaut
}
function isValidInputType(value: string): boolean {
 return ['weight_reps', 'bodyweight_reps', 'cardio_duratio
n',
 'cardio_distance', 'weight_plus_load'].includes(val
ue);
}
8. Insertion en base — ordre des opérations
// src/services/makeImportService.ts
async function importProgram(
 resolved: ResolvedExercise[][], // Par session
 makeData: MakeImportResponse,
 userId: string
): Promise<string> { // Retourne program.id
 // ÉTAPE 1 — Créer les exercices personnalisés non matchés
 const customExerciseMap = new Map<string, string>(); // ori
ginal_name → custom_id
 for (const session of resolved) {
 for (const ex of session) {
 if (ex.is_custom && !customExerciseMap.has(ex.original_
name)) {
 const { data, error } = await supabase
 .from('user_custom_exercises')
11 — Make import 15 .insert({
 user_id: userId,
 name: ex.original_name,
 category: null,
 type: null,
 })
 .select('id')
 .single();
 if (error) throw error;
 customExerciseMap.set(ex.original_name, data.id);
 }
 }
 }
 // ÉTAPE 2 — Créer le programme
 const { data: program, error: programError } = await supaba
se
 .from('programs')
 .insert({
 user_id: userId,
 name: makeData.name,
 description: makeData.description,
 duration_weeks: makeData.duration_weeks,
 is_active: false,
 status: 'active',
 })
 .select('id')
 .single();
 if (programError) throw programError;
 // ÉTAPE 3 — Créer les séances
 const sessionInserts = makeData.sessions.map((session) =>
({
 program_id: program.id,
11 — Make import 16 user_id: userId,
 name: session.name,
 order_index: session.order_index,
 day_of_week: session.day_of_week,
 status: 'pending' as const,
 }));
 const { data: sessions, error: sessionsError } = await supa
base
 .from('program_sessions')
 .insert(sessionInserts)
 .select('id, order_index');
 if (sessionsError) throw sessionsError;
 // ÉTAPE 4 — Créer les exercices de chaque séance
 const exerciseInserts: SessionExerciseInsert[] = [];
 for (const session of sessions) {
 const sessionResolved = resolved[session.order_index];
 const makeSession = makeData.sessions[session.order_inde
x];
 sessionResolved.forEach((ex, idx) => {
 const inputType = resolveInputType(ex.make_exercise);
 const setTargets = buildSetTargets(
 ex.make_exercise.sets,
 ex.make_exercise.reps,
 ex.make_exercise.weight,
 inputType
 );
 exerciseInserts.push({
 session_id: session.id,
 exercise_catalog_id: ex.exercise_catalog_id,
 user_custom_exercise_id: ex.is_custom
11 — Make import 17 ? customExerciseMap.get(ex.original_name) ?? null
 : null,
 set_targets: setTargets,
 sets: ex.make_exercise.sets,
 reps: ex.make_exercise.reps,
 weight: ex.make_exercise.weight,
 order_index: idx,
 completed: false,
 input_type: inputType,
 rest_between_sets: ex.make_exercise.rest_between_sets
?? 150,
 });
 });
 }
 const { error: exercisesError } = await supabase
 .from('session_exercises')
 .insert(exerciseInserts);
 if (exercisesError) throw exercisesError;
 return program.id;
}
9. Écran de vérification — données affichées
L'écran de vérification ( /programs/import step 2) affiche les données Make
avant insertion, entièrement éditables.
État local de l'écran de vérification
// État en mémoire — pas de persistance avant la validation f
inale
interface ImportVerificationState {
 programName: string;
11 — Make import 18 description: string;
 duration_weeks: number | null;
 sessions: ImportVerificationSession[];
}
interface ImportVerificationSession {
 name: string;
 order_index: number;
 day_of_week: number | null;
 exercises: ImportVerificationExercise[];
}
interface ImportVerificationExercise {
 original_name: string;
 display_name: string; // Nom affiché et modifiable
 exercise_catalog_id: string | null;
 catalog_name: string | null;
 is_custom: boolean; // Badge "Exercice personnali
sé" si true
 similarity_score: number; // Badge "Vérifie cet exercic
e" si < 0.85
 sets: number;
 reps: string;
 weight: number | null;
 input_type: ExerciseInputType;
 rest_between_sets: number;
}
Badges affichés sur les exercices
Condition Badge
is_custom = true 🔵 "Exercice personnalisé"
similarity_score < 0.85 AND similarity_score >= 0.7 🟡 "Vérifie cet exercice"
similarity_score >= 0.85 ✅ aucun badge (match fiable)
11 — Make import 19 INSERT program_sessions
 INSERT session_exercises
 INSERT user_custom_exercises (si exercice non matché)
1. Côté app — envoi vers Make
Endpoint
POST ${VITE_MAKE_WEBHOOK_URL}
Content-Type: application/json
Payload envoyé par l'app
// Type du payload
interface MakeImportPayload {
 type: 'text' | 'file';
 content: string; // Texte brut OU base64 du fichier
 filename?: string; // Nom du fichier si type = 'file'
(ex: "programme.pdf")
 user_id: string; // UUID de l'utilisatrice (pour les
logs Make)
}
Mode texte :
const payload: MakeImportPayload = {
 type: 'text',
 content: textareaValue, // Texte brut collé par l'utilisat
rice
 user_id: user.id,
};
Mode fichier :
11 — Make import 2Actions de modification disponibles
Pour chaque exercice dans l'écran de vérification :
├── Modifier le nom (re-trigger le fuzzy match à la validatio
n)
├── Modifier les séries (number input)
├── Modifier les reps (text input)
├── Modifier le poids (number input ou "—" si bodyweight)
├── Modifier l'input_type (sélecteur)
├── Modifier le repos (number input en secondes)
└── Supprimer l'exercice (icône poubelle)
Pour chaque séance :
├── Modifier le nom
├── Modifier le jour de la semaine
└── Supprimer la séance (si au moins 1 séance reste)
Pour le programme :
├── Modifier le nom
└── Modifier la description
10. Gestion des erreurs — tableaux de décision
Erreurs côté app (avant envoi à Make)
Erreur Cause Comportement
Textarea vide
L'utilisatrice tape "Analyser"
sans rien saisir
Message inline : "Colle un
programme avant de continuer."
Fichier > 5 MB Fichier trop lourd
toast "Le fichier doit faire moins de 5
MB."
Format fichier
invalide
Ni .txt ni .pdf
toast "Format non supporté. Utilise un
.txt ou .pdf."
Erreurs Make / réseau
11 — Make import 20Erreur Cause Comportement
Timeout 30s Make ne répond pas
Erreur + CTA "Réessayer" et "Créer
manuellement"
HTTP 4xx/5xx Erreur Make côté serveur Même comportement que timeout
AbortError Timeout déclenché Même comportement que timeout
JSON invalide
Make retourne du nonJSON
"Make n'a pas pu analyser ce contenu."
Erreurs de validation JSON
Erreur Message affiché
sessions vide ou
absente
"Aucune séance détectée. Essaie avec un programme plus
détaillé."
session sans exercices "La séance [nom] n'a pas d'exercices."
exercise_name
manquant
"Un exercice n'a pas de nom — Make n'a pas pu l'extraire."
Erreurs d'insertion Supabase
Erreur Comportement
INSERT programs échoue toast "Erreur lors de l'import. Réessaie." + bouton "Réessayer"
INSERT sessions échoue Rollback manuel : DELETE program si déjà créé → toast erreur
INSERT exercises échoue Rollback manuel → toast erreur
Pattern de rollback
// En cas d'erreur après INSERT programs, rollback manuel
async function rollbackImport(programId: string): Promise<voi
d> {
 try {
 await supabase.from('programs').delete().eq('id', program
Id);
 // CASCADE supprime program_sessions et session_exercises
 } catch (rollbackError) {
 console.error('[makeImportService] rollback failed', roll
11 — Make import 21backError);
 // Orphelin en base — acceptable dans le MVP
 }
}
11. Variables d'environnement
# .env.local
VITE_MAKE_WEBHOOK_URL=https://hook.eu2.make.com/{WEBHOOK_ID}
# .env.example (commité — sans valeur réelle)
VITE_MAKE_WEBHOOK_URL=
✅ VITE_MAKE_WEBHOOK_URL est la seule variable requise pour l
e flow Make
✅ Elle est lue via src/lib/env.ts (comme toutes les variable
s d'env)
✅ Si la variable est absente, src/lib/env.ts throw au démarr
age de l'app
❌ Ne jamais exposer le WEBHOOK_ID dans le code commité
❌ Ne jamais appeler Make depuis un composant React directeme
nt
 → Toujours passer par src/services/makeImportService.ts
12. Structure des fichiers
src/
├── services/
│ └── makeImportService.ts ← Toute la logique Make + fu
zzy match + insertion
├── pages/
11 — Make import 22│ └── ProgramImport.tsx ← Écran /programs/import (st
ep 1 + step 2)
├── components/
│ └── import/
│ ├── ImportForm.tsx ← Step 1 : textarea / uploa
d fichier
│ ├── ImportVerification.tsx ← Step 2 : vérification et
édition
│ ├── ImportSessionCard.tsx ← Card d'une séance dans l
a vérification
│ └── ImportExerciseRow.tsx ← Ligne d'un exercice dans
la vérification
└── lib/
 └── env.ts ← VITE_MAKE_WEBHOOK_URL lu i
ci
13. Checklist de test du flow Make
□ Texte court et structuré → JSON valide retourné
□ Texte long et détaillé → JSON valide retourné
□ Texte ambigu → JSON partiel ou erreur Make → comportement d
égradé correct
□ Fichier .txt simple → JSON valide
□ Fichier .pdf simple → JSON valide
□ Fichier > 5 MB → erreur côté app avant envoi
□ Make timeout (simuler en coupant le réseau) → timeout 30s →
erreur correcte
□ Exercice dans le catalogue → exercise_catalog_id rempli, pa
s de custom
□ Exercice hors catalogue → user_custom_exercises créé, badge
affiché
□ Exercice ambigu (score 0.75) → badge "Vérifie cet exercice"
□ Validation avec modification → données modifiées bien sauve
gardées
11 — Make import 23□ Suppression d'un exercice dans la vérification → non inséré
en base
□ Programme importé → is_active = false par défaut
□ Erreur INSERT → rollback propre → pas de programme orphelin
en base
11 — Make import 24// Conversion fichier → base64
const base64 = await new Promise<string>((resolve, reject) =>
{
 const reader = new FileReader();
 reader.onload = () => resolve((reader.result as string).spl
it(',')[1]);
 reader.onerror = reject;
 reader.readAsDataURL(file);
});
const payload: MakeImportPayload = {
 type: 'file',
 content: base64,
 filename: file.name,
 user_id: user.id,
};
Timeout et headers
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30_00
0); // 30 secondes
const response = await fetch(import.meta.env.VITE_MAKE_WEBHOO
K_URL, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload),
 signal: controller.signal,
});
clearTimeout(timeoutId);
11 — Make import 32. Côté Make — structure du scénario
Modules du scénario Make (dans l'ordre)
1. Webhook — reçoit le payload de l'app Period.
 └── Trigger : POST entrant depuis l'app
2. Router — branche selon payload.type
 ├── Branche "text" → le contenu est du texte brut
 └── Branche "file" → le contenu est du base64 à décoder
3. HTTP Module (branche "file" uniquement)
 └── Décode le base64 → extrait le texte du fichier
 (via un service de parsing PDF/TXT ou Claude directeme
nt)
4. Claude AI (ou OpenAI) — extraction structurée
 └── Prompt système : voir section 3 ci-dessous
 └── Input : texte du programme (brut ou extrait du fichie
r)
 └── Output attendu : JSON structuré (voir section 4)
5. JSON Parser
 └── Valide que la réponse est du JSON valide
 └── Extrait les champs attendus
6. Webhook Response
 └── Retourne le JSON à l'app Period.
 └── Content-Type: application/json
 └── Status: 200
Variables d'environnement Make
MAKE_WEBHOOK_ID → ID du webhook entrant (généré par Ma
ke)
11 — Make import 4ANTHROPIC_API_KEY → Clé API Claude (ou OPENAI_API_KEY)
3. Prompt d'extraction — Claude dans Make
SYSTEM:
Tu es un assistant qui extrait la structure d'un programme de
musculation
à partir d'un texte brut. Tu retournes UNIQUEMENT un objet JS
ON valide,
sans texte avant ni après, sans backticks Markdown.
Le JSON doit respecter exactement ce schéma :
{
 "name": string, // Nom du programme
 "description": string | null, // Description si présen
te
 "duration_weeks": number | null, // Durée en semaines si
mentionnée
 "sessions": [
 {
 "name": string, // Ex: "Séance A — Jambe
s"
 "order_index": number, // 0, 1, 2...
 "day_of_week": number | null, // 0=Lundi...6=Dimanche
si mentionné
 "exercises": [
 {
 "exercise_name": string, // Nom exact de l'exerci
ce
 "sets": number, // Nombre de séries
 "reps": string, // Ex: "8" ou "6-8" ou
"10-12"
 "weight": number | null, // Poids en kg si mentio
nné
11 — Make import 5 "rest_between_sets": number | null, // Repos en sec
ondes si mentionné
 "input_type": string | null // "weight_reps" | "bod
yweight_reps" | "cardio_duration" | null
 }
 ]
 }
 ]
}
Règles :
- Si une information n'est pas présente, utilise null (jamais
de champ manquant)
- Ne traduis pas les noms d'exercices — conserve-les tels que
ls
- Si le nombre de séries n'est pas mentionné, utilise 3 par d
éfaut
- Si les reps ne sont pas mentionnées, utilise "8" par défaut
- order_index commence à 0 et s'incrémente de 1 pour chaque s
éance
USER:
[Texte du programme collé ici]
4. JSON retourné par Make — schéma attendu
// Type TypeScript du JSON Make
interface MakeImportResponse {
 name: string;
 description: string | null;
 duration_weeks: number | null;
 sessions: MakeSession[];
}
11 — Make import 6interface MakeSession {
 name: string;
 order_index: number;
 day_of_week: number | null; // 0=Lundi … 6=Dimanche
 exercises: MakeExercise[];
}
interface MakeExercise {
 exercise_name: string;
 sets: number;
 reps: string; // Peut être "8" ou "6-8" ou "10-1
2"
 weight: number | null;
 rest_between_sets: number | null; // En secondes
 input_type: string | null;
}
Exemple de JSON valide retourné par Make
{
 "name": "Programme Full Body 3x",
 "description": "Programme de renforcement musculaire 3 séan
ces par semaine",
 "duration_weeks": 8,
 "sessions": [
 {
 "name": "Séance A — Full Body",
 "order_index": 0,
 "day_of_week": 0,
 "exercises": [
 {
 "exercise_name": "Squat barre",
 "sets": 4,
 "reps": "6-8",
 "weight": 60,
11 — Make import 7 "rest_between_sets": 150,
 "input_type": "weight_reps"
 },
 {
 "exercise_name": "Développé couché",
 "sets": 3,
 "reps": "8-10",
 "weight": 50,
 "rest_between_sets": 120,
 "input_type": "weight_reps"
 },
 {
 "exercise_name": "Tractions",
 "sets": 3,
 "reps": "8",
 "weight": null,
 "rest_between_sets": 120,
 "input_type": "bodyweight_reps"
 }
 ]
 },
 {
 "name": "Séance B — Full Body",
 "order_index": 1,
 "day_of_week": 2,
 "exercises": [
 {
 "exercise_name": "Soulevé de terre",
 "sets": 4,
 "reps": "5",
 "weight": 80,
 "rest_between_sets": 180,
 "input_type": "weight_reps"
 }
 ]
 }
11 — Make import 8 ]
}
5. Validation côté app
Avant d'afficher l'écran de vérification, l'app valide le JSON reçu.
// src/services/makeImportService.ts
function validateMakeResponse(json: unknown): MakeImportRespo
nse {
 // 1. Vérification type de base
 if (!json || typeof json !== 'object') {
 throw new MakeImportError('JSON invalide — réponse non pa
rseable');
 }
 const data = json as Record<string, unknown>;
 // 2. Champ name obligatoire
 if (!data.name || typeof data.name !== 'string') {
 throw new MakeImportError('Nom du programme manquant');
 }
 // 3. sessions obligatoire et non vide
 if (!Array.isArray(data.sessions) || data.sessions.length =
== 0) {
 throw new MakeImportError('Aucune séance détectée dans le
programme');
 }
 // 4. Chaque session a un name et au moins 1 exercice
 for (const session of data.sessions) {
 if (!session.name) {
 throw new MakeImportError('Une séance n\'a pas de no
11 — Make import 9