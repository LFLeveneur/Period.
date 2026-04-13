// Page de révélation post-onboarding — affiche le calendrier coloré du cycle
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { predictPhasesForMonth } from '@/services/cyclePredictionService';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import type { CyclePhaseDisplay, CycleDay } from '@/types/cycle';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { clsx } from 'clsx';
import { motion } from 'motion/react';

// Noms et emojis des phases pour le bandeau
const PHASE_LABELS: Record<CyclePhaseDisplay, string> = {
  menstrual: 'menstruelle',
  follicular: 'folliculaire',
  ovulation: 'ovulatoire',
  luteal_early: 'lutéale',
  luteal_late: 'lutéale',
};

const PHASE_EMOJIS: Record<CyclePhaseDisplay, string> = {
  menstrual: '🔴',
  follicular: '🌱',
  ovulation: '⚡',
  luteal_early: '🌙',
  luteal_late: '🌑',
};

// Couleurs Tailwind par phase — cohérence avec CalendarPage
function getPhaseColorClass(phase: CyclePhaseDisplay | null | undefined): string {
  switch (phase) {
    case 'menstrual':
      return 'bg-[#DE3031]/40 text-[#8D1616] border border-[#DE3031]/70';
    case 'follicular':
      return 'bg-[#EDDF40]/40 text-[#83790C] border border-[#EDDF40]/70';
    case 'ovulation':
      return 'bg-[#303DCA]/40 text-[#1B2474] border border-[#303DCA]/70';
    case 'luteal_early':
    case 'luteal_late':
      return 'bg-[#30CA8C]/40 text-[#135339] border border-[#30CA8C]/70';
    default:
      return 'bg-white text-slate-700 border border-slate-100';
  }
}

// Couleur du bandeau de phase actuelle
const PHASE_BANNER_BG: Record<CyclePhaseDisplay, string> = {
  menstrual: 'bg-[#DE3031]',
  follicular: 'bg-[#EDDF40]',
  ovulation: 'bg-[#303DCA]',
  luteal_early: 'bg-[#30CA8C]',
  luteal_late: 'bg-[#30CA8C]',
};

const PHASE_BANNER_TEXT: Record<CyclePhaseDisplay, string> = {
  menstrual: 'text-white',
  follicular: 'text-[#83790C]',
  ovulation: 'text-white',
  luteal_early: 'text-[#135339]',
  luteal_late: 'text-[#135339]',
};

export function OnboardingRevealPage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [cycleDays, setCycleDays] = useState<CycleDay[]>([]);

  // Charge les phases du mois courant depuis le service
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const days = await predictPhasesForMonth(user.id, year, month);
      setCycleDays(days);
      setLoading(false);
    }
    loadData();
  }, [user]);

  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  const days = eachDayOfInterval({ start, end });

  // Map des jours par date pour accès rapide
  const daysByDate: Record<string, CycleDay> = {};
  for (const day of cycleDays) {
    daysByDate[day.date] = day;
  }

  const todayStr = format(today, 'yyyy-MM-dd');
  const todayPhase: CyclePhaseDisplay | null = daysByDate[todayStr]?.phase ?? null;

  // Redirige vers /home après rafraîchissement du profil
  async function handleStart() {
    await refreshProfile();
    navigate('/home', { replace: true });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '2px solid var(--color-primary)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <header className="bg-white px-6 py-5 sticky top-0 z-20 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 lowercase tracking-tight">
          voilà ton cycle 🖤
        </h1>
        <p className="text-sm text-slate-400 font-medium mt-1 lowercase">
          chaque couleur correspond à une phase
        </p>
      </header>

      <main className="px-5 pt-6 space-y-6">
        {/* Calendrier du mois courant */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100"
        >
          {/* En-tête du mois */}
          <h2 className="text-lg font-bold text-slate-900 capitalize mb-4">
            {format(today, 'MMMM yyyy', { locale: fr })}
          </h2>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 gap-y-4 gap-x-2 mb-4">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
              <div key={i} className="text-center text-[11px] font-bold text-slate-400">
                {d}
              </div>
            ))}

            {/* Cellules vides avant le premier jour */}
            {Array.from({ length: (start.getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} className="w-10 h-12" />
            ))}

            {/* Jours du mois */}
            {days.map((day, i) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const cycleDay = daysByDate[dateStr];
              const phase = cycleDay?.phase ?? null;
              const isToday =
                day.getFullYear() === today.getFullYear() &&
                day.getMonth() === today.getMonth() &&
                day.getDate() === today.getDate();
              const isFuture = day > today;
              const colorClass = getPhaseColorClass(phase);

              return (
                <div
                  key={i}
                  className={clsx(
                    'relative w-10 h-12 mx-auto flex flex-col items-center justify-start pt-2 rounded-[16px]',
                    isToday
                      ? 'border-2 border-slate-900 text-slate-900 bg-white ring-4 ring-white shadow-sm'
                      : colorClass,
                    isFuture && 'opacity-60'
                  )}
                >
                  <span className="text-[13px] font-bold">{format(day, 'd')}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Légende des phases */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-3"
        >
          <h3 className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Phases</h3>
          {(
            [
              { phase: 'menstrual', label: 'menstruelle', color: 'bg-[#DE3031]' },
              { phase: 'follicular', label: 'folliculaire', color: 'bg-[#EDDF40]' },
              { phase: 'ovulation', label: 'ovulatoire', color: 'bg-[#303DCA]' },
              { phase: 'luteal_early', label: 'lutéale', color: 'bg-[#30CA8C]' },
            ] as const
          ).map(({ phase, label, color }) => (
            <div key={phase} className="flex items-center gap-3">
              <div className={clsx('w-2.5 h-2.5 rounded-full', color)} />
              <span className="text-sm font-medium text-slate-600 lowercase">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* Bandeau phase actuelle */}
        {todayPhase && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className={clsx(
              'p-4 rounded-2xl',
              PHASE_BANNER_BG[todayPhase],
              PHASE_BANNER_TEXT[todayPhase]
            )}
          >
            <p className="text-base font-semibold lowercase">
              tu es en phase {PHASE_LABELS[todayPhase]} {PHASE_EMOJIS[todayPhase]}
            </p>
            <p className="text-sm font-medium mt-1 opacity-80 lowercase">
              c'est ta phase du moment — period. va t'aider à en tirer le meilleur
            </p>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <PrimaryButton onClick={handleStart}>c'est parti</PrimaryButton>
        </motion.div>
      </main>
    </div>
  );
}
