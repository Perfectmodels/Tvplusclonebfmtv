import type { WatchItem } from './veille-types';

const desks = [
  { label: 'Économie', match: /\b(?:budget|economie|entreprise|investissement|emploi|impot|prix|salaire)\w*/, angle: 'Les conséquences pour les ménages et les entreprises', check: 'Quels chiffres permettent de mesurer l’effet, et pour quelles catégories de personnes ?' },
  { label: 'Institutions', match: /\b(?:gouvernement|president|ministre|election|parlement|reforme|decret)\w*/, angle: 'De la décision à son application', check: 'Quel texte officialise la décision ? Qui l’applique et à quelle échéance ?' },
  { label: 'Santé', match: /\b(?:sante|hopital|vaccin|epidemie|medecin|soins)\w*/, angle: 'L’accès aux soins pour les personnes concernées', check: 'Quels services ou territoires sont concernés ? Que confirment les professionnels et les données disponibles ?' },
  { label: 'Justice', match: /\b(?:tribunal|justice|enquete|proces|jugement|plainte|condamnation)\w*/, angle: 'La procédure et les prochaines étapes', check: 'Quels éléments sont confirmés par la procédure ? Quelle est la position des parties ?' },
  { label: 'Environnement', match: /\b(?:climat|foret|inondation|pollution|environnement|biodiversite)\w*/, angle: 'Les effets sur le terrain et les réponses envisagées', check: 'Quelles zones et populations sont exposées ? Dispose-t-on d’observations indépendantes ?' },
  { label: 'Sport', match: /\b(?:football|sport|match|joueur|championnat|selection|competition)\w*/, angle: 'Les enjeux sportifs et la suite du calendrier', check: 'Quel résultat ou classement est confirmé ? Quel est le prochain rendez-vous officiel ?' },
  { label: 'Culture', match: /\b(?:festival|culture|exposition|artiste|mode|cinema|musique)\w*/, angle: 'Ce que l’initiative apporte au public et aux acteurs locaux', check: 'Qui organise, qui participe et comment le public peut-il y accéder ?' },
  { label: 'Éducation', match: /\b(?:ecole|lycee|enseignement|universite|eleve|baccalaureat)\w*/, angle: 'Ce qui change pour les élèves et les établissements', check: 'Quels établissements sont concernés et à partir de quand ? Quel retour des élèves et des équipes ?' },
  { label: 'Transports', match: /\b(?:transport|route|circulation|train|aeroport|travaux)\w*/, angle: 'Les effets sur les déplacements du quotidien', check: 'Quels trajets et délais sont concernés ? Quelles solutions sont prévues pour les usagers ?' },
];

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export function analyzeWatchItem(item: WatchItem) {
  const desk = desks.find(({ match }) => match.test(normalize(item.title))) ??
    desks.find(({ match }) => match.test(normalize(item.summary)));
  const topic = item.title.trim().slice(0, 155);
  const brief = normalize(item.summary.trim()) === normalize(item.title.trim()) || item.summary.trim().length < 60;
  return {
    desk: desk?.label ?? 'Actualité',
    brief,
    angles: [
      {
        label: desk?.angle ?? 'Les conséquences concrètes pour les personnes concernées',
        question: desk?.check ?? 'Qui est concerné, où et depuis quand ? Quels effets peut-on documenter ?',
        prompt: (desk?.angle ?? 'Examiner les conséquences concrètes') + ' — ' + topic,
      },
      {
        label: 'Le contexte et ce qu’il reste à vérifier',
        question: 'Quels faits sont établis par cette source ? Quel document, témoin ou média indépendant peut les confirmer ?',
        prompt: 'Expliquer le contexte et distinguer les faits établis des questions ouvertes — ' + topic,
      },
    ],
  };
}
