// Page d'accueil — roue du cycle, conseils de phase, stats rapides
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  User, Feather, Droplets, Heart, TrendingUp, Zap, Clock,
  Trophy, Activity, ShieldCheck, Minus, Wind, Moon, Flame, CalendarIcon,
  AlertCircle, ArrowRight,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCycleDay } from '@/hooks/useCycleDay';
import { useToast } from '@/hooks/useToast';
import { CycleWheel } from '@/components/home/CycleWheel';
import { PhaseInfoSheet } from '@/components/home/PhaseInfoSheet';
import { ProgramChoiceModal } from '@/components/home/ProgramChoiceModal';
import { Modal } from '@/components/ui/Modal';
import { getUpcomingSessions } from '@/services/homeService';
import { declarePeriodToday } from '@/services/healthDataService';
import { RirInfo } from '@/components/ui/RirInfo';
import type { CyclePhaseDisplay } from '@/types/cycle';
import type { UpcomingSession } from '@/types/workout';

/** Formate la date d'aujourd'hui en YYYY-MM-DD */
function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Informations visuelles et textuelles par phase */
interface PhaseInfo {
  name: string;
  emoji: string;
  id: CyclePhaseDisplay;
  intensityLabel: string;
  desc: string;
  daysLabel: string;
  bgClass: string;
  borderClass: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  iconText: string;
}

const PHASE_INFO: Record<string, PhaseInfo> = {
  menstrual: {
    name: 'menstruation',
    emoji: '🔴',
    id: 'menstrual',
    intensityLabel: 'écoute ton corps avant de charger',
    desc: 'tes œstrogènes et ta progestérone sont au plus bas. si c\'est dur aujourd\'hui, c\'est ok de réduire, la charge sera là après.',
    daysLabel: 'jours 1 à 5',
    bgClass: 'bg-pink-50',
    borderClass: 'border-pink-100',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-700',
    iconBg: 'bg-pink-50',
    iconText: 'text-pink-600',
  },
  follicular: {
    name: 'phase folliculaire',
    emoji: '🌱',
    id: 'follicular',
    intensityLabel: 'bonne fenêtre pour progresser',
    desc: 'les œstrogènes remontent et ton énergie avec eux, ta force est là — c\'est le bon moment pour aller chercher de la charge.',
    daysLabel: 'jours 6 à 13',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-100',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    iconBg: 'bg-green-50',
    iconText: 'text-green-600',
  },
  ovulation: {
    name: 'ovulation',
    emoji: '⚡',
    id: 'ovulation',
    intensityLabel: 'la meilleure fenêtre de ton cycle — les PR t\'attendent',
    desc: 'pic d\'œstrogènes et de testostérone en simultané. ton système nerveux est au max, ta force aussi. si tu veux aller chercher un PR, c\'est maintenant.',
    daysLabel: 'jours 14 à 16',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-100',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
    iconBg: 'bg-orange-50',
    iconText: 'text-orange-600',
  },
  luteal_early: {
    name: 'phase lutéale précoce',
    emoji: '🌙',
    id: 'luteal_early',
    intensityLabel: 'moment idéal pour consolider',
    desc: 'la progestérone monte, l\'énergie est encore stable. travaille propre. la technique, la régularité, la qualité du mouvement.',
    daysLabel: 'jours 17 à 21',
    bgClass: 'bg-violet-50',
    borderClass: 'border-violet-100',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-700',
    iconBg: 'bg-violet-50',
    iconText: 'text-violet-600',
  },
  luteal_late: {
    name: 'phase lutéale tardive',
    emoji: '🌑',
    id: 'luteal_late',
    intensityLabel: 'si c\'est plus dur qu\'habitude, c\'est normal — réduis si tu en as besoin',
    desc: 'la progestérone chute et ton corps récupère moins vite. c\'est ok de mettre moins sur la barre — la phase folliculaire arrive.',
    bgClass: 'bg-violet-50',
    borderClass: 'border-violet-100',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-700',
    iconBg: 'bg-violet-50',
    iconText: 'text-violet-600',
  },
};
/** Calcule les jours restants avant la prochaine phase */
function getDaysUntilPhase(currentDay: number, phaseStart: number, cycleLength: number): number {
  if (phaseStart > currentDay) return phaseStart - currentDay;
  return cycleLength - currentDay + phaseStart;
}

