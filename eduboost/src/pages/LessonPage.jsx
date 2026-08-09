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
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  LockKeyhole,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  Video,
  XCircle,
  Zap,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

import {
  canOpenLesson,
  completeLesson,
  downloadAttachment,
  getCourseById,
  getStudentCourseProgress,
} from '../services/courseService'

function LessonPage() {
  const { courseId, lessonId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [course, setCourse] = useState(null)
  const [progress, setProgress] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isCompleting, setIsCompleting] =
    useState(false)
  const [downloadingId, setDownloadingId] =
    useState(null)

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
  }, [courseId, lessonId, user?.id])

  const sortedLessons = useMemo(() => {
    if (!Array.isArray(course?.lessons)) {
      return []
    }

    return [...course.lessons].sort(
      (firstLesson, secondLesson) =>
        Number(firstLesson.order || 0) -
        Number(secondLesson.order || 0),
    )
  }, [course])

  const lessonIndex =
    sortedLessons.findIndex(
      (item) => item.id === lessonId,
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
    lessonIndex <
      sortedLessons.length - 1
      ? sortedLessons[lessonIndex + 1]
      : null

  const completedIds =
    progress?.completedLessonIds || []

  const isCompleted =
    completedIds.includes(lessonId)

  const youtubeEmbedUrl =
    lesson?.videoUrl
      ? getYoutubeEmbedUrl(
          lesson.videoUrl,
        )
      : null

  const courseProgress = Math.min(
    Math.max(
      Number(
        progress?.progressPercent || 0,
      ),
      0,
    ),
    100,
  )

  function handleCompleteLesson() {
    setMessage('')
    setError('')

    if (!lesson || isCompleted) {
      return
    }

    try {
      setIsCompleting(true)

      const result = completeLesson(
        courseId,
        lessonId,
      )

      loadData()

      if (
        result.rewardAlreadyReceived
      ) {
        setMessage(
          'Урок уже был завершён. Награда была получена ранее.',
        )
      } else if (
        result.courseCompleted
      ) {
        setMessage(
          `Курс завершён! Получено +${result.receivedPoints} баллов и +${result.receivedXp} XP.`,
        )
      } else {
        setMessage(
          `Урок завершён! Получено +${result.receivedPoints} баллов и +${result.receivedXp} XP.`,
        )
      }
    } catch (completeError) {
      setError(
        completeError.message ||
          'Не удалось завершить урок',
      )
    } finally {
      setIsCompleting(false)
    }
  }

  function handleDownload(attachment) {
    setMessage('')
    setError('')

    try {
      setDownloadingId(attachment.id)

      downloadAttachment(attachment)
    } catch (downloadError) {
      setError(
        downloadError.message ||
          'Не удалось скачать файл',
      )
    } finally {
      setDownloadingId(null)
    }
  }

  if (!user) {
    return null
  }

  if (!course || !lesson) {
    return (
      <LessonState
        icon={BookOpen}
        title="Урок не найден"
        text="Возможно, урок был удалён или ссылка указана неправильно."
        buttonText="Вернуться к курсу"
        onClick={() =>
          navigate(`/courses/${courseId}`)
        }
      />
    )
  }

  const allowed =
    user.role === 'Учитель' ||
    lesson.isPreview ||
    canOpenLesson(
      courseId,
      lessonId,
      user.id,
    )

  if (!allowed) {
    return (
      <LessonState
        icon={LockKeyhole}
        title="Урок заблокирован"
        text="Сначала завершите предыдущий урок, чтобы открыть этот материал."
        buttonText="Вернуться к содержанию"
        onClick={() =>
          navigate(`/courses/${courseId}`)
        }
      />
    )
  }

  return (
    <div className="lesson-page">
      <button
        type="button"
        className="lesson-back-button"
        onClick={() =>
          navigate(`/courses/${courseId}`)
        }
      >
        <ArrowLeft size={18} />
        К содержанию курса
      </button>

      {message && (
        <div className="lesson-alert lesson-alert--success">
          <CheckCircle2 size={19} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="lesson-alert lesson-alert--error">
          <XCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      <LessonHeader
        course={course}
        lesson={lesson}
        lessonIndex={lessonIndex}
        lessonsCount={
          sortedLessons.length
        }
        progress={courseProgress}
        isCompleted={isCompleted}
      />

      <LessonStats lesson={lesson} />

      <div className="lesson-content-layout">
        <main className="lesson-main-column">
          {lesson.videoUrl && (
            <LessonVideo
              lesson={lesson}
              youtubeEmbedUrl={
                youtubeEmbedUrl
              }
            />
          )}

          {lesson.content && (
            <LessonMaterial
              content={lesson.content}
            />
          )}

          {Array.isArray(
            lesson.attachments,
          ) &&
            lesson.attachments.length >
              0 && (
              <LessonAttachments
                attachments={
                  lesson.attachments
                }
                downloadingId={
                  downloadingId
                }
                onDownload={
                  handleDownload
                }
              />
            )}

          {!lesson.videoUrl &&
            !lesson.content &&
            !lesson.attachments
              ?.length && (
              <LessonEmptyContent />
            )}
        </main>

        <aside className="lesson-sidebar">
          <div className="lesson-sidebar-icon">
            <Sparkles size={25} />
          </div>

          <p>Текущий урок</p>

          <h2>
            {lessonIndex + 1} из{' '}
            {sortedLessons.length}
          </h2>

          <div className="lesson-sidebar-progress">
            <div>
              <span>
                Прогресс курса
              </span>

              <strong>
                {courseProgress}%
              </strong>
            </div>

            <div>
              <span
                style={{
                  width: `${courseProgress}%`,
                }}
              />
            </div>
          </div>

          <LessonSidebarInfo
            icon={Clock3}
            label="Длительность"
            value={`${Number(
              lesson.duration || 0,
            )} минут`}
          />

          <LessonSidebarInfo
            icon={Coins}
            label="Награда"
            value={`+${Number(
              lesson.pointsReward || 0,
            )} баллов`}
          />

          <LessonSidebarInfo
            icon={Zap}
            label="Опыт"
            value={`+${Number(
              lesson.xpReward || 0,
            )} XP`}
          />

          {user.role === 'Ученик' && (
            <button
              type="button"
              className={
                isCompleted
                  ? 'lesson-complete-button lesson-complete-button--done'
                  : 'lesson-complete-button'
              }
              disabled={
                isCompleted ||
                isCompleting
              }
              onClick={
                handleCompleteLesson
              }
            >
              {isCompleting ? (
                <RotateCcw size={18} />
              ) : isCompleted ? (
                <CheckCircle2
                  size={18}
                />
              ) : (
                <Trophy size={18} />
              )}

              {isCompleting
                ? 'Завершаем...'
                : isCompleted
                  ? 'Урок завершён'
                  : 'Завершить урок'}
            </button>
          )}

          <small>
            После завершения откроется
            следующий урок.
          </small>
        </aside>
      </div>

      <LessonNavigation
        previousLesson={previousLesson}
        nextLesson={nextLesson}
        isCompleted={isCompleted}
        userRole={user.role}
        onPrevious={() =>
          navigate(
            `/courses/${courseId}/lessons/${previousLesson.id}`,
          )
        }
        onNext={() =>
          navigate(
            `/courses/${courseId}/lessons/${nextLesson.id}`,
          )
        }
      />
    </div>
  )
}

function LessonHeader({
  course,
  lesson,
  lessonIndex,
  lessonsCount,
  progress,
  isCompleted,
}) {
  return (
    <header className="lesson-header">
      <div className="lesson-header-main">
        <div className="lesson-header-label">
          <GraduationCap size={16} />
          {course.title}
        </div>

        <span>
          Урок {lessonIndex + 1} из{' '}
          {lessonsCount}
        </span>

        <h1>{lesson.title}</h1>

        <p>
          {lesson.description ||
            'Изучите материал урока и завершите его для получения награды.'}
        </p>

        <div className="lesson-header-meta">
          <span>
            <Clock3 size={16} />
            {Number(
              lesson.duration || 0,
            )}{' '}
            минут
          </span>

          <span>
            <Coins size={16} />
            +
            {Number(
              lesson.pointsReward || 0,
            )}{' '}
            баллов
          </span>

          <span>
            <Zap size={16} />
            +
            {Number(
              lesson.xpReward || 0,
            )}{' '}
            XP
          </span>
        </div>
      </div>

      <div className="lesson-header-badge">
        {isCompleted ? (
          <CheckCircle2 size={43} />
        ) : (
          <PlayCircle size={43} />
        )}

        <strong>
          {isCompleted
            ? 'Готово'
            : `${progress}%`}
        </strong>

        <span>
          {isCompleted
            ? 'урок завершён'
            : 'прогресс курса'}
        </span>
      </div>
    </header>
  )
}

function LessonStats({ lesson }) {
  const attachmentsCount =
    Array.isArray(lesson.attachments)
      ? lesson.attachments.length
      : 0

  const stats = [
    {
      label: 'Видео',
      value: lesson.videoUrl
        ? 'Доступно'
        : 'Нет',
      icon: Video,
      className:
        'lesson-stat--purple',
    },
    {
      label: 'Материал',
      value: lesson.content
        ? 'Доступен'
        : 'Нет',
      icon: BookOpen,
      className:
        'lesson-stat--blue',
    },
    {
      label: 'Файлов',
      value: attachmentsCount,
      icon: FileText,
      className:
        'lesson-stat--green',
    },
    {
      label: 'Баллов',
      value: Number(
        lesson.pointsReward || 0,
      ),
      icon: Coins,
      className:
        'lesson-stat--gold',
    },
  ]

  return (
    <section className="lesson-stats">
      {stats.map((item) => {
        const Icon = item.icon

        return (
          <article
            key={item.label}
            className={`lesson-stat-card ${item.className}`}
          >
            <div>
              <Icon size={21} />
            </div>

            <span>
              <strong>{item.value}</strong>
              <small>{item.label}</small>
            </span>
          </article>
        )
      })}
    </section>
  )
}

function LessonVideo({
  lesson,
  youtubeEmbedUrl,
}) {
  return (
    <section className="lesson-section">
      <div className="lesson-section-heading">
        <div>
          <p>Видеоматериал</p>
          <h2>Видео урока</h2>
        </div>

        <Video size={23} />
      </div>

      {youtubeEmbedUrl ? (
        <div className="lesson-video-wrapper">
          <iframe
            src={youtubeEmbedUrl}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <a
          href={lesson.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="lesson-video-link"
        >
          <ExternalLink size={18} />
          Открыть видео
        </a>
      )}
    </section>
  )
}

function LessonMaterial({ content }) {
  return (
    <section className="lesson-section">
      <div className="lesson-section-heading">
        <div>
          <p>Теория</p>
          <h2>Материал урока</h2>
        </div>

        <BookOpen size={23} />
      </div>

      <div className="lesson-material">
        {content}
      </div>
    </section>
  )
}

function LessonAttachments({
  attachments,
  downloadingId,
  onDownload,
}) {
  return (
    <section className="lesson-section">
      <div className="lesson-section-heading">
        <div>
          <p>Дополнительные файлы</p>
          <h2>
            Прикреплённые материалы
          </h2>
        </div>

        <FileText size={23} />
      </div>

      <div className="lesson-attachments">
        {attachments.map(
          (attachment) => {
            const isDownloading =
              downloadingId ===
              attachment.id

            return (
              <article
                key={attachment.id}
                className="lesson-attachment-card"
              >
                <div className="lesson-attachment-icon">
                  <FileText size={22} />
                </div>

                <div className="lesson-attachment-main">
                  <strong>
                    {attachment.name}
                  </strong>

                  <span>
                    {attachment.extension
                      ?.toUpperCase() ||
                      'ФАЙЛ'}{' '}
                    ·{' '}
                    {formatFileSize(
                      attachment.size,
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={() =>
                    onDownload(
                      attachment,
                    )
                  }
                >
                  {isDownloading ? (
                    <RotateCcw
                      size={17}
                    />
                  ) : (
                    <Download
                      size={17}
                    />
                  )}

                  {isDownloading
                    ? 'Загрузка...'
                    : 'Скачать'}
                </button>
              </article>
            )
          },
        )}
      </div>
    </section>
  )
}

function LessonSidebarInfo({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="lesson-sidebar-info">
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

function LessonNavigation({
  previousLesson,
  nextLesson,
  isCompleted,
  userRole,
  onPrevious,
  onNext,
}) {
  return (
    <section className="lesson-navigation">
      <div>
        {previousLesson && (
          <button
            type="button"
            className="lesson-navigation-secondary"
            onClick={onPrevious}
          >
            <ArrowLeft size={18} />

            <span>
              <small>
                Предыдущий урок
              </small>

              <strong>
                {previousLesson.title}
              </strong>
            </span>
          </button>
        )}
      </div>

      <div>
        {nextLesson && (
          <button
            type="button"
            className="lesson-navigation-primary"
            disabled={
              userRole === 'Ученик' &&
              !isCompleted
            }
            onClick={onNext}
          >
            <span>
              <small>
                Следующий урок
              </small>

              <strong>
                {nextLesson.title}
              </strong>
            </span>

            <ArrowRight size={18} />
          </button>
        )}
      </div>
    </section>
  )
}

function LessonEmptyContent() {
  return (
    <section className="lesson-empty">
      <div>
        <BookOpen size={33} />
      </div>

      <h2>Материалы не добавлены</h2>

      <p>
        Преподаватель пока не добавил
        видео, текст или файлы к этому
        уроку.
      </p>
    </section>
  )
}

function LessonState({
  icon: Icon,
  title,
  text,
  buttonText,
  onClick,
}) {
  return (
    <div className="lesson-page">
      <section className="lesson-state">
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

function formatFileSize(bytes = 0) {
  const size = Number(bytes || 0)

  if (size < 1024) {
    return `${size} Б`
  }

  if (size < 1024 * 1024) {
    return `${Math.round(
      size / 1024,
    )} КБ`
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} МБ`
}

function getYoutubeEmbedUrl(url = '') {
  try {
    if (url.includes('youtu.be/')) {
      const videoId = url
        .split('youtu.be/')[1]
        ?.split('?')[0]

      return videoId
        ? `https://www.youtube.com/embed/${videoId}`
        : null
    }

    if (
      url.includes(
        'youtube.com/watch',
      )
    ) {
      const parsedUrl = new URL(url)

      const videoId =
        parsedUrl.searchParams.get('v')

      return videoId
        ? `https://www.youtube.com/embed/${videoId}`
        : null
    }

    if (
      url.includes(
        'youtube.com/embed/',
      )
    ) {
      return url
    }
  } catch {
    return null
  }

  return null
}

export default LessonPage