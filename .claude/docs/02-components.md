02 — Composants UI
Source de vérité des composants. Ce fichier documente chaque composant
réutilisable
de l'application : son rôle, ses props, ses variantes, ses états, ses règles
d'usage, et
les erreurs à ne pas commettre. Aucun composant ne doit être créé sans être
documenté ici.
Aucune valeur visuelle ne doit être écrite directement — tout référence 01-
design-tokens.md .
Organisation des composants
src/components/
├── layout/ ← Composants de mise en page (struct
ure de page)
│ ├── AppShell.tsx ← Wrapper principal de toutes les pa
ges connectées
│ ├── BottomNav.tsx ← Barre de navigation fixe en bas
│ └── PageHeader.tsx ← En-tête fixe en haut de chaque pag
e
└── ui/ ← Composants d'interface réutilisabl
es
 ├── PrimaryButton.tsx
 ├── DangerButton.tsx
 ├── InputField.tsx
 ├── Toggle.tsx
 ├── ChipSelector.tsx
 ├── ProgressBar.tsx
 ├── CyclePhaseBadge.tsx
 ├── Card.tsx
 ├── Modal.tsx
 ├── BottomSheet.tsx
02 — Composants UI 1Exemple :
// Champ email standard
<InputField
 id="email"
 label="ton adresse mail"
 type="email"
 placeholder="lea@example.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 error={errors.email}
/>
// Champ mot de passe avec toggle
<InputField
 id="password"
 label="ton mot de passe"
 type="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
/>
Toggle
Fichier : src/components/ui/Toggle.tsx
Rôle : Interrupteur ON/OFF style iOS. Utilisé dans les paramètres et les
préférences.
Props :
Prop Type Obligatoire Défaut Description
checked boolean ✅ — État du toggle
onChange
(checked:
boolean) =>
void
✅ —
Callback au
changement
02 — Composants UI 10Prop Type Obligatoire Défaut Description
disabled boolean ❌ false
Désactive le
toggle
États visuels :
ON → fond: #C584EE thumb: blanc à droite (translate-x-6)
OFF → fond: rgba(47, 0, 87, 0.2) thumb: blanc à gauche (tran
slate-x-1)
Disabled → opacity: 50% cursor: not-allowed
Dimensions : h-7 w-12 (2848px) — thumb h-5 w-5 (2020px)
Accessibilité :
role="switch" + aria-checked={checked}
Focus visible : ring rgba(197, 132, 238, 0.5)
Exemple :
<div className="flex items-center justify-between">
 <span>Suivi du cycle</span>
 <Toggle
 checked={cycleTracking}
 onChange={(v) => setCycleTracking(v)}
 />
</div>
ChipSelector
Fichier : src/components/ui/ChipSelector.tsx
Rôle : Sélecteur de chips horizontaux avec scroll si les options débordent.
Utilisé pour filtrer des listes (trier par phase, par type d'exercice, etc.).
Props :
02 — Composants UI 11Prop Type Obligatoire Défaut Description
options
Array<{ value:
T, label: string
}>
✅ — Liste des options
value
T | null |
undefined ✅ —
Option
actuellement
sélectionnée
onChange
(value: T) =>
void ✅ —
Callback au
changement
Generic : T extends string — le type de la valeur est inféré depuis les options.
États visuels :
Sélectionné → bg: #2F0057 text: #F9EDE1
Non sélectionné → bg: white bordure: rgba(47, 0, 87, 0.2) t
ext: #2F0057
Comportement de scroll : overflow-x-auto avec scrollbar-hide — les chips
débordent horizontalement et sont scrollables au doigt sans barre visible.
Exemple :
<ChipSelector
 options={[
 { value: 'all', label: 'Toutes les phases' },
 { value: 'menstrual', label: '🔴 Menstruation' },
 { value: 'follicular', label: '🌱 Folliculaire' },
 { value: 'ovulation', label: '⚡ Ovulation' },
 { value: 'luteal', label: '🌙 Lutéale' },
 ]}
 value={selectedPhase}
 onChange={setSelectedPhase}
/>
ProgressBar
02 — Composants UI 12Fichier : src/components/ui/ProgressBar.tsx
Rôle : Barre de progression linéaire. Utilisée pour la complétion d'une séance,
l'avancement dans l'onboarding, etc.
Props :
Prop Type Obligatoire Défaut Description
value number ✅ —
Valeur entre 0 et
100
color string ❌ #C584EE
Couleur de
remplissage
height number ❌ 6 Hauteur en pixels
className string ❌ ''
Classes CSS
supplémentaires
Comportement :
La valeur est clampée entre 0 et 100 automatiquement
La transition de largeur est animée en 300ms ease-out
role="progressbar" avec aria-valuenow , aria-valuemin , aria-valuemax
Exemple :
// Barre de complétion d'une séance (4 séries sur 10 complété
es)
<ProgressBar value={40} color="var(--color-primary)" height=
{6} />
// Barre de phase ovulation (bleu)
<ProgressBar value={75} color="var(--color-ovulation)" height
={4} />
CyclePhaseBadge
Fichier : src/components/ui/CyclePhaseBadge.tsx
02 — Composants UI 13Rôle : Badge coloré qui indique la phase du cycle. Utilise les couleurs de phases
définies dans 01-design-tokens.md .
Props :
Prop Type Obligatoire Défaut Description
phase CyclePhase ✅ —
Phase du cycle à
afficher
compact boolean ❌ false
Si true, affiche
uniquement l'emoji
sans le label texte
Type CyclePhase :
type CyclePhase =
 | 'menstrual'
 | 'follicular'
 | 'ovulation'
 | 'luteal_early'
 | 'luteal_late';
