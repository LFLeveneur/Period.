// Constantes pour les séances actives : labels, messages récap, conseils de phase
import type { WorkoutFeeling } from '@/types/workout';
import type { CyclePhaseDisplay } from '@/types/cycle';

/** Labels utilisateur pour le ressenti de fin de séance */
export const FEELING_LABELS: Record<WorkoutFeeling, string> = {
  survival: '🪫 séance de survie',
  notgreat: '😐 pas au top mais présente',
  solid: '💪 solide',
  pr: "⚡ j'étais en mode PR",
};

/**
 * Messages de récap combinant ressenti × niveau de performance.
 * Clé : "${feeling}_${performanceLevel}"
 */
export const RECAP_MESSAGES: Record<string, string> = {
  survival_beyond: 'tu te sentais à plat — mais le corps a répondu. retiens ça. 🖤',
  survival_progression: 'tu te sentais à plat — et t\'as quand même progressé. ton corps > tes sensations.',
  survival_solid: 'tu te sentais à bout — et t\'as assuré quand même. montre up c\'est ce qui compte.',
  survival_maintained: 'tu te sentais à bout — la séance a résisté. tu as maintenu. c\'est déjà beaucoup.',
  survival_decline: 'tu te sentais à plat — et la séance l\'a montré. repose-toi. ton corps t\'envoie un signal.',
  notgreat_beyond: 'tu ne te sentais pas au top — mais le corps a dépassé les cibles. confiance.',
  notgreat_progression: 'tu ne te sentais pas au top — et tu as progressé quand même. le cycle fait son travail.',
  notgreat_solid: 'pas au top, mais solide. montre up c\'est ce qui compte.',
  notgreat_maintained: 'pas au top — et la séance a résisté. tu as maintenu. ça compte.',
  notgreat_decline: 'tu ne te sentais pas au top — et la séance t\'a plus demandé que prévu. ça arrive. repose-toi.',
  solid_beyond: 'tu te sentais solide — et le corps a tout donné. une belle séance dans les livres.',
  solid_progression: 'tu te sentais solide — et ton cycle progresse. ton corps est sur la bonne trajectoire.',
  solid_solid: 'tu te sentais solide — séance solide. régularité > perfection. 🖤',
  solid_maintained: 'tu te sentais solide — mais la séance a résisté. montre up c\'est ce qui compte.',
  solid_decline: 'tu te sentais solide — mais la séance a été plus exigeante que prévu. montre up c\'est ce qui compte.',
  pr_beyond: 'tu te sentais en feu — et t\'as tout donné. retiens ce moment dans ton cycle. 🖤',
  pr_solid: 'tu te sentais au max — et t\'as assuré quand même. une belle séance dans les livres.',
  pr_progression: 'tu te sentais en feu — et ton cycle progresse. ton corps est sur la bonne trajectoire.',
  pr_maintained: 'tu te sentais prête — et la séance a résisté. ça arrive même aux meilleurs jours. ce que t\'as maintenu compte quand même.',
  pr_decline: 'tu te sentais en feu — mais la séance t\'a plus demandé que prévu. tu as montré up, c\'est ça qui compte.',
};

/** Conseils contextuels par phase — affichés dans la preview et pendant la séance */
export const CYCLE_ADVICE: Record<CyclePhaseDisplay, { upcoming: string; active: string }> = {
  menstrual: {
    upcoming: 'tes œstrogènes sont au plus bas. ton seuil de récupération est réduit — écoute ce que ton corps demande aujourd\'hui, pas ce que tu pensais faire hier.',
    active: 'si tu veux réduire l\'intensité ou raccourcir la séance, c\'est la bonne décision. ton corps récupère plus lentement en menstruation — et ça compte quand même.',
  },
  follicular: {
    upcoming: 'tes œstrogènes remontent — ta récupération s\'améliore et ta tolérance à l\'effort augmente. c\'est une bonne fenêtre pour progresser en charge.',
    active: 'tu es en phase anabolique. ton corps peut encaisser plus qu\'en début de cycle — si tu en as envie, c\'est le moment.',
  },
  ovulation: {
    upcoming: 'pic d\'œstrogènes et de testostérone en simultané. c\'est ta meilleure fenêtre du cycle pour aller chercher un PR.',
    active: 'tu es à ton pic hormonal. si tu veux aller chercher un record aujourd\'hui, ton corps est prêt. 🖤',
  },
  luteal_early: {
    upcoming: 'la progestérone est stable. bonne période pour travailler le volume et ancrer la technique — sans se battre contre soi-même.',
    active: 'ton énergie est relativement stable. focus sur la qualité d\'exécution — c\'est ce qui paie sur le long terme.',
  },
  luteal_late: {
    upcoming: 'la progestérone chute et ton RIR est objectivement plus élevé à charge identique. ce n\'est pas toi — c\'est du cycle. la séance compte quand même.',
    active: 'si c\'est plus dur qu\'habitude aujourd\'hui, c\'est normal — ton effort perçu est réellement plus élevé en fin de phase. réduis la charge si tu en as besoin, c\'est de la gestion, pas un abandon.',
  },
};

/** Score d'énergie en fonction du ressenti */
export const FEELING_TO_SCORE: Record<WorkoutFeeling, number> = {
  survival: 20,
  notgreat: 35,
  solid: 70,
  pr: 90,
};
