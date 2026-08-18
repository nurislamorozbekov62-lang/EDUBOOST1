import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  GraduationCap,
  RefreshCcw,
  School,
  Sparkles,
  TrendingUp,
  UserRound,
  X,
  XCircle,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  useAutoRefresh,
} from '../hooks/useAutoRefresh'

import {
  getLinkedStudents,
} from '../services/parentService'

import {
  buildGradeForecast,
  calculateQuarterResult,
  calculateWeightedAverage,
  getGradeTypeLabel,
  getQuarterTargetInfo,
  getStudentFinalQuarterGrades,
  getSuggestedQuarterGrade,
  getSupabaseStudentQuarterGrades,
} from '../services/supabaseJournalService'

import {
  calculateSupabaseAttendanceStats,
  getAttendanceStatusLabel,
  getSupabaseStudentAttendance,
} from '../services/supabaseAttendanceService'

import {
  getSupabaseTasksForStudent,
} from '../services/supabaseTaskService'

import {
  supabase,
} from '../lib/supabase'


/* =========================================================
   PAGE
========================================================= */

function StudentJournalPage() {
  const {
    user,
  } = useAuth()


  const [
    activeTab,
    setActiveTab,
  ] = useState(
    'grades',
  )


  const [
    selectedQuarter,
    setSelectedQuarter,
  ] = useState(1)


  const [
    selectedStudentId,
    setSelectedStudentId,
  ] = useState('')


  const [
    grades,
    setGrades,
  ] = useState([])

  const [
    finalQuarterGrades,
    setFinalQuarterGrades,
  ] = useState([])

  const [
    subjectResults,
    setSubjectResults,
  ] = useState({})

  const [
    attendanceRecords,
    setAttendanceRecords,
  ] = useState([])

  const [
    lessons,
    setLessons,
  ] = useState([])

  const [
    tasks,
    setTasks,
  ] = useState([])


  const [
    gradesLoading,
    setGradesLoading,
  ] = useState(true)

  const [
    attendanceLoading,
    setAttendanceLoading,
  ] = useState(true)

  const [
    lessonsLoading,
    setLessonsLoading,
  ] = useState(true)


  const [
    gradesError,
    setGradesError,
  ] = useState('')

  const [
    attendanceError,
    setAttendanceError,
  ] = useState('')

  const [
    lessonsError,
    setLessonsError,
  ] = useState('')


  const [
    selectedLesson,
    setSelectedLesson,
  ] = useState(null)


  /* =======================================================
     PARENT STUDENTS
  ======================================================= */

  const linkedStudents =
    useMemo(() => {
      if (
        !user?.id ||
        user.role !==
          'Родитель'
      ) {
        return []
      }


      try {
        return (
          getLinkedStudents(
            user.id,
          ) ||
          []
        )
      } catch (
        error
      ) {
        console.error(
          'Linked students:',
          error,
        )

        return []
      }
    }, [
      user?.id,
      user?.role,
    ])


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
            (student) =>
              String(
                student.id,
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


        return String(
          linkedStudents[0].id,
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

  const journalStudent =
    useMemo(() => {
      if (
        !user
      ) {
        return null
      }


      if (
        user.role ===
        'Ученик'
      ) {
        return user
      }


      if (
        user.role ===
        'Родитель'
      ) {
        return (
          linkedStudents.find(
            (student) =>
              String(
                student.id,
              ) ===
              String(
                selectedStudentId,
              ),
          ) ||
          null
        )
      }


      return null
    }, [
      user,
      linkedStudents,
      selectedStudentId,
    ])


  const journalStudentId =
    journalStudent?.id ||
    null


  const isParent =
    user?.role ===
    'Родитель'


  /* =======================================================
     RESET
  ======================================================= */

  useEffect(() => {
    setGrades([])
    setFinalQuarterGrades([])
    setSubjectResults({})
    setAttendanceRecords([])
    setLessons([])
    setTasks([])

    setGradesError('')
    setAttendanceError('')
    setLessonsError('')

    setSelectedLesson(
      null,
    )
  }, [
    journalStudentId,
  ])


  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    if (
      !journalStudentId
    ) {
      return
    }


    void loadGrades()
  }, [
    journalStudentId,
    selectedQuarter,
  ])


  useEffect(() => {
    if (
      !journalStudentId
    ) {
      return
    }


    void loadAttendance()
  }, [
    journalStudentId,
  ])


  useEffect(() => {
    if (
      !journalStudentId
    ) {
      return
    }


    void loadLessons()
  }, [
    journalStudentId,
    selectedQuarter,
  ])


  useAutoRefresh(
    async () => {
      if (
        !journalStudentId
      ) {
        return
      }


      if (
        activeTab ===
        'grades'
      ) {
        await loadGrades()
      }


      if (
        activeTab ===
        'lessons'
      ) {
        await loadLessons()
      }


      if (
        activeTab ===
        'attendance'
      ) {
        await loadAttendance()
      }
    },
    [
      journalStudentId,
      activeTab,
      selectedQuarter,
    ],
  )


  /* =======================================================
     GRADES
  ======================================================= */

  async function loadGrades() {
    if (
      !journalStudentId
    ) {
      return
    }


    try {
      setGradesLoading(
        true,
      )

      setGradesError('')


      const gradeRows =
        await getSupabaseStudentQuarterGrades(
          journalStudentId,
          selectedQuarter,
        )


      const safeGrades =
        Array.isArray(
          gradeRows,
        )
          ? gradeRows
          : []


      setGrades(
        safeGrades,
      )


      try {
        const finalRows =
          await getStudentFinalQuarterGrades(
            journalStudentId,
          )


        setFinalQuarterGrades(
          (
            finalRows ||
            []
          ).filter(
            (item) =>
              Number(
                item.quarter,
              ) ===
              Number(
                selectedQuarter,
              ),
          ),
        )
      } catch (
        finalError
      ) {
        console.error(
          finalError,
        )

        setFinalQuarterGrades(
          [],
        )
      }


      const subjectNames = [
        ...new Set(
          safeGrades
            .map(
              (grade) =>
                grade.subject,
            )
            .filter(
              Boolean,
            ),
        ),
      ]


      const nextResults = {}


      await Promise.all(
        subjectNames.map(
          async (
            subject,
          ) => {
            try {
              const result =
                await calculateQuarterResult(
                  journalStudentId,
                  subject,
                  selectedQuarter,
                )


              nextResults[
                subject
              ] = result
            } catch (
              resultError
            ) {
              console.error(
                resultError,
              )


              const subjectGrades =
                safeGrades.filter(
                  (grade) =>
                    grade.subject ===
                    subject,
                )


              const average =
                calculateWeightedAverage(
                  subjectGrades,
                )


              nextResults[
                subject
              ] = {
                weightedAverage:
                  average,

                suggestedGrade:
                  getSuggestedQuarterGrade(
                    average,
                  ),

                gradesCount:
                  subjectGrades.length,

                minimumRequired:
                  3,

                gradesMissing:
                  Math.max(
                    3 -
                      subjectGrades.length,
                    0,
                  ),

                isAttested:
                  subjectGrades.length >=
                  3,
              }
            }
          },
        ),
      )


      setSubjectResults(
        nextResults,
      )
    } catch (
      error
    ) {
      console.error(
        error,
      )

      setGrades([])
      setFinalQuarterGrades([])
      setSubjectResults({})

      setGradesError(
        error?.message ||
          'Не удалось загрузить оценки.',
      )
    } finally {
      setGradesLoading(
        false,
      )
    }
  }


  /* =======================================================
     ATTENDANCE
  ======================================================= */

  async function loadAttendance() {
    if (
      !journalStudentId
    ) {
      return
    }


    try {
      setAttendanceLoading(
        true,
      )

      setAttendanceError('')


      const data =
        await getSupabaseStudentAttendance(
          journalStudentId,
        )


      setAttendanceRecords(
        Array.isArray(
          data,
        )
          ? data
          : [],
      )
    } catch (
      error
    ) {
      console.error(
        error,
      )

      setAttendanceRecords(
        [],
      )

      setAttendanceError(
        error?.message ||
          'Не удалось загрузить посещаемость.',
      )
    } finally {
      setAttendanceLoading(
        false,
      )
    }
  }


  /* =======================================================
     LESSONS + HOMEWORK
  ======================================================= */

  async function loadLessons() {
    if (
      !journalStudent
    ) {
      return
    }


    try {
      setLessonsLoading(
        true,
      )

      setLessonsError('')


      const className =
        journalStudent.className ||
        journalStudent.class_name ||
        ''


      if (
        !className
      ) {
        setLessons([])
        setTasks([])

        return
      }


      let query =
        supabase
          .from(
            'journal_lessons',
          )
          .select('*')
          .eq(
            'class_name',
            className,
          )
          .eq(
            'quarter',
            selectedQuarter,
          )


      if (
        journalStudent.schoolId
      ) {
        query =
          query.eq(
            'school_id',
            journalStudent.schoolId,
          )
      } else if (
        journalStudent.school
      ) {
        query =
          query.eq(
            'school',
            journalStudent.school,
          )
      }


      const {
        data,
        error,
      } =
        await query
          .order(
            'lesson_date',
            {
              ascending:
                false,
            },
          )


      if (
        error
      ) {
        throw new Error(
          error.message ||
            'Не удалось загрузить уроки.',
        )
      }


      const normalizedLessons =
        (
          data ||
          []
        ).map(
          normalizeJournalLesson,
        )


      setLessons(
        normalizedLessons,
      )


      try {
        const taskRows =
          await getSupabaseTasksForStudent(
            journalStudent,
          )


        setTasks(
          Array.isArray(
            taskRows,
          )
            ? taskRows
            : [],
        )
      } catch (
        taskError
      ) {
        console.error(
          taskError,
        )

        setTasks([])
      }
    } catch (
      error
    ) {
      console.error(
        error,
      )

      setLessons([])
      setTasks([])

      setLessonsError(
        error?.message ||
          'Не удалось загрузить уроки.',
      )
    } finally {
      setLessonsLoading(
        false,
      )
    }
  }


  /* =======================================================
     CALCULATIONS
  ======================================================= */

  const attendance =
    useMemo(
      () =>
        calculateSupabaseAttendanceStats(
          attendanceRecords,
        ),
      [
        attendanceRecords,
      ],
    )


  const averageGrade =
    useMemo(() => {
      if (
        grades.length ===
        0
      ) {
        return null
      }


      const sum =
        grades.reduce(
          (
            total,
            grade,
          ) =>
            total +
            Number(
              grade.value ||
                0,
            ),
          0,
        )


      return Number(
        (
          sum /
          grades.length
        ).toFixed(
          2,
        ),
      )
    }, [
      grades,
    ])


  const excellentGrades =
    grades.filter(
      (grade) =>
        Number(
          grade.value,
        ) ===
        5,
    ).length


  const goodGrades =
    grades.filter(
      (grade) =>
        Number(
          grade.value,
        ) ===
        4,
    ).length


  const subjects =
    useMemo(() => {
      const names = [
        ...new Set(
          grades
            .map(
              (grade) =>
                grade.subject,
            )
            .filter(
              Boolean,
            ),
        ),
      ]


      return names
        .map(
          (subject) => {
            const subjectGrades =
              grades.filter(
                (grade) =>
                  grade.subject ===
                  subject,
              )


            const weightedAverage =
              calculateWeightedAverage(
                subjectGrades,
              )


            const result =
              subjectResults[
                subject
              ]


            const minimumRequired =
              Number(
                result
                  ?.minimumRequired ||
                  3,
              )


            const isAttested =
              result
                ?.isAttested ??
              (
                subjectGrades.length >=
                minimumRequired
              )


            const suggestedGrade =
              isAttested
                ? (
                    result
                      ?.suggestedGrade ??
                    getSuggestedQuarterGrade(
                      weightedAverage,
                    )
                  )
                : null


            const finalResult =
              finalQuarterGrades.find(
                (item) =>
                  item.subject ===
                  subject,
              )


            const targets =
              getQuarterTargetInfo(
                weightedAverage,
              )


            const forecast =
              buildGradeForecast(
                grades,
                subject,
                selectedQuarter,
                'control',
              )


            const fiveForecast =
              forecast.find(
                (item) =>
                  Number(
                    item.grade,
                  ) ===
                  5,
              )


            return {
              subject,

              grades:
                subjectGrades,

              count:
                subjectGrades.length,

              weightedAverage,

              minimumRequired,

              missing:
                Math.max(
                  minimumRequired -
                    subjectGrades.length,
                  0,
                ),

              isAttested,

              suggestedGrade,

              finalGrade:
                finalResult
                  ?.finalGrade ??
                null,

              targets,

              fiveForecast:
                fiveForecast ||
                null,
            }
          },
        )
        .sort(
          (
            first,
            second,
          ) =>
            first.subject.localeCompare(
              second.subject,
              'ru',
            ),
        )
    }, [
      grades,
      subjectResults,
      finalQuarterGrades,
      selectedQuarter,
    ])


  /* =======================================================
     LESSON ITEMS
  ======================================================= */

  const lessonItems =
    useMemo(() => {
      return lessons.map(
        (lesson) => {
          const lessonGrades =
            grades.filter(
              (grade) => {
                if (
                  grade.journalLessonId
                ) {
                  return (
                    String(
                      grade.journalLessonId,
                    ) ===
                    String(
                      lesson.id,
                    )
                  )
                }


                return (
                  grade.subject ===
                    lesson.subject &&
                  grade.date ===
                    lesson.date
                )
              },
            )


          const lessonAttendance =
            attendanceRecords.find(
              (record) => {
                if (
                  record.journalLessonId
                ) {
                  return (
                    String(
                      record.journalLessonId,
                    ) ===
                    String(
                      lesson.id,
                    )
                  )
                }


                return (
                  record.subject ===
                    lesson.subject &&
                  record.date ===
                    lesson.date
                )
              },
            ) ||
            null


          const lessonTasks =
            tasks.filter(
              (task) =>
                String(
                  task.journalLessonId ||
                    '',
                ) ===
                String(
                  lesson.id,
                ),
            )


          return {
            ...lesson,

            grades:
              lessonGrades,

            attendance:
              lessonAttendance,

            tasks:
              lessonTasks,
          }
        },
      )
    }, [
      lessons,
      grades,
      attendanceRecords,
      tasks,
    ])


  /* =======================================================
     ACCESS
  ======================================================= */

  if (
    !user
  ) {
    return null
  }


  if (
    user.role !==
      'Ученик' &&
    user.role !==
      'Родитель'
  ) {
    return (
      <JournalAccessState
        icon={
          GraduationCap
        }
        title="Доступ запрещён"
        text="Электронный дневник доступен только ученикам и родителям."
      />
    )
  }


  if (
    isParent &&
    linkedStudents.length ===
      0
  ) {
    return (
      <JournalAccessState
        icon={
          UserRound
        }
        title="Ребёнок не привязан"
        text="Сначала добавьте ребёнка в родительском кабинете."
      />
    )
  }


  if (
    !journalStudent
  ) {
    return (
      <JournalAccessState
        icon={
          RefreshCcw
        }
        title="Загружаем дневник"
        text="Подготавливаем учебные данные."
      />
    )
  }


  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="student-journal-page">

      <JournalHeader
        isParent={
          isParent
        }
      />


      {isParent && (
        <ParentStudentSwitcher
          students={
            linkedStudents
          }
          selectedStudentId={
            selectedStudentId
          }
          setSelectedStudentId={
            setSelectedStudentId
          }
          student={
            journalStudent
          }
        />
      )}


      <JournalHero
        user={
          journalStudent
        }
        isParent={
          isParent
        }
        averageGrade={
          averageGrade
        }
        attendancePercent={
          attendance.total > 0
            ? attendance.percent
            : null
        }
        gradesCount={
          grades.length
        }
        selectedQuarter={
          selectedQuarter
        }
      />


      <JournalStats
        averageGrade={
          averageGrade
        }
        gradesCount={
          grades.length
        }
        lessonsCount={
          lessons.length
        }
        attendance={
          attendance
        }
        excellentGrades={
          excellentGrades
        }
      />


      <JournalTabs
        activeTab={
          activeTab
        }
        setActiveTab={
          setActiveTab
        }
        isParent={
          isParent
        }
      />


      {activeTab ===
        'grades' && (
        <>
          <QuarterSelector
            selectedQuarter={
              selectedQuarter
            }
            setSelectedQuarter={
              setSelectedQuarter
            }
            loading={
              gradesLoading
            }
            reload={
              loadGrades
            }
          />


          {gradesError && (
            <ErrorMessage
              text={
                gradesError
              }
            />
          )}


          <GradesView
            loading={
              gradesLoading
            }
            grades={
              grades
            }
            subjects={
              subjects
            }
            averageGrade={
              averageGrade
            }
            excellentGrades={
              excellentGrades
            }
            goodGrades={
              goodGrades
            }
          />
        </>
      )}


      {activeTab ===
        'lessons' && (
        <>
          <QuarterSelector
            selectedQuarter={
              selectedQuarter
            }
            setSelectedQuarter={
              setSelectedQuarter
            }
            loading={
              lessonsLoading
            }
            reload={
              loadLessons
            }
          />


          {lessonsError && (
            <ErrorMessage
              text={
                lessonsError
              }
            />
          )}


          <LessonsView
            loading={
              lessonsLoading
            }
            lessons={
              lessonItems
            }
            isParent={
              isParent
            }
            onOpen={
              setSelectedLesson
            }
          />
        </>
      )}


      {activeTab ===
        'attendance' && (
        <>
          {attendanceError && (
            <ErrorMessage
              text={
                attendanceError
              }
            />
          )}


          <AttendanceView
            records={
              attendanceRecords
            }
            attendance={
              attendance
            }
            loading={
              attendanceLoading
            }
            reload={
              loadAttendance
            }
          />
        </>
      )}


      {selectedLesson && (
        <LessonModal
          lesson={
            selectedLesson
          }
          isParent={
            isParent
          }
          onClose={() =>
            setSelectedLesson(
              null,
            )
          }
        />
      )}

    </div>
  )
}


