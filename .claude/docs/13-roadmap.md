13 — Roadmap
Source de vérité du plan de développement. Ce fichier décrit les phases de
développement dans l'ordre, les dépendances entre tâches, et ce qui bloque
quoi.
Cursor lit ce fichier pour comprendre dans quel ordre implémenter les features.
Rien ne doit être codé hors de l'ordre défini ici — chaque phase suppose que
la précédente est complète et testée.
Principe de construction
Fondations → Données → Auth → Cycle → Programmes → Séances →
Récap → Historique → Calendrier → Profil → Polish
On ne touche pas à une feature tant que ses dépendances ne sont pas
en place et fonctionnelles. Un écran vide avec de vraies données
vaut mieux qu'un écran rempli avec des données mockées.
Phase 0 — Setup projet
Objectif : Environnement de développement opérationnel, conventions en place.
Tâches
□ Initialiser le projet Vite + React 19 + TypeScript
□ Configurer Tailwind CSS v4
□ Configurer React Router v7
□ Connecter Supabase (variables d'env + src/lib/supabase.ts +
src/lib/env.ts)
□ Créer la structure de dossiers src/ selon rules/tech.md
□ Mettre en place les fichiers de types (src/types/auth.ts, c
ycle.ts, workout.ts)
□ Configurer ESLint + Prettier selon rules/code-style.md
13 — Roadmap 1✅ Bandeau affiche le bon texte selon la phase
✅ 3 prochaines séances affichées avec leur phase prévue
✅ Sans programme actif : état vide + CTA "Créer un programm
e"
✅ Sans cycle : roue neutre + bandeau générique
✅ Déclaration de règles → recalcul immédiat de la roue
Phase 6 — Programmes et bibliothèque
Objectif : L'utilisatrice peut créer, gérer et activer des programmes.
Tâches
□ Bibliothèque d'exercices (/exercises) :
 □ Liste du catalogue (filtres : catégorie, type, muscle)
 □ Recherche par nom
 □ Onglet "Mes exercices" (user_custom_exercises)
 □ Création / modification / suppression d'exercice personn
alisé
 □ Bottom sheet fiche détail
□ Création de programme (/programs/new) :
 □ Step 1 — Infos générales
 □ Step 2 — Séances + drag & drop
 □ Drawer ajout d'exercices (picker bibliothèque)
 □ Configuration par exercice (séries, reps, poids, input_t
ype, repos)
 □ Génération set_targets
□ Liste des programmes (/programs) :
 □ Programme actif mis en avant
 □ Autres programmes
 □ Actions : activer, mettre en pause, supprimer
□ Détail d'un programme (/programs/:id) :
13 — Roadmap 10 □ Liste des séances + exercices
 □ Actions selon statut
 □ Section historique récent (séances vides pour l'instant
— Phase 9)
□ Modification d'un programme (/programs/:id/edit)
□ Services :
 □ src/services/programService.ts
 □ getPrograms(userId)
 □ getProgram(userId, programId)
 □ createProgram(userId, data)
 □ updateProgram(userId, programId, data)
 □ deleteProgram(userId, programId)
 □ activateProgram(userId, programId)
 □ pauseProgram(userId, programId)
 □ src/services/exerciseService.ts
 □ getCatalog(filters?)
 □ searchCatalog(query)
 □ getCustomExercises(userId)
 □ createCustomExercise(userId, data)
 □ updateCustomExercise(userId, id, data)
 □ deleteCustomExercise(userId, id)
Dépendances
Phase 1 terminée (tables programs, program_sessions, session_
exercises,
 exercise_catalog, user_custom_exercises).
Phase 5 (accueil) peut être finalisée avec les vraies données
en parallèle.
Définition de "done"
13 — Roadmap 11✅ Création programme → programme visible dans /programs
✅ Activation programme → is_active = true + accueil mis à jo
ur
✅ Pause / reprise / suppression fonctionnels
✅ Bibliothèque : recherche + filtres fonctionnels sur exerci
se_catalog
✅ Exercice personnalisé : créer / modifier / supprimer
✅ Exercice utilisé dans une séance → suppression bloquée
✅ set_targets générés correctement pour chaque exercice ajou
té
Phase 7 — Import Make
Objectif : Le flow d'import Make est fonctionnel de bout en bout.
Tâches
□ Scénario Make :
 □ Webhook entrant configuré
 □ Module Claude AI avec le prompt d'extraction (voir 11-ma
