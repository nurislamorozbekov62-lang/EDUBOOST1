import { useEffect, useState } from 'react'
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

  const [freshUser, setFreshUser] =
    useState(user)

  useEffect(() => {
    const storedUser = getUsers().find(
      (item) => item.id === user.id,
    )

    if (storedUser) {
      setFreshUser(storedUser)
    }
  }, [user])

  const xp = Number(freshUser.xp || 0)

  const currentLevel = getLevelByXp(xp)
  const nextLevel = getNextLevel(xp)
  const progress = getLevelProgress(xp)

  const unlockedAchievements =
    getUnlockedAchievements(freshUser)

  const unlockedIds = new Set(
    unlockedAchievements.map(
      (achievement) => achievement.id,
    ),
  )

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Достижения</h1>

          <p>
            Повышайте уровень и открывайте
            новые награды
          </p>
        </div>
      </header>

      <section className="content-card level-panel">
        <div className="level-panel-main">
          <div className="level-big-icon">
            {currentLevel.icon}
          </div>

          <div className="level-information">
            <span className="level-label">
              Текущий уровень
            </span>

            <h2>{currentLevel.name}</h2>

            <p>
              ⚡ {xp} опыта
            </p>
          </div>
        </div>

        <div className="level-progress-area">
          <div className="level-progress-text">
            <span>
              Прогресс уровня
            </span>

            <strong>{progress}%</strong>
          </div>

          <div className="level-progress-track">
            <div
              className="level-progress-fill"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <p className="level-next-text">
            {nextLevel
              ? `До уровня «${nextLevel.name}» осталось ${
                  nextLevel.minXp - xp
                } опыта`
              : 'Вы достигли максимального уровня'}
          </p>
        </div>
      </section>

      <section className="achievement-summary">
        <div className="achievement-summary-card">
          <span>🏆</span>

          <strong>
            {unlockedAchievements.length}
          </strong>

          <p>Открыто достижений</p>
        </div>

        <div className="achievement-summary-card">
          <span>🔒</span>

          <strong>
            {achievements.length -
              unlockedAchievements.length}
          </strong>

          <p>Осталось открыть</p>
        </div>

        <div className="achievement-summary-card">
          <span>🔥</span>

          <strong>
            {freshUser.bestStreak || 0}
          </strong>

          <p>Рекорд серии</p>
        </div>

        <div className="achievement-summary-card">
          <span>✅</span>

          <strong>
            {freshUser.completedTasks || 0}
          </strong>

          <p>Выполнено заданий</p>
        </div>
      </section>

      <section className="content-card">
        <h2>Все достижения</h2>

        <div className="achievements-grid">
          {achievements.map((achievement) => {
            const unlocked = unlockedIds.has(
              achievement.id,
            )

            return (
              <article
                className={
                  unlocked
                    ? 'achievement-card unlocked'
                    : 'achievement-card locked'
                }
                key={achievement.id}
              >
                <div className="achievement-icon">
                  {achievement.icon}
                </div>

                <h3>{achievement.name}</h3>

                <p>
                  {achievement.description}
                </p>

                <span className="achievement-state">
                  {unlocked
                    ? '✅ Открыто'
                    : '🔒 Заблокировано'}
                </span>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default AchievementsPage