/* =========================================================
   HEADER
========================================================= */

function JournalHeader({
  isParent,
}) {
  return (
    <header className="student-journal-header">

      <div className="student-journal-header-icon">
        <GraduationCap
          size={28}
        />
      </div>


      <div>
        <p>
          Учебные результаты
        </p>

        <h1>
          {isParent
            ? 'Дневник ребёнка'
            : 'Мой дневник'}
        </h1>

        <span>
          {isParent
            ? 'Оценки, уроки, домашние задания и посещаемость ребёнка.'
            : 'Ваши оценки, уроки, домашние задания и посещаемость.'}
        </span>
      </div>

    </header>
  )
}


/* =========================================================
   PARENT SWITCHER
========================================================= */

function ParentStudentSwitcher({
  students,
  selectedStudentId,
  setSelectedStudentId,
  student,
}) {
  return (
    <section
      style={
        parentSwitcherStyle
      }
    >

      <div>
        <small
          style={
            mutedLabelStyle
          }
        >
          Вы смотрите дневник
        </small>

        <strong
          style={{
            display:
              'block',

            marginTop:
              3,

            fontSize:
              16,
          }}
        >
          {student.name}
        </strong>

        <span
          style={{
            display:
              'block',

            marginTop:
              3,

            color:
              '#94a3b8',

            fontSize:
              12,
          }}
        >
          {student.school ||
            'Школа не указана'}

          {' · '}

          {student.className ||
            student.class_name ||
            'Класс не указан'}
        </span>
      </div>


      {students.length >
        1 && (
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
            parentSelectStyle
          }
        >
          {students.map(
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
      )}

    </section>
  )
}


/* =========================================================
   HERO
========================================================= */

function JournalHero({
  user,
  isParent,
  averageGrade,
  attendancePercent,
  gradesCount,
  selectedQuarter,
}) {
  return (
    <section className="student-journal-modern-hero">

      <div className="student-journal-modern-content">

        <div className="student-journal-modern-label">
          <Sparkles
            size={16}
          />

          {isParent
            ? 'Учебный профиль ребёнка'
            : 'Личный учебный профиль'}
        </div>


        <h2>
          {user.name ||
            'Ученик'}
        </h2>


        <p>
          Здесь собраны данные из школьного журнала EduBoost.
        </p>


        <div className="student-journal-modern-meta">

          <span>
            <School
              size={17}
            />

            {user.school ||
              'Школа не указана'}
          </span>


          <span>
            <UserRound
              size={17}
            />

            {user.className ||
              user.class_name ||
              'Класс не указан'}
          </span>


          <span>
            <BookOpen
              size={17}
            />

            {gradesCount}{' '}
            оценок ·{' '}
            {selectedQuarter}{' '}
            четв.
          </span>

        </div>

      </div>


      <div className="student-journal-modern-badge">

        <div className="student-journal-modern-avatar">
          {String(
            user.name ||
              'У',
          )
            .charAt(0)
            .toUpperCase()}
        </div>

        <strong>
          {averageGrade ??
            '—'}
        </strong>

        <span>
          средняя оценка
        </span>

        <small>
          Посещаемость{' '}
          {attendancePercent ===
          null
            ? '—'
            : `${attendancePercent}%`}
        </small>

      </div>

    </section>
  )
}


/* =========================================================
   STATS
========================================================= */

function JournalStats({
  averageGrade,
  gradesCount,
  lessonsCount,
  attendance,
  excellentGrades,
}) {
  const stats = [
    {
      label:
        'Средняя оценка',

      value:
        averageGrade ??
        '—',

      icon:
        TrendingUp,
    },

    {
      label:
        'Оценок',

      value:
        gradesCount,

      icon:
        GraduationCap,
    },

    {
      label:
        'Уроков',

      value:
        lessonsCount,

      icon:
        BookOpen,
    },

    {
      label:
        'Посещаемость',

      value:
        attendance.total ===
        0
          ? '—'
          : `${attendance.percent}%`,

      icon:
        CalendarCheck2,
    },

    {
      label:
        'Пятёрок',

      value:
        excellentGrades,

      icon:
        CheckCircle2,
    },
  ]


  return (
    <section className="student-journal-modern-stats">

      {stats.map(
        (stat) => {
          const Icon =
            stat.icon


          return (
            <article
              className="student-journal-modern-stat"
              key={
                stat.label
              }
            >

              <div>
                <Icon
                  size={21}
                />
              </div>


              <span>
                <strong>
                  {stat.value}
                </strong>

                <small>
                  {stat.label}
                </small>
              </span>

            </article>
          )
        },
      )}

    </section>
  )
}


/* =========================================================
   TABS
========================================================= */

function JournalTabs({
  activeTab,
  setActiveTab,
  isParent,
}) {
  const tabs = [
    {
      id:
        'grades',

      label:
        isParent
          ? 'Оценки'
          : 'Мои оценки',

      icon:
        GraduationCap,
    },

    {
      id:
        'lessons',

      label:
        'Уроки',

      icon:
        BookOpen,
    },

    {
      id:
        'attendance',

      label:
        'Посещаемость',

      icon:
        CalendarCheck2,
    },
  ]


  return (
    <section className="student-journal-modern-tabs">

      {tabs.map(
        (tab) => {
          const Icon =
            tab.icon


          return (
            <button
              type="button"
              key={
                tab.id
              }
              className={
                activeTab ===
                tab.id
                  ? 'student-journal-modern-tab student-journal-modern-tab--active'
                  : 'student-journal-modern-tab'
              }
              onClick={() =>
                setActiveTab(
                  tab.id,
                )
              }
            >
              <Icon
                size={18}
              />

              {tab.label}
            </button>
          )
        },
      )}

    </section>
  )
}


/* =========================================================
   QUARTER
========================================================= */

function QuarterSelector({
  selectedQuarter,
  setSelectedQuarter,
  loading,
  reload,
}) {
  return (
    <section
      className="student-journal-modern-section"
      style={{
        marginBottom:
          18,
      }}
    >

      <div
        style={{
          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'space-between',

          gap:
            14,

          flexWrap:
            'wrap',
        }}
      >

        <div>
          <small
            style={
              mutedLabelStyle
            }
          >
            Учебный период
          </small>

          <h2
            style={{
              margin:
                '4px 0 0',
            }}
          >
            {selectedQuarter}{' '}
            четверть
          </h2>
        </div>


        <div
          style={{
            display:
              'flex',

            gap:
              10,
          }}
        >

          <select
            value={
              selectedQuarter
            }
            onChange={
              (event) =>
                setSelectedQuarter(
                  Number(
                    event.target.value,
                  ),
                )
            }
          >
            <option value={1}>
              1 четверть
            </option>

            <option value={2}>
              2 четверть
            </option>

            <option value={3}>
              3 четверть
            </option>

            <option value={4}>
              4 четверть
            </option>
          </select>


          <button
            type="button"
            onClick={
              reload
            }
            disabled={
              loading
            }
            style={
              refreshButtonStyle
            }
          >
            <RefreshCcw
              size={18}
            />
          </button>

        </div>

      </div>

    </section>
  )
}


/* =========================================================
   LESSONS
========================================================= */

function LessonsView({
  lessons,
  loading,
  isParent,
  onOpen,
}) {
  if (
    loading
  ) {
    return (
      <section className="student-journal-modern-section">
        <p className="empty-text">
          Загружаем уроки...
        </p>
      </section>
    )
  }


  if (
    lessons.length ===
    0
  ) {
    return (
      <section className="student-journal-modern-section">

        <JournalEmpty
          icon={
            BookOpen
          }
          title="Уроков пока нет"
          text="После заполнения школьного журнала уроки появятся здесь."
        />

      </section>
    )
  }


  return (
    <section className="student-journal-modern-section">

      <div className="student-journal-modern-section-heading">

        <div>
          <p>
            Школьный журнал
          </p>

          <h2>
            {isParent
              ? 'Уроки ребёнка'
              : 'Мои уроки'}
          </h2>
        </div>


        <span className="student-journal-grade-summary">
          {lessons.length}{' '}
          уроков
        </span>

      </div>


      <div
        style={
          lessonsGridStyle
        }
      >

        {lessons.map(
          (lesson) => (
            <LessonCard
              key={
                lesson.id
              }
              lesson={
                lesson
              }
              onOpen={
                onOpen
              }
            />
          ),
        )}

      </div>

    </section>
  )
}


/* =========================================================
   LESSON CARD
========================================================= */

function LessonCard({
  lesson,
  onOpen,
}) {
  const gradeValues =
    lesson.grades
      .map(
        (grade) =>
          grade.value,
      )
      .filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          value !== '',
      )


  const gradesText =
    gradeValues.length >
    0
      ? gradeValues.join(
          ', ',
        )
      : 'Нет'


  const attendanceText =
    lesson.attendance
      ? getShortAttendance(
          lesson.attendance
            .status,
        )
      : 'Не отмечено'


  const homeworkText =
    lesson.tasks.length >
    0
      ? lesson.tasks.length ===
        1
        ? 'Есть'
        : `${lesson.tasks.length} задания`
      : 'Нет'


  return (
    <button
      type="button"
      onClick={() =>
        onOpen(
          lesson,
        )
      }
      style={
        lessonCardStyle
      }
    >

      <div
        style={
          lessonCardTopStyle
        }
      >

        <div
          style={
            lessonIconStyle
          }
        >
          <BookOpen
            size={21}
          />
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
              mutedLabelStyle
            }
          >
            {formatDate(
              lesson.date,
            )}
          </small>


          <h3
            style={
              lessonTitleStyle
            }
          >
            {lesson.subject}
          </h3>


          <p
            style={
              lessonTopicStyle
            }
          >
            {lesson.topic ||
              'Тема не указана'}
          </p>

        </div>


        <ChevronRight
          size={20}
          color="#2563eb"
        />

      </div>


      <div
        style={
          lessonSummaryGridStyle
        }
      >

        <LessonMiniStat
          label="Оценки"
          value={
            gradesText
          }
          state={
            gradeValues.length >
            0
              ? 'good'
              : 'neutral'
          }
        />


        <LessonMiniStat
          label="Посещение"
          value={
            attendanceText
          }
          state={
            lesson.attendance
              ? getAttendanceState(
                  lesson.attendance
                    .status,
                )
              : 'neutral'
          }
        />


        <LessonMiniStat
          label="Домашнее задание"
          value={
            homeworkText
          }
          state={
            lesson.tasks.length >
            0
              ? 'info'
              : 'neutral'
          }
        />

      </div>


      <div
        style={
          lessonOpenRowStyle
        }
      >

        <span
          style={{
            color:
              '#64748b',

            fontSize:
              12,
          }}
        >
          Нажмите, чтобы
          открыть урок
        </span>


        <span
          style={
            moreLinkStyle
          }
        >
          Подробнее

          <ChevronRight
            size={14}
          />
        </span>

      </div>

    </button>
  )
}


