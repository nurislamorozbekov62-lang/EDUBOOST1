import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  BookOpen,
  Filter,
  GraduationCap,
  RefreshCcw,
  School,
  UserRound,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  ensureParentLinksSynced,
  getLinkedStudents,
} from '../services/parentService'

import {
  calculateWeightedAverage,
  getSuggestedQuarterGrade,
  getSupabaseStudentGrades,
} from '../services/supabaseJournalService'


const QUARTERS = [
  1,
  2,
  3,
  4,
]


function ParentGradesPage() {
  const {
    user,
  } = useAuth()


  const [
    students,
    setStudents,
  ] = useState([])

  const [
    selectedStudentId,
    setSelectedStudentId,
  ] = useState('')

  const [
    grades,
    setGrades,
  ] = useState([])

  const [
    selectedQuarter,
    setSelectedQuarter,
  ] = useState(1)

  const [
    subjectFilter,
    setSubjectFilter,
  ] = useState('all')

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')


  useEffect(() => {
    if (!user?.id) {
      return
    }

    void loadStudents()
  }, [
    user?.id,
  ])


  async function loadStudents() {
    try {
      await ensureParentLinksSynced(
        user.id,
      )
    } catch (
      syncError
    ) {
      console.error(
        'Parent links sync error:',
        syncError,
      )
    }


    const linkedStudents =
      getLinkedStudents(
        user.id,
      ) || []


    setStudents(
      linkedStudents,
    )


    setSelectedStudentId(
      (
        current,
      ) => {
        const exists =
          linkedStudents.some(
            (
              student,
            ) =>
              String(
                student.id,
              ) ===
              String(
                current,
              ),
          )


        if (
          current &&
          exists
        ) {
          return current
        }


        return linkedStudents[0]?.id
          ? String(
              linkedStudents[0].id,
            )
          : ''
      },
    )
  }


  const student =
    useMemo(
      () =>
        students.find(
          (
            item,
          ) =>
            String(
              item.id,
            ) ===
            String(
              selectedStudentId,
            ),
        ) ||
        null,
      [
        students,
        selectedStudentId,
      ],
    )


  useEffect(() => {
    if (!student?.id) {
      setGrades([])
      setLoading(false)

      return
    }

    void loadGrades()
  }, [
    student?.id,
  ])


  async function loadGrades() {
    try {
      setLoading(true)
      setError('')


      const rows =
        await getSupabaseStudentGrades(
          student.id,
        )


      setGrades(
        rows ||
          [],
      )
    } catch (
      loadError
    ) {
      console.error(
        'Parent grades load error:',
        loadError,
      )

      setGrades([])

      setError(
        loadError?.message ||
          'Не удалось загрузить оценки.',
      )
    } finally {
      setLoading(false)
    }
  }


  const quarterGrades =
    useMemo(
      () =>
        grades.filter(
          (
            grade,
          ) =>
            Number(
              grade.quarter,
            ) ===
            Number(
              selectedQuarter,
            ),
        ),
      [
        grades,
        selectedQuarter,
      ],
    )


  const subjects =
    useMemo(
      () =>
        [
          ...new Set(
            quarterGrades
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
        ].sort(
          (
            first,
            second,
          ) =>
            first.localeCompare(
              second,
              'ru',
            ),
        ),
      [
        quarterGrades,
      ],
    )


  const visibleGrades =
    useMemo(
      () =>
        [...quarterGrades]
          .filter(
            (
              grade,
            ) =>
              subjectFilter ===
                'all' ||
              grade.subject ===
                subjectFilter,
          )
          .sort(
            (
              first,
              second,
            ) =>
              getDateTime(
                second.date,
              ) -
              getDateTime(
                first.date,
              ),
          ),
      [
        quarterGrades,
        subjectFilter,
      ],
    )


  const average =
    useMemo(
      () =>
        calculateWeightedAverage(
          quarterGrades,
        ),
      [
        quarterGrades,
      ],
    )


  const forecast =
    average
      ? getSuggestedQuarterGrade(
          average,
        )
      : null


  if (
    user?.role !==
    'Родитель'
  ) {
    return (
      <>
        <ParentGradesStyles />

        <div className="pg-page">

          <EmptyState
            icon={
              UserRound
            }
            title="Доступ запрещён"
            text="Этот раздел предназначен для родительского аккаунта."
          />

        </div>
      </>
    )
  }


  if (!student) {
    return (
      <>
        <ParentGradesStyles />

        <div className="pg-page">

          <EmptyState
            icon={
              UserRound
            }
            title="Ребёнок не привязан"
            text="Добавьте ребёнка на главной странице родителя."
          />

        </div>
      </>
    )
  }


  return (
    <>
      <ParentGradesStyles />


      <div className="pg-page">

        <header className="pg-heading">

          <div>

            <span>
              Успеваемость
            </span>

            <h1>
              Оценки
            </h1>

            <p>
              Текущие оценки ребёнка
              из школьного журнала.
              Четвертные итоги находятся
              в отдельном разделе.
            </p>

          </div>


          <button
            type="button"
            onClick={
              loadGrades
            }
            disabled={
              loading
            }
          >
            <RefreshCcw
              size={19}
            />
          </button>

        </header>


        <section className="pg-student-card">

          <div className="pg-avatar">
            {getInitials(
              student.name,
            )}
          </div>


          <div className="pg-student-info">

            <span>
              Выбранный ребёнок
            </span>


            {students.length >
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

                {students.map(
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


            <small>
              <School
                size={14}
              />

              {student.school ||
                'Школа не указана'}

              {' · '}

              {student.className ||
                student.class_name ||
                'Класс не указан'}
            </small>

          </div>

        </section>


        <section className="pg-quarter-tabs">

          {QUARTERS.map(
            (
              quarter,
            ) => (
              <button
                type="button"
                key={
                  quarter
                }
                className={
                  selectedQuarter ===
                  quarter
                    ? 'active'
                    : ''
                }
                onClick={() => {
                  setSelectedQuarter(
                    quarter,
                  )

                  setSubjectFilter(
                    'all',
                  )
                }}
              >
                <strong>
                  {
                    quarter
                  }
                </strong>

                <span>
                  четверть
                </span>
              </button>
            ),
          )}

        </section>


        <section className="pg-summary">

          <div>

            <span>
              Оценок
            </span>

            <strong>
              {
                quarterGrades.length
              }
            </strong>

          </div>


          <div>

            <span>
              Средний балл
            </span>

            <strong>
              {average ??
                '—'}
            </strong>

          </div>


          <div>

            <span>
              Прогноз
            </span>

            <strong>
              {forecast ??
                '—'}
            </strong>

          </div>

        </section>


        <section className="pg-filter-card">

          <div>

            <Filter
              size={17}
            />

            <span>
              Предмет
            </span>

          </div>


          <select
            value={
              subjectFilter
            }
            onChange={(
              event,
            ) =>
              setSubjectFilter(
                event.target
                  .value,
              )
            }
          >

            <option value="all">
              Все предметы
            </option>


            {subjects.map(
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
                  {
                    subject
                  }
                </option>
              ),
            )}

          </select>

        </section>


        {error && (
          <div className="pg-error">
            {error}
          </div>
        )}


        <section className="pg-results">

          <div className="pg-results-heading">

            <div>

              <span>
                {
                  selectedQuarter
                } четверть
              </span>

              <h2>
                Текущие оценки
              </h2>

            </div>


            <GraduationCap
              size={21}
            />

          </div>


          {loading ? (
            <EmptyState
              icon={
                RefreshCcw
              }
              title="Загрузка"
              text="Получаем оценки из школьного журнала."
            />
          ) : visibleGrades.length ===
            0 ? (
            <EmptyState
              icon={
                BookOpen
              }
              title="Оценок пока нет"
              text="После выставления учителем оценки появятся здесь."
            />
          ) : (
            <div className="pg-grade-list">

              {visibleGrades.map(
                (
                  grade,
                ) => (
                  <article
                    className="pg-grade"
                    key={
                      grade.id
                    }
                  >

                    <div className="pg-subject-icon">
                      <BookOpen
                        size={18}
                      />
                    </div>


                    <div className="pg-grade-main">

                      <strong>
                        {grade.subject ||
                          'Предмет'}
                      </strong>

                      <span>
                        {grade.topic ||
                          grade.comment ||
                          'Текущая оценка'}
                      </span>

                      <small>
                        {formatDate(
                          grade.date,
                        )}
                      </small>

                    </div>


                    <GradeBadge
                      value={
                        grade.value
                      }
                    />

                  </article>
                ),
              )}

            </div>
          )}

        </section>

      </div>
    </>
  )
}


function GradeBadge({
  value,
}) {
  const numeric =
    Number(value)

  const className =
    numeric >= 5
      ? 'five'
      : numeric >= 4
        ? 'four'
        : numeric >= 3
          ? 'three'
          : 'two'


  return (
    <div
      className={`pg-grade-badge ${className}`}
    >
      {value}
    </div>
  )
}


function EmptyState({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="pg-empty">

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

    </div>
  )
}


function getDateTime(
  value,
) {
  if (!value) {
    return 0
  }


  const date =
    new Date(
      String(
        value,
      ).includes('T')
        ? value
        : `${value}T12:00:00`,
    )


  return Number.isNaN(
    date.getTime(),
  )
    ? 0
    : date.getTime()
}


function formatDate(
  value,
) {
  if (!value) {
    return 'Дата не указана'
  }


  const date =
    new Date(
      String(
        value,
      ).includes('T')
        ? value
        : `${value}T12:00:00`,
    )


  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return String(
      value,
    )
  }


  return date.toLocaleDateString(
    'ru-RU',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
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
    .slice(
      0,
      2,
    )
    .map(
      (
        part,
      ) =>
        part[0]
          ?.toUpperCase() ||
        '',
    )
    .join('')
}


function ParentGradesStyles() {
  return (
    <style>{`
      .pg-page,
      .pg-page * {
        box-sizing: border-box;
      }

      .pg-page {
        width: min(920px, 100%);
        display: grid;
        gap: 15px;
        margin: 0 auto;
        padding-bottom: 32px;
        color: #334155;
      }

      .pg-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }

      .pg-heading > div > span,
      .pg-results-heading span {
        display: block;
        color: #94a3b8;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .07em;
        text-transform: uppercase;
      }

      .pg-heading h1 {
        margin: 4px 0 0;
        color: #172554;
        font-size: 26px;
      }

      .pg-heading p {
        max-width: 500px;
        margin: 7px 0 0;
        color: #64748b;
        font-size: 11px;
        line-height: 1.5;
      }

      .pg-heading > button {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 1px solid #dbe5f0;
        border-radius: 13px;
        background: #fff;
        color: #2563eb;
        cursor: pointer;
      }

      .pg-student-card {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 13px;
        border: 1px solid #dbeafe;
        border-radius: 18px;
        background:
          linear-gradient(
            135deg,
            #eff6ff,
            #ffffff
          );
      }

      .pg-avatar {
        width: 45px;
        height: 45px;
        flex: 0 0 45px;
        display: grid;
        place-items: center;
        border-radius: 14px;
        background:
          linear-gradient(
            145deg,
            #2563eb,
            #4f46e5
          );
        color: #fff;
        font-size: 13px;
        font-weight: 900;
      }

      .pg-student-info {
        flex: 1;
        min-width: 0;
      }

      .pg-student-info > span {
        display: block;
        color: #94a3b8;
        font-size: 8px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .pg-student-info > strong {
        display: block;
        margin-top: 2px;
        color: #172554;
        font-size: 14px;
      }

      .pg-student-info select {
        display: block;
        width: 100%;
        max-width: 320px;
        margin-top: 2px;
        padding: 0;
        border: 0;
        background: transparent;
        color: #172554;
        font: inherit;
        font-size: 14px;
        font-weight: 900;
        outline: 0;
      }

      .pg-student-info small {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 5px;
        color: #64748b;
        font-size: 9px;
      }

      .pg-quarter-tabs {
        display: grid;
        grid-template-columns:
          repeat(
            4,
            minmax(0, 1fr)
          );
        gap: 7px;
      }

      .pg-quarter-tabs button {
        min-height: 58px;
        padding: 8px 4px;
        border: 1px solid #dbe5f0;
        border-radius: 14px;
        background: #fff;
        color: #64748b;
        cursor: pointer;
      }

      .pg-quarter-tabs strong,
      .pg-quarter-tabs span {
        display: block;
      }

      .pg-quarter-tabs strong {
        color: #172554;
        font-size: 17px;
      }

      .pg-quarter-tabs span {
        margin-top: 2px;
        font-size: 8px;
        font-weight: 800;
      }

      .pg-quarter-tabs button.active {
        border-color: #2563eb;
        background:
          linear-gradient(
            145deg,
            #2563eb,
            #4f46e5
          );
        color: #dbeafe;
      }

      .pg-quarter-tabs button.active strong {
        color: #fff;
      }

      .pg-summary {
        display: grid;
        grid-template-columns:
          repeat(
            3,
            minmax(0, 1fr)
          );
        gap: 8px;
      }

      .pg-summary > div {
        padding: 12px 8px;
        border: 1px solid #e5edf6;
        border-radius: 15px;
        background: #fff;
        text-align: center;
      }

      .pg-summary span,
      .pg-summary strong {
        display: block;
      }

      .pg-summary span {
        color: #94a3b8;
        font-size: 8px;
        font-weight: 800;
      }

      .pg-summary strong {
        margin-top: 3px;
        color: #172554;
        font-size: 19px;
      }

      .pg-filter-card {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 11px 12px;
        border: 1px solid #e5edf6;
        border-radius: 15px;
        background: #fff;
      }

      .pg-filter-card > div {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: #64748b;
        font-size: 10px;
        font-weight: 800;
      }

      .pg-filter-card select {
        flex: 1;
        min-width: 0;
        min-height: 36px;
        padding: 0 10px;
        border: 1px solid #dbe5f0;
        border-radius: 10px;
        background: #f8fafc;
        color: #172554;
        font: inherit;
        font-size: 10px;
        outline: 0;
      }

      .pg-results {
        padding: 15px;
        border: 1px solid #e5edf6;
        border-radius: 19px;
        background: #fff;
      }

      .pg-results-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 13px;
      }

      .pg-results-heading h2 {
        margin: 3px 0 0;
        color: #172554;
        font-size: 17px;
      }

      .pg-results-heading > svg {
        color: #4f46e5;
      }

      .pg-grade-list {
        display: grid;
        gap: 8px;
      }

      .pg-grade {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border: 1px solid #edf2f7;
        border-radius: 14px;
        background: #fbfdff;
      }

      .pg-subject-icon {
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: #eff6ff;
        color: #2563eb;
      }

      .pg-grade-main {
        flex: 1;
        min-width: 0;
      }

      .pg-grade-main strong,
      .pg-grade-main span,
      .pg-grade-main small {
        display: block;
      }

      .pg-grade-main strong,
      .pg-grade-main span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .pg-grade-main strong {
        color: #172554;
        font-size: 11px;
      }

      .pg-grade-main span {
        margin-top: 2px;
        color: #64748b;
        font-size: 9px;
      }

      .pg-grade-main small {
        margin-top: 3px;
        color: #94a3b8;
        font-size: 8px;
      }

      .pg-grade-badge {
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 900;
      }

      .pg-grade-badge.five {
        background: #dcfce7;
        color: #15803d;
      }

      .pg-grade-badge.four {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .pg-grade-badge.three {
        background: #fef3c7;
        color: #b45309;
      }

      .pg-grade-badge.two {
        background: #fee2e2;
        color: #b91c1c;
      }

      .pg-empty {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 105px;
        padding: 14px;
        border: 1px dashed #dbe5f0;
        border-radius: 15px;
        background: #fbfdff;
      }

      .pg-empty > div {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        background: #eff6ff;
        color: #2563eb;
      }

      .pg-empty strong,
      .pg-empty small {
        display: block;
      }

      .pg-empty strong {
        color: #172554;
        font-size: 11px;
      }

      .pg-empty small {
        margin-top: 3px;
        color: #64748b;
        font-size: 9px;
      }

      .pg-error {
        padding: 10px 12px;
        border: 1px solid #fecaca;
        border-radius: 12px;
        background: #fef2f2;
        color: #b91c1c;
        font-size: 10px;
        font-weight: 800;
      }

      @media (
        max-width: 520px
      ) {
        .pg-page {
          gap: 12px;
          padding-bottom: 24px;
        }

        .pg-heading h1 {
          font-size: 22px;
        }

        .pg-quarter-tabs {
          gap: 5px;
        }

        .pg-quarter-tabs button {
          min-height: 54px;
          border-radius: 12px;
        }

        .pg-summary {
          gap: 5px;
        }

        .pg-results {
          padding: 12px;
          border-radius: 16px;
        }
      }
    `}</style>
  )
}


export default ParentGradesPage