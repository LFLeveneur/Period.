// Page profil utilisateur — /profile
import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { updateProfile, uploadAvatar, deleteAccount, getProfileStats, getActiveProgramWithSessions, type ActiveProgram } from '@/services/profileService';
import { signOut, resetPassword } from '@/services/authService';
import { declarePeriodToday, updateCycleDefaults } from '@/services/healthDataService';
import { fetchCycleStats } from '@/services/cyclePredictionService';
import { pauseProgram } from '@/services/programService';
import { Toggle } from '@/components/ui/Toggle';
import { Modal } from '@/components/ui/Modal';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import * as analytics from '@/lib/analytics';
import type { ProfileStats } from '@/services/profileService';
import type { Profile } from '@/types/auth';
import {
  User,
  Activity,
  Lock,
  Trash2,
  ChevronRight,
  Dumbbell,
  Heart,
  LogOut,
  BarChart2,
} from 'lucide-react';

// ─── Composants de mise en page ───────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: '0 0 var(--space-2)',
        fontFamily: 'var(--font-family)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
        color: 'var(--color-text-muted)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        paddingLeft: 'var(--space-1)',
      }}
    >
      {children}
    </p>
  );
}

function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-border)',
      }}
    >
      {children}
    </div>
  );
}

interface IconBadgeProps {
  children: ReactNode;
  bg: string;
  color: string;
}

function IconBadge({ children, bg, color }: IconBadgeProps) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 'var(--radius-sm)',
        backgroundColor: bg,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

interface SettingsRowProps {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  rightElement?: ReactNode;
  danger?: boolean;
  onPress?: () => void;
  noBorder?: boolean;
}

function SettingsRow({ icon, iconBg, iconColor, label, rightElement, danger, onPress, noBorder }: SettingsRowProps) {
  return (
    <div
      onClick={onPress}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: noBorder ? 'none' : '1px solid var(--color-border)',
        cursor: onPress ? 'pointer' : 'default',
        minHeight: 52,
        backgroundColor: 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <IconBadge bg={iconBg} color={iconColor}>
        {icon}
      </IconBadge>
      <span
        style={{
          flex: 1,
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--text-base)',
          fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
          color: danger ? 'var(--color-error)' : 'var(--color-text)',
        }}
      >
        {label}
      </span>
      {rightElement ?? (onPress && <ChevronRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />)}
    </div>
  );
}

function ValueBadge({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-family)',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text-muted)',
      }}
    >
      {children}
    </span>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

