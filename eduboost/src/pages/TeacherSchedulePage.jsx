import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getSchoolClasses,
} from '../services/journalService'

import {
  createScheduleLesson,
  deleteScheduleLesson,
  getScheduleForTeacher,
} from '../services/supabaseScheduleService'

const days = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
]

function TeacherSchedulePage() {
  const { user } = useAuth()

  const classes = useMemo(
    () => getSchoolClasses(user),
    [user],
  )

  const [allLessons, setAllLessons] =
    useState([])
  const [loading, setLoading] =
    useState(true)

  const [selectedClass, setSelectedClass] =
    useState(classes[0] || '')

  const [selectedDay, setSelectedDay] =
    useState('Понедельник')

  const [error, setError] = useState('')
  const [success, setSuccess] =
    useState('')

  const [form, setForm] = useState({
    lessonNumber: 1,
    startTime: '08:00',
    endTime: '08:45',
    subject: '',
    classroom: '',
    description: '',
  })

  useEffect(() => {
    if (
      !selectedClass &&
      classes.length > 0
    ) {
      setSelectedClass(classes[0])
    }
  }, [classes, selectedClass])

  useEffect(() => {
    void loadLessons()
  }, [user])

  async function loadLessons() {
    if (!user || user.role !== 'Учитель') {
      setAllLessons([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')

      const lessons =
        await getScheduleForTeacher(user)

      setAllLessons(lessons)
    } catch (loadError) {
      setError(
        loadError.message ||
          'Не удалось загрузить расписание',
      )
      setAllLessons([])
    } finally {
      setLoading(false)
    }
  }

  const lessons = useMemo(
    () =>
      allLessons.filter(
        (lesson) =>
          lesson.className ===
            selectedClass &&
          lesson.day === selectedDay,
      ),
    [
      allLessons,
      selectedClass,
      selectedDay,
    ],
  )

  function handleChange(event) {
    const { name, value } =
      event.target

    setForm((oldForm) => ({
      ...oldForm,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setSuccess('')

    try {
      await createScheduleLesson(
        {
          ...form,
          className: selectedClass,
          day: selectedDay,
        },
        user,
      )

      setSuccess(
        'Урок добавлен в расписание',
      )

      setForm((oldForm) => ({
        ...oldForm,
        lessonNumber:
          Number(oldForm.lessonNumber) + 1,
        subject: '',
        classroom: '',
        description: '',
      }))

      await loadLessons()
    } catch (createError) {
      setError(
        createError.message ||
          'Не удалось добавить урок',
      )
    }
  }

  async function handleDelete(lessonId) {
    const confirmed = window.confirm(
      'Удалить этот урок из расписания?',
    )

    if (!confirmed) {
      return
    }

    try {
      setError('')
      await deleteScheduleLesson(lessonId)
      await loadLessons()
    } catch (deleteError) {
      setError(
        deleteError.message ||
          'Не удалось удалить урок',
      )
    }
  }

  if (user.role !== 'Учитель') {
    return (
      <div className="page-container">
        <section className="content-card">
          <h2>Доступ запрещён</h2>
          <p>
            Создавать расписание может
            только учитель.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Расписание уроков</h1>
          <p>
            Создавайте расписание для
            школьных классов
          </p>
        </div>
      </header>

      <section className="schedule-controls">
        <label className="form-group">
          <span>Класс</span>
          <select
            value={selectedClass}
            onChange={(event) =>
              setSelectedClass(
                event.target.value,
              )
            }
          >
            {classes.length === 0 && (
              <option value="">
                Классов пока нет
              </option>
            )}

            {classes.map((className) => (
              <option
                key={className}
                value={className}
              >
                {className}
              </option>
            ))}
          </select>
        </label>

        <label className="form-group">
          <span>День недели</span>
          <select
            value={selectedDay}
            onChange={(event) =>
              setSelectedDay(
                event.target.value,
              )
            }
          >
            {days.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="schedule-main-grid">
        <form
          className="content-card"
          onSubmit={handleSubmit}
        >
          <h2>Добавить урок</h2>

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
            <span>Номер урока</span>
            <input
              type="number"
              name="lessonNumber"
              min="1"
              max="12"
              value={form.lessonNumber}
              onChange={handleChange}
              required
            />
          </label>

          <div className="form-grid">
            <label className="form-group">
              <span>Начало</span>
              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                required
              />
            </label>

            <label className="form-group">
              <span>Конец</span>
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <label className="form-group">
            <span>Предмет</span>
            <input
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="Например: Математика"
              required
            />
          </label>

          <label className="form-group">
            <span>Кабинет</span>
            <input
              name="classroom"
              value={form.classroom}
              onChange={handleChange}
              placeholder="Например: 204"
            />
          </label>

          <label className="form-group">
            <span>Комментарий</span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Дополнительная информация"
            />
          </label>

          <button
            className="primary-button"
            type="submit"
            disabled={!selectedClass}
          >
            Добавить урок
          </button>
        </form>

        <section className="content-card">
          <div className="schedule-list-header">
            <div>
              <h2>{selectedDay}</h2>
              <p>
                Класс: {selectedClass || '—'}
              </p>
            </div>

            <span>
              Уроков: {lessons.length}
            </span>
          </div>

          {loading ? (
            <p>Загрузка расписания...</p>
          ) : (
            <div className="schedule-lessons-list">
              {lessons.length === 0 && (
                <div className="schedule-empty">
                  <span>📅</span>
                  <h3>
                    Расписание пустое
                  </h3>
                  <p>
                    Добавьте первый урок на
                    этот день.
                  </p>
                </div>
              )}

              {lessons.map((lesson) => (
                <article
                  className="schedule-lesson-item"
                  key={lesson.id}
                >
                  <div className="schedule-lesson-number">
                    {lesson.lessonNumber}
                  </div>

                  <div className="schedule-lesson-main">
                    <strong>
                      {lesson.subject}
                    </strong>

                    <p>
                      {lesson.startTime}–
                      {lesson.endTime}
                      {lesson.classroom
                        ? ` · кабинет ${lesson.classroom}`
                        : ''}
                    </p>

                    {lesson.description && (
                      <span>
                        {lesson.description}
                      </span>
                    )}

                    <small>
                      Учитель:{' '}
                      {lesson.teacherName}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="schedule-delete-button"
                    onClick={() =>
                      handleDelete(lesson.id)
                    }
                  >
                    Удалить
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default TeacherSchedulePage