Correspondance visuelle :
Phase Emoji Fond Texte
menstrual 🔴 #ECA6A6 #DE3030
follicular 🌱 #F2ECAD #8A7A00
ovulation ⚡ #A6ABE4 #303DCA
luteal_early 🌙 #A6E4CB #30CA8C
luteal_late 🌑 #A6E4CB #30CA8C
Exemple :
// Badge complet
<CyclePhaseBadge phase="follicular" />
// → 🌱 Phase folliculaire
// Badge compact (juste l'emoji)
02 — Composants UI 14<CyclePhaseBadge phase="ovulation" compact />
// → ⚡
Modal
Fichier : src/components/ui/Modal.tsx
Rôle : Boîte de dialogue modale avec overlay, titre, contenu, et deux boutons
(confirmer / annuler). Utilisée pour les actions critiques qui nécessitent une
confirmation.
Props :
Prop Type Obligatoire Défaut Description
isOpen boolean ✅ —
Contrôle
l'affichage
title string ✅ —
Titre de la
modal
children ReactNode ✅ —
Contenu
descriptif
onConfirm () => void ✅ —
Action au clic
sur confirmer
onCancel () => void ✅ —
Action au clic
sur annuler ou
overlay
confirmLabel string ❌ 'Confirmer'
Label du bouton
de confirmation
cancelLabel string ❌ 'Annuler'
Label du bouton
d'annulation
isDanger boolean ❌ false
Si true, bouton
confirmer en
rouge
isConfirmLoading boolean ❌ false
Spinner sur le
bouton
confirmer
Comportements :
02 — Composants UI 15Clic sur l'overlay → appelle onCancel
Touche Escape → appelle onCancel
Clic sur le contenu de la modal → ne propage pas (stopPropagation)
Si isOpen = false → le composant retourne null (pas de DOM)
Structure visuelle :
┌─────────────────────────────────┐ ← overlay: backdrop-blur
+ rgba(47,0,87,0.5)
│ │
│ ┌───────────────────────────┐ │
│ │ Titre │ │ ← rounded-2xl, bg-white,
max-w-md
│ │───────────────────────── │ │
│ │ Contenu descriptif │ │
│ │ │ │
│ │ [Annuler] [Confirmer] │ │
│ └───────────────────────────┘ │
│ │
└─────────────────────────────────┘
Exemple :
// Confirmation de suppression
<Modal
 isOpen={showDeleteModal}
 title="Supprimer mon compte"
 onConfirm={handleDelete}
 onCancel={() => setShowDeleteModal(false)}
 confirmLabel="supprimer définitivement"
 cancelLabel="annuler"
 isDanger
 isConfirmLoading={isDeleting}
>
 tu es sur le point de supprimer ton compte et toutes tes do
02 — Composants UI 16nnées.
 cette action est irréversible.
