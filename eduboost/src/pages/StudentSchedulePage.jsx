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

import {
  getSupabaseJournalLessonBySchedule,
} from '../services/supabaseJournalLessonService'

import {
  getSupabaseTasksForJournalLesson,
} from '../services/supabaseTaskService'

import {
  getSupabaseStudentGrades,
} from '../services/supabaseJournalService'

import {
  getAttendanceStatusLabel,
  getSupabaseStudentAttendance,
} from '../services/supabaseAttendanceService'


const DAYS = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
]


/* =========================================================
   PAGE
========================================================= */

function StudentSchedulePage() {
  const {
    user,
  } = useAuth()


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


  /* =======================================================
     LESSON PREVIEW
  ======================================================= */

  const [
    lessonPreview,
    setLessonPreview,
  ] = useState(null)

  const [
    lessonPreviewLoading,
    setLessonPreviewLoading,
  ] = useState(false)

  const [
    lessonPreviewError,
    setLessonPreviewError,
  ] = useState('')


  /* =======================================================
     PARENT CHILDREN
  ======================================================= */

  const linkedStudents =
    useMemo(() => {
      if (
        user?.role !==
        'Родитель'
      ) {
        return []
      }


      return (
        getLinkedStudents(
          user.id,
        ) || []
      )
    }, [
      user?.id,
      user?.role,
    ])


  const [
    selectedStudentId,
    setSelectedStudentId,
  ] = useState('')


  useEffect(() => {
    if (
      user?.role !==
      'Родитель'
    ) {
      return
    }


    if (
      linkedStudents.length ===
      0
    ) {
      setSelectedStudentId('')

      return
    }


    setSelectedStudentId(
      (current) => {
        const exists =
          linkedStudents.some(
            (item) =>
              String(
                item.id,
              ) ===
              String(
                current,
              ),
          )


        if (
          exists
        ) {
          return current
        }


        return (
          linkedStudents[0]?.id ||
          ''
        )
      },
    )
  }, [
    user?.role,
    linkedStudents,
  ])


  /* =======================================================
     ACTIVE STUDENT
  ======================================================= */

  const student =
    user?.role ===
    'Ученик'
      ? user
      : linkedStudents.find(
          (item) =>
            String(
              item.id,
            ) ===
            String(
              selectedStudentId,
            ),
        ) ||
        null


  /* =======================================================
     DAYS
  ======================================================= */

  const today =
    getTodayName()


  const [
    selectedDay,
    setSelectedDay,
  ] = useState(
    DAYS.includes(
      today,
    )
      ? today
      : 'Понедельник',
  )


  /* =======================================================
     LOAD SCHEDULE
  ======================================================= */

  useEffect(() => {
    void loadSchedule()
  }, [
    student?.id,
    student?.school,
    student?.schoolId,
    student?.className,
    student?.class_name,
  ])


  async function loadSchedule() {
    if (
      !student
    ) {
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
        Array.isArray(
          lessons,
        )
          ? lessons
          : [],
      )
    } catch (
      error
    ) {
      console.error(
        'Student schedule:',
        error,
      )


      setSchedule([])


      setScheduleError(
        error?.message ||
          'Не удалось загрузить расписание.',
      )
    } finally {
      setLoading(false)
    }
  }


  /* =======================================================
     SELECTED DAY LESSONS
  ======================================================= */

  const selectedDayLessons =
    useMemo(
      () =>
        schedule
          .filter(
            (lesson) =>
              lesson.day ===
              selectedDay,
          )
          .sort(
            (
              first,
              second,
            ) => {
              const firstNumber =
                Number(
                  first.lessonNumber ||
                    0,
                )


              const secondNumber =
                Number(
                  second.lessonNumber ||
                    0,
                )


              if (
                firstNumber !==
                secondNumber
              ) {
                return (
                  firstNumber -
                  secondNumber
                )
              }


              return String(
                first.startTime ||
                  '',
              ).localeCompare(
                String(
                  second.startTime ||
                    '',
                ),
              )
            },
          ),
      [
        schedule,
        selectedDay,
      ],
    )


  const nextLesson =
    getNextLessonFromSchedule(
      schedule,
    )


  const todayLessonsCount =
    schedule.filter(
      (lesson) =>
        lesson.day ===
        today,
    ).length


  /* =======================================================
     OPEN LESSON
  ======================================================= */

  async function handleOpenLesson(
    scheduleLesson,
  ) {
    if (
      !student?.id ||
      !scheduleLesson?.id
    ) {
      return
    }


    const lessonDate =
      getDateForDay(
        selectedDay,
      )


    setLessonPreview({
      scheduleLesson,

      lessonDate,

      journalLesson:
        null,

      tasks:
        [],

      grades:
        [],

      attendance:
        null,
    })


    setLessonPreviewLoading(
      true,
    )

    setLessonPreviewError(
      '',
    )


    try {
      const journalLesson =
        await getSupabaseJournalLessonBySchedule({
          scheduleLessonId:
            scheduleLesson.id,

          date:
            lessonDate,
        })


      /*
        Расписание существует,
        но учитель ещё не создал
        фактическую карточку урока.
      */

      if (
        !journalLesson
      ) {
        setLessonPreview({
          scheduleLesson,

          lessonDate,

          journalLesson:
            null,

          tasks:
            [],

          grades:
            [],

          attendance:
            null,
        })

        return
      }


      const [
        tasksResult,
        gradesResult,
        attendanceResult,
      ] =
        await Promise.allSettled([
          getSupabaseTasksForJournalLesson(
            journalLesson.id,
          ),

          getSupabaseStudentGrades(
            student.id,
          ),

          getSupabaseStudentAttendance(
            student.id,
          ),
        ])


      /* ===============================
         TASKS
      =============================== */

      const tasks =
        tasksResult.status ===
          'fulfilled' &&
        Array.isArray(
          tasksResult.value,
        )
          ? tasksResult.value
          : []


      /* ===============================
         GRADES
      =============================== */

      const allGrades =
        gradesResult.status ===
          'fulfilled' &&
        Array.isArray(
          gradesResult.value,
        )
          ? gradesResult.value
          : []


      const lessonGrades =
        allGrades.filter(
          (grade) =>
            String(
              grade.journalLessonId ||
                '',
            ) ===
            String(
              journalLesson.id,
            ),
        )


      /* ===============================
         ATTENDANCE
      =============================== */

      const allAttendance =
        attendanceResult.status ===
          'fulfilled' &&
        Array.isArray(
          attendanceResult.value,
        )
          ? attendanceResult.value
          : []


      const attendance =
        allAttendance.find(
          (record) =>
            String(
              record.journalLessonId ||
                '',
            ) ===
            String(
              journalLesson.id,
            ),
        ) ||
        null


      setLessonPreview({
        scheduleLesson,

        lessonDate,

        journalLesson,

        tasks,

        grades:
          lessonGrades,

        attendance,
      })


      /* ===============================
         PARTIAL LOAD ERRORS
      =============================== */

      const failedParts =
        []


      if (
        tasksResult.status ===
        'rejected'
      ) {
        failedParts.push(
          'домашнее задание',
        )

        console.error(
          tasksResult.reason,
        )
      }


      if (
        gradesResult.status ===
        'rejected'
      ) {
        failedParts.push(
          'оценки',
        )

        console.error(
          gradesResult.reason,
        )
      }


      if (
        attendanceResult.status ===
        'rejected'
      ) {
        failedParts.push(
          'посещаемость',
        )

        console.error(
          attendanceResult.reason,
        )
      }


      if (
        failedParts.length >
        0
      ) {
        setLessonPreviewError(
          `Не удалось загрузить часть данных: ${failedParts.join(
            ', ',
          )}.`,
        )
      }
    } catch (
      error
    ) {
      console.error(
        'School lesson preview:',
        error,
      )


      setLessonPreviewError(
        error?.message ||
          'Не удалось открыть урок.',
      )
    } finally {
      setLessonPreviewLoading(
        false,
      )
    }
  }


  function closeLessonPreview() {
    setLessonPreview(
      null,
    )

    setLessonPreviewError(
      '',
    )
  }


  /* =======================================================
     PREVIOUS / NEXT DAY
  ======================================================= */

  function selectPreviousDay() {
    const currentIndex =
      DAYS.indexOf(
        selectedDay,
      )


    const previousIndex =
      currentIndex <= 0
        ? DAYS.length - 1
        : currentIndex - 1


    setSelectedDay(
      DAYS[
        previousIndex
      ],
    )
  }


  function selectNextDay() {
    const currentIndex =
      DAYS.indexOf(
        selectedDay,
      )


    const nextIndex =
      currentIndex >=
      DAYS.length - 1
        ? 0
        : currentIndex + 1


    setSelectedDay(
      DAYS[
        nextIndex
      ],
    )
  }


  /* =======================================================
     ACCESS
  ======================================================= */

  if (
    user?.role !==
      'Ученик' &&
    user?.role !==
      'Родитель'
  ) {
    return (
      <div
        className="schedule-page"
      >
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


  /* =======================================================
     PARENT
  ======================================================= */

  if (
    user.role ===
    'Родитель'
  ) {
    return (
      <>
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
          reload={
            loadSchedule
          }
          onOpenLesson={
            handleOpenLesson
          }
        />


        {lessonPreview && (
          <SchoolLessonPreviewModal
            preview={
              lessonPreview
            }
            loading={
              lessonPreviewLoading
            }
            error={
              lessonPreviewError
            }
            mode="parent"
            onClose={
              closeLessonPreview
            }
          />
        )}
      </>
    )
  }


  /* =======================================================
     STUDENT EMPTY
  ======================================================= */

  if (
    !student
  ) {
    return (
      <div
        className="schedule-page"
      >
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


  if (
    loading
  ) {
    return (
      <div
        className="schedule-page"
      >
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


  if (
    scheduleError
  ) {
    return (
      <div
        className="schedule-page"
      >
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


  /* =======================================================
     STUDENT
  ======================================================= */

  return (
    <>
      <div
        className="schedule-page"
      >

        {/* ===============================================
            HEADER
        =============================================== */}

        <header
          className="schedule-page-header"
        >

          <div
            className="schedule-page-header-icon"
          >
            <CalendarDays
              size={27}
            />
          </div>


          <div
            className="schedule-page-header-content"
          >

            <p>
              Учебный процесс
            </p>

            <h1>
              Моё расписание
            </h1>


            <div
              className="schedule-student-meta"
            >

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


        {/* ===============================================
            NEXT LESSON
        =============================================== */}

        <section
          className="schedule-next-lesson-card"
        >

          <div
            className="schedule-next-lesson-content"
          >

            <div
              className="schedule-next-lesson-label"
            >

              <Sparkles
                size={16}
              />

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
                  Следующий урок
                  начинается в{' '}

                  <strong>
                    {nextLesson.startTime}
                  </strong>
                </p>


                <div
                  className="schedule-next-meta"
                >

                  <span>
                    <Clock3
                      size={16}
                    />

                    {nextLesson.startTime}
                    {' – '}
                    {nextLesson.endTime}
                  </span>


                  <span>
                    <BookOpen
                      size={16}
                    />

                    Урок №
                    {nextLesson.lessonNumber}
                  </span>


                  {nextLesson.classroom && (
                    <span>
                      <DoorOpen
                        size={16}
                      />

                      Кабинет{' '}
                      {nextLesson.classroom}
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


          <div
            className="schedule-next-lesson-badge"
          >

            <span>
              {todayLessonsCount}
            </span>

            <small>
              уроков сегодня
            </small>

          </div>

        </section>


        {/* ===============================================
            DAYS
        =============================================== */}

        <section
          className="schedule-days-panel"
        >

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


          <div
            className="modern-schedule-day-tabs"
          >

            {DAYS.map(
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
                    {getShortDay(
                      day,
                    )}
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


        {/* ===============================================
            LESSONS
        =============================================== */}

        <section
          className="modern-schedule-section"
        >

          <div
            className="modern-schedule-section-heading"
          >

            <div>
              <p>
                Учебный день
              </p>

              <h2>
                {selectedDay}
              </h2>
            </div>


            <span>
              {selectedDayLessons.length}{' '}

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
            <div
              className="modern-schedule-list"
            >

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

                      <div
                        className="modern-schedule-time"
                      >
                        <strong>
                          {lesson.startTime}
                        </strong>

                        <span>
                          {lesson.endTime}
                        </span>
                      </div>


                      <div
                        className="modern-schedule-line"
                      >
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


                      <div
                        className="modern-schedule-content"
                      >

                        <div
                          className="modern-schedule-title-row"
                        >

                          <div>
                            <span>
                              Урок №
                              {lesson.lessonNumber ||
                                index +
                                  1}
                            </span>

                            <h3>
                              {lesson.subject}
                            </h3>
                          </div>


                          {isCurrentLesson && (
                            <span
                              className="modern-current-badge"
                            >
                              Сейчас
                            </span>
                          )}

                        </div>


                        <div
                          className="modern-schedule-details"
                        >

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
                              {lesson.classroom}
                            </span>
                          )}

                        </div>


                        {lesson.description && (
                          <p
                            className="modern-schedule-description"
                          >
                            {lesson.description}
                          </p>
                        )}


                        <button
                          type="button"
                          onClick={() =>
                            void handleOpenLesson(
                              lesson,
                            )
                          }
                          style={
                            openLessonButtonStyle
                          }
                        >
                          <BookOpen
                            size={16}
                          />

                          Открыть урок
                        </button>

                      </div>

                    </article>
                  )
                },
              )}

            </div>
          )}

        </section>

      </div>


      {lessonPreview && (
        <SchoolLessonPreviewModal
          preview={
            lessonPreview
          }
          loading={
            lessonPreviewLoading
          }
          error={
            lessonPreviewError
          }
          mode="student"
          onClose={
            closeLessonPreview
          }
        />
      )}
    </>
  )
}


/* =========================================================
   PARENT VIEW
========================================================= */

function ParentScheduleView({
  student,
  linkedStudents,
  selectedStudentId,
  setSelectedStudentId,
  loading,
  error,
  selectedDay,
  setSelectedDay,
  selectedDayLessons,
  today,
  reload,
  onOpenLesson,
}) {
  if (
    !student
  ) {
    return (
      <div
        style={
          parentPageStyle
        }
      >
        <ScheduleEmptyState
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
    <div
      style={
        parentPageStyle
      }
    >

      {/* HEADER */}

      <header
        style={
          parentHeaderStyle
        }
      >

        <div>
          <span
            style={
              parentEyebrowStyle
            }
          >
            Учебный процесс
          </span>

          <h1
            style={
              parentTitleStyle
            }
          >
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
          style={
            reloadButtonStyle
          }
          title="Обновить расписание"
        >
          <RefreshCcw
            size={18}
          />
        </button>

      </header>


      {/* CHILD */}

      <section
        style={
          parentStudentStyle
        }
      >

        <div
          style={
            parentAvatarStyle
          }
        >
          {getInitials(
            student.name,
          )}
        </div>


        <div
          style={{
            minWidth:
              0,

            flex:
              1,
          }}
        >
          <small
            style={
              parentSmallLabelStyle
            }
          >
            Расписание ребёнка
          </small>


          {linkedStudents.length >
          1 ? (
            <select
              value={
                selectedStudentId
              }
              onChange={
                (event) =>
                  setSelectedStudentId(
                    event.target.value,
                  )
              }
              style={
                childSelectStyle
              }
            >

              {linkedStudents.map(
                (item) => (
                  <option
                    key={
                      item.id
                    }
                    value={
                      item.id
                    }
                  >
                    {item.name}
                  </option>
                ),
              )}

            </select>
          ) : (
            <strong
              style={
                childNameStyle
              }
            >
              {student.name}
            </strong>
          )}


          <div
            style={
              childMetaStyle
            }
          >

            <span>
              <School
                size={13}
              />

              {student.school ||
                'Школа не указана'}
            </span>


            <span>
              <GraduationCap
                size={13}
              />

              {getStudentClass(
                student,
              ) ||
                'Класс не указан'}
            </span>

          </div>

        </div>

      </section>


      {/* DAYS */}

      <section
        style={
          parentDaysStyle
        }
      >

        {DAYS.map(
          (day) => (
            <button
              key={
                day
              }
              type="button"
              onClick={() =>
                setSelectedDay(
                  day,
                )
              }
              style={
                parentDayButtonStyle(
                  selectedDay ===
                    day,
                  day === today,
                )
              }
            >

              <strong>
                {getShortDay(
                  day,
                )}
              </strong>

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

      </section>


      {/* ERROR */}

      {error && (
        <div
          style={
            errorBoxStyle
          }
        >
          {error}
        </div>
      )}


      {/* LESSONS */}

      {loading ? (
        <ScheduleEmptyState
          icon={
            RefreshCcw
          }
          title="Загружаем расписание"
          text="Получаем уроки..."
        />
      ) : (
        <section
          style={
            parentLessonsStyle
          }
        >

          <div
            style={
              parentLessonsHeaderStyle
            }
          >
            <div>
              <small
                style={
                  parentSmallLabelStyle
                }
              >
                Учебный день
              </small>

              <h2
                style={{
                  margin:
                    '3px 0 0',
                }}
              >
                {selectedDay}
              </h2>
            </div>


            <strong
              style={
                parentLessonCountStyle
              }
            >
              {selectedDayLessons.length}{' '}
              {getLessonWord(
                selectedDayLessons.length,
              )}
            </strong>
          </div>


          {selectedDayLessons.length ===
          0 ? (
            <ScheduleEmptyState
              icon={
                CalendarDays
              }
              title="Уроков нет"
              text="На этот день расписание пока не добавлено."
            />
          ) : (
            <div
              style={
                parentLessonsListStyle
              }
            >

              {selectedDayLessons.map(
                (
                  lesson,
                  index,
                ) => (
                  <article
                    key={
                      lesson.id
                    }
                    style={
                      parentLessonStyle
                    }
                  >

                    <div
                      style={
                        parentTimeStyle
                      }
                    >
                      <strong>
                        {lesson.startTime}
                      </strong>

                      <small>
                        {lesson.endTime}
                      </small>
                    </div>


                    <div
                      style={{
                        minWidth:
                          0,

                        flex:
                          1,
                      }}
                    >

                      <small
                        style={
                          parentSmallLabelStyle
                        }
                      >
                        Урок №
                        {lesson.lessonNumber ||
                          index +
                            1}
                      </small>


                      <h3
                        style={
                          parentLessonTitleStyle
                        }
                      >
                        {lesson.subject}
                      </h3>


                      <div
                        style={
                          parentLessonMetaStyle
                        }
                      >

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
                            {lesson.classroom}
                          </span>
                        )}

                      </div>


                      <button
                        type="button"
                        onClick={() =>
                          void onOpenLesson(
                            lesson,
                          )
                        }
                        style={
                          parentOpenButtonStyle
                        }
                      >
                        <BookOpen
                          size={15}
                        />

                        Открыть урок
                      </button>

                    </div>

                  </article>
                ),
              )}

            </div>
          )}

        </section>
      )}

    </div>
  )
}


/* =========================================================
   SCHOOL LESSON PREVIEW
========================================================= */

function SchoolLessonPreviewModal({
  preview,
  loading,
  error,
  mode,
  onClose,
}) {
  const {
    scheduleLesson,
    lessonDate,
    journalLesson,
    tasks,
    grades,
    attendance,
  } = preview


  const isParent =
    mode ===
    'parent'


  return (
    <div
      style={
        modalBackdropStyle
      }
      onMouseDown={
        (event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            onClose()
          }
        }
      }
    >

      <section
        style={
          modalCardStyle
        }
      >

        {/* HEADER */}

        <div
          style={
            modalHeaderStyle
          }
        >

          <div>
            <span
              style={
                modalEyebrowStyle
              }
            >
              {isParent
                ? 'Урок ребёнка'
                : 'Школьный урок'}
            </span>


            <h2
              style={
                modalTitleStyle
              }
            >
              {scheduleLesson.subject}
            </h2>


            <p
              style={
                modalSubtitleStyle
              }
            >
              {formatDate(
                lessonDate,
              )}
              {' · '}
              {scheduleLesson.startTime}
              {'–'}
              {scheduleLesson.endTime}
            </p>
          </div>


          <button
            type="button"
            onClick={
              onClose
            }
            style={
              modalCloseStyle
            }
            aria-label="Закрыть"
          >
            ×
          </button>

        </div>


        {/* LOADING */}

        {loading ? (
          <LessonState
            icon={
              BookOpen
            }
            title="Загружаем урок..."
            text="Получаем тему, посещаемость, оценки и домашнее задание."
          />
        ) : error ? (
          <div
            style={
              errorBoxStyle
            }
          >
            {error}
          </div>
        ) : !journalLesson ? (
          <LessonState
            icon={
              BookOpen
            }
            title="Урок ещё не заполнен"
            text="Учитель пока не создал карточку этого урока. Данные появятся после заполнения урока."
          />
        ) : (
          <div
            style={
              modalSectionsStyle
            }
          >

            {/* TOPIC */}

            <LessonInfoBlock
              title="Тема урока"
            >
              {journalLesson.topic ||
                'Тема пока не указана.'}
            </LessonInfoBlock>


            {/* ATTENDANCE */}

            <LessonInfoBlock
              title={
                isParent
                  ? 'Посещаемость ребёнка'
                  : 'Моя посещаемость'
              }
            >

              {attendance ? (
                <>
                  <strong>
                    {getAttendanceStatusLabel(
                      attendance.status,
                    )}
                  </strong>


                  {attendance.comment && (
                    <small
                      style={
                        lessonCommentStyle
                      }
                    >
                      {attendance.comment}
                    </small>
                  )}
                </>
              ) : (
                'Учитель пока не отметил посещаемость.'
              )}

            </LessonInfoBlock>


            {/* GRADES */}

            <LessonInfoBlock
              title={
                isParent
                  ? 'Оценки ребёнка'
                  : 'Мои оценки'
              }
            >

              {grades.length ===
              0 ? (
                'Оценок за этот урок нет.'
              ) : (
                <div
                  style={
                    gradesListStyle
                  }
                >

                  {grades.map(
                    (grade) => (
                      <div
                        key={
                          grade.id
                        }
                        style={
                          gradeRowStyle
                        }
                      >

                        <span
                          style={
                            gradeBadgeStyle(
                              grade.value,
                            )
                          }
                        >
                          {grade.value}
                        </span>


                        <div>
                          <strong
                            style={{
                              display:
                                'block',
                            }}
                          >
                            {grade.gradeType ||
                              'Оценка'}
                          </strong>


                          {grade.comment && (
                            <small
                              style={
                                lessonCommentStyle
                              }
                            >
                              {grade.comment}
                            </small>
                          )}
                        </div>

                      </div>
                    ),
                  )}

                </div>
              )}

            </LessonInfoBlock>


            {/* HOMEWORK */}

            <LessonInfoBlock
              title="Домашнее задание"
            >

              {tasks.length ===
              0 ? (
                'Домашнее задание не задано.'
              ) : (
                <div
                  style={
                    taskListStyle
                  }
                >

                  {tasks.map(
                    (task) => (
                      <article
                        key={
                          task.id
                        }
                        style={
                          taskCardStyle
                        }
                      >

                        <strong>
                          {task.title}
                        </strong>


                        {task.description && (
                          <p
                            style={
                              taskDescriptionStyle
                            }
                          >
                            {task.description}
                          </p>
                        )}


                        <small
                          style={
                            taskDeadlineStyle
                          }
                        >
                          {task.deadline
                            ? `Сдать до ${formatDeadline(
                                task.deadline,
                              )}`
                            : 'Без срока сдачи'}
                        </small>

                      </article>
                    ),
                  )}

                </div>
              )}

            </LessonInfoBlock>

          </div>
        )}

      </section>

    </div>
  )
}


/* =========================================================
   LESSON INFO BLOCK
========================================================= */

function LessonInfoBlock({
  title,
  children,
}) {
  return (
    <section
      style={
        lessonBlockStyle
      }
    >

      <span
        style={
          lessonBlockTitleStyle
        }
      >
        {title}
      </span>


      <div
        style={
          lessonBlockContentStyle
        }
      >
        {children}
      </div>

    </section>
  )
}


/* =========================================================
   LESSON STATE
========================================================= */

function LessonState({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div
      style={
        lessonStateStyle
      }
    >

      {Icon && (
        <Icon
          size={30}
        />
      )}

      <strong>
        {title}
      </strong>

      <span>
        {text}
      </span>

    </div>
  )
}


/* =========================================================
   EMPTY STATE
========================================================= */

function ScheduleEmptyState({
  icon: Icon,
  title,
  text,
}) {
  return (
    <section
      className="schedule-empty-state"
    >

      <div
        className="schedule-empty-state-icon"
      >
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


/* =========================================================
   HELPERS
========================================================= */

function getStudentClass(
  student,
) {
  return (
    student?.className ||
    student?.class_name ||
    ''
  )
}


function getDateForDay(
  dayName,
) {
  const index =
    DAYS.indexOf(
      dayName,
    )


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
      : 1 -
        weekday


  const monday =
    new Date(
      now,
    )


  monday.setDate(
    now.getDate() +
      distanceToMonday,
  )


  const date =
    new Date(
      monday,
    )


  date.setDate(
    monday.getDate() +
      Math.max(
        index,
        0,
      ),
  )


  return toLocalDateString(
    date,
  )
}


function toLocalDateString(
  date,
) {
  const year =
    date.getFullYear()


  const month =
    String(
      date.getMonth() +
        1,
    ).padStart(
      2,
      '0',
    )


  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    )


  return `${year}-${month}-${day}`
}


function formatDate(
  value,
) {
  if (
    !value
  ) {
    return '—'
  }


  const date =
    new Date(
      `${value}T12:00:00`,
    )


  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }


  return date.toLocaleDateString(
    'ru-RU',
    {
      day:
        'numeric',

      month:
        'long',

      year:
        'numeric',
    },
  )
}


function formatDeadline(
  value,
) {
  if (
    !value
  ) {
    return '—'
  }


  const date =
    new Date(
      value,
    )


  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }


  return date.toLocaleString(
    'ru-RU',
    {
      day:
        '2-digit',

      month:
        '2-digit',

      year:
        'numeric',

      hour:
        '2-digit',

      minute:
        '2-digit',
    },
  )
}


function getInitials(
  name,
) {
  if (
    !name
  ) {
    return 'У'
  }


  return name
    .trim()
    .split(/\s+/)
    .filter(
      Boolean,
    )
    .slice(
      0,
      2,
    )
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
  const map = {
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
    map[
      day
    ] ||
    day
  )
}


function getLessonWord(
  count,
) {
  const value =
    Math.abs(
      Number(
        count,
      ),
    )


  const mod100 =
    value %
    100


  const mod10 =
    value %
    10


  if (
    mod100 >= 11 &&
    mod100 <= 14
  ) {
    return 'уроков'
  }


  if (
    mod10 === 1
  ) {
    return 'урок'
  }


  if (
    mod10 >= 2 &&
    mod10 <= 4
  ) {
    return 'урока'
  }


  return 'уроков'
}


/* =========================================================
   STYLES
========================================================= */

const openLessonButtonStyle = {
  display:
    'inline-flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  gap:
    7,

  marginTop:
    12,

  padding:
    '9px 13px',

  border:
    '1px solid #bfdbfe',

  borderRadius:
    10,

  background:
    '#eff6ff',

  color:
    '#1d4ed8',

  fontSize:
    12,

  fontWeight:
    800,

  cursor:
    'pointer',
}


/* =========================================================
   MODAL STYLES
========================================================= */

const modalBackdropStyle = {
  position:
    'fixed',

  inset:
    0,

  zIndex:
    1200,

  display:
    'grid',

  placeItems:
    'center',

  padding:
    18,

  background:
    'rgba(15, 23, 42, 0.48)',
}


const modalCardStyle = {
  width:
    'min(620px, 100%)',

  maxHeight:
    '90vh',

  overflowY:
    'auto',

  padding:
    20,

  borderRadius:
    22,

  background:
    '#ffffff',

  boxShadow:
    '0 24px 90px rgba(15, 23, 42, 0.25)',
}


const modalHeaderStyle = {
  display:
    'flex',

  alignItems:
    'flex-start',

  justifyContent:
    'space-between',

  gap:
    14,

  paddingBottom:
    16,

  borderBottom:
    '1px solid #e2e8f0',
}


const modalEyebrowStyle = {
  color:
    '#2563eb',

  fontSize:
    10,

  fontWeight:
    900,

  textTransform:
    'uppercase',
}


const modalTitleStyle = {
  margin:
    '5px 0 0',

  color:
    '#082451',

  fontSize:
    28,
}


const modalSubtitleStyle = {
  margin:
    '5px 0 0',

  color:
    '#64748b',

  fontSize:
    13,
}


const modalCloseStyle = {
  width:
    42,

  height:
    42,

  flex:
    '0 0 42px',

  display:
    'grid',

  placeItems:
    'center',

  border:
    '1px solid #e2e8f0',

  borderRadius:
    12,

  background:
    '#ffffff',

  color:
    '#475569',

  fontSize:
    25,

  cursor:
    'pointer',
}


const modalSectionsStyle = {
  display:
    'grid',

  gap:
    12,

  marginTop:
    16,
}


const lessonBlockStyle = {
  padding:
    16,

  border:
    '1px solid #dbe4f0',

  borderRadius:
    15,

  background:
    '#fbfdff',
}


const lessonBlockTitleStyle = {
  display:
    'block',

  marginBottom:
    9,

  color:
    '#64748b',

  fontSize:
    10,

  fontWeight:
    900,

  textTransform:
    'uppercase',
}


const lessonBlockContentStyle = {
  color:
    '#0f274d',

  fontSize:
    15,

  lineHeight:
    1.5,
}


const lessonCommentStyle = {
  display:
    'block',

  marginTop:
    4,

  color:
    '#64748b',
}


const lessonStateStyle = {
  minHeight:
    220,

  display:
    'flex',

  flexDirection:
    'column',

  alignItems:
    'center',

  justifyContent:
    'center',

  gap:
    10,

  padding:
    24,

  color:
    '#64748b',

  textAlign:
    'center',

  lineHeight:
    1.6,
}


const errorBoxStyle = {
  padding:
    13,

  border:
    '1px solid #fecaca',

  borderRadius:
    12,

  background:
    '#fef2f2',

  color:
    '#b91c1c',

  lineHeight:
    1.5,
}


/* =========================================================
   GRADES
========================================================= */

const gradesListStyle = {
  display:
    'grid',

  gap:
    8,
}


const gradeRowStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    11,

  padding:
    9,

  borderRadius:
    11,

  background:
    '#ffffff',
}


function gradeBadgeStyle(
  value,
) {
  const grade =
    Number(
      value,
    )


  return {
    width:
      42,

    height:
      42,

    flex:
      '0 0 42px',

    display:
      'grid',

    placeItems:
      'center',

    borderRadius:
      11,

    background:
      grade >= 5
        ? '#dcfce7'
        : grade >= 4
          ? '#dbeafe'
          : grade >= 3
            ? '#fef3c7'
            : '#fee2e2',

    color:
      '#082451',

    fontWeight:
      900,

    fontSize:
      17,
  }
}


/* =========================================================
   TASKS
========================================================= */

const taskListStyle = {
  display:
    'grid',

  gap:
    9,
}


const taskCardStyle = {
  padding:
    11,

  border:
    '1px solid #dbeafe',

  borderRadius:
    11,

  background:
    '#ffffff',
}


const taskDescriptionStyle = {
  margin:
    '5px 0',

  color:
    '#475569',

  lineHeight:
    1.5,
}


const taskDeadlineStyle = {
  color:
    '#64748b',
}


/* =========================================================
   PARENT STYLES
========================================================= */

const parentPageStyle = {
  display:
    'grid',

  gap:
    14,

  color:
    '#0f274d',
}


const parentHeaderStyle = {
  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    14,
}


const parentEyebrowStyle = {
  display:
    'block',

  color:
    '#64748b',

  fontSize:
    10,

  fontWeight:
    900,

  textTransform:
    'uppercase',
}


const parentTitleStyle = {
  margin:
    '4px 0 0',

  color:
    '#082451',

  fontSize:
    28,
}


const reloadButtonStyle = {
  width:
    42,

  height:
    42,

  display:
    'grid',

  placeItems:
    'center',

  border:
    '1px solid #dbeafe',

  borderRadius:
    12,

  background:
    '#ffffff',

  color:
    '#2563eb',

  cursor:
    'pointer',
}


const parentStudentStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    11,

  padding:
    13,

  border:
    '1px solid #dbeafe',

  borderRadius:
    17,

  background:
    '#f8fbff',
}


const parentAvatarStyle = {
  width:
    46,

  height:
    46,

  flex:
    '0 0 46px',

  display:
    'grid',

  placeItems:
    'center',

  borderRadius:
    13,

  background:
    '#2563eb',

  color:
    '#ffffff',

  fontWeight:
    900,
}


const parentSmallLabelStyle = {
  display:
    'block',

  color:
    '#8ca0be',

  fontSize:
    9,

  fontWeight:
    900,

  textTransform:
    'uppercase',
}


const childNameStyle = {
  display:
    'block',

  marginTop:
    2,

  color:
    '#082451',
}


const childSelectStyle = {
  width:
    '100%',

  maxWidth:
    300,

  marginTop:
    3,

  border:
    'none',

  background:
    'transparent',

  color:
    '#082451',

  fontWeight:
    900,

  fontSize:
    15,
}


const childMetaStyle = {
  display:
    'flex',

  flexWrap:
    'wrap',

  gap:
    12,

  marginTop:
    7,

  color:
    '#64748b',

  fontSize:
    10,
}


const parentDaysStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(6, minmax(62px, 1fr))',

  gap:
    7,

  overflowX:
    'auto',
}


