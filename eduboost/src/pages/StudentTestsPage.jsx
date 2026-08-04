import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Award,
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileQuestion,
  GraduationCap,
  Play,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

import {
  canStudentAttempt,
  getStudentTestAttempts,
  getStudentTests,
} from '../services/testService'

const filters = [
  {
    value: 'all',
    label: 'Все тесты',
  },
  {
    value: 'available',
    label: 'Доступные',
  },
  {
    value: 'completed',
    label: 'Пройденные',
  },
  {
    value: 'closed',
    label: 'Без попыток',
  },
]

function StudentTestsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [filter, setFilter] =
    useState('all')

  const [search, setSearch] =
    useState('')

  const tests = useMemo(() => {
    if (!user) {
      return []
    }

    return getStudentTests(user)
  }, [user])

  const testItems = useMemo(() => {
    if (!user?.id) {
      return []
    }

    return tests.map((test) => {
      const attempts =
        getStudentTestAttempts(
          user.id,
          test.id,
        )

      const bestResult =
        attempts.length > 0
          ? Math.max(
              ...attempts.map(
                (attempt) =>
                  Number(
                    attempt.percentage || 0,
                  ),
              ),
            )
          : null

      const canAttempt =
        canStudentAttempt(
          user.id,
          test,
        )

      return {
        test,
        attempts,
        bestResult,
        canAttempt,
      }
    })
  }, [tests, user?.id])

  const filteredTests = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase()

    return testItems.filter((item) => {
      const { test, attempts, canAttempt } =
        item

      const searchableText = [
        test.title,
        test.subject,
        test.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(
          normalizedSearch,
        )

      const matchesFilter =
        filter === 'all' ||
        (filter === 'available' &&
          canAttempt) ||
        (filter === 'completed' &&
          attempts.length > 0) ||
        (filter === 'closed' &&
          !canAttempt)

      return (
        matchesSearch &&
        matchesFilter
      )
    })
  }, [testItems, search, filter])

  const statistics = useMemo(() => {
    const completedTests =
      testItems.filter(
        (item) =>
          item.attempts.length > 0,
      )

    const availableTests =
      testItems.filter(
        (item) => item.canAttempt,
      )

    const results =
      completedTests
        .map(
          (item) =>
            item.bestResult,
        )
        .filter(
          (result) =>
            result !== null,
        )

    const averageResult =
      results.length > 0
        ? Math.round(
            results.reduce(
              (sum, result) =>
                sum + result,
              0,
            ) / results.length,
          )
        : 0

    const excellentResults =
      results.filter(
        (result) =>
          result >= 80,
      ).length

    return {
      total: testItems.length,
      completed:
        completedTests.length,
      available:
        availableTests.length,
      averageResult,
      excellentResults,
    }
  }, [testItems])

  if (!user) {
    return null
  }

  if (user.role !== 'Ученик') {
    return (
      <div className="student-tests-page">
        <section className="student-tests-access">
          <div>
            <ShieldCheck size={34} />
          </div>

          <h1>Доступ запрещён</h1>

          <p>
            Этот раздел предназначен
            только для учеников.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="student-tests-page">
      <TestsHeader />

      <TestsHero
        statistics={statistics}
      />

      <TestsStats
        statistics={statistics}
      />

      <TestsFilters
        filter={filter}
        setFilter={setFilter}
        search={search}
        setSearch={setSearch}
        testItems={testItems}
      />

      <section className="student-tests-section">
        <div className="student-tests-section-heading">
          <div>
            <p>Учебные проверки</p>
            <h2>Мои тесты</h2>
          </div>

          <span>
            {filteredTests.length}
          </span>
        </div>

        {filteredTests.length === 0 ? (
          <TestsEmptyState />
        ) : (
          <div className="student-tests-modern-grid">
            {filteredTests.map(
              (item) => (
                <TestCard
                  key={item.test.id}
                  item={item}
                  onOpen={() =>
                    navigate(
                      `/tests/${item.test.id}`,
                    )
                  }
                />
              ),
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function TestsHeader() {
  return (
    <header className="student-tests-header">
      <div className="student-tests-header-icon">
        <BookOpenCheck size={28} />
      </div>

      <div>
        <p>Проверка знаний</p>

        <h1>Мои тесты</h1>

        <span>
          Проходите учебные тесты,
          улучшайте результаты и
          зарабатывайте баллы.
        </span>
      </div>
    </header>
  )
}

function TestsHero({
  statistics,
}) {
  return (
    <section className="student-tests-hero">
      <div className="student-tests-hero-content">
        <div className="student-tests-hero-label">
          <Sparkles size={16} />
          Ваш прогресс
        </div>

        <h2>
          {statistics.completed > 0
            ? `${statistics.completed} тестов пройдено`
            : 'Начните проходить тесты'}
        </h2>

        <p>
          Каждый тест помогает проверить
          знания, закрепить материал и
          получить дополнительные баллы.
        </p>

        <div className="student-tests-hero-meta">
          <span>
            <FileQuestion size={17} />
            Всего тестов:{' '}
            {statistics.total}
          </span>

          <span>
            <Play size={17} />
            Доступно:{' '}
            {statistics.available}
          </span>

          <span>
            <BarChart3 size={17} />
            Средний результат:{' '}
            {statistics.averageResult}%
          </span>
        </div>
      </div>

      <div className="student-tests-hero-badge">
        <Trophy size={39} />

        <strong>
          {statistics.averageResult}%
        </strong>

        <span>
          средний результат
        </span>
      </div>
    </section>
  )
}

function TestsStats({
  statistics,
}) {
  const items = [
    {
      label: 'Всего тестов',
      value: statistics.total,
      icon: FileQuestion,
      className:
        'student-test-stat--blue',
    },
    {
      label: 'Пройдено',
      value: statistics.completed,
      icon: CheckCircle2,
      className:
        'student-test-stat--green',
    },
    {
      label: 'Доступно',
      value: statistics.available,
      icon: Play,
      className:
        'student-test-stat--purple',
    },
    {
      label: 'Средний результат',
      value: `${statistics.averageResult}%`,
      icon: BarChart3,
      className:
        'student-test-stat--gold',
    },
    {
      label: 'Результатов 80%+',
      value:
        statistics.excellentResults,
      icon: Award,
      className:
        'student-test-stat--orange',
    },
  ]

  return (
    <section className="student-tests-stats">
      {items.map((item) => {
        const Icon = item.icon

        return (
          <article
            key={item.label}
            className={`student-test-stat-card ${item.className}`}
          >
            <div>
              <Icon size={21} />
            </div>

            <span>
              <strong>
                {item.value}
              </strong>

              <small>
                {item.label}
              </small>
            </span>
          </article>
        )
      })}
    </section>
  )
}

function TestsFilters({
  filter,
  setFilter,
  search,
  setSearch,
  testItems,
}) {
  function getFilterCount(value) {
    if (value === 'all') {
      return testItems.length
    }

    if (value === 'available') {
      return testItems.filter(
        (item) => item.canAttempt,
      ).length
    }

    if (value === 'completed') {
      return testItems.filter(
        (item) =>
          item.attempts.length > 0,
      ).length
    }

    return testItems.filter(
      (item) => !item.canAttempt,
    ).length
  }

  return (
    <section className="student-tests-filters">
      <label className="student-tests-search">
        <Search size={18} />

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="Найти тест или предмет..."
        />
      </label>

      <div className="student-tests-filter-buttons">
        {filters.map((item) => (
          <button
            type="button"
            key={item.value}
            className={
              filter === item.value
                ? 'student-test-filter student-test-filter--active'
                : 'student-test-filter'
            }
            onClick={() =>
              setFilter(item.value)
            }
          >
            <span>{item.label}</span>

            <small>
              {getFilterCount(
                item.value,
              )}
            </small>
          </button>
        ))}
      </div>
    </section>
  )
}

function TestCard({
  item,
  onOpen,
}) {
  const {
    test,
    attempts,
    bestResult,
    canAttempt,
  } = item

  const maxAttempts = Number(
    test.maxAttempts || 1,
  )

  const attemptsLeft = Math.max(
    maxAttempts - attempts.length,
    0,
  )

  const questionsCount =
    Array.isArray(test.questions)
      ? test.questions.length
      : 0

  const rewardPoints = Number(
    test.rewardPoints || 0,
  )

  const rewardXp = Number(
    test.rewardXp || 0,
  )

  const resultData =
    getResultData(bestResult)

  const ResultIcon =
    resultData.icon

  return (
    <article className="student-test-modern-card">
      <div className="student-test-card-cover">
        <div className="student-test-card-icon">
          <FileQuestion size={33} />
        </div>

        <span>
          <GraduationCap size={14} />
          {test.subject ||
            'Учебный тест'}
        </span>
      </div>

      <div className="student-test-card-body">
        <div className="student-test-card-status-row">
          <span
            className={
              canAttempt
                ? 'student-test-status student-test-status--available'
                : 'student-test-status student-test-status--closed'
            }
          >
            {canAttempt ? (
              <Play size={14} />
            ) : (
              <XCircle size={14} />
            )}

            {canAttempt
              ? 'Доступен'
              : 'Попытки закончились'}
          </span>

          {bestResult !== null && (
            <span
              className={`student-test-result-badge ${resultData.className}`}
            >
              <ResultIcon size={14} />

              {bestResult}%
            </span>
          )}
        </div>

        <h3>{test.title}</h3>

        <p className="student-test-card-description">
          {test.description ||
            'Проверьте свои знания по этому предмету.'}
        </p>

        <div className="student-test-info-grid">
          <TestInfo
            icon={FileQuestion}
            label="Вопросов"
            value={questionsCount}
          />

          <TestInfo
            icon={RefreshCcw}
            label="Попыток"
            value={`${attempts.length}/${maxAttempts}`}
          />

          <TestInfo
            icon={Star}
            label="Баллы"
            value={rewardPoints}
          />

          <TestInfo
            icon={Zap}
            label="Опыт"
            value={rewardXp}
          />
        </div>

        {test.deadline && (
          <div className="student-test-deadline">
            <CalendarClock size={17} />

            <span>
              <small>
                Срок прохождения
              </small>

              <strong>
                {formatDeadline(
                  test.deadline,
                )}
              </strong>
            </span>
          </div>
        )}

        {bestResult !== null && (
          <div className="student-test-best-result">
            <div>
              <Target size={18} />
            </div>

            <span>
              <small>
                Лучший результат
              </small>

              <strong>
                {bestResult}%
              </strong>
            </span>

            <div className="student-test-result-progress">
              <span
                style={{
                  width: `${Math.min(
                    bestResult,
                    100,
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="student-test-card-footer">
          <div>
            <Clock3 size={16} />

            <span>
              {canAttempt
                ? `Осталось попыток: ${attemptsLeft}`
                : 'Попыток больше нет'}
            </span>
          </div>

          <button
            type="button"
            disabled={!canAttempt}
            onClick={onOpen}
          >
            {canAttempt ? (
              <>
                {attempts.length > 0 ? (
                  <RefreshCcw size={17} />
                ) : (
                  <Play size={17} />
                )}

                {attempts.length > 0
                  ? 'Пройти ещё раз'
                  : 'Начать тест'}
              </>
            ) : (
              <>
                <XCircle size={17} />
                Недоступно
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}

function TestInfo({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="student-test-info">
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

function TestsEmptyState() {
  return (
    <div className="student-tests-empty">
      <div>
        <FileQuestion size={32} />
      </div>

      <h2>Тесты не найдены</h2>

      <p>
        Учитель пока не назначил тесты
        или выбранные фильтры ничего не
        нашли.
      </p>
    </div>
  )
}

function getResultData(result) {
  if (result === null) {
    return {
      icon: Clock3,
      className:
        'student-result--empty',
    }
  }

  if (result >= 80) {
    return {
      icon: Trophy,
      className:
        'student-result--excellent',
    }
  }

  if (result >= 60) {
    return {
      icon: CheckCircle2,
      className:
        'student-result--good',
    }
  }

  return {
    icon: Target,
    className:
      'student-result--low',
  }
}

function formatDeadline(value) {
  if (!value) {
    return 'Не указан'
  }

  const date = new Date(
    `${value}T12:00:00`,
  )

  if (
    Number.isNaN(date.getTime())
  ) {
    return value
  }

  return date.toLocaleDateString(
    'ru-RU',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    },
  )
}

export default StudentTestsPage