import { useEffect, useState } from 'react'
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

  function getMedal(position) {
    if (position === 1) {
      return '🥇'
    }

    if (position === 2) {
      return '🥈'
    }

    if (position === 3) {
      return '🥉'
    }

    return position
  }

  const currentUserPosition =
    students.findIndex(
      (student) => student.id === user.id,
    ) + 1

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Рейтинг класса</h1>

          <p>
            Рейтинг учеников класса{' '}
            {user.className}
          </p>
        </div>
      </header>

      <section className="ranking-summary">
        <div className="ranking-summary-card">
          <span>🏆</span>

          <strong>
            {currentUserPosition || '—'}
          </strong>

          <p>Ваше место</p>
        </div>

        <div className="ranking-summary-card">
          <span>⚡</span>

          <strong>
            {Number(user.xp || 0)}
          </strong>

          <p>Ваш опыт</p>
        </div>

        <div className="ranking-summary-card">
          <span>👨‍🎓</span>

          <strong>{students.length}</strong>

          <p>Учеников в рейтинге</p>
        </div>

        <div className="ranking-summary-card">
          <span>🔥</span>

          <strong>
            {Number(user.streak || 0)}
          </strong>

          <p>Текущая серия</p>
        </div>
      </section>

      <section className="content-card">
        <div className="ranking-title-row">
          <h2>Таблица лидеров</h2>

          <span>
            Обновляется автоматически
          </span>
        </div>

        <div className="ranking-list">
          {students.length === 0 && (
            <p className="empty-text">
              В вашем классе пока нет других
              учеников.
            </p>
          )}

          {students.map((student, index) => {
            const position = index + 1
            const level = getLevelByXp(
              student.xp,
            )

            const isCurrentUser =
              student.id === user.id

            return (
              <article
                className={
                  isCurrentUser
                    ? 'ranking-item current-ranking-user'
                    : 'ranking-item'
                }
                key={student.id}
              >
                <div className="ranking-position">
                  {getMedal(position)}
                </div>

                <div className="ranking-avatar">
                  {student.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="ranking-student-info">
                  <strong>
                    {student.name}
                    {isCurrentUser
                      ? ' — это вы'
                      : ''}
                  </strong>

                  <p>
                    {level.icon} {level.name}
                  </p>
                </div>

                <div className="ranking-value">
                  <strong>
                    ⚡ {Number(student.xp || 0)}
                  </strong>

                  <span>опыта</span>
                </div>

                <div className="ranking-value">
                  <strong>
                    🔥{' '}
                    {Number(
                      student.streak || 0,
                    )}
                  </strong>

                  <span>дней</span>
                </div>

                <div className="ranking-value">
                  <strong>
                    ✅{' '}
                    {Number(
                      student.completedTasks ||
                        0,
                    )}
                  </strong>

                  <span>заданий</span>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default RankingPage