07 — Screens
Source de vérité des écrans. Ce fichier décrit chaque écran du MVP : son
contenu
exact, ses actions disponibles, et ses états UI (loading, vide, erreur, succès).
Il est lu par Cursor avant d'implémenter n'importe quel composant de page.
Les règles métier sont dans 06-features.md . Les textes exacts sont dans 03-
copy.md .
Les composants réutilisables sont dans 02-components.md .
Index des écrans
Route Écran Feature(s)
/ Landing F-01
/login Connexion F-01
/signup Inscription F-01
/reset-password Réinitialisation mot de passe F-01
/onboarding Onboarding (steps 14) F-02
/onboarding/reveal Révélation post-onboarding F-02, F-03
/home Accueil F-03, F-04
/programs Liste des programmes F-07
/programs/new Création de programme F-06
/programs/import Import de programme F-05
/programs/:id Détail d'un programme F-07
/programs/:id/edit Modification d'un programme F-07
/exercises Bibliothèque d'exercices F-08
/session/:id/preview Séance à venir F-10
/session/:id/active Séance active F-11
/session/:id/recap Récap de fin de séance F-12
/history Historique (liste) F-13
07 — Screens 1├── Section "Prochaines séances" (si programme actif)
│ ├── Titre : "Cette semaine"
│ ├── Cards des 3 prochaines séances :
│ │ ├── Nom de la séance
│ │ ├── Jour prévu (ex: "Jeudi")
│ │ └── Badge phase prévue ce jour-là
│ └── Tap sur une card → /session/:id/preview
├── État vide "Prochaines séances" (si aucun programme actif)
│ └── "Pas encore de programme. [Créer un programme →]"
└── Bouton discret "Mes règles ont commencé aujourd'hui"
 (visible uniquement si cycle_tracking = true)
 → Confirmation → insert health_data + recalcul + toast "C
ycle mis à jour 🖤"
Bottom sheet PhaseInfo
├── Emoji + nom de la phase
├── Texte biologique (PHASE_DISPLAY_CONFIG[phase].popupText)
├── Recommandation d'entraînement courte
└── Bouton "Fermer"
Actions
Action Effet
Tap roue Ouvre bottom sheet PhaseInfo
Tap bandeau Ouvre bottom sheet PhaseInfo
Tap card séance Redirect /session/:id/preview
Tap "Créer un programme" Redirect /programs/new
Tap "Mes règles ont commencé" Confirmation → insert health_data
États UI
07 — Screens 10loading → skeleton : cercle gris + bandeau gris + 3 cards gr
ises
vide → roue neutre (anneau gris) + bandeau générique + CT
A programme
erreur → toast "Impossible de charger tes données"
 + affichage de l'état vide par sécurité
S-08 — Liste des programmes ( /programs )
Contenu
├── Header : "Mes programmes"
├── FAB ou boutons en header :
│ ├── "Importer" → /programs/import
│ └── "Créer" → /programs/new
├── Programme actif (si existant) — mis en avant
│ ├── Badge "Actif" (coloré)
│ ├── Nom du programme
│ ├── Durée (ex: "8 semaines")
│ ├── Nombre de séances par semaine
│ └── Actions : "Mettre en pause" | "Voir le détail"
├── Autres programmes (liste)
│ └── Pour chaque programme :
│ ├── Nom
│ ├── Badge statut (En pause / Terminé)
│ ├── Date de création
│ └── Actions : "Activer" | "Voir" | "Supprimer"
États UI
07 — Screens 11loading → skeleton : 1 card grande + 2 cards petites
vide → "Tu n'as pas encore de programme."
 + 2 CTA : "Créer un programme" et "Importer un pro
