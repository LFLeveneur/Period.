// Composant Coach IA — affiche le conseil et la modale de détail
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { AICoachCardProps, BeforeSessionAdvice, AfterSessionAnalysis } from '@/types/aiCoach';

// Messages qui défilent pendant l'analyse
const LOADING_MESSAGES_BEFORE = [
  'Analyse de ta phase de cycle…',
  'Lecture de ton historique…',
  'Calcul des ajustements de charge…',
  'Préparation de tes conseils…',
];

const LOADING_MESSAGES_AFTER = [
  'Analyse de tes performances…',
  'Comparaison avec les séances précédentes…',
  'Lecture des signaux de récupération…',
  'Synthèse de ta séance…',
];

export function AICoachCard({ type, state, summary, detail }: AICoachCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [messageIdx, setMessageIdx] = useState(0);

  // Défile les messages toutes les 2.5s pendant le chargement
  useEffect(() => {
    if (state !== 'loading') return;
    const messages = type === 'before_session' ? LOADING_MESSAGES_BEFORE : LOADING_MESSAGES_AFTER;
    const interval = setInterval(() => {
      setMessageIdx(i => (i + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [state, type]);

  // Ne rien afficher en idle ou error
  if (state === 'idle' || state === 'error') {
    return null;
  }

  // État loading — skeleton animé
  if (state === 'loading') {
    const messages = type === 'before_session' ? LOADING_MESSAGES_BEFORE : LOADING_MESSAGES_AFTER;
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '28px',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-4)',
          border: '1px solid rgba(197, 132, 238, 0.15)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Barre de progression indéterminée */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', backgroundColor: 'rgba(197, 132, 238, 0.15)', borderRadius: '28px 28px 0 0' }}>
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '50%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, var(--color-primary), transparent)',
              borderRadius: '2px',
            }}
          />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
            Analyse de ta séance
          </span>
        </div>

        {/* Message rotatif */}
        <div style={{ position: 'relative', height: '20px', marginBottom: 'var(--space-4)', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.span
              key={messageIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
              }}
            >
              {messages[messageIdx]}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Lignes skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {[90, 75, 60].map((width, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
              style={{
                height: '11px',
                width: `${width}%`,
                backgroundColor: 'var(--color-border)',
                borderRadius: '6px',
              }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  // État ready — afficher le conseil
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '28px',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-4)',
          border: '1px solid #fdf2f8',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--color-text)' }}>
            Analyse de ta séance
          </span>
        </div>

        {/* Summary */}
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            lineHeight: '1.5',
            color: 'var(--color-text)',
            marginBottom: 'var(--space-3)',
          }}
        >
          {summary}
        </p>

        {/* Bouton détail */}
        <button
          onClick={() => setModalOpen(true)}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--color-primary)',
            fontSize: 'var(--text-sm)',
            fontWeight: '600',
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
          }}
          onMouseDown={e => {
            (e.target as HTMLButtonElement).style.opacity = '0.7';
          }}
          onMouseUp={e => {
            (e.target as HTMLButtonElement).style.opacity = '1';
          }}
        >
          Voir le détail →
        </button>
      </motion.div>

      {/* Modale */}
      <AnimatePresence>
        {modalOpen && (
          <AICoachModal type={type} detail={detail} onClose={() => setModalOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Modale détail ────────────────────────────────────────────────────────

interface AICoachModalProps {
  type: 'before_session' | 'after_session';
  detail: BeforeSessionAdvice | AfterSessionAnalysis | undefined;
  onClose: () => void;
}

function AICoachModal({ type, detail, onClose }: AICoachModalProps) {
  if (!detail) return null;

  const isBeforeSession = type === 'before_session';
  const advice = detail as BeforeSessionAdvice;
  const analysis = detail as AfterSessionAnalysis;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 'var(--z-modal)',
      }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '28px 28px 0 0',
          padding: 'var(--space-6)',
          paddingBottom: 'calc(var(--space-6) + 32px)', // Safe area pour iPhone
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle bar */}
        <div
          style={{
            height: '4px',
            width: '40px',
            backgroundColor: 'var(--color-border)',
            borderRadius: '2px',
            margin: '0 auto var(--space-4)',
          }}
        />

        {isBeforeSession ? (
          // Modale "before_session"
          <div>
            <h2
              style={{
                margin: '0 0 var(--space-2) 0',
                fontSize: 'var(--text-xl)',
                fontWeight: '700',
                color: 'var(--color-text)',
              }}
            >
              {advice.title}
            </h2>

            <p
              style={{
                margin: '0 0 var(--space-4) 0',
                fontSize: 'var(--text-sm)',
                lineHeight: '1.6',
                color: 'var(--color-text)',
              }}
            >
              {advice.text}
            </p>

            {/* Ajustements */}
            {advice.adjustments && advice.adjustments.length > 0 && (
              <div>
                <h3
                  style={{
                    margin: '0 0 var(--space-3) 0',
                    fontSize: 'var(--text-sm)',
                    fontWeight: '600',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Ajustements recommandés
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {advice.adjustments.map((adj, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: '#f9f5ff',
                        borderRadius: '12px',
                        padding: 'var(--space-3)',
                        border: '1px solid #e9e0ff',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-block',
                          backgroundColor: 'var(--color-primary)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: 'var(--text-xs)',
                          fontWeight: '600',
                          marginBottom: 'var(--space-2)',
                          marginRight: 'var(--space-2)',
                        }}
                      >
                        {adj.label}
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 'var(--text-sm)',
                          lineHeight: '1.5',
                          color: 'var(--color-text)',
                        }}
                      >
                        {adj.advice}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Modale "after_session"
          <div>
            <h2
              style={{
                margin: '0 0 var(--space-4) 0',
                fontSize: 'var(--text-xl)',
                fontWeight: '700',
                color: 'var(--color-text)',
              }}
            >
              Analyse de ta séance
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Performance */}
              <AnalysisBlock title={analysis.performance.title} text={analysis.performance.text} />

              {/* Cycle */}
              <AnalysisBlock title={analysis.cycle.title} text={analysis.cycle.text} />

              {/* Récupération */}
              <AnalysisBlock title={analysis.recovery.title} text={analysis.recovery.text} />

              {/* Prochaine séance */}
              <AnalysisBlock title={analysis.nextSession.title} text={analysis.nextSession.text} />
            </div>
          </div>
        )}

        {/* Bouton fermeture */}
        <button
          onClick={onClose}
          style={{
            marginTop: 'var(--space-6)',
            width: '100%',
            padding: 'var(--space-3)',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            fontSize: 'var(--text-base)',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Fermer
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Bloc d'analyse ───────────────────────────────────────────────────────

interface AnalysisBlockProps {
  title: string;
  text: string;
}

function AnalysisBlock({ title, text }: AnalysisBlockProps) {
  return (
    <div
      style={{
        backgroundColor: '#f9f5ff',
        borderRadius: '12px',
        padding: 'var(--space-3)',
        border: '1px solid #e9e0ff',
      }}
    >
      <h3
        style={{
          margin: '0 0 var(--space-2) 0',
          fontSize: 'var(--text-sm)',
          fontWeight: '600',
          color: 'var(--color-text)',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-sm)',
          lineHeight: '1.6',
          color: 'var(--color-text)',
        }}
      >
        {text}
      </p>
    </div>
  );
}
