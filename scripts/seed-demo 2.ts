/**
 * Script de seed — données de démonstration pour le compte Léa
 *
 * Usage :
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npx tsx scripts/seed-demo.ts
 *
 * Ce script utilise le service role key pour bypasser la RLS.
 * Il est idempotent : peut être relancé sans dupliquer les données.
 */

import { createClient } from '@supabase/supabase-js';

// ── Configuration ────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  Variables d\'environnement manquantes : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Utilitaires de date ───────────────────────────────────────────────────────

const TODAY = new Date();

/** Retourne une date YYYY-MM-DD il y a N jours */
function ago(days: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

/** Retourne un timestamp ISO il y a N jours, à une heure précise */
function agoAt(days: number, hour = 10): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// ── Constantes du profil de démo ─────────────────────────────────────────────

const LEA_EMAIL    = 'lea@period-demo.com';
const LEA_PASSWORD = 'period2025!';

// ── 1. Création ou récupération du compte Léa ────────────────────────────────

async function getOrCreateLea(): Promise<string> {
  console.log('🔍  Vérification du compte Léa...');

  // Cherche l'utilisatrice par email via l'API admin
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = listData?.users?.find(u => u.email === LEA_EMAIL);

  if (existing) {
    console.log('✅  Compte Léa trouvé :', existing.id);
    return existing.id;
  }

  // Crée le compte si absent
  const { data, error } = await supabase.auth.admin.createUser({
    email: LEA_EMAIL,
    password: LEA_PASSWORD,
    email_confirm: true,
    user_metadata: { name: 'Léa' },
  });

  if (error || !data.user) {
    console.error('❌  Impossible de créer le compte Léa :', error?.message);
    process.exit(1);
  }

  console.log('✅  Compte Léa créé :', data.user.id);
  return data.user.id;
}

// ── 2. Profil ─────────────────────────────────────────────────────────────────

async function seedProfile(userId: string) {
  console.log('👤  Mise à jour du profil...');

  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: userId,
      name: 'Léa',
      level: 'intermediaire',
      objective: 'tonification',
      cycle_tracking: true,
      onboarding_completed: true,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('❌  Profil :', error.message);
  } else {
    console.log('✅  Profil mis à jour');
  }
}

// ── 3. Données de cycle ───────────────────────────────────────────────────────

async function seedCycleData(userId: string) {
  console.log('🩸  Insertion des données de cycle...');

  // Supprime les entrées existantes pour éviter les doublons
  await supabase
    .from('health_data')
    .delete()
    .eq('user_id', userId)
    .eq('cycle_day', 1);

  // Cycle précédent — J1 il y a 36 jours
  // Cycle courant  — J1 il y a 8 jours → aujourd'hui = J8 (phase folliculaire ✅)
  const { error } = await supabase.from('health_data').insert([
    {
      user_id: userId,
      date: ago(36),
      cycle_day: 1,
      cycle_phase: 'menstrual',
    },
    {
      user_id: userId,
      date: ago(8),
      cycle_day: 1,
      cycle_phase: 'menstrual',
    },
  ]);

  if (error) {
    console.error('❌  Cycle :', error.message);
  } else {
    console.log('✅  Cycle : J1 il y a 36 jours + J1 il y a 8 jours (J8 aujourd\'hui = folliculaire)');
  }
}

// ── 4. Programme actif ────────────────────────────────────────────────────────

