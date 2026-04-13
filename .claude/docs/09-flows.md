09 — flows
Source de vérité des parcours utilisateur. Ce fichier décrit tous les flows de
Period. : happy path et chemins alternatifs. Il est lu par Cursor pour comprendre
l'enchaînement des écrans, les décisions, et les états intermédiaires avant
d'implémenter un flow complet. Les règles métier sont dans 06-features.md .
Les écrans détaillés sont dans 07-screens.md . Les routes sont dans 08-
navigation.md .
Conventions
Chaque flow est décrit avec :
Happy path — le parcours idéal sans friction
Chemins alternatifs — les bifurcations et cas limites prévisibles
Un diagramme de flow pour les parcours complexes
[Écran] → représente un écran
(Action) → représente une action utilisatrice
{Condition} → représente une décision ou un état
→ → navigation vers
✓ → condition vraie
✗ → condition fausse
FLOW-01 — Premier lancement (nouvelle utilisatrice)
Happy path
[Landing /]
 (Tap "Commencer")
 → [Signup /signup]
 (Saisit email + password + confirmation)
 (Tap "Créer mon compte")
09 — flows 1B  Séries partielles (champs non remplis)
[Séance active — série en cours]
 (Tap "Valider la série" avec champs vides)
 → Série validée avec actual = {} (champs undefined)
 → Pas de blocage — l'utilisatrice peut valider vide
 → La série apparaît dans exercise_history avec actual vid
e
C  Navigation libre entre exercices
[Séance active]
 (Tap exercice 3 dans la nav avant de finir exercice 1)
 → Bascule sur exercice 3
 → Les séries déjà saisies pour exercice 1 sont conservées
en mémoire
 → L'utilisatrice peut revenir à exercice 1 à tout moment
