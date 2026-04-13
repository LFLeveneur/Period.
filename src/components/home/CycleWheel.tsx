// Roue SVG du cycle hormonal — composant central de l'accueil
// Affiche un anneau segmenté avec un segment par jour du cycle
import type { CycleDay } from '@/types/cycle';

interface CycleWheelProps {
  /** Données du jour du cycle — null affiche l'état neutre */
  cycleDay: CycleDay | null;
  /** Ouvre le bottom sheet PhaseInfo au tap */
  onTap?: () => void;
}

/** Couleur de remplissage par phase */
function getSegmentColor(day: number, periodLength: number, ovulationDay: number): string {
  if (day <= periodLength) return '#F8C8C8'; // Rose pâle — Menstruation
  if (day <= ovulationDay - 2) return '#C8E6C9'; // Vert pâle — Folliculaire
  if (day <= ovulationDay + 1) return '#B3E5FC'; // Bleu pâle — Ovulation
  return '#E1BEE7'; // Violet pâle — Lutéale
}

export function CycleWheel({ cycleDay, onTap }: CycleWheelProps) {
  // État neutre — aucune donnée de cycle disponible
  if (!cycleDay) {
    return (
      <div
        className="tappable"
        onClick={onTap}
        role="button"
        aria-label="Roue du cycle — suivi inactif"
        style={{ width: '140px', height: '140px', position: 'relative', flexShrink: 0 }}
      >
        <svg viewBox="0 0 300 300" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <circle cx="150" cy="150" r="115" fill="var(--color-border)" opacity="0.3" />
          <circle cx="150" cy="150" r="85" fill="white" />
        </svg>
        <div style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '80px',
          height: '80px',
          margin: '30px auto',
        }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 700 }}>—</span>
        </div>
      </div>
    );
  }

  const { cycleDay: currentDay, cycleLength: totalDays, periodLength, ovulationDay } = cycleDay;
  const segments = totalDays;
  const gapDegree = 2;
  const availableDegrees = 360 - segments * gapDegree;
  const segmentDegree = availableDegrees / segments;

  const arcs = [];
  let currentAngle = -90; // Démarre à 12h

  for (let i = 1; i <= segments; i++) {
    const startAngle = currentAngle;
    const endAngle = currentAngle + segmentDegree;

    const isCurrent = i === currentDay;
    const outerRadius = isCurrent ? 140 : 130;
    const innerRadius = 100;
    const color = getSegmentColor(i, periodLength, ovulationDay);

    const startRad = startAngle * (Math.PI / 180);
    const endRad = endAngle * (Math.PI / 180);

    const x1Outer = 150 + outerRadius * Math.cos(startRad);
    const y1Outer = 150 + outerRadius * Math.sin(startRad);
    const x2Outer = 150 + outerRadius * Math.cos(endRad);
    const y2Outer = 150 + outerRadius * Math.sin(endRad);

    const x1Inner = 150 + innerRadius * Math.cos(startRad);
    const y1Inner = 150 + innerRadius * Math.sin(startRad);
    const x2Inner = 150 + innerRadius * Math.cos(endRad);
    const y2Inner = 150 + innerRadius * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    const pathData = `
      M ${x1Outer} ${y1Outer}
      A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}
      L ${x2Inner} ${y2Inner}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner}
      Z
    `;

    arcs.push(
      <path
        key={i}
        d={pathData}
        fill={color}
        opacity={isCurrent ? 1 : 0.8}
        style={{ transition: 'all 0.3s' }}
      />
    );

    currentAngle += segmentDegree + gapDegree;
  }

  return (
    <div
      onClick={onTap}
      role={onTap ? 'button' : undefined}
      aria-label={onTap ? `Roue du cycle — J${currentDay}` : undefined}
      style={{
        position: 'relative',
        width: '140px',
        height: '140px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        cursor: onTap ? 'pointer' : 'default',
      }}
    >
      <svg viewBox="0 0 300 300" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {arcs}
      </svg>
      {/* Centre — numéro du jour */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '80px',
        height: '80px',
        backgroundColor: 'white',
        borderRadius: '50%',
        boxShadow: 'var(--shadow-sm)',
        border: '2px solid var(--color-border)',
      }}>
        <span style={{
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--color-text-muted)',
          fontWeight: 700,
          marginBottom: '-2px',
        }}>
          Jour
        </span>
        <span style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 900,
          color: 'var(--color-text)',
          lineHeight: 1,
        }}>
          {currentDay}
        </span>
      </div>
    </div>
  );
}
