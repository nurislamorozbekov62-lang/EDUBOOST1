import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  GraduationCap,
  RefreshCcw,
  ShieldAlert,
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


/* =========================================================
   CONSTANTS
========================================================= */

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


const MIN_GRADES_FOR_STATUS = 3


const REPORT_STATUSES = {
  NO_DATA: {
    key: 'no_data',
    label: '—',
    title:
      'Недостаточно данных для определения статуса.',
  },

  NORMAL: {
    key: 'normal',
    label: 'Норма',
    title:
      'По доступным данным всё в норме.',
  },

  ATTENTION: {
    key: 'attention',
    label: 'Вним.',
    title:
      'Есть показатели, на которые стоит обратить внимание.',
  },

  RISK: {
    key: 'risk',
    label: 'Риск',
    title:
      'Есть серьёзная проблема, требующая внимания.',
  },
}


/* =========================================================
   STATUS
========================================================= */

function getReportStatus({
  gradeCount,
  finalGrade,
  resultGrade,
  attendanceCount,
  absent,
}) {
  const hasFinalGrade =
    finalGrade !== null &&
    finalGrade !== undefined


  const hasEnoughGrades =
    hasFinalGrade ||
    Number(gradeCount) >=
      MIN_GRADES_FOR_STATUS


  const hasAttendanceData =
    Number(attendanceCount) > 0


  const unexcusedAbsences =
    Number(
      absent || 0,
    )


  const numericGrade =
    resultGrade !== null &&
    resultGrade !== undefined
      ? Number(
          resultGrade,
        )
      : null


  /*
   * РИСК
   *
   * Подтверждённый учебный
   * результат 2.
   */

  if (
    hasEnoughGrades &&
    Number.isFinite(
      numericGrade,
    ) &&
    numericGrade <= 2
  ) {
    return REPORT_STATUSES.RISK
  }


  /*
   * ВНИМАНИЕ
   *
   * Есть хотя бы один
   * неуважительный пропуск.
   */

  if (
    hasAttendanceData &&
    unexcusedAbsences > 0
  ) {
    return REPORT_STATUSES.ATTENTION
  }


  /*
   * ВНИМАНИЕ
   *
   * Учебный результат = 3.
   */

  if (
    hasEnoughGrades &&
    Number.isFinite(
      numericGrade,
    ) &&
    numericGrade === 3
  ) {
    return REPORT_STATUSES.ATTENTION
  }


  /*
   * НОРМА
   *
   * Достаточно данных,
   * результат 4–5,
   * нет неуважительных пропусков.
   */

  if (
    hasEnoughGrades &&
    hasAttendanceData &&
    Number.isFinite(
      numericGrade,
    ) &&
    numericGrade >= 4
  ) {
    return REPORT_STATUSES.NORMAL
  }


  /*
   * Если информации мало,
   * система не делает вывод.
   */

  return REPORT_STATUSES.NO_DATA
}


/* =========================================================
   DATE
========================================================= */

function getLocalDate(
  daysOffset = 0,
) {
  const date =
    new Date()


  date.setDate(
    date.getDate() +
      daysOffset,
  )


  const localDate =
    new Date(
      date.getTime() -
        date.getTimezoneOffset() *
          60000,
    )


  return localDate
    .toISOString()
    .slice(
      0,
      10,
    )
}


/* =========================================================
   PAGE
========================================================= */