/* =========================================================
   MINI STAT
========================================================= */

function LessonMiniStat({
  label,
  value,
  state = 'neutral',
}) {
  const styles = {
    good: {
      background:
        '#ecfdf5',

      color:
        '#047857',
    },

    info: {
      background:
        '#eff6ff',

      color:
        '#1d4ed8',
    },

    warning: {
      background:
        '#fff7ed',

      color:
        '#c2410c',
    },

    danger: {
      background:
        '#fef2f2',

      color:
        '#b91c1c',
    },

    neutral: {
      background:
        '#f8fafc',

      color:
        '#64748b',
    },
  }


  const currentStyle =
    styles[
      state
    ] ||
    styles.neutral


  return (
    <div
      style={{
        ...miniStatStyle,

        background:
          currentStyle.background,
      }}
    >

      <small
        style={{
          color:
            '#94a3b8',

          fontSize:
            10,

          fontWeight:
            700,
        }}
      >
        {label}
      </small>


      <strong
        style={{
          color:
            currentStyle.color,

          fontSize:
            String(
              value,
            ).length > 12
              ? 11
              : 14,

          lineHeight:
            1.25,

          wordBreak:
            'break-word',
        }}
      >
        {value}
      </strong>

    </div>
  )
}


/* =========================================================
   LESSON MODAL
========================================================= */

