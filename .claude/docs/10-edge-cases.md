10 — Edge cases
Source de vérité des cas limites. Ce fichier recense tout ce qui se passe quand
ça se passe mal — ou différemment du happy path. Il est lu par Cursor avant
d'implémenter la gestion d'erreur, les états vides, et les comportements
défensifs.
Les flows normaux sont dans 09-flows.md . Les règles métier dans 06-features.md .
Conventions
Chaque cas limite est décrit avec :
Contexte — dans quel écran / situation il se produit
Déclencheur — ce qui provoque l'état limite
Comportement attendu — ce que l'app doit faire
Ce qu'on ne fait pas — pour éviter les sur-ingénieries
Les cas sont groupés par domaine fonctionnel.
1. Authentification
EC-01 — Session expirée pendant l'utilisation
Contexte : L'utilisatrice est connectée et utilise l'app normalement.
Déclencheur : Le token Supabase expire (par défaut 1h) et n'est pas rafraîchi.
Comportement attendu :
→ La prochaine requête Supabase retourne une erreur 401
→ authService intercepte l'erreur
→ supabase.auth.signOut() automatique
→ Nettoyage du store local (profil, cycle, séance active)
10 — Edge cases 1EC-18 — Import Make : exercice avec nom ambigu
Contexte : Make retourne un exercice dont le nom matche plusieurs entrées du
catalogue.
Déclencheur : Fuzzy match avec score identique sur plusieurs exercices.
Comportement attendu :
→ En cas d'égalité : prendre le premier résultat (ORDER BY na
me ASC)
→ Badge "Vérifie cet exercice" sur la card dans l'écran de vé
rification
→ L'utilisatrice peut corriger manuellement le nom avant de v
alider
EC-19 — Import Make : programme sans séance
Contexte : Make retourne un JSON valide mais avec un tableau sessions vide.
Déclencheur : Texte trop vague ou non structuré envoyé à Make.
Comportement attendu :
→ Validation du JSON côté app avant affichage :
 if (json.sessions.length === 0) → erreur
→ Message : "Make n'a pas détecté de séances. Essaie avec un
programme plus détaillé."
→ CTA "Réessayer" et "Créer manuellement"
→ Pas d'INSERT
5. Séance active
EC-20 — Fermeture / rechargement de page pendant la séance
Contexte : L'utilisatrice ferme l'onglet ou rafraîchit pendant /session/:id/active.
Déclencheur : Fermeture navigateur, refresh, crash app.
10 — Edge cases 10Comportement attendu :
→ State en mémoire perdu (pas de persistance dans le MVP)
→ Guard activeSession → redirect /session/:id/preview
→ toast "Ta séance en cours a été perdue."
→ program_sessions.status reste 'pending' (la séance peut êtr
e refaite)
Ce qu'on ne fait pas :
✗ Pas de persistance du state de séance en localStorage ou Su
pabase dans le MVP
 → documenté pour la V2