gramme"
erreur → toast + état vide affiché
S-09 — Création de programme ( /programs/new )
Contenu
Multi-step inline (pas de routes séparées) :
Step 1  Informations générales
├── Champ "Nom du programme" (obligatoire)
├── Textarea "Description" (optionnel)
├── Input "Durée en semaines" (number, optionnel)
└── CTA "Ajouter des séances →"
Step 2  Construction des séances
├── Liste des séances créées (réordonnables par drag & drop)
├── Pour chaque séance :
│ ├── Nom (modifiable inline)
│ ├── Jour de la semaine (optionnel — sélecteur)
│ ├── Nombre d'exercices (résumé)
│ ├── Bouton "Modifier les exercices"
│ └── Bouton "Supprimer la séance"
├── Bouton "Ajouter une séance"
└── CTA "Enregistrer le programme"
Step 3  Ajout d'exercices (drawer/modale par séance)
├── Recherche dans la bibliothèque (exercise_catalog + user_c
ustom_exercises)
07 — Screens 12├── Liste des exercices filtrés
├── Pour chaque exercice dans la séance :
│ ├── Nom
│ ├── Séries (number input, défaut: 3)
│ ├── Reps (text input, ex: "8" ou "6-8")
│ ├── Poids (number input, optionnel)
│ ├── Type d'input (sélecteur — défaut: weight_reps)
│ └── Repos entre séries (seconds, défaut: 150)
├── Réorganisation par drag & drop
└── CTA "Valider"
Actions
Action Effet
Submit final INSERT programs + sessions + exercises → redirect /programs/:id
Tap "Annuler" Confirmation si données saisies → redirect /programs
États UI
loading (sauvegarde) → bouton disabled + spinner
erreur → toast "Erreur lors de la sauvegarde"
 + données conservées
S-10 — Import de programme ( /programs/import )
Contenu
Step 1  Choix du mode
├── Titre : "Importer un programme"
├── Tab "Texte libre"
│ └── Textarea "Colle ton programme ici..."
└── Tab "Fichier"
 └── Zone de drop / bouton upload (.txt, .pdf — max 5 MB)
07 — Screens 13CTA : "Analyser le programme" → envoi à Make
Step 2  Vérification (après réponse Make)
├── Titre : "Vérifie ton programme"
├── Champ Nom du programme (pré-rempli, modifiable)
├── Liste des séances (modifiables)
│ └── Pour chaque séance :
│ ├── Nom (modifiable)
│ └── Liste d'exercices :
│ ├── Nom (modifiable — avec badge "Personnalisé" s
i non matché)
│ ├── Séries × Reps × Poids (modifiables)
│ └── Type d'input (modifiable)
└── CTA "Valider et importer"
États UI
loading (analyse) → spinner plein écran + "Make analyse ton p
rogramme..."
 timeout 30s → état erreur Make
erreur Make → "Make n'a pas pu analyser ce contenu."
 + CTA "Réessayer" et "Créer manuellement"
loading (import) → bouton disabled + spinner
erreur (import) → toast "Erreur lors de l'import"
succès → redirect `/programs/:id` + toast "Program
me importé 🖤"
S-11 — Détail d'un programme ( /programs/:id )
Contenu
07 — Screens 14├── Header : nom du programme + badge statut
├── Actions selon le statut :
│ ├── Actif → "Mettre en pause" | "Modifier" | "Termine
r"
│ ├── En pause → "Reprendre" | "Modifier" | "Supprimer"
│ └── Terminé → "Supprimer"
├── Méta : durée, date de création, description
├── Liste des séances du programme
│ └── Pour chaque séance :
│ ├── Nom + jour de la semaine
│ ├── Nombre d'exercices
│ ├── Statut (pending / completed / skipped)
│ └── Tap → drawer avec la liste des exercices de la sé
ance
└── Section "Dernières séances" (historique filtré sur ce pro
gramme)
 └── 5 dernières session_history → lien vers /history/:id