</Modal>
BottomSheet
Fichier : src/components/ui/BottomSheet.tsx
Rôle : Panneau qui remonte depuis le bas de l'écran (style mobile natif). Utilisé
pour les menus contextuels, les formulaires secondaires, les options d'un
élément.
Props :
Prop Type Obligatoire Défaut Description
isOpen boolean ✅ —
Contrôle
l'affichage
title string ✅ —
Titre affiché dans
le header du sheet
children ReactNode ✅ — Contenu du sheet
onClose () => void ✅ —
Callback de
fermeture
Comportements :
Clic sur l'overlay → appelle onClose
Touche Escape → appelle onClose
Ouverture : translateY(0) — Fermeture : translateY(100%) — transition 300ms
ease-out
Quand ouvert : document.body.style.overflow = 'hidden' (bloque le scroll derrière)
Structure visuelle :
┌─────────────────────────────────┐ ← overlay: bg-black/40
│ │
│ │
│ ┌───────────────────────────┐ │
02 — Composants UI 17│ │ ▬▬▬ (handle bar) │ │ ← rounded-t-3xl, bg-whit
e
│ │ Titre [✕] │ │
│ │─────────────────────── │ │
│ │ Contenu │ │
│ │ ... │ │
│ └───────────────────────────┘ │
└─────────────────────────────────┘
Différence avec Modal :
Modal → dialogue centré, pour les confirmations critiques
BottomSheet → panneau depuis le bas, pour les menus et formulaires
secondaires
Toast
Fichier : src/components/ui/Toast.tsx
Rôle : Notification temporaire non bloquante. Apparaît en bas de l'écran audessus
de la BottomNav, disparaît automatiquement après la durée définie.
Props :
Prop Type Obligatoire Défaut Description
message string ✅ —
Texte de la
notification
duration number ❌ 2000
Durée d'affichage
en millisecondes
visible boolean ✅ —
Déclenche
l'affichage du toast
Hook associé — useToast :
// Usage recommandé — ne pas gérer l'état visible manuellemen
t
const { visible, showToast, duration } = useToast(2000);
02 — Composants UI 18// Déclencher le toast
showToast();
// Rendu
<Toast message="séance enregistrée 🖤" visible={visible} dura
tion={duration} />
Comportements :
visible passe à true → le toast apparaît (fade-in + translateY)
Après duration ms → le toast disparaît (fade-out + translateY)
Si showToast() est appelé en rafale → le timer est réinitialisé
aria-live="polite" pour l'accessibilité screen reader
Position : fixed bottom-20 (80px du bas) — au-dessus de la BottomNav (64px)
Style : Pill arrondie, fond #2F0057 , texte #F9EDE1
SettingsSection et SettingsRow
Fichiers : src/components/ui/SettingsSection.tsx et src/components/ui/SettingsRow.tsx
Rôle : Composants pour construire des listes de paramètres style iOS. Utilisés
dans
la page Profil et les pages de paramètres.
SettingsSection :
interface Props {
 title: string; // Titre de la section (ex: "Mon cycl
e")
 children: ReactNode;
}
SettingsRow :
02 — Composants UI 19 ├── Toast.tsx
 ├── Stepper.tsx
 ├── SettingsRow.tsx
 ├── SettingsSection.tsx
 ├── DragHandle.tsx
 └── AvatarUpload.tsx
