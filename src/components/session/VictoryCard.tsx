// Card affichant une victoire dans le récap de séance
import type { Victory } from '@/types/workout';

interface VictoryCardProps {
  victory: Victory;
}

function getVictoryLabel(victory: Victory): string {
  switch (victory.type) {
    case 'new_record':
      return `🏆 nouveau record sur ${victory.exerciseName} : ${victory.value}kg`;
    case 'better_than_previous_phase': {
      const delta = victory.previousValue !== undefined
        ? `+${Math.round((victory.value - victory.previousValue) * 10) / 10}kg`
        : `${victory.value}kg`;
      return `🔁 mieux qu'en phase précédente : ${delta}`;
    }
    case 'double_record':
      return `🔥 double record : ${victory.value}kg ET meilleure phase !`;
    default:
      return `🏆 victoire sur ${victory.exerciseName}`;
  }
}

export function VictoryCard({ victory }: VictoryCardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
        borderLeft: '3px solid var(--color-primary)',
        fontFamily: 'var(--font-family)',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text)',
        lineHeight: 'var(--leading-normal)',
      }}
    >
      {getVictoryLabel(victory)}
    </div>
  );
}
