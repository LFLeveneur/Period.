// Grille calendrier mensuelle avec couleurs de phase et indicateurs de séance
import { PHASE_DISPLAY_CONFIG } from '@/utils/phaseConfig';
import type { CalendarDay } from '@/services/calendarService';
import type { CyclePhaseDisplay } from '@/types/cycle';

interface CalendarGridProps {
  /** Liste des jours du mois */
  days: CalendarDay[];
  /** Callback au tap sur un jour */
  onDayTap: (day: CalendarDay) => void;
  /** Si false : pas de couleur de phase (cycle non suivi) */
  cycleTracking: boolean;
}

/** Labels des colonnes — semaine française (lundi en premier) */
const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Mapping phase → variables CSS de couleur de fond et texte */
function getPhaseColors(phase: CyclePhaseDisplay): { bg: string; text: string; textBold?: boolean } {
  const mapping: Record<CyclePhaseDisplay, { bg: string; text: string; textBold?: boolean }> = {
    menstrual: { bg: 'var(--color-menstrual-light)', text: 'var(--color-text)' },
    follicular: { bg: 'var(--color-follicular-light)', text: 'var(--color-follicular-text)', textBold: true },
    ovulation: { bg: 'var(--color-ovulation-light)', text: 'var(--color-text-light)' },
    luteal_early: { bg: 'var(--color-luteal-light)', text: 'var(--color-text)' },
    luteal_late: { bg: 'var(--color-luteal-late-light)', text: 'var(--color-text)' },
  };
  return mapping[phase];
}

/** Convertit getDay() JS (0=dim) en offset Mon-First (0=lun, 6=dim) */
function getMonFirstOffset(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/** Vérifie si une date (YYYY-MM-DD) est aujourd'hui ou dans le futur */
function isFuture(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) > today;
}

/** Vérifie si une date (YYYY-MM-DD) est aujourd'hui */
function isToday(dateStr: string): boolean {
  const today = new Date();
  return dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function CalendarGrid({ days, onDayTap, cycleTracking }: CalendarGridProps) {
  if (days.length === 0) return null;

  // Calcule l'offset de départ (cases vides avant le 1er du mois)
  const firstJsDay = new Date(days[0].date).getDay();
  const startOffset = getMonFirstOffset(firstJsDay);

  // Cellules vides avant le 1er
  const emptyCells = Array.from({ length: startOffset });

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      {/* En-tête colonnes — jour de la semaine compacte */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '3px',
        }}
      >
        {DAY_LABELS.map(label => (
          <div
            key={label}
            style={{
              textAlign: 'center',
              fontFamily: 'var(--font-family)',
              fontSize: '11px',
              color: 'var(--color-text-muted-dark)',
              fontWeight: 'var(--font-normal)' as React.CSSProperties['fontWeight'],
              padding: '4px 0',
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '3px',
        }}
      >
        {/* Cases vides de début de mois */}
        {emptyCells.map((_, idx) => (
          <div key={`empty-${idx}`} style={{ aspectRatio: '1' }} />
        ))}

        {/* Jours du mois */}
        {days.map(day => {
          const future = isFuture(day.date);
          const today = isToday(day.date);
          const phaseColors = cycleTracking && day.cycleDay
            ? getPhaseColors(day.cycleDay.phase)
            : null;

          return (
            <button
              key={day.date}
              onClick={() => onDayTap(day)}
              style={{
                aspectRatio: '1',
                borderRadius: 'var(--radius-md)',
                backgroundColor: phaseColors ? phaseColors.bg : 'var(--color-bg)',
                border: 'none',
                boxShadow: today
                  ? 'inset 0 0 0 3px var(--color-primary), 0 0 0 1px var(--color-primary)'
                  : 'none',
                opacity: future ? 0.5 : 1,
                filter: future ? 'grayscale(20%)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: '2px',
                position: 'relative',
                transition: 'transform var(--duration-fast) ease',
                minHeight: '34px',
                minWidth: '34px',
              } as React.CSSProperties}
            >
              {/* Numéro du jour */}
              <span
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: '12px',
                  fontWeight: phaseColors?.textBold ? '700' : '500',
                  color: phaseColors ? phaseColors.text : 'var(--color-text)',
                  lineHeight: 1,
                }}
              >
                {new Date(day.date).getDate()}
              </span>

              {/* Indicateurs de séance — 4px points */}
              {day.sessionHistory && (
                <span
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-success)',
                    display: 'block',
                  }}
                />
              )}
              {!day.sessionHistory && day.pendingSession && (
                <span
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-text-muted-dark)',
                    display: 'block',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Légende des phases (seulement si cycle suivi) + Légende des séances */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        {/* Légende des phases */}
        {cycleTracking && (
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
            }}
          >
            {(['menstrual', 'follicular', 'ovulation', 'luteal_early', 'luteal_late'] as const).map(phase => {
              const config = PHASE_DISPLAY_CONFIG[phase];
              const phaseColors = getPhaseColors(phase);
              return (
                <div
                  key={phase}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)',
                  }}
                >
                  {/* Point coloré 8px */}
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: phaseColors.bg,
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-family)',
                      fontSize: '11px',
                      color: 'var(--color-text)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Légende des séances */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-4)',
            flexWrap: 'wrap',
          }}
        >
          {/* Séance complétée */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
            }}
          >
            <span
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-success)',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: '11px',
                color: 'var(--color-text)',
                whiteSpace: 'nowrap',
              }}
            >
              séance complétée
            </span>
          </div>

          {/* Séance prévue */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
            }}
          >
            <span
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-text-muted-dark)',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: '11px',
                color: 'var(--color-text)',
                whiteSpace: 'nowrap',
              }}
            >
              séance prévue
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
