import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DoorOpen,
  GraduationCap,
  MapPin,
  RefreshCcw,
  School,
  Sparkles,
  UserRound,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  getLinkedStudents,
} from '../services/parentService'

import {
  getNextLessonFromSchedule,
  getScheduleForStudent,
  getTodayName,
} from '../services/supabaseScheduleService'


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

  const [
    schedule,
    setSchedule,
  ] = useState([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    scheduleError,
    setScheduleError,
  ] = useState('')


  const linkedStudents =
    useMemo(
      () =>
        user?.role ===
        'Родитель'
          ? getLinkedStudents(
              user.id,
            )
          : [],
      [
        user,
      ],
    )


  const [
    selectedStudentId,
    setSelectedStudentId,
  ] = useState(
    linkedStudents[0]?.id ||
      '',
  )


  useEffect(() => {
    if (
      user?.role ===
        'Родитель' &&
      linkedStudents.length >
        0 &&
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
    user?.role ===
    'Ученик'
      ? user
      : linkedStudents.find(
          (item) =>
            item.id ===
            selectedStudentId,
        )


  const today =
    getTodayName()


  const [
    selectedDay,
    setSelectedDay,
  ] = useState(
    days.includes(today)
      ? today
      : 'Понедельник',
  )


  useEffect(() => {
    void loadSchedule()
  }, [
    student?.id,
    student?.school,
    student?.className,
    student?.class_name,
  ])


  async function loadSchedule() {
    if (!student) {
      setSchedule([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setScheduleError('')

      const lessons =
        await getScheduleForStudent(
          student,
        )

      setSchedule(
        lessons || [],
      )
    } catch (error) {
      setSchedule([])

      setScheduleError(
        error.message ||
          'Не удалось загрузить расписание',
      )
    } finally {
      setLoading(false)
    }
  }


  const selectedDayLessons =
    schedule
      .filter(
        (lesson) =>
          lesson.day ===
          selectedDay,
      )
      .sort(
        (
          firstLesson,
          secondLesson,
        ) =>
          Number(
            firstLesson.lessonNumber ||
              0,
          ) -
          Number(
            secondLesson.lessonNumber ||
              0,
          ),
      )


  const nextLesson =
    getNextLessonFromSchedule(
      schedule,
    )


  const todayLessonsCount =
    schedule.filter(
      (lesson) =>
        lesson.day === today,
    ).length


  function selectPreviousDay() {
    const currentIndex =
      days.indexOf(
        selectedDay,
      )

    const previousIndex =
      currentIndex <= 0
        ? days.length - 1
        : currentIndex - 1

    setSelectedDay(
      days[previousIndex],
    )
  }


  function selectNextDay() {
    const currentIndex =
      days.indexOf(
        selectedDay,
      )

    const nextIndex =
      currentIndex >=
      days.length - 1
        ? 0
        : currentIndex + 1

    setSelectedDay(
      days[nextIndex],
    )
  }


  if (
    user?.role !==
      'Ученик' &&
    user?.role !==
      'Родитель'
  ) {
    return (
      <div className="schedule-page">

        <ScheduleEmptyState
          icon={
            CalendarDays
          }
          title="Доступ запрещён"
          text="Эта страница доступна ученикам и родителям."
        />

      </div>
    )
  }


  /*
   * Новый интерфейс
   * ТОЛЬКО для родителя.
   *
   * Ученический вариант
   * ниже остаётся прежним.
   */
  if (
    user.role ===
    'Родитель'
  ) {
    return (
      <>
        <ParentScheduleStyles />

        <ParentScheduleView
          student={
            student
          }
          linkedStudents={
            linkedStudents
          }
          selectedStudentId={
            selectedStudentId
          }
          setSelectedStudentId={
            setSelectedStudentId
          }
          schedule={
            schedule
          }
          loading={
            loading
          }
          error={
            scheduleError
          }
          selectedDay={
            selectedDay
          }
          setSelectedDay={
            setSelectedDay
          }
          selectedDayLessons={
            selectedDayLessons
          }
          today={
            today
          }
          nextLesson={
            nextLesson
          }
          reload={
            loadSchedule
          }
        />
      </>
    )
  }


  /*
   * Ниже оставляем
   * ученический интерфейс.
   */

  if (!student) {
    return (
      <div className="schedule-page">

        <header className="schedule-page-header">

          <div className="schedule-page-header-icon">
            <CalendarDays
              size={27}
            />
          </div>

          <div>

            <p>
              Учебный процесс
            </p>

            <h1>
              Расписание
            </h1>

            <span>
              Расписание пока
              недоступно.
            </span>

          </div>

        </header>


        <ScheduleEmptyState
          icon={
            UserRound
          }
          title="Профиль не найден"
          text="Не удалось определить ученика."
        />

      </div>
    )
  }


  if (loading) {
    return (
      <div className="schedule-page">

        <ScheduleEmptyState
          icon={
            CalendarDays
          }
          title="Загрузка расписания"
          text="Получаем уроки из Supabase..."
        />

      </div>
    )
  }


  if (scheduleError) {
    return (
      <div className="schedule-page">

        <ScheduleEmptyState
          icon={
            CalendarDays
          }
          title="Не удалось загрузить расписание"
          text={
            scheduleError
          }
        />

      </div>
    )
  }


  return (
    <div className="schedule-page">

      <header className="schedule-page-header">

        <div className="schedule-page-header-icon">
          <CalendarDays
            size={27}
          />
        </div>


        <div className="schedule-page-header-content">

          <p>
            Учебный процесс
          </p>

          <h1>
            Моё расписание
          </h1>


          <div className="schedule-student-meta">

            <span>
              <School
                size={15}
              />

              {student.school ||
                'Школа не указана'}
            </span>


            <span>
              <GraduationCap
                size={15}
              />

              {getStudentClass(
                student,
              ) ||
                'Класс не указан'}
            </span>

          </div>

        </div>

      </header>


      <section className="schedule-next-lesson-card">

        <div className="schedule-next-lesson-content">

          <div className="schedule-next-lesson-label">

            <Sparkles
              size={16}
            />

            Сегодня, {
              today
            }

          </div>


          <h2>

            {nextLesson
              ? nextLesson.subject
              : 'Уроков больше нет'}

          </h2>


          {nextLesson ? (
            <>

              <p>
                Следующий урок
                начинается в{' '}

                <strong>
                  {
                    nextLesson.startTime
                  }
                </strong>
              </p>


              <div className="schedule-next-meta">

                <span>

                  <Clock3
                    size={16}
                  />

                  {
                    nextLesson.startTime
                  }
                  –
                  {
                    nextLesson.endTime
                  }

                </span>


                <span>

                  <BookOpen
                    size={16}
                  />

                  Урок №
                  {
                    nextLesson.lessonNumber
                  }

                </span>


                {nextLesson.classroom && (
                  <span>

                    <DoorOpen
                      size={16}
                    />

                    Кабинет{' '}
                    {
                      nextLesson.classroom
                    }

                  </span>
                )}

              </div>

            </>
          ) : (
            <p>
              На сегодня ближайших
              уроков нет.
            </p>
          )}

        </div>


        <div className="schedule-next-lesson-badge">

          <span>
            {
              todayLessonsCount
            }
          </span>

          <small>
            уроков сегодня
          </small>

        </div>

      </section>


      <section className="schedule-days-panel">

        <button
          type="button"
          className="schedule-arrow-button"
          onClick={
            selectPreviousDay
          }
          aria-label="Предыдущий день"
        >
          <ChevronLeft
            size={20}
          />
        </button>


        <div className="modern-schedule-day-tabs">

          {days.map(
            (day) => (
              <button
                type="button"
                key={
                  day
                }
                className={
                  selectedDay ===
                  day
                    ? 'modern-schedule-day-button modern-schedule-day-button--active'
                    : day ===
                        today
                      ? 'modern-schedule-day-button modern-schedule-day-button--today'
                      : 'modern-schedule-day-button'
                }
                onClick={() =>
                  setSelectedDay(
                    day,
                  )
                }
              >

                <span>
                  {
                    getShortDay(
                      day,
                    )
                  }
                </span>


                <small>

                  {day ===
                  today
                    ? 'Сегодня'
                    : day.slice(
                        0,
                        3,
                      )}

                </small>

              </button>
            ),
          )}

        </div>


        <button
          type="button"
          className="schedule-arrow-button"
          onClick={
            selectNextDay
          }
          aria-label="Следующий день"
        >
          <ChevronRight
            size={20}
          />
        </button>

      </section>


      <section className="modern-schedule-section">

        <div className="modern-schedule-section-heading">

          <div>

            <p>
              Учебный день
            </p>

            <h2>
              {
                selectedDay
              }
            </h2>

          </div>


          <span>

            {
              selectedDayLessons.length
            }{' '}

            {getLessonWord(
              selectedDayLessons.length,
            )}

          </span>

        </div>


        {selectedDayLessons.length ===
        0 ? (
          <ScheduleEmptyState
            icon={
              Sparkles
            }
            title="Уроков нет"
            text="На этот день расписание пока не добавлено."
          />
        ) : (
          <div className="modern-schedule-list">

            {selectedDayLessons.map(
              (
                lesson,
                index,
              ) => {
                const isCurrentLesson =
                  selectedDay ===
                    today &&
                  nextLesson?.id ===
                    lesson.id

                return (
                  <article
                    className={
                      isCurrentLesson
                        ? 'modern-schedule-card modern-schedule-card--current'
                        : 'modern-schedule-card'
                    }
                    key={
                      lesson.id
                    }
                  >

                    <div className="modern-schedule-time">

                      <strong>
                        {
                          lesson.startTime
                        }
                      </strong>

                      <span>
                        {
                          lesson.endTime
                        }
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
                          index +
                            1}

                      </span>

                    </div>


                    <div className="modern-schedule-content">

                      <div className="modern-schedule-title-row">

                        <div>

                          <span>
                            Урок №
                            {lesson.lessonNumber ||
                              index +
                                1}
                          </span>

                          <h3>
                            {
                              lesson.subject
                            }
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

                          <UserRound
                            size={16}
                          />

                          {lesson.teacherName ||
                            'Учитель не указан'}

                        </span>


                        {lesson.classroom && (
                          <span>

                            <MapPin
                              size={16}
                            />

                            Кабинет{' '}
                            {
                              lesson.classroom
                            }

                          </span>
                        )}

                      </div>


                      {lesson.description && (
                        <p className="modern-schedule-description">
                          {
                            lesson.description
                          }
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


function ParentScheduleView({
  student,
  linkedStudents,
  selectedStudentId,
  setSelectedStudentId,
  schedule,
  loading,
  error,
  selectedDay,
  setSelectedDay,
  selectedDayLessons,
  today,
  nextLesson,
  reload,
}) {
  const weekDates =
    getWeekDates()


  if (!student) {
    return (
      <div className="parent-schedule-page">

        <ParentScheduleEmpty
          icon={
            UserRound
          }
          title="Ребёнок не привязан"
          text="Сначала привяжите ребёнка в родительском кабинете."
        />

      </div>
    )
  }


  return (
    <div className="parent-schedule-page">

      <header className="parent-schedule-header">

        <div>

          <span>
            Учебный процесс
          </span>

          <h1>
            Расписание
          </h1>

        </div>


        <button
          type="button"
          onClick={
            reload
          }
          disabled={
            loading
          }
          aria-label="Обновить расписание"
        >
          <RefreshCcw
            size={19}
          />
        </button>

      </header>


      <section className="parent-schedule-student">

        <div className="parent-schedule-avatar">
          {getInitials(
            student.name,
          )}
        </div>


        <div className="parent-schedule-student-info">

          <span>
            Расписание ребёнка
          </span>


          {linkedStudents.length >
          1 ? (
            <select
              value={
                selectedStudentId
              }
              onChange={(
                event,
              ) =>
                setSelectedStudentId(
                  event.target
                    .value,
                )
              }
            >

              {linkedStudents.map(
                (
                  item,
                ) => (
                  <option
                    key={
                      item.id
                    }
                    value={
                      item.id
                    }
                  >
                    {
                      item.name
                    }
                  </option>
                ),
              )}

            </select>
          ) : (
            <strong>
              {
                student.name
              }
            </strong>
          )}


          <div>

            <span>

              <School
                size={14}
              />

              {student.school ||
                'Школа не указана'}

            </span>


            <span>

              <GraduationCap
                size={14}
              />

              {getStudentClass(
                student,
              ) ||
                'Класс не указан'}

            </span>

          </div>

        </div>

      </section>


      <section className="parent-schedule-week">

        {days.map(
          (
            day,
            index,
          ) => {
            const date =
              weekDates[index]

            const active =
              selectedDay ===
              day

            const isToday =
              today ===
              day

            return (
              <button
                type="button"
                key={
                  day
                }
                className={[
                  'parent-schedule-day',

                  active
                    ? 'active'
                    : '',

                  isToday &&
                  !active
                    ? 'today'
                    : '',
                ]
                  .filter(
                    Boolean,
                  )
                  .join(' ')}
                onClick={() =>
                  setSelectedDay(
                    day,
                  )
                }
              >

                <span>
                  {
                    getShortDay(
                      day,
                    )
                  }
                </span>

                <strong>
                  {
                    date.day
                  }
                </strong>

                <small>
                  {
                    date.month
                  }
                </small>

              </button>
            )
          },
        )}

      </section>


      {error && (
        <div className="parent-schedule-error">
          {error}
        </div>
      )}


      {loading ? (
        <ParentScheduleEmpty
          icon={
            RefreshCcw
          }
          title="Загружаем расписание"
          text="Получаем уроки из школьного расписания..."
        />
      ) : (
        <>

          {nextLesson &&
            selectedDay ===
              today && (
            <section className="parent-next-lesson">

              <div className="parent-next-label">

                <Sparkles
                  size={15}
                />

                Следующий урок

              </div>


              <div className="parent-next-main">

                <div>

                  <span>

                    <Clock3
                      size={15}
                    />

                    {
                      nextLesson.startTime
                    }
                    –
                    {
                      nextLesson.endTime
                    }

                  </span>

                  <h2>
                    {
                      nextLesson.subject
                    }
                  </h2>

                </div>


                <div className="parent-next-number">
                  {nextLesson.lessonNumber ||
                    '—'}
                </div>

              </div>

            </section>
          )}


          <section className="parent-schedule-lessons">

            <div className="parent-schedule-section-heading">

              <div>

                <span>
                  Учебный день
                </span>

                <h2>
                  {
                    selectedDay
                  }
                </h2>

              </div>


              <strong>

                {
                  selectedDayLessons.length
                }{' '}

                {getLessonWord(
                  selectedDayLessons.length,
                )}

              </strong>

            </div>


            {selectedDayLessons.length ===
            0 ? (
              <ParentScheduleEmpty
                icon={
                  CalendarDays
                }
                title="Уроков нет"
                text="На этот день расписание пока не добавлено."
              />
            ) : (
              <div className="parent-lesson-list">

                {selectedDayLessons.map(
                  (
                    lesson,
                    index,
                  ) => (
                    <article
                      className="parent-lesson-card"
                      key={
                        lesson.id
                      }
                    >

                      <div className="parent-lesson-time">

                        <strong>
                          {
                            lesson.startTime
                          }
                        </strong>

                        <span>
                          {
                            lesson.endTime
                          }
                        </span>

                      </div>


                      <div className="parent-lesson-body">

                        <div className="parent-lesson-title">

                          <span>
                            {lesson.lessonNumber ||
                              index +
                                1}
                          </span>

                          <h3>
                            {
                              lesson.subject
                            }
                          </h3>

                        </div>


                        <div className="parent-lesson-details">

                          <span>

                            <UserRound
                              size={14}
                            />

                            {lesson.teacherName ||
                              'Учитель не указан'}

                          </span>


                          {lesson.classroom && (
                            <span>

                              <DoorOpen
                                size={14}
                              />

                              Кабинет{' '}
                              {
                                lesson.classroom
                              }

                            </span>
                          )}

                        </div>


                        {lesson.description && (
                          <div className="parent-lesson-description">

                            <BookOpen
                              size={14}
                            />

                            <span>
                              {
                                lesson.description
                              }
                            </span>

                          </div>
                        )}

                      </div>

                    </article>
                  ),
                )}

              </div>
            )}

          </section>


          {schedule.length ===
            0 && (
            <div className="parent-schedule-note">
              Расписание для этого
              класса пока пустое.
            </div>
          )}

        </>
      )}

    </div>
  )
}


function ParentScheduleEmpty({
  icon: Icon,
  title,
  text,
}) {
  return (
    <section className="parent-schedule-empty">

      <div>
        <Icon
          size={23}
        />
      </div>

      <span>

        <strong>
          {title}
        </strong>

        <small>
          {text}
        </small>

      </span>

    </section>
  )
}


function ParentScheduleStyles() {
  return (
    <style>{`
      .parent-schedule-page,
      .parent-schedule-page * {
        box-sizing: border-box;
      }

      .parent-schedule-page {
        width: 100%;
        display: grid;
        gap: 14px;
        color: #0f274d;
      }

      .parent-schedule-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }

      .parent-schedule-header > div > span,
      .parent-schedule-section-heading > div > span {
        display: block;
        color: #8ca0be;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .06em;
        text-transform: uppercase;
      }

      .parent-schedule-header h1 {
        margin: 3px 0 0;
        font-size: 26px;
        line-height: 1.1;
        color: #082451;
      }

      .parent-schedule-header > button {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border: 1px solid #d8e5f5;
        border-radius: 13px;
        background: #fff;
        color: #2563eb;
        cursor: pointer;
      }

      .parent-schedule-header > button:disabled {
        opacity: .55;
      }

      .parent-schedule-student {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 12px;
        border: 1px solid #dbeafe;
        border-radius: 17px;
        background:
          linear-gradient(
            135deg,
            #eff6ff,
            #ffffff
          );
      }

      .parent-schedule-avatar {
        width: 43px;
        height: 43px;
        flex: 0 0 43px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        background:
          linear-gradient(
            145deg,
            #2563eb,
            #4f46e5
          );
        color: white;
        font-size: 13px;
        font-weight: 900;
      }

      .parent-schedule-student-info {
        min-width: 0;
        flex: 1;
      }

      .parent-schedule-student-info > span {
        display: block;
        color: #8ca0be;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .parent-schedule-student-info > strong {
        display: block;
        margin-top: 2px;
        color: #082451;
        font-size: 14px;
      }

      .parent-schedule-student-info select {
        width: 100%;
        max-width: 280px;
        margin-top: 2px;
        padding: 0;
        border: 0;
        background: transparent;
        color: #082451;
        font: inherit;
        font-weight: 900;
        outline: none;
      }

      .parent-schedule-student-info > div {
        display: flex;
        flex-wrap: wrap;
        gap: 5px 12px;
        margin-top: 6px;
      }

      .parent-schedule-student-info > div span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #64748b;
        font-size: 10px;
      }

      .parent-schedule-week {
        display: grid;
        grid-template-columns:
          repeat(6, minmax(64px, 1fr));
        gap: 6px;
        overflow-x: auto;
        padding: 2px 0 4px;
        scrollbar-width: none;
      }

      .parent-schedule-week::-webkit-scrollbar {
        display: none;
      }

      .parent-schedule-day {
        min-width: 64px;
        min-height: 76px;
        padding: 8px 4px;
        border: 1px solid #dce7f3;
        border-radius: 15px;
        background: #fff;
        color: #71839e;
        cursor: pointer;
      }

      .parent-schedule-day span,
      .parent-schedule-day strong,
      .parent-schedule-day small {
        display: block;
        text-align: center;
      }

      .parent-schedule-day span {
        font-size: 9px;
        font-weight: 900;
      }

      .parent-schedule-day strong {
        margin-top: 4px;
        color: #0f274d;
        font-size: 18px;
        line-height: 1;
      }

      .parent-schedule-day small {
        margin-top: 4px;
        font-size: 8px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .parent-schedule-day.today {
        border-color: #93c5fd;
        background: #eff6ff;
      }

      .parent-schedule-day.active {
        border-color: transparent;
        background:
          linear-gradient(
            145deg,
            #2563eb,
            #4f46e5
          );
        color: rgba(255,255,255,.82);
        box-shadow:
          0 8px 20px
          rgba(37,99,235,.18);
      }

      .parent-schedule-day.active strong {
        color: #fff;
      }

      .parent-schedule-error {
        padding: 11px 12px;
        border: 1px solid #fecaca;
        border-radius: 12px;
        background: #fef2f2;
        color: #b91c1c;
        font-size: 11px;
        font-weight: 800;
      }

      .parent-next-lesson {
        padding: 15px;
        border: 1px solid #dbeafe;
        border-radius: 18px;
        background:
          radial-gradient(
            circle at 90% 0%,
            rgba(96,165,250,.15),
            transparent 35%
          ),
          #fff;
      }

      .parent-next-label {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: #2563eb;
        font-size: 9px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .parent-next-main {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        margin-top: 8px;
      }

      .parent-next-main span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: #64748b;
        font-size: 10px;
      }

      .parent-next-main h2 {
        margin: 4px 0 0;
        color: #082451;
        font-size: 18px;
      }

      .parent-next-number {
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        background: #eff6ff;
        color: #2563eb;
        font-size: 18px;
        font-weight: 900;
      }

      .parent-schedule-lessons {
        padding: 15px;
        border: 1px solid #e0eaf5;
        border-radius: 19px;
        background: #fff;
      }

      .parent-schedule-section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 12px;
      }

      .parent-schedule-section-heading h2 {
        margin: 3px 0 0;
        color: #082451;
        font-size: 18px;
      }

      .parent-schedule-section-heading > strong {
        padding: 6px 8px;
        border-radius: 9px;
        background: #eff6ff;
        color: #2563eb;
        font-size: 9px;
      }

      .parent-lesson-list {
        display: grid;
        gap: 9px;
      }

      .parent-lesson-card {
        display: flex;
        min-width: 0;
        overflow: hidden;
        border: 1px solid #e2ebf5;
        border-radius: 16px;
        background: #fbfdff;
      }

      .parent-lesson-time {
        width: 72px;
        flex: 0 0 72px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        padding: 12px 7px;
        border-right: 1px solid #e4edf7;
        background: #f4f8ff;
      }

      .parent-lesson-time strong {
        color: #1d4ed8;
        font-size: 13px;
      }

      .parent-lesson-time span {
        margin-top: 3px;
        color: #64748b;
        font-size: 10px;
      }

      .parent-lesson-body {
        flex: 1;
        min-width: 0;
        padding: 11px;
      }

      .parent-lesson-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .parent-lesson-title > span {
        width: 28px;
        height: 28px;
        flex: 0 0 28px;
        display: grid;
        place-items: center;
        border-radius: 9px;
        background: #eff6ff;
        color: #2563eb;
        font-size: 11px;
        font-weight: 900;
      }

      .parent-lesson-title h3 {
        min-width: 0;
        margin: 0;
        color: #082451;
        font-size: 14px;
      }

      .parent-lesson-details {
        display: flex;
        flex-wrap: wrap;
        gap: 6px 12px;
        margin-top: 9px;
      }

      .parent-lesson-details span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #64748b;
        font-size: 9px;
      }

      .parent-lesson-description {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        margin-top: 9px;
        padding-top: 8px;
        border-top: 1px solid #edf2f7;
        color: #475569;
        font-size: 10px;
        line-height: 1.45;
      }

      .parent-lesson-description svg {
        flex: 0 0 auto;
        margin-top: 1px;
        color: #2563eb;
      }

      .parent-schedule-empty {
        display: flex;
        align-items: center;
        gap: 11px;
        min-height: 96px;
        padding: 14px;
        border: 1px dashed #d5e2f0;
        border-radius: 15px;
        background: #fbfdff;
      }

      .parent-schedule-empty > div {
        width: 41px;
        height: 41px;
        flex: 0 0 41px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: #eff6ff;
        color: #2563eb;
      }

      .parent-schedule-empty strong,
      .parent-schedule-empty small {
        display: block;
      }

      .parent-schedule-empty strong {
        color: #082451;
        font-size: 12px;
      }

      .parent-schedule-empty small {
        margin-top: 3px;
        color: #64748b;
        font-size: 9px;
        line-height: 1.45;
      }

      .parent-schedule-note {
        padding: 10px;
        border-radius: 11px;
        background: #f8fafc;
        color: #64748b;
        font-size: 10px;
        text-align: center;
      }

      @media (max-width: 600px) {
        .parent-schedule-header h1 {
          font-size: 22px;
        }

        .parent-schedule-week {
          grid-template-columns:
            repeat(6, 64px);
        }

        .parent-schedule-day {
          min-height: 70px;
        }

        .parent-schedule-day strong {
          font-size: 16px;
        }

        .parent-schedule-lessons {
          padding: 11px;
          border-radius: 16px;
        }

        .parent-lesson-time {
          width: 64px;
          flex-basis: 64px;
        }

        .parent-lesson-title h3 {
          font-size: 13px;
        }

        .parent-next-main h2 {
          font-size: 16px;
        }
      }
    `}</style>
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

        <Icon
          size={30}
        />

      </div>

      <h2>
        {title}
      </h2>

      <p>
        {text}
      </p>

    </section>
  )
}


function getWeekDates() {
  const now =
    new Date()

  now.setHours(
    12,
    0,
    0,
    0,
  )

  const weekday =
    now.getDay()

  const distanceToMonday =
    weekday === 0
      ? -6
      : 1 - weekday

  const monday =
    new Date(now)

  monday.setDate(
    now.getDate() +
      distanceToMonday,
  )

  return days.map(
    (
      _,
      index,
    ) => {
      const date =
        new Date(monday)

      date.setDate(
        monday.getDate() +
          index,
      )

      return {
        day:
          String(
            date.getDate(),
          ),

        month:
          date
            .toLocaleDateString(
              'ru-RU',
              {
                month:
                  'short',
              },
            )
            .replace(
              '.',
              '',
            ),
      }
    },
  )
}


function getStudentClass(
  student,
) {
  return (
    student?.className ||
    student?.class_name ||
    ''
  )
}


function getInitials(
  name,
) {
  if (!name) {
    return 'У'
  }

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]
          ?.toUpperCase() ||
        '',
    )
    .join('')
}


function getShortDay(
  day,
) {
  const shortDays = {
    Понедельник:
      'ПН',

    Вторник:
      'ВТ',

    Среда:
      'СР',

    Четверг:
      'ЧТ',

    Пятница:
      'ПТ',

    Суббота:
      'СБ',
  }

  return (
    shortDays[day] ||
    day
  )
}


function getLessonWord(
  count,
) {
  const value =
    Math.abs(
      count,
    ) % 100

  const lastDigit =
    value % 10

  if (
    value > 10 &&
    value < 20
  ) {
    return 'уроков'
  }

  if (
    lastDigit === 1
  ) {
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