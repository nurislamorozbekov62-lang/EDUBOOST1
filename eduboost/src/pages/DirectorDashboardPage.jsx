import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  GraduationCap,
  RefreshCcw,
  School,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react'

import {
  Link,
} from 'react-router-dom'

import {
  useAuth,
} from '../context/AuthContext'

import {
  ROLES,
} from '../config/access'

import {
  supabase,
} from '../lib/supabase'

import {
  calculateSupabaseAttendanceStats,
} from '../services/supabaseAttendanceService'

import {
  getAdminSchoolClasses,
  getAdminSchoolStudents,
  getAdminSchoolTeachers,
} from '../services/supabaseAdminJournalService'


/* ========================================
   DATE HELPERS
======================================== */

function getLocalDate(
  date,
) {
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


function getToday() {
  return getLocalDate(
    new Date(),
  )
}


function getDateDaysAgo(
  days,
) {
  const date =
    new Date()

  date.setDate(
    date.getDate() -
      days,
  )

  return getLocalDate(
    date,
  )
}


/* ========================================
   NUMBER HELPERS
======================================== */

function averageNumbers(
  values,
) {
  const numeric =
    values
      .map(
        (value) =>
          Number(value),
      )
      .filter(
        Number.isFinite,
      )

  if (
    numeric.length ===
    0
  ) {
    return null
  }

  return Number(
    (
      numeric.reduce(
        (
          sum,
          value,
        ) =>
          sum +
          value,
        0,
      ) /
      numeric.length
    ).toFixed(2),
  )
}


function getPercent(
  value,
  total,
) {
  if (
    !total ||
    total <= 0
  ) {
    return 0
  }

  return Math.round(
    (
      value /
      total
    ) *
      100,
  )
}


/* ========================================
   NORMALIZER
======================================== */

function normalizeAttendance(
  record,
) {
  return {
    id:
      record.id,

    studentId:
      record.student_id,

    teacherId:
      record.teacher_id,

    teacherName:
      record.teacher_name ||
      '',

    className:
      record.class_name ||
      '',

    subject:
      record.subject ||
      '',

    status:
      record.status,

    date:
      record.attendance_date,
  }
}


/* ========================================
   PAGE
======================================== */

function DirectorDashboardPage() {
  const {
    user,
  } = useAuth()


  const [
    students,
    setStudents,
  ] = useState([])


  const [
    teachers,
    setTeachers,
  ] = useState([])


  const [
    classes,
    setClasses,
  ] = useState([])


  const [
    grades,
    setGrades,
  ] = useState([])


  const [
    attendance,
    setAttendance,
  ] = useState([])


  const [
    selectedQuarter,
    setSelectedQuarter,
  ] = useState(1)


  const [
    loading,
    setLoading,
  ] = useState(true)


  const [
    error,
    setError,
  ] = useState('')


  const [
    refreshKey,
    setRefreshKey,
  ] = useState(0)


  const [
    lastUpdatedAt,
    setLastUpdatedAt,
  ] = useState(null)


  const allowed =
    user?.role ===
    ROLES.DIRECTOR


  /* ========================================
     LOAD
  ======================================== */

  useEffect(() => {
    if (
      !user?.id ||
      !user?.schoolId ||
      !allowed
    ) {
      return
    }

    void loadDashboard()
  }, [
    user?.id,
    user?.schoolId,
    selectedQuarter,
    refreshKey,
  ])


  async function loadDashboard() {
    try {
      setLoading(true)
      setError('')


      const dateFrom =
        getDateDaysAgo(30)


      const dateTo =
        getToday()


      const [
        studentsResult,
        teachersResult,
        classesResult,
        gradesResult,
        attendanceResult,
      ] =
        await Promise.allSettled([
          getAdminSchoolStudents(
            user,
          ),

          getAdminSchoolTeachers(
            user,
          ),

          getAdminSchoolClasses(
            user,
          ),

          supabase
            .from('grades')
            .select(`
              id,
              student_id,
              teacher_id,
              teacher_name,
              class_name,
              subject,
              grade,
              quarter,
              grade_date
            `)
            .eq(
              'school_id',
              user.schoolId,
            )
            .eq(
              'quarter',
              Number(
                selectedQuarter,
              ),
            ),

          supabase
            .from(
              'attendance_records',
            )
            .select(`
              id,
              student_id,
              teacher_id,
              teacher_name,
              class_name,
              subject,
              status,
              attendance_date
            `)
            .eq(
              'school_id',
              user.schoolId,
            )
            .gte(
              'attendance_date',
              dateFrom,
            )
            .lte(
              'attendance_date',
              dateTo,
            ),
        ])


      /* STUDENTS */

      if (
        studentsResult.status ===
        'fulfilled'
      ) {
        setStudents(
          Array.isArray(
            studentsResult.value,
          )
            ? studentsResult.value
            : [],
        )
      } else {
        console.error(
          'Director students:',
          studentsResult.reason,
        )

        setStudents([])
      }


      /* TEACHERS */

      if (
        teachersResult.status ===
        'fulfilled'
      ) {
        setTeachers(
          Array.isArray(
            teachersResult.value,
          )
            ? teachersResult.value
            : [],
        )
      } else {
        console.error(
          'Director teachers:',
          teachersResult.reason,
        )

        setTeachers([])
      }


      /* CLASSES */

      if (
        classesResult.status ===
        'fulfilled'
      ) {
        setClasses(
          Array.isArray(
            classesResult.value,
          )
            ? classesResult.value
            : [],
        )
      } else {
        console.error(
          'Director classes:',
          classesResult.reason,
        )

        setClasses([])
      }


      /* GRADES */

      if (
        gradesResult.status ===
          'fulfilled' &&
        !gradesResult.value?.error
      ) {
        setGrades(
          gradesResult.value?.data ||
            [],
        )
      } else {
        const loadError =
          gradesResult.status ===
          'fulfilled'
            ? gradesResult.value?.error
            : gradesResult.reason

        console.error(
          'Director grades:',
          loadError,
        )

        setGrades([])
      }


      /* ATTENDANCE */

      if (
        attendanceResult.status ===
          'fulfilled' &&
        !attendanceResult.value
          ?.error
      ) {
        setAttendance(
          (
            attendanceResult
              .value?.data ||
            []
          ).map(
            normalizeAttendance,
          ),
        )
      } else {
        const loadError =
          attendanceResult.status ===
          'fulfilled'
            ? attendanceResult.value
                ?.error
            : attendanceResult.reason

        console.error(
          'Director attendance:',
          loadError,
        )

        setAttendance([])
      }


      const rejected =
        [
          studentsResult,
          teachersResult,
          classesResult,
          gradesResult,
          attendanceResult,
        ].some(
          (result) =>
            result.status ===
            'rejected',
        )


      if (
        rejected
      ) {
        setError(
          'Часть данных временно не загрузилась. Остальная информация доступна.',
        )
      }


      setLastUpdatedAt(
        new Date(),
      )
    } catch (
      loadError
    ) {
      console.error(
        'Director dashboard:',
        loadError,
      )

      setError(
        loadError?.message ||
          'Не удалось загрузить данные школы.',
      )
    } finally {
      setLoading(false)
    }
  }


  /* ========================================
     GRADES
  ======================================== */

  const gradeStats =
    useMemo(() => {
      const values =
        grades
          .map(
            (grade) =>
              Number(
                grade.grade,
              ),
          )
          .filter(
            Number.isFinite,
          )


      const average =
        averageNumbers(
          values,
        )


      const goodGrades =
        values.filter(
          (value) =>
            value >= 4,
        ).length


      return {
        total:
          values.length,

        average,

        goodGrades,

        goodPercent:
          getPercent(
            goodGrades,
            values.length,
          ),
      }
    }, [
      grades,
    ])


  /* ========================================
     ATTENDANCE
  ======================================== */

  const attendanceStats =
    useMemo(
      () =>
        calculateSupabaseAttendanceStats(
          attendance,
        ),
      [
        attendance,
      ],
    )


  /* ========================================
     STUDENTS
  ======================================== */

  const studentAnalytics =
    useMemo(() => {
      return students.map(
        (student) => {
          const studentGrades =
            grades.filter(
              (grade) =>
                String(
                  grade.student_id,
                ) ===
                String(
                  student.id,
                ),
            )


          const average =
            averageNumbers(
              studentGrades.map(
                (grade) =>
                  grade.grade,
              ),
            )


          const studentAttendance =
            attendance.filter(
              (record) =>
                String(
                  record.studentId,
                ) ===
                String(
                  student.id,
                ),
            )


          const attendanceInfo =
            calculateSupabaseAttendanceStats(
              studentAttendance,
            )


          const hasGrades =
            studentGrades.length >
            0


          const hasAttendance =
            studentAttendance.length >
            0


          const lowGrade =
            average !==
              null &&
            average <
              3


          const lowAttendance =
            hasAttendance &&
            Number(
              attendanceInfo.percent,
            ) <
              80


          return {
            id:
              student.id,

            name:
              student.name ||
              'Ученик',

            className:
              student.className ||
              '—',

            average,

            hasGrades,

            hasAttendance,

            attendancePercent:
              hasAttendance
                ? attendanceInfo.percent
                : null,

            absent:
              attendanceInfo.absent ||
              0,

            late:
              attendanceInfo.late ||
              0,

            lowGrade,

            lowAttendance,

            insufficientData:
              !hasGrades ||
              !hasAttendance,

            risk:
              lowGrade ||
              lowAttendance,
          }
        },
      )
    }, [
      students,
      grades,
      attendance,
    ])


  const studentsWithFullData =
    useMemo(
      () =>
        studentAnalytics.filter(
          (student) =>
            student.hasGrades &&
            student.hasAttendance,
        ),
      [
        studentAnalytics,
      ],
    )


  const completenessPercent =
    getPercent(
      studentsWithFullData.length,
      students.length,
    )


  /* ========================================
     CLASSES
  ======================================== */

  const classAnalytics =
    useMemo(() => {
      return classes
        .map(
          (className) => {
            const classStudents =
              students.filter(
                (student) =>
                  String(
                    student.className ||
                      '',
                  ) ===
                  String(
                    className,
                  ),
              )


            const classGrades =
              grades.filter(
                (grade) =>
                  String(
                    grade.class_name ||
                      '',
                  ) ===
                  String(
                    className,
                  ),
              )


            const average =
              averageNumbers(
                classGrades.map(
                  (grade) =>
                    grade.grade,
                ),
              )


            const classAttendance =
              attendance.filter(
                (record) =>
                  String(
                    record.className ||
                      '',
                  ) ===
                  String(
                    className,
                  ),
              )


            const attendanceInfo =
              calculateSupabaseAttendanceStats(
                classAttendance,
              )


            const hasGrades =
              classGrades.length >
              0


            const hasAttendance =
              classAttendance.length >
              0


            const lowGrades =
              average !==
                null &&
              average <
                3


            const lowAttendance =
              hasAttendance &&
              Number(
                attendanceInfo.percent,
              ) <
                85


            const missingData =
              !hasGrades ||
              !hasAttendance


            return {
              className,

              students:
                classStudents.length,

              average,

              hasGrades,

              hasAttendance,

              attendancePercent:
                hasAttendance
                  ? attendanceInfo.percent
                  : null,

              absent:
                attendanceInfo.absent ||
                0,

              late:
                attendanceInfo.late ||
                0,

              lowGrades,

              lowAttendance,

              missingData,

              requiresAttention:
                lowGrades ||
                lowAttendance ||
                missingData,
            }
          },
        )
        .sort(
          (
            first,
            second,
          ) =>
            String(
              first.className,
            ).localeCompare(
              String(
                second.className,
              ),
              'ru',
              {
                numeric: true,
              },
            ),
        )
    }, [
      classes,
      students,
      grades,
      attendance,
    ])


  /* ========================================
     ALERTS
  ======================================== */

  const attentionItems =
    useMemo(() => {
      const items = []


      /* CLASSES */

      classAnalytics
        .filter(
          (item) =>
            item.requiresAttention,
        )
        .forEach(
          (item) => {
            const reasons = []


            if (
              !item.hasGrades
            ) {
              reasons.push(
                'нет оценок',
              )
            }


            if (
              !item.hasAttendance
            ) {
              reasons.push(
                'нет отметок за 30 дней',
              )
            }


            if (
              item.lowGrades
            ) {
              reasons.push(
                `средний балл ${item.average}`,
              )
            }


            if (
              item.lowAttendance
            ) {
              reasons.push(
                `посещаемость ${item.attendancePercent}%`,
              )
            }


            items.push({
              id:
                `class-${item.className}`,

              type:
                item.lowGrades ||
                item.lowAttendance
                  ? 'danger'
                  : 'warning',

              title:
                `${item.className}`,

              text:
                reasons.join(
                  ' · ',
                ),

              to:
                '/admin/reports',
            })
          },
        )


      /* RISK STUDENTS */

      studentAnalytics
        .filter(
          (student) =>
            student.risk,
        )
        .forEach(
          (student) => {
            const reasons = []


            if (
              student.lowGrade
            ) {
              reasons.push(
                `средний балл ${student.average}`,
              )
            }


            if (
              student.lowAttendance
            ) {
              reasons.push(
                `посещаемость ${student.attendancePercent}%`,
              )
            }


            items.push({
              id:
                `student-${student.id}`,

              type:
                'danger',

              title:
                `${student.name} · ${student.className}`,

              text:
                reasons.join(
                  ' · ',
                ),

              to:
                '/admin/reports',
            })
          },
        )


      /* INCOMPLETE STUDENT DATA */

      const incompleteStudents =
        studentAnalytics.filter(
          (student) =>
            student.insufficientData &&
            !student.risk,
        )


      if (
        incompleteStudents.length >
        0
      ) {
        items.push({
          id:
            'incomplete-students',

          type:
            'warning',

          title:
            `Недостаточно данных: ${incompleteStudents.length}`,

          text:
            'По некоторым ученикам нет оценок или отметок посещаемости.',

          to:
            '/admin/journals',
        })
      }


      /* LATE */

      if (
        Number(
          attendanceStats.late ||
            0,
        ) >
        0
      ) {
        items.push({
          id:
            'late',

          type:
            'warning',

          title:
            `Опозданий за 30 дней: ${attendanceStats.late}`,

          text:
            'Можно посмотреть учеников и даты опозданий.',

          to:
            '/admin/attendance',
        })
      }


      /* ABSENT */

      if (
        Number(
          attendanceStats.absent ||
            0,
        ) >
        0
      ) {
        items.push({
          id:
            'absent',

          type:
            'danger',

          title:
            `Пропусков за 30 дней: ${attendanceStats.absent}`,

          text:
            'Проверьте причины отсутствия учеников.',

          to:
            '/admin/attendance',
        })
      }


      return items.slice(
        0,
        8,
      )
    }, [
      classAnalytics,
      studentAnalytics,
      attendanceStats,
    ])


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
            Этот раздел доступен
            только директору школы.
          </p>

        </section>

      </div>
    )
  }


  /* ========================================
     UI
  ======================================== */

  return (
    <div className="page-container">

      {/* =================================
          SCHOOL SUMMARY
      ================================= */}

      <section
        className="content-card"
        style={
          summaryHeaderStyle
        }
      >

        <div
          style={
            summaryHeaderTopStyle
          }
        >

          <div>

            <p
              style={
                eyebrowStyle
              }
            >
              Сводка школы
            </p>

            <h2
              style={
                summaryTitleStyle
              }
            >
              Главное
            </h2>

            <p
              style={
                summarySubtitleStyle
              }
            >
              Только показатели,
              которые помогают быстро
              понять состояние школы.
            </p>

          </div>


          <div
            style={
              headerActionsStyle
            }
          >

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
              style={
                quarterSelectStyle
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
              onClick={() =>
                setRefreshKey(
                  (current) =>
                    current + 1,
                )
              }
              disabled={
                loading
              }
              style={{
                ...refreshButtonStyle,

                opacity:
                  loading
                    ? 0.6
                    : 1,
              }}
            >
              <RefreshCcw
                size={17}
              />

              {loading
                ? 'Обновляем'
                : 'Обновить'}
            </button>

          </div>

        </div>


        <div
          style={
            contextBarStyle
          }
        >

          <ContextItem
            icon={
              School
            }
            text={
              user.school ||
              'Школа'
            }
          />


          <ContextItem
            icon={
              GraduationCap
            }
            text={`${students.length} учеников`}
          />


          <ContextItem
            icon={
              UserRound
            }
            text={`${teachers.length} учителей`}
          />


          <ContextItem
            icon={
              Users
            }
            text={`${classes.length} классов`}
          />


          {lastUpdatedAt && (
            <ContextItem
              icon={
                Clock3
              }
              text={`Обновлено ${lastUpdatedAt.toLocaleTimeString(
                'ru-RU',
                {
                  hour:
                    '2-digit',

                  minute:
                    '2-digit',
                },
              )}`}
            />
          )}

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


      {/* =================================
          THREE MAIN NUMBERS
      ================================= */}

      <section
        style={
          mainStatsGridStyle
        }
      >

        <MainStatCard
          icon={
            TrendingUp
          }
          value={
            gradeStats.average ??
            '—'
          }
          title="Средний балл"
          description={
            gradeStats.total >
            0
              ? `По ${gradeStats.total} выставленным оценкам`
              : 'Оценок пока нет'
          }
        />


        <MainStatCard
          icon={
            CheckCircle2
          }
          value={
            attendance.length >
            0
              ? `${attendanceStats.percent || 0}%`
              : '—'
          }
          title="Посещаемость"
          description={
            attendance.length >
            0
              ? 'По имеющимся отметкам за 30 дней'
              : 'Отметок за 30 дней пока нет'
          }
        />


        <MainStatCard
          icon={
            Database
          }
          value={
            students.length >
            0
              ? `${completenessPercent}%`
              : '—'
          }
          title="Полнота данных"
          description={
            students.length >
            0
              ? `Полные данные по ${studentsWithFullData.length} из ${students.length} учеников`
              : 'В школе пока нет учеников'
          }
          warning={
            students.length >
              0 &&
            completenessPercent <
              100
          }
        />

      </section>


      {/* =================================
          ATTENTION
      ================================= */}

      <section className="content-card">

        <div
          style={
            sectionHeaderStyle
          }
        >

          <div>

            <div
              style={
                sectionTitleLineStyle
              }
            >
              <h2
                style={
                  sectionTitleStyle
                }
              >
                Требует внимания
              </h2>


              {attentionItems.length >
                0 && (
                <span
                  style={
                    countBadgeStyle
                  }
                >
                  {
                    attentionItems.length
                  }
                </span>
              )}

            </div>


            <p
              style={
                sectionDescriptionStyle
              }
            >
              Сначала показываем
              проблемы и отсутствие
              данных — без поиска по
              десяткам страниц.
            </p>

          </div>

        </div>


        {loading ? (
          <p className="empty-text">
            Проверяем данные школы...
          </p>
        ) : attentionItems.length ===
          0 ? (
          <div
            style={
              allGoodStyle
            }
          >

            <CheckCircle2
              size={30}
            />

            <div>

              <strong
                style={
                  allGoodTitleStyle
                }
              >
                По имеющимся данным
                всё в порядке
              </strong>

              <p
                style={
                  allGoodTextStyle
                }
              >
                Критических отклонений
                сейчас не обнаружено.
              </p>

            </div>

          </div>
        ) : (
          <div
            style={
              attentionListStyle
            }
          >

            {attentionItems.map(
              (item) => (
                <AttentionRow
                  key={
                    item.id
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


      {/* =================================
          CLASSES
      ================================= */}

      <section className="content-card">

        <div
          style={
            sectionHeaderStyle
          }
        >

          <div>

            <h2
              style={
                sectionTitleStyle
              }
            >
              Классы
            </h2>

            <p
              style={
                sectionDescriptionStyle
              }
            >
              Оценки за
              {' '}
              {selectedQuarter}
              {' '}
              четверть и посещаемость
              за последние 30 дней.
            </p>

          </div>


          <Link
            to="/admin/reports"
            style={
              smallLinkStyle
            }
          >
            Подробный отчёт

            <ChevronRight
              size={16}
            />
          </Link>

        </div>


        {loading ? (
          <p className="empty-text">
            Загружаем классы...
          </p>
        ) : classAnalytics.length ===
          0 ? (
          <p className="empty-text">
            Классы пока не найдены.
          </p>
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
                      tableHeaderLeftStyle
                    }
                  >
                    Класс
                  </th>

                  <th
                    style={
                      tableHeaderStyle
                    }
                  >
                    Учеников
                  </th>

                  <th
                    style={
                      tableHeaderStyle
                    }
                  >
                    Ср. балл
                  </th>

                  <th
                    style={
                      tableHeaderStyle
                    }
                  >
                    Посещаемость
                  </th>

                  <th
                    style={
                      tableHeaderLeftStyle
                    }
                  >
                    Статус
                  </th>

                </tr>

              </thead>


              <tbody>

                {classAnalytics.map(
                  (item) => (
                    <tr
                      key={
                        item.className
                      }
                    >

                      <td
                        style={
                          tableBodyLeftStyle
                        }
                      >
                        <strong>
                          {
                            item.className
                          }
                        </strong>
                      </td>


                      <td
                        style={
                          tableBodyStyle
                        }
                      >
                        {
                          item.students
                        }
                      </td>


                      <td
                        style={
                          tableBodyStyle
                        }
                      >
                        {
                          item.average ??
                          '—'
                        }
                      </td>


                      <td
                        style={
                          tableBodyStyle
                        }
                      >
                        {item.attendancePercent !==
                        null
                          ? `${item.attendancePercent}%`
                          : '—'}
                      </td>


                      <td
                        style={
                          tableBodyLeftStyle
                        }
                      >

                        <ClassStatus
                          item={
                            item
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


      {/* =================================
          QUICK SECTIONS
      ================================= */}

      <section className="content-card">

        <div
          style={
            sectionHeaderStyle
          }
        >

          <div>

            <h2
              style={
                sectionTitleStyle
              }
            >
              Разделы
            </h2>

            <p
              style={
                sectionDescriptionStyle
              }
            >
              Всё остальное открывается
              только когда директору
              нужны подробности.
            </p>

          </div>

        </div>


        <div
          style={
            quickGridStyle
          }
        >

          <QuickLink
            to="/admin/reports"
            icon={
              BarChart3
            }
            title="Отчёты"
            text="Успеваемость и посещаемость"
          />


          <QuickLink
            to="/admin/journals"
            icon={
              BookOpen
            }
            title="Журналы"
            text="Оценки, темы и итоги"
          />


          <QuickLink
            to="/admin/attendance"
            icon={
              CheckCircle2
            }
            title="Посещаемость"
            text="Пропуски и опоздания"
          />


          <QuickLink
            to="/admin/schedule"
            icon={
              CalendarDays
            }
            title="Расписание"
            text="Расписание всей школы"
          />


          <QuickLink
            to="/admin/workload"
            icon={
              Users
            }
            title="Нагрузка"
            text="Нагрузка преподавателей"
          />


          <QuickLink
            to="/admin/substitutions"
            icon={
              RefreshCcw
            }
            title="Замены"
            text="История замен учителей"
          />

        </div>

      </section>

    </div>
  )
}


/* ========================================
   COMPONENTS
======================================== */

function ContextItem({
  icon: Icon,
  text,
}) {
  return (
    <div
      style={
        contextItemStyle
      }
    >
      <Icon
        size={15}
      />

      <span>
        {text}
      </span>
    </div>
  )
}


function MainStatCard({
  icon: Icon,
  value,
  title,
  description,
  warning = false,
}) {
  return (
    <div
      style={{
        ...mainStatCardStyle,

        ...(warning
          ? mainStatWarningStyle
          : {}),
      }}
    >

      <div
        style={{
          ...mainStatIconStyle,

          ...(warning
            ? mainStatIconWarningStyle
            : {}),
        }}
      >
        <Icon
          size={23}
        />
      </div>


      <div>

        <strong
          style={
            mainStatValueStyle
          }
        >
          {value}
        </strong>

        <div
          style={
            mainStatTitleStyle
          }
        >
          {title}
        </div>

        <p
          style={
            mainStatDescriptionStyle
          }
        >
          {description}
        </p>

      </div>

    </div>
  )
}


function AttentionRow({
  item,
}) {
  const danger =
    item.type ===
    'danger'


  return (
    <Link
      to={item.to}
      style={{
        ...attentionRowStyle,

        ...(danger
          ? attentionDangerStyle
          : attentionWarningStyle),
      }}
    >

      <div
        style={{
          ...attentionIconStyle,

          ...(danger
            ? attentionDangerIconStyle
            : attentionWarningIconStyle),
        }}
      >
        <AlertTriangle
          size={18}
        />
      </div>


      <div
        style={
          attentionTextWrapStyle
        }
      >

        <strong
          style={
            attentionTitleStyle
          }
        >
          {item.title}
        </strong>

        <span
          style={
            attentionTextStyle
          }
        >
          {item.text}
        </span>

      </div>


      <div
        style={
          openActionStyle
        }
      >
        Открыть

        <ChevronRight
          size={16}
        />
      </div>

    </Link>
  )
}


function ClassStatus({
  item,
}) {
  if (
    item.lowGrades ||
    item.lowAttendance
  ) {
    return (
      <span
        style={
          dangerBadgeStyle
        }
      >
        Требует внимания
      </span>
    )
  }


  if (
    item.missingData
  ) {
    const text =
      !item.hasGrades &&
      !item.hasAttendance
        ? 'Нет данных'
        : !item.hasGrades
          ? 'Нет оценок'
          : 'Нет отметок за 30 дней'


    return (
      <span
        style={
          warningBadgeStyle
        }
      >
        {text}
      </span>
    )
  }


  return (
    <span
      style={
        successBadgeStyle
      }
    >
      Норма
    </span>
  )
}


function QuickLink({
  to,
  icon: Icon,
  title,
  text,
}) {
  return (
    <Link
      to={to}
      style={
        quickLinkStyle
      }
    >

      <div
        style={
          quickIconStyle
        }
      >
        <Icon
          size={20}
        />
      </div>


      <div
        style={
          quickTextWrapStyle
        }
      >

        <strong
          style={
            quickTitleStyle
          }
        >
          {title}
        </strong>

        <span
          style={
            quickTextStyle
          }
        >
          {text}
        </span>

      </div>


      <ChevronRight
        size={17}
        style={
          quickArrowStyle
        }
      />

    </Link>
  )
}


/* ========================================
   STYLES
======================================== */

const summaryHeaderStyle = {
  marginBottom:
    16,
}


const summaryHeaderTopStyle = {
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
}


const eyebrowStyle = {
  margin:
    0,

  color:
    '#2563eb',

  fontSize:
    12,

  fontWeight:
    800,

  textTransform:
    'uppercase',
}


const summaryTitleStyle = {
  margin:
    '5px 0 0',

  color:
    '#0f274d',

  fontSize:
    25,
}


const summarySubtitleStyle = {
  margin:
    '7px 0 0',

  color:
    '#64748b',

  fontSize:
    14,

  lineHeight:
    1.45,
}


const headerActionsStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    8,

  flexWrap:
    'wrap',
}


const quarterSelectStyle = {
  minHeight:
    42,

  padding:
    '0 12px',

  border:
    '1px solid #dbe2ea',

  borderRadius:
    11,

  background:
    '#ffffff',

  color:
    '#0f274d',

  fontWeight:
    700,
}


const refreshButtonStyle = {
  display:
    'inline-flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  gap:
    7,

  minHeight:
    42,

  padding:
    '0 13px',

  border:
    '1px solid #dbeafe',

  borderRadius:
    11,

  background:
    '#eff6ff',

  color:
    '#1d4ed8',

  fontWeight:
    800,

  cursor:
    'pointer',
}


const contextBarStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    14,

  flexWrap:
    'wrap',

  marginTop:
    18,

  paddingTop:
    14,

  borderTop:
    '1px solid #eef2f7',
}


const contextItemStyle = {
  display:
    'inline-flex',

  alignItems:
    'center',

  gap:
    5,

  color:
    '#64748b',

  fontSize:
    12,
}


/* MAIN STATS */

const mainStatsGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit, minmax(230px, 1fr))',

  gap:
    12,

  marginBottom:
    16,
}


const mainStatCardStyle = {
  display:
    'flex',

  alignItems:
    'flex-start',

  gap:
    14,

  minHeight:
    130,

  padding:
    20,

  border:
    '1px solid #e2e8f0',

  borderRadius:
    18,

  background:
    '#ffffff',
}


const mainStatWarningStyle = {
  background:
    '#fffaf5',

  border:
    '1px solid #fed7aa',
}


const mainStatIconStyle = {
  width:
    48,

  height:
    48,

  flexShrink:
    0,

  display:
    'grid',

  placeItems:
    'center',

  borderRadius:
    14,

  background:
    '#eff6ff',

  color:
    '#2563eb',
}


const mainStatIconWarningStyle = {
  background:
    '#ffedd5',

  color:
    '#c2410c',
}


const mainStatValueStyle = {
  display:
    'block',

  color:
    '#0f274d',

  fontSize:
    28,

  lineHeight:
    1,
}


const mainStatTitleStyle = {
  marginTop:
    7,

  color:
    '#334155',

  fontSize:
    14,

  fontWeight:
    800,
}


const mainStatDescriptionStyle = {
  margin:
    '6px 0 0',

  color:
    '#64748b',

  fontSize:
    11,

  lineHeight:
    1.45,
}


/* SECTION */

const sectionHeaderStyle = {
  display:
    'flex',

  alignItems:
    'flex-start',

  justifyContent:
    'space-between',

  gap:
    14,

  flexWrap:
    'wrap',

  marginBottom:
    16,
}


const sectionTitleLineStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    8,
}


const sectionTitleStyle = {
  margin:
    0,

  color:
    '#0f274d',

  fontSize:
    21,
}


const sectionDescriptionStyle = {
  margin:
    '5px 0 0',

  color:
    '#64748b',

  fontSize:
    12,

  lineHeight:
    1.5,
}


const countBadgeStyle = {
  display:
    'inline-grid',

  placeItems:
    'center',

  minWidth:
    25,

  height:
    25,

  padding:
    '0 7px',

  borderRadius:
    999,

  background:
    '#fee2e2',

  color:
    '#991b1b',

  fontSize:
    11,

  fontWeight:
    800,
}


/* ATTENTION */

const attentionListStyle = {
  display:
    'grid',

  gap:
    9,
}


const attentionRowStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    11,

  padding:
    13,

  borderRadius:
    13,

  textDecoration:
    'none',

  color:
    'inherit',
}


const attentionDangerStyle = {
  background:
    '#fff7f7',

  border:
    '1px solid #fecaca',
}


const attentionWarningStyle = {
  background:
    '#fffaf5',

  border:
    '1px solid #fed7aa',
}


const attentionIconStyle = {
  width:
    38,

  height:
    38,

  flexShrink:
    0,

  display:
    'grid',

  placeItems:
    'center',

  borderRadius:
    11,
}


const attentionDangerIconStyle = {
  background:
    '#fee2e2',

  color:
    '#dc2626',
}


const attentionWarningIconStyle = {
  background:
    '#ffedd5',

  color:
    '#ea580c',
}


const attentionTextWrapStyle = {
  flex:
    1,

  minWidth:
    0,
}


const attentionTitleStyle = {
  display:
    'block',

  color:
    '#0f274d',

  fontSize:
    13,
}


const attentionTextStyle = {
  display:
    'block',

  marginTop:
    4,

  color:
    '#64748b',

  fontSize:
    11,

  lineHeight:
    1.4,
}


const openActionStyle = {
  display:
    'inline-flex',

  alignItems:
    'center',

  gap:
    3,

  color:
    '#2563eb',

  fontSize:
    11,

  fontWeight:
    800,

  whiteSpace:
    'nowrap',
}


const allGoodStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    12,

  padding:
    18,

  border:
    '1px solid #bbf7d0',

  borderRadius:
    14,

  background:
    '#f0fdf4',

  color:
    '#16a34a',
}


const allGoodTitleStyle = {
  display:
    'block',

  color:
    '#166534',
}


const allGoodTextStyle = {
  margin:
    '4px 0 0',

  color:
    '#15803d',

  fontSize:
    11,
}


/* TABLE */

const tableWrapperStyle = {
  width:
    '100%',

  overflowX:
    'auto',

  border:
    '1px solid #e5e7eb',

  borderRadius:
    14,

  background:
    '#ffffff',
}


const tableStyle = {
  width:
    '100%',

  minWidth:
    620,

  borderCollapse:
    'collapse',
}


const tableHeaderStyle = {
  padding:
    11,

  textAlign:
    'center',

  background:
    '#f8fafc',

  color:
    '#475569',

  borderBottom:
    '1px solid #e5e7eb',

  fontSize:
    11,

  whiteSpace:
    'nowrap',
}


const tableHeaderLeftStyle = {
  ...tableHeaderStyle,

  textAlign:
    'left',
}


const tableBodyStyle = {
  padding:
    12,

  textAlign:
    'center',

  color:
    '#334155',

  borderBottom:
    '1px solid #eef2f7',

  fontSize:
    12,
}


const tableBodyLeftStyle = {
  ...tableBodyStyle,

  textAlign:
    'left',
}


const successBadgeStyle = {
  display:
    'inline-flex',

  padding:
    '5px 8px',

  borderRadius:
    8,

  background:
    '#dcfce7',

  color:
    '#166534',

  fontSize:
    10,

  fontWeight:
    800,
}


const warningBadgeStyle = {
  ...successBadgeStyle,

  background:
    '#f1f5f9',

  color:
    '#475569',
}


const dangerBadgeStyle = {
  ...successBadgeStyle,

  background:
    '#fee2e2',

  color:
    '#991b1b',
}


const smallLinkStyle = {
  display:
    'inline-flex',

  alignItems:
    'center',

  gap:
    3,

  color:
    '#2563eb',

  textDecoration:
    'none',

  fontSize:
    12,

  fontWeight:
    800,
}


/* QUICK LINKS */

const quickGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(auto-fit, minmax(240px, 1fr))',

  gap:
    10,
}


const quickLinkStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    11,

  padding:
    13,

  border:
    '1px solid #e2e8f0',

  borderRadius:
    13,

  background:
    '#ffffff',

  color:
    'inherit',

  textDecoration:
    'none',
}


const quickIconStyle = {
  width:
    40,

  height:
    40,

  flexShrink:
    0,

  display:
    'grid',

  placeItems:
    'center',

  borderRadius:
    11,

  background:
    '#eff6ff',

  color:
    '#2563eb',
}


const quickTextWrapStyle = {
  minWidth:
    0,

  flex:
    1,
}


const quickTitleStyle = {
  display:
    'block',

  color:
    '#0f274d',

  fontSize:
    13,
}


const quickTextStyle = {
  display:
    'block',

  marginTop:
    3,

  color:
    '#64748b',

  fontSize:
    10,
}


const quickArrowStyle = {
  flexShrink:
    0,

  color:
    '#94a3b8',
}


export default DirectorDashboardPage