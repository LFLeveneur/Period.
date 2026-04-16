// Vue détaillée d'un utilisateur avec tableaux complets
// Affiche les events, feedbacks, NPS, sessions, etc. sous forme tabulaire
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { AdminUserSummary, UserDetail } from '@/types/analytics';
import { getUserDetail } from '@/services/analyticsService';

/** Formate une date ISO */
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Labels pour les événements */
function eventLabel(type: string): string {
  const labels: Record<string, string> = {
    signup_started: 'Inscription',
    onboarding_completed: 'Onboarding complété',
    cycle_filled: 'Cycle rempli',
    training_filled: 'Programme créé',
    session_logged: 'Séance loggée',
    page_viewed: 'Page vue',
    feedback_submitted: 'Feedback envoyé',
    nps_submitted: 'NPS soumis',
  };
  return labels[type] ?? type;
}

type Tab = 'overview' | 'events' | 'feedbacks' | 'nps';

interface UserDetailViewProps {
  user: AdminUserSummary;
  onClose: () => void;
}

export function UserDetailView({ user, onClose }: UserDetailViewProps) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    getUserDetail(user.user_id).then(({ data, error }) => {
      setDetail(data);
      setError(error);
      setLoading(false);
    });
  }, [user.user_id]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(47, 0, 87, 0.5)',
        zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
        display: 'flex',
        alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          height: '90vh',
          backgroundColor: 'var(--color-bg)',
          borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
        }}
      >
        {/* En-tête */}
        <div
          style={{
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text)',
              }}
            >
              {user.name ?? 'Anonyme'}
            </h2>
            <p
              style={{
                margin: 'var(--space-1) 0 0',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
              }}
            >
              Inscrit le {fmtDate(user.created_at)} · {user.sessions_logged} séances · {user.events_total} events
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Onglets */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
            padding: 'var(--space-1)',
            gap: 'var(--space-1)',
          }}
        >
          {(['overview', 'events', 'feedbacks', 'nps'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                backgroundColor: activeTab === tab ? 'var(--color-primary)' : 'transparent',
                color: activeTab === tab ? 'white' : 'var(--color-text-muted)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                cursor: 'pointer',
                transition: 'all var(--duration-normal)',
              }}
            >
              {tab === 'overview' && 'Vue d\'ensemble'}
              {tab === 'events' && 'Événements'}
              {tab === 'feedbacks' && 'Feedbacks'}
              {tab === 'nps' && 'NPS'}
            </button>
          ))}
        </div>

        {/* Contenu */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-bg)',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>
              Chargement...
            </div>
          ) : error ? (
            <div style={{ padding: 'var(--space-4)', backgroundColor: '#FEE2E2', borderRadius: 'var(--radius-lg)', color: '#991B1B' }}>
              {error}
            </div>
          ) : !detail ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>
              Aucune donnée.
            </div>
          ) : (
            <>
              {/* Vue d'ensemble */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
                    <div style={{ backgroundColor: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
                      <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Événements</p>
                      <p style={{ margin: 0, fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text)' }}>
                        {detail.events.length}
                      </p>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
                      <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Feedbacks</p>
                      <p style={{ margin: 0, fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text)' }}>
                        {detail.feedbacks.length}
                      </p>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
                      <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Scores NPS</p>
                      <p style={{ margin: 0, fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text)' }}>
                        {detail.nps_scores.length > 0 ? (detail.nps_scores.reduce((sum, n) => sum + n.nps_score, 0) / detail.nps_scores.length).toFixed(1) : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tableau Événements */}
              {activeTab === 'events' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text)' }}>
                    Événements ({detail.events.length})
                  </h3>
                  <div
                    style={{
                      overflow: 'auto',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--color-surface)' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                          <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                            Type
                          </th>
                          <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                            Détails
                          </th>
                          <th style={{ padding: 'var(--space-3)', textAlign: 'right', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.events.map((ev) => {
                          const phase = ev.event_type === 'session_logged' ? (ev.metadata as Record<string, unknown>)?.phase as string | undefined : undefined;
                          const score = ev.event_type === 'nps_submitted' ? (ev.metadata as Record<string, unknown>)?.score as number | undefined : undefined;
                          return (
                            <tr key={ev.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'] }}>
                                {eventLabel(ev.event_type)}
                              </td>
                              <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                                {phase && (
                                  <span style={{ color: `var(--color-${phase === 'luteal_early' || phase === 'luteal_late' ? 'luteal' : phase})` }}>
                                    Phase: {String(phase)}
                                  </span>
                                )}
                                {score !== undefined && <span>Score: {score}/10</span>}
                              </td>
                              <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                {fmtDate(ev.created_at)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tableau Feedbacks */}
              {activeTab === 'feedbacks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text)' }}>
                    Feedbacks ({detail.feedbacks.length})
                  </h3>
                  {detail.feedbacks.length === 0 ? (
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>Aucun feedback.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {detail.feedbacks.map((fb) => (
                        <div key={fb.id} style={{ backgroundColor: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-primary)' }}>
                          <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                            {fmtDate(fb.created_at)}
                          </p>
                          {fb.liked && (
                            <div style={{ marginBottom: 'var(--space-2)' }}>
                              <p style={{ margin: '0 0 var(--space-1)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-success)', textTransform: 'uppercase' }}>
                                ✓ Aimé
                              </p>
                              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text)', lineHeight: 'var(--leading-relaxed)' }}>
                                {fb.liked}
                              </p>
                            </div>
                          )}
                          {fb.frustrated && (
                            <div>
                              <p style={{ margin: '0 0 var(--space-1)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-error)', textTransform: 'uppercase' }}>
                                ✗ Frustré
                              </p>
                              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text)', lineHeight: 'var(--leading-relaxed)' }}>
                                {fb.frustrated}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tableau NPS */}
              {activeTab === 'nps' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text)' }}>
                    Scores NPS ({detail.nps_scores.length})
                  </h3>
                  {detail.nps_scores.length === 0 ? (
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>Aucun score NPS.</p>
                  ) : (
                    <div
                      style={{
                        overflow: 'auto',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--color-surface)' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                            <th style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                              Score
                            </th>
                            <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                              Classification
                            </th>
                            <th style={{ padding: 'var(--space-3)', textAlign: 'right', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.nps_scores.map((nps) => {
                            const scoreColor = nps.nps_score >= 8 ? '#10B981' : nps.nps_score >= 6 ? '#F59E0B' : '#EF4444';
                            const label = nps.nps_score >= 8 ? 'Promoteur' : nps.nps_score >= 6 ? 'Neutre' : 'Détracteur';
                            return (
                              <tr key={nps.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                                  <div
                                    style={{
                                      width: '40px',
                                      height: '40px',
                                      borderRadius: 'var(--radius-full)',
                                      backgroundColor: scoreColor,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'white',
                                      fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                                      fontSize: 'var(--text-base)',
                                      margin: '0 auto',
                                    }}
                                  >
                                    {nps.nps_score}
                                  </div>
                                </td>
                                <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'] }}>
                                  {label}
                                </td>
                                <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  {fmtDate(nps.created_at)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
