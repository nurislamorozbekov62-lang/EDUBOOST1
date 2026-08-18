import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Clock3,
  Download,
  GraduationCap,
  RefreshCcw,
  TrendingUp,
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
  getSupabaseClassGrades,
  getSupabaseClassQuarterGrades,
} from '../services/supabaseJournalClassService'

import {
  calculateSupabaseAttendanceStats,
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


function getLocalDate(
  daysOffset = 0,
) {
  const date =
    new Date()

  date.setDate(
    date.getDate() +
      daysOffset,
  )

  const local =
    new Date(
      date.getTime() -
        date.getTimezoneOffset() *
          60000,
    )

  return local
    .toISOString()
    .slice(0, 10)
}


function AdminReportsPage() {
  const {
    user,
  } = useAuth()


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
  ] = useState('all')


  const [
    selectedQuarter,
    setSelectedQuarter,
  ] = useState(1)


  const [
    dateFrom,
    setDateFrom,
  ] = useState(
    getLocalDate(-30),
  )


  const [
    dateTo,
    setDateTo,
  ] = useState(
    getLocalDate(),
  )


  const [
    search,
    setSearch,
  ] = useState('')


  const [
    baseLoading,
    setBaseLoading,
  ] = useState(true)


  const [
    reportLoading,
    setReportLoading,
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
     BASE DATA
  ======================================== */

  useEffect(() => {
    if (
      !user?.id ||
      !allowed
    ) {
      return
    }

    void loadBaseData()
  }, [
    user?.id,
    user?.schoolId,
    user?.role,
  ])


  async function loadBaseData() {
    try {
      setBaseLoading(true)
      setError('')

      const [
        classRows,
        teacherRows,
      ] =
        await Promise.all([
          getAdminSchoolClasses(
            user,
          ),

          getAdminSchoolTeachers(
            user,
          ),
        ])


      const safeClasses =
        Array.isArray(
          classRows,
        )
          ? classRows
          : []


      const safeTeachers =
        Array.isArray(
          teacherRows,
        )
          ? teacherRows
          : []


      setClasses(
        safeClasses,
      )

      setTeachers(
        safeTeachers,
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
    } catch (
      loadError
    ) {
      console.error(
        'Admin reports base load:',
        loadError,
      )

      setClasses([])
      setTeachers([])

      setError(
        loadError?.message ||
          'Не удалось загрузить данные школы.',
      )
    } finally {
      setBaseLoading(false)
    }
  }


  /* ========================================
     STUDENTS
  ======================================== */

  useEffect(() => {
    if (
      !user?.id ||
      !selectedClass ||
      !allowed
    ) {
      setStudents([])
      return
    }

    void loadStudents()
  }, [
    user?.id,
    user?.schoolId,
    selectedClass,
  ])


  async function loadStudents() {
    try {
      const rows =
        await getAdminStudentsByClass(
          user,
          selectedClass,
        )

      setStudents(
        Array.isArray(rows)
          ? rows
          : [],
      )
    } catch (
      loadError
    ) {
      console.error(
        'Admin reports students:',
        loadError,
      )

      setStudents([])

      setError(
        loadError?.message ||
          'Не удалось загрузить учеников.',
      )
    }
  }


  /* ========================================
     REPORT DATA
  ======================================== */

  useEffect(() => {
    if (
      !user?.id ||
      !allowed ||
      !selectedClass ||
      !selectedSubject ||
      !dateFrom ||
      !dateTo
    ) {
      return
    }

    void loadReport()
  }, [
    user?.id,
    user?.school,
    selectedClass,
    selectedSubject,
    selectedQuarter,
    dateFrom,
    dateTo,
  ])


  async function loadReport() {
    try {
      setReportLoading(true)
      setError('')

      const [
        gradeRows,
        quarterRows,
        attendanceRows,
      ] =
        await Promise.all([
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

          getSupabaseClassAttendance({
            teacher:
              user,

            className:
              selectedClass,

            subject:
              selectedSubject,

            dateFrom,

            dateTo,
          }),
        ])


      setGrades(
        Array.isArray(
          gradeRows,
        )
          ? gradeRows
          : [],
      )


      setQuarterGrades(
        Array.isArray(
          quarterRows,
        )
          ? quarterRows
          : [],
      )


      setAttendance(
        Array.isArray(
          attendanceRows,
        )
          ? attendanceRows
          : [],
      )
    } catch (
      loadError
    ) {
      console.error(
        'Admin report load:',
        loadError,
      )

      setGrades([])
      setQuarterGrades([])
      setAttendance([])

      setError(
        loadError?.message ||
          'Не удалось сформировать отчёт.',
      )
    } finally {
      setReportLoading(false)
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


  function matchesTeacher(
    item,
  ) {
    if (
      selectedTeacherId ===
      'all'
    ) {
      return true
    }

    if (
      String(
        item?.teacherId ||
          item?.teacher_id ||
          '',
      ) ===
      String(
        selectedTeacherId,
      )
    ) {
      return true
    }

    if (
      item?.teacherName &&
      selectedTeacher?.name
    ) {
      return (
        normalizeText(
          item.teacherName,
        ) ===
        normalizeText(
          selectedTeacher.name,
        )
      )
    }

    return false
  }


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
     STUDENT REPORT ROWS
  ======================================== */

  const reportRows =
    useMemo(() => {
      return students.map(
        (student) => {
          const studentGrades =
            filteredGrades.filter(
              (grade) =>
                String(
                  grade.studentId,
                ) ===
                String(
                  student.id,
                ),
            )


          const average =
            calculateWeightedAverage(
              studentGrades,
            )


          const finalRow =
            filteredQuarterGrades.find(
              (item) =>
                String(
                  item.studentId,
                ) ===
                String(
                  student.id,
                ),
            )


          const finalGrade =
            finalRow?.finalGrade ??
            null


          const predictedGrade =
            average !==
              null &&
            average !==
              undefined
              ? getSuggestedQuarterGrade(
                  average,
                )
              : null


          const resultGrade =
            finalGrade ??
            predictedGrade


          const studentAttendance =
            filteredAttendance.filter(
              (record) =>
                String(
                  record.studentId,
                ) ===
                String(
                  student.id,
                ),
            )


          const attendanceStats =
            calculateSupabaseAttendanceStats(
              studentAttendance,
            )


          const requiresAttention =
            (
              resultGrade !==
                null &&
              Number(
                resultGrade,
              ) <= 2
            ) ||
            (
              studentAttendance.length >
                0 &&
              Number(
                attendanceStats.percent,
              ) < 80
            )


          return {
            student,

            gradeCount:
              studentGrades.length,

            average,

            finalGrade,

            predictedGrade,

            resultGrade,

            attendanceCount:
              studentAttendance.length,

            attendancePercent:
              attendanceStats.percent ||
              0,

            present:
              attendanceStats.present ||
              0,

            absent:
              attendanceStats.absent ||
              0,

            late:
              attendanceStats.late ||
              0,

            excused:
              attendanceStats.excused ||
              0,

            requiresAttention,
          }
        },
      )
    }, [
      students,
      filteredGrades,
      filteredQuarterGrades,
      filteredAttendance,
    ])


  /* ========================================
     SEARCH
  ======================================== */

  const visibleRows =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase()

      if (!value) {
        return reportRows
      }

      return reportRows.filter(
        (row) =>
          String(
            row.student?.name ||
              '',
          )
            .toLowerCase()
            .includes(
              value,
            ),
      )
    }, [
      reportRows,
      search,
    ])


  /* ========================================
     SUMMARY
  ======================================== */

  const summary =
    useMemo(() => {
      const averages =
        reportRows
          .map(
            (row) =>
              Number(
                row.average,
              ),
          )
          .filter(
            (value) =>
              Number.isFinite(
                value,
              ),
          )


      const averageGrade =
        averages.length > 0
          ? (
              averages.reduce(
                (
                  total,
                  value,
                ) =>
                  total +
                  value,
                0,
              ) /
              averages.length
            ).toFixed(2)
          : '—'


      const attestedRows =
        reportRows.filter(
          (row) =>
            row.resultGrade !==
              null &&
            row.resultGrade !==
              undefined,
        )


      const qualityRows =
        attestedRows.filter(
          (row) =>
            Number(
              row.resultGrade,
            ) >= 4,
        )


      const qualityPercent =
        attestedRows.length > 0
          ? Math.round(
              (
                qualityRows.length /
                attestedRows.length
              ) *
                100,
            )
          : 0


      const attendanceStats =
        calculateSupabaseAttendanceStats(
          filteredAttendance,
        )


      return {
        students:
          reportRows.length,

        averageGrade,

        qualityPercent,

        attendancePercent:
          attendanceStats.percent ||
          0,

        absent:
          attendanceStats.absent ||
          0,

        late:
          attendanceStats.late ||
          0,

        attention:
          reportRows.filter(
            (row) =>
              row.requiresAttention,
          ).length,
      }
    }, [
      reportRows,
      filteredAttendance,
    ])


  /* ========================================
     CSV EXPORT
  ======================================== */

  function exportCsv() {
    if (
      visibleRows.length ===
      0
    ) {
      return
    }


    const rows = [
      [
        'Ученик',
        'Класс',
        'Предмет',
        'Четверть',
        'Учитель',
        'Количество оценок',
        'Средний балл',
        'Итоговая оценка',
        'Посещаемость %',
        'Пропуски',
        'Опоздания',
        'Уважительные',
      ],

      ...visibleRows.map(
        (row) => [
          row.student?.name ||
            '',

          row.student?.className ||
            selectedClass,

          selectedSubject,

          selectedQuarter,

          selectedTeacher?.name ||
            'Все учителя',

          row.gradeCount,

          row.average ??
            '',

          row.finalGrade ??
            row.predictedGrade ??
            '',

          row.attendancePercent,

          row.absent,

          row.late,

          row.excused,
        ],
      ),
    ]


    const csv =
      rows
        .map(
          (row) =>
            row
              .map(
                escapeCsv,
              )
              .join(';'),
        )
        .join('\n')


    const blob =
      new Blob(
        [
          '\uFEFF',
          csv,
        ],
        {
          type:
            'text/csv;charset=utf-8;',
        },
      )


    const url =
      URL.createObjectURL(
        blob,
      )


    const link =
      document.createElement(
        'a',
      )


    link.href =
      url

    link.download =
      `eduboost-report-${selectedClass}-${selectedSubject}-${dateTo}.csv`


    document.body.appendChild(
      link,
    )

    link.click()

    link.remove()

    URL.revokeObjectURL(
      url,
    )
  }


  /* ========================================
     ACCESS
  ======================================== */

  if (!user) {
    return null
  }


  if (!allowed) {
    return (
      <div className="page-container">

        <section className="content-card">

          <h2>
            Доступ запрещён
          </h2>

          <p>
            Отчёты доступны
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
    <div className="page-container">

      {/* TOOLBAR */}

      <section
        className="content-card"
        style={
          toolbarCardStyle
        }
      >

        <div
          style={
            toolbarTopStyle
          }
        >

          <div>

            <p
              style={
                eyebrowStyle
              }
            >
              Аналитика школы
            </p>

            <h2
              style={
                toolbarTitleStyle
              }
            >
              Учебный отчёт
            </h2>

            <p
              style={
                toolbarTextStyle
              }
            >
              Успеваемость и
              посещаемость
              выбранного класса
              в одном отчёте.
            </p>

          </div>


          <div
            style={
              actionStyle
            }
          >

            <button
              type="button"
              onClick={
                loadReport
              }
              disabled={
                reportLoading ||
                !selectedClass
              }
              style={
                secondaryButtonStyle
              }
            >
              <RefreshCcw
                size={17}
              />

              Обновить
            </button>


            <button
              type="button"
              onClick={
                exportCsv
              }
              disabled={
                visibleRows.length ===
                0
              }
              style={
                primaryButtonStyle
              }
            >
              <Download
                size={17}
              />

              Скачать CSV
            </button>

          </div>

        </div>


        <div
          style={
            filtersStyle
          }
        >

          <label className="form-group">

            <span>
              Класс
            </span>

            <select
              value={
                selectedClass
              }
              onChange={(
                event,
              ) => {
                setSelectedClass(
                  event.target.value,
                )

                setSearch('')
              }}
              disabled={
                baseLoading
              }
            >

              {classes.length ===
                0 && (
                <option value="">
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


          <label className="form-group">

            <span>
              Предмет
            </span>

            <select
              value={
                selectedSubject
              }
              onChange={(
                event,
              ) =>
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


          <label className="form-group">

            <span>
              Учитель
            </span>

            <select
              value={
                selectedTeacherId
              }
              onChange={(
                event,
              ) =>
                setSelectedTeacherId(
                  event.target.value,
                )
              }
            >

              <option value="all">
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


          <label className="form-group">

            <span>
              Четверть
            </span>

            <select
              value={
                selectedQuarter
              }
              onChange={(
                event,
              ) =>
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

          </label>


          <label className="form-group">

            <span>
              Посещаемость с
            </span>

            <input
              type="date"
              value={
                dateFrom
              }
              max={
                dateTo
              }
              onChange={(
                event,
              ) =>
                setDateFrom(
                  event.target.value,
                )
              }
            />

          </label>


          <label className="form-group">

            <span>
              По
            </span>

            <input
              type="date"
              value={
                dateTo
              }
              min={
                dateFrom
              }
              onChange={(
                event,
              ) =>
                setDateTo(
                  event.target.value,
                )
              }
            />

          </label>

        </div>

      </section>


      {/* ERROR */}

      {error && (
        <section className="content-card">

          <div className="auth-error">
            {error}
          </div>

        </section>
      )}


      {/* SUMMARY */}

      <div
        style={
          statsGridStyle
        }
      >

        <StatCard
          icon={
            Users
          }
          value={
            summary.students
          }
          label="Учеников"
        />


        <StatCard
          icon={
            GraduationCap
          }
          value={
            summary.averageGrade
          }
          label="Средний балл"
        />


        <StatCard
          icon={
            TrendingUp
          }
          value={
            `${summary.qualityPercent}%`
          }
          label="Качество знаний"
        />


        <StatCard
          icon={
            BarChart3
          }
          value={
            `${summary.attendancePercent}%`
          }
          label="Посещаемость"
        />


        <StatCard
          icon={
            AlertTriangle
          }
          value={
            summary.absent
          }
          label="Пропусков"
        />


        <StatCard
          icon={
            Clock3
          }
          value={
            summary.late
          }
          label="Опозданий"
        />

      </div>


      {/* ATTENTION */}

      {summary.attention >
        0 && (
        <section
          className="content-card"
          style={
            attentionCardStyle
          }
        >

          <div
            style={
              attentionTitleStyle
            }
          >
            <AlertTriangle
              size={20}
            />

            <strong>
              Требуют внимания:
              {' '}
              {
                summary.attention
              }
            </strong>
          </div>

          <p
            style={
              attentionTextStyle
            }
          >
            В список попадают
            ученики с оценкой 2
            или посещаемостью
            ниже 80% за
            выбранный период.
          </p>

        </section>
      )}


      {/* TABLE */}

      <section className="content-card">

        <div
          style={
            tableHeaderStyle
          }
        >

          <div>

            <p
              style={
                eyebrowStyle
              }
            >
              {selectedClass}
              {' · '}
              {selectedSubject}
              {' · '}
              {selectedQuarter}
              {' четверть'}
            </p>

            <h2
              style={
                tableTitleStyle
              }
            >
              Ученики
            </h2>

          </div>


          <div
            style={
              searchBoxStyle
            }
          >

            <input
              value={
                search
              }
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Поиск ученика"
              style={
                searchInputStyle
              }
            />

          </div>

        </div>


        {baseLoading ||
        reportLoading ? (
          <p className="empty-text">
            Формируем отчёт...
          </p>
        ) : visibleRows.length ===
          0 ? (
          <div
            style={
              emptyStyle
            }
          >

            <CalendarDays
              size={34}
            />

            <h3>
              Нет данных
            </h3>

            <p>
              По выбранным
              параметрам данные
              не найдены.
            </p>

          </div>
        ) : (
          <div
            style={
              tableWrapperStyle
            }
          >

            <table
              style={
                tableStyle
              }
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
                      headerStyle
                    }
                  >
                    Оценок
                  </th>

                  <th
                    style={
                      headerStyle
                    }
                  >
                    Ср. балл
                  </th>

                  <th
                    style={
                      headerStyle
                    }
                  >
                    Итог
                  </th>

                  <th
                    style={
                      headerStyle
                    }
                  >
                    Посещ.
                  </th>

                  <th
                    style={
                      headerStyle
                    }
                  >
                    Пропуски
                  </th>

                  <th
                    style={
                      headerStyle
                    }
                  >
                    Опоздания
                  </th>

                  <th
                    style={
                      headerStyle
                    }
                  >
                    Статус
                  </th>

                </tr>

              </thead>


              <tbody>

                {visibleRows.map(
                  (row) => (
                    <tr
                      key={
                        row.student.id
                      }
                      style={
                        row.requiresAttention
                          ? attentionRowStyle
                          : undefined
                      }
                    >

                      <td
                        style={
                          bodyLeftStyle
                        }
                      >

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
                              row.student
                                .name ||
                                'У',
                            )
                              .charAt(
                                0,
                              )
                              .toUpperCase()}
                          </div>


                          <div>

                            <strong>
                              {
                                row.student
                                  .name
                              }
                            </strong>

                            <small
                              style={
                                studentMetaStyle
                              }
                            >
                              {
                                row.student
                                  .className ||
                                selectedClass
                              }
                            </small>

                          </div>

                        </div>

                      </td>


                      <td
                        style={
                          bodyStyle
                        }
                      >
                        {
                          row.gradeCount
                        }
                      </td>


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

                        {row.resultGrade !==
                        null ? (
                          <GradeBadge
                            value={
                              row.resultGrade
                            }
                          />
                        ) : (
                          '—'
                        )}

                      </td>


                      <td
                        style={
                          bodyStyle
                        }
                      >

                        {row.attendanceCount >
                        0
                          ? `${row.attendancePercent}%`
                          : '—'}

                      </td>


                      <td
                        style={
                          bodyStyle
                        }
                      >
                        {
                          row.absent
                        }
                      </td>


                      <td
                        style={
                          bodyStyle
                        }
                      >
                        {
                          row.late
                        }
                      </td>


                      <td
                        style={
                          bodyStyle
                        }
                      >

                        {row.requiresAttention ? (
                          <span
                            style={
                              warningBadgeStyle
                            }
                          >
                            Внимание
                          </span>
                        ) : (
                          <span
                            style={
                              normalBadgeStyle
                            }
                          >
                            Норма
                          </span>
                        )}

                      </td>

                    </tr>
                  ),
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>

    </div>
  )
}


/* ========================================
   COMPONENTS
======================================== */

function StatCard({
  icon: Icon,
  value,
  label,
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
          size={21}
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

      </div>

    </div>
  )
}


function GradeBadge({
  value,
}) {
  const numeric =
    Number(value)

  return (
    <span
      style={{
        ...gradeBadgeStyle,

        background:
          numeric >= 5
            ? '#dcfce7'
            : numeric >= 4
              ? '#dbeafe'
              : numeric >= 3
                ? '#fef3c7'
                : '#fee2e2',

        color:
          numeric >= 4
            ? '#166534'
            : numeric >= 3
              ? '#92400e'
              : '#991b1b',
      }}
    >
      {value}
    </span>
  )
}


/* ========================================
   HELPERS
======================================== */

function normalizeText(
  value,
) {
  return String(
    value || '',
  )
    .trim()
    .toLowerCase()
}


function escapeCsv(
  value,
) {
  const stringValue =
    String(
      value ??
        '',
    )

  if (
    stringValue.includes(';') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(
      /"/g,
      '""',
    )}"`
  }

  return stringValue
}


/* ========================================
   STYLES
======================================== */

const toolbarCardStyle = {
  marginBottom:
    18,
}


const toolbarTopStyle = {
  display:
    'flex',

  alignItems:
    'flex-start',

  justifyContent:
    'space-between',

  gap:
    16,

  flexWrap:
    'wrap',

  marginBottom:
    20,
}


const eyebrowStyle = {
  margin:
    0,

  color:
    '#64748b',

  fontSize:
    13,
}


const toolbarTitleStyle = {
  margin:
    '4px 0 0',

  color:
    '#0f274d',
}


const toolbarTextStyle = {
  margin:
    '7px 0 0',

  color:
    '#64748b',

  fontSize:
    14,

  lineHeight:
    1.5,
}


const actionStyle = {
  display:
    'flex',

  gap:
    9,

  flexWrap:
    'wrap',
}


const primaryButtonStyle = {
  display:
    'inline-flex',

  alignItems:
    'center',

  gap:
    7,

  border:
    'none',

  borderRadius:
    11,

  padding:
    '10px 14px',

  background:
    '#2563eb',

  color:
    '#ffffff',

  cursor:
    'pointer',

  fontWeight:
    700,
}


const secondaryButtonStyle = {
  ...primaryButtonStyle,

  background:
    '#eff6ff',

  color:
    '#1d4ed8',

  border:
    '1px solid #dbeafe',
}


const filtersStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit, minmax(165px, 1fr))',

  gap:
    14,
}


const statsGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit, minmax(150px, 1fr))',

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
    11,

  minHeight:
    84,

  padding:
    16,

  border:
    '1px solid #e2e8f0',

  borderRadius:
    17,

  background:
    '#ffffff',
}


const statIconStyle = {
  width:
    44,

  height:
    44,

  flexShrink:
    0,

  display:
    'grid',

  placeItems:
    'center',

  borderRadius:
    13,

  background:
    '#eff6ff',

  color:
    '#2563eb',
}


const statValueStyle = {
  display:
    'block',

  color:
    '#0f274d',

  fontSize:
    22,

  lineHeight:
    1,
}


const statLabelStyle = {
  marginTop:
    6,

  color:
    '#64748b',

  fontSize:
    12,
}


const attentionCardStyle = {
  marginBottom:
    18,

  background:
    '#fff7ed',

  border:
    '1px solid #fed7aa',
}


const attentionTitleStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    8,

  color:
    '#9a3412',
}


const attentionTextStyle = {
  margin:
    '8px 0 0',

  color:
    '#9a3412',

  fontSize:
    13,
}


const tableHeaderStyle = {
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
    16,
}


const tableTitleStyle = {
  margin:
    '4px 0 0',

  color:
    '#0f274d',
}


const searchBoxStyle = {
  minWidth:
    210,
}


const searchInputStyle = {
  width:
    '100%',

  minHeight:
    42,

  padding:
    '0 12px',

  border:
    '1px solid #dbe2ea',

  borderRadius:
    11,

  outline:
    'none',

  background:
    '#ffffff',
}


const tableWrapperStyle = {
  width:
    '100%',

  overflowX:
    'auto',

  border:
    '1px solid #e5e7eb',

  borderRadius:
    15,

  background:
    '#ffffff',
}


const tableStyle = {
  width:
    '100%',

  minWidth:
    900,

  borderCollapse:
    'collapse',
}


const headerStyle = {
  padding:
    11,

  textAlign:
    'center',

  background:
    '#f8fafc',

  borderBottom:
    '1px solid #e5e7eb',

  color:
    '#334155',

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


const bodyStyle = {
  padding:
    11,

  textAlign:
    'center',

  borderBottom:
    '1px solid #eef2f7',

  color:
    '#334155',

  fontSize:
    13,
}


const bodyLeftStyle = {
  ...bodyStyle,

  textAlign:
    'left',
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

  display:
    'grid',

  placeItems:
    'center',

  borderRadius:
    '50%',

  background:
    '#eef5ff',

  color:
    '#2563eb',

  fontWeight:
    800,
}


const studentMetaStyle = {
  display:
    'block',

  marginTop:
    3,

  color:
    '#94a3b8',

  fontSize:
    10,
}


const gradeBadgeStyle = {
  display:
    'inline-grid',

  placeItems:
    'center',

  minWidth:
    32,

  height:
    32,

  borderRadius:
    9,

  fontWeight:
    800,
}


const warningBadgeStyle = {
  display:
    'inline-flex',

  padding:
    '5px 8px',

  borderRadius:
    8,

  background:
    '#fee2e2',

  color:
    '#991b1b',

  fontSize:
    11,

  fontWeight:
    700,
}


const normalBadgeStyle = {
  ...warningBadgeStyle,

  background:
    '#dcfce7',

  color:
    '#166534',
}


const attentionRowStyle = {
  background:
    '#fffaf5',
}


const emptyStyle = {
  display:
    'grid',

  justifyItems:
    'center',

  textAlign:
    'center',

  gap:
    5,

  padding:
    '32px 16px',

  color:
    '#64748b',
}


export default AdminReportsPage