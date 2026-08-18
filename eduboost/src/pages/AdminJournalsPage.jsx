import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  Search,
  UserRound,
  Users,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  ROLES,
} from '../config/access'

import {
  calculateWeightedAverage,
  getSuggestedQuarterGrade,
} from '../services/supabaseJournalService'

import {
  getGradingMinimum,
  getSupabaseClassGrades,
  getSupabaseClassQuarterGrades,
} from '../services/supabaseJournalClassService'

import {
  getSupabaseJournalLessons,
} from '../services/supabaseJournalLessonService'

import {
  calculateSupabaseAttendanceStats,
  getAttendanceStatusLabel,
  getSupabaseClassAttendance,
} from '../services/supabaseAttendanceService'

import {
  getAdminSchoolClasses,
  getAdminSchoolTeachers,
  getAdminStudentsByClass,
} from '../services/supabaseAdminJournalService'


const SUBJECTS = [
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


function getToday() {
  const now =
    new Date()

  const local =
    new Date(
      now.getTime() -
        now.getTimezoneOffset() *
          60000,
    )

  return local
    .toISOString()
    .slice(
      0,
      10,
    )
}


function AdminJournalsPage() {
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
    classes,
    setClasses,
  ] = useState([])

  const [
    teachers,
    setTeachers,
  ] = useState([])

  const [
    students,
    setStudents,
  ] = useState([])

  const [
    grades,
    setGrades,
  ] = useState([])

  const [
    lessons,
    setLessons,
  ] = useState([])

  const [
    quarterGrades,
    setQuarterGrades,
  ] = useState([])

  const [
    attendance,
    setAttendance,
  ] = useState([])


  const [
    selectedClass,
    setSelectedClass,
  ] = useState('')

  const [
    selectedSubject,
    setSelectedSubject,
  ] = useState(
    'Математика',
  )

  const [
    selectedTeacherId,
    setSelectedTeacherId,
  ] = useState(
    'all',
  )

  const [
    selectedQuarter,
    setSelectedQuarter,
  ] = useState(1)

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    getToday(),
  )

  const [
    minimumGrades,
    setMinimumGrades,
  ] = useState(3)

  const [
    search,
    setSearch,
  ] = useState('')


  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    journalLoading,
    setJournalLoading,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')


  const allowed =
    user?.role ===
      ROLES.VICE_PRINCIPAL ||
    user?.role ===
      ROLES.DIRECTOR


  /* ========================================
     INITIAL DATA
  ======================================== */

  useEffect(() => {
    if (
      !user?.id ||
      !allowed
    ) {
      return
    }

    void loadInitialData()
  }, [
    user?.id,
    user?.schoolId,
    user?.school,
    user?.role,
  ])


  async function loadInitialData() {
    try {
      setLoading(true)
      setError('')

      const [
        classesResult,
        teachersResult,
      ] =
        await Promise.allSettled([
          getAdminSchoolClasses(
            user,
          ),

          getAdminSchoolTeachers(
            user,
          ),
        ])


      if (
        classesResult.status !==
        'fulfilled'
      ) {
        throw (
          classesResult.reason
        )
      }


      const safeClasses =
        Array.isArray(
          classesResult.value,
        )
          ? classesResult.value
          : []


      setClasses(
        safeClasses,
      )


      setSelectedClass(
        (current) => {
          if (
            current &&
            safeClasses.includes(
              current,
            )
          ) {
            return current
          }

          return (
            safeClasses[0] ||
            ''
          )
        },
      )


      if (
        teachersResult.status ===
        'fulfilled'
      ) {
        const safeTeachers =
          Array.isArray(
            teachersResult.value,
          )
            ? teachersResult.value
            : []

        setTeachers(
          safeTeachers,
        )


        setSelectedTeacherId(
          (current) => {
            if (
              current ===
              'all'
            ) {
              return current
            }

            const exists =
              safeTeachers.some(
                (teacher) =>
                  String(
                    teacher.id,
                  ) ===
                  String(
                    current,
                  ),
              )

            return exists
              ? current
              : 'all'
          },
        )
      } else {
        console.error(
          'Teachers load:',
          teachersResult.reason,
        )

        setTeachers([])

        setSelectedTeacherId(
          'all',
        )
      }
    } catch (
      loadError
    ) {
      console.error(
        'Admin journal initial:',
        loadError,
      )

      setClasses([])
      setTeachers([])
      setSelectedClass('')

      setError(
        loadError?.message ||
          'Не удалось загрузить данные школы.',
      )
    } finally {
      setLoading(false)
    }
  }


  /* ========================================
     STUDENTS
  ======================================== */

  useEffect(() => {
    if (
      !user?.id ||
      !allowed ||
      !selectedClass
    ) {
      setStudents([])

      return
    }

    void loadStudents()
  }, [
    user?.id,
    user?.schoolId,
    user?.school,
    selectedClass,
  ])


  async function loadStudents() {
    try {
      setError('')

      const rows =
        await getAdminStudentsByClass(
          user,
          selectedClass,
        )

      setStudents(
        deduplicateStudents(
          Array.isArray(
            rows,
          )
            ? rows
            : [],
        ),
      )
    } catch (
      loadError
    ) {
      console.error(
        'Journal students:',
        loadError,
      )

      setStudents([])

      setError(
        loadError?.message ||
          'Не удалось загрузить учеников класса.',
      )
    }
  }


  /* ========================================
     GRADES JOURNAL
  ======================================== */

  useEffect(() => {
    if (
      activeTab !==
        'grades' ||
      !user?.id ||
      !allowed ||
      !selectedClass ||
      !selectedSubject
    ) {
      return
    }

    void loadGradesJournal()
  }, [
    activeTab,
    user?.id,
    user?.schoolId,
    user?.school,
    selectedClass,
    selectedSubject,
    selectedQuarter,
  ])


  async function loadGradesJournal() {
    try {
      setJournalLoading(
        true,
      )

      setError('')


      const results =
        await Promise.allSettled([
          getSupabaseClassGrades({
            teacher:
              user,

            className:
              selectedClass,

            subject:
              selectedSubject,

            quarter:
              selectedQuarter,
          }),

          getSupabaseJournalLessons({
            teacher:
              user,

            className:
              selectedClass,

            subject:
              selectedSubject,

            quarter:
              selectedQuarter,
          }),

          getSupabaseClassQuarterGrades({
            teacher:
              user,

            className:
              selectedClass,

            subject:
              selectedSubject,

            quarter:
              selectedQuarter,
          }),

          getGradingMinimum({
            teacher:
              user,

            className:
              selectedClass,

            subject:
              selectedSubject,
          }),
        ])


      const [
        gradesResult,
        lessonsResult,
        quarterResult,
        minimumResult,
      ] = results


      if (
        gradesResult.status !==
        'fulfilled'
      ) {
        throw (
          gradesResult.reason
        )
      }


      if (
        lessonsResult.status !==
        'fulfilled'
      ) {
        throw (
          lessonsResult.reason
        )
      }


      if (
        quarterResult.status !==
        'fulfilled'
      ) {
        throw (
          quarterResult.reason
        )
      }


      setGrades(
        Array.isArray(
          gradesResult.value,
        )
          ? gradesResult.value
          : [],
      )


      setLessons(
        Array.isArray(
          lessonsResult.value,
        )
          ? lessonsResult.value
          : [],
      )


      setQuarterGrades(
        Array.isArray(
          quarterResult.value,
        )
          ? quarterResult.value
          : [],
      )


      if (
        minimumResult.status ===
        'fulfilled'
      ) {
        setMinimumGrades(
          Number(
            minimumResult.value,
          ) ||
            3,
        )
      } else {
        console.warn(
          'Grading minimum:',
          minimumResult.reason,
        )

        setMinimumGrades(3)
      }
    } catch (
      loadError
    ) {
      console.error(
        'Journal load:',
        loadError,
      )

      setGrades([])
      setLessons([])
      setQuarterGrades([])

      setError(
        loadError?.message ||
          'Не удалось загрузить журнал.',
      )
    } finally {
      setJournalLoading(
        false,
      )
    }
  }


  /* ========================================
     ATTENDANCE
  ======================================== */

  useEffect(() => {
    if (
      activeTab !==
        'attendance' ||
      !user?.id ||
      !allowed ||
      !selectedClass ||
      !selectedSubject ||
      !selectedDate
    ) {
      return
    }

    void loadAttendance()
  }, [
    activeTab,
    user?.id,
    user?.schoolId,
    user?.school,
    selectedClass,
    selectedSubject,
    selectedDate,
  ])


  async function loadAttendance() {
    try {
      setJournalLoading(
        true,
      )

      setError('')


      const rows =
        await getSupabaseClassAttendance({
          teacher:
            user,

          className:
            selectedClass,

          subject:
            selectedSubject,

          dateFrom:
            selectedDate,

          dateTo:
            selectedDate,
        })


      setAttendance(
        Array.isArray(
          rows,
        )
          ? rows
          : [],
      )
    } catch (
      loadError
    ) {
      console.error(
        'Journal attendance:',
        loadError,
      )

      setAttendance([])

      setError(
        loadError?.message ||
          'Не удалось загрузить посещаемость.',
      )
    } finally {
      setJournalLoading(
        false,
      )
    }
  }


  /* ========================================
     TEACHER
  ======================================== */

  const selectedTeacher =
    useMemo(() => {
      if (
        selectedTeacherId ===
        'all'
      ) {
        return null
      }

      return (
        teachers.find(
          (teacher) =>
            String(
              teacher.id,
            ) ===
            String(
              selectedTeacherId,
            ),
        ) ||
        null
      )
    }, [
      teachers,
      selectedTeacherId,
    ])


  const selectedTeacherName =
    selectedTeacher?.name ||
    'Все учителя'


  function matchesTeacher(
    item,
  ) {
    if (
      selectedTeacherId ===
      'all'
    ) {
      return true
    }


    const itemTeacherId =
      item?.teacherId ||
      item?.teacher_id


    if (
      itemTeacherId
    ) {
      return (
        String(
          itemTeacherId,
        ) ===
        String(
          selectedTeacherId,
        )
      )
    }


    const itemTeacherName =
      item?.teacherName ||
      item?.teacher_name


    if (
      itemTeacherName &&
      selectedTeacher?.name
    ) {
      return (
        normalizeText(
          itemTeacherName,
        ) ===
        normalizeText(
          selectedTeacher.name,
        )
      )
    }


    return false
  }


  /* ========================================
     FILTERED DATA
  ======================================== */

  const filteredGrades =
    useMemo(
      () =>
        grades.filter(
          matchesTeacher,
        ),
      [
        grades,
        selectedTeacherId,
        selectedTeacher,
      ],
    )


  const filteredLessons =
    useMemo(
      () =>
        lessons.filter(
          matchesTeacher,
        ),
      [
        lessons,
        selectedTeacherId,
        selectedTeacher,
      ],
    )


  const filteredQuarterGrades =
    useMemo(
      () =>
        quarterGrades.filter(
          matchesTeacher,
        ),
      [
        quarterGrades,
        selectedTeacherId,
        selectedTeacher,
      ],
    )


  const filteredAttendance =
    useMemo(
      () =>
        attendance.filter(
          matchesTeacher,
        ),
      [
        attendance,
        selectedTeacherId,
        selectedTeacher,
      ],
    )


  /* ========================================
     JOURNAL COLUMNS
  ======================================== */

  const columns =
    useMemo(() => {
      const map =
        new Map()


      filteredLessons.forEach(
        (lesson) => {
          const date =
            lesson?.date ||
            lesson?.lessonDate ||
            lesson?.lesson_date

          if (
            !date
          ) {
            return
          }

          map.set(
            date,
            {
              date,

              topic:
                lesson.topic ||
                lesson.lessonTopic ||
                lesson.lesson_topic ||
                '',
            },
          )
        },
      )


      filteredGrades.forEach(
        (grade) => {
          const date =
            grade?.date ||
            grade?.gradeDate ||
            grade?.grade_date

          if (
            !date
          ) {
            return
          }

          if (
            !map.has(
              date,
            )
          ) {
            map.set(
              date,
              {
                date,

                topic:
                  grade.topic ||
                  '',
              },
            )
          }
        },
      )


      return [
        ...map.values(),
      ].sort(
        (
          first,
          second,
        ) =>
          String(
            first.date,
          ).localeCompare(
            String(
              second.date,
            ),
          ),
      )
    }, [
      filteredLessons,
      filteredGrades,
    ])


  /* ========================================
     GRADE ROWS
  ======================================== */

  const gradeRows =
    useMemo(() => {
      return students.map(
        (student) => {
          const studentGrades =
            filteredGrades.filter(
              (grade) =>
                String(
                  grade.studentId ||
                    grade.student_id,
                ) ===
                String(
                  student.id,
                ),
            )


          const average =
            calculateWeightedAverage(
              studentGrades,
            )


          const minimum =
            Number(
              minimumGrades,
            ) ||
            3


          const isAttested =
            studentGrades.length >=
            minimum


          const predicted =
            isAttested
              ? getSuggestedQuarterGrade(
                  average,
                )
              : null


          const finalRow =
            filteredQuarterGrades.find(
              (item) =>
                String(
                  item.studentId ||
                    item.student_id,
                ) ===
                String(
                  student.id,
                ),
            )


          return {
            student,

            grades:
              studentGrades,

            average,

            predicted,

            finalGrade:
              finalRow
                ?.finalGrade ??
              finalRow
                ?.final_grade ??
              null,

            isAttested,

            missing:
              Math.max(
                minimum -
                  studentGrades.length,
                0,
              ),
          }
        },
      )
    }, [
      students,
      filteredGrades,
      filteredQuarterGrades,
      minimumGrades,
    ])


  /* ========================================
     SEARCH
  ======================================== */

  const searchValue =
    normalizeText(
      search,
    )


  const visibleGradeRows =
    useMemo(() => {
      if (
        !searchValue
      ) {
        return gradeRows
      }

      return gradeRows.filter(
        (row) =>
          normalizeText(
            row.student
              ?.name,
          ).includes(
            searchValue,
          ),
      )
    }, [
      gradeRows,
      searchValue,
    ])


  const visibleStudents =
    useMemo(() => {
      if (
        !searchValue
      ) {
        return students
      }

      return students.filter(
        (student) =>
          normalizeText(
            student.name,
          ).includes(
            searchValue,
          ),
      )
    }, [
      students,
      searchValue,
    ])


  /* ========================================
     ATTENDANCE
  ======================================== */

  const attendanceMap =
    useMemo(() => {
      const map =
        new Map()

      filteredAttendance.forEach(
        (record) => {
          const studentId =
            record.studentId ||
            record.student_id

          if (
            !studentId
          ) {
            return
          }

          map.set(
            String(
              studentId,
            ),
            record,
          )
        },
      )

      return map
    }, [
      filteredAttendance,
    ])


  const attendanceStats =
    useMemo(
      () =>
        calculateSupabaseAttendanceStats(
          filteredAttendance,
        ),
      [
        filteredAttendance,
      ],
    )


  const attendancePercent =
    filteredAttendance.length >
    0
      ? `${attendanceStats.percent || 0}%`
      : '—'


  /* ========================================
     KPI
  ======================================== */

  const stats =
    activeTab ===
    'grades'
      ? [
          {
            icon:
              GraduationCap,

            value:
              classes.length,

            label:
              getWordForm(
                classes.length,
                [
                  'класс',
                  'класса',
                  'классов',
                ],
              ),

            helper:
              'Всего в школе',
          },

          {
            icon:
              Users,

            value:
              students.length,

            label:
              getWordForm(
                students.length,
                [
                  'ученик',
                  'ученика',
                  'учеников',
                ],
              ),

            helper:
              selectedClass ||
              'Класс не выбран',
          },

          {
            icon:
              BookOpen,

            value:
              filteredGrades.length,

            label:
              getWordForm(
                filteredGrades.length,
                [
                  'оценка',
                  'оценки',
                  'оценок',
                ],
              ),

            helper:
              `${selectedSubject} · ${selectedQuarter} четверть`,
          },

          {
            icon:
              CalendarDays,

            value:
              filteredLessons.length,

            label:
              getWordForm(
                filteredLessons.length,
                [
                  'урок',
                  'урока',
                  'уроков',
                ],
              ),

            helper:
              selectedTeacherName,
          },
        ]
      : [
          {
            icon:
              Users,

            value:
              students.length,

            label:
              getWordForm(
                students.length,
                [
                  'ученик',
                  'ученика',
                  'учеников',
                ],
              ),

            helper:
              selectedClass ||
              'Класс не выбран',
          },

          {
            icon:
              CalendarDays,

            value:
              filteredAttendance.length,

            label:
              getWordForm(
                filteredAttendance.length,
                [
                  'отметка',
                  'отметки',
                  'отметок',
                ],
              ),

            helper:
              formatDate(
                selectedDate,
              ),
          },

          {
            icon:
              GraduationCap,

            value:
              attendancePercent,

            label:
              'Посещаемость',

            helper:
              filteredAttendance.length >
              0
                ? 'По имеющимся отметкам'
                : 'Данных пока нет',
          },
        ]


  /* ========================================
     ACCESS
  ======================================== */

  if (
    !user
  ) {
    return null
  }


  if (
    !allowed
  ) {
    return (
      <div
        className="page-container"
      >
        <section
          className="content-card"
        >
          <h2>
            Доступ запрещён
          </h2>

          <p>
            Журналы школы доступны
            завучу и директору.
          </p>
        </section>
      </div>
    )
  }


  /* ========================================
     PAGE
  ======================================== */

  return (
    <div
      className="page-container"
    >

      <header
        className="page-header"
      >
        <div>
          <h1>
            Журналы школы
          </h1>

          <p>
            Контроль оценок,
            четвертных результатов
            и посещаемости.
          </p>
        </div>
      </header>


      {/* TABS */}

      <div
        style={
          tabsStyle
        }
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab(
              'grades',
            )

            setError('')
          }}
          style={
            tabStyle(
              activeTab ===
                'grades',
            )
          }
        >
          📘 Оценки
        </button>


        <button
          type="button"
          onClick={() => {
            setActiveTab(
              'attendance',
            )

            setError('')
          }}
          style={
            tabStyle(
              activeTab ===
                'attendance',
            )
          }
        >
          📅 Посещаемость
        </button>
      </div>


      {/* KPI */}

      <div
        style={
          statsGridStyle
        }
      >
        {stats.map(
          (item) => (
            <StatCard
              key={
                `${activeTab}-${item.label}`
              }
              icon={
                item.icon
              }
              value={
                item.value
              }
              label={
                item.label
              }
              helper={
                item.helper
              }
            />
          ),
        )}
      </div>


      {/* FILTERS */}

      <section
        className="content-card"
      >
        <div
          style={
            filtersStyle
          }
        >

          <label
            className="form-group"
          >
            <span>
              Класс
            </span>

            <select
              value={
                selectedClass
              }
              onChange={
                (event) => {
                  setSelectedClass(
                    event.target.value,
                  )

                  setSearch('')
                }
              }
              disabled={
                loading
              }
            >
              {classes.length ===
                0 && (
                <option
                  value=""
                >
                  Нет классов
                </option>
              )}

              {classes.map(
                (className) => (
                  <option
                    key={
                      className
                    }
                    value={
                      className
                    }
                  >
                    {className}
                  </option>
                ),
              )}
            </select>
          </label>


          <label
            className="form-group"
          >
            <span>
              Предмет
            </span>

            <select
              value={
                selectedSubject
              }
              onChange={
                (event) =>
                  setSelectedSubject(
                    event.target.value,
                  )
              }
            >
              {SUBJECTS.map(
                (subject) => (
                  <option
                    key={
                      subject
                    }
                    value={
                      subject
                    }
                  >
                    {subject}
                  </option>
                ),
              )}
            </select>
          </label>


          <label
            className="form-group"
          >
            <span>
              Учитель
            </span>

            <select
              value={
                selectedTeacherId
              }
              onChange={
                (event) =>
                  setSelectedTeacherId(
                    event.target.value,
                  )
              }
            >
              <option
                value="all"
              >
                Все учителя
              </option>

              {teachers.map(
                (teacher) => (
                  <option
                    key={
                      teacher.id
                    }
                    value={
                      teacher.id
                    }
                  >
                    {teacher.name}
                  </option>
                ),
              )}
            </select>
          </label>


          {activeTab ===
            'grades' && (
            <label
              className="form-group"
            >
              <span>
                Четверть
              </span>

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
                {[1, 2, 3, 4].map(
                  (quarter) => (
                    <option
                      key={
                        quarter
                      }
                      value={
                        quarter
                      }
                    >
                      {quarter} четверть
                    </option>
                  ),
                )}
              </select>
            </label>
          )}


          {activeTab ===
            'attendance' && (
            <label
              className="form-group"
            >
              <span>
                Дата
              </span>

              <input
                type="date"
                value={
                  selectedDate
                }
                onChange={
                  (event) =>
                    setSelectedDate(
                      event.target.value,
                    )
                }
              />
            </label>
          )}


          <label
            className="form-group"
          >
            <span>
              Поиск ученика
            </span>

            <div
              style={
                searchStyle
              }
            >
              <Search
                size={18}
              />

              <input
                value={
                  search
                }
                onChange={
                  (event) =>
                    setSearch(
                      event.target.value,
                    )
                }
                placeholder="Имя ученика"
                style={
                  searchInputStyle
                }
              />
            </div>
          </label>

        </div>
      </section>


      <div
        style={
          currentTeacherStyle
        }
      >
        <UserRound
          size={17}
        />

        <span>
          Учитель:
        </span>

        <strong>
          {selectedTeacherName}
        </strong>
      </div>


      {error && (
        <section
          className="content-card"
        >
          <div
            className="auth-error"
          >
            {error}
          </div>
        </section>
      )}


      {!loading &&
        classes.length ===
          0 &&
        !error && (
        <section
          className="content-card"
        >
          <EmptyState
            icon={
              GraduationCap
            }
            title="Классы не найдены"
            text="В школе пока нет классов для отображения."
          />
        </section>
      )}


      {/* =================================
          GRADES
      ================================= */}

      {activeTab ===
        'grades' &&
        classes.length >
          0 && (
        <section
          className="content-card"
        >
          <SectionHeader
            eyebrow={
              `${selectedClass} · ${selectedSubject} · ${selectedTeacherName}`
            }
            title={
              `${selectedQuarter} четверть`
            }
          />


          <div
            style={
              infoStyle
            }
          >
            Минимум для
            аттестации:{' '}

            <strong>
              {minimumGrades}{' '}
              {getWordForm(
                minimumGrades,
                [
                  'оценка',
                  'оценки',
                  'оценок',
                ],
              )}
            </strong>
          </div>


          {loading ||
          journalLoading ? (
            <p
              className="empty-text"
            >
              Загружаем журнал...
            </p>
          ) : students.length ===
            0 ? (
            <EmptyState
              icon={
                Users
              }
              title="В классе нет учеников"
              text="Добавьте учеников в выбранный класс."
            />
          ) : (
            <GradeTable
              rows={
                visibleGradeRows
              }
              columns={
                columns
              }
              teacherSelected={
                selectedTeacherId !==
                'all'
              }
            />
          )}
        </section>
      )}


      {/* =================================
          ATTENDANCE
      ================================= */}

      {activeTab ===
        'attendance' &&
        classes.length >
          0 && (
        <section
          className="content-card"
        >
          <SectionHeader
            eyebrow={
              `${selectedClass} · ${selectedSubject} · ${selectedTeacherName}`
            }
            title={
              `Посещаемость · ${formatDate(
                selectedDate,
              )}`
            }
          />


          <div
            style={
              attendanceStatsStyle
            }
          >
            <MiniStat
              label="Присутствовали"
              value={
                attendanceStats.present ||
                0
              }
            />

            <MiniStat
              label="Отсутствовали"
              value={
                attendanceStats.absent ||
                0
              }
            />

            <MiniStat
              label="Опоздали"
              value={
                attendanceStats.late ||
                0
              }
            />

            <MiniStat
              label="Уважительная"
              value={
                attendanceStats.excused ||
                0
              }
            />

            <MiniStat
              label="Посещаемость"
              value={
                attendancePercent
              }
            />
          </div>


          {journalLoading ? (
            <p
              className="empty-text"
            >
              Загружаем посещаемость...
            </p>
          ) : students.length ===
            0 ? (
            <EmptyState
              icon={
                Users
              }
              title="В классе нет учеников"
              text="Добавьте учеников в выбранный класс."
            />
          ) : (
            <AttendanceTable
              students={
                visibleStudents
              }
              recordsMap={
                attendanceMap
              }
            />
          )}
        </section>
      )}

    </div>
  )
}


