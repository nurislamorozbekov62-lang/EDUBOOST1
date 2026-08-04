import { useEffect, useMemo, useState } from 'react'
import {
  Award,
  CheckCircle2,
  ChevronUp,
  Crown,
  Flame,
  GraduationCap,
  Medal,
  School,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  UsersRound,
  Zap,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { getUsers } from '../services/storage'
import { getLevelByXp } from '../data/levels'

function RankingPage() {
  const { user } = useAuth()

  const [students, setStudents] = useState([])

  useEffect(() => {
    loadRanking()
  }, [user])

  function loadRanking() {
    if (!user) {
      setStudents([])
      return
    }

    const classStudents = getUsers()
      .filter(
        (student) =>
          student.role === 'Ученик' &&
          student.school === user.school &&
          student.className === user.className,
      )
      .sort((firstStudent, secondStudent) => {
        const xpDifference =
          Number(secondStudent.xp || 0) -
          Number(firstStudent.xp || 0)

        if (xpDifference !== 0) {
          return xpDifference
        }

        return (
          Number(secondStudent.points || 0) -
          Number(firstStudent.points || 0)
        )
      })

    setStudents(classStudents)
  }

  const currentUserPosition =
    students.findIndex(
      (student) => student.id === user?.id,
    ) + 1

  const topStudents = useMemo(
    () => students.slice(0, 3),
    [students],
  )

  const rankingStudents = useMemo(
    () => students.slice(3),
    [students],
  )

  const leader = students[0] || null

  const xpToLeader =
    leader && user
      ? Math.max(
          Number(leader.xp || 0) -
            Number(user.xp || 0),
          0,
        )
      : 0

  if (!user) {
    return null
  }

  return (
    <div className="modern-ranking-page">
      <RankingHeader user={user} />

      <RankingHero
        currentUserPosition={
          currentUserPosition
        }
        studentsCount={students.length}
        xp={Number(user.xp || 0)}
        streak={Number(user.streak || 0)}
        xpToLeader={xpToLeader}
      />

      {students.length === 0 ? (
        <RankingEmptyState />
      ) : (
        <>
          <RankingPodium
            students={topStudents}
            currentUserId={user.id}
          />

          <RankingTable
            students={
              rankingStudents.length > 0
                ? rankingStudents
                : topStudents
            }
            startPosition={
              rankingStudents.length > 0
                ? 4
                : 1
            }
            currentUserId={user.id}
          />
        </>
      )}
    </div>
  )
}

function RankingHeader({ user }) {
  return (
    <header className="modern-ranking-header">
      <div className="modern-ranking-header-icon">
        <Trophy size={28} />
      </div>

      <div>
        <p>Соревнование класса</p>

        <h1>Рейтинг учеников</h1>

        <div className="modern-ranking-header-meta">
          <span>
            <School size={15} />
            {user.school || 'Школа не указана'}
          </span>

          <span>
            <GraduationCap size={15} />
            {user.className || 'Класс не указан'}
          </span>
        </div>
      </div>
    </header>
  )
}

function RankingHero({
  currentUserPosition,
  studentsCount,
  xp,
  streak,
  xpToLeader,
}) {
  return (
    <section className="modern-ranking-hero">
      <div className="modern-ranking-hero-content">
        <div className="modern-ranking-hero-label">
          <Sparkles size={16} />
          Ваш результат
        </div>

        <h2>
          {currentUserPosition > 0
            ? `${currentUserPosition}-е место в классе`
            : 'Вы пока не участвуете в рейтинге'}
        </h2>

        <p>
          Выполняйте задания, проходите тесты
          и набирайте опыт, чтобы подняться
          выше.
        </p>

        <div className="modern-ranking-hero-stats">
          <span>
            <Zap size={17} />
            {xp.toLocaleString('ru-RU')} опыта
          </span>

          <span>
            <Flame size={17} />
            {streak} дней серии
          </span>

          <span>
            <UsersRound size={17} />
            {studentsCount} участников
          </span>
        </div>

        {xpToLeader > 0 && (
          <div className="modern-ranking-next-place">
            <ChevronUp size={18} />

            <span>
              До лидера осталось{' '}
              <strong>
                {xpToLeader.toLocaleString(
                  'ru-RU',
                )}
              </strong>{' '}
              опыта
            </span>
          </div>
        )}
      </div>

      <div className="modern-ranking-hero-badge">
        <Crown size={39} />

        <strong>
          {currentUserPosition || '—'}
        </strong>

        <span>ваше место</span>
      </div>
    </section>
  )
}

function RankingPodium({
  students,
  currentUserId,
}) {
  if (students.length === 0) {
    return null
  }

  const podiumOrder = [
    students[1],
    students[0],
    students[2],
  ].filter(Boolean)

  return (
    <section className="modern-ranking-section">
      <div className="modern-ranking-section-heading">
        <div>
          <p>Лучшие ученики</p>
          <h2>Тройка лидеров</h2>
        </div>

        <Medal size={23} />
      </div>

      <div className="modern-ranking-podium">
        {podiumOrder.map((student) => {
          const originalPosition =
            students.findIndex(
              (item) =>
                item.id === student.id,
            ) + 1

          const isCurrentUser =
            student.id === currentUserId

          const level = getLevelByXp(
            Number(student.xp || 0),
          )

          return (
            <article
              key={student.id}
              className={`ranking-podium-card ranking-podium-card--${originalPosition} ${
                isCurrentUser
                  ? 'ranking-podium-card--current'
                  : ''
              }`}
            >
              <div className="ranking-podium-place">
                {getPositionIcon(
                  originalPosition,
                )}
              </div>

              <div className="ranking-podium-avatar">
                {String(student.name || 'У')
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <span className="ranking-podium-position">
                {originalPosition} место
              </span>

              <h3>
                {student.name}

                {isCurrentUser && (
                  <small>Это вы</small>
                )}
              </h3>

              <div className="ranking-podium-level">
                <ShieldCheck size={15} />
                {level.name}
              </div>

              <strong className="ranking-podium-xp">
                <Zap size={18} />
                {Number(
                  student.xp || 0,
                ).toLocaleString('ru-RU')}
              </strong>

              <span className="ranking-podium-xp-label">
                опыта
              </span>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function RankingTable({
  students,
  startPosition,
  currentUserId,
}) {
  return (
    <section className="modern-ranking-section">
      <div className="modern-ranking-section-heading">
        <div>
          <p>Общий рейтинг</p>
          <h2>Таблица лидеров</h2>
        </div>

        <span className="modern-ranking-auto-update">
          Обновляется автоматически
        </span>
      </div>

      <div className="modern-ranking-list">
        {students.map((student, index) => {
          const position =
            startPosition + index

          const isCurrentUser =
            student.id === currentUserId

          const level = getLevelByXp(
            Number(student.xp || 0),
          )

          return (
            <article
              className={
                isCurrentUser
                  ? 'modern-ranking-item modern-ranking-item--current'
                  : 'modern-ranking-item'
              }
              key={student.id}
            >
              <div
                className={`modern-ranking-position modern-ranking-position--${getPositionClass(
                  position,
                )}`}
              >
                {position <= 3 ? (
                  getPositionIcon(position)
                ) : (
                  <strong>{position}</strong>
                )}
              </div>

              <div className="modern-ranking-avatar">
                {String(student.name || 'У')
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="modern-ranking-student">
                <div>
                  <h3>
                    {student.name}

                    {isCurrentUser && (
                      <span>Вы</span>
                    )}
                  </h3>

                  <p>
                    <ShieldCheck size={14} />
                    {level.name}
                  </p>
                </div>
              </div>

              <RankingValue
                icon={Zap}
                value={Number(
                  student.xp || 0,
                )}
                label="опыта"
                className="ranking-value--blue"
              />

              <RankingValue
                icon={Flame}
                value={Number(
                  student.streak || 0,
                )}
                label="дней"
                className="ranking-value--orange"
              />

              <RankingValue
                icon={CheckCircle2}
                value={Number(
                  student.completedTasks ||
                    0,
                )}
                label="заданий"
                className="ranking-value--green"
              />
            </article>
          )
        })}
      </div>
    </section>
  )
}

function RankingValue({
  icon: Icon,
  value,
  label,
  className,
}) {
  return (
    <div
      className={`modern-ranking-value ${className}`}
    >
      <div>
        <Icon size={17} />
      </div>

      <span>
        <strong>
          {value.toLocaleString('ru-RU')}
        </strong>

        <small>{label}</small>
      </span>
    </div>
  )
}

function RankingEmptyState() {
  return (
    <section className="modern-ranking-empty">
      <div>
        <UsersRound size={31} />
      </div>

      <h2>Рейтинг пока пуст</h2>

      <p>
        В вашем классе пока нет учеников,
        которых можно добавить в таблицу
        лидеров.
      </p>
    </section>
  )
}

function getPositionIcon(position) {
  if (position === 1) {
    return <Crown size={24} />
  }

  if (position === 2) {
    return <Medal size={24} />
  }

  return <Award size={24} />
}

function getPositionClass(position) {
  if (position === 1) {
    return 'gold'
  }

  if (position === 2) {
    return 'silver'
  }

  if (position === 3) {
    return 'bronze'
  }

  return 'default'
}

export default RankingPage