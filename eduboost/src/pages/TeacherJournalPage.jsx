import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'

import {
  calculateAttendanceStats,
  calculateAverageGrade,
  createGrade,
  deleteAttendanceRecord,
  deleteGrade,
  getSchoolClasses,
  getStudentAttendance,
  getStudentGrades,
  getStudentsByClass,
  saveAttendanceRecord,
} from '../services/journalService'

const subjects = [
  'Математика',
  'Русский язык',
  'Кыргызский язык',
  'Английский язык',
  'История',
  'Информатика',
  'Физика',
  'Химия',
  'Биология',
  'География',
  'Физическая культура',
  'Другое',
]

function TeacherJournalPage() {
  const { user } = useAuth()

  const classes = useMemo(
    () => getSchoolClasses(user),
    [user],
  )

  const [activeTab, setActiveTab] =
    useState('grades')

  const [selectedClass, setSelectedClass] =
    useState(classes[0] || '')

  const [selectedStudentId, setSelectedStudentId] =
    useState('')

  const [refreshKey, setRefreshKey] =
    useState(0)

  const students = useMemo(
    () =>
      selectedClass
        ? getStudentsByClass(
            user,
            selectedClass,
          )
        : [],
    [user, selectedClass, refreshKey],
  )

  useEffect(() => {
    if (
      students.length > 0 &&
      !students.some(
        (student) =>
          student.id === selectedStudentId,
      )
    ) {
      setSelectedStudentId(
        students[0].id,
      )
    }

    if (students.length === 0) {
      setSelectedStudentId('')
    }
  }, [students, selectedStudentId])

  const selectedStudent =
    students.find(
      (student) =>
        student.id === selectedStudentId,
    ) || null

  function refresh() {
    setRefreshKey((value) => value + 1)
  }

  if (user.role !== 'Учитель') {
    return (
      <div className="page-container">
        <section className="content-card">
          <h2>Доступ запрещён</h2>

          <p>
            Электронный дневник доступен
            только учителям.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Электронный дневник</h1>

          <p>
            Оценки и посещаемость учеников
          </p>
        </div>
      </header>

      <section className="journal-selection-card">
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
                Нет классов
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
          <span>Ученик</span>

          <select
            value={selectedStudentId}
            onChange={(event) =>
              setSelectedStudentId(
                event.target.value,
              )
            }
          >
            {students.length === 0 && (
              <option value="">
                Нет учеников
              </option>
            )}

            {students.map((student) => (
              <option
                key={student.id}
                value={student.id}
              >
                {student.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {!selectedStudent && (
        <section className="content-card">
          <p className="empty-text">
            В выбранном классе пока нет
            учеников.
          </p>
        </section>
      )}

      {selectedStudent && (
        <>
          <section className="journal-student-card">
            <div className="journal-avatar">
              {selectedStudent.name
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <span>Выбранный ученик</span>

              <h2>
                {selectedStudent.name}
              </h2>

              <p>
                {selectedStudent.school} ·{' '}
                {selectedStudent.className}
              </p>
            </div>
          </section>

          <div className="journal-tabs">
            <button
              type="button"
              className={
                activeTab === 'grades'
                  ? 'journal-tab active'
                  : 'journal-tab'
              }
              onClick={() =>
                setActiveTab('grades')
              }
            >
              📘 Оценки
            </button>

            <button
              type="button"
              className={
                activeTab === 'attendance'
                  ? 'journal-tab active'
                  : 'journal-tab'
              }
              onClick={() =>
                setActiveTab(
                  'attendance',
                )
              }
            >
              📅 Посещаемость
            </button>
          </div>

          {activeTab === 'grades' && (
            <GradesSection
              teacher={user}
              student={selectedStudent}
              refreshKey={refreshKey}
              refresh={refresh}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceSection
              teacher={user}
              student={selectedStudent}
              refreshKey={refreshKey}
              refresh={refresh}
            />
          )}
        </>
      )}
    </div>
  )
}

function GradesSection({
  teacher,
  student,
  refreshKey,
  refresh,
}) {
  const [form, setForm] = useState({
    subject: 'Математика',
    value: '5',
    gradeType: 'Домашняя работа',
    topic: '',
    comment: '',
    date: new Date()
      .toISOString()
      .slice(0, 10),
  })

  const grades = useMemo(
    () => getStudentGrades(student.id),
    [student.id, refreshKey],
  )

  const average =
    calculateAverageGrade(grades)

  function handleChange(event) {
    const { name, value } =
      event.target

    setForm((oldForm) => ({
      ...oldForm,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    createGrade(
      teacher,
      student,
      form,
    )

    setForm((oldForm) => ({
      ...oldForm,
      value: '5',
      topic: '',
      comment: '',
    }))

    refresh()
  }

  function handleDelete(gradeId) {
    const confirmed = window.confirm(
      'Удалить эту оценку?',
    )

    if (!confirmed) {
      return
    }

    deleteGrade(
      gradeId,
      teacher.id,
    )

    refresh()
  }

  return (
    <div className="journal-grid">
      <form
        className="content-card"
        onSubmit={handleSubmit}
      >
        <h2>Поставить оценку</h2>

        <label className="form-group">
          <span>Предмет</span>

          <select
            name="subject"
            value={form.subject}
            onChange={handleChange}
          >
            {subjects.map((subject) => (
              <option
                key={subject}
                value={subject}
              >
                {subject}
              </option>
            ))}
          </select>
        </label>

        <div className="form-grid">
          <label className="form-group">
            <span>Оценка</span>

            <select
              name="value"
              value={form.value}
              onChange={handleChange}
            >
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>
          </label>

          <label className="form-group">
            <span>Тип работы</span>

            <select
              name="gradeType"
              value={form.gradeType}
              onChange={handleChange}
            >
              <option>
                Домашняя работа
              </option>
              <option>
                Устный ответ
              </option>
              <option>
                Самостоятельная работа
              </option>
              <option>
                Контрольная работа
              </option>
              <option>
                Практическая работа
              </option>
              <option>
                Тест
              </option>
            </select>
          </label>
        </div>

        <label className="form-group">
          <span>Тема урока</span>

          <input
            name="topic"
            value={form.topic}
            onChange={handleChange}
            placeholder="Например: Квадратные уравнения"
          />
        </label>

        <label className="form-group">
          <span>Дата</span>

          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
          />
        </label>

        <label className="form-group">
          <span>Комментарий</span>

          <textarea
            name="comment"
            value={form.comment}
            onChange={handleChange}
            placeholder="Комментарий к оценке"
          />
        </label>

        <button
          className="primary-button"
          type="submit"
        >
          Сохранить оценку
        </button>
      </form>

      <section className="content-card">
        <div className="journal-section-header">
          <div>
            <h2>История оценок</h2>

            <p>
              Средняя оценка:{' '}
              <strong>
                {average || '—'}
              </strong>
            </p>
          </div>

          <div className="journal-average">
            {average || '—'}
          </div>
        </div>

        <div className="journal-records">
          {grades.length === 0 && (
            <p className="empty-text">
              Оценок пока нет.
            </p>
          )}

          {grades.map((grade) => (
            <article
              className="journal-record"
              key={grade.id}
            >
              <div
                className={`journal-grade grade-${grade.value}`}
              >
                {grade.value}
              </div>

              <div className="journal-record-main">
                <strong>
                  {grade.subject}
                </strong>

                <p>
                  {grade.gradeType} ·{' '}
                  {grade.date}
                </p>

                {grade.topic && (
                  <span>
                    Тема: {grade.topic}
                  </span>
                )}

                {grade.comment && (
                  <span>
                    Комментарий:{' '}
                    {grade.comment}
                  </span>
                )}
              </div>

              {grade.teacherId ===
                teacher.id && (
                <button
                  type="button"
                  className="journal-delete"
                  onClick={() =>
                    handleDelete(grade.id)
                  }
                >
                  Удалить
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function AttendanceSection({
  teacher,
  student,
  refreshKey,
  refresh,
}) {
  const [form, setForm] = useState({
    subject: 'Математика',
    date: new Date()
      .toISOString()
      .slice(0, 10),
    status: 'present',
    comment: '',
  })

  const records = useMemo(
    () =>
      getStudentAttendance(
        student.id,
      ),
    [student.id, refreshKey],
  )

  const stats =
    calculateAttendanceStats(records)

  function handleChange(event) {
    const { name, value } =
      event.target

    setForm((oldForm) => ({
      ...oldForm,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    saveAttendanceRecord(
      teacher,
      student,
      form,
    )

    setForm((oldForm) => ({
      ...oldForm,
      comment: '',
    }))

    refresh()
  }

  function handleDelete(recordId) {
    const confirmed = window.confirm(
      'Удалить эту запись посещаемости?',
    )

    if (!confirmed) {
      return
    }

    deleteAttendanceRecord(
      recordId,
      teacher.id,
    )

    refresh()
  }

  return (
    <div className="journal-grid">
      <form
        className="content-card"
        onSubmit={handleSubmit}
      >
        <h2>Отметить посещение</h2>

        <label className="form-group">
          <span>Предмет</span>

          <select
            name="subject"
            value={form.subject}
            onChange={handleChange}
          >
            {subjects.map((subject) => (
              <option
                key={subject}
                value={subject}
              >
                {subject}
              </option>
            ))}
          </select>
        </label>

        <label className="form-group">
          <span>Дата</span>

          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
          />
        </label>

        <label className="form-group">
          <span>Статус</span>

          <select
            name="status"
            value={form.status}
            onChange={handleChange}
          >
            <option value="present">
              ✅ Присутствовал
            </option>

            <option value="absent">
              ❌ Отсутствовал
            </option>

            <option value="late">
              ⏰ Опоздал
            </option>

            <option value="excused">
              📄 Уважительная причина
            </option>
          </select>
        </label>

        <label className="form-group">
          <span>Комментарий</span>

          <textarea
            name="comment"
            value={form.comment}
            onChange={handleChange}
            placeholder="Например: опоздал на 10 минут"
          />
        </label>

        <button
          className="primary-button"
          type="submit"
        >
          Сохранить посещение
        </button>
      </form>

      <section className="content-card">
        <h2>Статистика посещаемости</h2>

        <div className="attendance-summary-grid">
          <AttendanceStat
            icon="📊"
            value={`${stats.percent}%`}
            label="Посещаемость"
          />

          <AttendanceStat
            icon="✅"
            value={stats.present}
            label="Присутствовал"
          />

          <AttendanceStat
            icon="❌"
            value={stats.absent}
            label="Отсутствовал"
          />

          <AttendanceStat
            icon="⏰"
            value={stats.late}
            label="Опоздал"
          />
        </div>

        <div className="attendance-progress">
          <div
            style={{
              width: `${stats.percent}%`,
            }}
          />
        </div>

        <div className="journal-records">
          {records.length === 0 && (
            <p className="empty-text">
              Записей пока нет.
            </p>
          )}

          {records.map((record) => (
            <article
              className="journal-record"
              key={record.id}
            >
              <div className="attendance-status-icon">
                {getAttendanceIcon(
                  record.status,
                )}
              </div>

              <div className="journal-record-main">
                <strong>
                  {record.subject}
                </strong>

                <p>
                  {getAttendanceLabel(
                    record.status,
                  )}{' '}
                  · {record.date}
                </p>

                {record.comment && (
                  <span>
                    {record.comment}
                  </span>
                )}
              </div>

              {record.teacherId ===
                teacher.id && (
                <button
                  type="button"
                  className="journal-delete"
                  onClick={() =>
                    handleDelete(record.id)
                  }
                >
                  Удалить
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function AttendanceStat({
  icon,
  value,
  label,
}) {
  return (
    <div className="attendance-summary-card">
      <span>{icon}</span>

      <strong>{value}</strong>

      <p>{label}</p>
    </div>
  )
}

function getAttendanceIcon(status) {
  const icons = {
    present: '✅',
    absent: '❌',
    late: '⏰',
    excused: '📄',
  }

  return icons[status] || '📅'
}

function getAttendanceLabel(status) {
  const labels = {
    present: 'Присутствовал',
    absent: 'Отсутствовал',
    late: 'Опоздал',
    excused: 'Уважительная причина',
  }

  return labels[status] || 'Не указан'
}

export default TeacherJournalPage