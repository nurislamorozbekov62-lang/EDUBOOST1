import {
  useState,
} from 'react'
import {
  Navigate,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

import {
  canStudentAttempt,
  getTestById,
  submitTestAttempt,
} from '../services/testService'

function TestAttemptPage() {
  const { user } = useAuth()
  const { testId } = useParams()
  const navigate = useNavigate()

  const test = getTestById(testId)

  const [answers, setAnswers] =
    useState({})

  const [result, setResult] =
    useState(null)

  const [error, setError] =
    useState('')

  if (user.role !== 'Ученик') {
    return <Navigate to="/" replace />
  }

  if (!test) {
    return (
      <div className="page-container">
        <section className="content-card">
          <h2>Тест не найден</h2>

          <button
            className="primary-button"
            onClick={() =>
              navigate('/tests')
            }
          >
            Вернуться к тестам
          </button>
        </section>
      </div>
    )
  }

  function selectAnswer(
    questionIndex,
    optionIndex,
  ) {
    if (result) {
      return
    }

    setAnswers((oldAnswers) => ({
      ...oldAnswers,
      [questionIndex]: optionIndex,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (
      Object.keys(answers).length !==
      test.questions.length
    ) {
      setError(
        'Ответьте на все вопросы',
      )
      return
    }

    try {
      const attempt =
        submitTestAttempt(
          user,
          test,
          answers,
        )

      setResult(attempt)
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  if (
    !result &&
    !canStudentAttempt(
      user.id,
      test,
    )
  ) {
    return (
      <div className="page-container">
        <section className="content-card">
          <h2>
            Попытки закончились
          </h2>

          <button
            className="primary-button"
            onClick={() =>
              navigate('/tests')
            }
          >
            Назад
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>{test.title}</h1>
          <p>
            {test.subject} · вопросов:{' '}
            {test.questions.length}
          </p>
        </div>
      </header>

      {result ? (
        <section className="test-result-hero">
          <div className="test-result-circle">
            {result.percentage}%
          </div>

          <h2>
            Тест завершён
          </h2>

          <p>
            Правильных ответов:{' '}
            {result.correctAnswers} из{' '}
            {result.totalQuestions}
          </p>

          <div className="test-earned-rewards">
            <span>
              ⭐ +{result.earnedPoints}
            </span>

            <span>
              ⚡ +{result.earnedXp} XP
            </span>
          </div>

          <button
            className="primary-button"
            onClick={() =>
              navigate('/tests')
            }
          >
            Вернуться к тестам
          </button>
        </section>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <div className="test-attempt-list">
            {test.questions.map(
              (question, questionIndex) => (
                <section
                  className="content-card test-attempt-question"
                  key={question.id}
                >
                  <span className="test-question-counter">
                    Вопрос{' '}
                    {questionIndex + 1} из{' '}
                    {test.questions.length}
                  </span>

                  <h2>{question.text}</h2>

                  <div className="test-answer-options">
                    {question.options.map(
                      (
                        option,
                        optionIndex,
                      ) => (
                        <button
                          type="button"
                          key={optionIndex}
                          className={
                            Number(
                              answers[
                                questionIndex
                              ],
                            ) === optionIndex
                              ? 'test-answer-option selected'
                              : 'test-answer-option'
                          }
                          onClick={() =>
                            selectAnswer(
                              questionIndex,
                              optionIndex,
                            )
                          }
                        >
                          <span>
                            {String.fromCharCode(
                              65 +
                                optionIndex,
                            )}
                          </span>

                          {option}
                        </button>
                      ),
                    )}
                  </div>
                </section>
              ),
            )}
          </div>

          <button
            className="primary-button test-submit-button"
            type="submit"
          >
            Завершить тест
          </button>
        </form>
      )}
    </div>
  )
}

export default TestAttemptPage