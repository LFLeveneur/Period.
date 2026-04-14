// Zone exercice courant — composant central de la séance active
import { useState } from 'react';
import { RirInfo } from '@/components/ui/RirInfo';
import type { ActiveSetData, SetTarget, ExerciseHistoryEntry } from '@/types/workout';
import type { SessionExerciseWithDetails } from '@/services/programService';
import type { CyclePhaseDisplay } from '@/types/cycle';

interface ExerciseZoneProps {
  /** Exercice courant avec ses détails */
  exerciseWithDetails: SessionExerciseWithDetails;
  /** État en mémoire des séries de cet exercice */
  exerciseState: { sets: ActiveSetData[]; completed: boolean } | null;
  /** Callback validation d'une série (déclenche le timer de repos) */
  onCompleteSet: (setIndex: number, data: Omit<ActiveSetData, 'completed'>) => void;
  /** Callback correction d'une série déjà validée (sans timer de repos) */
  onEditSet: (setIndex: number, data: Omit<ActiveSetData, 'completed'>) => void;
  /** Historique comparatif */
  history: ExerciseHistoryEntry[];
  /** Phase du cycle en cours — pour filtrer la comparaison cycle précédent */
  currentPhase?: CyclePhaseDisplay | null;
}

/** Formate l'historique condensé d'une entrée */
function formatHistoryLine(entry: ExerciseHistoryEntry): string {
  const sets = entry.set_details;
  if (!sets || sets.length === 0) return '';
  const first = sets[0].actual;
  const parts: string[] = [];
  if (first.weight) parts.push(`${first.weight}kg`);
  if (first.reps) parts.push(`${first.reps} reps`);
  return parts.join(' · ');
}

/** Champs à afficher selon le type d'input */
type FieldKey = 'weight' | 'reps' | 'rir' | 'duration_min' | 'duration_sec' | 'distance' | 'added_load';

interface FieldConfig {
  key: FieldKey;
  label: string;
  unit?: string;
}

function getFields(inputType?: string | null): FieldConfig[] {
  switch (inputType) {
    case 'bodyweight_reps':
      return [
        { key: 'reps', label: 'Reps' },
        { key: 'rir', label: 'RIR' },
      ];
    case 'cardio_duration':
      return [
        { key: 'duration_min', label: 'Min' },
        { key: 'duration_sec', label: 'Sec' },
      ];
    case 'cardio_distance':
      return [
        { key: 'distance', label: 'Distance', unit: 'km' },
        { key: 'duration_min', label: 'Min' },
        { key: 'duration_sec', label: 'Sec' },
      ];
    case 'weight_plus_load':
      return [
        { key: 'reps', label: 'Reps' },
        { key: 'added_load', label: 'Charge +', unit: 'kg' },
        { key: 'rir', label: 'RIR' },
      ];
    default: // weight_reps
      return [
        { key: 'weight', label: 'Poids', unit: 'kg' },
        { key: 'reps', label: 'Reps' },
        { key: 'rir', label: 'RIR' },
      ];
  }
}

/** Retourne les valeurs pré-remplies pour une série */
function getPrefilledValues(
  setIndex: number,
  targets: SetTarget[],
  completedSets: ActiveSetData[],
  inputType?: string | null
): Record<FieldKey, string> {
  const defaultValues: Record<FieldKey, string> = {
    weight: '',
    reps: '',
    rir: '',
    duration_min: '',
    duration_sec: '',
    distance: '',
    added_load: '',
  };

  if (setIndex === 0) {
    // Série 1 : préremplir depuis set_targets[0] (SAUF RIR — saisie manuelle)
    const t = targets[0];
    if (!t) return defaultValues;
    if (t.weight) defaultValues.weight = String(t.weight);
    if (t.reps) defaultValues.reps = String(t.reps);
    // RIR : jamais pré-rempli — l'utilisatrice le saisit manuellement
    if (t.duration) {
      defaultValues.duration_min = String(Math.floor(t.duration / 60));
      defaultValues.duration_sec = String(t.duration % 60);
    }
    if (t.distance) defaultValues.distance = String(t.distance);
    if (t.added_load) defaultValues.added_load = String(t.added_load);
  } else {
    // Série N > 1 : préremplir depuis la série N-1 (SAUF RIR)
    const prev = completedSets[setIndex - 1];
    if (!prev || !prev.completed) {
      // Si la précédente n'est pas complétée, retomber sur targets
      const t = targets[setIndex];
      if (t?.weight) defaultValues.weight = String(t.weight);
      if (t?.reps) defaultValues.reps = String(t.reps);
      // RIR : jamais pré-rempli
    } else {
      if (prev.weight) defaultValues.weight = String(prev.weight);
      if (prev.reps) defaultValues.reps = String(prev.reps);
      // RIR : jamais pré-rempli — l'utilisatrice le saisit manuellement
      if (prev.duration) {
        defaultValues.duration_min = String(Math.floor(prev.duration / 60));
        defaultValues.duration_sec = String(prev.duration % 60);
      }
      if (prev.distance) defaultValues.distance = String(prev.distance);
      if (prev.added_load) defaultValues.added_load = String(prev.added_load);
    }
  }

  // Pour cardio_duration : ignorer inputType si pas de targets pertinents
  if (inputType === 'cardio_duration' && targets[setIndex]?.duration) {
    const dur = targets[setIndex].duration!;
    defaultValues.duration_min = String(Math.floor(dur / 60));
    defaultValues.duration_sec = String(dur % 60);
  }

  return defaultValues;
}

