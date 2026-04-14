// Page création de programme — multi-step avec drag & drop séances et exercices
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { getExerciseCatalog, getCustomExercises, createCustomExercise } from '@/services/exerciseService';
import { createProgram } from '@/services/programService';
import type {
  AnyExercise,
  ExerciseCatalogItem,
  CustomExercise,
  ExerciseInputType,
} from '@/types/workout';
import type { CreateSessionInput } from '@/services/programService';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Modal } from '@/components/ui/Modal';
import { ExerciseFormSheet } from '@/components/exercises/ExerciseFormSheet';
import { trackEvent } from '@/services/analyticsService';

// ─── Types locaux du brouillon ────────────────────────────────────────────────

interface ExerciseDraft {
  id: string;
  exercise: AnyExercise;
  sets: number;
  reps: string;
  weight: number | null;
  input_type: ExerciseInputType;
  rest_between_sets: number;
}

interface SessionDraft {
  id: string;
  name: string;
  exercises: ExerciseDraft[];
  /** Jours de la semaine planifiés (0=Lun … 6=Dim) */
  week_days: number[];
}

interface ProgramDraft {
  name: string;
  description: string;
  duration_weeks: string;
  sessions: SessionDraft[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const INPUT_TYPE_LABELS: Record<ExerciseInputType, string> = {
  weight_reps: 'Poids + Reps',
  bodyweight_reps: 'Poids du corps',
  cardio_duration: 'Durée',
  cardio_distance: 'Distance + Durée',
  weight_plus_load: 'Charge ajoutée',
};

const DRAFT_STORAGE_KEY = 'programNewPageDraft';

/** Vérifie si un brouillon contient des données saisies par l'utilisatrice */
function hasDraftContent(d: ProgramDraft): boolean {
  return d.name.trim() !== '' || d.sessions.length > 0;
}

// ─── Composant SortableSession ────────────────────────────────────────────────

// Abréviations des jours — Lun=0 à Dim=6
const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface SortableSessionProps {
  session: SessionDraft;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onEditExercises: (id: string) => void;
  onUpdateDays: (id: string, days: number[]) => void;
}

function SortableSession({
  session,
  onRename,
  onDelete,
  onEditExercises,
  onUpdateDays,
}: SortableSessionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: session.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        padding: 'var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      {/* Ligne principale : poignée + nom + jour */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {/* Poignée de drag */}
        <button
          {...attributes}
          {...listeners}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'grab',
            color: 'var(--color-text-muted)',
            padding: 'var(--space-1)',
            fontSize: 'var(--text-base)',
            flexShrink: 0,
          }}
        >
          ⠿
        </button>

