// Service d'import de programme via le webhook Make
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { ExerciseInputType } from '@/types/workout';
import type { CreateExerciseInput, CreateProgramInput } from '@/services/programService';

// ─── Types de la réponse Make ─────────────────────────────────────────────────

/** Un exercice tel que retourné par Make (nom textuel, pas d'ID catalogue) */
export interface MakeExerciseItem {
  exercise_name: string;
  sets: number;
  /** Ex : "8", "8-10", "12", "30s" */
  reps: string;
  weight?: number | null;
  input_type: ExerciseInputType;
  /** Repos en secondes entre les séries */
  rest_between_sets?: number;
}

/** Une séance telle que retournée par Make */
export interface MakeSessionItem {
  name: string;
  order_index: number;
  /** 0 = Lundi … 6 = Dimanche. null si non précisé */
  day_of_week?: number | null;
  exercises: MakeExerciseItem[];
}

/** Structure complète retournée par le webhook Make */
export interface MakeImportResponse {
  name: string;
  description?: string | null;
  duration_weeks?: number | null;
  sessions: MakeSessionItem[];
}

// ─── Envoi vers Make ──────────────────────────────────────────────────────────

/**
 * Type de source du contenu envoyé à Make :
 * - text  → saisie libre dans le textarea
 * - image → fichier PNG ou JPEG (contenu base64 Data URL)
 * - file  → fichier texte : .txt, .csv, .pdf (contenu texte brut)
 */
export type MakeContentType = 'text' | 'image' | 'file';

/** Structure du payload envoyé au webhook Make — toujours identique */
interface MakeWebhookPayload {
  content_type: MakeContentType;
  content: string;
  /** Nom du fichier original — null pour les saisies libres */
  file_name: string | null;
}

/**
 * Envoie le contenu au webhook Make pour analyse IA.
 * Le payload est toujours structuré de la même façon pour permettre
 * des conditionnelles dans Make selon content_type.
 */