async function seedProgram(userId: string): Promise<{ programId: string; sessionIds: string[] }> {
  console.log('🏋️  Création du programme...');

  // Supprime l'éventuel programme existant de démo
  const { data: existing } = await supabase
    .from('programs')
    .select('id')
    .eq('user_id', userId)
    .eq('name', 'Programme Jambes 3x/semaine')
    .maybeSingle();

  if (existing) {
    await supabase.from('programs').delete().eq('id', existing.id);
  }

  // Désactive les autres programmes actifs
  await supabase
    .from('programs')
    .update({ is_active: false, status: 'paused' })
    .eq('user_id', userId)
    .eq('is_active', true);

  // Crée le programme de démo
  const { data: program, error: progError } = await supabase
    .from('programs')
    .insert({
      user_id: userId,
      name: 'Programme Jambes 3x/semaine',
      description: 'Programme de renforcement musculaire adapté à ton cycle',
      is_active: true,
      status: 'active',
    })
    .select('id')
    .single();

  if (progError || !program) {
    console.error('❌  Programme :', progError?.message);
    process.exit(1);
  }

  console.log('✅  Programme créé :', program.id);

  // Récupère des exercices du catalogue pour les séances
  const exerciceNames = [
    'Squat barre', 'Presse à cuisses', 'Leg curl couché',
    'Développé couché', 'Tirage vertical', 'Élévations latérales',
    'Squat barre', 'Romanian Deadlift', 'Gainage',
  ];

  const { data: catalogItems } = await supabase
    .from('exercise_catalog')
    .select('id, name')
    .in('name', exerciceNames);

  // Index par nom pour accès rapide
  const byName: Record<string, string> = {};
  for (const item of catalogItems ?? []) {
    byName[item.name] = item.id;
  }

  // ── Séances ─────────────────────────────────────────────────────────────────

  const sessions = [
    { name: 'Jambes',       day_of_week: 1, order_index: 0 }, // Lundi
    { name: 'Haut du corps', day_of_week: 3, order_index: 1 }, // Mercredi
    { name: 'Full Body',    day_of_week: 5, order_index: 2 }, // Vendredi
  ];

  const { data: createdSessions, error: sessError } = await supabase
    .from('program_sessions')
    .insert(sessions.map(s => ({ ...s, program_id: program.id, user_id: userId, status: 'pending' })))
    .select('id, name, order_index');

  if (sessError || !createdSessions) {
    console.error('❌  Séances :', sessError?.message);
    process.exit(1);
  }

  const sessionIds = createdSessions.map(s => s.id);
  console.log('✅  3 séances créées');

  // ── Exercices par séance ─────────────────────────────────────────────────────

  const squatId   = byName['Squat barre'] ?? null;
  const presseId  = byName['Presse à cuisses'] ?? null;
  const legCurlId = byName['Leg curl couché'] ?? null;
  const benchId   = byName['Développé couché'] ?? null;
  const tirageId  = byName['Tirage vertical'] ?? null;
  const epaulesId = byName['Élévations latérales'] ?? null;
  const rdlId     = byName['Romanian Deadlift'] ?? null;
  const gainageId = byName['Gainage'] ?? null;

  // Targets par défaut pour les squats — référence pour détecter les victoires
  const squatTargets = [
    { weight: 60, reps: 8, rir: 2 },
    { weight: 60, reps: 8, rir: 2 },
    { weight: 60, reps: 8, rir: 2 },
    { weight: 60, reps: 8, rir: 2 },
  ];

  const jambesExercices = [
    { session_id: sessionIds[0], exercise_catalog_id: squatId,   order_index: 0, input_type: 'weight_reps', rest_between_sets: 120, set_targets: squatTargets },
    { session_id: sessionIds[0], exercise_catalog_id: presseId,  order_index: 1, input_type: 'weight_reps', rest_between_sets: 90,  set_targets: [{ weight: 75, reps: 12, rir: 2 }, { weight: 75, reps: 12, rir: 2 }, { weight: 75, reps: 12, rir: 2 }] },
    { session_id: sessionIds[0], exercise_catalog_id: legCurlId, order_index: 2, input_type: 'weight_reps', rest_between_sets: 90,  set_targets: [{ weight: 40, reps: 10, rir: 2 }, { weight: 40, reps: 10, rir: 2 }, { weight: 40, reps: 10, rir: 2 }] },
  ];

  const hautExercices = [
    { session_id: sessionIds[1], exercise_catalog_id: benchId,   order_index: 0, input_type: 'weight_reps', rest_between_sets: 120, set_targets: [{ weight: 40, reps: 10, rir: 2 }, { weight: 40, reps: 10, rir: 2 }, { weight: 40, reps: 10, rir: 2 }] },
    { session_id: sessionIds[1], exercise_catalog_id: tirageId,  order_index: 1, input_type: 'weight_reps', rest_between_sets: 90,  set_targets: [{ weight: 45, reps: 10, rir: 2 }, { weight: 45, reps: 10, rir: 2 }, { weight: 45, reps: 10, rir: 2 }] },
    { session_id: sessionIds[1], exercise_catalog_id: epaulesId, order_index: 2, input_type: 'weight_reps', rest_between_sets: 60,  set_targets: [{ weight: 10, reps: 12, rir: 2 }, { weight: 10, reps: 12, rir: 2 }, { weight: 10, reps: 12, rir: 2 }] },
  ];

  const fullBodyExercices = [
    { session_id: sessionIds[2], exercise_catalog_id: squatId,   order_index: 0, input_type: 'weight_reps', rest_between_sets: 120, set_targets: [{ weight: 55, reps: 8, rir: 2 }, { weight: 55, reps: 8, rir: 2 }, { weight: 55, reps: 8, rir: 2 }] },
    { session_id: sessionIds[2], exercise_catalog_id: rdlId,     order_index: 1, input_type: 'weight_reps', rest_between_sets: 90,  set_targets: [{ weight: 50, reps: 10, rir: 2 }, { weight: 50, reps: 10, rir: 2 }, { weight: 50, reps: 10, rir: 2 }] },
    { session_id: sessionIds[2], exercise_catalog_id: gainageId, order_index: 2, input_type: 'cardio_duration', rest_between_sets: 60, set_targets: [{ duration: 60 }, { duration: 60 }, { duration: 60 }] },
  ];

  const allExercices = [...jambesExercices, ...hautExercices, ...fullBodyExercices].map(e => ({
    ...e,
    user_id: userId,
    completed: false,
  }));

  const { error: exError } = await supabase.from('session_exercises').insert(allExercices);

  if (exError) {
    console.error('❌  Exercices de séance :', exError.message);
  } else {
    console.log('✅  9 exercices de séance insérés (3 par séance)');
  }

  return { programId: program.id, sessionIds };
}

