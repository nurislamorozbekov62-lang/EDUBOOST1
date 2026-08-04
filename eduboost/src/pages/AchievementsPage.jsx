import { useEffect, useMemo, useState } from 'react'
import {
  Award,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Flame,
  Gem,
  LockKeyhole,
  Medal,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { getUsers } from '../services/storage'

import {
  achievements,
  getUnlockedAchievements,
} from '../data/achievements'

import {
  getLevelByXp,
  getLevelProgress,
  getNextLevel,
} from '../data/levels'

function AchievementsPage() {
  const { user } = useAuth()

  const [freshUser, setFreshUser] = useState(user)

  useEffect(() => {
    if (!user?.id) {
      return
    }

    const storedUser = getUsers().find(
      (item) => item.id === user.id,
    )

    if (storedUser) {
      setFreshUser(storedUser)
    }
  }, [user])

  const xp = Number(freshUser?.xp || 0)

  const currentLevel = getLevelByXp(xp)
  const nextLevel = getNextLevel(xp)
  const progress = getLevelProgress(xp)

  const unlockedAchievements = useMemo(
    () =>
      getUnlockedAchievements(
        freshUser || {},
      ),
    [freshUser],
  )

  const unlockedIds = useMemo(
    () =>
      new Set(
        unlockedAchievements.map(
          (achievement) => achievement.id,
        ),
      ),
    [unlockedAchievements],
  )

  const lockedCount =
    achievements.length -
    unlockedAchievements.length

  const remainingXp = nextLevel
    ? Math.max(
        Number(nextLevel.minXp || 0) -
          xp,
        0,
      )
    : 0

  if (!freshUser) {
    return null
  }

  return (
    <div className="achievements-page">
      <AchievementsHeader />

      <LevelHero
        currentLevel={currentLevel}
        nextLevel={nextLevel}
        xp={xp}
        progress={progress}
        remainingXp={remainingXp}
      />

      <AchievementStats
        unlockedCount={
          unlockedAchievements.length
        }
        lockedCount={lockedCount}
        bestStreak={
          freshUser.bestStreak || 0
        }
        completedTasks={
          freshUser.completedTasks || 0
        }
      />

      <AchievementsCollection
        achievements={achievements}
        unlockedIds={unlockedIds}
      />
    </div>
  )
}

function AchievementsHeader() {
  return (
    <header className="achievements-header">
      <div className="achievements-header-icon">
        <Trophy size={28} />
      </div>

      <div>
        <p>Ваши результаты</p>

        <h1>Достижения</h1>

        <span>
          Повышайте уровень, выполняйте
          задания и открывайте новые награды.
        </span>
      </div>
    </header>
  )
}

function LevelHero({
  currentLevel,
  nextLevel,
  xp,
  progress,
  remainingXp,
}) {
  const safeProgress = Math.min(
    Math.max(Number(progress || 0), 0),
    100,
  )

  return (
    <section className="achievement-level-hero">
      <div className="achievement-level-content">
        <div className="achievement-level-label">
          <Sparkles size={16} />
          Текущий уровень
        </div>

        <div className="achievement-level-main">
          <div className="achievement-level-icon">
            <Medal
              size={34}
              strokeWidth={2.1}
            />
          </div>

          <div>
            <span>Уровень ученика</span>

            <h2>{currentLevel.name}</h2>

            <p>
              <Zap size={16} />

              {xp.toLocaleString('ru-RU')}{' '}
              опыта
            </p>
          </div>
        </div>

        <div className="achievement-level-progress">
          <div className="achievement-level-progress-heading">
            <span>
              Прогресс до следующего уровня
            </span>

            <strong>
              {safeProgress}%
            </strong>
          </div>

          <div className="achievement-level-progress-track">
            <span
              style={{
                width: `${safeProgress}%`,
              }}
            />
          </div>

          <p className="achievement-level-next">
            {nextLevel
              ? `До уровня «${nextLevel.name}» осталось ${remainingXp.toLocaleString(
                  'ru-RU',
                )} опыта`
              : 'Вы достигли максимального уровня'}
          </p>
        </div>
      </div>

      <div className="achievement-level-badge">
        <ShieldCheck size={36} />

        <strong>
          {currentLevel.name}
        </strong>

        <span>Ваш текущий ранг</span>
      </div>
    </section>
  )
}

function AchievementStats({
  unlockedCount,
  lockedCount,
  bestStreak,
  completedTasks,
}) {
  const stats = [
    {
      label: 'Открыто',
      value: unlockedCount,
      icon: Trophy,
      className:
        'achievement-stat--gold',
    },
    {
      label: 'Осталось',
      value: lockedCount,
      icon: LockKeyhole,
      className:
        'achievement-stat--blue',
    },
    {
      label: 'Лучшая серия',
      value: bestStreak,
      icon: Flame,
      className:
        'achievement-stat--green',
    },
    {
      label: 'Выполнено',
      value: completedTasks,
      icon: ClipboardCheck,
      className:
        'achievement-stat--purple',
    },
  ]

  return (
    <section className="achievement-stats-grid">
      {stats.map((stat) => {
        const Icon = stat.icon

        return (
          <article
            className={`achievement-stat-card ${stat.className}`}
            key={stat.label}
          >
            <div className="achievement-stat-icon">
              <Icon size={21} />
            </div>

            <div>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          </article>
        )
      })}
    </section>
  )
}

function AchievementsCollection({
  achievements: allAchievements,
  unlockedIds,
}) {
  const unlockedCount =
    allAchievements.filter(
      (achievement) =>
        unlockedIds.has(achievement.id),
    ).length

  const totalCount =
    allAchievements.length

  const totalProgress =
    totalCount > 0
      ? Math.round(
          (unlockedCount / totalCount) *
            100,
        )
      : 0

  return (
    <section className="achievements-collection">
      <div className="achievements-collection-heading">
        <div>
          <p>Коллекция наград</p>
          <h2>Все достижения</h2>
        </div>

        <div className="achievements-total-progress">
          <span>
            {unlockedCount} из {totalCount}
          </span>

          <strong>
            {totalProgress}%
          </strong>
        </div>
      </div>

      <div className="achievements-total-track">
        <span
          style={{
            width: `${totalProgress}%`,
          }}
        />
      </div>

      {allAchievements.length === 0 ? (
        <div className="achievement-empty-state">
          <div>
            <Award size={30} />
          </div>

          <h3>Достижений пока нет</h3>

          <p>
            Новые награды появятся здесь.
          </p>
        </div>
      ) : (
        <div className="modern-achievements-grid">
          {allAchievements.map(
            (achievement, index) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                unlocked={unlockedIds.has(
                  achievement.id,
                )}
                index={index}
              />
            ),
          )}
        </div>
      )}
    </section>
  )
}