/* ========================================
   SECTION HEADER
======================================== */

function SectionHeader({
  eyebrow,
  title,
}) {
  return (
    <div
      style={
        sectionHeaderStyle
      }
    >
      <div>
        <p
          style={
            eyebrowStyle
          }
        >
          {eyebrow}
        </p>

        <h2
          style={
            sectionTitleStyle
          }
        >
          {title}
        </h2>
      </div>


      <div
        style={
          readonlyStyle
        }
      >
        Только просмотр
      </div>
    </div>
  )
}


/* ========================================
   GRADE TABLE
======================================== */

function GradeTable({
  rows,
  columns,
  teacherSelected,
}) {
  if (
    rows.length ===
    0
  ) {
    return (
      <EmptyState
        icon={
          Search
        }
        title="Ученики не найдены"
        text="Измени поиск ученика."
      />
    )
  }


  const hasAnyGrades =
    rows.some(
      (row) =>
        row.grades.length >
        0,
    )


  return (
    <>
      {teacherSelected &&
        !hasAnyGrades && (
        <div
          style={
            teacherEmptyStyle
          }
        >
          У выбранного учителя
          пока нет оценок по этому
          классу, предмету и четверти.
        </div>
      )}


      <div
        style={
          tableWrapperStyle
        }
      >
        <table
          style={{
            width:
              '100%',

            borderCollapse:
              'collapse',

            minWidth:
              Math.max(
                850,
                430 +
                  columns.length *
                    80,
              ),
          }}
        >
          <thead>
            <tr>
              <th
                style={
                  stickyHeaderStyle
                }
              >
                Ученик
              </th>


              {columns.map(
                (column) => (
                  <th
                    key={
                      column.date
                    }
                    style={
                      headerStyle
                    }
                    title={
                      column.topic ||
                      formatDate(
                        column.date,
                      )
                    }
                  >
                    {formatShortDate(
                      column.date,
                    )}

                    <small
                      style={
                        topicStyle
                      }
                    >
                      {column.topic ||
                        'Урок'}
                    </small>
                  </th>
                ),
              )}


              <th
                style={
                  headerStyle
                }
              >
                Ср.
              </th>

              <th
                style={
                  headerStyle
                }
              >
                Прогноз
              </th>

              <th
                style={
                  headerStyle
                }
              >
                Итог
              </th>
            </tr>
          </thead>


          <tbody>
            {rows.map(
              (row) => (
                <tr
                  key={
                    row.student.id
                  }
                >
                  <td
                    style={
                      stickyCellStyle
                    }
                  >
                    <StudentCell
                      student={
                        row.student
                      }
                      missing={
                        !row.isAttested &&
                        row.grades
                          .length >
                          0
                          ? row.missing
                          : null
                      }
                    />
                  </td>


                  {columns.map(
                    (column) => {
                      const cellGrades =
                        row.grades.filter(
                          (grade) =>
                            getGradeDate(
                              grade,
                            ) ===
                            column.date,
                        )

                      return (
                        <td
                          key={
                            column.date
                          }
                          style={
                            bodyStyle
                          }
                        >
                          {cellGrades.length ===
                          0 ? (
                            <span
                              style={
                                emptyGradeStyle
                              }
                            >
                              —
                            </span>
                          ) : (
                            <div
                              style={
                                gradeListStyle
                              }
                            >
                              {cellGrades.map(
                                (
                                  grade,
                                ) => (
                                  <span
                                    key={
                                      grade.id
                                    }
                                    style={
                                      gradeStyle(
                                        grade.value,
                                      )
                                    }
                                    title={
                                      [
                                        grade.gradeType ||
                                          grade.workType,
                                        grade.topic,
                                        grade.teacherName,
                                      ]
                                        .filter(
                                          Boolean,
                                        )
                                        .join(
                                          ' · ',
                                        )
                                    }
                                  >
                                    {grade.value}
                                  </span>
                                ),
                              )}
                            </div>
                          )}
                        </td>
                      )
                    },
                  )}


                  <td
                    style={
                      bodyStyle
                    }
                  >
                    <strong>
                      {row.average ??
                        '—'}
                    </strong>
                  </td>


                  <td
                    style={
                      bodyStyle
                    }
                  >
                    {row.isAttested &&
                    row.predicted !==
                      null ? (
                      <span
                        style={
                          resultStyle(
                            row.predicted,
                          )
                        }
                      >
                        {row.predicted}
                      </span>
                    ) : (
                      <span
                        style={
                          notAttestedStyle
                        }
                      >
                        Н/А
                      </span>
                    )}
                  </td>


                  <td
                    style={
                      bodyStyle
                    }
                  >
                    {row.finalGrade !==
                    null ? (
                      <span
                        style={
                          resultStyle(
                            row.finalGrade,
                          )
                        }
                      >
                        {row.finalGrade}
                      </span>
                    ) : (
                      <span
                        style={
                          emptyGradeStyle
                        }
                      >
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}


/* ========================================
   ATTENDANCE TABLE
======================================== */

function AttendanceTable({
  students,
  recordsMap,
}) {
  if (
    students.length ===
    0
  ) {
    return (
      <EmptyState
        icon={
          Search
        }
        title="Ученики не найдены"
        text="Измени поиск ученика."
      />
    )
  }


  return (
    <div
      style={
        tableWrapperStyle
      }
    >
      <table
        style={{
          width:
            '100%',

          borderCollapse:
            'collapse',

          minWidth:
            720,
        }}
      >
        <thead>
          <tr>
            <th
              style={
                headerLeftStyle
              }
            >
              Ученик
            </th>

            <th
              style={
                headerLeftStyle
              }
            >
              Статус
            </th>

            <th
              style={
                headerLeftStyle
              }
            >
              Учитель
            </th>

            <th
              style={
                headerLeftStyle
              }
            >
              Комментарий
            </th>
          </tr>
        </thead>


        <tbody>
          {students.map(
            (student) => {
              const record =
                recordsMap.get(
                  String(
                    student.id,
                  ),
                )

              return (
                <tr
                  key={
                    student.id
                  }
                >
                  <td
                    style={
                      bodyLeftStyle
                    }
                  >
                    <StudentCell
                      student={
                        student
                      }
                    />
                  </td>


                  <td
                    style={
                      bodyLeftStyle
                    }
                  >
                    {record ? (
                      <AttendanceBadge
                        status={
                          record.status
                        }
                      />
                    ) : (
                      <span
                        style={
                          noAttendanceStyle
                        }
                      >
                        Не отмечен
                      </span>
                    )}
                  </td>


                  <td
                    style={
                      bodyLeftStyle
                    }
                  >
                    {record
                      ?.teacherName ||
                      record
                        ?.teacher_name ||
                      '—'}
                  </td>


                  <td
                    style={
                      bodyLeftStyle
                    }
                  >
                    {record?.comment ||
                      '—'}
                  </td>
                </tr>
              )
            },
          )}
        </tbody>
      </table>
    </div>
  )
}


/* ========================================
   SMALL COMPONENTS
======================================== */

function StudentCell({
  student,
  missing = null,
}) {
  return (
    <div
      style={
        studentStyle
      }
    >
      <div
        style={
          avatarStyle
        }
      >
        {String(
          student?.name ||
            'У',
        )
          .charAt(0)
          .toUpperCase()}
      </div>

      <div>
        <strong>
          {student?.name ||
            'Ученик'}
        </strong>

        {missing !==
          null && (
          <small
            style={
              missingStyle
            }
          >
            Не хватает:{' '}
            {missing}
          </small>
        )}
      </div>
    </div>
  )
}


function AttendanceBadge({
  status,
}) {
  const icons = {
    present:
      '✅',

    absent:
      '❌',

    late:
      '⏰',

    excused:
      '📄',
  }


  return (
    <span
      style={
        attendanceBadgeStyle(
          status,
        )
      }
    >
      {icons[
        status
      ] ||
        '➖'}{' '}

      {getAttendanceStatusLabel(
        status,
      )}
    </span>
  )
}


function StatCard({
  icon: Icon,
  value,
  label,
  helper,
}) {
  return (
    <div
      style={
        statCardStyle
      }
    >
      <div
        style={
          statIconStyle
        }
      >
        <Icon
          size={22}
        />
      </div>

      <div>
        <strong
          style={
            statValueStyle
          }
        >
          {value}
        </strong>

        <div
          style={
            statLabelStyle
          }
        >
          {label}
        </div>

        {helper && (
          <div
            style={
              statHelperStyle
            }
          >
            {helper}
          </div>
        )}
      </div>
    </div>
  )
}


function MiniStat({
  value,
  label,
}) {
  return (
    <div
      style={
        miniStatStyle
      }
    >
      <strong
        style={{
          fontSize:
            20,
        }}
      >
        {value}
      </strong>

      <span
        style={{
          fontSize:
            12,

          color:
            '#64748b',
        }}
      >
        {label}
      </span>
    </div>
  )
}


function EmptyState({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div
      style={
        emptyStateStyle
      }
    >
      <Icon
        size={32}
      />

      <h3
        style={{
          margin:
            '4px 0 0',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin:
            0,

          maxWidth:
            500,
        }}
      >
        {text}
      </p>
    </div>
  )
}


/* ========================================
   HELPERS
======================================== */

function deduplicateStudents(
  rows,
) {
  const map =
    new Map()

  rows.forEach(
    (student) => {
      if (
        !student?.id
      ) {
        return
      }

      map.set(
        String(
          student.id,
        ),
        student,
      )
    },
  )

  return [
    ...map.values(),
  ]
}


function normalizeText(
  value,
) {
  return String(
    value ||
      '',
  )
    .trim()
    .toLowerCase()
}


function getGradeDate(
  grade,
) {
  return (
    grade?.date ||
    grade?.gradeDate ||
    grade?.grade_date ||
    ''
  )
}


function getWordForm(
  number,
  forms,
) {
  const value =
    Math.abs(
      Number(
        number,
      ) ||
        0,
    )

  const lastTwo =
    value %
    100

  const last =
    value %
    10


  if (
    lastTwo >=
      11 &&
    lastTwo <=
      14
  ) {
    return forms[2]
  }

  if (
    last ===
    1
  ) {
    return forms[0]
  }

  if (
    last >=
      2 &&
    last <=
      4
  ) {
    return forms[1]
  }

  return forms[2]
}


function formatShortDate(
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
        '2-digit',

      month:
        '2-digit',
    },
  )
}


function formatDate(
  value,
) {
  if (
    !value
  ) {
    return ''
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


/* ========================================
   STYLES
======================================== */

const statsGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit, minmax(170px, 1fr))',

  gap:
    12,

  marginBottom:
    18,
}


const statCardStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    12,

  padding:
    18,

  border:
    '1px solid #e2e8f0',

  borderRadius:
    18,

  background:
    '#ffffff',

  minHeight:
    98,
}


const statIconStyle = {
  width:
    48,

  height:
    48,

  flexShrink:
    0,

  borderRadius:
    14,

  display:
    'grid',

  placeItems:
    'center',

  background:
    '#eff6ff',

  color:
    '#2563eb',
}


const statValueStyle = {
  display:
    'block',

  fontSize:
    24,

  color:
    '#0f274d',

  lineHeight:
    1,
}


const statLabelStyle = {
  marginTop:
    7,

  fontSize:
    13,

  color:
    '#475569',

  fontWeight:
    700,
}


const statHelperStyle = {
  marginTop:
    4,

  fontSize:
    10,

  lineHeight:
    1.35,

  color:
    '#94a3b8',
}


const filtersStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit, minmax(170px, 1fr))',

  gap:
    16,
}


const searchStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    8,

  padding:
    '0 12px',

  border:
    '1px solid #dbe2ea',

  borderRadius:
    12,

  background:
    '#ffffff',
}


