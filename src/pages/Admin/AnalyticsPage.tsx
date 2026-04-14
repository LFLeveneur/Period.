// Page dashboard analytics — réservée aux admins (is_admin = true dans profiles)
// Deux onglets : Dashboard (KPIs vrais users) et Utilisateurs (liste + détail individuel)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  getActivationKpis,
  getRetentionKpis,
  getPhaseDistribution,
  getFeedbackList,
  getAdminUserList,
} from '@/services/analyticsService';
import type {
  ActivationKpis,
  RetentionKpis,
  PhaseDistribution,
  FeedbackEntry,
  AdminUserSummary,
} from '@/types/analytics';
import { UserListSection } from './UserListSection';

type Tab = 'dashboard' | 'users';

/** Carte KPI générique */
function KpiCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-5)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      <span
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text)',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{sub}</span>
      )}
    </div>
  );
}

/** Label lisible pour une phase */
function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    menstrual: 'Menstruation',
    follicular: 'Folliculaire',
    ovulation: 'Ovulation',
    luteal: 'Lutéale',
    luteal_early: 'Lutéale (début)',
    luteal_late: 'Lutéale (fin)',
  };
  return labels[phase] ?? phase;
}

/** Sélecteur d'onglets */
function TabSelector({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-full)',
        padding: '3px',
        boxShadow: 'var(--shadow-sm)',
        width: 'fit-content',
      }}
    >
      {([['dashboard', 'Dashboard'], ['users', 'Utilisateurs']] as [Tab, string][]).map(([tab, label]) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            backgroundColor: active === tab ? 'var(--color-primary)' : 'transparent',
            color: active === tab ? 'var(--color-text-light)' : 'var(--color-text-muted)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
            cursor: 'pointer',
            transition: 'all var(--duration-normal)',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function AnalyticsPage() {
  const { user, profile, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  // Données dashboard
  const [activation, setActivation] = useState<ActivationKpis | null>(null);
  const [retention, setRetention] = useState<RetentionKpis | null>(null);
  const [phases, setPhases] = useState<PhaseDistribution[] | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[] | null>(null);

  // Données utilisateurs
  const [users, setUsers] = useState<AdminUserSummary[]>([]);

  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guard admin
  useEffect(() => {
    if (!authLoading && (!user || !profile?.is_admin)) {
      navigate('/home', { replace: true });
    }
  }, [user, profile, authLoading, navigate]);

  // Chargement initial — users + KPIs filtrés sans users de test
  useEffect(() => {
    if (!profile?.is_admin) return;

    async function loadData() {
      setDataLoading(true);

      // D'abord la liste des users pour identifier les users de test
      const usersRes = await getAdminUserList();
      const testUserIds = (usersRes.data ?? [])
        .filter((u) => u.is_test_user)
        .map((u) => u.user_id);

      setUsers(usersRes.data ?? []);

      // Puis les KPIs en excluant les users de test
      const [actRes, retRes, phaseRes, fbRes] = await Promise.all([
        getActivationKpis(testUserIds),
        getRetentionKpis(testUserIds),
        getPhaseDistribution(testUserIds),
        getFeedbackList(30),
      ]);

      const firstError = usersRes.error ?? actRes.error ?? retRes.error ?? phaseRes.error ?? fbRes.error ?? null;
      setError(firstError);

      setActivation(actRes.data);
      setRetention(retRes.data);
      setPhases(phaseRes.data);
      setFeedbacks(fbRes.data);
      setDataLoading(false);
    }

    loadData();
  }, [profile?.is_admin]);

  // Quand la liste users change (toggle test), recharge les KPIs
  const handleUsersChange = async (updatedUsers: AdminUserSummary[]) => {
    setUsers(updatedUsers);
    const testUserIds = updatedUsers.filter((u) => u.is_test_user).map((u) => u.user_id);

    const [actRes, retRes, phaseRes] = await Promise.all([
      getActivationKpis(testUserIds),
      getRetentionKpis(testUserIds),
      getPhaseDistribution(testUserIds),
    ]);

    setActivation(actRes.data);
    setRetention(retRes.data);
    setPhases(phaseRes.data);
  };

  if (authLoading || !user || !profile?.is_admin) return null;

  const testUserCount = users.filter((u) => u.is_test_user).length;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        padding: 'var(--space-6) var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      {/* En-tête */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
            }}
          >
            analytics 📊
          </h1>
          <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            tableau de bord period.
          </p>
        </div>
        <TabSelector active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Erreur globale */}
      {error && (
        <div
          style={{
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-error)',
            color: 'var(--color-text-light)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {error}
        </div>
      )}

      {dataLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{ height: '80px', borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--color-border)' }}
            />
          ))}
        </div>
      ) : activeTab === 'dashboard' ? (
        <DashboardTab
          activation={activation}
          retention={retention}
          phases={phases}
          feedbacks={feedbacks}
          testUserCount={testUserCount}
        />
      ) : (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h2 style={sectionTitleStyle}>Utilisateurs ({users.length})</h2>
          <UserListSection users={users} onUsersChange={handleUsersChange} />
        </section>
      )}
    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 'var(--text-base)',
  fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
  color: 'var(--color-text)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

