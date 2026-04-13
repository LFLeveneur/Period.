08 — Navigation
Source de vérité de la navigation. Ce fichier décrit l'intégralité du système de
navigation de Period. : routes, guards d'accès, redirections automatiques,
transitions,
et comportements spéciaux. Cursor lit ce fichier avant d'implémenter tout ce
qui touche
à React Router, aux guards, ou aux redirections.
Stack de navigation
React Router v7 — routing côté client
Layouts imbriqués — pour partager la bottom nav et les guards
Guards via loaders ou wrappers — protection des routes authentifiées
Arborescence des routes
/ → Landing (public)
/login → Connexion (public)
/signup → Inscription (public)
/reset-password → Reset mot de passe (public)
/onboarding → Onboarding (auth requis, onboard
ing non complété)
/onboarding/reveal → Révélation (auth requis, onboard
ing venant d'être complété)
[Layout protégé — auth + onboarding complété + bottom nav]
 /home → Accueil
 /calendar → Calendrier
 /history → Historique liste
 /history/:id → Historique détail
08 — Navigation 1Les routes suivantes NE sont PAS bookmarkables (état requis e
n mémoire) :
 /session/:id/active → redirect /session/:id/preview
Implémentation — structure des fichiers
src/
├── router/
│ ├── index.tsx ← Définition de toutes les routes
React Router
│ ├── guards.ts ← Fonctions requireAuth, requireOn
boarding, requireNoAuth
│ └── layouts/
│ ├── PublicLayout.tsx
│ ├── OnboardingLayout.tsx
│ ├── AppLayout.tsx ← Inclut bottom nav + header
standard
│ └── ImmersiveLayout.tsx ← Sans bottom nav
└── components/
 └── navigation/
 ├── BottomNav.tsx
 └── BackButton.tsx
Exemple de structure React Router v7
// src/router/index.tsx
export const router = createBrowserRouter([
 // Routes publiques
 {
 element: <PublicLayout />,
 children: [
08 — Navigation 10 { path: '/', element: <Landing /> },
 { path: '/login', element: <Login /> },
 { path: '/signup', element: <Signup /> },
 { path: '/reset-password', element: <ResetPassword />
},
 ],
 },
 // Onboarding
 {
 element: <OnboardingLayout />,
 loader: requireAuth,
 children: [
 { path: '/onboarding', element: <Onboarding />
},
 { path: '/onboarding/reveal', element: <OnboardingRevea
l /> },
 ],
 },
 // App — avec bottom nav
 {
 element: <AppLayout />,
 loader: requireAuth, // requireOnboarding appelé dans Ap
pLayout
 children: [
 { path: '/home', element: <Home /> },
 { path: '/calendar', element: <Calendar /> },
 { path: '/history', element: <HistoryList />
},
 { path: '/history/:id', element: <HistoryDetail /
> },
 { path: '/profile', element: <Profile /> },
 { path: '/programs', element: <ProgramList />
},
 { path: '/programs/new', element: <ProgramCreate /
08 — Navigation 11> },
 { path: '/programs/import', element: <ProgramImport /
> },
 { path: '/programs/:id', element: <ProgramDetail /
> },
 { path: '/programs/:id/edit', element: <ProgramEdit />
},
 ],
 },
 // App — sans bottom nav
 {
 element: <ImmersiveLayout />,
 loader: requireAuth,
 children: [
 { path: '/exercises', element: <ExerciseLibrar
y /> },
 { path: '/session/:id/preview',element: <SessionPreview
/> },
 { path: '/session/:id/active', element: <SessionActive
/> },
 { path: '/session/:id/recap', element: <SessionRecap /
> },
 ],
 },
 // 404
 { path: '*', element: <Navigate to="/home" replace /> },
]);
08 — Navigation 12 /profile → Profil
 /programs → Liste des programmes
 /programs/new → Création programme
 /programs/import → Import programme
 /programs/:id → Détail programme
 /programs/:id/edit → Modification programme
[Layout protégé — auth + onboarding complété — sans bottom na
v]
 /exercises → Bibliothèque d'exercices
 /session/:id/preview → Séance à venir
 /session/:id/active → Séance active (immersif)
 /session/:id/recap → Récap de séance
Layouts
PublicLayout
Utilisé pour : / , /login , /signup , /reset-password
- Pas de bottom nav
- Pas de header applicatif
- Pas de guard d'auth
- Si l'utilisatrice est déjà connectée + onboarding complété
→ redirect /home
- Si l'utilisatrice est déjà connectée + onboarding non compl
été → redirect /onboarding
OnboardingLayout
Utilisé pour : /onboarding , /onboarding/reveal
- Pas de bottom nav
- Header minimaliste (logo + barre de progression)
- Guard : auth requise → sinon redirect /login
08 — Navigation 2- Guard : onboarding non complété → sinon redirect /home
 (exception : /onboarding/reveal accessible si onboarding vi
ent d'être complété
 — détecté via un flag en session state, pas en base)
AppLayout
Utilisé pour toutes les routes protégées avec bottom nav.
- Bottom navigation bar (5 onglets)
- Header standard avec titre de la page + bouton retour si ap
plicable
- Guard auth → sinon redirect /login
- Guard onboarding complété → sinon redirect /onboarding
ImmersiveLayout
Utilisé pour : /session/:id/active , /onboarding , /onboarding/reveal
- Pas de bottom nav
- Header custom selon l'écran (voir 07-screens.md)
- Guard auth → sinon redirect /login
- Guard onboarding complété → sinon redirect /onboarding
 (sauf /onboarding et /onboarding/reveal qui ont leur propre
layout)
Guards d'accès
Guard requireAuth
// Vérifie qu'une session Supabase est active
// Appelé sur toutes les routes hors PublicLayout
const { data: { session } } = await supabase.auth.getSession
08 — Navigation 3();
if (!session) {
 redirect('/login');
}
Guard requireOnboarding
// Vérifie que l'onboarding est complété (cycle_tracking !==
null dans profiles)
// Appelé après requireAuth sur toutes les routes protégées h
ors /onboarding
const { data: profile } = await supabase
 .from('profiles')
 .select('cycle_tracking')
 .eq('id', session.user.id)
 .maybeSingle();