/** Formate le résumé d'une série validée */
function formatSetSummary(s: ActiveSetData): string {
  const parts: string[] = [];
  if (s.weight !== undefined && s.weight !== null) parts.push(`${s.weight} kg`);
  if (s.reps !== undefined && s.reps !== null) parts.push(`${s.reps} reps`);
  if (s.rir !== undefined && s.rir !== null) parts.push(`RIR ${s.rir}`);
  if (s.duration !== undefined && s.duration !== null) {
    const min = Math.floor(s.duration / 60);
    const sec = s.duration % 60;
    parts.push(min > 0 ? `${min}min ${sec}s` : `${sec}s`);
  }
  if (s.distance !== undefined && s.distance !== null) parts.push(`${s.distance} km`);
  if (s.added_load !== undefined && s.added_load !== null) parts.push(`+${s.added_load} kg`);
  return parts.join(' · ');
}

/** Table de correspondance phase UI → phase DB (4 valeurs) */
const PHASE_UI_TO_DB: Record<CyclePhaseDisplay, string> = {
  menstrual: 'menstrual',
  follicular: 'follicular',
  ovulation: 'ovulation',
  luteal_early: 'luteal',
  luteal_late: 'luteal',
};

export function ExerciseZone({ exerciseWithDetails, exerciseState, onCompleteSet, onEditSet, history, currentPhase }: ExerciseZoneProps) {
  const { sessionExercise, exercise } = exerciseWithDetails;
  const exerciseName = exercise?.name ?? 'exercice supprimé';
  const targets = sessionExercise.set_targets ?? [];
  const inputType = sessionExercise.input_type ?? 'weight_reps';
  const sets = exerciseState?.sets ?? [];
  const fields = getFields(inputType);

  // Index de la série active = première non complétée
  const activeSetIndex = sets.findIndex(s => !s.completed);
  const currentSetIndex = activeSetIndex === -1 ? sets.length - 1 : activeSetIndex;

  // Valeurs du formulaire courant (nouvelle série)
  const prefilledValues = getPrefilledValues(currentSetIndex, targets, sets, inputType);
  const [formValues, setFormValues] = useState<Record<FieldKey, string>>(prefilledValues);

  // Reset le formulaire quand l'index de série actif change
  const [lastActiveIndex, setLastActiveIndex] = useState(currentSetIndex);
  if (lastActiveIndex !== currentSetIndex) {
    setLastActiveIndex(currentSetIndex);
    setFormValues(getPrefilledValues(currentSetIndex, targets, sets, inputType));
  }

  // Index de la série en cours de correction (null = pas d'édition)
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<FieldKey, string>>({
    weight: '', reps: '', rir: '', duration_min: '', duration_sec: '', distance: '', added_load: '',
  });

  /** Ouvre le formulaire d'édition pré-rempli avec les valeurs actuelles */
  const openEdit = (idx: number, s: ActiveSetData) => {
    setEditingSetIndex(idx);
    setEditValues({
      weight: s.weight !== undefined && s.weight !== null ? String(s.weight) : '',
      reps: s.reps !== undefined && s.reps !== null ? String(s.reps) : '',
      rir: s.rir !== undefined && s.rir !== null ? String(s.rir) : '',
      duration_min: s.duration !== undefined && s.duration !== null ? String(Math.floor(s.duration / 60)) : '',
      duration_sec: s.duration !== undefined && s.duration !== null ? String(s.duration % 60) : '',
      distance: s.distance !== undefined && s.distance !== null ? String(s.distance) : '',
      added_load: s.added_load !== undefined && s.added_load !== null ? String(s.added_load) : '',
    });
  };

  /** Sauvegarde la correction */
  const handleSaveEdit = () => {
    if (editingSetIndex === null) return;
    const data: Omit<ActiveSetData, 'completed'> = {};
    if (editValues.weight) data.weight = parseFloat(editValues.weight);
    if (editValues.reps) data.reps = parseInt(editValues.reps);
    if (editValues.rir !== '') data.rir = parseInt(editValues.rir);
    if (editValues.distance) data.distance = parseFloat(editValues.distance);
    if (editValues.added_load) data.added_load = parseFloat(editValues.added_load);
    if (editValues.duration_min || editValues.duration_sec) {
      data.duration = parseInt(editValues.duration_min || '0') * 60 + parseInt(editValues.duration_sec || '0');
    }
    onEditSet(editingSetIndex, data);
    setEditingSetIndex(null);
  };

  const handleFieldChange = (key: FieldKey, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleValidate = () => {
    if (activeSetIndex === -1) return; // toutes les séries déjà complétées

    // Construire les données de la série
    const data: Omit<ActiveSetData, 'completed'> = {};

    if (formValues.weight) data.weight = parseFloat(formValues.weight);
    if (formValues.reps) data.reps = parseInt(formValues.reps);
    if (formValues.rir !== '' && formValues.rir !== undefined) data.rir = parseInt(formValues.rir);
    if (formValues.distance) data.distance = parseFloat(formValues.distance);
    if (formValues.added_load) data.added_load = parseFloat(formValues.added_load);
    if (formValues.duration_min || formValues.duration_sec) {
      const min = parseInt(formValues.duration_min || '0');
      const sec = parseInt(formValues.duration_sec || '0');
      data.duration = min * 60 + sec;
    }

    onCompleteSet(activeSetIndex, data);
  };

  const allCompleted = activeSetIndex === -1;

  // Dernière séance (la plus récente, toutes phases confondues)
  const lastEntry = history[0] ?? null;

  // Même phase du cycle précédent — première entrée qui correspond à la phase DB, différente de lastEntry
  const samePhasePrevEntry = currentPhase
    ? history.find(h => {
        const targetDb = PHASE_UI_TO_DB[currentPhase];
        return h.cycle_phase === targetDb && h !== lastEntry;
      }) ?? null
    : null;

  const completedSetsCount = sets.filter(s => s.completed).length;

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--space-4)',
        paddingBottom: 'var(--space-8)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      {/* En-tête exercice */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
          }}
        >
          {exerciseName}
        </h2>

        {/* Badge de progression ou badge terminé */}
        {allCompleted ? (
          <span
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ✓ terminé
          </span>
        ) : (
          <span
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
              backgroundColor: 'var(--color-primary-light)',
              borderRadius: 'var(--radius-full)',
              padding: '2px 10px',
            }}
          >
            {currentSetIndex + 1} / {sets.length}
          </span>
        )}
      </div>

      {/* Objectif de la série courante */}
      {!allCompleted && targets[currentSetIndex] && (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
          }}
        >
          Objectif :{' '}
          {targets[currentSetIndex].reps && `${targets[currentSetIndex].reps} reps`}
          {targets[currentSetIndex].weight && ` · ${targets[currentSetIndex].weight} kg`}
          {/* {targets[currentSetIndex].rir !== undefined && ` · RIR ${targets[currentSetIndex].rir}`} */}
          {targets[currentSetIndex].duration && ` · ${Math.floor(targets[currentSetIndex].duration! / 60)} min`}
        </p>
      )}

      {/* Séries déjà complétées — affichage visuel fort avec chips verts + bouton de correction */}
      {completedSetsCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {sets.map((s, idx) => {
            if (!s.completed) return null;

            // Formulaire d'édition inline pour cette série
            if (editingSetIndex === idx) {
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-primary)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-3)',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-family)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    Corriger la série {idx + 1}
                  </p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${fields.length}, 1fr)`,
                      gap: 'var(--space-2)',
                    }}
                  >
                    {fields.map(field => (
                      <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                        <label
                          style={{
                            fontFamily: 'var(--font-family)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {field.label}{field.unit && ` (${field.unit})`}
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={editValues[field.key]}
                          onChange={e => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          style={{
                            fontFamily: 'var(--font-family)',
                            fontSize: 'var(--text-lg)',
                            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                            color: 'var(--color-text)',
                            backgroundColor: 'var(--color-bg)',
                            border: '1px solid var(--color-primary)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-2)',
                            width: '100%',
                            boxSizing: 'border-box',
                            textAlign: 'center',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      onClick={handleSaveEdit}
                      style={{
                        flex: 1,
                        backgroundColor: 'var(--color-primary)',
                        color: 'var(--color-text)',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        padding: 'var(--space-2) var(--space-3)',
                        fontFamily: 'var(--font-family)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                        cursor: 'pointer',
                      }}
                    >
                      Sauvegarder
                    </button>
                    <button
                      onClick={() => setEditingSetIndex(null)}
                      style={{
                        flex: 1,
                        backgroundColor: 'transparent',
                        color: 'var(--color-text-muted)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-full)',
                        padding: 'var(--space-2) var(--space-3)',
                        fontFamily: 'var(--font-family)',
                        fontSize: 'var(--text-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              );
            }

            // Affichage normal de la série validée
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  backgroundColor: 'var(--color-success-bg)',
                  border: '1px solid rgba(46, 125, 50, 0.15)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                }}
              >
                {/* Indicateur de validation */}
                <span
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                    color: 'var(--color-success)',
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  ✓
                </span>

                {/* Numéro de série */}
                <span
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                    color: 'var(--color-success)',
                    flexShrink: 0,
                  }}
                >
                  Série {idx + 1}
                </span>

                {/* Résumé des valeurs */}
                <span
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                    color: 'var(--color-success)',
                    flex: 1,
                  }}
                >
                  {formatSetSummary(s)}
                </span>

                {/* Bouton de correction */}
                <button
                  onClick={() => openEdit(idx, s)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 'var(--space-1)',
                    color: 'var(--color-text-muted)',
                    fontSize: 'var(--text-xs)',
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                  aria-label={`Corriger la série ${idx + 1}`}
                >
                  ✏️
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparaisons historiques — dernière séance + même phase cycle précédent */}
      {(lastEntry || samePhasePrevEntry) ? (
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: 'var(--space-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
          }}
        >
          {lastEntry && (
            <p style={{ margin: 0, fontFamily: 'var(--font-family)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              dernière séance — {formatHistoryLine(lastEntry) || '—'}
            </p>
          )}
          {samePhasePrevEntry && (
            <p style={{ margin: 0, fontFamily: 'var(--font-family)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              même phase, cycle précédent — {formatHistoryLine(samePhasePrevEntry) || '—'}
            </p>
          )}
        </div>
      ) : (
        /* Pas d'historique — message encourageant */
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            borderTop: '1px solid var(--color-border)',
            paddingTop: 'var(--space-2)',
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}
        >
          on n'a pas encore tes données sur cette phase. continue à utiliser Period. — dans un cycle, tu pourras te comparer à toi-même au bon moment. 🖤
        </p>
      )}

      {/* Séparateur */}
      {!allCompleted && <div style={{ height: '1px', backgroundColor: 'var(--color-border)' }} />}

      {/* Champs de saisie — encadré pour la série en cours */}
      {!allCompleted && (
        <>
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Série {currentSetIndex + 1}
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${fields.length}, 1fr)`,
                gap: 'var(--space-3)',
              }}
            >
              {fields.map(field => (
                <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <label
                    style={{
                      fontFamily: 'var(--font-family)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    {field.label}
                    {field.unit && ` (${field.unit})`}
                    {field.key === 'rir' && <RirInfo />}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={formValues[field.key]}
                    onChange={e => handleFieldChange(field.key, e.target.value)}
                    placeholder={prefilledValues[field.key] || '—'}
                    style={{
                      fontFamily: 'var(--font-family)',
                      fontSize: 'var(--text-xl)',
                      fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                      color: 'var(--color-text)',
                      backgroundColor: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                      width: '100%',
                      boxSizing: 'border-box',
                      textAlign: 'center',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* CTA valider — bouton principal de la séance */}
          <button
            onClick={handleValidate}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-text)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: 'var(--space-4) var(--space-6)',
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
              cursor: 'pointer',
              width: '100%',
              boxShadow: 'var(--shadow-md)',
              letterSpacing: '0.02em',
            }}
          >
            ✓ Valider la série {currentSetIndex + 1}
          </button>
        </>
      )}

      {/* État terminé — message de succès */}
      {allCompleted && (
        <div
          style={{
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid rgba(46, 125, 50, 0.2)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <span style={{ fontSize: 'var(--text-2xl)' }}>✓</span>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-success)',
              textAlign: 'center',
            }}
          >
            exercice terminé !
          </p>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
            }}
          >
            navigue vers l'exercice suivant via la barre en haut ou termine la séance.
          </p>
        </div>
      )}
    </div>
  );
}
