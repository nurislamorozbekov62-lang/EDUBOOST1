import {
  useMemo,
  useState,
} from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getSchoolClasses,
} from '../services/journalService'

import {
  createTest,
  deleteTest,
  getAttemptsByTest,
  getAverageTestResult,
  getTeacherTests,
} from '../services/testService'

function createEmptyQuestion() {
  return {
    id: crypto.randomUUID(),
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
  }
}

function TeacherTestsPage() {
  const { user } = useAuth()

  const classes = useMemo(
    () => getSchoolClasses(user),
    [user],
  )

  const [refreshKey, setRefreshKey] =
    useState(0)

  const [selectedTestId,
    setSelectedTestId] =
    useState('')

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const [form, setForm] = useState({
    title: '',
    subject: '',
    description: '',
    className: classes[0] || '',
    deadline: '',
    rewardPoints: 100,
    rewardXp: 200,
    maxAttempts: 1,
    questions: [
      createEmptyQuestion(),
    ],
  })

  const tests = useMemo(
    () => getTeacherTests(user.id),
    [user.id, refreshKey],
  )

  const selectedTest =
    tests.find(
      (test) =>
        test.id === selectedTestId,
    )

  const selectedAttempts =
    selectedTest
      ? getAttemptsByTest(
          selectedTest.id,
        )
      : []

  function handleFieldChange(event) {
    const { name, value } =
      event.target

    setForm((oldForm) => ({
      ...oldForm,
      [name]: value,
    }))
  }

  function updateQuestion(
    questionIndex,
    field,
    value,
  ) {
    setForm((oldForm) => ({
      ...oldForm,
      questions:
        oldForm.questions.map(
          (question, index) =>
            index === questionIndex
              ? {
                  ...question,
                  [field]: value,
                }
              : question,
        ),
    }))
  }

  function updateOption(
    questionIndex,
    optionIndex,
    value,
  ) {
    setForm((oldForm) => ({
      ...oldForm,
      questions:
        oldForm.questions.map(
          (question, index) => {
            if (
              index !== questionIndex
            ) {
              return question
            }

            const options = [
              ...question.options,
            ]

            options[optionIndex] =
              value

            return {
              ...question,
              options,
            }
          },
        ),
    }))
  }

  function addQuestion() {
    setForm((oldForm) => ({
      ...oldForm,
      questions: [
        ...oldForm.questions,
        createEmptyQuestion(),
      ],
    }))
  }

  function removeQuestion(index) {
    if (
      form.questions.length === 1
    ) {
      return
    }

    setForm((oldForm) => ({
      ...oldForm,
      questions:
        oldForm.questions.filter(
          (_, questionIndex) =>
            questionIndex !== index,
        ),
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setSuccess('')

    try {
      createTest(user, form)

      setSuccess('Тест создан')

      setForm({
        title: '',
        subject: '',
        description: '',
        className:
          form.className ||
          classes[0] ||
          '',
        deadline: '',
        rewardPoints: 100,
        rewardXp: 200,
        maxAttempts: 1,
        questions: [
          createEmptyQuestion(),
        ],
      })

      setRefreshKey(
        (value) => value + 1,
      )
    } catch (createError) {
      setError(createError.message)
    }
  }

  function handleDelete(testId) {
    const confirmed = window.confirm(
      'Удалить тест и все результаты?',
    )

    if (!confirmed) {
      return
    }

    deleteTest(testId, user.id)

    if (
      selectedTestId === testId
    ) {
      setSelectedTestId('')
    }

    setRefreshKey(
      (value) => value + 1,
    )
  }

  if (user.role !== 'Учитель') {
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
          <h1>Конструктор тестов</h1>
          <p>
            Создание тестов и просмотр
            результатов
          </p>
        </div>
      </header>

      <div className="tests-main-grid">
        <form
          className="content-card"
          onSubmit={handleSubmit}
        >
          <h2>Создать тест</h2>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {success && (
            <div className="schedule-success">
              {success}
            </div>
          )}

          <label className="form-group">
            <span>Название</span>

            <input
              name="title"
              value={form.title}
              onChange={
                handleFieldChange
              }
              placeholder="Например: Квадратные уравнения"
              required
            />
          </label>

          <div className="form-grid">
            <label className="form-group">
              <span>Предмет</span>

              <input
                name="subject"
                value={form.subject}
                onChange={
                  handleFieldChange
                }
                placeholder="Математика"
                required
              />
            </label>

            <label className="form-group">
              <span>Класс</span>

              <select
                name="className"
                value={form.className}
                onChange={
                  handleFieldChange
                }
                required
              >
                {classes.map(
                  (className) => (
                    <option
                      key={className}
                      value={className}
                    >
                      {className}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          <label className="form-group">
            <span>Описание</span>

            <textarea
              name="description"
              value={form.description}
              onChange={
                handleFieldChange
              }
              placeholder="Инструкция ученику"
            />
          </label>

          <div className="form-grid">
            <label className="form-group">
              <span>Дедлайн</span>

              <input
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={
                  handleFieldChange
                }
              />
            </label>

            <label className="form-group">
              <span>
                Количество попыток
              </span>

              <input
                type="number"
                name="maxAttempts"
                min="1"
                max="10"
                value={
                  form.maxAttempts
                }
                onChange={
                  handleFieldChange
                }
              />
            </label>
          </div>

          <div className="form-grid">
            <label className="form-group">
              <span>Баллы</span>

              <input
                type="number"
                name="rewardPoints"
                min="0"
                value={
                  form.rewardPoints
                }
                onChange={
                  handleFieldChange
                }
              />
            </label>

            <label className="form-group">
              <span>XP</span>

              <input
                type="number"
                name="rewardXp"
                min="0"
                value={form.rewardXp}
                onChange={
                  handleFieldChange
                }
              />
            </label>
          </div>

          <div className="test-question-builder">
            {form.questions.map(
              (question, questionIndex) => (
                <section
                  className="test-question-card"
                  key={question.id}
                >
                  <div className="test-question-header">
                    <h3>
                      Вопрос{' '}
                      {questionIndex + 1}
                    </h3>

                    <button
                      type="button"
                      className="journal-delete"
                      onClick={() =>
                        removeQuestion(
                          questionIndex,
                        )
                      }
                    >
                      Удалить
                    </button>
                  </div>

                  <label className="form-group">
                    <span>Текст вопроса</span>

                    <textarea
                      value={question.text}
                      onChange={(event) =>
                        updateQuestion(
                          questionIndex,
                          'text',
                          event.target.value,
                        )
                      }
                      required
                    />
                  </label>

                  {question.options.map(
                    (
                      option,
                      optionIndex,
                    ) => (
                      <div
                        className="test-option-editor"
                        key={optionIndex}
                      >
                        <input
                          type="radio"
                          name={`correct-${question.id}`}
                          checked={
                            Number(
                              question.correctAnswer,
                            ) ===
                            optionIndex
                          }
                          onChange={() =>
                            updateQuestion(
                              questionIndex,
                              'correctAnswer',
                              optionIndex,
                            )
                          }
                        />

                        <input
                          value={option}
                          onChange={(event) =>
                            updateOption(
                              questionIndex,
                              optionIndex,
                              event.target
                                .value,
                            )
                          }
                          placeholder={`Вариант ${optionIndex + 1}`}
                          required
                        />
                      </div>
                    ),
                  )}
                </section>
              ),
            )}
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={addQuestion}
          >
            ＋ Добавить вопрос
          </button>

          <button
            className="primary-button"
            type="submit"
          >
            Создать тест
          </button>
        </form>

        <section className="content-card">
          <h2>Мои тесты</h2>

          <div className="teacher-tests-list">
            {tests.length === 0 && (
              <p className="empty-text">
                Тестов пока нет.
              </p>
            )}

            {tests.map((test) => {
              const attempts =
                getAttemptsByTest(
                  test.id,
                )

              return (
                <article
                  className={
                    selectedTestId ===
                    test.id
                      ? 'teacher-test-card active'
                      : 'teacher-test-card'
                  }
                  key={test.id}
                  onClick={() =>
                    setSelectedTestId(
                      test.id,
                    )
                  }
                >
                  <div>
                    <strong>
                      {test.title}
                    </strong>

                    <p>
                      {test.subject} ·{' '}
                      {test.className}
                    </p>

                    <span>
                      Вопросов:{' '}
                      {test.questions.length}
                      {' · '}
                      Прошли:{' '}
                      {attempts.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="journal-delete"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleDelete(test.id)
                    }}
                  >
                    Удалить
                  </button>
                </article>
              )
            })}
          </div>

          {selectedTest && (
            <div className="test-results-section">
              <h2>
                Результаты: {
                  selectedTest.title
                }
              </h2>

              <p>
                Средний результат:{' '}
                <strong>
                  {getAverageTestResult(
                    selectedAttempts,
                  )}
                  %
                </strong>
              </p>

              <div className="test-results-list">
                {selectedAttempts.length ===
                  0 && (
                  <p className="empty-text">
                    Пока никто не прошёл
                    тест.
                  </p>
                )}

                {selectedAttempts.map(
                  (attempt) => (
                    <div
                      className="test-result-item"
                      key={attempt.id}
                    >
                      <div>
                        <strong>
                          {
                            attempt.studentName
                          }
                        </strong>

                        <p>
                          {
                            attempt.correctAnswers
                          }
                          /{
                            attempt.totalQuestions
                          } правильных
                        </p>
                      </div>

                      <span>
                        {
                          attempt.percentage
                        }
                        %
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default TeacherTestsPage