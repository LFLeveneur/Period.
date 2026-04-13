# rules/design.md — Règles visuelles Period.

## Style général — "Organic Light"

- Fond principal : beige crème chaud `#F9EDE1` — jamais blanc, jamais gris
- Sections inversées : violet profond `#2F0057` avec texte crème `#F9EDE1` — **jamais blanc pur**
- Un seul accent chromatique : violet lavande `#C584EE`
- Les phases du cycle ont des couleurs propres — c'est le seul endroit où plusieurs couleurs cohabitent
- Mobile-first : tout est pensé pour 390px (iPhone 14) en premier

---

## Règles absolues

```
❌ Jamais de couleur hexadécimale directement dans un composant
   → Toujours une variable CSS de src/styles/variables.css

❌ Jamais de blanc pur (#FFFFFF) comme couleur de texte sur fond sombre
   → Utiliser --color-text-light (#F9EDE1)

❌ Jamais de z-index arbitraire (z-index: 9999, z-index: 50...)
   → Utiliser les paliers : --z-base(0), --z-nav(50), --z-overlay(100), --z-modal(200), --z-toast(300)

❌ Jamais d'espacement arbitraire (margin: 13px, padding: 7px...)
   → Utiliser les multiples de 4px : --space-1(4px) à --space-16(64px)

❌ Jamais de taille de texte en px directement dans un composant
   → Utiliser --text-xs à --text-4xl

❌ Jamais de couleur de phase pour un usage sémantique (erreur, succès, warning)
   → Les couleurs de phase servent UNIQUEMENT à représenter les phases du cycle

✅ Si une valeur n'existe pas dans variables.css et qu'on en a besoin :
   on l'ajoute dans variables.css D'ABORD, puis on l'utilise dans le code
```

---

## Padding des pages

Toutes les pages ont un padding horizontal identique de `--space-4` (16px) de chaque côté.
Le contenu ne touche **jamais** les bords de l'écran.

---

## Composants interactifs

- Tous les boutons interactifs ont `active:scale-95` pour le feedback tactile
- Les inputs en focus ont une bordure `--color-primary`
- Les états disabled ont `opacity: 0.5` et `cursor: not-allowed`
- Les états loading affichent un spinner + désactivent le bouton

---

## Typographie — règles d'usage

| Contexte | Token |
|---------|-------|
| Titres de page principaux | `--text-3xl` + `--font-bold` |
| Titres de section | `--text-xl` + `--font-semibold` |
| Texte courant | `--text-base` + `--font-normal` |
| Labels de bouton | `--text-base` + `--font-semibold` |
| Texte secondaire / captions | `--text-sm` + `--font-normal` |
| Labels micro | `--text-xs` |

---

## Couleurs de phase — usage strict

| Phase | Couleur principale | Usage |
|-------|--------------------|-------|
| Menstruation | `--color-menstrual` (#DE3030) | Badges, indicateurs, fond de jour calendrier |
| Folliculaire | `--color-follicular` (#EDDF40) | Idem — texte sur fond folliculaire : `--color-follicular-text` |
| Ovulation | `--color-ovulation` (#303DCA) | Idem |
| Lutéale | `--color-luteal` (#30CA8C) | Idem (early et late = même couleur) |

Les variantes `-mid` et `-light` sont pour les états hover, fond de card, dégradés.

---

## Ombres — quand les utiliser

| Token | Usage |
|-------|-------|
| `--shadow-sm` | Inputs en focus, légère élévation |
| `--shadow-md` | Cards standard |
| `--shadow-lg` | Modals, bottom sheets |
| `--shadow-xl` | Éléments flottants (FAB, tooltips) |

---

## Animations — règles

- Les animations sont subtiles et rapides — l'app ne doit jamais sembler lente
- `--duration-fast` (100ms) : feedback immédiat (tap, press)
- `--duration-normal` (200ms) : transitions standards (hover, focus)
- `--duration-slow` (350ms) : apparitions de modals, slides de pages
- Jamais d'animation décorative non fonctionnelle

---

## Breakpoints

| Token | Valeur | Usage |
|-------|--------|-------|
| `--bp-sm` | 390px | Cible principale — iPhone standard |
| `--bp-md` | 768px | Tablet — adaptations légères |
| `--bp-lg` | 1024px | Desktop — vue étendue si nécessaire |
