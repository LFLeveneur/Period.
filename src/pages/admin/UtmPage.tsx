// Page admin de gestion des canaux et liens UTM — réservée aux admins (is_admin = true)
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  getChannels,
  createChannel,
  deleteChannel,
  getItemsWithStats,
  createItem,
  deleteItem,
  getChannelStats,
} from '@/services/utmService';
import type { UtmChannel, UtmItemWithStats, UtmChannelStats } from '@/types/utm';

// Transforme une chaîne en slug URL-safe
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const DESTINATION_PAGES = ['/', '/signup', '/home', '/features', '/cycle', '/programs'];
const ITEM_TYPES = ['Post', 'Story', 'Email', 'Article', 'Lien', 'Pub'];
const APP_BASE_URL = window.location.origin;

function buildUtmLink(channel: UtmChannel, item: UtmItemWithStats): string {
  const params = new URLSearchParams();
  params.set('utm_source', slug(channel.name));
  params.set('utm_medium', slug(channel.medium));
  // Utilise le slug persistant de l'item — stable si le nom change
  params.set('utm_campaign', item.slug);
  if (item.note) params.set('utm_content', slug(item.note));
  return `${APP_BASE_URL}${item.destination_page}?${params.toString()}`;
}

function conversionRate(signups: number, visits: number): string {
  if (visits === 0) return '0%';
  return `${((signups / visits) * 100).toFixed(1)}%`;
}

function bounceRate(bounces: number, visits: number): string {
  if (visits === 0) return '0%';
  return `${((bounces / visits) * 100).toFixed(1)}%`;
}

/** Card de statistiques compacte */
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3) var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
        minWidth: '80px',
      }}
    >
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text)' }}>
        {value}
      </span>
    </div>
  );
}