Actions
Action Effet
Tap "Modifier" Redirect /programs/:id/edit
Tap "Activer" UPDATE programs → toast "Programme activé"
Tap "Mettre en
pause"
UPDATE programs → toast "Programme mis en pause"
Tap "Terminer" Confirmation → UPDATE programs
Tap "Supprimer" Confirmation → DELETE programs → redirect /programs
Tap séance
Drawer avec exercices + CTA "Commencer" →
/session/:sessionId/preview
États UI
loading → skeleton header + skeleton liste séances
erreur → "Impossible de charger ce programme." + bouton ret
07 — Screens 15our
S-12 — Bibliothèque d'exercices ( /exercises )
Contenu
├── Header : "Bibliothèque"
├── Barre de recherche (filtre par nom)
├── Filtres chips :
│ ├── Catégorie : Haut du corps / Bas du corps / Full Body
/ Cardio / Mobilité
│ ├── Type : Force / Poids du corps / Machine / Haltères
│ └── Muscle : liste des muscles primaires disponibles
├── Tabs : "Catalogue" | "Mes exercices"
Onglet Catalogue :
└── Liste paginée des exercices (exercise_catalog, is_public
= true)
 └── Pour chaque exercice :
 ├── Nom
 ├── Badge catégorie
 ├── Badge muscle principal
 └── Tap → bottom sheet fiche détail
Onglet Mes exercices :
├── Liste des user_custom_exercises
├── FAB "Créer un exercice"
└── Pour chaque exercice :
 ├── Nom, catégorie, muscle
 └── Actions : "Modifier" | "Supprimer" (si non utilisé da
ns une séance)
Bottom sheet fiche détail (catalogue)
07 — Screens 16├── Nom de l'exercice
├── Catégorie + sous-catégorie + type
├── Muscles : principal et secondaire
└── Bouton "Fermer"
Formulaire création / modification exercice personnalisé
├── Champ Nom (obligatoire)
├── Sélecteur Catégorie (obligatoire)
├── Sélecteur Sous-catégorie (optionnel)
├── Sélecteur Type (optionnel)
├── Champ Muscle principal (text libre ou sélecteur — optionn
el)
├── Champ Muscle secondaire (optionnel)
└── Textarea Notes (optionnel)
États UI
loading → skeleton liste
vide catalogue → (impossible — le catalogue a toujours des do
nnées)
vide perso → "Tu n'as pas encore créé d'exercice."
 + CTA "Créer un exercice"
