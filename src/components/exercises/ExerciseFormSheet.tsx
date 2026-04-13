// Formulaire de création ou modification d'un exercice personnalisé
import { useState, useEffect } from 'react';
import type { CustomExercise } from '@/types/workout';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { InputField } from '@/components/ui/InputField';

interface ExerciseFormSheetProps {
  /** Contrôle l'ouverture du drawer */
  isOpen: boolean;
  /** null = création, sinon = modification */
  exercise: CustomExercise | null;
  /** Appelé après sauvegarde réussie */
  onSave: (data: Omit<CustomExercise, 'id' | 'user_id' | 'source' | 'created_at'>) => Promise<void>;
  /** Callback de fermeture */
  onClose: () => void;
}

const CATEGORIES = ['Haut du corps', 'Bas du corps', 'Full Body', 'Cardio', 'Mobilité'] as const;
const SUBCATEGORIES = ['Push', 'Pull', 'Jambes', 'Abdos', 'Autre'] as const;
const TYPES = ['Force', 'Poids du corps', 'Machine', 'Haltères'] as const;

interface FormState {
  name: string;
  category: string;
  subcategory: string;
  type: string;
  muscle_primary: string;
  muscle_secondary: string;
  notes: string;
}

const DEFAULT_FORM: FormState = {
  name: '',
  category: '',
  subcategory: '',
  type: '',
  muscle_primary: '',
  muscle_secondary: '',
  notes: '',
};

/** Style commun pour les selects */
const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--space-3) var(--space-4)',
  borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 'var(--text-base)',
  fontFamily: 'var(--font-family)',
  outline: 'none',
  boxSizing: 'border-box' as React.CSSProperties['boxSizing'],
};

export function ExerciseFormSheet({ isOpen, exercise, onSave, onClose }: ExerciseFormSheetProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [nameError, setNameError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pré-remplit le formulaire en mode édition
  useEffect(() => {
    if (isOpen) {
      if (exercise) {
        setForm({
          name: exercise.name,
          category: exercise.category ?? '',
          subcategory: exercise.subcategory ?? '',
          type: exercise.type ?? '',
          muscle_primary: exercise.muscle_primary ?? '',
          muscle_secondary: exercise.muscle_secondary ?? '',
          notes: exercise.notes ?? '',
        });
      } else {
        setForm(DEFAULT_FORM);
      }
      setNameError(null);
      setCategoryError(null);
    }
  }, [isOpen, exercise]);

  // Fermeture via Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Bloque le scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  function updateField(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'name') setNameError(null);
    if (field === 'category') setCategoryError(null);
  }

  async function handleSubmit() {
    // Validation
    let valid = true;
    if (!form.name.trim()) {
      setNameError('le nom est obligatoire.');
      valid = false;
    }
    if (!form.category) {
      setCategoryError('la catégorie est obligatoire.');
      valid = false;
    }
    if (!valid) return;

    setSaving(true);
    await onSave({
      name: form.name.trim(),
      category: form.category || null,
      subcategory: form.subcategory || null,
      type: form.type || null,
      muscle_primary: form.muscle_primary.trim() || null,
      muscle_secondary: form.muscle_secondary.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
  }

  if (!isOpen) return null;

  const title = exercise ? 'modifier l\'exercice' : 'créer un exercice';

  return (
    // Overlay
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(47, 0, 87, 0.4)',
        zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      {/* Drawer */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '90vh',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          padding: 'var(--space-6) var(--space-4)',
          overflowY: 'auto',
          animation: 'slideUp var(--duration-slow) ease both',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Indicateur */}
        <div
          style={{
            width: '40px',
            height: '4px',
            backgroundColor: 'var(--color-border)',
            borderRadius: 'var(--radius-full)',
            margin: '0 auto',
          }}
        />

        {/* Titre */}
        <h2
          style={{
            margin: 0,
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
            fontFamily: 'var(--font-family)',
          }}
        >
          {title}
        </h2>

        {/* Champs du formulaire */}
        <InputField
          id="ex-name"
          label="nom *"
          value={form.name}
          onChange={e => updateField('name', e.target.value)}
          error={nameError ?? undefined}
          placeholder="ex: Squat gobelet"
        />

        {/* Catégorie */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label
            htmlFor="ex-category"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
              fontFamily: 'var(--font-family)',
            }}
          >
            catégorie *
          </label>
          <select
            id="ex-category"
            value={form.category}
            onChange={e => updateField('category', e.target.value)}
            style={{
              ...selectStyle,
              border: categoryError ? '1.5px solid var(--color-error)' : selectStyle.border,
            }}
          >
            <option value="">choisir une catégorie...</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {categoryError && (
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-error)', fontFamily: 'var(--font-family)' }}>
              {categoryError}
            </p>
          )}
        </div>

        {/* Sous-catégorie */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label
            htmlFor="ex-subcategory"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
              fontFamily: 'var(--font-family)',
            }}
          >
            sous-catégorie
          </label>
          <select
            id="ex-subcategory"
            value={form.subcategory}
            onChange={e => updateField('subcategory', e.target.value)}
            style={selectStyle}
          >
            <option value="">aucune</option>
            {SUBCATEGORIES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label
            htmlFor="ex-type"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
              fontFamily: 'var(--font-family)',
            }}
          >
            type
          </label>
          <select
            id="ex-type"
            value={form.type}
            onChange={e => updateField('type', e.target.value)}
            style={selectStyle}
          >
            <option value="">aucun</option>
            {TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <InputField
          id="ex-muscle-primary"
          label="muscle principal"
          value={form.muscle_primary}
          onChange={e => updateField('muscle_primary', e.target.value)}
          placeholder="ex: Quadriceps"
        />

        <InputField
          id="ex-muscle-secondary"
          label="muscle secondaire"
          value={form.muscle_secondary}
          onChange={e => updateField('muscle_secondary', e.target.value)}
          placeholder="ex: Fessiers"
        />

        {/* Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label
            htmlFor="ex-notes"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text)',
              fontFamily: 'var(--font-family)',
            }}
          >
            notes
          </label>
          <textarea
            id="ex-notes"
            value={form.notes}
            onChange={e => updateField('notes', e.target.value)}
            rows={3}
            placeholder="conseils, variantes..."
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

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <PrimaryButton onClick={handleSubmit} loading={saving}>
            enregistrer
          </PrimaryButton>
          <PrimaryButton variant="ghost" onClick={onClose} disabled={saving}>
            annuler
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
