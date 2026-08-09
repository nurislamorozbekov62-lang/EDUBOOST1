import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Coins,
  Filter,
  GraduationCap,
  Layers3,
  LockKeyhole,
  Play,
  Search,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

import {
  enrollInCourse,
  getPublishedCourses,
  getStudentAllCourseProgress,
} from '../services/courseService'

const courseFilters = [
  {
    value: 'all',
    label: 'Все курсы',
  },
  {
    value: 'enrolled',
    label: 'Мои курсы',
  },
  {
    value: 'free',
    label: 'Бесплатные',
  },
  {
    value: 'paid',
    label: 'Платные',
  },
  {
    value: 'completed',
    label: 'Завершённые',
  },
]

function StudentCoursesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [courses, setCourses] = useState([])
  const [progressList, setProgressList] =
    useState([])
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] =
    useState('Все')
  const [courseFilter, setCourseFilter] =
    useState('all')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [enrollingId, setEnrollingId] =
    useState(null)

  function loadData() {
    setCourses(getPublishedCourses())

    if (user?.id) {
      setProgressList(
        getStudentAllCourseProgress(user.id),
      )
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  const subjects = useMemo(() => {
    const uniqueSubjects = Array.from(
      new Set(
        courses
          .map((course) => course.subject)
          .filter(Boolean),
      ),
    )

    return ['Все', ...uniqueSubjects]
  }, [courses])

  const courseItems = useMemo(() => {
    return courses.map((course) => {
      const progress = progressList.find(
        (item) =>
          item.courseId === course.id,
      )

      return {
        course,
        progress,
        isEnrolled: Boolean(progress),
      }
    })
  }, [courses, progressList])

  const filteredCourses = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase()

    return courseItems.filter((item) => {
      const {
        course,
        progress,
        isEnrolled,
      } = item

      const searchableText = [
        course.title,
        course.description,
        course.teacherName,
        course.subject,
        course.level,
        course.className,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(
          normalizedSearch,
        )

      const matchesSubject =
        subjectFilter === 'Все' ||
        course.subject === subjectFilter

      const matchesCourseFilter =
        courseFilter === 'all' ||
        (courseFilter === 'enrolled' &&
          isEnrolled) ||
        (courseFilter === 'free' &&
          course.accessType !== 'paid') ||
        (courseFilter === 'paid' &&
          course.accessType === 'paid') ||
        (courseFilter === 'completed' &&
          progress?.status === 'completed')

      return (
        matchesSearch &&
        matchesSubject &&
        matchesCourseFilter
      )
    })
  }, [
    courseItems,
    search,
    subjectFilter,
    courseFilter,
  ])

  const statistics = useMemo(() => {
    const enrolledCourses =
      courseItems.filter(
        (item) => item.isEnrolled,
      )

    const completedCourses =
      courseItems.filter(
        (item) =>
          item.progress?.status ===
          'completed',
      )

    const activeCourses =
      enrolledCourses.filter(
        (item) =>
          item.progress?.status !==
          'completed',
      )

    const progressValues =
      enrolledCourses.map((item) =>
        Number(
          item.progress?.progressPercent || 0,
        ),
      )

    const averageProgress =
      progressValues.length > 0
        ? Math.round(
            progressValues.reduce(
              (sum, value) =>
                sum + value,
              0,
            ) /
              progressValues.length,
          )
        : 0

    return {
      total: courseItems.length,
      enrolled: enrolledCourses.length,
      active: activeCourses.length,
      completed:
        completedCourses.length,
      averageProgress,
    }
  }, [courseItems])

  function handleEnroll(course) {
    setMessage('')
    setError('')

    if (course.accessType === 'paid') {
      setError(
        'Оплата платных курсов пока не подключена.',
      )
      return
    }

    try {
      setEnrollingId(course.id)

      enrollInCourse(course.id)
      loadData()

      setMessage(
        `Вы успешно записались на курс «${course.title}».`,
      )

      navigate(`/courses/${course.id}`)
    } catch (enrollError) {
      setError(
        enrollError.message ||
          'Не удалось записаться на курс',
      )
    } finally {
      setEnrollingId(null)
    }
  }

  if (!user) {
    return null
  }

  if (user.role !== 'Ученик') {
    return (
      <div className="student-courses-page">
        <section className="student-courses-access">
          <div>
            <GraduationCap size={36} />
          </div>

          <h1>Доступ запрещён</h1>

          <p>
            Каталог учебных курсов доступен
            только ученикам.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="student-courses-page">
      <CoursesHeader />

      <CoursesHero
        statistics={statistics}
      />

      {message && (
        <div className="student-courses-alert student-courses-alert--success">
          <CheckCircle2 size={19} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="student-courses-alert student-courses-alert--error">
          <XCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      <CoursesStats
        statistics={statistics}
      />

      <CoursesFilters
        search={search}
        setSearch={setSearch}
        subjectFilter={subjectFilter}
        setSubjectFilter={
          setSubjectFilter
        }
        subjects={subjects}
        courseFilter={courseFilter}
        setCourseFilter={
          setCourseFilter
        }
        courseItems={courseItems}
      />

      <section className="student-courses-section">
        <div className="student-courses-section-heading">
          <div>
            <p>Каталог обучения</p>
            <h2>Учебные курсы</h2>
          </div>

          <span>
            {filteredCourses.length}
          </span>
        </div>

        {filteredCourses.length === 0 ? (
          <CoursesEmptyState />
        ) : (
          <div className="student-courses-grid">
            {filteredCourses.map(
              (item) => (
                <CourseCard
                  key={item.course.id}
                  item={item}
                  enrollingId={
                    enrollingId
                  }
                  onOpen={() =>
                    navigate(
                      `/courses/${item.course.id}`,
                    )
                  }
                  onEnroll={() =>
                    handleEnroll(
                      item.course,
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

function CoursesHeader() {
  return (
    <header className="student-courses-header">
      <div className="student-courses-header-icon">
        <GraduationCap size={28} />
      </div>

      <div>
        <p>Онлайн-обучение</p>

        <h1>Учебные курсы</h1>

        <span>
          Изучайте новые темы, проходите
          уроки и отслеживайте свой
          прогресс.
        </span>
      </div>
    </header>
  )
}

function CoursesHero({
  statistics,
}) {
  return (
    <section className="student-courses-hero">
      <div className="student-courses-hero-content">
        <div className="student-courses-hero-label">
          <Sparkles size={16} />
          Ваше обучение
        </div>

        <h2>
          {statistics.active > 0
            ? `${statistics.active} активных курсов`
            : 'Начните новый курс'}
        </h2>

        <p>
          Продолжайте обучение, открывайте
          новые уроки и завершайте курсы.
        </p>

        <div className="student-courses-hero-meta">
          <span>
            <BookOpen size={17} />
            Всего курсов:{' '}
            {statistics.total}
          </span>

          <span>
            <Play size={17} />
            Записано:{' '}
            {statistics.enrolled}
          </span>

          <span>
            <Trophy size={17} />
            Завершено:{' '}
            {statistics.completed}
          </span>
        </div>
      </div>

      <div className="student-courses-hero-badge">
        <Layers3 size={40} />

        <strong>
          {statistics.averageProgress}%
        </strong>

        <span>
          средний прогресс
        </span>
      </div>
    </section>
  )
}

function CoursesStats({
  statistics,
}) {
  const items = [
    {
      label: 'Всего курсов',
      value: statistics.total,
      icon: BookOpen,
      className:
        'student-course-stat--blue',
    },
    {
      label: 'Мои курсы',
      value: statistics.enrolled,
      icon: GraduationCap,
      className:
        'student-course-stat--purple',
    },
    {
      label: 'Активные',
      value: statistics.active,
      icon: Play,
      className:
        'student-course-stat--green',
    },
    {
      label: 'Завершённые',
      value: statistics.completed,
      icon: Trophy,
      className:
        'student-course-stat--gold',
    },
    {
      label: 'Средний прогресс',
      value: `${statistics.averageProgress}%`,
      icon: Star,
      className:
        'student-course-stat--orange',
    },
  ]

  return (
    <section className="student-courses-stats">
      {items.map((item) => {
        const Icon = item.icon

        return (
          <article
            key={item.label}
            className={`student-course-stat-card ${item.className}`}
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

function CoursesFilters({
  search,
  setSearch,
  subjectFilter,
  setSubjectFilter,
  subjects,
  courseFilter,
  setCourseFilter,
  courseItems,
}) {
  function getFilterCount(value) {
    if (value === 'all') {
      return courseItems.length
    }

    if (value === 'enrolled') {
      return courseItems.filter(
        (item) => item.isEnrolled,
      ).length
    }

    if (value === 'free') {
      return courseItems.filter(
        (item) =>
          item.course.accessType !==
          'paid',
      ).length
    }

    if (value === 'paid') {
      return courseItems.filter(
        (item) =>
          item.course.accessType ===
          'paid',
      ).length
    }

    return courseItems.filter(
      (item) =>
        item.progress?.status ===
        'completed',
    ).length
  }

  return (
    <section className="student-courses-filters">
      <div className="student-courses-search-row">
        <label className="student-courses-search">
          <Search size={18} />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Найти курс, предмет или учителя..."
          />
        </label>

        <label className="student-courses-select">
          <Filter size={17} />

          <select
            value={subjectFilter}
            onChange={(event) =>
              setSubjectFilter(
                event.target.value,
              )
            }
          >
            {subjects.map(
              (subject) => (
                <option
                  key={subject}
                  value={subject}
                >
                  {subject}
                </option>
              ),
            )}
          </select>
        </label>
      </div>

      <div className="student-courses-filter-buttons">
        {courseFilters.map(
          (item) => (
            <button
              type="button"
              key={item.value}
              className={
                courseFilter ===
                item.value
                  ? 'student-course-filter student-course-filter--active'
                  : 'student-course-filter'
              }
              onClick={() =>
                setCourseFilter(
                  item.value,
                )
              }
            >
              <span>{item.label}</span>

              <small>
                {getFilterCount(
                  item.value,
                )}
              </small>
            </button>
          ),
        )}
      </div>
    </section>
  )
}

function CourseCard({
  item,
  enrollingId,
  onOpen,
  onEnroll,
}) {
  const {
    course,
    progress,
    isEnrolled,
  } = item

  const isPaid =
    course.accessType === 'paid'

  const progressPercent = Math.min(
    Math.max(
      Number(
        progress?.progressPercent || 0,
      ),
      0,
    ),
    100,
  )

  const isCompleted =
    progress?.status === 'completed'

  const isEnrolling =
    enrollingId === course.id

  const lessonsCount =
    Array.isArray(course.lessons)
      ? course.lessons.length
      : 0

  return (
    <article className="student-course-card">
      <div className="student-course-card-cover">
        <div className="student-course-card-icon">
          <BookOpen size={35} />
        </div>

        <span
          className={
            isPaid
              ? 'student-course-price student-course-price--paid'
              : 'student-course-price student-course-price--free'
          }
        >
          {isPaid ? (
            <>
              <Coins size={14} />
              {Number(
                course.price || 0,
              ).toLocaleString(
                'ru-RU',
              )}{' '}
              сом
            </>
          ) : (
            <>
              <CheckCircle2 size={14} />
              Бесплатно
            </>
          )}
        </span>
      </div>

      <div className="student-course-card-body">
        <div className="student-course-card-labels">
          <span>
            {course.subject ||
              'Учебный курс'}
          </span>

          {isEnrolled && (
            <span
              className={
                isCompleted
                  ? 'student-course-enrolled student-course-enrolled--completed'
                  : 'student-course-enrolled'
              }
            >
              {isCompleted
                ? 'Завершён'
                : 'Вы записаны'}
            </span>
          )}
        </div>

        <h3>{course.title}</h3>

        <p>
          {course.description ||
            'Описание курса не указано.'}
        </p>

        <div className="student-course-info-grid">
          <CourseInfo
            icon={GraduationCap}
            label="Уровень"
            value={
              course.level ||
              'Не указан'
            }
          />

          <CourseInfo
            icon={UserRound}
            label="Класс"
            value={
              course.className ||
              'Для всех'
            }
          />

          <CourseInfo
            icon={BookOpen}
            label="Уроков"
            value={lessonsCount}
          />

          <CourseInfo
            icon={Users}
            label="Учеников"
            value={Number(
              course.studentsCount || 0,
            )}
          />
        </div>

        <div className="student-course-teacher">
          <div>
            <UserRound size={18} />
          </div>

          <span>
            <small>Преподаватель</small>

            <strong>
              {course.teacherName ||
                'Учитель не указан'}
            </strong>
          </span>
        </div>

        {isEnrolled && (
          <div className="student-course-progress">
            <div>
              <span>
                Прогресс курса
              </span>

              <strong>
                {progressPercent}%
              </strong>
            </div>

            <div>
              <span
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={isEnrolling}
          className={
            isPaid && !isEnrolled
              ? 'student-course-button student-course-button--paid'
              : 'student-course-button'
          }
          onClick={
            isEnrolled
              ? onOpen
              : onEnroll
          }
        >
          {isEnrolling ? (
            <>
              <Play size={17} />
              Записываем...
            </>
          ) : isEnrolled ? (
            <>
              {isCompleted ? (
                <Trophy size={17} />
              ) : (
                <Play size={17} />
              )}

              {isCompleted
                ? 'Посмотреть курс'
                : 'Продолжить обучение'}

              <ArrowRight size={17} />
            </>
          ) : isPaid ? (
            <>
              <LockKeyhole size={17} />
              Купить курс
            </>
          ) : (
            <>
              <GraduationCap size={17} />
              Записаться бесплатно
            </>
          )}
        </button>
      </div>
    </article>
  )
}

function CourseInfo({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="student-course-info">
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

function CoursesEmptyState() {
  return (
    <div className="student-courses-empty">
      <div>
        <BookOpen size={33} />
      </div>

      <h2>Курсы не найдены</h2>

      <p>
        Учителя пока не опубликовали
        подходящие курсы или выбранные
        фильтры ничего не нашли.
      </p>
    </div>
  )
}

export default StudentCoursesPage