export function UtmPage() {
  const { user, profile, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();

  // Canaux
  const [channels, setChannels] = useState<UtmChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelMedium, setNewChannelMedium] = useState('social');
  const [showNewChannel, setShowNewChannel] = useState(false);

  // Items du canal sélectionné
  const [items, setItems] = useState<UtmItemWithStats[]>([]);
  const [channelStats, setChannelStats] = useState<UtmChannelStats | null>(null);
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState(ITEM_TYPES[0]);
  const [newItemPage, setNewItemPage] = useState('/');
  const [newItemNote, setNewItemNote] = useState('');

  // UI
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard admin
  useEffect(() => {
    if (!authLoading && (!user || !profile?.is_admin)) {
      navigate('/home', { replace: true });
    }
  }, [user, profile, authLoading, navigate]);

  // Chargement des canaux
  useEffect(() => {
    if (!profile?.is_admin) return;
    getChannels().then(({ data, error }) => {
      if (error) setError(error);
      else {
        setChannels(data ?? []);
        if (data && data.length > 0) setSelectedChannelId(data[0].id);
      }
    });
  }, [profile?.is_admin]);

  // Chargement des items quand le canal sélectionné change
  const loadItems = useCallback(async (channelId: string) => {
    setLoading(true);
    const [itemsRes, statsRes] = await Promise.all([
      getItemsWithStats(channelId),
      getChannelStats(channelId),
    ]);
    if (itemsRes.error) setError(itemsRes.error);
    else setItems(itemsRes.data ?? []);
    if (statsRes.error) setError(statsRes.error);
    else setChannelStats(statsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedChannelId) loadItems(selectedChannelId);
  }, [selectedChannelId, loadItems]);

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) ?? null;

  // Créer un canal
  async function handleCreateChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    const { data, error } = await createChannel(newChannelName.trim(), newChannelMedium);
    if (error) { setError(error); return; }
    if (data) {
      setChannels((prev) => [data, ...prev]);
      setSelectedChannelId(data.id);
      setNewChannelName('');
      setShowNewChannel(false);
    }
  }

  // Supprimer un canal
  async function handleDeleteChannel(id: string) {
    if (!confirm('Supprimer ce canal et tous ses items ?')) return;
    const { error } = await deleteChannel(id);
    if (error) { setError(error); return; }
    setChannels((prev) => prev.filter((c) => c.id !== id));
    if (selectedChannelId === id) {
      const remaining = channels.filter((c) => c.id !== id);
      setSelectedChannelId(remaining[0]?.id ?? null);
    }
  }

  // Créer un item
  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim() || !selectedChannelId) return;
    const name = newItemName.trim();
    const itemSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { data, error } = await createItem({
      channel_id: selectedChannelId,
      name,
      slug: itemSlug,
      type: newItemType,
      destination_page: newItemPage,
      note: newItemNote.trim() || null,
    });
    if (error) { setError(error); return; }
    if (data) {
      setItems((prev) => [{ ...data, visits: 0, returns: 0, signups: 0, bounces: 0 }, ...prev]);
      setNewItemName('');
      setNewItemType(ITEM_TYPES[0]);
      setNewItemPage('/');
      setNewItemNote('');
      setShowNewItem(false);
    }
  }

  // Supprimer un item
  async function handleDeleteItem(id: string) {
    if (!confirm('Supprimer cet item ?')) return;
    const { error } = await deleteItem(id);
    if (error) { setError(error); return; }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  // Copier le lien UTM
  async function handleCopy(item: UtmItemWithStats) {
    if (!selectedChannel) return;
    const link = buildUtmLink(selectedChannel, item);
    await navigator.clipboard.writeText(link);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (authLoading || !user || !profile?.is_admin) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* En-tête */}
      <div style={{ padding: 'var(--space-6) var(--space-4) var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text)' }}>
          UTM 🔗
        </h1>
        <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          Génère et suis tes liens de distribution
        </p>
      </div>

      {error && (
        <div style={{ margin: 'var(--space-4)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-error)', color: 'var(--color-text-light)', fontSize: 'var(--text-sm)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — liste des canaux */}
        <aside
          style={{
            width: '220px',
            minWidth: '220px',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            padding: 'var(--space-4)',
            gap: 'var(--space-2)',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Canaux
            </span>
            <button
              onClick={() => setShowNewChannel((v) => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 'var(--text-xl)', lineHeight: 1, padding: 0 }}
            >
              +
            </button>
          </div>

          {/* Formulaire nouveau canal */}
          {showNewChannel && (
            <form onSubmit={handleCreateChannel} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', padding: 'var(--space-3)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <input
                placeholder="Nom (ex: Instagram)"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                required
                style={inputStyle}
              />
              <select value={newChannelMedium} onChange={(e) => setNewChannelMedium(e.target.value)} style={inputStyle}>
                {['social', 'email', 'pr', 'paid'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <button type="submit" style={btnPrimaryStyle}>Créer</button>
            </form>
          )}

          {/* Liste des canaux */}
          {channels.map((ch) => (
            <div
              key={ch.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                backgroundColor: selectedChannelId === ch.id ? 'var(--color-primary)' : 'transparent',
                color: selectedChannelId === ch.id ? 'var(--color-text-light)' : 'var(--color-text)',
                transition: 'background-color var(--duration-fast)',
              }}
              onClick={() => setSelectedChannelId(ch.id)}
            >
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'] }}>
                  {ch.name}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', opacity: 0.7 }}>{ch.medium}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteChannel(ch.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: 'var(--text-sm)', color: 'inherit', padding: '0 0 0 var(--space-2)' }}
              >
                ✕
              </button>
            </div>
          ))}

          {channels.length === 0 && (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 'var(--space-4)' }}>
              Aucun canal
            </p>
          )}
        </aside>

        {/* Zone principale */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {!selectedChannel ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Sélectionne ou crée un canal pour commencer.
            </p>
          ) : (
            <>
              {/* Stats du canal */}
              <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <h2 style={sectionTitleStyle}>{selectedChannel.name} — statistiques globales</h2>
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <StatCard label="Visites" value={channelStats?.visits ?? 0} />
                  <StatCard label="Retours" value={channelStats?.returns ?? 0} />
                  <StatCard label="Inscriptions" value={channelStats?.signups ?? 0} />
                  <StatCard label="Conversion" value={conversionRate(channelStats?.signups ?? 0, channelStats?.visits ?? 0)} />
                  <StatCard label="Rebond" value={bounceRate(channelStats?.bounces ?? 0, channelStats?.visits ?? 0)} />
                </div>
              </section>

              {/* Items */}
              <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={sectionTitleStyle}>Items ({items.length})</h2>
                  <button onClick={() => setShowNewItem((v) => !v)} style={btnPrimaryStyle}>
                    + Nouvel item
                  </button>
                </div>

                {/* Formulaire nouvel item */}
                {showNewItem && (
                  <form
                    onSubmit={handleCreateItem}
                    style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                        <label style={labelStyle}>Nom (utm_campaign)</label>
                        <input placeholder="ex: post-reels-squat" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} required style={inputStyle} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                        <label style={labelStyle}>Type</label>
                        <select value={newItemType} onChange={(e) => setNewItemType(e.target.value)} style={inputStyle}>
                          {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                        <label style={labelStyle}>Page de destination</label>
                        <select value={newItemPage} onChange={(e) => setNewItemPage(e.target.value)} style={inputStyle}>
                          {DESTINATION_PAGES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                        <label style={labelStyle}>Note (utm_content)</label>
                        <input placeholder="ex: variante-A" value={newItemNote} onChange={(e) => setNewItemNote(e.target.value)} style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button type="submit" style={btnPrimaryStyle}>Créer l'item</button>
                      <button type="button" onClick={() => setShowNewItem(false)} style={btnSecondaryStyle}>Annuler</button>
                    </div>
                  </form>
                )}

                {/* Liste des items */}
                {loading ? (
                  <div style={{ height: '80px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-border)' }} />
                ) : items.length === 0 ? (
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Aucun item. Crée-en un !</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {items.map((item) => {
                      const link = buildUtmLink(selectedChannel, item);
                      return (
                        <div
                          key={item.id}
                          style={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
                        >
                          {/* En-tête item */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <span style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text)' }}>
                                {item.name}
                              </span>
                              <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                                {item.type}
                              </span>
                              {item.note && (
                                <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                  · {item.note}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', fontSize: 'var(--text-sm)', padding: 0 }}
                            >
                              Supprimer
                            </button>
                          </div>

                          {/* Lien UTM */}
                          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                            <code
                              style={{
                                flex: 1,
                                fontSize: 'var(--text-xs)',
                                color: 'var(--color-text-muted)',
                                backgroundColor: 'var(--color-bg)',
                                padding: 'var(--space-2) var(--space-3)',
                                borderRadius: 'var(--radius-md)',
                                wordBreak: 'break-all',
                                fontFamily: 'monospace',
                              }}
                            >
                              {link}
                            </code>
                            <button
                              onClick={() => handleCopy(item)}
                              style={{
                                ...btnPrimaryStyle,
                                whiteSpace: 'nowrap',
                                backgroundColor: copiedId === item.id ? 'var(--color-success)' : 'var(--color-primary)',
                              }}
                            >
                              {copiedId === item.id ? '✓ Copié' : 'Copier'}
                            </button>
                          </div>

                          {/* Stats de l'item */}
                          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                            <span style={statInlineStyle}>👁 {item.visits} visites</span>
                            <span style={statInlineStyle}>🔁 {item.returns} retours</span>
                            <span style={statInlineStyle}>✍️ {item.signups} inscriptions</span>
                            <span style={statInlineStyle}>📈 {conversionRate(item.signups, item.visits)} conv.</span>
                            <span style={statInlineStyle}>↩ {bounceRate(item.bounces, item.visits)} rebond</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// Styles réutilisables
const inputStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  fontSize: 'var(--text-sm)',
  backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-family)',
  width: '100%',
  boxSizing: 'border-box',
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-4)',
  borderRadius: 'var(--radius-full)',
  border: 'none',
  backgroundColor: 'var(--color-primary)',
  color: 'var(--color-text-light)',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
  cursor: 'pointer',
  fontFamily: 'var(--font-family)',
};

const btnSecondaryStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-4)',
  borderRadius: 'var(--radius-full)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-muted)',
  fontSize: 'var(--text-sm)',
  cursor: 'pointer',
  fontFamily: 'var(--font-family)',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 'var(--text-base)',
  fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
  color: 'var(--color-text)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-text-muted)',
  fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
};

const statInlineStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-text-muted)',
  backgroundColor: 'var(--color-bg)',
  padding: '2px var(--space-2)',
  borderRadius: 'var(--radius-full)',
};
