import { useEffect, useMemo, useState } from 'react'
import {
  useNavigate,
  useParams,
} from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  canOpenLesson,
  completeLesson,
  downloadAttachment,
  getCourseById,
  getStudentCourseProgress,
} from '../services/courseService'

function formatFileSize(bytes = 0) {
  if (bytes < 1024) {
    return `${bytes} Б`
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} КБ`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

function getYoutubeEmbedUrl(url = '') {
  try {
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0]
      return videoId
        ? `https://www.youtube.com/embed/${videoId}`
        : null
    }

    if (url.includes('youtube.com/watch')) {
      const parsedUrl = new URL(url)
      const videoId = parsedUrl.searchParams.get('v')

      return videoId
        ? `https://www.youtube.com/embed/${videoId}`
        : null
    }

    if (url.includes('youtube.com/embed/')) {
      return url
    }
  } catch {
    return null
  }

  return null
}

function LessonPage() {
  const { courseId, lessonId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [course, setCourse] = useState(null)
  const [progress, setProgress] = useState(null)
  const [message, setMessage] = useState('')
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
  }, [courseId, lessonId, user?.id])

  const sortedLessons = useMemo(() => {
    if (!course?.lessons) {
      return []
    }

    return [...course.lessons].sort(
      (a, b) => a.order - b.order
    )
  }, [course])

  const lessonIndex = sortedLessons.findIndex(
    (lesson) => lesson.id === lessonId
  )

  const lesson =
    lessonIndex >= 0
      ? sortedLessons[lessonIndex]
      : null

  const previousLesson =
    lessonIndex > 0
      ? sortedLessons[lessonIndex - 1]
      : null

  const nextLesson =
    lessonIndex >= 0 &&
    lessonIndex < sortedLessons.length - 1
      ? sortedLessons[lessonIndex + 1]
      : null

  const isCompleted =
    progress?.completedLessonIds?.includes(
      lessonId
    ) || false

  const youtubeEmbedUrl = lesson?.videoUrl
    ? getYoutubeEmbedUrl(lesson.videoUrl)
    : null

  const handleCompleteLesson = () => {
    setMessage('')
    setError('')

    try {
      const result = completeLesson(
        courseId,
        lessonId
      )

      loadData()

      if (result.rewardAlreadyReceived) {
        setMessage(
          'Этот урок уже завершён. Награда была получена ранее.'
        )
      } else if (result.courseCompleted) {
        setMessage(
          `Поздравляем! Курс завершён. Вы получили +${result.receivedPoints} баллов и +${result.receivedXp} XP.`
        )
      } else {
        setMessage(
          `Урок завершён! Получено +${result.receivedPoints} баллов и +${result.receivedXp} XP.`
        )
      }
    } catch (completeError) {
      setError(
        completeError.message ||
          'Не удалось завершить урок'
      )
    }
  }

  const handleDownload = (attachment) => {
    setMessage('')
    setError('')

    try {
      downloadAttachment(attachment)
    } catch (downloadError) {
      setError(
        downloadError.message ||
          'Не удалось скачать файл'
      )
    }
  }

  if (!course || !lesson) {
    return (
      <div className="page-container">
        <div className="content-card">
          <h1>Урок не найден</h1>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate(`/courses/${courseId}`)
            }
          >
            Вернуться к курсу
          </button>
        </div>
      </div>
    )
  }

  const allowed =
    user.role === 'Учитель' ||
    lesson.isPreview ||
    canOpenLesson(
      courseId,
      lessonId,
      user.id
    )

  if (!allowed) {
    return (
      <div className="page-container">
        <div className="content-card">
          <h1>Урок пока заблокирован</h1>

          <p>
            Сначала завершите предыдущий урок.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate(`/courses/${courseId}`)
            }
          >
            Вернуться к содержанию
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <button
        type="button"
        className="secondary-button"
        onClick={() =>
          navigate(`/courses/${courseId}`)
        }
        style={{
          marginBottom: '16px',
        }}
      >
        ← К содержанию курса
      </button>

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <article className="content-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <p
              style={{
                color: '#6b7280',
                marginBottom: '5px',
              }}
            >
              {course.title} · Урок {lessonIndex + 1}
            </p>

            <h1>{lesson.title}</h1>

            {lesson.description && (
              <p
                style={{
                  color: '#6b7280',
                }}
              >
                {lesson.description}
              </p>
            )}
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: '#eef2ff',
            }}
          >
            ⏱ {lesson.duration} минут
            <br />
            🏆 +{lesson.pointsReward} баллов
            <br />
            ⭐ +{lesson.xpReward} XP
          </div>
        </div>

        {lesson.videoUrl && (
          <section
            style={{
              marginTop: '24px',
            }}
          >
            <h2>Видео урока</h2>

            {youtubeEmbedUrl ? (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  paddingTop: '56.25%',
                  overflow: 'hidden',
                  borderRadius: '16px',
                  background: '#000000',
                }}
              >
                <iframe
                  src={youtubeEmbedUrl}
                  title={lesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    border: 0,
                  }}
                />
              </div>
            ) : (
              <a
                href={lesson.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="primary-button"
                style={{
                  display: 'inline-block',
                  textDecoration: 'none',
                }}
              >
                Открыть видео
              </a>
            )}
          </section>
        )}

        {lesson.content && (
          <section
            style={{
              marginTop: '26px',
            }}
          >
            <h2>Материал урока</h2>

            <div
              style={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.8,
                padding: '18px',
                borderRadius: '14px',
                background: '#f9fafb',
              }}
            >
              {lesson.content}
            </div>
          </section>
        )}

        {lesson.attachments?.length > 0 && (
          <section
            style={{
              marginTop: '26px',
            }}
          >
            <h2>Прикреплённые материалы</h2>

            <div
              style={{
                display: 'grid',
                gap: '10px',
              }}
            >
              {lesson.attachments.map(
                (attachment) => (
                  <div
                    key={attachment.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <strong>
                        📎 {attachment.name}
                      </strong>

                      <div
                        style={{
                          color: '#6b7280',
                          fontSize: '13px',
                          marginTop: '4px',
                        }}
                      >
                        {attachment.extension?.toUpperCase()}{' '}
                        ·{' '}
                        {formatFileSize(
                          attachment.size
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        handleDownload(attachment)
                      }
                    >
                      Скачать
                    </button>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {user.role === 'Ученик' && (
          <div
            style={{
              marginTop: '28px',
              paddingTop: '20px',
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <button
              type="button"
              className="primary-button"
              onClick={handleCompleteLesson}
              disabled={isCompleted}
            >
              {isCompleted
                ? '✅ Урок завершён'
                : 'Завершить урок и получить награду'}
            </button>
          </div>
        )}
      </article>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          marginTop: '18px',
          flexWrap: 'wrap',
        }}
      >
        {previousLesson ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              navigate(
                `/courses/${courseId}/lessons/${previousLesson.id}`
              )
            }
          >
            ← Предыдущий урок
          </button>
        ) : (
          <span />
        )}

        {nextLesson && (
          <button
            type="button"
            className="primary-button"
            disabled={
              user.role === 'Ученик' &&
              !isCompleted
            }
            onClick={() =>
              navigate(
                `/courses/${courseId}/lessons/${nextLesson.id}`
              )
            }
          >
            Следующий урок →
          </button>
        )}
      </div>
    </div>
  )
}

export default LessonPage