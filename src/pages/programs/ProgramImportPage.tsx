// Page import de programme via Make — 3 étapes : saisie → chargement → vérification
import { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { sendTextToMake, resolveAndBuildProgram, type MakeImportResponse, type MakeContentType } from '@/services/makeImportService';
import { createProgram } from '@/services/programService';

type Step = 'input' | 'loading' | 'verify';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
// const ACCEPTED_TYPES = '.txt,.csv,.pdf,.png,.jpg,.jpeg'; // TODO : réactiver les fichiers texte
const ACCEPTED_TYPES = '.png,.jpg,.jpeg';
const IMAGE_TYPES = ['image/png', 'image/jpeg'];

export function ProgramImportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fromOnboarding = (location.state as { from?: string })?.from === 'onboarding';

  // ─── État global ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('input');
  const [textContent, setTextContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileContentType, setFileContentType] = useState<MakeContentType>('text');
  const [error, setError] = useState<string | null>(null);

  // ─── État étape vérification ──────────────────────────────────────────────
  const [makeResponse, setMakeResponse] = useState<MakeImportResponse | null>(null);
  const [programName, setProgramName] = useState('');
  const [programDesc, setProgramDesc] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('');
  const [saving, setSaving] = useState(false);

  // ─── Lecture de fichier ───────────────────────────────────────────────────

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('Fichier trop lourd — 5 Mo maximum.');
      return;
    }

    setError(null);
    setFileName(file.name);

    const isImage = IMAGE_TYPES.includes(file.type);
    const reader = new FileReader();

    reader.onload = (ev) => {
      setFileContent((ev.target?.result as string) ?? null);
      // 'image' pour PNG/JPEG, 'file' pour txt/csv/pdf
      setFileContentType(isImage ? 'image' : 'file');
    };
    reader.onerror = () => setError('Impossible de lire le fichier.');

    // Images → base64 Data URL, autres → texte brut
    if (isImage) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file, 'utf-8');
    }
  }, []);

  // ─── Envoi vers Make ──────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    const content = fileContent ?? textContent.trim();
    if (!content) {
      setError('Colle du texte ou upload un fichier pour commencer.');
      return;
    }

    setError(null);
    setStep('loading');

    const { data, error: makeError } = await sendTextToMake(
      content,
      fileContent ? fileContentType : 'text',
      fileContent ? fileName : null
    );

    if (makeError || !data) {
      setError(makeError ?? 'Erreur inconnue.');
      setStep('input');
      return;
    }

    // Pré-remplit les champs éditables avec les données Make
    setMakeResponse(data);
    setProgramName(data.name);
    setProgramDesc(data.description ?? '');
    setDurationWeeks(data.duration_weeks ? String(data.duration_weeks) : '');
    setStep('verify');
  }, [textContent, fileContent]);

  // ─── Enregistrement ───────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!user || !makeResponse) return;

    setSaving(true);
    setError(null);

    const { data: programInput, error: resolveError } = await resolveAndBuildProgram(
      user.id,
      makeResponse,
      {
        name: programName,
        description: programDesc || null,
        duration_weeks: durationWeeks ? parseInt(durationWeeks, 10) : null,
      }
    );

    if (resolveError || !programInput) {
      setError(resolveError ?? 'Erreur lors de la préparation du programme.');
      setSaving(false);
      return;
    }

    const { data: programId, error: createError } = await createProgram(user.id, programInput);
    setSaving(false);

    if (createError || !programId) {
      setError(createError ?? 'Impossible de créer le programme.');
      return;
    }

    showToast('Programme importé 🖤', 'success');
    // Si on vient de l'onboarding, retourner à la Step 3
    if (fromOnboarding) {
      navigate('/onboarding?importDone=true', { replace: true });
    } else {
      navigate(`/programs/${programId}`);
    }
  }, [user, makeResponse, programName, programDesc, durationWeeks, navigate, showToast, fromOnboarding]);

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}>
      {/* En-tête */}
      <div
        style={{
          padding: 'var(--space-4)',
          paddingTop: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}
      >
        <button
          onClick={() => (step === 'verify' ? setStep('input') : navigate(-1))}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 'var(--space-2)',
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Retour"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text)', margin: 0 }}>
          {step === 'verify' ? 'Vérification' : 'Importer un programme'}
        </h1>
      </div>

      <AnimatePresence mode="wait">

        {/* ─── ÉTAPE 1 : SAISIE ─────────────────────────────────────────── */}
        {step === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
          >
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
              Décris ton programme en texte libre, colle un plan existant ou upload un fichier.
            </p>

            {/* Textarea */}
            <textarea
              value={textContent}
              onChange={(e) => { setTextContent(e.target.value); setFileContent(null); setFileName(null); }}
              placeholder={"Exemple :\n3 séances par semaine, full body.\nSéance A : Squat 4x8, Hip Thrust 4x10, RDL 3x10...\nSéance B : Développé couché 4x8, Rowing 4x10..."}
              rows={8}
              style={{
                width: '100%',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'var(--font-family)',
                color: 'var(--color-text)',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            {/* Séparateur */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>ou</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
            </div>

            {/* Zone d'upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-6)',
                borderRadius: 'var(--radius-md)',
                border: '1.5px dashed var(--color-border)',
                backgroundColor: fileName ? 'var(--color-primary-light)' : 'transparent',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'center',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-primary)' }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text)' }}>
                {fileName ?? 'Choisir un fichier'}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                {/* TODO : réactiver .txt, .csv, .pdf */}
                .png, .jpg — 5 Mo max
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {/* Erreur */}
            {error && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', margin: 0 }}>{error}</p>
            )}

            <PrimaryButton
              onClick={handleAnalyze}
              disabled={!textContent.trim() && !fileContent}
            >
              Importer mon programme
            </PrimaryButton>
          </motion.div>
        )}

        {/* ─── ÉTAPE 2 : CHARGEMENT ─────────────────────────────────────── */}
        {step === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-5)',
              padding: 'var(--space-10)',
              minHeight: '60dvh',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                border: '3px solid var(--color-primary-light)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text)', margin: '0 0 var(--space-2)' }}>
                Analyse en cours…
              </p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
                Je génère ton programme
              </p>
            </div>
          </motion.div>
        )}

        {/* ─── ÉTAPE 3 : VÉRIFICATION ───────────────────────────────────── */}
        {step === 'verify' && makeResponse && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            style={{ padding: 'var(--space-4)', paddingBottom: 'var(--space-16)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
          >
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
              Vérifie les informations générées avant d'enregistrer.
            </p>

            {/* Champs éditables */}
            <InputField
              label="Nom du programme"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
            />
            <InputField
              label="Description (optionnelle)"
              value={programDesc}
              onChange={(e) => setProgramDesc(e.target.value)}
            />
            <InputField
              label="Durée (semaines)"
              type="number"
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(e.target.value)}
              placeholder="ex : 8"
            />

            {/* Liste des séances */}
            <div>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text)', margin: '0 0 var(--space-3)' }}>
                {makeResponse.sessions.length} séance{makeResponse.sessions.length > 1 ? 's' : ''} détectée{makeResponse.sessions.length > 1 ? 's' : ''}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {makeResponse.sessions.map((session, si) => (
                  <div
                    key={si}
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-4)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text)', margin: '0 0 var(--space-3)' }}>
                      {session.name}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {session.exercises.map((ex, ei) => (
                        <div
                          key={ei}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 'var(--space-2) var(--space-3)',
                            backgroundColor: 'var(--color-bg)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', fontWeight: 'var(--font-medium)' }}>
                            {ex.exercise_name}
                          </span>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', flexShrink: 0, marginLeft: 'var(--space-2)' }}>
                            {ex.sets} × {ex.reps}{ex.weight ? ` · ${ex.weight} kg` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', margin: 0 }}>{error}</p>
            )}

            <PrimaryButton onClick={handleSave} loading={saving} disabled={!programName.trim()}>
              Enregistrer le programme
            </PrimaryButton>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
