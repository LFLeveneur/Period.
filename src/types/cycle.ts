// Types liés au cycle hormonal

/** Phase stockée en base de données (4 valeurs) */
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

/** Phase affichée dans l'UI (5 sous-phases — luteal divisée en early et late) */
export type CyclePhaseDisplay =
  | 'menstrual'    // J1 → J[periodLength]           🔴
  | 'follicular'   // J[periodLength+1] → J[ovDay-2]  🌱
  | 'ovulation'    // J[ovDay-1] → J[ovDay+1]         ⚡
  | 'luteal_early' // J[ovDay+2] → J[cycleLength-7]   🌙
  | 'luteal_late'; // J[cycleLength-6] → fin           🌑

/** Données du cycle pour une date donnée — retourné par les hooks */
export interface CycleDay {
  phase: CyclePhaseDisplay;
  cycleDay: number;       // Jour du cycle (1 = premier jour des règles)
  cycleLength: number;    // Durée totale du cycle
  periodLength: number;   // Durée des règles
  ovulationDay: number;   // Jour estimé d'ovulation
  date: string;           // Format YYYY-MM-DD
}

/** Stats calculées depuis les données historiques */
export interface CycleStats {
  avgCycleLength: number;
  avgPeriodLength: number;
  avgOvulationDay: number;   // = avgCycleLength - 14
  lastPeriodDate: string;    // Format YYYY-MM-DD
}

/** Configuration visuelle et textuelle d'une phase */
export interface PhaseConfig {
  label: string;
  emoji: string;
  color: string;        // Couleur forte (hex)
  colorMid: string;
  colorLight: string;
  cardTextColor: string;
  banner: string;       // Texte court du bandeau (1-2 phrases)
  popupText: string;    // Texte long de la pop-up biologique
}

/** Données de santé stockées en base — une ligne par jour de cycle */
export interface HealthData {
  id: string;
  user_id: string;
  date: string;
  cycle_day: number;
  created_at: string;
  updated_at: string;
}

/**
 * Détermine la sous-phase UI à partir du jour du cycle.
 * Transforme les 4 phases DB en 5 sous-phases d'affichage.
 */
export function getCyclePhaseDisplay(
  cycleDay: number,
  periodLength: number,
  ovulationDay: number,
  cycleLength: number
): CyclePhaseDisplay {
  if (cycleDay <= periodLength) return 'menstrual';
  if (cycleDay < ovulationDay - 1) return 'follicular';
  if (cycleDay <= ovulationDay + 1) return 'ovulation';
  if (cycleDay <= cycleLength - 6) return 'luteal_early';
  return 'luteal_late';
}

/** Calcule le nombre de jours restants avant les prochaines règles */
export function daysUntilNextPeriod(cycleDay: number, cycleLength: number): number {
  return cycleLength - cycleDay;
}
