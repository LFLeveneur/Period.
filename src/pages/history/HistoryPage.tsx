// Page liste de l'historique des séances — /history
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { getHistoryList } from '@/services/sessionHistoryService';
import { supabase } from '@/lib/supabase';
import { HistoryCard } from '@/components/history/HistoryCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import type { SessionHistoryItem } from '@/types/workout';

interface ProgramOption {
  id: string;
  name: string;
}

export function HistoryPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [filterProgramId, setFilterProgramId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Charge la liste des programmes pour le filtre
  useEffect(() => {
    if (!user) return;
    supabase
      .from('programs')
      .select('id, name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setPrograms(data as ProgramOption[]);
      });
  }, [user]);

  // Charge l'historique (rechargé au changement de filtre)
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getHistoryList(user.id, filterProgramId).then(({ data, error }) => {
      if (error) {
        showToast("impossible de charger l'historique", 'error');
        setHistory([]);
      } else {
        setHistory(data ?? []);
      }
      setLoading(false);
    });
  }, [user, filterProgramId, showToast]);

  return (
    <div
      style={{
        background: 'var(--color-bg)',
        minHeight: '100vh',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        paddingBottom: 'calc(var(--space-4) + 80px)',
      }}
    >
      {/* En-tête */}
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--text-3xl)',
          fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text)',
        }}
      >
        historique
      </h1>

      {/* Filtre par programme */}
      {programs.length > 0 && (
        <select
          value={filterProgramId ?? 'all'}
          onChange={e => setFilterProgramId(e.target.value === 'all' ? undefined : e.target.value)}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2) var(--space-3)',
            width: '100%',
            appearance: 'none',
          }}
        >
          <option value="all">tous les programmes</option>
          {programs.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      {/* États de chargement */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                height: 96,
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      )}

      {/* État vide */}
      {!loading && history.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-4)',
            paddingTop: 'var(--space-12)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-muted)',
            }}
          >
            tu n'as pas encore fait de séance.
          </p>
          <PrimaryButton variant="secondary" onClick={() => navigate('/programs')}>
            voir les programmes
          </PrimaryButton>
        </div>
      )}

      {/* Liste des séances */}
      {!loading && history.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {history.map(entry => (
            <HistoryCard
              key={entry.id}
              entry={entry}
              onTap={() => navigate(`/history/${entry.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
