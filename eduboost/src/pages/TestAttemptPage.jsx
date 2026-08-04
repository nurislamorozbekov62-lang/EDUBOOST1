import { useMemo, useState } from 'react'
import {
  Navigate,
  useNavigate,
  useParams,
} from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Coins,
  FileQuestion,
  Flag,
  GraduationCap,
  ListChecks,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react'

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

  const [currentQuestion, setCurrentQuestion] =
    useState(0)

  const [result, setResult] =
    useState(null)

  const [error, setError] =
    useState('')

  const [isSubmitting, setIsSubmitting] =
    useState(false)

  const questions =
    Array.isArray(test?.questions)
      ? test.questions
      : []

  const answeredCount =
    Object.keys(answers).length

  const progress =
    questions.length > 0
      ? Math.round(
          (answeredCount /
            questions.length) *
            100,
        )
      : 0

  const currentQuestionData =
    questions[currentQuestion]

  const unansweredQuestions =
    useMemo(() => {
      return questions
        .map((_, index) => index)
        .filter(
          (index) =>
            answers[index] === undefined,
        )
    }, [questions, answers])

  if (!user) {
    return null
  }

  if (user.role !== 'Ученик') {
    return <Navigate to="/" replace />
  }

  if (!test) {
    return (
      <TestStatePage
        icon={FileQuestion}
        title="Тест не найден"
        text="Возможно, тест был удалён или ссылка указана неправильно."
        buttonText="Вернуться к тестам"
        onClick={() =>
          navigate('/tests')
        }
      />
    )
  }

  if (
    !result &&
    !canStudentAttempt(
      user.id,
      test,
    )
  ) {
    return (
      <TestStatePage
        icon={ShieldCheck}
        title="Попытки закончились"
        text="Вы использовали все доступные попытки для этого теста."
        buttonText="Вернуться к тестам"
        onClick={() =>
          navigate('/tests')
        }
      />
    )
  }

  function selectAnswer(optionIndex) {
    if (result) {
      return
    }

    setAnswers((oldAnswers) => ({
      ...oldAnswers,
      [currentQuestion]: optionIndex,
    }))

    setError('')
  }

  function goToQuestion(index) {
    if (
      index < 0 ||
      index >= questions.length
    ) {
      return
    }

    setCurrentQuestion(index)
    setError('')
  }

  function goToNextQuestion() {
    if (
      currentQuestion <
      questions.length - 1
    ) {
      goToQuestion(
        currentQuestion + 1,
      )
    }
  }

  function goToPreviousQuestion() {
    if (currentQuestion > 0) {
      goToQuestion(
        currentQuestion - 1,
      )
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (
      answeredCount !==
      questions.length
    ) {
      const firstUnanswered =
        unansweredQuestions[0]

      if (
        firstUnanswered !==
        undefined
      ) {
        setCurrentQuestion(
          firstUnanswered,
        )
      }

      setError(
        `Ответьте на все вопросы. Осталось: ${unansweredQuestions.length}.`,
      )

      return
    }

    const confirmed =
      window.confirm(
        'Завершить тест и отправить ответы?',
      )

    if (!confirmed) {
      return
    }

    try {
      setIsSubmitting(true)

      const attempt =
        submitTestAttempt(
          user,
          test,
          answers,
        )

      setResult(attempt)
    } catch (submitError) {
      setError(
        submitError.message ||
          'Не удалось отправить ответы.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (result) {
    return (
      <TestResult
        test={test}
        result={result}
        questions={questions}
        answers={answers}
        onBack={() =>
          navigate('/tests')
        }
      />
    )
  }

  return (
    <div className="test-attempt-page">
      <button
        type="button"
        className="test-attempt-back"
        onClick={() =>
          navigate('/tests')
        }
      >
        <ArrowLeft size={18} />
        Мои тесты
      </button>

      <TestAttemptHeader
        test={test}
        questionsCount={
          questions.length
        }
        answeredCount={
          answeredCount
        }
        progress={progress}
      />

      {error && (
        <div className="test-attempt-alert">
          <CircleAlert size={19} />
          <span>{error}</span>
        </div>
      )}

      <form
        className="test-attempt-layout"
        onSubmit={handleSubmit}
      >
        <QuestionNavigation
          questions={questions}
          answers={answers}
          currentQuestion={
            currentQuestion
          }
          onSelect={goToQuestion}
        />

        <main className="test-question-panel">
          <div className="test-question-panel-top">
            <div>
              <span>
                Вопрос{' '}
                {currentQuestion + 1}{' '}
                из {questions.length}
              </span>

              <h2>
                {currentQuestionData?.text}
              </h2>
            </div>

            <div className="test-question-number">
              {currentQuestion + 1}
            </div>
          </div>

          <div className="test-answer-modern-list">
            {currentQuestionData?.options.map(
              (
                option,
                optionIndex,
              ) => {
                const isSelected =
                  Number(
                    answers[
                      currentQuestion
                    ],
                  ) === optionIndex

                return (
                  <button
                    type="button"
                    key={optionIndex}
                    className={
                      isSelected
                        ? 'test-answer-modern test-answer-modern--selected'
                        : 'test-answer-modern'
                    }
                    onClick={() =>
                      selectAnswer(
                        optionIndex,
                      )
                    }
                  >
                    <span className="test-answer-letter">
                      {String.fromCharCode(
                        65 +
                          optionIndex,
                      )}
                    </span>

                    <strong>
                      {option}
                    </strong>

                    <span className="test-answer-check">
                      {isSelected && (
                        <Check size={17} />
                      )}
                    </span>
                  </button>
                )
              },
            )}
          </div>

          <div className="test-question-footer">
            <button
              type="button"
              className="test-question-secondary"
              disabled={
                currentQuestion === 0
              }
              onClick={
                goToPreviousQuestion
              }
            >
              <ArrowLeft size={17} />
              Назад
            </button>

            {currentQuestion <
            questions.length - 1 ? (
              <button
                type="button"
                className="test-question-primary"
                onClick={
                  goToNextQuestion
                }
              >
                Следующий вопрос
                <ArrowRight size={17} />
              </button>
            ) : (
              <button
                type="submit"
                className="test-question-submit"
                disabled={
                  isSubmitting
                }
              >
                {isSubmitting ? (
                  <RotateCcw size={17} />
                ) : (
                  <Flag size={17} />
                )}

                {isSubmitting
                  ? 'Отправляем...'
                  : 'Завершить тест'}
              </button>
            )}
          </div>
        </main>

        <TestSummary
          test={test}
          progress={progress}
          answeredCount={
            answeredCount
          }
          questionsCount={
            questions.length
          }
          isSubmitting={
            isSubmitting
          }
        />
      </form>
    </div>
  )
}

function TestAttemptHeader({
  test,
  questionsCount,
  answeredCount,
  progress,
}) {
  return (
    <header className="test-attempt-header">
      <div className="test-attempt-header-main">
        <div className="test-attempt-header-icon">
          <ListChecks size={28} />
        </div>

        <div>
          <p>
            {test.subject ||
              'Учебный тест'}
          </p>

          <h1>{test.title}</h1>

          <span>
            {test.description ||
              'Ответьте на все вопросы и отправьте результат.'}
          </span>
        </div>
      </div>

      <div className="test-attempt-header-progress">
        <div>
          <span>Прогресс</span>

          <strong>
            {answeredCount}/
            {questionsCount}
          </strong>
        </div>

        <div className="test-attempt-progress-bar">
          <span
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <small>
          Заполнено {progress}%
        </small>
      </div>
    </header>
  )
}

function QuestionNavigation({
  questions,
  answers,
  currentQuestion,
  onSelect,
}) {
  return (
    <aside className="test-question-navigation">
      <div className="test-question-navigation-head">
        <div>
          <p>Навигация</p>
          <h2>Вопросы</h2>
        </div>

        <FileQuestion size={22} />
      </div>

      <div className="test-question-navigation-grid">
        {questions.map(
          (_, index) => {
            const answered =
              answers[index] !==
              undefined

            return (
              <button
                type="button"
                key={index}
                className={[
                  'test-question-nav-button',
                  currentQuestion ===
                  index
                    ? 'test-question-nav-button--current'
                    : '',
                  answered
                    ? 'test-question-nav-button--answered'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() =>
                  onSelect(index)
                }
              >
                {answered ? (
                  <Check size={16} />
                ) : (
                  index + 1
                )}
              </button>
            )
          },
        )}
      </div>

      <div className="test-question-navigation-legend">
        <span>
          <i className="test-legend-current" />
          Текущий
        </span>

        <span>
          <i className="test-legend-answered" />
          Отвечен
        </span>

        <span>
          <i className="test-legend-empty" />
          Без ответа
        </span>
      </div>
    </aside>
  )
}

function TestSummary({
  test,
  progress,
  answeredCount,
  questionsCount,
  isSubmitting,
}) {
  return (
    <aside className="test-attempt-summary">
      <div className="test-attempt-summary-icon">
        <Sparkles size={24} />
      </div>

      <h2>Информация</h2>

      <TestSummaryItem
        icon={FileQuestion}
        label="Вопросов"
        value={questionsCount}
      />

      <TestSummaryItem
        icon={CheckCircle2}
        label="Отвечено"
        value={answeredCount}
      />

      <TestSummaryItem
        icon={Coins}
        label="Награда"
        value={`${Number(
          test.rewardPoints || 0,
        )} баллов`}
      />

      <TestSummaryItem
        icon={Zap}
        label="Опыт"
        value={`${Number(
          test.rewardXp || 0,
        )} XP`}
      />

      <div className="test-attempt-summary-progress">
        <div>
          <span>Готовность</span>
          <strong>{progress}%</strong>
        </div>

        <div>
          <span
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={
          answeredCount !==
            questionsCount ||
          isSubmitting
        }
      >
        <Flag size={17} />

        {isSubmitting
          ? 'Отправляем...'
          : answeredCount ===
              questionsCount
            ? 'Завершить тест'
            : `Осталось ${
                questionsCount -
                answeredCount
              }`}
      </button>

      <p>
        После отправки изменить ответы
        будет нельзя.
      </p>
    </aside>
  )
}

function TestSummaryItem({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="test-summary-item">
      <div>
        <Icon size={17} />
      </div>

      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  )
}

function TestResult({
  test,
  result,
  onBack,
}) {
  const resultData =
    getResultData(
      Number(result.percentage || 0),
    )

  const ResultIcon =
    resultData.icon

  return (
    <div className="test-result-page">
      <header className="test-result-header">
        <div className="test-result-header-icon">
          <GraduationCap size={28} />
        </div>

        <div>
          <p>Результат теста</p>
          <h1>{test.title}</h1>

          <span>
            {test.subject ||
              'Учебный тест'}
          </span>
        </div>
      </header>

      <section className="test-result-modern-card">
        <div
          className={`test-result-modern-icon ${resultData.className}`}
        >
          <ResultIcon size={44} />
        </div>

        <p>
          {resultData.subtitle}
        </p>

        <h2>
          {resultData.title}
        </h2>

        <div
          className={`test-result-modern-circle ${resultData.className}`}
          style={{
            '--result-progress': `${Math.min(
              Number(
                result.percentage ||
                  0,
              ),
              100,
            ) * 3.6}deg`,
          }}
        >
          <div>
            <strong>
              {result.percentage}%
            </strong>

            <span>результат</span>
          </div>
        </div>

        <div className="test-result-statistics">
          <ResultStat
            icon={CheckCircle2}
            label="Правильных ответов"
            value={`${result.correctAnswers} из ${result.totalQuestions}`}
            className="test-result-stat--green"
          />

          <ResultStat
            icon={Target}
            label="Точность"
            value={`${result.percentage}%`}
            className="test-result-stat--blue"
          />

          <ResultStat
            icon={Coins}
            label="Получено баллов"
            value={`+${Number(
              result.earnedPoints || 0,
            )}`}
            className="test-result-stat--gold"
          />

          <ResultStat
            icon={Zap}
            label="Получено опыта"
            value={`+${Number(
              result.earnedXp || 0,
            )} XP`}
            className="test-result-stat--purple"
          />
        </div>

        <div className="test-result-reward">
          <div>
            <Award size={25} />
          </div>

          <span>
            <strong>
              Тест завершён
            </strong>

            <p>
              Результат сохранён в вашем
              профиле и истории тестов.
            </p>
          </span>
        </div>

        <button
          type="button"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
          Вернуться к тестам
        </button>
      </section>
    </div>
  )
}

function ResultStat({
  icon: Icon,
  label,
  value,
  className,
}) {
  return (
    <article
      className={`test-result-stat ${className}`}
    >
      <div>
        <Icon size={21} />
      </div>

      <span>
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
    </article>
  )
}

function TestStatePage({
  icon: Icon,
  title,
  text,
  buttonText,
  onClick,
}) {
  return (
    <div className="test-attempt-page">
      <section className="test-attempt-state">
        <div>
          <Icon size={36} />
        </div>

        <h1>{title}</h1>

        <p>{text}</p>

        <button
          type="button"
          onClick={onClick}
        >
          <ArrowLeft size={18} />
          {buttonText}
        </button>
      </section>
    </div>
  )
}

function getResultData(
  percentage,
) {
  if (percentage >= 90) {
    return {
      title:
        'Превосходный результат',
      subtitle:
        'Вы отлично знаете материал',
      icon: Trophy,
      className:
        'test-result--excellent',
    }
  }

  if (percentage >= 70) {
    return {
      title: 'Хорошая работа',
      subtitle:
        'Материал усвоен хорошо',
      icon: Award,
      className:
        'test-result--good',
    }
  }

  if (percentage >= 50) {
    return {
      title:
        'Неплохой результат',
      subtitle:
        'Некоторые темы стоит повторить',
      icon: Target,
      className:
        'test-result--normal',
    }
  }

  return {
    title: 'Попробуйте ещё раз',
    subtitle:
      'Повторите материал и улучшите результат',
    icon: XCircle,
    className:
      'test-result--low',
  }
}

export default TestAttemptPage