export function HomePage() {
  const navigate = useNavigate();
  const { profile } = useAuthContext();
  const { cycleDay, loading: cycleLoading, error: cycleError, refresh: refreshCycle } = useCycleDay();
  const { showToast } = useToast();

  // État du bottom sheet d'info phase
  const [sheetOpen, setSheetOpen] = useState(false);

  // État de la modal de déclaration de règles
  const [declarModalOpen, setDeclarModalOpen] = useState(false);
  const [declarLoading, setDeclarLoading] = useState(false);

  // État du modal de choix programme
  const [programChoiceOpen, setProgramChoiceOpen] = useState(false);

  // Séances à venir
  const [sessions, setSessions] = useState<UpcomingSession[]>([]);

  // Charge les séances à venir au montage
  useEffect(() => {
    if (!profile) return;
    getUpcomingSessions(profile.user_id)
      .then(data => setSessions(data))
      .catch(() => showToast('impossible de charger tes données', 'error'));
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Affiche une erreur de cycle si besoin
  useEffect(() => {
    if (cycleError) showToast('impossible de charger tes données', 'error');
  }, [cycleError]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Déclare le début des règles aujourd'hui */
  async function handleDeclarePeriod() {
    if (!profile) return;

    setDeclarLoading(true);
    const today = getTodayString();
    const { alreadyExists, error } = await declarePeriodToday(profile.user_id, today);
    setDeclarLoading(false);

    if (alreadyExists) {
      showToast("cycle déjà enregistré pour aujourd'hui.", 'info');
      setDeclarModalOpen(false);
      return;
    }

    if (error) {
      showToast("erreur lors de l'enregistrement. réessaie.", 'error');
      return;
    }

    refreshCycle();
    setDeclarModalOpen(false);
    showToast('cycle mis à jour 🖤', 'success');
  }

  // Phase actuelle
  const phaseKey = cycleDay?.phase ?? 'follicular';
  const phase = PHASE_INFO[phaseKey];
  const currentDay = cycleDay?.cycleDay ?? 1;
  const cycleLength = cycleDay?.cycleLength ?? 28;
  const ovulationDay = cycleDay?.ovulationDay ?? 14;
  const periodLength = cycleDay?.periodLength ?? 5;

  // Calculs pour la section "prochaines phases"
  const daysUntilOvulation = getDaysUntilPhase(currentDay, ovulationDay - 1, cycleLength);
  const daysUntilLuteal = getDaysUntilPhase(currentDay, ovulationDay + 2, cycleLength);
  const daysUntilPeriod = cycleLength - currentDay;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FCFBFF',
        paddingBottom: '120px',
        paddingTop: 'var(--space-6)',
        paddingLeft: 'var(--space-4)',
        paddingRight: 'var(--space-4)',
        maxWidth: '448px',
        margin: '0 auto',
        position: 'relative',
        overflowX: 'hidden',
        fontFamily: 'var(--font-family)',
      }}
    >
      {/* BANNIÈRE ONBOARDING — si aucune séance et cycle chargé */}
      {sessions.length === 0 && !cycleLoading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            backgroundColor: 'rgba(197, 132, 238, 0.12)',
            border: '1px solid rgba(197, 132, 238, 0.3)',
            borderLeft: '4px solid var(--color-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <AlertCircle style={{ width: '20px', height: '20px', color: 'var(--color-primary)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)' }}>
              ton onboarding n'est pas terminé
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: '#64748b' }}>
              importe ou crée un programme pour accéder à tes séances
            </p>
          </div>
          <button
            onClick={() => setProgramChoiceOpen(true)}
            className="tappable"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--color-primary)',
              border: 'none',
              color: 'var(--color-text)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            commencer <ArrowRight style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      )}

      {/* EN-TÊTE */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          {/* Avatar */}
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: '#fce7f3',
            border: '2px solid white',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            <User style={{ width: '30px', height: '30px', color: '#db2777' }} />
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: 'var(--text-2xl)',
              fontWeight: 900,
              color: 'var(--color-text)',
              lineHeight: 1.2,
            }}>
              bonjour, {profile?.name ?? ''} 🖤
            </h1>
            <p style={{
              margin: '2px 0 0',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 700,
              color: '#db2777',
            }}>
              ton cycle, ta force. 🖤
            </p>
          </div>
        </div>

      </header>

      {/* CARD CYCLE */}
      <div style={{
        position: 'relative',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-6)',
        borderRadius: '32px',
        border: '1px solid #fdf2f8',
        boxShadow: '0 20px 40px rgba(244, 114, 182, 0.15)',
        marginBottom: 'var(--space-10)',
        overflow: 'hidden',
      }}>
        {/* Halo décoratif */}
        <div style={{
          position: 'absolute',
          backgroundColor: '#fdf2f8',
          borderRadius: '50%',
          filter: 'blur(48px)',
          width: '160px',
          height: '160px',
          top: '-40px',
          right: '-40px',
          opacity: 0.5,
          zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 'var(--space-6)', alignItems: 'center' }}>
          {/* Roue du cycle */}
          {cycleLoading ? (
            <div style={{
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-border)',
              flexShrink: 0,
            }} />
          ) : (
            <CycleWheel cycleDay={cycleDay} onTap={() => setSheetOpen(true)} />
          )}

          {/* Infos de phase */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>
                {phase.name}
              </h2>
            </div>

            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: '#64748b', lineHeight: 1.4, paddingRight: 'var(--space-4)' }}>
              {phase.desc}
            </p>

            {/* Badge intensité */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-3)',
              border: '1px solid #f1f5f9',
            }}>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', fontWeight: 700, marginBottom: '2px' }}>
                intensité de phase
              </div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '2px' }}>
                {phase.intensityLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONSEILS DE PHASE */}
      <div style={{ marginBottom: 'var(--space-10)' }}>
        <h3 style={{ margin: '0 0 var(--space-5)', fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', paddingLeft: '4px' }}>
          ta phase en détail
        </h3>

        <PhaseAdviceCard phase={phase} />
      </div>

      {/* STATS RAPIDES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-10)' }}>
        {/* Jour du cycle */}
        <div style={{
          position: 'relative',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid #f1f5f9',
          boxShadow: 'var(--shadow-sm)',
          borderRadius: '28px',
          padding: 'var(--space-5)',
          height: '144px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ position: 'absolute', backgroundColor: '#fff7ed', filter: 'blur(32px)', right: '-16px', bottom: '-16px', width: '80px', height: '80px', borderRadius: '50%', zIndex: 0 }} />
          <div style={{ padding: 'var(--space-3)', backgroundColor: '#fff7ed', borderRadius: 'var(--radius-xl)', width: 'fit-content', position: 'relative', zIndex: 1 }}>
            <Flame style={{ width: '20px', height: '20px', color: '#f97316' }} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 900, color: 'var(--color-text)' }}>J{currentDay}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px' }}>
              jour du cycle
            </div>
          </div>
        </div>

        {/* Jours avant les règles */}
        <div style={{
          position: 'relative',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid #f1f5f9',
          boxShadow: 'var(--shadow-sm)',
          borderRadius: '28px',
          padding: 'var(--space-5)',
          height: '144px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ position: 'absolute', backgroundColor: '#f5f3ff', filter: 'blur(32px)', right: '-16px', bottom: '-16px', width: '80px', height: '80px', borderRadius: '50%', zIndex: 0 }} />
          <div style={{ padding: 'var(--space-3)', backgroundColor: '#f5f3ff', borderRadius: 'var(--radius-xl)', width: 'fit-content', position: 'relative', zIndex: 1 }}>
            <CalendarIcon style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 900, color: 'var(--color-text)' }}>{daysUntilPeriod}j</div>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px' }}>
              avant tes règles
            </div>
          </div>
        </div>
      </div>

      {/* PROCHAINES PHASES */}
      <div style={{ marginBottom: 'var(--space-10)' }}>
        <h3 style={{ margin: '0 0 var(--space-5)', fontSize: 'var(--text-xl)', fontWeight: 900, color: 'var(--color-text)', paddingLeft: '4px' }}>
          les 14 prochains jours
        </h3>
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid #f1f5f9',
          borderRadius: '32px',
          padding: 'var(--space-6)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <NextPhaseRow emoji="⚡" label="ovulation" days={daysUntilOvulation} dotColor="#fed7aa" />
          <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '0 0' }} />
          <NextPhaseRow emoji="🌙" label="phase lutéale" days={daysUntilLuteal} dotColor="#ede9fe" />
          <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '0 0' }} />
          <NextPhaseRow emoji="🔴" label="menstruation" days={daysUntilPeriod} dotColor="#fce7f3" isLast />
        </div>
      </div>

      {/* Bouton déclaration de règles */}
      {profile?.cycle_tracking && (
        <button
          onClick={() => setDeclarModalOpen(true)}
          className="tappable"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(222, 48, 48, 0.08)',
            border: '1px dashed rgba(222, 48, 48, 0.35)',
            borderRadius: '9999px',
            padding: 'var(--space-3) var(--space-5)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-menstrual)',
            fontFamily: 'var(--font-family)',
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
            marginBottom: 'var(--space-4)',
            letterSpacing: '-0.01em',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-menstrual)',
              flexShrink: 0,
              boxShadow: '0 0 0 3px rgba(222, 48, 48, 0.2)',
            }} />
            mes règles ont commencé aujourd'hui
          </span>
          <ArrowRight style={{ width: '16px', height: '16px', opacity: 0.6, flexShrink: 0 }} />
        </button>
      )}

      {/* Bottom sheet informations de phase */}
      <PhaseInfoSheet
        isOpen={sheetOpen}
        cycleDay={cycleDay}
        onClose={() => setSheetOpen(false)}
      />

      {/* Modal confirmation déclaration de règles */}
      <Modal
        isOpen={declarModalOpen}
        title="début de tes règles"
        confirmLabel="confirmer"
        onConfirm={handleDeclarePeriod}
        onCancel={() => setDeclarModalOpen(false)}
        isConfirmLoading={declarLoading}
      >
        confirmer le début de tes règles aujourd'hui ?
      </Modal>

      {/* Modal choix importer ou créer programme */}
      <ProgramChoiceModal
        isOpen={programChoiceOpen}
        onImport={() => { setProgramChoiceOpen(false); navigate('/programs/import'); }}
        onCreate={() => { setProgramChoiceOpen(false); navigate('/programs/new'); }}
        onClose={() => setProgramChoiceOpen(false)}
      />
    </div>
  );
}

