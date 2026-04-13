06 — Features
Source de vérité fonctionnelle. Ce fichier décrit l'intégralité des features MVP
de
Period. : ce qu'elles font, leurs règles métier, leurs contraintes, et ce qu'elles ne
font
pas. Si une feature n'est pas listée ici, elle n'existe pas dans le MVP. Si une
règle
métier n'est pas documentée ici, elle n'est pas implémentée.
Index des features
# Feature Écrans concernés
F-01 Authentification Landing, Login, Signup, Reset password
F-02 Onboarding Onboarding (steps 14) + Révélation
F-03 Calcul et prédiction du cycle
Accueil, Calendrier, Séance à venir,
Séance active
F-04 Accueil Accueil
F-05
Import de programme via
Make
Import programme
F-06
Création manuelle de
programme
Création programme
F-07 Gestion des programmes Liste programmes, Détail programme
F-08 Bibliothèque d'exercices Bibliothèque
F-10 Séance à venir Séance à venir
F-11 Séance active Séance active
F-12 Récap de fin de séance Récap
F-13 Historique des séances Historique (liste + détail)
F-14 Calendrier Calendrier
F-15 Profil utilisateur Profil
06 — Features 1Permet à une utilisatrice d'importer un programme d'entraînement en collant du
texte
ou en uploadant un fichier. Make transforme ce contenu en JSON structuré, que
l'app
vérifie et propose à la validation.
Flow complet
1. L'utilisatrice accède à "Importer un programme" depuis la
liste des programmes
2. Elle choisit le mode d'import :
 ├── Texte libre : elle colle le programme dans un textarea
 └── Fichier : elle uploade un .txt, .pdf, ou .docx (ma
x 5 MB)
3. L'app envoie le contenu au webhook Make
 → POST https://hook.eu2.make.com/{WEBHOOK_ID}
 → Body : { type: 'text' | 'file', content: string | base64
}
4. Make traite le contenu et retourne un JSON structuré :
 {
 name: string,
 description?: string,
 duration_weeks?: number,
 sessions: [
 {
 name: string,
 order_index: number,
 day_of_week?: number, // jour choisi pour la séance
(1 = lundi ... 7 = dimanche)
 exercises: [
 {
 exercise_name: string,
 sets: number,
06 — Features 10 reps: string,
 weight?: number,
 rest_between_sets?: number,
 input_type?: ExerciseInputType
 }
 ]
 }
 ]
 }
5. L'app affiche l'écran de vérification :
 ├── Nom du programme (modifiable)
 ├── Liste des séances (modifiables)
 ├── Pour chaque exercice : nom, séries, reps, poids (modif
iables)
 └── CTA "Valider et importer"
6. À la validation :
 ├── Résolution des exercices : matching nom → exercise_cat
alog (fuzzy search)
 │ ├── Match trouvé → exercise_catalog_id rempli
 │ └── Pas de match → exercice créé dans user_custom_exer
cises
 ├── Insertion dans programs
 ├── Insertion dans program_sessions
 ├── Insertion dans session_exercises (avec set_targets gén
érés)
 └── Redirect vers le détail du programme
Génération des set_targets à l'import
// Conversion du JSON Make → set_targets
function buildSetTargets(sets: number, reps: string, weight?:
number): SetTarget[] {
 const repsNum = parseInt(reps.split('-')[0]) || 8; // Prend
06 — Features 11la borne basse si fourchette
 return Array.from({ length: sets }, () => ({
 reps: repsNum,
 weight: weight || undefined,
 rir: 2, // RIR par défaut
 }));
}
Règles métier
✅ Timeout Make : si Make ne répond pas en 30 secondes, affic
her un message d'erreur
 avec un bouton "Réessayer".
✅ Si Make retourne un JSON invalide ou vide, afficher un mes
sage d'erreur
 et laisser l'utilisatrice en mode correction manuelle.
✅ Le fuzzy matching nom → exercise_catalog est insensible à
la casse,
 aux accents et aux variations d'espacement.
 Seuil de similarité minimum : 0.7 (algo Levenshtein ou sim
ilaire).
✅ Si un exercice n'est pas matché, il est créé dans user_cus
tom_exercises
 avec les infos disponibles (name, sets, reps). Un badge "E
xercice personnalisé"
 s'affiche sur l'écran de vérification.
✅ L'écran de vérification est entièrement éditable avant val
idation.
 L'utilisatrice peut modifier chaque champ, supprimer des e
xercices,
 ou changer l'input_type.
06 — Features 12✅ Le programme importé est créé avec is_active = false par d
éfaut.
 L'utilisatrice l'active manuellement depuis la liste des p
