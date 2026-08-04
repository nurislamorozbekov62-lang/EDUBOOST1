import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DoorOpen,
  GraduationCap,
  MapPin,
  School,
  Sparkles,
  UserRound,
} from 'lucide-react'

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
      user?.role === 'Родитель'
        ? getLinkedStudents(user.id)
        : [],
    [user],
  )

  const [
    selectedStudentId,
    setSelectedStudentId,
  ] = useState(
    linkedStudents[0]?.id || '',
  )

  useEffect(() => {
    if (
      user?.role === 'Родитель' &&
      linkedStudents.length > 0 &&
      !selectedStudentId
    ) {
      setSelectedStudentId(
        linkedStudents[0].id,
      )
    }
  }, [
    user?.role,
    linkedStudents,
    selectedStudentId,
  ])

  const student =
    user?.role === 'Ученик'
      ? user
      : linkedStudents.find(
          (item) =>
            item.id === selectedStudentId,
        )

  const today = getTodayName()

  const [
    selectedDay,
    setSelectedDay,
  ] = useState(
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
    schedule
      .filter(
        (lesson) =>
          lesson.day === selectedDay,
      )
      .sort(
        (firstLesson, secondLesson) =>
          Number(
            firstLesson.lessonNumber || 0,
          ) -
          Number(
            secondLesson.lessonNumber || 0,
          ),
      )

  const nextLesson = student
    ? getNextLesson(
        student.school,
        student.className,
      )
    : null

  const todayLessonsCount =
    schedule.filter(
      (lesson) => lesson.day === today,
    ).length

  function selectPreviousDay() {
    const currentIndex =
      days.indexOf(selectedDay)

    const previousIndex =
      currentIndex <= 0
        ? days.length - 1
        : currentIndex - 1

    setSelectedDay(days[previousIndex])
  }

  function selectNextDay() {
    const currentIndex =
      days.indexOf(selectedDay)

    const nextIndex =
      currentIndex >= days.length - 1
        ? 0
        : currentIndex + 1

    setSelectedDay(days[nextIndex])
  }

  if (
    user?.role !== 'Ученик' &&
    user?.role !== 'Родитель'
  ) {
    return (
      <div className="schedule-page">
        <ScheduleEmptyState
          icon={CalendarDays}
          title="Доступ запрещён"
          text="Эта страница доступна ученикам и родителям."
        />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="schedule-page">
        <header className="schedule-page-header">
          <div className="schedule-page-header-icon">
            <CalendarDays size={27} />
          </div>

          <div>
            <p>Учебный процесс</p>
            <h1>Расписание</h1>

            <span>
              Сначала привяжите аккаунт ребёнка.
            </span>
          </div>
        </header>

        <ScheduleEmptyState
          icon={UserRound}
          title="Ребёнок не привязан"
          text="Откройте родительский кабинет и введите код ученика."
        />
      </div>
    )
  }

  return (
    <div className="schedule-page">
      <header className="schedule-page-header">
        <div className="schedule-page-header-icon">
          <CalendarDays size={27} />
        </div>

        <div className="schedule-page-header-content">
          <p>Учебный процесс</p>

          <h1>
            {user.role === 'Родитель'
              ? 'Расписание ребёнка'
              : 'Моё расписание'}
          </h1>

          <div className="schedule-student-meta">
            <span>
              <School size={15} />
              {student.school ||
                'Школа не указана'}
            </span>

            <span>
              <GraduationCap size={15} />
              {student.className ||
                'Класс не указан'}
            </span>
          </div>
        </div>

        {user.role === 'Родитель' &&
          linkedStudents.length > 1 && (
            <select
              className="modern-schedule-student-select"
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

      <section className="schedule-next-lesson-card">
        <div className="schedule-next-lesson-content">
          <div className="schedule-next-lesson-label">
            <Sparkles size={16} />
            Сегодня, {today}
          </div>

          <h2>
            {nextLesson
              ? nextLesson.subject
              : 'Уроков больше нет'}
          </h2>

          {nextLesson ? (
            <>
              <p>
                Следующий урок начинается в{' '}
                <strong>
                  {nextLesson.startTime}
                </strong>
              </p>

              <div className="schedule-next-meta">
                <span>
                  <Clock3 size={16} />
                  {nextLesson.startTime}–
                  {nextLesson.endTime}
                </span>

                <span>
                  <BookOpen size={16} />
                  Урок №
                  {nextLesson.lessonNumber}
                </span>

                {nextLesson.classroom && (
                  <span>
                    <DoorOpen size={16} />
                    Кабинет{' '}
                    {nextLesson.classroom}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p>
              На сегодня ближайших уроков нет.
            </p>
          )}
        </div>

        <div className="schedule-next-lesson-badge">
          <span>{todayLessonsCount}</span>
          <small>уроков сегодня</small>
        </div>
      </section>

      <section className="schedule-days-panel">
        <button
          type="button"
          className="schedule-arrow-button"
          onClick={selectPreviousDay}
          aria-label="Предыдущий день"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="modern-schedule-day-tabs">
          {days.map((day) => (
            <button
              type="button"
              key={day}
              className={
                selectedDay === day
                  ? 'modern-schedule-day-button modern-schedule-day-button--active'
                  : day === today
                    ? 'modern-schedule-day-button modern-schedule-day-button--today'
                    : 'modern-schedule-day-button'
              }
              onClick={() =>
                setSelectedDay(day)
              }
            >
              <span>{getShortDay(day)}</span>

              <small>
                {day === today
                  ? 'Сегодня'
                  : day.slice(0, 3)}
              </small>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="schedule-arrow-button"
          onClick={selectNextDay}
          aria-label="Следующий день"
        >
          <ChevronRight size={20} />
        </button>
      </section>

      <section className="modern-schedule-section">
        <div className="modern-schedule-section-heading">
          <div>
            <p>Учебный день</p>
            <h2>{selectedDay}</h2>
          </div>

          <span>
            {selectedDayLessons.length}{' '}
            {getLessonWord(
              selectedDayLessons.length,
            )}
          </span>
        </div>

        {selectedDayLessons.length === 0 ? (
          <ScheduleEmptyState
            icon={Sparkles}
            title="Уроков нет"
            text="На этот день расписание пока не добавлено."
          />
        ) : (
          <div className="modern-schedule-list">
            {selectedDayLessons.map(
              (lesson, index) => {
                const isCurrentLesson =
                  selectedDay === today &&
                  nextLesson?.id === lesson.id

                return (
                  <article
                    className={
                      isCurrentLesson
                        ? 'modern-schedule-card modern-schedule-card--current'
                        : 'modern-schedule-card'
                    }
                    key={lesson.id}
                  >
                    <div className="modern-schedule-time">
                      <strong>
                        {lesson.startTime}
                      </strong>

                      <span>
                        {lesson.endTime}
                      </span>
                    </div>

                    <div className="modern-schedule-line">
                      <span
                        className={
                          isCurrentLesson
                            ? 'modern-schedule-number modern-schedule-number--current'
                            : 'modern-schedule-number'
                        }
                      >
                        {lesson.lessonNumber ||
                          index + 1}
                      </span>
                    </div>

                    <div className="modern-schedule-content">
                      <div className="modern-schedule-title-row">
                        <div>
                          <span>
                            Урок №
                            {lesson.lessonNumber ||
                              index + 1}
                          </span>

                          <h3>
                            {lesson.subject}
                          </h3>
                        </div>

                        {isCurrentLesson && (
                          <span className="modern-current-badge">
                            Сейчас
                          </span>
                        )}
                      </div>

                      <div className="modern-schedule-details">
                        <span>
                          <UserRound size={16} />
                          {lesson.teacherName ||
                            'Учитель не указан'}
                        </span>

                        {lesson.classroom && (
                          <span>
                            <MapPin size={16} />
                            Кабинет{' '}
                            {lesson.classroom}
                          </span>
                        )}
                      </div>

                      {lesson.description && (
                        <p className="modern-schedule-description">
                          {lesson.description}
                        </p>
                      )}
                    </div>
                  </article>
                )
              },
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function ScheduleEmptyState({
  icon: Icon,
  title,
  text,
}) {
  return (
    <section className="schedule-empty-state">
      <div className="schedule-empty-state-icon">
        <Icon size={30} />
      </div>

      <h2>{title}</h2>
      <p>{text}</p>
    </section>
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

  return shortDays[day] || day
}

function getLessonWord(count) {
  const value = Math.abs(count) % 100
  const lastDigit = value % 10

  if (
    value > 10 &&
    value < 20
  ) {
    return 'уроков'
  }

  if (lastDigit === 1) {
    return 'урок'
  }

  if (
    lastDigit >= 2 &&
    lastDigit <= 4
  ) {
    return 'урока'
  }

  return 'уроков'
}

export default StudentSchedulePage