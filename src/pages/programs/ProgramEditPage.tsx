// Page modification d'un programme — multi-step avec drag & drop séances et exercices
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
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
import {
  getProgramDetail,
  updateProgram,
  updateSession,
  deleteSession,
  updateSessionExercise,
  deleteSessionExercise,
  reorderSessions,
  reorderExercises,
} from '@/services/programService';
import { getExerciseCatalog, getCustomExercises, createCustomExercise } from '@/services/exerciseService';
import type {
  AnyExercise,
  ExerciseCatalogItem,
  CustomExercise,
  ExerciseInputType,
  Program,
  ProgramSession,
} from '@/types/workout';
import type { SessionWithExercises } from '@/services/programService';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Modal } from '@/components/ui/Modal';
import { ExerciseFormSheet } from '@/components/exercises/ExerciseFormSheet';

// ─── Types locaux du brouillon ────────────────────────────────────────────────

interface ExerciseDraft {
  id: string;
  dbId: string | null; // ID en base, null si exercice ajouté localement
  exercise: AnyExercise;
  sets: number;
  reps: string;
  weight: number | null;
  input_type: ExerciseInputType;
  rest_between_sets: number;
}

interface SessionDraft {
  id: string;
  dbId: string | null; // ID en base, null si séance ajoutée localement
  name: string;
  exercises: ExerciseDraft[];
  week_days: number[];
}