        {/* Nom inline éditable — erreur si vide */}
        <input
          value={session.name}
          onChange={e => onRename(session.id, e.target.value)}
          placeholder="nom de la séance"
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            borderBottom: session.name.trim() === ''
              ? '1px solid var(--color-error)'
              : '1px solid transparent',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
            color: session.name.trim() === '' ? 'var(--color-error)' : 'var(--color-text)',
            fontFamily: 'var(--font-family)',
            padding: 0,
          }}
        />
      </div>

      {/* Sous-ligne : infos + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-family)',
          }}
        >
          {session.exercises.length} exercice{session.exercises.length !== 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            onClick={() => onEditExercises(session.id)}
            style={{
              background: 'none',
              border: '1px solid var(--color-primary)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-primary)',
              fontSize: 'var(--text-xs)',
              fontFamily: 'var(--font-family)',
              padding: '2px var(--space-2)',
              cursor: 'pointer',
            }}
          >
            modifier les exercices
          </button>
          <button
            onClick={() => onDelete(session.id)}
            style={{
              background: 'none',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-error)',
              fontSize: 'var(--text-xs)',
              fontFamily: 'var(--font-family)',
              padding: '2px var(--space-2)',
              cursor: 'pointer',
            }}
          >
            supprimer
          </button>
        </div>
      </div>

      {/* Sélecteur de jours — avertissement si aucun jour sélectionné */}
      {(session.week_days ?? []).length === 0 && (
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-xs)',
            color: 'var(--color-error)',
            fontFamily: 'var(--font-family)',
          }}
        >
          sélectionne au moins un jour — requis pour le calendrier
        </p>
      )}
      <div style={{ display: 'flex', gap: 'var(--space-1)', paddingTop: 'var(--space-1)' }}>
        {DAY_LABELS.map((label, idx) => {
          const active = (session.week_days ?? []).includes(idx);
          return (
            <button
              key={idx}
              onClick={() => {
                const prev = session.week_days ?? [];
                const next = active
                  ? prev.filter(d => d !== idx)
                  : [...prev, idx].sort();
                onUpdateDays(session.id, next);
              }}
              style={{
                flex: 1,
                padding: '4px 2px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                backgroundColor: active ? 'var(--color-primary)' : 'transparent',
                color: active ? 'var(--color-text-light)' : 'var(--color-text-muted)',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-family)',
                fontWeight: active ? 'var(--font-semibold)' : 'var(--font-normal)',
                cursor: 'pointer',
                transition: 'all var(--duration-fast)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Composant SortableExercise (dans le drawer) ──────────────────────────────

interface SortableExerciseProps {
  draft: ExerciseDraft;
  onUpdate: (id: string, updates: Partial<ExerciseDraft>) => void;
  onDelete: (id: string) => void;
}

function SortableExercise({ draft, onUpdate, onDelete }: SortableExerciseProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: draft.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: 'var(--color-bg)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        padding: 'var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      {/* Nom + poignée + supprimer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <button
          {...attributes}
          {...listeners}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'grab',
            color: 'var(--color-text-muted)',
            padding: 0,
            fontSize: 'var(--text-sm)',
            flexShrink: 0,
          }}
        >
          ⠿
        </button>
        <p
          style={{
            margin: 0,
            flex: 1,
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
            fontFamily: 'var(--font-family)',
          }}
        >
          {draft.exercise.name}
        </p>
        <button
          onClick={() => onDelete(draft.id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-error)',
            fontSize: 'var(--text-base)',
            padding: 0,
            flexShrink: 0,
          }}
        >
          🗑
        </button>
      </div>

      {/* Paramètres : séries, reps, poids, type, repos */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {/* Séries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 50px' }}>
          <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family)' }}>séries</label>
          <input
            type="number"
            min={1}
            max={20}
            value={draft.sets}
            onChange={e => onUpdate(draft.id, { sets: parseInt(e.target.value) || 1 })}
            style={numberInputStyle}
          />
        </div>

        {/* Reps — requis pour la séance active */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 60px' }}>
          <label style={{ fontSize: 'var(--text-xs)', color: draft.reps.trim() === '' ? 'var(--color-error)' : 'var(--color-text-muted)', fontFamily: 'var(--font-family)' }}>reps *</label>
          <input
            type="text"
            value={draft.reps}
            onChange={e => onUpdate(draft.id, { reps: e.target.value })}
            placeholder="8"
            style={{
              ...numberInputStyle,
              border: draft.reps.trim() === ''
                ? '1px solid var(--color-error)'
                : '1px solid var(--color-border)',
            }}
          />
        </div>

        {/* Poids (uniquement si type poids) */}
        {(draft.input_type === 'weight_reps' || draft.input_type === 'weight_plus_load') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 60px' }}>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family)' }}>kg</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={draft.weight ?? ''}
              onChange={e =>
                onUpdate(draft.id, { weight: e.target.value ? parseFloat(e.target.value) : null })
              }
              placeholder="60"
              style={numberInputStyle}
            />
          </div>
        )}

        {/* Type d'input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '2 1 120px' }}>
          <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family)' }}>type</label>
          <select
            value={draft.input_type}
            onChange={e =>
              onUpdate(draft.id, { input_type: e.target.value as ExerciseInputType })
            }
            style={{
              ...numberInputStyle,
              width: '100%',
            }}
          >
            {(Object.entries(INPUT_TYPE_LABELS) as [ExerciseInputType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Repos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 60px' }}>
          <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family)' }}>repos (s)</label>
          <input
            type="number"
            min={0}
            step={15}
            value={draft.rest_between_sets}
            onChange={e =>
              onUpdate(draft.id, { rest_between_sets: parseInt(e.target.value) || 150 })
            }
            style={numberInputStyle}
          />
        </div>
      </div>
    </div>
  );
}

const numberInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px var(--space-2)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 'var(--text-sm)',
  fontFamily: 'var(--font-family)',
  outline: 'none',
  boxSizing: 'border-box',
};

// ─── Composant aperçu calendrier hebdomadaire ─────────────────────────────────

const FULL_DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/** Couleurs cycliques pour distinguer les séances dans le calendrier */
const SESSION_COLORS = [
  'var(--color-primary)',
  'var(--color-ovulation)',
  'var(--color-follicular)',
  'var(--color-luteal)',
  'var(--color-menstrual)',
];

interface WeekCalendarPreviewProps {
  sessions: SessionDraft[];
}

function WeekCalendarPreview({ sessions }: WeekCalendarPreviewProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        padding: 'var(--space-3)',
      }}
    >
      <p
        style={{
          margin: '0 0 var(--space-2)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text)',
          fontFamily: 'var(--font-family)',
        }}
      >
        aperçu de la semaine
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {FULL_DAY_LABELS.map((label, dayIdx) => {
          // Séances planifiées ce jour-là
          const daySessions = sessions.filter(s => (s.week_days ?? []).includes(dayIdx));
          return (
            <div
              key={dayIdx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {/* En-tête jour */}
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {label}
              </span>
              {/* Pastilles de séances */}
              <div
                style={{
                  minHeight: '28px',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  alignItems: 'center',
                }}
              >
                {daySessions.map(s => {
                  const colorIdx = sessions.indexOf(s) % SESSION_COLORS.length;
                  return (
                    <div
                      key={s.id}
                      title={s.name}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: SESSION_COLORS[colorIdx],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: 'var(--color-text-light)',
                        fontFamily: 'var(--font-family)',
                        fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ProgramNewPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { showToast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor));

  // ─── État étapes ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);

  // ─── Brouillon du programme ───────────────────────────────────────────────
  const [draft, setDraft] = useState<ProgramDraft>({
    name: '',
    description: '',
    duration_weeks: '',
    sessions: [],
  });

  // ─── Validation step 1 ────────────────────────────────────────────────────
  const [nameError, setNameError] = useState<string | null>(null);

  // ─── Drawer exercices ─────────────────────────────────────────────────────
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState<string>('Tous');
  const [catalogItems, setCatalogItems] = useState<ExerciseCatalogItem[]>([]);
  const [customItems, setCustomItems] = useState<CustomExercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [showCreateExercise, setShowCreateExercise] = useState(false);

  // ─── Confirmation abandon ─────────────────────────────────────────────────
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // ─── Sauvegarde auto + restauration brouillon ──────────────────────────────
  const [saving, setSaving] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [savedDraft, setSavedDraft] = useState<ProgramDraft | null>(null);

  // Restauration du brouillon au montage
  useEffect(() => {
    const savedDraftStr = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraftStr) {
      try {
        const parsedDraft = JSON.parse(savedDraftStr) as ProgramDraft;
        // N'affiche la modale que si le brouillon contient des données réelles
        if (hasDraftContent(parsedDraft)) {
          setSavedDraft(parsedDraft);
          setShowRestoreModal(true);
        } else {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      } catch {
        // Ignore les brouillons corrompus
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }
  }, []);

  // Sauvegarde auto du brouillon uniquement si des données ont été saisies
  useEffect(() => {
    if (hasDraftContent(draft)) {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }
  }, [draft]);

  // Charge les exercices quand le drawer s'ouvre
  useEffect(() => {
    if (!editingSessionId || !user) return;
    loadExercises();
  }, [editingSessionId, exerciseSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadExercises = useCallback(async () => {
    if (!user) return;
    setLoadingExercises(true);
    const [catalogResult, customResult] = await Promise.all([
      getExerciseCatalog({ search: exerciseSearch || undefined }),
      getCustomExercises(user.id),
    ]);
    setLoadingExercises(false);
    setCatalogItems(catalogResult.data ?? []);
    setCustomItems(customResult.data ?? []);
  }, [user, exerciseSearch]);

  // ─── Handlers draft ──────────────────────────────────────────────────────

  function addSession() {
    const newSession: SessionDraft = {
      id: crypto.randomUUID(),
      name: `Séance ${draft.sessions.length + 1}`,
      exercises: [],
      week_days: [],
    };
    setDraft(prev => ({ ...prev, sessions: [...prev.sessions, newSession] }));
  }

  function updateSessionDays(sessionId: string, days: number[]) {
    setDraft(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => (s.id === sessionId ? { ...s, week_days: days } : s)),
    }));
  }

  function renameSession(sessionId: string, name: string) {
    setDraft(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => (s.id === sessionId ? { ...s, name } : s)),
    }));
  }

  function deleteSession(sessionId: string) {
    setDraft(prev => ({
      ...prev,
      sessions: prev.sessions.filter(s => s.id !== sessionId),
    }));
  }

  function handleSessionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDraft(prev => {
      const oldIndex = prev.sessions.findIndex(s => s.id === active.id);
      const newIndex = prev.sessions.findIndex(s => s.id === over.id);
      return { ...prev, sessions: arrayMove(prev.sessions, oldIndex, newIndex) };
    });
  }

  // ─── Handlers exercices (dans le drawer) ──────────────────────────────────

  function addExerciseToSession(sessionId: string, exercise: AnyExercise) {
    const newExercise: ExerciseDraft = {
      id: crypto.randomUUID(),
      exercise,
      sets: 3,
      reps: '8',
      weight: null,
      input_type: 'weight_reps',
      rest_between_sets: 150,
    };
    setDraft(prev => ({
      ...prev,
      sessions: prev.sessions.map(s =>
        s.id === sessionId
          ? { ...s, exercises: [...s.exercises, newExercise] }
          : s
      ),
    }));
  }

  function updateExerciseInSession(
    sessionId: string,
    exerciseId: string,
    updates: Partial<ExerciseDraft>
  ) {
    setDraft(prev => ({
      ...prev,
      sessions: prev.sessions.map(s =>
        s.id === sessionId
          ? {
              ...s,
              exercises: s.exercises.map(e =>
                e.id === exerciseId ? { ...e, ...updates } : e
              ),
            }
          : s
      ),
    }));
  }

  function deleteExerciseFromSession(sessionId: string, exerciseId: string) {
    setDraft(prev => ({
      ...prev,
      sessions: prev.sessions.map(s =>
        s.id === sessionId
          ? { ...s, exercises: s.exercises.filter(e => e.id !== exerciseId) }
          : s
      ),
    }));
  }

  function handleExerciseDragEnd(sessionId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDraft(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => {
        if (s.id !== sessionId) return s;
        const oldIndex = s.exercises.findIndex(e => e.id === active.id);
        const newIndex = s.exercises.findIndex(e => e.id === over.id);
        return { ...s, exercises: arrayMove(s.exercises, oldIndex, newIndex) };
      }),
    }));
  }

  // ─── Validation step 1 → step 2 ──────────────────────────────────────────

  function goToStep2() {
    if (!draft.name.trim()) {
      setNameError('le nom est obligatoire.');
      return;
    }
    setNameError(null);
    setStep(2);
  }

  // ─── Validation finale et sauvegarde ─────────────────────────────────────

  async function handleSave() {
    if (!user) return;

    // Vérifie qu'au moins une séance existe
    if (draft.sessions.length === 0) {
      showToast('ajoute au moins une séance.', 'error');
      return;
    }

    // Vérifie que chaque séance a un nom
    const sessionWithoutName = draft.sessions.find(s => !s.name.trim());
    if (sessionWithoutName) {
      showToast('chaque séance doit avoir un nom.', 'error');
      return;
    }

    // Vérifie que chaque séance a au moins un exercice
    const sessionWithoutExercise = draft.sessions.find(s => s.exercises.length === 0);
    if (sessionWithoutExercise) {
      showToast(`la séance "${sessionWithoutExercise.name.trim() || 'sans nom'}" n'a aucun exercice.`, 'error');
      return;
    }

    // Vérifie que chaque séance a au moins un jour sélectionné
    const sessionWithoutDay = draft.sessions.find(s => (s.week_days ?? []).length === 0);
    if (sessionWithoutDay) {
      showToast(`la séance "${sessionWithoutDay.name.trim() || 'sans nom'}" n'a aucun jour sélectionné.`, 'error');
      return;
    }

    setSaving(true);

    const sessionsInput: CreateSessionInput[] = draft.sessions.map((s, sIdx) => ({
      name: s.name,
      order_index: sIdx,
      // Premier jour sélectionné (0=Lun … 6=Dim), undefined si aucun
      day_of_week: s.week_days?.[0] !== undefined ? s.week_days[0] : undefined,
      exercises: s.exercises.map((e, eIdx) => ({
        exercise_catalog_id:
          e.exercise.source === 'catalog' ? e.exercise.id : undefined,
        user_custom_exercise_id:
          e.exercise.source === 'custom' ? e.exercise.id : undefined,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight ?? undefined,
        input_type: e.input_type,
        rest_between_sets: e.rest_between_sets,
        order_index: eIdx,
      })),
    }));

    const { data: programId, error } = await createProgram(user.id, {
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      duration_weeks: draft.duration_weeks && draft.duration_weeks !== 'indeterminate' ? parseInt(draft.duration_weeks) : undefined,
      sessions: sessionsInput,
    });

    setSaving(false);

    if (error) {
      console.error('[ProgramNewPage] Erreur création programme:', error);
      showToast(`impossible de créer le programme: ${error}`, 'error');
      return;
    }

    // Efface le brouillon après succès
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    showToast('programme créé 🖤', 'success');
    // Track la création de programme — one-time
    trackEvent('training_filled', { sessions_count: sessionsInput.length });
    navigate(`/programs/${programId}`, { replace: true });
  }

  // ─── Gestion abandon avec données ────────────────────────────────────────

  function handleBack() {
    if (step === 2) {
      setStep(1);
      return;
    }
    // Step 1 : si données saisies, demander confirmation
    if (draft.name || draft.sessions.length > 0) {
      setShowLeaveModal(true);
    } else {
      navigate(-1);
    }
  }

  // Séance en cours d'édition
  const editingSession = draft.sessions.find(s => s.id === editingSessionId) ?? null;

  // Exercices déjà ajoutés à la séance en édition (pour griser dans la liste)
  const addedExerciseIds = new Set(
    editingSession?.exercises.map(e => e.exercise.id) ?? []
  );

  // Combine catalogue et exercices perso pour la recherche, avec filtre catégorie
  const allExercises: AnyExercise[] = [...catalogItems, ...customItems].filter(e => {
    if (exerciseCategoryFilter !== 'Tous' && e.category !== exerciseCategoryFilter) return false;
    return true;
  });

  // Handler création exercice perso depuis le drawer
  async function handleCreateCustomExercise(
    data: Omit<CustomExercise, 'id' | 'user_id' | 'source' | 'created_at'>
  ) {
    if (!user) return;
    const { data: created, error } = await createCustomExercise(user.id, data);
    if (error || !created) {
      showToast('impossible de créer l\'exercice.', 'error');
      return;
    }
    // Rafraîchit la liste et ajoute l'exercice direct à la séance
    setCustomItems(prev => [...prev, created]);
    setShowCreateExercise(false);
    if (editingSessionId) {
      addExerciseToSession(editingSessionId, created);
    }
    showToast('exercice créé et ajouté.', 'success');
  }

  return (
    <div style={{ padding: 'var(--space-6) var(--space-4) var(--space-8)', minHeight: '100vh' }}>
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
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 'var(--text-xl)',
            color: 'var(--color-text)',
            padding: 0,
          }}
        >
          ←
        </button>
        <h1
          style={{
            margin: 0,
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
            fontFamily: 'var(--font-family)',
          }}
        >
          {step === 1 ? 'nouveau programme' : 'séances'}
        </h1>
      </div>

      {/* Indicateur d'étape */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {[1, 2].map(s => (
          <div
            key={s}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: step >= s ? 'var(--color-primary)' : 'var(--color-border)',
              transition: 'background-color var(--duration-normal)',
            }}
          />
        ))}
      </div>

      {/* ─── Étape 1 : Informations générales ─── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h2
            style={{
              margin: 0,
              fontSize: 'var(--text-lg)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-family)',
            }}
          >
            comment tu appelles ce programme ?
          </h2>

          <InputField
            id="prog-name"
            label="nom *"
            value={draft.name}
            onChange={e => { setDraft(prev => ({ ...prev, name: e.target.value })); setNameError(null); }}
            error={nameError ?? undefined}
            placeholder="ex: Programme Jambes 3x"
          />

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label
              htmlFor="prog-desc"
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text)',
                fontFamily: 'var(--font-family)',
              }}
            >
              description
            </label>
            <textarea
              id="prog-desc"
              value={draft.description}
              onChange={e => setDraft(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="objectifs, contexte..."
              style={{
                width: '100%',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: 'var(--text-base)',
                fontFamily: 'var(--font-family)',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Durée */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label
              htmlFor="prog-duration"
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text)',
                fontFamily: 'var(--font-family)',
              }}
            >
              durée
            </label>
            <select
              id="prog-duration"
              value={draft.duration_weeks === 'indeterminate' ? 'indeterminate' : 'specific'}
              onChange={e => {
                if (e.target.value === 'indeterminate') {
                  setDraft(prev => ({ ...prev, duration_weeks: 'indeterminate' }));
                } else {
                  setDraft(prev => ({ ...prev, duration_weeks: '' }));
                }
              }}
              style={{
                width: '100%',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: 'var(--text-base)',
                fontFamily: 'var(--font-family)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              <option value="specific">durée spécifique</option>
              <option value="indeterminate">durée indéterminée</option>
            </select>
          </div>

          {/* Champ durée en semaines (visible si "durée spécifique") */}
          {draft.duration_weeks !== 'indeterminate' && (
            <InputField
              id="prog-weeks"
              label="nombre de semaines *"
              type="number"
              min={1}
              max={52}
              value={draft.duration_weeks === 'indeterminate' ? '' : draft.duration_weeks}
              onChange={e => setDraft(prev => ({ ...prev, duration_weeks: e.target.value }))}
              placeholder="ex: 8"
            />
          )}

          <PrimaryButton
            onClick={goToStep2}
            disabled={!draft.name.trim()}
          >
            ajouter des séances →
          </PrimaryButton>
        </div>
      )}

      {/* ─── Étape 2 : Construction des séances ─── */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSessionDragEnd}
          >
            <SortableContext
              items={draft.sessions.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {draft.sessions.map(session => (
                  <SortableSession
                    key={session.id}
                    session={session}
                    onRename={renameSession}
                    onDelete={deleteSession}
                    onEditExercises={sid => { setEditingSessionId(sid); setExerciseSearch(''); setExerciseCategoryFilter('Tous'); }}
                    onUpdateDays={updateSessionDays}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Aperçu calendrier hebdomadaire */}
          {draft.sessions.some(s => (s.week_days ?? []).length > 0) && (
            <WeekCalendarPreview sessions={draft.sessions} />
          )}

          {/* Bouton ajouter une séance */}
          <button
            onClick={addSession}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1.5px dashed var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-primary)',
              fontSize: 'var(--text-base)',
              fontFamily: 'var(--font-family)',
              cursor: 'pointer',
            }}
          >
            + ajouter une séance
          </button>

          {/* CTA enregistrer */}
          <PrimaryButton
            onClick={handleSave}
            loading={saving}
            disabled={!draft.sessions.some(s => s.exercises.length > 0)}
          >
            enregistrer le programme
          </PrimaryButton>
        </div>
      )}

      {/* ─── Drawer exercices par séance ─── */}
      {editingSessionId && editingSession && (
        <div
          onClick={() => setEditingSessionId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(47, 0, 87, 0.4)',
            zIndex: 'var(--z-overlay)' as React.CSSProperties['zIndex'],
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              height: '90vh',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideUp var(--duration-slow) ease both',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* En-tête drawer */}
            <div
              style={{
                padding: 'var(--space-4)',
                borderBottom: '1px solid var(--color-border)',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '4px',
                  backgroundColor: 'var(--color-border)',
                  borderRadius: 'var(--radius-full)',
                  margin: '0 auto var(--space-3)',
                }}
              />
              <h3
                style={{
                  margin: '0 0 var(--space-3)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {editingSession.name}
              </h3>

              {/* Recherche dans la bibliothèque */}
              <input
                type="search"
                placeholder="rechercher un exercice..."
                value={exerciseSearch}
                onChange={e => setExerciseSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-full)',
                  border: '1.5px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-family)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Corps principal : deux sections */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {/* Section haute : recherche + résultats (max 40%, scrollable) */}
              <div style={{ flex: '0 1 40%', overflowY: 'auto', padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
                {/* Résultats de recherche */}
                {loadingExercises ? (
                  <p
                    style={{
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-family)',
                      fontSize: 'var(--text-sm)',
                      padding: 'var(--space-4)',
                    }}
                  >
                    chargement...
                  </p>
                ) : (
                  <div>
                    {allExercises.filter(e => !addedExerciseIds.has(e.id)).length === 0 && (
                      <p
                        style={{
                          textAlign: 'center',
                          color: 'var(--color-text-muted)',
                          fontFamily: 'var(--font-family)',
                          fontSize: 'var(--text-sm)',
                          padding: 'var(--space-4)',
                        }}
                      >
                        aucun exercice trouvé
                      </p>
                    )}
                    {allExercises.filter(e => !addedExerciseIds.has(e.id)).map(exercise => (
                      <button
                        key={exercise.id}
                        onClick={() => addExerciseToSession(editingSessionId, exercise)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 'var(--space-2) var(--space-3)',
                          backgroundColor: 'var(--color-bg)',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          marginBottom: 'var(--space-1)',
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
                            {exercise.name}
                          </p>
                          <p style={{ margin: '1px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                            {exercise.category}
                            {exercise.type ? ` · ${exercise.type}` : ''}
                          </p>
                        </div>
                        <span style={{ color: 'var(--color-primary)', fontSize: 'var(--text-base)' }}>+</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bouton création exercice perso — toujours visible, hors scroll */}
              <div
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  borderBottom: '1px solid var(--color-border)',
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={() => setShowCreateExercise(true)}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    backgroundColor: 'transparent',
                    border: '1.5px dashed var(--color-primary)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-primary)',
                    fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-family)',
                    fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  + créer un exercice
                </button>
              </div>

              {/* Section basse : "dans cette séance" (toujours visible) */}
              <div style={{ flex: '1 1 60%', overflowY: 'auto', padding: 'var(--space-3) var(--space-4)', display: 'flex', flexDirection: 'column' }}>
                {editingSession.exercises.length === 0 ? (
                  <p
                    style={{
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-family)',
                      fontSize: 'var(--text-sm)',
                      padding: 'var(--space-4)',
                    }}
                  >
                    aucun exercice dans cette séance. ajoutes-en un au-dessus.
                  </p>
                ) : (
                  <div>
                    <p
                      style={{
                        margin: '0 0 var(--space-2)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                        color: 'var(--color-text)',
                        fontFamily: 'var(--font-family)',
                      }}
                    >
                      dans cette séance
                    </p>

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={e => handleExerciseDragEnd(editingSessionId, e)}
                    >
                      <SortableContext
                        items={editingSession.exercises.map(e => e.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                          {editingSession.exercises.map(ex => (
                            <SortableExercise
                              key={ex.id}
                              draft={ex}
                              onUpdate={(id, updates) =>
                                updateExerciseInSession(editingSessionId, id, updates)
                              }
                              onDelete={id => deleteExerciseFromSession(editingSessionId, id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            </div>

            {/* Footer drawer */}
            <div
              style={{
                padding: 'var(--space-4)',
                borderTop: '1px solid var(--color-border)',
                flexShrink: 0,
              }}
            >
              <PrimaryButton onClick={() => setEditingSessionId(null)}>
                valider
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet création exercice perso */}
      <ExerciseFormSheet
        isOpen={showCreateExercise}
        exercise={null}
        onSave={handleCreateCustomExercise}
        onClose={() => setShowCreateExercise(false)}
      />

      {/* Modal confirmation abandon */}
      <Modal
        isOpen={showLeaveModal}
        title="quitter sans sauvegarder ?"
        confirmLabel="quitter"
        cancelLabel="continuer"
        isDanger
        onConfirm={() => navigate(-1)}
        onCancel={() => setShowLeaveModal(false)}
      >
        tes modifications seront perdues.
      </Modal>

      {/* Modal restauration brouillon */}
      <Modal
        isOpen={showRestoreModal}
        title="reprendre ton brouillon ?"
        confirmLabel="reprendre"
        cancelLabel="nouveau"
        onConfirm={() => {
          if (savedDraft) {
            setDraft(savedDraft);
          }
          setShowRestoreModal(false);
        }}
        onCancel={() => {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
          setShowRestoreModal(false);
        }}
      >
        tu avais un programme en cours. tu veux le reprendre ou en créer un nouveau ?
      </Modal>
    </div>
  );
}