function AchievementCard({
  achievement,
  unlocked,
  index,
}) {
  const Icon = getAchievementIcon(
    achievement,
    index,
  )

  return (
    <article
      className={
        unlocked
          ? 'modern-achievement-card modern-achievement-card--unlocked'
          : 'modern-achievement-card modern-achievement-card--locked'
      }
    >
      <div className="modern-achievement-card-top">
        <div className="modern-achievement-icon">
          <Icon
            size={29}
            strokeWidth={2.1}
          />
        </div>

        <AchievementState
          unlocked={unlocked}
        />
      </div>

      <div className="modern-achievement-card-content">
        <span className="modern-achievement-category">
          {unlocked
            ? 'Полученная награда'
            : 'Новая цель'}
        </span>

        <h3>{achievement.name}</h3>

        <p>
          {achievement.description}
        </p>
      </div>

      <div className="modern-achievement-card-footer">
        <div>
          {unlocked ? (
            <CheckCircle2 size={18} />
          ) : (
            <Target size={18} />
          )}

          <span>
            {unlocked
              ? 'Достижение открыто'
              : 'Продолжайте обучение'}
          </span>
        </div>

        <ChevronRight size={18} />
      </div>

      {!unlocked && (
        <div className="modern-achievement-lock">
          <LockKeyhole size={20} />
        </div>
      )}
    </article>
  )
}

function AchievementState({
  unlocked,
}) {
  return (
    <span
      className={
        unlocked
          ? 'achievement-state-badge achievement-state-badge--unlocked'
          : 'achievement-state-badge achievement-state-badge--locked'
      }
    >
      {unlocked ? (
        <>
          <ShieldCheck size={14} />
          Открыто
        </>
      ) : (
        <>
          <LockKeyhole size={14} />
          Закрыто
        </>
      )}
    </span>
  )
}

function getAchievementIcon(
  achievement,
  index,
) {
  const text = `${achievement.name || ''} ${
    achievement.description || ''
  }`.toLowerCase()

  if (
    text.includes('серия') ||
    text.includes('день')
  ) {
    return Flame
  }

  if (
    text.includes('задани') ||
    text.includes('работ')
  ) {
    return ClipboardCheck
  }

  if (
    text.includes('опыт') ||
    text.includes('уров')
  ) {
    return Zap
  }

  if (
    text.includes('перв') ||
    text.includes('старт')
  ) {
    return Rocket
  }

  if (
    text.includes('балл') ||
    text.includes('очк')
  ) {
    return Gem
  }

  if (
    text.includes('лучш') ||
    text.includes('побед')
  ) {
    return Trophy
  }

  const icons = [
    Star,
    Trophy,
    Flame,
    Target,
    Medal,
    Award,
    Rocket,
    Gem,
  ]

  return icons[index % icons.length]
}

export default AchievementsPage