const searchInputStyle = {
  width:
    '100%',

  border:
    'none',

  outline:
    'none',

  boxShadow:
    'none',

  background:
    'transparent',

  paddingLeft:
    0,

  paddingRight:
    0,
}


const currentTeacherStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    7,

  width:
    'fit-content',

  margin:
    '14px 0 18px',

  padding:
    '9px 12px',

  border:
    '1px solid #dbeafe',

  borderRadius:
    12,

  background:
    '#eff6ff',

  color:
    '#1e40af',

  fontSize:
    13,
}


const tabsStyle = {
  display:
    'flex',

  gap:
    10,

  marginBottom:
    18,

  flexWrap:
    'wrap',
}


function tabStyle(
  active,
) {
  return {
    border:
      'none',

    borderRadius:
      12,

    padding:
      '12px 18px',

    cursor:
      'pointer',

    fontWeight:
      800,

    fontSize:
      14,

    background:
      active
        ? '#2563eb'
        : '#ffffff',

    color:
      active
        ? '#ffffff'
        : '#334155',

    boxShadow:
      active
        ? '0 8px 20px rgba(37, 99, 235, 0.18)'
        : '0 0 0 1px #e2e8f0',
  }
}


const sectionHeaderStyle = {
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
    14,
}


const eyebrowStyle = {
  margin:
    0,

  color:
    '#64748b',

  fontSize:
    13,
}