EC-21 — Toutes les séries validées sans poids ni reps
Contexte : L'utilisatrice valide toutes les séries sans rien saisir.
Déclencheur : Tap "Valider la série" répété avec champs vides.
Comportement attendu :
→ set_details.actual = {} pour chaque série
→ Sauvegarde acceptée (pas de blocage)
→ total_volume = 0 (aucun poids × reps à sommer)
→ performance_score = 0 → PerformanceLevel = 'decline'
→ Pas de victoire détectée
→ Récap affiché normalement avec les données vides
EC-22 — Valeur de poids ou reps négative ou aberrante
Contexte : Séance active — saisie d'un champ numérique.
Déclencheur : L'utilisatrice saisit -5 ou 9999 dans un champ.
Comportement attendu :
10 — Edge cases 11Poids :
→ Validation inline : min = 0, max = 500 (kg)
→ Valeur hors range → champ en erreur (bordure rouge) + messa
ge "Entre 0 et 500 kg"
→ Pas de blocage du bouton "Valider la série" — avertissement
non bloquant
→ La valeur aberrante est sauvegardée telle quelle (c'est à
l'utilisatrice de corriger)
Reps :
→ min = 0, max = 100
→ Même comportement que poids
RIR :
→ min = 0, max = 10 (défini dans SET_INPUT_CONFIG range)
→ Même comportement
EC-23 — Timer de repos à 0 sans action de l'utilisatrice
Contexte : Le timer de repos atteint 00:00.
Déclencheur : L'utilisatrice ne tape pas "Passer" — le timer expire seul.
Comportement attendu :
→ À 00:00 : vibration haptic (si disponible sur l'appareil)
→ Le timer reste affiché à 00:00 (pas de disparition automati
que)
→ Un son discret peut être joué (optionnel — selon les préfér
ences)
→ L'utilisatrice doit taper manuellement sur "Passer" ou comm
encer à saisir
 pour passer à la série suivante
→ Le timer ne repart pas automatiquement
10 — Edge cases 12EC-24 — Séance sans exercices complétés (abandon immédiat)
Contexte : L'utilisatrice tape "Terminer" immédiatement après avoir commencé.
Déclencheur : Aucune série validée — tap immédiat sur "Terminer".
Comportement attendu :
→ La modale ressenti s'affiche normalement
→ L'utilisatrice sélectionne un ressenti et valide
→ session_history INSERT avec :
 duration_minutes = 0 (ou 1 si < 1 min)
 total_volume = 0
 performance_score = 0
→ exercise_history : aucune ligne insérée (pas d'exercice tou
ché)
→ Récap affiché : "0 exercices · 0 min"
→ Pas de victoire
Ce qu'on ne fait pas :
✗ Pas de blocage ou d'avertissement "Tu n'as rien fait"
 → L'utilisatrice a toujours le droit de valider une séance
vide
EC-25 — Erreur de sauvegarde en fin de séance
Contexte : L'utilisatrice valide son ressenti — INSERT session_history échoue.
Déclencheur : Erreur réseau ou Supabase au moment de la sauvegarde.
Comportement attendu :
→ toast "Erreur lors de la sauvegarde"
→ Réessai automatique 1 fois (retry immédiat)
→ Si 2e échec :
 → toast "Sauvegarde échouée. Tes données sont perdues."
 → CTA "Retour à l'accueil" → /home
 → Pas de redirect automatique (l'utilisatrice doit confirm
10 — Edge cases 13er)
→ program_sessions.status reste 'pending' (la séance peut êtr
e refaite)
6. Récap et historique
EC-26 — performance_score incalculable (séance cardio pure)
Contexte : Toutes les séries sont de type cardio_duration ou cardio_distance.
Déclencheur : total_volume = 0 car pas de poids × reps.
Comportement attendu :
→ calculatePerformanceScore retourne null (division par zéro
évitée)
→ PerformanceLevel affiché = 'solid' par défaut
→ RECAP_MESSAGES clé = `${feeling}_solid`
→ Pas d'erreur affiché — comportement silencieux et cohérent
EC-27 — Accès direct à /session/:id/recap (sans séance en
mémoire)
Contexte : L'utilisatrice accède à l'URL du récap directement (bookmark, lien).
Déclencheur : Navigation directe vers /session/:id/recap.
Comportement attendu :
→ Pas de state de séance en mémoire
→ Chargement depuis session_history WHERE session_id = :id +
exercise_history
→ Si trouvé : affichage du récap en lecture seule (même conte
nu que /history/:id)
→ Si non trouvé (séance jamais complétée) :
 → toast "Cette séance n'a pas encore été complétée."
 → redirect /home
10 — Edge cases 14EC-28 — Historique avec données legacy (reps_per_set /
weight_per_set CSV)
Contexte : Séances sauvegardées avant la migration vers set_details jsonb.
Déclencheur : Chargement d'exercise_history avec set_details = null mais
reps_per_set renseigné.
Comportement attendu :
→ Vérification : if (set_details) → utiliser set_details
 else if (reps_per_set) → parser le CSV legac
y
→ Parser CSV : "10, 10, 8".split(',').map(Number)
→ Affichage dégradé : seulement reps et poids (pas de RIR, pa
s de target vs actual)
→ Pas d'erreur affichée — comportement silencieux
7. Calendrier
EC-29 — Navigation vers un mois avec toutes les phases futures
Contexte : L'utilisatrice navigue plusieurs mois en avant dans le calendrier.
Déclencheur : Tap ">" plusieurs fois — ex: 6 mois dans le futur.
Comportement attendu :
→ cyclePredictionService calcule les phases prédites pour cha
que jour
→ Toutes les couleurs à 50% d'opacité (phases futures)
→ Pas de points de séances (aucune séance future connue au-de
là du programme actif)
→ Pas de limite de navigation dans le MVP (l'utilisatrice peu
t aller loin)
→ Performance : calcul en mémoire, pas de requête Supabase pa
r mois
10 — Edge cases 15EC-30 — Tap sur un jour sans phase calculée
Contexte : cycle_tracking = false ou calcul de phase retourne null.
Déclencheur : Tap sur n'importe quel jour du calendrier sans données de cycle.
Comportement attendu :
→ Bottom sheet DayDetail affiche :
 → Date
 → "Pas de données de cycle pour ce jour."
 → Séance du jour si applicable (indépendant du cycle)
→ Pas de couleur de fond sur ce jour
8. Profil
EC-31 — Upload d'une photo trop lourde (> 5 MB)
Contexte : L'utilisatrice sélectionne une image volumineuse.
Déclencheur : Fichier > 5 MB dans le sélecteur.
Comportement attendu :
→ Vérification côté client avant upload : file.size > 5 * 102
4 * 1024
→ toast "La photo doit faire moins de 5 MB."
→ Pas d'upload vers Supabase Storage
EC-32 — Upload d'un format non supporté
Contexte : L'utilisatrice sélectionne un .gif ou .heic.
Déclencheur : Fichier dont le type MIME n'est pas image/jpeg, image/png,
image/webp.
Comportement attendu :
10 — Edge cases 16→ Vérification côté client : ['image/jpeg', 'image/png', 'ima
ge/webp'].includes(file.type)
→ toast "Format non supporté. Utilise un JPG, PNG ou WebP."
→ Pas d'upload
EC-33 — Erreur lors de la suppression de compte (RPC échoue)
Contexte : L'utilisatrice confirme la suppression — la RPC delete_user() échoue.
Déclencheur : Erreur Supabase lors de l'appel RPC.
Comportement attendu :
→ toast "Erreur lors de la suppression. Réessaie ou contacte
le support."
→ Bouton "Supprimer définitivement" redevient actif
→ L'utilisatrice reste sur /profile
→ Son compte n'est pas supprimé (la RPC a échoué avant d'agi
r)
9. Réseau et connectivité
EC-34 — Perte de connexion pendant l'utilisation
Contexte : L'utilisatrice perd le réseau en cours de session.
Déclencheur : navigator.onLine = false ou requête réseau timeout.
Comportement attendu :
→ Banner en haut de l'écran : "Pas de connexion internet."
→ Les actions Supabase sont désactivées (boutons disabled)
→ Les données déjà chargées restent affichées (pas de reset d
e l'UI)
→ Dès que la connexion est rétablie : banner disparaît, bouto
ns réactivés
10 — Edge cases 17Exception — séance active :
→ Pendant /session/:id/active, le réseau n'est pas requis
 (state en mémoire uniquement)
→ Le réseau est requis uniquement à la sauvegarde finale (tap
"Terminer")
→ Si réseau absent à la sauvegarde : voir EC-25
EC-35 — Requête Supabase timeout
Contexte : Une requête prend trop de temps (réseau lent).
Déclencheur : Pas de réponse après 10 secondes.
Comportement attendu :
→ Timeout à 10s (AbortController ou option Supabase)
→ Traitement comme une erreur réseau standard
→ toast "La requête a pris trop de temps. Réessaie."
→ L'écran reste dans son état loading/précédent
→ Un bouton "Réessayer" apparaît si l'écran est bloqué en loa
ding
10. Cas limites transversaux
EC-36 — Utilisatrice avec plusieurs appareils simultanés
Contexte : L'utilisatrice utilise Period. sur mobile et desktop en même temps.
Déclencheur : Modification sur un appareil pendant que l'autre est chargé.
Comportement attendu :
→ Pas de synchronisation temps réel dans le MVP (pas de Supab
ase Realtime)
→ Les données sont rechargées à chaque navigation entre écran
s
→ Si conflit (ex: programme activé sur les deux) : last-write
10 — Edge cases 18-wins (Supabase)
→ Pas de message de conflit affiché
EC-37 — Champs texte très longs (overflow)
Contexte : L'utilisatrice saisit un nom de programme ou d'exercice très long.
Déclencheur : Saisie de 200+ caractères dans un champ texte.
Comportement attendu :
Limites côté client :
 Nom de programme → max 100 caractères
 Nom de séance → max 100 caractères
 Nom d'exercice → max 100 caractères
 Description → max 500 caractères
 Notes exercice → max 500 caractères
→ Compteur de caractères affiché sous le champ à partir de 8
0% de la limite
→ Au-delà de la limite : saisie bloquée (maxLength HTML)
→ Affichage tronqué avec ellipsis dans les listes si nécessai
re (CSS text-overflow)
EC-38 — Route 404 (URL inexistante)
Contexte : L'utilisatrice tape une URL inexistante ou un lien cassé.
Déclencheur : Navigation vers une route non définie dans React Router.
Comportement attendu :
→ Catch-all route : <Navigate to="/home" replace />
→ Si non connectée : <Navigate to="/" replace />
→ Pas de page 404 dédiée dans le MVP
EC-39 — ID inexistant dans une route dynamique
10 — Edge cases 19→ redirect /login
→ toast "Ta session a expiré. Reconnecte-toi."
Ce qu'on ne fait pas :
✗ Pas de tentative de refresh silencieux dans le MVP
 (Supabase gère le refresh automatique via le client — si ça
échoue, on déconnecte)
EC-02 — Compte supprimé depuis un autre appareil
Contexte : L'utilisatrice a une session active sur appareil A. Elle supprime son
compte depuis appareil B.
Déclencheur : Requête Supabase depuis appareil A après la suppression.
Comportement attendu :
→ Même que EC-01 : erreur 401 → déconnexion → redirect /login
→ toast "Ta session a expiré. Reconnecte-toi."
EC-03 — Email non vérifié (si vérification activée)
Contexte : La vérification email est activée côté Supabase.
Déclencheur : L'utilisatrice tente de se connecter avant de vérifier son email.
Comportement attendu :
→ Message d'erreur : "Vérifie ton email avant de te connecte
r."
→ Lien "Renvoyer l'email de vérification"
→ supabase.auth.resend({ type: 'signup', email })
Note MVP : La vérification email est désactivée pour la démo — ce cas est
documenté
pour la V2.
10 — Edge cases 2Contexte : L'utilisatrice accède à /programs/abc-123 mais ce programme n'existe
pas.
Déclencheur : ID invalide ou appartenant à une autre utilisatrice (RLS bloque).
Comportement attendu :
→ La requête Supabase retourne null (RLS ou id inexistant)
→ Affichage de l'état erreur de l'écran :
 "Ce programme est introuvable." + bouton "Retour" → /progr
ams
→ Même comportement pour /history/:id, /templates/:id, /sessi
on/:id/preview
EC-40 — Concurrence : double tap sur un bouton d'action
Contexte : L'utilisatrice tape deux fois rapidement sur un CTA (submit, valider,
importer).
Déclencheur : Double tap avant que le loading state soit actif.
Comportement attendu :
→ Tous les boutons d'action qui déclenchent une requête Supab
ase sont désactivés
 (disabled = true) dès le premier tap et pendant toute la d
urée du loading
→ Pas de double INSERT / double UPDATE possible
→ Le bouton est réactivé une fois la requête terminée (succès
ou erreur)
Tableau récapitulatif
# Domaine Déclencheur Gravité Comportement
EC-01 Auth Session expirée Haute
Déconnexion +
redirect
10 — Edge cases 20# Domaine Déclencheur Gravité Comportement
EC-02 Auth
Compte
supprimé autre
appareil
Haute
Déconnexion +
redirect
EC-03 Auth Email non vérifié Moyenne
Message + renvoi
email
EC-04 Onboarding
Retour sur
/onboarding
complété
Faible Redirect /home
EC-05 Onboarding
Date règles
dans le futur
Faible
Blocage date
picker
EC-06 Onboarding
Date règles trop
ancienne
Faible
Blocage date
picker
EC-07 Onboarding
Abandon en
cours
Faible Reprise step 1
EC-08 Cycle
cycle_tracking =
false
Faible
UI dégradée
silencieuse
EC-09 Cycle
1 seul cycle
historique
Faible
Valeur déclarée
utilisée
EC-10 Cycle
Écart aberrant
entre cycles
Faible Filtrage silencieux
EC-11 Cycle
Déclaration
règles en
doublon
Faible
Toast + pas
d'INSERT
EC-12 Cycle cycleDay ≤ 0 Faible
Fallback
menstrual
EC-13 Programme
Aucun
programme actif
Faible État vide + CTA
EC-14 Programme
Programme
sans séances
Faible État vide + CTA
EC-15 Programme
Exercice
supprimé du
catalogue
Moyenne Affichage dégradé
EC-16 Programme
Activation
doublon
Faible
Toast + pas
d'UPDATE
10 — Edge cases 21#
DomaineDéclencheurGravitéComportement
EC17Programme
Suppression
avechistorique
Moyenne
Historique
conservé
EC18 Import
Nomexercice
ambigu
Faible
Premierrésultat+
badge
EC19 Import
JSONsans
séance
MoyenneErreur+CTA
EC20Séance
Refreshpendant
séance
Haute
Pertestate+
redirect
EC21Séance
Sériesvalidées
vides
Faible
Sauvegarde
acceptée
EC22Séance
Valeur
aberrante
(poids/reps)
Faible
Avertissementnon
bloquant
EC23Séance
Timerreposà
0000
Faible
Timerfigé+
haptic
EC24Séance
Aucunesérie
complétée
Faible
Récapvide
accepté
EC25Séance
Erreur
sauvegardefin
séance
HauteRetry+toast
EC26Récap
Séancecardio
pure
Faible
PerformanceLevel 'solid' EC-27 Récap Accès direct /recap Faible Chargement depuis base EC-28 Historique Données CSV legacy Faible Parser CSV silencieux EC-29 Calendrier Navigation loin dans le futur Faible Phases prédites OK EC-30 Calendrier Tap sans phase calculée Faible Bottom sheet dégradée EC-31 Profil Photo > 5 MB Faible Toast + pas d'upload
10 — Edge cases 22# Domaine Déclencheur Gravité Comportement
EC-32 Profil
Format photo
non supporté
Faible
Toast + pas
d'upload
EC-33 Profil
RPC delete_user
échoue
Haute
Toast + bouton
réactivé
EC-34 Réseau Perte connexion Haute
Banner +
désactivation
EC-35 Réseau Requête timeout Haute Toast + réessayer
EC-36 Transversal
Multi-appareils
simultanés
Faible Last-write-wins
EC-37 Transversal
Champs texte
trop longs
Faible
maxLength +
compteur
EC-38 Transversal Route 404 Faible Redirect /home
EC-39 Transversal ID inexistant Moyenne
État erreur +
retour
EC-40 Transversal
Double tap
bouton
Faible
Disabled pendant
loading
10 — Edge cases 232. Onboarding
EC-04 — Retour sur /onboarding après l'avoir complété
Contexte : L'utilisatrice a complété l'onboarding. Elle tape /onboarding dans l'URL.
Déclencheur : Navigation directe vers /onboarding.
Comportement attendu :
→ Guard requireOnboarding détecte cycle_tracking !== null
→ redirect /home
EC-05 — Date des dernières règles dans le futur
Contexte : Step 3 de l'onboarding — date picker.
Déclencheur : L'utilisatrice sélectionne une date future (bug UI possible).
Comportement attendu :
→ Le date picker bloque les dates futures (max = today)
→ Si la validation côté client échoue (edge case) :
 → Message d'erreur inline : "La date ne peut pas être dans
le futur."
→ Pas d'INSERT en base avec une date future
EC-06 — Date des dernières règles trop ancienne (> 60 jours)
Contexte : Step 3 — l'utilisatrice sélectionne une date très ancienne.
Déclencheur : Date > 60 jours avant aujourd'hui.
Comportement attendu :
→ Le date picker bloque les dates < today - 60j (min = today
- 60)
→ Raison : une date trop ancienne génère un cycleDay > 60, in
cohérent avec un cycle normal
10 — Edge cases 3→ Si contournée : INSERT accepté mais cycleDay sera très élev
é
 → cyclePredictionService normalise via modulo : cycleDay =
daysDiff % cycleLength
 → L'app fonctionne, la phase calculée peut être imprécise
EC-07 — Abandon en cours d'onboarding (fermeture app)
Contexte : L'utilisatrice ferme l'app au step 2 ou 3.
Déclencheur : Fermeture navigateur / app en cours d'onboarding.
Comportement attendu :
→ Les données du step courant ont été sauvegardées au fur et
à mesure dans profiles
→ Au retour : guard détecte cycle_tracking = null → redirect
/onboarding
→ L'onboarding redémarre au step 1
 (Pas de reprise au step exact — trop complexe pour le MVP)
→ Les données déjà saisies (prénom, niveau, objectif) sont pr
é-remplies depuis profiles
3. Calcul du cycle
EC-08 — Aucune donnée de cycle (cycle_tracking = false)
Contexte : L'utilisatrice a déclaré ne pas suivre son cycle.
Déclencheur : N'importe quel écran qui utilise la phase du cycle.
Comportement attendu :
Accueil :
→ Roue neutre (anneau gris, pas de couleur de phase)
→ Bandeau générique d'encouragement (pas de référence au cycl
e)
10 — Edge cases 4Séance à venir / active :
→ Bandeau générique : texte non lié au cycle
Calendrier :
→ Grille sans couleurs + banner "Active le suivi du cycle pou
r voir les phases."
Historique détail :
→ Pas de badge phase affiché
→ Section "Comparaison même phase" absente
EC-09 — 1 seule date de cycle saisie (< 2 entrées cycle_day = 1)
Contexte : L'utilisatrice n'a saisi qu'une seule date de début de règles (onboarding
incomplet ou première déclaration post-onboarding).
Déclencheur : cyclePredictionService.fetchCycleStats avec < 2 entrées cycle_day
= 1.
Comportement attendu :
→ Pas de calcul de moyenne possible (besoin d'au moins 2 poin
ts)
→ cyclePredictionService retourne null
→ L'app affiche l'état neutre sur tous les écrans (roue gris
e, pas de couleurs calendrier)
→ Message contextuel affiché :
 "Ajoute une deuxième date de règles pour voir ta prédictio
