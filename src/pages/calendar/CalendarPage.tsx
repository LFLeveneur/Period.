// Page calendrier mensuel — /calendar
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { getCalendarMonth } from '@/services/calendarService';
import type { CalendarMonth, CalendarDay } from '@/services/calendarService';

import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X, User } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

export function CalendarPage() {
  const { user, profile } = useAuthContext();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<CalendarMonth | null>(null);
  const [, setLoading] = useState(true);

  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start, end });

  // Charger les données du mois
  useEffect(() => {
    if (!user) return;
    loadMonth(currentDate.getFullYear(), currentDate.getMonth() + 1);
  }, [currentDate, user]);

  const loadMonth = async (year: number, month: number) => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await getCalendarMonth(user.id, year, month);
    if (error) {
      showToast('impossible de charger le calendrier', 'error');
    } else {
      setCalendarMonth(data);
    }
    setLoading(false);
  };

  const cycleTracking = profile?.cycle_tracking ?? false;

  // Index des données par date
  const calendarDays = calendarMonth?.days ?? [];
  const daysByDate: Record<string, CalendarDay> = {};
  for (const day of calendarDays) {
    daysByDate[day.date] = day;
  }

  // Mapper phase vers couleur Tailwind
  const getMockedColor = (_day: Date, dayData: CalendarDay): string => {
    if (!cycleTracking || !dayData.cycleDay) {
      return 'bg-white text-slate-700 border border-slate-100';
    }

    const phase = dayData.cycleDay.phase;
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
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 lowercase tracking-tight">calendrier</h1>
        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <User size={20} />
        </button>
      </header>

      <main className="px-5 pt-6 space-y-6">
        {/* Month Selector */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-lg font-bold text-slate-900 capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: fr })}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="grid grid-cols-7 gap-y-4 gap-x-2 mb-4">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
              <div key={i} className="text-center text-[11px] font-bold text-slate-400">
                {d}
              </div>
            ))}

            {/* Empty days padding */}
            {Array.from({ length: (start.getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} className="w-10 h-12" />
            ))}

            {/* Days */}
            {days.map((day, i) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayData = daysByDate[dateStr];
              const isToday =
                day.getFullYear() === today.getFullYear() &&
                day.getMonth() === today.getMonth() &&
                day.getDate() === today.getDate();
              const isFuture = day > today;
              const colorClass = dayData ? getMockedColor(day, dayData) : 'bg-white text-slate-700 border border-slate-100';

              return (
                <button
                  key={i}
                  onClick={() => dayData && setSelectedDay(dayData)}
                  className={clsx(
                    'relative w-10 h-12 mx-auto flex flex-col items-center justify-start pt-2 rounded-[16px] transition-transform active:scale-95',
                    isToday ? 'border-2 border-slate-900 text-slate-900 bg-white ring-4 ring-white shadow-sm' : colorClass,
                    isFuture && 'opacity-60'
                  )}
                >
                  <span className="text-[13px] font-bold">{format(day, 'd')}</span>

                  {/* Dots Container */}
                  <div className="absolute bottom-2 flex gap-1">
                    {dayData?.sessionHistory && (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20" />
                    )}
                    {!dayData?.sessionHistory && dayData?.pendingSession && (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-2">Légende</h3>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20" />
            <span className="text-sm font-medium text-slate-600 lowercase">séance complétée</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span className="text-sm font-medium text-slate-600 lowercase">séance prévue</span>
          </div>
        </div>
      </main>

      {/* Day Detail Sheet Modal */}
      <AnimatePresence>
        {selectedDay && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDay(null)}
              style={{ zIndex: 'var(--z-overlay)' as React.CSSProperties['zIndex'] }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
                paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
              }}
              className="fixed bottom-16 left-0 right-0 bg-white rounded-t-[32px] p-6 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 capitalize">
                    {format(new Date(selectedDay.date), 'EEEE d MMMM', { locale: fr })}
                  </h3>
                  {selectedDay.cycleDay && (
                    <p className="text-[#7B5EA7] font-medium text-sm mt-1 lowercase">
                      phase : {selectedDay.cycleDay.phase}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                {selectedDay.sessionHistory ? (
                  <button
                    onClick={() => {
                      setSelectedDay(null);
                      navigate(`/history/${selectedDay.sessionHistory?.id}`);
                    }}
                    className="w-full bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between text-left active:scale-[0.98] transition-transform"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">✅</span>
                        <h4 className="font-bold text-emerald-900">{selectedDay.sessionHistory.sessionName}</h4>
                      </div>
                      <p className="text-emerald-600 text-sm ml-7">{selectedDay.sessionHistory.durationMinutes} min</p>
                    </div>
                    <ChevronRight size={20} className="text-emerald-400" />
                  </button>
                ) : selectedDay.pendingSession ? (
                  <button
                    onClick={() => {
                      setSelectedDay(null);
                      navigate(`/session/${selectedDay.pendingSession?.id}/preview`);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between text-left active:scale-[0.98] transition-transform"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">🗓</span>
                        <h4 className="font-bold text-slate-900">{selectedDay.pendingSession.sessionName}</h4>
                      </div>
                      <p className="text-slate-500 text-sm ml-7">Prévue</p>
                    </div>
                    <ChevronRight size={20} className="text-slate-400" />
                  </button>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400 font-medium lowercase">aucune séance ce jour-là</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