ke-import.md)
 □ Webhook response avec le JSON structuré
 □ Test Make avec différents types de texte
□ Écran /programs/import :
 □ Step 1 : textarea mode texte
 □ Step 1 : upload fichier mode (.txt, .pdf)
 □ Envoi vers Make avec timeout 30s
 □ Spinner "Make analyse ton programme..."
 □ Gestion erreurs Make (timeout, JSON invalide, sessions v
ides)
□ Step 2 — Écran de vérification :
 □ Affichage du JSON Make parsé et validé
13 — Roadmap 12 □ Édition inline de tous les champs
 □ Badges is_custom / "Vérifie cet exercice"
 □ Suppression d'exercices / séances
□ Validation et insertion :
 □ Fuzzy matching (fastest-levenshtein ou équivalent)
 □ INSERT user_custom_exercises pour les non-matchés
 □ INSERT programs + sessions + exercises dans l'ordre
 □ Rollback en cas d'erreur
□ src/services/makeImportService.ts (voir 11-make-import.md p
our le code complet)
Dépendances
Phase 6 terminée (programs, sessions, exercises en base + ser
vices).
Le scénario Make doit être configuré avant de tester le flow
complet.
Définition de "done"
✅ Texte collé → Make → JSON → vérification → import → /progr
ams/:id
✅ Fichier .txt → même flow
✅ Timeout 30s → erreur + CTA "Réessayer" et "Créer manuellem
ent"
✅ JSON invalide → erreur explicite
✅ Exercice non matché → badge + user_custom_exercises créé
✅ Exercice matché → exercise_catalog_id rempli, pas de custo
m
✅ Édition dans la vérification → données modifiées bien sauv
egardées
13 — Roadmap 13✅ Programme importé → is_active = false par défaut
✅ Rollback propre si INSERT échoue
Phase 8 — Séance (preview + active + récap)
Objectif : L'utilisatrice peut démarrer, compléter et voir le récap d'une séance.
C'est la phase la plus complexe et la plus critique du MVP.
Tâches — Séance à venir (/session/:id/preview)
□ Bandeau de phase (phase prévue pour le jour de la séance)
□ Liste des exercices avec résumé cibles
□ Comparaison "Dernière fois" (requête exercise_history)
□ CTA "Commencer la séance"
□ Guard requireActiveSession (stub — redirige vers /preview s
i accès direct à /active)
Tâches — Séance active (/session/:id/active)
□ Store/context ActiveSession (state en mémoire) :
 □ src/contexts/ActiveSessionContext.tsx
 □ startSession(sessionId)
 □ completeSet(exerciseId, setIndex, setData)
 □ getCurrentExercise()
 □ getExerciseState(exerciseId)
 □ endSession(feeling) → déclenche la sauvegarde