n"
→ Le bouton "Déclarer le début de mes règles" reste visible e
t accessible
→ Dès la 2ème déclaration : prédiction activée, UI mise à jou
r
10 — Edge cases 5EC-41 — Écart aberrant entre les deux dates saisies en
onboarding
Contexte : Step 3 de l'onboarding — les deux dates picker.
Déclencheur : Écart entre date 1 et date 2 < 15j ou > 45j.
Comportement attendu :
→ Avertissement inline affiché sous les pickers (orange, non
bloquant) :
 "L'écart entre ces dates semble inhabituel. Vérifie les da
tes."
→ Le CTA "Continuer" reste actif (pas de blocage)
→ Si l'utilisatrice valide quand même :
 → Les 2 lignes sont insérées en base
 → cyclePredictionService filtre cet écart aberrant
 → Pas de prédiction possible jusqu'à une 3ème déclaration
valide
 → L'app affiche l'état neutre + message EC-09
Contexte : L'utilisatrice a déclaré ses règles deux fois avec un écart anormal.
Déclencheur : Écart < 15 jours ou > 45 jours entre deux dates de début de règles.
Comportement attendu :
→ cyclePredictionService filtre cet écart du calcul de moyenn
e
→ Si tous les écarts sont aberrants (cas extrême) :
 → Fallback sur la valeur déclarée en onboarding
