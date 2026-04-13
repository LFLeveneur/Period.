// Composant de transition de page — applique une animation d'entrée lors de chaque changement de route
import { useLocation, Outlet } from 'react-router';

type TransitionType = 'fade' | 'slide-right' | 'slide-left' | 'scale';

interface PageTransitionProps {
  /** Type de transition à appliquer — défaut : 'fade' */
  type?: TransitionType;
}

// Mappe chaque type de transition à l'animation CSS correspondante
const ANIMATION_MAP: Record<TransitionType, string> = {
  'fade':        'pageFadeIn var(--duration-normal) ease-out both',
  'slide-right': 'pageSlideInFromRight var(--duration-slow) ease-out both',
  'slide-left':  'pageSlideInFromLeft var(--duration-normal) ease-out both',
  'scale':       'pageScaleIn var(--duration-slow) ease-out both',
};

export function PageTransition({ type = 'fade' }: PageTransitionProps) {
  const location = useLocation();

  return (
    // La clé sur location.key force un re-montage à chaque navigation, déclenchant l'animation
    <div
      key={location.key}
      style={{
        animation: ANIMATION_MAP[type],
        minHeight: '100%',
      }}
    >
      <Outlet />
    </div>
  );
}
