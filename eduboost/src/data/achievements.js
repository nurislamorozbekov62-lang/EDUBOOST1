export const achievements = [
  {
    id: 'first-task',
    name: 'Первый шаг',
    icon: '🚀',
    description: 'Выполнить первое задание',
    condition: (user) =>
      Number(user.completedTasks || 0) >= 1,
  },
  {
    id: 'hard-worker',
    name: 'Трудолюбивый',
    icon: '🛠️',
    description: 'Выполнить 10 заданий',
    condition: (user) =>
      Number(user.completedTasks || 0) >= 10,
  },
  {
    id: 'knowledge-machine',
    name: 'Машина знаний',
    icon: '🤖',
    description: 'Выполнить 50 заданий',
    condition: (user) =>
      Number(user.completedTasks || 0) >= 50,
  },
  {
    id: 'first-fire',
    name: 'Первый огонь',
    icon: '🔥',
    description: 'Сохранить серию 3 дня',
    condition: (user) =>
      Number(user.bestStreak || 0) >= 3,
  },
  {
    id: 'stable-student',
    name: 'Стабильный ученик',
    icon: '🔥',
    description: 'Сохранить серию 7 дней',
    condition: (user) =>
      Number(user.bestStreak || 0) >= 7,
  },
  {
    id: 'unstoppable',
    name: 'Неудержимый',
    icon: '💥',
    description: 'Сохранить серию 14 дней',
    condition: (user) =>
      Number(user.bestStreak || 0) >= 14,
  },
  {
    id: 'fire-month',
    name: 'Огненный месяц',
    icon: '🏅',
    description: 'Сохранить серию 30 дней',
    condition: (user) =>
      Number(user.bestStreak || 0) >= 30,
  },
  {
    id: 'legendary-streak',
    name: 'Легендарная серия',
    icon: '👑',
    description: 'Сохранить серию 100 дней',
    condition: (user) =>
      Number(user.bestStreak || 0) >= 100,
  },
  {
    id: 'smart',
    name: 'Умник',
    icon: '🧠',
    description: 'Набрать 500 опыта',
    condition: (user) =>
      Number(user.xp || 0) >= 500,
  },
  {
    id: 'genius',
    name: 'Гений',
    icon: '🌟',
    description:
      'Набрать 1500 опыта и выполнить 30 заданий',
    condition: (user) =>
      Number(user.xp || 0) >= 1500 &&
      Number(user.completedTasks || 0) >= 30,
  },
  {
    id: 'master',
    name: 'Мастер знаний',
    icon: '🎓',
    description: 'Набрать 2500 опыта',
    condition: (user) =>
      Number(user.xp || 0) >= 2500,
  },
  {
    id: 'eduboost-legend',
    name: 'Легенда EduBoost',
    icon: '🏆',
    description: 'Набрать 5000 опыта',
    condition: (user) =>
      Number(user.xp || 0) >= 5000,
  },
]

export function getUnlockedAchievements(user) {
  return achievements.filter((achievement) =>
    achievement.condition(user),
  )
}