function AdminReportsPage() {
  const {
    user,
  } = useAuth()


  /* =======================================================
     STATE
  ======================================================= */

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
  ] = useState(
    'all',
  )


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


  /* =======================================================
     ACCESS
  ======================================================= */

  const allowed =
    user?.role ===
      ROLES.VICE_PRINCIPAL ||
    user?.role ===
      ROLES.DIRECTOR


  /* =======================================================
     BASE DATA
  ======================================================= */

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
      setBaseLoading(
        true,
      )

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
        (
          current,
        ) => {
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
      setBaseLoading(
        false,
      )
    }
  }


  /* =======================================================
     STUDENTS
  ======================================================= */

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


  /* =======================================================
     REPORT DATA
  ======================================================= */

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
      setReportLoading(
        true,
      )

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
      setReportLoading(
        false,
      )
    }
  }


  /* =======================================================
     SELECTED TEACHER
  ======================================================= */

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
          (
            teacher,
          ) =>
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


  /* =======================================================
     TEACHER FILTER
  ======================================================= */

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


  /* =======================================================
     STUDENT REPORT ROWS
  ======================================================= */

  const reportRows =
    useMemo(() => {
      return students.map(
        (
          student,
        ) => {
          /* -----------------------
             GRADES
          ----------------------- */

          const studentGrades =
            filteredGrades.filter(
              (
                grade,
              ) =>
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
              (
                item,
              ) =>
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
            average !== null &&
            average !== undefined
              ? getSuggestedQuarterGrade(
                  average,
                )
              : null


          const resultGrade =
            finalGrade ??
            predictedGrade


          /* -----------------------
             ATTENDANCE
          ----------------------- */

          const studentAttendance =
            filteredAttendance.filter(
              (
                record,
              ) =>
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


          const attendanceCount =
            studentAttendance.length


          const present =
            attendanceCount > 0
              ? Number(
                  attendanceStats.present ??
                    0,
                )
              : null


          const absent =
            attendanceCount > 0
              ? Number(
                  attendanceStats.absent ??
                    0,
                )
              : null


          const late =
            attendanceCount > 0
              ? Number(
                  attendanceStats.late ??
                    0,
                )
              : null


          const excused =
            attendanceCount > 0
              ? Number(
                  attendanceStats.excused ??
                    0,
                )
              : null


          /* -----------------------
             STATUS
          ----------------------- */

          const status =
            getReportStatus({
              gradeCount:
                studentGrades.length,

              finalGrade,

              resultGrade,

              attendanceCount,

              absent,
            })


          const requiresAttention =
            status.key ===
              'attention' ||
            status.key ===
              'risk'


          return {
            student,

            gradeCount:
              studentGrades.length,

            average,

            finalGrade,

            predictedGrade,

            resultGrade,

            attendanceCount,

            present,

            absent,

            late,

            excused,

            status,

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


  /* =======================================================
     SEARCH
  ======================================================= */

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
        (
          row,
        ) =>
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


  /* =======================================================
     SUMMARY — COUNTS ONLY
  ======================================================= */

  const summary =
    useMemo(() => {
      /*
       * Количество всех оценок
       * текущих официальных учеников.
       */

      const totalGrades =
        reportRows.reduce(
          (
            total,
            row,
          ) =>
            total +
            Number(
              row.gradeCount ||
                0,
            ),
          0,
        )


      /*
       * Используем посещаемость
       * только текущих учеников.
       */

      const rowsWithAttendance =
        reportRows.filter(
          (
            row,
          ) =>
            Number(
              row.attendanceCount ||
                0,
            ) > 0,
        )


      const hasAttendanceData =
        rowsWithAttendance.length >
        0


      const totalAbsent =
        rowsWithAttendance.reduce(
          (
            total,
            row,
          ) =>
            total +
            Number(
              row.absent ||
                0,
            ),
          0,
        )


      const totalLate =
        rowsWithAttendance.reduce(
          (
            total,
            row,
          ) =>
            total +
            Number(
              row.late ||
                0,
            ),
          0,
        )


      /*
       * Сколько учеников
       * в каждом статусе.
       */

      const normal =
        reportRows.filter(
          (
            row,
          ) =>
            row.status?.key ===
            'normal',
        ).length


      const attention =
        reportRows.filter(
          (
            row,
          ) =>
            row.status?.key ===
            'attention',
        ).length


      const risk =
        reportRows.filter(
          (
            row,
          ) =>
            row.status?.key ===
            'risk',
        ).length


      const noData =
        reportRows.filter(
          (
            row,
          ) =>
            row.status?.key ===
            'no_data',
        ).length


      return {
        students:
          reportRows.length,

        grades:
          totalGrades,

        absent:
          hasAttendanceData
            ? totalAbsent
            : null,

        late:
          hasAttendanceData
            ? totalLate
            : null,

        normal,

        attention,

        risk,

        noData,
      }
    }, [
      reportRows,
    ])


  /* =======================================================
     CSV
  ======================================================= */

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
        'Пропуски',
        'Опоздания',
        'Уважительные пропуски',
        'Статус',
      ],


      ...visibleRows.map(
        (
          row,
        ) => [
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

          row.absent ??
            '',

          row.late ??
            '',

          row.excused ??
            '',

          row.status?.label ||
            '—',
        ],
      ),
    ]


    const csv =
      rows
        .map(
          (
            row,
          ) =>
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


  /* =======================================================
     ACCESS STATES
  ======================================================= */

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


  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="page-container">

      {/* ===================================================
          TOOLBAR
      =================================================== */}

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
              Успеваемость,
              посещаемость
              и статусы учеников
              выбранного класса.
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


        {/* =================================================
            FILTERS
        ================================================= */}

        <div
          style={
            filtersStyle
          }
        >

          {/* CLASS */}

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
                (
                  className,
                ) => (
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


          {/* SUBJECT */}

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
                (
                  subject,
                ) => (
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


          {/* TEACHER */}

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
                (
                  teacher,
                ) => (
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


          {/* QUARTER */}

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


          {/* DATE FROM */}

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


          {/* DATE TO */}

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


      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <section className="content-card">

          <div className="auth-error">
            {error}
          </div>

        </section>
      )}


      {/* ===================================================
          SUMMARY
      =================================================== */}

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
          variant="default"
        />


        <StatCard
          icon={
            GraduationCap
          }
          value={
            summary.grades
          }
          label="Оценок"
          variant="default"
        />


        <StatCard
          icon={
            AlertTriangle
          }
          value={
            summary.absent ??
            '—'
          }
          label="Пропусков"
          variant="default"
        />


        <StatCard
          icon={
            Clock3
          }
          value={
            summary.late ??
            '—'
          }
          label="Опозданий"
          variant="default"
        />


        <StatCard
          icon={
            CheckCircle2
          }
          value={
            summary.normal
          }
          label="Норма"
          variant="normal"
        />


        <StatCard
          icon={
            CalendarDays
          }
          value={
            summary.attention
          }
          label="Вним."
          variant="attention"
        />


        <StatCard
          icon={
            ShieldAlert
          }
          value={
            summary.risk
          }
          label="Риск"
          variant="risk"
        />

      </div>


      {/* ===================================================
          ATTENTION MESSAGE
      =================================================== */}

      {(
        summary.attention > 0 ||
        summary.risk > 0
      ) && (
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
                summary.attention +
                summary.risk
              }
            </strong>

          </div>


          <p
            style={
              attentionTextStyle
            }
          >
            Вним. — появилась
            проблема, которую стоит
            проверить. Риск —
            обнаружена серьёзная
            проблема, требующая
            вмешательства.
          </p>

        </section>
      )}


      {/* ===================================================
          STUDENTS TABLE
      =================================================== */}

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
                  (
                    row,
                  ) => (
                    <tr
                      key={
                        row.student.id
                      }
                      style={
                        getRowStyle(
                          row.status?.key,
                        )
                      }
                    >

                      {/* STUDENT */}

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
                                ?.name ||
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
                                  ?.name
                              }
                            </strong>


                            <small
                              style={
                                studentMetaStyle
                              }
                            >
                              {
                                row.student
                                  ?.className ||
                                selectedClass
                              }
                            </small>

                          </div>

                        </div>

                      </td>


                      {/* GRADES COUNT */}

                      <td
                        style={
                          bodyStyle
                        }
                      >
                        {
                          row.gradeCount
                        }
                      </td>


                      {/* AVERAGE */}

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


                      {/* RESULT */}

                      <td
                        style={
                          bodyStyle
                        }
                      >

                        {row.resultGrade !==
                        null &&
                        row.resultGrade !==
                        undefined ? (
                          <GradeBadge
                            value={
                              row.resultGrade
                            }
                          />
                        ) : (
                          '—'
                        )}

                      </td>


                      {/* ABSENT */}

                      <td
                        style={
                          bodyStyle
                        }
                      >
                        {row.attendanceCount >
                        0
                          ? row.absent
                          : '—'}
                      </td>


                      {/* LATE */}

                      <td
                        style={
                          bodyStyle
                        }
                      >
                        {row.attendanceCount >
                        0
                          ? row.late
                          : '—'}
                      </td>


                      {/* STATUS */}

                      <td
                        style={
                          bodyStyle
                        }
                      >

                        <StatusBadge
                          status={
                            row.status
                          }
                        />

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


/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon: Icon,
  value,
  label,
  variant = 'default',
}) {
  const variantStyle =
    getStatVariantStyle(
      variant,
    )


  return (
    <div
      style={{
        ...statCardStyle,
        ...variantStyle.card,
      }}
    >

      <div
        style={{
          ...statIconStyle,
          ...variantStyle.icon,
        }}
      >

        <Icon
          size={21}
        />

      </div>


      <div>

        <strong
          style={{
            ...statValueStyle,
            ...variantStyle.value,
          }}
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


/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}) {
  const safeStatus =
    status ||
    REPORT_STATUSES.NO_DATA


  if (
    safeStatus.key ===
    'no_data'
  ) {
    return (
      <span
        title={
          safeStatus.title
        }
        style={
          noDataBadgeStyle
        }
      >
        —
      </span>
    )
  }


  if (
    safeStatus.key ===
    'normal'
  ) {
    return (
      <span
        title={
          safeStatus.title
        }
        style={
          normalBadgeStyle
        }
      >
        Норма
      </span>
    )
  }


  if (
    safeStatus.key ===
    'attention'
  ) {
    return (
      <span
        title={
          safeStatus.title
        }
        style={
          attentionBadgeStyle
        }
      >
        Вним.
      </span>
    )
  }


  return (
    <span
      title={
        safeStatus.title
      }
      style={
        riskBadgeStyle
      }
    >
      Риск
    </span>
  )
}


/* =========================================================
   GRADE BADGE
========================================================= */

function GradeBadge({
  value,
}) {
  const numeric =
    Number(
      value,
    )


  let background =
    '#fee2e2'


  let color =
    '#991b1b'


  if (
    numeric >= 5
  ) {
    background =
      '#dcfce7'

    color =
      '#166534'
  } else if (
    numeric >= 4
  ) {
    background =
      '#dbeafe'

    color =
      '#1d4ed8'
  } else if (
    numeric >= 3
  ) {
    background =
      '#fef3c7'

    color =
      '#92400e'
  }


  return (
    <span
      style={{
        ...gradeBadgeStyle,

        background,

        color,
      }}
    >
      {value}
    </span>
  )
}


/* =========================================================
   HELPERS
========================================================= */

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
    stringValue.includes(
      ';',
    ) ||
    stringValue.includes(
      '"',
    ) ||
    stringValue.includes(
      '\n',
    )
  ) {
    return `"${stringValue.replace(
      /"/g,
      '""',
    )}"`
  }


  return stringValue
}


function getRowStyle(
  statusKey,
) {
  if (
    statusKey ===
    'risk'
  ) {
    return riskRowStyle
  }


  if (
    statusKey ===
    'attention'
  ) {
    return attentionRowStyle
  }


  return undefined
}


function getStatVariantStyle(
  variant,
) {
  if (
    variant ===
    'normal'
  ) {
    return {
      card: {
        borderColor:
          '#bbf7d0',
      },

      icon: {
        background:
          '#dcfce7',

        color:
          '#15803d',
      },

      value: {
        color:
          '#166534',
      },
    }
  }


  if (
    variant ===
    'attention'
  ) {
    return {
      card: {
        borderColor:
          '#fde68a',
      },

      icon: {
        background:
          '#fef3c7',

        color:
          '#b45309',
      },

      value: {
        color:
          '#92400e',
      },
    }
  }


  if (
    variant ===
    'risk'
  ) {
    return {
      card: {
        borderColor:
          '#fecaca',
      },

      icon: {
        background:
          '#fee2e2',

        color:
          '#dc2626',
      },

      value: {
        color:
          '#991b1b',
      },
    }
  }


  return {
    card: {},
    icon: {},
    value: {},
  }
}


/* =========================================================
   STYLES
========================================================= */

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


/* =========================================================
   STATISTICS
========================================================= */

const statsGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit, minmax(135px, 1fr))',

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


/* =========================================================
   ATTENTION
========================================================= */

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

  lineHeight:
    1.5,
}