const sectionTitleStyle = {
  margin:
    '4px 0 0',

  color:
    '#0f274d',
}


const readonlyStyle = {
  padding:
    '8px 12px',

  borderRadius:
    10,

  background:
    '#f1f5f9',

  color:
    '#475569',

  fontSize:
    12,

  fontWeight:
    800,
}


const infoStyle = {
  marginBottom:
    14,

  padding:
    '11px 13px',

  borderRadius:
    12,

  background:
    '#eff6ff',

  color:
    '#1e40af',

  fontSize:
    13,
}


const teacherEmptyStyle = {
  marginBottom:
    14,

  padding:
    '12px 14px',

  borderRadius:
    12,

  background:
    '#fff7ed',

  color:
    '#9a3412',

  fontSize:
    13,

  fontWeight:
    600,
}


const emptyStateStyle = {
  display:
    'grid',

  justifyItems:
    'center',

  textAlign:
    'center',

  gap:
    6,

  padding:
    '30px 15px',

  color:
    '#64748b',
}


const tableWrapperStyle = {
  width:
    '100%',

  overflowX:
    'auto',

  border:
    '1px solid #e5e7eb',

  borderRadius:
    16,

  background:
    '#ffffff',
}


const headerStyle = {
  padding:
    11,

  textAlign:
    'center',

  background:
    '#f8fafc',

  color:
    '#334155',

  borderBottom:
    '1px solid #e5e7eb',

  whiteSpace:
    'nowrap',

  fontSize:
    12,
}