/** Onglet dashboard — KPIs + phases + feedbacks */
function DashboardTab({
  activation,
  retention,
  phases,
  feedbacks,
  testUserCount,
}: {
  activation: ActivationKpis | null;
  retention: RetentionKpis | null;
  phases: PhaseDistribution[] | null;
  feedbacks: FeedbackEntry[] | null;
  testUserCount: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Badge users de test exclus */}
      {testUserCount > 0 && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-full)',
            backgroundColor: '#FEF3C7',
            border: '1px solid #F59E0B',
            color: '#92400E',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
            width: 'fit-content',
          }}
        >
          ⚠ {testUserCount} user{testUserCount > 1 ? 's' : ''} de test exclu{testUserCount > 1 ? 's' : ''}
        </div>
      )}

      {/* Activation */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h2 style={sectionTitleStyle}>Activation</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
          <KpiCard label="Inscriptions" value={activation?.signup_started ?? 0} />
          <KpiCard label="Onboarding ✓" value={activation?.onboarding_completed ?? 0} />
          <KpiCard label="Cycles remplis" value={activation?.cycle_filled ?? 0} />
          <KpiCard label="Programmes créés" value={activation?.training_filled ?? 0} />
          <KpiCard label="Séances loggées" value={activation?.session_logged ?? 0} sub="toutes les séances" />
        </div>
      </section>

      {/* Rétention */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h2 style={sectionTitleStyle}>Rétention</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
          <KpiCard label="Actives 7j" value={retention?.active_7d ?? 0} sub="utilisatrices" />
          <KpiCard label="Actives 30j" value={retention?.active_30d ?? 0} sub="utilisatrices" />
          <KpiCard label="Total" value={retention?.total_users ?? 0} sub="inscrites" />
        </div>
      </section>

      {/* Phases du cycle */}
      {phases && phases.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h2 style={sectionTitleStyle}>Séances par phase</h2>
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            {phases.map(({ phase, count }) => {
              const total = phases.reduce((s, p) => s + p.count, 0);
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const barColor = `var(--color-${phase === 'luteal_early' || phase === 'luteal_late' ? 'luteal' : phase})`;
              return (
                <div key={phase} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                    <span>{phaseLabel(phase)}</span>
                    <span style={{ fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'] }}>
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 'var(--radius-full)', backgroundColor: barColor, transition: 'width var(--duration-slow)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Feedbacks qualitatifs */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h2 style={sectionTitleStyle}>Feedbacks ({feedbacks?.length ?? 0})</h2>
        {!feedbacks || feedbacks.length === 0 ? (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
            Aucun feedback pour l'instant.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {feedbacks.map((fb) => (
              <div
                key={fb.id}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-4)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  {new Date(fb.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {fb.liked && (
                  <div>
                    <p style={{ margin: '0 0 var(--space-1)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      aimé ✓
                    </p>
                    <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text)', lineHeight: 'var(--leading-relaxed)' }}>
                      {fb.liked}
                    </p>
                  </div>
                )}
                {fb.frustrated && (
                  <div>
                    <p style={{ margin: '0 0 var(--space-1)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-error)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      frustré ✗
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
      </section>
    </div>
  );
}
