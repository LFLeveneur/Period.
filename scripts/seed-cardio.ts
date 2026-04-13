/**
 * Script de seed — exercices cardio dans exercise_catalog
 *
 * Usage :
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npx tsx scripts/seed-cardio.ts
 *
 * Idempotent : n'insère que les exercices absents (vérification par nom).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  Variables manquantes : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Exercices cardio à insérer ────────────────────────────────────────────────

const CARDIO_EXERCISES = [
  {
    name: 'Tapis roulant',
    category: 'Cardio',
    type: 'Machine',
    input_type: 'cardio_duration',
    is_public: true,
  },
  {
    name: 'Vélo elliptique',
    category: 'Cardio',
    type: 'Machine',
    input_type: 'cardio_duration',
    is_public: true,
  },
  {
    name: 'Rameur',
    category: 'Cardio',
    type: 'Machine',
    input_type: 'cardio_distance',
    is_public: true,
  },
  {
    name: 'Corde à sauter',
    category: 'Cardio',
    type: 'Poids du corps',
    input_type: 'cardio_duration',
    is_public: true,
  },
  {
    name: 'Course à pied',
    category: 'Cardio',
    type: 'Poids du corps',
    input_type: 'cardio_distance',
    is_public: true,
  },
] as const;

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seedCardio() {
  console.log('🔍  Vérification des exercices cardio...');

  const { data: existing, error: fetchError } = await supabase
    .from('exercise_catalog')
    .select('name')
    .eq('category', 'Cardio');

  if (fetchError) {
    console.error('❌  Erreur lors de la vérification :', fetchError.message);
    process.exit(1);
  }

  const existingNames = new Set((existing ?? []).map((e: { name: string }) => e.name));
  const toInsert = CARDIO_EXERCISES.filter(e => !existingNames.has(e.name));

  if (toInsert.length === 0) {
    console.log('✅  Tous les exercices cardio sont déjà présents — rien à insérer.');
    return;
  }

  console.log(`➕  Insertion de ${toInsert.length} exercice(s) : ${toInsert.map(e => e.name).join(', ')}`);

  const { error: insertError } = await supabase
    .from('exercise_catalog')
    .insert(toInsert);

  if (insertError) {
    console.error('❌  Erreur lors de l\'insertion :', insertError.message);
    process.exit(1);
  }

  console.log('✅  Exercices cardio insérés avec succès.');
}

seedCardio();
