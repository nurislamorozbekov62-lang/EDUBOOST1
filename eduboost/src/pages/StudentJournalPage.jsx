import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  RefreshCcw,
  School,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  XCircle,
} from 'lucide-react'

import {
  useAutoRefresh,
} from '../hooks/useAutoRefresh'

import {
  useAuth,
} from '../context/AuthContext'

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
  getSupabaseStudentAttendance,
} from '../services/supabaseAttendanceService'


function StudentJournalPage() {
  const { user } =
    useAuth()

  const [
    activeTab,
    setActiveTab,
  ] = useState('grades')

  const [
    selectedQuarter,
    setSelectedQuarter,
  ] = useState(1)

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
    gradesLoading,
    setGradesLoading,
  ] = useState(true)

  const [
    attendanceLoading,
    setAttendanceLoading,
  ] = useState(true)

  const [
    gradesError,
    setGradesError,
  ] = useState('')

  const [
    attendanceError,
    setAttendanceError,
  ] = useState('')


  useEffect(() => {
    if (
      !user?.id ||
      user.role !== 'Ученик'
    ) {
      return
    }

    void loadGrades()
  }, [
    user?.id,
    user?.role,
    selectedQuarter,
  ])


  useEffect(() => {
    if (
      !user?.id ||
      user.role !== 'Ученик'
    ) {
      return
    }

    void loadAttendance()
  }, [
    user?.id,
    user?.role,
  ])

  useEffect(() => {
  if (!user?.id) {
    return
  }

  if (activeTab === 'grades') {
    void loadGrades()
  }

  if (activeTab === 'attendance') {
    void loadAttendance()
  }
}, [activeTab])