/* =========================================================
   TABLE HEADER
========================================================= */

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


/* =========================================================
   TABLE
========================================================= */

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
    820,

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


/* =========================================================
   STUDENT
========================================================= */

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


/* =========================================================
   GRADE
========================================================= */

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


/* =========================================================
   STATUS
========================================================= */

const statusBadgeBaseStyle = {
  display:
    'inline-flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  minWidth:
    52,

  padding:
    '5px 8px',

  borderRadius:
    8,

  fontSize:
    11,

  fontWeight:
    700,

  whiteSpace:
    'nowrap',
}


const noDataBadgeStyle = {
  ...statusBadgeBaseStyle,

  minWidth:
    28,

  background:
    '#f1f5f9',

  color:
    '#64748b',
}


const normalBadgeStyle = {
  ...statusBadgeBaseStyle,

  background:
    '#dcfce7',

  color:
    '#166534',
}


const attentionBadgeStyle = {
  ...statusBadgeBaseStyle,

  background:
    '#fef3c7',

  color:
    '#92400e',
}


const riskBadgeStyle = {
  ...statusBadgeBaseStyle,

  background:
    '#fee2e2',

  color:
    '#991b1b',
}


/* =========================================================
   ROW COLORS
========================================================= */

const attentionRowStyle = {
  background:
    '#fffbeb',
}


const riskRowStyle = {
  background:
    '#fff7f7',
}


/* =========================================================
   EMPTY STATE
========================================================= */

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