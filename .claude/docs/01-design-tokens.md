01 — Design Tokens
Source de vérité visuelle. Ce fichier définit tous les tokens de design de
Period. :
couleurs, typographie, espacements, rayons, ombres, animations. Aucune
valeur visuelle
ne doit être écrite directement dans un composant si elle n'est pas définie ici
d'abord.
Le fichier src/styles/variables.css est la traduction exacte de ce document en
CSS.
Principes visuels généraux
Period. suit un style appelé "Organic Light" :
Fond principal chaud et doux (beige crème) — pas blanc, pas gris
Sections inversées sur violet profond avec texte crème — jamais blanc pur
sur violet
Un seul accent chromatique : violet lavande — il ressort sur les deux fonds
Les phases du cycle ont chacune une couleur propre — c'est le seul endroit
où plusieurs
couleurs cohabitent simultanément à l'écran
L'app est mobile-first : tout est pensé pour un écran de 390px de large en
premier
1. Couleurs
1.1 Palette de base
Ces couleurs sont utilisées pour les fonds, surfaces, textes et accents généraux.
Elles s'appliquent à 95% de l'interface.
01 — Design Tokens 1Period. est mobile-first. Le breakpoint principal est md (768px) pour les
adaptations
tablet/desktop. L'app est conçue et testée en priorité à 390px (iPhone 14).
Token Valeur Signification
--bp-sm 390px iPhone standard — cible principale
--bp-md 768px Tablet — adaptations légères
--bp-lg 1024px Desktop — vue étendue si nécessaire
9. Fichier CSS à générer — src/styles/variables.css
Ce fichier est la traduction exacte de ce document en CSS custom properties.
Il doit être importé en premier dans src/index.css avant tout autre style.
/* ==========================================================
==
 Period. — Design Tokens
 Source de vérité : .claude/docs/01-design-tokens.md
 NE PAS modifier ces valeurs sans mettre à jour le .md d'ab
ord
 ==========================================================
== */
:root {
 /* --- Couleurs de base --- */
 --color-bg: #F9EDE1;
 --color-bg-dark: #2F0057;
 --color-surface: #FFFFFF;
 --color-surface-dark: #3D0070;
 --color-primary: #C584EE;
 --color-primary-hover: #B570D8;
 --color-text: #2F0057;
 --color-text-light: #F9EDE1;
 --color-text-muted: rgba(47, 0, 87, 0.5);
01 — Design Tokens 10 --color-text-muted-dark: rgba(249, 237, 225, 0.6);
 --color-border: rgba(47, 0, 87, 0.08);
 --color-border-dark: rgba(249, 237, 225, 0.1);
 /* --- Phases du cycle — Menstruation --- */
 --color-menstrual: #DE3030;
 --color-menstrual-mid: #E66C6C;
 --color-menstrual-light: #ECA6A6;
 /* --- Phases du cycle — Folliculaire --- */
 --color-follicular: #EDDF40;
 --color-follicular-mid: #F0E677;
 --color-follicular-light: #F2ECAD;
 --color-follicular-text: #8A7A00; /* texte sur fond follic
ulaire — contraste garanti */
 /* --- Phases du cycle — Ovulation --- */
 --color-ovulation: #303DCA;
 --color-ovulation-mid: #6C75D7;
 --color-ovulation-light: #A6ABE4;
 /* --- Phases du cycle — Lutéale --- */
 --color-luteal: #30CA8C;
 --color-luteal-mid: #6CD7AC;
 --color-luteal-light: #A6E4CB;
 /* --- Énergie / Activité --- */
 --color-energy: #FF7700;
 --color-energy-mid: #FC9D4A;
 --color-energy-light: #F9C393;
 /* --- Couleurs sémantiques --- */
 --color-error: #D32F2F;
 --color-error-bg: #FFEBEE;
 --color-success: #2E7D32;
 --color-success-bg: #E8F5E9;
01 — Design Tokens 11 --color-warning: #E65100;
 --color-warning-bg: #FFF3E0;
 /* --- Typographie --- */
 --font-family: -apple-system, BlinkMacSystemFont, 'Segoe
UI', Roboto,
 Helvetica Neue, Arial, sans-serif;
 --text-xs: 0.75rem;
 --text-sm: 0.875rem;
 --text-base: 1rem;
 --text-lg: 1.125rem;
 --text-xl: 1.25rem;
 --text-2xl: 1.5rem;
 --text-3xl: 1.875rem;
 --text-4xl: 2.25rem;
 --font-normal: 400;
 --font-medium: 500;
 --font-semibold: 600;
 --font-bold: 700;
 --leading-tight: 1.2;
 --leading-normal: 1.5;
 --leading-relaxed: 1.65;
 /* --- Espacements --- */
 --space-1: 4px;
 --space-2: 8px;
 --space-3: 12px;
 --space-4: 16px;
 --space-5: 20px;
 --space-6: 24px;
 --space-8: 32px;
 --space-10: 40px;
 --space-12: 48px;
 --space-16: 64px;
01 — Design Tokens 12 /* --- Rayons --- */
 --radius-sm: 8px;
 --radius-md: 12px;
 --radius-lg: 16px;
 --radius-xl: 24px;
 --radius-full: 9999px;
 /* --- Ombres --- */
 --shadow-sm: 0 1px 4px rgba(47, 0, 87, 0.06);
 --shadow-md: 0 2px 12px rgba(47, 0, 87, 0.08);
 --shadow-lg: 0 4px 24px rgba(47, 0, 87, 0.12);
 --shadow-xl: 0 8px 40px rgba(47, 0, 87, 0.16);
 /* --- Animations --- */
 --duration-fast: 100ms;
 --duration-normal: 200ms;
 --duration-slow: 350ms;
 --easing-default: ease-in-out;
 --easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
 /* --- Z-index --- */
 --z-base: 0;
 --z-raised: 10;
 --z-dropdown: 100;
 --z-sticky: 200;
 --z-modal: 300;
 --z-toast: 400;
 /* --- Breakpoints (usage en JS uniquement, pas en CSS nati
f) --- */
 --bp-sm: 390px;
 --bp-md: 768px;
 --bp-lg: 1024px;
}
01 — Design Tokens 1310. Règles absolues à ne jamais enfreindre
❌ Jamais de couleur hexadécimale écrite directement dans un
composant
 → Toujours utiliser une variable CSS définie ici