erreur → toast + liste vide
S-15 — Séance à venir ( /session/:id/preview )
Contenu
├── Header : nom de la séance + date prévue
├── Bandeau de phase (cycle_phase prévue ce jour)
│ └── CYCLE_ADVICE[phase].upcoming
07 — Screens 17├── Durée estimée (si disponible depuis l'historique)
├── Liste des exercices prévus
│ └── Pour chaque exercice :
│ ├── Nom + badge catégorie
│ ├── Résumé : "4 séries × 8 reps × 60 kg"
│ ├── Repos entre séries
│ └── Comparaison (si historique)
│ ├── Dernière fois : "[date] · [poids]kg × [reps]
reps · Phase [phase]"
│ └── Dernière fois en même phase (cycle -1) :
│ "[date] · [poids]kg × [reps] reps · Phase [ph
ase] (cycle précédent)"
└── CTA principal : "Commencer la séance" → /session/:id/acti
ve
Actions
Action Effet
Tap "Commencer la séance" Redirect /session/:id/active
Tap flèche retour Redirect /home
États UI
loading → skeleton bandeau + skeleton liste exercices
erreur → "Impossible de charger cette séance." + bouton ret
our
S-16 — Séance active ( /session/:id/active )
Contenu
├── Header
│ ├── Chronomètre total (MM:SS — démarré à l'arrivée sur la
page)
07 — Screens 18│ ├── Nom de la séance
│ └── Bouton "Terminer" (en haut à droite)
├── Bandeau de phase (compact)
│ └── CYCLE_ADVICE[phase].active
├── Zone exercice courant
│ ├── Nom de l'exercice
│ ├── Indicateur de série : "Série [N] / [Total]"
│ ├── Cible de la série (grisée) :
│ │ └── Ex: "Objectif : 8 reps · 60 kg · RIR 2"
│ ├── Références de comparaison (lecture seule) :
│ ├── Dernière saisie (même exercice)
│ └── Dernière saisie en même phase (cycle -1)
├── Champs de saisie (selon input_type) :
│ │ ├── weight_reps → Poids (kg) + Reps + RIR
│ │ ├── bodyweight_reps → Reps + RIR
│ │ ├── cardio_duration → Durée MM:SS
│ │ ├── cardio_distance → Distance (km) + Durée MM:SS
│ │ └── weight_plus_load → Reps + Charge ajoutée + RIR
│ └── Bouton "Valider la série"
├── Timer de repos (apparaît après validation d'une série)
│ ├── Compte à rebours circulaire (rest_between_sets second
es)
│ ├── Durée personnalisable (+ / - 30s)
│ └── Bouton "Passer" (skip immédiat)
└── Navigation bas de page
 └── Liste horizontale des exercices de la séance
 ├── Exercice complété → check vert
 ├── Exercice courant → surligné
 └── Tap → change l'exercice courant
Modale "Terminer"
07 — Screens 19Route Écran Feature(s)
/history/:id Détail d'une séance passée F-13
/calendar Calendrier F-14
/profile Profil F-15
Conventions de ce fichier
Chaque écran est décrit avec :
Contenu — ce qui s'affiche à l'écran (composants, données, ordre)
Actions — ce que l'utilisatrice peut faire (taps, inputs, navigations)
États UI — loading / vide / erreur / succès
Les états UI suivent toujours ce pattern :
loading → skeleton ou spinner pendant le chargement des donn
ées
vide → écran sans données (premier usage ou aucun conten
u)
erreur → échec d'une requête ou action invalide
succès → confirmation visuelle d'une action réussie
S-01 — Landing ( / )
Contenu
├── Logo Period. + tagline : "Travaille avec ton corps, pas c
ontre lui."
├── Description courte du problème résolu (2–3 phrases)
├── CTA principal : "Commencer" → /signup
├── Lien secondaire : "J'ai déjà un compte" → /login
└── Visuels illustratifs (roue du cycle, bandeau de phase, éc
ran de séance)
07 — Screens 2├── Titre : "Comment s'est passée la séance ?"
├── Sélecteur de ressenti (4 options) :
│ ├── 🪫 Séance de survie
│ ├──  Pas au top mais présente
│ ├── 💪 Solide
│ └── ⚡ J'étais en mode PR
└── CTA "Valider et voir le récap"
Modale "Abandonner"
├── Titre : "Abandonner la séance ?"
├── Texte : "Tes données ne seront pas sauvegardées."
├── CTA "Continuer la séance"
└── CTA "Abandonner" → redirect /home (aucune sauvegarde)
Actions
Action Effet
Valider une série Marque la série done + lance le timer de repos
Skip repos Arrête le timer + passe à la série suivante
Tap exercice (nav) Change l'exercice courant sans perte de données
Tap "Terminer" Ouvre modale ressenti
Sélectionner ressenti Sauvegarde session + redirect /session/:id/recap
Tap "Abandonner" (header) Ouvre modale confirmation abandon
États UI
Pas d'état loading ni vide (les données sont chargées depuis
/preview).
Les données de la séance sont passées en state ou via le stor
e.
erreur sauvegarde → toast "Erreur lors de la sauvegarde"
07 — Screens 20 + réessai automatique 1 fois
 + si échec : toast "Sauvegarde échouée —