if (!profile || profile.cycle_tracking === null) {
 redirect('/onboarding');
}
Guard requireNoAuth (routes publiques)
// Redirige les utilisatrices déjà connectées hors des pages
auth
const { data: { session } } = await supabase.auth.getSession
();
if (session) {
 const { data: profile } = await supabase
 .from('profiles')
08 — Navigation 4 .select('cycle_tracking')
 .eq('id', session.user.id)
 .maybeSingle();
 if (profile?.cycle_tracking !== null) {
 redirect('/home');
 } else {
 redirect('/onboarding');
 }
}
Guard requireActiveSession (séance active)
// Vérifie qu'une séance active est bien en cours en mémoire
// Empêche l'accès direct à /session/:id/active sans passer p
ar /preview
// Implémenté via un store ou context React (pas via loader S
upabase)
// La présence d'un activeSession dans le store est la condit
ion
if (!activeSessionStore.isActive || activeSessionStore.sessio
nId !== params.id) {
 redirect(`/session/${params.id}/preview`);
}
Table des redirections automatiques
Condition Destination
Non connectée → route protégée /login
Connectée + onboarding non complété → route
protégée hors /onboarding
/onboarding
08 — Navigation 5Condition Destination
Connectée + onboarding complété → /login ou
/signup ou /
/home
Connectée + onboarding non complété → /login ou
/signup ou /
/onboarding
Onboarding complété → /onboarding /home
Accès /session/:id/active sans séance active en
mémoire
/session/:id/preview
Session Supabase expirée (erreur 401) /login + toast "Session expirée"
Route inexistante (404)
/home si connectée · / si non
connectée
Bottom navigation bar
Onglets
Ordre Label Icône Route
1 Accueil 🏠 /home
2 Calendrier 📅 /calendar
3 Programmes 💪 /programs
4 Historique 📖 /history
5 Profil 👤 /profile
Règles de la bottom nav
✅ L'onglet actif est mis en surbrillance (couleur selon desi
gn tokens).
✅ Le tap sur l'onglet actif scroll vers le haut de la page
(behavior: 'smooth').
✅ La bottom nav est fixée en bas (position: fixed, z-index é
levé).
Masquée sur :
08 — Navigation 6 - /onboarding et /onboarding/reveal
 - /session/:id/active (mode immersif)
 - /, /login, /signup, /reset-password
