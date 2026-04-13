// Page détail d'un programme — séances, actions selon statut, historique récent
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import {
  getProgramDetail,
  getRecentSessionHistory,
  activateProgram,
  pauseProgram,
  deleteProgram,
} from '@/services/programService';
import type { ProgramDetail, SessionWithExercises } from '@/services/programService';
import { SessionRow } from '@/components/programs/SessionRow';
import { SessionDetailDrawer } from '@/components/programs/SessionDetailDrawer';
import { Modal } from '@/components/ui/Modal';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { showToast } = useToast();

  const [detail, setDetail] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Historique récent du programme
  const [recentHistory, setRecentHistory] = useState<
    Array<{ id: string; completed_at: string; duration_minutes: number | null; session_id: string | null }>
  >([]);

  // Drawer détail séance
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  // Modal suppression
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadDetail(id);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDetail(programId: string) {
    setLoading(true);
    const { data, error: detailError } = await getProgramDetail(programId);
    setLoading(false);

    if (detailError || !data) {
      setError(detailError ?? 'programme introuvable.');
      return;
    }

    setDetail(data);

    // Charge l'historique récent en parallèle
    const { data: history } = await getRecentSessionHistory(programId);
    setRecentHistory(history ?? []);
  }

  async function handleActivate() {
    if (!user || !id) return;
    const { error: activateError } = await activateProgram(user.id, id);

    if (activateError === 'ALREADY_ACTIVE') {
      showToast('ce programme est déjà actif.', 'info');
      return;
    }
    if (activateError) {
      showToast('impossible d\'activer ce programme.', 'error');
      return;
    }

    showToast('programme activé 🖤', 'success');
    navigate('/home', { replace: true });
  }

  async function handlePause() {
    if (!id) return;
    const { error: pauseError } = await pauseProgram(id);

    if (pauseError) {
      showToast('impossible de mettre en pause.', 'error');
      return;
    }

    showToast('programme mis en pause.', 'info');
    await loadDetail(id);
  }

  async function handleDelete() {
    if (!id) return;
    setDeleteLoading(true);
    const { error: deleteError } = await deleteProgram(id);
    setDeleteLoading(false);

    if (deleteError) {
      showToast('impossible de supprimer ce programme.', 'error');
      return;
    }

    showToast('programme supprimé. l\'historique de tes séances est conservé.', 'success');
    navigate('/programs', { replace: true });
  }

  // Séance ouverte dans le drawer
  const openSession: SessionWithExercises | null =
    openSessionId
      ? detail?.sessions.find(s => s.session.id === openSessionId) ?? null
      : null;

  // ─── États chargement et erreur ───────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-6) var(--space-4)' }}>
        <div style={{ height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)', marginBottom: 'var(--space-4)', opacity: 0.6 }} />
        <div style={{ height: '200px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', opacity: 0.4 }} />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div
        style={{
          padding: 'var(--space-6) var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontFamily: 'var(--font-family)' }}>
          impossible de charger ce programme.
        </p>
        <PrimaryButton variant="secondary" onClick={() => navigate(-1)}>
          ← retour
        </PrimaryButton>
      </div>
    );
  }

  const { program, sessions } = detail;

  // Badge de statut
  const statusLabel =
    program.status === 'active'
      ? 'Actif'
      : program.status === 'paused'
      ? 'En pause'
      : 'Terminé';

  // Date de création
  const createdDate = new Date(program.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div style={{ padding: 'var(--space-6) var(--space-4) var(--space-8)' }}>
      {/* En-tête */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 'var(--text-xl)',
            color: 'var(--color-text)',
            padding: 0,
            flexShrink: 0,
          }}
        >
          ←
        </button>
        <h1
          style={{
            margin: 0,
            flex: 1,
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
            fontFamily: 'var(--font-family)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {program.name}
        </h1>
        <span
          style={{
            flexShrink: 0,
            padding: '2px var(--space-2)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor:
              program.status === 'active' ? 'var(--color-primary)' : 'var(--color-bg)',
            color:
              program.status === 'active' ? 'var(--color-text)' : 'var(--color-text-muted)',
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-family)',
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Actions selon statut */}
      {program.status === 'active' ? (
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
          <PrimaryButton variant="secondary" size="sm" onClick={handlePause} style={{ flex: 1 }}>
            mettre en pause
          </PrimaryButton>
          <PrimaryButton variant="secondary" size="sm" onClick={() => navigate(`/programs/${id}/edit`)} style={{ flex: 1 }}>
            modifier
          </PrimaryButton>
        </div>
      ) : program.status === 'paused' ? (
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
          <PrimaryButton size="sm" onClick={handleActivate} style={{ flex: 1, minWidth: '80px' }}>
            reprendre
          </PrimaryButton>
          <PrimaryButton variant="secondary" size="sm" onClick={() => navigate(`/programs/${id}/edit`)} style={{ flex: 1, minWidth: '80px' }}>
            modifier
          </PrimaryButton>
          <button
            onClick={() => setDeleteOpen(true)}
            style={{
              background: 'none',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--color-error)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-family)',
              padding: 'var(--space-2) var(--space-3)',
              cursor: 'pointer',
            }}
          >
            supprimer
          </button>
        </div>
      ) : null}

      {/* Méta */}
      {program.description && (
        <p
          style={{
            margin: '0 0 var(--space-2)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-family)',
            lineHeight: 'var(--leading-normal)',
          }}
        >
          {program.description}
        </p>
      )}
      <p
        style={{
          margin: '0 0 var(--space-6)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-family)',
        }}
      >
        {program.duration_weeks ? `${program.duration_weeks} semaines · ` : ''}
        créé le {createdDate}
      </p>

      {/* Section séances */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h2
          style={{
            margin: '0 0 var(--space-3)',
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
            fontFamily: 'var(--font-family)',
          }}
        >
          séances
        </h2>

        {/* EC-14 : programme sans séances */}
        {sessions.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              alignItems: 'flex-start',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 'var(--text-base)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-family)',
              }}
            >
              ton programme n&apos;a pas encore de séances.
            </p>
            <PrimaryButton
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/programs/${id}/edit`)}
            >
              modifier →
            </PrimaryButton>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {sessions.map(s => (
              <SessionRow
                key={s.session.id}
                session={s}
                onTap={() => setOpenSessionId(s.session.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section historique récent */}
      {recentHistory.length > 0 && (
        <section>
          <h2
            style={{
              margin: '0 0 var(--space-3)',
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
              fontFamily: 'var(--font-family)',
            }}
          >
            dernières séances
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {recentHistory.map(h => (
              <button
                key={h.id}
                onClick={() => navigate(`/history/${h.id}`)}
                className="tappable"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-family)',
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
                      color: 'var(--color-text)',
                    }}
                  >
                    {new Date(h.completed_at).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                  {h.duration_minutes && (
                    <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {h.duration_minutes} min
                    </p>
                  )}
                </div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-base)' }}>→</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Drawer détail séance */}
      <SessionDetailDrawer
        isOpen={!!openSessionId}
        session={openSession}
        onClose={() => setOpenSessionId(null)}
        onStart={() => {
          if (openSessionId) navigate(`/session/${openSessionId}/preview`);
        }}
      />

      {/* Modal suppression */}
      <Modal
        isOpen={deleteOpen}
        title="supprimer ce programme ?"
        confirmLabel="supprimer"
        isDanger
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        isConfirmLoading={deleteLoading}
      >
        l&apos;historique de tes séances est conservé.
      </Modal>
    </div>
  );
}