rogrammes.
❌ Pas d'import via URL ou lien externe — uniquement texte ou
fichier.
❌ Pas de détection automatique de la langue du programme.
❌ Formats fichier acceptés : .txt, .pdf uniquement (pas .doc
x dans le MVP).
Variables d'environnement requises
VITE_MAKE_WEBHOOK_URL=https://hook.eu2.make.com/{WEBHOOK_ID}
F-06 — Création manuelle de programme
Ce que fait cette feature
Permet de créer un programme d'entraînement from scratch, sans passer par
Make.
Flow de création
1. L'utilisatrice accède à "Créer un programme" depuis la lis
te des programmes
2. Step 1 — Informations générales
 ├── Nom du programme (text input — obligatoire)
 ├── Description (textarea — optionnel)
 └── Durée en semaines (number input — optionnel)
3. Step 2 — Ajout des séances
 ├── Bouton "Ajouter une séance"
06 — Features 13 ├── Pour chaque séance :
 │ ├── Nom (ex: "Séance 1 — Jambes")
 │ ├── Jour de la semaine (sélection obligatoire si l'uti
lisatrice veut planifier la séance)
 │ │ → stocké dans program_sessions.day_of_week
 │ └── Liste d'exercices (voir step 3)
 └── Réorganisation par drag & drop (order_index)
Note : dans le MVP, la "sélection des jours d'entraînement" s
e fait ici, au niveau de chaque séance (création manuelle) ou
via `day_of_week` à l'import (Make).
4. Step 3 — Ajout d'exercices à une séance
 ├── Recherche dans la bibliothèque (exercise_catalog + use
r_custom_exercises)
 ├── Pour chaque exercice ajouté :
 │ ├── Nombre de séries (défaut: 3)
 │ ├── Reps visées (défaut: 8)
 │ ├── Poids de départ (optionnel)
 │ ├── input_type (défaut: weight_reps, modifiable)
 │ └── Temps de repos entre séries (défaut: 150s) -> facu
ltatif
 └── Génération automatique des set_targets
5. Validation → INSERT programs + program_sessions + session_
exercises
 → Redirect vers le détail du programme
Règles métier
✅ Un programme doit avoir au moins 1 séance avec au moins 1
exercice pour être sauvegardé.
✅ Les set_targets sont générés automatiquement à partir des
inputs
06 — Features 14 (même logique que buildSetTargets dans F-05).
✅ Le programme est créé avec is_active = false par défaut.
✅ Les modifications non sauvegardées déclenchent une confirm
ation avant de quitter.
❌ Pas de duplication de programme dans le MVP.
❌ Pas d'ajout de semaines de périodisation ou de progression
s automatiques.
F-07 — Gestion des programmes
Ce que fait cette feature
Permet de consulter, activer, modifier, mettre en pause, et supprimer les
programmes.
Liste des programmes
Affiche tous les programmes de l'utilisatrice :
├── Programme actif (mis en avant, badge "Actif")
├── Programmes en pause (badge "En pause")
├── Programmes complétés (badge "Terminé")
└── CTA "Importer" et "Créer"
Détail d'un programme
├── Nom, description, durée
├── Statut + boutons d'action selon le statut
├── Liste des séances avec leurs exercices
└── Historique des séances complétées dans ce programme
06 — Features 15Actions disponibles
Action Condition Effet
Activer Programme non actif
is_active = true + désactivation des
autres
Mettre en pause Programme actif status = 'paused', is_active = false
Reprendre Programme en pause status = 'active', is_active = true
Marquer comme
terminé
Programme actif ou en
pause
status = 'completed', is_active =
false
Modifier Tout programme Édition inline des champs
Supprimer Tout programme Confirmation → DELETE cascade
Règles métier
✅ Une seule utilisatrice n'a qu'un programme actif (is_activ
e = true) à la fois.
 L'activation d'un programme désactive tous les autres en p
remier.
✅ La suppression d'un programme actif ne supprime pas l'hist
orique des séances
 (session_history est conservé — la FK session_id devient n
ullable).
✅ Modifier un programme ne crée pas de nouvelle version — mo
difications directes en base.
❌ Pas de partage de programme avec d'autres utilisatrices.
❌ Pas de templates de programme pré-conçus par Period. dans
le MVP.
F-08 — Bibliothèque d'exercices
Ce que fait cette feature
06 — Features 16Permet de consulter le catalogue global d'exercices et les exercices
personnalisés,
et d'en créer de nouveaux.
Contenu de la bibliothèque
Onglet 1 — Catalogue (exercise_catalog, is_public = true)
 ├── Recherche par nom
 ├── Filtres : catégorie, sous-catégorie, type, muscle
 └── Tap sur un exercice → fiche détail