□ Chronomètre total (démarré à l'arrivée sur la page)
□ Bandeau de phase compact
□ Zone exercice courant :
 □ Indicateur de série N/Total
 □ Cible grisée (depuis set_targets)
13 — Roadmap 14 □ Champs de saisie dynamiques selon input_type (SET_INPUT_
CONFIG)
 □ Bouton "Valider la série"
 □ Pré-remplissage depuis la série précédente
□ Timer de repos :
 □ Compte à rebours circulaire
 □ Durée = rest_between_sets (défaut 150s)
 □ Boutons +30s / -30s
 □ Bouton "Passer"
 □ Vibration haptic à 00:00
□ Navigation exercices (liste horizontale bas de page)
□ Modale ressenti (WorkoutFeeling selector)
□ Modale abandon
□ Guard : accès direct /active sans state → redirect /preview
Tâches — Sauvegarde en fin de séance
□ src/services/sessionHistoryService.ts :
 □ saveSession(userId, sessionId, state, feeling) :
 □ Calcul duration_minutes
 □ Calcul energy_score (FEELING_TO_SCORE)
 □ Calcul performance_score (volume réel / volume cible)
 □ Calcul total_volume
 □ INSERT session_history
 □ INSERT exercise_history[] avec set_details
 □ UPDATE program_sessions.status = 'completed'
 □ getSessionHistory(userId, sessionHistoryId)
 □ getExerciseHistory(userId, exerciseId, limit?)
Tâches — Récap (/session/:id/recap)
13 — Roadmap 15□ Détection des victoires :
 □ new_record : max(weight × reps) > max historique
 □ better_than_previous_phase : avg(weight) > avg même phas
e précédent
 □ double_record : les deux simultanément
□ Attribution PerformanceLevel (seuils en Phase 12)
□ Message RECAP_MESSAGES[feeling_performance]
□ Affichage :
 □ Bloc résumé (durée, phase, ressenti)
 □ Badge PerformanceLevel
 □ Message énergie × performance
 □ Liste victoires
 □ Détail par exercice (tableau séries réelles + badge prog
ression)
 □ CTA "Retour à l'accueil"
□ Accès depuis /history/:id (lecture seule — même composant,
pas de CTA)
Dépendances
Phase 6 terminée (programmes + exercices en base).
Phase 4 terminée (cyclePredictionService — pour le bandeau de
phase).
Phase 5 terminée (accueil — pour revenir après le récap).
Définition de "done"
✅ Flow complet : preview → active → ressenti → récap → accue
il
✅ Chaque input_type affiche les bons champs (weight_reps, bo
13 — Roadmap 16dyweight, cardio...)
✅ Pré-remplissage des séries depuis la série précédente
✅ Timer de repos démarre après validation d'une série
✅ Navigation libre entre exercices sans perte de données
✅ Abandon → aucune sauvegarde → program_sessions.status rest
e 'pending'
✅ session_history INSERT avec tous les scores calculés
✅ exercise_history INSERT avec set_details complet
✅ Victoires détectées et affichées correctement
✅ Message énergie × performance correct selon la combinaison
✅ Accès direct /active → redirect /preview
Phase 9 — Historique
Objectif : L'utilisatrice peut consulter toutes ses séances passées avec
comparaisons.
Tâches
□ Écran /history :
 □ Liste session_history ORDER BY completed_at DESC LIMIT 3
0
 □ Pour chaque séance : nom, date, durée, phase, ressenti,
performance
 □ Filtre par programme (dropdown)
 □ État vide
□ Écran /history/:id :
 □ Même contenu que le récap (composant partagé — mode lect
ure seule)
 □ Section "Comparaison même phase cycle précédent" :
 □ Requête exercise_history WHERE exercise_id = X AND cy
cle_phase = Y
 ORDER BY completed_at DESC LIMIT 1
 □ Pas de CTA "Retour à l'accueil" — bouton retour standard
13 — Roadmap 17□ Section "Dernières séances" dans /programs/:id (maintenant
fonctionnelle)
□ src/services/sessionHistoryService.ts (compléter) :
 □ getHistoryList(userId, programId?) → SessionHistory[]
 □ getHistoryDetail(userId, sessionHistoryId) → SessionHist
ory + ExerciseHistory[]
 □ getPreviousPhaseHistory(userId, exerciseId, phase) → Exe
rciseHistory | null
Dépendances
Phase 8 terminée (session_history et exercise_history en base
avec vraies données).
Définition de "done"
✅ Liste triée par date décroissante avec toutes les métadonn
ées
✅ Filtre par programme fonctionnel
✅ Détail : même données que le récap en lecture seule
✅ Comparaison même phase visible si données disponibles
✅ État vide correct si aucune séance
✅ Données legacy CSV (reps_per_set) affichées correctement s
i présentes
Phase 10 — Calendrier
Objectif : Vue mensuelle avec phases colorées et séances.
Tâches
13 — Roadmap 18□ Écran /calendar :
 □ Grille 7 colonnes × 5-6 lignes
 □ Couleur de fond par jour (predictPhasesForMonth)
 □ Points séances (verte = complétée, grise = prévue)
 □ Sélecteur mois (< >)
 □ Jours futurs à 50% opacité
 □ Bottom sheet DayDetail au tap
□ Bottom sheet DayDetail :
 □ Phase du jour + description courte
 □ Séance du jour si applicable + lien
 □ État sans cycle (grille sans couleurs + banner)
□ Légende des couleurs en bas
□ Optimisation : predictPhasesForMonth en une seule passe
 (pas de prédiction individuelle par jour)
Dépendances
Phase 4 terminée (cyclePredictionService avec predictPhasesFo
rMonth).
Phase 8 terminée (session_history pour les points verts).
Phase 6 terminée (program_sessions pour les points gris).
Définition de "done"
✅ Couleurs correctes pour chaque jour du mois courant
✅ Navigation mois précédent / suivant sans lag
✅ Points verts sur les jours avec session_history
✅ Points gris sur les jours avec program_sessions pending
✅ Bottom sheet avec phase + séance du jour
13 — Roadmap 19□ Vérifier que l'app démarre sans erreur sur localhost
□ Committer le setup initial
Dépendances
Aucune — c'est le point de départ.
Définition de "done"
✅ npm run dev démarre sans erreur
✅ La page / affiche "Period." sans crash
✅ La connexion Supabase est établie (pas d'erreur dans la co
nsole)
✅ Les types TypeScript compilent sans erreur (tsc --noEmit)
Phase 1 — Base de données et schéma Supabase
Objectif : Toutes les tables existent en base avec les bons types, RLS, et relations.
Tâches
□ Créer toutes les tables dans Supabase selon 04-database.md
:
 □ profiles
 □ exercise_catalog (+ seed avec exercices de base)
 □ user_custom_exercises
 □ programs
 □ program_sessions
 □ session_exercises
 □ session_history
 □ exercise_history
 □ health_data
 □ body_analysis + muscle_scores (tables créées, non utilis
ées MVP)
13 — Roadmap 2✅ Sans cycle : grille sans couleurs + banner CTA
✅ Mois futurs : phases prédites à 50% opacité
Phase 11 — Profil
Objectif : L'utilisatrice peut modifier son profil, son cycle, et gérer son compte.
Tâches
□ Écran /profile :
 □ Section avatar (upload + preview)
 □ Section infos personnelles (prénom, niveau, objectif — s
ave au blur)
 □ Section cycle (toggle + champs + bouton déclaration règl
es)
 □ Section jours d'entraînement préférés
 □ Section compte (reset password, suppression)
 □ Bouton déconnexion
□ Upload avatar :
 □ Validation taille (< 5 MB) et format (jpg, png, webp)
 □ Upload Supabase Storage avatars/{userId}/avatar.{ext}
 □ UPDATE profiles.avatar_url
 □ Preview immédiate
□ Modale suppression de compte :
 □ Confirmation textuelle
 □ RPC delete_user()
 □ signOut() → redirect /login
□ Sauvegarde immédiate (pas de bouton global "Enregistrer")
Dépendances
13 — Roadmap 20Phase 2 terminée (auth + profil).
Phase 3 terminée (user_settings pour les jours d'entraînemen
t).
Phase 4 terminée (cyclePredictionService pour la déclaration
des règles).
Définition de "done"
✅ Modification prénom → sauvegardé au blur → visible dans le
header accueil
✅ Modification niveau/objectif → sauvegardé immédiatement
✅ Toggle cycle → activation/désactivation avec comportement
correct
✅ Déclaration règles depuis profil → même effet que depuis
l'accueil
✅ Upload avatar → visible dans le profil + header
✅ Reset password → email reçu
✅ Suppression compte → tout supprimé → redirect /login
✅ Déconnexion → redirect /login
Phase 12 — Polish et démo
Objectif : L'app est prête pour la démonstration. Bugs corrigés, états vides
soignés,
transitions fluides, données de démo en place.
Tâches — Corrections et finitions
□ Vérifier tous les états UI (loading / vide / erreur / succè
s) sur chaque écran
□ Vérifier tous les cas limites critiques (EC-01 à EC-40 — vo
ir 10-edge-cases.md)
□ Vérifier les transitions entre écrans (voir 08-navigation.m
d)
13 — Roadmap 21□ Tester le flow complet de la démo (voir 14-demo-script.md)
□ Corriger les bugs identifiés pendant les tests
Tâches — Données de démo
□ Créer un compte de démo avec des données réalistes :
 □ Profil : Léa, intermédiaire, tonification, cycle 28j
 □ Cycle : dernières règles il y a 8 jours (phase follicula
ire pour la démo)
 □ Programme actif : "Programme Jambes 3x/semaine" (3 séanc
es)
 □ Historique : 4-6 séances passées avec données réalistes
 □ Dont une séance en phase menstruelle (poids plus bas)
 □ Dont une séance en phase folliculaire (progression vi
sible)
 □ Victoires visibles dans le récap de la dernière séance
□ Vérifier que les données de démo sont cohérentes avec le cy
cle
 (phases passées correspondent aux dates)
Tâches — Performance et stabilité
□ Vérifier qu'aucun appel Supabase n'est fait en double (Reac
t StrictMode)
□ Vérifier que les hooks ne causent pas de re-renders excessi
fs
□ Vérifier que le timer de séance ne fuite pas de mémoire (cl
eanup useEffect)
□ Tester sur mobile (viewport 375px — iPhone SE)
□ Tester sur desktop (viewport 1440px)
Tâches — Accessibilité minimale
13 — Roadmap 22□ Tous les boutons ont un label accessible (aria-label si icô
ne seule)
□ Les inputs ont des labels associés (htmlFor)
□ Le contraste des textes est suffisant sur les fonds colorés
de phase
Définition de "done"
✅ Flow démo complet sans bug bloquant (landing → récap)
✅ Données de démo en place et cohérentes
✅ Tous les états vides sont soignés (pas d'écran blanc)
✅ La connexion entre phase du cycle et recommandation est cl
aire et visible
✅ Import Make fonctionne en live pendant la démo
✅ App lisible sur mobile (375px)
Résumé des phases
Phase Contenu Durée est. Dépend de
0 Setup projet 0.5j —
1 Base de données Supabase 0.5j 0
2 Auth (login, signup, reset) 1j 1
3 Onboarding + révélation 1j 2
4 Calcul du cycle 1j 1, 3
5 Accueil 1.5j 3, 4
6 Programmes + bibliothèque 2j 1, 5
7 Import Make 1.5j 6
8 Séance (preview + active + récap) 3j 4, 5, 6
9 Historique 1j 8
10 Calendrier 1j 4, 8, 6
11 Profil 1j 2, 3, 4
13 — Roadmap 23Phase Contenu Durée est. Dépend de
12 Polish + démo 1.5j Tout
Total 16j
Ordre de priorité si contrainte de temps
Si le temps manque avant la démo, voici l'ordre de sacrifice :
Sacrifice niveau 1 (cosmétique — ne compromet pas la démo) :
 → Transitions animées entre écrans
 → Accessibilité minimale
 → Drag & drop pour réordonner exercices/séances
Sacrifice niveau 2 (feature secondaire) :
 → Filtre par programme dans l'historique
 → Modification de programme (/programs/:id/edit)
Sacrifice niveau 3 (feature importante mais substituable) :
 → Import Make (remplacer par création manuelle pour la dém
o)
 → Calendrier (remplacer par mention orale)
Ne jamais sacrifier :
 → Auth + onboarding
 → Calcul du cycle + roue + bandeau
 → Création de programme (au moins manuelle)
 → Séance complète (preview + active + récap)
 → Données de démo cohérentes
13 — Roadmap 24 □ ai_conversations + ai_messages + ai_feedbacks (idem)
 □ notifications (idem)
 □ user_settings
□ Activer RLS sur toutes les tables concernées (voir tableau
04-database.md)
□ Créer les politiques RLS : user_id = auth.uid() pour chaque
table
□ Créer la RPC delete_user() côté Supabase
□ Créer le trigger de création de profil à l'inscription (ou
documenter l'upsert manuel)
□ Créer le bucket Storage avatars (accès public)
□ Seeder exercise_catalog avec au moins 30 exercices (squat,
hip thrust, RDL, etc.)
Dépendances
Phase 0 terminée.
Définition de "done"
✅ Toutes les tables existent dans Supabase
✅ RLS activé et testé : un user ne peut pas lire les données
d'un autre
✅ Le bucket avatars est créé et public
✅ exercise_catalog contient au moins 30 exercices avec is_pu
blic = true
✅ La RPC delete_user() est créée et testée
Phase 2 — Auth
Objectif : L'utilisatrice peut s'inscrire, se connecter, et se déconnecter
Tâches
13 — Roadmap 3□ Layouts :
 □ PublicLayout (pas de bottom nav, redirect si connectée)
 □ AppLayout (bottom nav, guards)
 □ ImmersiveLayout (sans bottom nav, guards)
 □ OnboardingLayout (sans bottom nav, guard spécifique)
□ Guards :
 □ requireAuth
 □ requireOnboarding
 □ requireNoAuth
 □ requireActiveSession (stub — sera utilisé en Phase 7)
□ Écrans :
 □ Landing (/) — statique
 □ Signup (/signup) — email + Google
 □ Login (/login) — email + Google
 □ Reset password (/reset-password) — sans token + avec tok
en
□ Services :
 □ src/services/authService.ts
 □ signUp(email, password)
 □ signIn(email, password)
 □ signInWithGoogle()
 □ signOut()
 □ resetPassword(email)
 □ updatePassword(newPassword)
 □ deleteAccount()
 □ getCurrentUser()
□ Context :
 □ src/contexts/AuthContext.tsx
 □ user, profile, loading
 □ Hook useAuthContext()
13 — Roadmap 4□ Router :
 □ src/router/index.tsx avec toutes les routes définies (pa
ges vides pour l'instant)
Dépendances
Phase 1 terminée (profiles table + trigger).
Définition de "done"
✅ Inscription email → profil créé → redirect /onboarding
✅ Connexion Google → profil créé/mis à jour → redirect /onbo
arding ou /home
✅ Connexion email → redirect /onboarding ou /home selon onbo
arding
✅ Déconnexion → redirect /login
✅ Reset password → email envoyé → lien fonctionnel → nouveau
mot de passe
✅ Routes protégées redirigent vers /login si non connectée
✅ Routes publiques redirigent vers /home si connectée + onbo
arding complété
Phase 3 — Onboarding et révélation
Objectif : La nouvelle utilisatrice peut configurer son profil et son cycle.
Tâches
□ Écran /onboarding :
 □ Step 1 — Prénom + niveau + objectif
 □ Step 2 — Cycle tracking oui/non
 □ Step 3 — Date règles + durée cycle + durée règles (si cy
cle = true)
 □ Step 4 — Jours d'entraînement préférés
13 — Roadmap 5 □ Barre de progression
 □ Navigation retour entre steps
 □ Sauvegarde progressive en base à chaque step
□ Écran /onboarding/reveal :
 □ Calendrier du mois avec phases colorées (version simplif
iée — peut être statique)
 □ Bandeau de la phase actuelle
 □ Animation d'entrée
□ Services :
 □ src/services/profileService.ts
 □ getProfile(userId)
 □ updateProfile(userId, data)
 □ src/services/userSettingsService.ts
 □ getSetting(userId, key)
 □ setSetting(userId, key, value)
□ Guard requireOnboarding activé dans AppLayout
Dépendances
Phase 2 terminée (auth + profil).
Phase 4 peut commencer en parallèle (cyclePredictionService i
ndépendant de l'UI).
Définition de "done"
✅ Flow complet : inscription → onboarding 4 steps → révélati
on → accueil
✅ Avec cycle : 2 lignes health_data INSERTées (cycle_day = 1
pour chaque date)
✅ Écart calculé affiché en temps réel + avertissement si abe
rrant
✅ Sans cycle : profiles.cycle_tracking = false, onboarding c
13 — Roadmap 6omplété
✅ Les jours préférés sont sauvegardés dans user_settings
✅ Retour à /onboarding après complétion → redirect /home
✅ Abandon et retour → reprise au step 1 avec données pré-rem
plies
Phase 4 — Calcul du cycle
Objectif : Le moteur de calcul de phase est opérationnel et testé.
Tâches
□ src/services/cyclePredictionService.ts :
 □ fetchCycleStats(userId) → avgCycleLength, avgPeriodLengt
h, avgOvulationDay
 □ predictPhaseForDate(userId, date) → CycleDay
 □ predictPhasesForMonth(userId, year, month) → CycleDay[]
 □ Filtrage des écarts aberrants (< 15j ou > 45j)
 □ Fallback sur valeurs déclarées si 1 seul cycle
□ src/types/cycle.ts (si pas déjà fait en Phase 0) :
 □ CyclePhase, CyclePhaseDisplay, CycleDay
 □ PhaseConfig, PHASE_DISPLAY_CONFIG
 □ getCyclePhaseDisplay()
 □ daysUntilNextPeriod()
□ src/hooks/useCycleDay.ts :
 □ Retourne CycleDay pour aujourd'hui
 □ Mis en cache (pas de recalcul à chaque render)
□ Tests manuels :
 □ Cycle 28j J1 → menstrual
 □ Cycle 28j J10 → follicular
 □ Cycle 28j J14 → ovulation
 □ Cycle 28j J16 → luteal_early
13 — Roadmap 7 □ Cycle 28j J24 → luteal_late
 □ Cycle 32j — vérifier les transitions
 □ cycle_tracking = false → null retourné proprement
Dépendances
Phase 1 terminée (health_data table).
Phase 3 terminée (pour avoir des données de cycle en base).
Peut être développée en parallèle de la Phase 3 (service indé
pendant de l'UI).
Définition de "done"
✅ predictPhaseForDate retourne la bonne phase pour des dates
connues
✅ getCyclePhaseDisplay retourne la bonne sous-phase UI
✅ Avec < 2 entrées cycle_day = 1 : retourne null sans crash
✅ Avec 2+ entrées : calcule la moyenne avec filtrage des abe
rrations
✅ useCycleDay retourne null si < 2 dates, CycleDay sinon
✅ L'UI affiche l'état neutre + message d'attente quand null
Phase 5 — Accueil
Objectif : L'écran d'accueil est fonctionnel avec la roue du cycle et les séances à
venir.
Tâches
□ Composants :
 □ CycleWheel — roue du cycle avec arcs colorés
 □ PhaseBanner — bandeau de recommandation du jour
 □ PhaseInfoSheet — bottom sheet avec description biologiqu
e
13 — Roadmap 8 □ UpcomingSessionCard — card de séance à venir
 □ EmptySessionsState — état vide si pas de programme actif
□ Écran /home :
 □ Header avec prénom
 □ CycleWheel (avec tap → PhaseInfoSheet)
 □ PhaseBanner (avec tap → PhaseInfoSheet)
 □ Liste des 3 prochaines séances (depuis le programme acti
f)
 □ Bouton "Mes règles ont commencé aujourd'hui"
 □ Gestion de l'état sans cycle (roue neutre, bandeau génér
ique)
□ Services :
 □ src/services/homeService.ts
 □ getUpcomingSessions(userId) → 3 prochaines ProgramSes
sion avec phase prévue
□ Déclaration des règles :
 □ Modale de confirmation
 □ INSERT health_data
 □ Recalcul useCycleDay
Dépendances
Phase 4 terminée (cyclePredictionService).
Phase 3 terminée (onboarding — pour avoir un profil complet).
Phase 6 (programmes) peut démarrer en parallèle — l'accueil a
ffichera l'état vide.
Définition de "done"
✅ Roue du cycle affiche la bonne phase et le bon jour (J[N])
✅ Arcs colorés proportionnels aux durées des phases
✅ Tap roue → bottom sheet avec texte biologique correct
13 — Roadmap 9