D  Premier exercice de cet exercice (pas d'historique)
[Séance à venir]
 → Pas de ligne "Dernière fois" pour cet exercice
 → "Première fois ? Lance-toi 🖤" affiché à la place
[Séance active]
 → Série 1 pré-remplie depuis set_targets uniquement (pas
d'historique)
E  Rechargement de page pendant la séance
[Séance active]
 (Rafraîchit la page navigateur)
 → State en mémoire perdu
 → Guard activeSession → redirect /session/:id/preview
 → toast "Ta séance en cours a été perdue."
09 — flows 10FLOW-06 — Consulter l'historique et comparer les
phases
Happy path
[Bottom nav → Historique /history]
 (Voit la liste des séances passées)
 (Tap sur une séance — ex: "Séance Jambes, Lundi 7 avril")
 → [Historique détail /history/:id]
 (Voit le détail : durée, phase, ressenti, performance)
 (Scrolle vers le bas)
 → Section "Comparaison même phase cycle précédent"
 (Voit : "Phase folliculaire il y a 4 semaines : 55k
g × 8 reps")
 (Tap bouton retour ←)
 → [Historique /history]
Chemins alternatifs
A  Filtrer par programme
[Historique /history]
 (Tap dropdown filtre "Tous les programmes")
 (Sélectionne "Programme Jambes 3x")
 → Liste filtrée sur les séances de ce programme uniquemen
t
B  Pas encore de séances
[Historique /history]
 → État vide : "Tu n'as pas encore fait de séance."
 + CTA "Voir les programmes" → /programs
C  Pas d'historique dans la même phase
09 — flows 11[Historique détail /history/:id]
 → Section "Comparaison même phase" :
 "Pas encore de données pour cette phase. Continue comme ç
a 🖤"
FLOW-07 — Gérer son cycle (déclaration des règles)
Happy path — depuis l'accueil
[Accueil /home]
 (Règles commencent aujourd'hui)
 (Tap "Mes règles ont commencé aujourd'hui")
 → [Modale confirmation]
 "Confirmer le début de tes règles aujourd'hui ?"
 (Tap "Confirmer")
 → INSERT health_data { date: today, cycle_day: 1, cyc
le_phase: 'menstrual' }
 → cyclePredictionService recalcule les moyennes
 → Roue du cycle mise à jour (J1, phase menstruelle)
 → toast "Cycle mis à jour 🖤"
Happy path — depuis le profil
[Profil /profile]
 (Tap "Déclarer le début de mes règles")
 → Même modale + même flow que depuis l'accueil
Chemins alternatifs
A  1 seule date en base (< 2 entrées cycle_day = 1)
[Accueil /home] ou [Calendrier]
 → cyclePredictionService retourne null (pas assez de donnée
09 — flows 12s)
 → Roue neutre + message :
 "Ajoute une deuxième date de règles pour voir ta prédicti
on"
 → Bouton discret "Déclarer le début de mes règles" toujours
visible
 → Après la 2ème déclaration : prédiction activée, roue et c
alendrier mis à jour
B  Activer le suivi du cycle (was false)
[Profil /profile]
 (Toggle "Suivre mon cycle" → ON)
 → profiles.cycle_tracking = true
 → Affichage des champs : durée cycle + durée règles + bou
ton déclaration
 → (Tap "Déclarer le début de mes règles")
 → INSERT health_data + recalcul
 → Roue du cycle activée sur /home et /calendar
B  Désactiver le suivi du cycle
[Profil /profile]
 (Toggle "Suivre mon cycle" → OFF)
 → Modale : "Les recommandations seront génériques. Tes do
nnées de cycle sont conservées."
 (Tap "Désactiver")
 → profiles.cycle_tracking = false
 → health_data conservé (pas de DELETE)
 → Roue neutre sur /home
 → Calendrier sans couleurs
 → Bandeaux génériques sur les séances
C  Déclaration erronée (règles déclarées par erreur)
09 — flows 13→ Pas de flow de correction dans le MVP.
 L'utilisatrice peut redéclarer le lendemain — le service f
iltre les écarts < 15j.
 Les deux entrées coexistent en base, seule la dernière fai
t foi pour J1.
FLOW-08 — Gérer ses programmes
Activer un programme
[Liste programmes /programs]
 (Tap "Activer" sur un programme en pause ou terminé)
 → UPDATE tous les programmes : is_active = false
 → UPDATE ce programme : is_active = true, status = 'activ
e'
 → toast "Programme activé 🖤"
 → La card passe en "Actif" dans la liste
 → /home affiche les séances de ce programme
Mettre en pause
[Détail programme /programs/:id]
 (Tap "Mettre en pause")
 → UPDATE : is_active = false, status = 'paused'
 → toast "Programme mis en pause"
 → /home : état vide prochaines séances
Supprimer un programme
[Détail programme /programs/:id] ou [Liste /programs]
 (Tap "Supprimer")
 → Modale : "Supprimer ce programme ? L'historique des séa
nces est conservé."
09 — flows 14 (Tap "Supprimer")
 → DELETE programs CASCADE → program_sessions → sessio
n_exercises
 → session_history.session_id → null (conservé)
 → redirect /programs
 → toast "Programme supprimé"
Modifier un programme
[Détail programme /programs/:id]
 (Tap "Modifier")
 → [Modification /programs/:id/edit]
 (Même interface que la création — données pré-remplies)
 (Modifie le nom, ajoute une séance, modifie des exercic
es)
 (Tap "Enregistrer")
 → UPDATE programs + UPSERT program_sessions + session
_exercises
 → redirect /programs/:id + toast "Programme mis à jou
r"
FLOW-10 — Consulter le calendrier
Happy path
[Bottom nav → Calendrier /calendar]
 (Voit le mois courant avec phases colorées)
 (Tap sur un jour passé avec séance complétée)
 → [Bottom sheet DayDetail]
 Phase du jour + nom + description courte
 "Séance Jambes — 52 min · [Voir le détail →]"
 (Tap "Voir le détail")
 → [Historique détail /history/:id]
09 — flows 15Chemins alternatifs
A  Tap sur un jour futur avec séance prévue
[Bottom sheet DayDetail — jour futur]
 → Phase prédite (couleur transparente)
 → "Séance Jambes prévue · [Voir la séance →]"
 (Tap "Voir la séance") → /session/:id/preview
B  Tap sur un jour sans séance
[Bottom sheet DayDetail — jour sans séance]
 → Phase du jour + description
 → Pas de mention de séance
 → Bouton "Fermer"
C  Navigation entre mois
[Calendrier]
 (Tap "<" — mois précédent)
 → Calcul des phases pour le mois précédent
 → Re-render de la grille
 (Tap ">" — mois suivant)
 → Calcul des phases prédites pour le mois suivant
 → Couleurs à 50% d'opacité (phases futures)
D  Sans cycle actif
[Calendrier]
 → Grille sans couleurs
 → Banner : "Active le suivi du cycle pour voir les phases."
 + CTA → /profile
FLOW-11 — Gérer son profil
09 — flows 16Modifier les informations personnelles
[Profil /profile]
 (Modifie le prénom dans le champ)
 (Blur sur le champ)
 → UPDATE profiles.name
 → Feedback visuel discret (check ✓ ou spinner)
Changer la photo de profil
[Profil /profile]
 (Tap "Changer la photo")
 → Sélecteur de fichier natif (jpg, png, webp, max 5MB)
 (Sélectionne une photo)
 → Upload vers Supabase Storage : avatars/{userId}/avata
r.{ext} (upsert: true)
 → UPDATE profiles.avatar_url
 → Photo mise à jour dans l'UI
Supprimer son compte
[Profil /profile]
 (Tap "Supprimer mon compte")
 → [Modale confirmation]
 "Cette action est irréversible. Toutes tes données sero
nt supprimées définitivement."
 (Tap "Supprimer définitivement")
 → RPC delete_user()
 → supabase.auth.signOut()
 → redirect /login
 → toast "Compte supprimé."
Se déconnecter
09 — flows 17[Profil /profile]
 (Tap "Se déconnecter")
 → supabase.auth.signOut()
 → Nettoyage du store local
 → redirect /login
FLOW-12 — Gérer la bibliothèque d'exercices
Créer un exercice personnalisé
[Bibliothèque /exercises — onglet "Mes exercices"]
 (Tap FAB "Créer un exercice")
 → [Formulaire création inline ou modale]
 (Saisit nom : "Fentes bulgares haltères")
 (Sélectionne catégorie : "Bas du corps")
 (Sélectionne muscle : "Quadriceps")
 (Tap "Enregistrer")
 → INSERT user_custom_exercises
 → Exercice visible dans "Mes exercices"
 → toast "Exercice créé"
Modifier un exercice personnalisé
[Bibliothèque /exercises — onglet "Mes exercices"]
 (Tap "Modifier" sur un exercice)
 → Formulaire pré-rempli
 (Modifie le nom)
 (Tap "Enregistrer")
 → UPDATE user_custom_exercises
 → toast "Exercice mis à jour"
Supprimer un exercice personnalisé
09 — flows 18[Bibliothèque]
 → {exercice utilisé dans une séance ?}
 ✓ → Bouton "Supprimer" désactivé + tooltip :
 "Cet exercice est utilisé dans un programme."
 ✗ → Tap "Supprimer"
 → Modale : "Supprimer cet exercice ?"
 (Tap "Supprimer")
 → DELETE user_custom_exercises
 → toast "Exercice supprimé"
Matrice flows × features
Flow Features impliquées
FLOW01 Premier lancement F01, F02, F03
FLOW02 Retour utilisatrice F01
FLOW03 Créer un programme F06, F07
FLOW04 Importer via Make F05
FLOW05 Démarrer une séance F10, F11, F12
FLOW06 Consulter l'historique F13
FLOW07 Gérer son cycle F03, F15
FLOW08 Gérer ses programmes F07
FLOW10 Calendrier F14, F03
FLOW11 Profil F15
FLOW12 Bibliothèque F08
09 — flows 19 → Supabase signUp + création profil vide
 → [Onboarding /onboarding — Step 1]
 (Saisit prénom, choisit niveau et objectif)
 (Tap "Continuer")
 → [Step 2 — Suivi du cycle]
 (Tap "Oui, je suis mon cycle")
 → [Step 3 — Données du cycle]
 (Sélectionne date dernières règles, durée c
ycle, durée règles)
 (Tap "Continuer")
 → [Step 4 — Jours d'entraînement]
 (Sélectionne ses jours)
(Tap "Terminer")
 → Sauvegarde profiles + health_data +
user_settings
 → [Révélation /onboarding/reveal]
 (Voit le calendrier coloré + phase
actuelle)
 (Tap "C'est parti")
 → [Accueil /home]
Chemins alternatifs
A  Connexion Google au lieu d'email
[Signup]
 (Tap "Continuer avec Google")
 → OAuth Google
 → Supabase crée la session + profil (name depuis user_met
adata.full_name)
 → {onboarding complété ?}
 ✗ → [Onboarding /onboarding — Step 1] (prénom pré-rempl
i depuis Google)
 ✓ → [Accueil /home]
B  Sans suivi de cycle (step 2)
09 — flows 2[Step 2]
 (Tap "Non, pas pour l'instant")
 → profiles.cycle_tracking = false
 → [Step 4 — Jours d'entraînement] (step 3 sauté)
 → Sauvegarde
 → [Révélation]
 (Calendrier sans couleurs + message générique)
 → [Accueil /home]
 (Roue neutre, bandeau générique)
C  Erreur à l'inscription
[Signup]
 (Submit)
 → {email déjà utilisé ?}
 ✓ → Message erreur sous le formulaire : "Un compte exis
te déjà avec cet email."
 (Tap "Se connecter") → [Login /login]
 → {mot de passe trop court ?}
 ✓ → Message erreur : "Le mot de passe doit contenir au
moins 6 caractères."
D  Abandon en cours d'onboarding
[Onboarding step N]
 (Ferme l'app / rafraîchit la page)
 → {données du step courant sauvegardées ?}
 ✓ → Retour sur /onboarding au même step (profiles.cycle
_tracking = null → guard onboarding)
 ✗ → Retour step 1
FLOW-02 — Retour utilisatrice existante
Happy path
09 — flows 3[Landing /] ou [Login /login]
 (Saisit email + password)
 (Tap "Se connecter")
 → Supabase signInWithPassword
 → {onboarding complété ?}
 ✓ → [Accueil /home]
 ✗ → [Onboarding /onboarding]
Chemins alternatifs
A  Session encore active (retour sur l'app)
[/ ou /login]
 → {session Supabase active ?}
 ✓ → {onboarding complété ?}
 ✓ → redirect /home (guard requireNoAuth)
 ✗ → redirect /onboarding
 ✗ → écran affiché normalement
B  Mot de passe oublié
[Login]
 (Tap "Mot de passe oublié ?")
 → [Reset password /reset-password] (sans token)
 (Saisit email)
 (Tap "Envoyer le lien")
 → supabase.auth.resetPasswordForEmail
 → Affiche : "Un email t'a été envoyé."
 → [Email reçu]
 (Tap le lien dans l'email)
 → [Reset password /reset-password] (avec token da
ns l'URL)
 (Saisit nouveau mot de passe + confirmation)
 (Tap "Enregistrer")
 → supabase.auth.updateUser
09 — flows 4 → redirect /login + toast "Mot de passe mis à
jour"
FLOW-03 — Créer et lancer un programme (création
manuelle)
Happy path
[Accueil /home]
 (Tap "Créer un programme" — état vide prochaines séances)
 → [Création programme /programs/new — Step 1]
 (Saisit nom, description, durée)
 (Tap "Ajouter des séances →")
 → [Step 2 — Construction des séances]
 (Tap "Ajouter une séance")
 → Formulaire inline : nom + jour de la semaine
 (Valide)
 → Séance ajoutée à la liste
 (Tap "Modifier les exercices")
 → [Drawer ajout exercices]
 (Recherche "squat" dans la bibliothèque)
 (Tap "Squat barre")
 → Exercice ajouté, formulaire série/reps/
poids
 (Configure : 4 séries, 8 reps, 60kg)
 (Tap "Valider")
 → [Step 2] (exercice visible dans la sé
ance)
 (Tap "Enregistrer le programme")
 → INSERT programs + program_sessions + session_ex
ercises
 → redirect [Détail programme /programs/:id]
 (Tap "Activer ce programme")
 → UPDATE is_active = true
09 — flows 5 → toast "Programme activé 🖤"
 → [Accueil /home] (prochaines séances visible
s)
Chemins alternatifs
A  Programme créé mais pas activé
[Détail programme]
 (Ne tape pas "Activer")
 → Programme reste is_active = false
 → [Accueil] : état vide "Pas encore de programme. [Créer
un programme →]"
 → L'utilisatrice peut activer depuis /programs à tout mom
ent
B  Validation sans exercice dans une séance
[Step 2]
 (Tap "Enregistrer le programme" avec une séance vide)
 → Erreur inline : "Ajoute au moins un exercice à chaque s
éance."
 → Pas d'INSERT
FLOW-04 — Importer un programme via Make
Happy path
[Liste programmes /programs]
 (Tap "Importer")
 → [Import /programs/import — Step 1]
 (Colle texte du programme dans le textarea)
 (Tap "Analyser le programme")
 → POST vers Make webhook
 → Spinner "Make analyse ton programme..."
09 — flows 6 → Réponse Make : JSON structuré
 → [Step 2 — Vérification]
 (Vérifie le nom, les séances, les exercices)
 (Corrige le poids d'un exercice inline)
 (Tap "Valider et importer")
 → Résolution exercices → exercise_catalog (fuzzy
match)
 → INSERT programs + sessions + exercises
 → redirect [Détail programme /programs/:id]
 + toast "Programme importé 🖤"
Chemins alternatifs
A  Make timeout (> 30s)
[Step 1 — en attente]
 → 30s sans réponse
 → Erreur : "Make n'a pas pu analyser ce contenu."
 → 2 CTA : "Réessayer" | "Créer manuellement"
 (Tap "Réessayer") → renvoie le même contenu à Make
 (Tap "Créer manuellement") → redirect /programs/new
B  JSON Make invalide ou vide
[Step 1 — réponse Make]
 → {JSON valide ?}
 ✗ → Erreur : "Le programme n'a pas pu être analysé. Essai
e avec un texte plus structuré."
 + CTA "Réessayer" et "Créer manuellement"
C  Exercice non matché (pas dans le catalogue)
[Step 2 — vérification]
 → Exercice sans match → badge "Exercice personnalisé" sur l
a card
09 — flows 7 → À la validation : INSERT dans user_custom_exercises autom
atiquement
D  Upload fichier (au lieu de texte)
[Step 1]
 (Tap tab "Fichier")
 (Upload un .txt ou .pdf, max 5 MB)
 → Lecture du fichier côté client → base64
 → POST Make avec { type: 'file', content: base64 }
 → même flow que le texte
FLOW-05 — Démarrer et compléter une séance
Happy path
[Accueil /home]
 (Tap sur une card de séance à venir)
 → [Séance à venir /session/:id/preview]
 (Lit le détail : exercices, comparaison "dernière foi
s", bandeau de phase)
 (Tap "Commencer la séance")
 → [Séance active /session/:id/active]
 [Exercice 1 — Squat barre]
 Série 1 :
 (Saisit 60 kg, 8 reps, RIR 2)
 (Tap "Valider la série")
 → Timer de repos 2'30 démarre
 (Attend ou tap "Passer")
 Série 2 :
 (Champs pré-remplis avec valeurs série 1)
 (Modifie reps : 7)
 (Tap "Valider la série")
09 — flows 8 → Timer de repos
 Série 3, 4 : même flow
 (Tap exercice 2 dans la nav bas de page)
 → [Exercice 2 — Hip thrust barre]
 (Saisit les séries)
 [Tous les exercices complétés]
 (Tap "Terminer")
 → [Modale ressenti]
 (Sélectionne "💪 Solide")
 (Tap "Valider et voir le récap")
 → Calcul scores + victoires
 → INSERT session_history + exercise_history
 → UPDATE program_sessions.status = 'complet
ed'
 → [Récap /session/:id/recap]
 (Lit les victoires, le message énergie ×
performance)
 (Tap "Retour à l'accueil")
 → [Accueil /home]
Chemins alternatifs
A  Abandon de séance
[Séance active]
 (Tap bouton abandon dans le header)
 → [Modale "Abandonner la séance ?"]
 (Tap "Continuer la séance") → retour à la séance (rien
ne change)
 (Tap "Abandonner")
 → Aucune sauvegarde
 → program_sessions.status reste 'pending'
 → redirect /home
09 — flows 9