useAutoRefresh(
  async () => {
    if (!user?.id) {
      return
    }

    if (activeTab === 'grades') {
      await loadGrades()
    }

    if (activeTab === 'attendance') {
      await loadAttendance()
    }
  },
  [
    user?.id,
    activeTab,
    selectedQuarter,
  ],
)

  async function loadGrades() {
    try {
      setGradesLoading(true)
      setGradesError('')

      /*
       * Сначала загружаем обычные
       * оценки. Они не должны
       * зависеть от quarter_grades.
       */
      const gradeRows =
        await getSupabaseStudentQuarterGrades(
          user.id,
          selectedQuarter,
        )

      setGrades(
        gradeRows,
      )

      /*
       * Четвертные оценки
       * загружаем отдельно.
       */
      try {
        const allFinalGrades =
          await getStudentFinalQuarterGrades(
            user.id,
          )

        setFinalQuarterGrades(
          (
            allFinalGrades ||
            []
          ).filter(
            (
              item,
            ) =>
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

      /*
       * Для каждого предмета
       * узнаём минимальное
       * количество оценок.
       *
       * Если RPC временно
       * не сработает —
       * дневник всё равно
       * останется рабочим.
       */
      const subjects = [
        ...new Set(
          (
            gradeRows ||
            []
          )
            .map(
              (
                grade,
              ) =>
                grade.subject,
            )
            .filter(
              Boolean,
            ),
        ),
      ]

      const nextResults = {}

      await Promise.all(
        subjects.map(
          async (
            subject,
          ) => {
            try {
              const result =
                await calculateQuarterResult(
                  user.id,
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
                (
                  gradeRows ||
                  []
                ).filter(
                  (
                    grade,
                  ) =>
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
      loadError
    ) {
      setGrades([])
      setFinalQuarterGrades([])
      setSubjectResults({})

      setGradesError(
        loadError.message ||
          'Не удалось загрузить оценки.',
      )
    } finally {
      setGradesLoading(false)
    }
  }


  async function loadAttendance() {
    try {
      setAttendanceLoading(
        true,
      )

      setAttendanceError('')

      const data =
        await getSupabaseStudentAttendance(
          user.id,
        )

      setAttendanceRecords(
        data,
      )
    } catch (
      loadError
    ) {
      setAttendanceRecords(
        [],
      )

      setAttendanceError(
        loadError.message ||
          'Не удалось загрузить посещаемость.',
      )
    } finally {
      setAttendanceLoading(
        false,
      )
    }
  }


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
        grades.length === 0
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
        ).toFixed(2),
      )
    }, [grades])


  const excellentGrades =
    useMemo(
      () =>
        grades.filter(
          (
            grade,
          ) =>
            Number(
              grade.value,
            ) === 5,
        ).length,
      [grades],
    )


  const goodGrades =
    useMemo(
      () =>
        grades.filter(
          (
            grade,
          ) =>
            Number(
              grade.value,
            ) === 4,
        ).length,
      [grades],
    )


  const subjects =
    useMemo(() => {
      const names = [
        ...new Set(
          grades
            .map(
              (
                grade,
              ) =>
                grade.subject,
            )
            .filter(
              Boolean,
            ),
        ),
      ]

      return names
        .map(
          (
            subject,
          ) => {
            const subjectGrades =
              grades.filter(
                (
                  grade,
                ) =>
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
                (
                  item,
                ) =>
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
                (
                  item,
                ) =>
                  Number(
                    item.grade,
                  ) === 5,
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


  if (!user) {
    return null
  }


  if (
    user.role !== 'Ученик'
  ) {
    return (
      <div className="student-journal-page">
        <section className="student-journal-access">

          <div>
            <GraduationCap
              size={34}
            />
          </div>

          <h1>
            Доступ запрещён
          </h1>

          <p>
            Этот дневник
            предназначен только
            для ученика.
          </p>

        </section>
      </div>
    )
  }


  return (
    <div className="student-journal-page">

      <JournalHeader />


      <JournalHero
        user={
          user
        }

        averageGrade={
          averageGrade
        }

        attendancePercent={
          attendance.percent
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
            <div
              className="auth-error"
              style={{
                marginBottom:
                  16,
              }}
            >
              {gradesError}
            </div>
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
        'attendance' && (
        <>
          {attendanceError && (
            <div
              className="auth-error"
              style={{
                marginBottom:
                  16,
              }}
            >
              {
                attendanceError
              }
            </div>
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

    </div>
  )
}


function JournalHeader() {
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
          Мой дневник
        </h1>

        <span>
          Оценки, прогноз
          четвертной и
          посещаемость из
          школьного журнала.
        </span>
      </div>

    </header>
  )
}


function JournalHero({
  user,
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

          Личный учебный
          профиль
        </div>


        <h2>
          {user.name}
        </h2>


        <p>
          Здесь отображаются
          оценки и посещаемость,
          которые учитель
          сохраняет в EduBoost.
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
              'Класс не указан'}
          </span>


          <span>
            <BookOpen
              size={17}
            />

            {gradesCount}
            {' оценок · '}
            {selectedQuarter}
            {' четв.'}
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
          {attendancePercent}%
        </small>

      </div>

    </section>
  )
}


function JournalStats({
  averageGrade,
  gradesCount,
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

      className:
        'journal-modern-stat--blue',
    },

    {
      label:
        'Оценок в четверти',

      value:
        gradesCount,

      icon:
        BookOpen,

      className:
        'journal-modern-stat--purple',
    },

    {
      label:
        'Посещаемость',

      value:
        `${attendance.percent}%`,

      icon:
        CalendarCheck2,

      className:
        'journal-modern-stat--green',
    },

    {
      label:
        'Отличных оценок',

      value:
        excellentGrades,

      icon:
        CheckCircle2,

      className:
        'journal-modern-stat--gold',
    },

    {
      label:
        'Пропусков',

      value:
        attendance.absent,

      icon:
        XCircle,

      className:
        'journal-modern-stat--red',
    },
  ]


  return (
    <section className="student-journal-modern-stats">

      {stats.map(
        (
          stat,
        ) => {
          const Icon =
            stat.icon

          return (
            <article
              className={`student-journal-modern-stat ${stat.className}`}
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
                  {
                    stat.value
                  }
                </strong>

                <small>
                  {
                    stat.label
                  }
                </small>
              </span>

            </article>
          )
        },
      )}

    </section>
  )
}


function JournalTabs({
  activeTab,
  setActiveTab,
}) {
  return (
    <section className="student-journal-modern-tabs">

      <button
        type="button"
        className={
          activeTab ===
          'grades'
            ? 'student-journal-modern-tab student-journal-modern-tab--active'
            : 'student-journal-modern-tab'
        }
        onClick={() =>
          setActiveTab(
            'grades',
          )
        }
      >
        <BookOpen
          size={18}
        />

        Мои оценки
      </button>


      <button
        type="button"
        className={
          activeTab ===
          'attendance'
            ? 'student-journal-modern-tab student-journal-modern-tab--active'
            : 'student-journal-modern-tab'
        }
        onClick={() =>
          setActiveTab(
            'attendance',
          )
        }
      >
        <CalendarCheck2
          size={18}
        />

        Посещаемость
      </button>

    </section>
  )
}


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
          <p
            style={{
              margin:
                0,

              opacity:
                0.6,

              fontSize:
                13,
            }}
          >
            Учебный период
          </p>

          <h2
            style={{
              margin:
                '4px 0 0',
            }}
          >
            {
              selectedQuarter
            }
            {' четверть'}
          </h2>
        </div>


        <div
          style={{
            display:
              'flex',

            alignItems:
              'center',

            gap:
              10,
          }}
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
                  event.target
                    .value,
                ),
              )
            }
            style={{
              minWidth:
                150,
            }}
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
            title="Обновить"
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


function GradesView({
  loading,
  grades,
  subjects,
  averageGrade,
  excellentGrades,
  goodGrades,
}) {
  if (loading) {
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
              Результаты за
              четверть
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
              (
                item,
              ) => (
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
            5: {
              excellentGrades
            }
            {' · '}
            4: {
              goodGrades
            }
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
              (
                grade,
              ) => (
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
            {
              item.subject
            }
          </strong>

          <span>
            Оценок:{' '}
            {
              item.count
            }
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
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'repeat(auto-fit, minmax(130px, 1fr))',

          gap:
            8,

          marginTop:
            12,
        }}
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
          style={{
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
          }}
        >
          Не хватает оценок:{' '}
          <strong>
            {
              item.missing
            }
          </strong>
        </div>
      )}


      {item.fiveForecast && (
        <div
          style={{
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
          }}
        >
          Если следующая
          контрольная будет{' '}
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


      <small
        style={{
          display:
            'block',

          marginTop:
            10,
        }}
      >
        {getGradeDescription(
          item.weightedAverage,
        )}
      </small>

    </article>
  )
}


function MiniResult({
  label,
  value,
}) {
  return (
    <div
      style={{
        padding:
          '9px 10px',

        borderRadius:
          10,

        background:
          '#f8fafc',
      }}
    >
      <div
        style={{
          fontSize:
            11,

          opacity:
            0.6,

          marginBottom:
            2,
        }}
      >
        {label}
      </div>

      <strong>
        {value}
      </strong>
    </div>
  )
}


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
        {
          grade.value
        }
      </div>


      <div className="student-grade-record-main">

        <div className="student-grade-record-title">

          <div>
            <h3>
              {
                grade.subject
              }
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
              {
                grade.topic
              }
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
                Комментарий
                учителя
              </strong>

              <p>
                {
                  grade.comment
                }
              </p>
            </span>

          </div>
        )}

      </div>

    </article>
  )
}


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


          <div
            style={{
              display:
                'flex',

              alignItems:
                'center',

              gap:
                8,
            }}
          >

            <div className="student-attendance-percent-badge">
              {
                attendance.percent
              }
              %
            </div>


            <button
              type="button"
              onClick={
                reload
              }
              disabled={
                loading
              }
              title="Обновить"
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


        {loading ? (
          <p className="empty-text">
            Загружаем
            посещаемость...
          </p>
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


              <AttendanceCard
                icon={
                  FileText
                }

                value={
                  attendance.excused
                }

                label="Уважительная причина"

                className="attendance-modern--blue"
              />

            </div>


            <div className="student-attendance-overall">

              <div>
                <span>
                  Общая
                  посещаемость
                </span>

                <strong>
                  {
                    attendance.percent
                  }
                  %
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
              История
              посещаемости
            </h2>
          </div>

          <span className="student-journal-grade-summary">
            Записей:{' '}
            {
              records.length
            }
          </span>

        </div>


        {loading ? (
          <p className="empty-text">
            Загрузка...
          </p>
        ) : records.length ===
          0 ? (
          <JournalEmpty
            icon={
              CalendarCheck2
            }

            title="Записей пока нет"

            text="Информация появится после того, как учитель отметит посещаемость."
          />
        ) : (
          <div className="student-attendance-history">

            {records.map(
              (
                record,
              ) => (
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
  const status =
    getAttendanceData(
      record.status,
    )

  const Icon =
    status.icon


  return (
    <article className="student-attendance-record">

      <div
        className={`student-attendance-record-icon ${status.className}`}
      >
        <Icon
          size={21}
        />
      </div>


      <div className="student-attendance-record-main">

        <div>
          <h3>
            {
              record.subject
            }
          </h3>

          <span>
            {record.teacherName ||
              'Учитель'}
          </span>
        </div>


        <p>
          {
            status.label
          }
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
                Комментарий
                учителя
              </strong>

              <p>
                {
                  record.comment
                }
              </p>
            </span>

          </div>
        )}

      </div>

    </article>
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


function getGradeClass(
  value,
) {
  const grade =
    Number(value)

  if (
    !value ||
    Number.isNaN(
      grade,
    )
  ) {
    return ''
  }

  if (
    grade >= 4.5
  ) {
    return 'grade-modern--excellent'
  }

  if (
    grade >= 3.5
  ) {
    return 'grade-modern--good'
  }

  if (
    grade >= 2.5
  ) {
    return 'grade-modern--normal'
  }

  return 'grade-modern--bad'
}


function getGradeDescription(
  value,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return 'Пока нет данных'
  }

  const grade =
    Number(value)

  if (
    grade >= 4.5
  ) {
    return 'Отличный результат'
  }

  if (
    grade >= 3.5
  ) {
    return 'Хороший результат'
  }

  if (
    grade >= 2.5
  ) {
    return 'Можно улучшить'
  }

  return 'Нужно обратить внимание'
}


function getAttendanceData(
  status,
) {
  const values = {
    present: {
      label:
        'Присутствовал',

      icon:
        CheckCircle2,

      className:
        'attendance-record--green',
    },

    absent: {
      label:
        'Отсутствовал',

      icon:
        XCircle,

      className:
        'attendance-record--red',
    },

    late: {
      label:
        'Опоздал',

      icon:
        Clock3,

      className:
        'attendance-record--orange',
    },

    excused: {
      label:
        'Уважительная причина',

      icon:
        FileText,

      className:
        'attendance-record--blue',
    },
  }


  return (
    values[
      status
    ] || {
      label:
        'Не указан',

      icon:
        CalendarCheck2,

      className:
        'attendance-record--blue',
    }
  )
}


function formatDate(
  date,
) {
  if (!date) {
    return 'Дата не указана'
  }

  const parsedDate =
    new Date(
      `${date}T12:00:00`,
    )

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return 'Дата не указана'
  }

  return parsedDate
    .toLocaleDateString(
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


export default StudentJournalPage