Règles générales applicables à tous les composants
✅ Chaque composant a une interface TypeScript explicite avec
JSDoc sur chaque prop
✅ Chaque composant a un commentaire JSDoc au-dessus de la fo
nction qui explique son rôle
✅ Les commentaires sont écrits en français
✅ Les couleurs viennent des variables CSS de 01-design-token
s.md — jamais hardcodées
✅ Chaque composant gère son état disabled / loading quand
c'est pertinent
✅ Les composants interactifs ont un état active:scale-95 pou
r le feedback tactile
✅ Les transitions durent 200ms avec ease-in-out (--durationnormal)
✅ Les composants accessibles utilisent les attributs ARIA ap
propriés
❌ Jamais de logique métier dans un composant UI — seulement
de la présentation
❌ Jamais d'appels API ou Supabase dans un composant UI
❌ Jamais de navigation (useNavigate) dans un composant UI sa
uf exception documentée
LAYOUT — Composants de mise en page
AppShell
02 — Composants UI 2interface Props {
 label: string; // Label à gauche
 value?: string; // Valeur affichée à droit
e
 onPress?: () => void; // Rend la ligne cliquable
avec chevron droit
 right?: ReactNode; // Élément custom à droite
(ex: Toggle)
 danger?: boolean; // Colore le label en roug
e (actions destructives)
}
Structure visuelle :
┌─────────────────────────────────────┐
│ MON CYCLE │ ← SettingsSection ti
tle (gris, uppercase)
│─────────────────────────────────────│
│ Premier jour des règles 3 avril │ ← SettingsRow value
│─────────────────────────────────────│
│ Durée du cycle 28 j │ ← SettingsRow value
│─────────────────────────────────────│
│ Durée des règles 5 j │ ← SettingsRow value
└─────────────────────────────────────┘
│─────────────────────────────────────│
│ MON COMPTE │ ← SettingsSection su
ivante
│─────────────────────────────────────│
│ Se déconnecter > │ ← SettingsRow onPres
s + chevron
│─────────────────────────────────────│
│ Supprimer mon compte │ ← SettingsRow danger
=true
└─────────────────────────────────────┘
02 — Composants UI 20Stepper
Fichier : src/components/ui/Stepper.tsx
Rôle : Indicateur de progression par étapes. Utilisé dans l'onboarding pour
montrer
à quelle étape l'utilisatrice se trouve.
Props :
interface Props {
 total: number; // Nombre total d'étapes
 current: number; // Étape actuelle (1-indexed)
}
Rendu visuel :
● ● ○ ○ ← étape 2 sur 4
Étape complétée ou actuelle → cercle plein #C584EE
Étape future → cercle vide rgba(47, 0, 87, 0.2)
DragHandle
Fichier : src/components/ui/DragHandle.tsx
Rôle : Poignée visuelle pour indiquer qu'un élément est déplaçable (drag and
drop).
Utilisée dans l'éditeur de séances pour réordonner les exercices.
Props :
interface Props {
 listeners?: DraggableSyntheticListeners; // Listeners de @
dnd-kit/sortable
 attributes?: DraggableAttributes; // Attributs ARIA
de @dnd-kit/sortable
}
02 — Composants UI 21Rendu : 3 lignes horizontales (≡), couleur rgba(47, 0, 87, 0.3) , curseur grab
AvatarUpload
Fichier : src/components/ui/AvatarUpload.tsx
Rôle : Zone d'upload d'avatar avec prévisualisation. Utilisée dans la page Profil.
Props :
interface Props {
 currentUrl?: string; // URL de l'avata
r actuel
 onUpload: (file: File) => Promise<void>; // Callback d'upl
oad
 isUploading?: boolean; // État de charge
ment
}
Comportement :
Affiche l'avatar actuel ou un placeholder (initiales ou icône)
Clic → ouvre le sélecteur de fichier (input[type="file"] caché)
Upload → appelle onUpload(file) , affiche un spinner pendant isUploading
Formats acceptés : image/jpeg , image/png , image/webp
Diagramme de dépendances des composants
graph TD
 AppShell --> PageHeader
 AppShell --> BottomNav
 AppShell --> children["children (pages)"]
 Modal --> PrimaryButton
 BottomSheet --> children2["children (contenu)"]