const headerLeftStyle = {
  ...headerStyle,

  textAlign:
    'left',
}


const stickyHeaderStyle = {
  ...headerLeftStyle,

  position:
    'sticky',

  left:
    0,

  zIndex:
    3,

  minWidth:
    210,
}


const bodyStyle = {
  padding:
    9,

  textAlign:
    'center',

  borderBottom:
    '1px solid #eef2f7',

  color:
    '#334155',
}


const bodyLeftStyle = {
  ...bodyStyle,

  textAlign:
    'left',

  padding:
    12,
}


const stickyCellStyle = {
  ...bodyLeftStyle,

  position:
    'sticky',

  left:
    0,

  zIndex:
    2,

  minWidth:
    210,

  background:
    '#ffffff',
}


const studentStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    9,
}


const avatarStyle = {
  width:
    34,

  height:
    34,

  flexShrink:
    0,

  borderRadius:
    '50%',

  display:
    'grid',

  placeItems:
    'center',

  background:
    '#eef5ff',

  color:
    '#2563eb',

  fontWeight:
    800,
}


const missingStyle = {
  display:
    'block',

  marginTop:
    3,

  color:
    '#b45309',

  fontSize:
    10,

  fontWeight:
    600,
}


const topicStyle = {
  display:
    'block',

  marginTop:
    4,

  maxWidth:
    82,

  overflow:
    'hidden',

  textOverflow:
    'ellipsis',

  whiteSpace:
    'nowrap',

  opacity:
    0.55,

  fontWeight:
    500,
}