→ Pas de message d'erreur affiché
→ La donnée est conservée en base (pas de DELETE)
EC-11 — Déclaration de règles en doublon (même jour)
Contexte : L'utilisatrice tape deux fois sur "Mes règles ont commencé
aujourd'hui".
10 — Edge cases 6Déclencheur : Double tap ou confirmation rapide deux fois de suite.
Comportement attendu :
→ Vérification avant INSERT : existe-t-il déjà une ligne heal
th_data
 WHERE user_id = X AND date = today AND cycle_day = 1 ?
 ✓ → Pas de double INSERT — toast "Cycle déjà enregistré pou
r aujourd'hui."
 ✗ → INSERT normal
EC-12 — cycleDay calculé à 0 ou négatif
Contexte : Bug de calcul si lastPeriodStart est dans le futur (EC-05 passé en
base).
Déclencheur : daysDiff < 0 → cycleDay négatif ou nul.
Comportement attendu :
→ getCyclePhaseDisplay reçoit cycleDay <= 0
→ Fallback : retourne 'menstrual' (J1 par défaut)
→ Pas de crash — comportement dégradé silencieux
→ Log console.error('[cyclePredictionService] cycleDay invali
de', { cycleDay, date })
4. Programmes et séances
EC-13 — Aucun programme actif
Contexte : L'utilisatrice n'a pas de programme is_active = true.
Déclencheur : Chargement de /home ou /programs.
Comportement attendu :
Accueil :
→ Section "Prochaines séances" : état vide
10 — Edge cases 7→ "Pas encore de programme. [Créer un programme →]"
Liste programmes :
→ Pas de card "Programme actif"
→ Liste des autres programmes (en pause, terminés) si existan
ts
→ CTA "Importer" et "Créer" mis en avant
EC-14 — Programme actif sans séances
Contexte : Un programme is_active = true existe mais n'a aucune
program_sessions associée.
Déclencheur : Bug d'import Make ou suppression manuelle de séances (hors
MVP).
Comportement attendu :
Accueil :
→ Section "Prochaines séances" : état vide
→ "Ton programme n'a pas encore de séances. [Modifier le prog
ramme →]"
Détail programme :
→ Liste des séances vide
→ CTA "Ajouter une séance"
EC-15 — Séance avec exercices supprimés du catalogue
Contexte : Un exercice de session_exercises référence un exercise_catalog_id
qui n'existe plus (suppression côté Supabase admin).
Déclencheur : Chargement d'une séance à venir ou active.
Comportement attendu :
→ La jointure retourne null pour cet exercice
→ L'exercice est affiché avec le nom "Exercice inconnu"
10 — Edge cases 8→ Badge "⚠️ Exercice introuvable"
→ Les champs de saisie restent fonctionnels (input_type conse
rvé)
→ Log console.error('[sessionService] exercice introuvable',
{ exercise_catalog_id })
EC-16 — Tentative d'activer un programme déjà actif
Contexte : L'utilisatrice tape "Activer" sur le programme déjà is_active = true.
Déclencheur : Double tap ou race condition.
Comportement attendu :
→ Vérification avant UPDATE : is_active === true déjà ?
 ✓ → Pas d'UPDATE — toast "Ce programme est déjà actif."
 ✗ → UPDATE normal
EC-17 — Suppression d'un programme avec historique
Contexte : L'utilisatrice supprime un programme qui a des session_history
associées.
Déclencheur : Confirmation de suppression dans la modale.
Comportement attendu :
→ DELETE programs CASCADE :
 → DELETE program_sessions → DELETE session_exercises
→ session_history.session_id → null (NOT DELETE — historique
conservé)
→ exercise_history conservé (lié à session_history, pas à pro
grams)
→ Dans /history : les séances orphelines affichent leur nom t
el qu'il était
→ toast "Programme supprimé. L'historique de tes séances est
conservé."
10 — Edge cases 9