Onglet 2 — Mes exercices (user_custom_exercises)
 ├── Liste des exercices créés par l'utilisatrice
 ├── CTA "Créer un exercice"
 └── Tap sur un exercice → fiche détail + options Modifier /
Supprimer
Création d'un exercice personnalisé
Formulaire :
├── Nom (obligatoire)
├── Catégorie (même enum que exercise_catalog — obligatoire)
├── Sous-catégorie (optionnel)
├── Type (optionnel)
├── Muscle principal (optionnel)
├── Muscle secondaire (optionnel)
└── Notes (textarea — optionnel)
→ INSERT dans user_custom_exercises
Règles métier
✅ La bibliothèque est accessible depuis la création/modifica
tion de programme
 et séance (mode "picker"), et depuis le menu principal (mo
de "consultation").
06 — Features 17✅ En mode picker, un tap sur un exercice l'ajoute directemen
t à la séance en cours
 de création/modification.
✅ Les exercices personnalisés sont visibles uniquement par l
eur créatrice (RLS).
✅ Un exercice personnalisé utilisé dans une séance ne peut p
as être supprimé.
 Le bouton Supprimer est désactivé avec un tooltip explicat
if.
❌ Pas de vidéos ou d'illustrations d'exercices dans le MVP.
❌ Pas de notation ou de favoris sur les exercices.
F-10 — Séance à venir
Ce que fait cette feature
Affiche le contenu de la prochaine séance planifiée avant de la démarrer. Permet
de
visualiser les exercices, les cibles, et les recommandations contextuelles.
Contenu de l'écran
├── Nom de la séance
├── Bandeau de phase du cycle (phase prévue pour le jour de l
a séance)
│ └── Texte = CYCLE_ADVICE[phase].upcoming
├── Liste des exercices prévus :
│ ├── Nom de l'exercice
│ ├── Séries × Reps × Poids (issu de set_targets)
│ ├── Temps de repos entre séries (si saisie)
│ └── Comparaison (si historique disponible) :
06 — Features 18│ ├── Dernière fois : "60kg × 8 reps (J14 — Ovulation)"
│ └── Dernière fois en **même phase (cycle -1)** :
│ "57.5kg × 8 reps (J14 — Ovulation, cycle précéden
t)"
└── CTA "Commencer la séance"
Règles métier
✅ La comparaison "dernière fois" requête exercise_history po
ur trouver
 la séance complétée la plus récente avec le même exercise_
catalog_id
 ou user_custom_exercise_id.
✅ La comparaison "même phase (cycle -1)" affiche la dernière
séance complétée
 du même exercice dans la **même phase de cycle**, mais sur
le cycle précédent.
 (objectif : comparaison phase vs phase).
✅ Si c'est la première fois que cet exercice est fait, pas d
e comparaison affichée.
✅ Les deux comparaisons affichent la phase du cycle et le cy
cle_day au moment
 de la séance de référence (ex : "J14 — Ovulation").
✅ Le bandeau de phase est calculé en fonction de la date pré
vue de la séance
 (day_of_week + prochaine occurrence), pas de la date d'auj
