// Service de gestion du profil utilisateur
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/auth';
import type { Program } from '@/types/workout';

/** Statistiques de progression de l'utilisatrice */
export interface ProfileStats {
  sessionsCount: number;
  cyclesCount: number;
}

/** Programme actif avec nombre de séances */
export interface ActiveProgram extends Program {
  sessionsCount: number;
}

// Récupère le profil d'une utilisatrice par son user_id
export async function getProfile(
  userId: string
): Promise<{ data: Profile | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as Profile | null, error: null };
}

// Met à jour les champs du profil d'une utilisatrice
export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<{ error: string | null }> {
  // Exclut les champs non modifiables
  const { id: _id, user_id: _uid, created_at: _ca, ...safeUpdates } = updates as Partial<Profile> & {
    id?: string;
    user_id?: string;
    created_at?: string;
  };

  const { error } = await supabase
    .from('profiles')
    .update({ ...safeUpdates, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Upload et remplace l'avatar de l'utilisatrice.
 * Bucket : avatars/{userId}/avatar.{ext} — upsert: true.
 * Retourne la nouvelle URL publique.
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ data: string | null; error: string | null }> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    console.error('[profileService] uploadAvatar', uploadError);
    return { data: null, error: uploadError.message };
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  // Met à jour avatar_url dans profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (profileError) {
    console.error('[profileService] uploadAvatar update profile', profileError);
    return { data: null, error: profileError.message };
  }

  return { data: publicUrl, error: null };
}

/**
 * Supprime le compte de l'utilisatrice via RPC.
 * La suppression des données est gérée côté Supabase (RPC delete_user).
 */
export async function deleteAccount(): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('delete_user');
  if (error) {
    console.error('[profileService] deleteAccount', error);
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Récupère les statistiques de progression de l'utilisatrice.
 * - sessionsCount : nombre de séances complétées
 * - cyclesCount : nombre de débuts de règles déclarés (cycle_day = 1)
 */
export async function getProfileStats(
  userId: string
): Promise<{ data: ProfileStats | null; error: string | null }> {
  const [sessionsResult, cyclesResult] = await Promise.all([
    supabase
      .from('session_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('health_data')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  if (sessionsResult.error) return { data: null, error: sessionsResult.error.message };
  if (cyclesResult.error) return { data: null, error: cyclesResult.error.message };

  return {
    data: {
      sessionsCount: sessionsResult.count ?? 0,
      cyclesCount: cyclesResult.count ?? 0,
    },
    error: null,
  };
}

/**
 * Récupère le programme actif avec le nombre de séances.
 * Retourne null si aucun programme actif.
 */
export async function getActiveProgramWithSessions(
  userId: string
): Promise<{ data: ActiveProgram | null; error: string | null }> {
  // Récupère le programme actif
  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (programError) {
    console.error('[profileService] getActiveProgramWithSessions program', programError);
    return { data: null, error: programError.message };
  }

  if (!program) {
    return { data: null, error: null };
  }

  // Récupère le nombre de séances pour ce programme
  const { count, error: countError } = await supabase
    .from('program_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('program_id', program.id)
    .eq('user_id', userId);

  if (countError) {
    console.error('[profileService] getActiveProgramWithSessions count', countError);
    return { data: null, error: countError.message };
  }

  return {
    data: {
      ...program,
      sessionsCount: count ?? 0,
    },
    error: null,
  };
}
