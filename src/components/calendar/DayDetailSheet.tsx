// Bottom sheet affichant le détail d'un jour du calendrier (redesigned)
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { CalendarDay } from '@/services/calendarService';

interface DayDetailSheetProps {
  /** Contrôle l'affichage du sheet */
  isOpen: boolean;
  /** Jour sélectionné (null si aucun) */
  day: CalendarDay | null;
  /** Callback de fermeture */
  onClose: () => void;
  /** Callback au tap sur une séance */
  onSessionTap: (sessionId: string, isHistory: boolean) => void;
}

/** Formate "Lundi 7 avril" depuis une date YYYY-MM-DD */
function formatDayTitle(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'EEEE d MMMM', { locale: fr });
}

export function DayDetailSheet({ isOpen, day, onClose, onSessionTap }: DayDetailSheetProps) {
  if (!isOpen || !day) return null;

  const cycleDay = day.cycleDay;

  return (
    <AnimatePresence>
      {isOpen && day && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ zIndex: 'var(--z-overlay)' as React.CSSProperties['zIndex'] }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
            }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900 capitalize">
                  {formatDayTitle(day.date)}
                </h3>
                {cycleDay && (
                  <p className="text-[#7B5EA7] font-medium text-sm mt-1 lowercase">
                    phase : {cycleDay.phase}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 active:scale-95 transition-transform"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sessions */}
            <div className="space-y-4 mb-8">
              {day.sessionHistory ? (
                <button
                  onClick={() => {
                    onSessionTap(day.sessionHistory!.id, true);
                    onClose();
                  }}
                  className="w-full bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between text-left active:scale-[0.98] transition-transform"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">✅</span>
                      <h4 className="font-bold text-emerald-900">{day.sessionHistory.sessionName}</h4>
                    </div>
                    <p className="text-emerald-600 text-sm ml-7">{day.sessionHistory.durationMinutes} min</p>
                  </div>
                  <ChevronRight size={20} className="text-emerald-400" />
                </button>
              ) : day.pendingSession ? (
                <button
                  onClick={() => {
                    onSessionTap(day.pendingSession!.id, false);
                    onClose();
                  }}
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between text-left active:scale-[0.98] transition-transform"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">🗓</span>
                      <h4 className="font-bold text-slate-900">{day.pendingSession.sessionName}</h4>
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
  );
}