contacte le support"
Règles d'accès
✅ Si l'utilisatrice tente d'accéder à /active sans être pass
ée par /preview,
 redirect vers /session/:id/preview.
 (guard sur la présence d'un state de séance active en mémo
ire)
S-17 — Récap de fin de séance ( /session/:id/recap )
Contenu
├── Header : "Récap 🖤"
├── Bloc résumé
│ ├── Nom de la séance
│ ├── Date + heure
│ ├── Durée : "[X] min"
│ ├── Badge phase du cycle
│ └── Badge ressenti (FEELING_LABELS[feeling])
├── Message énergie × performance
│ └── RECAP_MESSAGES[`${feeling}_${performance}`]
├── Bloc victoires (si victories.length > 0)
│ ├── Titre : "Tes victoires 🏆"
│ └── Pour chaque Victory :
│ ├── new_record → "🏆 Nouveau record sur [e
xercice] : [poids]kg"
│ ├── better_than_previous_phase → "🔁 Mieux qu'en phas
07 — Screens 21e [X] : +[Y]kg"
│ └── double_record → "⚡ Double record sur [exe
rcice] !"
├── Bloc détail des exercices
│ └── Pour chaque exercice complété :
│ ├── Nom de l'exercice
│ ├── Tableau séries : Série | Poids réel | Reps réels
| RIR
│ ├── Comparaison vs séance précédente :
│ │ └── Badge progression ('up' → vert ↑ / 'down' → r
ouge ↓ / 'stable' → gris →)
│ ├── Si possible : comparaison vs séance précédente en
même phase (cycle -1)
│ └── Note si was_substituted = true : "Exercice substi
tué"
└── CTA : "Retour à l'accueil" → /home
États UI
loading → skeleton (les données sont normalement déjà en mém
oire —
 skeleton par sécurité si rechargement de page)
erreur → "Impossible de charger le récap." + bouton /home
Règles d'accès
✅ Accessible depuis /history/:id (lecture seule — même conte
nu, pas de CTA "Retour accueil").
✅ Si accès direct sans données en mémoire → charge depuis se
ssion_history + exercise_history.
07 — Screens 22S-18 — Historique (liste) ( /history )
Contenu
├── Header : "Historique"
├── Filtre par programme (dropdown — optionnel)
└── Liste des séances complétées (ORDER BY completed_at DESC,
LIMIT 30)
 └── Pour chaque séance :
 ├── Nom de la séance
 ├── Date et heure (format : "Lundi 7 avril · 18h30")
 ├── Durée
 ├── Badge phase du cycle
 ├── Badge ressenti
 └── Tap → /history/:id
États UI
loading → skeleton liste (3 cards)
vide → "Tu n'as pas encore fait de séance."
 + CTA "Voir les programmes"
erreur → toast + liste vide
S-19 — Historique (détail) ( /history/:id )
Contenu
Même contenu que S-17 (récap) en lecture seule, avec en plus :
├── Section "Comparaison même phase cycle précédent"
│ └── Pour chaque exercice :
│ └── "Phase [X] il y a [N] semaines : [poids]kg × [rep
s] reps"
│ (si exercise_history avec même phase trouvé)
07 — Screens 23└── Pas de CTA "Retour accueil" — bouton retour standard (← /
history)
États UI
loading → skeleton
erreur → "Impossible de charger cette séance." + bouton ret
our
S-20 — Calendrier ( /calendar )
Contenu
├── Header : "Calendrier"
├── Sélecteur de mois : "< Avril 2025 >"
├── Labels des jours : Lun Mar Mer Jeu Ven Sam Dim
├── Grille calendrier (5–6 lignes × 7 colonnes)
│ └── Pour chaque jour :
│ ├── Fond coloré selon la phase (PHASE_DISPLAY_CONFIG
[phase].colorLight)
│ │ └── Jours futurs : opacity 0.5 (phase prédite)
│ │ └── Jours passés : opacity 1 (phase réelle)
│ ├── Numéro du jour
│ ├── Point vert si session_history ce jour
│ ├── Point gris si program_sessions ce jour (non compl
étée)
│ └── Tap → bottom sheet DayDetail
└── Légende des couleurs de phases (compact, en bas)
Bottom sheet DayDetail
├── Date (ex: "Lundi 7 avril")
├── Phase du cycle : emoji + nom + description 1 ligne
07 — Screens 24└── Séance du jour (si applicable) :
 ├── Complétée → nom + durée + lien /history/:id
 └── Prévue → nom + CTA "Voir la séance" → /session/:i
