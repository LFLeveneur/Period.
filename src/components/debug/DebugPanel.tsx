// Panneau de debug — accessible uniquement en développement
// 🚨 Ne jamais shipper en production
import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { ToastContext } from '@/components/ui/Toast';
import * as debugService from '@/services/debugService';
import { sendToCoach } from '@/services/aiCoachService';
import type { HealthDataDebug, SessionHistoryDebug } from '@/services/debugService';
import type { Profile } from '@/types/auth';
import type { Program } from '@/types/workout';

interface DebugInfo {
  profile: Profile | null;
  healthData: HealthDataDebug | null;
  activeProgram: Program | null;
}

export function DebugPanel() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const toastContext = useContext(ToastContext);
  const showToast = toastContext?.showToast ?? (() => { });

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    profile: null,
    healthData: null,
    activeProgram: null,
  });

  // Historique séances en base
  const [sessionHistoryDebug, setSessionHistoryDebug] = useState<SessionHistoryDebug[]>([]);
  const [sessionHistoryLoading, setSessionHistoryLoading] = useState(false);

  // Test webhook Coach IA
  const [coachLoading, setCoachLoading] = useState<'before' | 'after' | null>(null);
  const [coachResult, setCoachResult] = useState<string>('');

  // Rafraîchit les infos du debug
  const refreshDebugInfo = async () => {
    if (!user) return;
    const result = await debugService.getDebugInfo(user.id);
    if (result.error) {
      showToast(`Erreur : ${result.error}`, 'error');
    } else {
      setDebugInfo({
        profile: result.profile,
        healthData: result.healthData,
        activeProgram: result.activeProgram,
      });
    }
  };

  /** Charge l'historique des séances + exercices depuis Supabase */
  const loadSessionHistoryDebug = async () => {
    if (!user) return;
    setSessionHistoryLoading(true);
    const { data, error } = await debugService.getSessionHistoryDebug(user.id);
    setSessionHistoryLoading(false);
    if (error) {
      showToast(`Erreur historique : ${error}`, 'error');
    } else {
      setSessionHistoryDebug(data);
    }
  };

  // Rafraîchit au démarrage et quand on ouvre le panneau
  useEffect(() => {
    if (isOpen) {
      refreshDebugInfo();
    }
  }, [isOpen]);


  // ─── SEED ────────────────────────────────────────────────────────────────

  const handleSeedCycleJ1 = async () => {
    if (!user) return;
    setIsLoading(true);
    const { error } = await debugService.seedCycleDay(user.id, 1);
    setIsLoading(false);

    if (error) {
      showToast(`Erreur : ${error}`, 'error');
      console.error('[DebugPanel] seedCycleDay', error);
    } else {
      showToast('Cycle J1 (menstruel) créé', 'success');
      await refreshDebugInfo();
    }
  };

  const handleSeedCycleJ14 = async () => {
    if (!user) return;
    setIsLoading(true);
    const { error } = await debugService.seedCycleDay(user.id, 14);
    setIsLoading(false);

    if (error) {
      showToast(`Erreur : ${error}`, 'error');
      console.error('[DebugPanel] seedCycleDay', error);
    } else {
      showToast('Cycle J14 (ovulation) créé', 'success');
      await refreshDebugInfo();
    }
  };

  const handleSeedCycleJ21 = async () => {
    if (!user) return;
    setIsLoading(true);
    const { error } = await debugService.seedCycleDay(user.id, 21);
    setIsLoading(false);

    if (error) {
      showToast(`Erreur : ${error}`, 'error');
      console.error('[DebugPanel] seedCycleDay', error);
    } else {
      showToast('Cycle J21 (lutéale) créé', 'success');
      await refreshDebugInfo();
    }
  };

  const handleSeedProgram = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await debugService.seedTestProgram(user.id);
    setIsLoading(false);

    if (error) {
      showToast(`Erreur : ${error}`, 'error');
      console.error('[DebugPanel] seedTestProgram', error);
    } else {
      showToast(`Programme de test créé: ${data?.name}`, 'success');
      await refreshDebugInfo();
    }
  };

  // ─── COACH IA ────────────────────────────────────────────────────────────

  const handleTestCoachBefore = async () => {
    if (!user) return;
    setCoachLoading('before');
    setCoachResult('🚀 Envoi en cours...');

    // Payload mock "before_session"
    const mockPayload = {
      type: 'before_session' as const,
      user: {
        name: debugInfo.profile?.name ?? 'Mathilde',
        fitnessLevel: debugInfo.profile?.level ?? 'intermediaire',
        objective: debugInfo.profile?.objective ?? 'equilibre',
      },
      cycle: { phase: 'follicular', cycleDay: 8, cycleLength: 28, periodLength: 5, daysUntilPeriod: 20 },
      session: {
        name: 'Full Body A (debug)',
        totalExercisesCount: 2,
        exercises: [
          { name: 'Squat', sets: 3, targetReps: 8, targetWeight: 60, inputType: 'weight_reps', lastSessionWeight: 57.5, lastSessionReps: 8, samePhaseLastWeight: 55, samePhaseLastReps: 8, personalRecord: 60 },
          { name: 'Hip Thrust', sets: 4, targetReps: 10, targetWeight: 80, inputType: 'weight_reps', lastSessionWeight: 77.5, lastSessionReps: 10, samePhaseLastWeight: 75, samePhaseLastReps: 10, personalRecord: 82.5 },
        ],
      },
    };

    try {
      // UUID unique pour forcer un nouvel appel (pas de cache)
      const fakeSessionId = crypto.randomUUID();
      const result = await sendToCoach(mockPayload, user.id, fakeSessionId, null);
      if (result.data) {
        setCoachResult(`✅ Succès!\n\nSummary:\n${result.data.summary}\n\nID: ${result.data.id}`);
      } else {
        setCoachResult('⚠️ Webhook retourné null (pas de données)');
      }
    } catch (err) {
      setCoachResult(`❌ Erreur: ${String(err)}`);
    } finally {
      setCoachLoading(null);
    }
  };

  const handleTestCoachAfter = async () => {
    if (!user) return;
    setCoachLoading('after');
    setCoachResult('🚀 Envoi en cours...');

    // Payload mock "after_session"
    const mockPayload = {
      type: 'after_session' as const,
      user: {
        name: debugInfo.profile?.name ?? 'Mathilde',
        fitnessLevel: debugInfo.profile?.level ?? 'intermediaire',
        objective: debugInfo.profile?.objective ?? 'equilibre',
      },
      cycle: { phase: 'follicular', cycleDay: 8, daysUntilPeriod: 20 },
      session: {
        name: 'Full Body A (debug)',
        durationMinutes: 52,
        feeling: 'solid',
        energyScore: 4,
        performanceScore: 78,
        performanceLevel: 'good',
        totalVolume: 3800,
        victories: ['PR Squat +2.5kg', 'Volume total record'],
        exercises: [
          { name: 'Squat', avgRIR: 2, vs_previous_kg_delta: 2.5, vs_same_phase_kg_delta: 5, progression: 'up' },
          { name: 'Hip Thrust', avgRIR: 1, vs_previous_kg_delta: 0, vs_same_phase_kg_delta: 2.5, progression: 'stable' },
        ],
      },
    };

    try {
      const fakeHistoryId = crypto.randomUUID();
      const fakeSessionId = crypto.randomUUID();
      const result = await sendToCoach(mockPayload, user.id, fakeSessionId, fakeHistoryId);
      if (result.data) {
        setCoachResult(`✅ Succès!\n\nSummary:\n${result.data.summary}\n\nID: ${result.data.id}`);
      } else {
        setCoachResult('⚠️ Webhook retourné null (pas de données)');
      }
    } catch (err) {
      setCoachResult(`❌ Erreur: ${String(err)}`);
    } finally {
      setCoachLoading(null);
    }
  };

  // ─── NAVIGATION ──────────────────────────────────────────────────────────

  const navQuicklinks = [
    { label: 'Onboarding', path: '/onboarding' },
    { label: 'Reveal', path: '/onboarding/reveal' },
    { label: 'Home', path: '/home' },
    { label: 'Calendar', path: '/calendar' },
    { label: 'Programs', path: '/programs' },
    { label: 'New Program', path: '/programs/new' },
    { label: 'Import', path: '/programs/import' },
    { label: 'Profile', path: '/profile' },
  ];

  const debugButtonStyle: React.CSSProperties = {
    padding: 'var(--space-2) var(--space-3)',
    marginBottom: 'var(--space-2)',
    width: '100%',
    textAlign: 'left',
    fontSize: 'var(--text-xs)',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: 'var(--radius-md)',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    opacity: isLoading ? 0.6 : 1,
    fontFamily: 'var(--font-family)',
    transition: 'background-color var(--duration-fast)',
  };

  const infoBoxStyle: React.CSSProperties = {
    padding: 'var(--space-3)',
    backgroundColor: '#f5f5f5',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-xs)',
    fontFamily: 'monospace',
    borderLeft: '3px solid var(--color-primary)',
    marginBottom: 'var(--space-3)',
    maxHeight: '300px',
    overflowY: 'auto',
  };

  if (!isOpen) {
    // Bouton flottant en bas à droite
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 'var(--space-4)',
          right: 'var(--space-4)',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: '#333',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          zIndex: 'var(--z-nav)' as React.CSSProperties['zIndex'],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'var(--text-base)',
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          transition: 'transform var(--duration-normal)',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.transform = 'scale(1)';
        }}
        title="Debug Panel (dev only)"
      >
        🐛
      </button>
    );
  }

  // Drawer ouvert
  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => setIsOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 'var(--z-overlay)' as React.CSSProperties['zIndex'],
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: 'min(100%, 480px)',
          backgroundColor: 'var(--color-surface)',
          boxShadow: 'var(--shadow-xl)',
          zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
          overflow: 'auto',
          animation: 'slideInRight var(--duration-slow) ease',
        }}
      >
        <div style={{ padding: 'var(--space-4)' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-4)',
              borderBottom: '1px solid #eee',
              paddingBottom: 'var(--space-3)',
            }}
          >
            <h1 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 'bold' }}>
              🐛 Debug Panel
            </h1>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--text-lg)',
              }}
            >
              ✕
            </button>
          </div>

          {/* User ID */}
          <div style={{ ...infoBoxStyle, marginBottom: 'var(--space-4)' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 'var(--space-1)' }}>User ID:</div>
            <div style={{ wordBreak: 'break-all' }}>{user?.id || 'Not authenticated'}</div>
          </div>

          {/* ─── INFOS EN TEMPS RÉEL ────────────────────────────────────── */}
          <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginBottom: 'var(--space-2)' }}>
            📊 Données actuelles
          </h2>

          <div style={infoBoxStyle}>
            <div style={{ marginBottom: 'var(--space-2)' }}>
              <div style={{ fontWeight: 'bold' }}>Profile:</div>
              <div>Name: {debugInfo.profile?.name || '—'}</div>
              <div>Level: {debugInfo.profile?.level || '—'}</div>
              <div>Cycle tracking: {debugInfo.profile?.cycle_tracking ?? '—'}</div>
              <div>Onboarding: {debugInfo.profile?.onboarding_completed ? '✓' : '✗'}</div>
            </div>

            {debugInfo.healthData && (
              <div style={{ marginBottom: 'var(--space-2)' }}>
                <div style={{ fontWeight: 'bold' }}>Health Data:</div>
                <div>
                  Last period:{' '}
                  {debugInfo.healthData.last_period_date
                    ? debugInfo.healthData.last_period_date
                    : '—'}
                </div>
                <div>
                  Cycle length:{' '}
                  {debugInfo.healthData.cycle_length ? debugInfo.healthData.cycle_length : '—'}
                </div>
                <div>
                  Period length:{' '}
                  {debugInfo.healthData.period_length ? debugInfo.healthData.period_length : '—'}
                </div>
              </div>
            ) || (
                <div style={{ fontStyle: 'italic', color: '#666', marginBottom: 'var(--space-2)' }}>
                  No health data
                </div>
              )}

            {debugInfo.activeProgram ? (
              <div>
                <div style={{ fontWeight: 'bold' }}>Active Program:</div>
                <div>{debugInfo.activeProgram.name}</div>
              </div>
            ) : (
              <div style={{ fontStyle: 'italic', color: '#666' }}>No active program</div>
            )}
          </div>

          {/* ─── RESET DONNÉES ────────────────────────────────────────── */}
          {/* <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
            🗑️ Reset des données
          </h2>

          <button onClick={handleResetOnboarding} style={debugButtonStyle} disabled={isLoading}>
            Reset onboarding
          </button>
          <button onClick={handleResetHealthData} style={debugButtonStyle} disabled={isLoading}>
            Reset données cycle
          </button>
          <button onClick={handleResetPrograms} style={debugButtonStyle} disabled={isLoading}>
            Reset programmes
          </button>
          <button onClick={handleResetSessionHistory} style={debugButtonStyle} disabled={isLoading}>
            Reset historique
          </button>
          <button onClick={handleResetEverything} style={dangerButtonStyle} disabled={isLoading}>
            ⚠️ Reset TOUT
          </button> */}

          {/* ─── SEED DONNÉES ────────────────────────────────────────── */}
          <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
            🌱 Seed données de test
          </h2>

          <button onClick={handleSeedCycleJ1} style={debugButtonStyle} disabled={isLoading}>
            Seed cycle (J1 menstruel)
          </button>
          <button onClick={handleSeedCycleJ14} style={debugButtonStyle} disabled={isLoading}>
            Seed cycle (J14 ovulation)
          </button>
          <button onClick={handleSeedCycleJ21} style={debugButtonStyle} disabled={isLoading}>
            Seed cycle (J21 lutéale)
          </button>
          <button onClick={handleSeedProgram} style={debugButtonStyle} disabled={isLoading}>
            Seed programme de test
          </button>

          {/* ─── SÉANCES EN BASE ─────────────────────────────────────── */}
          <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
            🗄️ Séances en base (20 dernières)
          </h2>

          <button
            onClick={loadSessionHistoryDebug}
            style={{ ...debugButtonStyle, backgroundColor: '#e8f4fd', borderColor: '#90cdf4' }}
            disabled={sessionHistoryLoading}
          >
            {sessionHistoryLoading ? '⏳ Chargement...' : '🔍 Charger les séances'}
          </button>

          {sessionHistoryDebug.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              {sessionHistoryDebug.map(session => {
                const date = new Date(session.completed_at).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: '2-digit', year: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                });
                const hasExercises = session.exercises.length > 0;
                return (
                  <div
                    key={session.id}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      backgroundColor: hasExercises ? '#f0fff4' : '#fff5f5',
                      border: `1px solid ${hasExercises ? '#9ae6b4' : '#feb2b2'}`,
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {/* Ligne 1 : date + statut exercices */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold' }}>{date}</span>
                      <span style={{ color: hasExercises ? '#276749' : '#c53030', fontWeight: 'bold' }}>
                        {hasExercises ? `✓ ${session.exercises.length} exercice(s)` : '✗ aucun exercice'}
                      </span>
                    </div>
                    {/* Ligne 2 : phase + ressenti + volume */}
                    <div style={{ color: '#555', marginBottom: '4px' }}>
                      phase: {session.cycle_phase ?? '—'} · ressenti: {session.feeling ?? '—'} · volume: {session.total_volume ?? '—'} kg
                    </div>
                    {/* Ligne 3 : ID (court) */}
                    <div style={{ color: '#888', fontSize: '10px', wordBreak: 'break-all' }}>
                      id: {session.id}
                    </div>
                    {/* Détail des exercices */}
                    {hasExercises && (
                      <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #c6f6d5' }}>
                        {session.exercises.map((ex, idx) => (
                          <div key={ex.id} style={{ color: '#276749', fontSize: '10px' }}>
                            {idx + 1}. {ex.input_type ?? 'type?'} · {ex.set_count} série(s)
                            {ex.exercise_catalog_id && ` · catalog: ${ex.exercise_catalog_id.slice(0, 8)}…`}
                            {ex.user_custom_exercise_id && ` · custom: ${ex.user_custom_exercise_id.slice(0, 8)}…`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {sessionHistoryDebug.length === 0 && !sessionHistoryLoading && (
            <p style={{ fontSize: 'var(--text-xs)', color: '#888', fontStyle: 'italic', marginTop: 'var(--space-1)' }}>
              Clique sur "Charger" pour voir les données Supabase.
            </p>
          )}

          {/* ─── COACH IA — TEST WEBHOOKS ────────────────────────── */}
          <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
            🤖 Coach IA — Test webhooks
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <button
              onClick={handleTestCoachBefore}
              style={{ ...debugButtonStyle, marginBottom: 0, backgroundColor: coachLoading === 'before' ? '#ddd' : '#e8f4fd', borderColor: '#90cdf4' }}
              disabled={coachLoading !== null}
            >
              {coachLoading === 'before' ? '⏳ Envoi...' : '▶ Before session'}
            </button>
            <button
              onClick={handleTestCoachAfter}
              style={{ ...debugButtonStyle, marginBottom: 0, backgroundColor: coachLoading === 'after' ? '#ddd' : '#f0fff4', borderColor: '#9ae6b4' }}
              disabled={coachLoading !== null}
            >
              {coachLoading === 'after' ? '⏳ Envoi...' : '▶ After session'}
            </button>
          </div>

          {coachResult && (
            <pre style={{
              padding: 'var(--space-2)',
              backgroundColor: coachResult.includes('✅') ? '#f0fff4' : coachResult.includes('🚀') ? '#fffbeb' : '#fff5f5',
              border: `1px solid ${coachResult.includes('✅') ? '#9ae6b4' : coachResult.includes('🚀') ? '#fbd38d' : '#feb2b2'}`,
              borderRadius: 'var(--radius-md)',
              fontSize: '10px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '200px',
              overflowY: 'auto',
              marginBottom: 'var(--space-2)',
            }}>
              {coachResult}
            </pre>
          )}

          <p style={{ fontSize: 'var(--text-xs)', color: '#888', fontStyle: 'italic', marginBottom: 'var(--space-2)' }}>
            Utilise des données mock — chaque clic crée un nouvel appel (pas de cache).
          </p>

          {/* ─── NAVIGATION RAPIDE ──────────────────────────────────── */}
          <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
            🧭 Navigation rapide
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
            {navQuicklinks.map(link => (
              <button
                key={link.path}
                onClick={() => {
                  navigate(link.path);
                  setIsOpen(false);
                }}
                style={{
                  ...debugButtonStyle,
                  marginBottom: 0,
                  padding: 'var(--space-2)',
                  fontSize: 'var(--text-xs)',
                }}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Spacer pour scroll */}
          <div style={{ height: 'var(--space-8)' }} />
        </div>
      </div>

      {/* Animation CSS en global — dans index.css */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