/** Formate aujourd'hui en YYYY-MM-DD */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuthContext();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [stats, setStats] = useState<ProfileStats>({ sessionsCount: 0, cyclesCount: 0 });
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null);
  const [cycleLength, setCycleLength] = useState<number | null>(null);
  const [periodLength, setPeriodLength] = useState<number | null>(null);
  const [declareOpen, setDeclareOpen] = useState(false);
  const [declareLoading, setDeclareLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [editingCycleLength, setEditingCycleLength] = useState<string | null>(null);
  const [editingPeriodLength, setEditingPeriodLength] = useState<string | null>(null);

  // Initialise le prénom depuis le profil
  useEffect(() => {
    if (profile?.name) setName(profile.name);
    if (profile?.avatar_url) setAvatarPreview(profile.avatar_url);
  }, [profile]);

  // Charge les stats, données de cycle et programme actif
  useEffect(() => {
    if (!user) return;
    getProfileStats(user.id).then(({ data }) => {
      if (data) setStats(data);
    });
    fetchCycleStats(user.id).then(stats => {
      if (stats) {
        setCycleLength(stats.avgCycleLength);
        setPeriodLength(stats.avgPeriodLength);
      }
    });
    getActiveProgramWithSessions(user.id).then(({ data }) => {
      setActiveProgram(data);
    });
  }, [user]);

  // Sauvegarde un champ du profil immédiatement
  const handleSave = async (updates: Parameters<typeof updateProfile>[1]) => {
    if (!user) return;
    const key = Object.keys(updates)[0];
    setSavingField(key);
    const { error } = await updateProfile(user.id, updates);
    if (error) {
      showToast('impossible de sauvegarder les modifications.', 'error');
    } else {
      await refreshProfile();
    }
    setSavingField(null);
  };

  // Upload d'avatar avec validation
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (file.size > MAX_SIZE) {
      showToast('fichier trop lourd (max 5 MB)', 'error');
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('format non supporté (jpg, png, webp)', 'error');
      return;
    }

    // Prévisualisation immédiate
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);

    const { data: url, error } = await uploadAvatar(user.id, file);
    if (error) {
      showToast("impossible d'uploader la photo.", 'error');
      setAvatarPreview(profile?.avatar_url ?? null);
    } else if (url) {
      setAvatarPreview(url);
      analytics.track('profile_avatar_updated');
      await refreshProfile();
    }
  };

  // Déclaration des règles depuis le profil
  const handleDeclarePeriod = async () => {
    if (!user) return;
    setDeclareLoading(true);
    const { alreadyExists, error } = await declarePeriodToday(user.id, todayStr());
    if (error) {
      showToast("impossible d'enregistrer.", 'error');
    } else if (alreadyExists) {
      showToast("règles déjà déclarées aujourd'hui.", 'info');
    } else {
      showToast('règles enregistrées 🖤', 'success');
    }
    setDeclareOpen(false);
    setDeclareLoading(false);
  };

  // Reset mot de passe
  const handleResetPassword = async () => {
    if (!user?.email) return;
    await resetPassword(user.email);
    showToast('email envoyé 🖤', 'success');
  };

  // Déconnexion — on attend la confirmation Supabase avant de rediriger
  const handleSignOut = async () => {
    analytics.track('auth_user_signed_out');
    const { error } = await signOut();
    if (error) {
      showToast('impossible de se déconnecter.', 'error');
      return;
    }
    navigate('/login', { replace: true });
  };

  // Suppression de compte
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    analytics.track('auth_user_deleted');
    const { error } = await deleteAccount();
    if (error) {
      showToast('impossible de supprimer le compte.', 'error');
      setDeleteLoading(false);
      setDeleteOpen(false);
      return;
    }
    await signOut();
    navigate('/login', { replace: true });
    showToast('compte supprimé.', 'success');
  };

  // Mise en pause du programme actif
  const handlePauseProgram = async () => {
    if (!activeProgram) return;
    setPauseLoading(true);
    const { error } = await pauseProgram(activeProgram.id);
    if (error) {
      showToast('impossible de mettre en pause.', 'error');
      setPauseLoading(false);
      setPauseOpen(false);
      return;
    }
    setPauseOpen(false);
    setPauseLoading(false);
    showToast('programme mis en pause.', 'info');
    const { data } = await getActiveProgramWithSessions(user?.id ?? '');
    setActiveProgram(data);
  };

  // Sauvegarde la durée du cycle
  const handleSaveCycleLength = async () => {
    if (!user || editingCycleLength === null) return;
    const newLength = parseInt(editingCycleLength, 10);
    if (isNaN(newLength) || newLength < 20 || newLength > 60) {
      showToast('durée du cycle entre 20 et 60 jours.', 'error');
      return;
    }
    setSavingField('cycle_length');
    const { error } = await updateCycleDefaults(user.id, newLength, periodLength ?? 5);
    if (error) {
      showToast('impossible de sauvegarder.', 'error');
      setSavingField(null);
      setEditingCycleLength(null);
    } else {
      setCycleLength(newLength);
      setEditingCycleLength(null);
      setSavingField(null);
      showToast('durée du cycle mise à jour.', 'success');
    }
  };

  // Sauvegarde la durée des règles
  const handleSavePeriodLength = async () => {
    if (!user || editingPeriodLength === null) return;
    const newLength = parseInt(editingPeriodLength, 10);
    if (isNaN(newLength) || newLength < 2 || newLength > 10) {
      showToast('durée des règles entre 2 et 10 jours.', 'error');
      return;
    }
    setSavingField('period_length');
    const { error } = await updateCycleDefaults(user.id, cycleLength ?? 28, newLength);
    if (error) {
      showToast('impossible de sauvegarder.', 'error');
      setSavingField(null);
      setEditingPeriodLength(null);
    } else {
      setPeriodLength(newLength);
      setEditingPeriodLength(null);
      setSavingField(null);
      showToast('durée des règles mise à jour.', 'success');
    }
  };

  if (!profile || !user) return null;

  const levelLabel: Record<string, string> = {
    debutant: 'débutante',
    intermediaire: 'intermédiaire',
    avance: 'avancée',
  };

  return (
    <div
      style={{
        background: 'var(--color-bg)',
        minHeight: '100vh',
        padding: 'var(--space-6) var(--space-4) 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        paddingBottom: 'calc(var(--space-4) + 80px)',
      }}
    >
      {/* En-tête */}
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--text-3xl)',
          fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text)',
        }}
      >
        profil & réglages
      </h1>

      {/* Carte profil */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
          cursor: 'pointer',
        }}
        onClick={() => fileRef.current?.click()}
      >
        {/* Avatar */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: 'var(--color-primary-light)',
            border: '2px solid var(--color-border)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: 'var(--font-family)', fontSize: 'var(--text-2xl)', color: 'var(--color-primary)', fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'] }}>
              {profile.name?.[0]?.toUpperCase() ?? '?'}
            </span>
          )}
        </div>

        {/* Infos */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <input
              value={name}
              onChange={e => { e.stopPropagation(); setName(e.target.value); }}
              onBlur={() => handleSave({ name })}
              onClick={e => e.stopPropagation()}
              placeholder="ton prénom"
              style={{
                background: 'transparent',
                border: 'none',
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text)',
                outline: 'none',
                padding: 0,
                width: '100%',
              }}
            />
            {savingField === 'name' && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>✓</span>
            )}
          </div>
          <p style={{ margin: 0, fontFamily: 'var(--font-family)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            {levelLabel[profile.level ?? 'intermediaire']} · {user.email}
          </p>
        </div>

        <ChevronRight size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
      </div>

      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        ref={fileRef}
        hidden
        onChange={handleAvatarUpload}
      />

      {/* Section Mon profil */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <SectionLabel>Mon profil</SectionLabel>
        <SettingsCard>
          <SettingsRow
            icon={<User size={18} />}
            iconBg="var(--color-primary-light)"
            iconColor="var(--color-primary)"
            label="niveau"
            rightElement={
              <select
                value={profile.level ?? 'intermediaire'}
                onChange={e => handleSave({ level: e.target.value as Profile['level'] })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                }}
              >
                <option value="debutant">débutante</option>
                <option value="intermediaire">intermédiaire</option>
                <option value="avance">avancée</option>
              </select>
            }
          />
          <SettingsRow
            icon={<Activity size={18} />}
            iconBg="rgba(48, 202, 140, 0.12)"
            iconColor="var(--color-luteal)"
            label="objectif"
            noBorder
            rightElement={
              <select
                value={profile.objective ?? 'equilibre'}
                onChange={e => handleSave({ objective: e.target.value as Profile['objective'] })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                }}
              >
                <option value="masse">prise de masse</option>
                <option value="perte">perte de poids</option>
                <option value="tonification">tonification</option>
                <option value="equilibre">équilibre</option>
              </select>
            }
          />
        </SettingsCard>
      </div>

      {/* Section Mon cycle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <SectionLabel>Mon cycle</SectionLabel>
        <SettingsCard>
          <SettingsRow
            icon={<Heart size={18} />}
            iconBg="rgba(222, 48, 49, 0.12)"
            iconColor="var(--color-menstrual)"
            label="suivi du cycle"
            noBorder={!profile.cycle_tracking}
            rightElement={
              <Toggle
                checked={profile.cycle_tracking ?? false}
                onChange={v => {
                  handleSave({ cycle_tracking: v });
                  analytics.track(v ? 'cycle_tracking_enabled' : 'cycle_tracking_disabled', { source: 'profile' });
                }}
              />
            }
          />
          {profile.cycle_tracking && cycleLength !== null && (
            <div
              onClick={() => !editingCycleLength && setEditingCycleLength(String(cycleLength))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: '1px solid var(--color-border)',
                cursor: editingCycleLength === null ? 'pointer' : 'default',
                minHeight: 52,
                backgroundColor: 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <IconBadge bg="rgba(48, 61, 202, 0.12)" color="var(--color-ovulation)">
                <BarChart2 size={18} />
              </IconBadge>
              <span
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
                  color: 'var(--color-text)',
                }}
              >
                durée du cycle
              </span>
              {editingCycleLength !== null ? (
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <input
                    type="number"
                    value={editingCycleLength}
                    onChange={e => setEditingCycleLength(e.target.value)}
                    onBlur={handleSaveCycleLength}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveCycleLength();
                      if (e.key === 'Escape') setEditingCycleLength(null);
                    }}
                    autoFocus
                    min={20}
                    max={60}
                    style={{
                      width: 50,
                      padding: '4px 8px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-family)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text)',
                    }}
                  />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', minWidth: 10 }}>j</span>
                  {savingField === 'cycle_length' && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>✓</span>
                  )}
                </div>
              ) : (
                <span style={{ fontFamily: 'var(--font-family)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  {cycleLength} j
                </span>
              )}
            </div>
          )}
          {profile.cycle_tracking && periodLength !== null && (
            <div
              onClick={() => !editingPeriodLength && setEditingPeriodLength(String(periodLength))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: 'none',
                cursor: editingPeriodLength === null ? 'pointer' : 'default',
                minHeight: 52,
                backgroundColor: 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <IconBadge bg="rgba(48, 61, 202, 0.12)" color="var(--color-ovulation)">
                <BarChart2 size={18} />
              </IconBadge>
              <span
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
                  color: 'var(--color-text)',
                }}
              >
                durée des règles
              </span>
              {editingPeriodLength !== null ? (
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <input
                    type="number"
                    value={editingPeriodLength}
                    onChange={e => setEditingPeriodLength(e.target.value)}
                    onBlur={handleSavePeriodLength}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSavePeriodLength();
                      if (e.key === 'Escape') setEditingPeriodLength(null);
                    }}
                    autoFocus
                    min={2}
                    max={10}
                    style={{
                      width: 50,
                      padding: '4px 8px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-family)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text)',
                    }}
                  />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', minWidth: 10 }}>j</span>
                  {savingField === 'period_length' && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>✓</span>
                  )}
                </div>
              ) : (
                <span style={{ fontFamily: 'var(--font-family)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  {periodLength} j
                </span>
              )}
            </div>
          )}
          {profile.cycle_tracking && (
            <SettingsRow
              icon={<Heart size={18} />}
              iconBg="rgba(222, 48, 49, 0.12)"
              iconColor="var(--color-menstrual)"
              label="mes règles ont commencé aujourd'hui"
              noBorder
              onPress={() => setDeclareOpen(true)}
            />
          )}
        </SettingsCard>
      </div>

      {/* Section Mon programme */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <SectionLabel>Mon programme</SectionLabel>
        <SettingsCard>
          {activeProgram ? (
            <>
              <SettingsRow
                icon={<Dumbbell size={18} />}
                iconBg="rgba(237, 223, 64, 0.18)"
                iconColor="var(--color-follicular-text)"
                label={activeProgram.name}
                rightElement={
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                      color: 'var(--color-luteal)',
                      backgroundColor: 'rgba(48, 202, 140, 0.12)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-xl)',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.06em',
                    }}
                  >
                    actif
                  </span>
                }
              />
              {activeProgram.duration_weeks && (
                <SettingsRow
                  icon={<BarChart2 size={18} />}
                  iconBg="var(--color-primary-light)"
                  iconColor="var(--color-primary)"
                  label="durée"
                  rightElement={<ValueBadge>{activeProgram.duration_weeks} semaines</ValueBadge>}
                />
              )}
              <SettingsRow
                icon={<Activity size={18} />}
                iconBg="var(--color-primary-light)"
                iconColor="var(--color-primary)"
                label="séances"
                rightElement={<ValueBadge>{activeProgram.sessionsCount}</ValueBadge>}
              />
              <div style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-3) var(--space-4)' }}>
                <PrimaryButton variant="secondary" size="sm" onClick={() => setPauseOpen(true)} style={{ flex: 1 }}>
                  mettre en pause
                </PrimaryButton>
                <PrimaryButton variant="secondary" size="sm" onClick={() => navigate(`/programs/${activeProgram.id}`)} style={{ flex: 1 }}>
                  détail →
                </PrimaryButton>
              </div>
            </>
          ) : (
            <>
              <SettingsRow
                icon={<Dumbbell size={18} />}
                iconBg="rgba(237, 223, 64, 0.18)"
                iconColor="var(--color-follicular-text)"
                label="programme"
                noBorder
                rightElement={<ValueBadge>aucun</ValueBadge>}
              />
              <div style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
                <PrimaryButton variant="secondary" size="sm" onClick={() => navigate('/programs')} style={{ width: '100%' }}>
                  voir mes programmes →
                </PrimaryButton>
              </div>
            </>
          )}
        </SettingsCard>
      </div>

      {/* Section Ma progression */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <SectionLabel>Ma progression</SectionLabel>
        <SettingsCard>
          <SettingsRow
            icon={<Dumbbell size={18} />}
            iconBg="rgba(48, 202, 140, 0.12)"
            iconColor="var(--color-luteal)"
            label="séances loggées"
            rightElement={<ValueBadge>💪 {stats.sessionsCount}</ValueBadge>}
          />
          <SettingsRow
            icon={<BarChart2 size={18} />}
            iconBg="rgba(48, 61, 202, 0.12)"
            iconColor="var(--color-ovulation)"
            label="cycles trackés"
            noBorder
            rightElement={<ValueBadge>🔄 {stats.cyclesCount}</ValueBadge>}
          />
        </SettingsCard>
      </div>

      {/* Section Mon compte */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <SectionLabel>Mon compte</SectionLabel>
        <SettingsCard>
          <SettingsRow
            icon={<Lock size={18} />}
            iconBg="rgba(47, 0, 87, 0.08)"
            iconColor="var(--color-text-muted)"
            label="changer le mot de passe"
            onPress={handleResetPassword}
          />
          <SettingsRow
            icon={<Trash2 size={18} />}
            iconBg="var(--color-error-bg)"
            iconColor="var(--color-error)"
            label="supprimer mon compte"
            danger
            noBorder
            onPress={() => setDeleteOpen(true)}
          />
        </SettingsCard>
      </div>

      {/* Bouton déconnexion */}
      <button
        onClick={handleSignOut}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          width: '100%',
          padding: 'var(--space-4)',
          backgroundColor: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          border: '1px solid rgba(211, 47, 47, 0.15)',
          borderRadius: 'var(--radius-lg)',
          cursor: 'pointer',
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--text-base)',
          fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
        }}
      >
        <LogOut size={18} />
        se déconnecter
      </button>

      {/* Version */}
      <p
        style={{
          textAlign: 'center',
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          margin: 0,
        }}
      >
        version 1.0.0 (Beta)
      </p>

      {/* Modal déclaration règles */}
      <Modal
        isOpen={declareOpen}
        title="début de tes règles"
        confirmLabel="confirmer"
        onConfirm={handleDeclarePeriod}
        onCancel={() => setDeclareOpen(false)}
        isConfirmLoading={declareLoading}
      >
        confirmer le début de tes règles aujourd'hui ?
      </Modal>

      {/* Modal mise en pause programme */}
      <Modal
        isOpen={pauseOpen}
        title="mettre en pause ton programme ?"
        confirmLabel="mettre en pause"
        onConfirm={handlePauseProgram}
        onCancel={() => setPauseOpen(false)}
        isConfirmLoading={pauseLoading}
      >
        tu pourras le reprendre plus tard ou en activer un autre.
      </Modal>

      {/* Modal suppression compte */}
      <Modal
        isOpen={deleteOpen}
        title="supprimer ton compte ?"
        confirmLabel="supprimer définitivement"
        isDanger
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteOpen(false)}
        isConfirmLoading={deleteLoading}
      >
        tu es sur le point de supprimer ton compte et toutes tes données.
        cette action est irréversible. tes séances, ton historique de cycle et tes PRs seront définitivement perdus.
      </Modal>
    </div>
  );
}
