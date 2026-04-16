// Hook de lecture et tracking des paramètres UTM à l'arrivée dans l'app
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'utm_params';
const SESSION_ID_KEY = 'utm_session_id';
// Clé pour éviter de tracker deux fois la même visite (StrictMode en dev)
const TRACKED_KEY = 'utm_visit_tracked';

/** Récupère ou crée un identifiant de session persistant dans localStorage */
function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    // Génère un UUID v4 simple sans dépendance externe
    sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

interface UtmParams {
  utm_source: string;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
}

function saveUtmParams(params: UtmParams) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  // Réinitialise le flag de tracking à chaque nouveau set de params
  localStorage.removeItem(TRACKED_KEY);
}

export function getStoredUtmParams(): UtmParams | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UtmParams;
  } catch {
    return null;
  }
}

async function findItemId(utmCampaign: string | null): Promise<string | null> {
  if (!utmCampaign) return null;
  // Cherche par slug — stable même si le nom d'affichage change
  const { data } = await supabase
    .from('utm_items')
    .select('id')
    .eq('slug', utmCampaign)
    .maybeSingle();
  return data?.id ?? null;
}

export function useUtmTracking() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const utm_source = searchParams.get('utm_source');

    // Pas de utm_source → aucun paramètre UTM, rien à faire
    if (!utm_source) return;

    const params: UtmParams = {
      utm_source,
      utm_medium: searchParams.get('utm_medium'),
      utm_campaign: searchParams.get('utm_campaign'),
      utm_content: searchParams.get('utm_content'),
    };

    // Sauvegarde dans localStorage pour persister après navigation / changement d'onglet
    saveUtmParams(params);

    // Évite le double tracking (React StrictMode remonte deux fois en dev)
    if (localStorage.getItem(TRACKED_KEY)) return;
    localStorage.setItem(TRACKED_KEY, '1');

    async function trackVisit() {
      const item_id = await findItemId(params.utm_campaign);
      const session_id = getOrCreateSessionId();

      const { error } = await supabase.from('utm_events').insert({
        item_id,
        utm_source: params.utm_source,
        utm_medium: params.utm_medium,
        utm_campaign: params.utm_campaign,
        utm_content: params.utm_content,
        event_type: 'visit',
        user_id: null,
        session_id,
      });

      if (error) {
        console.error('[UTM] Erreur insert visit:', error.message);
        // Retire le flag pour réessayer au prochain chargement
        localStorage.removeItem(TRACKED_KEY);
      }
    }

    trackVisit();
  // Re-déclenche si les searchParams changent (navigation SPA vers une URL avec UTM)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);
}

/**
 * Enregistre un event "signup" en lisant les params UTM depuis localStorage.
 * À appeler après un signup réussi en passant l'userId nouvellement créé.
 */
export async function trackUtmSignup(userId: string): Promise<void> {
  const params = getStoredUtmParams();
  if (!params) return;

  const item_id = await findItemId(params.utm_campaign);
  const session_id = getOrCreateSessionId();

  const { error } = await supabase.from('utm_events').insert({
    item_id,
    utm_source: params.utm_source,
    utm_medium: params.utm_medium,
    utm_campaign: params.utm_campaign,
    utm_content: params.utm_content,
    event_type: 'signup',
    user_id: userId,
    session_id,
  });

  if (error) {
    console.error('[UTM] Erreur insert signup:', error.message);
  }
}
