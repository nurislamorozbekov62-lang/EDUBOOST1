import {
  useMemo,
} from 'react'
import {
  useNavigate,
} from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

import {
  canStudentAttempt,
  getStudentTestAttempts,
  getStudentTests,
} from '../services/testService'

function StudentTestsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const tests = useMemo(
    () => getStudentTests(user),
    [user],
  )

  if (user.role !== 'Ученик') {
    return (
      <div className="page-container">
        <section className="content-card">
          <h2>Доступ запрещён</h2>
        </section>
      </div>
    )
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Мои тесты</h1>
          <p>
            Пройденные и доступные тесты
          </p>
        </div>
      </header>

      <div className="student-tests-grid">
        {tests.length === 0 && (
          <section className="content-card">
            <p className="empty-text">
              Учитель пока не назначил
              тесты.
            </p>
          </section>
        )}

        {tests.map((test) => {
          const attempts =
            getStudentTestAttempts(
              user.id,
              test.id,
            )

          const bestResult =
            attempts.length
              ? Math.max(
                  ...attempts.map(
                    (attempt) =>
                      attempt.percentage,
                  ),
                )
              : null

          const canAttempt =
            canStudentAttempt(
              user.id,
              test,
            )

          return (
            <article
              className="student-test-card"
              key={test.id}
            >
              <div className="student-test-icon">
                🧠
              </div>

              <div>
                <span>{test.subject}</span>
                <h2>{test.title}</h2>
                <p>
                  {test.description ||
                    'Проверь свои знания'}
                </p>
              </div>

              <div className="student-test-meta">
                <span>
                  Вопросов:{' '}
                  {test.questions.length}
                </span>

                <span>
                  Попыток:{' '}
                  {attempts.length}/
                  {test.maxAttempts}
                </span>

                <span>
                  Награда: ⭐
                  {test.rewardPoints} · ⚡
                  {test.rewardXp}
                </span>

                {test.deadline && (
                  <span>
                    До: {test.deadline}
                  </span>
                )}
              </div>

              {bestResult !== null && (
                <div className="student-test-best">
                  Лучший результат:{' '}
                  <strong>
                    {bestResult}%
                  </strong>
                </div>
              )}

              <button
                type="button"
                className="primary-button"
                disabled={!canAttempt}
                onClick={() =>
                  navigate(
                    `/tests/${test.id}`,
                  )
                }
              >
                {canAttempt
                  ? attempts.length
                    ? 'Пройти ещё раз'
                    : 'Начать тест'
                  : 'Попытки закончились'}
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default StudentTestsPage