function parentDayButtonStyle(
  active,
  isToday,
) {
  return {
    minWidth:
      62,

    minHeight:
      64,

    display:
      'grid',

    placeItems:
      'center',

    gap:
      3,

    padding:
      7,

    border:
      active
        ? '1px solid #2563eb'
        : '1px solid #dbeafe',

    borderRadius:
      13,

    background:
      active
        ? '#2563eb'
        : isToday
          ? '#eff6ff'
          : '#ffffff',

    color:
      active
        ? '#ffffff'
        : '#0f274d',

    cursor:
      'pointer',
  }
}


const parentLessonsStyle = {
  padding:
    15,

  border:
    '1px solid #e2e8f0',

  borderRadius:
    18,

  background:
    '#ffffff',
}


const parentLessonsHeaderStyle = {
  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    12,

  marginBottom:
    13,
}


const parentLessonCountStyle = {
  padding:
    '7px 10px',

  borderRadius:
    9,

  background:
    '#eff6ff',

  color:
    '#2563eb',

  fontSize:
    10,
}


const parentLessonsListStyle = {
  display:
    'grid',

  gap:
    10,
}


const parentLessonStyle = {
  display:
    'flex',

  gap:
    12,

  padding:
    12,

  border:
    '1px solid #e2e8f0',

  borderRadius:
    14,

  background:
    '#fbfdff',
}


const parentTimeStyle = {
  width:
    72,

  flex:
    '0 0 72px',

  display:
    'flex',

  flexDirection:
    'column',

  justifyContent:
    'center',

  color:
    '#2563eb',
}


const parentLessonTitleStyle = {
  margin:
    '4px 0 8px',

  color:
    '#082451',

  fontSize:
    16,
}


const parentLessonMetaStyle = {
  display:
    'flex',

  flexWrap:
    'wrap',

  gap:
    10,

  color:
    '#64748b',

  fontSize:
    11,
}


const parentOpenButtonStyle = {
  display:
    'inline-flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  gap:
    6,

  marginTop:
    10,

  padding:
    '8px 11px',

  border:
    '1px solid #bfdbfe',

  borderRadius:
    9,

  background:
    '#eff6ff',

  color:
    '#1d4ed8',

  fontSize:
    11,

  fontWeight:
    800,

  cursor:
    'pointer',
}


export default StudentSchedulePage