Transitions entre écrans
Règle générale
Navigation standard (tap bottom nav, tap lien, redirect) :
→ Transition fade (opacity 0 → 1, 150ms ease-in-out)
Navigation "avant" (tap CTA, drill-down) :
→ Slide depuis la droite (translateX 100% → 0, 250ms ease-ou
t)
Navigation "arrière" (bouton ←, swipe) :
→ Slide vers la droite (translateX 0 → 100%, 200ms ease-in)
Modales et bottom sheets :
→ Slide depuis le bas (translateY 100% → 0, 300ms ease-out)
→ Fermeture : slide vers le bas (translateY 0 → 100%, 200ms e
ase-in)
Transitions spécifiques
Navigation Transition
/ → /signup ou /login Fade
Login/Signup → /onboarding Fade (reset de stack)
Onboarding steps 1→2→3→4 Slide droite
Onboarding step N → N1 (retour) Slide gauche
/onboarding → /onboarding/reveal Fade + scale léger (moment révélation)
/onboarding/reveal → /home Fade (reset de stack)
Bottom nav → Bottom nav Fade (pas de slide)
08 — Navigation 7Navigation Transition
/programs → /programs/:id Slide droite
/session/:id/preview → /session/:id/active Fade plein écran (transition immersive)
/session/:id/active → /session/:id/recap Fade
/session/:id/recap → /home Fade (reset de stack)
Gestion de la pile de navigation (stack)
Écrans qui reset la stack
Ces navigations effacent l'historique — le bouton retour du navigateur ne revient
pas à l'écran précédent.
/login → /home (après connexion réussie)
/signup → /onboarding (après inscription réussie)
/onboarding/reveal → /home (après révélation)
/session/:id/recap → /home (après validation du récap)
delete_account → /login (après suppression de compte)
signOut → /login (après déconnexion)
Écrans qui conservent la stack
/programs → /programs/:id → /programs/:id/edit (drill-down
standard)
/history → /history/:id (drill-down
standard)
/session/:id/preview → /session/:id/active (conservée
— abandon possible)
Comportements spéciaux
Confirmation avant quitter
08 — Navigation 8Ces écrans déclenchent une modale de confirmation si l'utilisatrice tente de
quitter
via le bouton retour ou la bottom nav avec des données non sauvegardées.
/programs/new → "Abandonner la création ?"
/programs/import → "Abandonner l'import ?"
/programs/:id/edit → "Annuler les modifications ?"
/session/:id/active → "Abandonner la séance ?" (voir S-16)
Implémentation :
// useBeforeUnload hook — déclenché sur popstate et beforeunl
oad
// La modale affiche 2 CTA : "Rester" et "Quitter sans sauveg
arder"
Scroll restoration
✅ Les pages liste (/programs, /history, /exercises) mémorise
nt
 la position de scroll au retour depuis un détail.
 Implémenté via scrollRestoration dans React Router ou via
un store.
✅ Les pages drill-down (/programs/:id, /history/:id) démarre
nt en haut (scrollTop = 0).
Deep links
Les routes suivantes sont directement accessibles par URL (bo
okmarkables) :
 /history/:id
 /programs/:id
 /calendar
08 — Navigation 9