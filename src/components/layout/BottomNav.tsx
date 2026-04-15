// Navigation du bas — présente sur toutes les pages protégées avec AppLayout
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Heart, CalendarDays, BarChart3, User, Activity } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { getNextSessionId } from '@/services/homeService';

/** Configuration d'un onglet de navigation */
interface NavTab {
  label: string;
  path: string;
  icon: React.ComponentType<{ size: number; strokeWidth: number }>;
}

const TABS: NavTab[] = [
  { label: 'cycle', path: '/home', icon: Heart },
  { label: 'calendrier', path: '/calendar', icon: CalendarDays },
  { label: 'historique', path: '/history', icon: BarChart3 },
  { label: 'profil', path: '/profile', icon: User },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const [nextSessionId, setNextSessionId] = useState<string | null>(null);

  // Charge l'ID de la prochaine séance pour le bouton central
  useEffect(() => {
    if (!user?.id) return;
    getNextSessionId(user.id).then(id => setNextSessionId(id));
  }, [user?.id]);

  /** Navigation vers la prochaine séance ou la liste des programmes */
  function handleSessionTap() {
    if (nextSessionId) {
      navigate(`/session/${nextSessionId}/preview`);
    } else {
      navigate('/programs');
    }
  }

  /** Vérifie si un onglet est actif */
  function isActive(path: string): boolean {
    return location.pathname === path;
  }

  // Sépare les onglets : 2 avant et 2 après le bouton central
  const leftTabs = TABS.slice(0, 2);
  const rightTabs = TABS.slice(2);

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(64px + env(safe-area-inset-bottom))',
        backgroundColor: 'var(--color-surface)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 'var(--z-nav)' as React.CSSProperties['zIndex'],
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
        paddingTop: 'var(--space-2)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      {/* Onglets gauches */}
      {leftTabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="tappable"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 'var(--space-1)',
              fontFamily: 'var(--font-family)',
              color: isActive(tab.path) ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}
          >
            <Icon size={24} strokeWidth={2} aria-hidden="true" />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'] }}>
              {tab.label}
            </span>
          </button>
        );
      })}

      {/* Bouton central séance — surélevé */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <button
          onClick={handleSessionTap}
          className="tappable"
          aria-label="lancer une séance"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-primary)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-lg)',
            transform: 'translateY(-8px)',
            color: 'var(--color-text-light)',
          }}
        >
          <Activity size={24} strokeWidth={2} />
        </button>
      </div>

      {/* Onglets droits */}
      {rightTabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="tappable"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 'var(--space-1)',
              fontFamily: 'var(--font-family)',
              color: isActive(tab.path) ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}
          >
            <Icon size={24} strokeWidth={2} aria-hidden="true" />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'] }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
