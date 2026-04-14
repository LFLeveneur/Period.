// Section liste des utilisateurs pour le dashboard admin
// Affiche chaque user avec son activité, permet de le marquer comme "user de test"
// et d'expandre pour voir son historique d'events et feedbacks
import { useState, useEffect } from 'react';
import type { AdminUserSummary, UserDetail } from '@/types/analytics';
import { getUserDetail, toggleTestUser } from '@/services/analyticsService';

/** Formate une date ISO en "12 jan. 2026" */
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Formate un type d'event en label lisible */
function eventLabel(type: string): string {
  const labels: Record<string, string> = {
    signup_started: 'Inscription',
    onboarding_completed: 'Onboarding terminé',
    cycle_filled: 'Cycle rempli',
    training_filled: 'Programme créé',
    session_logged: 'Séance loggée',
    page_viewed: 'Page vue',
    feedback_submitted: 'Feedback envoyé',
  };
  return labels[type] ?? type;
}

/** Badge de statut de test */
function TestBadge({ isTest, onToggle, loading }: {
  isTest: boolean;
  onToggle: () => void;
  loading: boolean;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      disabled={loading}
      style={{
        padding: '2px var(--space-2)',
        borderRadius: 'var(--radius-full)',
        border: `1.5px solid ${isTest ? '#F59E0B' : 'var(--color-border)'}`,
        backgroundColor: isTest ? '#FEF3C7' : 'transparent',
        color: isTest ? '#92400E' : 'var(--color-text-muted)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        whiteSpace: 'nowrap',
        transition: 'all var(--duration-normal)',
      }}
    >
      {isTest ? 'TEST' : 'Vrai'}
    </button>
  );
}

/** Panneau de détail d'un utilisateur (events + feedbacks) */
function UserDetailPanel({ userId }: { userId: string }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserDetail(userId).then(({ data, error }) => {
      setDetail(data);
      setError(error);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-3)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
        Chargement...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div style={{ padding: 'var(--space-3)', color: 'var(--color-error)', fontSize: 'var(--text-sm)' }}>
        {error ?? 'Erreur de chargement.'}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 'var(--space-3) var(--space-4)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        backgroundColor: 'var(--color-bg)',
        borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
      }}
    >
      {/* Events récents */}
      <div>
        <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Activité récente ({detail.events.length})
        </p>
        {detail.events.length === 0 ? (
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Aucun event.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {detail.events.slice(0, 15).map((ev) => {
              const phase = ev.event_type === 'session_logged'
                ? (ev.metadata as Record<string, unknown>)?.phase as string | undefined
                : undefined;
              return (
                <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                    {eventLabel(ev.event_type)}
                    {phase && (
                      <span style={{ marginLeft: 'var(--space-1)', color: `var(--color-${phase === 'luteal_early' || phase === 'luteal_late' ? 'luteal' : phase})`, fontSize: 'var(--text-xs)' }}>
                        · {phase}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {fmtDate(ev.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feedbacks */}
      {detail.feedbacks.length > 0 && (
        <div>
          <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Feedbacks ({detail.feedbacks.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {detail.feedbacks.map((fb) => (
              <div key={fb.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{fmtDate(fb.created_at)}</span>
                {fb.liked && (
                  <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                    <span style={{ color: 'var(--color-success)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'] }}>✓ </span>
                    {fb.liked}
                  </p>
                )}
                {fb.frustrated && (
                  <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                    <span style={{ color: 'var(--color-error)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'] }}>✗ </span>
                    {fb.frustrated}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Ligne d'un utilisateur dans la liste */
function UserRow({
  user,
  onToggleTest,
}: {
  user: AdminUserSummary;
  onToggleTest: (userId: string, isTest: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggleTest = async () => {
    setToggling(true);
    await onToggleTest(user.user_id, !user.is_test_user);
    setToggling(false);
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        opacity: user.is_test_user ? 0.75 : 1,
        transition: 'opacity var(--duration-normal)',
      }}
    >
      {/* En-tête de la ligne — clic pour expandre */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          padding: 'var(--space-3) var(--space-4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          userSelect: 'none',
        }}
      >
        {/* Infos principales */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text)' }}>
              {user.name ?? 'Anonyme'}
            </span>
            {user.is_admin && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'] }}>
                ADMIN
              </span>
            )}
            {!user.onboarding_completed && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                onboarding incomplet
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: '2px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Inscrit le {fmtDate(user.created_at)}
            </span>
            {user.last_active_at && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                · actif le {fmtDate(user.last_active_at)}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text)' }}>
            {user.sessions_logged} séances
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {user.events_total} events
          </div>
        </div>

        {/* Toggle test */}
        <TestBadge isTest={user.is_test_user} onToggle={handleToggleTest} loading={toggling} />

        {/* Chevron */}
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', transition: 'transform var(--duration-fast)', transform: expanded ? 'rotate(90deg)' : 'none' }}>
          ›
        </span>
      </div>

      {/* Détail expandable */}
      {expanded && <UserDetailPanel userId={user.user_id} />}
    </div>
  );
}

interface UserListSectionProps {
  users: AdminUserSummary[];
  /** Appelé quand un toggle test user est confirmé — met à jour la liste parente */
  onUsersChange: (updatedUsers: AdminUserSummary[]) => void;
}

/** Section liste des utilisateurs dans le dashboard admin */
export function UserListSection({ users, onUsersChange }: UserListSectionProps) {
  const [filter, setFilter] = useState<'all' | 'real' | 'test'>('all');

  const realCount = users.filter((u) => !u.is_test_user).length;
  const testCount = users.filter((u) => u.is_test_user).length;

  const filtered = users.filter((u) => {
    if (filter === 'real') return !u.is_test_user;
    if (filter === 'test') return u.is_test_user;
    return true;
  });

  const handleToggleTest = async (userId: string, isTest: boolean) => {
    const { error } = await toggleTestUser(userId, isTest);
    if (error) return;
    // Mise à jour optimiste
    onUsersChange(users.map((u) => u.user_id === userId ? { ...u, is_test_user: isTest } : u));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Résumé + filtres */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          {realCount} vrai{realCount > 1 ? 's' : ''} · {testCount} de test
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {(['all', 'real', 'test'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                backgroundColor: filter === f ? 'var(--color-primary)' : 'var(--color-surface)',
                color: filter === f ? 'var(--color-text-light)' : 'var(--color-text-muted)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all var(--duration-normal)',
              }}
            >
              {f === 'all' ? 'Tous' : f === 'real' ? 'Vrais' : 'Test'}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
          Aucun utilisateur.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {filtered.map((user) => (
            <UserRow key={user.user_id} user={user} onToggleTest={handleToggleTest} />
          ))}
        </div>
      )}
    </div>
  );
}