ourd'hui.
❌ Pas de modification des exercices depuis l'écran "à venir"
06 — Features 19F-01 — Authentification
Ce que fait cette feature
Permet à une utilisatrice de créer un compte, se connecter, réinitialiser son mot de
passe,
et se déconnecter. L'accès à toutes les autres features est conditionné à
l'authentification.
Modes d'authentification
Email + mot de passe — inscription et connexion classiques
Google OAuth — connexion en un clic via supabase.auth.signInWithOAuth
Règles métier
✅ À l'inscription email, un profil vide est créé dans `profi
les` via trigger Supabase
 ou via upsert manuel si le trigger n'est pas actif.
✅ À la connexion Google, le nom issu de `user.user_metadata.
full_name` est pré-rempli
 dans `profiles.name` si le champ est vide.
✅ Si l'utilisatrice n'a pas de données d'onboarding (cycle_t
racking = null dans profiles),
 elle est redirigée vers l'onboarding après connexion.
✅ Si l'utilisatrice a déjà complété l'onboarding, elle est r
edirigée vers l'accueil.
✅ La session Supabase est persistée dans le localStorage via
le client Supabase standard.
 Pas de gestion manuelle de token.
✅ Le reset de mot de passe envoie un lien par email via supa
base.auth.resetPasswordForEmail.
06 — Features 2— modifications
 dans le détail du programme.
F-11 — Séance active
Ce que fait cette feature
Gère la séance en cours d'exécution. Permet de saisir les performances en temps
réel,
gérer les repos, et naviguer entre les exercices.
Structure de l'écran
Header :
├── Nom de la séance
├── Chronomètre de durée totale (en cours depuis le début)
└── Bouton "Terminer"
Bandeau de phase :
└── CYCLE_ADVICE[phase].active (texte contextuel pendant la s
éance)
Exercice courant :
├── Nom de l'exercice
├── Séries (navigation entre séries : précédente / courante /
suivante)
└── Pour chaque série :
 ├── Cible affichée en grisé (issue de set_targets)
 ├── Références de comparaison (lecture seule) :
 │ ├── Dernière saisie (même exercice) : poids/reps/RIR
de la dernière séance
 │ └── Dernière saisie en **même phase (cycle -1)** : po
ids/reps/RIR de la
 │ dernière séance où l'utilisatrice était dans la m
ême phase, sur le cycle précédent
06 — Features 20 ├── Champs de saisie selon input_type (voir SET_INPUT_CON
FIG)
 │ ├── weight_reps → Poids (kg) + Reps + RIR
 │ ├── bodyweight_reps → Reps + RIR
 │ ├── cardio_duration → Durée MM:SS
 │ ├── cardio_distance → Distance (km) + Durée MM:SS
 │ └── weight_plus_load → Reps + Charge ajoutée + RIR
 └── Bouton "Valider la série"
Après validation d'une série :
├── Chronomètre de repos (durée = rest_between_sets, défaut 1
50s)
├── Bouton "Passer le repos" (skip possible à tout moment)
└── Pré-remplissage automatique de la série suivante
 avec les valeurs de la série précédente
Navigation entre exercices :
├── Liste des exercices en bas (scroll horizontal)
├── Exercice complété → badge check vert
└── Swipe ou tap pour naviguer
Pré-remplissage intelligent des séries
Priorité de pré-remplissage pour la série N (N > 1) :
1. Valeurs saisies pour la série N-1 dans cette séance (mémoi
re de la séance)
2. Si N = 1 : valeurs de set_targets[0] (cibles planifiées)
Le pré-remplissage apparaît en grisé dans les inputs.
L'utilisatrice peut modifier ou confirmer tel quel.
Gestion de l'état en mémoire
// État en mémoire (useState) — jamais persisté directement
type ActiveSessionState = {
06 — Features 21 sessionId: string;
 startedAt: Date;
 exercises: {
 [exerciseId: string]: {
 sets: SetState[]; // Une SetState par série
 completed: boolean;
 };
 };
};
Sauvegarde en fin de séance
À l'appui sur "Terminer" :
1. Affichage de l'écran de ressenti (WorkoutFeeling selector)
2. À la sélection du ressenti :
 ├── Calcul de duration_minutes = (now - startedAt) / 60
 ├── Calcul de energy_score via FEELING_TO_SCORE[feeling]
 ├── Calcul de performance_score (voir F-12)
 ├── Calcul de total_volume = Σ(weight × reps) sur tous les
sets complétés
 ├── INSERT session_history
 ├── INSERT exercise_history (une ligne par exercice)
 │ └── set_details = conversion SetState[] → SetDetails[]
 ├── UPDATE program_sessions.status = 'completed' pour la s
ession courante
 └── Redirect vers le récap (F-12)
Règles métier
✅ La séance peut être abandonnée à tout moment via un bouton
dédié.
 Une modale de confirmation demande : "Abandonner la séance
?"
 Si confirmé : pas de sauvegarde dans session_history. La s
éance reste 'pending'.
06 — Features 22✅ Si l'app est fermée pendant une séance (crash / retour nav
igateur),
 l'état de la séance est perdu. Pas de persistance de la sé
ance en cours dans le MVP.
✅ Le RIR est optionnel — si non saisi, set_details.actual.ri
r = undefined.
✅ Une série peut être validée avec des champs vides (partial
set).
 Les champs non remplis sont undefined dans actual — pas de
blocage.
✅ L'utilisatrice peut naviguer librement entre les exercices
— il n'y a pas
 d'ordre obligatoire. Elle peut faire l'exercice 3 avant
l'exercice 1.
✅ Les exercices non touchés (aucune série saisie) ne génèren
t pas de ligne
 dans exercise_history.
✅ Les données de comparaison sont purement informatives : el
les n'influencent
 pas la cible (set_targets) et ne modifient pas le pré-remp
lissage (qui reste
 basé sur la mémoire de séance, puis set_targets).
❌ Pas de vidéo guidée ou de timer d'exercice — uniquement ti
mer de repos.
❌ Pas de substitution d'exercice depuis la séance active dan
s le MVP.
F-12 — Récap de fin de séance
06 — Features 23Ce que fait cette feature
Affiche un résumé de la séance complétée avec les performances, les victoires,
et la comparaison énergie × performance.
Contenu de l'écran
1. En-tête
 ├── Nom de la séance
 ├── Durée totale (ex: "52 min")
 ├── Phase du cycle (badge coloré)
 └── Ressenti sélectionné (badge FEELING_LABELS[feeling])
3. Message énergie × performance
 └── RECAP_MESSAGES[`${feeling}_${performance}`]
4. Victoires (si au moins une)
 └── Liste des Victory détectées :
 ├── new_record → "Nouveau record sur Squat
barre : 65kg"
 ├── better_than_previous_phase → "Mieux qu'en phase fo
lliculaire : +5kg"
 └── double_record → "Double record : 65kg ET m
eilleure phase !"
5. Détail par exercice
 └── Pour chaque exercice complété :
 ├── Nom de l'exercice
 ├── Séries réalisées (poids × reps réels)
 ├── Comparaison vs séance précédente (up/down/stable)
 ├── Si possible : comparaison vs **séance précédente d
ans la même phase (cycle -1)**
 │ (objectif : comparer la progression d'une phase à
l'autre)
 └── RIR moyen si disponible
06 — Features 246. CTA
 └── "Retour à l'accueil"
Calcul du performance_score
// Ratio entre volume réel et volume cible
function calculatePerformanceScore(
 exercises: ExerciseHistory[],
 sessionExercises: SessionExercise[]
): number {
 let totalTargetVolume = 0;
 let totalActualVolume = 0;
 for (const ex of exercises) {
 const targets = sessionExercises.find(/* match by id
*/)?.set_targets ?? [];
 for (const target of targets) {
 totalTargetVolume += (target.weight ?? 0) * (target.rep
s ?? 0);
 }
 for (const detail of ex.set_details) {
 totalActualVolume += (detail.actual.weight ?? 0) * (det
ail.actual.reps ?? 0);
 }
 }
 return Math.min(100, Math.round((totalActualVolume / totalT
argetVolume) * 100));
}
Attribution du PerformanceLevel (interne — non affiché à
l'utilisatrice)
06 — Features 25performance_score >= 105 → 'beyond'
performance_score >= 95 → 'progression'
performance_score >= 85 → 'solid'
performance_score >= 70 → 'maintained'
performance_score < 70 → 'decline'
Détection des victoires
Pour chaque exercice de la séance :
new_record :
→ max(weight × reps) de cette séance > max historique tous te
mps pour cet exercice
better_than_previous_phase :
→ avg(weight) de cette séance > avg(weight) de la dernière sé
ance dans la même phase
double_record :
→ les deux conditions ci-dessus sont vraies simultanément
 (type affiché : 'double_record' uniquement — pas new_record
et better_than en parallèle)
Règles métier
✅ Si aucune victoire : la section "Victoires" n'apparaît pa
s.
✅ Si performance_score ne peut pas être calculé (pas de volu
me — exercices cardio uniquement),
 le PerformanceLevel affiché est 'solid' par défaut.
✅ Le récap est accessible depuis l'historique (F-13) après c
oup — lecture seule.
06 — Features 26❌ Pas de partage du récap.
❌ Pas de modification du ressenti après validation.
F-13 — Historique des séances
Ce que fait cette feature
Affiche la liste de toutes les séances complétées et le détail de chacune.
Liste des séances
├── Tri par date décroissante (plus récente en premier)
├── Filtre optionnel par programme
└── Pour chaque séance dans la liste :
 ├── Nom de la séance
 ├── Date et heure
 ├── Durée
 ├── Badge phase du cycle
 ├── Badge ressenti (FEELING_LABELS)
Détail d'une séance (lecture seule)
├── Mêmes informations que le récap (F-12) — lecture seule
├── Détail complet par exercice (séries, poids, reps, RIR)
└── Comparaison avec la séance précédente du même exercice
 et avec la même phase du cycle précédent
Règles métier
✅ L'historique est en lecture seule — pas de modification de
séances passées.
✅ La comparaison "même phase précédent cycle" est calculée e
06 — Features 27n requêtant
 exercise_history WHERE exercise_id = X AND cycle_phase = Y
 ORDER BY completed_at DESC LIMIT 1.
✅ Si une séance est orpheline (programme supprimé), elle res
te dans l'historique
 avec le nom de la séance tel qu'il était au moment de la c
omplétion.
❌ Pas d'export de l'historique.
❌ Pas de pagination — chargement complet des 30 dernières sé
ances.
F-14 — Calendrier
Ce que fait cette feature
Affiche une vue mensuelle avec les phases du cycle colorées et les séances
prévues/complétées.
Contenu de l'écran
├── Sélecteur de mois (mois précédent / mois courant / mois s
uivant)
├── Grille calendrier 7 colonnes (Lun → Dim)
└── Pour chaque jour :
 ├── Fond coloré selon la phase du cycle (PHASE_DISPLAY_CO
NFIG[phase].colorLight)
 ├── Numéro du jour
 ├── Point vert si séance complétée ce jour
 ├── Point gris si séance prévue (non encore faite)
 └── Tap sur un jour → bottom sheet avec :
 ├── Nom de la phase et description courte
 └── Séance du jour (si applicable) + lien vers le dét
ail
06 — Features 28Règles métier
✅ Les couleurs des jours sont calculées via cyclePredictionS
ervice pour chaque
 jour du mois affiché.
✅ Les jours futurs affichent leur phase prédite (couleur plu
s transparente).
 Les jours passés affichent leur phase réelle (couleur plei
ne).
✅ Le mois courant est le mois par défaut au chargement.
✅ Le tap sur un jour avec séance complétée redirige vers l'h
istorique (F-13)
 filtré sur ce jour.
✅ Si cycle_tracking = false, les jours sont affichés sans co
uleur de phase.
 Un message "Active le suivi du cycle pour voir les phases"
s'affiche.
❌ Pas de vue semaine dans le MVP — uniquement vue mois.
❌ Pas d'ajout de séance depuis le calendrier.
F-15 — Profil utilisateur
Ce que fait cette feature
Permet à l'utilisatrice de consulter et modifier ses informations personnelles,
ses données de cycle, et ses préférences.
Contenu de l'écran
06 — Features 29 L'utilisatrice saisit son nouveau mot de passe sur la page
/reset-password.
❌ Pas de connexion via Apple, Facebook, ou autre OAuth — uni
quement Google.
❌ Pas de vérification d'email obligatoire pour la démo MVP.
❌ Pas de rate limiting côté frontend — Supabase gère nativem
ent.
États d'erreur gérés
Erreur Message affiché
Email déjà utilisé "Un compte existe déjà avec cet email."
Mot de passe incorrect "Email ou mot de passe incorrect."
Email invalide "L'adresse email n'est pas valide."
Mot de passe trop court "Le mot de passe doit contenir au moins 6 caractères."
Erreur réseau "Une erreur est survenue. Réessaie dans quelques instants."
F-02 — Onboarding
Ce que fait cette feature
Guide la nouvelle utilisatrice à travers 4 étapes pour configurer son profil et son
cycle.
Se termine par un écran de révélation qui affiche son calendrier avec les phases
colorées.
Étapes de l'onboarding
Step 1 — Informations de base
 ├── Prénom (text input — obligatoire)
Step 2 — Suivi du cycle
 ├── Question : "Est-ce que tu suis ton cycle menstruel ?"
 ├── Oui → aller au step 3
06 — Features 31. Profil
 └── Prénom (modifiable)
2. Informations personnelles
 ├── Prénom (modifiable)
 ├── Email (affiché — non modifiable ici)
 
3. Paramètres du cycle
 ├── Cycle_tracking toggle (activer/désactiver le suivi)
 ├── Durée du cycle (modifiable — si cycle_tracking = true)
 ├── Durée des règles (modifiable — si cycle_tracking = tru
e)
 └── Bouton "Déclarer le début de mes règles" (si cycle_tra
cking = true)
4. Compte
 ├── Bouton "Changer le mot de passe" → email de reset
 └── Bouton "Supprimer mon compte" → confirmation → RPC del
ete_user()
6. Déconnexion
 └── Bouton "Se déconnecter" → supabase.auth.signOut()
Règles métier
✅ Les modifications sont sauvegardées immédiatement (pas de
bouton "Enregistrer" global)
 — sauf pour les champs texte qui sauvegardent au blur ou à
la validation.
✅ Le changement de photo uploade dans avatars/{userId}/avata
r.{ext}
 avec upsert: true (remplace l'ancien).
06 — Features 30✅ Désactiver cycle_tracking ne supprime pas health_data exis
tant.
 Si réactivé, les données précédentes sont réutilisées.
✅ Déclarer un début de règles depuis le profil insère dans h
ealth_data
 exactement comme depuis l'accueil (F-04).
✅ La suppression de compte appelle la RPC delete_user() qui
supprime
 données → profil → compte dans l'ordre correct.
✅ Avant la suppression, une modale affiche :
 "Cette action est irréversible. Toutes tes données seront
supprimées."
 Deux CTA : "Annuler" et "Supprimer définitivement".
❌ Pas d'export des données personnelles (RGPD — hors MVP).
❌ Pas de changement d'email dans le MVP.
Matrice features × tables Supabase
Feature Tables lues Tables écrites
F-01 Auth profiles profiles (via trigger/upsert)
F-02 Onboarding profiles
profiles , health_data ,
user_settings
F-03 Cycle health_data health_data
F-04 Accueil
health_data , programs ,
program_sessions
health_data
F-05 Import Make exercise_catalog
programs , program_sessions ,
session_exercises ,
user_custom_exercises
F-06 Création
programme
exercise_catalog ,
user_custom_exercises
programs , program_sessions ,
session_exercises
06 — Features 31Feature Tables lues Tables écrites
F-07 Gestion
programmes
programs , program_sessions ,
session_exercises ,
session_history
programs , program_sessions
F-08 Bibliothèque
exercise_catalog ,
user_custom_exercises
user_custom_exercises
F-10 Séance à
venir
program_sessions ,
session_exercises ,
exercise_history , health_data
—
F-11 Séance
active
program_sessions ,
session_exercises
session_history ,
exercise_history ,
program_sessions
F-12 Récap
session_history ,
exercise_history —
F-13 Historique
session_history ,
exercise_history , health_data
—
F-14 Calendrier
health_data , session_history ,
program_sessions —
F-15 Profil
profiles , health_data ,
user_settings
profiles , health_data ,
user_settings
Features hors MVP
Ces features ne sont pas implémentées dans le MVP. Les tables existent en base
mais aucun code frontend ne les utilise.
Feature Tables concernées Version cible
Coach IA — conversation postséance
ai_conversations , ai_messages ,
ai_feedbacks
V2
Coach IA — coaching du matin ai_conversations , ai_messages V2
Notifications push notifications V2
Analyse musculaire postséance
body_analysis , muscle_scores V2
Export données RGPD — V2
Partage de programme — V2
06 — Features 32F
eatureTablesconcernéesVersioncible
Connexionwearables—V3
06 — Features 33 └── Non → aller au step 4 (mode light sans données de cycl
e)
Step 3 — Données du cycle (si cycle_tracking = true)
 ├── Date des dernières règles (date picker — obligatoire)
 ├── Durée du cycle en jours (slider ou input — défaut: 28,
range: 21–35)
 └── Durée des règles en jours (slider ou input — défaut: 5,
range: 3–8)
Révélation — écran post-onboarding
 ├── Affiche le calendrier du mois courant avec les phases c
olorées
 ├── Bandeau animé avec la phase actuelle
 └── CTA "Commencer" → redirige vers l'accueil
Règles métier
✅ Les données de l'onboarding sont sauvegardées dans `profil
es` à chaque step
 (pas seulement à la fin) — protection contre les abandons.
✅ Si cycle_tracking = true : insertion de DEUX lignes dans h
ealth_data avec cycle_day = 1
 et cycle_phase = 'menstrual' — une pour chaque date saisie
en step 3.
 L'écart entre les deux dates devient le avgCycleLength de
référence.
 Minimum requis pour prédire : 2 dates saisies.
✅ Si cycle_tracking = false : profiles.cycle_tracking = fals
e.
 L'app fonctionne sans données de cycle — les recommandatio
ns sont génériques.
06 — Features 4✅ L'onboarding ne peut pas être sauté — toute navigation ver
s une page protégée
 redirige vers /onboarding si cycle_tracking = null dans pr
ofiles.
✅ Une fois complété (cycle_tracking !== null), l'onboarding
n'est plus accessible.
 Tentative de navigation vers /onboarding → redirect vers /
home.
❌ Pas de connexion avec une app de tracking externe (Flo, Cl
ue, Apple Santé).
❌ Pas de photo de profil pendant l'onboarding — uniquement d
ans les settings.
Données sauvegardées à l'issue de l'onboarding
Destination Colonnes Valeurs
profiles name , cycle_tracking
Issues du
formulaire
health_data
date , cycle_day , cycle_phase , cycle_length ,
period_length
Issues du step 3
F-03 — Calcul et prédiction du cycle
Ce que fait cette feature
Calcule la phase du cycle pour n'importe quelle date passée, présente ou future.
C'est le moteur central de Period. — toutes les recommandations en dépendent.
Service concerné
src/services/cyclePredictionService.ts
Algorithme de prédiction
06 — Features 51. Requête health_data WHERE user_id = X AND cycle_day = 1
 → récupère toutes les dates de début de règles
2. Si >= 2 cycles historiques :
 → calcul de la longueur réelle par écarts entre dates
 → filtrage des écarts aberrants (< 15j ou > 45j ignorés)
 → avgCycleLength = moyenne des écarts valides
3. Si 1 seule date historique (< 2 entrées cycle_day = 1) :
 → pas de prédiction possible
 → retourne null
 → l'UI affiche l'état neutre + message :
 "Ajoute une deuxième date de règles pour voir ta prédict
ion"
4. Pour chaque date demandée :
 daysDiff = (targetDate - lastPeriodStart) en jours
 cycleDay = (daysDiff % avgCycleLength) + 1
5. Attribution de phase (base de données — 4 valeurs) :
 cycleDay <= periodLength → menstrual
 cycleDay < ovulationDay - 1 → follicular
 cycleDay <= ovulationDay + 1 → ovulation
 sinon → luteal
6. Attribution de sous-phase UI (5 valeurs, via getCyclePhase
Display) :
 luteal ET cycleDay <= cycleLength - 6 → luteal_early
 luteal ET cycleDay > cycleLength - 6 → luteal_late
7. ovulationDay estimé = avgCycleLength - 14
 (règle de la phase lutéale constante à 14 jours)
Ce que le cycle influence dans l'app
06 — Features 6Écran Influence du cycle
Accueil Phase affichée dans la roue, bandeau du jour, recommandation
Séance à venir Bandeau contextuel de la phase prévue pour le jour de la séance
Séance active Bandeau contextuel + recommandation d'intensité
Calendrier Couleur de chaque jour selon sa phase
Récap Phase enregistrée dans session_history
Historique (détail) Phase affichée au moment de la séance
Règles métier
✅ Si cycle_tracking = false, les fonctions de phase retourne
nt null.
 Les bandeaux affichent un message générique sans référence
au cycle.
✅ Le calcul de phase est effectué côté frontend (pas de RPC
Supabase).
 cyclePredictionService.ts est la seule source de calcul.
✅ Les résultats de calcul sont mis en cache dans le hook use
CycleDay
 pour éviter les recalculs inutiles.
✅ Quand une utilisatrice déclare un nouveau début de règles
(via l'accueil ou le profil),
 une nouvelle ligne est insérée dans health_data avec cycle
_day = 1.
 Le service recalcule automatiquement les moyennes.
❌ Pas de synchronisation avec des wearables ou des apps tier
ces.
❌ Pas d'import depuis Flo, Clue, Apple Santé ou toute app de
santé externe.
❌ Toutes les données de cycle sont saisies manuellement par
06 — Features 7l'utilisatrice.
❌ Pas de température basale ou de LH dans le MVP (colonnes e
xistantes, non utilisées).
❌ Pas de détection automatique des irrégularités — l'app cal
cule sans alerter.
F-04 — Accueil
Ce que fait cette feature
Page principale de l'app. Affiche l'état du cycle du jour, la recommandation
d'entraînement
contextuelle, et les prochaines séances.
Contenu de l'écran
1. Roue du cycle
 ├── Représentation circulaire des 5 phases (colorées selon
PHASE_DISPLAY_CONFIG)
 ├── Indicateur du jour actuel dans la roue
 ├── Affichage du cycleDay et du nom de la phase au centre
 └── Tap sur la roue → pop-up avec description biologique d
e la phase
2. Bandeau de recommandation du jour
 ├── Couleur de fond = couleur de la phase actuelle
 ├── Texte = PHASE_DISPLAY_CONFIG[phase].banner
 └── Icône de la phase
3. Séances à venir (liste)
 ├── Prochaines séances du programme actif (max 3 affichée
s)
 ├── Chaque séance affiche : nom, jour prévu, phase prévue
ce jour-là
 └── Tap → Séance à venir (F-10)
06 — Features 84. Déclaration de début de règles
 ├── Bouton discret "Mes règles ont commencé aujourd'hui"
 └── Tap → insert health_data (cycle_day = 1) + recalcul de
cycle
Règles métier
✅ Si aucun programme actif : la section "Séances à venir" af
fiche un état vide
 avec un CTA "Créer un programme".
✅ Si cycle_tracking = false : la roue affiche un état neutre
(anneau gris uni)
 et le bandeau affiche un message générique d'encouragemen
t.
✅ La roue est calculée à partir du cycleDay actuel et du cyc
leLength moyen.
 Si cycleDay = null (pas de données), la roue affiche l'éta
t neutre.
✅ Le tap sur la roue ouvre une bottom sheet avec le popupTex
t de la phase.
❌ Pas de statistiques de progression sur l'accueil (pas de g
raphiques) — uniquement
 dans l'historique.
❌ Pas de notifications push dans le MVP — pas de badge ni
d'alerte.
F-05 — Import de programme via Make
Ce que fait cette feature
06 — Features 9