❌ Jamais de blanc pur (#FFFFFF) comme couleur de texte sur f
ond sombre
 → Utiliser --color-text-light (#F9EDE1)
❌ Jamais de z-index arbitraire (z-index: 9999, z-index: 50,
etc.)
 → Utiliser les paliers définis dans la section Z-index
❌ Jamais d'espacement arbitraire (margin: 13px, padding: 7p
x, etc.)
 → Utiliser les multiples de 4px définis dans la section Es
pacements
❌ Jamais de taille de texte en px directement dans un compos
ant
 → Utiliser les variables --text-* définies ici
❌ Jamais de couleur de phase pour un usage sémantique (erreu
r, succès, warning)
 → Les couleurs de phase servent uniquement à représenter l
es phases du cycle
✅ Si une valeur n'existe pas dans ce fichier et qu'on en a b
esoin,
 on l'ajoute ici d'abord, puis on l'utilise dans le code
01 — Design Tokens 14Token Valeur hex Rôle
--color-bg #F9EDE1
Fond principal de toute l'app — beige
crème chaud
--color-bg-dark #2F0057
Fond des sections inversées — violet
très profond
--color-surface #FFFFFF Fond des cards sur fond clair
--color-surface-dark #3D0070 Fond des cards sur fond sombre
--color-primary #C584EE Accent principal — violet lavande
--color-primaryhover
#B570D8
Accent au survol — légèrement plus
sombre
--color-text #2F0057 Texte principal sur fond clair
--color-text-light #F9EDE1
Texte sur fond sombre (jamais
#FFFFFF )
--color-text-muted rgba(47, 0, 87, 0.5)
Texte secondaire / désactivé sur fond
clair
--color-text-muteddarkrgba(249, 237, 225,
0.6)
Texte secondaire sur fond sombre
--color-border
rgba(47, 0, 87,
0.08)
Bordure subtile sur fond clair
--color-border-dark
rgba(249, 237, 225,
0.1)
Bordure subtile sur fond sombre
1.2 Règles d'usage des couleurs de base
Fond clair (#F9EDE1)
├── Texte principal → #2F0057
├── Texte secondaire → rgba(47, 0, 87, 0.5)
├── Surface card → #FFFFFF
├── Bordure card → rgba(47, 0, 87, 0.08)
└── Accent → #C584EE
Fond sombre (#2F0057)
├── Texte principal → #F9EDE1 (jamais #FFFFFF)
├── Texte secondaire → rgba(249, 237, 225, 0.6)
├── Surface card → #3D0070
01 — Design Tokens 2├── Bordure card → rgba(249, 237, 225, 0.1)
└── Accent → #C584EE (fonctionne sur les deux fo
nds)
1.3 Palette des phases du cycle
Chaque phase du cycle a 3 niveaux de couleur :
Fort — couleur principale, utilisée pour les badges et indicateurs actifs
Moyen — version intermédiaire, utilisée pour les états secondaires
Pâle — couleur de fond, utilisée pour les surfaces et arrière-plans de phase
Ces couleurs ne sont utilisées que pour représenter les phases du cycle. Elles ne
doivent
pas être réutilisées pour d'autres usages sémantiques (erreur, succès, warning) —
ceux-ci
ont leurs propres tokens.
Phase Niveau Token Valeur hex Usage
Menstruation Fort
--colormenstrual
#DE3030
Badge actif,
indicateur fort
Moyen
--colormenstrual-mid
#E66C6C État secondaire
Pâle
--colormenstrual-light
#ECA6A6
Fond de surface
de phase
Folliculaire Fort
--colorfollicular
#EDDF40
Badge actif,
indicateur fort
Moyen
--colorfollicular-mid
#F0E677 État secondaire
Pâle
--colorfollicularlight
#F2ECAD
Fond de surface
de phase
Ovulation Fort
--colorovulation
#303DCA
Badge actif,
indicateur fort
Moyen
--colorovulation-mid
#6C75D7 État secondaire
01 — Design Tokens 3Phase Niveau Token Valeur hex Usage
Pâle
--colorovulation-light
#A6ABE4
Fond de surface
de phase
Lutéale Fort --color-luteal #30CA8C
Badge actif,
indicateur fort
Moyen
--color-lutealmid
#6CD7AC État secondaire
Pâle
--color-luteallight
#A6E4CB
Fond de surface
de phase
Énergie /
Activité
Fort --color-energy #FF7700
Badge actif,
indicateur fort
Moyen
--color-energymid
#FC9D4A État secondaire
Pâle
--color-energylight
#F9C393
Fond de surface
de phase
Note sur la phase lutéale tardive : la phase lutéale est divisée en deux sousphases
(précoce et tardive) dans la logique métier, mais elles partagent la même
palette de
couleurs verte. La distinction est faite dans le texte et les recommandations,
pas dans
la couleur.
1.4 Règle de composition badge de phase
Un badge de phase utilise toujours le niveau pâle en fond et le niveau fort en
texte :
Menstruation → fond: #ECA6A6 texte: #DE3030
Folliculaire → fond: #F2ECAD texte: #EDDF40 (attention: peu
contrasté — voir note)
Ovulation → fond: #A6ABE4 texte: #303DCA
Lutéale → fond: #A6E4CB texte: #30CA8C
01 — Design Tokens 4Note sur la phase folliculaire : le jaune #EDDF40 sur fond #F2ECAD a un contraste
faible. Pour le texte du badge folliculaire, utiliser #8A7A00 (jaune foncé) à la place
du jaune fort, pour garantir la lisibilité.
1.5 Couleurs sémantiques
Ces couleurs sont utilisées pour les états système (erreur, succès, information).
Elles sont
distinctes de la palette de phases et ne se mélangent pas avec elle.
Token Valeur hex Usage
--color-error #D32F2F Message d'erreur, champ invalide
--color-error-bg #FFEBEE Fond de zone d'erreur
--color-success #2E7D32 Confirmation, action réussie
--color-success-bg #E8F5E9 Fond de zone de succès
--color-warning #E65100 Avertissement non bloquant
--color-warning-bg #FFF3E0 Fond de zone d'avertissement
2. Typographie
2.1 Police
Period. utilise uniquement la police système de chaque appareil. Pas de police
Google
Fonts, pas de police téléchargée. Cela garantit des performances optimales et un
rendu
natif sur iOS et Android.
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', R
oboto,
 Helvetica Neue, Arial, sans-serif;
Environnement Police rendue
iPhone / iPad San Francisco (SF Pro)
Mac San Francisco (SF Pro)
01 — Design Tokens 5Environnement Police rendue
Android Roboto
Windows Segoe UI
Linux Arial / Helvetica
2.2 Échelle typographique
Toutes les tailles sont en rem (base 16px). Les tailles ne doivent jamais être écrites
en px directement dans les composants.
Token Valeur rem
Valeur px
équivalente
Usage
--text-xs 0.75rem 12px Labels micro, mentions légales
--text-sm 0.875rem 14px
Texte secondaire, captions,
sous-labels
--text-base 1rem 16px Texte courant, paragraphes
--text-lg 1.125rem 18px Texte légèrement mis en avant
--text-xl 1.25rem 20px Sous-titres de section
--text-2xl 1.5rem 24px Titres de page secondaires
--text-3xl 1.875rem 30px Titres de page principaux
--text-4xl 2.25rem 36px
Très grands titres (landing,
reveal)
2.3 Graisses typographiques
Token Valeur Usage
--font-normal 400 Texte courant
--font-medium 500 Légère emphase
--font-semibold 600 Labels de bouton, titres de card
--font-bold 700 Titres de page, chiffres importants
2.4 Hauteur de ligne
01 — Design Tokens 6Token Valeur Usage
--leading-tight 1.2 Titres courts
--leading-normal 1.5 Texte courant
--leading-relaxed 1.65 Texte long, paragraphes explicatifs
3. Espacements
Le système d'espacement est basé sur une grille de 4px. Toutes les valeurs sont
des
multiples de 4. Aucun espacement ne doit être une valeur arbitraire qui ne figure
pas dans
cette liste.
Token Valeur Usage type
--space-1 4px Micro-espacement (entre icône et label)
--space-2 8px Petit espacement (padding interne d'un badge)
--space-3 12px Espacement entre éléments proches
--space-4 16px Padding standard d'une card, espacement courant
--space-5 20px Espacement entre groupes d'éléments
--space-6 24px Padding de section, grand espacement
--space-8 32px Espacement entre sections
--space-10 40px Grand espacement vertical
--space-12 48px Très grand espacement (header, hero)
--space-16 64px Espacement exceptionnel
Règle de padding des pages
Toutes les pages ont un padding horizontal identique de --space-4 (16px) de
chaque côté.
Ce padding ne varie jamais d'une page à l'autre. Le contenu ne touche jamais les
bords
de l'écran.
01 — Design Tokens 74. Rayons de bordure
Token Valeur Usage
--radius-sm 8px Petits éléments (badges, chips, inputs)
--radius-md 12px Boutons standards
--radius-lg 16px Cards, modals
--radius-xl 24px Cards larges, bottom sheets
--radius-full 9999px Éléments ronds (avatars, indicateurs circulaires)
5. Ombres
Les ombres sont toujours dans la teinte du fond sombre ( #2F0057 ) pour rester
cohérentes
avec la palette. Jamais d'ombre noire pure.
Token Valeur CSS Usage
--shadow-sm 0 1px 4px rgba(47, 0, 87, 0.06) Légère élévation (inputs)
--shadow-md 0 2px 12px rgba(47, 0, 87, 0.08) Cards standard
--shadow-lg 0 4px 24px rgba(47, 0, 87, 0.12) Modals, bottom sheets
--shadow-xl 0 8px 40px rgba(47, 0, 87, 0.16) Éléments flottants
6. Animations et transitions
Toutes les animations sont subtiles et rapides. L'app ne doit jamais sembler lente
ou
trop animée. Les transitions servent à donner du feedback — pas à décorer.
Token Valeur Usage
--duration-fast 100ms Feedback immédiat (tap, press)
--durationnormal
200ms Transitions standards (hover, focus)
--duration-slow 350ms
Apparitions de modals, slides de
pages
01 — Design Tokens 8Token Valeur Usage
--easing-default ease-in-out
Easing standard pour toutes les
transitions
--easing-spring
cubic-bezier(0.34, 1.56,
0.64, 1)
Légèrement rebondissant (boutons,
badges)
Règles d'animation
- Un bouton pressé → scale(0.97) en 100ms puis retour en 100m
s
- Apparition d'une modal → opacity 0→1 + translateY(8px→0) en
350ms
- Transition entre pages → fade 200ms
- Timer de repos → progression linéaire, pas d'easing
- Roue du cycle → pas d'animation de rotation (statique, just
e mise en exergue)
7. Z-index
Le z-index est géré par paliers pour éviter les conflits entre couches. Utiliser
uniquement
ces valeurs — jamais de z-index arbitraire comme z-index: 9999 .
Token Valeur Usage
--z-base 0 Contenu normal
--z-raised 10 Cards flottantes légèrement au-dessus du contenu
--z-dropdown 100 Menus déroulants
--z-sticky 200 Headers sticky, bottom nav
--z-modal 300 Modals et overlays
--z-toast 400 Notifications toast (au-dessus de tout)
8. Breakpoints
01 — Design Tokens 9