02 — Composants UI 22 SettingsSection --> SettingsRow
 SettingsRow --> Toggle
 CyclePhaseBadge --> types["types/workout.ts (CyclePhas
e)"]
 Toast --> useToast["useToast (hook)"]
 InputField --> states["États: normal, focus, error, passw
ord"]
 PrimaryButton --> states2["États: normal, hover, active,
loading, disabled"]
AppShell
PageHeader BottomNav children (pages)
Modal
PrimaryButton
BottomSheet
children (contenu)
SettingsSection
SettingsRow
Toggle
CyclePhaseBadge
types/workout.ts (CyclePhase)
Toast
useToast (hook)
InputField
États: normal, focus, error, password
États: normal, hover, active, loading, disabled
Checklist avant de créer un nouveau composant
Avant d'ajouter un composant dans src/components/ui/ :
□ Le composant est-il vraiment réutilisable ? (utilisé à 2+ e
ndroits)
□ Les props sont-elles typées avec une interface TypeScript e
xplicite ?
□ Chaque prop a-t-elle un commentaire JSDoc ?
□ Les couleurs viennent-elles des variables CSS de 01-designtokens.md ?
□ L'état disabled est-il géré si le composant est interactif
?
□ Le feedback tactile (active:scale-95) est-il présent ?
□ Le composant est-il accessible (aria, role, focus visible)
?
□ Le composant est-il documenté dans ce fichier ?
02 — Composants UI 23Fichier : src/components/layout/AppShell.tsx
Rôle : Wrapper principal de toutes les pages de l'app qui nécessitent la navigation.
Il empile verticalement le PageHeader en haut, le contenu scrollable au centre, et la
BottomNav en bas. Il est centré sur 448px maximum pour simuler un écran mobile
même
sur desktop.
Quand l'utiliser : Sur toutes les pages accessibles depuis la navigation principale
(HomePage, CalendarPage, WorkoutsPage, HistoryPage, ProfilePage, etc.).
Quand NE PAS l'utiliser : Sur les pages sans navigation (LandingPage, pages
d'onboarding, pages d'auth, séance active plein écran).
Props :
Prop Type Obligatoire Défaut Description
title string ✅ —
Titre affiché dans
le PageHeader
backHref string ❌ undefined
Route de retour —
affiche un chevron
gauche
headerRight ReactNode ❌ undefined
Élément affiché à
droite du header
(ex: bouton action)
children ReactNode ✅ —
Contenu principal
de la page
Structure visuelle :
┌─────────────────────────────────┐
│ PageHeader (fixe, h-14) │ ← z-index: --z-sticky
├─────────────────────────────────┤
│ │
│ <main> (scrollable, flex-1) │ ← overflow-y-auto
│ │
│ children │
│ │
├─────────────────────────────────┤
02 — Composants UI 3│ BottomNav (fixe, h-16) │ ← z-index: --z-sticky
└─────────────────────────────────┘
 max-w-md (448px), centré
Exemple d'usage :
// Page d'accueil — sans bouton retour
<AppShell title="Period.">
 <HomeContent />
</AppShell>
// Page détail — avec bouton retour et action droite
<AppShell
 title="Séance 1 — Jambes"
 backHref="/programs/prog-1"
 headerRight={<EditButton />}
>
 <SessionContent />
</AppShell>
PageHeader
Fichier : src/components/layout/PageHeader.tsx
Rôle : En-tête fixe affiché en haut de chaque page. Contient un slot gauche
(bouton
retour optionnel), un titre centré, et un slot droit (action optionnelle).
Props :
Prop Type Obligatoire Défaut Description
title string ✅ —
Titre centré dans le
header
backHref string ❌ undefined
Route vers laquelle
naviguer au clic du
bouton retour
02 — Composants UI 4Prop Type Obligatoire Défaut Description
right ReactNode ❌ undefined
Élément affiché à
droite
Comportement du bouton retour :
Si backHref est fourni → affiche un chevron gauche (icône SVG 2020)
Le clic déclenche navigate(backHref) via React Router
Sans backHref → le slot gauche est vide (div de 40px pour maintenir
l'alignement du titre)
Dimensions fixes :
Hauteur : h-14 (56px)
Fond : -color-bg ( #F9EDE1 )
Bordure basse : 1px solid rgba(47, 0, 87, 0.08)
Règle importante : Le titre est toujours centré, même quand il y a un bouton
retour.
Les slots gauche et droit ont toujours une largeur fixe de w-10 (40px) pour
maintenir
le titre centré visuellement.
BottomNav
Fichier : src/components/layout/BottomNav.tsx
Rôle : Barre de navigation fixe en bas de l'écran. 5 sections : 2 à gauche, 1
centrale
surélevée (bouton séance), 2 à droite.
Structure des 5 sections :
┌──────────┬──────────┬────────────┬──────────┬──────────┐
│ Cycle │Calendrier│ [Séance] │Historique│ Profil │
│ (home) │/calendar │ /workouts │/workouts │/profile │
│ │ │ /history │ │ │
└──────────┴──────────┴────────────┴──────────┴──────────┘
02 — Composants UI 5 ↑
 Bouton central surélevé
 (cercle violet, haltère blanc)
 position: absolute, -top-7
Routes de navigation :
Section Route Icône Condition d'actif
Cycle / Roue circulaire end — exact match uniquement
Calendrier /calendar Calendrier starts with /calendar
Séance
(central)
/workouts Haltère
— (pas d'état actif, c'est un
CTA)
Historique /workouts/history Horloge starts with /workouts/history
Profil /profile Silhouette starts with /profile
États visuels des onglets :
Actif : fond rgba(197, 132, 238, 0.1) , icône et label en -color-primary ( #C584EE )
Inactif : fond transparent, icône en -color-text ( #2F0057 ), label en rgba(47, 0,
87, 0.4)
Bouton central :
Cercle de 56×56px (w-14 h-14)
Gradient : 135deg, #7B2FBE 0%, #C584EE 100%
Ombre : 0 4px 20px rgba(123, 47, 190, 0.45)
Surélevé de 28px au-dessus de la navbar ( absolute -top-7 )
Icône haltère blanche 28×28px
Au clic : navigue vers /workouts
Hauteur : h-16 (64px) — la BottomNav elle-même, le bouton central dépasse audessus
Règle importante : La BottomNav a overflow: visible pour que le bouton central
surélevé soit visible. Le conteneur parent AppShell doit aussi avoir overflow:
visible .
02 — Composants UI 6UI — Composants d'interface
PrimaryButton
Fichier : src/components/ui/PrimaryButton.tsx
Rôle : Bouton principal de l'application. Pleine largeur, fond violet lavande, texte
violet profond. Utilisé pour les actions principales (confirmer, continuer, valider).
Props : Étend ButtonHTMLAttributes<HTMLButtonElement> +
Prop Type Obligatoire Défaut Description
isLoading boolean ❌ false
Affiche un spinner
et désactive le
bouton
children ReactNode ✅ — Contenu du bouton
className string ❌ ''
Classes CSS
supplémentaires
États visuels :
Normal → bg: #C584EE text: #2F0057 opacity: 1
Hover → bg: #B570D8 (légèrement plus sombre)
Active → scale(0.95) transition: 100ms
Loading → spinner + disabled + opacity: 1 (pas de 60% ici)
Disabled → opacity: 60% cursor: not-allowed
Règle d'usage :
Maximum 1 PrimaryButton par écran visible — c'est l'action principale
Toujours pleine largeur dans son conteneur
Le label doit être un verbe d'action : "continuer", "valider", "lancer ma séance"
Exemple :
// Normal
<PrimaryButton onClick={handleSubmit}>
 continuer
02 — Composants UI 7</PrimaryButton>
// Avec état de chargement
<PrimaryButton isLoading={isSubmitting} onClick={handleSubmi
t}>
 enregistrer
</PrimaryButton>
// Désactivé
<PrimaryButton disabled={!isValid}>
 continuer
</PrimaryButton>
DangerButton
Fichier : src/components/ui/DangerButton.tsx
Rôle : Bouton pour les actions destructives (supprimer, réinitialiser, quitter sans
sauvegarder). Fond rouge, texte blanc.
Props : Étend ButtonHTMLAttributes<HTMLButtonElement> +
Prop Type Obligatoire Défaut Description
isLoading boolean ❌ false
Spinner +
désactivé
children ReactNode ✅ — Contenu du bouton
États visuels :
Normal → bg: #D32F2F text: white
Hover → bg: #C42020
Active → scale(0.95)
Disabled → opacity: 60%
Règle d'usage :
Toujours précédé d'une confirmation (Modal avec isDanger=true)
02 — Composants UI 8Jamais utilisé comme action principale d'un formulaire standard
Label explicite sur ce qui est supprimé : "supprimer mon compte", pas juste
"supprimer"
InputField
Fichier : src/components/ui/InputField.tsx
Rôle : Champ de saisie avec label, gestion d'erreur, et toggle show/hide pour les
mots de passe.
Props : Étend InputHTMLAttributes<HTMLInputElement> +
Prop Type Obligatoire Défaut Description
label string ✅ —
Label affiché audessus du champ
error string ❌ undefined
Message d'erreur
affiché en rouge
sous le champ
id string ✅ —
Lie le label au
champ via htmlFor
/ id
États visuels :
Normal → bordure: rgba(47, 0, 87, 0.2)
Focus → bordure: #C584EE ring: rgba(197, 132, 238, 0.2)
Erreur → bordure: #DE3030 ring: rgba(222, 48, 48, 0.2)
Password → icône œil à droite pour toggle show/hide
Comportement spécifique pour type="password" :
Affiche une icône œil à droite (SVG 2020)
Clic sur l'icône → bascule entre type="password" et type="text"
L'icône change selon l'état (œil ouvert / œil barré)
Le padding droit du champ est élargi ( pr-12 ) pour éviter que le texte
chevauche l'icône
02 — Composants UI 9