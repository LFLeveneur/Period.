// Page liste des programmes — programme actif mis en avant + autres programmes
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { getPrograms, activateProgram, pauseProgram, deleteProgram } from '@/services/programService';
import type { Program } from '@/types/workout';
import { ProgramActiveCard } from '@/components/programs/ProgramActiveCard';
import { ProgramCard } from '@/components/programs/ProgramCard';
import { Modal } from '@/components/ui/Modal';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import * as analytics from '@/lib/analytics';

export function ProgramsPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { showToast } = useToast();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Charge les programmes au montage
  useEffect(() => {
    if (!user) return;
    loadPrograms();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPrograms() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await getPrograms(user.id);
    setLoading(false);

    if (error) {
      showToast('impossible de charger tes programmes.', 'error');
      return;
    }
    setPrograms(data ?? []);
  }

  async function handleActivate(programId: string) {
    if (!user) return;
    const { error } = await activateProgram(user.id, programId);

    if (error === 'ALREADY_ACTIVE') {
      showToast('ce programme est déjà actif.', 'info');
      return;
    }
    if (error) {
      showToast("impossible d'activer ce programme.", 'error');
      return;
    }

    analytics.track('program_activated', { program_id: programId });
    showToast('programme activé 🖤', 'success');
    navigate('/home', { replace: true });
  }

  async function handlePause(programId: string) {
    const { error } = await pauseProgram(programId);
    if (error) {
      showToast('impossible de mettre en pause.', 'error');
      return;
    }
    showToast('programme mis en pause.', 'info');
    await loadPrograms();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const { error } = await deleteProgram(deleteTarget.id);
    setDeleteLoading(false);

    if (error) {
      showToast('impossible de supprimer ce programme.', 'error');
      return;
    }

    showToast("programme supprimé. l'historique de tes séances est conservé.", 'success');
    setDeleteTarget(null);
    await loadPrograms();
  }

  // Sépare le programme actif des autres
  const activeProgram = programs.find(p => p.is_active) ?? null;
  const otherPrograms = programs.filter(p => !p.is_active);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        padding: 'var(--space-6) var(--space-4) var(--space-16)',
      }}
    >
      {/* En-tête */}
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-8)',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
              fontFamily: 'var(--font-family)',
              letterSpacing: '-0.02em',
            }}
          >
            mes programmes
          </h1>
          <p
            style={{
              margin: 'var(--space-1) 0 0',
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            tes routines d'entraînement
          </p>
        </div>

        {/* Bouton créer */}
        <button
          onClick={() => navigate('/programs/new')}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--color-bg-dark)',
            border: 'none',
            color: 'var(--color-text-light)',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-lg)',
            flexShrink: 0,
          }}
          aria-label="Créer un programme"
        >
          +
        </button>
      </header>

      {/* Bouton importer */}
      <button
        onClick={() => navigate('/programs/import')}
        style={{
          width: '100%',
          padding: 'var(--space-4) var(--space-5)',
          borderRadius: 'var(--radius-2xl)',
          background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-bg-dark) 100%)`,
          border: 'none',
          color: 'var(--color-text-light)',
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-6)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              opacity: 0.7,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Importer ton programme
          </span>
          <span>Ton programme existant importé en quelques secondes (une image, ou description suffit) →</span>
        </div>
        <span style={{ fontSize: '20px' }}>⚡</span>
      </button>

      {/* État chargement — skeleton */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div
            style={{
              height: '180px',
              borderRadius: 'var(--radius-2xl)',
              backgroundColor: 'var(--color-bg-dark)',
              opacity: 0.15,
            }}
          />
          <div
            style={{
              height: '140px',
              borderRadius: 'var(--radius-2xl)',
              backgroundColor: 'var(--color-surface)',
              opacity: 0.6,
            }}
          />
          <div
            style={{
              height: '140px',
              borderRadius: 'var(--radius-2xl)',
              backgroundColor: 'var(--color-surface)',
              opacity: 0.4,
            }}
          />
        </div>
      ) : programs.length === 0 ? (
        // Aucun programme
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-5)',
            padding: 'var(--space-16) var(--space-4)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--color-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            🏋️
          </div>
          <div>
            <h3
              style={{
                margin: '0 0 var(--space-2)',
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text)',
              }}
            >
              aucun programme
            </h3>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                maxWidth: '240px',
                lineHeight: 1.5,
              }}
            >
              crée ton premier programme pour commencer à t'entraîner intelligemment.
            </p>
          </div>
          <PrimaryButton onClick={() => navigate('/programs/new')}>
            créer un programme
          </PrimaryButton>
          <PrimaryButton variant="secondary" onClick={() => navigate('/programs/import')}>
            importer via Make
          </PrimaryButton>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Programme actif */}
          {activeProgram && (
            <ProgramActiveCard
              program={activeProgram}
              onPause={() => handlePause(activeProgram.id)}
              onDetail={() => navigate(`/programs/${activeProgram.id}`)}
            />
          )}

          {/* Autres programmes */}
          {otherPrograms.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {activeProgram && (
                <p
                  style={{
                    margin: '0 0 var(--space-1)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-family)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  autres programmes
                </p>
              )}
              {otherPrograms.map(p => (
                <ProgramCard
                  key={p.id}
                  program={p}
                  onActivate={() => handleActivate(p.id)}
                  onDetail={() => navigate(`/programs/${p.id}`)}
                  onDelete={() => setDeleteTarget(p)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal confirmation suppression */}
      <Modal
        isOpen={!!deleteTarget}
        title="supprimer ce programme ?"
        confirmLabel="supprimer"
        cancelLabel="annuler"
        isDanger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isConfirmLoading={deleteLoading}
      >
        l&apos;historique de tes séances est conservé.
      </Modal>
    </div>
  );
}
