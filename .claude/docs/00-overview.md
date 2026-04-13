00 — Vue d'ensemble du projet
Period.
Source de vérité produit. Ce fichier définit pourquoi Period. existe, pour qui, ce
qu'elle
fait exactement, et ce qu'elle ne fera jamais. Tout le reste de la documentation
découle de
ce fichier. Si une décision produit contredit ce document, c'est ce document qui
fait foi.
1. Le problème
Ce que vivent les femmes qui font de la muscu
Les femmes qui pratiquent le renforcement musculaire vivent une contradiction
silencieuse et
récurrente : certaines semaines, tout va bien — les charges montent, l'énergie
est là, la
motivation est forte. D'autres semaines, tout est lourd, la récupération est
mauvaise, et elles
se demandent ce qui cloche.
Elles ne savent pas que cette variation est normale, documentée, et prévisible.
Elles
pensent que c'est leur faute — manque de sommeil, manque de volonté, mauvais
programme.
Résultat : elles forcent quand il faudrait moduler (risque de blessure, épuisement,
découragement), ou elles lèvent le pied quand elles pourraient pousser
(stagnation,
frustration).
Les trois causes du problème
00 — Vue d'ensemble du projet Period. 11. Les programmes sportifs ignorent le cycle hormonal
 └── Construits comme si le corps féminin était "stable" ch
aque semaine.
 Il ne l'est pas. Les hormones varient de manière cycli
que et impactent
 directement la force, la récupération, la tolérance à
l'effort et la motivation.
2. Les apps de cycle ne parlent pas de performance sportive
 └── Flo, Clue, Apple Santé → prédiction des règles, symptô
mes, contraception.
 Utiles. Mais elles ne disent pas : "aujourd'hui tu es
en ovulation,
 c'est le bon moment pour aller chercher un PR."
3. Il manque un pont entre "cycle" et "entraînement"
 └── Soit tu as du sport sans cycle (les programmes classiq
ues).
 Soit tu as du cycle sans sport (les apps de tracking).
 Personne ne relie les deux de manière simple et action
nable.
 └── Beaucoup ne connaissent pas bien leur corps ni quoi fa
ire
 concrètement pour l'aider (moduler, récupérer, pousser
quand c'est le moment)
Formulation synthèse du problème (version pitch)
Les femmes qui font du renforcement musculaire rencontrent des difficultés
à progresser efficacement malgré leurs efforts, car les variations liées à leur
cycle menstruel ne sont ni comprises ni prises en compte dans leur
entraînement, ce qui entraîne une progression irrégulière, des doutes sur
leurs décisions et un risque accru d'abandon.
00 — Vue d'ensemble du projet Period. 22. La solution — ce qu'est Period.
Period. est une application web de renforcement musculaire qui adapte les
recommandations
d'entraînement et de récupération au cycle hormonal de l'utilisatrice.
Ce que Period. fait concrètement
Elle demande la date des dernières règles et la durée du cycle
Elle calcule en temps réel la phase du cycle (menstruation, folliculaire,
ovulation, lutéale
précoce, lutéale tardive)
Elle affiche des recommandations contextuelles pour chaque séance en
fonction de cette phase
Elle permet d'importer ou de créer un programme de muscu
Elle guide l'utilisatrice pendant la séance (exercices, séries, charges, RIR)
Elle enregistre les performances et les compare avec les séances précédentes
et avec la même
phase du cycle précédent
Elle affiche un récap de fin de séance avec les victoires, le ressenti, et la
comparaison
énergie vs performance
La promesse — deux niveaux
Tagline (marque / émotion)
ton cycle, ta force. Period. 🖤
Promesse produit (fonctionnelle / explicite)
Des recommandations sur tes séances basées sur les phases de ton cycle,
pour une progression logique et plus régulière.
3. Le persona principal — Léa
00 — Vue d'ensemble du projet Period. 3Léa est la seule personne pour qui Period. est conçue. Chaque décision produit,
chaque texte, chaque écran doit être validé par la question : "est-ce que Léa
comprend ça immédiatement ? Est-ce que ça lui est utile ?"
Profil
Attribut Détail
Prénom fictif Mathilde
Âge 23 à 35 ans
Niveau muscu Intermédiaire (sortie des newbie gains)
Fréquence 3 à 4 séances par semaine
Style d'entraînement Full body ou upper/lower, accent bas du corps
Connaissance des
mouvements
Squat, hip thrust, RDL, tirage, développé — elle connaît, mais
manque de confiance sur la programmation
Suivi du cycle actuel
Flo / Clue / Apple Santé — pour prédire les règles et les
symptômes, pas pour le sport
Ce qu'elle vit au quotidien
Semaine A (phase favorable) Semaine B (phase défavor
able)
───────────────────────────── ────────────────────────
─────
✓ Énergie haute ✗ Tout est lourd
✓ Charges qui montent ✗ Récupération mauvaise
✓ Motivation forte ✗ Découragement
✓ Elle se sent capable ✗ Elle pense que "quelqu
e chose cloche"
 ✗ Elle force quand il fa
udrait moduler
 → risque de blessure