const gradeListStyle = {
  display:
    'flex',

  justifyContent:
    'center',

  gap:
    4,

  flexWrap:
    'wrap',
}


function gradeStyle(
  value,
) {
  const numericValue =
    Number(
      value,
    )

  return {
    minWidth:
      30,

    height:
      30,

    padding:
      '0 7px',

    borderRadius:
      9,

    display:
      'inline-grid',

    placeItems:
      'center',

    background:
      numericValue >=
        5
        ? '#dcfce7'
        : numericValue >=
            4
          ? '#dbeafe'
          : numericValue >=
              3
            ? '#fef3c7'
            : '#fee2e2',

    fontWeight:
      800,

    color:
      '#1e293b',
  }
}


const emptyGradeStyle = {
  opacity:
    0.3,
}


function resultStyle(
  value,
) {
  const numericValue =
    Number(
      value,
    )

  return {
    display:
      'inline-grid',

    placeItems:
      'center',

    minWidth:
      34,

    height:
      34,

    borderRadius:
      10,

    background:
      numericValue >=
        5
        ? '#dcfce7'
        : numericValue >=
            4
          ? '#dbeafe'
          : numericValue >=
              3
            ? '#fef3c7'
            : '#fee2e2',

    fontWeight:
      800,

    color:
      '#1e293b',
  }
}