interface ProgramDraft {
  id: string;
  name: string;
  description: string;
  duration_weeks: string;
  sessions: SessionDraft[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const EXERCISE_CATEGORIES = ['Tous', 'Haut du corps', 'Bas du corps', 'Full Body', 'Cardio', 'Mobilité'] as const;

const INPUT_TYPE_LABELS: Record<ExerciseInputType, string> = {
  weight_reps: 'Poids + Reps',
  bodyweight_reps: 'Poids du corps',
  cardio_duration: 'Durée',
  cardio_distance: 'Distance + Durée',
  weight_plus_load: 'Charge ajoutée',
};

// ─── Composant SortableSession ────────────────────────────────────────────────

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
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

      {/* Avertissement si aucun jour sélectionné — requis pour le calendrier */}
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

// ─── Composant SortableExercise ────────────────────────────────────────────────

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

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: 'var(--color-bg)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        padding: 'var(--space-2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
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

        <p
          style={{
            margin: 0,
            flex: 1,
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
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

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
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

// ─── Composant principal ProgramEditPage ───────────────────────────────────────

export function ProgramEditPage() {
  const { id: programId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { showToast } = useToast();

  // États de chargement
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProgramDraft | null>(null);

  // États d'édition
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [catalogItems, setCatalogItems] = useState<ExerciseCatalogItem[]>([]);
  const [customItems, setCustomItems] = useState<CustomExercise[]>([]);
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState<typeof EXERCISE_CATEGORIES[number]>('Tous');
  const [showCreateExercise, setShowCreateExercise] = useState(false);

  // États de sauvegarde
  const [saving, setSaving] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    })
  );

  // Charge les données du programme au montage
  useEffect(() => {
    if (!programId) return;
    loadProgram(programId);
  }, [programId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProgram(id: string) {
    setLoading(true);
    const { data, error: detailError } = await getProgramDetail(id);
    setLoading(false);

    if (detailError || !data) {
      setError(detailError ?? 'programme introuvable.');
      return;
    }

    const { program, sessions } = data;

    // Transforme les données du programme en brouillon
    const sessionDrafts: SessionDraft[] = sessions.map((sw: SessionWithExercises, sIdx: number) => ({
      id: sw.session.id,
      dbId: sw.session.id,
      name: sw.session.name,
      week_days: sw.session.day_of_week !== null ? [sw.session.day_of_week] : [],
      exercises: sw.exercises.map((se, eIdx) => ({
        id: se.sessionExercise.id,
        dbId: se.sessionExercise.id,
        exercise: se.exercise!,
        sets: se.sessionExercise.sets ?? 3,
        reps: se.sessionExercise.reps ?? '8',
        weight: se.sessionExercise.weight ?? null,
        input_type: se.sessionExercise.input_type ?? 'weight_reps',
        rest_between_sets: se.sessionExercise.rest_between_sets ?? 150,
      })),
    }));

    setDraft({
      id: program.id,
      name: program.name,
      description: program.description ?? '',
      duration_weeks: program.duration_weeks ? String(program.duration_weeks) : 'indeterminate',
      sessions: sessionDrafts,
    });

    // Charge les exercices pour la recherche
    const { data: catalog } = await getExerciseCatalog();
    const { data: custom } = await getCustomExercises(user?.id ?? '');
    setCatalogItems(catalog ?? []);
    setCustomItems(custom ?? []);
  }

  // Handlers pour les mises à jour
  function updateSessionName(sessionId: string, name: string) {
    setDraft(prev =>
      prev
        ? {
          ...prev,
          sessions: prev.sessions.map(s => (s.id === sessionId ? { ...s, name } : s)),
        }
        : null
    );
  }

  function deleteSessionFromDraft(sessionId: string) {
    setShowDeleteSessionModal(sessionId);
  }

  async function confirmDeleteSession(sessionId: string) {
    const session = draft?.sessions.find(s => s.id === sessionId);
    if (session?.dbId) {
      // Appelle le service pour supprimer la séance en base
      const { error: deleteError } = await deleteSession(session.dbId);
      if (deleteError) {
        showToast('impossible de supprimer la séance.', 'error');
        setShowDeleteSessionModal(null);
        return;
      }
    }

    setDraft(prev =>
      prev
        ? {
          ...prev,
          sessions: prev.sessions.filter(s => s.id !== sessionId),
        }
        : null
    );
    setShowDeleteSessionModal(null);
    showToast('séance supprimée.', 'info');
  }

  function updateSessionDays(sessionId: string, days: number[]) {
    setDraft(prev =>
      prev
        ? {
          ...prev,
          sessions: prev.sessions.map(s => (s.id === sessionId ? { ...s, week_days: days } : s)),
        }
        : null
    );
  }

  function updateExercise(sessionId: string, exerciseId: string, updates: Partial<ExerciseDraft>) {
    setDraft(prev =>
      prev
        ? {
          ...prev,
          sessions: prev.sessions.map(s =>
            s.id === sessionId
              ? {
                ...s,
                exercises: s.exercises.map(e => (e.id === exerciseId ? { ...e, ...updates } : e)),
              }
              : s
          ),
        }
        : null
    );
  }

  function deleteExerciseFromSession(sessionId: string, exerciseId: string) {
    setDraft(prev =>
      prev
        ? {
          ...prev,
          sessions: prev.sessions.map(s =>
            s.id === sessionId
              ? { ...s, exercises: s.exercises.filter(e => e.id !== exerciseId) }
              : s
          ),
        }
        : null
    );
  }

  async function handleExerciseDelete(sessionId: string, exerciseId: string) {
    const exercise = draft?.sessions
      .find(s => s.id === sessionId)
      ?.exercises.find(e => e.id === exerciseId);

    if (exercise?.dbId) {
      const { error: deleteError } = await deleteSessionExercise(exercise.dbId);
      if (deleteError) {
        showToast('impossible de supprimer l\'exercice.', 'error');
        return;
      }
    }

    deleteExerciseFromSession(sessionId, exerciseId);
  }

  function handleSessionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !draft) return;

    const oldIndex = draft.sessions.findIndex(s => s.id === active.id);
    const newIndex = draft.sessions.findIndex(s => s.id === over.id);

    setDraft({
      ...draft,
      sessions: arrayMove(draft.sessions, oldIndex, newIndex),
    });
  }

  function handleExerciseDragEnd(sessionId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !draft) return;

    setDraft(prev =>
      prev
        ? {
          ...prev,
          sessions: prev.sessions.map(s => {
            if (s.id !== sessionId) return s;
            const oldIndex = s.exercises.findIndex(e => e.id === active.id);
            const newIndex = s.exercises.findIndex(e => e.id === over.id);
            return { ...s, exercises: arrayMove(s.exercises, oldIndex, newIndex) };
          }),
        }
        : null
    );
  }

  async function handleAddExercise(exercise: AnyExercise) {
    if (!editingSessionId || !draft) return;

    const newExercise: ExerciseDraft = {
      id: `local_${Date.now()}`,
      dbId: null,
      exercise,
      sets: 3,
      reps: '8',
      weight: null,
      input_type: 'weight_reps',
      rest_between_sets: 150,
    };

    setDraft({
      ...draft,
      sessions: draft.sessions.map(s =>
        s.id === editingSessionId ? { ...s, exercises: [...s.exercises, newExercise] } : s
      ),
    });

    setEditingSessionId(null);
  }

  // Handler création exercice perso
  async function handleCreateCustomExercise(
    data: Omit<CustomExercise, 'id' | 'user_id' | 'source' | 'created_at'>
  ) {
    if (!user) return;
    const { data: created, error } = await createCustomExercise(user.id, data);
    if (error || !created) {
      showToast('impossible de créer l\'exercice.', 'error');
      return;
    }
    setCustomItems(prev => [...prev, created]);
    setShowCreateExercise(false);
    if (editingSessionId) {
      handleAddExercise(created);
    }
    showToast('exercice créé et ajouté.', 'success');
  }

  async function handleSave() {
    if (!user || !draft) return;

    // Validations
    if (!draft.name.trim()) {
      showToast('le nom du programme est obligatoire.', 'error');
      return;
    }

    const hasValidSession = draft.sessions.some(s => s.exercises.length > 0);
    if (!hasValidSession) {
      showToast('ajoute au moins une séance avec un exercice.', 'error');
      return;
    }

    setSaving(true);

    try {
      // Met à jour le programme
      const { error: programError } = await updateProgram(draft.id, {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        duration_weeks: draft.duration_weeks && draft.duration_weeks !== 'indeterminate' ? parseInt(draft.duration_weeks) : null,
      });

      if (programError) {
        showToast(`erreur: ${programError}`, 'error');
        setSaving(false);
        return;
      }

      // Met à jour les séances
      for (let sIdx = 0; sIdx < draft.sessions.length; sIdx++) {
        const session = draft.sessions[sIdx];
        if (session.dbId) {
          const { error: sessionError } = await updateSession(session.dbId, {
            name: session.name,
            day_of_week: session.week_days?.[0] ?? null,
            order_index: sIdx,
          });
          if (sessionError) {
            showToast(`erreur séance: ${sessionError}`, 'error');
            setSaving(false);
            return;
          }
        }

        // Met à jour les exercices
        for (let eIdx = 0; eIdx < session.exercises.length; eIdx++) {
          const exercise = session.exercises[eIdx];
          if (exercise.dbId) {
            const { error: exerciseError } = await updateSessionExercise(exercise.dbId, {
              sets: exercise.sets,
              reps: exercise.reps,
              weight: exercise.weight,
              input_type: exercise.input_type,
              rest_between_sets: exercise.rest_between_sets,
              order_index: eIdx,
            });
            if (exerciseError) {
              showToast(`erreur exercice: ${exerciseError}`, 'error');
              setSaving(false);
              return;
            }
          }
        }
      }

      setSaving(false);
      showToast('programme mis à jour 🖤', 'success');
      navigate(`/programs/${draft.id}`, { replace: true });
    } catch (err) {
      console.error('[ProgramEditPage] Erreur sauvegarde:', err);
      setSaving(false);
      showToast('erreur lors de la sauvegarde.', 'error');
    }
  }

  function handleBack() {
    navigate(-1);
  }

  const editingSession = draft?.sessions.find(s => s.id === editingSessionId) ?? null;
  const addedExerciseIds = new Set(editingSession?.exercises.map(e => e.exercise.id) ?? []);

  const allExercises: AnyExercise[] = [...catalogItems, ...customItems].filter(e => {
    if (exerciseCategoryFilter !== 'Tous' && e.category !== exerciseCategoryFilter) return false;
    return true;
  });

  // ─── États de chargement et erreur ─────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-6) var(--space-4)' }}>
        <div style={{ height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)', marginBottom: 'var(--space-4)', opacity: 0.6 }} />
        <div style={{ height: '200px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', opacity: 0.4 }} />
      </div>
    );
  }

  if (error || !draft) {
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

  return (
    <div style={{ padding: 'var(--space-6) var(--space-4) var(--space-8)' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 'var(--text-2xl)',
            color: 'var(--color-text)',
            padding: 0,
          }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontFamily: 'var(--font-family)', color: 'var(--color-text)' }}>
          modifier le programme
        </h1>
      </div>

      {/* Informations programme */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <InputField
          label="nom du programme"
          value={draft.name}
          onChange={e => setDraft(prev => prev ? { ...prev, name: e.target.value } : null)}
          required
        />
        <InputField
          label="description (optionnel)"
          value={draft.description}
          onChange={e => setDraft(prev => prev ? { ...prev, description: e.target.value } : null)}
          placeholder="ex: focus jambes"
        />
        <InputField
          label="durée en semaines (optionnel)"
          type="number"
          value={draft.duration_weeks === 'indeterminate' ? '' : draft.duration_weeks}
          onChange={e => setDraft(prev => prev ? { ...prev, duration_weeks: e.target.value || 'indeterminate' } : null)}
          placeholder="8"
        />
      </div>

      {/* Séances */}
      <h2 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-xl)', fontFamily: 'var(--font-family)', color: 'var(--color-text)' }}>
        séances
      </h2>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSessionDragEnd}>
        <SortableContext items={draft.sessions.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            {draft.sessions.map(session => (
              <SortableSession
                key={session.id}
                session={session}
                onRename={(id, name) => updateSessionName(id, name)}
                onDelete={deleteSessionFromDraft}
                onEditExercises={setEditingSessionId}
                onUpdateDays={updateSessionDays}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Drawer édition exercices */}
      {editingSession && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            top: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
          onClick={() => setEditingSessionId(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
              padding: 'var(--space-4)',
              maxHeight: '80vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-lg)', fontFamily: 'var(--font-family)', color: 'var(--color-text)' }}>
              exercices de "{editingSession.name}"
            </h3>

            {/* Exercices actuels */}
            {editingSession.exercises.length > 0 && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', fontFamily: 'var(--font-family)', color: 'var(--color-text)' }}>
                  exercices
                </p>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleExerciseDragEnd(editingSession.id, e)}>
                  <SortableContext items={editingSession.exercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {editingSession.exercises.map(exercise => (
                        <SortableExercise
                          key={exercise.id}
                          draft={exercise}
                          onUpdate={(id, updates) => updateExercise(editingSession.id, id, updates)}
                          onDelete={(id) => handleExerciseDelete(editingSession.id, id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* Filtre catégories */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
              {EXERCISE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setExerciseCategoryFilter(cat)}
                  style={{
                    padding: '4px var(--space-2)',
                    borderRadius: 'var(--radius-full)',
                    border: `1px solid ${exerciseCategoryFilter === cat ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    backgroundColor: exerciseCategoryFilter === cat ? 'var(--color-primary)' : 'transparent',
                    color: exerciseCategoryFilter === cat ? 'var(--color-text-light)' : 'var(--color-text)',
                    fontSize: 'var(--text-xs)',
                    fontFamily: 'var(--font-family)',
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Liste exercices disponibles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              {allExercises.map(exercise => {
                const isAdded = addedExerciseIds.has(exercise.id);
                return (
                  <button
                    key={exercise.id}
                    onClick={() => !isAdded && handleAddExercise(exercise)}
                    disabled={isAdded}
                    style={{
                      textAlign: 'left',
                      padding: 'var(--space-2)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: isAdded ? 'var(--color-border)' : 'var(--color-bg)',
                      color: isAdded ? 'var(--color-text-muted)' : 'var(--color-text)',
                      cursor: isAdded ? 'not-allowed' : 'pointer',
                      opacity: isAdded ? 0.5 : 1,
                      fontFamily: 'var(--font-family)',
                    }}
                  >
                    {exercise.name}
                  </button>
                );
              })}
            </div>

            {/* Actions du drawer */}
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <PrimaryButton variant="secondary" onClick={() => setEditingSessionId(null)} style={{ flex: 1 }}>
                fermer
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Boutons d'action */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', paddingTop: 'var(--space-4)' }}>
        <PrimaryButton
          variant="secondary"
          onClick={handleBack}
          style={{ flex: 1 }}
          disabled={saving}
        >
          annuler
        </PrimaryButton>
        <PrimaryButton
          onClick={handleSave}
          style={{ flex: 1 }}
          disabled={saving}
        >
          {saving ? '⏳' : 'enregistrer'}
        </PrimaryButton>
      </div>

      {/* Modal suppression séance */}
      <Modal
        isOpen={showDeleteSessionModal !== null}
        title="supprimer cette séance ?"
        onClose={() => setShowDeleteSessionModal(null)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            les exercices de cette séance seront supprimés. l'historique des séances complétées sera conservé.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <PrimaryButton variant="secondary" onClick={() => setShowDeleteSessionModal(null)} style={{ flex: 1 }}>
              annuler
            </PrimaryButton>
            <PrimaryButton
              onClick={() => showDeleteSessionModal && confirmDeleteSession(showDeleteSessionModal)}
              style={{ flex: 1, backgroundColor: 'var(--color-error)' }}
            >
              supprimer
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      {/* Modale création exercice perso */}
      {showCreateExercise && (
        <ExerciseFormSheet
          onSave={handleCreateCustomExercise}
          onClose={() => setShowCreateExercise(false)}
        />
      )}
    </div>
  );
}
