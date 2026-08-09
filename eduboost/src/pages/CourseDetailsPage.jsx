import { useEffect, useMemo, useState } from 'react'
import {
  useNavigate,
  useParams,
} from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Coins,
  FileText,
  GraduationCap,
  Languages,
  Layers3,
  LockKeyhole,
  Play,
  School,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  Users,
  XCircle,
  Zap,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

import {
  canOpenLesson,
  enrollInCourse,
  getCourseById,
  getStudentCourseProgress,
} from '../services/courseService'

function CourseDetailsPage() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [course, setCourse] =
    useState(null)

  const [progress, setProgress] =
    useState(null)

  const [error, setError] =
    useState('')

  const [isEnrolling, setIsEnrolling] =
    useState(false)

  function loadData() {
    const foundCourse =
      getCourseById(courseId)

    setCourse(foundCourse || null)

    if (user?.id) {
      setProgress(
        getStudentCourseProgress(
          user.id,
          courseId,
        ),
      )
    }
  }

  useEffect(() => {
    loadData()
  }, [courseId, user?.id])

  const sortedLessons = useMemo(() => {
    if (
      !Array.isArray(course?.lessons)
    ) {
      return []
    }

    return [...course.lessons].sort(
      (firstLesson, secondLesson) =>
        Number(firstLesson.order || 0) -
        Number(secondLesson.order || 0),
    )
  }, [course])

  const completedIds =
    progress?.completedLessonIds || []

  const progressPercent = Math.min(
    Math.max(
      Number(
        progress?.progressPercent || 0,
      ),
      0,
    ),
    100,
  )

  const completedLessons =
    completedIds.length

  const totalDuration =
    sortedLessons.reduce(
      (sum, lesson) =>
        sum +
        Number(lesson.duration || 0),
      0,
    )

  const totalPoints =
    sortedLessons.reduce(
      (sum, lesson) =>
        sum +
        Number(
          lesson.pointsReward || 0,
        ),
      0,
    )

  const totalXp =
    sortedLessons.reduce(
      (sum, lesson) =>
        sum +
        Number(
          lesson.xpReward || 0,
        ),
      0,
    )

  function handleEnroll() {
    setError('')

    if (!course) {
      return
    }

    if (course.accessType === 'paid') {
      setError(
        'Оплата платных курсов пока не подключена.',
      )
      return
    }

    try {
      setIsEnrolling(true)

      enrollInCourse(course.id)
      loadData()
    } catch (enrollError) {
      setError(
        enrollError.message ||
          'Не удалось записаться на курс',
      )
    } finally {
      setIsEnrolling(false)
    }
  }

  function handleOpenLesson(lesson) {
    setError('')

    if (!course || !user) {
      return
    }

    if (user.role === 'Учитель') {
      navigate(
        `/courses/${course.id}/lessons/${lesson.id}`,
      )
      return
    }

    if (!progress) {
      setError(
        'Сначала запишитесь на этот курс.',
      )
      return
    }

    const allowed = canOpenLesson(
      course.id,
      lesson.id,
      user.id,
    )

    if (!allowed) {
      setError(
        'Сначала завершите предыдущий урок.',
      )
      return
    }

    navigate(
      `/courses/${course.id}/lessons/${lesson.id}`,
    )
  }

  if (!user) {
    return null
  }

  if (!course) {
    return (
      <CourseState
        icon={BookOpen}
        title="Курс не найден"
        text="Возможно, курс был удалён или ссылка указана неправильно."
        buttonText="Вернуться к курсам"
        onClick={() =>
          navigate('/courses')
        }
      />
    )
  }

  return (
    <div className="course-details-page">
      <button
        type="button"
        className="course-details-back"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={18} />
        Назад к курсам
      </button>

      {error && (
        <div className="course-details-alert">
          <XCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      <CourseHero
        course={course}
        progress={progress}
        progressPercent={
          progressPercent
        }
        lessonsCount={
          sortedLessons.length
        }
        totalDuration={
          totalDuration
        }
        isEnrolling={isEnrolling}
        onEnroll={handleEnroll}
      />

      <CourseStats
        lessonsCount={
          sortedLessons.length
        }
        completedLessons={
          completedLessons
        }
        totalDuration={totalDuration}
        totalPoints={totalPoints}
        totalXp={totalXp}
      />

      {user.role === 'Ученик' &&
        progress && (
          <CourseProgress
            progress={progress}
            progressPercent={
              progressPercent
            }
            completedLessons={
              completedLessons
            }
            lessonsCount={
              sortedLessons.length
            }
          />
        )}

      <section className="course-lessons-section">
        <div className="course-lessons-heading">
          <div>
            <p>Программа обучения</p>
            <h2>Содержание курса</h2>
          </div>

          <span>
            {sortedLessons.length}
          </span>
        </div>

        {sortedLessons.length === 0 ? (
          <CourseLessonsEmpty />
        ) : (
          <div className="course-lessons-list">
            {sortedLessons.map(
              (lesson, index) => {
                const completed =
                  completedIds.includes(
                    lesson.id,
                  )

                const unlocked =
                  user.role ===
                    'Учитель' ||
                  lesson.isPreview ||
                  Boolean(
                    progress &&
                      canOpenLesson(
                        course.id,
                        lesson.id,
                        user.id,
                      ),
                  )

                return (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    index={index}
                    completed={
                      completed
                    }
                    unlocked={unlocked}
                    onOpen={() =>
                      handleOpenLesson(
                        lesson,
                      )
                    }
                  />
                )
              },
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function CourseHero({
  course,
  progress,
  progressPercent,
  lessonsCount,
  totalDuration,
  isEnrolling,
  onEnroll,
}) {
  const isPaid =
    course.accessType === 'paid'

  return (
    <section className="course-details-hero">
      <div className="course-details-hero-main">
        <div className="course-details-hero-label">
          <Sparkles size={16} />
          Учебный курс
        </div>

        <h1>{course.title}</h1>

        <p>
          {course.description ||
            'Описание курса не указано.'}
        </p>

        <div className="course-details-tags">
          {course.subject && (
            <span>
              <BookOpen size={15} />
              {course.subject}
            </span>
          )}

          {course.level && (
            <span>
              <GraduationCap
                size={15}
              />
              {course.level}
            </span>
          )}

          {course.className && (
            <span>
              <School size={15} />
              {course.className}
            </span>
          )}

          {course.language && (
            <span>
              <Languages size={15} />
              {course.language}
            </span>
          )}
        </div>

        <div className="course-details-meta">
          <span>
            <UserRound size={17} />
            {course.teacherName ||
              'Учитель не указан'}
          </span>

          <span>
            <BookOpen size={17} />
            {lessonsCount} уроков
          </span>

          <span>
            <Clock3 size={17} />
            {formatDuration(
              totalDuration,
            )}
          </span>

          <span>
            <Users size={17} />
            {Number(
              course.studentsCount || 0,
            )}{' '}
            учеников
          </span>
        </div>
      </div>

      <div className="course-details-hero-side">
        <div className="course-details-cover-icon">
          <Layers3 size={48} />
        </div>

        {progress ? (
          <>
            <span>
              Ваш прогресс
            </span>

            <strong>
              {progressPercent}%
            </strong>

            <div>
              <span
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>
          </>
        ) : (
          <>
            <span>
              Стоимость курса
            </span>

            <strong>
              {isPaid
                ? `${Number(
                    course.price || 0,
                  ).toLocaleString(
                    'ru-RU',
                  )} сом`
                : 'Бесплатно'}
            </strong>
          </>
        )}

        {!progress && (
          <button
            type="button"
            disabled={isEnrolling}
            onClick={onEnroll}
          >
            {isPaid ? (
              <LockKeyhole size={18} />
            ) : (
              <GraduationCap
                size={18}
              />
            )}

            {isEnrolling
              ? 'Записываем...'
              : isPaid
                ? 'Купить курс'
                : 'Записаться на курс'}
          </button>
        )}
      </div>
    </section>
  )
}

function CourseStats({
  lessonsCount,
  completedLessons,
  totalDuration,
  totalPoints,
  totalXp,
}) {
  const items = [
    {
      label: 'Всего уроков',
      value: lessonsCount,
      icon: BookOpen,
      className:
        'course-detail-stat--blue',
    },
    {
      label: 'Завершено',
      value: completedLessons,
      icon: CheckCircle2,
      className:
        'course-detail-stat--green',
    },
    {
      label: 'Длительность',
      value: formatDuration(
        totalDuration,
      ),
      icon: Clock3,
      className:
        'course-detail-stat--purple',
    },
    {
      label: 'Баллов в курсе',
      value: totalPoints,
      icon: Coins,
      className:
        'course-detail-stat--gold',
    },
    {
      label: 'Опыта в курсе',
      value: `${totalXp} XP`,
      icon: Zap,
      className:
        'course-detail-stat--orange',
    },
  ]

  return (
    <section className="course-details-stats">
      {items.map((item) => {
        const Icon = item.icon

        return (
          <article
            key={item.label}
            className={`course-detail-stat-card ${item.className}`}
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

function CourseProgress({
  progress,
  progressPercent,
  completedLessons,
  lessonsCount,
}) {
  const isCompleted =
    progress.status === 'completed'

  return (
    <section className="course-progress-card">
      <div className="course-progress-card-icon">
        {isCompleted ? (
          <Trophy size={28} />
        ) : (
          <Star size={28} />
        )}
      </div>

      <div className="course-progress-card-main">
        <div className="course-progress-title">
          <div>
            <p>
              {isCompleted
                ? 'Курс завершён'
                : 'Ваш прогресс'}
            </p>

            <h2>
              {completedLessons} из{' '}
              {lessonsCount} уроков
            </h2>
          </div>

          <strong>
            {progressPercent}%
          </strong>
        </div>

        <div className="course-progress-bar">
          <span
            style={{
              width: `${progressPercent}%`,
            }}
          />
        </div>

        <div className="course-progress-rewards">
          <span>
            <Coins size={16} />
            Получено:{' '}
            {Number(
              progress.earnedPoints || 0,
            )}{' '}
            баллов
          </span>

          <span>
            <Zap size={16} />
            Получено:{' '}
            {Number(
              progress.earnedXp || 0,
            )}{' '}
            XP
          </span>
        </div>
      </div>
    </section>
  )
}

function LessonCard({
  lesson,
  index,
  completed,
  unlocked,
  onOpen,
}) {
  const attachmentsCount =
    Array.isArray(lesson.attachments)
      ? lesson.attachments.length
      : 0

  return (
    <article
      className={[
        'course-lesson-card',
        completed
          ? 'course-lesson-card--completed'
          : '',
        !unlocked
          ? 'course-lesson-card--locked'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="course-lesson-number">
        {completed ? (
          <CheckCircle2 size={21} />
        ) : unlocked ? (
          index + 1
        ) : (
          <LockKeyhole size={19} />
        )}
      </div>

      <div className="course-lesson-main">
        <div className="course-lesson-title-row">
          <div>
            <span>
              Урок {index + 1}
            </span>

            <h3>{lesson.title}</h3>
          </div>

          <span
            className={
              completed
                ? 'course-lesson-status course-lesson-status--completed'
                : unlocked
                  ? 'course-lesson-status course-lesson-status--open'
                  : 'course-lesson-status course-lesson-status--locked'
            }
          >
            {completed
              ? 'Завершён'
              : unlocked
                ? 'Доступен'
                : 'Заблокирован'}
          </span>
        </div>

        {lesson.description && (
          <p>
            {lesson.description}
          </p>
        )}

        <div className="course-lesson-meta">
          <span>
            <Clock3 size={15} />
            {Number(
              lesson.duration || 0,
            )}{' '}
            мин
          </span>

          <span>
            <Coins size={15} />
            +
            {Number(
              lesson.pointsReward || 0,
            )}{' '}
            баллов
          </span>

          <span>
            <Zap size={15} />
            +
            {Number(
              lesson.xpReward || 0,
            )}{' '}
            XP
          </span>

          {attachmentsCount > 0 && (
            <span>
              <FileText size={15} />
              {attachmentsCount}{' '}
              файлов
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={!unlocked}
        onClick={onOpen}
      >
        {completed ? (
          <>
            <BookOpen size={17} />
            Посмотреть снова
          </>
        ) : unlocked ? (
          <>
            <Play size={17} />
            Открыть урок
            <ArrowRight size={17} />
          </>
        ) : (
          <>
            <LockKeyhole size={17} />
            Недоступно
          </>
        )}
      </button>
    </article>
  )
}

function CourseLessonsEmpty() {
  return (
    <div className="course-lessons-empty">
      <div>
        <BookOpen size={33} />
      </div>

      <h2>Уроков пока нет</h2>

      <p>
        Преподаватель ещё не добавил
        материалы в этот курс.
      </p>
    </div>
  )
}

function CourseState({
  icon: Icon,
  title,
  text,
  buttonText,
  onClick,
}) {
  return (
    <div className="course-details-page">
      <section className="course-details-state">
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

function formatDuration(minutes) {
  const totalMinutes = Number(
    minutes || 0,
  )

  if (totalMinutes < 60) {
    return `${totalMinutes} мин`
  }

  const hours = Math.floor(
    totalMinutes / 60,
  )

  const remainingMinutes =
    totalMinutes % 60

  return remainingMinutes > 0
    ? `${hours} ч ${remainingMinutes} мин`
    : `${hours} ч`
}

export default CourseDetailsPage