const notAttestedStyle = {
  display:
    'inline-grid',

  placeItems:
    'center',

  minWidth:
    40,

  height:
    34,

  borderRadius:
    10,

  background:
    '#fee2e2',

  color:
    '#991b1b',

  fontWeight:
    800,

  fontSize:
    12,
}


const attendanceStatsStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit, minmax(125px, 1fr))',

  gap:
    10,

  marginBottom:
    16,
}


const miniStatStyle = {
  display:
    'flex',

  flexDirection:
    'column',

  gap:
    4,

  padding:
    13,

  border:
    '1px solid #e5e7eb',

  borderRadius:
    12,

  background:
    '#f8fafc',
}


function attendanceBadgeStyle(
  status,
) {
  const background =
    status ===
    'present'
      ? '#dcfce7'
      : status ===
          'absent'
        ? '#fee2e2'
        : status ===
            'late'
          ? '#fef3c7'
          : '#dbeafe'


  const color =
    status ===
    'present'
      ? '#166534'
      : status ===
          'absent'
        ? '#991b1b'
        : status ===
            'late'
          ? '#92400e'
          : '#1e40af'


  return {
    display:
      'inline-block',

    padding:
      '7px 10px',

    borderRadius:
      10,

    background,

    color,

    fontSize:
      12,

    fontWeight:
      700,

    whiteSpace:
      'nowrap',
  }
}


const noAttendanceStyle = {
  display:
    'inline-block',

  padding:
    '7px 10px',

  borderRadius:
    10,

  background:
    '#f1f5f9',

  color:
    '#64748b',

  fontSize:
    12,

  fontWeight:
    600,
}


export default AdminJournalsPage