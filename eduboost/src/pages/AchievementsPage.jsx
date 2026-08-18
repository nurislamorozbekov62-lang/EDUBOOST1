import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  BookOpen,
  CheckCircle2,
  Crown,
  Flame,
  Gift,
  Headphones,
  Medal,
  Shirt,
  Target,
  Ticket,
  Trophy,
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

import './AchievementsPage.css'

function AchievementsPage() {
  const { user } = useAuth()

  const [freshUser, setFreshUser] = useState(user)

  useEffect(() => {
    if (!user?.id) {
      return
    }

    const storedUser = getUsers().find(
      (item) => item.id === user.id
    )

    setFreshUser(storedUser || user)
  }, [user])

  const unlockedAchievements = useMemo(() => {
    return getUnlockedAchievements(
      freshUser || {}
    )
  }, [freshUser])

  const unlockedIds = useMemo(() => {
    return new Set(
      unlockedAchievements.map(
        (achievement) => achievement.id
      )
    )
  }, [unlockedAchievements])

  const rankedUsers = useMemo(() => {
    return getUsers()
      .filter(
        (item) =>
          item.role === 'Ученик' ||
          item.id === freshUser?.id
      )
      .sort(
        (a, b) =>
          Number(b.points || 0) -
          Number(a.points || 0)
      )
  }, [freshUser])

  if (!freshUser) {
    return null
  }

  const xp = Number(freshUser.xp || 0)
  const points = Number(freshUser.points || 0)

  const currentLevel =
    getLevelByXp(xp)

  const nextLevel =
    getNextLevel(xp)

  const progress = Math.min(
    Math.max(
      Number(getLevelProgress(xp) || 0),
      0
    ),
    100
  )

  const currentPosition =
    rankedUsers.findIndex(
      (item) => item.id === freshUser.id
    ) + 1

  const topUsers =
    rankedUsers.slice(0, 3)

  const previewAchievements =
    achievements.slice(0, 4)

  const achievementIcons = [
    BookOpen,
    Flame,
    Target,
    Crown,
  ]

  return (
    <div className="eb-ach-page">
      <section className="eb-ach-hero">
        <div className="eb-ach-hero-text">
          <h1>Мои достижения</h1>

          <p>
            Учись. Зарабатывай. Достигай!
          </p>
        </div>

        <div className="eb-ach-hero-art">
          <Trophy size={72} />
        </div>
      </section>

      <section className="eb-ach-summary">
        <div className="eb-ach-points">
          <span className="eb-ach-summary-label">
            Мои баллы
          </span>

          <div className="eb-ach-points-value">
            <div className="eb-ach-coin">
              ●
            </div>

            <strong>
              {points.toLocaleString(
                'ru-RU'
              )}
            </strong>
          </div>

          <small>Баллов</small>
        </div>

        <div className="eb-ach-level">
          <div className="eb-ach-level-top">
            <div className="eb-ach-level-badge">
              {currentLevel.id}
            </div>

            <div>
              <span>Уровень</span>

              <strong>
                {currentLevel.name}
              </strong>
            </div>
          </div>

          <div className="eb-ach-progress">
            <span
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <small>
            {nextLevel
              ? `${xp.toLocaleString(
                  'ru-RU'
                )} / ${Number(
                  nextLevel.minXp
                ).toLocaleString(
                  'ru-RU'
                )} XP`
              : 'Максимальный уровень'}
          </small>
        </div>
      </section>

      <section className="eb-ach-section">
        <div className="eb-ach-section-header">
          <h2>Мои достижения</h2>

          <span>
            {unlockedAchievements.length}{' '}
            открыто
          </span>
        </div>

        <div className="eb-ach-badges">
          {previewAchievements.map(
            (achievement, index) => {
              const Icon =
                achievementIcons[index] ||
                Medal

              const unlocked =
                unlockedIds.has(
                  achievement.id
                )

              return (
                <article
                  key={achievement.id}
                  className={`eb-ach-badge ${
                    unlocked
                      ? ''
                      : 'eb-ach-badge-locked'
                  }`}
                >
                  <div
                    className={`eb-ach-badge-icon eb-ach-badge-icon-${index + 1}`}
                  >
                    <Icon size={27} />
                  </div>

                  <strong>
                    {achievement.name}
                  </strong>

                  <p>
                    {unlocked
                      ? 'Получено'
                      : 'Не открыто'}
                  </p>
                </article>
              )
            }
          )}
        </div>
      </section>

      <section className="eb-ach-section">
        <div className="eb-ach-section-header">
          <h2>Таблица лидеров</h2>

          <Link to="/ranking">
            Смотреть все
          </Link>
        </div>

        <div className="eb-ach-leaderboard">
          {topUsers.length > 0 ? (
            topUsers.map(
              (student, index) => (
                <LeaderRow
                  key={student.id}
                  student={student}
                  position={index + 1}
                  current={
                    student.id ===
                    freshUser.id
                  }
                />
              )
            )
          ) : (
            <LeaderRow
              student={freshUser}
              position={1}
              current
            />
          )}

          {currentPosition > 3 && (
            <LeaderRow
              student={freshUser}
              position={currentPosition}
              current
            />
          )}
        </div>
      </section>

      <section className="eb-ach-section">
        <div className="eb-ach-section-header">
          <h2>
            Обменяй баллы на подарки
          </h2>

          <Link to="/store">
            Все награды
          </Link>
        </div>

        <div className="eb-ach-rewards">
          <RewardCard
            icon={Gift}
            title="Скидка 10%"
            points={500}
          />

          <RewardCard
            icon={Ticket}
            title="Билет в кино"
            points={800}
          />

          <RewardCard
            icon={Headphones}
            title="Наушники"
            points={2500}
          />

          <RewardCard
            icon={Shirt}
            title="Мерч EduBoost"
            points={3000}
          />
        </div>
      </section>
    </div>
  )
}

function LeaderRow({
  student,
  position,
  current = false,
}) {
  const medal =
    position === 1
      ? '🥇'
      : position === 2
        ? '🥈'
        : position === 3
          ? '🥉'
          : position

  return (
    <div
      className={`eb-ach-leader ${
        current
          ? 'eb-ach-leader-current'
          : ''
      }`}
    >
      <div className="eb-ach-rank">
        {medal}
      </div>

      <div className="eb-ach-avatar">
        {(student.name || 'U')
          .charAt(0)
          .toUpperCase()}
      </div>

      <div className="eb-ach-leader-info">
        <strong>
          {current
            ? 'Вы'
            : student.name ||
              'Ученик'}
        </strong>

        <span>
          {Number(
            student.points || 0
          ).toLocaleString(
            'ru-RU'
          )}{' '}
          баллов
        </span>
      </div>

      {current && (
        <CheckCircle2
          size={18}
          color="#0867ed"
        />
      )}
    </div>
  )
}

function RewardCard({
  icon: Icon,
  title,
  points,
}) {
  return (
    <Link
      to="/store"
      className="eb-ach-reward"
    >
      <div className="eb-ach-reward-icon">
        <Icon size={25} />
      </div>

      <strong>{title}</strong>

      <span>
        ●{' '}
        {points.toLocaleString(
          'ru-RU'
        )}
      </span>
    </Link>
  )
}

export default AchievementsPage