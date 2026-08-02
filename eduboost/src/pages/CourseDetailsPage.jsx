import { useEffect, useMemo, useState } from 'react'
import {
  useNavigate,
  useParams,
} from 'react-router-dom'
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

  const [course, setCourse] = useState(null)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')

  const loadData = () => {
    const foundCourse = getCourseById(courseId)
    setCourse(foundCourse)

    if (user?.id) {
      setProgress(
        getStudentCourseProgress(
          user.id,
          courseId
        )
      )
    }
  }

  useEffect(() => {
    loadData()
  }, [courseId, user?.id])

  const sortedLessons = useMemo(() => {
    if (!course?.lessons) {
      return []
    }

    return [...course.lessons].sort(
      (a, b) => a.order - b.order
    )
  }, [course])

  const handleEnroll = () => {
    setError('')

    try {
      if (course.accessType === 'paid') {
        throw new Error(
          'Оплата платных курсов пока не подключена'
        )
      }

      enrollInCourse(course.id)
      loadData()
    } catch (enrollError) {
      setError(
        enrollError.message ||
          'Не удалось записаться на курс'
      )
    }
  }

  const handleOpenLesson = (lesson) => {
    setError('')

    if (user.role === 'Учитель') {
      navigate(
        `/courses/${course.id}/lessons/${lesson.id}`
      )
      return
    }

    if (!progress) {
      setError(
        'Сначала запишитесь на этот курс'
      )
      return
    }

    const allowed = canOpenLesson(
      course.id,
      lesson.id,
      user.id
    )

    if (!allowed) {
      setError(
        'Сначала завершите предыдущий урок'
      )
      return
    }

    navigate(
      `/courses/${course.id}/lessons/${lesson.id}`
    )
  }

  if (!course) {
    return (
      <div className="page-container">
        <div className="content-card">
          <h1>Курс не найден</h1>

          <button
            type="button"
            className="primary-button"
            onClick={() => navigate('/courses')}
          >
            Вернуться к курсам
          </button>
        </div>
      </div>
    )
  }

  const completedIds =
    progress?.completedLessonIds || []

  return (
    <div className="page-container">
      <button
        type="button"
        className="secondary-button"
        onClick={() => navigate(-1)}
        style={{
          marginBottom: '16px',
        }}
      >
        ← Назад
      </button>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <section
        className="content-card"
        style={{
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '18px',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '70px',
            }}
          >
            {course.coverEmoji || '📘'}
          </span>

          <div
            style={{
              flex: 1,
              minWidth: '240px',
            }}
          >
            <h1>{course.title}</h1>

            <p
              style={{
                color: '#6b7280',
              }}
            >
              {course.description ||
                'Описание курса не указано.'}
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span className="badge">
                {course.subject}
              </span>

              <span className="badge">
                {course.level}
              </span>

              <span className="badge">
                {course.className}
              </span>

              <span className="badge">
                {course.language}
              </span>
            </div>

            <p>
              Учитель: <strong>{course.teacherName}</strong>
            </p>

            <p>
              Уроков:{' '}
              <strong>{sortedLessons.length}</strong>
              {' · '}
              Учеников:{' '}
              <strong>
                {course.studentsCount || 0}
              </strong>
            </p>
          </div>

          {user.role === 'Ученик' &&
            !progress && (
              <button
                type="button"
                className="primary-button"
                onClick={handleEnroll}
              >
                {course.accessType === 'paid'
                  ? `Купить за ${course.price} сом`
                  : 'Записаться на курс'}
              </button>
            )}
        </div>

        {user.role === 'Ученик' &&
          progress && (
            <div
              style={{
                marginTop: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '7px',
                }}
              >
                <strong>Прогресс курса</strong>

                <strong>
                  {progress.progressPercent || 0}%
                </strong>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '12px',
                  background: '#e5e7eb',
                  borderRadius: '999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${
                      progress.progressPercent || 0
                    }%`,
                    height: '100%',
                    background: '#4f46e5',
                  }}
                />
              </div>

              <p
                style={{
                  color: '#6b7280',
                  marginBottom: 0,
                }}
              >
                Получено за курс: +
                {progress.earnedPoints || 0} баллов и +
                {progress.earnedXp || 0} XP
              </p>
            </div>
          )}
      </section>

      <section className="content-card">
        <h2>Содержание курса</h2>

        {sortedLessons.length === 0 ? (
          <p>В курсе пока нет уроков.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '12px',
            }}
          >
            {sortedLessons.map((lesson, index) => {
              const completed =
                completedIds.includes(lesson.id)

              const unlocked =
                user.role === 'Учитель' ||
                lesson.isPreview ||
                (progress &&
                  canOpenLesson(
                    course.id,
                    lesson.id,
                    user.id
                  ))

              return (
                <article
                  key={lesson.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '14px',
                    padding: '16px',
                    opacity: unlocked ? 1 : 0.65,
                    background: completed
                      ? '#f0fdf4'
                      : '#ffffff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '16px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: '0 0 7px',
                        }}
                      >
                        {completed
                          ? '✅'
                          : unlocked
                            ? '📖'
                            : '🔒'}{' '}
                        {index + 1}. {lesson.title}
                      </h3>

                      {lesson.description && (
                        <p
                          style={{
                            color: '#6b7280',
                          }}
                        >
                          {lesson.description}
                        </p>
                      )}

                      <small>
                        ⏱ {lesson.duration} минут · +
                        {lesson.pointsReward} баллов · +
                        {lesson.xpReward} XP
                        {lesson.attachments?.length
                          ? ` · 📎 ${lesson.attachments.length} файлов`
                          : ''}
                      </small>
                    </div>

                    <button
                      type="button"
                      className={
                        unlocked
                          ? 'primary-button'
                          : 'secondary-button'
                      }
                      disabled={!unlocked}
                      onClick={() =>
                        handleOpenLesson(lesson)
                      }
                    >
                      {completed
                        ? 'Посмотреть снова'
                        : unlocked
                          ? 'Открыть урок'
                          : 'Недоступно'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default CourseDetailsPage