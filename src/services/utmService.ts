// Service pour les opérations CRUD et stats UTM
import { supabase } from '@/lib/supabase';
import type { UtmChannel, UtmItem, UtmItemWithStats, UtmChannelStats } from '@/types/utm';

// --- Canaux ---

export async function getChannels(): Promise<{ data: UtmChannel[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('utm_channels')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createChannel(
  name: string,
  medium: string
): Promise<{ data: UtmChannel | null; error: string | null }> {
  const { data, error } = await supabase
    .from('utm_channels')
    .insert({ name, medium })
    .select()
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function deleteChannel(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('utm_channels').delete().eq('id', id);
  if (error) return { error: error.message };
  return { error: null };
}

// --- Items ---

export async function getItems(
  channelId: string
): Promise<{ data: UtmItem[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('utm_items')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createItem(
  item: Omit<UtmItem, 'id' | 'created_at'>
): Promise<{ data: UtmItem | null; error: string | null }> {
  // Génère le slug à partir du nom — stable même si le display name change
  const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const { data, error } = await supabase
    .from('utm_items')
    .insert({ ...item, slug })
    .select()
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function deleteItem(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('utm_items').delete().eq('id', id);
  if (error) return { error: error.message };
  return { error: null };
}

// --- Stats ---

export async function getItemsWithStats(
  channelId: string
): Promise<{ data: UtmItemWithStats[] | null; error: string | null }> {
  // Récupère les items du canal
  const { data: items, error: itemsError } = await supabase
    .from('utm_items')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false });

  if (itemsError) return { data: null, error: itemsError.message };
  if (!items || items.length === 0) return { data: [], error: null };

  const itemIds = items.map((i) => i.id);
  const itemSlugs = items.map((i) => i.slug).filter(Boolean);

  // Récupère les events liés par item_id OU par utm_campaign slug (fallback)
  const orFilter = itemSlugs.length > 0
    ? `item_id.in.(${itemIds.join(',')}),utm_campaign.in.(${itemSlugs.map((s) => `"${s}"`).join(',')})`
    : `item_id.in.(${itemIds.join(',')})`;

  const { data: events, error: eventsError } = await supabase
    .from('utm_events')
    .select('item_id, event_type, utm_campaign')
    .or(orFilter);

  if (eventsError) return { data: null, error: eventsError.message };

  // Index items par id et par slug pour l'attribution
  const itemById: Record<string, string> = {};
  const itemByName: Record<string, string> = {};
  for (const item of items) {
    itemById[item.id] = item.id;
    if (item.slug) itemByName[item.slug] = item.id;
  }

  // Agrège par item
  const statsMap: Record<string, { visits: number; signups: number; bounces: number }> = {};
  for (const item of items) {
    statsMap[item.id] = { visits: 0, signups: 0, bounces: 0 };
  }
  for (const ev of events ?? []) {
    // Résout l'item cible : d'abord item_id, sinon utm_campaign
    const targetId = (ev.item_id && itemById[ev.item_id])
      ? ev.item_id
      : (ev.utm_campaign && itemByName[ev.utm_campaign])
        ? itemByName[ev.utm_campaign]
        : null;

    if (!targetId || !statsMap[targetId]) continue;
    if (ev.event_type === 'visit') statsMap[targetId].visits++;
    else if (ev.event_type === 'signup') statsMap[targetId].signups++;
    else if (ev.event_type === 'bounce') statsMap[targetId].bounces++;
  }

  const data: UtmItemWithStats[] = items.map((item) => ({
    ...item,
    ...statsMap[item.id],
  }));

  return { data, error: null };
}

export async function getChannelStats(
  channelId: string
): Promise<{ data: UtmChannelStats | null; error: string | null }> {
  // Récupère les items du canal
  const { data: items, error: itemsError } = await supabase
    .from('utm_items')
    .select('id, name, slug')
    .eq('channel_id', channelId);

  if (itemsError) return { data: null, error: itemsError.message };
  if (!items || items.length === 0) return { data: { visits: 0, signups: 0, bounces: 0 }, error: null };

  const itemIds = items.map((i) => i.id);
  const itemSlugs = items.map((i) => i.slug).filter(Boolean);

  // Même logique que getItemsWithStats : item_id OU utm_campaign slug
  const orFilter = itemSlugs.length > 0
    ? `item_id.in.(${itemIds.join(',')}),utm_campaign.in.(${itemSlugs.map((s) => `"${s}"`).join(',')})`
    : `item_id.in.(${itemIds.join(',')})`;

  const { data: events, error: eventsError } = await supabase
    .from('utm_events')
    .select('event_type')
    .or(orFilter);

  if (eventsError) return { data: null, error: eventsError.message };

  const stats = { visits: 0, signups: 0, bounces: 0 };
  for (const ev of events ?? []) {
    if (ev.event_type === 'visit') stats.visits++;
    else if (ev.event_type === 'signup') stats.signups++;
    else if (ev.event_type === 'bounce') stats.bounces++;
  }

  return { data: stats, error: null };
}