export async function sendTextToMake(
  content: string,
  content_type: MakeContentType = 'text',
  file_name: string | null = null
): Promise<{ data: MakeImportResponse | null; error: string | null }> {
  const payload: MakeWebhookPayload = { content_type, content, file_name };

  try {
    const response = await fetch(env.MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { data: null, error: `Erreur Make (${response.status}) — réessaie dans un moment.` };
    }

    const raw = await response.json();

    // Make retourne un tableau [{ body: "...", status: 200, headers: [] }]
    // où body est une string JSON — il faut l'extraire et la parser
    let data: MakeImportResponse;
    if (Array.isArray(raw) && typeof raw[0]?.body === 'string') {
      try {
        // Nettoie les BOM (Byte Order Mark) et espaces au début/fin
        // (problème courant sur Windows/Android avec certains encodages)
        let bodyStr = raw[0].body.trim();
        // Supprime le BOM UTF-8 (\uFEFF) s'il existe
        if (bodyStr.charCodeAt(0) === 0xfeff) {
          bodyStr = bodyStr.slice(1);
        }
        // Vérifie que ça commence par { ou [ (JSON valide)
        if (!bodyStr.match(/^[\{\[]/)) {
          console.error('Réponse Make non-JSON:', bodyStr.slice(0, 100));
          return { data: null, error: 'Réponse Make invalide — contacte le support si ça persiste.' };
        }
        data = JSON.parse(bodyStr) as MakeImportResponse;
      } catch (parseError) {
        // Log le début de la réponse pour diagnostiquer
        const bodyPreview = raw[0].body.slice(0, 100);
        console.error('Erreur parsing Make:', parseError, 'Body:', bodyPreview);
        return { data: null, error: 'Impossible de parser la réponse Make — réessaie dans un moment.' };
      }
    } else {
      // Réponse directe (sans enveloppe)
      data = raw as MakeImportResponse;
    }

    // Validation minimale — seul sessions est obligatoire, name peut être null
    if (!data || !Array.isArray(data?.sessions)) {
      return { data: null, error: 'Réponse Make invalide — format inattendu.' };
    }

    // Fallback si name est null ou absent
    if (!data.name) {
      data.name = 'Programme importé';
    }

    return { data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur réseau';
    return { data: null, error: message };
  }
}

// ─── Résolution des exercices ─────────────────────────────────────────────────

/**
 * Construit un CreateProgramInput depuis la réponse Make :
 * - cherche chaque exercice dans le catalogue par nom (insensible à la casse)
 * - crée un exercice personnalisé pour ceux non trouvés
 * Retourne le programme prêt à passer à createProgram().
 */
export async function resolveAndBuildProgram(
  userId: string,
  makeResponse: MakeImportResponse,
  overrides: {
    name?: string;
    description?: string | null;
    duration_weeks?: number | null;
  }
): Promise<{ data: CreateProgramInput | null; error: string | null }> {
  // Charge le catalogue d'exercices (lecture publique)
  const { data: catalog, error: catalogError } = await supabase
    .from('exercise_catalog')
    .select('id, name');

  if (catalogError) {
    return { data: null, error: catalogError.message };
  }

  // Index normalisé nom → id pour la recherche rapide
  const catalogIndex = new Map<string, string>(
    (catalog ?? []).map((ex) => [ex.name.toLowerCase().trim(), ex.id as string])
  );

  // Cache des exercices personnalisés créés dans cette session (évite les doublons)
  const createdCustom = new Map<string, string>(); // nom normalisé → id

  /** Résout un nom d'exercice en IDs catalogue ou personnalisé */
  async function resolveExercise(name: string): Promise<{
    catalog_id: string | null;
    custom_id: string | null;
    error: string | null;
  }> {
    const normalized = name.toLowerCase().trim();

    // Correspond dans le catalogue
    const catalogId = catalogIndex.get(normalized);
    if (catalogId) return { catalog_id: catalogId, custom_id: null, error: null };

    // Déjà créé dans cette session
    const cachedId = createdCustom.get(normalized);
    if (cachedId) return { catalog_id: null, custom_id: cachedId, error: null };

    // Crée un exercice personnalisé
    const { data: created, error: createError } = await supabase
      .from('user_custom_exercises')
      .insert({ user_id: userId, name: name.trim(), category: null })
      .select('id')
      .single();

    if (createError || !created) {
      return { catalog_id: null, custom_id: null, error: createError?.message ?? 'Création impossible' };
    }

    createdCustom.set(normalized, created.id as string);
    return { catalog_id: null, custom_id: created.id as string, error: null };
  }

  // Construit les sessions avec exercices résolus
  const sessions = [];

  for (const session of makeResponse.sessions) {
    const exercises: CreateExerciseInput[] = [];

    for (let i = 0; i < session.exercises.length; i++) {
      const ex = session.exercises[i];
      const { catalog_id, custom_id, error: resolveError } = await resolveExercise(ex.exercise_name);

      if (resolveError) {
        return { data: null, error: `Exercice "${ex.exercise_name}" : ${resolveError}` };
      }

      exercises.push({
        exercise_catalog_id: catalog_id ?? undefined,
        user_custom_exercise_id: custom_id ?? undefined,
        sets: ex.sets ?? 3,
        reps: ex.reps ?? '8',
        weight: ex.weight ?? undefined,
        input_type: ex.input_type,
        rest_between_sets: ex.rest_between_sets ?? 120,
        order_index: i,
      });
    }

    sessions.push({
      name: session.name,
      order_index: session.order_index,
      day_of_week: session.day_of_week ?? undefined,
      exercises,
    });
  }

  return {
    data: {
      name: overrides.name?.trim() || makeResponse.name,
      description: overrides.description ?? makeResponse.description ?? undefined,
      duration_weeks: overrides.duration_weeks ?? makeResponse.duration_weeks ?? undefined,
      sessions,
    },
    error: null,
  };
}