d/preview
Actions
Action Effet
Tap "< >" Change le mois affiché
Tap un jour Ouvre bottom sheet DayDetail
États UI
loading → skeleton grille (cases grises)
erreur → toast + grille sans couleurs
Sans cycle (cycle_tracking = false) :
→ Grille sans couleurs + bandeau :
 "Active le suivi du cycle pour voir les phases."
 + CTA → /profile
S-21 — Profil ( /profile )
Contenu
├── Section Avatar
│ ├── Photo de profil (depuis avatars/{userId}/avatar.{ex
t})
│ └── Bouton "Changer la photo" → sélecteur fichier (jpg, p
ng, webp, max 5MB)
├── Section Informations personnelles
│ ├── Champ Prénom (modifiable, sauvegarde au blur)
│ ├── Email (affiché, non modifiable)
07 — Screens 25│ ├── Sélecteur Niveau (même enum — sauvegarde immédiate)
│ └── Sélecteur Objectif (même enum — sauvegarde immédiate)
├── Section Cycle
│ ├── Toggle "Suivre mon cycle" (cycle_tracking)
│ │ └── Désactiver → confirmation : "Les recommandations
seront génériques."
│ ├── (Si cycle_tracking = true) :
│ │ ├── Input "Durée de mon cycle" (nombre, range 21–35)
│ │ ├── Input "Durée de mes règles" (nombre, range 3–8)
│ │ └── Bouton "Déclarer le début de mes règles"
│ │ → Confirmation → insert health_data + toast "Cycl
e mis à jour 🖤"
├── Section Compte
│ ├── Bouton "Changer le mot de passe"
│ │ → supabase.auth.resetPasswordForEmail(user.email)
│ │ → toast "Un email t'a été envoyé."
│ └── Bouton "Supprimer mon compte" (rouge)
│ → Modale confirmation (voir ci-dessous)
└── Bouton "Se déconnecter"
 → supabase.auth.signOut() → redirect /login
Modale suppression de compte
├── Titre : "Supprimer mon compte"
├── Texte : "Cette action est irréversible. Toutes tes donnée
s seront supprimées définitivement."
├── CTA "Annuler"
└── CTA "Supprimer définitivement" (rouge)
 → RPC delete_user() → redirect /login + toast "Compte sup
primé."
États UI
07 — Screens 26loading avatar upload → spinner sur la photo
erreur avatar → toast "Impossible de changer la phot
o."
sauvegarde profil → spinner inline discret sur le champ
modifié
erreur sauvegarde → toast "Erreur lors de la sauvegard
e."
loading suppression → bouton disabled + spinner
erreur suppression → toast "Erreur — réessaie ou contacte
le support."
Navigation globale
Bottom navigation bar (visible sur toutes les pages protégées)
Onglets :
├── 🏠 Accueil → /home
├── 📅 Calendrier → /calendar
├── 💪 Programmes → /programs
├── 📖 Historique → /history
└── 👤 Profil → /profile
✅ L'onglet actif est mis en surbrillance (couleur primaire).
✅ La bottom nav est masquée sur les écrans immersifs :
 /onboarding, /onboarding/reveal, /session/:id/active.
✅ La bottom nav est masquée sur les écrans d'auth :
 /, /login, /signup, /reset-password.
Back navigation
✅ Un bouton "←" est présent dans le header de tous les écran
s
 non présents dans la bottom nav.