function LessonModal({
  lesson,
  isParent,
  onClose,
}) {
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

        <div
          style={
            modalHeaderStyle
          }
        >

          <div>
            <small
              style={
                blueLabelStyle
              }
            >
              {isParent
                ? 'Урок ребёнка'
                : 'Школьный урок'}
            </small>


            <h2
              style={{
                margin:
                  '5px 0 0',

                color:
                  '#082451',
              }}
            >
              {lesson.subject}
            </h2>


            <p
              style={{
                margin:
                  '5px 0 0',

                color:
                  '#64748b',
              }}
            >
              {formatDate(
                lesson.date,
              )}

              {' · '}

              {lesson.quarter}{' '}
              четверть
            </p>
          </div>


          <button
            type="button"
            onClick={
              onClose
            }
            style={
              closeButtonStyle
            }
          >
            <X
              size={20}
            />
          </button>

        </div>


        <div
          style={
            modalContentStyle
          }
        >

          <LessonSection
            title="Тема урока"
          >
            {lesson.topic ||
              'Тема пока не указана.'}
          </LessonSection>


          <LessonSection
            title={
              isParent
                ? 'Посещаемость ребёнка'
                : 'Моя посещаемость'
            }
          >

            {lesson.attendance ? (
              <>
                <strong>
                  {getAttendanceStatusLabel(
                    lesson.attendance
                      .status,
                  )}
                </strong>


                {lesson.attendance
                  .comment && (
                  <p
                    style={
                      sectionCommentStyle
                    }
                  >
                    {
                      lesson
                        .attendance
                        .comment
                    }
                  </p>
                )}
              </>
            ) : (
              'Учитель пока не отметил посещаемость.'
            )}

          </LessonSection>


          <LessonSection
            title={
              isParent
                ? 'Оценки ребёнка'
                : 'Мои оценки'
            }
          >

            {lesson.grades.length ===
            0 ? (
              'Оценок за этот урок нет.'
            ) : (
              <div
                style={
                  modalListStyle
                }
              >

                {lesson.grades.map(
                  (grade) => (
                    <div
                      key={
                        grade.id
                      }
                      style={
                        modalGradeStyle
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
                        <strong>
                          {getGradeTypeLabel(
                            grade.workType,
                          )}
                        </strong>

                        {grade.comment && (
                          <p
                            style={
                              sectionCommentStyle
                            }
                          >
                            {grade.comment}
                          </p>
                        )}
                      </div>

                    </div>
                  ),
                )}

              </div>
            )}

          </LessonSection>


          <LessonSection
            title="Домашнее задание"
          >

            {lesson.tasks.length ===
            0 ? (
              'Домашнее задание не задано.'
            ) : (
              <div
                style={
                  modalListStyle
                }
              >

                {lesson.tasks.map(
                  (task) => (
                    <article
                      key={
                        task.id
                      }
                      style={
                        homeworkCardStyle
                      }
                    >

                      <strong>
                        {task.title}
                      </strong>


                      {task.description && (
                        <p
                          style={
                            sectionCommentStyle
                          }
                        >
                          {task.description}
                        </p>
                      )}


                      <small
                        style={{
                          color:
                            '#64748b',
                        }}
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

          </LessonSection>

        </div>

      </section>

    </div>
  )
}


function LessonSection({
  title,
  children,
}) {
  return (
    <section
      style={
        lessonSectionStyle
      }
    >

      <small
        style={
          mutedLabelStyle
        }
      >
        {title}
      </small>


      <div
        style={{
          marginTop:
            7,

          color:
            '#082451',

          lineHeight:
            1.5,
        }}
      >
        {children}
      </div>

    </section>
  )
}


/* =========================================================
   GRADES
========================================================= */

function GradesView({
  loading,
  grades,
  subjects,
  averageGrade,
  excellentGrades,
  goodGrades,
}) {
  if (
    loading
  ) {
    return (
      <section className="student-journal-modern-section">

        <p className="empty-text">
          Загружаем оценки...
        </p>

      </section>
    )
  }


  return (
    <div className="student-journal-modern-grid">

      <section className="student-journal-modern-section">

        <div className="student-journal-modern-section-heading">

          <div>
            <p>
              Предметы
            </p>

            <h2>
              Результаты за четверть
            </h2>
          </div>


          <div className="student-journal-average-badge">
            {averageGrade ??
              '—'}
          </div>

        </div>


        {subjects.length ===
        0 ? (
          <JournalEmpty
            icon={
              BookOpen
            }
            title="Оценок пока нет"
            text="В этой четверти учитель пока не выставил оценок."
          />
        ) : (
          <div className="student-subject-list">

            {subjects.map(
              (item) => (
                <SubjectCard
                  key={
                    item.subject
                  }
                  item={
                    item
                  }
                />
              ),
            )}

          </div>
        )}

      </section>


      <section className="student-journal-modern-section">

        <div className="student-journal-modern-section-heading">

          <div>
            <p>
              Результаты
            </p>

            <h2>
              История оценок
            </h2>
          </div>


          <span className="student-journal-grade-summary">
            5: {excellentGrades}
            {' · '}
            4: {goodGrades}
          </span>

        </div>


        {grades.length ===
        0 ? (
          <JournalEmpty
            icon={
              FileText
            }
            title="История пуста"
            text="Новые оценки появятся здесь после выставления учителем."
          />
        ) : (
          <div className="student-grade-history">

            {grades.map(
              (grade) => (
                <GradeRecord
                  key={
                    grade.id
                  }
                  grade={
                    grade
                  }
                />
              ),
            )}

          </div>
        )}

      </section>

    </div>
  )
}


/* =========================================================
   SUBJECT
========================================================= */

function SubjectCard({
  item,
}) {
  const progress =
    Math.min(
      Math.max(
        (
          Number(
            item.weightedAverage ||
              0,
          ) /
          5
        ) *
          100,
        0,
      ),
      100,
    )


  return (
    <article className="student-subject-card">

      <div className="student-subject-card-top">

        <div>
          <strong>
            {item.subject}
          </strong>

          <span>
            Оценок:{' '}
            {item.count}
            {' / '}
            {
              item.minimumRequired
            }
          </span>
        </div>


        <div
          className={`student-subject-grade ${getGradeClass(
            item.weightedAverage,
          )}`}
        >
          {item.weightedAverage ??
            '—'}
        </div>

      </div>


      <div className="student-subject-progress">
        <span
          style={{
            width:
              `${progress}%`,
          }}
        />
      </div>


      <div
        style={
          subjectStatsStyle
        }
      >

        <MiniResult
          label="Прогноз"
          value={
            item.isAttested
              ? item.suggestedGrade
              : 'Н/А'
          }
        />


        <MiniResult
          label="Четвертная"
          value={
            item.finalGrade ??
            '—'
          }
        />


        <MiniResult
          label="До 5"
          value={
            item.targets
              ?.toFive ===
            null
              ? '—'
              : item.targets
                    .toFive ===
                  0
                ? 'Уже 5'
                : `+${item.targets.toFive}`
          }
        />

      </div>


      {!item.isAttested && (
        <div
          style={
            warningStyle
          }
        >
          Не хватает оценок:{' '}

          <strong>
            {item.missing}
          </strong>
        </div>
      )}


      {item.fiveForecast && (
        <div
          style={
            forecastStyle
          }
        >
          Если следующая контрольная будет{' '}

          <strong>
            5
          </strong>

          , средний станет{' '}

          <strong>
            {
              item.fiveForecast
                .weightedAverage
            }
          </strong>

          {' → прогноз '}

          <strong>
            {
              item.fiveForecast
                .predictedQuarterGrade
            }
          </strong>
        </div>
      )}

    </article>
  )
}


function MiniResult({
  label,
  value,
}) {
  return (
    <div
      style={
        miniResultStyle
      }
    >
      <small>
        {label}
      </small>

      <strong>
        {value}
      </strong>
    </div>
  )
}


/* =========================================================
   GRADE RECORD
========================================================= */

function GradeRecord({
  grade,
}) {
  return (
    <article className="student-grade-record-modern">

      <div
        className={`student-grade-value ${getGradeClass(
          Number(
            grade.value,
          ),
        )}`}
      >
        {grade.value}
      </div>


      <div className="student-grade-record-main">

        <div className="student-grade-record-title">

          <div>
            <h3>
              {grade.subject}
            </h3>

            <p>
              {getGradeTypeLabel(
                grade.workType,
              )}

              {' · '}

              {formatDate(
                grade.date,
              )}
            </p>
          </div>


          <span>
            {grade.teacherName ||
              'Учитель'}
          </span>

        </div>


        {grade.topic && (
          <div className="student-grade-topic">

            <BookOpen
              size={15}
            />

            <span>
              Тема:{' '}
              {grade.topic}
            </span>

          </div>
        )}


        {grade.comment && (
          <div className="student-grade-comment">

            <div>
              <FileText
                size={17}
              />
            </div>

            <span>
              <strong>
                Комментарий учителя
              </strong>

              <p>
                {grade.comment}
              </p>
            </span>

          </div>
        )}

      </div>

    </article>
  )
}


/* =========================================================
   ATTENDANCE
========================================================= */

function AttendanceView({
  records,
  attendance,
  loading,
  reload,
}) {
  return (
    <div className="student-journal-modern-grid">

      <section className="student-journal-modern-section">

        <div className="student-journal-modern-section-heading">

          <div>
            <p>
              Статистика
            </p>

            <h2>
              Посещаемость
            </h2>
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
              refreshButtonStyle
            }
          >
            <RefreshCcw
              size={18}
            />
          </button>

        </div>


        {loading ? (
          <p className="empty-text">
            Загружаем посещаемость...
          </p>
        ) : attendance.total ===
        0 ? (
          <JournalEmpty
            icon={
              CalendarCheck2
            }
            title="Посещаемость ещё не отмечена"
            text="После первого отмеченного урока здесь появится статистика."
          />
        ) : (
          <>
            <div className="student-attendance-modern-grid">

              <AttendanceCard
                icon={
                  CheckCircle2
                }
                value={
                  attendance.present
                }
                label="Присутствовал"
                className="attendance-modern--green"
              />


              <AttendanceCard
                icon={
                  XCircle
                }
                value={
                  attendance.absent
                }
                label="Отсутствовал"
                className="attendance-modern--red"
              />


              <AttendanceCard
                icon={
                  Clock3
                }
                value={
                  attendance.late
                }
                label="Опоздал"
                className="attendance-modern--orange"
              />

            </div>


            <div className="student-attendance-overall">

              <div>
                <span>
                  Общая посещаемость
                </span>

                <strong>
                  {attendance.percent}%
                </strong>
              </div>


              <div>
                <span
                  style={{
                    width:
                      `${attendance.percent}%`,
                  }}
                />
              </div>

            </div>
          </>
        )}

      </section>


      <section className="student-journal-modern-section">

        <div className="student-journal-modern-section-heading">

          <div>
            <p>
              Посещения
            </p>

            <h2>
              История посещаемости
            </h2>
          </div>


          <span className="student-journal-grade-summary">
            Записей:{' '}
            {records.length}
          </span>

        </div>


        {records.length ===
        0 ? (
          <JournalEmpty
            icon={
              CalendarCheck2
            }
            title="Записей пока нет"
            text="Информация появится после отметки учителем."
          />
        ) : (
          <div className="student-attendance-history">

            {records.map(
              (record) => (
                <AttendanceRecord
                  key={
                    record.id
                  }
                  record={
                    record
                  }
                />
              ),
            )}

          </div>
        )}

      </section>

    </div>
  )
}


function AttendanceCard({
  icon: Icon,
  value,
  label,
  className,
}) {
  return (
    <article
      className={`student-attendance-modern-card ${className}`}
    >

      <div>
        <Icon
          size={21}
        />
      </div>


      <span>
        <strong>
          {value}
        </strong>

        <small>
          {label}
        </small>
      </span>

    </article>
  )
}


function AttendanceRecord({
  record,
}) {
  return (
    <article className="student-attendance-record">

      <div className="student-attendance-record-main">

        <div>
          <h3>
            {record.subject}
          </h3>

          <span>
            {record.teacherName ||
              'Учитель'}
          </span>
        </div>


        <p>
          {getAttendanceStatusLabel(
            record.status,
          )}

          {' · '}

          {formatDate(
            record.date,
          )}
        </p>


        {record.comment && (
          <div className="student-grade-comment">

            <div>
              <FileText
                size={17}
              />
            </div>

            <span>
              <strong>
                Комментарий учителя
              </strong>

              <p>
                {record.comment}
              </p>
            </span>

          </div>
        )}

      </div>

    </article>
  )
}


/* =========================================================
   STATES
========================================================= */

function JournalAccessState({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="student-journal-page">

      <section className="student-journal-access">

        <div>
          <Icon
            size={34}
          />
        </div>

        <h1>
          {title}
        </h1>

        <p>
          {text}
        </p>

      </section>

    </div>
  )
}


function JournalEmpty({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="student-journal-empty">

      <div>
        <Icon
          size={30}
        />
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>

    </div>
  )
}


function ErrorMessage({
  text,
}) {
  return (
    <div
      className="auth-error"
      style={{
        marginBottom:
          16,
      }}
    >
      {text}
    </div>
  )
}


/* =========================================================
   NORMALIZE
========================================================= */

function normalizeJournalLesson(
  lesson,
) {
  return {
    id:
      lesson.id,

    school:
      lesson.school,

    schoolId:
      lesson.school_id,

    className:
      lesson.class_name,

    subject:
      lesson.subject,

    quarter:
      Number(
        lesson.quarter ||
          1,
      ),

    date:
      lesson.lesson_date,

    topic:
      lesson.topic ||
      '',

    teacherId:
      lesson.teacher_id,

    scheduleLessonId:
      lesson.schedule_lesson_id,
  }
}


/* =========================================================
   HELPERS
========================================================= */

function getGradeClass(
  value,
) {
  const grade =
    Number(
      value,
    )


  if (
    value === null ||
    value === undefined ||
    value === '' ||
    Number.isNaN(
      grade,
    )
  ) {
    return ''
  }


  if (
    grade >=
    4.5
  ) {
    return 'grade-modern--excellent'
  }


  if (
    grade >=
    3.5
  ) {
    return 'grade-modern--good'
  }


  if (
    grade >=
    2.5
  ) {
    return 'grade-modern--normal'
  }


  return 'grade-modern--bad'
}


function getShortAttendance(
  status,
) {
  const labels = {
    present:
      'Присутствовал',

    absent:
      'Отсутствовал',

    late:
      'Опоздал',

    excused:
      'Уважительная',
  }


  return (
    labels[
      status
    ] ||
    'Не отмечено'
  )
}


function getAttendanceState(
  status,
) {
  if (
    status ===
    'present'
  ) {
    return 'good'
  }


  if (
    status ===
    'late'
  ) {
    return 'warning'
  }


  if (
    status ===
    'absent'
  ) {
    return 'danger'
  }


  if (
    status ===
    'excused'
  ) {
    return 'info'
  }


  return 'neutral'
}


function formatDate(
  date,
) {
  if (
    !date
  ) {
    return 'Дата не указана'
  }


  const parsed =
    new Date(
      `${date}T12:00:00`,
    )


  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return date
  }


  return parsed.toLocaleDateString(
    'ru-RU',
    {
      day:
        '2-digit',

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


  const parsed =
    new Date(
      value,
    )


  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return value
  }


  return parsed.toLocaleString(
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


/* =========================================================
   STYLES
========================================================= */

const refreshButtonStyle = {
  width:
    40,

  height:
    40,

  border:
    '1px solid #dbeafe',

  borderRadius:
    11,

  background:
    '#eff6ff',

  color:
    '#2563eb',

  cursor:
    'pointer',

  display:
    'grid',

  placeItems:
    'center',
}


const parentSwitcherStyle = {
  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    14,

  flexWrap:
    'wrap',

  marginBottom:
    18,

  padding:
    '15px 17px',

  border:
    '1px solid #dbeafe',

  borderRadius:
    17,

  background:
    '#f8fbff',
}


const parentSelectStyle = {
  minWidth:
    190,

  minHeight:
    42,

  padding:
    '0 36px 0 12px',

  border:
    '1px solid #cbd5e1',

  borderRadius:
    11,

  background:
    '#ffffff',
}


const mutedLabelStyle = {
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


const blueLabelStyle = {
  ...mutedLabelStyle,

  color:
    '#2563eb',
}


const lessonsGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit, minmax(260px, 1fr))',

  gap:
    12,
}


const lessonCardStyle = {
  width:
    '100%',

  padding:
    15,

  border:
    '1px solid #dbeafe',

  borderRadius:
    16,

  background:
    '#ffffff',

  cursor:
    'pointer',

  textAlign:
    'left',
}


const lessonCardTopStyle = {
  display:
    'flex',

  alignItems:
    'flex-start',

  gap:
    11,
}


const lessonIconStyle = {
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
    12,

  background:
    '#eff6ff',

  color:
    '#2563eb',
}


const lessonTitleStyle = {
  margin:
    '3px 0 0',

  color:
    '#082451',

  fontSize:
    17,
}


const lessonTopicStyle = {
  margin:
    '4px 0 0',

  color:
    '#64748b',

  fontSize:
    13,

  whiteSpace:
    'nowrap',

  overflow:
    'hidden',

  textOverflow:
    'ellipsis',
}


const lessonSummaryGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(3, minmax(0, 1fr))',

  gap:
    7,

  marginTop:
    13,
}


const miniStatStyle = {
  padding:
    8,

  minHeight:
    58,

  borderRadius:
    10,

  textAlign:
    'center',

  display:
    'grid',

  alignContent:
    'center',

  gap:
    3,
}


const lessonOpenRowStyle = {
  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    10,

  marginTop:
    12,

  paddingTop:
    11,

  borderTop:
    '1px solid #eef2f7',
}


const moreLinkStyle = {
  display:
    'inline-flex',

  alignItems:
    'center',

  gap:
    4,

  color:
    '#2563eb',

  fontSize:
    12,

  fontWeight:
    800,
}


const subjectStatsStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit, minmax(110px, 1fr))',

  gap:
    8,

  marginTop:
    12,
}


const miniResultStyle = {
  padding:
    '9px 10px',

  borderRadius:
    10,

  background:
    '#f8fafc',
}


const warningStyle = {
  marginTop:
    12,

  padding:
    '9px 11px',

  borderRadius:
    10,

  background:
    '#fff7ed',

  fontSize:
    13,
}


const forecastStyle = {
  marginTop:
    9,

  padding:
    '9px 11px',

  borderRadius:
    10,

  background:
    '#eff6ff',

  fontSize:
    13,
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
    1300,

  display:
    'grid',

  placeItems:
    'center',

  padding:
    18,

  background:
    'rgba(15, 23, 42, 0.5)',
}


const modalCardStyle = {
  width:
    'min(650px, 100%)',

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
    '0 24px 90px rgba(15, 23, 42, 0.28)',
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


const closeButtonStyle = {
  width:
    40,

  height:
    40,

  display:
    'grid',

  placeItems:
    'center',

  border:
    '1px solid #e2e8f0',

  borderRadius:
    11,

  background:
    '#ffffff',

  cursor:
    'pointer',
}


const modalContentStyle = {
  display:
    'grid',

  gap:
    12,

  marginTop:
    15,
}


const lessonSectionStyle = {
  padding:
    14,

  border:
    '1px solid #e2e8f0',

  borderRadius:
    14,

  background:
    '#fbfdff',
}


const modalListStyle = {
  display:
    'grid',

  gap:
    8,
}


const modalGradeStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    10,

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
  const number =
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
      number >= 5
        ? '#dcfce7'
        : number >= 4
          ? '#dbeafe'
          : number >= 3
            ? '#fef3c7'
            : '#fee2e2',

    color:
      '#082451',

    fontSize:
      17,

    fontWeight:
      900,
  }
}


const homeworkCardStyle = {
  padding:
    11,

  border:
    '1px solid #dbeafe',

  borderRadius:
    11,

  background:
    '#ffffff',
}


const sectionCommentStyle = {
  margin:
    '5px 0 0',

  color:
    '#64748b',

  fontSize:
    13,

  lineHeight:
    1.5,
}


export default StudentJournalPage