// ─── Sous-composants internes ─────────────────────────────────────────────────

/** Ligne de prochaine phase */
function NextPhaseRow({
  emoji,
  label,
  days,
  dotColor,
  isLast = false,
}: {
  emoji: string;
  label: string;
  days: number;
  dotColor: string;
  isLast?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 'var(--space-3) 0',
      borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
        }}>
          {emoji}
        </span>
        <span style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-sm)' }}>{label}</span>
      </div>
      <span style={{ fontSize: 'var(--text-sm)', color: '#64748b', fontWeight: 700 }}>
        {days <= 0 ? "aujourd'hui" : `Dans ${days} jour${days > 1 ? 's' : ''}`}
      </span>
    </div>
  );
}

/** Bloc de conseils par phase */
function PhaseAdviceCard({ phase }: { phase: PhaseInfo }) {
  // Conseil communs par phase
  const adviceMap: Record<string, Array<{ icon: React.ReactNode; title: string; desc: string }>> = {
    menstrual: [
      { icon: <Feather style={{ width: '20px', height: '20px' }} />, title: 'écoute ce que ton corps demande', desc: 'si tu veux réduire la charge ou raccourcir la séance, c\'est la bonne décision — pas un abandon.' },
      { icon: <Droplets style={{ width: '20px', height: '20px' }} />, title: 'hydrate-toi davantage', desc: 'les pertes menstruelles augmentent la fatigue. ton corps a besoin de plus d\'eau ces jours-là.' },
      { icon: <Heart style={{ width: '20px', height: '20px' }} />, title: 'la chaleur aide', desc: 'bouillotte, bain chaud : ça détend les muscles utérins et soulage les crampes. pas un mythe.' },
    ],
    follicular: [
      { icon: <TrendingUp style={{ width: '20px', height: '20px' }} />, title: 'monte la charge cette semaine', desc: 'tes œstrogènes sont en hausse — ton corps est en mode anabolique. c\'est la bonne fenêtre pour progresser.' },
      { icon: <Zap style={{ width: '20px', height: '20px' }} />, title: 'coordination et apprentissage au max', desc: 'c\'est le bon moment pour travailler un nouveau mouvement ou affiner une technique.' },
      { icon: <Clock style={{ width: '20px', height: '20px' }} />, title: 'récupération accélérée', desc: 'en phase folliculaire, tu récupères plus vite entre les séances et entre les séries.' },
    ],
    ovulation: [
      { icon: <Trophy style={{ width: '20px', height: '20px' }} />, title: 'c\'est le moment d\'aller chercher un PR', desc: 'pic d\'œstrogènes + testostérone en simultané — ça arrive une seule fois dans ton cycle. ton 1RM est à portée.' },
      { icon: <Activity style={{ width: '20px', height: '20px' }} />, title: 'cardio intense accessible', desc: 'ta VO2 max est à son meilleur en ce moment. si tu veux pousser, ton corps peut suivre.' },
      { icon: <ShieldCheck style={{ width: '20px', height: '20px' }} />, title: 'attention à l\'hyperlaxité ligamentaire', desc: 'les œstrogènes élevés assouplissent légèrement les tendons. un échauffement soigné évite les bobos.' },
    ],
    luteal: [
      { icon: <Minus style={{ width: '20px', height: '20px' }} />, title: 'qualité avant volume', desc: 'ta récupération est plus lente. moins de séries avec une bonne exécution > forcer la charge.' },
      { icon: <Wind style={{ width: '20px', height: '20px' }} />, title: 'respiration et mobilité', desc: 'la mobilité et le travail de respiration s\'intègrent bien cette semaine — et aident la récupération.' },
      { icon: <Moon style={{ width: '20px', height: '20px' }} />, title: 'le sommeil compte double', desc: 'en phase lutéale, la récupération nocturne est encore plus déterminante pour la progression.' },
    ],
  };

  // Mappe luteal_early / luteal_late → luteal
  const key = phase.id === 'luteal_early' || phase.id === 'luteal_late' ? 'luteal' : phase.id;
  const advice = adviceMap[key] ?? adviceMap.follicular;

  return (
    <div style={{
      backgroundColor: undefined,
      borderRadius: '32px',
      padding: 'var(--space-6)',
      boxShadow: 'var(--shadow-sm)',
    }}
      className={`${phase.bgClass} border ${phase.borderClass}`}
    >
      {/* Badge phase + jours */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <span className={`${phase.badgeBg} ${phase.badgeText}`} style={{
          display: 'inline-block',
          padding: '4px 12px',
          fontSize: '12px',
          fontWeight: 700,
          borderRadius: '9999px',
        }}>
          {phase.emoji} {phase.name}
        </span>
        <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {phase.daysLabel}
        </span>
      </div>

      {/* Conseil principal */}
      <h4 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--color-text)' }}>
        {key === 'menstrual' && 'ce que tu ressens est réel.'}
        {key === 'follicular' && 'les œstrogènes remontent.'}
        {key === 'ovulation' && 'ton pic hormonal est là.'}
        {key === 'luteal' && 'la progestérone prend les commandes.'}
      </h4>
      <p style={{ margin: '0 0 var(--space-6)', fontSize: 'var(--text-sm)', color: '#64748b' }}>
        {key === 'menstrual' && "tes œstrogènes et ta progestérone sont au plus bas. la fatigue, les crampes, la lourdeur — c'est physique et documenté, pas dans ta tête."}
        {key === 'follicular' && "tes œstrogènes montent, ta récupération s'améliore, ta tolérance à l'effort augmente. c'est une bonne fenêtre pour progresser."}
        {key === 'ovulation' && "pic simultané d'œstrogènes et de testostérone — ça arrive une seule fois dans ton cycle. ta force et ta coordination sont à leur maximum."}
        {key === 'luteal' && "la progestérone monte (ou chute en fin de phase). si ton RIR est plus élevé qu'attendu, c'est de la physiologie — pas un manque d'effort."}
      </p>

      {/* Liste des conseils */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {advice.map((item, i) => (
          <div key={i} style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid #f1f5f9',
            borderRadius: '24px',
            padding: 'var(--space-4)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div className={`${phase.iconBg} ${phase.iconText}`} style={{
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-xl)',
              flexShrink: 0,
            }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-sm)' }}>{item.title}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: '#64748b', marginTop: '2px' }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
