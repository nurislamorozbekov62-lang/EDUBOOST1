import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'

import {
  getLinkedStudents,
} from '../services/parentService'

import {
  getClassSchedule,
  getNextLesson,
  getTodayName,
} from '../services/scheduleService'

const days = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
]

function StudentSchedulePage() {
  const { user } = useAuth()

  const linkedStudents = useMemo(
    () =>
      user.role === 'Родитель'
        ? getLinkedStudents(user.id)
        : [],
    [user],
  )

  const [selectedStudentId,
    setSelectedStudentId] =
    useState(
      linkedStudents[0]?.id || '',
    )

  useEffect(() => {
    if (
      user.role === 'Родитель' &&
      linkedStudents.length > 0 &&
      !selectedStudentId
    ) {
      setSelectedStudentId(
        linkedStudents[0].id,
      )
    }
  }, [
    user.role,
    linkedStudents,
    selectedStudentId,
  ])

  const student =
    user.role === 'Ученик'
      ? user
      : linkedStudents.find(
          (item) =>
            item.id === selectedStudentId,
        )

  const today = getTodayName()

  const [selectedDay, setSelectedDay] =
    useState(
      days.includes(today)
        ? today
        : 'Понедельник',
    )

  const schedule = student
    ? getClassSchedule(
        student.school,
        student.className,
      )
    : []

  const selectedDayLessons =
    schedule.filter(
      (lesson) =>
        lesson.day === selectedDay,
    )

  const nextLesson = student
    ? getNextLesson(
        student.school,
        student.className,
      )
    : null

  if (
    user.role !== 'Ученик' &&
    user.role !== 'Родитель'
  ) {
    return (
      <div className="page-container">
        <section className="content-card">
          <h2>Доступ запрещён</h2>

          <p>
            Эта страница предназначена
            для учеников и родителей.
          </p>
        </section>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="page-container">
        <header className="page-header">
          <div>
            <h1>Расписание</h1>

            <p>
              Сначала привяжите аккаунт
              ребёнка.
            </p>
          </div>
        </header>

        <section className="content-card">
          <h2>
            Ребёнок не привязан
          </h2>

          <p>
            Откройте родительский кабинет
            и введите код ученика.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>
            {user.role === 'Родитель'
              ? 'Расписание ребёнка'
              : 'Моё расписание'}
          </h1>

          <p>
            {student.school} ·{' '}
            {student.className}
          </p>
        </div>

        {user.role === 'Родитель' &&
          linkedStudents.length > 1 && (
            <select
              className="schedule-student-select"
              value={selectedStudentId}
              onChange={(event) =>
                setSelectedStudentId(
                  event.target.value,
                )
              }
            >
              {linkedStudents.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ),
              )}
            </select>
          )}
      </header>

      <section className="schedule-student-hero">
        <div>
          <span>
            Сегодня: {today}
          </span>

          <h2>
            {nextLesson
              ? nextLesson.subject
              : 'Уроков больше нет'}
          </h2>

          {nextLesson ? (
            <p>
              Урок №
              {nextLesson.lessonNumber} ·{' '}
              {nextLesson.startTime}–
              {nextLesson.endTime}
              {nextLesson.classroom
                ? ` · кабинет ${nextLesson.classroom}`
                : ''}
            </p>
          ) : (
            <p>
              На сегодня ближайших уроков
              нет.
            </p>
          )}
        </div>

        <div className="schedule-hero-icon">
          📚
        </div>
      </section>

      <div className="schedule-day-tabs">
        {days.map((day) => (
          <button
            type="button"
            key={day}
            className={
              selectedDay === day
                ? 'schedule-day-button active'
                : day === today
                  ? 'schedule-day-button today'
                  : 'schedule-day-button'
            }
            onClick={() =>
              setSelectedDay(day)
            }
          >
            <span>
              {getShortDay(day)}
            </span>

            {day === today && (
              <small>Сегодня</small>
            )}
          </button>
        ))}
      </div>

      <section className="content-card">
        <div className="schedule-list-header">
          <div>
            <h2>{selectedDay}</h2>

            <p>
              Уроков:{' '}
              {selectedDayLessons.length}
            </p>
          </div>
        </div>

        <div className="student-schedule-list">
          {selectedDayLessons.length ===
            0 && (
            <div className="schedule-empty">
              <span>🎉</span>

              <h3>Уроков нет</h3>

              <p>
                На этот день расписание
                пока не добавлено.
              </p>
            </div>
          )}

          {selectedDayLessons.map(
            (lesson) => (
              <article
                className={
                  selectedDay === today &&
                  nextLesson?.id === lesson.id
                    ? 'student-schedule-item current'
                    : 'student-schedule-item'
                }
                key={lesson.id}
              >
                <div className="schedule-time-column">
                  <strong>
                    {lesson.startTime}
                  </strong>

                  <span>
                    {lesson.endTime}
                  </span>
                </div>

                <div className="schedule-number-circle">
                  {lesson.lessonNumber}
                </div>

                <div className="student-schedule-main">
                  <strong>
                    {lesson.subject}
                  </strong>

                  <p>
                    Учитель:{' '}
                    {lesson.teacherName}
                  </p>

                  {lesson.description && (
                    <span>
                      {lesson.description}
                    </span>
                  )}
                </div>

                <div className="schedule-classroom">
                  {lesson.classroom
                    ? `🚪 ${lesson.classroom}`
                    : '—'}
                </div>
              </article>
            ),
          )}
        </div>
      </section>
    </div>
  )
}

function getShortDay(day) {
  const shortDays = {
    Понедельник: 'Пн',
    Вторник: 'Вт',
    Среда: 'Ср',
    Четверг: 'Чт',
    Пятница: 'Пт',
    Суббота: 'Сб',
  }

  return shortDays[day]
}

export default StudentSchedulePage