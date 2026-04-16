// Types pour le système de tracking UTM

export interface UtmChannel {
  id: string;
  name: string;
  medium: string;
  created_at: string;
}

export interface UtmItem {
  id: string;
  channel_id: string;
  name: string;
  slug: string;
  type: string;
  destination_page: string;
  note: string | null;
  created_at: string;
}

export interface UtmEvent {
  id: string;
  item_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  event_type: 'visit' | 'signup' | 'bounce';
  user_id: string | null;
  created_at: string;
}

export interface UtmItemWithStats extends UtmItem {
  visits: number;
  signups: number;
  bounces: number;
}

export interface UtmChannelStats {
  visits: number;
  signups: number;
  bounces: number;
}
