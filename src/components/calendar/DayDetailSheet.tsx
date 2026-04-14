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
              {/* Séances prévues avec leur status (complétées ou en attente) */}
              {day.pendingSession.map(session => (
                <button
                  key={session.id}
                  onClick={() => {
                    onSessionTap(session.id, !!session.completedHistoryId);
                    onClose();
                  }}
                  className={`w-full p-4 rounded-2xl flex items-center justify-between text-left active:scale-[0.98] transition-transform ${
                    session.completedHistoryId
                      ? 'bg-emerald-50 border border-emerald-100'
                      : 'bg-slate-50 border border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{session.completedHistoryId ? '✅' : '🗓'}</span>
                      <h4 className={`font-bold ${session.completedHistoryId ? 'text-emerald-900' : 'text-slate-900'}`}>
                        {session.sessionName}
                      </h4>
                    </div>
                    <p className={`text-sm ml-7 ${session.completedHistoryId ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {session.completedHistoryId ? 'Complétée' : 'Prévue'}
                    </p>
                  </div>
                  <ChevronRight size={20} className={session.completedHistoryId ? 'text-emerald-400' : 'text-slate-400'} />
                </button>
              ))}

              {/* Séances supplémentaires (complétées mais non prévues) */}
              {day.extraSessions.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
                    Séances bonus 🎯
                  </p>
                  {day.extraSessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => {
                        onSessionTap(session.id, true);
                        onClose();
                      }}
                      className="w-full bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between text-left active:scale-[0.98] transition-transform mb-2"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">✨</span>
                          <h4 className="font-bold text-blue-900">{session.sessionName}</h4>
                        </div>
                        <p className="text-blue-600 text-sm ml-7">{session.durationMinutes} min</p>
                      </div>
                      <ChevronRight size={20} className="text-blue-400" />
                    </button>
                  ))}
                </div>
              )}

              {/* Aucune séance */}
              {day.pendingSession.length === 0 && day.extraSessions.length === 0 && (
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