07 — Screens 27✅ Les modales et bottom sheets ont leur propre bouton de fer
meture.
✅ Swipe down pour fermer les bottom sheets (gesture handle
r).
États globaux transversaux
Ces états s'appliquent à tous les écrans sans exception.
Offline / pas de réseau
→ Banner en haut de l'écran : "Pas de connexion internet."
→ Les actions qui nécessitent Supabase sont désactivées.
→ Les données déjà chargées restent affichées (pas de reset).
Session expirée
→ Si une requête Supabase retourne une erreur d'auth (401) :
 → supabase.auth.signOut() automatique
 → redirect /login
 → toast "Ta session a expiré. Reconnecte-toi."
Chargement initial de l'app
→ Splash screen Period. (logo + fond noir) pendant la vérific
ation de session.
→ Si session active + onboarding complété → /home
→ Si session active + onboarding non complété → /onboarding
→ Si pas de session → /
07 — Screens 28Actions
Action Destination
Tap "Commencer" /signup
Tap "J'ai déjà un compte" /login
États UI
Pas de loading, pas d'état vide.
Écran statique — aucune donnée Supabase.
Règles d'accès
✅ Accessible sans être connectée.
✅ Si l'utilisatrice est déjà connectée + onboarding complété
→ redirect /home.
✅ Si l'utilisatrice est déjà connectée + onboarding non comp
lété → redirect /onboarding.
S-02 — Connexion ( /login )
Contenu
├── Logo Period. (petit)
├── Titre : "Bon retour 🖤"
├── Champ Email
├── Champ Mot de passe (avec toggle afficher/masquer)
├── Lien "Mot de passe oublié ?" → /reset-password
├── Bouton "Se connecter"
├── Séparateur "ou"
├── Bouton "Continuer avec Google"
└── Lien "Pas encore de compte ? S'inscrire" → /signup
07 — Screens 3Actions
Action Effet
Submit formulaire supabase.auth.signInWithPassword
Tap Google supabase.auth.signInWithOAuth({ provider: 'google' })
Tap "Mot de passe oublié" Redirect /reset-password
Tap "S'inscrire" Redirect /signup
États UI
loading → bouton "Se connecter" en état disabled + spinner i
nline
erreur → message d'erreur sous le formulaire (voir F-01 tab
leau des erreurs)
succès → redirect automatique (/home ou /onboarding selon l
e profil)
Règles d'accès
✅ Accessible sans être connectée.
✅ Si déjà connectée → redirect /home.
S-03 — Inscription ( /signup )
Contenu
├── Logo Period. (petit)
├── Titre : "Créer mon compte"
├── Champ Email
├── Champ Mot de passe (avec toggle afficher/masquer)
├── Champ Confirmer le mot de passe
├── Bouton "Créer mon compte"
├── Séparateur "ou"
07 — Screens 4├── Bouton "Continuer avec Google"
└── Lien "Déjà un compte ? Se connecter" → /login
Actions
Action Effet
Submit formulaire supabase.auth.signUp + création profil
Tap Google supabase.auth.signInWithOAuth({ provider: 'google' })
Tap "Se connecter" Redirect /login
États UI
loading → bouton disabled + spinner
erreur → message sous le formulaire (voir F-01 tableau des
erreurs)
succès → redirect /onboarding
Règles d'accès
✅ Accessible sans être connectée.
✅ Si déjà connectée → redirect /home.
S-04 — Réinitialisation mot de passe ( /resetpassword )
Contenu
Deux sous-états selon la présence d'un token dans l'URL :
Sans token (demande de reset) :
├── Titre : "Mot de passe oublié"
├── Sous-titre : "Entre ton email et on t'envoie un lien de r
éinitialisation."
07 — Screens 5├── Champ Email
├── Bouton "Envoyer le lien"
└── Lien "Retour à la connexion" → /login
Avec token (nouveau mot de passe) :
├── Titre : "Nouveau mot de passe"
├── Champ Nouveau mot de passe
├── Champ Confirmer le mot de passe
└── Bouton "Enregistrer"
États UI
loading → bouton disabled + spinner
erreur → message sous le formulaire
succès (demande) → "Un email t'a été envoyé. Vérifie ta boît
e mail."
succès (nouveau) → redirect /login avec toast "Mot de passe
mis à jour"
S-05 — Onboarding ( /onboarding )
Structure générale
├── Barre de progression (steps 1/4 → 4/4)
├── Bouton "Retour" (sauf step 1)
└── Contenu du step courant
Step 1 — Informations de base
Contenu :
├── Titre : "Dis-moi qui tu es"
├── Champ Prénom (text input — obligatoire)
07 — Screens 6├── Sélecteur Niveau :
│ ├── Débutante
│ ├── Intermédiaire
│ └── Avancée
└── Sélecteur Objectif :
 ├── Prendre de la masse
 ├── Perdre du poids
 ├── Me tonifier
 └── Équilibre
