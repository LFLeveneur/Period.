// Hook de lecture et tracking des paramètres UTM à l'arrivée dans l'app
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'utm_params';
const SESSION_ID_KEY = 'utm_session_id';
// Clé qui stocke les campaigns déjà visitées par cet appareil : Set sérialisé en JSON
const VISITED_CAMPAIGNS_KEY = 'utm_visited_campaigns';

// Set en mémoire — bloque le double-firing de React StrictMode
// Se réinitialise à chaque chargement de page (contrairement à localStorage)
const trackedThisLoad = new Set<string>();

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

    const campaignKey = params.utm_campaign ?? params.utm_source ?? '_';

    // Bloque le double-firing de React StrictMode (en mémoire, réinitialisé à chaque page load)
    if (trackedThisLoad.has(campaignKey)) return;
    trackedThisLoad.add(campaignKey);

    // Sauvegarde dans localStorage pour persister après navigation / changement d'onglet
    saveUtmParams(params);

    async function trackVisit() {
      const item_id = await findItemId(params.utm_campaign);
      const session_id = getOrCreateSessionId();

      // Vérifie si cet appareil a déjà visité cette campaign (première visite vs retour)
      const visitedRaw = localStorage.getItem(VISITED_CAMPAIGNS_KEY);
      const visited: string[] = visitedRaw ? (JSON.parse(visitedRaw) as string[]) : [];
      const isReturn = visited.includes(campaignKey);

      // Marque cette campaign comme visitée pour les prochains retours
      if (!isReturn) {
        localStorage.setItem(VISITED_CAMPAIGNS_KEY, JSON.stringify([...visited, campaignKey]));
      }

      const { error } = await supabase.from('utm_events').insert({
        item_id,
        utm_source: params.utm_source,
        utm_medium: params.utm_medium,
        utm_campaign: params.utm_campaign,
        utm_content: params.utm_content,
        event_type: isReturn ? 'return' : 'visit',
        user_id: null,
        session_id,
      });

      if (error) {
        console.error('[UTM] Erreur insert visit:', error.message);
        // Retire du Set pour réessayer au prochain chargement de page
        trackedThisLoad.delete(campaignKey);
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
