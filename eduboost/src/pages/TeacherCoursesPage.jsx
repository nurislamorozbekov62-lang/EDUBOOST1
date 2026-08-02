import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  addLesson,
  convertFilesToAttachments,
  createCourse,
  deleteCourse,
  deleteLesson,
  getCourseStatistics,
  getTeacherCourses,
  moveCourseToDraft,
  moveLesson,
  publishCourse,
} from '../services/courseService'

const initialCourseForm = {
  title: '',
  description: '',
  subject: '',
  coverEmoji: '📘',
  level: 'Начальный',
  className: 'Все классы',
  language: 'Русский',
  accessType: 'free',
  price: 0,
}

const initialLessonForm = {
  title: '',
  description: '',
  content: '',
  videoUrl: '',
  duration: 10,
  pointsReward: 10,
  xpReward: 20,
  isPreview: false,
}

function formatFileSize(bytes = 0) {
  if (bytes < 1024) {
    return `${bytes} Б`
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} КБ`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

function TeacherCoursesPage() {
  const { user } = useAuth()

  const [courses, setCourses] = useState([])
  const [courseForm, setCourseForm] = useState(initialCourseForm)
  const [lessonForm, setLessonForm] = useState(initialLessonForm)

  const [selectedCourseId, setSelectedCourseId] = useState(null)
  const [attachments, setAttachments] = useState([])

  const [showCourseForm, setShowCourseForm] = useState(false)
  const [showLessonForm, setShowLessonForm] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isReadingFiles, setIsReadingFiles] = useState(false)

  const fileInputRef = useRef(null)

  const loadCourses = () => {
    if (!user?.id) {
      setCourses([])
      return
    }

    const teacherCourses = getTeacherCourses(user.id)
    setCourses(teacherCourses)

    if (
      selectedCourseId &&
      !teacherCourses.some(
        (course) => course.id === selectedCourseId
      )
    ) {
      setSelectedCourseId(null)
    }
  }

  useEffect(() => {
    loadCourses()
  }, [user?.id])

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (course) => course.id === selectedCourseId
      ) || null,
    [courses, selectedCourseId]
  )

  const selectedCourseStatistics = useMemo(() => {
    if (!selectedCourseId) {
      return null
    }

    return getCourseStatistics(selectedCourseId)
  }, [selectedCourseId, courses])

  const clearMessages = () => {
    setMessage('')
    setError('')
  }

  const showSuccess = (text) => {
    setMessage(text)
    setError('')
  }

  const showError = (text) => {
    setError(text)
    setMessage('')
  }

  const handleCourseChange = (event) => {
    const { name, value } = event.target

    setCourseForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleLessonChange = (event) => {
    const { name, value, type, checked } = event.target

    setLessonForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleCreateCourse = async (event) => {
    event.preventDefault()
    clearMessages()

    try {
      setIsSaving(true)

      const newCourse = createCourse(courseForm)

      setCourseForm(initialCourseForm)
      setShowCourseForm(false)
      setSelectedCourseId(newCourse.id)

      loadCourses()
      showSuccess('Курс успешно создан')
    } catch (creationError) {
      showError(
        creationError.message || 'Не удалось создать курс'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleSelectFiles = async (event) => {
    clearMessages()

    const files = Array.from(event.target.files || [])

    if (!files.length) {
      return
    }

    try {
      setIsReadingFiles(true)

      if (attachments.length + files.length > 5) {
        throw new Error(
          'К одному уроку можно прикрепить максимум 5 файлов'
        )
      }

      const convertedFiles =
        await convertFilesToAttachments(files)

      setAttachments((previous) => [
        ...previous,
        ...convertedFiles,
      ])
    } catch (fileError) {
      showError(
        fileError.message || 'Не удалось добавить файлы'
      )
    } finally {
      setIsReadingFiles(false)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveSelectedAttachment = (
    attachmentId
  ) => {
    setAttachments((previous) =>
      previous.filter(
        (attachment) => attachment.id !== attachmentId
      )
    )
  }

  const handleAddLesson = async (event) => {
    event.preventDefault()
    clearMessages()

    if (!selectedCourseId) {
      showError('Сначала выберите курс')
      return
    }

    try {
      setIsSaving(true)

      addLesson(selectedCourseId, {
        ...lessonForm,
        attachments,
      })

      setLessonForm(initialLessonForm)
      setAttachments([])
      setShowLessonForm(false)

      loadCourses()
      showSuccess('Урок успешно добавлен')
    } catch (lessonError) {
      showError(
        lessonError.message || 'Не удалось добавить урок'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublishCourse = (courseId) => {
    clearMessages()

    try {
      publishCourse(courseId)
      loadCourses()
      showSuccess('Курс опубликован')
    } catch (publishError) {
      showError(
        publishError.message || 'Не удалось опубликовать курс'
      )
    }
  }

  const handleMoveToDraft = (courseId) => {
    clearMessages()

    try {
      moveCourseToDraft(courseId)
      loadCourses()
      showSuccess('Курс снят с публикации')
    } catch (draftError) {
      showError(
        draftError.message ||
          'Не удалось снять курс с публикации'
      )
    }
  }

  const handleDeleteCourse = (courseId) => {
    const confirmed = window.confirm(
      'Удалить курс вместе со всеми уроками и прогрессом учеников?'
    )

    if (!confirmed) {
      return
    }

    clearMessages()

    try {
      deleteCourse(courseId)
      setSelectedCourseId(null)
      loadCourses()
      showSuccess('Курс удалён')
    } catch (deleteError) {
      showError(
        deleteError.message || 'Не удалось удалить курс'
      )
    }
  }

  const handleDeleteLesson = (lessonId) => {
    if (!selectedCourseId) {
      return
    }

    const confirmed = window.confirm(
      'Удалить этот урок?'
    )

    if (!confirmed) {
      return
    }

    clearMessages()

    try {
      deleteLesson(selectedCourseId, lessonId)
      loadCourses()
      showSuccess('Урок удалён')
    } catch (deleteError) {
      showError(
        deleteError.message || 'Не удалось удалить урок'
      )
    }
  }

  const handleMoveLesson = (lessonId, direction) => {
    if (!selectedCourseId) {
      return
    }

    clearMessages()

    try {
      moveLesson(
        selectedCourseId,
        lessonId,
        direction
      )

      loadCourses()
    } catch (moveError) {
      showError(
        moveError.message ||
          'Не удалось изменить порядок уроков'
      )
    }
  }

  const openCourse = (courseId) => {
    setSelectedCourseId(courseId)
    setShowLessonForm(false)
    clearMessages()
  }

  const openLessonForm = () => {
    if (!selectedCourseId) {
      showError('Сначала выберите курс')
      return
    }

    setLessonForm(initialLessonForm)
    setAttachments([])
    setShowLessonForm(true)
    setShowCourseForm(false)
    clearMessages()
  }

  if (!user) {
    return <p>Пользователь не найден.</p>
  }

  if (user.role !== 'Учитель') {
    return (
      <div className="page-container">
        <h1>Учебные курсы</h1>
        <p>Эта страница доступна только учителям.</p>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Мои учебные курсы</h1>
          <p>
            Создавайте курсы, уроки и добавляйте учебные
            материалы.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setShowCourseForm((previous) => !previous)
            setShowLessonForm(false)
            clearMessages()
          }}
        >
          {showCourseForm
            ? 'Закрыть форму'
            : '+ Создать курс'}
        </button>
      </div>

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

      {showCourseForm && (
        <form
          className="content-card course-form"
          onSubmit={handleCreateCourse}
        >
          <h2>Новый курс</h2>

          <div className="form-grid">
            <label>
              Название курса
              <input
                type="text"
                name="title"
                value={courseForm.title}
                onChange={handleCourseChange}
                placeholder="Например: Основы программирования"
                required
              />
            </label>

            <label>
              Предмет
              <input
                type="text"
                name="subject"
                value={courseForm.subject}
                onChange={handleCourseChange}
                placeholder="Информатика"
                required
              />
            </label>

            <label>
              Значок курса
              <input
                type="text"
                name="coverEmoji"
                value={courseForm.coverEmoji}
                onChange={handleCourseChange}
                maxLength={4}
                placeholder="📘"
              />
            </label>

            <label>
              Уровень
              <select
                name="level"
                value={courseForm.level}
                onChange={handleCourseChange}
              >
                <option>Начальный</option>
                <option>Средний</option>
                <option>Продвинутый</option>
              </select>
            </label>

            <label>
              Для какого класса
              <select
                name="className"
                value={courseForm.className}
                onChange={handleCourseChange}
              >
                <option>Все классы</option>
                <option>5 класс</option>
                <option>6 класс</option>
                <option>7 класс</option>
                <option>8 класс</option>
                <option>9 класс</option>
                <option>10 класс</option>
                <option>11 класс</option>
                <option>Студенты</option>
              </select>
            </label>

            <label>
              Язык
              <select
                name="language"
                value={courseForm.language}
                onChange={handleCourseChange}
              >
                <option>Русский</option>
                <option>Кыргызский</option>
                <option>Английский</option>
              </select>
            </label>

            <label>
              Доступ
              <select
                name="accessType"
                value={courseForm.accessType}
                onChange={handleCourseChange}
              >
                <option value="free">Бесплатный</option>
                <option value="paid">Платный</option>
              </select>
            </label>

            {courseForm.accessType === 'paid' && (
              <label>
                Цена курса, сом
                <input
                  type="number"
                  name="price"
                  min="0"
                  value={courseForm.price}
                  onChange={handleCourseChange}
                />
              </label>
            )}
          </div>

          <label>
            Описание курса
            <textarea
              name="description"
              value={courseForm.description}
              onChange={handleCourseChange}
              placeholder="Что ученик изучит в этом курсе?"
              rows={4}
            />
          </label>

          <button
            type="submit"
            className="primary-button"
            disabled={isSaving}
          >
            {isSaving ? 'Создание...' : 'Создать курс'}
          </button>
        </form>
      )}

      <div
        className="courses-layout"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(260px, 360px) minmax(0, 1fr)',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        <section className="content-card">
          <h2>Список курсов</h2>

          {courses.length === 0 ? (
            <div className="empty-state">
              <p>У вас пока нет курсов.</p>
              <p>
                Нажмите «Создать курс», чтобы добавить первый.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: '12px',
              }}
            >
              {courses.map((course) => {
                const isSelected =
                  course.id === selectedCourseId

                return (
                  <button
                    type="button"
                    key={course.id}
                    onClick={() => openCourse(course.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '16px',
                      borderRadius: '14px',
                      border: isSelected
                        ? '2px solid #4f46e5'
                        : '1px solid #e5e7eb',
                      background: isSelected
                        ? '#eef2ff'
                        : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '32px',
                        }}
                      >
                        {course.coverEmoji || '📘'}
                      </span>

                      <div>
                        <strong>{course.title}</strong>

                        <div
                          style={{
                            marginTop: '5px',
                            fontSize: '14px',
                            color: '#6b7280',
                          }}
                        >
                          {course.subject} ·{' '}
                          {course.lessons?.length || 0}{' '}
                          уроков
                        </div>

                        <div
                          style={{
                            marginTop: '6px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              padding: '4px 8px',
                              borderRadius: '999px',
                              background:
                                course.status ===
                                'published'
                                  ? '#dcfce7'
                                  : '#f3f4f6',
                              color:
                                course.status ===
                                'published'
                                  ? '#166534'
                                  : '#374151',
                            }}
                          >
                            {course.status === 'published'
                              ? 'Опубликован'
                              : 'Черновик'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="content-card">
          {!selectedCourse ? (
            <div className="empty-state">
              <h2>Выберите курс</h2>
              <p>
                После выбора здесь появятся уроки и настройки
                курса.
              </p>
            </div>
          ) : (
            <>
              <div className="page-header">
                <div>
                  <h2>
                    {selectedCourse.coverEmoji}{' '}
                    {selectedCourse.title}
                  </h2>

                  <p>
                    {selectedCourse.subject} ·{' '}
                    {selectedCourse.level} ·{' '}
                    {selectedCourse.className}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <button
                    type="button"
                    className="primary-button"
                    onClick={openLessonForm}
                  >
                    + Добавить урок
                  </button>

                  {selectedCourse.status === 'published' ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        handleMoveToDraft(
                          selectedCourse.id
                        )
                      }
                    >
                      Снять с публикации
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        handlePublishCourse(
                          selectedCourse.id
                        )
                      }
                    >
                      Опубликовать
                    </button>
                  )}

                  <button
                    type="button"
                    className="danger-button"
                    onClick={() =>
                      handleDeleteCourse(
                        selectedCourse.id
                      )
                    }
                  >
                    Удалить курс
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px',
                  margin: '18px 0',
                }}
              >
                <div className="stat-card">
                  <strong>
                    {selectedCourseStatistics?.lessonsCount ||
                      0}
                  </strong>
                  <span>Уроков</span>
                </div>

                <div className="stat-card">
                  <strong>
                    {selectedCourseStatistics?.studentsCount ||
                      0}
                  </strong>
                  <span>Учеников</span>
                </div>

                <div className="stat-card">
                  <strong>
                    {selectedCourseStatistics?.averageProgress ||
                      0}
                    %
                  </strong>
                  <span>Средний прогресс</span>
                </div>

                <div className="stat-card">
                  <strong>
                    {selectedCourseStatistics
                      ?.completedStudentsCount || 0}
                  </strong>
                  <span>Завершили</span>
                </div>
              </div>

              {showLessonForm && (
                <form
                  onSubmit={handleAddLesson}
                  style={{
                    padding: '18px',
                    marginBottom: '20px',
                    borderRadius: '16px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div className="page-header">
                    <h3>Новый урок</h3>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        setShowLessonForm(false)
                      }
                    >
                      Закрыть
                    </button>
                  </div>

                  <div className="form-grid">
                    <label>
                      Название урока
                      <input
                        type="text"
                        name="title"
                        value={lessonForm.title}
                        onChange={handleLessonChange}
                        placeholder="Например: Переменные в Python"
                        required
                      />
                    </label>

                    <label>
                      Продолжительность, минут
                      <input
                        type="number"
                        name="duration"
                        min="1"
                        value={lessonForm.duration}
                        onChange={handleLessonChange}
                      />
                    </label>

                    <label>
                      Награда в баллах
                      <input
                        type="number"
                        name="pointsReward"
                        min="0"
                        value={lessonForm.pointsReward}
                        onChange={handleLessonChange}
                      />
                    </label>

                    <label>
                      Награда XP
                      <input
                        type="number"
                        name="xpReward"
                        min="0"
                        value={lessonForm.xpReward}
                        onChange={handleLessonChange}
                      />
                    </label>
                  </div>

                  <label>
                    Краткое описание
                    <textarea
                      name="description"
                      value={lessonForm.description}
                      onChange={handleLessonChange}
                      rows={2}
                      placeholder="О чём этот урок?"
                    />
                  </label>

                  <label>
                    Текст урока
                    <textarea
                      name="content"
                      value={lessonForm.content}
                      onChange={handleLessonChange}
                      rows={8}
                      placeholder="Введите объяснение темы..."
                    />
                  </label>

                  <label>
                    Ссылка на видео
                    <input
                      type="url"
                      name="videoUrl"
                      value={lessonForm.videoUrl}
                      onChange={handleLessonChange}
                      placeholder="https://youtube.com/..."
                    />
                  </label>

                  <label>
                    Учебные файлы
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp,.zip,.rar"
                      onChange={handleSelectFiles}
                      disabled={isReadingFiles}
                    />
                  </label>

                  <p
                    style={{
                      fontSize: '13px',
                      color: '#6b7280',
                    }}
                  >
                    Можно добавить до 5 файлов. Максимальный
                    размер одного файла — 2 МБ.
                  </p>

                  {isReadingFiles && (
                    <p>Файлы обрабатываются...</p>
                  )}

                  {attachments.length > 0 && (
                    <div
                      style={{
                        display: 'grid',
                        gap: '8px',
                        marginBottom: '16px',
                      }}
                    >
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          style={{
                            display: 'flex',
                            justifyContent:
                              'space-between',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border:
                              '1px solid #e5e7eb',
                            background: '#ffffff',
                          }}
                        >
                          <div>
                            <strong>
                              {attachment.name}
                            </strong>

                            <div
                              style={{
                                fontSize: '12px',
                                color: '#6b7280',
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
                            className="danger-button"
                            onClick={() =>
                              handleRemoveSelectedAttachment(
                                attachment.id
                              )
                            }
                          >
                            Удалить
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <input
                      type="checkbox"
                      name="isPreview"
                      checked={lessonForm.isPreview}
                      onChange={handleLessonChange}
                    />
                    Сделать урок доступным для предварительного
                    просмотра
                  </label>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={
                      isSaving || isReadingFiles
                    }
                  >
                    {isSaving
                      ? 'Сохранение...'
                      : 'Добавить урок'}
                  </button>
                </form>
              )}

              <h3>Уроки курса</h3>

              {!selectedCourse.lessons?.length ? (
                <div className="empty-state">
                  <p>В этом курсе пока нет уроков.</p>
                  <p>
                    Добавьте первый урок, чтобы можно было
                    опубликовать курс.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gap: '12px',
                  }}
                >
                  {[...selectedCourse.lessons]
                    .sort((a, b) => a.order - b.order)
                    .map((lesson, index) => (
                      <article
                        key={lesson.id}
                        style={{
                          padding: '16px',
                          border:
                            '1px solid #e5e7eb',
                          borderRadius: '14px',
                          background: '#ffffff',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent:
                              'space-between',
                            alignItems: 'flex-start',
                            gap: '16px',
                          }}
                        >
                          <div>
                            <h4
                              style={{
                                margin: '0 0 6px',
                              }}
                            >
                              {index + 1}. {lesson.title}
                            </h4>

                            <p
                              style={{
                                margin: '0 0 8px',
                                color: '#6b7280',
                              }}
                            >
                              {lesson.duration} минут · +
                              {lesson.pointsReward} баллов · +
                              {lesson.xpReward} XP
                            </p>

                            {lesson.description && (
                              <p>{lesson.description}</p>
                            )}

                            {lesson.videoUrl && (
                              <p>🎥 Есть видео</p>
                            )}

                            {lesson.attachments?.length >
                              0 && (
                              <p>
                                📎 Материалов:{' '}
                                {lesson.attachments.length}
                              </p>
                            )}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <button
                              type="button"
                              className="secondary-button"
                              disabled={index === 0}
                              onClick={() =>
                                handleMoveLesson(
                                  lesson.id,
                                  'up'
                                )
                              }
                            >
                              ↑
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              disabled={
                                index ===
                                selectedCourse.lessons
                                  .length -
                                  1
                              }
                              onClick={() =>
                                handleMoveLesson(
                                  lesson.id,
                                  'down'
                                )
                              }
                            >
                              ↓
                            </button>

                            <button
                              type="button"
                              className="danger-button"
                              onClick={() =>
                                handleDeleteLesson(
                                  lesson.id
                                )
                              }
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default TeacherCoursesPage