CTA : "Continuer" → step 2 (disabled si prénom vide ou nivea
u/objectif non sélectionnés)
Step 2 — Suivi du cycle
Contenu :
├── Titre : "Est-ce que tu suis ton cycle ?"
├── Description courte (pourquoi c'est utile)
├── Bouton "Oui, je suis mon cycle" → step 3
└── Bouton "Non, pas pour l'instant" → step 4
Step 3 — Données du cycle
Contenu :
├── Titre : "Ton cycle"
├── Date picker "Premier jour de mes dernières règles" (oblig
atoire)
│ └── Max : aujourd'hui. Min : aujourd'hui - 60 jours.
├── Slider "Durée de mon cycle" (défaut: 28, range: 21–35, pa
s: 1)
│ └── Label sous le slider : "X jours"
└── Slider "Durée de mes règles" (défaut: 5, range: 3–8, pas:
1)
 └── Label sous le slider : "X jours"
07 — Screens 7CTA : "Continuer" → step 4
Step 4 — Jours d'entraînement
(❌ Supprimé du MVP)
La sélection des jours d'entraînement ne fait pas partie de
l'onboarding.
Les jours sont choisis lors de la création/import de programm
e, au niveau de chaque séance.
CTA : "Terminer" → sauvegarde + redirect /onboarding/reveal
États UI
loading → spinner plein écran pendant la sauvegarde finale
erreur → toast "Une erreur est survenue, réessaie."
 + les données saisies sont conservées (pas de rese
t du formulaire)
S-06 — Révélation post-onboarding
( /onboarding/reveal )
Contenu
├── Animation d'entrée (fade-in staggered)
├── Titre : "Voilà ton cycle 🖤"
├── Sous-titre : "Chaque couleur correspond à une phase. Chaq
ue phase, une façon de t'entraîner."
├── Calendrier du mois courant avec phases colorées (vue lect
ure seule)
├── Bandeau de la phase actuelle avec son emoji et son nom
└── CTA : "C'est parti" → /home
07 — Screens 8États UI
loading → skeleton du calendrier pendant le calcul des phase
s
Règles d'accès
✅ Accessible uniquement juste après l'onboarding (session fr
esh).
✅ Si l'utilisatrice navigue directement sur cette URL après
l'onboarding
 → écran affiché normalement (les données existent déjà).
S-07 — Accueil ( /home )
Contenu
├── Header
│ ├── "Bonjour [prénom] 🖤"
│ └── Icône cloche (notifications — inactif dans le MVP)
├── Roue du cycle
│ ├── Cercle divisé en 4 arcs colorés (proportionnels aux d
urées des phases)
│ ├── Arc actif = phase courante (légèrement agrandi / plus
saturé)
│ ├── Centre : "J[cycleDay]" + nom de la phase
│ └── Tap sur la roue → bottom sheet PhaseInfo
├── Bandeau de recommandation du jour
│ ├── Fond coloré (couleur de la phase)
│ ├── Emoji + texte court (PHASE_DISPLAY_CONFIG[phase].bann
er)
│ └── Tap → même bottom sheet PhaseInfo
07 — Screens 9