// ── 5. Historique de séances ──────────────────────────────────────────────────

async function seedHistory(userId: string, sessionIds: string[]) {
  console.log('📊  Insertion de l\'historique...');

  // Supprime l'historique existant de l'utilisatrice
  await supabase.from('session_history').delete().eq('user_id', userId);

  // Récupère l'ID du squat barre pour les exercise_history
  const { data: squatData } = await supabase
    .from('exercise_catalog')
    .select('id')
    .eq('name', 'Squat barre')
    .maybeSingle();

  const squatCatalogId = squatData?.id ?? null;
  const jambesSessionId = sessionIds[0]; // Séance Jambes

  // ── 4 sessions d'historique ──────────────────────────────────────────────────

  const sessionHistories = [
    // il y a 29 jours — J7 du cycle précédent (menstrual)
    {
      user_id: userId,
      session_id: jambesSessionId,
      session_name: 'Jambes',
      completed_at: agoAt(29, 9),
      duration_minutes: 45,
      feeling: 'survival',
      energy_score: 20,
      performance_score: 72,
      performance_level: 'maintained',
      total_volume: 3200,
      cycle_phase: 'menstrual',
      cycle_day: 7,
      victories: [],
    },
    // il y a 25 jours — J11 du cycle précédent (follicular)
    {
      user_id: userId,
      session_id: jambesSessionId,
      session_name: 'Jambes',
      completed_at: agoAt(25, 10),
      duration_minutes: 50,
      feeling: 'notgreat',
      energy_score: 35,
      performance_score: 85,
      performance_level: 'solid',
      total_volume: 3800,
      cycle_phase: 'follicular',
      cycle_day: 11,
      victories: [],
    },
    // il y a 21 jours — J15 du cycle précédent (ovulation)
    {
      user_id: userId,
      session_id: jambesSessionId,
      session_name: 'Jambes',
      completed_at: agoAt(21, 10),
      duration_minutes: 54,
      feeling: 'solid',
      energy_score: 70,
      performance_score: 92,
      performance_level: 'progression',
      total_volume: 4200,
      cycle_phase: 'ovulation',
      cycle_day: 15,
      victories: [],
    },
    // il y a 14 jours — J22 du cycle précédent (ovulation tardive)
    // → Record max = 62.5kg × 8 reps avant la démo
    // → Pendant la démo : saisir 65kg × 8 → déclenche new_record + double_record
    {
      user_id: userId,
      session_id: jambesSessionId,
      session_name: 'Jambes',
      completed_at: agoAt(14, 10),
      duration_minutes: 58,
      feeling: 'pr',
      energy_score: 90,
      performance_score: 105,
      performance_level: 'beyond',
      total_volume: 4900,
      cycle_phase: 'ovulation',
      cycle_day: 22,
      victories: [
        {
          type: 'new_record',
          exerciseName: 'Squat barre',
          value: 62.5,
          previousValue: 60,
          improvement: '+2.5 kg',
        },
      ],
    },
  ];

  const { data: createdHistories, error: histError } = await supabase
    .from('session_history')
    .insert(sessionHistories)
    .select('id, completed_at, cycle_phase');

  if (histError || !createdHistories) {
    console.error('❌  Historique de séances :', histError?.message);
    return;
  }

  console.log('✅  4 séances d\'historique insérées');

  // ── Exercise history pour chaque session ─────────────────────────────────────

  if (!squatCatalogId) {
    console.warn('⚠️  Squat barre introuvable dans le catalogue — exercise_history non inséré');
    return;
  }

  // Données squat par séance (weight_per_set, reps_per_set)
  const squatData_history = [
    { weight: '50,50,47.5,47.5',   reps: '8,7,8,7',   session: createdHistories[0] },
    { weight: '57.5,57.5,55,55',   reps: '8,8,8,7',   session: createdHistories[1] },
    { weight: '60,60,60,60',       reps: '8,8,8,8',   session: createdHistories[2] },
    { weight: '62.5,62.5,60,60',   reps: '8,8,8,7',   session: createdHistories[3] },
  ];

  const exerciseHistories = squatData_history.map(({ weight, reps, session }) => ({
    user_id: userId,
    session_history_id: session.id,
    exercise_catalog_id: squatCatalogId,
    user_custom_exercise_id: null,
    input_type: 'weight_reps',
    weight_per_set: weight,
    reps_per_set: reps,
    set_details: weight.split(',').map((w, i) => ({
      set: i + 1,
      target: { weight: 60, reps: 8, rir: 2 },
      actual: {
        weight: parseFloat(w),
        reps: parseInt(reps.split(',')[i]),
        rir: i === 0 || i === 1 ? 1 : 2,
      },
    })),
  }));

  const { error: exHistError } = await supabase
    .from('exercise_history')
    .insert(exerciseHistories);

  if (exHistError) {
    console.error('❌  Exercise history :', exHistError.message);
  } else {
    console.log('✅  4 exercise_history (Squat barre) insérés');
    console.log('   → Dernier record : 62.5 kg × 8 reps');
    console.log('   → Pendant la démo : saisir 65 kg × 8 pour déclencher new_record + double_record');
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  Seed démo Period. — compte Léa\n');

  const userId = await getOrCreateLea();

  await seedProfile(userId);
  await seedCycleData(userId);
  const { sessionIds } = await seedProgram(userId);
  await seedHistory(userId, sessionIds);

  console.log('\n🎉  Seed terminé !');
  console.log('\nVérifications à faire :');
  console.log('  ✓ cyclePredictionService retourne folliculaire J8');
  console.log('  ✓ La roue d\'accueil affiche l\'arc jaune "J8"');
  console.log('  ✓ Les comparaisons /preview sont visibles (dernière fois + même phase)');
  console.log('\nCompte de démo :');
  console.log(`  email    : ${LEA_EMAIL}`);
  console.log(`  password : ${LEA_PASSWORD}`);
}

main().catch(err => {
  console.error('❌  Erreur fatale :', err);
  process.exit(1);
});
