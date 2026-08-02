export const levels = [
  {
    id: 1,
    name: 'Новичок',
    minXp: 0,
    maxXp: 199,
    icon: '🌱',
  },
  {
    id: 2,
    name: 'Исследователь',
    minXp: 200,
    maxXp: 499,
    icon: '🔎',
  },
  {
    id: 3,
    name: 'Знаток',
    minXp: 500,
    maxXp: 999,
    icon: '📘',
  },
  {
    id: 4,
    name: 'Умник',
    minXp: 1000,
    maxXp: 1499,
    icon: '🧠',
  },
  {
    id: 5,
    name: 'Гений',
    minXp: 1500,
    maxXp: 2499,
    icon: '🌟',
  },
  {
    id: 6,
    name: 'Мастер знаний',
    minXp: 2500,
    maxXp: 4999,
    icon: '🎓',
  },
  {
    id: 7,
    name: 'Легенда EduBoost',
    minXp: 5000,
    maxXp: Infinity,
    icon: '👑',
  },
]

export function getLevelByXp(xp = 0) {
  const normalizedXp = Number(xp || 0)

  return (
    levels.find(
      (level) =>
        normalizedXp >= level.minXp &&
        normalizedXp <= level.maxXp,
    ) || levels[0]
  )
}

export function getNextLevel(xp = 0) {
  const currentLevel = getLevelByXp(xp)
  const currentIndex = levels.findIndex(
    (level) => level.id === currentLevel.id,
  )

  return levels[currentIndex + 1] || null
}

export function getLevelProgress(xp = 0) {
  const currentLevel = getLevelByXp(xp)
  const nextLevel = getNextLevel(xp)

  if (!nextLevel) {
    return 100
  }

  const earnedInsideLevel =
    Number(xp) - currentLevel.minXp

  const levelDistance =
    nextLevel.minXp - currentLevel.minXp

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (earnedInsideLevel / levelDistance) * 100,
      ),
    ),
  )
}