// Configuration visuelle et textuelle des phases du cycle
import type { CyclePhaseDisplay, PhaseConfig } from '@/types/cycle';

// Les valeurs hex ici sont des données de configuration, pas des styles CSS directs
export const PHASE_DISPLAY_CONFIG: Record<CyclePhaseDisplay, PhaseConfig> = {
  menstrual: {
    label: 'Menstruation',
    emoji: '🔴',
    color: '#DE3031',
    colorMid: 'rgba(222, 48, 49, 0.7)',
    colorLight: 'rgba(222, 48, 49, 0.4)',
    cardTextColor: '#2F0057',
    banner:
      "tu es en menstruation — tes œstrogènes et ta progestérone sont au plus bas. la fatigue que tu ressens est réelle et physique. écoute ton corps.",
    popupText:
      "aujourd'hui tu es en menstruation. tes œstrogènes et ta progestérone sont au plus bas — ton corps consacre son énergie à renouveler sa muqueuse utérine. la fatigue, les crampes, la lourdeur que tu ressens : c'est réel, c'est physique, c'est documenté.\n\nce que ça veut dire pour ta séance : ton seuil de douleur est plus bas, ta récupération est plus lente, ta force maximale est réduite. ce n'est pas une raison d'arrêter — mais c'est une raison de moduler. charge réduite, technique propre, durée courte.\n\nplus tu loggeras tes séances pendant cette phase, plus period. pourra calibrer tes prochains cycles.",
  },
  follicular: {
    label: 'Phase folliculaire',
    emoji: '🌱',
    color: '#EDDF40',
    colorMid: 'rgba(237, 223, 64, 0.7)',
    colorLight: 'rgba(237, 223, 64, 0.4)',
    cardTextColor: '#8A7A00',
    banner:
      "tu es en phase folliculaire — tes œstrogènes remontent et ton énergie avec. si tu veux augmenter tes charges cette semaine, ton corps est prêt.",
    popupText:
      "tu es en phase folliculaire. tes œstrogènes sont en pleine montée — c'est la phase de reconstruction et de préparation à l'ovulation. ton énergie revient, ta récupération s'améliore, ta tolérance à l'effort augmente.\n\nce que ça veut dire pour ta séance : c'est une bonne fenêtre pour progresser en charge, tester de nouveaux PR, et aller un peu plus loin qu'à l'habitude. ton corps est dans un état anabolique favorable.\n\ncette fenêtre dure en moyenne 7 à 10 jours — autant en tirer parti.",
  },
  ovulation: {
    label: 'Ovulation',
    emoji: '⚡',
    color: '#303DCA',
    colorMid: 'rgba(48, 61, 202, 0.7)',
    colorLight: 'rgba(48, 61, 202, 0.4)',
    cardTextColor: '#F9EDE1',
    banner:
      "tu es en ovulation — pic d'œstrogènes et de testostérone en même temps. c'est ta meilleure fenêtre du cycle pour aller chercher un PR.",
    popupText:
      "tu es en ovulation. c'est le moment où tes œstrogènes et ta testostérone sont au maximum simultanément — une combinaison rare dans le cycle. ta force, ta coordination et ta tolérance à l'effort sont à leur pic.\n\nce que ça veut dire pour ta séance : c'est le meilleur moment du cycle pour aller chercher un PR. charge maximale, intensité haute, volume élevé si tu es bien récupérée.\n\nnote : certaines femmes ressentent une légère hyperlaxité ligamentaire autour de l'ovulation — les œstrogènes assouplissent les tendons. soigne l'échauffement sur les mouvements à fort stress articulaire.",
  },
  luteal_early: {
    label: 'Lutéale précoce',
    emoji: '🌙',
    color: '#30CA8C',
    colorMid: 'rgba(48, 202, 140, 0.7)',
    colorLight: 'rgba(48, 202, 140, 0.4)',
    cardTextColor: '#2F0057',
    banner:
      "tu es en phase lutéale précoce — ton énergie est stable et ta progestérone monte. bonne semaine pour travailler proprement et ancrer ta technique.",
    popupText:
      "tu es en phase lutéale précoce. la progestérone monte, les œstrogènes restent encore présents. ton énergie est relativement stable — c'est une phase de consolidation, pas d'explosion.\n\nce que ça veut dire pour ta séance : la qualité d'exécution avant la charge maximale. c'est une bonne période pour travailler le volume à charge modérée et ancrer la technique.\n\nta température corporelle de base est légèrement plus élevée en phase lutéale — hydrate-toi davantage, tu transpires plus.",
  },
  luteal_late: {
    label: 'Lutéale tardive',
    emoji: '🌑',
    color: '#FF7700',
    colorMid: 'rgba(255, 119, 0, 0.7)',
    colorLight: 'rgba(255, 119, 0, 0.4)',
    cardTextColor: '#2F0057',
    banner:
      "tu es en phase lutéale tardive — la progestérone chute et ton effort perçu est plus élevé qu'il n'y paraît. si c'est plus dur qu'habitude aujourd'hui, c'est pas toi. period. 🖤",
    popupText:
      "tu es en phase lutéale tardive. la progestérone et les œstrogènes chutent ensemble — ton corps prépare les prochaines règles. la fatigue revient, l'humeur peut fluctuer, et ton RIR est objectivement plus élevé à charge identique.\n\nce que ça veut dire pour ta séance : une séance maintenue à charge réduite vaut mieux qu'une séance forcée. si tu rates une séance cette semaine, c'est pas un échec — c'est de la gestion intelligente. period. 🖤\n\nlogger même une séance courte donne des données précieuses pour calibrer tes prochains cycles.",
  },
};
