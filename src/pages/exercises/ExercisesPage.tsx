// Page bibliothèque d'exercices — catalogue + exercices personnalisés
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import {
  getExerciseCatalog,
  getCustomExercises,
  createCustomExercise,
  updateCustomExercise,
  deleteCustomExercise,
} from '@/services/exerciseService';
import type { AnyExercise, ExerciseCatalogItem, CustomExercise } from '@/types/workout';
import { ExerciseRow } from '@/components/exercises/ExerciseRow';
import { ExerciseDetailSheet } from '@/components/exercises/ExerciseDetailSheet';
import { ExerciseFormSheet } from '@/components/exercises/ExerciseFormSheet';
import { Modal } from '@/components/ui/Modal';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

/** Filtres de catégorie */
const CATEGORIES = ['Haut du corps', 'Bas du corps', 'Full Body', 'Cardio', 'Mobilité'] as const;
/** Filtres de type */
const TYPES = ['Force', 'Poids du corps', 'Machine', 'Haltères'] as const;

type ActiveTab = 'catalogue' | 'mes exercices';

export function ExercisesPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { showToast } = useToast();

  // ─── État onglets et filtres ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalogue');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  // ─── Données ─────────────────────────────────────────────────────────────
  const [catalogItems, setCatalogItems] = useState<ExerciseCatalogItem[]>([]);
  const [customItems, setCustomItems] = useState<CustomExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Compteur pour ignorer les réponses périmées (requêtes en vol lors d'un changement de filtre)
  const requestIdRef = useRef(0);

  // ─── Sélection et formulaires ─────────────────────────────────────────────
  const [selectedExercise, setSelectedExercise] = useState<AnyExercise | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<CustomExercise | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomExercise | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ─── Chargement du catalogue ──────────────────────────────────────────────
  const loadCatalog = useCallback(
    async (reset = false) => {
      // Incrémente l'identifiant de requête pour détecter les réponses périmées
      const reqId = ++requestIdRef.current;

      setLoading(true);
      const currentPage = reset ? 0 : page;
      const { data, error } = await getExerciseCatalog(
        {
          category: selectedCategory ?? undefined,
          type: selectedType ?? undefined,
          // Transmet undefined si le champ est vide → retourne tout sans filtre
          search: search.trim() || undefined,
        },
        currentPage
      );

      // Ignore les réponses périmées (une requête plus récente a déjà été lancée)
      if (reqId !== requestIdRef.current) return;

      setLoading(false);

      if (error) {
        showToast('impossible de charger le catalogue.', 'error');
        return;
      }

      const items = data ?? [];
      if (reset) {
        setCatalogItems(items);
        setPage(0);
      } else {
        setCatalogItems(prev => [...prev, ...items]);
      }
      setHasMore(items.length === 20);
    },
    [page, selectedCategory, selectedType, search, showToast]
  );

  // ─── Chargement des exercices personnalisés ────────────────────────────────
  const loadCustom = useCallback(async () => {
    if (!user) return;
    const { data, error } = await getCustomExercises(user.id);
    if (error) {
      showToast('impossible de charger tes exercices.', 'error');
      return;
    }
    setCustomItems(data ?? []);
  }, [user, showToast]);

  // Chargement initial
  useEffect(() => {
    loadCatalog(true);
  }, [selectedCategory, selectedType, search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadCustom();
  }, [loadCustom]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  function handleCategoryFilter(cat: string) {
    setSelectedCategory(prev => (prev === cat ? null : cat));
    setPage(0);
  }

  function handleTypeFilter(type: string) {
    setSelectedType(prev => (prev === type ? null : type));
    setPage(0);
  }

  async function handleSaveExercise(
    data: Omit<CustomExercise, 'id' | 'user_id' | 'source' | 'created_at'>
  ) {
    if (!user) return;

    if (editingExercise) {
      // Modification
      const { error } = await updateCustomExercise(editingExercise.id, data);
      if (error) {
        showToast('impossible de modifier l\'exercice.', 'error');
        return;
      }
      showToast('exercice modifié.', 'success');
    } else {
      // Création
      const { error } = await createCustomExercise(user.id, data);
      if (error) {
        showToast('impossible de créer l\'exercice.', 'error');
        return;
      }
      showToast('exercice créé.', 'success');
    }

    setFormOpen(false);
    setEditingExercise(null);
    await loadCustom();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const { error } = await deleteCustomExercise(deleteTarget.id);
    setDeleteLoading(false);

    if (error === 'EXERCISE_IN_USE') {
      showToast('cet exercice est utilisé dans une séance — impossible de le supprimer.', 'error');
      setDeleteTarget(null);
      return;
    }
    if (error) {
      showToast('impossible de supprimer l\'exercice.', 'error');
      return;
    }

    showToast('exercice supprimé.', 'success');
    setDeleteTarget(null);
    await loadCustom();
  }

  function openEditForm(exercise: CustomExercise) {
    setEditingExercise(exercise);
    setFormOpen(true);
  }

  function openCreateForm() {
    setEditingExercise(null);
    setFormOpen(true);
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* En-tête */}
      <div
        style={{
          padding: 'var(--space-6) var(--space-4) var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
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
          }}
        >
          ←
        </button>
        <h1
          style={{
            margin: 0,
            fontSize: 'var(--text-3xl)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text)',
            fontFamily: 'var(--font-family)',
          }}
        >
          bibliothèque
        </h1>
      </div>

      {/* Barre de recherche */}
      <div style={{ padding: '0 var(--space-4)', marginBottom: 'var(--space-3)' }}>
        <input
          type="search"
          placeholder="rechercher un exercice..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{
            width: '100%',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-full)',
            border: '1.5px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: 'var(--text-base)',
            fontFamily: 'var(--font-family)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Filtres chips — catégorie */}
      <div
        style={{
          overflowX: 'auto',
          display: 'flex',
          gap: 'var(--space-2)',
          padding: '0 var(--space-4)',
          marginBottom: 'var(--space-2)',
          scrollbarWidth: 'none',
        }}
      >
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryFilter(cat)}
            style={{
              flexShrink: 0,
              padding: 'var(--space-1) var(--space-3)',
              borderRadius: 'var(--radius-full)',
              border: '1.5px solid',
              borderColor: selectedCategory === cat ? 'var(--color-primary)' : 'var(--color-border)',
              backgroundColor: selectedCategory === cat ? 'var(--color-primary)' : 'transparent',
              color: selectedCategory === cat ? 'var(--color-text)' : 'var(--color-text-muted)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-family)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Filtres chips — type */}
      <div
        style={{
          overflowX: 'auto',
          display: 'flex',
          gap: 'var(--space-2)',
          padding: '0 var(--space-4)',
          marginBottom: 'var(--space-4)',
          scrollbarWidth: 'none',
        }}
      >
        {TYPES.map(type => (
          <button
            key={type}
            onClick={() => handleTypeFilter(type)}
            style={{
              flexShrink: 0,
              padding: 'var(--space-1) var(--space-3)',
              borderRadius: 'var(--radius-full)',
              border: '1.5px solid',
              borderColor: selectedType === type ? 'var(--color-primary)' : 'var(--color-border)',
              backgroundColor: selectedType === type ? 'var(--color-primary)' : 'transparent',
              color: selectedType === type ? 'var(--color-text)' : 'var(--color-text-muted)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-family)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Onglets */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid var(--color-border)',
          padding: '0 var(--space-4)',
          marginBottom: 'var(--space-4)',
        }}
      >
        {(['catalogue', 'mes exercices'] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: '-2px',
              color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontSize: 'var(--text-base)',
              fontWeight:
                activeTab === tab
                  ? ('var(--font-semibold)' as React.CSSProperties['fontWeight'])
                  : undefined,
              fontFamily: 'var(--font-family)',
              cursor: 'pointer',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Contenu de l'onglet actif */}
      <div
        style={{
          padding: '0 var(--space-4) var(--space-8)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}
      >
        {activeTab === 'catalogue' ? (
          <>
            {/* Skeleton au chargement initial */}
            {loading && catalogItems.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: '72px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-surface)',
                    opacity: 0.5,
                  }}
                />
              ))
            ) : (
              <>
                {catalogItems.map(ex => (
                  <ExerciseRow
                    key={ex.id}
                    exercise={ex}
                    onTap={() => setSelectedExercise(ex)}
                  />
                ))}

                {/* Pagination — "voir plus" */}
                {hasMore && (
                  <PrimaryButton
                    variant="secondary"
                    loading={loading}
                    onClick={() => {
                      const nextPage = page + 1;
                      setPage(nextPage);
                      loadCatalog(false);
                    }}
                  >
                    voir plus
                  </PrimaryButton>
                )}

                {catalogItems.length === 0 && !loading && (
                  <p
                    style={{
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-family)',
                      padding: 'var(--space-8)',
                    }}
                  >
                    aucun exercice trouvé.
                  </p>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {/* FAB créer un exercice */}
            <PrimaryButton variant="secondary" onClick={openCreateForm}>
              + créer un exercice
            </PrimaryButton>

            {customItems.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: 'var(--space-8) var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-4)',
                  alignItems: 'center',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--text-base)',
                  }}
                >
                  tu n&apos;as pas encore créé d&apos;exercice.
                </p>
              </div>
            ) : (
              customItems.map(ex => (
                <ExerciseRow
                  key={ex.id}
                  exercise={ex}
                  onTap={() => setSelectedExercise(ex)}
                  onEdit={() => openEditForm(ex)}
                  onDelete={() => setDeleteTarget(ex)}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Sheet détail exercice */}
      <ExerciseDetailSheet
        exercise={selectedExercise}
        isOpen={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />

      {/* Formulaire création/modification */}
      <ExerciseFormSheet
        isOpen={formOpen}
        exercise={editingExercise}
        onSave={handleSaveExercise}
        onClose={() => { setFormOpen(false); setEditingExercise(null); }}
      />

      {/* Modal confirmation suppression */}
      <Modal
        isOpen={!!deleteTarget}
        title="supprimer cet exercice ?"
        confirmLabel="supprimer"
        cancelLabel="annuler"
        isDanger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isConfirmLoading={deleteLoading}
      >
        cette action est irréversible.
      </Modal>
    </div>
  );
}