ou abandon
Ce qu'elle ne sait pas encore
00 — Vue d'ensemble du projet Period. 4Elle ne sait pas que la variation de ses performances est normale, cyclique, et
prévisible.
Elle ne fait pas le lien entre sa phase de cycle et ses capacités physiques du jour.
Elle en a entendu parlé sur Tiktok mais elle ne comprends pas bien encore
concrètement.
Period. lui donne ce lien — avec un cadre clair, simple, et actionnable.
Variante secondaire (à garder en tête lors des décisions produit)
Certaines utilisatrices ne suivent pas du tout leur cycle (irrégularité, contraception
hormonale, pas l'habitude). Period. doit pouvoir fonctionner dans ce cas :
démarrage
"light" basé sur l'estimation + le ressenti, avec un apprentissage progressif au fil
du temps.
Cette variante n'est pas le persona principal du MVP mais elle ne doit pas être
bloquée
par l'app.
4. Ce que Period. ne fait PAS — les limites assumées
Ces limites ne sont pas des lacunes. Ce sont des choix produit délibérés qui
définissent
ce qu'est Period. au même titre que ce qu'elle fait.
Ce que Period. ne fait pas Pourquoi c'est un choix
Pas de nutrition / macros
/ perte de poids
Period. n'est pas une app diet. L'objectif est la performance, la
progression, la régularité — pas le physique comme fin en soi.
Pas de coaching live ou
humain 11
Pas de chat avec un coach, pas de suivi individualisé humain.
Les recommandations sont automatisées et contextuelles.
Pas de communauté /
réseau social / feed
Pas de posts, pas de likes, pas de comparaison sociale. On
évite la pression et la fitspo.
Pas de diagnostic
médical
Period. n'est pas un dispositif de santé. Pas de diagnostic
SOPK, endométriose ou autre. Pas de conseils médicaux.
Pas de "programme
universel parfait"
Period. aide à prendre de meilleures décisions. Elle ne
remplace pas la cohérence long terme (sommeil, technique,
charge globale).
00 — Vue d'ensemble du projet Period. 5Ce que Period. ne fait pas Pourquoi c'est un choix
Pas de Coach IA (hors
MVP
Le coaching conversationnel par IA est exclu du MVP. Il pourra
être ajouté en V2.
5. Positionnement concurrentiel
Carte du marché
 CYCLE-FIRST
 │
 Flo │ Clue
 (symptômes│ prédiction)
 │
SPORT ───────────────────────┼─────────────────────── CYCLE
GÉNÉRALISTE │ SPÉCIFIQUE
 │
 Nike Training Club │ FitrWoman
 Garmin / Strava │ Wild AI
 │
 ┌────────┴────────┐
 │ Period. │
 │ MUSCU + CYCLE │
 └─────────────────┘
 │
 PERFORMANCE
Analyse des références
Concurrent /
Référence
Ce qu'il fait bien Ce qui manque
Flo / Clue
UX fluide, adoption massive,
données cycle précises
Aucune recommandation sportive
actionnable
Apple Santé /
Garmin
Intégré, simple, données
passives
Pas orienté coaching, pas cyclecentric
00 — Vue d'ensemble du projet Period. 6Concurrent /
Référence
Ce qu'il fait bien Ce qui manque
Whoop / Oura
Récupération, readiness, écoute
du corps
Wearable requis, pas muscu-first,
pas cycle-first
FitrWoman
Contenu cycle x entraînement,
bonne intention
Pas de suivi de séances, pas de
programme structuré
Wild AI
Entraînement adapté au cycle
(endurance/perf)
Peu orienté muscu
spécifiquement
Différenciation Period.
Period. est la seule app qui combine suivi de programme de muscu structuré,
tracking de performances par série, et recommandations contextuelles
basées sur
la phase du cycle — avec un ton simple, direct, et non-médical.
6. Contexte du projet
Period. est un projet académique HETIC avec une ambition et une exécution
startup.
La documentation, les choix produit, et le code sont traités comme un vrai
produit
Les hypothèses et les limites du cadre scolaire sont documentées séparément
quand nécessaire
L'objectif immédiat est de produire un MVP fonctionnel et démontrable
L'objectif secondaire est de valider les hypothèses produit avec de vrais
utilisateurs
7. Périmètre du MVP
Le MVP est ce qu'on construit et ce qu'on présente. Tout ce qui n'est pas dans
cette
liste n'existe pas pendant la phase MVP. Pas de "peut-être", pas de "on verra".
00 — Vue d'ensemble du projet Period. 7Dans le MVP ✅
Landing page
Onboarding (saisie du cycle + jours d'entraînement préférés)
Écran de révélation post-onboarding (aperçu du calendrier avec phases
colorées)
Accueil avec roue du cycle et recommandation du jour
Import de programme via Make (fichier ou texte → JSON → vérification →
validation)
Création manuelle de programme
Bibliothèque d'exercices
Templates de séances
Détail d'un programme
Séance à venir (preview avant de commencer)
Séance active (pendant l'entraînement)
Récap de fin de séance
Historique des séances (liste + détail)
Calendrier (vue mensuelle avec phases colorées)
Profil utilisateur
Hors MVP ❌
Coach IA (conversation, feedback automatisé, analyse post-séance par IA)
8. Définition du succès du MVP
Le MVP est un succès si, à la fin de la démonstration :
. Une personne qui ne connaît pas Period. comprend immédiatement le
problème résolu
00 — Vue d'ensemble du projet Period. 8. Le parcours de démonstration se déroule sans bug de la landing page au
récap de séance
. La connexion entre phase du cycle et recommandation d'entraînement est
perçue comme utile
et crédible
. L'import de programme via Make fonctionne et l'utilisatrice peut vérifier et
valider
. Les données de performance (charges, RIR, comparaison semaine précédente
/ même phase)
sont affichées correctement
00 — Vue d'ensemble du projet Period. 9